// (2026-11-27 第2期 担当A) xiangqi「守る」t_defend: candidate positions for the lesson, from engine games (levels 6〜9) and from those
// positions with one 車・馬・炮 of the side not to move put on an empty point. Kept when the rules (tools/xqfork-facts.js) give:
// neither side in check; one piece of ours (worth 2 or more) hangs = the opponent's threat; nothing of the opponent hangs and no
// capture wins at once; the moves that lose nothing for sure (fork ≥ 0, three plies = 追51) = one quiet move (no capture, no check)
// that does not move the threatened piece (it guards it = ひも, or steps in between = 間に入れる) after which nothing of ours hangs;
// every other move loses on the board at once (a mate in 1, or a piece of ours left to be taken / a capture that loses);
// the threatened piece can move (escaping is the tempting wrong way); 追34 the mover's kind has 3 wrong moves or more.
//   node tools/xqdefend-gen.js <games> <seed> <out.json>
'use strict';
const fs = require('fs'), path = require('path');
const { load } = require(path.join(__dirname, '../xiangqi/tools/wasm.js'));
const judgeWith = (E, F) => p => { const T = E.typeOf, mTo = E.mTo, mFrom = E.mFrom, me = p.side;
  if (p.inCheck() || F.turned(p).inCheck()) return null;
  const all = p.moves(); if (all.length < 3) return null;
  const H0 = F.danger(F.turned(p)); if (H0.length !== 1) return null; const H = H0[0], hv = F.val(p, H.s); if (hv < 2) return null;
  if (F.threats(p, me).length) return null;
  if (all.some(u => p.at(mTo(u)) && F.net1(p, u) > 0)) return null;
  const esc = all.filter(u => mFrom(u) === H.s); if (!esc.length) return null;
  // cheap filter: the moves after which nothing of ours hangs and no mate in 1
  const safe = all.filter(u => { const q = p.clone().play(u); return !F.danger(q).length && !F.mate1(q); });
  const quiet = safe.filter(u => !p.at(mTo(u)) && mFrom(u) !== H.s && !p.clone().play(u).inCheck());
  if (!quiet.length) return null;
  const G = all.filter(u => F.fork(p, u, -0.25).v >= 0); if (G.length !== 1) return null;
  const A = G[0]; if (!quiet.includes(A)) return null;
  const qa = p.clone().play(A), block = !qa.moves().some(x => mTo(x) === H.s);
  for (const u of all) { if (u === A) continue; const q = p.clone().play(u); if (F.mate1(q)) continue; const D = F.danger(q); if (!D.length || F.capV(p, u) - D[0].g >= 0) return null; }
  const mt = T(p.at(mFrom(A))); if (all.filter(m => T(p.at(mFrom(m))) === mt).length - 1 < 3) return null;
  const wc = all.filter(m => m !== A && p.at(mTo(m)) && T(p.at(mTo(m))) !== E.KING).length;
  const fake = all.filter(u => u !== A && mFrom(u) !== H.s && !F.danger(p.clone().play(u)).some(o => o.s === H.s)).length;   // other guards / blocks that fail
  return { s: p.fen(), best: A, iccs: E.name(p, A, 'iccs'), ht: H.t, hv, by: H.by, mt, block, esc: esc.length, fake, wc, d: esc.length + fake + wc, n: all.length };
};
module.exports = { judgeWith };
if (require.main === module) (async () => {
  const { E } = await load(); const F = require('./xqfork-facts.js')(E), T = E.typeOf, C = E.colorOf;
  const N = +process.argv[2] || 20; let seed = +process.argv[3] || 1; const out = process.argv[4] || '/tmp/xqdefend.json';
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  const res = [], seen = new Set(), judge = judgeWith(E, F);
  const tryPos = p => { const f = p.fen(); if (seen.has(f)) return; seen.add(f); let r = null; try { r = judge(p); } catch (e) {} if (r) res.push(r); };
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
