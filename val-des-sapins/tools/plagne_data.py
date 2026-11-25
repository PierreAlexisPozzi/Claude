"""La Plagne sector for Val des Sapins: real relief, runs, lifts and buildings, converted to the game's frame.

Sources (all open data, attribution shown in the game):
  - OpenStreetMap (ODbL): runs (piste:type=downhill), lifts (aerialway=*), buildings.  OSM API map call, cached.
  - Mapterhorn terrain tiles (terrarium, z14 ~3.4 m): IGN RGE ALTI (Etalab 2.0), Copernicus DEM GLO-30.
  - TerraPrinter export (user-provided STL, 8 x 8 km, same open sources) for the distant relief around the sector.
  - Mapterhorn zoom 11 over 30 km for the horizon.
TerraPrinter view: https://terraprinter.com/#lat=45.50258&lon=6.68362&z=13.01 (selection 6.63235,45.53876 - 6.73489,45.46641)

Game frame: x = east (m), z = south (m), y = up; the sector is a WORLD x WORLD square centred on (LAT0, LON0).

Usage:
  python3 tools/plagne_data.py score  --osm plagne2.osm                    # rank candidate sector boxes
  python3 tools/plagne_data.py build  --osm plagne2.osm --stl terrain.stl --cache tiles/ --lat .. --lon ..
Outputs: plagne.json (runs, lifts, buildings, places, meta), plagne_height.bin (sector), plagne_far.bin (8 km, from the
STL), plagne_wide.bin (30 km horizon, Mapterhorn zoom 11).
"""
import argparse, io, json, math, os, struct, sys, urllib.request, xml.etree.ElementTree as ET, zlib

WORLD, N = 2800.0, 448                  # the game's playable square and grid cells (6.25 m)
HALF = WORLD / 2
LIFT_TYPES = {'chair_lift': 'chair', 'gondola': 'gondola', 'cable_car': 'gondola', 'mixed_lift': 'chair',
              'drag_lift': 'tbar', 't-bar': 'tbar', 'j-bar': 'tbar', 'platter': 'tbar', 'rope_tow': 'tbar'}
DIFF = {'novice': 'verte', 'easy': 'bleue', 'intermediate': 'rouge', 'advanced': 'noire', 'expert': 'noire', 'freeride': 'noire'}


def load_osm(path):
    root = ET.parse(path).getroot()
    nodes, ways = {}, []
    for n in root.iter('node'):
        nodes[n.get('id')] = (float(n.get('lat')), float(n.get('lon')), {t.get('k'): t.get('v') for t in n.iter('tag')})
    for w in root.iter('way'):
        ways.append(([nd.get('ref') for nd in w.iter('nd')], {t.get('k'): t.get('v') for t in w.iter('tag')}, w.get('id')))
    return nodes, ways


class Proj:
    def __init__(self, lat0, lon0):
        self.lat0, self.lon0 = lat0, lon0
        self.kx = 111320 * math.cos(math.radians(lat0)); self.kz = 110574

    def xz(self, lat, lon):
        return ((lon - self.lon0) * self.kx, -(lat - self.lat0) * self.kz)

    def ll(self, x, z):
        return (self.lat0 - z / self.kz, self.lon0 + x / self.kx)


def features(nodes, ways):
    runs, lifts, blds, peaks = [], [], [], []
    for refs, tags, wid in ways:
        pts = [nodes[r][:2] for r in refs if r in nodes]
        if len(pts) < 2:
            continue
        if tags.get('piste:type') == 'downhill' and tags.get('area') != 'yes':
            runs.append({'id': wid, 'name': tags.get('piste:name') or tags.get('name') or '', 'diff': tags.get('piste:difficulty', ''),
                         'll': pts, 'ends': (refs[0], refs[-1]), 'ref': tags.get('piste:ref') or tags.get('ref') or ''})
        elif tags.get('aerialway') in LIFT_TYPES:
            lifts.append({'id': wid, 'name': tags.get('name') or '', 'kind': LIFT_TYPES[tags['aerialway']], 'osm': tags['aerialway'], 'll': [pts[0], pts[-1]]})
        elif 'building' in tags and len(pts) >= 4:
            blds.append({'ll': pts, 'levels': tags.get('building:levels'), 'kind': tags.get('building'), 'name': tags.get('name') or ''})
    _peaks(nodes, peaks)
    return runs, lifts, blds, peaks


