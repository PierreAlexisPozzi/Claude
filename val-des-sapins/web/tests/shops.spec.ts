/* Commerces (T6) : référencés d'après OpenStreetMap (tools/osm_shops.py, review/commerces_osm.md), placés sur la façade
   la plus proche de l'immeuble qui les contient ; logements ailleurs. Les huit commerçants du jeu tiennent chacun un de
   ces commerces réels (de leur type, ou d'un type voisin), dans leur village. */
import { test, expect } from '@playwright/test';
import { openGame } from './helpers';

test('commerces : aux emplacements d\'OpenStreetMap, commerçants devant un commerce réel', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  await openGame(page, 'web');
  const r = await page.evaluate(() => {
    const s = (window as any).__ski, all = s.shops, placed = new Set<number>();
    let withShops = 0, without = 0;
    for (const b of s.BUILDINGS) if (b.shopList) { if (b.shopList.length) withShops++; else without++; for (const q of b.shopList) placed.add(q.i); }
    const byKind: Record<number, [number, number]> = {};
    all.forEach((q: any, i: number) => { const e = byKind[q.k] || (byKind[q.k] = [0, 0]); e[0]++; if (placed.has(i)) e[1]++; });
    const merchants = s.PEOPLE.filter((d: any) => d.shop !== undefined).map((d: any) => ({ id: d.id, shop: d.shop, osm: d.osmShop, x: Math.round(d.x), z: Math.round(d.z), near: d.near }));
    return { total: all.length, placed: placed.size, withShops, without, byKind, merchants };
  });
  console.log(JSON.stringify(r));
  expect(r.total).toBeGreaterThan(100);
  expect(r.placed / r.total).toBeGreaterThan(0.5);
  expect(r.without).toBeGreaterThan(r.withShops);   // la plupart des immeubles : logements au rez-de-chaussée
  for (const m of r.merchants) expect(m.osm, m.id).not.toBeUndefined();
});
