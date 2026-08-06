// Add the `.js` extension to every relative import in `dist`.
//
// The package sets `"type": "module"`, so Node loads `dist` as ESM. Node ESM requires an explicit
// file extension on a relative specifier. TypeScript with `"module": "ESNext"` writes relative
// imports exactly as the source has them, which is extensionless, so the emitted `dist/index.js`
// contained `from './parse/parse-cwr'` and Node refused to resolve it.
//
// The package therefore built, passed its tests, and could not be imported by anybody:
//
//   import { validateCwr } from 'record-cwr-validator'
//   -> ERR_MODULE_NOT_FOUND .../dist/parse/parse-cwr
//
// Neither `build` nor `test` caught it, because vitest resolves through its own bundler and never
// loads the built output. `test/built-package.test.ts` now imports `dist` the way a consumer does.
//
// This runs after `tsc` rather than changing the source, because the source is a copy of the
// application's `core/validation/cwr/**`, which Next.js compiles and which must stay
// extensionless there. Rewriting the emitted output keeps both consumers correct.

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { existsSync } from 'node:fs';

const DIST = new URL('../dist/', import.meta.url).pathname;

/** `from './x'` and `from "../y"`, plus the same shapes on `export … from`. */
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]*)\2/g;

function* files(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* files(full);
    else if (full.endsWith('.js')) yield full;
  }
}

/**
 * Resolve what the specifier meant, then write it with an extension.
 *
 * A bare directory import (`./rules`) means `./rules/index.js` to a bundler and nothing at all to
 * Node, so it is expanded rather than given a `.js` that would point at a file which does not exist.
 */
function withExtension(spec, fromFile) {
  if (extname(spec)) return spec;
  const target = resolve(dirname(fromFile), spec);
  if (existsSync(`${target}.js`)) return `${spec}.js`;
  if (existsSync(join(target, 'index.js'))) return `${spec}/index.js`;
  // Neither exists: leave it alone and let the built-package test fail loudly rather than write a
  // specifier that is confidently wrong.
  return spec;
}

let changed = 0;
for (const file of files(DIST)) {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(SPECIFIER, (whole, lead, quote, spec) => {
    const fixed = withExtension(spec, file);
    return fixed === spec ? whole : `${lead}${quote}${fixed}${quote}`;
  });
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}
console.log(`add-js-extensions: rewrote ${changed} file(s) in dist`);
