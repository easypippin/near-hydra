import { contracts, chainAdapters } from "chainsig.js";
import { createPublicClient, http } from "viem";
import { Connection, PublicKey } from "@solana/web3.js";
import { JsonRpcProvider } from "@near-js/providers";
import type { HydraConfig } from "./config.js";

export type SupportedChain = "ethereum" | "polygon" | "arbitrum" | "base" | "bitcoin" | "solana";

const EVM_CHAINS = new Set<SupportedChain>(["ethereum", "polygon", "arbitrum", "base"]);

function rpcUrl(cfg: HydraConfig, chain: SupportedChain): string {
  switch (chain) {
    case "ethereum":
      return cfg.rpc.ethereum;
    case "polygon":
      return cfg.rpc.polygon;
    case "arbitrum":
      return cfg.rpc.arbitrum;
    case "base":
      return cfg.rpc.base;
    case "solana":
      return cfg.rpc.solana;
    case "bitcoin":
      return cfg.rpc.bitcoinMempool;
  }
}

function mpcContract(cfg: HydraConfig) {
  return new contracts.ChainSignatureContract({
    contractId: cfg.mpcContract,
    networkId: cfg.network,
    fallbackRpcUrls: [cfg.rpc.near],
  });
}

function adapterFor(cfg: HydraConfig, chain: SupportedChain) {
  const contract = mpcContract(cfg);
  if (EVM_CHAINS.has(chain)) {
    const publicClient = createPublicClient({ transport: http(rpcUrl(cfg, chain)) });
    return new chainAdapters.evm.EVM({ publicClient: publicClient as never, contract });
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
      solanaConnection: new Connection(rpcUrl(cfg, chain)),
      contract,
    });
  }
  throw new Error(`Unsupported chain: ${chain}`);
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
  if (chain === "solana") {
    // Workaround for chainsig.js v1.1.14: its getDerivedPublicKey collapses
    // every response to SEC1 hex, which breaks its own Solana adapter. We
    // call the MPC contract directly to get the raw `ed25519:<base58>` key
    // and use the base58 part as the Solana address (it IS the public key).
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
  const adapter = adapterFor(cfg, chain);
  const { address, publicKey } = await adapter.deriveAddressAndPublicKey(predecessor, path);
  return { chain, predecessor, path, address, publicKey };
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
    const conn = new Connection(rpcUrl(cfg, chain));
    const lamports = await conn.getBalance(new PublicKey(address));
    return { chain, address, balance: BigInt(lamports).toString(), decimals: 9 };
  }
  const adapter = adapterFor(cfg, chain);
  const { balance, decimals } = await adapter.getBalance(address);
  return { chain, address, balance: balance.toString(), decimals };
}

export const DEFAULT_PATHS: Record<SupportedChain, string> = {
  ethereum: "ethereum-1",
  polygon: "polygon-1",
  arbitrum: "arbitrum-1",
  base: "base-1",
  bitcoin: "bitcoin-1",
  solana: "solana-1",
};

export const SUPPORTED_CHAINS: readonly SupportedChain[] = [
  "ethereum",
  "polygon",
  "arbitrum",
  "base",
  "bitcoin",
  "solana",
];
