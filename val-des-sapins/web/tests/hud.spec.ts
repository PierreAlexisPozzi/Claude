/* Chevauchement du HUD à 1000×560, 390×844 et 844×390, dans plusieurs états de jeu.
   Pour chaque état, les blocs visibles du HUD (plaques, boutons tactiles) ne doivent pas se recouvrir, et les
   fenêtres (dialogue, plan, carnet) doivent tenir dans l'écran. Le même relevé est fait sur game.html :
   la version web doit donner exactement les mêmes boîtes. */
import { test, expect, type Page } from '@playwright/test';
import { openGame, pump, start, reference, trancheNum, type Target } from './helpers';

const SIZES = [
  { name: 'ordinateur 1000×560', w: 1000, h: 560, touch: false },
  { name: 'téléphone portrait 390×844', w: 390, h: 844, touch: true },
  { name: 'téléphone paysage 844×390', w: 844, h: 390, touch: true },
];

interface Box { id: string; x: number; y: number; w: number; h: number }

/** Blocs visibles : enfants directs de #hud et #touch (et des groupes tactiles), opacité > 0,1. */
const measure = (page: Page) => page.evaluate(() => {
  const vis = (el: Element) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.1) return false; const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
  const visibleChain = (el: Element | null): boolean => { for (let e = el; e && e !== document.body; e = e.parentElement) { if ((e as HTMLElement).hidden) return false; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
  const pick = [...document.querySelectorAll('#hud > :not(#toasts), #toasts > *, #touch > #util, #touch > #joyZone, #acts > .tb')];   // les toasts un par un : le conteneur est une colonne vide
  const out: { id: string; x: number; y: number; w: number; h: number }[] = [];
  for (const el of pick) {
    if (!visibleChain(el) || !vis(el)) continue;
    const r = el.getBoundingClientRect();
    out.push({ id: el.id || (el.parentElement!.id === 'toasts' ? 'toast' : el.className), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
  }
  const modal = ['dlg', 'jnl', 'mapOv'].map((id) => document.getElementById(id)!).filter((e) => !e.hidden).map((e) => { const b = (e.querySelector('.jbox, .box') || e).getBoundingClientRect(); return { id: e.id, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; });
  return { boxes: out, modal, vw: innerWidth, vh: innerHeight };
});

const overlaps = (b: Box[]) => {
  const bad: string[] = [];
  for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
    const A = b[i], B = b[j], ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x), oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
    if (ox > 1 && oy > 1) bad.push(`${A.id} × ${B.id} (${ox}×${oy})`);
  }
  return bad;
};

/** Parcourt les états et renvoie les relevés. */
async function survey(page: Page, target: Target, size: (typeof SIZES)[number]) {
  await openGame(page, target);
  await start(page);
  await pump(page, 2);
  const shots: Record<string, Awaited<ReturnType<typeof measure>>> = {};
  const settle = async () => { await page.evaluate(() => (window as any).__ski.stackHud?.()); await pump(page, 1, 0.02); };
  await settle(); shots['repos'] = await measure(page);
  await page.evaluate(() => { const s = (window as any).__ski; s.setVel(18, 0, 18); s.step(2); });
  await settle(); shots['vitesse'] = await measure(page);
  // chrono (slalom) : le pilote automatique part de la porte de départ
  await page.evaluate(() => { const s = (window as any).__ski, p = s.SLALOM.p || s.chronoPistes()[0], S = p.samples; s.teleport(S[2].x, S[2].z, Math.atan2(S[6].x - S[2].x, S[6].z - S[2].z)); s.setVel((S[6].x - S[2].x) / 2, 0, (S[6].z - S[2].z) / 2); s.step(200); });
  await settle(); shots['chrono'] = await measure(page);
  // invite d'action au pied d'une remontée
  await page.evaluate(() => { const s = (window as any).__ski, L = s.LIFTS[0]; s.teleport(L.board.x + 2, L.board.z, L.yaw); s.step(2); });
  await pump(page, 2, 0.05); await settle(); shots['remontée'] = await measure(page);
  // aide dépliée (grand écran)
  await page.evaluate(() => { const b = document.getElementById('helpT')!; if (getComputedStyle(b).display !== 'none' && b.getAttribute('aria-expanded') === 'false') b.click(); });
  await settle(); shots['aide'] = await measure(page);
  // dialogue
  await page.evaluate(() => { const s = (window as any).__ski; s.talk(s.PEOPLE[0].id); });
  await settle(); shots['dialogue'] = await measure(page);
  await page.keyboard.press('Escape'); await page.evaluate(() => { const d = document.getElementById('dlg')!; if (!d.hidden) (document.querySelector('#dlgActs button:last-child') as HTMLElement)?.click(); });
  // plan, trois onglets
  for (const t of ['pistes', 'lifts', 'carnet']) {
    await page.evaluate((t) => { if (document.getElementById('mapOv')!.hidden) document.getElementById('mapBtn')!.click(); (document.querySelector(`[data-mtab="${t}"]`) as HTMLElement).click(); }, t);
    await settle(); shots['plan · ' + t] = await measure(page);
  }
  await page.evaluate(() => document.getElementById('closeMap')!.click());
  // carnet, quatre onglets
  for (const t of ['missions', 'defis', 'chronos', 'stats']) {
    await page.evaluate((t) => { if (document.getElementById('jnl')!.hidden) (window as any).__ski.journal(true); (document.querySelector(`[data-tab="${t}"]`) as HTMLElement | null)?.click(); }, t);
    await settle(); shots['carnet · ' + t] = await measure(page);
  }
  return shots;
}

for (const size of SIZES) {
  test(`HUD sans chevauchement · ${size.name}`, async ({ browser }) => {
    const run = async (target: Target) => {
      const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, hasTouch: size.touch, isMobile: size.touch, deviceScaleFactor: 1 });
      try { return await survey(await ctx.newPage(), target, size); } finally { await ctx.close(); }
    };
    const [web, legacy] = await Promise.all([run('web'), reference('hud-' + size.w + 'x' + size.h, () => run('legacy'))]);
    const problemsOf = (shots: typeof web) => {
      const out: string[] = [];
      for (const [state, m] of Object.entries(shots)) {
        for (const o of overlaps(m.boxes)) out.push(`${state} : ${o}`);
        for (const b of m.modal) if (b.x < -1 || b.y < -1 || b.x + b.w > m.vw + 1 || b.y + b.h > m.vh + 1) out.push(`${state} : ${b.id} déborde de l'écran`);
      }
      return out;
    };
    const problems = problemsOf(web), inherited = new Set(problemsOf(legacy));
    console.log(`${size.name} : ${Object.keys(web).length} états, ${problems.length} problème(s)`);
    problems.forEach((p) => console.log('  ' + p + (inherited.has(p) ? '  [hérité de game.html]' : '')));
    // mêmes boîtes que game.html pour tout ce qui est permanent ; les messages passagers (toasts, bannière de figure)
    // ont changé en T2 (la pile de toasts ne déborde plus) et restent couverts par le contrôle de chevauchement
    const noToast = (x: typeof web) => Object.fromEntries(Object.entries(x).map(([k, m]) => [k, { ...m, boxes: m.boxes.filter((b) => b.id !== 'toast' && b.id !== 'trick') }]));
    expect(noToast(web)).toEqual(noToast(legacy));
    // T1 tolérait les défauts hérités de game.html ; à partir de T2, aucun chevauchement n'est admis
    const strict = trancheNum() >= 2;
    for (const p of problems) if (inherited.has(p) && !strict) test.info().annotations.push({ type: 'défaut hérité', description: p });
    expect(problems.filter((p) => strict || !inherited.has(p))).toEqual([]);
  });
}
