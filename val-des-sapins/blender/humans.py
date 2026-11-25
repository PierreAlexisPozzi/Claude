"""Realistic skiers for Val des Sapins: MakeHuman bodies (CC0 data) dressed in modelled ski clothing.

Run:  MH_DATA=/path/to/mpfb/data  .bpyenv/bin/python blender/humans.py   ->  assets/skiers_real.glb

Only MakeHuman *data* is read, by this script's own parsers (no MakeHuman / MPFB code is run):
  3dobjs/base.obj                                  base mesh, CC0 (header: released as CC0 in September 2020)
  targets/macrodetails/*.target.gz                 gender / age / ethnicity / muscle / weight morphs (MakeHuman CC0 release)
  rigs/standard/weights.game_engine.json           skin weights, "license": "CC0"
The skeleton is this script's own (bones between the base mesh's joint markers), named like the weight file so the
weights apply; finger, thumb and toe weights are folded into the hand and the foot.

Each character is one skinned mesh: the head and neck (skin), a quilted ski jacket with a high collar and a hem that
hangs over the hips, straight ski trousers that fall to the boot, gloves. Everything under the clothes is removed.
Vertex colours carry the colours and baked AO; a '_tint' attribute (1 on the jacket's main panels) lets the game
recolour jackets per skier. Helmet, goggles, boots, skis and poles stay the game's rigid pieces.

Game frame: x right, y up, +z forward (MakeHuman faces +z already), metres, feet on y = 0.
"""
import gzip, json, math, os, random
import bpy, bmesh
from mathutils import Vector, Matrix
from vds_common import reset, hexrgb, bake_ao_to_vertex_colors, export_glb, tri_count, srgb2lin

DATA = os.environ.get('MH_DATA', '')
SKINS = os.environ.get('MH_SKINS', '')       # MakeHuman system assets 'skins' folder (CC0)
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
    with gzip.open(os.path.join(DATA, 'targets', 'macrodetails', name + '.target.gz'), 'rt') as f:
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


