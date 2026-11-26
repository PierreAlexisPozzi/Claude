/* Chargement des assets du jeu (public/assets/, produits par tools/build-assets.mjs).
   Le code du jeu lit ASSETS comme il lisait l'ancien bloc intégré à game.html :
   - « plagne.json » → objet du domaine reconstruit depuis les tuiles binaires (src/assets/world.ts) ;
   - ASSETS.__grids  → grilles de relief décodées (proche, lointain, horizon) ;
   - .glb (meshopt) et .ktx2 (Basis UASTC) → ArrayBuffer, décodés par le jeu (GLTFLoader, KTX2Loader).
   Un fichier manquant est simplement absent : le jeu retombe alors sur ses modèles procéduraux, comme avant. */
import manifest from './manifest.json';
import { loadWorld } from './world';

export type AssetValue = ArrayBuffer | string | Record<string, unknown>;
export const ASSETS: Record<string, AssetValue> & { __grids?: Record<string, Float32Array> } = {};

/** URL d'un asset, relative au document (fonctionne en sous-dossier, dans l'artefact et sur GitHub Pages). */
export const assetUrl = (name: string): string => new URL('assets/' + name, document.baseURI).href;

/** Binaire ; repli sur `<nom>.b64.json` (chaîne base64) pour les hébergeurs qui ne servent pas ces types,
 *  comme les artefacts claude.ai (voir tools/artifact-page.mjs). */
export async function fetchBinary(name: string): Promise<ArrayBuffer> {
  const res = await fetch(assetUrl(name));
  if (res.ok) return res.arrayBuffer();
  const alt = await fetch(assetUrl(name + '.b64.json'));
  if (!alt.ok) throw new Error(name + ' : ' + res.status + ' ' + res.statusText);
  const b64 = (await alt.json()) as string;
  const bin = atob(b64), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export interface PreloadProgress { loaded: number; total: number; bytes: number }

export async function preloadAssets(onProgress?: (p: PreloadProgress) => void): Promise<void> {
  const names = (manifest as string[]).filter((n) => !n.startsWith('world/'));
  const p: PreloadProgress = { loaded: 0, total: names.length + 1, bytes: 0 };
  const done = () => { p.loaded++; onProgress?.(p); };
  const world = loadWorld('assets/', (n) => fetchBinary(n).then((b) => { p.bytes += b.byteLength; return b; }))
    .then((w) => { if (w) { ASSETS['plagne.json'] = w.plagne; ASSETS.__grids = w.grids; } })
    .catch((e) => console.warn('Données du domaine indisponibles', e))
    .finally(done);
  await Promise.all([world, ...names.map(async (name) => {
    try { const buf = await fetchBinary(name); p.bytes += buf.byteLength; ASSETS[name] = buf; }
    catch (e) { console.warn('Asset indisponible : ' + name, e); }
    finally { done(); }
  })]);
}
