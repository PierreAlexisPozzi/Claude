"""Tileable surface maps for Val des Sapins, built from Blender procedural shader networks and baked with Cycles.

Seamless by construction: every noise / Voronoi node is fed 4D torus coordinates
(cos 2πu, sin 2πu, cos 2πv, sin 2πv) scaled per axis, so the pattern wraps exactly on both edges and can be
stretched along one direction (strata, wood grain) without seams.

Outputs (val-des-sapins/assets, 512x512):
- rock_albedo.jpg / rock_normal.jpg       limestone cliff: horizontal strata, joints, lichen (terrain rock layer)
- timber_albedo.jpg / timber_normal.jpg   weathered larch: grain along U, checks, knots (logs and cladding)
- masonry_albedo.jpg / masonry_normal.jpg granite face: speckle and chisel relief (stone courses)
Albedo maps for buildings are near-neutral (mean ≈ 0.5 display) because the game's vertex colours give the hue;
the rock albedo carries its own colour. Normal maps are OpenGL convention, rows top to bottom = v increasing.

Run: python blender/materials.py   (with bpy==5.3.0)
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, numpy as np
from vds_common import reset, ASSETS

S = 512


class Net:
    """Tiny helper to write shader networks: n('Math', operation='COSINE') etc."""

    def __init__(self, mat):
        self.nt = mat.node_tree
        self.nt.nodes.clear()

    def n(self, kind, **props):
        node = self.nt.nodes.new('ShaderNode' + kind)
        for k, v in props.items():
            if k.startswith('in_'):
                node.inputs[int(k[3:]) if k[3:].isdigit() else k[3:]].default_value = v
            else:
                setattr(node, k, v)
        return node

    def link(self, a, b):
        self.nt.links.new(a, b)

    def math(self, op, a, b=None, val=None):
        m = self.n('Math', operation=op)
        self.link(a, m.inputs[0])
        if b is not None:
            self.link(b, m.inputs[1])
        elif val is not None:
            m.inputs[1].default_value = val
        return m.outputs[0]


def torus(net, ru, rv, off=(0.0, 0.0)):
    """4D torus coordinates of the plane's UV: returns (vector socket, w socket)."""
    tc = net.n('TexCoord'); sep = net.n('SeparateXYZ'); net.link(tc.outputs['UV'], sep.inputs[0])
    tau = 2 * math.pi
    au = net.math('MULTIPLY', sep.outputs['X'], val=tau); av = net.math('MULTIPLY', sep.outputs['Y'], val=tau)
    cu = net.math('MULTIPLY', net.math('COSINE', au), val=ru); su = net.math('MULTIPLY', net.math('SINE', au), val=ru)
    cv = net.math('MULTIPLY', net.math('COSINE', av), val=rv); sv = net.math('MULTIPLY', net.math('SINE', av), val=rv)
    cv = net.math('ADD', cv, val=off[0]); sv = net.math('ADD', sv, val=off[1])
    comb = net.n('CombineXYZ'); net.link(cu, comb.inputs[0]); net.link(su, comb.inputs[1]); net.link(cv, comb.inputs[2])
    return comb.outputs[0], sv


def noise4(net, ru, rv, scale, detail=6, rough=0.55, off=(0, 0)):
    vec, w = torus(net, ru, rv, off)
    nz = net.n('TexNoise', noise_dimensions='4D', in_Scale=scale, in_Detail=detail, in_Roughness=rough)
    net.link(vec, nz.inputs['Vector']); net.link(w, nz.inputs['W'])
    return nz.outputs['Fac']


def voronoi4(net, ru, rv, scale, feature='F1', metric='DISTANCE', off=(0, 0)):
    vec, w = torus(net, ru, rv, off)
    vo = net.n('TexVoronoi', voronoi_dimensions='4D', feature=feature, in_Scale=scale)
    net.link(vec, vo.inputs['Vector']); net.link(w, vo.inputs['W'])
    return vo.outputs[metric if metric in ('Distance', 'Color') else 'Distance']


def ramp(net, fac, stops):
    r = net.n('ValToRGB'); net.link(fac, r.inputs['Fac'])
    els = r.color_ramp.elements
    while len(els) > 1:
        els.remove(els[-1])
    els[0].position, els[0].color = stops[0][0], (*stops[0][1], 1)
    for p, c in stops[1:]:
        e = els.new(p); e.color = (*c, 1)
    return r.outputs['Color']


