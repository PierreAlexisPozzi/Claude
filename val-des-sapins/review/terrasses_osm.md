# Terrasses : restaurants, bars et cafés d’OpenStreetMap (T5 ter)

Généré par `tools/osm_venues.py` (extrait de l’API OpenStreetMap, ODbL). Aucune des deux sources ne trace les
terrasses : le jeu en pose une là où OSM situe un établissement, sur la façade front de neige de l’immeuble
qui le contient (règles et contrôles : `web/src/game/buildings.ts`, `planTerrace`, `web/tests/terraces.spec.ts`).

- Établissements retenus : 46 (dont 3 avec « terrasse : oui » déclarée)
- Écartés : 2

| x | z | genre | nom (OSM) | terrasse déclarée |
|---|---|---|---|---|
| -679 | -1180 | restaurant | Au Bon Vieux Temps |  |
| 84 | -1129 | bar | Bar L'Etoile |  |
| 72 | -1128 | restaurant | La Cantine |  |
| 84 | -1126 | restaurant | Le Lauzes |  |
| -156 | -1121 | restaurant | Cocoon Grill |  |
| 89 | -1102 | cafe | Le café gourmand |  |
| -81 | -1059 | restaurant | Le Loup Blanc |  |
| -165 | -988 | restaurant | Le Petit Chaperon Rouge |  |
| 12 | -876 | pub | La Mine |  |
| 41 | -829 | pub | Bobsleigh Pub |  |
| 1012 | -603 | restaurant | Le Dou du Praz |  |
| -160 | -545 | restaurant | Kanailles |  |
| -388 | -358 | bar | Manaka Bar |  |
| -87 | -319 | restaurant | La K'bine |  |
| -81 | -314 | cafe | Cafe de Montagne |  |
| 13 | -307 | restaurant | Idée'O Artisan Delicatessen and Events |  |
| -141 | -305 | restaurant | Le Floe Bar |  |
| 2 | -303 | restaurant | L'Estaminet |  |
| -2 | -302 | restaurant | A Tavola |  |
| -7 | -300 | restaurant | Chez Marie |  |
| -19 | -299 | restaurant | La Métairie |  |
| -13 | -297 | restaurant | Le Farçon |  |
| -54 | -278 | bar | Luna Bar |  |
| -140 | -275 | restaurant | Le Refuge |  |
| -59 | -270 | restaurant | La Cheminée |  |
| -62 | -268 | restaurant | Caprice des Neiges |  |
| -64 | -259 | restaurant | Le Petit Comptoir |  |
| -56 | -255 | restaurant | Le Ti & Yu |  |
| -144 | -251 | restaurant | La Joya |  |
| -45 | -239 | restaurant | Le Vega - Brasserie - Pizzeria |  |
| -63 | -235 | restaurant | Le Planté du Bâton |  |
| -282 | -233 | restaurant | HO36 La Plagne | yes |
| 12 | -227 | restaurant | Restaurant Scolaire |  |
| -27 | -217 | fast_food | Switch Crepes and Sandwiches |  |
| -93 | -210 | restaurant | Les Cocottes |  |
| -23 | -209 | restaurant | Mama’s Kitchen |  |
| -15 | -207 | restaurant | Pépé & Cie |  |
| -126 | -187 | restaurant | Le Croq'Neige |  |
| -146 | -185 | restaurant | La Vache Rouge |  |
| -195 | -161 | restaurant | Le Ptit Bouchon |  |
| -321 | -151 | bar | Araucaria |  |
| -324 | -149 | restaurant | Araucaria |  |
| -281 | -132 | bar | Scotty's Bar |  |
| -1280 | -46 | cafe | Chalet Biollet | yes |
| 943 | 172 | restaurant | Chalet de la Bergerie |  |
| 502 | 1349 | restaurant | Chalet de la Grande Rochette | yes |

## Écartés

- Le Grizzli (522, -256) : sans terrasse (outdoor_seating=no)
- Le Brix, Bar à Bières & Cocktails (-122, -189) : à l’étage (level=1)
