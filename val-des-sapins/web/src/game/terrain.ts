// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « terrain ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { nearestCannon } from './cannons';
import { V3, clamp, lerp, smoothstep } from './core';
import { groomDir, sunAt, terrainMat } from './materials';
import { LEVELS, LIFTS, PIPE, PISTES, SN, ZN, ZR, clearGrid, featH, inPipe, mogulWeight, nearKicker, patches, pipeLocal, pisteDist, rasterSeg, sampleSpline, smoothBase, snowGrid, tunnelLocal, tunnels, zIdx, zoneGrid } from './pistes';
import { TERRAIN_LAYER, scene } from './render';
import { BLEND, PLAGNE } from './world-data';

export let PERM, GX, GY, HALF, WORLD, N, CELL, VN, ALT0, WALLS, RIDGES, heights, groomW, rnd, trees, TC, obstacles, minimapImg;

export function __set_minimapImg(v) { return (minimapImg = v); }


/* ---------------- Noise ---------------- */
export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export function perlin(x, y) {
  let X = Math.floor(x), Y = Math.floor(y); const xf = x - X, yf = y - Y; X &= 255; Y &= 255;
  const aa = PERM[PERM[X] + Y] & 7, ab = PERM[PERM[X] + Y + 1] & 7, ba = PERM[PERM[X + 1] + Y] & 7, bb = PERM[PERM[X + 1] + Y + 1] & 7;
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const n00 = GX[aa] * xf + GY[aa] * yf, n10 = GX[ba] * (xf - 1) + GY[ba] * yf;
  const n01 = GX[ab] * xf + GY[ab] * (yf - 1), n11 = GX[bb] * (xf - 1) + GY[bb] * (yf - 1);
  const a = n00 + (n10 - n00) * u, b = n01 + (n11 - n01) * u;
  return (a + (b - a) * v) * 0.75;
}

export function fbm(x, y, oct) { let s = 0, a = 1, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += a * perlin(x * f + i * 17.1, y * f - i * 9.7); n += a; a *= 0.5; f *= 2.02; } return s / n; }

export function ridged(x, y, oct) { let s = 0, a = 0.5, f = 1, w = 1, n = 0; for (let i = 0; i < oct; i++) { let r = 1 - Math.abs(perlin(x * f + i * 31.3, y * f + i * 7.9)); r *= r; s += r * a * w; n += a; w = clamp(r * 1.6, 0, 1); a *= 0.5; f *= 2.05; } return s / n; }

export function baseHeight(x, z) {
  const t = clamp((z + HALF) / 2600, 0, 1);
  const ax = Math.abs(x);
  let y = 950 * Math.pow(1 - t, 1.55);
  y += 45 * smoothstep(-120, 220, z);           // replat de mi-station
  y += 70 * smoothstep(1240, 1400, z);          // verrou glaciaire sous le village
  y += 0.00011 * x * x * (0.55 + 0.45 * (1 - t));
  y += 540 * smoothstep(650, 1400, ax) * (0.45 + 0.55 * (1 - t));
  y += 620 * smoothstep(-1120, -1400, z) * (0.55 + 0.45 * smoothstep(0, 700, ax));
  for (const w of WALLS) {
    const m = smoothstep(w.x0, w.x1, x) * smoothstep(w.x3, w.x2, x);
    if (m > 0) y += w.B * m * (smoothstep(w.zA, w.z0, z) - smoothstep(w.z0, w.z1, z));
  }
  for (const r of RIDGES) {
    const k = Math.exp(-Math.pow((x - r.x) / r.w, 2));
    if (k > 0.001) y += r.h * k * smoothstep(r.za, r.zb, z) * smoothstep(r.zd, r.zc, z) * (0.85 + 0.15 * perlin(z * 0.01, x * 0.01));
  }
  const calm = 1 - smoothstep(0.8, 1.0, t);
  y += fbm(x * 0.0016 + 3.1, z * 0.0016 - 1.7, 4) * 55 * calm;
  const wild = clamp(smoothstep(520, 1300, ax) + 0.9 * smoothstep(-650, -1400, z), 0, 1);
  y += ridged(x * 0.0028 + 11.3, z * 0.0028 + 5.1, 5) * 200 * wild;
  y += fbm(x * 0.011, z * 0.011, 3) * (3 + 10 * wild) * (0.4 + 0.6 * calm);
  return y;
}

