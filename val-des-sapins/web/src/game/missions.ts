// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « missions ») ; typage strict progressif à venir.
/* eslint-disable */

import { FACE_EVT } from './humans';
import * as THREE from 'three';
import { sfx } from './audio';
import { villageLabels } from './buildings';
import { refreshTracker, toast, updateLevelChip } from './hud';
import { PEOPLE, markerTex, person } from './people';
import { LIFTS, PISTES, SPAWN_LIFT, inPipe } from './pistes';
import { P } from './player';
import { RIDER, addXP, fmtTime, medalTimes, riderLevel, saveRider } from './progression';
import { SMALL_LAYER, camera, scene } from './render';
import { H } from './terrain';
import { PLAGNE } from './world-data';

export let PLACES, PLACE_NAMES, MISSIONS, missionById, ITEMS, beam;


export function villagePoint(prefix) { const v = villageLabels.find(q => q.name.startsWith(prefix)); return [v.x, v.z]; }

export function missionStep() { const a = RIDER.active; if (!a) return null; const m = missionById(a.id); return m && m.steps[a.step]; }

export function startMission(m) {
  RIDER.active = { id: m.id, step: 0, time: m.time || 0, got: [], visited: [], count: 0, carve: 0 };
  RIDER.missions[m.id] = 'active'; enterStep(); saveRider();
  toast('Mission · ' + m.title, m.steps[0].text + (m.time ? ' · ' + fmtTime(m.time) : ''), 'go');
}

export function enterStep() {
  const s = missionStep(); if (!s) return;
  if (s.do === 'talk') { const d = person(s.npc); if (d.hidden) d.hidden = false; }
  if (s.follow) { const d = person(s.follow); d.n.follow = true; }
  if (s.do === 'collect') spawnItems(s);
  updateMarkers(); refreshTracker();
}

export function advanceMission(sayText) {
  const a = RIDER.active, m = missionById(a.id), s = m.steps[a.step];
  if (s.do === 'collect') clearItems();
  if (s.follow) { const d = person(s.follow); d.n.follow = false; }
  a.step++; a.count = 0;
  if (sayText || s.say) toast(m.title, sayText || s.say, 'say');
  if (a.step >= m.steps.length) return finishMission(m);
  enterStep(); saveRider();
  toast('Étape suivante', m.steps[a.step].text, 'go');
}

export function finishMission(m) {
  RIDER.missions[m.id] = 'done'; RIDER.active = null; RIDER.stats.missions++;
  // helpers who appeared only for this mission go home
  for (const id of ['nadia', 'joseph', 'thomas']) { const d = person(id); if (!RIDER.active || missionById(RIDER.active.id).steps.every(s => s.npc !== id)) { d.hidden = true; if (id === 'thomas') { d.n.x = d.x; d.n.z = d.z; } } }
  addXP(m.xp); saveRider(); updateMarkers(); refreshTracker();
  setTimeout(() => toast('Mission accomplie · ' + m.title, (m.done ? m.done + ' · ' : '') + '+' + m.xp + ' XP', 'tier2'), 400);
  sfx.chime && sfx.chime(2);
}

export function failMission(why) {
  const a = RIDER.active; if (!a) return; const m = missionById(a.id);
  if (missionStep() && missionStep().do === 'collect') clearItems();
  for (const s of m.steps) if (s.follow) person(s.follow).n.follow = false;
  RIDER.missions[m.id] = 'failed'; RIDER.active = null; saveRider(); updateMarkers(); refreshTracker(); FACE_EVT.sad = 4;   // T8 : le skieur est déçu
  toast('Mission échouée · ' + m.title, why + ' · retourne voir ' + person(m.giver).name + ' pour réessayer', 'off');
}

export function missionTimedBreak(how) { const a = RIDER.active; if (a && missionById(a.id).time) failMission('Interdit d\'utiliser ' + how + ' pendant une livraison'); }

