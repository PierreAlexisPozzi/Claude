// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « assembly ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { FLOOR, VILLAGES, liftDist } from './buildings';
import { IS_TOUCH, V3, colorCanvasTex, lerp, patchShader } from './core';
import { updateNearTowers } from './lifts';
import { detailMat, interiorMat, lambertVC, pbr } from './materials';
import { ZERO_M } from './npcs';
import { CUR_BLD, PEOPLE, SHOP_ANCHORS, __set_CUR_BLD, bldToWorld, placePeople, spotClear } from './people';
import { LIFTS, PISTES, pisteHeading, zoneAt } from './pistes';
import { SMALL_LAYER, TREE_LAYER, scene } from './render';
import { POOLS, setShellHidden } from './batch';
import { updateLabels } from './furniture';
import { H, HALF, gridH, minimapImg, mulberry32, obstacles, trees } from './terrain';
import { BLEND } from './world-data';

export const ABORDS = { n: 0 };
export let ATOM, MATTER_MAT, matCache, mmat, hashSeed, _am, _av, _au, _an, _ay, _ac, NEAR, BUILDINGS, onFace, SHOP_N, shopCol, X1, Z1, rocks, FURN, netMat, SKI_COLS, blob, v3;


export function atomGeo(name) {
  if (ATOM[name]) return ATOM[name];
  if (name === 'snowslab' || name === 'baluster' || name === 'skis' || name === 'snowboard') return ATOM[name] = BLEND.geo[name].clone();   // Blender modules (unit cube space)
  let g;
  switch (name) {
    case 'box': g = new THREE.BoxGeometry(1, 1, 1); break;                                   // planks, stones, beams, boards
    case 'frond': g = new THREE.OctahedronGeometry(0.5, 0); break;                           // a flat fan of needles
    case 'lump': g = new THREE.IcosahedronGeometry(0.5, 0); break;                           // a clump of snow, a pebble
    case 'seg': g = new THREE.CylinderGeometry(0.5, 0.5, 1, 6, 1, true); g.translate(0, 0.5, 0); break;   // trunk segment
    case 'twig': g = new THREE.CylinderGeometry(0.5, 0.5, 1, 4, 1, true); g.translate(0, 0.5, 0); break;  // branch
    case 'puff': g = new THREE.OctahedronGeometry(0.5, 0); break;                                               // light snow clump
    case 'icicle': g = new THREE.ConeGeometry(0.5, 1, 5, 1, true); g.rotateX(Math.PI); g.translate(0, -0.5, 0); break;
    case 'cap': g = new THREE.LatheGeometry([[0, 0], [0.25, 0.035], [0.43, 0.13], [0.5, 0.25], [0.5, 0.75], [0.43, 0.87], [0.25, 0.965], [0, 1]].map(q => new THREE.Vector2(q[0], q[1])), 10); break;   // rounded limb
    case 'ball': g = new THREE.SphereGeometry(0.5, 10, 8); break;
    case 'spire': g = new THREE.ConeGeometry(0.5, 1, 8, 1, true); g.translate(0, 0.5, 0); break;
    case 'disc': g = new THREE.CylinderGeometry(0.5, 0.5, 1, 14); break;                                   // wheel, flange
    case 'ring': g = new THREE.TorusGeometry(0.5, 0.03, 6, 36); break;                                     // bullwheel rim
  }
  return ATOM[name] = g;
}

