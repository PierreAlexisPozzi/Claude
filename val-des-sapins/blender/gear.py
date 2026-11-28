"""Ski gear in 3D for Val des Sapins: skis, poles and snowboards, shared by the balconies and ski racks
(buildings.py -> building_parts.glb) and the gondola ski baskets (lifts.py -> lift_vehicles.glb).

The depth comes from what a real pair shows: a cambered plank with tip and tail rise, sidewalls and a bevelled
top sheet, two skis strapped base to base, bindings standing proud (toe piece, heel piece with its cup, brake
arms), round poles with grips, straps and baskets. Triangle counts stay low because balconies instance many.

Frame: game coordinates (x right, y up, +z out of the wall); a pair stands on its tails with y along the skis.
Every function takes an optional placement X(p) -> p so lifts.py can put the same gear into its baskets.
"""
import math
from vehicles import box as vbox

I = lambda p: p
STEEL, BASE, DARK, GREY = (0.78, 0.8, 0.83), (0.09, 0.09, 0.11), (0.12, 0.12, 0.14), (0.55, 0.57, 0.61)


def _quad(mb, X, a, b, c, d, col):
    mb.gface((mb.gv(X(a)), mb.gv(X(b)), mb.gv(X(c)), mb.gv(X(d))), col)


def _box(mb, X, c, s, col):
    """axis-aligned box in local space, placed by X"""
    x, y, z = c; sx, sy, sz = (v / 2 for v in s)
    P = [X((x + dx * sx, y + dy * sy, z + dz * sz)) for dx in (-1, 1) for dy in (-1, 1) for dz in (-1, 1)]
    v = [mb.gv(p) for p in P]
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        mb.gface(tuple(v[i] for i in f), col)


def _cyl(mb, X, a, b, r, col, sides=6, caps=True):
    """cylinder from a to b (local), radius r"""
    ax, ay, az = a; bx, by, bz = b
    d = (bx - ax, by - ay, bz - az); L = math.sqrt(sum(c * c for c in d)) or 1; d = tuple(c / L for c in d)
    ref = (1, 0, 0) if abs(d[0]) < 0.9 else (0, 0, 1)
    u = (d[1] * ref[2] - d[2] * ref[1], d[2] * ref[0] - d[0] * ref[2], d[0] * ref[1] - d[1] * ref[0]); n = math.sqrt(sum(c * c for c in u)); u = tuple(c / n for c in u)
    w = (d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0])
    ring = lambda o: [mb.gv(X(tuple(o[i] + (u[i] * math.cos(t) + w[i] * math.sin(t)) * r for i in range(3)))) for t in (k / sides * 2 * math.pi for k in range(sides))]
    ra, rb = ring(a), ring(b)
    for s in range(sides):
        s1 = (s + 1) % sides
        mb.gface((ra[s], ra[s1], rb[s1], rb[s]), col)
    if caps:
        for rr, c in ((ra, a), (rb, b)):
            ci = mb.gv(X(c))
            for s in range(sides):
                mb.gface((ci, rr[(s + 1) % sides], rr[s]), col)


