// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « materials ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { AX_Y } from './animation';
import { IS_TOUCH, Q, V3, clamp, lerp, patchShader, smoothstep } from './core';
import { PIPE, SN, snowGrid, tunnels, zIdx } from './pistes';
import { MAX_ANISO, SUN_DIR, TERRAIN_LAYER, scene, srgbTex } from './render';
import { CELL, HALF, N, VN, crudAt, gridH, groomW, heights, mulberry32, perlin, trees } from './terrain';
import { farHeight } from './tunnels';
import { BLEND } from './world-data';

export let TEX, GRAIN_TEX, grainHook, metal, lambertVC, farGrid, SUN_H, SUN_HX, SUN_HZ, SUN_TAN, sunArr, groomDir, terrainMesh, terrainMat;

export function __set_terrainMat(v) { return (terrainMat = v); }


/* ---------------- Procedural textures ---------------- */
export function tileNoise(S, cells, seed, oct) {
  const out = new Float32Array(S * S); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const g = cells << o, r = mulberry32(seed + o * 131), lat = new Float32Array(g * g);
    for (let i = 0; i < g * g; i++) lat[i] = r();
    for (let y = 0; y < S; y++) {
      const fy = y / S * g, iy = Math.floor(fy), ty = fy - iy, sy = ty * ty * (3 - 2 * ty), y0 = (iy % g) * g, y1 = ((iy + 1) % g) * g;
      for (let x = 0; x < S; x++) {
        const fx = x / S * g, ix = Math.floor(fx), tx = fx - ix, sx = tx * tx * (3 - 2 * tx), x0 = ix % g, x1 = (ix + 1) % g;
        const v = lerp(lerp(lat[y0 + x0], lat[y0 + x1], sx), lerp(lat[y1 + x0], lat[y1 + x1], sx), sy);
        out[y * S + x] += v * amp;
      }
    }
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}

export function canvasTex(S, fill) {
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); const img = g.createImageData(S, S);
  fill(img.data); g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = MAX_ANISO; return t;   // data by default (normal maps)
}

export function normalTex(h, S, k) {
  return canvasTex(S, d => {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = h[y * S + (x + 1) % S] - h[y * S + (x - 1 + S) % S], dy = h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x];
      let nx = -dx * k, ny = dy * k, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const i = (y * S + x) * 4; d[i] = (nx * 0.5 + 0.5) * 255; d[i + 1] = (ny * 0.5 + 0.5) * 255; d[i + 2] = (nz * 0.5 + 0.5) * 255; d[i + 3] = 255;
    }
  });
}

export function buildTextures() {
  const S = Q.tex;
  // corduroy left by the groomer: 5 cm ribs across a 4 m tile, with the seam between two passes
  { const n = tileNoise(S, 8, 11, 4), f = tileNoise(S, 64, 12, 2), h = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, seam = Math.min(u, 1 - u) * S;
      h[y * S + x] = 0.55 * Math.pow(Math.abs(Math.sin(Math.PI * u * 80 + n[y * S + x] * 2)), 0.6) + 0.25 * n[y * S + x] + 0.12 * f[y * S + x] - 0.9 * Math.exp(-seam * seam / 6);
    }
    TEX.groom = normalTex(h, S, 1.1); }
  // wind ripples on untouched powder
  { const n = tileNoise(S, 4, 21, 5), h = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const v = y / S; h[y * S + x] = 0.35 * Math.sin(Math.PI * 2 * (v * 7 + 1.4 * n[y * S + x])) + 0.9 * n[y * S + x]; }
    TEX.powder = normalTex(h, S, 1.5); }
  // trafolle: lumps and crossing ski tracks
  { const n = tileNoise(S, 16, 31, 4), h = new Float32Array(S * S), r = mulberry32(77);
    for (let i = 0; i < h.length; i++) h[i] = n[i] * 1.6;
    for (let k = 0; k < 0; k++) {   // no painted ski tracks any more: real ones are drawn as you ski
      const x0 = r() * S, ang = (r() - 0.5) * 1.2, amp = 10 + r() * 30, fr = 1 + Math.floor(r() * 3);
      for (let y = 0; y < S; y++) {
        const cx = x0 + Math.tan(ang) * y * 0.3 + Math.sin(y / S * Math.PI * 2 * fr) * amp;
        for (const off of [-6, 6]) for (let dx = -3; dx <= 3; dx++) { const x = ((Math.round(cx + off + dx) % S) + S) % S; h[y * S + x] -= 0.28 * (1 - Math.abs(dx) / 4); }
      }
    }
    TEX.crud = normalTex(h, S, 3.2); }
  // rock: ridged layers + albedo with cracks and lichen
  { const n = tileNoise(S, 8, 41, 5), m = tileNoise(S, 32, 42, 3), h = new Float32Array(S * S);
    for (let i = 0; i < h.length; i++) { const r = 1 - Math.abs(n[i] * 2 - 1); h[i] = r * r * 1.4 + m[i] * 0.4; }
    TEX.rockN = normalTex(h, S, 4);
    TEX.rockA = canvasTex(S, d => { for (let i = 0; i < h.length; i++) { const v = 0.5 + h[i] * 0.35 - (m[i] < 0.28 ? 0.18 : 0); const lich = n[i] > 0.66 ? 0.06 : 0; d[i * 4] = clamp(v * 196 + lich * 120, 0, 255); d[i * 4 + 1] = clamp(v * 186 + lich * 140, 0, 255); d[i * 4 + 2] = clamp(v * 178, 0, 255); d[i * 4 + 3] = 255; } }); }
  // fir needles (grey detail, the vertex colour gives green or snow)
  { const S2 = 128; const n = tileNoise(S2, 8, 51, 3), r = mulberry32(52), h = new Float32Array(S2 * S2).fill(0.8);
    for (let k = 0; k < 900; k++) { const x = r() * S2, y = r() * S2, len = 4 + r() * 8, a = -0.5 + r() * 1.0; for (let t = 0; t < len; t++) { const px = Math.floor(x + Math.sin(a) * t + S2) % S2, py = Math.floor(y + Math.cos(a) * t + S2) % S2; h[py * S2 + px] = 0.55 + r() * 0.5; } }
    TEX.needle = canvasTex(S2, d => { for (let i = 0; i < h.length; i++) { const v = clamp((h[i] * 0.8 + n[i] * 0.35) * 255, 60, 255); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; } }); }
}


