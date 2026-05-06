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

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
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
      description: "Show the active near-hydra configuration (network, account, RPCs, MPC contract). Read-only and safe.",
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
      description: "View a NEAR account's state: balance, storage usage, code hash.",
      inputSchema: {
        accountId: z.string().describe("NEAR account id, e.g. alice.near"),
      },
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
      description: "Call a read-only view method on a NEAR contract. Returns parsed JSON if possible.",
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
        "Derive a foreign-chain address (Bitcoin, EVM, Solana) from a NEAR account using Chain Signatures (MPC). One NEAR account → one address per (chain, derivation path).",
      inputSchema: {
        chain: ChainEnum,
        predecessor: z.string().describe("NEAR account id whose MPC keys derive the address"),
        path: z
          .string()
          .optional()
          .describe("Derivation path string. Defaults to the chain's standard hydra path."),
      },
    },
    async ({ chain, predecessor, path }) => {
      try {
        const cfg = loadConfig();
        const usedPath = path ?? DEFAULT_PATHS[chain];
        return ok(await deriveAddress(cfg, chain, predecessor, usedPath));
      } catch (e) {
        return fail(e);
      }
    },
  );

  server.registerTool(
    "hydra_address_balance",
    {
      description: "Get the native-asset balance of an address on a foreign chain.",
      inputSchema: {
        chain: ChainEnum,
        address: z.string(),
      },
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
        "For a NEAR account, derive its addresses on every supported foreign chain and return all balances in one call.",
      inputSchema: {
        accountId: z.string(),
      },
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
        "List tokens supported by NEAR Intents 1Click for cross-chain swaps. Includes blockchain, contract address, USD price, decimals.",
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
        "Get a 1Click swap quote. Use dry=true for simulation (no deposit address). Use dry=false to receive a deposit address you must send the input to.",
      inputSchema: {
        request: z
          .record(z.unknown())
          .describe(
            "1Click QuoteRequest object. Required fields include originAsset, destinationAsset, amount, recipient, refundTo, refundType, dry. See 1Click API docs.",
          ),
      },
    },
    async ({ request }) => {
      try {
        return ok(await getSwapQuote(loadConfig(), request as unknown as QuoteRequest));
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
        depositMemo: z.string().optional(),
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
        "Notify 1Click that the deposit transaction has been broadcast. depositAddress comes from the quote, txHash from the chain you sent funds on.",
      inputSchema: {
        depositAddress: z.string(),
        txHash: z.string(),
      },
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
