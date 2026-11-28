// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « vegetation ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { NEAR, rocks } from './assembly';
import { IS_TOUCH, Q, V3, clamp, lerp, patchShader, smoothstep } from './core';
import { TEX, lambertVC, mergeParts, pbr, sunVis } from './materials';
import { isClear } from './pistes';
import { PROXY_LAYER, SMALL_LAYER, TREE_LAYER, scene } from './render';
import { ALT0, HALF, TC, WORLD, fbm, gridH, mulberry32, normalAt, perlin, rnd, trees } from './terrain';
import { BLEND, PLAGNE } from './world-data';



/* ---------------- Trees & rocks ---------------- */
export function makeFirGeometry() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.14, 0.22, 1.8, 5, 1, true); trunk.translate(0, 0.9, 0); parts.push({ g: trunk, c: '#4a3426' });
  [[2.1, 3.4, 1.0], [1.65, 3.0, 2.6], [1.2, 2.6, 4.1], [0.72, 2.2, 5.5]].forEach(([r, h, y], i) => {
    const cone = new THREE.ConeGeometry(r, h, 7, 1, true); cone.rotateY(i * 0.6); cone.translate(0, y + h / 2, 0); parts.push({ g: cone, c: i % 2 ? '#1d4630' : '#234f39' });
    const cap = new THREE.ConeGeometry(r * 0.6, h * 0.5, 7, 1, true); cap.rotateY(i * 0.6 + 0.45); cap.translate(0, y + h * 0.75 + 0.05, 0); parts.push({ g: cap, c: '#e8eff7' });
  });
  return mergeParts(parts);
}

/* ---- T8 : couverture du sol d'après OpenStreetMap (bois, roche nue, éboulis ; tools/osm_landcover.py) ----
   Raster de 4 m sur le secteur : 1 = bois, 2 = roche nue, 3 = éboulis, 0 = autre. Les essences ne sont pas dans
   les données : le mélange épicéas / mélèzes est un choix du jeu (voir treeSpecies). */
