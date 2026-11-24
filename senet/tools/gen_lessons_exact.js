// senet/tools/gen_lessons_exact.js — セネトのレッスン（senet/lessons.json）を厳密な勝率で作り直す（2026-11-24、担当C、3D対応）。
// 旧 gen_learn.js（評価ネットの深さ3・理由文に勝率）を置きかえる。厳しい基準（claude/lesson-quality.md ①〜⑨・追1〜）：
//   ① 正解＝厳密な勝率（senet_exact.c：局面から到達できる全局面を全出目・全応手で解いた値）で最善の手
//   ② 2番目の手と 5% 以上の差  ③ 合法手3つ以上（準備の「やってみよう」は2つ以上）  ④ 主題の手（senet_lessfacts.themeOk）
//   ⑤ レッスン・準備・見本・ルール説明の局面と駒4つ以上ちがう  ⑥ 5問は2番目との差の大きい順
//   ⑦⑧ 不正解の手すべてに盤の事実の理由（入れ替えを逃す・水の家・上がり・美の家・相手の次の投げで入れ替えられる目の数）。勝率は書かない（追16）。
// 選択問題（投げ棒の確率・入れ替えられる確率・上がりまでのマス）は合成局面。答えは数え上げで確かめ、誤答それぞれに説明（ngo、追22）。
// 使い方: node senet/tools/gen_lessons_exact.js [seeds=24]（SENET_POOL=ファイル：解いた局面のプールを保存・再利用）
'use strict';
const fs = require('fs'), path = require('path');
const E = require('../engine.js'), X = require('./senet_exact.js'), F = require('./senet_lessfacts.js'), T = require('./learn_text_exact.js');
const FILE = path.join(__dirname, '..', 'lessons.json');
const OLD = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const LANGS = T.LANGS, SEEDS = +process.argv[2] || 24;
const rng = E.mulberry32(20261124);
const MSG = Object.assign({}, T.MSG, require('./learn_text_water.js').MSG);   // (水の家の選ぶ問題・準備の選ぶ問題の文言、2026-11-24)
const fillMsg = (key, p) => { const t = MSG[key], o = {}; for (const l of LANGS) o[l] = t[l].replace(/\{(\w+)\}/g, (_, k) => p[k] != null ? p[k] : ''); return o; };
const fillQ = (Q, v) => { const o = {}; for (const l of LANGS) o[l] = Q[l].replace(/\{(\w+)\}/g, (_, x) => v[x]); return o; };
const S = s => ({ rule: 'std', pos: s.pos.map(a => a.slice()), turn: 0 });
const norm = s => { const t = s.turn || 0; return { rule: 'std', pos: [s.pos[t].slice().sort((a, b) => b - a), s.pos[1 - t].slice().sort((a, b) => b - a)], turn: 0, winner: -1 }; };

