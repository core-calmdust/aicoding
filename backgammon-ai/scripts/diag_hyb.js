const BG = require(__dirname + '/bgw.js'), fs = require('fs');
const bo = fs.readFileSync('/home/claude/work/data/backgammon/bearoff.bin'); BG.loadBearoff(bo.buffer.slice(bo.byteOffset, bo.byteOffset + bo.length));
BG.setNets(JSON.parse(fs.readFileSync(__dirname + '/../nets/fast1.json')));
{ const bin = fs.readFileSync(__dirname + '/../nets/wildbg.bin'); BG.loadWildbg(JSON.parse(fs.readFileSync(__dirname + '/../nets/wildbg.json')), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length)); }
// exact WB 1-ply: o picks best reply by WB 0-ply
function wb1(q, o) { if (BG.winner(q) >= 0 || BG.isBearoffPos(q)) return BG.flip(BG.evalPos(q, o)); const acc = [0, 0, 0, 0, 0]; for (const [a, b, pr] of BG.ROLLS) { const v = BG.bestPlay0(q, o, a, b).v; acc[0] += pr * (1 - v[0]); acc[1] += pr * v[3]; acc[2] += pr * v[4]; acc[3] += pr * v[1]; acc[4] += pr * v[2]; } return acc; }
let s0 = 11; const r = () => (s0 = (s0 * 48271) % 2147483647) / 2147483647;
let n = 0, sad = 0, agree = 0, tries = 0;
for (let g = 0; g < 12; g++) { let p = BG.initial(), s = 0;
  for (let k = 0; k < 50 && BG.winner(p) < 0; k++) { const a = 1 + (r() * 6 | 0), b = 1 + (r() * 6 | 0);
    if (k > 3 && k % 4 === 0 && BG.contact(p)) {
      const pl = BG.analyzePlays(p, s, a, b, { ply: 0 }).slice(0, 5);
      if (pl.length > 1) { const H = pl.map(x => BG.equity(BG.hyb1(x.pos, 1 - s))), X = pl.map(x => BG.equity(wb1(x.pos, 1 - s)));
        for (let i = 0; i < pl.length; i++) { sad += Math.abs(H[i] - X[i]); n++; }
        tries++; if (H.indexOf(Math.max(...H)) === X.indexOf(Math.max(...X))) agree++; } }
    p = BG.analyzePlays(p, s, a, b, { ply: 0 })[0].pos; s = 1 - s; } }
console.log('K=' , 'mean |hyb1-wb1|', (sad / n).toFixed(4), 'best-move agreement', agree + '/' + tries);
