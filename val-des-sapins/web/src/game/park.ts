// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « park ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { V3, clamp } from './core';
import { lambertVC, metal, pbr } from './materials';
import { PISTES, kickers, rails } from './pistes';
import { scene } from './render';
import { H, gridH } from './terrain';



/* ---------------- Park features ---------------- */
export function pisteFrame0(p, dist) { return pisteFrame(p, dist); }

export function pisteFrame(p, dist) {
  const S = p.samples, i = clamp(Math.round(dist / 4), 1, S.length - 2);
  const a = S[i - 1], b = S[i + 1], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
  return { x: S[i].x, z: S[i].z, dx: dx / l, dz: dz / l };
}

export function buildPark() {
  const park = PISTES.find(p => p.lvl === 'park' && !p.pipe); if (!park) return;
  const sc = Math.min(1, ((park.samples.length - 1) * 4 - 25) / 400);   // a shorter park keeps every feature, closer together
  const pisteFrame = (p, d) => { const g = Math.round(d / 50) * 50; return pisteFrame0(p, g * sc + d - g); };
  const K = (dist, lat, Hh, L, T, W) => {
    const f = pisteFrame(park, dist);
    const x = f.x - f.dz * lat, z = f.z + f.dx * lat; const D = Hh / 0.42;
    const R = L + T + D + W; kickers.push({ x, z, dx: f.dx, dz: f.dz, H: Hh, L, T, D, W, R2: R * R, len: L + T + D });
  };
  K(70, -12, 1.2, 5.5, 3, 5); K(170, 9, 1.9, 7.5, 4, 6); K(290, -7, 2.6, 9.5, 5, 7); K(400, 10, 1.3, 6, 3, 5);
  const Rl = (dist, lat, len, h, type) => {
    const f = pisteFrame(park, dist);
    const ax = f.x - f.dz * lat, az = f.z + f.dx * lat, bx = ax + f.dx * len, bz = az + f.dz * len;
    const a = new V3(ax, gridH(ax, az) + h, az), b = new V3(bx, gridH(bx, bz) + h, bz);
    const lenH = Math.hypot(bx - ax, bz - az), d3 = b.clone().sub(a); const len3 = d3.length(); d3.normalize();
    rails.push({ a, b, dx: (bx - ax) / lenH, dz: (bz - az) / lenH, lenH, slope: (b.y - a.y) / lenH, d3, len3, type, h });
  };
  Rl(112, 13, 9, 0.45, 'box'); Rl(232, -14, 10, 0.7, 'rail'); Rl(345, 13, 12, 0.55, 'box');
  // a real park: a small line for beginners, and a jib line (down rail, kinked rail, rainbow, long box)
  K(120, -20, 0.8, 4.5, 2.5, 4); K(205, -21, 0.9, 4.5, 2.5, 4); K(330, 19, 1.0, 5, 2.5, 4.5);
  const Rh = (dist, lat, len, h0, h1, type) => {   // rail with its own heights at both ends (down rails, rainbows)
    const f = pisteFrame(park, dist), ax = f.x - f.dz * lat, az = f.z + f.dx * lat, bx = ax + f.dx * len, bz = az + f.dz * len;
    const a = new V3(ax, gridH(ax, az) + h0, az), b = new V3(bx, gridH(bx, bz) + h1, bz);
    const lenH = Math.hypot(bx - ax, bz - az), d3 = b.clone().sub(a); const len3 = d3.length(); d3.normalize();
    rails.push({ a, b, dx: (bx - ax) / lenH, dz: (bz - az) / lenH, lenH, slope: (b.y - a.y) / lenH, d3, len3, type, h: Math.max(h0, h1) });
  };
  Rh(60, 18, 9, 1.0, 0.35, 'rail');                                                 // down rail
  Rh(150, 20, 5, 0.45, 0.55, 'rail'); Rh(155, 20, 6, 0.55, 0.2, 'rail');           // kinked rail: flat, then down
  Rh(260, 20, 3.5, 0.35, 0.85, 'rail'); Rh(263.5, 20, 3, 0.85, 0.85, 'rail'); Rh(266.5, 20, 3.5, 0.85, 0.35, 'rail');   // rainbow
  Rh(375, -18, 16, 0.4, 0.4, 'box');                                                // long box
  // kicker meshes
  const mat = lambertVC({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  for (const k of kickers) {
    const st = 0.4, nu = Math.ceil((k.len + 2) / st), nw = Math.ceil((k.W + 2.4) / st);
    const pos = [], col = [], idx = [];
    for (let j = 0; j <= nw; j++) for (let i = 0; i <= nu; i++) {
      const u = -0.5 + i * st, w = -(k.W / 2 + 1.2) + j * st * ((k.W + 2.4) / (nw * st));
      const x = k.x + k.dx * u - k.dz * w, z = k.z + k.dz * u + k.dx * w;
      pos.push(x, H(x, z) + 0.04, z);
      const lip = u > k.L - 0.45 && u < k.L + 0.1 && Math.abs(w) < k.W / 2;
      col.push(lip ? 0.2 : 0.95, lip ? 0.45 : 0.97, lip ? 0.85 : 1.0);
    }
    for (let j = 0; j < nw; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const nr = g.attributes.normal.array; let flip = 0; for (let i = 1; i < nr.length; i += 3) flip += nr[i]; if (flip < 0) { g.setIndex(idx.map((v, i) => idx[i - (i % 3) + (2 - (i % 3))])); g.computeVertexNormals(); }
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = true; scene.add(m);
  }
  for (const r of rails) {
    const grp = new THREE.Group();
    const top = r.type === 'box' ? new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, r.len3), pbr({ color: '#2c3440' }))
      : new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, r.len3, 8), metal({ color: '#c9d1db', roughness: 0.3 }));
    if (r.type !== 'box') top.rotation.x = Math.PI / 2;
    const mid = r.a.clone().lerp(r.b, 0.5); grp.position.copy(mid); grp.lookAt(r.b); grp.add(top); top.position.y = -0.06; top.castShadow = true; scene.add(grp);
    const legMat = metal({ color: '#59616d', roughness: 0.55 });
    for (let t = 0.1; t <= 0.91; t += 0.4) {
      const p = r.a.clone().lerp(r.b, t), g = gridH(p.x, p.z), hgt = p.y - g;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(r.type === 'box' ? 0.45 : 0.08, hgt + 0.3, 0.08), legMat);
      leg.position.set(p.x, g + hgt / 2 - 0.15, p.z); leg.rotation.y = Math.atan2(r.dx, r.dz); scene.add(leg);
    }
  }
}

export function __init_4553() {

}
