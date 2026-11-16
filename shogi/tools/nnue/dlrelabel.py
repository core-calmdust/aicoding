#!/usr/bin/env python3
"""Relabel PackedSfenValue positions with the value of a dlshogi-type model (ONNX): one inference per position, no search.
The model is only a teacher: its output replaces the score in the training data; nothing of the model goes to the site.

  python3 dlrelabel.py <in.bin> <out.bin> --model model.onnx [--limit N] [--batch 1024] [--provider coreml|cpu] [--workers W]

  score written = 600 * ln(p / (1 - p)), p = the model's win rate for the side to move (so the trainer's sigmoid(score/600) = p).
  Resumable: run the same command again and it continues after the records already in <out.bin>.
  Prints positions/s and, at the end, how the new scores relate to the old ones.
Needs: pip install cshogi onnxruntime numpy   (see tools/nnue/dlrelabel.sh)
"""
import argparse, math, os, sys, time
import numpy as np

PSV = np.dtype([('sfen', 'u1', (32,)), ('score', '<i2'), ('move', '<u2'), ('gamePly', '<u2'), ('game_result', 'i1'), ('padding', 'u1')])
F1, F2 = 62, 57

def feats(chunk):
    """features for a block of records (runs in a worker process)"""
    import cshogi
    from cshogi.dlshogi import make_input_features
    b = cshogi.Board()
    n = len(chunk)
    f1 = np.zeros((n, F1, 9, 9), np.float32); f2 = np.zeros((n, F2, 9, 9), np.float32)
    sf = np.ascontiguousarray(chunk['sfen'])
    for i in range(n):
        b.set_psfen(sf[i])
        make_input_features(b, f1[i], f2[i])
    return f1, f2

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('inp'); ap.add_argument('out')
    ap.add_argument('--model', required=True)
    ap.add_argument('--limit', type=int, default=0, help='stop after this many records of the input (0 = all)')
    ap.add_argument('--batch', type=int, default=1024)
    ap.add_argument('--provider', default='coreml' if sys.platform == 'darwin' else 'cpu')
    ap.add_argument('--workers', type=int, default=max(1, (os.cpu_count() or 2) // 2))
    a = ap.parse_args()

    import onnxruntime as ort
    prov = ['CPUExecutionProvider']
    if a.provider == 'coreml':
        prov = [('CoreMLExecutionProvider', {'ModelFormat': 'MLProgram', 'MLComputeUnits': 'ALL'}), 'CPUExecutionProvider']
    so = ort.SessionOptions(); so.log_severity_level = 3
    if a.provider == 'coreml': so.add_free_dimension_override_by_name('batch_size', a.batch)      # CoreML wants fixed shapes: every batch is padded to --batch
    sess = ort.InferenceSession(a.model, so, providers=prov)
    i1, i2 = [x.name for x in sess.get_inputs()]
    vname = [o.name for o in sess.get_outputs() if 'value' in o.name][0]
    print('providers:', sess.get_providers(), flush=True)

    total = os.path.getsize(a.inp) // PSV.itemsize
    if a.limit: total = min(total, a.limit)
    done = os.path.getsize(a.out) // PSV.itemsize if os.path.exists(a.out) else 0
    if done: print(f'resume at {done}', flush=True)
    if os.path.exists(a.out) and os.path.getsize(a.out) % PSV.itemsize:
        with open(a.out, 'r+b') as f: f.truncate(done * PSV.itemsize)
    data = np.memmap(a.inp, dtype=PSV, mode='r')

    from multiprocessing import Pool
    import signal
    pool = Pool(a.workers, initializer=signal.signal, initargs=(signal.SIGINT, signal.SIG_IGN)) if a.workers > 1 else None   # Ctrl+C: only the main process answers
    B = a.batch; GROUP = B * max(1, a.workers)          # one round: a batch per worker
    t0 = time.time(); n0 = done; so_, sn_, soo, snn, son, cnt = 0.0, 0.0, 0.0, 0.0, 0.0, 0
    with open(a.out, 'ab') as fo:
        while done < total:
            m = min(GROUP, total - done)
            recs = np.array(data[done:done + m])
            parts = [recs[k:k + B] for k in range(0, m, B)]
            fs = pool.map(feats, parts) if pool else [feats(p) for p in parts]
            ps = []
            for f1, f2 in fs:
                if a.provider == 'coreml' and len(f1) < B:      # CoreML compiles per shape: pad the last batch
                    k = len(f1); f1 = np.concatenate([f1, np.zeros((B - k,) + f1.shape[1:], np.float32)]); f2 = np.concatenate([f2, np.zeros((B - k,) + f2.shape[1:], np.float32)])
                    ps.append(sess.run([vname], {i1: f1, i2: f2})[0].reshape(-1)[:k])
                else:
                    ps.append(sess.run([vname], {i1: f1, i2: f2})[0].reshape(-1))
            p = np.clip(np.concatenate(ps).astype(np.float64), 0.0005, 0.9995)
            new = np.rint(600.0 * np.log(p / (1 - p)))
            old = np.clip(recs['score'].astype(np.float64), -3000, 3000); nw = np.clip(new, -3000, 3000)
            so_ += old.sum(); sn_ += nw.sum(); soo += (old * old).sum(); snn += (nw * nw).sum(); son += (old * nw).sum(); cnt += m
            recs['score'] = new.astype(np.int16)
            fo.write(recs.tobytes()); fo.flush()
            done += m
            el = time.time() - t0; r = (done - n0) / el if el > 0 else 0
            print(f'\r{done}/{total}  {r:.0f} positions/s  left {(total - done) / r / 3600 if r else 0:.1f} h   ', end='', flush=True)
    print()
    if cnt > 1:
        mo, mn = so_ / cnt, sn_ / cnt; vo, vn = soo / cnt - mo * mo, snn / cnt - mn * mn
        c = (son / cnt - mo * mn) / math.sqrt(vo * vn) if vo > 0 and vn > 0 else 0
        print(f'old vs new scores on {cnt} positions (clipped to +-3000): correlation {c:.3f}, mean |old| {math.sqrt(soo / cnt):.0f} (rms), mean |new| {math.sqrt(snn / cnt):.0f} (rms)')

if __name__ == '__main__':
    try: main()
    except KeyboardInterrupt: print('\nstopped (the same command continues from here)'); os._exit(0)
