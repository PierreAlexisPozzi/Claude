// @ts-nocheck — module écrit en T4 ; typage strict progressif à venir.
/* Changer l'heure (et la date) du soleil (tranche T4) : direction du soleil, ciel, brume, lumière d'ambiance cuite
   (carte d'environnement) et ensoleillement cuit du relief. Coûteux (≈ 1 à 2 s) : appelé au chargement d'une vue
   ou par les tests (__ski.setHour). Le cycle jour / nuit continu est l'objet de la tranche T15. */
import * as THREE from 'three';
import { rebakeSun } from './materials';
import { SUN_DIR, SUN_R, SUN_U, applyFog, buildEnvironment, sky, sun } from './render';
import { SKY, solarPosition, sunLight, sunVector, updateSky } from './sky';

export function setSunTime(hour, day = SKY.day) {
  SKY.hour = hour; SKY.day = day;
  const p = solarPosition(day, hour, SKY.lat); SKY.el = p.el; SKY.az = p.az;
  sunVector(p.el, p.az, SUN_DIR);   // même objet : les nuanceurs qui le lisent suivent
  SUN_R.crossVectors(SUN_DIR, new THREE.Vector3(0, 1, 0)).normalize(); SUN_U.crossVectors(SUN_R, SUN_DIR).normalize();
  sun.intensity = sunLight(SUN_DIR, sun.color);
  updateSky(sky, SUN_DIR); applyFog(); buildEnvironment(); rebakeSun();
  return { elevation: Math.round(p.el / Math.PI * 1800) / 10, azimuth: Math.round(p.az / Math.PI * 1800) / 10 };
}
