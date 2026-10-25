#!/usr/bin/env python3
"""Build tafl/puzzles.json from the pzgen candidates (JSON lines, tools/native.c pzgen).
usage: build_puzzles.py out.json dir-with-pz_*.jsonl
Every candidate has exactly one first move that wins within the minimal number of own moves (exact search, engine.c pzAtt / pzDef).
Themes (easy → hard within a theme): Copenhagen escape in 2 / 3, capture in 1; Brandubh and Tablut escape / capture; hard captures."""
import json, sys, random, glob, os
out, d = sys.argv[1], sys.argv[2]
random.seed(11)
V = ['copenhagen', 'brandubh', 'tablut']
def load(name):
    L = []
    for f in glob.glob(os.path.join(d, name)):
        L += [json.loads(l) for l in open(f) if l.strip()]
    return L
used = set()
def key(x): return x['b'] + str(x['side'])
def diff(x): return x['n'] * 10 + min(x['moves'], 80) * 0.05 + x['pieces'] * 0.08 + random.random() * 0.6
def pick(cands, n):
    res = []
    for x in sorted(cands, key=lambda x: random.random()):
        if key(x) in used: continue
        used.add(key(x)); res.append(x)
        if len(res) >= n: break
    return sorted(res, key=diff)
themes = []
def theme(tid, grp, goal, cands, n):
    L = pick(cands, n)
    if not L: return
    v = V[L[0]['v']]
    themes.append({'id': tid, 'grp': grp, 'goal': goal, 'v': v, 'puzzles': [{'s': {'v': V[x['v']], 'b': x['b'], 'side': x['side']}, 'n': x['n'], 'answer': x['answer']} for x in L]})
    print(tid, len(L), file=sys.stderr)
c_esc, c_cap = load('pz_c_esc*.jsonl'), load('pz_c_cap*.jsonl')
b_esc, b_cap = load('pz_b_esc*.jsonl'), load('pz_b_cap*.jsonl')
t_esc, t_cap = load('pz_t_esc*.jsonl'), load('pz_t_cap*.jsonl')
theme('esc2', 'Esc', 'esc', [x for x in c_esc if x['n'] == 2 and x['moves'] >= 20], 50)
theme('esc3', 'Esc', 'esc', [x for x in c_esc if x['n'] == 3], 50)
theme('b_esc2', 'Esc', 'esc', [x for x in b_esc if x['n'] == 2], 40)
theme('t_esc2', 'Esc', 'esc', [x for x in t_esc if x['n'] == 2], 40)
theme('cap1', 'Cap', 'cap', [x for x in c_cap if x['n'] == 1 and x['moves'] >= 20], 50)
theme('b_cap1', 'Cap', 'cap', [x for x in b_cap if x['n'] == 1 and x['moves'] >= 10], 40)
theme('t_cap1', 'Cap', 'cap', [x for x in t_cap if x['n'] == 1 and x['moves'] >= 15], 40)
theme('b_cap2', 'Cap', 'cap', [x for x in b_cap if x['n'] >= 2], 40)
theme('t_cap2', 'Cap', 'cap', [x for x in t_cap if x['n'] >= 2], 40)
json.dump({'version': 1, 'daily': ['esc2', 'cap1', 'esc3', 'b_esc2', 'b_cap2', 't_esc2', 't_cap1'], 'themes': themes}, open(out, 'w'), separators=(',', ':'))
print('total', sum(len(t['puzzles']) for t in themes), file=sys.stderr)
