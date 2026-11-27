// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « people ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { BUILDINGS, hashSeed } from './assembly';
import { TERRACE_FOLK } from './buildings';
import { V3, colorCanvasTex, wrapPi } from './core';
import { openDialog } from './journal';
import { lambertVC, mergeParts } from './materials';
import { restoreMission } from './missions';
import { PANTS_C, ZERO_M, npcMesh, npcs } from './npcs';
import { LIFTS, PISTES, SN, snowAt, zoneAt } from './pistes';
import { P, tryBoard } from './player';
import { SMALL_LAYER, scene } from './render';
import { H, normalAt } from './terrain';
import { PLAGNE } from './world-data';

export let PEOPLE, SHOP_ANCHORS, CUR_BLD, bldToWorld, FEMALE_PEOPLE, PROP_KINDS, markerTexCache, person;

export function __set_CUR_BLD(v) { return (CUR_BLD = v); }

export function spotClear(x, z) {
  for (const b of BUILDINGS) {
    const dx = x - b.x, dz = z - b.z, c = Math.cos(b.rot), s = Math.sin(b.rot), lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) < b.w / 2 + 1.4 && Math.abs(lz) < b.d / 2 + 1.4) return false;
  }
  return true;
}

export function placePeople() {
  if (placePeople.done) return; placePeople.done = true;
  const shops = BUILDINGS.filter(b => (PLAGNE ? /woodres|paquebot|tower|block/ : /woodres|paquebot|tower/).test(b.type)), taken = new Set();
  for (const d of PEOPLE) {
    let x, z, yaw = 0;
    if (d.shop !== undefined) {
      const free = shops.filter(q => !taken.has(q)), b = (free.length ? free : shops).reduce((m, q) => Math.hypot(q.x - d.near[0], q.z - d.near[1]) < Math.hypot(m.x - d.near[0], m.z - d.near[1]) ? q : m);
      taken.add(b);
      // try the four faces: stand 3 m in front of the middle bay, on a free spot
      for (const [lx, lz, fy] of [[0, b.d / 2 + 3, 0], [0, -b.d / 2 - 3, Math.PI], [b.w / 2 + 3, 0, Math.PI / 2], [-b.w / 2 - 3, 0, -Math.PI / 2]]) {
        const [wx, wz] = bldToWorld(b, lx, lz); if (!spotClear(wx, wz)) continue;
        x = wx; z = wz; yaw = b.rot + fy;
        const [ax, az] = bldToWorld(b, lx * 0.82, lz * (Math.abs(lz) > 1 ? (b.d / 2) / Math.abs(lz) : 1)); SHOP_ANCHORS.push({ x: ax, z: az, shop: d.shop });
        break;
      }
      if (x === undefined) { const [wx, wz] = bldToWorld(b, 0, b.d / 2 + 3); x = wx; z = wz; yaw = b.rot; SHOP_ANCHORS.push({ x: wx, z: wz, shop: d.shop }); }
    } else if (d.lift) {
      const L = LIFTS.find(l => l.name === d.lift); x = L.board.x + L.side.x * 7 - L.dir.x * 4; z = L.board.z + L.side.z * 7 - L.dir.z * 4; yaw = Math.atan2(-L.side.x, -L.side.z);
    } else if (d.liftTop) {
      const L = LIFTS.find(l => l.name === d.liftTop), o = d.off || [8, 2], sx = Math.cos(L.exitYaw), sz = -Math.sin(L.exitYaw);
      x = L.exit[0] + sx * o[0] + Math.sin(L.exitYaw) * o[1]; z = L.exit[1] + sz * o[0] + Math.cos(L.exitYaw) * o[1]; yaw = Math.atan2(L.exit[0] - x, L.exit[1] - z);
    } else if (d.piste) {
      const p = PISTES.find(q => q.name === d.piste[0]), S = p.samples, i = d.piste[1], a = S[i], b = S[i + 1], hd = Math.atan2(b.x - a.x, b.z - a.z);
      const lat = (p.w / 2 - 3 + (d.piste[3] || 0)) * d.piste[2]; x = a.x + Math.cos(hd) * lat; z = a.z - Math.sin(hd) * lat; yaw = Math.atan2(a.x - x, a.z - z);
    } else if (d.lost) {
      // somewhere in the powder between Le Couloir and La Grande Combe, away from the pistes, on a gentle slope
      const n = new V3(); let best = null;
      const bx = d.lostBox || [-220, -720, 220, -380];
      for (let zz = bx[1]; zz < bx[3] && !best; zz += 9) for (let xx = bx[0]; xx < bx[2]; xx += 9) { if (snowAt(xx, zz) !== SN.POUDREUSE || zoneAt(xx, zz) >= 0) continue; normalAt(xx, zz, n); if (n.y > 0.9) { best = [xx, zz]; break; } }
      [x, z] = best || [(bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2];
    }
    d.x = x; d.z = z; d.yaw = yaw;
  }
}

export function initPeople() {
  placePeople();
  const rig = npcMesh.rig;
  for (const d of PEOPLE) {
    const k = npcs.length, n = { person: d, mode: 'npc', x: d.x, z: d.z, y: H(d.x, d.z), yaw: d.yaw, yaw0: d.yaw, roll: 0, show: d.hidden ? 'none' : 'ski', h: 0.96 + (hashSeed(d.x, d.z, 3) % 100) / 1000, gth: 1, swing: (hashSeed(d.x, d.z, 5) % 628) / 100, noSkis: !d.skis, wave: 0 };
    d.n = n; n.fem = FEMALE_PEOPLE.has(d.id); npcs.push(n);
    if (rig) {
      const jacket = new THREE.Color(d.jacket), pants = new THREE.Color(d.skis ? '#232a3c' : '#3b3f46'), white = new THREE.Color(1, 1, 1), sl = k >> 1, B = k % 2 ? 'b' : 'a';
      rig['torso_' + B].setColorAt(sl, jacket); rig['head_' + B].setColorAt(sl, white); rig.pelvis.setColorAt(k, pants);
      for (const sd of [0, 1]) { rig.upperarm.setColorAt(k * 2 + sd, jacket); rig.forearm.setColorAt(k * 2 + sd, jacket); rig.thigh.setColorAt(k * 2 + sd, pants); rig.shin.setColorAt(k * 2 + sd, pants); rig.ski.setColorAt(k * 2 + sd, new THREE.Color('#e8e8ea')); rig.pole.setColorAt(k * 2 + sd, white); rig.boot.setColorAt(k * 2 + sd, white); }
    }
    // marker above the head: ! (mission to take), ? (expected here)
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex('!'), depthWrite: false, transparent: true }));
    sp.scale.set(0.9, 0.9, 0.9); sp.visible = false; sp.layers.set(SMALL_LAYER); scene.add(sp); d.mark = sp; d.markKind = '';
  }
  if (rig) initTerraceFolk(rig);
  if (rig) for (const k in rig) if (rig[k].instanceColor) rig[k].instanceColor.needsUpdate = true;
  restoreMission();
}

