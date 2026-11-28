# Bâtiments : BD TOPO® de l’IGN à la place d’OpenStreetMap (T5 bis)

Généré par `tools/bdtopo_buildings.py`. Source : IGN — BD TOPO® V3, couche batiment, édition « Bâtiments − BD TOPO® V3 2026-09-15 », Licence Ouverte Etalab 2.0 (data.gouv.fr, jeu « BD TOPO® » de l’IGN : lov2).

| | Nombre |
|---|---|
| Objets IGN dans l’emprise téléchargée | 580 |
| Emprises IGN retenues (≥ 40 m², dans le secteur, hors constructions légères) | 374 |
| Écartées : légères 81, petites 101, hors secteur 24, autre état 0 | |
| Bâtiments OSM d’avant | 369 |
| Emprises IGN ayant reçu un nom ou un genre OSM | 290 |
| Emprises IGN sans équivalent OSM (nouvelles) | 84 |
| Bâtiments OSM sans emprise IGN (disparus du jeu) | 34 |

Décalage médian des centres (paires sans ambiguïté, 138) : 0.1 m vers l’est, 0.1 m vers le sud.

## Bâtiments OSM sans emprise IGN

- (1, -752) 73 × 63 m, apartments — Les Chalets Edelweiss
- (632, -727) 33 × 50 m, yes
- (-370, -239) 20 × 75 m, yes — Sierra Nevada
- (166, -471) 35 × 33 m, hotel
- (13, -956) 49 × 18 m, residential — Chalet Nicole
- (715, -425) 12 × 63 m, yes
- (754, -411) 48 × 9 m, yes
- (849, -426) 30 × 14 m, yes
- (171, -1201) 26 × 15 m, yes
- (152, -1082) 23 × 16 m, yes
- (-182, -1012) 21 × 16 m, yes
- (503, -127) 17 × 12 m, yes
- (-699, -892) 15 × 12 m, yes
- (77, -396) 24 × 8 m, yes — Télébus
- (-118, -291) 16 × 11 m, yes — Ice Rink - Seasonal
- (798, -444) 12 × 10 m, residential
- (205, -233) 14 × 8 m, yes
- (-710, -917) 16 × 7 m, yes
- (235, -248) 10 × 10 m, yes
- (190, -199) 10 × 9 m, yes
- (133, -439) 14 × 7 m, residential
- (-819, -881) 12 × 7 m, yes
- (215, -214) 10 × 8 m, yes
- (230, -533) 24 × 3 m, yes
- (-681, -903) 13 × 6 m, yes
- (204, -202) 9 × 8 m, yes
- (172, -191) 9 × 8 m, yes
- (173, -176) 9 × 8 m, yes
- (174, -164) 9 × 8 m, yes
- (2, -820) 9 × 8 m, retail — Sport 2000
- (-73, -121) 8 × 8 m, yes
- (205, -222) 9 × 7 m, yes
- (16, -1007) 8 × 8 m, retail — SkiSet Boudu Sport
- (-130, -1195) 8 × 6 m, yes

## Noms OSM non repris

- Immeuble Le France (92, -200)
- La Cembraie (86, -323)
- Le Christina (-285, -147)
- Sierra Nevada (-370, -239)
- Centre commercial (83, -1122)
- Parking Plagne Soleil (606, -564)
- Apartments Les Centaurées (56, -919)
- La Cembraie (73, -295)
- L'Everest (-206, -189)
- Belvédère (762, -45)
- Les Chalets Edelweiss (1, -752)
- La Cembraie (95, -342)
- Télébus (77, -396)
- Chalet Java (34, -897)
- Chalet Nicole (13, -956)
- Les Ecrins (-68, -286)
- Chalet Pierra Menta 1 (-171, -1114)
- Alpine Loft (-215, -280)
- Immeuble Le France (121, -191)
- Immeuble Le France (43, -198)
- Ice Rink - Seasonal (-118, -291)
- Cabinet de Kinesitherapie (-21, -438)
- Intersport (87, -1094)
- Le café gourmand (87, -1102)
- Spar (82, -1080)
- Sport 2000 (2, -820)
- SkiSet Boudu Sport (16, -1007)
- Apartments Les Centaurées (48, -922)
- Apartments Les Centaurées (42, -925)
- Chalet Vega (27, -899)
- Salle omnisports Pierre Leroux (-63, -346)
- Police municipale (-46, -410)
- Cabinet Medical Plagne Centre (-4, -445)
- Centre D'Incendie et de Secours (22, -445)

## Hauteurs

Étages du jeu = 1 + arrondi((toit − sol amont − 3,4) / 2,9). Répartition :

| Étages | Bâtiments |
|---|---|
| 1 | 118 |
| 2 | 96 |
| 3 | 69 |
| 4 | 35 |
| 5 | 17 |
| 6 | 11 |
| 7 | 8 |
| 8 | 10 |
| 9 | 3 |
| 10 | 1 |
| 14 | 2 |
| 15 | 1 |
| 18 | 1 |
| None | 2 |

## Effets dans le jeu (mesures de la tranche T5 bis)

- Bâtiments placés : 150 sur 374 (plafond du jeu : les plus grands d'abord), comme avant ; 27 à Plagne Centre. Les
  tours ne sont plus tirées au hasard : une seule « tour » (≥ 9 étages, emprise < 32 m), loin du centre ; le plus haut
  immeuble de Plagne Centre est une barre de 14 étages (59 × 17 m).
- Petits bâtiments des stations modernes (90 à 220 m², hauteur connue) : bas, en béton (2 à 4 étages), au lieu de
  chalets de pierre.
- Commerçants : les huit ont une boutique (elles suivent les bâtiments) ; les 30 vues de visage ont été recalculées.
- Appels de dessin à Plagne Centre (Moyenne) : 611 sur ordinateur (617 en T5), 352 sur tactile (337 en T5 ; ≈ 369 avec
  le post-traitement, plafond 400).
- Non-régression : robot 113/115 pistes et 17/17 remontées, slalom, HUD, sauvegarde : identiques aux références ;
  seule l'attribution des crédits a été re-figée (`web/tests/baselines/README.md`).
- Superposition des emprises OSM et IGN : `review/batiments_osm_ign.jpg`.
