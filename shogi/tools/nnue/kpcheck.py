#!/usr/bin/env python3
"""Independent check of a HalfKP-style shogi net (NUEK, trainkp) in Python / NumPy: the integer evaluation of engine.c
(-DNUE_KB) for positions written by `trainkp --check net data n dump.txt`. The output must equal trainkp --check and
kptool evalpos line for line.

    python3 kpcheck.py net.bin dump.txt > py.txt
"""
import sys

import numpy as np

QA, QB, K = 127, 64, 600


def read_net(path):
    b = open(path, "rb").read()
    if b[:2] == b"\x1f\x8b":
        import gzip
        b = gzip.decompress(b)
    magic, H, IN, KB = np.frombuffer(b, "<i4", 4, 0)
    if magic != 0x4B45554E:
        raise SystemExit("not a NUEK net")
    o = 16
    kmap = np.frombuffer(b, np.uint8, 81, o); o += 84
    W1 = np.frombuffer(b, "<i2", IN * H, o).reshape(IN, H); o += IN * H * 2
    B1 = np.frombuffer(b, "<i4", H, o); o += H * 4
    W2 = np.frombuffer(b, "<i2", 2 * H, o); o += 2 * H * 2
    B2 = int(np.frombuffer(b, "<i4", 1, o)[0])
    return int(H), kmap, W1, B1, W2, B2


def features(board, hand, persp, kmap):
    """engine.c nueB / nueHd with the king bucket offset (pieces: type 1..14 + 16 * colour; hand[c * 8 + t])"""
    ks = next(s for s in range(81) if board[s] == 8 + 16 * persp)
    off = int(kmap[80 - ks if persp else ks]) * 2534
    f = []
    for s in range(81):
        p = board[s]
        if p:
            col, t = p >> 4, p & 15
            f.append(off + ((col != persp) * 14 + t - 1) * 81 + (80 - s if persp else s))
    for hc in range(2):
        for t in range(1, 8):
            for n in range(1, hand[hc * 8 + t] + 1):
                if n <= 19:
                    f.append(off + 2268 + ((hc != persp) * 7 + t - 1) * 19 + n - 1)
    return f


def main():
    H, kmap, W1, B1, W2, B2 = read_net(sys.argv[1])
    for line in open(sys.argv[2]):
        v = [int(x) for x in line.split()]
        board, hand, side = v[:81], v[81:97], v[97]
        total = 0
        for c, persp in enumerate((side, side ^ 1)):
            acc = B1.astype(np.int64) + W1[features(board, hand, persp, kmap)].astype(np.int64).sum(0)
            acc = acc.astype(np.int16).astype(np.int64)            # the engine's int16 accumulator
            x = np.clip(acc, 0, QA)
            total += int((x * x * W2[c * H:(c + 1) * H].astype(np.int64)).sum())
        q = total // QA if total >= 0 else -((-total) // QA)      # C division: towards zero
        print("%.6f" % ((q + B2) * K / (QA * QB)))


if __name__ == "__main__":
    main()