export const COVER = { res: 4, n: 0, grid: null, wood: 0, wide: null };
export function coverAt(x, z) {
  const C = COVER; if (!C.grid) return 0;
  const ix = Math.floor((x + HALF) / C.res), iz = Math.floor((z + HALF) / C.res);
  return ix < 0 || iz < 0 || ix >= C.n || iz >= C.n ? 0 : C.grid[iz * C.n + ix];
}
function buildCover() {
  const C = COVER, list = PLAGNE && PLAGNE.landcover;
  if (!list || !list.length) return false;
  C.n = Math.ceil(WORLD / C.res); C.grid = new Uint8Array(C.n * C.n);
  const fill = (ring, v) => {   // remplissage par lignes (règle pair-impair), au centre des mailles
    let z0 = Infinity, z1 = -Infinity; for (const p of ring) { z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const r0 = clamp(Math.floor((z0 + HALF) / C.res), 0, C.n - 1), r1 = clamp(Math.ceil((z1 + HALF) / C.res), 0, C.n - 1), xs = [];
    for (let r = r0; r <= r1; r++) {
      const zc = -HALF + (r + 0.5) * C.res; xs.length = 0;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xa, za] = ring[j], [xb, zb] = ring[i];
        if ((za > zc) !== (zb > zc)) xs.push(xa + (zc - za) / (zb - za) * (xb - xa));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = clamp(Math.ceil((xs[k] + HALF) / C.res - 0.5), 0, C.n), c1 = clamp(Math.floor((xs[k + 1] + HALF) / C.res - 0.5), -1, C.n - 1);
        for (let c = c0; c <= c1; c++) C.grid[r * C.n + c] = v;
      }
    }
  };
  const code = { wood: 1, rock: 2, scree: 3 };
  for (const k of ['wood', 'scree', 'rock']) for (const f of list) if (f.k === k) { fill(f.poly, code[k]); for (const h of f.holes || []) fill(h, 0); }
  for (let i = 0; i < C.grid.length; i++) if (C.grid[i] === 1) C.wood++;
  // bois débordant du secteur (polygones qui le touchent) : raster lâche de 10 m pour l'horizon (tunnels.ts)
  const W = { res: 10, half: HALF + 1300, n: 0, grid: null }; W.n = Math.ceil(2 * W.half / W.res); W.grid = new Uint8Array(W.n * W.n);
  { const fillW = (ring) => { let z0 = Infinity, z1 = -Infinity; for (const p of ring) { z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
      const r0 = clamp(Math.floor((z0 + W.half) / W.res), 0, W.n - 1), r1 = clamp(Math.ceil((z1 + W.half) / W.res), 0, W.n - 1), xs = [];
      for (let r = r0; r <= r1; r++) { const zc = -W.half + (r + 0.5) * W.res; xs.length = 0;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xa, za] = ring[j], [xb, zb] = ring[i]; if ((za > zc) !== (zb > zc)) xs.push(xa + (zc - za) / (zb - za) * (xb - xa)); }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) { const c0 = clamp(Math.ceil((xs[k] + W.half) / W.res - 0.5), 0, W.n), c1 = clamp(Math.floor((xs[k + 1] + W.half) / W.res - 0.5), -1, W.n - 1); for (let c = c0; c <= c1; c++) W.grid[r * W.n + c] = 1; } } };
    for (const f of list) if (f.k === 'wood') fillW(f.poly); }
  C.wide = W;
  return true;
}
export function coverWideAt(x, z) {
  const W = COVER.wide; if (!W) return 0;
  const ix = Math.floor((x + W.half) / W.res), iz = Math.floor((z + W.half) / W.res);
  return ix < 0 || iz < 0 || ix >= W.n || iz >= W.n ? 0 : W.grid[iz * W.n + ix];
}
const woodNear = (x, z, r) => { for (let a = 0; a < 8; a++) if (coverAt(x + Math.cos(a * 0.785) * r, z + Math.sin(a * 0.785) * r) === 1) return true; return false; };
const woodEdge = (x, z) => { for (let a = 0; a < 8; a++) if (coverAt(x + Math.cos(a * 0.785) * 9, z + Math.sin(a * 0.785) * 9) !== 1) return true; return false; };

/* Essence (choix du jeu, pas une donnée) : le mélèze, pionnier, domine vers la limite des arbres, en lisière et sur
   les arbres isolés ; il pousse en peuplements (bruit à l'échelle de ~150 m), d'où peu de morceaux proches mixtes. */
export function larchScore(x, z, alt) { return 0.11 + 0.42 * smoothstep(1780, 2080, alt) + 0.55 * perlin(x * 0.0068 + 11.3, z * 0.0068 - 5.7); }
export function treeSpecies(x, z, alt, edge, scattered, R) {
  const p = larchScore(x, z, alt) + (edge ? 0.1 : 0) + (scattered ? 0.18 : 0);
  return p + (R() - 0.5) * 0.16 > 0.5 ? 1 : 0;
}

/* Les anciens tirages du générateur partagé `rnd`, refaits à l'identique (candidats, mélange, 8 tirages par arbre) :
   la suite de `rnd` (rochers, horizon, PNJ) reste celle de T7. Renvoie les anciens candidats [x, z, s]. */
function legacyTreeDraws() {
  const sp = Q.spacing, n = Math.floor(WORLD / sp), nrm = new V3();
  const cand = [];
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
    const x = -HALF + (ix + rnd()) * sp, z = -HALF + (iz + rnd()) * sp;
    if (Math.abs(x) > HALF - 30 || Math.abs(z) > HALF - 30) continue;
    const y = gridH(x, z), alt = y + ALT0;
    const tl = 2110 + perlin(x * 0.006, z * 0.006) * 70;
    if (alt > tl) continue;
    if (isClear(x, z)) continue;
    let d = smoothstep(-0.12, 0.16, fbm(x * 0.0042 + 40, z * 0.0042 - 12, 3));
    d *= smoothstep(tl, tl - 140, alt);
    if (!PLAGNE && z > 1150 && Math.abs(x) < 320) d *= 0.25;
    if (rnd() > d * 0.9 + 0.012) continue;
    normalAt(x, z, nrm); if (nrm.y < 0.78) continue;
    cand.push([x, z, (0.75 + rnd() * 0.75) * (alt < 1900 ? 1.1 : 0.9)]);
  }
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = cand[i]; cand[i] = cand[j]; cand[j] = t; }
  cand.length = Math.min(cand.length, Q.trees);
  for (let k = 0; k < cand.length * 8; k++) rnd();   // rotation (3), échelle (3), teinte (2) de l'ancien placement
  return cand;
}

