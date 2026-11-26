// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « furniture ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { colorCanvasTex } from './core';
import { pbr } from './materials';
import { LEVELS, LIFTS, PISTES } from './pistes';
import { scene } from './render';
import { gridH } from './terrain';



/* ---------------- Piste furniture ---------------- */
export function makeLabel(text, color, sub) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const g = cv.getContext('2d');
  g.fillStyle = 'rgba(12,20,32,0.9)'; g.beginPath(); if (g.roundRect) g.roundRect(4, 4, 504, 152, 18); else g.rect(4, 4, 504, 152); g.fill();
  g.fillStyle = color; g.fillRect(24, 34, 52, 52);
  g.fillStyle = '#f2f6fb'; g.font = '700 54px "Bahnschrift SemiCondensed", "Avenir Next Condensed", "Roboto Condensed", "Arial Narrow", sans-serif'; g.textBaseline = 'middle'; g.fillText(text, 96, 62, 400);
  if (sub) { g.fillStyle = '#a6dcff'; g.font = '600 32px "Bahnschrift SemiCondensed", "Avenir Next Condensed", "Roboto Condensed", "Arial Narrow", sans-serif'; g.fillText(sub, 96, 118, 400); }
  const t = colorCanvasTex(cv); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthWrite: false }));
  s.scale.set(9, 2.8, 1); return s;
}

export function buildMarkers() {
  const geo = new THREE.CylinderGeometry(0.045, 0.045, 1.6, 5); geo.translate(0, 0.8, 0);
  const list = [];
  PISTES.forEach(p => {
    if (p.hidden) return;
    const S = p.samples;
    for (let i = 3; i < S.length - 2; i += 7) {
      const a = S[i - 1], b = S[i + 1], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
      for (const s of [-1, 1]) { const x = S[i].x - dz / l * s * (p.w / 2 + 1), z = S[i].z + dx / l * s * (p.w / 2 + 1); list.push([x, z, p.color]); }
    }
    if (p.link || p.minor) return;
    const s0 = S[1]; const lab = makeLabel(p.name, p.color, LEVELS[p.lvl].label);
    const a = S[0], b = S[2], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz);
    const lx = s0.x - dz / l * (p.w / 2 + 3), lz = s0.z + dx / l * (p.w / 2 + 3);
    lab.position.set(lx, gridH(lx, lz) + 4.2, lz); scene.add(lab);
  });
  const mesh = new THREE.InstancedMesh(geo, pbr({ color: '#ffffff' }), list.length);
  const d = new THREE.Object3D(), c = new THREE.Color();
  list.forEach(([x, z, col], i) => { d.position.set(x, gridH(x, z), z); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); mesh.setColorAt(i, c.set(col)); });
  mesh.frustumCulled = false; scene.add(mesh);
  LIFTS.forEach(L => {
    const lab = makeLabel(L.code + ' · ' + L.name.replace(/^(Télécabine|Télésiège|Téléski) (du|de la|des) /, ''), '#a6dcff', L.name.split(' ')[0]);
    const p = L.board.clone().addScaledVector(L.side, -L.off - 6).addScaledVector(L.dir, -4);
    lab.position.set(p.x, gridH(p.x, p.z) + 4.5, p.z); scene.add(lab);
  });
}

export function __init_4622() {

}
