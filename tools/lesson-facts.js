#!/usr/bin/env node
// Board-fact check of the lessons (2026-11-22 ユーザー：アマゾンの「緑の印はそれぞれの方向でいちばん遠いマス」が実際には違っていた。
// 文章と合わせて問題のチェックもきちんと評価する). Each game's lesson data is replayed with its own engine in Node and checked against
// what the board shows and what the words say:
//   - every answer / accepted move is a legal move of the position, and the best one is among them
//   - a warm-up's guided moves are legal; marks the words call reachable are reachable, "the farthest square" really is the farthest …
//   node tools/lesson-facts.js [game,…] [--json out.json]     → exit code 1 if anything is wrong
// tools/lesson-quality.js reads the result (a lesson with a wrong fact fails, whatever its words score; openings too: '<game>/open' → opening id).
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), games = (args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--json') || '').split(',').filter(Boolean);
const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const out = {};   // game → { lessonId: [problems found] }
const bad = (g, id, msg) => { ((out[g] = out[g] || {})[id] = out[g][id] || []).push(msg); };

const CHECKS = {
  // (2026-11-23 lesson loop) the go lessons ('go', key = the step's index): every answer (ok / good / half) is a legal move of the
  // position (go/rules.js), and the life & death steps (live / kill / nakade / corner) are solved exactly (go/tsumego.js, the puzzle
  // solver): the moves that reach the goal (live = Black lives, kill = Black dies, with best play) are exactly the stored ok moves,
  // and the side not to move could still change the result by moving first (the status depends on who moves — not already settled).
  // Found: 「二眼をつくる（生き）」1問目 had four more living moves than its answer, scored as wrong in the 2D lesson.
  go() {
    const R = require(path.join(ROOT, 'go/rules.js')), T = require(path.join(ROOT, 'go/tsumego.js')), L = J('go/lessons.json'), g = 'go', EX = { exact: true };
    const VP = (() => { const w = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'go/voice-pen-ja.js'), 'utf8'))(w); return w.I18N['ja@pen'] || {}; })();
    const LD = { live: 'live', kill: 'kill', nakade: 'kill', corner: null };
    L.steps.forEach((st, si) => { const K = String(si);
      (st.problems || []).forEach((p, pi) => { const w = `problem ${pi + 1}`, n = p.s.n, pos = R.Pos.from(p.s);
        [...(p.ok || []), ...(p.good || []), ...(p.half || [])].forEach(m => { const i = R.parseCoord(m, n); if (i == null || i < 0 || !pos.tryPlay(i)) bad(g, K, `${w}: ${m} is not a legal move`); });
        // (2026-11-23 09:50) the 3D words (go/voice-pen-ja.js <step>/<i>.why / .ng) point ([D1] → the green / red spot) only at an empty
        // point of the board, or ([H7]の黒石) at a stone of that colour — found: 「逃げる」1問目 had kept the old problem's point after a rebuild
        for (const f of ['why', 'ng']) for (const [, q, of] of String(VP[st.id + '/' + pi + '.' + f] || '').matchAll(/\[([A-HJ-T](?:1[0-9]|[1-9]))\](の[黒白]石)?/g)) {
          const i = R.parseCoord(q, n), want = of ? (of[1] === '黒' ? 1 : 2) : 0;
          if (i == null || pos.b[i] !== want) bad(g, K, `${w}: the 3D ${f} points at ${q}${of || ''}, but the board has ${i == null ? 'no such point' : ['an empty point', 'a black stone', 'a white stone'][pos.b[i]]} there`); }
        if (!(st.id in LD)) return;
        const goal = LD[st.id] || (p.s.turn === 1 ? 'live' : 'kill'), G = p.s.turn === 1 ? 'b' : 'w', tc = goal === 'kill' ? (G === 'b' ? 'w' : 'b') : G, wall = goal === 'kill' ? G : (G === 'b' ? 'w' : 'b'), S = p.s.stones;
        const target = [], region = []; for (let i = 0; i < n * n; i++) if (S[i] === tc) target.push(i);
        const seen = new Set(target), stack = [...target];   // the region: the target and the points reached from it without crossing the wall's stones
        while (stack.length) { const i = stack.pop(); region.push(i); const x = i % n, y = (i / n) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const j = Y * n + X; if (seen.has(j) || S[j] === wall) continue; seen.add(j); stack.push(j); } }
        if (region.length > 30) { bad(g, K, `${w}: the area to read is too big (${region.length} points)`); return; }
        const P = { s: p.s, goal, target, region };
        const win = T.solve(P, [], 5, false, EX).filter(e => e.need > 0).map(e => R.coord(e.m, n)).sort(), ok = (p.ok || []).slice().sort();
        if (win.join() !== ok.join()) bad(g, K, `${w}: the moves that ${goal === 'live' ? 'live' : 'kill'} are ${win.join(' ') || 'none'}, the answer says ${ok.join(' ')}`);
        if (!T.solve(P, [-1], 7, true, EX).some(e => e.need === 0)) bad(g, K, `${w}: already ${goal === 'live' ? 'alive' : 'dead'} whoever moves first`); }); });
  },
  // (2026-11-22 lesson loop) the backgammon lessons ('backgammon', key = the step's index): every candidate play of a play problem is a
  // legal play of the roll (backgammon/bg.js genPlays — the 3D words come from the commentary engine on the best one), the race
  // questions' pip counts (qv.a = yours, qv.b = theirs) and their right answer (who leads, by how much) hold on the board, and the
  // shots questions' share is the count out of 36.
  'backgammon'() {
    const BG = require(path.join(ROOT, 'backgammon/bg.js')), LS = J('backgammon/lessons.json'), G = 'backgammon';
    const seenBg = new Map();
    const dec = (s0, side) => { const s1 = side === 1 ? String(s0).slice(26) + String(s0).slice(0, 26) : String(s0), q = new Int8Array(52); for (let i = 0; i < 52; i++) q[i] = parseInt(s1[i], 16) || 0; return q; };
    LS.steps.forEach((st, si) => (st.problems || []).forEach((P, pi) => { const id = String(si), q0 = dec(P.pos, P.side || 0), w = `q${pi + 1}`;
      if (P.kind === 'play') {
        const legal = new Set(BG.genPlays(q0, 0, P.dice[0], P.dice[1]).map(x => BG.key(x.pos)));
        const got = new Set();
        P.plays.forEach(([m], k) => { const q = q0.slice(); for (let i = 0; i + 1 < m.length; i += 2) BG.apply(q, 0, m.charCodeAt(i) - 65, m.charCodeAt(i + 1) - 65);
          if (!legal.has(BG.key(q))) bad(G, id, `${w}: play ${k + 1} (${m}) is not a legal play of ${P.dice.join('-')}`); got.add(BG.key(q)); });
        // (2026-11-23 lesson loop) the problem is judged by the rank of your play among P.plays (app.js lessonSubmit): a legal play
        // missing from the list scores as the worst one — every legal play is listed (or the 40 best: the stored lists stop at 40,
        // the plays left out are the worse ones), the best one first and ahead of the 2nd
        if (got.size !== legal.size && got.size < 40) bad(G, id, `${w}: ${legal.size - got.size} legal plays of ${P.dice.join('-')} are not in the list`);
        if (P.plays.length > 1 && !(P.plays[0][1] > P.plays[1][1])) bad(G, id, `${w}: the answer is not ahead of the 2nd play`);
        // the openings' first move (open1 / open2: 「最初の1手で {d} が出た」) is never a double — the opening roll is two different numbers
        if (/^open[12]$/.test(st.id) && P.dice[0] === P.dice[1]) bad(G, id, `${w}: ${P.dice.join('-')} is a double, which the first move of a game never rolls`);
        // the same board and the same roll in two problems of the course is one problem asked twice
        //  (駒の動かし方とダイス had オープニング①'s 3-1 / 6-1 / 4-2 at the start position)
        const sig = P.pos + ':' + P.dice.slice().sort().join('');
        if (seenBg.has(sig)) bad(G, id, `${w}: the same position and roll as ${seenBg.get(sig)}`); else seenBg.set(sig, `${st.id} ${w}`);
      } else if (P.q === 'race') {
        const a = BG.pips(q0, 0), b = BG.pips(q0, 1), v = P.qv || {}; if (a !== v.a || b !== v.b) bad(G, id, `${w}: pips ${a}/${b}, the words say ${v.a}/${v.b}`);
        const o = P.opts[P.ans], [k, n] = Array.isArray(o) ? o : [o]; const okA = a === b ? k === 'even' : (k === (a < b ? 'lead_c' : 'lead_o') && n === Math.abs(a - b));
        if (!okA) bad(G, id, `${w}: the right answer ${JSON.stringify(o)} does not match pips ${a}/${b}`);
      } else if (P.q === 'shots') { const v = P.qv || {}; if (Math.abs(Math.round(v.n / 36 * 100) - v.p) > 1) bad(G, id, `${w}: ${v.n} of 36 is not ${v.p}%`);
        const o = P.opts[P.ans]; if ((Array.isArray(o) ? o[1] : o) !== v.n) bad(G, id, `${w}: the right answer is not ${v.n}`); }
    }));
  },
  // (2026-11-22 lesson loop) the reversi openings ('reversi/open', key = the line's moves): every line replays legally from the start
  // (a side with no move passes), the 3D guide's fixed words hold — the first move is f5 (「4か所どこに打っても同じ形」), the second
  // is d6 / f6 / f4 (縦取り / 斜め取り / 並び取り) — and each practice move (the line's next move) is legal where it is asked. The
  // numbers in the guide (flips, the opponent's moves after, openness) are counted on the board by atlas/lessons3d.js rvOpFacts.
  'reversi/open'() {
    const O = J('reversi/openings.json'), G = 'reversi/open', D8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    const sq = m => (+m[1] - 1) * 8 + 'abcdefgh'.indexOf(m[0]);
    const flips = (b, q, me) => { if (b[q]) return []; const o = []; for (const [dr, dc] of D8) { let r = (q >> 3) + dr, c = (q & 7) + dc; const t = [];
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && b[r * 8 + c] === 3 - me) { t.push(r * 8 + c); r += dr; c += dc; } if (t.length && r >= 0 && r < 8 && c >= 0 && c < 8 && b[r * 8 + c] === me) o.push(...t); } return o; };
    const any = (b, me) => b.some((_, q) => flips(b, q, me).length);
    O.sets.forEach(st => st.lines.forEach(ln => { const K = ln.moves, mv = K.match(/../g) || []; let b = Array(64).fill(0), me = 1; b[27] = b[36] = 2; b[28] = b[35] = 1;
      if (mv[0] !== 'f5') bad(G, K, 'the first move is not f5'); if (mv[1] && !['d6', 'f6', 'f4'].includes(mv[1])) bad(G, K, 'the second move is not d6 / f6 / f4');
      for (let i = 0; i < mv.length; i++) { if (!any(b, me)) me = 3 - me; const q = sq(mv[i]), f = flips(b, q, me);
        if (!f.length) { bad(G, K, `move ${i + 1}: ${mv[i]} is not legal`); return; } b[q] = me; f.forEach(z => { b[z] = me; }); me = 3 - me; } }));

    // (2026-11-24 第2期・担当B) the verified lines (reversi/opcourse-probs.json: 5 problems off the study line, 追1): the strict ①〜⑨, the two
    // stored searches, the way there, no near board, the order of the 2D and the 3D, リバガメ's words for every legal move — tools/lesson-verify-rvopen.js
    require('./lesson-verify-rvopen.js')().forEach(fa => bad(G, fa.step, `q${fa.q}: ${fa.msg}`));
  },
  // (2026-11-22 lesson loop) the gomoku openings (珠型, 'gomoku/open'): the line replays legally under renju (no forbidden black move,
  // no stone on a stone), every practice position loads, and its best answer is a legal move — not a black forbidden point, and when
  // the opponent has a four, the answer stops it (or makes five)
  'gomoku/open'() {
    const E = require(path.join(ROOT, 'gomoku/engine.js')), O = J('gomoku/openings.json'), G = 'gomoku/open';
    O.sets.forEach(g => {
      try { E.replay('renju', g.study.map(x => E.sqOf(x[0]))); } catch (e) { bad(G, g.id, 'the line does not replay: ' + e.message); }
      (g.problems || []).forEach((P, j) => {
        let pos; const cells = a => String(a || '').split(/\s+/).filter(Boolean).map(E.sqOf);
        try { pos = E.setup('renju', { b: cells(P.b), w: cells(P.w), side: P.side || 1 }); } catch (e) { bad(G, g.id, `problem ${j}: the position does not load`); return; }
        const sc = (P.sc || []).slice().sort((a, b) => b[1] - a[1]); if (!sc.length) { bad(G, g.id, `problem ${j}: no answers`); return; }
        const best = E.sqOf(sc[0][0]);
        if (!pos.isLegal(best)) { bad(G, g.id, `problem ${j}: the best answer ${sc[0][0]} is not legal`); return; }
        const s = P.side || 1, o = 3 - s, mine = pos.fives(s), theirs = pos.fives(o).map(i => E.I2M[i]);
        if (!mine.length && theirs.length && !theirs.includes(best)) bad(G, g.id, `problem ${j}: the opponent has a four but the best answer ${sc[0][0]} does not stop it`);
      });
    });
  },
  // (2026-11-23 lesson loop) the gomoku lessons ('gomoku', key = the step's index): every position loads (rule: the problem's, else renju),
  // every answer point is empty, and what the step's words (atlas/lessons3d.js gmLsJa) say the answer does holds with the engine's exact
  // patterns: a five (five), the opponent's five point (block), no open-four point left to the opponent (three, defend: no five, open four
  // or four-after-four left either), an open four (sfour), a four-three not forbidden (fourthree / fourthreeB), black's 3-3 / 4-4·overline
  // (forbid33 / forbid44), a white four whose every stop is black's forbidden point (trap), the first four of a four-after-four win (vcf)
  'gomoku'() {
    const E = require(path.join(ROOT, 'gomoku/engine.js')), L = J('gomoku/lessons.json'), g = 'gomoku', C = E.C;
    const cells = a => String(a || '').split(/\s+/).filter(Boolean).map(E.sqOf);
    const winPt = (pos, c) => { const k = pos.cls[c]; for (let m = 0; m < 225; m++) { const i = E.M2I[m]; if (pos.b[i] === E.EMPTY && (k[i] === C.FIVE || k[i] === C.F4) && !(c === E.BLACK && pos.renju && pos.forbidden(m))) return true; } return false; };
    L.steps.forEach((st, si) => { const K = String(si), id = st.id;
      (st.problems || []).forEach((P, j) => { const w = `${id} q${j + 1}`, rule = P.rule || 'renju', s = P.side || 1, o = 3 - s;
        let pos; try { pos = E.setup(rule, { b: cells(P.b), w: cells(P.w), side: s }); } catch (e) { bad(g, K, `${w}: the position does not load`); return; }
        const ok = (P.ok || []).map(E.sqOf); if (!ok.length) { bad(g, K, `${w}: no answer`); return; }
        ok.forEach(m => { const nm = E.sqName(m), i = E.M2I[m], k = pos.cls[s][i];
          if (pos.at(m) !== E.EMPTY) { bad(g, K, `${w}: the answer ${nm} is not empty`); return; }
          if (id === 'forbid33') { if (pos.forbidden(m) !== 1) bad(g, K, `${w}: ${nm} is not a 3-3 (forbidden ${pos.forbidden(m)})`); return; }
          if (id === 'forbid44') { const f = pos.forbidden(m); if (f !== 2 && f !== 3) bad(g, K, `${w}: ${nm} is not a 4-4 / overline (forbidden ${f})`); return; }
          if (!pos.isLegal(m)) { bad(g, K, `${w}: the answer ${nm} is not legal`); return; }
          if (id === 'five' && k !== C.FIVE) bad(g, K, `${w}: ${nm} does not make five`);
          if (id === 'block' && !pos.fives(o).includes(E.M2I[m])) bad(g, K, `${w}: ${nm} is not the opponent's five point`);
          if (id === 'sfour' && k !== C.F4) bad(g, K, `${w}: ${nm} does not make an open four`);
          if ((id === 'fourthree' || id === 'fourthreeB') && k !== C.F43) bad(g, K, `${w}: ${nm} is not a four-three`);
          pos.make(m);
          if (id === 'three' && winPt(pos, o)) bad(g, K, `${w}: after ${nm} the opponent still has an open four / five`);
          if (id === 'defend') { const S = new E.Solver(); S.limit = 2e5; if (winPt(pos, o) || pos.fives(o).length || S.vcf(pos, 12) >= 0) bad(g, K, `${w}: after ${nm} the opponent still wins by fours`); }
          if (id === 'trap') { const f = pos.fives(s), fb = f.length && f.every(q => pos.forbidIdx(q)); if (!fb) bad(g, K, `${w}: ${nm}: the four can be stopped on a point black may play`); }
          if (id === 'vcf') { const f = pos.fives(s); if (f.length !== 1) bad(g, K, `${w}: ${nm} is not a (simple) four`); else { pos.make(E.I2M[f[0]]); const S = new E.Solver(); S.limit = 2e5; if (S.vcf(pos, 12) < 0 && !pos.fives(s).length) bad(g, K, `${w}: after ${nm} no four-after-four win follows`); pos.unmake(); } }
          pos.unmake(); }); }); });
    // (2026-11-23 第2期) the strict ①〜⑧ of the verified lessons (GM_DONE) with an exact short-win search and the engine: tools/lesson-verify.js gomoku
    require('./lesson-verify.js').gomoku().forEach(fa => bad(g, String(L.steps.findIndex(s => s.id === fa.step)), `${fa.step} q${fa.q}: ${fa.msg}`));
  },
  amazons() {
    const E = require(path.join(ROOT, 'amazons/engine.js')), L = J('amazons/lessons.json'), NC = J('atlas/nocoord/amazons.json');
    const N = E.N || 10, rc = i => [Math.floor(i / N), i % N];
    // the squares a queen on q reaches, by direction: the whole ray and its last square
    const rays = (p, q) => { const [r0, c0] = rc(q), o = []; for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) { const ray = []; let r = r0 + dr, c = c0 + dc; while (r >= 0 && r < N && c >= 0 && c < N && !p.sq[r * N + c]) { ray.push(r * N + c); r += dr; c += dc; } o.push(ray); } return o; };
    L.steps.forEach((st, si) => { const K = String(si);   // (K: the lesson's key on the 3D table = its index)
      (st.ramp || []).forEach((it, j) => {
        let p; try { p = E.Pos.from(it.s); } catch (e) { bad('amazons', K, st.id + ': ' + `ramp ${j}: the position does not load`); return; }
        const side = it.s.side === 2 ? 1 : 0, mine = Array.from(p.q).slice(side * 4, side * 4 + 4).filter(q => q >= 0);
        const words = Object.entries(NC).filter(([k]) => k.startsWith(`${st.id}/${j}/`)).map(([, v]) => v.ja || '').join(' ');
        if (it.k === 'explain' && it.marks && it.marks.length) {
          const ok = it.marks.filter(m => m[1] === 'ok').map(m => m[0] - 1);
          const reach = new Set(mine.flatMap(q => rays(p, q).flat()));
          ok.forEach(q => { if (!reach.has(q) && /行け|進め|届/.test(words) && !/矢|撃/.test(words)) bad('amazons', K, st.id + ': ' + `ramp ${j}: the green mark ${E.sqName ? E.sqName(q) : q} cannot be reached in one move`); });
          if (/いちばん遠い/.test(words) && mine.length === 1) {
            const ends = rays(p, mine[0]).filter(r => r.length).map(r => r[r.length - 1]).sort((a, b) => a - b), got = ok.slice().sort((a, b) => a - b);
            if (ends.join() !== got.join()) bad('amazons', K, st.id + ': ' + `ramp ${j}: the words say "the farthest square in each direction" but the marks are ${got.map(q => E.sqName(q)).join(' ')} (the farthest: ${ends.map(q => E.sqName(q)).join(' ')})`);
          }
        }
        if (it.k === 'try' && it.ok) {
          const names = new Set(p.moves().map(m => E.name(p, m)));
          it.ok.forEach(n => { if (!names.has(n)) bad('amazons', K, st.id + ': ' + `ramp ${j}: the guided move ${n} is not legal`); });
        }
      });
      (st.problems || []).forEach((pb, j) => {
        let p; try { p = E.Pos.from(pb.s); } catch (e) { bad('amazons', K, st.id + ': ' + `problem ${j}: the position does not load`); return; }
        const legal = new Set(p.moves());
        (pb.ok || []).forEach(m => { if (!legal.has(m)) bad('amazons', K, st.id + ': ' + `problem ${j}: the answer ${E.name(p, m)} is not legal`); });
        if (pb.best != null && pb.ok && !pb.ok.includes(pb.best)) bad('amazons', K, st.id + ': ' + `problem ${j}: the best move is not among the answers`);
      });
    });
    // (2026-11-24 第2期) the strict ①〜⑨ of the verified basics (AM_DONE): goal sets, the step's shape, no near-duplicates, the ramp and ケロ's words for every move — tools/lesson-verify.js amazons
    require('./lesson-verify.js').amazons().forEach(fa => bad('amazons', String(L.steps.findIndex(s => s.id === fa.step)), `${fa.step} q${fa.q}: ${fa.msg}`));
  },
  // (2026-11-22 lesson loop) the morris lessons ('morris', key = the 3D list index: nine → six → twelve, steps with problems): every
  // accepted / scored move is legal and the best one is the engine's best; what the step's words say the answer does holds on the board —
  // a mill (ミル・3つ並べる), a piece of the opponent's pair taken (b_take), the opponent's mill point filled (b_block / tw_dblock), the win
  // (b_win / sx_win), a mill piece opened with no opponent able to step into the gap (b_reopen), the side flying with 3 pieces (b_fly), the
  // point with the most neighbours (b_place 「となりが多い点」), a diagonal line (tw_diag)
  'morris'() {
    const E = require(path.join(ROOT, 'morris/engine.js')), g = 'morris', NO = E.NONE; let key = 0;
    [['nine', 'morris/lessons.json'], ['six', 'morris/lessons-six.json'], ['twelve', 'morris/lessons-twelve.json']].forEach(([v, f]) => {
      const G = E.geom(v);
      J(f).steps.forEach(st => { if (!(st.problems && st.problems.length)) return; const K = String(key++);
        st.problems.forEach((P, j) => { const pos = E.Pos.from(G, P.s), legal = new Set(pos.moves()), w = `${st.id} q${j + 1}`, me = pos.side, o = 3 - me;
          const ok = P.ok || [P.best];
          ok.forEach(m => { if (!legal.has(m)) bad(g, K, `${w}: an accepted move is not legal`); });
          if (P.best != null && !legal.has(P.best)) bad(g, K, `${w}: the best move is not legal`);
          if (P.sc) { P.sc.forEach(([m]) => { if (!legal.has(m)) bad(g, K, `${w}: a scored move is not legal`); });
            const top = Math.max(...P.sc.map(e => e[1])), b = P.sc.find(e => e[0] === P.best); if (P.best != null && b && b[1] < top - 6) bad(g, K, `${w}: the best move is not the engine's best`); }
          const oppPts = (() => { const c = pos.clone(); c.side = o; const S = new Set(); for (const x of c.moves()) if (E.mRm(x) !== NO) S.add(E.mTo(x)); return S; })();
          const pair = r => G.mills.some(ml => ml.includes(r) && ml.filter(i => i !== r).filter(i => pos.b[i] === o).length === 1 && ml.filter(i => i !== r).some(i => !pos.b[i]));
          const id = st.id;
          ok.forEach(m => { if (!legal.has(m)) return; const t = E.mTo(m), fr = E.mFrom(m), r = E.mRm(m), after = pos.clone(); after.play(m);
            if (['b_mill', 'b_move', 'b_fly', 'sx_nofly', 'tw_diag', 'b_take'].includes(id) && r === NO) bad(g, K, `${w}: the answer makes no mill`);
            if (id === 'b_take' && r !== NO && !pair(r)) bad(g, K, `${w}: the piece taken is not one of the opponent's pair`);
            if ((id === 'b_block' || id === 'tw_dblock') && !oppPts.has(t)) bad(g, K, `${w}: the answer does not fill the opponent's mill point`);
            if ((id === 'b_win' || id === 'sx_win') && after.status() !== -1) bad(g, K, `${w}: the answer does not win`);
            if (id === 'b_move' || id === 'sx_nofly') { if (fr === NO || !G.adj[fr].includes(t)) bad(g, K, `${w}: the answer is not a step to a neighbour`); }
            if (id === 'b_fly') { let n = 0; for (let i = 0; i < G.n; i++) if (pos.b[i] === me) n++; if (n !== 3) bad(g, K, `${w}: the side has ${n} pieces, not 3 (no flying)`); }
            if (id === 'b_reopen') { if (fr === NO || !pos.inMill(fr)) bad(g, K, `${w}: the answer does not open a mill`); else if (after.moves().some(x => E.mTo(x) === fr)) bad(g, K, `${w}: the opponent can step into the opened point`); }
            if (id === 'b_place') { const mx = Math.max(...[...legal].map(x => G.adj[E.mTo(x)].length)); if (G.adj[t].length < mx) bad(g, K, `${w}: the answer has ${G.adj[t].length} neighbours, another point ${mx}`); }
            // (2026-11-23 lesson loop) 「どの駒を取るか」: the answer is a mill (it takes a piece). 「封じ込め」: the answer wins (a stored value
            // over WINT — トゥエルブの4・5問目は勝ちにならない手が答えだった）and, when it takes a piece, the opponent keeps 3 or more (the win is
            // the blockade, not the count). 「ただ一つの受け」: only one move keeps the result (the others score below it).
            if (id === 'remove' && r === NO) bad(g, K, `${w}: the answer makes no mill`);
            if (id === 'blockade' && P.sc) { const v = new Map(P.sc).get(m); if (!(v > E.WINT)) bad(g, K, `${w}: the answer does not win (${v})`);
              else if (r !== NO && after.cnt[o] + after.hand[o] < 3) bad(g, K, `${w}: the answer wins by taking, not by a blockade`); }
            if (id === 'defend' && P.sc) { const top = Math.max(...P.sc.map(e => e[1])), W = E.WINT; const n = P.sc.filter(([x, v]) => v >= top - 6 && !(top > W && v < top)).length; if (n !== 1) bad(g, K, `${w}: ${n} moves are as good as the answer (not the only defence)`); }
            if (id === 'tw_diag' && r !== NO) { const DG = [[0, 3, 6], [2, 5, 8], [21, 18, 15], [23, 20, 17]]; if (!DG.some(ml => ml.includes(t) && ml.every(q => after.b[q] === me))) bad(g, K, `${w}: the mill is not on a diagonal line`); }
          }); }); }); });
  },
  // (2026-11-22 lesson loop) the tafl lessons ('tafl', key = the step's index in tafl/lessons.json): every accepted / scored move is legal and
  // the best one is the top of the stored values (within 15); what the step's words say the answer does holds on the board (atlas/lessons3d.js
  // tfLsJa): the king runs to the edge (b_move), a capture (b_cap), with a corner / the empty throne as the other side (b_hostile), no piece of
  // yours can be taken after it (b_safe), two or more taken at once (t_shield), the king with two open lines or out (t_tuichi / v_tablut), no
  // escape and no トゥイチ left for the king (t_block), the fort / the encirclement / the king's capture won (t_fort / t_encircle / v_brandubh),
  // and the N-move lines (b_escape / b_kingcap) replay legally to the escape / the capture
  'tafl'() {
    const E = require(path.join(ROOT, 'tafl/engine.js')), L = J('tafl/lessons.json'), g = 'tafl';
    L.steps.forEach((st, si) => { const K = String(si), id = st.id;
      (st.problems || []).forEach((P, j) => { const w = `${id} q${j + 1}`, pos = E.Pos.from(P.s), legal = new Set(pos.moves()), me = pos.turn, F = pos.G.F;
        const ok = P.ok || (P.best != null ? [P.best] : []);
        ok.forEach(m => { if (!legal.has(m)) bad(g, K, `${w}: an accepted move is not legal`); });
        if (P.best != null && !legal.has(P.best)) bad(g, K, `${w}: the best move is not legal`);
        if (P.sc) { P.sc.forEach(([m]) => { if (!legal.has(m)) bad(g, K, `${w}: a scored move is not legal`); });
          const top = Math.max(...P.sc.map(e => e[1])), b = P.sc.find(e => e[0] === P.best); if (b && b[1] < top - 15) bad(g, K, `${w}: the best move is not the top value`); return; }
        if ((P.n || 1) > 1) { let q = pos.clone(); for (const m of P.line || []) { if (q.res) break; if (!q.moves().includes(m)) { bad(g, K, `${w}: the line has an illegal move`); return; } q = q.clone().play(m); }
          const want = id === 'b_escape' ? 'escape' : 'capture'; if (q.why !== want || q.res !== me) bad(g, K, `${w}: the line does not end in the ${want} (${q.why || 'nothing'})`); return; }
        const reply = q => { let c = 0, w2 = false, tu = false; if (q.res) return { c, w: w2, tu }; for (const r of q.moves()) { const z = q.clone().play(r); if (z.res && z.res !== me) w2 = true; c = Math.max(c, z.lastCaps.length); if (!z.res && z.kingLines().length >= 2) tu = true; } return { c, w: w2, tu }; };
        ok.forEach(m => { if (!legal.has(m)) return; const f = E.mFrom(m), t = E.mTo(m), a = pos.clone().play(m), caps = a.lastCaps;
          if (id === 'b_move' && !(pos.at(f) === 3 && (F[t] & 1))) bad(g, K, `${w}: the answer does not run the king to the edge`);
          if ((id === 'b_cap' || id === 'b_hostile') && !caps.length) bad(g, K, `${w}: the answer takes nothing`);
          if (id === 'b_hostile' && caps.length && !caps.some(q => a.nb(q).some(x => !a.at(x) && (F[x] & 6)))) bad(g, K, `${w}: no corner / empty throne helps the capture`);
          if (id === 'b_safe' && reply(a).c) bad(g, K, `${w}: a piece can still be taken after the answer`);
          if (id === 't_shield' && caps.length < 2) bad(g, K, `${w}: the shield wall takes ${caps.length}`);
          if ((id === 't_tuichi' || id === 'v_tablut') && !(a.res === me || (pos.at(f) === 3 && a.kingLines().length >= 2))) bad(g, K, `${w}: the king has ${a.kingLines().length} open line(s), not 2`);
          if (id === 't_block') { const r = reply(a); if (r.w) bad(g, K, `${w}: the king still escapes`); if (r.tu) bad(g, K, `${w}: the king can still make two open lines`); }
          if (id === 't_fort' && !(a.res === me)) bad(g, K, `${w}: the answer does not win (fort)`);
          if (id === 't_encircle' && !(a.res === me)) bad(g, K, `${w}: the answer does not win (encircle)`);
          if (id === 'v_brandubh' && !(a.res === me)) bad(g, K, `${w}: the answer does not catch the king`);
        }); }); });
    // (2026-11-24 第2期) the strict ①〜⑨ of the verified basics (TF_DONE: b_move・b_cap・b_hostile): goal sets, the theme's anvil, no near-duplicates, the order and タフリン's words for every move — tools/lesson-verify.js tafl
    require('./lesson-verify.js').tafl().forEach(fa => bad(g, String(L.steps.findIndex(s => s.id === fa.step)), `${fa.step} q${fa.q}: ${fa.msg}`));
  },
  // (2026-11-23 lesson loop) the tafl openings ('tafl/open', key = the opening's id): every line replays legally from the Copenhagen start,
  // every practice position's best / scored moves are legal and the best is the stored top (within 15), and the kind of move the 3D guide
  // names (atlas/lessons3d.js tfFacts → TF_WHY / TF_SHORT: a win, a capture, a piece saved, the king's own move, a corner guard, the king's
  // room shut / widened by the counts the words give, a piece to the edge) is re-checked on the engine's board.
  // (2026-11-23 lesson loop) the xiangqi openings ('xiangqi/open', key = the opening's id): the line replays legally, every practice
  // problem's best move and scored moves are legal and the best is the top value, and the words (atlas/lessons3d.js xqWhyJa / xqOpJa,
  // run here on the board) hold: a capture names the piece really taken, a "take back at once" (すかさず／すぐ) follows a capture of ours (in the line), "check"
  // gives check, a rook "over the river" is over it, a central cannon is on the middle file, a horse "to the edge" is on an edge file,
  // and a miss said to leave "a piece to be taken for nothing" (ただで取られ) leaves that piece attacked and unprotected.
  'xiangqi/open'() {
    const E = require(path.join(ROOT, 'xiangqi/engine.js')), O = J('xiangqi/openings.json'), G = 'xiangqi/open', vm = require('vm');
    const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), a = src.indexOf('  const XQN ='), b = src.indexOf('  /* (2026-11-21 lesson loop) the xiangqi lessons in');
    const ctx = { shSeed: s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }, shPerm: (seed, n) => [...Array(n).keys()] };
    const X = vm.runInNewContext(src.slice(src.indexOf('  const XQJ_OP = {'), a) + src.slice(a, b) + '\n;({ xqFacts, xqKind, xqWhyJa, xqOpJa, xqOpVoice, xqNotesJa, XQN })', ctx);
    const prot = (p, sq) => { const c = E.colorOf(p.at(sq)), q = p.clone(); q.side = c ^ 1; return q.moves().some(m => E.mTo(m) === sq) && (() => { // can the owner take back on sq after it is taken?
      for (const m of q.moves()) if (E.mTo(m) === sq) { const r = q.clone().play(m); if (r.moves().some(x => E.mTo(x) === sq)) return true; } return false; })(); };
    const words = (K, w, pos, m, tx, prevCap) => {
      const F = X.xqFacts(E, pos, m), kd = X.xqKind(F), t = E.mTo(m), [tr, tc] = E.RC[t], after = pos.clone().play(m), c = pos.side;
      if ((kd === 'cap' || kd === 'recap') && !pos.at(t)) bad(G, K, `${w}: said to take, but the point is empty`);
      if (pos.at(t) && !tx.includes(X.XQN(E.typeOf(pos.at(t)), c ^ 1)) && (kd === 'cap' || kd === 'recap') && /\{P\}|取/.test(tx) && !/取られた駒|取り返しの一手/.test(tx)) bad(G, K, `${w}: the words do not name the piece taken (${X.XQN(E.typeOf(pos.at(t)), c ^ 1)}): ${tx}`);
      if (kd === 'recap' && prevCap === false && /すかさず|すぐ/.test(tx)) bad(G, K, `${w}: said to take back at once (すかさず／すぐ), but the move before took nothing`);
      if (/王手/.test(tx) && !after.inCheck()) bad(G, K, `${w}: said to give check, but it does not`);
      if (kd === 'rookCross' && !(c ? tr >= 5 : tr <= 4)) bad(G, K, `${w}: the rook is said to cross the river, but does not`);
      if (kd === 'cannonMid' && tc !== 4) bad(G, K, `${w}: said to be a central cannon, but not on the middle file`);
      if (kd === 'horseEdge' && tc !== 0 && tc !== 8) bad(G, K, `${w}: the horse is said to go to the edge, but does not`);
    };
    O.sets.forEach(st => { const K = st.id, V = X.xqOpVoice(K), NJ = X.xqNotesJa(E, st, st.study.notes || [], V); let p = E.Pos.from(null), prevCap = null;
      st.study.line.forEach((m, i) => { if (!p.moves().includes(m)) { bad(G, K, `move ${i + 1}: not legal`); return; }
        if (NJ[String(i)]) words(K, `move ${i + 1}`, p, m, NJ[String(i)].ja, prevCap);
        prevCap = !!p.at(E.mTo(m)); p = p.clone().play(m); });
      (st.problems || []).forEach((P, j) => { const q = E.Pos.from(P.s), legal = new Set(q.moves()), w = `problem ${j + 1}`;
        if (!legal.has(P.best)) { bad(G, K, `${w}: the best move is not legal`); return; }
        (P.sc || []).forEach(([m]) => { if (!legal.has(m)) bad(G, K, `${w}: a scored move is not legal`); });
        const top = Math.max(...(P.sc || [[0, 0]]).map(e => e[1])), bs = (P.sc || []).find(e => e[0] === P.best); if (bs && bs[1] < top - 15) bad(G, K, `${w}: the best move is not the top value`);
        const o = X.xqOpJa(E, P, K, j, k => k === 'ok' ? '〈正〉' : '〈誤〉', V, j);
        words(K, w, q, P.best, o.good(P.best), null);
        (P.sc || []).filter(e => e[0] !== P.best).slice(0, 8).forEach(([u]) => { const tx = o.ng(u), mm = tx.match(/きみの(.)がただで取られ/); if (!mm) return;
          const r = q.clone().play(u), me = q.side; let ok = false;
          for (let sq = 0; sq < 90; sq++) { const x = r.at(sq); if (x && E.colorOf(x) === me && X.XQN(E.typeOf(x), me) === mm[1] && r.moves().some(y => E.mTo(y) === sq) && !prot(r, sq)) ok = true; }
          if (!ok) bad(G, K, `${w}: the miss ${E.name ? E.name(q, u) : u} is said to leave the ${mm[1]} to be taken for nothing, but no such ${mm[1]} is attacked and unprotected`); }); }); });
    // (2026-11-24 第2期・担当B) the strict ①〜⑨ of the verified openings (openings.json verified: the engine's fixed-depth values at depth 7 and 8, the way there, no near-duplicates, the order of the 2D and the 3D, ショウギツネ's words for every wrong move) — tools/lesson-verify.js xiangqiOpen
    require('./lesson-verify.js').xiangqiOpen().forEach(fa => bad(G, fa.step, `q${fa.q}: ${fa.msg}`));
  },
  'tafl/open'() {
    const E = require(path.join(ROOT, 'tafl/engine.js')), O = J('tafl/openings.json'), G = 'tafl/open', vm = require('vm');
    const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), a = src.indexOf('  const TF_BLOCK'), b = src.indexOf('  const TFJ_OP');
    const X = vm.runInNewContext(src.slice(a, b) + '\n;({ tfFacts })', {});
    const flip = (p, s) => { const q = p.clone(); q.turn = s; q.rehash(); return q; };
    const kingRoom = p => { if (p.king < 0) return 0; const q = flip(p, 2); return q.moves().filter(x => E.mFrom(x) === p.king).length; };
    const anyCap = p => p.res ? 0 : Math.max(0, ...p.moves().map(r => p.clone().play(r).lastCaps.length));
    const check = (id, w, pos, m) => {
      if (!pos.moves().includes(m)) { bad(G, id, `${w}: not a legal move`); return; }
      const F = X.tfFacts(E, pos, m), k = F.k, f = E.mFrom(m), t = E.mTo(m), me = pos.turn, n = pos.n, after = pos.clone().play(m), caps = after.lastCaps.length;
      const r = Math.floor(t / n), c = t % n, cd = Math.min(...[[0, 0], [0, n - 1], [n - 1, 0], [n - 1, n - 1]].map(([y, x]) => Math.abs(r - y) + Math.abs(c - x)));
      if (k === 'win' && after.res !== me) bad(G, id, `${w}: said to win, but the game goes on`);
      if (k === 'cap' && !caps) bad(G, id, `${w}: said to take, but takes nothing`);
      if (k !== 'win' && k !== 'cap' && caps) bad(G, id, `${w}: takes ${caps} but the words do not say so`);
      if (k === 'king' && pos.at(f) !== 3) bad(G, id, `${w}: said to move the king, but moves another piece`);
      if (k === 'block' && !(me === 1 && cd === 2)) bad(G, id, `${w}: said to guard a corner, but the square is not next to a corner's mouth`);
      if (k === 'edge' && !(r === 0 || c === 0 || r === n - 1 || c === n - 1)) bad(G, id, `${w}: said to go to the edge, but does not`);
      if (k === 'save' && !(anyCap(flip(pos, 3 - me)) && !anyCap(after))) bad(G, id, `${w}: said to save a threatened piece, but nothing was threatened or it still is`);
      const k0 = kingRoom(pos), k1 = kingRoom(after);
      if (F.km0 !== k0 || F.km1 !== k1) bad(G, id, `${w}: the king's room ${F.km0}→${F.km1} in the words, ${k0}→${k1} on the board`);
      if (k === 'shut' && !(k1 < k0 - 1)) bad(G, id, `${w}: said to shut the king in, but its room goes ${k0}→${k1}`);
      if (k === 'widen' && !(k1 > k0)) bad(G, id, `${w}: said to widen the king's room, but it goes ${k0}→${k1}`);
    };
    O.sets.forEach(st => { const K = st.id; let p = E.Pos.from({ v: 'copenhagen', b: E.START.copenhagen, side: 1 }, 'copenhagen');
      st.study.line.forEach((m, i) => { if (!p.moves().includes(m)) { bad(G, K, `move ${i + 1}: not legal`); return; } if ((st.study.notes || [])[i]) check(K, `move ${i + 1}`, p, m); p = p.clone().play(m); });
      (st.problems || []).forEach((P, j) => { const q = E.Pos.from(P.s), legal = new Set(q.moves()), w = `problem ${j + 1}`;
        if (!legal.has(P.best)) { bad(G, K, `${w}: the best move is not legal`); return; }
        (P.sc || []).forEach(([m]) => { if (!legal.has(m)) bad(G, K, `${w}: a scored move is not legal`); });
        const top = Math.max(...(P.sc || [[0, 0]]).map(e => e[1])), bs = (P.sc || []).find(e => e[0] === P.best); if (bs && bs[1] < top - 15) bad(G, K, `${w}: the best move is not the top value`);
        check(K, w, q, P.best); }); });
    // (2026-11-24 第2期・担当B) the strict ①〜⑨ of the verified plans (openings.json verified: the engine's exact values at depth 5 and 6, the way there, no near-duplicates, the order of the 2D and the 3D, タフリン's words for every wrong move) — tools/lesson-verify.js taflOpen
    require('./lesson-verify.js').taflOpen().forEach(fa => bad(G, fa.step, `q${fa.q}: ${fa.msg}`));
  },
  // (2026-11-22 lesson loop) the mancala lessons ('mancala', key = the step's index in mancala/lessons.json): a scored pit is exactly a
  // pit with seeds (sc null ⇔ empty), the gold pit (best) is legal and the top of the stored values; 種まき (sow): the gold pit's last seed
  // lands on the target and the count the words use (種の数 vs 目標までの距離 → 「N つ手前／先」) is what the engine's sowing does for
  // every pit. (The rest of the words are read from the engine's own play of each pit — atlas/lessons3d.js mcF.)
  'mancala'() {
    const E = require(path.join(ROOT, 'mancala/engine.js')), L = J('mancala/lessons.json'), g = 'mancala';
    const dist = (from, to) => { let c = 0, x = from; while (x !== to && c < 30) { x = x === 13 ? 0 : x + 1; if (x !== 13) c++; } return c; };
    L.steps.forEach((st, si) => { const K = String(si), R = st.rules || L.rules || 'kalah';
      (st.problems || []).forEach((P, j) => { const w = `${st.id} q${j + 1}`, b = P.b;
        if (!b || b.length !== 14) { bad(g, K, `${w}: the board is not 14 pits`); return; }
        const legal = new Set(E.legal(Int8Array.from(b), 0, E.RULES[R] || E.RULES.kalah));
        P.sc.forEach((v, k) => { if ((v === null) !== !legal.has(k)) bad(g, K, `${w}: pit ${k} is ${legal.has(k) ? 'legal' : 'not legal'} but its value is ${v}`); });
        if (!legal.has(P.best)) { bad(g, K, `${w}: the gold pit is not legal`); return; }
        const top = Math.max(...P.sc.filter(v => v !== null)); if (P.sc[P.best] < top - 1e-9) bad(g, K, `${w}: the gold pit ${P.sc[P.best]} is not the top value ${top}`);
        if (st.id === 'sow') {
          if (E.trace(Int8Array.from(b), 0, P.best, R).land !== P.target) bad(g, K, `${w}: the gold pit does not land on the target`);
          for (const k of legal) { const t = E.trace(Int8Array.from(b), 0, k, R), hit = b[k] === dist(k, P.target); if ((t.land === P.target) !== hit) bad(g, K, `${w}: pit ${k}: the seed count vs the distance disagrees with the sowing`); }
        }
      }); });
    // (2026-11-23 第2期) the strict ①〜⑧ of the verified lessons (MC_DONE) with the engine: tools/lesson-verify.js mancala
    require('./lesson-verify.js').mancala().forEach(fa => bad(g, String(L.steps.findIndex(s => s.id === fa.step)), `${fa.step} q${fa.q}: ${fa.msg}`));
  },
  // (2026-11-23 lesson loop, connect4) every answer column is open, the solver table C4SOL agrees (A on every answer, '-' on a full
  // column), and what ポトンウサ's words (atlas/lessons3d.js c4LsJa, run here) say about the answer and about each wrong column holds on a
  // board counted here independently: a four now, a block of the opponent's four, two immediate wins / stacked winning cells, the row of a
  // new winning cell, the number of open 4-lines through the cell, the cell under the opponent's winning cell, a win missed; a hint
  // naming the green / red marks only where the lesson shows them.
  connect4() {
    const L = J('connect4/lessons.json'), G = 'connect4', vm = require('vm');
    const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
    const s1 = src.slice(src.indexOf('  const C4M = '), src.indexOf('  const CONNECT4 = {')), s2 = src.slice(src.indexOf('  const C4_ANS = '), src.indexOf('  /* hnefatafl (2026-11-15)'));
    const X = vm.runInNewContext(s1 + s2 + '\n;({ c4LsJa, C4SOL })', {});
    const grid = mv => { const g = Array.from({ length: 7 }, () => []); for (let i = 0; i < mv.length; i++) g[+mv[i] - 1].push(i & 1 ? 2 : 1); return g; };
    const at = (g, c, r) => c < 0 || c > 6 || r < 0 || r > 5 ? -1 : r < g[c].length ? g[c][r] : 0;
    const WIN = []; for (let c = 0; c < 7; c++) for (let r = 0; r < 6; r++) for (const [dc, dr] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { const w = [0, 1, 2, 3].map(k => [c + dc * k, r + dr * k]); if (w.every(([x, y]) => x >= 0 && x < 7 && y >= 0 && y < 6)) WIN.push(w); }
    const four = (g, c, r, p) => WIN.some(w => w.some(([x, y]) => x === c && y === r) && w.every(([x, y]) => (x === c && y === r) || at(g, x, y) === p));
    const wins = (g, p) => [0, 1, 2, 3, 4, 5, 6].filter(c => g[c].length < 6 && four(g, c, g[c].length, p));   // columns where p makes four now
    const cells = (g, p) => { const o = []; for (let c = 0; c < 7; c++) for (let r = g[c].length; r < 6; r++) if (four(g, c, r, p)) o.push([c, r]); return o; };   // p's winning cells (empty)
    const lines = (g, c, r, p) => WIN.filter(w => w.some(([x, y]) => x === c && y === r) && w.every(([x, y]) => at(g, x, y) !== 3 - p)).length;
    const drop = (g, c, p) => { const h = g.map(x => x.slice()); h[c].push(p); return h; };
    const plain = t => String(t || '').replace(/[\u0001\u0002]/g, '').replace(/<[^>]+>/g, '');
    L.steps.forEach((st, si) => { const K = String(si), hm = st.hintMarks || '';
      (st.problems || []).forEach((P, j) => { const w = `${st.id} q${j + 1}`, g = grid(P.moves), me = P.moves.length & 1 ? 2 : 1, op = 3 - me, sol = (X.C4SOL[st.id] || [])[j] || '';
        P.answer.forEach(a => { if (g[a].length >= 6) bad(G, K, `${w}: answer column ${a} is full`); if (sol[a] !== 'A') bad(G, K, `${w}: C4SOL has ${sol[a]} on answer column ${a}`); });
        for (let c = 0; c < 7; c++) if ((sol[c] === '-') !== (g[c].length >= 6)) bad(G, K, `${w}: C4SOL '${sol[c]}' on column ${c} (height ${g[c].length})`);
        let o; try { o = X.c4LsJa(st, P, j, me, c => ['金', '銀'][c - 1], si); } catch (e) { bad(G, K, `${w}: the words failed: ${e.message}`); return; }
        const hint = plain(o.hintTx);
        if (/緑の印|光ってる印/.test(hint) && !/^(me|both)$/.test(hm)) bad(G, K, `${w}: the hint names the green marks, the lesson shows none`);
        if (/赤い印/.test(hint) && !/^(op|both)$/.test(hm)) bad(G, K, `${w}: the hint names the red marks, the lesson shows none`);
        // what the words say a column does (good: the answer; ng: a wrong column, the answer's clause after 緑の印の列)
        const claims = (t, u, who) => { const h = g[u].length, A = drop(g, u, me), thrB = cells(g, me), thrA = cells(A, me), nw = thrA.filter(([c, r]) => !thrB.some(([x, y]) => x === c && y === r));
          if (/4つ(そろって|並びが完成|つながって)|ぴたりと入る|線がうまって/.test(t) && !four(g, u, h, me)) bad(G, K, `${w} ${who}: said to make four, column ${u} does not`);
          if (/先にふさげる|3つ並びの先をつぶせる|負ける心配がなくなる|先回りできる|4つ目が入る場所をうばえる|ふさぎながら|守りながら|ふさいだ石|相手を止めて|守りと攻めが/.test(t) && !four(g, u, h, op)) bad(G, K, `${w} ${who}: said to block a four, column ${u} does not`);
          if (/2つ同時|2つになる|ダブルリーチ|もう片方で勝てる|守りきれない/.test(t) && wins(A, me).length < 2) bad(G, K, `${w} ${who}: said to make two wins at once, column ${u} makes ${wins(A, me).length}`);
          if (/上下にならんだ|2つ重なる|すぐ上で勝てる|「7」の形がそろって|となりあう勝ちマスが2つ/.test(t) && !thrA.some(([c, r]) => thrA.some(([x, y]) => x === c && y === r + 1))) bad(G, K, `${w} ${who}: said to stack two winning cells, column ${u} does not`);
          const rw = t.match(/(\d)段目(?!.*(効きにくい|役立たない|合う段じゃない|味方をしてくれない))/); if (rw && /(勝ちマス|ねらい)/.test(t) && !nw.some(([, r]) => r + 1 === +rw[1])) bad(G, K, `${w} ${who}: said to make a winning cell on row ${rw[1]}, column ${u} does not`);
          const nl = t.match(/線[がは](\d+)本|(\d+)本の(線|4つ並び)/), nn = nl && +(nl[1] || nl[2]); if (nl && nn !== lines(g, u, h, me)) bad(G, K, `${w} ${who}: says ${nn} lines, column ${u} has ${lines(g, u, h, me)}`);
          if (/新しい勝ちマス|あと1つでそろう|ねらいが1つふえる|空中に勝ちマス|勝ちマスが1つふえる|勝ちマスの真下に置けなくなる/.test(t) && !nw.length) bad(G, K, `${w} ${who}: said to make a new winning cell, column ${u} does not`); };
        claims(plain(o.good(P.answer[0])), P.answer[0], 'praise');
        for (let u = 0; u < 7; u++) { if (P.answer.includes(u) || g[u].length >= 6) continue;
          const t = plain(o.ng(u)), [mine, ans] = t.split(/緑の印の列/), A = drop(g, u, me), h = g[u].length;
          if (ans) claims(ans, P.answer[0], `miss ${u}`);
          if (/落とし穴|土台になっちゃう|すぐ上で相手が4つ|手が届くようにしちゃう|相手の勝ちマスの真下！/.test(mine) && !(h + 1 < 6 && four(A, u, h + 1, op))) bad(G, K, `${w} miss ${u}: said to put a disc under the opponent's four, it does not`);
          if (/あいたまま|ふさがらない|すぐに4つそろえ|残ったまま|守りが間に合わず|逆に相手に4つ|相手の勝ちになる|4つそろえさせ|相手の4つ目が先に入る/.test(mine) && !wins(A, op).length) bad(G, K, `${w} miss ${u}: said to leave the opponent a four, there is none`);
          if (/勝ちを見のがし|今すぐ4つ並べられる列があった|目の前の勝ち|勝負が決まらない|勝負を決めそこね|勝ちを逃した|すぐ勝てる場面/.test(mine) && !(wins(g, me).length && !four(g, u, h, me))) bad(G, K, `${w} miss ${u}: said to miss a four, there is none to miss`);
          const nl = mine.match(/線[がは](\d+)本|(\d+)本の(線|4つ並び)/), nn = nl && +(nl[1] || nl[2]); if (nl && nn !== lines(g, u, h, me)) bad(G, K, `${w} miss ${u}: says ${nn} lines, column ${u} has ${lines(g, u, h, me)}`);
          const rw = mine.match(/(\d)段目/); if (rw) { const thrB = cells(g, me), nw = cells(A, me).filter(([c, r]) => !thrB.some(([x, y]) => x === c && y === r)); if (!nw.some(([, r]) => r + 1 === +rw[1])) bad(G, K, `${w} miss ${u}: said to make a winning cell on row ${rw[1]}, it does not`); }
        }
      }); });
    // (2026-11-23 第2期：問題の検証) the strict check of every problem of the lessons in C4_DONE (the verified ones; the rest are counted
    // and listed as pending, not failed, until a loop run fixes and adds them — see claude/lesson-quality.md 「検証の進み具合」):
    //  ① the exact solver (connect4/engine.js solveMove, every column) gives the stored sc, and the answers are exactly the best columns
    //     (weak problems: the best result); the lesson's own move is what the answer does (four now / block / a new threat / two
    //     immediate threats in the answer's row / a new diagonal three / stacked winning cells / a threat that wins within 3 moves)
    //  ② no other column as good: when the answer wins (not at once), no other column wins within one move of it; a drawn answer, no
    //     other draw  ③ at least 3 legal columns  ⑤ no other problem / warm-up of the game within 3 discs (mirror too) or with the same moves but 3 (= lesson-quality.js ⑨; two openings
    //     of under 5 discs are not compared)  ⑥ the win lessons get no easier (the own moves to the forced win never go down)
    //  ⑦ a wrong column that still wins by force is never said to fail (おしまい・止められちゃう・負け・引き分け …)
    //  (⑧ the words: the checks above; ⑨ the 2D lesson reads the same lessons.json.)  C4_SOLVE=0 skips the solver (① only from sc).
    const C4_DONE = new Set(['four', 'block', 'centre', 'early', 'threat', 'open', 'diag', 'double', 'stack', 'force', 'count', 'endwin', 'parity', 'zugz', 'follow', 'first', 'second', 'miss', 'under', 'edge', 'op1', 'op2', 'op3']);
    // (2026-11-24 第2期 担当B：定跡 op1〜op3) the opening lessons: under 5 discs the solver is too slow, so the stored sc is checked against
    //  the Lv8 opening tree (connect4/tree.bin, solved offline by the exact C solver) — every column's result, independent of the stored
    //  table; ③ a weak (result) problem keeps at most 2 answers and 3 wrong columns; ④ op1 = the centre column is the only answer, op2 =
    //  after d1 and a reply off the centre the first player's only winning columns, op3 = a position of the main line (C4_MAIN, the
    //  solver's best line, ORDER ties) and its next move; ⑤ two openings under 5 discs are also compared: within 2 discs (mirror too) is
    //  the same problem; ⑥ the line goes on (more discs each problem).
    const C4_MAIN = '44444432655555323332267623526661117777711';
    let C4T = null; const treeRes = mv => { if (!C4T) { C4T = require(path.join(ROOT, 'connect4/engine.js')); C4T.setTree(C4T.decodeTree(fs.readFileSync(path.join(ROOT, 'connect4/tree.bin')))); }
      const tl = C4T.treeList(mv); return tl && [0, 1, 2, 3, 4, 5, 6].map(c => { const e = tl.find(x => x.c === c); return e ? Math.sign(e.v) : null; }); };
    const E4 = require(path.join(ROOT, 'connect4/engine.js')), SOLVE = process.env.C4_SOLVE !== '0';
    const cset = (mv, mir) => { const g = grid(mv), m = new Map(); g.forEach((col, c) => col.forEach((p, r) => m.set((mir ? 6 - c : c) + ',' + r, p))); return m; };
    const cdist = (a, b) => { let d = 0; for (const [k, v] of a) if (b.get(k) !== v) d++; for (const k of b.keys()) if (!a.has(k)) d++; return d; };
    const pool = []; L.steps.forEach(st => { (st.problems || []).forEach((P, j) => pool.push([`${st.id} q${j + 1}`, P.moves])); (st.ramp || []).forEach((R, j) => { if (R.moves != null) pool.push([`${st.id} warm-up ${j + 1}`, R.moves]); }); });
    const F4 = vm.runInNewContext(s1 + s2 + '\n;({ c4F })', {}).c4F, pend = [];
    L.steps.forEach((st, si) => { const K = String(si), id = st.id, done = C4_DONE.has(id); let prevD = -1;
      const no = (w, m) => done ? bad(G, K, `${w}: ${m}`) : pend.push(`${w}: ${m}`);
      (st.problems || []).forEach((P, j) => { const w = `${id} q${j + 1}`, g = grid(P.moves), me = P.moves.length & 1 ? 2 : 1, iw = (43 - P.moves.length) >> 1;
        const leg = [0, 1, 2, 3, 4, 5, 6].filter(c => g[c].length < 6), ans = new Set(P.answer), weak = P.kind === 'weak';
        let sc = P.sc;
        if (done && SOLVE && !(weak && (P.moves.length < 5 || (/^op[123]$/.test(id) && treeRes(P.moves))))) { sc = leg.map(() => 0); sc = [0, 1, 2, 3, 4, 5, 6].map(c => { E4.loadMoves(P.moves); return E4.solveMove(c, weak); });
          const sg = v => v === null ? null : weak ? Math.sign(v) : v;
          if (sc.some((v, c) => sg(v) !== sg(P.sc[c]))) no(w, `① the solver gives ${JSON.stringify(sc)}, stored ${JSON.stringify(P.sc)}`); }
        if (leg.length < 3) no(w, `③ only ${leg.length} legal columns`);
        if (/^op[123]$/.test(id)) { const op = id;
          if (P.moves.length < 5 || weak) { const tr = treeRes(P.moves); if (!tr) no(w, '① not in the opening tree, not verified');
            else if (tr.some((v, c) => v !== (P.sc[c] === null ? null : Math.sign(P.sc[c])))) no(w, `① the opening tree gives ${JSON.stringify(tr)}, stored ${JSON.stringify(P.sc)}`); }
          if (weak && (ans.size > 2 || leg.length - ans.size < 3)) no(w, `③ ${ans.size} answers of ${leg.length} columns (a result problem keeps at most 2 and 3 wrong)`);
          if (op === 'op1' && [...ans].join() !== '3') no(w, `④ the centre column is not the only answer (${[...ans]})`);
          if (op === 'op2' && !(P.moves[0] === '4' && P.moves[1] !== '4' && !(P.moves.length & 1) && Math.max(...leg.map(c => Math.sign(P.sc[c]))) > 0)) no(w, '④ not the first player to move after d1 and a reply off the centre, with a win');
          if (op === 'op3' && !(C4_MAIN.startsWith(P.moves) && ans.has(+C4_MAIN[P.moves.length] - 1))) no(w, '④ not a position of the main line with its next move as the answer');
          if (j && P.moves.length < st.problems[j - 1].moves.length) no(w, '⑥ fewer discs than the problem before (the line goes back)'); }
        const val = c => weak ? Math.sign(sc[c]) : sc[c], b = Math.max(...leg.map(val)), best = leg.filter(c => val(c) === b);
        if (best.join() !== [...ans].sort((x, y) => x - y).join()) no(w, `① the best columns are ${best}, the answer ${[...ans]}`);
        const oth = leg.filter(c => !ans.has(c)), sec = oth.length ? Math.max(...oth.map(val)) : -99;
        if (!weak && b !== iw) { if (b > 0 && sec > 0 && sec >= b - 1) no(w, `② column ${oth.find(c => val(c) === sec)} wins almost as fast (${sec} vs ${b})`); if (b === 0 && sec === 0) no(w, '② another column draws too');
          if (b < 0 && sec >= b - 1) no(w, `② column ${oth.find(c => val(c) === sec)} loses almost as slowly (${sec} vs ${b})`); }   // (an all-lose problem: the answer must hold out clearly longer)
        if (!weak && b > 0 && /^(four|miss|open|double|stack|force)$/.test(id)) { const d = iw - b; if (d < prevD) no(w, `⑥ easier than the problem before (a win in ${d + 1} after ${prevD + 1})`); prevD = Math.max(prevD, d); }
        const A = P.answer[0], F = F4(P.moves, A), h = g[A].length, G2 = drop(g, A, me);
        const T = { four: F.win, miss: F.win, block: F.blocked, threat: F.newThr.length > 0, open: F.myNext.length >= 2 && F.newThr.every(([, r]) => r === h), stack: F.stacked && F.newThr.length > 0,
          double: F.myNext.length >= 2 || F.stacked, force: F.myNext.length >= 1 && b > 0 && iw - b <= 2,
          diag: WIN.some(L4 => L4.some(([x, y]) => x === A && y === h) && L4[0][0] !== L4[1][0] && L4[0][1] !== L4[1][1] && L4.filter(([x, y]) => at(G2, x, y) === me).length === 3 && L4.some(([x, y]) => at(G2, x, y) === 0 && F.newThr.some(([c, r]) => c === x && r === y))) };
        T.stack = T.stack && F.newThr.some(([c, r]) => F.thrA.some(([x, y]) => x === c && Math.abs(y - r) === 1));   // (the new winning cell is one of the stacked pair: 2D 「同じ列の上下2マスが勝ちマスに」)
        if (/^(centre|early)$/.test(id) && !weak) { const ln = c => lines(g, c, g[c].length, me); T[id] = leg.every(c => ln(c) <= ln(A)); }   // (2D 「線の多いマスを押さえ」)
        if (id in T && !T[id]) no(w, `④ the answer does not do the lesson's move (${id})`);
        const a = cset(P.moves), me0 = pool.findIndex(x => x[0] === w);
        pool.forEach(([who, mv], k) => { if (k === me0 || (k > me0 && !/warm-up/.test(who))) return; const small = P.moves.length < 5 && mv.length < 5; if (small && !/^op[123]$/.test(id)) return;
          const d = Math.min(cdist(a, cset(mv)), cdist(a, cset(mv, 1))); if (d <= (small ? 2 : 3)) no(w, `⑤ ${d} disc(s) from ${who}`);
          else if (!small && mv.length === P.moves.length) { let e = 0; for (let x = 0; x < mv.length; x++) if (mv[x] !== P.moves[x]) e++; if (e <= 3) no(w, `⑤ the moves differ from ${who} in only ${e} place(s)`); } });
        if (!weak) { let o; try { o = X.c4LsJa(st, P, j, me, c => ['金', '銀'][c - 1], si); } catch (e) { return; }
          for (const u of oth) if (sc[u] > 0) { const t = plain(o.ng(u)).split(/緑の印の列/)[0]; if (/おしまい|止まっちゃう|止められちゃう|負け|守れちゃう|終わり|引き分け|届かない/.test(t)) no(w, `⑦ column ${u} still wins, the words say it fails: ${t}`); } }
      }); });
    if (pend.length && !process.env.C4_QUIET) console.log(`connect4: ${pend.length} pending (not yet verified lessons):\n  ` + pend.join('\n  '));
    // count / endwin の move-specific な事実（⑦⑧）は tools/lesson-verify.js（上の汎用チェックでは表せない）
    require('./lesson-verify.js').connect4().forEach(fa => bad(G, String(L.steps.findIndex(s => s.id === fa.step)), `${fa.step} q${fa.q}: ${fa.msg}`));
  },
  // (2026-11-23 lesson loop) the hex lessons ('hex', key = the step's index): every answer is an empty cell, the best is among the
  // answers, and the one-move problems are solved again by the exact solver of the engine (hex/tools/native.c serve, built to /tmp/hexn
  // or $HEXN; without gcc only the legality is checked): the stored answers are exactly the moves that do the step's job —
  //   b_connect: the cells that win at once / b_block, t_stop: the only cells that stop a connection in 1 / 2 /
  //   b_bridge (2 moves), t_double (3 moves): the cells that force the connection in that many / b_save, b_edge, t_ladder, t_edge3: the
  //   cells that keep the shortest forced connection. The scored problems (s_*): the moves legal, the best one the top value.
  hex() {
    const E = require(path.join(ROOT, 'hex/engine.js')), L = J('hex/lessons.json'), g = 'hex', cp = require('child_process');
    require('./lesson-verify.js').hex().forEach(fa => bad(g, String(Math.max(0, L.steps.findIndex(s => s.id === fa.step))), `${fa.step}: ${fa.msg}`));   // (2026-11-24 第2期・追14・追1: the 3D warm-ups)
    let bin = process.env.HEXN || '/tmp/hexn';
    if (!fs.existsSync(bin)) { try { cp.execSync(`gcc -O3 -march=native -DNATIVE -w -o ${bin} tools/native.c -lm`, { cwd: path.join(ROOT, 'hex'), stdio: 'ignore' }); } catch (e) { bin = null; } }
    const run = cmds => { const r = cp.spawnSync(bin, ['serve'], { input: cmds.join('\n') + '\nquit\n', encoding: 'utf8', maxBuffer: 1 << 26 }); return r.stdout.trim().split('\n'); };
    const KIND = { b_connect: 'now', b_block: ['stop', 1], t_stop: ['stop', 2], b_bridge: ['make', 2], t_double: ['make', 3], b_save: ['keep', 5], b_edge: ['keep', 4], t_ladder: ['keep', 6], t_edge3: ['keep', 3] };
    const sp = s => `setpos ${s.n} ${s.side} ${s.sw ? 1 : 0} ${s.b}`, todo = [];
    L.steps.forEach((st, si) => { const K = String(si);
      st.problems.forEach((p, pi) => { const w = `problem ${pi + 1}`, q = E.Pos.from(p.s);
        if (q.winner()) { bad(g, K, `${w}: the game is already over`); return; }
        const mv = p.ok || (p.sc || []).map(e => e[0]);
        mv.forEach(m => { if (!q.legal(m)) bad(g, K, `${w}: ${m} is not an empty cell`); });
        if (p.ok && !p.ok.includes(p.best)) bad(g, K, `${w}: the best move is not among the answers`);
        if (p.sc) { const top = Math.max(...p.sc.map(e => e[1])), b = p.sc.find(e => e[0] === p.best); if (!b || b[1] < top) bad(g, K, `${w}: the best move is not the top value`); }
        const k = KIND[st.id]; if (!k || !p.ok) return;
        if (k === 'now') { const wc = q.winCells(q.side).slice().sort((a, b) => a - b).join(); if (wc !== p.ok.slice().sort((a, b) => a - b).join()) bad(g, K, `${w}: the winning cells are ${wc}, the answer says ${p.ok}`); return; }
        todo.push({ K, w, p, kind: k[0], k: k[1] }); }); });
    if (!bin || !todo.length) return;
    // phase 1: how many moves the mover needs (make / keep), or that the opponent threatens a connection (stop)
    const r1 = run(todo.flatMap(t => [sp(t.p.s), t.kind === 'stop' ? `puzzle ${t.k} 1 6000` : `solve ${t.kind === 'make' ? t.k : t.k} 600`]));
    const c2 = []; todo.forEach((t, i) => { const a = r1[2 * i + 1].trim().split(/\s+/).map(Number);
      if (t.kind === 'stop') { const esc = []; for (let j = 0; j < a[0]; j++) if (a[2 + 2 * j] === 0) esc.push(a[1 + 2 * j]); t.got = esc; return; }
      t.mw = a[0]; if (t.kind === 'make' && t.mw !== t.k) { bad(g, t.K, `${t.w}: the shortest forced connection takes ${t.mw} moves, the step teaches ${t.k}`); t.skip = 1; return; }
      if (!(t.mw >= 2)) { bad(g, t.K, `${t.w}: no forced connection within ${t.k} moves (${t.mw})`); t.skip = 1; return; }
      c2.push(t); });
    const r2 = c2.length ? run(c2.flatMap(t => [sp(t.p.s), `puzzle ${t.mw} 0 6000`])) : [];
    c2.forEach((t, i) => { const a = r2[2 * i + 1].trim().split(/\s+/).map(Number), ok = []; for (let j = 0; j < a[0]; j++) { const nd = a[2 + 2 * j]; if (nd > 0 && nd <= t.mw) ok.push(a[1 + 2 * j]); } t.got = ok; });
    todo.forEach(t => { if (t.skip || !t.got) return; const A = t.got.slice().sort((a, b) => a - b).join(), B = t.p.ok.slice().sort((a, b) => a - b).join();
      if (A !== B) bad(g, t.K, `${t.w}: the solver's answers are ${A || 'none'}, the stored ones ${B}`); });
  },
  // (2026-11-22 lesson loop, hex/open) the opening lines and their problems: every move of the line legal, a problem's best move legal
  // and the engine's best value (or within 3% of it), and what each stored note says the move does true on the board — a bridge with an own
  // stone, touching the opponent, a swap, an intrusion into the opponent's bridge, the 2nd row
  'hex/open'() {
    const E = require(path.join(ROOT, 'hex/engine.js')), O = J('hex/openings.json'), g = 'hex/open';
    const facts = (p, m) => { const n = p.n, NB = E.geo(n).NB, s = p.side, o = 3 - s, at = q => p.b[q], f = { adj: 0, touch: 0, bridge: 0, intrude: 0, row: 0 };
      NB[m].forEach(q => { if (at(q) === s) f.adj++; else if (at(q) === o) f.touch++; });
      const common = (a, q) => NB[a].filter(x => NB[q].includes(x));
      for (let q = 0; q < n * n; q++) { if (q === m || NB[m].includes(q) || at(q) !== s) continue; const cm = common(m, q); if (cm.length === 2 && cm.every(x => !at(x))) f.bridge++; }
      for (let a = 0; a < n * n; a++) for (let q = a + 1; q < n * n; q++) { if (at(a) !== o || at(q) !== o || NB[a].includes(q)) continue; const cm = common(a, q); if (cm.length === 2 && cm.includes(m)) f.intrude++; }
      const r = Math.floor(m / n), c = m % n; f.row = s === 1 ? Math.min(r, n - 1 - r) : Math.min(c, n - 1 - c); return f; };
    O.sets.forEach(st => { const K = st.id, p = E.replay({ n: st.n, swap: st.swap }, []).pos;
      st.study.line.forEach((m, i) => {
        if (!p.legal(m)) { bad(g, K, `move ${i + 1}: ${E.nameOf ? E.nameOf(m, st.n) : m} is not legal`); return; }
        const t = (st.study.notes[i] || {}).ja || '';
        if (m !== E.SWAP) { const f = facts(p, m);
          if (/ブリッジ/.test(t) && !/割り込/.test(t) && !f.bridge) bad(g, K, `move ${i + 1}: the note says a bridge but the stone makes none`);
          if (/つけて止める/.test(t) && !f.touch) bad(g, K, `move ${i + 1}: the note says it touches the opponent but no opponent stone is next to it`);
          // (the stored 2D notes call some stones that also touch an opponent stone "離れてふさぐ": the 3D notes are read from the board instead — hxNoteJa)
          if (/割り込/.test(t) && !/受ける/.test(t) && !f.intrude) bad(g, K, `move ${i + 1}: the note says an intrusion but no opponent bridge is cut into`);
          if (/テンプレート/.test(t) && f.row !== 1) bad(g, K, `move ${i + 1}: the note says the 2nd-row edge template but the stone is not on the 2nd row`);
        } else if (!/スワップ/.test(t) || /スワップしない/.test(t)) bad(g, K, `move ${i + 1}: a swap the note does not call one`);
        p.play(m); });
      (st.problems || []).forEach((P, j) => { const q = E.Pos.from(P.s);
        if (!q.legal(P.best)) { bad(g, K, `problem ${j}: the best move is not legal`); return; }
        const sc = new Map(P.sc || []), top = Math.max(...(P.sc || [[0, 0]]).map(e => e[1]));
        if (sc.has(P.best) && sc.get(P.best) < top - 60) bad(g, K, `problem ${j}: the best move is not the engine's best (${sc.get(P.best)} < ${top})`);
        (P.sc || []).forEach(([m]) => { if (!q.legal(m)) bad(g, K, `problem ${j}: a scored move is not legal`); }); });
    });
    // (2026-11-24 第2期・担当B) the strict ①〜⑨ of the verified sets (openings.json verified: two searches agree, the second move ≤ 12 points, off the line by 3+ cells, the order, ゴイシペン's words for every move) — tools/lesson-verify.js hexOpen
    require('./lesson-verify.js').hexOpen().forEach(fa => bad(g, fa.step, `q${fa.q}: ${fa.msg}`));
  },
  // (2026-11-23 lesson loop) the checkers openings ('checkers/open', key = the opening's id): every line replays legally, every practice
  // position's best and scored moves are legal and the best is the engine's top (within a little), and the kind of move the 3D guide
  // names (atlas/lessons3d.js ckFacts → CK_WHY / CK_SHORT: a capture / the recapture / an exchange, an exchange offered, a shot, a crowning,
  // a piece saved, a back-row piece brought out, a step to the centre / the edge, a jump threatened next) is re-checked on the engine's board.
  'checkers/open'() {
    const E = require(path.join(ROOT, 'checkers/engine.js')), O = J('checkers/openings.json'), G = 'checkers/open', vm = require('vm');
    const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), a = src.indexOf('  function ckFacts('), b = src.indexOf('  const CK_SIDE');
    const X = vm.runInNewContext(src.slice(a, b) + '\n;({ ckFacts })', {});
    const mat = (p, s) => { const own = s ? p.w : p.b; return E.popc(own); };
    // the material swing of the forced captures from p (side to move gains), read to the end — independent of ckFacts' own reading
    const swing = (p, d) => { const c = p.caps(); if (!c.length || d > 12) return 0; let best = -99; for (const m of c) { const q = p.clone().play(m); best = Math.max(best, E.popc(E.mCap(m)) - swing(q, d + 1)); } return best; };
    const check = (id, w, pos, m, prev) => {
      if (!pos.moves().includes(m)) { bad(G, id, `${w}: not a legal move`); return; }
      const F = X.ckFacts(E, pos, m, prev), k = F.k, f = E.mFrom(m), t = E.mTo(m), [fr] = E.RC[f], [tr, tc] = E.RC[t], me = pos.side, after = pos.clone().play(m), cap = E.popc(E.mCap(m));
      const net = cap - swing(after, 0), man = pos.at(f) !== 2 && pos.at(f) !== 4;
      if (/^(cap|recap|xchg)$/.test(k) && !cap) bad(G, id, `${w}: said to take, but takes nothing`);
      if (k === 'recap' && !(prev != null && E.mCap(prev))) bad(G, id, `${w}: said to take back, but the move before took nothing`);
      if (k === 'xchg' && !(net < cap)) bad(G, id, `${w}: said to be taken back, but the capture is kept`);
      if (k === 'cap' && net < cap) bad(G, id, `${w}: said to take safely, but it is taken back`);
      if (k === 'trade' && !(cap === 0 && after.caps().length && net === 0)) bad(G, id, `${w}: said to offer an even exchange, but it is not one (net ${net})`);
      if (k === 'gambit' && !(cap === 0 && net < 0)) bad(G, id, `${w}: said to give a piece, but it does not (net ${net})`);
      if (k === 'shot' && !(cap === 0 && net > 0)) bad(G, id, `${w}: said to be a shot, but gains ${net}`);
      if (k === 'crown' && !pos.promotes(m)) bad(G, id, `${w}: said to crown, but does not`);
      if (k === 'back' && !(man && fr === (me ? 7 : 0))) bad(G, id, `${w}: said to bring out a back-row piece, but it is not on the back row`);
      if (k === 'center' && !(tr >= 2 && tr <= 5 && tc >= 2 && tc <= 5)) bad(G, id, `${w}: said to go to the centre, but lands off it`);
      if (k === 'edge' && !(tc === 0 || tc === 7)) bad(G, id, `${w}: said to go to the edge, but does not`);
      if (k === 'save') { const q = pos.clone(); q.side ^= 1; q.rehash(); if (!q.caps().length || after.caps().length) bad(G, id, `${w}: said to save a threatened piece, but nothing was threatened or it still is`); }
      if (!/^(cap|recap|xchg|shot|trade|win|gambit)$/.test(k) && net < 0) bad(G, id, `${w}: words of a quiet move, but the piece is jumped for nothing`);
      if (F.thrAfter) { const q = after.clone(); q.side ^= 1; q.rehash(); if (after.caps().length || !q.caps().length) bad(G, id, `${w}: said to threaten a jump, but there is none`); }
    };
    O.sets.forEach(st => { const id = st.id; let pos = E.Pos.from(null), prev = null;
      st.study.line.forEach((m, i) => { check(id, `move ${i + 1}`, pos, m, prev); if (!pos.moves().includes(m)) return; prev = m; pos = pos.clone().play(m); });
      (st.problems || []).forEach((P, j) => { const q = E.Pos.from(P.s), w = `problem ${j + 1}`;
        if (!q.moves().includes(P.best)) { bad(G, id, `${w}: the best move is not legal`); return; }
        (P.sc || []).forEach(([m]) => { if (!q.moves().includes(m)) bad(G, id, `${w}: a scored move is not legal`); });
        const sc = new Map(P.sc || []), top = Math.max(...(P.sc || [[0, 0]]).map(e => e[1]));
        if (sc.has(P.best) && sc.get(P.best) < top - 10) bad(G, id, `${w}: the best move is not the engine's best (${sc.get(P.best)} < ${top})`);
        check(id, `${w} best`, q, P.best, null);
        (P.sc || []).forEach(([m]) => { if (m !== P.best && q.moves().includes(m)) check(id, `${w} ${m}`, q, m, null); }); });
    });
    // (2026-11-24 第2期・担当B) the strict ①〜⑨ of the practice problems (CKO_DONE: all 19) — the engine again at a fixed depth, a clear
    // first, the opening's own path, the pool, the order of the 2D and the 3D and チェッカニ's words for every legal move — tools/lesson-verify.js checkersOpen
    require('./lesson-verify.js').checkersOpen().forEach(fa => bad(G, fa.step, `q${fa.q}: ${fa.msg}`));
  },
  // (2026-11-23 lesson loop) the chess lessons ('chess', key = the step's id): every answer and every listed move is legal, and what
  // ナイトン says about the answer (atlas/lessons3d.js chLsF → chLsJa) holds on the engine's board (chess/engine.js): a check gives check,
  // a mate mates (and is a check — not a stalemate), the 2-move mate is mate in 2 against every reply, a capture takes the piece named
  // and, when the words say it is not defended, nothing takes back; a piece led to safety cannot be taken; a pin / skewer's two pieces
  // stand on the line; a fork hits the two pieces named; the check escaped by taking takes the checking piece.
  chess() {
    const E = require(path.join(ROOT, 'chess/engine.js')), LS = J('chess/lessons.json'), G = 'chess', vm = require('vm');
    const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), a = src.indexOf('  const CH_PN = '), b = src.indexOf('  const CHJ_LS = ');
    const X = vm.runInNewContext(src.slice(a, b) + '\n;({ chFacts, chLsF, CH_PN })', {});
    const NAME = { 1: 'ポーン', 2: 'ナイト', 3: 'ビショップ', 4: 'ルーク', 5: 'クイーン', 6: 'キング' };
    const ty = p => p & 7, col = p => p & 8 ? 1 : 0, at = (pos, n) => pos.b[E.sqOf(n)] || 0;
    const after = (fen, u) => { const q = E.Pos.fromFEN(fen); q.make(q.fromUci(u)); return q; };
    const mated = q => q.inCheck() && !q.hasLegal();
    const takes = (q, to) => q.legal().some(m => q.uci(m).slice(2, 4) === to);
    const pieces = (q, c, name) => { const r = []; for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = q.b[s]; if (p && col(p) === c && NAME[ty(p)] === name) r.push(s); } return r; };
    const hitsFrom = (q, from, s) => {   // does the piece on `from` attack square s (on board q)?
      const p = q.b[from], t = ty(p), dr = (s >> 4) - (from >> 4), df = (s & 7) - (from & 7), w = col(p) === 0;
      if (t === 1) return dr === (w ? 1 : -1) && Math.abs(df) === 1;
      if (t === 2) return (Math.abs(dr) === 1 && Math.abs(df) === 2) || (Math.abs(dr) === 2 && Math.abs(df) === 1);
      if (t === 6) return Math.max(Math.abs(dr), Math.abs(df)) === 1;
      const diag = Math.abs(dr) === Math.abs(df) && dr, orth = (!dr) !== (!df);
      if ((t === 3 && !diag) || (t === 4 && !orth) || (t === 5 && !diag && !orth)) return false;
      const sr = Math.sign(dr), sf = Math.sign(df); let r = (from >> 4) + sr, c = (from & 7) + sf;
      while (r * 16 + c !== s) { if (q.b[r * 16 + c]) return false; r += sr; c += sf; } return true; };
    LS.steps.forEach(st => { const sid = st.id; (st.problems || []).forEach((P, j) => {
      const w = `problem ${j + 1}`, fen = P.fen, u = P.best || (P.ok || [])[0]; let pos;
      try { pos = E.Pos.fromFEN(fen); } catch (e) { bad(G, sid, `${w}: bad fen`); return; }
      if (!u || !pos.fromUci(u)) { bad(G, sid, `${w}: the answer ${u} is not legal`); return; }
      [...(P.ok || []), ...(P.sc || []).map(x => x[0])].forEach(v => { if (!pos.fromUci(v)) bad(G, sid, `${w}: ${v} is not legal`); });
      const F = X.chLsF(fen, u), q = after(fen, u), me = pos.side, to = u.slice(2, 4), victim = at(pos, to);
      if (!!F.check !== q.inCheck()) bad(G, sid, `${w}: ${u} check ${q.inCheck()}, the words say ${!!F.check}`);
      if (sid === 'b_check' && !q.inCheck()) bad(G, sid, `${w}: ${u} is said to check, but does not`);
      if ((sid === 'b_mate' || sid === 'mate1') && !mated(q)) bad(G, sid, `${w}: ${u} is said to mate, but does not`);
      if (sid === 'b_draw') { const m1 = (P.sc || []).some(x => x[0] === u && x[1] >= 29999); if (m1 && !mated(q)) bad(G, sid, `${w}: ${u} said to mate, but does not`); if (!q.hasLegal() && !q.inCheck()) bad(G, sid, `${w}: ${u} stalemates`); }
      if (sid === 'b_escape') { if (!pos.inCheck()) bad(G, sid, `${w}: not in check`); if (F.cap && NAME[ty(victim)] !== X.CH_PN[F.cap]) bad(G, sid, `${w}: ${u} takes a ${NAME[ty(victim)]}, the words say ${X.CH_PN[F.cap]}`);
        if (F.cap) { const pv = E.Pos.fromFEN(fen); pv.side ^= 1; if (!pv.attacked(pos.ksq[me], me ^ 1) || !hitsFrom(pos, E.sqOf(to), pos.ksq[me])) bad(G, sid, `${w}: ${u} is said to take the checking piece, but ${to} does not give the check`); } }
      if (sid === 'capture') { if (!victim) bad(G, sid, `${w}: ${u} is said to take, but takes nothing`); else if (NAME[ty(victim)] !== X.CH_PN[F.cap]) bad(G, sid, `${w}: ${u} takes a ${NAME[ty(victim)]}, the words say ${X.CH_PN[F.cap]}`);
        if (!F.taken && takes(q, to)) bad(G, sid, `${w}: the ${X.CH_PN[F.cap]} is said to be undefended, but ${u} can be taken back`); }
      if (sid === 'escape' && F.was) { const pv = E.Pos.fromFEN(q.fen()); if (!F.taken && takes(q, to)) bad(G, sid, `${w}: ${u} is said to reach a safe square, but it can be taken there`); if (F.taken && !pv.attacked(E.sqOf(to), me)) bad(G, sid, `${w}: ${u} is said to be taken back, but nothing defends ${to}`);
        const V = { 1: 1, 2: 3, 3: 3, 4: 5, 5: 9, 6: 100 }, mv = V[ty(q.b[E.sqOf(to)])]; q.legal().forEach(m => { const z = q.uci(m); if (z.slice(2, 4) === to && V[ty(q.b[E.sqOf(z.slice(0, 2))])] < mv) bad(G, sid, `${w}: ${u} is said to lose nothing, but a cheaper piece takes it (${z})`); }); }
      if (sid === 'fork') { const tg = F.hits.filter(x => x !== 'p'); if (tg.length >= 2) { const used = new Set(); tg.slice(0, 2).forEach(t => { const s0 = pieces(q, me ^ 1, X.CH_PN[t]).find(s => !used.has(s) && hitsFrom(q, E.sqOf(to), s)); if (s0 == null) bad(G, sid, `${w}: ${u} is said to hit a ${X.CH_PN[t]}, but does not`); else used.add(s0); }); } }
      if (sid === 'pin' && F.line) { const fr = X.CH_PN[F.line.fr], bk = X.CH_PN[F.line.bk]; const ok = pieces(q, me ^ 1, fr).some(s1 => hitsFrom(q, E.sqOf(to), s1) && pieces(q, me ^ 1, bk).some(s2 => { const d1 = [(s1 >> 4) - (E.sqOf(to) >> 4), (s1 & 7) - (E.sqOf(to) & 7)], d2 = [(s2 >> 4) - (s1 >> 4), (s2 & 7) - (s1 & 7)]; if (Math.sign(d1[0]) !== Math.sign(d2[0]) || Math.sign(d1[1]) !== Math.sign(d2[1])) return false; const qq = E.Pos.fromFEN(q.fen()); qq.b[s1] = 0; return d1[0] * d2[1] === d1[1] * d2[0] && hitsFrom(qq, E.sqOf(to), s2); }));
        if (!ok) bad(G, sid, `${w}: ${u} is said to line up a ${fr} and a ${bk}, not on the board`); }
      if (sid === 'mate2') { const replies = q.legal(); if (!replies.length) bad(G, sid, `${w}: ${u} leaves no reply`); replies.forEach(m => { const r = E.Pos.fromFEN(q.fen()); r.make(m); if (!r.legal().some(m2 => { const z = E.Pos.fromFEN(r.fen()); z.make(m2); return mated(z); })) bad(G, sid, `${w}: after ${u} ${q.uci(m)} there is no mate`); }); }
      if (sid === 'promote' && F.pc === 'p' && ty(at(pos, u.slice(0, 2))) !== 1) bad(G, sid, `${w}: ${u} is said to move a pawn`);
    }); });
  },
  // (2026-11-22 lesson loop) the chess openings ('chess/open', key = the opening's id): every line replays legally from the start, every
  // practice position's stored moves are legal, and what the 3D guide says about a move (atlas/lessons3d.js chFacts → chKind: castling,
  // taking / taking back, a pin, a pawn chasing a piece, a piece leaving its first square, the piece a wrong move leaves to be taken)
  // is re-checked on the engine's board (chess/engine.js), for each move of the line and each practice answer.
  'chess/open'() {
    const E = require(path.join(ROOT, 'chess/engine.js')), OP = J('chess/openings.json'), G = 'chess/open', vm = require('vm');
    const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), a = src.indexOf('  const CH_PN = '), b = src.indexOf('  const chF = ');
    const X = vm.runInNewContext(src.slice(a, b) + '\n;({ chFacts, chKind, CH_PN })', {});
    const NAME = { 1: 'ポーン', 2: 'ナイト', 3: 'ビショップ', 4: 'ルーク', 5: 'クイーン', 6: 'キング' }, VAL = { 1: 1, 2: 3, 3: 3, 4: 5, 5: 9, 6: 100 };
    const at = (pos, n) => pos.b[E.sqOf(n)] || 0, ty = p => p & 7, col = p => p & 8 ? 1 : 0;
    const mat = (pos, c) => { let s = 0; for (let q = 0; q < 128; q++) { if (q & 0x88) { q += 7; continue; } const p = pos.b[q]; if (p && col(p) === c && ty(p) !== 6) s += VAL[ty(p)]; } return s; };
    const sameLine = (pos, from, A, B) => { const f0 = E.sqOf(from), fa = E.sqOf(A), fb = E.sqOf(B), d = [(fa >> 4) - (f0 >> 4), (fa & 7) - (f0 & 7)], st = [Math.sign(d[0]), Math.sign(d[1])];
      if (d[0] && d[1] && Math.abs(d[0]) !== Math.abs(d[1])) return false; let r = f0 >> 4, c = f0 & 7, seen = [];
      for (;;) { r += st[0]; c += st[1]; if (r < 0 || r > 7 || c < 0 || c > 7) return false; const q = r * 16 + c; if (pos.b[q]) { seen.push(q); if (seen.length === 2) return seen[0] === fa && seen[1] === fb; } } };
    const check = (id, w, fen, u) => {   // the guide's words about move u in fen, against the engine
      const pos = E.Pos.fromFEN(fen), m = pos.fromUci(u); if (!m) { bad(G, id, `${w}: ${u} is not legal`); return; }
      const F = X.chFacts(fen, u), white = pos.side === 0, kd = X.chKind(F, u, white), from = u.slice(0, 2), to = u.slice(2, 4), mover = at(pos, from), victim = at(pos, to);
      const castle = ty(mover) === 6 && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2, ep = ty(mover) === 1 && from[0] !== to[0] && !victim;
      if ((kd === 'castle') !== castle) bad(G, id, `${w}: ${u} castling ${castle}, the words say ${kd}`);
      if (/^(cap|recap)$/.test(kd)) { if (!victim && !ep) bad(G, id, `${w}: ${u} said to take, but takes nothing`); else if (X.CH_PN[F.cap] !== NAME[victim ? ty(victim) : 1]) bad(G, id, `${w}: ${u} takes a ${NAME[ty(victim)]}, the words say ${X.CH_PN[F.cap]}`); }
      if (kd === 'recap' && !(mat(pos, pos.side) < mat(pos, pos.side ^ 1))) bad(G, id, `${w}: ${u} said to take back, but the side was not behind`);
      if (kd === 'dev' && !(/^[23]$/.test(String(ty(mover))) && from[1] === (white ? '1' : '8'))) bad(G, id, `${w}: ${u} said to bring a piece out, but it is not a knight / bishop on its first rank`);
      const after = E.Pos.fromFEN(fen); after.make(after.fromUci(u));
      if (kd === 'chase') { const r = +to[1] + (white ? 1 : -1), hit = [-1, 1].some(df => { const fl = String.fromCharCode(to.charCodeAt(0) + df); if (fl < 'a' || fl > 'h' || r < 1 || r > 8) return false; const p = at(after, fl + r); return p && col(p) !== pos.side && NAME[ty(p)] === F.chase; });
        if (!hit) bad(G, id, `${w}: ${u} said to chase a ${F.chase}, but the pawn does not hit one`); }
      if (kd === 'pin') { let ok = false; for (let q = 0; q < 128 && !ok; q++) { if (q & 0x88) { q += 7; continue; } const p = after.b[q]; if (!p || col(p) === pos.side || NAME[ty(p)] !== F.pin[0]) continue;
          for (let q2 = 0; q2 < 128 && !ok; q2++) { if (q2 & 0x88) { q2 += 7; continue; } const p2 = after.b[q2]; if (p2 && col(p2) !== pos.side && NAME[ty(p2)] === F.pin[1] && sameLine(after, to, E.sqName(q), E.sqName(q2))) ok = true; } }
        if (!ok) bad(G, id, `${w}: ${u} said to pin a ${F.pin[0]} to a ${F.pin[1]}, not on the board`); }
      if (F.hang) { const by = after.legal().some(mm => after.uci(mm).slice(2, 4) === to && NAME[ty(after.b[E.sqOf(after.uci(mm).slice(0, 2))])] === F.hang); if (!by) bad(G, id, `${w}: ${u} said to leave the piece to a ${F.hang}, but it cannot take it`); }
    };
    OP.sets.forEach(s => { const id = s.id, steps = (s.study && s.study.steps || []).map(x => x[0]); let pos = E.Pos.fromFEN(E.START);
      steps.forEach((u, i) => { const fen = pos.fen(); if (!pos.fromUci(u)) { bad(G, id, `step ${i + 1}: ${u} is not legal`); return; } check(id, `step ${i + 1}`, fen, u); pos.make(pos.fromUci(u)); });
      (s.problems || []).forEach((P, j) => { const w = `problem ${j + 1}`, C = P.cand || []; if (!C.length) { bad(G, id, `${w}: no moves`); return; }
        let q; try { q = E.Pos.fromFEN(P.fen); } catch (e) { bad(G, id, `${w}: bad fen`); return; }
        C.forEach(([u]) => { if (!q.fromUci(u)) bad(G, id, `${w}: ${u} is not legal`); else check(id, `${w} ${u}`, P.fen, u); });
        if (P.n && C.reduce((t, x) => t + x[1], 0) > P.n) bad(G, id, `${w}: the moves' games add up past n`);
        for (let k = 1; k < C.length; k++) if (C[k][1] > C[k - 1][1]) bad(G, id, `${w}: the most played move is not first`); });
    });
    // (2026-11-24 第2期・担当B) the strict ①〜⑨ of the drills (openings.json drill, chess/tools/op_curate.js) — tools/lesson-verify.js chessOpen
    require('./lesson-verify.js').chessOpen().forEach(fa => bad(G, fa.step, `q${fa.q}: ${fa.msg}`));
  },
  // (2026-11-23 第2期) dots & boxes: the strict ①〜⑧ of the verified lessons (DT_DONE) with the exact solver — tools/lesson-verify.js dots
  dots() {
    const L = J('dots/lessons.json');
    require('./lesson-verify.js').dots().forEach(fa => bad('dots', String(L.steps.findIndex(s => s.id === fa.step)), `${fa.step} q${fa.q}: ${fa.msg}`));
  },
  // (2026-11-24 第2期) checkers: the strict ①〜⑨ of the verified endgames (CK_DONE: e_kings・e_men・e_draw) from the endgame database — tools/lesson-verify.js checkers
  checkers() {
    const L = J('checkers/lessons.json');
    require('./lesson-verify.js').checkers().forEach(fa => bad('checkers', String(L.steps.findIndex(s => s.id === fa.step)), `${fa.step} q${fa.q}: ${fa.msg}`));
  },
  // (2026-11-24 第2期) reversi: the strict ①〜⑨ of the verified exact endgames (RV_DONE: parity・finish) with an independent exact solver — tools/lesson-verify.js reversi
  reversi() {
    const L = J('reversi/lessons.json');
    require('./lesson-verify.js').reversi().forEach(fa => bad('reversi', String(L.lessons.findIndex(l => l.id === fa.step)), `${fa.step} q${fa.q}: ${fa.msg}`));
  },
  // (2026-11-24 第2期) xiangqi: the strict ①〜⑨ of the verified basics (XQ_DONE: b_rook・b_horse・b_cannon・b_pawn・b_mate1) — the goal set from the
  // rules (a capture by the lesson's piece that cannot be taken back), the stored engine values, the pool and ショウギツネ's words — tools/lesson-verify.js xiangqi
  xiangqi() {
    const L = J('xiangqi/lessons.json');
    require('./lesson-verify.js').xiangqi().forEach(fa => bad('xiangqi', String(L.steps.findIndex(s => s.id === fa.step)), `${fa.step} q${fa.q}: ${fa.msg}`));
  },
  // (2026-11-24 第2期) shogi: the strict ①〜⑨ of the verified steps (SH_DONE: k20) — the goal set from the rules, the stored candidates,
  // the engine, the pool, the order of the 2D and the 3D, and ショウギツネ's words for every legal move — tools/lesson-verify.js shogi
  shogi() {
    const L = J('shogi/lessons.json');
    require('./lesson-verify.js').shogi().forEach(fa => bad('shogi', String(L.grades.findIndex(g => g.id === fa.step)), `${fa.step} q${fa.q}: ${fa.msg}`));
    // (2026-11-24 第2期・担当B) the openings (shogi/open): the strict ①〜⑨ of the verified sets (SHO_DONE: nakabisha・mukai・migishiken) —
    // the most played move and the engine, a clear first, the set's pattern and side, the pool, the order and ショウギツネ's words
    require('./lesson-verify.js').shogiOpen().forEach(fa => bad('shogi/open', fa.step, `q${fa.q}: ${fa.msg}`));
    // (2026-11-24 第2期・担当B, 追15) the openings' own lines of shogi・tafl・checkers: legal, the named moves / shape, and no two named
    // openings with the same line, one the other's first half, or one ending where the other goes (tools/lesson-verify.js openLines)
    require('./lesson-verify.js').openLines().forEach(fa => bad(fa.step.split(' ')[0] + '/open', fa.step.split(' ')[1], fa.msg));
  },
};