export function gridH(x, z) {
  let gx = (x + HALF) / CELL, gz = (z + HALF) / CELL;
  gx = clamp(gx, 0, N - 1e-4); gz = clamp(gz, 0, N - 1e-4);
  const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz, i = iz * VN + ix;
  const a = heights[i], b = heights[i + 1], c = heights[i + VN], d = heights[i + VN + 1];
  if (fx + fz <= 1) return a + (b - a) * fx + (c - a) * fz;
  return d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}

export function H(x, z) { return gridH(x, z) + featH(x, z); }

export function normalAt(x, z, out) {
  const e = nearKicker(x, z) || inPipe(x, z) ? 0.1 : 0.45;
  const hx = H(x + e, z) - H(x - e, z), hz = H(x, z + e) - H(x, z - e);
  return out.set(-hx, 2 * e, -hz).normalize();
}


export function genTerrain() {
  if (PLAGNE && BLEND.bin.height) { const g = BLEND.bin.height; for (let i = 0; i < g.length; i++) heights[i] = g[i] * 0.1; return; }   // decimetres above alt0
  for (let iz = 0; iz < VN; iz++) for (let ix = 0; ix < VN; ix++) heights[iz * VN + ix] = baseHeight(-HALF + ix * CELL, -HALF + iz * CELL);
}

export function genPistes() {
  const raw = heights.slice();
  const tSum = new Float32Array(VN * VN), wSum = new Float32Array(VN * VN);
  PISTES.forEach((p, idx) => {
    const S = sampleSpline(p.pts, 4);
    const sm = S.map(s => smoothBase(s.x, s.z));
    let hs = sm.slice();
    const g = p.minGrade ?? 0.055;
    const mono = () => { if (p.free) return; for (let i = 1; i < hs.length; i++) hs[i] = Math.min(hs[i], hs[i - 1] - g * 4); };
    mono();
    for (let pass = 0; pass < 8; pass++) { const c = hs.slice(); for (let i = 1; i < hs.length - 1; i++) hs[i] = (c[i - 1] + 2 * c[i] + c[i + 1]) / 4; }
    mono();
    if (p.real || p.link && PLAGNE) for (let i = 0; i < hs.length; i++) hs[i] = Math.max(hs[i], sm[i] - (p.flat !== undefined ? 6 : 2.5));   // real runs keep their flats and bumps: never dig more than a groomer would (a cat-track a little more, so it keeps going down)
    p.samples = S; p.hs = hs; p.color = LEVELS[p.lvl].c; p.idx = idx;
    p.maxCut = 0; for (let i = 0; i < hs.length; i++) p.maxCut = Math.max(p.maxCut, sm[i] - hs[i]);
    // tunnel span: the longest run where the piste would otherwise cut more than 10 m into a ridge
    p.tr = null;
    if (p.tunnel) {
      let best = null, cur = null;
      for (let i = 0; i < S.length; i++) {
        if (sm[i] - hs[i] > 10) { if (!cur) cur = [i, i]; else cur[1] = i; }
        else if (cur) { if (!best || cur[1] - cur[0] > best[1] - best[0]) best = cur; cur = null; }
      }
      if (cur && (!best || cur[1] - cur[0] > best[1] - best[0])) best = cur;
      if (best && best[1] - best[0] >= 6) { p.tr = best; tunnels.push({ name: p.tunnel, piste: p, S, hs, i0: best[0], i1: best[1], hw: 5, ceil: 6.4, len: (best[1] - best[0]) * 4 }); }
    }
    const cross = p.cross ?? 0.22;
    const hwAt = i => { if (!p.tr) return p.w / 2; const k = Math.min(Math.abs(i - p.tr[0]), Math.abs(i - p.tr[1])) * 4; return lerp(6, p.w / 2, smoothstep(0, 45, k)); };
    for (let i = 0; i < S.length - 1; i++) {
      if (p.tr && i >= p.tr[0] && i < p.tr[1]) continue;           // under the ridge: leave the mountain intact
      const capA = p.tr && i + 1 === p.tr[0], capB = p.tr && i === p.tr[1];
      const skip = t => (capA && t > 0.999) || (capB && t < 0.001);
      const a = S[i], b = S[i + 1], hw = hwAt(i), R = hw + 16;
      rasterSeg(CELL, N, a.x, a.z, b.x, b.z, R, (ix, iz, d, t) => {
        if (skip(t)) return;
        const vi = iz * VN + ix;
        const w = 1 - smoothstep(hw, R, d);
        const hc = lerp(hs[i], hs[i + 1], t), smc = lerp(sm[i], sm[i + 1], t);
        const target = hc + cross * (raw[vi] - smc);
        const ww = w * w * w * w + 1e-6;
        tSum[vi] += target * ww; wSum[vi] += ww;
        if (w > groomW[vi]) { groomW[vi] = w; groomDir[vi] = Math.atan2(b.x - a.x, b.z - a.z); }
      });
      if (!p.hidden) rasterSeg(ZR, ZN - 1, a.x, a.z, b.x, b.z, hw + 2, (ix, iz, d, t) => { if (!skip(t)) zoneGrid[iz * ZN + ix] = idx; });
      rasterSeg(ZR, ZN - 1, a.x, a.z, b.x, b.z, hw + 7, (ix, iz, d, t) => { if (!skip(t)) clearGrid[iz * ZN + ix] = 1; });
    }
  });
  for (let i = 0; i < heights.length; i++) if (groomW[i] > 0) heights[i] = lerp(heights[i], tSum[i] / wSum[i], groomW[i]);
  // keep trees off the ridge just above each portal (the portal galleries sit there)
  for (const T of tunnels) for (const [i, j] of [[T.i0 - 3, T.i0 + 4], [T.i1 - 4, T.i1 + 3]]) {
    const a = T.S[clamp(i, 0, T.S.length - 1)], b = T.S[clamp(j, 0, T.S.length - 1)];
    rasterSeg(ZR, ZN - 1, a.x, a.z, b.x, b.z, T.hw + 8, (ix, iz) => { clearGrid[iz * ZN + ix] = 1; });
  }
}

