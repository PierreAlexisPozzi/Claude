# Étude des outils gratuits et open source — Val des Sapins

Tranche T3 (axe 0 bis). Objectif : choisir, **licence vérifiée à la source**, les outils qui serviront le saut graphique
(bâtiments, matières, visages, peau, cheveux, éclairage), puis le reste du projet. Jeu **non commercial**.

## Méthode et règles appliquées

- **Vérification au 26 novembre 2026**, à la source :
  - fichier LICENSE du dépôt (lu via raw.githubusercontent.com) ou champ `license` du paquet npm ;
  - activité : dernier push GitHub (API de recherche) et dernière publication npm ;
  - conditions des sites d'assets et de services : page de licence ou de tarifs, citée.
- **Ordre de préférence** :
  1. licences permissives (MIT, Apache 2.0, BSD, Zlib, ISC, CC0) pour tout code intégré au jeu ;
  2. GPL / AGPL seulement pour les **outils** de production ;
  3. assets CC0, puis CC BY, puis CC BY-NC ;
  4. gratuit propriétaire en dernier recours.
- **Repères** :
  - ✅ = retenu ;
  - 🟡 = possible, plus tard ou en complément ;
  - ❌ = écarté.
  - « Intégré » signifie que le code part avec le jeu ; « Outil » qu'il sert seulement à produire.
- **Signalement** : une information que je n'ai pas pu vérifier est marquée *(non vérifié)*.

---

## 1. Rendu

