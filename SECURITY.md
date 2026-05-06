# Security Policy

## Reporting a vulnerability

If you find a security issue in `near-hydra`, please **do not open a public issue**. Instead, email **security@near-hydra.dev** (or open a private security advisory at https://github.com/nikshepsvn/near-hydra/security/advisories/new).

Please include:
- A description of the issue and its impact
- Reproduction steps (or a proof-of-concept if available)
- Any suggested mitigations

You'll get a response within 72 hours. We aim to release a fix within 14 days for critical issues.

## Threat model — please read

`near-hydra` mediates signing operations against live blockchains, including mainnet. Use the safety levers we provide:

1. **`policy.readOnly: true` is the default.** Don't disable it unless you understand the consequences.
2. **Every signing tool defaults `dry: true`.** A dry run never broadcasts. Treat any tool that returns `dry: false` as final.
3. **Use NEAR function-call access keys** scoped to `v1.signer` and any FT contracts you actually use, with capped allowances. Never give an agent your full-access key.
4. **Private keys are stored unencrypted** in `~/.near-hydra/config.json` or env vars. Lock down file permissions, never commit them, never paste them into chat contexts.
5. **Test on testnet first.** `NEAR_HYDRA_NETWORK=testnet` switches every chain default.

## Known issues we route around

- `chainsig.js` v1.1.14's Solana adapter collapses Ed25519 keys to SEC1 hex. We bypass this by calling the MPC contract directly for Solana derivations. Tracked upstream.
- `chainsig.js`'s bundled `CONTRACT_ADDRESSES` mainnet entry was stale (`v1.sig-net.near`). We pin to the live deployment (`v1.signer`). Override via `NEAR_HYDRA_MPC_CONTRACT` if NEAR's contract address changes.
- An idempotent postinstall patches a known `chainsig.js` ESM packaging bug (extensionless `cosmjs-types` imports).

These are documented and surfaced in error messages.