// La Plagne: the surveyed piste areas (wide slopes, snow fronts) are groomed over their real outline: no trees,
// groomed snow, counted as the run of the same name (or the nearest one)
export function inPoly(poly, x, z) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; }
  return c;
}

export function groomAreas() {
  if (!PLAGNE || !PLAGNE.areas) return;
  for (const a of PLAGNE.areas) {
    const xs = a.poly.map(p => p[0]), zs = a.poly.map(p => p[1]), cx = xs.reduce((s, v) => s + v, 0) / xs.length, cz = zs.reduce((s, v) => s + v, 0) / zs.length;
    let idx = PISTES.findIndex(p => !p.hidden && !p.link && p.name === a.name && p.lvl !== 'park');
    if (idx < 0) { let bd = Infinity; PISTES.forEach((p, i) => { if (p.hidden || p.lvl === 'park') return; for (const q of p.samples) { const d = (q.x - cx) ** 2 + (q.z - cz) ** 2; if (d < bd) { bd = d; idx = i; } } }); }
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    for (let z = Math.floor(z0 / ZR) * ZR; z <= z1; z += ZR) for (let x = Math.floor(x0 / ZR) * ZR; x <= x1; x += ZR) {
      if (!inPoly(a.poly, x + ZR / 2, z + ZR / 2)) continue;
      const k = zIdx(x + ZR / 2, z + ZR / 2); if (k < 0) continue;
      if (zoneGrid[k] < 0 && idx >= 0) zoneGrid[k] = idx; clearGrid[k] = 1;
    }
    for (let z = Math.floor(z0 / CELL) * CELL; z <= z1; z += CELL) for (let x = Math.floor(x0 / CELL) * CELL; x <= x1; x += CELL) {
      if (Math.abs(x) > HALF || Math.abs(z) > HALF || !inPoly(a.poly, x, z)) continue;
      const vi = Math.round((z + HALF) / CELL) * VN + Math.round((x + HALF) / CELL);
      if (groomW[vi] < 0.9) { groomW[vi] = 0.9; groomDir[vi] = Math.atan2(gridH(x - 3, z) - gridH(x + 3, z), gridH(x, z - 3) - gridH(x, z + 3)); }   // corduroy down the fall line
    }
  }
}

