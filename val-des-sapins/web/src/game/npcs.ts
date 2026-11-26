// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « npcs ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { AX_X, AX_Y, _q3, _qa } from './animation';
import { npcGeos } from './assembly';
import { TERRACE_FOLK } from './buildings';
import { IS_TOUCH, V3, clamp, lerp, smoothstep } from './core';
import { CLOTH_T, _hv, animateFace, makeHuman, newJoints, poseHuman, setGear } from './humans';
import { dlgOpen, dlgWho } from './journal';
import { _m, _q, liftAnim } from './lifts';
import { lambertVC, pbr } from './materials';
import { PEOPLE, initPeople, peopleUpdate } from './people';
import { LIFTS, PISTES, SN, mogulWeight, snowAt } from './pistes';
import { P } from './player';
import { buildFreeLines, markTrack } from './progression';
import { SMALL_LAYER, camera, scene } from './render';
import { H, normalAt, rnd } from './terrain';
import { BLEND, PLAGNE } from './world-data';

export let NPC_N, npcs, npcMesh, JACKETS, npcSpeed, skiPistes, STY, RIG_PARTS, PANTS_C, FREE_LINES, _rb, SKIN_TONES, HELMETS, BEANIES, humanPool, _hmat, npcSlot, chairSeats, ZERO_M;


export function npcStyle(lvl, k) {
  if (lvl === 'verte') return k < 0.55 ? 'plow' : 'para';
  if (lvl === 'bleue') return k < 0.22 ? 'plow' : k < 0.75 ? 'para' : 'carve';
  if (lvl === 'rouge') return k < 0.4 ? 'para' : k < 0.86 ? 'carve' : 'race';
  if (lvl === 'noire') return k < 0.3 ? 'para' : k < 0.75 ? 'carve' : 'race';
  return 'para';
}

export function npcStartOn(n, p, s) {
  const r = npcSpeed[p.lvl] || [7, 10], st0 = npcStyle(p.lvl, n.skill), style = n.board && (st0 === 'plow' || st0 === 'race') ? 'carve' : st0, plow = style === 'plow';
  Object.assign(n, { mode: 'ski', p, s, style, v: lerp(r[0], r[1], n.skill) * (plow ? 0.62 : 1), phase: rnd() * 6.28, turn: (11 + rnd() * 12) * (plow ? 1.25 : 1), amp: (p.w / 2 - 2.5) * (0.35 + rnd() * 0.5) * (plow ? 0.7 : 1) });
}

export function initNPCs() {
  if (BLEND.geo.npcp_pelvis) return initRig();
  // two outfits from Blender (helmet + short jacket, beanie + long parka), every other skier; same instance total
  const B = BLEND.geo, hasB = !!B.npc_ski_body_b; npcMesh.nA = hasB ? Math.ceil(NPC_N / 2) : NPC_N; npcMesh.hasB = hasB;
  const g = B.npc_ski_body ? { sb: B.npc_ski_body, sj: B.npc_ski_jacket, cb: B.npc_seat_body, cj: B.npc_seat_jacket } : npcGeos(), mk = (geo, cnt = npcMesh.nA) => { const m = new THREE.InstancedMesh(geo, lambertVC(), cnt); m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.layers.set(SMALL_LAYER); scene.add(m); return m; };
  npcMesh.sb = mk(g.sb); npcMesh.sj = mk(g.sj); npcMesh.cb = mk(g.cb); npcMesh.cj = mk(g.cj);
  if (hasB) { const nB = NPC_N - npcMesh.nA; npcMesh.sbB = mk(B.npc_ski_body_b, nB); npcMesh.sjB = mk(B.npc_ski_jacket_b, nB); npcMesh.cbB = mk(B.npc_seat_body_b, nB); npcMesh.cjB = mk(B.npc_seat_jacket_b, nB); }
  const list = skiPistes(), c = new THREE.Color();
  for (let i = 0; i < NPC_N; i++) {
    const n = { skill: rnd(), x: 0, y: 0, z: 0, yaw: 0, roll: 0, show: 'ski', h: 0.9 + rnd() * 0.18, gth: 0.92 + rnd() * 0.18 };   // height, build
    const p = list[Math.floor(rnd() * list.length)];
    npcStartOn(n, p, rnd() * (p.samples.length - 4) * 4);
    c.set(JACKETS[i % JACKETS.length]); { const [sf, j] = npcSlot(i); npcMesh['sj' + sf].setColorAt(j, c); npcMesh['cj' + sf].setColorAt(j, c); }
    npcs.push(n);
  }
  for (const m of ['sj', 'cj', 'sjB', 'cjB']) if (npcMesh[m]) npcMesh[m].instanceColor.needsUpdate = true;
  initPeople();
}

