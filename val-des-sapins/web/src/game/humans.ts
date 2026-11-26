// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « humans ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { Assembly, X1, Z1, _ay, axesAlong, limb, v3 } from './assembly';
import { V3, clamp, colorCanvasTex, patchShader } from './core';
import { C_, NZ } from './fauna';
import { grainHook, tileNoise } from './materials';
import { scene } from './render';
import { BLEND } from './world-data';

export let skierShade, skierTint, skierFlutter, skierFTime, SKI_GEO, SKI_MAT, lathe, skier, H_CHILD, _hm1, _hm2, _hq1, _hq2, _hv, CLOTH_T, CLOTH_VERT_DECL, CLOTH_FRAG, faceHold, AXY, AXZ, AXNY, axisW, playerHuman, playerJ;

export function __set_faceHold(v) { return (faceHold = v); }

export function fabricTex(seed, quilt) {
  const S = 128, n = tileNoise(S, 32, seed, 2), c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), img = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let v = 0.86 + n[y * S + x] * 0.1 + ((x + y) % 2 ? 0.02 : -0.02);                 // weave
    if (quilt && (y % 32 < 2)) v -= 0.16;                                             // quilted down channels
    if (quilt && (y % 32 > 2 && y % 32 < 9)) v += 0.05;
    const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = clamp(v * 255, 0, 255); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); const t = colorCanvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); return t;
}

export function skMat(color, shininess, map) {
  let m;
  if (shininess >= 90) m = new THREE.MeshStandardMaterial({ color, map: map || null, roughness: 0.28, metalness: 0.9 });                     // buckles, hardware
  else if (shininess >= 60) m = new THREE.MeshPhysicalMaterial({ color, map: map || null, roughness: 0.38, metalness: 0, clearcoat: 0.85, clearcoatRoughness: 0.1 });   // helmet shell, boots, ski top sheets
  else if (map) m = new THREE.MeshPhysicalMaterial({ color, map, roughness: 0.8, metalness: 0, sheen: 0.55, sheenRoughness: 0.5, sheenColor: new THREE.Color(1, 1, 1) });  // technical fabric
  else m = new THREE.MeshStandardMaterial({ color, roughness: shininess ? clamp(Math.sqrt(2 / (shininess + 2)) + 0.2, 0.3, 0.9) : 0.85, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.uniforms.uShade = skierShade; sh.uniforms.uTint = skierTint; sh.uniforms.uFlutter = skierFlutter; sh.uniforms.uFTime = skierFTime;
    // secondary motion: loose fabric (weights painted in Blender) ripples with speed
    sh.vertexShader = patchShader(sh.vertexShader, '#include <common>', '#include <common>\n#ifdef USE_FLUTTER\nattribute float aFlutter;\nuniform float uFlutter;\nuniform float uFTime;\n#endif', 'skier');
    sh.vertexShader = patchShader(sh.vertexShader, '#include <begin_vertex>', `#include <begin_vertex>
  #ifdef USE_FLUTTER
    float fa = atan(position.x, position.z);
    transformed += objectNormal * aFlutter * uFlutter * (0.011 * sin(uFTime * 21.0 + position.y * 38.0 + fa * 3.0) + 0.006 * sin(uFTime * 34.0 + fa * 7.0 + position.y * 70.0));
    transformed.z -= aFlutter * uFlutter * 0.018 * (0.6 + 0.4 * sin(uFTime * 9.0 + fa));
  #endif`, 'skier');
    sh.fragmentShader = patchShader('uniform float uShade;\nuniform vec3 uTint;\n' + sh.fragmentShader, '#include <opaque_fragment>', 'outgoingLight = outgoingLight * uShade + diffuseColor.rgb * uTint;\n#include <opaque_fragment>', 'skier');
  };
  return m;
}

/* twin-tip ski with double rocker: flat underfoot, both ends rising early and symmetrically, sidecut, centre mount */
export function makeSkiGeo() {
  const n = 48, L = 0.87, th = 0.016, pos = [], col = [], idx = [];
  const prof = z => { const a = Math.abs(z); return a < 0.48 ? 0 : 0.085 * Math.pow((a - 0.48) / (L - 0.48), 2.1); };
  const width = z => { const a = Math.abs(z); return a < 0.72 ? 0.098 + 0.026 * Math.pow(a / 0.72, 2) : Math.max(0.03, 0.124 * Math.sqrt(Math.max(0, 1 - Math.pow((a - 0.72) / 0.155, 2)))); };
  const top = z => { const a = Math.abs(z); if (a > 0.6) return a > 0.8 ? [0.12, 0.13, 0.15] : [0.95, 0.94, 0.9]; if (a < 0.1) return [0.12, 0.13, 0.15]; return Math.abs(z * 10 % 2) < 1 ? [0.77, 0.15, 0.23] : [0.86, 0.22, 0.26]; };
  for (let i = 0; i <= n; i++) {
    const z = -L + (2 * L) * i / n, y = prof(z), w = width(z) / 2, c = top(z);
    for (const [x, yy, cc] of [[-w, y + th, c], [w, y + th, c], [w, y, [0.08, 0.08, 0.09]], [-w, y, [0.08, 0.08, 0.09]]]) { pos.push(x, yy, z); col.push(...cc); }
  }
  for (let i = 0; i < n; i++) {
    const a = i * 4, b = a + 4;
    idx.push(a, b, a + 1, a + 1, b, b + 1);              // top
    idx.push(a + 3, a + 2, b + 3, a + 2, b + 2, b + 3);  // base
    idx.push(a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);  // right edge
    idx.push(a, a + 3, b, a + 3, b + 3, b);              // left edge
  }
  const e = n * 4; idx.push(0, 1, 2, 0, 2, 3, e, e + 2, e + 1, e, e + 3, e + 2);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

export function skMatVC() { const m = skMat('#ffffff', 30); m.vertexColors = true; return m; }

export function humanBasis(m, d, r) {   // rotation whose columns are (d, r orthogonalised, d x r)
  const a = _hv[4].copy(d); if (a.lengthSq() < 1e-10) a.set(0, 1, 0); a.normalize();
  const b = _hv[5].copy(r).addScaledVector(a, -r.dot(a));
  if (b.lengthSq() < 1e-6) { b.set(Math.abs(a.y) < 0.9 ? 0 : 1, Math.abs(a.y) < 0.9 ? 1 : 0, 0); b.addScaledVector(a, -b.dot(a)); }   // reference along the limb (knee or elbow at 90 deg): any perpendicular
  b.normalize();
  const c = _hv[3].crossVectors(a, b);
  return m.makeBasis(a, b, c);
}

   // shared clock of the cloth (wind ripples)
export function humanUniforms(skinTone, jacket, shade) {
  const v = () => ({ value: new V3() });
  return { uJacket: { value: new THREE.Color(jacket) }, uSkinTone: { value: new THREE.Color(skinTone) }, uHelmet: { value: new THREE.Color('#f2f3f5') }, uBeanie: { value: new THREE.Color('#b5302a') }, uShade: shade || { value: 1 },
    uFlutter: { value: 0 }, uClothT: CLOTH_T, uShL: v(), uShR: v(), uElL: v(), uElR: v(), uWrL: v(), uWrR: v(), uKnL: v(), uKnR: v(), uAnL: v(), uAnR: v(), uHipY: { value: 0.95 } };
}

export function clothHook(sh) {
  sh.vertexShader = patchShader(sh.vertexShader, '#include <begin_vertex>', `#include <begin_vertex>
  vRest = position;
  { float lum = (color.r + color.g + color.b) / 3.0; vCloth = aTint > 0.5 && aTint < 1.5 ? 1.0 : aTint < 0.5 && lum > 0.12 && lum < 0.45 && position.y < uHipY + 0.12 ? 2.0 : aTint < 0.5 && lum <= 0.12 ? 3.0 : 0.0; }`, 'cloth');
  sh.vertexShader = patchShader(sh.vertexShader, '#include <skinning_vertex>', `#include <skinning_vertex>
  if (uFlutter > 0.001 && vCloth > 0.5 && vCloth < 2.5) {     // wind ripples: sleeves and the lower jacket, trouser legs below the knee
    float m = vCloth < 1.5 ? max(smoothstep(0.08, 0.2, abs(position.x) - abs(uShL.x) + 0.12), smoothstep(uHipY + 0.25, uHipY + 0.05, position.y)) : smoothstep(uKnL.y + 0.05, uKnL.y - 0.15, position.y);
    float w = sin(uClothT * 23.0 + position.y * 38.0 + position.x * 21.0) * 0.6 + sin(uClothT * 37.0 + position.z * 45.0 - position.y * 19.0) * 0.4;
    transformed += objectNormal * w * 0.007 * uFlutter * m;
  }`, 'cloth');
  sh.fragmentShader = patchShader(sh.fragmentShader, '#include <common>', '#include <common>\n' + CLOTH_FRAG, 'cloth');
  sh.fragmentShader = patchShader(sh.fragmentShader, '#include <color_fragment>', '#include <color_fragment>\n  clothField(); diffuseColor.rgb *= clothCol * clothAO;', 'cloth');
  sh.fragmentShader = patchShader(sh.fragmentShader, '#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  if (clothRough > 0.0) roughnessFactor = clothRough;', 'cloth');
  sh.fragmentShader = patchShader(sh.fragmentShader, '#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n  if (vCloth > 0.5) normal = clothBump(normal, clothH);', 'cloth');
}

export function humanMaterial(U, o = {}) {
  const { cloth, ...mo } = o;
  const m = new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.8, metalness: 0 }, mo));
  m.userData.grainU = { value: new THREE.Vector3(0.25, 0.35, 2.2) };
  m.userData.U = U;
  m.onBeforeCompile = sh => {
    grainHook.call(m, sh);
    Object.assign(sh.uniforms, U);
    sh.vertexShader = patchShader(sh.vertexShader, '#include <common>', '#include <common>\n' + (cloth ? CLOTH_VERT_DECL : 'attribute float aTint;\nvarying float vTint;'), 'human');
    sh.vertexShader = patchShader(sh.vertexShader, '#include <begin_vertex>', '#include <begin_vertex>\n  vTint = aTint;', 'human');
    sh.fragmentShader = patchShader(sh.fragmentShader, '#include <common>', '#include <common>\nuniform vec3 uJacket;\nuniform vec3 uSkinTone;\nuniform vec3 uHelmet;\nuniform vec3 uBeanie;\nuniform float uShade;\nvarying float vTint;', 'human');
    sh.fragmentShader = patchShader(sh.fragmentShader, '#include <color_fragment>', `#include <color_fragment>
  if ( vTint > 0.5 && vTint < 1.5 ) diffuseColor.rgb *= pow( uJacket, vec3( 2.2 ) );     // jacket panels take the skier's colour (display -> linear)
  else if ( vTint > 1.5 && vTint < 2.5 ) diffuseColor.rgb *= pow( uSkinTone, vec3( 2.2 ) ); // skin tone
  else if ( vTint > 2.5 && vTint < 3.5 ) diffuseColor.rgb *= pow( uHelmet, vec3( 2.2 ) );   // helmet shell
  else if ( vTint > 3.5 ) diffuseColor.rgb *= pow( uBeanie, vec3( 2.2 ) );                 // knitted beanie
  diffuseColor.rgb *= uShade;`, 'human');
    if (cloth) clothHook(sh);
  };
  if (cloth) m.customProgramCacheKey = () => 'human-cloth';
  return m;
}

