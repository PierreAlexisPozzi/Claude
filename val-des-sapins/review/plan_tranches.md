# Plan en tranches livrables

Règle : **1 tranche = 1 commit (ou une petite série) + 1 publication** de `web/dist/` sur l'artefact existant
(<https://claude.ai/artifact/ENF9GAQm81b3HjeUC6Xzfi>). Chaque tranche se termine par : `npm test` vert,
captures avant/après des vues de référence (ordinateur et téléphone), planche dans `review/`, mesures de
performances, `README.md` à jour, résumé court (changements, mesures, limites, tranche suivante).

Branche : `claude/quirky-lamport-iqfb8a` (celle de la PR existante), commits en français.

**État** : T1 à T5 livrées (mesures : `mesures_T1.md` à `mesures_T5.md` ; étude : `etude_outils.md`) ; `game.html` retiré après la parité. T5 = typologie Plagne Centre. Prochaine : T6 (autres typologies, une validation après chacune), après ton retour sur T5.

## Constats de départ (lecture du code)

| Constat | Conséquence pour le plan |
|---|---|
| `game.html` : ~400 Ko de JavaScript dans **une seule closure** (≈ 900 déclarations de premier niveau, 45 sections), 6,2 Mo d'assets en base64 dans une balise JSON | Découpage manuel impossible sans régression : on découpe par **outil AST** (acorn) qui exporte/importe les liaisons et garde l'ordre d'évaluation d'origine (fonctions `init` appelées dans l'ordre du fichier) |
| Les tests cités dans le README (robot, chevauchement, slalom) sont **hors dépôt** ; seule l'API `window.__ski` existe | Les tests Playwright sont réécrits sur `window.__ski` ; la parité est vérifiée en faisant tourner **les mêmes tests sur `game.html` et sur la version web** |
| 19 appels à `Math.random` à l'exécution (le monde est généré avec `mulberry32`, déterministe) | Les tests de parité remplacent `Math.random` par un générateur à graine, identique des deux côtés |
| Stockage : `valdessapins.rider`, `valdessapins.ghosts`, `valdessapins.quality` (+ ancien `valdessapins.challenges` déjà converti en XP) | Couche `storage` asynchrone ; migration versionnée qui **copie** sans jamais effacer l'original |
| Noms de marques réels dans les dialogues et enseignes (Skiset, Spar, Sport 2000) | Contraire à la consigne « enseignes génériques, sans marque » : renommage générique en **T4** (bâtiments Plagne Centre), pas en T1 qui doit rester à l'identique |
| Polices Barlow / Barlow Condensed chargées depuis Google Fonts | Remplacées par Fontsource (mêmes fichiers, licence OFL, servis localement) : aucun changement visuel, jeu jouable hors ligne |

## Tranches

| # | Tranche | Contenu | Risques | Tests ajoutés / critères |
|---|---|---|---|---|
| **T1** | Migration web à parité (axe 0, partie 1) | `web/` Vite + TS ; three@0.187.0 figé ; 20+ modules générés par `web/tools/split-game.mjs` ; HUD en `src/hud/hud.html` + `hud.css` ; assets en fichiers dans `public/assets/` chargés par `fetch` ; couche `storage` (IndexedDB → localStorage) + migration ; `npm run dev/build/test` ; workflow GitHub Pages **désactivé** | Ordre d'évaluation et liaisons réassignées entre modules ; chemins relatifs dans l'artefact ; IndexedDB bloqué | démarrage, robot pistes + remontées, sauvegarde/migration, mobile, chevauchement HUD (3 tailles), perfs, slalom, vues de référence ; **parité** : mêmes résultats que `game.html` |
| **T2** | Assets compressés et tuiles (axe 0, partie 2) | `.glb` en meshopt (glTF-Transform), textures KTX2/Basis (avec repli), relief et pistes en binaire par tuiles, cache service worker | Attributs personnalisés (`_flutter`, skinning quantifié) perdus à la compression ; flipY des KTX2 | parité visuelle (écart d'image par vue), temps jusqu'à l'état jouable |
| **T3** | Étude des outils + prototypes (axe 0 bis) | `review/etude_outils.md` (licences vérifiées à la source), prototypes façade + terrasse et visage en gros plan, `CREDITS.md` + écran de crédits ; retrait de `game.html` (commit séparé) une fois la parité confirmée | Licences mal lues ; outil abandonné | captures avant/après des prototypes |
| **T4** | Rendu général (1A) | ciel physique + soleil horaire, IBL, cascades d'ombres, occlusion N8AO, AgX, étalonnage, neige scintillante, accumulations, brume ; préréglages Basse/Moyenne/Haute/**Ultra** + détection ; regroupement des appels de dessin (plafonds tenus) | Coût GPU mobile ; budget d'appels de dessin | perfs par préréglage, plafonds bloquants, table de détection, vues de référence |
| **T5** | Bâtiments Plagne Centre + terrasses (1B) | façades en relief réel, interior mapping varié, PBR usé, terrasses complètes, abords ; enseignes génériques (retrait des marques) | Appels de dessin (instanciation obligatoire) | 2 vues façade + terrasse, plafond 1 700 / 400 appels |
| **T6** | Autres typologies + LOD (1B) | paquebot d'Aime 2000, Bellecôte, Belle Plagne, 1800, Villages ; LOD proche/moyen/imposteur sans saut | Transitions visibles | 6 vues de référence, test de « pop » |
| **T7** | Visages, peau, yeux, cheveux + mode photo (1C) | LOD de tête dédié, peau PBR + SSS approché, yeux à cornée, cheveux en cartes, équipement détaillé, mode photo avec profondeur de champ | Données MakeHuman non versionnées ; coût des cartes de cheveux | 6 visages × 3 angles × 2 lumières |
| **T8** | Expressions + végétation (1C, 1D) | blendshapes complets, regard, micro-mouvements ; sapins/mélèzes en cartes, rochers, barres rocheuses, horizon | Nombre de morphes sur mobile | gros plans, vues paysage |
| **T9** | `storage` complet + économie | argent, boutique (forfaits, tenues, skis, location, nourriture), module `online` désactivé | Migration de sauvegarde | test de migration v1 → v2 |
| **T10** | Vigilance des pisteurs + poursuites | 0–5 flocons, navmesh (recast-navigation-js), amende, poste de secours | Coût du navmesh sur 2,8 km² | scénarios scriptés |
| **T11** | IK des pieds + couches d'animation | bassin compensé, couches additives, transitions | Régression du planté / relèvement à 90 % | mesures avant/après (épaule, 90 %) |
| **T12** | Marche, terrasses animées, remontées animées | skis sur l'épaule, files d'attente | Collision avec les PNJ | tests de trajets |
| **T13** | Ragdoll | Rapier (Apache 2.0), relèvement animé | Poids WASM | chute scriptée |
| **T14** | Missions en chaîne + téléphone | étapes, échec/relance, téléphone sur les plaques du HUD | Chevauchement HUD | test HUD sur le téléphone |
| **T15** | Jour/nuit + météo | vitrines allumées, remontées fermées, visibilité | Perfs nuit (lumières) | vues aube/midi/nuit |
| **T16** | Streaming par tuiles | chargement/déchargement terrain, arbres, bâtiments, PNJ ; service worker | Coutures, à-coups | temps jouable, mémoire |
| **T17** | Extension du domaine | Bellecôte, Belle Plagne, Villages, 1800, puis Montchavin – Les Coches, Champagny ; forfaits | Volume de données, précision des pistes | robot sur les nouvelles pistes |

## Mesures suivies à chaque tranche
- Temps jusqu'à l'état jouable (`__ski.ready`), appels de dessin et triangles à Plagne Centre (Moyenne, ordinateur et tactile),
  temps de frame médian / p95 en rendu logiciel (indicatif : SwiftShader n'est pas un GPU).
- Robot : pistes descendues, chutes, blocages ; remontées fonctionnelles ; slalom 38/38.

## Ce qui reste à votre accord
- ~~Activation du workflow GitHub Pages~~ : accordée ; site combiné PEA Tracker + jeu (`.github/workflows/pages.yml`).
- Tout outil payant, compte personnel ou serveur (backend `online`).
