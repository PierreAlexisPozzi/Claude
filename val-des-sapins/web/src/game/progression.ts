// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « progression ») ; typage strict progressif à venir.
/* eslint-disable */

import { STORE } from '../storage/store';
import { sfx } from './audio';
import { chrono, chronoAbort, chronoStep } from './chronos';
import { $, V3, fmt } from './core';
import { toast, updateLevelChip } from './hud';
import { fillMapLists } from './maps';
import { advanceMission, missionStep, missionTick, missionTimedBreak, missionTrick } from './missions';
import { skiPistes } from './npcs';
import { PIPE, PISTES, SN, ZN, inPipe, snowAt, zIdx, zoneAt } from './pistes';
import { P } from './player';
import { HALF, TC, gridH, normalAt, obstacles, trees } from './terrain';
import { PLAGNE } from './world-data';

export let RIDER_LEVELS, LIFT_LEVEL, TIERS, CHRONO_REF, MEDAL_K, chronoPistes, medalTimes, DEFIS, STATS0, RIDER, R_KEY, riderDirty, riderSaveT, levelName, liftLocked, fmtUnit, fmtTime, TRACK_TTL, trackT, simT, LINE, cellFresh, rLastY, rLastX, rLastZ;

export function __set_riderDirty(v) { return (riderDirty = v); }

export function saveRider() { riderDirty = false; try { const { allOpen, ...keep } = RIDER; STORE.setItem(R_KEY, JSON.stringify(keep)); } catch (e) { /* storage blocked */ } }

export function riderLevel(xp = RIDER.xp) { let l = 0; RIDER_LEVELS.forEach(([, t], i) => { if (xp >= t) l = i; }); return l + 1; }

export function levelProgress() { const l = riderLevel(); if (l >= RIDER_LEVELS.length) return 1; const a = RIDER_LEVELS[l - 1][1], b = RIDER_LEVELS[l][1]; return (RIDER.xp - a) / (b - a); }

export function addXP(n, why) {
  const before = riderLevel(); RIDER.xp += n; const after = riderLevel(); riderDirty = true;
  if (after > before) {
    const opened = Object.entries(LIFT_LEVEL).filter(([, l]) => l > before && l <= after).map(([k]) => k);
    toast('Niveau ' + after + ' · ' + levelName(after), opened.length ? opened.join(', ') + ' ouvert' : 'Nouveau niveau de rider', 'lvl');
    sfx.chime && sfx.chime(2);
    if ($('llist').childElementCount) fillMapLists();
  }
  updateLevelChip();
}

// lifts: closed until the rider level allows them (or if an old save had already opened them)
export function lockOf(L) {
  const need = LIFT_LEVEL[L.name];
  if (!need || RIDER.allOpen || RIDER.legacyLifts.includes(L.name) || riderLevel() >= need) return null;
  return { title: 'Niveau ' + need, goal: 'Atteindre le niveau ' + need + ' (' + levelName(need) + ')' };
}

export function checkDefis() {
  for (const d of DEFIS) {
    const v = d.get(RIDER.stats), have = RIDER.tiers[d.id] || 0; let got = have;
    while (got < 3 && v >= d.t[got]) got++;
    for (let k = have; k < got; k++) { addXP(TIERS[k].xp); toast('Défi ' + TIERS[k].n + ' · ' + d.title, d.desc + ' : ' + fmtUnit(d.t[k], d.unit) + ' · +' + TIERS[k].xp + ' XP', 'tier' + k); }
    if (got !== have) { RIDER.tiers[d.id] = got; riderDirty = true; saveRider(); }
  }
}

export function markTrack(x, z) { const k = zIdx(x, z); if (k >= 0) trackT[k] = simT; }

