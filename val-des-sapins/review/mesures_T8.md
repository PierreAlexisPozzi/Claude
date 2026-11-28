# Mesures — tranche T8 (expressions et végétation)

Le plan regroupe deux chantiers indépendants ; ils sont livrés séparément :
- **T8a** : expressions, regard, micro-mouvements (cette page, partie 1) ;
- **T8b** : forêts, mélèzes, rochers, barres rocheuses, horizon (partie 2, à venir).

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