| Outil | Licence (source) | Open source | Coût / limites | Activité | Three.js · Vite · mobile | Gain attendu | Verdict |
|---|---|---|---|---|---|---|---|
| **Three.js** 0.187 (WebGL + WebGPU/TSL) | MIT ([LICENSE](https://github.com/mrdoob/three.js/blob/dev/LICENSE)) | oui | gratuit | push 26/11/2026 | déjà en place | base du rendu ; WebGPU/TSL ouvre le calcul GPU (neige, particules) | ✅ intégré (WebGL d'abord, WebGPU en option derrière un repli) |
| **AgX** (tone mapping de Three.js) | MIT (Three.js) | oui | gratuit | — | intégré à Three.js | blancs de neige moins « brûlés » qu'ACES, teintes plus justes | ✅ intégré (prototype `rendu`) |
| **N8AO** | CC0 ([LICENSE](https://github.com/N8python/n8ao/blob/master/LICENSE)) ; npm : ISC | oui | gratuit | push 15/11/2026 | passe EffectComposer ; demi-résolution possible sur mobile | occlusion ambiante de bien meilleure qualité que GTAO à coût égal | ✅ intégré (prototype `rendu`) |
| **pmndrs/postprocessing** | Zlib ([npm](https://www.npmjs.com/package/postprocessing)) | oui | gratuit | npm 01/11/2026 | composeur propre (fusionne les effets en une passe) | SMAA, étalonnage LUT, bloom plus efficaces | 🟡 en T4 si le composeur de Three.js devient limitant |
| **CSM** (ombres en cascade, addon de Three.js) | MIT (Three.js) | oui | gratuit | maintenu avec Three.js | addon officiel | ombres nettes près du joueur, plus loin aussi | 🟡 **non retenu en T4** : le jeu a déjà deux cascades faites main (84 m nettes, 700 m au loin, raccord dans le nuanceur) ; l'addon ajouterait une passe d'ombre par cascade (3–4), incompatible avec le plafond de 400 appels sur tactile |
| three-csm (vtHawk) | MIT (npm) | oui | gratuit | dernier npm 12/2023 | — | doublon de l'addon officiel | ❌ inactif, doublon |
| **three-mesh-bvh** | MIT (API GitHub) | oui | gratuit | push 25/11/2026 | oui | lancer de rayons rapide : collisions, placement de décor, ombres de contact | ✅ intégré dès T5 (placement d'objets) et T10 (lignes de vue des pisteurs) |
| **@takram/three-atmosphere** (+ three-clouds) | MIT ([npm](https://www.npmjs.com/package/@takram/three-atmosphere)) | oui | gratuit | npm 05/2026 | Three.js + postprocessing ; WebGL2 | ciel physique (diffusion de Rayleigh/Mie), soleil cohérent avec l'heure, perspective aérienne | 🟡 **non retenu en T4** : demande la pile « postprocessing » en plus de celle du jeu et déclare React en dépendances ; paquet de 37 Mo (vérifié avec `npm view`, v0.19.1). Remplacé par le `Sky` de three.js (Preetham, MIT) ; à réévaluer pour Ultra |
| three-good-godrays | licence de type zlib ([LICENSE](https://github.com/Ameobea/three-good-godrays/blob/main/LICENSE)) | oui | gratuit | push 05/11/2026 | dépend de postprocessing | rayons de soleil volumétriques | 🟡 option Ultra |
| **LYGIA** (bibliothèque de shaders) | Prosperity 3.0 + Patron ([LICENSE.md](https://github.com/patriciogonzalezvivo/lygia/blob/main/LICENSE.md)) : gratuit **pour un usage non commercial**, commercial payant | source disponible, **non permissive** | gratuit en non commercial | push 24/10/2026 | GLSL/WGSL à copier | bruits, éclairage, effets prêts | ❌ pour le code intégré : la règle impose une licence permissive. Consultable comme référence d'algorithme, sans copier de code. |

Neige scintillante, traces et accumulation : pas de bibliothèque dédiée et sûre trouvée. Elles seront écrites dans
nos shaders (le jeu en a déjà les bases), sur des algorithmes publics.

## 2. Bâtiments et architecture

| Outil | Licence (source) | Open source | Coût / limites | Activité | Compatibilité | Gain | Verdict |
|---|---|---|---|---|---|---|---|
| **Blender 5.3** (`bpy`), Geometry Nodes | GPL ([COPYING](https://github.com/blender/blender/blob/main/COPYING)) ; ce que l'on produit avec reste à nous | oui | gratuit | push 26/11/2026 | export glTF déjà en place | modules architecturaux procéduraux (fenêtres, balcons, chevrons, garde-corps) en vrai relief | ✅ outil (déjà utilisé) |
| **InstancedMesh2** (@three.ez/instanced-mesh) | MIT ([npm](https://www.npmjs.com/package/@three.ez/instanced-mesh)) | oui | gratuit | npm 04/11/2026 | Three.js | instances avec tri, LOD et culling par instance : des milliers de balcons et transats pour peu d'appels de dessin | ✅ intégré en T5–T6 |
| **Interior mapping** (technique) | — (déjà écrit dans le jeu) | — | — | — | shader du jeu | intérieurs derrière les vitres | ✅ déjà en place, à varier (rideaux, lumière du soir) en T5 et T15 |
| **DecalGeometry** (addon Three.js) | MIT (Three.js) | oui | gratuit | — | addon officiel | salissures, coulures, enseignes projetées | ✅ intégré en T5 |
| Imposteurs octaédriques | technique publique ; pas de bibliothèque permissive maintenue trouvée | — | — | — | — | bâtiments lointains en une carte | 🟡 à écrire nous-mêmes en T6 (rendu des imposteurs sous Blender) |

## 3. Matières et textures

| Outil | Licence (source) | Open source | Coût / limites | Activité | Compatibilité | Gain | Verdict |
|---|---|---|---|---|---|---|---|
| **ambientCG** | CC0 1.0 ([licence](https://docs.ambientcg.com/license/)) | assets | gratuit | catalogue actif | JPG/PNG 1K–8K → KTX2 par notre chaîne | béton, bois, crépi, ardoise, métal, tissu en PBR complets | ✅ assets (prototype `facade` : Concrete013, WoodSiding009, Planks037A) |
| **Poly Haven** | CC0 ([licence](https://polyhaven.com/license)) | assets | gratuit | catalogue actif ; API publique | textures, HDRI, modèles | HDRI de ciel de montagne (éclairage), matières de haute qualité | ✅ assets (HDRI en T4, matières en complément) |
| **Material Maker** | MIT (API GitHub) | oui | gratuit | push 11/11/2026 | export de cartes PBR | matières procédurales sans raccord (lauze, ardoise, crépi) | 🟡 outil en complément de Blender |
| **ArmorPaint** (armortools) | zlib ([license.md](https://github.com/armory3d/armortools/blob/main/license.md)) | oui (source) | binaires payants ; compilation gratuite *(procédure non testée ici)* | dépôt actif | — | peinture 3D (usure, salissures) | 🟡 seulement si la compilation est simple ; sinon Blender (Texture Paint) |
| **Krita** | GPL 3.0 (API GitHub) | oui | gratuit | push 26/11/2026 | — | retouche et peinture de textures | ✅ outil |
| **GIMP** | GPL 3.0 ([COPYING](https://github.com/GNOME/gimp/blob/master/COPYING)) | oui | gratuit | push 26/11/2026 | — | retouche, masques | 🟡 outil (Krita suffit) |

## 4. Visages, peau, cheveux

| Outil | Licence (source) | Open source | Coût / limites | Activité | Compatibilité | Gain | Verdict |
|---|---|---|---|---|---|---|---|
| **Assets MakeHuman** : maillage, morphes, expressions, peaux, sourcils, cils, cheveux | **assets CC0** ; code AGPL ([LICENSE.md](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md)) | oui | gratuit | dernier push 08/2024 | lus par nos scripts (déjà fait) | formes du visage, âges et morphologies variés, expressions | ✅ assets CC0 (déjà utilisés) ; le code AGPL n'est jamais intégré |
| **MPFB 2** (MakeHuman pour Blender) | code GPL 3, assets CC0 ([LICENSE.md](https://github.com/makehumancommunity/mpfb2/blob/master/LICENSE.md)) | oui | gratuit | push 26/11/2026 | Blender | générer têtes et cheveux en cartes dans Blender | ✅ outil |
| **Peau procédurale** (pores, ridules, diffusion sous la surface approchée) | notre code | — | — | — | shader du jeu (`onBeforeCompile`) | peau qui n'a plus l'air « plastique », oreilles et nez rougis | ✅ (prototype `visage`) |
| **Cheveux en cartes** (technique) | — | — | — | — | MeshPhysicalMaterial (anisotropie, transparence) de Three.js | coiffures, mèches sous le bonnet, barbes | ✅ en T7, cartes produites sous Blender (MPFB) |
| SubsurfaceScatteringShader (exemple Three.js) | MIT | oui | gratuit | — | exemple, non skinné | translucidité | ❌ ne gère pas les maillages skinnés ; notre approximation est plus simple |
| Textures de peau photo CC0 / CC BY | aucune source CC0 de qualité trouvée hors MakeHuman *(recherche non exhaustive)* | — | — | — | — | — | 🟡 rester sur MakeHuman + détail procédural |

## 5. Optimisation des assets (en place depuis T2)

| Outil | Licence | Verdict |
|---|---|---|
| **glTF-Transform** 4.5 | MIT | ✅ outil (compression des modèles) |
| **meshoptimizer** (encodeur + décodeur) | MIT | ✅ outil + intégré (décodeur) |
| **Basis Universal** (encodeur via ktx2-encoder, transcodeur via Three.js) | Apache 2.0 | ✅ outil + intégré (transcodeur) |
| KTX-Software (toktx) | Apache 2.0 ([LICENSE.md](https://github.com/KhronosGroup/KTX-Software/blob/main/LICENSE.md)) | 🟡 binaires non téléchargeables dans cet environnement ; ktx2-encoder (même encodeur Basis en WASM) les remplace |

## 6. Interfaces, HUD et outils de debug

| Outil | Licence (source) | Coût / activité | Gain | Verdict |
|---|---|---|---|---|
| **HTML/CSS natif** (HUD actuel) | — | — | zéro dépendance, contrat d'identifiants déjà testé | ✅ on garde |
| Preact 11 | MIT (npm) | actif | composants pour le téléphone et la boutique | 🟡 en T14 si le téléphone devient complexe (3 Ko) |
| Svelte 5 | MIT (npm) | actif | idem, compilé | ❌ ajoute un compilateur ; Preact suffit si besoin |
| **Lucide** (icônes SVG) | ISC ([LICENSE](https://github.com/lucide-icons/lucide/blob/main/LICENSE)) | actif | icônes cohérentes, légères | ✅ intégré (icônes à l'unité) |
| Tabler Icons | MIT (API GitHub) | actif | idem | 🟡 alternative |
| **Fontsource** (Barlow) | OFL 1.1 | actif | polices servies localement | ✅ intégré (T1) |
| **lil-gui** | MIT (npm) | 2025 | panneau de réglages du mode photo et du debug | ✅ intégré, chargé seulement en mode debug ou photo |
| Tweakpane 4 | MIT (npm) | dernier npm 11/2024 | idem, plus riche | 🟡 alternative |
| **Penpot** | MPL 2.0 (API GitHub) | gratuit, actif ; **compte requis** pour la version en ligne | maquettes du téléphone et des écrans | 🟡 outil, sous réserve de ton accord pour un compte (ou auto-hébergement) |
| **Inkscape** | GPL 2+ ([COPYING](https://gitlab.com/inkscape/inkscape/-/raw/master/COPYING)) | gratuit | SVG, pictogrammes | ✅ outil |

## 7. Animation et physique

| Outil | Licence (source) | Open source | Coût / limites | Activité | Gain | Verdict |
|---|---|---|---|---|---|---|
| **Rapier** (`@dimforge/rapier3d-compat`) | Apache 2.0 (npm) | oui | gratuit ; WASM ~1,5 Mo *(taille non mesurée ici)* | npm 25/09/2026 ; dépôt JS fusionné dans [dimforge/rapier](https://github.com/dimforge/rapier) | ragdoll (T12), collisions robustes | ✅ intégré en T12 |
| cannon-es | MIT (npm) | oui | gratuit | dernier npm 08/2022 | idem | ❌ inactif |
| **CMU Motion Capture Database** | « free for all uses », revente des données brutes interdite ([site](http://mocap.cs.cmu.edu/)) | données | gratuit | archive | marche, assis, gestes | ✅ assets (marche, terrasses en T11) |
| Cascadeur (version gratuite) | propriétaire : export **CASC uniquement** et **usage non commercial seulement** ([plans](https://cascadeur.com/plans)) | non | gratuit, export limité | actif | animation assistée par la physique | ❌ l'export glTF/FBX est payant (Indie) |
| Theatre.js | core Apache 2.0, **studio AGPL 3.0** (npm) | oui | gratuit | dernier npm 05/2024 | cinématiques, mode photo | 🟡 cœur seul possible ; le studio (AGPL) seulement comme outil, jamais livré |

## 8. IA des PNJ

| Outil | Licence (source) | Activité | Gain | Verdict |
|---|---|---|---|---|
| **recast-navigation-js** | MIT (npm/API GitHub) | npm 30/10/2026 | navmesh et foules : poursuites des pisteurs (T10), files d'attente (T11) | ✅ intégré |
| Yuka | MIT | dernier npm 09/2022 | comportements de direction, machines à états | 🟡 idées seulement (inactif sur npm) |

## 9. Audio

| Outil | Licence (source) | Coût / activité | Gain | Verdict |
|---|---|---|---|---|
| **Web Audio** (natif) | — | — | le jeu synthétise déjà ses sons | ✅ on garde |
| **Tone.js** | MIT (npm) | actif (11/2026) | radio d'ambiance procédurale (T14), séquenceur | ✅ intégré en T14 |
| Howler.js | MIT (API GitHub) | dernier npm 09/2023 | lecture d'échantillons | 🟡 inutile tant que tout est synthétisé |
| **jsfxr** | Unlicense, domaine public ([UNLICENSE](https://unpkg.com/jsfxr@1.4.1/UNLICENSE)) | actif (05/2026) | bruitages rétro générés | ✅ intégré (bruitages courts) |
| LMMS | GPL 2 (API GitHub) | actif | composer des boucles originales | ✅ outil |
| Audacity | GPL 3 ([LICENSE.txt](https://github.com/audacity/audacity/blob/master/LICENSE.txt)) | actif | montage, nettoyage | ✅ outil |
| Freesound | **par son** : CC0, CC BY, CC BY-NC ([FAQ](https://freesound.org/help/faq/)) | compte requis pour télécharger | bruits réels (vent, foule, remontées) | 🟡 au cas par cas, CC0 en priorité, crédits à chaque son ; compte = ton accord |

## 10. Données géographiques, qualité, hébergement

| Outil | Licence / conditions (source) | Verdict |
|---|---|---|
| **QGIS** | GPL 2 (API GitHub) | ✅ outil (contrôle des tuiles, des pistes et de l'emprise des bâtiments pour T17) |
| **Spector.js** | MIT | ✅ outil (inspection des appels de dessin en T4–T6) |
| **stats-gl** | MIT (npm) | ✅ intégré en mode debug (temps GPU) |
| **Lighthouse** | Apache 2.0 | ✅ outil (chargement, mobile) |
| **Playwright** | Apache 2.0 | ✅ en place |
| **Artefact claude.ai** | multi-fichiers ; ne sert pas `.glb`/`.ktx2` (repli base64 en place) ; pas de service worker | ✅ en place |
| **GitHub Pages** | site ≤ 1 Go, ~100 Go/mois de bande passante ([limites](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)) | ✅ prêt, **à activer avec ton accord** |
| Cloudflare Pages | 20 000 fichiers et 25 Mio par fichier en offre gratuite ([limites](https://developers.cloudflare.com/pages/platform/limits/)) ; compte requis | 🟡 alternative |

## 11. Backend optionnel (module `online`, désactivé)

| Solution | Licence / offre (source) | Points | Verdict |
|---|---|---|---|
| **PocketBase** (auto-hébergé) | MIT ; dépôt déplacé hors de GitHub (voir l'[avis](https://github.com/pocketbase/pocketbase)) | un seul binaire (SQLite, comptes, fichiers) ; demande un petit serveur | ✅ recommandé si un serveur est accepté |
| **Supabase** (offre gratuite) | Apache 2.0 ; offre gratuite : 500 Mo de base, projet mis en pause s'il est inactif ([tarifs](https://supabase.com/pricing)) | pas de serveur à gérer ; compte requis | 🟡 alternative sans serveur |
| Appwrite | BSD-3 (API GitHub) | complet mais lourd à héberger | ❌ surdimensionné |
| Firebase | propriétaire, offre gratuite | — | ❌ propriétaire, en dernier recours seulement |

Aucun serveur ne sera déployé sans ton accord. L'interface est prête : `src/storage/remote.ts` et `src/online/online.ts`.

---

## Recommandations par domaine

| Domaine | Recommandés |
|---|---|
| Rendu | **AgX + N8AO** (adoptés en T4) ; ciel de **Preetham** (`Sky` de three.js) et deux cascades d'ombres maison en T4 (voir les décisions ci-dessous) |
| Bâtiments | **Blender** (modules en relief) + **InstancedMesh2** (instanciation, LOD) |
| Matières | **ambientCG** (prototypé) + **Poly Haven** (HDRI) |
| Visages | **assets MakeHuman CC0 / MPFB 2** + **notre shader de peau** (prototypé) |
| Optimisation | **glTF-Transform / meshoptimizer** + **Basis Universal** (en place) |
| Interfaces | **HTML/CSS** + **Lucide** ; **lil-gui** pour le debug et le mode photo |
| Animation, physique | **Rapier** + **CMU Mocap** |
| IA | **recast-navigation-js** |
| Audio | **Web Audio + Tone.js** ; **jsfxr** pour les bruitages |
| Données géo | **QGIS** |
| Qualité | **Spector.js + stats-gl** |
| Hébergement | **GitHub Pages** (à activer) ; artefact en place |
| Backend | **PocketBase** (si serveur accepté) ou Supabase gratuit |

## Outils écartés et pourquoi

| Outil | Raison |
|---|---|
| LYGIA | licence Prosperity : gratuite en non commercial, mais **non permissive** (règle : code intégré permissif uniquement) |
| cannon-es, three-csm | plus maintenus (2022, 2023) ; remplacés par Rapier et l'addon CSM officiel |
| Cascadeur gratuit | export limité au format propriétaire CASC, usage non commercial seulement |
| Code MakeHuman (AGPL) | jamais intégré ; seuls ses **assets CC0** sont utilisés |
| Studio de Theatre.js (AGPL) | ne peut pas être livré avec le jeu |
| Svelte, Appwrite, Firebase | inutiles ou surdimensionnés pour le besoin ; Firebase est propriétaire |

## Prototypes (résultats)

Activables dans le jeu avec `?proto=rendu,facade,visage` (ou `?proto=all`). Le jeu par défaut n'est pas modifié.
Captures avant / après dans `review/vues/T3-proto/` ; planche : `review/planche_T3_prototypes.jpg`.

| Prototype | Contenu | Constat |
|---|---|---|
| `rendu` | AgX + N8AO | teintes moins saturées et plus naturelles (neige moins bleue, peau moins grise) ; occlusion ambiante active dans tous les préréglages (GTAO ne l'était qu'en Haute). Son effet propre est peu lisible sur ces vues en rendu logiciel : à juger sur un vrai GPU en T4 |
| `facade` | béton banché (Concrete013), bardage à clins (WoodSiding009), plancher (Planks037A), tous CC0, en KTX2 | de près (gros plans), banches et clins se lisent nettement, en relief au soleil ; à mi-distance l'effet s'efface sur les façades sombres. La silhouette ne changera qu'avec la géométrie en relief de T5 (refends, nez de dalle, garde-corps ajourés) |
| `visage` | pores et ridules procéduraux anticrénelés, rugosité variable, diffusion sous la surface approchée au terminateur, yeux plus humides | peau plus chaude, moins « plastique », passage ombre/lumière rosé. Deux limites : les pores ne se voient qu'en très gros plan (texture de peau en 512 px), et les ridules procédurales sont trop régulières (stries) ; en T7, il faudra des cartes de normales cuites depuis MakeHuman et une texture de peau plus fine |

## Ce qui a été vérifié, et ce qui ne l'a pas été

- **Vérifié à la source**, avec lien dans les tableaux : les licences des dépôts et paquets, et les conditions de
  Poly Haven, ambientCG, Freesound, CMU, Cascadeur, GitHub Pages, Cloudflare Pages et Supabase.
- **Non vérifié** :
  - la procédure de compilation d'ArmorPaint ;
  - le poids exact du WASM de Rapier ;
  - l'existence de textures de peau photo CC0 de qualité hors MakeHuman (recherche non exhaustive).

## Décisions de la tranche T4 (rendu)

- **AgX** et **N8AO** : adoptés (prototypes T3 concluants). N8AO remplace GTAO ; il rend la scène lui-même, avec le
  même MSAA que le rendu normal.
- **Ciel** : le modèle de Preetham fourni par three.js (`three/addons/objects/Sky.js`, MIT, déjà dans la dépendance
  `three`) plutôt que `@takram/three-atmosphere` : aucune dépendance de plus, aucune seconde pile de post-traitement.
  La même formule, réécrite en JavaScript (`src/game/sky.ts`), donne la couleur de l'horizon (brume), la teinte du
  soleil et la calibration. Limite : Preetham est moins juste au lever et au coucher du soleil (T15).
- **Ombres** : les deux cascades existantes sont gardées (voir la ligne CSM) ; sur tactile en qualité Moyenne, seule
  la cascade proche reste, pour tenir 400 appels de dessin.

