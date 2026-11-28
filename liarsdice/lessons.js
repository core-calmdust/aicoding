/* ライアーダイス — lessons (liarsdice/lessons.js)
   Four short lessons on thinking in odds: expected counts, adding your own dice, doubt or raise, switching to ones and calza.
   Each lesson: the idea (with dice), one worked example (not scored), then 5 problems made fresh every time — the answers are
   computed with engine.js (exact binomial odds), and every problem is checked to have exactly one right option
   (tools/check_lessons.js runs the generators many times). 4 of 5 to pass. Progress: 'aicoding-liarsdice-lessons'. */
(function (root) {
'use strict';
const browser = typeof document !== 'undefined';
const A = browser ? window.LdApp : null, LD = root.LD;
const STORE = 'aicoding-liarsdice-lessons';
let PR = {}; if (browser) try { PR = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) {}
const saveP = () => { try { localStorage.setItem(STORE, JSON.stringify(PR)); } catch (e) {} };
let rnd = Math.random;
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = a => a[Math.floor(rnd() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fmt = x => (Math.round(x * 10) / 10).toString();
const pc = x => Math.round(x * 100) + '%';
const hand = n => Array.from({ length: n }, () => ri(1, 6)).sort((a, b) => a - b);

/* ---------------- problem generators ----------------
   each returns { k: text key, v: values for the text, dice: [your dice] | null, bid: {q,f,p} | null, opts: [{ s: label } | { bid }],
   ans: index, e: explanation key, ev: values, num: the right number (for checks) } */
const GEN = {
  // expected matches among the dice you can't see
  expect() {
    const wild = rnd() < .7, U = pick(wild ? [6, 9, 12, 15, 18, 21, 24] : [6, 12, 18, 24, 30]), f = ri(2, 6);
    const ans = U * (wild ? 1 / 3 : 1 / 6);
    const cand = [ans, U / 6, U / 3, U / 2, U * 2 / 3, U / 4].map(x => Math.round(x * 10) / 10);
    const opts = [...new Set(cand)].filter(x => x !== Math.round(ans * 10) / 10);
    const o = shuffle([Math.round(ans * 10) / 10].concat(shuffle(opts).slice(0, 3)));
    return { k: wild ? 'q.expect.w' : 'q.expect', v: { u: U, f }, opts: o.map(x => ({ s: fmt(x) })), ans: o.indexOf(Math.round(ans * 10) / 10), e: wild ? 'e.expect.w' : 'e.expect', ev: { u: U, a: fmt(ans) }, num: ans };
  },
  // your own dice + the expected rest
  mine() {
    const wild = rnd() < .75, T = pick([15, 20, 25]), my = hand(5), f = ri(2, 6), U = T - 5;
    const m = LD.supportOf(my, f, wild), p = wild ? 1 / 3 : 1 / 6, ans = m + U * p;
    const wrong = [U * p, m + T * p, m + U * (wild ? 1 / 6 : 1 / 3), m + U * p + 1, T * p];
    const ra = Math.round(ans * 10) / 10, ws = [...new Set(wrong.map(x => Math.round(x * 10) / 10))].filter(x => x !== ra);
    const o = shuffle([ra].concat(shuffle(ws).slice(0, 3)));
    return { wild, hl: f, k: wild ? 'q.mine.w' : 'q.mine', v: { t: T, f }, dice: my, opts: o.map(x => ({ s: fmt(x) })), ans: o.indexOf(ra), e: wild ? 'e.mine.w' : 'e.mine', ev: { m, u: U, p: wild ? '1/3' : '1/6', e: fmt(U * p), a: fmt(ans) }, num: ans };
  },
  // the chance a bid holds: pick the option nearest to the exact value (options 20 points apart)
  chance() {
    for (let tries = 0; tries < 60; tries++) {
      const wild = rnd() < .8, T = pick([10, 15, 20, 25]), my = hand(5), f = ri(2, 6), U = T - 5, m = LD.supportOf(my, f, wild);
      const q = m + Math.round(U * (wild ? 1 / 3 : 1 / 6)) + ri(-2, 3);
      if (q < 1 || q > T) continue;
      const P = LD.pAtLeast(q, m, U, f, wild);
      const all = [10, 30, 50, 70, 90];                   // 5 buckets; keep the right one + 3 others
      const right = all.reduce((a, b) => Math.abs(b - P * 100) < Math.abs(a - P * 100) ? b : a);
      if (Math.abs(right - P * 100) > 4) continue;           // only clear cases (the next option is 16+ points away)
      const o = shuffle([right].concat(shuffle(all.filter(x => x !== right)).slice(0, 3)));
      return { wild, hl: f, k: wild ? 'q.chance.w' : 'q.chance', v: { t: T, q, f }, dice: my, bid: { q, f, p: 1 }, opts: o.map(x => ({ s: x + '%' })), ans: o.indexOf(right), e: 'e.chance', ev: { m, u: U, n: q - m, p: pc(P) }, num: P };
    }
    return null;
  },
  // doubt or raise: only positions where one answer is clearly better (the bid is very likely false and a raise is safe, or the other way round)
  judge() {
    for (let tries = 0; tries < 200; tries++) {
      const T = pick([10, 15, 20]), my = hand(5), U = T - 5, wild = true;
      const f = ri(2, 6), m = LD.supportOf(my, f, wild);
      const q = m + Math.round(U / 3) + ri(-1, 4);
      if (q < 2 || q > T) continue;
      const Pprev = LD.pAtLeast(q, m, U, f, wild);
      // your safest raise
      const ctx = { wild, raise: 'std', pal: false, lockFace: 0, prev: { q, f }, total: T, opening: false };
      let best = null;
      for (let g = 1; g <= 6; g++) { const mq = LD.minQ(ctx, g); if (mq > T) continue; const P = LD.pAtLeast(mq, LD.supportOf(my, g, wild), U, g, wild); if (!best || P > best.P) best = { q: mq, f: g, P }; }
      if (!best) continue;
      let ansK;
      if (Pprev < .25 && best.P < .5) ansK = 'dudo';
      else if (Pprev > .7 && best.P > .7) ansK = 'raise';
      else continue;
      const o = [{ s: 'act.dudo', key: true }, { bid: { q: best.q, f: best.f } }];
      return { wild: true, hl: f, k: 'q.judge', v: { t: T, q, f }, dice: my, bid: { q, f, p: 1 }, opts: o, ans: ansK === 'dudo' ? 0 : 1, e: ansK === 'dudo' ? 'e.judge.d' : 'e.judge.r', ev: { p: pc(Pprev), r: pc(best.P), q: best.q, f: best.f }, num: Pprev };
    }
    return null;
  },
  // switching to ones and back, and calza
  aces() {
    const k = pick(['to', 'to', 'from', 'calza']);
    if (k === 'to') {
      const q = ri(3, 11), f = ri(2, 6), ans = Math.ceil(q / 2);
      const o = shuffle([...new Set([ans, ans - 1, ans + 1, q, Math.floor(q / 2) === ans ? ans + 2 : Math.floor(q / 2)])].filter(x => x >= 1)).slice(0, 4);
      if (!o.includes(ans)) o[0] = ans;
      const oo = shuffle(o);
      return { k: 'q.toAce', v: { q, f }, bid: { q, f, p: 2 }, opts: oo.map(x => ({ bid: { q: x, f: 1 } })), ans: oo.indexOf(ans), e: 'e.toAce', ev: { q, a: ans }, num: ans };
    }
    if (k === 'from') {
      const q = ri(2, 6), f = ri(2, 6), ans = 2 * q + 1;
      const oo = shuffle([ans, 2 * q, q + 1, 2 * q + 2]);
      return { k: 'q.fromAce', v: { q, f }, bid: { q, f: 1, p: 2 }, opts: oo.map(x => ({ bid: { q: x, f } })), ans: oo.indexOf(ans), e: 'e.fromAce', ev: { q, a: ans }, num: ans };
    }
    for (let tries = 0; tries < 60; tries++) {
      const T = pick([10, 15, 20]), my = hand(5), f = ri(2, 6), U = T - 5, m = LD.supportOf(my, f, true);
      const q = m + Math.round(U / 3);
      const E = LD.pExact(q, m, U, f, true), P = LD.pAtLeast(q, m, U, f, true);
      const all = [5, 25, 50, 75], right = all.reduce((a, b) => Math.abs(b - E * 100) < Math.abs(a - E * 100) ? b : a);
      if (Math.abs(right - E * 100) > 6) continue;
      return { wild: true, hl: f, k: 'q.calza', v: { t: T, q, f }, dice: my, bid: { q, f, p: 1 }, opts: all.map(x => ({ s: x + '%' })), ans: all.indexOf(right), e: 'e.calza', ev: { e: pc(E), p: pc(P) }, num: E };
    }
    return null;
  },
};
const LESSONS = [
  { id: 'expect', gens: ['expect'], pic: [4, 1, 4] },
  { id: 'mine', gens: ['mine'], pic: [5, 5, 1] },
  { id: 'judge', gens: ['chance', 'judge', 'judge'], pic: [3, 3, 6] },
  { id: 'aces', gens: ['aces'], pic: [1, 1, 1] },
];
function make(id, n) {
  const L = LESSONS.find(x => x.id === id), out = [], seen = new Set();
  for (let k = 0; out.length < n && k < 200; k++) { const g = GEN[L.gens[k % L.gens.length]](); if (!g) continue; const key = JSON.stringify([g.k, g.v, g.dice]); if (seen.has(key)) continue; seen.add(key); out.push(g); }
  return out;
}

if (!browser) { root.LdLessonGen = { GEN, LESSONS, make, seed(f) { rnd = f; } }; return; }

/* ---------------- the dialog ---------------- */
const $ = s => document.querySelector(s), esc = s => A.esc(s), t = (k, v) => A.t(k, v);
let cur = null;
const progress = id => PR[id] || { best: 0, pass: false };
const picHtml = id => `<span class="lp-dice">${LESSONS.find(x => x.id === id).pic.map(f => Dice.img(f, 'lpd')).join('')}</span>`;
function listHtml() {
  const done = LESSONS.filter(x => progress(x.id).pass).length;
  const head = `<div class="lc-head"><span class="lc-ico lg"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.3"/><circle cx="15" cy="15" r="1.3"/><circle cx="12" cy="12" r="1.3"/></svg></span><div><b>${esc(t('cat.odds'))}</b><p>${esc(t('catd.odds'))}</p></div><div class="lc-prog"><small>${esc(t('lsn.passed', { n: done, m: LESSONS.length }))}</small><span class="bar"><i style="width:${done / LESSONS.length * 100}%"></i></span></div></div>`;
  const cards = LESSONS.map((L, i) => { const pr = progress(L.id);
    return `<button type="button" class="lc-card${pr.pass ? ' pass' : ''}" data-l="${L.id}"><span class="lc-pic ld-pic">${picHtml(L.id)}</span><span class="lc-txt"><span class="lc-top"><em>STEP ${i + 1}</em><small class="${pr.pass ? 'ok' : ''}">${esc(pr.pass ? t('lsn.pass') : pr.best ? t('lsn.best', { n: pr.best }) : t('lsn.new'))}</small></span><b>${esc(t('l.' + L.id))}</b><span class="lc-d">${esc(t('ld.' + L.id))}</span><span class="lc-tip">💡 ${esc(t('lt.' + L.id))}</span>` +
      `<span class="lc-meta"><span class="lc-pips" aria-label="${esc(t('lsn.best', { n: pr.best || 0 }))}">${[0, 1, 2, 3, 4].map(j => `<i class="${j < (pr.best || 0) ? 'on' : ''}${j === 3 ? ' pass' : ''}"></i>`).join('')}</span><small>${esc(t('lsn.fmt', { k: ideas(L.id).length }))}</small></span></span></button>`; }).join('');
  const tut = window.LdTut ? `<button type="button" class="lc-tut" id="lcTut"><span>▶</span><span><b>${esc(t('tu.entry'))}</b><small>${esc(t('tu.entry.d'))}</small></span><span class="go">›</span></button>` : '';
  return `<p class="lc-lead">${esc(t('lsn.lead'))}</p>${tut}${head}<div class="lc-grid">${cards}</div>`;
}
function open() { cur = null; renderShell(); A.openOv('#lessonOverlay'); }
function renderShell() {
  const M = $('#lessonModal');
  const tabs = `<div class="ng-tabs lt-top"><button type="button" data-top="rules">${esc(t('btn.rules'))}</button><button type="button" class="sel" data-top="lessons">${esc(t('btn.lesson'))}</button>${window.LdTut ? `<button type="button" data-top="tut">▶ ${esc(t('tu.tab'))}</button>` : ''}</div>`;
  M.innerHTML = tabs + (!cur ? `<div class="lc-body">${listHtml()}</div><div class="modal-actions"><button class="mbtn go" id="lcClose">${esc(t('close'))}</button></div>` : playHtml());
  M.querySelectorAll('[data-top]').forEach(b => b.onclick = () => { if (b.dataset.top === 'rules') window.LdRules && LdRules.open(); else if (b.dataset.top === 'tut' && window.LdTut) { A.closeOv('#lessonOverlay'); LdTut.start(); } });
  if (!cur) { M.querySelectorAll('[data-l]').forEach(b => b.onclick = () => start(b.dataset.l)); const tb = $('#lcTut'); if (tb) tb.onclick = () => { A.closeOv('#lessonOverlay'); LdTut.start(); }; $('#lcClose').onclick = () => A.closeOv('#lessonOverlay'); }
  else wirePlay();
}
// steps: 0..k-1 = the idea pages, k = the worked example, then the 5 problems
function start(id) {
  const qs = make(id, 6);
  cur = { id, page: 0, ex: qs[0], qs: qs.slice(1, 6), i: -1, score: 0, chosen: null, exChosen: null };
  renderShell();
}
const ideas = id => String(t('lx.' + id)).split('\n\n');
function qHtml(q, ch, example) {
  const dice = q.dice ? `<div class="lq-hand"><small>${esc(t('calc.yours'))}</small>${q.dice.map(d => Dice.img(d, 'lqd' + (q.hl && (d === q.hl || (q.wild && d === 1 && q.hl !== 1)) ? ' m' : ''))).join('')}</div>` : '';
  const bid = q.bid ? `<div class="lq-bid"><small>${esc(t('r.ui.bidBy', { n: A.nameOf(q.bid.p) }))}</small>${A.bidHtml(q.bid, 'bl')}</div>` : '';
  const lab = o => o.bid ? A.bidHtml(o.bid) : o.key ? `<b class="ckact dudo">${esc(t(o.s))}</b>` : `<b>${esc(o.s)}</b>`;
  return `<div class="lq-q">${example ? `<span class="lq-ex">${esc(t('lsn.example'))}</span>` : ''}<p class="lq-qt">${esc(t(q.k, q.v))}</p><div class="lq-vis">${dice}${bid}</div><div class="lq-opts ld">${q.opts.map((o, k) => `<button type="button" class="lq-o${ch != null ? (k === q.ans ? ' right' : k === ch ? ' wrong' : ' off') : ''}" data-o="${k}"${ch != null ? ' disabled' : ''}>${lab(o)}</button>`).join('')}</div>` +
    (ch != null ? `<div class="lq-exp ${ch === q.ans ? 'ok' : 'ng'}"><b>${esc(t(ch === q.ans ? 'lsn.right' : 'lsn.wrong'))}</b><p>${esc(t(q.e, q.ev))}</p></div>` : '') + `</div>`;
}

/* the figures of the idea pages */
const hid = (n, lit) => `<span class="lf-hid">${Array.from({ length: n }, (_, i) => lit && lit[i] ? `<span class="lf-d on">${Dice.img(lit[i], 'lfi')}</span>` : `<span class="lf-d"></span>`).join('')}</span>`;
const bars = (n, p, q, mine) => { const d = LD.binDist(n, p), mx = Math.max(...d); return `<span class="lf-bars">${d.map((x, k) => `<i class="${k + (mine || 0) >= q ? 'ok' : ''}" style="height:${(x / mx * 100).toFixed(1)}%"><small>${k + (mine || 0)}</small></i>`).join('')}</span>`; };
const eq = s => `<span class="lf-eq">${s}</span>`;
const bid = (q, f) => A.bidHtml({ q, f }, 'bl');
function fig(id, page) {
  const L = [];
  if (id === 'expect') {
    if (page === 0) { const lit = []; [2, 8, 15].forEach(i => { lit[i] = 4; }); return hid(18, lit) + eq('18 × 1/6 = 3'); }
    if (page === 1) { const lit = []; [2, 8, 15].forEach(i => { lit[i] = 4; }); [5, 11, 13].forEach(i => { lit[i] = 1; }); return hid(18, lit) + eq('18 × 1/3 = 6'); }
    return bars(18, 1 / 3, 99) + eq(t('lf.mean', { e: 6 }));
  }
  if (id === 'mine') {
    if (page === 0) return `<span class="lf-hand">${[1, 2, 5, 5, 6].map(d => Dice.img(d, 'lfh' + (d === 5 || d === 1 ? ' m' : ''))).join('')}</span>` + eq('5 → 3');
    return `<span class="lf-hand">${[1, 2, 5, 5, 6].map(d => Dice.img(d, 'lfh' + (d === 5 || d === 1 ? ' m' : ''))).join('')}</span>` + hid(15) + eq('3 + 15 × 1/3 = 8');
  }
  if (id === 'judge') {
    if (page === 0) return bars(15, 1 / 3, 5, 0) + eq(t('lf.atleast', { q: 5, p: Math.round(LD.pAtLeast(5, 0, 15, 4, true) * 100) + '%' }));
    if (page === 1) return `<span class="lf-cmp"><span><small>${esc(t('act.dudo'))}</small><b class="lo">${esc(t('lf.lose', { p: '70%' }))}</b></span><span><small>${esc(t('act.bid'))}</small><b class="hi">${esc(t('lf.lose', { p: '20%' }))}</b></span></span>`;
    return `<span class="lf-calc">${Dice.img(4, 'lfh')}<b>%</b></span>`;
  }
  if (page === 0) return `<span class="lf-arrow">${bid(7, 4)}<i>→</i>${bid(4, 1)}</span>` + eq('7 ÷ 2 → 4');
  if (page === 1) return `<span class="lf-arrow">${bid(3, 1)}<i>→</i>${bid(7, 5)}</span>` + eq('3 × 2 + 1 = 7');
  return `<span class="lf-cmp"><span><small>${esc(t('lf.exact', { q: 5 }))}</small><b>${Math.round(LD.pExact(5, 0, 15, 4, true) * 100)}%</b></span><span><small>${esc(t('lf.atleastS', { q: 5 }))}</small><b>${Math.round(LD.pAtLeast(5, 0, 15, 4, true) * 100)}%</b></span></span>`;
}
function playHtml() {
  const id = cur.id, n = LESSONS.findIndex(x => x.id === id) + 1, P = ideas(id), k = P.length;
  const dots = `<span class="lq-dots">${cur.qs.map((q, j) => `<i class="${j < cur.i ? (q.ok ? 'ok' : 'ng') : j === cur.i ? 'cur' : ''}"></i>`).join('')}</span>`;
  let main, foot;
  if (cur.page < k) {
    main = `<div class="lq-intro ld"><div class="lf">${fig(id, cur.page)}</div><div><span class="lq-step">${esc(t('lsn.prep', { i: cur.page + 1, n: k + 1 }))}</span><p>${esc(P[cur.page])}</p>${cur.page === k - 1 ? `<p class="lq-tip">💡 ${esc(t('lt.' + id))}</p>` : ''}</div></div>`;
    foot = `<button class="mbtn" id="lqList">${esc(t('lsn.backList'))}</button><button class="mbtn go" id="lqGo">${esc(t('lsn.nextP'))}</button>`;
  } else if (cur.page === k) {
    main = qHtml(cur.ex, cur.exChosen, true);   // where you are: the flow line at the foot
    foot = `<button class="mbtn" id="lqList">${esc(t('lsn.backList'))}</button><button class="mbtn go" id="lqGo"${cur.exChosen == null ? ' disabled' : ''}>${esc(t('lsn.startQ'))}</button>`;
  } else if (cur.i >= cur.qs.length) {
    const pass = cur.score >= 4;
    const lab = o => o.bid ? A.bidHtml(o.bid, 'sm') : o.key ? `<b class="ckact dudo">${esc(t(o.s))}</b>` : `<b>${esc(o.s)}</b>`;
    const rows = cur.qs.map((q, j) => `<li class="${q.ok ? 'ok' : 'ng'}"><i>${q.ok ? '✓' : '✕'}</i><span class="lr-qt">${esc(t(q.k, q.v))}${q.dice || q.bid ? `<span class="lr-vis">${q.dice ? q.dice.map(d => Dice.img(d, 'lrd' + (q.hl && (d === q.hl || (q.wild && d === 1 && q.hl !== 1)) ? ' m' : ''))).join('') : ''}${q.bid ? A.bidHtml(q.bid, 'sm') : ''}</span>` : ''}</span><span class="lr-a">${q.ok ? '' : `<small>${esc(t('lsn.yours'))}</small>${lab(q.opts[q.ch])}`}<small>${esc(t('lsn.ans'))}</small>${lab(q.opts[q.ans])}</span></li>`).join('');
    main = `<div class="lq-end"><div class="lq-score ${pass ? 'ok' : ''}">${cur.score} / 5</div><b>${esc(t(pass ? 'lsn.endPass' : 'lsn.endFail'))}</b><p>${esc(t(pass ? 'lsn.endPassD' : 'lsn.endFailD'))}</p></div>` +
      `<div class="lq-res"><b class="lq-res-h">${esc(t('lsn.qres'))}</b><ol>${rows}</ol></div>`;
    foot = `<button class="mbtn" id="lqList">${esc(t('lsn.backLesson'))}</button><button class="mbtn" id="lqRetry">${esc(t('lsn.retry'))}</button><button class="mbtn go" id="lqNext">${esc(t('lsn.nextLesson'))}</button>`;
  } else {
    main = qHtml(cur.qs[cur.i], cur.chosen, false);
    foot = `<button class="mbtn" id="lqList">${esc(t('lsn.backList'))}</button><button class="mbtn go" id="lqGo"${cur.chosen == null ? ' disabled' : ''}>${esc(cur.i === cur.qs.length - 1 ? t('lsn.finish') : t('lsn.nextQ'))}</button>`;
  }
  main += flowHtml(k);
  const skip = cur.page < k ? `<button type="button" class="sbtn lq-skip" id="lqSkip">${esc(t('lsn.skip'))}</button>` : '';
  return `<div class="lq"><div class="lq-head"><em>STEP ${n}</em><b>${esc(t('l.' + id))}</b>${cur.page > k ? dots : skip}</div><div class="lq-main">${main}</div><div class="modal-actions">${foot}</div><div class="lq-quit"><button type="button" class="sbtn" id="lqX">${esc(t('lsn.quit'))}</button></div></div>`;
}
// where you are: idea pages → example → 5 problems → result
function flowHtml(k) {
  const at = cur.page < k ? 'prep' : cur.page === k ? 'ex' : cur.i >= cur.qs.length ? 'end' : 'q';
  const seg = (id, lab, pips) => `<span class="lqf-s${at === id ? ' cur' : ''}"><b>${esc(lab)}</b>${pips ? `<span class="lqf-p">${pips}</span>` : ''}</span>`;
  const prep = Array.from({ length: k }, (_, j) => `<i class="${cur.page > j ? 'done' : cur.page === j ? 'cur' : ''}"></i>`).join('');
  const qs = cur.qs.map((q, j) => `<i class="${cur.page > k && (j < cur.i || cur.i >= cur.qs.length) ? (q.ok ? 'ok' : 'ng') : cur.page > k && j === cur.i ? 'cur' : ''}"></i>`).join('');
  return `<div class="lq-flow">${seg('prep', t('lsn.flowPrep'), prep)}<em>›</em>${seg('ex', t('lsn.flowEx'), `<i class="${cur.page > k ? 'done' : cur.page === k ? 'cur' : ''}"></i>`)}<em>›</em>${seg('q', t('lsn.flowQ'), qs)}<em>›</em>${seg('end', t('lsn.flowEnd'), '')}<small>${esc(t('lsn.pass4'))}</small></div>`;
}
function wirePlay() {
  const M = $('#lessonModal'), k = ideas(cur.id).length;
  const toList = () => { const id = cur.id; cur = null; renderShell(); const el = M.querySelector(`[data-l="${id}"]`); if (el) el.scrollIntoView({ block: 'nearest' }); };
  $('#lqX').onclick = toList; const li = $('#lqList'); if (li) li.onclick = toList;
  const sk = $('#lqSkip'); if (sk) sk.onclick = () => { cur.page = k + 1; cur.i = 0; renderShell(); };
  M.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
    if (cur.page === k) { if (cur.exChosen != null) return; cur.exChosen = +b.dataset.o; A.sfx(cur.exChosen === cur.ex.ans ? 'ok' : 'ng'); renderShell(); return; }
    if (cur.chosen != null) return; const q = cur.qs[cur.i]; cur.chosen = +b.dataset.o; q.ch = cur.chosen; q.ok = cur.chosen === q.ans; if (q.ok) cur.score++;
    A.sfx(q.ok ? 'ok' : 'ng'); renderShell();
  });
  const go = $('#lqGo'); if (go) go.onclick = () => {
    if (cur.page < k) { cur.page++; renderShell(); return; }
    if (cur.page === k) { cur.page++; cur.i = 0; renderShell(); return; }
    cur.chosen = null; cur.i++;
    if (cur.i >= cur.qs.length) { const pr = progress(cur.id); PR[cur.id] = { best: Math.max(pr.best || 0, cur.score), pass: pr.pass || cur.score >= 4 }; saveP(); if (cur.score >= 4) A.sfx('win'); }
    renderShell();
  };
  const rt = $('#lqRetry'); if (rt) rt.onclick = () => start(cur.id);
  const nx = $('#lqNext'); if (nx) nx.onclick = () => { const i = LESSONS.findIndex(x => x.id === cur.id); start(LESSONS[(i + 1) % LESSONS.length].id); };
}
document.addEventListener('keydown', e => {
  if (!$('#lessonOverlay').classList.contains('show') || !cur) return;
  const answering = cur.page === ideas(cur.id).length ? cur.exChosen == null : cur.page > ideas(cur.id).length && cur.i < cur.qs.length && cur.chosen == null;
  if (answering && /^[1-4]$/.test(e.key)) { const b = document.querySelector(`#lessonModal [data-o="${+e.key - 1}"]`); if (b) b.click(); }
  else if ((e.key === 'Enter' || e.key === 'ArrowRight') && $('#lqGo') && !$('#lqGo').disabled) { e.preventDefault(); $('#lqGo').click(); }
});
window.LdLessons = { open, GEN, LESSONS, make, count: () => LESSONS.length, passed: () => LESSONS.filter(x => progress(x.id).pass).length };
})(typeof window !== 'undefined' ? window : globalThis);