def piste_areas(path, nodes):
    """groomed surfaces drawn as areas: closed ways with area=yes, and the outer rings of multipolygon relations"""
    root = ET.parse(path).getroot()
    wayref = {w.get('id'): [nd.get('ref') for nd in w.iter('nd')] for w in root.iter('way')}
    out = []
    for w in root.iter('way'):
        t = {x.get('k'): x.get('v') for x in w.iter('tag')}
        if t.get('piste:type') == 'downhill' and t.get('area') == 'yes':
            out.append({'name': t.get('piste:name') or t.get('name') or '', 'diff': t.get('piste:difficulty', ''), 'll': [nodes[r][:2] for r in wayref[w.get('id')] if r in nodes]})
    for rl in root.iter('relation'):
        t = {x.get('k'): x.get('v') for x in rl.iter('tag')}
        if t.get('piste:type') != 'downhill' or t.get('type') != 'multipolygon':
            continue
        segs = [wayref[m.get('ref')] for m in rl.iter('member') if m.get('type') == 'way' and m.get('role') in ('outer', '') and m.get('ref') in wayref]
        while segs:                                             # chain the outer ways into rings
            ring = list(segs.pop(0))
            grown = True
            while grown and ring[0] != ring[-1]:
                grown = False
                for k, sg in enumerate(segs):
                    if sg[0] == ring[-1]: ring += sg[1:]
                    elif sg[-1] == ring[-1]: ring += sg[::-1][1:]
                    else: continue
                    segs.pop(k); grown = True; break
            out.append({'name': t.get('piste:name') or t.get('name') or '', 'diff': t.get('piste:difficulty', ''), 'll': [nodes[r][:2] for r in ring if r in nodes]})
    return [a for a in out if len(a['ll']) >= 4]


def _peaks(nodes, peaks):
    for nid, (lat, lon, tags) in nodes.items():
        if tags.get('natural') == 'peak' or tags.get('place') in ('village', 'hamlet', 'locality', 'neighbourhood'):
            peaks.append({'name': tags.get('name', ''), 'ele': tags.get('ele'), 'll': (lat, lon), 'kind': tags.get('natural') or tags.get('place')})


def inside(p, m=0.0):
    return abs(p[0]) <= HALF - m and abs(p[1]) <= HALF - m


def score(runs, lifts, P):
    full_lifts = sum(1 for L in lifts if all(inside(P.xz(*q), 80) for q in L['ll']))
    run_len = 0.0
    for r in runs:
        xy = [P.xz(*q) for q in r['ll']]
        for a, b in zip(xy, xy[1:]):
            if inside(a, 40) and inside(b, 40):
                run_len += math.hypot(b[0] - a[0], b[1] - a[1])
    return full_lifts, run_len


# ------------------------------------------------------------------------------------------------- relief
def tile_xy(lat, lon, z):
    n = 2 ** z
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n


def terrarium_grid(P, cache, z=14, n=N, world=WORLD):
    """(n+1)^2 heights (m) at the game's grid vertices, bilinear from Mapterhorn terrarium tiles"""
    from PIL import Image
    os.makedirs(cache, exist_ok=True)
    tiles = {}

    def tile(tx, ty):
        k = (tx, ty)
        if k not in tiles:
            fn = os.path.join(cache, '%d_%d_%d.webp' % (z, tx, ty))
            if not os.path.exists(fn):
                req = urllib.request.Request('https://tiles.mapterhorn.com/%d/%d/%d.webp' % (z, tx, ty), headers={'User-Agent': 'val-des-sapins-game/1.0'})
                open(fn, 'wb').write(urllib.request.urlopen(req, timeout=60).read())
            im = Image.open(fn).convert('RGB')
            tiles[k] = (im.load(), im.size[0])
        return tiles[k]

    def h_at(lat, lon):
        fx, fy = tile_xy(lat, lon, z)
        _, S = tile(int(fx), int(fy))
        px, py = (fx % 1) * S - 0.5, (fy % 1) * S - 0.5
        x0, y0 = math.floor(px), math.floor(py)
        acc = 0.0
        for dx, dy, w in ((0, 0, (1 - (px - x0)) * (1 - (py - y0))), (1, 0, (px - x0) * (1 - (py - y0))), (0, 1, (1 - (px - x0)) * (py - y0)), (1, 1, (px - x0) * (py - y0))):
            X, Y = x0 + dx, y0 + dy
            tx, ty = int(fx), int(fy)
            if X < 0: tx -= 1; X += S
            if X >= S: tx += 1; X -= S
            if Y < 0: ty -= 1; Y += S
            if Y >= S: ty += 1; Y -= S
            pix, _ = tile(tx, ty)
            r, g, b = pix[X, Y]
            acc += w * (r * 256 + g + b / 256 - 32768)
        return acc

    step = world / n
    out = []
    for j in range(n + 1):
        z_ = -world / 2 + j * step
        for i in range(n + 1):
            x_ = -world / 2 + i * step
            out.append(h_at(*P.ll(x_, z_)))
    return out


