/* T7 : mode photo. Touche P (Échap pour sortir), entrée « Photo » du menu « Plus » sur tactile, ou __ski.photoMode().
   - Le jeu est figé : simulation, chronos et minuteries des missions (la pause du plan et du carnet), skieurs, remontées
     et particules (horloge arrêtée).
   - Caméra libre autour du skieur : glisser pour tourner, molette ou pincement pour la distance ; réglages de hauteur,
     de flou d'arrière-plan (profondeur de champ, BokehPass de three.js, hors de la chaîne en dehors du mode), d'heure
     du soleil et de champ.
   - « Enregistrer l'image » télécharge la vue (PNG) ; aucune écriture dans les sauvegardes. En sortant, l'heure et le
     champ reviennent à ceux du jeu. */
import * as THREE from 'three';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { __set_photoCam } from './camera';
import { $ } from './core';
import { setSunTime } from './daylight';
import { SKY } from './sky';
import { skier } from './humans';
import { H } from './terrain';
import { camera, canvas, post, renderer, scene } from './render';

export const PHOTO = { open: false, yaw: 0, pitch: 0.12, dist: 3.4, dy: 0, aperture: 0.45, hour: 12, fov: 50, h0: 12, fov0: 62, touchHidden: true };
let bokeh: BokehPass | null = null;
const from = new THREE.Vector3(), at = new THREE.Vector3();

function ensureBokeh(): BokehPass {
  if (bokeh) return bokeh;
  bokeh = new BokehPass(scene, camera, { focus: 3, aperture: 0.002, maxblur: 0.012 });
  const i = post.composer.passes.indexOf(post.clean);
  post.composer.insertPass(bokeh, i < 0 ? 1 : i);
  bokeh.enabled = false;
  return bokeh;
}

const IDS = ['phDist', 'phPitch', 'phAperture', 'phHour', 'phFov'] as const;
function syncInputs(): void {
  ($('phDist') as HTMLInputElement).value = String(PHOTO.dist);
  ($('phPitch') as HTMLInputElement).value = String(PHOTO.pitch);
  ($('phAperture') as HTMLInputElement).value = String(PHOTO.aperture);
  ($('phHour') as HTMLInputElement).value = String(PHOTO.hour);
  ($('phFov') as HTMLInputElement).value = String(PHOTO.fov);
  $('phHourV').textContent = Math.floor(PHOTO.hour) + ' h ' + String(Math.round((PHOTO.hour % 1) * 60)).padStart(2, '0');
}

export function togglePhoto(on = !PHOTO.open): void {
  if (on === PHOTO.open) return;
  PHOTO.open = on;
  const B = ensureBokeh();
  if (on) {
    PHOTO.yaw = (skier ? skier.root.rotation.y : 0) + Math.PI * 0.8;
    PHOTO.h0 = SKY.hour; PHOTO.hour = SKY.hour; PHOTO.fov0 = camera.fov; PHOTO.fov = Math.round(camera.fov);
    PHOTO.touchHidden = $('touch').hidden;
    B.enabled = true; $('hud').hidden = true; $('touch').hidden = true; $('photo').hidden = false;
    syncInputs();
  } else {
    B.enabled = false; __set_photoCam(null);
    $('hud').hidden = false; $('touch').hidden = PHOTO.touchHidden; $('photo').hidden = true;
    if (SKY.hour !== PHOTO.h0) setSunTime(PHOTO.h0);
    camera.fov = PHOTO.fov0; camera.updateProjectionMatrix();
    canvas.focus();
  }
}

/** Chaque image, mode ouvert : caméra en orbite autour du skieur, mise au point sur lui. */
export function photoFrame(): void {
  if (!PHOTO.open || !skier) return;
  const c = skier.root.position;
  at.set(c.x, c.y + 0.95 + PHOTO.dy, c.z);   // dy : point visé plus bas (planche personnages, corps entier)
  const cp = Math.cos(PHOTO.pitch), sp = Math.sin(PHOTO.pitch);
  from.set(at.x + Math.sin(PHOTO.yaw) * cp * PHOTO.dist, at.y + sp * PHOTO.dist, at.z + Math.cos(PHOTO.yaw) * cp * PHOTO.dist);
  from.y = Math.max(from.y, H(from.x, from.z) + 0.25);
  __set_photoCam({ from: from.clone(), at: at.clone() });
  if (Math.abs(camera.fov - PHOTO.fov) > 0.01) { camera.fov = PHOTO.fov; camera.updateProjectionMatrix(); }
  if (bokeh) {
    const u = (bokeh as unknown as { uniforms: Record<string, { value: number }> }).uniforms;
    u.focus.value = from.distanceTo(at); u.aperture.value = PHOTO.aperture * 0.004; u.maxblur.value = 0.014;
  }
}

function savePhoto(): void {
  photoFrame(); post.composer.render(0);
  renderer.domElement.toBlob((b: Blob | null) => {
    if (!b) return;
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'val-des-sapins-photo.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, 'image/png');
}

export function initPhoto(): void {
  for (const id of IDS) $(id).addEventListener('input', (e: Event) => {
    const v = Number((e.target as HTMLInputElement).value);
    if (id === 'phDist') PHOTO.dist = v; else if (id === 'phPitch') PHOTO.pitch = v; else if (id === 'phAperture') PHOTO.aperture = v;
    else if (id === 'phFov') PHOTO.fov = v; else { PHOTO.hour = v; setSunTime(v); }
    syncInputs();
  });
  $('phSave').onclick = savePhoto;
  $('phClose').onclick = () => togglePhoto(false);
  // glisser : tourner ; deux doigts : distance ; molette : distance
  const pts = new Map<number, { x: number; y: number }>(); let pinch = 0;
  canvas.addEventListener('pointerdown', (e: PointerEvent) => { if (PHOTO.open) { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointerup', (e: PointerEvent) => { pts.delete(e.pointerId); pinch = 0; });
  canvas.addEventListener('pointercancel', (e: PointerEvent) => { pts.delete(e.pointerId); pinch = 0; });
  canvas.addEventListener('pointermove', (e: PointerEvent) => {
    if (!PHOTO.open || !pts.has(e.pointerId)) return;
    const p = pts.get(e.pointerId)!;
    if (pts.size === 1) {
      PHOTO.yaw -= (e.clientX - p.x) * 0.008; PHOTO.pitch = Math.min(1.2, Math.max(-0.15, PHOTO.pitch + (e.clientY - p.y) * 0.006));
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) PHOTO.dist = Math.min(12, Math.max(1.2, PHOTO.dist * pinch / Math.max(1, d)));
      pinch = d;
    }
    p.x = e.clientX; p.y = e.clientY; syncInputs();
  });
  canvas.addEventListener('wheel', (e: WheelEvent) => { if (!PHOTO.open) return; e.preventDefault(); PHOTO.dist = Math.min(12, Math.max(1.2, PHOTO.dist * (e.deltaY > 0 ? 1.1 : 0.9))); syncInputs(); }, { passive: false });
}
