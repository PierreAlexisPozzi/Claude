// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « touch ») ; typage strict progressif à venir.
/* eslint-disable */

import { togglePhoto } from './photo';
import { sfx } from './audio';
import { __set_camMode, camMode } from './camera';
import { $, IS_TOUCH } from './core';
import { running } from './input';
import { dlgOpen, jnlOpen, toggleJournal } from './journal';
import { cycleQuality } from './loop';
import { mapOpen, toggleMap } from './maps';
import { P, __set_jumpHold, input, jumpHold, queued, stick } from './player';
import { lockOf } from './progression';

export let vib, joyZone, joy, joyK, bJump, bGrab, bCtx, JOY_R, joyC, grabHeld, ctxAct, jDownT, jTapT, jTimer, jDouble, jId;


export function stickApply(dx, dy) {
  const len = Math.hypot(dx, dy), k = len > JOY_R ? JOY_R / len : 1;
  joyK.style.transform = 'translate(' + (dx * k).toFixed(1) + 'px,' + (dy * k).toFixed(1) + 'px)';
  const shape = v => { const a = Math.abs(v), dz = 0.14; return a < dz ? 0 : Math.sign(v) * Math.pow(Math.min(1, (a - dz) / (1 - dz)), 1.35); };
  const nx = dx * k / JOY_R, ny = dy * k / JOY_R;
  stick.x = shape(nx); stick.y = shape(ny);
  // digital views for flips, presses, the lift boost and the pipe: up / down need a mostly vertical push
  input.left = nx < -0.45; input.right = nx > 0.45;
  input.up = ny < -0.5 && -ny > Math.abs(nx) * 0.7; input.down = ny > 0.5 && ny > Math.abs(nx) * 0.7;
}

export function stickEnd() {
  if (!stick.on) return;
  stick.on = false; stick.id = null; stick.x = stick.y = 0;
  input.left = input.right = input.up = input.down = false;
  joy.classList.remove('on'); joyK.style.transform = '';
}

export function jumpRelease() { __set_jumpHold(false); input.jump = false; }

export function jumpUp(e) {
  if (e.pointerId !== jId) return; jId = null; bJump.classList.remove('on');
  if (jDouble) { jDouble = false; return; }
  if (!input.jump) return;
  const now = performance.now();
  if (now - jDownT > 170 || P.charge > 0.3 || P.state !== 'ski') { jumpRelease(); vib(12); return; }   // charged jump, air, rail: no delay
  // quick tap on the snow: hold the (uncharged-further) jump a moment, in case a second tap asks for a switch
  __set_jumpHold(true); jTapT = now; jTimer = setTimeout(() => { jTimer = 0; jumpRelease(); vib(12); }, 230);
}

export function touchFrame() {
  if (grabHeld) { const tail = P.state === 'air' && stick.y > 0.5; input.tail = tail; input.grab = !tail; }
  bJump.style.setProperty('--c', P.state === 'ski' ? P.charge.toFixed(2) : 0);
}

export function touchRelease() { stickEnd(); if (jTimer) { clearTimeout(jTimer); jTimer = 0; } __set_jumpHold(false); grabHeld = false; jId = null; bJump.classList.remove('on'); bGrab.classList.remove('on'); }

export function touchHud(L, who) {
  const off = dlgOpen || mapOpen || jnlOpen, tc = $('touch');
  if (off !== tc.classList.contains('off')) { tc.classList.toggle('off', off); if (off) touchRelease(); }
  let lab = null; ctxAct = 'action';
  if (P.state === 'lift') lab = 'Passer';
  else if (who && !dlgOpen) lab = 'Parler';
  else if (L && P.state === 'ski' && !lockOf(L)) lab = 'Monter';
  else if ((P.state === 'ski' && P.stillT > 5 && P.offPiste) || P.state === 'crash') { lab = 'Rejoindre'; ctxAct = 'respawn'; }
  if (!lab) ctxAct = null;
  bCtx.hidden = !lab; if (lab && bCtx.firstChild.textContent !== lab) bCtx.firstChild.textContent = lab;
  $('util').querySelector('[data-u="sled"]').classList.toggle('on', P.state === 'sled');
}

// park the shortcut pills just under the speed panel, whatever its height
export function placeUtil() {
  const r = document.querySelector('#hud .tl').getBoundingClientRect(), u = $('util'); if (!r.height) return;
  u.style.top = Math.round(r.bottom + 8) + 'px';
}

