"""Skiers for Val des Sapins: MakeHuman bodies (CC0 data) dressed in modelled ski clothing.

T7 (style repris) : réalisme stylisé plutôt que photo. Visages adoucis par des morphes MakeHuman (STYLE), peau peinte
(paint_skin), cheveux sculptés, masque en bandeau fermé, tour de cou ; vêtements sans jour : chaque ouverture (col,
poignets, ourlet, bas de pantalon, bords du bonnet, du casque et des cheveux) est refermée par une doublure qui revient
sur la surface d'en dessous ; le cou porte la peau sous le col.

Run:  MH_DATA=/path/to/mpfb/data  .bpyenv/bin/python blender/humans.py   ->  assets/skiers_real.glb, assets/skin_*.jpg

Only MakeHuman *data* is read, by this script's own parsers (no MakeHuman / MPFB code is run):
  3dobjs/base.obj                                  base mesh, CC0 (header: released as CC0 in September 2020)
  targets/macrodetails/*.target.gz                 gender / age / ethnicity / muscle / weight morphs (MakeHuman CC0 release)
  rigs/standard/weights.game_engine.json           skin weights, "license": "CC0"
  targets/{head,eyes,nose,chin,cheek,mouth,ears}/  face shape morphs (STYLE, T7), same CC0 release
  targets/expression/units/caucasian/*.target.gz   expression units (blink, smile, open mouth, brows, squint)
Source used in T7: github.com/makehumancommunity/mpfb2, src/mpfb/data (files fetched one by one, kept out of git).
The skeleton is this script's own (bones between the base mesh's joint markers), named like the weight file so the
weights apply; finger, thumb and toe weights are folded into the hand and the foot.

Each character is one skinned mesh: a loose quilted freeride jacket (two colours, snug high collar, hood, long hem over
the upper thighs, wide sleeves gathered at the wrist), wide trousers stacking on the boot, gloves; the head and neck are a separate skinned mesh (face) with five
expression morphs. Everything under the clothes is removed, except the neck under the collar.
Vertex colours carry the colours and baked AO; a '_tint' attribute (1 on the jacket's main panels) lets the game
recolour jackets per skier. Helmet, goggles, neck gaiter, beanie, pompom, sculpted hair and eyes are separate skinned
parts on the same rig; boots, skis and poles stay the game's rigid pieces.

Game frame: x right, y up, +z forward (MakeHuman faces +z already), metres, feet on y = 0.
"""
import gzip, json, math, os, random
import bpy, bmesh
from mathutils import Vector, Matrix
from vds_common import reset, hexrgb, bake_ao_to_vertex_colors, export_glb, tri_count, srgb2lin

DATA = os.environ.get('MH_DATA', '')
JK_MARGIN = float(os.environ.get('HM_JK_MARGIN', '0.015'))   # veste au-dessus du pantalon (m) ; négatif : témoin du contrôle
ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')
_FLOOR = {}


def floor_off(mv, faces, fgroup):
    k = id(mv)
    if k not in _FLOOR:
        _FLOOR[k] = min(mv[i][1] for f, g in zip(faces, fgroup) if g == 'body' for i in f) * 0.1
    return _FLOOR[k]
S = 0.1                                   # MakeHuman decimetres -> metres


def G(x, y, z):
    return Vector((x, -z, y))


# ----------------------------------------------------------------------------------------------------- data
UVS, FUV = [], []          # base mesh texture coordinates (OBJ convention, v up) and per-face uv indices


def load_base():
    verts, faces, fgroup, cur = [], [], [], None
    for line in open(os.path.join(DATA, '3dobjs', 'base.obj')):
        if line.startswith('v '):
            verts.append([float(t) for t in line.split()[1:4]])
        elif line.startswith('vt '):
            UVS.append([float(t) for t in line.split()[1:3]])
        elif line.startswith('g '):
            cur = line.split()[1]
        elif line.startswith('f '):
            parts = line.split()[1:]
            faces.append([int(p.split('/')[0]) - 1 for p in parts])
            FUV.append([int(p.split('/')[1]) - 1 if '/' in p and p.split('/')[1] else -1 for p in parts])
            fgroup.append(cur)
    return verts, faces, fgroup


def load_target(name):
    off = {}
    sub = name if '/' in name else os.path.join('macrodetails', name)   # « dossier/nom » : morphes du visage (T7)
    with gzip.open(os.path.join(DATA, 'targets', sub + '.target.gz'), 'rt') as f:
        for line in f:
            if not line.strip() or line[0] == '#':
                continue
            i, x, y, z = line.split()
            off[int(i)] = (float(x), float(y), float(z))
    return off


def morph(verts, spec):
    """spec: [(target name, weight)]; offsets are added to the base mesh (MakeHuman's linear blend)."""
    out = [list(v) for v in verts]
    for name, w in spec:
        if w <= 0:
            continue
        for i, (x, y, z) in load_target(name).items():
            out[i][0] += x * w; out[i][1] += y * w; out[i][2] += z * w
    return out


# T7 : réalisme stylisé. Des visages avenants plutôt qu'une photo : morphes MakeHuman du visage (CC0), dosés avec
# modération : un peu plus jeunes, yeux un peu plus grands, poches sous les yeux effacées, nez plus fin, joues plus
# pleines, menton adouci, coins de la bouche relevés (léger sourire au repos), oreilles un peu plus petites. Les
# proportions du corps (et donc le squelette du jeu) ne changent pas. HM_STYLE=0 : visages d'avant.
STYLE = {
    'male': [('head/head-age-decr', 0.45), ('eyes/l-eye-scale-incr', 0.5), ('eyes/r-eye-scale-incr', 0.5), ('eyes/l-eye-bag-decr', 0.6),
             ('eyes/r-eye-bag-decr', 0.6), ('nose/nose-scale-horiz-decr', 0.2), ('nose/nose-volume-decr', 0.25), ('chin/chin-prominent-decr', 0.15),
             ('cheek/l-cheek-volume-incr', 0.25), ('cheek/r-cheek-volume-incr', 0.25), ('mouth/mouth-angles-up', 0.35),
             ('ears/l-ear-scale-decr', 0.2), ('ears/r-ear-scale-decr', 0.2)],
    'female': [('head/head-age-decr', 0.4), ('eyes/l-eye-scale-incr', 0.45), ('eyes/r-eye-scale-incr', 0.45), ('eyes/l-eye-bag-decr', 0.7),
               ('eyes/r-eye-bag-decr', 0.7), ('nose/nose-scale-horiz-decr', 0.3), ('nose/nose-volume-decr', 0.35), ('nose/nose-point-width-decr', 0.2),
               ('chin/chin-width-decr', 0.25), ('cheek/l-cheek-volume-incr', 0.3), ('cheek/r-cheek-volume-incr', 0.3), ('mouth/mouth-angles-up', 0.35),
               ('mouth/mouth-upperlip-volume-incr', 0.2), ('mouth/mouth-lowerlip-volume-incr', 0.2), ('ears/l-ear-scale-decr', 0.2), ('ears/r-ear-scale-decr', 0.2)],
}


def lid_margin(mv, faces, fgroup):
    """bord des paupières, par œil : sommets du corps posés sur le globe de référence (helper-*-eye) du maillage, à
    l'avant ; le maillage MakeHuman n'a pas de trou à cet endroit, les paupières se referment sur l'orbite"""
    body, out = {i for f, g in zip(faces, fgroup) if g == 'body' for i in f}, {}
    for s_ in ('l', 'r'):
        ids = {i for f, g in zip(faces, fgroup) if g == 'helper-%s-eye' % s_ for i in f}
        c = sum((Vector(mv[i]) for i in ids), Vector()) / len(ids) * S
        r = sum((Vector(mv[i]) * S - c).length for i in ids) / len(ids)
        out[s_] = [i for i in body if (Vector(mv[i]) * S - c).length < r and (Vector(mv[i]) * S - c).z > 0.2 * r]
    return out


def lid_radius(mv, margin):
    """rayon moyen de l'ouverture des paupières (dans le plan du visage), en mètres"""
    r = []
    for ids in margin.values():
        c = sum((Vector(mv[i]) for i in ids), Vector()) / len(ids) * S
        r += [math.hypot(*(Vector(mv[i]) * S - c).xy) for i in ids]
    return sum(r) / max(1, len(r))


def character(gender, muscle, weight, eth):
    """gender 'male'/'female'; muscle, weight in 0..1 (0.5 = average); eth = (african, asian, caucasian) summing to 1."""
    spec = []
    for mk, mw in (('minmuscle', max(0, 0.5 - muscle) * 2), ('averagemuscle', 1 - abs(muscle - 0.5) * 2), ('maxmuscle', max(0, muscle - 0.5) * 2)):
        for wk, ww in (('minweight', max(0, 0.5 - weight) * 2), ('averageweight', 1 - abs(weight - 0.5) * 2), ('maxweight', max(0, weight - 0.5) * 2)):
            spec.append(('universal-%s-young-%s-%s' % (gender, mk, wk), mw * ww))
    for race, w in zip(('african', 'asian', 'caucasian'), eth):
        spec.append(('%s-%s-young' % (race, gender), w))
    return spec


def stylise(gender):
    k = float(os.environ.get('HM_STYLE', '1'))
    return [(n, w * k) for n, w in STYLE[gender]]


# ----------------------------------------------------------------------------------------------------- skeleton
# bone: (head marker, tail marker, parent); markers are the base mesh's joint cubes (centre of their vertices)
BONES = [
    ('pelvis', 'joint-pelvis', 'SPINE_A', None),
    ('spine_01', 'SPINE_A', 'SPINE_B', 'pelvis'),
    ('spine_02', 'SPINE_B', 'SPINE_C', 'spine_01'),
    ('spine_03', 'SPINE_C', 'joint-neck', 'spine_02'),
    ('neck_01', 'joint-neck', 'joint-head', 'spine_03'),
    ('head', 'joint-head', 'joint-head-2', 'neck_01'),
]
for s_, S_ in (('l', 'l'), ('r', 'r')):
    BONES += [
        ('clavicle_' + s_, 'joint-%s-clavicle' % S_, 'joint-%s-shoulder' % S_, 'spine_03'),
        ('upperarm_' + s_, 'joint-%s-shoulder' % S_, 'joint-%s-elbow' % S_, 'clavicle_' + s_),
        ('lowerarm_' + s_, 'joint-%s-elbow' % S_, 'joint-%s-hand' % S_, 'upperarm_' + s_),
        ('hand_' + s_, 'joint-%s-hand' % S_, 'joint-%s-hand-3' % S_, 'lowerarm_' + s_),
        ('thigh_' + s_, 'joint-%s-upper-leg' % S_, 'joint-%s-knee' % S_, 'pelvis'),
        ('calf_' + s_, 'joint-%s-knee' % S_, 'joint-%s-ankle' % S_, 'thigh_' + s_),
        ('foot_' + s_, 'joint-%s-ankle' % S_, 'joint-%s-foot-2' % S_, 'calf_' + s_),
    ]
