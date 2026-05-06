# near-hydra

**Unofficial all-in-one CLI + MCP server for the NEAR stack.** One NEAR account becomes an agent's identity on every chain — Bitcoin, Ethereum, Polygon, Arbitrum, Base, Solana — via Chain Signatures, with cross-chain swaps via NEAR Intents 1Click.

> One body (a NEAR account), many heads (every chain). Cut off one head and the agent still works.

## Why this exists

The NEAR stack is powerful but fragmented across libraries: `near-api-js` for accounts, `chainsig.js` for cross-chain signing, `@defuse-protocol/one-click-sdk-typescript` for swaps, `shade-agent-cli` for autonomous agents. There's no unified, agent-ergonomic surface that composes them.

`near-hydra` is that composer. It exposes the full stack as:
- a **CLI** (`near-hydra ...`) for humans and scripts
- an **MCP server** (`near-hydra-mcp`) for Claude Code, Cursor, Codex, OpenAI Agents SDK, and any MCP client

Same code, two faces.

## Status

Pre-alpha. Read-only operations against mainnet work today: account inspection, address derivation across 6 chains, multi-chain balance aggregation, 1Click token discovery and quotes. Signing/sending and Shade lifecycle are next.

## Install (from source)

```bash
git clone <this repo> && cd near
npm install
npm run build
```

There's no published npm package yet. Use the local CLI:

```bash
node packages/cli/dist/index.js <command>
# or alias it:
alias hydra="node $(pwd)/packages/cli/dist/index.js"
```

## Configuration

Defaults are mainnet, no signing key (read-only). Override with a config file at `~/.near-hydra/config.json` or env vars.

```json
{
  "network": "mainnet",
  "account": {
    "id": "alice.near",
    "privateKey": "ed25519:..."
  },
  "rpc": {
    "ethereum": "https://eth.llamarpc.com"
  },
  "oneClick": {
    "apiKey": "your-1click-partner-key"
  }
}
```

### Env overrides (no config file required)

| Variable | Effect |
|---|---|
| `NEAR_HYDRA_CONFIG` | Path to alternate config file |
| `NEAR_HYDRA_NETWORK` | `mainnet` or `testnet` |
| `NEAR_HYDRA_ACCOUNT_ID` | NEAR account id |
| `NEAR_HYDRA_PRIVATE_KEY` | `ed25519:...` |
| `NEAR_HYDRA_MPC_CONTRACT` | Override MPC contract (advanced) |
| `NEAR_HYDRA_RPC_NEAR` | Override NEAR RPC URL |
| `NEAR_HYDRA_RPC_ETHEREUM` | Override Ethereum RPC |
| `NEAR_HYDRA_RPC_POLYGON` | Override Polygon RPC |
| `NEAR_HYDRA_RPC_ARBITRUM` | Override Arbitrum RPC |
| `NEAR_HYDRA_RPC_BASE` | Override Base RPC |
| `NEAR_HYDRA_RPC_SOLANA` | Override Solana RPC |
| `NEAR_HYDRA_RPC_BITCOIN_MEMPOOL` | Override Mempool API base URL |
| `NEAR_HYDRA_ONECLICK_BASE_URL` | Override 1Click base URL |
| `NEAR_HYDRA_ONECLICK_API_KEY` | 1Click partner API key (skips 0.2% fee) |

Every RPC is overridable individually — useful when public endpoints rate-limit you or you want to point at your own infra (Alchemy, QuickNode, dRPC, etc.).

## Demo: one NEAR account, six chains

```bash
$ hydra account balance-all near
{
  "accountId": "near",
  "derived": [
    { "chain": "ethereum", "address": "0xb190...0954", "balance": "0", "decimals": 18 },
    { "chain": "polygon",  "address": "0x3247...0268", "balance": "0", "decimals": 18 },
    { "chain": "arbitrum", "address": "0x9e89...d42D", "balance": "0", "decimals": 18 },
    { "chain": "base",     "address": "0xe183...90d9", "balance": "0", "decimals": 18 },
    { "chain": "bitcoin",  "address": "bc1qshk...srza", "balance": "0", "decimals": 8 },
    { "chain": "solana",   "address": "vquhA...n4MB",  "balance": "0", "decimals": 9 }
  ]
}
```

