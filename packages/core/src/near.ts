import { Account } from "@near-js/accounts";
import { JsonRpcProvider } from "@near-js/providers";
import { KeyPair } from "@near-js/crypto";
import { KeyPairSigner, type Signer } from "@near-js/signers";
import { formatNearAmount } from "@near-js/utils";
import type { HydraConfig } from "./config.js";

export function nearProvider(cfg: HydraConfig): JsonRpcProvider {
  return new JsonRpcProvider({ url: cfg.rpc.near });
}

/**
 * Parse and validate a NEAR account key pair from an environment variable.
 * Accepts the raw base58 string (without the "ed25519:" prefix) or the full
 * prefixed form. Throws a descriptive error if the format is wrong so callers
 * never get a silent KeyPair parsing failure.
 */
export function parseNearKeyPair(raw: string): KeyPair {
  if (!raw || raw.trim().length === 0) {
    throw new Error(
      `NEAR_HYDRA_PRIVATE_KEY is empty. Provide a full ed25519 key — ` +
        `e.g. "ed25519:4UVny..." (get from near-cli: near generate-key).`,
    );
  }
  const trimmed = raw.trim();
  const prefixed = trimmed.startsWith("ed25519:") ? trimmed : `ed25519:${trimmed}`;
  try {
    return KeyPair.fromString(prefixed as `ed25519:${string}`);
  } catch {
    throw new Error(
      `NEAR_HYDRA_PRIVATE_KEY is not a valid ed25519 NEAR key. ` +
        `Expected format: "ed25519:<58-char-base58>" (the full key including the "ed25519:" prefix). ` +
        `Got: "${truncated(prefixed)}"`,
    );
  }
}

function truncated(s: string, len = 40): string {
  return s.length > len ? `${s.slice(0, len)}…` : s;
}

export function nearSignerFromConfig(cfg: HydraConfig): Signer | undefined {
  if (!cfg.account?.privateKey) return undefined;
  return new KeyPairSigner(parseNearKeyPair(cfg.account.privateKey));
}

export function nearAccount(cfg: HydraConfig, accountId?: string): Account {
  const id = accountId ?? cfg.account?.id;
  if (!id) throw new Error("No NEAR account specified (config.account.id or argument).");
  return new Account(id, nearProvider(cfg), nearSignerFromConfig(cfg));
}

export async function viewAccount(cfg: HydraConfig, accountId: string) {
  const acct = nearAccount(cfg, accountId);
  const state = await acct.getState();
  return {
    accountId,
    network: cfg.network,
    balance: {
      total: state.balance.total.toString(),
      available: state.balance.available.toString(),
      usedOnStorage: state.balance.usedOnStorage.toString(),
      locked: state.balance.locked.toString(),
      totalNear: formatNearAmount(state.balance.total.toString()),
      availableNear: formatNearAmount(state.balance.available.toString()),
    },
    storageUsage: state.storageUsage,
    codeHash: state.codeHash,
  };
}

export async function viewFunction(
  cfg: HydraConfig,
  contractId: string,
  method: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  return nearProvider(cfg).callFunction(contractId, method, args);
}
