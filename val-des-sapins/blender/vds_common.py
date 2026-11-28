"""Shared helpers for the Val des Sapins asset scripts (Blender 5.3 used as a Python module: pip install bpy==5.3.0).

Conventions
- Blender is Z-up; the glTF exporter converts to the game's Y-up. Units are metres.
- Colours are written as display (sRGB) values and stored linearly in FLOAT_COLOR attributes; the game re-encodes
  COLOR_0 to display values on load because its shaders decode every authored colour themselves.
- Only geometry (positions, normals, UVs, vertex colours) is exported. Materials stay the game's own.
"""
import math, os, random
import bpy, bmesh
from mathutils import Vector, Matrix

ASSETS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')
os.makedirs(ASSETS, exist_ok=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.view_settings.view_transform = 'Standard'   # bakes and texture renders must not be tone mapped
    sc.view_settings.look = 'None'
    return sc


def srgb2lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def jitter(rgb, amt, rnd):
    k = 1 + (rnd.random() * 2 - 1) * amt
    return tuple(min(1.0, max(0.0, c * k)) for c in rgb)


class MeshBuilder:
    """Collects vertices, triangles/quads, per-corner UVs and per-corner colours, then makes one Blender object."""

    def __init__(self):
        self.v, self.f, self.uv, self.col = [], [], [], []

    def vert(self, p):
        self.v.append(tuple(p))
        return len(self.v) - 1

    def face(self, idx, uvs=None, col=(1, 1, 1)):
        self.f.append(tuple(idx))
        self.uv.append(list(uvs) if uvs else [(0.99, 0.5)] * len(idx))
        self.col.append(col if isinstance(col, list) else [col] * len(idx))

    def obj(self, name):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.v, [], self.f)
        me.update()
        uvl = me.uv_layers.new(name='UVMap')
        ca = me.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
        k = 0
        for fi, poly in enumerate(me.polygons):
            for j, li in enumerate(poly.loop_indices):
                uvl.data[li].uv = self.uv[fi][j]
                c = self.col[fi][j]
                ca.data[li].color = (srgb2lin(c[0]), srgb2lin(c[1]), srgb2lin(c[2]), 1.0)
        me.color_attributes.active_color = ca
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


def tube(mb, path, radii, sides, col, uv_u=0.99, cap_end=True):
    """A tube along a polyline (list of Vector) with per-point radii; returns nothing (adds to mb)."""
    rings = []
    for i, p in enumerate(path):
        d = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        a = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        u = d.cross(a).normalized(); w = d.cross(u).normalized()
        ring = []
        for s in range(sides):
            t = s / sides * 2 * math.pi
            ring.append(mb.vert(p + (u * math.cos(t) + w * math.sin(t)) * radii[i]))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for s in range(sides):
            a, b = rings[i][s], rings[i][(s + 1) % sides]
            c, d = rings[i + 1][(s + 1) % sides], rings[i + 1][s]
            mb.face((a, b, c, d), [(uv_u, 0.2), (uv_u, 0.4), (uv_u, 0.6), (uv_u, 0.8)], col)
    if cap_end and radii[-1] > 0.0005:
        tip = mb.vert(path[-1] + (path[-1] - path[-2]).normalized() * radii[-1])
        for s in range(sides):
            mb.face((rings[-1][s], rings[-1][(s + 1) % sides], tip), [(uv_u, 0.3)] * 3, col)


def bake_ao_to_vertex_colors(objs, samples=48, distance=1.5, strength=1.0, floor=0.0):
    """Bakes ambient occlusion with Cycles into a second colour attribute and multiplies it into 'Color'."""
    sc = bpy.context.scene
    sc.cycles.samples = samples
    sc.world = sc.world or bpy.data.worlds.new('W')
    sc.world.light_settings.distance = distance
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objs:
        if not ob.data.materials:
            ob.data.materials.append(bpy.data.materials.new('bake'))
        ao = ob.data.color_attributes.new('AO', 'FLOAT_COLOR', 'CORNER')
        ob.data.color_attributes.active_color = ao
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    for ob in objs:
        me = ob.data
        base, ao = me.color_attributes['Color'], me.color_attributes['AO']
        for i in range(len(base.data)):
            a = ao.data[i].color[0]
            a = floor + (1 - floor) * (1 - strength * (1 - a))
            c = base.data[i].color
            base.data[i].color = (c[0] * a, c[1] * a, c[2] * a, 1.0)
        me.color_attributes.remove(me.color_attributes['AO'])
        me.color_attributes.active_color = me.color_attributes['Color']
        me.materials.clear()


def export_glb(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objs:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    path = os.path.join(ASSETS, name)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_materials='NONE', export_vertex_color='ACTIVE', export_normals=True,
                              export_texcoords=True, export_yup=True, export_animations=False,
                              export_attributes=True)   # custom '_name' attributes (e.g. _flutter)
    print('wrote', path, os.path.getsize(path), 'bytes')
    return path


def tri_count(objs):
    n = 0
    for ob in objs:
        for p in ob.data.polygons:
            n += len(p.vertices) - 2
    return n
