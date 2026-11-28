// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « fauna ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { Assembly, X1, Z1, _ay, axesAlong, blob, faces, framedFloor, hashSeed, limb, logCourse, onFace, snowRoof, v3 } from './assembly';
import { liftDist } from './buildings';
import { V3, clamp, lerp, wrapPi } from './core';
import { lambertVC } from './materials';
import { LIFTS, SPAWN_LIFT, pisteDist, zIdx, zoneGrid } from './pistes';
import { P } from './player';
import { SMALL_LAYER, scene } from './render';
import { ALT0, H, HALF, TC, gridH, mulberry32, normalAt, obstacles, trees } from './terrain';
import { PLAGNE } from './world-data';

export let fauna, faunaMat, faunaRnd, tube, C_, NZ;


export function partMesh(A, parent, x = 0, y = 0, z = 0) { const g = A.toGeometry(); const m = new THREE.Mesh(g, faunaMat); m.layers.set(SMALL_LAYER); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }

export function makeChamois() {
  const root = new THREE.Group(), DARK = '#3a2b22', PALE = '#d8cbb4', BLACK = '#18120e';
  const body = new Assembly(51);
  blob(body, 'wood', 0, 0.86, 0, 0.42, 0.5, 1.0, new THREE.Color(DARK)); blob(body, 'wood', 0, 0.86, 0.33, 0.4, 0.52, 0.5, new THREE.Color(DARK));
  blob(body, 'wood', 0, 0.88, -0.36, 0.4, 0.48, 0.45, new THREE.Color(DARK)); blob(body, 'wood', 0, 0.75, 0, 0.3, 0.2, 0.7, new THREE.Color('#4a382b'));
  blob(body, 'wood', 0, 0.93, -0.58, 0.16, 0.2, 0.1, new THREE.Color('#e6dccd')); blob(body, 'wood', 0, 0.98, -0.6, 0.06, 0.12, 0.06, new THREE.Color(BLACK));
  partMesh(body, root);
  const neck = new THREE.Group(); neck.position.set(0, 1.0, 0.48); root.add(neck);
  const nk = new Assembly(52); limb(nk, 'wood', v3(0, -0.05, -0.05), v3(0, 0.3, 0.2), 0.11, new THREE.Color(DARK));
  blob(nk, 'wood', 0, 0.34, 0.3, 0.17, 0.2, 0.3, new THREE.Color(PALE));
  for (const s of [-1, 1]) { nk.put('box', 'wood', s * 0.05, 0.36, 0.35, X1, _ay, Z1, 0.035, 0.05, 0.26, new THREE.Color(BLACK)); blob(nk, 'wood', s * 0.08, 0.47, 0.22, 0.05, 0.12, 0.04, new THREE.Color(DARK));
    limb(nk, 'wood', v3(s * 0.04, 0.42, 0.28), v3(s * 0.05, 0.6, 0.27), 0.016, new THREE.Color(BLACK)); limb(nk, 'wood', v3(s * 0.05, 0.6, 0.27), v3(s * 0.055, 0.63, 0.19), 0.013, new THREE.Color(BLACK)); }
  blob(nk, 'wood', 0, 0.28, 0.44, 0.08, 0.07, 0.07, new THREE.Color(BLACK));
  partMesh(nk, neck);
  const legs = [];
  for (const [x, z] of [[0.13, 0.4], [-0.13, 0.4], [0.13, -0.4], [-0.13, -0.4]]) {
    const hip = new THREE.Group(); hip.position.set(x, 0.8, z); root.add(hip);
    const up = new Assembly(53); limb(up, 'wood', v3(0, 0, 0), v3(0, -0.4, z < 0 ? -0.05 : 0.02), 0.06, new THREE.Color(DARK)); partMesh(up, hip);
    const knee = new THREE.Group(); knee.position.set(0, -0.4, z < 0 ? -0.05 : 0.02); hip.add(knee);
    const lo = new Assembly(54); limb(lo, 'wood', v3(0, 0, 0), v3(0, -0.36, 0.02), 0.032, new THREE.Color(DARK)); lo.put('box', 'wood', 0, -0.38, 0.04, X1, _ay, Z1, 0.06, 0.05, 0.09, new THREE.Color(BLACK)); partMesh(lo, knee);
    legs.push({ hip, knee, front: z > 0, side: x > 0 ? 1 : -1 });
  }
  scene.add(root);
  return { kind: 'chamois', root, neck, legs, speed: 0, phase: faunaRnd() * 6, state: 'graze', t: faunaRnd() * 5, yaw: faunaRnd() * 6.28 };
}

