/* Outils communs aux tests Playwright de Val des Sapins.

   - Deux cibles : `web` (dist/ servi par `vite preview`) et `legacy` (game.html d'origine, via ../index.html) :
     les tests de parité jouent exactement le même scénario sur les deux.
   - Déterminisme : Math.random est remplacé par un générateur à graine, et requestAnimationFrame par une file
     pilotée à la main (`pump`) avec des horodatages synthétiques : deux exécutions voient la même suite d'images.
   - Le rendu est logiciel (SwiftShader) : une image coûte de 0,5 à plusieurs secondes, on en rend donc peu. */
import { expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(here, '../..');
export type Target = 'web' | 'legacy';
/** Tranche en cours (dossier des captures, sévérité des contrôles). */
export const TRANCHE = process.env.VDS_TRANCHE ?? 'T5';
export const trancheNum = (t = TRANCHE): number => Number(t.replace(/\D/g, '')) || 0;
export const URLS: Record<Target, string> = {
  web: process.env.VDS_WEB_URL ?? 'http://localhost:4173/',
  legacy: 'file://' + path.join(REPO, 'index.html'),
};

/** game.html (via ../index.html) est-il encore là ? Après son retrait, les tests comparent la version web aux
 *  références figées dans tests/baselines/ (enregistrées depuis game.html avec VDS_WRITE_BASELINES=1). */
export const HAS_LEGACY = fs.existsSync(URLS.legacy.replace('file://', ''));

export async function reference<T>(name: string, legacy: () => Promise<T>): Promise<T> {
  const file = path.resolve('tests/baselines', name + '.json');
  if (HAS_LEGACY) {
    const v = await legacy();
    if (process.env.VDS_WRITE_BASELINES) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(v, null, 1) + '\n'); }
    return v;
  }
  if (!fs.existsSync(file)) throw new Error('référence absente : ' + file);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export interface OpenOptions {
  /** rAF piloté à la main (par défaut) ; false = boucle réelle du navigateur. */
  manual?: boolean;
  seed?: number;
  /** Paramètres d'adresse ajoutés (ex. « proto=all »). */
  query?: string;
  /** Script exécuté avant le jeu (préparer une sauvegarde, bloquer le stockage…). */
  before?: () => void;
}

export async function openGame(page: Page, target: Target, o: OpenOptions = {}): Promise<number> {
  const manual = o.manual ?? true;
  await page.addInitScript(({ seed, manual }) => {
    let a = seed >>> 0;
    Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const w = window as unknown as Record<string, unknown>;
    w.__errors = [];
    window.addEventListener('error', (e) => (w.__errors as string[]).push(String(e.message)));
    if (manual) {
      const q: FrameRequestCallback[] = [];
      // horloge synthétique : performance.now() et les horodatages de rAF n'avancent qu'avec `pump`.
      // Les budgets de temps du jeu (assemblage des bâtiments proches) deviennent ainsi reproductibles.
      let now = 0;
      const real = performance.now.bind(performance);
      w.__realNow = real;
      performance.now = () => now;
      w.__rafq = q;
      window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
      w.__pump = (n: number, dt = 1 / 60) => {
        for (let i = 0; i < n; i++) { now += dt * 1000; const cbs = q.splice(0); for (const cb of cbs) cb(now); }
      };
    }
  }, { seed: o.seed ?? 12345, manual });
  if (o.before) await page.addInitScript(o.before);
  const t0 = Date.now();
  await page.goto(URLS[target] + (o.query ? '?' + o.query : ''));
  await page.waitForFunction(() => (window as unknown as { __ski?: { ready: boolean } }).__ski?.ready === true, null, { timeout: 300_000, polling: 500 });
  return Date.now() - t0;
}

/** Fait avancer la boucle principale de n images (rendu compris). */
export async function pump(page: Page, n = 1, dt = 1 / 60): Promise<void> {
  await page.evaluate(([n, dt]) => (window as unknown as { __pump: (n: number, dt: number) => void }).__pump(n, dt), [n, dt] as const);
}

export async function pageErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __errors: string[] }).__errors);
}

