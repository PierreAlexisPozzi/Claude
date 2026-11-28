import { ASSET_VERSION } from './version';
/* Lecture des tuiles binaires du domaine (format décrit dans tools/tiles.mjs) et reconstruction exacte :
   - l'objet « plagne.json » (méta, pistes, remontées, bâtiments, lieux, zones), identique à la source ;
   - les grilles de relief (proche, lointain, horizon) en Float32Array, identiques à celles de game.html.
   Toutes les tuiles du secteur sont chargées au démarrage ; le chargement à la demande viendra en T16. */

export interface TileRef { tx: number; tz: number; x0?: number; z0?: number; w?: number; h?: number; file: string }
export interface WorldIndex {
  version: number;
  meta: Record<string, unknown> & { n: number };
  counts: Record<string, number>;
  tile: { size: number; n: number };
  relief: Record<string, { n: number; tile: number; tiles: Required<TileRef>[] }>;
  vector: TileRef[];
}
export interface WorldData { plagne: Record<string, unknown>; grids: Record<string, Float32Array> }

async function inflate(buf: ArrayBuffer): Promise<ArrayBuffer> {
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer();
}

function decodeHeight(b: ArrayBuffer, into: Float32Array, n: number, x0: number, z0: number): void {
  const dv = new DataView(b), w = dv.getUint16(6, true), h = dv.getUint16(8, true), base = dv.getInt32(12, true);
  if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'VDSH') throw new Error('tuile de relief invalide');
  const d = new Int32Array(b, 16, w * h), row = new Int32Array(w);
  for (let j = 0; j < h; j++) { let acc = 0; for (let i = 0; i < w; i++) { row[i] += d[j * w + i]; acc += row[i]; into[(z0 + j) * n + x0 + i] = acc + base; } }
}

function decodeVector(b: ArrayBuffer, into: Record<string, unknown[]>): void {
  const dv = new DataView(b), jl = dv.getUint32(8, true);
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(b, 12, jl)), (_k, v) => (v && (v as { $n0?: number }).$n0 === 1 ? -0 : v)) as {
    features: { c: string; i: number; k: string[]; p: Record<string, unknown>; a: Record<string, [number, number, number]> }[];
  };
  const off = 12 + jl + ((4 - ((12 + jl) % 4)) % 4), coords = new Int32Array(b, off);
  for (const ft of meta.features) {
    const f: Record<string, unknown> = {};
    for (const k of ft.k) {
      const a = ft.a[k];
      if (!a) { f[k] = ft.p[k]; continue; }
      const [o, n, s] = a, v = Array.from(coords.subarray(o, o + n), (x) => x / 10);
      f[k] = s ? Array.from({ length: n / s }, (_, j) => v.slice(j * s, j * s + s)) : v;
    }
    into[ft.c][ft.i] = f;
  }
}

/** Charge l'index puis toutes les tuiles ; `fetchBin` récupère un fichier binaire (avec repli base64). */
export async function loadWorld(base: string, fetchBin: (name: string) => Promise<ArrayBuffer>): Promise<WorldData | null> {
  if (typeof DecompressionStream !== 'function') return null;   // comme game.html : sans décompression, monde procédural
  const res = await fetch(new URL(base + 'world/index.json?v=' + ASSET_VERSION, document.baseURI));
  if (!res.ok) return null;
  const idx = (await res.json()) as WorldIndex;
  const grids: Record<string, Float32Array> = {};
  const jobs: Promise<void>[] = [];
  for (const [lvl, L] of Object.entries(idx.relief)) {
    const g = (grids[lvl] = new Float32Array(L.n * L.n));
    for (const t of L.tiles) jobs.push(fetchBin('world/' + t.file).then(inflate).then((b) => decodeHeight(b, g, L.n, t.x0, t.z0)));
  }
  const coll: Record<string, unknown[]> = Object.fromEntries(Object.entries(idx.counts).map(([c, k]) => [c, new Array(k)]));
  for (const t of idx.vector) jobs.push(fetchBin('world/' + t.file).then(inflate).then((b) => decodeVector(b, coll)));
  await Promise.all(jobs);
  return { plagne: { meta: idx.meta, ...coll }, grids };
}
