import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    // `bun run --cwd apps/api dev:admin` serves /api/* here; the page just forwards to it.
    proxy: { '/api': 'http://localhost:8788' },
  },
  // effect's HTTP client makes the bundle large; this page has no size budget.
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1000 },
});
