// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « render ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { N8AOPass } from 'n8ao';
import { SKY, calibrateSky, horizonColor, makeSky, solarPosition, sunLight, sunVector, updateSky } from './sky';
import { _av } from './assembly';
import { $, Q, QUALITY, V3, qName } from './core';

export let srgbTex, canvas, renderer, MAX_ANISO, scene, FOG, camera, SUN_DIR, hemi, sun, SC, SUN_R, SUN_U, TERRAIN_LAYER, TREE_LAYER, PROXY_LAYER, SMALL_LAYER, sunFar, SCF, _fwd, SKY_MAT, sky, FilmShader, post, GradeShader, ENV_RT;


/** T4 : réglages de N8AO selon le préréglage (demi-résolution et échantillons). */
export function configureAO(n8, T) {
  const c = n8.configuration;
  if (c.halfRes !== !!T.aoHalf) c.halfRes = !!T.aoHalf;
  if (c.aoSamples !== (T.aoSamples || 16)) c.aoSamples = T.aoSamples || 16;
  if (c.denoiseSamples !== (T.aoDenoise || 8)) c.denoiseSamples = T.aoDenoise || 8;
  if (n8.beautyRenderTarget.samples !== T.msaa) { n8.beautyRenderTarget.samples = T.msaa; n8.beautyRenderTarget.dispose(); }
}

export function updateSunFar(cam) {
  if (!sunFar.visible) return;
  camera.getWorldDirection(_fwd); _fwd.y = 0; if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, 1); _fwd.normalize();
  const c = _av.copy(cam).addScaledVector(_fwd, 230), tx = (SCF.right - SCF.left) / sunFar.shadow.mapSize.x;
  const a = Math.round(c.dot(SUN_R) / tx) * tx, b = Math.round(c.dot(SUN_U) / tx) * tx, d = c.dot(SUN_DIR);
  sunFar.target.position.copy(SUN_R).multiplyScalar(a).addScaledVector(SUN_U, b).addScaledVector(SUN_DIR, d);
  sunFar.position.copy(sunFar.target.position).addScaledVector(SUN_DIR, 1700);
}

export function updateSun(c) {
  // snap the shadow frustum to whole texels so shadows don't shimmer while moving
  const tx = (SC.right - SC.left) / sun.shadow.mapSize.x;
  const a = Math.round(c.dot(SUN_R) / tx) * tx, b = Math.round(c.dot(SUN_U) / tx) * tx, d = c.dot(SUN_DIR);
  sun.target.position.copy(SUN_R).multiplyScalar(a).addScaledVector(SUN_U, b).addScaledVector(SUN_DIR, d);
  sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 700);
}

/* image-based lighting: the same procedural sky (without the sun disc, which the directional light already gives),
   prefiltered by PMREM. Snow in the shade turns blue from the sky, as it does outdoors. */
export function buildEnvironment() {
  // T4 : le ciel physique (sans disque solaire), refait quand l'heure change
  const envScene = new THREE.Scene(), s = makeSky(SUN_DIR, 0); s.scale.setScalar(300); envScene.add(s);
  const pmrem = new THREE.PMREMGenerator(renderer), rt = pmrem.fromScene(envScene, 0.02, 0.1, 1000);
  if (ENV_RT) ENV_RT.dispose();
  ENV_RT = rt; scene.environment = rt.texture; scene.environmentIntensity = 0.85;
  pmrem.dispose(); s.material.dispose(); s.geometry.dispose();
}

/** T4 : couleur du brouillard et de la brume = horizon du ciel physique (valeur d'affichage, décodée par les chunks). */
export function applyFog() {
  const h = horizonColor(SUN_DIR);
  FOG.setRGB(Math.pow(h[0], 1 / 2.2), Math.pow(h[1], 1 / 2.2), Math.pow(h[2], 1 / 2.2));
  scene.fog.color.copy(FOG); scene.background = new THREE.Color().setRGB(h[0], h[1], h[2]);
}

