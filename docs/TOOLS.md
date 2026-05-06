# Tool Reference

All 17 MCP tools `near-hydra` registers, with input fields, outputs, and notes. CLI subcommands mirror these one-to-one.

Conventions:
- 🔍 = read-only (safe by default)
- ✏️ = signing (gated by `policy.readOnly = false`, `dry: true` by default)

---

## 🔍 hydra_config_show

Show the active configuration.

**Input:** none.

**Output:** `{ network, accountId, hasPrivateKey, mpcContract, nearRpc, oneClickBaseUrl, oneClickAuthed, policy }`

---

## 🔍 hydra_account_view

View a NEAR account's on-chain state.

**Input:** `{ accountId: string }`

**Output:** `{ accountId, network, balance: { total, available, usedOnStorage, locked, totalNear, availableNear }, storageUsage, codeHash }`

---

## 🔍 hydra_contract_view

Call a read-only view method on a NEAR contract.

**Input:** `{ contractId: string, method: string, args?: object }`

**Output:** parsed JSON if the contract returns valid JSON, otherwise the raw string.

---

## 🔍 hydra_address_derive

Derive a foreign-chain address via Chain Signatures.

**Input:** `{ chain: SupportedChain, predecessor: string, path?: string }`

`chain`: `ethereum | polygon | arbitrum | base | optimism | bnb | avalanche | aurora | bitcoin | solana`. `predecessor` is a NEAR account id. `path` defaults to `<chain>-1`.

**Output:** `{ chain, predecessor, path, address, publicKey }`

---

## 🔍 hydra_address_balance

Native-asset balance of an address on a foreign chain.

**Input:** `{ chain: SupportedChain, address: string }`

**Output:** `{ chain, address, balance, decimals }` (balance is a string of base units)

---

## 🔍 hydra_account_balance_all_chains

For one NEAR account, derive its addresses on every supported chain and return all balances. Per-chain errors are reported individually — partial success is normal.

**Input:** `{ accountId: string }`

**Output:** `{ accountId, derived: Array<{ chain, address?, balance?, decimals?, error? }> }`

---

## 🔍 hydra_swap_tokens

List all tokens supported by NEAR Intents 1Click for cross-chain swaps.

**Input:** none.

**Output:** array of `{ assetId, decimals, blockchain, symbol, price, priceUpdatedAt, contractAddress }`.

---

## 🔍 hydra_swap_quote

Get a 1Click cross-chain swap quote.

**Input:** `{ originAsset, destinationAsset, amount, recipient, recipientType, refundTo, refundType, depositType, swapType, slippageTolerance, depositMode?, dry, sessionId? }`

Critical fields:
- `originAsset` / `destinationAsset` — 1Click asset IDs (e.g. `nep141:wrap.near`, `nep141:eth-0xdac17...omft.near`). See `hydra_swap_tokens`.
- `amount` — base units of `originAsset`.
- `swapType` — `EXACT_INPUT | EXACT_OUTPUT | FLEX_INPUT | ANY_INPUT`.
- `slippageTolerance` — basis points (100 = 1%).
- `dry: true` — simulate; no deposit address. `dry: false` — real deposit address returned.

**Output:** `QuoteResponse` from 1Click — see [their docs](https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api).

---

## 🔍 hydra_swap_status

Check the execution status of a 1Click swap.

**Input:** `{ depositAddress: string, depositMemo?: string }`

**Output:** `GetExecutionStatusResponse` from 1Click.

---

## 🔍 hydra_swap_submit_deposit

Notify 1Click that the deposit transaction has been broadcast.

**Input:** `{ depositAddress: string, txHash: string }`

**Output:** `SubmitDepositTxResponse` from 1Click.

---

## ✏️ hydra_send_near

Send native NEAR from the configured account.

**Input:** `{ to: string, amountYocto: string, dry?: boolean (default true) }`

`amountYocto` is in yoctoNEAR (1 NEAR = 10²⁴ yocto).

**Output (dry):** `{ dry: true, plan: { kind: "send_near", from, to, amountYocto } }`
**Output (broadcast):** `{ dry: false, plan, txHash, result }`

---

## ✏️ hydra_send_ft

Send a NEP-141 fungible token via `ft_transfer`.

**Input:** `{ tokenContract: string, to: string, amount: string, memo?: string, dry?: boolean }`

`amount` is in the token's base units. `memo` is optional, sometimes required by 1Click for MEMO-mode chains.

**Output:** `{ dry, plan: { kind: "send_ft", from, tokenContract, to, amount, memo }, txHash?, result? }`

---

## ✏️ hydra_contract_call

Call a state-changing method on a NEAR contract.

