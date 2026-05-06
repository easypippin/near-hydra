<div align="center">

# near-hydra

**One NEAR account. Every chain. Every agent.**

Unified CLI + MCP server for the NEAR stack — accounts, Chain Signatures, NEAR Intents — built for AI agents and humans.
Supports **Bitcoin, Ethereum, Polygon, Arbitrum, Base, Optimism, BNB Chain, Avalanche, Aurora, Solana** out of the box.

[![CI](https://github.com/nikshepsvn/near-hydra/actions/workflows/ci.yml/badge.svg)](https://github.com/nikshepsvn/near-hydra/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)
![Status](https://img.shields.io/badge/status-alpha-orange)

</div>

---

## What it does, in 30 seconds

```bash
$ hydra account balance-all near
{
  "accountId": "near",
  "derived": [
    { "chain": "ethereum",  "address": "0xb190...0954", "balance": "0", "decimals": 18 },
    { "chain": "polygon",   "address": "0x3247...0268", "balance": "0", "decimals": 18 },
    { "chain": "arbitrum",  "address": "0x9e89...d42D", "balance": "0", "decimals": 18 },
    { "chain": "base",      "address": "0xe183...90d9", "balance": "0", "decimals": 18 },
    { "chain": "optimism",  "address": "0x083d...9C64", "balance": "0", "decimals": 18 },
    { "chain": "bnb",       "address": "0x1E07...2305", "balance": "0", "decimals": 18 },
    { "chain": "avalanche", "address": "0x0ddf...f248", "balance": "0", "decimals": 18 },
    { "chain": "aurora",    "address": "0x9A2d...50DB", "balance": "0", "decimals": 18 },
    { "chain": "bitcoin",   "address": "bc1qshk...srza", "balance": "0", "decimals": 8  },
    { "chain": "solana",    "address": "vquhA...n4MB",   "balance": "0", "decimals": 9  }
  ]
}
```

**Ten MPC-derived addresses, ten chains, one NEAR account.** No bridges. No seed phrase per chain. No separate wallets.

This is **NEAR Chain Signatures** — a NEAR account or smart contract signs for any chain via an MPC network. `near-hydra` exposes this, NEAR Intents, and the rest of the stack as a **CLI** for humans and an **MCP server** for AI agents (Claude Code, Cursor, OpenAI Agents SDK, anything MCP-aware).

---

## Why

NEAR's chain-abstraction primitives are powerful but fragmented:

- **Chain Signatures** — sign any chain from one NEAR account
- **NEAR Intents** — declare a goal, solvers fulfill it cross-chain
- **Shade Agents** — verifiable autonomous agents in TEEs

Each lives in a separate library with a different auth model. Stitching them together is annoying glue. `near-hydra` is the glue, agent-ergonomic by default.

---

## Quickstart

```bash
git clone https://github.com/nikshepsvn/near-hydra.git
cd near-hydra
npm install
npm run build
alias hydra="node $(pwd)/packages/cli/dist/index.js"

hydra account balance-all near    # ← real on-chain data, no setup needed
```

Requires Node ≥ 20. Defaults to mainnet, read-only — no key needed for inspection.

---

## Use from Claude Code (or any MCP client)

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "near-hydra": {
      "command": "node",
      "args": ["/absolute/path/to/near-hydra/packages/mcp-server/dist/index.js"],
      "env": { "NEAR_HYDRA_NETWORK": "mainnet" }
    }
  }
}
```

Restart Claude Code, then ask:

> *What's the Bitcoin address derived from the NEAR account `near.near`?*

Claude calls `hydra_address_derive` and returns a real BTC address.

---

## CLI cheatsheet

```bash
hydra config                                          # show active config

hydra account view alice.near                         # NEAR account state
hydra account balance-all alice.near                  # multi-chain in one call

hydra address derive -c bitcoin  -p alice.near        # derive BTC address
hydra address derive -c ethereum -p alice.near
hydra address derive -c solana   -p alice.near
hydra address balance -c bitcoin -a bc1qshk...

hydra contract view wrap.near ft_balance_of \
  -a '{"account_id":"alice.near"}'

hydra swap tokens                                     # 1Click token catalog
hydra swap quote '<json>'                             # get cross-chain quote
hydra swap status <depositAddress>
```

---

## Tools (current set)

| Tool | What it does |
|---|---|
| `hydra_config_show` | Show the active configuration |
| `hydra_account_view` | NEAR account state — balance, storage, code hash |
| `hydra_contract_view` | Read-only contract view call |
| `hydra_address_derive` | Derive a foreign-chain address from a NEAR account via MPC |
| `hydra_address_balance` | Native-asset balance on a foreign chain |
| `hydra_account_balance_all_chains` | Derive + balance across every supported chain |
| `hydra_swap_tokens` | List 1Click-supported tokens |
| `hydra_swap_quote` | Get a cross-chain swap quote |
| `hydra_swap_status` | Check swap execution status |
| `hydra_swap_submit_deposit` | Notify 1Click of broadcast deposit tx |

Every CLI subcommand mirrors a tool one-to-one.

---

## Configuration

Defaults work out of the box. Override via `~/.near-hydra/config.json` or env vars.

### Most useful env vars

| Variable | Purpose |
|---|---|
| `NEAR_HYDRA_NETWORK` | `mainnet` or `testnet` |
| `NEAR_HYDRA_ACCOUNT_ID` | Your NEAR account |
| `NEAR_HYDRA_PRIVATE_KEY` | `ed25519:...` (only needed for signing tx) |
| `NEAR_HYDRA_RPC_NEAR` | Override NEAR RPC |
| `NEAR_HYDRA_RPC_ETHEREUM` | Override Ethereum RPC |
| `NEAR_HYDRA_RPC_POLYGON` | Override Polygon RPC |
| `NEAR_HYDRA_RPC_ARBITRUM` | Override Arbitrum RPC |
| `NEAR_HYDRA_RPC_BASE` | Override Base RPC |
| `NEAR_HYDRA_RPC_OPTIMISM` | Override Optimism RPC |
| `NEAR_HYDRA_RPC_BNB` | Override BNB Chain RPC |
| `NEAR_HYDRA_RPC_AVALANCHE` | Override Avalanche C-chain RPC |
| `NEAR_HYDRA_RPC_AURORA` | Override Aurora RPC |
| `NEAR_HYDRA_RPC_SOLANA` | Override Solana RPC |
| `NEAR_HYDRA_RPC_BITCOIN_MEMPOOL` | Override Mempool API |
| `NEAR_HYDRA_MPC_CONTRACT` | Override MPC contract (advanced) |
| `NEAR_HYDRA_ONECLICK_API_KEY` | 1Click partner key (skips 0.2% fee) |
| `NEAR_HYDRA_CONFIG` | Path to alternate config file |

Every RPC is overridable individually. Public endpoints rate-limit you? Point at Alchemy, QuickNode, dRPC, or your own infra.

### Config file example (`~/.near-hydra/config.json`)

```json
{
  "network": "mainnet",
  "account": {
    "id": "alice.near",
    "privateKey": "ed25519:..."
  },
  "rpc": {
    "ethereum": "https://your-ethereum-rpc",
    "solana":   "https://your-solana-rpc"
  },
  "oneClick": {
    "apiKey": "your-1click-partner-key"
  }
}
```

---

## Roadmap

| Version | Scope |
|---|---|
| **v0.1** *(now)* | Read-only across 6 chains + 1Click swap discovery |
| **v0.2** | Signing + broadcasting on every chain; full 1Click swap execution |
| **v0.3** | Raw NEAR Intents (deposits, solver-relay); Omnibridge |
| **v0.4** | Shade Agent deploy/whitelist/status; NEP-366 meta-transactions |
| **v1.0** | Policy engine (function-call key allowances, allowlists); `hydra do "<natural language>"` goal verb |

---

## Architecture

```
core/        config • NEAR provider • Chain Signatures wrappers • 1Click wrappers
mcp-server/  exposes core functions as MCP tools (stdio transport)
cli/         exposes core functions as commander subcommands
```

Built on the giants:

- [chainsig.js](https://github.com/NearDeFi/chainsig.js) — cross-chain MPC signing
- [@defuse-protocol/one-click-sdk-typescript](https://github.com/defuse-protocol/one-click-sdk-typescript) — NEAR Intents 1Click
- [@near-js/*](https://github.com/near/near-api-js) — NEAR-native ops (v7 modular)
- [viem](https://viem.sh/) — EVM client
- [@solana/web3.js](https://github.com/solana-labs/solana-web3.js) — Solana client
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) — MCP server

`near-hydra` doesn't reinvent any protocol — it composes existing libraries behind one config, one auth model, one tool surface.

---

## Security

`near-hydra` is read-only by default. To use signing operations (coming in v0.2):

- **Private keys are stored unencrypted** in `~/.near-hydra/config.json` or env vars. Treat them like SSH keys: lock down file permissions, never commit them, never paste them into AI agent contexts you don't fully control.
- **Use function-call access keys**, not full-access keys, when handing credentials to an agent. NEAR's permission model lets you create keys scoped to specific contracts/methods with capped allowances. A prompt-injection that says "drain my wallet" should fail because the key can't transfer.
- **Read-only mode is safe** to run against mainnet without a key. The default config has no key.

A v1.0 policy engine (max-tx-value, allowlists, confirmation thresholds) is on the roadmap.

## Known notes

- Mainnet MPC contract pinned to **`v1.signer`**. chainsig.js's bundled default (`v1.sig-net.near`) appears stale; we use the deployed NEAR contract.
- Solana derivation includes a small workaround for a chainsig.js v1.1.14 bug (Ed25519 keys collapsed to SEC1 hex). We derive directly from the MPC contract for Solana.
- `npm install` runs an idempotent postinstall patch for a known chainsig.js ESM packaging issue (extensionless `cosmjs-types` imports).
- Not yet on npm — clone + build for now. Will publish once v0.2 lands.

---

## Why "hydra"?

Many heads, one body. Each chain is a head. The NEAR account is the body. The agent has many faces but one identity. Cut off a chain — derive again. The agent endures.

---

## Contributing

Open to PRs and issues. The roadmap above is the priority list. If you want to take on `v0.2` (signing/sending), file an issue first to coordinate.

---

## License

[Apache-2.0](LICENSE)
