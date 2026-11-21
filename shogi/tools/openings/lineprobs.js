// Practice problems made from a set's own line, for the opening sets without game-based problems (src entries with no
// Floodgate matches, and the castles): at every move of the side that builds the line (from the 3rd ply), "what is the next
// move of the line?" — scored by the site's strongest engine (wasm-engine.js: NNUE, the page's own analysis).
//   accept : the line's move, plus a later move of the same side played now when the line still reaches the very same
//            position with it (a transposition: the same castle in another order) and the engine finds it no worse (−60)
//   cand   : the engine's values of the moves ([usi, cp] best first; partial points for the rest, mode 'line')
//   dub    : the line's move is well below the engine's best (−150; trap lines such as 鬼殺し) — still the line's move: the
//            question asks for the line, and the words say the engine thinks a little less of it
//   left out: the line's move far below the best (−400): the line misses something there, not a move to drill
// The other moves get partial points only (≤12 of 20, from how far below the line's move the engine puts them).
// node shogi/tools/openings/lineprobs.js [ms per position, default 1500] [ids…]   → lineprobs.json (build.js adds it as lineProbs)
'use strict';
const fs = require('fs'), path = require('path');
const { conv, START } = require('./kif.js');
const [msA, ...only] = process.argv.slice(2);
const MS = +msA || 1500, ACC = 60, DUB = 150, SKIP = 400, NCAND = 12;
const OUT = path.join(__dirname, 'lineprobs.json');
const probs = fs.existsSync(path.join(__dirname, 'problems.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'problems.json'), 'utf8')) : {};
(async () => {
  const W = await require('./wasm-engine.js')(), E = W.E;
  const out = fs.existsSync(OUT) && only.length ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  for (const cat of ['beg', 'mid', 'adv', 'sp', 'new', 'castle']) {
    const f = path.join(__dirname, 'src', cat + '.js'); if (!fs.existsSync(f)) continue;
    for (const e of require(f)) {
      if (only.length && !only.includes(e.id)) continue;
      if (cat !== 'castle' && (probs[e.id] || []).length >= 5) continue;   // (game-based problems already)
      const usi = conv(e.line, e.start).usi, start = e.start || START;
      const sfens = [], p = new E.Position(); p.setSfen(start);
      for (const u of usi) { sfens.push(p.sfen()); p.doMove(p.fromUsi(u)); p.sp = 0; }
      const fin = p.sfen().replace(/ \d+$/, '');
      const side = e.side === 'w' ? 1 : 0;   // the side that builds the line (the castles: always ☗先手; the opponent's moves are one plausible example)
      const reaches = (k, alt) => {   // the line from ply k with `alt` (a later move of the mover) played first: same final position?
        const rest = usi.slice(k), mine = rest.filter((_, i) => i % 2 === 0), theirs = rest.filter((_, i) => i % 2 === 1);
        const my2 = [alt, ...mine.filter(u => u !== alt)], q = new E.Position(); q.setSfen(sfens[k]);
        for (let i = 0; i < my2.length; i++) for (const u of [my2[i], theirs[i]]) { if (!u) continue; const m = q.legalMoves(true).find(x => q.toUsi(x) === u); if (!m) return false; q.doMove(m); q.sp = 0; }
        return q.sfen().replace(/ \d+$/, '') === fin;
      };
      const arr = [], skip = [];
      for (let k = 2; k < usi.length; k++) {
        const q = new E.Position(); q.setSfen(sfens[k]); if (q.side !== side) continue;
        const L = usi[k], r = W.analyze(sfens[k], { time: MS }), best = r[0].s, me = r.find(x => x.usi === L);
        if (!me) { skip.push(k + ':illegal'); continue; }
        if (me.s < best - SKIP) { skip.push(`${k}:${L} ${me.s} ≪ ${r[0].usi} ${best} (left out)`); continue; }
        const dub = me.s < best - DUB; if (dub) skip.push(`${k}:${L} ${me.s} < ${r[0].usi} ${best}`);
        const later = usi.filter((u, i) => i > k && (i - k) % 2 === 0);
        const accept = [L, ...later.filter(u => u !== L && r.some(x => x.usi === u && x.s >= me.s - ACC) && reaches(k, u))];
        const cand = r.slice(0, NCAND).map(x => [x.usi, x.s]); for (const u of accept) if (!cand.some(c => c[0] === u)) cand.push([u, r.find(x => x.usi === u).s]);
        arr.push({ kind: 'best', mode: 'line', src: 'line', sfen: sfens[k].replace(/ \d+$/, '') + ' ' + (k + 1), ply: k, cand, accept, pv: [L], floor: r[r.length - 1].s, d: r[0].d, ...(dub ? { dub: 1 } : {}) });
      }
      out[e.id] = arr;
      console.log(`${cat}\t${e.id}\t${side ? 'w' : 'b'}\t${arr.length} problems` + (arr.some(x => x.accept.length > 1) ? `\t(${arr.filter(x => x.accept.length > 1).length} with other orders)` : '') + (skip.length ? `\tbelow the engine's best: ${skip.join(', ')}` : ''));
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(out));
})().catch(e => { console.error(e); process.exit(1); });
