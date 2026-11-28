/* Module « online » — DÉSACTIVÉ par défaut, aucun serveur n'est déployé.
   Prévu pour : sauvegarde dans le cloud, classement des chronos, partage des fantômes.
   Il s'appuiera sur RemoteBackend (src/storage/remote.ts) ; le choix du service est documenté dans
   review/etude_outils.md et reste soumis à accord. */
import { RemoteBackend } from '../storage/remote';

export interface OnlineConfig { enabled: boolean; baseUrl: string }
export const ONLINE: OnlineConfig = { enabled: false, baseUrl: '' };

export interface LeaderboardEntry { run: string; player: string; time: number; at: string }
export interface OnlineApi {
  backend: RemoteBackend;
  submitTime(run: string, time: number, ghost?: string): Promise<void>;
  leaderboard(run: string): Promise<LeaderboardEntry[]>;
}

/** Renvoie null tant que le module est désactivé : le jeu reste 100 % local. */
export function connectOnline(cfg: OnlineConfig = ONLINE): OnlineApi | null {
  if (!cfg.enabled || !cfg.baseUrl) return null;
  const backend = new RemoteBackend({ baseUrl: cfg.baseUrl });
  const base = cfg.baseUrl.replace(/\/$/, '');
  return {
    backend,
    async submitTime(run, time, ghost) {
      await fetch(base + '/times', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ run, time, ghost }) });
    },
    async leaderboard(run) {
      const r = await fetch(base + '/times?run=' + encodeURIComponent(run));
      return r.ok ? ((await r.json()) as LeaderboardEntry[]) : [];
    },
  };
}