def bake(build, name):
    """build(net) -> (albedo color socket, height float socket). Bakes both through an emission shader."""
    sc = reset()
    sc.cycles.samples = 8
    bpy.ops.mesh.primitive_plane_add(size=1)
    ob = bpy.context.active_object
    mat = bpy.data.materials.new(name); mat.use_nodes = True; ob.data.materials.append(mat)
    net = Net(mat)
    col, hgt = build(net)
    em = net.n('Emission'); out = net.n('OutputMaterial'); net.link(em.outputs[0], out.inputs['Surface'])
    img = bpy.data.images.new(name, S, S, float_buffer=True)
    tex = net.n('TexImage'); tex.image = img; net.nt.nodes.active = tex
    res = {}
    for key, sock in (('albedo', col), ('height', hgt)):
        net.link(sock, em.inputs['Color'])
        bpy.ops.object.bake(type='EMIT', target='IMAGE_TEXTURES', margin=0)
        res[key] = np.array(img.pixels[:], np.float32).reshape(S, S, 4)[..., :3].copy()
    return res


def save_png(name, rgb):
    img = bpy.data.images.new(name, S, S, alpha=False)
    rgba = np.concatenate([np.clip(rgb, 0, 1), np.ones((S, S, 1), np.float32)], -1)
    img.pixels = rgba[::-1].ravel().tolist()            # Blender rows are bottom-up; files are written top-down
    sc = bpy.context.scene; sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 90
    path = os.path.join(ASSETS, name + '.jpg')
    img.save_render(path, scene=sc)                     # JPEG keeps the embedded budget small
    print('wrote', name + '.jpg', os.path.getsize(path))


def to_display(lin):
    return np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(np.maximum(lin, 0), 1 / 2.4) - 0.055)


