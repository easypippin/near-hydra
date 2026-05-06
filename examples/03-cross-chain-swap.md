# Example 3 — your first cross-chain swap

Walkthrough: swap **1 wNEAR for SOL on Solana**, delivered to your derived Solana address. End-to-end. Mainnet. Real money.

For the dry-run version (which moves nothing), just omit `--broadcast` from the final command and stop after step 4.

> ⚠️ This example moves real funds. Test the dry-run flow first. Cap the amount via `policy.maxValueNear` so a typo can't drain your wallet.

## Pre-flight

You'll need:

- Node ≥ 20 + `near-hydra` installed (`npm install -g near-hydra`)
- A NEAR mainnet account with at least 1.5 wNEAR (the swap input + a small buffer for slippage and gas)
- Its private key
- A Solana destination address (we'll derive one)

```bash
export NEAR_HYDRA_NETWORK=mainnet
export NEAR_HYDRA_ACCOUNT_ID=alice.near
export NEAR_HYDRA_PRIVATE_KEY="ed25519:..."
export NEAR_HYDRA_READ_ONLY=false
export NEAR_HYDRA_MAX_VALUE_NEAR="3"   # safety: cap any single NEAR move
```

## Step 1 — derive the recipient

```bash
near-hydra address derive -c solana -p alice.near
```

```json
{
  "chain": "solana",
  "predecessor": "alice.near",
  "path": "solana-1",
  "address": "vquhA...n4MB",
  "publicKey": "ed25519:vquhA...n4MB"
}
```

That Solana address is controlled by `alice.near` via Chain Signatures. SOL sent to it can later be moved with `hydra_send_solana` (signed via MPC).

## Step 2 — make sure you have wNEAR

Native NEAR isn't a NEP-141. To swap from "NEAR" via 1Click, you need wrapped NEAR (`wrap.near`). Check your balance:

```bash
near-hydra contract view wrap.near ft_balance_of -a '{"account_id":"alice.near"}'
```

If it returns `"0"`, wrap some NEAR first:

```bash
near-hydra call wrap.near near_deposit -a '{}' --deposit-yocto 1100000000000000000000000 --broadcast
# wraps 1.1 NEAR (gives a small buffer for slippage)
```

## Step 3 — quote the swap (dry)

```bash
near-hydra swap quote \
  --from nep141:wrap.near \
  --to nep141:sol.omft.near \
  --amount 1000000000000000000000000 \
  --recipient vquhA...n4MB \
  --refund-to alice.near \
  --refund-type INTENTS
```

The response includes `quote.amountOutFormatted` (how much SOL you'll get) and `quote.amountInUsd` / `amountOutUsd`. If the rate looks bad, change `swapType` or pass `--slippage-bps` differently.

## Step 4 — execute the swap (dry-run first)

```bash
near-hydra swap execute \
  --from nep141:wrap.near \
  --to nep141:sol.omft.near \
  --amount 1000000000000000000000000 \
  --recipient vquhA...n4MB
```

Output (truncated):

```json
{
  "dry": true,
  "plan": {
    "kind": "swap_execute",
    "route": { "kind": "near-ft", "ftContract": "wrap.near" },
    "originAsset": "nep141:wrap.near",
    "destinationAsset": "nep141:sol.omft.near",
    "amount": "1000000000000000000000000",
    "recipient": "vquhA...n4MB"
  },
  "previewQuoteRequest": { ... }
}
```

The `route.kind: near-ft` means hydra will use `sendFt` against `wrap.near` to deposit. NEAR-origin = simplest path, no Chain Signatures needed for the deposit. Good.

## Step 5 — broadcast

Add `--broadcast` and run again:

```bash
near-hydra swap execute \
  --from nep141:wrap.near \
  --to nep141:sol.omft.near \
  --amount 1000000000000000000000000 \
  --recipient vquhA...n4MB \
  --broadcast
```

This:
1. Hits 1Click `/quote` with `dry=false` → real `depositAddress` (a NEAR account managed by 1Click).
2. Calls `wrap.near.ft_transfer({receiver_id: depositAddress, amount: ...})` from your account, with the 1 yocto deposit + 30 TGas.
3. Submits the tx hash to 1Click via `/submit-deposit`.
4. Returns the quote, deposit address, your tx hash, and a hint to poll status.

```json
{
  "dry": false,
  "quote": { ... },
  "sendResult": { "txHash": "AbCd...", "result": { ... } },
  "txHash": "AbCd...",
  "depositAddress": "deposit-xyz.near",
  "submitResult": { ... },
  "next": { "hint": "Poll hydra_swap_status with depositAddress until status indicates settlement." }
}
```

## Step 6 — watch settlement

```bash
near-hydra swap status deposit-xyz.near
```

Repeat until `status` indicates settlement. Solver typically completes in 30-90 seconds for popular asset pairs. SOL appears at `vquhA...n4MB` on Solana.

## Step 7 — verify on Solana

```bash
near-hydra address balance -c solana -a vquhA...n4MB
```

Or check on [Solscan](https://solscan.io/) directly.

## What you didn't have to do

- Manage a Solana wallet
- Manage a NEAR↔Solana bridge account
- Pay bridge fees out of band
- Sign anything on Solana yourself
- Trust a custodial swap UI

You used 1Click as the solver network and Chain Signatures as the cross-chain identity layer. Each is independently strong; together they collapse cross-chain UX to a single tool call.

## EVM-origin variant

To swap **USDT on Ethereum → SOL**, change the origin asset and have your derived ETH address pre-funded with USDT + a tiny bit of ETH for gas:

```bash
# Find your derived ETH address
near-hydra address derive -c ethereum -p alice.near
# Send USDT from a CEX or another wallet to that ETH address.
# Then:

near-hydra swap execute \
  --from nep141:eth-0xdac17f958d2ee523a2206206994597c13d831ec7.omft.near \
  --to nep141:sol.omft.near \
  --amount 10000000 \
  --recipient vquhA...n4MB \
  --broadcast
```

`hydra_swap_execute` parses the origin asset, sees it's an ETH-bridged ERC-20, and routes the deposit through `sendEvm` (ERC-20 transfer signed via Chain Signatures from your derived ETH address). Same final destination, different origin chain.
