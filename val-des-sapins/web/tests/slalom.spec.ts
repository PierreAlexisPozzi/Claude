/* Slalom du Stade Jean-Luc Crétier : 38 portes ; le fantôme de Bastien est proposé dès la première descente ;
   une descente droit dans la pente manque les portes et prend les pénalités. Même résultat que game.html. */
import { test, expect, type Page } from '@playwright/test';
import { AUTOPILOT, openGame, expectNoErrors, reference, type Target } from './helpers';

async function slalom(page: Page, target: Target) {
  await openGame(page, target);
  await page.evaluate(AUTOPILOT);
  return page.evaluate(() => {
    const s = (window as any).__ski, A = (window as any).__auto, P = s.P, G = s.SLALOM.gates, S = s.SLALOM.p.samples;
    const out: Record<string, unknown> = { gates: G.length, ghost: s.GHOSTS[s.SLALOM.p.name]?.who ?? null };
    // 1) descente propre : on vise le centre de chaque porte, puis le bas de la piste
    s.teleport(S[2].x, S[2].z, Math.atan2(S[6].x - S[2].x, S[6].z - S[2].z)); s.clear();
    let t = 0, gi = 0, gates = 0, miss = 0, started = false;
    while (t < 240) {
      const c = s.chrono;
      if (c) { started = true; gi = c.gate; gates = c.gate; miss = c.miss; }
      else if (started) break;
      const tg = gi < G.length ? G[gi] : S[S.length - 1];
      const ahead = gi < G.length ? { x: tg.x + tg.tx * 2, z: tg.z + tg.tz * 2 } : tg;
      A.steerTo(ahead.x, ahead.z, 48, 1);
      s.stepSim(s.STEP); t += s.STEP;
    }
    out.clean = { gates, miss, started, best: s.RIDER.runs[s.SLALOM.p.name]?.best ?? null };
    // 2) droit dans la pente : portes manquées et pénalités
    s.teleport(S[2].x, S[2].z, Math.atan2(S[6].x - S[2].x, S[6].z - S[2].z)); s.clear(); t = 0; started = false;
    let m2 = 0;
    for (let k = 0; k < 300; k++) s.stepSim(s.STEP);   // laisse passer le délai entre deux chronos
    s.teleport(S[2].x, S[2].z, Math.atan2(S[6].x - S[2].x, S[6].z - S[2].z));
    while (t < 240) {
      const c = s.chrono; if (c) { started = true; m2 = c.miss; } else if (started) break;
      const i = Math.min(S.length - 1, s.SLALOM.p.samples.findIndex((q: any) => Math.hypot(q.x - P.pos.x, q.z - P.pos.z) < 15) + 4);
      A.steerTo(S[i].x, S[i].z, 60, 1); s.stepSim(s.STEP); t += s.STEP;
    }
    out.straight = { miss: m2, started };
    return out;
  });
}

test('slalom : portes, pénalités, fantôme — parité avec game.html', async ({ browser }) => {
  const run = async (t: Target) => { const ctx = await browser.newContext(); try { const p = await ctx.newPage(); const r = await slalom(p, t); await expectNoErrors(p); return r; } finally { await ctx.close(); } };
  const web = await run('web');
  console.log(JSON.stringify(web));
  expect(web.gates).toBe(38);
  expect((web.clean as any).started).toBe(true);
  expect((web.straight as any).miss).toBeGreaterThan(5);
  expect(web).toEqual(await reference('slalom', () => run('legacy')));
});
