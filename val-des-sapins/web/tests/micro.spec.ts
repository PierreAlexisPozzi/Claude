/* T8 : micro-mouvements et regard, mesurés sur plusieurs images (le balancement du pompon n'avait jamais été observé en
   T7). Habitants proches de la caméra : regard dans les bornes (±20° / ±12°), saccades (le regard change), respiration
   présente et bornée. Joueur lancé en schuss : décalage du ressort (pompon, queue de cheval) non nul et au plus 3 cm,
   1 cm en vertical. */
import { test, expect } from '@playwright/test';
import { openGame, start, pump } from './helpers';

test('micro-mouvements : respiration, regard et balancement bornés et présents', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  await openGame(page, 'web');
  await page.evaluate(() => (window as any).__ski.quality('medium'));
  await start(page);
  await pump(page, 2);
  await page.evaluate(() => {
    const s = (window as any).__ski, T = s.THREE, q = s.PEOPLE.find((x: any) => x.id === 'lucie');
    const y = q.n.y + 1.6 * (q.n.h || 1);
    s.photo({ from: new T.Vector3(q.x + Math.sin(q.yaw + 0.5) * 1.2, y, q.z + Math.cos(q.yaw + 0.5) * 1.2), at: new T.Vector3(q.x, y, q.z) });
  });
  await pump(page, 4, 1 / 60);   // les personnages détaillés sont attribués au fil des images, près de la caméra
  const r = await page.evaluate(() => {
    const s = (window as any).__ski;
    const gaze: number[][] = [], breath: number[] = [];
    for (let i = 0; i < 240; i++) {   // 4 s à 60 images/s
      s.advance(1 / 60);
      for (const H of s.humanPool.list) if (H && H.parts.eyes && H.parts.eyes.visible && H.gz) { gaze.push([H.U.uGaze.value.x, H.U.uGaze.value.y]); if (typeof H.breath === 'number') breath.push(H.breath); }
    }
    // joueur : schuss puis freinage, ressort de la tête
    const P = s.P, p = s.PISTES.filter((x: any) => x.real && x.lvl === 'bleue' && x.samples && x.samples.length > 60)[0], S = p.samples, a = S[Math.floor(S.length * 0.3)], b = S[Math.floor(S.length * 0.3) + 4];
    s.teleport(a.x, a.z, Math.atan2(b.x - a.x, b.z - a.z)); s.clear();
    const sway: number[][] = [];
    s.input.up = true;
    for (let i = 0; i < 180; i++) { s.step(2); s.skierTick(1 / 60); const o = s.playerHuman.U.uSway.value; sway.push([o.length(), Math.abs(o.y)]); }
    s.clear(); s.input.down = true;
    for (let i = 0; i < 90; i++) { s.step(2); s.skierTick(1 / 60); const o = s.playerHuman.U.uSway.value; sway.push([o.length(), Math.abs(o.y)]); }
    s.clear();
    return { gaze, breath, sway, speed: P.vel.length() };
  });
  expect(r.gaze.length).toBeGreaterThan(0);
  const ys = r.gaze.map((g) => g[0]), ps = r.gaze.map((g) => g[1]);
  expect(Math.max(...ys.map(Math.abs))).toBeLessThanOrEqual(0.35 + 1e-6);
  expect(Math.max(...ps.map(Math.abs))).toBeLessThanOrEqual(0.21 + 1e-6);
  expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.02);   // saccades
  expect(Math.max(...r.breath)).toBeGreaterThan(0.005);
  expect(Math.min(...r.breath)).toBeLessThan(-0.005);
  expect(Math.max(...r.breath.map(Math.abs))).toBeLessThanOrEqual(0.024 + 1e-6);
  const sw = r.sway.map((x) => x[0]);
  console.log('balancement max', Math.max(...sw).toFixed(4), 'm ; vertical max', Math.max(...r.sway.map((x) => x[1])).toFixed(4));
  expect(Math.max(...sw)).toBeGreaterThan(0.002);
  expect(Math.max(...sw)).toBeLessThanOrEqual(0.0301 / 0.8);   // 3 cm à l'échelle du personnage (échelle ≥ 0,8)
  expect(Math.max(...r.sway.map((x) => x[1]))).toBeLessThanOrEqual(0.0101 / 0.8);
});
