#!/usr/bin/env python3
"""Convert the self-play records (tools/native.c gendata, nnwork/rN/*.txt) into a Hugging Face dataset (Parquet shards + card).

  pip install pyarrow
  python3 tools/nn/export_hf.py --out hf-tafl nnwork/r*/v0-*.txt
  # then: pip install huggingface_hub && hf auth login && hf upload <user>/<name> hf-tafl . --repo-type dataset

One row per position. Games are recovered from the files (a game's positions are consecutive; its ply starts again at the next
game), the move played from a position is recovered from the next position of the same game (the last position of a game has
none). The round is taken from the folder name nnwork/rN (round 1: the hand-made evaluation, round N: the net of round N-1).
"""
import argparse, glob, json, os, re, sys
import pyarrow as pa
import pyarrow.parquet as pq

VARIANTS = {0: 'copenhagen', 1: 'brandubh', 2: 'tablut'}
NF = 16
FEATS = ['att_men', 'def_men', 'king_mobility', 'escape_threats', 'double_escape_threats', 'king_adj_att_sq_half', 'king_adj_def',
         'att_near_king', 'corner_blocks', 'att_next_to_corner', 'corner_danger', 'corner_guards', 'king_edge_distance',
         'att_chains', 'def_on_edge', 'king_capture_threat']
SCHEMA = pa.schema([
    ('game_id', pa.string()), ('round', pa.int16()), ('evaluator', pa.string()), ('variant', pa.string()), ('size', pa.int8()),
    ('ply', pa.int16()), ('side_to_move', pa.string()), ('board', pa.string()), ('move', pa.string()),
    ('search_value', pa.int32()), ('result', pa.string()), ('game_plies', pa.int16()), ('features', pa.list_(pa.float32(), NF)),
])


def sq(i, n):
    return 'abcdefghijk'[i % n] + str(n - i // n)


def move_between(b0, b1, side, n):
    """the mover's piece that left a square and the one that arrived (king = a defender piece)"""
    mine = ('a',) if side == 0 else ('d', 'k')
    f = [i for i in range(n * n) if b0[i] in mine and b1[i] == '.']
    t = [i for i in range(n * n) if b1[i] in mine and b0[i] == '.']
    if len(f) == 1 and len(t) == 1:
        return sq(f[0], n) + '-' + sq(t[0], n)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='+')
    ap.add_argument('--out', default='hf-tafl')
    ap.add_argument('--shard', type=int, default=2_000_000, help='rows per Parquet file')
    ap.add_argument('--license', default='cc-by-4.0', help='cc-by-4.0 or cc0-1.0')
    args = ap.parse_args()
    files = sorted(set(f for p in args.files for f in glob.glob(p)), key=lambda f: (int((re.search(r'/r(\d+)/', f) or [0, 0])[1] or 0), f))
    os.makedirs(os.path.join(args.out, 'data'), exist_ok=True)
    cols = {k: [] for k in SCHEMA.names}
    shard = 0; total = 0; games = 0; per_round = {}; results = {'attackers': 0, 'defenders': 0, 'draw': 0}

    def flush():
        nonlocal shard, cols
        if not cols['ply']:
            return
        t = pa.Table.from_pydict(cols, schema=SCHEMA)
        pq.write_table(t, os.path.join(args.out, 'data', 'train-%05d.parquet' % shard), compression='zstd')
        shard += 1; cols = {k: [] for k in SCHEMA.names}

    def emit(game, rnd, ev, gid):
        nonlocal total, games
        n = int(round(len(game[0][6]) ** 0.5)); games += 1
        res = {'1': 'attackers', '2': 'defenders', '0': 'draw'}[game[0][4]]; results[res] += 1
        for k, t in enumerate(game):
            side = int(t[1]); nxt = game[k + 1] if k + 1 < len(game) else None
            mv = move_between(t[6], nxt[6], side, n) if nxt is not None and int(nxt[2]) == int(t[2]) + 1 else None
            cols['game_id'].append(gid); cols['round'].append(rnd); cols['evaluator'].append(ev); cols['variant'].append(VARIANTS[int(t[0])])
            cols['size'].append(n); cols['ply'].append(int(t[2])); cols['side_to_move'].append('attackers' if side == 0 else 'defenders')
            cols['board'].append(t[6]); cols['move'].append(mv); cols['search_value'].append(int(t[3])); cols['result'].append(res)
            cols['game_plies'].append(int(game[-1][2]) + 1); cols['features'].append([float(x) for x in t[7:7 + NF]])
            total += 1
        per_round[rnd] = per_round.get(rnd, 0) + len(game)
        if len(cols['ply']) >= args.shard:
            flush()

    for fn in files:
        m = re.search(r'/r(\d+)/', fn); rnd = int(m.group(1)) if m else 0
        base = os.path.splitext(os.path.basename(fn))[0]
        game = []; gi = 0
        with open(fn) as f:
            for line in f:
                t = line.split()
                if len(t) != 7 + NF or t[4] not in ('0', '1', '2'):
                    continue
                if game and (int(t[2]) != int(game[-1][2]) + 1 or t[4] != game[-1][4] or t[0] != game[-1][0]
                             or move_between(game[-1][6], t[6], int(game[-1][1]), int(round(len(t[6]) ** 0.5))) is None):
                    emit(game, rnd, 'hand' if game[0][5] == '0' else 'net', 'r%d-%s-%d' % (rnd, base, gi)); gi += 1; game = []
                game.append(t)
        if game:
            emit(game, rnd, 'hand' if game[0][5] == '0' else 'net', 'r%d-%s-%d' % (rnd, base, gi))
        print('%s: %d positions so far' % (fn, total), file=sys.stderr)
    flush()
    stats = {'positions': total, 'games': games, 'results': results, 'positions_per_round': per_round, 'shards': shard}
    with open(os.path.join(args.out, 'stats.json'), 'w') as f:
        json.dump(stats, f, indent=1)
    print(json.dumps(stats, indent=1))
    card = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hf_card.md')).read()
    ev = lambda r: 'hand-made' if r <= 1 else 'net of round %d' % (r - 1)
    lic_text = ('[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): free to use, share and adapt with attribution '
                '(CALMDUST COLLECTION, https://core-calmdust.github.io/aicoding/).') if args.license == 'cc-by-4.0' else \
               '[CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/): public domain, no conditions.'
    size_cat = '10M<n<100M' if total >= 10_000_000 else '1M<n<10M' if total >= 1_000_000 else '100K<n<1M' if total >= 100_000 else 'n<100K'
    rep = {'{LICENSE}': args.license, '{SIZE_CAT}': size_cat, '{POSITIONS}': '{:,}'.format(total), '{GAMES}': '{:,}'.format(games),
           '{ROUNDS}': '\n'.join('| %d | %s | %s |' % (r, ev(r), '{:,}'.format(c)) for r, c in sorted(per_round.items())),
           '{RA}': '{:,}'.format(results['attackers']), '{RD}': '{:,}'.format(results['defenders']), '{RX}': '{:,}'.format(results['draw']),
           '{FEATS}': ', '.join('`%s`' % x for x in FEATS), '{LICENSE_TEXT}': lic_text}
    for k, v in rep.items():
        card = card.replace(k, v)
    open(os.path.join(args.out, 'README.md'), 'w').write(card)


if __name__ == '__main__':
    main()
