// Import the BUILT package, the way a consumer does.
//
// Every other test in this package imports `src`, which vitest resolves through its own bundler.
// That is not what a consumer touches. A consumer touches `dist`, loaded by Node as ESM, and for
// the whole life of this package that path did not work: `pnpm build` succeeded, `pnpm test`
// passed, and `import { validateCwr } from 'record-cwr-validator'` failed with
// ERR_MODULE_NOT_FOUND on `./parse/parse-cwr`, because Node ESM requires a file extension that
// TypeScript did not emit.
//
// So this suite exists to make "it builds and the tests pass" mean something. It runs the build in
// a child process and imports the output, and it must not be rewritten to import `src`.

import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const dist = new URL('../dist/index.js', import.meta.url);

beforeAll(() => {
  // Build if `dist` is absent, so the suite is meaningful on a fresh clone as well as in CI.
  if (!existsSync(dist)) {
    execFileSync('pnpm', ['build'], { cwd: new URL('..', import.meta.url).pathname, stdio: 'inherit' });
  }
}, 120_000);

describe('the published package', () => {
  it('can be imported by Node as ESM', async () => {
    // A failure here is ERR_MODULE_NOT_FOUND, which is exactly the defect this pins.
    const mod = await import(dist.href);
    expect(typeof mod.validateCwr).toBe('function');
  });

  it('exposes the whole documented surface', async () => {
    const mod = await import(dist.href);
    for (const name of [
      'validateCwr',
      'summariseValidation',
      'verdictLead',
      'formatCwrReport',
      'formatVerdictSummary',
      'groupByRule',
      'CWR_GLOSSARY',
      'CWR_CATEGORY_LABEL',
      'CWR_CATEGORY_FIX',
      'CWR_RECORD_LENGTHS',
      'ALL_RULES',
    ]) {
      expect(mod[name], `${name} is exported from the built package`).toBeDefined();
    }
  });

  it('validates a file through the built output', async () => {
    const { validateCwr } = await import(dist.href);
    // An empty input is the smallest thing that must produce a structured result rather than throw.
    const result = validateCwr('');
    expect(result.ok).toBe(false);
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('carries a glossary entry for every abbreviation it can show', async () => {
    const { CWR_GLOSSARY } = await import(dist.href);
    expect(Object.keys(CWR_GLOSSARY).length).toBeGreaterThanOrEqual(30);
    expect(CWR_GLOSSARY.HDR.full).toBe('Transmission Header');
  });
});
