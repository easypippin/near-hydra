# Troubleshooting

Common errors and what to do about them.

## "MPC contract … rejected the call. The default contract address may be stale."

The mainnet MPC contract is `v1.signer`. If NEAR ever migrates and the default goes stale, override:

```bash
export NEAR_HYDRA_MPC_CONTRACT=<new-contract-id>
```

The error from `near-hydra` already includes this hint. The current default is correct as of v0.3.0; this would only fire if NEAR moves the contract.

For testnet, the default is `v1.signer-prod.testnet`.

---

## "HTTP 401" or "API key disabled" from a chain RPC

A public RPC is rate-limiting or has been pulled. Override that chain's URL:

```bash
export NEAR_HYDRA_RPC_POLYGON=https://polygon-rpc.your-provider.example
export NEAR_HYDRA_RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/<your-key>
# ... etc
```

Per-chain env vars: `NEAR_HYDRA_RPC_NEAR`, `NEAR_HYDRA_RPC_ETHEREUM`, `NEAR_HYDRA_RPC_POLYGON`, `NEAR_HYDRA_RPC_ARBITRUM`, `NEAR_HYDRA_RPC_BASE`, `NEAR_HYDRA_RPC_OPTIMISM`, `NEAR_HYDRA_RPC_BNB`, `NEAR_HYDRA_RPC_AVALANCHE`, `NEAR_HYDRA_RPC_AURORA`, `NEAR_HYDRA_RPC_SOLANA`, `NEAR_HYDRA_RPC_BITCOIN_MEMPOOL`.

---

## "ERR_MODULE_NOT_FOUND … cosmjs-types/cosmos/tx/signing/v1beta1/signing"

The `near-hydra-core` postinstall script didn't run, leaving a known [chainsig.js v1.1.14 bundling bug](https://github.com/NearDeFi/chainsig.js/issues/30) unpatched.

Fix: rerun the patch manually.

```bash
cd /path/to/your/project
node node_modules/near-hydra-core/scripts/postinstall.mjs
```

Or `npm rebuild near-hydra-core` to re-trigger the lifecycle script.

---

## "The total cost of executing this transaction exceeds the balance of the account."

Your derived address on the foreign chain doesn't have native gas. NEAR's MPC can sign for it, but the chain you're broadcasting to charges its own gas, paid out of the derived address's native balance.

Two options:

1. **Manually fund the derived address** with a tiny amount of native gas (e.g., 0.005 ETH for Ethereum, 0.01 SOL for Solana). Send from a CEX or another wallet.
2. **Wait for v1.0 `ensure_gas`** — auto-bridges gas via 1Click before broadcasting.

In dry-run mode (`dry: true`), `hydra_send_evm` skips gas estimation entirely, so you can preview the planned transaction without funding anything.

---

## "near-hydra is in read-only mode"

Default. Flip explicitly:

```bash
export NEAR_HYDRA_READ_ONLY=false
```

Or in `~/.near-hydra/config.json`:

```json
{ "policy": { "readOnly": false } }
```

This is intentional — you should opt into signing globally. See [SECURITY.md](../SECURITY.md).

---

## "No NEAR signer configured"

Missing `account.id` and/or `account.privateKey`.

```bash
export NEAR_HYDRA_ACCOUNT_ID=alice.near
export NEAR_HYDRA_PRIVATE_KEY="ed25519:..."
```

Or in `~/.near-hydra/config.json`:

```json
{
  "account": {
    "id": "alice.near",
    "privateKey": "ed25519:..."
  }
}
```

For agent use, **don't paste a full-access key**. Generate a function-call access key scoped to `v1.signer` and any contracts you intend to use. See [docs/CONCEPTS.md](../docs/CONCEPTS.md#near-account-model-function-call-access-keys).

---

## "Solana SPL tokens are not yet routable" (during swap_execute)

`hydra_swap_execute` recognizes native SOL (`nep141:sol.omft.near`) but not SPL token bridges (`nep141:sol-<address>.omft.near`) because we haven't wired SPL transfer construction yet. Tracked for v0.4.

Workaround: do the swap manually — `hydra_swap_quote` followed by `hydra_swap_submit_deposit` against the deposit address from the quote. You'd need to construct the SPL transfer outside hydra for now.

---

## Tx broadcast succeeded but `submit-deposit` returned an error

The 1Click solver network likely already noticed the deposit (they monitor the deposit address). The submit step is a hint to speed things up but isn't strictly required. Poll `hydra_swap_status` — if status progresses, the swap is on track regardless.

---

## "wasm execution failed" with a different panic message

This usually means the called contract is not the contract you expect. Check `hydra_config_show` and verify the `mpcContract` field. If you're calling a custom contract, double-check `contractId` and `method` for typos.

---

## Tools list is empty in Claude Code

The MCP server failed to start. Check Claude Code's MCP server logs (usually in the Claude Code panel or developer console). Most common causes:

- Wrong path in `args` (using a relative or stale absolute path).
- `near-hydra-mcp` not installed globally — switch to the `npx -y near-hydra-mcp` config form.
- Node ≥ 20 not on Claude Code's `PATH`. If you have nvm, set `command` to your node binary's absolute path:
  ```json
  {
    "command": "/Users/you/.nvm/versions/node/v22.10.0/bin/node",
    "args": ["/path/to/near-hydra-mcp/dist/index.js"]
  }
  ```

---

## Still stuck?

Open an issue at https://github.com/nikshepsvn/near-hydra/issues with:

- The exact command you ran (with private keys redacted!)
- The full error
- Output of `near-hydra config`
- Your Node version (`node --version`)

Faster than guessing.
