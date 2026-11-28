# Mesures — tranche T8 (expressions et végétation)

Le plan regroupe deux chantiers indépendants ; ils sont livrés séparément :
- **T8a** : expressions, regard, micro-mouvements (cette page, partie 1) ;
- **T8b** : forêts, mélèzes, rochers, barres rocheuses, horizon (partie 2).

Rendu logiciel (SwiftShader) : temps **indicatifs**. Personnages originaux ; seules les données MakeHuman (CC0) sont
utilisées.

## Partie 1 — T8a : expressions, regard, micro-mouvements

### Expressions
Sept composites ajoutés aux cinq de T7. Ils sont construits avec les unités d'expression MakeHuman (CC0 : 12 unités
de plus, ajoutées à la liste épinglée de `tools/makehuman_fetch.py` avec leurs empreintes) et liés à des situations
du jeu :

| Morphe | Unités | Déclencheur |
|---|---|---|
| `surprise` | yeux grands ouverts, sourcils levés, bouche entrouverte | joueur en grand saut (plus de 0,6 s en l'air) ; habitant frôlé à plus de 12 m/s à moins de 6 m |
| `sad` | sourcils relevés au centre, coins de la bouche abaissés | joueur, 4 s après une mission échouée |
| `effort` | sourcils froncés, lèvres serrées, yeux plissés, nez | joueur en montée en escalier, en schuss au-delà de 14 m/s ; skieurs PNJ au-delà de 12 m/s |
| `wince` | yeux presque fermés, nez retroussé, lèvres étirées | joueur à la chute |
| `oo`, `ee`, `mm` | moue, lèvres étirées, lèvres pincées | visèmes enchaînés pendant la parole, avec la mâchoire |

- Coût : visage inchangé (5 198 triangles), 12 morphes au lieu de 5 ; `skiers_real.glb` servi : 775 → 1 149 Ko.
- Vues de référence ajoutées : surprise (Lucie), déçu (Henri), effort (Marco), grimace (Jeanne), en parlant (Yanis),
  regard (Mireille).
- Figer une expression (`faceHold`) met désormais à zéro les morphes non cités : les captures restent reproductibles.

### Regard
- Les globes tournent dans le nuanceur, autour de leur centre, avant la déformation par le squelette, dans la limite
  de ±20° en lacet et ±12° en tangage (les paupières ne suivent pas).
- Un habitant regarde la caméra quand elle est à moins de 8 m, ou que le joueur est à moins de 10 m ; la tête tourne
  déjà depuis T6.
- Saccades : petits sauts toutes les 0,4 à 2,6 s, tirés d'un générateur propre à chaque personne. Aucun nouvel appel à
  `Math.random` pendant le jeu.

### Micro-mouvements
- Respiration : la poitrine se soulève, les épaules suivent. Environ 15 cycles par minute, plus ample à l'effort.
- Léger balancement de la nuque. Appliqués après la pose, sans effet sur la simulation.

### Contrôles
- `micro.spec` (nouveau, plusieurs images) : regard dans les bornes et changeant (saccades) ; respiration présente et
  bornée (±0,024 rad) ; balancement du pompon observé pour la première fois : jusqu'à 2,96 cm, dont 0,99 cm en
  vertical, pour des bornes de 3 cm et 1 cm.
- `heads.spec` : au moins 12 morphes sur les têtes proches subdivisées.
- `persos.spec` : Élodie, pisteuse casquée, bouche ouverte en pleine phrase, ajoutée au contrôle des jours (tour de
  cou).

### Coût et tests
- Plagne Centre, préréglage Moyen : **590 appels de dessin sur ordinateur, 354 sur tactile**, inchangés (plafonds
  1 700 / 400). Le regard et la respiration ne coûtent aucun appel.
- `npm test` : 37 tests au vert, dont `micro`, `heads`, `persos` (avec Élodie) et `views` (80 vues ordinateur,
  captures dans `review/vues/T8`).

### Limites
- Expressions discrètes à distance de jeu (effort, visèmes) ; elles se lisent surtout en gros plan et en mode photo.
- Les yeux des skieurs casqués sont cachés par le masque : regard et expressions des yeux ne servent qu'aux habitants
  en bonnet.
- La grimace (chute) étire les lèvres, ce qui peut se lire comme un sourire plissé sur un visage au repos.

## Partie 2 — T8b : forêts, mélèzes, rochers, barres rocheuses, horizon

### Données
- **Couverture du sol d'après OpenStreetMap** (ODbL, même extrait que les terrasses et les commerces) :
  `tools/osm_landcover.py`, rapport `review/couverture_osm.md`.
  - 45 bois et forêts (225,5 ha sur l'extrait), 8 zones de roche nue (15,2 ha), 2 d'éboulis (2,2 ha).
  - Contours simplifiés à 2 m près : 2 324 points ramenés à 1 811. Un seul multipolygone, aucune clairière cartographiée.
- **Ce qui n'est pas dans les données** : les essences (quelques `leaf_type=needleleaved` seulement). Le mélange
  épicéas / mélèzes est un **choix du jeu**, inspiré de l'écologie générale des Alpes internes : le mélèze, pionnier,
  domine vers la limite des arbres, en lisière et sur les arbres isolés. Ce n'est pas une donnée de terrain.
- Les **barres rocheuses** ne sont pas cartographiées non plus : elles sont déduites de la pente du relief IGN, là où
  elle dépasse environ 44°.

### Forêts
- Arbres placés dans les polygones de bois, en bouquets et trouées (bruit), un peu plus clairs en lisière ; arbres
  isolés hors des bois, plus nombreux près des lisières, jamais sur la roche ni les éboulis.
- Plafonds inchangés (22 000 arbres sur ordinateur, 9 000 sur tactile) :

| | Avant (T8a) | Après (T8b) | Dans les bois d'OSM | Mélèzes |
|---|---|---|---|---|
| Ordinateur | 11 660 arbres, sur toutes les pentes sous 2 110 m | **20 365** | 94 % | 33 % (6 787) |
| Tactile | 6 157 | **8 540** | 93 % | 33 % (2 850) |

- Les mélèzes poussent en peuplements : 43 % des morceaux de 48 m portent les deux essences (jusqu'à 5 maillages
  instanciés au lieu de 3 dans ces morceaux proches).

### Mélèze d'hiver (`blender/larch.py`, modèle original)
- Sans aiguilles en hiver : tronc droit gris-brun, branches qui montent puis retombent, rameaux pendants à courts
  rameaux, quelques cônes, peu de neige.
- Atlas de rameaux de 512 × 512 rendu sous Cycles, même disposition que celui de l'épicéa : rameaux nus, version
  enneigée, bande blanche.
- 2 variantes proches de 2 543 et 2 375 triangles, occlusion ambiante cuite ; servies : `larch_near.glb` 133 Ko,
  `larch_twigs.ktx2` 214 Ko, `conifer_far.glb` 8 Ko.
- Silhouette lointaine : celle de l'épicéa (70 triangles), avec une forme de mélange « larch » et des couleurs en
  attribut. Le nuanceur choisit l'essence par instance : **aucun appel de dessin ni sommet de plus** au loin, ombres
  comprises (matériau de profondeur adapté, ombres lointaines aussi).
- Les sorties de `blender/trees.py` (épicéa) sont inchangées à l'octet. `larch.py` vérifie que sa silhouette
  d'épicéa est identique à celle de `trees.py` et redonne des fichiers identiques à chaque exécution.
- Rameaux fins : l'alpha est renforcé avec le niveau de mipmap, sinon le mélèze s'effaçait au-delà de 50 m.

### Rochers et barres rocheuses
- 3 400 rochers sur ordinateur (560 avant), 2 400 sur tactile (522 avant) :
  - 2 101 dans la roche nue et les éboulis d'OSM : gros blocs dans la roche, petits dans les éboulis ;
  - 190 barres rocheuses (110 sur tactile), chacune un chapelet de 3 à 8 dalles (moins si la pente faiblit) de 6 à
    12 m le long de la courbe de niveau, face verticale vers l'aval, avec parfois une seconde strate au-dessus (gradins) ;
  - blocs épars sur les pentes raides, comme avant.
- Le relief du jeu (`H()`) et la physique ne changent pas : les barres sont un relief visuel.

### Horizon
- Critère fixé avant de commencer :
  - sur les trois vues horaires, les forêts lointaines montrent le même mélange d'essences que le domaine ;
  - les bois d'OSM qui débordent du secteur restent boisés au-delà de sa limite ;
  - aucune couture visible ;
  - appels de dessin et suite de `rnd` inchangés.
- Réalisé :
  - masque de forêt du relief lointain étendu aux bois d'OSM hors du secteur ;
  - teinte gris-brun des peuplements de mélèzes, avec la même règle que dans le domaine ;
  - 2 010 bouquets lointains de plus dans ces bois (1 500 sur tactile) ;
  - épicéa ou mélèze par instance (8 % de mélèzes : l'horizon est surtout en fond de vallée, plus bas).
- Vue d'horizon recadrée : la caméra était dans un siège du télésiège du Bécoin. Elle est maintenant à 60 m de la gare,
  hors de la ligne. Les vues « avant » ont été reprises avec ce cadrage.

### Générateur partagé
- `rnd` (graine 9917) sert aussi aux rochers, à l'horizon et aux PNJ. Les anciens tirages sont refaits à l'identique
  (candidats, mélange, 8 tirages par arbre, 6 par rocher, bouquets lointains). Le nouveau placement a ses propres
  générateurs.
- Contrôle (`vegetation.spec`) : niveau, taille et carrure des 12 premiers PNJ, et 16 000 bouquets lointains d'avant,
  identiques à T8a (`tests/baselines/rnd-pnj.json`).

