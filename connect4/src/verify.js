// node verify.js out.txt games seed mode   mode: rand (Lv8 vs random, both colours) | self (Lv8 vs Lv8, random opening of 1..4 plies)
// writes "position chosenMove how ms" per Lv8 move, and a game summary to stderr. Resumable: appends; skips done games.
const E = require('/home/claude/aicoding/connect4/engine.js');
const fs = require('fs');
const [out, G, seed, mode] = [process.argv[2], +process.argv[3], +process.argv[4], process.argv[5]];
E.setBook(JSON.parse(fs.readFileSync('/home/claude/aicoding/connect4/book.json')));
const t0 = Date.now(); E.setTree(E.decodeTree(fs.readFileSync('/home/claude/aicoding/connect4/tree.bin'))); console.error('tree decode ms', Date.now() - t0);
const win1 = s => E.mateList(s, 1).filter(x => x.need === 1).map(x => x.c);
const legal = s => { const l = []; for (let c = 0; c < 7; c++) if (E.loadMoves(s + (c + 1))) l.push(c); return l; };
let done = 0; try { done = fs.readFileSync(out, 'utf8').split('\n').filter(l => l.startsWith('G ')).length; } catch (e) {}
const res = {};
for (let g = done; g < G; g++) {
  let s = (seed * 1000003 + g * 7919) >>> 0 || 1; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const aiSide = mode === 'rand' ? g & 1 : -1;       // 0: Lv8 first, 1: Lv8 second, -1: both
  const openN = mode === 'self' ? 1 + Math.floor(rnd() * 4) : 0;
  let m = '', lines = [], winner = 0;
  while (true) {
    const p = m.length & 1;
    const l = legal(m); if (!l.length) break;
    let c, ai = (aiSide === -1 && m.length >= openN) || aiSide === p;
    if (ai) { const t = Date.now(); const r = E.think(m, 8); c = r.move; lines.push(`${m || '-'} ${c} ${r.how} ${Date.now() - t}`); }
    else c = l[Math.floor(rnd() * l.length)];
    const w = win1(m).includes(c);
    m += c + 1;
    if (w) { winner = p + 1; break; }
    if (m.length === 42) break;
  }
  const tag = `G ${g} ${mode} side=${aiSide} open=${openN} winner=${winner} ${m}`;
  fs.appendFileSync(out, lines.join('\n') + '\n' + tag + '\n');
  const k = `side${aiSide} winner${winner}`; res[k] = (res[k] || 0) + 1;
}
console.error(JSON.stringify(res));
