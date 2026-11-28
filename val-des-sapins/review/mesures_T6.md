# Mesures — tranche T6, première livraison (Aime 2000, Le France, commerces réels, téléphone)

Demandes traitées :
- Aime 2000, d'après tes deux photos : la neige arrive au rez-de-chaussée et il y a des terrasses ;
- Plagne Centre : l'immeuble Le France, sous lequel passe une piste, manquait ;
- commerces : les référencer et mettre des vitrines aux emplacements réels, des logements ailleurs ;
- téléphone : jouer en paysage, avec plus de recul sur le personnage.

Rendu logiciel (SwiftShader) : temps **indicatifs**.

## 1. Aime 2000 (typologie du Paquebot), d'après les photos fournies
- **Constat** : côté pistes (sud-ouest), le relief IGN creuse un fossé de 1 à 3 m au pied de la façade (interpolation
  autour du bâtiment) et descend d'environ 8 % le long de l'immeuble ; le Paquebot était posé sur le point haut de
  chaque module de 19 m, d'où un soubassement visible et des marches entre modules.
- **Paquebot** :
  - la neige est remise au niveau d'un profil pris 5 à 11 m devant la façade (lissé sur ± 8 m), qui suit la pente ;
  - les commerces du rez-de-chaussée suivent la neige par paliers (six par module) ; le premier étage reste d'un seul
    tenant au-dessus du palier le plus haut ;
  - mesure (`tests/aime.spec.ts`) : 42 paliers, neige à **± 27 cm au plus** du plancher entre 0,5 et 3 m de la façade
    (tolérance du test : 35 cm).
- **Deux terrasses d'après les photos** (et non d'après OSM, qui n'a aucun établissement à Aime 2000) : grande terrasse
  vers l'extrémité nord-ouest construite, terrasse aux parasols vers le milieu ; posées à plat, au niveau du
  rez-de-chaussée et de la neige (écart 0 à 2 mm, `tests/terraces.spec.ts`). Positions approchées.
- **Autres immeubles d'Aime 2000** avec une piste à moins de 60 m (dont Club Med 2100, le bâtiment rouge et blanc de la
  vue aérienne) : rez-de-chaussée au niveau de la neige médiane devant la façade (étages ajoutés si le sol descend côté
  pistes), replat de neige là où l'écart ne dépasse pas 2,5 m. Part de la façade où la neige est à ± 35 cm du
  rez-de-chaussée : 89 % (Club Med 2100), 84 %, 83 %, 82 %, 57 % (façade à 14 % de pente).
- Pistes, remontées et immeubles voisins jamais modifiés (aucun sommet touché, ni dans la bande ni dans le raccord).
- Clientèle des terrasses partagée entre elles : sur téléphone, 9 à 10 clients sur chacune (avant : la première
  terrasse prenait tout le quota).

## 2. Plagne Centre : Le France
- BD TOPO : « Immeuble Le France », 101 × 37 m, 9 niveaux. Il n'avait jamais été construit : la règle qui écarte les
  bâtiments posés sur une piste l'éliminait, puisque la piste bleue **Boulevard** passe dessous.
- Construit en trois parties : deux ailes au sol (10 niveaux, 28,8 m) et une section en pont de 39 m au-dessus de la
  piste, jusqu'au même toit ; sous-face à **7,2 m** au-dessus de la neige.
- D'après tes trois photos : bardage bois orangé, sous-faces de balcons et corniche blanches ; niveau bleu clair à
  petites fenêtres au-dessus du passage ; piliers de béton avec matelas orange (dans la marge, hors de la piste) ;
  socle blanc vitré d'un niveau côté pistes ; cage d'escalier en bois au bout ouest, **sans le lettrage** (l'enseigne
  des photos porte une marque). Le passage et sa hauteur sont **déduits** de
  l'emprise de la piste (OSM), pas relevés. Profondeur ramenée à 20 m (parties d'OSM).
- Seules les ailes font obstacle : aucun obstacle sur la piste sous le pont, ailes hors de toute piste
  (`tests/lefrance.spec.ts`). Robot (dont la descente de Boulevard) identique.
- Caméra : la caméra de jeu (6,6 m derrière, 2,5 m au-dessus ; 8,9 et 3,4 m sur téléphone) passe sous le pont ; la
  vue éloignée (15 m, 6,5 m) traverse la dalle une à deux secondes.