export class Assembly {
  constructor(seed) { this.r = mulberry32(seed); this.parts = new Map(); this.count = 0; }
  // place one atom: centre, local axes (u across, v up, n out), sizes along each, colour
  put(atom, mat, cx, cy, cz, u, v, n, su, sv, sn, color) {
    const k = atom + '|' + mat; let l = this.parts.get(k); if (!l) this.parts.set(k, l = []);
    _am.makeBasis(u, v, n); _am.scale(_av.set(su, sv, sn)); _am.setPosition(cx, cy, cz);
    l.push(_am.elements.slice(), typeof color === 'string' ? new THREE.Color(color) : color.clone ? color.clone() : new THREE.Color(color));
    this.count++;
  }
  jit(c, amt) { const k = 1 + (this.r() - 0.5) * amt; return _ac.copy(new THREE.Color(c)).multiplyScalar(k).clone(); }
  // near version for a placed object: one instanced mesh per (atom, material), with a real bounding sphere
  toGroup(radius) {
    const g = new THREE.Group(); g.userData.radius = radius;
    for (const [k, l] of this.parts) {
      const [atom, mat] = k.split('|'), n = l.length / 2;
      const geo = atomGeo(atom).clone(); geo.boundingSphere = new THREE.Sphere(new V3(0, 0, 0), radius); geo.userData.atom = atom;
      const m = new THREE.InstancedMesh(geo, mmat(mat), n);
      for (let i = 0; i < n; i++) { _am.fromArray(l[i * 2]); m.setMatrixAt(i, _am); m.setColorAt(i, l[i * 2 + 1]); }
      m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true;
      m.castShadow = !/^(lit|glass|win|winlit|winshop|winlift)$/.test(mat); m.receiveShadow = true;
      g.add(m);
    }
    return g;
  }
  // one merged, indexed geometry with vertex colours (a prototype that is then instanced whole, e.g. a fir)
  toGeometry() {
    let nv = 0, ni = 0; const items = [];
    for (const [k, l] of this.parts) { const g = atomGeo(k.split('|')[0]); for (let i = 0; i < l.length; i += 2) { items.push([g, l[i], l[i + 1]]); nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; } }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint32Array(ni);
    let ov = 0, oi = 0; const m = new THREE.Matrix4(), nm = new THREE.Matrix3(), p = new V3();
    for (const [g, e, c] of items) {
      m.fromArray(e); nm.getNormalMatrix(m);
      const gp = g.attributes.position, gn = g.attributes.normal, n = gp.count;
      for (let i = 0; i < n; i++) {
        p.fromBufferAttribute(gp, i).applyMatrix4(m); pos[(ov + i) * 3] = p.x; pos[(ov + i) * 3 + 1] = p.y; pos[(ov + i) * 3 + 2] = p.z;
        p.fromBufferAttribute(gn, i).applyMatrix3(nm).normalize(); nor[(ov + i) * 3] = p.x; nor[(ov + i) * 3 + 1] = p.y; nor[(ov + i) * 3 + 2] = p.z;
        col[(ov + i) * 3] = c.r; col[(ov + i) * 3 + 1] = c.g; col[(ov + i) * 3 + 2] = c.b;
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx[oi++] = g.index.getX(i) + ov; else for (let i = 0; i < n; i++) idx[oi++] = i + ov;
      ov += n;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
    return geo;
  }
}

// orient an atom along a direction (its local y axis follows d)
export function axesAlong(d, out) {
  const v = d.clone().normalize(), t = Math.abs(v.y) < 0.95 ? new V3(0, 1, 0) : new V3(1, 0, 0);
  const u = new V3().crossVectors(t, v).normalize(), n = new V3().crossVectors(u, v).normalize();
  out.u = u; out.v = v; out.n = n; return out;
}


/* ---- the fir: trunk, whorls of drooping branches, fans of needles, snow resting on top ---- */
// same envelope as the far fir (≈7.6 m tall, 2.1 m wide at the base) so the near/far switch keeps the silhouette
export function firPrototype(seed) {
  const A = new Assembly(seed), r = A.r, ax = {};
  const BARK = '#4a3426', NEEDLE = ['#1d4630', '#234f39', '#1a3f2b', '#28563d'], SNOW = '#eef3f8';
  for (let k = 0; k < 6; k++) { const y0 = k * 1.25, r0 = 0.2 * (1 - y0 / 7.8) + 0.03; A.put('seg', 'wood', 0, y0, 0, new V3(1, 0, 0), new V3(0, 1, 0), new V3(0, 0, 1), r0 * 2, 1.3, r0 * 2, A.jit(BARK, 0.2)); }
  A.put('frond', 'wood', 0, 7.45, 0, new V3(1, 0, 0), new V3(0, 1, 0), new V3(0, 0, 1), 0.35, 0.7, 0.35, A.jit(NEEDLE[1], 0.15));
  A.put('lump', 'wood', 0, 7.6, 0, new V3(1, 0, 0), new V3(0, 1, 0), new V3(0, 0, 1), 0.22, 0.18, 0.22, A.jit(SNOW, 0.04));
  for (let y = 0.95; y < 7.2; y += 0.5 + r() * 0.08) {
    const h = (y - 0.95) / 6.4, R = 2.1 * Math.pow(1 - h, 0.92) + 0.18, nb = y < 6 ? 5 : 4, off = r() * 6.28;
    for (let b = 0; b < nb; b++) {
      const th = off + b / nb * Math.PI * 2 + (r() - 0.5) * 0.4, L = R * (0.85 + r() * 0.25), dir = new V3(Math.sin(th), 0, Math.cos(th));
      // one branch, drooping under the snow, carrying two fans of needles (inner, outer) and a clump of snow
      const droop = -0.22 - h * 0.12, d = new V3(dir.x * Math.cos(droop), Math.sin(droop), dir.z * Math.cos(droop)), p = new V3(dir.x * 0.08, y, dir.z * 0.08);
      axesAlong(d, ax);
      A.put('twig', 'wood', p.x, p.y, p.z, ax.u, ax.v, ax.n, 0.055, L, 0.055, A.jit(BARK, 0.25));
      const fan = new V3().crossVectors(new V3(0, 1, 0), dir).normalize();
      for (const [t, wk, ln] of [[0.33, 1.0, 0.62], [0.74, 0.8, 0.5]]) {
        const q = p.clone().addScaledVector(d, L * t), wFan = (0.55 + 0.6 * wk) * Math.min(1, L / 1.3) + 0.2;
        A.put('frond', 'wood', q.x, q.y - 0.05, q.z, fan, new V3(0, 1, 0), d.clone().normalize(), wFan, 0.24, L * ln + 0.2, A.jit(NEEDLE[(b + Math.round(t * 3)) % 4], 0.18));
      }
      if (r() < 0.7 && y < 6.6) { const q = p.clone().addScaledVector(d, L * 0.45); A.put('puff', 'wood', q.x, q.y + 0.08, q.z, fan, new V3(0, 1, 0), d.clone().normalize(), 0.75 * Math.min(1, L / 1.3) + 0.15, 0.14, L * 0.55, A.jit(SNOW, 0.05)); }
    }
  }
  const geo = A.toGeometry();
  geo.boundingSphere = new THREE.Sphere(new V3(0, 4, 0), 70);   // one sphere covering a whole near chunk
  return { geo, atoms: A.count, tris: geo.index.count / 3 };
}

export function initNearTrees() {
  if (BLEND.geo.spruce_0 && BLEND.tex.spruce_needles) {
    // Blender spruces: needle sprays rendered from modelled shoots, alpha-tested cards, baked ambient occlusion
    NEAR.protos = [0, 1, 2].map(i => { const geo = BLEND.geo['spruce_' + i]; geo.boundingSphere = new THREE.Sphere(new V3(0, 4, 0), 70); return { geo, tris: geo.index.count / 3 }; });
    NEAR.mat = pbr({ vertexColors: true, side: THREE.DoubleSide, map: BLEND.tex.spruce_needles, alphaTest: 0.42, roughness: 0.82 }, [0.15, 0.3, 2.5]);
    NEAR.mat.alphaToCoverage = true;   // soft needle fringes with the MSAA target (plain alpha test without it)
  } else {
    NEAR.protos = [hashSeed(1, 2), hashSeed(3, 4), hashSeed(5, 6)].map(firPrototype);
    NEAR.mat = lambertVC({ side: THREE.DoubleSide });
  }
  const C = NEAR.chunk; NEAR.grid = new Map();
  for (let i = 0; i < trees.x.length; i++) { const k = Math.floor((trees.x[i] + HALF) / C) + Math.floor((trees.z[i] + HALF) / C) * 1000; let l = NEAR.grid.get(k); if (!l) NEAR.grid.set(k, l = []); l.push(i); }
}

export function setFar(i, on) { const m = trees.farMesh[i]; m.setMatrixAt(trees.farK[i], on ? _am.fromArray(trees.mat, i * 16).premultiply(m.userData.inv) : ZERO_M); m.userData.dirty = true; }

export function updateNearTrees(cam, maxBuild) {
  if (!NEAR.protos) return;
  const C = NEAR.chunk, R = NEAR.treeR, cx = Math.floor((cam.x + HALF) / C), cz = Math.floor((cam.z + HALF) / C), reach = Math.ceil(R / C) + 1;
  const want = new Set();
  for (let dz = -reach; dz <= reach; dz++) for (let dx = -reach; dx <= reach; dx++) {
    const k = cx + dx + (cz + dz) * 1000, ox = -HALF + (cx + dx + 0.5) * C, oz = -HALF + (cz + dz + 0.5) * C;
    if (Math.hypot(ox - cam.x, oz - cam.z) < R + C * 0.7 && NEAR.grid.has(k)) want.add(k);
  }
  let built = 0;
  for (const k of want) {
    if (NEAR.chunks.has(k) || built >= maxBuild) continue;
    const list = NEAR.grid.get(k), ox = -HALF + (k % 1000 + 0.5) * C, oz = -HALF + (Math.floor(k / 1000) + 0.5) * C, oy = gridH(ox, oz);
    const g = new THREE.Group(); g.position.set(ox, oy, oz);
    const byV = [[], [], []]; list.forEach(i => byV[i % 3].push(i));
    byV.forEach((ids, v) => {
      if (!ids.length) return;
      const m = new THREE.InstancedMesh(NEAR.protos[v].geo, NEAR.mat, ids.length), tint = new THREE.Color();
      ids.forEach((i, j) => { _am.fromArray(trees.mat, i * 16); _am.elements[12] -= ox; _am.elements[13] -= oy; _am.elements[14] -= oz; m.setMatrixAt(j, _am); m.setColorAt(j, tint.setScalar(trees.tint[i])); setFar(i, false); });
      m.castShadow = true; m.receiveShadow = true; m.layers.set(TREE_LAYER); g.add(m);
    });
    scene.add(g); NEAR.chunks.set(k, g); built++;
  }
  for (const [k, g] of NEAR.chunks) {
    if (want.has(k)) continue;
    const ox = -HALF + (k % 1000 + 0.5) * C, oz = -HALF + (Math.floor(k / 1000) + 0.5) * C;
    if (Math.hypot(ox - cam.x, oz - cam.z) < R + C * 1.6) continue;                 // hysteresis
    scene.remove(g); g.children.forEach(m => m.dispose && m.dispose());
    NEAR.grid.get(k).forEach(i => setFar(i, true)); NEAR.chunks.delete(k);
  }
  for (const m of trees.farMeshes) if (m.userData.dirty) { m.instanceMatrix.needsUpdate = true; m.userData.dirty = false; }
}

// one face of the building: origin at its left end on the ground line, u along it, n out of it
export function faces(w, d) {
  return [
    { o: new V3(-w / 2, 0, d / 2), u: new V3(1, 0, 0), n: new V3(0, 0, 1), L: w, front: true },
    { o: new V3(w / 2, 0, -d / 2), u: new V3(-1, 0, 0), n: new V3(0, 0, -1), L: w, back: true },
    { o: new V3(w / 2, 0, d / 2), u: new V3(0, 0, -1), n: new V3(1, 0, 0), L: d },
    { o: new V3(-w / 2, 0, -d / 2), u: new V3(0, 0, 1), n: new V3(-1, 0, 0), L: d },
  ];
}

export function freeSpans(F, y0, y1, holes, ext0 = 0, ext1 = 0) {
  // the parts of a row [y0,y1] that are not cut by a window or door
  let spans = [[-ext0, F.L + ext1]];
  for (const h of holes) if (h.F === F && y1 > h.v0 && y0 < h.v1) spans = spans.flatMap(([a, b]) => h.u1 <= a || h.u0 >= b ? [[a, b]] : [[a, h.u0], [h.u1, b]].filter(([p, q]) => q - p > 0.05));
  return spans;
}

export function stoneCourse(A, F, y0, y1, holes, col) {
  // irregular masonry: courses of different heights, stones of different lengths, each slightly proud of the wall
  for (let y = y0; y < y1 - 0.05;) {
    const h = Math.min(y1 - y, 0.24 + A.r() * 0.16);
    for (const [a, b] of freeSpans(F, y, y + h, holes)) for (let s = a; s < b - 0.05;) {
      const l = Math.min(b - s, 0.35 + A.r() * 0.55), dep = 0.25 + A.r() * 0.1;
      const p = onFace(F, s + l / 2, y + h / 2, 0.05 + A.r() * 0.04 - dep / 2);
      A.put('box', 'masonry', p.x, p.y, p.z, F.u, _ay, F.n, l - 0.035, h - 0.035, dep, A.jit(col, 0.32));
      s += l;
    }
    y += h;
  }
}

export function renderCourse(A, F, y0, y1, holes, col) {
  // smooth rendered wall in bands, cut around the openings, with a darker plinth band at the foot
  for (let y = y0; y < y1 - 0.02;) {
    const h = Math.min(y1 - y, 0.6);
    for (const [a, b] of freeSpans(F, y, y + h, holes)) { const p = onFace(F, (a + b) / 2, y + h / 2, -0.1); A.put('box', 'stone', p.x, p.y, p.z, F.u, _ay, F.n, b - a, h, 0.3, A.jit(y - y0 < 0.5 ? '#8f877a' : col, 0.025)); }
    y += h;
  }
}

export function logCourse(A, F, y0, y1, holes, col, rowParity) {
  // horizontal madriers; at the corners every other course runs past the wall, giving the interlocked log ends
  let row = 0;
  for (let y = y0; y < y1 - 0.05; y += 0.24, row++) {
    const ext = (row + rowParity) % 2 ? 0.28 : 0;
    for (const [a, b] of freeSpans(F, y, y + 0.24, holes, ext, ext)) {
      for (let s = a; s < b - 0.05;) { const l = Math.min(b - s, 2.5 + A.r() * 2.5); const p = onFace(F, s + l / 2, y + 0.12, 0.02); A.put('box', 'log', p.x, p.y, p.z, F.u, _ay, F.n, l - 0.01, 0.215, 0.16, A.jit(col, 0.18)); s += l; }
    }
  }
}

export function boardCladding(A, F, y0, y1, holes, col) {
  // vertical boards and battens, cut around the openings
  for (let s = 0.05; s < F.L - 0.05; s += 0.2) {
    const cut = holes.filter(h => h.F === F && s + 0.1 > h.u0 && s - 0.1 < h.u1).map(h => [h.v0, h.v1]).sort((a, b) => a[0] - b[0]);
    let y = y0;
    for (const [v0, v1] of [...cut, [y1, y1]]) {
      if (v0 > y + 0.05) { const p = onFace(F, s, (y + Math.min(v0, y1)) / 2, 0.03); A.put('box', 'plank', p.x, p.y, p.z, F.u, _ay, F.n, 0.185, Math.min(v0, y1) - y, 0.035, A.jit(col, 0.14)); }
      y = Math.max(y, v1);
    }
  }
}

   // shop index carried by the instance colour (window + sign)
export function shopFront(A, F, uc, yc, w, hh, depth, signY, signOut, signW) {
  let k = Math.floor(A.r() * SHOP_N);
  if (CUR_BLD) { const lp = onFace(F, uc, yc, depth), [wx, wz] = bldToWorld(CUR_BLD, lp.x, lp.z); for (const an of SHOP_ANCHORS) if (Math.hypot(an.x - wx, an.z - wz) < 2.6) k = an.shop; }   // within 2.6 m: the one or two bays facing the shopkeeper
  let p = onFace(F, uc, yc, depth); A.put('box', BLEND.tex.shops_atlas ? 'winshop' : 'winlit', p.x, p.y, p.z, F.u, _ay, F.n, w, hh, 0.04, BLEND.tex.shops_atlas ? shopCol(k) : A.jit('#f0c27c', 0.15));
  if (BLEND.tex.shop_signs) { p = onFace(F, uc, signY, signOut); const sw = signW || Math.min(w + 0.2, 4.2); A.put('box', 'sign', p.x, p.y, p.z, F.u, _ay, F.n, sw, Math.min(0.55, sw / 4), 0.04, shopCol(k)); }
}

export function windowAt(A, F, h, lit, shutters, wood) {
  const uc = (h.u0 + h.u1) / 2, w = h.u1 - h.u0, hh = h.v1 - h.v0, yc = (h.v0 + h.v1) / 2, FR = '#3a2412';
  let p = onFace(F, uc, yc, -0.1); A.put('box', lit ? 'winlit' : 'win',   // pane in front of the backing volume (its face is 0.125-0.15 m in)
   p.x, p.y, p.z, F.u, _ay, F.n, w, hh, 0.04, lit ? A.jit('#f3c27a', 0.15) : A.jit('#2b3644', 0.2));
  for (const [du, dv, su, sv] of [[0, hh / 2 + 0.02, w, 0.04], [0, -hh / 2 - 0.02, w, 0.04], [-w / 2 - 0.02, 0, 0.04, hh], [w / 2 + 0.02, 0, 0.04, hh]]) { p = onFace(F, uc + du, yc + dv, -0.11); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, su, sv, 0.26, A.jit('#5a3a22', 0.12)); }   // reveals
  for (const [du, dv, su, sv] of [[0, hh / 2 + 0.06, w + 0.24, 0.12], [0, -hh / 2 - 0.06, w + 0.24, 0.12], [-w / 2 - 0.06, 0, 0.12, hh + 0.24], [w / 2 + 0.06, 0, 0.12, hh + 0.24]]) { p = onFace(F, uc + du, yc + dv, 0.05); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, su, sv, 0.12, A.jit(FR, 0.15)); }
  for (const [du, su] of [[0, 0.05]]) { p = onFace(F, uc + du, yc, -0.06); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, su, hh, 0.06, A.jit(FR, 0.15)); }
  p = onFace(F, uc, h.v0 - 0.1, 0.12); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, w + 0.4, 0.09, 0.42, A.jit(wood, 0.15));
  p = onFace(F, uc, h.v0 + 0.02, 0.14); A.put('lump', 'snow', p.x, p.y, p.z, F.u, _ay, F.n, w + 0.1, 0.12, 0.26, A.jit('#f2f6fb', 0.04));
  if (shutters) for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) {        // shutters: five vertical slats each, a little ajar
    const us = uc + sd * (w / 2 + 0.05 + k * w / 10 + w / 20);
    p = onFace(F, us, yc, 0.07 + k * 0.012); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, w / 10 - 0.012, hh + 0.05, 0.035, A.jit(wood, 0.2));
  }
}

export function balcony(A, F, y, len, wood) {
  const s0 = (F.L - len) / 2;
  for (let k = 0; k < 4; k++) { const p = onFace(F, F.L / 2, y, 0.18 + k * 0.32); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, len, 0.06, 0.3, A.jit(wood, 0.12)); }   // deck boards
  for (let s = s0; s <= s0 + len; s += 0.85) { const p = onFace(F, s, y - 0.14, 0.62); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, 0.14, 0.2, 1.3, A.jit('#4a2e1a', 0.1)); }   // joist ends
  const carved = !!BLEND.tex.baluster_mask;   // Savoyard balustres découpés: Blender silhouette cut out of a board
  for (let s = s0 + 0.1; s < s0 + len - 0.05; s += 0.19) { const p = onFace(F, s, y + 0.5, 1.26); A.put('box', carved ? 'balcut' : 'wood', p.x, p.y, p.z, F.u, _ay, F.n, carved ? 0.19 : 0.13, 0.86, 0.035, A.jit(wood, 0.12)); }   // balusters
  for (const [yy, hh] of [[y + 0.95, 0.09], [y + 0.1, 0.08]]) { const p = onFace(F, F.L / 2, yy, 1.26); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, len, hh, 0.12, A.jit('#4a2e1a', 0.1)); }
  for (let s = s0; s <= s0 + len + 0.01; s += Math.max(2.5, len / Math.round(len / 3))) { const p = onFace(F, s, y + 0.5, 1.26); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, 0.16, 1.05, 0.16, A.jit('#4a2e1a', 0.1)); }
  // skis and snowboards left out on the balcony, leaning against the wall (about one balcony in two)
  if (BLEND.geo.skis && A.r() < 0.55) {
    const GEAR = ['#d8342c', '#1f5fbf', '#f2b51d', '#2a2d33', '#e8e8ea', '#2f9e6a', '#8e44ad', '#f07c1f'];
    for (let k = 0, n = 1 + Math.floor(A.r() * 3); k < n; k++) {
      const s = s0 + 0.5 + A.r() * Math.max(0.1, len - 1.0), lean = 0.1 + A.r() * 0.06, kind = A.r() < 0.62 ? 'skis' : 'snowboard';
      const v = _ay.clone().multiplyScalar(Math.cos(lean)).addScaledVector(F.n, -Math.sin(lean)), nn = F.n.clone().multiplyScalar(Math.cos(lean)).addScaledVector(_ay, Math.sin(lean));
      const p = onFace(F, s, y + 0.03, 0.06 + 1.7 * Math.sin(lean));
      A.put(kind, 'gear', p.x, p.y, p.z, F.u, v, nn, 1, 1, 1, A.jit(GEAR[Math.floor(A.r() * GEAR.length)], 0.08));
    }
  }
  for (let s = s0 + 0.4; s < s0 + len; s += 0.6 + A.r()) { const p = onFace(F, s, y + 1.03, 1.26); A.put('lump', 'snow', p.x, p.y, p.z, F.u, _ay, F.n, 0.35 + A.r() * 0.4, 0.09, 0.16, A.jit('#f2f6fb', 0.03)); }
}

