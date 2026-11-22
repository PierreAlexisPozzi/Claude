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
