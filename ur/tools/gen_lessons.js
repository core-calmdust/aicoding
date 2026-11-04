// ur/tools/gen_lessons.js — 段階化レッスン（ur/lessons.json）を作る
// 各レッスン：概念（body）→ 例題（ramp explain：最善手を実演）→ やさしい練習（ramp try）→ 採点問題5問（各20点、75点で合格）。
// 手の問題はすべて自己対局の局面から、evaluate（深さ2）と深さ3で最善手が明確に良いもの（差 ≥ 0.05）だけ。
// 確率・数え方の問題（choice）は合成局面で、答えは E.hitRisk / E.raceCount で確かめる。パズルと同じ局面は使わない。
// 使い方: node ur/tools/gen_lessons.js [--cache DIR]
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./learn_common.js'), X = require('./learn_text.js');
const E = L.E;
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const CACHE = arg('--cache') || path.join(require('os').tmpdir(), 'ur-learn-cache');
fs.mkdirSync(CACHE, { recursive: true });
const rng = E.mulberry32(20261104);
const MIN_GAP = 0.05;

const rc = (rule, side, i) => { const q = E.coords(rule, side, i); return q ? { r: q[0], c: q[1] } : null; };
const spot = (rule, i) => i <= 0 ? { tray: 'start', side: 0 } : i >= E.RULES[rule].goal ? { tray: 'goal', side: 0 } : rc(rule, 0, i);
const arrow = (rule, f, t) => ({ type: 'arrow', from: spot(rule, f), to: spot(rule, t), color: '#3df59a' });
function fill(key, params) { const t = X.MSG[key], o = {}; for (const l of X.LANGS) o[l] = t[l].replace(/\{(\w+)\}/g, (_, k) => params[k] != null ? params[k] : ''); return o; }

// ---- puzzle sigs (avoid reuse)
const PZ = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
const used = new Set();
for (const T of PZ.themes) for (const p of T.puzzles) used.add(L.sig({ s: p.s, n: p.n, ev: p.ev }));

const poolF = L.pool('finkel', 200, 1, path.join(CACHE, 'pool-finkel-1.json')).concat(L.synthRace(8000, 901).concat(L.synthRace(8000, 902), L.synthRace(8000, 903)));
const poolB = L.pool('blitz', 60, 2, path.join(CACHE, 'pool-blitz-2.json'));
for (const P of [poolF, poolB]) P.forEach(p => { if (p.ev.length >= 2) { p.gap = p.ev[0][2] - p.ev[1][2]; p.th = p.gap >= (L.contact(p.s) ? MIN_GAP : 0.03) ? L.classify(p) : []; } else p.th = []; });

// take k positions with one of the themes; easy ones first (big gap, few moves)
function take(pool, themes, k, opt = {}) {
  const list = pool.filter(p => p.th.some(t => themes.includes(t)) && !used.has(L.sig(p)) && p.ev[0][2] > 0.05 && p.ev[0][2] < 0.97 && (!opt.maxMoves || p.ev.length <= opt.maxMoves) && (!opt.f || opt.f(p)))
    .sort((a, b) => b.gap - a.gap);
  const out = [];
  for (const p of list) {
    if (out.length >= k) break;
    const ev3 = L.verify(p, L.contact(p.s) ? MIN_GAP - 0.01 : 0.03); if (!ev3) continue;
    used.add(L.sig(p)); out.push(Object.assign({}, p, { ev: ev3 }));
  }
  if (out.length < k) throw new Error(`not enough for ${themes} (${out.length}/${k})`);
  return out;
}
const S = p => ({ rule: p.s.rule, pos: p.s.pos, turn: 0 });
function moveProblem(p, theme) {
  const r = L.reasons(p, theme), b = p.ev[0];
  return { kind: 'move', s: S(p), n: p.n, ok: [[b[0], b[1]]], best: [b[0], b[1]], ev: p.ev, why: r.why, ng: r.ng, look: L.lookMarks(p, theme) };
}
function ramp(LS, ex, tr, theme) {
  const b = ex.ev[0], t = tr.ev[0];
  return [
    { k: 'explain', s: S(ex), n: ex.n, seq: [[b[0], b[1]]], marks: L.lookMarks(ex, theme).concat([arrow(ex.s.rule, b[0], b[1])]), t: LS.exT, body: LS.exB },
    { k: 'try', s: S(tr), n: tr.n, ok: [[t[0], t[1]]], marks: [], look: L.lookMarks(tr, theme), t: LS.tryT, h: LS.h1, g: fill(L.reasons(tr, theme).why[0], L.reasons(tr, theme).why[1]), y: X.UI.rampRetry },
  ];
}
function moveLesson(id, cat, pool, themes, theme, extra = {}) {
  const LS = X.LESSON[id];
  const [tr] = take(pool, themes, 1, { maxMoves: 2, f: extra.f });
  const [ex] = take(pool, themes, 1, { maxMoves: 3, f: extra.f });
  const probs = take(pool, themes, extra.n || 5, extra).reverse().sort((a, b) => b.ev[0][2] - b.ev[1][2] - (a.ev[0][2] - a.ev[1][2]));
  return {
    id, cat, rule: pool[0].s.rule, title: LS.title, tip: LS.tip, body: LS.body,
    diagram: { s: S(ex), marks: L.lookMarks(ex, theme) },
    ramp: ramp(LS, ex, tr, theme),
    problems: probs.map(p => moveProblem(p, theme)),
    hints: [LS.h1, LS.h2],
  };
}