export function snowRoof(A, w, d, ye, pitch, wood) {
  // underside and rafter ends, a thick snow blanket, rounded pillows along the eaves, icicles
  const ov = 0.9, half = d / 2 + ov, rh = half * pitch, ang = Math.atan(pitch);
  for (const sg of [-1, 1]) {
    const n = new V3(0, Math.cos(ang), sg * Math.sin(ang)), v = new V3(0, Math.sin(ang), -sg * Math.cos(ang)), u = new V3(1, 0, 0), hyp = Math.hypot(half, rh);
    const mid = new V3(0, ye + rh / 2, sg * half / 2);
    A.put('box', 'wood', mid.x, mid.y - 0.05, mid.z, u, n, v, w + 1.4, 0.16, hyp, A.jit(wood, 0.1));
    const slab = !!BLEND.geo.snowslab;
    if (slab) A.put('snowslab', 'snowpack', mid.x + n.x * 0.3, mid.y + n.y * 0.3, mid.z + n.z * 0.3, u, n, v, w + 1.5, 0.62, hyp + 0.1, A.jit('#f4f7fb', 0.02));   // drifts, cornice over the eave
    else for (let k = 0; k < 3; k++) { const t = (k + 0.5) / 3; A.put('box', 'snow', 0, ye + rh * (1 - t) + 0.3 + A.r() * 0.04, sg * half * t, u, n, v, w + 1.5, 0.5 + A.r() * 0.12, hyp / 3 + 0.08, A.jit('#f4f7fb', 0.03)); }
    for (let x = -w / 2 - 0.6; x <= w / 2 + 0.6; x += 0.8 + A.r() * 0.6) {
      if (!slab) A.put('lump', 'snow', x, ye + 0.08, sg * (half + 0.12), u, _ay, new V3(0, 0, sg), 1.1 + A.r() * 0.7, 0.55 + A.r() * 0.2, 0.75, A.jit('#f4f7fb', 0.03));
      if (A.r() < 0.55) A.put('icicle', 'snow', x + A.r() * 0.3, ye - 0.15, sg * (half + 0.25), u, _ay, new V3(0, 0, sg), 0.07, 0.25 + A.r() * 0.6, 0.07, A.jit('#dfeaf5', 0.04));
    }
    for (let x = -w / 2 + 0.3; x < w / 2; x += 0.9) A.put('box', 'wood', x, ye - 0.12, sg * (d / 2 + ov * 0.55), u, _ay, new V3(0, 0, sg), 0.14, 0.2, ov * 1.1, A.jit('#4a2e1a', 0.1));
    A.put('box', 'wood', 0, ye + 0.02, sg * (half + 0.02), u, _ay, new V3(0, 0, sg), w + 1.5, 0.3, 0.06, A.jit('#4a2e1a', 0.08));   // fascia
  }
  for (let x = -w / 2 - 0.7; x <= w / 2 + 0.7; x += 0.9 + A.r() * 0.5) A.put('lump', 'snow', x, ye + rh + 0.42, 0, new V3(1, 0, 0), _ay, new V3(0, 0, 1), 1.3, 0.45, 1.1 + A.r() * 0.4, A.jit('#f4f7fb', 0.03));
  // gable ends: vertical boards following the slope
  for (const sx of [-1, 1]) for (let z = -d / 2 + 0.1; z < d / 2; z += 0.2) {
    const hgt = rh * (1 - Math.abs(z) / half) - 0.05; if (hgt < 0.1) continue;
    A.put('box', 'wood', sx * (w / 2 + 0.02), ye + hgt / 2, z, new V3(0, 0, 1), _ay, new V3(sx, 0, 0), 0.185, hgt, 0.04, A.jit(wood, 0.15));
  }
  return rh;
}

export function chimney(A, x, z, y0, yTop) {
  for (let y = y0; y < yTop; y += 0.28) for (const [dx, dz] of [[-0.25, 0], [0.25, 0], [0, -0.25], [0, 0.25]]) A.put('box', 'stone', x + dx, y + 0.14, z + dz, new V3(1, 0, 0), _ay, new V3(0, 0, 1), dx ? 0.3 : 0.8, 0.26, dz ? 0.3 : 0.8, A.jit('#8a857e', 0.3));
  A.put('box', 'stone', x, yTop + 0.1, z, new V3(1, 0, 0), _ay, new V3(0, 0, 1), 1.05, 0.12, 1.05, A.jit('#6f6a64', 0.1));
  A.put('lump', 'snow', x, yTop + 0.24, z, new V3(1, 0, 0), _ay, new V3(0, 0, 1), 1.1, 0.3, 1.1, A.jit('#f4f7fb', 0.03));
}

export function assembleChalet(b) {
  const A = new Assembly(hashSeed(b.x, b.z, 7)), { w, d, top } = b, Fs = faces(w, d), holes = [];
  plinthStones(A, b);
  const pal = b.pal, STONE = pal ? pal.render : '#94908a', LOG = '#7c5434', BOARD = pal ? pal.wood : '#b0703a', wood = b.type === 'woodres' ? BOARD : LOG;
  const stoneH = b.type === 'woodres' ? 3.4 : b.sf * FLOOR, woodH = (b.type === 'woodres' ? b.floors : b.wf) * FLOOR, ye = top + stoneH + woodH;
  // backing volume, so no sky shows between the pieces
  A.put('box', 'stone', 0, top + stoneH / 2, 0, new V3(1, 0, 0), _ay, new V3(0, 0, 1), w - 0.3, stoneH, d - 0.3, new THREE.Color('#57534e'));
  A.put('box', 'wood', 0, top + stoneH + woodH / 2, 0, new V3(1, 0, 0), _ay, new V3(0, 0, 1), w - 0.25, woodH, d - 0.25, new THREE.Color('#3b2618'));
  // openings: windows on every floor, arches on the woodres arcade, a door
  for (const F of Fs) {
    const n = Math.max(1, Math.floor(F.L / 3.4)), step = F.L / n;
    for (let k = 0; k < n; k++) {
      const uc = step * (k + 0.5);
      if (b.type === 'woodres' && pal) holes.push({ F, u0: uc - 0.7, u1: uc + 0.7, v0: top + 0.6, v1: top + 2.5 });   // rendered ground floor, plain windows
      else if (b.type === 'woodres') holes.push({ F, u0: uc - 1.1, u1: uc + 1.1, v0: top, v1: top + 2.7, arch: true });
      else for (let f = 0; f < b.sf; f++) if ((k + f) % 2 === 0) holes.push({ F, u0: uc - 0.45, u1: uc + 0.45, v0: top + f * FLOOR + 1.0, v1: top + f * FLOOR + 2.1 });
      const fl = b.type === 'woodres' ? b.floors : b.wf;
      for (let f = 0; f < fl; f++) holes.push({ F, u0: uc - 0.6, u1: uc + 0.6, v0: top + stoneH + f * FLOOR + 0.85, v1: top + stoneH + f * FLOOR + 2.25 });
    }
  }
  for (const F of Fs) {
    if (pal) renderCourse(A, F, top, top + stoneH, holes, STONE); else stoneCourse(A, F, top, top + stoneH, holes, STONE);
    if (b.type === 'woodres') boardCladding(A, F, top + stoneH, ye, holes, BOARD); else logCourse(A, F, top + stoneH, ye, holes, LOG, F.n.x ? 1 : 0);
  }
  for (const h of holes) {
    if (h.arch) {   // arcade: voussoirs around a lit shopfront
      const uc = (h.u0 + h.u1) / 2, rr = (h.u1 - h.u0) / 2, yc = h.v1 - rr;
      shopFront(A, h.F, uc, (h.v0 + h.v1) / 2 - 0.2, rr * 2, h.v1 - h.v0, -0.1, yc + rr * 0.3, -0.04, rr * 1.6); let p;   // fascia inside the arch   // gallery of shops under the arcade
      for (let a = 0; a <= Math.PI + 0.01; a += Math.PI / 9) { p = onFace(h.F, uc - Math.cos(a) * (rr + 0.12), yc + Math.sin(a) * (rr + 0.12), 0.06); const tu = new V3().copy(h.F.u).multiplyScalar(Math.sin(a)).addScaledVector(_ay, Math.cos(a)).normalize(); A.put('box', 'stone', p.x, p.y, p.z, tu, new V3().crossVectors(h.F.n, tu), h.F.n, 0.2, 0.32, 0.35, A.jit('#b7afa2', 0.15)); }
    } else windowAt(A, h.F, h, A.r() < (b.type === 'woodres' ? 0.1 : 0.16), b.type !== 'woodres', wood);   // daytime: few lamps on
  }
  // balconies on the long faces of every timber floor
  const fl = b.type === 'woodres' ? b.floors : b.wf;
  for (const F of Fs) if (F.front || (F.back && b.type === 'woodres')) for (let f = b.type === 'woodres' ? 0 : 0; f < fl; f++) balcony(A, F, top + stoneH + f * FLOOR + 0.05, F.L * (b.type === 'woodres' ? 0.92 : 0.85), wood);
  // corner posts on the chalet
  if (b.type !== 'woodres') for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) A.put('box', 'wood', sx * (w / 2 - 0.05), top + stoneH + woodH / 2, sz * (d / 2 - 0.05), new V3(1, 0, 0), _ay, new V3(0, 0, 1), 0.3, woodH, 0.3, A.jit('#4a2e1a', 0.1));
  const rh = snowRoof(A, w, d, ye, b.type === 'woodres' ? 0.55 : 0.6, wood);
  chimney(A, w * 0.25, -d * 0.15, ye + rh * 0.3, ye + rh * 0.3 + 2.2);
  if (b.type === 'woodres') chimney(A, -w * 0.3, -d * 0.18, ye + rh * 0.3, ye + rh * 0.3 + 2.4);
  return A;
}

export function assembleBuilding(b) {
  __set_CUR_BLD(b); if (!SHOP_ANCHORS.length && PEOPLE.some(d => d.shop !== undefined)) placePeople();
  const A = { chalet: assembleChalet, woodres: assembleChalet, paquebot: assemblePaquebot, tower: assembleTower, block: assembleBlock, church: assembleChurch, bridge: assembleBridge }[b.type](b);
  const g = A.toGroup(Math.hypot(b.w, b.d) / 2 + (b.floors || 6) * 3 + 30);
  const lifted = b.type === 'church' || b.type === 'bridge';
  g.position.set(b.x, lifted ? b.top : 0, b.z); g.rotation.y = b.rot; g.userData.atoms = A.count;
  // the atoms sit at absolute heights (the group is at y = 0): centre the culling sphere on the building itself,
  // otherwise buildings high up the domain were culled when the camera looked level (invisible, yet still solid)
  if (!lifted) { const cy = ((b.y0 ?? b.top) + b.top + (b.floors || 6) * FLOOR + 6) / 2; g.children.forEach(m => { m.geometry.boundingSphere.center.set(0, cy, 0); }); }
  return g;
}

