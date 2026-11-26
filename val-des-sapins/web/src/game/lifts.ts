// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « lifts ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { V3, clamp, lerp } from './core';
import { cabinAssembly, chairAssembly, stationAssembly, tbarAssembly, towerAssembly } from './fauna';
import { running } from './input';
import { dlgOpen, jnlOpen } from './journal';
import { mapOpen } from './maps';
import { lambertVC, mergeParts, metal, pbrGloss } from './materials';
import { ZERO_M } from './npcs';
import { LIFTS } from './pistes';
import { P, input } from './player';
import { camera, scene } from './render';
import { gridH } from './terrain';
import { BLEND } from './world-data';

export let LSPEC, towerList, liftAnim, LIFT_DETAIL, TOWERS, _q, _q2, _m;



/* ---------------- Lifts ---------------- */
export class Path {
  constructor(pts) { this.pts = pts; this.cum = [0]; for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + pts[i].distanceTo(pts[i - 1])); this.total = this.cum[this.cum.length - 1]; }
  pointAt(s, out) {
    s = clamp(s, 0, this.total); let i = 1; while (i < this.cum.length - 1 && this.cum[i] < s) i++;
    const a = this.pts[i - 1], b = this.pts[i], t = (s - this.cum[i - 1]) / ((this.cum[i] - this.cum[i - 1]) || 1);
    return out.copy(a).lerp(b, t);
  }
}

export function layoutLift(L) {
  const b0 = new V3(L.b[0], 0, L.b[1]), t0 = new V3(L.t[0], 0, L.t[1]);
  const dir = t0.clone().sub(b0).normalize(); L.dir = dir; L.yaw = Math.atan2(dir.x, dir.z);
  const side = new V3(dir.z, 0, -dir.x); L.side = side;
  L.B = b0.clone().addScaledVector(dir, -6); L.T = t0.clone().addScaledVector(dir, 6);
  const sp = LSPEC[L.type], lenH = L.B.distanceTo(L.T), nT = Math.max(2, Math.ceil(lenH / sp.sp));
  const nodes = [];
  for (let k = 0; k <= nT; k++) { const p = L.B.clone().lerp(L.T, k / nT); const g = gridH(p.x, p.z); nodes.push({ x: p.x, z: p.z, g, top: g + (k === 0 || k === nT ? sp.st : sp.tw) }); }
  for (let it = 0; it < 10; it++) {
    let changed = false;
    for (let k = 0; k < nT; k++) {
      const a = nodes[k], c = nodes[k + 1]; let v = 0;
      for (let j = 1; j < 24; j++) { const u = j / 24, x = lerp(a.x, c.x, u), z = lerp(a.z, c.z, u); const g = Math.max(gridH(x + side.x * L.off, z + side.z * L.off), gridH(x - side.x * L.off, z - side.z * L.off)); v = Math.max(v, g + sp.clr - lerp(a.top, c.top, u)); }
      if (v > 0.05) { changed = true; if (k > 0 && k + 1 < nT) { a.top += v; c.top += v; } else if (k === 0) c.top += 2 * v; else a.top += 2 * v; }
    }
    if (!changed) break;
  }
  L.nodes = nodes;
  const up = nodes.map(n => new V3(n.x + side.x * L.off, n.top, n.z + side.z * L.off));
  const down = nodes.map(n => new V3(n.x - side.x * L.off, n.top, n.z - side.z * L.off)).reverse();
  L.up = new Path(up); L.down = new Path(down); L.total = L.up.total;
  L.s0 = 6.4; L.endS = 6.4;
  L.board = L.up.pointAt(L.s0, new V3()); L.board.y = gridH(L.board.x, L.board.z);
  for (let k = 1; k < nT; k++) towerList.push({ x: nodes[k].x, z: nodes[k].z, g: nodes[k].g, top: nodes[k].top, yaw: L.yaw, w: 2 * L.off + 1.4, off: L.off, type: L.type });
}

export function liftUnitGeo(type) {
  const P = [];
  const B = (w, h, d, x, y, z, c) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); P.push({ g, c }); };
  if (type === 'chair' && BLEND.geo.chair6_closed) {
    B(0.3, 0.2, 0.3, 0, 0, 0, '#3c4350'); B(0.1, 1.8, 0.1, 0, -0.9, -0.1, '#8b939e');
    B(3.6, 0.12, 0.56, 0, -2.38, 0.2, '#2c313a'); B(3.6, 0.6, 0.1, 0, -2.0, -0.25, '#2457c9');
    B(3.7, 0.9, 1.0, 0, -1.75, 0.25, '#8fb4d3');
  } else if (type === 'chair') {
    B(0.3, 0.2, 0.3, 0, 0, 0, '#3c4350'); B(0.08, 2.3, 0.08, 0, -1.15, 0, '#6f7784');
    B(0.08, 0.08, 0.6, 0, -2.3, 0.05, '#6f7784');
    B(1.9, 0.09, 0.56, 0, -2.36, 0.12, '#2457c9'); B(1.9, 0.62, 0.08, 0, -2.04, -0.17, '#2457c9');
    B(1.9, 0.05, 0.05, 0, -1.78, 0.6, '#9aa3b0'); B(0.05, 0.5, 0.05, -0.9, -2.0, 0.6, '#9aa3b0'); B(0.05, 0.5, 0.05, 0.9, -2.0, 0.6, '#9aa3b0');
  } else if (type === 'gondola') {
    B(0.3, 0.25, 0.3, 0, 0, 0, '#3c4350'); B(0.1, 1.3, 0.1, 0, -0.65, 0, '#6f7784');
    B(2.0, 0.2, 1.9, 0, -1.35, 0, '#e8ecf1'); B(2.0, 2.0, 1.8, 0, -2.45, 0, '#c4232f');
    B(2.04, 0.7, 1.84, 0, -2.05, 0, '#28323f'); B(2.06, 0.1, 1.86, 0, -3.45, 0, '#7a8494');
  } else {
    B(0.25, 0.3, 0.25, 0, 0, 0, '#3c4350'); B(0.05, 4.6, 0.05, 0, -2.3, 0, '#9aa3b0'); B(1.0, 0.06, 0.08, 0, -4.6, 0, '#e5b52e');
  }
  return mergeParts(P);
}

