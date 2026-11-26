// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « player ») ; typage strict progressif à venir.
/* eslint-disable */

import { AX_Y, plant } from './animation';
import { sfx } from './audio';
import { __set_camSnap, camSnap } from './camera';
import { $, V3, clamp, fmt, lerp, smoothstep, wrapPi } from './core';
import { showTrick } from './hud';
import { missionById } from './missions';
import { npcHit } from './npcs';
import { emit, emitCloud } from './particles';
import { tryAction } from './people';
import { LIFTS, PIPE, SKI, SN, SNOW, inPipe, nearKicker, pipeLocal, rails, snowAt, tunnelLocal, tunnels, zoneAt } from './pistes';
import { RIDER, lockOf, riderEvent, riderStep } from './progression';
import { ALT0, H, HALF, TC, normalAt, obstacles, perlin, trees } from './terrain';
import { skierSkis, sled, stepSled, toggleSled } from './vehicles';

export let input, stick, jumpHold, queued, P, STEP, _n, _f, _l, _g, _t, events, FORCE, _cu, _ct;

export function __set_jumpHold(v) { return (jumpHold = v); }

   // a quick tap waits for a possible second tap: the jump is held without charging
export function steerIn() { return stick.on && stick.x !== 0 ? -stick.x : (input.left ? 1 : 0) - (input.right ? 1 : 0); }


export function fwdVec(out) { return out.set(Math.sin(P.yaw), 0, Math.cos(P.yaw)); }

export function clampWorld() {
  const lim = HALF - 25;
  if (Math.abs(P.pos.x) > lim) { P.pos.x = Math.sign(P.pos.x) * lim; P.vel.x = 0; }
  if (Math.abs(P.pos.z) > lim) { P.pos.z = Math.sign(P.pos.z) * lim; P.vel.z = 0; }
}

/* ground queries that know about tunnels */
export function groundY(x, z) {
  if (P.tunnel) { const tl = tunnelLocal(P.tunnel, x, z, 2); if (tl && Math.abs(tl.w) < P.tunnel.hw + 1.5) return tl.y; }
  return H(x, z);
}

export function groundN(x, z, out) {
  if (!P.tunnel) return normalAt(x, z, out);
  const e = 0.6, hx = groundY(x + e, z) - groundY(x - e, z), hz = groundY(x, z + e) - groundY(x, z - e);
  return out.set(-hx, 2 * e, -hz).normalize();
}

export function updateTunnel() {
  if (P.tunnel) {
    const T = P.tunnel, tl = tunnelLocal(T, P.pos.x, P.pos.z, 2);
    if (!tl || tl.s < -7.5 || tl.s > T.len + 7.5) { if (tl && P.tunnelIn != null && (P.tunnelIn < T.len / 2) !== (tl.s < T.len / 2)) riderEvent('tunnel'); P.tunnel = null; return; }
    // walls and ceiling of the tube (and of the portal galleries)
    const lim = T.hw - 0.45;
    if (Math.abs(tl.w) > lim) {
      const sg = Math.sign(tl.w), dw = sg * lim - tl.w;
      P.pos.x += tl.px * dw; P.pos.z += tl.pz * dw;
      // the wall acts as a guide rail: velocity follows the tube and the skis turn with it
      const sp = P.vel.length(), va = P.vel.x * tl.ux + P.vel.z * tl.uz, dir = va >= 0 ? 1 : -1;
      if (P.state !== 'air') { P.vel.x = tl.ux * dir * sp * 0.97; P.vel.z = tl.uz * dir * sp * 0.97; }
      else { const vl = P.vel.x * tl.px + P.vel.z * tl.pz; if (vl * sg > 0) { P.vel.x -= tl.px * vl; P.vel.z -= tl.pz * vl; } }
      if (P.state === 'ski' || P.state === 'sled') {
        const fwd = Math.sin(P.yaw) * tl.ux + Math.cos(P.yaw) * tl.uz >= 0 ? 0 : Math.PI;
        const want = Math.atan2(tl.ux, tl.uz) + fwd; P.yaw += wrapPi(want - P.yaw) * 0.12;
      }
    }
    const top = tl.y + T.ceil - 1.9;
    if (P.pos.y > top) { P.pos.y = top; if (P.vel.y > 0) P.vel.y = 0; }
    return;
  }
  for (const T of tunnels) {
    const tl = tunnelLocal(T, P.pos.x, P.pos.z, 2);
    if (!tl || tl.s < -7 || tl.s > T.len + 7 || P.pos.y > tl.y + T.ceil + 2.4) continue;
    const aw = Math.abs(tl.w);
    if (aw < T.hw + 0.8) { P.tunnel = T; P.tunnelIn = tl.s; updateTunnel(); return; }
    const inbound = (P.vel.x * tl.ux + P.vel.z * tl.uz) * (tl.s < T.len / 2 ? 1 : -1) > 0.5;
    if (aw < T.hw + 2.8 && inbound && (tl.s < 0 || tl.s > T.len)) {
      // approach funnel: the edges of the cutting lead into the opening
      const sg = Math.sign(tl.w), mv = Math.min(aw - (T.hw + 0.5), 0.05);
      P.pos.x -= tl.px * sg * mv; P.pos.z -= tl.pz * sg * mv;
      const vl = P.vel.x * tl.px + P.vel.z * tl.pz; if (vl * sg > 0) { P.vel.x -= tl.px * vl; P.vel.z -= tl.pz * vl; }
      return;
    }
    if (aw < T.hw + 2.8) {
      const sg = Math.sign(tl.w), dw = sg * (T.hw + 2.8) - tl.w;
      P.pos.x += tl.px * dw; P.pos.z += tl.pz * dw;
      const vl = P.vel.x * tl.px + P.vel.z * tl.pz; if (vl * sg < 0) { P.vel.x -= tl.px * vl; P.vel.z -= tl.pz * vl; }
      return;
    }
  }
}