export function makeHare() {
  const root = new THREE.Group(), W = '#f4f2ee', A = new Assembly(61);
  blob(A, 'wood', 0, 0.24, 0, 0.24, 0.26, 0.42, new THREE.Color(W)); blob(A, 'wood', 0, 0.2, -0.12, 0.26, 0.24, 0.3, new THREE.Color(W));
  blob(A, 'wood', 0, 0.38, 0.22, 0.15, 0.16, 0.21, new THREE.Color(W)); blob(A, 'wood', 0, 0.22, -0.26, 0.08, 0.08, 0.08, new THREE.Color(W));
  for (const s of [-1, 1]) { limb(A, 'wood', v3(s * 0.04, 0.44, 0.2), v3(s * 0.07, 0.62, 0.1), 0.026, new THREE.Color(W), 0.012); blob(A, 'wood', s * 0.075, 0.63, 0.095, 0.04, 0.05, 0.03, new THREE.Color('#1b1b1b')); blob(A, 'wood', s * 0.06, 0.4, 0.3, 0.02, 0.02, 0.02, new THREE.Color('#2a1d12')); }
  for (const s of [-1, 1]) blob(A, 'wood', s * 0.1, 0.08, -0.1, 0.08, 0.1, 0.22, new THREE.Color('#e8e4dc'));
  const body = partMesh(A, root); scene.add(root);
  return { kind: 'hare', root, body, speed: 0, phase: 0, state: 'sit', t: faunaRnd() * 5, yaw: faunaRnd() * 6.28 };
}

export function makeBird(kind) {
  const root = new THREE.Group(), A = new Assembly(kind === 'chough' ? 71 : 72);
  const body = kind === 'chough' ? '#15161a' : '#f2f2ee';
  blob(A, 'wood', 0, 0, 0, 0.13, 0.13, 0.3, new THREE.Color(body)); blob(A, 'wood', 0, 0.06, 0.15, 0.1, 0.1, 0.11, new THREE.Color(body));
  A.put('box', 'wood', 0, 0.05, 0.23, X1, _ay, Z1, 0.025, 0.025, 0.07, new THREE.Color(kind === 'chough' ? '#f2c218' : '#1b1b1b'));
  A.put('box', 'wood', 0, 0.0, -0.2, X1, _ay, Z1, 0.1, 0.02, 0.14, new THREE.Color(body));
  if (kind === 'ptarmigan') { blob(A, 'wood', 0, 0.12, 0.16, 0.05, 0.02, 0.03, new THREE.Color('#d1242b')); blob(A, 'wood', 0.035, 0.08, 0.19, 0.02, 0.02, 0.02, new THREE.Color('#111')); }
  else for (const s of [-1, 1]) limb(A, 'wood', v3(s * 0.03, -0.05, 0), v3(s * 0.03, -0.12, 0.02), 0.008, new THREE.Color('#d1242b'));
  partMesh(A, root);
  const wings = [];
  for (const s of [-1, 1]) { const w = new THREE.Group(); w.position.set(s * 0.05, 0.03, 0); root.add(w); const W = new Assembly(73); for (let k = 0; k < 5; k++) W.put('box', 'wood', s * (0.07 + k * 0.05), 0, 0.03 - k * 0.012, X1, _ay, Z1, 0.06, 0.012, 0.13 - k * 0.012, new THREE.Color(kind === 'chough' ? (k > 3 ? '#0d0e10' : body) : body)); partMesh(W, w); wings.push({ g: w, s }); }
  root.scale.setScalar(kind === 'chough' ? 1.25 : 1.1);
  scene.add(root);
  return { kind, root, wings, phase: faunaRnd() * 6, state: kind === 'chough' ? 'fly' : 'sit', t: 0, yaw: faunaRnd() * 6.28 };
}

export function faunaSpot(test, tries = 4000) {
  for (let i = 0; i < tries; i++) { const x = (faunaRnd() * 2 - 1) * (HALF - 120), z = (faunaRnd() * 2 - 1) * (HALF - 120); if (test(x, z)) return [x, z]; }
  return null;
}

