"""Couverture du sol d'après OpenStreetMap (tranche T8b) : bois et forêts, roche nue, éboulis.

Source : le même extrait de l'API OpenStreetMap que tools/osm_venues.py (appel « map » sur l'emprise du secteur, ODbL),
gardé dans web/.cache/raw/plagne_osm.xml (jamais versionné ; `python3 tools/osm_venues.py --refresh` le retélécharge).

Retenus : natural=wood, landuse=forest (→ « wood », avec leaf_type quand il est renseigné), natural=bare_rock (→ « rock »),
natural=scree (→ « scree »). Chemins fermés et multipolygones (anneaux extérieurs et intérieurs, raccordés bout à bout).
Les essences ne sont pas renseignées ici (quelques leaf_type=needleleaved seulement) : le mélange épicéas / mélèzes du
jeu est un choix, pas une donnée.

Écrit dans assets/plagne.json la collection « landcover » : [{k, leaf, poly: [[x, z]…], holes: [[[x, z]…]…]}] (repère du
jeu, anneau extérieur simplifié à 2 m dans « poly », encodé en binaire dans les tuiles ; clairières dans « holes »), et le rapport review/couverture_osm.md (surfaces par type).

Usage : python3 tools/osm_landcover.py
"""
import collections, json, math, os, re, sys, xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plagne_meta import attribution

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'web', '.cache', 'raw', 'plagne_osm.xml')


def kind(t):
    if t.get('natural') == 'wood' or t.get('landuse') == 'forest':
        return 'wood'
    if t.get('natural') == 'bare_rock':
        return 'rock'
    if t.get('natural') == 'scree':
        return 'scree'
    return None


def simplify(pts, eps=2.0):
    """Douglas-Peucker sur un anneau fermé : coupé en deux au point le plus éloigné du premier (sinon la corde est nulle
    et rien n'est simplifié), chaque moitié simplifiée, l'anneau refermé."""
    if len(pts) < 5:
        return pts
    def rec(a, b):
        (x0, z0), (x1, z1) = pts[a], pts[b]
        dx, dz = x1 - x0, z1 - z0; L = math.hypot(dx, dz) or 1e-9
        best, bi = 0.0, -1
        for i in range(a + 1, b):
            d = abs((pts[i][0] - x0) * dz - (pts[i][1] - z0) * dx) / L
            if d > best:
                best, bi = d, i
        return rec(a, bi) + rec(bi, b)[1:] if best > eps else [pts[a], pts[b]]
    far = max(range(1, len(pts) - 1), key=lambda i: math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]))
    out = rec(0, far) + rec(far, len(pts) - 1)[1:]
    return out if len(out) >= 4 else pts


def rings(ways):
    """raccorde des chemins (listes de nœuds) en anneaux fermés"""
    ways = [list(w) for w in ways if len(w) >= 2]
    out = []
    while ways:
        cur = ways.pop(0)
        changed = True
        while cur[0] != cur[-1] and changed:
            changed = False
            for i, w in enumerate(ways):
                if w[0] == cur[-1]: cur += w[1:]
                elif w[-1] == cur[-1]: cur += w[::-1][1:]
                elif w[-1] == cur[0]: cur = w[:-1] + cur
                elif w[0] == cur[0]: cur = w[::-1][:-1] + cur
                else: continue
                ways.pop(i); changed = True; break
        if cur[0] == cur[-1] and len(cur) >= 4:
            out.append(cur)
    return out


def area(r):
    return abs(sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1))) / 2


def main():
    path = os.path.join(ROOT, 'assets', 'plagne.json')
    data = json.load(open(path)); meta = data['meta']
    lat0, lon0, half = meta['lat0'], meta['lon0'], meta['world'] / 2
    kx, kz = 111320 * math.cos(math.radians(lat0)), 110574
    root = ET.parse(RAW).getroot()
    nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in root.iter('node')}
    wayn = {w.get('id'): [nd.get('ref') for nd in w.iter('nd')] for w in root.iter('way')}
    xy = lambda ids: [(round((nodes[i][1] - lon0) * kx, 1), round(-(nodes[i][0] - lat0) * kz, 1)) for i in ids if i in nodes]
    out, rows, seen = [], collections.Counter(), collections.Counter()
    for w in root.iter('way'):
        t = {k.get('k'): k.get('v') for k in w.iter('tag')}
        k = kind(t); ids = wayn[w.get('id')]
        if k and ids and ids[0] == ids[-1]:
            out.append({'k': k, 'leaf': t.get('leaf_type'), 'outer': [xy(ids)], 'inner': []})
    for r in root.iter('relation'):
        t = {k.get('k'): k.get('v') for k in r.iter('tag')}
        k = kind(t)
        if not k or t.get('type') != 'multipolygon':
            continue
        seen['relations'] += 1
        outer = [wayn[m.get('ref')] for m in r.iter('member') if m.get('type') == 'way' and m.get('role') == 'outer' and m.get('ref') in wayn]
        inner = [wayn[m.get('ref')] for m in r.iter('member') if m.get('type') == 'way' and m.get('role') == 'inner' and m.get('ref') in wayn]
        out.append({'k': k, 'leaf': t.get('leaf_type'), 'outer': [xy(x) for x in rings(outer)], 'inner': [xy(x) for x in rings(inner)]})
    cover = []
    for o in out:
        for ring in o['outer']:
            seen['points'] += len(ring); ring = simplify(ring); seen['kept'] += len(ring)
            if len(ring) < 4 or not any(abs(x) < half + 200 and abs(z) < half + 200 for x, z in ring):
                continue
            inner = [simplify(r) for r in o['inner']]; seen['holes'] += len(inner)
            cover.append({'k': o['k'], 'leaf': o['leaf'], 'poly': ring, 'holes': inner})
            rows[o['k']] += area(ring) - sum(area(r) for r in inner)
    data['landcover'] = cover
    ed = (meta.get('buildings_source') or {}).get('edition') or ''
    mt = re.search(r'\d{4}-\d{2}-\d{2}', ed); meta['attribution'] = attribution(mt.group(0) if mt else '')
    json.dump(data, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
    names = {'wood': 'bois et forêts', 'rock': 'roche nue', 'scree': 'éboulis'}
    lines = ['# Couverture du sol : bois, roche nue, éboulis d’après OpenStreetMap (T8b)', '',
             'Généré par `tools/osm_landcover.py` (extrait de l’API OpenStreetMap, ODbL). Contours simplifiés à 2 m près',
             '(Douglas-Peucker) : %d points ramenés à %d. Multipolygones lus : %d ; anneaux intérieurs (clairières) : %d.'
             % (seen['points'], seen['kept'], seen['relations'], seen['holes']),
             'Les essences ne sont pas renseignées (quelques `leaf_type=needleleaved` seulement) : le mélange épicéas /',
             'mélèzes du jeu est un choix, pas une donnée.', '', '| Type | Polygones | Surface (ha, tout l’extrait) |', '|---|---|---|']
    for k in ('wood', 'rock', 'scree'):
        lines.append('| %s | %d | %.1f |' % (names[k], sum(1 for c in cover if c['k'] == k), rows[k] / 1e4))
    open(os.path.join(ROOT, 'review', 'couverture_osm.md'), 'w').write('\n'.join(lines) + '\n')
    print('landcover', len(cover), {k: round(v / 1e4, 1) for k, v in rows.items()}, dict(seen))


if __name__ == '__main__':
    main()
