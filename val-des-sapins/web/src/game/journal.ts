// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « journal ») ; typage strict progressif à venir.
/* eslint-disable */

import { $, IS_TOUCH, fmt } from './core';
import { trackerDetail } from './hud';
import { MISSIONS, advanceMission, failMission, missionById, missionStep, startMission } from './missions';
import { person } from './people';
import { P, input, queued } from './player';
import { DEFIS, RIDER, RIDER_LEVELS, TIERS, chronoPistes, fmtTime, fmtUnit, levelName, levelProgress, medalTimes, riderLevel } from './progression';
import { canvas } from './render';
import { touchRelease } from './touch';

export let dlgOpen, dlgActs, dlgWho, jnlOpen, jnlTab;

export function __set_jnlTab(v) { return (jnlTab = v); }

export function openDialog(d) {
  dlgWho = d;
  for (const k in input) input[k] = false; queued.clear(); P.vel.set(0, 0, 0); if (IS_TOUCH) touchRelease();
  const lvl = riderLevel(), a = RIDER.active, s = missionStep(), m = MISSIONS.find(q => q.giver === d.id);
  let text = d.idle, rew = '', acts = [['Au revoir', closeDialog]];
  if (s && s.do === 'talk' && s.npc === d.id) { text = s.say; acts = [['Continuer', () => { closeDialog(); advanceMission(' '); }]]; }
  else if (m && RIDER.missions[m.id] === 'done') text = 'Merci encore pour « ' + m.title + ' ». ' + d.idle;
  else if (m && a && a.id === m.id) { text = 'Alors, ça avance ? ' + s.text + '.'; acts = [['J\'y retourne', closeDialog], ['Abandonner la mission', () => { closeDialog(); failMission('Mission abandonnée'); }]]; }
  else if (m && a) text = 'Termine d\'abord ta mission en cours : « ' + missionById(a.id).title + ' ». Ensuite, j\'aurai besoin de toi.';
  else if (m && lvl < m.lvl) text = d.idle + ' J\'aurais bien un service à te demander… reviens quand tu seras ' + levelName(m.lvl) + ' (niveau ' + m.lvl + ').';
  else if (m) { text = m.intro; rew = '<b>' + m.title + '</b> · +' + m.xp + ' XP' + (m.time ? ' · temps limité ' + fmtTime(m.time) : '') + (RIDER.missions[m.id] === 'failed' ? ' · nouvel essai' : ''); acts = [['Accepter', () => { closeDialog(); startMission(m); }], ['Plus tard', closeDialog]]; }
  $('dlgAv').textContent = d.name[0]; $('dlgAv').style.background = d.jacket; $('dlgName').textContent = d.name; $('dlgRole').textContent = d.role;
  $('dlgText').textContent = text; $('dlgRew').innerHTML = rew; $('dlgRew').hidden = !rew;
  const box = $('dlgActs'); box.innerHTML = ''; dlgActs = acts;
  acts.forEach(([label, fn], i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'dbtn' + (i === 0 ? ' main' : ''); b.innerHTML = (i === 0 ? '<span class="key">E</span>' : i === acts.length - 1 && acts.length > 1 ? '<span class="key">Échap</span>' : '') + label; b.onclick = fn; box.appendChild(b); });
  dlgOpen = true; $('dlg').hidden = false; $('prompt').hidden = true;
  const f = box.querySelector('button'); f && f.focus();
}

export function closeDialog() { dlgOpen = false; dlgWho = null; $('dlg').hidden = true; canvas.focus(); }

export function toggleJournal(v) { jnlOpen = v === undefined ? !jnlOpen : v; $('jnl').hidden = !jnlOpen; if (jnlOpen) { for (const k in input) input[k] = false; renderJournal(); } else canvas.focus(); }