export function initFauna() {
  const nrm = new V3();
  const wild = (x, z) => { const k = zIdx(x, z); return k >= 0 && zoneGrid[k] < 0 && pisteDist[k] > 35 && liftDist(x, z) > 60 && !obstacles.some(o => Math.hypot(o.x - x, o.z - z) < 30); };
  // three chamois herds on steep rocky ground above the forest
  for (let h = 0; h < 3; h++) {
    const s = faunaSpot((x, z) => { const a = gridH(x, z) + ALT0; normalAt(x, z, nrm); return a > 1950 && a < 2400 && nrm.y > 0.62 && nrm.y < 0.88 && wild(x, z); });
    if (!s) continue;
    for (let k = 0; k < 4 + (h % 2); k++) { const c = makeChamois(); c.home = s; c.x = s[0] + (faunaRnd() - 0.5) * 18; c.z = s[1] + (faunaRnd() - 0.5) * 18; fauna.push(c); }
  }
  // mountain hares at the edge of the forest
  for (let k = 0; k < 7; k++) {
    const s = faunaSpot((x, z) => { const a = gridH(x, z) + ALT0; return a < 1950 && wild(x, z) && trees.grid.has(Math.floor((x + HALF) / TC) + Math.floor((z + HALF) / TC) * 1000); });
    if (s) { const hrt = makeHare(); hrt.home = s; hrt.x = s[0]; hrt.z = s[1]; fauna.push(hrt); }
  }
  // ptarmigans near the ridges
  for (let g = 0; g < 3; g++) {
    const s = faunaSpot((x, z) => { const a = gridH(x, z) + ALT0; return a > 2050 && wild(x, z); });
    if (!s) continue;
    for (let k = 0; k < 4; k++) { const b = makeBird('ptarmigan'); b.home = s; b.x = s[0] + (faunaRnd() - 0.5) * 6; b.z = s[1] + (faunaRnd() - 0.5) * 6; fauna.push(b); }
  }
  // alpine choughs around the summit station and the restaurant
  for (const c of [[SPAWN_LIFT().t[0], SPAWN_LIFT().t[1]], PLAGNE ? LIFTS[0].t : [-236, 128]]) for (let k = 0; k < 7; k++) {
    const b = makeBird('chough'); b.home = c; b.orbit = 25 + faunaRnd() * 35; b.alt = 18 + faunaRnd() * 25; b.dir = faunaRnd() < 0.5 ? 1 : -1; b.ang = faunaRnd() * 6.28; b.x = c[0]; b.z = c[1]; fauna.push(b);
  }
}

