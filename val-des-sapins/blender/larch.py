"""European larch (Larix decidua) in winter, for Val des Sapins (tranche T8).

The larch is the only conifer of the Alps that sheds its needles: in winter it stands bare, grey-brown, with
pendulous twigs studded with short shoots (spurs) and a few small cones. Generic botany, no reference model copied.

Outputs (val-des-sapins/assets):
- larch_twigs.png    512x512 atlas, same layout as spruce_needles.png: band 0 = bare twig spray, band 1 = the same
                     spray dusted with snow, top strip = opaque white (trunk and snow take their colour from the vertices).
- larch_near.glb     two tree variants (larch_0, larch_1), ~2.5k triangles each: tall straight trunk, sparse branches
                     rising then drooping at the tip, flat twig sprays on top, hanging twig curtains below, thin snow;
                     Cycles ambient occlusion baked into the vertex colours.
- conifer_far.glb    the distant silhouette shared by both species: the spruce silhouette of blender/trees.py (same
                     vertices, same colours) with a shape key 'larch' and a '_col2' colour attribute, so the game draws
                     either species from one instanced mesh, chosen per instance (no extra draw call).

Run: python blender/larch.py   (with bpy==5.3.0 installed); spruce outputs of trees.py are left untouched.
"""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, numpy as np
from mathutils import Vector
from vds_common import reset, MeshBuilder, tube, hexrgb, jitter, bake_ao_to_vertex_colors, export_glb, tri_count, ASSETS
import trees
from trees import TEX_W, TEX_H, SPRAY_H, V_PLAIN, V_SNOWY, UV_WHITE, dilate


