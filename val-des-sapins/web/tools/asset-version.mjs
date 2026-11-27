/* Version des assets (T5 bis) : empreinte SHA-1 (10 caractères) des noms et contenus de public/assets. Lue par
   vite.config.ts et injectée dans le jeu (__ASSET_VERSION__). */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function assetVersion(dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/assets')) {
  const h = createHash('sha1');
  const walk = (d) => { for (const f of fs.readdirSync(d).sort()) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else { h.update(path.relative(dir, p)); h.update(fs.readFileSync(p)); } } };
  if (fs.existsSync(dir)) walk(dir);
  return h.digest('hex').slice(0, 10);
}
