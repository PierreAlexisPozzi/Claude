"""Bâtiments de La Plagne d'après la BD TOPO® de l'IGN (tranche T5 bis).

Source : IGN, BD TOPO® V3, couche « batiment », service WFS de la Géoplateforme (data.geopf.fr), Licence Ouverte
Etalab 2.0 (licence vérifiée sur data.gouv.fr, jeu « BD TOPO® » publié par l'IGN : licence « lov2 »).

Ce script ne touche qu'au tableau « buildings » de assets/plagne.json (et à l'attribution) : relief, pistes,
remontées, lieux et zones restent ceux de plagne_data.py. Pour chaque bâtiment IGN :
  - emprise : rectangle orienté de surface minimale (même méthode que plagne_data.py), repère du jeu (x est, z sud) ;
  - étages (« levels ») : d'après le toit, comptés au-dessus du sol AMONT, puisque le jeu pose le rez-de-chaussée sur
    le point haut du terrain et habille l'aval d'un soubassement : h = altitude_minimale_toit − altitude_maximale_sol
    (à défaut, « hauteur ») ; levels = 1 + arrondi((h − 3,4) / 2,9) (rez-de-chaussée 3,4 m, étages 2,9 m) ;
  - nom et genre : repris du bâtiment OpenStreetMap qui le recouvre le plus (un nom OSM ne va qu'à une emprise) ;
    sinon genre d'après l'usage IGN.
Les constructions légères (abris, auvents) sont écartées, comme les emprises de moins de 40 m².

Le téléchargement brut reste dans web/.cache/raw/ (jamais versionné) ; seuls plagne.json, la provenance
(assets/plagne_buildings_source.json) et le rapport (review/donnees_batiments_ign.md) sont écrits.

Usage : python3 tools/bdtopo_buildings.py [--refresh]
"""
import json, math, os, sys, urllib.request, urllib.parse, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plagne_meta import attribution

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
CACHE = os.path.join(ROOT, 'web', '.cache', 'raw', 'bdtopo_batiment.json')
WFS = 'https://data.geopf.fr/wfs/ows'
LAYER = 'BDTOPO_V3:batiment'
GF, FLOOR = 3.4, 2.9
USAGE_KIND = {'Résidentiel': 'apartments', 'Commercial et services': 'commercial', 'Sportif': 'sports', 'Industriel': 'industrial',
              'Annexe': 'shed', 'Agricole': 'farm', 'Religieux': 'church'}


def fetch(bbox, refresh=False):
    if os.path.exists(CACHE) and not refresh:
        return json.load(open(CACHE))
    feats, start = [], 0
    while True:
        q = {'SERVICE': 'WFS', 'VERSION': '2.0.0', 'REQUEST': 'GetFeature', 'TYPENAMES': LAYER, 'OUTPUTFORMAT': 'application/json',
             'COUNT': 1000, 'STARTINDEX': start, 'BBOX': '%f,%f,%f,%f,urn:ogc:def:crs:EPSG::4326' % bbox}
        with urllib.request.urlopen(WFS + '?' + urllib.parse.urlencode(q), timeout=120) as r:
            page = json.load(r)
        feats += page['features']
        if len(page['features']) < 1000:
            break
        start += 1000
    data = {'type': 'FeatureCollection', 'features': feats}
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump(data, open(CACHE, 'w'))
    return data


def edition():
    """Édition annoncée par le service (résumé de la couche dans GetCapabilities)."""
    q = {'SERVICE': 'WFS', 'VERSION': '2.0.0', 'REQUEST': 'GetCapabilities'}
    try:
        with urllib.request.urlopen(WFS + '?' + urllib.parse.urlencode(q), timeout=120) as r:
            s = r.read().decode('utf-8', 'ignore')
        i = s.find('<Name>%s</Name>' % LAYER); j = s.find('<Abstract>', i); k = s.find('</Abstract>', j)
        return s[j + 10:k].strip()
    except Exception as e:   # hors ligne : l'édition reste celle de la provenance précédente
        return None


def min_rect(pts):
    cx, cz = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
    best = None
    for p, q in zip(pts, pts[1:]):
        ang = math.atan2(q[1] - p[1], q[0] - p[0]); ca, sa = math.cos(ang), math.sin(ang)
        us = [(v[0] - cx) * ca + (v[1] - cz) * sa for v in pts]; vs = [-(v[0] - cx) * sa + (v[1] - cz) * ca for v in pts]
        area = (max(us) - min(us)) * (max(vs) - min(vs))
        if best is None or area < best[0]:
            uc, vc = (max(us) + min(us)) / 2, (max(vs) + min(vs)) / 2
            best = (area, ang, max(us) - min(us), max(vs) - min(vs), cx + uc * ca - vc * sa, cz + uc * sa + vc * ca)
    return best


