"""Embeds the generated assets (val-des-sapins/assets) into game.html as one JSON block of base64 strings.

The block sits between markers at the very end of game.html so the page stays a single self-contained file:
  <!-- VDS-ASSETS:BEGIN --> <script type="application/json" id="vds-assets">{...}</script> <!-- VDS-ASSETS:END -->
Run after the Blender scripts, then ./build.sh.
"""
import base64, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
GAME = os.path.join(ROOT, 'game.html')
BEGIN, END = '<!-- VDS-ASSETS:BEGIN -->', '<!-- VDS-ASSETS:END -->'
MIME = {'.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp'}
BUDGET = 6 * 1024 * 1024

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glb_slim import slim
NO_UV = {'snowmobile.glb', 'lift_vehicles.glb'}   # vertex-coloured only: their UVs are never sampled
for name in sorted(os.listdir(ASSETS)):
    if name.endswith('.glb'):
        slim(os.path.join(ASSETS, name), keep_uv=name not in NO_UV)   # idempotent: 8-bit colours, int8 normals
data, total = {}, 0
for name in sorted(os.listdir(ASSETS)):
    ext = os.path.splitext(name)[1]
    if ext not in MIME:
        continue
    raw = open(os.path.join(ASSETS, name), 'rb').read()
    total += len(raw)
    data[name] = 'data:%s;base64,%s' % (MIME[ext], base64.b64encode(raw).decode('ascii'))
    print('%-28s %8d bytes' % (name, len(raw)))
blob = json.dumps(data, separators=(',', ':')).replace('</', '<\\/')
print('total raw %d bytes, embedded %d bytes' % (total, len(blob)))
if len(blob) > BUDGET:
    sys.exit('asset budget exceeded (%d > %d)' % (len(blob), BUDGET))

html = open(GAME, encoding='utf-8').read()
block = '%s\n<script type="application/json" id="vds-assets">%s</script>\n%s' % (BEGIN, blob, END)
if BEGIN in html:
    a, b = html.index(BEGIN), html.index(END) + len(END)
    html = html[:a] + block + html[b:]
else:
    html = html.rstrip('\n') + '\n' + block + '\n'
open(GAME, 'w', encoding='utf-8').write(html)
print('embedded into', GAME)
