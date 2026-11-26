import type { StorageBackend, StoredRecord } from './types';
import { PREFIX } from './types';

/** IndexedDB : base `valdessapins`, magasin `kv` (clé → StoredRecord). */
export class IndexedDbBackend implements StorageBackend {
  readonly name = 'indexeddb';
  private constructor(private readonly db: IDBDatabase) {}

  static open(dbName = 'valdessapins', timeoutMs = 3000): Promise<IndexedDbBackend> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB absent')); return; }
      const timer = setTimeout(() => reject(new Error('IndexedDB : délai dépassé')), timeoutMs);
      let req: IDBOpenDBRequest;
      try { req = indexedDB.open(dbName, 1); } catch (e) { clearTimeout(timer); reject(e as Error); return; }
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv'); };
      req.onsuccess = () => { clearTimeout(timer); resolve(new IndexedDbBackend(req.result)); };
      req.onerror = () => { clearTimeout(timer); reject(req.error ?? new Error('IndexedDB : ouverture refusée')); };
      req.onblocked = () => { clearTimeout(timer); reject(new Error('IndexedDB : base bloquée')); };
    });
  }

  private run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('kv', mode);
      const req = fn(tx.objectStore('kv'));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error ?? req.error);
      tx.onabort = () => reject(tx.error ?? new Error('transaction annulée'));
    });
  }

  async get(key: string): Promise<StoredRecord | null> {
    const r = await this.run('readonly', (s) => s.get(key) as IDBRequest<StoredRecord | undefined>);
    return r && typeof r.value === 'string' ? r : null;
  }
  async set(key: string, record: StoredRecord): Promise<void> { await this.run('readwrite', (s) => s.put(record, key)); }
  async remove(key: string): Promise<void> { await this.run('readwrite', (s) => s.delete(key)); }
  async keys(): Promise<string[]> { return (await this.run('readonly', (s) => s.getAllKeys())).map(String); }
}

/** localStorage : repli quand IndexedDB est indisponible, et miroir de secours des sauvegardes. */
export class LocalStorageBackend implements StorageBackend {
  readonly name = 'localstorage';
  static available(): boolean {
    try { const k = PREFIX + '__probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch { return false; }
  }
  async get(key: string): Promise<StoredRecord | null> { const v = LocalStorageBackend.read(key); return v === null ? null : { value: v, at: 0, mirrored: true }; }
  async set(key: string, record: StoredRecord): Promise<void> { localStorage.setItem(key, record.value); }
  async remove(key: string): Promise<void> { localStorage.removeItem(key); }
  async keys(): Promise<string[]> {
    const out: string[] = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(PREFIX)) out.push(k); } } catch { /* bloqué */ }
    return out;
  }
  static read(key: string): string | null { try { return localStorage.getItem(key); } catch { return null; } }
  static write(key: string, value: string): boolean { try { localStorage.setItem(key, value); return true; } catch { return false; } }
}

/** Mémoire : dernier repli (stockage bloqué), la partie dure le temps de la visite — comme game.html. */
export class MemoryBackend implements StorageBackend {
  readonly name = 'memory';
  private readonly m = new Map<string, StoredRecord>();
  async get(key: string): Promise<StoredRecord | null> { return this.m.get(key) ?? null; }
  async set(key: string, record: StoredRecord): Promise<void> { this.m.set(key, record); }
  async remove(key: string): Promise<void> { this.m.delete(key); }
  async keys(): Promise<string[]> { return [...this.m.keys()]; }
}
