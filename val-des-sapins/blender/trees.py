"""Norway spruce (Picea abies) under snow, for Val des Sapins.

Outputs (val-des-sapins/assets):
- spruce_needles.png  512x512 atlas: two branch sprays rendered from ~30k modelled needles (albedo + alpha;
                      the lower spray carries fresh snow), and an opaque white strip used by trunk and snow.
- spruce_near.glb     three tree variants (spruce_0..2), ~3k triangles each: trunk, drooping branches that turn
                      up at the tip, flat sprays on top, comb curtains hanging below, snow lumps; Cycles ambient
                      occlusion baked into the vertex colours.
- spruce_far.glb      one ~120-triangle silhouette (layered star-shaped skirts) for the 22,000 distant trees.

Run: python blender/trees.py   (with bpy==5.3.0 installed)
"""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, numpy as np
from mathutils import Vector
from vds_common import reset, MeshBuilder, tube, hexrgb, jitter, bake_ao_to_vertex_colors, export_glb, tri_count, ASSETS, srgb2lin

TEX_W, TEX_H = 512, 512
SPRAY_H = 224            # each spray occupies a 512x224 band; band 0 = plain, band 1 = snowy, top strip = white
V_PLAIN = (0 / TEX_H, SPRAY_H / TEX_H)
V_SNOWY = (SPRAY_H / TEX_H, 2 * SPRAY_H / TEX_H)
UV_WHITE = (0.5, (2 * SPRAY_H + 32) / TEX_H)


# ------------------------------------------------------------------ needle sprays (texture)
def spray_scene(seed, snowy):
    """A spruce shoot lying in the XY plane, base at x=0, tip at x=2, seen from above (+Z)."""
    rnd = random.Random(seed)
    mb = MeshBuilder()
    STEM = hexrgb('#5a4030')
    greens = [hexrgb(h) for h in ('#21402a', '#264a30', '#1d3a26', '#2d5434', '#335c38')]
    young = hexrgb('#4f7a3c')
    snow = hexrgb('#f4f7fb')

    def needle(p, d, ln, col):
        # a needle as a thin quad facing the camera (top view)
        side = Vector((-d.y, d.x, 0)) * 0.0075
        q = p + d * ln
        a, b, c, e = mb.vert(p - side), mb.vert(p + side), mb.vert(q + side * 0.4), mb.vert(q - side * 0.4)
        mb.face((a, b, c, e), col=col)

    def shoot(base, direction, length, depth, z):
        n = max(3, int(length / 0.014))
        for i in range(n):
            t = i / n
            p = base + direction * length * t
            p = Vector((p.x, p.y, z + 0.002 * i / n))
            for k in range(2 if depth else 3):
                ang = rnd.uniform(0.6, 1.25) * (1 if k % 2 == 0 else -1)
                ca, sa = math.cos(ang), math.sin(ang)
                d = Vector((direction.x * ca - direction.y * sa, direction.x * sa + direction.y * ca, 0)).normalized()
                ln = rnd.uniform(0.032, 0.046) * (0.75 + 0.25 * (1 - t))
                col = young if (t > 0.82 and rnd.random() < 0.6) else jitter(rnd.choice(greens), 0.12, rnd)
                shade = 0.72 + 0.28 * (z / 0.03)          # lower layers slightly darker (depth inside the spray)
                needle(p, d, ln, tuple(c * shade for c in col))
        # bare twig showing between needles
        side = Vector((-direction.y, direction.x, 0)) * 0.003
        q = base + direction * length
        a, b, c, e = mb.vert(base - side + Vector((0, 0, z - 0.001))), mb.vert(base + side + Vector((0, 0, z - 0.001))), mb.vert(q + side + Vector((0, 0, z - 0.001))), mb.vert(q - side + Vector((0, 0, z - 0.001)))
        mb.face((a, b, c, e), col=STEM)

    # main axis with alternating side shoots (comb), second order shoots on the larger ones
    L = 2.0
    outline = []
    shoot(Vector((0, 0, 0)), Vector((1, 0, 0)), L, 0, 0.02)
    x = 0.08
    side = 1
    while x < L - 0.08:
        t = x / L
        ln = (0.3 + 0.24 * math.sin(math.pi * min(1, t * 1.15))) * rnd.uniform(0.85, 1.05) * (1 - 0.5 * t)
        ang = math.radians(rnd.uniform(48, 62)) * side
        d = Vector((math.cos(ang), math.sin(ang), 0))
        b = Vector((x, 0, 0))
        z = 0.01 + 0.01 * rnd.random()
        shoot(b, d, ln, 1, z)
        for s2 in range(int(ln / 0.055)):
            u = (s2 + 0.7) / (ln / 0.055 + 0.5)
            a2 = ang + math.radians(rnd.uniform(40, 55)) * (1 if s2 % 2 else -1)
            shoot(b + d * ln * u, Vector((math.cos(a2), math.sin(a2), 0)), ln * 0.42 * (1 - u * 0.6), 2, z - 0.004)
        outline.append((b, b + d * ln * 0.82))
        x += rnd.uniform(0.045, 0.07)
        side = -side
    # dark foliage mass under the shoots: the spray reads as dense needles with a fringe, not as a skeleton
    DEEP = hexrgb('#132619')
    for side_s in (1, -1):
        tips = [(b, e) for (b, e) in outline if (e.y > 0) == (side_s > 0)]
        for (b0, e0), (b1, e1) in zip(tips, tips[1:]):
            q = [mb.vert(Vector((b0.x, 0, 0.0005))), mb.vert(Vector((e0.x, e0.y * 0.9, 0.0005))), mb.vert(Vector((e1.x, e1.y * 0.9, 0.0005))), mb.vert(Vector((b1.x, 0, 0.0005)))]
            mb.face(q, col=jitter(DEEP, 0.15, rnd))
    if snowy:
        # fresh snow resting on the upper side: soft clumps along the axis and on the shoot bases
        for i in range(110):
            t = rnd.random() ** 0.8
            c = Vector((t * L * 0.92 + 0.05, rnd.gauss(0, 0.09) * (1 - t * 0.5), 0.05))
            r = rnd.uniform(0.04, 0.095) * (1.1 - t * 0.6)
            n = 10
            ring = [mb.vert(c + Vector((math.cos(k / n * 6.283) * r * rnd.uniform(0.75, 1.15), math.sin(k / n * 6.283) * r * rnd.uniform(0.75, 1.15) * 0.8, 0))) for k in range(n)]
            ctr = mb.vert(c)
            for k in range(n):
                mb.face((ctr, ring[k], ring[(k + 1) % n]), col=jitter(snow, 0.04, rnd))
    return mb.obj('spray')


