# Crédits — Val des Sapins

Projet personnel, gratuit et **non commercial**. Adaptation libre et **non officielle** du secteur
Plagne Centre – Aime 2000 de La Plagne : aucun lien avec la station ni avec ses exploitants.

## Code intégré au jeu (licences permissives uniquement)

| Composant | Version | Licence | Source | Usage |
|---|---|---|---|---|
| Three.js | 0.187.0 (figée) | MIT | <https://github.com/mrdoob/three.js> | Rendu 3D, chargeur glTF, post-traitement (GTAO, bloom, FXAA) |
| meshoptimizer — décodeur (fourni avec three.js) | 1.1 | MIT | <https://github.com/zeux/meshoptimizer> | Décompression des modèles EXT_meshopt_compression |
| Basis Universal — transcodeur (fourni avec three.js) | — | Apache 2.0 | <https://github.com/BinomialLLC/basis_universal> | Transcodage des textures KTX2 vers les formats GPU (ASTC, BC7, ETC2) |
| N8AO (prototype `?proto=rendu`) | 2.1.0 | CC0 1.0 (dépôt) ; ISC (paquet npm) | <https://github.com/N8python/n8ao> | Occlusion ambiante |
| Fontsource — Barlow, Barlow Condensed | 5.3.0 | SIL Open Font License 1.1 (polices et paquets) | <https://fontsource.org/fonts/barlow-condensed> · <https://github.com/jpt/barlow> | Polices du HUD, servies avec le jeu |

## Outils de production (non intégrés au jeu)

| Outil | Licence | Usage |
|---|---|---|
| Vite 8.3.8 | MIT | Serveur de développement et construction de `dist/` |
| TypeScript 6.0.3 | Apache 2.0 | Typage (strict progressif) |
| Playwright 1.63.0 | Apache 2.0 | Tests automatiques (Chromium) |
| acorn, eslint-scope, magic-string | MIT / BSD-2-Clause / MIT | Découpage de `game.html` en modules (`web/tools/split-game.mjs`) |
| glTF-Transform 4.5.1 | MIT | Écriture des modèles compressés (`web/tools/build-assets.mjs`) |
| meshoptimizer 1.3.0 (encodeur) | MIT | Compression meshopt sans perte des modèles |
| ktx2-encoder 0.6.0 (encodeur Basis Universal en WASM, Apache 2.0) | MIT | Textures KTX2 UASTC + Zstandard |
| jpeg-js 0.4.4, pngjs 7.0.0 | BSD-3-Clause, MIT | Lecture des images sources avant encodage |
| Blender 5.3 (module Python `bpy`) | GPL 3 (outil seulement) | Modèles et textures (`blender/`) |

## Données

| Données | Licence | Traitement |
|---|---|---|
| OpenStreetMap (pistes, remontées, bâtiments) | ODbL 1.0 — © les contributeurs d'OpenStreetMap | `tools/plagne_data.py` |
| IGN RGE ALTI (via tuiles Mapterhorn) | Licence ouverte Etalab 2.0 | Relief du secteur |
| Copernicus DEM GLO-30 (via tuiles Mapterhorn) | Licence Copernicus (libre, attribution) | Relief lointain et horizon |
| MakeHuman — maillage de base, morphes, poids, textures de peau, unités d'expression | CC0 | Corps et visages des personnages (`blender/humans.py`) |

## Matières

| Matière | Source | Licence | Usage |
|---|---|---|---|
| Concrete013, WoodSiding009, Planks037A | ambientCG — <https://ambientcg.com> | CC0 1.0 | Prototype de façade et de terrasse (`?proto=facade`), converties en KTX2 par `web/tools/proto-textures.mjs` |

L'attribution des données est affichée sur l'écran d'accueil et sur le plan des pistes.
Les références visuelles (photos de Wikimedia Commons) sont consultées sans être intégrées : liens, auteurs et licences
dans `review/references/README.md`. L'étude des outils se trouve dans `review/etude_outils.md`.
