import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    entry: 'src/index.ts',
    resolve: true,
    compilerOptions: {
      composite: false
    }
  },
  clean: true,
  outDir: 'dist'
})