export function renderJournal() {
  const lvl = riderLevel(), next = RIDER_LEVELS[lvl];
  $('jLvl').textContent = lvl; $('jLvlName').textContent = levelName(lvl);
  $('jXp').textContent = fmt(RIDER.xp) + ' XP' + (next ? ' · niveau ' + (lvl + 1) + ' à ' + fmt(next[1]) : ' · niveau maximum');
  $('jBar').style.width = Math.round(levelProgress() * 100) + '%';
  document.querySelectorAll('#jnl [data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === jnlTab ? 'true' : 'false'));
  const el = $('jBody'), esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  if (jnlTab === 'missions') {
    const a = RIDER.active; let h = '';
    if (a) { const m = missionById(a.id), s = missionStep(); h += '<div class="mcard act"><div class="mh"><b>' + esc(m.title) + '</b><span class="chip go">En cours</span></div><p>' + esc(s.text) + '</p><p class="sub">' + esc(trackerDetail()) + '</p></div>'; }
    for (const m of MISSIONS) {
      if (a && a.id === m.id) continue;
      const st = RIDER.missions[m.id], g = person(m.giver), locked = lvl < m.lvl;
      const chip = st === 'done' ? '<span class="chip ok">Terminée</span>' : locked ? '<span class="chip lk">Niveau ' + m.lvl + '</span>' : st === 'failed' ? '<span class="chip off">À retenter</span>' : '<span class="chip">Disponible</span>';
      h += '<div class="mcard' + (st === 'done' ? ' done' : '') + '"><div class="mh"><b>' + esc(m.title) + '</b>' + chip + '</div><p class="sub">' + esc(g.name) + ' · ' + esc(g.role) + ' · +' + m.xp + ' XP' + (m.time ? ' · chrono ' + fmtTime(m.time) : '') + '</p></div>';
    }
    el.innerHTML = h;
  } else if (jnlTab === 'defis') {
    let h = '', cat = '';
    for (const d of DEFIS) {
      if (d.cat !== cat) { cat = d.cat; h += '<h4>' + cat + '</h4>'; }
      const v = d.get(RIDER.stats), got = RIDER.tiers[d.id] || 0, goal = d.t[Math.min(2, got)], pct = got >= 3 ? 100 : Math.min(100, Math.round(v / goal * 100));
      h += '<div class="drow"><div class="dtop"><b>' + esc(d.title) + '</b><span class="pips">' + TIERS.map((t, i) => '<i style="background:' + (i < got ? t.c : 'transparent') + ';border-color:' + t.c + '" title="' + t.n + ' : ' + fmtUnit(d.t[i], d.unit) + '"></i>').join('') + '</span></div>'
        + '<div class="sub">' + esc(d.desc) + ' · ' + (got >= 3 ? 'Or obtenu' : fmtUnit(v, d.unit) + ' / ' + fmtUnit(goal, d.unit) + ' (' + TIERS[got].n.toLowerCase() + ')') + '</div><div class="bar"><span style="width:' + pct + '%;background:' + TIERS[Math.min(2, got)].c + '"></span></div></div>';
    }
    el.innerHTML = h;
  } else if (jnlTab === 'chronos') {
    let h = '<table class="ctab"><thead><tr><th>Piste</th><th>Record</th><th>Bronze</th><th>Argent</th><th>Or</th></tr></thead><tbody>';
    for (const p of chronoPistes()) { const r = RIDER.runs[p.name], mt = medalTimes(p); h += '<tr><td><span class="dot' + (p.lvl === 'noire' ? ' noire' : '') + '" style="background:' + p.color + '"></span>' + esc(p.name) + '</td><td>' + (r ? '<b style="color:' + (r.medal >= 0 ? TIERS[r.medal].c : 'var(--ink)') + '">' + fmtTime(r.best) + '</b>' : '—') + '</td>' + mt.map((t, i) => '<td' + (r && r.medal >= i ? ' class="got"' : '') + '>' + fmtTime(t) + '</td>').join('') + '</tr>'; }
    el.innerHTML = h + '</tbody></table><p class="sub">Le chrono démarre en passant la banderole DÉPART et s\'arrête à l\'ARRIVÉE. Il s\'annule si vous quittez la piste plus de 6 s, prenez une remontée ou la motoneige.</p>';
  } else {
    const s = RIDER.stats, rows = [['Vitesse maximale', s.vmax + ' km/h'], ['Distance à ski', fmt(Math.round(s.dist / 100) / 10) + ' km'], ['Dénivelé descendu', fmt(Math.round(s.vert)) + ' m'], ['Poudreuse', fmt(Math.round(s.powder)) + ' m'], ['Temps de vol', Math.round(s.air) + ' s'], ['Figures réussies', s.tricks], ['Meilleure figure', fmt(s.bestTrick) + ' pts'], ['Glisses sur rails et box', s.rails], ['Remontées', s.rides], ['Tunnels', s.tunnels], ['Pistes chronométrées', s.pistes.length + ' / ' + chronoPistes().length], ['Missions accomplies', s.missions + ' / ' + MISSIONS.length]];
    el.innerHTML = '<div class="stats">' + rows.map(([k, v]) => '<div><span>' + k + '</span><b>' + v + '</b></div>').join('') + '</div>';
  }
}

export function __init_6914() {

/* ---- dialogue ---- */
dlgOpen = false;
dlgActs = [];
dlgWho = null;

/* ---- logbook (J) ---- */
jnlOpen = false;
jnlTab = 'missions';
}
