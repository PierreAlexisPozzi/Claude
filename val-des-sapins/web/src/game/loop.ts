// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « loop ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { STORE } from '../storage/store';
import { AX_Y, updateSkier } from './animation';
import { NEAR, updateNear } from './assembly';
import { musicBeat, sfx } from './audio';
import { __set_camSnap, camSnap, cameraFeel, dust, photoCam, updateCamera } from './camera';
import { updatePlumes } from './cannons';
import { $, IS_TOUCH, Q, QUALITY, V3, __set_qName, fmt, qName } from './core';
import { updateFauna } from './fauna';
import { showTrick, updateHud } from './hud';
import { skier } from './humans';
import { __set_running, helpTouched, running, toggleHelp } from './input';
import { dlgOpen, jnlOpen } from './journal';
import { liftClock, updateLiftAnim } from './lifts';
import { mapOpen } from './maps';
import { terrainMesh } from './materials';
import { updatePeopleFx } from './missions';
import { updateNPCs } from './npcs';
import { updateSpray } from './particles';
import { PEOPLE } from './people';
import { P, STEP, stepSim } from './player';
import { updateNearShadows } from './batch';
import { camera, canvas, configureAO, post, renderer, sky, sun, sunFar, updateSun, updateSunFar } from './render';
import { ALT0, H } from './terrain';
import { placeUtil, touchFrame } from './touch';
import { updateTrails } from './trails';
import { updateTunnelFx } from './tunnels';
import { placeSledMesh } from './vehicles';

export let acc, clock, introT, timer, perf, cycleQuality;

export function __set_clock(v) { return (clock = v); }

   // delta time; pauses cleanly when the tab is hidden
export function frame(now) {
  requestAnimationFrame(frame);
  timer.update(now); const dt = Math.min(0.1, timer.getDelta()); clock += dt;
  if (running && !mapOpen && !dlgOpen && !jnlOpen) {
    acc += dt; let n = 0;
    if (IS_TOUCH) touchFrame();
    while (acc >= STEP && n < 12) { stepSim(STEP); acc -= STEP; n++; }
    if (n === 12) acc = 0;
  }
  liftClock(dt); updateLiftAnim(clock); updateNPCs(dt, clock); if (PEOPLE[0].n) updatePeopleFx(clock); placeSledMesh(dt); updateNear(camera.position, dt); updateFauna(dt, clock, camera.position); updateTrails(dt, clock);
  updateSkier(dt, clock);
  updateSpray(dt); updatePlumes(dt, camera.position); updateTunnelFx(clock, musicBeat());
  if (running) { updateCamera(dt, camSnap); __set_camSnap(false); cameraFeel(dt); }
  else {
    introT += dt;
    // start screen: a slow turntable around the skier, framed on the right of the panel
    const a = 2.6 + introT * 0.22, c = new V3(P.pos.x, P.pos.y + 1.05, P.pos.z), wide = window.innerWidth > 760;
    camera.position.set(c.x + Math.sin(a) * 3.4, c.y + 0.25, c.z + Math.cos(a) * 3.4);
    const gh = H(camera.position.x, camera.position.z) + 0.6; if (camera.position.y < gh) camera.position.y = gh;
    const fw = c.clone().sub(camera.position).normalize(), rt = fw.clone().cross(AX_Y).normalize();
    camera.lookAt(c.x - rt.x * (wide ? 1.15 : 0), c.y - 0.15, c.z - rt.z * (wide ? 1.15 : 0));
  }
  if (photoCam && photoCam.at) { camera.position.copy(photoCam.from); camera.lookAt(photoCam.at); }
  else if (photoCam) {   // debug: close 3/4 view of the skier
    const c = skier.root.position, a = P.yaw + photoCam.a;
    camera.position.set(c.x + Math.sin(a) * photoCam.d, c.y + photoCam.h, c.z + Math.cos(a) * photoCam.d); camera.position.y = Math.max(camera.position.y, H(camera.position.x, camera.position.z) + 2); camera.lookAt(c.x, c.y - 0.1 + (photoCam.ly || 0), c.z);
  }
  sky.position.copy(camera.position);
  updateSun(P.pos); updateSunFar(camera.position); updateNearShadows(P.pos);
  dust.update(clock);
  post.film.uniforms.uTime.value = clock;
  post.composer.render(dt);
  if (running) { updateHud(dt); sfx.update(); autoQuality(dt); }
}

