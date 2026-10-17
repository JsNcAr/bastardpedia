import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

interface ProjectConfig {
  name: string;
  slug: string;
  shortName: string;
  description: string;
}

// project.config.json is the single rename point (docs/DEPLOYMENT.md).
const project = JSON.parse(
  readFileSync(new URL('./project.config.json', import.meta.url), 'utf8'),
) as ProjectConfig;

// Absolute base: the app uses history routing, so asset URLs must not be
// relative to the current route (docs/adr/0002).
export default defineConfig({
  base: '/',
  define: {
    __APP_NAME__: JSON.stringify(project.name),
    __APP_SLUG__: JSON.stringify(project.slug),
  },
  plugins: [
    react(),
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
        // The catalog changes with every release: network first, cache as fallback.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === '/data/catalog.json',
            handler: 'NetworkFirst',
            options: { cacheName: 'catalog' },
          },
        ],
      },
    }),
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
});