/* T8 : forêts aux emplacements OSM (bois et forêts), arbres isolés ailleurs sous la limite des arbres. */
function coverTrees(legacy, R) {
  const out = [], nrm = new V3(), budget = Q.trees, areaW = COVER.wood * COVER.res * COVER.res;
  const spW = Math.max(Q.spacing * 0.9, Math.sqrt(areaW * 0.62 / (budget * 0.88)));   // ~62 % des mailles gardées
  const nW = Math.ceil(WORLD / spW);
  for (let iz = 0; iz < nW; iz++) for (let ix = 0; ix < nW; ix++) {
    const x = -HALF + (ix + R()) * spW, z = -HALF + (iz + R()) * spW;
    if (Math.abs(x) > HALF - 30 || Math.abs(z) > HALF - 30 || coverAt(x, z) !== 1 || isClear(x, z)) continue;
    const alt = gridH(x, z) + ALT0; if (alt > 2300) continue;
    normalAt(x, z, nrm); if (nrm.y < 0.7) continue;                       // trop raide : la roche prend le relais
    const edge = woodEdge(x, z);
    let d = 0.45 + 0.55 * smoothstep(-0.28, 0.18, fbm(x * 0.011 + 7.1, z * 0.011 - 3.3, 3));   // bouquets et trouées
    if (edge) d *= 0.72;
    if (R() > d) continue;
    out.push([x, z, (0.75 + R() * 0.75) * (alt < 1900 ? 1.1 : 0.95), treeSpecies(x, z, alt, edge, false, R)]);
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = out[i]; out[i] = out[j]; out[j] = t; }
  out.length = Math.min(out.length, Math.round(budget * 0.9));
  // arbres isolés et petits groupes hors des bois, plus nombreux près des lisières ; jamais sur la roche ni les éboulis
  const scattered = [];
  for (const [x, z, s] of legacy) {
    if (coverAt(x, z) !== 0) continue;
    const alt = gridH(x, z) + ALT0, p = alt > 2060 ? 0.03 : woodNear(x, z, 35) ? 0.32 : 0.09;
    if (R() < p) scattered.push([x, z, s * 0.95, treeSpecies(x, z, alt, false, true, R)]);
  }
  return out.concat(scattered.slice(0, Math.max(0, budget - out.length)));
}

/* Silhouette lointaine commune aux deux essences (blender/larch.py) : la forme et les couleurs du mélèze sont des
   attributs de plus (aPos2, aNrm2, aCol2), choisis par instance (iSp) dans le nuanceur — aucun appel de dessin de plus. */