export function makeHuman(kind, o = {}) {
  const src = BLEND.humans && BLEND.humans.getObjectByName(kind + '_rig'); if (!src) return null;
  const root = cloneSkinned(src), bones = {}; let mesh = null;
  // the loader suffixes duplicate node names (the second character's bones become 'thigh_l_1'): map them back
  const known = n => n === 'pelvis' || n === 'head' || /^(spine_0[123]|neck_01|(clavicle|upperarm|lowerarm|hand|thigh|calf|foot)_[lr])$/.test(n);
  const parts = {};
  root.traverse(x => { if (x.isBone) { const n = known(x.name) ? x.name : x.name.replace(/_\d+$/, ''); if (known(n)) bones[n] = x; } if (x.isSkinnedMesh) { const p = x.name === kind ? 'body' : x.name.slice(kind.length + 1); parts[p] = x; if (p === 'body') mesh = x; } });
  if (!mesh) return null;
  const U = humanUniforms(o.skin || '#ffffff', o.jacket || '#c7302a', o.shade), skinTex = BLEND.tex[kind === 'hm_female' ? 'skin_female' : 'skin_male'];
  const MAT = { body: { roughness: 0.8, cloth: true }, face: { map: skinTex || null, roughness: 0.66 }, helmet: { roughness: 0.32 }, goggles: { roughness: 0.18, metalness: 0.2 }, beanie: { roughness: 0.96 }, pompom: { roughness: 1 }, eyes: { roughness: 0.12 } };
  for (const [p, m] of Object.entries(parts)) {
    if (!m.geometry.userData.prepped) {   // once per source geometry: display-space colours, tint attribute
      const g = m.geometry, c = g.getAttribute('color');
      if (c) { const out = new Float32Array(c.count * 3); for (let i = 0; i < c.count; i++) { out[i * 3] = Math.pow(c.getX(i), 1 / 2.2); out[i * 3 + 1] = Math.pow(c.getY(i), 1 / 2.2); out[i * 3 + 2] = Math.pow(c.getZ(i), 1 / 2.2); } g.setAttribute('color', new THREE.BufferAttribute(out, 3)); }
      const t = g.getAttribute('_tint'); g.setAttribute('aTint', t || new THREE.BufferAttribute(new Float32Array(g.attributes.position.count), 1)); if (t) g.deleteAttribute('_tint');
      g.userData.prepped = true;
    }
    m.material = humanMaterial(U, MAT[p] || {}); m.castShadow = p !== 'eyes'; m.receiveShadow = true; m.frustumCulled = false;
  }
  root.position.set(0, 0, 0); root.quaternion.identity(); root.updateMatrixWorld(true);
  const rest = {};
  for (const [n, b] of Object.entries(bones)) {
    const q = b.getWorldQuaternion(new THREE.Quaternion()), p = b.getWorldPosition(new V3()), qi = q.clone().invert();
    const ch = bones[H_CHILD[n]], dir = ch ? ch.getWorldPosition(new V3()).sub(p).normalize() : new V3(0, 1, 0).applyQuaternion(q);
    const upRef = Math.abs(dir.z) > 0.7;   // bones along the forward axis (feet) take "up" as their twist reference
    rest[n] = { aDir: dir.clone().applyQuaternion(qi), aRef: (upRef ? new V3(0, 1, 0) : new V3(0, 0, 1)).applyQuaternion(qi), upRef, len: ch ? ch.getWorldPosition(new V3()).distanceTo(p) : 0, pos: p };
  }
  const hipMid = rest.thigh_l.pos.clone().add(rest.thigh_r.pos).multiplyScalar(0.5);
  // the cloth patterns are anchored on the joints of the rest pose (mesh space = root space at bind)
  for (const [u, b] of [['uShL', 'upperarm_l'], ['uShR', 'upperarm_r'], ['uElL', 'lowerarm_l'], ['uElR', 'lowerarm_r'], ['uWrL', 'hand_l'], ['uWrR', 'hand_r'], ['uKnL', 'calf_l'], ['uKnR', 'calf_r'], ['uAnL', 'foot_l'], ['uAnR', 'foot_r']]) if (rest[b]) U[u].value.copy(rest[b].pos);
  U.uHipY.value = hipMid.y;
  const face = parts.face, md = face && face.morphTargetDictionary;
  for (const b of Object.values(bones)) b.userData.rest = { q: b.quaternion.clone(), p: b.position.clone() };
  const H = { root, mesh, bones, rest, kind, parts, U, hipOff: hipMid.sub(rest.pelvis.pos), scale: 1,
    face: face && md ? { m: face, idx: md, cur: { blink: 0, smile: 0, open: 0, brows: 0, squint: 0 }, blinkT: 9, next: 1 + Math.random() * 3, talk: 0 } : null };
  setGear(H, o.gear || 'helmet');
  scene.add(root);
  return H;
}

