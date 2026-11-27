/* VUES DE RÉFÉRENCE GRAPHIQUES : caméras fixes (tests/views.json : façades, terrasses, gros plans de visages,
   village, paysage), capturées à chaque tranche dans review/vues/<tranche>/<cible>/ (ordinateur et téléphone).
   En T1 (migration à parité), chaque vue web est comparée pixel à pixel à game.html. */
import { test, expect, type Page, type Browser } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openGame, pump, start, REPO, HAS_LEGACY, TRANCHE, type Target } from './helpers';

// person : caméra placée devant une personne nommée (__ski.PEOPLE), calculée à la capture (depuis T6 : les commerçants
// suivent leurs boutiques, une caméra fixe ne les cadrerait plus) ; kind 'jeu' : caméra de jeu derrière le skieur, HUD
// affiché (pour juger le recul de la caméra)
// T7 : hour (heure du soleil, sinon celle du départ) ; hold (expression figée ; par défaut, visage neutre et yeux ouverts
// sur les vues de visage, pour qu'aucun clignement ne tombe sur une capture)
type View = { id: string; kind: string; from?: number[]; at?: number[]; rel?: Record<string, number>; person?: { id: string; a: number; d: number; dy: number; ly: number }; hour?: number; hold?: Record<string, number> };
const VIEWS = JSON.parse(fs.readFileSync(path.resolve('tests/views.json'), 'utf8')) as View[];
const OUT = path.join(REPO, 'review/vues', TRANCHE);
const PHONE_KINDS = new Set(['terrasse', 'village', 'joueur', 'jeu']);

async function shoot(page: Page, v: View, file: string): Promise<void> {
  if (v.kind === 'jeu') {
    await page.evaluate(() => (window as any).__ski.photo(null));
    await pump(page, 30, 1 / 60);   // la caméra de poursuite se recale
  } else await page.evaluate((v) => {
    const s = (window as any).__ski, T = s.THREE, w = window as any;
    if (w.__vdsH0 === undefined) w.__vdsH0 = s.SKY.hour;
    if (s.SKY.hour !== (v.hour ?? w.__vdsH0)) s.setHour(v.hour ?? w.__vdsH0);
    s.faceHold = v.hold || (v.person ? { blink: 0, smile: 0.15, open: 0, brows: 0, squint: 0 } : null);
    if (v.person) {
      const q = s.PEOPLE.find((x: any) => x.id === v.person!.id), y = q.n.y + 1.6 * (q.n.h || 1), a = q.yaw + v.person.a, d = v.person.d;
      s.photo({ from: new T.Vector3(q.x + Math.sin(a) * d, y + v.person.dy, q.z + Math.cos(a) * d), at: new T.Vector3(q.x, y + v.person.ly, q.z) });
    } else s.photo(v.rel ? v.rel : { from: new T.Vector3(...v.from!), at: new T.Vector3(...v.at!) });
  }, v);
  await pump(page, 1, 1 / 60);
  await page.evaluate(() => (window as any).__ski.nearNow());
  await pump(page, 2, 1 / 60);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, timeout: 300_000, type: 'jpeg', quality: 88 });
}

async function capture(browser: Browser, target: Target, phone: boolean): Promise<string[]> {
  // téléphone tenu en paysage depuis T6 (format conseillé) ; la vue de jeu est aussi prise en portrait (jeu-portrait)
  const ctx = await browser.newContext(phone ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 1000, height: 560 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await openGame(page, target);
  await page.evaluate(() => (window as any).__ski.quality('medium'));
  await start(page);
  await pump(page, 2);
  const files: string[] = [];
  const only = process.env.VDS_VIEWS ? new RegExp(process.env.VDS_VIEWS) : null;   // sous-ensemble (contrôle rapide)
  for (const v of VIEWS) {
    if (phone && !PHONE_KINDS.has(v.kind)) continue;
    if (only && !only.test(v.id)) continue;
    const f = path.join(target === 'web' ? OUT : path.resolve('.cache/vues-legacy', TRANCHE), phone ? 'telephone' : 'ordinateur', v.id + '.jpg');
    await shoot(page, v, f);
    files.push(f);
  }
  if (phone && target === 'web' && (!only || only.test('jeu-portrait'))) {
    // la vue de jeu, téléphone tenu en portrait, dans un contexte à part : depuis T6 le départ passe en plein écran sur
    // tactile, et une fenêtre en plein écran ne se redimensionne pas
    const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }), p2 = await c2.newPage();
    await openGame(p2, target);
    await p2.evaluate(() => (window as any).__ski.quality('medium'));
    await start(p2);
    await pump(p2, 2);
    await shoot(p2, { id: 'jeu-portrait', kind: 'jeu' }, path.join(OUT, 'telephone', 'jeu-portrait.jpg'));
    files.push(path.join(OUT, 'telephone', 'jeu-portrait.jpg'));
    await c2.close();
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
    // tant que game.html existe, il est capturé en même temps pour mesurer l'écart ; ensuite, les vues servent aux
    // planches avant / après entre tranches
    const [web, legacy] = await Promise.all([capture(browser, 'web', phone), HAS_LEGACY ? capture(browser, 'legacy', phone) : Promise.resolve([])]);
    if (!process.env.VDS_VIEWS) expect(web.length).toBeGreaterThan(phone ? 4 : 20);
    if (!HAS_LEGACY) return;
    const res: Record<string, number> = {};
    for (let i = 0; i < web.length; i++) res[path.basename(web[i], '.jpg')] = Math.round((await diff(page, web[i], legacy[i])) * 100) / 100;
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, `parite-${phone ? 'telephone' : 'ordinateur'}.json`), JSON.stringify(res, null, 1));
    console.log(JSON.stringify(res));
    // T1 : identique (0) ; T2 : textures KTX2 (compression avec pertes, mipmaps refaites) → petit écart toléré
    const tol = TRANCHE === 'T1' ? 0.01 : 3;
    for (const [k, d] of Object.entries(res)) expect(d, k).toBeLessThan(tol);
  });
}
