/* ブラックジャック — lessons (blackjack/lessons.js)
   4 categories · 16 lessons. Each lesson = a short explanation + 5 problems made fresh every time from the rules engine
   (the strategy lessons ask the basic strategy computed for the rules of your table; concept lessons draw from written questions),
   4 of 5 to pass. Progress: localStorage 'aicoding-blackjack-lessons'. The dialog has the common tabs ルール → レッスン. */
(function () {
'use strict';
const A = window.BJApp, B = window.BJ, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
const STORE = 'aicoding-blackjack-lessons';
let PR = {}; try { PR = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) {}
const saveP = () => { try { localStorage.setItem(STORE, JSON.stringify(PR)); } catch (e) {} };
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const card = () => Math.floor(Math.random() * 52);
const ofVal = v => { const r = v === 10 ? pick([10, 11, 12, 13]) : v; return Math.floor(Math.random() * 4) * 13 + r - 1; };
const mini = cs => `<span class="mc-row">${cs.map(c => `<span class="mc s${B.SUIT(c)}">${B.RCH[B.RANK(c)]}<small>${'♠♥♦♣'[B.SUIT(c)]}</small></span>`).join('')}</span>`;
const vsHtml = (p, up) => `<div class="lq-hands"><div><small>${esc(t('r.ui.you'))}</small>${mini(p)}</div><div><small>${esc(t('r.ui.dealer'))}</small>${mini([up])}<span class="mc dn"></span></div></div>`;
const one = cs => `<div class="lq-hands one"><div>${mini(cs)}</div></div>`;
const R = () => (A.T && A.T.R) || B.rulesOf('classic', {});
const fromPool = id => { const P = t('lq.' + id); const q = pick(Array.isArray(P) ? P : []); if (!q) return null; const o = q.o.map((x, i) => [x, i]); shuffle(o); return { q: esc(q.q), opts: o.map(x => x[0]), ans: o.findIndex(x => x[1] === q.a), exp: q.x }; };
const totStr = cs => { const V = B.hv(cs); return V.soft && V.t < 21 ? (V.t - 10) + '/' + V.t : String(V.t); };
const numOpts = (ans, spread) => { const s = new Set([ans]); let k = 0; while (s.size < 4 && k++ < 50) { const d = pick(spread); if (ans + d >= 0) s.add(ans + d); } return shuffle([...s]); };
// a strategy problem: the move of the chart for a hand of a kind
function stratQ(kind) {
  const Rr = R(); let cards, x;
  if (kind === 'h') { x = pick([8, 9, 10, 11, 12, 12, 13, 14, 15, 16, 16]); const hc = B.hardCards(x); cards = [ofVal(B.VAL(hc[0])), ofVal(B.VAL(hc[1]))]; }
  else if (kind === 's') { x = pick([2, 3, 4, 5, 6, 7, 7, 8]); cards = [ofVal(1), ofVal(x)]; }
  else { x = pick([2, 3, 4, 6, 7, 8, 9, 9, 10, 1, 5]); cards = [ofVal(x), ofVal(x)]; }
  const upI = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), up = ofVal(upI === 11 ? 1 : upI);
  const code = B.chartCell(Rr, kind, x, upI), ans = code[0] === 'D' ? 'D' : code[0] === 'R' ? 'R' : code;
  const keys = kind === 'p' ? ['P', 'H', 'S', 'D'] : ['H', 'S', 'D'].concat(Rr.surr ? ['R'] : []);
  if (!keys.includes(ans)) keys.push(ans);
  const fall = code === 'Ds' ? t('e.fallS') : code === 'D' ? t('e.fallH') : code === 'Rs' ? t('e.fallRS') : code[0] === 'R' ? t('e.fallRH') : '';
  return { q: t('q.strat'), vis: vsHtml(cards, up), opts: keys.map(A.mName), ans: keys.indexOf(ans), exp: t('e.strat', { h: totStr(cards), u: upI === 11 ? 'A' : upI, m: A.mName(ans) }) + (fall ? ' ' + fall : '') };
}

/* ---------------- problem generators ---------------- */
const G = {
  value() {
    const n = pick([2, 2, 3, 3, 4]); let cs; for (let k = 0; k < 50; k++) { cs = Array.from({ length: n }, card); if (B.hv(cs).t <= 21) break; }
    const V = B.hv(cs), ans = V.t;
    const opts = numOpts(ans, [-10, -2, -1, 1, 2, 10]).map(String);
    return { q: t('q.value'), vis: one(cs), opts, ans: opts.indexOf(String(ans)), exp: t(V.soft ? 'e.valueSoft' : 'e.value', { n: V.t, h: V.h }) };
  },
  soft() {
    let cs; for (let k = 0; k < 80; k++) { cs = Array.from({ length: pick([2, 3]) }, card); const V = B.hv(cs); if (V.t <= 21 && V.a === (Math.random() < .7)) break; }
    const V = B.hv(cs), soft = V.soft;
    return { q: t('q.soft'), vis: one(cs), opts: [t('o.soft'), t('o.hard')], ans: soft ? 0 : 1, exp: t(soft ? 'e.soft' : V.a ? 'e.hardA' : 'e.hard', { n: V.t, h: V.h }) };
  },
  pay() {
    const kind = pick(['bj', 'bj', 'win', 'push', 'surr', 'dbl', 'ins']), bet = pick([100, 200, 50]), r = R();
    const net = kind === 'bj' ? bet * r.bj : kind === 'win' ? bet : kind === 'push' ? 0 : kind === 'surr' ? -bet / 2 : kind === 'dbl' ? bet * 2 : bet;
    const others = shuffle([...new Set([bet, bet * 1.5, bet * 2, 0, -bet / 2, bet * 1.2, -bet, bet * 3])].filter(x => x !== net)).slice(0, 3);
    const lab = x => (x > 0 ? '+' : x < 0 ? '−' : '±') + '$' + Math.abs(x);
    const opts = shuffle([net].concat(others)).map(lab);
    return { q: t('q.pay.' + kind, { b: '$' + bet }), vis: '', opts, ans: opts.indexOf(lab(net)), exp: t('e.pay.' + kind, { b: '$' + bet, n: lab(net), r: r.bj === 1.2 ? '6:5' : '3:2' }) };
  },
  dealer() {
    const r = R(); let cs; for (let k = 0; k < 80; k++) { cs = Array.from({ length: pick([2, 2, 3]) }, card); const V = B.hv(cs); if (V.t <= 21 && V.t >= 12 && !(cs.length === 2 && V.t === 21)) break; }
    const V = B.hv(cs), hit = B.dealerHits(cs, r);
    return { q: t('q.dealer', { s: r.h17 ? 'H17' : 'S17' }), vis: one(cs), opts: [t('o.dhit'), t('o.dstand')], ans: hit ? 0 : 1, exp: t(V.soft && V.t === 17 ? (r.h17 ? 'e.dS17h' : 'e.dS17s') : hit ? 'e.dhit' : 'e.dstand', { n: V.t }) };
  },
  hard() { return stratQ('h'); },
  softs() { return stratQ('s'); },
  pairs() { return stratQ('p'); },
  stiff() {
    const Rr = R(), x = pick([12, 13, 14, 15, 16]), hc = B.hardCards(x), cards = [ofVal(B.VAL(hc[0])), ofVal(B.VAL(hc[1]))], upI = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), up = ofVal(upI === 11 ? 1 : upI);
    const code = B.chartCell(Rr, 'h', x, upI), ans = code === 'S' || code === 'Rs' ? 'S' : 'H';
    return { q: t('q.stiff'), vis: vsHtml(cards, up), opts: [A.mName('H'), A.mName('S')], ans: ans === 'H' ? 0 : 1, exp: t(upI <= 6 ? 'e.stiffWeak' : 'e.stiffStrong', { h: x, u: upI === 11 ? 'A' : upI, m: A.mName(ans) }) + (code[0] === 'R' ? ' ' + t('e.stiffR') : '') };
  },
  insurance() { return fromPool('insurance'); },
  sidebets() {
    const kind = pick(['pp', 't3']);
    if (kind === 'pp') {
      let a, b, r; const want = pick(['perfect', 'colored', 'mixed', null]);
      for (let k = 0; k < 300; k++) { a = card(); b = Math.random() < .7 ? (Math.floor(Math.random() * 4) * 13 + B.RANK(a) - 1) : card(); if (a === b) continue; r = B.perfectPairs(a, b); if ((r ? r.k : null) === want) break; }
      r = B.perfectPairs(a, b); const ks = ['perfect', 'colored', 'mixed', 'none'];
      return { q: t('q.pp'), vis: one([a, b]), opts: ks.map(k => t('sk.' + k) + (k === 'none' ? '' : ' (' + { perfect: 25, colored: 12, mixed: 6 }[k] + ':1)')), ans: ks.indexOf(r ? r.k : 'none'), exp: t('e.pp.' + (r ? r.k : 'none')) };
    }
    let cs, r; const want = pick(['flush', 'straight', 'trips', null, null]);
    for (let k = 0; k < 600; k++) { cs = [card(), card(), card()]; r = B.twentyOne3(cs[0], cs[1], cs[2]); if ((r ? r.k : null) === want) break; }
    r = B.twentyOne3(cs[0], cs[1], cs[2]); const ks = ['flush', 'straight', 'trips', 'none'], ans = r ? (['sflush'].includes(r.k) ? 'straight' : r.k === 'strips' ? 'trips' : r.k) : 'none';
    return { q: t('q.t3'), vis: `<div class="lq-hands"><div><small>${esc(t('r.ui.you'))}</small>${mini(cs.slice(0, 2))}</div><div><small>${esc(t('r.ui.dealer'))}</small>${mini([cs[2]])}</div></div>`, opts: ks.map(k => t('sk.' + k)), ans: ks.indexOf(ans), exp: t('e.t3.' + ans) };
  },
  variants() { return fromPool('variants'); },
  edge() { return fromPool('edge'); },
  hilo() {
    const c = card(), v = B.HILO(c), opts = ['+1', '0', '−1'];
    return { q: t('q.hilo'), vis: one([c]), opts, ans: v > 0 ? 0 : v === 0 ? 1 : 2, exp: t('e.hilo.' + (v > 0 ? 'p' : v === 0 ? 'z' : 'm')) };
  },
  running() {
    const n = pick([5, 6, 7, 8]), cs = Array.from({ length: n }, card), rc = cs.reduce((a, c) => a + B.HILO(c), 0);
    const opts = numOpts(rc, [-2, -1, 1, 2, 3]).map(x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x));
    const lab = (rc > 0 ? '+' : rc < 0 ? '−' : '') + Math.abs(rc);
    return { q: t('q.running'), vis: one(cs), opts, ans: opts.indexOf(lab), exp: t('e.running', { s: cs.map(c => (B.HILO(c) > 0 ? '+1' : B.HILO(c) < 0 ? '−1' : '0')).join(' '), n: lab }) };
  },
  truec() {
    const dl = pick([1, 2, 3, 4, 5]), tc = pick([-2, -1, 1, 2, 3, 4]), rc = tc * dl;
    const opts = numOpts(tc, [-2, -1, 1, 2]).map(x => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x)), lab = (tc > 0 ? '+' : tc < 0 ? '−' : '') + Math.abs(tc);
    return { q: t('q.truec', { r: (rc > 0 ? '+' : rc < 0 ? '−' : '') + Math.abs(rc), d: dl }), vis: '', opts, ans: opts.indexOf(lab), exp: t('e.truec', { r: (rc > 0 ? '+' : rc < 0 ? '−' : '') + Math.abs(rc), d: dl, n: lab }) };
  },
  bankroll() { return fromPool('bankroll'); },
};
const CATS_L = [
  { id: 'basic', ico: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="10" height="14" rx="2"/><rect x="10" y="3" width="10" height="14" rx="2" transform="rotate(12 15 10)"/></svg>', items: ['value', 'soft', 'pay', 'dealer'] },
  { id: 'strategy', ico: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/></svg>', items: ['hard', 'stiff', 'softs', 'pairs'] },
  { id: 'extra', ico: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/></svg>', items: ['insurance', 'sidebets', 'variants', 'edge'] },
  { id: 'count', ico: '<svg viewBox="0 0 24 24"><path d="M4 7h4M6 5v4M15 7h5M4 17h5M15 15l4 4M19 15l-4 4"/></svg>', items: ['hilo', 'running', 'truec', 'bankroll'] },
];
const ALL = []; CATS_L.forEach(c => c.items.forEach(id => ALL.push({ id, cat: c.id })));
const PIC = { value: 'KH 7S', soft: 'AS 6D', pay: 'AH KC', dealer: 'TS 6H', hard: '9C 7D', stiff: '8S 5H', softs: 'AD 7C', pairs: '8H 8S', insurance: 'AS', sidebets: '7D 7H', variants: '6C 7C 8C', edge: '', hilo: '5S TD', running: '2H 9C KS', truec: '', bankroll: '' };
const parse = s => s.split(' ').map(B.parse);
function picHtml(id) {
  if (PIC[id]) return mini(parse(PIC[id]));
  return `<span class="lc-num">${{ edge: '0.5%', truec: 'TC', bankroll: '2%' }[id]}</span>`;
}
let cat = 'basic', cur = null;
const progress = id => PR[id] || { best: 0, pass: false };
function listHtml() {
  const c = CATS_L.find(x => x.id === cat), passed = id => progress(id).pass;
  const tabs = CATS_L.map(x => `<button type="button" class="lc-tab${x.id === cat ? ' sel' : ''}" data-cat="${x.id}"><span class="lc-ico">${x.ico}</span><b>${esc(t('cat.' + x.id))}</b><small>${x.items.filter(passed).length}/${x.items.length}</small></button>`).join('');
  const done = c.items.filter(passed).length;
  const head = `<div class="lc-head"><span class="lc-ico lg">${c.ico}</span><div><b>${esc(t('cat.' + c.id))}</b><p>${esc(t('catd.' + c.id))}</p></div><div class="lc-prog"><small>${esc(t('lsn.passed', { n: done, m: c.items.length }))}</small><span class="bar"><i style="width:${done / c.items.length * 100}%"></i></span></div></div>`;
  const cards = c.items.map(id => { const pr = progress(id), n = ALL.findIndex(x => x.id === id) + 1;
    return `<button type="button" class="lc-card${pr.pass ? ' pass' : ''}" data-l="${id}"><span class="lc-pic bc-pic">${picHtml(id)}</span><span class="lc-txt"><span class="lc-top"><em>STEP ${n}</em><small class="${pr.pass ? 'ok' : ''}">${esc(pr.pass ? t('lsn.pass') : pr.best ? t('lsn.tried', { n: pr.best }) : t('lsn.new'))}</small></span><b>${esc(t('l.' + id))}</b><i>${esc(t('lp.' + id))}</i><span class="lc-d">${esc(t('ld.' + id))}</span><span class="bar"><i style="width:${(pr.best || 0) / 5 * 100}%"></i></span></span></button>`; }).join('');
  return `<p class="lc-lead">${esc(t('lsn.lead'))}</p><div class="lc-tabs">${tabs}</div>${head}<div class="lc-grid">${cards}</div>`;
}
function open(o) { cur = null; if (o && o.cat) cat = o.cat; renderShell(); A.openOv('#lessonOverlay'); }
function renderShell() {
  const M = $('#lessonModal');
  const tabs = `<div class="ng-tabs lt-top"><button type="button" data-top="rules">${esc(t('btn.rules'))}</button><button type="button" class="sel" data-top="lessons">${esc(t('btn.lesson'))}</button></div>`;
  const body = !cur ? `<div class="lc-body">${listHtml()}</div><div class="modal-actions"><button class="mbtn go" id="lcClose">${esc(t('close'))}</button></div>` : playHtml();
  M.innerHTML = tabs + body;
  M.querySelectorAll('[data-top]').forEach(b => b.onclick = () => { if (b.dataset.top === 'rules') window.BJRules && BJRules.open(); });
  if (!cur) {
    M.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cat = b.dataset.cat; renderShell(); });
    M.querySelectorAll('[data-l]').forEach(b => b.onclick = () => start(b.dataset.l));
    $('#lcClose').onclick = () => A.closeOv('#lessonOverlay');
  } else wirePlay();
}
function start(id) {
  const qs = [], seen = new Set();
  for (let k = 0; qs.length < 5 && k < 60; k++) { const q = G[id](); if (!q) continue; const key = q.q + '|' + q.vis + '|' + q.opts.join(); if (seen.has(key) && k < 40) continue; seen.add(key);
    if (q.ans == null) q.ans = q.opts.indexOf(q.ansV); if (q.ans < 0) continue; qs.push(q); }
  cur = { id, step: -1, qs, i: 0, score: 0, chosen: null };
  renderShell();
}
function playHtml() {
  const id = cur.id, n = ALL.findIndex(x => x.id === id) + 1;
  const dots = `<span class="lq-dots">${cur.qs.map((q, k) => `<i class="${k < cur.i ? (q.ok ? 'ok' : 'ng') : k === cur.i && cur.step >= 0 ? 'cur' : ''}"></i>`).join('')}</span>`;
  let main;
  if (cur.step === -1) main = `<div class="lq-intro"><span class="lc-pic lg bc-pic">${picHtml(id)}</span><div>${String(t('x.' + id)).split('\n').map(p => `<p>${esc(p)}</p>`).join('')}<p class="lq-tip">💡 ${esc(t('ltip.' + id))}</p></div></div>`;
  else if (cur.i >= cur.qs.length) { const pass = cur.score >= 4; main = `<div class="lq-end"><div class="lq-score ${pass ? 'ok' : ''}">${cur.score} / 5</div><b>${esc(t(pass ? 'lsn.endPass' : 'lsn.endFail'))}</b><p>${esc(t(pass ? 'lsn.endPassD' : 'lsn.endFailD'))}</p></div>`; }
  else {
    const q = cur.qs[cur.i], ch = cur.chosen;
    main = `<div class="lq-q"><p class="lq-qt">${q.q}</p>${q.vis || ''}<div class="lq-opts">${q.opts.map((o, k) => `<button type="button" class="lq-o${ch != null ? (k === q.ans ? ' right' : k === ch ? ' wrong' : ' off') : ''}" data-o="${k}"${ch != null ? ' disabled' : ''}>${esc(o)}</button>`).join('')}</div>` +
      (ch != null ? `<div class="lq-exp ${ch === q.ans ? 'ok' : 'ng'}"><b>${esc(t(ch === q.ans ? 'lsn.right' : 'lsn.wrong'))}</b><p>${esc(q.exp)}</p></div>` : '') + `</div>`;
  }
  const foot = cur.step === -1 ? `<button class="mbtn" id="lqList">${esc(t('lsn.backList'))}</button><button class="mbtn go" id="lqGo">${esc(t('lsn.startQ'))}</button>`
    : cur.i >= cur.qs.length ? `<button class="mbtn" id="lqList">${esc(t('lsn.backLesson'))}</button><button class="mbtn" id="lqRetry">${esc(t('lsn.retry'))}</button><button class="mbtn go" id="lqNext">${esc(t('lsn.nextLesson'))}</button>`
    : `<button class="mbtn" id="lqList">${esc(t('lsn.backList'))}</button><button class="mbtn go" id="lqGo"${cur.chosen == null ? ' disabled' : ''}>${esc(cur.i === cur.qs.length - 1 ? t('lsn.finish') : t('lsn.nextQ'))}</button>`;
  return `<div class="lq"><div class="lq-head"><em>STEP ${n}</em><b>${esc(t('l.' + id))}</b>${cur.step >= 0 ? dots : ''}<button class="lq-x" id="lqX" aria-label="×">×</button></div><div class="lq-main">${main}</div><div class="modal-actions">${foot}</div></div>`;
}
function wirePlay() {
  const M = $('#lessonModal');
  const toList = () => { const id = cur.id; cur = null; cat = ALL.find(x => x.id === id).cat; renderShell(); const el = M.querySelector(`[data-l="${id}"]`); if (el) el.scrollIntoView({ block: 'nearest' }); };
  $('#lqX').onclick = toList; const li = $('#lqList'); if (li) li.onclick = toList;
  M.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
    if (cur.chosen != null) return; const q = cur.qs[cur.i]; cur.chosen = +b.dataset.o; q.ok = cur.chosen === q.ans; if (q.ok) cur.score++;
    A.sfx(q.ok ? 'ok' : 'ng'); renderShell();
  });
  const go = $('#lqGo'); if (go) go.onclick = () => {
    if (cur.step === -1) { cur.step = 0; renderShell(); return; }
    cur.chosen = null; cur.i++;
    if (cur.i >= cur.qs.length) { const pr = progress(cur.id); PR[cur.id] = { best: Math.max(pr.best || 0, cur.score), pass: pr.pass || cur.score >= 4 }; saveP(); if (cur.score >= 4) A.sfx('win'); }
    renderShell();
  };
  const rt = $('#lqRetry'); if (rt) rt.onclick = () => start(cur.id);
  const nx = $('#lqNext'); if (nx) nx.onclick = () => { const i = ALL.findIndex(x => x.id === cur.id); const n = ALL[(i + 1) % ALL.length]; cat = n.cat; start(n.id); };
}
document.addEventListener('keydown', e => {
  if (!$('#lessonOverlay').classList.contains('show') || !cur) return;
  if (cur.step >= 0 && cur.i < cur.qs.length && cur.chosen == null && /^[1-4]$/.test(e.key)) { const b = document.querySelector(`#lessonModal [data-o="${+e.key - 1}"]`); if (b) b.click(); }
  else if ((e.key === 'Enter' || e.key === 'ArrowRight') && $('#lqGo') && !$('#lqGo').disabled) $('#lqGo').click();
});
$('#btnLesson').onclick = () => open();
window.BJLessons = { open, G, count: () => ALL.length, passed: () => ALL.filter(x => progress(x.id).pass).length };
})();