// faces: random blinks (sometimes doubled), expressions eased towards a mood, a moving jaw when talking.
// Morphs come from MakeHuman's expression units (blender/humans.py: blink, smile, open, brows, squint).
export function animateFace(H, dt, mood) {
  const F = H.face; if (!F) return;
  F.blinkT += dt;
  if (F.blinkT > F.next) { F.blinkT = 0; F.next = (Math.random() < 0.15 ? 0.25 : 2.2 + Math.random() * 4); }
  const t = F.blinkT, blink = t < 0.07 ? t / 0.07 : t < 0.19 ? 1 - (t - 0.07) / 0.12 : 0;
  const k = 1 - Math.exp(-dt * 5);
  for (const n of ['smile', 'brows', 'squint']) F.cur[n] += ((mood[n] || 0) - F.cur[n]) * k;
  F.talk = mood.talk ? F.talk + dt : 0;
  const jaw = mood.talk ? 0.18 + 0.32 * Math.abs(Math.sin(F.talk * 9.5) * Math.sin(F.talk * 3.1 + 1)) : 0;
  F.cur.open += (jaw - F.cur.open) * (1 - Math.exp(-dt * 18));
  F.cur.blink = Math.max(blink, F.cur.squint * 0.25);
  const inf = F.m.morphTargetInfluences;
  for (const [n, i] of Object.entries(F.idx)) inf[i] = Math.min(1, (faceHold && n in faceHold ? faceHold[n] : F.cur[n]) || 0);
}

   // test hook (window.__ski.faceHold): pins expressions for stills
// skiers wear helmet and goggles; people in town a beanie (eyes visible)
export function setGear(H, g) {
  if (H.gear === g) return; H.gear = g;
  const P = H.parts, hel = g === 'helmet';
  for (const k of ['helmet', 'goggles']) if (P[k]) P[k].visible = hel;
  for (const k of ['beanie', 'pompom', 'eyes']) if (P[k]) P[k].visible = !hel;
}

// aim one bone: world rotation mapping its rest (direction, reference) frame onto the target (direction, reference)
export function aimBone(H, name, dir, ref) {
  const b = H.bones[name], R = H.rest[name]; if (!b) return;
  humanBasis(_hm1, dir, ref); humanBasis(_hm2, R.aDir, R.aRef).transpose(); _hm1.multiply(_hm2);
  _hq1.setFromRotationMatrix(_hm1);
  b.parent.getWorldQuaternion(_hq2); b.quaternion.copy(_hq2.invert().multiply(_hq1));
  b.updateWorldMatrix(false, false);
}