// ---- 局面のプール：終盤（盤上の駒が5〜7枚で、すべて 19 以上）の種を自己対局で見つけ、そこから到達できる局面を何本も指し進めて集める
// 指し進めの手（速さのため簡単な方針：上がり・入れ替え・美の家・ペア、なければ前の駒）
function quick(t, ms) { const sc = m => (m.finish ? 50 : 0) + (m.capture ? 30 : 0) + (m.to === 26 ? 20 : 0) - (m.water ? 40 : 0) + (E.board(t)[m.to + 1] === t.turn || E.board(t)[m.to - 1] === t.turn ? 8 : 0) + m.from * .1 + rng() * 6; let b = ms[0]; for (const m of ms) if (sc(m) > sc(b)) b = m; return b; }
async function pool() {
  const jobs = [], seen = new Set();
  let g = 0;
  while (jobs.length < SEEDS && g < SEEDS * 20) {
    let s = E.newGame('std', g++ & 1);
    for (let k = 0; k < 2000 && s.winner < 0; k++) {
      const r = E.rollDice(rng), m = E.think(s, r.n, 9, { rng }); s = E.apply(s, m, r.n).state;
      const on = s.pos[0].concat(s.pos[1]).filter(p => p < 31);
      if (s.winner < 0 && on.length >= 5 && on.length <= 7 && Math.min(...on) >= 19) break;
    }
    if (s.winner >= 0 || seen.has('seed' + E.key(s))) continue;
    seen.add('seed' + E.key(s));
    const seed = E.clone(s), qs = [];
    for (let w = 0; w < 40; w++) {
      let t = E.clone(seed); const eps = 0.15 + 0.5 * rng();
      for (let k = 0; k < 200 && t.winner < 0; k++) {
        const r = E.rollDice(rng), ms = E.legalMoves(t, r.n);
        if (ms.length >= 2) { const u = norm(t), key = E.key(u) + '#' + r.n; if (!seen.has(key)) { seen.add(key); qs.push({ s: u, n: r.n }); } }
        const m = !ms.length ? null : rng() < eps ? ms[Math.floor(rng() * ms.length)] : quick(t, ms);
        t = E.apply(t, m, r.n).state;
      }
    }
    jobs.push({ seed, qs });
  }
  const t0 = Date.now(); await X.runPar(jobs, 2); console.error('solved', jobs.length, 'seeds', jobs.map(j => j.size).join(','), (Date.now() - t0) / 1000 + 's');
  const out = [];
  for (const j of jobs) for (const q of j.qs) if (q.r) {
    const ms = E.legalMoves(q.s, q.n); if (!ms.length || q.r.mv['0'] != null) continue;
    q.ev = ms.map(m => [m.from, m.water ? m.dest : m.to, +q.r.mv[m.from].toFixed(4)]).sort((a, b) => b[2] - a[2]);
    out.push(q);
  }
  return out;
}
// プール2（2026-11-24 担当C 2回目）：盤上が3対3以下の局面は、どの種からでも到達できる全局面（約116万）が同じなので、
// 1回解いたあと（4対2以下・5対1以下も同じ）、ばらばらに並べた局面（駒の位置 10〜30、27 を除く）を大量に問い合わせる。駒の多い中盤の形（ペア・逃げる・安全）を作るため。
async function poolRand(N) {
  const r = E.mulberry32(777), seen = new Set();
  const pickSet = (k, ban) => { const a = []; while (a.length < k) { const q = 10 + Math.floor(r() * 21); if (q === 27 || ban.has(q) || a.includes(q)) continue; a.push(q); } return a; };
  const fill = x => { const y = x.slice(); while (y.length < 5) y.push(31); return y.sort((p, q) => q - p); };
  // 種ごとに到達できる範囲がちがう：3対3以下（約116万）・4対2以下（約170万）・5対1以下（約67万）
  const KINDS = [{ seed: [[24, 22, 20], [25, 23, 19]], ks: [[3, 3], [3, 3], [2, 3], [3, 2], [2, 2]] }, { seed: [[25, 22, 20, 18], [23, 19]], ks: [[4, 2], [4, 2], [4, 1]] }, { seed: [[26, 24, 22, 20, 18], [19]], ks: [[5, 1]] }];
  const jobs = KINDS.map(K => {
    const qs = [];
    while (qs.length < N) {
      // 3割は上がりの形（28・29・30 のどれかに駒があり、出目がちょうど上がる数：3・2・1）。上がりの問題は形がかぎられるため
      const [km, ko] = K.ks[Math.floor(r() * K.ks.length)], ex = r() < 0.3 ? 28 + Math.floor(r() * 3) : 0;
      const a = ex ? [ex].concat(pickSet(km - 1, new Set([ex]))) : pickSet(km, new Set()), b = pickSet(ko, new Set(a));
      const s = { rule: 'std', pos: [fill(a), fill(b)], turn: 0, winner: -1 }, n = ex ? 31 - ex : [1, 2, 2, 3, 3, 4, 5][Math.floor(r() * 7)];
      const key = E.key(s) + '#' + n; if (seen.has(key)) continue; seen.add(key);
      if (E.legalMoves(s, n).length < 2) continue;
      qs.push({ s, n });
    }
    return { seed: { rule: 'std', pos: K.seed.map(fill), turn: 0, winner: -1 }, qs };
  });
  const t0 = Date.now(); await X.runPar(jobs, 2); console.error('rand solved', jobs.map(j => j.size).join(','), (Date.now() - t0) / 1000 + 's');
  const out = [];
  for (const j of jobs) for (const q of j.qs) if (q.r) { const ms = E.legalMoves(q.s, q.n); if (q.r.mv['0'] != null) continue; q.ev = ms.map(m => [m.from, m.water ? m.dest : m.to, +q.r.mv[m.from].toFixed(4)]).sort((x, y) => y[2] - x[2]); out.push(q); }
  return out;
}
let P = [];

