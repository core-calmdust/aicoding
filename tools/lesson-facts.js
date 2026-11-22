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
};

const todo = games.length ? games : Object.keys(CHECKS);
for (const g of todo) { if (!CHECKS[g]) { console.log(`${g}: no fact check yet`); continue; } try { CHECKS[g](); } catch (e) { bad(g, '-', 'the check failed: ' + e.message); } }
let n = 0;
for (const [g, ls] of Object.entries(out)) for (const [id, list] of Object.entries(ls)) for (const m of list) { console.log(`FAIL ${g} ${id}: ${m}`); n++; }
console.log(n ? `\n${n} wrong facts` : `${todo.filter(g => CHECKS[g]).join(', ')}: all facts hold`);
if (args.includes('--json')) fs.writeFileSync(args[args.indexOf('--json') + 1], JSON.stringify(out, null, 1));
process.exit(n ? 1 : 0);
