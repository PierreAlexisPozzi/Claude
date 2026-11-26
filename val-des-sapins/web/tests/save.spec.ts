/* Sauvegarde : migration des sauvegardes de game.html (localStorage) vers IndexedDB sans perte, persistance,
   reprise d'une écriture plus récente de l'ancienne version, stockage bloqué sans erreur. */
import { test, expect, type Page } from '@playwright/test';
import { openGame, expectNoErrors } from './helpers';

// sauvegarde de niveau 7 telle que l'écrit game.html, avec un fantôme
const RIDER = JSON.stringify({ xp: 5200, stats: { vmax: 23.4, vert: 4100, powder: 900, pistes: ['Mira', 'Gavotte'], bestTrick: 540, tricks: 31, air: 12, rails: 4, butter: 7, golds: 1 }, tiers: { vitesse: 1 }, runs: { Mira: { best: 201.3, medal: 1 } }, missions: { belvedere: 'done' }, active: null, legacyLifts: [] });
const GHOSTS = JSON.stringify({ Mira: { n: 693, t: 201.3, f: [1, 2, 3, 0], it: [0] } });

const idbDump = (page: Page) => page.evaluate(() => new Promise<Record<string, string>>((res) => {
  const r = indexedDB.open('valdessapins', 1);
  r.onsuccess = () => {
    const tx = r.result.transaction('kv', 'readonly'), s = tx.objectStore('kv'), out: Record<string, string> = {};
    const c = s.openCursor();
    c.onsuccess = () => { const cur = c.result; if (cur) { out[String(cur.key)] = (cur.value as { value: string }).value; cur.continue(); } else res(out); };
  };
}));

test('migration localStorage → IndexedDB : rien n\'est perdu', async ({ page }) => {
  // l'origine doit être celle du jeu : on y prépare la sauvegarde avant le chargement
  await page.goto('http://localhost:4173/assets/plagne.json');   // même origine, sans démarrer le jeu
  await page.evaluate(([r, g]) => { localStorage.setItem('valdessapins.rider', r); localStorage.setItem('valdessapins.ghosts', g); localStorage.setItem('valdessapins.quality', 'high'); }, [RIDER, GHOSTS]);
  await openGame(page, 'web');
  const st = await page.evaluate(() => { const k = (window as any).__ski; return { xp: k.RIDER.xp, lvl: k.riderLevel(), ghost: k.GHOSTS.Mira?.t, q: document.getElementById('qualBtn')!.textContent, log: (window as any).__vds.STORE.log, backend: (window as any).__vds.STORE.backendName }; });
  console.log(st.log.join(' | '));
  expect(st.backend).toBe('indexeddb');
  expect(st.xp).toBe(5200);
  expect(st.ghost).toBe(201.3);
  expect(st.q).toContain('Haute');
  const db = await idbDump(page);
  expect(JSON.parse(db['valdessapins.rider']).xp).toBe(5200);
  expect(db['valdessapins.ghosts']).toBe(GHOSTS);
  expect(JSON.parse(db['valdessapins.__schema']).version).toBe(1);
  // l'original n'est jamais effacé
  expect(await page.evaluate(() => localStorage.getItem('valdessapins.ghosts'))).toBe(GHOSTS);

  // une écriture du jeu est persistée (IndexedDB + miroir localStorage) et survit au rechargement
  await page.evaluate(async () => { const k = (window as any).__ski; k.RIDER.xp += 100; k.saveRider(); await (window as any).__vds.STORE.flush(); });
  expect(JSON.parse((await idbDump(page))['valdessapins.rider']).xp).toBe(5300);
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('valdessapins.rider')))!).xp).toBe(5300);
  await page.reload();
  await page.waitForFunction(() => (window as any).__ski?.ready, null, { polling: 500, timeout: 300_000 });
  expect(await page.evaluate(() => (window as any).__ski.RIDER.xp)).toBe(5300);

  // l'ancienne version (game.html) écrit après nous : sa valeur plus récente est reprise
  await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('valdessapins.rider')!); r.xp = 6000; localStorage.setItem('valdessapins.rider', JSON.stringify(r)); });
  await page.reload();
  await page.waitForFunction(() => (window as any).__ski?.ready, null, { polling: 500, timeout: 300_000 });
  expect(await page.evaluate(() => (window as any).__ski.RIDER.xp)).toBe(6000);
  await expectNoErrors(page);
});

test('stockage bloqué (IndexedDB et localStorage) : aucune erreur, la partie dure la visite', async ({ page }) => {
  await openGame(page, 'web', {
    before: () => {
      Object.defineProperty(window, 'indexedDB', { get() { throw new Error('bloqué'); } });
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqué'); } });
    },
  });
  const st = await page.evaluate(async () => { const k = (window as any).__ski; k.RIDER.xp = 42; k.saveRider(); await (window as any).__vds.STORE.flush(); return { b: (window as any).__vds.STORE.backendName, xp: k.RIDER.xp }; });
  expect(st).toEqual({ b: 'memory', xp: 42 });
  await expectNoErrors(page);
});
