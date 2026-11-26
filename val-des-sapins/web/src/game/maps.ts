// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « maps ») ; typage strict progressif à venir.
/* eslint-disable */

import { villageLabels } from './buildings';
import { cannons } from './cannons';
import { $, V3, clamp, lerp, smoothstep } from './core';
import { updateLevelChip } from './hud';
import { toggleJournal } from './journal';
import { missionTargets } from './missions';
import { PEOPLE } from './people';
import { LEVELS, LIFTS, PISTES, patches, tunnels } from './pistes';
import { P, teleportLift, teleportLiftTop } from './player';
import { RIDER, levelName, lockOf, riderLevel } from './progression';
import { canvas } from './render';
import { HALF, WORLD, __set_minimapImg, gridH, minimapImg, obstacles, trees } from './terrain';
import { PLAGNE } from './world-data';

export let mini, mctx, mapOpen;



/* ---------------- Maps ---------------- */
export function buildMapImage() {
  const S = 620, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  const img = g.createImageData(S, S), Ld = new V3(-0.5, 0.75, -0.45).normalize(), nr = new V3();
  const dens = new Float32Array(S * S);
  for (let i = 0; i < trees.x.length; i++) { const px = Math.floor((trees.x[i] + HALF) / WORLD * S), pz = Math.floor((trees.z[i] + HALF) / WORLD * S); if (px >= 0 && pz >= 0 && px < S && pz < S) dens[pz * S + px] += 1; }
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const x = -HALF + (px + 0.5) / S * WORLD, z = -HALF + (py + 0.5) / S * WORLD;
    const e = 4, hx = gridH(x + e, z) - gridH(x - e, z), hz = gridH(x, z + e) - gridH(x, z - e); nr.set(-hx, 2 * e, -hz).normalize();
    const sh = clamp(0.62 + 0.55 * nr.dot(Ld), 0.35, 1.08);
    let r = 236, gg = 241, b = 250;
    if (nr.y < 0.75) { const k = smoothstep(0.75, 0.55, nr.y); r = lerp(r, 120, k); gg = lerp(gg, 118, k); b = lerp(b, 120, k); }
    let dn = 0; for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) { const q = (py + oy) * S + px + ox; if (q >= 0 && q < S * S) dn += dens[q]; }
    const f = clamp(dn / 3, 0, 1); r = lerp(r, 58, f * 0.75); gg = lerp(gg, 104, f * 0.75); b = lerp(b, 78, f * 0.75);
    const i = (py * S + px) * 4; img.data[i] = r * sh; img.data[i + 1] = gg * sh; img.data[i + 2] = b * sh; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tp = (x, z) => [(x + HALF) / WORLD * S, (z + HALF) / WORLD * S];
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (PLAGNE && PLAGNE.areas) for (const a of PLAGNE.areas) {   // groomed areas, under the run lines
    g.beginPath(); a.poly.forEach(([x, z], i) => { const [px, py] = tp(x, z); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.closePath();
    g.fillStyle = (LEVELS[a.lvl] || LEVELS.bleue).c + '55'; g.fill();
  }
  PISTES.forEach(p => {
    if (p.hidden) return;
    g.beginPath(); p.samples.forEach((s, i) => { const [x, y] = tp(s.x, s.z); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = Math.max(4, p.w / WORLD * S + 3); g.stroke();
    g.strokeStyle = p.color; g.lineWidth = Math.max(2.5, p.w / WORLD * S); g.stroke();
  });
  LIFTS.forEach(L => {
    const [ax, ay] = tp(L.B.x, L.B.z), [bx, by] = tp(L.T.x, L.T.z);
    g.strokeStyle = '#11161d'; g.lineWidth = 2; g.setLineDash(L.type === 'tbar' ? [4, 3] : []); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
    for (const [x, y] of [[ax, ay], [bx, by]]) { g.fillStyle = '#11161d'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill(); }
  });
  obstacles.forEach(o => { const [x, y] = tp(o.x, o.z); g.fillStyle = '#6b4428'; g.fillRect(x - 2, y - 2, 4, 4); });
  tunnels.forEach(T => {   // tunnels: dashed dark line with portal marks
    g.save(); g.setLineDash([3, 3]); g.strokeStyle = '#11161d'; g.lineWidth = 3.5; g.beginPath();
    for (let i = T.i0; i <= T.i1; i++) { const [x, y] = tp(T.S[i].x, T.S[i].z); i === T.i0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); g.restore();
    for (const i of [T.i0, T.i1]) { const [x, y] = tp(T.S[i].x, T.S[i].z); g.fillStyle = '#ff5ac8'; g.fillRect(x - 3, y - 3, 6, 6); }
  });
  patches.forEach(pt => { const pp = pt.piste; for (let d = pp.moguls[0]; d < pp.moguls[1]; d += 24) { const q = pp.samples[Math.floor(d / 4)]; if (!q) break; const [x, y] = tp(q.x, q.z); g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); } });
  cannons.forEach(c => { const [x, y] = tp(c.x, c.z); g.fillStyle = '#2bb6d6'; g.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); });
  __set_minimapImg(cv);
}

export function drawArrow(g, x, y, ang, s) {
  g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.62, s * 0.7); g.lineTo(0, s * 0.3); g.lineTo(-s * 0.62, s * 0.7); g.closePath();
  g.fillStyle = '#ff5a1f'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke(); g.restore();
}

