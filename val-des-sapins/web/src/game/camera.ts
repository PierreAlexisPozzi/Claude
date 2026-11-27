// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « camera ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { IS_TOUCH, REDUCED_MOTION, V3, clamp, smoothstep } from './core';
import { _q } from './lifts';
import { SN, tunnelLocal } from './pistes';
import { P, _t } from './player';
import { SUN_DIR, camera, renderer, scene } from './render';
import { H, mulberry32 } from './terrain';

export let photoCam, camMode, camSnap, camDir, camPos, camLook, _cd, feel, dust;

export function __set_photoCam(v) { return (photoCam = v); }
export function __set_camMode(v) { return (camMode = v); }
export function __set_camSnap(v) { return (camSnap = v); }


/* ---------------- Camera ---------------- */
export function clampCamera(c) {
  if (P.tunnel) {
    const T = P.tunnel, tl = tunnelLocal(T, c.x, c.z, 2);
    if (tl && tl.s > -8 && tl.s < T.len + 8) {
      const lim = T.hw - 0.8; if (Math.abs(tl.w) > lim) { const dw = Math.sign(tl.w) * lim - tl.w; c.x += tl.px * dw; c.z += tl.pz * dw; }
      c.y = clamp(c.y, tl.y + 0.9, tl.y + T.ceil - 0.7); return;
    }
  }
  const gh = H(c.x, c.z) + 1.1; if (c.y < gh) c.y = gh;
}

export function updateCamera(dt, snap) {
  const target = _t.copy(P.pos);
  if (P.state === 'lift') {
    const L = P.lift; _cd.copy(L.dir);
    if (L.type !== 'tbar') target.y -= 2;
  } else if (P.state === 'sled') {
    _cd.set(Math.sin(P.yaw), 0, Math.cos(P.yaw));
  } else {
    const vh = Math.hypot(P.vel.x, P.vel.z);
    if (vh > 1.5 && P.state !== 'crash') _cd.set(P.vel.x / vh, 0, P.vel.z / vh); else if (P.state !== 'crash') _cd.set(Math.sin(P.yaw), 0, Math.cos(P.yaw)); else _cd.copy(camDir);
  }
  const k = snap ? 1 : 1 - Math.exp(-dt * (P.state === 'air' ? 1.6 : 3.2));
  camDir.lerp(_cd, k).normalize();
  if (camMode === 2 && P.state !== 'crash') {
    camPos.copy(target).y += P.state === 'lift' && P.lift.type !== 'tbar' ? -0.4 : 1.55;
    camPos.addScaledVector(camDir, 0.25);
    camLook.copy(camPos).addScaledVector(camDir, 10); camLook.y -= 2.2;
    camera.position.copy(camPos); camera.lookAt(camLook); return;
  }
  // T6 : sur écran tactile (petit écran), 35 % de recul et de hauteur en plus pour mieux voir le terrain autour du skieur
  const far = IS_TOUCH && camMode !== 1 ? 1.35 : 1;
  const dist = (camMode === 1 ? 15 : P.state === 'lift' ? 10 : P.state === 'sled' ? 7.5 : 6.6) * far, hgt = (camMode === 1 ? 6.5 : P.state === 'lift' ? 3.5 : P.state === 'sled' ? 3 : 2.5) * far;
  _q.copy(target).addScaledVector(camDir, -dist); _q.y += hgt;
  if (P.state === 'lift') _q.addScaledVector(P.lift.side, P.lift.type === 'tbar' ? 4 : 3);   // look past the hanger
  const kp = snap ? 1 : 1 - Math.exp(-dt * 7);
  camPos.lerp(_q, kp);
  clampCamera(camPos);
  camLook.copy(target).addScaledVector(camDir, 4); camLook.y += 1.0;
  camera.position.copy(camPos); camera.lookAt(camLook);
}

