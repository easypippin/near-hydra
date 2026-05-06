import { getSwapQuote, getSwapStatus, submitSwapDeposit } from "./intents.js";
import { sendFt } from "./sends.js";
import { ensureSigningAllowed, ensureNearSigner } from "./policy.js";
import type { HydraConfig } from "./config.js";

export interface SwapExecuteArgs {
  originAsset: string;
  destinationAsset: string;
  amount: string;
  recipient: string;
  recipientType?: "DESTINATION_CHAIN" | "INTENTS";
  refundTo?: string;
  refundType?: "ORIGIN_CHAIN" | "INTENTS";
  depositType?: "ORIGIN_CHAIN" | "INTENTS";
  swapType?: "EXACT_INPUT" | "EXACT_OUTPUT" | "FLEX_INPUT" | "ANY_INPUT";
  slippageTolerance?: number;
  depositMode?: "SIMPLE" | "MEMO";
  dry?: boolean;
}

const NEAR_PREFIX = "nep141:";

function isNearOrigin(originAsset: string): boolean {
  return originAsset.startsWith(NEAR_PREFIX);
}

function ftContractFromAssetId(assetId: string): string {
  return assetId.slice(NEAR_PREFIX.length);
}

export async function swapExecute(cfg: HydraConfig, args: SwapExecuteArgs) {
  if (!isNearOrigin(args.originAsset)) {
    throw new Error(
      `swap_execute v0.2 only supports NEAR-origin assets (originAsset must start with 'nep141:'). ` +
        `EVM/Solana/Bitcoin origin support is on the v0.3 roadmap. Got: ${args.originAsset}`,
    );
  }

  ensureSigningAllowed(cfg);
  ensureNearSigner(cfg);

  const refundTo = args.refundTo ?? cfg.account!.id;
  const recipientType = args.recipientType ?? "DESTINATION_CHAIN";
  const refundType = args.refundType ?? "INTENTS";
  const depositType = args.depositType ?? "ORIGIN_CHAIN";
  const swapType = args.swapType ?? "EXACT_INPUT";
  const slippageTolerance = args.slippageTolerance ?? 100;

  const quoteRequest = {
    dry: false,
    swapType,
    slippageTolerance,
    originAsset: args.originAsset,
    depositType,
    destinationAsset: args.destinationAsset,
    amount: args.amount,
    refundTo,
    refundType,
    recipient: args.recipient,
    recipientType,
    depositMode: args.depositMode,
  };

  if (args.dry !== false) {
    return {
      dry: true,
      plan: {
        kind: "swap_execute" as const,
        flow: "near-origin",
        ftContract: ftContractFromAssetId(args.originAsset),
        from: cfg.account!.id,
        amount: args.amount,
        destinationAsset: args.destinationAsset,
        recipient: args.recipient,
        notes: "Set dry=false to call 1Click /quote, send origin asset to depositAddress, and submit deposit hash.",
      },
      previewQuoteRequest: { ...quoteRequest, dry: true },
    };
  }

  const quote = await getSwapQuote(cfg, quoteRequest as never);
  const depositAddress = quote.quote.depositAddress;
  const depositMemo = quote.quote.depositMemo;
  const amountIn = quote.quote.amountIn;
  if (!depositAddress) {
    throw new Error(`1Click did not return a depositAddress for this quote: ${JSON.stringify(quote.quote)}`);
  }

  const tokenContract = ftContractFromAssetId(args.originAsset);
  const sendResult = await sendFt(cfg, {
    tokenContract,
    to: depositAddress,
    amount: amountIn,
    memo: depositMemo,
    dry: false,
  });

  const txHash = sendResult.txHash;
  let submitResult: unknown = null;
  if (txHash) {
    try {
      submitResult = await submitSwapDeposit(cfg, depositAddress, txHash);
    } catch (err) {
      submitResult = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return {
    dry: false,
    quote,
    sendResult,
    txHash,
    depositAddress,
    submitResult,
    next: { hint: "Poll hydra_swap_status with depositAddress until status indicates settlement." },
  };
}

export async function swapExecuteStatus(
  cfg: HydraConfig,
  depositAddress: string,
  depositMemo?: string,
) {
  return getSwapStatus(cfg, depositAddress, depositMemo);
}
