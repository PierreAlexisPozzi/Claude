// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « hud ») ; typage strict progressif à venir.
/* eslint-disable */

import { VILLAGES, villageLabels } from './buildings';
import { camLook } from './camera';
import { cannons } from './cannons';
import { __set_splitT, chrono, ghostMesh, splitT, updateChronoHud } from './chronos';
import { $, IS_TOUCH, fmt } from './core';
import { dlgOpen, jnlOpen } from './journal';
import { drawMini, mapOpen } from './maps';
import { missionById, missionStep, missionTargets } from './missions';
import { nearPerson } from './people';
import { LIFTS, PISTES, SNOW, tunnels, zoneAt } from './pistes';
import { P, input, nearLift, pressName } from './player';
import { LINE, RIDER, fmtTime, levelProgress, lockOf, medalTimes, riderLevel } from './progression';
import { camera } from './render';
import { ALT0 } from './terrain';
import { touchHud } from './touch';
import { PLAGNE } from './world-data';

export let toasts, CMP_PX, CMP_HALF, cmpMk, cmpLiftT, cmpLift, lastVillage, trickTimer, hudAcc;



/* ---- HUD pieces ---- */
export function updateLevelChip() {
  if (!$('lvl')) return; const p = levelProgress();
  $('lvl').textContent = riderLevel(); $('xpf').style.strokeDasharray = (p * 100).toFixed(1) + ' 100';   // XP ring around the minimap
  const b = document.querySelector('.badge'); if (b) b.style.setProperty('--xp', p.toFixed(3));
}

export function trackerDetail() {
  const a = RIDER.active, s = missionStep(); if (!s) return '';
  if (s.do === 'collect') return a.got.length + ' / ' + s.need + ' ramassés';
  if (s.do === 'visit') return a.visited.length + ' / ' + s.pts.length + ' visités';
  if (s.do === 'tricks') return a.count + ' / ' + s.n + ' figures';
  if (s.do === 'carve') return Math.round(a.carve || 0) + ' / ' + s.dist + ' m';
  if (s.do === 'chrono') { const p = PISTES.find(q => q.name === s.piste); return 'Objectif ' + fmtTime(medalTimes(p)[s.medal]); }
  return '';
}

export function refreshTracker() {
  const a = RIDER.active, el = $('track'); if (!el) return;
  if (!a) { el.hidden = true; return; }
  const m = missionById(a.id), s = missionStep(); el.hidden = false;
  $('trT').textContent = m.title; $('trS').textContent = s ? s.text : '';
}

export function updateTrackerHud() {
  const a = RIDER.active; if (!a) return; const m = missionById(a.id);
  const T = missionTargets(); let info = trackerDetail();
  if (T.length) {
    let best = T[0], bd = 1e9; for (const t of T) { const d = Math.hypot(t[0] - P.pos.x, t[1] - P.pos.z); if (d < bd) { bd = d; best = t; } }
    const ang = Math.atan2(best[0] - camera.position.x, best[1] - camera.position.z), cam = Math.atan2(camLook.x - camera.position.x, camLook.z - camera.position.z);
    $('trA').style.transform = 'rotate(' + (-(ang - cam) * 180 / Math.PI).toFixed(0) + 'deg)'; $('trA').hidden = false;
    info = (bd > 1000 ? (bd / 1000).toFixed(1) + ' km' : Math.round(bd) + ' m') + ' · ' + best[2] + (info ? ' · ' + info : '');
  } else $('trA').hidden = true;
  const tm = $('trTm'); tm.hidden = !m.time;
  if (m.time) { tm.textContent = fmtTime(Math.max(0, a.time)); tm.classList.toggle('warn', a.time < 45); }
  $('trD').textContent = info;
}

export function toast(title, sub, kind) {
  const box = $('toasts'); if (!box) return;
  const el = document.createElement('div'); el.className = 'toast ' + (kind || '');
  el.innerHTML = '<b></b><span></span>'; el.firstChild.textContent = title; el.lastChild.textContent = sub || '';
  box.prepend(el); toasts.push({ el, t: 5.5 });
  while (box.children.length > 4) box.lastChild.remove();
}

export function updateToasts(dt) { for (let i = toasts.length - 1; i >= 0; i--) { const q = toasts[i]; q.t -= dt; if (q.t < 0.4) q.el.classList.add('out'); if (q.t <= 0) { q.el.remove(); toasts.splice(i, 1); } } }


