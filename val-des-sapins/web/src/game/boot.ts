// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « boot ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { plant, pose, updateSkier } from './animation';
import { BUILDINGS, FURN, NEAR, assembleBuilding, buildFurniture, firPrototype, initNearRocks, initNearTrees, rocks, updateFurniture, updateNearBuildings, updateNearRocks, updateNearTrees } from './assembly';
import { buildVillages, villageLabels } from './buildings';
import { __set_camSnap, __set_photoCam, camSnap, photoCam, updateCamera } from './camera';
import { buildCannonMeshes, cannons, genCannons, initPlumes } from './cannons';
import { GHOSTS, SLALOM, buildChronoGates, buildSlalom, chrono } from './chronos';
import { $, IS_TOUCH, V3, clamp } from './core';
import { fauna, initFauna, updateFauna } from './fauna';
import { buildMarkers } from './furniture';
import { fillFacts, refreshTracker, stackHud, updateLevelChip } from './hud';
import { __set_faceHold, buildSkier, faceHold, initPlayerHuman, playerHuman, skier } from './humans';
import { dlgActs, openDialog, toggleJournal } from './journal';
import { buildLiftMeshes, buildTowers, layoutLift } from './lifts';
import { __set_clock, applyQuality, clock, frame, startGame } from './loop';
import { buildMapImage, fillMapLists } from './maps';
import { __set_terrainMat, anyH, buildTerrainMesh, buildTextures, initFarGrid, makeTerrainMaterial, terrainMat } from './materials';
import { MISSIONS, missionStep, missionTargets, updateMarkers } from './missions';
import { FREE_LINES, humanPool, initNPCs, npcMesh, npcs, updateNPCs } from './npcs';
import { buildPark } from './park';
import { PEOPLE, person } from './people';
import { LIFTS, PIPE, PISTES, SN, SNOW, SPAWN_LIFT, ZN, ZR, clearGrid, kickers, mogulWeight, patches, pipeLocal, pisteHeading, rails, rasterSeg, snowAt, tunnelLocal, tunnels, zoneAt, zoneGrid } from './pistes';
import { FORCE, P, STEP, _n, groundY, input, jumpHold, queued, steerIn, stepSim, stick, teleportLiftTop } from './player';
import { DEFIS, LINE, RIDER, STATS0, chronoPistes, medalTimes, riderEvent, riderLevel, saveRider, trackT } from './progression';
import { camera, post, renderer, scene, sunFar } from './render';
import { ALT0, H, buildMogulMeshes, buildPipeMesh, carvePortals, drainPistes, flattenPad, genMoguls, genPistes, genSnowGrid, genTerrain, gradeLinks, groomAreas, groomW, normalAt, obstacles, shapePipe, shapeSummit, trees } from './terrain';
import { touchFrame } from './touch';
import { TRAIL_MAT, trailsMe, trailsOthers, updateTrails } from './trails';
import { buildBackdrop, buildTunnels, farHeight } from './tunnels';
import { placeRocks, placeTrees } from './vegetation';
import { buildSled, sled } from './vehicles';
import { BLEND, PLAGNE, loadBlenderAssets, loadWorldData } from './world-data';
import { BATCH, batchScene, POOLS } from './batch-scene';

export let steps;


export function boot(i) {
  if (i >= steps.length) {
    const L = SPAWN_LIFT(); P.pos.set(L.exit[0], 0, L.exit[1]); P.pos.y = H(P.pos.x, P.pos.z); P.yaw = L.exitYaw;
    $('loadmsg').textContent = IS_TOUCH ? 'Touchez « Chausser les skis » pour commencer.' : 'Entrée ou clic pour commencer.';
    $('go').disabled = false;
    window.__ski.ready = true;
    return;
  }
  $('loadmsg').textContent = steps[i][0];
  setTimeout(() => { steps[i][1](); boot(i + 1); }, 16);
}

