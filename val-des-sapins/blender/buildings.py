"""Building pieces for Val des Sapins.

Outputs (val-des-sapins/assets):
- baluster_mask.png  front silhouette of the carved plank below (vase-shaped edges, heart cut-out), used as an
               alpha mask on a plain board in the game (cheaper than the modelled plank, same outline and shadow).
- building_parts.glb
    snowslab   unit-cube module for the snow lying on a roof slope (x along the ridge, y = thickness, z up the slope,
               eave at z = -0.5): wind ripples and sastrugi on top, a cornice that bulges and curls over the eave,
               rounded sides. Scaled per roof by the game like any box atom. Cycles AO baked in the vertex colours.
    baluster   unit-cube module of a carved Savoyard balcony plank (balustre découpé): vase-shaped edges so that
               neighbouring planks open decorative gaps, a heart cut through the middle.
    skis / snowboard  gear left on balconies, standing on their tails (metres, origin on the deck): a pair of skis
               with bindings and poles, a twin snowboard with bindings; white top sheets for per-instance colours.
- rooms_atlas.jpg  four chalet interiors rendered with Cycles (pine panelling, beams, furniture, lamps) for the
               windows' interior mapping. Each 256x256 tile is the room seen through its opening from a camera placed
               one room-depth in front of the window plane, so the game can re-project any point of the room box.

Run: python blender/buildings.py   (with bpy==5.3.0)
"""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, numpy as np
from mathutils import Vector
from vds_common import reset, MeshBuilder, hexrgb, jitter, bake_ao_to_vertex_colors, export_glb, tri_count, ASSETS


def G(x, y, z):
    return Vector((x, -z, y))       # game (Y up) -> Blender (Z up)


# ------------------------------------------------------------------ snow blanket on a roof slope
def snowslab():
    rnd = random.Random(5)
    mb = MeshBuilder()
    NX, NZ = 30, 16
    WHITE = (1, 1, 1)

    def top(x, z):
        # z in [-0.5, 0.5] (eave .. ridge), x in [-0.5, 0.5]
        ripple = 0.07 * math.sin(x * 38 + math.sin(z * 9) * 1.5) * (0.6 + 0.4 * math.sin(z * 7 + 1))
        sastrugi = 0.05 * math.sin(x * 91 + z * 23) * math.sin(z * 31)
        pillow = 0.35 * math.exp(-((z + 0.43) / 0.07) ** 2)                    # snow piling up above the eave
        ridge = -0.25 * max(0.0, (z - 0.35) / 0.15)                            # thinner where the wind scours the ridge
        return 0.5 + ripple + sastrugi + pillow + ridge

    rows = []
    zs = [-0.5 + i / NZ for i in range(NZ + 1)]
    xs = [-0.5 + i / NX for i in range(NX + 1)]
    for z in zs:
        rows.append([mb.vert(G(x, top(x, z) * (1 - 0.25 * max(0, abs(x) * 2 - 0.9) / 0.1), z)) for x in xs])
    for i in range(NZ):
        for j in range(NX):
            mb.face((rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]), col=WHITE)
    # cornice: from the eave line, bulge out and curl down over the fascia (in units of the slab)
    prof = [(-0.5, None), (-0.515, 0.75), (-0.53, 0.45), (-0.535, 0.05), (-0.53, -0.4), (-0.515, -0.8), (-0.5, -0.95)]
    prev = rows[0]
    for k, (z, y) in enumerate(prof[1:]):
        ring = [mb.vert(G(x, (y + 0.06 * math.sin(x * 47 + k)) if y is not None else 0, z - 0.004 * rnd.random())) for x in xs]
        for j in range(NX):
            mb.face((ring[j], ring[j + 1], prev[j + 1], prev[j]), col=WHITE)
        prev = ring
    # rounded sides down to the roof boards
    for side in (0, NX):
        col = [rows[i][side] for i in range(NZ + 1)]
        sx = xs[side]
        low = [mb.vert(G(sx * 1.02, -0.5, zs[i])) for i in range(NZ + 1)]
        for i in range(NZ):
            q = (col[i], col[i + 1], low[i + 1], low[i]) if side == 0 else (col[i + 1], col[i], low[i], low[i + 1])
            mb.face(q, col=WHITE)
    ob = mb.obj('snowslab')
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


