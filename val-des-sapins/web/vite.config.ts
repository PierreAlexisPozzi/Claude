import { defineConfig } from 'vite';
import { assetVersion } from './tools/asset-version.mjs';

/* T5 bis : version des assets = empreinte de leur contenu (public/assets). Ajoutée aux adresses (?v=…) et au nom du
   cache du service worker : après une mise à jour des données (tuiles, enseignes…), un joueur qui revient ne reçoit
   plus un mélange d'anciens et de nouveaux fichiers. */
export default defineConfig({
  base: './',
  define: { __ASSET_VERSION__: JSON.stringify(assetVersion()) },
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
