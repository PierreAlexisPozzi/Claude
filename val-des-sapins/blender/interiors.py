"""Shop and lift-station interiors for Val des Sapins (interior mapping), plus the shop signs.

Outputs (val-des-sapins/assets):
- shops_atlas.jpg   2048x256: eight ground-floor shops rendered with Cycles, one 256x256 tile each, from a camera one
                    room-depth in front of the window plane (same projection as rooms_atlas.jpg):
                    0 ski rental (Skiset), 1 grocery (Spar), 2 sports shop (Sport 2000), 3 cheese restaurant,
                    4 butcher-charcuterie, 5 cheese shop, 6 souvenirs, 7 bakery
- lift_atlas.jpg    512x256: lift operator cabin (control desk, screens, panel, chair) and drive room (bullwheel
                    gearbox, motor, electrical cabinets)
- shop_signs.png    512x1024: the eight fascia signs (plain lettering on painted boards, no logos), 512x128 each,
                    top to bottom in the same order as the shops

Run: python blender/interiors.py   (with bpy==5.3.0)
"""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, numpy as np
from vds_common import reset, hexrgb, jitter, ASSETS

W, H, D = 2.5, 2.5, 3.0


class Room:
    def __init__(self, seed):
        self.sc = reset(); self.sc.cycles.samples = 48; self.rnd = random.Random(seed); self.mats = {}

    def mat(self, rgb, emit=0.0, rough=0.6, key=None):
        k = key or (tuple(round(c, 3) for c in rgb), emit, rough)
        if k in self.mats:
            return self.mats[k]
        m = bpy.data.materials.new('m%d' % len(self.mats)); m.use_nodes = True
        bs = m.node_tree.nodes['Principled BSDF']
        lin = tuple(c ** 2.2 for c in rgb)
        bs.inputs['Base Color'].default_value = (*lin, 1); bs.inputs['Roughness'].default_value = rough
        if emit:
            bs.inputs['Emission Color'].default_value = (*lin, 1); bs.inputs['Emission Strength'].default_value = emit
        self.mats[k] = m
        return m

    def box(self, c, s, rgb, **kw):
        """centre/size in room coordinates: x across, y up (0 = floor), z depth (0 = window plane, D = back wall)."""
        bpy.ops.mesh.primitive_cube_add(size=1, location=(c[0], c[2], c[1]))
        o = bpy.context.active_object; o.scale = (s[0], s[2], s[1]); o.data.materials.append(self.mat(rgb, **kw)); return o

    def cyl(self, c, r, h, rgb, axis='y', **kw):
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=16, location=(c[0], c[2], c[1]))
        o = bpy.context.active_object
        if axis == 'x': o.rotation_euler = (0, math.pi / 2, 0)
        if axis == 'z': o.rotation_euler = (math.pi / 2, 0, 0)
        o.data.materials.append(self.mat(rgb, **kw)); return o

    def ball(self, c, r, rgb, sy=1.0, **kw):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=12, ring_count=8, location=(c[0], c[2], c[1]))
        o = bpy.context.active_object; o.scale = (1, 1, sy); o.data.materials.append(self.mat(rgb, **kw)); return o

    def shell(self, wall, floor, ceil, back=None):
        self.box((0, H / 2, D + 0.02), (W, H, 0.04), back or wall)
        for s in (-1, 1):
            self.box((s * (W / 2 + 0.02), H / 2, D / 2), (0.04, H, D), wall)
        self.box((0, -0.02, D / 2), (W, 0.04, D), floor, rough=0.35)
        self.box((0, H + 0.02, D / 2), (W, 0.04, D), ceil)

    def lights(self, warm=1.0, energy=220, tube=False):
        col = (1.0, 0.86 if warm else 0.97, 0.7 if warm else 0.95)
        if tube:
            for z in (0.9, 2.1):
                self.box((0, H - 0.04, z), (1.6, 0.04, 0.12), (1, 1, 1), emit=6)
        l = bpy.data.lights.new('ceil', 'AREA'); l.energy = energy; l.color = col; l.size = 1.6
        lo = bpy.data.objects.new('ceil', l); self.sc.collection.objects.link(lo); lo.location = (0, D * 0.5, H - 0.08); lo.rotation_euler = (math.pi, 0, 0)
        f = bpy.data.lights.new('fill', 'AREA'); f.energy = 70; f.color = (0.85, 0.9, 1.0); f.size = 2.2
        fo = bpy.data.objects.new('fill', f); self.sc.collection.objects.link(fo); fo.location = (0, -0.2, H * 0.6); fo.rotation_euler = (-math.pi / 2, 0, 0)

    def render(self, path, size=256):
        cam = bpy.data.cameras.new('cam'); cam.sensor_fit = 'HORIZONTAL'; cam.sensor_width = 36; cam.lens = 36 * D / W
        co = bpy.data.objects.new('cam', cam); self.sc.collection.objects.link(co)
        co.location = (0, -D, H / 2); co.rotation_euler = (math.pi / 2, 0, 0); self.sc.camera = co
        self.sc.render.resolution_x = self.sc.render.resolution_y = size; self.sc.render.filepath = path
        bpy.ops.render.render(write_still=True)
        return np.array(bpy.data.images.load(path).pixels[:], np.float32).reshape(size, size, 4)[..., :3]


