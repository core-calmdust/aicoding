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
  // (2026-11-22 lesson loop) the backgammon lessons ('backgammon', key = the step's index): every candidate play of a play problem is a
  // legal play of the roll (backgammon/bg.js genPlays — the 3D words come from the commentary engine on the best one), the race
  // questions' pip counts (qv.a = yours, qv.b = theirs) and their right answer (who leads, by how much) hold on the board, and the
  // shots questions' share is the count out of 36.
  'backgammon'() {
    const BG = require(path.join(ROOT, 'backgammon/bg.js')), LS = J('backgammon/lessons.json'), G = 'backgammon';
    const dec = (s0, side) => { const s1 = side === 1 ? String(s0).slice(26) + String(s0).slice(0, 26) : String(s0), q = new Int8Array(52); for (let i = 0; i < 52; i++) q[i] = parseInt(s1[i], 16) || 0; return q; };
    LS.steps.forEach((st, si) => (st.problems || []).forEach((P, pi) => { const id = String(si), q0 = dec(P.pos, P.side || 0), w = `q${pi + 1}`;
      if (P.kind === 'play') {
        const legal = new Set(BG.genPlays(q0, 0, P.dice[0], P.dice[1]).map(x => BG.key(x.pos)));
        P.plays.forEach(([m], k) => { const q = q0.slice(); for (let i = 0; i + 1 < m.length; i += 2) BG.apply(q, 0, m.charCodeAt(i) - 65, m.charCodeAt(i + 1) - 65);
          if (!legal.has(BG.key(q))) bad(G, id, `${w}: play ${k + 1} (${m}) is not a legal play of ${P.dice.join('-')}`); });
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
  },
};

const todo = games.length ? games : Object.keys(CHECKS);
for (const g of todo) { if (!CHECKS[g]) { console.log(`${g}: no fact check yet`); continue; } try { CHECKS[g](); } catch (e) { bad(g, '-', 'the check failed: ' + e.message); } }
let n = 0;
for (const [g, ls] of Object.entries(out)) for (const [id, list] of Object.entries(ls)) for (const m of list) { console.log(`FAIL ${g} ${id}: ${m}`); n++; }
console.log(n ? `\n${n} wrong facts` : `${todo.filter(g => CHECKS[g]).join(', ')}: all facts hold`);
if (args.includes('--json')) fs.writeFileSync(args[args.indexOf('--json') + 1], JSON.stringify(out, null, 1));
process.exit(n ? 1 : 0);
