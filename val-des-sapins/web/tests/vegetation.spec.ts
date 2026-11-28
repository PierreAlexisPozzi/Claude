/* T8 : paysage. Forêts aux emplacements OSM (bois et forêts), mélèzes et épicéas en peuplements, rochers dans la roche
   nue et les éboulis, barres rocheuses, horizon (bois d'OSM au-delà du secteur, mélèzes lointains) ; aucun arbre ni rocher sur les pistes, les remontées, les bâtiments, les
   terrasses, les personnes, le snowpark ou le départ. Le générateur partagé `rnd` garde la même suite qu'en T7 / T8a
   (PNJ et horizon identiques : tests/baselines/rnd-pnj.json). */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { openGame } from './helpers';

const RND = JSON.parse(fs.readFileSync(new URL('./baselines/rnd-pnj.json', import.meta.url), 'utf8'));

test('végétation : forêts OSM, essences, rochers, exclusions, suite de rnd inchangée', async ({ page }) => {
  test.setTimeout(10 * 60_000);
  await openGame(page, 'web');
  const r = await page.evaluate(() => {
    const s = (window as any).__ski, T = s.trees, Rk = s.rocks, n = T.x.length;
    const segDist = (px: number, pz: number, ax: number, az: number, bx: number, bz: number) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)); return Math.hypot(px - ax - t * dx, pz - az - t * dz); };
    const inBld = (x: number, z: number, b: any, m: number) => { const c = Math.cos(b.rot), sn = Math.sin(b.rot), u = (x - b.x) * c - (z - b.z) * sn, v = (x - b.x) * sn + (z - b.z) * c; return Math.abs(u) < b.w / 2 + m && Math.abs(v) < b.d / 2 + m; };
    const bad: Record<string, number> = { remontee: 0, batiment: 0, terrasse: 0, personne: 0, snowpark: 0, depart: 0 };
    const check = (x: number, z: number, rad: number) => {
      for (const L of s.LIFTS) if (L.B && segDist(x, z, L.B.x, L.B.z, L.T.x, L.T.z) < (L.off || 2) + 1 + rad) { bad.remontee++; break; }
      for (const b of s.BUILDINGS) if (inBld(x, z, b, rad)) { bad.batiment++; break; }
      for (const B of s.BUILDINGS) { const t = B.terrace; if (t && Math.hypot(x - t.cx, z - t.cz) < Math.max(t.W, t.D) / 2 + 1 + rad) { bad.terrasse++; break; } }
      for (const q of s.PEOPLE) if (Math.hypot(x - q.x, z - q.z) < 2.5 + rad) { bad.personne++; break; }
      for (const k of s.kickers) if (Math.hypot(x - k.x, z - k.z) < Math.sqrt(k.R2) + rad) { bad.snowpark++; break; }
      for (const k of s.rails) if (segDist(x, z, k.a.x, k.a.z, k.b.x, k.b.z) < 2 + rad) { bad.snowpark++; break; }
      if (Math.hypot(x - s.P.pos.x, z - s.P.pos.z) < 8 + rad) bad.depart++;
    };
    let wood = 0, larch = 0, clear = 0;
    for (let i = 0; i < n; i++) { check(T.x[i], T.z[i], 0.5 * T.s[i]); if (s.coverAt(T.x[i], T.z[i]) === 1) wood++; larch += T.sp[i]; if (s.isClear(T.x[i], T.z[i])) clear++; }
    const badTrees = { ...bad }; for (const k in bad) bad[k] = 0;
    let onRock = 0, rClear = 0;
    for (let i = 0; i < Rk.x.length; i++) { check(Rk.x[i], Rk.z[i], 0); const c = s.coverAt(Rk.x[i], Rk.z[i]); if (c === 2 || c === 3) onRock++; if (s.isClear(Rk.x[i], Rk.z[i])) rClear++; }
    // morceaux proches mixtes (deux essences) : peuplements cohérents → peu de prototypes par morceau
    const C = 48, chunks = new Map<number, Set<number>>();
    for (let i = 0; i < n; i++) { const k = Math.floor((T.x[i] + 1400) / C) + Math.floor((T.z[i] + 1400) / C) * 1000; if (!chunks.has(k)) chunks.set(k, new Set()); chunks.get(k)!.add(T.sp[i]); }
    let mixed = 0; for (const v of chunks.values()) if (v.size > 1) mixed++;
    const npc = s.npcs.slice(0, 12).map((q: any) => [+q.skill.toFixed(6), +q.h.toFixed(6), +(q.gth || 0).toFixed(6)]);   // tirages purs (la phase avance avec le temps)
    let horizon = 0, extra = 0, hLarch = 0; s.scene.traverse((o: any) => { if (o.userData.horizonStands) { horizon = o.userData.legacyN; extra = o.count - horizon; const a = o.geometry.getAttribute('iSp').array; for (const v of a) hLarch += v; hLarch /= a.length; } });
    const terraces = s.BUILDINGS.filter((B: any) => B.terrace).length;
    return { terraces, n, wood, larch, clear, badTrees, badRocks: bad, rocks: Rk.x.length, onRock, rClear, bands: Rk.bands, farSpecies: T.farSpecies, farMeshes: T.farMeshes.length, chunks: chunks.size, mixed, protos: s.NEAR.protos ? s.NEAR.protos.length : 0, npc, npcN: s.npcs.length, horizon, extra, hLarch, cover: s.cover.wood };
  });
  console.log(JSON.stringify({ ...r, npc: undefined }));
  // suite du générateur partagé : PNJ et forêts lointaines de l'horizon identiques à T8a
  expect(r.npc).toEqual(RND.pnj);
  expect(r.npcN).toBe(RND.pnjN);
  expect(r.horizon).toBe(RND.horizon);                    // bouquets lointains d'avant T8, mêmes tirages
  // horizon : bois d'OSM débordant du secteur, et des mélèzes parmi les bouquets lointains
  expect(r.extra).toBeGreaterThan(500);
  expect(r.hLarch).toBeGreaterThan(0.05);
  expect(r.hLarch).toBeLessThan(0.6);
  // forêts d'après OSM
  expect(r.cover).toBeGreaterThan(10000);                 // mailles de 4 m classées « bois »
  expect(r.wood / r.n).toBeGreaterThan(0.8);
  expect(r.larch / r.n).toBeGreaterThan(0.12);
  expect(r.larch / r.n).toBeLessThan(0.5);
  expect(r.farSpecies).toBe(true);                         // silhouette commune, essence par instance
  expect(r.farMeshes).toBeLessThanOrEqual(64);             // morceaux de 350 m : pas d'appel de plus pour le mélèze
  expect(r.protos).toBe(5);
  expect(r.mixed / r.chunks).toBeLessThan(0.45);
  // exclusions
  expect(r.terraces).toBeGreaterThan(4);                   // le contrôle des terrasses porte sur de vraies terrasses
  expect(r.clear).toBe(0);
  expect(r.rClear).toBe(0);
  for (const [k, v] of Object.entries(r.badTrees)) expect(v, 'arbres · ' + k).toBe(0);
  for (const [k, v] of Object.entries(r.badRocks)) expect(v, 'rochers · ' + k).toBe(0);
  // roche nue, éboulis et barres rocheuses
  expect(r.onRock).toBeGreaterThan(800);
  expect(r.bands).toBeGreaterThan(50);
});
