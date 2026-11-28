"""Allège les modèles glTF produits par les scripts Blender (val-des-sapins/assets/*.glb), sur place :
couleurs de sommets sur 8 bits, normales sur 8 bits (KHR_mesh_quantization), UV retirées quand elles ne servent pas.
Idempotent. À lancer après les scripts Blender, puis `npm run assets` dans web/ (compression meshopt, KTX2, tuiles).
Remplace tools/embed_assets.py, qui intégrait les assets en base64 dans game.html (retiré en T2)."""
import os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from glb_slim import slim

NO_UV = {'snowmobile.glb', 'lift_vehicles.glb'}   # couleurs de sommets seulement : leurs UV ne sont jamais lues
for name in sorted(os.listdir(ASSETS)):
    if name.endswith('.glb'):
        slim(os.path.join(ASSETS, name), keep_uv=name not in NO_UV)
        print('%-28s %8d octets' % (name, os.path.getsize(os.path.join(ASSETS, name))))
