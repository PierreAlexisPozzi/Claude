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
S = 0.1                                   # MakeHuman decimetres -> metres


def G(x, y, z):
    return Vector((x, -z, y))


# ----------------------------------------------------------------------------------------------------- data
def load_base():
    verts, faces, fgroup, cur = [], [], [], None
    for line in open(os.path.join(DATA, '3dobjs', 'base.obj')):
        if line.startswith('v '):
            verts.append([float(t) for t in line.split()[1:4]])
        elif line.startswith('g '):
            cur = line.split()[1]
        elif line.startswith('f '):
            faces.append([int(p.split('/')[0]) - 1 for p in line.split()[1:]])
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
    verts_out, cols, tints, wout, polys, fcol = [], [], [], [], [], []

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
                    p = V[i] + nrm[i] * offset_fn(i)
                    verts_out.append(p); cols.append(col_fn(i, p)); tints.append(tint_fn(i, p)); wout.append(weights.get(i, {'pelvis': 1.0}))
                ids.append(idx[i])
            polys.append(ids)
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
    add_shell('glove', lambda i: 0.012, lambda i, p: GL, lambda i, p: 0.0)
    add_shell('skin', lambda i: 0.0, lambda i, p: SK, lambda i, p: 2.0)

    # helmet shell, goggles and strap: rigid on the head (weights 'head' = 1)
    head_c = (mk['joint-head'] + mk['joint-head-2']) * 0.5
    eye_y = (mk['joint-l-eye'].y + mk['joint-r-eye'].y) * 0.5
    eye_z = max(mk['joint-l-eye'].z, mk['joint-r-eye'].z)
    HC, GF, GL_ = hexrgb(opts.get('helmet', '#f1f3f5')), hexrgb('#16181c'), hexrgb(opts.get('lens', '#d9772a'))
    def ring_cap(c, rx, ry, rz, lat0, lat1, n_lat, n_lon, colf, front_cut=None):
        rows = []
        for a in range(n_lat + 1):
            la = lat0 + (lat1 - lat0) * a / n_lat
            row = []
            for b in range(n_lon):
                lo = b / n_lon * 2 * math.pi
                x, z = math.sin(lo), math.cos(lo)
                l2 = la if front_cut is None else la + front_cut * max(0.0, z) ** 2     # brow line higher at the front
                p = Vector((c.x + rx * math.cos(l2) * x, c.y + ry * math.sin(l2), c.z + rz * math.cos(l2) * z))
                row.append(len(verts_out)); verts_out.append(p); cols.append(colf(p)); tints.append(0.0); wout.append({'head': 1.0})
            rows.append(row)
        for a in range(n_lat):
            for b in range(n_lon):
                b1 = (b + 1) % n_lon
                polys.append([rows[a][b], rows[a][b1], rows[a + 1][b1], rows[a + 1][b]])
                fcol.append(cols[rows[a][b]])
    hr = abs(mk['joint-l-eye'].x - mk['joint-r-eye'].x) * 1.95 + 0.02
    ring_cap(head_c + Vector((0, 0.005, -0.012)), hr * 0.98, 0.15, hr * 1.08, math.radians(-30), math.radians(90), 8, 28,
             lambda p: HC, front_cut=math.radians(38))
    # goggle band (frame) and lens across the front
    gc = Vector((head_c.x, eye_y + 0.004, head_c.z - 0.012))
    rzg = (eye_z + 0.04) - gc.z
    for (yy, rr, colf, a0, a1) in ((0.0, 1.0, lambda p: GF, -1.0, 1.0), (0.0, 1.02, lambda p: GL_, -0.55, 0.55)):
        rows = []
        for k, dy in enumerate((-0.034, 0.034)):
            row = []
            for b in range(15):
                lo = a0 + (a1 - a0) * b / 14
                p = Vector((gc.x + hr * 0.96 * rr * math.sin(lo * math.pi / 2), gc.y + dy * (0.8 if rr > 1 else 1), gc.z + rzg * rr * math.cos(lo * math.pi / 2)))
                row.append(len(verts_out)); verts_out.append(p); cols.append(colf(p)); tints.append(0.0); wout.append({'head': 1.0})
            rows.append(row)
        for b in range(14):
            polys.append([rows[0][b], rows[0][b + 1], rows[1][b + 1], rows[1][b]]); fcol.append(colf(None))

    # ---- mesh + armature
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(G(p.x, p.y, p.z)) for p in verts_out], [], polys)
    me.update()
    bm = bmesh.new(); bm.from_mesh(me)
    hem_y = hip_y - 0.065
    for e in bm.edges:
        if e.is_boundary:
            for v in e.verts:
                if v.index < len(tints) and tints[v.index] == 1.0 and v.co.z < hip_y + 0.02:   # Blender z = game y
                    v.co.z = hem_y
    cloth = [v for v in bm.verts if v.index < len(tints) and wout[v.index].get('head', 0) < 0.5 and cols[v.index] != SK]
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
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)

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
    for bn, *_ in BONES:
        ob.vertex_groups.new(name=bn)
    for k, wd in enumerate(wout):
        tot = sum(wd.values()) or 1
        for bn, x in sorted(wd.items(), key=lambda kv: -kv[1])[:4]:
            if bn in ob.vertex_groups:
                ob.vertex_groups[bn].add([k], x / tot, 'REPLACE')
    ob.parent = ao
    mod = ob.modifiers.new('arm', 'ARMATURE'); mod.object = ao
    return ob, ao, mk


