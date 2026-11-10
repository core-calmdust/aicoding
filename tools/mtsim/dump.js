// The 12 positions of <game>/bench.html (the same seeded random games) for sim.c, and the game's network, into the current
// folder: node dump.js <repo> <game>   (game: xiangqi, janggi, chess, shogi) → pos_<game>.txt (+ net_<game>.bin)
const W = process.argv[2], G = process.argv[3], fs = require('fs'), zlib = require('zlib');
const E = require(W + '/' + G + '/engine.js');
const out = [], NPOS = +process.env.NPOS || 12;   // (NPOS: more positions of the same seeded games — the YBW runs vary by ±15% on 12)
let rs = 20261109; const rnd = n => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs % n; };
const gunzip = f => { const b = fs.readFileSync(f); return b[0] === 0x1f && b[1] === 0x8b ? zlib.gunzipSync(b) : b; };
if (G === 'xiangqi' || G === 'janggi') {
  while (out.length < NPOS) {
    const p = E.Pos.from(null), moves = [], len = 10 + rnd(30); let ok = true;
    for (let i = 0; i < len; i++) { const L = p.moves(); if (!L.length) { ok = false; break; } const m = L[rnd(L.length)]; p.play(m); moves.push(m); }
    if (ok && p.moves().length > 1) out.push('P ' + E.setupIO(null, moves, []).join(' '));
  }
  if (G === 'xiangqi') fs.writeFileSync('net_xiangqi.bin', gunzip(W + '/xiangqi/nnue.bin.gz'));
} else if (G === 'chess') {   // the setup string (FEN moves …) as character codes
  while (out.length < NPOS) {
    const pos = E.Pos.fromFEN(E.START), moves = [], len = 8 + rnd(24); let ok = true;
    for (let i = 0; i < len; i++) { const L = pos.legal(); if (!L.length) { ok = false; break; } const m = L[rnd(L.length)]; pos.make(m); moves.push(m); }
    if (ok && pos.legal().length > 1) {
      const p = E.Pos.fromFEN(E.START), u = []; for (const x of moves) { u.push(p.uci(x)); p.make(x); }
      const s = E.START + ' moves ' + u.join(' ');
      out.push('P ' + Array.from(s, c => c.charCodeAt(0)).join(' '));
    }
  }
  fs.writeFileSync('net_chess.bin', gunzip(W + '/chess/nnue.bin.gz'));
} else if (G === 'shogi') {   // board (81), hand (16), side, then the moves (engine codes)
  const SFEN = E.START_SFEN || 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
  while (out.length < NPOS) {
    const p = new E.Position(); p.setSfen(SFEN); const moves = [], len = 10 + rnd(30); let ok = true;
    for (let i = 0; i < len; i++) { const L = p.legalMoves(); if (!L.length) { ok = false; break; } const m = L[rnd(L.length)]; moves.push(p.toUsi(m)); p.doMove(m); p.sp = 0; }
    if (ok && p.legalMoves().length > 1) {
      const q = new E.Position(); q.setSfen(SFEN); const a = [...Array.from(q.board), ...Array.from(q.hand), q.side];
      for (const u of moves) { const x = q.fromUsi(u); a.push(x); q.doMove(x); q.sp = 0; }
      out.push('P ' + a.join(' '));
    }
  }
  fs.writeFileSync('net_shogi.bin', gunzip(W + '/shogi/nnue.bin.gz'));
  if (E.defaultWeights) fs.writeFileSync('w_shogi.bin', Buffer.from(Int16Array.from(E.defaultWeights()).buffer));
}
fs.writeFileSync('pos_' + G + '.txt', out.join('\n') + '\n');
console.log(out.length + ' positions');
