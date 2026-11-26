// @ts-nocheck — généré par tools/split-game.mjs depuis game.html (module « render ») ; typage strict progressif à venir.
/* eslint-disable */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { _av } from './assembly';
import { $, Q, QUALITY, V3, qName } from './core';

export let srgbTex, canvas, renderer, MAX_ANISO, scene, FOG, camera, SUN_DIR, hemi, sun, SC, SUN_R, SUN_U, TERRAIN_LAYER, TREE_LAYER, PROXY_LAYER, SMALL_LAYER, sunFar, SCF, _fwd, SKY_MAT, sky, FilmShader, post;


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
  const envScene = new THREE.Scene(), envMat = SKY_MAT.clone(); envMat.uniforms.uDisc.value = 0;
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), envMat));
  const pmrem = new THREE.PMREMGenerator(renderer), rt = pmrem.fromScene(envScene, 0.02, 0.1, 400);
  scene.environment = rt.texture; scene.environmentIntensity = 0.85;
  pmrem.dispose(); envMat.dispose();
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
  SCk.fog_fragment = SCk.fog_fragment.replace('mix( gl_FragColor.rgb, fogColor, fogFactor )', 'mix( gl_FragColor.rgb, ' + dec('fogColor') + ', max( fogFactor, ( 1.0 - exp( - vFogDepth / 7000.0 ) ) * 0.6 ) )');
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
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;
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
// low winter sun (31°) from the south-east: long shadows that show the relief
SUN_DIR = new V3(0.45, 0.52, 0.72).normalize();
/* ---------------- LIGHTS ----------------
   Physical light units (r155+): intensities are about π times the old values. The procedural sky also lights the
   scene as an image-based environment (see buildEnvironment), so the hemisphere light only adds a little fill. */
hemi = new THREE.HemisphereLight(0xd3e2ff, 0x8c95a8, 0.32);
 hemi.color.convertSRGBToLinear();
 hemi.groundColor.convertSRGBToLinear();
 scene.add(hemi);
sun = new THREE.DirectionalLight(0xfff0dc, 2.6);
 sun.color.convertSRGBToLinear();
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

// sky dome with a hazy horizon and a sun glow
SKY_MAT = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { sunDir: { value: SUN_DIR }, uDisc: { value: 1 } },
  vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'uniform vec3 sunDir; uniform float uDisc; varying vec3 vD; void main(){ vec3 d = normalize(vD); float h = max(d.y,0.0); vec3 hor = vec3(0.78,0.85,0.93); vec3 mid = vec3(0.42,0.6,0.86); vec3 zen = vec3(0.13,0.3,0.66); vec3 c = mix(hor, mid, smoothstep(0.0,0.25,h)); c = mix(c, zen, smoothstep(0.2,0.9,h)); float s = max(dot(d,sunDir),0.0); c += vec3(1.0,0.86,0.62)*pow(s,24.0)*0.22 + vec3(1.0,0.9,0.75)*pow(s,4.0)*0.06; if(d.y<0.0) c = hor; c = pow(c, vec3(2.2)); c += vec3(1.0,0.93,0.78)*pow(s,1400.0)*40.0*uDisc; gl_FragColor = vec4(c,1.0); }'
});
sky = new THREE.Mesh(new THREE.SphereGeometry(20000, 32, 16), SKY_MAT);
sky.renderOrder = -1;
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
post = (() => {
  const T = QUALITY[qName], w = window.innerWidth, h = window.innerHeight;
  const rt = new THREE.WebGLRenderTarget(w * Q.pr, h * Q.pr, { type: THREE.HalfFloatType, samples: T.msaa });
  const composer = new EffectComposer(renderer, rt);
  const render = new RenderPass(scene, camera);
  const ao = new GTAOPass(scene, camera, w * Q.pr, h * Q.pr);
  ao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.6, thickness: 1.5, scale: 1.0, samples: 12, distanceFallOff: 1.0 }); ao.blendIntensity = 0.8;
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
  const out = new OutputPass(), fxaa = new FXAAPass(), film = new ShaderPass(FilmShader);
  for (const p of [render, ao, clean, bloom, out, fxaa, film]) composer.addPass(p);
  composer.setPixelRatio(Q.pr); composer.setSize(w, h);
  ao.enabled = T.ao; bloom.enabled = T.bloom; fxaa.enabled = T.fxaa;
  return { composer, render, ao, clean, bloom, out, fxaa, film };
})();
}
