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
import { preloadAssets } from './assets/loader';
import { STORE } from './storage/store';
import { runGame } from './game/index';

const canvas = document.getElementById('c');
if (!canvas) throw new Error('canvas #c absent');
canvas.insertAdjacentHTML('afterend', hudHtml);

const t0 = performance.now();
await Promise.all([preloadAssets(), STORE.ready()]);
(window as unknown as { __vds: Record<string, unknown> }).__vds = { STORE, assetsMs: performance.now() - t0, build: 'web' };
runGame();
