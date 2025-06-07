import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '.',
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@hodr/core': new URL('../../core/src', import.meta.url).pathname,
      '@hodr/koa-plugin': new URL('./src', import.meta.url).pathname,
      '@hodr/testkit': new URL('../../lib/testkit/src', import.meta.url).pathname,
    },
  },
});
