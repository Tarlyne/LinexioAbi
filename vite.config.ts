import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Wichtig für GitHub Pages (relative Pfade)
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'lucide-react'],
          utils: ['localforage', 'jspdf', 'html2canvas']
        }
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true
  }
});