export function mergeParts(parts) {
  let total = 0;
  const gs = parts.map(p => { const g = p.g.index ? p.g.toNonIndexed() : p.g; if (!g.attributes.normal) g.computeVertexNormals(); total += g.attributes.position.count; return g; });
  const hasUv = gs.every(g => g.attributes.uv);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3), uv = hasUv ? new Float32Array(total * 2) : null;
  let o = 0;
  gs.forEach((g, i) => {
    const c = new THREE.Color(parts[i].c), n = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (uv) uv.set(g.attributes.uv.array, o * 2);
    for (let k = 0; k < n; k++) { col[(o + k) * 3] = c.r; col[(o + k) * 3 + 1] = c.g; col[(o + k) * 3 + 2] = c.b; }
    o += n;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (uv) geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

export function pbr(o = {}, grain = [0.3, 0.45, 1.5]) {
  const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.86, metalness: 0 }, o));
  m.userData.grainU = { value: new THREE.Vector3(grain[0], grain[1], grain[2]) }; m.onBeforeCompile = grainHook; return m;
}

// former "shiny" materials: Phong shininess mapped to a GGX roughness
export function pbrGloss(o = {}) {
  const { shininess = 30, specular, ...rest } = o;
  return pbr(Object.assign({ roughness: clamp(Math.sqrt(2 / (shininess + 2)) + 0.04, 0.05, 0.9) }, rest), [0.04, 0.25, 2]);
}

// surfaces with a Blender-baked map set (falls back to the plain grain when the assets are missing)
export function detailMat(kind, o, perMetre, relief, albedo, turn, grain) {
  const m = pbr(o, grain), A = BLEND.tex[kind + '_albedo'], Nm = BLEND.tex[kind + '_normal'];
  if (A && Nm) { m.defines = { USE_DETAIL: '' }; m.userData.detail = { a: A, n: Nm, p: new THREE.Vector4(perMetre, relief, albedo, turn ? 1 : 0) }; }
  return m;
}

/* Windows with interior mapping: each pane ray-casts into a virtual room behind it (half as wide again as the
   opening, 3 m deep) and re-projects the hit point into one of four chalet rooms rendered with Cycles from one
   room-depth in front of the window (blender/buildings.py). Curtains are procedural; the glass keeps its sky
   reflection. 'winlit' rooms have their lamps on. */
