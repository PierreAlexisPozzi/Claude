// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « vegetation ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { NEAR, rocks } from './assembly';
import { Q, V3, clamp, lerp, smoothstep } from './core';
import { TEX, lambertVC, mergeParts, pbr, sunVis } from './materials';
import { isClear } from './pistes';
import { PROXY_LAYER, SMALL_LAYER, TREE_LAYER, scene } from './render';
import { ALT0, HALF, TC, WORLD, fbm, gridH, normalAt, perlin, rnd, trees } from './terrain';
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

export function placeTrees() {
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
  for (const [x, z, s] of cand) {
    const i = trees.x.length; trees.x.push(x); trees.z.push(z); trees.s.push(s);
    const key = Math.floor((x + HALF) / TC) + Math.floor((z + HALF) / TC) * 1000;
    let l = trees.grid.get(key); if (!l) trees.grid.set(key, l = []); l.push(i);
  }
  // instanced chunks for frustum culling
  const geo = BLEND.geo.spruce_far ? BLEND.geo.spruce_far.clone() : makeFirGeometry();   // Blender silhouette when available
  geo.boundingSphere = new THREE.Sphere(new V3(0, 0, 0), 420);
  const mat = lambertVC({ side: THREE.DoubleSide, map: TEX.needle });
  const CH = 350, nc = WORLD / CH, buckets = Array.from({ length: nc * nc }, () => []);
  for (let i = 0; i < trees.x.length; i++) buckets[clamp(Math.floor((trees.x[i] + HALF) / CH), 0, nc - 1) + clamp(Math.floor((trees.z[i] + HALF) / CH), 0, nc - 1) * nc].push(i);
  const dummy = new THREE.Object3D(), tint = new THREE.Color();
  trees.mat = new Float32Array(trees.x.length * 16); trees.tint = new Float32Array(trees.x.length); trees.farMesh = []; trees.farK = new Int32Array(trees.x.length); trees.farMeshes = [];
  buckets.forEach((b, ci) => {
    if (!b.length) return;
    const cx = -HALF + (ci % nc + 0.5) * CH, cz = -HALF + (Math.floor(ci / nc) + 0.5) * CH;
    let cy = 0; b.forEach(i => cy += gridH(trees.x[i], trees.z[i])); cy /= b.length;
    const mesh = new THREE.InstancedMesh(geo, mat, b.length);
    mesh.position.set(cx, cy, cz); mesh.castShadow = true;
    b.forEach((i, k) => {
      const s = trees.s[i];
      dummy.position.set(trees.x[i] - cx, gridH(trees.x[i], trees.z[i]) - cy - 0.3, trees.z[i] - cz);
      dummy.rotation.set((rnd() - 0.5) * 0.06, rnd() * 6.28, (rnd() - 0.5) * 0.06);
      dummy.scale.set(s * (0.9 + rnd() * 0.2), s * (0.95 + rnd() * 0.25), s * (0.9 + rnd() * 0.2));
      dummy.updateMatrix(); mesh.setMatrixAt(k, dummy.matrix);
      const v = (0.82 + rnd() * 0.3) * lerp(0.6, 1, sunVis(trees.x[i], trees.z[i], gridH(trees.x[i], trees.z[i]) + 5)); tint.setRGB(v, v * (0.97 + rnd() * 0.06), v); mesh.setColorAt(k, tint);
      dummy.position.x += cx; dummy.position.y += cy; dummy.position.z += cz; dummy.updateMatrix(); dummy.matrix.toArray(trees.mat, i * 16);
      trees.tint[i] = v; trees.farMesh[i] = mesh; trees.farK[i] = k;
    });
    mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.userData.inv = new THREE.Matrix4().makeTranslation(-cx, -cy, -cz); trees.farMeshes.push(mesh);
    mesh.layers.set(TREE_LAYER); scene.add(mesh);
  });
  // shadow proxies for the far cascade: every tree as the 70-triangle silhouette, in 175 m chunks with tight bounds,
  // seen only by the far shadow camera (the real trees keep casting into the sharp near map)
  {
    const C2 = 175, n2 = Math.ceil(WORLD / C2), b2 = Array.from({ length: n2 * n2 }, () => []), m4 = new THREE.Matrix4(), pm = lambertVC();
    for (let i = 0; i < trees.x.length; i++) b2[clamp(Math.floor((trees.x[i] + HALF) / C2), 0, n2 - 1) + clamp(Math.floor((trees.z[i] + HALF) / C2), 0, n2 - 1) * n2].push(i);
    b2.forEach((b, ci) => {
      if (!b.length) return;
      const cx = -HALF + (ci % n2 + 0.5) * C2, cz = -HALF + (Math.floor(ci / n2) + 0.5) * C2; let cy = 0; b.forEach(i => cy += gridH(trees.x[i], trees.z[i])); cy /= b.length;
      let ry = 0; b.forEach(i => ry = Math.max(ry, Math.abs(gridH(trees.x[i], trees.z[i]) - cy)));
      const g = new THREE.BufferGeometry(); g.setAttribute('position', geo.getAttribute('position')); if (geo.index) g.setIndex(geo.index);
      g.boundingSphere = new THREE.Sphere(new V3(0, 6, 0), C2 * 0.72 + ry + 14);
      const pmesh = new THREE.InstancedMesh(g, pm, b.length); pmesh.position.set(cx, cy, cz); pmesh.castShadow = true; pmesh.layers.set(PROXY_LAYER);
      b.forEach((i, k) => { m4.fromArray(trees.mat, i * 16); m4.elements[12] -= cx; m4.elements[13] -= cy; m4.elements[14] -= cz; pmesh.setMatrixAt(k, m4); });
      pmesh.instanceMatrix.needsUpdate = true; scene.add(pmesh);
    });
  }
}

export function placeRocks() {
  const list = [], nrm = new V3();
  for (let i = 0; i < 9000 && list.length < 1400; i++) {
    const x = (rnd() * 2 - 1) * (HALF - 40), z = (rnd() * 2 - 1) * (HALF - 40);
    normalAt(x, z, nrm); if (nrm.y > 0.74 || isClear(x, z)) continue;
    list.push([x, z, 1 + rnd() * 3.5]);
  }
  const geo = new THREE.DodecahedronGeometry(1, 0); geo.computeVertexNormals();
  const mesh = new THREE.InstancedMesh(geo, pbr({ color: '#8a8682', map: TEX.rockA }), list.length);
  const d = new THREE.Object3D();
  rocks.mat = new Float32Array(list.length * 16); rocks.mesh = mesh; NEAR.rockMat = lambertVC(); mesh.layers.set(SMALL_LAYER);
  list.forEach(([x, z, s], i) => { d.position.set(x, gridH(x, z) - s * 0.25, z); d.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3); d.scale.set(s * (0.8 + rnd() * 0.6), s * (0.5 + rnd() * 0.4), s * (0.8 + rnd() * 0.6)); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
    // near version: same place and size, kept upright so the snow stays on top
    const ry = d.rotation.y; d.rotation.set(0, ry, 0); d.position.y = gridH(x, z) - s * 0.12; d.scale.set(d.scale.x * 0.95, d.scale.y * 1.2, d.scale.z * 0.95); d.updateMatrix(); d.matrix.toArray(rocks.mat, i * 16); rocks.x.push(x); rocks.z.push(z); });
  mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
}

export function __init_2016() {

}