// J: world-space joints { hipMid, up (pelvis), fwd, spineUp, spineFwd, headUp, headFwd, hip[2], knee[2], ankle[2], kneeFwd[2], footFwd[2], footUp[2], sh[2], el[2], hand[2], armFwd[2], handDir[2], handFwd[2] } (index 0 = left)
export function poseHuman(H, J) {
  const b = H.bones, root = H.root;
  root.position.copy(J.hipMid); root.quaternion.identity(); root.scale.setScalar(H.scale); root.updateMatrixWorld(true);
  aimBone(H, 'pelvis', J.up, J.fwd);
  // put the pelvis where the solved hips are (one rigid correction)
  b.pelvis.updateWorldMatrix(true, false);
  const tl = b.thigh_l.getWorldPosition(_hv[0]), tr = b.thigh_r.getWorldPosition(_hv[1]); tl.add(tr).multiplyScalar(0.5);
  _hv[2].subVectors(J.hipMid, tl); b.pelvis.parent.worldToLocal(_hv[2].add(b.pelvis.getWorldPosition(_hv[1]))); b.pelvis.position.copy(_hv[2]); b.pelvis.updateWorldMatrix(false, true);
  _hv[0].copy(J.up).lerp(J.spineUp, 0.35); aimBone(H, 'spine_01', _hv[0], J.spineFwd);
  _hv[0].copy(J.up).lerp(J.spineUp, 0.7); aimBone(H, 'spine_02', _hv[0], J.spineFwd);
  aimBone(H, 'spine_03', J.spineUp, J.spineFwd);
  for (const n of ['clavicle_l', 'clavicle_r']) if (b[n]) b[n].updateWorldMatrix(false, false);
  _hv[0].copy(J.spineUp).lerp(J.headUp, 0.5); aimBone(H, 'neck_01', _hv[0], J.headFwd);
  aimBone(H, 'head', J.headUp, J.headFwd);
  ['l', 'r'].forEach((s, i) => {
    if (b['clavicle_' + s]) b['clavicle_' + s].updateWorldMatrix(false, false);
    aimBone(H, 'upperarm_' + s, _hv[0].subVectors(J.el[i], J.sh[i]), J.armFwd[i]);
    aimBone(H, 'lowerarm_' + s, _hv[0].subVectors(J.hand[i], J.el[i]), J.foreFwd[i]);
    aimBone(H, 'hand_' + s, J.handDir[i], J.handFwd[i]);
    aimBone(H, 'thigh_' + s, _hv[0].subVectors(J.knee[i], J.hip[i]), J.thighFwd[i]);
    aimBone(H, 'calf_' + s, _hv[0].subVectors(J.ankle[i], J.knee[i]), J.kneeFwd[i]);
    if (H.rest['foot_' + s]) aimBone(H, 'foot_' + s, _hv[0].copy(J.footFwd[i]).addScaledVector(J.footUp[i], -0.35), J.footUp[i]);
  });
  let broken = !Number.isFinite(root.position.x + root.position.y + root.position.z);
  for (const bn of Object.values(b)) { const q = bn.quaternion, p = bn.position; if (!Number.isFinite(q.x + q.y + q.z + q.w + p.x + p.y + p.z)) { broken = true; q.copy(bn.userData.rest.q); p.copy(bn.userData.rest.p); } }
  if (broken) { if (!Number.isFinite(root.position.x + root.position.y + root.position.z)) root.position.set(0, -1000, 0); root.updateMatrixWorld(true); }
}

export function newJoints() { const v = () => new V3(), p = () => [v(), v()]; return { hipMid: v(), up: v(), fwd: v(), spineUp: v(), spineFwd: v(), headUp: v(), headFwd: v(), hip: p(), knee: p(), ankle: p(), thighFwd: p(), kneeFwd: p(), footFwd: p(), footUp: p(), sh: p(), el: p(), hand: p(), armFwd: p(), foreFwd: p(), handDir: p(), handFwd: p() }; }

export function playerHumanSync(dt = 1 / 60) {
  const S = skier, H = playerHuman, J = playerJ; if (!H) return;
  H.root.visible = S.root.visible;          // hidden inside the gondola cabin, like the rigid rig
  if (!H.root.visible) return;
  S.root.updateMatrixWorld(true);
  axisW(S.pelvis, AXY, J.up); axisW(S.pelvis, AXZ, J.fwd); axisW(S.spine, AXY, J.spineUp); axisW(S.spine, AXZ, J.spineFwd); axisW(S.head, AXY, J.headUp); axisW(S.head, AXZ, J.headFwd);
  S.legs.forEach((L, k) => {
    const i = L.foot.sd > 0 ? 0 : 1;
    L.thigh.getWorldPosition(J.hip[i]); L.knee.getWorldPosition(J.knee[i]); J.ankle[i].set(0, 0.2, -0.02).applyMatrix4(L.foot.g.matrixWorld);
    axisW(L.thigh, AXZ, J.thighFwd[i]); axisW(L.knee, AXZ, J.kneeFwd[i]); axisW(L.foot.g, AXZ, J.footFwd[i]); axisW(L.foot.g, AXY, J.footUp[i]);
  });
  J.hipMid.copy(J.hip[0]).add(J.hip[1]).multiplyScalar(0.5);
  S.arms.forEach(A => {
    const i = A.sd > 0 ? 0 : 1;
    A.sh.getWorldPosition(J.sh[i]); A.el.getWorldPosition(J.el[i]); A.hand.getWorldPosition(J.hand[i]);
    axisW(A.sh, AXZ, J.armFwd[i]); axisW(A.el, AXZ, J.foreFwd[i]); axisW(A.hand, AXNY, J.handDir[i]); axisW(A.hand, AXZ, J.handFwd[i]);
  });
  poseHuman(H, J);
}

// swap the player's rigid body for the realistic one; skis, boots and poles stay
export function initPlayerHuman() {
  const H = makeHuman('hm_male', { jacket: '#c7302a', skin: '#ffffff', shade: skierShade, gear: 'helmet' }); if (!H) return;
  H.U.uHelmet.value.set('#f2f3f5');
  const R = H.rest, S = skier;
  H.scale = 0.87 / (R.thigh_l.len + R.calf_l.len);
  // the rigid rig adopts the body's arm and shoulder proportions, so hands and poles meet the gloves
  S.arms.forEach(A => { const s = A.sd > 0 ? 'l' : 'r'; A.el.position.y = -R['upperarm_' + s].len * H.scale; A.hand.position.y = -R['lowerarm_' + s].len * H.scale; A.sh.position.x = A.sd * Math.abs(R.upperarm_l.pos.x - R.upperarm_r.pos.x) / 2 * H.scale; A.pole.position.y = -0.075 * H.scale; });   // grip inside the fist
  const keep = new Set(); S.feet.forEach(f => f.g.traverse(o => keep.add(o))); S.arms.forEach(A => A.pole.traverse(o => keep.add(o)));
  S.root.traverse(o => { if (o.isMesh && !keep.has(o)) o.visible = false; });
  playerHuman = H;
}

