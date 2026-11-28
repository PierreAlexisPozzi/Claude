// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « buildings ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { BUILDINGS, GALLERY, furnitureAt, hashSeed, isPC } from './assembly';
import { cannons } from './cannons';
import { IS_TOUCH, clamp, colorCanvasTex, lerp, smoothstep } from './core';
import { makeLabel } from './furniture';
import { detailMat, lambertVC, mergeParts, pbr } from './materials';
import { BLEND, PLAGNE } from './world-data';
import { JACKETS } from './npcs';
import { LIFTS, PISTES, ZN, ZR, clearGrid, pisteHeading, rasterSeg, tunnelLocal, tunnels, zoneAt } from './pistes';
import { MAX_ANISO, scene } from './render';
import { CELL, HALF, VN, gridH, heights, mulberry32, obstacles, rnd } from './terrain';

export let VILLAGES, FLOOR, BAY, facadeTex, buildMats, snowRoofMat, plinthMat, WOOD, WOOD_D, SNOWC, CONC, STONEC, toWorld, P_, baseMats, STYLE, villageLabels, PAL, CUR_PAL, TERRACE_FOLK, CUR_FLOOR, TERRACES, CUR_PAQ, LE_FRANCE, SHOPS_TAKEN, REJECTED, CUR_FOOT, SLID;