def finish(ob, ratio):
    import bmesh as bm_
    bpy.context.view_layer.objects.active = ob
    bm = bm_.new(); bm.from_mesh(ob.data)
    bm_.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bm_.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data); bm.free()
    ob.data.color_attributes.active_color = ob.data.color_attributes['Color']
    if ratio < 1:
        d = ob.modifiers.new('dec', 'DECIMATE'); d.ratio = ratio
        bpy.ops.object.modifier_move_to_index(modifier='dec', index=0)
        bpy.ops.object.modifier_apply(modifier='dec')


CAST = [   # the game varies jacket colour, skin tone and build per skier
    ('hm_male', 'male', 0.6, 0.5, (0.2, 0.2, 0.6), dict(jacket='#ffffff', pants='#24272e', accent='#1d2027', skin='light', helmet='#f1f3f5', lens='#d9772a')),
    ('hm_female', 'female', 0.5, 0.42, (0.2, 0.2, 0.6), dict(jacket='#ffffff', pants='#2b2f38', accent='#e9edf2', skin='light', helmet='#2b2f38', lens='#5aa7d8')),
]


def main():
    assert DATA and os.path.exists(os.path.join(DATA, '3dobjs', 'base.obj')), 'set MH_DATA to the MakeHuman data folder'
    reset()
    verts, faces, fgroup = load_base()
    weights = load_weights()
    rnd = random.Random(7)
    objs, rigs, info = [], [], {}
    for name, g, mus, wei, eth, opts in CAST:
        mv = morph(verts, character(g, mus, wei, eth))
        ob, ao, mk = build(name, mv, faces, fgroup, weights, opts, rnd)
        finish(ob, float(os.environ.get('HM_RATIO', '0.5')))
        objs.append(ob); rigs.append(ao)
        seg = lambda a, b: round((mk[a] - mk[b]).length, 3)
        info[name] = dict(thigh=seg('joint-l-upper-leg', 'joint-l-knee'), shin=seg('joint-l-knee', 'joint-l-ankle'),
                          upperarm=seg('joint-l-shoulder', 'joint-l-elbow'), forearm=seg('joint-l-elbow', 'joint-l-hand'),
                          hip_h=round(mk['joint-l-upper-leg'].y, 3), shoulder_w=round(abs(mk['joint-l-shoulder'].x - mk['joint-r-shoulder'].x), 3),
                          head_h=round(mk['joint-head'].y, 3), tris=tri_count([ob]))
    for i, (ob, ao) in enumerate(zip(objs, rigs)):
        ao.location.x = i * 2.0
    bake_ao_to_vertex_colors(objs, samples=48, distance=0.12, strength=0.65, floor=0.4)
    for ao in rigs:
        ao.location.x = 0
    print('HUMANS', json.dumps(info))
    bpy.ops.object.select_all(action='DESELECT')
    export_glb(rigs + objs, 'skiers_real.glb')


if __name__ == '__main__':
    main()