export function propGeometry(kind) {
  const P = [], cyl = (rt, rb, h, y, c, seg = 10, open = false) => { const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open); g.translate(0, y, 0); P.push({ g, c }); };
  if (kind === 'mug') { cyl(0.038, 0.034, 0.095, 0.02, '#f2efe8'); cyl(0.036, 0.036, 0.01, 0.065, '#6d1520'); const hd = new THREE.TorusGeometry(0.026, 0.007, 5, 8, Math.PI); hd.rotateZ(-Math.PI / 2); hd.translate(0.038, 0.02, 0); P.push({ g: hd, c: '#f2efe8' }); }
  else if (kind === 'beer') { cyl(0.036, 0.03, 0.15, 0.03, '#d99a2b'); cyl(0.037, 0.037, 0.025, 0.115, '#fbf6ea'); }
  else if (kind === 'wine') { cyl(0.034, 0.02, 0.07, 0.07, '#5d0f1c'); cyl(0.005, 0.005, 0.07, 0.0, '#d8e0e6', 5); cyl(0.03, 0.03, 0.006, -0.035, '#d8e0e6'); }
  else { cyl(0.07, 0.045, 0.085, 0.0, '#c8321f', 8); cyl(0.071, 0.071, 0.012, 0.03, '#efe9de', 8);
    for (let k = 0; k < 14; k++) { const g = new THREE.BoxGeometry(0.011, 0.07, 0.011); g.rotateZ((k % 5 - 2) * 0.12); g.rotateX((k % 3 - 1) * 0.15); g.translate(Math.cos(k * 2.4) * 0.035, 0.07, Math.sin(k * 2.4) * 0.035); P.push({ g, c: k % 4 ? '#f0c24a' : '#e0a83a' }); } }
  return mergeParts(P);
}

