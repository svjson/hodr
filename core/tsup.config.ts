import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    entry: 'src/index.ts',
    resolve: true,
    compilerOptions: {
      composite: false,
    },
  },
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
});