export function missionTick(dt) {
  const a = RIDER.active; if (!a) return; const m = missionById(a.id), s = m.steps[a.step]; if (!s) return;
  if (m.time) { a.time -= dt; if (a.time <= 0) { failMission('Temps écoulé'); return; } }
  if (s.do === 'goto') { const [x, z] = PLACES[s.at](); if (Math.hypot(P.pos.x - x, P.pos.z - z) < s.r && P.state !== 'lift') advanceMission(); }
  else if (s.do === 'visit') {
    for (const k of s.pts) if (!a.visited.includes(k)) { const [x, z] = PLACES[k](); if (Math.hypot(P.pos.x - x, P.pos.z - z) < s.r && P.state !== 'lift') { a.visited.push(k); toast('Point de vue ' + a.visited.length + '/' + s.pts.length, PLACE_NAMES[k], 'go'); saveRider(); refreshTracker(); } }
    if (a.visited.length >= s.pts.length) advanceMission();
  } else if (s.do === 'collect') {
    for (const it of ITEMS) if (it.visible && Math.hypot(P.pos.x - it.position.x, P.pos.z - it.position.z) < 3.6 && Math.abs(P.pos.y - it.position.y) < 3) {
      it.visible = false; a.got.push(it.userData.k); toast('Saucisson ' + a.got.length + '/' + s.need, a.got.length >= s.need ? 'Le compte est bon !' : 'Continue la descente', 'go'); sfx.chime && sfx.chime(0); refreshTracker();
      if (a.got.length >= s.need) { advanceMission(); return; }
    }
  }
}

export function missionTrick(d) {
  const s = missionStep(); if (!s || s.do !== 'tricks') return;
  if (s.minPts && d.pts < s.minPts) return;
  if (s.minAir && !(d.air >= s.minAir)) return;
  if (s.zone === 'park') { const park = PISTES.find(q => q.name === 'Snowpark'); if (!(inPipe(P.pos.x, P.pos.z, 4) || park.samples.some(q => Math.hypot(q.x - P.pos.x, q.z - P.pos.z) < park.w / 2 + 12))) return; }
  if (s.zone === 'chloe') { const c = person('chloe').n; if (Math.hypot(c.x - P.pos.x, c.z - P.pos.z) > 70) return; }
  const a = RIDER.active; a.count++; refreshTracker();
  if (a.count >= s.n) advanceMission(); else toast(missionById(a.id).title, 'Figure validée · ' + a.count + '/' + s.n, 'go');
}

export function missionChrono(p, t) {
  const s = missionStep(); if (!s || s.do !== 'chrono' || s.piste !== p.name) return;
  if (t <= medalTimes(p)[s.medal]) advanceMission(); else toast(missionById(RIDER.active.id).title, 'Trop lent : il faut ' + fmtTime(medalTimes(p)[s.medal]), 'off');
}

export function restoreMission() {
  for (const [id, st] of Object.entries(RIDER.missions)) if (st === 'active' && (!RIDER.active || RIDER.active.id !== id)) RIDER.missions[id] = 'failed';
  if (RIDER.active) { const m = missionById(RIDER.active.id); if (!m) RIDER.active = null; else { if (m.time) RIDER.active.time = Math.max(RIDER.active.time, 60); enterStep(); } }
  updateMarkers(); refreshTracker(); updateLevelChip();
}

export function spawnItems(s) {
  clearItems(); const p = PISTES.find(q => q.name === s.piste), S = p.samples, a = RIDER.active;
  const geo = new THREE.CylinderGeometry(0.1, 0.1, 0.55, 10); geo.rotateZ(Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: '#7a2a1e', roughness: 0.55, emissive: '#5a1a10', emissiveIntensity: 0.5 });
  for (let k = 0; k < s.n; k++) {
    if (a.got.includes(k)) continue;
    const i = Math.round(S.length * (0.12 + 0.76 * k / (s.n - 1))), q = S[i], r = S[Math.min(S.length - 1, i + 1)], hd = Math.atan2(r.x - q.x, r.z - q.z), lat = (k % 2 ? 1 : -1) * p.w * 0.18;
    const g = new THREE.Group(); g.add(new THREE.Mesh(geo, mat));
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 32), new THREE.MeshBasicMaterial({ color: '#ffc94d', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -0.55; g.add(ring);
    const x = q.x + Math.cos(hd) * lat, z = q.z - Math.sin(hd) * lat; g.position.set(x, H(x, z) + 0.6, z); g.userData.k = k;
    g.traverse(o => { o.layers.set(SMALL_LAYER); o.castShadow = false; }); scene.add(g); ITEMS.push(g);
  }
}