export function __init_553() {

/* ---------------- Colour pipeline (linear workflow) ----------------
   Every colour in this file (material colours, vertex and instance colours, fog, light colours) is written as a
   display (sRGB) value. Colour management is off on the CPU side and the shared shader chunks decode those values
   to linear light before shading; lighting runs in linear HDR, then OutputPass applies ACES tone mapping and the
   sRGB encoding. Colour textures are tagged SRGBColorSpace and decoded by the GPU; normal and data maps are not. */
THREE.ColorManagement.enabled = false;
{
  const SCk = THREE.ShaderChunk, dec = c => `pow( max( ${c}, vec3( 0.0 ) ), vec3( 2.2 ) )`;
  const need = (k, a) => { if (!SCk[k].includes(a)) throw new Error('Three.js shader chunk changed: ' + k); };
  SCk.map_fragment = 'diffuseColor.rgb = ' + dec('diffuseColor.rgb') + ';\n' + SCk.map_fragment;
  SCk.map_particle_fragment = 'diffuseColor.rgb = ' + dec('diffuseColor.rgb') + ';\n' + SCk.map_particle_fragment;
  need('color_fragment', 'diffuseColor *= vColor;');
  SCk.color_fragment = SCk.color_fragment.replace('diffuseColor *= vColor;', 'diffuseColor *= vec4( ' + dec('vColor.rgb') + ', vColor.a );');
  SCk.emissivemap_fragment = 'totalEmissiveRadiance = ' + dec('totalEmissiveRadiance') + ';\n' + SCk.emissivemap_fragment;
  need('fog_fragment', 'mix( gl_FragColor.rgb, fogColor, fogFactor )');
    // aerial perspective: on top of the exponential-squared fog, a long-range haze (≈ 30 % at 4 km) lightens and blues
  // the distant ridges the way the alpine air does; the same term on every fogged material, so no seams
  // T4 : la brume est plus dense dans les fonds de vallée (sous ≈ 1 450 m) qu'en altitude (au-dessus de ≈ 2 150 m)
  need('fog_vertex', 'vFogDepth = - mvPosition.z;');
  SCk.fog_pars_vertex = SCk.fog_pars_vertex + '\n#ifdef USE_FOG\n\tvarying float vFogWY;\n#endif\n';
  SCk.fog_vertex = SCk.fog_vertex.replace('vFogDepth = - mvPosition.z;', 'vFogDepth = - mvPosition.z;\n\tvFogWY = ( inverse( viewMatrix ) * mvPosition ).y;');
  SCk.fog_pars_fragment = SCk.fog_pars_fragment + '\n#ifdef USE_FOG\n\tvarying float vFogWY;\n#endif\n';
  SCk.fog_fragment = SCk.fog_fragment.replace('mix( gl_FragColor.rgb, fogColor, fogFactor )', 'mix( gl_FragColor.rgb, ' + dec('fogColor') + ', max( fogFactor, ( 1.0 - exp( - vFogDepth / 7000.0 ) ) * 0.6 * mix( 1.45, 0.8, smoothstep( -300.0, 400.0, vFogWY ) ) ) )');
}
srgbTex = t => { t.colorSpace = THREE.SRGBColorSpace; return t; };
}

