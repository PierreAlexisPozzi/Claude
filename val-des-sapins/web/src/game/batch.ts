// @ts-nocheck — module écrit en T4 dans le style des modules générés ; typage strict progressif à venir.
/* Regroupement des appels de dessin (tranche T4).

   Le jeu assemble chaque objet proche (bâtiment détaillé, gare de remontée, pylône, mobilier) en « atomes » :
   un InstancedMesh par couple (atome, matière) et par objet, soit des dizaines d'appels de dessin par objet et par
   passe (image, ombre proche, ombre lointaine). Ici, ces InstancedMesh sont versés dans des **réserves partagées** :
   un seul InstancedMesh par (atome, matière, ombres, calque, cellule de 400 m), dont chaque objet occupe une plage.
   Montrer, cacher ou retirer un objet revient à écrire ou effacer sa plage : aucun appel de dessin en plus.

   Les **coques** des bâtiments (version lointaine, géométries uniques) sont fusionnées par cellule et par matière.
   Chaque sommet porte le numéro de son bâtiment (aBid) : une petite texture dit quels bâtiments sont cachés (leur
   version détaillée est affichée), et le nuanceur de sommets les replie sur un point, dans l'image comme dans
   les deux passes d'ombre. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { scene } from './render';

const CELL = 400, SHELL_CELL = 800;
const _m = new THREE.Matrix4(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _q = new THREE.Quaternion();
export const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const cellOf = (x, z, c = CELL) => Math.floor(x / c) + ':' + Math.floor(z / c);

/* T5 : ombre proche à la demande. Un regroupement couvre une grande cellule : il entrait dans la carte d'ombre nette
   (84 m autour du skieur) même sans aucun objet proche. Son calque 0 (image + deux ombres) devient 10 (image + ombre
   lointaine), son calque 8 (petits objets : image + ombre proche) devient 12 (image seule) ; le calque 11 (ombre
   proche) est ajouté chaque image aux seuls regroupements qui ont un objet à moins de NEAR_R du skieur. */
const L_MAIN_FAR = 1 << 10, L_NEAR = 1 << 11, L_MAIN = 1 << 12;
export function splitMask(mask) {
  let m = mask & ~(1 | (1 << 8)), near = false;
  if (mask & 1) { m |= L_MAIN_FAR; near = true; }
  if (mask & (1 << 8)) { m |= L_MAIN; near = true; }
  return { base: m, near: near ? m | L_NEAR : m };
}
const NEARS = [];   // { mesh, base, near, pts: [x, z, r][] }
export function registerNear(mesh, mask, pts) { const s = splitMask(mask); const e = { mesh, base: s.base, near: s.near, pts }; mesh.layers.mask = s.base; NEARS.push(e); return e; }
export function updateNearShadows(p) {
  for (const e of NEARS) {
    let on = false;
    for (const q of e.pts) { if (q.off) continue; const dx = q.x - p.x, dz = q.z - p.z; if (dx * dx + dz * dz < (q.r + 95) * (q.r + 95)) { on = true; break; } }
    e.mesh.layers.mask = on ? e.near : e.base;
  }
}

/* ---------------- neige accumulée (T4) ----------------
   Les objets fixes du domaine (bâtiments, gares, pylônes, mobilier) reçoivent une variante de leur matière avec
   USE_SNOWACC : la neige se pose sur leurs faces tournées vers le ciel (nuanceur commun, materials.ts). Les
   personnages, qui partagent certaines matières, gardent l'originale. Pas de neige sur le verre ni les lumières. */
// clone sans copier userData par JSON (textures non sérialisables) : on garde les mêmes objets
const cloneMat = src => { const ud = src.userData; src.userData = {}; const m = src.clone(); src.userData = ud; m.userData = ud; return m; };
const ACC_OK = m => m.isMeshStandardMaterial && !m.transparent && m.roughness > 0.2 && !(m.emissive && m.emissive.getHex() !== 0) && !!m.userData.grainU;
const accMats = new Map();
export function snowAcc(src) {
  if (!ACC_OK(src)) return src;
  let m = accMats.get(src); if (m) return m;
  m = cloneMat(src); m.onBeforeCompile = src.onBeforeCompile;
  m.defines = Object.assign({}, src.defines, { USE_SNOWACC: '' });
  accMats.set(src, m); return m;
}

