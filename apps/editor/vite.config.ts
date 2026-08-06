import { defineConfig } from 'vite';

export default defineConfig({
  server: { proxy: { '/api': process.env.API_TARGET ?? 'http://localhost:3001' } },
  build: { outDir: 'dist' },
});
