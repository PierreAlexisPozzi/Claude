/* VUES DE RÉFÉRENCE GRAPHIQUES : caméras fixes (tests/views.json : façades, terrasses, gros plans de visages,
   village, paysage), capturées à chaque tranche dans review/vues/<tranche>/<cible>/ (ordinateur et téléphone).
   En T1 (migration à parité), chaque vue web est comparée pixel à pixel à game.html. */
import { test, expect, type Page, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openGame, pump, start, REPO, type Target } from './helpers';

const VIEWS = JSON.parse(fs.readFileSync(path.resolve('tests/views.json'), 'utf8')) as { id: string; kind: string; from?: number[]; at?: number[]; rel?: Record<string, number> }[];
const TRANCHE = process.env.VDS_TRANCHE ?? 'T1';
const OUT = path.join(REPO, 'review/vues', TRANCHE);
const PHONE_KINDS = new Set(['terrasse', 'village', 'joueur']);

async function shoot(page: Page, v: (typeof VIEWS)[number], file: string): Promise<void> {
  await page.evaluate((v) => {
    const s = (window as any).__ski, T = s.THREE;
    s.photo(v.rel ? v.rel : { from: new T.Vector3(...v.from!), at: new T.Vector3(...v.at!) });
  }, v);
  await pump(page, 1, 1 / 60);
  await page.evaluate(() => (window as any).__ski.nearNow());
  await pump(page, 2, 1 / 60);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, timeout: 300_000, type: 'jpeg', quality: 88 });
}

async function capture(browser: Browser, target: Target, phone: boolean): Promise<string[]> {
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 1000, height: 560 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await openGame(page, target);
  await page.evaluate(() => (window as any).__ski.quality('medium'));
  await start(page);
  await pump(page, 2);
  const files: string[] = [];
  for (const v of VIEWS) {
    if (phone && !PHONE_KINDS.has(v.kind)) continue;
    const f = path.join(target === 'web' ? OUT : path.resolve('test-results/vues-legacy', TRANCHE), phone ? 'telephone' : 'ordinateur', v.id + '.jpg');
    await shoot(page, v, f);
    files.push(f);
  }
  await ctx.close();
  return files;
}

/** Écart moyen par canal (0–255) entre deux captures, calculé dans le navigateur. */
async function diff(page: Page, a: string, b: string): Promise<number> {
  const u = (f: string) => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
  return page.evaluate(async ([a, b]) => {
    const load = async (src: string) => { const i = new Image(); i.src = src; await i.decode(); const c = new OffscreenCanvas(i.width, i.height), g = c.getContext('2d')!; g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
    const [x, y] = [await load(a), await load(b)]; if (x.length !== y.length) return 255;
    let s = 0; for (let k = 0; k < x.length; k += 4) s += Math.abs(x[k] - y[k]) + Math.abs(x[k + 1] - y[k + 1]) + Math.abs(x[k + 2] - y[k + 2]);
    return s / (x.length / 4 * 3);
  }, [u(a), u(b)]);
}

for (const phone of [false, true]) {
  test(`vues de référence · ${phone ? 'téléphone' : 'ordinateur'}`, async ({ browser, page }) => {
    test.setTimeout(90 * 60_000);   // rendu logiciel : ~1 min par vue et par cible
    // en T1, game.html est capturé en même temps pour la comparaison ; ensuite, les vues servent aux planches avant/après
    const [web, legacy] = await Promise.all([capture(browser, 'web', phone), TRANCHE === 'T1' ? capture(browser, 'legacy', phone) : Promise.resolve([])]);
    expect(web.length).toBeGreaterThan(phone ? 4 : 20);
    if (TRANCHE !== 'T1') return;
    const res: Record<string, number> = {};
    for (let i = 0; i < web.length; i++) res[path.basename(web[i], '.jpg')] = Math.round((await diff(page, web[i], legacy[i])) * 100) / 100;
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, `parite-${phone ? 'telephone' : 'ordinateur'}.json`), JSON.stringify(res, null, 1));
    console.log(JSON.stringify(res));
    for (const [k, d] of Object.entries(res)) expect(d, k).toBeLessThan(1.5);   // écart moyen < 1,5/255 : bruit de rendu
  });
}
