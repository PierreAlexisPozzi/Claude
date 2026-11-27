// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « buildings ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { BUILDINGS, GALLERY, furnitureAt, hashSeed, isPC } from './assembly';
import { cannons } from './cannons';
import { IS_TOUCH, clamp, colorCanvasTex } from './core';
import { makeLabel } from './furniture';
import { detailMat, lambertVC, mergeParts, pbr } from './materials';
import { BLEND, PLAGNE } from './world-data';
import { JACKETS } from './npcs';
import { LIFTS, PISTES, ZN, ZR, clearGrid, pisteHeading, rasterSeg, tunnelLocal, tunnels, zoneAt } from './pistes';
import { MAX_ANISO, scene } from './render';
import { HALF, gridH, mulberry32, obstacles, rnd } from './terrain';

export let VILLAGES, FLOOR, BAY, facadeTex, buildMats, snowRoofMat, plinthMat, WOOD, WOOD_D, SNOWC, CONC, STONEC, toWorld, P_, baseMats, STYLE, villageLabels, PAL, CUR_PAL, TERRACE_FOLK;


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

export function landmarkOK(x, z, rot, w, d) {
  for (let u = -w / 2; u <= w / 2; u += 4) for (let v = -d / 2; v <= d / 2; v += 4) {
    const [px, pz] = toWorld(x, z, rot, u, v);
    if (Math.abs(px) > HALF - 20 || Math.abs(pz) > HALF - 20 || liftDist(px, pz) < 8) return false;
  }
  return true;
}

export function footprintOK(x, z, rot, w, d, maxDrop = 6) {
  if (groundMax(x, z, w, d, rot) - groundMin(x, z, w, d, rot) > maxDrop) return false;
  for (let u = -w / 2 - 3; u <= w / 2 + 3; u += 4) for (let v = -d / 2 - 3; v <= d / 2 + 3; v += 4) {
    const [px, pz] = toWorld(x, z, rot, u, v);
    if (Math.abs(px) > HALF - 40 || Math.abs(pz) > HALF - 40) return false;
    if (zoneAt(px, pz) >= 0 || liftDist(px, pz) < 14) return false;
    if (obstacles.some(o => Math.hypot(o.x - px, o.z - pz) < o.r + 2)) return false;
    if (cannons.some(c => Math.hypot(c.x - px, c.z - pz) < 6)) return false;
    if (tunnels.some(T => { const tl = tunnelLocal(T, px, pz, 4); return tl && tl.s > -30 && tl.s < T.len + 30 && Math.abs(tl.w) < 26; })) return false;
  }
  return true;
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

export function startGroup(x, z, rot, w, d) {
  const y0 = groundMin(x, z, w, d, rot), top = groundMax(x, z, w, d, rot) + 0.3;
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rot;
  // the foundation down the slope: stone under the procedural chalets; in La Plagne the facade material runs down to
  // the ground (board-formed concrete under the slabs and towers, cream render under the wood residences)
  const bm = CUR_PAL ? baseMats[CUR_PAL.base] || (baseMats[CUR_PAL.base] = pbr({ color: CUR_PAL.base, roughness: 0.9 })) : bmat('plinth');
  const ph = top - y0 + 1.5, pl = new THREE.Mesh(facadeBox(w + (CUR_PAL ? 0.1 : 0.6), ph, d + (CUR_PAL ? 0.1 : 0.6)), bm); pl.position.y = y0 - 1.2 + ph / 2; grp.add(pl);
  return { grp, top, y0 };
}

/* photo 2: wood-clad residence on a stone arcade, balconies on every floor, cross gables */
export function bldWoodRes(x, z, rot, w, d) {
  const pal = CUR_PAL, floors = 3 + (rnd() < 0.5 ? 1 : 0) + (w > 30 ? 1 : 0) + (pal ? 1 : 0), gf = 3.4;
  const { grp, top, y0 } = startGroup(x, z, rot, w, d), parts = [], rails = [];
  BUILDINGS.push({ type: 'woodres', x, z, rot, w, d, top, y0, floors, grp, detail: null, pal });
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
  facadeMesh(grp, pal.shops ? 'shops' : pal.facade, w, gf, d, 0, top + gf / 2, 0, 3.4);
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
    for (let k = 0; k <= nf; k++) B(fw, H1, fd, -L / 2 + k * L / nf, top + gf + H1 / 2, D / 2 + fd / 2, pal.slab);   // fins between loggias (T5 : saillants à Plagne Centre)
    if (pc && sd === 1 && ax === 'z') {   // T5 : galerie couverte au pied (mêmes cotes que la version détaillée, GALLERY)
      const G = GALLERY, n = Math.max(2, Math.round(L / G.step));
      B(L + 0.2, G.slab, G.depth, 0, top + gf + G.slab / 2, D / 2 + G.depth / 2, pal.slab);
      B(L + 0.1, 0.32, G.depth - 0.1, 0, top + gf + G.slab + 0.16, D / 2 + G.depth / 2, SNOWC);
      for (let k = 0; k <= n; k++) B(G.post, gf, G.post, Math.min(L / 2 - 0.3, Math.max(-L / 2 + 0.3, -L / 2 + k * L / n)), top + gf / 2, D / 2 + G.depth - 0.35, pal.slab);
    }
  }
  const yt = top + gf + H1;
  boxP(parts, w + 0.5, 0.9, d + 0.5, 0, yt + 0.45, 0, pal.parapet);
  boxP(parts, w + 0.3, 0.55, d + 0.3, 0, yt + 0.95, 0, SNOWC);
  if (!pal.tower && w > 26 && !isPC(pal)) boxP(parts, 5, 2.6, 4, w * 0.25, yt + 1.6, -d * 0.15, pal.parapet);   // lift machine room
  if (isPC(pal)) { boxP(parts, 4.2, 2.2, 3.4, w * 0.22, yt + 1.5, -d * 0.12, pal.parapet); boxP(parts, 4.4, 0.3, 3.6, w * 0.22, yt + 2.72, -d * 0.12, SNOWC); }   // même local que la version détaillée
  finish(grp, parts, null, isPC(pal) ? pcParts() : null);
}