# ------------------------------------------------------------------ twig sprays (texture)
def twig_scene(seed, snowy):
    """A bare larch branchlet lying in the XY plane, base at x=0, tip at x=2, seen from above (+Z)."""
    rnd = random.Random(seed)
    mb = MeshBuilder()
    BARK = [hexrgb(h) for h in ('#625446', '#6d5e50', '#594c40', '#776655')]
    YOUNG = [hexrgb(h) for h in ('#86653f', '#927047', '#7a5c3b')]       # last year's long shoots: warm yellow-brown
    SPUR, BUD = hexrgb('#3f3128'), hexrgb('#94785a')
    CONE = hexrgb('#6a4a30')
    SNOW = hexrgb('#f4f7fb')

    def twig(path, w0, w1, cols, z):
        """a tapering strip along a polyline, facing the camera"""
        n = len(path)
        left, right = [], []
        for i, p in enumerate(path):
            a = path[max(0, i - 1)]; b = path[min(n - 1, i + 1)]
            d = (b - a).normalized(); s = Vector((-d.y, d.x, 0))
            w = w0 + (w1 - w0) * i / (n - 1)
            left.append(mb.vert(Vector((p.x, p.y, z)) + s * w)); right.append(mb.vert(Vector((p.x, p.y, z)) - s * w))
        for i in range(n - 1):
            mb.face((left[i], right[i], right[i + 1], left[i + 1]), col=cols[min(i, len(cols) - 1)])

    def spur(p, r, z):
        """a short shoot seen from above: a dark knob ringed with old needle scars, a pale bud in the middle"""
        n = 7
        ring = [mb.vert(Vector((p.x + math.cos(k / n * 6.283) * r, p.y + math.sin(k / n * 6.283) * r, z))) for k in range(n)]
        ctr = mb.vert(Vector((p.x, p.y, z + 0.001)))
        for k in range(n):
            mb.face((ctr, ring[k], ring[(k + 1) % n]), col=[BUD, jitter(SPUR, 0.15, rnd), jitter(SPUR, 0.15, rnd)])

    def shoot(base, ang, length, width, z, order):
        """a long shoot, slightly wavy, with spurs along it; side shoots of the next order"""
        n = max(3, int(length / 0.06) + 1)
        pts, a = [], ang
        for i in range(n):
            t = i / (n - 1)
            a += rnd.uniform(-0.12, 0.12)
            pts.append(base + Vector((math.cos(a), math.sin(a), 0)) * length * t if i == 0 else pts[-1] + Vector((math.cos(a), math.sin(a), 0)) * length / (n - 1))
        cols = [jitter(rnd.choice(YOUNG if order and t > 0.5 else BARK), 0.1, rnd) for t in np.linspace(0, 1, n)]
        twig(pts, width, width * 0.35, cols, z)
        # spurs every 3-5 cm, alternating sides
        s = 0.03
        while s < length - 0.02:
            k = min(n - 2, int(s / length * (n - 1))); f = s / length * (n - 1) - k
            p = pts[k].lerp(pts[k + 1], f)
            d = (pts[k + 1] - pts[k]).normalized(); side = Vector((-d.y, d.x, 0)) * width * rnd.choice((-1, 1)) * 0.9
            spur(p + side, rnd.uniform(0.008, 0.013) * (1.0 if order < 2 else 0.8), z + 0.002)
            s += rnd.uniform(0.03, 0.05)
        return pts

    L = 2.0
    axis = shoot(Vector((0, 0, 0)), 0.0, L, 0.021, 0.02, 0)
    side, x = 1, 0.08
    forks, twigs = [], []
    while x < L - 0.1:
        t = x / L
        ln = (0.36 + 0.26 * math.sin(math.pi * min(1, t * 1.1))) * rnd.uniform(0.8, 1.1) * (1 - 0.4 * t)
        ang = math.radians(rnd.uniform(34, 56)) * side
        k = min(len(axis) - 2, int(t * (len(axis) - 1)))
        b = axis[k]
        pts = shoot(b, ang, ln, 0.012, 0.015, 1)
        forks.append(b); twigs.append(pts)
        # third-order shoots: most side shoots fork once or twice, the twigs hang in a fine fan
        for j in range(rnd.choice((1, 2, 2, 3)) if ln > 0.22 else 0):
            u = rnd.uniform(0.25, 0.75); q = pts[int(u * (len(pts) - 1))]
            a3 = ang + math.radians(rnd.uniform(28, 48)) * (1 if (j + (side > 0)) % 2 else -1)
            shoot(q, a3, ln * rnd.uniform(0.35, 0.55) * (1.1 - u * 0.5), 0.0085, 0.012, 2)
        x += rnd.uniform(0.05, 0.085)
        side = -side
    # a few small cones, upright on the upper side of the twigs (seen from above: ovals with scale rings)
    for i in range(rnd.randint(2, 4)):
        c = axis[rnd.randint(3, len(axis) - 4)] + Vector((0, rnd.uniform(-0.06, 0.06), 0.03))
        for j, (rx, ry, col) in enumerate(((0.034, 0.025, CONE), (0.024, 0.017, hexrgb('#8a6440')), (0.012, 0.009, hexrgb('#5a3e28')))):
            n = 10
            ring = [mb.vert(c + Vector((math.cos(k / n * 6.283) * rx, math.sin(k / n * 6.283) * ry, 0.001 * j))) for k in range(n)]
            ctr = mb.vert(c + Vector((0, 0, 0.001 * j)))
            for k in range(n):
                mb.face((ctr, ring[k], ring[(k + 1) % n]), col=jitter(col, 0.08, rnd))
    if snowy:
        # snow lies on bare twigs as broken thin ridges along the thicker shoots and small clumps in the forks
        for k in range(0, len(axis) - 1):
            if rnd.random() < 0.6:
                twig([axis[k], axis[k + 1]], rnd.uniform(0.006, 0.011), 0.005, [jitter(SNOW, 0.03, rnd)], 0.05)
        for pts in twigs:
            if rnd.random() < 0.35:
                k = rnd.randint(0, max(0, len(pts) // 2 - 1))
                twig(pts[k:k + 2], 0.006, 0.004, [jitter(SNOW, 0.03, rnd)], 0.05)
        for b in forks:
            if rnd.random() < 0.45:
                r = rnd.uniform(0.016, 0.03); n = 8; c = b + Vector((rnd.uniform(0.0, 0.04), 0, 0.05))
                ring = [mb.vert(c + Vector((math.cos(k / n * 6.283) * r * rnd.uniform(0.8, 1.2), math.sin(k / n * 6.283) * r * 0.7, 0))) for k in range(n)]
                ctr = mb.vert(c)
                for k in range(n):
                    mb.face((ctr, ring[k], ring[(k + 1) % n]), col=jitter(SNOW, 0.03, rnd))
    return mb.obj('twig')


def render_twig(seed, snowy, path):
    sc = reset()
    ob = twig_scene(seed, snowy)
    mat = bpy.data.materials.new('albedo'); mat.use_nodes = True
    nt = mat.node_tree; nt.nodes.clear()
    attr = nt.nodes.new('ShaderNodeVertexColor'); attr.layer_name = 'Color'
    em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial')
    nt.links.new(attr.outputs['Color'], em.inputs['Color']); nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    ob.data.materials.append(mat)
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'; cam.ortho_scale = 2.0
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co)
    co.location = (1.0, 0.0, 5.0); co.rotation_euler = (0, 0, 0); sc.camera = co
    sc.render.resolution_x, sc.render.resolution_y = TEX_W, SPRAY_H
    sc.render.film_transparent = True
    sc.cycles.samples = 24
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path)
    return np.array(img.pixels[:], dtype=np.float32).reshape(SPRAY_H, TEX_W, 4)