export function __init_7213() {
/* ---------------- Touch controls ---------------- */
vib = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (_) { /* not supported */ } };
joyZone = $('joyZone');
joy = $('joy');
joyK = $('joyK');
bJump = $('bJump');
bGrab = $('bGrab');
bCtx = $('bCtx');
JOY_R = 52;
   // knob travel, px
joyC = { x: 0, y: 0 };
grabHeld = false;
ctxAct = null;
joyZone.addEventListener('pointerdown', e => {
  e.preventDefault(); if (stick.on) return;
  const r = joy.getBoundingClientRect();   // fixed base: deflection is measured from its centre
  stick.on = true; stick.id = e.pointerId; joyC = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; joy.classList.add('on');
  try { joyZone.setPointerCapture(e.pointerId); } catch (_) { /* old browsers */ }
  stickApply(e.clientX - joyC.x, e.clientY - joyC.y);
});
joyZone.addEventListener('pointermove', e => {
  if (!stick.on || e.pointerId !== stick.id) return; e.preventDefault();
  stickApply(e.clientX - joyC.x, e.clientY - joyC.y);   // the knob stays clamped to the rim, the base never moves
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) joyZone.addEventListener(ev, e => { if (e.pointerId === stick.id) stickEnd(); });

// Jump: hold = charge (gold ring), release = jump · quick double tap = switch (180° on the snow)
jDownT = 0;
jTapT = 0;
jTimer = 0;
jDouble = false;
jId = null;
bJump.addEventListener('pointerdown', e => {
  e.preventDefault(); jId = e.pointerId; try { bJump.setPointerCapture(e.pointerId); } catch (_) { /* old browsers */ }
  bJump.classList.add('on'); const now = performance.now();
  if (jTimer && now - jTapT < 280) {   // second tap: no jump, switch instead
    clearTimeout(jTimer); jTimer = 0; jDouble = true;
    __set_jumpHold(false); input.jump = false; P.prevJump = false; P.charge = 0;
    queued.add('revert'); vib([8, 30, 8]); return;
  }
  if (jTimer) { clearTimeout(jTimer); jTimer = 0; jumpRelease(); }
  jDouble = false; jDownT = now; __set_jumpHold(false); input.jump = true; vib(6);
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bJump.addEventListener(ev, jumpUp);

// Grab: hold = mute grab · in the air with the stick pulled down = tail grab · on the snow with up / down = nose / tail press
bGrab.addEventListener('pointerdown', e => { e.preventDefault(); grabHeld = true; bGrab.classList.add('on'); try { bGrab.setPointerCapture(e.pointerId); } catch (_) { /* old browsers */ } vib(6); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) bGrab.addEventListener(ev, () => { if (!grabHeld) return; grabHeld = false; input.grab = input.tail = false; bGrab.classList.remove('on'); });

// context button: what E would do right now (board, talk, skip the ride, get unstuck)
bCtx.addEventListener('pointerdown', e => { e.preventDefault(); if (ctxAct) { queued.add(ctxAct); vib(10); } });
$('prompt').addEventListener('click', () => { if (IS_TOUCH && ctxAct) queued.add(ctxAct); });
document.querySelectorAll('#util [data-u]').forEach(b => b.addEventListener('click', () => {
  const u = b.dataset.u;
  if (u === 'journal') toggleJournal(); else if (u === 'sled') queued.add('sled'); else if (u === 'respawn') queued.add('respawn');
  else if (u === 'cam') __set_camMode((camMode + 1) % 3); else if (u === 'qual') cycleQuality();
  else if (u === 'photo') { $('more').hidden = true; togglePhoto(true); }   // T7
  else if (u === 'mute') { const on = sfx.toggle(); b.textContent = 'Son : ' + (on ? 'oui' : 'non'); $('muteBtn').textContent = b.textContent; }
}));
$('moreBtn').addEventListener('click', () => { const m = $('more'); m.hidden = !m.hidden; $('moreBtn').setAttribute('aria-expanded', String(!m.hidden)); $('moreBtn').classList.toggle('on', !m.hidden); });
$('miniWrap').addEventListener('click', () => { if (running) toggleMap(); });
window.addEventListener('resize', placeUtil);
}
