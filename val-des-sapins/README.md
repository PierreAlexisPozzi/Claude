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