def in_poly(x, z, ring):
    ins = False
    for (x1, z1), (x2, z2) in zip(ring, ring[1:]):
        if (z1 > z) != (z2 > z) and x < x1 + (z - z1) * (x2 - x1) / (z2 - z1):
            ins = not ins
    return ins


def rect_pts(b, step=2.0):
    ca, sa = math.cos(-b['rot']), math.sin(-b['rot'])   # rot = -angle (plagne_data.py)
    n_u, n_v = max(1, int(b['w'] / step)), max(1, int(b['d'] / step))
    for i in range(n_u):
        for j in range(n_v):
            u = -b['w'] / 2 + (i + 0.5) * b['w'] / n_u; v = -b['d'] / 2 + (j + 0.5) * b['d'] / n_v
            yield b['x'] + u * ca - v * sa, b['z'] + u * sa + v * ca


def main():
    refresh = '--refresh' in sys.argv
    path = os.path.join(ASSETS, 'plagne.json')
    data = json.load(open(path))
    meta = data['meta']
    lat0, lon0, world = meta['lat0'], meta['lon0'], meta['world']
    kx, kz = 111320 * math.cos(math.radians(lat0)), 110574
    half = world / 2
    m = half + 100
    bbox = (lat0 - m / kz, lon0 - m / kx, lat0 + m / kz, lon0 + m / kx)
    raw = fetch(bbox, refresh)
    osm = [b for b in data['buildings'] if b.get('src') != 'bdtopo'] if not os.path.exists(os.path.join(ASSETS, 'plagne_buildings_osm.json')) \
        else json.load(open(os.path.join(ASSETS, 'plagne_buildings_osm.json')))
    # garder la liste OSM d'origine (noms, genres) pour les reconversions suivantes
    if not os.path.exists(os.path.join(ASSETS, 'plagne_buildings_osm.json')):
        json.dump(osm, open(os.path.join(ASSETS, 'plagne_buildings_osm.json'), 'w'), ensure_ascii=False, separators=(',', ':'))

    ign, skipped = [], {'légère': 0, 'petite': 0, 'hors secteur': 0, 'état': 0}
    for f in raw['features']:
        pr = f['properties']
        if pr.get('etat_de_l_objet') not in (None, 'En service'):
            skipped['état'] += 1; continue
        if pr.get('construction_legere'):
            skipped['légère'] += 1; continue
        for poly in f['geometry']['coordinates']:           # MultiPolygon : chaque partie est une emprise
            ring = [((p[0] - lon0) * kx, -(p[1] - lat0) * kz) for p in poly[0]]
            area, ang, w, d, bx, bz = min_rect(ring)
            if abs(bx) > half - 40 or abs(bz) > half - 40:
                skipped['hors secteur'] += 1; continue
            if w * d < 40:
                skipped['petite'] += 1; continue
            top, solmax, h = pr.get('altitude_minimale_toit'), pr.get('altitude_maximale_sol'), pr.get('hauteur')
            he = top - solmax if top is not None and solmax is not None else h
            levels = 1 + max(0, round((he - GF) / FLOOR)) if he else None
            ign.append({'ring': ring, 'rec': {'x': round(bx, 1), 'z': round(bz, 1), 'w': round(w, 1), 'd': round(d, 1), 'rot': round(-ang, 3),
                        'levels': levels, 'kind': USAGE_KIND.get(pr.get('usage_1'), 'yes'), 'name': '',
                        'h': round(h, 1) if h else None, 'storeys': pr.get('nombre_d_etages'), 'usage': pr.get('usage_1') or '', 'src': 'bdtopo', 'id': pr.get('cleabs')}})
    # appariement : chaque bâtiment OSM va à l'emprise IGN qu'il recouvre le plus
    hits_by_osm, matched_ign, offsets = [], {}, []
    for ob in osm:
        r = math.hypot(ob['w'], ob['d']) / 2 + 30
        cand = [g for g in ign if abs(g['rec']['x'] - ob['x']) < r + 60 and abs(g['rec']['z'] - ob['z']) < r + 60]
        counts = {}
        for x, z in rect_pts(ob):
            for g in cand:
                if in_poly(x, z, g['ring']):
                    counts[id(g)] = counts.get(id(g), 0) + 1; break
        tot = sum(1 for _ in rect_pts(ob))
        if not counts:
            hits_by_osm.append((ob, None, 0)); continue
        gid = max(counts, key=counts.get); g = next(c for c in cand if id(c) == gid)
        share = counts[gid] / tot
        hits_by_osm.append((ob, g, share))
    # un nom OSM ne va qu'à une emprise ; une emprise ne prend que le nom du bâtiment OSM qu'elle couvre le mieux
    best_for = {}
    for ob, g, share in hits_by_osm:
        if g is None or share < 0.25:
            continue
        k = id(g)
        if k not in best_for or share > best_for[k][1]:
            best_for[k] = (ob, share)
    for g in ign:
        e = best_for.get(id(g))
        if e:
            ob = e[0]; g['rec']['name'] = ob.get('name') or ''
            if ob.get('kind') and ob['kind'] != 'yes':
                g['rec']['kind'] = ob['kind']
            matched_ign[id(g)] = ob
            if e[1] > 0.6 and 0.7 < (g['rec']['w'] * g['rec']['d']) / max(1, ob['w'] * ob['d']) < 1.4:
                offsets.append((g['rec']['x'] - ob['x'], g['rec']['z'] - ob['z']))
    osm_only = [ob for ob, g, share in hits_by_osm if g is None or share < 0.25]
    named_lost = [ob for ob in osm if ob.get('name') and not any(e[0] is ob for e in best_for.values())]
    B = [g['rec'] for g in ign]
    B.sort(key=lambda b: (-(b['w'] * b['d']), b['x'], b['z']))
    data['buildings'] = B
    ed = edition() or meta.get('buildings_source', {}).get('edition')
    import re
    mt = re.search(r'\d{4}-\d{2}-\d{2}', ed or ''); edate = mt.group(0) if mt else ''
    meta['buildings_source'] = {'source': 'IGN BD TOPO®', 'layer': LAYER, 'edition': ed, 'licence': 'Licence Ouverte Etalab 2.0'}
    meta['attribution'] = attribution(edate)
    json.dump(data, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
    prov = {'source': 'IGN — BD TOPO® V3, couche batiment', 'service': WFS, 'layer': LAYER, 'edition': ed,
            'licence': 'Licence Ouverte Etalab 2.0 (data.gouv.fr, jeu « BD TOPO® » de l’IGN : lov2)',
            'bbox_wgs84': [round(v, 6) for v in bbox], 'features': len(raw['features']), 'buildings': len(B),
            'skipped': skipped, 'converted': datetime.date.today().isoformat()}
    json.dump(prov, open(os.path.join(ASSETS, 'plagne_buildings_source.json'), 'w'), ensure_ascii=False, indent=1)
    med = lambda a: sorted(a)[len(a) // 2] if a else 0
    dx, dz = med([o[0] for o in offsets]), med([o[1] for o in offsets])
    lines = ['# Bâtiments : BD TOPO® de l’IGN à la place d’OpenStreetMap (T5 bis)', '',
             'Généré par `tools/bdtopo_buildings.py`. Source : %s, édition « %s », %s.' % (prov['source'], ed, prov['licence']), '',
             '| | Nombre |', '|---|---|',
             '| Objets IGN dans l’emprise téléchargée | %d |' % len(raw['features']),
             '| Emprises IGN retenues (≥ 40 m², dans le secteur, hors constructions légères) | %d |' % len(B),
             '| Écartées : légères %d, petites %d, hors secteur %d, autre état %d | |' % (skipped['légère'], skipped['petite'], skipped['hors secteur'], skipped['état']),
             '| Bâtiments OSM d’avant | %d |' % len(osm),
             '| Emprises IGN ayant reçu un nom ou un genre OSM | %d |' % len(matched_ign),
             '| Emprises IGN sans équivalent OSM (nouvelles) | %d |' % (len(B) - len(matched_ign)),
             '| Bâtiments OSM sans emprise IGN (disparus du jeu) | %d |' % len(osm_only), '',
             'Décalage médian des centres (paires sans ambiguïté, %d) : %.1f m vers l’est, %.1f m vers le sud.' % (len(offsets), dx, dz), '',
             '## Bâtiments OSM sans emprise IGN', '']
    for ob in sorted(osm_only, key=lambda b: -b['w'] * b['d'])[:40]:
        lines.append('- (%.0f, %.0f) %.0f × %.0f m, %s%s' % (ob['x'], ob['z'], ob['w'], ob['d'], ob.get('kind') or '', (' — ' + ob['name']) if ob.get('name') else ''))
    lines += ['', '## Noms OSM non repris', '']
    lines += ['- %s (%.0f, %.0f)' % (ob['name'], ob['x'], ob['z']) for ob in named_lost] or ['- aucun']
    lines += ['', '## Hauteurs', '', 'Étages du jeu = 1 + arrondi((toit − sol amont − 3,4) / 2,9). Répartition :', '']
    hist = {}
    for b in B:
        hist[b['levels']] = hist.get(b['levels'], 0) + 1
    lines += ['| Étages | Bâtiments |', '|---|---|'] + ['| %s | %d |' % (k, hist[k]) for k in sorted(hist, key=lambda v: (v is None, v or 0))]
    open(os.path.join(ROOT, 'review', 'donnees_batiments_ign.md'), 'w').write('\n'.join(lines) + '\n')
    print('IGN %d emprises (OSM %d) ; %d nommées/typées depuis OSM ; %d OSM sans emprise ; décalage médian %.1f, %.1f m'
          % (len(B), len(osm), len(matched_ign), len(osm_only), dx, dz))


if __name__ == '__main__':
    main()
