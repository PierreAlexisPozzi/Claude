/* Chargement des assets du jeu, rangés en fichiers dans public/assets/ (auparavant intégrés en base64 dans game.html).
   Le code du jeu lit ASSETS comme il lisait l'ancien bloc intégré :
   - .json → objet décodé ;
   - .bin / .glb → ArrayBuffer ;
   - images → URL relative (décodée par le navigateur, mise en cache HTTP).
   Un fichier manquant est simplement absent : le jeu retombe alors sur ses modèles procéduraux, comme avant. */
import manifest from './manifest.json';

export type AssetValue = ArrayBuffer | string | Record<string, unknown>;
export const ASSETS: Record<string, AssetValue> = {};

/** URL d'un asset, relative au document (fonctionne en sous-dossier, dans l'artefact et sur GitHub Pages). */
export const assetUrl = (name: string): string => new URL('assets/' + name, document.baseURI).href;

export interface PreloadProgress { loaded: number; total: number; bytes: number }

export async function preloadAssets(onProgress?: (p: PreloadProgress) => void): Promise<void> {
  const names = manifest as string[];
  const p: PreloadProgress = { loaded: 0, total: names.length, bytes: 0 };
  await Promise.all(names.map(async (name) => {
    try {
      const url = assetUrl(name);
      if (/\.(png|jpe?g|webp|ktx2)$/i.test(name)) {
        ASSETS[name] = url;   // l'image se charge et se décode dans le jeu (Image.decode), comme l'ancien data: URI
      } else {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
        if (name.endsWith('.json')) ASSETS[name] = (await res.json()) as Record<string, unknown>;
        else { const buf = await res.arrayBuffer(); p.bytes += buf.byteLength; ASSETS[name] = buf; }
      }
    } catch (e) {
      console.warn('Asset indisponible : ' + name, e);
    } finally {
      p.loaded++;
      onProgress?.(p);
    }
  }));
}
