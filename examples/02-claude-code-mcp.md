# Example 2 — wire near-hydra into Claude Code

Goal: have Claude Code (or any MCP-aware client) drive your NEAR + cross-chain operations as native tools. After ~60 seconds of setup, you can ask Claude things like *"what's my Bitcoin address derived from `alice.near`?"* and get a real address back.

## Setup

### 1. Install the MCP server

```bash
npm install -g near-hydra-mcp
```

### 2. Add it to Claude Code

Edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "near-hydra": {
      "command": "near-hydra-mcp",
      "env": {
        "NEAR_HYDRA_NETWORK": "mainnet"
      }
    }
  }
}
```

Or — if you don't want to install globally — use `npx`:

```json
{
  "mcpServers": {
    "near-hydra": {
      "command": "npx",
      "args": ["-y", "near-hydra-mcp"],
      "env": {
        "NEAR_HYDRA_NETWORK": "mainnet"
      }
    }
  }
}
```

Restart Claude Code. The 17 `hydra_*` tools should now show up.

## Read-only prompts you can try right away

- *"What's the BTC address derived from the NEAR account `near`?"*
- *"Show me the balances for `near` across every supported chain."*
- *"What tokens does NEAR Intents 1Click support? Group by chain."*
- *"Get a quote for swapping 1 wNEAR to ETH on Ethereum."*

Each of these maps to one or two MCP tool calls. Claude does the routing automatically.

## Going further: enable signing

Read-only mode is the default. To let Claude actually move funds, you need to:

1. Set a NEAR account + private key
2. Disable read-only mode

```bash
export NEAR_HYDRA_ACCOUNT_ID=alice.near
export NEAR_HYDRA_PRIVATE_KEY="ed25519:..."
export NEAR_HYDRA_READ_ONLY=false
```

Or put them in `~/.near-hydra/config.json`:

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
  }
}
```

Add the relevant env vars to the `mcpServers.near-hydra.env` block in your Claude Code settings (or rely on shell-inherited env).

## Safety levers (please use them)

Even with `readOnly: false`, every signing tool defaults to `dry: true`. When Claude wants to actually broadcast, it must explicitly set `dry: false`. So:

- *"Send 0.1 NEAR to bob.near"* → returns a plan, no funds moved.
- *"Send 0.1 NEAR to bob.near and broadcast"* → broadcasts.

Set `policy.maxValueNear` and/or `policy.maxValueWei` to cap how much a single tool call can move. A prompt-injected Claude that says *"send 1000 NEAR to attacker.near"* fails at the policy layer.

For production agent use, **always** generate a NEAR [function-call access key](https://docs.near.org/concepts/protocol/access-keys) scoped to:
- `v1.signer` (Chain Signatures contract) for foreign-chain signing
- Specific FT contracts you actually want to spend from

This way the worst a compromised agent can do is what the key explicitly allows. See [SECURITY.md](../SECURITY.md).

## Sample agent flows

### Multi-chain treasury check

> *"Show me a one-line summary of every chain's balance for `alice.near` and tell me which are non-zero."*

Claude calls `hydra_account_balance_all_chains`, parses the response, summarizes.

### Cross-chain swap (NEAR-origin → Solana)

> *"Swap 1 wNEAR for SOL on Solana. Send the SOL to my derived Solana address from alice.near. Dry-run first, then ask me to confirm."*

Claude:
1. `hydra_address_derive(chain=solana, predecessor=alice.near)` → recipient address
2. `hydra_swap_execute(originAsset=nep141:wrap.near, destinationAsset=nep141:sol.omft.near, amount=..., recipient=..., dry=true)` → plan
3. Surfaces the plan, waits for your "go"
4. Re-runs with `dry=false` → real swap

### Cross-chain swap (Ethereum USDT → SOL)

> *"Swap 10 USDT on Ethereum for SOL. The recipient should be my Solana address derived from alice.near. Use ORIGIN_CHAIN deposit type."*

Claude infers the asset id (`nep141:eth-0xdac17...omft.near`), calls `swap_execute`. `near-hydra` auto-detects EVM-origin and routes the deposit through `send_evm` with Chain-Signatures-MPC signing. SOL lands on the recipient.

## What you didn't have to set up

- Per-chain wallets
- Per-chain private keys
- Bridge accounts
- A custodian
- Any UI

That's the point of `near-hydra`. NEAR's MPC network and Intents network do the heavy lifting; this MCP server is just the agent-ergonomic surface on top.