export function gradeLinks() {
  // each liaison becomes an even ramp from the end of its piste down to the lift's loading pad (cut and fill);
  // every liaison to the same lift arrives at one common height, and the pad is levelled to it
  const groups = new Map();
  for (const p of PISTES) if (p.link) { const S = p.samples, n = S.length; let L = 0; for (let i = 1; i < n; i++) L += Math.hypot(S[i].x - S[i - 1].x, S[i].z - S[i - 1].z);
    const g = groups.get(p.liftName) || []; g.push({ p, L, h0: gridH(S[0].x, S[0].z) }); groups.set(p.liftName, g); }
  for (const [, g] of groups) {
    const E = g[0].p.samples[g[0].p.samples.length - 1];
    let hE = gridH(E.x, E.z); const hE0 = hE; for (const k of g) hE = Math.min(hE, k.h0 - 0.03 * k.L);
    if (PLAGNE) hE = Math.max(hE, hE0 - 3);   // a real loading area is not dug out
    rasterSeg(CELL, N, E.x, E.z, E.x, E.z, 22, (ix, iz, d) => { const vi = iz * VN + ix; heights[vi] = lerp(heights[vi], hE, 1 - smoothstep(10, 22, d)); });
    const best = new Map();   // where liaisons converge, each snow cell follows the nearest ramp
    for (const { p, L, h0 } of g) {
      const S = p.samples, n = S.length, hw = p.w / 2, cum = [0];
      for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(S[i].x - S[i - 1].x, S[i].z - S[i - 1].z));
      const Lr = L > 44 ? L - 18 : L, tgt = cum.map(c => { const u = Math.min(1, c / Lr); return h0 + (hE - h0) * (u * u * (3 - 2 * u) * 0.35 + u * 0.65); });
      const R = hw + 8;
      for (let i = 0; i < n - 1; i++) rasterSeg(CELL, N, S[i].x, S[i].z, S[i + 1].x, S[i + 1].z, R, (ix, iz, dist, t) => {
        const vi = iz * VN + ix, w = (1 - smoothstep(hw * 0.8, R, dist)) * smoothstep(-4, 8, cum[i] + t * (cum[i + 1] - cum[i])), y = tgt[i] + (tgt[i + 1] - tgt[i]) * t, o = best.get(vi);
        if (w > 0 && (!o || dist < o.d)) best.set(vi, { w, y, d: dist });
      });
    }
    for (const [vi, o] of best) heights[vi] += (o.y - heights[vi]) * o.w;
  }
}

export function drainPistes(onlyLinks) {
  // where pistes overlap (around the stations) their grooming can leave a rise: lower the snow down to a profile that
  // keeps going down (never below it, so overlapping corrections cannot add up into a trench)
  for (let pass = 0; pass < 2; pass++) for (const p of PISTES) {
    if (p.hidden || p.lvl === 'park' || (onlyLinks && !p.link)) continue;
    const S = p.samples, n = S.length, hw = p.w / 2, g0 = (p.link ? 0.02 : 0.015) * 4, prof = new Float32Array(n), skip = new Uint8Array(n);
    const g = i => p.startGrade && i * 4 < p.startGrade[1] ? p.startGrade[0] * 4 : g0;   // a run can be cut to leave its start at a set grade
    prof[0] = gridH(S[0].x, S[0].z);
    for (let i = 1; i < n; i++) {
      const h = gridH(S[i].x, S[i].z);
      if (p.tr && i >= p.tr[0] - 1 && i <= p.tr[1] + 1) { skip[i] = 1; prof[i] = h; continue; }
      prof[i] = Math.min(h, prof[i - 1] - g(i));
      if (PLAGNE) prof[i] = Math.max(prof[i], h - 2);   // real terrain: smooth out the overlaps, never trench
    }
    const best = new Map();
    for (let i = 0; i < n - 1; i++) {
      if (skip[i] || skip[i + 1]) continue;
      rasterSeg(CELL, N, S[i].x, S[i].z, S[i + 1].x, S[i + 1].z, hw + 6, (ix, iz, dist, t) => {
        const vi = iz * VN + ix, w = 1 - smoothstep(hw * 0.7, hw + 6, dist), y = prof[i] + (prof[i + 1] - prof[i]) * t, o = best.get(vi);
        if (!o || w > o.w) best.set(vi, { w, y });
      });
    }
    for (const [vi, o] of best) if (heights[vi] > o.y) heights[vi] -= (heights[vi] - o.y) * o.w;
  }
}

