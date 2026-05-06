import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  loadConfig,
  configSummary,
  viewAccount,
  viewFunction,
  deriveAddress,
  chainBalance,
  DEFAULT_PATHS,
  SUPPORTED_CHAINS,
  listSwapTokens,
  getSwapQuote,
  getSwapStatus,
  submitSwapDeposit,
  type SupportedChain,
  type QuoteRequest,
} from "@near-hydra/core";

const ChainEnum = z.enum(SUPPORTED_CHAINS as unknown as [SupportedChain, ...SupportedChain[]]);
const SwapType = z.enum(["EXACT_INPUT", "EXACT_OUTPUT", "FLEX_INPUT", "ANY_INPUT"]);
const AddrType = z.enum(["ORIGIN_CHAIN", "INTENTS"]);
const RecipientType = z.enum(["DESTINATION_CHAIN", "INTENTS"]);
const DepositMode = z.enum(["SIMPLE", "MEMO"]);

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: "text" as const, text: JSON.stringify({ error: message }, null, 2) }],
  };
}

export function registerTools(server: McpServer) {
  server.registerTool(
    "hydra_config_show",
    {
      description:
        "Show the active near-hydra configuration: network, account, MPC contract, RPC endpoints. Read-only.",
      inputSchema: {},
    },
    async () => {
      try {
        return ok(configSummary(loadConfig()));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "hydra_account_view",
    {
      description:
        "View a NEAR account's on-chain state: balance (total/available/locked/storage), storage usage, code hash. Example: hydra_account_view({accountId: 'near.near'}).",
      inputSchema: { accountId: z.string().describe("NEAR account id, e.g. alice.near") },
    },
    async ({ accountId }) => {
      try {
        return ok(await viewAccount(loadConfig(), accountId));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "hydra_contract_view",
    {
      description:
        "Call a read-only view method on a NEAR smart contract. Returns parsed JSON when possible. Example: hydra_contract_view({contractId: 'wrap.near', method: 'ft_balance_of', args: {account_id: 'alice.near'}}).",
      inputSchema: {
        contractId: z.string(),
        method: z.string(),
        args: z.record(z.unknown()).optional().describe("JSON args for the view method"),
      },
    },
    async ({ contractId, method, args }) => {
      try {
        return ok(await viewFunction(loadConfig(), contractId, method, args ?? {}));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "hydra_address_derive",
    {
      description:
        "Derive a foreign-chain address (Bitcoin, EVM, Solana) from a NEAR account using Chain Signatures (MPC). Same NEAR account + path → same address every time. " +
        "Supported chains: ethereum, polygon, arbitrum, base, optimism, bnb, avalanche, aurora, bitcoin, solana. " +
        "Example: hydra_address_derive({chain: 'bitcoin', predecessor: 'alice.near'}) → bc1q....",
      inputSchema: {
        chain: ChainEnum,
        predecessor: z.string().describe("NEAR account id whose MPC keys derive the address"),
        path: z.string().optional().describe("Derivation path. Defaults to '<chain>-1'."),
      },
    },
    async ({ chain, predecessor, path }) => {
      try {
        const cfg = loadConfig();
        return ok(await deriveAddress(cfg, chain, predecessor, path ?? DEFAULT_PATHS[chain]));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "hydra_address_balance",
    {
      description: "Get the native-asset balance of an address on a foreign chain.",
      inputSchema: { chain: ChainEnum, address: z.string() },
    },
    async ({ chain, address }) => {
      try {
        return ok(await chainBalance(loadConfig(), chain, address));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "hydra_account_balance_all_chains",
    {
      description:
        "For a NEAR account, derive its addresses on every supported foreign chain and return all native-asset balances in one call. Errors on individual chains are reported per-chain — partial success is normal.",
      inputSchema: { accountId: z.string() },
    },
    async ({ accountId }) => {
      try {
        const cfg = loadConfig();
        const results = await Promise.all(
          SUPPORTED_CHAINS.map(async (chain) => {
            try {
              const derived = await deriveAddress(cfg, chain, accountId, DEFAULT_PATHS[chain]);
              const bal = await chainBalance(cfg, chain, derived.address);
              return { chain, address: derived.address, balance: bal.balance, decimals: bal.decimals };
            } catch (err) {
              return { chain, error: err instanceof Error ? err.message : String(err) };
            }
          }),
        );
        return ok({ accountId, derived: results });
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "hydra_swap_tokens",
    {
      description:
        "List all tokens supported by NEAR Intents 1Click for cross-chain swaps. Each entry includes assetId, blockchain, contractAddress, symbol, decimals, USD price.",
      inputSchema: {},
    },
    async () => {
      try {
        return ok(await listSwapTokens(loadConfig()));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "hydra_swap_quote",
    {
      description:
        "Get a NEAR Intents 1Click cross-chain swap quote. Set dry=true to simulate (no deposit address); dry=false returns a deposit address you must send the input asset to. Asset IDs come from hydra_swap_tokens. Example: " +
        "hydra_swap_quote({originAsset: 'nep141:wrap.near', destinationAsset: 'nep141:eth.bridge.near', amount: '1000000000000000000000000', recipient: '0x...', refundTo: 'alice.near', refundType: 'INTENTS', recipientType: 'DESTINATION_CHAIN', swapType: 'EXACT_INPUT', slippageTolerance: 100, depositType: 'INTENTS'}).",
      inputSchema: {
        originAsset: z.string().describe("Source asset id (see hydra_swap_tokens.assetId)"),
        destinationAsset: z.string().describe("Destination asset id"),
        amount: z.string().describe("Amount in base units of the origin asset (e.g. wei for ETH)"),
        recipient: z.string().describe("Recipient address; format must match recipientType"),
        recipientType: RecipientType.default("DESTINATION_CHAIN"),
        refundTo: z.string().describe("Where to refund if swap fails"),
        refundType: AddrType.default("ORIGIN_CHAIN"),
        depositType: AddrType.default("ORIGIN_CHAIN").describe("ORIGIN_CHAIN gives you a deposit address on the source chain; INTENTS uses an Intents account."),
        swapType: SwapType.default("EXACT_INPUT"),
        slippageTolerance: z.number().int().min(0).max(10000).default(100).describe("Basis points (100 = 1%)"),
        depositMode: DepositMode.optional(),
        dry: z.boolean().default(true),
        sessionId: z.string().optional(),
      },
    },
    async (input) => {
      try {
        return ok(await getSwapQuote(loadConfig(), input as unknown as QuoteRequest));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "hydra_swap_status",
    {
      description: "Check the execution status of a 1Click swap by its deposit address.",
      inputSchema: {
        depositAddress: z.string(),
        depositMemo: z.string().optional().describe("Required if the chain uses MEMO deposit mode"),
      },
    },
    async ({ depositAddress, depositMemo }) => {
      try {
        return ok(await getSwapStatus(loadConfig(), depositAddress, depositMemo));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "hydra_swap_submit_deposit",
    {
      description:
        "Notify 1Click that the deposit transaction has been broadcast. depositAddress comes from a non-dry quote; txHash is the transaction hash on the chain you sent funds on.",
      inputSchema: { depositAddress: z.string(), txHash: z.string() },
    },
    async ({ depositAddress, txHash }) => {
      try {
        return ok(await submitSwapDeposit(loadConfig(), depositAddress, txHash));
      } catch (e) {
        return fail(e);
      }
    },
  );
}
