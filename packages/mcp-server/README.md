# near-hydra-mcp

**MCP server for the NEAR stack** — exposes accounts, Chain Signatures (signing across 10 chains), and NEAR Intents 1Click swaps as agent tools. Drop-in for Claude Code, Cursor, OpenAI Agents SDK, and any other MCP-aware client.

## Install

```bash
npm install -g near-hydra-mcp
```

## Use from Claude Code

Add to `~/.claude/settings.json`:

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

Restart Claude Code, then ask:

> *What's the Bitcoin address derived from `near.near`?*

## Tools (17 total)

**Read-only (safe by default)**: `hydra_config_show`, `hydra_account_view`, `hydra_contract_view`, `hydra_address_derive`, `hydra_address_balance`, `hydra_account_balance_all_chains`, `hydra_swap_tokens`, `hydra_swap_quote`, `hydra_swap_status`, `hydra_swap_submit_deposit`

**Signing (gated by `policy.readOnly = false`, dry-run by default)**: `hydra_send_near`, `hydra_send_ft`, `hydra_contract_call`, `hydra_send_evm`, `hydra_send_btc`, `hydra_send_solana`, `hydra_swap_execute`

## Safety

`policy.readOnly` defaults to `true`. Every signing tool defaults `dry: true`. Optional value caps. See https://github.com/nikshepsvn/near-hydra/blob/main/SECURITY.md.

## Full documentation

See https://github.com/nikshepsvn/near-hydra for the full README, chain support matrix, configuration reference, and security model.

## License

Apache-2.0
