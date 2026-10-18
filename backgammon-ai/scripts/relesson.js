const BG = require(__dirname + '/bgw.js'), fs = require('fs');
const bo = fs.readFileSync('/home/claude/work/data/backgammon/bearoff.bin'); BG.loadBearoff(bo.buffer.slice(bo.byteOffset, bo.byteOffset + bo.length));
BG.setNets(JSON.parse(fs.readFileSync(__dirname + '/../nets/fast1.json')));
{ const bin = fs.readFileSync(__dirname + '/../nets/wildbg.bin'); BG.loadWildbg(JSON.parse(fs.readFileSync(__dirname + '/../nets/wildbg.json')), bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length)); }
const decPos = s => { const p = new Int8Array(52); for (let i = 0; i < 52; i++) p[i] = parseInt(s[i], 16); return p; };
const key = (p, side, s) => { const q = p.slice(); for (let i = 0; i < s.length; i += 2) BG.apply(q, side, s.charCodeAt(i) - 65, s.charCodeAt(i + 1) - 65); return BG.key(q); };
const LS = JSON.parse(fs.readFileSync('/home/claude/aicoding/backgammon/lessons.json'));
LS.steps.forEach((st, si) => st.problems.forEach((P, pi) => { if (P.kind !== 'play') return;
  const p = decPos(P.pos), pl = BG.analyzePlays(p, P.side, P.dice[0], P.dice[1], { ply: 1, keep1: 10, margin1: 0.4 });
  if (BG.key(pl[0].pos) !== key(p, P.side, P.plays[0][0])) {
    const pl2 = BG.analyzePlays(p, P.side, P.dice[0], P.dice[1], { ply: 2, keep1: 10, margin1: 0.4, keep2: 4, margin2: 0.2 });
    const rankStored = pl2.findIndex(x => BG.key(x.pos) === key(p, P.side, P.plays[0][0]));
    console.log('step', si, st.id, 'prob', pi, 'stored', P.plays[0][0], 'new2ply', BG.notation(pl2[0].moves), pl2.slice(0, 3).map(x => x.e.toFixed(3)).join(' '), 'stored rank', rankStored, P.plays.slice(0, 3));
  }
}));