export function buildSkier() {
  const root = new THREE.Group(), base = new THREE.Group(); base.position.y = -0.95; root.add(base);
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  SKI_GEO = makeSkiGeo(); SKI_MAT = skMat('#ffffff', 80); SKI_MAT.vertexColors = true; SKI_MAT.side = THREE.DoubleSide;
  const quilt = fabricTex(301, true), weave = fabricTex(302, false);
  const JACKET = skMat('#c8321f', 14, quilt), YOKE = skMat('#eeeae2', 14, weave), PANTS = skMat('#24314f', 10, weave), DARK = skMat('#1a1d24', 20),
    BOOT = skMat('#2c3340', 60), BUCKLE = skMat('#c7ccd3', 90), HELM = skMat('#f2f4f7', 80),
    GOG = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, '#2b1f6b'); gr.addColorStop(0.45, '#d14a2b'); gr.addColorStop(0.7, '#ffb21f'); gr.addColorStop(1, '#ffe08a'); g.fillStyle = gr; g.fillRect(0, 0, 64, 32); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(6, 4, 22, 3); g.fillRect(36, 6, 12, 2); const m = skMat('#ffffff', 200, colorCanvasTex(c)); m.specular = new THREE.Color('#ffffff'); return m; })(), GOGF = skMat('#20242c', 30), SKIN = skMat('#d6a37f'), BUFF = skMat('#2f4d6b', 6, weave), POLE = skMat('#c9ced6', 90), GLOVE = skMat('#22252c', 25);
  // Blender clothing parts (blender/people.py) replace the turned shapes when available: same joint frames,
  // vertex colours carry the baked folds and baffles, so each material gets a vertex-colour twin
  const vcTwin = new Map(), BP = (name, geo, mat) => {
    const g = BLEND.geo[name]; if (!g) return [geo, mat];
    if (!vcTwin.has(mat)) { const c = mat.clone(); c.vertexColors = true; c.onBeforeCompile = mat.onBeforeCompile; if (g.getAttribute('aFlutter')) c.defines = { USE_FLUTTER: '' }; vcTwin.set(mat, c); }
    return [g, vcTwin.get(mat)];
  };
  // skis and boots
  const feet = [1, -1].map(sd => {
    const g = new THREE.Group(); g.rotation.order = 'YXZ'; base.add(g);
    mesh(SKI_GEO, SKI_MAT, g, 0, 0, 0);
    mesh(new THREE.BoxGeometry(0.07, 0.04, 0.12), DARK, g, 0, 0.038, 0.17); mesh(new THREE.BoxGeometry(0.07, 0.05, 0.1), DARK, g, 0, 0.042, -0.16);
    { const A = new Assembly(sd > 0 ? 501 : 502); A.put('cap', 'wood', 0, 0.045, 0.24, Z1, X1, _ay, 0.06, 0.05, 0.05, C_('#c8ccd2')); A.put('box', 'wood', 0, 0.06, 0.2, X1, _ay, Z1, 0.08, 0.025, 0.06, C_('#e0393e'));
      A.put('box', 'wood', 0, 0.07, -0.2, X1, _ay, Z1, 0.08, 0.06, 0.08, C_('#c8ccd2')); A.put('box', 'wood', 0, 0.1, -0.22, X1, _ay, Z1, 0.05, 0.02, 0.12, C_('#e0393e'));
      for (const x of [-0.055, 0.055]) A.put('box', 'wood', x, 0.025, -0.14, X1, _ay, Z1, 0.012, 0.012, 0.14, C_('#9aa3ae'));
      A.put('box', 'wood', 0, 0.026, 0.0, X1, _ay, Z1, 0.07, 0.008, 0.3, C_('#3a3f46'));
      const bm = mesh(A.toGeometry(), skMatVC(), g); bm.userData.ski = true; }
    const shell = mesh(lathe([[0, 0], [0.06, 0.005], [0.062, 0.07], [0.05, 0.1], [0, 0.1]], 12), BOOT, g, 0, 0.035, 0.03); shell.scale.set(1, 1, 2.45);
    const cuff = mesh(lathe([[0, 0], [0.072, 0], [0.074, 0.12], [0.068, 0.22], [0, 0.22]], 14), BOOT, g, 0, 0.08, -0.03); cuff.rotation.x = 0.2; cuff.scale.z = 1.15;
    for (const y of [0.13, 0.2, 0.26]) mesh(new THREE.BoxGeometry(0.12, 0.016, 0.03), BUCKLE, g, 0, y, 0.06 - y * 0.12);
    { const A = new Assembly(sd > 0 ? 511 : 512);
      for (const [y, z] of [[0.1, 0.13], [0.15, 0.06], [0.21, 0.04], [0.27, 0.01]]) { const v = new V3(0, Math.cos(0.5), Math.sin(0.5)); A.put('box', 'wood', -sd * 0.07, y, z, X1, v, new V3().crossVectors(X1, v), 0.012, 0.05, 0.016, C_('#c7ccd3')); }
      A.put('disc', 'wood', 0, 0.3, -0.03, X1, _ay, Z1, 0.155, 0.04, 0.17, C_('#151820'));
      A.put('box', 'wood', 0, 0.035, 0.18, X1, _ay, Z1, 0.08, 0.025, 0.05, C_('#151820')); A.put('box', 'wood', 0, 0.035, -0.13, X1, _ay, Z1, 0.08, 0.025, 0.05, C_('#151820'));
      A.put('box', 'wood', sd * 0.06, 0.16, -0.06, X1, _ay, Z1, 0.004, 0.12, 0.12, C_('#e0393e'));
      mesh(A.toGeometry(), skMatVC(), g); }
    return { g, sd };
  });
  // pelvis + legs (ski pants: full thighs, flared over the boots)
  const pelvis = new THREE.Group(); pelvis.rotation.order = 'YXZ'; base.add(pelvis);
  const hips = mesh(...BP('sk_hips', lathe([[0, -0.1], [0.12, -0.09], [0.165, -0.02], [0.17, 0.06], [0.155, 0.12], [0, 0.12]], 16), PANTS), pelvis); if (!BLEND.geo.sk_hips) hips.scale.z = 0.72;
  const legs = feet.map(f => {
    const hip = new THREE.Group(); hip.position.set(f.sd * 0.095, -0.05, 0); pelvis.add(hip);
    const thigh = new THREE.Group(); hip.add(thigh);
    mesh(...BP('sk_thigh', lathe([[0, 0.04], [0.08, 0.03], [0.088, -0.08], [0.08, -0.25], [0.066, -0.42], [0.06, -0.47], [0, -0.47]], 22), PANTS), thigh);
    { const A = new Assembly(f.sd > 0 ? 521 : 522); A.put('box', 'wood', f.sd * 0.083, -0.22, 0.0, X1, _ay, Z1, 0.03, 0.15, 0.11, C_('#1d2840')); A.put('box', 'wood', f.sd * 0.09, -0.15, 0.0, X1, _ay, Z1, 0.012, 0.012, 0.11, C_('#3a4560')); A.put('box', 'wood', 0, -0.25, 0.078, X1, _ay, Z1, 0.004, 0.42, 0.004, C_('#3a4560')); mesh(A.toGeometry(), skMatVC(), thigh); }
    const knee = new THREE.Group(); knee.position.y = -0.45; thigh.add(knee);
    mesh(new THREE.SphereGeometry(0.066, 12, 10), PANTS, knee, 0, 0, 0.008);
    mesh(...BP('sk_shin', lathe([[0, 0.02], [0.064, 0.0], [0.06, -0.12], [0.058, -0.3], [0.07, -0.38], [0.082, -0.43], [0, -0.43]], 22), PANTS), knee);
    { const A = new Assembly(f.sd > 0 ? 531 : 532); for (const y of [-0.02, -0.05]) A.put('box', 'wood', 0, y, 0.062, X1, _ay, Z1, 0.07, 0.006, 0.006, C_('#3a4560')); A.put('ring', 'wood', 0, -0.41, 0, X1, NZ, _ay, 0.165, 0.165, 2, C_('#151820')); mesh(A.toGeometry(), skMatVC(), knee); }
    return { hip, thigh, knee, foot: f, off: new V3(f.sd * 0.095, -0.05, 0) };
  });
  // torso: insulated jacket over the hips, chest wider than waist
  const spine = new THREE.Group(); spine.rotation.order = 'YXZ'; spine.position.y = 0.05; pelvis.add(spine);
  const jacket = mesh(...BP('sk_jacket', lathe([[0, -0.17], [0.175, -0.16], [0.18, -0.05], [0.168, 0.1], [0.19, 0.26], [0.205, 0.38], [0.2, 0.47], [0.16, 0.54], [0.09, 0.58], [0, 0.585]], 28), JACKET), spine); if (!BLEND.geo.sk_jacket) jacket.scale.z = 0.7;
  const yoke = mesh(...BP('sk_yoke', lathe([[0.204, 0.4], [0.2, 0.47], [0.16, 0.54], [0.09, 0.58], [0, 0.585]], 20), YOKE), spine); if (!BLEND.geo.sk_yoke) yoke.scale.set(1.012, 1.004, 0.712);
  mesh(new THREE.BoxGeometry(0.012, 0.66, 0.012), DARK, spine, 0, 0.2, 0.143);                     // zip
  for (const sd of [-1, 1]) { const pk = mesh(new THREE.BoxGeometry(0.11, 0.012, 0.02), DARK, spine, sd * 0.1, 0.06, 0.125); pk.rotation.z = sd * 0.25; }
  const collar = mesh(lathe([[0.085, 0], [0.09, 0.08], [0.08, 0.1], [0, 0.1]], 16), BUFF, spine, 0, 0.56, 0); collar.scale.z = 0.95;
  mesh(new THREE.BoxGeometry(0.25, 0.32, 0.1), DARK, spine, 0, 0.3, -0.155);                       // back protector pack
  { const A = new Assembly(541);
    A.put('ball', 'wood', 0, 0.55, -0.12, X1, _ay, Z1, 0.27, 0.15, 0.14, C_('#b22b1a'));                                         // hood, folded
    A.put('ring', 'wood', 0, -0.16, 0, X1, NZ, _ay, 0.36, 0.25, 3, C_('#151820'));                                               // hem band
    A.put('box', 'wood', 0.09, 0.36, 0.143, X1, _ay, Z1, 0.1, 0.008, 0.006, C_('#151820')); A.put('box', 'wood', 0.14, 0.36, 0.145, X1, _ay, Z1, 0.012, 0.03, 0.01, C_('#c7ccd3'));   // chest pocket zip
    A.put('box', 'wood', 0, 0.48, 0.14, X1, _ay, Z1, 0.014, 0.03, 0.012, C_('#c7ccd3'));                                         // zip pull
    for (const sd of [-1, 1]) { const v = new V3(sd * 0.15, 1, 0.25).normalize(); A.put('box', 'wood', sd * 0.1, 0.42, 0.125, X1, v, new V3().crossVectors(X1, v), 0.045, 0.3, 0.012, C_('#151820')); A.put('box', 'wood', sd * 0.1, 0.54, -0.04, X1, _ay, Z1, 0.045, 0.012, 0.3, C_('#151820')); }   // pack straps
    A.put('box', 'wood', -0.19, 0.3, 0.0, X1, _ay, Z1, 0.004, 0.06, 0.18, C_('#f2efe8'));                                         // reflective strip
    mesh(A.toGeometry(), skMatVC(), spine); }
  const neck = new THREE.Group(); neck.position.y = 0.62; spine.add(neck);
  const head = new THREE.Group(); head.position.y = 0.1; neck.add(head);
  // head: helmet, goggles with frame and strap, neck gaiter over the chin (all a skier shows of the face)
  const face = mesh(new THREE.SphereGeometry(0.098, 18, 14), SKIN, head, 0, -0.01, 0.005); face.scale.set(0.92, 1.1, 1);
  mesh(new THREE.SphereGeometry(0.02, 8, 6), SKIN, head, 0, -0.025, 0.1);                          // nose
  const gaiter = mesh(lathe([[0.088, -0.12], [0.1, -0.05], [0.098, -0.015], [0, -0.015]], 16), BUFF, head, 0, 0, 0.004); gaiter.scale.z = 1.06;
  { const hm = mesh(...BP('sk_helmet', new THREE.SphereGeometry(0.128, 18, 12, 0, Math.PI * 2, 0, Math.PI / 1.8), HELM), head, 0, 0.012, -0.008); if (BLEND.geo.sk_helmet) hm.position.set(0, 0, 0); }   // Blender shell has its offset built in
  for (let k = -1; k <= 1; k++) mesh(new THREE.BoxGeometry(0.012, 0.02, 0.09), DARK, head, k * 0.04, 0.128, -0.01);   // vents
  mesh(new THREE.CylinderGeometry(0.124, 0.124, 0.074, 18, 1, true, -1.15, 2.3), GOGF, head, 0, 0.012, 0);
  mesh(new THREE.CylinderGeometry(0.127, 0.127, 0.058, 18, 1, true, -1.05, 2.1), GOG, head, 0, 0.012, 0);
  const strap = mesh(new THREE.TorusGeometry(0.126, 0.013, 4, 24), DARK, head, 0, 0.012, 0); strap.rotation.x = Math.PI / 2;
  { const A = new Assembly(551);
    for (const sd of [-1, 1]) { A.put('ball', 'wood', sd * 0.118, -0.02, -0.01, X1, _ay, Z1, 0.04, 0.08, 0.075, C_('#151820')); const a = v3(sd * 0.11, -0.05, 0.0), b = v3(sd * 0.03, -0.13, 0.05); const d = new V3().subVectors(b, a), ax = axesAlong(d, {}); A.put('box', 'wood', a.x, a.y, a.z, ax.u, ax.v, ax.n, 0.012, d.length() * 2, 0.004, C_('#151820')); }
    for (const x of [-0.035, 0.035]) A.put('box', 'wood', x, 0.13, -0.02, X1, _ay, Z1, 0.012, 0.012, 0.2, C_('#e0393e'));
    A.put('box', 'wood', 0, 0.075, 0.115, X1, _ay, Z1, 0.24, 0.016, 0.04, C_('#151820'));                                       // goggle foam top
    mesh(A.toGeometry(), skMatVC(), head); }
  // arms: puffy sleeves, gloves with a thumb, poles
  const arms = [1, -1].map(sd => {
    const sh = new THREE.Group(); sh.position.set(sd * 0.2, 0.49, 0); sh.rotation.order = 'ZXY'; spine.add(sh);
    mesh(new THREE.SphereGeometry(0.07, 12, 10), JACKET, sh);
    mesh(...BP('sk_upperarm', lathe([[0, 0.02], [0.064, 0.01], [0.066, -0.1], [0.058, -0.26], [0.052, -0.3], [0, -0.3]], 20), JACKET), sh);
    const el = new THREE.Group(); el.position.y = -0.29; sh.add(el);
    mesh(new THREE.SphereGeometry(0.052, 10, 8), JACKET, el);
    mesh(...BP('sk_forearm', lathe([[0, 0.01], [0.053, 0], [0.052, -0.12], [0.046, -0.22], [0.056, -0.25], [0, -0.25]], 20), JACKET), el);
    { const A = new Assembly(sd > 0 ? 571 : 572); A.put('ring', 'wood', 0, -0.24, 0, X1, NZ, _ay, 0.115, 0.115, 3, C_('#151820')); if (sd > 0) A.put('box', 'wood', 0.05, -0.1, 0.0, X1, _ay, Z1, 0.006, 0.07, 0.05, C_('#f2efe8')); mesh(A.toGeometry(), skMatVC(), el); }   // cuff, ski pass
    const hand = new THREE.Group(); hand.position.y = -0.27; el.add(hand);
    mesh(lathe([[0, 0.03], [0.052, 0.03], [0.05, -0.01], [0, -0.01]], 10), GLOVE, hand, 0, 0.02, 0);      // gauntlet cuff
    { const A = new Assembly(sd > 0 ? 561 : 562), GL = C_('#22252c');
      A.put('ball', 'wood', sd * 0.012, -0.03, -0.012, X1, _ay, Z1, 0.07, 0.1, 0.06, GL);                                         // palm and back of the hand
      for (let k = 0; k < 4; k++) { const y = -0.005 - k * 0.022; limb(A, 'wood', v3(sd * 0.03, y, -0.02), v3(sd * 0.022, y - 0.004, 0.035), 0.012, GL); limb(A, 'wood', v3(sd * 0.022, y - 0.004, 0.035), v3(-sd * 0.012, y - 0.006, 0.03), 0.011, GL); }   // fingers round the grip
      limb(A, 'wood', v3(-sd * 0.025, 0.0, 0.0), v3(-sd * 0.02, -0.02, 0.04), 0.013, GL); limb(A, 'wood', v3(-sd * 0.02, -0.02, 0.04), v3(sd * 0.005, -0.03, 0.045), 0.012, GL);   // thumb
      A.put('box', 'wood', 0, 0.035, 0, X1, _ay, Z1, 0.11, 0.022, 0.095, C_('#e0393e'));                                          // cuff strap
      A.put('ring', 'wood', 0, -0.03, -0.035, X1, _ay, Z1, 0.07, 0.11, 2, C_('#3a3f46'));                                         // pole strap
      mesh(A.toGeometry(), skMatVC(), hand); }
    const pole = new THREE.Group(); hand.add(pole);
    mesh(new THREE.CylinderGeometry(0.0105, 0.008, 1.14, 6), POLE, pole, 0, -0.57, 0);
    mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.01, 12), DARK, pole, 0, -1.04, 0);
    { const A = new Assembly(sd > 0 ? 581 : 582); for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI; A.put('box', 'wood', 0, -1.04, 0, new V3(Math.cos(a), 0, Math.sin(a)), _ay, new V3(-Math.sin(a), 0, Math.cos(a)), 0.1, 0.006, 0.006, C_('#3a3f46')); } A.put('icicle', 'wood', 0, -1.07, 0, X1, _ay, Z1, 0.012, 0.06, 0.012, C_('#c8ccd2')); mesh(A.toGeometry(), skMatVC(), pole); }
    mesh(new THREE.CylinderGeometry(0.02, 0.017, 0.15, 8), DARK, pole, 0, 0.02, 0);
    return { sd, sh, el, hand, pole };
  });
  scene.add(root);
  skier = { root, base, feet, pelvis, legs, spine, head, arms };
}