export function stepSim(dt) { stepSimCore(dt); riderStep(dt); }

   // progression tracking pauses with the simulation
export function stepSimCore(dt) {
  for (const a of queued) {
    if (a === 'respawn') respawnNearestLift();
    else if (a === 'action') { if (P.state === 'lift') skipLift(); else tryAction(); }
    else if (a === 'sled') toggleSled();
    else if (a === 'revert' && P.state === 'ski' && P.revertT <= 0) { P.revertT = 0.32; P.revertDir = P.edge >= 0 ? 1 : -1; }
  }
  queued.clear();
  if (P.railCool > 0) P.railCool -= dt;
  switch (P.state) {
    case 'ski': stepSki(dt); break;
    case 'air': stepAir(dt); break;
    case 'lift': stepLift(dt); break;
    case 'crash': stepCrash(dt); break;
    case 'rail': stepRail(dt); break;
    case 'sled': stepSled(dt); break;
  }
  P.prevJump = input.jump;
  if (!isFinite(P.pos.x + P.pos.y + P.pos.z + P.vel.x + P.vel.y + P.vel.z)) respawnNearestLift();
}

export function groundBasis(x, z) {
  groundN(x, z, _n);
  fwdVec(_f); _f.addScaledVector(_n, -_f.dot(_n)).normalize();
  _l.crossVectors(_n, _f).normalize();
}

export function currentSnow() { return P.tunnel ? SN.TUNNEL : FORCE.snow != null ? FORCE.snow : snowAt(P.pos.x, P.pos.z); }

// half-pipe flow: remember the last wall, and without ← / → point the skis diagonally at the opposite wall
export function pipeSteer(dt) {
  if (!PIPE.on) return;
  const q = pipeLocal(P.pos.x, P.pos.z);
  if (q.s < 6 || q.s > PIPE.L - 8 || Math.abs(q.w) > PIPE.halfW + 0.5) return;
  if (Math.abs(q.w) > PIPE.halfW * 0.6) PIPE.lastSide = Math.sign(q.w);
  // pumping: coming down a transition the rider pushes the skis into it and gains a little speed
  const lat = -P.vel.x * PIPE.dz + P.vel.z * PIPE.dx, aw = Math.abs(q.w);
  if (aw > PIPE.F && aw < PIPE.halfW && lat * q.w < 0 && P.vel.length() < 13) P.vel.multiplyScalar(1 + 1.6 * dt / Math.max(4, P.vel.length()));
  if (steerIn() !== 0 || !PIPE.lastSide) return;
  const along = Math.sign(P.vel.x * PIPE.dx + P.vel.z * PIPE.dz) || 1, to = -PIPE.lastSide;
  const tx = -PIPE.dz * to + PIPE.dx * along * 0.45, tz = PIPE.dx * to + PIPE.dz * along * 0.45;
  const h = Math.atan2(tx, tz), d1 = wrapPi(h - P.yaw), d2 = wrapPi(h + Math.PI - P.yaw);
  const d = P.revertT > 0 ? 0 : Math.abs(d1) <= Math.abs(d2) ? d1 : d2;   // keep riding forward or switch, whichever you are in
  P.yaw += Math.sign(d) * Math.min(Math.abs(d), 1.8 * dt);
}