export function __init_1211() {

/* ---------------- Three setup ---------------- */
canvas = $('c');
/* ---------------- RENDERER ----------------
   Native antialiasing is off: the scene is drawn into the composer's multisampled HDR target (MSAA x4 on medium and
   high), and the low tier uses FXAA instead. */
renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.setPixelRatio(Q.pr);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;   // T4 : AgX (teintes plus naturelles qu'ACES dans les hautes lumières : neige, ciel)
renderer.toneMappingExposure = 1.05;
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
   // r187 PCF is filtered (soft); PCFSoft was removed
MAX_ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 4);
scene = new THREE.Scene();
FOG = new THREE.Color('#c5d6ea');
scene.fog = new THREE.FogExp2(FOG, 0.000095);
scene.background = FOG.clone().convertSRGBToLinear();
camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.3, 26000);
// T4 : soleil calculé pour La Plagne à une date et une heure solaires (sky.ts) ; par défaut le 1er mars à 10 h,
// soleil bas (30°) au sud-est comme avant : de longues ombres qui montrent le relief
{ const p = solarPosition(SKY.day, SKY.hour, SKY.lat); SKY.el = p.el; SKY.az = p.az; SUN_DIR = sunVector(p.el, p.az); }
calibrateSky(SUN_DIR);
applyFog();
/* ---------------- LIGHTS ----------------
   Physical light units (r155+): intensities are about π times the old values. The procedural sky also lights the
   scene as an image-based environment (see buildEnvironment), so the hemisphere light only adds a little fill. */
hemi = new THREE.HemisphereLight(0xd3e2ff, 0x8c95a8, 0.32);
 hemi.color.convertSRGBToLinear();
 hemi.groundColor.convertSRGBToLinear();
 scene.add(hemi);
sun = new THREE.DirectionalLight(0xfff0dc, 2.6);
 sun.intensity = sunLight(SUN_DIR, sun.color);   // teinte et intensité après traversée de l'atmosphère
sun.castShadow = true;
 sun.shadow.mapSize.set(Q.shadow, Q.shadow);
SC = sun.shadow.camera;
 SC.left = -42;
 SC.right = 42;
 SC.top = 42;
 SC.bottom = -42;
 SC.near = 20;
 SC.far = 1400;
sun.shadow.bias = -0.0003;
 sun.shadow.normalBias = 0.05;
scene.add(sun);
 scene.add(sun.target);
SUN_R = new V3().crossVectors(SUN_DIR, new V3(0, 1, 0)).normalize();
SUN_U = new V3().crossVectors(SUN_R, SUN_DIR).normalize();
/* ---------------- Long-range shadows (two cascades) ----------------
   'sun' keeps its sharp 84 m shadow map around the skier; 'sunFar' renders a second map ~700 m wide, centred ahead
   of the camera, so trees, buildings and lift towers cast shadows across the valley. It adds no light: the shared
   lighting chunk below takes the irradiance from 'sun' only and its shadow from the near map inside it, the far map
   outside, blended over the last 7 m. The terrain is left out of the far map (layer 3): its own relief shadow is
   already baked per vertex. */
TERRAIN_LAYER = 3;
TREE_LAYER = 6;
PROXY_LAYER = 5;
SMALL_LAYER = 8;
   // proxies: low trees seen only by the far shadow map
// SMALL_LAYER: rocks, skiers, animals, furniture: seen and shadowed up close, left out of the far map (invisible at 200 m)
camera.layers.enable(TERRAIN_LAYER);
 sun.shadow.camera.layers.enable(TERRAIN_LAYER);
camera.layers.enable(SMALL_LAYER);
 sun.shadow.camera.layers.enable(SMALL_LAYER);
camera.layers.enable(TREE_LAYER);
 sun.shadow.camera.layers.enable(TREE_LAYER);
// T5 : objets regroupés (batch.ts) : calque 10 = image + ombre lointaine, 12 = image seule, 11 = ombre proche, ajouté
// seulement aux regroupements qui ont un objet près du skieur (sinon ils coûtaient un appel dans la carte nette)
camera.layers.enable(10); camera.layers.enable(12); sun.shadow.camera.layers.enable(11);
sunFar = new THREE.DirectionalLight(0xffffff, 0);
sunFar.castShadow = true;
 sunFar.shadow.mapSize.set(QUALITY[qName].farShadow || 1024, QUALITY[qName].farShadow || 1024);
SCF = sunFar.shadow.camera;
 SCF.left = -350;
 SCF.right = 350;
 SCF.top = 350;
 SCF.bottom = -350;
 SCF.near = 10;
 SCF.far = 3400;
