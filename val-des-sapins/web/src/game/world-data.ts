// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « world-data ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { ASSETS } from '../assets/loader';
import { MAX_ANISO, renderer } from './render';

export let BLEND, ASSET_DATA, PLAGNE;


// .bin grids: zlib of int16 second-order deltas (along x, then z); two prefix sums give back the uint16 samples
export async function inflateGrid(uri, n) {
  const bytes = new Uint8Array(uri);   // ArrayBuffer du fichier .bin
  const buf = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer();
  const d = new Int16Array(buf), out = new Float32Array(n * n), row = new Int32Array(n);
  if (d.length !== n * n) throw new Error('grid size ' + d.length);
  for (let j = 0; j < n; j++) { let acc = 0; for (let i = 0; i < n; i++) { row[i] += d[j * n + i]; acc += row[i]; out[j * n + i] = acc; } }
  return out;
}

export async function loadWorldData() {
  if (!PLAGNE) return;
  const G = ASSET_DATA.__grids;   // T2 : relief déjà décodé depuis les tuiles binaires (src/assets/world.ts)
  if (G && G.near) { BLEND.bin.height = G.near; if (PLAGNE.meta.far && G.far) BLEND.bin.far = G.far; if (PLAGNE.meta.wide && G.wide) BLEND.bin.wide = G.wide; return; }
  try {
    BLEND.bin.height = await inflateGrid(ASSET_DATA['plagne_height.bin'], PLAGNE.meta.n + 1);
    if (PLAGNE.meta.far && ASSET_DATA['plagne_far.bin']) BLEND.bin.far = await inflateGrid(ASSET_DATA['plagne_far.bin'], PLAGNE.meta.far.n);
    if (PLAGNE.meta.wide && ASSET_DATA['plagne_wide.bin']) BLEND.bin.wide = await inflateGrid(ASSET_DATA['plagne_wide.bin'], PLAGNE.meta.wide.n);
  } catch (e) { console.error('La Plagne relief unavailable', e); BLEND.bin = {}; }
}

export async function loadBlenderAssets() {
  if (!Object.keys(ASSET_DATA).length) return;
  try {
    const data = ASSET_DATA, loader = new GLTFLoader(), jobs = [];
    loader.setMeshoptDecoder(MeshoptDecoder);   // T2 : modèles compressés EXT_meshopt_compression (sans perte)
    let ktx2 = null;
    for (const [name, uri] of Object.entries(data)) {
      if ((typeof uri !== 'string' && !(uri instanceof ArrayBuffer)) || name.endsWith('.bin')) continue;   // world data, handled by loadWorldData
      if (name.endsWith('.ktx2')) {   // T2 : textures Basis UASTC, transcodées pour le GPU (ASTC, BC7, ETC2…)
        if (!ktx2) { ktx2 = new KTX2Loader().setTranscoderPath(new URL('basis/', document.baseURI).href).detectSupport(renderer); }
        jobs.push(new Promise((res, rej) => ktx2.parse(uri, res, rej)).then(t => {
          const key = name.replace(/\.\w+$/, '');
          t.anisotropy = MAX_ANISO; t.colorSpace = /_normal$/.test(key) || key === 'baluster_mask' ? THREE.NoColorSpace : THREE.SRGBColorSpace;
          if (/^(rock|timber|masonry|snowpack|massif|concrete)_/.test(key)) t.wrapS = t.wrapT = THREE.RepeatWrapping;   // tileable surface maps
          t.needsUpdate = true; BLEND.tex[key] = t;   // retournement vertical (flipY) déjà appliqué à l'encodage
        }));
      } else if (name.endsWith('.glb')) {
        const buf = new Uint8Array(uri);   // ArrayBuffer du fichier .glb
        jobs.push(loader.parseAsync(buf.buffer, '').then(gltf => {
          gltf.scene.updateMatrixWorld(true);
          if (name === 'skiers_real.glb') { BLEND.humans = gltf.scene; return; }   // skinned MakeHuman skiers (blender/humans.py)
          gltf.scene.traverse(o => { if (o.isMesh) BLEND.geo[o.name] = blendGeometry(o); });
        }));
      } else {
        const img = new Image(); img.src = uri;
        jobs.push(img.decode().then(() => {
          const key = name.replace(/\.\w+$/, ''), t = new THREE.Texture(img);
          t.flipY = false; t.anisotropy = MAX_ANISO; t.colorSpace = /_normal$/.test(key) ? THREE.NoColorSpace : THREE.SRGBColorSpace;   // normal maps are data
          if (/^(rock|timber|masonry|snowpack|massif|concrete)_/.test(key)) t.wrapS = t.wrapT = THREE.RepeatWrapping;                                       // tileable surface maps
          if (key === 'baluster_mask') { t.flipY = true; t.colorSpace = THREE.NoColorSpace; }
          if (key === 'shop_signs') t.flipY = true;                                                                                    // box UVs                                               // box UVs, data
          t.needsUpdate = true; BLEND.tex[key] = t;
        }));
      }
    }
    await Promise.all(jobs); BLEND.ok = true;
    if (ktx2) ktx2.dispose();   // libère les workers de transcodage
  } catch (e) { console.warn('Blender assets unavailable, using procedural models', e); BLEND.geo = {}; BLEND.tex = {}; }
}

// node transform baked in; glTF vertex colours are linear, the game's shaders expect display values
export function blendGeometry(mesh) {
  const g = mesh.geometry.clone(); g.applyMatrix4(mesh.matrixWorld);
  const fl = g.getAttribute('_flutter'); if (fl) { g.setAttribute('aFlutter', fl); g.deleteAttribute('_flutter'); }   // Blender '_flutter' weights
  const c = g.getAttribute('color');
  if (c) {
    const out = new Float32Array(c.count * 3);
    for (let i = 0; i < c.count; i++) { out[i * 3] = Math.pow(c.getX(i), 1 / 2.2); out[i * 3 + 1] = Math.pow(c.getY(i), 1 / 2.2); out[i * 3 + 2] = Math.pow(c.getZ(i), 1 / 2.2); }
    g.setAttribute('color', new THREE.BufferAttribute(out, 3));
  }
  return g;
}

export function __init_574() {

/* ---------------- Blender assets ----------------
   Meshes and textures modelled and baked with Blender 5.3 (scripts in val-des-sapins/blender/, run as a Python
   module) are compressed by web/tools/build-assets.mjs (meshopt, KTX2, binary tiles) and loaded by src/assets/. Only geometry comes from the
   glTF files; materials stay the game's own. If decoding fails, the procedural builders are used instead. */
BLEND = { geo: {}, tex: {}, bin: {}, ok: false };
// the embedded asset block, parsed once: glTF/images (decoded below), world data (.json objects, .bin grids)
ASSET_DATA = ASSETS;
/* La Plagne sector (tools/plagne_data.py): real relief, runs, lifts and buildings from open data, in the game's frame
   (x east, z south, metres). Without it the original procedural Val des Sapins is generated. */
PLAGNE = ASSET_DATA['plagne.json'] && typeof ASSET_DATA['plagne.json'] === 'object' && (ASSET_DATA.__grids?.near || ASSET_DATA['plagne_height.bin']) && typeof DecompressionStream === 'function' ? ASSET_DATA['plagne.json'] : null;
}