def build_atlas():
    tmp = os.path.join(ASSETS, '_twig_tmp.png')
    plain = dilate(render_twig(21, False, tmp))
    snowy = dilate(render_twig(22, True, tmp))
    atlas = np.zeros((TEX_H, TEX_W, 4), np.float32)
    plain[..., :3] = np.clip(plain[..., :3] * 1.04, 0, 1)
    snowy[..., :3] = np.clip(snowy[..., :3] * 1.04, 0, 1)
    atlas[0:SPRAY_H] = plain
    atlas[SPRAY_H:2 * SPRAY_H] = snowy
    atlas[2 * SPRAY_H:] = (1, 1, 1, 1)
    os.remove(tmp)
    img = bpy.data.images.new('larch_twigs', TEX_W, TEX_H, alpha=True)
    img.pixels = atlas.ravel().tolist()
    img.filepath_raw = os.path.join(ASSETS, 'larch_twigs.png'); img.file_format = 'PNG'
    img.save()
    print('wrote larch_twigs.png')


# ------------------------------------------------------------------ near tree
def larch(seed, name):
    rnd = random.Random(seed)
    mb = MeshBuilder()
    BARK = hexrgb('#5e4b3d'); SNOW = hexrgb('#f2f6fb'); WHITE = (1, 1, 1)
    HT = 10.2 * rnd.uniform(0.93, 1.07)
    path = [Vector((rnd.uniform(-0.03, 0.03), rnd.uniform(-0.03, 0.03), z)) for z in np.linspace(-0.3, HT - 0.2, 8)]
    path[0] = Vector((0, 0, -0.3))
    tube(mb, path, [0.24 * (1 - i / 8) ** 0.9 + 0.015 for i in range(8)], 7, BARK, uv_u=UV_WHITE[0])
    z = 1.7
    while z < HT - 0.7:
        h = min(0.97, (z - 1.7) / (HT - 2.4))
        Rw = 2.0 * (1 - h) ** 0.9 + 0.25
        nb = rnd.choice((3, 4, 4, 5)) if h < 0.7 else rnd.choice((2, 3, 3))
        off = rnd.random() * 6.283
        for b in range(nb):
            th = off + b / nb * 6.283 + rnd.uniform(-0.45, 0.45)
            L = Rw * rnd.uniform(0.75, 1.1)
            dirh = Vector((math.cos(th), math.sin(th), 0))
            rise = 0.18 * L * (1 - h * 0.4)                      # leaves the trunk rising a little
            droop = (0.35 + 0.3 * (1 - h)) * L * 0.5            # then bends down towards the tip (pendulous)
            pts = []
            for k in range(5):
                t = k / 4
                pts.append(dirh * (0.08 + L * t) + Vector((0, 0, z + rise * math.sin(math.pi * 0.5 * min(1, t * 1.6)) - droop * t ** 2.2)))
            tube(mb, pts[:4], [0.05 * (1 - t / 4) + 0.008 for t in range(4)], 3, BARK, uv_u=UV_WHITE[0], cap_end=False)
            lat = Vector((-dirh.y, dirh.x, 0))
            snowy = h < 0.8 and rnd.random() < 0.55
            vband = V_SNOWY if snowy else V_PLAIN
            # flat spray on the outer half: bare twigs fanning out sideways
            W = (0.55 + 0.6 * min(1, L / 1.6)) * rnd.uniform(0.85, 1.15)
            prof = [0.35, 0.85, 1.0, 0.8, 0.4]
            rows = []
            for k, p in enumerate(pts):
                w = W * prof[k] / 2
                sag = Vector((0, 0, -0.22 * w))
                rows.append([mb.vert(p + lat * w + sag), mb.vert(p + Vector((0, 0, 0.02))), mb.vert(p - lat * w + sag)])
            for k in range(1, 4):
                u0, u1 = (k - 1) / 3, k / 3
                v0, vm, v1 = vband[0], (vband[0] + vband[1]) / 2, vband[1]
                for j, (va, vb) in enumerate(((v0, vm), (vm, v1))):
                    mb.face((rows[k][j], rows[k + 1][j], rows[k + 1][j + 1], rows[k][j + 1]),
                            [(u0, va), (u1, va), (u1, vb), (u0, vb)], WHITE)
            # pendulous twigs: two curtains hanging from the outer branch, the twig axis pointing down
            if L > 0.7:
                for side in (-1, 1):
                    k0, k1 = 2, 4
                    top = [pts[k] + lat * side * W * 0.18 for k in (k0, 3, k1)]
                    hang = 0.55 + 0.45 * (1 - h)
                    tv = [mb.vert(p) for p in top]
                    bv = [mb.vert(p - Vector((0, 0, hang * rnd.uniform(0.8, 1.1))) + lat * side * 0.12) for p in top]
                    for k in range(2):
                        v0, v1 = V_PLAIN[0] + k * 0.5 * (V_PLAIN[1] - V_PLAIN[0]), V_PLAIN[0] + (k + 1) * 0.5 * (V_PLAIN[1] - V_PLAIN[0])
                        # u along the twig (top = base of the spray), v across: the spray is turned to hang down
                        mb.face((tv[k], tv[k + 1], bv[k + 1], bv[k]), [(0.05, v0), (0.05, v1), (0.75, v1), (0.75, v0)], WHITE)
            # a thin ridge of snow on the inner part of the lower branches
            if snowy and h < 0.6 and rnd.random() < 0.6:
                sw = 0.05 * rnd.uniform(0.8, 1.2)
                ring = []
                for k, t in enumerate((0.05, 0.3, 0.55)):
                    p = pts[0].lerp(pts[2], t / 0.5) + Vector((0, 0, 0.045))
                    ring.append([mb.vert(p + lat * sw * c + Vector((0, 0, 0.05 * (0.4, 1.0, 0.5)[k] * math.cos(c * 1.4)))) for c in (1.0, 0.0, -1.0)])
                for k in range(2):
                    for j in range(2):
                        mb.face((ring[k][j], ring[k + 1][j], ring[k + 1][j + 1], ring[k][j + 1]), [UV_WHITE] * 4, jitter(SNOW, 0.03, rnd))
        z += rnd.uniform(0.42, 0.62) * (1 - 0.3 * h)
    # leader: a slender bare tip
    tip = Vector((0, 0, HT))
    for b in range(3):
        th = b * 2.094 + rnd.random()
        d = Vector((math.cos(th) * 0.25, math.sin(th) * 0.25, -0.9))
        lat = Vector((-math.sin(th), math.cos(th), 0)) * 0.18
        a1, a2, a3, a4 = mb.vert(tip + lat), mb.vert(tip - lat), mb.vert(tip + d - lat), mb.vert(tip + d + lat)
        mb.face((a1, a2, a3, a4), [(0.0, V_PLAIN[0]), (0.0, V_PLAIN[1]), (0.6, V_PLAIN[1]), (0.6, V_PLAIN[0])], WHITE)
    return mb.obj(name)