FOLD = {'ball': 'foot', 'index': 'hand', 'middle': 'hand', 'ring': 'hand', 'pinky': 'hand', 'thumb': 'hand'}


def markers(verts, faces, fgroup):
    acc = {}
    for f, g in zip(faces, fgroup):
        if g and g.startswith('joint-'):
            for i in f:
                acc.setdefault(g, set()).add(i)
    pos = {g: Vector([sum(verts[i][k] for i in ids) / len(ids) for k in range(3)]) * S for g, ids in acc.items()}
    sp = sorted([pos[k] for k in pos if k.startswith('joint-spine-')], key=lambda v: v.y)   # four spine markers, low to high
    pos['SPINE_A'], pos['SPINE_B'], pos['SPINE_C'] = sp[1], sp[2], sp[3]
    return pos


def load_weights():
    w = json.load(open(os.path.join(DATA, 'rigs', 'standard', 'weights.game_engine.json')))
    assert w.get('license') == 'CC0'
    per = {}
    for bone, lst in w['weights'].items():
        if bone == 'Root':
            continue
        b = bone
        for k, to in FOLD.items():
            if bone.startswith(k + '_'):
                b = to + bone[-2:]
        for i, x in lst:
            d = per.setdefault(i, {})
            d[b] = d.get(b, 0) + x
    return per


# ----------------------------------------------------------------------------------------------------- dressing
SKIN_TONES = {'light': '#e2b79c', 'mid': '#c48d6a', 'dark': '#8a5a3f'}


def region(dom, wts, y, hip_y, chin_y, wrist):
    """Which garment covers a body vertex, from its dominant bone and its height (horizontal hem at the hips)."""
    if dom in ('head',) or (dom == 'neck_01' and y > chin_y - 0.035):
        return 'skin'
    if dom == 'neck_01':
        return 'neck'          # T7 : peau du cou continue sous le col (le col se referme dessus, aucun jour)
    if dom.startswith('hand'):
        return 'glove'
    if dom.startswith('foot'):
        return 'boot'
    hem = hip_y - 0.06
    if dom.startswith(('thigh', 'calf', 'pelvis')):
        return 'both' if y > hem else 'pants'
    return 'jacket'


def goggle_band(V, hface, head_c, eye_y, lens):
    """T7 : masque de ski en bandeau fermé, tracé autour de la tête au lieu d'être découpé dans ses faces :
    - devant, l'écran : un arc à distance constante du point le plus saillant du visage (arête du nez comprise),
      bombé verticalement, au contour arrondi ; monture en mousse qui revient vers le visage (aucun jour) ;
    - sur les côtés et à l'arrière, la sangle, plaquée sur la coque du casque.
    Chaque rayon part du centre de la tête et touche le visage (BVH) ; couleurs par sommet (contour d'écran lisse)."""
    from mathutils.bvhtree import BVHTree
    verts = [tuple(v) for v in V]
    bvh = BVHTree.FromPolygons(verts, [list(f) for f in hface])
    y0, NT = eye_y + 0.004, 108

    def surf(th, dy):
        o = Vector((head_c.x, y0 + dy, head_c.z)); d = Vector((math.sin(th), 0, math.cos(th)))
        hit = bvh.ray_cast(o, d, 0.3)
        return (hit[0] - o).length if hit[0] else 0.095
    sm = lambda a, b, x: max(0.0, min(1.0, (x - a) / (b - a))) ** 2 * (3 - 2 * max(0.0, min(1.0, (x - a) / (b - a))))
    P = {'v': [], 't': [], 'p': [], 'fc': [], 'vc': [], 'smooth': 0}
    rings = []
    for k in range(NT):
        th = 2 * math.pi * k / NT; a = abs(math.atan2(math.sin(th), math.cos(th)))
        front = 1 - sm(math.radians(72), math.radians(98), a)              # 1 : écran et monture ; 0 : sangle
        hh = 0.011 + 0.021 * front                                          # demi-hauteur (le haut se pose sur le bord du casque)
        rface = max(surf(th, dy) for dy in (-0.03, -0.018, -0.006, 0.006, 0.018, 0.028))
        rhel = surf(th, 0.0) + 0.028
        r = max(rface + 0.013, rhel) * front + rhel * (1 - front)
        thick = 0.012 * front + 0.004 * (1 - front)
        ring = []
        hs = [-1, -0.88, -0.72, -0.5, -0.25, 0, 0.25, 0.5, 0.72, 0.88, 1]
        for u in hs:                                                        # extérieur, de bas en haut
            inlens = front > 0.99 and a < math.radians(66) and abs(u) < 0.74 * (1 - 0.4 * (a / math.radians(66)) ** 4)   # écran aux coins arrondis
            bulge = (0.007 * math.cos(u * math.pi / 2) if inlens else 0.002) * front   # écran bombé, monture en retrait
            p = Vector((head_c.x + math.sin(th) * (r + bulge), y0 + u * hh, head_c.z + math.cos(th) * (r + bulge)))
            ring.append((p, lens if inlens else hexrgb('#1a1d22')))
        for u in reversed(hs[::2]):                                         # intérieur (mousse), de haut en bas
            p = Vector((head_c.x + math.sin(th) * (r - thick), y0 + u * hh, head_c.z + math.cos(th) * (r - thick)))
            ring.append((p, hexrgb('#2a2d33')))
        rings.append(ring)
    n = len(rings[0])
    for ring in rings:
        for p, c in ring:
            P['v'].append(p); P['t'].append(0.0); P['vc'].append(c)
    for k in range(NT):
        k1 = (k + 1) % NT
        for j in range(n):                                                  # section fermée : extérieur, bords, intérieur
            j1 = (j + 1) % n
            P['p'].append([k * n + j, k1 * n + j, k1 * n + j1, k * n + j1]); P['fc'].append(rings[k][j][1])
    return P


