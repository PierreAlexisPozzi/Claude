/* Service worker : après une première visite, le jeu redémarre hors ligne depuis le cache. */
import { test, expect } from '@playwright/test';
import { openGame, expectNoErrors } from './helpers';

test.use({ serviceWorkers: 'allow' });

test('hors ligne après une première visite (service worker)', async ({ page, context }) => {
  await openGame(page, 'web');
  await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true), null, { polling: 500, timeout: 60_000 });
  // deuxième chargement : le service worker contrôle la page et remplit le cache
  await page.reload();
  await page.waitForFunction(() => (window as any).__ski?.ready === true && !!navigator.serviceWorker.controller, null, { polling: 500, timeout: 300_000 });
  const cached = await page.evaluate(async () => { const k = await caches.open((await caches.keys()).find((n) => n.startsWith('vds-'))!); return (await k.keys()).map((r) => new URL(r.url).pathname); });
  expect(cached.some((p) => p.endsWith('.ktx2'))).toBe(true);
  expect(cached.some((p) => /world\/h_near_/.test(p))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => (window as any).__ski?.ready === true, null, { polling: 500, timeout: 300_000 });
  expect(await page.evaluate(() => (window as any).__ski.PISTES.length)).toBeGreaterThan(100);
  await expectNoErrors(page);
  await context.setOffline(false);
});
