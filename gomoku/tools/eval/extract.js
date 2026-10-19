// games.jsonl -> binary training set per rule group (renju | std: standard + free)
'use strict';
const fs = require('fs');
const F = require('./feat.js'), { E } = F; const features = process.env.F2 ? F.features2 : F.features;
const GROUP = process.argv[2] || 'renju', STEP = +process.argv[3] || 2;
const games = fs.readFileSync('/home/claude/work/eval/games.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l))
  .filter(g => g.winner && (GROUP === 'renju' ? g.rule === 'renju' : g.rule !== 'renju'));
const ids = [], cnts = [], offs = [0], lab = [], gid = [], old = [];
const fm = new Map();
games.forEach((g, gi) => {
  const pos = E.setup(g.rule, { b: [], w: [] });
  for (let k = 0; k < g.moves.length - 1; k++) {
    pos.make(g.moves[k]);
    const ply = k + 1; if (ply < 6 || (ply + gi) % STEP) continue;
    const me = pos.side, op = 3 - me;
    if (pos.cnt[me][E.C.FIVE] || pos.cnt[op][E.C.FIVE] >= 2) continue;   // trivial
    features(pos, fm);
    for (const [f, c] of fm) { ids.push(f); cnts.push(Math.min(255, c)); }
    offs.push(ids.length); lab.push(g.winner === me ? 1 : 0); gid.push(gi); old.push((pos.tot[me] * 12 - pos.tot[op] * 10) / 10);
  }
});
const dir = '/home/claude/work/eval/data' + (process.env.F2 ? '2' : '') + '_' + GROUP; fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(dir + (process.env.F2 ? '/ids32.bin' : '/ids.bin'), Buffer.from((process.env.F2 ? new Int32Array(ids) : new Uint16Array(ids)).buffer));
fs.writeFileSync(dir + '/cnt.bin', Buffer.from(new Uint8Array(cnts).buffer));
fs.writeFileSync(dir + '/off.bin', Buffer.from(new Int32Array(offs).buffer));
fs.writeFileSync(dir + '/lab.bin', Buffer.from(new Float32Array(lab).buffer));
fs.writeFileSync(dir + '/old.bin', Buffer.from(new Float32Array(old).buffer));
fs.writeFileSync(dir + '/gid.bin', Buffer.from(new Int32Array(gid).buffer));
console.log(GROUP, 'games', games.length, 'positions', lab.length, 'entries', ids.length);