export function updateNearBuildings(cam, budgetMs) {
  const t0 = performance.now();
  // in a dense station only the nearest ones are assembled (each is dozens of meshes)
  const lim = IS_TOUCH ? 8 : 12, d2 = BUILDINGS.map(b => Math.hypot(b.x - cam.x, b.z - cam.z)), cut = d2.length > lim ? d2.slice().sort((a, c) => a - c)[lim - 1] : Infinity;
  for (let i = 0; i < BUILDINGS.length; i++) {
    const b = BUILDINGS[i], dd = d2[i] <= cut ? d2[i] : Math.max(d2[i], NEAR.buildR + 71);
    if (!b.detail && dd < NEAR.buildR && performance.now() - t0 < budgetMs) {
      // T4 : les atomes du bâtiment vont dans la réserve partagée (batch.ts) au lieu d'un groupe par bâtiment
      b.detail = assembleBuilding(b); b.dh = POOLS.detail.add(b.detail);
      setShellHidden(b, true);                     // the assembled version has its own masonry plinth
    } else if (b.detail && dd > NEAR.buildR + 70) {
      POOLS.detail.remove(b.dh); b.dh = null; b.detail = null;
      setShellHidden(b, false);
    }
  }
}

export function updateNear(cam, dt) {
  NEAR.acc = (NEAR.acc || 0) + dt; if (NEAR.acc < 0.15) return; NEAR.acc = 0;
  updateNearTrees(cam, 3); updateNearRocks(cam); updateNearTowers(cam); updateNearBuildings(cam, 6); updateFurniture(cam); updateLabels(cam);
}

/** T5 : typologie Plagne Centre (barres et tours en béton brun rouille) : palettes pc_rust et pc_tower. */
export const isPC = pal => !!pal && /^pc_/.test(pal.facade);

export function plinthStones(A, b) {
  // retaining wall under every building: big irregular blocks from the lowest ground up to the floor
  if (b.pal) { A.put('box', isPC(b.pal) ? 'concrete' : 'stone', 0, (b.y0 + b.top) / 2 - 0.6, 0, X1, _ay, Z1, b.w + 0.1, b.top - b.y0 + 1.2, b.d + 0.1, A.jit(b.pal.base, 0.02)); return; }   // La Plagne: the facade material, no masonry
  if (b.top - b.y0 < 0.3) return;
  const F = faces(b.w + 0.6, b.d + 0.6);
  for (const Fc of F) for (let y = b.y0 - 0.6; y < b.top - 0.05;) {
    const h = Math.min(b.top - y, 0.38 + A.r() * 0.25);
    for (let s = 0; s < Fc.L - 0.05;) { const l = Math.min(Fc.L - s, 0.6 + A.r() * 0.7), dep = 0.45; const p = onFace(Fc, s + l / 2, y + h / 2, 0.06 - dep / 2 + A.r() * 0.05); A.put('box', 'stone', p.x, p.y, p.z, Fc.u, _ay, Fc.n, l - 0.04, h - 0.04, dep, A.jit('#8f8a83', 0.3)); s += l; }
    y += h;
  }
  A.put('box', 'stone', 0, (b.y0 + b.top) / 2 - 0.3, 0, X1, _ay, Z1, b.w + 0.2, b.top - b.y0 + 0.6, b.d + 0.2, new THREE.Color('#4f4b46'));
}

// one bay of a framed facade: wall piers and spandrel at the facade line, glazing set back behind them
export function bayFrame(A, F, s0, s1, y0, y1, o) {
  const pier = o.pier || 0.4, sp = o.spandrel || 0.7, dep = o.depth || 0.4, col = o.wall, SM = o.stone || 'stone';
  let p = onFace(F, s0 + pier / 2, (y0 + y1) / 2, -0.15); A.put('box', SM, p.x, p.y, p.z, F.u, _ay, F.n, pier, y1 - y0, 0.5, A.jit(col, 0.06));
  p = onFace(F, (s0 + s1) / 2, y0 + sp / 2, -0.15); A.put('box', SM, p.x, p.y, p.z, F.u, _ay, F.n, s1 - s0, sp, 0.5, A.jit(col, 0.06));
  const gx0 = s0 + pier, gx1 = s1, gy0 = y0 + sp, gy1 = y1 - 0.12, gw = gx1 - gx0, gh = gy1 - gy0, gc = (gx0 + gx1) / 2, gyc = (gy0 + gy1) / 2;
  if (gw < 0.3 || gh < 0.3) return;
  const lit = A.r() < (o.lit || 0.15);
  if (o.shop) shopFront(A, F, gc, gyc, gw, gh, 0.1 - dep, Math.min(y1 - 0.25, gy1 + 0.3), 0.08);
  else { p = onFace(F, gc, gyc, 0.1 - dep); A.put('box', o.lift ? 'winlift' : lit ? 'winlit' : 'win', p.x, p.y, p.z, F.u, _ay, F.n, gw, gh, 0.04, lit ? A.jit('#f0c27c', 0.15) : A.jit('#25303c', 0.25)); }
  for (const [du, dv, su, sv] of [[0, gh / 2, gw, 0.07], [0, -gh / 2, gw, 0.07], [-gw / 2, 0, 0.07, gh], [gw / 2, 0, 0.07, gh], [0, 0, 0.05, gh]]) { p = onFace(F, gc + du, gyc + dv, 0.14 - dep); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, su, sv, 0.08, A.jit(o.frame, 0.1)); }
  if (o.sill) { p = onFace(F, gc, gy0 - 0.03, 0.13); A.put('box', SM, p.x, p.y, p.z, F.u, _ay, F.n, gw + 0.2, 0.06, 0.3, A.jit('#cfc8bd', 0.05)); }
  if (o.curtain && A.r() < 0.5) { p = onFace(F, gc - gw * 0.3, gyc, 0.14 - dep - 0.03); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, gw * 0.3, gh * 0.95, 0.02, A.jit(['#c9b48a', '#9a3b2e', '#d8d2c4'][Math.floor(A.r() * 3)], 0.1)); }
}

export function framedFloor(A, F, y0, y1, o) {
  const n = Math.max(1, Math.round(F.L / (o.bay || 3.2))), step = F.L / n;
  for (let k = 0; k < n; k++) bayFrame(A, F, k * step, (k + 1) * step, y0, y1, o);
  const p = onFace(F, F.L - 0.2, (y0 + y1) / 2, -0.15); A.put('box', o.stone || 'stone', p.x, p.y, p.z, F.u, _ay, F.n, 0.4, y1 - y0, 0.5, A.jit(o.wall, 0.06));
}

export function balconyModern(A, F, y, depth, o) {
  let p = onFace(F, F.L / 2, y + 0.09, depth / 2); A.put('box', o.stone || 'stone', p.x, p.y, p.z, F.u, _ay, F.n, F.L + 0.05, 0.18, depth, A.jit(o.slab, 0.05));
  if (o.boards) for (let k = 0; k < 3; k++) { p = onFace(F, F.L / 2, y + 0.32 + k * 0.3, depth - 0.02); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, F.L, 0.24, 0.05, A.jit(o.boards, 0.12)); }
  else { p = onFace(F, F.L / 2, y + 0.6, depth - 0.03); A.put('box', 'glass', p.x, p.y, p.z, F.u, _ay, F.n, F.L, 0.85, 0.02, A.jit('#9fb4c4', 0.1)); p = onFace(F, F.L / 2, y + 1.06, depth - 0.03); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, F.L, 0.06, 0.08, A.jit('#c8ccd2', 0.05)); for (let s = 0.1; s < F.L; s += 1.6) { p = onFace(F, s, y + 0.6, depth - 0.03); A.put('box', 'wood', p.x, p.y, p.z, F.u, _ay, F.n, 0.05, 0.95, 0.05, A.jit('#c8ccd2', 0.05)); } }
  if (o.snow) for (let s = 0.4; s < F.L; s += 0.8 + A.r() * 0.8) { p = onFace(F, s, y + (o.boards ? 1.18 : 1.13), depth - 0.03); A.put('lump', 'snow', p.x, p.y, p.z, F.u, _ay, F.n, 0.5 + A.r() * 0.5, 0.1, 0.14, A.jit('#f2f6fb', 0.03)); }
}

export function flatRoof(A, w, d, y, oz, wall, mat = 'stone') {
  for (const F of faces(w, d)) { const p = onFace(F, F.L / 2, y + 0.45, 0); p.z += oz; A.put('box', mat, p.x, p.y, p.z, F.u, _ay, F.n, F.L + 0.3, 0.9, 0.3, A.jit(wall, 0.05)); }
  A.put('box', 'snow', 0, y + 0.55, oz, X1, _ay, Z1, w - 0.2, 0.55, d - 0.2, A.jit('#f4f7fb', 0.02));
  for (let k = 0; k < 6; k++) A.put('lump', 'snow', (A.r() - 0.5) * w * 0.8, y + 0.85, oz + (A.r() - 0.5) * d * 0.7, X1, _ay, Z1, 2 + A.r() * 3, 0.35, 1.5 + A.r() * 2, A.jit('#f4f7fb', 0.02));
}

// the Paquebot des neiges up close: one module, shops at the foot, every floor stepped back on both faces behind a
// terrace with a timber parapet and snow on its deck
export function assemblePlPaquebot(b) {
  const A = new Assembly(hashSeed(b.x, b.z, 29)), { w, d, top, pal, step } = b, gf = b.gf || 3.4;
  plinthStones(A, b);
  faces(w, d).forEach(F => framedFloor(A, F, top, top + gf, { wall: pal.wall, frame: pal.frame, bay: 4, pier: 0.5, depth: 0.6, lit: 0.35, shop: true }));
  for (let f = 0; f < b.floors; f++) {
    const dd = d - 2 * step * (f + 1), y = top + gf + f * FLOOR; if (dd < 6) break;
    A.put('box', 'stone', 0, y + FLOOR / 2, 0, X1, _ay, Z1, w - 0.6, FLOOR, dd - 0.6, new THREE.Color(pal.core));
    const F = faces(w, dd);
    for (const k of [0, 1]) { framedFloor(A, F[k], y, y + FLOOR, { wall: pal.wall, frame: pal.frame, bay: 3.4, pier: 0.35, spandrel: 0.55, depth: 0.35, lit: 0.12, curtain: true }); balconyModern(A, F[k], y, step + 0.15, { slab: pal.slab, boards: pal.boards, snow: true }); }
    for (const k of [2, 3]) framedFloor(A, F[k], y, y + FLOOR, { wall: pal.wall, frame: pal.frame, bay: 4.5, pier: 1.6, lit: 0.05 });
  }
  const dTop = Math.max(6, d - 2 * step * b.floors);
  flatRoof(A, w, dTop, top + gf + b.floors * FLOOR, 0, pal.parapet);
  return A;
}

