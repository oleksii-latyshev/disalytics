import { defineConfig } from 'vitest/config';

// `turbo run test` only reaches the workspaces, and tools/ is not one of them. This is what gives
// the repository scripts somewhere to be tested from; `bun run test` runs both.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tools/**/__tests__/**/*.test.ts'],
  },
});