export function stepSki(dt) {
  const st = currentSnow(), S = SNOW[st];
  P.snow = st; P.zone = P.tunnel ? P.tunnel.piste.idx : zoneAt(P.pos.x, P.pos.z);
  P.offPiste = st === SN.POUDREUSE || st === SN.TRAFOLLE;
  pipeSteer(dt);
  groundBasis(P.pos.x, P.pos.z);
  let speed = P.vel.length();
  const along = P.vel.dot(_f);
  const steer = steerIn();
  if (sidestep(dt, st, speed, steer)) return;
  // Shift + ↑ / ↓ on the ground: nose press (tails up) / tail press (tips up); with ← / → it becomes a butter
  const pressDir = input.grab && speed > 0.5 ? (input.up ? 1 : input.down ? -1 : 0) : 0;
  P.pressV += (pressDir - P.pressV) * Math.min(1, dt * 9);
  if (pressDir) { if (P.press && P.press.dir !== pressDir) endPress(); if (!P.press) P.press = { dir: pressDir, t: 0, spin: 0, sw: along < -0.5 }; P.press.t += dt; }
  else if (P.press) endPress();
  const butter = !!P.press && steer !== 0;
  const braking = input.down && !pressDir, tuck = input.up && !braking && !pressDir;
  P.brake = lerp(P.brake, braking ? 1 : 0, Math.min(1, dt * 10));
  P.tuck = lerp(P.tuck, tuck ? 1 : 0, Math.min(1, dt * 6));
  const light = plant.t > 0.08 && plant.t < 0.5 ? 1.6 : 1;   // unweighted by the rise of the pole plant: the edges change faster
  P.edge += (steer - P.edge) * Math.min(1, dt * (st === SN.POUDREUSE ? 4.5 : 7) * light);
  // rough snow: position-based noise knocks the skis around (reproducible)
  const rx = P.pos.x * 0.55, rz = P.pos.z * 0.55;
  const bump = S.rough > 0 && speed > 3 ? perlin(rx, rz) : 0;
  P.jolt = bump * S.rough * Math.min(1, speed / 12);
  let dYaw = 0, carveRate = 0, skidRate = 0;
  if (P.revertT > 0) { const r = Math.min(P.revertT, dt); dYaw = P.revertDir * Math.PI * r / 0.32; P.revertT -= dt; }
  else if (butter) { dYaw = steer * 4.2 * SKI.pivot * dt; P.press.spin += dYaw; }
  else {
    const pivot = 2.0 * S.pivot * SKI.pivot * (1 - smoothstep(2, 7, speed));
    const wanted = P.edge * Math.max(pivot, Math.min(speed / S.rMin, 2.4)) * (braking ? 1.25 : 1);
    const lim = S.aLat * (P.offPiste ? 1 : SKI.grip) / Math.max(speed, 0.5);
    carveRate = clamp(wanted, -lim, lim); skidRate = wanted - carveRate;
    dYaw = wanted * dt + P.jolt * 0.9 * dt;
  }
  P.yaw += dYaw;
  P.yawRate = lerp(P.yawRate || 0, dYaw / dt, Math.min(1, dt * 10));
  const carving = Math.abs(P.edge) > 0.15 && !braking && P.revertT <= 0;
  if (speed > 0.05 && P.revertT <= 0 && !butter) {
    if (speed < 5) P.vel.applyAxisAngle(_n, dYaw * 0.6);
    else P.vel.applyAxisAngle(_n, carveRate * dt * (carving ? 0.985 : 0.7) + skidRate * dt * 0.4);
  }
  P.skid = lerp(P.skid || 0, clamp(Math.abs(skidRate) * 1.5 + (braking ? 1 : 0), 0, 1), Math.min(1, dt * 8));
  groundBasis(P.pos.x, P.pos.z);
  _g.set(0, -9.81, 0); _g.addScaledVector(_n, -_g.dot(_n));
  const drag = lerp(S.drag, S.drag * 0.48, P.tuck);
  const resist = S.res * SKI.float * (1 - smoothstep(3, 13, speed)) * (tuck && speed < 6.5 ? 0.35 : 1);   // deep snow: the skis plough until they plane
  const brakeDec = braking ? (speed > 5 ? 5.8 : 3.2) * (st === SN.GLACEE ? 0.75 : st === SN.POUDREUSE ? 1.25 : 1) : 0;
  P.vel.addScaledVector(_g, dt);
  speed = P.vel.length();
  if (speed > 0.001) {
    const dec = (S.mu * 9.81 * _n.y + drag * speed * speed + resist + brakeDec + Math.abs(P.jolt) * 1.2 + (P.press ? 0.35 : 0)) * dt;
    if (dec >= speed) P.vel.set(0, 0, 0); else P.vel.multiplyScalar((speed - dec) / speed);
  }
  if (tuck && speed < 6.5) {
    const dirSign = along < -0.5 ? -1 : 1;
    const grade = -_g.dot(_f) * dirSign / 9.81;         // >0 when the skis point uphill
    const k = clamp(1 - grade / 0.15, 0, 1) * (st === SN.POUDREUSE ? 0.45 : st === SN.TRAFOLLE ? 0.7 : 1);
    P.vel.addScaledVector(_f, dirSign * 2.4 * k * dt);
    P.skating = true;
  } else P.skating = false;
  if (P.revertT <= 0 && !butter) {
    const lat = P.vel.dot(_l);
    const grip = braking ? S.gripSkid * 0.4 : carving ? S.gripCarve : speed < 2 ? 20 : S.gripSkid;
    P.vel.addScaledVector(_l, -lat * (1 - Math.exp(-grip * dt)));
  }
  P.vel.addScaledVector(_n, -P.vel.dot(_n));
  speed = P.vel.length();
  if (speed > 42) P.vel.multiplyScalar(42 / speed);
  if (speed < 0.3 && !tuck && Math.abs(_g.dot(_f)) < S.mu * 9.81 * _n.y + resist * 0.5 + 0.25) P.vel.set(0, 0, 0);
  P.sinkT = S.sink * SKI.float * (1 - smoothstep(3, 18, speed) * 0.75);
  if (P.eatJump && !input.jump) { P.eatJump = false; }
  else if (!P.eatJump) {
    if (input.jump && !jumpHold) P.charge = Math.min(1, P.charge + dt / 0.55);
    if (!input.jump && P.prevJump) { doJump(); return; }
  }
  sprayFor(st, speed, braking);
  P.stillT = speed < 0.4 ? P.stillT + dt : 0;
  moveOnGround(dt, along, st);
}

export function sidestep(dt, st, speed, steer) {
  _g.set(0, -9.81, 0); _g.addScaledVector(_n, -_g.dot(_n));
  const slope = Math.hypot(_g.x, _g.z) / 9.81;                     // ~ sine of the slope angle
  _cu.set(-_g.x, 0, -_g.z); if (_cu.lengthSq() > 1e-8) _cu.normalize();
  const facingUp = Math.sin(P.yaw) * _cu.x + Math.cos(P.yaw) * _cu.z;
  if (!P.climb) {
    const fwd = P.vel.x * Math.sin(P.yaw) + P.vel.z * Math.cos(P.yaw);   // >0 while still gliding / skating forward
    const want = input.up && !input.grab && !input.down && speed < 3 && fwd < 0.4 && P.revertT <= 0 && P.charge < 0.05 && slope > 0.1 && slope * facingUp > 0.1;   // skating still works below ~10 %
    P.climbWant = want ? (P.climbWant || 0) + dt : 0;              // stalled or sliding back against the slope, still pushing ↑
    if (P.climbWant < 0.15) return false;
    P.vel.set(0, 0, 0);                                            // the edges bite: no more sliding back
    const upYaw = Math.atan2(_cu.x, _cu.z), a1 = upYaw + Math.PI / 2, a2 = upYaw - Math.PI / 2;
    const d1 = Math.abs(Math.atan2(Math.sin(a1 - P.yaw), Math.cos(a1 - P.yaw))), d2 = Math.abs(Math.atan2(Math.sin(a2 - P.yaw), Math.cos(a2 - P.yaw)));
    P.climb = { ph: 0, pick: d1 < d2 ? 1 : -1 };
  } else if (!input.up || input.down || input.grab || slope < 0.04) { P.climb = null; return false; }
  const c = P.climb, upYaw = Math.atan2(_cu.x, _cu.z), skiYaw = upYaw + c.pick * Math.PI / 2;
  // skis across the fall line; the uphill side is the skier's left (side +1) or right (-1)
  let dy = Math.atan2(Math.sin(skiYaw - P.yaw), Math.cos(skiYaw - P.yaw)); P.yaw += dy * Math.min(1, dt * 7);
  c.side = Math.sign(Math.cos(P.yaw) * _cu.x - Math.sin(P.yaw) * _cu.z) || 1;
  const v = clamp(1.35 - slope * 1.6, 0.3, 1.2) * (st === SN.POUDREUSE ? 0.65 : st === SN.TRAFOLLE ? 0.8 : 1);
  _ct.copy(_cu).applyAxisAngle(AX_Y, clamp(steer, -1, 1) * 0.6);  // ← / → slant the climb
  c.ph += v * dt / 0.26;                                           // one step every ~26 cm
  const pulse = 0.55 + 0.9 * Math.max(0, Math.sin(c.ph * Math.PI * 2 - 0.6)) ** 2;
  P.vel.set(_ct.x * v * pulse, 0, _ct.z * v * pulse); P.vel.addScaledVector(_n, -P.vel.dot(_n));
  P.brake = 0; P.tuck = 0; P.skating = false; P.edge *= 1 - Math.min(1, dt * 8); P.charge = 0; P.skid = 0; P.press = null;
  P.stillT = 0;
  moveOnGround(dt, 0, st);
  return true;
}

