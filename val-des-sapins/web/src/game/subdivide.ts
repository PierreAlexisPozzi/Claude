/* T7 : une passe de subdivision de Loop pour la tête des personnages vus de près (visage MakeHuman, ~3 300 triangles,
   facetté en gros plan → ~13 200 triangles lisses).

   - La topologie est « soudée » par position : les sommets dupliqués aux coutures de texture bougent ensemble, la
     surface ne se fend pas ; les attributs (coordonnées de texture, couleurs) restent ceux de chaque côté de la couture.
   - Les règles de Loop sont des moyennes pondérées (poids de somme 1) : elles s'appliquent telles quelles aux décalages
     des morphes (expressions : clignement, sourire, bouche, sourcils, yeux plissés), qui suivent donc la surface lisse.
   - Poids de peau : moyenne des deux extrémités de l'arête, quatre influences gardées, renormalisées.
   - Normales recalculées sur la topologie soudée (pas de couture d'éclairage). */
import * as THREE from 'three';

type Attr = THREE.BufferAttribute | THREE.InterleavedBufferAttribute;

export function loopSubdivide(src: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!src.index) throw new Error('loopSubdivide : géométrie indexée attendue');
  const tri = src.index.array, nT = tri.length / 3, P = src.getAttribute('position') as Attr, nV = P.count;

  // 1. soudure par position (au dixième de millimètre)
  const weld = new Int32Array(nV), first = new Map<string, number>();
  for (let i = 0; i < nV; i++) {
    const k = Math.round(P.getX(i) * 1e4) + ',' + Math.round(P.getY(i) * 1e4) + ',' + Math.round(P.getZ(i) * 1e4);
    const f = first.get(k); if (f === undefined) { first.set(k, i); weld[i] = i; } else weld[i] = f;
  }
  // 2. arêtes soudées : sommets opposés ; voisins ; bords
  const ek = (a: number, b: number) => (a < b ? a * nV + b : b * nV + a);
  const opp = new Map<number, number[]>(), nb: Set<number>[] = Array.from({ length: nV }, () => new Set<number>());
  for (let t = 0; t < nT; t++) {
    const v = [weld[tri[t * 3]], weld[tri[t * 3 + 1]], weld[tri[t * 3 + 2]]];
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3], c = v[(e + 2) % 3], k = ek(a, b);
      const o = opp.get(k); if (o) o.push(c); else opp.set(k, [c]);
      nb[a].add(b); nb[b].add(a);
    }
  }
  const isBoundEdge = (a: number, b: number) => (opp.get(ek(a, b))?.length ?? 0) !== 2;
  const bnb: number[][] = Array.from({ length: nV }, () => []);
  for (let a = 0; a < nV; a++) if (weld[a] === a) for (const b of nb[a]) if (isBoundEdge(a, b)) bnb[a].push(b);

  // 3. nouveaux sommets : les anciens gardent leur place, un par arête non soudée (i, j) ensuite
  const oddOf = new Map<number, number>(), odd: [number, number][] = [], ok = (a: number, b: number) => (a < b ? a * nV + b : b * nV + a);
  const newTri = new Uint32Array(nT * 12);
  for (let t = 0; t < nT; t++) {
    const v = [tri[t * 3], tri[t * 3 + 1], tri[t * 3 + 2]], m = [0, 0, 0];
    for (let e = 0; e < 3; e++) {
      const a = v[e], b = v[(e + 1) % 3], k = ok(a, b);
      let id = oddOf.get(k); if (id === undefined) { id = nV + odd.length; odd.push([a, b]); oddOf.set(k, id); }
      m[e] = id;
    }
    newTri.set([v[0], m[0], m[2], m[0], v[1], m[1], m[2], m[1], v[2], m[0], m[1], m[2]], t * 12);
  }
  const N = nV + odd.length;

  // règles de Loop sur un tableau xyz (positions ou décalages de morphe), indexé par sommet non soudé
  const loopXYZ = (A: Attr): Float32Array => {
    const out = new Float32Array(N * 3), ev = new Float32Array(nV * 3), done = new Uint8Array(nV);
    const get = (i: number, c: number) => A.getComponent(i, c);
    for (let i = 0; i < nV; i++) {
      const w = weld[i];
      if (!done[w]) {
        done[w] = 1; const B = bnb[w];
        for (let c = 0; c < 3; c++) {
          let val: number;
          if (B.length) val = B.length === 2 ? 0.75 * get(w, c) + 0.125 * (get(B[0], c) + get(B[1], c)) : get(w, c);
          else { const n = nb[w].size, beta = n > 3 ? 3 / (8 * n) : 3 / 16; let s = 0; for (const q of nb[w]) s += get(q, c); val = (1 - n * beta) * get(w, c) + beta * s; }
          ev[w * 3 + c] = val;
        }
      }
      for (let c = 0; c < 3; c++) out[i * 3 + c] = ev[w * 3 + c];
    }
    odd.forEach(([i, j], q) => {
      const a = weld[i], b = weld[j], o = opp.get(ek(a, b)), id = (nV + q) * 3;
      for (let c = 0; c < 3; c++) out[id + c] = o && o.length === 2 ? 0.375 * (get(a, c) + get(b, c)) + 0.125 * (get(o[0], c) + get(o[1], c)) : 0.5 * (get(a, c) + get(b, c));
    });
    return out;
  };

  const g = new THREE.BufferGeometry();
  g.setIndex(new THREE.BufferAttribute(newTri, 1));
  g.setAttribute('position', new THREE.BufferAttribute(loopXYZ(P), 3));
  // attributs interpolés au milieu de l'arête (de part et d'autre des coutures)
  for (const name of Object.keys(src.attributes)) {
    if (name === 'position' || name === 'normal' || name === 'skinIndex' || name === 'skinWeight') continue;
    const A = src.getAttribute(name) as Attr, s = A.itemSize, out = new Float32Array(N * s);
    for (let i = 0; i < nV; i++) for (let c = 0; c < s; c++) out[i * s + c] = A.getComponent(i, c);
    const discrete = name === 'aTint';
    odd.forEach(([i, j], q) => { for (let c = 0; c < s; c++) { const a = A.getComponent(i, c), b = A.getComponent(j, c); out[(nV + q) * s + c] = discrete ? (a === b ? a : Math.max(a, b)) : 0.5 * (a + b); } });
    g.setAttribute(name, new THREE.BufferAttribute(out, s, (A as THREE.BufferAttribute).normalized));
  }
  // poids de peau : les deux extrémités fusionnées, quatre influences gardées
  const SI = src.getAttribute('skinIndex') as Attr, SW = src.getAttribute('skinWeight') as Attr;
  if (SI && SW) {
    const si = new Uint16Array(N * 4), sw = new Float32Array(N * 4);
    for (let i = 0; i < nV; i++) for (let c = 0; c < 4; c++) { si[i * 4 + c] = SI.getComponent(i, c); sw[i * 4 + c] = SW.getComponent(i, c); }
    odd.forEach(([i, j], q) => {
      const acc = new Map<number, number>();
      for (const v of [i, j]) for (let c = 0; c < 4; c++) { const w = SW.getComponent(v, c) * 0.5; if (w > 0) acc.set(SI.getComponent(v, c), (acc.get(SI.getComponent(v, c)) || 0) + w); }
      const top = [...acc].sort((x, y) => y[1] - x[1]).slice(0, 4), tot = top.reduce((s2, x) => s2 + x[1], 0) || 1;
      top.forEach(([b, w], c) => { si[(nV + q) * 4 + c] = b; sw[(nV + q) * 4 + c] = w / tot; });
    });
    for (let i = 0; i < N; i++) { const t = sw[i * 4] + sw[i * 4 + 1] + sw[i * 4 + 2] + sw[i * 4 + 3]; if (t > 0) for (let c = 0; c < 4; c++) sw[i * 4 + c] /= t; }   // poids normalisés (la source en a quelques-uns qui ne somment pas à 1)
    g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  }
  // morphes : mêmes règles sur les décalages
  const mp = src.morphAttributes.position;
  if (mp && mp.length) g.morphAttributes.position = mp.map((A) => new THREE.BufferAttribute(loopXYZ(A as Attr), 3));
  g.morphTargetsRelative = src.morphTargetsRelative;
  // normales sur la topologie soudée de la nouvelle surface
  const pos = g.getAttribute('position') as THREE.BufferAttribute, nw = new Int32Array(N);
  { const f2 = new Map<string, number>(); for (let i = 0; i < N; i++) { const k = Math.round(pos.getX(i) * 1e4) + ',' + Math.round(pos.getY(i) * 1e4) + ',' + Math.round(pos.getZ(i) * 1e4); const f = f2.get(k); if (f === undefined) { f2.set(k, i); nw[i] = i; } else nw[i] = f; } }
  const acc = new Float32Array(N * 3), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let t = 0; t < newTri.length; t += 3) {
    const i0 = newTri[t], i1 = newTri[t + 1], i2 = newTri[t + 2];
    a.fromBufferAttribute(pos, i0); b.fromBufferAttribute(pos, i1); c.fromBufferAttribute(pos, i2);
    b.sub(a); c.sub(a); b.cross(c);   // normale pondérée par l'aire
    for (const i of [i0, i1, i2]) { const w = nw[i] * 3; acc[w] += b.x; acc[w + 1] += b.y; acc[w + 2] += b.z; }
  }
  const nrm = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const w = nw[i] * 3, l = Math.hypot(acc[w], acc[w + 1], acc[w + 2]) || 1; nrm[i * 3] = acc[w] / l; nrm[i * 3 + 1] = acc[w + 1] / l; nrm[i * 3 + 2] = acc[w + 2] / l; }
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  for (const gr of src.groups) g.addGroup(gr.start * 4, gr.count * 4, gr.materialIndex);
  g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData = { ...src.userData, subdiv: 1 };
  return g;
}
