/* Aime 2000 (T6, d'après les photos fournies : vue aérienne et vue du front de neige) : la neige arrive au
   rez-de-chaussée sur la façade côté pistes.
   - Paquebot : pour chaque module et chacun de ses six paliers de commerces, neige au niveau du plancher du palier
     (± TOL) entre 0,5 et 3 m de la façade, au milieu du palier ;
   - autres immeubles d'Aime 2000 qui ont un replat : neige au niveau du rez-de-chaussée (± TOL) devant au moins la moitié
     de la façade (le replat s'arrête là où le relief s'écarte de plus de 2,5 m : bout de façade en pente) ;
   - au moins une terrasse posée d'après les photos (son niveau est contrôlé par terraces.spec). */
import { test, expect } from '@playwright/test';
import { openGame } from './helpers';

const TOL = Number(process.env.VDS_AIME_TOL ?? 0.35);

test('Aime 2000 : neige au niveau du rez-de-chaussée côté pistes', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  await openGame(page, 'web');
  const r = await page.evaluate(() => {
    const s = (window as any).__ski, paq: any[] = [], fronts: any[] = [];
    let decks = 0;
    const span = (b: any, y: number, u0: number, u1: number, v0: number, v1: number) => {
      const ca = Math.cos(b.rot), sa = Math.sin(b.rot); let lo = 1e9, hi = -1e9;
      for (let u = u0; u <= u1 + 1e-6; u += (u1 - u0) / 4) for (let v = v0; v <= v1 + 1e-6; v += 0.5) {
        const h = s.H(b.x + u * ca + v * sa, b.z - u * sa + v * ca) - y; lo = Math.min(lo, h); hi = Math.max(hi, h);
      }
      return { lo: +lo.toFixed(3), hi: +hi.toFixed(3) };
    };
    for (const b of s.BUILDINGS) {
      if (b.type !== 'paquebot' || !b.gfl) continue;
      const np = b.gfl.length;
      b.gfl.forEach((y: number, k: number) => paq.push({ y, ...span(b, y, -b.w / 2 + (k + 0.25) * b.w / np, -b.w / 2 + (k + 0.75) * b.w / np, b.d / 2 + 0.5, b.d / 2 + 3) }));
      if (b.terrace && b.terrace.src === 'photo') decks++;
    }
    for (const f of s.FRONTS) {
      const ca = Math.cos(f.rot), sa = Math.sin(f.rot); let n = 0, ok = 0;
      for (let u = -f.w / 2 + 1; u <= f.w / 2 - 1; u += 1) for (let v = f.d / 2 + 0.5; v <= f.d / 2 + 4; v += 0.5) { n++; if (Math.abs(s.H(f.x + u * ca + v * sa, f.z - u * sa + v * ca) - f.top) < 0.35) ok++; }
      fronts.push({ x: Math.round(f.x), z: Math.round(f.z), y: f.top, within: +(ok / n).toFixed(2) });
    }
    return { paq, fronts, decks, why: s.FRONTS.why, twhy: s.TERRACES.why };
  });
  console.log(JSON.stringify(r));
  expect(r.paq.length).toBeGreaterThanOrEqual(30);
  expect(r.decks).toBeGreaterThanOrEqual(1);
  for (const p of r.paq) { expect(p.lo).toBeGreaterThan(-TOL); expect(p.hi).toBeLessThan(TOL); }
  for (const f of r.fronts) expect(f.within).toBeGreaterThanOrEqual(0.5);
});