def ski(mb, X=I, x0=0.0, face=1, top=(0.85, 0.1, 0.1), accent=(1, 1, 1), L=1.70, seg=18, binding=True):
    """One ski standing on its tail, centred on x0, top sheet towards face*z (+1 out of the wall, -1 inward).
    Cambered, 6-sided section (base, steel edges, sidewalls, bevelled top), tip curl 10 cm, tail rise 3.5 cm."""
    rows = []
    for i in range(seg + 1):
        t = i / seg
        y = t * L
        hw = 0.051 + (0.064 - 0.051) * max(0, (t - 0.5) / 0.5) ** 2 * 1.0 + (0.060 - 0.051) * max(0, (0.5 - t) / 0.5) ** 2
        if t > 0.9: hw *= math.sqrt(max(0.05, 1 - ((t - 0.9) / 0.1) ** 2))      # rounded shovel
        if t < 0.03: hw *= math.sqrt(max(0.3, 1 - ((0.03 - t) / 0.03) ** 2))    # squared tail
        th = 0.006 + 0.012 * math.sin(math.pi * min(1, max(0, (t - 0.04) / 0.86))) ** 0.7
        zc = 0.10 * max(0, (t - 0.8) / 0.2) ** 2 + 0.035 * max(0, (0.07 - t) / 0.07) ** 2 + 0.004 * math.sin(math.pi * t)
        sec = [(-hw, 0), (hw, 0), (hw, th * 0.55), (hw * 0.78, th), (-hw * 0.78, th), (-hw, th * 0.55)]
        rows.append([(x0 + sx, y, face * (zc + sz)) for sx, sz in sec])
    for i in range(seg):
        a, b = rows[i], rows[i + 1]
        t = (i + 0.5) / seg
        tc = accent if 0.58 < t < 0.66 or 0.18 < t < 0.22 else top
        faces = [((0, 1), BASE), ((1, 2), STEEL), ((2, 3), top), ((3, 4), tc), ((4, 5), top), ((5, 0), STEEL)]
        for (p, q), col in faces:
            if face > 0:
                _quad(mb, X, a[p], b[p], b[q], a[q], col)
            else:
                _quad(mb, X, a[q], b[q], b[p], a[p], col)
    for rr, c in ((rows[0], (x0, 0, face * 0.03)), (rows[-1], (x0, L, face * 0.105))):   # closed ends
        ci = mb.gv(X(c))
        for k in range(6):
            p, q = rr[k], rr[(k + 1) % 6]
            if (face > 0) == (rr is rows[0]):
                mb.gface((ci, mb.gv(X(p)), mb.gv(X(q))), DARK)
            else:
                mb.gface((ci, mb.gv(X(q)), mb.gv(X(p))), DARK)
    if binding:
        f = face
        thf = 0.018
        _box(mb, X, (x0, 0.63, f * (thf + 0.022)), (0.075, 0.13, 0.044), DARK)           # heel piece
        _box(mb, X, (x0, 0.69, f * (thf + 0.05)), (0.06, 0.05, 0.03), GREY)              # heel cup
        _box(mb, X, (x0, 0.94, f * (thf + 0.02)), (0.07, 0.085, 0.04), DARK)             # toe piece
        _box(mb, X, (x0, 0.97, f * (thf + 0.042)), (0.05, 0.03, 0.012), GREY)            # toe wings
        _box(mb, X, (x0, 0.79, f * (thf + 0.006)), (0.06, 0.22, 0.012), GREY)            # plate
        for s in (-1, 1):                                                                   # brake arms
            _cyl(mb, X, (x0 + s * 0.034, 0.6, f * (thf + 0.012)), (x0 + s * 0.058, 0.52, f * (thf - 0.004)), 0.004, GREY, 4, False)


def pole(mb, X=I, x0=0.0, z0=0.05, col=(0.2, 0.22, 0.26), L=1.2, sides=6):
    """a pole standing on its tip at (x0, 0, z0): shaft, grip with strap, basket"""
    _cyl(mb, X, (x0, 0.02, z0), (x0, L - 0.16, z0), 0.0085, col, sides, False)
    _cyl(mb, X, (x0, 0.0, z0), (x0, 0.03, z0), 0.004, STEEL, 4, False)
    _cyl(mb, X, (x0, L - 0.17, z0), (x0, L, z0), 0.0165, DARK, sides)                      # grip
    _cyl(mb, X, (x0, 0.09, z0), (x0, 0.1, z0), 0.042, DARK, 8)                             # basket
    _box(mb, X, (x0, L - 0.06, z0 + 0.03), (0.02, 0.1, 0.012), (0.15, 0.15, 0.17))         # strap loop


def ski_pair(mb, X=I, top=(0.85, 0.1, 0.1), accent=(1, 1, 1), poles=True, seg=18, binding=True):
    """two skis strapped base to base (brakes interlocked), poles leaning beside them"""
    gap = 0.004
    ski(mb, lambda p: X((p[0], p[1], p[2] + gap)), 0.0, 1, top, accent, seg=seg, binding=binding)
    ski(mb, lambda p: X((p[0] + 0.006, p[1] + 0.012, p[2] - gap)), 0.0, -1, top, accent, seg=seg, binding=binding)
    _box(mb, X, (0, 1.32, 0), (0.115, 0.035, 0.05), (0.14, 0.14, 0.16))                    # rubber strap
    if poles:
        for s in (-1, 1):
            pole(mb, lambda p, s=s: X((p[0], p[1], p[2])), s * 0.1, 0.06, top)


