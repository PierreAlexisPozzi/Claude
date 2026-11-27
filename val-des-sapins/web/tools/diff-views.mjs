#!/usr/bin/env node
/* Écart moyen par canal (0–255) entre deux séries de captures de même nom (ex. review/vues/T4-avant et T4).
   Usage : node tools/diff-views.mjs <dossier A> <dossier B> [sortie.json] */
import fs from 'node:fs';
import path from 'node:path';
import jpeg from 'jpeg-js';

const [A, B, out] = process.argv.slice(2);
if (!A || !B) { console.error('usage : node tools/diff-views.mjs <A> <B> [sortie.json]'); process.exit(1); }
const res = {};
for (const sub of ['ordinateur', 'telephone']) {
  const da = path.join(A, sub), db = path.join(B, sub);
  if (!fs.existsSync(da) || !fs.existsSync(db)) continue;
  for (const f of fs.readdirSync(db).filter((x) => x.endsWith('.jpg'))) {
    if (!fs.existsSync(path.join(da, f))) continue;
    const a = jpeg.decode(fs.readFileSync(path.join(da, f)), { useTArray: true }), b = jpeg.decode(fs.readFileSync(path.join(db, f)), { useTArray: true });
    if (a.width !== b.width || a.height !== b.height) { res[`${sub}/${f}`] = 255; continue; }
    let s = 0; for (let k = 0; k < a.data.length; k += 4) s += Math.abs(a.data[k] - b.data[k]) + Math.abs(a.data[k + 1] - b.data[k + 1]) + Math.abs(a.data[k + 2] - b.data[k + 2]);
    res[`${sub}/${f}`] = Math.round(s / (a.data.length / 4 * 3) * 100) / 100;
  }
}
console.log(JSON.stringify(res, null, 1));
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1) + '\n');
