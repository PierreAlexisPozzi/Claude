# Références figées

Résultats de `game.html` (version d'avant T1), enregistrés en T2 avec `VDS_WRITE_BASELINES=1` pendant que
`game.html` existait encore. Les tests de parité comparent la version web à ces fichiers.

## Modifications enregistrées

| Tranche | Fichier | Champ | Raison |
|---|---|---|---|
| T4 | `etat-initial.json` | `ri` (appels de dessin) | non re-figé : le test exige seulement moins d'appels que la référence (regroupement des appels, `batch.ts`) |
| T5 bis | `etat-initial.json` | `credits` | attribution des données : bâtiments d'après l'IGN BD TOPO® (Licence Ouverte Etalab 2.0) au lieu d'OpenStreetMap ; nouvelle valeur = `meta.attribution` de `assets/plagne.json`. Tous les autres champs (position de départ, pistes, remontées, nombre de bâtiments placés, personnes, missions) sont restés identiques, comme les résultats du robot (113/115 pistes, 17/17 remontées) et du slalom. |
| T5 ter | `etat-initial.json` | `credits` | l'attribution mentionne l'emplacement des restaurants et bars d'OpenStreetMap (terrasses). Position de départ, pistes, remontées, bâtiments, personnes et missions identiques ; robot et slalom identiques (l'aplanissement de la neige sous les terrasses ne touche aucune piste). |
