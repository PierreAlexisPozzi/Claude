# Mesures — tranche T7 (personnages, vêtements, mode photo)

Demandes traitées, dans l'ordre :
1. T7 du plan : visages, peau, yeux, cheveux, équipement détaillé, mode photo avec profondeur de champ ;
2. « ne fais pas les personnages de façon réaliste, ils font peur » ; vêtements qui suivent les personnages, **sans
   espace entre le corps et les vêtements** ; garder le thème des vêtements de ski ;
3. vêtements et cheveux **plus amples, esprit freeride**, d'après des captures de SSX ;
4. « il ne faut pas que le pantalon traverse la veste ».

Rendu logiciel (SwiftShader) : temps **indicatifs**. Références visuelles : on garde l'esprit (réalisme stylisé, freeride
ample) sans reprendre ni personnages, ni tenues, ni modèles d'un jeu existant. Les modèles proposés en liens (assets
extraits d'un jeu commercial, reproduction d'un personnage) n'ont été ni téléchargés ni utilisés.

## 1. Chaîne de fabrication
- `blender/humans.py` a d'abord été **rejoué à l'identique** dans ce conteneur : fichier produit identique octet pour
  octet à celui versionné. Un réglage non noté a été retrouvé au passage : décimation du corps à 0,26, désormais la
  valeur par défaut. Toute différence vient donc des modifications de T7.
- Données MakeHuman (CC0 : maillage, morphes du corps et du visage, poids, unités d'expression) téléchargées fichier
  par fichier depuis un **commit épinglé** de MPFB 2, avec empreintes SHA-256 (`tools/makehuman_fetch.py`, 54
  fichiers). La licence de MPFB 2 (section C) place ces assets sous CC0 ; le code GPL n'est ni téléchargé ni exécuté.
- Reconstruction depuis cette seule liste : identique octet pour octet. Rien de brut n'est versionné.

## 2. Visages en réalisme stylisé
| Avant (photo) | Après |
|---|---|
| texture photo MakeHuman 512 px, pores et ridules procéduraux, sourcils « détectés » dans la photo | peau **peinte en 3D** (1024 px, fond neutre) : joues, nez et oreilles rosés, lèvres sur la vraie jonction des lèvres, ligne de cils, sourcils nets, ombre de barbe légère ; couleur de peau réelle par personne (5 teintes) |
| traits d'origine | morphes MakeHuman modérés : un peu plus jeunes, yeux plus grands (globe 12,2 → 13,0 mm, ajusté à l'ouverture des paupières), nez plus fin, joues plus pleines, menton adouci, coins de la bouche relevés |
| cheveux en cartes (jupe de mèches) | coque sculptée et **mèches effilées fermées** aux tempes et à la nuque ; queue de cheval chez les femmes |
| iris petits et sombres | iris plus grands et plus clairs ; peau mate (rugosité 0,72) |

Défauts corrigés en route :
- **Fente sombre au milieu du front** : la décimation franchissait une couture UV. Les coutures sont maintenant
  protégées, et le visage est décimé à 0,6 au lieu de 0,35.
- **Lèvres peintes 2,8 cm trop haut** : le repère « bouche » de MakeHuman est enfoncé dans la tête. La jonction est
  mesurée avec l'unité « bouche ouverte ».
- **Couleur des cheveux jamais appliquée** : la ligne qui la réglait était restée en commentaire.

## 3. Vêtements : sans jour, puis freeride ample
**Fermeture des ouvertures** : chaque ouverture est refermée par une doublure qui revient sur la surface d'en dessous.

| Ouverture | Fermeture |
|---|---|
| Col | Polaire posée sur la peau du cou, qui continue sous le col |
| Poignets | Anneau autour de l'os et fond, traversés par le gant |
| Ourlet | Rentré sous la surface du pantalon |
| Bas de pantalon | Anneau et fond, traversés par la chaussure |
| Ceinture | Fond |
| Bonnet, casque, cheveux | Bords calés sur une ligne nette et repliés |
| Capuche, sangles | Bouts fermés |

Ces doublures portent les poids de peau du bord : elles suivent les mouvements par le skinning. Il n'y a pas de
simulation de tissu ; le seul mouvement secondaire est celui du pompon et de la queue de cheval (ressort amorti, 3 cm au
plus, 1 cm en vertical).

**Coupe freeride** :
- veste longue sur le haut des cuisses, qui tombe droit depuis la poitrine ;
- manches larges, resserrées aux poignets ;
- deux couleurs par veste, teintées par personne ;
- grande capuche et sac plus volumineux ;
- pantalon large en cylindre autour de chaque jambe, qui s'évase sur la chaussure ;
- masque en bandeau fermé (écran bombé aux coins arrondis, monture en mousse, sangle) ;
- casque uni, tour de cou en polaire avec le casque ;
- aucun logo.

**Le pantalon ne traverse plus la veste**. Là où ils se superposent, la veste reste au moins 1,5 cm au-dessus, sommet
par sommet, avant et après le lissage. Contrôle bloquant sur le maillage livré, après décimation :
- rayon vers l'extérieur et vers l'intérieur depuis chaque sommet du pantalon recouvert ;
- résultat : 0 sommet traversant sur 140 (homme) et 146 (femme) ;
- témoin à marge négative : le contrôle échoue.