export function __init_4659() {

/* ---------------- Skier ---------------- */
// Proportions from the 7.5-head adult canon for a 1.78 m skier (1 head ≈ 0.237 m): shoulders ≈ 2 heads wide,
// thigh ≈ 2 heads, shin + foot ≈ 2 heads, shoulder→elbow = elbow→knuckles. Bodies are lathed profiles, not boxes.
skierShade = { value: 1 };
skierTint = { value: new THREE.Color(0, 0, 0) };
skierFlutter = { value: 0 };
skierFTime = { value: 0 };
SKI_GEO = null;
SKI_MAT = null;
lathe = (pts, seg = 18) => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg);
skier = null;
/* ---------------- Realistic skiers: skinned MakeHuman bodies in ski clothing (blender/humans.py) ----------------
   The existing pose solvers stay in charge. Each frame every bone is aimed along the matching limb of the solved
   pose (direction to the next joint, plus a forward reference for the twist), so the same code animates the old
   rigid parts and the skinned bodies. */
H_CHILD = { pelvis: 'spine_01', spine_01: 'spine_02', spine_02: 'spine_03', spine_03: 'neck_01', neck_01: 'head', clavicle_l: 'upperarm_l', clavicle_r: 'upperarm_r', upperarm_l: 'lowerarm_l', upperarm_r: 'lowerarm_r', lowerarm_l: 'hand_l', lowerarm_r: 'hand_r', thigh_l: 'calf_l', thigh_r: 'calf_r', calf_l: 'foot_l', calf_r: 'foot_r' };
_hm1 = new THREE.Matrix4();
_hm2 = new THREE.Matrix4();
_hq1 = new THREE.Quaternion();
_hq2 = new THREE.Quaternion();
_hv = [0, 1, 2, 3, 4, 5].map(() => new V3());
CLOTH_T = { value: 0 };
/* ---- ski clothes that look like fabric (body mesh only). The patterns live in the rest pose of the body, so they
   follow every movement: a quilted down jacket (stitched baffles around the torso and around each arm, rounded
   between the stitches, ripstop nylon, centre zip, satin highlights, creases at the elbows), softshell twill trousers
   (knee creases, accordion folds above the boots, darker scuff guards on the inner ankles, powder caught at the hem),
   leather-grain gloves and boots. Relief is a height field turned into normals with screen-space derivatives; fine
   weaves fade out with distance. At speed the fabric ripples in the wind (vertex shader, after skinning). */