# ------------------------------------------------------------------ far silhouette, both species
SPRUCE_FAR = dict(trunk=(1.4, 0.2, 0.15), tiers=[(2.15, 0.95, 2.4), (1.6, 2.6, 2.2), (1.05, 4.3, 2.0), (0.55, 5.9, 2.0)],
                  inner=0.72, tip_drop=0.25, notch_lift=0.0)
LARCH_FAR = dict(trunk=(2.2, 0.17, 0.11), tiers=[(1.6, 1.7, 2.3), (1.25, 3.5, 2.3), (0.85, 5.3, 2.3), (0.45, 7.1, 2.5)],
                 inner=0.38, tip_drop=0.55, notch_lift=0.35)


def far_shape(P):
    """Same construction (vertex order, random draws) as trees.spruce_far(); P sets the shape."""
    rnd = random.Random(7)
    mb = MeshBuilder()
    G1, G2, SNOW, BARK = hexrgb('#1f442d'), hexrgb('#24503a'), hexrgb('#e9f0f7'), hexrgb('#4a3426')
    top, r0, r1 = P['trunk']
    tube(mb, [Vector((0, 0, -0.3)), Vector((0, 0, top))], [r0, r1], 3, BARK, uv_u=0.5, cap_end=False)
    for ti, (R, z0, hgt) in enumerate(P['tiers']):
        n = 8
        apex = mb.vert((0, 0, z0 + hgt))
        rim = []
        for k in range(n * 2):
            a = k / (n * 2) * 6.283 + ti * 0.4
            r = R * (1.0 if k % 2 == 0 else P['inner']) * rnd.uniform(0.92, 1.05)
            zz = z0 - (P['tip_drop'] if k % 2 == 0 else -P['notch_lift'])
            rim.append(mb.vert((math.cos(a) * r, math.sin(a) * r, zz)))
        for k in range(n * 2):
            a, b = rim[k], rim[(k + 1) % (n * 2)]
            g = G1 if ti % 2 else G2
            mb.face((a, b, apex), [((k) / 6, 0), ((k + 1) / 6, 0), ((k + 0.5) / 6, 1.2)], [g, g, SNOW])
    return mb


