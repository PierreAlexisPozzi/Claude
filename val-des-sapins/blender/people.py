"""Skiers for Val des Sapins: organic clothing parts for the player's rig and posed bodies for the other skiers.

Outputs (val-des-sapins/assets):
- skier_parts.glb  one mesh per rigid segment of the player's skeleton, modelled in that joint's local frame
                   (game coordinates, metres) so the game's procedural animation drives them unchanged:
                   sk_hips, sk_thigh, sk_shin, sk_jacket, sk_yoke, sk_upperarm, sk_forearm, sk_helmet.
                   Non-circular anatomical sections, quilted down baffles, folds at elbows and knees, a helmet
                   shell with visor and ear pads. Vertex colours carry Cycles ambient occlusion only (the game's
                   materials give the colour).
- skiers_npc.glb   the other skiers in two poses, as in the game: npc_ski_body / npc_ski_jacket (origin on the
                   snow) and npc_seat_body / npc_seat_jacket (origin on the chair seat). Bodies are vertex
                   coloured (pants, boots, gloves, helmet, goggles, skis); jackets are white for the per-skier tint.

Run: python blender/people.py   (with bpy==5.3.0)
"""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector, Matrix
from vds_common import reset, MeshBuilder, hexrgb, bake_ao_to_vertex_colors, export_glb, tri_count


def G(x, y, z):
    """game coordinates (Y up, Z forward) -> Blender (Z up); the glTF exporter maps them back."""
    return Vector((x, -z, y))


def wav(*terms):
    return sum(a * math.sin(f * t + p) for a, f, t, p in terms)


def lathe(mb, prof, segs=24, sx=1.0, sz=1.0, deform=None, col=(1, 1, 1), xform=None, uvmode='index'):
    """Surface of revolution around the game's Y axis from a profile [(y, r), ...] (r=0 closes an end).
    sx/sz give an elliptical section; deform(y, th, t) returns a radial offset (folds, baffles)."""
    rings = []
    n = len(prof)
    for i, (y, r) in enumerate(prof):
        ring = []
        for s in range(segs):
            th = s / segs * 2 * math.pi
            rr = r + (deform(y, th, i / (n - 1)) if (deform and r > 0) else 0)
            p = Vector((math.sin(th) * rr * sx, y, math.cos(th) * rr * sz))
            if xform:
                p = xform(p)
            ring.append(mb.vert(G(p.x, p.y, p.z)))
        rings.append(ring)
    for i in range(n - 1):
        for s in range(segs):
            s1 = (s + 1) % segs
            u0, u1 = s / segs, (s + 1) / segs
            v0, v1 = i / (n - 1), (i + 1) / (n - 1)
            c = col if not callable(col) else col(prof[i][0])
            mb.face((rings[i][s], rings[i + 1][s], rings[i + 1][s1], rings[i][s1]), [(u0, v0), (u0, v1), (u1, v1), (u1, v0)], c)


def smooth(prof, k=2):
    """Densifies a coarse profile with Catmull-Rom so silhouettes stay round after the radial deformations."""
    out = []
    for i in range(len(prof) - 1):
        p0, p1, p2, p3 = prof[max(i - 1, 0)], prof[i], prof[i + 1], prof[min(i + 2, len(prof) - 1)]
        for j in range(k):
            t = j / k
            out.append(tuple(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3)
                             for a, b, c, d in zip(p0, p1, p2, p3)))
    out.append(prof[-1])
    return [(y, max(0.0, r)) for y, r in out]


# ------------------------------------------------------------------ player parts (local joint frames)
def part_hips():
    mb = MeshBuilder()
    prof = smooth([(-0.12, 0), (-0.11, 0.11), (-0.09, 0.15), (-0.02, 0.175), (0.06, 0.178), (0.12, 0.16), (0.125, 0)], 3)
    lathe(mb, prof, 28, 1.0, 0.78, deform=lambda y, th, t: 0.004 * math.cos(th * 2) + (0.008 * max(0, -math.cos(th)) if y < 0.0 else 0))   # seat fuller at the back
    return mb.obj('sk_hips')


