/* Robot de régression : descend chaque piste et prend chaque remontée, sur la version web ET sur game.html.
   Critère de parité : mêmes résultats (pistes réussies, chutes, remontées). Le résumé est écrit dans
   test-results/robot-<cible>.json pour la planche de la tranche. */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { AUTOPILOT, openGame, expectNoErrors, reference, type Target } from './helpers';

interface PisteRes { name: string; ok: boolean; falls: number; t: number; idx: number; n: number }
interface Res { pistes: PisteRes[]; lifts: { name: string; ok: boolean }[] }

async function robot(page: import('@playwright/test').Page, target: Target): Promise<Res> {
  await openGame(page, target);
  await page.evaluate(AUTOPILOT);
  const res = await page.evaluate(() => {
    const s = (window as any).__ski, A = (window as any).__auto;
    s.unlockAll();
    const pistes = s.PISTES.filter((p: any) => !p.hidden && p.samples.length > 8).map((p: any) => {
      const r = A.runPiste(p, {});
      return { name: p.name, ok: r.ok, falls: r.falls, t: Math.round(r.t), idx: r.idx, n: r.n };
    });
    const lifts = s.LIFTS.map((L: any, i: number) => ({ name: L.name, ...A.rideLift(i) }));
    return { pistes, lifts };
  });
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync(`test-results/robot-${target}.json`, JSON.stringify(res, null, 1));
  await expectNoErrors(page);
  return res;
}

test('robot : pistes et remontées (web) identiques à game.html', async ({ browser }) => {
  const run = async (t: Target) => { const ctx = await browser.newContext(); try { return await robot(await ctx.newPage(), t); } finally { await ctx.close(); } };
  const [a, b] = await Promise.all([run('web'), reference('robot', () => run('legacy'))]);
  const okA = a.pistes.filter((p) => p.ok).length, okB = b.pistes.filter((p) => p.ok).length;
  console.log(`web : ${okA}/${a.pistes.length} pistes, ${a.pistes.reduce((s, p) => s + p.falls, 0)} chutes, ${a.lifts.filter((l) => l.ok).length}/${a.lifts.length} remontées`);
  console.log(`game.html : ${okB}/${b.pistes.length} pistes, ${b.pistes.reduce((s, p) => s + p.falls, 0)} chutes, ${b.lifts.filter((l) => l.ok).length}/${b.lifts.length} remontées`);
  expect(a).toEqual(b);                                    // parité stricte, piste par piste
  expect(a.lifts.every((l) => l.ok)).toBe(true);           // les 17 remontées fonctionnent
  expect(okA / a.pistes.length).toBeGreaterThan(0.9);      // garde-fou : le robot descend l'essentiel des pistes
});