/* ---------------- HUD ---------------- */
// première trace: multiplier, untouched metres, progress to the next ×, red when riding over a track
export function updateLineHud() {
  const on = LINE.on && LINE.fresh > 15 && !chrono, el = $('line');
  if (el.hidden === on) { el.hidden = !on; document.body.classList.toggle('line-on', on); }
  if (!on) return;
  $('lnM').textContent = '×' + LINE.mult;
  $('lnD').textContent = fmt(Math.round(LINE.fresh)) + ' m vierges' + (LINE.mult < 5 ? ' · ×' + (LINE.mult + 1) + ' à ' + LINE.mult * 80 + ' m' : ' · max');
  $('lnF').style.width = (LINE.mult >= 5 ? 100 : (LINE.fresh % 80) / 0.8).toFixed(0) + '%';
  el.classList.toggle('stale', LINE.stale > 0.15);
}

export function buildCompass() {
  const S = $('cmpS'); let h = '';
  const lab = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO' };
  for (let d = -360; d <= 720; d += 15) {
    const n = ((d % 360) + 360) % 360, x = d * CMP_PX;
    if (lab[n] !== undefined) h += '<b class="' + (n % 90 ? '' : 'c') + (n === 0 ? ' n' : '') + '" style="left:' + x + 'px">' + lab[n] + '</b>';
    else h += '<i class="' + (n % 45 === 0 ? 'm' : '') + '" style="left:' + x + 'px"></i>';
  }
  S.innerHTML = h;
  for (const k of ['mis', 'lift', 'gh']) { const e = document.createElement('span'); e.className = 'cmk ' + k; e.hidden = true; $('cmpM').appendChild(e); cmpMk[k] = e; }
  cmpMk.mis.textContent = '◆'; cmpMk.gh.textContent = '●';
}

export function updateCompass(dt) {
  if (!cmpMk.mis) buildCompass();
  const vx = camLook.x - camera.position.x, vz = camLook.z - camera.position.z;
  const hd = Math.atan2(vx, -vz) * 180 / Math.PI, hdg = (hd + 360) % 360;
  $('cmpS').style.transform = 'translateX(' + (-hdg * CMP_PX).toFixed(1) + 'px)';
  const place = (e, x, z, clampEdge) => {
    if (x === undefined) { e.hidden = true; return; }
    let rel = Math.atan2(x - P.pos.x, -(z - P.pos.z)) * 180 / Math.PI - hd; rel = ((rel + 540) % 360) - 180;
    const out = Math.abs(rel) > CMP_HALF; if (out && !clampEdge) { e.hidden = true; return; }
    e.hidden = false; e.classList.toggle('edge', out);
    e.style.transform = 'translateX(calc(-50% + ' + (Math.max(-CMP_HALF, Math.min(CMP_HALF, rel)) * CMP_PX).toFixed(1) + 'px))';
  };
  const T = RIDER.active ? missionTargets() : [];
  let best = null, bd = 1e9; for (const t of T) { const d = Math.hypot(t[0] - P.pos.x, t[1] - P.pos.z); if (d < bd) { bd = d; best = t; } }
  place(cmpMk.mis, best ? best[0] : undefined, best ? best[1] : undefined, true);
  if ((cmpLiftT -= dt) <= 0) {            // nearest open lift, refreshed about twice a second
    cmpLiftT = 0.5; cmpLift = null; let ld = 1e9;
    if (P.state !== 'lift') for (const L of LIFTS) { if (lockOf(L)) continue; const d = Math.hypot(L.board.x - P.pos.x, L.board.z - P.pos.z); if (d < ld) { ld = d; cmpLift = L; } }
    if (cmpLift && cmpMk.lift.textContent !== cmpLift.code) cmpMk.lift.textContent = '▲ ' + cmpLift.code;
  }
  place(cmpMk.lift, cmpLift ? cmpLift.board.x : undefined, cmpLift ? cmpLift.board.z : undefined, false);
  const gm = ghostMesh && ghostMesh.visible && chrono ? ghostMesh.position : null;
  place(cmpMk.gh, gm ? gm.x : undefined, gm ? gm.z : undefined, false);
}

export function updateVillageBanner() {
  let near = null, sub = ''; for (const v of villageLabels) if (Math.hypot(v.x - P.pos.x, v.z - P.pos.z) < 110) { near = v.name; sub = v.sub || 'Vous traversez le village'; break; }
  if (near && near !== lastVillage && P.state !== 'lift') showTrick(near, sub);
  if (near) lastVillage = near;
  else if (!villageLabels.some(v => v.name === lastVillage && Math.hypot(v.x - P.pos.x, v.z - P.pos.z) < 220)) lastVillage = null;
}