export function firstTrackStep(dt) {
  simT += dt;
  const sp = P.vel.length();
  if (P.state === 'air' && LINE.on) return;                                                   // a jump in the powder keeps the line
  const ok = P.state === 'ski' && !P.climb && P.snow === SN.POUDREUSE && sp > 4;
  if (!ok) { if (LINE.on && (LINE.out += dt) > 1.2) lineEnd('out'); return; }
  LINE.out = 0;
  const k = zIdx(P.pos.x, P.pos.z), fresh = cellFresh(k);
  if (k !== LINE.lastK) { if (LINE.lastK >= 0) trackT[LINE.lastK] = simT; LINE.lastK = k; }   // your own track marks the cell you leave
  if (!LINE.on) { if (!fresh) return; Object.assign(LINE, { on: true, fresh: 0, len: 0, stale: 0, mult: 1, hud: 0 }); }
  LINE.len += sp * dt;
  if (fresh) { LINE.fresh += sp * dt; LINE.stale = 0; } else if ((LINE.stale += dt) > 1.5) { lineEnd('track'); return; }
  const m = Math.min(5, 1 + Math.floor(LINE.fresh / 80));
  if (m > LINE.mult) { LINE.mult = m; sfx.chime && sfx.chime(0); }
}

export function lineEnd(why) {
  if (!LINE.on) return;
  LINE.on = false; LINE.lastK = -1;
  const m = Math.round(LINE.fresh), st = RIDER.stats;
  if (why === 'abort' || m < 40) return;
  if (why === 'crash') { toast('Ligne perdue', 'Chute après ' + m + ' m de poudreuse vierge', 'off'); return; }
  const rec = m > (st.bestLine || 0); if (rec) { st.bestLine = m; riderDirty = true; }
  toast('Première trace · ' + m + ' m', '×' + LINE.mult + ' · ' + fmt(m * LINE.mult) + ' pts' + (rec ? ' · nouveau record' : ' · record ' + (st.bestLine || 0) + ' m') + (why === 'track' ? ' · trace croisée' : ''), rec ? 'tier2' : 'tier1');
}

// freeriders: a few skiers on off-piste lines 40-60 m beside the runs (powder, no trees, going down), leaving tracks
export function buildFreeLines() {
  const lines = [], nrm = new V3();
  const treeNear = (x, z) => { const cx = Math.floor((x + HALF) / TC), cz = Math.floor((z + HALF) / TC); for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const l = trees.grid.get(cx + dx + (cz + dz) * 1000); if (l && l.some(i => Math.hypot(trees.x[i] - x, trees.z[i] - z) < 5)) return true; } return false; };
  for (const p of skiPistes()) {
    if (p.samples.length < 90 || p.lvl === 'park') continue;
    for (const side of [1, -1]) for (const off of [45, 60]) {
      let run = [];
      const flush = () => { if (run.length >= 50 && gridH(run[0].x, run[0].z) - gridH(run[run.length - 1].x, run[run.length - 1].z) > 35) lines.push({ name: 'Hors-piste', lvl: 'noire', w: 16, samples: run, free: true }); run = []; };
      for (let i = 1; i < p.samples.length - 1; i++) {
        const a = p.samples[i - 1], b = p.samples[i + 1], l = Math.hypot(b.x - a.x, b.z - a.z) || 1, x = p.samples[i].x + (b.z - a.z) / l * off * side, z = p.samples[i].z - (b.x - a.x) / l * off * side;
        normalAt(x, z, nrm);
        const ok = Math.abs(x) < HALF - 40 && Math.abs(z) < HALF - 40 && zoneAt(x, z) < 0 && snowAt(x, z) === SN.POUDREUSE && nrm.y > 0.72 && !treeNear(x, z) && obstacles.every(o => Math.hypot(o.x - x, o.z - z) > o.r + 6);
        if (ok) run.push({ x, z }); else flush();
      }
      flush();
    }
  }
  return lines.sort((a, b) => b.samples.length - a.samples.length);
}

