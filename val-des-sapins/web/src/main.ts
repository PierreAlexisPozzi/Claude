/* Point d'entrée web de Val des Sapins.
   1. Polices (Fontsource, OFL) et feuille de style du HUD.
   2. Balisage du HUD inséré avant tout code du jeu (le jeu lit ses éléments par identifiant).
   3. Assets et sauvegarde chargés en parallèle, puis le jeu s'initialise dans l'ordre exact de game.html. */
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import './hud/hud.css';
import hudHtml from './hud/hud.html?raw';
import { initCredits } from './hud/credits';
import { preloadAssets } from './assets/loader';
import { STORE } from './storage/store';
import { runGame } from './game/index';
import { requestedProtos } from './proto/proto';

const canvas = document.getElementById('c');
if (!canvas) throw new Error('canvas #c absent');
canvas.insertAdjacentHTML('afterend', hudHtml);
initCredits();

// indicateur discret pendant le téléchargement ; le jeu reprend ensuite la main sur ce message
const loadmsg = document.getElementById('loadmsg');
const t0 = performance.now();
await Promise.all([preloadAssets((p) => { if (loadmsg) loadmsg.textContent = `Chargement des données… ${Math.round((100 * p.loaded) / p.total)} %`; }), STORE.ready()]);
(window as unknown as { __vds: Record<string, unknown> }).__vds = { STORE, assetsMs: performance.now() - t0, build: 'web' };
runGame();

// prototypes de la tranche T3 (?proto=facade,visage), chargés seulement s'ils sont demandés
const protos = requestedProtos();
if (protos.length) {
  const w = window as unknown as { __ski?: { ready: boolean }; __vds: Record<string, unknown> };
  const until = (f: () => boolean) => new Promise<void>((res) => { const t = () => (f() ? res() : setTimeout(t, 100)); t(); });
  void until(() => !!w.__ski?.ready).then(async () => {
    const [{ startProtos }, render, materials, world, assembly] = await Promise.all([import('./proto/proto'), import('./game/render'), import('./game/materials'), import('./game/world-data'), import('./game/assembly')]);
    w.__vds.protoRefresh = await startProtos(protos, { ski: w.__ski, render, materials, world, assembly });
    w.__vds.protos = protos;
  });
}

// cache hors ligne (GitHub Pages, serveur statique) ; refusé sans conséquence dans un artefact ou en local file://
if ('serviceWorker' in navigator && import.meta.env.PROD && !/[?&]nosw\b/.test(location.search)) {
  navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href).catch(() => { /* hébergeur sans service worker */ });
}
