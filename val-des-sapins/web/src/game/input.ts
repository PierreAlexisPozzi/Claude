// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « input ») ; typage strict progressif à venir.
/* eslint-disable */

import { PHOTO, togglePhoto } from './photo';
import { sfx } from './audio';
import { __set_camMode, camMode } from './camera';
import { $ } from './core';
import { __set_jnlTab, dlgActs, dlgOpen, jnlOpen, jnlTab, renderJournal, toggleJournal } from './journal';
import { cycleQuality, startGame } from './loop';
import { mapOpen, toggleMap } from './maps';
import { input, queued } from './player';
import { canvas } from './render';
import { touchRelease } from './touch';

export let KEYMAP, keyOf, helpTouched, running;

export function __set_running(v) { return (running = v); }

export function toggleHelp(v) { const h = $('help'), min = v === undefined ? !h.classList.contains('min') : !v; h.classList.toggle('min', min); $('helpT').setAttribute('aria-expanded', String(!min)); }

export function __init_7168() {

/* ---------------- Input ---------------- */
// movement by physical position (WASD on QWERTY = ZQSD on AZERTY), letter shortcuts by the printed letter
KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', Space: 'jump', ShiftLeft: 'grab', ShiftRight: 'grab' };
keyOf = e => KEYMAP[e.code] || ((e.key || '').toLowerCase() === 'f' ? 'tail' : null);
helpTouched = false;
running = false;
window.addEventListener('keydown', e => {
  if (dlgOpen) {   // dialogue: E / Enter = first choice, Échap = last
    const k = (e.key || '').toLowerCase(); e.preventDefault();
    if (e.repeat) return;
    if (k === 'e' || k === 'enter' || k === ' ') dlgActs[0] && dlgActs[0][1](); else if (k === 'escape' || k === 'backspace') dlgActs[dlgActs.length - 1][1](); else if (/^[1-9]$/.test(k) && dlgActs[+k - 1]) dlgActs[+k - 1][1]();
    return;
  }
  if (jnlOpen) { const k = (e.key || '').toLowerCase(); if (k === 'j' || k === 'escape') { e.preventDefault(); toggleJournal(false); } return; }
  if (!running) { if (e.code === 'Enter' && !$('go').disabled) startGame(); return; }
  const k = keyOf(e);
  if (k) { input[k] = true; e.preventDefault(); }
  if (e.repeat) return;
  const key = e.key === 'Enter' || e.key === 'Escape' ? e.key : (e.key || '').toLowerCase();
  switch (key) {
    case 'x': queued.add('revert'); break;
    case 'e': case 'Enter': queued.add('action'); break;
    case 'r': queued.add('respawn'); break;
    case 'c': __set_camMode((camMode + 1) % 3); break;
    case 'm': toggleMap(); break;
    case 'j': toggleJournal(); break;
    case 'Escape': if (PHOTO.open) togglePhoto(false); else if (mapOpen) toggleMap(false); break;
    case 'p': togglePhoto(); break;   // T7 : mode photo
    case 'h': helpTouched = true; toggleHelp(); break;
    case 'v': queued.add('sled'); break;
    case 'g': cycleQuality(); break;
    case 'n': $('muteBtn').textContent = 'Son : ' + (sfx.toggle() ? 'oui' : 'non'); break;
  }
});
window.addEventListener('keyup', e => { const k = keyOf(e); if (k) { input[k] = false; e.preventDefault(); } });
window.addEventListener('blur', () => { for (const k in input) input[k] = false; touchRelease(); });
$('helpT').onclick = () => { helpTouched = true; toggleHelp(); canvas.focus(); };
$('mapBtn').onclick = () => toggleMap();
$('jnlBtn').onclick = () => toggleJournal();
$('jClose').onclick = () => toggleJournal(false);
document.querySelectorAll('#jnl [data-tab]').forEach(b => { b.onclick = () => { __set_jnlTab(b.dataset.tab); renderJournal(); }; });
$('closeMap').onclick = () => toggleMap(false);
$('camBtn').onclick = () => { __set_camMode((camMode + 1) % 3); canvas.focus(); };
$('qualBtn').onclick = () => { cycleQuality(); canvas.focus(); };
$('muteBtn').onclick = () => { $('muteBtn').textContent = 'Son : ' + (sfx.toggle() ? 'oui' : 'non'); canvas.focus(); };
}
