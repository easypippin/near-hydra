import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type Network = "mainnet" | "testnet";

export interface HydraConfig {
  network: Network;
  account?: {
    id: string;
    privateKey?: string;
  };
  rpc: {
    near: string;
    ethereum: string;
    polygon: string;
    arbitrum: string;
    base: string;
    solana: string;
    bitcoinMempool: string;
  };
  mpcContract: string;
  oneClick: {
    baseUrl: string;
    apiKey?: string;
  };
}

const DEFAULTS: Record<Network, HydraConfig> = {
  mainnet: {
    network: "mainnet",
    rpc: {
      near: "https://rpc.mainnet.near.org",
      ethereum: "https://eth.llamarpc.com",
      polygon: "https://polygon-bor-rpc.publicnode.com",
      arbitrum: "https://arb1.arbitrum.io/rpc",
      base: "https://mainnet.base.org",
      solana: "https://api.mainnet-beta.solana.com",
      bitcoinMempool: "https://mempool.space/api",
    },
    mpcContract: "v1.signer",
    oneClick: { baseUrl: "https://1click.chaindefuser.com" },
  },
  testnet: {
    network: "testnet",
    rpc: {
      near: "https://rpc.testnet.near.org",
      ethereum: "https://ethereum-sepolia-rpc.publicnode.com",
      polygon: "https://rpc-amoy.polygon.technology",
      arbitrum: "https://sepolia-rollup.arbitrum.io/rpc",
      base: "https://sepolia.base.org",
      solana: "https://api.devnet.solana.com",
      bitcoinMempool: "https://mempool.space/testnet/api",
    },
    mpcContract: "v1.signer-prod.testnet",
    oneClick: { baseUrl: "https://1click.chaindefuser.com" },
  },
};

function configPath(): string {
  return process.env.NEAR_HYDRA_CONFIG ?? join(homedir(), ".near-hydra", "config.json");
}

function deepMerge<T>(base: T, override: Partial<T>): T {
  if (!override) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override)) {
    const cur = (base as Record<string, unknown>)[k];
    if (v && typeof v === "object" && !Array.isArray(v) && cur && typeof cur === "object") {
      out[k] = deepMerge(cur as Record<string, unknown>, v as Record<string, unknown>);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

export function loadConfig(): HydraConfig {
  const path = configPath();
  const file = existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as Partial<HydraConfig>)
    : {};
  const network: Network =
    (process.env.NEAR_HYDRA_NETWORK as Network | undefined) ?? file.network ?? "mainnet";
  let cfg = deepMerge(DEFAULTS[network], { ...file, network });

  const envAcct = process.env.NEAR_HYDRA_ACCOUNT_ID;
  const envKey = process.env.NEAR_HYDRA_PRIVATE_KEY;
  if (envAcct) {
    cfg = { ...cfg, account: { id: envAcct, privateKey: envKey ?? cfg.account?.privateKey } };
  }
  const envOneClickKey = process.env.NEAR_HYDRA_ONECLICK_API_KEY;
  if (envOneClickKey) {
    cfg = { ...cfg, oneClick: { ...cfg.oneClick, apiKey: envOneClickKey } };
  }
  const envOneClickUrl = process.env.NEAR_HYDRA_ONECLICK_BASE_URL;
  if (envOneClickUrl) {
    cfg = { ...cfg, oneClick: { ...cfg.oneClick, baseUrl: envOneClickUrl } };
  }
  const envMpc = process.env.NEAR_HYDRA_MPC_CONTRACT;
  if (envMpc) cfg = { ...cfg, mpcContract: envMpc };

  const rpcOverrides: Partial<HydraConfig["rpc"]> = {};
  const rpcEnvKeys: Array<[keyof HydraConfig["rpc"], string]> = [
    ["near", "NEAR_HYDRA_RPC_NEAR"],
    ["ethereum", "NEAR_HYDRA_RPC_ETHEREUM"],
    ["polygon", "NEAR_HYDRA_RPC_POLYGON"],
    ["arbitrum", "NEAR_HYDRA_RPC_ARBITRUM"],
    ["base", "NEAR_HYDRA_RPC_BASE"],
    ["solana", "NEAR_HYDRA_RPC_SOLANA"],
    ["bitcoinMempool", "NEAR_HYDRA_RPC_BITCOIN_MEMPOOL"],
  ];
  for (const [k, env] of rpcEnvKeys) {
    const v = process.env[env];
    if (v) rpcOverrides[k] = v;
  }
  if (Object.keys(rpcOverrides).length > 0) {
    cfg = { ...cfg, rpc: { ...cfg.rpc, ...rpcOverrides } };
  }
  return cfg;
}

export function configSummary(c: HydraConfig) {
  return {
    network: c.network,
    accountId: c.account?.id ?? null,
    hasPrivateKey: Boolean(c.account?.privateKey),
    mpcContract: c.mpcContract,
    nearRpc: c.rpc.near,
    oneClickBaseUrl: c.oneClick.baseUrl,
    oneClickAuthed: Boolean(c.oneClick.apiKey),
  };
}
