// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « core ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { STORE } from '../storage/store';
import { srgbTex } from './render';

export let $, V3, colorCanvasTex, clamp, lerp, smoothstep, wrapPi, fmt, IS_TOUCH, Q, QUALITY, qName, REDUCED_MOTION;

export function __set_qName(v) { return (qName = v); }

// shader hooks: every anchor must exist, otherwise a Three.js update would silently drop the effect
export function patchShader(src, anchor, repl, name) {
  if (!src.includes(anchor)) throw new Error('shader anchor missing (' + name + '): ' + anchor);
  return src.replace(anchor, repl);
}

export function __init_525() {
$ = id => document.getElementById(id);
V3 = THREE.Vector3;
// Instanced meshes here are culled with the bounding sphere given to their geometry (a whole chunk, a whole lift…):
// instances move (skiers, chairs, rocks swapped in and out), so a sphere cached from the first instance layout would pop.
Object.defineProperty(THREE.InstancedMesh.prototype, 'boundingSphere', {
  configurable: true,
  get() { const g = this.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); return g.boundingSphere; },
  set(v) { /* the geometry's sphere is the reference */ }
});
}

export function __init_643() {
colorCanvasTex = c => srgbTex(new THREE.CanvasTexture(c));
clamp = (v, a, b) => v < a ? a : v > b ? b : v;
lerp = (a, b, t) => a + (b - a) * t;
smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
wrapPi = a => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
fmt = n => Math.round(n).toLocaleString('fr-FR');
IS_TOUCH = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
if (IS_TOUCH) document.body.classList.add('touch');
Q = IS_TOUCH
  ? { trees: 9000, spacing: 9.5, shadow: 1024, pr: Math.min(window.devicePixelRatio || 1, 1.5), aa: false, tex: 256 }
  : { trees: 22000, spacing: 6.8, shadow: 2048, pr: Math.min(window.devicePixelRatio || 1, 1.5), aa: true, tex: 512 };
/* Image quality tiers (chosen on the start screen, key G, or the "Image" button). autoQuality() still steps down
   underneath if frames get slow. */
QUALITY = {   // farShadow: size of the second shadow map covering ~700 m (0 = near shadows only)
  low:    { label: 'Basse',   pr: 1,   shadow: 1024, farShadow: 0,    msaa: 0, bloom: false, ao: false, fxaa: true },
  medium: { label: 'Moyenne', pr: 1.5, shadow: 2048, farShadow: 2048, msaa: 4, bloom: true,  ao: false, fxaa: false },
  high:   { label: 'Haute',   pr: 2,   shadow: 2048, farShadow: 4096, msaa: 4, bloom: true,  ao: true,  fxaa: false },
};
qName = (() => { try { const v = STORE.getItem('valdessapins.quality'); if (QUALITY[v]) return v; } catch (e) { /* storage blocked */ } return IS_TOUCH ? 'low' : 'medium'; })();
Q.shadow = QUALITY[qName].shadow;
 Q.pr = Math.min(window.devicePixelRatio || 1, QUALITY[qName].pr);
REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