export function clearItems() { for (const g of ITEMS) scene.remove(g); ITEMS.length = 0; }

export function missionTargets() {
  const a = RIDER.active, s = missionStep(); if (!s) return [];
  if (s.do === 'talk') { const n = person(s.npc).n; return [[n.x, n.z, person(s.npc).name]]; }
  if (s.do === 'goto') { const [x, z] = PLACES[s.at](); return [[x, z, PLACE_NAMES[s.at]]]; }
  if (s.do === 'visit') return s.pts.filter(k => !a.visited.includes(k)).map(k => { const [x, z] = PLACES[k](); return [x, z, PLACE_NAMES[k]]; });
  if (s.do === 'collect') return ITEMS.filter(i => i.visible).map(i => [i.position.x, i.position.z, 'Saucisson']);
  if (s.do === 'chrono') { const p = PISTES.find(q => q.name === s.piste); return [[p.samples[3].x, p.samples[3].z, 'Départ · ' + p.name]]; }
  if (s.do === 'tricks') { if (s.zone === 'chloe') { const n = person('chloe').n; return [[n.x, n.z, 'Chloé']]; } const p = PISTES.find(q => q.name === 'Snowpark'); return [[p.samples[20].x, p.samples[20].z, 'Snowpark']]; }
  return [];
}

export function updateMarkers() {
  const lvl = riderLevel(), a = RIDER.active, s = missionStep();
  for (const d of PEOPLE) {
    let k = '';
    if (s && s.do === 'talk' && s.npc === d.id) k = '?';
    else if (!a) { const m = MISSIONS.find(q => q.giver === d.id && RIDER.missions[q.id] !== 'done'); if (m) k = lvl >= m.lvl ? '!' : '·'; }
    d.markKind = k;
    if (d.mark) { d.mark.visible = !!k && !d.hidden; if (k) d.mark.material.map = markerTex(k); d.mark.material.needsUpdate = true; }
  }
}

export function updatePeopleFx(time) {
  for (const d of PEOPLE) if (d.mark && d.n) { d.mark.position.set(d.n.x, d.n.y + 2.55 + Math.sin(time * 2.4) * 0.08, d.n.z); d.mark.visible = !!d.markKind && !d.hidden; }
  for (const it of ITEMS) { it.children[0].rotation.y = time * 2.5; it.children[0].position.y = Math.sin(time * 3 + it.userData.k) * 0.12; }
  const T = missionTargets(); beam.mesh.visible = false;
  if (T.length) {
    let best = T[0], bd = 1e9; for (const t of T) { const d = Math.hypot(t[0] - P.pos.x, t[1] - P.pos.z); if (d < bd) { bd = d; best = t; } }
    beam.mesh.visible = bd > 12; beam.mesh.position.set(best[0], H(best[0], best[1]), best[1]); beam.m.uniforms.uT.value = time; { const kw = Math.max(1, Math.hypot(best[0] - camera.position.x, best[1] - camera.position.z) / 90); beam.mesh.scale.set(kw, 1, kw); }   // stays a few pixels wide from afar
  }
}