def build(name, verts, faces, fgroup, weights, opts, rnd):
    mk = markers(verts, faces, fgroup)
    V = [Vector(v) * S for v in verts]
    floor = min(V[i].y for f, g in zip(faces, fgroup) if g == 'body' for i in f)
    for v in V:
        v.y -= floor
    for k in mk:
        mk[k] = mk[k] - Vector((0, floor, 0))
    body = [f for f, g in zip(faces, fgroup) if g == 'body']
    faces_index = {id(f): k for k, f in enumerate(faces)}
    used = sorted({i for f in body for i in f})
    # vertex normals of the body
    nrm = {i: Vector((0, 0, 0)) for i in used}
    for f in body:
        a, b, c = V[f[0]], V[f[1]], V[f[2]]
        n = (b - a).cross(c - a)
        for i in f:
            nrm[i] += n
    for i in nrm:
        nrm[i] = nrm[i].normalized() if nrm[i].length > 0 else Vector((0, 1, 0))
    dom = {i: max(weights.get(i, {'pelvis': 1}).items(), key=lambda kv: kv[1])[0] for i in used}
    hip_y = mk['joint-l-upper-leg'].y
    chin_y = mk['joint-mouth'].y - 0.03
    neck = mk['joint-neck']
    reg = {i: region(dom[i], weights.get(i, {}), V[i].y, hip_y, chin_y, None) for i in used}
    # T7 (freeride) : veste longue sur le haut des cuisses (extérieur, avant, arrière), entrejambe dégagé : la veste
    # descend à ~13 cm sous l'articulation de la hanche, sauf entre les jambes (elle suit ainsi chaque cuisse)
    tc_x = sum(V[i].x for i in used if dom[i].startswith(('spine', 'pelvis'))) / max(1, sum(1 for i in used if dom[i].startswith(('spine', 'pelvis'))))
    for i in used:
        if reg[i] == 'pants' and dom[i].startswith('thigh') and V[i].y > hip_y - 0.135 and abs(V[i].x - tc_x) > 0.075:
            reg[i] = 'both'

    JK, PT, GL, SK = hexrgb(opts['jacket']), hexrgb(opts['pants']), hexrgb('#1b1d22'), hexrgb(SKIN_TONES[opts['skin']])
    hem_y = hip_y - 0.13                                                        # T7 (freeride) : veste longue
    ACC = hexrgb(opts['accent'])
    verts_out, cols, tints, wout, polys, fcol, psrc, skin_base, vsrc, vkind = [], [], [], [], [], [], [], {}, {}, {}

    def add_shell(kind, offset_fn, col_fn, tint_fn):
        idx, start = {}, len(polys)
        for f in body:
            kinds = set()
            for i in f:
                kinds |= {'jacket', 'pants'} if reg[i] == 'both' else {'skin', 'jacket'} if reg[i] == 'neck' else {reg[i]}
            if kind not in kinds:                 # boundary faces go to both garments: they overlap, never gap
                continue
            ids = []
            for i in f:
                if i not in idx:
                    idx[i] = len(verts_out)
                    if kind == 'skin':
                        skin_base[len(verts_out)] = i
                    vsrc[len(verts_out)] = i; vkind[len(verts_out)] = kind
                    p = V[i] + nrm[i] * offset_fn(i)
                    verts_out.append(p); cols.append(col_fn(i, p)); tints.append(tint_fn(i, p)); wout.append(weights.get(i, {'pelvis': 1.0}))
                ids.append(idx[i])
            polys.append(ids); psrc.append((kind, faces_index[id(f)]))
            fcol.append(col_fn(max(f, key=lambda i: V[i].y if kind == 'skin' else 0), sum((V[i] for i in f), Vector()) / len(f)))
        return start, len(polys)

    # quilted jacket: baffles across the torso and sleeves, hem flared over the hips, high collar
    # T7 (freeride) : veste ample. Sous la poitrine, le torse tombe droit (enveloppe par secteur angulaire de la section
    # la plus large) ; manches en cylindres larges autour des os, resserrées au poignet ; ourlet plus bas.
    sc_ = (mk['joint-l-upper-leg'] - mk['joint-l-knee']).length / 0.42          # échelle du gabarit (femme : ~0,9)
    tors = [i for i in used if dom[i].startswith(('spine', 'pelvis'))]
    cx_ = sum(V[i].x for i in tors) / len(tors); cz_ = sum(V[i].z for i in tors) / len(tors)
    chest_y, NS = mk['SPINE_C'].y, 24
    sect = lambda q: int((math.atan2(q.x - cx_, q.z - cz_) + math.pi) / (2 * math.pi) * NS) % NS
    env = [0.0] * NS
    for i in used:
        if dom[i].startswith(('spine', 'pelvis', 'thigh')) and hip_y - 0.03 < V[i].y < chest_y:
            k = sect(V[i]); env[k] = max(env[k], math.hypot(V[i].x - cx_, V[i].z - cz_))
    env = [max(env[(k + j) % NS] for j in (-1, 0, 1)) for k in range(NS)]   # enveloppe lissée

    def seg_r(p, a, b):
        ab = b - a; t = max(0.0, min(1.0, (p - a).dot(ab) / max(1e-6, ab.dot(ab))))
        return (p - (a + ab * t)).length, t

    # trousers: straight legs from hip to boot (below the knee the shell becomes a cylinder around the leg axis)
    def p_off(i):
        # T7 (freeride) : pantalon large, jambes en cylindres autour des os, qui s'évase et s'empile sur la chaussure
        p, d = V[i], dom[i]
        o = 0.04
        if d.startswith('calf'):
            s = 'l' if d.endswith('_l') else 'r'
            k, a = mk['joint-%s-knee' % s], mk['joint-%s-ankle' % s]
            t = max(0.0, min(1.0, (k.y - p.y) / max(0.05, k.y - a.y)))
            axis = k.lerp(a, t)
            r = (Vector((p.x, 0, p.z)) - Vector((axis.x, 0, axis.z))).length
            want = (0.098 + 0.018 * t) * sc_                                     # s'évase sur la chaussure
            o = max(0.02, want - r)
        if d.startswith('thigh'):
            s = 'l' if d.endswith('_l') else 'r'
            r, t = seg_r(p, mk['joint-%s-upper-leg' % s], mk['joint-%s-knee' % s])
            o = max(0.03, (0.11 - 0.008 * t) * sc_ - r)
        return o + 0.004 * abs(math.sin(p.y * math.pi / 0.07)) * (1 if dom[i].startswith('thigh') else 0.4)
    def j_off(i):
        p, d = V[i], dom[i]
        base = 0.045 if d.startswith(('spine', 'pelvis', 'clavicle')) else 0.026 if d.startswith('upperarm') else 0.022
        r_ax = math.hypot(p.x - cx_, p.z - cz_)
        if d.startswith(('spine', 'pelvis', 'thigh')) and hem_y < p.y < chest_y and r_ax > 0.06:
            base = max(base, env[sect(p)] + 0.045 - r_ax)                       # tombe droit depuis la poitrine
        if d.startswith(('upperarm', 'lowerarm')):
            s_ = d[-1]
            sh_, el_, wr_ = mk['joint-%s-shoulder' % s_], mk['joint-%s-elbow' % s_], mk['joint-%s-hand' % s_]
            if d.startswith('upperarm'):
                r, t = seg_r(p, sh_, el_); want = 0.074 * sc_
            else:
                r, t = seg_r(p, el_, wr_); want = (0.068 - 0.022 * max(0.0, (t - 0.72) / 0.28)) * sc_   # poignet resserré
            base = max(0.016, want - r)
        if d == 'neck_01':                                                        # T7 : col montant ajusté, qui se resserre sur le cou
            t = max(0.0, min(1.0, (p.y - neck.y) / max(0.02, chin_y - 0.035 - neck.y)))
            base = 0.028 - 0.016 * t
        if d.startswith(('pelvis', 'thigh')) and not (hem_y < p.y < chest_y and r_ax > 0.06):
            base = 0.05 + 0.012 * max(0.0, min(1.0, (hip_y + 0.04 - p.y) / 0.1))   # hem sits just clear of the hips
        quilt = 0.006 * abs(math.sin((p.y if d.startswith(('spine', 'pelvis')) else (p - mk['joint-l-shoulder']).length * 1.6) * math.pi / 0.11))
        if reg[i] == 'both':                       # T7 : là où la veste recouvre le pantalon, toujours 1,5 cm au-dessus
            base = max(base, p_off(i) + JK_MARGIN)
        return base + quilt

    def j_col(i, p):
        d = dom[i]
        return JK

    def j_tint(i, p):
        # T7 (freeride) : deux couleurs par veste (teintées par personne) : empiècement des épaules et avant-bras = 1,4
        d = dom[i]
        if d.startswith('lowerarm') or (p.y > chest_y + 0.035 and not d.startswith('neck')):
            return 1.4                     # proche de 1 : l'interpolation entre les deux couleurs ne traverse aucune autre teinte
        return 1.0

    jk_rng = add_shell('jacket', j_off, j_col, j_tint)

    pt_rng = add_shell('pants', p_off, lambda i, p: PT if p.y > 0.16 else hexrgb('#16181c'), lambda i, p: 0.0)
    # contrôle : le pantalon ne traverse jamais la veste (même sommet du corps, mêmes poids : l'écart se conserve en pose)
    bad = [i for i in used if reg[i] == 'both' and j_off(i) < p_off(i) + JK_MARGIN - 0.003]
    assert not bad or JK_MARGIN < 0, 'pantalon au-dessus de la veste en %d sommets' % len(bad)

    # T7 : ouvertures refermées. Chaque bord libre d'un vêtement (col, poignets, ourlet, bas de pantalon) est prolongé
    # par une bande de doublure qui revient sur la surface d'en dessous : peau du cou, avant-bras, pantalon, tige de la
    # chaussure. Par l'ouverture, on voit la doublure, jamais l'intérieur du vêtement ni le vide ; la bande porte les
    # poids du bord, elle suit donc le mouvement comme le reste du vêtement. Les bords sont protégés de la décimation.
    from collections import Counter
    LINING, FLEECE = hexrgb('#1d2026'), hexrgb(opts.get('lining', '#3a3f48'))

    def rim_edges(rng):
        ec = Counter((min(a, b), max(a, b)) for p in polys[rng[0]:rng[1]] for a, b in zip(p, p[1:] + p[:1]))
        return [(a, b) for p in polys[rng[0]:rng[1]] for a, b in zip(p, p[1:] + p[:1]) if ec[(min(a, b), max(a, b))] == 1]

    def close(rng, kind):
        edges, fold = rim_edges(rng), {}
        for a, b in edges:
            d = dom[vsrc[a]]
            ring = None                                            # (axe a, axe b, rayon) : bord intérieur en anneau régulier
            if kind == 'pants' and not d.startswith(('calf', 'foot')):
                inset, col = (lambda j: 0.004), LINING             # ceinture : revient sur le corps (fermée ensuite par un fond)
            elif kind == 'pants':
                inset, col = (lambda j: 0.0), LINING               # revient vers la tige de la chaussure
                s_ = d[-1]; ring = (mk['joint-%s-knee' % s_], mk['joint-%s-ankle' % s_], 0.05 * sc_)
            elif d in ('neck_01', 'head', 'spine_03', 'clavicle_l', 'clavicle_r') and V[vsrc[a]].y > neck.y - 0.03:
                inset, col = (lambda j: 0.003), FLEECE             # col doublé de polaire, posé sur la peau du cou
            elif d.startswith(('lowerarm', 'hand', 'upperarm')):
                inset, col = (lambda j: 0.004), LINING             # poignet resserré sur l'avant-bras (sous le gant)
                s_ = d[-1]; ring = (mk['joint-%s-elbow' % s_], mk['joint-%s-hand' % s_], 0.03 * sc_)
            else:
                inset, col = (lambda j: p_off(j) - 0.004), LINING   # ourlet qui rentre sous la surface du pantalon (aucun interstice)
                for v in (a, b):
                    if verts_out[v].y < hip_y - 0.09:
                        verts_out[v].y = hem_y                     # ourlet droit (l'échancrure de l'entrejambe reste)
            ids = []
            for v in (a, b):
                if v not in fold:
                    j = vsrc[v]
                    q = V[j] + nrm[j] * inset(j)
                    if ring:                                       # anneau autour de l'axe de l'os, à la hauteur du bord
                        ab = ring[1] - ring[0]; t = max(0.0, min(1.0, (verts_out[v] - ring[0]).dot(ab) / ab.dot(ab)))
                        c = ring[0] + ab * t; rd = verts_out[v] - c; rd -= ab.normalized() * rd.dot(ab.normalized())
                        q = c + rd.normalized() * ring[2]
                    fold[v] = len(verts_out); verts_out.append(q); cols.append(col); tints.append(0.0); wout.append(wout[v])
                ids.append(fold[v])
            polys.append([b, a, ids[0], ids[1]]); fcol.append(col); psrc.append(('fold', -1))
            rimv.update((a, b, ids[0], ids[1]))
    rimv = set()
    n0 = len(polys)
    close(jk_rng, 'jacket')
    nf = len(polys)
    close(pt_rng, 'pants')

    # T7 (freeride) : bas de pantalon et poignets plus larges que la chaussure ou le gant : chaque ouverture est fermée
    # par un fond de doublure (éventail sur le bord intérieur de la bande) que la chaussure ou le gant traverse ; vu
    # d'en dessous, aucun jour
    def cap(lo, hi, bones):
        for side in ('l', 'r'):
            loop = [(p[2], p[3]) for p, k in zip(polys[lo:hi], psrc[lo:hi]) if k[0] == 'fold' and wout[p[2]]
                    and max(wout[p[2]], key=wout[p[2]].get) in tuple(b + '_' + side for b in bones)]
            if not loop:
                continue
            ids = {v for e in loop for v in e}
            ctr = sum((verts_out[v] for v in ids), Vector()) / len(ids)
            ci = len(verts_out); verts_out.append(ctr); cols.append(LINING); tints.append(0.0); wout.append(dict(wout[next(iter(ids))]))
            for fa, fb in loop:
                polys.append([fb, fa, ci]); fcol.append(LINING); psrc.append(('fold', -1))
            rimv.update(ids | {ci})
            if os.environ.get('HM_DEBUG'):             # orientation du fond : sa normale doit sortir du membre
                j0, j1 = {'calf': ('knee', 'ankle'), 'lowerarm': ('elbow', 'hand')}[bones[0]]
                ax = mk['joint-%s-%s' % (side, j1)] - mk['joint-%s-%s' % (side, j0)]
                out_ = sum(1 for fa, fb in loop if (verts_out[fa] - verts_out[fb]).cross(verts_out[ci] - verts_out[fb]).dot(ax) > 0)
                print('FOND', bones[0], side, 'vers l extérieur', out_, '/', len(loop))
    nend = len(polys)
    cap(nf, nend, ('calf', 'foot'))
    cap(n0, nf, ('lowerarm', 'hand'))
    # ceinture du pantalon : vue d'en dessous en schuss, on voyait dans le pantalon par la taille ; un fond horizontal
    # (éventail depuis le centre de la ceinture) le ferme
    belt = [(p[2], p[3]) for p, k in zip(polys[nf:nend], psrc[nf:nend]) if k[0] == 'fold' and wout[p[2]]
            and not max(wout[p[2]], key=wout[p[2]].get).startswith(('calf', 'foot'))]
    if belt:
        ids = {v for e in belt for v in e}
        ci = len(verts_out); verts_out.append(sum((verts_out[v] for v in ids), Vector()) / len(ids)); cols.append(LINING); tints.append(0.0); wout.append({'pelvis': 1.0})
        for fa, fb in belt:
            polys.append([fb, fa, ci]); fcol.append(LINING); psrc.append(('fold', -1))
        rimv.update(ids | {ci})
    # gloved fists closed round the pole grip (the open MakeHuman hands are dropped): a padded mitten centred on
    # the palm, ~7.5 cm past the wrist along the hand bone, with a gauntlet cuff over the sleeve end
    for s_ in ('l', 'r'):
        w_, tip = mk['joint-%s-hand' % s_], mk['joint-%s-hand-3' % s_]
        d = (tip - w_).normalized(); a = d.cross(Vector((0, 0, 1))); a = a.normalized() if a.length > 1e-4 else Vector((1, 0, 0)); b2 = d.cross(a)
        def ell(c, rd, ra, rb, col, wts, nl=8, nm=12):
            base = len(verts_out)
            for i_ in range(nl + 1):
                la = -math.pi / 2 + math.pi * i_ / nl
                for j_ in range(nm):
                    lo = 2 * math.pi * j_ / nm
                    p = c + d * (math.sin(la) * rd) + a * (math.cos(la) * math.cos(lo) * ra) + b2 * (math.cos(la) * math.sin(lo) * rb)
                    verts_out.append(p); cols.append(col); tints.append(0.0); wout.append(wts)
            for i_ in range(nl):
                for j_ in range(nm):
                    j1 = (j_ + 1) % nm
                    polys.append([base + i_ * nm + j_, base + i_ * nm + j1, base + (i_ + 1) * nm + j1, base + (i_ + 1) * nm + j_]); fcol.append(col); psrc.append(('extra', -1))
        hb = {'hand_' + s_: 1.0}
        ell(w_ + d * 0.075, 0.058, 0.047, 0.043, GL, hb)                                  # fist
        ell(w_ + d * 0.06 + b2 * 0.03 + a * 0.012, 0.03, 0.017, 0.017, GL, hb, 5, 8)        # thumb over the fingers
        ell(w_ + d * 0.005, 0.045, 0.052, 0.05, hexrgb('#22252c'), {'hand_' + s_: 0.5, 'lowerarm_' + s_: 0.5}, 6, 12)   # gauntlet cuff
    add_shell('skin', lambda i: 0.0, lambda i, p: (1.0, 1.0, 1.0), lambda i, p: 2.0)   # colour from the skin texture

    head_c = (mk['joint-head'] + mk['joint-head-2']) * 0.5
    eye_y = (mk['joint-l-eye'].y + mk['joint-r-eye'].y) * 0.5
    neck = mk['joint-neck']
    W = lambda **kw: kw

    # ---- jacket details, built into the body: rolled hood, back protector pack with shoulder straps, pockets
    def surf(x, y, front, kinds=('jacket',)):
        """closest jacket-shell point to (x, y) on the front (front=1) or back (front=-1) of the torso"""
        best, bd = None, 1e9
        for i in used:
            if reg[i] not in ('jacket', 'both') or V[i].z * front <= 0:
                continue
            d = (V[i].x - x) ** 2 + (V[i].y - y) ** 2
            if d < bd:
                bd, best = d, i
        return V[best] + nrm[best] * (j_off(best) + 0.004), nrm[best]

    def add_box(c, n, up, size, col, wts, tint=0.0, faces6=True):
        n = n.normalized(); r = up.cross(n).normalized(); u = n.cross(r).normalized()
        sx, sy, sz = (v / 2 for v in size)
        base = len(verts_out)
        for dx in (-sx, sx):
            for dy in (-sy, sy):
                for dz in (0, sz * 2):
                    verts_out.append(c + r * dx + u * dy + n * dz); cols.append(col); tints.append(tint); wout.append(wts)
        for fc in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
            polys.append([base + q for q in fc]); fcol.append(col); psrc.append(('extra', -1))

    def add_tube(path, rad, col, wts_fn, tint=0.0, sides=8):
        rings = []
        for k, p in enumerate(path):
            d = (path[min(k + 1, len(path) - 1)] - path[max(k - 1, 0)]).normalized()
            a = Vector((0, 1, 0)) if abs(d.y) < 0.9 else Vector((1, 0, 0))
            u = d.cross(a).normalized(); w = d.cross(u).normalized()
            ring = []
            for t in range(sides):
                th = t / sides * 2 * math.pi
                ring.append(len(verts_out)); verts_out.append(p + (u * math.cos(th) + w * math.sin(th)) * rad); cols.append(col); tints.append(tint); wout.append(wts_fn(p))
            rings.append(ring)
        for k in range(len(rings) - 1):
            for t in range(sides):
                t1 = (t + 1) % sides
                polys.append([rings[k][t], rings[k][t1], rings[k + 1][t1], rings[k + 1][t]]); fcol.append(col); psrc.append(('extra', -1))
        for k, ring in ((0, rings[0]), (len(path) - 1, rings[-1])):   # T7 : bouts fermés (capuche roulée, sangles)
            polys.append(list(reversed(ring)) if k == 0 else list(ring)); fcol.append(col); psrc.append(('extra', -1))

    sp_b, sp_c = mk['SPINE_B'], mk['SPINE_C']
    upper = lambda p: W(spine_03=0.7, spine_02=0.3) if p.y > sp_c.y - 0.05 else W(spine_02=0.7, spine_01=0.3)
    # rolled hood behind the collar
    hc = Vector((neck.x, neck.y - 0.03, neck.z - 0.005))
    rx = abs(mk['joint-l-clavicle'].x - mk['joint-r-clavicle'].x) * 0.62
    hood = [hc + Vector((rx * math.sin(a), 0.012 * math.cos(a * 2), -abs(rx * 0.95 * math.cos(a)) - 0.035)) for a in (math.radians(v) for v in range(-100, 101, 10))]
    hood = [q + Vector((0, 0.006, -0.022)) for q in hood]                         # T7 (freeride) : capuche ample
    add_tube(hood, 0.058, JK, lambda p: W(spine_03=0.6, neck_01=0.4), tint=1.4, sides=12)
    # back protector pack and straps
    top_y, bot_y = sp_c.y + 0.02, sp_b.y - 0.1
    pb, pn = surf(0.0, (top_y + bot_y) / 2, -1)
    add_box(pb, Vector((0, 0, -1)), Vector((0, 1, 0)), (0.3, top_y - bot_y + 0.04, 0.13), hexrgb('#1c1f25'), W(spine_02=0.5, spine_03=0.5))   # sac freeride
    add_box(pb + Vector((0, 0.04, -0.132)), Vector((0, 0, -1)), Vector((0, 1, 0)), (0.2, 0.14, 0.014), hexrgb(opts['accent']), W(spine_02=0.5, spine_03=0.5))
    for sx in (-1, 1):
        sh = mk['joint-%s-shoulder' % ('l' if sx > 0 else 'r')]
        pf, _ = surf(sx * 0.085, sh.y - 0.12, 1)
        pf2, _ = surf(sx * 0.095, sp_b.y - 0.02, 1)
        pbk, _ = surf(sx * 0.085, top_y - 0.02, -1)
        path = [pbk, Vector((sx * 0.09, sh.y + 0.045, (pbk.z + pf.z) / 2)), pf + Vector((0, 0.04, 0.004)), pf, pf2]
        add_tube([path[0].lerp(path[1], t) for t in (0, 0.5, 1)] + [path[1].lerp(path[2], t) for t in (0.5, 1)] + path[3:], 0.011, hexrgb('#1c1f25'), upper)
    # chest pocket (left), hip pockets: flap, zip line
    for (x, y, wdt) in ((0.085, sp_c.y - 0.06, 0.11), (0.13, hip_y + 0.06, 0.13), (-0.13, hip_y + 0.06, 0.13)):
        p, n = surf(x, y, 1)
        n = Vector((n.x, 0, n.z)).normalized()
        wts = upper(p) if y > hip_y + 0.1 else W(spine_01=0.6, pelvis=0.4)
        add_box(p, n, Vector((0, 1, 0)), (wdt, 0.065, 0.008), (0.82, 0.82, 0.82), wts, tint=1.0)
        add_box(p + Vector((0, 0.029, 0)), n, Vector((0, 1, 0)), (wdt * 0.92, 0.006, 0.011), hexrgb('#16181c'), wts)
    # chest zip
    zs = [surf(0.0, y, 1)[0] + Vector((0, 0, 0.003)) for y in [hip_y - 0.05 + k * (neck.y - hip_y) / 8 for k in range(9)]]
    add_tube(zs, 0.005, hexrgb('#16181c'), upper, sides=5)

    # ---- head gear: shells offset from the head surface, so they fit the head instead of a generic sphere
    hface = [f for f in body if all(dom[i] in ('head', 'neck_01') for i in f)]
    hv = sorted({i for f in hface for i in f})
    def hdir(i):
        d = Vector((V[i].x - head_c.x, 0, V[i].z - head_c.z))
        return d.normalized() if d.length > 1e-6 else Vector((0, 0, 1))
    def line(i, front, side, back):
        c = hdir(i).z
        return eye_y + (side + (front - side) * c if c > 0 else side + (back - side) * -c)

    def gear(name, sel, offset, colf, tintf, smooth_it, rim=0.0, rim_col=None, snap=None, body_w=False):
        """a skinned shell (weights head = 1) over the selected head faces, smoothed, with an optional rim band.
        T7 : snap(i) -> hauteur du bord (ou None) : le bord libre est calé sur une ligne nette au lieu de suivre les
        marches des faces sélectionnées ; body_w : poids de peau du corps (pièce qui suit le cou, pas la tête seule)."""
        P = {'v': [], 'c': [], 't': [], 'p': [], 'fc': []}
        idx = {}
        for f in hface:
            if not all(sel(i) for i in f):
                continue
            ids = []
            for i in f:
                if i not in idx:
                    idx[i] = len(P['v']); P['v'].append(V[i] + nrm[i] * offset(i)); P['t'].append(tintf(i))
                ids.append(idx[i])
            P['p'].append(ids); P['fc'].append(colf(f))
        src = {v: k for k, v in idx.items()}
        if rim:
            from collections import Counter
            ec = Counter(tuple(sorted((a, b))) for p in P['p'] for a, b in zip(p, p[1:] + p[:1]))
            edges = [(a, b) for p in P['p'] for a, b in zip(p, p[1:] + p[:1]) if ec[tuple(sorted((a, b)))] == 1]
            if snap:
                for v in {v for e in edges for v in e}:
                    y = snap(src[v])
                    if y is not None and abs(y - P['v'][v].y) < 0.025:
                        P['v'][v].y = y
            fold = {}
            for a, b in edges:                                    # open border: fold a rim back to the head
                for v in (a, b):
                    if v not in fold:
                        i = src[v]; q = V[i] + nrm[i] * rim; q.y = P['v'][v].y if snap else q.y
                        fold[v] = len(P['v']); P['v'].append(q); P['t'].append(P['t'][v]); src[fold[v]] = i
                P['p'].append([b, a, fold[a], fold[b]]); P['fc'].append(rim_col or hexrgb('#1a1c21'))
        if body_w:
            P['w'] = [weights.get(src[k], {'head': 1.0}) for k in range(len(P['v']))]
        P['smooth'] = smooth_it
        return P

    HC, LENS = hexrgb(opts.get('helmet', '#f1f3f5')), hexrgb(opts.get('lens', '#d9772a'))
    hl = lambda i: line(i, 0.028, -0.03, -0.065)   # T7 : bord avant sous le haut du masque
    # T7 : coque de casque unie (les aérations et la sangle peintes par face faisaient des dents de scie), bord net
    helmet = gear('helmet', lambda i: V[i].y >= hl(i), lambda i: 0.024, lambda f: HC, lambda i: 3.0, 10, rim=0.004, rim_col=hexrgb('#24272d'), snap=hl)
    goggles = goggle_band(V, hface, head_c, eye_y, LENS)
    # beanie for people in town: rib-knit cuff, pompom
    bl = lambda i: line(i, 0.062, 0.002, -0.04)
    long_ = opts.get('long_hair', False)
    hair_off = lambda i: 0.004 + 0.005 * max(0.0, -hdir(i).z) * (1.6 if long_ else 1.0)
    def b_col(f):
        c = sum((V[i] for i in f), Vector()) / len(f)
        a = math.atan2(c.x - head_c.x, c.z - head_c.z)
        cuff = c.y < bl(f[0]) + 0.04
        return (0.78, 0.78, 0.78) if cuff and int((a + 4) * 26) % 2 else (1.0, 1.0, 1.0)
    # T7 : bonnet ajusté (juste au-dessus des cheveux sculptés, revers un peu plus épais), bord net
    beanie = gear('beanie', lambda i: V[i].y >= bl(i), lambda i: hair_off(i) + 0.005 + (0.004 if V[i].y < bl(i) + 0.04 else 0.0), b_col, lambda i: 4.0, 2,
                  rim=0.003, rim_col=(0.78, 0.78, 0.78), snap=bl)
    # T7 : cheveux sculptés (à la place des cartes) : une coque ajustée sur la nuque et les tempes, qui remonte sous le
    # bonnet ; bord inférieur replié sur la peau (aucun jour) ; mèches dessinées par le nuanceur, teinte par personne.
    # Cheveux longs (femmes) : jusqu'au col, avec une queue de cheval basse en volumes fermés.
    def hair_sel(i):
        if hdir(i).z > 0.42:
            return False                                                              # visage
        return line(i, 0.05, -0.03 if long_ else 0.014, (chin_y - 0.045 - eye_y) if long_ else -0.075) <= V[i].y <= bl(i) + 0.03
    hair = gear('hair', hair_sel, hair_off, lambda f: (1.0, 1.0, 1.0), lambda i: 5.0, 3, rim=0.0015, rim_col=(0.82, 0.82, 0.82),
                snap=lambda i: line(i, 0.05, -0.03 if long_ else 0.014, (chin_y - 0.045 - eye_y) if long_ else -0.075) if V[i].y < bl(i) else None)
    if long_:
        back = min((i for i in hv if dom[i] == 'head'), key=lambda i: V[i].z)
        p0 = V[back] + Vector((0, -0.035, -0.012))
        for k_, (dy, dz, r) in enumerate(((0.0, 0.0, 0.03), (-0.05, -0.018, 0.026), (-0.1, -0.03, 0.02), (-0.14, -0.036, 0.013))):
            c, base = p0 + Vector((0, dy, dz)), len(hair['v'])
            for a in range(7):
                for b in range(10):
                    la, lo = -math.pi / 2 + math.pi * a / 6, 2 * math.pi * b / 10
                    hair['v'].append(c + Vector((math.cos(la) * math.sin(lo) * r, math.sin(la) * r * 1.5, math.cos(la) * math.cos(lo) * r * 0.9))); hair['t'].append(5.0)
            for a in range(6):
                for b in range(10):
                    b1 = (b + 1) % 10
                    hair['p'].append([base + a * 10 + b, base + a * 10 + b1, base + (a + 1) * 10 + b1, base + (a + 1) * 10 + b]); hair['fc'].append((1.0, 1.0, 1.0))
    # T7 (freeride) : mèches qui dépassent du bonnet ou du casque, autour des tempes et de la nuque : volumes effilés
    # fermés (aucun jour), légèrement recourbés vers l'extérieur ; plus longues chez les femmes. Visibles avec les deux
    # équipements (sous le casque comme sous le bonnet).
    from mathutils.bvhtree import BVHTree
    hbvh = BVHTree.FromPolygons([tuple(v) for v in V], [list(f) for f in hface])
    lr = random.Random(11 if long_ else 5)
    def head_pt(a, y):
        o = Vector((head_c.x, y, head_c.z)); d = Vector((math.sin(a), 0, math.cos(a)))
        hit = hbvh.ray_cast(o, d, 0.3)
        return (hit[0] if hit[0] else o + d * 0.09), d
    angs = [math.radians(x) for x in (range(64, 297, 9) if long_ else range(72, 289, 10))]
    hair['nsmooth'] = len(hair['v'])                                            # seule la coque est lissée
    for a in angs:
        a += math.radians(lr.uniform(-3, 3))
        c = math.cos(a)                                                          # 1 devant, -1 derrière
        side, back = abs(math.sin(a)), max(0.0, -c)
        y_low = eye_y + (0.014 + (-0.075 - 0.014) * back if not long_ else -0.03 + ((chin_y - 0.045 - eye_y) + 0.03) * back)
        base, d = head_pt(a, y_low + 0.012)
        base += d * 0.009
        L = (0.07 + 0.02 * side - 0.02 * back if long_ else 0.035 + 0.015 * side) * lr.uniform(0.75, 1.15)
        tg = Vector((math.cos(a), 0, -math.sin(a)))                              # tangente horizontale
        dr = (Vector((0, -1, 0)) * 0.88 + d * 0.3 + tg * lr.uniform(-0.25, 0.25)).normalized()
        w0, t0 = (0.019 if long_ else 0.016), 0.009
        start = len(hair['v']); rings = 4
        hair['v'].append(base - dr * 0.004); hair['t'].append(5.0)              # centre du fond (fermé)
        for k in range(rings):
            sf = k / rings; cc = base + dr * (L * sf) + d * (0.008 * sf * sf)
            w, th = w0 * (1 - 0.8 * sf), t0 * (1 - 0.6 * sf)
            for j in range(6):
                q = 2 * math.pi * j / 6
                hair['v'].append(cc + tg * (math.cos(q) * w * 0.5) + d * (math.sin(q) * th * 0.5)); hair['t'].append(5.0)
        hair['v'].append(base + dr * L + d * 0.008); hair['t'].append(5.0)       # pointe
        tip = len(hair['v']) - 1
        for j in range(6):
            j1 = (j + 1) % 6
            hair['p'].append([start, start + 1 + j1, start + 1 + j]); hair['fc'].append((1.0, 1.0, 1.0))
            for k in range(rings - 1):
                r0, r1 = start + 1 + k * 6, start + 1 + (k + 1) * 6
                hair['p'].append([r0 + j, r0 + j1, r1 + j1, r1 + j]); hair['fc'].append((1.0, 1.0, 1.0))
            rl = start + 1 + (rings - 1) * 6
            hair['p'].append([rl + j, rl + j1, tip]); hair['fc'].append((1.0, 1.0, 1.0))
    topv = max(hv, key=lambda i: V[i].y)
    pp = V[topv] + Vector((0, 0.035, -0.01))
    pom = {'v': [], 't': [], 'p': [], 'fc': [], 'smooth': 0}
    rr = random.Random(3)
    for a in range(9):
        for b in range(12):
            la, lo = -math.pi / 2 + math.pi * a / 8, 2 * math.pi * b / 12
            r = 0.04 * (1 + 0.12 * rr.random())
            pom['v'].append(pp + Vector((math.cos(la) * math.sin(lo), math.sin(la), math.cos(la) * math.cos(lo))) * r); pom['t'].append(4.0)
    for a in range(8):
        for b in range(12):
            b1 = (b + 1) % 12
            pom['p'].append([a * 12 + b, a * 12 + b1, (a + 1) * 12 + b1, (a + 1) * 12 + b]); pom['fc'].append((0.92, 0.92, 0.92))
    # T7 : tour de cou (skieurs casqués) : polaire ajustée du col jusque sous la mâchoire, bord replié sur la peau ; poids
    # de peau du cou (elle suit le cou et la tête comme la peau dessous) ; rentre dans le col de la veste
    import numpy as np
    lip = lip_line(np.array([tuple(v) for v in V]), used, mk['joint-mouth'])
    jaw = lambda i: line(i, lip.y - 0.03 - eye_y, -0.045, -0.058)   # sous le menton, sous l'oreille, sous le casque à la nuque
    gaiter = gear('gaiter', lambda i: neck.y - 0.05 <= V[i].y <= jaw(i), lambda i: 0.007, lambda f: hexrgb(opts.get('gaiter', '#2c3544')), lambda i: 0.0, 2,
                  rim=0.002, rim_col=hexrgb('#1d2430'), snap=lambda i: jaw(i) if V[i].y > neck.y else None, body_w=True)
    # eyes for faces without goggles: eyeballs in the sockets, iris and pupil facing forward
    eyes = {'v': [], 't': [], 'p': [], 'fc': [], 'smooth': 0}
    for s_ in ('l', 'r'):
        c = mk['joint-%s-eye' % s_]
        base = len(eyes['v'])
        for a in range(9):
            for b in range(14):
                la, lo = -math.pi / 2 + math.pi * a / 8, 2 * math.pi * b / 14
                eyes['v'].append(c + Vector((math.cos(la) * math.sin(lo), math.sin(la), math.cos(la) * math.cos(lo))) * opts.get('eye_r', 0.0122)); eyes['t'].append(0.0)
        for a in range(8):
            for b in range(14):
                b1 = (b + 1) % 14
                q = [base + a * 14 + b, base + a * 14 + b1, base + (a + 1) * 14 + b1, base + (a + 1) * 14 + b]
                cz = sum((eyes['v'][k] - c).normalized().z for k in q) / 4
                eyes['p'].append(q); eyes['fc'].append(hexrgb('#0c0c0e') if cz > 0.95 else hexrgb(opts.get('iris', '#5a3a22')) if cz > 0.82 else hexrgb('#ece6dc'))
    gear_parts = {'helmet': helmet, 'goggles': goggles, 'beanie': beanie, 'pompom': pom, 'eyes': eyes, 'hair': hair, 'gaiter': gaiter}

    # ---- mesh + armature
    seen, keep = set(), []                    # T7 : faces en double retirées (couleurs et provenance restent alignées)
    for k, p in enumerate(polys):
        key = tuple(sorted(set(p)))
        if key not in seen and len(key) >= 3:
            seen.add(key); keep.append(k)
        elif os.environ.get('HM_DEBUG'):
            print('double', psrc[k], p)
    if len(keep) < len(polys):
        print('faces en double ou dégénérées retirées :', len(polys) - len(keep))
        polys[:], fcol[:], psrc[:] = [polys[k] for k in keep], [fcol[k] for k in keep], [psrc[k] for k in keep]
    if os.environ.get('HM_DEBUG'):                 # orientation : une arête orientée ne doit servir qu'une fois
        from collections import Counter
        de = Counter((p[k], p[(k + 1) % len(p)]) for p in polys for k in range(len(p)))
        bad = Counter()
        for k_, p in enumerate(polys):
            if any(de[(p[k], p[(k + 1) % len(p)])] > 1 for k in range(len(p))):
                bad[psrc[k_][0]] += 1
        print('ORIENTATION', name, dict(bad))
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(G(p.x, p.y, p.z)) for p in verts_out], [], polys)
    me.update()
    psrc_v = ['extra'] * len(verts_out)
    for p, (kind, fi) in zip(polys, psrc):
        if kind not in ('extra', 'fold'):
            for v in p: psrc_v[v] = 'shell'
    bm = bmesh.new(); bm.from_mesh(me)
    cloth = [v for v in bm.verts if v.index < len(tints) and wout[v.index].get('head', 0) < 0.5 and tints[v.index] != 2.0 and psrc_v[v.index] == 'shell']
    for _ in range(6):
        bmesh.ops.smooth_vert(bm, verts=cloth, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    # T7 : après lissage, la veste reste au moins 1,5 cm au-dessus du pantalon, sommet par sommet le long de la normale du
    # corps (le lissage déplace les deux vêtements différemment)
    bm.verts.ensure_lookup_table()
    jac, pan = {}, {}
    for k, i in vsrc.items():
        if k < len(bm.verts):
            (jac if vkind.get(k) == 'jacket' else pan if vkind.get(k) == 'pants' else {})[i] = k
    pushed = 0
    for i, kj in jac.items():
        kp = pan.get(i)
        if kp is None:
            continue
        n = Vector(G(nrm[i].x, nrm[i].y, nrm[i].z)); d = (bm.verts[kj].co - bm.verts[kp].co).dot(n)
        if d < JK_MARGIN:
            bm.verts[kj].co += n * (JK_MARGIN - d); pushed += 1
    if os.environ.get('HM_DEBUG'):
        print('VESTE repoussée au-dessus du pantalon :', pushed, 'sommets')
    bm.to_mesh(me); bm.free(); me.update()
    ca = me.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
    for poly in me.polygons:
        for li, vi in zip(poly.loop_indices, poly.vertices):
            c = fcol[poly.index] if poly.index < len(fcol) else cols[vi]
            ca.data[li].color = (srgb2lin(c[0]), srgb2lin(c[1]), srgb2lin(c[2]), 1.0)
    me.color_attributes.active_color = ca
    ta = me.attributes.new('_tint', 'FLOAT', 'POINT')
    for k, t in enumerate(tints):
        ta.data[k].value = t
    uvl = me.uv_layers.new(name='UVMap')
    fh = min((i for i in used if dom[i] == 'head' and V[i].z > head_c.z), key=lambda i: (V[i].x - head_c.x) ** 2 + (V[i].y - (eye_y + 0.055)) ** 2)
    plain_skin_uv = next(skin_uv(UVS[FUV[fi][j]]) for fi, f in enumerate(faces) for j, i in enumerate(f) if i == fh and FUV[fi][j] >= 0)   # forehead
    for poly in me.polygons:
        kind, fi = psrc[poly.index]
        for j, li in enumerate(poly.loop_indices):
            if kind == 'skin' and fi >= 0 and FUV[fi][j] >= 0 and all(-0.001 <= c <= 1.001 for c in skin_uv(UVS[FUV[fi][j]])):
                uvl.data[li].uv = skin_uv(UVS[FUV[fi][j]])
            elif kind == 'skin':
                uvl.data[li].uv = plain_skin_uv
            else:
                uvl.data[li].uv = WHITE_UV
    for p in me.polygons:
        p.use_smooth = True
    sa = me.attributes.new('src', 'INT', 'POINT')
    for k in range(len(me.vertices)):
        sa.data[k].value = k
    me_face = me.copy(); me_face.name = name + '_face'
    for mesh_, keep_skin in ((me, False), (me_face, True)):
        bm = bmesh.new(); bm.from_mesh(mesh_)
        bm.faces.ensure_lookup_table()
        dead = [fc for fc in bm.faces if (psrc[fc.index][0] == 'skin') != keep_skin]
        bmesh.ops.delete(bm, geom=dead, context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bm.to_mesh(mesh_); bm.free(); mesh_.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    face = bpy.data.objects.new(name + '_face', me_face)
    bpy.context.scene.collection.objects.link(face)

    arm = bpy.data.armatures.new(name + '_rig')
    ao = bpy.data.objects.new(name + '_rig', arm)
    bpy.context.scene.collection.objects.link(ao)
    bpy.context.view_layer.objects.active = ao
    bpy.ops.object.mode_set(mode='EDIT')
    eb = {}
    for bn, h, t, par in BONES:
        b = arm.edit_bones.new(bn)
        b.head, b.tail = G(*mk[h]), G(*mk[t])
        if (b.tail - b.head).length < 0.02:
            b.tail = b.head + Vector((0, 0, 0.05))
        if par:
            b.parent = eb[par]
        eb[bn] = b
    bpy.ops.object.mode_set(mode='OBJECT')
    for o_ in (ob, face):
        for bn, *_ in BONES:
            o_.vertex_groups.new(name=bn)
        src = o_.data.attributes['src']
        for v in o_.data.vertices:
            wd = wout[src.data[v.index].value]
            tot = sum(wd.values()) or 1
            for bn, x in sorted(wd.items(), key=lambda kv: -kv[1])[:4]:
                if bn in o_.vertex_groups:
                    o_.vertex_groups[bn].add([v.index], x / tot, 'REPLACE')
        o_.parent = ao
        m_ = o_.modifiers.new('arm', 'ARMATURE'); m_.object = ao
    face['skin_base'] = {str(k): v for k, v in skin_base.items()}
    rg, sa_ = ob.vertex_groups.new(name='rim'), ob.data.attributes['src']   # bords et doublures : gardés par la décimation
    rg.add([v.index for v in ob.data.vertices if sa_.data[v.index].value in rimv], 1.0, 'REPLACE')
    # ---- head gear meshes on the same rig
    gobs = []
    for gname, P in gear_parts.items():
        gm = bpy.data.meshes.new(name + '_' + gname)
        gm.from_pydata([tuple(G(p.x, p.y, p.z)) for p in P['v']], [], P['p']); gm.update()
        if P['smooth']:
            bm = bmesh.new(); bm.from_mesh(gm)
            bm.verts.ensure_lookup_table()
            sv = [v for v in bm.verts if v.index < P.get('nsmooth', len(bm.verts))]   # T7 : les mèches ajoutées ensuite ne sont pas lissées
            for _ in range(P['smooth']):
                bmesh.ops.smooth_vert(bm, verts=sv, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bm.to_mesh(gm); bm.free(); gm.update()
        ca = gm.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
        for poly in gm.polygons:
            c = P['fc'][poly.index]
            for li, vi in zip(poly.loop_indices, poly.vertices):
                if 'vc' in P:
                    c = P['vc'][vi]                                 # couleur par sommet (contour d'écran lisse)
                ca.data[li].color = (srgb2lin(c[0]), srgb2lin(c[1]), srgb2lin(c[2]), 1.0)
        gm.color_attributes.active_color = ca
        ta = gm.attributes.new('_tint', 'FLOAT', 'POINT')
        for k, t in enumerate(P['t']):
            ta.data[k].value = t
        for p in gm.polygons:
            p.use_smooth = True
        go = bpy.data.objects.new(name + '_' + gname, gm); bpy.context.scene.collection.objects.link(go)
        if 'w' in P:                                       # poids du corps (tour de cou)
            for bn, *_ in BONES:
                go.vertex_groups.new(name=bn)
            for k, wd in enumerate(P['w']):
                tot = sum(wd.values()) or 1
                for bn, x in sorted(wd.items(), key=lambda kv: -kv[1])[:4]:
                    if bn in go.vertex_groups:
                        go.vertex_groups[bn].add([k], x / tot, 'REPLACE')
        else:
            go.vertex_groups.new(name='head').add(list(range(len(P['v']))), 1.0, 'REPLACE')
        go.parent = ao; m2 = go.modifiers.new('arm', 'ARMATURE'); m2.object = ao
        gobs.append(go)
    return ob, ao, mk, gobs, face


def pants_through_jacket(ob, opts):
    """T7 : contrôle sur le maillage livré (après lissage et décimation) : un sommet du pantalon, entre l'ourlet et la
    taille, traverse la veste s'il n'a pas de veste au-dessus de lui (rayon vers l'extérieur, 5 cm) mais en a une juste
    en dessous (rayon vers l'intérieur, 5 cm). Bloquant au-delà de 0,5 % des sommets contrôlés."""
    from mathutils.bvhtree import BVHTree
    me = ob.data; tint = me.attributes['_tint'].data
    jf = [list(p.vertices) for p in me.polygons if all(0.5 < tint[v].value < 1.5 for v in p.vertices)]
    bvh = BVHTree.FromPolygons([tuple(v.co) for v in me.vertices], jf)
    col = me.color_attributes['Color']; PT = [srgb2lin(c) for c in hexrgb(opts['pants'])]
    pv = set()
    for p in me.polygons:
        for li, v in zip(p.loop_indices, p.vertices):
            c = col.data[li].color
            if abs(c[0] - PT[0]) < 0.002 and abs(c[1] - PT[1]) < 0.002 and abs(c[2] - PT[2]) < 0.002 and tint[v].value < 0.5:   # pantalon seul (le sac est d'un gris voisin)
                pv.add(v)
    zs = [me.vertices[v].co.z for p in jf for v in p]
    lo, hi = min(zs), max(zs)                        # repère Blender : z = hauteur
    cand = [v for v in pv if lo + 0.02 < me.vertices[v].co.z < hi - 0.05]
    bad = []
    for v in cand:
        co, n = me.vertices[v].co, me.vertices[v].normal
        if bvh.ray_cast(co + n * 0.001, n, 0.05)[0]:
            continue                                 # veste juste au-dessus (pas une manche plus loin) : recouvert
        if bvh.ray_cast(co - n * 0.001, -n, 0.05)[0]:
            bad.append(v)                            # pas de veste au-dessus mais une juste en dessous : il la traverse
    print('PANTALON/VESTE', ob.name, 'sommets contrôlés', len(cand), 'à travers', len(bad))
    if os.environ.get('HM_DEBUG') and bad:
        import collections
        print('  hauteurs', sorted(collections.Counter(round(me.vertices[v].co.z, 2) for v in bad).items())[:20])
        print('  côtés', collections.Counter(('g' if me.vertices[v].co.x > 0 else 'd') + ('av' if me.vertices[v].co.y < 0 else 'ar') for v in bad))
        print('  écart', sorted(round((me.vertices[v].co - bvh.find_nearest(me.vertices[v].co)[0]).length * 1000) for v in bad))
    assert len(bad) <= 0.005 * max(1, len(cand)), 'le pantalon traverse la veste en %d sommets' % len(bad)


def finish(ob, ratio, protect=None):
    import bmesh as bm_
    bpy.context.view_layer.objects.active = ob
    bm = bm_.new(); bm.from_mesh(ob.data)
    bm_.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bm_.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data); bm.free()
    ob.data.color_attributes.active_color = ob.data.color_attributes['Color']
    if ratio < 1:
        d = ob.modifiers.new('dec', 'DECIMATE'); d.ratio = ratio
        if protect:                                   # the group's vertices are kept (inverted weights)
            d.vertex_group = protect; d.invert_vertex_group = True; d.vertex_group_factor = 1.0
        bpy.ops.object.modifier_move_to_index(modifier='dec', index=0)
        bpy.ops.object.modifier_apply(modifier='dec')
    ob.data.validate(clean_customdata=False)          # T7 : faces doublées par la fusion des sommets confondus, retirées


CROP = {}                  # head/neck island of the MakeHuman UV layout: [u0, v0, u1, v1]
WHITE_UV = (0.004, 0.004)  # a white texel in the corner of the cropped texture (clothes take their colour from vertices)


def skin_uv(uv):
    u0, v0, u1, v1 = CROP['box']
    return ((uv[0] - u0) / (u1 - u0), (uv[1] - v0) / (v1 - v0))


def skin_crop(faces, fgroup, weights):
    us = []
    for f, g, fu in zip(faces, fgroup, FUV):
        if g != 'body':
            continue
        if all(max(weights.get(i, {'pelvis': 1}).items(), key=lambda kv: kv[1])[0] == 'head' for i in f):
            us += [UVS[k] for k in fu if k >= 0]
    mu = sorted(u for u, v in us)[len(us) // 2]
    us = [(u, v) for u, v in us if abs(u - mu) < 0.25]          # the head island only (mouth interior lies elsewhere)
    su, sv = sorted(u for u, v in us), sorted(v for u, v in us)
    q = lambda L, x: L[int(x * (len(L) - 1))]
    u0, v0, u1, v1 = q(su, 0.02) - 0.012, q(sv, 0.02) - 0.012, q(su, 0.985) + 0.012, q(sv, 0.985) + 0.012   # the head island (stray mouth-interior UVs ignored)
    CROP['box'] = [u0, v0, u1, v1]


def lip_line(P, body, mo):
    """jonction des lèvres, au milieu : entre le haut de la lèvre inférieure (que l'unité « bouche ouverte » abaisse)
    et le bas de la lèvre supérieure (qu'elle ne bouge pas). Le repère joint-mouth est 3 cm plus haut, dans la tête."""
    op = expression_units_all()['mouth-open']
    near = [i for i in set(body) if abs(P[i, 0] - mo.x) < 0.004 and P[i, 2] > mo.z + 0.05 and abs(P[i, 1] - mo.y) < 0.07]
    low = [i for i in near if op.get(i, (0, 0, 0))[1] * S < -0.015]
    top = max(P[i, 1] for i in low)
    up = min(P[i, 1] for i in near if abs(op.get(i, (0, 0, 0))[1]) * S < 0.002 and P[i, 1] > top)
    y = (top + up) / 2
    z = max(P[i, 2] for i in near if abs(P[i, 1] - y) < 0.006)
    return Vector((mo.x, y, z))


def expression_units_all():
    if 'mouth-open' not in _UNITS:
        _UNITS.update(expression_units())
    return _UNITS


_UNITS = {}


def paint_skin(mv, faces, fgroup, mk, margin, out, female, size=1024):
    """T7 : peau peinte (réalisme stylisé), à la place de la photo de peau MakeHuman. Fond presque blanc : la couleur
    de peau est celle de la personne (uSkinTone, multipliée dans le jeu) ; la texture ne porte que les nuances : joues, nez et oreilles rosés, lèvres, ligne de cils, sourcils nets, ombre de barbe
    légère pour les hommes. Chaque texel est peint d'après sa position 3D sur la tête (repères du maillage : yeux,
    bouche, bord des paupières, bout du nez), puis rangé dans l'îlot UV de la tête ; texel blanc dans le coin pour
    les vêtements."""
    import numpy as np
    fo = floor_off(mv, faces, fgroup)
    P = np.array(mv, dtype=np.float64) * S; P[:, 1] -= fo
    pos = np.zeros((size, size, 3)); cov = np.zeros((size, size), bool)
    for fi, (f, g) in enumerate(zip(faces, fgroup)):
        if g != 'body' or any(k < 0 for k in FUV[fi]):
            continue
        uv = [skin_uv(UVS[k]) for k in FUV[fi]]
        if not all(-0.01 <= c <= 1.01 for t in uv for c in t):
            continue
        for tri in (((0, 1, 2), (0, 2, 3)) if len(f) == 4 else ((0, 1, 2),)):
            a, b, c = (np.array(uv[t]) * size for t in tri)
            x0, x1 = int(max(0, min(a[0], b[0], c[0]) - 1)), int(min(size - 1, max(a[0], b[0], c[0]) + 1))
            y0, y1 = int(max(0, min(a[1], b[1], c[1]) - 1)), int(min(size - 1, max(a[1], b[1], c[1]) + 1))
            det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
            if x1 < x0 or y1 < y0 or abs(det) < 1e-12:
                continue
            xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            w0 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / det
            w1 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / det
            w2 = 1 - w0 - w1
            m = (w0 >= -0.03) & (w1 >= -0.03) & (w2 >= -0.03)
            p3 = w0[..., None] * P[f[tri[0]]] + w1[..., None] * P[f[tri[1]]] + w2[..., None] * P[f[tri[2]]]
            yy, xx = (ys[m] - 0.5).astype(int), (xs[m] - 0.5).astype(int)
            pos[yy, xx] = p3[m]; cov[yy, xx] = True
    for _ in range(12):                                                  # bords d'îlots étendus : aucun liseré au filtrage
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            sh, sc = np.roll(pos, (dy, dx), (0, 1)), np.roll(cov, (dy, dx), (0, 1))
            m = ~cov & sc; pos[m] = sh[m]; cov |= m
    X, Y, Z = pos[..., 0], pos[..., 1], pos[..., 2]
    ss = lambda e0, e1, x: np.clip((x - e0) / (e1 - e0), 0, 1) ** 2 * (3 - 2 * np.clip((x - e0) / (e1 - e0), 0, 1))
    col = np.empty((size, size, 3)); col[:] = (1.0, 0.96, 0.93)
    def mix(c, a):
        col[:] = col + (np.array(c) - col) * np.clip(a, 0, 1)[..., None]
    eL, eR, mo = mk['joint-l-eye'], mk['joint-r-eye'], mk['joint-mouth']
    hc = (mk['joint-head'] + mk['joint-head-2']) * 0.5
    mid = (eL.x + eR.x) / 2
    front = ss(hc.z - 0.01, hc.z + 0.03, Z)
    col *= (0.985 + 0.03 * (0.5 + 0.5 * np.sin(X * 90 + 1.3) * np.sin(Y * 70 + 0.7) * np.sin(Z * 80 + 2.1)))[..., None]
    body = [i for f, g in zip(faces, fgroup) if g == 'body' for i in f]
    nose_c = [i for i in set(body) if abs(P[i, 0] - mid) < 0.006 and mo.y + 0.012 < P[i, 1] < eL.y - 0.01]
    nose = P[max(nose_c, key=lambda i: P[i, 2])]
    mo = lip_line(P, body, mo)                                          # jonction des lèvres (le repère est dans la tête)
    for e in (eL, eR):                                                   # joues
        sx = 1 if e.x > mid else -1
        mix((0.98, 0.7, 0.68), (0.3 if female else 0.22) * front * np.exp(-((X - e.x - sx * 0.008) ** 2 + (Y - e.y + 0.036) ** 2) / (2 * 0.02 ** 2)))
    mix((0.98, 0.72, 0.68), 0.18 * np.exp(-((X - nose[0]) ** 2 + (Y - nose[1]) ** 2 + (Z - nose[2]) ** 2) / (2 * 0.012 ** 2)))   # bout du nez
    mix((0.98, 0.76, 0.72), 0.25 * ss(0.058, 0.072, np.abs(X - mid)) * np.exp(-(Y - eL.y + 0.01) ** 2 / (2 * 0.025 ** 2)))    # oreilles
    lw = 0.025 if female else 0.0235                                    # lèvres
    dx, dy = (X - mo.x) / lw, (Y - mo.y) / np.where(Y > mo.y, 0.0085, 0.0105)
    lip = ss(1.0, 0.7, dx ** 2 + dy ** 2) * (Z > mo.z - 0.015)
    mix((0.88, 0.52, 0.54) if female else (0.86, 0.62, 0.6), (0.7 if female else 0.55) * lip)
    col *= (1 - 0.25 * np.exp(-(Y - mo.y) ** 2 / (2 * 0.0012 ** 2)) * ss(1.2, 0.9, dx ** 2) * (Z > mo.z - 0.015))[..., None]   # fente de la bouche
    if not female:                                                      # ombre de barbe légère
        jaw = ss(nose[1] - 0.008, nose[1] - 0.016, Y) * ss(mo.y - 0.06, mo.y - 0.045, Y) * ss(0.065, 0.05, np.abs(X - mid)) * front
        mix((0.8, 0.74, 0.72), 0.16 * jaw * (1 - lip))
    for e, side in ((eL, 'l'), (eR, 'r')):
        near = (np.abs(X - e.x) < 0.035) & (np.abs(Y - e.y) < 0.03) & (Z > e.z - 0.02)
        R = P[margin[side]]
        up, lo = R[R[:, 1] > R[:, 1].mean() + 0.0005], R[R[:, 1] <= R[:, 1].mean() + 0.0005]
        q = pos[near]
        du = np.min(np.linalg.norm(q[:, None, :] - up[None], axis=2), axis=1) if len(up) else np.full(len(q), 1.0)
        dl = np.min(np.linalg.norm(q[:, None, :] - lo[None], axis=2), axis=1) if len(lo) else np.full(len(q), 1.0)
        a_up, a_lo = np.zeros(X.shape), np.zeros(X.shape)
        a_up[near] = ss(0.0032, 0.0012, du); a_lo[near] = ss(0.0024, 0.001, dl)
        mix((0.2, 0.13, 0.11), 0.85 * a_up)                             # ligne de cils
        mix((0.55, 0.4, 0.37), 0.35 * a_lo)
        mix((0.85, 0.72, 0.7), 0.12 * front * np.exp(-(X - e.x) ** 2 / (2 * 0.012 ** 2) - (Y - e.y + 0.014) ** 2 / (2 * 0.006 ** 2)))   # cerne léger
        if female:
            mix((0.85, 0.7, 0.68), 0.18 * front * np.exp(-(X - e.x) ** 2 / (2 * 0.012 ** 2) - (Y - e.y - 0.009) ** 2 / (2 * 0.006 ** 2)))
        sx = 1 if e.x > mid else -1                                     # sourcils : arc net, effilé vers l'extérieur
        by = 0.027 if female else 0.024                                  # hauteur des sourcils (plus bas chez les hommes)
        pts = [(e.x + (t - 2.4) * 0.0075 * sx, e.y + by + 0.004 * math.sin(t / 6 * math.pi) - 0.003 * (t / 6), t / 6) for t in [k * 0.5 for k in range(13)]]
        best, wid = np.full(X.shape, 1.0), np.full(X.shape, 0.004)
        for (ax, ay, ta), (bx, by, tb) in zip(pts, pts[1:]):
            vx, vy = bx - ax, by - ay
            t = np.clip(((X - ax) * vx + (Y - ay) * vy) / (vx * vx + vy * vy), 0, 1)
            d = np.hypot(X - ax - t * vx, Y - ay - t * vy)
            w = (0.0046 - 0.0024 * (ta + (tb - ta) * t)) * (0.8 if female else 1.0)
            better = d < best; best = np.where(better, d, best); wid = np.where(better, w, wid)
        brow = ss(wid, wid * 0.45, best) * (Z > e.z - 0.008) * front
        mix((0.3, 0.2, 0.15), 0.85 * brow * (0.9 + 0.1 * np.sin(X * sx * 1400 + Y * 900)))
    rgba = np.ones((size, size, 4)); rgba[..., :3] = np.clip(col, 0, 1)
    rgba[0:6, 0:6, :3] = 1.0
    im = bpy.data.images.new(os.path.basename(out), size, size)
    im.pixels.foreach_set(rgba.astype(np.float32).ravel()); im.filepath_raw = out; im.file_format = 'JPEG'
    bpy.context.scene.render.image_settings.quality = 90
    im.save()


EXPRESSIONS = {             # morph name: [(expression unit, weight)]
    'blink': [('eye-left-closure', 1.0), ('eye-right-closure', 1.0)],
    'smile': [('mouth-corner-puller', 0.9), ('mouth-elevation', 0.12), ('eye-left-slit', 0.22), ('eye-right-slit', 0.22)],
    'open': [('mouth-open', 1.0)],
    'brows': [('eyebrows-left-up', 1.0), ('eyebrows-right-up', 1.0)],
    'squint': [('eye-left-slit', 0.6), ('eye-right-slit', 0.6), ('eyebrows-left-down', 0.25), ('eyebrows-right-down', 0.25)],
    # T8 : composites liés au jeu (unités MakeHuman, CC0)
    'surprise': [('eye-left-opened-up', 0.7), ('eye-right-opened-up', 0.7), ('eyebrows-left-up', 0.8), ('eyebrows-right-up', 0.8), ('mouth-open', 0.22)],   # saut, habitant frôlé
    'sad': [('eyebrows-left-inner-up', 0.9), ('eyebrows-right-inner-up', 0.9), ('mouth-depression', 0.7)],   # mission échouée
    'effort': [('eyebrows-left-down', 0.7), ('eyebrows-right-down', 0.7), ('mouth-compression', 0.8), ('eye-left-slit', 0.35), ('eye-right-slit', 0.35), ('nose-left-elevation', 0.25), ('nose-right-elevation', 0.25)],   # schuss, montée en escalier
    'wince': [('eye-left-closure', 0.55), ('eye-right-closure', 0.55), ('nose-left-elevation', 0.8), ('nose-right-elevation', 0.8), ('mouth-retraction', 0.7), ('eyebrows-left-down', 0.6), ('eyebrows-right-down', 0.6)],   # chute
    'oo': [('mouth-pursing', 0.6), ('mouth-protusion', 0.5)],    # visèmes de parole
    'ee': [('mouth-retraction', 0.5), ('mouth-parling', 0.4)],
    'mm': [('mouth-compression', 0.6)],
}


def expression_units():
    units = {}
    for combo in EXPRESSIONS.values():
        for u, _ in combo:
            if u not in units:
                off = {}
                with gzip.open(os.path.join(DATA, 'targets', 'expression', 'units', 'caucasian', u + '.target.gz'), 'rt') as fh:
                    for line in fh:
                        if line.strip() and line[0] != '#':
                            i, x, y, z = line.split(); off[int(i)] = (float(x), float(y), float(z))
                units[u] = off
    return units


def protect_expressions(face):
    """vertex group 'expr' on everything the expressions move: decimation leaves eyelids, lips and brows intact"""
    moved = set()
    for off in expression_units().values():
        moved |= {i for i, d in off.items() if abs(d[0]) + abs(d[1]) + abs(d[2]) > 0.004}
    base = {int(k): v for k, v in face['skin_base'].items()}
    src = face.data.attributes['src']
    g = face.vertex_groups.new(name='expr')
    g.add([v.index for v in face.data.vertices if base.get(src.data[v.index].value) in moved], 1.0, 'REPLACE')
    # T7 : coutures de texture (un sommet, plusieurs coordonnées UV) gardées : la décimation qui les franchit étirait un
    # triangle à travers l'îlot UV (fente sombre au milieu du front)
    uv, seen = face.data.uv_layers.active.data, {}
    for loop in face.data.loops:
        seen.setdefault(loop.vertex_index, set()).add((round(uv[loop.index].uv[0], 4), round(uv[loop.index].uv[1], 4)))
    g.add([k for k, u in seen.items() if len(u) > 1], 1.0, 'REPLACE')


def add_expressions(face):
    """shape keys on the face mesh (after any vertex merge): each vertex finds its base-mesh vertex through 'src'"""
    units = expression_units()
    me = face.data
    base = {int(k): v for k, v in face['skin_base'].items()}
    src = me.attributes['src']
    face.shape_key_add(name='Basis', from_mix=False)
    for name, combo in EXPRESSIONS.items():
        sk = face.shape_key_add(name=name, from_mix=False)
        for v in me.vertices:
            bi = base.get(src.data[v.index].value)
            if bi is None:
                continue
            d = Vector((0, 0, 0))
            for u, w in combo:
                o = units[u].get(bi)
                if o:
                    d += Vector(o) * (w * S)
            if d.length > 0.0004:                  # sub-millimetre drift left out (keeps the morphs sparse)
                sk.data[v.index].co = v.co + G(d.x, d.y, d.z)


CAST = [   # the game varies jacket colour, skin tone and build per skier
    ('hm_male', 'male', 0.6, 0.5, (0.2, 0.2, 0.6), dict(jacket='#ffffff', pants='#24272e', accent='#c8ccd2', skin='light', helmet='#ffffff', lens='#d9772a', iris='#4a3524')),
    ('hm_female', 'female', 0.5, 0.42, (0.2, 0.2, 0.6), dict(jacket='#ffffff', pants='#2b2f38', accent='#c8ccd2', skin='light', helmet='#ffffff', lens='#5aa7d8', iris='#3d6a8e', long_hair=True)),
]


def main():
    assert DATA and os.path.exists(os.path.join(DATA, '3dobjs', 'base.obj')), 'set MH_DATA to the MakeHuman data folder'
    reset()
    verts, faces, fgroup = load_base()
    weights = load_weights()
    rnd = random.Random(7)
    skin_crop(faces, fgroup, weights)
    objs, rigs, info, gears = [], [], {}, []
    for name, g, mus, wei, eth, opts in CAST:
        mv0 = morph(verts, character(g, mus, wei, eth))
        mv = morph(mv0, stylise(g))
        margin = lid_margin(mv0, faces, fgroup)
        opts = dict(opts, eye_r=0.0122 * lid_radius(mv, margin) / lid_radius(mv0, margin))   # globes à la taille des paupières
        ob, ao, mk, gobs, face = build(name, mv, faces, fgroup, weights, opts, rnd)
        finish(ob, float(os.environ.get('HM_RATIO', '0.26')), protect='rim')
        ob.vertex_groups.remove(ob.vertex_groups['rim'])
        pants_through_jacket(ob, opts)
        protect_expressions(face)
        finish(face, float(os.environ.get('HM_FACE_RATIO', '0.6')), protect='expr')   # T7 : 0,6 (à 0,35, de longs triangles plissaient le front)
        face.vertex_groups.remove(face.vertex_groups['expr'])
        add_expressions(face)
        gobs.append(face)
        for go in gobs:
            if go.name.endswith(('_helmet', '_beanie', '_goggles', '_hair', '_gaiter')):
                finish(go, 1.0 if go.name.endswith(('_goggles', '_hair')) else 0.6 if go.name.endswith('_gaiter') else 0.45)   # mèches fines : pas de décimation   # T7 : bandeau du masque tracé à la bonne densité
        objs.append(ob); rigs.append(ao); gears += gobs
        paint_skin(mv, faces, fgroup, mk, margin, os.path.join(ASSETS_DIR, 'skin_%s.jpg' % g), g == 'female')
        print('STYLE', name, 'globe %.4f m' % opts['eye_r'])
        seg = lambda a, b: round((mk[a] - mk[b]).length, 3)
        info[name] = dict(thigh=seg('joint-l-upper-leg', 'joint-l-knee'), shin=seg('joint-l-knee', 'joint-l-ankle'),
                          upperarm=seg('joint-l-shoulder', 'joint-l-elbow'), forearm=seg('joint-l-elbow', 'joint-l-hand'),
                          hip_h=round(mk['joint-l-upper-leg'].y, 3), shoulder_w=round(abs(mk['joint-l-shoulder'].x - mk['joint-r-shoulder'].x), 3),
                          head_h=round(mk['joint-head'].y, 3), tris=tri_count([ob]))
    for i, (ob, ao) in enumerate(zip(objs, rigs)):
        ao.location.x = i * 2.0
    bake_ao_to_vertex_colors(objs + [o for o in gears if not o.name.endswith(('_eyes', '_pompom'))], samples=48, distance=0.12, strength=0.65, floor=0.4)
    for ao in rigs:
        ao.location.x = 0
    print('HUMANS', json.dumps(info))
    bpy.ops.object.select_all(action='DESELECT')
    for o_ in objs + gears:
        if 'src' in o_.data.attributes:
            o_.data.attributes.remove(o_.data.attributes['src'])
    bpy.ops.object.select_all(action='DESELECT')
    for o_ in rigs + objs + gears:
        o_.select_set(True)
    bpy.context.view_layer.objects.active = rigs[0]
    path = os.path.join(ASSETS_DIR, 'skiers_real.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_materials='NONE',
                              export_vertex_color='ACTIVE', export_normals=True, export_texcoords=True, export_yup=True,
                              export_animations=False, export_attributes=True, export_morph=True, export_morph_normal=False,
                              export_try_sparse_sk=True)
    print('wrote', path, os.path.getsize(path), 'bytes')


if __name__ == '__main__':
    main()
