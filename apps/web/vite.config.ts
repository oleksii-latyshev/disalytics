import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
// Extension included: Vite's `configLoader: 'native'` becomes the default in a future major and
// warns about extensionless local imports today.
import { radarAssets } from './plugins/radar-assets.ts';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Resolved here rather than inside the plugin: Vite bundles the config, and `import.meta.url`
    // inside a file bundled into it points at this file regardless of where that file lives.
    radarAssets({
      assetsRoot: fileURLToPath(new URL('../../packages/map-data/assets', import.meta.url)),
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // The worker is built and shipped but never registered: AGENTS.md §12 requires an update
      // prompt before anything caches the shell, and that prompt is Phase 6. Registering it here
      // would make the deployment cache-sticky with no way to ask for the reload.
      injectRegister: false,
      devOptions: { enabled: false },
      injectManifest: {
        // Fonts stay out: 240 kB of woff2 the shell renders without, and §12 scopes the precache to
        // HTML/JS/CSS/icons. Sourcemaps and .wasm fall outside the extension list. The manifest and
        // its icons are absent on purpose — the plugin adds those itself, and globbing them too
        // puts every one of them in the precache list twice. §12 also lists the radar images, but
        // the worker is never registered until Phase 6, so precaching them now caches nothing.
        globPatterns: ['**/*.{html,css,js}'],
      },
      manifest: {
        name: 'disalytics',
        short_name: 'disalytics',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        launch_handler: { client_mode: 'focus-existing' },
        file_handlers: [
          {
            action: '/open',
            accept: { 'application/octet-stream': ['.dem', '.dem.zst', '.dem.bz2'] },
          },
        ],
        background_color: '#0e1216',
        theme_color: '#0e1216',
        icons: [
          { src: '/icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // The parse worker imports the generated glue by the name wasm-pack writes into
      // pkg/package.json. pkg/ is a build output rather than a dependency and is gitignored, so
      // `bun run wasm:build` has to have run before this resolves.
      'demo-parser-wasm': fileURLToPath(
        new URL('../../crates/demo-parser-wasm/pkg/demo_parser_wasm.js', import.meta.url),
      ),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
