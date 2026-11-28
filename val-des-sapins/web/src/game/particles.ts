// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « particles ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { colorCanvasTex } from './core';
import { scene } from './render';

export let SPRAY, spray, sprayGeo, sprayPts, CLOUD, cloud, cloudGeo, puffTex, cloudPts;


export function emit(p, v, n, spread) {
  for (let k = 0; k < n; k++) {
    const i = spray.i = (spray.i + 1) % SPRAY;
    spray.pos[i * 3] = p.x + (Math.random() - 0.5) * 0.5; spray.pos[i * 3 + 1] = p.y + 0.05; spray.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * 0.5;
    spray.vel[i * 3] = v.x + (Math.random() - 0.5) * spread; spray.vel[i * 3 + 1] = v.y + Math.random() * spread * 0.8; spray.vel[i * 3 + 2] = v.z + (Math.random() - 0.5) * spread;
    spray.life[i] = 0.5 + Math.random() * 0.6;
  }
}

export function emitCloud(p, v) {
  const i = cloud.i = (cloud.i + 1) % CLOUD;
  cloud.pos[i * 3] = p.x + (Math.random() - 0.5); cloud.pos[i * 3 + 1] = p.y + 0.3; cloud.pos[i * 3 + 2] = p.z + (Math.random() - 0.5);
  cloud.vel[i * 3] = v.x * 0.5; cloud.vel[i * 3 + 1] = 0.6 + Math.random() * 0.6; cloud.vel[i * 3 + 2] = v.z * 0.5;
  cloud.life[i] = 1.0 + Math.random() * 0.8;
}

export function updateSpray(dt) {
  for (let i = 0; i < CLOUD; i++) {
    if (cloud.life[i] <= 0) { cloud.pos[i * 3 + 1] = -9999; continue; }
    cloud.life[i] -= dt; const d = Math.exp(-1.6 * dt);
    for (let k = 0; k < 3; k++) { cloud.vel[i * 3 + k] *= d; cloud.pos[i * 3 + k] += cloud.vel[i * 3 + k] * dt; }
  }
  cloudGeo.attributes.position.needsUpdate = true;
  for (let i = 0; i < SPRAY; i++) {
    if (spray.life[i] <= 0) { spray.pos[i * 3 + 1] = -9999; continue; }
    spray.life[i] -= dt; spray.vel[i * 3 + 1] -= 6 * dt;
    const d = Math.exp(-2.5 * dt); spray.vel[i * 3] *= d; spray.vel[i * 3 + 2] *= d;
    spray.pos[i * 3] += spray.vel[i * 3] * dt; spray.pos[i * 3 + 1] += spray.vel[i * 3 + 1] * dt; spray.pos[i * 3 + 2] += spray.vel[i * 3 + 2] * dt;
  }
  sprayGeo.attributes.position.needsUpdate = true;
}

export function __init_5087() {

/* ---------------- Particles ---------------- */
SPRAY = 600;
spray = { pos: new Float32Array(SPRAY * 3), vel: new Float32Array(SPRAY * 3), life: new Float32Array(SPRAY), i: 0 };
sprayGeo = new THREE.BufferGeometry();
 sprayGeo.setAttribute('position', new THREE.BufferAttribute(spray.pos, 3));
sprayPts = new THREE.Points(sprayGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.16, transparent: true, opacity: 0.85, depthWrite: false }));
sprayPts.frustumCulled = false;
 scene.add(sprayPts);
// soft powder clouds: bigger, slower, translucent puffs
CLOUD = 160;
cloud = { pos: new Float32Array(CLOUD * 3), vel: new Float32Array(CLOUD * 3), life: new Float32Array(CLOUD), i: 0 };
cloudGeo = new THREE.BufferGeometry();
 cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloud.pos, 3));
puffTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return colorCanvasTex(c); })();
cloudPts = new THREE.Points(cloudGeo, new THREE.PointsMaterial({ color: '#f4f8ff', size: 1.6, map: puffTex, transparent: true, opacity: 0.42, depthWrite: false }));
cloudPts.frustumCulled = false;
 scene.add(cloudPts);
sprayPts.material.map = puffTex;
 sprayPts.material.size = 0.22;
 sprayPts.material.needsUpdate = true;
}
