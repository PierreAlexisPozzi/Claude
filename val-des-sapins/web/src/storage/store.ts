/* Magasin du jeu : point d'entrée unique de la sauvegarde.

   - Au démarrage (`ready()`), toutes les clés `valdessapins.*` sont lues en mémoire depuis IndexedDB
     (repli : localStorage, puis mémoire). Le code du jeu, synchrone, lit ensuite `STORE.getItem()` comme il lisait
     localStorage, et `STORE.setItem()` écrit en mémoire puis persiste en arrière-plan.
   - Migration versionnée (schéma v1) : les sauvegardes de game.html (`valdessapins.rider`, `valdessapins.ghosts`,
     `valdessapins.quality`, et l'ancien `valdessapins.challenges`) sont COPIÉES dans IndexedDB. localStorage n'est
     jamais vidé : il reste un miroir de chaque écriture, ce qui garde la sauvegarde lisible par l'ancienne version.
   - Si l'ancienne version (game.html) a écrit après nous, sa valeur plus récente est reprise au démarrage. */
import { IndexedDbBackend, LocalStorageBackend, MemoryBackend } from './backends';
import type { StorageBackend, StoredRecord } from './types';
import { KEYS, PREFIX, SCHEMA_VERSION } from './types';

export interface SchemaInfo { version: number; migratedFrom: string; at: string; keys: string[] }

class GameStore {
  private cache = new Map<string, string>();
  private backend: StorageBackend = new MemoryBackend();
  private pending = new Map<string, Promise<void>>();
  private started: Promise<void> | null = null;
  /** Journal lisible par les tests (migration, repli). */
  readonly log: string[] = [];

  get backendName(): string { return this.backend.name; }

  ready(): Promise<void> {
    if (!this.started) this.started = this.start();
    return this.started;
  }

  private async start(): Promise<void> {
    try {
      this.backend = await IndexedDbBackend.open();
    } catch (e) {
      this.log.push('IndexedDB indisponible : ' + (e as Error).message);
      this.backend = LocalStorageBackend.available() ? new LocalStorageBackend() : new MemoryBackend();
    }
    this.log.push('stockage : ' + this.backend.name);
    try {
      await this.migrate();
      for (const k of await this.backend.keys()) {
        if (!k.startsWith(PREFIX) || k === KEYS.schema) continue;
        const r = await this.backend.get(k);
        if (r) this.cache.set(k, r.value);
      }
    } catch (e) {
      // dernier filet : on lit localStorage directement, la partie continue
      this.log.push('lecture impossible : ' + (e as Error).message);
      for (const k of Object.values(KEYS)) { const v = LocalStorageBackend.read(k); if (v !== null) this.cache.set(k, v); }
    }
  }

  /** v0 → v1 : copie de localStorage vers IndexedDB, puis réconciliation clé par clé à chaque démarrage. */
  private async migrate(): Promise<void> {
    if (this.backend.name !== 'indexeddb') return;   // localStorage est déjà la source : rien à migrer
    const b = this.backend;
    const schemaRec = await b.get(KEYS.schema);
    const schema = schemaRec ? (JSON.parse(schemaRec.value) as SchemaInfo) : null;
    const lsKeys = await new LocalStorageBackend().keys();
    if (!schema || schema.version < SCHEMA_VERSION) {
      const copied: string[] = [];
      for (const k of lsKeys) {
        const v = LocalStorageBackend.read(k);
        if (v === null || (await b.get(k))) continue;
        await b.set(k, { value: v, at: Date.now(), mirrored: true });
        copied.push(k);
      }
      const info: SchemaInfo = { version: SCHEMA_VERSION, migratedFrom: 'localStorage', at: new Date().toISOString(), keys: copied };
      await b.set(KEYS.schema, { value: JSON.stringify(info), at: Date.now() });
      this.log.push(`migration v${schema?.version ?? 0} → v${SCHEMA_VERSION} : ${copied.length} clé(s) copiée(s)`);
      return;
    }
    // déjà migré : une écriture plus récente de l'ancienne version (game.html) dans localStorage est reprise
    for (const k of lsKeys) {
      const v = LocalStorageBackend.read(k), r = await b.get(k);
      if (v === null || k === KEYS.schema) continue;
      if (!r || (r.mirrored && r.value !== v)) {
        await b.set(k, { value: v, at: Date.now(), mirrored: true });
        this.log.push('repris de localStorage : ' + k);
      }
    }
  }

  /** Lecture synchrone (après `ready()`), même contrat que localStorage.getItem. */
  getItem(key: string): string | null { return this.cache.has(key) ? (this.cache.get(key) as string) : null; }

  /** Écriture synchrone en mémoire, persistée en arrière-plan ; ne lève jamais d'exception. */
  setItem(key: string, value: string): void {
    value = String(value);
    this.cache.set(key, value);
    const prev = this.pending.get(key) ?? Promise.resolve();
    const job = prev.then(async () => {
      const mirrored = this.backend.name === 'localstorage' ? true : LocalStorageBackend.write(key, value);
      const rec: StoredRecord = { value, at: Date.now(), mirrored };
      try { await this.backend.set(key, rec); } catch (e) { this.log.push('écriture refusée (' + key + ') : ' + (e as Error).message); }
    });
    this.pending.set(key, job);
    void job.finally(() => { if (this.pending.get(key) === job) this.pending.delete(key); });
  }

  /** API asynchrone pour le nouveau code (boutique, online…). */
  async get(key: string): Promise<string | null> { await this.ready(); return this.getItem(key); }
  async set(key: string, value: string): Promise<void> { await this.ready(); this.setItem(key, value); await this.flush(); }

  /** Attend la fin des écritures en cours (tests, fermeture de page). */
  async flush(): Promise<void> { await Promise.all([...this.pending.values()]); }

  async schema(): Promise<SchemaInfo | null> {
    const r = await this.backend.get(KEYS.schema).catch(() => null);
    return r ? (JSON.parse(r.value) as SchemaInfo) : null;
  }
}

export const STORE = new GameStore();
