/* T7 : contrôle des jours entre le corps et les vêtements, et planche personnages.
   - Par défaut (npm test) : quatre vues sensibles (dos vu d'en haut en schuss, télésiège, col du joueur, col d'une
     habitante en bonnet), aucun pixel magenta toléré.
   - VDS_PERSOS=1 : planche complète (toutes les poses et tous les angles), relevé sans seuil sauf VDS_PERSOS_MAX.

   - Joueur dans les poses du jeu (arrêt, schuss, virage, chasse-neige), figées par le mode photo, vu sous six angles ;
     deux habitants (bonnet), vus tout autour.
   - Pour chaque image, un masque : pièces du personnage en noir, leurs faces arrière en magenta (__ski.humanDebug(2)).
     Une face arrière visible, c'est l'intérieur d'un vêtement vu par une ouverture : col, ourlet, poignet, bas de
     pantalon, bord du bonnet ou du casque. Le compte de pixels magenta (entourés de magenta : les liserés d'un pixel
     au bord des silhouettes sont écartés) est écrit dans persos.json.
   - Sorties : VDS_PERSOS_OUT (par défaut .cache/persos) : une image par vue, une planche (planche.jpg), persos.json.
   VDS_PERSOS_MAX : seuil de pixels magenta par vue (contrôle d'acceptation ; sans seuil, simple relevé). */
import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { openGame, pump, start } from './helpers';

const OUT = path.resolve(process.env.VDS_PERSOS_OUT || '.cache/persos');
const FULL = !!process.env.VDS_PERSOS;
const MAX = process.env.VDS_PERSOS_MAX ? Number(process.env.VDS_PERSOS_MAX) : FULL ? null : 0;
const ONLY = process.env.VDS_PERSOS_ONLY ? new RegExp(process.env.VDS_PERSOS_ONLY)   // sous-ensemble « pose-angle »
  : FULL ? null : /^(schuss-dessus-dos|telesiege-trois-quarts|arret-col|lucie-col)$/;
// angle autour du personnage (0 = de face), distance, inclinaison de la caméra, hauteur visée au-dessus des hanches
const ANGLES: [string, number, number, number, number][] = [['face', 0, 3, 0.1, -0.05], ['trois-quarts', 0.8, 3, 0.1, -0.05], ['profil', 1.57, 3, 0.1, -0.05], ['dos', 3.14, 3, 0.1, -0.05], ['dessus-dos', 2.8, 2.2, 0.75, 0.1], ['col', 0.6, 0.85, 0.3, 0.5]];
const POSES: [string, Record<string, boolean>, number, Record<string, boolean>?, number?][] = [['arret', {}, 0], ['schuss', { up: true }, 240], ['virage', { up: true }, 120, { left: true, up: false }, 100], ['chasse-neige', { up: true }, 160, { down: true, up: false }, 70], ['telesiege', {}, 0]];
const FOLK = ['lucie', 'henri'];

type Shot = { pose: string; angle: string; file: string; mask: string; magenta: number };

async function magenta(page: Page, png: Buffer): Promise<number> {
  return page.evaluate(async (src) => {
    const im = new Image(); im.src = src; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d')!; g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, W = c.width, Hh = c.height; let n = 0;
    const m = (x: number, y: number) => { const i = (y * W + x) * 4; return d[i] > 150 && d[i + 2] > 150 && d[i + 1] < 90; };
    // pixel magenta entouré de magenta : un vrai jour ; les liserés d'un pixel sur les silhouettes (faces arrière vues
    // de biais au bord exact du contour) ne comptent pas
    for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) if (m(x, y) && m(x - 1, y) && m(x + 1, y) && m(x, y - 1) && m(x, y + 1)) n++;
    return n;
  }, 'data:image/png;base64,' + png.toString('base64'));
}

async function shoot(page: Page, pose: string, angle: string): Promise<Shot> {
  const file = path.join(OUT, `${pose}-${angle}.jpg`), mask = path.join(OUT, `${pose}-${angle}-masque.png`);
  await pump(page, 1, 1 / 60);
  await page.evaluate(() => (window as any).__ski.nearNow());
  await pump(page, 1, 1 / 60);
  await page.screenshot({ path: file, type: 'jpeg', quality: 88 });
  await page.evaluate(() => (window as any).__ski.humanDebug(2));
  await pump(page, 1, 1 / 60);
  const png = await page.screenshot({ path: mask });
  await page.evaluate(() => (window as any).__ski.humanDebug(0));
  return { pose, angle, file, mask, magenta: await magenta(page, png) };
}

