# Étude : interfaces et HUD des jeux de glisse

Cette étude a servi à refondre les interfaces de Val des Sapins : HUD en jeu, écran d'accueil, plan, carnet, dialogues et commandes tactiles.

Elle sépare deux choses :
- **les constats sourcés**, avec un lien vers la source ;
- **la connaissance du genre**, non sourcée ici, donnée comme hypothèse de travail.

## 1. Constats sourcés

| Jeu | Ce qui est rapporté | Source |
|---|---|---|
| **Steep** (Ubisoft, 2016) | L'interface est jugée chargée et nuit à l'immersion. Les icônes de la « Mountain View » sont peu lisibles. | [New Game Network](https://www.newgamenetwork.com/article/1586/steep-review) · étude UX sur [Medium](https://medium.com/@fibrouspaper/game-ux-case-study-steeps-onboarding-14c35e890331) (page non lisible ici, erreur 403) |
| **Riders Republic** (Ubisoft, 2021) | Le HUD montre la vitesse, l'objectif en cours, une mini-carte et l'endurance. Une option affiche ou masque le HUD. Le mode « sans HUD » laisse pourtant des repères dans le monde 3D. | [ludo.guide, UI](https://www.ludo.guide/guide/riders-republic/getting-started/understanding-the-ui) · [Steam, discussion](https://steamcommunity.com/app/2290180/discussions/0/3817410454880410616) |
| **SSX Tricky / SSX 3 / SSX (2012) / On Tour** | La jauge de boost s'écrit TRICKY. Dans SSX 3, des chevrons montrent l'expiration du combo. En 2012, des chevrons encadrent la jauge Tricky. Dans On Tour, la barre change de couleur en se remplissant. | [Giant Bomb, Uber Trick System](https://giantbomb.com/wiki/Concepts/Uber_Trick_System) · [Speed Demos Archive, SSX 2012](https://kb.speeddemosarchive.com/SSX_(2012)) · [GameSpot, SSX 3](https://www.gamespot.com/articles/ssx3-big-air-big-scores-big-combos/1100-6074830/) |
| **Shredders** (FoamStudio, 2022) | Le score des figures s'affiche en haut à droite. Le texte de la carte, blanc sur blanc, est illisible. Les missions se jouent au score et passent au vert une fois réussies. | [Windows Central](https://windowscentral.com/shredders-xbox-review) · [TheGamer, review](https://www.thegamer.com/shredders-review/) · [TheGamer, conseils](https://www.thegamer.com/shredders-beginner-tips/) |
| **Grand Mountain Adventure** (Toppluva) | On ouvre la carte en haut d'une remontée pour choisir sa descente. Le jeu propose un voyage rapide, et des forfaits ouvrent l'accès aux zones. | [Unofficial Networks](https://unofficialnetworks.com/2020/10/19/grand-mountain-adventure/) · [80.lv, développement](https://80.lv/articles/developing-a-ski-open-world-game-for-mobile?amp=1) · [Steam](https://store.steampowered.com/app/1247360) |
| **Jeux de course : écart au fantôme** (Le Mans Ultimate, BeamNG, Gran Turismo 7) | L'écart s'affiche en vert quand on est en avance, en rouge quand on est en retard. Les temps intermédiaires affichés brièvement sont souvent préférés à un écart permanent. Le temps et l'écart ont chacun leur propre option d'affichage. | [Le Mans Ultimate, HUD](https://guide.lemansultimate.com/hc/en-gb/articles/13201287548687-Understanding-the-HUD-Heads-Up-Display) · [BeamNG Ghost Racer](https://www.beamng.com/resources/ghost-racer-enhanced.39196/) · [GT7, manuel](https://gran-turismo.com/us/gt7/manual/race/02) · [OverTake](https://overtake.gg/news/comments/55756) |

## 2. Connaissance du genre (non sourcée ici)

- **Les coins de l'écran sont réservés aux informations permanentes**, et le centre reste libre pour la pente. Le centre ne sert qu'à des messages brefs : figure réussie, arrivée.
- **Le cap et les repères tiennent sur une boussole en bandeau** en haut de l'écran (Skyrim, les Far Cry, The Crew). On y lit la direction d'un objectif sans regarder la carte.
- **La vitesse s'affiche en grand chiffre**, souvent entouré d'un arc qui se remplit, comme dans les jeux de course.
- **Le niveau et l'XP s'affichent en anneau** autour de la mini-carte ou d'un portrait. Cela évite une barre de plus.
- **Beaucoup de jeux de glisse et de course allègent le HUD à grande vitesse.** Les éléments secondaires (outils, aide) deviennent transparents, alors que les éléments vitaux (chrono, invite d'action) restent opaques.
- **Sur mobile**, les boutons d'action restent toujours opaques et à des emplacements fixes. Les flous d'arrière-plan sont évités, car ils coûtent cher au GPU.

## 3. Décisions pour Val des Sapins

| Constat | Décision |
|---|---|
| Steep : HUD jugé chargé | Seuls 4 blocs permanents : vitesse, mini-carte, boussole (sur grand écran) et score. Tout le reste est contextuel. L'aide est repliée en une pastille « H · Commandes ». |
| Riders Republic : vitesse, objectif, mini-carte | Un compteur en arc entoure la vitesse. Le suivi de mission affiche un chrono de mission bien visible. La mini-carte est ronde, comme demandé auparavant. |
| Boussole (genre) | Nouvelle boussole en bandeau, avec le nord vers −z. Elle porte des repères : objectif de mission (doré), remontée ouverte la plus proche (bleu) et fantôme du chrono (cyan). |
| Anneau d'XP (genre) | Un anneau d'XP entoure la mini-carte, avec un badge de niveau. Le bandeau central « Freestyle · Niv. » disparaît. |
| Course : écart vert / rouge, temps intermédiaires brefs | Le chrono garde l'écart permanent (vert ou rouge). S'y ajoutent des temps intermédiaires au quart, à la moitié et aux trois quarts du parcours, affichés 3 s. |
| SSX : jauges qui changent d'état | Le jeu n'a pas d'état de combo, donc aucune jauge de combo n'est inventée. **Première trace** reçoit son propre widget, lié à l'état réel `LINE` : multiplicateur, mètres vierges, progression vers le palier suivant, alerte rouge quand on croise une trace. |
| Shredders : carte illisible | Le plan contraste avec le fond, avec une colonne d'onglets (Pistes · Remontées · Carnet). Il tient à 1000×560, et les crédits restent visibles. |
| GMA : carte au sommet pour choisir | Le plan s'ouvre toujours depuis la mini-carte (toucher ou M). La téléportation vers les remontées se trouve dans l'onglet « Remontées ». |
| Mobile (genre) | Pas de flou sur les écrans tactiles. Le joystick reste fixe. 1 tape = saut, 2 tapes = switch. Les boutons ne s'effacent jamais. |

Garde-fous techniques :
- **Contrat d'identifiants.** Tous les `id` lus par le code existent toujours ; un test le vérifie.
- **Test de chevauchement.** Un test automatique contrôle que les blocs visibles du HUD ne se chevauchent pas, à 1000×560, 390×844 et 844×390, dans plusieurs états : repos, vitesse, chrono de slalom, mission chronométrée, pile de toasts, dialogue, remontée, première trace, plan et chaque onglet du carnet.