export function interiorMat(lamp, tint, atlas = BLEND.tex.rooms_atlas, tiles = 4, opt = {}) {
  const m = new THREE.MeshStandardMaterial({ color: '#0b0d10', roughness: 0.05, metalness: 0, envMapIntensity: lamp < 1 ? 1.1 : 0.8 });   // by day the sky reflection dominates
  const rooms = atlas; if (!rooms) return m;
  m.defines = Object.assign({}, opt.fromColor ? { VARIANT_FROM_COLOR: '' } : {}, opt.noCurtain ? { NO_CURTAIN: '' } : {});
  m.onBeforeCompile = sh => {
    sh.uniforms.uRooms = { value: rooms }; sh.uniforms.uLamp = { value: lamp }; sh.uniforms.uTint = { value: new THREE.Vector3(...tint) }; sh.uniforms.uTiles = { value: tiles };
    sh.vertexShader = patchShader(sh.vertexShader, '#include <common>', '#include <common>\nvarying vec3 vWinP;\nvarying vec3 vWinC;\nvarying vec3 vWinS;\nvarying float vWinSeed;', 'interior');
    sh.vertexShader = patchShader(sh.vertexShader, '#include <project_vertex>', `#include <project_vertex>
  { mat4 IM = mat4(1.0);
  #ifdef USE_INSTANCING
    IM = instanceMatrix;
  #endif
    vec3 sc = vec3(length(IM[0].xyz), length(IM[1].xyz), length(IM[2].xyz));
    vWinS = sc; vWinP = position * sc; vWinC = (inverse(modelMatrix * IM) * vec4(cameraPosition, 1.0)).xyz * sc;
    vWinSeed = fract(sin(dot(IM[3].xyz, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }`, 'interior');
    sh.fragmentShader = patchShader(sh.fragmentShader, '#include <common>', '#include <common>\nuniform sampler2D uRooms;\nuniform float uLamp;\nuniform float uTiles;\nuniform vec3 uTint;\nvarying vec3 vWinP;\nvarying vec3 vWinC;\nvarying vec3 vWinS;\nvarying float vWinSeed;', 'interior');
    sh.fragmentShader = patchShader(sh.fragmentShader, '#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  { vec3 d = normalize(vWinP - vWinC);
    if (vWinP.z > vWinS.z * 0.45 && d.z < -0.001) {
      vec2 hw = vWinS.xy * 0.5;
      vec3 R = vec3(max(hw.x * 1.5, 0.6), max(hw.y * 1.3, 0.75), 3.0);
      vec2 o = vWinP.xy;
      float tx = ((d.x > 0.0 ? R.x : -R.x) - o.x) / d.x, ty = ((d.y > 0.0 ? R.y : -R.y) - o.y) / d.y, tz = -R.z / d.z;
      float t = min(min(abs(d.x) > 1e-4 ? tx : 1e4, abs(d.y) > 1e-4 ? ty : 1e4), tz);
      vec3 h = vec3(o, 0.0) + d * t;
      float k = R.z / (R.z - h.z);
      vec2 uv = vec2(0.5 + 0.5 * (h.x / R.x) * k, 0.5 - 0.5 * (h.y / R.y) * k);
      #ifdef VARIANT_FROM_COLOR
        float v = floor(vColor.r * 8.0 + 0.5);          // shop index shared with its sign (instance colour)
      #else
        float v = floor(vWinSeed * uTiles);
      #endif
      vec3 room = texture2D(uRooms, vec2((v + clamp(uv.x, 0.002, 0.998)) / uTiles, clamp(uv.y, 0.002, 0.998))).rgb;
      // curtains drawn to the sides, folded, colour per window
      float cx = abs(vWinP.x) / hw.x, cw = 0.18 + 0.22 * fract(vWinSeed * 7.13);
      float cur = smoothstep(1.0 - cw - 0.04, 1.0 - cw, cx) * step(0.25, fract(vWinSeed * 3.7));
      #ifdef NO_CURTAIN
        cur = 0.0;
      #endif
      vec3 cc = vec3(0.55, 0.12, 0.1) + vec3(0.1, 0.35, 0.3) * fract(vWinSeed * 11.0);
      cc *= 0.7 + 0.3 * sin(vWinP.x * 70.0);
      totalEmissiveRadiance += mix(room, pow(cc, vec3(2.2)) * 0.6, cur * 0.92) * uTint * uLamp;
    } }`, 'interior');
  };
  return m;
}


/* ---------------- Terrain material: blended snow surfaces ---------------- */
// boxes (world -> local: x along, y up, z across) inside which the coarse terrain is not drawn: tunnel mouths, pipe trench
export function terrainCutouts() {
  const PM = [], PS = [];
  for (const T of tunnels) for (const end of [0, 1]) {
    const i = end ? T.i1 : T.i0, j = end ? Math.max(T.i0, i - 2) : Math.min(T.i1, i + 2), A = T.S[i], B = T.S[j];
    const d = new V3(B.x - A.x, 0, B.z - A.z).normalize(), lat = new V3().crossVectors(d, AX_Y).normalize();
    PM.push(new THREE.Matrix4().makeBasis(d, AX_Y, lat).setPosition(A.x, T.hs[i], A.z).invert()); PS.push(new THREE.Vector4(14, T.hw - 0.02, T.ceil + 0.3, 0));
  }
  if (PIPE.on) {   // sloped frame following the decks
    const d = new V3(PIPE.dx, -PIPE.grade, PIPE.dz).normalize(), lat = new V3().crossVectors(d, AX_Y).normalize(), up = new V3().crossVectors(lat, d).normalize();
    // starts 0.8 m inside the pipe mesh at both ends (the cut-out test begins at -0.3 m): no sliver of sky between them
    PM.push(new THREE.Matrix4().makeBasis(d, up, lat).setPosition(PIPE.ax + PIPE.dx * 0.8, PIPE.hA - PIPE.grade * 0.8, PIPE.az + PIPE.dz * 0.8).invert()); PS.push(new THREE.Vector4((PIPE.L - 1.6) * Math.hypot(1, PIPE.grade), PIPE.halfW - 0.05, 0.6, 0));
  }
  if (PM.length > 6) throw new Error('too many terrain cut-outs: enlarge uPortal');
  while (PM.length < 6) { PM.push(new THREE.Matrix4()); PS.push(new THREE.Vector4(0, 0, 0, 0)); }
  return { PM, PS };
}

// the same cut-outs in the shadow pass, otherwise the invisible terrain "lid" would shade the pipe and the tunnel mouths
export function terrainDepthMaterial() {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), { PM, PS } = terrainCutouts();
  m.onBeforeCompile = sh => {
    sh.uniforms.uPortal = { value: PM }; sh.uniforms.uPortalSize = { value: PS };
    sh.vertexShader = patchShader(sh.vertexShader, '#include <common>', '#include <common>\nvarying vec3 vCutW;', 'terrain depth');
    sh.vertexShader = patchShader(sh.vertexShader, '#include <project_vertex>', '#include <project_vertex>\n  vCutW = (modelMatrix * vec4(transformed, 1.0)).xyz;', 'terrain depth');
    sh.fragmentShader = patchShader(sh.fragmentShader, '#include <common>', '#include <common>\nvarying vec3 vCutW;\nuniform mat4 uPortal[6];\nuniform vec4 uPortalSize[6];', 'terrain depth');
    sh.fragmentShader = patchShader(sh.fragmentShader, '#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  for (int i = 0; i < 6; i++) { vec3 q = (uPortal[i] * vec4(vCutW, 1.0)).xyz; vec4 ps = uPortalSize[i];
    if (q.x > -0.3 && q.x < ps.x && abs(q.z) < ps.y && q.y < ps.z && q.y > -3.0) discard; }`, 'terrain depth');
  };
  return m;
}

