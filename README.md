<div align="center">

# 🐍 near-hydra

### **One NEAR account. Every chain. Every agent.**

The unified CLI + MCP server for NEAR's chain-abstraction stack.
Signs transactions across **10 chains** from a single account.
Built for AI agents and humans.

[![CI](https://github.com/nikshepsvn/near-hydra/actions/workflows/ci.yml/badge.svg)](https://github.com/nikshepsvn/near-hydra/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/near-hydra.svg?label=near-hydra)](https://www.npmjs.com/package/near-hydra)
[![npm](https://img.shields.io/npm/v/near-hydra-mcp.svg?label=near-hydra-mcp&color=purple)](https://www.npmjs.com/package/near-hydra-mcp)
[![License](https://img.shields.io/badge/license-Apache_2.0-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen)
![Chains](https://img.shields.io/badge/chains-10-orange)

<br>

![near-hydra demo: ten chains, ten addresses, one NEAR account](https://raw.githubusercontent.com/nikshepsvn/near-hydra/main/demo.gif)

</div>

---

## What you can do, in two lines

```bash
$ hydra account balance-all near
# → ten chains, ten addresses, ten balances. From one NEAR account.

$ hydra swap execute --from nep141:eth-0xdac17...omft.near \
    --to nep141:sol.omft.near --amount 1000000 \
    --recipient <your-solana-addr> --broadcast
# → USDT on Ethereum becomes SOL on Solana. One MCP call. No bridge UI.
```

`near-hydra` makes NEAR's primitives feel like a single product:

- **Chain Signatures** — one NEAR account derives + signs on Bitcoin, Ethereum, Polygon, Arbitrum, Base, Optimism, BNB Chain, Avalanche, Aurora, Solana
- **NEAR Intents** — high-level cross-chain swaps via the 1Click API, auto-routed by origin asset
- **NEAR-native** — accounts, contracts, FTs, view + write

CLI for humans. MCP server for Claude Code, Cursor, OpenAI Agents SDK, anything that speaks Model Context Protocol.

---

## Chain support matrix

| Chain | View | Derive | Native send | Token send | As swap origin | As swap dest |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **NEAR**       | ✅ | n/a | ✅ | ✅ NEP-141 | ✅ | ✅ |
| **Bitcoin**    | ✅ | ✅ | ✅ | n/a | ✅ | ✅ |
| **Ethereum**   | ✅ | ✅ | ✅ | ✅ ERC-20 | ✅ | ✅ |
| **Polygon**    | ✅ | ✅ | ✅ | ✅ ERC-20 | ✅ | ✅ |
| **Arbitrum**   | ✅ | ✅ | ✅ | ✅ ERC-20 | ✅ | ✅ |
| **Base**       | ✅ | ✅ | ✅ | ✅ ERC-20 | ✅ | ✅ |
| **Optimism**   | ✅ | ✅ | ✅ | ✅ ERC-20 | ✅ | ✅ |
| **BNB Chain**  | ✅ | ✅ | ✅ | ✅ ERC-20 | ✅ | ✅ |
| **Avalanche**  | ✅ | ✅ | ✅ | ✅ ERC-20 | ✅ | ✅ |
| **Aurora**     | ✅ | ✅ | ✅ | ✅ ERC-20 | ✅ | ✅ |
| **Solana**     | ✅ | ✅ | ✅ | 🟡 SPL TBD | 🟡 native only | ✅ |

---

## Quickstart

### From npm (recommended)

```bash
npm install -g near-hydra            # CLI: `near-hydra ...`
npx -y near-hydra account balance-all near    # ← real on-chain data, no setup
```

Or for the MCP server:

```bash
npm install -g near-hydra-mcp        # exposes `near-hydra-mcp` binary
```

### From source

```bash
git clone https://github.com/nikshepsvn/near-hydra.git
cd near-hydra && npm install && npm run build
alias hydra="node $(pwd)/packages/cli/dist/index.js"
hydra account balance-all near
```

Requires Node ≥ 20. Defaults to mainnet, read-only.

### Use from Claude Code (or any MCP client)

After `npm install -g near-hydra-mcp`, add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "near-hydra": {
      "command": "near-hydra-mcp",
      "env": { "NEAR_HYDRA_NETWORK": "mainnet" }
    }
  }
}
```

Or with `npx` (no global install):

```json
{
  "mcpServers": {
    "near-hydra": {
      "command": "npx",
      "args": ["-y", "near-hydra-mcp"],
      "env": { "NEAR_HYDRA_NETWORK": "mainnet" }
    }
  }
}
```

Restart Claude Code. Try:

> *What's the Bitcoin address derived from `near.near`?*

Claude calls `hydra_address_derive` and returns a real BTC address.

---

## Your first cross-chain swap, step-by-step

Goal: swap **1 wNEAR for SOL on Solana**, delivered to your derived Solana address.

```bash
# 1. Set up signing
export NEAR_HYDRA_READ_ONLY=false
export NEAR_HYDRA_ACCOUNT_ID=alice.near
export NEAR_HYDRA_PRIVATE_KEY="ed25519:..."

# 2. Find your Solana address
hydra address derive -c solana -p alice.near
# → "address": "vquhA...n4MB"

# 3. Dry-run the swap (verify the plan, no funds moved)
hydra swap execute \
  --from nep141:wrap.near --to nep141:sol.omft.near \
  --amount 1000000000000000000000000 --recipient vquhA...n4MB

# 4. Execute (this moves real money)
hydra swap execute \
  --from nep141:wrap.near --to nep141:sol.omft.near \
  --amount 1000000000000000000000000 --recipient vquhA...n4MB \
  --broadcast

# 5. Watch settlement
hydra swap status <depositAddress-from-step-4>
```

The same flow works EVM-origin: pass `nep141:eth-0x...omft.near` as `--from` and hydra auto-routes to a Chain-Signature-signed ERC-20 transfer on Ethereum.

---

## Tools (17 total)

### Read-only — safe by default

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

### Signing — gated, dry-run by default

| Tool | What it does |
|---|---|
| `hydra_send_near` | Send native NEAR |
| `hydra_send_ft` | Send a NEP-141 fungible token |
| `hydra_contract_call` | State-changing NEAR contract call |
| `hydra_send_evm` | Send on any EVM chain via Chain Signatures (native or ERC-20) |
| `hydra_send_btc` | Send BTC via Chain Signatures |
| `hydra_send_solana` | Send SOL via Chain Signatures |
| `hydra_swap_execute` | End-to-end cross-chain swap, auto-routed by origin chain |

Every signing tool throws unless `policy.readOnly = false`, and defaults `dry: true`. See [SECURITY.md](SECURITY.md).

---

## How it works

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Code / Cursor / Agents SDK / human in the terminal  │
└─────────────────────────────────────────────────────────────┘
                              │
                MCP (stdio)   │   CLI (commander)
                              ▼
        ┌───────────────────────────────────────┐
        │            near-hydra core            │
        │  ┌─────────────────────────────────┐  │
        │  │  policy │ config │ state cache  │  │
        │  └─────────────────────────────────┘  │
        └─────┬─────┬──────┬────────┬───────────┘
              │     │      │        │
              ▼     ▼      ▼        ▼
       near-api-js chainsig.js  one-click  viem / @solana/web3.js
       (NEAR)      (MPC across  (Intents)  (chain RPCs)
                    every chain)
```

`near-hydra` doesn't reinvent any protocol. It composes the official libraries behind one config, one auth model, one tool surface — and adds the connective tissue (memoization, error mapping, policy, dry-run-by-default) that an autonomous agent actually needs.

---

## Configuration

Defaults work out of the box. Override via `~/.near-hydra/config.json` or env vars.

### Most useful env vars

| Variable | Purpose |
|---|---|
| `NEAR_HYDRA_NETWORK` | `mainnet` or `testnet` |
| `NEAR_HYDRA_ACCOUNT_ID` | Your NEAR account |
| `NEAR_HYDRA_PRIVATE_KEY` | `ed25519:...` (only needed for signing) |
| `NEAR_HYDRA_READ_ONLY` | `false` to enable signing (default `true`) |
| `NEAR_HYDRA_MAX_VALUE_NEAR` | Cap a single NEAR transfer (e.g. `"5"`) |
| `NEAR_HYDRA_MAX_VALUE_WEI` | Cap a single EVM native transfer in wei |
| `NEAR_HYDRA_RPC_<CHAIN>` | Override any chain's RPC |
| `NEAR_HYDRA_MPC_CONTRACT` | Override MPC contract (advanced) |
| `NEAR_HYDRA_ONECLICK_API_KEY` | 1Click partner key (skips 0.2% fee) |
| `NEAR_HYDRA_CONFIG` | Path to alternate config file |

`<CHAIN>` is one of `NEAR`, `ETHEREUM`, `POLYGON`, `ARBITRUM`, `BASE`, `OPTIMISM`, `BNB`, `AVALANCHE`, `AURORA`, `SOLANA`, `BITCOIN_MEMPOOL`. When public endpoints rate-limit you, point at Alchemy / QuickNode / dRPC / your own infra.

### Config file example

```json
{
  "network": "mainnet",
  "account": {
    "id": "alice.near",
    "privateKey": "ed25519:..."
  },
  "policy": {
    "readOnly": false,
    "maxValueNear": "5"
  },
  "rpc": {
    "ethereum": "https://your-ethereum-rpc",
    "solana": "https://your-solana-rpc"
  },
  "oneClick": {
    "apiKey": "your-1click-partner-key"
  }
}
```

---

## Architecture

```
core/        config • signers • Chain Signatures wrappers • 1Click client • policy
mcp-server/  exposes core as MCP tools (stdio transport)
cli/         exposes core as commander subcommands
```

Built on:

- [chainsig.js](https://github.com/NearDeFi/chainsig.js) — cross-chain MPC signing
- [@defuse-protocol/one-click-sdk-typescript](https://github.com/defuse-protocol/one-click-sdk-typescript) — NEAR Intents 1Click
- [@near-js/*](https://github.com/near/near-api-js) — NEAR-native ops (v7 modular)
- [viem](https://viem.sh/) — EVM client
- [@solana/web3.js](https://github.com/solana-labs/solana-web3.js) — Solana client
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) — MCP server

---

## Roadmap

| Version | Scope |
|---|---|
| **v0.1** | Read-only across 10 chains; 1Click swap discovery |
| **v0.2** | NEAR sends + contract writes; EVM send via Chain Signatures; NEAR-origin swap_execute; policy layer |
| **v0.3** *(now)* | BTC + Solana sends; swap_execute auto-routes 4 origin chains. Read AND write working on every chain. |
| **v0.4** | Solana SPL tokens; raw NEAR Intents (deposits, solver-relay); Omnibridge |
| **v0.5** | Shade Agent deploy/whitelist/status; NEP-366 meta-transactions |
| **v1.0** | Function-call key automation; per-tool confirmations; `hydra do "<natural language>"` goal verb |

---

## FAQ

### How is this different from `nearai/near-mcp`?

`near-mcp` is excellent for NEAR-native operations and Ref Finance swaps (23 tools). `near-hydra` extends to **Chain Signatures** (sign on every chain) and **NEAR Intents 1Click** (cross-chain swaps), with a stacked safety model and a cohesive CLI alongside. They're complementary — you can run both.

### Is this affiliated with NEAR Foundation?

No. It's an unofficial open-source project built on top of NEAR's official libraries. We file upstream issues for bugs we find.

### Why "hydra"?

Many heads, one body. Each chain is a head. The NEAR account is the body. The agent has many faces but one identity. Cut off a chain — derive again. The agent endures.

### Does this expose my private key to the LLM?

No. Private keys live in your local config or env vars. The LLM calls MCP tools that pass through `near-hydra`, which signs locally with your key. The LLM never sees the key bytes. That said — a malicious or prompt-injected LLM that's been given signing permission can ask hydra to send funds. Use **function-call access keys with capped allowances** (see `policy` and [SECURITY.md](SECURITY.md)).

### Can I add more chains?

Yes — any chain `chainsig.js` already supports (Cosmos, XRP, SUI, Aptos) just needs adapter wiring + RPC config. PRs welcome. Chains MPC doesn't yet support need protocol-level work.

### How is this funded?

Self-funded; not seeking grants currently. If you want to support, contribute PRs or upstream chainsig.js fixes.

---

## Contributing

Issues + PRs welcome. The roadmap above is the priority list. For non-trivial work, please open an issue first.

## License

[Apache-2.0](LICENSE) — security-related disclosures: [SECURITY.md](SECURITY.md)

---

<div align="center">
<sub>Built with love by people who think NEAR's chain abstraction deserves a worthy CLI.</sub>
</div>
