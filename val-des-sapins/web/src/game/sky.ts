// @ts-nocheck — module écrit en T4 ; typage strict progressif à venir.
/* Ciel physique et soleil selon l'heure (tranche T4).

   - Position du soleil : formule astronomique simple (déclinaison, angle horaire) pour La Plagne (45,52° N), à une
     date et une heure solaires données. Par défaut le 1er mars à 10 h solaires (≈ 10 h 45 à l'heure légale) : soleil à
     30° au sud-est, la lumière rasante d'avant T4 (31° au sud-est) retrouvée par le calcul.
   - Ciel : modèle analytique de Preetham (Sky de three.js, licence MIT, déjà dans la dépendance three), avec
     quelques nuages hauts. La même fonction, réécrite ici en JavaScript, donne la couleur de l'horizon (brume et
     brouillard), la couleur du ciel (lumière d'ambiance) et la teinte du soleil après traversée de l'atmosphère.
   - Pourquoi pas @takram/three-atmosphere (recommandé par l'étude) : il demande la pile de post-traitement
     « postprocessing » en plus de celle du jeu, et des dépendances React déclarées ; à réévaluer pour le préréglage
     Ultra (voir review/etude_outils.md). */
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

const D2R = Math.PI / 180;
export const SKY = {
  lat: 45.52, day: 60, hour: 10,
  turbidity: 1.8, rayleigh: 2.0, mie: 0.003, mieG: 0.8, clouds: 0.16,
  scale: 1, el: 0, az: 0,
};

/** Élévation et azimut (depuis le nord, sens horaire) du soleil, en radians. */
export function solarPosition(day, hour, latDeg) {
  const decl = -23.44 * D2R * Math.cos(2 * Math.PI / 365 * (day + 10)), H = (hour - 12) * 15 * D2R, lat = latDeg * D2R;
  const el = Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(H));
  const c = (Math.sin(decl) - Math.sin(el) * Math.sin(lat)) / (Math.cos(el) * Math.cos(lat));
  let az = Math.acos(Math.max(-1, Math.min(1, c))); if (H > 0) az = 2 * Math.PI - az;
  return { el, az };
}
/** Direction vers le soleil dans le monde du jeu (nord = −z, est = +x). */
export function sunVector(el, az, out = new THREE.Vector3()) { const c = Math.cos(el); return out.set(Math.sin(az) * c, Math.sin(el), -Math.cos(az) * c); }

/* ---- Preetham en JavaScript (mêmes constantes que Sky.js, sans disque solaire ni nuages) ---- */
const TOTAL_R = [5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5];
const MIE_K = [1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14];
function betas() {
  const c = 0.2 * SKY.turbidity * 10e-18;
  return { R: TOTAL_R.map(v => v * SKY.rayleigh), M: MIE_K.map(v => 0.434 * c * v * SKY.mie) };
}
function airPath(cosZ) { const z = Math.acos(Math.max(0, cosZ)); return 1 / (Math.cos(z) + 0.15 * Math.pow(93.885 - z / D2R, -1.253)); }
/** Transmittance de l'atmosphère vers une direction d'élévation donnée (teinte du soleil). */
export function transmittance(sinEl) {
  const { R, M } = betas(), inv = airPath(sinEl);
  return R.map((r, i) => Math.exp(-(r * 8.4e3 * inv + M[i] * 1.25e3 * inv)));
}
/** Luminance du ciel (linéaire, avant mise à l'échelle) dans la direction d. */
export function skyRadiance(d, s) {
  const { R, M } = betas(), inv = airPath(d.y), sR = 8.4e3 * inv, sM = 1.25e3 * inv;
  const zc = Math.max(-1, Math.min(1, s.y)), sunE = 1000 * Math.max(0, 1 - Math.exp(-((1.6110731556870734 - Math.acos(zc)) / 1.5)));
  const cosT = d.x * s.x + d.y * s.y + d.z * s.z, rPh = 0.05968310365946075 * (1 + Math.pow(cosT * 0.5 + 0.5, 2));
  const g = SKY.mieG, mPh = 0.07957747154594767 * (1 - g * g) / Math.pow(1 - 2 * g * cosT + g * g, 1.5);
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    const Fex = Math.exp(-(R[i] * sR + M[i] * sM)), k = (R[i] * rPh + M[i] * mPh) / (R[i] + M[i]);
    let Lin = Math.pow(sunE * k * (1 - Fex), 1.5);
    Lin *= 1 + (Math.pow(sunE * k * Fex, 0.5) - 1) * Math.min(1, Math.max(0, Math.pow(1 - s.y, 5)));
    out[i] = (Lin + 0.1 * Fex) * 0.04 + [0, 0.0003, 0.00075][i];
  }
  return out;
}
const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
/** Couleur moyenne de l'horizon (élévation 1,5°), linéaire et mise à l'échelle. */
export function horizonColor(s) {
  const a = [0, 0, 0], d = new THREE.Vector3(), n = 24;
  for (let k = 0; k < n; k++) { const az = k / n * 2 * Math.PI; d.set(Math.sin(az), Math.sin(1.5 * D2R), -Math.cos(az)).normalize(); const c = skyRadiance(d, s); for (let i = 0; i < 3; i++) a[i] += c[i] / n * SKY.scale; }
  return a;
}
/** Couleur moyenne du ciel haut (élévation 50°), pour la lumière d'ambiance. */
export function upperSkyColor(s) {
  const a = [0, 0, 0], d = new THREE.Vector3(), n = 12;
  for (let k = 0; k < n; k++) { const az = k / n * 2 * Math.PI; d.set(Math.sin(az) * Math.cos(50 * D2R), Math.sin(50 * D2R), -Math.cos(az) * Math.cos(50 * D2R)); const c = skyRadiance(d, s); for (let i = 0; i < 3; i++) a[i] += c[i] / n * SKY.scale; }
  return a;
}