def snowboard(mb, X=I, top=(0.95, 0.95, 0.95), band=(0.15, 0.15, 0.18), L=1.55, seg=20):
    """a board standing on its tail, top sheet (+z) facing out: rocker nose and tail, two bindings with highbacks"""
    rows = []
    for i in range(seg + 1):
        t = i / seg
        y = t * L
        hw = 0.124 + (0.148 - 0.124) * (2 * t - 1) ** 2
        if t < 0.07: hw *= math.sqrt(max(0.15, 1 - ((0.07 - t) / 0.07) ** 2))
        if t > 0.93: hw *= math.sqrt(max(0.15, 1 - ((t - 0.93) / 0.07) ** 2))
        th = 0.006 + 0.008 * math.sin(math.pi * min(1, max(0, (t - 0.06) / 0.88))) ** 0.7
        zc = 0.065 * max(0, (t - 0.86) / 0.14) ** 2 + 0.065 * max(0, (0.14 - t) / 0.14) ** 2
        sec = [(-hw, 0), (hw, 0), (hw, th * 0.6), (hw * 0.9, th), (-hw * 0.9, th), (-hw, th * 0.6)]
        rows.append([(sx, y, zc + sz) for sx, sz in sec])
    for i in range(seg):
        a, b = rows[i], rows[i + 1]
        t = (i + 0.5) / seg
        tc = band if (t * 7) % 2 < 0.45 else top
        for (p, q), col in [((0, 1), BASE), ((1, 2), STEEL), ((2, 3), tc), ((3, 4), tc), ((4, 5), tc), ((5, 0), STEEL)]:
            _quad(mb, X, a[p], b[p], b[q], a[q], col)
    for rr, c, flip in ((rows[0], (0, 0, 0.07), True), (rows[-1], (0, L, 0.07), False)):
        ci = mb.gv(X(c))
        for k in range(6):
            p, q = rr[k], rr[(k + 1) % 6]
            mb.gface((ci, mb.gv(X(p)), mb.gv(X(q))) if flip else (ci, mb.gv(X(q)), mb.gv(X(p))), DARK)
    for yb in (0.5, 1.05):                                                                  # bindings
        _box(mb, X, (0, yb, 0.02), (0.2, 0.22, 0.016), DARK)                                 # base plate
        for s in (-1, 1):
            _box(mb, X, (s * 0.1, yb, 0.05), (0.014, 0.2, 0.06), DARK)                       # side walls
        # highback: a curved shell rising from the heel edge, leaning back
        hb = [(-0.1, 0.0), (-0.07, 0.03), (0.0, 0.04), (0.07, 0.03), (0.1, 0.0)]
        h0 = yb - 0.1
        for k in range(len(hb) - 1):
            (x1, d1), (x2, d2) = hb[k], hb[k + 1]
            _quad(mb, X, (x1, h0 - d1, 0.035), (x2, h0 - d2, 0.035), (x2, h0 - d2 - 0.05, 0.2), (x1, h0 - d1 - 0.05, 0.2), DARK)
            _quad(mb, X, (x1, h0 - d1 - 0.05, 0.2), (x2, h0 - d2 - 0.05, 0.2), (x2, h0 - d2, 0.035), (x1, h0 - d1, 0.035), DARK)
        for dy, zt in ((0.04, 0.1), (-0.05, 0.075)):                                         # ankle and toe straps, arched
            pts = [(-0.1, yb + dy, 0.04), (-0.06, yb + dy, zt), (0.06, yb + dy, zt), (0.1, yb + dy, 0.04)]
            for p, q in zip(pts, pts[1:]):
                _cyl(mb, X, p, q, 0.014, GREY, 5, False)