export function assemblePaquebot(b) {
  if (b.step) return assemblePlPaquebot(b);
  const A = new Assembly(hashSeed(b.x, b.z, 11)), { w, d, top } = b, WALL = '#6e6a64', SLAB = '#5f5b55', BOARDS = '#5b3a22';
  plinthStones(A, b);
  // shops at the foot: columns, recessed lit glazing, coloured fascias, awnings
  const cols = ['#2f6fe0', '#e0393e', '#2fa84f', '#f2a12c', '#5b4bb5', '#e7e2d8'];
  const Ff = faces(w, d)[0], nb = Math.round(w / 4);
  for (let k = 0; k < nb; k++) {
    const s0 = k * w / nb, s1 = (k + 1) * w / nb, sc = (s0 + s1) / 2;
    let p = onFace(Ff, s0 + 0.2, top + 1.7, -0.2); A.put('box', 'stone', p.x, p.y, p.z, Ff.u, _ay, Ff.n, 0.45, 3.4, 0.5, A.jit(WALL, 0.05));
    shopFront(A, Ff, sc + 0.2, top + 1.5, s1 - s0 - 0.45, 2.6, -0.8, top + 3.05, 0.05);   // shops at the foot
    const c = cols[Math.floor(A.r() * cols.length)];
    p = onFace(Ff, sc + 0.2, top + 3.05, 0.05); A.put('box', 'wood', p.x, p.y, p.z, Ff.u, _ay, Ff.n, s1 - s0 - 0.5, 0.55, 0.1, A.jit(c, 0.1));
    if (A.r() < 0.6) { p = onFace(Ff, sc + 0.2, top + 2.55, 0.65); const tilt = new V3(0, Math.cos(0.45), 0).addScaledVector(Ff.n, Math.sin(0.45)).normalize(); A.put('box', 'wood', p.x, p.y, p.z, Ff.u, tilt, new V3().crossVectors(Ff.u, tilt), s1 - s0 - 0.6, 0.05, 1.4, A.jit(c, 0.15)); }
  }
  for (const F of faces(w, d).slice(1)) framedFloor(A, F, top, top + 3.4, { wall: WALL, frame: '#3c3a38', lit: 0.3, depth: 0.5, shop: true });
  // stepped tiers of two floors, each set back from the front
  let y = top + 3.4;
  for (let f = 0; f < b.floors; f += 2) {
    const k = Math.floor(f / 2), dd = d - k * 1.3, oz = -(d - dd) / 2, nf = Math.min(2, b.floors - f);
    A.put('box', 'stone', 0, y + nf * FLOOR / 2, oz, X1, _ay, Z1, w - 0.7, nf * FLOOR, dd - 0.7, new THREE.Color('#3f3c38'));
    for (let q = 0; q < nf; q++) {
      const yy = y + q * FLOOR, F = faces(w, dd).map(Fc => { Fc.o.z += oz; return Fc; });
      framedFloor(A, F[0], yy, yy + FLOOR, { wall: WALL, frame: '#3c3a38', lit: 0.12, depth: 0.45, curtain: true });
      framedFloor(A, F[1], yy, yy + FLOOR, { wall: WALL, frame: '#3c3a38', lit: 0.1, depth: 0.4 });
      for (const Fs of [F[2], F[3]]) framedFloor(A, Fs, yy, yy + FLOOR, { wall: WALL, frame: '#3c3a38', bay: 4.5, pier: 1.6, lit: 0.05 });
      balconyModern(A, F[0], yy, 1.15, { slab: SLAB, boards: BOARDS, snow: q === nf - 1 });
    }
    y += nf * FLOOR;
    if (f + 2 < b.floors) A.put('box', 'snow', 0, y + 0.2, oz + dd / 2 - 0.65, X1, _ay, Z1, w + 0.1, 0.4, 1.3, A.jit('#f4f7fb', 0.02));
  }
  const dTop = d - Math.floor((b.floors - 1) / 2) * 1.3;
  flatRoof(A, w, dTop, y, -(d - dTop) / 2, WALL);
  A.put('box', 'stone', 0, y + 1.6, -(d - dTop) / 2 - dTop * 0.2, X1, _ay, Z1, w * 0.4, 1.6, 3, A.jit('#55524d', 0.05));
  return A;
}

// La Plagne slab or tower up close: shops or lobby on the ground floor, then loggias with timber parapets on the long
// faces (all four on a tower), deep-set windows and dark timber panels between them, flat roof under snow
export function assemblePlSlab(b) {
  const A = new Assembly(hashSeed(b.x, b.z, 23)), { w, d, top, pal } = b, gf = b.gf || 3.4, fl = b.floors;
  // T5 : Plagne Centre en béton banché (refends saillants, galerie couverte au pied) ; les autres palettes inchangées
  const pc = isPC(pal), SM = pc ? 'concrete' : 'stone';
  plinthStones(A, b);
  A.put('box', SM, 0, top + (gf + (fl - 1) * FLOOR) / 2, 0, X1, _ay, Z1, w - 0.8, gf + (fl - 1) * FLOOR, d - 0.8, new THREE.Color(pal.core));
  faces(w, d).forEach((F, i) => framedFloor(A, F, top, top + gf, { wall: pal.wall, frame: pal.frame, bay: 3.4, pier: 0.5, depth: 0.5, lit: 0.3, shop: !!pal.shops || i === 0, stone: SM }));
  faces(w, d).forEach((F, i) => {
    const loggia = i < 2 || pal.tower, dep = pal.tower ? 1.0 : 1.3;
    for (let f = 1; f < fl; f++) {
      const y = top + gf + (f - 1) * FLOOR;
      framedFloor(A, F, y, y + FLOOR, { wall: pal.wall, frame: pal.frame, bay: 3.2, pier: 0.9, spandrel: 0.75, depth: loggia ? 0.25 : 0.4, lit: 0.12, curtain: true, sill: !loggia, stone: SM });
      if (loggia) balconyModern(A, F, y, dep, { slab: pal.slab, boards: pal.boards, snow: true, stone: SM });
    }
    if (loggia) {
      const nf = Math.max(2, Math.round(F.L / 6.4)), H1 = (fl - 1) * FLOOR, fw = pc ? 0.42 : 0.3, fd = pc ? dep + 0.35 : dep;
      for (let k = 0; k <= nf; k++) { const p = onFace(F, k * F.L / nf, top + gf + H1 / 2, fd / 2); A.put('box', SM, p.x, p.y, p.z, F.u, _ay, F.n, fw, H1, fd, A.jit(pal.slab, 0.04)); }
      if (pc) for (let k = 0; k <= nf; k++) { const p = onFace(F, k * F.L / nf, top + gf + H1 + 0.08, fd / 2); A.put('lump', 'snow', p.x, p.y, p.z, F.u, _ay, F.n, fw + 0.1, 0.16, fd + 0.05, A.jit('#f2f6fb', 0.02)); }   // neige en tête de refend
    }
    if (pc && i === 0) galleryAt(A, F, top, gf, pal, SM);
  });
  const yt = top + gf + (fl - 1) * FLOOR;
  flatRoof(A, w, d, yt, 0, pal.parapet, SM);
  if (pc) { A.put('box', SM, w * 0.22, yt + 1.5, -d * 0.12, X1, _ay, Z1, 4.2, 2.2, 3.4, A.jit(pal.parapet, 0.05)); A.put('box', 'snow', w * 0.22, yt + 2.72, -d * 0.12, X1, _ay, Z1, 4.4, 0.3, 3.6, A.jit('#f4f7fb', 0.02)); }   // local des machines d'ascenseur
  return A;
}

/** T5 : galerie marchande couverte au pied des barres de Plagne Centre : dalle en porte-à-faux (2,6 m) sur poteaux, au
 *  niveau du premier étage (les enseignes restent visibles dessous),
 *  neige sur la dalle, glaçons au bord. Mêmes cotes que la coque lointaine (bldPlSlab). */
export const GALLERY = { depth: 2.6, slab: 0.32, step: 6.4, post: 0.38 };
export function galleryAt(A, F, top, gf, pal, SM) {
  const G = GALLERY, n = Math.max(2, Math.round(F.L / G.step));
  let p = onFace(F, F.L / 2, top + gf + G.slab / 2, G.depth / 2); A.put('box', SM, p.x, p.y, p.z, F.u, _ay, F.n, F.L + 0.2, G.slab, G.depth, A.jit(pal.slab, 0.04));
  p = onFace(F, F.L / 2, top + gf + G.slab + 0.16, G.depth / 2); A.put('box', 'snow', p.x, p.y, p.z, F.u, _ay, F.n, F.L + 0.1, 0.32, G.depth - 0.1, A.jit('#f4f7fb', 0.02));
  for (let k = 0; k <= n; k++) {
    const s = Math.min(F.L - 0.3, Math.max(0.3, k * F.L / n));
    p = onFace(F, s, top + gf / 2, G.depth - 0.35); A.put('box', SM, p.x, p.y, p.z, F.u, _ay, F.n, G.post, gf, G.post, A.jit(pal.slab, 0.04));
  }
  for (let s = 0.4; s < F.L; s += 0.5 + A.r() * 0.7) if (A.r() < 0.55) { p = onFace(F, s, top + gf - 0.02, G.depth - 0.05); A.put('icicle', 'snow', p.x, p.y, p.z, F.u, _ay, F.n, 0.06, 0.25 + A.r() * 0.55, 0.06, A.jit('#dfeaf5', 0.04)); }
}

export function assembleTower(b) {
  if (b.pal) return assemblePlSlab(b);
  const A = new Assembly(hashSeed(b.x, b.z, 13)), { w, d, top } = b, WALL = '#7d4430', FIN = '#93533b';
  plinthStones(A, b);
  A.put('box', 'stone', 0, top + b.floors * FLOOR / 2, 0, X1, _ay, Z1, w - 0.8, b.floors * FLOOR, d - 0.8, new THREE.Color('#3a2219'));
  for (let f = 0; f < b.floors; f++) {
    const y = top + f * FLOOR;
    faces(w, d).forEach((F, i) => {
      framedFloor(A, F, y, y + FLOOR, { wall: i < 2 ? FIN : WALL, frame: '#e9e2d6', bay: 3.4, pier: 0.55, spandrel: 0.8, depth: 0.45, lit: 0.12, sill: true, curtain: true, shop: f === 0 });
      if (i < 2 && f > 0) balconyModern(A, F, y, 1.0, { slab: '#5b2f20', snow: f === b.floors - 1 || A.r() < 0.4 });
    });
  }
  const yt = top + b.floors * FLOOR;
  flatRoof(A, w, d, yt, 0, '#5d3424');
  A.put('box', 'stone', 0, yt + 1.6, 0, X1, _ay, Z1, w * 0.4, 2.2, d * 0.4, A.jit('#5d3424', 0.05));
  A.put('box', 'snow', 0, yt + 2.8, 0, X1, _ay, Z1, w * 0.42, 0.3, d * 0.42, A.jit('#f4f7fb', 0.02));
  return A;
}

export function assembleBlock(b) {
  if (b.pal) return assemblePlSlab(b);
  const A = new Assembly(hashSeed(b.x, b.z, 17)), { w, d, top } = b, WALL = '#b4652f';
  plinthStones(A, b);
  A.put('box', 'stone', 0, top + b.floors * FLOOR / 2, 0, X1, _ay, Z1, w - 0.8, b.floors * FLOOR, d - 0.8, new THREE.Color('#5a2f14'));
  for (let f = 0; f < b.floors; f++) {
    const y = top + f * FLOOR;
    faces(w, d).forEach((F, i) => {
      framedFloor(A, F, y, y + FLOOR, { wall: WALL, frame: '#f2efe8', bay: 3.2, pier: 0.8, depth: 0.35, lit: 0.15, sill: true, curtain: true, shop: f === 0 });
      if (i === 0 && f > 0) balconyModern(A, F, y, 0.9, { slab: '#7a3d1a', boards: '#6b4528', snow: A.r() < 0.5 });
    });
  }
  const yt = top + b.floors * FLOOR;
  A.put('box', 'stone', 0, yt + 0.12, 0, X1, _ay, Z1, w + 1.2, 0.35, d + 1.2, A.jit('#3e3a36', 0.05));
  A.put('box', 'snow', 0, yt + 0.6, 0, X1, _ay, Z1, w + 1.1, 0.7, d + 1.1, A.jit('#f4f7fb', 0.02));
  for (let s = -w / 2 - 0.5; s < w / 2 + 0.5; s += 0.7 + A.r() * 0.6) for (const sg of [-1, 1]) { A.put('lump', 'snow', s, yt + 0.55, sg * (d / 2 + 0.6), X1, _ay, Z1, 0.9, 0.55, 0.6, A.jit('#f4f7fb', 0.02)); if (A.r() < 0.4) A.put('icicle', 'snow', s, yt - 0.05, sg * (d / 2 + 0.6), X1, _ay, Z1, 0.07, 0.3 + A.r() * 0.6, 0.07, A.jit('#dfeaf5', 0.04)); }
  // entrance canopy
  const Ff = faces(w, d)[0]; let p = onFace(Ff, w / 2, top + 2.8, 1.2); A.put('box', 'stone', p.x, p.y, p.z, Ff.u, _ay, Ff.n, 4, 0.2, 2.4, A.jit('#3e3a36', 0.05)); p = onFace(Ff, w / 2, top + 3.1, 1.2); A.put('box', 'snow', p.x, p.y, p.z, Ff.u, _ay, Ff.n, 4, 0.35, 2.4, A.jit('#f4f7fb', 0.02));
  return A;
}