def render_spray(seed, snowy, path):
    sc = reset()
    ob = spray_scene(seed, snowy)
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
    px = np.array(img.pixels[:], dtype=np.float32).reshape(SPRAY_H, TEX_W, 4)
    return px


def dilate(px, iters=24):
    """Bleeds colour into transparent pixels so mipmaps and alpha testing never show dark fringes."""
    rgb, a = px[..., :3].copy(), px[..., 3].copy()
    known = a > 0.02
    for _ in range(iters):
        acc = np.zeros_like(rgb); cnt = np.zeros(a.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            s = np.roll(np.roll(rgb * known[..., None], dy, 0), dx, 1)
            k = np.roll(np.roll(known, dy, 0), dx, 1)
            acc += s; cnt += k
        new = (~known) & (cnt > 0)
        rgb[new] = acc[new] / cnt[new][:, None]
        known = known | new
    return np.concatenate([rgb, a[..., None]], -1)


def build_atlas():
    tmp = os.path.join(ASSETS, '_spray_tmp.png')
    plain = dilate(render_spray(11, False, tmp))
    snowy = dilate(render_spray(12, True, tmp))
    atlas = np.zeros((TEX_H, TEX_W, 4), np.float32)
    plain[..., :3] = np.clip(plain[..., :3] * 1.18, 0, 1)   # albedo a little lighter: the game adds AO and ACES
    snowy[..., :3] = np.clip(snowy[..., :3] * 1.18, 0, 1)
    atlas[0:SPRAY_H] = plain
    atlas[SPRAY_H:2 * SPRAY_H] = snowy
    atlas[2 * SPRAY_H:] = (1, 1, 1, 1)
    os.remove(tmp)
    img = bpy.data.images.new('spruce_needles', TEX_W, TEX_H, alpha=True)
    img.pixels = atlas.ravel().tolist()
    img.filepath_raw = os.path.join(ASSETS, 'spruce_needles.png'); img.file_format = 'PNG'
    img.save()
    print('wrote spruce_needles.png')


# ------------------------------------------------------------------ near tree
def spruce(seed, name):
    rnd = random.Random(seed)
    mb = MeshBuilder()
    BARK = hexrgb('#4a3426'); SNOW = hexrgb('#f2f6fb'); WHITE = (1, 1, 1)
    HT = 7.9 * rnd.uniform(0.95, 1.05)
    # trunk
    path = [Vector((0, 0, z)) for z in np.linspace(-0.3, HT - 0.4, 7)]
    tube(mb, path, [0.21 * (1 - i / 7) + 0.02 for i in range(7)], 7, BARK, uv_u=UV_WHITE[0])
    # whorls
    z = 0.85
    whorl = 0
    while z < HT - 0.45:
        h = min(0.97, (z - 0.85) / (HT - 1.6))
        Rw = 2.15 * (1 - h) ** 0.95 + 0.2
        nb = 6 if h < 0.55 else 5 if h < 0.85 else 4
        off = rnd.random() * 6.283
        for b in range(nb):
            th = off + b / nb * 6.283 + rnd.uniform(-0.25, 0.25)
            L = Rw * rnd.uniform(0.82, 1.08)
            dirh = Vector((math.cos(th), math.sin(th), 0))
            droop = (0.32 + 0.25 * (1 - h)) * L            # how far the branch sags at its middle
            upturn = 0.22 * L * (1 - h * 0.5)               # the tip turns up again
            pts = []
            for k in range(4):
                t = k / 3
                p = dirh * (0.08 + L * t) + Vector((0, 0, z - droop * math.sin(math.pi * min(1, t * 1.05)) * 0.55 - 0.18 * L * t + upturn * t ** 3))
                pts.append(p)
            if L > 1.0:
                tube(mb, pts[:3], [0.045 * (1 - t / 3) + 0.01 for t in range(3)], 3, BARK, uv_u=UV_WHITE[0], cap_end=False)
            lat = Vector((-dirh.y, dirh.x, 0))
            snowy = h < 0.85 and rnd.random() < 0.8
            vband = V_SNOWY if snowy else V_PLAIN
            # flat spray on top: 3 columns (left edge, centre, right edge), edges curl down a little
            prof = [0.4, 0.95, 0.9, 0.35]
            W = (0.42 + 0.55 * min(1, L / 1.6)) * rnd.uniform(0.9, 1.1)
            rows = []
            for k, p in enumerate(pts):
                w = W * prof[k] / 2
                curl = Vector((0, 0, -0.18 * w))
                rows.append([mb.vert(p + lat * w + curl), mb.vert(p + Vector((0, 0, 0.03))), mb.vert(p - lat * w + curl)])
            for k in range(3):
                u0, u1 = k / 3, (k + 1) / 3
                v0, vm, v1 = vband[0], (vband[0] + vband[1]) / 2, vband[1]
                for j, (va, vb) in enumerate(((v0, vm), (vm, v1))):
                    mb.face((rows[k][j], rows[k + 1][j], rows[k + 1][j + 1], rows[k][j + 1]),
                            [(u0, va), (u1, va), (u1, vb), (u0, vb)], WHITE)
            # comb curtain hanging below the branch (lower two thirds of the crown)
            if h < 0.45 and L > 0.8:
                hang = 0.32 + 0.25 * (1 - h)
                top, bot = [], []
                for k in (1, 2, 3):
                    p = pts[k]
                    top.append(mb.vert(p - Vector((0, 0, 0.02))))
                    bot.append(mb.vert(p - Vector((0, 0, hang * (0.6 + 0.4 * math.sin(math.pi * k / 3.5)))) + lat * rnd.uniform(-0.06, 0.06)))
                for k in range(2):
                    u0, u1 = 0.33 + k / 3, 0.33 + (k + 1) / 3
                    mb.face((top[k], top[k + 1], bot[k + 1], bot[k]), [(u0, V_PLAIN[1]), (u1, V_PLAIN[1]), (u1, V_PLAIN[0]), (u0, V_PLAIN[0])], WHITE)
            # snow load on the inner part of the lower branches
            if snowy and h < 0.75 and rnd.random() < 0.65:
                # a rounded pillow of snow on the inner half of the branch (5 points across, sagging ends)
                sw = W * 0.2 * rnd.uniform(0.8, 1.2)
                ring = []
                for k, t in enumerate((0.05, 0.25, 0.45)):
                    p = pts[0].lerp(pts[2], t / 0.67) + Vector((0, 0, 0.035))
                    bulge = (0.35, 1.0, 0.55)[k]
                    ring.append([mb.vert(p + lat * sw * c + Vector((0, 0, 0.11 * bulge * math.cos(c * 1.4)))) for c in (1.0, 0.0, -1.0)])
                for k in range(2):
                    for j in range(2):
                        mb.face((ring[k][j], ring[k + 1][j], ring[k + 1][j + 1], ring[k][j + 1]), [UV_WHITE] * 4, jitter(SNOW, 0.03, rnd))
        z += rnd.uniform(0.38, 0.48) * (1 - 0.35 * h)
        whorl += 1
    # leader: a few small sprays around the tip and a cap of snow
    tip = Vector((0, 0, HT))
    for b in range(4):
        th = b * 1.571 + rnd.random()
        d = Vector((math.cos(th) * 0.32, math.sin(th) * 0.32, -0.75))
        lat = Vector((-math.sin(th), math.cos(th), 0)) * 0.2
        a1, a2, a3, a4 = mb.vert(tip + lat), mb.vert(tip - lat), mb.vert(tip + d - lat), mb.vert(tip + d + lat)
        mb.face((a1, a2, a3, a4), [(0.0, V_PLAIN[0]), (0.0, V_PLAIN[1]), (0.6, V_PLAIN[1]), (0.6, V_PLAIN[0])], WHITE)
    ob = mb.obj(name)
    return ob


# ------------------------------------------------------------------ far tree
def spruce_far():
    rnd = random.Random(7)
    mb = MeshBuilder()
    G1, G2, SNOW, BARK = hexrgb('#1f442d'), hexrgb('#24503a'), hexrgb('#e9f0f7'), hexrgb('#4a3426')
    tube(mb, [Vector((0, 0, -0.3)), Vector((0, 0, 1.4))], [0.2, 0.15], 3, BARK, uv_u=0.5, cap_end=False)
    tiers = [(2.15, 0.95, 2.4), (1.6, 2.6, 2.2), (1.05, 4.3, 2.0), (0.55, 5.9, 2.0)]
    for ti, (R, z0, hgt) in enumerate(tiers):
        n = 8
        apex = mb.vert((0, 0, z0 + hgt))
        rim = []
        for k in range(n * 2):
            a = k / (n * 2) * 6.283 + ti * 0.4
            r = R * (1.0 if k % 2 == 0 else 0.72) * rnd.uniform(0.92, 1.05)
            zz = z0 - (0.25 if k % 2 == 0 else 0.0)
            rim.append(mb.vert((math.cos(a) * r, math.sin(a) * r, zz)))
        for k in range(n * 2):
            a, b = rim[k], rim[(k + 1) % (n * 2)]
            g = G1 if ti % 2 else G2
            # upper part of each tier dusted with snow, lower part green
            mb.face((a, b, apex), [((k) / 6, 0), ((k + 1) / 6, 0), ((k + 0.5) / 6, 1.2)], [g, g, SNOW])
    return mb.obj('spruce_far')


def main():
    build_atlas()
    reset()
    objs = [spruce(1000 + i * 17, 'spruce_%d' % i) for i in range(3)]
    for i, ob in enumerate(objs):
        ob.location.x = i * 8        # apart while baking so they don't occlude each other
    print('near tris', [tri_count([o]) for o in objs])
    bake_ao_to_vertex_colors(objs, samples=64, distance=1.6, strength=0.7, floor=0.3)
    for ob in objs:
        ob.location.x = 0
    export_glb(objs, 'spruce_near.glb')
    reset()
    far = spruce_far()
    bake_ao_to_vertex_colors([far], samples=32, distance=2.0, strength=0.6, floor=0.3)
    print('far tris', tri_count([far]))
    export_glb([far], 'spruce_far.glb')


main()
