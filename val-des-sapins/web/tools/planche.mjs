#!/usr/bin/env node
/* Planche comparative avant / après des vues de référence.
   node tools/planche.mjs <dossier avant> <dossier après> <sortie.jpg> [titre] [libellé avant] [libellé après]
   Chaque vue présente dans les deux dossiers est montrée côte à côte, avec son nom (tests/views.json). */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [a, b, out, title = 'Avant / après', la = 'Avant', lb = 'Après'] = process.argv.slice(2);
const views = JSON.parse(fs.readFileSync(new URL('../tests/views.json', import.meta.url), 'utf8'));
const names = Object.fromEntries(views.map((v) => [v.id, v.title]));
const files = fs.readdirSync(b).filter((f) => /\.(jpe?g|png)$/.test(f) && fs.existsSync(path.join(a, f))).sort();
const img = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
const rows = files.map((f) => `<div class="row"><h3>${names[f.replace(/\.\w+$/, '')] ?? f}</h3><figure><img src="${img(path.join(a, f))}"><figcaption>${la}</figcaption></figure><figure><img src="${img(path.join(b, f))}"><figcaption>${lb}</figcaption></figure></div>`).join('');
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;padding:24px;background:#0b1320;color:#e9f1fb;font:15px system-ui,sans-serif}
h1{margin:0 0 16px;font:800 28px system-ui;text-transform:uppercase;letter-spacing:.04em}
.row{display:grid;grid-template-columns:200px 1fr 1fr;gap:12px;align-items:center;margin-bottom:12px}
h3{margin:0;font:700 15px system-ui}figure{margin:0;position:relative}img{width:100%;display:block;border-radius:4px}
figcaption{position:absolute;left:8px;top:8px;background:rgba(0,0,0,.65);padding:2px 8px;border-radius:3px;font:700 12px system-ui;text-transform:uppercase;letter-spacing:.08em}
</style><h1>${title}</h1>${rows}`;
const br = await chromium.launch();
const p = await br.newPage({ viewport: { width: 1600, height: 900 } });
await p.setContent(html);
await p.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 80 });
await br.close();
console.log(`${files.length} vues → ${out}`);