**Input:** `{ contractId: string, method: string, args?: object, depositYocto?: string, gas?: string, dry?: boolean }`

`gas` is in absolute units (10¹² = 1 TGas). Default 30 TGas. `depositYocto` is the attached NEAR.

**Output:** `{ dry, plan: { kind: "contract_call", from, contractId, method, args, depositYocto, gas }, txHash?, result? }`

---

## ✏️ hydra_send_evm

Send an EVM transaction signed via Chain Signatures from a derived address.

**Input:** `{ chain: EvmChain, predecessor?: string, path?: string, to: string, valueWei?: string, dataHex?: 0x..., erc20?: { token, recipient, amount }, dry?: boolean }`

Modes:
- **Native value:** set `to` + `valueWei` (and optionally `dataHex`).
- **ERC-20 transfer:** set `erc20: { token, recipient, amount }`. Hydra encodes the calldata, sets `to = token`, `value = 0`.

`predecessor` defaults to the configured NEAR account, `path` to `<chain>-1`.

**Output (dry):** `{ dry: true, plan: { kind: "send_evm", chain, from (derived), to, valueWei, dataHex, derivedFrom: { predecessor, path } } }`
**Output (broadcast):** `{ dry: false, plan, txHash, signedTx }`

Pre-conditions for broadcast: derived `from` address must hold the origin asset + native gas on its chain. NEAR account pays for the MPC sign request (gas + 1 yocto deposit).

---

## ✏️ hydra_send_btc

Send BTC via Chain Signatures from a derived Bitcoin address. UTXO selection via Mempool API.

**Input:** `{ predecessor?: string, path?: string, to: string, satoshi: string, dry?: boolean }`

**Output:** `{ dry, plan: { kind: "send_btc", from, to, satoshi, derivedFrom }, txHash?, signedTx? }`

Pre-conditions: derived address must have spendable UTXOs ≥ `satoshi` + fees.

---

## ✏️ hydra_send_solana

Send native SOL via Chain Signatures from a derived Solana address.

**Input:** `{ predecessor?: string, path?: string, to: string, lamports: string, dry?: boolean }`

**Output:** `{ dry, plan: { kind: "send_sol", from, to, lamports, derivedFrom }, txHash?, signedTx? }`

Pre-conditions: derived address must have SOL ≥ `lamports` + fees.

---

## ✏️ hydra_swap_execute

End-to-end cross-chain swap. Auto-routes the origin send by parsing `originAsset`:

| Pattern | Routes via |
|---|---|
| `nep141:<x>.near` (NEAR-side FT) | `sendFt` |
| `nep141:eth-0x...omft.near`, `arb-...`, `pol-...`, `bsc-...`, `base-...`, `op-...`, `avax-...`, `aurora-...` | `sendEvm` (ERC-20 calldata if has contract suffix, native value if not) |
| `nep141:btc.omft.near` | `sendBtc` |
| `nep141:sol.omft.near` | `sendSolana` |

**Input:** `{ originAsset, destinationAsset, amount, recipient, recipientType, refundTo?, refundType?, depositType?, swapType?, slippageTolerance?, depositMode?, dry?: boolean }`

**Output (dry):** `{ dry: true, plan: { kind: "swap_execute", route, originAsset, destinationAsset, amount, recipient }, previewQuoteRequest }`
**Output (broadcast):** `{ dry: false, route, quote, sendResult, txHash, depositAddress, submitResult, next: { hint } }`

Use `hydra_swap_status` afterward to poll settlement.

---

## CLI parity

Every tool has a CLI subcommand. Most-used:

```
near-hydra config
near-hydra account view <id>
near-hydra account balance-all <id>
near-hydra address derive -c <chain> -p <id>
near-hydra address balance -c <chain> -a <addr>
near-hydra contract view <contractId> <method> [-a <jsonArgs>]
near-hydra swap tokens
near-hydra swap quote --from ... --to ... --amount ... --recipient ... --refund-to ...
near-hydra swap status <depositAddress>
near-hydra swap execute --from ... --to ... --amount ... --recipient ... [--broadcast]
near-hydra send near <to> <amountYocto> [--broadcast]
near-hydra send ft <tokenContract> <to> <amount> [--memo ...] [--broadcast]
near-hydra send evm -c <chain> --to <addr> [--value-wei ... | --erc20-token ... --erc20-recipient ... --erc20-amount ...] [--broadcast]
near-hydra send btc <to> <satoshi> [--broadcast]
near-hydra send sol <to> <lamports> [--broadcast]
near-hydra call <contractId> <method> [-a <jsonArgs>] [--deposit-yocto ...] [--gas ...] [--broadcast]
```

CLI defaults to dry-run for every signing command. Pass `--broadcast` to actually send.
