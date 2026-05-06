import { Account } from "@near-js/accounts";
import { JsonRpcProvider } from "@near-js/providers";
import { KeyPair } from "@near-js/crypto";
import { KeyPairSigner, type Signer } from "@near-js/signers";
import type { HydraConfig } from "./config.js";

export function nearProvider(cfg: HydraConfig): JsonRpcProvider {
  return new JsonRpcProvider({ url: cfg.rpc.near });
}

export function nearSignerFromConfig(cfg: HydraConfig): Signer | undefined {
  if (!cfg.account?.privateKey) return undefined;
  const kp = KeyPair.fromString(cfg.account.privateKey as `ed25519:${string}`);
  return new KeyPairSigner(kp);
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
      totalNear: yoctoToNear(state.balance.total),
      availableNear: yoctoToNear(state.balance.available),
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
  const provider = nearProvider(cfg);
  return provider.callFunction(contractId, method, args);
}

function yoctoToNear(yocto: bigint | string): string {
  const s = (typeof yocto === "bigint" ? yocto.toString() : yocto).padStart(25, "0");
  const whole = s.slice(0, -24).replace(/^0+/, "") || "0";
  const frac = s.slice(-24).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}
