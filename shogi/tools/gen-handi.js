// (2026-11-27 第2期 担当A) rx「駒落ち」の問題の候補を作る：駒落ちの初期局面から自己対局（上手はときどき2〜4番手）して、
// 下手の手番で「タダで取れる上手の駒がちょうど1つ・取る手は1つ（成・不成の選びなし）・取れる駒は2つ以上」、
// 上手が落とした駒を元のマスに戻すとその駒が取った駒を取り返せる（＝駒落ちだからタダ）局面を集め、エンジン（JS 深さ3・wasm 深さ8）で
// 答えが首位・2番目と250以上の差・詰みなしのものを出す。
//   node shogi/tools/gen-handi.js <handicap: kaku|hisha> <games> <seed>  → JSON lines on stdout
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '../engine.js'));
const W = require('./openings/wasm-engine.js').loadSync();
const T = E.typeOf;
const H = { kaku: { sfen: 'lnsgkgsnl/1r7/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1', sq: 16, t: E.KA }, hisha: { sfen: 'lnsgkgsnl/7b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1', sq: 10, t: E.HI } }[process.argv[2] || 'hisha'];
const N = +process.argv[3] || 40; let seed = +process.argv[4] || 1;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pos = s => { const p = new E.Position(); p.setSfen(s); return p; };
const LVv = { 1: 1, 2: 3, 3: 4, 4: 5, 5: 8, 6: 10, 7: 6 };
const ST={};const st=k=>{ST[k]=(ST[k]||0)+1;return null;};process.on('exit',()=>process.stderr.write(JSON.stringify(ST)+'\n'));
function check(sfen) {
  const p = pos(sfen); if (p.side !== 0 || p.inCheck()) return null;
  { const q = pos(sfen.replace(' b ', ' w ')); if (q.inCheck()) return null; }
  const ms = p.legalMoves(true), U = m => p.toUsi(m);
  const caps = ms.filter(m => !E.isDrop(m) && p.board[E.mTo(m)]).map(m => { const u = U(m), q = pos(sfen); q.doMove(q.fromUsi(u));
    const rec = q.legalMoves(true).filter(y => !E.isDrop(y) && E.mTo(y) === E.mTo(m)); return { u, to: E.mTo(m), t: T(p.board[E.mTo(m)]), mv: T(p.board[E.mFrom(m)]), rec: rec.length }; });
  st('all'); if (caps.some(c => !LVv[c.t])) return st('promo');
  const tg = new Set(caps.map(c => c.to)); if (tg.size < 2) return st('tg<2');
  const free = caps.filter(c => !c.rec && LVv[c.t] >= 3);   // (free pawns may be there too: the words say 取れるけど、{m}なら…タダ)
  if (free.length !== 1 || free[0].u.endsWith('+') || caps.some(c => c.u === free[0].u + '+')) return st('free' + free.length);
  // the missing piece back on its square: it takes the capturer back
  if (p.board[H.sq]) return st('occ');
  const a = sfen.split(' ');
  const q = pos(sfen); q.board[H.sq] = H.t + E.WF; const s2 = q.sfen(); const r = pos(s2); if (r.inCheck() || pos(s2.replace(' b ', ' w ')).inCheck()) return null;
  r.doMove(r.fromUsi(free[0].u)); const rec = r.legalMoves(true).filter(y => !E.isDrop(y) && E.mTo(y) === free[0].to && E.mFrom(y) === H.sq);
  if (!rec.length) return st('norec');
  return { sfen, ans: free[0].u, caps, ms: ms.length };
}
const seen = new Set();
for (let g = 0; g < N; g++) {
  const p = pos(H.sfen);
  for (let ply = 0; ply < 36; ply++) {
    const s = p.sfen();
    if (p.side === 0 && ply >= 10) { const c = check(s); if (c) if (c && !seen.has(s.split(' ').slice(0, 3).join(' '))) { seen.add(s.split(' ').slice(0, 3).join(' '));
      const r1 = new E.Searcher(pos(s)).analyze({ depth: 3, time: 60000 }), b1 = r1[0];
      const top1 = pos(s).toUsi(b1.m), gap1 = b1.s - r1[1].s; if (process.env.DBG) process.stderr.write(['cand', ply, c.ans, top1, b1.s, gap1, r1[1].s].join(' ') + '\n');
      if (top1 === c.ans && gap1 >= 250 && Math.abs(b1.s) < 20000) {
        const r2 = W.analyze(s, { depth: 8 }); const gap2 = r2[0].s - r2[1].s;
        if (r2[0].usi === c.ans && gap2 >= 250 && Math.abs(r2[0].s) < 20000 && r2[1].s <= 1800)
          console.log(JSON.stringify({ sfen: s, ans: c.ans, gap1, gap2, s1: b1.s, s2: r2[0].s, second: r2[1].usi, s2nd: r2[1].s, caps: c.caps.map(x => x.u + ':' + x.t + ':' + x.rec), ms: c.ms }));
      } break; } }
    if (p.side === 1 && ply >= 9 && ply <= 33 && rnd() < 0.35 && W.analyze(s, { depth: 3 })[0].s >= -1300) {   // (上手 plays a move that is safe in an even game but leaves a piece free here)
      const ok = p.legalMoves(true).filter(m => { p.doMove(m); const c = check(p.sfen()); p.undoMove(); return c; });
      if (ok.length) { p.doMove(ok[Math.floor(rnd() * ok.length)]); continue; } }
    let r; try { r = W.analyze(s, { depth: 4 }); } catch (e) { break; }
    if (!r.length || Math.abs(r[0].s) > 3000) break;
    let k = 0; if (p.side === 1 && rnd() < 0.2) { const ok = r.filter(x => x.s > r[0].s - 200); k = Math.floor(rnd() * Math.min(4, ok.length)); }
    else if (rnd() < 0.25) { const ok = r.filter(x => x.s > r[0].s - 150); k = Math.floor(rnd() * Math.min(3, ok.length)); }
    p.doMove(p.fromUsi(r[k].usi));
  }
}