# ------------------------------------------------------------------ carved balcony plank
def baluster():
    """Outline in the unit square (x across, y up), extruded along z. Built from a 2D curve so Blender fills the hole."""
    cu = bpy.data.curves.new('bal', 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'; cu.extrude = 0.5
    cu.resolution_u = 2
    # half-width profile from bottom to top: vase shape, the neighbouring planks leave lens-shaped openings
    hw = lambda t: 0.5 - 0.34 * math.sin(math.pi * min(1, max(0, (t - 0.06) / 0.88))) ** 0.7 + 0.16 * math.sin(math.pi * min(1, max(0, (t - 0.32) / 0.36))) ** 2
    n = 40
    right = [(hw(i / n), i / n - 0.5) for i in range(n + 1)]
    left = [(-x, y) for x, y in reversed(right)]
    outline = right + left
    sp = cu.splines.new('POLY'); sp.points.add(len(outline) - 1)
    for p, (x, y) in zip(sp.points, outline):
        p.co = (x, y, 0, 1)
    sp.use_cyclic_u = True
    # heart cut-out
    heart = []
    for i in range(36):
        t = i / 36 * 2 * math.pi
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        heart.append((x / 17 * 0.15, y / 17 * 0.13 + 0.03))
    sp2 = cu.splines.new('POLY'); sp2.points.add(len(heart) - 1)
    for p, (x, y) in zip(sp2.points, heart):
        p.co = (x, y, 0, 1)
    sp2.use_cyclic_u = True
    ob = bpy.data.objects.new('baluster_curve', cu); bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    ob = bpy.context.active_object; ob.name = 'baluster'
    # curve space: x across, y up, z thickness -> game axes (x, y, z) = Blender (x, -z, y)
    me = ob.data
    for v in me.vertices:
        x, y, z = v.co
        v.co = G(x, y, z)
    me.update()
    ca = me.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
    for d in ca.data:
        d.color = (1, 1, 1, 1)
    me.color_attributes.active_color = ca
    me.uv_layers.new(name='UVMap')
    return ob


# ------------------------------------------------------------------ gear left on the balconies
def board_outline(L, w_mid, w_tip, n=14):
    """half-widths along a board standing on its tail (y from 0 to L): sidecut, rounded ends."""
    out = []
    for i in range(n + 1):
        t = i / n
        y = t * L
        side = w_mid + (w_tip - w_mid) * (2 * t - 1) ** 2
        end = 1.0
        if t < 0.06: end = math.sqrt(max(0.0, 1 - ((0.06 - t) / 0.06) ** 2))
        if t > 0.94: end = math.sqrt(max(0.0, 1 - ((t - 0.94) / 0.06) ** 2))
        out.append((y, max(0.004, side * end)))
    return out


def plank(mb, x0, prof, th, rocker, top_col, base_col):
    """A ski or board standing up: profile [(y, half width)], thickness th, both ends curving forward (+z)."""
    rows = []
    L = prof[-1][0]
    for y, hw in prof:
        t = y / L
        zc = rocker * (max(0, 0.15 - t) / 0.15) ** 2 + rocker * (max(0, t - 0.85) / 0.15) ** 2
        rows.append([mb.vert(G(x0 - hw, y, zc + th)), mb.vert(G(x0 + hw, y, zc + th)), mb.vert(G(x0 + hw, y, zc)), mb.vert(G(x0 - hw, y, zc))])
    for i in range(len(rows) - 1):
        a, b = rows[i], rows[i + 1]
        col = top_col(prof[i][0] / L)
        mb.face((a[0], a[1], b[1], b[0]), col=col)                    # top sheet (faces +z, out of the wall)
        mb.face((a[3], b[3], b[2], a[2]), col=base_col)               # base
        mb.face((a[1], a[2], b[2], b[1]), col=(0.75, 0.76, 0.78))     # steel edges
        mb.face((a[0], b[0], b[3], a[3]), col=(0.75, 0.76, 0.78))


def boxg(mb, c, s, col):
    x, y, z = c; sx, sy, sz = (v / 2 for v in s)
    p = [mb.vert(G(x + dx * sx, y + dy * sy, z + dz * sz)) for dx in (-1, 1) for dy in (-1, 1) for dz in (-1, 1)]
    for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        mb.face(tuple(p[i] for i in q), col=col)


def skis():
    """A pair of skis with bindings and two poles, standing on their tails (origin on the deck, leaning done by the game)."""
    mb = MeshBuilder()
    WHITE, DARK, GREY = (1, 1, 1), (0.12, 0.12, 0.14), (0.6, 0.62, 0.66)
    stripe = lambda t: (0.25, 0.25, 0.28) if abs(t - 0.62) < 0.05 or abs(t - 0.3) < 0.02 else WHITE
    for x in (-0.055, 0.055):
        plank(mb, x, board_outline(1.72, 0.04, 0.056), 0.016, 0.05, stripe, DARK)
        boxg(mb, (x, 0.72, 0.035), (0.07, 0.12, 0.04), DARK); boxg(mb, (x, 0.95, 0.035), (0.07, 0.08, 0.05), GREY)   # heel and toe pieces
    for x in (-0.17, 0.17):                                                       # poles beside the skis
        boxg(mb, (x, 0.6, 0.08), (0.016, 1.2, 0.016), GREY); boxg(mb, (x, 1.17, 0.08), (0.035, 0.14, 0.035), DARK)
        boxg(mb, (x, 0.1, 0.08), (0.09, 0.008, 0.09), DARK)
    return mb.obj('skis')


def snowboard():
    mb = MeshBuilder()
    WHITE, DARK, GREY = (1, 1, 1), (0.1, 0.1, 0.12), (0.5, 0.52, 0.56)
    graphic = lambda t: (0.2, 0.2, 0.24) if (t * 9) % 2 < 0.35 else WHITE
    plank(mb, 0.0, board_outline(1.55, 0.122, 0.148), 0.013, 0.06, graphic, DARK)
    for y in (0.53, 1.02):                                                        # bindings: base, highback, two straps
        boxg(mb, (0, y, 0.025), (0.22, 0.2, 0.02), DARK)
        boxg(mb, (0, y - 0.08, 0.1), (0.2, 0.03, 0.16), DARK)
        for dy in (0.02, 0.09):
            boxg(mb, (0, y + dy, 0.06), (0.2, 0.035, 0.05), GREY)
    return mb.obj('snowboard')


# ------------------------------------------------------------------ chalet interiors for the windows
def room(variant, path):
    sc = reset()
    sc.cycles.samples = 48
    sc.view_settings.view_transform = 'Standard'
    rnd = random.Random(100 + variant)
    W, H, D = 2.5, 2.5, 3.0          # room cross-section at the window plane and depth (metres)

    def mat(name, rgb, emit=0.0, rough=0.7):
        m = bpy.data.materials.new(name); m.use_nodes = True
        bs = m.node_tree.nodes['Principled BSDF']
        bs.inputs['Base Color'].default_value = (*[c ** 2.2 for c in rgb], 1)
        bs.inputs['Roughness'].default_value = rough
        if emit:
            bs.inputs['Emission Color'].default_value = (*[c ** 2.2 for c in rgb], 1); bs.inputs['Emission Strength'].default_value = emit
        return m

    def box(c, s, m):
        """centre and size in room coordinates: x across, y up (0 at floor), z depth (0 = window plane, D = back)."""
        bpy.ops.mesh.primitive_cube_add(size=1, location=(c[0], c[2], c[1]))
        o = bpy.context.active_object; o.scale = (s[0], s[2], s[1]); o.data.materials.append(m); return o

    PINE = [mat('pine%d' % k, jitter(hexrgb('#b98a55'), 0.12, rnd)) for k in range(4)]
    DARKW = mat('dark', hexrgb('#6b4426'))
    # panelled walls (vertical boards), floor boards, ceiling and beams
    for k, x in enumerate(np.arange(-W / 2, W / 2, 0.18)):
        box((x + 0.09, H / 2, D + 0.02), (0.175, H, 0.04), PINE[k % 4])
    for side in (-1, 1):
        for k, z in enumerate(np.arange(0, D, 0.18)):
            box((side * (W / 2 + 0.02), H / 2, z + 0.09), (0.04, H, 0.175), PINE[(k + 1) % 4])
    for k, x in enumerate(np.arange(-W / 2, W / 2, 0.2)):
        box((x + 0.1, -0.02, D / 2), (0.19, 0.04, D), mat('floor%d' % k, jitter(hexrgb('#8a5a32'), 0.15, rnd)))
    box((0, H + 0.02, D / 2), (W, 0.04, D), PINE[0])
    for z in (0.8, 1.9):
        box((0, H - 0.1, z), (W, 0.18, 0.16), DARKW)
    # furniture per variant
    fabric = [hexrgb(h) for h in ('#8c2f2a', '#2f4d6b', '#6b7a3a', '#7a5a8c')][variant]
    if variant == 0:       # living room: sofa, framed picture, standard lamp, bookshelf
        box((0, 0.22, D - 0.45), (1.5, 0.44, 0.8), mat('sofa', fabric))
        box((0, 0.6, D - 0.12), (1.5, 0.5, 0.2), mat('sofab', fabric))
        box((0, 1.6, D - 0.02), (0.8, 0.55, 0.03), mat('frame', hexrgb('#3a2a1c')))
        box((0, 1.6, D - 0.035), (0.7, 0.45, 0.02), mat('canvas', hexrgb('#5f8fb0')))
        box((-1.0, 0.9, 1.6), (0.35, 1.8, 0.9), DARKW)
        for k in range(18):
            box((-0.95, 0.35 + (k // 6) * 0.55, 1.25 + (k % 6) * 0.12), (0.22, 0.32, 0.09), mat('book%d' % k, jitter(rnd.choice([hexrgb('#aa3333'), hexrgb('#333355'), hexrgb('#cccc99'), hexrgb('#336633')]), 0.3, rnd)))
        box((1.0, 0.8, 2.2), (0.05, 1.6, 0.05), DARKW); box((1.0, 1.65, 2.2), (0.35, 0.25, 0.35), mat('shade', hexrgb('#ffe2a8'), emit=6))
    elif variant == 1:     # kitchen: cabinets, hanging lamp, window plants
        box((0, 0.45, D - 0.3), (2.2, 0.9, 0.6), DARKW); box((0, 0.92, D - 0.3), (2.25, 0.05, 0.62), mat('top', hexrgb('#d8d2c4')))
        for x in (-0.7, 0, 0.7):
            box((x, 1.75, D - 0.18), (0.62, 0.6, 0.35), PINE[2])
        box((0, 2.0, 1.4), (0.02, 0.9, 0.02), DARKW); box((0, 1.5, 1.4), (0.45, 0.2, 0.45), mat('lamp', hexrgb('#ffd590'), emit=8))
        box((0, 0.45, 1.3), (1.1, 0.06, 0.7), PINE[1])
        for x in (-0.4, 0.4):
            box((x, 0.22, 1.3), (0.06, 0.44, 0.6), DARKW)
    elif variant == 2:     # bedroom: bed with quilt, bedside lamp, wardrobe
        box((0.2, 0.3, D - 1.0), (1.4, 0.4, 2.0), DARKW); box((0.2, 0.55, D - 1.0), (1.35, 0.15, 1.9), mat('quilt', fabric))
        box((0.2, 0.68, D - 0.2), (1.2, 0.18, 0.35), mat('pillow', hexrgb('#f0ece4')))
        box((-0.9, 0.3, D - 0.3), (0.4, 0.6, 0.4), PINE[3]); box((-0.9, 0.75, D - 0.3), (0.25, 0.3, 0.25), mat('blamp', hexrgb('#ffdca0'), emit=6))
        box((1.05, 1.0, 1.2), (0.4, 2.0, 1.1), DARKW)
    else:                  # stairwell: steps going up the back wall, a window light, coat hooks
        for k in range(9):
            box((0.3, 0.1 + k * 0.2, D - 0.2 - k * 0.0), (1.2, 0.2, 0.3 + k * 0.0), PINE[k % 4])
            box((0.3, 0.1 + k * 0.2, D - 0.5), (1.2, 0.04, 0.02), DARKW)
        box((-0.9, 1.6, D - 0.02), (0.4, 0.6, 0.02), mat('skylight', hexrgb('#cfe6ff'), emit=3))
        for x in (-0.95, -0.7):
            box((x, 1.3, 0.8), (0.18, 0.7, 0.12), mat('coat', jitter(fabric, 0.2, rnd)))
    # light: warm ceiling glow + soft fill from the window side
    l = bpy.data.lights.new('ceil', 'AREA'); l.energy = 180; l.color = (1.0, 0.82, 0.62); l.size = 1.2
    lo = bpy.data.objects.new('ceil', l); sc.collection.objects.link(lo); lo.location = (0, D * 0.55, H - 0.05); lo.rotation_euler = (math.pi, 0, 0)
    f = bpy.data.lights.new('fill', 'AREA'); f.energy = 60; f.color = (0.8, 0.88, 1.0); f.size = 2.0
    fo = bpy.data.objects.new('fill', f); sc.collection.objects.link(fo); fo.location = (0, -0.2, H * 0.6); fo.rotation_euler = (-math.pi / 2, 0, 0)
    # camera one room-depth in front of the window plane, framing exactly the W x H opening
    cam = bpy.data.cameras.new('cam'); cam.sensor_fit = 'HORIZONTAL'; cam.sensor_width = 36
    cam.lens = 36 * D / W            # horizontal field covers W at distance D
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co)
    co.location = (0, -D, H / 2); co.rotation_euler = (math.pi / 2, 0, 0); sc.camera = co
    sc.render.resolution_x = sc.render.resolution_y = 256
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path)
    return np.array(img.pixels[:], np.float32).reshape(256, 256, 4)[..., :3]


def rooms_atlas():
    tmp = os.path.join(ASSETS, '_room_tmp.png')
    tiles = [room(v, tmp) for v in range(4)]
    os.remove(tmp)
    atlas = np.concatenate(tiles, 1)                         # 1024 x 256, Blender rows bottom-up
    out = np.concatenate([atlas, np.ones(atlas.shape[:2] + (1,), np.float32)], -1)
    img = bpy.data.images.new('rooms', 1024, 256, alpha=False)
    img.pixels = out.ravel().tolist()
    sc = bpy.context.scene; sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 88
    path = os.path.join(ASSETS, 'rooms_atlas.jpg'); img.save_render(path, scene=sc)
    print('wrote rooms_atlas.jpg', os.path.getsize(path))


def baluster_mask(ob):
    """Front silhouette of the carved plank as a 128x256 mask (white = wood): the game cuts it out of a plain board
    with alpha testing, 12 triangles instead of ~470 for the modelled plank."""
    sc = bpy.context.scene
    for o in list(sc.objects):
        if o is not ob:
            o.hide_render = True
    m = bpy.data.materials.new('w'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new('ShaderNodeEmission'); out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs[0], out.inputs['Surface'])
    ob.data.materials.clear(); ob.data.materials.append(m)
    ob.scale.x = 0.5                     # unit plank (1 x 1) into the 1:2 portrait frame (0.5 x 1 at ortho scale 1)
    cam = bpy.data.cameras.new('mc'); cam.type = 'ORTHO'; cam.ortho_scale = 1.0
    co = bpy.data.objects.new('mc', cam); sc.collection.objects.link(co)
    co.location = (0, -3, 0); co.rotation_euler = (math.pi / 2, 0, 0); sc.camera = co      # looking at the game's +z face
    sc.render.resolution_x, sc.render.resolution_y = 128, 256; sc.render.pixel_aspect_x = 1
    cam.sensor_fit = 'VERTICAL'
    sc.render.film_transparent = True; sc.cycles.samples = 8
    tmp = os.path.join(ASSETS, '_mask_tmp.png'); sc.render.filepath = tmp
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    bpy.ops.render.render(write_still=True)
    px = np.array(bpy.data.images.load(tmp).pixels[:], np.float32).reshape(256, 128, 4)
    a = px[..., 3:4]
    img = bpy.data.images.new('mask', 128, 256, alpha=False)
    img.pixels = np.concatenate([a, a, a, np.ones_like(a)], -1).ravel().tolist()
    img.filepath_raw = os.path.join(ASSETS, 'baluster_mask.png'); img.file_format = 'PNG'; img.save()
    os.remove(tmp)
    print('wrote baluster_mask.png')


def main():
    rooms_atlas()
    reset()
    slab = snowslab()
    slab.scale = (10, 0.6, 6) if False else slab.scale
    bake_ao_to_vertex_colors([slab], samples=48, distance=0.25, strength=0.6, floor=0.45)
    gear = [skis(), snowboard()]
    for i, ob in enumerate(gear):
        ob.location.x = 3 + i * 2
    bake_ao_to_vertex_colors(gear, samples=32, distance=0.1, strength=0.5, floor=0.5)
    for ob in gear:
        ob.location.x = 0
    print('tris', {o.name: tri_count([o]) for o in [slab] + gear})
    export_glb([slab] + gear, 'building_parts.glb')
    reset()
    baluster_mask(baluster())


main()
