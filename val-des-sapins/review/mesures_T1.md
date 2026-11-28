# Mesures — tranche T1 (migration web à parité)

Machine de test : conteneur 4 cœurs, Chromium 1.63 sans GPU (rendu logiciel SwiftShader). Les temps sont
indicatifs : ils ne reflètent pas un vrai GPU, mais la comparaison web / `game.html` se fait dans les mêmes conditions.

## Parité avec game.html

| Test | Résultat |
|---|---|
| Robot des pistes | 113 tracés sur 115 descendus, 17 remontées sur 17 ; résultats identiques piste par piste |
| État initial après 2 s de simulation | position, cap, PNJ, missions, appels de dessin et triangles identiques au bit près |
| Slalom | 38 portes ; descente propre et descente droit dans la pente identiques |
| HUD (1000×560, 390×844, 844×390 ; 13 états chacun) | boîtes identiques au pixel près |
| Vues de référence | 31 vues ordinateur + 6 vues téléphone : écart moyen **0** (`vues/T1/parite-*.json`) |

## Performances à Plagne Centre (qualité Moyenne, bâtiments proches assemblés)

| | Appels de dessin | Triangles | Image (médiane) | Mémoire JS |
|---|---|---|---|---|
| Ordinateur — web | 1 726 | 8 243 294 | 25 ms | 139 Mo |
| Ordinateur — game.html | 1 726 | 8 243 294 | 30 ms | 139 Mo |
| Tactile — web | 1 282 | 4 363 960 | 23 ms | 123 Mo |
| Tactile — game.html | 1 282 | 4 363 960 | 25 ms | 131 Mo |

Temps jusqu'à l'état jouable (boucle réelle, médiane de 3) : **web 26,4 s**, game.html 28,2 s.

## Écarts relevés (hérités, non corrigés en T1 pour garder la parité)

- **Plafonds d'appels de dessin dépassés** à ce point de mesure, par les deux versions : 1 726 (plafond ~1 700) sur
  ordinateur et surtout 1 282 (plafond ~400) sur tactile en Moyenne. Le chiffre de 400 du README d'origine
  correspondait au préréglage par défaut du tactile (Basse) et à une autre position de caméra. À traiter en T4.
- **HUD à 1000×560** : quand trois toasts ou plus s'empilent, le dernier recouvre la barre d'outils en bas à droite
  (« remontée » et « aide »). À corriger en T2.
- **Marques réelles** dans les noms de commerces et les dialogues (Skiset, Spar, Sport 2000) : renommage générique en T5.
