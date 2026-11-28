// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « pistes ») ; typage strict progressif à venir.
/* eslint-disable */

import { clamp, lerp, smoothstep } from './core';
import { HALF, WORLD, gridH } from './terrain';
import { PLAGNE } from './world-data';

export let LEVELS, PISTES, LIFTS, SPAWN_LIFT, SNOW, SKI, SN, ZR, ZN, zoneGrid, clearGrid, pisteDist, snowGrid, zIdx, pisteHeading, kickers, rails, patches, PIPE, tunnels;


export function zoneAt(x, z) { const i = zIdx(x, z); return i < 0 ? -1 : zoneGrid[i]; }

export function isClear(x, z) { const i = zIdx(x, z); return i < 0 ? true : clearGrid[i] === 1; }

export function snowAt(x, z) { const i = zIdx(x, z); return i < 0 ? SN.POUDREUSE : snowGrid[i]; }

export function rasterSeg(res, n, ax, az, bx, bz, R, cb) {
  const minX = Math.max(0, Math.floor((Math.min(ax, bx) - R + HALF) / res)), maxX = Math.min(n, Math.ceil((Math.max(ax, bx) + R + HALF) / res));
  const minZ = Math.max(0, Math.floor((Math.min(az, bz) - R + HALF) / res)), maxZ = Math.min(n, Math.ceil((Math.max(az, bz) + R + HALF) / res));
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  for (let iz = minZ; iz <= maxZ; iz++) for (let ix = minX; ix <= maxX; ix++) {
    const px = -HALF + ix * res, pz = -HALF + iz * res;
    const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
    const cx = ax + dx * t, cz = az + dz * t, d = Math.hypot(px - cx, pz - cz);
    if (d < R) cb(ix, iz, d, t);
  }
}