def normal_from_height(h, strength):
    """OpenGL normal map; the image is stored top-down so v grows with the row index (game samples flipY=false)."""
    h = h[::-1]                                          # Blender bottom-up -> top-down rows
    du = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength
    dv = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength
    n = np.stack([-du, -dv, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return (n * 0.5 + 0.5)[::-1]                         # back to bottom-up for save_png's flip


def neutral(rgb_display, mean=0.5, keep_hue=0.25):
    lum = rgb_display.mean(-1, keepdims=True)
    out = lum + (rgb_display - lum) * keep_hue
    return out * (mean / max(1e-4, out.mean()))


# ---------------------------------------------------------------- recipes
def rock(net):
    strata = noise4(net, 0.25, 4.5, 1.3, detail=5, rough=0.6)                     # long horizontal bands
    fine = noise4(net, 2.0, 2.0, 6.0, detail=8, off=(3, 1))
    joints = voronoi4(net, 0.5, 1.6, 0.9, feature='DISTANCE_TO_EDGE', off=(5, 2))
    lichen = noise4(net, 1.5, 1.5, 3.0, detail=3, off=(9, 4))
    band = ramp(net, strata, [(0.3, (0.26, 0.24, 0.22)), (0.42, (0.48, 0.45, 0.41)), (0.5, (0.34, 0.31, 0.28)), (0.58, (0.58, 0.55, 0.5)), (0.7, (0.42, 0.4, 0.37))])
    crack = ramp(net, joints, [(0.0, (0.3, 0.28, 0.26)), (0.025, (1, 1, 1))])
    mix = net.n('Mix', data_type='RGBA', blend_type='MULTIPLY', in_Factor=1.0)
    net.link(band, mix.inputs[6]); net.link(crack, mix.inputs[7])
    li = ramp(net, lichen, [(0.62, (1, 1, 1)), (0.7, (0.75, 0.72, 0.5))])
    mix2 = net.n('Mix', data_type='RGBA', blend_type='MULTIPLY', in_Factor=1.0)
    net.link(mix.outputs[2], mix2.inputs[6]); net.link(li, mix2.inputs[7])
    h = net.math('ADD', net.math('MULTIPLY', strata, val=0.6), net.math('MULTIPLY', fine, val=0.4))
    h = net.math('SUBTRACT', h, net.math('MULTIPLY', net.math('LESS_THAN', joints, val=0.025), val=0.2))
    return mix2.outputs[2], h


def timber(net):
    grain = noise4(net, 0.25, 9.0, 1.4, detail=3, rough=0.4)          # stretched along U
    rings = net.math('SINE', net.math('MULTIPLY', grain, val=38.0))
    checks = voronoi4(net, 0.3, 2.5, 0.8, feature='DISTANCE_TO_EDGE', off=(2, 7))
    knots = voronoi4(net, 1.0, 1.0, 3.0, off=(4, 4))
    fine = noise4(net, 1.0, 8.0, 10.0, detail=6, off=(1, 9))
    col = ramp(net, net.math('ADD', net.math('MULTIPLY', rings, val=0.25), net.math('MULTIPLY', fine, val=0.5)),
               [(0.0, (0.36, 0.25, 0.16)), (0.45, (0.52, 0.38, 0.25)), (0.8, (0.62, 0.47, 0.32))])
    kn = ramp(net, knots, [(0.0, (0.35, 0.28, 0.22)), (0.07, (1, 1, 1))])
    ck = ramp(net, checks, [(0.0, (0.45, 0.42, 0.4)), (0.012, (1, 1, 1))])
    m1 = net.n('Mix', data_type='RGBA', blend_type='MULTIPLY', in_Factor=1.0); net.link(col, m1.inputs[6]); net.link(kn, m1.inputs[7])
    m2 = net.n('Mix', data_type='RGBA', blend_type='MULTIPLY', in_Factor=1.0); net.link(m1.outputs[2], m2.inputs[6]); net.link(ck, m2.inputs[7])
    h = net.math('ADD', net.math('MULTIPLY', rings, val=0.15), net.math('MULTIPLY', fine, val=0.5))
    h = net.math('SUBTRACT', h, net.math('MULTIPLY', net.math('LESS_THAN', checks, val=0.012), val=0.25))
    return m2.outputs[2], h


def masonry(net):
    speck = noise4(net, 2.0, 2.0, 40.0, detail=2, off=(1, 3))
    patch = noise4(net, 1.0, 1.0, 3.0, detail=5, off=(6, 2))
    chisel = voronoi4(net, 2.0, 2.0, 9.0, feature='F1', off=(3, 8))
    col = ramp(net, net.math('ADD', net.math('MULTIPLY', speck, val=0.6), net.math('MULTIPLY', patch, val=0.4)),
               [(0.3, (0.38, 0.37, 0.36)), (0.5, (0.55, 0.54, 0.52)), (0.62, (0.7, 0.69, 0.67)), (0.66, (0.25, 0.25, 0.26))])
    h = net.math('ADD', net.math('MULTIPLY', chisel, val=0.5), net.math('MULTIPLY', patch, val=0.5))
    return col, h


def snowpack(net):
    ripples = noise4(net, 0.4, 3.0, 2.2, detail=3, rough=0.5)          # wind ripples across the slope
    grain = noise4(net, 2.0, 2.0, 30.0, detail=4, off=(2, 5))
    crust = voronoi4(net, 1.5, 1.5, 6.0, feature='DISTANCE_TO_EDGE', off=(7, 1))
    col = ramp(net, net.math('ADD', net.math('MULTIPLY', ripples, val=0.7), net.math('MULTIPLY', grain, val=0.3)),
               [(0.3, (0.8, 0.86, 0.95)), (0.55, (0.93, 0.95, 0.98)), (0.7, (1.0, 1.0, 1.0))])
    h = net.math('ADD', net.math('MULTIPLY', ripples, val=0.7), net.math('MULTIPLY', grain, val=0.15))
    h = net.math('SUBTRACT', h, net.math('MULTIPLY', net.math('LESS_THAN', crust, val=0.02), val=0.05))
    return col, h


def main():
    for name, fn, nstr, neutralize in (('rock', rock, 6.0, False), ('timber', timber, 5.0, True), ('masonry', masonry, 4.0, True), ('snowpack', snowpack, 3.0, True)):
        r = bake(fn, name)
        alb = to_display(r['albedo'])
        if neutralize:
            alb = neutral(alb, 0.5, 0.6 if name == 'snowpack' else 0.3)
        save_png(name + '_albedo', alb)
        save_png(name + '_normal', normal_from_height(r['height'][..., 0], nstr * S / 64))


main()
