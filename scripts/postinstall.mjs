// Idempotent fix for a known chainsig.js packaging bug:
// the bundled ESM file imports `cosmjs-types/...` without a .js extension,
// which Node's strict ESM resolver rejects. We append .js to those specifiers.
// Safe to run repeatedly. Removes itself if already patched.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const targets = [
  "node_modules/chainsig.js/node/index.node.js",
  "node_modules/chainsig.js/browser/index.browser.js",
];

const COSMJS_RE = /from\s*['"]cosmjs-types\/([^'"]+)['"]/g;

for (const path of targets) {
  if (!existsSync(path)) continue;
  const before = readFileSync(path, "utf8");
  const after = before.replace(COSMJS_RE, (_m, sub) =>
    /\.[a-z0-9]+$/i.test(sub) ? `from'cosmjs-types/${sub}'` : `from'cosmjs-types/${sub}.js'`,
  );
  if (after !== before) {
    writeFileSync(path, after);
    console.log(`[near-hydra postinstall] patched ${path}`);
  }
}
