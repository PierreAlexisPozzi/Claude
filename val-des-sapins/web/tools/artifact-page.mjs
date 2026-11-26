#!/usr/bin/env node
/* Prépare dist/ pour une publication en artefact claude.ai à plusieurs fichiers.
   L'hébergeur enveloppe lui-même la page dans <!doctype html><html><head>…<body> : on retire donc ces balises de
   dist/index.html et on écrit dist/artifact.html (titre, feuille de style, scripts et canvas inchangés, chemins
   relatifs). Les autres fichiers sont rangés à leur chemin publié dans dist/publish/ (liste : dist/artifact-files.json). */
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] || 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const page = html
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?html[^>]*>/gi, '')
  .replace(/<\/?head>/gi, '')
  .replace(/<\/?body>/gi, '')
  .replace(/<meta charset="utf-8">\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .replace(/(src|href)="\.\//g, '$1="')
  .replace(/\n{2,}/g, '\n')
  .trim() + '\n';
fs.writeFileSync(path.join(dist, 'artifact.html'), page);
// dossier de publication : chaque fichier à son chemin publié ; les artefacts ne servent ni .glb, ni .bin, ni .ktx2,
// ni .vds : ces fichiers y partent en base64 dans un <nom>.b64.json (repli du chargeur, src/assets/loader.ts)
const pub = path.join(dist, 'publish');
fs.rmSync(pub, { recursive: true, force: true });
fs.rmSync(path.join(dist, 'artifact-b64'), { recursive: true, force: true });
const files = [];
const walk = (d) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f), r = path.relative(dist, p);
    if (fs.statSync(p).isDirectory()) { if (r !== 'publish') walk(p); continue; }
    if (['index.html', 'artifact.html', 'artifact-files.json', 'sw.js'].includes(r)) continue;   // pas de service worker dans un artefact
    let key = r.split(path.sep).join('/'), data = fs.readFileSync(p);
    if (/\.(glb|bin|ktx2|vds)$/.test(key)) { key += '.b64.json'; data = Buffer.from(JSON.stringify(data.toString('base64'))); }
    fs.mkdirSync(path.dirname(path.join(pub, key)), { recursive: true });
    fs.writeFileSync(path.join(pub, key), data);
    files.push(key);
  }
};
walk(dist);
fs.writeFileSync(path.join(dist, 'artifact-files.json'), JSON.stringify(files.sort(), null, 1));
console.log(`artifact.html + ${files.length} fichiers dans ${path.relative(process.cwd(), pub)}, ${(files.reduce((s, f) => s + fs.statSync(path.join(pub, f)).size, 0) / 1e6).toFixed(1)} Mo`);
