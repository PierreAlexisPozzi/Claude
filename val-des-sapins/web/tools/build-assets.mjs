#!/usr/bin/env node
/* Construit public/assets/ (données dérivées, versionnées) à partir des sorties brutes de ../assets/ :
   - modèles .glb → compression EXT_meshopt_compression, mode QUANTIZE : SANS PERTE (les sommets sont déjà
     quantifiés par tools/glb_slim.py ; noms des nœuds, attributs personnalisés et squelettes conservés) ;
   - textures .jpg/.png → KTX2 Basis UASTC + Zstandard, mipmaps intégrées (restent compressées dans la mémoire du
     GPU : ASTC, BC7 ou ETC2 selon l'appareil, transcodées au chargement) ;
   - relief et données du domaine → tuiles binaires (tools/tiles.mjs) ;
   - transcodeur Basis de three.js copié dans public/basis/.
   Usage : npm run assets   (relancer après toute modification de ../assets) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { encodeToKTX2 } from 'ktx2-encoder';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { buildTiles } from './tiles.mjs';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.resolve(WEB, '../assets');
const OUT = path.join(WEB, 'public/assets');
const only = process.argv.slice(2);

// textures : rôle (couleur sRGB, normale, masque linéaire) et retournement vertical (flipY du jeu)
const NORMAL = /_normal$/;
const LINEAR = new Set(['baluster_mask']);
const FLIP_Y = new Set(['baluster_mask', 'shop_signs']);   // textures que le jeu charge avec flipY = true

function decode(buf, file) {
  if (/\.jpe?g$/i.test(file)) { const r = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true }); return { data: new Uint8Array(r.data), width: r.width, height: r.height }; }
  const r = PNG.sync.read(buf); return { data: new Uint8Array(r.data), width: r.width, height: r.height };
}

async function texture(file) {
  const key = file.replace(/\.\w+$/, '');
  const buf = new Uint8Array(fs.readFileSync(path.join(SRC, file)));
  const color = !NORMAL.test(key) && !LINEAR.has(key);
  const ktx = await encodeToKTX2(buf, {
    isUASTC: true,
    enableDebug: false,
    needSupercompression: true,             // Zstandard
    generateMipmap: true,
    isPerceptual: color,
    isSetKTX2SRGBTransferFunc: color,
    isNormalMap: NORMAL.test(key),
    isYFlip: FLIP_Y.has(key),
    uastcLDRQualityLevel: 3,                // qualité UASTC élevée (0 = rapide … 4 = la plus fine)
    enableRDO: false,                       // pas d'optimisation débit-distorsion : la qualité prime sur la taille
    imageDecoder: async (b) => decode(Buffer.from(b), file),
  });
  fs.writeFileSync(path.join(OUT, key + '.ktx2'), ktx);
  return key + '.ktx2';
}

async function model(file, io) {
  const doc = await io.read(path.join(SRC, file));
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  await io.write(path.join(OUT, file), doc);
  return file;
}

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
if (fs.existsSync(OUT) && fs.lstatSync(OUT).isSymbolicLink()) fs.unlinkSync(OUT);
fs.mkdirSync(OUT, { recursive: true });
const manifest = [];
const report = [];
for (const file of fs.readdirSync(SRC).sort()) {
  if (only.length && !only.some((o) => file.includes(o))) continue;
  const before = fs.statSync(path.join(SRC, file)).size;
  let out;
  if (/\.(jpe?g|png)$/i.test(file)) out = await texture(file);
  else if (file.endsWith('.glb')) out = await model(file, io);
  else continue;   // .json et .bin : remplacés par les tuiles ci-dessous
  manifest.push(out);
  report.push([file, out, before, fs.statSync(path.join(OUT, out)).size]);
  console.log(`${file.padEnd(22)} → ${out.padEnd(22)} ${(before / 1024).toFixed(0).padStart(6)} Ko → ${(fs.statSync(path.join(OUT, out)).size / 1024).toFixed(0).padStart(6)} Ko`);
}
if (!only.length) {
  // sorties déjà construites dont la source brute n'est pas versionnée (ex. béton CC0 d'ambientCG, T5) : gardées telles quelles
  const bases = new Set(fs.readdirSync(SRC).map((f) => f.replace(/\.\w+$/, '')));
  for (const f of fs.readdirSync(OUT).sort()) {
    if (!/\.(ktx2|glb)$/.test(f) || manifest.includes(f) || bases.has(f.replace(/\.\w+$/, ''))) continue;
    console.log(`${f.padEnd(22)}   gardé (source absente de ../assets, sortie versionnée)`); manifest.push(f);
  }
  manifest.sort();
  const tiles = buildTiles(SRC, OUT);
  manifest.push(...tiles.files);
  console.log(`tuiles : ${tiles.files.length} fichiers, ${(tiles.bytes / 1024).toFixed(0)} Ko`);
  fs.writeFileSync(path.join(WEB, 'src/assets/manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  // transcodeur Basis (three.js, Apache 2.0) servi avec le jeu
  const bdir = path.join(WEB, 'public/basis');
  fs.mkdirSync(bdir, { recursive: true });
  for (const f of ['basis_transcoder.js', 'basis_transcoder.wasm']) fs.copyFileSync(path.join(WEB, 'node_modules/three/examples/jsm/libs/basis', f), path.join(bdir, f));
  fs.writeFileSync(path.join(WEB, '../review/assets_T2.json'), JSON.stringify(report.map(([a, b, x, y]) => ({ source: a, sortie: b, avant: x, apres: y })), null, 1) + '\n');
}