export function buildLiftMeshes(L) {
  const lineMat = new THREE.LineBasicMaterial({ color: '#2a2f38' });
  for (const p of [L.up, L.down]) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p.pts), lineMat));
  const count = Math.floor(2 * L.total / L.spacing);
  const geo = liftUnitGeo(L.type), dgeo = LIFT_DETAIL[L.type] || (LIFT_DETAIL[L.type] = { chair: chairAssembly, gondola: cabinAssembly, tbar: tbarAssembly }[L.type]());
  const mesh = new THREE.InstancedMesh(geo, lambertVC(), count); mesh.frustumCulled = false; mesh.castShadow = true;
  const inst = (g, m, shadow = true) => { const im = new THREE.InstancedMesh(g, m, count); im.frustumCulled = false; im.castShadow = shadow; im.receiveShadow = true; for (let i = 0; i < count; i++) im.setMatrixAt(i, ZERO_M); scene.add(im); return im; };
  const G_ = BLEND.geo, bubbleMat = () => pbrGloss({ color: '#9cc3e0', transparent: true, opacity: 0.3, shininess: 140, side: THREE.DoubleSide, depthWrite: false });
  let parts = null;
  if (L.type === 'chair' && G_.chair6_closed) {
    const fm = lambertVC({ roughness: 0.6 }), bm = bubbleMat();
    parts = [{ m: inst(G_.chair6_closed, fm), up: true }, { m: inst(G_.bubble_closed, bm, false), up: true }, { m: inst(G_.chair6_open, fm), up: false }, { m: inst(G_.bubble_open, bm, false), up: false }];
    L.own = new THREE.Group(); L.own.add(new THREE.Mesh(G_.chair6_closed, fm), new THREE.Mesh(G_.bubble_closed, pbrGloss({ color: '#9cc3e0', transparent: true, opacity: 0.18, shininess: 140, side: THREE.DoubleSide, depthWrite: false })));
    L.own.children[0].castShadow = true;
  } else if (L.type === 'gondola' && G_.cabin10_body) {
    parts = [{ m: inst(G_.cabin10_body, lambertVC({ roughness: 0.4 })) }, { m: inst(G_.cabin10_glass, pbrGloss({ color: '#28384a', transparent: true, opacity: 0.62, shininess: 120, side: THREE.DoubleSide }), false) }];
    L.own = new THREE.Group(); L.own.add(new THREE.Mesh(G_.cabin10_body, lambertVC({ roughness: 0.4 })), new THREE.Mesh(G_.cabin10_glass, pbrGloss({ color: '#28384a', transparent: true, opacity: 0.62, shininess: 120, side: THREE.DoubleSide })));
  }
  const dmesh = parts ? null : inst(dgeo, lambertVC());
  scene.add(mesh); liftAnim.push({ L, mesh, dmesh, parts, count });
  if (!L.own) { L.own = new THREE.Mesh(dgeo, lambertVC()); L.own.castShadow = true; }
  L.own.visible = false; scene.add(L.own);
  // stations, assembled piece by piece
  for (const [p, isTop] of [[L.B, false], [L.T, true]]) {
    const g = gridH(p.x, p.z), cableY = (isTop ? L.up.pts[L.up.pts.length - 1] : L.up.pts[0]).y;
    const grp = stationAssembly(L, isTop, cableY - g, { x: p.x, z: p.z, g }).toGroup(30);
    grp.position.set(p.x, g, p.z); grp.rotation.y = L.yaw; scene.add(grp);
  }
}

