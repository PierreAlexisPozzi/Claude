#!/usr/bin/env node
/* Matières du prototype de façade (tranche T3), d'après ambientCG (licence CC0 1.0, https://docs.ambientcg.com/license/).
   Les archives téléchargées restent dans .cache/ (jamais versionnées) ; seules les textures dérivées sont écrites :
   public/assets/proto/<clé>_albedo.ktx2 et <clé>_normal.ktx2, au format attendu par detailMat() du jeu
   (albédo en niveaux de gris normalisé : moyenne linéaire 0,214 ; normales OpenGL), en 1024 px. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { encodeToKTX2 } from 'ktx2-encoder';
import jpeg from 'jpeg-js';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(WEB, '.cache/ambientcg');
const OUT = path.join(WEB, 'public/assets/proto');
export const SOURCES = [
  { key: 'concrete', id: 'Concrete013', what: 'béton banché (empreinte de planches de coffrage)' },
  { key: 'siding', id: 'WoodSiding009', what: 'bardage bois à clins' },
  { key: 'deck', id: 'Planks037A', what: 'plancher de terrasse' },
];

const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (l) => (l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055);

function half(img, normal) {   // réduction 2×2 (moyenne), normales renormalisées
  const w = img.width >> 1, h = img.height >> 1, o = new Uint8Array(w * h * 4), s = img.data, W = img.width;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = [0, 0, 0];
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const k = ((2 * y + dy) * W + 2 * x + dx) * 4; for (let c = 0; c < 3; c++) a[c] += s[k + c] / 4; }
    if (normal) { const v = a.map((q) => q / 127.5 - 1), l = Math.hypot(...v) || 1; for (let c = 0; c < 3; c++) a[c] = (v[c] / l + 1) * 127.5; }
    const k = (y * w + x) * 4; o[k] = a[0]; o[k + 1] = a[1]; o[k + 2] = a[2]; o[k + 3] = 255;
  }
  return { width: w, height: h, data: o };
}

async function ktx(img, color, file) {
  const buf = await encodeToKTX2(new Uint8Array(1), {
    isUASTC: true, enableDebug: false, needSupercompression: true, generateMipmap: true, uastcLDRQualityLevel: 3,
    isPerceptual: color, isSetKTX2SRGBTransferFunc: color, isNormalMap: !color,
    imageDecoder: async () => img,
  });
  fs.writeFileSync(path.join(OUT, file), buf);
}

fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });
for (const s of SOURCES) {
  const dir = path.join(CACHE, s.id), zip = dir + '.zip';
  if (!fs.existsSync(path.join(dir, `${s.id}_2K-JPG_Color.jpg`))) {
    execFileSync('curl', ['-sL', '--max-time', '180', '-o', zip, `https://ambientcg.com/get?file=${s.id}_2K-JPG.zip`]);
    fs.mkdirSync(dir, { recursive: true });
    execFileSync('unzip', ['-o', '-q', zip, '-d', dir]);
  }
  const read = (suffix) => { const r = jpeg.decode(fs.readFileSync(path.join(dir, `${s.id}_2K-JPG_${suffix}.jpg`)), { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 }); return { width: r.width, height: r.height, data: new Uint8Array(r.data) }; };
  // albédo : luminance seule (le jeu teinte par instance), moyenne linéaire ramenée à 0,214
  const col = half(read('Color'), false), n = col.width * col.height;
  const lum = new Float64Array(n); let mean = 0;
  for (let i = 0; i < n; i++) { const k = i * 4; lum[i] = 0.2126 * toLin(col.data[k] / 255) + 0.7152 * toLin(col.data[k + 1] / 255) + 0.0722 * toLin(col.data[k + 2] / 255); mean += lum[i] / n; }
  for (let i = 0; i < n; i++) { const v = Math.round(255 * toSrgb(Math.min(1, (lum[i] * 0.214) / mean))); col.data.set([v, v, v, 255], i * 4); }
  await ktx(col, true, `${s.key}_albedo.ktx2`);
  await ktx(half(read('NormalGL'), true), false, `${s.key}_normal.ktx2`);
  console.log(`${s.id} (${s.what}) → ${s.key}_albedo.ktx2, ${s.key}_normal.ktx2`);
}
fs.writeFileSync(path.join(OUT, 'SOURCES.json'), JSON.stringify(SOURCES.map((s) => ({ ...s, licence: 'CC0 1.0', page: `https://ambientcg.com/view?id=${s.id}` })), null, 1) + '\n');
