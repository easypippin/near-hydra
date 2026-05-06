import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type Network = "mainnet" | "testnet";

export interface RpcEndpoints {
  near: string;
  ethereum: string;
  polygon: string;
  arbitrum: string;
  base: string;
  optimism: string;
  bnb: string;
  avalanche: string;
  aurora: string;
  solana: string;
  bitcoinMempool: string;
}

export interface PolicyConfig {
  readOnly: boolean;
  maxValueNear?: string;
  maxValueWei?: string;
}

export interface HydraConfig {
  network: Network;
  account?: {
    id: string;
    privateKey?: string;
  };
  rpc: RpcEndpoints;
  mpcContract: string;
  policy?: PolicyConfig;
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
      optimism: "https://mainnet.optimism.io",
      bnb: "https://bsc-rpc.publicnode.com",
      avalanche: "https://avalanche-c-chain-rpc.publicnode.com",
      aurora: "https://mainnet.aurora.dev",
      solana: "https://api.mainnet-beta.solana.com",
      bitcoinMempool: "https://mempool.space/api",
    },
    mpcContract: "v1.signer",
    policy: { readOnly: true },
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
      optimism: "https://sepolia.optimism.io",
      bnb: "https://bsc-testnet-rpc.publicnode.com",
      avalanche: "https://avalanche-fuji-c-chain-rpc.publicnode.com",
      aurora: "https://testnet.aurora.dev",
      solana: "https://api.devnet.solana.com",
      bitcoinMempool: "https://mempool.space/testnet/api",
    },
    mpcContract: "v1.signer-prod.testnet",
    policy: { readOnly: true },
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

const RPC_ENV_KEYS: Array<[keyof RpcEndpoints, string]> = [
  ["near", "NEAR_HYDRA_RPC_NEAR"],
  ["ethereum", "NEAR_HYDRA_RPC_ETHEREUM"],
  ["polygon", "NEAR_HYDRA_RPC_POLYGON"],
  ["arbitrum", "NEAR_HYDRA_RPC_ARBITRUM"],
  ["base", "NEAR_HYDRA_RPC_BASE"],
  ["optimism", "NEAR_HYDRA_RPC_OPTIMISM"],
  ["bnb", "NEAR_HYDRA_RPC_BNB"],
  ["avalanche", "NEAR_HYDRA_RPC_AVALANCHE"],
  ["aurora", "NEAR_HYDRA_RPC_AURORA"],
  ["solana", "NEAR_HYDRA_RPC_SOLANA"],
  ["bitcoinMempool", "NEAR_HYDRA_RPC_BITCOIN_MEMPOOL"],
];

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

  const rpcOverrides: Partial<RpcEndpoints> = {};
  for (const [k, env] of RPC_ENV_KEYS) {
    const v = process.env[env];
    if (v) rpcOverrides[k] = v;
  }
  if (Object.keys(rpcOverrides).length > 0) {
    cfg = { ...cfg, rpc: { ...cfg.rpc, ...rpcOverrides } };
  }

  const envReadOnly = process.env.NEAR_HYDRA_READ_ONLY;
  if (envReadOnly !== undefined) {
    const ro = envReadOnly !== "false" && envReadOnly !== "0";
    cfg = { ...cfg, policy: { ...(cfg.policy ?? { readOnly: true }), readOnly: ro } };
  }
  const envMaxNear = process.env.NEAR_HYDRA_MAX_VALUE_NEAR;
  if (envMaxNear) {
    cfg = { ...cfg, policy: { ...(cfg.policy ?? { readOnly: true }), maxValueNear: envMaxNear } };
  }
  const envMaxWei = process.env.NEAR_HYDRA_MAX_VALUE_WEI;
  if (envMaxWei) {
    cfg = { ...cfg, policy: { ...(cfg.policy ?? { readOnly: true }), maxValueWei: envMaxWei } };
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
    policy: c.policy ?? { readOnly: true },
  };
}