export function riderStep(dt) {
  const st = RIDER.stats, sp = P.vel.length();
  // a jump of position (teleport, respawn) cancels timed things
  if (rLastY !== null && Math.hypot(P.pos.x - rLastX, P.pos.z - rLastZ) > 40) riderEvent('teleport');
  if (P.state === 'ski') {
    const k = sp * 3.6; if (k > st.vmax + 0.5) { st.vmax = Math.round(k); riderDirty = true; }
    if (P.snow === SN.POUDREUSE && sp > 2) st.powder += sp * dt;
    st.dist += sp * dt;
    if (rLastY !== null) { const dy = rLastY - P.pos.y; if (dy > 0 && dy < 3) st.vert += dy; }
    // carving: on the edge, at speed, without skidding, on firm snow
    const m = RIDER.active && missionStep(); if (m && m.do === 'carve' && Math.abs(P.edge) > 0.45 && sp > 7 && (P.skid || 0) < 0.35 && (P.snow === SN.DAMEE || P.snow === SN.CULTURE || P.snow === SN.PARK)) { RIDER.active.carve = (RIDER.active.carve || 0) + sp * dt; if (RIDER.active.carve >= m.dist) advanceMission(); }
    if (PIPE.on && P.pipeChain && !inPipe(P.pos.x, P.pos.z, 3)) P.pipeChain = 0;
  }
  if (P.state === 'air') st.air += dt;
  rLastY = P.state === 'lift' ? null : P.pos.y; rLastX = P.pos.x; rLastZ = P.pos.z;
  chronoStep(dt); firstTrackStep(dt); missionTick(dt);
  riderSaveT += dt; if (riderSaveT > 0.5) { riderSaveT = 0; checkDefis(); }
  if (riderDirty && (riderStep.t = (riderStep.t || 0) + dt) > 15) { riderStep.t = 0; saveRider(); }
}

export function riderEvent(type, d) {
  const st = RIDER.stats; riderDirty = true;
  if (type === 'trick') {
    st.tricks++; st.bestTrick = Math.max(st.bestTrick, d.pts);
    missionTrick(d);
  } else if (type === 'land') {          // any clean landing (half-pipe chains count every air, scored or not)
    if (inPipe(P.pos.x, P.pos.z, 2)) { P.pipeChain = (P.pipeChain || 0) + 1; st.pipeChain = Math.max(st.pipeChain, P.pipeChain); }
  } else if (type === 'rail') { st.rails++; missionTrick(d); }
  else if (type === 'butter') st.butter = Math.max(st.butter, d);
  else if (type === 'tunnel') st.tunnels++;
  else if (type === 'ride') { st.rides++; if (chrono) chronoAbort('Remontée prise'); }
  else if (type === 'crash') { P.pipeChain = 0; lineEnd('crash'); }
  else if (type === 'teleport' || type === 'sled') { lineEnd('abort'); if (chrono) chronoAbort(type === 'sled' ? 'Motoneige' : 'Téléportation'); missionTimedBreak(type === 'sled' ? 'la motoneige' : 'la téléportation'); }
}