export function sprayFor(st, speed, braking) {
  const deep = st === SN.POUDREUSE, crud = st === SN.TRAFOLLE;
  const active = speed > 5 && (braking || P.skid > 0.3 || Math.abs(P.edge) > 0.5 || deep || crud);
  if (!active) return;
  const chance = deep ? 1 : braking ? 0.9 : crud ? 0.6 : 0.45;
  if (Math.random() > chance) return;
  _t.copy(P.vel).multiplyScalar(deep ? 0.12 : 0.25).addScaledVector(_l, -Math.sign(P.edge || 1) * speed * (deep ? 0.06 : 0.12)); _t.y += deep ? 1.6 : 1.2;
  emit(P.pos, _t, deep ? 4 : braking ? 3 : 2, deep ? 2.8 : 2.2);
  if (deep && Math.random() < 0.35) emitCloud(P.pos, _t);
}

export function moveOnGround(dt, along, st) {
  const speed = P.vel.length();
  P.pos.addScaledVector(P.vel, dt);
  clampWorld();
  updateTunnel();
  const gh = groundY(P.pos.x, P.pos.z);
  groundN(P.pos.x, P.pos.z, _t);
  const sep = P.vel.dot(_t);
  const S = SNOW[st ?? SN.DAMEE];
  // take-off: compare the skier's climb rate with the ground just ahead (catches kicker lips and rollovers)
  const vh = Math.hypot(P.vel.x, P.vel.z);
  if (vh > 3) {
    const la = nearKicker(P.pos.x, P.pos.z) ? 0.2 : 0.5, g1 = groundY(P.pos.x + P.vel.x / vh * la, P.pos.z + P.vel.z / vh * la);
    const sepV = (P.vel.y / vh - (g1 - gh) / la) * vh;
    if (sepV > Math.max(2.2, speed * 0.12) * S.takeoff) { P.pos.y = Math.max(P.pos.y, gh); startAir(along < 0); return; }
  }
  P.pos.y = gh;
  if (speed > 0.01) {
    P.vel.addScaledVector(_t, -sep);
    let keep = speed;
    if (sep < -1.2) {
      if (st === SN.BOSSES || st === SN.TRAFOLLE) keep *= 1 - Math.min(0.3, (-sep - 1.2) * 0.045);   // legs soak up the bump, speed goes with it
      else if (sep < -10 && !P.tunnel) { P.vel.multiplyScalar(0.2); crash('Choc contre la pente'); return; }
      P.compress = Math.min(1.2, (P.compress || 0) + (-sep) * 0.06);
    }
    const s2 = P.vel.length(); if (s2 > 1e-4) P.vel.multiplyScalar(keep / s2);
  }
  if (collideObstacles()) return;
  checkRails();
}

export function pressName(dir, spin, sw) {
  const deg = Math.round(Math.abs(spin) / Math.PI) * 180;
  return (sw ? 'Switch ' : '') + (dir > 0 ? 'Nose ' : 'Tail ') + (deg >= 180 ? 'Butter ' + deg : 'Press');
}

export function endPress() {
  const pr = P.press; P.press = null;
  if (!pr || pr.t < 0.45 || P.state !== 'ski') return;
  const deg = Math.round(Math.abs(pr.spin) / Math.PI) * 180;
  const pts = Math.round((40 + Math.min(pr.t, 4) * 60 + deg / 180 * 150) * (pr.sw ? 1.2 : 1) / 10) * 10;
  P.score += pts; if (!P.best || pts > P.bestPts) { P.best = pressName(pr.dir, pr.spin, pr.sw); P.bestPts = pts; }
  showTrick(pressName(pr.dir, pr.spin, pr.sw), '+' + fmt(pts) + ' · ' + pr.t.toFixed(1) + ' s');
  riderEvent('butter', deg);
}

export function startAir(sw) {
  P.state = 'air'; P.pitch = 0;
  P.air = { t: 0, spin: 0, flip: 0, grab: null, grabT: 0, startSwitch: !!sw, y0: P.pos.y };
}

export function doJump() {
  const along = P.vel.dot(_f);
  const pr = P.press, popName = pr && pr.t > 0.15 ? (pr.dir > 0 ? 'Nollie' : 'Ollie') : null;
  const pop = 2.8 + P.charge * 2.8 + (popName ? 0.9 : 0); P.charge = 0; P.press = null;   // snapping off the loaded tip or tail pops higher
  P.vel.addScaledVector(_n, pop); P.pos.addScaledVector(_n, 0.06);
  startAir(along < -0.5);
  P.air.pop = popName;
  sfx.pop();
}

