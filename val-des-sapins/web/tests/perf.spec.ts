/* Performances : appels de dessin, triangles, temps de frame (rendu logiciel, indicatif) et temps jusqu'à l'état
   jouable, à Plagne Centre en qualité Moyenne, sur ordinateur et sur tactile ; comparaison avec game.html.
   Plafonds : ~1 700 appels de dessin sur ordinateur, ~400 sur tactile. */
import { test, expect, type Browser } from '@playwright/test';
import fs from 'node:fs';
import { openGame, pump, start, reference, trancheNum, type Target } from './helpers';

async function measure(browser: Browser, target: Target, touch: boolean, quality = 'medium') {
  const ctx = await browser.newContext(touch ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : { viewport: { width: 1000, height: 560 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const readyMs = await openGame(page, target);
  await page.evaluate((q) => (window as any).__ski.quality(q), quality);
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

test('performances à Plagne Centre (Moyenne) : plafonds, et comparaison avec la référence figée', async ({ browser }) => {
  test.setTimeout(30 * 60_000);
  const res: Record<string, unknown> = {};
  for (const touch of [false, true]) {
    const k = touch ? 'tactile' : 'ordinateur';
    res[`web-${k}`] = await measure(browser, 'web', touch);
    res[`legacy-${k}`] = await reference('perf-' + k, () => measure(browser, 'legacy', touch));
  }
  // T4 : les autres préréglages, pour le tableau des mesures (sans plafond : Haute et Ultra peuvent le dépasser)
  if (trancheNum() >= 4) for (const q of ['low', 'high', 'ultra']) for (const touch of [false, true]) {
    const r = await measure(browser, 'web', touch, q).catch(() => null);
    if (r) res[`web-${touch ? 'tactile' : 'ordinateur'}-${q}`] = r;
  }
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/perf.json', JSON.stringify(res, null, 1));
  console.log(JSON.stringify(res, null, 1));
  const w = res['web-ordinateur'] as any, l = res['legacy-ordinateur'] as any, wt = res['web-tactile'] as any, lt = res['legacy-tactile'] as any;
  // Plafonds de la consigne. game.html les dépassait à ce point de mesure (cœur du village, tous les bâtiments
  // proches assemblés) : relevés sans bloquer jusqu'en T3, bloquants à partir de T4 (regroupement des appels, batch.ts).
  const strict = trancheNum() >= 4;
  for (const [k, v, cap] of [['ordinateur', w.calls, 1700], ['tactile', wt.calls, 400]] as const) {
    if (v > cap) test.info().annotations.push({ type: 'plafond dépassé', description: `${k} : ${v} appels de dessin (plafond ${cap})` });
    if (strict) expect(v, k).toBeLessThanOrEqual(cap);
  }
  // jusqu'en T3 (parité), même scène que game.html : mêmes appels de dessin et triangles ; ensuite, seulement moins d'appels
  if (strict) { expect(w.calls).toBeLessThan(l.calls); expect(wt.calls).toBeLessThan(lt.calls); }
  else expect([w.calls, w.tris, wt.calls, wt.tris]).toEqual([l.calls, l.tris, lt.calls, lt.tris]);
});
