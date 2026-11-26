import { defineConfig } from 'vite';

// Chemins relatifs (base './') : dist/ se sert tel quel depuis un sous-dossier, un artefact ou GitHub Pages.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'static',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    sourcemap: false,
    rollupOptions: {
      output: { manualChunks: (id) => (id.includes('node_modules/three') ? 'three' : undefined) },
    },
  },
  server: { port: 5173, fs: { allow: ['..'] } },   // CREDITS.md (dossier parent) est importé par l'écran des crédits
  preview: { port: 4173 },
});
