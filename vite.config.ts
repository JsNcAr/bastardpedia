import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { compressDir } from './scripts/lib/compress-core.mjs';

interface ProjectConfig {
  name: string;
  slug: string;
  repository: { url: string };
  shortName: string;
  description: string;
}

// project.config.json is the single rename point (docs/DEPLOYMENT.md).
const project = JSON.parse(
  readFileSync(new URL('./project.config.json', import.meta.url), 'utf8'),
) as ProjectConfig;

const CATALOG = fileURLToPath(new URL('./public/data/catalog.json', import.meta.url));

/**
 * In a production build the catalogue also ships under a content-hashed name,
 * so browsers, the service worker and Caddy can cache it forever; a release
 * changes the name. Dev and tests keep the plain /data/catalog.json, which also
 * stays in dist/ for anyone linking to it (docs/DEPLOYMENT.md).
 */
function catalogAsset(build: boolean) {
  if (!build || !existsSync(CATALOG)) return { url: '/data/catalog.json', source: null };
  const source = readFileSync(CATALOG);
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 10);
  return { url: `/data/catalog.${hash}.json`, source };
}

// Absolute base: the app uses history routing, so asset URLs must not be
// relative to the current route (docs/adr/0002).
export default defineConfig(({ command }) => {
  const catalog = catalogAsset(command === 'build');
  let outDir = 'dist';
  return {
    base: '/',
    define: {
      __APP_NAME__: JSON.stringify(project.name),
      __APP_SLUG__: JSON.stringify(project.slug),
      __REPO_URL__: JSON.stringify(project.repository.url),
      __CATALOG_URL__: JSON.stringify(catalog.url),
    },
    plugins: [
      react(),
      {
        name: 'hashed-catalog',
        apply: 'build',
        generateBundle() {
          if (catalog.source)
            this.emitFile({
              type: 'asset',
              fileName: catalog.url.slice(1),
              source: catalog.source,
            });
        },
      },
      {
        name: 'project-title',
        transformIndexHtml: (html) => html.replaceAll('%APP_NAME%', project.name),
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png'],
        manifest: {
          name: project.name,
          short_name: project.shortName,
          description: project.description,
          // The light page surface; a manifest cannot read the theme.
          theme_color: '#F7F3EC',
          background_color: '#F7F3EC',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          // Icons are exported from brand/masters by the logo kit (brand/README.md).
          icons: [
            { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,woff2,svg}'],
          navigateFallback: '/index.html',
          // The hashed catalogue never changes under its name: cache first, keep the
          // current one and the previous one. The plain name is only a fallback.
          runtimeCaching: [
            {
              urlPattern: ({ url }) => /^\/data\/catalog\.[0-9a-f]+\.json$/.test(url.pathname),
              handler: 'CacheFirst',
              options: { cacheName: 'catalog', expiration: { maxEntries: 2 } },
            },
            {
              urlPattern: ({ url }) => url.pathname === '/data/catalog.json',
              handler: 'NetworkFirst',
              options: { cacheName: 'catalog-plain' },
            },
          ],
        },
      }),
      {
        // Last: .br/.zst/.gz sidecars for everything in the output folder, the
        // service worker included, so Caddy never compresses at request time
        // (scripts/lib/compress-core.mjs, docs/DEPLOYMENT.md).
        name: 'precompress',
        apply: 'build',
        configResolved(config) {
          outDir = resolve(config.root, config.build.outDir);
        },
        closeBundle: {
          order: 'post',
          sequential: true,
          handler() {
            const { files, before, after } = compressDir(outDir);
            console.log(
              `precompress: ${String(files)} files, ${(before / 1024).toFixed(0)} KiB -> ${(after / 1024).toFixed(0)} KiB as brotli`,
            );
          },
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'shared/**/*.test.ts',
        'pipeline/**/*.test.ts',
        'scripts/lib/**/*.test.mjs',
      ],
    },
  };
});
