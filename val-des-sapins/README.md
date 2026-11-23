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
