/* Choix automatique du préréglage d'image au premier lancement (tranche T4). Fonction pure, testée par une table
   (tests/quality.spec.ts) : le rendu logiciel des tests ne permet pas de la valider sur du vrai matériel.
   Le choix enregistré par le joueur (valdessapins.quality) reste prioritaire ; autoQuality() continue d'abaisser
   les réglages si les images deviennent lentes. */

export type QualityName = 'low' | 'medium' | 'high' | 'ultra';

export interface DeviceInfo {
  /** Écran tactile principal (pointer: coarse). */
  touch: boolean;
  /** Nom du processeur graphique (WEBGL_debug_renderer_info), vide s'il est masqué. */
  gpu: string;
  /** Cœurs logiques (navigator.hardwareConcurrency), 0 si inconnu. */
  cores: number;
  /** Mémoire en Go (navigator.deviceMemory, plafonnée à 8 par les navigateurs), 0 si inconnue. */
  memory: number;
  /** Pixels physiques de l'écran (largeur × hauteur × devicePixelRatio²). */
  pixels: number;
}

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i;
// cartes de jeu récentes (ordinateur) : NVIDIA RTX, AMD RX 6000 et plus, Intel Arc, puces Apple M Pro / Max / Ultra
const ULTRA = /rtx\s*(30[6-9]0|40[6-9]0|50\d0)|rx\s*(6[7-9]\d0|7[7-9]\d0|9\d{3})|apple m\d (max|ultra)/i;
const HIGH = /rtx|gtx\s*(16|10[6-8])|rx\s*(5[5-7]\d0|6\d{3}|7\d{3}|9\d{3})|radeon pro|arc\s*a?\d|apple m\d|apple gpu/i;
// téléphones et tablettes haut de gamme : Apple (A15 et plus ne sont pas distinguables : « Apple GPU »), Adreno 7xx,
// Mali-G7xx / Immortalis, Xclipse
const MOBILE_GOOD = /adreno\D*(7[3-9]\d|8\d\d)|mali-g7[1-9]|immortalis|xclipse|apple gpu/i;

export function pickQuality(d: DeviceInfo): QualityName {
  if (SOFTWARE.test(d.gpu)) return 'low';
  if (d.touch) {
    if (MOBILE_GOOD.test(d.gpu) && (d.memory === 0 || d.memory >= 6)) return 'medium';
    return 'low';
  }
  if (ULTRA.test(d.gpu) && d.cores >= 8) return 'ultra';
  if (HIGH.test(d.gpu)) return 'high';
  if (/intel|uhd|iris|mali|adreno|powervr/i.test(d.gpu) || (d.memory > 0 && d.memory < 4)) return d.pixels > 4.5e6 ? 'low' : 'medium';
  return 'medium';   // inconnu ou masqué : le réglage d'avant T4
}

/** Lit les informations de l'appareil (navigateur). */
export function deviceInfo(gl: WebGLRenderingContext | WebGL2RenderingContext | null, touch: boolean): DeviceInfo {
  let gpu = '';
  try { const ext = gl && gl.getExtension('WEBGL_debug_renderer_info'); if (gl && ext) gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || ''); } catch { /* masqué */ }
  const nav = navigator as Navigator & { deviceMemory?: number };
  const dpr = window.devicePixelRatio || 1;
  return { touch, gpu, cores: nav.hardwareConcurrency || 0, memory: nav.deviceMemory || 0, pixels: screen.width * screen.height * dpr * dpr };
}