function farTreeGeometry() {
  const g0 = BLEND.geo.conifer_far, d = g0 && g0.morphAttributes.position && g0.morphAttributes.position[0], c2 = g0 && g0.getAttribute('_col2');
  if (!d || !c2) return BLEND.geo.spruce_far ? BLEND.geo.spruce_far.clone() : makeFirGeometry();
  const g = new THREE.BufferGeometry(), P = g0.getAttribute('position'), n = P.count, p2 = new Float32Array(n * 3), col2 = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { p2[i * 3] = P.getX(i) + d.getX(i); p2[i * 3 + 1] = P.getY(i) + d.getY(i); p2[i * 3 + 2] = P.getZ(i) + d.getZ(i); col2[i * 3] = c2.getX(i); col2[i * 3 + 1] = c2.getY(i); col2[i * 3 + 2] = c2.getZ(i); }
  for (const k of ['position', 'normal', 'color', 'uv']) if (g0.getAttribute(k)) g.setAttribute(k, g0.getAttribute(k));
  g.setIndex(g0.index);
  const tmp = new THREE.BufferGeometry(); tmp.setAttribute('position', new THREE.BufferAttribute(p2, 3)); tmp.setIndex(g0.index); tmp.computeVertexNormals();
  g.setAttribute('aPos2', new THREE.BufferAttribute(p2, 3)); g.setAttribute('aNrm2', tmp.getAttribute('normal')); g.setAttribute('aCol2', new THREE.BufferAttribute(col2, 3));
  g.userData.species = true;
  return g;
}
function speciesPatch(sh, depth) {
  sh.vertexShader = patchShader(sh.vertexShader, '#include <common>', '#include <common>\nattribute float iSp;\nattribute vec3 aPos2;\nattribute vec3 aNrm2;\nattribute vec3 aCol2;', 'species');
  sh.vertexShader = patchShader(sh.vertexShader, '#include <begin_vertex>', '#include <begin_vertex>\n  transformed = mix( transformed, aPos2, iSp );', 'species');
  if (depth) return;
  sh.vertexShader = patchShader(sh.vertexShader, '#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n  objectNormal = mix( objectNormal, aNrm2, iSp );', 'species');
  sh.vertexShader = patchShader(sh.vertexShader, '#include <color_vertex>', `#include <color_vertex>
#ifdef USE_COLOR
  vColor.rgb = mix( color.rgb, aCol2, iSp );
  #ifdef USE_INSTANCING_COLOR
    vColor.rgb *= instanceColor.rgb;
  #endif
#endif`, 'species');
}
export function speciesMaterials(base) {
  const hook = base.onBeforeCompile;
  base.onBeforeCompile = function (sh, r) { hook.call(this, sh, r); speciesPatch(sh, false); };
  base.customProgramCacheKey = () => 'vds-species';
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = sh => speciesPatch(sh, true); depth.customProgramCacheKey = () => 'vds-species-depth';
  return { mat: base, depth };
}
/** géométrie d'un morceau : attributs partagés (un seul envoi au GPU), essence par instance */
function chunkGeometry(geo, ids, bs) {
  const g = new THREE.BufferGeometry();
  for (const [k, a] of Object.entries(geo.attributes)) g.setAttribute(k, a);
  if (geo.index) g.setIndex(geo.index);
  if (geo.userData.species) g.setAttribute('iSp', new THREE.InstancedBufferAttribute(Float32Array.from(ids, i => trees.sp[i]), 1));
  g.boundingSphere = bs; return g;
}

