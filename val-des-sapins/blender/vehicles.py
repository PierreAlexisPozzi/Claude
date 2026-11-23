"""Vehicles for Val des Sapins: a modern mountain snowmobile (own design).

Run:  .bpyenv/bin/python blender/vehicles.py   ->  assets/snowmobile.glb

The game's procedural sled set the rider's hard points, which this model keeps so the existing seated pose fits:
seat top ~0.9 m, running boards at y 0.42 (feet at x +-0.4), grips at x +-0.38, y 1.04, z 0.22, track 0.56 m wide.
Game frame: x right, y up, +z forward, origin on the snow under the middle of the machine.

Exported meshes (one per material class, the game assigns its own PBR materials):
  sled_paint  glossy body panels (red, white stripe, dark belly pan)
  sled_dark   seat, tunnel, track, skis, bumpers, grips (matte)
  sled_metal  A-arms, spindles, springs, handlebar, idler wheels
  sled_glass  windshield (transparent, no shadow)
  sled_lamp   headlight and tail-light lenses (emissive)
"""
import math
import bpy
from mathutils import Vector
from vds_common import reset, MeshBuilder, hexrgb, bake_ao_to_vertex_colors, export_glb, tri_count


def G(x, y, z):
    return Vector((x, -z, y))


RED, WHITE, BELLY = hexrgb('#d01f2b'), hexrgb('#eef1f4'), hexrgb('#24272d')
BLACK, SEATG, TUN = hexrgb('#17181b'), hexrgb('#3b3e45'), hexrgb('#2d3037')
STEEL, YELLOW, RUBBER = hexrgb('#a3aab3'), hexrgb('#e7b42c'), hexrgb('#121315')


class B(MeshBuilder):
    """MeshBuilder fed with game coordinates; colours may be a function of the face centre."""

    def gv(self, p):
        return self.vert(G(*p))

    def gface(self, idx, col):
        if callable(col):
            c = Vector((0, 0, 0))
            for i in idx:
                c += Vector(self.v[i])
            c /= len(idx)
            col = col(Vector((c.x, c.z, -c.y)))      # back to game coordinates
        self.face(idx, None, col)


def squircle(z, cx, cy, w, h, n=28, p=4.0, crown=0.0, flat_bottom=0.0):
    """Closed section in the x-y plane at depth z: a superellipse, crowned on top, optionally flattened below."""
    pts = []
    for i in range(n):
        t = i / n * 2 * math.pi
        c, s = math.cos(t), math.sin(t)
        x = w / 2 * math.copysign(abs(c) ** (2 / p), c)
        y = h / 2 * math.copysign(abs(s) ** (2 / p), s)
        if s > 0:
            y += crown * (1 - (2 * x / w) ** 2) * h
        elif flat_bottom:
            y = max(y, -h / 2 * (1 - flat_bottom)) if s < 0 else y
        pts.append((cx + x, cy + y, z))
    return pts


def loft(mb, sections, col, cap0=True, cap1=True, closed=True):
    rings = [[mb.gv(p) for p in sec] for sec in sections]
    n = len(rings[0])
    for i in range(len(rings) - 1):
        for s in range(n if closed else n - 1):
            s1 = (s + 1) % n
            mb.gface((rings[i][s], rings[i][s1], rings[i + 1][s1], rings[i + 1][s]), col)
    for cap, r, rev in ((cap0, rings[0], True), (cap1, rings[-1], False)):
        if not cap:
            continue
        c = Vector((0, 0, 0))
        for i in r:
            c += Vector(mb.v[i])
        ci = mb.vert(c / len(r))
        for s in range(n):
            a, b = r[s], r[(s + 1) % n]
            mb.gface((ci, b, a) if rev else (ci, a, b), col)


