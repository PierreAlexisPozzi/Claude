// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « animation ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { camSnap } from './camera';
import { V3, clamp, lerp, smoothstep, wrapPi } from './core';
import { trickTimer } from './hud';
import { CLOTH_T, FACE_EVT, animateFace, playerHuman, playerHumanSync, skier, skierFTime, skierFlutter, skierShade, skierTint } from './humans';
import { chairSeats } from './npcs';
import { tunnelLocal } from './pistes';
import { P, _f, _l, _n, _t, groundBasis, input, steerIn } from './player';
import { H } from './terrain';
import { TUN_LIGHT, tunnelHue } from './tunnels';
import { sled } from './vehicles';

export let _mat, _quat, _q3, _qi, _qa, AX_X, AX_Y, DOWN, _ik, _hip, _ank, _rootP, mkFoot, mkArm, mkPose, pose, tgt, susp, plant, lastEdgeSign, skatePh, crashRot, rootInit, tunnelBlend, ease;


export function resetTarget(T) {
  Object.assign(T, { pelH: 0.97, pelX: 0, pelZ: -0.05, pelRoll: 0, pelPitch: 0.1, pelYaw: 0, spPitch: 0.18, spRoll: 0, spYaw: 0, headP: -0.2, baseYaw: 0, sink: 0 });
  Object.assign(T.fL, mkFoot(1)); Object.assign(T.fR, mkFoot(-1)); Object.assign(T.aL, mkArm()); Object.assign(T.aR, mkArm());
}

export function blendPose(dt) {
  const kb = ease(10, dt), kf = ease(18, dt), ka = ease(9, dt), kr = plant.t < 0.6 && P.state === 'ski' ? ease(20, dt) : kb;   // the rise of a turn is quick
  for (const k of ['pelH', 'pelX', 'pelZ', 'pelRoll', 'pelPitch', 'pelYaw', 'spPitch', 'spRoll', 'spYaw', 'headP', 'baseYaw', 'sink']) pose[k] += (tgt[k] - pose[k]) * (k === 'pelH' || k === 'spPitch' ? kr : kb);
  for (const f of ['fL', 'fR']) for (const k in pose[f]) pose[f][k] += (tgt[f][k] - pose[f][k]) * kf;
  for (const a of ['aL', 'aR']) for (const k in pose[a]) pose[a][k] += (tgt[a][k] - pose[a][k]) * ka;
}

export function solveLeg(L) {
  const S = skier, f = L.foot.g;
  _ank.set(0, 0.2, -0.02).applyQuaternion(f.quaternion).add(f.position);                 // ankle, base frame
  _hip.copy(L.off).applyQuaternion(S.pelvis.quaternion).add(S.pelvis.position);          // hip joint, base frame
  _ik.copy(_ank).sub(_hip).applyQuaternion(_qi.copy(S.pelvis.quaternion).invert());       // hip → ankle, pelvis frame
  const A = 0.45, B = 0.42; let d = clamp(_ik.length(), 0.25, A + B - 0.002);
  _ik.normalize();
  const alpha = Math.acos(clamp((A * A + d * d - B * B) / (2 * A * d), -1, 1));
  const knee = Math.PI - Math.acos(clamp((A * A + B * B - d * d) / (2 * A * B), -1, 1));
  L.thigh.quaternion.setFromUnitVectors(DOWN, _ik).multiply(_qa.setFromAxisAngle(AX_X, -alpha));
  L.knee.rotation.set(knee, 0, 0);
}

// nose press (v > 0): skis pivot on the tips, tails lifted, body over the front; tail press mirrors it
export function pressPose(T, v) {
  const th = 0.3 * v, lift = (v > 0 ? 0.86 : 0.84) * Math.sin(Math.abs(th));
  for (const f of [T.fL, T.fR]) { f.pitch = th; f.y += lift; f.z += v > 0 ? -0.04 : 0.04; f.roll *= 0.3; }
  T.fL.x = 0.12; T.fR.x = -0.12;
  T.pelZ += 0.24 * v; T.pelH = Math.min(T.pelH, 0.86 + lift * 0.6);
  T.spPitch = 0.2 + Math.max(0, v) * 0.55 - Math.max(0, -v) * 0.15; T.pelPitch = 0.1 + Math.max(0, v) * 0.25;
  T.headP = -(T.spPitch + T.pelPitch) * 0.7;
  for (const a of [T.aL, T.aR]) { a.o = 0.55 + Math.max(0, -v) * 0.3; a.p = v > 0 ? -0.95 : -0.35; a.e = -0.5; a.pole = 0.8; }
}