export function sampleSpline(pts, step) {
  const P = pts.map(p => ({ x: p[0], z: p[1] })); const dense = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const n = Math.max(4, Math.ceil(Math.hypot(p2.x - p1.x, p2.z - p1.z) / 1.5));
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      dense.push({ x: f(p0.x, p1.x, p2.x, p3.x), z: f(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  dense.push({ x: P[P.length - 1].x, z: P[P.length - 1].z });
  const out = [{ ...dense[0] }]; let acc = 0;
  for (let i = 1; i < dense.length; i++) {
    let a = dense[i - 1]; const b = dense[i]; let d = Math.hypot(b.x - a.x, b.z - a.z);
    while (acc + d >= step) { const r = (step - acc) / d; const p = { x: a.x + (b.x - a.x) * r, z: a.z + (b.z - a.z) * r }; out.push(p); a = p; d = Math.hypot(b.x - a.x, b.z - a.z); acc = 0; }
    acc += d;
  }
  const L = dense[dense.length - 1], O = out[out.length - 1];
  if (Math.hypot(L.x - O.x, L.z - O.z) > step * 0.3) out.push({ ...L });
  return out;
}

export function smoothBase(x, z) {
  let s = 0; const r = 12;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) s += gridH(x + i * r, z + j * r);
  return s / 9;
}

export function pipeLocal(x, z) {   // s along the pipe from its top, w across (signed)
  const dx = x - PIPE.ax, dz = z - PIPE.az; return { s: dx * PIPE.dx + dz * PIPE.dz, w: -dx * PIPE.dz + dz * PIPE.dx };
}

export function pipeProfile(aw) {   // height of the pipe surface relative to the deck (<= 0)
  if (aw >= PIPE.halfW) return 0;
  if (aw <= PIPE.F) return -PIPE.depth;
  const th = Math.asin(Math.min(1, (aw - PIPE.F) / PIPE.R)); return -PIPE.depth + PIPE.R * (1 - Math.cos(th));
}

export function pipeH(x, z) {
  if (!PIPE.on) return 0;
  const q = pipeLocal(x, z); if (q.s < 0 || q.s > PIPE.L || Math.abs(q.w) >= PIPE.halfW) return 0;
  const fade = smoothstep(0, 14, q.s) * (1 - smoothstep(PIPE.L - 10, PIPE.L, q.s));   // drop-in at the top, run-out at the bottom
  return pipeProfile(Math.abs(q.w)) * fade;
}

export function inPipe(x, z, m = 1) { if (!PIPE.on) return false; const q = pipeLocal(x, z); return q.s > -m && q.s < PIPE.L + m && Math.abs(q.w) < PIPE.halfW + m; }

export function nearKicker(x, z) { for (const k of kickers) { const dx = x - k.x, dz = z - k.z; if (dx * dx + dz * dz < k.R2 + 40) return true; } return false; }

export function patchSample(p, arr, x, z) {
  const gx = (x - p.x0) / p.res, gz = (z - p.z0) / p.res;
  if (gx < 0 || gz < 0 || gx >= p.nx - 1 || gz >= p.nz - 1) return 0;
  const ix = gx | 0, iz = gz | 0, fx = gx - ix, fz = gz - iz, i = iz * p.nx + ix;
  return lerp(lerp(arr[i], arr[i + 1], fx), lerp(arr[i + p.nx], arr[i + p.nx + 1], fx), fz);
}

export function mogulWeight(x, z) { let w = 0; for (const p of patches) w = Math.max(w, patchSample(p, p.wgt, x, z)); return w; }

export function featH(x, z) {
  let h = 0;
  for (let i = 0; i < kickers.length; i++) {
    const k = kickers[i]; const dx = x - k.x, dz = z - k.z;
    if (dx * dx + dz * dz > k.R2) continue;
    const u = dx * k.dx + dz * k.dz; if (u < 0) continue;
    const w = Math.abs(-dx * k.dz + dz * k.dx); if (w > k.W / 2 + 1.2) continue;
    let p;
    if (u < k.L) p = k.H * Math.pow(u / k.L, 2.2);
    else if (u < k.L + k.T) p = k.H;
    else if (u < k.L + k.T + k.D) p = k.H * (1 - smoothstep(0, 1, (u - k.L - k.T) / k.D));
    else continue;
    if (w > k.W / 2) p *= 1 - smoothstep(k.W / 2, k.W / 2 + 1.2, w);
    if (p > h) h = p;
  }
  for (let i = 0; i < patches.length; i++) { const p = patches[i]; if (x >= p.x0 && z >= p.z0 && x < p.x1 && z < p.z1) h += patchSample(p, p.h, x, z); }
  return h + pipeH(x, z);
}

export function tunnelLocal(T, x, z, margin) {
  const a0 = Math.max(0, T.i0 - margin), a1 = Math.min(T.S.length - 1, T.i1 + margin);
  let bi = -1, bt = 0, bd = 1e9, bx = 0, bz = 0, ux = 0, uz = 0;
  for (let i = a0; i < a1; i++) {
    const A = T.S[i], B = T.S[i + 1], dx = B.x - A.x, dz = B.z - A.z, l2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - A.x) * dx + (z - A.z) * dz) / l2, 0, 1), cx = A.x + dx * t, cz = A.z + dz * t, d = Math.hypot(x - cx, z - cz);
    if (d < bd) { bd = d; bi = i; bt = t; bx = cx; bz = cz; const l = Math.sqrt(l2); ux = dx / l; uz = dz / l; }
  }
  if (bi < 0 || bd > T.hw + 10) return null;
  return { s: (bi - T.i0 + bt) * 4, w: -(x - bx) * uz + (z - bz) * ux, y: lerp(T.hs[bi], T.hs[bi + 1], bt), px: -uz, pz: ux, ux, uz };
}

