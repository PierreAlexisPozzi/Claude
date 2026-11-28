# Références figées

Résultats de `game.html` (version d'avant T1), enregistrés en T2 avec `VDS_WRITE_BASELINES=1` pendant que
`game.html` existait encore. Les tests de parité comparent la version web à ces fichiers.

## Modifications enregistrées

| Tranche | Fichier | Champ | Raison |
|---|---|---|---|
| T4 | `etat-initial.json` | `ri` (appels de dessin) | non re-figé : le test exige seulement moins d'appels que la référence (regroupement des appels, `batch.ts`) |
| T5 bis | `etat-initial.json` | `credits` | attribution des données : bâtiments d'après l'IGN BD TOPO® (Licence Ouverte Etalab 2.0) au lieu d'OpenStreetMap ; nouvelle valeur = `meta.attribution` de `assets/plagne.json`. Tous les autres champs (position de départ, pistes, remontées, nombre de bâtiments placés, personnes, missions) sont restés identiques, comme les résultats du robot (113/115 pistes, 17/17 remontées) et du slalom. |
| T5 ter | `etat-initial.json` | `credits` | l'attribution mentionne l'emplacement des restaurants et bars d'OpenStreetMap (terrasses). Position de départ, pistes, remontées, bâtiments, personnes et missions identiques ; robot et slalom identiques (l'aplanissement de la neige sous les terrasses ne touche aucune piste). |
| T6 | `etat-initial.json` | `buildings` (156 → 158) | l'immeuble Le France (Plagne Centre), jusque-là écarté parce que la piste Boulevard passe dessous, est construit en trois parties (deux ailes et une section en pont) : deux entrées de plus dans `BUILDINGS`. Le plafond de 150 immeubles étant atteint, le plus petit de la liste (par emprise) n'est plus placé. Tous les autres champs (position de départ, pistes, remontées, arbres, personnes, missions, crédits) restent identiques, comme le robot (113/115 pistes, 17/17 remontées) et le slalom. |
| T6 | `etat-initial.json` | `credits` | l'attribution mentionne l'emplacement des commerces d'OpenStreetMap (vitrines aux emplacements réels, logements ailleurs). Le nombre d'entrées de bâtiments reste 158 : les immeubles à commerces désormais gardés au bord des fronts de neige prennent la place des plus petits sous le plafond de 150. Robot et slalom identiques. |
| T8 | `etat-initial.json` | `credits` | l'attribution mentionne les bois et rochers d'OpenStreetMap (forêts et rochers aux emplacements réels, `tools/osm_landcover.py`). Position de départ, pistes, remontées, bâtiments, personnes et missions identiques. Nouveau fichier `rnd-pnj.json` : tirages des 12 premiers PNJ et nombre de bouquets lointains relevés sur T8a, pour vérifier que le placement des forêts et des rochers ne décale pas le générateur partagé (`vegetation.spec`). |