// summit arrival: a platform a few metres above the starts of Le Couloir and La Grande Combe, so you leave the
// chairlift (and start the game) at the top of the domain and can ski down into either run
export function shapeSummit() {
  const L = LIFTS.find(l => l.name === 'Télésiège du Sommet'); if (!L) return;
  const [ex, ez] = L.exit, top = Math.max(gridH(90, -1120), gridH(40, -1118), gridH(ex, ez)) + 4;
  rasterSeg(CELL, N, ex, ez, ex, ez, 46, (ix, iz, d) => {
    const vi = iz * VN + ix, w = 1 - smoothstep(12, 46, d), t = top - d * 0.06;   // gentle crown, falling away on every side
    heights[vi] = Math.max(heights[vi], lerp(heights[vi], t, w));
  });
}

export function shapePipe() {
  const p = PISTES.find(q => q.pipe); if (!p) return;
  const A = p.samples[0], B = p.samples[p.samples.length - 1], L = Math.hypot(B.x - A.x, B.z - A.z);
  Object.assign(PIPE, { ax: A.x, az: A.z, dx: (B.x - A.x) / L, dz: (B.z - A.z) / L, L });
  const hA = gridH(A.x, A.z), grade = Math.max(0.22, (hA - gridH(B.x, B.z)) / L); PIPE.hA = hA; PIPE.grade = grade;
  const reach = PIPE.halfW + 16;
  rasterSeg(CELL, N, A.x - PIPE.dx * 22, A.z - PIPE.dz * 22, B.x + PIPE.dx * 22, B.z + PIPE.dz * 22, reach, (ix, iz) => {
    const x = -HALF + ix * CELL, z = -HALF + iz * CELL, q = pipeLocal(x, z), vi = iz * VN + ix;
    const target = hA - grade * clamp(q.s, -22, L + 22);
    const w = (1 - smoothstep(PIPE.halfW + 6, reach, Math.abs(q.w))) * smoothstep(-22, -8, q.s) * (1 - smoothstep(L + 8, L + 22, q.s));
    heights[vi] = lerp(heights[vi], target, w);
  });
  PIPE.on = true;
}

export function carvePortals() {
  // a cutting in front of each portal down to the tunnel floor, and solid ground kept above the tube
  for (const T of tunnels) {
    let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
    for (let i = Math.max(0, T.i0 - 5); i <= Math.min(T.S.length - 1, T.i1 + 5); i++) { a = Math.min(a, T.S[i].x); b = Math.max(b, T.S[i].x); c = Math.min(c, T.S[i].z); d = Math.max(d, T.S[i].z); }
    const ix0 = Math.max(0, Math.floor((a - 25 + HALF) / CELL)), ix1 = Math.min(N, Math.ceil((b + 25 + HALF) / CELL)), iz0 = Math.max(0, Math.floor((c - 25 + HALF) / CELL)), iz1 = Math.min(N, Math.ceil((d + 25 + HALF) / CELL));
    for (let iz = iz0; iz <= iz1; iz++) for (let ix = ix0; ix <= ix1; ix++) {
      const x = -HALF + ix * CELL, z = -HALF + iz * CELL, tl = tunnelLocal(T, x, z, 3); if (!tl) continue;
      const aw = Math.abs(tl.w), vi = iz * VN + ix;
      if (aw > T.hw + 1.6) continue;
      const atPortal = (tl.s > -9 && tl.s < 4) || (tl.s > T.len - 4 && tl.s < T.len + 9);
      if (atPortal) heights[vi] = Math.min(heights[vi], tl.y - 0.05);
      else if (tl.s >= 4 && tl.s <= T.len - 4) heights[vi] = Math.max(heights[vi], tl.y + T.ceil + 1.6);
    }
  }
}

