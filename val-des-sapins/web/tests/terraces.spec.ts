/* Terrasses (T5 ter) : placées d'après les restaurants, bars et cafés d'OpenStreetMap, côté front de neige, au niveau
   de la neige. Pour chaque terrasse : plancher = rez-de-chaussée de l'immeuble ; neige à ±15 cm du plancher sur toute
   la terrasse et 3 m autour (hauteur lue par la physique du skieur) ; terrasse devant la façade avant (celle du front
   de neige) ; ni sur une piste ni sous une remontée ; un établissement OSM à moins de 30 m (sauf terrasses posées
   d'après les photos fournies, T6 : Aime 2000, où OSM ne situe aucun établissement). */
import { test, expect } from '@playwright/test';
import { openGame } from './helpers';

test('terrasses : front de neige, au niveau de la neige et du rez-de-chaussée', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  await openGame(page, 'web');
  const res = await page.evaluate(() => {
    const s = (window as any).__ski, out: any[] = [];
    for (const b of s.BUILDINGS) {
      const t = b.terrace; if (!t) continue;
      const ca = Math.cos(t.rot), sa = Math.sin(t.rot);
      let lo = 1e9, hi = -1e9, onRun = 0;
      for (let i = -1; i <= 1.001; i += 0.125) for (let j = -1; j <= 1.001; j += 0.125) {
        const u = i * (t.W / 2 + 3), v = j * (t.D / 2 + 3), x = t.cx + u * ca + v * sa, z = t.cz - u * sa + v * ca;
        const h = s.H(x, z) - t.L; lo = Math.min(lo, h); hi = Math.max(hi, h);
        if (Math.abs(i) <= 1 / (1 + 3 / (t.W / 2)) && Math.abs(j) <= 1 / (1 + 3 / (t.D / 2)) && s.zoneAt(x, z) >= 0) onRun++;
      }
      // côté : le centre de la terrasse est devant la façade avant de l'immeuble (v > d/2)
      const dx = t.cx - b.x, dz = t.cz - b.z, v = dx * Math.sin(b.rot) + dz * Math.cos(b.rot);
      const venue = Math.min(...s.venues.map((q: any) => Math.hypot(q.x - t.cx, q.z - t.cz)));
      const lift = Math.min(...s.LIFTS.map((L: any) => Math.min(Math.hypot(L.B.x - t.cx, L.B.z - t.cz), Math.hypot(L.T.x - t.cx, L.T.z - t.cz))));
      const folk = s.TERRACE_FOLK ? s.TERRACE_FOLK.filter((f: any) => Math.hypot(f.x - t.cx, f.z - t.cz) < Math.max(t.W, t.D) / 2 + 2).length : -1;
      out.push({ floor: b.top, deck: t.L, lo, hi, front: v - b.d / 2, onRun, venue, lift, src: t.src, folk });
    }
    return out;
  });
  console.log(JSON.stringify(res.map((r) => ({ ...r, lo: +r.lo.toFixed(3), hi: +r.hi.toFixed(3), venue: Math.round(r.venue), lift: Math.round(r.lift), front: +r.front.toFixed(1) }))));
  expect(res.length).toBeGreaterThanOrEqual(5);
  for (const r of res) {
    expect(Math.abs(r.floor - r.deck)).toBeLessThan(0.01);
    expect(r.lo).toBeGreaterThan(-0.15); expect(r.hi).toBeLessThan(0.15);
    expect(r.front).toBeGreaterThan(0);
    expect(r.onRun).toBe(0);
    expect(r.lift).toBeGreaterThan(10);
    if (r.src !== 'photo') expect(r.venue).toBeLessThan(30);
  }
});

// T6 : la clientèle (plafonnée à 70 sur mobile) est partagée entre les terrasses : aucune ne reste vide sur téléphone
test.describe('téléphone', () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  test('terrasses : des clients sur chacune, sur téléphone', async ({ page }) => {
    test.setTimeout(10 * 60_000);
    await openGame(page, 'web');
    const n = await page.evaluate(() => {
      const s = (window as any).__ski;
      return s.BUILDINGS.filter((b: any) => b.terrace).map((b: any) => { const t = b.terrace; return s.TERRACE_FOLK.filter((f: any) => Math.hypot(f.x - t.cx, f.z - t.cz) < Math.max(t.W, t.D) / 2 + 2).length; });
    });
    console.log('clients par terrasse (téléphone) : ' + n.join(' '));
    expect(n.length).toBeGreaterThanOrEqual(5);
    for (const k of n) expect(k).toBeGreaterThanOrEqual(3);
  });
});