export function updateSkier(dt, time) {
  if (!skier) return;
  const S = skier, T = tgt, sp = P.vel.length();
  S.root.visible = !(P.state === 'lift' && P.lift && P.lift.type === 'gondola');
  resetTarget(T);
  let rate = 14;
  if (P.compress > 0) P.compress = Math.max(0, P.compress - dt * 2.5);
  if (P.state === 'ski') {
    groundBasis(P.pos.x, P.pos.z);
    _mat.makeBasis(_l, _n, _f); _quat.setFromRotationMatrix(_mat);
    _rootP.copy(P.pos).addScaledVector(_n, 0.95);
    // suspension: the body follows a smoothed ground line, the legs take the difference (moguls, landings)
    if (!susp.init) { susp.ys = P.pos.y; susp.vs = 0; susp.init = true; }
    for (let n = Math.ceil(dt / 0.008), h = dt / n, i = 0; i < n; i++) { susp.vs += ((P.pos.y - susp.ys) * 75 - susp.vs * 13) * h; susp.ys += susp.vs * h; }
    const absorb = clamp(P.pos.y - susp.ys, -0.12, 0.38);
    const along = P.vel.dot(_f), sw = along < -0.5;
    const incl = clamp(Math.atan2((P.yawRate || 0) * sp, 9.81), -0.95, 0.95) * smoothstep(1, 6, sp);
    const crouch = Math.max(P.tuck * 0.9, P.charge * 0.8, Math.abs(P.edge) * 0.2 + 0.06, Math.min(0.5, P.compress));
    T.pelH = (lerp(0.97, 0.6, crouch) - absorb) * lerp(1, Math.cos(incl), 0.8) - Math.abs(P.jolt) * 0.06;
    T.pelX = Math.sin(incl) * 0.75;
    T.pelRoll = -incl * 0.7; T.spRoll = incl * 0.45 + P.jolt * 0.08;
    T.pelZ = -0.05 - P.tuck * 0.1 - P.charge * 0.05;
    T.pelPitch = 0.1 + P.tuck * 0.25 + crouch * 0.2; T.spPitch = 0.18 + P.tuck * 0.55 + P.charge * 0.25;
    T.headP = -(T.pelPitch + T.spPitch) * 0.7;
    const fall = Math.hypot(_n.x, _n.z) > 0.05 ? Math.atan2(_n.x, _n.z) : P.yaw;
    T.spYaw = clamp(wrapPi(fall - P.yaw - (sw ? Math.PI : 0)) * 0.42 - (P.yawRate || 0) * 0.07, -0.6, 0.6);   // shoulders face down the hill, ahead of the skis
    T.spRoll += 0.025 * Math.sin(time * 1.3) * (1 - P.tuck); T.spPitch += 0.02 * Math.sin(time * 0.9 + 1);    // never quite still
    const stance = 0.11 + Math.abs(incl) * 0.035;
    T.fL.x = stance; T.fR.x = -stance; T.fL.roll = T.fR.roll = -incl * 0.95;
    if (incl > 0.1) T.fL.z = 0.07; else if (incl < -0.1) T.fR.z = 0.07;          // inside ski leads a little
    if (P.brake > 0.3 && sp > 5) {                                               // hockey stop: skis across the slope
      const sd = P.edge >= 0 ? 1 : -1;
      T.baseYaw = sd * 1.1 * P.brake; T.fL.roll = T.fR.roll = sd * 0.45; T.pelX = -sd * 0.18; T.pelRoll = sd * 0.25; T.spYaw = -sd * 0.7;
      T.pelH = Math.min(T.pelH, 0.8);
    } else if (P.brake > 0.3) {                                                  // snowplough
      T.fL.x = 0.24; T.fR.x = -0.24; T.fL.yaw = -0.32; T.fR.yaw = 0.32; T.fL.roll = 0.22; T.fR.roll = -0.22; T.pelH = Math.min(T.pelH, 0.86);
    }
    if (P.skating && sp > 0.2) {                                                 // skating: push off one ski then the other
      skatePh += dt * (4 + sp * 0.7); const s1 = Math.sin(skatePh);
      T.fL.x = 0.13 + 0.24 * Math.max(0, s1); T.fR.x = -(0.13 + 0.24 * Math.max(0, -s1));
      T.fL.yaw = 0.3; T.fR.yaw = -0.3; T.fL.y = 0.1 * Math.max(0, -s1); T.fR.y = 0.1 * Math.max(0, s1);
      T.fL.roll = -0.15 * Math.max(0, s1); T.fR.roll = 0.15 * Math.max(0, -s1);
      T.pelX = -0.1 * s1; T.pelRoll = 0.08 * s1; T.spPitch = 0.45; T.pelH = 0.84;
      T.aL.p = -0.45 - 0.55 * s1; T.aR.p = -0.45 + 0.55 * s1; T.aL.pole = 0.6 + 0.5 * s1; T.aR.pole = 0.6 - 0.5 * s1;
    }
    if (P.climb) {
      const c = P.climb, t = c.ph % 1, s = c.side || 1, up = s > 0 ? T.fL : T.fR, dn = s > 0 ? T.fR : T.fL;
      const E = x => x * x * (3 - 2 * x);
      up.x = s * (t < 0.5 ? 0.13 + 0.2 * E(t * 2) : 0.33 - 0.2 * (t - 0.5) * 2);
      dn.x = -s * (t < 0.5 ? 0.13 + 0.2 * t * 2 : 0.33 - 0.2 * E((t - 0.5) * 2));
      up.y = t < 0.5 ? 0.09 * Math.sin(Math.PI * t * 2) : 0; dn.y = t >= 0.5 ? 0.09 * Math.sin(Math.PI * (t - 0.5) * 2) : 0;
      up.roll = dn.roll = s * 0.32; up.yaw = dn.yaw = 0; up.z = dn.z = 0;
      T.pelH = 0.84 - 0.03 * Math.sin(Math.PI * 2 * t); T.pelRoll = s * 0.1; T.pelX = s * 0.04; T.spPitch = 0.12; T.spRoll = -s * 0.06; T.baseYaw = 0;
      const au = s > 0 ? T.aL : T.aR, ad = s > 0 ? T.aR : T.aL, k = Math.sin(Math.PI * 2 * t);
      au.p = -0.55 - 0.25 * Math.max(0, k); au.o = 0.5; au.e = -0.45; au.pole = 0.5 + 0.3 * Math.max(0, k);
      ad.p = -0.5 - 0.25 * Math.max(0, -k); ad.o = 0.35; ad.e = -0.4; ad.pole = 0.6 + 0.3 * Math.max(0, -k);
    } else if (P.tuck > 0.5 && !P.skating) { for (const a of [T.aL, T.aR]) { a.p = -1.1; a.e = -1.15; a.o = 0.12; a.pole = 1.45; } }
    else if (!P.skating && !P.climb) {
      const lead = Math.min(1, Math.abs(incl) * 2.2), inL = incl > 0;                 // the inside hand reaches forward into the turn
      for (const [A, inside] of [[T.aL, inL], [T.aR, !inL]]) {
        A.p = -0.7 - (inside ? 0.22 * lead : -0.08 * lead); A.e = -0.9 + (inside ? 0.12 * lead : 0); A.o = 0.42 + (inside ? 0.1 : 0.2) * lead; A.pole = 0.5;   // hands forward and well clear of the hips
      }
    }
    // pole plant at each turn transition, on the new inside
    const es = Math.abs(P.edge) > 0.22 ? Math.sign(P.edge) : 0;
    plant.calm = Math.abs(P.edge) < 0.12 ? (plant.calm || 0) + dt : 0;
    // the turn starts when the steering swings to the other side (before the edges have changed): plant and rise then
    const stIn = steerIn(), ss = Math.abs(stIn) > 0.3 ? Math.sign(stIn) : 0;
    const fresh = (ss && ss !== lastEdgeSign && ss !== plant.sd) || (es && (es !== lastEdgeSign || plant.calmWas > 0.25));
    if (fresh && sp > 3 && P.tuck < 0.5 && P.brake < 0.3 && !P.skating && plant.t > 0.45) { plant.t = 0; plant.sd = ss || es; plant.dur = clamp(0.85 - sp * 0.012, 0.55, 0.85); }
    if (plant.t >= 1 && !ss && !es) plant.sd = 0;
    if (es) { lastEdgeSign = es; plant.calmWas = 0; } else plant.calmWas = plant.calm;
    T.sink = P.sinkT || 0;
    if (Math.abs(P.pressV) > 0.02) pressPose(T, P.pressV);
  } else if (P.state === 'air' || P.state === 'rail') {
    rate = 24;
    _quat.setFromAxisAngle(AX_Y, P.yaw); _q3.setFromAxisAngle(AX_X, P.pitch); _quat.multiply(_q3);
    _rootP.copy(P.pos); _rootP.y += 0.95;
    susp.ys = P.pos.y; susp.vs = P.vel.y;
    T.pelH = 0.74; T.spPitch = 0.38; T.headP = -0.3;
    for (const a of [T.aL, T.aR]) { a.p = -0.75; a.o = 0.7; a.e = -0.45; a.pole = 0.55; }
    if (P.state === 'rail') { T.pelH = 0.86; for (const a of [T.aL, T.aR]) a.o = 1.0; if (Math.abs(P.pressV) > 0.02) pressPose(T, P.pressV); }
    const spin = steerIn();
    if (P.air && spin) { T.spYaw = spin * 0.45; T.aL.o = T.aR.o = 0.35; }
    if (P.air && input.grab) { T.pelH = 0.58; T.spPitch = 0.95; T.aR.p = -1.55; T.aR.e = -0.15; T.aR.o = 0.08; T.headP = -0.45; T.aL.o = 0.9; }
    if (P.air && input.tail) { T.pelH = 0.62; T.spPitch = 0.6; T.aL.p = 0.95; T.aL.e = -0.1; T.spYaw = 0.35; }
  } else if (P.state === 'sled') {
    // seated astride, feet on the footrests, hands on the bars, leaning into the turn
    rate = 30; _quat.copy(sled.q);
    _rootP.set(0, 1.37, -0.1).applyQuaternion(_quat).add(P.pos);
    const st = steerIn();
    T.pelH = 0.42; T.pelZ = -0.4; T.pelPitch = 0.12; T.spPitch = 0.3 + sled.engine * 0.15; T.headP = -0.32; T.spRoll = st * 0.25; T.pelX = st * 0.08;
    T.fL.x = 0.36; T.fR.x = -0.36; T.fL.z = T.fR.z = 0.05;
    for (const a of [T.aL, T.aR]) { a.p = -1.1; a.e = -0.45; a.o = 0.3; a.pole = 0; }
  } else if (P.state === 'crash') {
    rate = 8;
    crashRot += dt * Math.max(0, P.crashT - 0.6) * 9;
    _rootP.copy(P.pos); _rootP.y += 0.4;
    _quat.setFromAxisAngle(AX_Y, P.yaw); _q3.setFromAxisAngle(P.crashAxis || AX_X, crashRot + 1.3); _quat.multiply(_q3);
    T.pelH = 0.78; T.spPitch = 0.6;
    T.aL.p = -1.2 + Math.sin(time * 11) * 1.0; T.aR.p = -1.2 + Math.cos(time * 9) * 1.0; T.aL.o = T.aR.o = 1.1;
    T.fL.x = 0.25; T.fR.x = -0.2; T.fL.yaw = 0.5; T.fR.yaw = -0.3;
  } else if (P.state === 'lift') {
    const L = P.lift; L.up.pointAt(P.liftS, _t);
    _quat.setFromAxisAngle(AX_Y, L.yaw); rate = 30;
    if (L.type === 'chair') {
      T.pelH = 0.47; T.pelZ = -0.42; T.pelPitch = -0.15; T.spPitch = -0.08; T.headP = 0.05;
      T.fL.z = T.fR.z = 0.04; T.fL.pitch = T.fR.pitch = 0.25;
      for (const a of [T.aL, T.aR]) { a.p = -0.95; a.e = -0.55; a.o = 0.18; a.pole = 1.2; }
      _rootP.set(chairSeats() === 6 ? 0.3 : 0, -2.32 + 0.47, 0.12 + 0.42).applyQuaternion(_quat).add(_t);
      L.own.position.copy(_t); L.own.rotation.set(0, L.yaw, 0);
    } else if (L.type === 'tbar') {
      const gh = H(_t.x, _t.z);
      _rootP.set(_t.x, gh + 0.95, _t.z);
      T.pelH = 0.9; T.pelZ = -0.12; T.pelPitch = -0.05; T.spPitch = -0.06;
      T.aR.p = -2.75; T.aR.e = 0; T.aR.o = 0.05; T.aR.pole = 3.2; T.aL.p = -0.3; T.aL.pole = 0.2;
      L.own.position.copy(_t); L.own.rotation.set(0, L.yaw, 0); L.own.scale.set(1, clamp((_t.y - gh - 0.95) / 4.6, 0.3, 2), 1);
    } else { L.own.position.copy(_t); L.own.rotation.set(0, L.yaw, 0); _rootP.copy(_t); }
  }
  // pole plant overlay
  // pole plant, three beats: reach (hand forward, tip swung ahead), pass the planted pole, recover
  plant.t = Math.min(1, plant.t + dt / (plant.dur || 0.6));
  if (plant.t < 1 && P.state === 'ski') {
    const t = plant.t, A = plant.sd > 0 ? T.aL : T.aR, E = x => x * x * (3 - 2 * x);
    const reach = t < 0.3 ? E(t / 0.3) : t < 0.7 ? 1 - (t - 0.3) / 0.4 * 0.6 : 0.4 * (1 - E((t - 0.7) / 0.3));
    const tip = t < 0.3 ? E(t / 0.3) : t < 0.7 ? 1 - E((t - 0.3) / 0.4) * 1.6 : -0.6 * (1 - E((t - 0.7) / 0.3));
    const B = plant.sd > 0 ? T.aR : T.aL;
    A.p -= 0.95 * reach; A.e += 0.6 * reach; A.o += 0.6 * reach;              // arm reaches well forward and out: it reads from the chase camera
    A.pole -= 1.35 * tip;                                                       // tip swung forward to the snow, then trailing as you pass it
    B.p += 0.18 * reach; B.o += 0.12 * reach;                                   // the other arm balances, a little back and out
    // up-unweighting with the plant: the legs extend a little more (the hips rise as the edges flatten) as the pole touches, which lightens the skis
    // for the edge change, then the skier sinks into the new turn
    const up = t < 0.12 ? E(t / 0.12) : t < 0.42 ? 1 : t < 0.55 ? 1 - E((t - 0.42) / 0.13) : 0, down = t >= 0.5 ? Math.sin(Math.PI * (t - 0.5) / 0.5) : 0;   // rise, hold ~0.2 s, sink
    // at the top of the rise the legs are 90 % extended: hip to ankle = 0.9 x (thigh 0.45 + shin 0.42); the ankle sits
    // 0.2 m above the sole and the hip 0.05 m below the pelvis origin, so the pelvis goes to 0.9 x 0.87 + 0.25 m
    const PEL90 = 0.9 * 0.87 + 0.25;
    T.pelH = lerp(T.pelH, Math.max(T.pelH, PEL90), up) - 0.04 * down; T.spPitch = lerp(T.spPitch, Math.min(T.spPitch, 0.18), up) + 0.05 * down;
    T.spRoll += 0.07 * plant.sd * Math.sin(Math.PI * Math.min(1, t / 0.5));   // shoulder drops towards the planted pole
  }
  // root: exact position, smoothed orientation (no snapping on facets)
  S.root.position.copy(_rootP);
  if (!rootInit || camSnap) { S.root.quaternion.copy(_quat); rootInit = true; } else S.root.quaternion.slerp(_quat, ease(rate, dt));
  blendPose(dt);
  // apply
  S.base.position.y = -0.95 - pose.sink; S.base.rotation.y = pose.baseYaw;
  S.feet.forEach(f => { const q = f.sd > 0 ? pose.fL : pose.fR; f.g.position.set(q.x, q.y, q.z); f.g.rotation.set(q.pitch, q.yaw, q.roll); });
  S.pelvis.position.set(pose.pelX, pose.pelH, pose.pelZ); S.pelvis.rotation.set(pose.pelPitch, pose.pelYaw, pose.pelRoll);
  S.spine.rotation.set(pose.spPitch, pose.spYaw, pose.spRoll); S.head.rotation.x = pose.headP;
  S.arms.forEach(A => { const q = A.sd > 0 ? pose.aL : pose.aR; A.sh.rotation.set(q.p, 0, A.sd * q.o); A.el.rotation.x = q.e; A.pole.rotation.x = q.pole - q.p - q.e - pose.spPitch - pose.pelPitch; A.pole.rotation.z = -A.sd * q.o * 0.6; });
  S.legs.forEach(solveLeg);
  if (playerHuman) { playerHuman.U.uFlutter.value = skierFlutter.value; CLOTH_T.value = time; playerHumanSync(dt); const sp = P.vel.length(); FACE_EVT.sad = Math.max(0, FACE_EVT.sad - dt);
    const crash = P.state === 'crash', air = P.state === 'air', big = air && P.air && (P.air.t || 0) > 0.6;   // T8 : expressions liées au jeu
    animateFace(playerHuman, dt, { smile: trickTimer > 0.4 && !crash ? 0.9 : FACE_EVT.sad > 0 ? 0 : 0.22, squint: P.state === 'ski' && sp > 16 ? 0.35 : 0, brows: air && !big ? 0.5 : 0,
      surprise: big ? 0.7 : 0, wince: crash ? 0.9 : 0, open: crash ? 0.2 : 0, sad: FACE_EVT.sad > 0 && !crash ? 0.8 : 0,
      effort: P.climb ? 0.8 : P.state === 'ski' && P.tuck > 0.5 && sp > 14 ? 0.55 : 0 }); }
  // tunnel light on the skier
  tunnelBlend += ((P.tunnel ? 1 : 0) - tunnelBlend) * ease(4, dt);
  skierShade.value = lerp(1, 0.3, tunnelBlend);
  skierFTime.value = time; skierFlutter.value += (clamp((P.vel.length() - 3) / 22, 0, 1) * (P.state === 'ski' || P.state === 'air' ? 1 : 0.2) - skierFlutter.value) * Math.min(1, dt * 3);
  if (P.tunnel && tunnelBlend > 0.01) { const tl = tunnelLocal(P.tunnel, P.pos.x, P.pos.z, 2); if (tl) skierTint.value.setHSL(tunnelHue(Math.round((tl.s - TUN_LIGHT / 2) / TUN_LIGHT), time), 1, 0.5).multiplyScalar(0.55 * tunnelBlend); }
  else skierTint.value.setRGB(0, 0, 0);
}

