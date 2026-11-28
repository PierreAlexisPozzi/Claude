# Mesures — tranche T5 (Plagne Centre, première typologie)

Rendu logiciel (SwiftShader) : temps **indicatifs**. Point de mesure : cœur de Plagne Centre (`tests/perf.spec.ts`).

## Appels de dessin (image + passes d'ombre ; post-traitement en plus : ≈ +47 ordinateur, +17 tactile)

| Préréglage | Ordinateur | Tactile |
|---|---|---|
| Fin de T4, Moyenne | 665 | 383 (≈ 400 avec le post-traitement : marge nulle) |
| Après la marge regagnée (T5, 1/3) | 608 | 331 |
| **Fin de T5, Moyenne** (plafonds 1 700 / 400) | **617 · 9,21 M triangles** | **337 · 4,12 M triangles** |
| Basse | 473 | 337 |
| Haute | 617 | 466 |
| Ultra | 662 | 484 |

- Marge regagnée avant d'ajouter du contenu (−52 appels sur tactile) :
  - les regroupements (réserves d'instances, coques fusionnées) ne passent dans la carte d'ombre nette que s'ils ont un
    objet à moins d'une centaine de mètres du skieur ;
  - les portes de chrono sont fusionnées ;
  - les panneaux de nom au-delà de 700 m ne sont plus dessinés.
- Le nouveau contenu de Plagne Centre coûte +9 appels sur ordinateur et +6 sur tactile : le béton est une nouvelle
  matière dans les réserves ; le mobilier des abords et les accessoires des terrasses réutilisent les combinaisons
  existantes ou sont fusionnés dans le maillage de la terrasse.
- Tactile, post-traitement compris : ≈ 354 sur 400, soit une marge d'environ 46 appels pour T6.

## Temps (indicatifs)
- État jouable : 6,5 s sur ordinateur, 6,4 s sur tactile (rAF piloté).
- Image en Moyenne : 27 ms (ordinateur), 12 ms (tactile), médianes sur 6 images.

## Non-régression
- Robot 113/115 pistes, 17/17 remontées, identique à la référence ; slalom, sauvegarde, mobile, hors ligne, état
  initial : verts. Le mobilier ajouté n'entre ni dans les obstacles ni dans les emprises : le reste du domaine ne bouge pas.
- HUD : 14 états × 3 tailles, 0 chevauchement (rôles des commerçants raccourcis).
- 28 tests verts, 2 ignorés (captures figées des prototypes T3).

## Vues
- 3 vues ajoutées (fin de `tests/views.json`) : `abords-plagne-centre`, `facade-plagne-centre-biais`,
  `plagne-centre-mi-distance`. Leur « avant » a été capturé sur la version T4 avec la liste complète ; la version T4
  recapturée redonne exactement les captures livrées en T4 (écart 0).
- Écart avant / après (`review/vues/T5/ecart-avant-apres.json`) : 7,1/255 en moyenne sur les 11 vues de Plagne Centre,
  3,7/255 ailleurs (intérieurs des fenêtres, enseignes, terrasses des autres villages). L'écart le plus fort hors de
  Plagne Centre (18/255) est le gros plan de Jeanne : c'est une commerçante de Plagne Centre, et un poteau de la galerie
  apparaît derrière elle.
- Planches : `planche_T5_plagne_centre.jpg` (7 vues, ordinateur), `planche_T5_telephone.jpg` (4 vues).

## Limites
- Les poteaux de la galerie n'ont pas de collision (comme les autres éléments de décor) : on peut les traverser à ski.
- Les terrasses posées devant une barre passent sous le bord de la galerie : les poteaux traversent alors le plancher.
- L'usure (coulures) n'est pas calée sur les étages : c'est un bruit étiré verticalement, discret à l'ombre.
- Réglage de l'aspect en rendu logiciel seulement : à juger sur un vrai écran.
