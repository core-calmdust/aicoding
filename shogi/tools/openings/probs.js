// Practice problems for the new opening entries from Floodgate game dumps (first 40 plies per game: "br wr result usi...").
// Each entry has a position pattern (src entries' `pat`); positions of strong games (ply 12-38) that match it give
// "which move is played most?" problems, scored by move frequency like the core sets.
// node probs.js <minRate> <dump files...>   → problems.json
// pattern: space-separated terms, all must hold; a term is alternatives joined by "|":
//   bS56 = Sente silver on 5六, wR52 = Gote rook on 5二, !bS56 = not, xB = no bishop on the board (exchanged), hwB = Gote has a bishop in hand.
//   An entry with `mirror: true` also matches the colour-swapped, 180°-rotated pattern.
const fs = require('fs'), path = require('path');
const E = require('../../engine.js');
const [minR, ...files] = process.argv.slice(2);
const MIN = +minR || 3000;
const CATS = ['beg', 'mid', 'adv', 'sp', 'new'];
const START = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
const PC = { P: 1, L: 2, N: 3, S: 4, B: 5, R: 6, G: 7, K: 8 };
function compile(pat, mir) {
  return pat.trim().split(/\s+/).map(term => {
    let neg = false; if (term[0] === '!') { neg = true; term = term.slice(1); }
    const alts = term.split('|').map(a => {
      if (a === 'xB') return { xB: true };
      if (a[0] === 'h') { let c = a[1] === 'w' ? 1 : 0; if (mir) c = 1 - c; return { hand: c, t: PC[a[2]] }; }
      let c = a[0] === 'w' ? 1 : 0, t = PC[a[1]], f = +a[2], r = +a[3];
      if (mir) { c = 1 - c; f = 10 - f; r = 10 - r; }
      return { c, t, sq: E.makeSq(f, r) };
    });
    return { neg, alts };
  });
}
function match(p, C) {
  for (const { neg, alts } of C) {
    const ok = alts.some(a => {
      if (a.hand !== undefined) return p.hand[a.hand * 8 + a.t] > 0;
      if (a.xB) { for (let s = 0; s < 81; s++) { const x = p.board[s]; if (x && (E.typeOf(x) === 5 || E.typeOf(x) === 13)) return false; } return true; }
      const x = p.board[a.sq]; return x && E.colorOf(x) === a.c && E.typeOf(x) === a.t;
    });
    if (ok === neg) return false;
  }
  return true;
}
const entries = [];
for (const c of CATS) {
  const f = path.join(__dirname, 'src', c + '.js'); if (!fs.existsSync(f)) continue;
  for (const e of require(f)) if (e.pat && !e.noPractice) entries.push({ id: e.id, maxPly: e.maxPly || 99, C: [compile(e.pat, false)].concat(e.mirror ? [compile(e.pat, true)] : []) });
}
const pos = new E.Position();
const keyOf = p => p.sfen().replace(/ \d+$/, '');
const stat = {};
let games = 0;
for (const f of files) for (const ln of fs.readFileSync(f, 'utf8').split('\n')) {
  if (!ln) continue; const a = ln.split(' '); if (+a[0] < MIN || +a[1] < MIN) continue;
  const res = a[2], mv = a.slice(3); games++;
  pos.setSfen(START);
  for (let k = 0; k < mv.length; k++) {
    if (k >= 12) {
      let key = null;
      for (const e of entries) if (k < e.maxPly && e.C.some(C => match(pos, C))) {
        key = key || keyOf(pos);
        const S = stat[e.id] || (stat[e.id] = {}), s = S[key] || (S[key] = {}), x = s[mv[k]] || (s[mv[k]] = [0, 0]);
        x[0]++; x[1] += res === 'd' ? .5 : ((res === 'b') === (pos.side === 0) ? 1 : 0);
      }
    }
    pos.doMove(pos.fromUsi(mv[k])); pos.sp = 0;
  }
}
const out = {}, used = new Set();
for (const { id } of entries) {
  const S = stat[id] || {}, arr = [];
  for (const [key, mv] of Object.entries(S)) {
    if (used.has(key)) continue;
    const tot = Object.values(mv).reduce((a, b) => a + b[0], 0); if (tot < 12) continue;
    const c = Object.entries(mv).filter(([, s]) => s[0] >= 3).sort((a, b) => b[1][0] - a[1][0]);
    if (c.length < 2) continue;
    const top = c[0][1][0] / tot; if (top < 0.3 || top > 0.9) continue;
    arr.push({ kind: 'best', mode: 'freq', src: 'opening', sfen: key + ' 1', cand: c.map(([u, s]) => [u, s[0]]), accept: [c[0][0]], pv: [c[0][0]], total: tot, win: c.map(([, s]) => Math.round(s[1] / s[0] * 100)) });
  }
  arr.sort((a, b) => b.total - a.total);
  out[id] = arr.slice(0, 40); for (const p of out[id]) used.add(p.sfen.replace(/ 1$/, ''));
  console.log(id, Object.keys(S).length, 'positions,', out[id].length, 'problems', out[id].slice(0, 4).map(p => p.total).join(' '));
}
fs.writeFileSync(path.join(__dirname, 'problems.json'), JSON.stringify(out));
console.log('games', games);
