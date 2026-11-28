/* Tuiles binaires du domaine (relief + pistes, remontées, bâtiments, lieux, zones), à partir de ../assets/plagne*.
   Format (little-endian), chaque fichier compressé zlib (DecompressionStream('deflate') côté navigateur) :

   relief  world/h_<niveau>_<tx>_<tz>.vds   magic 'VDSH', u16 version, u16 w, u16 h, u16 0, i32 base,
                                             puis w×h i32 : différences secondes (x puis z) de (valeur − base)
   vecteur world/v_<tx>_<tz>.vds            magic 'VDSV', u16 version, u16 0, u32 taille JSON, JSON UTF-8,
                                             bourrage à 4 octets, puis i32 : coordonnées ×10 (pts, poly, b, t)
   index   world/index.json                 méta, niveaux de relief, tuiles, effectifs par collection

   La reconstruction est EXACTE : l'outil la refait et la compare à la source avant d'écrire (même objet JSON,
   mêmes échantillons de relief), sinon il s'arrête. Niveaux : `near` (secteur 2,8 km, 7×7 tuiles de 64 mailles),
   `far` (8 km) et `wide` (30 km), une tuile chacun — prêts pour le chargement par tuiles (tranche T16). */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { isDeepStrictEqual } from 'node:util';

export const TILE = 64;
const VERSION = 1;

/** Grille d'origine : zlib d'int16 (différences secondes) → entiers (même calcul que inflateGrid du jeu). */
function readGrid(file, n) {
  const d = new Int16Array(new Uint8Array(zlib.inflateSync(fs.readFileSync(file))).buffer);
  if (d.length !== n * n) throw new Error('taille de grille ' + d.length);
  const out = new Float64Array(n * n), row = new Int32Array(n);
  for (let j = 0; j < n; j++) { let acc = 0; for (let i = 0; i < n; i++) { row[i] += d[j * n + i]; acc += row[i]; out[j * n + i] = acc; } }
  return out;
}

function encodeHeight(V, n, x0, z0, w, h) {
  let base = Infinity;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) base = Math.min(base, V[(z0 + j) * n + x0 + i]);
  const d = new Int32Array(w * h), prevRow = new Int32Array(w);
  for (let j = 0; j < h; j++) {
    let prev = 0;
    for (let i = 0; i < w; i++) {
      const v = V[(z0 + j) * n + x0 + i] - base, r = v - prev; prev = v;
      d[j * w + i] = r - prevRow[i]; prevRow[i] = r;
    }
  }
  const head = Buffer.alloc(16);
  head.write('VDSH', 0, 'ascii'); head.writeUInt16LE(VERSION, 4); head.writeUInt16LE(w, 6); head.writeUInt16LE(h, 8); head.writeInt32LE(base, 12);
  return zlib.deflateSync(Buffer.concat([head, Buffer.from(d.buffer)]), { level: 9 });
}