export function assembleChurch(b) {
  const A = new Assembly(hashSeed(b.x, b.z, 19)), STONE = '#c9bfae';
  // nave 9 x 16, walls 8 m, tall arched windows
  const nave = { w: 9, d: 16 }, holes = [], Fs = faces(9, 16).map(F => { F.o.y = 0; return F; });
  for (const F of Fs) if (F.L > 10) for (let k = 0; k < 3; k++) holes.push({ F, u0: 3 + k * 5 - 0.6, u1: 3 + k * 5 + 0.6, v0: 2.5, v1: 6.2 });
  for (const F of Fs) stoneCourse(A, F, 0, 8, holes, STONE);
  A.put('box', 'stone', 0, 4, 0, X1, _ay, Z1, 8.6, 8, 15.6, new THREE.Color('#6b655c'));
  for (const h of holes) { const uc = (h.u0 + h.u1) / 2; let p = onFace(h.F, uc, (h.v0 + h.v1) / 2, -0.2); A.put('box', 'lit', p.x, p.y, p.z, h.F.u, _ay, h.F.n, 1.2, 3.7, 0.04, A.jit('#e7b866', 0.1)); for (let a = 0; a <= Math.PI + 0.01; a += Math.PI / 6) { p = onFace(h.F, uc - Math.cos(a) * 0.7, h.v1 - 0.6 + Math.sin(a) * 0.7, 0.05); A.put('box', 'stone', p.x, p.y, p.z, h.F.u, _ay, h.F.n, 0.25, 0.25, 0.4, A.jit('#e2d8c6', 0.08)); } }
  snowRoof(A, 9, 16, 8, 0.8, '#5c4a3a');
  // bell tower with belfry openings, clock and spire
  const tw = 4.2, Ft = faces(tw, tw).map(F => { F.o.z -= 9; return F; }), th = [];
  for (const F of Ft) th.push({ F, u0: 1.4, u1: 2.8, v0: 14.5, v1: 16.8 });
  for (const F of Ft) stoneCourse(A, F, 0, 18, th, STONE);
  A.put('box', 'stone', 0, 9, -9, X1, _ay, Z1, tw - 0.3, 18, tw - 0.3, new THREE.Color('#6b655c'));
  for (const h of th) { for (let k = 0; k < 5; k++) { const p = onFace(h.F, 2.1, 14.8 + k * 0.42, -0.12); const tilt = new V3(0, Math.cos(0.6), 0).addScaledVector(h.F.n, Math.sin(0.6)); A.put('box', 'wood', p.x, p.y, p.z, h.F.u, tilt, new V3().crossVectors(h.F.u, tilt), 1.4, 0.04, 0.35, A.jit('#4a3524', 0.1)); } const p = onFace(h.F, 2.1, 12.6, 0.06); A.put('lump', 'stone', p.x, p.y, p.z, h.F.u, _ay, h.F.n, 1.3, 1.3, 0.1, A.jit('#f2efe6', 0.02)); }
  A.put('box', 'stone', 0, 18.2, -9, X1, _ay, Z1, tw + 0.4, 0.4, tw + 0.4, A.jit('#9a9286', 0.05));
  A.put('spire', 'stone', 0, 18.4, -9, X1, _ay, Z1, 3.4, 7.5, 3.4, A.jit('#3d4a42', 0.05));
  A.put('box', 'stone', 0, 26.6, -9, X1, _ay, Z1, 0.12, 1.2, 0.12, A.jit('#c9a54a', 0.05)); A.put('box', 'stone', 0, 26.8, -9, X1, _ay, Z1, 0.6, 0.12, 0.12, A.jit('#c9a54a', 0.05));
  for (let a = 0; a < 6.28; a += 0.5) A.put('lump', 'snow', Math.sin(a) * 1.9, 18.6, -9 + Math.cos(a) * 1.9, X1, _ay, Z1, 0.9, 0.35, 0.9, A.jit('#f4f7fb', 0.02));
  return A;
}

export function assembleBridge(b) {
  const A = new Assembly(hashSeed(b.x, b.z, 23)), L = b.span;
  A.put('box', 'stone', 0, 0, 0, X1, _ay, Z1, L, 0.6, 3.2, A.jit('#8e8a84', 0.04));
  const F = [{ o: new V3(-L / 2, 0, 1.5), u: X1, n: Z1, L }, { o: new V3(L / 2, 0, -1.5), u: new V3(-1, 0, 0), n: new V3(0, 0, -1), L }];
  for (const Fc of F) framedFloor(A, Fc, 0.3, 3.1, { wall: '#7b5434', frame: '#3a2412', bay: 2.2, pier: 0.3, spandrel: 0.9, depth: 0.25, lit: 0.4 });
  A.put('box', 'wood', 0, 1.7, 0, X1, _ay, Z1, L - 0.2, 2.8, 2.4, new THREE.Color('#3b2618'));
  A.put('box', 'stone', 0, 3.25, 0, X1, _ay, Z1, L + 0.6, 0.3, 3.8, A.jit('#5f5b55', 0.04));
  A.put('box', 'snow', 0, 3.55, 0, X1, _ay, Z1, L + 0.5, 0.4, 3.7, A.jit('#f4f7fb', 0.02));
  for (let s = -L / 2; s < L / 2; s += 0.9 + A.r() * 0.5) for (const sg of [-1, 1]) A.put('lump', 'snow', s, 3.5, sg * 1.95, X1, _ay, Z1, 0.9, 0.4, 0.5, A.jit('#f4f7fb', 0.02));
  for (const sx of [-1, 1]) for (let y = -8.8; y < -0.3; y += 0.5) A.put('box', 'stone', sx * L / 2, y + 0.25, 0, X1, _ay, Z1, 1.3, 0.48, 1.3, A.jit('#8e8a84', 0.15));
  return A;
}


/* ---- rocks: fractured blocks with snow lying on their upper faces ---- */
export function rockPrototype(seed) {
  const A = new Assembly(seed), r = A.r;
  const n = 6 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const a = r() * 6.28, rr = r() * 0.45, x = Math.sin(a) * rr, z = Math.cos(a) * rr, y = -0.15 + r() * 0.4, s = 0.45 + r() * 0.5;
    const u = new V3(Math.cos(a + r()), 0.2 * (r() - 0.5), Math.sin(a + r())).normalize(), v = new V3(0.3 * (r() - 0.5), 1, 0.3 * (r() - 0.5)).normalize(), nn = new V3().crossVectors(u, v).normalize(); u.crossVectors(v, nn);
    A.put(r() < 0.6 ? 'box' : 'lump', 'stone', x, y, z, u, v, nn, s * (0.8 + r() * 0.6), s * (0.6 + r() * 0.5), s * (0.7 + r() * 0.6), A.jit(['#6a6866', '#7a7672', '#5b5a5c', '#827d76'][i % 4], 0.2));
    if (y + s * 0.3 > 0.1 && r() < 0.8) A.put('puff', 'snow', x, y + s * 0.42, z, X1, _ay, Z1, s * 0.9, s * 0.18, s * 0.8, A.jit('#f2f6fb', 0.03));
  }
  const geo = A.toGeometry(); geo.boundingSphere = new THREE.Sphere(new V3(0, 0, 0), 80); return geo;
}

export function initNearRocks() {
  rocks.protos = [rockPrototype(hashSeed(7, 7)), rockPrototype(hashSeed(8, 9)), rockPrototype(hashSeed(9, 3))];
  for (let i = 0; i < rocks.x.length; i++) { const k = Math.floor((rocks.x[i] + HALF) / 48) + Math.floor((rocks.z[i] + HALF) / 48) * 1000; let l = rocks.grid.get(k); if (!l) rocks.grid.set(k, l = []); l.push(i); }
}

export function updateNearRocks(cam) {
  if (!rocks.protos) return;
  const C = 48, R = NEAR.treeR + 40, cx = Math.floor((cam.x + HALF) / C), cz = Math.floor((cam.z + HALF) / C), reach = Math.ceil(R / C) + 1, want = new Set();
  for (let dz = -reach; dz <= reach; dz++) for (let dx = -reach; dx <= reach; dx++) { const k = cx + dx + (cz + dz) * 1000; if (rocks.grid.has(k) && Math.hypot(-HALF + (cx + dx + 0.5) * C - cam.x, -HALF + (cz + dz + 0.5) * C - cam.z) < R + C * 0.7) want.add(k); }
  for (const k of want) {
    if (rocks.chunks.has(k)) continue;
    const ids = rocks.grid.get(k), ox = -HALF + (k % 1000 + 0.5) * C, oz = -HALF + (Math.floor(k / 1000) + 0.5) * C, oy = gridH(ox, oz), g = new THREE.Group(); g.position.set(ox, oy, oz);
    [0, 1, 2].forEach(v => { const sel = ids.filter(i => i % 3 === v); if (!sel.length) return; const m = new THREE.InstancedMesh(rocks.protos[v], NEAR.rockMat, sel.length); sel.forEach((i, j) => { _am.fromArray(rocks.mat, i * 16); _am.elements[12] -= ox; _am.elements[13] -= oy; _am.elements[14] -= oz; m.setMatrixAt(j, _am); rocks.mesh.setMatrixAt(i, ZERO_M); }); m.castShadow = true; m.receiveShadow = true; g.add(m); });
    g.traverse(o => o.layers.set(SMALL_LAYER)); scene.add(g); rocks.chunks.set(k, g); rocks.mesh.instanceMatrix.needsUpdate = true;
  }
  for (const [k, g] of rocks.chunks) {
    if (want.has(k)) continue;
    if (Math.hypot(-HALF + (k % 1000 + 0.5) * C - cam.x, -HALF + (Math.floor(k / 1000) + 0.5) * C - cam.z) < R + C * 1.6) continue;
    scene.remove(g); g.children.forEach(m => m.dispose()); rocks.grid.get(k).forEach(i => { rocks.mesh.setMatrixAt(i, _am.fromArray(rocks.mat, i * 16)); }); rocks.chunks.delete(k); rocks.mesh.instanceMatrix.needsUpdate = true;
  }
}