CLOTH_VERT_DECL = `attribute float aTint;
varying float vTint; varying vec3 vRest; varying float vCloth;
uniform float uFlutter; uniform float uClothT; uniform float uHipY; uniform vec3 uKnL; uniform vec3 uKnR; uniform vec3 uShL; uniform vec3 uShR;`;
CLOTH_FRAG = `
uniform vec3 uShL; uniform vec3 uShR; uniform vec3 uElL; uniform vec3 uElR; uniform vec3 uWrL; uniform vec3 uWrR;
uniform vec3 uKnL; uniform vec3 uKnR; uniform vec3 uAnL; uniform vec3 uAnR; uniform float uHipY;
varying vec3 vRest; varying float vCloth;
float cHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float cNoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cHash(i), cHash(i + vec3(1,0,0)), f.x), mix(cHash(i + vec3(0,1,0)), cHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(cHash(i + vec3(0,0,1)), cHash(i + vec3(1,0,1)), f.x), mix(cHash(i + vec3(0,1,1)), cHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float segD(vec3 p, vec3 a, vec3 b, out float t) { vec3 ab = b - a; t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0); return length(p - a - ab * t); }
vec3 clothBump(vec3 n, float h) {   // height (metres) to a perturbed view-space normal (derivative bump)
  vec3 sp = -vViewPosition, sx = dFdx(sp), sy = dFdy(sp), r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1); vec2 dh = vec2(dFdx(h), dFdy(h));
  vec3 g = sign(det) * (dh.x * r1 + dh.y * r2);
  return normalize(abs(det) * n - g);
}
float clothH, clothRough, clothAO; vec3 clothCol;
void clothField() {
  clothH = 0.0; clothRough = -1.0; clothAO = 1.0; clothCol = vec3(1.0);
  vec3 p = vRest; float fine = 1.0 - smoothstep(0.25, 0.9, fwidth(p.y * 220.0));          // weaves vanish at a distance
  if (vCloth < 0.5) return;
  if (vCloth < 1.5) {                                                                        // ---- down jacket
    float tl, tr, tl2, tr2;
    float dl = min(segD(p, uShL, uElL, tl), segD(p, uElL, uWrL, tl2)), dr = min(segD(p, uShR, uElR, tr), segD(p, uElR, uWrR, tr2));
    bool arm = min(dl, dr) < 0.085 && abs(p.x) > abs(uShL.x) - 0.03;
    float coord, around;
    if (arm) { bool L = dl < dr; vec3 s0 = L ? uShL : uShR, e = L ? uElL : uElR, w = L ? uWrL : uWrR; float a = length(e - s0);
      float t1, t2; float d1 = segD(p, s0, e, t1), d2 = segD(p, e, w, t2); coord = d1 < d2 ? t1 * a : a + t2 * length(w - e);
      vec3 ax = normalize(d1 < d2 ? e - s0 : w - e), r = p - (d1 < d2 ? s0 : e); r -= ax * dot(r, ax); around = atan(r.z, r.y);
      // creases on the inside of the elbow, fanning out
      float de = length(p - e); clothH += 0.0018 * smoothstep(0.11, 0.0, de) * sin(coord * 140.0 + around * 3.0) * (0.6 + 0.4 * sin(around * 5.0));
    } else { coord = p.y; around = atan(p.z, p.x); }
    float q = fract(coord / 0.078), puff = pow(max(sin(3.14159 * q), 0.0), 0.55);           // baffles, rounded between the stitches
    clothH += 0.0075 * puff; clothAO = mix(0.62, 1.0, smoothstep(0.0, 0.16, min(q, 1.0 - q)));   // shadowed stitch lines
    clothH += 0.0012 * (cNoise(p * 42.0) - 0.5);                                              // soft irregularity of the down
    float rip = max(step(0.9, fract(p.x * 190.0 + p.z * 190.0)), step(0.9, fract(p.y * 190.0))) * fine;   // ripstop grid
    clothCol *= 1.0 - 0.06 * rip; clothH += 0.00015 * rip;
    if (!arm && abs(p.x) < 0.007 && p.z > 0.0) { clothCol *= 0.35; clothH -= 0.002; clothAO *= 0.8; }   // centre zip
    if (!arm && abs(abs(p.x) - 0.022) < 0.003 && p.z > 0.0) clothAO *= 0.85;                 // storm flap edges
    clothRough = 0.42 + 0.22 * (1.0 - puff);                                                  // satin crowns, duller stitches
  } else if (vCloth < 2.5) {                                                                 // ---- softshell trousers
    float side = p.x > 0.0 ? 1.0 : -1.0; vec3 kn = side > 0.0 ? uKnL : uKnR, an = side > 0.0 ? uAnL : uAnR;
    if (dot(kn, vec3(1.0, 0.0, 0.0)) * side < 0.0) { vec3 t = kn; kn = an; an = t; kn = side > 0.0 ? uKnR : uKnL; an = side > 0.0 ? uAnR : uAnL; }
    clothH += 0.00035 * sin((p.y + p.x * 0.9 + p.z * 0.6) * 620.0) * fine;                 // twill
    clothCol *= 1.0 + 0.05 * sin((p.y + p.x) * 620.0) * fine;
    float kz = exp(-pow((p.y - kn.y) / 0.07, 2.0));                                           // knee creases
    clothH += 0.0035 * kz * sin(p.y * 170.0 + sin(p.x * 55.0 + p.z * 40.0) * 1.6);
    float acc = smoothstep(an.y + 0.02, an.y + 0.07, p.y) * (1.0 - smoothstep(an.y + 0.18, an.y + 0.26, p.y));   // accordion above the boots
    clothH += 0.0045 * acc * sin(p.y * 115.0 + sin(atan(p.z, p.x - an.x) * 3.0) * 1.2);
    clothH += 0.0012 * (cNoise(p * 28.0) - 0.5);
    if (p.y < an.y + 0.2 && abs(p.x) < abs(an.x) - 0.005) clothCol *= 0.62;                 // scuff guards on the inner ankles
    float pw = smoothstep(an.y + 0.22, an.y + 0.02, p.y) * smoothstep(0.55, 0.8, cNoise(p * 60.0));   // powder caught at the hem
    clothCol = mix(clothCol, vec3(3.2), pw * 0.55);
    clothRough = 0.86;
  } else {                                                                                   // ---- gloves and boots
    clothH += 0.0006 * (cNoise(p * 140.0) - 0.5) * fine;
    clothRough = p.y > uHipY ? 0.62 : 0.4;
  }
}`;
faceHold = null;
AXY = new V3(0, 1, 0);
AXZ = new V3(0, 0, 1);
AXNY = new V3(0, -1, 0);
axisW = (o, a, out) => out.copy(a).transformDirection(o.matrixWorld);
playerHuman = null;
 playerJ = newJoints();
}