export function updateFauna(dt, time, cam) {
  const px = P.pos.x, pz = P.pos.z, onLift = P.state === 'lift';
  for (const a of fauna) {
    const far = Math.hypot(a.x - cam.x, a.z - cam.z) > 650; a.root.visible = !far; if (far) continue;
    const dP = onLift ? 1e9 : Math.hypot(a.x - px, a.z - pz), away = Math.atan2(a.x - px, a.z - pz);
    if (a.kind === 'chamois') {
      a.t -= dt;
      if (dP < 42 && a.state !== 'flee') { a.state = 'flee'; a.t = 5 + faunaRnd() * 2; a.yaw = away + (faunaRnd() - 0.5) * 0.6; }
      else if (a.state === 'flee' && a.t <= 0) { a.state = 'graze'; a.t = 4; }
      else if (a.state !== 'flee' && a.t <= 0) { a.state = faunaRnd() < 0.6 ? 'graze' : 'walk'; a.t = 3 + faunaRnd() * 5; const hx = a.home[0] - a.x, hz = a.home[1] - a.z; a.yaw = Math.hypot(hx, hz) > 25 ? Math.atan2(hx, hz) : faunaRnd() * 6.28; }
      const alert = a.state !== 'flee' && dP < 75;
      const target = a.state === 'flee' ? 9 : a.state === 'walk' && !alert ? 0.7 : 0;
      a.speed += (target - a.speed) * Math.min(1, dt * 3);
      if (alert && a.state !== 'flee') a.yaw += wrapPi(Math.atan2(px - a.x, pz - a.z) - a.yaw) * Math.min(1, dt * 2);
      a.x += Math.sin(a.yaw) * a.speed * dt; a.z += Math.cos(a.yaw) * a.speed * dt; a.x = clamp(a.x, -HALF + 60, HALF - 60); a.z = clamp(a.z, -HALF + 60, HALF - 60);
      a.phase += dt * (a.speed > 3 ? 9 : 5) * Math.min(1, a.speed + 0.01);
      const amp = a.speed > 3 ? 0.7 : 0.35 * Math.min(1, a.speed);
      a.legs.forEach((l, i) => { const ph = a.phase + (a.speed > 3 ? (l.front ? 0 : Math.PI) + (l.side > 0 ? 0.4 : 0) : [0, Math.PI, Math.PI, 0][i]); l.hip.rotation.x = Math.sin(ph) * amp; l.knee.rotation.x = Math.max(0, -Math.cos(ph)) * amp * 1.2 * (l.front ? -1 : 1); });
      const grazing = a.state === 'graze' && !alert;
      a.neck.rotation.x += ((grazing ? 1.1 + Math.sin(time * 1.3 + a.phase) * 0.1 : alert ? -0.25 : 0.1) - a.neck.rotation.x) * Math.min(1, dt * 3);
      const y = H(a.x, a.z) + (a.speed > 3 ? Math.abs(Math.sin(a.phase)) * 0.12 : 0);
      a.root.position.set(a.x, y, a.z); a.root.rotation.set(0, a.yaw, 0);
    } else if (a.kind === 'hare') {
      a.t -= dt;
      if (dP < 26 && a.state !== 'flee') { a.state = 'flee'; a.t = 3; a.yaw = away; }
      else if (a.state === 'flee' && a.t <= 0) { a.state = 'sit'; a.t = 3 + faunaRnd() * 4; }
      if (a.state === 'flee') { a.t2 = (a.t2 || 0) - dt; if (a.t2 <= 0) { a.yaw = away + (faunaRnd() - 0.5) * 1.6; a.t2 = 0.5 + faunaRnd() * 0.4; } }
      const sp = a.state === 'flee' ? 7 : 0; a.phase += dt * (sp ? 11 : 0);
      a.x += Math.sin(a.yaw) * sp * dt; a.z += Math.cos(a.yaw) * sp * dt;
      const hop = sp ? Math.abs(Math.sin(a.phase)) * 0.35 : 0;
      a.root.position.set(a.x, H(a.x, a.z) + hop, a.z); a.root.rotation.set(sp ? -Math.cos(a.phase) * 0.25 : 0, a.yaw, 0);
      a.body.scale.set(1, sp ? 0.9 + Math.abs(Math.cos(a.phase)) * 0.15 : 1 + Math.sin(time * 2 + a.phase) * 0.02, sp ? 1.15 : 1);
    } else if (a.kind === 'ptarmigan') {
      if (a.state === 'sit' && dP < 22) { a.state = 'fly'; a.t = 0; a.from = [a.x, a.z]; const ang = away + (faunaRnd() - 0.5) * 0.8, dist = 70 + faunaRnd() * 50; a.to = [clamp(a.x + Math.sin(ang) * dist, -HALF + 60, HALF - 60), clamp(a.z + Math.cos(ang) * dist, -HALF + 60, HALF - 60)]; a.yaw = ang; }
      let y = H(a.x, a.z) + 0.15;
      if (a.state === 'fly') {
        a.t += dt / 4; const t = Math.min(1, a.t); a.x = lerp(a.from[0], a.to[0], t); a.z = lerp(a.from[1], a.to[1], t); y = H(a.x, a.z) + 0.15 + Math.sin(t * Math.PI) * 6;
        a.phase += dt * 22; a.wings.forEach(w => { w.g.rotation.z = w.s * Math.sin(a.phase) * 0.9; });
        if (t >= 1) { a.state = 'sit'; a.home = a.to; }
      } else a.wings.forEach(w => { w.g.rotation.z = 0; });
      a.root.position.set(a.x, y, a.z); a.root.rotation.set(0, a.yaw, 0);
    } else {   // chough: wide loops, bursts of flapping between glides
      a.ang += a.dir * dt * (0.5 + 6 / a.orbit) * 0.6;
      const wob = Math.sin(time * 0.4 + a.phase) * 8;
      a.x = a.home[0] + Math.sin(a.ang) * (a.orbit + wob); a.z = a.home[1] + Math.cos(a.ang) * (a.orbit + wob);
      const y = H(a.home[0], a.home[1]) + a.alt + Math.sin(time * 0.7 + a.phase) * 4;
      const flap = Math.sin(time * 0.9 + a.phase) > 0.2; a.phase += dt * (flap ? 16 : 0);
      a.wings.forEach(w => { w.g.rotation.z = flap ? w.s * Math.sin(a.phase) * 0.8 : w.s * -0.08; });
      a.root.position.set(a.x, y, a.z); a.root.rotation.set(0, a.ang + a.dir * Math.PI / 2, -a.dir * 0.35);
    }
  }
}

export function wheelAt(A, x, y, z, r) {   // a sheave or a roller turning across the line: rubber tyre and steel hub
  A.put('disc', 'stone', x, y, z, _ay, X1, NZ, r * 2, 0.08, r * 2, C_('#1e2024'));
  A.put('disc', 'stone', x, y, z, _ay, X1, NZ, r * 1.3, 0.1, r * 1.3, C_('#9aa3ae'));
}