export function initRig() {
  FREE_LINES = PLAGNE ? buildFreeLines() : [];
  const TOT = NPC_N + PEOPLE.length + TERRACE_FOLK.length, nA = Math.ceil(TOT / 2), nB = TOT - nA, rig = npcMesh.rig = {}, mat = lambertVC();   // the crowd, the people of the resort, the terraces
  for (const [name, mult] of RIG_PARTS) {
    const cnt = mult === 'A' ? nA : mult === 'B' ? nB : TOT * mult;
    const m = new THREE.InstancedMesh(BLEND.geo['npcp_' + name], mat, cnt);
    m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.layers.set(SMALL_LAYER); scene.add(m); rig[name] = m;
  }
  npcMesh.sb = rig.pelvis;   // "ready" flag used by updateNPCs
  if (BLEND.geo.snowboard) {   // the snowboarders' boards (blender/gear.py), one per crowd slot
    const bm = new THREE.InstancedMesh(BLEND.geo.snowboard, pbr({ color: '#ffffff', roughness: 0.32, vertexColors: true }), NPC_N); bm.frustumCulled = false; bm.castShadow = true; bm.layers.set(SMALL_LAYER);
    const c = new THREE.Color(); for (let i = 0; i < NPC_N; i++) { bm.setMatrixAt(i, ZERO_M); bm.setColorAt(i, c.setHSL((i * 0.137) % 1, 0.55, 0.5)); }
    scene.add(bm); rig.board = bm;
  }
  const list = skiPistes(), c = new THREE.Color(), white = new THREE.Color(1, 1, 1);
  for (let i = 0; i < NPC_N; i++) {
    const n = { skill: rnd(), x: 0, y: 0, z: 0, yaw: 0, roll: 0, show: 'ski', h: 0.9 + rnd() * 0.18, gth: 0.92 + rnd() * 0.18, swing: rnd() * 6.28 };
    if (BLEND.geo.snowboard && rnd() < 0.28) Object.assign(n, { board: true, stance: rnd() < 0.6 ? 1 : -1, noSkis: true, gear: rnd() < 0.55 ? 'helmet' : 'beanie' });   // snowboarders: regular or goofy
    if (i < (IS_TOUCH ? 2 : 4) && FREE_LINES[i]) n.free = FREE_LINES[i];                       // freeriders, off the runs
    const p = n.free || list[Math.floor(rnd() * list.length)];
    npcStartOn(n, p, rnd() * (p.samples.length - 4) * 4);
    const jacket = new THREE.Color(JACKETS[i % JACKETS.length]), pants = new THREE.Color(PANTS_C[Math.floor(rnd() * PANTS_C.length)]), skis = new THREE.Color().setHSL(rnd(), 0.6, 0.55);
    const sl = i >> 1, B = i % 2 ? 'b' : 'a';
    rig['torso_' + B].setColorAt(sl, jacket); rig['head_' + B].setColorAt(sl, white); rig.pelvis.setColorAt(i, pants);
    for (const sd of [0, 1]) { rig.upperarm.setColorAt(i * 2 + sd, jacket); rig.forearm.setColorAt(i * 2 + sd, jacket); rig.thigh.setColorAt(i * 2 + sd, pants); rig.shin.setColorAt(i * 2 + sd, pants); rig.ski.setColorAt(i * 2 + sd, skis); rig.pole.setColorAt(i * 2 + sd, white); rig.boot.setColorAt(i * 2 + sd, white); }
    npcs.push(n);
  }
  for (const k in rig) if (rig[k].instanceColor) rig[k].instanceColor.needsUpdate = true;
  initPeople();
}

// a bone frame: origin o, local +y along 'up', local +z as close as possible to 'fwd'; written into mesh slot j (root space -> world)
export function rigBone(mesh, j, o, up, fwd) {
  const R = _rb; R.y.copy(up).normalize(); R.z.copy(fwd).addScaledVector(R.y, -fwd.dot(R.y)).normalize(); R.x.crossVectors(R.y, R.z);
  R.m.makeBasis(R.x, R.y, R.z).setPosition(o).premultiply(R.root); mesh.setMatrixAt(j, R.m);
}

export function rigHide(rig, k) { for (const [name, mult] of RIG_PARTS) { if (mult === 'A' || mult === 'B') { if ((k % 2 ? 'B' : 'A') === mult) rig[name].setMatrixAt(k >> 1, ZERO_M); } else for (let s = 0; s < mult; s++) rig[name].setMatrixAt(k * mult + s, ZERO_M); } }

export function assignHumans() {
  if (!BLEND.humans || !npcs.length) return;
  if (!humanPool.list.length) for (let i = 0; i < humanPool.N; i++) {
    const kind = i % 2 ? 'hm_female' : 'hm_male', H = makeHuman(kind); if (!H) return;
    H.base = 0.87 / (H.rest.thigh_l.len + H.rest.calf_l.len); H.k = -1; H.root.visible = false; humanPool.list.push(H);
  }
  const cam = camera.position, want = [[], []];
  const cand = [];
  for (let k = 0; k < npcs.length; k++) { const n = npcs[k]; if (n.show === 'none') continue; const d = (n.x - cam.x) ** 2 + (n.z - cam.z) ** 2; if (d < 80 * 80) cand.push([d, k]); }
  cand.sort((a, b) => a[0] - b[0]);
  const per = humanPool.N / 2;
  for (const [, k] of cand) { const f = npcs[k].fem, w = want[f === undefined ? k % 2 : f ? 1 : 0]; if (w.length < per) w.push(k); }
  humanPool.slot.clear();
  for (const g of [0, 1]) {
    const pool = humanPool.list.filter((H, i) => i % 2 === g), keep = new Set(want[g]);
    for (const H of pool) if (!keep.has(H.k)) H.k = -1; else keep.delete(H.k);
    for (const H of pool) if (H.k < 0 && keep.size) {
      const k = keep.values().next().value; keep.delete(k); H.k = k;
      const U = H.U, pr = npcs[k].person; U.uJacket.value.set(pr ? pr.jacket : npcs[k].jacket || JACKETS[k % JACKETS.length]); U.uSkinTone.value.set(SKIN_TONES[(k * 7) % SKIN_TONES.length]);
      U.uHelmet.value.set(HELMETS[(k * 5) % HELMETS.length]); U.uBeanie.value.set(BEANIES[(k * 3) % BEANIES.length]);
      setGear(H, npcs[k].gear || (pr && !pr.skis ? 'beanie' : 'helmet'));
    }
    for (const H of pool) { H.root.visible = H.k >= 0; if (H.k >= 0) humanPool.slot.set(H.k, H); }
  }
}

