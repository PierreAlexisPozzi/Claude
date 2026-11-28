/* Couche de stockage unique du jeu : progression (carnet de rider), fantômes, réglages.
   Interface asynchrone, pour pouvoir brancher plus tard une implémentation distante (module « online »)
   sans toucher au jeu. Les valeurs sont des chaînes JSON, exactement celles qu'écrivait game.html. */

export interface StorageBackend {
  /** Nom lisible, pour les tests et le diagnostic. */
  readonly name: string;
  get(key: string): Promise<StoredRecord | null>;
  set(key: string, record: StoredRecord): Promise<void>;
  remove(key: string): Promise<void>;
  /** Toutes les clés présentes (préfixe `valdessapins.` attendu). */
  keys(): Promise<string[]>;
}

export interface StoredRecord {
  value: string;
  /** Horodatage de l'écriture (ms). */
  at: number;
  /** La même valeur a bien été recopiée dans localStorage (miroir de secours). */
  mirrored?: boolean;
}

/** Clés connues du jeu. */
export const KEYS = {
  rider: 'valdessapins.rider',
  ghosts: 'valdessapins.ghosts',
  quality: 'valdessapins.quality',
  legacyChallenges: 'valdessapins.challenges',
  schema: 'valdessapins.__schema',
} as const;

export const PREFIX = 'valdessapins.';

/** Version du schéma de sauvegarde. v1 : migration depuis localStorage (game.html) vers IndexedDB. */
export const SCHEMA_VERSION = 1;