export function __init_5693() {

/* ---------------- Visual sync: pose targets, smoothing, leg IK ---------------- */
_mat = new THREE.Matrix4();
_quat = new THREE.Quaternion();
_q3 = new THREE.Quaternion();
_qi = new THREE.Quaternion();
_qa = new THREE.Quaternion();
AX_X = new V3(1, 0, 0);
AX_Y = new V3(0, 1, 0);
DOWN = new V3(0, -1, 0);
_ik = new V3();
_hip = new V3();
_ank = new V3();
_rootP = new V3();
mkFoot = sd => ({ x: sd * 0.11, y: 0, z: 0, yaw: 0, roll: 0, pitch: 0 });
mkArm = () => ({ p: -0.45, o: 0.22, e: -0.75, pole: 0.35 });
mkPose = () => ({ pelH: 0.97, pelX: 0, pelZ: -0.05, pelRoll: 0, pelPitch: 0.1, pelYaw: 0, spPitch: 0.18, spRoll: 0, spYaw: 0, headP: 0, baseYaw: 0, sink: 0, fL: mkFoot(1), fR: mkFoot(-1), aL: mkArm(), aR: mkArm() });
pose = mkPose();
tgt = mkPose();
susp = { ys: 0, vs: 0, init: false };
plant = { t: 1, sd: 1 };
lastEdgeSign = 0;
skatePh = 0;
crashRot = 0;
rootInit = false;
tunnelBlend = 0;
ease = (r, dt) => 1 - Math.exp(-r * dt);
}
