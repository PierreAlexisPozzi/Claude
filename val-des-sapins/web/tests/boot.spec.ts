/* Démarrage : état jouable atteint sans erreur, contrat d'identifiants du HUD, crédits visibles, parité de l'état
   initial avec game.html (même position de départ, mêmes pistes, remontées et bâtiments). */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openGame, expectNoErrors, pump, start } from './helpers';

const SRC = path.resolve('src/game');

test('démarrage : état jouable, aucune erreur, contrat d\'identifiants', async ({ page }) => {
  const ms = await openGame(page, 'web');
  console.log(`état jouable en ${ms} ms (rAF piloté)`);
  await expectNoErrors(page);
  // contrat : tout identifiant lu par le code existe dans le HUD
  const ids = new Set<string>();
  for (const f of fs.readdirSync(SRC)) for (const m of fs.readFileSync(path.join(SRC, f), 'utf8').matchAll(/\$\('([\w-]+)'\)/g)) ids.add(m[1]);
  expect(ids.size).toBeGreaterThan(60);
  const missing = await page.evaluate((list) => list.filter((id) => !document.getElementById(id)), [...ids]);
  expect(missing).toEqual([]);
  // attribution des données visible sur l'écran d'accueil (pas derrière un onglet)
  await expect(page.locator('#credits')).toBeVisible();
  await expect(page.locator('#credits')).toContainText(/OpenStreetMap/);
  await expect(page.locator('#go')).toBeEnabled();
  await start(page);
  await pump(page, 3);
  await expect(page.locator('#hud')).not.toHaveAttribute('hidden');
  await expect(page.locator('#spd')).toBeVisible();
  await expectNoErrors(page);
});

test('parité : état initial identique à game.html', async ({ browser }) => {
  const snap = async (target: 'web' | 'legacy') => {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 560 } });
    const page = await ctx.newPage();
    await openGame(page, target);
    await start(page);
    await pump(page, 4);
    const s = await page.evaluate(() => {
      const k = (window as any).__ski;
      const r6 = (v: number) => Math.round(v * 1e6) / 1e6;
      k.step(240);   // 2 s de simulation sans commande
      return {
        pos: k.P.pos.toArray().map(r6), yaw: r6(k.P.yaw), state: k.P.state,
        pistes: k.PISTES.length, lifts: k.LIFTS.map((L: any) => L.name), buildings: k.BUILDINGS?.length ?? null,
        trees: k.trees?.length ?? null, people: k.PEOPLE.map((p: any) => p.id), missions: k.MISSIONS.map((m: any) => m.id),
        ri: k.renderInfo(), credits: document.getElementById('credits')!.textContent, facts: document.getElementById('facts')!.textContent,
      };
    });
    await ctx.close();
    return s;
  };
  const [w, l] = [await snap('web'), await snap('legacy')];
  console.log('web', JSON.stringify(w.ri), 'legacy', JSON.stringify(l.ri));
  expect(w).toEqual(l);
});
