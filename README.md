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
# Read-only — works without any setup
hydra config
hydra account view alice.near
hydra account balance-all alice.near                  # multi-chain in one call
hydra address derive -c bitcoin  -p alice.near
hydra address derive -c ethereum -p alice.near
hydra address derive -c solana   -p alice.near
hydra address balance -c bitcoin -a bc1qshk...
hydra contract view wrap.near ft_balance_of -a '{"account_id":"alice.near"}'
hydra swap tokens

# Signing — requires NEAR_HYDRA_READ_ONLY=false + account credentials.
# Every command defaults to a dry run; pass --broadcast to actually send.
hydra send near alice.near 1000000000000000000000000             # 1 NEAR — dry
hydra send near alice.near 1000000000000000000000000 --broadcast # actually send
hydra send ft wrap.near alice.near 1000000000000000000000000
hydra call my-contract.near my_method -a '{"x":1}' --deposit-yocto 1
hydra send evm -c base --to 0x... --value-wei 1000000000000000
hydra send evm -c polygon --to ignored \
  --erc20-token 0x3c49... --erc20-recipient 0xABCD... --erc20-amount 1000000

# End-to-end cross-chain swap (NEAR-origin)
hydra swap execute --from nep141:wrap.near --to nep141:eth.bridge.near \
  --amount 100000000000000000000000 --recipient 0xRecipient...
```

---

## Tools (current set)

### Read-only (safe by default)

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

### Signing (gated by `policy.readOnly = false`, dry-run by default)

| Tool | What it does |
|---|---|
| `hydra_send_near` | Send native NEAR from the configured account |
| `hydra_send_ft` | Send a NEP-141 fungible token (ft_transfer) |
| `hydra_contract_call` | State-changing call to a NEAR contract |
| `hydra_send_evm` | Send on any EVM chain via Chain Signatures (native or ERC-20) |
| `hydra_swap_execute` | End-to-end NEAR-origin cross-chain swap (quote → ft_transfer → submit deposit) |

**Every signing tool defaults `dry: true`.** Dry mode returns the plan (and for EVM, the encoded calldata + derived sender). Set `dry: false` to actually broadcast. On top of that, `policy.readOnly` defaults to `true` — even with `dry: false`, a tool throws unless the user has explicitly opted out of read-only.

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
| `NEAR_HYDRA_READ_ONLY` | `false` to enable signing (default `true`) |
| `NEAR_HYDRA_MAX_VALUE_NEAR` | Cap on a single NEAR transfer (e.g. `"5"`) |
| `NEAR_HYDRA_MAX_VALUE_WEI` | Cap on a single EVM native transfer in wei |

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
| **v0.1** | Read-only across 10 chains + 1Click swap discovery |
| **v0.2** *(now)* | NEAR sends + contract writes, EVM send via Chain Signatures, end-to-end NEAR-origin swap_execute, policy layer (read-only-by-default + dry-run-by-default + value caps) |
| **v0.3** | EVM/Solana/Bitcoin-origin swap_execute; raw NEAR Intents (deposits, solver-relay); Omnibridge; Solana + BTC sends |
| **v0.4** | Shade Agent deploy/whitelist/status; NEP-366 meta-transactions |
| **v1.0** | Function-call access key automation; allowlist/allowance enforcement; `hydra do "<natural language>"` goal verb |

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

`near-hydra` is read-only by default with multiple safety layers stacked:

1. **`policy.readOnly: true` is the default.** Every signing tool throws unless you explicitly set `policy.readOnly: false` (or `NEAR_HYDRA_READ_ONLY=false`).
2. **Every signing tool defaults `dry: true`.** Dry mode returns the planned transaction (including derived sender, encoded calldata, etc.) without broadcasting. Pass `dry: false` to actually broadcast.
3. **Optional value caps.** `policy.maxValueNear` / `policy.maxValueWei` (or env equivalents) refuse transfers above a threshold.
4. **No signer = no signing.** Tools fail loudly if `account.id` and `account.privateKey` aren't configured.

Beyond the in-tool defenses:

- **Private keys are stored unencrypted** in `~/.near-hydra/config.json` or env vars. Treat them like SSH keys: lock down file permissions, never commit them, never paste them into AI agent contexts you don't fully control.
- **Use NEAR function-call access keys**, not full-access keys, when handing credentials to an agent. The permission model lets you scope a key to specific contracts/methods with capped allowances — a prompt-injection that says "drain my wallet" then fails at the protocol layer because the key can't transfer.
- **Test on testnet first.** `NEAR_HYDRA_NETWORK=testnet` switches every chain default. NEAR mainnet operations are live money.

A future v1.0 policy engine adds allowlists and per-tool confirmations.

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