export function chairAssembly() {
  const A = new Assembly(91), FRAME = C_('#6f7784'), SEAT = C_('#2457c9'), DARK = C_('#2b3038');
  A.put('box', 'stone', 0, 0.02, 0, X1, _ay, Z1, 0.34, 0.22, 0.42, C_('#3c4350'));                      // detachable grip
  for (const z of [-0.14, 0.14]) wheelAt(A, 0, 0.16, z, 0.09, 'x');
  tube(A, 'stone', v3(0, -0.08, 0), v3(0, -1.55, -0.06), 0.045, FRAME);                                  // hanger
  tube(A, 'stone', v3(0, -1.55, -0.06), v3(0, -1.95, -0.32), 0.045, FRAME);
  tube(A, 'stone', v3(-0.98, -1.95, -0.32), v3(0.98, -1.95, -0.32), 0.04, FRAME);                       // backrest frame
  tube(A, 'stone', v3(-0.98, -2.33, 0.0), v3(0.98, -2.33, 0.0), 0.04, FRAME);                           // seat frame
  for (const x of [-0.98, 0.98]) { tube(A, 'stone', v3(x, -1.95, -0.32), v3(x, -2.33, 0.0), 0.035, FRAME); tube(A, 'stone', v3(x, -2.33, 0.0), v3(x, -2.33, 0.42), 0.03, FRAME); tube(A, 'stone', v3(x, -2.33, 0.42), v3(x, -2.05, 0.42), 0.03, FRAME); }   // armrests
  for (let k = -1; k <= 1; k++) {
    A.put('box', 'wood', k * 0.63, -2.3, 0.2, X1, _ay, Z1, 0.58, 0.09, 0.5, SEAT);                       // seat cushions
    const v = new V3(0, Math.cos(0.25), Math.sin(0.25)), n = new V3().crossVectors(X1, v);
    A.put('box', 'wood', k * 0.63, -2.03, -0.25, X1, v, n, 0.58, 0.55, 0.08, SEAT);                      // backrests
  }
  // safety bar with footrest, held up
  tube(A, 'stone', v3(-0.92, -1.72, 0.58), v3(0.92, -1.72, 0.58), 0.025, C_('#c8ccd2'));
  for (const x of [-0.5, 0.5]) { tube(A, 'stone', v3(x, -1.72, 0.58), v3(x, -2.62, 0.72), 0.022, C_('#c8ccd2')); A.put('box', 'stone', x, -2.62, 0.74, X1, _ay, Z1, 0.42, 0.04, 0.16, DARK); }
  tube(A, 'stone', v3(-0.98, -1.95, -0.32), v3(-0.92, -1.72, 0.58), 0.022, C_('#c8ccd2'));
  return A.toGeometry();
}

export function cabinAssembly() {
  const A = new Assembly(92), BODY = C_('#c4232f'), GL = C_('#26303c'), FRAME = C_('#6f7784');
  A.put('box', 'stone', 0, 0.02, 0, X1, _ay, Z1, 0.34, 0.24, 0.5, C_('#3c4350')); for (const z of [-0.17, 0.17]) wheelAt(A, 0, 0.17, z, 0.1, 'x');
  tube(A, 'stone', v3(0, -0.08, 0), v3(0, -0.9, 0), 0.06, FRAME); tube(A, 'stone', v3(0, -0.9, 0), v3(0.0, -1.28, 0.0), 0.06, FRAME);
  A.put('box', 'stone', 0, -1.3, 0, X1, _ay, Z1, 1.7, 0.12, 0.3, FRAME);
  // rounded body: core box, rounded vertical edges, domed roof
  A.put('box', 'wood', 0, -2.45, 0, X1, _ay, Z1, 1.9, 2.0, 1.7, BODY);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A.put('cap', 'wood', sx * 0.93, -3.45, sz * 0.83, X1, _ay, Z1, 0.16, 2.0, 0.16, BODY);
  A.put('ball', 'wood', 0, -1.45, 0, X1, _ay, Z1, 2.0, 0.3, 1.8, C_('#e8ecf1'));
  A.put('box', 'stone', 0, -3.48, 0, X1, _ay, Z1, 1.95, 0.08, 1.75, C_('#7a8494'));
  for (const [nx, nz, L] of [[0, 1, 1.9], [0, -1, 1.9], [1, 0, 1.7], [-1, 0, 1.7]]) {     // glazing band with mullions
    const n = new V3(nx, 0, nz), u = new V3(nz, 0, -nx), off = nz ? 0.86 : 0.96;
    A.put('box', 'glass', nx * off, -2.05, nz * off, u, _ay, n, L - 0.3, 0.75, 0.04, GL);
    for (const s of [-L / 4, L / 4]) A.put('box', 'stone', nx * (off + 0.01) + u.x * s, -2.05, nz * (off + 0.01) + u.z * s, u, _ay, n, 0.05, 0.75, 0.03, C_('#d9dde2'));
  }
  A.put('box', 'stone', 0, -2.75, 0.865, X1, _ay, Z1, 0.02, 1.4, 0.02, C_('#7a1218'));            // door seam
  for (const sx of [-1, 1]) { A.put('box', 'stone', sx * 0.99, -2.6, 0, X1, _ay, Z1, 0.06, 0.9, 1.2, FRAME); for (let k = 0; k < 3; k++) for (const o of [-0.05, 0.05]) A.put('box', 'wood', sx * 1.03, -2.55, -0.4 + k * 0.4 + o, X1, _ay, Z1, 0.025, 1.6, 0.08, C_(['#c4263a', '#2f6fe0', '#f2a12c'][k])); }   // ski holders
  return A.toGeometry();
}