def part_thigh():
    mb = MeshBuilder()
    prof = smooth([(0.0, 0), (-0.01, 0.05), (-0.03, 0.074), (-0.08, 0.089), (-0.25, 0.083), (-0.38, 0.07), (-0.44, 0.064), (-0.475, 0.055), (-0.48, 0)], 3)

    def d(y, th, t):
        front = max(0, math.cos(th))
        knee = 0.007 * max(0, math.sin((-y - 0.33) * 70)) * front if y < -0.33 else 0          # bunching above the knee
        seam = -0.003 * math.exp(-((th - math.pi / 2) % math.pi - math.pi / 2) ** 2 * 60)        # side seams
        quad = 0.008 * front * math.sin(math.pi * min(1, max(0, (-y + 0.03) / 0.45)))            # quadriceps
        return knee + seam + quad + wav((0.0015, 7, th, y * 30), (0.001, 13, y, th))
    lathe(mb, prof, 26, 1.0, 1.08, deform=d)
    return mb.obj('sk_thigh')


def part_shin():
    mb = MeshBuilder()
    prof = smooth([(0.07, 0), (0.06, 0.05), (0.03, 0.068), (-0.04, 0.064), (-0.15, 0.061), (-0.3, 0.06), (-0.37, 0.071), (-0.43, 0.085), (-0.44, 0)], 3)

    def d(y, th, t):
        back = max(0, -math.cos(th))
        crease = 0.006 * max(0, math.sin((y + 0.01) * 90)) * back if y > -0.06 else 0             # folds behind the knee
        gather = 0.005 * max(0, math.sin((-y - 0.3) * 60)) if y < -0.3 else 0                    # pants gathered over the boot
        return crease + gather + wav((0.0012, 9, th, y * 25))
    lathe(mb, prof, 24, 1.0, 1.05, deform=d)
    return mb.obj('sk_shin')


def part_jacket():
    mb = MeshBuilder()
    prof = smooth([(-0.18, 0), (-0.175, 0.17), (-0.15, 0.183), (-0.05, 0.181), (0.1, 0.17), (0.26, 0.192), (0.38, 0.207), (0.47, 0.202), (0.54, 0.162), (0.58, 0.09), (0.588, 0)], 3)

    def d(y, th, t):
        baffle = 0.009 * abs(math.sin(math.pi * (y + 0.15) / 0.105)) if -0.15 < y < 0.42 else 0   # quilted down channels
        waist = -0.006 * math.exp(-((y - 0.02) / 0.05) ** 2)                                     # drawcord at the waist
        back = 0.006 * max(0, -math.cos(th)) * math.sin(math.pi * min(1, max(0, (y + 0.1) / 0.6)))
        return baffle + waist + back + wav((0.0015, 5, th, y * 9))
    lathe(mb, prof, 32, 1.0, 0.7, deform=d)
    return mb.obj('sk_jacket')


def part_yoke():
    mb = MeshBuilder()
    prof = smooth([(0.395, 0.212), (0.47, 0.206), (0.54, 0.166), (0.58, 0.094), (0.592, 0)], 3)
    lathe(mb, prof, 32, 1.012, 0.712, deform=lambda y, th, t: wav((0.0012, 6, th, 0.0)))
    return mb.obj('sk_yoke')


def part_upperarm():
    mb = MeshBuilder()
    prof = smooth([(0.06, 0), (0.05, 0.05), (0.02, 0.068), (-0.08, 0.07), (-0.2, 0.062), (-0.27, 0.057), (-0.305, 0.05), (-0.31, 0)], 3)

    def d(y, th, t):
        baffle = 0.006 * abs(math.sin(math.pi * (y + 0.02) / 0.075))
        inner = max(0, math.cos(th - math.pi))
        elbow = 0.006 * max(0, math.sin((-y - 0.22) * 80)) * inner if y < -0.22 else 0
        return baffle + elbow
    lathe(mb, prof, 22, 1.0, 1.0, deform=d)
    return mb.obj('sk_upperarm')


def part_forearm():
    mb = MeshBuilder()
    prof = smooth([(0.04, 0), (0.03, 0.045), (0.0, 0.056), (-0.1, 0.053), (-0.2, 0.047), (-0.24, 0.056), (-0.26, 0.05), (-0.265, 0)], 3)

    def d(y, th, t):
        inner = max(0, math.cos(th - math.pi))
        crease = 0.006 * max(0, math.sin((y + 0.0) * 90)) * inner if y > -0.05 else 0
        cuff = 0.004 * max(0, math.sin((-y - 0.2) * 120)) if y < -0.2 else 0
        return crease + cuff + 0.005 * abs(math.sin(math.pi * (y + 0.01) / 0.07))
    lathe(mb, prof, 22, 1.0, 1.0, deform=d)
    return mb.obj('sk_forearm')


