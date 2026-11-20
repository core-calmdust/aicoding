// logistic model of a fleet matchup: own types, opp types, own×opp pairs, own×own pairs, first mover
const fs = require('fs'); const NT = 50;
const games = []; for (const f of ['./d1.jsonl', './d2.jsonl']) for (const l of fs.readFileSync(f, 'utf8').split('\n')) if (l) games.push(JSON.parse(l));
const OWN = 0, OPP = NT, X = 2 * NT, SYN = X + NT * NT, FIRST = SYN + NT * NT, D = FIRST + 1;
function feats(me, op, first) { const f = []; const cnt = a => { const c = new Map(); for (const k of a) c.set(k, (c.get(k) || 0) + 1); return c; };
  const cm = cnt(me), co = cnt(op);
  for (const [k, n] of cm) f.push([OWN + k, n]); for (const [k, n] of co) f.push([OPP + k, n]);
  for (const [k] of cm) for (const [j] of co) f.push([X + k * NT + j, 1]);
  const ks = [...cm.keys()]; for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const a = Math.min(ks[i], ks[j]), b = Math.max(ks[i], ks[j]); f.push([SYN + a * NT + b, 1]); }
  if (first) f.push([FIRST, 1]); return f; }
const data = []; for (const g of games) { data.push([feats(g.a, g.b, g.first === 0), g.w === 0 ? 1 : 0]); data.push([feats(g.b, g.a, g.first === 1), g.w === 1 ? 1 : 0]); }
// split
const nTest = 20000, test = data.slice(0, nTest), train = data.slice(nTest);
const w = new Float64Array(D); let b = 0;
const L2 = { main: 1e-5, pair: 4e-4 };
const pred = f => { let s = b; for (const [i, v] of f) s += w[i] * v; return 1 / (1 + Math.exp(-s)); };
const ll = set => { let s = 0, acc = 0; for (const [f, y] of set) { const p = Math.min(1 - 1e-9, Math.max(1e-9, pred(f))); s += y ? -Math.log(p) : -Math.log(1 - p); acc += (p > .5) === !!y ? 1 : 0; } return [(s / set.length).toFixed(4), (acc / set.length * 100).toFixed(1)]; };
console.log('base', ll(test));
for (let ep = 0; ep < 6; ep++) { const lr = .02 / (1 + ep);
  for (let t = train.length - 1; t > 0; t--) { const j = Math.random() * (t + 1) | 0; [train[t], train[j]] = [train[j], train[t]]; }
  for (const [f, y] of train) { const g = pred(f) - y; b -= lr * g; for (const [i, v] of f) { const reg = i < X ? L2.main : L2.pair; w[i] -= lr * (g * v + reg * w[i] * 1000 / 1000); } }
  console.log('epoch', ep, 'train', ll(train.slice(0, 20000)), 'test', ll(test)); }
fs.writeFileSync('./model.json', JSON.stringify({ b, w: Array.from(w).map(x => +x.toFixed(4)) }));
// top effects
const E = require('../engine.js'); const nm = k => E.TYPES[k].k;
const pairs = []; for (let k = 0; k < NT; k++) for (let j = 0; j < NT; j++) pairs.push(['vs', nm(k), nm(j), w[X + k * NT + j]]);
for (let a = 0; a < NT; a++) for (let c = a + 1; c < NT; c++) pairs.push(['syn', nm(a), nm(c), w[SYN + a * NT + c]]);
pairs.sort((p, q) => Math.abs(q[3]) - Math.abs(p[3])); console.log(pairs.slice(0, 20).map(p => p.join(' ') ).join('\n'));
console.log('first', w[FIRST].toFixed(3));