export function netTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.strokeStyle = '#ff6a14'; g.lineWidth = 3; for (let k = -64; k < 128; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 64, 64); g.stroke(); g.beginPath(); g.moveTo(k + 64, 0); g.lineTo(k, 64); g.stroke(); }
  const t = colorCanvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function safetyNet(x0, z0, x1, z1) {
  // orange posts and mesh netting, following the ground
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 3)), A = new Assembly(hashSeed(x0, z0, 31)), pos = [], uv = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = lerp(x0, x1, t), z = lerp(z0, z1, t), y = H(x, z);
    A.put('seg', 'wood', x, y - 0.2, z, X1, _ay, Z1, 0.07, 1.6, 0.07, A.jit('#ff6a14', 0.05));
    pos.push(x, y + 0.15, z, x, y + 1.25, z); uv.push(t * L / 1.2, 0, t * L / 1.2, 1);
    if (i < n) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  const g = A.toGroup(L / 2 + 5); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
  netMat = netMat || pbr({ map: netTexture(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(geo, netMat));
  g.children.forEach(m => { m.geometry.boundingSphere = new THREE.Sphere(new V3((x0 + x1) / 2, H((x0 + x1) / 2, (z0 + z1) / 2), (z0 + z1) / 2), L / 2 + 5); });
  g.userData.c = new V3((x0 + x1) / 2, 0, (z0 + z1) / 2); scene.add(g); FURN.push(g);
}

export function furnitureAt(kind, x, z, rot, extra) {
  const A = new Assembly(hashSeed(x, z, 37)), y = H(x, z), u = new V3(Math.cos(rot), 0, -Math.sin(rot)), n = new V3(Math.sin(rot), 0, Math.cos(rot)), WOOD = '#7a5232';
  const P = (atom, mat, du, dy, dn, su, sv, sn, col) => A.put(atom, mat, x + u.x * du + n.x * dn, y + dy, z + u.z * du + n.z * dn, u, _ay, n, su, sv, sn, col);
  // a pair of skis (or a board) leaning back against the rail at 1.15 m: tails 0.38 m in front of it
  const leanGear = (atom, du, col) => {
    if (!BLEND.geo[atom]) return;
    const l = Math.atan2(0.38, 1.15), v = _ay.clone().multiplyScalar(Math.cos(l)).addScaledVector(n, -Math.sin(l)), nn = n.clone().multiplyScalar(Math.cos(l)).addScaledVector(_ay, Math.sin(l));
    A.put(atom, 'gear', x + u.x * du + n.x * 0.4, y + 0.02, z + u.z * du + n.z * 0.4, u, v, nn, 1, 1, 1, col);
  };
  if (kind === 'bench') { for (let k = 0; k < 3; k++) P('box', 'wood', 0, 0.45, -0.15 + k * 0.15, 1.8, 0.05, 0.12, A.jit(WOOD, 0.15)); for (let k = 0; k < 2; k++) P('box', 'wood', 0, 0.7 + k * 0.17, -0.28, 1.8, 0.1, 0.04, A.jit(WOOD, 0.15)); for (const s of [-0.75, 0.75]) { P('box', 'stone', s, 0.22, 0, 0.08, 0.45, 0.45, A.jit('#3a3d42', 0.1)); } P('lump', 'snow', 0.3, 0.5, 0, 0.9, 0.08, 0.35, A.jit('#f4f7fb', 0.02)); }
  else if (kind === 'lamp') { P('seg', 'stone', 0, 0, 0, 0.12, 4.2, 0.12, A.jit('#2b2f36', 0.05)); P('box', 'stone', 0.25, 4.2, 0, 0.6, 0.06, 0.06, A.jit('#2b2f36', 0.05)); P('box', 'lit', 0.5, 3.95, 0, 0.3, 0.45, 0.3, A.jit('#ffd796', 0.05)); P('box', 'stone', 0.5, 4.22, 0, 0.42, 0.06, 0.42, A.jit('#2b2f36', 0.05)); P('lump', 'snow', 0.5, 4.3, 0, 0.4, 0.12, 0.4, A.jit('#f4f7fb', 0.02)); }
  else if (kind === 'rack') { for (const s of [-1.2, 1.2]) P('box', 'stone', s, 0.6, 0, 0.06, 1.2, 0.06, A.jit('#9aa3ae', 0.05)); P('box', 'stone', 0, 1.15, 0, 2.5, 0.06, 0.06, A.jit('#9aa3ae', 0.05)); for (let k = 0; k < 7; k++) if (A.r() < 0.75) leanGear(A.r() < 0.85 ? 'skis' : 'snowboard', -1.05 + k * 0.35 + (A.r() - 0.5) * 0.06, A.jit(SKI_COLS[Math.floor(A.r() * SKI_COLS.length)], 0.08)); }
  else if (kind === 'skistand') { for (let k = 0, cnt = 1 + Math.floor(A.r() * 3); k < cnt; k++) { const du = (k - (cnt - 1) / 2) * 0.55 + (A.r() - 0.5) * 0.2; if (BLEND.geo.skis) A.put('skis', 'gear', x + u.x * du, y - 0.28, z + u.z * du, u, _ay, n, 1, 1, 1, A.jit(SKI_COLS[Math.floor(A.r() * SKI_COLS.length)], 0.08)); } }   // planted tails-down in the snow
  else if (kind === 'sign') { P('box', 'wood', 0, 1.3, 0, 0.12, 2.6, 0.12, A.jit(WOOD, 0.1)); (extra || []).forEach((c, k) => { P('box', 'wood', 0.45 * (k % 2 ? -1 : 1), 2.2 - k * 0.38, 0.08, 0.95, 0.3, 0.04, A.jit(c, 0.05)); P('box', 'wood', 0.95 * (k % 2 ? -1 : 1), 2.2 - k * 0.38, 0.08, 0.12, 0.2, 0.04, A.jit(c, 0.05)); }); P('lump', 'snow', 0, 2.65, 0, 0.25, 0.1, 0.25, A.jit('#f4f7fb', 0.02)); }
  // T5 : mobilier des abords de Plagne Centre (mêmes atomes et matières que le mobilier existant : aucun appel de plus)
  else if (kind === 'bin') { P('seg', 'stone', 0, 0, 0, 0.5, 0.95, 0.5, A.jit('#2f3b33', 0.06)); P('box', 'stone', 0, 1.0, 0, 0.58, 0.08, 0.58, A.jit('#252b27', 0.05)); P('lump', 'snow', 0, 1.08, 0, 0.5, 0.14, 0.5, A.jit('#f4f7fb', 0.02)); }
  else if (kind === 'planter') { P('box', 'wood', 0, 0.3, 0, 1.8, 0.6, 0.7, A.jit('#5b3b27', 0.1)); P('box', 'wood', 0, 0.62, 0, 1.9, 0.06, 0.8, A.jit('#3d2a1e', 0.08)); P('lump', 'snow', 0, 0.7, 0, 1.7, 0.4, 0.62, A.jit('#f4f7fb', 0.02)); }
  else if (kind === 'snowbank') { for (let k = 0; k < 4; k++) P('lump', 'snow', -1.6 + k * 1.05 + (A.r() - 0.5) * 0.3, 0.15, (A.r() - 0.5) * 0.3, 1.4 + A.r() * 0.6, 0.55 + A.r() * 0.45, 0.9 + A.r() * 0.4, A.jit('#eef3f9', 0.03)); }
  else if (kind === 'mapboard') { for (const s of [-1.3, 1.3]) P('box', 'wood', s, 1.2, 0, 0.14, 2.4, 0.14, A.jit(WOOD, 0.1)); P('box', 'wood', 0, 2.55, 0.15, 3.1, 0.12, 0.8, A.jit('#4a2e1a', 0.1)); P('box', 'snow', 0, 2.7, 0.15, 3.2, 0.22, 0.9, A.jit('#f4f7fb', 0.02)); P('box', 'wood', 0, 1.55, -0.02, 2.5, 1.5, 0.06, A.jit('#3a2412', 0.1)); }
  const g = A.toGroup(6);
  if (kind === 'mapboard' && minimapImg) { const t = colorCanvasTex(minimapImg); const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.35), pbr({ map: t })); pl.position.set(x + n.x * 0.02, y + 1.55, z + n.z * 0.02); pl.rotation.y = rot; g.add(pl); }
  g.children.forEach(m => { m.geometry.boundingSphere = new THREE.Sphere(new V3(x, y, z), 6); });
  g.userData.c = new V3(x, 0, z); scene.add(g); FURN.push(g);
}

export function buildFurniture() {
  ABORDS.n = plagneCentreStreet();   // T5
  // nets and a trail map at every lift bottom, plus a ski rack
  for (const L of LIFTS) {
    const b = L.board, s = L.side, d = L.dir, w = L.off + (L.type === 'tbar' ? 3 : 5);
    for (const sg of [-1, 1]) safetyNet(b.x + s.x * w * sg - d.x * 24, b.z + s.z * w * sg - d.z * 24, b.x + s.x * w * sg - d.x * 3, b.z + s.z * w * sg - d.z * 3);
    const mx = b.x - s.x * (w + 4) - d.x * 10, mz = b.z - s.z * (w + 4) - d.z * 10; if (zoneAt(mx, mz) < 0 || true) furnitureAt('mapboard', mx, mz, Math.atan2(-d.x, -d.z) + Math.PI);
    furnitureAt('rack', b.x + s.x * (w + 4) - d.x * 14, b.z + s.z * (w + 4) - d.z * 14, Math.atan2(d.x, d.z));
  }
  // in front of the shops: ski racks along the facade (two at the rental and the sports shop), skis left by customers
  for (const d of PEOPLE) if (d.shop !== undefined && d.x !== undefined) {
    const ux = Math.cos(d.yaw), uz = -Math.sin(d.yaw);
    for (const o of d.shop === 0 || d.shop === 2 ? [3.6, -3.6] : [3.6]) if (spotClear(d.x + ux * o, d.z + uz * o)) furnitureAt('rack', d.x + ux * o - Math.sin(d.yaw) * 1.2, d.z + uz * o - Math.cos(d.yaw) * 1.2, d.yaw);
  }
  // signposts at every piste start
  PISTES.forEach(p => { if (p.hidden || p.link || p.minor) return; const q = p.samples[3], hd = pisteHeading(p, 3), x = q.x + Math.cos(hd) * (p.w / 2 + 2.5), z = q.z - Math.sin(hd) * (p.w / 2 + 2.5); const near = PISTES.filter(o => !o.hidden && Math.hypot(o.samples[0].x - q.x, o.samples[0].z - q.z) < 60).map(o => o.color).slice(0, 3); furnitureAt('sign', x, z, hd, near.length ? near : [p.color]); });
  // villages: nets along the piste edges, lamp posts, benches
  for (const V of VILLAGES) {
    const p = PISTES.find(q => q.name === V.piste); if (!p) continue;
    const S = p.samples, hw = p.w / 2;
    for (let d = V.d[0]; d < Math.min(V.d[1], (S.length - 3) * 4); d += 24) {
      const i = Math.floor(d / 4), hd = pisteHeading(p, i), px = Math.cos(hd), pz = -Math.sin(hd), j = Math.min(S.length - 1, i + 5);
      for (const sg of [-1, 1]) {
        if (V.style === 'station' || V.style === 'trad') safetyNet(S[i].x + px * (hw + 1) * sg, S[i].z + pz * (hw + 1) * sg, S[j].x + px * (hw + 1) * sg, S[j].z + pz * (hw + 1) * sg);
        const lx = S[i].x + px * (hw + 3.5) * sg, lz = S[i].z + pz * (hw + 3.5) * sg;
        if (!obstacles.some(o => Math.hypot(o.x - lx, o.z - lz) < o.r + 1)) furnitureAt(sg > 0 ? 'lamp' : 'bench', lx, lz, hd + (sg > 0 ? 0 : Math.PI / 2));
      }
    }
  }
}

/* T5 : abords de Plagne Centre. Devant la galerie couverte de chaque barre ou tour (face avant), une rangée de
   réverbères, bancs, poubelles, bacs et porte-skis, des congères contre les pignons. Placés en dernier (après la
   végétation) avec un tirage propre à chaque immeuble : rien d'autre dans le domaine ne bouge. Pas sur les pistes,
   ni sous une remontée, ni sur une terrasse ou dans un autre immeuble. */
export function plagneCentreStreet() {
  const decks = scene.children.filter(o => o.userData.kind === 'terrace' && o.userData.W);
  const onDeck = (x, z) => decks.some(g => { const dx = x - g.position.x, dz = z - g.position.z, c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y); return Math.abs(dx * c - dz * s) < g.userData.W / 2 + 1.5 && Math.abs(dx * s + dz * c) < g.userData.D / 2 + 1.5; });
  const ok = (x, z) => zoneAt(x, z) < 0 && liftDist(x, z) > 9 && spotClear(x, z) && !onDeck(x, z);
  const at = (b, u, v) => [b.x + u * Math.cos(b.rot) + v * Math.sin(b.rot), b.z - u * Math.sin(b.rot) + v * Math.cos(b.rot)];
  let n = 0;
  for (const b of BUILDINGS) {
    if (!isPC(b.pal)) continue;
    const r = mulberry32(hashSeed(b.x, b.z, 61)), seq = ['lamp', 'bench', 'bin', 'planter', 'rack', 'lamp', 'planter', 'bench'];
    const v = b.d / 2 + GALLERY.depth + 1.3, cnt = Math.max(2, Math.round(b.w / GALLERY.step));
    for (let k = 0; k < cnt; k++) {
      const u = -b.w / 2 + (k + 0.5) * b.w / cnt, [x, z] = at(b, u, v); if (!ok(x, z)) continue;
      const kind = seq[(k + Math.floor(r() * 3)) % seq.length];
      furnitureAt(kind, x, z, kind === 'bench' ? b.rot + Math.PI : kind === 'lamp' ? b.rot + Math.PI / 2 : b.rot); n++;
    }
    for (const sd of [-1, 1]) { const [x, z] = at(b, sd * (b.w / 2 + 1.6), (r() - 0.5) * b.d * 0.5); if (ok(x, z)) { furnitureAt('snowbank', x, z, b.rot + Math.PI / 2); n++; } }
  }
  return n;
}

export function updateFurniture(cam) {
  for (const g of FURN) { if (!g.userData.small) { g.traverse(o => o.layers.set(SMALL_LAYER)); g.userData.small = true; } }
  for (const g of FURN) { const on = Math.hypot(g.userData.c.x - cam.x, g.userData.c.z - cam.z) < 320; if (g.userData.h) POOLS.furniture.show(g.userData.h, on); else g.visible = on; }
}