One MPC-derived address per chain, all from the single NEAR account `near`. No bridges. No separate wallets. No seed phrases per chain.

## CLI usage

```bash
hydra config

hydra account view alice.near
hydra account balance-all alice.near    # derives addresses on every chain, gets balances

hydra address derive -c ethereum -p alice.near
hydra address derive -c bitcoin -p alice.near
hydra address derive -c solana -p alice.near
hydra address balance -c bitcoin -a bc1qshk...

hydra contract view wrap.near ft_balance_of -a '{"account_id":"alice.near"}'

hydra swap tokens
hydra swap quote '{"originAsset":"...","destinationAsset":"...","amount":"100","recipient":"...","refundTo":"...","refundType":"ORIGIN_CHAIN","dry":true}'
hydra swap status <depositAddress>
```

## MCP usage (Claude Code)

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "near-hydra": {
      "command": "node",
      "args": ["/absolute/path/to/near/packages/mcp-server/dist/index.js"],
      "env": {
        "NEAR_HYDRA_NETWORK": "mainnet"
      }
    }
  }
}
```

Then in Claude Code: `"What's the BTC address derived from near.near?"` → tool call to `hydra_address_derive`.

## Tools (current)

| Tool | Purpose |
|---|---|
| `hydra_config_show` | Show active config |
| `hydra_account_view` | NEAR account state (balance, storage, code hash) |
| `hydra_contract_view` | Read-only contract view call |
| `hydra_address_derive` | Derive a foreign-chain address from a NEAR account via MPC |
| `hydra_address_balance` | Native-asset balance on a foreign chain |
| `hydra_account_balance_all_chains` | Multi-chain balance aggregation in one call |
| `hydra_swap_tokens` | List 1Click-supported tokens |
| `hydra_swap_quote` | Get a cross-chain swap quote |
| `hydra_swap_status` | Check swap execution status |
| `hydra_swap_submit_deposit` | Notify 1Click that the deposit tx is broadcast |

## Architecture

```
core/        config • NEAR provider • Chain Signatures wrappers • 1Click wrappers
mcp-server/  registers core functions as MCP tools (stdio transport)
cli/         registers core functions as commander subcommands
```

`core` depends on:
- `chainsig.js` for cross-chain derive/build/sign/broadcast
- `@defuse-protocol/one-click-sdk-typescript` for cross-chain swaps
- `@near-js/*` (v7 modular) for NEAR-native ops
- `viem` for EVM clients, `@solana/web3.js` for Solana

## Known gaps and notes

- **Signing/sending tx on foreign chains** is not yet exposed (the surface is built; the tools aren't wired). Coming next.
- **NEAR Intents (raw)** — only the high-level 1Click flow is wired. Raw intents (deposits, custom intents, solver-relay) are next.
- **Omnibridge** integration not yet added.
- **Shade Agents** lifecycle (`shade-agent-cli` wrapper) not yet added.
- **Solana derivation** has a workaround for a chainsig.js v1.1.14 bug — we call the MPC contract directly to get the raw `ed25519:...` key (which IS the Solana address). Tracking upstream fix.
- **MPC contract default** is `v1.signer` on mainnet (NEAR's deployed contract). chainsig.js's bundled default was stale.
- **Polygon public RPC** (`polygon-rpc.com`) requires API keys; we default to PublicNode. Configurable.
- **postinstall** patches a known chainsig.js ESM packaging bug (extensionless `cosmjs-types` imports). Idempotent.

## Roadmap

- **V0.1** (current): read-only across all chains, 1Click swap discovery
- **V0.2**: signing + broadcasting on every chain (BTC/EVM/Solana sends), full 1Click swap execution
- **V0.3**: raw NEAR Intents (deposits, withdrawals, solver-relay), Omnibridge
- **V0.4**: Shade Agent deploy/whitelist/status, meta-transactions (NEP-366)
- **V1.0**: policy engine (function-call key allowances, max-tx-value, allowlists), `hydra do "<natural-language>"` goal verb

## License

Apache-2.0