export function autoQuality(dt) {
  perf.t += dt; perf.n++;
  if (perf.t < 4) return;
  const ms = perf.t / perf.n * 1000; perf.t = 0; perf.n = 0;
  if (ms < 36 || perf.stage >= 4) return;
  if (post.ao.enabled) { post.ao.enabled = false; perf.noAO = true; return; }   // ambient occlusion goes first
  if (sunFar.visible && perf.farCut && !perf.farOff) { perf.farOff = true; sunFar.visible = false; return; }        // then without the far cascade
  if (sunFar.visible && sunFar.shadow.mapSize.x > 1024) { perf.farCut = true; sunFar.shadow.mapSize.set(1024, 1024); if (sunFar.shadow.map) { sunFar.shadow.map.dispose(); sunFar.shadow.map = null; } return; }   // then the far shadow resolution
  perf.stage++;
  if (perf.stage === 1) { NEAR.treeR *= 0.5; NEAR.buildR *= 0.6; }          // fewer assembled trees and buildings first
  else if (perf.stage === 2) { Q.pr = Math.min(1, Q.pr); renderer.setPixelRatio(Q.pr); post.composer.setPixelRatio(Q.pr); }
  else if (perf.stage === 3) { sun.shadow.mapSize.set(1024, 1024); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  else if (terrainMesh) terrainMesh.castShadow = false;   // the baked sun shading still darkens slopes in the shade
  resize();
}

export function resize() { const w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); post.composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }

export function applyQuality(name) {
  const T = QUALITY[name]; if (!T) return; __set_qName(name);
  try { STORE.setItem('valdessapins.quality', name); } catch (e) { /* storage blocked: the choice lasts this session */ }
  Q.pr = Math.min(window.devicePixelRatio || 1, T.pr, perf.stage >= 2 ? 1 : 9);
  renderer.setPixelRatio(Q.pr); post.composer.setPixelRatio(Q.pr);
  const fs = perf.farCut ? Math.min(1024, T.farShadow) : T.farShadow;
  sunFar.visible = fs > 0 && !perf.farOff;
  if (fs > 0 && sunFar.shadow.mapSize.x !== fs) { sunFar.shadow.mapSize.set(fs, fs); if (sunFar.shadow.map) { sunFar.shadow.map.dispose(); sunFar.shadow.map = null; } }
  const sh = perf.stage >= 3 ? Math.min(1024, T.shadow) : T.shadow;
  if (sun.shadow.mapSize.x !== sh) { sun.shadow.mapSize.set(sh, sh); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  for (const r of [post.composer.renderTarget1, post.composer.renderTarget2]) if (r.samples !== T.msaa) { r.samples = T.msaa; r.dispose(); }
  post.ao.enabled = !!T.ao && !perf.noAO; post.bloom.enabled = T.bloom; post.fxaa.enabled = T.fxaa;
  configureAO(post.n8, T);
  // T4 : Ultra assemble les arbres et les bâtiments détaillés plus loin (rayons × T.near)
  if (!NEAR.base) NEAR.base = { tree: NEAR.treeR, build: NEAR.buildR };
  NEAR.treeR = NEAR.base.tree * (T.near || 1) * (perf.stage >= 1 ? 0.5 : 1); NEAR.buildR = NEAR.base.build * (T.near || 1) * (perf.stage >= 1 ? 0.6 : 1);
  resize(); qualityUI();
}

export function qualityUI() {
  $('qualBtn').textContent = 'Image : ' + QUALITY[qName].label;
  document.querySelectorAll('.qual [data-q]').forEach(b => b.setAttribute('aria-checked', b.dataset.q === qName ? 'true' : 'false'));
}


export function startGame() {
  if (running) return;
  __set_running(true); $('start').hidden = true; $('hud').hidden = false;
  if (IS_TOUCH) { $('touch').hidden = false; $('help').hidden = true; requestAnimationFrame(placeUtil); }
  if (window.innerWidth < 760) $('help').hidden = true;
  if (window.innerHeight < 700) toggleHelp(false);
  setTimeout(() => { if (!helpTouched) toggleHelp(false); }, 15000);
  sfx.init();
  canvas.focus(); window.focus && window.focus();
  updateCamera(0, true);
  showTrick('Sommet · ' + fmt(P.pos.y + ALT0) + ' m', 'Choisissez votre piste ou partez hors-piste');
}

export function __init_7311() {

/* ---------------- Main loop ---------------- */
acc = 0;
clock = 0;
introT = 0;
timer = new THREE.Timer();
 timer.connect(document);
// steps quality down if frames are slow on this device: resolution first, then shadow detail
perf = { t: 0, n: 0, stage: 0 };
cycleQuality = () => { const k = Object.keys(QUALITY); applyQuality(k[(k.indexOf(qName) + 1) % k.length]); };
document.querySelectorAll('.qual [data-q]').forEach(b => { b.onclick = () => applyQuality(b.dataset.q); });
qualityUI();
window.addEventListener('resize', resize);
$('go').addEventListener('click', startGame);
}
