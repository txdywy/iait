import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['scripts/**/*.test.ts', 'src/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    testTimeout: 10000,
    pool: 'threads',
    clearMocks: true,
    restoreMocks: true,
  },
});
