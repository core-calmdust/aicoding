// (2026-11-26 第2期 担当A) xiangqi「王手で得をする」t_check: candidate positions for the lesson, from engine games (levels 6〜9) and
// from those positions with one 車・馬・炮 of the side not to move put on an empty point. Kept when the rules (tools/xqfork-facts.js)
// give: neither side in check, no piece of either side hanging before, no capture that wins at once, the moves that win for sure
// (fork > 0, three plies = 追51) = one quiet check (no capture, not a mate: the opponent has replies) after which nothing of ours
// hangs and a piece of the opponent worth 4 or more (馬・炮・車) is attacked with a winning exchange; 追55 the sure gain ≤ that
// piece's value; 追34 the mover's kind has 3 wrong moves or more; something tempting besides (another capture or another check).
//   node tools/xqcheck-gen.js <games> <seed> <out.json>
'use strict';
const fs = require('fs'), path = require('path');
const { load } = require(path.join(__dirname, '../xiangqi/tools/wasm.js'));
(async () => {
  const { E } = await load(); const F = require('./xqfork-facts.js')(E), T = E.typeOf, C = E.colorOf, mTo = E.mTo, mFrom = E.mFrom;
  const N = +process.argv[2] || 20; let seed = +process.argv[3] || 1; const out = process.argv[4] || '/tmp/xqcheck.json';
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  const res = [], seen = new Set();
  function judge(p) {
    if (p.inCheck() || F.turned(p).inCheck()) return null;
    const all = p.moves(); if (all.length < 3) return null;
    if (F.danger(F.turned(p)).length || F.threats(p, p.side).length) return null;
    if (all.some(u => p.at(mTo(u)) && F.net1(p, u) > 0)) return null;
    const cand = all.filter(u => !p.at(mTo(u)) && p.clone().play(u).inCheck());
    if (!cand.length) return null;
    const good = cand.filter(u => F.fork(p, u, 0).v > 0); if (good.length !== 1) return null;
    const A = good[0], qa = p.clone().play(A); if (!qa.moves().length) return null;
    if (F.danger(qa).length) return null;
    for (const u of all) if (u !== A && F.fork(p, u, 0).v > 0) return null;
    const g = F.fork(p, A).v, hit = F.threats(qa, p.side).filter(o => o.v >= 4); if (!hit.length || g > hit[0].v) return null;
    const mt = T(p.at(mFrom(A))); if (all.filter(m => T(p.at(mFrom(m))) === mt).length - 1 < 3) return null;
    const wc = all.filter(m => m !== A && p.at(mTo(m)) && T(p.at(mTo(m))) !== E.KING), ock = all.filter(u => u !== A && p.clone().play(u).inCheck());
    const traps = wc.filter(m => p.clone().play(m).moves().some(x => mTo(x) === mTo(m)) && F.net1(p, m) <= 0).length + ock.length;
    if (!wc.length && !ock.length) return null;
    return { s: p.fen(), best: A, iccs: E.name(p, A, 'iccs'), g, mt, tg: hit[0].t, d: wc.length + traps, traps, n: all.length };
  }
  const tryPos = p => { const f = p.fen(); if (seen.has(f)) return; seen.add(f); const r = judge(p); if (r) res.push(r); };
  const t0 = Date.now();
  for (let gi = 0; gi < N; gi++) {
    const lv = 6 + Math.floor(rand() * 4), moves = []; let pos = E.Pos.from(E.START);
    for (let ply = 0; ply < 140; ply++) {
      if (!pos.moves().length) break;
      if (ply >= 8) { tryPos(pos);
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