def larch_far_colours(mb):
    """per-vertex colours of the bare larch silhouette: grey-brown twigs, darker in the notches, a dusting of snow
    on the apexes; a simple vertical gradient stands in for ambient occlusion"""
    TIP, NOTCH, APEX, BARK = hexrgb('#62564a'), hexrgb('#4b4139'), hexrgb('#a39d95'), hexrgb('#54443a')
    top = max(p[2] for p in mb.v)
    out = []
    ntrunk = len(mb.v) - 4 * 17
    for i, p in enumerate(mb.v):
        if i < ntrunk:
            c = BARK
        else:
            j = (i - ntrunk) % 17
            c = APEX if j == 0 else (TIP if (j - 1) % 2 == 0 else NOTCH)
        ao = 0.62 + 0.38 * max(0.0, min(1.0, p[2] / top))
        out.append(tuple(ch * ao for ch in c))
    return out


def conifer_far():
    ref = trees.spruce_far()
    mb_s, mb_l = far_shape(SPRUCE_FAR), far_shape(LARCH_FAR)
    assert len(mb_s.v) == len(ref.data.vertices) and all(abs(a - b) < 1e-5 for v, w in zip(mb_s.v, ref.data.vertices) for a, b in zip(v, w.co)), 'far_shape(SPRUCE_FAR) != trees.spruce_far()'   # Blender stores float32
    assert len(mb_l.v) == len(mb_s.v) and mb_l.f == mb_s.f
    bpy.data.objects.remove(ref)
    ob = mb_s.obj('conifer_far')
    bake_ao_to_vertex_colors([ob], samples=32, distance=2.0, strength=0.6, floor=0.3)   # same bake as spruce_far
    ob.shape_key_add(name='Basis', from_mix=False)
    sk = ob.shape_key_add(name='larch', from_mix=False)
    for i, p in enumerate(mb_l.v):
        sk.data[i].co = p
    at = ob.data.attributes.new('_col2', 'FLOAT_VECTOR', 'POINT')
    for i, c in enumerate(larch_far_colours(mb_l)):
        at.data[i].vector = c
    return ob


def export_with_shape_keys(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    path = os.path.join(ASSETS, name)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_materials='NONE',
                              export_vertex_color='ACTIVE', export_normals=True, export_texcoords=True, export_yup=True,
                              export_animations=False, export_attributes=True, export_morph=True, export_morph_normal=False)
    print('wrote', path, os.path.getsize(path), 'bytes')


def main():
    build_atlas()
    reset()
    objs = [larch(2000 + i * 31, 'larch_%d' % i) for i in range(2)]
    for i, ob in enumerate(objs):
        ob.location.x = i * 9
    print('near tris', [tri_count([o]) for o in objs])
    bake_ao_to_vertex_colors(objs, samples=64, distance=1.6, strength=0.7, floor=0.3)
    for ob in objs:
        ob.location.x = 0
    export_glb(objs, 'larch_near.glb')
    reset()
    far = conifer_far()
    print('far tris', tri_count([far]))
    export_with_shape_keys([far], 'conifer_far.glb')


if __name__ == '__main__':
    main()