export function tbarAssembly() {
  const A = new Assembly(93), Y = C_('#e5b52e');
  A.put('box', 'stone', 0, 0.02, 0, X1, _ay, Z1, 0.24, 0.2, 0.3, C_('#3c4350'));
  A.put('cap', 'stone', 0, -0.62, 0, X1, _ay, Z1, 0.2, 0.62, 0.2, C_('#9aa3ae'));                // spring box
  tube(A, 'stone', v3(0, -0.62, 0), v3(0, -4.3, 0), 0.008, C_('#2b2b2b'));                       // pull rope
  tube(A, 'stone', v3(0, -4.3, 0), v3(0, -4.62, 0), 0.025, Y);
  A.put('cap', 'wood', -0.5, -4.62, 0, Z1, X1, _ay, 0.07, 1.0, 0.07, Y);
  for (const x of [-0.35, 0.35]) A.put('ball', 'wood', x, -4.62, 0, X1, _ay, Z1, 0.18, 0.1, 0.12, C_('#2b2b2b'));
  return A.toGeometry();
}

export function towerAssembly(t, off, type) {
  // local frame: x across the line, z along it, y up from the ground; t.top - t.g is the height to the cable
  const A = new Assembly(hashSeed(t.x, t.z, 97)), h = t.top - t.g, STEEL = C_(type === 'tbar' ? '#8d969f' : '#7d8796'), DARK = C_('#3a4048');
  A.put('box', 'stone', 0, -0.2, 0, X1, _ay, Z1, 1.8, 0.7, 1.8, C_('#9a958d'));                               // concrete footing
  for (const [x, z] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) A.put('box', 'stone', x, 0.2, z, X1, _ay, Z1, 0.08, 0.12, 0.08, DARK);
  A.put('box', 'stone', 0, 0.18, 0, X1, _ay, Z1, 1.0, 0.08, 1.0, STEEL);
  const n = Math.max(2, Math.ceil(h / 3.2));
  for (let k = 0; k < n; k++) {                                                                                      // tapered column in bolted sections
    const y0 = 0.2 + k * (h - 0.6) / n, y1 = 0.2 + (k + 1) * (h - 0.6) / n, r = lerp(0.36, 0.24, (k + 0.5) / n);
    A.put('seg', 'stone', 0, y0, 0, X1, _ay, Z1, r * 2, y1 - y0, r * 2, STEEL);
    A.put('disc', 'stone', 0, y1, 0, X1, _ay, Z1, r * 2 + 0.12, 0.05, r * 2 + 0.12, DARK);
  }
  for (const s of [-0.12, 0.12]) A.put('box', 'stone', s, h / 2, -0.38, X1, _ay, Z1, 0.03, h - 1.6, 0.03, C_('#c9ced6'));   // ladder
  for (let y = 1.2; y < h - 0.6; y += 0.32) A.put('box', 'stone', 0, y, -0.38, X1, _ay, Z1, 0.24, 0.02, 0.02, C_('#c9ced6'));
  const W = off + 1.0;
  A.put('box', 'stone', 0, h - 0.15, 0, X1, _ay, Z1, 2 * W, 0.3, 0.35, STEEL);                                   // crossarm
  for (const sx of [-1, 1]) tube(A, 'stone', v3(0, h - 1.6, 0), v3(sx * (W - 0.4), h - 0.3, 0), 0.06, STEEL);        // braces
  for (const sx of [-1, 1]) {
    A.put('box', 'stone', sx * off, h - 0.02, 0, X1, _ay, Z1, 0.12, 0.08, 2.4, DARK);                             // balancer beam
    for (let k = 0; k < 4; k++) wheelAt(A, sx * off, h + 0.12, -0.9 + k * 0.6, 0.15, 'x');                        // sheave train
    A.put('box', 'stone', sx * off * 0.55, h + 0.02, 0.35, X1, _ay, Z1, off * 0.9, 0.04, 0.5, C_('#9aa3ae'));     // catwalk grating
    for (const x of [0.25, 0.7]) A.put('box', 'stone', sx * off * x, h + 0.5, 0.58, X1, _ay, Z1, 0.04, 1.0, 0.04, C_('#e5b52e'));
  }
  A.put('box', 'stone', 0, h + 1.0, 0.58, X1, _ay, Z1, 2 * off * 0.75, 0.04, 0.04, C_('#e5b52e'));
  A.put('box', 'wood', 0, h - 1.2, 0.3, X1, _ay, Z1, 0.36, 0.26, 0.02, C_('#f2efe8'));                           // tower number
  A.put('lump', 'snow', 0, h + 0.05, 0, X1, _ay, Z1, 2 * W * 0.6, 0.12, 0.3, C_('#f4f7fb'));
  return A;
}

