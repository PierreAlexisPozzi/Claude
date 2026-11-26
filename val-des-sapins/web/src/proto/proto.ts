/* Prototypes de la tranche T3 — DÉSACTIVÉS par défaut, activés par l'adresse : ?proto=rendu,facade,visage (ou all).
   Ils servent à juger sur pièce les outils retenus par l'étude (review/etude_outils.md) avant les tranches T4 à T7,
   sur les mêmes vues de référence que le jeu normal (captures avant / après).

   - rendu  : tone mapping AgX (three.js) à la place d'ACES, occlusion ambiante N8AO (CC0) à la place de GTAO ;
   - facade : matières PBR CC0 d'ambientCG — béton banché sur les barres et tours, bardage à clins sur les résidences
              bois et les chalets, plancher sur les terrasses (textures KTX2 de public/assets/proto/) ;
   - visage : peau avec diffusion sous la surface approchée (lumière « enveloppée » teintée de rouge au terminateur),
              micro-relief de pores et de ridules, rugosité variable ; yeux plus humides (reflet net).
   Rien n'est modifié dans le jeu quand aucun prototype n'est demandé. */
import * as THREE from 'three';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { N8AOPass } from 'n8ao';
import { fetchBinary } from '../assets/loader';

type Any = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export type ProtoName = 'rendu' | 'facade' | 'visage';
export const PROTOS: ProtoName[] = ['rendu', 'facade', 'visage'];

interface Game { ski: Any; render: Any; materials: Any; world: Any; assembly: Any }

/** Prototypes demandés par l'adresse (?proto=…). */
export function requestedProtos(search = location.search): ProtoName[] {
  const m = /[?&]proto=([\w,]+)/.exec(search);
  if (!m) return [];
  const list = m[1].split(',');
  return list.includes('all') ? [...PROTOS] : PROTOS.filter((p) => list.includes(p));
}

// ---------------------------------------------------------------- rendu
function protoRendu(g: Game): void {
  const { renderer, post, scene, camera } = g.render;
  renderer.toneMapping = THREE.AgXToneMapping;   // OutputPass lit le tone mapping du renderer
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const n8 = new N8AOPass(scene, camera, size.x, size.y);
  n8.configuration.aoRadius = 2.5;
  n8.configuration.distanceFalloff = 1.0;
  n8.configuration.intensity = 2.2;
  n8.configuration.halfRes = size.x * size.y > 1.5e6;
  n8.configuration.gammaCorrection = false;      // la sortie sRGB est faite par OutputPass, plus loin
  const passes: Any[] = post.composer.passes, i = passes.indexOf(post.render);
  passes.splice(i, 1, n8);                        // N8AOPass rend la scène puis applique l'occlusion
  post.ao.enabled = false;
  const resize = () => { const s = renderer.getDrawingBufferSize(new THREE.Vector2()); n8.setSize(s.x, s.y); };
  window.addEventListener('resize', resize);
  (window as Any).__vds.n8ao = n8;
}

// ---------------------------------------------------------------- façades et terrasses
async function protoFacade(g: Game): Promise<() => void> {
  const { BLEND } = g.world, { detailMat, lambertVC } = g.materials, { matCache } = g.assembly;
  const ktx2 = new KTX2Loader().setTranscoderPath(new URL('basis/', document.baseURI).href).detectSupport(g.render.renderer);
  const load = async (name: string, color: boolean) => {
    const t: Any = await new Promise((res, rej) => fetchBinary('proto/' + name + '.ktx2').then((b) => ktx2.parse(b, res, rej), rej));
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = g.render.MAX_ANISO;
    t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.needsUpdate = true;
    return t;
  };
  for (const k of ['concrete', 'siding', 'deck']) {
    BLEND.tex[k + '_albedo'] = await load(k + '_albedo', true);
    BLEND.tex[k + '_normal'] = await load(k + '_normal', false);
  }
  ktx2.dispose();
  // texture de 2,4 m de côté pour le béton (4 banches), 1,35 m pour le bardage (9 clins), 2 m pour le plancher
  const concrete = detailMat('concrete', { color: '#ffffff', roughness: 0.9 }, 1 / 2.4, 2.4, 1.0, false, [0.5, 0.5, 0.9]);
  const siding = detailMat('siding', { color: '#ffffff', roughness: 0.78 }, 1 / 1.35, 2.0, 1.0, false, [0.2, 0.4, 2.2]);
  const deck = detailMat('deck', { color: '#ffffff', roughness: 0.8, vertexColors: true }, 0.5, 1.8, 0.9, false, [0.2, 0.4, 2.2]);
  void lambertVC;
  const swap = (root: THREE.Object3D, from: Any, to: Any) => root.traverse((o: Any) => { if (o.isMesh && from && o.material === from) o.material = to; });
  const refresh = () => {
    for (const b of g.ski.BUILDINGS) {
      if (!b.detail || b.detail.userData.proto) continue;
      if (['block', 'tower', 'paquebot'].includes(b.type)) swap(b.detail, matCache.stone, concrete);
      else { swap(b.detail, matCache.plank, siding); swap(b.detail, matCache.log, siding); }
      b.detail.userData.proto = true;
    }
    for (const o of g.render.scene.children) if (o.userData?.kind === 'terrace' && !o.userData.proto) {
      o.traverse((m: Any) => { if (m.isMesh && m.material?.vertexColors) m.material = deck; });
      o.userData.proto = true;
    }
  };
  refresh();
  return refresh;
}

