# near-hydra-core

**Core library for `near-hydra`** — the unified CLI + MCP server for NEAR's chain-abstraction stack.

This package wires together NEAR's primitives (accounts, contract calls, FTs) with cross-chain MPC signing (`chainsig.js`) and NEAR Intents (`@defuse-protocol/one-click-sdk-typescript`) behind a single, agent-ergonomic API. It's the engine; you almost certainly want one of the consumer packages instead:

- [`near-hydra`](https://www.npmjs.com/package/near-hydra) — CLI
- [`near-hydra-mcp`](https://www.npmjs.com/package/near-hydra-mcp) — MCP server for Claude Code, Cursor, etc.

## Install (library use)

```bash
npm install near-hydra-core
```

## Quick example

```ts
import { loadConfig, deriveAddress, viewAccount } from "near-hydra-core";

const cfg = loadConfig(); // env-driven by default
const acct = await viewAccount(cfg, "near");
const btc = await deriveAddress(cfg, "bitcoin", "near", "bitcoin-1");
console.log(btc.address); // bc1qshk...
```

## Notes

- A `postinstall` script idempotently patches a known `chainsig.js` v1.1.14 ESM packaging bug. Safe to run multiple times.
- Signing operations require `policy.readOnly = false` and a configured NEAR signer. See https://github.com/nikshepsvn/near-hydra/blob/main/SECURITY.md.

## Full documentation

See https://github.com/nikshepsvn/near-hydra.

## License

Apache-2.0