// arms of the people on the terraces (directions in the torso frame): the drink hand at the chest, raised to the mouth
// every few seconds; the chips: cone held at the waist, the other hand going from the cone to the mouth
export function terraceArm(f, sd, s, t, ty, tz, tx) {
  const ad = new V3(), fd = new V3(), cyc = (t * 0.6 + f.swing) % 9, sip = smoothstep(0, 0.6, cyc) * (1 - smoothstep(1.8, 2.4, cyc));
  const V = (v, a, b, c) => v.set(0, 0, 0).addScaledVector(ty, a).addScaledVector(tz, b).addScaledVector(tx, c);
  const hold = f.prop && sd === (f.prop === 'fries' ? 0 : 1);
  if (f.pose === 'lounge') {
    if (hold) { V(ad, -0.6 + 0.3 * sip, 0.4 + 0.2 * sip, s * 0.3); V(fd, 0.25 + 0.7 * sip, 0.9 - 0.4 * sip, -s * (0.55 + 0.1 * sip)); }
    else { V(ad, -0.75, 0.05, s * 0.6); V(fd, -0.15, 0.95, s * 0.1); }                       // on the armrest
  } else if (f.pose === 'chair') {
    if (hold) { V(ad, -0.7 + 0.35 * sip, 0.5 + 0.15 * sip, s * 0.18); V(fd, 0.05 + 0.85 * sip, 0.95 - 0.5 * sip, -s * (0.25 + 0.25 * sip)); }
    else { V(ad, -0.75, 0.45, s * 0.2); V(fd, 0.0, 0.95, -s * 0.25); }                       // forearm on the table
  } else if (f.prop === 'fries') {
    if (sd === 0) { V(ad, -0.85, 0.42, s * 0.05); V(fd, 0.1, 0.9, -s * 0.5); }               // the cone at the waist
    else { const eat = smoothstep(0, 0.5, (t * 0.9 + f.swing) % 3) * (1 - smoothstep(1.2, 1.8, (t * 0.9 + f.swing) % 3)); V(ad, -0.8 + 0.4 * eat, 0.45 + 0.15 * eat, s * 0.1); V(fd, 0.15 + 0.8 * eat, 0.9 - 0.45 * eat, -s * (0.5 + 0.05 * eat)); }
  } else if (hold) { V(ad, -0.95 + 0.55 * sip, 0.15 + 0.45 * sip, s * 0.12); V(fd, 0.45 + 0.5 * sip, 0.85 - 0.6 * sip, -s * (0.35 + 0.15 * sip)); }
  else { V(ad, -0.96, 0.12, s * 0.16); V(fd, -0.85, 0.3, s * 0.05); }                          // arm hanging, or a hand in the pocket
  return [ad, fd];
}