export function stepAir(dt) {
  const a = P.air; a.t += dt;
  P.pressV += (0 - P.pressV) * Math.min(1, dt * 6);
  P.vel.y -= 9.81 * dt;
  const sp = P.vel.length(); P.vel.multiplyScalar(1 - 0.0025 * sp * dt);
  const sIn = steerIn(), spinIn = Math.abs(sIn) > 0.3 ? Math.sign(sIn) : 0;   // spins at full rate, whatever the stick deflection
  // flips need Space held with ↑ / ↓, so holding ↑ to tuck over an unexpected bump does not start a frontflip
  const flipIn = input.jump ? (input.up ? 1 : 0) - (input.down ? 1 : 0) : 0;
  const pq = PIPE.on ? pipeLocal(P.pos.x, P.pos.z) : null, inPipeAir = pq && pq.s > 0 && pq.s < PIPE.L && Math.abs(pq.w) > PIPE.F * 0.8 && Math.abs(pq.w) < PIPE.halfW + 2.5;
  if (spinIn) { const d = spinIn * 6.3 * dt; P.yaw += d; a.spin += d; }
  else if (inPipeAir) {
    // pipe air: turn the skis back down the fall line of the wall (forward or switch, whichever is closer), not scored
    const along = Math.sign(P.vel.x * PIPE.dx + P.vel.z * PIPE.dz) || 1, inw = -Math.sign(pq.w);
    const tx = -PIPE.dz * inw + PIPE.dx * along * 0.35, tz = PIPE.dx * inw + PIPE.dz * along * 0.35;
    const h1 = Math.atan2(tx, tz), d1 = wrapPi(h1 - P.yaw), d2 = wrapPi(h1 + Math.PI - P.yaw), d = Math.abs(d1) < Math.abs(d2) ? d1 : d2;
    P.yaw += Math.sign(d) * Math.min(Math.abs(d), 3.5 * dt);
  } else {
    const vh = Math.hypot(P.vel.x, P.vel.z);
    if (vh > 2) {
      const vy = Math.atan2(P.vel.x, P.vel.z), d1 = wrapPi(vy - P.yaw), d2 = wrapPi(vy + Math.PI - P.yaw);
      const d = Math.abs(d1) < Math.abs(d2) ? d1 : d2;
      if (Math.abs(d) < 0.7) { const s = Math.sign(d) * Math.min(Math.abs(d), 2.4 * dt); P.yaw += s; a.spin += s; }
    }
  }
  if (flipIn) { const d = flipIn * 5.0 * dt; P.pitch += d; a.flip += d; }
  else { const w = wrapPi(P.pitch); if (Math.abs(w) < 0.9) { const s = Math.sign(w) * Math.min(Math.abs(w), 2.8 * dt); P.pitch -= s; a.flip -= s; } }
  if (input.grab) { a.grab = 'Mute Grab'; a.grabT += dt; } else if (input.tail) { a.grab = 'Tail Grab'; a.grabT += dt; }
  if (PIPE.on) {   // half-pipe air: drift back over the transition, like a rider steering the landing
    const q = pipeLocal(P.pos.x, P.pos.z);
    if (q.s > 0 && q.s < PIPE.L && Math.abs(q.w) > PIPE.F && Math.abs(q.w) < PIPE.halfW + 2.5) {
      const inward = -Math.sign(q.w), lat = -P.vel.x * PIPE.dz + P.vel.z * PIPE.dx;          // current across speed (+w)
      const want = inward * Math.min(2.2, 0.8 + (Math.abs(q.w) - PIPE.F) * 0.35), dv = (want - lat) * Math.min(1, dt * 2.5);
      P.vel.x += -PIPE.dz * dv; P.vel.z += PIPE.dx * dv;
    }
  }
  P.pos.addScaledVector(P.vel, dt); clampWorld(); updateTunnel();
  if (checkRails()) return;
  const gh = groundY(P.pos.x, P.pos.z);
  if (P.pos.y <= gh) {
    if (a.t < 0.08) { P.pos.y = gh; return; }   // still sliding off the lip
    P.pos.y = gh; groundN(P.pos.x, P.pos.z, _n); land(_n); return;
  }
  if (P.pos.y - gh < 4) collideObstacles();
}

export function trickName(a, landedSwitch) {
  const spins = Math.round(Math.abs(a.spin) / Math.PI) * 180;
  const flips = Math.round(Math.abs(a.flip) / (2 * Math.PI));
  const parts = [];
  if (a.startSwitch && (spins || flips)) parts.push('Switch');
  if (a.pop && (spins || flips)) parts.push(a.pop);
  if (flips) parts.push((flips === 2 ? 'Double ' : flips >= 3 ? 'Triple ' : '') + (a.flip > 0 ? 'Frontflip' : 'Backflip'));
  if (spins >= 180) parts.push(String(spins));
  const grab = a.grab && a.grabT > 0.22 ? a.grab : null;
  if (grab) parts.push(grab);
  let pts = spins / 180 * 120 + flips * 450 + (grab ? 80 + 120 * Math.min(a.grabT, 1.5) : 0) + a.t * 40;
  if (a.startSwitch && (spins || flips)) pts *= 1.25;
  if (a.pop) pts += 60;
  if (!parts.length) { if (a.pop && a.t > 0.4) { parts.push(a.pop); pts = 50 + a.t * 60; } else { if (a.t < 0.75) return null; parts.push(a.t > 1.6 ? 'Gros air' : 'Air'); pts = a.t * 60; } }
  return { name: parts.join(' '), pts: Math.round(pts / 10) * 10, sub: landedSwitch ? 'Réception switch' : '' };
}