export function makeFacade(kind) {
  const W = 256, Hh = kind === 'rail' ? 128 : 256, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
  const r = mulberry32(kind.length * 977 + kind.charCodeAt(0));
  const planks = (col, vertical, step) => { g.fillStyle = col; g.fillRect(0, 0, W, Hh); for (let p = 0; p < (vertical ? W : Hh); p += step) { g.fillStyle = `rgba(0,0,0,${0.12 + r() * 0.1})`; vertical ? g.fillRect(p, 0, 2, Hh) : g.fillRect(0, p, W, 2); g.fillStyle = `rgba(255,225,190,${r() * 0.07})`; vertical ? g.fillRect(p + 2, 0, step - 4, Hh) : g.fillRect(0, p + 2, W, step - 4); } };
  const stones = (base) => {
    g.fillStyle = '#5c5955'; g.fillRect(0, 0, W, Hh);
    for (let y = 0; y < Hh; y += 14 + r() * 6) for (let x = -r() * 20; x < W; ) { const w = 18 + r() * 26, h = 12 + r() * 8, v = 0.75 + r() * 0.35; g.fillStyle = `rgb(${base[0] * v | 0},${base[1] * v | 0},${base[2] * v | 0})`; g.fillRect(x + 1, y + 1, w - 2, h - 2); x += w; }
  };
  const window_ = (x, y, w, h, frame, lit) => {
    g.fillStyle = lit ? '#f6c47a' : '#26303c'; g.fillRect(x, y, w, h);
    if (!lit) { g.fillStyle = 'rgba(170,200,235,0.25)'; g.fillRect(x, y, w, h * 0.35); }
    g.strokeStyle = frame; g.lineWidth = 5; g.strokeRect(x, y, w, h); g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();
  };
  switch (kind) {
    case 'paquebot': {           // dark concrete, full-width glazing, wooden balcony band on every floor
      g.fillStyle = '#6e6a64'; g.fillRect(0, 0, W, Hh);
      for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(30,30,30,${r() * 0.06})`; g.fillRect(r() * W, r() * Hh, 8, 3); }
      for (let fy = 0; fy < 2; fy++) for (let bx = 0; bx < 2; bx++) window_(bx * 128 + 10, fy * 128 + 16, 108, 70, '#3c3a38', r() < 0.12);
      for (let fy = 0; fy < 2; fy++) { g.fillStyle = '#5b3a22'; g.fillRect(0, fy * 128 + 88, W, 30); for (let k = 0; k < W; k += 8) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(k, fy * 128 + 90, 2, 26); } g.fillStyle = '#3a2616'; g.fillRect(0, fy * 128 + 116, W, 6); }
      break; }
    case 'tower': {              // brown-red tower with vertical fins
      g.fillStyle = '#7d4430'; g.fillRect(0, 0, W, Hh);
      for (let fy = 0; fy < 2; fy++) for (let bx = 0; bx < 2; bx++) { window_(bx * 128 + 18, fy * 128 + 22, 92, 66, '#e9e2d6', r() < 0.12); g.fillStyle = '#5b2f20'; g.fillRect(bx * 128 + 4, fy * 128 + 96, 120, 14); }
      for (let bx = 0; bx < 2; bx++) { g.fillStyle = '#93533b'; g.fillRect(bx * 128, 0, 8, Hh); }
      break; }
    case 'block': {              // orange-brown low block, white frames
      g.fillStyle = '#b4652f'; g.fillRect(0, 0, W, Hh);
      for (let fy = 0; fy < 2; fy++) for (let bx = 0; bx < 2; bx++) { window_(bx * 128 + 22, fy * 128 + 26, 84, 60, '#f2efe8', r() < 0.15); g.fillStyle = '#7a3d1a'; g.fillRect(bx * 128 + 12, fy * 128 + 100, 104, 10); }
      break; }
    case 'woodres': {            // vertical orange boards, wood-framed windows
      planks('#b0703a', true, 10);
      for (let fy = 0; fy < 2; fy++) for (let bx = 0; bx < 2; bx++) { window_(bx * 128 + 30, fy * 128 + 22, 68, 78, '#5a3418', r() < 0.25); }
      break; }
    case 'chaletwood': {         // darker horizontal boards
      planks('#7c5434', false, 14);
      for (let fy = 0; fy < 2; fy++) for (let bx = 0; bx < 2; bx++) if ((fy + bx) % 2 === 0 || r() < 0.5) window_(bx * 128 + 36, fy * 128 + 26, 56, 70, '#3d2412', r() < 0.45);
      break; }
    case 'stone': {              // grey stone masonry, deep windows
      stones([150, 146, 140]);
      for (let fy = 0; fy < 2; fy++) for (let bx = 0; bx < 2; bx++) if (r() < 0.7) { g.fillStyle = '#d8cfc0'; g.fillRect(bx * 128 + 34, fy * 128 + 20, 60, 84); window_(bx * 128 + 40, fy * 128 + 26, 48, 72, '#6a4424', r() < 0.55); }
      break; }
    case 'plinth': { stones([150, 146, 140]); break; }
    // ---- La Plagne (photos of Plagne Centre, Aime 2000 and Plagne Villages): 2 bays x 2 floors per tile
    case 'pc_rust': case 'pc_tower': case 'pq_dark': case 'cm_cream': {
      const base = { pc_rust: '#7a4a34', pc_tower: '#86503a', pq_dark: '#736c64', cm_cream: '#e4dccb' }[kind];
      g.fillStyle = base; g.fillRect(0, 0, W, Hh);
      for (let x = 0; x < W; x += 6) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.05})`; g.fillRect(x, 0, 1, Hh); }        // board-formed concrete
      for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * 0.05})`; g.fillRect(r() * W, r() * Hh, 3 + r() * 9, 2 + r() * 3); }
      for (let fy = 0; fy < 2; fy++) {
        const y0 = fy * 128;
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, y0 + 118, W, 10);                                                  // slab line
        for (let bx = 0; bx < 2; bx++) {
          const x0 = bx * 128;
          if (kind === 'pq_dark') { window_(x0 + 8, y0 + 26, 112, 62, '#3a3531', r() < 0.1); continue; }                     // full-width glazing
          if (kind === 'cm_cream') { g.fillStyle = '#b3223f'; g.fillRect(x0, y0, 14, 128); }                                   // red fins
          g.fillStyle = '#3d2a1e'; g.fillRect(x0 + 78, y0 + 14, 40, 96);                                                     // dark timber panel beside the window
          for (let k = 0; k < 40; k += 5) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x0 + 78 + k, y0 + 14, 1, 96); }
          window_(x0 + 16, y0 + 22, 56, 80, kind === 'cm_cream' ? '#e9e4da' : '#2c1d14', r() < 0.12);
        }
      }
      break; }
    case 'lf_wood': {            // T6 : Le France (photos fournies) : bardage bois orangé, sous-faces de balcons blanches
      g.fillStyle = '#b5622c'; g.fillRect(0, 0, W, Hh);
      for (let x = 0; x < W; x += 5) { g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.07})`; g.fillRect(x, 0, 1, Hh); }        // lames verticales
      for (let fy = 0; fy < 2; fy++) {
        const y0 = fy * 128;
        g.fillStyle = '#eeede7'; g.fillRect(0, y0 + 110, W, 18);                                                           // sous-face blanche du balcon
        for (let bx = 0; bx < 2; bx++) window_(bx * 128 + 12, y0 + 18, 104, 74, '#4a2a16', r() < 0.12);
      }
      break; }
    case 'lf_blue': {            // T6 : Le France, niveau au-dessus du passage : panneaux bleu clair, petites fenêtres carrées
      g.fillStyle = '#a8c0dc'; g.fillRect(0, 0, W, Hh);
      for (let x = 0; x < W; x += 64) { g.fillStyle = '#8a4a26'; g.fillRect(x, 0, 6, Hh); }                               // montants bois
      for (let fy = 0; fy < 2; fy++) for (let bx = 0; bx < 4; bx++) window_(bx * 64 + 24, fy * 128 + 48, 22, 22, '#5b3a22', false);
      break; }
    case 'pv_wood': {            // Plagne Villages: dark brown boards, windows with light frames
      planks('#5b3b27', true, 9);
      for (let fy = 0; fy < 2; fy++) for (let bx = 0; bx < 2; bx++) window_(bx * 128 + 28, fy * 128 + 20, 72, 84, '#d9cdb5', r() < 0.2);
      break; }
    case 'pv_render': {          // cream render on the ground floor, darker plinth band
      g.fillStyle = '#e3d8c0'; g.fillRect(0, 0, W, Hh);
      for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(90,70,40,${r() * 0.06})`; g.fillRect(r() * W, r() * Hh, 2 + r() * 4, 2 + r() * 4); }
      for (let fy = 0; fy < 2; fy++) { g.fillStyle = '#8f877a'; g.fillRect(0, fy * 128 + 112, W, 16); for (let bx = 0; bx < 2; bx++) window_(bx * 128 + 30, fy * 128 + 18, 68, 80, '#5b3b27', r() < 0.25); }
      break; }
    case 'arcade': {             // stone ground floor with arched openings and lit shops
      stones([158, 152, 144]);
      for (let bx = 0; bx < 2; bx++) for (let fy = 0; fy < 2; fy++) { const x = bx * 128 + 20, y = fy * 128 + 30; g.fillStyle = r() < 0.6 ? '#e9b56c' : '#2a2a2c'; g.beginPath(); g.moveTo(x, y + 98); g.lineTo(x, y + 44); g.arc(x + 44, y + 44, 44, Math.PI, 0); g.lineTo(x + 88, y + 98); g.closePath(); g.fill(); g.strokeStyle = '#d9d0c2'; g.lineWidth = 6; g.stroke(); }
      break; }
    case 'shops': {              // storefronts under the paquebot
      const cols = ['#2f6fe0', '#e0393e', '#2fa84f', '#f2a12c', '#5b4bb5', '#e7e2d8'];
      g.fillStyle = '#3d3b39'; g.fillRect(0, 0, W, Hh);
      for (let k = 0; k < 4; k++) { const x = k * 64; g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x + 4, 20, 56, 22); g.fillStyle = r() < 0.6 ? '#f3d29a' : '#9fc0dd'; g.fillRect(x + 6, 48, 52, 70); g.fillRect(x + 6, 148, 52, 70); g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x + 4, 120, 56, 22); }
      break; }
    case 'rail': {               // wooden balustrade with cut-out balusters
      g.fillStyle = '#6a4326'; g.fillRect(0, 0, W, Hh);
      for (let x = 6; x < W; x += 16) { g.fillStyle = '#2a1c12'; g.beginPath(); g.ellipse(x + 4, 64, 3, 22, 0, 0, 7); g.fill(); }
      g.fillStyle = '#4a2c18'; g.fillRect(0, 0, W, 16); g.fillRect(0, Hh - 14, W, 14);
      break; }
  }
  const t = colorCanvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = MAX_ANISO; return t;
}

// box whose UVs repeat the facade texture per metre (texture = 2 bays × 2 floors)
export function facadeBox(w, h, d, bay = BAY, floor = FLOOR) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const sx = ny > 0.5 ? 0 : (nx > 0.5 ? d : w) / (bay * 2), sy = ny > 0.5 ? 0 : h / (floor * 2);
    uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  }
  return g;
}

export function bmat(kind) {
  if (!buildMats[kind]) {
    const map = facadeTex[kind] || (facadeTex[kind] = makeFacade(kind));
    // T5 : façades lointaines de Plagne Centre : le béton banché et son usure par-dessus la façade peinte
    if (/^pc_/.test(kind) && BLEND.tex.concrete_albedo) { const m = detailMat('concrete', { map }, 1 / 2.4, 1.2, 0.5, false); m.defines = Object.assign({}, m.defines, { DETAIL_FACING: '', USE_WEATHER: '' }); buildMats[kind] = m; }
    else buildMats[kind] = pbr({ map });
  }
  return buildMats[kind];
}
let pcPartsMat = null;
/** T5 : pièces des coques de Plagne Centre (dalles, refends, galerie) : béton à couleurs de sommets, partagé. */
export function pcParts() {
  if (pcPartsMat) return pcPartsMat;
  if (!BLEND.tex.concrete_albedo) return (pcPartsMat = lambertVC());
  pcPartsMat = detailMat('concrete', { color: '#ffffff', roughness: 0.9, vertexColors: true }, 1 / 2.4, 1.4, 0.8, false, [0.5, 0.5, 0.9]);
  pcPartsMat.defines = Object.assign({}, pcPartsMat.defines, { DETAIL_FACING: '', USE_WEATHER: '' });
  return pcPartsMat;
}

export function groundMin(x, z, w, d, rot) {
  let y = Infinity; const c = Math.cos(rot), s = Math.sin(rot);
  for (let u = -w / 2; u <= w / 2 + 0.01; u += Math.max(2, w / 6)) for (let v = -d / 2; v <= d / 2 + 0.01; v += Math.max(2, d / 3)) y = Math.min(y, gridH(x + u * c + v * s, z - u * s + v * c));
  return y;
}

export function groundMax(x, z, w, d, rot) {
  let y = -Infinity; const c = Math.cos(rot), s = Math.sin(rot);
  for (let u = -w / 2; u <= w / 2 + 0.01; u += Math.max(2, w / 6)) for (let v = -d / 2; v <= d / 2 + 0.01; v += Math.max(2, d / 3)) y = Math.max(y, gridH(x + u * c + v * s, z - u * s + v * c));
  return y;
}

export function liftDist(x, z) {
  let m = 1e9; for (const L of LIFTS) { const ax = L.b[0], az = L.b[1], bx = L.t[0], bz = L.t[1], dx = bx - ax, dz = bz - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), -0.05, 1.05); m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t)); }
  return m;
}

/** T6 : distance à la ligne des remontées hors des 25 premiers et derniers mètres (les gares, que les immeubles d'un pôle
 *  de gare peuvent entourer). */
export function liftLineDist(x, z) {
  let m = 1e9;
  for (const L of LIFTS) {
    const ax = L.b[0], az = L.b[1], dx = L.t[0] - ax, dz = L.t[1] - az, len = Math.hypot(dx, dz) || 1, e = Math.min(0.45, 25 / len);
    const t = ((x - ax) * dx + (z - az) * dz) / (len * len); if (t < e || t > 1 - e) continue;
    m = Math.min(m, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return m;
}
export function landmarkOK(x, z, rot, w, d) {
  for (let u = -w / 2; u <= w / 2; u += 4) for (let v = -d / 2; v <= d / 2; v += 4) {
    const [px, pz] = toWorld(x, z, rot, u, v);
    if (Math.abs(px) > HALF - 20 || Math.abs(pz) > HALF - 20 || liftDist(px, pz) < 8) return false;
  }
  return true;
}

export function footprintOK(x, z, rot, w, d, maxDrop = 6) { return !footprintWhy(x, z, rot, w, d, maxDrop); }
/** T6 : distance à l'axe de la piste la plus proche, rapportée à sa demi-largeur damée (0 sur l'axe, 1 au bord) : un
 *  immeuble commerçant peut couvrir le bord extérieur de la zone damée (la piste le longe), jamais les 60 % centraux. */
function runCore(x, z) {
  let best = Infinity;
  for (const p of PISTES) {
    const S = p.samples, hw = (p.w || 20) / 2; if (!S) continue;
    for (let i = 0; i + 1 < S.length; i++) {
      const a = S[i], b = S[i + 1], ex = b.x - a.x, ez = b.z - a.z, L2 = ex * ex + ez * ez || 1, t = clamp(((x - a.x) * ex + (z - a.z) * ez) / L2, 0, 1);
      const r = Math.hypot(x - a.x - ex * t, z - a.z - ez * t) / hw; if (r < best) best = r;
    }
  }
  return best;
}
/** Raison du refus d'une emprise (null si elle convient). Par défaut : 3 m de marge autour, ni piste, ni remontée à
 *  moins de 14 m, 2 m d'écart aux obstacles. shop (T6, immeubles qui portent des commerces d'OSM, au bord des fronts de
 *  neige) : une piste peut toucher le bord (pas l'intérieur, 3 m en retrait), remontée à 6 m, 0,5 m d'écart. */
export function footprintWhy(x, z, rot, w, d, maxDrop = 6, shop = false, liftInside = false) {
  if (groundMax(x, z, w, d, rot) - groundMin(x, z, w, d, rot) > maxDrop) return 'pente';
  const m = shop ? 0 : 3, liftR = shop ? 6 : 14, gap = shop ? 0.5 : 2;
  for (let u = -w / 2 - m; u <= w / 2 + m + 1e-6; u += 4) for (let v = -d / 2 - m; v <= d / 2 + m + 1e-6; v += 4) {
    const [px, pz] = toWorld(x, z, rot, u, v);
    if (Math.abs(px) > HALF - 40 || Math.abs(pz) > HALF - 40) return 'bord';
    if (zoneAt(px, pz) >= 0 && (!shop || (Math.abs(u) < w / 2 - 3 && Math.abs(v) < d / 2 - 3 && runCore(px, pz) < 0.6))) return 'piste';
    if ((liftInside ? liftLineDist(px, pz) : liftDist(px, pz)) < liftR) return 'remontée';   // T6 : pôle de gare (Télémétro, Le Pelvoux)
    if (obstacles.some(o => Math.hypot(o.x - px, o.z - pz) < o.r + gap)) return 'obstacle';
    if (cannons.some(c => Math.hypot(c.x - px, c.z - pz) < 6)) return 'canon';
    if (tunnels.some(T => { const tl = tunnelLocal(T, px, pz, 4); return tl && tl.s > -30 && tl.s < T.len + 30 && Math.abs(tl.w) < 26; })) return 'tunnel';
  }
  return null;
}

export function claim(x, z, rot, w, d) {
  // collision: a row of circles along the long side, plus tree clearance
  const long = w >= d, L = long ? w : d, D = long ? d : w, r = D / 2 + 0.6;
  for (let u = -L / 2 + D / 2; u <= L / 2 - D / 2 + 0.01; u += Math.max(1, D / 2)) { const [px, pz] = long ? toWorld(x, z, rot, u, 0) : toWorld(x, z, rot, 0, u); obstacles.push({ x: px, z: pz, r }); }
  if (L <= D) obstacles.push({ x, z, r });
  for (let u = -w / 2; u <= w / 2; u += 4) for (let v = -d / 2; v <= d / 2; v += 4) { const [px, pz] = toWorld(x, z, rot, u, v); rasterSeg(ZR, ZN - 1, px, pz, px, pz, 9, (ix, iz) => { clearGrid[iz * ZN + ix] = 1; }); }
}

export function boxP(parts, w, h, d, x, y, z, c) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return P_(parts, g, c); }

// gable roof, ridge along x, eaves at y0; heavy snow slabs with rounded eave pillows, dark fascia and a wooden attic
export function gableRoof(parts, w, d, y0, pitch, ox = 0, oz = 0, alongZ = false) {
  const local = [], rh = (d / 2 + 0.9) * pitch, hyp = Math.hypot(d / 2 + 0.9, rh), ang = Math.atan(pitch);
  for (const s of [-1, 1]) {
    const slab = new THREE.BoxGeometry(w + 1.4, 0.55, hyp); slab.rotateX(s * ang); slab.translate(0, y0 + rh / 2 + 0.32, s * (d / 4 + 0.45)); local.push({ g: slab, c: SNOWC });
    const fas = new THREE.BoxGeometry(w + 1.5, 0.22, hyp + 0.08); fas.rotateX(s * ang); fas.translate(0, y0 + rh / 2 - 0.05, s * (d / 4 + 0.45)); local.push({ g: fas, c: WOOD_D });
    const pil = new THREE.CylinderGeometry(0.34, 0.34, w + 1.4, 8); pil.rotateZ(Math.PI / 2); pil.translate(0, y0 - 0.02, s * (d / 2 + 0.95)); local.push({ g: pil, c: SNOWC });
  }
  const sh = new THREE.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(0, rh * (d / 2) / (d / 2 + 0.9)); sh.closePath();
  const att = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); att.translate(0, 0, -w / 2); att.rotateY(Math.PI / 2); att.translate(0, y0, 0); local.push({ g: att, c: WOOD });
  for (const q of local) { if (alongZ) q.g.rotateY(Math.PI / 2); q.g.translate(ox, 0, oz); parts.push(q); }
  return rh;
}

export function railP(rails, len, x, y, z, alongZ) { const g = new THREE.BoxGeometry(alongZ ? 0.08 : len, 1.0, alongZ ? len : 0.08), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / 1.6); g.translate(x, y, z); rails.push({ g, c: '#ffffff' }); }

export function facadeMesh(grp, kind, w, h, d, x, y, z, floor) { const m = new THREE.Mesh(facadeBox(w, h, d, BAY, floor || FLOOR), bmat(kind)); m.position.set(x, y, z); grp.add(m); return m; }

export function finish(grp, parts, rails, partsMat) {
  if (parts.length) grp.add(new THREE.Mesh(mergeParts(parts), partsMat || lambertVC()));
  if (rails && rails.length) grp.add(new THREE.Mesh(mergeParts(rails), pbr({ vertexColors: true, map: facadeTex.rail || (facadeTex.rail = makeFacade('rail')) })));
  grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(grp);
}

/** T6 : les commerces d'OpenStreetMap (PLAGNE.shops) à moins de 8 m de l'emprise vont à cet immeuble (le premier placé,
 *  donc le plus grand, l'emporte), ramenés sur la façade la plus proche : b.shopList = [{ k, face, x, z, nx, nz }]
 *  (point de la vitrine et normale sortante, monde). Les vitrines (shopFront) ne s'ouvrent que là ; logements ailleurs. */
const shopsNear = (x, z, rot, w, d) => PLAGNE && PLAGNE.shops && PLAGNE.shops.some((q, i) => { if (SHOPS_TAKEN.has(i)) return false; const dx = q.x - x, dz = q.z - z, c = Math.cos(rot), sn = Math.sin(rot); return Math.abs(dx * c - dz * sn) < w / 2 + 8 && Math.abs(dx * sn + dz * c) < d / 2 + 8; });
/** Marque une zone sans arbres (repère u, v d'un immeuble), par pas de 4 m. */
export function clearRect(x, z, rot, u0, u1, v0, v1) {
  for (let u = u0; u <= u1 + 1e-6; u += 4) for (let v = v0; v <= v1 + 1e-6; v += 4) { const [px, pz] = toWorld(x, z, rot, u, v); rasterSeg(ZR, ZN - 1, px, pz, px, pz, 3, (ix, iz) => { clearGrid[iz * ZN + ix] = 1; }); }
}
export function attachShops(b) {
  if (!PLAGNE || !PLAGNE.shops) return;
  const ca = Math.cos(b.rot), sa = Math.sin(b.rot), list = (b.shopList = []), inner = b.type === 'paquebot';   // modules du paquebot : façades avant et arrière seulement
  PLAGNE.shops.forEach((q, i) => {
    if (SHOPS_TAKEN.has(i)) return;
    const dx = q.x - b.x, dz = q.z - b.z, u = dx * ca - dz * sa, v = dx * sa + dz * ca;
    const F = CUR_FOOT, inFoot = F && (() => { const c = Math.cos(F.rot), sn = Math.sin(F.rot), fx = q.x - F.x, fz = q.z - F.z; return Math.abs(fx * c - fz * sn) < F.w / 2 + 3 && Math.abs(fx * sn + fz * c) < F.d / 2 + 3; })();
    if (!inFoot && (Math.abs(u) > b.w / 2 + 8 || Math.abs(v) > b.d / 2 + 8)) return;
    const opts = [[Math.abs(b.d / 2 - v), 0], [Math.abs(v + b.d / 2), 1]];
    if (!inner) opts.push([Math.abs(b.w / 2 - u), 2], [Math.abs(u + b.w / 2), 3]);
    const face = opts.sort((a, c) => a[0] - c[0])[0][1], L = face < 2 ? b.w : b.d;
    let s = face === 0 ? u + b.w / 2 : face === 1 ? b.w / 2 - u : face === 2 ? b.d / 2 - v : v + b.d / 2;
    s = clamp(s, Math.min(1.8, L / 2), Math.max(L - 1.8, L / 2));
    for (let k = 0; k < 8 && list.some(o => o.face === face && Math.abs(o.s - s) < 3.4); k++) s = s + 3.6 <= L - 1.8 ? s + 3.6 : Math.max(1.8, s - 7.2);   // deux commerces au même endroit : côte à côte
    const [lu, lv, nu, nv] = face === 0 ? [s - b.w / 2, b.d / 2 + 0.3, 0, 1] : face === 1 ? [b.w / 2 - s, -b.d / 2 - 0.3, 0, -1] : face === 2 ? [b.w / 2 + 0.3, b.d / 2 - s, 1, 0] : [-b.w / 2 - 0.3, s - b.d / 2, -1, 0];
    const [wx, wz] = toWorld(b.x, b.z, b.rot, lu, lv);
    list.push({ k: q.k, face, s, x: wx, z: wz, nx: nu * ca + nv * sa, nz: -nu * sa + nv * ca, i });
    SHOPS_TAKEN.add(i);
  });
}

export function startGroup(x, z, rot, w, d) {
  // T5 ter : un immeuble à terrasse a son rez-de-chaussée au niveau de la neige du front de neige (CUR_FLOOR)
  const top = CUR_FLOOR != null ? CUR_FLOOR : groundMax(x, z, w, d, rot) + 0.3, y0 = Math.min(groundMin(x, z, w, d, rot), top - 0.3);
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rot;
  // the foundation down the slope: stone under the procedural chalets; in La Plagne the facade material runs down to
  // the ground (board-formed concrete under the slabs and towers, cream render under the wood residences)
  const bm = CUR_PAL ? baseMats[CUR_PAL.base] || (baseMats[CUR_PAL.base] = pbr({ color: CUR_PAL.base, roughness: 0.9 })) : bmat('plinth');
  if (CUR_PAL && CUR_PAL.bridge) return { grp, top, y0: top };   // T6 : section en pont (Le France) : rien sous la sous-face
  const ph = top - y0 + 1.5, pl = new THREE.Mesh(facadeBox(w + (CUR_PAL ? 0.1 : 0.6), ph, d + (CUR_PAL ? 0.1 : 0.6)), bm); pl.position.y = y0 - 1.2 + ph / 2; grp.add(pl);
  return { grp, top, y0 };
}

/* photo 2: wood-clad residence on a stone arcade, balconies on every floor, cross gables */
export function bldWoodRes(x, z, rot, w, d) {
  const pal = CUR_PAL, floors = 3 + (rnd() < 0.5 ? 1 : 0) + (w > 30 ? 1 : 0) + (pal ? 1 : 0), gf = 3.4;
  const { grp, top, y0 } = startGroup(x, z, rot, w, d), parts = [], rails = [];
  BUILDINGS.push({ type: 'woodres', x, z, rot, w, d, top, y0, floors, grp, detail: null, pal });
  attachShops(BUILDINGS[BUILDINGS.length - 1]);
  facadeMesh(grp, pal ? pal.ground : 'arcade', w, gf, d, 0, top + gf / 2, 0, 3.4);
  const H1 = floors * FLOOR; facadeMesh(grp, pal ? pal.facade : 'woodres', w, H1, d, 0, top + gf + H1 / 2, 0);
  for (let f = 0; f < floors; f++) {
    const y = top + gf + f * FLOOR;
    for (const s of [-1, 1]) { boxP(parts, w * 0.92, 0.2, 1.4, 0, y + 0.1, s * (d / 2 + 0.7), pal ? pal.slab : WOOD); railP(rails, w * 0.92, 0, y + 0.7, s * (d / 2 + 1.35)); if (pal) boxP(parts, w * 0.92, 0.08, 0.16, 0, y + 1.24, s * (d / 2 + 1.35), SNOWC); }
    for (let k = -2; k <= 2; k++) boxP(parts, 0.22, FLOOR, 0.22, k * w * 0.23, y + FLOOR / 2, d / 2 + 1.3, pal ? pal.boards : WOOD_D);   // balcony posts
  }
  const ye = top + gf + H1;
  gableRoof(parts, w, d, ye, 0.55);
  // cross gables on the front, their ridge running toward the piste
  const ncg = w > 30 ? 2 : 1;
  for (let k = 0; k < ncg; k++) {
    const cx = ncg === 1 ? 0 : (k ? w / 4 : -w / 4), cw = 7.5;
    boxP(parts, cw, 2.4, 3.2, cx, ye + 1.2 - 0.2, d / 2 + 0.2, pal ? pal.wood : '#b0703a');
    gableRoof(parts, 5.2, cw, ye + 0.9, 0.62, cx, d / 2 - 1.2, true);
  }
  for (const k of [-0.32, 0.3]) { boxP(parts, 0.9, 3.0, 0.9, k * w, ye + 2.8, -d * 0.18, STONEC); boxP(parts, 1.2, 0.18, 1.2, k * w, ye + 4.35, -d * 0.18, WOOD_D); boxP(parts, 1.0, 0.25, 1.0, k * w, ye + 4.55, -d * 0.18, SNOWC); }
  finish(grp, parts, rails);
}

/* photo 3: stone ground floors, timber upper floors, carved balconies, heavy snow */
export function bldStoneChalet(x, z, rot, w, d, small) {
  const sf = small ? 1 : 2, wf = small ? 1 : 2;
  const { grp, top, y0 } = startGroup(x, z, rot, w, d), parts = [], rails = [];
  BUILDINGS.push({ type: 'chalet', x, z, rot, w, d, top, y0, sf, wf, grp, detail: null });
  facadeMesh(grp, 'stone', w, sf * FLOOR, d, 0, top + sf * FLOOR / 2, 0);
  facadeMesh(grp, 'chaletwood', w - 0.2, wf * FLOOR, d - 0.2, 0, top + sf * FLOOR + wf * FLOOR / 2, 0);
  for (let f = 1; f < sf + wf; f++) {
    const y = top + f * FLOOR;
    boxP(parts, w * 0.85, 0.2, 1.3, 0, y + 0.1, d / 2 + 0.65, WOOD); railP(rails, w * 0.85, 0, y + 0.7, d / 2 + 1.27);
    for (const k of [-0.42, 0, 0.42]) boxP(parts, 0.2, 0.9, 1.3, k * w * 0.98, y - 0.35, d / 2 + 0.6, WOOD_D);          // brackets
  }
  for (const k of [-0.5, 0.5]) boxP(parts, 0.35, (sf + wf) * FLOOR, 0.35, k * (w - 0.3), top + (sf + wf) * FLOOR / 2, d / 2 - 0.1, WOOD_D);  // corner beams
  const ye = top + (sf + wf) * FLOOR;
  gableRoof(parts, w, d, ye, 0.6);
  boxP(parts, 0.9, 2.6, 0.9, w * 0.25, ye + 2.5, -d * 0.15, STONEC); boxP(parts, 1.15, 0.3, 1.15, w * 0.25, ye + 3.9, -d * 0.15, SNOWC);
  finish(grp, parts, rails);
  return { grp, top };
}

/* photo 1: stepped "paquebot", modules stepping down the slope, terraces at the ends, shops at the foot */
export function bldPaquebot(x, z, rot, w, d) {
  const n = Math.max(3, Math.round(w / 22)), mw = w / n;
  const profile = i => { const c = 1 - Math.abs((i + 0.5) / n * 2 - 1); return Math.round(5 + c * 6); };
  for (let i = 0; i < n; i++) {
    const u = -w / 2 + (i + 0.5) * mw, [mx, mz] = toWorld(x, z, rot, u, 0);
    const { grp, top, y0 } = startGroup(mx, mz, rot, mw, d), parts = [];
    const floors = profile(i);
    BUILDINGS.push({ type: 'paquebot', x: mx, z: mz, rot, w: mw, d, top, y0, floors, grp, detail: null });
    facadeMesh(grp, 'shops', mw, 3.4, d + 0.6, 0, top + 1.7, 0.3, 3.4);
    // tiers of two floors, each one stepping back from the front and narrowing toward the ends
    let y = top + 3.4;
    for (let f = 0; f < floors; f += 2) {
      const k = Math.floor(f / 2), dd = d - k * 1.3, nf = Math.min(2, floors - f), h = nf * FLOOR;
      facadeMesh(grp, 'paquebot', mw + 0.02, h, dd, 0, y + h / 2, -(d - dd) / 2);
      for (let q = 0; q < nf; q++) boxP(parts, mw + 0.05, 0.18, 1.0, 0, y + q * FLOOR + 0.1, -(d - dd) / 2 + dd / 2 + 0.5, '#4f3420');   // balcony slabs
      boxP(parts, mw + 0.1, 0.35, 1.3, 0, y + h + 0.17, -(d - dd) / 2 + dd / 2 - 0.4, SNOWC);                                         // snow on each terrace
      y += h;
    }
    const dTop = d - Math.floor((floors - 1) / 2) * 1.3;
    boxP(parts, mw + 0.3, 0.5, dTop + 0.3, 0, y + 0.25, -(d - dTop) / 2, SNOWC);
    boxP(parts, mw * 0.4, 1.6, 3, 0, y + 1.2, -(d - dTop) / 2 - dTop * 0.2, CONC);
    finish(grp, parts);
  }
}

/* photo 4: brown tower and low flat-roofed blocks */
export function bldTower(x, z, rot, w, d) {
  const floors = 12 + Math.floor(rnd() * 5), { grp, top, y0 } = startGroup(x, z, rot, w, d), parts = [];
  BUILDINGS.push({ type: 'tower', x, z, rot, w, d, top, y0, floors, grp, detail: null });
  facadeMesh(grp, 'tower', w, floors * FLOOR, d, 0, top + floors * FLOOR / 2, 0);
  const yt = top + floors * FLOOR;
  boxP(parts, w + 0.6, 0.6, d + 0.6, 0, yt + 0.3, 0, SNOWC); boxP(parts, w * 0.4, 2.2, d * 0.4, 0, yt + 1.5, 0, '#5d3424'); boxP(parts, w * 0.42, 0.3, d * 0.42, 0, yt + 2.7, 0, SNOWC);
  finish(grp, parts);
}

export function bldBlock(x, z, rot, w, d) {
  const floors = 3 + Math.floor(rnd() * 3), { grp, top, y0 } = startGroup(x, z, rot, w, d), parts = [];
  BUILDINGS.push({ type: 'block', x, z, rot, w, d, top, y0, floors, grp, detail: null });
  facadeMesh(grp, 'block', w, floors * FLOOR, d, 0, top + floors * FLOOR / 2, 0);
  const yt = top + floors * FLOOR;
  boxP(parts, w + 1.2, 0.35, d + 1.2, 0, yt + 0.12, 0, '#3e3a36'); boxP(parts, w + 1.1, 0.7, d + 1.1, 0, yt + 0.6, 0, SNOWC);
  finish(grp, parts);
}

export function bldRestaurant(x, z, rot) {
  const w = 22, d = 12, { grp, top } = bldStoneChalet(x, z, rot, w, d, true);
  // wooden deck terrace in front, with tables and parasols
  const parts = [], dg = new THREE.Group(); dg.position.copy(grp.position); dg.rotation.y = rot;
  boxP(parts, w + 8, 0.35, 14, 0, top - 0.1, d / 2 + 7, '#a77b4f');
  for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
    const tx = -w / 2 + 2 + i * 4.2, tz = d / 2 + 3.5 + j * 5;
    boxP(parts, 1.4, 0.08, 0.8, tx, top + 0.8, tz, '#4a3524'); boxP(parts, 0.1, 0.75, 0.1, tx, top + 0.42, tz, '#2b2b2b');
    if (j === 0 && i % 2 === 0) { const pu = new THREE.ConeGeometry(1.5, 0.6, 8); pu.translate(tx, top + 2.6, tz); parts.push({ g: pu, c: i % 4 ? '#c8321f' : '#efe9de' }); boxP(parts, 0.06, 2.4, 0.06, tx, top + 1.4, tz, '#cfcfcf'); }
  }
  finish(dg, parts);
  claim(x, z + 0, rot, w + 8, d + 14);
}

export function tryPlace(spec, S, i, hd, side, extra) {
  const p = S.p, off = S.hw + 5 + spec.d / 2 + extra;
  const x = S.s[i].x + Math.cos(hd) * off * side, z = S.s[i].z - Math.sin(hd) * off * side, rot = hd - side * Math.PI / 2;
  if (!footprintOK(x, z, rot, spec.w, spec.d, spec.drop)) return false;
  claim(x, z, rot, spec.w, spec.d); spec.b(x, z, rot, spec.w, spec.d);
  return true;
}

// textured boxes merged into one mesh (one draw call per facade texture)
export function facadeMerged(grp, kind, boxes) {
  if (!boxes.length) return;
  const m = new THREE.Mesh(mergeParts(boxes.map(([w, h, d, x, y, z]) => { const g = facadeBox(w, h, d); g.translate(x, y, z); return { g, c: '#ffffff' }; })), bmat(kind));
  grp.add(m); return m;
}

// slab or tower: ground floor (shops on the snow front), loggia floors with slabs, timber parapets and fins, flat roof
export function bldPlSlab(x, z, rot, w, d) {
  const pal = CUR_PAL, floors = pal.floors, gf = 3.4, type = pal.tower ? 'tower' : 'block';
  const { grp, top, y0 } = startGroup(x, z, rot, w, d), parts = [];
  BUILDINGS.push({ type, x, z, rot, w, d, top, y0, floors, grp, detail: null, pal, gf });
  const ent = BUILDINGS[BUILDINGS.length - 1];
  if (pal.bridge) ent.shopList = []; else attachShops(ent);   // T6 : commerces d'après OSM (sinon : logements)
  const shopsHere = ent.shopList ? ent.shopList.length > 0 : pal.shops, galleryHere = !ent.shopList || ent.shopList.some(q => q.face === 0);
  facadeMesh(grp, shopsHere ? 'shops' : pal.gfFacade || pal.facade, w, gf, d, 0, top + gf / 2, 0, 3.4);
  const H1 = (floors - 1) * FLOOR; facadeMesh(grp, pal.facade, w, H1, d, 0, top + gf + H1 / 2, 0);
  const faces2 = pal.tower ? [['x', 1], ['x', -1], ['z', 1], ['z', -1]] : [['z', 1], ['z', -1]];
  for (const [ax, sd] of faces2) {
    const L = ax === 'z' ? w : d, D = ax === 'z' ? d : w, dep = pal.tower ? 1.0 : 1.3;
    const B = (len, h, dp, along, y, out, c) => ax === 'z' ? boxP(parts, len, h, dp, along, y, sd * out, c) : boxP(parts, dp, h, len, sd * out, y, along, c);
    for (let f = 0; f < floors - 1; f++) {
      const y = top + gf + f * FLOOR;
      B(L + 0.2, 0.22, dep, 0, y + 0.11, D / 2 + dep / 2, pal.slab);                       // loggia slab
      B(L + 0.2, 0.95, 0.1, 0, y + 0.66, D / 2 + dep - 0.05, pal.boards);                  // timber parapet
      B(L + 0.2, 0.09, 0.16, 0, y + 1.17, D / 2 + dep - 0.05, SNOWC);                      // snow on the rail
    }
    const nf = Math.max(2, Math.round(L / 6.4)), pc = isPC(pal), fw = pc ? 0.42 : 0.3, fd = pc ? dep + 0.35 : dep;
    for (let k = 0; k <= nf; k++) B(fw, H1, fd, -L / 2 + k * L / nf, top + gf + H1 / 2, D / 2 + fd / 2, pal.fin || pal.slab);   // fins between loggias (T5 : saillants à Plagne Centre ; T6 : bois à Le France)
    if (pc && sd === 1 && ax === 'z' && !pal.bridge && galleryHere) {   // T5 : galerie couverte au pied (mêmes cotes que la version détaillée, GALLERY) ; T6 : devant des commerces
      const G = GALLERY, n = Math.max(2, Math.round(L / G.step));
      B(L + 0.2, G.slab, G.depth, 0, top + gf + G.slab / 2, D / 2 + G.depth / 2, pal.slab);
      B(L + 0.1, 0.32, G.depth - 0.1, 0, top + gf + G.slab + 0.16, D / 2 + G.depth / 2, SNOWC);
      for (let k = 0; k <= n; k++) B(G.post, gf, G.post, Math.min(L / 2 - 0.3, Math.max(-L / 2 + 0.3, -L / 2 + k * L / n)), top + gf / 2, D / 2 + G.depth - 0.35, pal.slab);
    }
  }
  const yt = top + gf + H1;
  if (pal.bridge) boxP(parts, w + 0.2, 0.7, d + 0.2, 0, top - 0.35, 0, pal.slab);   // T6 : sous-face du pont au-dessus de la piste
  boxP(parts, w + 0.5, 0.9, d + 0.5, 0, yt + 0.45, 0, pal.parapet);
  boxP(parts, w + 0.3, 0.55, d + 0.3, 0, yt + 0.95, 0, SNOWC);
  if (!pal.tower && w > 26 && !isPC(pal)) boxP(parts, 5, 2.6, 4, w * 0.25, yt + 1.6, -d * 0.15, pal.parapet);   // lift machine room
  if (isPC(pal)) { boxP(parts, 4.2, 2.2, 3.4, w * 0.22, yt + 1.5, -d * 0.12, pal.parapet); boxP(parts, 4.4, 0.3, 3.6, w * 0.22, yt + 2.72, -d * 0.12, SNOWC); }   // même local que la version détaillée
  finish(grp, parts, null, isPC(pal) ? pcParts() : null);
}

/* T6 : l'immeuble Le France (Plagne Centre) : la piste Boulevard passe dessous. BD TOPO : emprise 101 × 37 m, 9 niveaux ;
   les parties d'OSM font environ 20 m de profondeur. Le passage est déduit de l'emprise de la piste (grille des zones de
   piste) sous l'immeuble, 2 m de marge de chaque côté, sous-face à 7,2 m au-dessus de la neige : deux ailes posées au sol
   (seules à faire obstacle) et une section en pont entre elles, jusqu'au même toit. */
export function bldLeFrance(x, z, rot, w, d) {
  const pal = CUR_PAL, at = (u, v) => toWorld(x, z, rot, u, v);
  // la piste qui traverse (le plus de cases sous l'emprise) fait le passage ; les autres (liaisons qui frôlent les
  // extrémités) raccourcissent les ailes
  const cells = new Map();
  for (let u = -w / 2; u <= w / 2; u += 1) for (let v = -d / 2; v <= d / 2 + 1e-6; v += 2) { const k = zoneAt(...at(u, v)); if (k >= 0) { const c = cells.get(k) || { n: 0, a: Infinity, b: -Infinity }; c.n++; c.a = Math.min(c.a, u); c.b = Math.max(c.b, u); cells.set(k, c); } }
  if (!cells.size) { bldPlSlab(x, z, rot, w, d); claim(x, z, rot, w, d); return; }
  const [pk, pc] = [...cells].sort((a, b) => b[1].n - a[1].n)[0];
  let p0 = pc.a - 2, p1 = pc.b + 2, e0 = -w / 2, e1 = w / 2;
  for (const [k, c] of cells) if (k !== pk) { if (c.b < p0) e0 = Math.max(e0, c.b + 2); else if (c.a > p1) e1 = Math.min(e1, c.a - 2); }
  if (p0 - e0 < 8 || e1 - p1 < 8) { console.info('La Plagne: Le France not placed (wings too short)'); return; }
  const wings = [];
  for (const [a, b] of [[e0, p0], [p1, e1]]) {
    const [cx, cz] = at((a + b) / 2, 0); bldPlSlab(cx, cz, rot, b - a, d); claim(cx, cz, rot, b - a, d);
    const B = BUILDINGS[BUILDINGS.length - 1]; B.wing = true; wings.push(B);
  }
  let g = -Infinity; for (let u = p0; u <= p1 + 1e-6; u += 1) for (let v = -d / 2; v <= d / 2 + 1e-6; v += 2) g = Math.max(g, gridH(...at(u, v)));
  const C = g + 7.2, roof = Math.max(...wings.map(B => B.top + B.gf + (B.floors - 1) * FLOOR));
  const floors = Math.max(2, Math.round((roof - C - 3.4) / FLOOR) + 1), [cx, cz] = at((p0 + p1) / 2, 0);
  CUR_FLOOR = C; CUR_PAL = { ...pal, floors, shops: false, bridge: true, gfFacade: 'lf_blue', gfWall: '#a8c0dc' };
  bldPlSlab(cx, cz, rot, p1 - p0, d);
  CUR_FLOOR = null; CUR_PAL = pal;
  const B = BUILDINGS[BUILDINGS.length - 1]; B.bridge = true; B.clear = Math.round((C - g) * 10) / 10; B.span = [p0, p1];
  for (let u = p0; u <= p1; u += 4) for (let v = -d / 2; v <= d / 2; v += 4) { const [px, pz] = at(u, v); rasterSeg(ZR, ZN - 1, px, pz, px, pz, 9, (ix, iz) => { clearGrid[iz * ZN + ix] = 1; }); }   // pas d'arbres dessous
  LE_FRANCE = { x, z, rot, w, d, p0, p1, e0, e1, clear: B.clear, g, piste: PISTES[pk] ? PISTES[pk].name : pk };
  // piliers du passage (photos : béton, matelas orange au pied), dans la marge de 2 m hors de la piste ; socle blanc
  // vitré d'un niveau devant les ailes côté pistes ; cage d'escalier en bois au bout ouest
  const parts = [], grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rot;
  for (const u of [p0 + 0.9, p1 - 0.9]) for (const v of [-d / 2 + 1.5, 0, d / 2 - 1.5]) {
    const [px, pz] = at(u, v), g0 = gridH(px, pz);
    boxP(parts, 0.9, C - g0 + 0.3, 0.9, u, (C + g0) / 2 - 0.15, v, '#cfcac2');
    boxP(parts, 1.15, 1.7, 1.15, u, g0 + 0.75, v, '#e8641e');
    obstacles.push({ x: px, z: pz, r: 0.7 });
  }
  const sd = frontScore(...at((e0 + p0) / 2, 0), rot, p0 - e0, d, 1) <= frontScore(...at((e0 + p0) / 2, 0), rot, p0 - e0, d, -1) ? 1 : -1;
  for (const B2 of wings) {
    const a = (B2.x - x) * Math.cos(rot) - (B2.z - z) * Math.sin(rot), L = B2.w - 3, D = 5, v = sd * (d / 2 + D / 2);
    let ok = true, gl = Infinity;
    for (let u = a - L / 2; u <= a + L / 2 && ok; u += 2) for (let q = -D / 2; q <= D / 2; q += 1.25) { const [px, pz] = at(u, v + q); gl = Math.min(gl, gridH(px, pz)); if (zoneAt(px, pz) >= 0 || liftDist(px, pz) < 6) ok = false; }
    if (!ok) continue;
    const y = B2.top, y0 = Math.min(gl, y) - 0.3;
    boxP(parts, L, y + 0.9 - y0, D, a, (y0 + y + 0.9) / 2, v, '#f0efe9');            // allège blanche (jusqu'au sol)
    boxP(parts, L + 0.06, 2.4, D + 0.06, a, y + 2.1, v, '#5d7a90');                   // vitrage
    boxP(parts, L + 0.1, 0.6, D + 0.1, a, y + 3.6, v, '#f0efe9');                     // bandeau blanc
    boxP(parts, L - 0.2, 0.35, D - 0.2, a, y + 4.05, v, SNOWC);
    claim(...at(a, v), rot, L, D);
  }
  { const B0 = wings[0], u = e0 + 3.5, yt = B0.top + B0.gf + (B0.floors - 1) * FLOOR;
    boxP(parts, 7, yt - B0.top + 1.5, 9, u, (B0.top + yt + 1.5) / 2, -sd * (d / 2 - 2), '#8a5a35');
    for (let k = -3; k <= 3; k++) boxP(parts, 0.08, yt - B0.top + 1.5, 9.04, u + k, (B0.top + yt + 1.5) / 2, -sd * (d / 2 - 2), '#6e4426'); }   // lames
  const m = new THREE.Mesh(mergeParts(parts), lambertVC()); m.castShadow = true; m.receiveShadow = true; grp.add(m); grp.userData.merge = true; scene.add(grp);
}

// the Paquebot des neiges: modules along its length, the roofline in three waves, every floor stepped back on both faces
export function bldPlPaquebot(x, z, rot, w, d) {
  const pal = CUR_PAL, n = Math.max(3, Math.round(w / 20)), mw = w / n, step = 1.15, Q = CUR_PAQ;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, floors = Math.round(7 + 6 * (0.5 + 0.5 * Math.cos(2 * Math.PI * 3 * (t - 1 / 6))));
    const u = -w / 2 + (i + 0.5) * mw, [mx, mz] = toWorld(x, z, rot, u, 0);
    // T6 : rez-de-chaussée par paliers au niveau de la neige (gfl : six paliers par module) ; top = le plus bas, et le
    // premier étage au-dessus du plus haut
    const gfl = Q && Q.gfl[i], gf = gfl ? 3.4 + Math.max(...gfl) - Math.min(...gfl) : 3.4;
    if (gfl) CUR_FLOOR = Math.min(...gfl);
    const { grp, top, y0 } = startGroup(mx, mz, rot, mw, d), parts = [], boxes = [];
    BUILDINGS.push({ type: 'paquebot', x: mx, z: mz, rot, w: mw, d, top, y0, floors, grp, detail: null, pal, step, gf, gfl: gfl || null });
    const ent = BUILDINGS[BUILDINGS.length - 1]; attachShops(ent);
    const gk = !ent.shopList || ent.shopList.length ? 'shops' : pal.facade;   // T6 : rez-de-chaussée de logements sans commerce
    if (gfl) gfl.forEach((y, s) => { const h = top + gf - y, k = gfl.length; facadeMesh(grp, gk, mw / k + 0.01, h, d + 0.6, -mw / 2 + (s + 0.5) * mw / k, y + h / 2, 0, h); });
    else facadeMesh(grp, gk, mw, gf, d + 0.6, 0, top + gf / 2, 0, 3.4);
    for (let f = 0; f < floors; f++) {
      const dd = d - 2 * step * (f + 1), y = top + gf + f * FLOOR;
      if (dd < 6) break;
      boxes.push([mw + 0.02, FLOOR, dd, 0, y + FLOOR / 2, 0]);
      for (const sd of [-1, 1]) {                                                              // the step: a terrace in front of each floor
        boxP(parts, mw + 0.05, 0.22, step + 0.2, 0, y + 0.11, sd * (dd / 2 + step / 2), pal.slab);
        boxP(parts, mw + 0.05, 0.9, 0.08, 0, y + 0.6, sd * (dd / 2 + step - 0.02), pal.boards);
        boxP(parts, mw + 0.05, 0.3, step - 0.1, 0, y + 0.3, sd * (dd / 2 + step / 2 - 0.05), SNOWC);   // snow on the terrace
      }
    }
    facadeMerged(grp, pal.facade, boxes);
    const dTop = Math.max(6, d - 2 * step * floors), yt = top + gf + floors * FLOOR;
    boxP(parts, mw + 0.3, 0.5, dTop + 0.3, 0, yt + 0.25, 0, SNOWC);
    finish(grp, parts);
  }
}

// La Plagne: every surveyed building (largest first) as the closest of the game's building types, where it does
// not sit on a run or a lift line; the high-rise stations (Plagne Centre, Aime 2000) get blocks, towers and the
// long stepped "paquebot", the later villages wood-clad residences and chalets
export function buildPlagneBuildings() {
  const hamlets = PLAGNE.places.filter(q => q.kind !== 'peak');
  for (const q of hamlets) villageLabels.push({ name: q.name, x: q.x, z: q.z });
  const list = PLAGNE.buildings.slice().sort((a, b) => b.w * b.d - a.w * a.d), cap = IS_TOUCH ? 90 : 150;   // ~5 draw calls each: keep the dense stations affordable
  let placed = 0;
  for (const b of list) {
    if (placed >= cap) break;
    let w = b.w, d = b.d, rot = b.rot;
    if (d > w) { [w, d] = [d, w]; rot -= Math.PI / 2; }
    const town = hamlets.reduce((m, q) => Math.hypot(q.x - b.x, q.z - b.z) < Math.hypot(m.x - b.x, m.z - b.z) ? q : m, hamlets[0]).name;
    const modern = /Centre|Aime/.test(town), area = w * d, nm = b.name || '', hsh = (hashSeed(b.x, b.z, 3) % 1000) / 1000;
    let spec, pal = null;
    if (b.kind === 'construction' || /dameuse|Parking/i.test(nm) && area > 2000) continue;
    if (/Paquebot/i.test(nm)) { pal = PAL.aime; spec = { b: bldPlPaquebot, w: Math.min(w, 205), d: clamp(d, 30, 40) }; }
    else if (/Le France/i.test(nm)) { pal = { ...PAL.france, floors: Math.max(2, Math.round((b.h || 29) / FLOOR)), tower: false }; spec = { b: bldLeFrance, w: Math.min(w, 102), d: clamp(d, 16, 20) }; }   // 28,8 m (BD TOPO) : 10 niveaux, comme sur les photos
    else if (/Club Med/i.test(nm) && !/ex /i.test(nm)) { pal = { ...PAL.red, floors: 11, tower: w < 30 }; spec = { b: bldPlSlab, w: clamp(w, 16, 70), d: clamp(d, 13, 18) }; }
    else if (/Salle|Parking|Garage|Funi|omnisport/i.test(nm)) { pal = { ...PAL.low, floors: 2 }; spec = { b: bldPlSlab, w: clamp(w, 12, 70), d: clamp(d, 10, 30) }; }
    else if (modern && area > 220) {
      // T5 bis : tours et étages d'après la BD TOPO de l'IGN (b.levels, comptés au-dessus du sol amont) ; l'ancien tirage
      // au hasard ne sert plus que si la donnée manque
      const tower = b.levels > 0 ? w < 32 && d < 32 && b.levels >= 9 : w < 30 && d < 30 && hsh < 0.45;
      const floors = b.levels > 0 ? Math.max(2, b.levels) : tower ? 11 + Math.floor(hsh * 10) % 5 : 5 + Math.floor(hsh * 9) % 4 + (area > 900 ? 1 : 0);
      pal = { ...(/Aime/.test(town) ? PAL.aime : tower ? PAL.tower : PAL.centre), floors, tower, shops: /Centre/.test(town) && hsh > 0.5 };
      spec = tower ? { b: bldPlSlab, w: clamp(w, 14, 24), d: clamp(d, 13, 22) } : { b: bldPlSlab, w: clamp(w, 16, 90), d: clamp(d, 11, 17) };
    }
    // T5 bis : les petits bâtiments de Plagne Centre et d'Aime 2000 (BD TOPO : locaux, galeries, annexes) restent en béton,
    // bas, au lieu de chalets de pierre au milieu de la station
    else if (modern && area > 90 && b.levels > 0) { pal = { ...(/Aime/.test(town) ? PAL.aime : PAL.centre), floors: Math.max(2, Math.min(b.levels, 4)), tower: false }; spec = { b: bldPlSlab, w: clamp(w, 10, 40), d: clamp(d, 8, 14) }; }
    else if (area > 160) { pal = PAL.village; spec = { b: bldWoodRes, w: clamp(w, 18, 46), d: clamp(d, 11, 15) }; }
    else spec = { b: (x, z, r, ww, dd) => bldStoneChalet(x, z, r, ww, dd, area < 110), w: clamp(w, 9, 16), d: clamp(d, 8, 11) };
    // the landmarks stand where they are, whatever runs past them; everything else keeps off runs and lift lines
    const landmark = spec.b === bldPlPaquebot || spec.b === bldLeFrance || /Club Med/i.test(nm);
    let bx = b.x, bz = b.z, stationIn = null;
    if (landmark) {   // where a lift line runs into it (the gondola arrives at the end of the Paquebot), keep the longest clear stretch
      const cols = []; for (let u = -spec.w / 2; u <= spec.w / 2; u += 4) cols.push([u, landmarkOK(...toWorld(b.x, b.z, rot, u, 0), rot, 4, spec.d)]);
      let best = null, cur = null; for (const [u, ok] of cols) { if (ok) { cur = cur ? [cur[0], u] : [u, u]; if (!best || cur[1] - cur[0] > best[1] - best[0]) best = cur.slice(); } else cur = null; }
      if (!best || best[1] - best[0] < 40) { console.info('La Plagne: landmark not placed', nm); continue; }
      [bx, bz] = toWorld(b.x, b.z, rot, (best[0] + best[1]) / 2, 0); spec.w = best[1] - best[0];
    } else {
      let why = footprintWhy(b.x, b.z, rot, spec.w, spec.d, 14);
      // T6 : un immeuble qui porte des commerces d'OSM est gardé au bord du front de neige (règle assouplie)
      const shopB = why && why !== 'pente' && shopsNear(b.x, b.z, rot, Math.max(w, spec.w), Math.max(d, spec.d));
      // pôle de gare : une gare de remontée à moins de 20 m de l'emprise (la gare du Télémétro est dans le complexe de Le
      // Pelvoux) : seule la ligne au-delà des 25 premiers mètres compte pour la règle des 6 m ; l'embarquement reste dégagé
      const inF = (px, pz) => { const c = Math.cos(rot), sn = Math.sin(rot), fx = px - b.x, fz = pz - b.z; return Math.abs(fx * c - fz * sn) < w / 2 + 20 && Math.abs(fx * sn + fz * c) < d / 2 + 20; };
      stationIn = shopB ? LIFTS.find(L => L.B && (inF(L.B.x, L.B.z) || inF(L.T.x, L.T.z))) || null : null;
      if (shopB) why = footprintWhy(b.x, b.z, rot, spec.w, spec.d, 14, true, !!stationIn);
      // T6 : une piste ou une gare longe l'immeuble (Le Pelvoux, G1G2) : la barre du jeu, moins profonde que l'emprise IGN,
      // est glissée dans l'emprise réelle, du côté opposé
      let tried = null;
      if ((why === 'piste' || why === 'remontée') && shopB) {
        const ru = Math.max(0, (w - spec.w) / 2), rv = Math.max(0, (d - spec.d) / 2), offs = [];
        for (let du = -ru; du <= ru + 1e-6; du += 2) for (let dv = -rv; dv <= rv + 1e-6; dv += 2) offs.push([du, dv]);
        offs.sort((a, c) => Math.hypot(a[0], a[1]) - Math.hypot(c[0], c[1]));
        tried = {};
        for (const [du, dv] of offs) { const [px, pz] = toWorld(b.x, b.z, rot, du, dv), wy = footprintWhy(px, pz, rot, spec.w, spec.d, 14, true, !!stationIn); tried[wy] = (tried[wy] || 0) + 1; if (!wy) { [bx, bz] = [px, pz]; why = null; SLID.push({ name: nm, du, dv }); break; } }
      }
      if (why) { REJECTED.push({ x: b.x, z: b.z, w: spec.w, d: spec.d, name: nm, kind: b.kind, why, rank: list.indexOf(b), tried }); continue; }
    }
    if (spec.b !== bldLeFrance) claim(bx, bz, rot, spec.w, spec.d);   // Le France : seules ses ailes font obstacle (bldLeFrance)
    // T5 ter : la façade avant (v > 0 : galerie, commerces, terrasse) est tournée vers le front de neige
    if (frontSide(bx, bz, rot, spec.w, spec.d) < 0) rot += Math.PI;
    const tp = spec.b === bldPlPaquebot || spec.b === bldLeFrance ? null : planTerrace(bx, bz, rot, spec.w, spec.d, isPC(pal));
    // T6 : Aime 2000 d'après les photos fournies — front de neige du Paquebot, replat au pied des autres immeubles
    const paq = spec.b === bldPlPaquebot ? planPaquebot(bx, bz, rot, spec.w, spec.d) : null;
    const fr = !tp && !paq && /Aime/.test(town) && pal && pal !== PAL.village && frontScore(bx, bz, rot, spec.w, spec.d, 1) <= 60 ? planFront(bx, bz, rot, spec.w, spec.d) : null;
    if (fr) {
      const g0 = groundMax(bx, bz, spec.w, spec.d, rot) + 0.3;
      CUR_FLOOR = fr.L;
      if (pal.floors) pal = { ...pal, floors: Math.max(2, pal.floors + Math.round((g0 - fr.L) / FLOOR)) };
    }
    if (tp) {
      const g0 = groundMax(bx, bz, spec.w, spec.d, rot) + 0.3;
      flattenRect(bx, bz, rot, tp.uc - tp.W / 2 - 1, tp.uc + tp.W / 2 + 1, spec.d / 2 - 1.5, spec.d / 2 + tp.g + tp.D + 1, tp.L);
      CUR_FLOOR = tp.L;
      // les étages restent comptés depuis le toit réel : un rez-de-chaussée plus bas (ou plus haut) en ajoute (ou en retire)
      if (pal && pal !== PAL.village && pal.floors) pal = { ...pal, floors: Math.max(2, pal.floors + Math.round((g0 - tp.L) / FLOOR)) };
    }
    const n0 = BUILDINGS.length;
    CUR_FOOT = { x: b.x, z: b.z, rot, w, d };   // emprise IGN : les commerces qu'elle contient vont à cet immeuble
    const o0 = obstacles.length;
    CUR_PAL = pal; CUR_PAQ = paq; spec.b(bx, bz, rot, spec.w, spec.d); CUR_PAL = null; CUR_FLOOR = null; CUR_PAQ = null; placed++;
    for (let i = n0; i < BUILDINGS.length; i++) if (!BUILDINGS[i].shopList) attachShops(BUILDINGS[i]);   // chalets et autres : vitrines OSM ou logements
    CUR_FOOT = null;
    if (stationIn) {   // la gare reste accessible : pas d'obstacle de cet immeuble autour de la gare, de l'embarquement et de l'arrivée
      const pts = [stationIn.board, stationIn.exit && { x: stationIn.exit[0], z: stationIn.exit[1] }].filter(Boolean);
      for (let i = obstacles.length - 1; i >= o0; i--) { const o = obstacles[i]; if (pts.some(q => Math.hypot(o.x - q.x, o.z - q.z) < o.r + 6)) obstacles.splice(i, 1); }
      const B = BUILDINGS[BUILDINGS.length - 1]; if (B) B.station = stationIn.name;
    }
    // T6 : pas de sapins au cœur ni sur le front de neige de Plagne Centre : 25 m autour des immeubles, 45 m devant leur
    // façade avant
    if (/Centre/.test(town)) for (let i = n0; i < BUILDINGS.length; i++) { const B = BUILDINGS[i]; clearRect(B.x, B.z, B.rot, -B.w / 2 - 25, B.w / 2 + 25, -B.d / 2 - 25, B.d / 2 + 45); }
    if (tp && BUILDINGS.length > n0) BUILDINGS[BUILDINGS.length - 1].terrace = tp;
    if (paq) for (const t of paq.decks) if (BUILDINGS[n0 + t.k]) BUILDINGS[n0 + t.k].terrace = t;
    if (fr && BUILDINGS.length > n0) { const b = BUILDINGS[BUILDINGS.length - 1]; FRONTS.push({ x: b.x, z: b.z, rot: b.rot, w: b.w, d: b.d, L: fr.L, top: b.top, ok: fr.ok }); }
  }
  console.info('La Plagne: ' + placed + ' buildings of ' + list.length);
  buildTerraces();
}

/* ---------------- T5 ter : front de neige, terrasses d'après OpenStreetMap ----------------
   Ni OSM ni la BD TOPO ne tracent les terrasses : on en pose une devant l'immeuble qui contient un restaurant, un bar
   ou un café d'OSM (PLAGNE.venues), sur sa façade front de neige, au niveau de la neige. Règles :
   - front de neige : la grande façade la plus proche d'une piste ou d'une gare de départ (sinon la façade aval) ;
   - un seul niveau L par immeuble : neige devant la façade = rez-de-chaussée = plancher de la terrasse ;
   - la neige n'est aplanie que sous la terrasse et la bande jusqu'à la façade (jamais sur une piste, près d'une
     remontée ou sous un autre immeuble) ; pas de pilotis ni de marche. */
const liftNear = (x, z, r) => LIFTS.some(L => L.B && (Math.hypot(L.B.x - x, L.B.z - z) < r || Math.hypot(L.T.x - x, L.T.z - z) < r));
/** Distance (m) de la façade sd (±1) à la première piste ou gare de remontée, au plus 120 m ; au-delà, 1000 + l'altitude
 *  devant la façade (pas de piste en vue : le côté aval l'emporte). */
export function frontScore(x, z, rot, w, d, sd) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  for (let s = 2; s <= 120; s += 3) for (const u of [-w * 0.3, 0, w * 0.3]) {
    const v = sd * (d / 2 + s), px = x + u * ca + v * sa, pz = z - u * sa + v * ca;
    if (zoneAt(px, pz) >= 0 || liftNear(px, pz, 20)) return s;
  }
  return 1000 + gridH(x + sd * (d / 2 + 10) * sa, z + sd * (d / 2 + 10) * ca);
}
export function frontSide(x, z, rot, w, d) {
  return frontScore(x, z, rot, w, d, 1) <= frontScore(x, z, rot, w, d, -1) ? 1 : -1;
}
const inOther = (px, pz, m) => BUILDINGS.some(b => { const dx = px - b.x, dz = pz - b.z, c = Math.cos(b.rot), s = Math.sin(b.rot); return Math.abs(dx * c - dz * s) < b.w / 2 + m && Math.abs(dx * s + dz * c) < b.d / 2 + m; });
export function planTerrace(x, z, rot, w, d, pc) {
  if (!PLAGNE || !PLAGNE.venues || TERRACES.length >= TERRACES.cap) return null;
  const ca = Math.cos(rot), sa = Math.sin(rot), loc = (px, pz) => { const dx = px - x, dz = pz - z; return [dx * ca - dz * sa, dx * sa + dz * ca]; };
  const vs = PLAGNE.venues.map(q => [q, ...loc(q.x, q.z)]).filter(([, u, v]) => Math.abs(u) < w / 2 + 4 && v > -d * 0.15 && v < d / 2 + 12);
  if (!vs.length) return null;
  TERRACES.cand = (TERRACES.cand || 0) + 1;
  const W = clamp(w * 0.55, 10, 20), D = 8, g = pc ? GALLERY.depth + 0.4 : 0.6;
  const uc = clamp(vs.reduce((m, [, u]) => m + u, 0) / vs.length, -w / 2 + W / 2, w / 2 - W / 2);
  const at = (u, v) => [x + u * ca + v * sa, z - u * sa + v * ca];
  let L = 0, n = 0, lo = 1e9, hi = -1e9;
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 2; j++) { const [px, pz] = at(uc - W / 2 + i * W / 4, d / 2 + g + j * D / 2), h = gridH(px, pz); L += h; n++; lo = Math.min(lo, h); hi = Math.max(hi, h); }
  L /= n;
  const why = k => { TERRACES.why[k] = (TERRACES.why[k] || 0) + 1; return null; };
  if (hi - lo > 4) return why('pente');                                            // terrain trop pentu pour un replat
  const z0 = zoneWhy(at, uc, W, D, d, g); if (z0) return why(z0);
  const t = { uc, W, D, g, L: Math.round(L * 100) / 100, venues: vs.length, outdoor: vs.some(([q]) => q.outdoor) ? 1 : 0, src: 'osm' };
  TERRACES.push(t); return t;
}
/** Zone aplanie pour de bon autour d'une terrasse (terrasse + 9 m) : ni bord de carte, ni piste, ni remontée, ni autre
 *  immeuble (dans le raccord, de 9 à 15 m, ces endroits-là sont simplement laissés tels quels : flattenRect). */
function zoneWhy(at, uc, W, D, d, g) {
  for (let u = uc - W / 2 - 10; u <= uc + W / 2 + 10; u += 2) for (let v = d / 2 - 1; v <= d / 2 + g + D + 10; v += 2) {
    const [px, pz] = at(u, v);
    if (Math.abs(px) > HALF - 30 || Math.abs(pz) > HALF - 30) return 'bord';
    if (zoneAt(px, pz) >= 0) return 'piste';
    if (liftDist(px, pz) < 10) return 'remontée';
    if (inOther(px, pz, 1)) return 'immeuble';
  }
  return null;
}
/** Aplanit la neige à L dans un rectangle de la façade (repère u, v), pleinement jusqu'à 9 m autour (les sommets de la
 *  grille de 6,25 m qui portent les triangles), raccord en douceur jusqu'à 15 m. */
export function flattenRect(x, z, rot, u0, u1, v0, v1, L) {
  const ca = Math.cos(rot), sa = Math.sin(rot), R = Math.hypot(u1 - u0, v1 - v0) / 2 + 16;
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, cx = x + cu * ca + cv * sa, cz = z - cu * sa + cv * ca;
  const i0 = Math.max(0, Math.floor((cx - R + HALF) / CELL)), i1 = Math.min(VN - 1, Math.ceil((cx + R + HALF) / CELL));
  const j0 = Math.max(0, Math.floor((cz - R + HALF) / CELL)), j1 = Math.min(VN - 1, Math.ceil((cz + R + HALF) / CELL));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const px = -HALF + i * CELL, pz = -HALF + j * CELL, dx = px - x, dz = pz - z, u = dx * ca - dz * sa, v = dx * sa + dz * ca;
    const dist = Math.hypot(Math.max(u0 - u, 0, u - u1), Math.max(v0 - v, 0, v - v1)), t = 1 - smoothstep(9, 15, dist);
    if (t <= 0) continue;
    if (t < 1 && (zoneAt(px, pz) >= 0 || liftDist(px, pz) < 10 || inOther(px, pz, 0.5))) continue;   // pistes, remontées, immeubles voisins : neige intacte
    heights[j * VN + i] = lerp(heights[j * VN + i], L, t);
  }
}

/* ---------------- T6 : Aime 2000, d'après les photos fournies ----------------
   Sur les photos (vue aérienne et vue du front de neige), la neige arrive au rez-de-chaussée des immeubles d'Aime 2000
   et le Paquebot a des terrasses sur la neige, côté pistes. Le relief IGN, lui, creuse un fossé de 1 à 3 m au pied de
   la façade (interpolation autour du bâtiment) et descend d'environ 8 % le long du Paquebot. Règles :
   - Paquebot : la neige est remise au niveau du profil pris 5 à 11 m devant la façade (lissé sur ±8 m), qui suit la
     pente ; les commerces du rez-de-chaussée suivent la neige par paliers (trois par module de ~19 m) ;
   - deux terrasses sur la neige, à plat, d'après les photos (positions approchées : grande terrasse vers l'extrémité
     nord-ouest construite, terrasse aux parasols vers le milieu) ;
   - autres immeubles d'Aime 2000 qui ont une piste à moins de 60 m : un replat de neige au niveau du rez-de-chaussée
     devant la façade avant, si la pente le permet ;
   - aucun sommet de piste, de remontée (10 m) ou d'un autre immeuble n'est modifié, ni dans la bande ni dans le
     raccord : pistes, robot et slalom ne changent pas. */
export let FRONTS = [];
/** Met la neige au niveau prof(u) dans la bande [u0,u1]×[v0,v1] du repère de la façade, raccord sur `blend` m. */
export function fillBand(x, z, rot, u0, u1, v0, v1, prof, blend = 6, keep = Infinity) {
  const ca = Math.cos(rot), sa = Math.sin(rot), R = Math.hypot(u1 - u0, v1 - v0) / 2 + blend + CELL;
  const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2, cx = x + cu * ca + cv * sa, cz = z - cu * sa + cv * ca;
  const i0 = Math.max(0, Math.floor((cx - R + HALF) / CELL)), i1 = Math.min(VN - 1, Math.ceil((cx + R + HALF) / CELL));
  const j0 = Math.max(0, Math.floor((cz - R + HALF) / CELL)), j1 = Math.min(VN - 1, Math.ceil((cz + R + HALF) / CELL));
  let n = 0, kept = 0;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const px = -HALF + i * CELL, pz = -HALF + j * CELL, dx = px - x, dz = pz - z, u = dx * ca - dz * sa, v = dx * sa + dz * ca;
    const dist = Math.hypot(Math.max(u0 - u, 0, u - u1), Math.max(v0 - v, 0, v - v1)), t = 1 - smoothstep(0, blend, dist);
    if (t <= 0) continue;
    if (zoneAt(px, pz) >= 0 || liftDist(px, pz) < 10 || inOther(px, pz, 0.5)) { kept++; continue; }
    const h0 = heights[j * VN + i], L = prof(clamp(u, u0, u1)), tk = keep < Infinity ? t * (1 - smoothstep(keep, keep + 1.5, Math.abs(h0 - L))) : t;   // keep : au-delà, le relief est laissé
    if (tk <= 0) { kept++; continue; }
    heights[j * VN + i] = lerp(h0, L, tk); n++;
  }
  return { n, kept };
}
const meanH = (at, u0, u1, v0, v1, st = 2) => { let s = 0, k = 0, lo = 1e9, hi = -1e9; for (let u = u0; u <= u1 + 1e-6; u += st) for (let v = v0; v <= v1 + 1e-6; v += st) { const h = gridH(...at(u, v)); s += h; k++; lo = Math.min(lo, h); hi = Math.max(hi, h); } return { h: s / k, lo, hi }; };

/** Front de neige du Paquebot : profil de neige, terrasses des photos, paliers des commerces (CUR_PAQ pour bldPlPaquebot).
 *  Le profil T(u) le long de la façade suit la neige naturelle (lissée), sauf au droit des terrasses où il est à plat
 *  (terrasse ± 9 m : les sommets de la grille de 6,25 m qui portent la neige sous la terrasse) ; l'écart entre les
 *  deux est réparti en pente douce entre les replats. */
export function planPaquebot(x, z, rot, w, d) {
  const n = Math.max(3, Math.round(w / 20)), mw = w / n, np = 6, at = (u, v) => toWorld(x, z, rot, u, v), g = 0.6;
  const us = [], raw = [];
  for (let u = -w / 2 - 20; u <= w / 2 + 20.01; u += 2) { us.push(u); raw.push(meanH(at, u, u, d / 2 + 5, d / 2 + 11).h); }
  const sm0 = raw.map((_, i) => { let s = 0, k = 0; for (let j = Math.max(0, i - 4); j <= Math.min(raw.length - 1, i + 4); j++, k++) s += raw[j]; return s / k; });
  const sm = u => { const f = clamp((u - us[0]) / 2, 0, us.length - 1.001), i = Math.floor(f); return lerp(sm0[i], sm0[i + 1], f - i); };
  const avg = (u0, u1) => { let s = 0, k = 0; for (let u = u0; u <= u1 + 1e-6; u += 1) { s += sm(u); k++; } return s / k; };
  // terrasses d'après les photos : grande terrasse vers l'extrémité nord-ouest construite, terrasse aux parasols vers
  // le milieu
  const P = { n, mw, np, gfl: [], decks: [], fill: null }, flats = [];
  // (premier module possible dans l'ordre de préférence ; deux replats à 18 m au moins l'un de l'autre, pour que la
  // neige garde une pente douce entre eux)
  for (const q of [{ ks: [0, 1, 2], W: 12, D: 10 }, { ks: [Math.floor(n / 2), Math.floor(n / 2) + 1, Math.floor(n / 2) - 1], W: 12, D: 8 }]) {
    for (const k of q.ks) {
      if (k < 0 || k >= n) continue;
      const um = -w / 2 + (k + 0.5) * mw, a = um - q.W / 2 - 9, b = um + q.W / 2 + 9;
      if (flats.some(f => a < f.b + 18 && b > f.a - 18)) { TERRACES.why['photo:écart'] = (TERRACES.why['photo:écart'] || 0) + 1; continue; }
      const z0 = zoneWhy(at, um, q.W, q.D, d, g);
      if (z0) { TERRACES.why['photo:' + z0] = (TERRACES.why['photo:' + z0] || 0) + 1; continue; }
      flats.push({ a, b, L: Math.round(avg(um - q.W / 2, um + q.W / 2) * 100) / 100, um, q: { ...q, k } });
      break;
    }
  }
  flats.sort((p, q) => p.a - q.a);
  const R = 15, off = u => {   // décalage du profil par rapport à la neige naturelle
    for (const f of flats) if (u >= f.a && u <= f.b) return f.L - sm(u);
    const prev = flats.filter(f => f.b < u).pop(), next = flats.find(f => f.a > u);
    const o0 = prev ? prev.L - sm(prev.b) : 0, o1 = next ? next.L - sm(next.a) : 0;
    const a0 = prev ? prev.b : (next ? next.a - R : u), a1 = next ? next.a : (prev ? prev.b + R : u);
    return a1 > a0 ? lerp(o0, o1, smoothstep(a0, a1, clamp(u, a0, a1))) : 0;
  };
  const T = u => sm(u) + off(u);
  P.fill = fillBand(x, z, rot, -w / 2 - 3, w / 2 + 3, d / 2 - 9, d / 2 + 8, T, 6);   // jusque sous la façade : la neige au pied du mur dépend des sommets voisins
  for (const f of flats) {
    fillBand(x, z, rot, f.a, f.b, d / 2 - 10.5, d / 2 + g + f.q.D + 9, () => f.L, 6);
    const t = { uc: f.um - (-w / 2 + (f.q.k + 0.5) * mw), W: f.q.W, D: f.q.D, g, L: f.L, venues: 0, outdoor: 1, src: 'photo', k: f.q.k };
    TERRACES.push(t); P.decks.push(t);
  }
  // paliers : le niveau de la neige au pied de chaque sixième de module (après les terrasses)
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let s = 0; s < np; s++) { const u0 = -w / 2 + i * mw + s * mw / np, du = mw / np; row.push(Math.round(meanH(at, u0 + du / 4, u0 + du * 3 / 4, d / 2 + 0.6, d / 2 + 2.6, du / 4).h * 100) / 100); }
    P.gfl.push(row);
  }
  return P;
}
/** Autres immeubles d'Aime 2000 : rez-de-chaussée au niveau de la neige médiane devant la façade avant (étages ajoutés
 *  si le sol descend côté front de neige), replat de neige devant elle là où l'écart ne dépasse pas 2,5 m (au-delà, le
 *  relief est laissé : bout de façade en pente). null si moins de 60 % de la façade peut être mis à niveau, ou si une
 *  piste, une remontée ou un immeuble voisin est dans la bande. */
export function planFront(x, z, rot, w, d) {
  const at = (u, v) => toWorld(x, z, rot, u, v), why = k => { FRONTS.why[k] = (FRONTS.why[k] || 0) + 1; return null; };
  const hs = [];
  for (let u = -w / 2 + 1; u <= w / 2 - 1 + 1e-6; u += 2) for (let v = d / 2 + 3; v <= d / 2 + 9; v += 2) hs.push(gridH(...at(u, v)));
  hs.sort((a, b) => a - b);
  const L = Math.round(hs[hs.length >> 1] * 100) / 100, ok = hs.filter(h => Math.abs(h - L) <= 2.5).length / hs.length;
  if (ok < 0.6) return why('pente');
  for (let u = -w / 2 - 2; u <= w / 2 + 2; u += 2) for (let v = d / 2 - 1; v <= d / 2 + 8; v += 2) {
    const [px, pz] = at(u, v);
    if (zoneAt(px, pz) >= 0) return why('piste');
    if (liftDist(px, pz) < 10) return why('remontée');
    if (inOther(px, pz, 1)) return why('immeuble');
  }
  fillBand(x, z, rot, -w / 2 - 1, w / 2 + 1, d / 2 - 9, d / 2 + 6, () => L, 6, 2.5);
  return { L, ok: Math.round(ok * 100) / 100 };
}

export function buildTerraces() {
  let n = 0;
  const share = Math.ceil((IS_TOUCH ? 70 : 150) / Math.max(1, BUILDINGS.filter(b => b.terrace).length));   // T6 : clientèle partagée entre les terrasses
  for (const b of BUILDINGS) {
    const t = b.terrace; if (!t) continue;
    const [cx, cz] = toWorld(b.x, b.z, b.rot, t.uc, b.d / 2 + t.g + t.D / 2);
    buildDeck(cx, cz, b.rot, t.W, t.D, t.L, hashSeed(cx, cz, 41), true, share);
    claim(cx, cz, b.rot, t.W, t.D); t.cx = cx; t.cz = cz; t.rot = b.rot; t.floor = b.top; n++;
  }
  console.info('La Plagne: ' + n + ' terraces (OSM venues, photos), ' + TERRACE_FOLK.length + ' people on them');
}

export function buildDeck(cx, cz, rot, W, D, y, seed, flush = false, maxFolk = Infinity) {
  const r = mulberry32(seed), parts = [], grp = new THREE.Group(); grp.position.set(cx, 0, cz); grp.rotation.y = rot;
  const WOODT = '#8a5d3a', WOODK = '#5b3b27', at = (u, v) => toWorld(cx, cz, rot, u, v);
  boxP(parts, W, 0.16, D, 0, y - 0.08, 0, WOODT);                                                       // deck
  for (let k = 0; k < W / 0.6; k++) boxP(parts, 0.04, 0.02, D, -W / 2 + k * 0.6, y + 0.005, 0, WOODK);   // plank joints
  for (let u = -W / 2 + 0.2; u <= W / 2; u += 3) for (const v of [-D / 2 + 0.2, D / 2 - 0.2]) {       // stilts down the slope
    const g = gridH(...at(u, v)), h = y - g + 0.3; if (h > 0.2) boxP(parts, 0.25, h, 0.25, u, g + h / 2 - 0.3, v, WOODK);
  }
  // parapet on three sides, an opening onto the snow at the front
  const rail = (len, x, z, along) => { if (len < 0.3) return; boxP(parts, along ? len : 0.08, 0.85, along ? 0.08 : len, x, y + 0.5, z, WOODK); boxP(parts, along ? len + 0.05 : 0.18, 0.08, along ? 0.18 : len + 0.05, x, y + 0.96, z, SNOWC); };
  rail(W / 2 - 1.2, -W / 4 - 0.6, D / 2 - 0.05, true); rail(W / 2 - 1.2, W / 4 + 0.6, D / 2 - 0.05, true);
  rail(D, -W / 2 + 0.05, 0, false); rail(D, W / 2 - 0.05, 0, false);
  if (!flush) boxP(parts, 1.2, 0.18, 1.6, 0, y - 0.25, D / 2 + 0.8, WOODT);                               // step down to the snow (T5 ter : aucune marche, la terrasse affleure la neige)
  // bar against the building
  const bx = (r() - 0.5) * (W - 6);
  boxP(parts, 4, 1.05, 0.7, bx, y + 0.52, -D / 2 + 0.6, WOODK); boxP(parts, 4.2, 0.08, 0.85, bx, y + 1.08, -D / 2 + 0.62, '#2e2a26');
  for (let k = 0; k < 5; k++) { const c = ['#5d0f1c', '#2f6b3a', '#d9a032', '#e9e4da', '#3a2a1a'][k], b1 = new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), b2 = new THREE.CylinderGeometry(0.012, 0.03, 0.1, 8);
    b1.translate(bx - 1.6 + k * 0.7, y + 1.23, -D / 2 + 0.5); b2.translate(bx - 1.6 + k * 0.7, y + 1.39, -D / 2 + 0.5); parts.push({ g: b1, c }, { g: b2, c }); }   // bottles
  // deckchairs in a row along the front, facing the slopes
  const nChairs = Math.floor((W - 3) / 1.25), folk = [];
  for (let k = 0; k < nChairs; k++) {
    const u = -W / 2 + 1.6 + k * 1.25; if (Math.abs(u) < 1.4) continue;
    const vz = D / 2 - 1.7, fab = ['#2f6fe0', '#e7e2d8', '#c8321f', '#2fa84f', '#f2a12c'][Math.floor(r() * 5)];
    boxP(parts, 0.62, 0.05, 1.0, u, y + 0.34, vz + 0.25, fab);                                         // seat sling
    const bk = new THREE.BoxGeometry(0.62, 0.05, 0.85); bk.rotateX(0.95); bk.translate(u, y + 0.62, vz - 0.46); parts.push({ g: bk, c: fab });   // backrest
    for (const sx of [-0.31, 0.31]) { boxP(parts, 0.04, 0.04, 1.6, u + sx, y + 0.3, vz, WOODT); boxP(parts, 0.04, 0.34, 0.04, u + sx, y + 0.17, vz + 0.65, WOODT); boxP(parts, 0.04, 0.34, 0.04, u + sx, y + 0.17, vz - 0.55, WOODT); }
    if (r() < 0.72) folk.push({ u, v: vz + 0.1, yaw: 0, pose: 'lounge' });
  }
  // tables with chairs, parasols
  const nT = Math.max(2, Math.floor(W / 6));
  for (let k = 0; k < nT; k++) {
    const u = -W / 2 + 2.5 + k * (W - 5) / Math.max(1, nT - 1), v = -0.6 + (r() - 0.5) * 0.8;
    const top = new THREE.CylinderGeometry(0.45, 0.45, 0.05, 12); top.translate(u, y + 0.74, v); parts.push({ g: top, c: '#efe9de' });
    boxP(parts, 0.07, 0.72, 0.07, u, y + 0.36, v, '#2b2b2b');
    for (const a of [0, Math.PI]) {
      const cu = u + Math.sin(a) * 0.85, cv = v + Math.cos(a) * 0.85;
      boxP(parts, 0.45, 0.05, 0.45, cu, y + 0.46, cv, WOODT); boxP(parts, 0.45, 0.45, 0.05, cu, y + 0.7, cv + Math.cos(a) * 0.21, WOODT);
      for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) boxP(parts, 0.04, 0.46, 0.04, cu + dx, y + 0.23, cv + dz, '#2b2b2b');
      if (r() < 0.75) folk.push({ u: cu, v: cv, yaw: a + Math.PI, pose: 'chair' });
    }
    if (k % 2 === 0) {
      boxP(parts, 0.05, 2.3, 0.05, u, y + 1.15, v, '#d8d2c4');
      const sh = new THREE.ConeGeometry(1.5, 0.55, 8, 1, true); sh.translate(u, y + 2.45, v); parts.push({ g: sh, c: ['#c8321f', '#efe9de', '#2f5f8a', '#3b6b3a'][Math.floor(r() * 4)] });
    }
  }
  // standing: at the bar and along the parapet
  for (let k = 0; k < 2 + Math.floor(r() * 3); k++) folk.push({ u: bx - 1.4 + k * 0.9 + (r() - 0.5) * 0.3, v: -D / 2 + 1.45, yaw: Math.PI + (r() - 0.5) * 0.6, pose: r() < 0.3 ? 'fries' : 'stand' });
  for (let k = 0; k < 1 + Math.floor(r() * 3); k++) folk.push({ u: (r() - 0.5) * (W - 3), v: D / 2 - 0.55, yaw: (r() - 0.5) * 0.8, pose: r() < 0.35 ? 'fries' : 'stand' });
  // T5 : terrasse complète : parasols chauffants, ardoise du menu, bacs à sapins aux angles, lanternes sur le garde-corps
  // (tirage séparé, après les clients : les places et les personnes ne bougent pas)
  { const r2 = mulberry32(seed ^ 0x5bd1e995);
    for (const hu of [-W / 2 + 1.2, W / 2 - 1.2]) {
      const pole = new THREE.CylinderGeometry(0.05, 0.05, 2.1, 8); pole.translate(hu, y + 1.05, -0.6); parts.push({ g: pole, c: '#9aa3ae' });
      const base = new THREE.CylinderGeometry(0.28, 0.32, 0.08, 12); base.translate(hu, y + 0.04, -0.6); parts.push({ g: base, c: '#3a3f46' });
      const hood = new THREE.ConeGeometry(0.42, 0.22, 12, 1, true); hood.translate(hu, y + 2.18, -0.6); parts.push({ g: hood, c: '#c7ccd3' });
      const glow = new THREE.CylinderGeometry(0.09, 0.09, 0.3, 8); glow.translate(hu, y + 1.95, -0.6); parts.push({ g: glow, c: '#ff8a3a' });
    }
    const mu = (r2() - 0.5) * (W - 4), mv = D / 2 + 1.3;   // ardoise en A au pied des marches
    for (const sg of [-1, 1]) { const g = new THREE.BoxGeometry(0.6, 0.9, 0.04); g.rotateX(sg * 0.22); g.translate(mu + 1.4, y - 0.1, mv + sg * 0.1); parts.push({ g, c: sg > 0 ? '#1d2126' : '#5b3b27' }); }
    for (const [pu, pv] of [[-W / 2 + 0.6, -D / 2 + 0.6], [W / 2 - 0.6, -D / 2 + 0.6], [-W / 2 + 0.6, D / 2 - 0.6], [W / 2 - 0.6, D / 2 - 0.6]]) {
      boxP(parts, 0.7, 0.55, 0.7, pu, y + 0.28, pv, '#5b3b27');
      const fir = new THREE.ConeGeometry(0.32, 1.1 + r2() * 0.4, 7); fir.translate(pu, y + 1.1, pv); parts.push({ g: fir, c: '#2d4a32' });
      const cap = new THREE.ConeGeometry(0.2, 0.3, 7); cap.translate(pu, y + 1.5, pv); parts.push({ g: cap, c: SNOWC });
    }
    for (let u = -W / 2 + 1; u < W / 2 - 0.5; u += 2.4) if (Math.abs(u) > 1.4) { const l = new THREE.BoxGeometry(0.16, 0.22, 0.16); l.translate(u, y + 1.12, D / 2 - 0.05); parts.push({ g: l, c: '#ffcf7a' }); }   // lanternes
  }
  const m = new THREE.Mesh(mergeParts(parts), lambertVC()); m.castShadow = true; m.receiveShadow = true; grp.add(m); grp.userData.kind = 'terrace'; grp.userData.W = W; grp.userData.D = D; grp.userData.merge = true; scene.add(grp);   // T5 ter : planchers fusionnés au démarrage (batch.ts)   // repère pour les prototypes (T3)
  const DR = ['mug', 'beer', 'wine', 'mug', 'beer'];
  let nf = 0;
  for (const f of folk) {
    if (TERRACE_FOLK.length >= (IS_TOUCH ? 70 : 150) || nf++ >= maxFolk) break;   // T5 ter : plus de terrasses, clientèle plafonnée
    const [x, z] = at(f.u, f.v);
    TERRACE_FOLK.push({ x, z, y, yaw: rot + f.yaw, pose: f.pose, prop: f.pose === 'fries' ? 'fries' : r() < 0.85 ? DR[Math.floor(r() * DR.length)] : null,
      jacket: JACKETS[Math.floor(r() * JACKETS.length)], fem: r() < 0.5, gear: r() < 0.75 ? 'beanie' : 'helmet', swing: r() * 20 });
  }
  // skis and boards planted in the snow in front of the steps
  for (let k = 0; k < 3; k++) { const [x, z] = at((k - 1) * 2.2 + (r() - 0.5), D / 2 + 3.2 + r()); if (zoneAt(x, z) < 0 || true) furnitureAt('skistand', x, z, rot); }
}

export function buildVillages() {
  if (PLAGNE) return buildPlagneBuildings();
  const byName = n => PISTES.find(p => p.name === n);
  // the altitude restaurant at the mid-station, with its deck facing the valley
  restaurant: for (let r = 0; r <= 90; r += 6) for (let a = 0; a < 6.28; a += 0.4) { const x = -236 + Math.cos(a) * r, z = 128 + Math.sin(a) * r; if (footprintOK(x, z, 0.35, 30, 26, 9)) { bldRestaurant(x, z, 0.35); villageLabels.push({ name: 'Restaurant Le Belvédère', x, z, sub: 'Terrasse panoramique' }); break restaurant; } }
  for (const V of VILLAGES) {
    const runs = [[V.piste, V.d[0], V.d[1]], ...V.also];
    let paquebotDone = V.style !== 'station';
    for (const [pn, d0, d1] of runs) {
      const p = byName(pn); if (!p) continue;
      const S = { p, s: p.samples, hw: p.w / 2 };
      for (let d = d0; d < Math.min(d1, (S.s.length - 2) * 4); d += 8) {
        const i = Math.floor(d / 4), hd = pisteHeading(p, i);
        for (const side of [1, -1]) {
          if (!paquebotDone) { if (tryPlace({ b: bldPaquebot, w: 96, d: 16, drop: 40 }, S, Math.min(S.s.length - 1, i + 12), hd, side, 4)) { paquebotDone = true; continue; } }
          if (rnd() < 0.45) continue;
          const spec = STYLE[V.style](); tryPlace(spec, S, i, hd, side, rnd() * 10);
        }
      }
      villageLabels.push({ name: V.name, x: S.s[Math.floor((d0 + d1) / 8)].x, z: S.s[Math.floor((d0 + d1) / 8)].z });
    }
    if (V.bridge) buildBridge(byName(V.bridge[0]), V.bridge[1]);
  }
  // the traditional village fills in around the base, with its church
  let placed = 0;
  for (let i = 0; i < 600 && placed < 14; i++) {
    const x = -280 + rnd() * 600, z = 1170 + rnd() * 180, rot = Math.round(rnd() * 4) * Math.PI / 2 + (rnd() - 0.5) * 0.3, spec = STYLE.trad();
    if (!footprintOK(x, z, rot, spec.w, spec.d)) continue;
    claim(x, z, rot, spec.w, spec.d); spec.b(x, z, rot, spec.w, spec.d); placed++;
  }
  buildChurch(-40, 1290);
  if (footprintOK(430, 300, -0.4, 12, 10)) { claim(430, 300, -0.4, 12, 10); bldStoneChalet(430, 300, -0.4, 12, 10, true); }   // refuge en forêt
}

export function buildChurch(x, z) {
  for (let k = 0; k < 40 && !footprintOK(x, z, 0, 10, 26); k++) { x += 9; }
  const y = groundMin(x, z, 10, 16, 0);
  const grp = new THREE.Group(); grp.position.set(x, y, z);
  const nave = new THREE.Mesh(facadeBox(9, 9, 16), bmat('stone')); nave.position.y = 4; grp.add(nave);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0, 7.2, 4, 4, 1), snowRoofMat); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 1.75); roof.position.y = 10.4; grp.add(roof);
  const tower = new THREE.Mesh(facadeBox(4.2, 18, 4.2), bmat('stone')); tower.position.set(0, 8, -9); grp.add(tower);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 2.2, 3.2, 8), pbr({ color: '#3b4a3f' })); bell.position.set(0, 18.4, -9); grp.add(bell);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(1.4, 7, 8), pbr({ color: '#2f3b33' })); spire.position.set(0, 23.2, -9); grp.add(spire);
  grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(grp); claim(x, z - 4, 0, 10, 24);
  BUILDINGS.push({ type: 'church', x, z, rot: 0, w: 10, d: 26, top: y, y0: y, floors: 8, grp, detail: null });
}

export function buildBridge(p, d) {
  // covered footbridge spanning the piste between two blocks of the station
  const i = Math.floor(d / 4), S = p.samples, hd = pisteHeading(p, i), y = gridH(S[i].x, S[i].z);
  const span = p.w + 10, grp = new THREE.Group(); grp.position.set(S[i].x, y + 7.2, S[i].z); grp.rotation.y = hd;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(span, 0.6, 3.2), plinthMat); grp.add(deck);
  const body = new THREE.Mesh(facadeBox(span, 2.8, 3), bmat('paquebot')); body.position.y = 1.7; grp.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(span + 0.6, 0.45, 3.8), snowRoofMat); roof.position.y = 3.3; grp.add(roof);
  for (const s of [-1, 1]) { const pil = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9, 1.2), plinthMat); pil.position.set(s * span / 2, -3.8, 0); grp.add(pil); obstacles.push({ x: S[i].x + Math.cos(hd) * s * span / 2, z: S[i].z - Math.sin(hd) * s * span / 2, r: 1.2 }); }
  const sign = makeLabel('Val Haut 1800', '#a6dcff', 'Passerelle des Résidences'); sign.position.set(0, 1.7, 1.8); sign.scale.set(7, 2.2, 1); grp.add(sign);
  grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(grp);
  BUILDINGS.push({ type: 'bridge', x: S[i].x, z: S[i].z, rot: hd, w: span, d: 3.8, span, top: y + 7.2, y0: y + 7.2, floors: 1, grp, detail: null });
}

export function __init_2113() {

/* ---------------- Buildings & villages ---------------- */
// Styles taken from the reference photos of a large French domain:
//  · 'station'  stepped concrete "paquebot" with wooden balcony bands and shops at the foot, brown towers, low flat-roofed blocks
//  · 'bois'     4–5 storey wood-clad residences on a stone arcade, continuous balconies, deep snow on big gables, cross gables, chimneys
//  · 'hameau' / 'trad'  stone ground floors, timber upper floors with carved balconies, lit windows; altitude restaurant with a deck
VILLAGES = [
  { name: 'Les Granges', style: 'trad', piste: 'Les Sapins', d: [960, 1130], also: [['Retour Village', 1000, 1130]] },
  { name: 'Val Haut 1800', style: 'station', piste: 'Les Sapins', d: [20, 200], also: [['Retour Village', 20, 170]], bridge: ['Les Sapins', 96] },
  { name: 'Les Écureuils', style: 'hameau', piste: 'Les Écureuils', d: [10, 210], also: [] },
  { name: 'Bellecime 1950', style: 'bois', piste: 'Le Balcon', d: [300, 520], also: [] },
];
FLOOR = 2.9;
BAY = 3.2;
facadeTex = {};
buildMats = {};
snowRoofMat = pbr({ color: '#f3f7fc' });
plinthMat = pbr({ color: '#8e8a84' });
WOOD = '#6b4528';
WOOD_D = '#4a2e1a';
SNOWC = '#f4f7fb';
CONC = '#8e8a84';
STONEC = '#7d7974';
toWorld = (x, z, rot, u, v) => [x + u * Math.cos(rot) + v * Math.sin(rot), z - u * Math.sin(rot) + v * Math.cos(rot)];
/* ---- geometry helpers (all in building-local metres: x along the length, +z = front) ---- */
P_ = (parts, g, c) => { parts.push({ g, c }); return g; };
baseMats = {};
STYLE = {
  station: () => { const r = rnd(); return r < 0.45 ? { b: bldBlock, w: 26 + rnd() * 10, d: 12 } : { b: bldTower, w: 14, d: 13 }; },
  bois: () => ({ b: bldWoodRes, w: 24 + rnd() * 14, d: 13, drop: 11 }),
  hameau: () => rnd() < 0.6 ? { b: (x, z, r, w, d) => bldStoneChalet(x, z, r, w, d, rnd() < 0.5), w: 12 + rnd() * 5, d: 10 } : { b: bldWoodRes, w: 20 + rnd() * 6, d: 12 },
  trad: () => rnd() < 0.75 ? { b: (x, z, r, w, d) => bldStoneChalet(x, z, r, w, d, rnd() < 0.6), w: 11 + rnd() * 6, d: 10 } : { b: bldWoodRes, w: 22, d: 12 },
};
villageLabels = [];
/* ---- La Plagne buildings (reference: photos of Plagne Centre, Aime 2000 and Plagne Villages) ----
   Plagne Centre: rust-brown board-formed concrete slabs and towers, deep loggias with dark timber parapets on every
   floor, separating fins, flat roofs under snow, shops at the foot. Aime 2000: the "Paquebot des neiges", ~200 m
   long, stepped back floor after floor on both faces (terraces under snow), its roofline rising in three waves; next
   to it a cream tower with red fins. Plagne Villages, Soleil and 1800: dark-wood residences on a cream rendered
   ground floor, balconies all round, steep gables under heavy snow. */
PAL = {
  // T5 : nez de dalle et refends plus clairs (béton brun rouille au jour), garde-corps et fond de loggia plus sombres : le relief se lit
  centre: { facade: 'pc_rust', base: '#6b412f', wall: '#7a4a34', slab: '#8b5a41', boards: '#2b1f18', frame: '#2c1d14', parapet: '#7d5038', core: '#2e1c13' },
  tower: { facade: 'pc_tower', base: '#744634', wall: '#86503a', slab: '#93603f', boards: '#2b1f18', frame: '#2c1d14', parapet: '#84553b', core: '#2e1c13' },
  aime: { facade: 'pq_dark', base: '#625c55', wall: '#6f6961', slab: '#9a9389', boards: '#5a4a3c', frame: '#2b2826', parapet: '#7d776f', core: '#3a3632' },
  red: { facade: 'cm_cream', base: '#cfc6b4', wall: '#e4dccb', slab: '#d4cbb8', boards: '#b3223f', frame: '#e9e4da', parapet: '#b3223f', core: '#8c8577' },
  low: { facade: 'pq_dark', base: '#77726b', wall: '#8a857d', slab: '#77726b', boards: '#4a4540', frame: '#2b2826', parapet: '#6a655e', core: '#4a4540' },
  // T6 : Le France (photos fournies) : bois orangé, dalles et corniche blanches
  france: { facade: 'lf_wood', base: '#e6e4dd', wall: '#b5622c', slab: '#f0efe9', fin: '#9a5126', boards: '#c46d30', frame: '#4a2a16', parapet: '#f3f2ec', core: '#7a4a30' },
  village: { facade: 'pv_wood', base: '#d6cab0', ground: 'pv_render', wood: '#5b3b27', render: '#e3d8c0', slab: '#4a2f1f', boards: '#3e2819', frame: '#d9cdb5' },
};
CUR_PAL = null;
/* ---- sun terraces (after the La Plagne photos: decks on stilts in front of the residences and the stations' bars)
   Timber deck at the height of the highest ground under it, posts down the slope, plank parapet under snow with an
   opening onto the snow, a bar against the building, tables with chairs and parasols, a row of deckchairs facing
   the slopes; skis planted in the snow below. People: lounging in the deckchairs, sitting at the tables, standing at
   the bar or the parapet, with a mulled wine, a beer, a glass of red or a cone of chips. */
TERRACE_FOLK = [];
CUR_FLOOR = null;
TERRACES = Object.assign([], { cap: IS_TOUCH ? 10 : 20, why: {}, cand: 0 }); FRONTS = Object.assign([], { why: {} }); CUR_PAQ = null; LE_FRANCE = null; SHOPS_TAKEN = new Set(); REJECTED = []; CUR_FOOT = null; SLID = [];
}