/* ---------------- réserves d'instances ---------------- */
class Slab {
  constructor(src, name) {
    this.name = name; this.geo = src.geometry.clone(); this.geo.computeBoundingSphere();
    this.r0 = this.geo.boundingSphere.radius + this.geo.boundingSphere.center.length();
    this.src = src.material; this.mat = snowAcc(src.material); this.color = !!src.instanceColor;
    this.cast = src.castShadow; this.recv = src.receiveShadow; this.mask = src.layers.mask; this.order = src.renderOrder;
    this.cap = 0; this.top = 0; this.free = []; this.mesh = null; this.pts = []; this.nearE = null;
    this.box = new THREE.Box3(); this.pad = 0;
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);
    this.grow(64);
  }
  grow(need) {
    const cap = Math.max(need, Math.ceil(this.cap * 1.6), 64), m = new THREE.InstancedMesh(this.geo, this.mat, cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (this.color) { m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage); }
    if (this.mesh) {
      m.instanceMatrix.array.set(this.mesh.instanceMatrix.array.subarray(0, this.cap * 16));
      if (this.color) m.instanceColor.array.set(this.mesh.instanceColor.array.subarray(0, this.cap * 3));
      scene.remove(this.mesh); this.mesh.dispose();
    }
    m.castShadow = this.cast; m.receiveShadow = this.recv; m.renderOrder = this.order;
    if (this.nearE) { this.nearE.mesh = m; m.layers.mask = this.nearE.base; } else this.nearE = registerNear(m, this.mask, this.pts);
    m.count = this.top; m.visible = this.top > 0; m.userData.pool = this.name; m.userData.tag = 'pool:' + this.name;
    scene.add(m); this.mesh = m; this.cap = cap;
  }
  alloc(n) {
    for (let i = 0; i < this.free.length; i++) {
      const f = this.free[i]; if (f.n < n) continue;
      const off = f.off; f.off += n; f.n -= n; if (!f.n) this.free.splice(i, 1);
      return off;
    }
    if (this.top + n > this.cap) this.grow(this.top + n);
    const off = this.top; this.top += n; this.mesh.count = this.top; this.mesh.visible = true;
    return off;
  }
  write(off, n, mats, cols) {
    const A = this.mesh.instanceMatrix.array;
    if (mats) {
      A.set(mats, off * 16);
      for (let i = 0; i < n; i++) {
        _m.fromArray(mats, i * 16); _m.decompose(_v, _q, _s);
        if (_s.x === 0 && _s.y === 0 && _s.z === 0) continue;
        this.box.expandByPoint(_v); this.pad = Math.max(this.pad, this.r0 * Math.max(_s.x, _s.y, _s.z));
      }
      const sp = this.geo.boundingSphere; this.box.getCenter(sp.center); sp.radius = this.box.getSize(_v).length() / 2 + this.pad;
    } else for (let i = 0; i < n; i++) ZERO.toArray(A, (off + i) * 16);
    if (cols && this.color) this.mesh.instanceColor.array.set(cols, off * 3);
    this.mesh.instanceMatrix.needsUpdate = true; if (this.color) this.mesh.instanceColor.needsUpdate = true;
  }
  release(off, n) {
    this.write(off, n, null, null);
    this.free.push({ off, n }); this.free.sort((a, b) => a.off - b.off);
    for (let i = this.free.length - 1; i > 0; i--) { const a = this.free[i - 1], b = this.free[i]; if (a.off + a.n === b.off) { a.n += b.n; this.free.splice(i, 1); } }
    const last = this.free[this.free.length - 1];
    if (last && last.off + last.n === this.top) { this.top = last.off; this.free.pop(); this.mesh.count = this.top; this.mesh.visible = this.top > 0; }
  }
}

