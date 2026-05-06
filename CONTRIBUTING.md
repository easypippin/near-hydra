# Contributing

Thanks for the interest. Three things that make contributions land smoothly:

1. **File an issue first** for non-trivial work (anything bigger than a typo). Good issues describe the problem, not the proposed solution. The roadmap in the [README](README.md#roadmap) is the priority list — work in those areas needs less coordination.

2. **Keep PRs scoped.** One concern per PR. If your change touches policy, sends, *and* docs, split it. Reviews go faster.

3. **Run the build + smoke locally** before pushing:
   ```bash
   npm install
   npm run build
   npm test                       # MCP tool registration smoke
   node scripts/mcp-e2e.mjs       # MCP end-to-end against live mainnet
   ```
   CI runs the same on every push to `main` and on PRs.

## Project layout

```
packages/core/        config, signers, Chain Signatures wrappers, 1Click client, policy
packages/mcp-server/  exposes core as MCP tools (stdio)
packages/cli/         exposes core as commander subcommands
scripts/              postinstall (chainsig.js patch), smoke tests, e2e test
examples/             user-facing walkthroughs
```

Adding a new chain is mostly:
1. Add an RPC entry in `packages/core/src/config.ts` (default URLs + env-var override).
2. Add the chain to `SupportedChain` / `EvmChain` (if EVM) in `packages/core/src/chains.ts`.
3. If non-EVM, wire a `chainAdapters.<chain>` branch in `buildAdapter`.
4. Add a `DEFAULT_PATHS` entry.
5. Update the README chain matrix and the smoke test if needed.

## Style

- Functional patterns over classes.
- Explicit types (no `any`).
- Small focused functions (< 50 lines).
- Comments explain *why*, not *what*.
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.

## License

By contributing you agree your changes ship under [Apache-2.0](LICENSE).