def tube(mb, path, r, col, sides=8, caps=True):
    path = [Vector(p) for p in path]
    rings = []
    for i, p in enumerate(path):
        d = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        a = Vector((0, 1, 0)) if abs(d.y) < 0.9 else Vector((1, 0, 0))
        u = d.cross(a).normalized(); w = d.cross(u).normalized()
        rr = r[i] if isinstance(r, (list, tuple)) else r
        rings.append([mb.gv(p + (u * math.cos(t) + w * math.sin(t)) * rr) for t in (k / sides * 2 * math.pi for k in range(sides))])
    for i in range(len(rings) - 1):
        for s in range(sides):
            s1 = (s + 1) % sides
            mb.gface((rings[i][s], rings[i][s1], rings[i + 1][s1], rings[i + 1][s]), col)
    if caps:
        for r_, end in ((rings[0], path[0]), (rings[-1], path[-1])):
            ci = mb.gv(end)
            for s in range(sides):
                mb.gface((ci, r_[(s + 1) % sides], r_[s]), col)


def box(mb, c, size, col, yaw=0.0, pitch=0.0):
    cx, cy, cz = c; sx, sy, sz = (v / 2 for v in size)
    cp, sp, cyw, syw = math.cos(pitch), math.sin(pitch), math.cos(yaw), math.sin(yaw)
    def T(x, y, z):
        y, z = y * cp - z * sp, y * sp + z * cp
        x, z = x * cyw + z * syw, -x * syw + z * cyw
        return (cx + x, cy + y, cz + z)
    v = [mb.gv(T(x, y, z)) for x in (-sx, sx) for y in (-sy, sy) for z in (-sz, sz)]
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        mb.gface(tuple(v[i] for i in f), col)


def lerp(a, b, t):
    return a + (b - a) * t


def interp(table, z):
    """Piecewise-linear lookup in [(z, a, b, ...), ...] sorted by z."""
    if z <= table[0][0]:
        return table[0][1:]
    for a, b in zip(table, table[1:]):
        if z <= b[0]:
            t = (z - a[0]) / (b[0] - a[0])
            return tuple(lerp(x, y, t) for x, y in zip(a[1:], b[1:]))
    return table[-1][1:]