export class InstancePool {
  constructor(name, cell = CELL) { this.name = name; this.cell = cell; this.slabs = new Map(); }
  slab(src, cell) {
    const atom = src.geometry.userData.atom || src.geometry.uuid;
    const k = [atom, src.material.uuid, +src.castShadow, +src.receiveShadow, src.layers.mask, +!!src.instanceColor, cell].join('|');
    let s = this.slabs.get(k); if (!s) this.slabs.set(k, s = new Slab(src, this.name + '@' + cell));
    return s;
  }
  /** Verse les InstancedMesh d'un groupe (et de ses descendants) dans la réserve. Le reste du groupe (maillages
   *  simples, panneaux…) reste dans le groupe, qui est ajouté à la scène s'il n'y est pas. */
  add(group, shown = true) {
    group.updateMatrixWorld(true);
    group.getWorldPosition(_v); const cell = cellOf(_v.x, _v.z, this.cell), h = { parts: [], rest: group, shown, pt: { x: _v.x, z: _v.z, r: group.userData.radius || 30, off: !shown } };
    const list = []; group.traverse(o => { if (o.isInstancedMesh && !o.isSkinnedMesh) list.push(o); });
    for (const m of list) {
      const n = m.count; if (!n) { m.parent.remove(m); continue; }
      const s = this.slab(m, cell), mats = new Float32Array(n * 16);
      for (let i = 0; i < n; i++) { _m.fromArray(m.instanceMatrix.array, i * 16).premultiply(m.matrixWorld); _m.toArray(mats, i * 16); }
      const cols = m.instanceColor ? m.instanceColor.array.slice(0, n * 3) : null, off = s.alloc(n);
      s.write(off, n, shown ? mats : null, cols);
      h.parts.push({ s, off, n, mats, cols }); if (!s.pts.includes(h.pt)) s.pts.push(h.pt);
      m.parent.remove(m); m.geometry.dispose(); m.dispose();
    }
    let rest = false; group.traverse(o => { if (o !== group && (o.isMesh || o.isLine || o.isPoints || o.isSprite)) rest = true; });
    if (rest && !group.parent) scene.add(group);
    if (!rest && group.parent) group.parent.remove(group);
    group.visible = shown;
    return h;
  }
  show(h, on) {
    if (!h || h.shown === on) return; h.shown = on; h.pt.off = !on;
    for (const p of h.parts) p.s.write(p.off, p.n, on ? p.mats : null, null);
    h.rest.visible = on;
  }
  remove(h) {
    if (!h) return;
    for (const p of h.parts) { p.s.release(p.off, p.n); const i = p.s.pts.indexOf(h.pt); if (i >= 0) p.s.pts.splice(i, 1); }
    h.parts.length = 0;
    if (h.rest.parent) h.rest.parent.remove(h.rest);
    h.rest.traverse(o => { if (o.isMesh) { o.geometry.dispose(); } });
  }
  stats() { let meshes = 0, used = 0; for (const s of this.slabs.values()) { meshes++; used += s.top; } return { meshes, instances: used }; }
}

// taille des cellules : petite pour ce qui change souvent (bâtiments détaillés), grande pour ce qui est clairsemé
// sur tout le domaine (gares, pylônes) : moins d'appels, au prix d'un découpage plus grossier pour l'élimination
export const POOLS = { detail: new InstancePool('bâtiments détaillés', 400), fixed: new InstancePool('gares', 1600), towers: new InstancePool('pylônes', 1600), furniture: new InstancePool('mobilier', 800) };

/* ---------------- coques des bâtiments : fusion avec masquage par bâtiment ---------------- */
const HIDE_W = 256;
export let HIDE = null;
const fnId = new Map();
const fid = f => { if (!f) return 0; if (!fnId.has(f)) fnId.set(f, fnId.size + 1); return fnId.get(f); };
/** Signature d'une matière : deux matières de même signature se rendent à l'identique (le jeu en crée une par
 *  bâtiment pour certaines pièces). */
