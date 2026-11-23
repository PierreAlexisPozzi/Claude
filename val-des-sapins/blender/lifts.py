"""Lift vehicles for Val des Sapins (own models, after the CC0 references "Modern chair-lift" and "Cable-way car"
by ViSki on BlendSwap, which were studied from their public previews).

Run:  .bpyenv/bin/python blender/lifts.py   ->  assets/lift_vehicles.glb

Local frame of every vehicle: origin on the haul rope at the grip, x across the line, y up, +z = direction of travel.
The game's seat height (-2.32 m) and seat depth are kept so the riders' poses still fit.

  chair6_closed / chair6_open   6-seat detachable chair: grip, hanger, frame, padded seats, bubble rim and footrests,
                                with the bubble lowered (uphill, riders aboard) or raised (downhill, empty)
  bubble_closed / bubble_open   the tinted bubble shell for each state (transparent, no shadow)
  cabin10_body / cabin10_glass  10-seat gondola cabin: rounded body, panoramic glazing, roof, hanger, ski baskets
"""
import math
import bpy  # noqa: F401  (loads mathutils)
from mathutils import Vector, Matrix
from vds_common import reset, hexrgb, bake_ao_to_vertex_colors, export_glb, tri_count
from vehicles import B, squircle, loft, tube, box, lerp, smoothstep, finish

STEEL, DARK, GRIP = hexrgb('#8b939e'), hexrgb('#2b3038'), hexrgb('#3c4350')
SEAT, BACK, PIPE = hexrgb('#2c313a'), hexrgb('#2457c9'), hexrgb('#c8ccd2')
RED, WHITE, GLASSC = hexrgb('#c4232f'), hexrgb('#eef1f4'), hexrgb('#b9d3e6')

SEAT_Y = -2.32          # top of the cushions
HINGE = Vector((0, -1.62, -0.36))   # bubble hinge (game coords)


def grip(mb, wide=0.42):
    box(mb, (0, 0.02, 0), (0.3, 0.2, wide), GRIP)
    for z in (-0.15, 0.15):
        secs = [[(x, 0.17 + 0.09 * math.sin(t / 12 * 2 * math.pi), z + 0.09 * math.cos(t / 12 * 2 * math.pi)) for t in range(12)] for x in (-0.05, 0.05)]
        loft(mb, secs, DARK)
    box(mb, (0.17, 0.0, 0), (0.05, 0.12, 0.34), hexrgb('#e5b52e'))          # detach spring housing


def rot_about(p, axis_pt, ang):
    """Rotate a game-coordinate point about the x axis through axis_pt (positive = tips the front upward)."""
    v = Vector(p) - axis_pt
    c, s = math.cos(ang), math.sin(ang)
    y, z = v.y * c + v.z * s, -v.y * s + v.z * c
    return Vector((v.x, y, z)) + axis_pt


# --------------------------------------------------------------------------------------------- 6-seat chair
def chair_static(mb):
    grip(mb)
    # J-shaped hanger: down from the grip, sweeping back behind the backrest, into the backrest beam
    hp = [(0, -0.08, 0), (0, -0.7, 0.0), (0, -1.15, -0.04), (0, -1.45, -0.18), (0, -1.62, -0.36), (0, -1.78, -0.5)]
    tube(mb, hp, 0.06, STEEL, sides=10)
    # frame: backrest beam, seat beam, end frames
    tube(mb, [(-1.86, -1.8, -0.5), (1.86, -1.8, -0.5)], 0.05, STEEL, sides=8)
    tube(mb, [(-1.86, SEAT_Y - 0.16, 0.12), (1.86, SEAT_Y - 0.16, 0.12)], 0.045, STEEL, sides=8)
    for sx in (-1, 1):
        x = sx * 1.86
        tube(mb, [(x, -1.8, -0.5), (x, SEAT_Y - 0.16, -0.24), (x, SEAT_Y - 0.16, 0.5)], 0.035, STEEL, sides=8)
        box(mb, (sx * 1.88, SEAT_Y + 0.12, 0.18), (0.06, 0.05, 0.5), DARK)              # armrest
        tube(mb, [(sx * 1.88, SEAT_Y - 0.16, 0.42), (sx * 1.88, SEAT_Y + 0.1, 0.4)], 0.02, STEEL, sides=6)
    for k in range(-2, 3):
        x = k * 0.62
        tube(mb, [(x, -1.8, -0.5), (x, SEAT_Y - 0.16, -0.2), (x, SEAT_Y - 0.16, 0.12)], 0.025, STEEL, sides=6)
    # six padded seats and backrests (stitched cushions: a lighter seam between two pads)
    for k in range(6):
        x = (k - 2.5) * 0.6
        secs = [squircle(z, x, SEAT_Y - 0.06, 0.54, 0.13, n=16, p=5.0, crown=0.06) for z in (-0.06, 0.08, 0.3, 0.46)]
        loft(mb, secs, SEAT)
        # backrest: leaning back, rounded, accent colour, headrest pad
        ang = 0.28
        rows = []
        for j in range(6):
            t = j / 5
            y = SEAT_Y + 0.08 + t * 0.62
            z = -0.12 - math.sin(ang) * t * 0.62 - 0.03 * math.sin(t * math.pi)
            rows.append(squircle(0, x, 0, 0.52 - 0.04 * t, 0.12, n=14, p=5.0))
            rows[-1] = [(px, y + (py - 0) * 0.0, z + (py - 0)) for px, py, _ in rows[-1]]
        loft(mb, rows, lambda c: BACK if c.y < SEAT_Y + 0.55 else SEAT)
    # seat numbers plate on the backrest beam
    box(mb, (0, -1.72, -0.56), (0.32, 0.16, 0.02), WHITE)


