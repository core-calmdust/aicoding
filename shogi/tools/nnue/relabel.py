#!/usr/bin/env python3
"""relabel: new teacher values for training positions, from a USI engine's search (the teacher only: nothing of it is shipped).

  python3 relabel.py in.bin out.bin --engine ~/shogi-yo-ours/yo-SFNN_ka2_2048_8_64_progress8 \
      --opt EvalDir=/Users/.../eval-SFNN_ka2_2048_8_64_progress8 --opt FV_SCALE=24 --nodes 1000 --count 300000000 --procs 10

in.bin / out.bin: YaneuraOu PackedSfenValue files (40 bytes a position: prep's output, the trainers' input). Positions
[--start, --start + --count) of in.bin are searched (--nodes a position, one thread each, --procs engines side by side) and
written to out.bin with the new value; the move, ply and game result stay. Stopping is safe (Ctrl+C): every engine's part
file (out.bin.part00 ...) is kept, and the same command goes on where it stopped; when all are done they are joined.

The engine's "score cp" is 100 a pawn; the file's value is YaneuraOu's own unit (90 a pawn, win rate = sigmoid(v / 600)), so
value = cp * 0.9 (--scale). A mate is +-3000, and values are kept inside +-3000 (prep's limit).
"""
import argparse, os, re, struct, subprocess, sys, time
from multiprocessing import Process

REC = 40
HC = {(1, 0): 0, (2, 1): 1, (4, 3): 2, (4, 11): 3, (4, 7): 4, (6, 31): 5, (6, 63): 6, (5, 15): 7}   # (bits, code LSB first) -> type
HH = {(b - 1, c >> 1): t for (b, c), t in HC.items() if t}                                         # hand pieces: without the first bit
LET = ' PLNSBRGK'

