const BG = require(__dirname + '/bgn.js'), fs = require('fs');
const bo = fs.readFileSync('/home/claude/work/data/backgammon/bearoff.bin'); BG.loadBearoff(bo.buffer.slice(bo.byteOffset, bo.byteOffset + bo.length));
BG.setNets(JSON.parse(fs.readFileSync(process.argv[2])));
const decPos = s => { const p = new Int8Array(52); for (let i = 0; i < 52; i++) p[i] = parseInt(s[i], 16); return p; };
const decM = (p, side, s) => { const q = p.slice(); for (let i = 0; i < s.length; i += 2) BG.apply(q, side, s.charCodeAt(i) - 65, s.charCodeAt(i + 1) - 65); return BG.key(q); };
const PZ = JSON.parse(fs.readFileSync('/home/claude/aicoding/backgammon/puzzles.json'));
let n = 0, agree = 0; const bad = [];
for (const L of PZ.levels) for (const P of L.puzzles) {
  const p = decPos(P.pos), best = BG.analyzePlays(p, P.side, P.dice[0], P.dice[1], { ply: 1, keep1: 8, margin1: 0.3 })[0];
  n++; if (BG.key(best.pos) === decM(p, P.side, P.plays[0][0])) agree++; else bad.push(P.plays[0][0] + ' vs ' + BG.notation(best.moves));
}
const LS = JSON.parse(fs.readFileSync('/home/claude/aicoding/backgammon/lessons.json'));
let ln = 0, la = 0;
for (const st of LS.steps) for (const P of st.problems) if (P.kind === 'play') {
  const p = decPos(P.pos), best = BG.analyzePlays(p, P.side, P.dice[0], P.dice[1], { ply: 1, keep1: 8, margin1: 0.3 })[0];
  ln++; if (BG.key(best.pos) === decM(p, P.side, P.plays[0][0])) la++;
}
console.log(`puzzles agree ${agree}/${n}; lesson play problems agree ${la}/${ln}`, bad.slice(0, 5));