export async function expectNoErrors(page: Page): Promise<void> {
  expect(await pageErrors(page)).toEqual([]);
}

/** Lancement « Chausser les skis » sans passer par l'audio réel. */
export async function start(page: Page): Promise<void> {
  await page.evaluate(() => (window as unknown as { __ski: { startGame: () => void } }).__ski.startGame());
}

/* ---------------------------------------------------------------- pilote automatique (exécuté dans la page)
   Suit les échantillons d'une piste : vise un point quelques échantillons plus bas, braque avec ←/→, freine
   au-delà d'une vitesse plafond (65 km/h sur rouge et noire, 43 sur verte, comme le pilote de test d'origine). */
export const AUTOPILOT = `
(() => {
  const s = window.__ski, P = s.P, I = s.input;
  const wrap = a => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
  const heading = () => { const v = P.vel; return Math.hypot(v.x, v.z) > 1 ? Math.atan2(v.x, v.z) : P.yaw; };
  function steerTo(tx, tz, capKmh, sign) {
    const want = Math.atan2(tx - P.pos.x, tz - P.pos.z), err = wrap(want - heading()), sp = P.vel.length() * 3.6;
    I.left = err * sign > 0.06; I.right = err * sign < -0.06;
    I.down = sp > capKmh || Math.abs(err) > 1.2 && sp > 25; I.up = sp < capKmh * 0.6 && Math.abs(err) < 0.5;
  }
  function runPiste(p, opts) {
    const S = p.samples, cap = opts.cap || (p.lvl === 'verte' ? 43 : 65), sign = opts.sign || 1;
    const i0 = Math.min(3, S.length - 4), a = S[i0], b = S[Math.min(S.length - 1, i0 + 3)];
    s.teleport(a.x, a.z, Math.atan2(b.x - a.x, b.z - a.z)); s.clear();
    let idx = i0, t = 0, falls = 0, still = 0, prev = P.state, maxSp = 0, offT = 0;
    const dt = s.STEP, limit = opts.limit || Math.max(120, S.length * 3);
    while (t < limit) {
      let bi = idx, bd = 1e9;
      for (let i = Math.max(0, idx - 2); i < Math.min(S.length, idx + 30); i++) { const d = Math.hypot(S[i].x - P.pos.x, S[i].z - P.pos.z); if (d < bd) { bd = d; bi = i; } }
      if (bd < (p.w || 20) / 2 + 30) { idx = Math.max(idx, bi); offT = 0; } else offT += dt;
      if (idx >= S.length - 3) return { ok: true, t, falls, maxSp, idx, n: S.length };
      const look = S[Math.min(S.length - 1, idx + (opts.look || 3))];
      if (P.state === 'ski' || P.state === 'air') steerTo(look.x, look.z, cap, sign); else s.clear();
      s.stepSim(dt); t += dt;
      if (P.state === 'crash' && prev !== 'crash') falls++;
      prev = P.state;
      const sp = P.vel.length(); maxSp = Math.max(maxSp, sp * 3.6);
      still = sp < 0.4 && P.state === 'ski' ? still + dt : 0;
      if (still > 8 || offT > 20) break;
    }
    s.clear();
    return { ok: false, t, falls, maxSp, idx, n: S.length, x: Math.round(P.pos.x), z: Math.round(P.pos.z) };
  }
  function rideLift(i) {
    const L = s.LIFTS[i]; s.unlockAll(); s.teleportLiftTop(i);
    s.teleport(L.board.x, L.board.z, L.yaw); s.clear(); s.queued.add('action'); s.stepSim(s.STEP);
    if (P.state !== 'lift') return { ok: false, why: 'embarquement' };
    s.input.up = true; let t = 0;
    while (P.state === 'lift' && t < 900) { s.stepSim(s.STEP); t += s.STEP; }
    s.clear();
    const d = Math.hypot(P.pos.x - L.exit[0], P.pos.z - L.exit[1]);
    return { ok: P.state === 'ski' && d < 3, t: Math.round(t), d };
  }
  window.__auto = { steerTo, runPiste, rideLift, wrap };
})();
`;
