import { contracts, chainAdapters } from "chainsig.js";
import { createPublicClient, http, type PublicClient } from "viem";
import { Connection, PublicKey } from "@solana/web3.js";
import { JsonRpcProvider } from "@near-js/providers";
import type { HydraConfig, RpcEndpoints } from "./config.js";

export type EvmChain =
  | "ethereum"
  | "polygon"
  | "arbitrum"
  | "base"
  | "optimism"
  | "bnb"
  | "avalanche"
  | "aurora";

export type SupportedChain = EvmChain | "bitcoin" | "solana";

const EVM_CHAINS: ReadonlySet<SupportedChain> = new Set<EvmChain>([
  "ethereum",
  "polygon",
  "arbitrum",
  "base",
  "optimism",
  "bnb",
  "avalanche",
  "aurora",
]);

const RPC_KEY: Record<SupportedChain, keyof RpcEndpoints> = {
  ethereum: "ethereum",
  polygon: "polygon",
  arbitrum: "arbitrum",
  base: "base",
  optimism: "optimism",
  bnb: "bnb",
  avalanche: "avalanche",
  aurora: "aurora",
  solana: "solana",
  bitcoin: "bitcoinMempool",
};

function rpcUrl(cfg: HydraConfig, chain: SupportedChain): string {
  return cfg.rpc[RPC_KEY[chain]];
}

const mpcContractCache = new Map<string, contracts.ChainSignatureContract>();
const adapterCache = new Map<string, unknown>();
const evmClientCache = new Map<string, PublicClient>();
const solanaConnectionCache = new Map<string, Connection>();

function mpcContract(cfg: HydraConfig): contracts.ChainSignatureContract {
  const key = `${cfg.network}::${cfg.mpcContract}::${cfg.rpc.near}`;
  let c = mpcContractCache.get(key);
  if (!c) {
    c = new contracts.ChainSignatureContract({
      contractId: cfg.mpcContract,
      networkId: cfg.network,
      fallbackRpcUrls: [cfg.rpc.near],
    });
    mpcContractCache.set(key, c);
  }
  return c;
}

function evmClient(cfg: HydraConfig, chain: EvmChain): PublicClient {
  const url = rpcUrl(cfg, chain);
  let c = evmClientCache.get(url);
  if (!c) {
    c = createPublicClient({ transport: http(url) });
    evmClientCache.set(url, c);
  }
  return c;
}

function solanaConnection(cfg: HydraConfig): Connection {
  const url = rpcUrl(cfg, "solana");
  let c = solanaConnectionCache.get(url);
  if (!c) {
    c = new Connection(url);
    solanaConnectionCache.set(url, c);
  }
  return c;
}

function adapterFor(cfg: HydraConfig, chain: SupportedChain) {
  const key = `${chain}::${rpcUrl(cfg, chain)}::${cfg.network}::${cfg.mpcContract}`;
  const cached = adapterCache.get(key);
  if (cached) return cached as ReturnType<typeof buildAdapter>;
  const a = buildAdapter(cfg, chain);
  adapterCache.set(key, a);
  return a;
}

function buildAdapter(cfg: HydraConfig, chain: SupportedChain) {
  const contract = mpcContract(cfg);
  if (EVM_CHAINS.has(chain)) {
    return new chainAdapters.evm.EVM({
      publicClient: evmClient(cfg, chain as EvmChain) as never,
      contract,
    });
  }
  if (chain === "bitcoin") {
    const isTestnet = cfg.network === "testnet";
    const btcRpc = new chainAdapters.btc.BTCRpcAdapters.Mempool(rpcUrl(cfg, chain));
    return new chainAdapters.btc.Bitcoin({
      network: isTestnet ? "testnet" : "mainnet",
      btcRpcAdapter: btcRpc,
      contract,
    });
  }
  if (chain === "solana") {
    return new chainAdapters.solana.Solana({
      solanaConnection: solanaConnection(cfg),
      contract,
    });
  }
  throw new Error(`Unsupported chain: ${chain}`);
}