export function updateRig(time) {
  const hdt = clamp(time - (humanPool.lastT ?? time), 0, 0.1); humanPool.lastT = time;
  assignHumans();
  const rig = npcMesh.rig, R = _rb, o = _m, F = new V3(0, 0, 1);
  for (let k = 0; k < npcs.length; k++) {
    const n = npcs[k];
    if (n.show === 'none') { rigHide(rig, k); continue; }
    const sit = n.show === 'sit', skiing = n.mode === 'ski', walking = n.mode === 'walk', tbar = n.mode === 'lift' && !sit;
    const ter = n.mode === 'terrace', pose = ter ? n.tf.pose : '', lounge = pose === 'lounge', tsit = lounge || pose === 'chair';   // terrace: deckchair, table chair or standing
    const brd = n.board && !sit;   // on a snowboard: the body faces across the board, which runs along the line of travel
    // root: on the snow (or the seat), heading, ground tilt and turn inclination
    o.position.set(n.x, n.y, n.z); o.scale.set(n.gth, n.h, n.gth);
    const yawB = n.yaw + (brd ? n.stance * Math.PI / 2 : 0);
    if (skiing) { normalAt(n.x, n.z, R.nrm); o.quaternion.setFromAxisAngle(AX_Y, yawB); R.q.setFromUnitVectors(AX_Y, R.nrm); o.quaternion.premultiply(R.q); if (brd) R.q3.setFromAxisAngle(AX_X, n.stance * n.roll); else R.q3.setFromAxisAngle(F, -n.roll); o.quaternion.multiply(R.q3); }   // board: toe or heel side
    else o.quaternion.setFromAxisAngle(AX_Y, yawB);
    o.updateMatrix(); R.root.copy(o.matrix);
    const HB = humanPool.slot.get(k), J = HB ? humanPool.J : null;
    const ph = n.phase || 0, roll = skiing ? n.roll : 0, t = time + n.swing, sty = skiing ? STY[n.style] || STY.para : STY.para;
    // turn rhythm: the edges change when sin(phase) crosses zero; just before it the skier plants the pole on the new
    // inside and extends (up-unweighting), then sinks into the turn
    const um = ((ph % Math.PI) + Math.PI) % Math.PI, dTr = um > Math.PI / 2 ? um - Math.PI : um;
    const rise = skiing && !brd && sty !== STY.race ? Math.exp(-Math.pow((dTr + 0.05) / 0.32, 2)) : 0;
    // at the edge change the legs reach 90 % extension: hip (pelvis - 0.05) to ankle (0.12) = 0.9 x (0.45 + 0.43),
    // i.e. pelvis at 0.955 m, flex 0.025 (pelvis = 0.98 - flex)
    const FLEX90 = 0.98 - (0.9 * 0.875 + 0.17);
    const flex = sit || tsit ? 0 : brd && skiing ? 0.17 + 0.07 * Math.abs(Math.sin(ph)) : skiing ? lerp(sty.flex + (sty.wob + 0.05) * Math.abs(Math.sin(ph)), FLEX90, rise) : tbar ? 0.12 : walking ? 0.06 : 0.04 + 0.01 * Math.sin(t * 1.3);
    // edged skis on a tilted body: the inside foot rides higher, the outside lower, the hips drop into the turn
    const W = brd ? 0.27 : skiing ? sty.w : 0.12, edge = skiing && !brd ? W * Math.tan(Math.min(0.8, Math.abs(roll))) : 0;
    // ---- pelvis and legs
    const pelY = tsit ? (lounge ? 0.43 : 0.53) : sit ? 0.12 : 0.12 + 0.86 - flex - edge * 0.7, pelZ = tsit ? -0.08 : sit ? -0.12 : -0.05 - flex * 0.5;
    rigBone(rig.pelvis, k, R.S.set(0, pelY, pelZ), R.up.set(0, 1, lounge ? -0.9 : tsit ? -0.05 : sit ? -0.1 : 0.15 + flex), F);
    if (J) { J.hipMid.set(0, pelY - 0.05, pelZ); J.up.copy(R.up); J.fwd.copy(F); }
    for (const sd of [0, 1]) {
      const s = sd ? -1 : 1, j = k * 2 + sd;
      R.H.set(s * 0.1, pelY - 0.05, pelZ);
      if (tsit) {   // deckchair: legs stretched along the sling, feet crossed now and then; chair: knees bent, feet on the deck
        const cross = lounge && Math.sin(t * 0.13 + n.ti) > 0.6 ? s * 0.05 : 0;
        if (lounge) { R.K.set(s * 0.12, pelY + 0.07, pelZ + 0.46); R.A.set(s * 0.13 - cross, pelY - 0.04, pelZ + 0.9); rigBone(rig.boot, j, R.A, R.up.set(0, 0.55, -0.83), R.fw.set(0, 0.83, 0.55)); }
        else { R.K.set(s * 0.12, pelY + 0.02, pelZ + 0.46); R.A.set(s * 0.13, 0.1, pelZ + 0.5 + 0.04 * Math.sin(t * 0.7 + sd)); rigBone(rig.boot, j, R.A, AX_Y, F); }
      } else if (sit) {
        const sw = 0.12 * Math.sin(t * 1.1 + sd * 1.7);
        R.K.set(s * 0.12, pelY - 0.03, pelZ + 0.45); R.A.set(s * 0.12, pelY - 0.45, pelZ + 0.5 + sw);
        rigBone(rig.ski, j, R.A, R.up.set(0, Math.cos(0.35), -Math.sin(0.35)), R.fw.set(0, Math.sin(0.35), Math.cos(0.35)));   // skis hang tips up
        rigBone(rig.boot, j, R.A, R.up, R.fw);
      } else {
        const step = walking ? 0.22 * Math.sin(t * 5 + sd * Math.PI) : 0, lift = walking ? Math.max(0, Math.sin(t * 5 + sd * Math.PI)) * 0.06 : 0;
        const ins = Math.sign(roll) * s;   // +1 inside of the turn, -1 outside
        R.A.set(s * W, 0.12 + lift + ins * edge, step);
        const dx = R.A.x - R.H.x, dy = R.A.y - R.H.y, dz = R.A.z - R.H.z, d = Math.min(0.875, Math.hypot(dx, dy, dz));
        const a1 = Math.acos(clamp((0.45 * 0.45 + d * d - 0.43 * 0.43) / (2 * 0.45 * d), -1, 1));
        R.W.set(dx, dy, dz).normalize(); R.T.copy(F).addScaledVector(R.W, -F.dot(R.W)).normalize();   // knee goes forward
        R.K.copy(R.H).addScaledVector(R.W, 0.45 * Math.cos(a1)).addScaledVector(R.T, 0.45 * Math.sin(a1));
        if (sty.wedge && skiing) { R.fw.set(-s * Math.sin(sty.wedge), 0, Math.cos(sty.wedge)); rigBone(rig.ski, j, R.A, AX_Y, R.fw); rigBone(rig.boot, j, R.A, AX_Y, R.fw); }   // pizza: tips together
        else { rigBone(rig.ski, j, R.A, AX_Y, F); rigBone(rig.boot, j, R.A, AX_Y, F); }
      }
      const kf = tsit ? AX_Y : F;   // a seated thigh lies along F: its reference axis is up
      rigBone(rig.thigh, j, R.H, R.up.subVectors(R.H, R.K), kf);
      rigBone(rig.shin, j, R.K, R.up.subVectors(R.K, R.A), F);
      if (J) { J.hip[sd].copy(R.H); J.knee[sd].copy(R.K); J.ankle[sd].copy(R.A).y += 0.1; J.kneeFwd[sd].copy(tsit ? AX_Y : F); J.thighFwd[sd].copy(kf); J.footUp[sd].copy(AX_Y); J.footFwd[sd].copy(sty.wedge && skiing ? R.fw : F); if (sit) { J.footFwd[sd].set(0, Math.sin(0.35), Math.cos(0.35)); J.footUp[sd].set(0, Math.cos(0.35), -Math.sin(0.35)); } if (lounge) { J.footFwd[sd].set(0, 0.83, 0.55); J.footUp[sd].set(0, 0.55, -0.83); } }
    }
    if (rig.board && k < NPC_N) {
      if (!n.board) rig.board.setMatrixAt(k, ZERO_M);
      else if (sit) { R.E.set(-0.12 * n.stance, pelY - 0.45, pelZ + 0.5).addScaledVector(R.fw.set(0, Math.sin(0.35), Math.cos(0.35)), -0.5); rigBone(rig.board, k, R.E, R.fw, R.up.set(0, Math.cos(0.35), -Math.sin(0.35))); }   // hanging from the front foot on the chair
      else rigBone(rig.board, k, R.E.set(-0.775, 0.04, 0), AX_X, AX_Y);   // under both feet, along the line of travel, top sheet up
    }
    // ---- torso: forward lean with the flex, more upright than the legs into the turn, counter-rotated
    const pitch = -0.1 * rise + (lounge ? -0.95 : tsit ? -0.03 : ter ? 0.03 : brd && skiing ? 0.16 : sit ? -0.12 : skiing ? sty.pitch + flex : tbar ? -0.05 : 0.08), side = -roll * (skiing ? sty.counter : 0.55), twist = skiing ? -roll * sty.twist : 0;
    R.up.set(Math.sin(side), Math.cos(side) * Math.cos(pitch), Math.cos(side) * Math.sin(pitch));
    R.fw.set(Math.sin(twist), 0, Math.cos(twist));
    R.S.y += 0.05; const B = k % 2 ? 'b' : 'a';
    rigBone(rig['torso_' + B], k >> 1, R.S, R.up, R.fw);
    R.y.copy(R.up).normalize(); R.z.copy(R.fw).addScaledVector(R.y, -R.fw.dot(R.y)).normalize(); R.lat.crossVectors(R.y, R.z);   // torso axes
    const ty = R.y.clone(), tz = R.z.clone(), tx = R.lat.clone();
    R.E.copy(R.S).addScaledVector(ty, 0.6);
    rigBone(rig['head_' + B], k >> 1, R.E, R.up.copy(ty).addScaledVector(tz, -0.25 * pitch), R.fw.copy(tz).setY(0));
    if (J) { J.spineUp.copy(ty); J.spineFwd.copy(tz); J.headUp.copy(R.up); J.headFwd.copy(R.fw); }
    // ---- arms and poles
    for (const sd of [0, 1]) {
      const s = sd ? -1 : 1, j = k * 2 + sd;
      // the plant: the arm on the inside of the coming turn, peaking just before the edge change (roll ∝ -sin(phase))
      const newIn = Math.sign(-Math.sin(ph + 0.35)) * s > 0;
      const plant = skiing ? (newIn && n.style !== 'plow' ? Math.exp(-Math.pow((dTr + 0.12) / 0.26, 2)) : 0) : walking ? Math.max(0, Math.sin(t * 5 + sd * Math.PI)) : 0;
      const Sh = R.W.copy(R.S).addScaledVector(ty, 0.47).addScaledVector(tx, s * 0.2);
      let ad, fd;
      if (sit) { ad = new V3().addScaledVector(ty, -0.75).addScaledVector(tz, 0.65); fd = new V3().addScaledVector(tz, 1).addScaledVector(ty, -0.25); }
      else if (ter) [ad, fd] = terraceArm(n.tf, sd, s, t, ty, tz, tx);
      else if (brd) {   // arms loose and a little out, the front one towards the nose for balance
        const front = s === -n.stance, bal = 0.15 * Math.sin(ph + sd);
        ad = new V3().addScaledVector(ty, -0.8).addScaledVector(tz, 0.25 + bal).addScaledVector(tx, s * (front ? 0.55 : 0.35));
        fd = new V3().addScaledVector(ty, -0.35).addScaledVector(tz, 0.6).addScaledVector(tx, s * (front ? 0.55 : 0.2));
      }
      else if (n.mode === 'npc' && !n.follow) {   // people of the resort: arms down, a wave when you come close
        const wv = sd === 0 && n.wave > 0 ? Math.min(1, n.wave * 2, (1.6 - n.wave) * 3) : 0;
        ad = new V3().addScaledVector(ty, -0.95 + 1.5 * wv).addScaledVector(tz, 0.12).addScaledVector(tx, s * (0.16 + 0.5 * wv));
        fd = new V3().addScaledVector(ty, -0.85 + 1.9 * wv).addScaledVector(tz, 0.3).addScaledVector(tx, s * 0.35 * wv * Math.sin(t * 9));
      }
      else if (tbar && sd === 0) { ad = new V3().addScaledVector(ty, 0.4).addScaledVector(tz, 0.5).addScaledVector(tx, -0.25); fd = new V3().addScaledVector(ty, 0.7).addScaledVector(tx, -0.4); }
      else if (skiing && n.style === 'plow') { ad = new V3().addScaledVector(ty, -0.75).addScaledVector(tz, 0.28).addScaledVector(tx, s * 0.55); fd = new V3().addScaledVector(tz, 0.7).addScaledVector(ty, -0.3).addScaledVector(tx, s * 0.4); }   // arms out for balance
      else if (skiing && n.style === 'race') { ad = new V3().addScaledVector(ty, -0.45).addScaledVector(tz, 0.8).addScaledVector(tx, s * 0.22); fd = new V3().addScaledVector(tz, 0.9).addScaledVector(ty, 0.05).addScaledVector(tx, -s * 0.2); }   // hands in front
      else {
        const inner = skiing && sty.ang && Math.sign(roll) * s > 0 ? Math.min(1, Math.abs(roll) * 1.4) : 0;   // carving: inside hand forward and up
        ad = new V3().addScaledVector(ty, -0.8 + 0.3 * inner + 0.25 * plant).addScaledVector(tz, 0.35 + 0.6 * plant + 0.3 * inner).addScaledVector(tx, s * (0.28 + 0.12 * plant));
        fd = new V3().addScaledVector(tz, 0.85).addScaledVector(ty, -0.35 + 0.35 * plant + 0.2 * inner).addScaledVector(tx, s * 0.1);
      }
      ad.normalize(); fd.normalize();
      R.E.copy(Sh).addScaledVector(ad, 0.29); const hand = R.T.copy(R.E).addScaledVector(fd, 0.27);
      rigBone(rig.upperarm, j, Sh, R.up.copy(ad).negate(), tz);
      rigBone(rig.forearm, j, R.E, R.up.copy(fd).negate(), ty);
      if (J) { J.sh[sd].copy(Sh); J.el[sd].copy(R.E); J.hand[sd].copy(hand); J.armFwd[sd].copy(tz); J.foreFwd[sd].copy(ty); J.handDir[sd].copy(fd); J.handFwd[sd].copy(tz); }
      // pole: from the hand to a tip on the snow (ahead and outside when planting, trailing otherwise)
      const tip = skiing && n.style === 'race' ? new V3(hand.x + s * 0.12, hand.y - 0.5, hand.z - 1.0)                         // poles tucked under the arms
        : skiing && n.style === 'plow' ? new V3(hand.x + s * 0.3, 0.0, hand.z - 0.45)                                                // dragged wide
        : new V3(hand.x + s * (0.12 + 0.1 * plant), sit ? hand.y - 1.1 : 0.0, sit ? hand.z + 0.1 : hand.z + (skiing ? -0.35 + 1.05 * plant : 0.1));   // planted: tip well ahead of the boots
      if (J) hand.addScaledVector(fd, 0.075);                                 // realistic bodies: grip in the fist, past the wrist
      if (ter && n.tf.prop && sd === (n.tf.prop === 'fries' ? 0 : 1)) {        // the drink (or the cone of chips) in that hand, upright
        R.E.copy(hand).addScaledVector(fd, J ? 0.01 : 0.07).addScaledVector(ty, n.tf.prop === 'fries' ? 0.02 : 0.0);
        rigBone(npcMesh.props[n.tf.prop], n.ti, R.E, AX_Y, F);
      }
      rigBone(rig.pole, j, hand, R.up.subVectors(hand, tip), F);
    }
    if (J) {
      const M = R.root;
      for (const key of ['hipMid']) J[key].applyMatrix4(M);
      for (const key of ['up', 'fwd', 'spineUp', 'spineFwd', 'headUp', 'headFwd']) J[key].transformDirection(M);
      for (const key of ['hip', 'knee', 'ankle', 'sh', 'el', 'hand']) for (const v of J[key]) v.applyMatrix4(M);
      for (const key of ['thighFwd', 'kneeFwd', 'footFwd', 'footUp', 'armFwd', 'foreFwd', 'handDir', 'handFwd']) for (const v of J[key]) v.transformDirection(M);
      // people of the resort look at you when you come near (head turns up to ~65 deg, eased)
      if (n.mode === 'npc') {
        const dx = P.pos.x - n.x, dz = P.pos.z - n.z, d = Math.hypot(dx, dz);
        let want = 0;
        if (d < 10) { want = Math.atan2(dx, dz) - n.yaw; want = Math.atan2(Math.sin(want), Math.cos(want)); want = clamp(want, -1.15, 1.15); }
        n.lookA = (n.lookA || 0) + (want - (n.lookA || 0)) * Math.min(1, hdt * 3);
        if (Math.abs(n.lookA) > 0.001) { J.headFwd.applyAxisAngle(AX_Y, n.lookA); _hv[0].copy(J.spineFwd).applyAxisAngle(AX_Y, n.lookA * 0.3); J.spineFwd.copy(_hv[0]); }
      }
      HB.scale = HB.base * (n.h || 1); poseHuman(HB, J);
      HB.U.uFlutter.value = skiing ? clamp(((n.v || 0) - 4) / 14, 0, 1) : 0; CLOTH_T.value = time;   // the fabric ripples with speed
      {
        const pr = n.person, near = Math.hypot(P.pos.x - n.x, P.pos.z - n.z) < 7, talking = dlgOpen && pr && dlgWho === pr;
        const mood = pr ? { smile: talking ? 0.7 : near ? 0.85 : 0.3, brows: n.wave > 0 ? 0.7 : talking ? 0.25 : 0, talk: talking }
          : ter ? { smile: 0.4 + 0.35 * Math.max(0, Math.sin(t * 0.4)), squint: lounge ? 0.35 : 0.1, talk: pose === 'chair' && Math.sin(t * 0.7) > 0.4 }
          : { smile: (k * 13) % 5 === 0 ? 0.45 : 0.12, squint: n.mode === 'ski' && n.v > 9 ? 0.3 : 0 };
        animateFace(HB, hdt, mood);
      }
      rig.pelvis.setMatrixAt(k, ZERO_M); rig['torso_' + B].setMatrixAt(k >> 1, ZERO_M); rig['head_' + B].setMatrixAt(k >> 1, ZERO_M);
      for (const sd of [0, 1]) for (const nm of ['upperarm', 'forearm', 'thigh', 'shin']) rig[nm].setMatrixAt(k * 2 + sd, ZERO_M);
    }
  }
  for (const n of npcs) if (n.noSkis && n.show !== 'none') { const k = npcs.indexOf(n); for (const sd of [0, 1]) { rig.ski.setMatrixAt(k * 2 + sd, ZERO_M); rig.pole.setMatrixAt(k * 2 + sd, ZERO_M); } }
  for (const k in rig) rig[k].instanceMatrix.needsUpdate = true;
  if (npcMesh.props) for (const k in npcMesh.props) npcMesh.props[k].instanceMatrix.needsUpdate = true;
}

