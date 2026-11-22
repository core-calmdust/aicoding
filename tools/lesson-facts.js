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
};

const todo = games.length ? games : Object.keys(CHECKS);
for (const g of todo) { if (!CHECKS[g]) { console.log(`${g}: no fact check yet`); continue; } try { CHECKS[g](); } catch (e) { bad(g, '-', 'the check failed: ' + e.message); } }
let n = 0;
for (const [g, ls] of Object.entries(out)) for (const [id, list] of Object.entries(ls)) for (const m of list) { console.log(`FAIL ${g} ${id}: ${m}`); n++; }
console.log(n ? `\n${n} wrong facts` : `${todo.filter(g => CHECKS[g]).join(', ')}: all facts hold`);
if (args.includes('--json')) fs.writeFileSync(args[args.indexOf('--json') + 1], JSON.stringify(out, null, 1));
process.exit(n ? 1 : 0);
