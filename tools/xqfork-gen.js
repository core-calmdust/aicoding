// (2026-11-26 第2期 担当A) xiangqi「両取り」t_fork: candidate positions for the lesson, from engine games (levels 6〜9) and from those
// positions with one 車・馬・炮 of the side not to move put on an empty point. Kept when the rules (tools/xqfork-facts.js) give:
// no piece of either side hanging before, no capture that wins at once, the moves that win for sure (fork > 0, 追51) = one quiet
// move (no capture, no check) whose moved piece attacks two pieces worth 2 or more, nothing of ours hanging after it, 追55 (the sure
// gain ≤ the bigger target, and after every reply one of the two can still be won), 追34 (the mover's kind has 3 wrong moves or more).
//   node tools/xqfork-gen.js <games> <seed> <out.json>
'use strict';
const fs = require('fs'), path = require('path');
const { load } = require(path.join(__dirname, '../xiangqi/tools/wasm.js'));
(async () => {
  const { E } = await load(); const F = require('./xqfork-facts.js')(E), T = E.typeOf, C = E.colorOf, mTo = E.mTo, mFrom = E.mFrom;
  const N = +process.argv[2] || 20; let seed = +process.argv[3] || 1; const out = process.argv[4] || '/tmp/xqfork.json';
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  const res = [], seen = new Set();
  function judge(p) {
    if (p.inCheck() || F.turned(p).inCheck()) return null;
    const all = p.moves(); if (all.length < 3) return null;
    if (F.danger(F.turned(p)).length || F.threats(p, p.side).length) return null;
    // the quiet moves whose mover attacks two
    const cand = all.filter(u => !p.at(mTo(u)) && !p.clone().play(u).inCheck() && F.hits(p, u).length >= 2);
    if (!cand.length) return null;
    const good = cand.filter(u => F.fork(p, u).v > 0); if (good.length !== 1) return null;
    const A = good[0], g = F.fork(p, A).v, qa = p.clone().play(A);
    if (F.danger(qa).length) return null;
    // every other move wins nothing for sure
    for (const u of all) if (u !== A && F.fork(p, u, 0).v > 0) return null;
    const H = F.hits(p, A); if (g > Math.max(H[0].v, H[1].v)) return null;
    for (const r of qa.moves()) { const q2 = qa.clone().play(r), sq = H.slice(0, 2).map(o => mFrom(r) === o.s ? mTo(r) : o.s);
      if (!q2.moves().some(x => sq.includes(mTo(x)) && q2.at(mTo(x)) && C(q2.at(mTo(x))) !== q2.side && F.net1(q2, x) > 0)) return null; }
    const mt = T(p.at(mFrom(A))); if (all.filter(m => T(p.at(mFrom(m))) === mt).length - 1 < 3) return null;
    const wc = all.filter(m => m !== A && p.at(mTo(m)) && T(p.at(mTo(m))) !== E.KING), fake = all.filter(u => u !== A && !p.at(mTo(u)) && F.threats(p.clone().play(u), p.side).length >= 2);
    const traps = wc.filter(m => p.clone().play(m).moves().some(x => mTo(x) === mTo(m)) && F.net1(p, m) <= 0).length + fake.length;
    if (!wc.length && !fake.length) return null;
    return { s: p.fen(), best: A, iccs: E.name(p, A, 'iccs'), g, mt, tg: H.slice(0, 2).map(o => o.t), d: wc.length + traps, traps, n: all.length };
  }
  const tryPos = p => { const f = p.fen(); if (seen.has(f)) return; seen.add(f); const r = judge(p); if (r) { res.push(r); } };
  const t0 = Date.now();
  for (let gi = 0; gi < N; gi++) {
    const lv = 6 + Math.floor(rand() * 4), moves = []; let pos = E.Pos.from(E.START);
    for (let ply = 0; ply < 140; ply++) {
      if (!pos.moves().length) break;
      if (ply >= 8) { tryPos(pos);
        // the side not to move: one 車・馬・炮 put on an empty point (a few at random)
        const own = []; for (let s = 0; s < 90; s++) { const x = pos.at(s); if (x && C(x) !== pos.side && [E.ROOK, E.HORSE, E.CANNON].includes(T(x))) own.push(s); }
        for (let k = 0; k < 24 && own.length; k++) { const s = own[Math.floor(rand() * own.length)], t = Math.floor(rand() * 90); if (pos.at(t)) continue;
          const f = pos.fen().split(' '), b = []; for (const row of f[0].split('/')) for (const ch of row) if (/\d/.test(ch)) for (let z = 0; z < +ch; z++) b.push('.'); else b.push(ch);
          b[t] = b[s]; b[s] = '.'; const rows = []; for (let r = 0; r < 10; r++) { let o = '', e = 0; for (let c = 0; c < 9; c++) { const ch = b[r * 9 + c]; if (ch === '.') e++; else { if (e) o += e; e = 0; o += ch; } } if (e) o += e; rows.push(o); }
          let q; try { q = E.Pos.from(rows.join('/') + ' ' + f[1]); } catch (e) { continue; } tryPos(q); } }
      const r = E.think(E.START, moves, lv, rand); if (r.move < 0) break; moves.push(r.move); pos = pos.clone().play(r.move);
    }
    if (gi % 5 === 4) { fs.writeFileSync(out, JSON.stringify(res)); console.error(`game ${gi + 1}/${N}: ${res.length} candidates, ${seen.size} positions, ${Math.round((Date.now() - t0) / 1000)}s`); }
  }
  fs.writeFileSync(out, JSON.stringify(res)); console.error(`done: ${res.length}`);
})();