// the Paquebot des neiges: modules along its length, the roofline in three waves, every floor stepped back on both faces
export function bldPlPaquebot(x, z, rot, w, d) {
  const pal = CUR_PAL, n = Math.max(3, Math.round(w / 20)), mw = w / n, step = 1.15, gf = 3.4;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, floors = Math.round(7 + 6 * (0.5 + 0.5 * Math.cos(2 * Math.PI * 3 * (t - 1 / 6))));
    const u = -w / 2 + (i + 0.5) * mw, [mx, mz] = toWorld(x, z, rot, u, 0);
    const { grp, top, y0 } = startGroup(mx, mz, rot, mw, d), parts = [], boxes = [];
    BUILDINGS.push({ type: 'paquebot', x: mx, z: mz, rot, w: mw, d, top, y0, floors, grp, detail: null, pal, step, gf });
    facadeMesh(grp, 'shops', mw, gf, d + 0.6, 0, top + gf / 2, 0, 3.4);
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
    const landmark = spec.b === bldPlPaquebot || /Club Med/i.test(nm);
    let bx = b.x, bz = b.z;
    if (landmark) {   // where a lift line runs into it (the gondola arrives at the end of the Paquebot), keep the longest clear stretch
      const cols = []; for (let u = -spec.w / 2; u <= spec.w / 2; u += 4) cols.push([u, landmarkOK(...toWorld(b.x, b.z, rot, u, 0), rot, 4, spec.d)]);
      let best = null, cur = null; for (const [u, ok] of cols) { if (ok) { cur = cur ? [cur[0], u] : [u, u]; if (!best || cur[1] - cur[0] > best[1] - best[0]) best = cur.slice(); } else cur = null; }
      if (!best || best[1] - best[0] < 40) { console.info('La Plagne: landmark not placed', nm); continue; }
      [bx, bz] = toWorld(b.x, b.z, rot, (best[0] + best[1]) / 2, 0); spec.w = best[1] - best[0];
    } else if (!footprintOK(b.x, b.z, rot, spec.w, spec.d, 14)) continue;
    claim(bx, bz, rot, spec.w, spec.d); CUR_PAL = pal; spec.b(bx, bz, rot, spec.w, spec.d); CUR_PAL = null; placed++;
  }
  console.info('La Plagne: ' + placed + ' buildings of ' + list.length);
  buildTerraces();
}

