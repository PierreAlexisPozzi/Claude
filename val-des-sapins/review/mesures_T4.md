# Mesures — tranche T4 (rendu général)

Rendu logiciel (SwiftShader, Chromium de Playwright) : les temps sont **indicatifs**, pas ceux d'un vrai processeur
graphique. Point de mesure : cœur de Plagne Centre, caméra de jeu, `tests/perf.spec.ts` (détail : `web/test-results/perf.json`).

## Appels de dessin et triangles (image + 2 passes d'ombre)

| Préréglage | Ordinateur 1000×560 | Tactile 844×390 |
|---|---|---|
| Avant T4, Moyenne (référence figée) | 1 726 appels · 8,24 M triangles | 1 282 appels · 4,36 M triangles |
| Basse | 524 · 7,84 M | 383 · 4,29 M |
| **Moyenne** (plafonds 1 700 / 400, bloquants) | **665 · 9,40 M** | **383 · 4,29 M** |
| Haute | 665 · 9,40 M | 509 · 5,38 M |
| Ultra | 710 · 10,01 M | 527 · 5,66 M |

- Gain : −61 % d'appels sur ordinateur, −70 % sur tactile, à aspect égal (commit « T4 (1/2) ») : écart moyen des vues
  fixes 1,6 à 2,4/255 (JPEG et pièces de fenêtres tirées autrement).
- Les triangles augmentent (+14 % sur ordinateur) : les réserves partagées sont éliminées hors champ par cellules de
  400 à 1 600 m, plus grossièrement qu'objet par objet. C'est le prix de la baisse des appels.
- Sur tactile, Moyenne = Basse côté géométrie : la carte d'ombre lointaine (≈ 130 appels) n'est plus dessinée en
  Moyenne sur tactile ; elle reste en Haute et Ultra.
- Non compté par ce relevé (comme avant) : les passes plein écran du post-traitement (N8AO, flou lumineux,
  étalonnage), une dizaine de triangles chacune.

## Répartition avant / après (Moyenne, ordinateur)

| Poste | Avant | Après |
|---|---|---|
| Coques des bâtiments (version lointaine) | 581 | ≈ 100 (fusion par matière et cellule de 800 m) |
| Bâtiments détaillés | 216 | 18 (réserve partagée) |
| Remontées (gares, pylônes, véhicules, câbles) | ≈ 420 | ≈ 125 (réserves, une flotte par type) |
| Personnages (passe d'ombre lointaine) | 44 | 0 (calque des petits objets, comme prévu par le code) |

## Temps (indicatifs, rendu logiciel)

| | Ordinateur | Tactile |
|---|---|---|
| Image, Moyenne (médiane sur 6 images) | 23 ms (avant : 26 ms) | 20 ms (avant : 55 ms) |
| Image, Haute (N8AO pleine résolution) | 67 ms | 27 ms |
| État jouable | 7,7 s (avant : 8,2 s) | 8,2 s (avant : 8,3 s) |

## Non-régression

- Robot : 113/115 pistes, 17/17 remontées, identique à la référence ; slalom 38/38 identique ; sauvegarde, mobile,
  hors ligne, état initial (hors coût de rendu) : verts.
- HUD : 14 états × 3 tailles, 0 chevauchement (bouton Ultra compris, retour à la ligne sur écran étroit).
- Choix automatique du préréglage : 14 cas de la table (`tests/quality.spec.ts`).
- Vues : 49 captures avant (`review/vues/T4-avant/`) et après (`review/vues/T4/`), écart moyen 14,2/255 (8 à 25) :
  c'est le changement de rendu voulu. Planches : `planche_T4_rendu.jpg` (ordinateur), `planche_T4_telephone.jpg`,
  `planche_T4_heures.jpg` (soleil à 8 h 30, 10 h, 15 h 30).

## Limites

- Rien n'est mesuré sur un vrai GPU : le coût de N8AO, du MSAA ×8 et des ombres 4096 px en Ultra, et l'objectif de
  60 images/s sur un PC de jeu restent à vérifier sur ta machine.
- La table de détection repose sur le nom du processeur graphique ; Safari et certains navigateurs le masquent
  (repli : Moyenne sur ordinateur, Moyenne pour un « Apple GPU » sur iPhone).
- Changer l'heure recalcule l'ensoleillement du relief (≈ 1 à 2 s) : réservé aux vues et aux tests ; le cycle
  continu viendra en T15.
