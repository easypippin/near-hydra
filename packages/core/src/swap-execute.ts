import { getSwapQuote, getSwapStatus, submitSwapDeposit } from "./intents.js";
import { sendFt, sendEvm, sendBtc, sendSolana } from "./sends.js";
import { ensureSigningAllowed, ensureNearSigner } from "./policy.js";
import type { HydraConfig } from "./config.js";
import type { EvmChain, SupportedChain } from "./chains.js";

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

type OriginRoute =
  | { kind: "near-ft"; ftContract: string }
  | { kind: "evm-native"; chain: EvmChain }
  | { kind: "evm-erc20"; chain: EvmChain; token: string }
  | { kind: "btc-native" }
  | { kind: "solana-native" };

const OMFT_PREFIX_TO_CHAIN: Record<string, SupportedChain> = {
  eth: "ethereum",
  arb: "arbitrum",
  base: "base",
  pol: "polygon",
  bsc: "bnb",
  op: "optimism",
  avax: "avalanche",
  aurora: "aurora",
  btc: "bitcoin",
  sol: "solana",
};

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

function inferOriginRoute(originAsset: string): OriginRoute {
  if (!originAsset.startsWith("nep141:")) {
    throw new Error(
      `swap_execute only supports nep141: origin assets currently. nep245 / multi-token bridges arrive in a later release. Got: ${originAsset}`,
    );
  }
  const tail = originAsset.slice("nep141:".length);
  // omft.near pattern: <chain>[-<contract>].omft.near. Anything else is treated as NEAR-side FT.
  if (!tail.endsWith(".omft.near")) {
    return { kind: "near-ft", ftContract: tail };
  }
  const head = tail.slice(0, -".omft.near".length);
  const dash = head.indexOf("-");
  const prefix = dash < 0 ? head : head.slice(0, dash);
  const chain = OMFT_PREFIX_TO_CHAIN[prefix];
  if (!chain) return { kind: "near-ft", ftContract: tail };
  if (chain === "bitcoin") return { kind: "btc-native" };
  if (chain === "solana") return { kind: "solana-native" }; // SPL tokens on Solana not yet routed
  if (EVM_CHAINS.has(chain)) {
    if (dash < 0) return { kind: "evm-native", chain: chain as EvmChain };
    return { kind: "evm-erc20", chain: chain as EvmChain, token: head.slice(dash + 1) };
  }
  return { kind: "near-ft", ftContract: tail };
}

export async function swapExecute(cfg: HydraConfig, args: SwapExecuteArgs) {
  ensureSigningAllowed(cfg);
  ensureNearSigner(cfg);

  const route = inferOriginRoute(args.originAsset);
  const refundTo = args.refundTo ?? cfg.account!.id;
  const recipientType = args.recipientType ?? "DESTINATION_CHAIN";
  const refundType = args.refundType ?? "INTENTS";
  const defaultDepositType = route.kind === "near-ft" ? "ORIGIN_CHAIN" : "ORIGIN_CHAIN";
  const depositType = args.depositType ?? defaultDepositType;
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
      plan: { kind: "swap_execute" as const, route, originAsset: args.originAsset, destinationAsset: args.destinationAsset, amount: args.amount, recipient: args.recipient },
      previewQuoteRequest: { ...quoteRequest, dry: true },
    };
  }

  const quote = await getSwapQuote(cfg, quoteRequest as never);
  const depositAddress = quote.quote.depositAddress;
  const depositMemo = quote.quote.depositMemo;
  const amountIn = quote.quote.amountIn;
  if (!depositAddress) {
    throw new Error(`1Click did not return a depositAddress: ${JSON.stringify(quote.quote)}`);
  }

  let sendResult: unknown;
  switch (route.kind) {
    case "near-ft":
      sendResult = await sendFt(cfg, {
        tokenContract: route.ftContract,
        to: depositAddress,
        amount: amountIn,
        memo: depositMemo,
        dry: false,
      });
      break;
    case "evm-native":
      sendResult = await sendEvm(cfg, {
        chain: route.chain,
        to: depositAddress,
        valueWei: amountIn,
        dry: false,
      });
      break;
    case "evm-erc20":
      sendResult = await sendEvm(cfg, {
        chain: route.chain,
        to: route.token,
        erc20: { token: route.token, recipient: depositAddress, amount: amountIn },
        dry: false,
      });
      break;
    case "btc-native":
      sendResult = await sendBtc(cfg, { to: depositAddress, satoshi: amountIn, dry: false });
      break;
    case "solana-native":
      sendResult = await sendSolana(cfg, { to: depositAddress, lamports: amountIn, dry: false });
      break;
  }

  const txHash = (sendResult as { txHash?: string }).txHash;
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
    route,
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
