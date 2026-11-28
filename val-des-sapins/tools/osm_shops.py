"""Commerces de La Plagne d'après OpenStreetMap (tranche T6) : le jeu met des vitrines là où OSM situe un commerce, et
des logements ailleurs.

Source : le même extrait de l'API OpenStreetMap que tools/osm_venues.py (appel « map » sur l'emprise du secteur, ODbL),
gardé dans web/.cache/raw/plagne_osm.xml (jamais versionné ; `python3 tools/osm_venues.py --refresh` le retélécharge).

Retenus : les commerces et services qui ont une vitrine (shop=*, restaurants, bars, cafés, location de skis, pharmacie,
banque, poste, agences, office de tourisme…). Écartés : les hébergements (hôtels, résidences : ce sont des logements),
les panneaux et pupitres d'information, les distributeurs de billets isolés, les commerces à l'étage (level ≥ 1) et ceux
hors du secteur. Écrit dans assets/plagne.json la collection « shops » : position (repère du jeu) et type de vitrine
(indice d'enseigne, voir KINDS) — sans les noms ni les marques, qui restent dans le rapport review/commerces_osm.md.

Usage : python3 tools/osm_shops.py
"""
import collections, json, math, os, re, sys, xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from plagne_meta import attribution

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, 'web', '.cache', 'raw', 'plagne_osm.xml')
# indices d'enseigne du jeu (web/tools/shop-signs.mjs) ; 0 à 7 : les huit commerces d'origine (et leurs commerçants)
KINDS = ['Location de skis', 'Épicerie', 'Sport & mode', 'Le Caquelon (restaurant du chef)', 'Boucherie', 'Fromagerie',
         'Souvenirs', 'Boulangerie', 'Pharmacie', 'Agence immobilière', 'Banque', 'Forfaits · informations', 'Services',
         'Restaurant', 'Bar', 'Café · snack']


def kind(t):
    """Type de vitrine d'un objet OSM, ou (None, raison)."""
    s, a, sport = t.get('shop', ''), t.get('amenity', ''), t.get('sport', '') + t.get('sports', '')
    if s in ('ski', 'ski_rental') or a == 'ski_rental' or (s == 'sports' and (re.search('ski|snowboard', sport) or 'rental' in ' '.join(t))):
        return 0, 'location de skis'
    if s in ('supermarket', 'convenience', 'greengrocer', 'deli', 'wine', 'alcohol', 'mall'): return 1, s
    if s in ('sports', 'outdoor', 'clothes', 'boutique', 'shoes', 'fashion'): return 2, s
    if s in ('butcher',): return 4, s
    if s in ('cheese',): return 5, s
    if s in ('gift', 'souvenirs', 'tobacco', 'newsagent', 'tobacconist;souvenirs', 'books', 'toys', 'photo'): return 6, s
    if s in ('bakery', 'pastry', 'confectionery', 'chocolate'): return 7, s
    if a in ('pharmacy', 'doctors', 'clinic'): return 8, a
    if t.get('office') in ('estate_agent',) or s in ('estate_agent',): return 9, 'agence immobilière'
    if a in ('bank', 'bureau_de_change'): return 10, a
    if s in ('ticket',) or (t.get('tourism') == 'information' and t.get('information') == 'office'): return 11, 'forfaits ou office de tourisme'
    if s in ('laundry', 'dry_cleaning', 'hairdresser', 'beauty', 'car_repair', 'massage', 'travel_agency') or a in ('post_office', 'cinema', 'childcare') \
            or t.get('leisure') in ('bowling_alley', 'fitness_centre') or (t.get('office') and t.get('office') != 'estate_agent'):
        return 12, s or a or t.get('leisure') or 'office=' + t.get('office', '')
    if a == 'restaurant': return 13, a
    if a in ('bar', 'pub', 'nightclub'): return 14, a
    if a in ('cafe', 'fast_food', 'ice_cream'): return 15, a
    if s: return 12, s   # autre commerce : vitrine « services »
    return None, None


