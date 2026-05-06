# Concepts

A short tour of the primitives `near-hydra` composes. None of these are unique to hydra — they're NEAR Protocol features. Hydra just makes them feel like one thing.

---

## Chain Signatures (MPC across every chain)

NEAR's MPC ([Multi-Party Computation](https://en.wikipedia.org/wiki/Secure_multi-party_computation)) network is a set of NEAR validators that jointly hold private keys *across* chains. When a NEAR smart contract or account asks the MPC contract to sign a payload, the validators run a multi-round computation that produces a signature — but no single validator ever holds the full key.

**Key derivation.** Given `(predecessor: NEAR account id, path: free-form string)`, the MPC contract returns a public key. The math is BIP32-style additive key derivation off a network root key. Same input → same output, deterministically. So `near.near + "bitcoin-1"` always derives the same Bitcoin address.

**Signing.** The same `(predecessor, path)` tuple is used to ask for a signature on a hash. The MPC orchestrates the t-of-n threshold signing among validators. Result: an ECDSA (secp256k1) or Ed25519 signature you can use on any chain.

**Why this is novel.** Most chains have *no* way to sign on other chains. Bridges work around this by holding pooled assets and minting wrapped tokens. NEAR's MPC removes the bridge entirely — your NEAR account just *signs* on Bitcoin, on Ethereum, on Solana, natively. The asset on the other chain is real, controlled by your derived address, and only the MPC network can spend it.

**Production contract on mainnet:** `v1.signer`. Override via `NEAR_HYDRA_MPC_CONTRACT` if NEAR ever moves it.

---

## NEAR Intents (1Click)

NEAR Intents is a declarative cross-chain settlement layer. Users (or agents) say *what* they want — "swap 1 wNEAR for SOL on Solana" — and a network of solvers competes to execute it.

**1Click** is the simplest entry point: a REST API where you submit a quote request, get back a deposit address (on the origin chain), send the origin asset there, and settle. The solver network bridges, swaps, and delivers to your destination address.

The Intents flow `near-hydra` exposes:

1. `hydra_swap_quote` — get pricing, rate, deposit address.
2. `hydra_swap_execute` — auto-routes the origin send (via `sendFt` on NEAR, `sendEvm` on EVM, `sendBtc` on Bitcoin, `sendSolana` on Solana). The send tool signs through Chain Signatures when the origin is a foreign chain.
3. `hydra_swap_status` — poll until the destination is settled.

**Why this is powerful with Chain Signatures.** Swap origin can be on any chain because the agent already has a derived address there with signing capability. The agent doesn't need a bridged-tokens-on-NEAR position to start a swap — it can just sign and send on the origin chain natively.

---

## NEAR account model (function-call access keys)

NEAR's permission model is the safety story for autonomous agents. Two key types:

- **Full-access key** — can do anything on the account, including transferring NEAR and deleting the account.
- **Function-call access key** — scoped to a specific contract (and optionally specific methods), with an attached NEAR allowance for gas. Can't transfer the underlying NEAR.

For agents, this is the right unit. Generate a function-call access key scoped to:

- `v1.signer` (Chain Signatures) — lets the agent sign on foreign chains
- Any FT contract you want it to spend from
- Any specific contract you want it to call

The worst a compromised or prompt-injected agent can do is what the key explicitly allows. A "drain my wallet" injection fails at the protocol layer because the key can't transfer NEAR.

`near-hydra` doesn't generate these keys for you yet (v1.0 roadmap). For now use [`near-cli-rs`](https://github.com/near/near-cli-rs):

```bash
near account add-key alice.near \
  grant-function-call-access \
  --receiver-id v1.signer \
  --method-names sign \
  --allowance "1.0 NEAR"
```

---

## Hydra's safety model

Two layers stacked on top of NEAR's:

**1. `policy.readOnly: true` is the default.** Every signing tool throws unless explicitly flipped via config or `NEAR_HYDRA_READ_ONLY=false`. You opt into signing globally.

**2. Every signing tool defaults `dry: true`.** Dry mode returns the planned tx (chain, sender, encoded calldata, derived path) — never broadcasts. The agent must explicitly set `dry: false` to actually send. This is per-call, not per-session.

**3. Optional value caps.** `policy.maxValueNear` / `policy.maxValueWei` (or env vars) refuse transfers above a threshold. Doesn't help for ERC-20 amounts (those bypass the wei cap by going through `data` instead of `value`), but caps native transfers.

**4. No signer = no signing.** Tools fail clearly when `account.id` and `account.privateKey` aren't configured.

The combination means: you have to *opt out of read-only*, *opt out of dry-run*, and *configure a signer* before anything moves. Three independent toggles. None of them is the default.

---

## Why this couldn't exist before NEAR

Other L1s have parts of this story but not the whole.

- **Ethereum** has account abstraction (ERC-4337) but no native cross-chain signing. Bridges are required.
- **Bitcoin** has nothing comparable.
- **Solana** has no cross-chain signing.
- **Cosmos** has IBC, but only between Cosmos chains.
- **Polkadot** has parachains, but cross-chain limited to its ecosystem.

NEAR is the first L1 with a production MPC network that signs *on every other chain*, plus an Intents layer that uses it for one-click cross-chain settlement, plus an agent-friendly account model. `near-hydra` packages all three behind a single tool surface — the kind that an LLM can drive with no glue.

That's why "only on $NEAR" isn't bullish marketing-speak. It's a literal description of where the primitives exist today.