// ⑤ すでに使った局面（ルール説明の盤も）
const used = F.tourStates(path.join(__dirname, '..', '..')).map(s => Object.assign(s, { n: 0 }));
const far = (s, n) => used.every(u => F.tokDiff(u, s, u.n, n) >= F.MIN_TOK);
const CC = new Map();
function cands(th, minMoves) {
  const key = th + minMoves; if (CC.has(key)) return CC.get(key);
  const out = [];
  for (const q of P) { const r = F.judge(q.s, q.n, q.ev, th, { minMoves }); if (r.ok && (minMoves === 3 || r.ev.length === 2)) out.push(Object.assign({}, q, r)); }
  out.sort((a, b) => b.gap - a.gap); CC.set(key, out); console.error('cands', th, minMoves, out.length, out.length ? out[0].gap.toFixed(3) : '-');
  return out;
}
function pick(list, k, spread) {
  const out = [], take = q => { out.push(q); used.push(Object.assign(S(q.s), { n: q.n })); };
  if (!spread) { for (const q of list) { if (out.length >= k) break; if (far(q.s, q.n)) take(q); } }
  else for (let i = 0; i < k; i++) {
    const top = Math.min(list.length, 40), at = Math.floor((i + 0.5) * top / k);
    for (let d = 0; d < list.length; d++) { const q = list[(at + d) % list.length]; if (!out.includes(q) && far(q.s, q.n)) { take(q); break; } }
  }
  if (out.length < k) throw new Error('not enough ' + (list[0] && list[0].th) + ' ' + out.length + '/' + k + ' of ' + list.length);
  return out.sort((a, b) => b.gap - a.gap);
}
const arrow = (f, t) => ({ type: 'arrow', from: F.sq(f), to: F.spot(t), color: '#3df59a' });
const mvTo = m => m.finish ? 31 : m.water ? m.dest : m.to;
function moveProblem(q, id) {
  return { kind: 'move', id, s: S(q.s), n: q.n, ok: [[q.best.from, mvTo(q.best)]], best: [q.best.from, mvTo(q.best)], ev: q.ev, gap: +q.gap.toFixed(4), why: q.why, ng: q.ng, look: F.lookMarks(q.s, q.n, q.best, q.th) };
}
function moveLesson(id, th) {
  const O = OLD.steps.find(x => x.id === id);
  const ex = pick(cands(th, 3), 1, false)[0];
  const tr = pick(cands(th, 2), 1, false)[0];
  const probs = pick(cands(th, 3), 5, true);
  return {
    id, cat: O.cat, rule: 'std', title: O.title, tip: O.tip, body: O.body,
    diagram: { s: S(ex.s), marks: F.lookMarks(ex.s, ex.n, ex.best, th) },
    ramp: [
      { k: 'explain', s: S(ex.s), n: ex.n, seq: [[ex.best.from, mvTo(ex.best)]], marks: F.lookMarks(ex.s, ex.n, ex.best, th).concat([arrow(ex.best.from, mvTo(ex.best))]), t: O.ramp[0].t, body: O.ramp[0].body, ev: ex.ev, why: ex.why },
      { k: 'try', s: S(tr.s), n: tr.n, ok: [[tr.best.from, mvTo(tr.best)]], marks: [], look: F.lookMarks(tr.s, tr.n, tr.best, th), t: O.ramp[1] ? O.ramp[1].t : O.ramp[0].t, h: O.hints[0], g: fillMsg(tr.why[0], tr.why[1]), y: OLD.ui.rampRetry, ev: tr.ev, why: tr.why, ng: tr.ng },
    ],
    problems: probs.map((q, i) => moveProblem(q, id + '-' + i)),
    hints: O.hints,
  };
}