export function initTerraceFolk(rig) {
  if (!TERRACE_FOLK.length) return;
  npcMesh.props = {};
  for (const kind of PROP_KINDS) { const m = new THREE.InstancedMesh(propGeometry(kind), lambertVC(), TERRACE_FOLK.length); m.frustumCulled = false; m.layers.set(SMALL_LAYER); for (let i = 0; i < TERRACE_FOLK.length; i++) m.setMatrixAt(i, ZERO_M); scene.add(m); npcMesh.props[kind] = m; }
  TERRACE_FOLK.forEach((f, i) => {
    const k = npcs.length, n = { mode: 'terrace', tf: f, ti: i, x: f.x, z: f.z, y: f.y, yaw: f.yaw, roll: 0, show: 'stand', h: 0.92 + (hashSeed(f.x, f.z, 7) % 160) / 1000, gth: 0.95 + (hashSeed(f.x, f.z, 9) % 100) / 1000, swing: f.swing, noSkis: true, fem: f.fem, gear: f.gear, jacket: f.jacket };
    npcs.push(n);
    const jacket = new THREE.Color(f.jacket), pants = new THREE.Color(PANTS_C[k % PANTS_C.length]), white = new THREE.Color(1, 1, 1), sl = k >> 1, B = k % 2 ? 'b' : 'a';
    rig['torso_' + B].setColorAt(sl, jacket); rig['head_' + B].setColorAt(sl, white); rig.pelvis.setColorAt(k, pants);
    for (const sd of [0, 1]) { rig.upperarm.setColorAt(k * 2 + sd, jacket); rig.forearm.setColorAt(k * 2 + sd, jacket); rig.thigh.setColorAt(k * 2 + sd, pants); rig.shin.setColorAt(k * 2 + sd, pants); rig.boot.setColorAt(k * 2 + sd, new THREE.Color('#2a2d33')); }
  });
}

export function markerTex(kind) {
  if (markerTexCache[kind]) return markerTexCache[kind];
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const col = kind === '?' ? '#5fd0ff' : kind === '·' ? '#9aa6b4' : '#ffc94d';
  g.fillStyle = 'rgba(8,14,24,.82)'; g.beginPath(); g.arc(64, 58, 44, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(48, 96); g.lineTo(80, 96); g.lineTo(64, 122); g.fill();
  g.lineWidth = 7; g.strokeStyle = col; g.beginPath(); g.arc(64, 58, 40, 0, Math.PI * 2); g.stroke();
  g.fillStyle = col; g.font = '800 64px "Bahnschrift SemiCondensed", "Roboto Condensed", "Arial Narrow", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(kind === '·' ? '…' : kind, 64, 62);
  return markerTexCache[kind] = colorCanvasTex(c);
}

export function peopleUpdate(n, dt, time) {
  const d = n.person, dx = P.pos.x - n.x, dz = P.pos.z - n.z, dist = Math.hypot(dx, dz);
  if (n.follow && P.state !== 'lift') {   // the lost skier skis behind the player
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw), tx = P.pos.x - fx * 5 + fz * 2.5, tz = P.pos.z - fz * 5 - fx * 2.5, k = Math.min(1, dt * 2.5);
    n.x += (tx - n.x) * k; n.z += (tz - n.z) * k;
  }
  n.y = H(n.x, n.z);
  const face = dist < 14 ? Math.atan2(dx, dz) : n.follow ? P.yaw : n.yaw0;
  n.yaw += wrapPi(face - n.yaw) * Math.min(1, dt * 3);
  n.wave = Math.max(0, n.wave - dt);
  if (dist < 16 && dist > 5 && !n.waved && d.markKind) { n.wave = 1.6; n.waved = true; } else if (dist > 30) n.waved = false;
  n.show = d.hidden ? 'none' : 'ski';
}

export function nearPerson(r = 5.5) {
  if (P.state !== 'ski' || P.vel.length() > 7) return null;
  let best = null, bd = r;
  for (const d of PEOPLE) { if (d.hidden || !d.n) continue; const dd = Math.hypot(d.n.x - P.pos.x, d.n.z - P.pos.z); if (dd < bd) { bd = dd; best = d; } }
  return best;
}

export function tryAction() { const d = nearPerson(); if (d) openDialog(d); else tryBoard(); }