def smoothstep(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------------------------------------------- the machine
def body_paint():
    mb = B()
    # hood and side pods, console to nose: (z, width, top, bottom)
    prof = [(0.02, 0.84, 0.97, 0.36), (0.18, 0.92, 0.95, 0.33), (0.42, 0.92, 0.88, 0.30), (0.66, 0.84, 0.79, 0.29),
            (0.88, 0.72, 0.71, 0.29), (1.04, 0.6, 0.64, 0.31), (1.18, 0.44, 0.57, 0.34), (1.28, 0.26, 0.5, 0.38), (1.32, 0.1, 0.46, 0.41)]
    def col(c):
        top, bot = interp([(p[0], p[2], p[3]) for p in prof], c.z)
        k = (c.y - bot) / max(0.05, top - bot)
        if k < 0.3:
            return BELLY
        if k < 0.46 and abs(c.x) > 0.18:
            return WHITE                                      # side stripe
        if c.z > 0.45 and abs(c.x) < 0.05 and k > 0.85:
            return WHITE                                      # centre pin-stripe on the hood
        return RED
    secs = []
    for i in range(25):
        z = lerp(0.02, 1.32, i / 24)
        w, top, bot = interp([(p[0], p[1], p[2], p[3]) for p in prof], z)
        secs.append(squircle(z, 0, (top + bot) / 2, w, top - bot, n=32, p=3.6, crown=0.06))
    loft(mb, secs, col)
    return mb.obj('sled_paint')


def body_dark():
    mb = B()
    # console between hood and seat
    secs = [squircle(z, 0, lerp(0.79, 0.78, t), lerp(0.5, 0.78, t), lerp(0.34, 0.4, t), n=24, p=4.0, crown=0.04)
            for t, z in ((i / 6, lerp(-0.18, 0.08, i / 6)) for i in range(7))]
    loft(mb, secs, BLACK)
    # seat: long padded bench, rising to the console
    def scol(c):
        return SEATG if c.y < 0.71 else (BLACK if abs(c.x) < 0.19 else hexrgb('#2a2c31'))
    secs = []
    for i in range(17):
        z = lerp(-1.22, -0.12, i / 16)
        top = 0.885 + 0.04 * smoothstep(-0.45, -0.12, z) - 0.015 * smoothstep(-0.9, -1.22, z)
        secs.append(squircle(z, 0, (top + 0.62) / 2, 0.5 - 0.06 * smoothstep(-0.9, -1.22, z), top - 0.62, n=24, p=5.0, crown=0.05))
    loft(mb, secs, scol)
    # tunnel
    secs = [squircle(z, 0, y, 0.6, h, n=16, p=8.0) for z, y, h in ((-1.6, 0.55, 0.18), (-1.4, 0.5, 0.28), (-0.6, 0.45, 0.36), (0.06, 0.45, 0.36))]
    loft(mb, secs, TUN)
    # running boards with traction cut-outs (dark / light rows)
    for sx in (-1, 1):
        for k in range(12):
            z0 = lerp(-1.0, 0.26, k / 12); z1 = lerp(-1.0, 0.26, (k + 1) / 12)
            box(mb, (sx * 0.41, 0.425, (z0 + z1) / 2), (0.2, 0.035, z1 - z0 - 0.012), hexrgb('#3c4048') if k % 2 else hexrgb('#22252a'))
        box(mb, (sx * 0.515, 0.43, -0.37), (0.025, 0.06, 1.28), hexrgb('#2a2d33'))          # board edge
    # track: rubber band around the suspension, lugs outside
    loop = []
    for k in range(10):
        a = -math.pi / 2 - k / 9 * math.pi                     # rear idler arc
        loop.append((0.0, 0.17 + 0.15 * math.sin(a), -1.4 + 0.15 * math.cos(a)))
    loop.append((0.0, 0.33, -0.7))
    for k in range(10):
        a = math.pi / 2 - k / 9 * math.pi                      # drive sprocket arc
        loop.append((0.0, 0.2 + 0.15 * math.sin(a), -0.02 + 0.15 * math.cos(a)))
    loop.append((0.0, 0.03, -0.7))
    path = [Vector(p) for p in loop]
    # band: rectangular section swept around the closed loop
    rings = []
    for i, p in enumerate(path):
        d = (path[(i + 1) % len(path)] - path[i - 1]).normalized()
        n = Vector((1, 0, 0)).cross(d).normalized()            # outward normal in the y-z plane
        if n.dot(p - Vector((0, 0.18, -0.7))) < 0:
            n = -n
        rings.append([mb.gv(p + Vector((x, 0, 0)) + n * o) for x, o in ((-0.28, 0), (0.28, 0), (0.28, 0.03), (-0.28, 0.03))])
    for i in range(len(rings)):
        r0, r1 = rings[i], rings[(i + 1) % len(rings)]
        for s in range(4):
            mb.gface((r0[s], r0[(s + 1) % 4], r1[(s + 1) % 4], r1[s]), RUBBER)
    # lugs along the loop, every ~7 cm
    total = sum((path[(i + 1) % len(path)] - path[i]).length for i in range(len(path)))
    nl = int(total / 0.075)
    seglen = [(path[(i + 1) % len(path)] - path[i]).length for i in range(len(path))]
    for k in range(nl):
        s = k * total / nl; i = 0
        while s > seglen[i]:
            s -= seglen[i]; i += 1
        a, b = path[i], path[(i + 1) % len(path)]
        p = a.lerp(b, s / seglen[i]); d = (b - a).normalized()
        n = Vector((1, 0, 0)).cross(d).normalized()
        if n.dot(p - Vector((0, 0.18, -0.7))) < 0:
            n = -n
        c = p + n * 0.045
        pitch = math.atan2(d.y, d.z)
        for x in (-0.15, 0.15):
            box(mb, (x, c.y, c.z), (0.24, 0.03, 0.025), RUBBER, pitch=-pitch)
    # snow flap and rear bumper
    box(mb, (0, 0.3, -1.63), (0.56, 0.3, 0.012), BLACK, pitch=-0.12)
    box(mb, (0, 0.135, -1.65), (0.56, 0.04, 0.014), hexrgb('#4a4e56'), pitch=-0.12)
    # skis: flat base, curled tip, keel and handle loop
    for sx in (-1, 1):
        path = []
        for k in range(14):
            z = lerp(0.48, 1.52, k / 13)
            path.append((z, 0.03 + 0.2 * smoothstep(1.25, 1.62, z) ** 1.6))
        tip = [(1.58, 0.17), (1.62, 0.24), (1.6, 0.29)]
        path += tip
        secs = [squircle(z, sx * 0.5, y, 0.14 * (1 - 0.3 * smoothstep(1.4, 1.62, z)), 0.028, n=12, p=6.0) for z, y in path]
        loft(mb, secs, BLACK)
        box(mb, (sx * 0.5, 0.0, 0.95), (0.025, 0.03, 0.8), hexrgb('#5b616a'))             # carbide runner
        box(mb, (sx * 0.5, 0.07, 1.04), (0.09, 0.07, 0.24), hexrgb('#2a2d33'))            # spindle saddle
    # nose bumper loop and handlebar grips
    tube(mb, [(-0.24, 0.37, 1.22), (-0.15, 0.35, 1.38), (0, 0.345, 1.42), (0.15, 0.35, 1.38), (0.24, 0.37, 1.22)], 0.018, BLACK, sides=6)
    for sx in (-1, 1):
        tube(mb, [(sx * 0.29, 1.04, 0.22), (sx * 0.41, 1.04, 0.22)], 0.019, BLACK, sides=8)
        # hand guards
        tube(mb, [(sx * 0.24, 1.035, 0.235), (sx * 0.34, 1.07, 0.31), (sx * 0.44, 1.065, 0.27), (sx * 0.43, 1.04, 0.2)], 0.012, BLACK, sides=6)
        g = []
        for t in range(6):
            u = t / 5
            g.append([(sx * lerp(0.27, 0.43, u), lerp(1.04, 1.07, math.sin(u * math.pi)) - 0.03, lerp(0.29, 0.28, u)),
                      (sx * lerp(0.27, 0.43, u), lerp(1.04, 1.07, math.sin(u * math.pi)) + 0.035, lerp(0.31, 0.3, u))])
        loft(mb, g, hexrgb('#1f2126'), cap0=False, cap1=False, closed=False)
    # gauge pod
    box(mb, (0, 0.985, 0.335), (0.13, 0.05, 0.07), BLACK, pitch=-0.55)
    box(mb, (0, 1.003, 0.352), (0.1, 0.004, 0.045), hexrgb('#6d8aa3'), pitch=-0.55)
    # rear rack / grab handle
    tube(mb, [(-0.29, 0.66, -1.12), (-0.31, 0.75, -1.3), (-0.3, 0.74, -1.55), (0.3, 0.74, -1.55), (0.31, 0.75, -1.3), (0.29, 0.66, -1.12)], 0.016, BLACK, sides=6, caps=False)
    box(mb, (0, 0.6, -1.605), (0.3, 0.05, 0.02), hexrgb('#e3121b'))              # tail light
    return mb.obj('sled_dark')


def body_metal():
    mb = B()
    for sx in (-1, 1):
        tube(mb, [(sx * 0.5, 0.1, 1.05), (sx * 0.49, 0.48, 1.0)], 0.024, STEEL)                       # spindle
        for z in (0.82, 1.2):                                                                           # lower A-arm
            tube(mb, [(sx * 0.48, 0.2, 1.04), (sx * 0.19, 0.31, z)], 0.016, STEEL, sides=6)
        for z in (0.86, 1.14):                                                                          # upper A-arm
            tube(mb, [(sx * 0.48, 0.42, 1.0), (sx * 0.21, 0.47, z)], 0.015, STEEL, sides=6)
        a, b = Vector((sx * 0.44, 0.24, 1.0)), Vector((sx * 0.2, 0.6, 0.95))                           # shock and coil
        tube(mb, [a, b], 0.02, STEEL, sides=8)
        d = (b - a).normalized(); u = d.cross(Vector((0, 0, 1))).normalized(); w = d.cross(u)
        coil = [a.lerp(b, 0.15 + 0.6 * t / 60) + (u * math.cos(t * 0.75) + w * math.sin(t * 0.75)) * 0.04 for t in range(61)]
        tube(mb, coil, 0.008, YELLOW, sides=5)
        for z in (-1.4, -0.75):                                                                         # idler wheels
            for x in (-0.19, 0.19):
                secs = [[(sx * 0 + x + dx, 0.17 + 0.1 * math.sin(t / 14 * 2 * math.pi) if z == -1.4 else 0.14 + 0.08 * math.sin(t / 14 * 2 * math.pi),
                          z + (0.1 if z == -1.4 else 0.08) * math.cos(t / 14 * 2 * math.pi)) for t in range(14)] for dx in (-0.03, 0.03)]
                if sx > 0:
                    loft(mb, secs, hexrgb('#7d848e'))
        for x in (-0.2, 0.2):                                                                           # slide rails
            if sx > 0:
                box(mb, (x, 0.08, -0.72), (0.03, 0.04, 1.3), hexrgb('#5b616a'))
    # handlebar on its riser
    tube(mb, [(0, 0.93, 0.31), (0, 0.99, 0.27), (0, 1.02, 0.24)], 0.022, STEEL)
    tube(mb, [(-0.4, 1.042, 0.22), (-0.22, 1.03, 0.235), (-0.08, 1.02, 0.24), (0.08, 1.02, 0.24), (0.22, 1.03, 0.235), (0.4, 1.042, 0.22)], 0.012, STEEL, sides=8)
    box(mb, (0, 1.03, 0.24), (0.12, 0.03, 0.05), hexrgb('#3a3e45'))
    return mb.obj('sled_metal')


def body_glass():
    mb = B()
    rows = []
    for j in range(5):
        v = j / 4
        y, z, w = lerp(0.955, 1.27, v), lerp(0.47, 0.335, v), lerp(0.74, 0.5, v)
        rows.append([(lerp(-w / 2, w / 2, i / 8), y, z - 0.09 * (2 * i / 8 - 1) ** 2) for i in range(9)])
    loft(mb, rows, hexrgb('#cfe2f0'), cap0=False, cap1=False, closed=False)
    return mb.obj('sled_glass')


def body_lamp():
    mb = B()
    for sx in (-1, 1):
        quad = [(sx * 0.07, 0.62, 1.15), (sx * 0.23, 0.585, 1.08), (sx * 0.21, 0.545, 1.19), (sx * 0.085, 0.565, 1.235)]
        secs = [[(x, y + o, z + o * 0.4) for x, y, z in quad] for o in (-0.004, 0.012)]
        loft(mb, secs, hexrgb('#fff6d6'))
    return mb.obj('sled_lamp')


def finish(ob, angle=0.6):
    me = ob.data
    for p in me.polygons:
        p.use_smooth = True
    import bmesh
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    me.color_attributes.active_color = me.color_attributes['Color']   # the bmesh round trip drops the active colour
    me.color_attributes.render_color_index = me.color_attributes.active_color_index
    try:
        me.set_sharp_from_angle(angle=angle)
    except AttributeError:
        pass


def main():
    reset()
    objs = [body_paint(), body_dark(), body_metal(), body_glass(), body_lamp()]
    for ob in objs:
        finish(ob, 0.5 if ob.name != 'sled_glass' else 3.0)
    bake_ao_to_vertex_colors(objs[:3], samples=64, distance=0.35, strength=0.8, floor=0.3)
    print('colour sample', [tuple(round(c, 2) for c in o.data.color_attributes['Color'].data[5].color[:3]) for o in objs])
    print('snowmobile tris', {o.name: tri_count([o]) for o in objs})
    export_glb(objs, 'snowmobile.glb')


if __name__ == '__main__':
    main()