/** Calibre l'échelle du ciel : à l'heure par défaut, l'horizon garde la luminance du ciel d'avant T4 (≈ 0,68). */
export function calibrateSky(s) { SKY.scale = 1; SKY.scale = 0.68 / lum(horizonColor(s)); }

/** Maillage du ciel (Sky de three.js) : même direction de soleil, mêmes paramètres ; mise à l'échelle et horizon
 *  prolongé sous la ligne d'horizon (les montagnes du fond le cachent). `disc` = 0 pour la carte d'environnement. */
export function makeSky(s, disc = 1) {
  const sky = new Sky(), m = sky.material, U = m.uniforms;
  U.turbidity.value = SKY.turbidity; U.rayleigh.value = SKY.rayleigh; U.mieCoefficient.value = SKY.mie; U.mieDirectionalG.value = SKY.mieG;
  U.sunPosition.value.copy(s); U.showSunDisc.value = disc;
  if (U.cloudCoverage) { U.cloudCoverage.value = SKY.clouds; U.cloudDensity.value = 0.35; U.cloudElevation.value = 0.55; U.time.value = 37; }
  m.uniforms.uSkyScale = { value: SKY.scale };
  const fs = m.fragmentShader;
  if (!fs.includes('uniform float time;') || !/gl_FragColor\s*=\s*vec4\(\s*texColor,\s*1\.0\s*\);/.test(fs)) throw new Error('Sky.js a changé (ciel T4)');
  m.fragmentShader = fs.replace('uniform float time;', 'uniform float time;\nuniform float uSkyScale;')
    // teinte : AgX tire les bleus saturés vers le cyan, le ciel est légèrement ramené vers le bleu outremer
    .replace(/gl_FragColor\s*=\s*vec4\(\s*texColor,\s*1\.0\s*\);/, 'gl_FragColor = vec4( texColor * uSkyScale * vec3( 0.9, 0.96, 1.12 ), 1.0 );');
  m.fog = false; m.depthWrite = false;
  sky.scale.setScalar(20000); sky.frustumCulled = false; sky.renderOrder = -1;
  return sky;
}
export function updateSky(sky, s) { const U = sky.material.uniforms; U.sunPosition.value.copy(s); U.uSkyScale.value = SKY.scale; }

/** Lumière du soleil : teinte et intensité après traversée de l'atmosphère, relatives à l'heure par défaut
 *  (intensité 2,6 et teinte #fff0dc d'avant T4 conservées à 10 h le 1er mars). */
let T0 = null;
export function sunLight(s, color) {
  const t = transmittance(s.y); if (!T0) T0 = t;
  const k = t.map((v, i) => v / T0[i]), base = new THREE.Color(0xfff0dc).convertSRGBToLinear();
  color.setRGB(base.r * k[0], base.g * k[1], base.b * k[2]);
  const m = Math.max(color.r, color.g, color.b); color.multiplyScalar(1 / m);
  return 2.6 * (lum(t) / lum(T0)) * m * Math.max(0, Math.min(1, s.y / 0.05));
}