export function __init_7403() {

/* ---------------- Boot ---------------- */
steps = [
  ['Sculpture du relief…', () => { genTerrain(); }],
  ['Damage des pistes…', () => { shapeSummit(); genPistes(); groomAreas(); carvePortals(); LIFTS.forEach(L => { const b0 = new V3(L.b[0], 0, L.b[1]), t0 = new V3(L.t[0], 0, L.t[1]), d = t0.clone().sub(b0).normalize(); flattenPad(b0.x - d.x * 3, b0.z - d.z * 3, 9, 20); flattenPad(t0.x + d.x * 4, t0.z + d.z * 4, 9, 20); }); /* pipe first: drainage then smooths its run-out into the exit */ shapePipe(); drainPistes(); gradeLinks(); genMoguls(); }],
  ['Installation des remontées…', () => {
    LIFTS.forEach(L => { layoutLift(L); rasterSeg(ZR, ZN - 1, L.B.x, L.B.z, L.T.x, L.T.z, L.off + 7, (ix, iz) => { clearGrid[iz * ZN + ix] = 1; }); rasterSeg(ZR, ZN - 1, L.B.x, L.B.z, L.B.x, L.B.z, 26, (ix, iz) => { clearGrid[iz * ZN + ix] = 1; }); rasterSeg(ZR, ZN - 1, L.T.x, L.T.z, L.T.x, L.T.z, 26, (ix, iz) => { clearGrid[iz * ZN + ix] = 1; }); });
    if (!PLAGNE) rasterSeg(ZR, ZN - 1, -232, 128, -232, 128, 22, (ix, iz) => { clearGrid[iz * ZN + ix] = 1; });
    buildPark(); buildSlalom();
    LIFTS.forEach(L => {
      // exit heading: follow the nearest piste downhill from the exit point
      let best = null, bd = 80;
      PISTES.forEach(p => { if (p.hidden) return; p.samples.forEach((s, i) => { const d = Math.hypot(s.x - L.exit[0], s.z - L.exit[1]); if (d < bd && i < p.samples.length - 3) { bd = d; best = [p, i]; } }); });
      if (best) { const [p, i] = best, a = p.samples[i], b = p.samples[Math.min(p.samples.length - 1, i + 3)]; L.exitYaw = Math.atan2(b.x - a.x, b.z - a.z); }
      else { normalAt(L.exit[0], L.exit[1], _n); L.exitYaw = Math.atan2(_n.x, _n.z); }
    });
    genCannons(); genSnowGrid();
  }],
  ['Textures de neige…', () => { buildTextures(); initFarGrid(); __set_terrainMat(makeTerrainMaterial()); buildSkier(); initPlayerHuman(); }],
  ['Construction des villages…', () => { buildVillages(); buildCannonMeshes(); initPlumes(); }],
  ['Plantation des sapins…', () => { placeTrees(); placeRocks(); }],
  ['Calcul de l\'ensoleillement…', () => { buildTerrainMesh(); buildMogulMeshes(); buildPipeMesh(); buildChronoGates(); buildTunnels(); buildBackdrop(); }],
  ['Balisage…', () => { LIFTS.forEach(buildLiftMeshes); buildTowers(); buildMarkers(); buildMapImage(); fillMapLists(); initNPCs(); buildSled(); initNearTrees(); initNearRocks(); buildFurniture(); initFauna(); fillFacts(); batchScene(); }],
];
window.__ski = {
  P, H, input, queued, camera, skier, LIFTS, PISTES, kickers, rails, trees, zoneAt, normalAt, stepSim, STEP, ALT0, startGame, sled, stick, steerIn, touchFrame, get jumpHold() { return jumpHold; },
  step(n) { for (let i = 0; i < n; i++) stepSim(STEP); },
  teleport(x, z, yaw) { P.tunnel = null; P.pos.set(x, H(x, z), z); P.vel.set(0, 0, 0); P.yaw = yaw ?? 0; P.state = 'ski'; P.air = null; P.lift = null; P.rail = null; __set_camSnap(true); },
  teleportTunnel(i, s, yaw) { const T = tunnels[i], k = clamp(T.i0 + Math.round(s / 4), 0, T.S.length - 1), q = T.S[k]; P.tunnel = T; P.pos.set(q.x, T.hs[k], q.z); P.vel.set(0, 0, 0); P.yaw = yaw ?? pisteHeading(T.piste, k); P.state = 'ski'; P.air = null; P.lift = null; P.rail = null; __set_camSnap(true); },
  tunnels, patches, SNOW, SN, FORCE, snowAt, mogulWeight, groundY, villageLabels, cannons, npcs, sled,
  advance(dt) { __set_clock(clock + (dt)); updateNPCs(dt, clock); },
  skierTick(dt) { __set_clock(clock + (dt)); updateSkier(dt, clock); },
  get npcMesh() { return npcMesh; },
  NEAR, BUILDINGS, obstacleList: obstacles, THREE, firPrototype, assembleBuilding, get playerHuman() { return playerHuman; }, set faceHold(v) { __set_faceHold(v); }, humanPool, renderInfo() { renderer.render(scene, camera); const r = renderer.info.render; return { tris: r.triangles, calls: r.calls, geos: renderer.info.memory.geometries }; },
  camNow() { updateCamera(0, true); },
  nearNow() { NEAR.acc = 1; for (let i = 0; i < 40; i++) { updateNearTrees(camera.position, 99); updateNearRocks(camera.position); updateNearBuildings(camera.position, 1e4); } updateFurniture(camera.position); updateFauna(0.016, clock, camera.position); },
  fauna, FURN, rocks, POOLS, batch: BATCH, farHeight, anyH, groomW, zoneGrid,
  trailTick(dt) { __set_clock(clock + (dt)); updateTrails(dt, clock); }, trailStats() { return { me: trailsMe ? trailsMe.i : 0, others: trailsOthers ? trailsOthers.i : 0 }; },
  tunnelLocal, SLALOM, GHOSTS, LINE, trackT, get pose() { return pose; }, get plant() { return plant; }, get FREE_LINES() { return FREE_LINES; }, get chrono() { return chrono; }, RIDER, MISSIONS, PEOPLE, DEFIS, missionTargets, riderEvent, chronoPistes, medalTimes, missionStep, riderLevel, talk(id) { openDialog(person(id)); }, dlgChoose(i) { dlgActs[i][1](); }, dlgText() { return $('dlgText').textContent; }, journal: toggleJournal, get chrono() { return chrono; }, saveRider, unlockAll() { RIDER.allOpen = true; fillMapLists(); }, resetChallenges() { Object.assign(RIDER, { xp: 0, stats: STATS0(), tiers: {}, runs: {}, missions: {}, active: null, legacyLifts: [] }); saveRider(); fillMapLists(); updateMarkers(); refreshTracker(); updateLevelChip(); }, teleportLiftTop, get obstacles() { return obstacles.length; },
  setVel(x, y, z) { P.vel.set(x, y, z); }, stackHud,
  quality(n) { applyQuality(n); }, post, BLEND, scene, sunFar, trailMat: TRAIL_MAT, PIPE, pipeLocal,
  photo(o) { __set_photoCam(o); $('hud').hidden = !!o; if (o) $('start').hidden = true; },
  clear() { for (const k in input) input[k] = false; },
  ready: false
};
requestAnimationFrame(frame);
Promise.all([loadBlenderAssets(), loadWorldData()]).finally(() => setTimeout(() => boot(0), 30));
}