export function __init_6698() {

/* ---- missions ---- */
PLACES = {
  restaurant: () => villagePoint('Restaurant'), bellecime: () => villagePoint('Bellecime'), valhaut: () => villagePoint('Val Haut'),
  sommet: () => { const L = LIFTS.find(l => l.name === 'Télésiège du Sommet'); return [L.exit[0], L.exit[1]]; },
  parktop: () => { const p = PISTES.find(q => q.name === 'Snowpark'); return [p.samples[2].x, p.samples[2].z]; },
};
PLACE_NAMES = { restaurant: 'Terrasse du Belvédère', bellecime: 'Bellecime 1950', valhaut: 'Val Haut 1800', sommet: 'Sommet du Val', parktop: 'Départ du Snowpark' };
MISSIONS = [
  { id: 'location', giver: 'lucie', title: 'Location express', lvl: 1, xp: 300,
    intro: 'Une cliente est partie sans ses skis de location ! Elle attend en haut de la télécabine, à Val Haut 1800. Tu peux les lui monter ?',
    steps: [{ do: 'talk', npc: 'nadia', text: 'Apporter les skis à Nadia, en haut de la Télécabine du Village', say: 'Mes skis ! Merci, je commençais à geler sur place.' }] },
  { id: 'ravito', giver: 'marco', title: 'Ravitaillement du Belvédère', lvl: 1, xp: 350, time: 360,
    intro: 'Le restaurant Le Belvédère, à Val Haut 1800, n\'a plus de pain ni de génépi. Le chef attend la livraison dans 6 minutes, pas une de plus.',
    steps: [{ do: 'goto', at: 'restaurant', r: 24, text: 'Livrer le restaurant Le Belvédère', say: 'Le chef : « Juste à temps, le service commence ! »' }] },
  { id: 'saucissons', giver: 'paul', title: 'Saucissons perdus', lvl: 1, xp: 450,
    intro: 'Mon livreur a renversé une caisse de saucissons en descendant la piste Retour Village, depuis Val Haut 1800. Il y en a partout ! Rapporte-m\'en au moins cinq.',
    steps: [{ do: 'collect', piste: 'Retour Village', n: 7, need: 5, text: 'Ramasser les saucissons sur la piste Retour Village' },
            { do: 'talk', npc: 'paul', text: 'Rapporter les saucissons à Paul, aux Granges', say: 'Parfait ! Ce soir, rosette pour tout le monde.' }] },
  { id: 'croissants', giver: 'sophie', title: 'Croissants pour les pisteurs', lvl: 2, xp: 450, time: 600,
    intro: 'Les pisteurs du sommet n\'ont pas déjeuné. Monte-leur ces croissants tant qu\'ils sont chauds : 10 minutes, télécabine puis Télésiège du Sommet.',
    steps: [{ do: 'talk', npc: 'elodie', text: 'Apporter les croissants à Élodie, au sommet du Télésiège du Sommet', say: 'Des croissants chauds à 2 300 m… tu es un ange.' }] },
  { id: 'testproduit', giver: 'yanis', title: 'Test produit', lvl: 1, xp: 450,
    intro: 'On vient de recevoir les nouveaux twin-tips. Il me faut un avis de rider : trois figures à 150 points ou plus, au snowpark ou dans le half-pipe.',
    steps: [{ do: 'tricks', zone: 'park', minPts: 150, n: 3, text: 'Poser 3 figures à 150 pts ou plus au snowpark ou au half-pipe' },
            { do: 'talk', npc: 'yanis', text: 'Faire ton retour à Yanis, à Val Haut 1800', say: 'Trois réceptions propres, je note : « stables et joueurs ». Merci !' }] },
  { id: 'fondue', giver: 'henri', title: 'Fondue express', lvl: 2, xp: 400, time: 240,
    intro: 'Une fondue pour un chalet des Granges, en bas de la vallée ! Prends Les Sapins et file avant que le fromage ne fige : 4 minutes.',
    steps: [{ do: 'goto', at: 'granges', r: 30, text: 'Livrer la fondue à un chalet des Granges', say: 'Les vacanciers : « Elle est encore fumante, bravo ! »' }] },
  { id: 'cartes', giver: 'mireille', title: 'Cartes postales', lvl: 1, xp: 500,
    intro: 'Je refais mes cartes postales. Va repérer les quatre plus beaux points de vue du domaine, puis raconte-moi.',
    steps: [{ do: 'visit', pts: ['sommet', 'restaurant', 'parktop', 'bellecime'], r: 32, text: 'Visiter les points de vue' },
            { do: 'talk', npc: 'mireille', text: 'Raconter tes découvertes à Mireille, à Val Haut 1800', say: 'Le sommet au lever du jour… voilà ma prochaine carte !' }] },
  { id: 'beaufort', giver: 'jeanne', title: 'Beaufort d\'alpage', lvl: 1, xp: 450,
    intro: 'Joseph, le berger de l\'alpage du Plan, me garde une meule. Son chalet est au départ de la Liaison Snowpark, sous le sommet.',
    steps: [{ do: 'talk', npc: 'joseph', text: 'Récupérer la meule chez Joseph, à l\'alpage du Plan', say: 'Dix-huit mois d\'affinage. Ne la fais pas tomber !' },
            { do: 'talk', npc: 'jeanne', text: 'Rapporter la meule à Jeanne, à Val Haut 1800', say: 'Magnifique. Elle aura la place d\'honneur en vitrine.' }] },
  { id: 'couloir', giver: 'rene', title: 'Le Couloir', lvl: 2, xp: 500,
    intro: 'Tout le monde parle du Couloir. Montre-moi que tu le tiens : descends-le du départ à l\'arrivée sous le temps d\'argent.',
    steps: [{ do: 'chrono', piste: 'Le Couloir', medal: 1, text: 'Descendre Le Couloir en temps d\'argent' }], done: 'René à la radio : « Joli ! Le Couloir est à toi. »' },
  { id: 'carving', giver: 'bastien', title: 'Leçon de carving', lvl: 1, xp: 300,
    intro: 'Sur la carre, genoux dans la pente, sans déraper. Fais-moi 400 mètres de vraies courbes sur piste damée.',
    steps: [{ do: 'carve', dist: 400, text: 'Carver 400 m sur piste damée' }], done: 'Bastien à la radio : « Superbe, tu laisses des rails dans la neige ! »' },
  { id: 'egare', giver: 'elodie', title: 'Skieur égaré', lvl: 3, xp: 600,
    intro: 'Un skieur s\'est perdu dans la poudreuse entre Le Couloir et La Grande Combe. Retrouve-le et ramène-le jusqu\'à Val Haut 1800.',
    steps: [{ do: 'talk', npc: 'thomas', text: 'Retrouver le skieur égaré, hors-piste', say: 'Ouf ! Je tournais en rond depuis une heure. Je te suis.' },
            { do: 'goto', at: 'valhaut', r: 45, follow: 'thomas', text: 'Redescendre avec Thomas jusqu\'à Val Haut 1800', say: 'Thomas : « Merci, je ne quitterai plus jamais les pistes balisées. »' }] },
  { id: 'shooting', giver: 'chloe', title: 'Shooting photo', lvl: 1, xp: 350,
    intro: 'Je shoote pour le magazine de la station. Envoie-moi une figure d\'au moins 1,2 seconde de vol, à moins de 70 m de mon objectif.',
    steps: [{ do: 'tricks', zone: 'chloe', minAir: 1.2, n: 1, text: 'Une figure de 1,2 s de vol près de Chloé' }], done: 'Chloé : « Dans la boîte ! Elle fera la couverture. »' },
];
PLACES.granges = () => villagePoint('Les Granges');
 PLACE_NAMES.granges = 'Les Granges';
/* La Plagne: the same people and missions, moved to the real places. The shops of the lower village are in
   Plagne 1800, those of the mid-station in Plagne Centre; the summit is the top of the Bécoin chairlift. */
if (PLAGNE) {
  const at = {
    lucie: { near: [40, -945] }, marco: { near: [-10, -985] }, sophie: { near: [70, -1000] }, paul: { near: [95, -955] },
    yanis: { near: [-255, -250] }, henri: { near: [-215, -205] }, jeanne: { near: [-200, -265] }, mireille: { near: [-285, -215] },
    rene: { lift: 'Télésiège Bécoin' }, elodie: { liftTop: 'Télésiège Bécoin' }, nadia: { liftTop: 'Télécabine Télémétro' },
    bastien: { piste: ['Boulevard II', 6, 1] }, chloe: { piste: ['Snowpark', 34, -1, 8] }, joseph: { piste: ['Java', 5, 1, 24] },
    thomas: { lostBox: [-1060, 250, -760, 430] },   // between La Grande Pente and Java, under the Bécoin
  };
  const SUB = [
    ['Télécabine du Village', 'Télécabine Télémétro'], ['Télésiège du Sommet', 'Télésiège Bécoin'], ['en haut de la télécabine, à Val Haut 1800', 'en haut de la Télécabine Télémétro, à Aime 2000'],
    ['Le restaurant Le Belvédère, à Val Haut 1800', 'Le restaurant Le Belvédère, à Plagne Villages'], ['télécabine puis Télésiège Bécoin', 'Télésiège Bécoin, depuis Plagne Centre'],
    ['en descendant la piste Retour Village, depuis Val Haut 1800', 'en descendant la piste Loup Garou, de Plagne Centre à Plagne 1800'], ['la piste Retour Village', 'la piste Loup Garou'],
    ['un chalet des Granges, en bas de la vallée ! Prends Les Sapins', 'un chalet de Plagne 1800, en bas du domaine ! Prends Loup Garou'], ['un chalet des Granges', 'un chalet de Plagne 1800'],
    ['aux Granges', 'à Plagne 1800'], ['Val Haut 1800', 'Plagne Centre'], ['à 2 300 m', 'à 2 400 m'],
    ['l\'alpage du Plan, me garde une meule. Son chalet est au départ de la Liaison Snowpark, sous le sommet', 'l\'alpage de la Vellière, me garde une meule. Son chalet est au départ de la piste Java, sous le sommet du Bécoin'],
    ['alpage du Plan', 'alpage de la Vellière'], ['entre Le Couloir et La Grande Combe', 'entre La Grande Pente et Java, sous le Bécoin'],
    ['Tout le monde parle du Couloir', 'Tout le monde parle de la Grande Pente'], ['Descendre Le Couloir', 'Descendre la Grande Pente'], ['Le Couloir est à toi', 'La Grande Pente est à toi'],
  ];
  const fix = t => t && SUB.reduce((q, [a, b]) => q.split(a).join(b), t);
  for (const d of PEOPLE) { Object.assign(d, at[d.id] || {}); d.role = fix(d.role); d.idle = fix(d.idle); }
  const RUN = { 'Retour Village': 'Loup Garou', 'Le Couloir': 'Grande Pente' };
  // timed deliveries: 1.5 x the fastest route of the test bot (runs and lifts it measured), rounded up
  const TIME = { ravito: [600, '6 minutes', '10 minutes'], croissants: [1020, '10 minutes', '17 minutes'], fondue: [300, '4 minutes', '5 minutes'] };
  for (const m of MISSIONS) {
    const tm = TIME[m.id]; if (tm) { m.time = tm[0]; m.intro = m.intro.split(tm[1]).join(tm[2]); }
    m.title = m.id === 'couloir' ? 'La Grande Pente' : fix(m.title); m.intro = fix(m.intro); m.done = fix(m.done);
    for (const st of m.steps) { st.text = fix(st.text); st.say = fix(st.say); if (st.piste) st.piste = RUN[st.piste] || st.piste; }
  }
  Object.assign(PLACES, { valhaut: () => villagePoint('Plagne Centre'), granges: () => villagePoint('Plagne 1800'), bellecime: () => villagePoint('Aime 2000'),
    restaurant: () => villagePoint('Plagne Villages'), sommet: () => SPAWN_LIFT().exit });
  Object.assign(PLACE_NAMES, { valhaut: 'Plagne Centre', granges: 'Plagne 1800', bellecime: 'Aime 2000', restaurant: 'Terrasse du Belvédère, Plagne Villages', sommet: 'Sommet du Bécoin' });
}
missionById = id => MISSIONS.find(m => m.id === id);
// collectibles: sausages scattered from top to bottom of the piste, alternating sides
ITEMS = [];
// waypoint beam over the nearest target, and the item bob
beam = (() => {
  // normal blending, saturated orange: an additive beam vanishes against sunlit snow when there is no bloom
  const g = new THREE.CylinderGeometry(1.6, 1.6, 90, 20, 1, true); g.translate(0, 45, 0);
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    uniforms: { uT: { value: 0 } },
    vertexShader: 'varying float vY; void main(){ vY = position.y / 90.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uT; varying float vY; void main(){ float a = pow(1.0 - vY, 1.5) * (0.62 + 0.2 * sin(vY * 40.0 - uT * 4.0)); gl_FragColor = vec4(pow(vec3(1.0, 0.55, 0.08), vec3(2.2)) * 1.4, a); }' });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 3; mesh.layers.set(SMALL_LAYER); scene.add(mesh);
  return { mesh, m };
})();
}
