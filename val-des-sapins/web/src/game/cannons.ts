// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « cannons ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { V3 } from './core';
import { lambertVC, mergeParts } from './materials';
import { puffTex } from './particles';
import { PISTES, ZN, ZR, clearGrid, pisteHeading, rasterSeg } from './pistes';
import { scene } from './render';
import { gridH } from './terrain';
import { PLAGNE } from './world-data';

export let cannons, PLUME, plume, plumeGeo;


export function genCannons() {
  const runs = PLAGNE ? [['Mont Saint-Sauveur', 120, 900], ['Puy du Fou', 700, 1500], ['Loup Garou', 80, 880], ['Boulevard', 60, 640], ['Pavane II', 60, 740], ['Mira', 1000, 1800], ['Gavotte', 1200, 1950]] : [['Les Sapins', 180, 1080], ['Retour Village', 170, 1100], ['Les Écureuils', 220, 420], ['Les Marmottes', 10, 200], ["Le Mur de l'Est", 980, 1160], ['La Grande Combe', 900, 1200]];
  for (const [pn, d0, d1] of runs) {
    const p = PISTES.find(q => q.name === pn); if (!p) continue;
    const S = p.samples, hw = p.w / 2; let side = 1, k = 0;
    for (let d = d0; d < Math.min(d1, (S.length - 3) * 4); d += 64) {
      const i = Math.floor(d / 4), hd = pisteHeading(p, i);
      const off = hw + 2.2, x = S[i].x + Math.cos(hd) * off * side, z = S[i].z - Math.sin(hd) * off * side;
      cannons.push({ x, z, y: gridH(x, z), hd, side, type: k % 2 ? 'fan' : 'lance', piste: p.idx });
      rasterSeg(ZR, ZN - 1, x, z, x, z, 5, (ix, iz) => { clearGrid[iz * ZN + ix] = 1; });
      side = -side; k++;
    }
  }
}

export function buildCannonMeshes() {
  const lance = mergeParts([
    { g: (() => { const g = new THREE.CylinderGeometry(0.09, 0.13, 8, 6); g.translate(0, 4, 0); g.rotateZ(-0.42); return g; })(), c: '#9aa3ae' },
    { g: (() => { const g = new THREE.CylinderGeometry(0.22, 0.16, 1.1, 8); g.rotateZ(-0.42 - Math.PI / 2 + 0.6); g.translate(3.25, 7.35, 0); return g; })(), c: '#d23a2a' },
    { g: (() => { const g = new THREE.BoxGeometry(0.6, 0.9, 0.5); g.translate(0, 0.45, 0); return g; })(), c: '#3d4652' }]);
  const fan = mergeParts([
    { g: (() => { const g = new THREE.CylinderGeometry(0.85, 0.85, 1.6, 16, 1, true); g.rotateZ(Math.PI / 2 - 0.35); g.translate(0.25, 2.4, 0); return g; })(), c: '#e9eef3' },
    { g: (() => { const g = new THREE.CylinderGeometry(0.82, 0.82, 0.2, 16); g.rotateZ(Math.PI / 2 - 0.35); g.translate(-0.5, 2.15, 0); return g; })(), c: '#2b3138' },
    { g: (() => { const g = new THREE.CylinderGeometry(0.08, 0.1, 2.3, 6); g.translate(0, 1.15, 0); return g; })(), c: '#5d6670' },
    { g: (() => { const g = new THREE.BoxGeometry(1.8, 0.35, 1.2); g.translate(0, 0.2, 0); return g; })(), c: '#e0a325' }]);
  const mk = (geo, list) => {
    const m = new THREE.InstancedMesh(geo, lambertVC(), list.length), o = new THREE.Object3D();
    // the gun points across the piste: local +x aims at the snow
    list.forEach((c, i) => { o.position.set(c.x, c.y, c.z); o.rotation.set(0, c.hd + (c.side > 0 ? Math.PI : 0), 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.castShadow = true; m.frustumCulled = false; scene.add(m);
  };
  mk(lance, cannons.filter(c => c.type === 'lance')); mk(fan, cannons.filter(c => c.type === 'fan'));
  cannons.forEach(c => {
    const a = c.hd + (c.side > 0 ? Math.PI : 0), ax = Math.cos(a), az = -Math.sin(a);   // local +x in world
    c.nozzle = new V3(c.x + ax * (c.type === 'lance' ? 3.6 : 1.1), c.y + (c.type === 'lance' ? 7.6 : 2.6), c.z + az * (c.type === 'lance' ? 3.6 : 1.1));
    c.dir = new V3(ax, c.type === 'lance' ? -0.05 : 0.35, az).normalize();
  });
}

export function initPlumes() {
  plumeGeo = new THREE.BufferGeometry(); plumeGeo.setAttribute('position', new THREE.BufferAttribute(plume.pos, 3));
  const pts = new THREE.Points(plumeGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.1, map: puffTex, transparent: true, opacity: 0.5, depthWrite: false }));
  pts.frustumCulled = false; scene.add(pts);
}

export function updatePlumes(dt, cam) {
  if (!plumeGeo) return;
  let active = 0;
  for (const c of cannons) {
    if (active >= 10) break;
    if (Math.abs(c.x - cam.x) > 260 || Math.abs(c.z - cam.z) > 260) continue;
    active++;
    const n = Math.floor(dt * 130 + Math.random());
    for (let k = 0; k < n; k++) {
      const i = plume.i = (plume.i + 1) % PLUME, sp = (c.type === 'lance' ? 7 : 13) * (0.7 + Math.random() * 0.6);
      plume.pos[i * 3] = c.nozzle.x; plume.pos[i * 3 + 1] = c.nozzle.y; plume.pos[i * 3 + 2] = c.nozzle.z;
      plume.vel[i * 3] = c.dir.x * sp + (Math.random() - 0.5) * 1.6; plume.vel[i * 3 + 1] = c.dir.y * sp + (Math.random() - 0.5) * 1.2; plume.vel[i * 3 + 2] = c.dir.z * sp + (Math.random() - 0.5) * 1.6;
      plume.life[i] = 2.2 + Math.random() * 1.5;
    }
  }
  for (let i = 0; i < PLUME; i++) {
    if (plume.life[i] <= 0) { plume.pos[i * 3 + 1] = -9999; continue; }
    plume.life[i] -= dt; const d = Math.exp(-1.3 * dt);
    plume.vel[i * 3] = plume.vel[i * 3] * d + 0.6 * dt; plume.vel[i * 3 + 2] = plume.vel[i * 3 + 2] * d + 0.3 * dt;
    plume.vel[i * 3 + 1] = plume.vel[i * 3 + 1] * d - 1.4 * dt;
    plume.pos[i * 3] += plume.vel[i * 3] * dt; plume.pos[i * 3 + 1] += plume.vel[i * 3 + 1] * dt; plume.pos[i * 3 + 2] += plume.vel[i * 3 + 2] * dt;
  }
  plumeGeo.attributes.position.needsUpdate = true;
}

export function nearestCannon(x, z) { let m = 1e9; for (const c of cannons) m = Math.min(m, Math.hypot(c.x - x, c.z - z)); return m; }

export function __init_2681() {

/* ---------------- Snow cannons ---------------- */
cannons = [];
// snowmaking plumes: one shared particle pool, only cannons near the camera blow
PLUME = 2400;
plume = { pos: new Float32Array(PLUME * 3), vel: new Float32Array(PLUME * 3), life: new Float32Array(PLUME), i: 0 };
plumeGeo = null;
}