export function cameraFeel(dt) {
  const sp = P.vel.length(); feel.t += dt;
  const target = 62 + (REDUCED_MOTION ? 3 : 11) * smoothstep(9, 30, sp) * (P.state === 'lift' ? 0 : 1);
  feel.fov += (target - feel.fov) * (1 - Math.exp(-dt * 2.2));
  if (Math.abs(camera.fov - feel.fov) > 0.02) { camera.fov = feel.fov; camera.updateProjectionMatrix(); }
  if (P.state === 'air') { feel.wasAir = true; feel.airVy = Math.min(feel.airVy, P.vel.y); }
  else if (feel.wasAir) { feel.trauma += clamp((-feel.airVy - 3) / 14, 0, 0.65); feel.wasAir = false; feel.airVy = 0; }
  if (P.state === 'crash' && feel.last !== 'crash') feel.trauma += 0.7;
  feel.last = P.state;
  const bumpy = P.state === 'ski' && (P.snow === SN.BOSSES || P.snow === SN.TRAFOLLE || P.snow === SN.GLACEE);
  const floor = P.state === 'ski' ? (bumpy ? 0.26 : 0.07) * smoothstep(12, 30, sp) : P.state === 'sled' ? 0.08 * smoothstep(6, 18, sp) : 0;
  feel.trauma = Math.max(floor, feel.trauma - dt * 1.3);
  if (REDUCED_MOTION || feel.trauma < 0.005 || camMode === 2) return;
  const k = feel.trauma * feel.trauma, t = feel.t;
  const nx = Math.sin(t * 37.1) * 0.6 + Math.sin(t * 61.7 + 1.3) * 0.4, ny = Math.sin(t * 43.3 + 2.1) * 0.6 + Math.sin(t * 71.9) * 0.4, nr = Math.sin(t * 29.3 + 0.7);
  camera.translateX(nx * 0.16 * k); camera.translateY(ny * 0.12 * k); camera.rotateZ(nr * 0.022 * k);
}

export function __init_5896() {
photoCam = null;
camMode = 0;
camSnap = false;
 // 0 chase, 1 far, 2 first person
camDir = new V3(0, 0, 1);
camPos = new V3();
camLook = new V3();
_cd = new V3();

/* ---------------- Camera feel: speed FOV and screen shake ----------------
   The field of view opens with speed; landings, crashes and rough snow at speed add "trauma" that decays smoothly
   and shakes the camera with layered sines (no random jumps). Both are reduced with prefers-reduced-motion. */
feel = { fov: 62, trauma: 0, airVy: 0, wasAir: false, last: 'ski', t: 0 };

/* ---------------- Diamond dust ----------------
   Ice crystals drifting in the cold air around the camera: additive points that glitter when you look towards the
   sun (forward scattering) and fade in the tunnels. They float slowly and wrap around the camera. */
dust = (() => {
  const N = IS_TOUCH ? 400 : 1100, R = 24, pos = new Float32Array(N * 3), seed = new Float32Array(N), r = mulberry32(4242);
  for (let i = 0; i < N; i++) { pos[i * 3] = (r() * 2 - 1) * R; pos[i * 3 + 1] = (r() * 2 - 1) * R; pos[i * 3 + 2] = (r() * 2 - 1) * R; seed[i] = r(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const u = { uTime: { value: 0 }, uCam: { value: new V3() }, uSun: { value: SUN_DIR }, uR: { value: R }, uPx: { value: 1 }, uOn: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: u,
    vertexShader: `attribute float aSeed; uniform float uTime; uniform vec3 uCam; uniform vec3 uSun; uniform float uR; uniform float uPx; varying float vA;
      void main() {
        vec3 p = position + vec3(sin(uTime * 0.13 + aSeed * 40.0) * 1.6 + uTime * 0.3, -uTime * (0.1 + aSeed * 0.16) + sin(uTime * 0.7 + aSeed * 9.0) * 0.35, cos(uTime * 0.11 + aSeed * 31.0) * 1.6);
        p = uCam + mod(p - uCam + uR, 2.0 * uR) - uR;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float fw = pow(max(dot(normalize(p - cameraPosition), uSun), 0.0), 5.0);
        float tw = pow(0.5 + 0.5 * sin(uTime * (2.0 + aSeed * 6.0) + aSeed * 60.0), 3.0);
        vA = (0.08 + 3.2 * fw) * tw * smoothstep(uR, uR * 0.45, length(p - uCam)) * smoothstep(0.6, 2.0, -mv.z);
        gl_PointSize = uPx * (0.5 + aSeed) * 16.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform float uOn; varying float vA;
      void main() { vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.05, length(d)); a += max(0.0, 1.0 - abs(d.x) * 14.0) * max(0.0, 1.0 - abs(d.y) * 2.2) * 0.5 + max(0.0, 1.0 - abs(d.y) * 14.0) * max(0.0, 1.0 - abs(d.x) * 2.2) * 0.5;
        gl_FragColor = vec4(vec3(1.0, 0.97, 0.92) * vA * a * uOn, 1.0); }`
  });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = 2; scene.add(pts);
  return { update(time) { u.uTime.value = time; u.uCam.value.copy(camera.position); u.uPx.value = renderer.getPixelRatio() * window.innerHeight / 800; u.uOn.value += ((P.tunnel ? 0 : 1) - u.uOn.value) * 0.08; } };
})();
}
