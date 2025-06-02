import * as esbuild from 'esbuild'
import path from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, mkdirSync, readdirSync } from 'fs'
import chokidar from 'chokidar';
const __dirname = path.dirname(fileURLToPath(import.meta.url))

function copyStaticAssets() {
  const staticDir = path.join(__dirname, 'static')
  const outDir = path.join(__dirname, '../dist/static')

  mkdirSync(outDir, { recursive: true })

  for (const file of readdirSync(staticDir)) {
    if (!file.startsWith('.#')) {
      copyFileSync(path.join(staticDir, file), path.join(outDir, file))
    }
  }
}

const config = {
  entryPoints: ['web-app/src/app.tsx'],
  outfile: 'dist/static/app.js',
  bundle: true,
  format: 'esm',
  sourcemap: true,
  target: 'es2020',
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  logLevel: 'info',
  plugins: [
    {
      name: 'copy-static-assets',
      setup(build) {
        build.onEnd(() => {
          copyStaticAssets();
        })
      }
    }
  ]
}

await esbuild.build(config);
copyStaticAssets(); // initial copy

if (process.env.WATCH === '1') {
  const ctx = await esbuild.context(config);

  const staticPath = path.join(__dirname, 'static');

  chokidar.watch(staticPath, { recursive: true }).on('change', (filepath) => {
    console.log(`[watch] static file changed: ${filepath}`);
    copyStaticAssets();
  });

  console.log('[watch] web app watching for changes...');
  await ctx.watch()
}