// ---- 選択問題
const W = F.W16, frac = m => m + '/16';
const ngoNum = (opts, ans, conv) => opts.map((o, i) => i === ans ? null : (conv(o) < conv(opts[ans]) ? ['c.lowNg', { x: o }] : ['c.highNg', { x: o }]));
function ngoRoll(opts, ans) { return opts.map((o, i) => { if (i === ans) return null; const v = [1, 2, 3, 4, 5].filter(k => frac(W[k]) === o); return v.length ? ['c.rollNg', { x: o, v: v.join(' / ') }] : ['c.roll8Ng', { x: o }]; }); }
function rollChoice(n) { const opts = ['1/16', '4/16', '6/16', '8/16'], ans = opts.indexOf(frac(W[n])); return { kind: 'choice', q: fillQ(T.Q.roll, { n }), opts, ans, why: ['c.roll', { n, m: W[n] }], ngo: ngoRoll(opts, ans) }; }
function againChoice() { const opts = ['3/16', '5/16', '6/16', '8/16'], ans = 2; return { kind: 'choice', q: T.Q.again, opts, ans, why: ['c.again', {}], ngo: ngoNum(opts, ans, o => parseInt(o, 10)) }; }
// 印の駒（p）の後ろ ds マスに相手の駒。deco：ほかの駒（印の駒の隣・相手の届く所に置かない）
function riskChoice(ds, p, deco) {
  const a = [p].concat(deco.me), b = ds.map(d => p - d).concat(deco.op);
  while (a.length < 5) a.push(31); while (b.length < 5) b.push(31);
  const s = { rule: 'std', pos: [a, b], turn: 0, winner: -1 }, bd = E.board(s);
  if (new Set(a.concat(b).filter(x => x < 31)).size !== a.concat(b).filter(x => x < 31).length || bd[p - 1] === 0 || bd[p + 1] === 0) throw new Error('riskChoice deco');
  const m = Math.round(E.hitRisk(s, 0)[0] * 16), want = ds.reduce((x, d) => x + W[d], 0);
  if (m !== want) throw new Error('risk mismatch ' + ds + ' ' + m + ' ' + want);
  const cand = [m, m + 2, Math.max(1, m - 2), m + 4, Math.max(1, m - 3), m + 1].filter((x, i, A) => A.indexOf(x) === i && x > 0 && x <= 16).slice(0, 4).sort((x, y) => x - y);
  const list = ds.slice().sort((x, y) => x - y).map(d => `${d}（${frac(W[d])}）`).join(' + ');
  const opts = cand.map(frac), ans = cand.indexOf(m), sp = S(s);
  used.push(Object.assign(S(s), { n: 0 }));
  return { kind: 'choice', s: sp, marks: [Object.assign(F.sq(p), { type: 'danger' })].concat(ds.map(d => Object.assign(F.sq(p - d), { type: 'text', text: String(d), color: '#ffe27a' }))),
    q: T.Q.risk, opts, ans, why: ['c.risk', { list, m }], ngo: ngoNum(opts, ans, o => parseInt(o, 10)) };
}
const okPos = s => { const all = s.pos[0].concat(s.pos[1]).filter(x => x < 31); return new Set(all).size === all.length && !all.includes(27); };
function numOpts(m, r, spreads) { const c = [m]; while (c.length < 4) { const d = spreads[Math.floor(r() * spreads.length)] * (r() < .5 ? -1 : 1), v = m + d; if (v > 0 && !c.includes(v)) c.push(v); } return c.sort((x, y) => x - y); }
function randRace(r, nOn) { const mk = k => { const a = []; for (let i = 0; i < 5; i++) a.push(i < k ? 16 + Math.floor(r() * 15) : 31); return a.sort((x, y) => y - x); }; return { rule: 'std', pos: [mk(nOn), mk(nOn)], turn: 0 }; }
function pipsChoice(seed, nOn, rival) {
  const r = E.mulberry32(seed);
  for (let t = 0; t < 10000; t++) {
    const s = randRace(r, nOn); if (!okPos(s) || !far(s, 0)) continue;
    const side = rival ? 1 : 0, m = F.pipsOf(s.pos[side]);
    const opts = numOpts(m, r, [2, 3, 5, 7]).map(String), ans = opts.indexOf(String(m));
    used.push(Object.assign(S(s), { n: 0 }));
    const nums = s.pos[side].filter(x => x < 31).map(x => Object.assign(F.sq(x), { type: 'text', text: String(31 - x), color: rival ? '#ffb0a0' : '#ffe27a' }));
    return { kind: 'choice', s: S(s), marks: nums, q: rival ? T.Q.rpips : T.Q.pips, opts, ans, why: [rival ? 'c.rpips' : 'c.pips', { m }], ngo: ngoNum(opts, ans, o => +o) };
  }
  throw new Error('pipsChoice');
}
function leadChoice(seed, nOn) {
  const r = E.mulberry32(seed);
  for (let t = 0; t < 10000; t++) {
    const s = randRace(r, nOn); if (!okPos(s) || !far(s, 0)) continue;
    const a = F.pipsOf(s.pos[0]), b = F.pipsOf(s.pos[1]), d = b - a;
    if (Math.abs(d) < 2 || Math.abs(d) > 12) continue;
    const ad = Math.abs(d), d2 = r() < .5 ? ad + 2 : ad - 2 > 0 ? ad - 2 : ad + 2, me = d > 0 ? 0 : 1;
    const raw = [[me, ad], [me, d2], [1 - me, ad], [1 - me, d2]].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const opts = raw.map(([w, v]) => { const o = {}; for (const l of LANGS) o[l] = (w === 0 ? T.Q.you : T.Q.rival)[l] + ' +' + v; return o; });
    const ans = raw.findIndex(([w, v]) => w === me && v === ad);
    const ngo = raw.map(([w, v], i) => i === ans ? null : w !== me ? ['c.sideNg', { a, b }] : ['c.' + (v < ad ? 'low' : 'high') + 'Ng', { x: '+' + v }]);
    used.push(Object.assign(S(s), { n: 0 }));
    return { kind: 'choice', s: S(s), marks: [], q: T.Q.lead2, opts, ans, why: [me === 0 ? 'c.lead2y' : 'c.lead2r', { a, b, d: ad }], ngo };
  }
  throw new Error('leadChoice');
}

