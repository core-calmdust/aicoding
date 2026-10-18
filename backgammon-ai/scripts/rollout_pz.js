const BG = require(__dirname + '/bgw.js'), fs = require('fs');
const bo = fs.readFileSync('/home/claude/work/data/backgammon/bearoff.bin'); BG.loadBearoff(bo.buffer.slice(bo.byteOffset, bo.byteOffset + bo.length));
BG.setNets(JSON.parse(fs.readFileSync(__dirname + '/../nets/fast1.json')));
{ const bin = fs.readFileSync(__dirname + '/../nets/wildbg.bin'); BG.loadWildbg(JSON.parse(fs.readFileSync(__dirname + '/../nets/wildbg.json')), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length)); }
const decPos = s => { const p = new Int8Array(52); for (let i = 0; i < 52; i++) p[i] = parseInt(s[i], 16); return p; };
const P = { pos: '0033232100000000000001000002420430000000000000000000', side: 1 };
const cands = ['FEEB', 'DABA'];
const N = +process.argv[2] || 2000, res = cands.map(() => 0);
for (let g = 0; g < N; g++) {
  for (let c = 0; c < cands.length; c++) {
    const q = decPos(P.pos); const s = cands[c]; for (let i = 0; i < s.length; i += 2) BG.apply(q, P.side, s.charCodeAt(i) - 65, s.charCodeAt(i + 1) - 65);
    const ds = new BG.DiceStream('ro' + g, 0); let p = q, side = 1 - P.side, k = 0;
    while (BG.winner(p) < 0 && k < 200) { const d = ds.get(k++); p = BG.analyzePlays(p, side, d[0], d[1], { ply: 0 })[0].pos; side = 1 - side; }
    const w = BG.winner(p); res[c] += BG.winKind(p, w) * (w === P.side ? 1 : -1);
  }
}
console.log(cands.map((c, i) => c + ' ' + (res[i] / N).toFixed(4)).join('  '), 'diff', ((res[0] - res[1]) / N).toFixed(4));