def part_helmet():
    """Shell longer front to back, a short visor over the goggles, ear pads, three vent grooves on top."""
    mb = MeshBuilder()
    segs, rings = 36, 18
    vr = []
    for i in range(rings + 1):
        phi = i / rings * math.pi * 0.56                 # from the crown down to just below the equator
        row = []
        for s in range(segs):
            th = s / segs * 2 * math.pi
            front = math.cos(th)
            r = 0.13 + 0.008 * front                      # a little longer at the front
            x, y, z = math.sin(th) * math.sin(phi) * r * 0.97, math.cos(phi) * r * 1.02, math.cos(th) * math.sin(phi) * r * 1.1
            if i == rings and front > 0.55:               # visor
                z += 0.018 * (front - 0.55) / 0.45; y += 0.004
            vent = 0.0
            for vx in (-0.04, 0.0, 0.04):
                vent += -0.006 * math.exp(-((x - vx) / 0.008) ** 2) * (1 if (phi < 0.9 and abs(z) < 0.09) else 0)
            n = Vector((x, y, z)).normalized()
            p = Vector((x, y, z)) + n * vent
            row.append(mb.vert(G(p.x, p.y + 0.012, p.z - 0.008)))
        vr.append(row)
    for i in range(rings):
        for s in range(segs):
            s1 = (s + 1) % segs
            mb.face((vr[i][s], vr[i + 1][s], vr[i + 1][s1], vr[i][s1]), [(s / segs, i / rings)] * 4)
    # inner rim so the shell has a thickness
    inner = [mb.vert(G(*(Vector((mb.v[vr[rings][s]][0], mb.v[vr[rings][s]][2], -mb.v[vr[rings][s]][1])) * 0.93))) for s in range(segs)]
    for s in range(segs):
        s1 = (s + 1) % segs
        mb.face((vr[rings][s], inner[s], inner[s1], vr[rings][s1]))
    # ear pads
    for sd in (-1, 1):
        prof = smooth([(0.03, 0), (0.028, 0.03), (0.0, 0.042), (-0.04, 0.038), (-0.06, 0.02), (-0.062, 0)], 2)
        lathe(mb, prof, 14, 0.45, 1.0, xform=lambda p, sd=sd: Vector((p.x + sd * 0.118, p.y - 0.02, p.z - 0.01)))
    return mb.obj('sk_helmet')


# ------------------------------------------------------------------ posed skiers for the crowd
def capsule(mb, a, b, r0, r1, col, segs=12, folds=0.0, seed=0):
    """Organic limb between two game-space points: tapered, rounded ends, light fabric folds."""
    a, b = Vector(a), Vector(b)
    d = b - a; L = d.length; d.normalize()
    up = Vector((0, 1, 0)) if abs(d.y) < 0.95 else Vector((1, 0, 0))
    u = d.cross(up).normalized(); w = d.cross(u).normalized()
    prof = [(-r0 * 0.9, 0), (-r0 * 0.6, r0 * 0.8), (0, r0), (L * 0.5, (r0 + r1) / 2 * 1.04), (L, r1), (L + r1 * 0.6, r1 * 0.8), (L + r1 * 0.9, 0)]
    prof = smooth(prof, 2)

    def xf(p):
        return a + d * p.y + u * p.x + w * p.z
    lathe(mb, prof, segs, 1.0, 1.0, deform=(lambda y, th, t: folds * math.sin(y * 70 + seed) * max(0, math.cos(th))) if folds else None, col=col, xform=xf)


def ellipsoid(mb, c, rx, ry, rz, col, segs=14, rings=9):
    prof = [(math.cos(i / rings * math.pi) * ry, math.sin(i / rings * math.pi)) for i in range(rings + 1)]
    lathe(mb, [(y, r) for y, r in prof], segs, rx, rz, col=col, xform=lambda p: Vector(c) + Vector((p.x, p.y, p.z)))