function flattenErrorMessages(err: unknown, depth = 4): string {
  const seen: string[] = [];
  let cur: unknown = err;
  while (cur && depth-- > 0) {
    if (cur instanceof Error) seen.push(cur.message);
    else seen.push(String(cur));
    cur = (cur as { cause?: unknown }).cause;
  }
  return seen.join(" | ");
}

function explainMpcError(cfg: HydraConfig, err: unknown): never {
  const msg = flattenErrorMessages(err);
  const looksLikeMpcReject =
    msg.includes("wasm execution failed") ||
    msg.includes("Failed to deserialize input") ||
    msg.includes("Querying failed") ||
    msg.includes("doesn't exist") ||
    msg.includes("Exceeded") /* FailoverRpcProvider wrapper */;
  if (looksLikeMpcReject) {
    throw new Error(
      `MPC contract '${cfg.mpcContract}' on ${cfg.network} rejected or could not handle the call. ` +
        `The default contract may be stale or unreachable. ` +
        `Try NEAR_HYDRA_MPC_CONTRACT=v1.signer (mainnet) or v1.signer-prod.testnet (testnet), ` +
        `or check NEAR_HYDRA_RPC_NEAR. Underlying: ${msg}`,
    );
  }
  throw err instanceof Error ? err : new Error(msg);
}

export interface DerivedAddress {
  chain: SupportedChain;
  predecessor: string;
  path: string;
  address: string;
  publicKey: string;
}

export async function deriveAddress(
  cfg: HydraConfig,
  chain: SupportedChain,
  predecessor: string,
  path: string,
): Promise<DerivedAddress> {
  try {
    if (chain === "solana") {
      // Workaround for chainsig.js v1.1.14: getDerivedPublicKey collapses every
      // response to SEC1 hex, breaking its own Solana adapter. Call MPC directly
      // and use the base58 part of `ed25519:<base58>` as the Solana address.
      const provider = new JsonRpcProvider({ url: cfg.rpc.near });
      const raw = (await provider.callFunction(cfg.mpcContract, "derived_public_key", {
        path,
        predecessor,
        domain_id: 1,
      })) as string;
      const prefix = "ed25519:";
      if (typeof raw !== "string" || !raw.startsWith(prefix)) {
        throw new Error(`Unexpected MPC response for Solana derivation: ${JSON.stringify(raw)}`);
      }
      const address = raw.slice(prefix.length);
      return { chain, predecessor, path, address, publicKey: raw };
    }
    const adapter = adapterFor(cfg, chain) as { deriveAddressAndPublicKey: (p: string, d: string) => Promise<{ address: string; publicKey: string }> };
    const { address, publicKey } = await adapter.deriveAddressAndPublicKey(predecessor, path);
    return { chain, predecessor, path, address, publicKey };
  } catch (err) {
    explainMpcError(cfg, err);
  }
}

export interface AddressBalance {
  chain: SupportedChain;
  address: string;
  balance: string;
  decimals: number;
}

export async function chainBalance(
  cfg: HydraConfig,
  chain: SupportedChain,
  address: string,
): Promise<AddressBalance> {
  if (chain === "solana") {
    const lamports = await solanaConnection(cfg).getBalance(new PublicKey(address));
    return { chain, address, balance: BigInt(lamports).toString(), decimals: 9 };
  }
  const adapter = adapterFor(cfg, chain) as { getBalance: (addr: string) => Promise<{ balance: bigint; decimals: number }> };
  const { balance, decimals } = await adapter.getBalance(address);
  return { chain, address, balance: balance.toString(), decimals };
}

export const DEFAULT_PATHS: Record<SupportedChain, string> = {
  ethereum: "ethereum-1",
  polygon: "polygon-1",
  arbitrum: "arbitrum-1",
  base: "base-1",
  optimism: "optimism-1",
  bnb: "bnb-1",
  avalanche: "avalanche-1",
  aurora: "aurora-1",
  bitcoin: "bitcoin-1",
  solana: "solana-1",
};

export const SUPPORTED_CHAINS: readonly SupportedChain[] = [
  "ethereum",
  "polygon",
  "arbitrum",
  "base",
  "optimism",
  "bnb",
  "avalanche",
  "aurora",
  "bitcoin",
  "solana",
];
