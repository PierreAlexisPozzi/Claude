"""Shrinks a GLB written by the Blender scripts, in place: drops TEXCOORD_0, stores COLOR_0 as normalized unsigned
bytes (core glTF) and NORMAL as normalized signed bytes (KHR_mesh_quantization, supported by three's GLTFLoader).
Usage: python3 tools/glb_slim.py assets/snowmobile.glb [...]"""
import json, struct, sys

CT = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def slim(path):
    raw = open(path, 'rb').read()
    magic, ver, length = struct.unpack_from('<III', raw, 0)
    assert magic == 0x46546C67
    jl, _ = struct.unpack_from('<II', raw, 12); js = json.loads(raw[20:20 + jl])
    bl, _ = struct.unpack_from('<II', raw, 20 + jl); bin_ = raw[28 + jl:28 + jl + bl]
    acc, views = js['accessors'], js['bufferViews']

    def read(ai):
        a = acc[ai]; v = views[a['bufferView']]; fmt, sz = CT[a['componentType']]; n = NC[a['type']]
        off = v.get('byteOffset', 0) + a.get('byteOffset', 0); stride = v.get('byteStride', sz * n)
        return [struct.unpack_from('<' + fmt * n, bin_, off + i * stride) for i in range(a['count'])]

    out, new_views, new_acc = bytearray(), [], []

    def put(data, target=None):
        while len(out) % 4:
            out.append(0)
        vi = len(new_views); new_views.append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)})
        if target:
            new_views[-1]['target'] = target
        out.extend(data)
        return vi

    remap = {}

    def copy_acc(ai):
        if ai in remap:
            return remap[ai]
        a = dict(acc[ai]); v = views[a['bufferView']]; fmt, sz = CT[a['componentType']]; n = NC[a['type']]
        off = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        a['bufferView'] = put(bin_[off:off + a['count'] * sz * n], v.get('target')); a.pop('byteOffset', None)
        remap[ai] = len(new_acc); new_acc.append(a); return remap[ai]

    def quant(ai, kind):
        a = acc[ai]; vals = read(ai)
        if a.get('normalized'):   # integer storage (Blender writes colours as normalized uint16): back to 0..1 / -1..1
            den = {5121: 255.0, 5123: 65535.0, 5120: 127.0, 5122: 32767.0}[a['componentType']]
            vals = [tuple(c / den for c in v) for v in vals]
        if kind == 'color':
            n = 4 if a['type'] == 'VEC4' else 3
            data = bytes(max(0, min(255, round(c * 255))) for v in vals for c in v[:n])
            na = {'componentType': 5121, 'normalized': True, 'count': a['count'], 'type': a['type']}
            pad = 0
        else:   # normal: VEC3 of int8 padded to 4 bytes per vertex (attribute alignment)
            data = bytearray()
            for v in vals:
                data += struct.pack('<bbbb', *(max(-127, min(127, round(c * 127))) for c in v[:3]), 0)
            na = {'componentType': 5120, 'normalized': True, 'count': a['count'], 'type': 'VEC3'}
            pad = 4
        vi = put(bytes(data), 34962)
        if pad:
            new_views[vi]['byteStride'] = pad
        na['bufferView'] = vi; new_acc.append(na); return len(new_acc) - 1

    for m in js['meshes']:
        for p in m['primitives']:
            at = p['attributes']; na = {}
            for k, ai in at.items():
                if k.startswith('TEXCOORD'):
                    continue
                na[k] = quant(ai, 'color') if k.startswith('COLOR') else quant(ai, 'normal') if k == 'NORMAL' else copy_acc(ai)
            p['attributes'] = na
            if 'indices' in p:
                p['indices'] = copy_acc(p['indices'])
    js['accessors'], js['bufferViews'] = new_acc, new_views
    while len(out) % 4:
        out.append(0)
    js['buffers'] = [{'byteLength': len(out)}]
    for k in ('extensionsUsed', 'extensionsRequired'):
        js[k] = sorted(set(js.get(k, [])) | {'KHR_mesh_quantization'})
    jb = json.dumps(js, separators=(',', ':')).encode()
    jb += b' ' * ((4 - len(jb) % 4) % 4)
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(out)) + struct.pack('<II', len(jb), 0x4E4F534A) + jb + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
    open(path, 'wb').write(glb)
    print('slim', path, len(raw), '->', len(glb))


for p in sys.argv[1:]:
    slim(p)
