// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « tunnels ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { snowRoofMat } from './buildings';
import { IS_TOUCH, V3, clamp, lerp, patchShader, smoothstep } from './core';
import { makeLabel } from './furniture';
import { TEX, lambertVC, mergeParts, pbr } from './materials';
import { pisteHeading, tunnels } from './pistes';
import { scene } from './render';
import { ALT0, HALF, baseHeight, fbm, gridH, mulberry32, perlin, ridged, rnd } from './terrain';
import { COVER, coverWideAt, larchScore, speciesMaterials, treeSpecies } from './vegetation';
import { BLEND, PLAGNE } from './world-data';

export let tunnelFx, tunnelUniforms, TUN_LIGHT;


export function tunnelHue(k, t) { return ((k * 0.083 + t * 0.12) % 1 + 1) % 1; }

export function buildTunnels() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, fog: false,
    uniforms: Object.assign({ uLen: { value: 100 } }, tunnelUniforms),
    vertexShader: 'attribute vec2 aUV; attribute float aKind; varying vec2 vUV; varying float vKind; void main(){ vUV = aUV; vKind = aKind; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; uniform float uBeat; uniform float uLen; varying vec2 vUV; varying float vKind;
      vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        float s = vUV.x, a = vUV.y;
        if (gl_FrontFacing && s > 8.0 && s < uLen - 8.0) discard;   // the outside of the tube only matters at the portals; deep in the mountain it would bleed through the snow at long range
        float n = 0.6 * hash(floor(vec2(s * 0.7, a * 10.0))) + 0.4 * hash(floor(vec2(s * 5.0, a * 60.0)));
        vec3 base = vKind < 0.5 ? vec3(0.9, 0.92, 0.95) * (0.96 + 0.04 * hash(floor(vec2(s * 6.0, a * 30.0)))) : vec3(0.52, 0.5, 0.48) * (0.88 + 0.18 * n);
        if (vKind > 0.5 && abs(fract(s / ${TUN_LIGHT}.0) - 0.5) > 0.47) base *= 0.6;          // segment joints
        vec3 L = vec3(0.2, 0.19, 0.18) * (vKind < 0.5 ? 1.0 : 0.8 + 0.4 * a * (1.0 - a));
        float k0 = floor(s / ${TUN_LIGHT}.0);
        for (int j = -2; j <= 2; j++) {
          float k = k0 + float(j); float ls = k * ${TUN_LIGHT}.0 + ${TUN_LIGHT / 2}.0; float d = s - ls;
          float hh = fract(k * 0.083 + uTime * 0.12);
          float side = vKind < 0.5 ? 0.6 : 1.0;
          L += hue(hh) * (0.5 + uBeat * 0.7) * side / (1.0 + d * d * 0.16);
          L += vec3(0.35, 0.33, 0.3) * side / (1.0 + d * d * 0.05);
        }
        float day = exp(-max(s, 0.0) / 10.0) + exp(-max(uLen - s, 0.0) / 10.0);
        L += vec3(0.85, 0.92, 1.0) * min(day, 1.2) * 1.1;
        gl_FragColor = gl_FrontFacing ? vec4(vec3(0.3, 0.29, 0.28) * (0.8 + 0.3 * n), 1.0) : vec4(base * L, 1.0);
        gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(2.2));   // display values -> linear HDR (lamps feed the bloom)
      }`
  });
  const conc = pbr({ color: '#a7a39c' });
  for (const T of tunnels) {
    const m = mat.clone(); m.uniforms = Object.assign({ uLen: { value: T.len } }, tunnelUniforms);
    const rings = [], j0 = Math.max(0, T.i0 - 2), j1 = Math.min(T.S.length - 1, T.i1 + 2);
    const prof = []; const ARC = 12; prof.push([T.hw, 0, 1]); for (let k = 0; k <= ARC; k++) { const th = k / ARC * Math.PI; prof.push([T.hw * Math.cos(th), 3.0 + (T.ceil - 3.0) * Math.sin(th), 1]); } prof.push([-T.hw, 0, 1]);
    const pos = [], uv = [], kind = [], idx = [];
    for (let j = j0; j <= j1; j++) {
      const hd = pisteHeading(T.piste, j), px = Math.cos(hd), pz = -Math.sin(hd), C = T.S[j], y = T.hs[j], s = (j - T.i0) * 4;
      // floor: flat strip
      pos.push(C.x + px * T.hw, y + 0.03, C.z + pz * T.hw, C.x - px * T.hw, y + 0.03, C.z - pz * T.hw); uv.push(s, 0, s, 1); kind.push(0, 0);
      for (let k = 0; k < prof.length; k++) { const [w, hh] = prof[k]; pos.push(C.x + px * w, y + hh, C.z + pz * w); uv.push(s, k / (prof.length - 1)); kind.push(1); }
    }
    const per = 2 + prof.length;
    for (let j = 0; j < j1 - j0; j++) {
      const A = j * per, B = (j + 1) * per;
      idx.push(A, B, A + 1, A + 1, B, B + 1);
      for (let k = 2; k < per - 1; k++) idx.push(A + k, A + k + 1, B + k, A + k + 1, B + k + 1, B + k);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aUV', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1)); g.setIndex(idx);
    const tube = new THREE.Mesh(g, m); tube.frustumCulled = false; scene.add(tube);
    // shadow caster shell so the sun doesn't light the inside
    const shell = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })); shell.castShadow = true; shell.frustumCulled = false; scene.add(shell);
    // light fixtures on both walls
    const nL = Math.floor(T.len / TUN_LIGHT) + 2, fx = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.22, 1.6), new THREE.MeshBasicMaterial({ color: '#ffffff' }), nL * 2), o = new THREE.Object3D();
    const ks = [];
    for (let k = -1, n = 0; k < nL - 1; k++) for (const sd of [-1, 1]) {
      const s = k * TUN_LIGHT + TUN_LIGHT / 2, j = clamp(T.i0 + Math.round(s / 4), 0, T.S.length - 1), hd = pisteHeading(T.piste, j), C = T.S[j];
      o.position.set(C.x + Math.cos(hd) * sd * (T.hw - 0.35), T.hs[j] + 4.4, C.z - Math.sin(hd) * sd * (T.hw - 0.35)); o.rotation.set(0, hd, 0); o.updateMatrix(); fx.setMatrixAt(n, o.matrix); fx.setColorAt(n, new THREE.Color(1, 1, 1)); ks.push(k); n++;
    }
    fx.frustumCulled = false; scene.add(fx);
    tunnelFx.push({ T, fx, ks });
    // portal galleries
    for (const [end, dirSign] of [[0, -1], [T.len, 1]]) {
      const sMid = end + dirSign * 1.5, j = clamp(T.i0 + Math.round(sMid / 4), 0, T.S.length - 1), C = T.S[j], hd = pisteHeading(T.piste, j), y = T.hs[j];
      const grp = new THREE.Group(); grp.position.set(C.x, y, C.z); grp.rotation.y = hd;
      const L = 14, W = 2 * T.hw + 2.4;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(W, 1.0, L), conc); roof.position.y = T.ceil + 0.5; grp.add(roof);
      const snow = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.6, L + 0.4), snowRoofMat); snow.position.y = T.ceil + 1.2; grp.add(snow);
      for (const sd of [-1, 1]) { const wall = new THREE.Mesh(new THREE.BoxGeometry(0.9, T.ceil + 1.0, L), conc); wall.position.set(sd * (T.hw + 0.7), (T.ceil + 1.0) / 2 - 0.5, 0); grp.add(wall); }
      const front = new THREE.Mesh(new THREE.BoxGeometry(W + 1.2, 2.4, 0.9), conc); front.position.set(0, T.ceil + 0.4, dirSign * L / 2); grp.add(front);
      const sign = makeLabel(T.name, '#ff5ac8', 'Tunnel · ' + T.len + ' m'); sign.position.set(0, T.ceil + 2.6, dirSign * (L / 2 + 0.6)); sign.scale.set(8, 2.5, 1); grp.add(sign);
      grp.traverse(q => { if (q.isMesh) { q.castShadow = true; q.receiveShadow = true; } });
      scene.add(grp);
    }
  }
}

export function updateTunnelFx(time, beat) {
  tunnelUniforms.uTime.value = time; tunnelUniforms.uBeat.value = beat;
  const c = new THREE.Color();
  for (const F of tunnelFx) {
    F.ks.forEach((k, n) => { c.setHSL(tunnelHue(k, time), 1, 0.55 + beat * 0.25); F.fx.setColorAt(n, c); });
    F.fx.instanceColor.needsUpdate = true;
  }
}


// La Plagne: the surveyed relief around the sector (8 km at 40 m), then the horizon (30 km at 150 m); heights relative to alt0
export function gridSample(F, g, x, z) {
  const n = F.n, fx = clamp((x + F.extent / 2) / F.res, 0, n - 1.001), fz = clamp((z + F.extent / 2) / F.res, 0, n - 1.001);
  const ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, i = iz * n + ix;
  return lerp(lerp(g[i], g[i + 1], tx), lerp(g[i + n], g[i + n + 1], tx), tz) * F.scale + F.offset;
}

export function farSample(x, z) {
  const r = Math.max(Math.abs(x), Math.abs(z)) - PLAGNE.meta.far.extent / 2, near = gridSample(PLAGNE.meta.far, BLEND.bin.far, x, z);
  if (!BLEND.bin.wide || r < -600) return near;
  return lerp(near, gridSample(PLAGNE.meta.wide, BLEND.bin.wide, x, z), smoothstep(-600, 0, r));
}

export function farHeight(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  const cx = clamp(x, -HALF, HALF), cz = clamp(z, -HALF, HALF);
  if (PLAGNE && BLEND.bin.far) {
    const e = gridH(cx, cz), d = Math.max(ax - HALF, az - HALF, 0);
    if (ax < HALF - 1 && az < HALF - 1) return e - 160;
    let m = 420 + ridged(x * 0.00042 + 2.0, z * 0.00042 - 7.0, 6) * 2500 + fbm(x * 0.0018, z * 0.0018, 3) * 140;
    m += ridged(x * 0.0021 + 5.3, z * 0.0021 - 3.1, 3) * 240 * smoothstep(700, 1700, m);
    m += 1480 - ALT0;                                                    // same absolute altitudes as the procedural ranges
    const r = Math.max(ax, az) - (BLEND.bin.wide ? PLAGNE.meta.wide : PLAGNE.meta.far).extent / 2;   // past the surveys: procedural ranges
    return lerp(e, lerp(farSample(x, z), m, smoothstep(0, 2500, r)), smoothstep(0, 160, d));
  }
  const e = baseHeight(cx, cz);
  if (ax < HALF - 1 && az < HALF - 1) return e - 160;
  const d = Math.max(ax - HALF, az - HALF, 0);
  let m = 420 + ridged(x * 0.00042 + 2.0, z * 0.00042 - 7.0, 6) * 2500 + fbm(x * 0.0018, z * 0.0018, 3) * 140;
  m += ridged(x * 0.0021 + 5.3, z * 0.0021 - 3.1, 3) * 240 * smoothstep(700, 1700, m);   // secondary crests and couloirs on the high peaks
  const valley = Math.exp(-Math.pow(x / 1900, 2)) * smoothstep(1200, 3200, z);
  m = lerp(m, -40 - (z - 1400) * 0.06 + ax * 0.12 + fbm(x * 0.002, z * 0.002, 3) * 60, valley * 0.92);
  return lerp(e, m, smoothstep(0, 2000, d));
}

/* Distant mountains: slope and altitude decide per pixel between snow fields, rock faces streaked with snowy gullies
   (Blender "massif" map, projected vertically) and forest; two scales of rock relief break up the big triangles.
   The aerial perspective of the fog chunk then blues and lightens them with distance. */
export function backdropMaterial() {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0 });
  const MA = BLEND.tex.massif_albedo, MN = BLEND.tex.massif_normal, RA = BLEND.tex.rock_albedo || TEX.rockA, RN = BLEND.tex.rock_normal || TEX.rockN, SN_ = BLEND.tex.snowpack_normal || TEX.powder;
  if (!MA) return lambertVC();
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { tMA: { value: MA }, tMN: { value: MN }, tRA: { value: RA }, tRN: { value: RN }, tSN: { value: SN_ } });
    sh.vertexShader = patchShader(sh.vertexShader, '#include <common>', '#include <common>\nattribute float aForest;\nattribute float aLarch;\nvarying float vForest;\nvarying float vLarch;\nvarying vec3 vBW;\nvarying vec3 vBN;', 'backdrop');
    sh.vertexShader = patchShader(sh.vertexShader, '#include <begin_vertex>', '#include <begin_vertex>\n  vForest = aForest; vLarch = aLarch; vBW = (modelMatrix * vec4(position, 1.0)).xyz; vBN = normalize(mat3(modelMatrix) * normal);', 'backdrop');
    sh.fragmentShader = patchShader(sh.fragmentShader, '#include <common>', `#include <common>
