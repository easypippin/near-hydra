# Example 1 — multi-chain identity in 30 seconds

The simplest demo of what `near-hydra` does: take any NEAR account, get a real address on every supported chain, look up balances. No wallet setup. No bridges. No private keys per chain.

## Setup

```bash
npm install -g near-hydra
```

Defaults to mainnet, read-only. No config file or env var required.

## Derive a single foreign-chain address

```bash
near-hydra address derive -c bitcoin -p near
```

```json
{
  "chain": "bitcoin",
  "predecessor": "near",
  "path": "bitcoin-1",
  "address": "bc1qshkyxg868zft8prvtz373jueketdc2x3t3srza",
  "publicKey": "0289c21f2b7e8e4d1a6a266218c6e3f1d35b36582596d00702e966489f9324b2a5"
}
```

That's a real, valid Bitcoin address derived from the NEAR account `near`. Same NEAR account + same path → same Bitcoin address every time. The NEAR MPC network is the only thing that can sign on its behalf — no individual private key exists for that address.

## Get all 10 derived addresses + balances at once

```bash
near-hydra account balance-all near
```

```json
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
    { "chain": "bitcoin",   "address": "bc1qshk...srza", "balance": "0", "decimals": 8 },
    { "chain": "solana",    "address": "vquhA...n4MB",   "balance": "0", "decimals": 9 }
  ]
}
```

One NEAR account, ten chains, ten real addresses. To "fund" any of them you'd just send the chain's native asset to that address — same as any other wallet. To send *from* them, you flip into signing mode (see [example 2](./02-claude-code-mcp.md) for that flow via Claude Code, or run `near-hydra send --help` directly).

## Pick your own derivation path

The default path is `<chain>-1`, but the path is a free-form string. Different paths → different addresses for the same NEAR account. Useful for sub-wallets or per-purpose isolation.

```bash
near-hydra address derive -c ethereum -p alice.near --path "trading"
near-hydra address derive -c ethereum -p alice.near --path "savings"
# → two completely different ETH addresses, both controlled by alice.near
```

## What just happened

You called the [Chain Signatures](https://docs.near.org/chain-abstraction/chain-signatures) MPC contract on NEAR mainnet. It returned the public key derived from the requesting account ID + path tuple, using BIP32-style derivation. `near-hydra` then formatted that key into the chain's address standard (P2WPKH for BTC, EIP-55 hex for EVM, base58 for Solana).

No data left your machine except the read query to NEAR RPC and the chain RPCs for balances. No keys to manage. No bridge accounts to set up.

That's the read side. Continue with:
- [Example 2 — Claude Code MCP](./02-claude-code-mcp.md): same primitives as MCP tools, plus the signing path.
- [Example 3 — your first cross-chain swap](./03-cross-chain-swap.md): NEAR-origin, EVM-origin, and SPL-origin walkthroughs.
