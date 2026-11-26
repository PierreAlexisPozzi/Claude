# Val des Sapins

Jeu de ski 3D en open world, jouable dans le navigateur (Three.js r128, un seul fichier).

- `index.html` : page autonome à ouvrir dans un navigateur.
- `game.html` : même contenu sans en-tête HTML (source utilisée pour l'artifact).
- `build.sh` : régénère `index.html` à partir de `game.html`.

## Contenu
- Relief procédural : crêtes rocheuses, forêts de sapins, deux murs (35–44°), deux crêtes percées de tunnels.
- 10 pistes balisées, 2 champs de bosses, snowpark (tremplins, box, rail), hors-piste.
- Glisse par type de neige : damée, glacée, bosses, poudreuse, trafolle, neige de culture, tunnel.
- Remontées : télécabine, 2 télésièges, 2 téléskis. Sans remontée, on ne regagne pas d'altitude.
- Villages inspirés d'un grand domaine savoyard : station d'altitude (barre étagée, tours, passerelle),
  résidences bois sur arcades, hameau pierre et bois, village du bas avec église, restaurant d'altitude.
- Canons à neige (perches et ventilateurs) avec panaches ; tunnels éclairés avec musique synthétisée.
- Skieur articulé (cinématique inverse des jambes), inclinaison, angulation, absorption, plantés de bâton.
- Skis twin-tip à double rocker ; figures au sol : nose / tail press, butters, nollie / ollie, presses sur box et rails.
- Motoneige (V) pour monter les pentes et circuler partout ; une soixantaine d'autres skieurs qui descendent, font la queue et prennent les remontées.
- Plan : téléportation au départ (« Bas ») ou à l'arrivée (« Haut ») de chaque remontée.
- Défis : six objectifs, dont deux qui débloquent le Télésiège de la Forêt et le Téléski du Snowpark (progression gardée dans le navigateur).
- Objets assemblés pièce par pièce (atome → pièce → objet) près de la caméra : sapins, rochers, chalets, résidences bois, barre étagée, tours, église, passerelle, mobilier (filets, panneaux, plans des pistes, bancs, lampadaires, râteliers) ; version simplifiée au loin.
- Faune d'hiver : chamois, lièvres variables, lagopèdes, choucas.
- Remontées assemblées : pylônes (fût, console, trains de galets, échelle, passerelle), sièges, cabines, perches, gares (charpente, poulie à rayons, salle des machines, cabine du préposé, quai de chargement).
- Skieur joueur détaillé : gants à doigts, fixations et freins, boucles de chaussures, capuche, bretelles, masque miroir, casque.
- Traces de ski dynamiques : le joueur et les autres skieurs laissent leurs traces derrière eux (lignes de carving, dérapage, sillon en poudreuse, chenille de motoneige), qui s'estompent en 4 min environ ; le damage reste intact ailleurs.
- Accès « Accès … » : chaque piste rejoint une remontée par une liaison verte en pente douce, avec une arrivée commune à plat au départ.

## Rendu (Three.js r187, modules ES via importmap)
- Flux linéaire : couleurs décodées en lumière linéaire dans les shaders, rendu HDR (HalfFloat), tone mapping ACES Filmic + sRGB en sortie.
- Éclairage : soleil directionnel (ombres PCF 1024–2048 px, cadre recalé au texel), ciel procédural utilisé comme environnement IBL (PMREM), hémisphère légère, brouillard exponentiel accordé au ciel.
- Matériaux PBR (Standard / Physical) : rugosité par type de neige (glace brillante, poudreuse mate), vernis à clearcoat (casque, skis), tissu avec sheen (veste), métal (pylônes, rails), vitrages réfléchissants ; micro-surface procédurale (rugosité + normale) sur toutes les surfaces sans texture.
- Post-traitement : MSAA x4 (FXAA en qualité basse) → GTAO (haute) → bloom HDR à seuil élevé → OutputPass → vignette, grain fin, aberration chromatique légère.
- Sensations : champ de vision qui s'ouvre avec la vitesse, secousses de caméra (réceptions, chutes, bosses), poussière de diamant scintillant à contre-jour ; réduits avec « prefers-reduced-motion ».
- Qualité Basse / Moyenne / Haute (écran d'accueil, bouton « Image », touche G), mémorisée ; la qualité s'abaisse d'elle-même si les images ralentissent.
- Aucune ressource externe hormis Three.js (polices système).

## Modèles et matières Blender (bpy 5.3, module Python)
- Scripts dans `blender/` (voir `blender/README.md`), exécutés avec Blender comme module Python ; les sorties (`assets/`) sont intégrées en base64 à la fin de `game.html` par `tools/embed_assets.py` (fichier unique, ~3,7 Mo).
- Épicéas : atlas d'aiguilles rendu sous Cycles depuis ~30 000 aiguilles modélisées, 3 variantes proches (~2 600 triangles, branches tombantes, rideaux en peigne, coussins de neige, occlusion ambiante cuite), silhouette lointaine de 70 triangles.
- Skieur : pièces de vêtement modélisées dans le repère de chaque articulation (sections anatomiques, doudoune matelassée, plis aux coudes et genoux, casque à visière) ; skieurs du domaine en deux poses (descente, télésiège).
- Matières tuilables cuites (bruit 4D sur tore, sans raccord) : calcaire stratifié pour les falaises (projection verticale sur les parois, variation à grande échelle, neige dans les couloirs), mélèze grisé pour madriers et bardage, granit pour les maçonneries.
- Perspective atmosphérique : voile bleuté à longue portée sur toutes les matières.
- Repli procédural automatique si les ressources ne se chargent pas.
- Bâtiments (lot 2) : manteau neigeux modélisé sous Blender (congères, sastrugi, corniche sur l'avant-toit) avec matière « neige tassée » ; balustres savoyards découpés (silhouette Blender appliquée en masque, 12 triangles par planche) ; fenêtres en *interior mapping* sur quatre intérieurs de chalet rendus sous Cycles, rideaux procéduraux.
- Personnages (lot 2) : mouvement secondaire des vêtements (ourlet, poignets, bas de pantalon, pondéré par sommet dans Blender) selon la vitesse ; deuxième tenue pour les skieurs du domaine (bonnet à pompon, lunettes, parka longue) et tailles / carrures variées, au même coût d'affichage.
- Ombres (lot 3) : deux cascades. La carte proche (84 m, nette) suit le skieur ; une seconde carte d'environ 700 m, centrée devant la caméra, projette les ombres des sapins, bâtiments et pylônes à travers la vallée. Un seul soleil éclaire : le shader prend l'ombre de la carte proche à l'intérieur, de la carte lointaine au-delà, avec un fondu. Le relief (déjà cuit par sommet) n'est pas rendu dans la carte lointaine. Basse : carte proche seule ; Moyenne : 2048 px ; Haute : 4096 px.
- Fenêtres assombries de jour (le reflet du ciel domine, l'intérieur reste deviné) ; skis et snowboards laissés au hasard sur un balcon sur deux (modèles Blender, couleurs variées).
- Galeries commerciales (lot 4) : les rez-de-chaussée (arcades des résidences bois, pied du paquebot, tours et barres) sont des commerces en *interior mapping* : location de skis (Skiset), alimentation (Spar), sport (Sport 2000), restaurant fondue-raclette, boucherie-charcuterie, fromagerie, souvenirs, boulangerie. Intérieurs et enseignes rendus sous Blender (`blender/interiors.py`) ; l'enseigne et la vitrine partagent le même commerce. Enseignes en lettrage simple, sans reproduction de logos.
- Gares de remontées : cabine d'opérateur (pupitre, écrans, boutons) et salle de motorisation (réducteur, moteur, armoires électriques) au lieu d'intérieurs d'habitation.
- Skieurs articulés (lot 4) : chaque skieur du domaine est un petit squelette de pièces Blender (bassin, torse veste courte ou parka, tête casque ou bonnet, bras, avant-bras, cuisses, tibias, skis, bâtons), animé chaque image : jambes en IK à deux os avec flexion rythmée par les virages, inclinaison et angulation, contre-rotation du buste, plantés de bâton ; assis sur les sièges jambes ballantes ; marche vers les remontées.
- Tunnels : le maillage du relief (mailles de 6,25 m) formait une rampe qui fermait l'entrée des portails ; le shader du terrain écarte désormais ce qui se trouve dans le volume du tube sur les 14 premiers mètres de chaque portail.
- Traces selon la neige : damée (deux sillons nets à lèvre claire), poudreuse (tranchée profonde, fond bleuté, bords émiettés, plus durable), trafolle (traces cassées, mottes), glacée (rayures pâles, vite effacées), bosses (raclage sur les faces), neige de culture (sillons granuleux), dérapage (bande raclée), motoneige (chenille). Correctif : les traces étaient tracées face vers le bas et donc invisibles (ordre des sommets inversé).
- Snowpark et half-pipe naturel : half-pipe de 154 m creusé dans la pente à côté du park (fond plat de 6 m, transitions en quart de cercle de 4,3 m relevées à 80°, 3,6 m de profondeur, 14,5 m de lip à lip, plateformes de chaque côté, drop-in progressif et sortie qui rejoint le park). Profil exact dans la physique, maillage fin dédié, murs plus durs. En l'air au-dessus du pipe, les skis se réorientent vers le fond ; sans ← / →, le skieur file d'un mur à l'autre et peut pomper dans les transitions. Le park gagne une ligne de petits kickers débutants et une ligne de jib (down rail, kink rail, rainbow, long box). Les autres skieurs ne vont pas dans le pipe.

## Progression, personnages et missions
- **Carnet de rider** (touche J, bouton « Carnet ») : niveaux de rider (Ourson → Légende du Val) gagnés en XP ; le niveau 2 ouvre le Téléski du Snowpark, le niveau 3 le Télésiège de la Forêt. Onglets Missions, Défis, Chronos, Statistiques.
- **Défis à paliers** (bronze, argent, or) suivis en continu : vitesse, dénivelé, poudreuse, pistes, remontées, tunnels, meilleure figure, nombre de figures, temps de vol, rails, butters, sauts enchaînés au half-pipe, médailles d'or.
- **Descentes chronométrées** sur 9 pistes : banderoles DÉPART / ARRIVÉE, chrono à l'écran, médailles (or = temps du pilote de test, argent +20 %, bronze +50 %), records personnels. Annulé si on quitte la piste plus de 6 s, prend une remontée ou la motoneige.
- **Habitants du domaine** (E pour parler) : huit commerçants devant leur boutique (Skiset, Spar, Sport 2000, Le Caquelon, boucherie, fromagerie, souvenirs, boulangerie), le conducteur du Télésiège du Sommet, un moniteur, une pisteuse, une photographe ; « ! » = mission, « ? » = on vous attend, « … » = niveau insuffisant.
- **12 missions** : livraisons (certaines chronométrées : interdit de se téléporter ou de prendre la motoneige), saucissons à ramasser sur une piste, points de vue à visiter, test de skis au snowpark, beaufort à chercher à l'alpage, Couloir en temps d'argent, leçon de carving, skieur égaré à retrouver hors-piste et à ramener, séance photo. Faisceau orange sur l'objectif, repère sur le plan et la carte, suivi à l'écran (distance, direction, chrono).
- Progression sauvegardée dans le navigateur (reprise en cours de mission) ; les anciens défis sont convertis en XP.
- Traces en relief : plus de bande sombre peinte. Chaque type de neige a un profil de hauteur (sillon et bourrelet, tranchée de poudreuse, mottes, rayures, bande raclée, chenille) ; le shader en déduit la pente et l'éclaire avec le vrai soleil et le ciel : le flanc à contre-jour prend l'ombre bleutée de la neige, le flanc au soleil et les bourrelets s'éclairent. Les morceaux de trace se raccordent bord à bord (pas de double ombrage dans les virages).
- Remontées : chaque remontée a sa propre horloge ; maintenir ↑ (ou ⇧) accélère toute la remontée (×4) — sièges, cabines, perches et skieurs assis avancent avec vous. E (bouton « Passer » sur mobile) saute la fin de la montée avec un court fondu ; en livraison chronométrée, le temps restant est décompté comme si vous aviez accéléré.
- Décors lointains : montagnes hors domaine redessinées (crêtes secondaires, arêtes nettes, maillage plus fin près du domaine). Nouvelle matière Blender « massif » (`massif_albedo` / `massif_normal` : couloirs neigeux verticaux, vires, gradient de neige) projetée verticalement sur les parois, mélangée à deux échelles et déformée à basse fréquence pour éviter toute répétition ; forêts lointaines, neige des pentes douces et rugosité variable.
- Sommet : plateau d'arrivée rehaussé (2 311 m, +17 m) au départ commun de la rouge et de la noire ; le Couloir part désormais de l'arrivée du Télésiège du Sommet (début plus doux, puis passe vers l'est avant le mur).
- Liaisons rouge ↔ noire : Traversée du Col (bleue, de la Grande Combe vers le Couloir, ~2 250 m) et Traversée des Chamois (rouge, du Couloir vers la Grande Combe, plus bas). Chronos de référence du Couloir (88 s) et de la Grande Combe (82 s) re-mesurés.

## Commandes tactiles (mobile)
- **Joystick fixe** (en bas à gauche) : la base ne bouge jamais, la manette reste dans son cercle même si le pouce glisse au-delà ; direction analogique (zone morte, courbe progressive), pousser = schuss / accélérer la remontée, tirer = frein.
- **Saut** : maintenir pour charger (anneau doré), relâcher pour sauter ; **double tape** = switch (180° sur la neige). Un tap rapide attend ~0,23 s une éventuelle deuxième tape ; un saut chargé part sans délai. En l'air : joystick = vrilles, Saut maintenu + haut / bas = flips.
- **Grab** : maintenir = mute grab ; + joystick bas en l'air = tail grab ; + haut / bas au sol = nose / tail press (avec ←/→ : butter).
- **Bouton doré contextuel** : n'apparaît que s'il y a quelque chose à faire (Monter, Parler, Passer la montée, Rejoindre après une chute ou un blocage). Le bandeau d'information est aussi touchable.
- Raccourcis : Carnet, Moto, Plus (Caméra, Son, Image, Remontée) ; mini-carte **ronde** (repère Nord, objectif épinglé sur le bord), touchable pour ouvrir le plan. Vibrations courtes aux appuis, au saut et au switch.
- Les commandes se masquent pendant un dialogue, le plan ou le carnet. Mises en page portrait, paysage et petits écrans ; touches clavier masquées sur mobile. Le clavier et les tests automatiques gardent le pilotage numérique inchangé.

## Véhicules, remontées et techniques de ski (références BlendSwap)
Références étudiées sur BlendSwap (catalogue « ski », aperçus publics ; aucun fichier tiers n'est intégré au jeu) :

| Référence (id, auteur, licence) | Ce qui en a été appris | Réalisé dans le jeu |
|---|---|---|
| Modern chair-lift (10931, ViSki, CC0) | Télésiège 6 places débrayable à bulle, suspente en J, repose-pieds solidaires de la bulle | `blender/lifts.py` : siège 6 places rembourré, bulle teintée baissée à la montée et relevée à la descente |
| Cable-way car (10735, ViSki, CC0) | Proportions d'une cabine, chariot et bras de suspente | Cabine 10 places arrondie, vitrage panoramique, toit blanc, paniers à skis |
| Modern cable road tower (10973, ViSki, CC0) | Pylône tubulaire, tête en T, passerelle, balanciers | Déjà présents dans le pylône procédural (conservé) |
| Alpine skiing beginner / intermediate / carving / racer (13118, 12381, 15045, 12945, ViSki, CC0) | Postures par niveau : chasse-neige, parallèle, angulation du carving, position de géant | Styles des skieurs du domaine selon la piste et le niveau : chasse-neige bras écartés, parallèle, carving (jambe intérieure fléchie, buste contre-incliné, main intérieure devant), coureur (très bas, pieds écartés, bâtons sous les bras) |
| Penguin Ski Trip (23302, CC-BY) | Seule motoneige du catalogue (dessin animé) | Non utilisée : motoneige moderne modélisée de zéro (`blender/vehicles.py`) |


Autres éléments trouvés dans le catalogue (recherche : sapin, épicéa, chalet, montagne, neige, snowboard, masque, humain) :

| Élément (id, licence) | Décision |
|---|---|
| Lodgepole Pine Set (34925, CC-BY), Midwest Trees (34474, CC-BY), Background spruces (16912, CC-BY) | Non retenus : nos épicéas Blender (atlas d'aiguilles rendu sous Cycles) sont déjà à ce niveau, et la CC-BY imposerait une attribution |
| Wooden building game Swiss chalet (24158, CC-BY) | Non retenu : les chalets et résidences du jeu sont déjà modélisés pièce par pièce |
| Procedural Snowy Mountains (20101, CC0) | Non retenu : shader de déplacement pour Cycles, inutilisable en temps réel ; les montagnes lointaines utilisent la matière « massif » |
| snowboard (13506, CC-BY), goggles on the snow (17304, CC-BY) | Non retenus : snowboards déjà modélisés (balcons) ; masques trop petits à l'écran |
| Human Base Meshes (33726, CC0), Rigged male character (32509, CC0) | Piste pour un prochain lot (corps du joueur plus détaillé) : téléchargement bloqué côté BlendSwap pendant ce lot |

- **Motoneige** (`blender/vehicles.py`) : capot galbé avec bande latérale, selle longue, tunnel et marchepieds ajourés, chenille à crampons et galets, suspension avant à triangles et combinés ressort-amortisseur, skis à spatule relevée, guidon avec protège-mains, pare-brise, phares émissifs. Les points d'appui du pilote sont ceux de l'ancien modèle.
- Les pieds des skieurs sont recalés sur la neige quand le corps s'incline (le ski intérieur ne s'enfonce plus, l'extérieur ne flotte plus).
- `tools/glb_slim.py` (lancé par `embed_assets.py`) : couleurs de sommets sur 8 bits, normales sur 8 bits (KHR_mesh_quantization), UV supprimées quand elles ne servent pas — tous les modèles tiennent dans le budget de 6 Mo.

## Personnages réalistes (corps MakeHuman habillés pour le ski)
- **Corps** : maillage de base MakeHuman et morphes de genre, d'origine, de musculature et de corpulence (données publiées en CC0 par MakeHuman en 2020), poids de skinning `weights.game_engine.json` (CC0 déclaré dans le fichier). Seules les **données** sont lues, par nos propres scripts : aucun code MakeHuman ou MPFB n'est exécuté. Le squelette (20 os) est le nôtre, tendu entre les repères d'articulation du maillage ; doigts et orteils sont fusionnés dans la main et le pied.
- **Vêtements de ski** modélisés sur le corps (`blender/humans.py`) : veste matelassée (surpiqûres en relief, col montant, ourlet droit au-dessus des hanches, tissu lissé pour qu'il ne colle pas au corps), pantalon droit qui tombe sur la chaussure, gants, casque et masque. Tout ce qui est sous les vêtements est supprimé ; un seul maillage skinné par personnage (~7 600 triangles), homme et femme.
- **Animation** : les solveurs de pose existants restent maîtres ; chaque image, chaque os est orienté le long du membre résolu (direction vers l'articulation suivante + référence avant pour la torsion), la hauteur des hanches est recalée. Skis, chaussures et bâtons restent les pièces rigides.
- **Autres skieurs** : les 10 plus proches de la caméra (4 sur mobile) reçoivent un corps réaliste, avec couleur de veste, teinte de peau et taille propres ; au-delà, l'ancien modèle instancié prend le relais. Les habitants nommés ont un corps du bon genre et la couleur de veste de leur commerce.
- `glb_slim` gère désormais les modèles skinnés (matrices de liaison, poids sur 8 bits).
- **Équipement ajusté** : casque et masque sont générés à partir de la surface de la tête elle-même (coque à ~2,4 cm du crâne avec aérations, rebord et sangle du masque ; masque en bandeau sur les yeux avec écran teinté et cadre), au lieu d'une sphère générique trop grosse. Aucun modèle de casque ou de masque de ski n'existe sur BlendSwap (et les téléchargements y restent bloqués) : ce sont nos propres modèles, sur les proportions d'un équipement réel.
- **Habitants du village** : bonnet en maille côtelée avec pompon, yeux visibles ; skieurs, moniteur et pisteuse gardent casque et masque. Couleurs de casque et de bonnet propres à chacun.
- **Peau** : texture photo MakeHuman (CC0, « young caucasian male / female ») recadrée sur l'îlot de la tête en 512 px, sourcils peints dans l'espace UV ; la teinte de peau varie par personnage.
- **Veste** : capuche roulée au col, dorsale avec bretelles, poche poitrine et poches de hanches, fermeture éclair.
- **Expressions du visage** : le visage est un maillage à part (tête et cou, détail conservé autour des paupières, de la bouche et des sourcils) qui porte cinq morphes tirés des unités d'expression MakeHuman (CC0) : clignement, sourire, bouche ouverte, sourcils levés, yeux plissés. En jeu : clignements irréguliers (parfois doubles), sourire des habitants qui s'élargit quand on approche, sourcils levés quand ils saluent, mâchoire qui bouge pendant le dialogue ; le joueur se concentre à grande vitesse et sourit après une figure réussie. Les habitants tournent la tête vers vous à moins de 10 m.
- `shop_signs.png` est stocké en palette 256 couleurs (30 Ko au lieu de 524 Ko, sans différence visible).
- **Remonter à ski (escalier)** : arrêté ou en train de reculer face à une montée de plus de ~10 %, ↑ maintenu déclenche l'escalier : les skis se mettent en travers de la pente, carres plantées, et le skieur monte de côté, ski amont d'abord puis ski aval, bâtons en appui alterné. ← / → inclinent la montée en diagonale ; la cadence baisse avec la pente et dans la poudreuse. Relâcher ↑ (ou ↓) arrête : les skis restent en travers, sans glisser. Sous ~10 %, le pas de patineur reste la technique utilisée.
- **Haut du corps du joueur** : port des bras « mains devant », la main intérieure s'avance dans le virage ; planté de bâton à chaque début de virage (changement de carres ou virage engagé depuis la ligne droite, dès ~11 km/h) en trois temps — la main se tend et la pointe part vers l'avant, le bâton reste planté pendant qu'on le dépasse, puis le bras revient — avec un léger allègement du bassin et l'épaule qui s'abaisse vers le bâton. Contre-rotation des épaules plus marquée (elles anticipent le virage) et petites oscillations naturelles du buste.
- **Mains** : poings gantés fermés (moufle rembourrée, pouce replié, manchette) à la place des mains ouvertes ; la poignée du bâton est placée dans le poing, pour le joueur comme pour les skieurs proches. Le planté de bâton se déclenche aussi au joystick analogique et se lit depuis la caméra de dos (main qui s'écarte et s'avance, pointe vers l'avant puis traînée).

## Secteur La Plagne (adaptation libre et non officielle)
Le domaine de jeu est désormais un carré de 2,8 × 2,8 km centré sur Plagne Centre – Aime 2000 (45,50379 N, 6,67744 E), recréé à partir de données ouvertes. Si ces données ne sont pas embarquées dans la page, ou si le navigateur ne sait pas les décompresser, le Val des Sapins procédural est généré comme avant (vérifié au démarrage).

| Élément | Source | Traitement (`tools/plagne_data.py`) |
|---|---|---|
| Relief du secteur | Tuiles Mapterhorn z14 (IGN RGE ALTI, Etalab 2.0 ; Copernicus DEM GLO-30) | Grille de 449 × 449 points à 6,25 m, 1 746 – 2 590 m |
| Relief lointain (8 km) | Modèle TerraPrinter fourni (mêmes sources) | Recalé par moindres carrés sur le relief fin (écart médian 1,6 m) |
| Horizon (30 km) | Tuiles Mapterhorn z11 (mêmes sources) | Grille à 150 m : vallée de l’Isère, Beaufortain, Vanoise (437 – 3 800 m) |
| Pistes, remontées, bâtiments | OpenStreetMap (ODbL) | Tronçons d'une même piste fusionnés, mini-téléskis écartés, pistes coupées en bord de carte et gardées seulement si on peut les rejoindre depuis une remontée |

- **Contenu** : 48 pistes réelles (31 km) et 17 remontées (Télécabine Télémétro, Télésièges Bécoin, Colorado, Bergerie, Golf…). Le jeu démarre au sommet du **Télésiège Bécoin**, et on descend de chaque remontée en tête de piste. Les villages Plagne Centre, Aime 2000, Plagne 1800, Plagne Villages et Plagne Soleil reprennent l'emprise des bâtiments relevés : tours, barres et « paquebot » pour les stations d'altitude, résidences bois et chalets ailleurs. Seuls les 150 plus grands sont construits (90 sur mobile).
- **Pistes réelles** : le damage suit le profil du terrain et ne creuse jamais plus de 2,5 m. Les replats et les bosses sont donc conservés, et les chemins de liaison restent des chemins.
- **Ajouts du jeu** (absents des relevés) : le **snowpark** occupe la piste SuperSlalom, le long du téléski du Dromadaire (sauts, box et rails). Le **half-pipe** est creusé à côté de Lovatière, au-dessus de Plagne Centre, sur une pente rectiligne à 26 % sans dévers, à l'écart de toutes les pistes et zones de pistes. Il a été déplacé après la restauration des pistes.
- **Personnages et missions** : ils sont déplacés dans les lieux réels.
  - Les commerces du bas sont à Plagne 1800, ceux de la mi-station à Plagne Centre.
  - René conduit le Télésiège Bécoin et Élodie attend à son sommet. Le berger est au départ de Java.
  - Le défi « Le Couloir » devient « La Grande Pente ».
  - Les temps de référence des chronos ont été remesurés par le robot de test, et les livraisons chronométrées recalées sur 1,5 fois son trajet le plus rapide : Belvédère 10 min, croissants 17 min, fondue 5 min. Le défi « Sous la montagne » (tunnels) est retiré.
- **Sauvegardes** : XP, niveau, défis et missions sont conservés.
- **Lacs** : les plans d’eau du relief (parfaitement plats) apparaissaient en noir, un calcul de normale du shader devenant indéfini ; ils sont désormais gelés et enneigés.
- **Crédits** : les sources sont affichées sur l’écran d’accueil et sur le plan des pistes. Seules les données dérivées (`assets/plagne*.json|bin`, 310 Ko) sont versionnées, jamais les fichiers téléchargés.
- **Tests** : le robot descend les 68 pistes jusqu'au bout sans blocage. Il chute 3 fois, sur des bosses franchies à plus de 65 km/h. Les 17 remontées fonctionnent et 19 sauts sur 21 sont réussis.

### Bâtiments d'après photos, terrasses, snowboarders, skis en 3D
Les références sont huit photos de Wikimedia Commons (Plagne Centre, Aime 2000, Plagne Villages), consultées seulement, ni intégrées ni versionnées.

**Bâtiments**
- **Plagne Centre** : barres et tours en béton banché brun rouille. Chaque étage a des loggias, avec garde-corps en bois sombre et neige sur la main courante. Des refends séparent les loggias, les toits plats sont enneigés et certains rez-de-chaussée accueillent des commerces. Les tours montent à 11–15 étages.
- **Aime 2000** :
  - le **Paquebot des neiges** : environ 160 m de long (raccourci à l'arrivée de la Télécabine Télémétro), avec un faîte en trois vagues de 7 à 13 étages. Chaque étage est en retrait sur les deux façades, derrière une terrasse enneigée ;
  - à côté, la tour crème à refends rouges.
- **Plagne Villages, Soleil, 1800** : résidences en bois foncé sur un rez-de-chaussée en crépi crème, avec balcons sur toute la longueur et pignons sous la neige.
- **Soubassements** : plus de pierre sous ces bâtiments, la façade descend jusqu'au sol. Seuls les chalets traditionnels gardent leur pierre.
- Les versions lointaine et rapprochée partagent les mêmes palettes. En station dense, seuls les 12 bâtiments les plus proches (8 sur mobile) sont détaillés.

**Terrasses** : deux par station (une sur mobile), devant les résidences.
- Plancher sur pilotis, garde-corps enneigé et marche vers la neige.
- Bar avec bouteilles, tables, chaises et parasols unis, et une rangée de transats face aux pistes.
- Des skis plantés dans la neige au pied de la terrasse.
- Les clients sont allongés dans les transats, assis à table ou debout au bar et au garde-corps. Ils tiennent un vin chaud, une bière, un verre de rouge ou un cornet de frites, et le portent régulièrement à la bouche. Ils portent un bonnet ou un casque et ont des chaussures de ski aux pieds.

**Snowboarders** : environ un skieur sur quatre, en regular ou en goofy.
- Ils se tiennent de profil sur la planche, genoux fléchis, en appui frontside ou backside dans les virages.
- Les bras sont libres (le bras avant vers le nez de la planche) et ils n'ont pas de bâtons.
- Ils laissent une seule trace dans la neige.
- Sur le télésiège, la planche pend au pied avant.

**Skis en 3D** (`blender/gear.py`) :
- skis cambrés avec spatule relevée, chants, carres, fixations et freins, attachés par paires semelle contre semelle ;
- bâtons ronds avec poignée, dragonne et rondelle ;
- snowboard avec fixations et highbacks.

On les retrouve sur les balcons, aux râteliers des remontées, sur les nouveaux râteliers devant les commerces (deux devant la location et le magasin de sport) et dans les paniers des télécabines (trois paires par côté).

**Tests** : le robot donne des résultats identiques à la version précédente. Le nombre de triangles augmente d'environ 25 %, et les appels de dessin restent au même niveau (environ 1 600 à Plagne Centre sur ordinateur, 400 sur mobile).

### Tracés des pistes contrôlés avec le modèle TerraPrinter
L'archive TerraPrinter (`*-colours-stl.zip`) contient une bande en relief par couleur de piste. Ces bandes sont projetées vue de dessus à 2,5 m et comparées aux tracés du jeu (`tools/plagne_data.py` ; scripts de comparaison hors dépôt).

**Position**
- Les bandes font environ 35 m de large, une limite due à la résolution du modèle imprimable : c'est la précision maximale de la comparaison.
- Par rapport à l'axe des bandes, les tracés du jeu s'écartent de 6 m en médiane, et 90 % des points sont à moins de 17 m (ces derniers surtout aux jonctions, où les bandes s'élargissent).
- Un balayage de recalage de ±20 m donne le meilleur accord à 0 m : il n'y a pas de décalage d'ensemble.
- Près de Grande Pente et des Coqs, les bandes noires sans tracé du jeu sont en fait les **zones de pistes** Morbleu et Palsembleu, que TerraPrinter dessine à cet endroit. Les tracés de ces deux pistes ne sont pas en cause, et ces zones sont maintenant damées.

**Couverture** : elle était insuffisante, et c'est ce que le lot corrige.
- Le tri des données écartait les pistes venant d'une remontée hors secteur (Grande Rochette) et coupait celles qui touchaient le bord de la carte. Il gardait aussi un seul tracé quand deux pistes avaient le même départ et la même arrivée, et ignorait les **zones de pistes** d'OpenStreetMap (66 surfaces et 6 multipolygones).
- Désormais :
  - toutes les pistes du secteur sont gardées en entier : 94 tronçons, 43,4 km (Rochette, Verdons, Petite Rochette, Les Arolles, Mira et Mont Saint-Sauveur complètes, etc.) ;
  - les 49 zones de pistes qui touchent le secteur sont damées sur leur vrai contour (pas d'arbres, neige damée, rattachées à la piste du même nom) et dessinées sur le plan ;
  - sur le plan et dans la liste, seules les pistes nommées sont étiquetées (52). Les tronçons sans nom et les tronçons secondaires gardent leur nom au HUD quand on skie dessus.
- Résultat : la surface des bandes damée dans le jeu passe de 54 % à 77 %, et la part sans aucune piste ni zone du jeu à moins de 30 m de 33 % à 2 %. Le reste tient surtout à la largeur : 35 m pour les bandes, 24 à 30 m pour les pistes du jeu. Seulement 2 % de la surface damée tombe hors d'une bande.

**Tests** :
- 116 tronçons sur 118 descendus par le robot. Les Coqs sort de la carte au bord du secteur, et Chevrette bloque à quelques mètres de son arrivée ;
- le half-pipe a été déplacé à côté de Lovatière : une piste restaurée et une zone de piste passaient sur l'ancien emplacement ;
- les 17 remontées fonctionnent ;
- chronos remesurés : Mont Saint-Sauveur 155 s, Émile Allais 60 s.

### Nouveau gameplay : fantômes, slalom, Première trace

**Fantômes**
- Sur chaque piste chronométrée, la meilleure descente est rejouée par un skieur translucide bleu pendant la tentative suivante. Le chrono affiche l'écart en direct au même point de la piste (−0,8 s en vert, +1,2 s en rouge).
- La première descente devient le fantôme, ensuite seul un meilleur temps le remplace.
- Les fantômes ont leur propre stockage local (`valdessapins.ghosts`). Celui d'une piste modifiée depuis (son nombre d'échantillons diffère) est ignoré, et tout continue de fonctionner si le stockage est bloqué.

**Slalom du Stade Jean-Luc Crétier** (la piste de slalom réelle du secteur, au départ du Bécoin)
- 38 portes rouges et bleues, une tous les 24 m, décalées de 4,5 m de part et d'autre de la ligne et à l'écart des pylônes du télésiège.
- Une porte compte quand on franchit sa ligne entre ses deux piquets. Chaque porte manquée ajoute 3 s, et le compteur « Portes 12/38 · 1 manquée (+3 s) » s'affiche dans le chrono.
- Dès la première descente, on court contre le fantôme de **Bastien, moniteur**. C'est la descente du robot de test, qui passe toutes les portes en 1:18.9 ; ce temps sert aussi de référence pour l'or.
- Nouveau défi « Slalom parfait » (descentes sans porte manquée : 1, 3, 10).

**Première trace** (poudreuse vierge)
- Une grille de 4 m retient quand chaque case a été skiée, par vous ou par un autre. Au bout de 15 minutes la neige redevient vierge, comme les traces visibles qui s'effacent.
- Une ligne commence en poudreuse vierge et s'allonge tant qu'on y reste. Le multiplicateur passe à ×2 après 80 m vierges et monte jusqu'à ×5.
- Croiser une trace plus de 1,5 s ou sortir de la poudreuse clôt la ligne, avec score et record. Une chute la fait perdre.
- Quatre freeriders (deux sur mobile) descendent des lignes hors piste, à 45–60 m des pistes, dans la poudreuse, sans arbres et en descente. Ils laissent leurs traces, donc la neige vierge se raréfie autour d'eux.
- L'XP est versée par le nouveau défi « Première trace » (plus longue ligne : 150, 400, 900 m), pas ligne par ligne : une téléportation ne permet pas de cumuler.

**Tests** :
- slalom propre : 38/38 portes ;
- descente droit dans la pente : 38 portes manquées, +114 s ;
- descente plus lente : écart positif (+17,9 s) face au fantôme ;
- stockage bloqué : aucune erreur ;
- même ligne de poudreuse refaite : 0 m ;
- 1re ligne : 403 m ×5, et le palier bronze du défi ;
- la sauvegarde de niveau 7 est conservée ;
- le monde procédural démarre, sans slalom ni freeriders.

### Virages : planté de bâton et allègement, ensemble
**Joueur**
- Le virage démarre quand la direction passe de l'autre côté, avant même le changement de carres. Le geste se déclenche à ce moment-là, au lieu d'attendre que la carre soit engagée.
- **Planté** : le bras intérieur du nouveau virage part franchement vers l'avant et sur le côté (l'épaule passe d'environ −40° à −90°), et la pointe du bâton est projetée devant les spatules. Le bras opposé équilibre, un peu en arrière.
- **Allègement** : au même instant, les jambes s'étendent. Le bassin remonte avec le redressement du changement de carres, puis le skieur s'enfonce dans le nouveau virage.
- **Physique** : pendant l'allègement, les skis changent de carre 1,6 fois plus vite.

**Autres skieurs**
- Le planté a lieu juste avant le changement de carres, du côté intérieur du virage suivant, au lieu du milieu du virage.
- Le bassin remonte au changement de carres, puis redescend dans le virage.
- Le buste se redresse légèrement pendant l'allègement.
- Pas de planté en chasse-neige, en position de recherche de vitesse ni en snowboard.

**Mesures**
- Chez le joueur : l'épaule passe de −0,70 à −1,59 rad au planté, et le bassin monte d'environ 0,58 à 0,95 m dans les 0,2 s qui suivent l'inversion de la direction.
- Chez un skieur non joueur : le bâton planté pointe vers l'avant juste avant chaque changement de carres, en alternant gauche et droite.
- Le robot de test donne les mêmes résultats qu'avant.