def stl_raster(path, sel, P, res=40.0, extent=8000.0):
    """top surface of the TerraPrinter terrain STL on a res-metre grid over its whole extent, in game coordinates"""
    lon0, lat0, lon1, lat1 = sel
    b = open(path, 'rb').read(); n = struct.unpack_from('<I', b, 80)[0]
    gn = int(extent / res) + 1
    grid = [None] * (gn * gn)
    ox, oz = P.xz((lat0 + lat1) / 2, (lon0 + lon1) / 2)          # STL centre in game coordinates
    wx, wz = (lon1 - lon0) * P.kx, (lat0 - lat1) * P.kz           # metres per 200 mm (both positive)
    def to_game(x, y):
        return ox + x / 200 * wx, oz - y / 200 * wz
    for i in range(n):
        v = struct.unpack_from('<12f', b, 84 + 50 * i)[3:]
        if min(v[2], v[5], v[8]) <= 5.01:                          # base and walls
            continue
        pts = [to_game(v[k * 3], v[k * 3 + 1]) + (v[k * 3 + 2],) for k in range(3)]
        xs, zs = [p[0] for p in pts], [p[1] for p in pts]
        i0, i1 = int((min(xs) + extent / 2) / res), int((max(xs) + extent / 2) / res) + 1
        j0, j1 = int((min(zs) + extent / 2) / res), int((max(zs) + extent / 2) / res) + 1
        (x1, z1, h1), (x2, z2, h2), (x3, z3, h3) = pts
        den = (z2 - z3) * (x1 - x3) + (x3 - x2) * (z1 - z3)
        if abs(den) < 1e-9:
            continue
        for jj in range(max(0, j0), min(gn, j1 + 1)):
            for ii in range(max(0, i0), min(gn, i1 + 1)):
                px, pz = -extent / 2 + ii * res, -extent / 2 + jj * res
                a = ((z2 - z3) * (px - x3) + (x3 - x2) * (pz - z3)) / den
                bb = ((z3 - z1) * (px - x3) + (x1 - x3) * (pz - z3)) / den
                c = 1 - a - bb
                if a >= -1e-6 and bb >= -1e-6 and c >= -1e-6:
                    h = a * h1 + bb * h2 + c * h3
                    k = jj * gn + ii
                    if grid[k] is None or h > grid[k]:
                        grid[k] = h
    return grid, gn


def simplify(pts, tol):
    if len(pts) < 3:
        return pts
    (x1, z1), (x2, z2) = pts[0], pts[-1]
    L = math.hypot(x2 - x1, z2 - z1) or 1e-9
    k, dm = 0, -1
    for i in range(1, len(pts) - 1):
        d = abs((x2 - x1) * (z1 - pts[i][1]) - (x1 - pts[i][0]) * (z2 - z1)) / L
        if d > dm:
            k, dm = i, d
    if dm <= tol:
        return [pts[0], pts[-1]]
    return simplify(pts[:k + 1], tol)[:-1] + simplify(pts[k:], tol)