export function flattenPad(x, z, r0, r1) {
  const hC = gridH(x, z);
  rasterSeg(CELL, N, x, z, x, z, r1, (ix, iz, d) => { const vi = iz * VN + ix; heights[vi] = lerp(heights[vi], hC, 1 - smoothstep(r0, r1, d)); });
}

export function mogulKernel(s, w) {
  const LS = 5.0, LW = 5.4, R = 2.75; let best = 0;
  const r0 = Math.floor(s / LS);
  for (let r = r0 - 1; r <= r0 + 1; r++) {
    const off = (r & 1) * LW * 0.5 + r * 0.7;
    const c0 = Math.round((w - off) / LW);
    for (let c = c0 - 1; c <= c0 + 1; c++) {
      const h1 = Math.abs(Math.sin(r * 127.1 + c * 311.7) * 43758.5453) % 1, h2 = Math.abs(Math.sin(r * 269.5 + c * 183.3) * 24634.6345) % 1;
      const cs = r * LS + (h1 - 0.5) * 1.4, cw = c * LW + off + (h2 - 0.5) * 1.6;
      const ds = (s - cs) * (s < cs ? 1.05 : 0.85), dw = w - cw;      // a touch steeper on the uphill face
      const q = (ds * ds + dw * dw) / (R * R);
      if (q < 1) { const k = (1 - q) * (1 - q) * (0.8 + 0.4 * h1); if (k > best) best = k; }
    }
  }
  return best;
}

export function genMoguls() {
  PISTES.forEach(p => {
    if (!p.moguls) return;
    const [d0, d1] = p.moguls, S = p.samples, hw = p.w / 2;
    const i0 = clamp(Math.floor(d0 / 4) - 1, 0, S.length - 2), i1 = clamp(Math.ceil(d1 / 4) + 1, 1, S.length - 1);
    let mnx = 1e9, mnz = 1e9, mxx = -1e9, mxz = -1e9;
    for (let i = i0; i <= i1; i++) { mnx = Math.min(mnx, S[i].x); mxx = Math.max(mxx, S[i].x); mnz = Math.min(mnz, S[i].z); mxz = Math.max(mxz, S[i].z); }
    const res = 0.5, pad = hw + 3, x0 = Math.floor(mnx - pad), z0 = Math.floor(mnz - pad);
    const nx = Math.ceil((mxx + pad - x0) / res) + 1, nz = Math.ceil((mxz + pad - z0) / res) + 1;
    const h = new Float32Array(nx * nz), wgt = new Float32Array(nx * nz), best = new Float32Array(nx * nz).fill(1e9), dir = new Float32Array(nx * nz);
    for (let i = i0; i < i1; i++) {
      const a = S[i], b = S[i + 1], dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1, l = Math.sqrt(l2), R = hw + 1;
      const gx0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - R - x0) / res)), gx1 = Math.min(nx - 1, Math.ceil((Math.max(a.x, b.x) + R - x0) / res));
      const gz0 = Math.max(0, Math.floor((Math.min(a.z, b.z) - R - z0) / res)), gz1 = Math.min(nz - 1, Math.ceil((Math.max(a.z, b.z) + R - z0) / res));
      for (let gz = gz0; gz <= gz1; gz++) for (let gx = gx0; gx <= gx1; gx++) {
        const x = x0 + gx * res, z = z0 + gz * res;
        const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / l2, 0, 1), cx = a.x + dx * t, cz = a.z + dz * t, d = Math.hypot(x - cx, z - cz);
        const k = gz * nx + gx;
        if (d >= R || d >= best[k]) continue;
        best[k] = d;
        const s = (i + t) * 4, w = -(x - cx) * dz / l + (z - cz) * dx / l;
        const fade = smoothstep(d0, d0 + 18, s) * smoothstep(d1, d1 - 18, s) * (1 - smoothstep(hw - 4, hw - 0.5, Math.abs(w)));
        wgt[k] = fade; h[k] = 0.95 * mogulKernel(s, w) * fade; dir[k] = Math.atan2(dx, dz);
      }
    }
    patches.push({ piste: p, x0, z0, res, nx, nz, x1: x0 + (nx - 1) * res, z1: z0 + (nz - 1) * res, h, wgt, dir });
  });
}

