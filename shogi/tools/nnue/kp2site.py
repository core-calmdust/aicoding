#!/usr/bin/env python3
"""A one-bucket net of trainkp (KMAP=k1, the NUEK format) -> the site's nnue.bin.gz (NUEQ): the same weights without the bucket map.
   python3 tools/nnue/kp2site.py ~/shogi-k1-r3/kp-candidate.bin.gz nnue.bin.gz     (from the shogi folder)"""
import gzip, struct, sys
src, dst = sys.argv[1], sys.argv[2]
d = (gzip.open(src) if src.endswith('.gz') else open(src, 'rb')).read()
magic, h, n_in, kb = struct.unpack('<4i', d[:16])
if magic != 0x4B45554E or kb != 1 or n_in != 2534: sys.exit('not a one-bucket NUEK net (KMAP=k1)')
body = d[16 + 84:]
if len(body) != n_in * h * 2 + h * 4 + 2 * h * 2 + 4: sys.exit('unexpected size')
q = struct.pack('<3i', 0x5145554E, h, n_in) + body
with open(dst, 'wb') as f: f.write(gzip.compress(q, 9, mtime=0) if dst.endswith('.gz') else q)
print(dst, 'H', h, len(q), 'bytes')