export function headingAngle() { const vh = Math.hypot(P.vel.x, P.vel.z); const dx = vh > 1 ? P.vel.x : Math.sin(P.yaw), dz = vh > 1 ? P.vel.z : Math.cos(P.yaw); return Math.atan2(dx, -dz); }

export function mapPin(g, x, y, kind, r, target) {
  g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = target ? '#ffc94d' : kind === '?' ? '#5fd0ff' : kind === '!' ? '#ffc94d' : kind === '·' ? '#9aa6b4' : '#ffffff';
  g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#0b1320'; g.stroke();
  if (r > 8 && kind !== '◆') { g.fillStyle = '#0b1320'; g.font = '800 ' + Math.round(r * 1.4) + 'px "Bahnschrift SemiCondensed", "Roboto Condensed", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(kind === '·' ? '…' : kind, x, y + 1); }
  g.restore();
}

export function drawMini() {
  if (!minimapImg) return;
  const S = minimapImg.width, W = mini.width, R = W / 2, span = 900, src = span / WORLD * S;
  const cx = (P.pos.x + HALF) / WORLD * S, cz = (P.pos.z + HALF) / WORLD * S;
  mctx.clearRect(0, 0, W, W);
  mctx.save(); mctx.beginPath(); mctx.arc(R, R, R, 0, Math.PI * 2); mctx.clip();
  mctx.fillStyle = '#dfe7f1'; mctx.fillRect(0, 0, W, W);
  mctx.drawImage(minimapImg, cx - src / 2, cz - src / 2, src, src, 0, 0, W, W);
  // soft vignette towards the rim so the edge reads as a lens, not a cut
  const vg = mctx.createRadialGradient(R, R, R * 0.72, R, R, R); vg.addColorStop(0, 'rgba(11,19,32,0)'); vg.addColorStop(1, 'rgba(11,19,32,.35)');
  mctx.fillStyle = vg; mctx.fillRect(0, 0, W, W);
  // people with a mission (!), and the mission target (gold, pinned to the rim when off the map)
  const toM = (x, z) => [R + (x - P.pos.x) / span * W, R + (z - P.pos.z) / span * W];
  for (const d of PEOPLE) if (d.n && d.markKind && !d.hidden) { const [x, y] = toM(d.n.x, d.n.z); if (Math.hypot(x - R, y - R) > R - 10) continue; mapPin(mctx, x, y, d.markKind, 9); }
  for (const t of missionTargets()) {
    let [x, y] = toM(t[0], t[1]); const dx = x - R, dy = y - R, d = Math.hypot(dx, dy), lim = R - 13, out = d > lim;
    if (out) { x = R + dx / d * lim; y = R + dy / d * lim; }
    mapPin(mctx, x, y, out ? '›' : '◆', out ? 9 : 10, true);
  }
  drawArrow(mctx, R, R, headingAngle(), 14);
  mctx.restore();
  // rim and north mark
  mctx.beginPath(); mctx.arc(R, R, R - 2, 0, Math.PI * 2); mctx.lineWidth = 4; mctx.strokeStyle = 'rgba(255,255,255,.85)'; mctx.stroke();
  mctx.beginPath(); mctx.arc(R, 15, 12, 0, Math.PI * 2); mctx.fillStyle = '#0b1320'; mctx.fill();
  mctx.fillStyle = '#fff'; mctx.font = '800 16px "Bahnschrift SemiCondensed", "Roboto Condensed", sans-serif'; mctx.textAlign = 'center'; mctx.textBaseline = 'middle'; mctx.fillText('N', R, 16);
}

export function drawBigMap() {
  const c = $('bigmap'), g = c.getContext('2d'), W = c.width;
  g.drawImage(minimapImg, 0, 0, W, W);
  const tp = (x, z) => [(x + HALF) / WORLD * W, (z + HALF) / WORLD * W];
  g.font = '700 22px "Bahnschrift SemiCondensed", "Avenir Next Condensed", "Roboto Condensed", "Arial Narrow", sans-serif'; g.textBaseline = 'middle';
  LIFTS.forEach(L => { const [x, y] = tp(L.board.x, L.board.z); const t = L.code + ' ' + L.name.split(' ').slice(-1)[0]; g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(t, x + 10, y); g.fillStyle = '#0d1520'; g.fillText(t, x + 10, y); });
  g.font = '600 19px "Bahnschrift SemiCondensed", "Avenir Next Condensed", "Roboto Condensed", "Arial Narrow", sans-serif';
  g.font = '800 24px "Bahnschrift SemiCondensed", "Avenir Next Condensed", "Roboto Condensed", "Arial Narrow", sans-serif';
  const seenV = new Set(); villageLabels.forEach(v => { if (seenV.has(v.name)) return; seenV.add(v.name); const [x, y] = tp(v.x, v.z); g.fillStyle = '#6b4428'; g.fillRect(x - 5, y - 5, 10, 10); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(v.name.toUpperCase(), x - 40, y - 14); g.fillStyle = '#3b2412'; g.fillText(v.name.toUpperCase(), x - 40, y - 14); });
  g.font = '600 18px "Bahnschrift SemiCondensed", "Avenir Next Condensed", "Roboto Condensed", "Arial Narrow", sans-serif';
  tunnels.forEach(T => { const q = T.S[Math.floor((T.i0 + T.i1) / 2)]; const [x, y] = tp(q.x, q.z); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(T.name, x + 8, y + 18); g.fillStyle = '#a3127a'; g.fillText(T.name, x + 8, y + 18); });
  g.font = '600 19px "Bahnschrift SemiCondensed", "Avenir Next Condensed", "Roboto Condensed", "Arial Narrow", sans-serif';
  PISTES.forEach(p => { if (p.hidden || p.minor || (PLAGNE && p.link)) return; const s = p.samples[Math.floor(p.samples.length * 0.45)]; const [x, y] = tp(s.x, s.z); g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.95)'; g.strokeText(p.name, x + 8, y); g.fillStyle = p.lvl === 'noire' ? '#0f1216' : p.color; g.fillText(p.name, x + 8, y); });
  for (const d of PEOPLE) if (d.n && !d.hidden) { const [x, y] = tp(d.n.x, d.n.z); mapPin(g, x, y, d.markKind || '•', d.markKind ? 13 : 7); }
  for (const t of missionTargets()) { const [x, y] = tp(t[0], t[1]); mapPin(g, x, y, '◆', 15, true); }
  const [px, py] = tp(P.pos.x, P.pos.z); drawArrow(g, px, py, headingAngle(), 20);
}

export function fillMapLists() {
  const pl = $('plist');
  if (!pl.dataset.done) PISTES.filter(p => !p.hidden && !p.minor && !(PLAGNE && p.link)).forEach(p => { const d = document.createElement('div'); d.innerHTML = '<span class="dot' + (p.lvl === 'noire' ? ' noire' : '') + '" style="background:' + p.color + '"></span>' + p.name; pl.appendChild(d); });
  pl.dataset.done = '1';
  const ll = $('llist'); ll.innerHTML = '';
  LIFTS.forEach((L, i) => {
    const row = document.createElement('div'); row.className = 'lrow';
    const lk = lockOf(L);
    row.innerHTML = '<span class="lname"><code>' + L.code + '</code>' + L.name + '</span>' + (lk ? '<span class="lock">🔒 ' + lk.goal + '</span>' : '');
    if (!lk) for (const [label, fn] of [['Bas', teleportLift], ['Haut', teleportLiftTop]]) { const b = document.createElement('button'); b.className = 'lbtn'; b.type = 'button'; b.textContent = label; b.onclick = () => { fn(i); toggleMap(false); }; row.appendChild(b); }
    ll.appendChild(row);
  });
  const cl = $('clist'); cl.innerHTML = '';
  { const lv = riderLevel(), b = document.createElement('button'); b.type = 'button'; b.className = 'lbtn'; b.innerHTML = '<code>J</code>Niveau ' + lv + ' · ' + levelName(lv) + (RIDER.active ? ' · mission en cours' : ''); b.onclick = () => { toggleMap(false); toggleJournal(true); }; cl.appendChild(b); }
  updateLevelChip();
}

export function toggleMap(v) { mapOpen = v === undefined ? !mapOpen : v; $('mapOv').hidden = !mapOpen; if (mapOpen) drawBigMap(); else canvas.focus(); }

export function mapTab(t) {
  document.querySelectorAll('#mapOv [data-mtab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mtab === t)));
  document.querySelectorAll('#mapOv [data-mpane]').forEach(p => { p.hidden = p.dataset.mpane !== t; });
}

export function __init_6080() {
mini = $('mini');
mctx = mini.getContext('2d');
mapOpen = false;
document.querySelectorAll('#mapOv [data-mtab]').forEach(b => { b.onclick = () => mapTab(b.dataset.mtab); });
}
