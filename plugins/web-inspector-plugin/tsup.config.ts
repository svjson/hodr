import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  clean: true,
  format: ['esm', 'cjs'],
  dts: {
    entry: './src/index.ts',
  },
  tsconfig: './tsconfig.json',
});
