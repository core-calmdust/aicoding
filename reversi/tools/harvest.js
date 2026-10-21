// self-play position harvester -> candidate puzzles (append-only JSONL, resumable by game index)
// usage: node harvest.js out.jsonl startGame endGame
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const DIR = process.env.RVDIR || '/home/claude/wt-rv1000/reversi';
const raw = zlib.gunzipSync(fs.readFileSync(path.join(DIR, 'weights.bin.gz')));
const W = new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2);
const E = require(path.join(DIR, 'engine.js')); E.setWeights(W, 30);
const { legal, play, start } = require('./eng-lite.js');
const { analyse, canon } = require('./feat.js');
const [out, g0, g1] = [process.argv[2], +process.argv[3], +process.argv[4]];
const prog = out + '.game';
let gStart = g0; if (fs.existsSync(prog)) gStart = Math.max(g0, +fs.readFileSync(prog, 'utf8') + 1);
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
for (let g = gStart; g < g1; g++) {
  const r = rng(g * 2654435761 + 77);
  // players: mostly mid-strength noisy levels; sometimes a lopsided pairing (for wipe-outs / comebacks)
  let lb, lw; const u = r();
  if (u < 0.18) { const weak = 1 + Math.floor(r() * 4), strong = 8 + Math.floor(r() * 3); if (r() < 0.5) { lb = weak; lw = strong; } else { lb = strong; lw = weak; } }
  else { lb = 3 + Math.floor(r() * 8); lw = 3 + Math.floor(r() * 8); }
  // which empties to sample in this game (2-3 points), weighted toward 4-14
  const pick = new Set(); const nPick = process.env.EMP ? 1 : 2 + (r() < 0.5 ? 1 : 0);
  if (process.env.EMP) { const L = process.env.EMP.split(',').map(Number); pick.add(L[Math.floor(r() * L.length)]); }
  while (pick.size < nPick && !process.env.EMP) { const x = r(); const em = x < 0.12 ? 2 + Math.floor(r() * 3) : x < 0.93 ? 5 + Math.floor(r() * 10) : 15 + Math.floor(r() * 2); pick.add(em); }
  let c = start(), s = 1; E.clearTT();
  for (let i = 0; i < 4; i++) { const ms = legal(c, s); c = play(c, ms[Math.floor(r() * ms.length)], s); s = 3 - s; }
  const found = [];
  while (true) {
    let ms = legal(c, s);
    if (!ms.length) { s = 3 - s; ms = legal(c, s); if (!ms.length) break; }
    const em = c.filter(v => !v).length;
    if (pick.has(em) && ms.length >= 2) {
      pick.delete(em);
      const A = analyse(E, c, s);
      if (A) found.push({ g, cells: c.join(''), toMove: s, key: canon(c, s), lv: [lb, lw], ...A });
    }
    const lvl = s === 1 ? lb : lw;
    const rr = E.think(c, s, { level: lvl, random: r, noBook: true });
    c = play(c, rr.move, s); s = 3 - s;
  }
  for (const f of found) fs.appendFileSync(out, JSON.stringify(f) + '\n');
  fs.writeFileSync(prog, String(g));
}