## 3. Commerces d'après OpenStreetMap
- `tools/osm_shops.py` : **132 commerces référencés** (liste, catégories et correspondances : `commerces_osm.md`),
  61 écartés (hébergements, distributeurs isolés, commerces à l'étage).
- 16 types de vitrine : les 8 d'origine et 8 nouveaux (pharmacie, agence immobilière, banque, forfaits · infos,
  services, restaurant, bar, café · snack), enseignes génériques sans marque (`web/tools/shop-signs.mjs`) ; les
  nouveaux reprennent l'intérieur existant le plus proche.
- Chaque commerce va à l'immeuble du jeu le plus proche (emprise + 8 m), sur la façade la plus proche ; **vitrine
  seulement là, logement ailleurs** (fenêtres, rideaux). Galeries de Plagne Centre seulement devant des commerces.
- **Placés : 113 / 132** (52 au premier essai, 83 à la livraison, 113 après tes retours). Les autres n'ont pas
  d'immeuble dans le jeu : sous le plafond de 150 immeubles, petit chalet sans vitrine, ou bâtiment écarté.
- Règle d'emprise assouplie pour les seuls immeubles commerçants, au bord des fronts de neige (robot et slalom
  identiques) :
  - une piste peut longer l'immeuble : sa zone damée peut couvrir le bord, jamais les 60 % centraux de sa largeur
    (distance à l'axe) ; la barre du jeu (17 m) peut glisser dans l'emprise IGN, plus profonde, à l'opposé de la piste ;
  - pôle de gare : à moins de 20 m d'une gare, seule la ligne au-delà des 25 premiers mètres compte (la gare du
    Télémétro est dans le complexe de Le Pelvoux) ; l'embarquement et l'arrivée restent sans obstacle ;
  - un commerce va à l'immeuble dont l'emprise IGN le contient (ou à moins de 8 m de la barre du jeu).
