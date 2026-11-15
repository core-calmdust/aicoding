# 配信用の重み weights.pk.bin.gz を weights.bin.gz（v4、ヘッダーなしの int16 × フェーズ数）から作る（2026-11-15）。
# 中身は同じ値（ロスレス）：前のフェーズとの差分 → zigzag（符号を下位ビットへ）→ 下位バイト・上位バイトの面 → gzip。
# 8.6MB → 6.3MB。ページ（index.html・pro/pro.js）が読んで元の int16 に戻す（rvUnpack）。重みを変えたら実行：
#   python3 reversi/tools/pack-weights.py
# 形式：先頭 8 バイト = 'RVZ1'・フェーズ数（uint16 LE）・予備（uint16）、続いて n 個の下位バイト、n 個の上位バイト。
import gzip, json, os, struct
import numpy as np
RV = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
raw = gzip.decompress(open(os.path.join(RV, 'weights.bin.gz'), 'rb').read())
nph = json.load(open(os.path.join(RV, 'weights.json')))['nphase']
a = np.frombuffer(raw, dtype='<i2').astype(np.int32)
assert len(a) % nph == 0 and not (len(a) > 16 and a[0] == 0x5652 - 65536), 'v4 weights expected'
W = a.reshape(nph, -1); D = W.copy(); D[1:] = W[1:] - W[:-1]
d = D.reshape(-1)
d = ((d + 32768) % 65536) - 32768                      # (int16 wrap, as the decoder adds back modulo 2^16)
z = ((d << 1) ^ (d >> 31)).astype(np.uint32) & 0xffff
out = struct.pack('<4sHH', b'RVZ1', nph, 0) + (z & 255).astype(np.uint8).tobytes() + (z >> 8).astype(np.uint8).tobytes()
p = os.path.join(RV, 'weights.pk.bin.gz')
open(p, 'wb').write(gzip.compress(out, 9, mtime=0))
print(len(raw), '->', os.path.getsize(p))