export function matSig(m) {
  const t = x => (x ? x.uuid : '-');
  return [m.type, m.color && m.color.getHexString(), t(m.map), t(m.normalMap), t(m.roughnessMap), t(m.emissiveMap), m.emissive && m.emissive.getHexString(), m.emissiveIntensity,
    +m.vertexColors, m.roughness, m.metalness, +m.transparent, m.opacity, m.side, m.alphaTest, +m.depthWrite, m.envMapIntensity, +m.flatShading,
    JSON.stringify(m.defines || {}), m.userData.grainU ? m.userData.grainU.value.toArray().join(',') : '-',
    m.userData.detail ? t(m.userData.detail.a) + m.userData.detail.p.toArray().join(',') : '-', fid(m.onBeforeCompile), m.customProgramCacheKey ? m.customProgramCacheKey() : ''].join('|');
}

function patchHide(sh) {
  sh.uniforms.uBHide = { value: HIDE };
  if (!sh.vertexShader.includes('#include <begin_vertex>')) throw new Error('batch : begin_vertex absent');
  sh.vertexShader = 'attribute float aBid;\nuniform sampler2D uBHide;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  { int id = int( aBid + 0.5 ); if ( texelFetch( uBHide, ivec2( id % ${HIDE_W}, id / ${HIDE_W} ), 0 ).r > 0.5 ) transformed = vec3( 0.0 ); }`);
}
const hideMats = new Map();
function hideMat(src) {
  let m = hideMats.get(src); if (m) return m;
  m = cloneMat(src); m.defines = Object.assign({}, src.defines, ACC_OK(src) ? { USE_SNOWACC: '' } : {});
  const prev = src.onBeforeCompile, base = THREE.Material.prototype.onBeforeCompile;
  m.onBeforeCompile = function (sh, r) { if (prev && prev !== base) prev.call(this, sh, r); patchHide(sh); };
  const key = src.customProgramCacheKey ? src.customProgramCacheKey.bind(src) : null;
  m.customProgramCacheKey = () => 'vds-bhide|' + (key ? key() : '') + '|' + fid(prev);
  hideMats.set(src, m); return m;
}
let depthHide = null;
function depthMat() {
  if (depthHide) return depthHide;
  depthHide = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depthHide.onBeforeCompile = patchHide; depthHide.customProgramCacheKey = () => 'vds-bhide-depth';
  return depthHide;
}

/** Fusionne les coques de `blds` (chacun avec .grp, déjà dans la scène). Les groupes d'origine sont retirés de la
 *  scène (gardés en mémoire) ; renvoie le nombre de maillages créés. */
export function mergeShells(blds) {
  const rows = Math.ceil(Math.max(1, blds.length) / HIDE_W);
  HIDE = new THREE.DataTexture(new Uint8Array(HIDE_W * rows * 4), HIDE_W, rows, THREE.RGBAFormat, THREE.UnsignedByteType);
  HIDE.needsUpdate = true;
  const buckets = new Map(), canon = new Map();
  blds.forEach((b, i) => {
    b.bid = i; if (!b.grp) return;
    b.grp.updateMatrixWorld(true);
    const ms = []; b.grp.traverse(o => { if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh) ms.push(o); });
    for (const o of ms) {
      const sg = matSig(o.material); if (!canon.has(sg)) canon.set(sg, o.material);
      let g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
      g.morphAttributes = {};
      const n = g.attributes.position.count; g.setAttribute('aBid', new THREE.BufferAttribute(new Float32Array(n).fill(i), 1));
      o.getWorldPosition(_v);
      const k = [sg, +o.castShadow, +o.receiveShadow, o.layers.mask, cellOf(_v.x, _v.z, SHELL_CELL), Object.keys(g.attributes).sort().join(','), +!!g.index].join('#');
      let l = buckets.get(k); if (!l) buckets.set(k, l = { mat: canon.get(sg), cast: o.castShadow, recv: o.receiveShadow, mask: o.layers.mask, cell: cellOf(_v.x, _v.z, SHELL_CELL), geos: [], pts: [] });
      l.geos.push(g); if (!l.pts.some(q => q.b === b)) l.pts.push({ b, x: b.x, z: b.z, r: Math.hypot(b.w, b.d) / 2 + (b.floors || 4) * 3 });
    }
    scene.remove(b.grp); b.grp.userData.merged = true;
  });
  let made = 0;
  for (const l of buckets.values()) {
    const g = mergeGeometries(l.geos, false); if (!g) throw new Error('batch : fusion des coques impossible');
    l.geos.forEach(x => x.dispose());
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, hideMat(l.mat)); m.castShadow = l.cast; m.receiveShadow = l.recv; registerNear(m, l.mask, l.pts);
    m.customDepthMaterial = depthMat(); m.userData.shells = true;
    m.userData.tag = 'coques@' + l.cell; scene.add(m); made++;
  }
  return made;
}