def character(gender, muscle, weight, eth):
    """gender 'male'/'female'; muscle, weight in 0..1 (0.5 = average); eth = (african, asian, caucasian) summing to 1."""
    spec = []
    for mk, mw in (('minmuscle', max(0, 0.5 - muscle) * 2), ('averagemuscle', 1 - abs(muscle - 0.5) * 2), ('maxmuscle', max(0, muscle - 0.5) * 2)):
        for wk, ww in (('minweight', max(0, 0.5 - weight) * 2), ('averageweight', 1 - abs(weight - 0.5) * 2), ('maxweight', max(0, weight - 0.5) * 2)):
            spec.append(('universal-%s-young-%s-%s' % (gender, mk, wk), mw * ww))
    for race, w in zip(('african', 'asian', 'caucasian'), eth):
        spec.append(('%s-%s-young' % (race, gender), w))
    return spec


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
    if dom.startswith('hand'):
        return 'glove'
    if dom.startswith('foot'):
        return 'boot'
    hem = hip_y - 0.06
    if dom.startswith(('thigh', 'calf', 'pelvis')):
        return 'both' if y > hem else 'pants'
    return 'jacket'


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
    reg = {i: region(dom[i], weights.get(i, {}), V[i].y, hip_y, chin_y, None) for i in used}

    JK, PT, GL, SK = hexrgb(opts['jacket']), hexrgb(opts['pants']), hexrgb('#1b1d22'), hexrgb(SKIN_TONES[opts['skin']])
    ACC = hexrgb(opts['accent'])
    verts_out, cols, tints, wout, polys, fcol, psrc, skin_base = [], [], [], [], [], [], [], {}

    def add_shell(kind, offset_fn, col_fn, tint_fn):
        idx, start = {}, len(polys)
        for f in body:
            kinds = set()
            for i in f:
                kinds |= {'jacket', 'pants'} if reg[i] == 'both' else {reg[i]}
            if kind not in kinds:                 # boundary faces go to both garments: they overlap, never gap
                continue
            ids = []
            for i in f:
                if i not in idx:
                    idx[i] = len(verts_out)
                    if kind == 'skin':
                        skin_base[len(verts_out)] = i
                    p = V[i] + nrm[i] * offset_fn(i)
                    verts_out.append(p); cols.append(col_fn(i, p)); tints.append(tint_fn(i, p)); wout.append(weights.get(i, {'pelvis': 1.0}))
                ids.append(idx[i])
            polys.append(ids); psrc.append((kind, faces_index[id(f)]))
            fcol.append(col_fn(max(f, key=lambda i: V[i].y if kind == 'skin' else 0), sum((V[i] for i in f), Vector()) / len(f)))

    # quilted jacket: baffles across the torso and sleeves, hem flared over the hips, high collar
    def j_off(i):
        p, d = V[i], dom[i]
        base = 0.034 if d.startswith(('spine', 'pelvis', 'clavicle')) else 0.026 if d.startswith('upperarm') else 0.022
        if d == 'neck_01':
            base = 0.03                                                           # stand-up collar
        if d.startswith(('pelvis', 'thigh')):
            base = 0.042 + 0.012 * max(0.0, min(1.0, (hip_y + 0.04 - p.y) / 0.1))  # hem sits just clear of the hips
        quilt = 0.006 * abs(math.sin((p.y if d.startswith(('spine', 'pelvis')) else (p - mk['joint-l-shoulder']).length * 1.6) * math.pi / 0.11))
        return base + quilt

    def j_col(i, p):
        d = dom[i]
        return JK

    def j_tint(i, p):
        c = j_col(i, p)
        return 1.0 if c == JK else 0.0

    add_shell('jacket', j_off, j_col, j_tint)

    # trousers: straight legs from hip to boot (below the knee the shell becomes a cylinder around the leg axis)
    def p_off(i):
        p, d = V[i], dom[i]
        o = 0.026
        if d.startswith('calf'):
            s = 'l' if d.endswith('_l') else 'r'
            k, a = mk['joint-%s-knee' % s], mk['joint-%s-ankle' % s]
            t = max(0.0, min(1.0, (k.y - p.y) / max(0.05, k.y - a.y)))
            axis = k.lerp(a, t)
            r = (Vector((p.x, 0, p.z)) - Vector((axis.x, 0, axis.z))).length
            want = 0.085 + 0.012 * t                                              # flares a little over the boot
            o = max(0.02, want - r)
        if d.startswith('thigh'):
            o = 0.03
        return o + 0.004 * abs(math.sin(p.y * math.pi / 0.07)) * (1 if dom[i].startswith('thigh') else 0.4)
    add_shell('pants', p_off, lambda i, p: PT if p.y > 0.16 else hexrgb('#16181c'), lambda i, p: 0.0)
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

    sp_b, sp_c = mk['SPINE_B'], mk['SPINE_C']
    upper = lambda p: W(spine_03=0.7, spine_02=0.3) if p.y > sp_c.y - 0.05 else W(spine_02=0.7, spine_01=0.3)
    # rolled hood behind the collar
    hc = Vector((neck.x, neck.y - 0.03, neck.z - 0.005))
    rx = abs(mk['joint-l-clavicle'].x - mk['joint-r-clavicle'].x) * 0.62
    hood = [hc + Vector((rx * math.sin(a), 0.012 * math.cos(a * 2), -abs(rx * 0.95 * math.cos(a)) - 0.035)) for a in (math.radians(v) for v in range(-100, 101, 10))]
    add_tube(hood, 0.038, JK, lambda p: W(spine_03=0.6, neck_01=0.4), tint=1.0, sides=10)
    # back protector pack and straps
    top_y, bot_y = sp_c.y + 0.02, sp_b.y - 0.1
    pb, pn = surf(0.0, (top_y + bot_y) / 2, -1)
    add_box(pb, Vector((0, 0, -1)), Vector((0, 1, 0)), (0.27, top_y - bot_y, 0.085), hexrgb('#1c1f25'), W(spine_02=0.5, spine_03=0.5))
    add_box(pb + Vector((0, 0.03, -0.088)), Vector((0, 0, -1)), Vector((0, 1, 0)), (0.18, 0.12, 0.012), hexrgb(opts['accent']), W(spine_02=0.5, spine_03=0.5))
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

    def gear(name, sel, offset, colf, tintf, smooth_it, rim=0.0, rim_col=None):
        """a skinned shell (weights head = 1) over the selected head faces, smoothed, with an optional rim band"""
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
        if rim:
            from collections import Counter
            ec = Counter(tuple(sorted((a, b))) for p in P['p'] for a, b in zip(p, p[1:] + p[:1]))
            for p, fcl in list(zip(P['p'], P['fc'])):
                for a, b in zip(p, p[1:] + p[:1]):
                    if ec[tuple(sorted((a, b)))] == 1:            # open border: fold a rim back to the head
                        src = {v: k for k, v in idx.items()}
                        ia, ib = src[a], src[b]
                        na, nb = len(P['v']), len(P['v']) + 1
                        P['v'] += [V[ia] + nrm[ia] * rim, V[ib] + nrm[ib] * rim]; P['t'] += [P['t'][a], P['t'][b]]
                        P['p'].append([b, a, na, nb]); P['fc'].append(rim_col or hexrgb('#1a1c21'))
        P['smooth'] = smooth_it
        return P

    HC, LENS = hexrgb(opts.get('helmet', '#f1f3f5')), hexrgb(opts.get('lens', '#d9772a'))
    hl = lambda i: line(i, 0.034, -0.03, -0.065)
    def h_col(f):
        c = sum((V[i] for i in f), Vector()) / len(f)
        top = (c - head_c)
        if c.y > eye_y + 0.06 and abs(abs(c.x - head_c.x) - 0.028) < 0.009 and -0.05 < top.z < 0.06:
            return hexrgb('#24272d')                                                  # vents
        if abs(c.y - (eye_y + 0.012)) < 0.016 and hdir(f[0]).z < 0.25:
            return hexrgb('#16181c')                                                  # goggle strap
        return HC
    helmet = gear('helmet', lambda i: V[i].y >= hl(i), lambda i: 0.024, h_col, lambda i: 3.0, 10, rim=0.004)
    # goggles: a band over the eyes, proud of the face, lens across the front
    gl = lambda i: abs(V[i].y - (eye_y + 0.004)) < 0.032 and hdir(i).z > 0.05
    def g_col(f):
        c = sum((V[i] for i in f), Vector()) / len(f)
        return LENS if abs(c.x - head_c.x) < 0.072 and abs(c.y - (eye_y + 0.004)) < 0.022 else hexrgb('#16181c')
    goggles = gear('goggles', gl, lambda i: 0.02 + 0.008 * max(0.0, hdir(i).z), g_col, lambda i: 0.0, 4, rim=0.003)
    # beanie for people in town: rib-knit cuff, pompom
    bl = lambda i: line(i, 0.062, 0.002, -0.04)
    def b_col(f):
        c = sum((V[i] for i in f), Vector()) / len(f)
        a = math.atan2(c.x - head_c.x, c.z - head_c.z)
        cuff = c.y < bl(f[0]) + 0.04
        return (0.78, 0.78, 0.78) if cuff and int((a + 4) * 26) % 2 else (1.0, 1.0, 1.0)
    beanie = gear('beanie', lambda i: V[i].y >= bl(i), lambda i: 0.019 + (0.006 if V[i].y < bl(i) + 0.04 else 0.0), b_col, lambda i: 4.0, 1, rim=0.004, rim_col=(0.78, 0.78, 0.78))
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
    # eyes for faces without goggles: eyeballs in the sockets, iris and pupil facing forward
    eyes = {'v': [], 't': [], 'p': [], 'fc': [], 'smooth': 0}
    for s_ in ('l', 'r'):
        c = mk['joint-%s-eye' % s_]
        base = len(eyes['v'])
        for a in range(9):
            for b in range(14):
                la, lo = -math.pi / 2 + math.pi * a / 8, 2 * math.pi * b / 14
                eyes['v'].append(c + Vector((math.cos(la) * math.sin(lo), math.sin(la), math.cos(la) * math.cos(lo))) * 0.0122); eyes['t'].append(0.0)
        for a in range(8):
            for b in range(14):
                b1 = (b + 1) % 14
                q = [base + a * 14 + b, base + a * 14 + b1, base + (a + 1) * 14 + b1, base + (a + 1) * 14 + b]
                cz = sum((eyes['v'][k] - c).normalized().z for k in q) / 4
                eyes['p'].append(q); eyes['fc'].append(hexrgb('#0c0c0e') if cz > 0.95 else hexrgb(opts.get('iris', '#5a3a22')) if cz > 0.82 else hexrgb('#ece6dc'))
    gear_parts = {'helmet': helmet, 'goggles': goggles, 'beanie': beanie, 'pompom': pom, 'eyes': eyes}

    # ---- mesh + armature
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(G(p.x, p.y, p.z)) for p in verts_out], [], polys)
    me.update()
    psrc_v = ['extra'] * len(verts_out)
    for p, (kind, fi) in zip(polys, psrc):
        if kind != 'extra':
            for v in p: psrc_v[v] = 'shell'
    bm = bmesh.new(); bm.from_mesh(me)
    hem_y = hip_y - 0.065
    for e in bm.edges:
        if e.is_boundary:
            for v in e.verts:
                if v.index < len(tints) and tints[v.index] == 1.0 and v.co.z < hip_y + 0.02:   # Blender z = game y
                    v.co.z = hem_y
    cloth = [v for v in bm.verts if v.index < len(tints) and wout[v.index].get('head', 0) < 0.5 and tints[v.index] != 2.0 and psrc_v[v.index] == 'shell']
    for _ in range(6):
        bmesh.ops.smooth_vert(bm, verts=cloth, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
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
    # ---- head gear meshes on the same rig
    gobs = []
    for gname, P in gear_parts.items():
        gm = bpy.data.meshes.new(name + '_' + gname)
        gm.from_pydata([tuple(G(p.x, p.y, p.z)) for p in P['v']], [], P['p']); gm.update()
        if P['smooth']:
            bm = bmesh.new(); bm.from_mesh(gm)
            for _ in range(P['smooth']):
                bmesh.ops.smooth_vert(bm, verts=bm.verts, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            bm.to_mesh(gm); bm.free(); gm.update()
        ca = gm.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
        for poly in gm.polygons:
            c = P['fc'][poly.index]
            for li in poly.loop_indices:
                ca.data[li].color = (srgb2lin(c[0]), srgb2lin(c[1]), srgb2lin(c[2]), 1.0)
        gm.color_attributes.active_color = ca
        ta = gm.attributes.new('_tint', 'FLOAT', 'POINT')
        for k, t in enumerate(P['t']):
            ta.data[k].value = t
        for p in gm.polygons:
            p.use_smooth = True
        go = bpy.data.objects.new(name + '_' + gname, gm); bpy.context.scene.collection.objects.link(go)
        go.vertex_groups.new(name='head').add(list(range(len(P['v']))), 1.0, 'REPLACE')
        go.parent = ao; m2 = go.modifiers.new('arm', 'ARMATURE'); m2.object = ao
        gobs.append(go)
    return ob, ao, mk, gobs, face


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


def skin_texture(src, out, brows, size=512):
    """crop the head island of a MakeHuman skin (CC0) to size x size, paint eyebrows, white corner texel"""
    import numpy as np
    img = bpy.data.images.load(src)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(h, w, 4)   # row 0 = bottom (v = 0)
    u0, v0, u1, v1 = CROP['box']
    ys = np.clip(((v0 + (v1 - v0) * (np.arange(size) + 0.5) / size) * h).astype(int), 0, h - 1)
    xs = np.clip(((u0 + (u1 - u0) * (np.arange(size) + 0.5) / size) * w).astype(int), 0, w - 1)
    out_px = px[ys][:, xs].copy()
    for (bu, bv), r, dark in brows:                                   # eyebrows: soft dark dabs along the brow line
        cx, cy = (bu - u0) / (u1 - u0) * size, (bv - v0) / (v1 - v0) * size
        yy, xx = np.mgrid[0:size, 0:size]
        a = np.clip(1 - (((xx - cx) * 1.8) ** 2 + (yy - cy) ** 2) / (r * r), 0, 1) * dark   # the face lies sideways in the MakeHuman layout
        out_px[..., :3] *= (1 - a[..., None] * 0.72)
    out_px[0:6, 0:6, :3] = 1.0
    im = bpy.data.images.new(os.path.basename(out), size, size)
    im.pixels.foreach_set(out_px.ravel()); im.filepath_raw = out; im.file_format = 'JPEG'
    bpy.context.scene.render.image_settings.quality = 86
    im.save()


EXPRESSIONS = {             # morph name: [(expression unit, weight)]
    'blink': [('eye-left-closure', 1.0), ('eye-right-closure', 1.0)],
    'smile': [('mouth-corner-puller', 0.9), ('mouth-elevation', 0.12), ('eye-left-slit', 0.22), ('eye-right-slit', 0.22)],
    'open': [('mouth-open', 1.0)],
    'brows': [('eyebrows-left-up', 1.0), ('eyebrows-right-up', 1.0)],
    'squint': [('eye-left-slit', 0.6), ('eye-right-slit', 0.6), ('eyebrows-left-down', 0.25), ('eyebrows-right-down', 0.25)],
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
    ('hm_male', 'male', 0.6, 0.5, (0.2, 0.2, 0.6), dict(jacket='#ffffff', pants='#24272e', accent='#c8ccd2', skin='light', helmet='#ffffff', lens='#d9772a', iris='#4a3524',
                                                     skin_tex='young_caucasian_male/young_lightskinned_male_diffuse.png')),
    ('hm_female', 'female', 0.5, 0.42, (0.2, 0.2, 0.6), dict(jacket='#ffffff', pants='#2b2f38', accent='#c8ccd2', skin='light', helmet='#ffffff', lens='#5aa7d8', iris='#3d6a8e',
                                                         skin_tex='young_caucasian_female2/young_lightskinned_female_diffuse2.png')),
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
        mv = morph(verts, character(g, mus, wei, eth))
        ob, ao, mk, gobs, face = build(name, mv, faces, fgroup, weights, opts, rnd)
        finish(ob, float(os.environ.get('HM_RATIO', '0.5')))
        protect_expressions(face)
        finish(face, float(os.environ.get('HM_FACE_RATIO', '0.35')), protect='expr')
        face.vertex_groups.remove(face.vertex_groups['expr'])
        add_expressions(face)
        gobs.append(face)
        for go in gobs:
            if go.name.endswith(('_helmet', '_beanie', '_goggles')):
                finish(go, 0.3 if go.name.endswith('_goggles') else 0.45)
        objs.append(ob); rigs.append(ao); gears += gobs
        # eyebrows: points of the base mesh just above each eye, in UV space
        brows = []
        for s_ in ('l', 'r'):
            e = mk['joint-%s-eye' % s_]
            for t in [k * 0.5 for k in range(13)]:
                x = e.x + (t - 2.4) * 0.0075 * (1 if e.x > 0 else -1)   # inner end clear of the nose bridge
                y = e.y + 0.029 + 0.004 * math.sin(t / 6 * math.pi) - 0.003 * (t / 6)
                best, bd = None, 1e9
                for fi, (f, gg) in enumerate(zip(faces, fgroup)):
                    if gg != 'body':
                        continue
                    for j, i in enumerate(f):
                        p = Vector(mv[i]) * S
                        if p.z < e.z - 0.01:
                            continue
                        d = (p.x - x) ** 2 + (p.y - floor_off(mv, faces, fgroup) - y) ** 2
                        if d < bd and FUV[fi][j] >= 0:
                            bd, best = d, UVS[FUV[fi][j]]
                brows.append((best, 9.0 - abs(t - 2.6) * 0.9, 0.8))
        skin_texture(os.path.join(SKINS, opts['skin_tex']), os.path.join(ASSETS_DIR, 'skin_%s.jpg' % g), brows)
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
