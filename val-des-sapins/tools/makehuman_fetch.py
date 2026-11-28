"""Données MakeHuman (CC0) lues par blender/humans.py : téléchargement fichier par fichier depuis un commit épinglé de
MPFB 2, empreintes SHA-256 vérifiées. Rien n'est versionné : les fichiers vont dans web/.cache/raw/makehuman (ou le
dossier donné), à passer ensuite en MH_DATA.

Licence (LICENSE.md de MPFB 2, section C) : les assets (maillage de base, morphes « targets », poids des squelettes,
expressions) sont publiés sous CC0 1.0 ; le code de MPFB (GPL 3) n'est ni téléchargé ni exécuté.

Usage : python3 tools/makehuman_fetch.py [dossier]
        MH_DATA=<dossier> .bpyenv/bin/python blender/humans.py
"""
import hashlib, os, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COMMIT = 'd9648f3257a0b9712281d466245f30d656250154'   # makehumancommunity/mpfb2, branche master au 28/11/2026
BASE = 'https://raw.githubusercontent.com/makehumancommunity/mpfb2/' + COMMIT + '/src/mpfb/data/'
FILES = [   # chemin sous src/mpfb/data, SHA-256
    ('3dobjs/base.obj', '8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c'),
    ('rigs/standard/weights.game_engine.json', '9f4a773e74ce5ba08415b4f30070338e9f75bae5971b5075b10cd6b9caa58473'),
    ('targets/cheek/l-cheek-volume-incr.target.gz', '75bf330b96d0036c46f779ed003782c7380c77dd06c14fd80f1fa20a5093fee1'),
    ('targets/cheek/r-cheek-volume-incr.target.gz', '4df3e61e843c2d3381ef534e90d347b6b8ea763428d69eba8ef2ed5ab0affb8c'),
    ('targets/chin/chin-prominent-decr.target.gz', '4ed14cb51e7ea7b3ecd469a537733924353c683f3cfe545be182d18a220dcb4e'),
    ('targets/chin/chin-width-decr.target.gz', '6c3aaca074630e89951184130a4a158b6f62c9d0cf57cf8eb828c445ff40c21a'),
    ('targets/ears/l-ear-scale-decr.target.gz', '109583d573fa8bb334b5c21488b66019665d977fe8fec9917568ad1a0a199500'),
    ('targets/ears/r-ear-scale-decr.target.gz', '692fbd18e31098b8dbb2373e6010c80c8b01e64ac10c62f2c36a2884eee80d90'),
    ('targets/expression/units/caucasian/eye-left-closure.target.gz', 'ff0d21ceb6da55fe51e03b48a7562a650924fea9bef0c686fcd7aa44d16422ed'),
    ('targets/expression/units/caucasian/eye-left-slit.target.gz', '6dc3efbda318d639b8ca0d65e36aefd43b97db1f118b9272629598843479a9bb'),
    ('targets/expression/units/caucasian/eye-right-closure.target.gz', '2b7be6bc65845d77e5f83b7bf852090854747e448644997795fa59b6cf76122d'),
    ('targets/expression/units/caucasian/eye-right-slit.target.gz', 'f6fd9c311c0537db93e745bce83f4ce3204431b2c3e4b39d4831213b05e1aa98'),
    ('targets/expression/units/caucasian/eyebrows-left-down.target.gz', 'f0cabdd8a225779806b8faabb1afcc4ee830a3eb3c6b1abe045d797328cff323'),
    ('targets/expression/units/caucasian/eyebrows-left-up.target.gz', 'e0be77b6846c62ecc54d589ad1430a2b1a145e8ec067507fae181bd7e6a4eb54'),
    ('targets/expression/units/caucasian/eyebrows-right-down.target.gz', 'ac4ad201d160f1eb7dc076e012bccd41e191d2886fc1b327c8409d8b77d63082'),
    ('targets/expression/units/caucasian/eyebrows-right-up.target.gz', '66060c97949f4fb414fb1b731379f9ca5bcc000e4184ee1f7d527d94b70b14e8'),
    ('targets/expression/units/caucasian/mouth-corner-puller.target.gz', 'd881bb8feda2637bdaef2c7d7c6bed12f0be5914949e5a2cb9b06a583af412c0'),
    ('targets/expression/units/caucasian/mouth-elevation.target.gz', 'c7698c8c82da348e8cace55aa991cf724d9123c92bedd3d6cf6174d72da88b81'),
    ('targets/expression/units/caucasian/mouth-open.target.gz', 'dc1260a8728d93a9c52d6b35b5f55ad39ab8096090acd5ccad7f973c26e28818'),
    ('targets/eyes/l-eye-bag-decr.target.gz', 'fda7aefa804aa2b27f4aac3eee02f43e1d874d79d3fa0a37b901bc654e139abb'),
    ('targets/eyes/l-eye-scale-incr.target.gz', '2d2d2d088931ce206eb6dad91e26318f045c7e4e6b6580acc812750b0f18f4bc'),
    ('targets/eyes/r-eye-bag-decr.target.gz', 'c2c8b58210122cbe5e0effbc4d4a1f5a23dbea800f0a34af48fb16d52aff4b05'),
    ('targets/eyes/r-eye-scale-incr.target.gz', 'af556b9a6f930ce74f86d64f32b2f801bb5f4bb91f49c3ed37225b7d0413c5af'),
    ('targets/head/head-age-decr.target.gz', '9952127abdd162c8d5a3cee5d368fa0bbdc6aab21fec799e9e8be84aa2351472'),
    ('targets/macrodetails/african-female-young.target.gz', '1147ae55ecb0f66bade3f45176b3af187e265878322db172ad1090e9f3108e84'),
    ('targets/macrodetails/african-male-young.target.gz', '05ed84d6df36e788cdfa8da0be15376850524b960cf2f17f3e592b9cf7d21c85'),
    ('targets/macrodetails/asian-female-young.target.gz', 'ee17da733288434e5b6fa120497f1fa6e72bf7faad5d694b0431d7275139170d'),
    ('targets/macrodetails/asian-male-young.target.gz', '0928ed8b9f08f60afb9884cf9e9f33a939ed3a85d7f136de9ccc88a76981d6d7'),
    ('targets/macrodetails/caucasian-female-young.target.gz', 'e9d6212373ac5f1e2c596fa145e363385f4d169c3c6c88ede3bab93b681af041'),
    ('targets/macrodetails/caucasian-male-young.target.gz', 'ffe69537e53148edff2776204ba48cf3bf1f3cbc72966592c8a562ab80b07333'),
    ('targets/macrodetails/universal-female-young-averagemuscle-averageweight.target.gz', '30046c85a461249824548d5319d74c16392842a1ee00ca9a4485ea3eeb06e2e8'),
    ('targets/macrodetails/universal-female-young-averagemuscle-maxweight.target.gz', 'eaec00c7fe67738765170b94648e6cdf1078ff15a2c0f745645750eb6fef45bf'),
    ('targets/macrodetails/universal-female-young-averagemuscle-minweight.target.gz', '5c65527e5d6e83b98ffa3da5bd61372eff70f89e95585bdacd0e3f70e48062aa'),
    ('targets/macrodetails/universal-female-young-maxmuscle-averageweight.target.gz', 'b1b77fc23f47ebe4a47b14651aadcedf44b2d9c2a1323fbda396952b98632627'),
    ('targets/macrodetails/universal-female-young-maxmuscle-maxweight.target.gz', '6a36ca389bd4ba5e2efe1f885d493e19096cd12d2ae7c810add715f6d9fff0f2'),
    ('targets/macrodetails/universal-female-young-maxmuscle-minweight.target.gz', 'f67344b6aa1808737d78b619c062effe04aad0bfe67e9f80fa6294e2eb5342a5'),
    ('targets/macrodetails/universal-female-young-minmuscle-averageweight.target.gz', '2d939513053fb4a58b6752457c00419c0a2b6a658f0f034dc079d59e19931627'),
    ('targets/macrodetails/universal-female-young-minmuscle-maxweight.target.gz', 'bb8da1aa94cecd782ae0d2b58067204589a06e55915717d5852452d60aa751e7'),
    ('targets/macrodetails/universal-female-young-minmuscle-minweight.target.gz', '18ecff47c3606608472afab0f79a88afaf0c3d5c139bf81c1ef7867a9a9b78a5'),
    ('targets/macrodetails/universal-male-young-averagemuscle-averageweight.target.gz', 'e814651195c53971503d9823d6841216718a561951ef064f81d132297f4fa494'),
    ('targets/macrodetails/universal-male-young-averagemuscle-maxweight.target.gz', '13b79074ecf00a0d028495a51865ae9e86c06b5801b6a614257b455ffbec7d10'),
    ('targets/macrodetails/universal-male-young-averagemuscle-minweight.target.gz', 'e4a993057e265088e082ee2aeccc860505e759b27251dc63a78314e1f8c78a16'),
    ('targets/macrodetails/universal-male-young-maxmuscle-averageweight.target.gz', '833caafc302bd9306de494f32ee1bc51d3a2e6641183329b031ac06ef0f4277e'),
    ('targets/macrodetails/universal-male-young-maxmuscle-maxweight.target.gz', '4c88d7850d64ae8a455bd375755769a2153cce98a7e0b1acce6fa0454083d14d'),
    ('targets/macrodetails/universal-male-young-maxmuscle-minweight.target.gz', '0323cb5c604d13207d1a10ade8ce165df1cbf14d91de48ad959a082297669905'),
    ('targets/macrodetails/universal-male-young-minmuscle-averageweight.target.gz', 'd1c0a768f42219e9630f08805939510efbe2a390b451fa52cc575205bc761d7e'),
    ('targets/macrodetails/universal-male-young-minmuscle-maxweight.target.gz', '5cd87b8e6856a3e9e6b71d15580e1ae9b058f478ce8c1ea73c1b145df9c8e0e6'),
    ('targets/macrodetails/universal-male-young-minmuscle-minweight.target.gz', '166a31465a2790a321e55e274a7f43c56bfe58ad1cf443afacd45a7a23abf407'),
    ('targets/mouth/mouth-angles-up.target.gz', '81fb84776356e4f1f1f99bd6f7d16707f385568ed585df4d1826de8ff76e778f'),
    ('targets/mouth/mouth-lowerlip-volume-incr.target.gz', '6eefdf010318ac86aa59aeefffdf1f7e566f280a04e9843003b0543b4dc99179'),
    ('targets/mouth/mouth-upperlip-volume-incr.target.gz', 'e11c109910b3941d5b6c809f6a1c28c12bf08f67f5c126d109002c1aacd43ef6'),
    ('targets/nose/nose-point-width-decr.target.gz', '920cd53d57b8797414af73b59e54d34547ef2e1c79fa0a19ca55dbddc0aa7365'),
    ('targets/nose/nose-scale-horiz-decr.target.gz', '95d8dc4a3589bbb6105191abc6e3cae47c3c424ce189b5f0a611dc098806060d'),
    ('targets/nose/nose-volume-decr.target.gz', '7ef86294767b4813388c409541475684d6dec94711dde063154b49c9520a57bd'),
]


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'web', '.cache', 'raw', 'makehuman')
    n = 0
    for rel, sha in FILES:
        dst = os.path.join(out, rel)
        if os.path.exists(dst) and hashlib.sha256(open(dst, 'rb').read()).hexdigest() == sha:
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        data = urllib.request.urlopen(BASE + rel, timeout=60).read()
        got = hashlib.sha256(data).hexdigest()
        if got != sha:
            sys.exit('empreinte inattendue pour ' + rel + ' : ' + got)
        open(dst, 'wb').write(data); n += 1
    print(len(FILES), 'fichiers vérifiés,', n, 'téléchargés ->', out)


if __name__ == '__main__':
    main()