export function land(n) {
  const a = P.air, vhx = P.vel.x, vhz = P.vel.z, sp = Math.hypot(vhx, vhz);
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  let align = sp > 2 ? (fx * vhx + fz * vhz) / sp : 1;
  if (inPipe(P.pos.x, P.pos.z, 2)) {   // on a pipe wall compare in the plane of the surface: falling back down the wall, forward or switch
    const vn = P.vel.dot(n), tx = P.vel.x - n.x * vn, ty = P.vel.y - n.y * vn, tz = P.vel.z - n.z * vn, fn = fx * n.x + fz * n.z;
    const sx = fx - n.x * fn, sy = -n.y * fn, sz = fz - n.z * fn, lt = Math.hypot(tx, ty, tz), ls = Math.hypot(sx, sy, sz);
    if (lt > 1 && ls > 1e-3) align = (sx * tx + sy * ty + sz * tz) / (lt * ls);
  }
  const pitchErr = Math.abs(wrapPi(P.pitch));
  const impact = P.vel.dot(n);
  let fail = '';
  if (a.t > 0.3) {
    if (pitchErr > 0.95) fail = 'Réception sur la tête';
    else if (Math.abs(align) < 0.5) fail = 'Réception de travers';
  }
  if (impact < -15.5) fail = 'Réception trop violente';
  if (fail) { crash(fail); return; }
  P.vel.addScaledVector(n, -impact);
  P.compress = Math.min(1, (P.compress || 0) + Math.max(0, -impact) * 0.07);
  if (sp > 2) { const vy = Math.atan2(vhx, vhz); P.yaw = align >= 0 ? vy : vy + Math.PI; }
  let sketchy = a.t > 0.3 && Math.abs(align) < 0.85;
  if (sketchy) P.vel.multiplyScalar(0.72);
  if (impact < -9) P.vel.multiplyScalar(0.9);
  P.pitch = 0; P.state = 'ski'; P.charge = 0; P.eatJump = input.jump;
  P.edge *= 0.3; P.lastLand = performance.now();
  if (a.t > 0.25) { sfx.land(Math.min(1, -impact / 12)); _t.set(0, 1.6, 0); emit(P.pos, _t, Math.min(40, 8 + a.t * 14), 3.5); }
  const tr = a.t > 0.3 ? trickName(a, align < 0) : null;
  if (tr) {
    if (sketchy) tr.pts = Math.round(tr.pts * 0.5 / 10) * 10;
    P.score += tr.pts; if (!P.best || tr.pts > P.bestPts) { P.best = tr.name; P.bestPts = tr.pts; }
    showTrick(tr.name, '+' + fmt(tr.pts) + (sketchy ? ' · réception limite' : '') + (tr.sub ? ' · ' + tr.sub : ''));
    riderEvent('trick', { pts: tr.pts, name: tr.name, air: a.t });
  } else if (sketchy) showTrick('Réception limite', '');
  riderEvent('land');
  P.air = null;
}

export function crash(msg) {
  P.state = 'crash'; P.crashT = 2.3; P.crashMsg = msg; riderEvent('crash');
  P.crashAxis = new V3(Math.random() - 0.5, Math.random() * 0.4, Math.random() - 0.5).normalize();
  P.air = null; P.rail = null; P.charge = 0; P.revertT = 0; P.press = null;
  showTrick('Chute !', msg + ' · R pour rejoindre une remontée');
  sfx.land(1); _t.set(0, 2, 0); emit(P.pos, _t, 40, 4);
}

export function stepCrash(dt) {
  P.crashT -= dt;
  const gh = groundY(P.pos.x, P.pos.z);
  if (P.pos.y > gh + 0.05) { P.vel.y -= 9.81 * dt; }
  else { P.pos.y = gh; groundN(P.pos.x, P.pos.z, _n); P.vel.addScaledVector(_n, -Math.min(0, P.vel.dot(_n))); const s = P.vel.length(); if (s > 0) P.vel.multiplyScalar(Math.max(0, s - 9 * dt) / s); }
  P.pos.addScaledVector(P.vel, dt); clampWorld(); updateTunnel();
  const g2 = groundY(P.pos.x, P.pos.z); if (P.pos.y < g2) P.pos.y = g2;
  if (!P.tunnel) pushOutObstacles();
  if (P.crashT <= 0) standUp();
}

export function standUp() {
  P.state = 'ski'; P.vel.set(0, 0, 0); P.pitch = 0; P.edge = 0;
  P.pos.y = groundY(P.pos.x, P.pos.z); groundN(P.pos.x, P.pos.z, _n);
  if (P.tunnel) { const tl = tunnelLocal(P.tunnel, P.pos.x, P.pos.z, 2); if (tl) P.yaw = Math.atan2(tl.ux, tl.uz); return; }   // pistes run downhill
  if (Math.hypot(_n.x, _n.z) > 0.02) P.yaw = Math.atan2(_n.x, _n.z);
  // if a trunk sits right below, step sideways so the line is clear
  const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
  const cx = Math.floor((P.pos.x + HALF) / TC), cz = Math.floor((P.pos.z + HALF) / TC);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const l = trees.grid.get(cx + dx + (cz + dz) * 1000); if (!l) continue;
    for (const i of l) {
      const ex = trees.x[i] - P.pos.x, ez = trees.z[i] - P.pos.z, ahead = ex * fx + ez * fz, side = -ex * fz + ez * fx;
      if (ahead > -0.5 && ahead < 6 && Math.abs(side) < 0.6 * trees.s[i] + 0.8) { const sgn = side >= 0 ? -1 : 1; P.pos.x += -fz * sgn * 1.6; P.pos.z += fx * sgn * 1.6; P.pos.y = H(P.pos.x, P.pos.z); return; }
    }
  }
}