// ---- choice problems
const frac = m => m + '/16';
function rollChoice(n) {
  const m = [1, 4, 6, 4, 1][n];
  const opts = ['1/16', '4/16', '6/16', '8/16'];
  return { kind: 'choice', q: fillQ('roll', { n }), opts, ans: opts.indexOf(frac(m)), why: ['c.roll', { n, m }] };
}
function fillQ(k, v) { const o = {}; for (const l of X.LANGS) o[l] = X.Q[k][l].replace(/\{(\w+)\}/g, (_, x) => v[x]); return o; }
// my piece on middle-row square p, rival pieces d squares behind (rival path index = same number on the middle row,
// or their own row squares 1–4 which lead onto 5)
function riskChoice(ds, p) {
  const a = [p, 15, 15, 15, 15, 15, 0], b = ds.map(d => p - d).concat([15, 15]); while (b.length < 7) b.push(0);
  const s = { rule: 'finkel', pos: [a, b.slice(0, 7)], turn: 1, winner: -1 };
  const risk = E.hitRisk(s, 0)[0], m = Math.round(risk * 16);
  const want = ds.reduce((x, d) => x + [0, 4, 6, 4, 1][d], 0);
  if (m !== want) throw new Error('risk mismatch ' + ds + ' ' + m + ' ' + want);
  const cand = [m, m + 2, Math.max(1, m - 2), m + 4, Math.max(1, m - 3), m + 1].filter((x, i, A) => A.indexOf(x) === i && x > 0 && x <= 16).slice(0, 4).sort((x, y) => x - y);
  const list = ds.map(d => `${d}→${frac([0, 4, 6, 4, 1][d])}`).join(' + ');
  s.turn = 0;
  return { kind: 'choice', s: { rule: 'finkel', pos: s.pos, turn: 0 }, marks: [Object.assign(rc('finkel', 0, p), { type: 'danger' })].concat(ds.map(d => Object.assign(rc('finkel', 1, p - d), { type: 'text', text: String(d), size: 26, color: '#ffe27a' }))), q: fillQ('risk', {}), opts: cand.map(frac), ans: cand.indexOf(m), why: ['c.risk', { list, m }] };
}
function pipsOf(a) { return a.reduce((x, q) => x + (15 - q), 0); }
function pipsChoice(seed) {
  const r = E.mulberry32(seed);
  for (;;) {
    const a = [15, 15, 15, 14, 12, 6, 2].map(x => x === 15 && r() < .3 ? 15 : x), b = [15, 15, 15, 13, 10, 3, 0];
    const t = { rule: 'finkel', pos: [a.map(x => x < 15 && x > 0 ? Math.max(1, Math.min(14, x + Math.floor(r() * 3) - 1)) : x), b], turn: 0, winner: -1 };
    const on = t.pos[0].filter(x => x >= 1 && x <= 14); if (new Set(on).size !== on.length) continue;
    const m = E.raceCount(t).pips[0]; if (m !== pipsOf(t.pos[0])) throw new Error('pips');
    const cand = [m, m - 3, m + 2, m + 5].sort((x, y) => x - y);
    const nums = t.pos[0].filter(x => x >= 1 && x <= 14).map(x => Object.assign(rc('finkel', 0, x), { type: 'text', text: String(15 - x), size: 24, color: '#ffe27a' }));
    return { kind: 'choice', s: { rule: 'finkel', pos: t.pos, turn: 0 }, marks: nums, q: fillQ('pips', {}), opts: cand.map(String), ans: cand.indexOf(m), why: ['c.pips', { m }] };
  }
}
function leadChoice(a, b) {
  const t = { rule: 'finkel', pos: [a, b], turn: 0, winner: -1 }, rcnt = E.raceCount(t);
  return { kind: 'choice', s: { rule: 'finkel', pos: [a, b], turn: 0 }, q: fillQ('lead', {}), opts: [X.Q.you, X.Q.rival], ans: rcnt.pips[0] < rcnt.pips[1] ? 0 : 1, why: ['c.lead', { a: rcnt.pips[0], b: rcnt.pips[1] }] };
}