export function placeTrees() {
  const legacy = legacyTreeDraws(), R = mulberry32(80833);   // T8 : générateur propre au placement
  const list = buildCover() ? coverTrees(legacy, R) : legacy.map(([x, z, s]) => [x, z, s, 0]);
  trees.sp = [];
  for (const [x, z, s, sp] of list) {
    const i = trees.x.length; trees.x.push(x); trees.z.push(z); trees.s.push(s); trees.sp.push(sp);
    const key = Math.floor((x + HALF) / TC) + Math.floor((z + HALF) / TC) * 1000;
    let l = trees.grid.get(key); if (!l) trees.grid.set(key, l = []); l.push(i);
  }
  // instanced chunks for frustum culling
  const geo = farTreeGeometry();   // Blender silhouette when available
  const { mat, depth } = speciesMaterials(lambertVC({ side: THREE.DoubleSide, map: TEX.needle }));
  trees.farSpecies = !!geo.userData.species;
  const CH = 350, nc = WORLD / CH, buckets = Array.from({ length: nc * nc }, () => []);
  for (let i = 0; i < trees.x.length; i++) buckets[clamp(Math.floor((trees.x[i] + HALF) / CH), 0, nc - 1) + clamp(Math.floor((trees.z[i] + HALF) / CH), 0, nc - 1) * nc].push(i);
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  trees.mat = new Float32Array(trees.x.length * 16); trees.tint = new Float32Array(trees.x.length); trees.farMesh = []; trees.farK = new Int32Array(trees.x.length); trees.farMeshes = [];
  buckets.forEach((b, ci) => {
    if (!b.length) return;
    const cx = -HALF + (ci % nc + 0.5) * CH, cz = -HALF + (Math.floor(ci / nc) + 0.5) * CH;
    let cy = 0; b.forEach(i => cy += gridH(trees.x[i], trees.z[i])); cy /= b.length;
    const mesh = new THREE.InstancedMesh(chunkGeometry(geo, b, new THREE.Sphere(new V3(0, 0, 0), 420)), mat, b.length);
    mesh.position.set(cx, cy, cz); mesh.castShadow = true; if (trees.farSpecies) mesh.customDepthMaterial = depth;
    b.forEach((i, k) => {
      const s = trees.s[i];
      dummy.position.set(trees.x[i] - cx, gridH(trees.x[i], trees.z[i]) - cy - 0.3, trees.z[i] - cz);
      dummy.rotation.set((R() - 0.5) * 0.06, R() * 6.28, (R() - 0.5) * 0.06);
      dummy.scale.set(s * (0.9 + R() * 0.2), s * (0.95 + R() * 0.25), s * (0.9 + R() * 0.2));
      dummy.updateMatrix(); mesh.setMatrixAt(k, dummy.matrix);
      const v = (0.82 + R() * 0.3) * lerp(0.6, 1, sunVis(trees.x[i], trees.z[i], gridH(trees.x[i], trees.z[i]) + 5)); tint.setRGB(v, v * (0.97 + R() * 0.06), v); mesh.setColorAt(k, tint);
      dummy.position.x += cx; dummy.position.y += cy; dummy.position.z += cz; dummy.updateMatrix(); dummy.matrix.toArray(trees.mat, i * 16);
      trees.tint[i] = v; trees.farMesh[i] = mesh; trees.farK[i] = k;
    });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.userData.inv = new THREE.Matrix4().makeTranslation(-cx, -cy, -cz); trees.farMeshes.push(mesh);
    mesh.layers.set(TREE_LAYER); scene.add(mesh);
  });
  // shadow proxies for the far cascade: every tree as the 70-triangle silhouette, in 350 m chunks (T4 : 175 m auparavant) with tight bounds,
  // seen only by the far shadow camera (the real trees keep casting into the sharp near map) ; T8 : silhouette de son essence
  {
    const C2 = 350, n2 = Math.ceil(WORLD / C2), b2 = Array.from({ length: n2 * n2 }, () => []), m4 = new THREE.Matrix4(), pm = lambertVC();
    for (let i = 0; i < trees.x.length; i++) b2[clamp(Math.floor((trees.x[i] + HALF) / C2), 0, n2 - 1) + clamp(Math.floor((trees.z[i] + HALF) / C2), 0, n2 - 1) * n2].push(i);
    b2.forEach((b, ci) => {
      if (!b.length) return;
      const cx = -HALF + (ci % n2 + 0.5) * C2, cz = -HALF + (Math.floor(ci / n2) + 0.5) * C2; let cy = 0; b.forEach(i => cy += gridH(trees.x[i], trees.z[i])); cy /= b.length;
      let ry = 0; b.forEach(i => ry = Math.max(ry, Math.abs(gridH(trees.x[i], trees.z[i]) - cy)));
      const g = new THREE.BufferGeometry(); g.setAttribute('position', geo.getAttribute('position')); if (geo.index) g.setIndex(geo.index);
      if (trees.farSpecies) { g.setAttribute('aPos2', geo.getAttribute('aPos2')); g.setAttribute('iSp', new THREE.InstancedBufferAttribute(Float32Array.from(b, i => trees.sp[i]), 1)); }
      g.boundingSphere = new THREE.Sphere(new V3(0, 6, 0), C2 * 0.72 + ry + 14);
      const pmesh = new THREE.InstancedMesh(g, pm, b.length); pmesh.position.set(cx, cy, cz); pmesh.castShadow = true; pmesh.layers.set(PROXY_LAYER);
      if (trees.farSpecies) pmesh.customDepthMaterial = depth;
      b.forEach((i, k) => { m4.fromArray(trees.mat, i * 16); m4.elements[12] -= cx; m4.elements[13] -= cy; m4.elements[14] -= cz; pmesh.setMatrixAt(k, m4); });
      pmesh.instanceMatrix.needsUpdate = true; scene.add(pmesh);
    });
  }
}