export function nearestLiftFrom(x, z, r) {
  let best = null, bd = r; for (const L of LIFTS) { const d = Math.hypot(L.board.x - x, L.board.z - z); if (d < bd) { bd = d; best = L; } } return best;
}

export function pistesStartingNear(x, z, r, not) { return skiPistes().filter(p => p !== not && Math.hypot(p.samples[0].x - x, p.samples[0].z - z) < r); }

export function npcNext(n) {
  if (n.free) { npcStartOn(n, n.free, 0); return; }   // a freerider goes back up for another line
  const S = n.p.samples, e = S[S.length - 1];
  const L = nearestLiftFrom(e.x, e.z, 170), cont = pistesStartingNear(e.x, e.z, 70, n.p);
  if (cont.length && (!L || rnd() < 0.35)) { npcStartOn(n, cont[Math.floor(rnd() * cont.length)], 0); return; }
  if (L) { Object.assign(n, { mode: 'walk', L, tx: L.board.x - L.dir.x * (2 + rnd() * 4) + L.side.x * (rnd() - 0.5) * 3, tz: L.board.z - L.dir.z * (2 + rnd() * 4) + L.side.z * (rnd() - 0.5) * 3 }); return; }
  const list = skiPistes(), p = list[Math.floor(rnd() * list.length)]; npcStartOn(n, p, 0);
}

