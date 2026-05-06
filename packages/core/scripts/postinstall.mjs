// Idempotent fix for a known chainsig.js v1.1.14 packaging bug:
// the bundled ESM file imports `cosmjs-types/...` without a .js extension,
// which Node's strict ESM resolver rejects. We append .js to those specifiers.
//
// Walks up the dir tree to find chainsig.js (handles npm hoisting), so this
// works whether near-hydra-core is installed alone, as a dep of near-hydra,
// or in any nested workspace.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";

const COSMJS_RE = /from\s*['"]cosmjs-types\/([^'"]+)['"]/g;

function findChainsig(start) {
  let dir = start;
  for (let i = 0; i < 12; i++) {
    const candidate = join(dir, "node_modules", "chainsig.js");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const root = findChainsig(process.cwd()) ?? findChainsig(import.meta.dirname ?? new URL(".", import.meta.url).pathname);
if (!root) {
  // chainsig.js isn't installed yet (rare timing race) — silently skip.
  process.exit(0);
}

const targets = [join(root, "node", "index.node.js"), join(root, "browser", "index.browser.js")];
for (const path of targets) {
  if (!existsSync(path)) continue;
  const before = readFileSync(path, "utf8");
  const after = before.replace(COSMJS_RE, (_m, sub) =>
    /\.[a-z0-9]+$/i.test(sub) ? `from'cosmjs-types/${sub}'` : `from'cosmjs-types/${sub}.js'`,
  );
  if (after !== before) {
    writeFileSync(path, after);
    console.log(`[near-hydra-core] patched ${path}`);
  }
}