sunFar.shadow.bias = -0.0006;
 sunFar.shadow.normalBias = 0.6;
sunFar.visible = QUALITY[qName].farShadow > 0;
SCF.layers.set(0);
 SCF.layers.enable(PROXY_LAYER);
 SCF.layers.enable(10);
   // buildings, towers, people + tree proxies; no terrain, no detailed trees
scene.add(sunFar);
 scene.add(sunFar.target);
_fwd = new V3();
{
  const SCk = THREE.ShaderChunk, loop = `	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

		directionalLight = directionalLights[ i ];`;
  // the published build strips blank lines from the chunks: match the anchors with flexible whitespace
  const ws = t => new RegExp(t.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'));
  if (!ws(loop).test(SCk.lights_fragment_begin)) throw new Error('Three.js shader chunk changed: lights_fragment_begin');
  SCk.lights_fragment_begin = SCk.lights_fragment_begin.replace(ws(loop), () => `	#if ( NUM_DIR_LIGHTS == 2 ) && defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS == 2 )
	{   // Val des Sapins: one sun, two shadow cascades (near map inside its frustum, far map outside)
		directionalLight = directionalLights[ 0 ];
		getDirectionalLightInfo( directionalLight, directLight );
		if ( directLight.visible && receiveShadow ) {
			vec4 c0 = vDirectionalShadowCoord[ 0 ]; vec3 p0 = c0.xyz / c0.w;
			float wNear = smoothstep( 0.0, 0.08, min( min( p0.x, 1.0 - p0.x ), min( p0.y, 1.0 - p0.y ) ) ) * step( p0.z, 1.0 );
			DirectionalLightShadow s0 = directionalLightShadows[ 0 ], s1 = directionalLightShadows[ 1 ];
			float shN = wNear > 0.0 ? getShadow( directionalShadowMap[ 0 ], s0.shadowMapSize, s0.shadowIntensity, s0.shadowBias, s0.shadowRadius, c0 ) : 1.0;
			float shF = wNear < 1.0 ? getShadow( directionalShadowMap[ 1 ], s1.shadowMapSize, s1.shadowIntensity, s1.shadowBias, s1.shadowRadius, vDirectionalShadowCoord[ 1 ] ) : 1.0;
			directLight.color *= mix( shF, shN, wNear );
		}
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#else
` + loop);
  const end = `		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );

	}
	#pragma unroll_loop_end`;
  // close the #if after the directional loop only (point and spot loops end the same way, earlier in the chunk)
  const cut = SCk.lights_fragment_begin.indexOf('one sun, two shadow cascades'), head = SCk.lights_fragment_begin.slice(0, cut), tail = SCk.lights_fragment_begin.slice(cut);
  if (cut < 0 || !ws(end).test(tail)) throw new Error('Three.js shader chunk changed: lights_fragment_begin (end)');
  SCk.lights_fragment_begin = head + tail.replace(ws(end), () => end + `
	#endif`);
}

// T4 : ciel physique (Preetham, Sky de three.js) au lieu du dégradé peint
sky = makeSky(SUN_DIR);
SKY_MAT = sky.material;
 scene.add(sky);
buildEnvironment();

/* ---------------- POST-PROCESSING ----------------
   RenderPass into a multisampled HalfFloat (HDR) target
   → GTAO ambient occlusion (high tier; placed before bloom so occlusion never darkens the glow)
   → UnrealBloomPass, threshold above sunlit snow: only the sun, ice glints, tunnel lamps and diamond dust glow
   → OutputPass (ACES filmic tone mapping + sRGB) → FXAA (low tier only) → film: vignette, fine grain, faint
   chromatic aberration at the edges. */
FilmShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVig: { value: 0.26 }, uGrain: { value: 0.022 }, uCA: { value: 0.0007 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uVig; uniform float uGrain; uniform float uCA; varying vec2 vUv;
    void main() {
      vec2 d = vUv - 0.5; float r2 = dot(d, d); vec2 o = d * uCA * (0.5 + 4.0 * r2);
      vec3 c = vec3(texture2D(tDiffuse, vUv - o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + o).b);
      c *= 1.0 - uVig * smoothstep(0.08, 0.55, r2);
      float n = fract(sin(dot(gl_FragCoord.xy + fract(uTime * 7.3) * 517.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
      c += n * uGrain * (1.0 - 0.6 * dot(c, vec3(0.333)));     // grain shows in the darks more than on bright snow
      gl_FragColor = vec4(c, 1.0);
    }`
};
/* T4 : étalonnage, en lumière linéaire avant le tone mapping : contraste en espace logarithmique autour du gris
   moyen, ombres légèrement froides et hautes lumières légèrement chaudes, saturation */
GradeShader = {
  uniforms: { tDiffuse: { value: null }, uContrast: { value: 1.08 }, uSat: { value: 1.16 }, uShadow: { value: new V3(0.95, 0.985, 1.07) }, uHigh: { value: new V3(1.03, 1.0, 0.965) } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uContrast; uniform float uSat; uniform vec3 uShadow; uniform vec3 uHigh; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv); vec3 x = c.rgb; const vec3 Y = vec3(0.2126, 0.7152, 0.0722);
      float L = max(dot(x, Y), 1e-5), lg = log2(L / 0.18);
      x *= 0.18 * exp2(lg * uContrast) / L;
      x *= mix(uShadow, uHigh, smoothstep(-3.0, 1.5, lg));
      x = mix(vec3(dot(x, Y)), x, uSat);
      gl_FragColor = vec4(max(x, vec3(0.0)), c.a);
    }`
};
post = (() => {
  const T = QUALITY[qName], w = window.innerWidth, h = window.innerHeight;
  const rt = new THREE.WebGLRenderTarget(w * Q.pr, h * Q.pr, { type: THREE.HalfFloatType, samples: T.msaa });
  const composer = new EffectComposer(renderer, rt);
  const render = new RenderPass(scene, camera);
  // T4 : occlusion ambiante N8AO (CC0 / ISC) à la place de GTAO. N8AOPass rend la scène lui-même : il remplace la
  // passe de rendu quand l'occlusion est active, avec le même anticrénelage MSAA
  const n8 = new N8AOPass(scene, camera, w * Q.pr, h * Q.pr);
  Object.assign(n8.configuration, { aoRadius: 2.5, distanceFalloff: 1.0, intensity: 2.0, gammaCorrection: false });
  n8.beautyRenderTarget.samples = T.msaa;
  const ao = { pass: n8, get enabled() { return n8.enabled; }, set enabled(v) { n8.enabled = v; render.enabled = !v; } };
  const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.2, 0.5, 2.4);
  // a single NaN / Inf pixel (any shader, any GPU) would be smeared by the bloom's blur chain into large black
  // rectangles that come and go with the camera angle: clean the frame before the bloom and the AO blur see it
  const clean = new ShaderPass({ uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      bool bad(float v) { return isnan(v) || isinf(v) || !(v >= 0.0 || v < 0.0); }
      void main() { vec4 c = texture2D(tDiffuse, vUv);
        if (bad(c.r) || bad(c.g) || bad(c.b) || bad(c.a)) c = vec4(0.0, 0.0, 0.0, 1.0);
        gl_FragColor = clamp(c, vec4(0.0), vec4(512.0)); }` });
  const out = new OutputPass(), fxaa = new FXAAPass(), film = new ShaderPass(FilmShader), grade = new ShaderPass(GradeShader);
  for (const p of [render, n8, clean, bloom, grade, out, fxaa, film]) composer.addPass(p);
  composer.setPixelRatio(Q.pr); composer.setSize(w, h);
  ao.enabled = !!T.ao; bloom.enabled = T.bloom; fxaa.enabled = T.fxaa; configureAO(n8, T);
  return { composer, render, ao, n8, clean, bloom, grade, out, fxaa, film };
})();
}