function main() {
  const steps = [];
  // 作り直し済み（v2）のレッスンはそのまま残す（2回目以降：残りのレッスンだけ作る）。その局面は⑤の比較に入れる
  const KEEP = new Map(OLD.steps.filter(x => x.v2).map(x => [x.id, x]));
  for (const L of KEEP.values()) for (const q of [L.diagram, ...L.ramp, ...L.problems]) if (q && q.s) used.push(Object.assign(S(q.s), { n: q.n || 0 }));
  if (KEEP.has('prob')) steps.push(KEEP.get('prob')); else {   // 1. 投げ棒の確率（選択）
    const O = OLD.steps.find(x => x.id === 'prob');
    const ex = riskChoice([2], 12, { me: [29, 22], op: [24, 30] });
    const probs = [rollChoice(3), rollChoice(5), againChoice(), riskChoice([3], 20, { me: [15, 28], op: [11, 26] }), riskChoice([1, 2], 18, { me: [12, 29, 25], op: [22] })];
    steps.push({ id: 'prob', cat: 'basic', rule: 'std', title: O.title, tip: O.tip, body: O.body, diagram: { s: ex.s, marks: ex.marks },
      ramp: [{ k: 'explain', s: ex.s, n: null, seq: [], marks: ex.marks, t: O.ramp[0].t, body: O.ramp[0].body },
        { k: 'try', kind: 'choice', opts: ['1', '2', '3', '4', '5'], ans: 1, t: T.PROBT, h: O.hints[0], g: fillMsg('c.roll', { n: 2, m: 6 }), y: OLD.ui.rampRetry }],
      problems: probs, hints: O.hints });
  }
  // 作り直せないレッスン（基準を満たす局面がプールに足りない）は前の版をそのまま残し、v2 の印をつけない（3D の一覧に出さない・検証は「未」）。
  // 前の版の理由文は 'o.' のキーに移す（新しい文言と値の形がちがうため）。
  const keep = id => { const O = JSON.parse(JSON.stringify(OLD.steps.find(x => x.id === id))); delete O.v2; const re = r => { if (!r || r[0].startsWith('o.')) return r; const k = 'o.' + r[0]; MSG[k] = (OLD.msg[r[0]] || OLD.msg[k]); return [k, r[1]]; };
    for (const q of [...O.problems, ...O.ramp]) { if (q.why) q.why = re(q.why); if (q.ng) for (const f in q.ng) q.ng[f] = re(q.ng[f]); } return O; };
  const tryLesson = (id, th) => { if (KEEP.has(id)) return KEEP.get(id); try { return Object.assign(moveLesson(id, th), { v2: true }); } catch (e) { console.error('keep old', id, e.message); return keep(id); } };
  // 作る順：上がり（exit）を水の家（water）より先に。どちらも「26 の駒と出目1」の局面を取り合い、上がりの候補のほうが少ない（⑤）。並びは元の順に戻す
  const mid = {}; for (const id of ['swap', 'pair', 'escape', 'safe', 'beauty', 'exit', 'water']) mid[id] = tryLesson(id, id);
  for (const id of ['swap', 'pair', 'escape', 'safe', 'beauty', 'water', 'exit']) steps.push(mid[id]);
  steps[0].v2 = true;
  if (KEEP.has('race')) steps.push(KEEP.get('race')); else {   // 9. レースの数え方（選択5問：自分 → 相手 → リード、数える駒が増える順）
    const R = T.RACE, pc = pipsChoice(3, 2, false), pt = pipsChoice(4, 2, false);
    const probs = [pipsChoice(11, 3, false), pipsChoice(12, 3, true), leadChoice(13, 3), pipsChoice(14, 5, false), leadChoice(15, 5)];
    steps.push({ id: 'race', cat: 'end', rule: 'std', title: R.title, tip: R.tip, body: R.body, diagram: { s: pc.s, marks: pc.marks },
      ramp: [{ k: 'explain', s: pc.s, n: null, seq: [], marks: pc.marks, t: R.exT, body: R.exB },
        { k: 'try', kind: 'choice', s: pt.s, marks: pt.marks, opts: pt.opts, ans: pt.ans, t: R.tryT, h: R.h1, g: fillMsg('c.pips', { m: pt.opts[pt.ans] }), y: OLD.ui.rampRetry }],
      problems: probs, hints: [R.h1, R.h2], v2: true });
  }
  const data = { version: 2, rule: 'std', exact: 'senet/tools/senet_exact.c（到達できる全局面の厳密な勝率）', score: OLD.score, ui: OLD.ui, msg: MSG, cats: OLD.cats, steps };
  fs.writeFileSync(FILE, JSON.stringify(data));
  console.log('wrote', FILE, steps.map(s => s.id + '(' + s.problems.map(q => q.kind === 'move' ? q.gap.toFixed(2) + '/' + q.ev.length : 'c').join(',') + ')').join(' '));
}
(process.env.SENET_POOL && fs.existsSync(process.env.SENET_POOL) ? Promise.resolve(JSON.parse(fs.readFileSync(process.env.SENET_POOL, 'utf8'))) : (process.env.SENET_RAND ? poolRand(+process.env.SENET_RAND) : pool()).then(p => { if (process.env.SENET_POOL) fs.writeFileSync(process.env.SENET_POOL, JSON.stringify(p.map(q => ({ s: q.s, n: q.n, ev: q.ev })))); return p; })).then(p => { P = p; console.error('pool', P.length); main(); });