export function buildTerraces() {
  let n = 0;
  for (const q of villageLabels) {
    const cands = BUILDINGS.filter(b => b.pal && /woodres|block|paquebot/.test(b.type) && Math.hypot(b.x - q.x, b.z - q.z) < 300)
      .sort((a, c) => Math.hypot(a.x - q.x, a.z - q.z) - Math.hypot(c.x - q.x, c.z - q.z));
    let k = 0; for (const b of cands) { if (k >= (IS_TOUCH ? 1 : 2)) break; if (terraceAt(b)) k++; }
    n += k;
  }
  console.info('La Plagne: ' + n + ' terraces, ' + TERRACE_FOLK.length + ' people on them');
}

export function terraceAt(b) {
  const W = clamp(b.w * 0.6, 12, 22), D = 8;
  for (const sd of [1, -1]) {
    const off = b.d / 2 + 1.7 + D / 2, [cx, cz] = toWorld(b.x, b.z, b.rot, 0, sd * off), rot = b.rot + (sd < 0 ? Math.PI : 0);
    let ok = true, gmax = -1e9, gmin = 1e9, onRun = 0, cnt = 0;
    for (let u = -W / 2; u <= W / 2 + 0.01 && ok; u += 2) for (let v = -D / 2; v <= D / 2 + 0.01; v += 2) {
      const [px, pz] = toWorld(cx, cz, rot, u, v); cnt++;
      if (Math.abs(px) > HALF - 30 || Math.abs(pz) > HALF - 30 || liftDist(px, pz) < 10 || obstacles.some(o => Math.hypot(o.x - px, o.z - pz) < o.r + 0.4)) { ok = false; break; }
      const g = gridH(px, pz); gmax = Math.max(gmax, g); gmin = Math.min(gmin, g); if (zoneAt(px, pz) >= 0) onRun++;
    }
    if (!ok || gmax - gmin > 4.5 || onRun > cnt * 0.4) continue;
    buildDeck(cx, cz, rot, W, D, gmax + 0.5, hashSeed(cx, cz, 41));
    claim(cx, cz, rot, W, D);
    return true;
  }
  return false;
}

export function buildDeck(cx, cz, rot, W, D, y, seed) {
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
  boxP(parts, 1.2, 0.18, 1.6, 0, y - 0.25, D / 2 + 0.8, WOODT);                                          // step down to the snow
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
  const m = new THREE.Mesh(mergeParts(parts), lambertVC()); m.castShadow = true; m.receiveShadow = true; grp.add(m); grp.userData.kind = 'terrace'; grp.userData.W = W; grp.userData.D = D; scene.add(grp);   // repère pour les prototypes (T3)
  const DR = ['mug', 'beer', 'wine', 'mug', 'beer'];
  for (const f of folk) {
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
  village: { facade: 'pv_wood', base: '#d6cab0', ground: 'pv_render', wood: '#5b3b27', render: '#e3d8c0', slab: '#4a2f1f', boards: '#3e2819', frame: '#d9cdb5' },
};
CUR_PAL = null;
/* ---- sun terraces (after the La Plagne photos: decks on stilts in front of the residences and the stations' bars)
   Timber deck at the height of the highest ground under it, posts down the slope, plank parapet under snow with an
   opening onto the snow, a bar against the building, tables with chairs and parasols, a row of deckchairs facing
   the slopes; skis planted in the snow below. People: lounging in the deckchairs, sitting at the tables, standing at
   the bar or the parapet, with a mulled wine, a beer, a glass of red or a cone of chips. */
TERRACE_FOLK = [];
}
