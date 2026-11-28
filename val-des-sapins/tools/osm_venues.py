"""Restaurants, bars et cafés de La Plagne d'après OpenStreetMap (tranche T5 ter), pour placer les terrasses.

Ni OpenStreetMap ni la BD TOPO de l'IGN ne tracent les terrasses elles-mêmes dans ce secteur (aucune surface
« leisure=outdoor_seating » ; la BD TOPO n'a ni restaurants ni terrasses). Le jeu pose donc une terrasse là où OSM
situe un restaurant, un bar ou un café, sur la façade « front de neige » de l'immeuble qui le contient : c'est une
déduction, pas une donnée relevée.

Source : extrait de l'API OpenStreetMap (appel « map » sur l'emprise du secteur, ODbL), gardé dans
web/.cache/raw/plagne_osm.xml (jamais versionné). Écrit dans assets/plagne.json la collection « venues » : position
(repère du jeu), genre, terrasse déclarée (outdoor_seating) — sans les noms commerciaux, qui restent dans le rapport
review/terrasses_osm.md. Sont écartés : outdoor_seating=no, et les établissements à l'étage (level ≥ 1).

Usage : python3 tools/osm_venues.py [--refresh]
"""
import json, math, os, sys, urllib.request, xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plagne_meta import attribution

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'web', '.cache', 'raw', 'plagne_osm.xml')
KINDS = ('restaurant', 'bar', 'cafe', 'pub', 'fast_food', 'biergarten')


def main():
    path = os.path.join(ROOT, 'assets', 'plagne.json')
    data = json.load(open(path)); meta = data['meta']
    lat0, lon0, half = meta['lat0'], meta['lon0'], meta['world'] / 2
    kx, kz = 111320 * math.cos(math.radians(lat0)), 110574
    if not os.path.exists(RAW) or '--refresh' in sys.argv:
        m = half + 100
        url = 'https://api.openstreetmap.org/api/0.6/map?bbox=%f,%f,%f,%f' % (lon0 - m / kx, lat0 - m / kz, lon0 + m / kx, lat0 + m / kz)
        req = urllib.request.Request(url, headers={'User-Agent': 'val-des-sapins-data/1.0'})
        os.makedirs(os.path.dirname(RAW), exist_ok=True)
        open(RAW, 'wb').write(urllib.request.urlopen(req, timeout=180).read())
    root = ET.parse(RAW).getroot()
    nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in root.iter('node')}
    venues, report, skipped = [], [], []
    for el in list(root.iter('node')) + list(root.iter('way')):
        t = {k.get('k'): k.get('v') for k in el.iter('tag')}
        if t.get('amenity') not in KINDS:
            continue
        if el.tag == 'node':
            la, lo = nodes[el.get('id')]
        else:
            pts = [nodes[n.get('ref')] for n in el.iter('nd') if n.get('ref') in nodes]
            if not pts:
                continue
            la, lo = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
        x, z = (lo - lon0) * kx, -(la - lat0) * kz
        if abs(x) > half - 20 or abs(z) > half - 20:
            continue
        name, outdoor, level = t.get('name', ''), t.get('outdoor_seating'), t.get('level', '')
        why = 'sans terrasse (outdoor_seating=no)' if outdoor == 'no' else 'à l’étage (level=%s)' % level if level and level.lstrip('-').isdigit() and int(level) >= 1 else ''
        row = (round(x), round(z), t['amenity'], name, outdoor or '', why)
        if why:
            skipped.append(row); continue
        venues.append({'x': round(x, 1), 'z': round(z, 1), 'kind': t['amenity'], 'outdoor': 1 if outdoor == 'yes' else 0})
        report.append(row)
    venues.sort(key=lambda v: (v['z'], v['x']))
    data['venues'] = venues
    ed = (meta.get('buildings_source') or {}).get('edition') or ''
    import re
    mt = re.search(r'\d{4}-\d{2}-\d{2}', ed); meta['attribution'] = attribution(mt.group(0) if mt else '')
    json.dump(data, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
    lines = ['# Terrasses : restaurants, bars et cafés d’OpenStreetMap (T5 ter)', '',
             'Généré par `tools/osm_venues.py` (extrait de l’API OpenStreetMap, ODbL). Aucune des deux sources ne trace les',
             'terrasses : le jeu en pose une là où OSM situe un établissement, sur la façade front de neige de l’immeuble',
             'qui le contient (règles et contrôles : `web/src/game/buildings.ts`, `planTerrace`, `web/tests/terraces.spec.ts`).', '',
             '- Établissements retenus : %d (dont %d avec « terrasse : oui » déclarée)' % (len(venues), sum(v['outdoor'] for v in venues)),
             '- Écartés : %d' % len(skipped), '', '| x | z | genre | nom (OSM) | terrasse déclarée |', '|---|---|---|---|---|']
    lines += ['| %d | %d | %s | %s | %s |' % r[:5] for r in sorted(report, key=lambda r: (r[1], r[0]))]
    lines += ['', '## Écartés', ''] + ['- %s (%d, %d) : %s' % (r[3], r[0], r[1], r[5]) for r in skipped]
    open(os.path.join(ROOT, 'review', 'terrasses_osm.md'), 'w').write('\n'.join(lines) + '\n')
    print('venues %d (terrasse déclarée %d), écartés %d' % (len(venues), sum(v['outdoor'] for v in venues), len(skipped)))


if __name__ == '__main__':
    main()
