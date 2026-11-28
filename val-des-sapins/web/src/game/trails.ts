// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « trails ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { sunAt } from './materials';
import { npcs } from './npcs';
import { SN, snowAt } from './pistes';
import { P } from './player';
import { SUN_DIR, camera, scene } from './render';
import { H } from './terrain';
import { sled } from './vehicles';

export let TRAIL, trailUniforms, TRAIL_MAT, trailsMe, trailsOthers, myTracks;


export function makeTrailBuffer(n) {
  const pos = new Float32Array(n * 12), born = new Float32Array(n * 4).fill(-1e4), shade = new Float32Array(n * 4), side = new Float32Array(n * 4), style = new Float32Array(n * 4), along = new Float32Array(n * 4), idx = new Uint32Array(n * 6);
  const across = new Float32Array(n * 8), lit = new Float32Array(n * 4);   // horizontal across-track direction, baked sun visibility
  for (let q = 0; q < n; q++) { side[q * 4] = -1; side[q * 4 + 1] = 1; side[q * 4 + 2] = -1; side[q * 4 + 3] = 1; idx.set([q * 4, q * 4 + 1, q * 4 + 2, q * 4 + 1, q * 4 + 3, q * 4 + 2], q * 6); }   // counter-clockwise seen from above (front faces up)
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aBorn', new THREE.BufferAttribute(born, 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aShade', new THREE.BufferAttribute(shade, 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aStyle', new THREE.BufferAttribute(style, 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aU', new THREE.BufferAttribute(along, 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aAcross', new THREE.BufferAttribute(across, 2).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aLit', new THREE.BufferAttribute(lit, 1).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  const m = new THREE.Mesh(g, TRAIL_MAT); m.frustumCulled = false; m.renderOrder = 1; scene.add(m);
  return { n, i: 0, g, pos, born, shade, style, along, across, lit, lo: Infinity, hi: -1, wrapped: false };
}

// start corners come from the end of the previous piece (prev), so consecutive pieces share an edge: no overlap on
// turns, which would double the shading and draw a line across the track
export function trailQuad(B, x0, z0, x1, z1, w, shade, t, style, u0, u1, prev) {
  const dx = x1 - x0, dz = z1 - z0, l = Math.hypot(dx, dz) || 1, px = -dz / l * w / 2, pz = dx / l * w / 2, q = B.i;
  const s0 = prev && Math.hypot(prev[0][0] - (x0 - px), prev[0][1] - (z0 - pz)) < w ? prev : [[x0 - px, z0 - pz], [x0 + px, z0 + pz]];
  const P4 = [s0[0], s0[1], [x1 - px, z1 - pz], [x1 + px, z1 + pz]], U = [u0, u0, u1, u1];
  const ax = -dz / l, az = dx / l, sv = sunAt((x0 + x1) / 2, (z0 + z1) / 2);
  for (let k = 0; k < 4; k++) { const [x, z] = P4[k], o = (q * 4 + k) * 3, v = q * 4 + k; B.pos[o] = x; B.pos[o + 1] = H(x, z) + 0.03; B.pos[o + 2] = z; B.born[v] = t; B.shade[v] = shade; B.style[v] = style; B.along[v] = U[k]; B.across[v * 2] = ax; B.across[v * 2 + 1] = az; B.lit[v] = sv; }
  B.lo = Math.min(B.lo, q); B.hi = Math.max(B.hi, q);
  B.i = (q + 1) % B.n; if (B.i === 0) B.wrapped = true;
  return [P4[2], P4[3]];
}

export function flushTrails(B) {
  if (B.hi < 0) return;
  const at = B.g.attributes;
  for (const [name, size] of [['position', 3], ['aBorn', 1], ['aShade', 1], ['aStyle', 1], ['aU', 1], ['aAcross', 2], ['aLit', 1]]) { const a = at[name]; a.addUpdateRange(B.lo * 4 * size, (B.hi - B.lo + 1) * 4 * size); a.needsUpdate = true; }   // ranges accumulate until the next upload (several updates between two renders)
  B.lo = Infinity; B.hi = -1;
}

// one emitter per skier: remembers where each ski last touched the snow and how far it has travelled
export function trackEmitter() { return { lx: null, lz: null, l: null, r: null, u: 0, cm: null, cl: null, cr: null }; }

export function emitSkiTracks(E, B, x, z, yaw, opt, t) {
  // opt: { gap (distance between skis), w (line width), shade, smear (one wide band), step, style }
  const px = Math.cos(yaw), pz = -Math.sin(yaw);
  if (E.lx === null) { E.lx = x; E.lz = z; E.l = [x + px * opt.gap, z + pz * opt.gap]; E.r = [x - px * opt.gap, z - pz * opt.gap]; E.cm = E.cl = E.cr = null; return; }
  const d = Math.hypot(x - E.lx, z - E.lz); if (d < opt.step) return;
  const L = [x + px * opt.gap, z + pz * opt.gap], R = [x - px * opt.gap, z - pz * opt.gap], u0 = E.u, u1 = E.u + d;
  if (opt.smear) { E.cm = trailQuad(B, E.lx, E.lz, x, z, opt.smear, opt.shade, t, opt.style, u0, u1, E.ms === opt.style ? E.cm : null); E.cl = E.cr = null; }
  else { E.cl = trailQuad(B, E.l[0], E.l[1], L[0], L[1], opt.w, opt.shade, t, opt.style, u0, u1, E.ms === opt.style ? E.cl : null); E.cr = trailQuad(B, E.r[0], E.r[1], R[0], R[1], opt.w, opt.shade, t, opt.style, u0 + 0.37, u1 + 0.37, E.ms === opt.style ? E.cr : null); E.cm = null; }
  E.ms = opt.style;
  E.lx = x; E.lz = z; E.l = L; E.r = R; E.u = u1;
}

// what the skis leave in each kind of snow
export function trackStyle(snow, sp, skid, edge) {
  if (snow === SN.POUDREUSE) return { gap: 0, step: 0.35, smear: 0.62 + Math.min(0.35, sp * 0.015) + (skid ? 0.35 : 0), shade: 1.0, style: TRAIL.POWDER };
  if (skid) return { gap: 0, step: 0.4, smear: 0.55 + Math.min(0.6, sp * 0.03), shade: snow === SN.GLACEE ? 0.5 : 0.75, style: snow === SN.BOSSES ? TRAIL.MOGUL : TRAIL.SKID };
  if (snow === SN.TRAFOLLE) return { gap: 0.14, step: 0.4, w: 0.26, shade: 1.0, style: TRAIL.CRUD };
  if (snow === SN.GLACEE) return { gap: 0.12, step: 0.45, w: 0.2, shade: 1.0, style: TRAIL.ICE };
  if (snow === SN.BOSSES) return { gap: 0, step: 0.4, smear: 0.6, shade: 0.85, style: TRAIL.MOGUL };
  if (snow === SN.CULTURE) return { gap: 0.12, step: 0.45, w: Math.abs(edge) > 0.4 ? 0.13 : 0.16, shade: 0.95, style: TRAIL.ARTIFICIAL };
  return { gap: 0.12, step: 0.45, w: Math.abs(edge) > 0.4 ? 0.12 : 0.15, shade: 0.95, style: TRAIL.GROOMED };   // groomed, park
}

export function updateTrails(dt, time) {
  trailUniforms.uTime.value = time;
  if (!trailsMe) { trailsMe = makeTrailBuffer(9000); trailsOthers = makeTrailBuffer(22000); }
  const onSnow = (P.state === 'ski' || P.state === 'sled' || P.state === 'crash') && !P.tunnel;
  if (!onSnow || (P.state === 'sled' && sled.air)) myTracks.lx = null;
  else {
    const sp = P.vel.length();
    if (sp < 0.4 && P.state !== 'sled') { /* standing still: nothing new */ }
    else if (P.state === 'sled') emitSkiTracks(myTracks, trailsMe, P.pos.x, P.pos.z, P.yaw, { gap: 0, step: 0.5, smear: 0.62, shade: 0.8, style: TRAIL.SLED }, time);
    else if (P.state === 'crash') emitSkiTracks(myTracks, trailsMe, P.pos.x, P.pos.z, P.yaw, { gap: 0, step: 0.4, smear: 0.9, shade: 0.8, style: P.snow === SN.POUDREUSE ? TRAIL.POWDER : TRAIL.SKID }, time);
    else emitSkiTracks(myTracks, trailsMe, P.pos.x, P.pos.z, P.yaw, trackStyle(P.snow, sp, P.brake > 0.5 || P.skid > 0.55, P.edge), time);
  }
  // other skiers near the camera, in whatever snow they are on
  for (const n of npcs) {
    if (!n.trk) n.trk = trackEmitter();
    const near = Math.abs(n.x - camera.position.x) + Math.abs(n.z - camera.position.z) < 380;
    if (n.mode !== 'ski' || !near || (n.p.tr && n.s / 4 > n.p.tr[0] - 2 && n.s / 4 < n.p.tr[1] + 2)) { n.trk.lx = null; continue; }
    const o = trackStyle(snowAt(n.x, n.z), n.v || 10, false, n.roll); o.step = Math.max(o.step, 0.9); o.shade *= 0.85;
    if (n.board) { o.smear = Math.max(o.smear || 0, 0.3); o.gap = 0; }   // a board leaves one band
    emitSkiTracks(n.trk, trailsOthers, n.x, n.z, n.yaw, o, time);
  }
  flushTrails(trailsMe); flushTrails(trailsOthers);
}

export function __init_4397() {

/* ---------------- Ski tracks left behind (player, other skiers, snowmobile) ---------------- */
// Ring buffers of thin quads laid on the snow; each quad remembers when it was drawn and fades out.
/* Track styles, chosen from the snow under each ski (the shader draws each one from the across/along coordinates):
   0 groomed  : two crisp grooves cut into the corduroy, a thin bright lip on each edge
   1 powder   : one deep trench for both skis, blue-shadowed floor, bright crumbly walls, ragged edges; lasts longer
   2 crud     : chunky broken tracks through the tracked-out snow, clods along the edges
   3 ice      : faint pale scrapes, several fine scratch lines, no groove
   4 artificial snow : grooves like the groomed piste but grainy
   5 skid     : a wide scraped band, streaks along the slide, slightly brighter at its rim
   6 snowmobile: a wide tread with cleat bars across
   7 moguls   : short skid marks on the bump faces */
TRAIL = { GROOMED: 0, POWDER: 1, CRUD: 2, ICE: 3, ARTIFICIAL: 4, SKID: 5, SLED: 6, MOGUL: 7 };
trailUniforms = { uTime: { value: 0 }, uFade: { value: 240 } };
/* Tracks are shaded as relief, not painted: each style defines a height profile across (and for the tread, along) the
   track; the shader turns its slope into a surface normal and lights it with the real sun and the sky. Walls facing
   away from the sun fall into the blue shade of sky-lit snow, walls facing it and the lips brighten, the floor of a
   deep furrow gets a little occlusion. Nothing is drawn darker than snow in shade. */
TRAIL_MAT = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, fog: false,
  uniforms: Object.assign(trailUniforms, { uSun: { value: SUN_DIR } }),
  vertexShader: `attribute float aBorn; attribute float aShade; attribute float aSide; attribute float aStyle; attribute float aU; attribute vec2 aAcross; attribute float aLit;
    uniform float uTime; uniform float uFade; varying float vA; varying float vS; varying float vU; varying float vStyle; varying vec2 vAcross; varying float vLit;
    void main() {
      float life = aStyle > 0.5 && aStyle < 1.5 ? uFade * 2.0 : aStyle > 2.5 && aStyle < 3.5 ? uFade * 0.5 : uFade;   // powder lasts, ice scratches fade fast
      float age = uTime - aBorn; vA = aShade * (1.0 - smoothstep(life * 0.5, life, age)) * step(0.0, age);
      vec4 mv = modelViewMatrix * vec4(position, 1.0); vA *= 1.0 - smoothstep(140.0, 320.0, -mv.z);
      vS = aSide; vU = aU; vStyle = aStyle; vAcross = aAcross; vLit = aLit; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uSun; varying float vA; varying float vS; varying float vU; varying float vStyle; varying vec2 vAcross; varying float vLit;
    float h1(float x) { return fract(sin(x * 127.1) * 43758.5453); }
    float n1(float x) { float i = floor(x), f = fract(x); return mix(h1(i), h1(i + 1.0), f * f * (3.0 - 2.0 * f)); }
    // groove: floor below, raised lip at the edge; returns (height, d height / d s), s in -1..1 across
    vec2 groove(float s, float core, float lip) {
      float a = abs(s), sg = sign(s);
      if (a < core) { float t = a / core; return vec2(-(1.0 - t * t), sg * 2.0 * t / core); }
      if (a < 1.0) { float t = (a - core) / (1.0 - core); return vec2(lip * sin(3.14159 * t), sg * lip * 3.14159 * cos(3.14159 * t) / (1.0 - core)); }
      return vec2(0.0);
    }
    void main() {
      float s = vS, st = floor(vStyle + 0.5), a = abs(s);
      float k = 0.0, gu = 0.0, occ = 0.0;        // k: slope across (height units per half width), gu: slope along, occ: floor occlusion
      float edge = 1.0;                          // fades the quad's own edges so nothing ends in a hard line
      if (st == 0.0 || st == 4.0) {              // groomed / artificial: two clean grooves with a lip
        vec2 g = groove(s, 0.62, 0.35); k = g.y * 0.55; occ = max(0.0, -g.x) * 0.06;
        if (st == 4.0) k *= 0.8 + 0.4 * h1(floor(vU * 30.0) + floor(s * 5.0) * 7.0);
      } else if (st == 1.0) {                    // powder: a deep trench, ragged walls, crumbs on the floor
        float e = 0.8 + 0.14 * n1(vU * 3.0 + s * 5.0) + 0.06 * n1(vU * 17.0);
        vec2 g = groove(s / e, 0.72, 0.5); k = g.y / e * 1.5; occ = max(0.0, -g.x) * 0.18;
        k += (n1(vU * 9.0 + s * 11.0) - 0.5) * 0.6 * step(a, e);
        edge = 1.0 - smoothstep(e + 0.05, 1.0, a);
      } else if (st == 2.0) {                    // crud: broken tracks and clods
        float br = 0.45 + 0.55 * step(0.32, n1(vU * 2.2 + s * 0.7));
        vec2 g = groove(s, 0.55, 0.45); k = g.y * 0.8 * br; occ = max(0.0, -g.x) * 0.08 * br;
        float c = n1(vU * 6.0 + floor(s * 3.0) * 3.1); k += (c - 0.5) * 1.6 * step(0.55, a);
      } else if (st == 3.0) {                    // ice: shallow scratches
        k = cos(s * 9.5 + n1(vU * 0.8) * 2.0) * 0.45; edge = 1.0 - a * a;
      } else if (st == 5.0 || st == 7.0) {       // skid / moguls: a smoothed, slightly lowered band with streaks along the slide
        k = (n1(s * 14.0 + floor(vU * 0.5) * 0.3) - 0.5) * 0.9; vec2 g = groove(s, 0.85, 0.25); k += g.y * 0.3;
        if (st == 7.0) k *= 1.3;
        edge = 1.0 - smoothstep(0.8, 1.0, a);
      } else {                                   // snowmobile: tread with cleats across
        vec2 g = groove(s, 0.88, 0.25); k = g.y * 0.4; gu = cos(vU * 6.0 * 6.28318) * 0.8 * step(0.12, a) * step(a, 0.85);
      }
      vec3 across = vec3(vAcross.x, 0.0, vAcross.y), along = vec3(-vAcross.y, 0.0, vAcross.x);
      vec3 n = normalize(vec3(0.0, 1.0, 0.0) - across * k - along * gu);
      float amb = 0.42, flat0 = max(uSun.y, 0.0) * vLit + amb, here = max(dot(n, uSun), 0.0) * vLit + amb * (0.75 + 0.25 * n.y);
      float r = here / flat0 * (1.0 - occ) - 1.0;   // < 0: wall in shade, > 0: wall catching the sun
      float alpha = (r < 0.0 ? min(0.8, -r * 1.7) : min(0.6, r * 1.4)) * edge * vA;
      if (alpha < 0.008) discard;
      vec3 c = r < 0.0 ? vec3(0.58, 0.68, 0.88) : vec3(1.0);   // shade of sky-lit snow, or a highlight
      gl_FragColor = vec4(pow(c, vec3(2.2)), alpha);
    }`
});
trailsMe = null;
trailsOthers = null;
myTracks = trackEmitter();
}
