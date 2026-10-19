// labels_*.jsonl (Rapfi evals) -> binary training set per rule group; lab = Rapfi win probability for the side to move
'use strict';
const fs = require('fs');
const { E, features } = require('./feat.js');
const GROUP = process.argv[2] || 'renju';
const games = fs.readFileSync('/home/claude/work/eval/games.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l));
const labs = [];
for (const f of fs.readdirSync('/home/claude/work/eval').filter(f => /^labels_\d+\.jsonl$/.test(f)))
  for (const l of fs.readFileSync('/home/claude/work/eval/' + f, 'utf8').split('\n')) if (l) { try { labs.push(JSON.parse(l)); } catch (e) {} }
const ids = [], cnts = [], offs = [0], lab = [], gid = [], old = [], res = [];
const fm = new Map();
for (const o of labs) {
  const g = games[o.g]; if ((GROUP === 'renju') !== (g.rule === 'renju')) continue;
  const pos = E.setup(g.rule, { b: [], w: [] }); for (const m of g.moves.slice(0, o.k)) pos.make(m);
  const me = pos.side, op = 3 - me;
  let p; const ev = String(o.ev);
  if (ev.includes('M')) p = ev.startsWith('-') ? 0 : 1; else p = 1 / (1 + Math.exp(-(+ev) / 200));
  features(pos, fm);
  for (const [f, c] of fm) { ids.push(f); cnts.push(Math.min(255, c)); }
  offs.push(ids.length); lab.push(p); gid.push(o.g); old.push((pos.tot[me] * 12 - pos.tot[op] * 10) / 10); res.push(g.winner ? (g.winner === me ? 1 : 0) : 0.5);
}
const dir = '/home/claude/work/eval/lab_' + GROUP; fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(dir + '/ids.bin', Buffer.from(new Uint16Array(ids).buffer));
fs.writeFileSync(dir + '/cnt.bin', Buffer.from(new Uint8Array(cnts).buffer));
fs.writeFileSync(dir + '/off.bin', Buffer.from(new Int32Array(offs).buffer));
fs.writeFileSync(dir + '/lab.bin', Buffer.from(new Float32Array(lab).buffer));
fs.writeFileSync(dir + '/gid.bin', Buffer.from(new Int32Array(gid).buffer));
fs.writeFileSync(dir + '/old.bin', Buffer.from(new Float32Array(old).buffer));
fs.writeFileSync(dir + '/res.bin', Buffer.from(new Float32Array(res).buffer));
console.log(GROUP, 'labelled positions', lab.length);
