/* Le France (T6) : l'immeuble de Plagne Centre sous lequel passe la piste Boulevard. Deux ailes au sol et une section
   en pont : le passage suit l'emprise de la piste (grille des zones de piste) ; sous le pont, au moins 6 m de hauteur
   libre au-dessus de la neige, aucun obstacle de collision sur la piste, et des ailes hors de toute piste. */
import { test, expect } from '@playwright/test';
import { openGame } from './helpers';

test('Le France : la piste Boulevard passe sous l\'immeuble', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  await openGame(page, 'web');
  const r = await page.evaluate(() => {
    const s = (window as any).__ski, F = s.LE_FRANCE;
    if (!F) return null;
    const parts = s.BUILDINGS.filter((b: any) => b.wing || b.bridge), br = parts.find((b: any) => b.bridge);
    const ca = Math.cos(F.rot), sa = Math.sin(F.rot);
    let onRun = 0, blocked = 0, minClear = 1e9;
    for (let u = F.p0; u <= F.p1; u += 1) for (let v = -F.d / 2; v <= F.d / 2; v += 1) {
      const x = F.x + u * ca + v * sa, z = F.z - u * sa + v * ca;
      minClear = Math.min(minClear, br.top - s.H(x, z));
      if (s.zoneAt(x, z) < 0) continue;
      onRun++; if (s.obstacleList.some((o: any) => Math.hypot(o.x - x, o.z - z) < o.r)) blocked++;
    }
    let wingOnRun = 0;
    for (const b of parts.filter((q: any) => q.wing)) { const c = Math.cos(b.rot), sn = Math.sin(b.rot); for (let u = -b.w / 2; u <= b.w / 2; u += 1) for (let v = -b.d / 2; v <= b.d / 2; v += 1) if (s.zoneAt(b.x + u * c + v * sn, b.z - u * sn + v * c) >= 0) wingOnRun++; }
    return { piste: F.piste, wingOnRun, wings: parts.filter((b: any) => b.wing).length, bridges: parts.filter((b: any) => b.bridge).length, span: +(F.p1 - F.p0).toFixed(1), clear: +minClear.toFixed(2), onRun, blocked, floors: parts.map((b: any) => b.floors) };
  });
  console.log(JSON.stringify(r));
  expect(r).not.toBeNull();
  expect(r!.wings).toBe(2);
  expect(r!.bridges).toBe(1);
  expect(r!.onRun).toBeGreaterThan(20);
  expect(r!.blocked).toBe(0);
  expect(r!.wingOnRun).toBe(0);   // les ailes ne mordent sur aucune piste
  expect(r!.clear).toBeGreaterThan(6);
});