function main() {
  const steps = [];
  // 1. dice odds (choice)
  {
    const LS = X.LESSON.prob;
    const ex = riskChoice([2], 7);
    steps.push({ id: 'prob', cat: 'basic', rule: 'finkel', title: LS.title, tip: LS.tip, body: LS.body,
      diagram: { s: ex.s, marks: ex.marks },
      ramp: [
        { k: 'explain', s: ex.s, n: null, seq: [], marks: ex.marks, t: LS.exT, body: LS.exB },
        { k: 'try', kind: 'choice', opts: ['0', '1', '2', '3', '4'], ans: 2, t: LS.tryT, h: LS.h1, g: fill('c.roll', { n: 2, m: 6 }), y: X.UI.rampRetry },
      ],
      problems: [rollChoice(3), rollChoice(4), riskChoice([1], 9), riskChoice([3, 1], 10), riskChoice([2, 4], 11)],
      hints: [LS.h1, LS.h2] });
  }
  steps.push(moveLesson('rosette', 'basic', poolF, ['rosette'], 'rosette'));
  steps.push(moveLesson('center', 'basic', poolF, ['center'], 'center'));
  steps.push(moveLesson('hold', 'basic', poolF, ['hold'], 'hold'));
  steps.push(moveLesson('enter', 'basic', poolF, ['enter', 'advance'], 'enter'));
  steps.push(moveLesson('danger', 'tactics', poolF, ['safe'], 'safe'));
  steps.push(moveLesson('escape', 'tactics', poolF, ['escape'], 'escape'));
  steps.push(moveLesson('capture', 'tactics', poolF, ['capture'], 'capture'));
  {
    const ch = moveLesson('choose', 'tactics', poolF, ['nocap'], 'nocap', {});
    const cap = take(poolF, ['capture'], 2, { f: p => p.ev.length >= 3 && L.riskAfter(p.s, L.moveOf(p.s, p.n, p.ev[0][0])) > 0.2 });
    ch.problems = ch.problems.slice(0, 3).concat(cap.map(p => moveProblem(p, 'capture')));
    steps.push(ch);
  }
  // fix the theme of "choose" problems individually (capture best → w.cap, else w.nocap)
  steps[steps.length - 1].problems = steps[steps.length - 1].problems.map(q => {
    const p = { s: q.s, n: q.n, ev: q.ev }; const best = L.moveOf(Object.assign({ winner: -1 }, q.s), q.n, q.best[0]);
    const r = L.reasons(p, best.capture ? 'capture' : 'nocap'); return Object.assign(q, { why: r.why, ng: r.ng });
  });
  steps.push(moveLesson('goal', 'end', poolF, ['goal'], 'goal'));
  // race: count (choice ×2) + race moves (×3)
  {
    const LS = X.LESSON.race, base = moveLesson('race', 'end', poolF, ['race'], 'race', { n: 3 });
    const pc = pipsChoice(3);
    base.ramp = [
      { k: 'explain', s: pc.s, n: null, seq: [], marks: pc.marks, t: LS.exT, body: LS.exB },
      Object.assign({ k: 'try', t: LS.tryT, h: LS.h1, g: fill('c.pips', { m: pc.opts[pc.ans] }), y: X.UI.rampRetry }, { kind: 'choice', s: pc.s, marks: pc.marks, opts: pc.opts, ans: pc.ans }),
    ];
    const p2 = pipsChoice(11); p2.marks = [];
    base.problems = [p2, leadChoice([15, 15, 15, 14, 13, 9, 6], [15, 15, 15, 15, 13, 3, 1])].concat(base.problems.slice(0, 3));
    steps.push(base);
  }
  steps.push(moveLesson('blitz', 'vari', poolB, ['blitz'], 'blitz'));

  const cats = ['basic', 'tactics', 'end', 'vari'].map(id => ({ id, name: X.CATS[id], steps: steps.filter(s => s.cat === id).map(s => s.id) }));
  // shared title for the hold lesson / choose lesson use their own LESSON entries
  const data = { version: 1, rule: 'finkel', score: { per: 20, pass: 75, hint: [16, 12], retry: 10, answer: 0 }, ui: X.UI, msg: X.MSG, cats, steps };
  const file = path.join(__dirname, '..', 'lessons.json');
  fs.writeFileSync(file, JSON.stringify(data));
  console.log('wrote', file, steps.length, 'lessons:', steps.map(s => s.id + '(' + s.problems.length + ')').join(' '));
}
main();