export function __init_6559() {

/* ---- people of the resort ---- */
PEOPLE = [
  { id: 'lucie', name: 'Lucie', role: 'Location de skis', shop: 0, near: [63, 1066], jacket: '#c8302a', idle: 'Les skis de location sont fartés tous les soirs. Profites-en !' },
  { id: 'marco', name: 'Marco', role: 'Épicerie · alimentation', shop: 1, near: [-55, 1191], jacket: '#2f8a3c', idle: 'Pain frais, génépi, piles pour la frontale : on a tout.' },
  { id: 'sophie', name: 'Sophie', role: 'Boulangerie', shop: 7, near: [99, 1021], jacket: '#e7cf9e', idle: 'Le pain aux noix sort du four à 7 h. Après 8 h, il n\'y en a plus.' },
  { id: 'paul', name: 'Paul', role: 'Boucherie-charcuterie', shop: 4, near: [159, 1044], jacket: '#8a2a24', idle: 'Diots, saucisses, jambon cru : tout vient des fermes de la vallée.' },
  { id: 'yanis', name: 'Yanis', role: 'Magasin de sport', shop: 2, near: [-55, 178], jacket: '#1d3f8a', idle: 'Un masque photochromique, et le jour blanc n\'est plus un problème.' },
  { id: 'henri', name: 'Henri', role: 'Chef · Le Caquelon', shop: 3, near: [-26, 216], jacket: '#f4f0e8', idle: 'Trois fromages dans ma fondue, et le secret, c\'est la noix de muscade.' },
  { id: 'jeanne', name: 'Jeanne', role: 'Fromagerie', shop: 5, near: [-11, 235], jacket: '#6b4a24', idle: 'Le beaufort d\'été, c\'est le meilleur. L\'herbe d\'alpage, ça se goûte.' },
  { id: 'mireille', name: 'Mireille', role: 'Souvenirs · cartes postales', shop: 6, near: [-73, 257], jacket: '#2a6a9a', idle: 'Une cloche, un magnet, un chamois en peluche ? Il y en a pour tous les goûts.' },
  { id: 'rene', name: 'René', role: 'Conducteur · Télésiège du Sommet', lift: 'Télésiège du Sommet', jacket: '#ff6a14', idle: 'Vent faible au sommet, on tourne à pleine vitesse aujourd\'hui.' },
  { id: 'bastien', name: 'Bastien', role: 'Moniteur de ski', piste: ['Les Sapins', 5, 1], jacket: '#d8342c', skis: true, idle: 'Le poids sur le ski extérieur, et les mains toujours devant !' },
  { id: 'elodie', name: 'Élodie', role: 'Pisteuse-secouriste', liftTop: 'Télésiège du Sommet', jacket: '#e03a2a', skis: true, idle: 'Risque d\'avalanche 2 sur 5. Reste prudent hors des pistes.' },
  { id: 'chloe', name: 'Chloé', role: 'Photographe de la station', piste: ['Snowpark', 46, -1, 8], jacket: '#f2b51d', skis: true, idle: 'La lumière est parfaite en fin de journée sur le park.' },
  // only during their mission
  { id: 'nadia', name: 'Nadia', role: 'Cliente de la location de skis', liftTop: 'Télécabine du Village', off: [7, 4], jacket: '#8e44ad', hidden: true, idle: 'Il fait froid à attendre sans skis !' },
  { id: 'joseph', name: 'Joseph', role: 'Berger · alpage du Plan', piste: ['Liaison Snowpark', 4, 1, 24], jacket: '#5a4632', hidden: true, idle: 'Les vaches sont redescendues en octobre, mais la cave reste ici.' },
  { id: 'thomas', name: 'Thomas', role: 'Skieur égaré', lost: true, jacket: '#19a7b8', skis: true, hidden: true, idle: 'Je ne sais plus du tout où je suis…' },
];
SHOP_ANCHORS = [];
   // world points in front of the shop each shopkeeper works in: the nearest shopfront takes that shop
CUR_BLD = null;
bldToWorld = (b, lx, lz) => [b.x + lx * Math.cos(b.rot) + lz * Math.sin(b.rot), b.z - lx * Math.sin(b.rot) + lz * Math.cos(b.rot)];
FEMALE_PEOPLE = new Set(['lucie', 'sophie', 'jeanne', 'mireille', 'elodie', 'chloe', 'nadia']);
// drinks and chips held by the people on the terraces: one small instanced mesh per kind, placed at the hand
PROP_KINDS = ['mug', 'beer', 'wine', 'fries'];
markerTexCache = {};
person = id => PEOPLE.find(p => p.id === id);
}