export function collideObstacles() {
  const sp = P.vel.length();
  const other = npcHit(0.9);
  if (other && P.state !== 'crash') {
    if (sp > 9) { P.vel.multiplyScalar(0.25); crash('Collision avec un skieur'); return true; }
    const ex = P.pos.x - other.x, ez = P.pos.z - other.z, d = Math.hypot(ex, ez) || 1; P.pos.x = other.x + ex / d * 0.9; P.pos.z = other.z + ez / d * 0.9; P.vel.multiplyScalar(0.7);
  }
  if (P.tunnel) return false;   // trees and chalets above the tube are not in the way
  const cx = Math.floor((P.pos.x + HALF) / TC), cz = Math.floor((P.pos.z + HALF) / TC);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const l = trees.grid.get(cx + dx + (cz + dz) * 1000); if (!l) continue;
    for (const i of l) {
      const r = 0.5 * trees.s[i] + 0.3, ex = P.pos.x - trees.x[i], ez = P.pos.z - trees.z[i];
      if (ex * ex + ez * ez < r * r) {
        P.lastHit = { kind: 'tree', i, x: trees.x[i], z: trees.z[i], r };
        if (sp > 4.5 && P.state !== 'crash') { P.vel.multiplyScalar(0.15); crash('Sapin percuté'); return true; }
        const d = Math.hypot(ex, ez) || 1, nx = ex / d, nz = ez / d; P.pos.x = trees.x[i] + nx * r; P.pos.z = trees.z[i] + nz * r;
        const vr = P.vel.x * nx + P.vel.z * nz; if (vr < 0) { P.vel.x -= vr * nx; P.vel.z -= vr * nz; }   // slide around the trunk
        return true;
      }
    }
  }
  for (const o of obstacles) {
    const ex = P.pos.x - o.x, ez = P.pos.z - o.z;
    if (ex * ex + ez * ez < o.r * o.r) {
      P.lastHit = { kind: 'obstacle', x: o.x, z: o.z, r: o.r };
      if (sp > 7 && P.state !== 'crash') { P.vel.multiplyScalar(0.1); crash('Choc contre un chalet'); return true; }
      const d = Math.hypot(ex, ez) || 1; P.pos.x = o.x + ex / d * o.r; P.pos.z = o.z + ez / d * o.r; P.vel.set(0, 0, 0); return true;
    }
  }
  return false;
}

export function pushOutObstacles() {
  const cx = Math.floor((P.pos.x + HALF) / TC), cz = Math.floor((P.pos.z + HALF) / TC);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const l = trees.grid.get(cx + dx + (cz + dz) * 1000); if (!l) continue;
    for (const i of l) { const r = 0.5 * trees.s[i] + 0.35, ex = P.pos.x - trees.x[i], ez = P.pos.z - trees.z[i], d = Math.hypot(ex, ez); if (d < r) { const k = d || 1; P.pos.x = trees.x[i] + ex / k * r; P.pos.z = trees.z[i] + ez / k * r; const vr = (P.vel.x * ex + P.vel.z * ez) / k; if (vr < 0) { P.vel.x -= vr * ex / k; P.vel.z -= vr * ez / k; } } }
  }
  for (const o of obstacles) { const ex = P.pos.x - o.x, ez = P.pos.z - o.z, d = Math.hypot(ex, ez); if (d < o.r) { const k = d || 1; P.pos.x = o.x + ex / k * o.r; P.pos.z = o.z + ez / k * o.r; P.vel.set(0, 0, 0); } }
}

export function checkRails() {
  if (P.railCool > 0) return false;
  for (const r of rails) {
    const dx = P.pos.x - r.a.x, dz = P.pos.z - r.a.z, u = dx * r.dx + dz * r.dz;
    if (u < 0.3 || u > r.lenH - 0.3) continue;
    if (Math.abs(-dx * r.dz + dz * r.dx) > (r.type === 'box' ? 0.6 : 0.5)) continue;
    const ry = r.a.y + r.slope * u, dy = P.pos.y - ry;
    if (dy < -0.4 || dy > 0.4) continue;
    if (P.vel.y > 2.5) continue;
    const al = P.vel.dot(r.d3); if (Math.abs(al) < 2.2) continue;
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
    P.railKind = Math.abs(fx * r.dx + fz * r.dz) > 0.6 ? '50-50' : (r.type === 'box' ? 'Boardslide' : 'Railslide');
    P.state = 'rail'; P.rail = r; P.railS = Math.hypot(u, r.slope * u); P.railV = al; P.railT = 0; P.air = null; P.pitch = 0;
    sfx.land(0.4);
    return true;
  }
  return false;
}

export function stepRail(dt) {
  const r = P.rail; P.railT += dt;
  if (input.grab && (input.up || input.down)) { P.railKind = input.up ? 'Nose Press' : 'Tail Press'; P.pressV += ((input.up ? 1 : -1) - P.pressV) * Math.min(1, dt * 9); }
  else P.pressV += (0 - P.pressV) * Math.min(1, dt * 9);
  P.railV += (-9.81 * r.d3.y) * dt - Math.sign(P.railV) * 0.7 * dt;
  P.railS += P.railV * dt;
  P.pos.copy(r.a).addScaledVector(r.d3, P.railS);
  const jumped = !input.jump && P.prevJump;
  if (P.railS < 0 || P.railS > r.len3 || Math.abs(P.railV) < 0.4 || jumped) {
    P.vel.copy(r.d3).multiplyScalar(P.railV); P.vel.y += jumped ? 4 : 0.8;
    const pts = Math.round((60 + P.railT * 220) / 10) * 10; P.score += pts; riderEvent('rail', { pts, air: 0 });
    if (!P.best || pts > P.bestPts) { P.best = P.railKind; P.bestPts = pts; }
    showTrick(P.railKind + (r.type === 'box' ? ' sur box' : ' sur rail'), '+' + fmt(pts));
    P.railCool = 0.35; P.rail = null; startAir(false);
    if (jumped) sfx.pop();
  }
}