export function __init_740() {

/* ---------------- Pistes & lifts data ---------------- */
LEVELS = {
  verte: { c: '#2fa84f', label: 'Piste verte' }, bleue: { c: '#2f6fe0', label: 'Piste bleue' },
  rouge: { c: '#e0393e', label: 'Piste rouge' }, noire: { c: '#0f1216', label: 'Piste noire' },
  park: { c: '#f08a24', label: 'Snowpark' }, track: { c: '#ffffff', label: 'Piste de téléski' }
};
PISTES = [
  { name: 'Le Couloir', lvl: 'noire', w: 22, startGrade: [0.06, 40], pts: [[50, -1104], [95, -1098], [145, -1058], [230, -950], [320, -700], [300, -450], [120, -200], [-50, 60]], wall: true },
  { name: 'La Grande Combe', lvl: 'rouge', w: 34, pts: [[44, -1108], [-120, -900], [-260, -620], [-300, -350], [-220, -100], [-130, 70]], moguls: [560, 820] },
  // crossings between the red and the black: across the upper combe to Le Couloir, and lower down from Le Couloir back to the combe
  { name: 'Traversée du Col', lvl: 'bleue', w: 18, pts: [[-58, -991], [40, -950], [150, -905], [238, -874]], minGrade: 0.05, cross: 0.08, noLink: true },
  { name: 'Traversée des Chamois', lvl: 'rouge', w: 18, pts: [[320, -690], [200, -640], [60, -600], [-90, -570], [-262, -560]], minGrade: 0.04, cross: 0.08, noLink: true },
  { name: 'Le Balcon', lvl: 'bleue', w: 26, pts: [[615, -160], [420, -140], [170, -50], [-50, 75]], tunnel: 'Tunnel du Balcon' },
  { name: "Le Mur de l'Est", lvl: 'noire', w: 30, pts: [[650, -160], [700, 150], [690, 470], [640, 640], [578, 845]], wall: true, moguls: [700, 960] },
  { name: 'Les Sapins', lvl: 'bleue', w: 30, pts: [[-100, 172], [60, 380], [250, 620], [230, 860], [90, 1090]] },
  { name: 'Retour Village', lvl: 'verte', w: 32, pts: [[-170, 172], [-340, 420], [-380, 700], [-300, 950], [-130, 1120]] },
  { name: 'Les Écureuils', lvl: 'bleue', w: 28, pts: [[560, 902], [400, 1010], [190, 1112]] },
  { name: 'Liaison Snowpark', lvl: 'bleue', w: 24, pts: [[-295, -330], [-420, -200], [-515, -70]], tunnel: 'Tunnel des Marmottes' },
  { name: 'Snowpark', lvl: 'park', w: 56, pts: [[-515, -60], [-510, 140], [-495, 390]], minGrade: 0.16, cross: 0.06 },
  { name: 'Half-pipe', lvl: 'park', w: 30, pts: [[-572, 22], [-572, 176]], minGrade: 0.14, cross: 0.0, pipe: true, noLink: true },
  { name: 'Sortie half-pipe', lvl: 'bleue', w: 18, pts: [[-572, 178], [-567, 212], [-543, 248], [-518, 272]], minGrade: 0.04, cross: 0.08, noLink: true },   // rejoins the Snowpark
  { name: 'Accès half-pipe', lvl: 'verte', w: 16, pts: [[-514, -42], [-545, -14], [-570, 12]], minGrade: 0.03, cross: 0.1 },
  { name: 'Les Marmottes', lvl: 'verte', w: 40, pts: [[-245, 950], [-200, 1150]] },
];
LIFTS = [
  { name: 'Télécabine du Village', code: 'TC', type: 'gondola', b: [40, 1135], t: [-140, 105], exit: [-132, 152], speed: 7, spacing: 42, off: 3.2 },
  { name: 'Télésiège du Sommet', code: 'TSD', type: 'chair', b: [-95, 95], t: [65, -1152], exit: [46, -1104], speed: 7, spacing: 26, off: 2.6 },
  { name: 'Télésiège de la Forêt', code: 'TSD', type: 'chair', b: [592, 880], t: [650, -197], exit: [632, -150], speed: 7, spacing: 26, off: 2.6 },
  { name: 'Téléski du Snowpark', code: 'TK', type: 'tbar', b: [-450, 398], t: [-470, -76], exit: [-512, -50], speed: 4.5, spacing: 16, off: 1.3 },
  { name: 'Téléski des Marmottes', code: 'TK', type: 'tbar', b: [-165, 1166], t: [-235, 934], exit: [-243, 958], speed: 3.8, spacing: 16, off: 1.3 },
];
// La Plagne: the real runs and lifts replace the procedural ones (same arrays, so every reference stays valid)
if (PLAGNE) {
  PISTES.length = 0; LIFTS.length = 0;
  const W = { verte: 30, bleue: 28, rouge: 26, noire: 24 };
  for (const r of PLAGNE.runs) PISTES.push({ name: r.name, minor: !!(r.anon || r.minor), lvl: r.lvl, w: r.flat !== undefined ? 16 : W[r.lvl] || 26, pts: r.pts, real: true, flat: r.flat,
    minGrade: r.flat !== undefined ? Math.max(0.004, r.flat * 0.6) : 0.03, cross: r.flat !== undefined ? 0.1 : 0.22 });
  const SPEC = { chair: { speed: 7, spacing: 26, off: 2.6 }, gondola: { speed: 7, spacing: 42, off: 3.2 }, tbar: { speed: 4.2, spacing: 16, off: 1.3 } };
  // the arrival point: a little below the top station, on the side of the nearest run start
  const starts = PLAGNE.runs.map(r => r.pts[0]);
  for (const L of PLAGNE.lifts) {
    const l = Math.hypot(L.t[0] - L.b[0], L.t[1] - L.b[1]), dx = (L.t[0] - L.b[0]) / l, dz = (L.t[1] - L.b[1]) / l, back = L.type === 'tbar' ? 22 : 46, sideOff = L.type === 'tbar' ? 20 : 10;
    const cand = [1, -1].map(sd => [L.t[0] - dx * back + dz * sd * sideOff, L.t[1] - dz * back - dx * sd * sideOff]);
    const near = c => Math.min(...starts.map(q => Math.hypot(q[0] - c[0], q[1] - c[1])));
    // you get off where a run starts, when one starts by the station (a few metres down it)
    const head = PLAGNE.runs.map(r => r.pts).filter(q => Math.hypot(q[0][0] - L.t[0], q[0][1] - L.t[1]) < 140)
      .sort((a, c) => Math.hypot(a[0][0] - L.t[0], a[0][1] - L.t[1]) - Math.hypot(c[0][0] - L.t[0], c[0][1] - L.t[1]))[0];
    const onRun = head && (() => { const [a, c] = head, k = 6 / Math.max(6, Math.hypot(c[0] - a[0], c[1] - a[1])); return [a[0] + (c[0] - a[0]) * k, a[1] + (c[1] - a[1]) * k]; })();
    LIFTS.push({ name: L.name, code: L.code, type: L.type, b: L.b, t: L.t, exit: onRun || (near(cand[0]) <= near(cand[1]) ? cand[0] : cand[1]), ...SPEC[L.type] });
  }
  // the game's snowpark and half-pipe (not surveyed: additions). The park takes over SuperSlalom, the run beside the
  // Dromadaire drag lift at Aime 2000 (even 20 % slope, ends at the lift; Cornegidouille runs beside it); the pipe is
  // dug 42 m beside Lovatière above Plagne Centre, on a straight 26 % pitch with no cross slope, clear of every run
  // and piste area, entered from Lovatière and leaving back into it
  const sl = PISTES.find(p => p.name === 'SuperSlalom');
  if (sl) Object.assign(sl, { name: 'Snowpark', lvl: 'park', w: 50, cross: 0.06, minGrade: 0.1, linkR: 140, minor: false });
  if (PLAGNE.runs.length) PISTES.push(
    { name: 'Accès half-pipe', lvl: 'verte', w: 16, pts: [[-310.0, -510.2], [-312.8, -533.6], [-320.5, -549.0]], minGrade: 0.03, cross: 0.1, noLink: true },
    { name: 'Half-pipe', lvl: 'park', w: 30, pts: [[-322.2, -552.6], [-218.1, -668.3]], minGrade: 0.14, cross: 0.0, pipe: true, noLink: true },
    { name: 'Sortie half-pipe', lvl: 'bleue', w: 18, pts: [[-214.1, -672.8], [-188.2, -674.4], [-171.7, -668.0]], minGrade: 0.04, cross: 0.08, noLink: true });
}
// where a new rider starts: the top of the highest chairlift
SPAWN_LIFT = () => PLAGNE ? LIFTS.find(l => l.name === 'Télésiège Bécoin') || LIFTS[0] : LIFTS[1];
// liaisons: every piste that ends near a lift gets a groomed path to its loading point
(() => {
  const ends = PISTES.map(p => ({ p, e: p.pts[p.pts.length - 1] }));
  for (const { p, e } of ends) {
    if (p.noLink && !p.real) continue;   // ends into another piste
    let best = null, bd = p.linkR || (p.real ? 90 : 260);   // real runs already reach their lifts: only bridge the last metres
    for (const L of LIFTS) {
      const dl = Math.hypot(L.t[0] - L.b[0], L.t[1] - L.b[1]), dx = (L.t[0] - L.b[0]) / dl, dz = (L.t[1] - L.b[1]) / dl, sx = dz, sz = -dx;
      const tx = L.b[0] + sx * L.off - dx * 2, tz = L.b[1] + sz * L.off - dz * 2, d = Math.hypot(e[0] - tx, e[1] - tz);
      if (d < bd) { bd = d; best = { L, tx, tz, ax: L.b[0] + sx * L.off - dx * 14, az: L.b[1] + sz * L.off - dz * 14 }; }
    }
    if (!best || bd < 12) continue;
    const { L, tx, tz, ax, az } = best;
    const pts = Math.hypot(e[0] - ax, e[1] - az) > 10 ? [e, [ax, az], [tx, tz]] : [e, [tx, tz]];
    PISTES.push({ name: 'Accès ' + L.name, liftName: L.name, lvl: 'verte', w: 16, pts, link: true, minGrade: 0.025, cross: 0.15 });   // always a gentle descent to the loading point
  }
})();
// téléski tracks are groomed too (top → bottom)
LIFTS.filter(l => l.type === 'tbar').forEach(l => PISTES.push({ name: l.name, lvl: 'track', w: 10, pts: [l.t, l.b], hidden: true, cross: 0.3, real: !!PLAGNE }));

/* Snow types: one row of glide parameters each (used by physics, HUD, sound, spray, shading) */
SNOW = [
  { id: 'damee', label: 'Damée', mu: 0.038, drag: 0.0040, res: 0, aLat: 22, rMin: 8.5, gripCarve: 14, gripSkid: 6, pivot: 1, sink: 0, rough: 0, takeoff: 1 },
  { id: 'glacee', label: 'Glacée', mu: 0.026, drag: 0.0040, res: 0, aLat: 7.5, rMin: 12, gripCarve: 5, gripSkid: 1.8, pivot: 1.15, sink: 0, rough: 0.22, takeoff: 1 },
  { id: 'bosses', label: 'Bosses', mu: 0.07, drag: 0.0046, res: 0.4, aLat: 14, rMin: 6.5, gripCarve: 10, gripSkid: 5, pivot: 1.3, sink: 0.02, rough: 0.25, takeoff: 1.7 },
  { id: 'poudreuse', label: 'Poudreuse', mu: 0.05, drag: 0.0058, res: 1.5, aLat: 12, rMin: 15, gripCarve: 8, gripSkid: 5, pivot: 0.5, sink: 0.42, rough: 0.08, takeoff: 1.2 },
  { id: 'trafolle', label: 'Trafolle', mu: 0.08, drag: 0.0066, res: 1.3, aLat: 9.5, rMin: 12, gripCarve: 6.5, gripSkid: 3.8, pivot: 0.7, sink: 0.15, rough: 1, takeoff: 1.3 },
  { id: 'park', label: 'Damée · park', mu: 0.038, drag: 0.0040, res: 0, aLat: 22, rMin: 8.5, gripCarve: 14, gripSkid: 6, pivot: 1, sink: 0, rough: 0, takeoff: 1 },
  { id: 'culture', label: 'Neige de culture', mu: 0.031, drag: 0.0040, res: 0, aLat: 17, rMin: 9, gripCarve: 11, gripSkid: 4.2, pivot: 1, sink: 0, rough: 0.07, takeoff: 1 },
  { id: 'tunnel', label: 'Tunnel', mu: 0.034, drag: 0.0040, res: 0, aLat: 20, rMin: 8.5, gripCarve: 14, gripSkid: 6, pivot: 1, sink: 0, rough: 0, takeoff: 1 },
];
// Twin-tip skis with double rocker: easier pivots and butters, more float in deep snow, a little less hold on hard snow
SKI = { name: 'Twin-tip double rocker', pivot: 1.3, float: 0.72, grip: 0.93 };
SN = { DAMEE: 0, GLACEE: 1, BOSSES: 2, POUDREUSE: 3, TRAFOLLE: 4, PARK: 5, CULTURE: 6, TUNNEL: 7 };

/* zone grid (4 m): piste id per cell, tree clearance, distance to pistes, snow type */
ZR = 4;
ZN = WORLD / ZR;
zoneGrid = new Int16Array(ZN * ZN).fill(-1);
clearGrid = new Uint8Array(ZN * ZN);
pisteDist = new Float32Array(ZN * ZN).fill(999);
snowGrid = new Uint8Array(ZN * ZN).fill(SN.POUDREUSE);
zIdx = (x, z) => { const ix = Math.floor((x + HALF) / ZR), iz = Math.floor((z + HALF) / ZR); return ix < 0 || iz < 0 || ix >= ZN || iz >= ZN ? -1 : iz * ZN + ix; };
pisteHeading = (p, i) => { const S = p.samples, a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)]; return Math.atan2(b.x - a.x, b.z - a.z); };

/* features: kickers (analytic) + mogul patches (0.5 m height grids), shared by physics and meshes */
kickers = [];
rails = [];
patches = [];
/* ---------------- Natural half-pipe ----------------
   Dug along the fall line west of the park: flat bottom 6 m wide, quarter-circle transitions (r 4.3 m) standing to
   80° at the lip, 3.5 m deep, 14.5 m lip to lip, decks on both sides. The profile is exact in featH (physics) and is
   drawn by its own fine mesh; the coarse terrain inside the trench is discarded in the terrain shader. */
PIPE = { F: 3.0, R: 4.3, lip: 80 * Math.PI / 180, on: false };
PIPE.halfW = PIPE.F + PIPE.R * Math.sin(PIPE.lip);
 PIPE.depth = PIPE.R * (1 - Math.cos(PIPE.lip));

/* tunnels: a piste segment that runs under a ridge; physics follows an explicit "in tunnel" flag */
tunnels = [];
}
