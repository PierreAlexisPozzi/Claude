// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « vehicles ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { AX_Y, _mat, _qa, _quat } from './animation';
import { sfx } from './audio';
import { __set_camSnap, camSnap } from './camera';
import { lerp } from './core';
import { showTrick } from './hud';
import { skier } from './humans';
import { lambertVC, mergeParts, metal, pbrGloss } from './materials';
import { npcHit } from './npcs';
import { emit } from './particles';
import { P, _f, _g, _l, _n, _t, clampWorld, groundBasis, groundN, groundY, input, steerIn, updateTunnel } from './player';
import { riderEvent } from './progression';
import { scene } from './render';
import { H, HALF, TC, normalAt, obstacles, trees } from './terrain';
import { BLEND } from './world-data';

export let sled;


export function buildSled() {
  if (BLEND.geo.sled_paint) {   // Blender model (blender/vehicles.py): one mesh per material class
    const g = new THREE.Group(), add = (k, m, shadow = true) => { const ms = new THREE.Mesh(BLEND.geo[k], m); ms.castShadow = shadow; ms.receiveShadow = true; g.add(ms); };
    add('sled_paint', lambertVC({ roughness: 0.3, side: THREE.DoubleSide }));
    add('sled_dark', lambertVC({ roughness: 0.72, side: THREE.DoubleSide }));
    add('sled_metal', metal({ vertexColors: true, roughness: 0.35 }));
    add('sled_lamp', lambertVC({ roughness: 0.2, emissive: '#fff2d0', emissiveIntensity: 1.6 }), false);
    add('sled_glass', pbrGloss({ color: '#bcd6ea', transparent: true, opacity: 0.38, shininess: 120, side: THREE.DoubleSide, depthWrite: false }), false);
    g.visible = false; scene.add(g); sled.mesh = g; return;
  }
  const parts = [], B = (w, h, d, x, y, z, c, rx = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); g.translate(x, y, z); parts.push({ g, c }); };
  const RED = '#d7232e', DARK = '#1c1f25', GREY = '#8a9099';
  B(1.02, 0.34, 2.1, 0, 0.5, -0.1, RED);                     // tunnel / chassis
  B(0.96, 0.36, 0.95, 0, 0.74, 0.72, RED, 0.38);            // hood
  B(0.9, 0.12, 0.5, 0, 0.62, 1.2, DARK, 0.5);               // nose
  B(0.56, 0.2, 1.15, 0, 0.8, -0.5, DARK);                   // seat
  B(0.6, 0.35, 1.55, 0, 0.24, -0.55, '#24272d');            // track housing
  for (let k = 0; k < 9; k++) B(0.56, 0.05, 0.08, 0, 0.06, -1.25 + k * 0.17, '#3a3e46');   // track lugs
  for (const s of [-1, 1]) {
    B(0.14, 0.04, 1.05, s * 0.48, 0.03, 1.0, DARK); B(0.14, 0.04, 0.22, s * 0.48, 0.1, 1.55, DARK, -0.6);   // skis
    B(0.05, 0.42, 0.05, s * 0.48, 0.25, 1.0, GREY);                                                         // struts
    B(0.24, 0.05, 0.62, s * 0.4, 0.42, -0.05, DARK);                                                        // footrests
    B(0.06, 0.06, 0.08, s * 0.38, 1.04, 0.22, DARK);                                                        // grips
  }
  B(0.82, 0.04, 0.04, 0, 1.02, 0.22, GREY);                 // handlebar
  B(0.5, 0.1, 0.05, 0, 0.72, 1.18, '#fff6c8', 0.5);         // headlight
  B(0.42, 0.1, 0.05, 0, 0.62, -1.15, '#ff3b3b');            // tail light
  const g = new THREE.Group();
  g.add(new THREE.Mesh(mergeParts(parts), lambertVC()));
  const ws = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.42, 0.02), pbrGloss({ color: '#9fc3e0', transparent: true, opacity: 0.45, shininess: 90 }));
  ws.position.set(0, 1.12, 0.38); ws.rotation.x = -0.55; g.add(ws);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.visible = false; scene.add(g); sled.mesh = g;
}

