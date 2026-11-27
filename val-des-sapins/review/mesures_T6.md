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
- Construit en trois parties : deux ailes au sol (9 niveaux) et une section en pont de 39 m au-dessus de la piste,
  jusqu'au même toit ; sous-face à **7,2 m** au-dessus de la neige. Le passage et sa hauteur sont **déduits** de
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
- **Placés : 83 / 132.** Les autres n'ont pas d'immeuble dans le jeu à moins de 8 m : bâtiment écarté (piste ou
  remontée dans l'emprise : Le Pelvoux, Immeuble G1G2, gare du Télémétro…), sous le plafond de 150 immeubles, ou
  petit chalet sans vitrine. Pour garder les immeubles commerçants au bord des fronts de neige, la règle d'emprise est
  assouplie pour eux seuls (une piste peut toucher le bord, remontée à 6 m) : 52 → 83 commerces placés, robot et
  slalom identiques.
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
  `jeu-portrait`.

## Appels de dessin (Moyenne, cœur de Plagne Centre ; post-traitement en plus)

(Mesure en cours sur la version finale : complétée au commit suivant, avec les captures et les planches.)

## Non-régression

(Suite complète en cours : complétée au commit suivant.)

## Limites et questions
- **Le Pelvoux et Immeuble G1G2** (cœur de Plagne Centre, 18 commerces) : la piste bleue Boulevard II traverse leur
  emprise dans OSM ; ils restent écartés. Si une piste passe réellement dessous (comme Le France), je peux les
  construire de la même façon — à confirmer.
- Le Paquebot du jeu fait 136 m sur les 206 m relevés : la Télécabine Télémétro arrive dans son extrémité nord-ouest,
  écartée. La grande terrasse des photos est probablement dans cette partie : elle est posée au bout construit.
- Terrasses d'Aime 2000 : positions approchées d'après les photos.
- Vues de visage : elles suivent désormais la personne (caméra calculée à la capture) ; les commerçants ayant changé de
  place, les planches comparent des décors différents.
- Niveau de détail (proche / moyen / imposteur) et test de « pop » prévus par le plan T6 : pas encore faits (fin de T6).
- Bellecôte et Belle Plagne sont hors du secteur actuel : extension du domaine (T17).
- Réglage de l'aspect en rendu logiciel seulement.