uniform sampler2D tMA; uniform sampler2D tMN; uniform sampler2D tRA; uniform sampler2D tRN; uniform sampler2D tSN;
varying float vForest; varying float vLarch; varying vec3 vBW; varying vec3 vBN;
float bdRock, bdSnowFace;`, 'backdrop');
    sh.fragmentShader = patchShader(sh.fragmentShader, '#include <map_fragment>', `
  vec3 nB = normalize(vBN); bool bX = abs(nB.x) > abs(nB.z);
  vec2 uvS = vec2(bX ? vBW.z : vBW.x, vBW.y);                       // vertical projection for faces
  { vec2 wq = (bX ? vBW.zy : vBW.xy) / vec2(900.0, 1400.0); uvS += (vec2(texture2D(tRA, wq + 0.13).r, texture2D(tRA, wq.yx + 0.57).g) - 0.45) * vec2(260.0, 140.0); }   // domain warp: no straight repeating gullies
  float macro = texture2D(tRA, vBW.xz / 2600.0 + 0.3).r;             // large patches: where the snow stays on rock
  float slope = nB.y + (macro - 0.45) * 0.25 + (texture2D(tRA, vBW.xz / 420.0).r - 0.45) * 0.18;
  bdRock = smoothstep(0.84, 0.66, slope) * (1.0 - 0.5 * smoothstep(-200.0, 400.0, -vBW.y + 900.0) * 0.0);
  // two scales, offset, blended by a large-scale mask: no visible repeat on a 2 km wall
  float mixF = smoothstep(0.35, 0.65, texture2D(tRA, vBW.xz / 1900.0 + 0.71).g);
  vec3 face = mix(texture2D(tMA, uvS / vec2(160.0, 520.0)).rgb, texture2D(tMA, uvS / vec2(290.0, 830.0) + 0.37).rgb, mixF);
  vec3 rockD = texture2D(tRA, uvS / 70.0).rgb * 1.15;
  float snowInFace = smoothstep(0.55, 0.75, dot(face, vec3(0.333)));
  bdSnowFace = snowInFace;
  vec3 rockCol = mix(rockD * vec3(0.95, 0.93, 0.9), vec3(0.9, 0.93, 0.98), snowInFace);
  vec3 snowCol = vec3(0.93, 0.95, 0.99) * (0.96 + 0.06 * texture2D(tRA, vBW.xz / 160.0).g);
  float speck = texture2D(tRA, vBW.xz / 18.0).r;
  vec3 forestCol = mix(vec3(0.16, 0.24, 0.2), vec3(0.85, 0.88, 0.93), smoothstep(0.62, 0.8, speck) * 0.55);   // fir stands with snowy clearings
  // T8 : peuplements de mélèzes sans aiguilles, gris-brun, la neige se voit entre les rameaux
  forestCol = mix(forestCol, mix(vec3(0.44, 0.4, 0.36), vec3(0.85, 0.88, 0.93), 0.38 + 0.3 * smoothstep(0.5, 0.8, speck)), vLarch);
  vec3 base = mix(snowCol, rockCol, bdRock);
  base = mix(base, forestCol, vForest * (1.0 - bdRock));
  diffuseColor.rgb = base;`, 'backdrop');
    sh.fragmentShader = patchShader(sh.fragmentShader, '#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  { vec3 t1 = normalize(bX ? vec3(0.0, 0.0, 1.0) - nB * nB.z : vec3(1.0, 0.0, 0.0) - nB * nB.x), t2 = normalize(vec3(0.0, 1.0, 0.0) - nB * nB.y + vec3(0.0, 0.0, 1e-4));
    vec3 dF = mix(texture2D(tMN, uvS / vec2(160.0, 520.0)).xyz, texture2D(tMN, uvS / vec2(290.0, 830.0) + 0.37).xyz, mixF) * 2.0 - 1.0, dR = texture2D(tRN, uvS / 90.0).xyz * 2.0 - 1.0;
    vec3 dS = texture2D(tSN, vBW.xz / 140.0).xyz * 2.0 - 1.0;
    vec3 wn = nB + (t1 * (dF.x * 0.9 + dR.x * 0.5) + t2 * (dF.y * 0.9 + dR.y * 0.5)) * bdRock
                 + (vec3(1.0, 0.0, 0.0) * dS.x + vec3(0.0, 0.0, 1.0) * dS.y) * 0.35 * (1.0 - bdRock);
    normal = normalize((viewMatrix * vec4(normalize(wn), 0.0)).xyz); }`, 'backdrop');
    sh.fragmentShader = patchShader(sh.fragmentShader, '#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(0.7, 0.92, bdRock * (1.0 - bdSnowFace));', 'backdrop');
  };
  return m;
}

