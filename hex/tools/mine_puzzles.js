// Mine puzzle candidates from self-play records (tools/native.c selfplay): positions near the end of each game where
//  · "connect in k": the side to move connects by force within k moves, with exactly ONE first move doing it in k
//    (and no faster win) — checked by the exact solver (engine.c puzzle(), carriers + path pruning);
//  · "stop (k)": the opponent would connect by force within k moves if we passed, and exactly ONE of our moves stops every
//    forced connection within k (k minimal).
//   HEXN=…/hexn node tools/mine_puzzles.js games.txt out.jsonl [maxK]
const fs = require('fs');
const E = require('../engine.js');
const N = require('./nat.js').open();
const [, , inF, outF, mk] = process.argv, MAXK = +(mk || 5);
const lines = fs.readFileSync(inF, 'utf8').trim().split('\n');
const out = fs.createWriteStream(outF, { flags: 'a' });
const seen = new Set();
(async () => {
  let found = 0;
  for (let gi = 0; gi < lines.length; gi++) {
    const a = lines[gi].split(' ').map(Number), n = a[0], mv = a.slice(2);
    const pos = new E.Pos(n, true); const hist = [];
    for (const m of mv) { hist.push(pos.clone()); pos.play(m); }
    // the last ~26 positions before the end (a won position earlier has long forced lines; later ones are short)
    for (let k = Math.max(2, hist.length - 26); k < hist.length; k++) {
      const p = hist[k]; if (p.winner()) continue;
      const spec = p.spec(); const key = spec.b + spec.side; if (seen.has(key)) continue; seen.add(key);
      await N.setpos(spec);
      // ---- connect in k
      const s = await N.solve(MAXK, 400);
      if (s.k >= 2) {
        const L = await N.puzzle(s.k, 0, 4000);
        if (!L.some(e => e.need < 0)) {
          const best = L.filter(e => e.need > 0 && e.need <= s.k);
          if (best.length === 1 && best[0].need === s.k) { out.write(JSON.stringify({ t: 'win', n, k: s.k, s: spec, answer: best[0].m, g: gi, ply: k, alt: L.filter(e => e.need === s.k + 1).length }) + '\n'); found++; }
        }
      }
      // ---- stop the opponent's connection (we may not win at once ourselves)
      if (s.k === 0 || s.k > 3) {
        const os = { ...spec, side: 3 - spec.side };
        await N.setpos(os); const t = await N.solve(Math.min(4, MAXK), 400);
        if (t.k >= 1) {
          await N.setpos(spec);
          const D = await N.puzzle(t.k, 1, 4000);
          if (!D.some(e => e.need < 0)) {
            const esc = D.filter(e => e.need === 0);
            if (esc.length === 1) { out.write(JSON.stringify({ t: 'block', n, k: t.k, s: spec, answer: esc[0].m, g: gi, ply: k, sw: s.k }) + '\n'); found++; }
          }
        }
      }
    }
    process.stderr.write(`\r${inF}: game ${gi + 1}/${lines.length}, found ${found}`);
  }
  out.end(); N.close(); process.stderr.write('\n');
})();
