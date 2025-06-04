import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  root: '.',
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@hodr/zod-plugin': path.resolve(__dirname, '.'),
    },
  },
});