export function buildBackdrop() {
  // non-uniform grid: fine just outside the play area, coarse towards the horizon
  const axis = [];
  for (let x = -HALF; x <= HALF; x += PLAGNE ? 40 : 350) axis.push(x);   // real relief: the strip along the edge must follow the terrain's own edge
  const outer = []; for (let x = HALF, sp = 24; x < 11000; ) { x += sp; sp *= 1.03; outer.push(Math.min(x, 11000)); }   // ~200 x 200 vertices
  const coords = outer.slice().reverse().map(v => -v).concat(axis, outer);
  const vn = coords.length, n = vn - 1;
  const pos = new Float32Array(vn * vn * 3), col = new Float32Array(vn * vn * 3);
  for (let iz = 0; iz < vn; iz++) for (let ix = 0; ix < vn; ix++) {
    const i = iz * vn + ix, x = coords[ix], z = coords[iz];
    // inside the playable area the real terrain takes over: sink the coarse backdrop well below it, otherwise its
    // 350 m triangles cut through concave cliffs and show as flat grey patches
    const inside = Math.abs(x) < HALF - 1 && Math.abs(z) < HALF - 1;
    pos[i * 3] = x; pos[i * 3 + 1] = farHeight(x, z) - (inside ? 400 : 0); pos[i * 3 + 2] = z;
  }
  const idx = []; for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) { const a = iz * vn + ix, b = a + 1, c = a + vn, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const nor = geo.attributes.normal.array;
  const isForest = (x, y, z, ny) => y + ALT0 < 2040 + perlin(x * 0.003, z * 0.003) * 90 && ny > 0.8 && fbm(x * 0.0012, z * 0.0012, 2) > -0.15;
  for (let i = 0; i < vn * vn; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], ny = nor[i * 3 + 1];
    const nz = perlin(x * 0.003, z * 0.003);
    let c = [0.92, 0.945, 0.985];
    const snowLine = 2180 - ALT0 + nz * 160;
    if (isForest(x, y, z, ny)) c = [0.74, 0.8, 0.8];
    else if (ny < 0.72 || (y < snowLine && ny < 0.86)) { const k = smoothstep(0.86, 0.6, ny); c = [lerp(0.86, 0.36, k), lerp(0.88, 0.35, k), lerp(0.93, 0.36, k)]; }
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
  }
  // per-vertex forest mask; rock, snow and their detail are decided per pixel in the shader below
  // T8 : les bois d'OSM qui débordent du secteur restent boisés au-delà de sa limite ; part de mélèzes comme dans le domaine
  const forest = new Float32Array(vn * vn), larch = new Float32Array(vn * vn), outside = (x, z) => Math.abs(x) > HALF - 1 || Math.abs(z) > HALF - 1;
  for (let i = 0; i < vn * vn; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
    forest[i] = isForest(x, y, z, nor[i * 3 + 1]) || (outside(x, z) && nor[i * 3 + 1] > 0.7 && coverWideAt(x, z) === 1) ? 1 : 0;
    larch[i] = smoothstep(0.32, 0.68, larchScore(x, z, y + ALT0));
  }
  geo.setAttribute('aForest', new THREE.BufferAttribute(forest, 1)); geo.setAttribute('aLarch', new THREE.BufferAttribute(larch, 1));
  scene.add(new THREE.Mesh(geo, backdropMaterial()));
  // distant fir stands so forests read as trees, not as flat green paint ; T8 : épicéa ou mélèze par instance
  const coneOf = (r0, h0, y0, r1, h1, y1, c0, c1) => mergeParts([
    { g: (() => { const g = new THREE.ConeGeometry(r0, h0, 6, 1, true); g.translate(0, y0, 0); return g; })(), c: c0 },
    { g: (() => { const g = new THREE.ConeGeometry(r1, h1, 6, 1, true); g.translate(0, y1, 0); return g; })(), c: c1 }]);
  const cone = coneOf(2.2, 7, 4.2, 1.3, 3.2, 6.3, '#1f4832', '#dfe8f2'), cone2 = coneOf(1.5, 8.2, 4.8, 0.8, 3.4, 7.6, '#6e6154', '#b9b3ab');
  cone.setAttribute('aPos2', cone2.getAttribute('position')); cone.setAttribute('aNrm2', cone2.getAttribute('normal')); cone.setAttribute('aCol2', cone2.getAttribute('color'));
  const list = [], nrm = new V3(), e = 6;
  for (let i = 0; i < 90000 && list.length < (IS_TOUCH ? 6000 : 16000); i++) {
    const ang = rnd() * Math.PI * 2, r = HALF * 1.02 + Math.pow(rnd(), 2) * 2600;
    const x = Math.sin(ang) * r * 1.42, z = Math.cos(ang) * r * 1.42;
    if (Math.abs(x) < HALF + 10 && Math.abs(z) < HALF + 10) continue;
    const y = farHeight(x, z); nrm.set(farHeight(x - e, z) - farHeight(x + e, z), 2 * e, farHeight(x, z - e) - farHeight(x, z + e)).normalize();
    if (!isForest(x, y, z, nrm.y)) continue;
    list.push([x, y, z, 1 + rnd() * 1.2]);
  }
  // T8 : bouquets de plus dans les bois d'OSM hors du secteur, tirés d'un générateur propre (la suite de rnd ne change pas)
  const R = mulberry32(31337), extra = [], want = IS_TOUCH ? 1500 : 4000, legacyN = list.length;
  for (let i = 0; i < 60000 && extra.length < want && COVER.wide; i++) {
    const x = (R() * 2 - 1) * COVER.wide.half, z = (R() * 2 - 1) * COVER.wide.half;
    if (Math.abs(x) < HALF + 10 && Math.abs(z) < HALF + 10) continue;
    if (coverWideAt(x, z) !== 1) continue;
    const y = farHeight(x, z); extra.push([x, y, z, 1 + R() * 1.2]);
  }
  const all = list.concat(extra), sp = new Float32Array(all.length);
  const tm = new THREE.InstancedMesh(cone, null, all.length), d = new THREE.Object3D();
  list.forEach(([x, y, z, sc], i) => { d.position.set(x, y - 1, z); d.rotation.set(0, rnd() * 6, 0); d.scale.set(sc, sc * (0.9 + rnd() * 0.4), sc); d.updateMatrix(); tm.setMatrixAt(i, d.matrix); });
  extra.forEach(([x, y, z, sc], k) => { d.position.set(x, y - 1, z); d.rotation.set(0, R() * 6, 0); d.scale.set(sc, sc * (0.9 + R() * 0.4), sc); d.updateMatrix(); tm.setMatrixAt(legacyN + k, d.matrix); });
  all.forEach(([x, y, z], i) => { sp[i] = treeSpecies(x, z, y + ALT0, false, false, R); });
  cone.setAttribute('iSp', new THREE.InstancedBufferAttribute(sp, 1));
  tm.material = speciesMaterials(lambertVC()).mat; tm.userData.legacyN = legacyN; tm.userData.horizonStands = true;
  tm.frustumCulled = false; scene.add(tm);
}

export function __init_1796() {

/* ---------------- Tunnels: tube with coloured light fixtures, portal galleries ---------------- */
tunnelFx = [];
tunnelUniforms = { uTime: { value: 0 }, uBeat: { value: 0 } };
TUN_LIGHT = 8;
}
