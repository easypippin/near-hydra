import {
  OneClickService,
  OpenAPI,
  type QuoteRequest,
} from "@defuse-protocol/one-click-sdk-typescript";
import type { HydraConfig } from "./config.js";

let configuredFor: string | null = null;

function ensureConfigured(cfg: HydraConfig) {
  const key = `${cfg.oneClick.baseUrl}::${cfg.oneClick.apiKey ?? ""}`;
  if (configuredFor === key) return;
  OpenAPI.BASE = cfg.oneClick.baseUrl;
  OpenAPI.TOKEN = cfg.oneClick.apiKey;
  configuredFor = key;
}

export async function listSwapTokens(cfg: HydraConfig) {
  ensureConfigured(cfg);
  return OneClickService.getTokens();
}

export async function getSwapQuote(cfg: HydraConfig, req: QuoteRequest) {
  ensureConfigured(cfg);
  return OneClickService.getQuote(req);
}

export async function getSwapStatus(cfg: HydraConfig, depositAddress: string, depositMemo?: string) {
  ensureConfigured(cfg);
  return OneClickService.getExecutionStatus(depositAddress, depositMemo);
}

export async function submitSwapDeposit(
  cfg: HydraConfig,
  depositAddress: string,
  txHash: string,
) {
  ensureConfigured(cfg);
  return OneClickService.submitDepositTx({ depositAddress, txHash });
}

export type { QuoteRequest } from "@defuse-protocol/one-click-sdk-typescript";
