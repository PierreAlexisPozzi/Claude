#!/usr/bin/env node
/* Calcule une fois pour toutes les caméras des VUES DE RÉFÉRENCE (tests/views.json) à partir du monde généré.
   Les coordonnées sont ensuite figées : chaque tranche recapture exactement les mêmes plans (avant/après).
   À lancer avec le serveur de développement démarré (`npm run dev`), qui permet d'importer les modules du jeu. */
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const url = process.argv[2] || 'http://localhost:5173/';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage();
await p.addInitScript(() => { const q = []; window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; }; });
await p.goto(url);
await p.waitForFunction(() => window.__ski?.ready, null, { timeout: 300000, polling: 500 });
const views = await p.evaluate(async () => {
  const bm = await import('/src/game/buildings.ts');
  const s = window.__ski, H = s.H, r2 = (v) => Math.round(v * 100) / 100;
  const label = (n) => s.villageLabels.find((v) => v.name === n);
  const near = (type, n) => { const L = label(n); return s.BUILDINGS.filter((q) => q.type === type).sort((a, c) => Math.hypot(a.x - L.x, a.z - L.z) - Math.hypot(c.x - L.x, c.z - L.z))[0]; };
  const out = [];
  const facade = (id, title, q, side = 1) => {
    const [ax, az] = bm.toWorld(q.x, q.z, q.rot, 0, side), nx = ax - q.x, nz = az - q.z, l = Math.hypot(nx, nz);
    // hauteur : étages si connus, sinon valeur type (q.top et q.y0 sont des cotes de terrain, pas le toit)
    const top = q.floors ? q.floors * 2.9 + 3 : { block: 24, tower: 40, paquebot: 30, woodres: 14, chalet: 9 }[q.type] || 12;
    const D = q.d / 2 + Math.min(48, Math.max(16, top * 1.05)), g = q.y0 ?? H(q.x, q.z);
    const fx = q.x + (nx / l) * D, fz = q.z + (nz / l) * D;
    const fy = Math.max(H(fx, fz) + 1.7, g + 2.5);
    out.push({ id, title, kind: 'façade', from: [r2(fx), r2(fy), r2(fz)], at: [r2(q.x), r2(g + Math.min(top * 0.42, 14)), r2(q.z)] });
  };
  facade('facade-plagne-centre-barre', 'Plagne Centre · barre béton', near('block', 'Plagne Centre'));
  facade('facade-plagne-centre-tour', 'Plagne Centre · tour', near('tower', 'Plagne Centre'), -1);
  facade('facade-aime-2000-paquebot', 'Aime 2000 · paquebot', near('paquebot', 'Aime 2000'));
  facade('facade-plagne-villages-residence', 'Plagne Villages · résidence bois', near('woodres', 'Plagne Villages'));
  facade('facade-plagne-1800-chalet', 'Plagne 1800 · chalet', near('chalet', 'Plagne 1800'));
  facade('facade-plagne-soleil-residence', 'Plagne Soleil · résidence bois', near('woodres', 'Plagne Soleil'));
  // terrasses : groupes de clients (TERRACE_FOLK), une par station
  const groups = [];
  for (const f of bm.TERRACE_FOLK) { let g = groups.find((q) => Math.hypot(q.x - f.x, q.z - f.z) < 14); if (!g) groups.push(g = { x: f.x, z: f.z, y: f.y, n: 0, sx: 0, sz: 0, sy: 0, c: 0, s: 0 }); g.sx += f.x; g.sz += f.z; g.sy += f.y; g.n++; if (f.pose === 'lounge') { g.c += Math.cos(f.yaw); g.s += Math.sin(f.yaw); } }
  const seen = new Set();
  for (const g of groups) {
    const cx = g.sx / g.n, cz = g.sz / g.n, cy = g.sy / g.n;
    const v = s.villageLabels.slice().sort((a, c) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(c.x - cx, c.z - cz))[0].name;
    if (seen.has(v) || seen.size >= 3) continue; seen.add(v);
    const yaw = Math.atan2(g.s, g.c), fx = cx + Math.sin(yaw) * 11, fz = cz + Math.cos(yaw) * 11;
    out.push({ id: 'terrasse-' + v.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[̀-ͯ]/g, ''), title: 'Terrasse · ' + v, kind: 'terrasse', from: [r2(fx), r2(Math.max(cy + 3.2, H(fx, fz) + 1.7)), r2(fz)], at: [r2(cx), r2(cy + 0.9), r2(cz)] });
  }
  // visages : six habitants, de face, de trois quarts et de profil
  for (const id of ['lucie', 'marco', 'yanis', 'henri', 'jeanne', 'mireille']) {
    const q = s.PEOPLE.find((x) => x.id === id), y = q.n.y + 1.6 * (q.n.h || 1);
    for (const [k, a] of [['face', 0], ['trois-quarts', Math.PI / 4], ['profil', Math.PI / 2]]) {
      const d = 0.62, fx = q.x + Math.sin(q.yaw + a) * d, fz = q.z + Math.cos(q.yaw + a) * d;
      out.push({ id: `visage-${id}-${k}`, title: `${q.name} · ${k}`, kind: 'visage', from: [r2(fx), r2(y + 0.02), r2(fz)], at: [r2(q.x), r2(y - 0.02), r2(q.z)] });
    }
  }
  // joueur (casque et masque) : gros plan autour du skieur, mode photo relatif
  out.push({ id: 'joueur-trois-quarts', title: 'Skieur du joueur · trois quarts', kind: 'joueur', rel: { a: 0.8, d: 1.5, h: 0.55, ly: 0.45 } });
  // village et paysage
  const PC = label('Plagne Centre'), A2 = label('Aime 2000');
  out.push({ id: 'village-plagne-centre', title: 'Plagne Centre · vue d\'ensemble', kind: 'village', from: [r2(PC.x + 160), r2(H(PC.x, PC.z) + 85), r2(PC.z + 190)], at: [r2(PC.x), r2(H(PC.x, PC.z) + 10), r2(PC.z)] });
  out.push({ id: 'village-aime-2000', title: 'Aime 2000 · vue d\'ensemble', kind: 'village', from: [r2(A2.x + 170), r2(H(A2.x, A2.z) + 70), r2(A2.z + 120)], at: [r2(A2.x), r2(H(A2.x, A2.z) + 15), r2(A2.z)] });
  const sp = s.P.pos;
  out.push({ id: 'paysage-sommet-becoin', title: 'Paysage depuis le sommet du Bécoin', kind: 'paysage', from: [r2(sp.x), r2(sp.y + 6), r2(sp.z)], at: [r2(PC.x), r2(H(PC.x, PC.z)), r2(PC.z)] });
  return out;
});
await b.close();
fs.writeFileSync(new URL('../tests/views.json', import.meta.url), JSON.stringify(views, null, 1) + '\n');
console.log(views.length + ' vues de référence');