def npc_pose(seated, variant='a'):
    PANTS, DARK, SKIN, HELM, GOG = hexrgb('#232a3c'), hexrgb('#1a1d24'), hexrgb('#d6a37f'), hexrgb('#eeeeee'), hexrgb('#ff9a1f')
    if variant == 'b':                                   # second outfit: light trousers, knit beanie, long parka
        PANTS, SKIN, BEANIE = hexrgb('#c9b79a'), hexrgb('#e0b08c'), hexrgb('#b8432e')
    SKI, POLE, WHITE = hexrgb('#2b3a55'), hexrgb('#b9bec6'), (1, 1, 1)
    body, jacket = MeshBuilder(), MeshBuilder()
    if not seated:
        for s in (-1, 1):
            # ski with a rocker tip
            for z0, z1, y0, y1 in ((-0.8, 0.62, 0.012, 0.012), (0.62, 0.9, 0.012, 0.07), (-0.9, -0.8, 0.05, 0.012)):
                a = body.vert(G(s * 0.12 - 0.05, y0, z0)); b = body.vert(G(s * 0.12 + 0.05, y0, z0)); c = body.vert(G(s * 0.12 + 0.05, y1, z1)); e = body.vert(G(s * 0.12 - 0.05, y1, z1))
                body.face((e, c, b, a), col=SKI)   # top face (single-sided in the game)
            capsule(body, (s * 0.12, 0.05, -0.04), (s * 0.12, 0.28, 0.0), 0.08, 0.075, DARK, folds=0)          # boot
            capsule(body, (s * 0.12, 0.26, 0.02), (s * 0.12, 0.58, 0.2), 0.07, 0.068, PANTS, folds=0.004, seed=s)
            capsule(body, (s * 0.12, 0.58, 0.2), (s * 0.1, 0.92, -0.03), 0.07, 0.085, PANTS, folds=0.004, seed=s + 2)
            capsule(jacket, (s * 0.2, 1.36, 0.17), (s * 0.27, 1.1, 0.38), 0.062, 0.056, WHITE, folds=0.005)
            capsule(jacket, (s * 0.27, 1.1, 0.38), (s * 0.25, 1.0, 0.6), 0.055, 0.05, WHITE, folds=0.005)
            ellipsoid(body, (s * 0.25, 0.99, 0.63), 0.055, 0.06, 0.065, DARK)
            capsule(body, (s * 0.25, 1.0, 0.62), (s * 0.32, 0.05, 0.28), 0.011, 0.009, POLE, segs=5)
        ellipsoid(body, (0, 0.93, -0.02), 0.18, 0.13, 0.135, PANTS)
        capsule(jacket, (0, 0.9, 0.0), (0, 1.42, 0.22), 0.17, 0.15, WHITE, segs=18, folds=0.006)
        ellipsoid(jacket, (0, 1.28, 0.15), 0.215, 0.2, 0.16, WHITE, segs=18)                 # chest
        capsule(jacket, (-0.19, 1.38, 0.18), (0.19, 1.38, 0.18), 0.08, 0.08, WHITE, segs=12)  # shoulders
        ellipsoid(jacket, (0, 0.97, 0.0), 0.2, 0.12, 0.15, WHITE, segs=18)                   # hem over the hips
        if variant == 'b':
            capsule(jacket, (0, 0.95, -0.01), (0, 0.7, 0.06), 0.205, 0.2, WHITE, segs=18, folds=0.006)   # long parka skirt
        capsule(body, (0, 1.42, 0.22), (0, 1.56, 0.28), 0.075, 0.07, DARK, segs=10)           # neck gaiter
        ellipsoid(jacket, (0, 1.46, 0.24), 0.12, 0.05, 0.11, WHITE)
        head, face = (0, 1.66, 0.29), (0, 1.6, 0.31)
    else:
        for s in (-1, 1):
            capsule(body, (s * 0.1, 0.06, -0.02), (s * 0.12, 0.08, 0.45), 0.085, 0.07, PANTS, folds=0.004)
            capsule(body, (s * 0.12, 0.08, 0.45), (s * 0.12, -0.34, 0.5), 0.066, 0.064, PANTS, folds=0.004)
            capsule(body, (s * 0.12, -0.32, 0.47), (s * 0.12, -0.55, 0.55), 0.08, 0.075, DARK)
            # skis hanging under the chair
            a = body.vert(G(s * 0.12 - 0.05, -0.6, -0.15)); b = body.vert(G(s * 0.12 + 0.05, -0.6, -0.15)); c = body.vert(G(s * 0.12 + 0.05, -0.66, 1.4)); e = body.vert(G(s * 0.12 - 0.05, -0.66, 1.4))
            body.face((e, c, b, a), col=SKI)   # top face (single-sided in the game)
            capsule(jacket, (s * 0.2, 0.5, 0.0), (s * 0.23, 0.28, 0.2), 0.062, 0.056, WHITE, folds=0.005)
            capsule(jacket, (s * 0.23, 0.28, 0.2), (s * 0.18, 0.3, 0.44), 0.055, 0.05, WHITE, folds=0.005)
            ellipsoid(body, (s * 0.18, 0.3, 0.47), 0.055, 0.06, 0.065, DARK)
        capsule(jacket, (0, 0.04, -0.02), (0, 0.56, 0.0), 0.17, 0.15, WHITE, segs=18, folds=0.006)
        ellipsoid(jacket, (0, 0.42, 0.0), 0.215, 0.2, 0.16, WHITE, segs=18)
        capsule(jacket, (-0.19, 0.52, 0.0), (0.19, 0.52, 0.0), 0.08, 0.08, WHITE, segs=12)
        capsule(body, (0, 0.56, 0.0), (0, 0.7, 0.03), 0.075, 0.07, DARK, segs=10)
        ellipsoid(jacket, (0, 0.6, 0.02), 0.12, 0.05, 0.11, WHITE)
        head, face = (0, 0.84, 0.03), (0, 0.78, 0.05)
    # head: face, then a helmet and goggles (outfit a) or a knit beanie and sunglasses (outfit b)
    ellipsoid(body, face, 0.085, 0.105, 0.095, SKIN)
    hx, hy, hz = head
    if variant == 'b':
        prof = [(math.cos(i / 9 * math.pi * 0.5) * 0.115, math.sin(i / 9 * math.pi * 0.5) * 0.112) for i in range(10)]
        lathe(body, prof, 16, 1.0, 1.05, col=BEANIE, xform=lambda p: Vector((hx + p.x, hy + p.y - 0.035, hz + p.z)),
              deform=lambda y, th, t: 0.003 * math.sin(th * 18))                                  # ribbed knit
        lathe(body, [(0.02, 0.118), (-0.02, 0.118)], 16, 1.0, 1.06, col=lambda y: BEANIE, xform=lambda p: Vector((hx + p.x, hy + p.y - 0.045, hz + p.z)))   # folded brim
        ellipsoid(body, (hx, hy + 0.1, hz), 0.045, 0.04, 0.045, hexrgb('#f0ece4'))                # pompom
        lathe(body, [(0.012, 0.1), (-0.012, 0.1)], 12, 1.0, 1.08, col=lambda y: DARK, xform=lambda p: Vector((face[0] + p.x, face[1] + p.y + 0.02, face[2] + p.z + 0.012)) if p.z > 0 else Vector((face[0] + p.x * 0.9, face[1] + p.y + 0.02, face[2] + p.z * 0.9)))
        name = 'npc_seat' if seated else 'npc_ski'
        return body.obj(name + '_body_b'), jacket.obj(name + '_jacket_b')
    prof = [(math.cos(i / 9 * math.pi * 0.55) * 0.125, math.sin(i / 9 * math.pi * 0.55) * 0.125) for i in range(10)]
    lathe(body, prof, 16, 1.0, 1.1, col=HELM, xform=lambda p: Vector((hx + p.x, hy + p.y - 0.02, hz + p.z)))
    lathe(body, [(0.03, 0.118), (-0.03, 0.118)], 16, 1.0, 1.12, col=lambda y: GOG, xform=lambda p: Vector((hx + p.x, hy + p.y - 0.06, hz + p.z + 0.012)) if p.z > -0.02 else Vector((hx + p.x * 0.98, hy + p.y - 0.06, hz + p.z)))
    name = 'npc_seat' if seated else 'npc_ski'
    return body.obj(name + '_body'), jacket.obj(name + '_jacket')