export function decodeHeight(buf) {
  const b = zlib.inflateSync(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const w = dv.getUint16(6, true), h = dv.getUint16(8, true), base = dv.getInt32(12, true);
  const d = new Int32Array(b.buffer.slice(b.byteOffset + 16, b.byteOffset + 16 + w * h * 4)), out = new Float64Array(w * h), row = new Int32Array(w);
  for (let j = 0; j < h; j++) { let acc = 0; for (let i = 0; i < w; i++) { row[i] += d[j * w + i]; acc += row[i]; out[j * w + i] = acc + base; } }
  return { w, h, out };
}

const ARRAYS = ['pts', 'poly', 'b', 't'];
const flat = (a) => (Array.isArray(a[0]) ? a.flat() : a);
const exact10 = (v) => !Object.is(v, -0) && Number.isInteger(Math.round(v * 10)) && Math.round(v * 10) / 10 === v && Math.abs(v) < 2e8;

function encodeVector(tx, tz, items) {
  const coords = [], feats = [];
  for (const { c, i, f } of items) {
    const props = {}, arrays = {};
    for (const [k, v] of Object.entries(f)) {
      if (ARRAYS.includes(k) && Array.isArray(v) && flat(v).every((x) => typeof x === 'number' && exact10(x))) {
        const fl = flat(v); arrays[k] = [coords.length, fl.length, Array.isArray(v[0]) ? v[0].length : 0];
        for (const x of fl) coords.push(Math.round(x * 10));
      } else props[k] = v;
    }
    feats.push({ c, i, k: Object.keys(f), p: props, a: arrays });   // k : ordre des clés d'origine
  }
  const json = Buffer.from(JSON.stringify({ tile: [tx, tz], features: feats }, (k, v) => (Object.is(v, -0) ? { $n0: 1 } : v)), 'utf8');   // -0 conservé
  const pad = (4 - ((12 + json.length) % 4)) % 4;
  const head = Buffer.alloc(12);
  head.write('VDSV', 0, 'ascii'); head.writeUInt16LE(VERSION, 4); head.writeUInt32LE(json.length, 8);
  return zlib.deflateSync(Buffer.concat([head, json, Buffer.alloc(pad), Buffer.from(new Int32Array(coords).buffer)]), { level: 9 });
}

export function decodeVector(buf, into) {
  const b = zlib.inflateSync(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength), jl = dv.getUint32(8, true);
  const meta = JSON.parse(b.subarray(12, 12 + jl).toString('utf8'), (k, v) => (v && v.$n0 === 1 ? -0 : v)), off = 12 + jl + ((4 - ((12 + jl) % 4)) % 4);
  const coords = new Int32Array(b.buffer.slice(b.byteOffset + off));
  for (const ft of meta.features) {
    const f = {};
    for (const k of ft.k) {
      if (!(k in ft.a)) { f[k] = ft.p[k]; continue; }
      const [o, n, s] = ft.a[k], v = Array.from(coords.subarray(o, o + n), (x) => x / 10);
      f[k] = s ? Array.from({ length: n / s }, (_, j) => v.slice(j * s, j * s + s)) : v;
    }
    into[ft.c][ft.i] = f;
  }
}

export function buildTiles(SRC, OUT) {
  const plagne = JSON.parse(fs.readFileSync(path.join(SRC, 'plagne.json'), 'utf8'));
  const dir = path.join(OUT, 'world');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const files = [], put = (name, buf) => { fs.writeFileSync(path.join(dir, name), buf); files.push('world/' + name); bytes += buf.length; };
  let bytes = 0;
  // ---- relief
  const levels = {};
  const M = plagne.meta, n0 = M.n + 1;
  const grids = { near: [readGrid(path.join(SRC, 'plagne_height.bin'), n0), n0] };
  if (M.far) grids.far = [readGrid(path.join(SRC, 'plagne_far.bin'), M.far.n), M.far.n];
  if (M.wide) grids.wide = [readGrid(path.join(SRC, 'plagne_wide.bin'), M.wide.n), M.wide.n];
  for (const [lvl, [V, n]] of Object.entries(grids)) {
    const nt = lvl === 'near' ? Math.ceil((n - 1) / TILE) : 1, step = lvl === 'near' ? TILE : n - 1, tiles = [];
    const back = new Float64Array(n * n);
    for (let tz = 0; tz < nt; tz++) for (let tx = 0; tx < nt; tx++) {
      const x0 = tx * step, z0 = tz * step, w = Math.min(step + 1, n - x0), h = Math.min(step + 1, n - z0);
      const buf = encodeHeight(V, n, x0, z0, w, h), name = `h_${lvl}_${tx}_${tz}.vds`;
      const r = decodeHeight(buf);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) back[(z0 + j) * n + x0 + i] = r.out[j * w + i];
      put(name, buf); tiles.push({ tx, tz, x0, z0, w, h, file: name });
    }
    for (let k = 0; k < n * n; k++) if (back[k] !== V[k]) throw new Error(`relief ${lvl} : échantillon ${k} différent après tuilage`);
    levels[lvl] = { n, tile: step, tiles };
  }
  // ---- vecteurs : chaque objet va dans la tuile de son premier point (même découpage que le relief proche)
  const W = M.world, nt = Math.ceil(M.n / TILE), size = W / nt;
  const tileOf = (x, z) => [Math.min(nt - 1, Math.max(0, Math.floor((x + W / 2) / size))), Math.min(nt - 1, Math.max(0, Math.floor((z + W / 2) / size)))];
  const buckets = new Map(), counts = {};
  for (const c of ['runs', 'lifts', 'buildings', 'places', 'areas', 'venues', 'shops', 'landcover']) {   // venues : restaurants, bars, cafés d'OSM (T5 ter) ; shops : commerces d'OSM (T6) ; landcover : bois, roche, éboulis d'OSM (T8)
    if (!plagne[c]) continue;
    counts[c] = plagne[c].length;
    plagne[c].forEach((f, i) => {
      const p = f.pts?.[0] ?? f.poly?.[0] ?? f.b ?? [f.x, f.z];
      const key = tileOf(p[0], p[1]).join('_');
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push({ c, i, f });
    });
  }
  const back = Object.fromEntries(Object.entries(counts).map(([c, k]) => [c, new Array(k)]));
  const vtiles = [];
  for (const [key, items] of [...buckets].sort()) {
    const [tx, tz] = key.split('_').map(Number), buf = encodeVector(tx, tz, items), name = `v_${tx}_${tz}.vds`;
    decodeVector(buf, back);
    put(name, buf); vtiles.push({ tx, tz, file: name, count: items.length });
  }
  if (!isDeepStrictEqual({ meta: M, ...back }, plagne) || JSON.stringify({ meta: M, ...back }) !== JSON.stringify(plagne)) throw new Error('données vectorielles différentes après tuilage');
  const index = { version: VERSION, meta: M, counts, tile: { size, n: nt }, relief: levels, vector: vtiles };
  const ib = Buffer.from(JSON.stringify(index));
  fs.writeFileSync(path.join(dir, 'index.json'), ib); files.unshift('world/index.json'); bytes += ib.length;
  return { files, bytes };
}