export function setShellHidden(b, hidden) {
  if (!HIDE || b.bid === undefined) { if (b.grp) b.grp.children.forEach(c => { c.visible = !hidden; }); return; }
  HIDE.image.data[b.bid * 4] = hidden ? 255 : 0; HIDE.needsUpdate = true;
}

/* ---------------- fusion de maillages fixes (sans masquage) ---------------- */
/** Fusionne des maillages simples qui ne bougent plus (rampes du snowpark, câbles…) par matière, ombres et cellule. */
export function mergeStatic(objs) {
  const buckets = new Map(), canon = new Map(); let n0 = 0;
  for (const root of objs) {
    root.updateMatrixWorld(true);
    const ms = []; root.traverse(o => { if ((o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh) || (o.isLineSegments || o.isLine)) ms.push(o); });
    for (const o of ms) {
      if (!o.visible) continue;
      const sg = matSig(o.material) + (o.isLine ? '|line' + (o.isLineSegments ? 's' : '') : ''); if (!canon.has(sg)) canon.set(sg, o.material);
      let g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      if (o.isLine && !o.isLineSegments) {   // ligne continue → segments, pour pouvoir les mettre bout à bout
        const p = g.attributes.position, a = []; for (let i = 0; i + 1 < p.count; i++) a.push(p.getX(i), p.getY(i), p.getZ(i), p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1));
        g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
      }
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
      o.getWorldPosition(_v);
      const k = [sg, +o.castShadow, +o.receiveShadow, o.layers.mask, o.renderOrder, +o.frustumCulled, cellOf(_v.x, _v.z), Object.keys(g.attributes).sort().join(','), +!!g.index].join('#');
      let l = buckets.get(k); if (!l) buckets.set(k, l = { src: o, mat: canon.get(sg), geos: [] });
      l.geos.push(g); n0++;
      o.parent.remove(o);
    }
  }
  let made = 0;
  for (const l of buckets.values()) {
    const g = mergeGeometries(l.geos, false); if (!g) throw new Error('batch : fusion impossible');
    l.geos.forEach(x => x.dispose()); g.computeBoundingSphere();
    const o = l.src, m = o.isLine ? new THREE.LineSegments(g, l.mat) : new THREE.Mesh(g, l.mat);
    m.castShadow = o.castShadow; m.receiveShadow = o.receiveShadow; m.layers.mask = o.layers.mask; m.renderOrder = o.renderOrder; m.frustumCulled = o.frustumCulled;
    scene.add(m); made++;
  }
  return { before: n0, after: made };
}

/** Fusionne, dans un groupe animé, les enfants directs fixes qui partagent la même matière (pièces du skieur). */
export function mergeChildren(parent) {
  const by = new Map();
  for (const o of parent.children) if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh && !o.children.length && o.visible) {
    const k = [o.material.uuid, +o.castShadow, +o.receiveShadow, o.layers.mask, Object.keys(o.geometry.attributes).sort().join(','), +!!o.geometry.index, +!!o.userData.ski].join('#');
    let l = by.get(k); if (!l) by.set(k, l = []); l.push(o);
  }
  let saved = 0;
  for (const l of by.values()) {
    if (l.length < 2) continue;
    const gs = l.map(o => { o.updateMatrix(); const g = o.geometry.clone(); g.applyMatrix4(o.matrix); return g; });
    const g = mergeGeometries(gs, false); if (!g) continue;
    const m = new THREE.Mesh(g, l[0].material); m.castShadow = l[0].castShadow; m.receiveShadow = l[0].receiveShadow; m.layers.mask = l[0].layers.mask; Object.assign(m.userData, l[0].userData);
    for (const o of l) parent.remove(o);
    parent.add(m); saved += l.length - 1;
  }
  return saved;
}
