// Re-evaluate puzzle / lesson answers with the strong engine (wildbg + hybrid 2-ply).
const BG = require(__dirname + '/bgw.js'), fs = require('fs');
const bo = fs.readFileSync('/home/claude/work/data/backgammon/bearoff.bin'); BG.loadBearoff(bo.buffer.slice(bo.byteOffset, bo.byteOffset + bo.length));
BG.setNets(JSON.parse(fs.readFileSync(__dirname + '/../nets/fast1.json')));
{ const bin = fs.readFileSync(__dirname + '/../nets/wildbg.bin'); BG.loadWildbg(JSON.parse(fs.readFileSync(__dirname + '/../nets/wildbg.json')), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length)); }
const decPos = s => { const p = new Int8Array(52); for (let i = 0; i < 52; i++) p[i] = parseInt(s[i], 16); return p; };
const enc = (p, side, moves) => moves.map(c => String.fromCharCode(65 + BG.mvFrom(c), 65 + BG.mvTo(c))).join('');
const PZ = JSON.parse(fs.readFileSync('/home/claude/aicoding/backgammon/puzzles.json'));
for (const L of PZ.levels) for (const P of L.puzzles) {
  const p = decPos(P.pos), pl = BG.analyzePlays(p, P.side, P.dice[0], P.dice[1], { ply: 2, keep1: 10, margin1: 0.4, keep2: 5, margin2: 0.2 });
  const best = enc(p, P.side, pl[0].moves);
  const same = BG.key(pl[0].pos) === (() => { const q = p.slice(); const s = P.plays[0][0]; for (let i = 0; i < s.length; i += 2) BG.apply(q, P.side, s.charCodeAt(i) - 65, s.charCodeAt(i + 1) - 65); return BG.key(q); })();
  console.log(same ? 'ok ' : 'DIFF', P.theme, 'stored', P.plays[0][0], P.gap, '| new', BG.notation(pl[0].moves), pl.slice(0, 3).map(x => x.e.toFixed(3) + '@' + x.ply).join(' '));
}
