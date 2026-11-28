/* Têtes proches (T7) : à moins de 8 m de la caméra, le visage, les yeux et le bonnet prennent leur version subdivisée
   (passe de Loop : 4 fois plus de triangles par passe), avec les cinq expressions et des poids de peau valides. Depuis
   la reprise du style (T7) : cheveux sculptés et mèches avec les deux équipements, tour de cou avec le casque seulement. */
import { test, expect } from '@playwright/test';
import { openGame, start, pump } from './helpers';

test('têtes proches : maillage subdivisé, expressions et poids gardés, cheveux toujours visibles, tour de cou avec le casque', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  await openGame(page, 'web');
  await page.evaluate(() => (window as any).__ski.quality('medium'));
  await start(page);
  // caméra à 60 cm du visage de Lucie (comme les vues de visage), puis quelques images
  const r0 = await page.evaluate(() => {
    const s = (window as any).__ski, T = s.THREE, q = s.PEOPLE.find((x: any) => x.id === 'lucie'); if (!q) return false;
    const y = q.n.y + 1.6 * (q.n.h || 1);
    s.photo({ from: new T.Vector3(q.x + Math.sin(q.yaw) * 0.62, y, q.z + Math.cos(q.yaw) * 0.62), at: new T.Vector3(q.x, y, q.z) });
    return true;
  });
  expect(r0).toBe(true);
  await pump(page, 4, 1 / 60);
  const r = await page.evaluate(() => {
    const s = (window as any).__ski, out: any[] = [];
    for (const H of [...s.humanPool.list, s.playerHuman].filter(Boolean)) {
      if (!H.faceHi) continue;
      const F = H.parts.face.geometry, lo = H.lo.face, sw = F.attributes.skinWeight;
      let bad = 0; for (let i = 0; i < sw.count; i++) { const t = sw.getX(i) + sw.getY(i) + sw.getZ(i) + sw.getW(i); if (!(Math.abs(t - 1) < 1e-3)) bad++; }
      let bad0 = 0; const s0 = lo.attributes.skinWeight; for (let i = 0; i < s0.count; i++) { const t = s0.getX(i) + s0.getY(i) + s0.getZ(i) + s0.getW(i); if (!(Math.abs(t - 1) < 1e-3)) bad0++; }
      let nan = 0; const P = F.attributes.position.array; for (let i = 0; i < P.length; i++) if (!Number.isFinite(P[i])) nan++;
      out.push({ tri: F.index.count / 3, tri0: lo.index.count / 3, morphs: (F.morphAttributes.position || []).length, morphs0: (lo.morphAttributes.position || []).length, bad, bad0, nan, gear: H.gear, hair: H.parts.hair ? H.parts.hair.visible : null, gaiter: H.parts.gaiter ? H.parts.gaiter.visible : null });
    }
    return out;
  });
  console.log(JSON.stringify(r));
  expect(r.length).toBeGreaterThan(0);
  for (const h of r) {
    expect(h.tri).toBe(h.tri0 * 4);
    expect(h.morphs).toBe(h.morphs0);
    expect(h.morphs).toBeGreaterThanOrEqual(5);
    expect(h.bad).toBe(0);
    expect(h.nan).toBe(0);
    expect(h.hair).toBe(true);   // mèches sous le bonnet comme sous le casque (freeride)
    expect(h.gaiter).toBe(h.gear === 'helmet');
  }
});
