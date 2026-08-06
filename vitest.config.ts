import { defineConfig } from 'vitest/config';

// The package needs its own config, not the repository's.
//
// Running `pnpm test` from inside this directory found the ROOT config, whose `setupFiles` points at
// `tests/setup.ts` relative to the repository root. That path does not resolve from here, so
// collection failed before a single test ran.
//
// To be exact about what this does and does not fix: the root suite DOES run these tests. Its
// config sets no `include`, so the default glob reaches `packages/cwr/test/`, and
// `npx vitest list packages/cwr` from the repository root lists all 8 cases. What was broken is the
// standalone run, which is the one a contributor to the published package makes, and the one that
// proves this package works with no reference to the application it is copied from.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
