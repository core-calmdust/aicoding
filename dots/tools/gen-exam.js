// (2026-11-28 担当A) candidates for the lesson exam (卒業試験：これまでの全範囲から — the intro's 「安全な線、取り切りと残し、長鎖ルール、
// 犠牲、ループ、終盤の数え」). Each exam problem is a problem of an earlier lesson (q.k = '<lesson>' or '<lesson>:<its k>'): control,
// parity, sacrifice, loop, count. Random games on an n×n (safe lines at random while there are any; then a box taken or left, a part opened,
// at random), every position along the way that the cheap shape test lets through goes to the exact solver, and the candidate is kept
// only when tools/lesson-verify.js dots passes it as a problem of that lesson (every check of the lesson, ハコピヨ's words for it, ⑤ no
// other dots problem — every lesson but the exam, the puzzles, the opening book — within 2 lines in the 8 symmetries).
// node dots/tools/gen-exam.js <kind> <n> [count] [seed] [tries] > out.jsonl     kind: control | parity | sacrifice | loop | count
const path = require('path'), fs = require('fs'), ROOT = path.join(__dirname, '../..');
const E = require(path.join(ROOT, 'dots/engine.js')), V = require(path.join(ROOT, 'tools/lesson-verify.js'));
const DK = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const kind = process.argv[2], n = +process.argv[3], want = +(process.argv[4] || 10); let seed = +(process.argv[5] || 1); const maxTries = +(process.argv[6] || 4000);
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // (mulberry32)
const pick = a => a[Math.floor(rnd() * a.length)];
const G = E.geom(n, n), L0 = JSON.parse(fs.readFileSync(path.join(ROOT, 'dots/lessons.json'), 'utf8'));
// the other lessons as a pool only (renamed: not checked), the candidate as the one checked step
const poolSteps = L0.steps.filter(s => s.id !== 'exam').map(s => Object.assign({}, s, { id: 'zz_' + s.id }));
const enc = (p, own) => { const e = p.edges().map(x => DK[x]).join(''), o = own.map(x => x < 0 ? '.' : String(x)).join('');
  const all = new E.Solver(G).all(p), v = new Array(G.E).fill('.'); for (const x of all) v[x.m] = DK[x.v + 30]; return { n, e, o, v: v.join('') }; };
function shape(p, taken) {
  const lg = p.legal(), safe = lg.filter(e => p.isSafe(e)), cs = E.components(p, true), c3 = [...p.cnt].filter(c => c === 3).length;
  if (kind === 'parity') return !taken && !p.hasCapture() && safe.length >= 3 && safe.length <= (n === 4 ? 7 : 6);
  if (kind === 'sacrifice') return !taken && !p.hasCapture() && safe.length >= 2 && safe.length <= (n === 4 ? 5 : 4);
  if (safe.length) return false;
  if (kind === 'control' || kind === 'count') { if (c3 !== 1 || cs.some(c => c.loop) || cs.some(c => !c.simple && !c.boxes.some(b => p.cnt[b] === 3))) return false;
    const cur = cs.filter(c => c.boxes.some(b => p.cnt[b] === 3)), rest = cs.filter(c => !cur.includes(c)); if (cur.length !== 1 || cur[0].n !== 2 || !rest.length) return false;
    return kind === 'control' ? true : rest.some(c => c.n <= 2) && rest.some(c => c.n >= 3); }
  if (kind === 'loop') return cs.some(c => c.n === 4 && (c.loop || !c.simple)) && cs.length >= 2;
  return false;
}
// the cheap test on the solver's values before the full check: one best line, 2+ above the next, a win; parity: it is safe;
// sacrifice: it is not safe and every safe line loses
function pre(p, q) { const vs = []; [...q.v].forEach((c, e) => { if (c !== '.') vs.push([e, DK.indexOf(c) - 30]); }); const best = Math.max(...vs.map(x => x[1])), B = vs.filter(x => x[1] === best);
  if (B.length !== 1 || vs.length < 3) return false; const sec = Math.max(...vs.filter(x => x[1] < best).map(x => x[1])); if (best - sec < 2) return false;
  if (kind === 'parity') return best > 0 && p.isSafe(B[0][0]);
  if (kind === 'sacrifice') return best > 0 && !p.isSafe(B[0][0]) && vs.every(x => !p.isSafe(x[0]) || x[1] < 0);
  return true; }
const seen = new Set(), got = []; let tries = 0;
while (got.length < want && tries < maxTries) { tries++;
  const p = E.Pos.from(G, []), own = new Array(G.B).fill(-1); let side = 0, taken = 0;   // own: 0 = the side to move now, kept relative below
  for (;;) { const lg = p.legal(); if (!lg.length) break;
    if (shape(p, taken)) { const rel = own.map(x => x < 0 ? -1 : x === side ? 0 : 1), q = enc(p, rel), key = q.e;
      if (!seen.has(key) && pre(p, q)) { seen.add(key);
        const cs0 = E.components(p, true), long0 = cs0.some(c => c.n >= 3 && !c.boxes.some(b => p.cnt[b] === 3));
        const subs = kind === 'loop' ? ['loopdec', 'loopopen'] : kind === 'count' ? ['take', 'dd'] : kind === 'control' ? [long0 ? 'ctl_decline' : 'ctl_take'] : [null];   // (control: the board decides — a chain of 3+ left = the leave)
        for (const sub of subs) { const c = Object.assign({}, q, { k: sub || kind }), L = { steps: poolSteps.concat([{ id: kind, course: 'x', problems: [c, c] }]) };
          const bad = V.dots({ lessons: L, only: new Set([kind]) }).filter(x => x.q === 2 && !/^⑥/.test(x.msg));
          if (!bad.length) { const safe = lg.filter(e => p.isSafe(e)).length; got.push(Object.assign({}, q, { k: kind + (sub ? ':' + sub : ''), safe, parts: E.components(p, true).length })); process.stdout.write(JSON.stringify(got[got.length - 1]) + '\n'); break; } } } }
    // the next line of the random game
    const safe = lg.filter(e => p.isSafe(e)), take = lg.filter(e => p.completes(e) > 0);
    let e;
    if (safe.length) e = pick(safe);
    else if (take.length && rnd() < 0.85) e = pick(take);
    else e = pick(lg.filter(x => !p.completes(x)).length ? lg.filter(x => !p.completes(x)) : lg);
    const bs = [G.eb0[e], G.eb1[e]], k = p.play(e);
    bs.forEach(b => { if (b >= 0 && p.cnt[b] === 4 && own[b] < 0) { own[b] = side; taken++; } });
    if (!k) side ^= 1; } }
process.stderr.write(`${kind} ${n}×${n}: ${got.length} in ${tries} games\n`);