export function genSnowGrid() {
  PISTES.forEach(p => {
    if (p.hidden) return;
    const S = p.samples, hw = p.w / 2;
    for (let i = 0; i < S.length - 1; i++) {
      if (p.tr && i >= p.tr[0] && i < p.tr[1]) continue;
      rasterSeg(ZR, ZN - 1, S[i].x, S[i].z, S[i + 1].x, S[i + 1].z, hw + 90, (ix, iz, d) => { const k = iz * ZN + ix, e = Math.max(0, d - hw); if (e < pisteDist[k]) pisteDist[k] = e; });
    }
  });
  const liftNear = (x, z) => LIFTS.some(L => { const ax = L.b[0], az = L.b[1], bx = L.t[0], bz = L.t[1], dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1); return Math.hypot(x - ax - dx * t, z - az - dz * t) < 30; });
  const nrm = new V3();
  for (let iz = 0; iz < ZN; iz++) for (let ix = 0; ix < ZN; ix++) {
    const k = iz * ZN + ix, x = -HALF + (ix + 0.5) * ZR, z = -HALF + (iz + 0.5) * ZR, zone = zoneGrid[k];
    let t;
    if (zone >= 0) {
      const p = PISTES[zone];
      if (mogulWeight(x, z) > 0.25) t = SN.BOSSES;
      else if (p.lvl === 'park') t = SN.PARK;
      else { normalAt(x, z, nrm); t = nrm.y < 0.86 ? SN.GLACEE : nearestCannon(x, z) < 34 ? SN.CULTURE : SN.DAMEE; }
    } else t = crudAt(x, z, k, liftNear) > 0.5 ? SN.TRAFOLLE : SN.POUDREUSE;
    snowGrid[k] = t;
  }
}

export function crudAt(x, z, k, liftNear) {
  let c = smoothstep(35, 8, pisteDist[k]) * 0.55;
  c += smoothstep(0.46, 0.6, fbm(x * 0.006 + 9, z * 0.006 - 4, 3)) * 0.7;
  if (liftNear && liftNear(x, z)) c += 0.3;
  return c;
}


