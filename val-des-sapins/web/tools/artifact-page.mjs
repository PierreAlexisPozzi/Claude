#!/usr/bin/env node
/* Prépare dist/ pour une publication en artefact claude.ai à plusieurs fichiers.
   L'hébergeur enveloppe lui-même la page dans <!doctype html><html><head>…<body> : on retire donc ces balises de
   dist/index.html et on écrit dist/artifact.html (titre, feuille de style, scripts et canvas inchangés, chemins
   relatifs). La liste des autres fichiers de dist/ est écrite dans dist/artifact-files.json (chemin publié → source). */
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
const files = {};
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f), r = path.relative(dist, p); if (fs.statSync(p).isDirectory()) walk(p); else if (!['index.html', 'artifact.html', 'artifact-files.json'].includes(r)) files[r.split(path.sep).join('/')] = path.relative(process.cwd(), p); } };
walk(dist);
fs.writeFileSync(path.join(dist, 'artifact-files.json'), JSON.stringify(files, null, 1));
console.log(`artifact.html + ${Object.keys(files).length} fichiers, ${(Object.values(files).reduce((s, f) => s + fs.statSync(f).size, 0) / 1e6).toFixed(1)} Mo`);
