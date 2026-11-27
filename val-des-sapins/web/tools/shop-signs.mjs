#!/usr/bin/env node
/* Enseignes des commerces (tranche T5) : 8 bandeaux de 512 × 128 px empilés (512 × 1024), premier en haut, écrits
   dans ../assets/shop_signs.png puis compressés par `npm run assets -- shop_signs.png`.
   Remplace le rendu Blender de blender/interiors.py (même ordre, mêmes couleurs : l'indice d'enseigne est partagé avec
   l'intérieur de la boutique et la veste du commerçant). Aucun nom de marque : intitulés génériques.
   Polices : Barlow Condensed et Barlow (Fontsource, licence OFL), chargées depuis node_modules. */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SIGNS = [
  ['LOCATION DE SKIS', 'Skis · Snowboards · Réglages', '#c8302a', '#ffffff'],
  ['ÉPICERIE', 'Alimentation · Primeurs', '#2f8a3c', '#ffffff'],
  ['SPORT & MODE', 'Vêtements · Accessoires', '#1d3f8a', '#ffffff'],
  ['LE CAQUELON', 'Fondue · Raclette', '#5a3a22', '#f2d39a'],
  ['BOUCHERIE', 'Charcuterie', '#8a2a24', '#f4efe6'],
  ['FROMAGERIE', 'Beaufort · Reblochon', '#6b4a24', '#f2d39a'],
  ['SOUVENIRS', 'Cadeaux · Cartes', '#2a6a9a', '#ffffff'],
  ['BOULANGERIE', 'Pâtisserie', '#7a4a24', '#f6e2b0'],
];
const font = (pkg, file) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(WEB, 'node_modules/@fontsource', pkg, 'files', file)).toString('base64');
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0"><canvas id="c" width="512" height="1024"></canvas><script>
(async () => {
  const f1 = new FontFace('BC', 'url(${font('barlow-condensed', 'barlow-condensed-latin-700-normal.woff2')})');
  const f2 = new FontFace('BR', 'url(${font('barlow', 'barlow-latin-500-normal.woff2')})');
  for (const f of [f1, f2]) { await f.load(); document.fonts.add(f); }
  const S = ${JSON.stringify(SIGNS)}, g = document.getElementById('c').getContext('2d');
  S.forEach(([name, sub, bg, fg], i) => {
    const y = i * 128;
    g.fillStyle = bg; g.fillRect(0, y, 512, 128);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, y + 122, 512, 6); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, y, 512, 4);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 60px BC'; g.fillText(name, 256, y + 52, 480);
    g.font = '500 22px BR'; g.fillText(sub, 256, y + 100, 470);
  });
  document.title = 'ok';
})();
</script>`;
const b = await chromium.launch(), p = await b.newPage();
await p.setContent(html); await p.waitForFunction(() => document.title === 'ok');
const png = await p.locator('#c').screenshot({ type: 'png', omitBackground: false });
fs.writeFileSync(path.resolve(WEB, '../assets/shop_signs.png'), png);
await b.close();
console.log('shop_signs.png : ' + SIGNS.map((s) => s[0]).join(', '));