/* ---------------- Mogul fields: fine mesh over the same height grid the physics reads ---------------- */
export function buildPipeMesh() {
  if (!PIPE.on) return;
  const ds = 1.0, dw = 0.3, W = PIPE.halfW + 1.6, ns = Math.ceil(PIPE.L / ds) + 1, nw = Math.ceil(2 * W / dw) + 1, n = ns * nw;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), aSnow = new Float32Array(n * 4), aDir = new Float32Array(n), aSun = new Float32Array(n), aIce = new Float32Array(n);
  const heading = Math.atan2(PIPE.dx, PIPE.dz);
  for (let j = 0; j < ns; j++) for (let i = 0; i < nw; i++) {
    const k = j * nw + i, sAl = Math.min(PIPE.L, j * ds), w = -W + i * (2 * W / (nw - 1));
    const x = PIPE.ax + PIPE.dx * sAl - PIPE.dz * w, z = PIPE.az + PIPE.dz * sAl + PIPE.dx * w;
    pos[k * 3] = x; pos[k * 3 + 1] = H(x, z) + 0.03; pos[k * 3 + 2] = z;
    const wall = Math.abs(w) < PIPE.halfW ? smoothstep(PIPE.F, PIPE.halfW, Math.abs(w)) : 0;
    col[k * 3] = 0.95; col[k * 3 + 1] = 0.965; col[k * 3 + 2] = 1.0;
    aSnow[k * 4] = 1; aDir[k] = heading; aSun[k] = sunAt(x, z); aIce[k] = wall * 0.45;   // walls polished by the riders
  }
  const idx = new Uint32Array((ns - 1) * (nw - 1) * 6); let q = 0;
  for (let j = 0; j < ns - 1; j++) for (let i = 0; i < nw - 1; i++) { const a = j * nw + i, b = a + 1, c = a + nw, d = c + 1; idx.set([a, b, c, b, d, c], q); q += 6; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
  // faces must point up (see the ski tracks bug): flip the winding if the bottom of the pipe faces down
  if (g.attributes.normal.getY(Math.floor(ns / 2) * nw + Math.floor(nw / 2)) < 0) { for (let t = 0; t < idx.length; t += 3) { const x = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = x; } g.index.needsUpdate = true; g.computeVertexNormals(); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSnow', new THREE.BufferAttribute(aSnow, 4)); g.setAttribute('aDir', new THREE.BufferAttribute(aDir, 1));
  g.setAttribute('aSun', new THREE.BufferAttribute(aSun, 1)); g.setAttribute('aIce', new THREE.BufferAttribute(aIce, 1));
  const mat = terrainMat.clone(); mat.onBeforeCompile = terrainMat.onBeforeCompile; mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -4;
  mat.defines = Object.assign({}, mat.defines, { NO_CUTOUT: '' });   // the pipe surface is exactly what the cut-out makes room for
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = true; m.layers.set(TERRAIN_LAYER); scene.add(m);
}

export function buildMogulMeshes() {
  for (const p of patches) {
    const { nx, nz, res, x0, z0 } = p, pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), aSnow = new Float32Array(nx * nz * 4), aDir = new Float32Array(nx * nz), aSun = new Float32Array(nx * nz), aIce = new Float32Array(nx * nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, x = x0 + i * res, z = z0 + j * res;
      pos[k * 3] = x; pos[k * 3 + 1] = gridH(x, z) + p.h[k] + 0.035; pos[k * 3 + 2] = z;
      col[k * 3] = 0.95; col[k * 3 + 1] = 0.965; col[k * 3 + 2] = 1.0;
      aSnow[k * 4] = 0.45; aSnow[k * 4 + 2] = 0.55; aDir[k] = p.dir[k]; aSun[k] = sunAt(x, z);
    }
    const idx = [];
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      if (p.wgt[a] + p.wgt[b] + p.wgt[c] + p.wgt[d] < 0.01) continue;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx), 1)); g.computeVertexNormals();
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSnow', new THREE.BufferAttribute(aSnow, 4)); g.setAttribute('aDir', new THREE.BufferAttribute(aDir, 1)); g.setAttribute('aSun', new THREE.BufferAttribute(aSun, 1)); g.setAttribute('aIce', new THREE.BufferAttribute(aIce, 1));
    const mat = terrainMat.clone(); mat.onBeforeCompile = terrainMat.onBeforeCompile; mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -4;
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = true; scene.add(m);
  }
}

export function __init_670() {
PERM = new Uint8Array(512);
(() => { const p = []; for (let i = 0; i < 256; i++) p[i] = i; const r = mulberry32(73021); for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; })();
GX = [1, -1, 1, -1, 1.41, -1.41, 0, 0];
GY = [1, 1, -1, -1, 0, 0, 1.41, -1.41];

/* ---------------- World ---------------- */
HALF = 1400;
WORLD = 2800;
N = 448;
CELL = WORLD / N;
VN = N + 1;
ALT0 = PLAGNE ? PLAGNE.meta.alt0 : 1480;
// "replat puis mur": a gentle shelf above a steep pitch, localized across the slope (never creates a closed hollow)
WALLS = [
  { name: 'Mur du Couloir', x0: 120, x1: 250, x2: 420, x3: 540, zA: -900, z0: -560, z1: -330, B: 82 },
  { name: "Mur de l'Est", x0: 560, x1: 620, x2: 760, x3: 830, zA: -330, z0: 380, z1: 560, B: 58 },
];
// ridges running down the fall line, pierced by tunnels
RIDGES = [
  { x: 420, w: 55, h: 72, za: -760, zb: -560, zc: 140, zd: 320 },
  { x: -400, w: 40, h: 56, za: -470, zb: -400, zc: -150, zd: -90 },
];
heights = new Float32Array(VN * VN);
groomW = new Float32Array(VN * VN);
}

export function __init_952() {

/* ---------------- Generation ---------------- */
rnd = mulberry32(9917);
trees = { x: [], z: [], s: [], grid: new Map() };
TC = 16;
obstacles = [];
 // circles {x,z,r}
minimapImg = null;
}

export function __init_1747() {

}
