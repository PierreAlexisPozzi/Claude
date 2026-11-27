# Mesures — tranche T5 ter (terrasses : front de neige, niveau de la neige)

Demande : terrasses du côté front de neige, neige au même niveau, cohérence avec le rez-de-chaussée, emplacements
réels d'après l'IGN ou OpenStreetMap.

## Ce que disent les sources
- **Aucune des deux ne trace les terrasses** dans ce secteur :
  - la BD TOPO® de l'IGN n'a ni restaurants ni terrasses (seulement les bâtiments) ;
  - OpenStreetMap n'a aucune surface « places en terrasse » (`leisure=outdoor_seating`) sur l'emprise ; 3 établissements
    seulement déclarent « terrasse : oui » (`outdoor_seating=yes`).
- OSM situe en revanche **48 restaurants, bars et cafés** : 46 retenus, 2 écartés (l'un déclaré « sans terrasse »,
  l'autre « à l'étage »). Liste : `terrasses_osm.md` (noms gardés dans ce rapport, jamais dans le jeu).
- **Règle retenue (déduction, pas relevé)** : une terrasse est posée devant un immeuble qui contient ou jouxte un de ces
  établissements, sur sa façade côté front de neige.

## Règles de placement (`web/src/game/buildings.ts`)
1. **Front de neige** (`frontSide`) : pour chaque immeuble, la façade avant est celle qui voit le plus tôt une piste ou
   une remontée (recherche jusqu'à 120 m) ; à défaut, la façade aval. L'immeuble est retourné si besoin : vitrines,
   galerie et terrasse donnent toutes sur la neige.
2. **Établissement** (`planTerrace`) : un restaurant, bar ou café OSM dans l'emprise de l'immeuble ou à moins de 12 m
   devant elle ; la terrasse est centrée sur les établissements.
3. **Un seul niveau** : plancher de la terrasse = rez-de-chaussée de l'immeuble = neige. Le niveau est la moyenne du
   terrain sous la terrasse ; l'immeuble est posé à ce niveau (le nombre d'étages s'ajuste pour garder, à un étage
   près, le toit à la hauteur relevée par l'IGN) et la neige est aplanie à ce niveau sur la terrasse et 9 m autour, puis raccordée en douceur jusqu'à
   15 m. Plus de pilotis ni de marche.
4. **Refus** : pente de plus de 4 m sous la terrasse, piste, remontée (10 m), autre immeuble ou bord de carte dans la
   zone aplanie. Les pistes, remontées et immeubles voisins ne sont jamais modifiés par le raccord.

## Résultat
- 16 immeubles candidats (un établissement devant ou dedans), **7 terrasses** posées, 9 refusées
  (piste 4, immeuble voisin 3, remontée 1, pente 1). Aime 2000 : aucun établissement dans OSM, donc pas de terrasse.
- 86 clients sur les terrasses (plafond : 150 sur ordinateur, 70 sur mobile).

| Station | Centre (x, z) | Plancher = rez-de-chaussée | Neige sur la terrasse et 3 m autour | Établissements OSM à moins de 30 m | Terrasse déclarée |
|---|---|---|---|---|---|
| Plagne 1800 | 73, −1 114 | 110,37 (écart 0) | 0 / 0 m | 4 (La Cantine, Le Lauzes, Bar L'Etoile, Le café gourmand) | non |
| Plagne 1800 | 34, −822 | 104,20 (écart 0) | −0,035 / +0,008 m | 1 (Bobsleigh Pub) | non |
| Plagne Centre | −283, −217 | 239,81 (écart 0) | −0,006 / 0 m | 1 (HO36 La Plagne) | **oui** |
| Plagne Centre | −114, −198 | 234,34 (écart 0) | 0 / 0 m | 2 (Le Croq'Neige, Les Cocottes) | non |
| Plagne Soleil | 1 013, −591 | 379,11 (écart 0) | 0 / 0 m | 1 (Le Dou du Praz) | non |
| Plagne 1800 | −90, −1 063 | 66,24 (écart 0) | 0 / +0,002 m | 1 (Le Loup Blanc) | non |
| Plagne Centre | −135, −276 | 227,56 (écart 0) | 0 / 0 m | 3 (Le Refuge, La Joya, Le Floe Bar) | non |

Niveaux en mètres dans le repère du jeu ; neige = écart min / max au plancher sur la terrasse et 3 m autour (`web/tests/terraces.spec.ts`, tolérance ± 0,15 m).

Superposition vue de dessus : `terrasses_front_de_neige.jpg` (immeubles avec trait côté front de neige, terrasses en
vert, établissements en rouge, ceux qui déclarent une terrasse en orange, pistes en gris).

## Appels de dessin (Moyenne, cœur de Plagne Centre ; post-traitement en plus)

| Préréglage | Ordinateur | Tactile |
|---|---|---|
| Fin de T5 bis, Moyenne | 611 | 352 |
| **Fin de T5 ter, Moyenne** (plafonds 1 700 / 400) | **540 · 7,83 M triangles** | **334 · 3,73 M triangles** |
| Basse | 402 | 334 |
| Haute | 540 | 468 |
| Ultra | 578 | 491 |

- Moins d'appels qu'en T5 bis : les anciennes terrasses (deux par station, posées à part) disparaissent, et les
  nouvelles sont fusionnées au démarrage avec leur mobilier (un seul maillage par terrasse).
- Temps indicatifs (rendu logiciel, quatre navigateurs en parallèle pendant la mesure) : état jouable 10,4 s
  (ordinateur) et 15,4 s (tactile) ; image en Moyenne 23 ms et 32 ms.

## Non-régression
- `npm test` : 29 tests verts, 2 ignorés (captures figées des prototypes T3), dont le nouveau `terraces.spec`.
- Robot 113/115 pistes, 17 chutes, 17/17 remontées et slalom 38/38 : identiques à la référence (l'aplanissement de la
  neige ne touche ni piste ni remontée).
- HUD : 14 états × 3 tailles, 0 chevauchement. Sauvegarde, migration, mobile, hors ligne : verts.
- État initial : seule l'attribution (crédits) re-figée (`web/tests/baselines/README.md`).

## Vues
- Vues de terrasse réorientées (`terrasse-plagne-centre` : HO36 ; `terrasse-plagne-1800` ; `terrasse-aime-2000`).
  Planches avant / après aux mêmes caméras : `planche_T5ter_terrasses.jpg` (6 vues, ordinateur) et
  `planche_T5ter_telephone.jpg` (6 vues).
- Écart avant / après sur toutes les vues : `vues/T5ter/ecart-avant-apres.json`. Les vues de visage s'écartent
  fortement (jusqu'à 80/255) : les commerçants ont suivi leurs boutiques, désormais tournées vers le front de neige,
  et les caméras fixes de ces vues ne les cadrent plus (mur, neige, enseigne). Corrigé en T6 : les vues de visage
  suivent la personne au lieu d'une position fixe.

## Limites
- **Emplacement déduit** : la terrasse est placée d'après l'adresse OSM de l'établissement, pas d'après un relevé de la
  terrasse elle-même ; une position OSM approximative déplace la terrasse d'autant.
- Établissements loin de tout immeuble (restaurants d'altitude isolés) : pas de terrasse, faute d'immeuble IGN porteur.
- Aime 2000 : aucun restaurant dans OSM, donc aucune terrasse en T5 ter (corrigé en T6 d'après tes photos).
- Vue `terrasse-plagne-1800` sur téléphone (portrait) : un sapin masque la terrasse.
- Les terrasses posées à fleur de neige se traversent à ski (comme le reste du décor, pas de collision).
- Réglage de l'aspect en rendu logiciel seulement : à juger sur un vrai écran.
