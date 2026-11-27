/* Version des assets (T5 bis) : empreinte du contenu de public/assets, calculée par vite.config.ts au moment de la
   construction. Ajoutée aux adresses des assets (?v=…) et au nom du cache du service worker. */
declare const __ASSET_VERSION__: string;
export const ASSET_VERSION: string = typeof __ASSET_VERSION__ === 'string' ? __ASSET_VERSION__ : 'dev';