export function makeTerrainMaterial() {
  srgbTex(TEX.rockA); srgbTex(TEX.needle);   // colour images (normal maps stay as data)
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, metalness: 0 });
  m.onBeforeCompile = sh => {
    for (const a of ['#include <common>', '#include <begin_vertex>']) if (!sh.vertexShader.includes(a)) throw new Error('terrain shader anchor missing: ' + a);
    for (const a of ['#include <common>', '#include <map_fragment>', '#include <roughnessmap_fragment>', '#include <normal_fragment_maps>', '#include <lights_fragment_end>', '#include <opaque_fragment>'])
      if (!sh.fragmentShader.includes(a)) throw new Error('terrain shader anchor missing: ' + a);
    // tunnel mouths: the terrain grid (6.25 m cells) cannot follow the step between the cutting and the ground above the
    // tube, so its triangles would ramp across the opening; they are discarded inside the tube for 14 m from each portal
    const { PM, PS } = terrainCutouts();
    sh.uniforms.uPortal = { value: PM }; sh.uniforms.uPortalSize = { value: PS };
    sh.uniforms.uSunW = { value: SUN_DIR };
    Object.assign(sh.uniforms, { tNG: { value: TEX.groom }, tNP: { value: TEX.powder }, tNC: { value: TEX.crud }, tNR: { value: BLEND.tex.rock_normal || TEX.rockN }, tRA: { value: BLEND.tex.rock_albedo || TEX.rockA } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aSnow; attribute float aDir; attribute float aSun; attribute float aIce;\nvarying vec4 vSnow; varying float vDir; varying float vSun; varying float vIce; varying vec3 vWPos; varying vec3 vWNorm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vSnow = aSnow; vDir = aDir; vSun = aSun; vIce = aIce; vWPos = (modelMatrix * vec4(position, 1.0)).xyz; vWNorm = normalize(mat3(modelMatrix) * normal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D tNG; uniform sampler2D tNP; uniform sampler2D tNC; uniform sampler2D tNR; uniform sampler2D tRA; uniform mat4 uPortal[6]; uniform vec4 uPortalSize[6];
varying vec4 vSnow; varying float vDir; varying float vSun; varying float vIce; varying vec3 vWPos; varying vec3 vWNorm; uniform vec3 uSunW;
vec3 tsN(sampler2D t, vec2 uv) { return texture2D(t, uv).xyz * 2.0 - 1.0; }`)
      .replace('#include <map_fragment>', `
  #ifndef NO_CUTOUT
  for (int i = 0; i < 6; i++) { vec3 q = (uPortal[i] * vec4(vWPos, 1.0)).xyz; vec4 ps = uPortalSize[i];
    if (q.x > -0.3 && q.x < ps.x && abs(q.z) < ps.y && q.y < ps.z && q.y > -3.0) discard; }
  #endif
  vec4 W = vSnow / max(1e-3, vSnow.x + vSnow.y + vSnow.z + vSnow.w);
  float ca = cos(vDir), sa = sin(vDir);
  vec2 uvG = vec2(ca * vWPos.x - sa * vWPos.z, sa * vWPos.x + ca * vWPos.z) * 0.25;
  vec2 uvP = vWPos.xz / 9.0; vec2 uvC = vWPos.xz / 7.0; vec2 uvR = vWPos.xz / 6.0;
  // rock: seen from above on ledges, projected sideways on cliffs so the strata stay horizontal (blended by slope)
  vec3 nR = normalize(vWNorm); float rTop = smoothstep(0.55, 0.85, nR.y); bool rX = abs(nR.x) > abs(nR.z);
  vec2 uvRs = (rX ? vWPos.zy : vWPos.xy) / 7.0;
  vec3 rockA = mix(texture2D(tRA, uvRs).rgb, texture2D(tRA, uvR).rgb, rTop);
  // macro scale for cliffs seen from far: large colour patches, snow caught in gullies and on ledges
  float rMac = dot(texture2D(tRA, uvRs * 0.035 + 0.37).rgb, vec3(0.333)), rGul = dot(texture2D(tRA, vec2(uvRs.x * 0.08, uvRs.y * 0.011) + 0.71).rgb, vec3(0.333));
  rockA *= 0.55 + 1.3 * rMac;
  rockA = mix(rockA, vec3(0.8, 0.84, 0.9), clamp(smoothstep(0.3, 0.42, rGul) * 0.75 * (1.0 - rTop) + rTop * 0.3, 0.0, 0.85));
  diffuseColor.rgb *= vec3(W.x * 0.97 + W.y * 1.0 + W.z * 0.93) + W.w * rockA;`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = W.x * 0.6 + W.y * 0.84 + W.z * 0.74 + W.w * 0.72; roughnessFactor = mix(roughnessFactor, 0.16, clamp(vIce, 0.0, 1.0));')
      .replace('#include <normal_fragment_maps>', `
  vec3 nW = normalize(vWNorm);
  vec3 Tx = normalize(vec3(1.0, 0.0, 0.0) - nW * nW.x), Tz = normalize(vec3(0.0, 0.0, 1.0) - nW * nW.z);
  vec3 TuG = vec3(ca, 0.0, -sa), TvG = vec3(sa, 0.0, ca);
  vec3 Tgu = normalize(TuG - nW * dot(TuG, nW)), Tgv = normalize(TvG - nW * dot(TvG, nW));
  vec3 mG = tsN(tNG, uvG); vec3 mO = tsN(tNP, uvP) * W.y + tsN(tNC, uvC) * W.z + tsN(tNR, uvR) * W.w * rTop;
  vec3 wN = (mG.x * Tgu + mG.y * Tgv + mG.z * nW) * W.x + (mO.x * Tx + mO.y * Tz + mO.z * nW);
  { vec3 a1 = rX ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0), TR1 = normalize(a1 - nW * dot(a1, nW)), TR2 = normalize(vec3(0.0, 1.0, 0.0) - nW * nW.y + vec3(0.0, 0.0, 1e-4));
    vec3 mRs = tsN(tNR, uvRs); wN += (mRs.x * TR1 - mRs.y * TR2 + mRs.z * nW) * W.w * (1.0 - rTop); }
  normal = normalize((viewMatrix * vec4(normalize(wN + nW * 0.001), 0.0)).xyz);`)
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n  reflectedLight.directDiffuse *= vSun; reflectedLight.directSpecular *= vSun;')
      .replace('#include <opaque_fragment>', `
  { vec3 cell = floor(vWPos * 9.0);
    float hs = fract(sin(dot(cell, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    vec3 vd = normalize(cameraPosition - vWPos);
    float tw = fract(hs * 57.31 + dot(vd, vec3(5.3, 7.1, 3.7)) * 2.0);
    float glint = smoothstep(0.986, 1.0, tw) * step(0.55, hs);
    outgoingLight += vec3(glint) * vSun * (1.0 - W.w) * smoothstep(40.0, 4.0, length(cameraPosition - vWPos)) * 3.0;
    // T4 : paillettes de neige qui renvoient le soleil vers l'œil (facettes de givre orientées au hasard, 2,5 cm) ;
    // effacées quand une facette devient plus petite qu'un pixel (pas de fourmillement au loin)
    vec3 fc = floor(vWPos * 40.0); float h1 = fract(sin(dot(fc, vec3(41.3, 289.1, 97.7))) * 43758.5453);
    vec3 fn = normalize(nW + (vec3(h1, fract(h1 * 13.7), fract(h1 * 71.3)) - 0.5) * 0.9);
    float sp = pow(max(dot(reflect(-vd, fn), uSunW), 0.0), 600.0) * step(0.7, fract(h1 * 5.3));
    float px = length(fwidth(vWPos * 40.0));
    outgoingLight += vec3(1.0, 0.97, 0.92) * sp * 14.0 * vSun * (1.0 - W.w) * (1.0 - smoothstep(0.35, 0.9, px)); }
#include <opaque_fragment>`);
  };
  return m;
}

export function initFarGrid() {
  const n = farGrid.n, d = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = farGrid.o + i * farGrid.step, z = farGrid.o + j * farGrid.step; d[j * n + i] = Math.abs(x) < HALF && Math.abs(z) < HALF ? -1e4 : farHeight(x, z); }
  farGrid.d = d;
}

export function anyH(x, z) {
  if (Math.abs(x) < HALF && Math.abs(z) < HALF) return gridH(x, z);
  const g = farGrid, fx = clamp((x - g.o) / g.step, 0, g.n - 1.001), fz = clamp((z - g.o) / g.step, 0, g.n - 1.001), ix = fx | 0, iz = fz | 0, tx = fx - ix, tz = fz - iz, i = iz * g.n + ix;
  return lerp(lerp(g.d[i], g.d[i + 1], tx), lerp(g.d[i + g.n], g.d[i + g.n + 1], tx), tz);
}

export function sunVis(x, z, h0) {
  let maxEx = -1, d = 3;
  for (let i = 0; i < 46 && d < 4500; i++) {
    const ex = (anyH(x + SUN_HX * d, z + SUN_HZ * d) - (h0 + 0.5 + d * SUN_TAN)) / d;
    if (ex > maxEx) maxEx = ex;
    d = d * 1.14 + 2;
  }
  return smoothstep(0.04, -0.015, maxEx);
}

export function buildTerrainMesh() {
  const pos = new Float32Array(VN * VN * 3), col = new Float32Array(VN * VN * 3), aSnow = new Float32Array(VN * VN * 4), aDir = new Float32Array(VN * VN), aIce = new Float32Array(VN * VN);
  for (let iz = 0; iz < VN; iz++) for (let ix = 0; ix < VN; ix++) {
    const i = iz * VN + ix; pos[i * 3] = -HALF + ix * CELL; pos[i * 3 + 1] = heights[i]; pos[i * 3 + 2] = -HALF + iz * CELL;
  }
  const idx = [];
  for (let iz = 0; iz < N; iz++) for (let ix = 0; ix < N; ix++) { const a = iz * VN + ix, b = a + 1, c = a + VN, d = c + 1; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1));
  geo.computeVertexNormals();
  const nor = geo.attributes.normal.array;
  // forest floor darkening from tree density
  const DN = 175, dens = new Float32Array(DN * DN);
  for (let i = 0; i < trees.x.length; i++) { const gx = Math.floor((trees.x[i] + HALF) / 16), gz = Math.floor((trees.z[i] + HALF) / 16); if (gx >= 0 && gz >= 0 && gx < DN && gz < DN) dens[gz * DN + gx] += 1; }
  const liftNear = null;
  for (let iz = 0; iz < VN; iz++) for (let ix = 0; ix < VN; ix++) {
    const i = iz * VN + ix, x = -HALF + ix * CELL, z = -HALF + iz * CELL, ny = nor[i * 3 + 1], h = heights[i];
    const gw = groomW[i], off = 1 - gw;
    const zk = zIdx(x, z), cw = zk >= 0 ? smoothstep(0.35, 0.7, crudAt(x, z, zk, liftNear) + (snowGrid[zk] === SN.TRAFOLLE ? 0.3 : 0)) : 0;
    const rock = smoothstep(0.8, 0.6, ny) * (0.75 + 0.25 * perlin(x * 0.03, z * 0.03)) * (1 - gw * 0.85);
    aSnow[i * 4] = gw * (1 - rock); aSnow[i * 4 + 1] = off * (1 - cw) * (1 - rock); aSnow[i * 4 + 2] = off * cw * (1 - rock); aSnow[i * 4 + 3] = rock;
    aDir[i] = groomDir[i];
    aIce[i] = gw * smoothstep(0.9, 0.82, ny) + (zk >= 0 && snowGrid[zk] === SN.CULTURE ? 0.3 : 0);
    sunArr[i] = sunVis(x, z, h);
    // ambient occlusion: hollows and forest floor slightly darker, a hint of blue in the shade
    const avg = (gridH(x + 20, z) + gridH(x - 20, z) + gridH(x, z + 20) + gridH(x, z - 20)) / 4;
    const gx = Math.floor((x + HALF) / 16), gz = Math.floor((z + HALF) / 16);
    const den = gx >= 0 && gz >= 0 && gx < DN && gz < DN ? dens[gz * DN + gx] : 0;
    const ao = (1 - clamp((avg - h) * 0.006, 0, 0.1)) * (1 - 0.06 * Math.min(1, den / 3));
    col[i * 3] = 0.955 * ao; col[i * 3 + 1] = 0.97 * ao; col[i * 3 + 2] = 1.0 * ao;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSnow', new THREE.BufferAttribute(aSnow, 4));
  geo.setAttribute('aDir', new THREE.BufferAttribute(aDir, 1));
  geo.setAttribute('aIce', new THREE.BufferAttribute(aIce, 1));
  geo.setAttribute('aSun', new THREE.BufferAttribute(sunArr, 1));
  const mesh = new THREE.Mesh(geo, terrainMat);
  mesh.receiveShadow = true; mesh.castShadow = !IS_TOUCH; terrainMesh = mesh; mesh.layers.set(TERRAIN_LAYER); mesh.customDepthMaterial = terrainDepthMaterial();   // not in the far shadow map
  scene.add(mesh);
}

/** T4 : recalcule l'ensoleillement cuit par sommet après un changement d'heure (≈ 1 à 2 s, pas pendant le jeu). */
export function rebakeSun() {
  SUN_H = Math.hypot(SUN_DIR.x, SUN_DIR.z) || 1e-4; SUN_HX = SUN_DIR.x / SUN_H; SUN_HZ = SUN_DIR.z / SUN_H; SUN_TAN = SUN_DIR.y / SUN_H;
  for (let iz = 0; iz < VN; iz++) for (let ix = 0; ix < VN; ix++) { const i = iz * VN + ix; sunArr[i] = sunVis(-HALF + ix * CELL, -HALF + iz * CELL, heights[i]); }
  if (terrainMesh) terrainMesh.geometry.attributes.aSun.needsUpdate = true;
}

export function sunAt(x, z) {
  let gx = clamp((x + HALF) / CELL, 0, N - 1e-4), gz = clamp((z + HALF) / CELL, 0, N - 1e-4);
  const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz, i = iz * VN + ix;
  return lerp(lerp(sunArr[i], sunArr[i + 1], fx), lerp(sunArr[i + VN], sunArr[i + VN + 1], fx), fz);
}

export function __init_1374() {
TEX = {};
/* ---------------- MATERIALS (PBR) ----------------
   Every lit surface is a MeshStandardMaterial (MeshPhysicalMaterial for the skier's lacquer and fabrics).
   Surfaces without their own texture get a procedural micro-surface: a tiling noise texture sampled in world space
   along the dominant axis (no UVs needed, so it also works on the merged and instanced assemblies) varies the
   roughness and tilts the normal a little, so no surface renders as a flat uniform colour. */
GRAIN_TEX = (() => {
  const S = 128, h = tileNoise(S, 8, 9001, 4), r = tileNoise(S, 16, 9002, 3), d = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, hx = h[y * S + (x + 1) % S] - h[y * S + (x + S - 1) % S], hy = h[((y + 1) % S) * S + x] - h[((y + S - 1) % S) * S + x];
    d[i * 4] = clamp(128 + hx * 1100, 0, 255); d[i * 4 + 1] = clamp(128 + hy * 1100, 0, 255); d[i * 4 + 2] = clamp(r[i] * 255, 0, 255); d[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, S, S); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true; return t;
})();
// one shared hook (same source → one compiled program per material type); per-material strength in userData.grainU
// grainU = (normal tilt, roughness variation, texture repeats per metre)
grainHook = function (sh) {
  sh.uniforms.uGrain = { value: GRAIN_TEX }; sh.uniforms.uGrainAmt = this.userData.grainU || { value: new THREE.Vector3(0.3, 0.4, 1.5) };
  sh.vertexShader = patchShader(sh.vertexShader, '#include <common>', '#include <common>\nvarying vec3 vGPos;\nvarying vec3 vGNrm;', 'grain');
  sh.vertexShader = patchShader(sh.vertexShader, '#include <project_vertex>', `#include <project_vertex>
  { vec4 gp = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    gp = instanceMatrix * gp;
  #endif
    vGPos = ( modelMatrix * gp ).xyz; vGNrm = inverseTransformDirection( transformedNormal, viewMatrix ); }`, 'grain');
  sh.fragmentShader = patchShader(sh.fragmentShader, '#include <common>', '#include <common>\nuniform sampler2D uGrain;\nuniform vec3 uGrainAmt;\nvarying vec3 vGPos;\nvarying vec3 vGNrm;\n#ifdef USE_DETAIL\nuniform sampler2D uDetA;\nuniform sampler2D uDetN;\nuniform vec4 uDet;\n#endif', 'grain');
  if (this.userData.detail) { const D = this.userData.detail; sh.uniforms.uDetA = { value: D.a }; sh.uniforms.uDetN = { value: D.n }; sh.uniforms.uDet = { value: D.p }; }
  sh.fragmentShader = patchShader(sh.fragmentShader, '#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  vec3 gAx = abs( normalize( vGNrm ) ); bool gTop = gAx.y > max( gAx.x, gAx.z ), gSide = gAx.x > gAx.z;
  vec4 gS = texture2D( uGrain, ( gTop ? vGPos.xz : ( gSide ? vGPos.zy : vGPos.xy ) ) * uGrainAmt.z );
  roughnessFactor = clamp( roughnessFactor * ( 1.0 + ( gS.b - 0.5 ) * uGrainAmt.y ), 0.04, 1.0 );
  #ifdef USE_DETAIL
    // Blender-baked surface maps (timber, masonry) in world space: x = repeats per metre, y = relief, z = albedo, w = turn
    vec2 dUv = ( gTop ? vGPos.xz : ( gSide ? vGPos.zy : vGPos.xy ) ) * uDet.x;
    if ( uDet.w > 0.5 ) dUv = dUv.yx;
    diffuseColor.rgb *= mix( vec3( 1.0 ), texture2D( uDetA, dUv ).rgb / 0.214, uDet.z );
  #endif
  #ifdef USE_SNOWACC
    // T4 : neige accumulée sur les faces tournées vers le ciel (rebords, appuis, poutres, toits plats) ; bord irrégulier
    { float up = normalize( vGNrm ).y, nz = texture2D( uGrain, vGPos.xz * 0.37 ).b;
      float acc = smoothstep( 0.8, 0.97, up ) * smoothstep( 0.42, 0.62, nz + up * 0.2 );
      diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.86, 0.89, 0.93 ), acc * 0.6 );
      roughnessFactor = mix( roughnessFactor, 0.8, acc ); }
  #endif`, 'grain');
  sh.fragmentShader = patchShader(sh.fragmentShader, '#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  { vec3 t1 = gTop ? vec3( 1.0, 0.0, 0.0 ) : ( gSide ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 ) );
    vec3 t2 = gTop ? vec3( 0.0, 0.0, 1.0 ) : vec3( 0.0, 1.0, 0.0 );
    vec2 gd = ( gS.rg - 0.5 ) * uGrainAmt.x;
    normal = normalize( normal + mat3( viewMatrix ) * ( t1 * gd.x + t2 * gd.y ) );
  #ifdef USE_DETAIL
    vec3 dn = texture2D( uDetN, dUv ).xyz * 2.0 - 1.0; if ( uDet.w > 0.5 ) dn.xy = dn.yx;
    normal = normalize( normal + mat3( viewMatrix ) * ( t1 * dn.x + t2 * dn.y ) * uDet.y );
  #endif
  }`, 'grain');
};
metal = (o = {}) => pbr(Object.assign({ roughness: 0.42, metalness: 0.8 }, o), [0.12, 0.7, 3]);
lambertVC = (opts = {}) => pbr(Object.assign({ vertexColors: true }, opts));

/* sun visibility baked per vertex: march toward the sun over the heightfield (and the far mountains) */
farGrid = { o: -7000, step: 100, n: 141, d: null };
SUN_H = Math.hypot(SUN_DIR.x, SUN_DIR.z);
SUN_HX = SUN_DIR.x / SUN_H;
SUN_HZ = SUN_DIR.z / SUN_H;
SUN_TAN = SUN_DIR.y / SUN_H;

sunArr = new Float32Array(VN * VN);
groomDir = new Float32Array(VN * VN);
terrainMesh = null;
terrainMat = null;
}