def chair_rim(mb, ang):
    """Bubble frame and footrests, rotated by ang about the hinge (0 = lowered)."""
    R = lambda p: rot_about(p, HINGE, ang)
    # side arms from the hinge to the footrest bar, and the footrest bar
    for sx in (-1, 1):
        x = sx * 1.8
        tube(mb, [R((x, -1.62, -0.36)), R((x, -1.4, 0.2)), R((x, -1.75, 0.72)), R((x, -2.62, 0.78))], 0.03, DARK, sides=8)
    tube(mb, [R((-1.8, -2.62, 0.78)), R((1.8, -2.62, 0.78))], 0.035, DARK, sides=8)
    tube(mb, [R((-1.8, -1.62, -0.36)), R((1.8, -1.62, -0.36))], 0.03, DARK, sides=8)
    for k in range(6):
        x = (k - 2.5) * 0.6
        box(mb, R((x, -2.66, 0.66)), (0.4, 0.035, 0.2), DARK, pitch=-ang)                  # foot pads
        tube(mb, [R((x, -2.62, 0.78)), R((x, -2.66, 0.6))], 0.015, DARK, sides=6)


def bubble(mb, ang):
    """Tinted shell: a partial cylinder about the x axis with domed ends, lowered over the riders (ang = 0)."""
    C, Rr = Vector((0, -2.0, 0.05)), 0.98
    a0, a1 = math.radians(112), math.radians(-38)        # from above-behind the heads down to the footrests
    nx, na = 28, 14
    rows = []
    for i in range(nx + 1):
        x = lerp(-1.84, 1.84, i / nx)
        e = max(0.0, (abs(x) - 1.5) / 0.34)
        k = math.sqrt(max(0.0, 1 - e * e))
        row = []
        for j in range(na + 1):
            a = lerp(a0, a1, j / na)
            p = C + Vector((0, math.sin(a), math.cos(a))) * Rr * (0.25 + 0.75 * k)
            row.append(rot_about(Vector((x, p.y, p.z)), HINGE, ang))
        rows.append(row)
    idx = [[mb.gv(p) for p in r] for r in rows]
    for i in range(nx):
        for j in range(na):
            mb.gface((idx[i][j], idx[i][j + 1], idx[i + 1][j + 1], idx[i + 1][j]), GLASSC)


