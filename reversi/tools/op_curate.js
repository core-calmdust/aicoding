// (2026-11-24 第2期・担当B) the practice problems of the reversi opening course, off the study line (追1: the line itself was just
// played on the board, so its own next moves are no question). For a named line: from each position of the line's own part (where it
// leaves its parent line, to its end) the side to move plays another reasonable move (within 8 discs of the best: a slip to punish too, by the stored values
// or the engine) — 「定石を外れた」 — and the opponent finds the best answer. Kept when: 4+ legal moves; the best move is the same in
// two searches (0.3 s and 1.5 s) and every other move is 1.2+ discs below it in both (≤ 11 points in REVERSI.points); nobody is far
// ahead (|best| ≤ 6); 4+ squares (the 8 symmetries) from every board the game shows (every line's study positions, lessons, warm-ups,
// puzzles) and from the problems kept before. Up to 5 per line, easy → hard (d: moves within 4 discs of the best, then legal moves).
// usage: node reversi/tools/op_curate.js <set id or line moves>,…  → reversi/opcourse-probs.json { "<line moves>": [ problem… ] }
const fs = require('fs'), path = require('path'), ROOT = path.join(__dirname, '..', '..');
const RO = require(path.join(ROOT, 'tools/lesson-verify-rvopen.js')), X = RO.rx(), E = RO.eng(), ST = RO.steps();
const OUT = path.join(ROOT, 'reversi/opcourse-probs.json'), res = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const EV = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/opcourse-evals.json'), 'utf8'));
const GAP = 1.5, DEC = 4;   // (every other move 1.5+ discs below in both searches — ≤ 10 points; the checker's line is 1.2 / ≤ 11 — and |best| ≤ 4 where the checker says 6: a margin for the timed searches, 追26; 4 from 2026-11-25: a 4.9 read 6.9 once, 追84)
const sqn = q => 'abcdefgh'[q & 7] + ((q >> 3) + 1);
const want = new Set(process.argv[2].split(','));
const shown = []; ST.forEach(s => { for (let k = 0; k <= s.mv.length; k++) shown.push(X.rvAfter(s.mv.slice(0, k).join('')).split(':')[0]); });
const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/lessons.json'), 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/puzzles.json'), 'utf8'));
LS.lessons.forEach(l => { l.problems.forEach(p => shown.push(String(p.cells))); (l.warm || []).forEach(w => shown.push(String(w.cells))); });
(PZ.levels || []).forEach(lv => lv.puzzles.forEach(p => shown.push(String(p.cells))));
const ST0 = { n: 0, near: 0, few: 0, unstable: 0, decided: 0, gap: 0, words: 0 }, kept = []; for (const k in res) if (!want.has(k)) res[k].forEach(p => kept.push(p.pos.split(':')[0]));
for (const s of ST) { const key = s.ln.moves; if (!want.has(key) && !want.has(s.set.id)) continue;
  const parent = ST.filter(x => x.ln.moves.length < key.length && key.startsWith(x.ln.moves)).reduce((a, x) => !a || x.ln.moves.length > a.length ? x.ln.moves : a, '');
  const d0 = parent ? parent.length / 2 : 1, cand = [];
  // (④ at least 3 moves of the line first: a move off it at the 2nd move is another family)
  for (let k = Math.max(d0, 3); k < s.mv.length; k++) { const pre = s.mv.slice(0, k).join(''), pos = X.rvAfter(pre), [cs, tm] = pos.split(':'), c = cs.split('').map(Number), me = +tm;
    const ev = EV[pre] || E(pos, 300), best = ev[0][1];
    for (const [m, v] of ev) { if (m === s.mv[k] || v < best - 8) continue;
      if (ST.some(o => o !== s && o.ln.moves.startsWith(pre + m))) continue;   // (④ a move into another named line is that line's study)
      const q = X.rvSq(m), f = X.rvFlips(c, q, me), nc = c.slice(); nc[q] = me; f.forEach(x => { nc[x] = me; }); let tm2 = 3 - me; if (!X.rvLegal(nc, tm2).length) continue;
      const todo = [[nc, tm2, pre + m, 0]];
      while (todo.length && cand.length < 12) { const [cur, side, path, ply] = todo.shift();   // (the move off the line, then the engine's two best moves for each side: boards 4+ squares from every one shown)
        if (ply < 8) { const e0 = E(cur.join('') + ':' + side, 150); for (const [mm] of e0.slice(0, ply < 2 ? 3 : 2)) { const q2 = X.rvSq(mm), f2 = X.rvFlips(cur, q2, side), c2 = cur.slice(); c2[q2] = side; f2.forEach(x => { c2[x] = side; }); if (X.rvLegal(c2, 3 - side).length && !ST.some(o => (path + mm).startsWith(o.ln.moves) && o.ln.moves.length > key.length)) todo.push([c2, 3 - side, path + mm, ply + 1]); } }
        const Q = cur.join('') + ':' + side, b = cur.join(''); ST0.n++;
        if (shown.some(z => RO.dist(b, z) <= 3) || kept.some(z => RO.dist(b, z) <= 3) || cand.some(z => RO.dist(b, z.pos.split(':')[0]) <= 3)) { ST0.near++; continue; }
        const lg = X.rvLegal(cur, side); if (lg.length < 4) { ST0.few++; continue; }
        const e1 = E(Q, 300), e2 = E(Q, 1500); if (e1[0][0] !== e2[0][0]) { ST0.unstable++; continue; }
        if (Math.abs(e2[0][1]) > DEC || Math.abs(e1[0][1]) > DEC) { ST0.decided++; continue; } if (e1[1][1] > e1[0][1] - GAP || e2[1][1] > e2[0][1] - GAP) { ST0.gap++; continue; }
        // (追26: the searches are timed — read both again from a cleared table, as the checker's --deep does, and keep only when the second reads agree)
        // (2026-11-25 担当B: five times over from 12:50 — 谷田 q3 passed three and the checker's --deep then read c6 within 0.4; three times over — ノーカン q4 passed one reread and then failed the checker's --deep (a3 within 0.5 of d1 at 0.3 s))
        let rr = false; for (let t = 0; t < 5 && !rr; t++) { const r1 = E(Q, 300), r2 = E(Q, 1500); if (r1[0][0] !== e2[0][0] || r2[0][0] !== e2[0][0] || Math.abs(r1[0][1]) > DEC || Math.abs(r2[0][1]) > DEC || r1[1][1] > r1[0][1] - GAP || r2[1][1] > r2[0][1] - GAP) rr = true; } if (rr) { ST0.unstable++; continue; }
        // (⑦ every wrong move has a reason on the board in リバガメ's words: a corner given, X / C, openness, the opponent's moves, the
        // flips or the moves left after the reply — not the 「数は近いけど」 line with no difference to show)
        // (2026-11-25: with the line's own name and voice, at every place 1〜5 it may be asked — the words vary with them, as the verifier reads them)
        { const A = X.rvSq(e2[0][0]); let wb = false;
          for (let j = 0; j < 5 && !wb; j++) { const W = X.rvOpJa({ pos: Q, kind: 'best', ans: String(A), P: { rv: 'op', ans: A, ev: e2 } }, String(s.ln.name.ja), j, X.rvOpVoice(key), true);
            if (lg.some(u => u !== A && /数は近い/.test(String(W.ng(u))))) wb = true; }
          if (wb) { ST0.words++; continue; } }
        const near = e2.filter(x => x[1] >= e2[0][1] - 4).length;
        cand.push({ pos: Q, via: path, k, dev: m, ply, best: e2[0][0], sc: e2, sc2: e1, d: near * 100 + lg.length }); }
    } }
  cand.sort((a, b) => a.d - b.d); const pick = [];   // (spread over the line: one per deviation point first)
  for (const c of cand) { if (pick.length >= 5) break; if (pick.some(p => p.k === c.k) || pick.filter(p => p.best === c.best).length >= 2) continue; pick.push(c); }
  for (const c of cand) { if (pick.length >= 5) break; if (pick.includes(c) || pick.filter(p => p.best === c.best).length >= 2) continue; pick.push(c); }
  pick.sort((a, b) => a.d - b.d); res[key] = pick; pick.forEach(p => kept.push(p.pos.split(':')[0]));
  console.log(key, s.ln.name.ja, 'candidates', cand.length, 'kept', pick.length, JSON.stringify(ST0)); }
fs.writeFileSync(OUT, JSON.stringify(res));
