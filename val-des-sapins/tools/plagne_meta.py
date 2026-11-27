"""Attribution des données de assets/plagne.json, construite en un seul endroit (affichée sur l'écran d'accueil et la
carte du jeu). Utilisée par bdtopo_buildings.py et osm_venues.py."""


def attribution(ign_edition=''):
    return ("Secteur Plagne Centre – Aime 2000, adaptation libre et non officielle, sans lien avec la station. "
            "Relief : IGN RGE ALTI (Licence Ouverte Etalab 2.0) et Copernicus DEM GLO-30, via Mapterhorn et TerraPrinter. "
            "Bâtiments : IGN BD TOPO®%s (Licence Ouverte Etalab 2.0). " % ((' édition ' + ign_edition) if ign_edition else '') +
            "Pistes, remontées, noms et emplacement des restaurants et bars : © les contributeurs d’OpenStreetMap (ODbL). "
            "Snowpark et half-pipe ajoutés pour le jeu.")