export function tryBoard() {
  if (P.state !== 'ski') return;
  const L = nearLift(12); if (!L) return;
  const lk = lockOf(L); if (lk) { showTrick('Remontée fermée', lk.goal); return; }
  P.state = 'lift'; P.lift = L; P.liftS = L.s0; P.vel.set(0, 0, 0); P.edge = 0; P.charge = 0; riderEvent('ride', L);
  L.own.visible = true;
  showTrick(L.name, (L.type === 'tbar' ? 'Tenez la perche' : 'Bonne montée') + ' · ↑ pour accélérer · E pour passer');
}

export function nearLift(r) {
  if (P.state !== 'ski') return null;
  let best = null, bd = r;
  for (const L of LIFTS) { const d = Math.hypot(P.pos.x - L.board.x, P.pos.z - L.board.z); if (d < bd) { bd = d; best = L; } }
  return best && P.vel.length() < 9 ? best : null;
}

export function stepLift(dt) {
  const L = P.lift, mult = (input.grab || input.up) ? 4 : 1;
  if (P.liftSkip > 0) { P.liftSkip -= dt; if (P.liftSkip <= 0) { $('fade').classList.remove('on'); unload(L); } return; }
  P.liftS += L.speed * mult * dt;
  if (P.liftS >= L.total - L.endS) { unload(L); return; }
  L.up.pointAt(P.liftS, _t);
  if (L.type === 'tbar') P.pos.set(_t.x, H(_t.x, _t.z), _t.z); else P.pos.copy(_t);
  P.yaw = L.yaw;
}

// skip the rest of the ride: a short fade to black, then you are at the top. A timed mission is charged the
// remaining ride at full boost (×4), as if you had held ↑ all the way.
export function skipLift() {
  if (P.state !== 'lift' || P.liftSkip > 0) return;
  const L = P.lift, rest = Math.max(0, L.total - L.endS - P.liftS) / (L.speed * 4);
  if (RIDER.active && missionById(RIDER.active.id).time) RIDER.active.time -= rest;
  P.liftSkip = 0.45; $('fade').classList.add('on');
}

export function unload(L) {
  L.own.visible = false;
  P.state = 'ski'; P.lift = null; P.tunnel = null;
  P.pos.set(L.exit[0], 0, L.exit[1]); P.pos.y = H(P.pos.x, P.pos.z);
  P.yaw = L.exitYaw; P.vel.set(Math.sin(P.yaw) * 3, 0, Math.cos(P.yaw) * 3); __set_camSnap(true);
  normalAt(P.pos.x, P.pos.z, _n); P.vel.addScaledVector(_n, -P.vel.dot(_n));
  showTrick('Arrivée · ' + fmt(P.pos.y + ALT0) + ' m', L.name);
}

export function respawnNearestLift() {
  riderEvent('teleport');
  if (P.lift) P.lift.own.visible = false;
  let best = LIFTS[0], bd = Infinity;
  for (const L of LIFTS) { const d = Math.hypot(P.pos.x - L.board.x, P.pos.z - L.board.z); if (d < bd) { bd = d; best = L; } }
  const p = best.board.clone().addScaledVector(best.dir, -7);
  P.pos.set(p.x, H(p.x, p.z), p.z); P.vel.set(0, 0, 0); P.yaw = best.yaw; P.pitch = 0;
  if (P.state === 'sled') { sled.x = P.pos.x; sled.z = P.pos.z; sled.yaw = P.yaw; sled.parked = true; skierSkis(true); }
  P.state = 'ski'; P.lift = null; P.air = null; P.rail = null; P.edge = 0; P.charge = 0; P.revertT = 0; P.tunnel = null; __set_camSnap(true);
  showTrick(best.name, 'Appuyez sur E pour monter');
}

export function teleportLift(i) { const L = LIFTS[i]; P.pos.set(L.board.x, 0, L.board.z); respawnNearestLift(); }

export function teleportLiftTop(i) {
  const L = LIFTS[i];
  P.pos.set(L.board.x, 0, L.board.z); respawnNearestLift();          // resets state, parks the snowmobile
  P.pos.set(L.exit[0], 0, L.exit[1]); P.pos.y = H(P.pos.x, P.pos.z); P.yaw = L.exitYaw; P.vel.set(0, 0, 0); __set_camSnap(true);
  showTrick('Arrivée · ' + fmt(P.pos.y + ALT0) + ' m', L.name);
}

export function __init_5131() {

/* ---------------- Simulation ---------------- */
input = { left: false, right: false, up: false, down: false, jump: false, grab: false, tail: false };
// touch stick (kept outside `input` so keyboard / bots stay digital): x, y in -1..1 after deadzone and curve
stick = { on: false, x: 0, y: 0, id: null };
jumpHold = false;
queued = new Set();
P = {
  pos: new V3(), vel: new V3(), yaw: 0, pitch: 0, state: 'ski', edge: 0, charge: 0, prevJump: false,
  air: null, crashT: 0, crashMsg: '', lift: null, liftS: 0, rail: null, railS: 0, railV: 0, railT: 0, railKind: '', railCool: 0,
  revertT: 0, revertDir: 1, brake: 0, tuck: 0, offPiste: false, zone: -1, score: 0, best: '', stillT: 0, lastLand: 0,
  tunnel: null, snow: SN.DAMEE, skid: 0, jolt: 0, yawRate: 0, sinkT: 0, compress: 0, skating: false, press: null, pressV: 0
};
STEP = 1 / 120;
_n = new V3();
_f = new V3();
_l = new V3();
_g = new V3();
_t = new V3();
events = [];
FORCE = { snow: null };
// Sidestep ("l'escalier"): holding ↑ at walking pace against a slope too steep to skate up, the skier turns the
// skis across the fall line and climbs sideways, uphill ski first, edges biting; ← / → slant the line (diagonal
// sidestep). Stepping speed falls with the gradient; ↓ or letting go of ↑ ends it (the skis stay across the slope).
_cu = new V3();
_ct = new V3();
}
