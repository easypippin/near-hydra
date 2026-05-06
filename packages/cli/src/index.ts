#!/usr/bin/env node
import { Command } from "commander";
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

const program = new Command();
program
  .name("near-hydra")
  .description("Unofficial all-in-one CLI for the NEAR stack: accounts, Chain Signatures, Intents.")
  .version("0.0.1");

function out(value: unknown) {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

function fail(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

function chainOpt(value: string): SupportedChain {
  if (!SUPPORTED_CHAINS.includes(value as SupportedChain)) {
    throw new Error(`Unsupported chain '${value}'. Supported: ${SUPPORTED_CHAINS.join(", ")}`);
  }
  return value as SupportedChain;
}

program
  .command("config")
  .description("Show active configuration")
  .action(() => {
    try {
      out(configSummary(loadConfig()));
    } catch (e) {
      fail(e);
    }
  });

const account = program.command("account").description("NEAR account operations");
account
  .command("view <accountId>")
  .description("View NEAR account state")
  .action(async (accountId: string) => {
    try {
      out(await viewAccount(loadConfig(), accountId));
    } catch (e) {
      fail(e);
    }
  });

account
  .command("balance-all <accountId>")
  .description("Derive addresses on every supported foreign chain and return balances")
  .action(async (accountId: string) => {
    try {
      const cfg = loadConfig();
      const rows = await Promise.all(
        SUPPORTED_CHAINS.map(async (chain) => {
          try {
            const d = await deriveAddress(cfg, chain, accountId, DEFAULT_PATHS[chain]);
            const b = await chainBalance(cfg, chain, d.address);
            return { chain, address: d.address, balance: b.balance, decimals: b.decimals };
          } catch (err) {
            return { chain, error: err instanceof Error ? err.message : String(err) };
          }
        }),
      );
      out({ accountId, derived: rows });
    } catch (e) {
      fail(e);
    }
  });

const contract = program.command("contract").description("NEAR contract operations");
contract
  .command("view <contractId> <method>")
  .description("Call a view method (read-only)")
  .option("-a, --args <json>", "JSON args object", "{}")
  .action(async (contractId: string, method: string, opts: { args: string }) => {
    try {
      const args = JSON.parse(opts.args);
      out(await viewFunction(loadConfig(), contractId, method, args));
    } catch (e) {
      fail(e);
    }
  });

const address = program.command("address").description("Cross-chain address operations");
address
  .command("derive")
  .description("Derive a foreign-chain address from a NEAR account via Chain Signatures")
  .requiredOption("-c, --chain <chain>", "ethereum|polygon|arbitrum|base|bitcoin|solana")
  .requiredOption("-p, --predecessor <accountId>", "NEAR account id")
  .option("--path <path>", "Derivation path (defaults to chain default)")
  .action(async (opts: { chain: string; predecessor: string; path?: string }) => {
    try {
      const chain = chainOpt(opts.chain);
      const cfg = loadConfig();
      out(
        await deriveAddress(
          cfg,
          chain,
          opts.predecessor,
          opts.path ?? DEFAULT_PATHS[chain],
        ),
      );
    } catch (e) {
      fail(e);
    }
  });

address
  .command("balance")
  .description("Native-asset balance of an address on a foreign chain")
  .requiredOption("-c, --chain <chain>")
  .requiredOption("-a, --address <address>")
  .action(async (opts: { chain: string; address: string }) => {
    try {
      out(await chainBalance(loadConfig(), chainOpt(opts.chain), opts.address));
    } catch (e) {
      fail(e);
    }
  });

const swap = program.command("swap").description("Cross-chain swaps via NEAR Intents 1Click");
swap
  .command("tokens")
  .description("List supported tokens")
  .action(async () => {
    try {
      out(await listSwapTokens(loadConfig()));
    } catch (e) {
      fail(e);
    }
  });

swap
  .command("quote <requestJson>")
  .description("Get a 1Click swap quote (pass JSON request body)")
  .action(async (requestJson: string) => {
    try {
      const request = JSON.parse(requestJson) as QuoteRequest;
      out(await getSwapQuote(loadConfig(), request));
    } catch (e) {
      fail(e);
    }
  });

swap
  .command("status <depositAddress>")
  .description("Check swap execution status")
  .option("--memo <memo>")
  .action(async (depositAddress: string, opts: { memo?: string }) => {
    try {
      out(await getSwapStatus(loadConfig(), depositAddress, opts.memo));
    } catch (e) {
      fail(e);
    }
  });

swap
  .command("submit-deposit <depositAddress> <txHash>")
  .description("Notify 1Click of the broadcast deposit tx")
  .action(async (depositAddress: string, txHash: string) => {
    try {
      out(await submitSwapDeposit(loadConfig(), depositAddress, txHash));
    } catch (e) {
      fail(e);
    }
  });

program.parseAsync(process.argv).catch(fail);