def sfen_of(rec):
    """PackedSfen (32 bytes) -> SFEN text (the same decoding as psv.h)."""
    v = int.from_bytes(rec[:32], 'little'); p = 0
    def bit():
        nonlocal p; b = (v >> p) & 1; p += 1; return b
    def bits(n):
        nonlocal p; b = (v >> p) & ((1 << n) - 1); p += n; return b
    def piece(tab):
        code = n = 0
        while n < 9:
            code |= bit() << n; n += 1
            t = tab.get((n, code))
            if t is not None: return t
        raise ValueError('bad packed sfen')
    side = bit(); k = [bits(7), bits(7)]
    bd = [''] * 81   # index: row * 9 + col (row 0 = rank 1, col 0 = file 9)
    def sq(y): return (y % 9) * 9 + (8 - y // 9)
    for c in (0, 1):
        if k[c] < 81: bd[sq(k[c])] = 'K' if c == 0 else 'k'
    for y in range(81):
        if y == k[0] or y == k[1]: continue
        t = piece(HC)
        if not t: continue
        pro = 0 if t == 7 else bit(); col = bit()
        s = ('+' if pro else '') + (LET[t] if col == 0 else LET[t].lower()); bd[sq(y)] = s
    hand = [[0] * 8, [0] * 8]
    while p < 256:
        t = piece(HH)
        if t != 7: bit()
        hand[bit()][t] += 1
    rows = []
    for r in range(9):
        s = ''; e = 0
        for c in range(9):
            x = bd[r * 9 + c]
            if not x: e += 1; continue
            if e: s += str(e); e = 0
            s += x
        rows.append(s + (str(e) if e else ''))
    hs = ''
    for c in (0, 1):
        for t in (6, 5, 7, 4, 3, 2, 1):
            n = hand[c][t]
            if n: hs += (str(n) if n > 1 else '') + (LET[t] if c == 0 else LET[t].lower())
    return '/'.join(rows) + (' b ' if side == 0 else ' w ') + (hs or '-') + ' 1'

def worker(i, a, lo, hi):
    part = f'{a.out}.part{i:02d}'
    done = os.path.getsize(part) // REC if os.path.exists(part) else 0
    if done >= hi - lo: return
    eng = subprocess.Popen([a.engine], cwd=os.path.dirname(a.engine) or '.', stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1)
    def send(s): eng.stdin.write(s + '\n'); eng.stdin.flush()
    def until(tok):
        last = None
        while True:
            l = eng.stdout.readline()
            if not l: raise RuntimeError('the engine stopped')
            if l.startswith(tok): return last
            if ' score ' in l: last = l
    send('usi'); until('usiok')
    for o in ['Threads=1', f'USI_Hash={a.hash}', 'BookFile=no_book', 'NetworkDelay=0', 'NetworkDelay2=0', 'ConsiderationMode=false'] + a.opt:
        n, _, val = o.partition('='); send(f'setoption name {n} value {val}')
    send('isready'); until('readyok'); send('usinewgame')
    rs = re.compile(r' score (cp|mate) ([+-]?\d+|[+-])')
    with open(a.inp, 'rb') as f, open(part, 'r+b' if done else 'wb') as g:
        f.seek((lo + done) * REC); g.truncate(done * REC); g.seek(done * REC)
        n = done; t0 = time.time(); buf = bytearray()
        while n < hi - lo:
            blk = f.read(min(1000, hi - lo - n) * REC)
            if len(blk) < REC: break
            for j in range(0, len(blk) - REC + 1, REC):
                rec = blk[j:j + REC]
                send('position sfen ' + sfen_of(rec)); send(f'go nodes {a.nodes}'); l = until('bestmove')
                sc = struct.unpack_from('<h', rec, 32)[0]
                m = rs.search(l) if l else None
                if m:
                    if m.group(1) == 'mate': sc = -3000 if m.group(2).startswith('-') else 3000
                    else: sc = max(-3000, min(3000, int(round(int(m.group(2)) * a.scale))))
                buf += rec[:32] + struct.pack('<h', sc) + rec[34:]; n += 1
            g.write(buf); g.flush(); buf.clear()
            if i == 0 and (n - done) % 20000 < 1000:
                r = (n - done) / max(time.time() - t0, 1e-9)
                print(f'  {n * a.procs / 1e6:8.2f} of {(a.count) / 1e6:.0f} million, about {r * a.procs:.0f} positions/s, {(hi - lo - n) / max(r, 1e-9) / 3600:.1f} h left', flush=True)
    try: send('quit')
    except Exception: pass

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('inp'); ap.add_argument('out'); ap.add_argument('--engine', required=True); ap.add_argument('--opt', action='append', default=[])
    ap.add_argument('--nodes', type=int, default=1000); ap.add_argument('--start', type=int, default=0); ap.add_argument('--count', type=int, default=0)
    ap.add_argument('--procs', type=int, default=os.cpu_count() or 4); ap.add_argument('--hash', type=int, default=64); ap.add_argument('--scale', type=float, default=0.9)
    a = ap.parse_args(); a.engine = os.path.abspath(os.path.expanduser(a.engine))
    total = os.path.getsize(a.inp) // REC
    if a.count <= 0 or a.start + a.count > total: a.count = total - a.start
    per = a.count // a.procs; a.count = per * a.procs
    print(f'{a.count / 1e6:.1f} million positions from {a.start}, {a.nodes} nodes each, {a.procs} engines', flush=True)
    ps = [Process(target=worker, args=(i, a, a.start + i * per, a.start + (i + 1) * per)) for i in range(a.procs)]
    for p in ps: p.start()
    try:
        for p in ps: p.join()
    except KeyboardInterrupt:
        for p in ps: p.terminate()
        sys.exit('stopped: the same command goes on from here')
    parts = [f'{a.out}.part{i:02d}' for i in range(a.procs)]
    if any(not os.path.exists(x) or os.path.getsize(x) != per * REC for x in parts): sys.exit('not finished (an engine stopped?): run the same command again')
    with open(a.out, 'wb') as g:
        for x in parts:
            with open(x, 'rb') as f:
                while True:
                    b = f.read(1 << 24)
                    if not b: break
                    g.write(b)
    for x in parts: os.remove(x)
    print(f'done: {a.count} positions -> {a.out}', flush=True)

if __name__ == '__main__': main()