const todo = games.length ? games : Object.keys(CHECKS);
// (2026-11-24 第2期・担当B, 追21) a merge left its conflict markers in a page (tafl/index.html loaded app.js twice: the 2D tafl stopped with
// 「Identifier 'P2' has already been declared」): no line of the games' and the 3D table's pages, scripts and data starts with one
{ const seen = new Set();
  for (const g of todo) for (const d of [path.join(ROOT, g.split('/')[0]), path.join(ROOT, 'atlas'), path.join(ROOT, 'shared')]) { if (seen.has(d) || !fs.existsSync(d)) continue; seen.add(d);
    for (const f of fs.readdirSync(d)) { if (!/\.(html|js|json|css)$/.test(f)) continue;
      const t = fs.readFileSync(path.join(d, f), 'utf8'); if (/^(<{7}|>{7}) |^={7}$/m.test(t)) bad(g, '-', `追21 conflict markers left in ${path.relative(ROOT, path.join(d, f))}`); } } }
for (const g of todo) { if (!CHECKS[g]) { console.log(`${g}: no fact check yet`); continue; } try { CHECKS[g](); } catch (e) { bad(g, '-', 'the check failed: ' + e.message); } }
let n = 0;
for (const [g, ls] of Object.entries(out)) for (const [id, list] of Object.entries(ls)) for (const m of list) { console.log(`FAIL ${g} ${id}: ${m}`); n++; }
console.log(n ? `\n${n} wrong facts` : `${todo.filter(g => CHECKS[g]).join(', ')}: all facts hold`);
if (args.includes('--json')) fs.writeFileSync(args[args.indexOf('--json') + 1], JSON.stringify(out, null, 1));
process.exit(n ? 1 : 0);