export function buildTowers() {
  const pole = new THREE.CylinderGeometry(0.28, 0.42, 1, 8); pole.translate(0, 0.5, 0);
  const pm = new THREE.InstancedMesh(pole, metal({ color: '#7d8796' }), towerList.length);
  const head = mergeParts([{ g: new THREE.BoxGeometry(1, 0.35, 0.5), c: '#4b5361' }, { g: (() => { const g = new THREE.BoxGeometry(0.14, 0.6, 0.9); g.translate(0.46, -0.3, 0); return g; })(), c: '#2d333c' }, { g: (() => { const g = new THREE.BoxGeometry(0.14, 0.6, 0.9); g.translate(-0.46, -0.3, 0); return g; })(), c: '#2d333c' }]);
  const hm = new THREE.InstancedMesh(head, lambertVC(), towerList.length);
  const d = new THREE.Object3D();
  towerList.forEach((t, i) => {
    d.position.set(t.x, t.g - 1, t.z); d.rotation.set(0, t.yaw, 0); d.scale.set(1, t.top - t.g + 1.2, 1); d.updateMatrix(); pm.setMatrixAt(i, d.matrix);
    d.position.set(t.x, t.top + 0.35, t.z); d.scale.set(t.w, 1, 1); d.updateMatrix(); hm.setMatrixAt(i, d.matrix);
  });
  pm.frustumCulled = hm.frustumCulled = false; pm.castShadow = hm.castShadow = true;
  scene.add(pm, hm);
  TOWERS.pm = pm; TOWERS.hm = hm;
  towerList.forEach((t, i) => { const A = towerAssembly(t, t.off, t.type), g = A.toGroup(t.top - t.g + 8); g.position.set(t.x, t.g, t.z); g.rotation.y = t.yaw; g.visible = false; scene.add(g); t.detail = g; t.i = i; d.position.set(t.x, t.g - 1, t.z); d.rotation.set(0, t.yaw, 0); d.scale.set(1, t.top - t.g + 1.2, 1); d.updateMatrix(); t.pm = d.matrix.clone(); d.position.set(t.x, t.top + 0.35, t.z); d.scale.set(t.w, 1, 1); d.updateMatrix(); t.hm = d.matrix.clone(); });
}

export function updateNearTowers(cam) {
  if (!TOWERS.pm) return; let dirty = false;
  for (const t of towerList) {
    const near = Math.hypot(t.x - cam.x, t.z - cam.z) < 450;
    if (near === t.detail.visible) continue;
    t.detail.visible = near; TOWERS.pm.setMatrixAt(t.i, near ? ZERO_M : t.pm); TOWERS.hm.setMatrixAt(t.i, near ? ZERO_M : t.hm); dirty = true;
  }
  if (dirty) { TOWERS.pm.instanceMatrix.needsUpdate = true; TOWERS.hm.instanceMatrix.needsUpdate = true; }
}

// each lift runs on its own clock (phase in metres of cable): speeding up your ride speeds up the whole lift,
// so the other chairs and the skiers on them keep their spacing with yours
export function liftClock(dt) {
  for (const L of LIFTS) {
    const mine = running && P.state === 'lift' && P.lift === L && !mapOpen && !dlgOpen && !jnlOpen;
    L.mult = mine && (input.grab || input.up) ? 4 : 1;
    L.phase = (L.phase || 0) + dt * L.speed * (mapOpen || dlgOpen || jnlOpen ? 0 : L.mult);
  }
}

export function updateLiftAnim(time) {
  for (const A of liftAnim) {
    const L = A.L, T = L.total;
    // only the vehicles in use are drawn: matrices are packed and the instance counts trimmed (hidden instances
    // would otherwise still go through the vertex shader and the shadow passes)
    let nf = 0, nd = 0; if (A.parts) for (const p of A.parts) p.n = 0;
    for (let i = 0; i < A.count; i++) {
      let u = ((L.phase || 0) + i * L.spacing) % (2 * T);
      let yaw = L.yaw;
      if (u < T) L.up.pointAt(u, _q); else { L.down.pointAt(u - T, _q); yaw += Math.PI; }
      _m.position.copy(_q); _m.rotation.set(0, yaw, 0); _m.scale.set(1, 1, 1);
      if (L.type === 'tbar' && u >= T) _m.scale.set(1, 0.35, 1);
      _m.updateMatrix();
      const near = Math.abs(_q.x - camera.position.x) + Math.abs(_q.z - camera.position.z) < 320;
      if (!near) A.mesh.setMatrixAt(nf++, _m.matrix);
      else if (A.dmesh) A.dmesh.setMatrixAt(nd++, _m.matrix);
      else for (const p of A.parts) if (p.up === undefined || p.up === u < T) p.m.setMatrixAt(p.n++, _m.matrix);
    }
    A.mesh.count = nf; A.mesh.instanceMatrix.needsUpdate = true;
    if (A.dmesh) { A.dmesh.count = nd; A.dmesh.instanceMatrix.needsUpdate = true; } else for (const p of A.parts) { p.m.count = p.n; p.m.instanceMatrix.needsUpdate = true; }
  }
}

export function __init_2755() {
LSPEC = { chair: { st: 6.8, tw: 11, sp: 80, clr: 6.4 }, gondola: { st: 7.6, tw: 14, sp: 120, clr: 7.8 }, tbar: { st: 5.8, tw: 6.4, sp: 55, clr: 5.0 } };
towerList = [];
liftAnim = [];
LIFT_DETAIL = {};
TOWERS = {};
_q = new V3();
_q2 = new V3();
_m = new THREE.Object3D();
}