/* Anciens tirages de `rnd` pour les rochers (boucle d'essais, taille, puis 6 tirages par rocher), refaits à l'identique. */
function legacyRockDraws() {
  const nrm = new V3(); let kept = 0;
  for (let i = 0; i < 9000 && kept < 1400; i++) {
    const x = (rnd() * 2 - 1) * (HALF - 40), z = (rnd() * 2 - 1) * (HALF - 40);
    normalAt(x, z, nrm); if (nrm.y > 0.74 || isClear(x, z)) continue;
    rnd(); kept++;
  }
  for (let k = 0; k < kept * 6; k++) rnd();
}

/* T8 : blocs dans la roche nue et les éboulis d'OSM, blocs épars sur les pentes raides, et barres rocheuses : des
   chapelets de dalles allongées le long des courbes de niveau, là où la pente dépasse ~45° (relief visuel seulement,
   le relief du jeu H() est inchangé). Renvoie [x, z, sx, sy, sz, yaw, tilt, kind]. */
function coverRocks(R) {
  const out = [], nrm = new V3(), cap = IS_TOUCH ? 1900 : 3400, ok = (x, z) => Math.abs(x) < HALF - 30 && Math.abs(z) < HALF - 30 && !isClear(x, z);
  const grid = (sp, want, each) => { const n = Math.ceil(WORLD / sp); for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) { const x = -HALF + (ix + R()) * sp, z = -HALF + (iz + R()) * sp; if (coverAt(x, z) === want && ok(x, z)) each(x, z); } };
  if (COVER.grid) {
    grid(6.5, 2, (x, z) => { if (R() < 0.5) { const s = 1.1 + R() * 3.2; out.push([x, z, s * (0.8 + R() * 0.6), s * (0.5 + R() * 0.4), s * (0.8 + R() * 0.6), R() * 6.28, 0, 0]); } });     // roche nue
    grid(3.6, 3, (x, z) => { if (R() < 0.6) { const s = 0.35 + R() * 1.1; out.push([x, z, s * (0.8 + R() * 0.6), s * (0.5 + R() * 0.4), s * (0.8 + R() * 0.6), R() * 6.28, 0, 1]); } });   // éboulis
  }
  // barres rocheuses : départs sur les mailles les plus raides, puis la dalle suit la courbe de niveau
  const bands = [];
  for (let i = 0; i < 60000 && bands.length < (IS_TOUCH ? 110 : 190); i++) {
    const x = (R() * 2 - 1) * (HALF - 60), z = (R() * 2 - 1) * (HALF - 60);
    normalAt(x, z, nrm); if (nrm.y > 0.72 || !ok(x, z) || coverAt(x, z) === 1) continue;
    if (bands.some(([bx, bz]) => Math.abs(bx - x) < 40 && Math.abs(bz - z) < 40)) continue;
    bands.push([x, z]);
    let px = x, pz = z, dir = R() < 0.5 ? 1 : -1;
    const m = 3 + Math.floor(R() * 6);
    for (let k = 0; k < m; k++) {
      normalAt(px, pz, nrm); if (nrm.y > 0.8 || !ok(px, pz)) break;
      const gl = Math.hypot(nrm.x, nrm.z) || 1, gx = nrm.x / gl, gz = nrm.z / gl, tx = -gz * dir, tz = gx * dir;   // (gx, gz) : vers l'aval
      const L = 6 + R() * 6, h = 3 + R() * 4, dp = 3 + R() * 2.5;
      // local x le long de la courbe de niveau, face exposée verticale vers l'aval, sommet un peu penché vers l'amont
      out.push([px, pz, L, h, dp, Math.atan2(-tz, tx), Math.acos(clamp(nrm.y, -1, 1)) * 0.2 * dir, 2]);
      // une seconde strate, plus courte, un peu plus haut dans la pente (gradins)
      if (R() < 0.55) { const ux = px - gx * (h * 0.9 + 1.5), uz = pz - gz * (h * 0.9 + 1.5); if (ok(ux, uz)) out.push([ux + tx * (R() - 0.5) * L * 0.4, uz + tz * (R() - 0.5) * L * 0.4, L * 0.65, h * 0.7, dp * 0.8, Math.atan2(-tz, tx), Math.acos(clamp(nrm.y, -1, 1)) * 0.2 * dir, 2]); }
      px += tx * L * 0.82 + gx * (R() - 0.5) * 1.5; pz += tz * L * 0.82 + gz * (R() - 0.5) * 1.5;
    }
  }
  // blocs épars sur les pentes raides (comme avant T8), hors des bois
  for (let i = 0; i < 12000 && out.length < cap; i++) {
    const x = (R() * 2 - 1) * (HALF - 40), z = (R() * 2 - 1) * (HALF - 40);
    normalAt(x, z, nrm); if (nrm.y > 0.74 || !ok(x, z) || coverAt(x, z) === 1) continue;
    const s = 1 + R() * 3.5; out.push([x, z, s * (0.8 + R() * 0.6), s * (0.5 + R() * 0.4), s * (0.8 + R() * 0.6), R() * 6.28, 0, 0]);
  }
  rocks.bands = bands.length;
  return out.slice(0, cap + (IS_TOUCH ? 500 : 900));
}

