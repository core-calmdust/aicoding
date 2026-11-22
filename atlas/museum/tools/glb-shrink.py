# Makes the Lewis pieces' files smaller: the three pictures inside each .glb (colour, normal, occlusion/roughness/metal) are
# re-encoded — colour 1024 px, the other two 512 px (the viewer used them at half size anyway). Geometry untouched.
#   python3 atlas/museum/tools/glb-shrink.py atlas/museum/glb/lewis-*.glb
import struct, json, sys, io
from PIL import Image
for f in sys.argv[1:]:
    b = open(f, 'rb').read(); jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl]); bin0 = 20 + jl + 8; old = b[bin0:]
    m = j['materials'][0]; col = j['textures'][m['pbrMetallicRoughness']['baseColorTexture']['index']]['source']
    img_bv = {im['bufferView']: i for i, im in enumerate(j['images'])}; out = bytearray()
    for i, bv in enumerate(j['bufferViews']):
        data = old[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
        if i in img_bv:
            im = Image.open(io.BytesIO(data)).convert('RGB'); is_col = img_bv[i] == col; side = 1024 if is_col else 512
            if max(im.size) > side: im = im.resize((side, side), Image.LANCZOS)
            o = io.BytesIO(); im.save(o, 'JPEG', quality=84 if is_col else 88, optimize=True, subsampling=0 if not is_col else 2); data = o.getvalue(); j['images'][img_bv[i]]['mimeType'] = 'image/jpeg'
        while len(out) % 4: out.append(0)
        bv['byteOffset'] = len(out); bv['byteLength'] = len(data); out += data
    while len(out) % 4: out.append(0)
    j['buffers'][0]['byteLength'] = len(out); js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * (-len(js) % 4)
    g = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(out)) + b'BIN\0' + bytes(out)
    open(f, 'wb').write(g); print(f.split('/')[-1], len(b) // 1024, '->', len(g) // 1024, 'KB')