def npc_rig_parts():
    """Rigid parts for the articulated crowd (each in its joint frame, game coordinates, metres).
    White areas take the per-skier tint (jacket or trousers); boots, gloves, skin, helmet, beanie, skis keep baked colours."""
    WHITE, DARK, SKIN, HELM, GOG = (1, 1, 1), hexrgb('#1a1d24'), hexrgb('#d6a37f'), hexrgb('#eeeeee'), hexrgb('#ff9a1f')
    BEANIE, POLE = hexrgb('#b8432e'), hexrgb('#b9bec6')
    out = []

    def mk(name, build):
        mb = MeshBuilder(); build(mb); ob = mb.obj(name)
        for p in ob.data.polygons:
            p.use_smooth = True
        out.append(ob)

    mk('npcp_pelvis', lambda mb: lathe(mb, smooth([(-0.12, 0), (-0.1, 0.11), (-0.02, 0.16), (0.08, 0.15), (0.12, 0)], 2), 14, 1.0, 0.78))
    mk('npcp_thigh', lambda mb: lathe(mb, smooth([(0.03, 0), (0.02, 0.07), (-0.08, 0.088), (-0.3, 0.075), (-0.46, 0.062), (-0.48, 0)], 2), 12, 1.0, 1.06))
    mk('npcp_shin', lambda mb: lathe(mb, smooth([(0.05, 0), (0.04, 0.06), (-0.1, 0.062), (-0.3, 0.064), (-0.4, 0.078), (-0.42, 0)], 2), 12))

    def torso(mb, long):
        prof = [(-0.18, 0), (-0.17, 0.17), (-0.05, 0.18), (0.1, 0.17), (0.28, 0.195), (0.42, 0.205), (0.52, 0.17), (0.58, 0.09), (0.59, 0)]
        if long:
            prof = [(-0.46, 0), (-0.45, 0.2), (-0.3, 0.205), (-0.12, 0.19)] + prof[2:]
        lathe(mb, smooth(prof, 2), 16, 1.0, 0.74, deform=lambda y, th, t: 0.007 * abs(math.sin(math.pi * (y + 0.15) / 0.11)) if y < 0.42 else 0)
        capsule(mb, (-0.2, 0.48, 0.0), (0.2, 0.48, 0.0), 0.075, 0.075, WHITE, segs=10)            # shoulders
        lathe(mb, [(0.0, 0.09), (0.1, 0.085), (0.11, 0)], 10, col=DARK, xform=lambda p: Vector((p.x, p.y + 0.56, p.z)))   # neck gaiter
    mk('npcp_torso_a', lambda mb: torso(mb, False))
    mk('npcp_torso_b', lambda mb: torso(mb, True))

    def head(mb, beanie):
        ellipsoid(mb, (0, 0.1, 0.012), 0.085, 0.105, 0.095, SKIN, segs=12, rings=8)
        if beanie:
            lathe(mb, [(math.cos(i / 7 * math.pi * 0.5) * 0.112, math.sin(i / 7 * math.pi * 0.5) * 0.11) for i in range(8)], 14, 1.0, 1.05, col=BEANIE, xform=lambda p: Vector((p.x, p.y + 0.12, p.z)))
            ellipsoid(mb, (0, 0.245, 0), 0.04, 0.035, 0.04, hexrgb('#f0ece4'), segs=8, rings=6)
            lathe(mb, [(0.012, 0.1), (-0.012, 0.1)], 12, 1.0, 1.08, col=lambda y: DARK, xform=lambda p: Vector((p.x, p.y + 0.12, p.z + 0.014)) if p.z > 0 else Vector((p.x * 0.9, p.y + 0.12, p.z * 0.9)))
        else:
            lathe(mb, [(math.cos(i / 7 * math.pi * 0.55) * 0.125, math.sin(i / 7 * math.pi * 0.55) * 0.125) for i in range(8)], 14, 1.0, 1.1, col=HELM, xform=lambda p: Vector((p.x, p.y + 0.11, p.z)))
            lathe(mb, [(0.03, 0.118), (-0.03, 0.118)], 14, 1.0, 1.12, col=lambda y: GOG, xform=lambda p: Vector((p.x, p.y + 0.11, p.z + 0.012)) if p.z > -0.02 else Vector((p.x * 0.98, p.y + 0.11, p.z)))
    mk('npcp_head_a', lambda mb: head(mb, False))
    mk('npcp_head_b', lambda mb: head(mb, True))
    mk('npcp_upperarm', lambda mb: lathe(mb, smooth([(0.05, 0), (0.04, 0.06), (-0.1, 0.064), (-0.28, 0.054), (-0.31, 0)], 2), 10))

    def forearm(mb):
        lathe(mb, smooth([(0.03, 0), (0.02, 0.052), (-0.12, 0.05), (-0.24, 0.054), (-0.26, 0)], 2), 10)
        ellipsoid(mb, (0, -0.3, 0.01), 0.05, 0.06, 0.055, DARK, segs=10, rings=6)               # glove
    mk('npcp_forearm', forearm)

    mk('npcp_boot', lambda mb: capsule(mb, (0, 0.1, -0.02), (0, -0.02, 0.06), 0.07, 0.075, DARK, segs=10))   # boot shell (separate: shopkeepers stand without skis)

    def ski(mb):
        a = mb.vert(G(-0.045, -0.1, -0.78)); b = mb.vert(G(0.045, -0.1, -0.78)); c = mb.vert(G(0.045, -0.1, 0.72)); e = mb.vert(G(-0.045, -0.1, 0.72))
        mb.face((e, c, b, a), col=WHITE)
        a2 = mb.vert(G(-0.045, -0.04, 0.92)); b2 = mb.vert(G(0.045, -0.04, 0.92))
        mb.face((a2, b2, c, e), col=WHITE)                                                     # rockered tip
    mk('npcp_ski', ski)

    def pole(mb):
        capsule(mb, (0, 0, 0), (0, -1.12, 0), 0.011, 0.008, POLE, segs=5)
        lathe(mb, [(0.005, 0.045), (-0.005, 0.045)], 10, col=lambda y: DARK, xform=lambda p: Vector((p.x, p.y - 1.05, p.z)))
    mk('npcp_pole', pole)
    return out


