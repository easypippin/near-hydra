// Idempotent fix for a known chainsig.js packaging bug:
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ── Part 1: append .js to bare cosmjs-types specifiers in bundled files ──────
// chainsig.js ships minified ESM that imports cosmjs-types sub-paths without
// the ".js" extension. Node's strict ESM resolver rejects those specifiers.
const COSMJS_RE = /from\s+['"]cosmjs-types\/([^'"]+)['"]/g;

const targets = [
  "node_modules/chainsig.js/node/index.node.js",
  "node_modules/chainsig.js/browser/index.browser.js",
];

for (const path of targets) {
  if (!existsSync(path)) continue;
  const before = readFileSync(path, "utf8");
  const after = before.replace(COSMJS_RE, (_m, sub) =>
    /\.[a-z0-9]+$/i.test(sub) ? `from 'cosmjs-types/${sub}'` : `from 'cosmjs-types/${sub}.js'`,
  );
  if (after !== before) {
    writeFileSync(path, after);
    console.log(`[near-hydra postinstall] patched import paths in ${path}`);
  }
}

// ── Part 2: fix missing deep exports in chainsig.js's bundled cosmjs-types ───
// chainsig.js bundles its own cosmjs-types under
//   node_modules/chainsig.js/node_modules/cosmjs-types/
// whose package.json is missing entries for deep paths it imports at runtime.
// We add the missing exports entries.  See:
//   https://github.com/nodejs/node/issues/52211
const ct_pkg = "node_modules/chainsig.js/node_modules/cosmjs-types/package.json";
if (existsSync(ct_pkg)) {
  const pkg = JSON.parse(readFileSync(ct_pkg, "utf8"));
  const add = (spec, target) => {
    if (!pkg.exports[spec]) {
      pkg.exports[spec] = { types: target.replace(/\.js$/, ".d.ts"), default: target };
    }
  };
  add("./cosmos/tx/signing/v1beta1/signing.js", "./cosmos/tx/signing/v1beta1/signing.js");
  add("./cosmos/tx/v1beta1/tx.js", "./cosmos/tx/v1beta1/tx.js");
  writeFileSync(ct_pkg, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`[near-hydra postinstall] patched cosmjs-types exports map`);
}
