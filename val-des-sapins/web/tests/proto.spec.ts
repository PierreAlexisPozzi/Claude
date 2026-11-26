/* Prototypes T3 (façade et terrasse, visage) : captures « après » sur les vues de référence, avec ?proto=all.
   Les captures « avant » sont celles du jeu par défaut (review/vues/T2, inchangé en T3). Planche : review/. */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openGame, pump, start, expectNoErrors, REPO } from './helpers';

const VIEWS = (JSON.parse(fs.readFileSync(path.resolve('tests/views.json'), 'utf8')) as { id: string; kind: string; from?: number[]; at?: number[]; rel?: Record<string, number> }[])
  .filter((v) => /barre|villages-residence|terrasse-plagne-centre|terrasse-aime|gros-plan-|village-plagne-centre/.test(v.id));
const ROOT = path.join(REPO, 'review/vues/T3-proto');

for (const proto of [false, true]) test(`prototypes : ${proto ? 'après (?proto=all)' : 'avant (jeu par défaut)'}`, async ({ page }) => {
  test.setTimeout(60 * 60_000);
  const OUT = path.join(ROOT, proto ? 'apres' : 'avant');
  await openGame(page, 'web', proto ? { query: 'proto=all' } : {});
  await page.evaluate(() => (window as any).__ski.quality('medium'));
  if (proto) await page.waitForFunction(() => !!(window as any).__vds.protoRefresh, null, { polling: 500, timeout: 120_000 });
  await start(page);
  await pump(page, 2);
  fs.mkdirSync(OUT, { recursive: true });
  for (const v of VIEWS) {
    await page.evaluate((v) => { const s = (window as any).__ski, T = s.THREE; s.photo(v.rel ? v.rel : { from: new T.Vector3(...v.from!), at: new T.Vector3(...v.at!) }); }, v);
    await pump(page, 1);
    await page.evaluate(() => { (window as any).__ski.nearNow(); (window as any).__vds.protoRefresh?.(); });
    await pump(page, 2);
    await page.screenshot({ path: path.join(OUT, v.id + '.jpg'), type: 'jpeg', quality: 88, timeout: 300_000 });
  }
  expect(fs.readdirSync(OUT).length).toBeGreaterThanOrEqual(VIEWS.length);
  await expectNoErrors(page);
});
