// The 12 positions of <game>/bench.html (the same seeded random games) for sim.c, and the game's network, into the current
// folder: node dump.js <repo> <game>   (game: xiangqi, janggi, chess, shogi, tafl) → pos_<game>.txt (+ net_<game>.bin)
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
if (G === 'tafl') {   // (2026-11-11) Copenhagen: tafl/bench.html's positions, IO = [variant, side, cells, nmoves, moves]
  const V = 'copenhagen';
  while (out.length < NPOS) {
    const pos = E.Pos.from(null, V), moves = [], len = 10 + rnd(30); let ok = true;
    for (let i = 0; i < len && ok; i++) { const L = pos.moves(); if (!L.length || pos.res) { ok = false; break; } const m = L[rnd(L.length)]; pos.play(m); moves.push(m); if (pos.res) ok = false; }
    if (!ok) continue;
    const p = E.Pos.from(null, V), a = [E.VID[p.v], p.turn === E.P2 ? 1 : 0]; for (let i = 0; i < p.b.length; i++) a.push(p.b[i]);
    a.push(moves.length); for (const m of moves) a.push(E.mFrom(m) | (E.mTo(m) << 8));
    out.push('P ' + a.join(' '));
  }
  fs.writeFileSync('net_tafl.bin', gunzip(W + '/tafl/nnue-copenhagen.bin.gz'));
}
if (G === 'reversi') {   // (2026-11-13) bench.html's MID (36 empties) + self-play from seeded 8-ply openings to 36 empties;
  // pos_reversi_end.txt: bench.html's END (24 empties) and self-play, NEND (12) positions at END_E (20) empties. 64 cells + side.
  let b = fs.readFileSync(W + '/reversi/weights.bin.gz'); fs.writeFileSync('weights.bin.gz', b);
  if (b[0] === 0x1f && b[1] === 0x8b) b = zlib.gunzipSync(b);
  E.setWeights(new Int16Array(b.buffer, b.byteOffset, b.length >> 1), JSON.parse(fs.readFileSync(W + '/reversi/weights.json', 'utf8')).nphase);
  const html = fs.readFileSync(W + '/reversi/bench.html', 'utf8'), arr = k => JSON.parse(html.match(new RegExp('const ' + k + ' = (\\[[^\\]]*\\])'))[1]);
  const dec = s => ({ cells: s.slice(0, 64).split('').map(Number), side: s[64] === 'b' ? 1 : 2 });
  const line = p => 'P ' + p.cells.join(' ') + ' ' + p.side, emp = p => p.cells.filter(x => !x).length;
  const play = (p, m) => {   // m: a square, or -1 (pass)
    if (m < 0) return { cells: p.cells.slice(), side: 3 - p.side };
    const [pl, ph, ol, oh] = E.toBits(p.cells, p.side), c = E.childOf(pl, ph, ol, oh, m), nb = new Array(64).fill(0);
    for (let q = 0; q < 64; q++) { const bit = (lo, hi) => q < 32 ? (lo >>> q) & 1 : (hi >>> (q - 32)) & 1; if (bit(c[2], c[3])) nb[q] = p.side; else if (bit(c[0], c[1])) nb[q] = 3 - p.side; }
    return { cells: nb, side: 3 - p.side };
  };
  const legal = p => { const [pl, ph, ol, oh] = E.toBits(p.cells, p.side); return E.legalList(pl, ph, ol, oh); };
  const selfPlay = (toE, d) => {   // a seeded 8-ply opening, then depth-d self-play down to toE empties
    for (;;) {
      let p = dec('0'.repeat(27) + '21' + '0'.repeat(6) + '12' + '0'.repeat(27) + 'b'), ok = true;
      while (emp(p) > toE) {
        let L = legal(p); if (!L.length) { p = play(p, -1); L = legal(p); if (!L.length) { ok = false; break; } }
        const m = emp(p) > 52 ? L[rnd(L.length)] : E.think(p.cells, p.side, { cfg: { depth: d, exact: 0, mpc: 1 }, noBook: true, variety: false }).move;
        p = play(p, m);
      }
      if (ok && legal(p).length > 1) return p;
    }
  };
  for (const s of arr('MID')) out.push(line(dec(s)));
  while (out.length < NPOS) out.push(line(selfPlay(36, 4)));
  const NEND = +process.env.NEND || 12, END_E = +process.env.END_E || 20, oe = [];
  for (const s of arr('END')) { if (oe.length >= NEND) break; let p = dec(s); while (emp(p) > END_E) { const L = legal(p); p = play(p, L.length ? L[rnd(L.length)] : -1); } if (legal(p).length > 1) oe.push(line(p)); }
  while (oe.length < NEND) oe.push(line(selfPlay(END_E, 4)));
  fs.writeFileSync('pos_reversi_end.txt', oe.join('\n') + '\n');
}
fs.writeFileSync('pos_' + G + '.txt', out.join('\n') + '\n');
console.log(out.length + ' positions');