def add_flutter(ob):
    """Per-vertex weight for the game's secondary motion: loose fabric at the hem, cuffs and trouser bottoms."""
    def ss(a, b, x):
        t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
    rule = {'sk_jacket': lambda y: ss(0.05, -0.17, y), 'sk_forearm': lambda y: ss(-0.12, -0.26, y) * 0.7,
            'sk_upperarm': lambda y: 0.25, 'sk_shin': lambda y: ss(-0.25, -0.43, y), 'sk_thigh': lambda y: 0.15}
    f = rule.get(ob.name)
    at = ob.data.attributes.new('_flutter', 'FLOAT', 'POINT')
    for i, v in enumerate(ob.data.vertices):
        at.data[i].value = f(v.co.z) if f else 0.0       # Blender z = game y


def main():
    reset()
    parts = [part_hips(), part_thigh(), part_shin(), part_jacket(), part_yoke(), part_upperarm(), part_forearm(), part_helmet()]
    for i, ob in enumerate(parts):                      # bake each part on its own (folds and baffles occlude)
        ob.location = Vector((i * 1.5, 0, 0))
    bake_ao_to_vertex_colors(parts, samples=64, distance=0.08, strength=0.75, floor=0.35)
    for ob in parts:
        ob.location = Vector((0, 0, 0))
        bpy.context.view_layer.objects.active = ob
    for ob in parts:
        for p in ob.data.polygons:
            p.use_smooth = True
        add_flutter(ob)
    print('parts tris', {o.name: tri_count([o]) for o in parts})
    export_glb(parts, 'skier_parts.glb')

    reset()
    objs = []
    for k, (seated, variant) in enumerate(((False, 'a'), (True, 'a'), (False, 'b'), (True, 'b'))):
        b, j = npc_pose(seated, variant)
        for ob in (b, j):
            ob.location = Vector((k * 4, 0, 0))
            for p in ob.data.polygons:
                p.use_smooth = True
        objs += [b, j]
    # the crowd is small on screen and instanced 60 times in each pose: collapse to ~40 % before baking
    for ob in objs:
        mod = ob.modifiers.new('decimate', 'DECIMATE'); mod.ratio = 0.4
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=mod.name)
    bake_ao_to_vertex_colors(objs, samples=64, distance=0.25, strength=0.7, floor=0.3)
    for ob in objs:
        ob.location = Vector((0, 0, 0))
    print('npc tris', {o.name: tri_count([o]) for o in objs})
    export_glb(objs, 'skiers_npc.glb')

    reset()
    rig = npc_rig_parts()
    for i, ob in enumerate(rig):
        ob.location = Vector((i * 1.5, 0, 0))
    bake_ao_to_vertex_colors(rig, samples=48, distance=0.08, strength=0.6, floor=0.45)
    for ob in rig:
        ob.location = Vector((0, 0, 0))
    print('rig tris', {o.name: tri_count([o]) for o in rig}, 'per skier ~', sum(tri_count([o]) * (2 if o.name in ('npcp_upperarm', 'npcp_forearm', 'npcp_thigh', 'npcp_shin', 'npcp_ski', 'npcp_boot', 'npcp_pole') else 1) for o in rig if not o.name.endswith('_b')))
    export_glb(rig, 'skiers_rig.glb')


main()