export function chairU(L, i, time) { return ((L.phase || 0) + i * L.spacing) % (2 * L.total); }

export function updateNPCs(dt, time) {
  if (!npcMesh.sb) return;
  for (let k = 0; k < npcs.length; k++) {
    const n = npcs[k];
    if (n.mode === 'ski') {
      const p = n.p, S = p.samples, len = (S.length - 1) * 4;
      let v = n.v; if (mogulWeight(n.x, n.z) > 0.3) v *= 0.6; else if (snowAt(n.x, n.z) === SN.GLACEE) v *= 0.8;
      n.s += v * dt; n.phase += v * dt / n.turn * Math.PI;
      if (n.s >= len - 6) { npcNext(n); continue; }
      const i = Math.floor(n.s / 4), t = n.s / 4 - i, a = S[i], b = S[i + 1];
      const dx = (b.x - a.x) / 4, dz = (b.z - a.z) / 4, px = dz, pz = -dx;
      const inT = p.tr && i >= p.tr[0] - 11 && i <= p.tr[1] + 11;
      const amp = inT ? Math.min(n.amp, 3) : n.amp, w = amp * Math.sin(n.phase), dw = amp * Math.cos(n.phase) * Math.PI / n.turn;
      n.x = lerp(a.x, b.x, t) + px * w; n.z = lerp(a.z, b.z, t) + pz * w;
      n.y = p.tr && i >= p.tr[0] - 1 && i <= p.tr[1] ? lerp(p.hs[i], p.hs[i + 1], t) : H(n.x, n.z);
      n.yaw = Math.atan2(dx + px * dw, dz + pz * dw);
      const curv = -amp * Math.pow(Math.PI / n.turn, 2) * Math.sin(n.phase);
      n.roll = clamp(Math.atan(v * v * curv / 9.81) * (STY[n.style] || STY.para).rollK, -0.9, 0.9); n.show = 'ski';
      if (n.free) markTrack(n.x, n.z);
    } else if (n.mode === 'walk') {
      const dx = n.tx - n.x, dz = n.tz - n.z, d = Math.hypot(dx, dz);
      if (d < 0.6) { n.mode = 'queue'; continue; }
      const st = Math.min(d, 3 * dt); n.x += dx / d * st; n.z += dz / d * st; n.y = H(n.x, n.z); n.yaw = Math.atan2(dx, dz); n.roll = 0; n.show = 'ski';
    } else if (n.mode === 'queue') {
      // board the next chair / T-bar / cabin passing the loading point
      const L = n.L, A = liftAnim.find(q => q.L === L);
      n.yaw = L.yaw; n.show = 'ski';
      const taken = new Set(npcs.filter(o => o.mode === 'lift' && o.L === L).map(o => o.chair));
      for (let c = 0; A && c < A.count; c++) { const u = chairU(L, c, time); if (Math.abs(u - L.s0) < L.speed * (L.mult || 1) * dt * 1.5 + 0.05 && !taken.has(c)) { n.mode = 'lift'; n.chair = c; break; } }
    } else if (n.mode === 'npc') { peopleUpdate(n, dt, time); continue;
    } else if (n.mode === 'terrace') { continue;
    } else if (n.mode === 'lift') {
      const L = n.L, u = chairU(L, n.chair, time);
      if (u > L.total - L.endS || u < L.s0 - 1) {
        const ex = L.exit[0] + (rnd() - 0.5) * 6, ez = L.exit[1] + (rnd() - 0.5) * 6, opts = pistesStartingNear(ex, ez, 160);
        const p = opts.length ? opts[Math.floor(rnd() * opts.length)] : skiPistes()[0];
        npcStartOn(n, p, 0); n.x = ex; n.z = ez; n.y = H(ex, ez); continue;
      }
      L.up.pointAt(u, _q); n.yaw = L.yaw; n.roll = 0;
      if (L.type === 'tbar') { n.x = _q.x; n.z = _q.z; n.y = H(_q.x, _q.z); n.show = 'ski'; }
      else if (L.type === 'chair') { const c = Math.cos(L.yaw), s = Math.sin(L.yaw), ns = chairSeats(), lx = ((n.chair * 7 + k) % ns - (ns - 1) / 2) * 0.6; n.x = _q.x + c * lx + s * 0.12; n.z = _q.z - s * lx + c * 0.12; n.y = _q.y - 2.3; n.show = 'sit'; }
      else { n.x = _q.x; n.z = _q.z; n.y = _q.y; n.show = 'none'; }
    }
  }
  if (npcMesh.rig) { updateRig(time); return; }
  // instance matrices
  const o = _m, nrm = new V3();
  for (let k = 0; k < npcs.length; k++) {
    const n = npcs[k];
    o.position.set(n.x, n.y, n.z); o.scale.set(n.gth || 1, n.h || 1, n.gth || 1);
    if (n.show === 'ski' && n.mode === 'ski') { normalAt(n.x, n.z, nrm); o.quaternion.setFromAxisAngle(AX_Y, n.yaw); _qa.setFromUnitVectors(AX_Y, nrm); o.quaternion.premultiply(_qa); _q3.setFromAxisAngle(new V3(0, 0, 1), -n.roll); o.quaternion.multiply(_q3); }
    else o.quaternion.setFromAxisAngle(AX_Y, n.yaw);
    o.updateMatrix();
    const ski = n.show === 'ski', sit = n.show === 'sit';
    const [sf, j] = npcSlot(k);
    npcMesh['sb' + sf].setMatrixAt(j, ski ? o.matrix : ZERO_M); npcMesh['sj' + sf].setMatrixAt(j, ski ? o.matrix : ZERO_M);
    npcMesh['cb' + sf].setMatrixAt(j, sit ? o.matrix : ZERO_M); npcMesh['cj' + sf].setMatrixAt(j, sit ? o.matrix : ZERO_M);
  }
  for (const m of ['sb', 'sj', 'cb', 'cj', 'sbB', 'sjB', 'cbB', 'cjB']) if (npcMesh[m]) npcMesh[m].instanceMatrix.needsUpdate = true;
}

