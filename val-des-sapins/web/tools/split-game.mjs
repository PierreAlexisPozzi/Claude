#!/usr/bin/env node
/* Découpe ../game.html en projet Vite (migration à parité, axe 0).

   - <style>            → src/hud/hud.css
   - balisage du HUD    → src/hud/hud.html (le canvas #c reste dans index.html)
   - <script module>    → src/game/<module>.ts (un fichier par domaine) + src/game/index.ts
   - assets base64      → public/assets/<nom> (fichiers binaires d'origine)

   Le script du jeu est une seule closure : ~750 déclarations de premier niveau qui se voient toutes.
   Pour garder le comportement à l'identique :
   - chaque fonction / classe de premier niveau devient un `export` de son module ;
   - chaque `const` / `let` devient `export let x;`, et son initialisation passe dans une fonction
     `__init_<ligne>()` qui contient aussi les autres instructions de la section, dans l'ordre du fichier ;
   - `src/game/index.ts` appelle toutes les `__init_*` dans l'ordre d'origine : l'ordre d'évaluation est inchangé,
     et l'import d'un module n'exécute rien d'autre que des définitions ;
   - les liaisons importées étant en lecture seule, une affectation depuis un autre module passe par un
     accesseur `__set_x(v)` exporté par le module qui déclare `x`.
   La portée est calculée par eslint-scope (références résolues, lecture / écriture). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as eslintScope from 'eslint-scope';
import MagicString from 'magic-string';

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(here, '..');
const SRC_HTML = path.resolve(WEB, '../game.html');
const html = fs.readFileSync(SRC_HTML, 'utf8');
const lineOf = (pos) => { let n = 1; for (let i = 0; i < pos; i++) if (html.charCodeAt(i) === 10) n++; return n; };

// ---------------------------------------------------------------- sections → modules (lignes de game.html)
const SECTIONS = [
  [525, 'core'], [553, 'render'], [574, 'world-data'], [643, 'core'], [670, 'terrain'], [740, 'pistes'], [952, 'terrain'],
  [1211, 'render'], [1374, 'materials'], [1747, 'terrain'], [1796, 'tunnels'], [2016, 'vegetation'],
  [2113, 'buildings'], [2681, 'cannons'], [2755, 'lifts'], [2901, 'npcs'], [3276, 'vehicles'], [3396, 'assembly'],
  [4131, 'fauna'], [4397, 'trails'], [4553, 'park'], [4622, 'furniture'], [4659, 'humans'], [5087, 'particles'],
  [5131, 'player'], [5693, 'animation'], [5896, 'camera'], [5990, 'audio'], [6080, 'maps'], [6203, 'progression'],
  [6379, 'chronos'], [6559, 'people'], [6698, 'missions'], [6914, 'journal'], [6975, 'hud'], [7168, 'input'],
  [7213, 'touch'], [7311, 'loop'], [7403, 'boot'],
];

// ---------------------------------------------------------------- extraction
const cut = (a, b, from = 0) => { const i = html.indexOf(a, from); if (i < 0) throw new Error('marqueur absent : ' + a); const j = html.indexOf(b, i + a.length); if (j < 0) throw new Error('marqueur absent : ' + b); return [i, j]; };
const [st0, st1] = cut('<style>', '</style>');
const css = html.slice(st0 + 7, st1).replace(/^\n/, '');
const [im0] = cut('<script type="importmap">', '</script>');
let markup = html.slice(st1 + 8, im0).trim();
const canvasTag = '<canvas id="c" tabindex="0" aria-label="Vue 3D du domaine skiable"></canvas>';
if (!markup.startsWith(canvasTag)) throw new Error('canvas #c attendu en tête du balisage');
markup = markup.slice(canvasTag.length).trim() + '\n';
const [sc0, sc1] = cut('<script type="module">', '</script>');
const scriptStart = sc0 + '<script type="module">'.length;
let script = html.slice(scriptStart, sc1);
const scriptLine0 = lineOf(scriptStart) - 1;   // ligne html = ligne du script + scriptLine0
const [as0, as1] = cut('<script type="application/json" id="vds-assets">', '</script>');
const assets = JSON.parse(html.slice(as0 + '<script type="application/json" id="vds-assets">'.length, as1));

// ---------------------------------------------------------------- correctifs ciblés (chacun doit s'appliquer une fois)
// Seules différences voulues avec game.html : d'où viennent les assets et où se range la sauvegarde.
const PATCHES = [
  ['import { clone as cloneSkinned } from \'three/addons/utils/SkeletonUtils.js\';',
   'import { clone as cloneSkinned } from \'three/addons/utils/SkeletonUtils.js\';\nimport { ASSETS } from \'../assets/loader\';\nimport { STORE } from \'../storage/store\';'],
  // assets : fichiers chargés par src/assets/loader.ts (objets JSON, ArrayBuffer, URL d'images) au lieu du base64 intégré
  ['const ASSET_DATA = (() => { try { const el = document.getElementById(\'vds-assets\'); return el ? JSON.parse(el.textContent) : {}; } catch (e) { return {}; } })();',
   'const ASSET_DATA = ASSETS;'],
  ['  const bin = atob(uri.slice(uri.indexOf(\',\') + 1)), bytes = new Uint8Array(bin.length);\n  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);\n',
   '  const bytes = new Uint8Array(uri);   // ArrayBuffer du fichier .bin\n'],
  ['      if (typeof uri !== \'string\' || name.endsWith(\'.bin\')) continue;',
   '      if ((typeof uri !== \'string\' && !(uri instanceof ArrayBuffer)) || name.endsWith(\'.bin\')) continue;'],
  ['        const bin = atob(uri.slice(uri.indexOf(\',\') + 1)), buf = new Uint8Array(bin.length);\n        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);\n',
   '        const buf = new Uint8Array(uri);   // ArrayBuffer du fichier .glb\n'],
  // sauvegarde : couche storage (IndexedDB + repli localStorage), lue en mémoire avant le démarrage
  [/localStorage\.getItem\(/g, 'STORE.getItem('],
  [/localStorage\.setItem\(/g, 'STORE.setItem('],
];
const counts = {};
for (const [a, b] of PATCHES) {
  if (a instanceof RegExp) { const m = script.match(a); counts[a] = m ? m.length : 0; if (!m) throw new Error('correctif sans effet : ' + a); script = script.replace(a, b); continue; }
  const n = script.split(a).length - 1;
  if (n !== 1) throw new Error(`correctif trouvé ${n} fois : ${a.slice(0, 80)}`);
  script = script.replace(a, () => b);
}
if (/localStorage/.test(script)) throw new Error('accès localStorage restant');
// les sections se lisent sur le script d'origine (lignes de game.html) ; les correctifs n'ajoutent ni ne retirent
// d'instruction de premier niveau, on reporte donc la section par rang d'instruction
const htmlLine = (scriptLine) => scriptLine + scriptLine0;
const origScript = html.slice(scriptStart, sc1);
const origBody = acorn.parse(origScript, { ecmaVersion: 'latest', sourceType: 'module', locations: true }).body.find((s) => s.type === 'ExpressionStatement').expression.callee.body.body;

// ---------------------------------------------------------------- analyse
const ast = acorn.parse(script, { ecmaVersion: 'latest', sourceType: 'module', locations: true, ranges: true });
const sm = eslintScope.analyze(ast, { ecmaVersion: 2024, sourceType: 'module' });
const imports = ast.body.filter((s) => s.type === 'ImportDeclaration');
const iife = ast.body.find((s) => s.type === 'ExpressionStatement');
const fn = iife.expression.callee;
const body = fn.body.body;
const parent = new Map();
(function walk(n, p) {
  if (!n || typeof n.type !== 'string') return;
  parent.set(n, p);
  for (const k in n) { if (k === 'loc' || k === 'range') continue; const v = n[k]; if (Array.isArray(v)) v.forEach((c) => walk(c, n)); else if (v && typeof v.type === 'string') walk(v, n); }
})(ast, null);

const moduleOfLine = (hl) => { let m = SECTIONS[0][1], sec = SECTIONS[0][0]; for (const [l, name] of SECTIONS) if (hl >= l) { m = name; sec = l; } return { m, sec }; };
if (origBody.length !== body.length) throw new Error('les correctifs ont changé le nombre d\'instructions');
const stmtInfo = body.map((s, i) => ({ s, ...moduleOfLine(htmlLine(origBody[i].loc.start.line)) }));
const moduleAt = (pos) => { let r = null; for (const t of stmtInfo) { if (t.s.start <= pos && pos < t.s.end) { r = t.m; break; } } return r; };

const fnScope = sm.acquire(fn);
const modScope = sm.scopes.find((s) => s.type === 'module');
const declModule = new Map();   // nom → module
for (const v of fnScope.variables) {
  if (v.name === 'arguments') continue;
  const def = v.defs[0];
  const m = moduleAt(def.name.start);
  if (!m) throw new Error('déclaration hors instruction : ' + v.name);
  declModule.set(v.name, m);
}

const ms = new MagicString(script);
const needs = new Map();   // module → Map(nom → module source)
const setters = new Map(); // module déclarant → Set(nom)
const need = (m, name, from) => { if (!needs.has(m)) needs.set(m, new Map()); needs.get(m).set(name, from); };
let crossWrites = 0;
for (const v of fnScope.variables) {
  const home = declModule.get(v.name); if (!home) continue;
  for (const ref of v.references) {
    const m = moduleAt(ref.identifier.start);
    if (!m) throw new Error('référence hors instruction : ' + v.name);
    if (m === home) continue;
    need(m, v.name, home);
    if (!ref.isWrite() || ref.init) continue;
    crossWrites++;
    if (!setters.has(home)) setters.set(home, new Set());
    setters.get(home).add(v.name);
    need(m, '__set_' + v.name, home);
    const id = ref.identifier, p = parent.get(id);
    if (p.type === 'AssignmentExpression' && p.left === id) {
      if (p.operator === '=') { ms.overwrite(p.start, p.right.start, `__set_${v.name}(`); ms.appendLeft(p.end, ')'); }
      else { const op = p.operator.slice(0, -1); ms.overwrite(p.start, p.right.start, `__set_${v.name}(${v.name} ${op} (`); ms.appendLeft(p.end, '))'); }
    } else if (p.type === 'UpdateExpression') {
      const d = p.operator === '++' ? '+' : '-', inv = p.operator === '++' ? '-' : '+';
      ms.overwrite(p.start, p.end, p.prefix ? `__set_${v.name}(${v.name} ${d} 1)` : `(__set_${v.name}(${v.name} ${d} 1) ${inv} 1)`);
    } else throw new Error(`écriture croisée non gérée (${p.type}) : ${v.name} ligne ${htmlLine(id.loc.start.line)}`);
  }
}
// imports de modules (three, addons, assets, storage) : seulement ceux qu'un module utilise
const importUse = new Map();   // module → Set(nom local)
for (const v of modScope.variables) {
  for (const ref of v.references) {
    const m = moduleAt(ref.identifier.start); if (!m) continue;
    if (!importUse.has(m)) importUse.set(m, new Set());
    importUse.get(m).add(v.name);
  }
}

// ---------------------------------------------------------------- génération
const patternNames = (p, out = []) => {
  if (!p) return out;
  if (p.type === 'Identifier') out.push(p.name);
  else if (p.type === 'ObjectPattern') p.properties.forEach((q) => patternNames(q.type === 'RestElement' ? q.argument : q.value, out));
  else if (p.type === 'ArrayPattern') p.elements.forEach((e) => patternNames(e, out));
  else if (p.type === 'RestElement') patternNames(p.argument, out);
  else if (p.type === 'AssignmentPattern') patternNames(p.left, out);
  return out;
};
const mods = new Map();   // module → { lets:[], decls:[], inits:[{line, code}] }
const order = [];         // [module, initName] dans l'ordre du fichier
let prevEnd = body[0].start;
let cur = null;
for (const t of stmtInfo) {
  const { s, m, sec } = t;
  const lead = ms.slice(prevEnd, s.start).replace(/^[ \t]*\n/, '');
  prevEnd = s.end;
  if (s.type === 'ExpressionStatement' && s.directive) continue;   // 'use strict' : un module l'est déjà
  if (!mods.has(m)) mods.set(m, { lets: [], decls: [], inits: [] });
  const M = mods.get(m);
  if (!cur || cur.m !== m || cur.sec !== sec) {
    cur = { m, sec, name: `__init_${sec}`, code: [] };
    if (M.inits.some((i) => i.name === cur.name)) throw new Error('section en double ' + sec);
    M.inits.push(cur); order.push([m, cur.name]);
  }
  if (s.type === 'FunctionDeclaration' || s.type === 'ClassDeclaration') {
    M.decls.push(lead + 'export ' + ms.slice(s.start, s.end));
  } else if (s.type === 'VariableDeclaration') {
    const parts = [];
    for (const d of s.declarations) {
      M.lets.push(...patternNames(d.id));
      if (!d.init) continue;
      const lhs = ms.slice(d.id.start, d.id.end);
      parts.push(d.id.type === 'ObjectPattern' ? `;(${lhs} = ${ms.slice(d.init.start, d.init.end)});` : `${lhs} = ${ms.slice(d.init.start, d.init.end)};`);
    }
    cur.code.push(lead + parts.join('\n'));
  } else {
    cur.code.push(lead + ms.slice(s.start, s.end));
  }
}
const tail = script.slice(prevEnd, fn.body.end - 1).trim();
if (tail) throw new Error('code inattendu après la dernière instruction : ' + tail.slice(0, 80));
const after = script.slice(fn.end, iife.end).trim();
if (after !== ')();') throw new Error('fin de closure inattendue : ' + after);

const outDir = path.join(WEB, 'src/game');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const HEADER = (m) => `// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « ${m} ») ; typage strict progressif à venir.\n/* eslint-disable */\n`;
for (const [m, M] of mods) {
  const lines = [HEADER(m)];
  const used = importUse.get(m) || new Set();
  for (const imp of imports) {
    const specs = imp.specifiers.filter((sp) => used.has(sp.local.name));
    if (!specs.length) continue;
    const src = imp.source.value;
    if (specs[0].type === 'ImportNamespaceSpecifier') lines.push(`import * as ${specs[0].local.name} from '${src}';`);
    else lines.push(`import { ${specs.map((sp) => sp.imported.name === sp.local.name ? sp.local.name : `${sp.imported.name} as ${sp.local.name}`).join(', ')} } from '${src}';`);
  }
  const byFrom = new Map();
  for (const [name, from] of needs.get(m) || []) { if (!byFrom.has(from)) byFrom.set(from, []); byFrom.get(from).push(name); }
  for (const [from, names] of [...byFrom].sort((a, b) => a[0].localeCompare(b[0]))) lines.push(`import { ${names.sort().join(', ')} } from './${from}';`);
  lines.push('');
  if (M.lets.length) lines.push(`export let ${M.lets.join(', ')};`, '');
  for (const name of setters.get(m) || []) lines.push(`export function __set_${name}(v) { return (${name} = v); }`);
  lines.push('', ...M.decls.map((d) => d + '\n'));
  for (const I of M.inits) lines.push(`export function ${I.name}() {\n${I.code.join('\n')}\n}\n`);
  fs.writeFileSync(path.join(outDir, m + '.ts'), lines.join('\n'));
}
const idx = [HEADER('index'), '// Ordre d\'évaluation de game.html : chaque section s\'initialise dans l\'ordre du fichier d\'origine.'];
const modNames = [...mods.keys()];
modNames.forEach((m, i) => idx.push(`import * as m${i} from './${m}';`));
idx.push('', 'export function runGame(): void {');
for (const [m, name] of order) idx.push(`  m${modNames.indexOf(m)}.${name}();`);
idx.push('}', '');
fs.writeFileSync(path.join(outDir, 'index.ts'), idx.join('\n'));

// ---------------------------------------------------------------- HUD et assets
fs.mkdirSync(path.join(WEB, 'src/hud'), { recursive: true });
fs.writeFileSync(path.join(WEB, 'src/hud/hud.css'), '/* HUD, écrans et commandes tactiles — extrait de game.html (tools/split-game.mjs). */\n' + css);
fs.writeFileSync(path.join(WEB, 'src/hud/hud.html'), '<!-- HUD, écrans et commandes tactiles — extrait de game.html (tools/split-game.mjs). Contrat d\'identifiants : ne pas renommer un id lu par le code. -->\n' + markup);
// les assets intégrés sont ceux de ../assets (sorties Blender et données) : public/assets est un lien vers ce dossier ;
// on vérifie seulement qu'ils sont identiques (contenu JSON comparé après décodage)
const repoAssets = path.resolve(WEB, '../assets');
const manifest = [];
for (const [name, v] of Object.entries(assets)) {
  const file = path.join(repoAssets, name);
  if (!fs.existsSync(file)) throw new Error('asset absent de ../assets : ' + name);
  const disk = fs.readFileSync(file);
  const same = typeof v === 'string' && v.startsWith('data:') ? Buffer.from(v.slice(v.indexOf(',') + 1), 'base64').equals(disk) : JSON.stringify(v) === JSON.stringify(JSON.parse(disk.toString('utf8')));
  if (!same) throw new Error('asset intégré différent de ../assets : ' + name);
  manifest.push(name);
}
const link = path.join(WEB, 'public/assets');
fs.mkdirSync(path.join(WEB, 'public'), { recursive: true });
if (!fs.existsSync(link)) fs.symlinkSync('../../assets', link);
fs.mkdirSync(path.join(WEB, 'src/assets'), { recursive: true });
fs.writeFileSync(path.join(WEB, 'src/assets/manifest.json'), JSON.stringify(manifest, null, 1) + '\n');

console.log(`modules : ${mods.size}, sections : ${order.length}, déclarations : ${declModule.size}, écritures croisées : ${crossWrites} (accesseurs : ${[...setters.values()].reduce((a, s) => a + s.size, 0)}), assets : ${manifest.length}`);