export function fillFacts() {
  const vis = PISTES.filter(p => !p.hidden && !p.link && !p.minor), n = l => vis.filter(p => p.lvl === l).length;
  const pl = (k, a, b) => k + ' ' + (k > 1 ? b : a);
  const items = [['verte', pl(n('verte'), 'verte', 'vertes')], ['bleue', pl(n('bleue'), 'bleue', 'bleues')], ['rouge', pl(n('rouge'), 'rouge', 'rouges')], ['noire', pl(n('noire'), 'noire', 'noires')], ['park', 'Snowpark']];
  $('facts').innerHTML = items.map(([l, t]) => '<span><i class="dot' + (l === 'noire' ? ' noire' : '') + '" style="background:var(--' + l + ')"></i>' + t + '</span>').join('') +
    '<span>' + LIFTS.length + ' remontées</span>' + (tunnels.length ? '<span>' + pl(tunnels.length, 'tunnel', 'tunnels') + '</span>' : '') + '<span>' + pl(PLAGNE ? villageLabels.length : VILLAGES.length, 'village', 'villages') + '</span><span>' + cannons.length + ' canons à neige</span>';
  const alts = LIFTS.flatMap(L => [L.board.y, L.up.pts[L.up.pts.length - 1].y - 7]).map(y => y + ALT0);
  if (IS_TOUCH || innerHeight < 720) $('ctrlBox').open = false;
  $('eyebrow').textContent = (PLAGNE ? 'Secteur La Plagne · ' : 'Domaine ouvert · ') + fmt(Math.min(...alts)) + ' – ' + fmt(Math.max(...alts)) + ' m';
  if (PLAGNE) {
    for (const id of ['credits', 'mapCredits']) { $(id).textContent = PLAGNE.meta.attribution; $(id).hidden = false; }
    document.querySelectorAll('[data-proc]').forEach(el => { el.hidden = true; });   // no tunnels or mogul fields here
    document.querySelector('#start .lede').textContent = 'Le secteur Plagne Centre – Aime 2000 de La Plagne, recréé d\u2019après le relief, les pistes et les remontées réels. '
      + 'Pour remonter : télécabines, télésièges et téléskis. Pistes damées, poudreuse entre les sapins, snowpark et half-pipe à Aime 2000, stations à traverser. Skis twin-tip à double rocker.';
  }
}

export function showTrick(t, s) { $('trickT').textContent = t; $('trickS').textContent = s || ''; $('trick').classList.add('show'); trickTimer = 2.4; }

export function updateHud(dt) {
  if (trickTimer > 0) { trickTimer -= dt; if (trickTimer <= 0) $('trick').classList.remove('show'); }
  if (splitT > 0 && (__set_splitT(splitT - (dt))) <= 0) $('chS').textContent = '';
  updateToasts(dt);
  if (!IS_TOUCH && innerWidth > 760) updateCompass(dt);
  hudAcc += dt; if (hudAcc < 0.1) return; hudAcc = 0; updateChronoHud(); updateTrackerHud();
  const sp = P.state === 'lift' ? P.lift.speed * ((input.grab || input.up) ? 4 : 1) : P.vel.length();
  const kmh = Math.round(sp * 3.6);
  $('spd').textContent = kmh;
  const arc = $('spdArc'); arc.style.strokeDasharray = (66.7 * Math.min(1, kmh / 110)).toFixed(1) + ' 100'; arc.classList.toggle('hot', kmh > 80);
  document.body.classList.toggle('fast', (kmh > 45 && P.state !== 'lift') || P.state === 'air');
  updateLineHud();
  $('alt').textContent = fmt(P.pos.y + ALT0 - (P.state === 'lift' && P.lift.type !== 'tbar' ? 9 : 0));
  const z = P.tunnel ? P.tunnel.piste.idx : P.state === 'ski' || P.state === 'crash' ? zoneAt(P.pos.x, P.pos.z) : P.zone;
  const dot = $('zDot'), zn = $('zName');
  $('snow').textContent = P.state === 'lift' ? '—' : P.state === 'air' ? 'En vol' : (SNOW[P.snow] || SNOW[0]).label;
  updateVillageBanner();
  if (P.state === 'lift') { zn.textContent = P.lift.code + ' · ' + P.lift.name.split(' ').slice(1).join(' '); dot.style.background = '#a6dcff'; dot.className = 'dot'; }
  else if (z >= 0) { const p = PISTES[z]; zn.textContent = P.tunnel ? P.tunnel.name : p.name; dot.style.background = p.color; dot.className = 'dot' + (p.lvl === 'noire' ? ' noire' : ''); }
  else { zn.textContent = 'Hors-piste'; dot.style.background = 'repeating-linear-gradient(45deg,#ffcf3a 0 3px,#11161d 3px 6px)'; dot.className = 'dot'; }
  let st = 'À l\'arrêt';
  const along = P.vel.x * Math.sin(P.yaw) + P.vel.z * Math.cos(P.yaw);
  if (P.state === 'lift') st = P.lift.type === 'tbar' ? 'Au téléski' : 'En remontée';
  else if (P.state === 'sled') st = 'Motoneige';
  else if (P.state === 'air') st = 'En l\'air';
  else if (P.state === 'rail') st = 'Grind';
  else if (P.state === 'crash') st = 'Chute';
  else if (sp > 0.6) {
    st = P.brake > 0.5 ? (sp > 6 ? 'Dérapage' : 'Chasse-neige') : P.tuck > 0.5 ? (sp < 6.5 ? 'Pas de patineur' : 'Schuss') : Math.abs(P.edge) > 0.5 && sp > 7 ? 'Carving' : 'Glisse';
    if (P.press) st = pressName(P.press.dir, P.press.spin, false);
    if (along < -0.8) st = 'Switch · ' + st;
  }
  if (P.climb && P.state === 'ski') st = 'Escalier';
  $('st').textContent = st;
  $('pts').textContent = fmt(P.score);
  const pr = $('prompt');
  const L = nearLift(12), who = nearPerson();
  if (P.state === 'lift') { pr.innerHTML = '<span class="key">↑</span> Accélérer toute la remontée · <span class="key">E</span> Passer la montée'; pr.hidden = false; }
  else if (who && !dlgOpen) { pr.innerHTML = '<span class="key">E</span> Parler à ' + who.name + ' · ' + who.role + (who.markKind === '!' ? ' <b class="bang">!</b>' : who.markKind === '?' ? ' <b class="bang q">?</b>' : ''); pr.hidden = false; }
  else if (L && P.state === 'ski') { const lk = lockOf(L); pr.innerHTML = lk ? '🔒 ' + L.code + ' ' + L.name + ' · ' + lk.goal.toLowerCase() : '<span class="key">E</span> Monter · ' + L.code + ' ' + L.name; pr.hidden = false; }
  else if (P.state === 'ski' && P.stillT > 5 && P.offPiste) { pr.innerHTML = '<span class="key">R</span> Bloqué ? Rejoindre la remontée la plus proche'; pr.hidden = false; }
  else pr.hidden = true;
  if (IS_TOUCH) touchHud(L, who);
  $('trick').classList.toggle('low', $('toasts').childElementCount > 0);   // a toast owns the band under the tracker on phones
  document.body.classList.toggle('modal', dlgOpen || mapOpen || jnlOpen);
  stackHud();
  drawMini();
}

