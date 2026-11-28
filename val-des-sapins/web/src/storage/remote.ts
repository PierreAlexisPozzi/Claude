/* Implémentation « API distante » de StorageBackend — préparée, NON branchée.
   Elle servira au module `online` (sauvegarde cloud, classements, partage de fantômes) quand un serveur sera choisi
   et validé. Aucun appel réseau n'est fait tant que `ONLINE.enabled` vaut false (valeur par défaut). */
import type { StorageBackend, StoredRecord } from './types';

export interface RemoteConfig {
  /** URL de base de l'API, ex. https://exemple.org/api/v1 (aucune par défaut). */
  baseUrl: string;
  /** Jeton de session fourni par le module online (jamais stocké en clair dans le dépôt). */
  token?: () => string | null;
}

/** Contrat REST attendu (à implémenter côté serveur) :
 *  GET    {base}/kv            → string[]           (clés du joueur)
 *  GET    {base}/kv/{clé}      → StoredRecord | 404
 *  PUT    {base}/kv/{clé}      ← StoredRecord       (le plus récent gagne, d'après `at`)
 *  DELETE {base}/kv/{clé} */
export class RemoteBackend implements StorageBackend {
  readonly name = 'remote';
  constructor(private readonly cfg: RemoteConfig) {}
  private async req(path: string, init?: RequestInit): Promise<Response> {
    const t = this.cfg.token?.();
    return fetch(this.cfg.baseUrl.replace(/\/$/, '') + path, {
      ...init,
      headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) },
    });
  }
  async get(key: string): Promise<StoredRecord | null> {
    const r = await this.req('/kv/' + encodeURIComponent(key));
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('remote get ' + r.status);
    return (await r.json()) as StoredRecord;
  }
  async set(key: string, record: StoredRecord): Promise<void> {
    const r = await this.req('/kv/' + encodeURIComponent(key), { method: 'PUT', body: JSON.stringify(record) });
    if (!r.ok) throw new Error('remote set ' + r.status);
  }
  async remove(key: string): Promise<void> { await this.req('/kv/' + encodeURIComponent(key), { method: 'DELETE' }); }
  async keys(): Promise<string[]> { const r = await this.req('/kv'); return r.ok ? ((await r.json()) as string[]) : []; }
}