export function __init_6203() {

/* =====================================================================================================
   GAME PROGRESSION: rider logbook (XP, levels, tiered challenges, stats), timed descents with medals,
   people of the resort to talk to (shopkeepers, lift staff, instructor, patrol, photographer) and missions.
   Tracking runs in stepSim (so it pauses with the map and dialogues); saving happens on events.
   ===================================================================================================== */
RIDER_LEVELS = [['Ourson', 0], ['Flocon', 300], ['1re étoile', 800], ['2e étoile', 1500], ['3e étoile', 2400], ['Étoile de bronze', 3600], ['Étoile d\'or', 5000], ['Chamois', 6800], ['Flèche', 9000], ['Légende du Val', 12000]];
LIFT_LEVEL = { 'Téléski du Snowpark': 2, 'Télésiège de la Forêt': 3 };
   // rider level that opens these lifts
TIERS = [{ n: 'Bronze', c: '#c98a4a', xp: 100 }, { n: 'Argent', c: '#c9d1db', xp: 250 }, { n: 'Or', c: '#ffc94d', xp: 500 }];
// reference times, gate to gate: the test bot (clean lines, speed capped at 65 km/h on reds and blacks, 43 on greens,
// 50 in the park). Gold = matching it, silver +20 %, bronze +50 %.
CHRONO_REF = { 'Le Couloir': 88, 'La Grande Combe': 82, 'Le Balcon': 51, 'Le Mur de l\'Est': 75, 'Les Sapins': 66, 'Retour Village': 97, 'Les Écureuils': 41, 'Snowpark': 35, 'Les Marmottes': 21 };
if (PLAGNE) {   // the same rules on the real runs; times measured with the same test bot
  for (const k in LIFT_LEVEL) delete LIFT_LEVEL[k]; Object.assign(LIFT_LEVEL, { 'Téléski Dromadaire': 2, 'Télésiège Colorado': 3 });   // Dromadaire: the snowpark lift
  for (const k in CHRONO_REF) delete CHRONO_REF[k];
  Object.assign(CHRONO_REF, { 'Stade de slalom Jean-Luc Crétier': 79, 'Grande Pente': 72, 'Java': 65, 'Gavotte': 185, 'Puy du Fou': 105, 'Mont Saint-Sauveur': 155, 'Émile Allais': 60, 'Crête-Côte': 48, 'École Aime 2000': 58, 'Snowpark': 38 });
}
MEDAL_K = [1.5, 1.2, 1.0];
chronoPistes = () => PISTES.filter(p => CHRONO_REF[p.name] && p.samples);
medalTimes = p => MEDAL_K.map(k => Math.round(CHRONO_REF[p.name] * k));
DEFIS = [
  { id: 'vitesse', cat: 'Glisse', title: 'Pleine vitesse', desc: 'Vitesse maximale sur la neige', unit: 'km/h', get: s => s.vmax, t: [60, 80, 100] },
  { id: 'deniv', cat: 'Glisse', title: 'Avaleur de dénivelé', desc: 'Dénivelé descendu à ski', unit: 'm', get: s => s.vert, t: [1000, 5000, 20000] },
  { id: 'trace', cat: 'Hors-piste', title: 'Première trace', desc: 'Plus longue ligne en poudreuse vierge, sans chute ni trace croisée', unit: 'm', get: s => s.bestLine || 0, t: [150, 400, 900] },
  { id: 'poudre', cat: 'Hors-piste', title: 'Faire la trace', desc: 'Distance parcourue en poudreuse', unit: 'm', get: s => s.powder, t: [300, 1500, 5000] },
  { id: 'pistes', cat: 'Exploration', title: 'Le tour du domaine', desc: 'Pistes descendues d\'une traite, du départ à l\'arrivée', unit: '', get: s => s.pistes.length, t: [3, 6, 9] },
  { id: 'remontees', cat: 'Exploration', title: 'Habitué des remontées', desc: 'Remontées empruntées', unit: '', get: s => s.rides, t: [3, 12, 30] },
  { id: 'tunnels', cat: 'Exploration', title: 'Sous la montagne', desc: 'Tunnels traversés de bout en bout', unit: '', get: s => s.tunnels, t: [1, 5, 15] },
  { id: 'figure', cat: 'Freestyle', title: 'Figure de légende', desc: 'Meilleure figure, en points', unit: 'pts', get: s => s.bestTrick, t: [200, 500, 1000] },
  { id: 'figures', cat: 'Freestyle', title: 'Rider régulier', desc: 'Figures réussies', unit: '', get: s => s.tricks, t: [5, 25, 75] },
  { id: 'air', cat: 'Freestyle', title: 'Temps de vol', desc: 'Temps total passé en l\'air', unit: 's', get: s => s.air, t: [10, 60, 180] },
  { id: 'rails', cat: 'Freestyle', title: 'Jibber', desc: 'Glisses sur box et rails', unit: '', get: s => s.rails, t: [3, 15, 40] },
  { id: 'butter', cat: 'Freestyle', title: 'Beurre doux', desc: 'Meilleur butter (rotation au sol)', unit: '°', get: s => s.butter, t: [180, 360, 540] },
  { id: 'pipe', cat: 'Freestyle', title: 'Roi du pipe', desc: 'Sauts enchaînés dans le half-pipe sans tomber', unit: 'sauts', get: s => s.pipeChain, t: [2, 4, 6] },
  { id: 'or', cat: 'Chrono', title: 'Chasseur d\'or', desc: 'Pistes chronométrées en temps d\'or', unit: '', get: s => s.golds, t: [1, 3, 6] },
  { id: 'slalom', cat: 'Chrono', title: 'Slalom parfait', desc: 'Descentes du stade de slalom sans porte manquée', unit: '', get: s => s.slalomClean || 0, t: [1, 3, 10] },
];
if (PLAGNE) DEFIS.splice(DEFIS.findIndex(d => d.id === 'tunnels'), 1);   // no tunnels in the real sector
else DEFIS.splice(DEFIS.findIndex(d => d.id === 'slalom'), 1);
            // the slalom stadium is in La Plagne
STATS0 = () => ({ vmax: 0, vert: 0, powder: 0, air: 0, tricks: 0, bestTrick: 0, rails: 0, butter: 0, rides: 0, tunnels: 0, pipeChain: 0, golds: 0, pistes: [], dist: 0, missions: 0 });
RIDER = { xp: 0, stats: STATS0(), tiers: {}, runs: {}, missions: {}, active: null, legacyLifts: [], allOpen: false };
R_KEY = 'valdessapins.rider';
(function loadRider() {
  try {
    const s = JSON.parse(STORE.getItem(R_KEY) || 'null');
    if (s) { Object.assign(RIDER, s); RIDER.stats = Object.assign(STATS0(), s.stats || {}); RIDER.allOpen = false; return; }
    // first launch with the new logbook: carry over the old challenges (XP, and the lifts they had opened)
    const old = JSON.parse(STORE.getItem('valdessapins.challenges') || 'null');
    if (old && old.done) {
      const n = Object.keys(old.done).filter(k => old.done[k]).length; RIDER.xp = n * 150;
      if (old.done.speed) RIDER.legacyLifts.push('Télésiège de la Forêt');
      if (old.done.spin360) RIDER.legacyLifts.push('Téléski du Snowpark');
    }
  } catch (e) { /* storage unavailable: progress lasts for this visit */ }
})();
riderDirty = false;
riderSaveT = 0;
levelName = l => RIDER_LEVELS[Math.max(0, Math.min(RIDER_LEVELS.length, l) - 1)][0];
liftLocked = L => !!lockOf(L);
fmtUnit = (v, u) => (u === 's' ? Math.round(v) + ' s' : u === 'm' ? fmt(Math.round(v)) + ' m' : fmt(Math.round(v)) + (u ? ' ' + u : ''));
fmtTime = t => { const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };

/* ---- première trace: untouched powder pays, tracked powder does not. A 4 m grid remembers when each cell was last
   skied (by you or the freeriders); after 15 minutes the snow counts as fresh again (the trails fade too). A line
   starts in fresh powder and grows while you stay in it: x2 after 80 m untouched, up to x5. Crossing a track for
   more than 1.5 s, or leaving the powder, closes the line; a fall loses it. The défi tiers pay the XP. */
TRACK_TTL = 900;
trackT = new Float32Array(ZN * ZN);
simT = 1;
LINE = { on: false, fresh: 0, len: 0, mult: 1, stale: 0, out: 0, lastK: -1, hud: 0 };
cellFresh = k => k >= 0 && (trackT[k] === 0 || simT - trackT[k] > TRACK_TTL);
/* ---- per-step tracking (stats, timed descent, mission) ---- */
rLastY = null;
rLastX = 0;
rLastZ = 0;
}