/* the centre column grows downwards: chrono / première trace, then the mission, the toasts (when centred) and the trick
   banner each start under whatever visible block above them shares their columns (phones mostly; desktop for wide tricks) */
export function stackHud() {
  const vis = el => !el.hidden && el.getClientRects().length > 0, box = el => el.getBoundingClientRect();
  const over = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 8;
  const tb = $('toasts'), trk = $('trick'), placed = [];
  for (const id of ['chrono', 'line']) { const e = $(id); if (vis(e)) placed.push(box(e)); }
  const push = (el, from) => {
    el.style.top = ''; if (!vis(el)) return null;
    let r = box(el); if (el === trk) { const t = el.querySelector('.t').getBoundingClientRect(), u = el.querySelector('.s').getBoundingClientRect(); r = { left: Math.min(t.left, u.width ? u.left : 1e9), right: Math.max(t.right, u.right), top: r.top, bottom: r.bottom }; }
    let floor = 0; for (const q of from) if (q && over(q, r)) floor = Math.max(floor, q.bottom + 8);
    if (r.top < floor) { el.style.top = Math.round(floor) + 'px'; r = box(el); }
    return r;
  };
  const tr = push($('track'), placed); if (tr) placed.push(tr);
  document.body.classList.toggle('busy', !!tr && placed.length > 1);   // phones then keep a single toast
  tb.style.visibility = '';
  let tbr = null;
  if (tb.childElementCount) { tbr = push(tb, placed); if (tbr && (tbr.left > innerWidth / 2 || tbr.right < innerWidth / 2)) tbr = null; }   // toasts in the right column stay out of the trick's way
  if (!trk.classList.contains('show')) return;   // fading out: keep its place, it is placed again when shown
  const pr = $('prompt'), limit = vis(pr) ? box(pr).top - 8 : innerHeight - 8;
  const r = push(trk, tbr ? placed.concat([tbr]) : placed);
  if (r && tbr && r.bottom > limit) { tb.style.visibility = 'hidden'; push(trk, placed); }   // no room under the toasts: the trick banner takes their place for its 2.4 s
}

export function __init_6975() {
toasts = [];
// compass ribbon: 3 px per degree, north = -z (same convention as headingAngle and the minimap), view direction of the camera
CMP_PX = 3;
CMP_HALF = 58;
cmpMk = {};
cmpLiftT = 0;
cmpLift = null;
lastVillage = null;
trickTimer = 0;
hudAcc = 0;
}