// ---------------------------------------------------------------- visages
const SKIN_COMMON = `
float vdsHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vdsCell(vec2 p) {   // pores : distance au point le plus proche d'une grille aléatoire (Worley)
  vec2 i = floor(p), f = fract(p); float d = 1.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 o = vec2(float(x), float(y)); vec2 r = o + vec2(vdsHash(i + o), vdsHash(i + o + 17.0)) - f; d = min(d, dot(r, r)); }
  return sqrt(d);
}
float vdsSkinH(vec2 uv) {  // hauteur : pores + ridules fines, effacés quand ils deviennent plus fins qu'un pixel (anticrénelage)
  float fp = 1.0 - smoothstep(0.25, 0.7, length(fwidth(uv * 720.0)));
  float fl = 1.0 - smoothstep(0.25, 0.7, length(fwidth(uv * 160.0)));
  float pores = smoothstep(0.0, 0.42, vdsCell(uv * 720.0));
  float lines = 0.5 + 0.5 * sin(uv.y * 160.0 * 6.28 + vdsHash(floor(uv * 40.0)) * 6.28);
  return 0.5 + (pores - 0.5) * 0.8 * fp + (lines - 0.5) * 0.35 * fl;
}`;

function patchSkin(mat: Any): void {
  if (mat.userData.protoSkin) return;
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh: Any, r: Any) => {
    prev?.call(mat, sh, r);
    const rep = (src: string, key: string, add: string) => { if (!src.includes(key)) throw new Error('proto visage : ' + key); return src.replace(key, add); };
    sh.fragmentShader = rep(sh.fragmentShader, '#include <common>', '#include <common>\n' + SKIN_COMMON);
    // micro-relief : perturbation de la normale par les dérivées écran d'une hauteur procédurale (bump « arb »)
    sh.fragmentShader = rep(sh.fragmentShader, '#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  #ifdef USE_MAP
  { float h = vdsSkinH(vMapUv);
    vec3 sp = -vViewPosition, sx = dFdx(sp), sy = dFdy(sp);
    vec2 dh = vec2(dFdx(h), dFdy(h)) * 0.0007;
    vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1);
    vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
    normal = normalize(abs(det) * normal - grad); }
  #endif`);
    sh.fragmentShader = rep(sh.fragmentShader, '#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
  #ifdef USE_MAP
  roughnessFactor = clamp(roughnessFactor * (0.72 + 0.35 * vdsSkinH(vMapUv)), 0.3, 1.0);
  #endif`);
    // diffusion sous la surface approchée : la lumière « enveloppe » le terminateur, teintée de rouge (sang)
    sh.fragmentShader = rep(sh.fragmentShader, '#include <lights_fragment_end>', `#include <lights_fragment_end>
  #if NUM_DIR_LIGHTS > 0
  { vec3 L = directionalLights[0].direction; float nl = dot(normal, L);
    float wrap = max(0.0, (nl + 0.5) / 1.5) - max(0.0, nl);
    reflectedLight.directDiffuse += diffuseColor.rgb * vec3(0.95, 0.25, 0.12) * wrap * directionalLights[0].color * 1.1; }
  #endif`);
  };
  mat.customProgramCacheKey = () => 'vds-proto-skin';
  mat.userData.protoSkin = true;
  mat.needsUpdate = true;
}

function protoVisage(g: Game): () => void {
  const refresh = () => g.render.scene.traverse((o: Any) => {
    if (!o.isSkinnedMesh || !o.material) return;
    if (/_face$/.test(o.name)) patchSkin(o.material);
    else if (/_eyes$/.test(o.name) && !o.material.userData.protoEye) { o.material.roughness = 0.04; o.material.envMapIntensity = 1.8; o.material.userData.protoEye = true; }
  });
  refresh();
  return refresh;
}

/** Active les prototypes demandés, une fois le jeu prêt. Renvoie la fonction de rafraîchissement (nouveaux objets). */
export async function startProtos(list: ProtoName[], g: Game): Promise<() => void> {
  const refreshers: (() => void)[] = [];
  if (list.includes('rendu')) protoRendu(g);
  if (list.includes('facade')) refreshers.push(await protoFacade(g));
  if (list.includes('visage')) refreshers.push(protoVisage(g));
  const refresh = () => refreshers.forEach((f) => f());
  setInterval(refresh, 500);   // bâtiments détaillés et personnages créés à la volée
  return refresh;
}