export function stationAssembly(L, isTop, cableH, O) {
  const cy = Math.cos(L.yaw), sy = Math.sin(L.yaw), gl = (lx, lz) => O ? gridH(O.x + lx * cy + lz * sy, O.z - lx * sy + lz * cy) - O.g : 0;   // ground under a local point
  // local frame: z along the line (+z toward the other station), x across; ground at y = 0
  const A = new Assembly(hashSeed(L.b[0], L.b[1], isTop ? 3 : 2)), STEEL = C_('#7d8796'), WALL = C_(L.type === 'gondola' ? '#d9dde2' : '#cfd5dd'), BAND = C_(L.type === 'gondola' ? '#c4232f' : '#2457c9');
  const tb = L.type === 'tbar', W = 2 * L.off + (tb ? 2.5 : 6), back = isTop ? 1 : -1;      // the machine house sits behind the bullwheel
  if (tb) {
    for (const F of faces(3, 3)) { F.o.z += back * 3; logCourse(A, F, 0, 2.6, [], '#7b5a3a', F.n.x ? 1 : 0); }
    A.put('box', 'wood', 0, 1.3, back * 3, X1, _ay, Z1, 2.7, 2.6, 2.7, C_('#3b2618'));
    snowRoof(A, 3, 3, 2.6, 0.6, '#7b5a3a');
    for (const s of [-1, 1]) tube(A, 'stone', v3(s * 0.4, 0, 0), v3(s * 0.15, cableH, 0), 0.12, STEEL);
  } else {
    // steel portal holding the bullwheel, roof canopy over it
    for (const [x, z] of [[-W / 2, -3.5], [W / 2, -3.5], [-W / 2, 3.5], [W / 2, 3.5]]) A.put('box', 'stone', x, cableH / 2 + 0.6, z, X1, _ay, Z1, 0.35, cableH + 1.2, 0.35, STEEL);
    for (const z of [-3.5, 3.5]) A.put('box', 'stone', 0, cableH + 1.25, z, X1, _ay, Z1, W + 0.4, 0.35, 0.35, STEEL);
    for (const x of [-W / 2, W / 2]) A.put('box', 'stone', x, cableH + 1.25, 0, X1, _ay, Z1, 0.35, 0.35, 7.4, STEEL);
    A.put('box', 'stone', 0, cableH + 1.6, 0, X1, _ay, Z1, W + 1.6, 0.25, 9, C_('#55606d'));
    A.put('box', 'snow', 0, cableH + 2.0, 0, X1, _ay, Z1, W + 1.7, 0.55, 9.1, C_('#f4f7fb'));
    for (let x = -W / 2 - 0.8; x <= W / 2 + 0.8; x += 0.9) for (const sz of [-1, 1]) A.put('lump', 'snow', x, cableH + 1.9, sz * 4.6, X1, _ay, Z1, 1.0, 0.45, 0.6, C_('#f4f7fb'));
    A.put('box', 'wood', 0, cableH + 1.4, 4.56, X1, _ay, Z1, W + 1.6, 0.5, 0.06, BAND);
    // bullwheel: rim, spokes, hub, drive
    A.put('ring', 'stone', 0, cableH, 0, X1, NZ, _ay, L.off * 2, L.off * 2, 1, C_('#3a414c'));
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; tube(A, 'stone', v3(0, cableH, 0), v3(Math.cos(a) * L.off, cableH, Math.sin(a) * L.off), 0.05, C_('#55606d')); }
    A.put('disc', 'stone', 0, cableH, 0, X1, _ay, Z1, 0.9, 0.5, 0.9, C_('#2b3038'));
    tube(A, 'stone', v3(0, cableH + 0.25, 0), v3(0, cableH + 1.2, 0), 0.18, C_('#2b3038'));
    // machine house with windows set into the cladding
    const hh = Math.max(3.2, cableH - 0.6), Fs = faces(W, 6).map(F => { F.o.z += back * 6.5; return F; });
    A.put('box', 'stone', 0, hh / 2, back * 6.5, X1, _ay, Z1, W - 0.6, hh, 5.4, C_('#4b525c'));
    for (const F of Fs) framedFloor(A, F, 0, Math.min(hh, 3.2), { wall: '#cfd5dd', frame: '#4b525c', bay: 2.4, pier: 0.5, spandrel: 1.0, depth: 0.3, lit: 0.5, lift: true });
    if (hh > 3.3) for (const F of Fs) { const p = onFace(F, F.L / 2, (3.2 + hh) / 2, -0.15); A.put('box', 'stone', p.x, p.y, p.z, F.u, _ay, F.n, F.L, hh - 3.2, 0.5, WALL); }
    A.put('box', 'stone', 0, hh + 0.15, back * 6.5, X1, _ay, Z1, W + 0.4, 0.3, 6.4, C_('#55606d')); A.put('box', 'snow', 0, hh + 0.5, back * 6.5, X1, _ay, Z1, W + 0.3, 0.45, 6.3, C_('#f4f7fb'));
    // loading ramp: planks across, gates, rope barriers
    const side = L.off;
    for (let z = 2; z < 10; z += 0.3) A.put('box', 'wood', side, gl(side, -back * z) + 0.03, -back * z, X1, _ay, Z1, 2.6, 0.06, 0.26, A.jit('#8a6a48', 0.15));
    for (const x of [side - 1.6, side + 1.6]) { for (let z = 2; z <= 10; z += 1.6) A.put('seg', 'stone', x, gl(x, -back * z) - 0.2, -back * z, X1, _ay, Z1, 0.07, 1.2, 0.07, C_('#ff6a14')); for (let z = 2; z < 10; z += 1.6) { const a = v3(x, gl(x, -back * z) + 0.95, -back * z), b = v3(x, gl(x, -back * (z + 1.6)) + 0.95, -back * (z + 1.6)); tube(A, 'stone', a, b, 0.015, C_('#2b6fe0')); } }
  }
  // operator cabin with big windows
  const ox = -(L.off + (tb ? 2.5 : 4)), Fc = faces(2.4, 2.4).map(F => { F.o.x += ox; F.o.z += back * (tb ? -1 : 1.5); return F; });
  A.put('box', 'stone', ox, 1.2, back * (tb ? -1 : 1.5), X1, _ay, Z1, 2.0, 2.4, 2.0, C_('#4b525c'));
  for (const F of Fc) framedFloor(A, F, 0, 2.4, { wall: '#e8e4dc', frame: '#3a3f46', bay: 1.2, pier: 0.18, spandrel: 0.9, depth: 0.15, lit: 0.6, lift: true });
  A.put('box', 'stone', ox, 2.55, back * (tb ? -1 : 1.5), X1, _ay, Z1, 2.9, 0.15, 2.9, C_('#55606d')); A.put('box', 'snow', ox, 2.8, back * (tb ? -1 : 1.5), X1, _ay, Z1, 2.8, 0.4, 2.8, C_('#f4f7fb'));
  tube(A, 'stone', v3(ox + 0.6, 2.6, back * (tb ? -1 : 1.5) - 0.6), v3(ox + 0.6, 3.6, back * (tb ? -1 : 1.5) - 0.6), 0.06, C_('#2b3038'));
  return A;
}

export function __init_4131() {

/* ---------------- Fauna: winter animals of the high mountains ---------------- */
// Chamois in herds on rocky slopes, mountain hares in white winter coat at the forest edge, ptarmigans near
// the ridges, alpine choughs circling the summit and the restaurant. (Marmots hibernate until spring.)
fauna = [];
faunaMat = lambertVC();
faunaRnd = mulberry32(424242);

/* ---- lifts assembled piece by piece: chairs, cabins, T-bars, towers, stations ---- */
tube = (A, mat, a, b, r, col) => { const d = new V3().subVectors(b, a), ax = axesAlong(d, {}); A.put('seg', mat, a.x, a.y, a.z, ax.u, ax.v, ax.n, r * 2, d.length(), r * 2, col); };
C_ = c => new THREE.Color(c);
NZ = new V3(0, 0, -1);
}
