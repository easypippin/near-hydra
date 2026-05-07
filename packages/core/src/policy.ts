import type { HydraConfig } from "./config.js";

export interface Policy {
  readOnly: boolean;
  maxValueNear?: string;
  maxValueWei?: string;
}

export const DEFAULT_POLICY: Policy = { readOnly: true };

export function getPolicy(cfg: HydraConfig): Policy {
  return cfg.policy ?? DEFAULT_POLICY;
}

export function ensureSigningAllowed(cfg: HydraConfig): void {
  if (getPolicy(cfg).readOnly) {
    throw new Error(
      "near-hydra is in read-only mode. Set policy.readOnly = false in your config (or NEAR_HYDRA_READ_ONLY=false) to enable signing operations.",
    );
  }
}

export function ensureNearSigner(cfg: HydraConfig): void {
  if (!cfg.account?.id || !cfg.account?.privateKey) {
    throw new Error(
      "No NEAR signer configured. Set account.id and account.privateKey in config (or NEAR_HYDRA_ACCOUNT_ID + NEAR_HYDRA_PRIVATE_KEY).",
    );
  }
}

const YOCTO_PER_NEAR = 10n ** 24n;

export function checkNearAmount(cfg: HydraConfig, amountYocto: bigint): void {
  const max = getPolicy(cfg).maxValueNear;
  if (!max) return;
  const cap = BigInt(Math.floor(Number(max) * 1e6)) * YOCTO_PER_NEAR / 1_000_000n;
  if (amountYocto > cap) {
    throw new Error(
      `NEAR transfer amount ${amountYocto} yocto exceeds policy.maxValueNear=${max}. Override in config to proceed.`,
    );
  }
}

/**
 * Parse a decimal string (possibly in scientific notation like "1e18") into a BigInt.
 * BigInt() itself rejects scientific notation, so we use Number as an intermediary
 * only for values that safely fit within JavaScript's precise integer range,
 * then convert. For values exceeding MAX_SAFE_INTEGER, the string must use
 * plain decimal form — scientific notation is rejected for safety.
 */
function parseDecimalToBigInt(value: string): bigint {
  const trimmed = value.trim();
  if (!trimmed) return 0n;
  // If it already parses as a plain integer, use BigInt directly (avoids
  // Number precision loss for large values like "1000000000000000000").
  if (/^\d+$/.test(trimmed)) return BigInt(trimmed);
  // Scientific notation: only accepted when the result fits in MAX_SAFE_INTEGER.
  const num = Number(trimmed);
  if (isNaN(num)) throw new Error(`Cannot parse "${value}" as a decimal number`);
  if (!Number.isSafeInteger(num)) {
    throw new Error(
      `Value "${value}" uses scientific notation but exceeds MAX_SAFE_INTEGER. ` +
        `Use plain decimal form (e.g. "1000000000000000000" instead of "1e18").`,
    );
  }
  return BigInt(num);
}

export function checkWeiAmount(cfg: HydraConfig, valueWei: bigint): void {
  const max = getPolicy(cfg).maxValueWei;
  if (!max) return;
  const cap = parseDecimalToBigInt(max);
  if (valueWei > cap) {
    throw new Error(
      `EVM transfer value ${valueWei} wei exceeds policy.maxValueWei=${max}. Override in config to proceed.`,
    );
  }
}