/* ---- rounded limbs between two points (for people and animals) ---- */
export function limb(A, mat, a, b, r, col, rz) {
  const d = new V3().subVectors(b, a), ax = axesAlong(d, {});
  A.put('cap', mat, a.x, a.y, a.z, ax.u, ax.v, ax.n, r * 2, d.length(), (rz || r) * 2, col);
}

// other skiers: rounded body (fixed colours) + jacket (tinted per skier), standing and seated
export function npcGeos() {
  const PANTS = '#232a3c', DARK = '#1a1d24', SKIN = '#d6a37f', HELM = '#eeeeee';
  const sb = new Assembly(41), sj = new Assembly(42), cb = new Assembly(43), cj = new Assembly(44);
  for (const s of [-1, 1]) {
    sb.put('box', 'wood', s * 0.12, 0.012, 0.03, X1, _ay, Z1, 0.1, 0.02, 1.6, new THREE.Color('#2b3a55'));
    for (const [z, a] of [[0.86, -0.45], [-0.8, 0.45]]) { const v = new V3(0, Math.cos(a), Math.sin(a)); sb.put('box', 'wood', s * 0.12, 0.05, z, X1, v, new V3().crossVectors(X1, v), 0.1, 0.02, 0.2, new THREE.Color('#e8e4dc')); }
    limb(sb, 'wood', v3(s * 0.12, 0.03, -0.06), v3(s * 0.12, 0.3, 0.0), 0.075, new THREE.Color(DARK), 0.11);
    limb(sb, 'wood', v3(s * 0.12, 0.24, 0.02), v3(s * 0.12, 0.58, 0.2), 0.066, new THREE.Color(PANTS));
    limb(sb, 'wood', v3(s * 0.12, 0.58, 0.2), v3(s * 0.1, 0.92, -0.03), 0.082, new THREE.Color(PANTS));
    limb(sj, 'wood', v3(s * 0.2, 1.36, 0.17), v3(s * 0.27, 1.1, 0.38), 0.058, new THREE.Color('#ffffff'));
    limb(sj, 'wood', v3(s * 0.27, 1.1, 0.38), v3(s * 0.25, 1.0, 0.6), 0.05, new THREE.Color('#ffffff'));
    blob(sb, 'wood', s * 0.25, 0.99, 0.62, 0.11, 0.12, 0.12, new THREE.Color(DARK));
    limb(sb, 'wood', v3(s * 0.25, 1.0, 0.62), v3(s * 0.32, 0.05, 0.28), 0.011, new THREE.Color('#b9bec6'));
  }
  blob(sb, 'wood', 0, 0.93, -0.02, 0.36, 0.26, 0.27, new THREE.Color(PANTS));
  limb(sj, 'wood', v3(0, 0.88, 0.0), v3(0, 1.44, 0.22), 0.2, new THREE.Color('#ffffff'), 0.14);
  blob(sj, 'wood', 0, 1.47, 0.24, 0.2, 0.08, 0.2, new THREE.Color('#ffffff'));
  blob(sb, 'wood', 0, 1.6, 0.3, 0.19, 0.22, 0.2, new THREE.Color(SKIN));
  blob(sb, 'wood', 0, 1.65, 0.28, 0.26, 0.21, 0.27, new THREE.Color(HELM));
  sb.put('box', 'wood', 0, 1.61, 0.39, X1, _ay, Z1, 0.2, 0.065, 0.05, new THREE.Color('#ff9a1f'));
  // seated on a chair (origin at the seat)
  for (const s of [-1, 1]) {
    limb(cb, 'wood', v3(s * 0.1, 0.06, -0.02), v3(s * 0.12, 0.08, 0.45), 0.082, new THREE.Color(PANTS));
    limb(cb, 'wood', v3(s * 0.12, 0.08, 0.45), v3(s * 0.12, -0.34, 0.5), 0.066, new THREE.Color(PANTS));
    limb(cb, 'wood', v3(s * 0.12, -0.32, 0.47), v3(s * 0.12, -0.55, 0.55), 0.075, new THREE.Color(DARK), 0.11);
    const v = new V3(0, Math.sin(0.35), -Math.cos(0.35)).negate(); cb.put('box', 'wood', s * 0.12, -0.62, 0.6, X1, new V3().crossVectors(v, X1).negate(), v, 0.1, 0.02, 1.6, new THREE.Color('#2b3a55'));
    limb(cj, 'wood', v3(s * 0.2, 0.5, 0.0), v3(s * 0.23, 0.28, 0.2), 0.058, new THREE.Color('#ffffff'));
    limb(cj, 'wood', v3(s * 0.23, 0.28, 0.2), v3(s * 0.18, 0.3, 0.44), 0.05, new THREE.Color('#ffffff'));
    blob(cb, 'wood', s * 0.18, 0.3, 0.46, 0.11, 0.12, 0.12, new THREE.Color(DARK));
  }
  limb(cj, 'wood', v3(0, 0.02, -0.02), v3(0, 0.58, 0.0), 0.2, new THREE.Color('#ffffff'), 0.14);
  blob(cb, 'wood', 0, 0.78, 0.03, 0.19, 0.22, 0.2, new THREE.Color(SKIN));
  blob(cb, 'wood', 0, 0.83, 0.01, 0.26, 0.21, 0.27, new THREE.Color(HELM));
  cb.put('box', 'wood', 0, 0.79, 0.12, X1, _ay, Z1, 0.2, 0.065, 0.05, new THREE.Color('#ff9a1f'));
  return { sb: sb.toGeometry(), sj: sj.toGeometry(), cb: cb.toGeometry(), cj: cj.toGeometry() };
}

export function __init_3396() {

/* ---------------- Matter: atoms → parts → objects ---------------- */
// Every detailed object is assembled from tiny shared shapes ("atoms": a plank, a stone, a frond of needles,
// a lump of snow...). Parts place atoms (a log wall, a balustrade, a branch), objects place parts (a chalet, a fir).
// The same description gives a near version (thousands of atoms) and the existing far version (a few boxes),
// so the switch keeps the silhouette. Variation comes from a seed derived from the object's position, never
// from the world's random stream, so the domain layout stays identical.
ATOM = {};
MATTER_MAT = {
  wood: () => pbr({ color: '#ffffff', roughness: 0.8 }, [0.55, 0.5, 2.2]),       // timber, painted steel, fabric: grainy
  stone: () => pbr({ color: '#ffffff', roughness: 0.92 }, [0.7, 0.6, 0.9]),      // masonry, rock
  snow: () => pbr({ color: '#ffffff', roughness: 0.7 }, [0.25, 0.35, 0.7]),
  glass: () => pbr({ color: '#ffffff', roughness: 0.06, metalness: 0, envMapIntensity: 1.6 }, [0.01, 0.1, 1]),   // reflects the sky
  log: () => detailMat('timber', { color: '#ffffff', roughness: 0.8 }, 0.55, 0.9, 0.85, false, [0.2, 0.4, 2.2]),      // squared logs, grain along them
  plank: () => detailMat('timber', { color: '#ffffff', roughness: 0.78 }, 0.75, 0.8, 0.8, true, [0.2, 0.4, 2.2]),    // vertical boards: grain upright
  // T5 : béton banché de Plagne Centre (ambientCG Concrete013, CC0) : projection dans le plan de chaque façade, usure
  concrete: () => { const m = detailMat('concrete', { color: '#ffffff', roughness: 0.9 }, 1 / 2.4, 1.6, 0.85, false, [0.5, 0.5, 0.9]); m.defines = Object.assign({}, m.defines, { DETAIL_FACING: '', USE_WEATHER: '' }); return m; },
  masonry: () => detailMat('masonry', { color: '#ffffff', roughness: 0.92 }, 0.7, 1.0, 0.7, false, [0.4, 0.5, 0.9]), // dressed stone
  lit: () => new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  win: () => BLEND.tex.rooms_atlas ? interiorMat(0.3, [0.92, 0.95, 1.0]) : MATTER_MAT.glass(),          // daylight rooms
  winshop: () => BLEND.tex.shops_atlas ? interiorMat(1.25, [1.0, 0.95, 0.88], BLEND.tex.shops_atlas, 8, { fromColor: true, noCurtain: true }) : MATTER_MAT.lit(),   // ground-floor shops, lit by day
  winlift: () => BLEND.tex.lift_atlas ? interiorMat(1.0, [0.95, 0.98, 1.0], BLEND.tex.lift_atlas, 2, { noCurtain: true }) : MATTER_MAT.glass(),               // lift operator cabins
  sign: () => {   // shop fascia boards: one tile of the Blender sign atlas, picked by the instance colour
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, map: BLEND.tex.shop_signs || null, emissive: '#ffffff', emissiveIntensity: 0.12, emissiveMap: BLEND.tex.shop_signs || null });
    if (!BLEND.tex.shop_signs) return m;
    m.onBeforeCompile = sh => {
      const tile = 'vec2 sUv = vec2(vMapUv.x, 1.0 - (floor(vColor.r * 8.0 + 0.5) + 1.0 - vMapUv.y) / 8.0);';
      sh.fragmentShader = patchShader(sh.fragmentShader, '#include <map_fragment>', tile + '\n  diffuseColor *= texture2D(map, sUv);', 'sign');
      sh.fragmentShader = patchShader(sh.fragmentShader, '#include <color_fragment>', '', 'sign');
      sh.fragmentShader = patchShader(sh.fragmentShader, '#include <emissivemap_fragment>', 'totalEmissiveRadiance *= texture2D(emissiveMap, sUv).rgb;', 'sign');
    };
    return m;
  },
  winlit: () => BLEND.tex.rooms_atlas ? interiorMat(0.9, [1.0, 0.82, 0.6]) : MATTER_MAT.lit(),           // lamps on
  balcut: () => detailMat('timber', { color: '#ffffff', roughness: 0.78, alphaMap: BLEND.tex.baluster_mask, alphaTest: 0.5, side: THREE.DoubleSide }, 0.75, 0.8, 0.8, true, [0.2, 0.4, 2.2]),
  gear: () => pbr({ color: '#ffffff', roughness: 0.32, vertexColors: true }, [0.03, 0.2, 3]),   // lacquered top sheets
  snowpack: () => detailMat('snowpack', { color: '#ffffff', roughness: 0.62, vertexColors: true }, 0.45, 0.7, 0.6, false, [0.15, 0.3, 0.8]),
};
matCache = {};
mmat = k => matCache[k] || (matCache[k] = MATTER_MAT[k]());
hashSeed = (x, z, k = 0) => (Math.floor(x * 73.13) * 73856093 ^ Math.floor(z * 91.7) * 19349663 ^ k * 83492791) >>> 0;
_am = new THREE.Matrix4();
_av = new V3();
_au = new V3();
_an = new V3();
_ay = new V3(0, 1, 0);
_ac = new THREE.Color();

/* near firs: a moving set of 48 m chunks around the camera swaps the far cones for assembled trees */
NEAR = { treeR: IS_TOUCH ? 70 : 130, buildR: IS_TOUCH ? 110 : 230, chunk: 48, protos: null, chunks: new Map(), grid: null, budget: 0 };

/* ---- buildings assembled from stones, logs, boards, balusters, shutters, snow ---- */
BUILDINGS = [];
onFace = (F, s, y, out) => _av.copy(F.o).addScaledVector(F.u, s).setY(y).addScaledVector(F.n, out);
SHOP_N = 8;
shopCol = k => new THREE.Color(k / 8, 0, 0);

/* ---- modern station buildings, church, bridge: real relief (recessed glazing, piers, slabs, railings) ---- */
X1 = new V3(1, 0, 0);
Z1 = new V3(0, 0, 1);
rocks = { x: [], z: [], mat: null, mesh: null, grid: new Map(), chunks: new Map(), protos: null };

/* ---- piste and village furniture ---- */
FURN = [];
netMat = null;
SKI_COLS = ['#d8342c', '#1f5fbf', '#f2b51d', '#2a2d33', '#e8e8ea', '#2f9e6a', '#8e44ad', '#f07c1f', '#14a3b8'];
blob = (A, mat, x, y, z, sx, sy, sz, col) => A.put('ball', mat, x, y, z, X1, _ay, Z1, sx, sy, sz, col);
v3 = (x, y, z) => new V3(x, y, z);
}