### Contrôle des jours (`tests/persos.spec.ts`)
**Principe** : les faces arrière des pièces du personnage s'affichent en magenta (`__ski.humanDebug(2)`) ; une face
arrière visible, c'est l'intérieur d'un vêtement vu par une ouverture.
- Le magenta sort lilas après le rendu tonal : on le reconnaît à sa teinte.
- On ne compte que dans le cadre du personnage, détecté par différence entre l'image normale et le masque.
- On ne compte que les pixels entourés de magenta.
- Une vue où le personnage manque échoue.
- **Témoin positif** : la version d'avant y montre ses jours.

**Couverture** : 5 poses du joueur (arrêt, schuss, virage, chasse-neige, télésiège) × 6 angles, plus 3 gros plans
(poignet, ourlet vu d'en bas, bas de pantalon) ; 2 habitants tête tournée vers le joueur, nuque des deux côtés. Soit
57 vues.

| Vue (jour en pixels, image 560 × 700) | Avant (T6) | Après |
|---|---|---|
| col du joueur (5 poses) | 0 à 4 012 | 0 à 119 |
| col d'une habitante en bonnet / sa nuque | 1 138 / 1 171 | 353 / 317 |
| col d'un habitant (Henri) | 584 | 17 |
| dos vu d'en haut (caméra de jeu) | 14 à 1 186 | 0 à 38 |
| bas de pantalon, gros plan | jusqu'à 104 718 | 0 à 294 |
| ourlet vu d'en bas (debout, en mouvement) | 2 665 à 8 457 | 17 à 207 |
| poignet, gros plan | 0 | 0 à 56 |
| vues entières (face, profil, dos, trois-quarts) | 0 à 647 | 0 à 82 |

Le poignet passe de 0 à au plus 56 px : les manches amples laissent voir un fin liseré de la doublure, sous le seuil.

**Ce qui reste** : de fins liserés en vue rasante, là où une doublure rejoint son vêtement (attribués pièce par pièce :
corps, et mèches pour l'habitante). Aucune ouverture : le seuil du test est de **400 px par vue (0,1 % de l'image)**.

Deux pièges de mesure ont été trouvés et corrigés :
- **Plan de coupe** : à 30 cm de la caméra, il tranchait la paroi d'un pantalon tout proche dans le gros plan « ourlet »
  en schuss (≈ 112 000 px de faux jour). La planche le rapproche à 2 cm ; en jeu, la caméra reste à plus de 1,2 m.
  Trois corrections faites sur cette fausse piste ont été retirées : poids fondus au genou et au coude, pantalon
  froncé au genou. La fermeture de la ceinture est gardée, car elle bouche une vraie ouverture.
- **Gros plans** : deux caméras posées tombaient dans une jambe ou un gant. Elles reculent désormais tant qu'elles sont
  à moins de 20 cm d'un membre.

## 4. Mode photo
- Touche P, ou « Photo » dans le menu « Plus » sur tactile.
- Jeu figé ; orbite autour du skieur, dans le repère du monde : correction faite en T7, car sur un télésiège le skieur
  est rattaché au siège.
- Réglages : distance, hauteur, profondeur de champ (BokehPass, hors de la chaîne en dehors du mode), heure, champ.
- Image PNG téléchargée, sans écriture dans les sauvegardes. Test `photo`.

## 5. Coût
| Pièce (triangles) | Avant | Après |
|---|---|---|
| homme : corps / visage / masque / casque | 2 588 / 3 309 / 1 122 / 904 | 2 860 / 5 197 / 3 672 / 952 |
| homme : cheveux / tour de cou | — | 1 332 / 609 |
| femme : corps / visage / masque / cheveux | 2 593 / 3 291 / 1 209 / — | 2 849 / 5 178 / 3 672 / 3 109 |
| skieur casqué complet (homme / femme) | 7 923 / 7 973 | 14 622 / 16 266 |
| habitant en bonnet (homme / femme) | 6 848 / 6 808 | 10 315 / 12 060 |

Fichiers servis :
- `skiers_real.glb` : 568 → 775 Ko ;
- textures de peau KTX2 : 287 + 289 → 222 + 209 Ko (1024 px peints au lieu de 512 px photo).

Plagne Centre, préréglage Moyen (`tests/perf.spec.ts`, rendu logiciel) :

| | T6 | T7 | Plafond |
|---|---|---|---|
| Ordinateur : appels de dessin | 566 | **590** | 1 700 |
| Tactile : appels de dessin | 342 | **354** | 400 |
| Ordinateur : triangles | — | 7,0 M | — |
| Ordinateur : temps d'image | — | 15 ms | — |

Les appels supplémentaires viennent des pièces ajoutées (cheveux visibles avec le casque, tour de cou), dans la limite
de 10 personnages proches sur ordinateur et 4 sur tactile.

## 6. Limites
- Le résultat est un **réalisme stylisé fait maison**, pas le niveau d'un jeu commercial : visages issus de MakeHuman
  et de morphes, peau peinte par script, aucune sculpture à la main.
- Les vêtements suivent le corps par skinning (pas de simulation de tissu). En flexion extrême, une jambe ample peut se
  replier ; ce n'est pas visible depuis les caméras du jeu.
- Restent de fins liserés rasants (≤ 0,1 % de l'image) au bord des doublures.
- Les mèches sont rigides (liées à la tête) ; seule la queue de cheval se balance.
