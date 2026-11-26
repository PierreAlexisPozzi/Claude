# Mesures — tranche T2 (assets compressés, tuiles, cache hors ligne)

Même machine qu'en T1 : 4 cœurs, Chromium sans GPU (SwiftShader). Temps indicatifs.

## Assets (détail par fichier : `assets_T2.json`)

| | Avant (T1) | Après (T2) | Commentaire |
|---|---|---|---|
| Modèles `.glb` (9) | 2 589 Ko | **1 294 Ko** | EXT_meshopt_compression, sans perte : géométrie identique au bit près |
| Textures (18) | 1 648 Ko (JPEG/PNG) | 4 555 Ko (KTX2 UASTC + Zstandard, mipmaps) | plus lourd à télécharger, mais voir la mémoire GPU |
| Mémoire GPU des textures (estimée) | ~26 Mo (RGBA décompressé + mipmaps) | **~6,5 Mo** (BC7 / ASTC 4×4 / ETC2) | textures compressées dans le GPU, plus de décodage JPEG sur le fil principal |
| Relief + données du domaine | 339 Ko (4 fichiers) | 343 Ko (91 tuiles + index) | reconstruction exacte vérifiée à la génération |

Choix assumé (consigne « qualité d'abord, pas de budget de taille ») : UASTC haute qualité plutôt qu'ETC1S. ETC1S
diviserait le poids des textures par 3 à 4, mais avec une perte visible sur les normales et les dégradés.

## Parité avec game.html

| Test | Résultat |
|---|---|
| État initial, robot (113/115 pistes, 17/17 remontées), slalom | identiques au bit près (les tuiles et meshopt sont sans perte) |
| Appels de dessin / triangles à Plagne Centre | identiques : 1 726 / 8 243 294 (ordinateur), 1 282 / 4 363 960 (tactile) |
| Vues de référence (KTX2 avec pertes) | écart moyen 0,49/255 sur 31 vues ordinateur (max 1,65, façade de la tour), 0,23/255 sur 6 vues téléphone ; planche `planche_T2_assets.jpg` |
| HUD | plus aucun chevauchement aux trois tailles (pile de toasts corrigée), contrôle désormais strict |
| Temps de frame (en série, 8 images × 2 essais) | médianes web 24 et 30 ms, game.html 28 et 28 ms : équivalent (bruit du rendu logiciel ±30 %) |
| Hors ligne | après une première visite, le jeu redémarre sans réseau (service worker) |

## Références figées

Les résultats de game.html sont enregistrés dans `web/tests/baselines/` (état initial, robot, slalom, HUD aux trois
tailles, performances). Après le retrait de game.html, les tests comparent la version web à ces références.
