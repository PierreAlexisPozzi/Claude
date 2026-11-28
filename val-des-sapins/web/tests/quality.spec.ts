/* Choix automatique du préréglage (T4) : table d'appareils → préréglage attendu. Fonction pure, sans navigateur
   (le rendu logiciel des tests ne dit rien du vrai matériel). */
import { test, expect } from '@playwright/test';
import { pickQuality, type DeviceInfo } from '../src/game/quality-detect';

const D = (o: Partial<DeviceInfo>): DeviceInfo => ({ touch: false, gpu: '', cores: 8, memory: 8, pixels: 1920 * 1080, ...o });

const TABLE: [string, DeviceInfo, string][] = [
  ['rendu logiciel (tests)', D({ gpu: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)' }), 'low'],
  ['Linux sans pilote', D({ gpu: 'llvmpipe (LLVM 17.0.6, 256 bits)' }), 'low'],
  ['PC de jeu RTX 4070', D({ gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0)', cores: 16 }), 'ultra'],
  ['PC de jeu RTX 3060 (6 cœurs)', D({ gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)', cores: 6 }), 'high'],
  ['PC AMD RX 6600', D({ gpu: 'ANGLE (AMD, AMD Radeon RX 6600 Direct3D11)' }), 'high'],
  ['MacBook Pro M3 Max', D({ gpu: 'Apple M3 Max', cores: 14 }), 'ultra'],
  ['MacBook Air M2', D({ gpu: 'Apple M2', cores: 8 }), 'high'],
  ['portable Intel UHD', D({ gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)', cores: 4 }), 'medium'],
  ['portable Intel UHD en 4K', D({ gpu: 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)', pixels: 3840 * 2160 }), 'low'],
  ['processeur graphique masqué', D({ gpu: '' }), 'medium'],
  ['iPhone récent', D({ touch: true, gpu: 'Apple GPU', memory: 0, pixels: 1179 * 2556 }), 'medium'],
  ['Android haut de gamme (Adreno 740)', D({ touch: true, gpu: 'Adreno (TM) 740', memory: 8 }), 'medium'],
  ['Android milieu de gamme (Adreno 619)', D({ touch: true, gpu: 'Adreno (TM) 619', memory: 4 }), 'low'],
  ['Android Mali-G57', D({ touch: true, gpu: 'Mali-G57 MC2', memory: 4 }), 'low'],
];

for (const [name, dev, want] of TABLE) test(`préréglage automatique : ${name} → ${want}`, () => {
  expect(pickQuality(dev)).toBe(want);
});