test('vêtements sans jour (masque des faces arrière) et planche personnages', async ({ page, browser }) => {
  test.setTimeout(60 * 60_000);
  fs.mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 560, height: 700 });
  await openGame(page, 'web');
  await page.evaluate(() => (window as any).__ski.quality('medium'));
  await start(page);
  await pump(page, 2);
  const shots: Shot[] = [];
  for (const [pose, keys, n, keys2, n2] of POSES) {
    await page.evaluate(({ pose, keys, n, keys2, n2 }) => {
      const s = (window as any).__ski, P = s.P;
      s.clear(); s.unlockAll();
      if (pose === 'telesiege') {   // assis sur un télésiège, à quelques secondes de la gare
        const L = s.LIFTS.find((l: any) => l.type === 'chair');
        s.teleport(L.board.x, L.board.z, L.yaw); s.queued.add('action'); s.stepSim(s.STEP);
        for (let i = 0; i < 600; i++) s.stepSim(s.STEP);
      } else {   // piste large et dégagée : au tiers d'une des bleues les plus larges
        const p = s.PISTES.filter((x: any) => x.real && x.lvl === 'bleue' && x.samples && x.samples.length > 60).sort((a: any, b: any) => b.w - a.w || b.samples.length - a.samples.length)[0];
        const S = p.samples, i0 = Math.floor(S.length * 0.3), a = S[i0], b = S[i0 + 4];
        s.teleport(a.x, a.z, Math.atan2(b.x - a.x, b.z - a.z));
        Object.assign(s.input, keys); for (let i = 0; i < n; i++) s.stepSim(s.STEP);
        if (keys2) { s.clear(); Object.assign(s.input, keys2); for (let i = 0; i < (n2 || 0); i++) s.stepSim(s.STEP); }
      }
      for (let i = 0; i < 40; i++) s.skierTick(1 / 60);   // la pose se stabilise
      s.faceHold = { blink: 0, smile: 0.15, open: 0, brows: 0, squint: 0 };
      s.photoMode(true); document.getElementById('photo')!.hidden = true;
      (window as any).__vdsYaw0 = s.PHOTO.yaw - Math.PI * 0.8;   // orientation du skieur (togglePhoto part de là)
      (window as any).__vdsState = P.state;
    }, { pose, keys, n, keys2: keys2 || null, n2: n2 || 0 });
    for (const [angle, a, d, pitch, dy] of ANGLES) {
      if (ONLY && !ONLY.test(`${pose}-${angle}`)) continue;
      await page.evaluate(({ a, d, pitch, dy }) => {
        // le mode photo vise 0,95 m au-dessus de la racine du skieur : ramené aux hanches du personnage
        const s = (window as any).__ski, hip = s.playerHuman.root.position.y - s.skier.root.position.y;
        Object.assign(s.PHOTO, { yaw: (window as any).__vdsYaw0 + a, dist: d, pitch, dy: hip - 0.95 + dy, aperture: 0, fov: 40 });
      }, { a, d, pitch, dy });
      shots.push(await shoot(page, pose, angle));
    }
    await page.evaluate(() => { const s = (window as any).__ski; s.PHOTO.dy = 0; s.photoMode(false); s.clear(); });
  }
  for (const id of FOLK) {
    for (const [angle, a, d0, pitch, dy] of ANGLES.filter((x) => x[0] !== 'dessus-dos')) {
      const d = d0 > 2 ? 1.9 : d0;   // habitants : buste
      if (ONLY && !ONLY.test(`${id}-${angle}`)) continue;
      await page.evaluate(({ id, a, d, pitch }) => {
        const s = (window as any).__ski, T = s.THREE, q = s.PEOPLE.find((x: any) => x.id === id), y = q.n.y + 1.6 * (q.n.h || 1) - (d > 1.5 ? 0.45 : 0.1), A = q.yaw + a;
        s.faceHold = { blink: 0, smile: 0.15, open: 0, brows: 0, squint: 0 };
        s.photo({ from: new T.Vector3(q.x + Math.sin(A) * d, y + Math.sin(pitch) * d * 0.6, q.z + Math.cos(A) * d), at: new T.Vector3(q.x, y, q.z) });
      }, { id, a, d, pitch });
      shots.push(await shoot(page, id, angle));
    }
  }
  await page.evaluate(() => (window as any).__ski.photo(null));
  fs.writeFileSync(path.join(OUT, 'persos.json'), JSON.stringify(shots.map(({ pose, angle, magenta }) => ({ pose, angle, magenta })), null, 1) + '\n');
  // planche : une ligne par pose ou par personne, image et masque côte à côte
  const img = (f: string) => `data:image/${f.endsWith('.png') ? 'png' : 'jpeg'};base64,` + fs.readFileSync(f).toString('base64');
  const rows = [...new Set(shots.map((s) => s.pose))].map((p) => `<h2>${p}</h2><div class="row">` + shots.filter((s) => s.pose === p).map((s) =>
    `<figure><img src="${img(s.file)}"><img src="${img(s.mask)}"><figcaption>${s.angle} · ${s.magenta} px</figcaption></figure>`).join('') + '</div>').join('');
  const p2 = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  await p2.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:16px;background:#0b1320;color:#e9f1fb;font:14px system-ui}
h1{margin:0 0 8px;font:800 22px system-ui}h2{margin:10px 0 4px;font:700 15px system-ui}.row{display:flex;gap:8px}
figure{margin:0;display:grid;grid-template-columns:1fr 1fr;gap:2px;width:290px}img{width:100%;display:block}
figcaption{grid-column:1/3;font:600 12px system-ui;opacity:.85}</style><h1>${process.env.VDS_PERSOS_TITLE || 'Personnages'}</h1>${rows}`);
  await p2.screenshot({ path: path.join(OUT, 'planche.jpg'), fullPage: true, type: 'jpeg', quality: 82 });
  await p2.close();
  const worst = shots.reduce((m, s) => Math.max(m, s.magenta), 0);
  console.log('magenta max', worst, shots.filter((s) => s.magenta > 0).map((s) => `${s.pose}/${s.angle}:${s.magenta}`).join(' '));
  if (MAX !== null) for (const s of shots) expect(s.magenta, `${s.pose} ${s.angle}`).toBeLessThanOrEqual(MAX);
});