BRIGHT = [hexrgb(h) for h in ('#d8342c', '#1f5fbf', '#f2b51d', '#2f9e6a', '#e8e8ea', '#8e44ad', '#f07c1f', '#2a2d33', '#19a7b8')]


def shelves(R, x, z0, z1, levels, item):
    """a run of shelves along a side wall (x = wall position), item(y, z) places the goods"""
    for k in range(levels):
        y = 0.35 + k * 0.45
        R.box((x, y, (z0 + z1) / 2), (0.4, 0.03, z1 - z0), hexrgb('#d9d4c8'))
        z = z0 + 0.08
        while z < z1 - 0.08:
            z = item(y, z)


def shop(variant, path):
    R = Room(200 + variant); r = R.rnd
    if variant == 0:    # ski rental: walls of skis, boots on shelves, counter
        R.shell(hexrgb('#f2f0ec'), hexrgb('#6b6f75'), hexrgb('#f4f4f4'), back=hexrgb('#c8302a'))
        for side in (-1, 1):
            for k in range(16):
                z = 0.4 + k * 0.16
                R.box((side * (W / 2 - 0.1), 0.95, z), (0.05, 1.7, 0.09), jitter(r.choice(BRIGHT), 0.15, r), rough=0.3)
        for k in range(10):
            R.box((-0.9 + k * 0.2, 1.75, D - 0.12), (0.14, 0.18, 0.18), jitter(r.choice(BRIGHT), 0.1, r))
            R.box((-0.9 + k * 0.2, 1.3, D - 0.12), (0.14, 0.18, 0.18), jitter(r.choice(BRIGHT), 0.1, r))
        R.box((0, 0.5, 1.6), (1.4, 1.0, 0.5), hexrgb('#3a3d44')); R.box((0.3, 1.12, 1.6), (0.35, 0.25, 0.04), hexrgb('#9fd0ff'), emit=2)
        R.lights(warm=0, tube=True)
    elif variant == 1:  # grocery: two rows of gondolas going back, chilled cabinet on the right, checkout on the left
        R.shell(hexrgb('#f4f4f2'), hexrgb('#d8d6d0'), hexrgb('#ffffff'), back=hexrgb('#2f8a3c'))
        for gx in (-0.45, 0.45):
            R.box((gx, 0.65, 2.1), (0.42, 1.3, 1.5), hexrgb('#e0ded8'))
            for lv in range(4):
                for k in range(11):
                    for sd in (-1, 1):
                        R.box((gx + sd * 0.23, 0.22 + lv * 0.3, 1.42 + k * 0.13), (0.05, 0.22, 0.11), jitter(r.choice(BRIGHT), 0.25, r))
        for lv in range(4):
            for k in range(14):
                R.box((-1.05 + k * 0.15, 0.3 + lv * 0.38, D - 0.1), (0.12, 0.26, 0.08), jitter(r.choice(BRIGHT), 0.25, r))
        R.box((W / 2 - 0.2, 0.95, 1.7), (0.35, 1.9, 1.6), hexrgb('#d8ecff'), emit=1.2, rough=0.1)
        R.box((-1.0, 0.45, 0.8), (0.4, 0.9, 0.6), hexrgb('#3a3d44')); R.box((-1.0, 0.93, 0.8), (0.42, 0.05, 0.62), hexrgb('#9aa0a8'))
        R.lights(warm=0, energy=180, tube=True)
    elif variant == 2:  # sports shop: jacket racks, mannequins, shoe wall
        R.shell(hexrgb('#ecebe7'), hexrgb('#b98a55'), hexrgb('#f4f4f4'), back=hexrgb('#1d3f8a'))
        for rx in (-0.7, 0.2):
            R.box((rx, 1.4, 1.8), (0.9, 0.03, 0.03), hexrgb('#9aa0a8'))
            for k in range(8):
                R.box((rx - 0.38 + k * 0.11, 1.0, 1.8), (0.08, 0.75, 0.35), jitter(r.choice(BRIGHT), 0.2, r))
        for mx in (0.9,):
            R.box((mx, 0.5, 2.4), (0.1, 1.0, 0.1), hexrgb('#d8d8d8')); R.box((mx, 1.2, 2.4), (0.4, 0.55, 0.25), hexrgb('#d8342c')); R.ball((mx, 1.62, 2.4), 0.11, hexrgb('#d8d8d8'))
        for k in range(12):
            R.box((-1.0 + (k % 6) * 0.35, 1.5 + (k // 6) * 0.3, D - 0.1), (0.22, 0.1, 0.12), jitter(r.choice(BRIGHT), 0.2, r))
        R.lights(warm=0, energy=240)
    elif variant == 3:  # cheese restaurant: panelling, checked cloths, caquelons, cowbells, warm light
        pine = hexrgb('#a8763f')
        R.shell(pine, hexrgb('#6b4426'), pine)
        for tx, tz in ((-0.6, 1.1), (0.6, 1.1), (-0.6, 2.3), (0.6, 2.3)):
            R.box((tx, 0.74, tz), (0.85, 0.04, 0.75), hexrgb('#b8302a'))
            for k in range(3):
                R.box((tx - 0.28 + k * 0.28, 0.765, tz), (0.13, 0.005, 0.75), hexrgb('#f4f0e8'))
            R.cyl((tx, 0.84, tz), 0.09, 0.14, hexrgb('#5a2a1a')); R.ball((tx, 0.92, tz), 0.06, hexrgb('#f0d070'), sy=0.4)
            R.box((tx, 0.37, tz), (0.08, 0.74, 0.08), hexrgb('#4a2e1a'))
            for sx in (-1, 1):
                R.box((tx + sx * 0.55, 0.45, tz), (0.35, 0.05, 0.35), hexrgb('#4a2e1a'))
        for k in range(5):
            R.cyl((-1.0 + k * 0.5, 2.15, D - 0.15), 0.07, 0.14, hexrgb('#c9a23a'), rough=0.3)
        R.box((0, 2.3, 1.7), (0.3, 0.08, 0.3), hexrgb('#ffcf80'), emit=7)
        R.lights(warm=1, energy=160)
    elif variant == 4:  # butcher-charcuterie: tiles, chilled counter with meat, hanging sausages
        R.shell(hexrgb('#f2f2ee'), hexrgb('#8a2e2a'), hexrgb('#f6f6f6'), back=hexrgb('#e9e6df'))
        R.box((0, 0.45, 1.2), (2.2, 0.9, 0.6), hexrgb('#e8e8e8'), rough=0.2)
        R.box((0, 0.95, 1.0), (2.2, 0.35, 0.04), hexrgb('#cfe6f2'), rough=0.05)
        for k in range(10):
            R.box((-0.95 + k * 0.21, 0.92, 1.2), (0.17, 0.06, 0.4), jitter(r.choice([hexrgb('#b8332e'), hexrgb('#d9776a'), hexrgb('#8c2a22'), hexrgb('#e0a08a')]), 0.12, r))
        R.box((0, 2.05, 2.4), (2.2, 0.03, 0.03), hexrgb('#9aa0a8'))
        for k in range(14):
            R.cyl((-1.0 + k * 0.155, 1.75, 2.4), 0.035, 0.55, jitter(hexrgb('#7a2a1e'), 0.2, r))
        for k in range(4):
            R.ball((-0.6 + k * 0.4, 1.55, 2.7), 0.12, hexrgb('#b05040'), sy=1.6)
        R.lights(warm=0, tube=True)
    elif variant == 5:  # cheese shop: shelves of wheels, counter, wooden boards
        R.shell(hexrgb('#efe6d4'), hexrgb('#7a5a3a'), hexrgb('#f2ece0'), back=hexrgb('#8a6a40'))
        for lv in range(4):
            y = 0.4 + lv * 0.45
            R.box((0, y, D - 0.25), (2.3, 0.04, 0.45), hexrgb('#8a5a32'))
            x = -1.05
            while x < 1.05:
                rr = r.uniform(0.12, 0.2)
                R.cyl((x + rr, y + 0.06, D - 0.25), rr, 0.1 + r.random() * 0.06, jitter(r.choice([hexrgb('#e9c36a'), hexrgb('#d9a845'), hexrgb('#f0dc9a'), hexrgb('#c98a3a')]), 0.08, r))
                x += 2 * rr + 0.03
        R.box((0, 0.5, 1.1), (2.0, 1.0, 0.55), hexrgb('#6b4426'))
        for k in range(6):
            R.cyl((-0.8 + k * 0.32, 1.06, 1.1), 0.13, 0.1, hexrgb('#f0d070'))
        R.lights(warm=1, energy=200)
    elif variant == 6:  # souvenirs: postcards, cowbells, plush, colourful shelves
        R.shell(hexrgb('#f3efe6'), hexrgb('#9a6a3a'), hexrgb('#f6f2ea'), back=hexrgb('#2a6a9a'))
        for side in (-1, 1):
            shelves(R, side * (W / 2 - 0.22), 0.5, 2.8, 4, lambda y, z: (R.box((side * (W / 2 - 0.22), y + 0.08, z), (0.25, 0.14, 0.1), jitter(r.choice(BRIGHT), 0.2, r)), z + 0.14)[1])
        R.cyl((0, 0.9, 1.6), 0.03, 1.8, hexrgb('#9aa0a8'))
        for k in range(16):
            a = k / 16 * 6.283
            R.box((math.cos(a) * 0.18, 0.6 + (k % 4) * 0.3, 1.6 + math.sin(a) * 0.18), (0.1, 0.14, 0.02), jitter(r.choice(BRIGHT), 0.2, r))
        for k in range(5):
            R.ball((-0.8 + k * 0.4, 0.25, 2.6), 0.15, jitter(r.choice([hexrgb('#f4f0e8'), hexrgb('#8a6a4a'), hexrgb('#e8c8a0')]), 0.1, r))
        R.lights(warm=1, energy=220)
    else:               # bakery: counter with bread, baskets of baguettes
        R.shell(hexrgb('#f2e8d8'), hexrgb('#9a6a3a'), hexrgb('#f6efe4'), back=hexrgb('#b07a40'))
        R.box((0, 0.5, 1.2), (2.2, 1.0, 0.55), hexrgb('#6b4426')); R.box((0, 1.02, 1.2), (2.2, 0.04, 0.55), hexrgb('#e8e0d0'))
        for k in range(9):
            R.ball((-0.9 + k * 0.22, 1.1, 1.2), 0.08, jitter(hexrgb('#c98a3a'), 0.1, r), sy=0.6)
        for lv in range(3):
            R.box((0, 0.6 + lv * 0.5, D - 0.2), (2.2, 0.04, 0.4), hexrgb('#8a5a32'))
            for k in range(12):
                R.ball((-1.0 + k * 0.18, 0.7 + lv * 0.5, D - 0.2), 0.07, jitter(hexrgb('#d9a055'), 0.15, r), sy=0.8)
        for k in range(6):
            R.cyl((0.95, 1.5, 2.0 + k * 0.05), 0.025, 0.7, hexrgb('#d9a055'))
        R.lights(warm=1, energy=210)
    return R.render(path)


def lift_room(variant, path):
    R = Room(300 + variant); r = R.rnd
    if variant == 0:    # operator cabin: control desk with screens and buttons, chair, radio, rota board
        R.shell(hexrgb('#dfe3e8'), hexrgb('#5b6068'), hexrgb('#eef0f2'))
        R.box((0, 0.42, 1.0), (2.2, 0.84, 0.7), hexrgb('#3d434c'))
        R.box((0, 0.9, 0.85), (2.2, 0.12, 0.4), hexrgb('#5a616b'))
        for k in range(18):
            R.box((-0.9 + (k % 9) * 0.22, 0.97, 0.75 + (k // 9) * 0.15), (0.06, 0.03, 0.06), r.choice([hexrgb('#e03a2a'), hexrgb('#2fbf4a'), hexrgb('#f2c21d'), hexrgb('#f4f4f4')]), emit=3)
        for sx in (-0.7, 0.0, 0.7):
            R.box((sx, 1.25, 1.25), (0.55, 0.36, 0.04), hexrgb('#6fb6ff'), emit=2.5)
        R.box((0.2, 0.5, 1.7), (0.45, 0.08, 0.45), hexrgb('#2a2d33')); R.box((0.2, 0.8, 1.92), (0.45, 0.6, 0.06), hexrgb('#2a2d33'))
        R.box((0, 1.6, D - 0.03), (1.4, 0.8, 0.02), hexrgb('#f4f4f4')); R.box((-0.9, 1.2, D - 0.2), (0.5, 2.0, 0.35), hexrgb('#8a9098'))
        R.box((1.0, 1.7, 2.4), (0.25, 0.12, 0.12), hexrgb('#ff6a14'))   # hi-vis jacket on a hook
        R.box((1.0, 1.35, 2.4), (0.3, 0.6, 0.15), hexrgb('#ff6a14'))
        R.lights(warm=0, tube=True)
    else:               # drive room: green gearbox, motor, electrical cabinets with lamps
        R.shell(hexrgb('#c9ccd0'), hexrgb('#55595f'), hexrgb('#d8dadd'))
        R.box((0, 0.6, 2.0), (1.6, 1.2, 1.0), hexrgb('#2f7a46'), rough=0.4)
        R.cyl((0, 1.35, 2.0), 0.35, 1.2, hexrgb('#2f7a46'), axis='x', rough=0.4)
        R.cyl((-1.0, 0.7, 2.0), 0.25, 0.7, hexrgb('#3a6fb0'), axis='x', rough=0.35)
        R.cyl((0, 2.1, 2.0), 0.55, 0.12, hexrgb('#3b3f45'), rough=0.3)
        for k in range(4):
            R.box((-1.0 + k * 0.6, 1.0, D - 0.15), (0.5, 2.0, 0.3), hexrgb('#b8bcc2'))
            for j in range(3):
                R.box((-1.0 + k * 0.6 - 0.12 + j * 0.12, 1.7, D - 0.32), (0.05, 0.05, 0.02), r.choice([hexrgb('#2fbf4a'), hexrgb('#f2c21d'), hexrgb('#e03a2a')]), emit=4)
        R.box((0.9, 0.06, 1.0), (0.6, 0.12, 1.8), hexrgb('#f2c21d'))      # yellow walkway
        R.lights(warm=0, tube=True)
    return R.render(path)


def signs():
    """Fascia boards: painted wood or enamel colours, plain lettering rendered from Blender text objects."""
    spec = [('SKISET', 'Location de skis', '#c8302a', '#ffffff'), ('SPAR', 'Alimentation', '#2f8a3c', '#ffffff'),
            ('SPORT 2000', 'Sport · Mode', '#1d3f8a', '#ffffff'), ('LE CAQUELON', 'Fondue · Raclette', '#5a3a22', '#f2d39a'),
            ('BOUCHERIE', 'Charcuterie', '#8a2a24', '#f4efe6'), ('FROMAGERIE', 'Beaufort · Reblochon', '#6b4a24', '#f2d39a'),
            ('SOUVENIRS', 'Cadeaux · Cartes', '#2a6a9a', '#ffffff'), ('BOULANGERIE', 'Pâtisserie', '#7a4a24', '#f6e2b0')]
    tiles = []
    tmp = os.path.join(ASSETS, '_sign_tmp.png')
    for name, sub, bg, fg in spec:
        sc = reset(); sc.cycles.samples = 16; sc.view_settings.view_transform = 'Standard'
        def emat(h):
            m = bpy.data.materials.new(h); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
            e = nt.nodes.new('ShaderNodeEmission'); o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs['Surface'])
            e.inputs['Color'].default_value = (*[c ** 2.2 for c in hexrgb(h)], 1); return m
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0)); bd = bpy.context.active_object; bd.scale = (4, 1, 1); bd.data.materials.append(emat(bg))
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0.001)); fr = bpy.context.active_object; fr.scale = (3.9, 0.9, 1); fr.data.materials.append(emat(bg))
        for txt, size, y in ((name, 0.42, 0.08), (sub, 0.16, -0.3)):
            bpy.ops.object.text_add(location=(0, y, 0.01)); t = bpy.context.active_object
            t.data.body = txt; t.data.align_x = 'CENTER'; t.data.align_y = 'CENTER'; t.data.size = size; t.data.space_character = 1.05
            t.data.materials.append(emat(fg))
        cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 4.0
        co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); co.location = (0, 0, 3); sc.camera = co
        sc.render.resolution_x, sc.render.resolution_y = 512, 128; sc.render.filepath = tmp
        bpy.ops.render.render(write_still=True)
        tiles.append(np.array(bpy.data.images.load(tmp).pixels[:], np.float32).reshape(128, 512, 4)[..., :3])
    os.remove(tmp)
    atlas = np.concatenate(tiles[::-1], 0)                 # Blender rows bottom-up: first sign ends at the top of the file
    img = bpy.data.images.new('signs', 512, 1024, alpha=False)
    img.pixels = np.concatenate([atlas, np.ones(atlas.shape[:2] + (1,), np.float32)], -1).ravel().tolist()
    img.filepath_raw = os.path.join(ASSETS, 'shop_signs.png'); img.file_format = 'PNG'; img.save()
    print('wrote shop_signs.png')


def save_atlas(tiles, name):
    atlas = np.concatenate(tiles, 1)
    img = bpy.data.images.new(name, atlas.shape[1], atlas.shape[0], alpha=False)
    img.pixels = np.concatenate([atlas, np.ones(atlas.shape[:2] + (1,), np.float32)], -1).ravel().tolist()
    sc = bpy.context.scene; sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 88
    path = os.path.join(ASSETS, name + '.jpg'); img.save_render(path, scene=sc)
    print('wrote', name + '.jpg', os.path.getsize(path))


def main():
    tmp = os.path.join(ASSETS, '_int_tmp.png')
    save_atlas([shop(v, tmp) for v in range(8)], 'shops_atlas')
    save_atlas([lift_room(v, tmp) for v in range(2)], 'lift_atlas')
    os.remove(tmp)
    signs()


main()