def resample(pts, step):
    out, acc = [pts[0]], 0.0
    for a, b in zip(pts, pts[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        while acc + L >= step:
            t = (step - acc) / L if L else 0
            a = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); L = math.hypot(b[0] - a[0], b[1] - a[1]); acc = 0.0
            out.append(a)
        acc += L
    if math.hypot(out[-1][0] - pts[-1][0], out[-1][1] - pts[-1][1]) > step * 0.3:
        out.append(pts[-1])
    return out


def merge_runs(runs, nodes):
    """join ways of one named run that share end nodes into single polylines (node ids, then coordinates)"""
    groups = {}
    for r in runs:
        groups.setdefault((r['name'], r['diff']) if r['name'] else ('#' + r['id'], r['diff']), []).append(r)
    out = []
    for (name, diff), ws in groups.items():
        chains = [list(w['ll']) for w in ws]; ends = [list(w['ends']) for w in ws]
        merged = True
        while merged and len(chains) > 1:
            merged = False
            for i in range(len(chains)):
                for j in range(len(chains)):
                    if i == j:
                        continue
                    if ends[i][1] == ends[j][0]:
                        chains[i] += chains[j][1:]; ends[i][1] = ends[j][1]
                    elif ends[i][1] == ends[j][1]:
                        chains[i] += chains[j][::-1][1:]; ends[i][1] = ends[j][0]
                    else:
                        continue
                    del chains[j]; del ends[j]; merged = True
                    break
                if merged:
                    break
        for c in chains:
            out.append({'name': name if not name.startswith('#') else '', 'diff': diff, 'll': c})
    return out


def build(a, runs, lifts, blds, peaks):
    P = Proj(a.lat, a.lon)
    H = terrarium_grid(P, a.cache)
    hmin = math.floor(min(H) - 5)
    def hgt(x, z):
        fx, fz = (x + HALF) / WORLD * N, (z + HALF) / WORLD * N
        i, j = max(0, min(N - 1, int(fx))), max(0, min(N - 1, int(fz)))
        tx, tz = fx - i, fz - j
        g = lambda ii, jj: H[jj * (N + 1) + ii]
        return (g(i, j) * (1 - tx) + g(i + 1, j) * tx) * (1 - tz) + (g(i, j + 1) * (1 - tx) + g(i + 1, j + 1) * tx) * tz
    # runs: merged, clipped to the box, oriented downhill, simplified
    R = []
    for r in merge_runs(runs, None):
        xy = [P.xz(*q) for q in r['ll']]
        seg, segs = [], []
        for p in xy:
            if inside(p, 30):
                seg.append(p)
            else:
                if len(seg) > 1: segs.append(seg)
                seg = []
        if len(seg) > 1: segs.append(seg)
        for sg in segs:
            if hgt(*sg[0]) < hgt(*sg[-1]):
                sg = sg[::-1]
            L = sum(math.hypot(b[0] - a_[0], b[1] - a_[1]) for a_, b in zip(sg, sg[1:]))
            if L < 60:
                continue
            pts = simplify(resample(sg, 4.0), 3.0)
            R.append({'name': r['name'], 'lvl': DIFF.get(r['diff'], 'bleue'), 'len': round(L), 'drop': round(hgt(*sg[0]) - hgt(*sg[-1])),
                      'pts': [[round(x, 1), round(z, 1)] for x, z in pts]})
    # lifts with both stations inside, bottom first
    Lf = []
    for L in lifts:
        b, t = P.xz(*L['ll'][0]), P.xz(*L['ll'][1])
        if not (inside(b, 80) and inside(t, 80)):
            continue
        if hgt(*b) > hgt(*t):
            b, t = t, b
        Lf.append({'name': L['name'], 'type': L['kind'], 'osm': L['osm'], 'b': [round(b[0], 1), round(b[1], 1)], 't': [round(t[0], 1), round(t[1], 1)],
                   'rise': round(hgt(*t) - hgt(*b)), 'len': round(math.hypot(t[0] - b[0], t[1] - b[1]))})
    # buildings: oriented rectangles (min-area over the polygon's edge directions)
    B = []
    for bd in blds:
        xy = [P.xz(*q) for q in bd['ll']]
        cx, cz = sum(p[0] for p in xy) / len(xy), sum(p[1] for p in xy) / len(xy)
        if not inside((cx, cz), 40):
            continue
        best = None
        for p, q in zip(xy, xy[1:]):
            ang = math.atan2(q[1] - p[1], q[0] - p[0]); ca, sa = math.cos(ang), math.sin(ang)
            us = [(v[0] - cx) * ca + (v[1] - cz) * sa for v in xy]; vs = [-(v[0] - cx) * sa + (v[1] - cz) * ca for v in xy]
            area = (max(us) - min(us)) * (max(vs) - min(vs))
            if best is None or area < best[0]:
                uc, vc = (max(us) + min(us)) / 2, (max(vs) + min(vs)) / 2
                best = (area, ang, max(us) - min(us), max(vs) - min(vs), cx + uc * ca - vc * sa, cz + uc * sa + vc * ca)
        area, ang, w, d, bx, bz = best
        if w * d < 40:
            continue
        lv = bd['levels']
        try:
            lv = int(float(lv)) if lv else None
        except ValueError:
            lv = None
        B.append({'x': round(bx, 1), 'z': round(bz, 1), 'w': round(w, 1), 'd': round(d, 1), 'rot': round(-ang, 3), 'levels': lv, 'kind': bd['kind'], 'name': bd['name']})
    places = []
    for pk in peaks:
        x, z = P.xz(*pk['ll'])
        if inside((x, z), 0) and pk['name']:
            places.append({'name': pk['name'], 'kind': pk['kind'], 'x': round(x), 'z': round(z), 'ele': pk['ele']})
    meta = {'lat0': a.lat, 'lon0': a.lon, 'world': WORLD, 'n': N, 'alt0': hmin, 'hmax': round(max(H)),
            'attribution': 'Secteur Plagne Centre – Aime 2000, adaptation libre et non officielle, sans lien avec la station. '
                           'Relief : IGN RGE ALTI (Licence Ouverte Etalab 2.0) et Copernicus DEM GLO-30, via Mapterhorn et TerraPrinter. '
                           'Pistes, remontées et bâtiments : © les contributeurs d\u2019OpenStreetMap (ODbL). Snowpark et half-pipe ajoutés pour le jeu.'}
    if os.environ.get('PL_RAW'):
        json.dump(R, open(os.environ['PL_RAW'], 'w'), ensure_ascii=False)
    data = curate({'meta': meta, 'runs': R, 'lifts': Lf, 'buildings': B, 'places': places}, hgt)
    # groomed areas (wide slopes, snow fronts): polygons clamped to the box, named after their run
    A = []
    for ar in getattr(a, 'areas', []):
        xy = [P.xz(*q) for q in ar['ll']]
        cx, cz = sum(p[0] for p in xy) / len(xy), sum(p[1] for p in xy) / len(xy)
        if not inside((cx, cz), 0):
            continue
        ring = [(max(-HALF, min(HALF, x)), max(-HALF, min(HALF, z))) for x, z in xy]
        if ring[0] == ring[-1]: ring = ring[:-1]
        far_k = max(range(len(ring)), key=lambda k: math.hypot(ring[k][0] - ring[0][0], ring[k][1] - ring[0][1]))   # a ring is simplified as two halves
        poly = simplify(ring[:far_k + 1], 2.0)[:-1] + simplify(ring[far_k:] + [ring[0]], 2.0)[:-1]
        if len(poly) >= 3:
            A.append({'name': ar['name'], 'lvl': DIFF.get(ar['diff'], 'bleue'), 'poly': [[round(x, 1), round(z, 1)] for x, z in poly]})
    data['areas'] = A
    print('piste areas: %d' % len(A))
    meta['enc'] = 'd2'                                           # grids: second-order deltas, see pack_grid
    os.makedirs(a.out, exist_ok=True)
    json.dump(data, open(os.path.join(a.out, 'plagne.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    vals = [max(0, min(65535, int(round((h - hmin) * 10)))) for h in H]       # decimetres above alt0
    open(os.path.join(a.out, 'plagne_height.bin'), 'wb').write(pack_grid(vals, N + 1))
    print('runs %d (%.1f km), lifts %d, buildings %d, places %d, relief %d..%d m' % (len(data['runs']), sum(r['len'] for r in data['runs']) / 1000, len(data['lifts']), len(B), len(places), hmin, max(H)))
    return P, H, data


ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX']
LIFT_LABEL = {'chair': ('Télésiège', 'TSD'), 'gondola': ('Télécabine', 'TC'), 'tbar': ('Téléski', 'TK')}


def curate(data, hgt):
    """make the raw OSM extract playable: real lifts only, one polyline per named run, no dead ends at the box edge,
    unique names (lift names are prefixed with their type, runs and lifts never share a name)"""
    d2 = lambda a, b: math.hypot(a[0] - b[0], a[1] - b[1])
    plen = lambda pts: sum(d2(a, b) for a, b in zip(pts, pts[1:]))
    edge = lambda p: max(abs(p[0]), abs(p[1])) > HALF - 140
    def dline(p, pts, skip_edge=False):
        """distance from p to a polyline (the runs are simplified: their vertices can be far apart on straight parts)"""
        best = 1e9
        for a, b in zip(pts, pts[1:]):
            dx, dz = b[0] - a[0], b[1] - a[1]; l2 = dx * dx + dz * dz or 1
            t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)); q = (a[0] + dx * t, a[1] + dz * t)
            if skip_edge and edge(q):
                continue
            best = min(best, d2(p, q))
        return best
    lifts = []
    for L in data['lifts']:
        if L['len'] < 120 or L['rise'] < 20:
            continue                                            # beginners' carpets and toy tows
        lab, code = LIFT_LABEL[L['type']]
        lifts.append(dict(L, name='%s %s' % (lab, L['name']) if not L['name'].startswith(lab) else L['name'], code=code))
    runs = [dict(r, pts=[tuple(p) for p in r['pts']]) for r in data['runs']]
    joined = True                                               # fragments of one run that meet end to start
    while joined:
        joined = False
        for a in runs:
            for b in runs:
                if a is not b and a['name'] and a['name'] == b['name'] and a['lvl'] == b['lvl'] and d2(a['pts'][-1], b['pts'][0]) < 40:
                    a['pts'] = a['pts'] + b['pts']; runs.remove(b); joined = True; break
            if joined:
                break
    def anchored(r, p, end):
        """a run end that meets a lift station, or another run away from that run's own matching end"""
        for L in lifts:
            if d2(p, L['b'] if end else L['t']) < 110:
                return True
        for o in runs:
            if o is r:
                continue
            if dline(p, o['pts'], True) < 30:                  # two runs meeting at the box edge reach nowhere
                return True
        return False
    out = []
    for r in runs:                                              # every surveyed run is kept whole, up to the box edge
        pts = r['pts']
        L = plen(pts)
        if L < 60:
            continue
        out.append(dict(r, pts=pts, len=round(L), drop=round(hgt(*pts[0]) - hgt(*pts[-1]))))
    # accessibility: from any lift top, down the runs. A run is reached from its first point that meets a lift top
    # (150 m: stations sit back from the run heads) or a reached run; the part above it is cut (hike-only)
    # spatial hash of the reached runs' points (every 10 m): "near a reached run" becomes a few dictionary lookups
    dense = [resample([tuple(p) for p in r['pts']], 10.0) for r in out]
    cellsz, grid = 30.0, {}
    key = lambda p: (int(math.floor(p[0] / cellsz)), int(math.floor(p[1] / cellsz)))
    def near_reached(q, i):
        cx, cz = key(q)
        for gx in (cx - 1, cx, cx + 1):
            for gz in (cz - 1, cz, cz + 1):
                for j, p in grid.get((gx, gz), ()):
                    if j != i and d2(p, q) < 30:
                        return True
        return False
    def add(i, k0):
        for p in dense[i][max(0, int(k0)):]:
            grid.setdefault(key(p), []).append((i, p))
    K, grew = {}, True
    tops = [L['t'] for L in lifts]
    while grew:
        grew = False
        for i, r in enumerate(out):
            if i in K:
                continue
            for k, q in enumerate(dense[i][:-1]):
                if any(d2(q, t) < 150 for t in tops) or near_reached(q, i):
                    K[i] = k; add(i, k); grew = True; break
    reach = set(K)                                              # runs reached from a lift (the others: from outside the sector)
    lost = [r['name'] or '?' for i, r in enumerate(out) if i not in reach]
    if os.environ.get('PL_DEBUG'):
        for i, r in enumerate(out):
            if i not in reach:
                s0 = r['pts'][0]
                print('  lost %s start %s: top %.0f m, run %.0f m (%s)' % (r['name'], s0, min(d2(s0, L['t']) for L in lifts),
                      *min(((dline(s0, out[j]['pts']), out[j]['name']) for j in reach), default=(0, ''))))
    print('runs not reached from a lift of the sector (kept, flagged):', lost)
    for i, r in enumerate(out):
        if i not in reach: r['outside'] = 1
    for r in out:
        g = r['drop'] / max(1, r['len'])
        if g < 0.06:
            r['flat'] = round(g, 3)                             # cat-track: follow the real grade, do not dig a ramp
    out.sort(key=lambda r: -r['len'])
    places = [p for p in data['places'] if p['kind'] != 'peak']
    seen = {L['name'] for L in lifts}
    for r in sorted(out, key=lambda r: -r['len']):
        if not r['name']:
            m = r['pts'][len(r['pts']) // 2]
            near = min(places, key=lambda p: d2(m, (p['x'], p['z'])))['name'] if places else 'du secteur'
            r['name'] = 'Liaison ' + near
        base, k = r['name'], 1
        while r['name'] in seen:
            k += 1; r['name'] = '%s %s' % (base, ROMAN[k] if k < len(ROMAN) else k)
        seen.add(r['name'])
    out.sort(key=lambda r: -r['len'])
    for r in out:
        r['pts'] = [[round(x, 1), round(z, 1)] for x, z in r['pts']]
    data['runs'], data['lifts'] = out, lifts
    print('curated: runs %d (%.1f km), lifts %d; ascending runs %d' % (len(out), sum(r['len'] for r in out) / 1000, len(lifts), sum(1 for r in out if r['drop'] <= 0)))
    return data


def pack_grid(vals, n):
    """uint16 grid -> second-order delta (along x, then z) as int16, zlib; the game undoes it with two prefix sums"""
    rows = [vals[j * n:(j + 1) * n] for j in range(n)]
    dx = [[r[i] - (r[i - 1] if i else 0) for i in range(n)] for r in rows]
    arr = bytearray()
    for j in range(n):
        for i in range(n):
            arr += struct.pack('<h', dx[j][i] - (dx[j - 1][i] if j else 0))
    return zlib.compress(bytes(arr), 9)


def unpack_grid(blob, n):
    v = struct.unpack('<%dh' % (n * n), zlib.decompress(blob))
    out, prev = [], [0] * n
    for j in range(n):
        row = [prev[i] + v[j * n + i] for i in range(n)]; prev = row
        acc = 0
        for i in range(n):
            acc += row[i]; out.append(acc)
    return out


def preview(P, H, data, path):
    from PIL import Image, ImageDraw
    S = 900
    img = Image.new('RGB', (S, S)); px = img.load()
    hmin, hmax = min(H), max(H)
    for j in range(S):
        for i in range(S):
            gi, gj = int(i / S * N), int(j / S * N)
            h = H[gj * (N + 1) + gi]; hx = H[gj * (N + 1) + min(N, gi + 1)]; hz = H[min(N, gj + 1) * (N + 1) + gi]
            sh = max(0, min(1, 0.55 + ((h - hx) - (h - hz)) * 0.06))            # hillshade, light from the north-west
            t = (h - hmin) / (hmax - hmin)
            c = int(70 + 150 * sh); px[i, j] = (int(c * (0.85 + 0.15 * t)), int(c * (0.9 + 0.1 * t)), c)
    d = ImageDraw.Draw(img)
    T = lambda x, z: ((x + HALF) / WORLD * S, (z + HALF) / WORLD * S)
    col = {'verte': '#2f9e44', 'bleue': '#1c64d4', 'rouge': '#d62828', 'noire': '#111111'}
    for r in data['runs']:
        d.line([T(*p) for p in r['pts']], fill=col[r['lvl']], width=3)
    for L in data['lifts']:
        d.line([T(*L['b']), T(*L['t'])], fill='#ffb000', width=2); d.ellipse([T(*L['b'])[0] - 3, T(*L['b'])[1] - 3, T(*L['b'])[0] + 3, T(*L['b'])[1] + 3], fill='#ffb000')
    for b in data['buildings']:
        x, y = T(b['x'], b['z']); d.rectangle([x - 1, y - 1, x + 1, y + 1], fill='#6b4428')
    for p in data['places']:
        x, y = T(p['x'], p['z']); d.text((x + 4, y - 6), p['name'], fill='#ffffff')
    d.text((8, 8), 'N', fill='#ffffff')
    img.save(path)


def far(a, P, H, data, res=40.0, extent=8000.0):
    """the distant relief: the TerraPrinter terrain over its 8 km, calibrated against the fine relief (least squares)"""
    sel = (6.63235, 45.53876, 6.73489, 45.46641)
    G, gn = stl_raster(a.stl, sel, P, res, extent)
    xs, ys = [], []
    for j in range(gn):
        for i in range(gn):
            x, z = -extent / 2 + i * res, -extent / 2 + j * res
            v = G[j * gn + i]
            if v is None or abs(x) > HALF - 50 or abs(z) > HALF - 50:
                continue
            fi, fj = int((x + HALF) / WORLD * N), int((z + HALF) / WORLD * N)
            xs.append(v); ys.append(H[fj * (N + 1) + fi])
    n = len(xs); mx, my = sum(xs) / n, sum(ys) / n
    k = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs); c = my - k * mx
    err = sorted(abs(k * x + c - y) for x, y in zip(xs, ys))
    print('far relief: %d x %d at %.0f m, calibration h = %.2f * z + %.1f, median error %.1f m' % (gn, gn, res, k, c, err[n // 2]))
    hmin = data['meta']['alt0']
    filled = [v for v in G if v is not None]; low = min(filled)
    vals = [max(0, min(65535, int(round((k * (v if v is not None else low) + c - hmin + 1000) * 4)))) for v in G]   # quarter metres, down to 1000 m below alt0
    open(os.path.join(a.out, 'plagne_far.bin'), 'wb').write(pack_grid(vals, gn))
    data['meta']['far'] = {'n': gn, 'res': res, 'extent': extent, 'offset': -1000, 'scale': 0.25}
    json.dump(data, open(os.path.join(a.out, 'plagne.json'), 'w'), ensure_ascii=False, separators=(',', ':'))


def wide(a, P, data, n=200, extent=30000.0):
    """the horizon: the same Mapterhorn relief at zoom 11 over 30 km (Isère valley, Beaufortain, Vanoise)"""
    G = terrarium_grid(P, a.cache, z=11, n=n, world=extent)
    hmin = data['meta']['alt0']
    vals = [max(0, min(65535, int(round((h - hmin + 1500) * 2)))) for h in G]    # half metres, down to 1500 m below alt0
    open(os.path.join(a.out, 'plagne_wide.bin'), 'wb').write(pack_grid(vals, n + 1))
    data['meta']['wide'] = {'n': n + 1, 'res': extent / n, 'extent': extent, 'offset': -1500, 'scale': 0.5}
    json.dump(data, open(os.path.join(a.out, 'plagne.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print('wide relief: %d x %d at %.0f m, %d..%d m' % (n + 1, n + 1, extent / n, min(G), max(G)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd'); ap.add_argument('--osm'); ap.add_argument('--stl'); ap.add_argument('--cache', default='tiles')
    ap.add_argument('--lat', type=float); ap.add_argument('--lon', type=float); ap.add_argument('--out', default='.')
    a = ap.parse_args()
    nodes, ways = load_osm(a.osm)
    runs, lifts, blds, peaks = features(nodes, ways)
    a.areas = piste_areas(a.osm, nodes)
    print('osm: runs %d, lifts %d, buildings %d, named places %d' % (len(runs), len(lifts), len(blds), len(peaks)))
    if a.cmd == 'score':
        best = []
        for dy in range(-700, 701, 100):
            for dx in range(-700, 701, 100):
                P0 = Proj(45.5065, 6.6800)
                lat, lon = P0.ll(dx, dy)
                P = Proj(lat, lon)
                fl, rl = score(runs, lifts, P)
                best.append((fl * 400 + rl, fl, rl, lat, lon, dx, dy))
        best.sort(reverse=True)
        for s in best[:8]:
            print('score %.0f  lifts %d  runs %.1f km  centre %.5f, %.5f  (offset %d, %d m)' % (s[0], s[1], s[2] / 1000, s[3], s[4], s[5], s[6]))
        return
    if a.cmd == 'build':
        P, H, data = build(a, runs, lifts, blds, peaks)
        preview(P, H, data, os.path.join(a.out, 'plagne_preview.png'))
        if a.stl:
            far(a, P, H, data)
        wide(a, P, data)


if __name__ == '__main__':
    main()