// bumping into another skier
export function npcHit(r) {
  for (const n of npcs) {
    if (n.show !== 'ski' || n.mode === 'npc') continue;
    const dx = P.pos.x - n.x, dz = P.pos.z - n.z;
    if (dx * dx + dz * dz < r * r && Math.abs(P.pos.y - n.y) < 1.5) return n;
  }
  return null;
}

export function __init_2901() {

/* ---------------- Other skiers ---------------- */
// Kinematic skiers: they weave down the pistes, queue at the lift, ride a real chair / T-bar / cabin, and go again.
NPC_N = IS_TOUCH ? 24 : 60;
npcs = [];
npcMesh = {};
JACKETS = ['#d6332a', '#2f6fe0', '#f2a12c', '#2fa84f', '#7a3fb0', '#ece8df', '#151a22', '#e0398a', '#14a3a3', '#f2d22c', '#ff6b2c', '#5a7d2a'];
npcSpeed = { verte: [5.5, 8.5], bleue: [7.5, 11.5], rouge: [9, 13.5], noire: [10, 15], park: [7, 10] };
skiPistes = () => PISTES.filter(p => !p.hidden && !p.link && !p.pipe);
   // the other skiers stay out of the half-pipe
// skiing technique, after the reference turn cycles (BlendSwap, ViSki, CC0): snowplough beginners, parallel
// intermediates, carvers with angulation, giant-slalom racers. Chosen from the piste colour and the skier's level.
STY = {
  plow: { w: 0.22, flex: 0.08, wob: 0.03, counter: 0.2, rollK: 0.3, wedge: 0.42, pitch: 0.18, twist: 0.1 },
  para: { w: 0.12, flex: 0.1, wob: 0.1, counter: 0.55, rollK: 1, wedge: 0, pitch: 0.3, twist: 0.35 },
  carve: { w: 0.15, flex: 0.13, wob: 0.13, counter: 0.85, rollK: 1.08, wedge: 0, pitch: 0.34, twist: 0.5, ang: 1 },
  race: { w: 0.17, flex: 0.19, wob: 0.08, counter: 0.75, rollK: 1.1, wedge: 0, pitch: 0.5, twist: 0.4, ang: 1 },
};
/* ---------------- Crowd: articulated skiers ----------------
   Every skier is a small rig of rigid Blender parts (blender/people.py, npc_rig_parts), one InstancedMesh per part.
   Each frame the bones are placed procedurally: legs by two-bone IK between hip and ankle with a flex that follows
   the turn rhythm, the whole body inclined into the turn (skis on edge), upper body counter-rotated and more
   upright, arms forward with alternate pole plants; seated on the chairs with dangling legs; walking to the lifts. */
RIG_PARTS = [['pelvis', 1], ['torso_a', 'A'], ['torso_b', 'B'], ['head_a', 'A'], ['head_b', 'B'], ['upperarm', 2], ['forearm', 2], ['thigh', 2], ['shin', 2], ['ski', 2], ['boot', 2], ['pole', 2]];
PANTS_C = ['#232a3c', '#2b2b2e', '#c9b79a', '#3b4a5e', '#1d2a22', '#5a4632'];
FREE_LINES = [];
_rb = { root: new THREE.Matrix4(), m: new THREE.Matrix4(), x: new V3(), y: new V3(), z: new V3(), up: new V3(), fw: new V3(), lat: new V3(), H: new V3(), K: new V3(), A: new V3(), S: new V3(), E: new V3(), W: new V3(), T: new V3(), q: new THREE.Quaternion(), q3: new THREE.Quaternion(), nrm: new V3() };
SKIN_TONES = ['#ffffff', '#f6e2d4', '#e2b89a', '#b98a6c', '#87604a'];
   // multipliers on the photographed light skin
HELMETS = ['#f2f3f5', '#16181c', '#c9322b', '#2f6fe0', '#e9b72f', '#7d848e', '#f2f3f5', '#2a2d33'];
BEANIES = ['#b5302a', '#2a3550', '#e9b72f', '#3f6b3a', '#ece8df', '#6b3a7a', '#d96a2a'];
humanPool = { list: [], slot: new Map(), J: newJoints(), N: IS_TOUCH ? 4 : 10 };
_hmat = new THREE.Matrix4();
npcSlot = k => npcMesh.hasB ? [k % 2 ? 'B' : '', k >> 1] : ['', k];
chairSeats = () => BLEND.geo.chair6_closed ? 6 : 3;
ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
}