def main():
    path = os.path.join(ROOT, 'assets', 'plagne.json')
    data = json.load(open(path)); meta = data['meta']
    lat0, lon0, half = meta['lat0'], meta['lon0'], meta['world'] / 2
    kx, kz = 111320 * math.cos(math.radians(lat0)), 110574
    root = ET.parse(RAW).getroot()
    nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in root.iter('node')}
    shops, rows, skipped = [], [], []
    for el in list(root.iter('node')) + list(root.iter('way')):
        t = {k.get('k'): k.get('v') for k in el.iter('tag')}
        k, what = kind(t)
        if k is None:
            if t.get('tourism') in ('hotel', 'apartment', 'hostel', 'guest_house', 'chalet') and t.get('name'):
                what = 'hébergement (logements)'
            elif t.get('amenity') == 'atm': what = 'distributeur isolé'
            elif t.get('tourism') == 'information': what = None   # panneaux, pupitres : ni commerce ni logement
            else: continue
            if not what: continue
        if el.tag == 'node':
            la, lo = nodes[el.get('id')]
        else:
            pts = [nodes[n.get('ref')] for n in el.iter('nd') if n.get('ref') in nodes]
            if not pts: continue
            la, lo = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
        x, z = (lo - lon0) * kx, -(la - lat0) * kz
        name, level = t.get('name', ''), t.get('level', '')
        if abs(x) > half - 20 or abs(z) > half - 20:
            continue
        why = 'à l’étage (level=%s)' % level if level and re.fullmatch(r'-?\d+', level.split(';')[0]) and int(level.split(';')[0]) >= 1 else ''
        if k is None:
            skipped.append((round(x), round(z), what, name, what)); continue
        if why:
            skipped.append((round(x), round(z), what, name, why)); continue
        shops.append({'x': round(x, 1), 'z': round(z, 1), 'k': k})
        rows.append((round(x), round(z), what, name, KINDS[k]))
    shops.sort(key=lambda s: (s['z'], s['x']))
    data['shops'] = shops
    ed = (meta.get('buildings_source') or {}).get('edition') or ''
    mt = re.search(r'\d{4}-\d{2}-\d{2}', ed); meta['attribution'] = attribution(mt.group(0) if mt else '')
    json.dump(data, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
    byk = collections.Counter(r[4] for r in rows)
    lines = ['# Commerces : référencement d’après OpenStreetMap (T6)', '',
             'Généré par `tools/osm_shops.py` (extrait de l’API OpenStreetMap, ODbL). Le jeu met une vitrine du type indiqué',
             'là où OSM situe un commerce de plain-pied, sur la façade la plus proche de l’immeuble qui le contient ; les',
             'autres rez-de-chaussée sont des logements. Les noms et marques ne sont pas repris dans le jeu (enseignes',
             'génériques). Placement effectif et commerces sans immeuble : `review/mesures_T6.md`.', '',
             '- Commerces référencés : %d' % len(rows), '- Écartés : %d (hébergements, distributeurs isolés, commerces à l’étage)' % len(skipped), '',
             '## Types de vitrine', '', '| Vitrine du jeu | Nombre | Catégories OSM |', '|---|---|---|']
    cats = collections.defaultdict(collections.Counter)
    for r in rows: cats[r[4]][r[2]] += 1
    for kname in KINDS:
        if byk[kname]: lines.append('| %s | %d | %s |' % (kname, byk[kname], ', '.join('%s (%d)' % c for c in cats[kname].most_common())))
    lines += ['', '## Liste', '', '| x | z | catégorie OSM | nom (OSM) | vitrine |', '|---|---|---|---|---|']
    lines += ['| %d | %d | %s | %s | %s |' % r for r in sorted(rows, key=lambda r: (r[1], r[0]))]
    lines += ['', '## Écartés', ''] + ['- %s (%d, %d) : %s' % (r[3] or r[2], r[0], r[1], r[4]) for r in sorted(skipped, key=lambda r: (r[1], r[0]))]
    open(os.path.join(ROOT, 'review', 'commerces_osm.md'), 'w').write('\n'.join(lines) + '\n')
    print('commerces %d, écartés %d' % (len(rows), len(skipped)), dict(byk))


if __name__ == '__main__':
    main()
