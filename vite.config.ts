import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'remove-tailwind-cdn',
      apply: 'build',
      transformIndexHtml(html) {
        return html.replace('<script src="https://cdn.tailwindcss.com"></script>', '');
      },
    },
  ],
  base: '/LinexioAbi/', // Absoluter Pfad für GitHub Pages Unterverzeichnisse
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      external: ['manifest.json'],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'lucide-react'],
          utils: ['localforage', 'jspdf'],
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: true,
  },
});