export function toggleSled() {
  if (P.state !== 'sled') riderEvent('sled');
  if (P.state === 'sled') {                                 // get off, park it beside you
    if (P.vel.length() > 5) { showTrick('Arrêtez-vous', 'Freinez (↓) pour descendre de la motoneige'); return; }
    sled.x = P.pos.x; sled.z = P.pos.z; sled.yaw = P.yaw; sled.parked = true;
    const sx = Math.cos(P.yaw) * 1.6, sz = -Math.sin(P.yaw) * 1.6;
    P.pos.x += sx; P.pos.z += sz; P.pos.y = groundY(P.pos.x, P.pos.z);
    P.state = 'ski'; P.vel.set(0, 0, 0); __set_camSnap(true); skierSkis(true);
    showTrick('À skis', 'V pour reprendre la motoneige');
    return;
  }
  if (P.state !== 'ski' && P.state !== 'crash') return;
  const near = sled.parked && Math.hypot(sled.x - P.pos.x, sled.z - P.pos.z) < 25;
  if (!near) { sled.yaw = P.yaw; }                           // it drives up to you
  P.state = 'sled'; P.vel.set(0, 0, 0); P.yaw = near ? sled.yaw : P.yaw; P.air = null; P.press = null; P.charge = 0; sled.air = false;
  if (near) { P.pos.x = sled.x; P.pos.z = sled.z; }
  P.pos.y = groundY(P.pos.x, P.pos.z); sled.parked = false; __set_camSnap(true); skierSkis(false);
  showTrick(near ? 'Motoneige' : 'Motoneige appelée', '↑ gaz · ↓ frein / marche arrière · V pour descendre');
}

export function skierSkis(on) { if (!skier) return; skier.feet.forEach(f => f.g.children.forEach((c, i) => { if (i <= 2 || c.userData.ski) c.visible = on; })); skier.arms.forEach(a => { a.pole.visible = on; }); }

export function stepSled(dt) {
  const speed = P.vel.length();
  groundBasis(P.pos.x, P.pos.z);
  const along = P.vel.dot(_f), steer = steerIn();
  const thr = input.up ? 1 : 0, brk = input.down ? 1 : 0;
  sled.engine = lerp(sled.engine, thr, Math.min(1, dt * 4));
  if (!sled.air) {
    const turn = steer * Math.min(1.7, 0.45 + Math.abs(along) * 0.12) * (along < -0.3 ? -1 : 1);
    P.yaw += turn * dt; P.vel.applyAxisAngle(_n, turn * dt * 0.9);
    groundBasis(P.pos.x, P.pos.z);
    _g.set(0, -9.81, 0); _g.addScaledVector(_n, -_g.dot(_n));
    P.vel.addScaledVector(_g, dt);
    const fwd = P.vel.dot(_f);
    if (thr) P.vel.addScaledVector(_f, 8 * Math.max(0, 1 - Math.max(0, fwd) / 22) * dt);              // ~75 km/h top speed, climbs up to ~40°
    // brake; once stopped it holds on the slope, keep holding ↓ to reverse
    sled.hold = brk && fwd < 0.6 ? (sled.hold || 0) + dt : 0;
    if (brk && fwd > 0.6) P.vel.addScaledVector(_f, -9 * dt);
    else if (brk && sled.hold < 0.9) P.vel.set(0, 0, 0);
    else if (brk) P.vel.addScaledVector(_f, -3.2 * Math.max(0, 1 + fwd / 4.5) * dt);
    const sp = P.vel.length(), dec = (0.07 * 9.81 * _n.y + 0.0022 * sp * sp) * dt;
    if (sp > 0) P.vel.multiplyScalar(Math.max(0, sp - dec) / sp);
    const lat = P.vel.dot(_l); P.vel.addScaledVector(_l, -lat * (1 - Math.exp(-9 * dt)));
    P.vel.addScaledVector(_n, -P.vel.dot(_n));
    if (P.vel.length() < 0.15 && !thr && !brk && Math.abs(_g.dot(_f)) < 0.9) P.vel.set(0, 0, 0);
    if (thr && speed > 2 && Math.random() < 0.8) { _t.copy(_f).multiplyScalar(-speed * 0.35); _t.y += 2.2; emit(_t.clone().multiplyScalar(0).add(P.pos).addScaledVector(_f, -1.3), _t, 3, 2.2); }
  } else { P.vel.y -= 9.81 * dt; }
  P.pos.addScaledVector(P.vel, dt); clampWorld(); updateTunnel();
  const gh = groundY(P.pos.x, P.pos.z);
  if (sled.air) {
    if (P.pos.y <= gh) { P.pos.y = gh; groundN(P.pos.x, P.pos.z, _t); const imp = P.vel.dot(_t); P.vel.addScaledVector(_t, -imp); if (imp < -10) P.vel.multiplyScalar(0.6); sled.air = false; sfx.land(Math.min(1, -imp / 12)); }
  } else {
    groundN(P.pos.x, P.pos.z, _t);
    const vh = Math.hypot(P.vel.x, P.vel.z);
    if (vh > 6) { const g1 = groundY(P.pos.x + P.vel.x / vh * 0.8, P.pos.z + P.vel.z / vh * 0.8); if ((P.vel.y / vh - (g1 - gh) / 0.8) * vh > 3.5) sled.air = true; }
    if (!sled.air) { P.pos.y = gh; const s0 = P.vel.length(), sep = P.vel.dot(_t); P.vel.addScaledVector(_t, -sep); const s1 = P.vel.length(); if (s1 > 1e-4) P.vel.multiplyScalar(s0 / s1); }
  }
  sledCollide();
}

