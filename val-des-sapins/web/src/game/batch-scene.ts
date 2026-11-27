// @ts-nocheck — module écrit en T4 ; typage strict progressif à venir.
/* Dernière étape du démarrage (T4) : regroupe ce qui ne bouge plus, une fois tout le domaine construit.
   - coques des bâtiments fusionnées par cellule et matière, masquables bâtiment par bâtiment ;
   - câbles des remontées et éléments du snowpark fusionnés ;
   - mobilier versé dans une réserve d'instances (montré / caché selon la distance) ;
   - pièces rigides du skieur (skis, chaussures, bâtons) fusionnées par matière dans chaque articulation.
   Les gares et les pylônes détaillés sont versés dans leurs réserves au moment où ils sont construits (lifts.ts),
   les bâtiments détaillés à la volée (assembly.ts). */
import { BUILDINGS, FURN } from './assembly';
import { POOLS, mergeChildren, mergeShells, mergeStatic, setShellHidden } from './batch';
import { skier } from './humans';
import { SMALL_LAYER, scene } from './render';

export { POOLS };
export const BATCH = { shells: 0, merged: null, skier: 0, furniture: 0 };

export function batchScene() {
  BATCH.shells = mergeShells(BUILDINGS);
  for (const b of BUILDINGS) if (b.detail) setShellHidden(b, true);   // déjà assemblé (et versé dans sa réserve) avant la fusion
  BATCH.merged = mergeStatic(scene.children.filter(o => o.userData.merge));
  for (const g of FURN) {
    if (!g.userData.small) { g.traverse(o => o.layers.set(SMALL_LAYER)); g.userData.small = true; }
    g.userData.h = POOLS.furniture.add(g, g.visible); BATCH.furniture++;
  }
  if (skier) skier.root.traverse(o => { if (o.isGroup || o === skier.root) BATCH.skier += mergeChildren(o); });
}