export function placeRocks() {
  legacyRockDraws();
  const R = mulberry32(55021), q = new THREE.Quaternion(), e = new THREE.Euler();
  let list;
  if (COVER.grid) list = coverRocks(R);
  else {   // relief procédural (sans données) : comme avant T8, avec le générateur propre
    list = []; const nrm = new V3();
    for (let i = 0; i < 9000 && list.length < 1400; i++) { const x = (R() * 2 - 1) * (HALF - 40), z = (R() * 2 - 1) * (HALF - 40); normalAt(x, z, nrm); if (nrm.y > 0.74 || isClear(x, z)) continue; const s = 1 + R() * 3.5; list.push([x, z, s * (0.8 + R() * 0.6), s * (0.5 + R() * 0.4), s * (0.8 + R() * 0.6), R() * 6.28, 0, 0]); }
  }
  const geo = new THREE.DodecahedronGeometry(1, 0); geo.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(geo, pbr({ color: '#8a8682', map: TEX.rockA }), list.length);
  const d = new THREE.Object3D();
  rocks.mat = new Float32Array(list.length * 16); rocks.mesh = mesh; rocks.kind = new Uint8Array(list.length); NEAR.rockMat = lambertVC(); mesh.layers.set(SMALL_LAYER);
  list.forEach(([x, z, sx, sy, sz, yaw, tilt, kind], i) => {
    rocks.kind[i] = kind;
    if (kind === 2) {   // dalle de barre rocheuse : couchée dans la pente, face exposée vers l'aval, à moitié enterrée côté amont
      d.position.set(x, gridH(x, z) - sy * 0.18, z); e.set(tilt, yaw, 0, 'YXZ'); d.quaternion.setFromEuler(e); d.scale.set(sx * 0.5, sy * 0.75, sz * 0.5);
    } else { d.position.set(x, gridH(x, z) - sy * 0.25, z); d.rotation.set(R() * 3, yaw, R() * 3); d.scale.set(sx, sy, sz); }
    d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
    // near version: same place and size, kept upright so the snow stays on top
    if (kind === 2) { d.scale.set(sx * 0.5, sy * 0.85, sz * 0.5); d.position.y = gridH(x, z) - sy * 0.1; }
    else { d.rotation.set(0, yaw, 0); d.position.y = gridH(x, z) - sy * 0.12; d.scale.set(sx * 0.95, sy * 1.2, sz * 0.95); }
    d.updateMatrix(); d.matrix.toArray(rocks.mat, i * 16); rocks.x.push(x); rocks.z.push(z);
  });
  mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
}

export function __init_2016() {

}