# --------------------------------------------------------------------------------------------- gondola cabin
def cabin(mb_body, mb_glass):
    grip(mb_body, 0.5)
    # hanger arm and roof carriage
    tube(mb_body, [(0, -0.08, 0), (0, -0.55, 0.0), (0, -0.95, -0.05), (0, -1.22, 0)], 0.07, STEEL, sides=10)
    box(mb_body, (0, -1.27, 0), (1.5, 0.1, 0.32), STEEL)
    # body: rounded box from y -3.48 to -1.42, w 2.0 (x), d 1.8 (z); white roof dome, red lower body, window band
    def col(c):
        if c.y > -1.62:
            return WHITE
        if c.y < -3.3:
            return hexrgb('#7a8494')
        return RED
    secs = []
    for j in range(13):
        t = j / 12
        y = lerp(-3.48, -1.42, t)
        w = 2.0 - 0.18 * smoothstep(0.82, 1.0, t) ** 0.7 - 0.12 * smoothstep(0.12, 0.0, t)
        d = 1.8 - 0.22 * smoothstep(0.82, 1.0, t) ** 0.7 - 0.12 * smoothstep(0.12, 0.0, t)
        secs.append([(px, y, pz) for px, pz, _ in squircle(0, 0, 0, w, d, n=32, p=5.0)])
    # sections are in the x-z plane here: reuse squircle's (x, y) as (x, z)
    loft(mb_body, secs, col)
    # glazing band (glass) slightly proud of the body, with dark mullions
    for j in range(2):
        pass
    band = []
    for y in (-2.42, -1.72):
        band.append([(px * 1.012, y, pz * 1.012) for px, pz, _ in squircle(0, 0, 0, 2.0, 1.8, n=32, p=5.0)])
    loft(mb_glass, band, GLASSC, cap0=False, cap1=False)
    ring = squircle(0, 0, 0, 2.0, 1.8, n=32, p=5.0)
    for s in range(0, 32, 4):
        px, pz, _ = ring[s]
        box(mb_body, (px * 1.02, -2.07, pz * 1.02), (0.06, 0.72, 0.06), DARK)
    for y in (-2.44, -1.7):                                                                    # sills
        loft(mb_body, [[(px * 1.02, y + o, pz * 1.02) for px, pz, _ in ring] for o in (-0.025, 0.025)], DARK, cap0=False, cap1=False)
    # doors seam and handles on the travel side (+z front is the door side of the station)
    for sx in (-0.02, 0.02):
        box(mb_body, (sx * 10, -2.95, 0.905), (0.02, 1.0, 0.02), hexrgb('#7a1218'))
    # ski baskets on both ends (x), with a few skis standing in them
    for sx in (-1, 1):
        box(mb_body, (sx * 1.07, -2.7, 0), (0.1, 0.06, 1.3), DARK)
        box(mb_body, (sx * 1.07, -3.2, 0), (0.1, 0.06, 1.3), DARK)
        for z in (-0.6, 0.6):
            box(mb_body, (sx * 1.07, -2.95, z), (0.08, 0.55, 0.05), DARK)
        for k, (z, c) in enumerate(((-0.4, '#d8342b'), (-0.28, '#d8342b'), (0.1, '#2f8be0'), (0.22, '#2f8be0'), (0.45, '#f1c232'))):
            box(mb_body, (sx * 1.09, -2.6, z), (0.025, 1.5, 0.075), hexrgb(c), pitch=0.04 * (k - 2))
    # roof light and the cabin number
    box(mb_body, (0, -1.37, 0.0), (0.5, 0.06, 0.5), hexrgb('#dfe3e8'))
    box(mb_body, (0.6, -1.8, 0.86), (0.28, 0.18, 0.02), WHITE)


def main():
    reset()
    objs = []
    for name, ang in (('chair6_closed', 0.0), ('chair6_open', math.radians(132))):
        mb = B(); chair_static(mb); chair_rim(mb, ang); objs.append(mb.obj(name))
    for name, ang in (('bubble_closed', 0.0), ('bubble_open', math.radians(132))):
        mb = B(); bubble(mb, ang); objs.append(mb.obj(name))
    mb_b, mb_g = B(), B(); cabin(mb_b, mb_g); objs += [mb_b.obj('cabin10_body'), mb_g.obj('cabin10_glass')]
    for ob in objs:
        finish(ob, 3.0 if ('bubble' in ob.name or 'glass' in ob.name) else 0.55)
    solid = [o for o in objs if 'bubble' not in o.name and 'glass' not in o.name]
    for i, ob in enumerate(solid):
        ob.location = Vector((i * 6, 0, 0))
    bake_ao_to_vertex_colors(solid, samples=48, distance=0.4, strength=0.7, floor=0.35)
    for ob in solid:
        ob.location = Vector((0, 0, 0))
    print('lift tris', {o.name: tri_count([o]) for o in objs})
    export_glb(objs, 'lift_vehicles.glb')


if __name__ == '__main__':
    main()
