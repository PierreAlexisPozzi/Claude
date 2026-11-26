/* Performances : appels de dessin, triangles, temps de frame (rendu logiciel, indicatif) et temps jusqu'à l'état
   jouable, à Plagne Centre en qualité Moyenne, sur ordinateur et sur tactile ; comparaison avec game.html.
   Plafonds : ~1 700 appels de dessin sur ordinateur, ~400 sur tactile. */
import { test, expect, type Browser } from '@playwright/test';
import fs from 'node:fs';
import { openGame, pump, start, type Target } from './helpers';

async function measure(browser: Browser, target: Target, touch: boolean) {
  const ctx = await browser.newContext(touch ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { viewport: { width: 1000, height: 560 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const readyMs = await openGame(page, target);
  await page.evaluate(() => (window as any).__ski.quality('medium'));
  await start(page);
  // au cœur de Plagne Centre, caméra de jeu derrière le skieur
  await page.evaluate(() => { const s = (window as any).__ski, v = s.villageLabels.find((q: any) => q.name === 'Plagne Centre'); s.teleport(v.x + 40, v.z + 60, Math.PI); s.camNow(); s.nearNow(); });
  await pump(page, 3);
  const info = await page.evaluate(() => ({ ...(window as any).__ski.renderInfo(), touch: document.body.classList.contains('touch'), q: document.getElementById('qualBtn')!.textContent }));
  const frames = await page.evaluate(() => { const t: number[] = []; for (let i = 0; i < 6; i++) { const rn = (window as any).__realNow, a = rn(); (window as any).__pump(1); t.push(rn() - a); } t.sort((a, b) => a - b); return { median: t[3], max: t[5] }; });
  const heap = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? null);
  await ctx.close();
  return { readyMs, touch: info.touch, q: info.q, calls: info.calls, tris: info.tris, geos: info.geos, frameMs: Math.round(frames.median), heapMB: heap ? Math.round(heap / 1e6) : null };
}

test('performances à Plagne Centre (Moyenne) : web vs game.html', async ({ browser }) => {
  const res: Record<string, unknown> = {};
  for (const touch of [false, true]) for (const t of ['web', 'legacy'] as Target[]) res[`${t}-${touch ? 'tactile' : 'ordinateur'}`] = await measure(browser, t, touch);
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/perf.json', JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  const w = res['web-ordinateur'] as any, l = res['legacy-ordinateur'] as any, wt = res['web-tactile'] as any, lt = res['legacy-tactile'] as any;
  // Plafonds de la consigne. game.html les dépasse déjà à ce point de mesure (cœur du village, tous les bâtiments
  // proches assemblés) : en T1 (parité) on les relève sans bloquer ; ils deviennent bloquants à partir de T4.
  const strict = (process.env.VDS_TRANCHE ?? 'T1') !== 'T1';
  for (const [k, v, cap] of [['ordinateur', w.calls, 1700], ['tactile', wt.calls, 400]] as const) {
    if (v > cap) test.info().annotations.push({ type: 'plafond dépassé', description: `${k} : ${v} appels de dessin (plafond ${cap})` });
    if (strict) expect(v, k).toBeLessThanOrEqual(cap);
  }
  // parité : même scène, donc mêmes appels de dessin et triangles
  expect([w.calls, w.tris, wt.calls, wt.tris]).toEqual([l.calls, l.tris, lt.calls, lt.tris]);
});