- **Le Pelvoux et Immeuble G1G2** (la piste Boulevard II les longe, d'après toi) sont construits, avec leurs commerces.
- **Plagne Centre sans sapins** : aucun arbre à moins de 25 m des immeubles ni sur 45 m devant leur façade avant (le
  front de neige).
- Les 8 commerçants tiennent un commerce réel de leur type (ou d'un type voisin) dans leur village ; déplacement
  par rapport à T5 ter (positions après le départ de la partie) :

| Commerçant | Commerce tenu (OSM) | Déplacement | Mission chronométrée |
|---|---|---|---|
| Lucie (location de skis) | location de skis | 154 m | — |
| Marco (épicerie) | épicerie | 30 m | ravitaillement (600 s) |
| Sophie (boulangerie) | épicerie (la boulangerie d'OSM est hors de son village) | 87 m | croissants (1 020 s) |
| Paul (boucherie) | épicerie fine | 158 m | — |
| Yanis (sport) | location de skis | 108 m | — |
| Henri (Le Caquelon) | restaurant | 31 m | fondue (300 s) |
| Jeanne (fromagerie) | épicerie | 66 m | — |
| Mireille (souvenirs) | services | 75 m | — |

  Les temps des livraisons (1,5 fois le meilleur trajet du robot) n'ont pas été re-mesurés : 30 à 87 m d'écart au
  départ, soit quelques secondes sur des trajets de 4 à 17 minutes. Aucune position n'est sauvegardée (sauvegardes
  inchangées).

## 4. Téléphone
- Caméra de jeu sur écran tactile : **35 % de recul et de hauteur en plus** (8,9 m derrière, 3,4 m au-dessus).
- Écran d'accueil : conseil « tourne ton téléphone en paysage », affiché seulement sur écran tactile tenu en portrait.
- Au départ, plein écran et paysage verrouillé quand le navigateur le permet (Chrome sur Android) ; sans effet sinon
  (iPhone : Safari ne le permet pas, le conseil reste).
- Vues de référence téléphone désormais prises en paysage (844 × 390) ; vue de jeu `jeu-depart` en paysage et
  `jeu-portrait` (contexte à part : le plein écran du départ empêche de redimensionner la fenêtre).

## Appels de dessin (Moyenne, cœur de Plagne Centre ; post-traitement en plus)

| Préréglage | Ordinateur | Tactile |
|---|---|---|
| Fin de T5 ter, Moyenne | 540 | 334 |
| Aime 2000 et Le France seuls (avant les commerces et le recul de caméra) | 547 | 336 |
| Livraison du 27/11 (commerces, sapins encore présents) | 619 | 363 |
| **Fin de T6, Moyenne** (Le Pelvoux, G1G2, Plagne Centre sans sapins ; plafonds 1 700 / 400) | **566 · 6,87 M triangles** | **342 · 3,63 M triangles** |
| Basse | 419 | 342 |
| Haute | 566 | 487 |
| Ultra | 592 | 498 |

- Les immeubles commerçants construits au cœur de Plagne Centre et leurs vitrines ajoutent des appels ; le retrait des
  sapins du cœur et du front de neige en retire davantage (moins de paquets d'arbres visibles depuis le point de mesure).
- Tactile : 342 appels, environ 360 avec le post-traitement, pour un plafond de 400 (marge d'environ 40).
- Temps indicatifs (rendu logiciel, mesure seule) : état jouable 7,4 s (ordinateur) et 5,8 s (tactile) ; image en
  Moyenne 24 ms et 18 ms.

## Non-régression

- `npm test` : 31 tests verts, 2 ignorés (prototypes T3), 2 échecs d'environnement, refaits à part sur la version
  finale :
  - mesure de performance arrêtée au bout de 30 min (quatre navigateurs en rendu logiciel en même temps, comme en
    T4) : refaite seule, verte (plafonds tenus, chiffres ci-dessus) ;
  - vues téléphone : le serveur de test s'était arrêté (connexion refusée) ; capturées ensuite sur la version finale.
- Nouveaux tests verts : `aime`, `lefrance`, `shops`, terrasses sur téléphone.
- Robot 113/115 pistes, 17 chutes, 17/17 remontées et slalom 38/38 : identiques à la référence, Le France et immeubles
  commerçants compris. HUD 14 états × 3 tailles sans chevauchement ; sauvegarde, migration, mobile, hors ligne : verts.
- État initial : `buildings` (158) et `credits` re-figés, expliqués dans `web/tests/baselines/README.md`.

## Limites et questions
- Le Pelvoux, G1G2 : barres du jeu (17 m de profondeur) dans des emprises IGN de 50 à 58 m ; la gare du Télémétro est
  représentée par la gare du jeu, accolée, pas encore intégrée au volume de l'immeuble.
- Le Paquebot du jeu fait 136 m sur les 206 m relevés : la Télécabine Télémétro arrive dans son extrémité nord-ouest,
  écartée. La grande terrasse des photos est probablement dans cette partie : elle est posée au bout construit.
- Terrasses d'Aime 2000 : positions approchées d'après les photos.
- Vues de visage : elles suivent désormais la personne (caméra calculée à la capture) ; les commerçants ayant changé de
  place, les planches comparent des décors différents.
- Commerces sur les résidences bois des villages (Plagne 1800, Villages, Soleil) : les vitrines n'existent que sous les
  arcades de la façade avant ; un commerce OSM ramené sur une autre façade n'y apparaît pas (Lucie se tient devant un
  mur sans vitrine). À reprendre avec la typologie de ces villages.
- Vue « Aime 2000 · paquebot » : c'est la façade arrière, côté route ; son grand soubassement est réel (le front de
  neige est de l'autre côté, vues `aime-2000-front-de-neige` et `terrasse-aime-2000`).
- Niveau de détail (proche / moyen / imposteur) et test de « pop » prévus par le plan T6 : pas encore faits (fin de T6).
- Bellecôte et Belle Plagne sont hors du secteur actuel : extension du domaine (T17).
- Réglage de l'aspect en rendu logiciel seulement.

## Vues et planches
- Avant (`vues/T6-avant`) : version T5 ter, avec les caméras de T6. Après (`vues/T6`) : 51 vues sur ordinateur, 14 sur
  téléphone (paysage) ; vues de Le France et de jeu recapturées sur la version finale.
- Planches : `planche_T6_aime_lefrance.jpg`, `planche_T6_commerces.jpg`, `planche_T6_telephone.jpg` ; écarts :
  `vues/T6/ecart-avant-apres.json`.
