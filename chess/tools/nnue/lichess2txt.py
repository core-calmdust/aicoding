#!/usr/bin/env python3
"""Lichess evaluation database (lichess_db_eval.jsonl, CC0) -> the text lines tools/convert.c reads.

    zstd -dc lichess_db_eval.jsonl.zst | python3 lichess2txt.py | ../convert /dev/stdin out.bin

Each input line is one position: {"fen": "...", "evals": [{"pvs": [{"cp": 31, "line": "e2e4 ..."}], "depth": 36, ...}]}.
Output: "fen;cN|mN;depth;bestmove" from the deepest analysis (the same rule as the current net, MODEL_CARD.md).
Lines whose deepest analysis has no score are skipped. MAX (environment) stops after that many output lines.
"""
import json
import os
import sys


def main():
    lim = int(os.environ.get("MAX", "0") or 0)
    out = sys.stdout
    n = 0
    for line in sys.stdin:
        try:
            d = json.loads(line)
            ev = max(d["evals"], key=lambda e: e.get("depth", 0))
            pv = ev["pvs"][0]
        except (ValueError, KeyError, IndexError):
            continue
        if "cp" in pv:
            v = "c%d" % pv["cp"]
        elif "mate" in pv:
            v = "m%d" % pv["mate"]
        else:
            continue
        best = pv.get("line", "").split(" ", 1)[0]
        out.write("%s;%s;%d;%s\n" % (d["fen"], v, ev.get("depth", 0), best))
        n += 1
        if lim and n >= lim:
            break


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        pass