export function sledCollide() {
  const sp = P.vel.length(), R = 1.2;
  const push = (ox, oz, r) => {
    const ex = P.pos.x - ox, ez = P.pos.z - oz, d = Math.hypot(ex, ez); if (d >= r) return false;
    const nx = ex / (d || 1), nz = ez / (d || 1); P.pos.x = ox + nx * r; P.pos.z = oz + nz * r;
    const vr = P.vel.x * nx + P.vel.z * nz; if (vr < 0) { P.vel.x -= vr * nx * 1.3; P.vel.z -= vr * nz * 1.3; }
    if (sp > 9) { P.vel.multiplyScalar(0.3); showTrick('Choc !', 'Attention aux obstacles'); sfx.land(1); }
    return true;
  };
  if (P.tunnel) return;
  const cx = Math.floor((P.pos.x + HALF) / TC), cz = Math.floor((P.pos.z + HALF) / TC);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const l = trees.grid.get(cx + dx + (cz + dz) * 1000); if (l) for (const i of l) if (push(trees.x[i], trees.z[i], 0.45 * trees.s[i] + R)) return; }
  for (const o of obstacles) if (push(o.x, o.z, o.r + R * 0.6)) return;
  const n = npcHit(1.6); if (n && sp > 2) { push(n.x, n.z, 1.6); showTrick('Attention aux skieurs !', 'Roulez au pas sur les pistes'); }
}

export function placeSledMesh(dt) {
  const m = sled.mesh; if (!m) return;
  if (P.state === 'sled') {
    groundBasis(P.pos.x, P.pos.z); _mat.makeBasis(_l, _n, _f); _quat.setFromRotationMatrix(_mat);
    if (sled.air) _quat.setFromAxisAngle(AX_Y, P.yaw);
    sled.q.slerp(_quat, 1 - Math.exp(-dt * 10)); m.quaternion.copy(sled.q); m.position.copy(P.pos); m.visible = true;
  } else if (sled.parked) {
    normalAt(sled.x, sled.z, _n); m.position.set(sled.x, H(sled.x, sled.z), sled.z); m.quaternion.setFromAxisAngle(AX_Y, sled.yaw); _qa.setFromUnitVectors(AX_Y, _n); m.quaternion.premultiply(_qa); m.visible = true;
  } else m.visible = false;
}

export function __init_3276() {

/* ---------------- Snowmobile ---------------- */
sled = { mesh: null, x: 0, y: 0, z: 0, yaw: 0, parked: false, air: false, q: new THREE.Quaternion(), engine: 0 };
}
