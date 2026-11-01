/* バカラ — lessons (baccarat/lessons.js)
   4 categories · 16 lessons. Each lesson = a short explanation + 5 problems made fresh every time from the rules engine
   (concept lessons draw from a pool of written questions), 4 of 5 to pass. Progress: localStorage 'aicoding-baccarat-lessons'.
   The dialog has the common tabs ルール → レッスン. */
(function () {
'use strict';
const A = window.BacApp, B = window.BC, RD = window.BCRoads, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
const STORE = 'aicoding-baccarat-lessons';
let PR = {}; try { PR = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) {}
const saveP = () => { try { localStorage.setItem(STORE, JSON.stringify(PR)); } catch (e) {} };
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const card = () => Math.floor(Math.random() * 52);
const mini = cs => `<span class="mc-row">${cs.map(c => `<span class="mc s${B.SUIT(c)}">${B.RCH[B.RANK(c)]}<small>${'♠♥♦♣'[B.SUIT(c)]}</small></span>`).join('')}</span>`;
const hands = (p, b) => `<div class="lq-hands"><div><small>${esc(t('side.P'))}</small>${mini(p)}</div><div><small>${esc(t('side.B'))}</small>${mini(b)}</div></div>`;
// a hand with a given 2-card total and no natural unless asked
function handOf(total) { for (let k = 0; k < 500; k++) { const h = [card(), card()]; if (B.total(h) === total) return h; } return [card(), card()]; }
const numOpts = (ans, spread) => { const s = new Set([ans]); while (s.size < 4) { const d = pick(spread); if (ans + d >= 0) s.add(ans + d); } return shuffle([...s]); };
const fromPool = id => { const P = t('lq.' + id); const q = pick(Array.isArray(P) ? P : []); if (!q) return null; const o = q.o.map((x, i) => [x, i]); shuffle(o); return { q: esc(q.q), opts: o.map(x => x[0]), ans: o.findIndex(x => x[1] === q.a), exp: q.x }; };
// a full coup for the "who wins" problems
function coup() { const d = []; for (let i = 0; i < 6; i++) d.push(card()); let i = 0; return B.coup(() => d[i++]); }
function randRes(n) { const out = []; for (let i = 0; i < n; i++) { const r = Math.random(); out.push({ w: r < .4586 ? 'B' : r < .9048 ? 'P' : 'T' }); } return out; }

/* ---------------- problem generators ---------------- */
const G = {
  value() {
    const n = Math.random() < .5 ? 2 : 3, cs = Array.from({ length: n }, card), s = cs.reduce((a, c) => a + B.VAL(c), 0), tot = s % 10;
    return { q: t('q.value'), vis: `<div class="lq-hands one"><div>${mini(cs)}</div></div>`, opts: shuffle([...new Set([tot, (tot + 1) % 10, (tot + 9) % 10, s > 9 ? s : (tot + 5) % 10])].slice(0, 4)).map(String), ans: null, ansV: String(tot), exp: t('e.value', { s, n: tot }) };
  },
  natural() {
    const want = pick(['P', 'B', 'T', 'go', 'go']);
    let p, b;
    for (let k = 0; k < 800; k++) { p = [card(), card()]; b = [card(), card()]; const pt = B.total(p), bt = B.total(b), nat = pt >= 8 || bt >= 8;
      const kind = !nat ? 'go' : pt > bt ? 'P' : bt > pt ? 'B' : 'T'; if (kind === want) break; }
    const pt = B.total(p), bt = B.total(b), nat = pt >= 8 || bt >= 8, kind = !nat ? 'go' : pt > bt ? 'P' : bt > pt ? 'B' : 'T';
    const keys = ['P', 'B', 'T', 'go'];
    return { q: t('q.natural'), vis: hands(p, b), opts: keys.map(k => t('o.nat.' + k)), ans: keys.indexOf(kind), exp: t('e.natural.' + kind, { p: pt, b: bt }) };
  },
  pdraw() {
    const pt = pick([0, 1, 2, 3, 4, 5, 5, 6, 6, 7, 7]), bt = pick([0, 1, 2, 3, 4, 5, 6, 7]);
    const p = handOf(pt), b = handOf(bt), d = B.playerDraws(pt);
    return { q: t('q.pdraw'), vis: hands(p, b), opts: [t('tl.draw'), t('tl.stand')], ans: d ? 0 : 1, exp: t(d ? 'e.pdraw.y' : 'e.pdraw.n', { n: pt }) };
  },
  bdraw() {
    const bt = pick([3, 3, 4, 4, 5, 5, 6, 6, 2, 7]), stood = Math.random() < .2, p3 = stood ? null : Math.floor(Math.random() * 10);
    const pt = stood ? pick([6, 7]) : pick([0, 1, 2, 3, 4, 5]);
    const p = handOf(pt), b = handOf(bt); if (!stood) { let c; do { c = card(); } while (B.VAL(c) !== p3); p.push(c); }
    const d = B.bankerDraws(bt, p3);
    return { q: t('q.bdraw'), vis: hands(p, b), opts: [t('tl.draw'), t('tl.stand')], ans: d ? 0 : 1, exp: (stood ? t('e.bdrawS', { n: bt }) : t('e.bdraw', { n: bt, p: p3 }) + ' ' + t('ex.rule.' + Math.min(bt, 7))) + ' → ' + t(d ? 'tl.draw' : 'tl.stand') };
  },
  winner() {
    const c = coup(), keys = ['P', 'B', 'T'];
    return { q: t('q.winner'), vis: hands(c.p, c.b), opts: keys.map(k => t('rd.' + k)), ans: keys.indexOf(c.win), exp: t('e.winner', { p: c.pt, b: c.bt }) };
  },
  payout() {
    const k = pick(['P', 'B', 'B', 'T', 'PP']), amt = pick([100, 200, 500, 1000]);
    const ret = k === 'P' ? amt * 2 : k === 'B' ? amt * 1.95 : k === 'T' ? amt * 9 : amt * 12;
    const opts = shuffle([...new Set([ret, amt * 2, amt * 1.95, amt * 9, amt * 12, amt * 1.5].filter(x => x !== ret).slice(0, 3).concat([ret]))]);
    return { q: t('q.payout', { b: t('spot.' + k), n: A.fmt(amt) }), vis: '', opts: opts.map(x => A.fmt(x)), ans: opts.indexOf(ret), exp: t('e.payout.' + k, { n: A.fmt(amt), r: A.fmt(ret) }) };
  },
  edge() {
    if (Math.random() < .5) return fromPool('edge');
    const v = pick(['classic', 'classic', 'nocomm']), base = A.baseOdds(v, 8, 8).E, keys = ['B', 'P', 'T', 'PP'];
    const best = keys.reduce((a, k) => base[k] > base[a] ? k : a, 'B');
    return { q: t('q.edge', { v: A.vName(v) }), vis: '', opts: keys.map(k => t('spot.' + k)), ans: keys.indexOf(best), exp: t('e.edge.' + v, { b: A.pct(-base.B), p: A.pct(-base.P) }) };
  },
  tie() { return fromPool('tie'); },
  variants() { return fromPool('variants'); },
  bead() {
    const res = randRes(12 + Math.floor(Math.random() * 12)), L = { B: t('rd.B'), P: t('rd.P'), T: t('rd.T') };
    const w = pick(['B', 'P', 'T']), n = res.filter(r => r.w === w).length;
    const opts = numOpts(n, [-3, -2, -1, 1, 2, 3]);
    return { q: t('q.bead', { w: L[w] }), vis: `<div class="lq-road">${RD.beadSvg(res, Math.max(4, Math.ceil(res.length / 6)), L)}</div>`, opts: opts.map(String), ans: opts.indexOf(n), exp: t('e.bead', { w: L[w], n }) };
  },
  bigroad() {
    const res = randRes(10 + Math.floor(Math.random() * 8)).filter(r => r.w !== 'T'), RB = RD.build(res), last = res[res.length - 1].w;
    const nxt = pick(['B', 'P']), same = nxt === last;
    const keys = ['down', 'right'];
    return { q: t('q.bigroad', { w: t('rd.' + nxt) }), vis: `<div class="lq-road">${RD.bigSvg(RB.big, 14, 'big', 0)}</div>`, opts: keys.map(k => t('o.road.' + k)), ans: same ? 0 : 1, exp: t(same ? 'e.road.down' : 'e.road.right', { w: t('rd.' + last) }) };
  },
  derived() {
    let res, RB, sym;
    for (let k = 0; k < 50; k++) { res = randRes(12 + Math.floor(Math.random() * 6)).filter(r => r.w !== 'T'); RB = RD.build(res.slice(0, -1)); const nx = res[res.length - 1].w; sym = RB.ask[nx][0]; if (sym) { RB.nx = nx; break; } }
    const keys = ['R', 'U'];
    return { q: t('q.derived', { w: t('rd.' + RB.nx) }), vis: `<div class="lq-road">${RD.bigSvg(RB.big, 14, 'big', 0)}</div>`, opts: keys.map(k => t('o.col.' + k)), ans: keys.indexOf(sym), exp: t('e.derived.' + sym) };
  },
  meaning() { return fromPool('meaning'); },
  indep() { return fromPool('indep'); },
  system() {
    if (Math.random() < .4) return fromPool('system');
    const base = pick([25, 50, 100]), L = 1 + Math.floor(Math.random() * 5), ans = base * Math.pow(2, L);
    const opts = shuffle([...new Set([ans, base * (L + 1), ans / 2, ans * 2])]);
    return { q: t('q.martin', { b: A.fmt(base), n: L }), vis: '', opts: opts.map(x => A.fmt(x)), ans: opts.indexOf(ans), exp: t('e.martin', { b: A.fmt(base), n: L, a: A.fmt(ans), s: A.fmt(base * (Math.pow(2, L) - 1)) }) };
  },
  loss() {
    const k = pick(['B', 'P', 'T']), amt = pick([100, 200, 500]), n = pick([100, 200, 300]), e = -A.baseOdds('classic', 8, 8).E[k], ans = Math.round(amt * n * e);
    const opts = shuffle([...new Set([ans, Math.round(ans / 2), ans * 2, Math.round(amt * n * .05)])]).slice(0, 4); if (!opts.includes(ans)) opts[0] = ans;
    return { q: t('q.loss', { b: t('spot.' + k), a: A.fmt(amt), n }), vis: '', opts: opts.map(x => A.fmt(x)), ans: opts.indexOf(ans), exp: t('e.loss', { w: A.fmt(amt * n), e: A.pct(e), r: A.fmt(ans) }) };
  },
  bankroll() { return fromPool('bankroll'); },
};
const CATS_L = [
  { id: 'basic', ico: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="10" height="14" rx="2"/><rect x="10" y="3" width="10" height="14" rx="2" transform="rotate(12 15 10)"/></svg>', items: ['value', 'natural', 'pdraw', 'bdraw', 'winner'] },
  { id: 'bets', ico: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/></svg>', items: ['payout', 'edge', 'tie', 'variants'] },
  { id: 'roads', ico: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="1.6"/><circle cx="8" cy="14" r="1.6"/><circle cx="13" cy="9" r="1.6"/><circle cx="17" cy="14" r="1.6"/></svg>', items: ['bead', 'bigroad', 'derived', 'meaning'] },
  { id: 'money', ico: '<svg viewBox="0 0 24 24"><path d="M3 17l5-6 4 3 5-7 4 4"/><path d="M3 21h18"/></svg>', items: ['indep', 'system', 'loss', 'bankroll'] },
];
const ALL = []; CATS_L.forEach(c => c.items.forEach(id => ALL.push({ id, cat: c.id })));
const PIC = { value: '7S 8H', natural: '4D 4C', pdraw: '3H 2S', bdraw: '5D KC 6S', winner: '9H KD', payout: 'AS 8D', edge: 'KH 6C', tie: '7C 7H', variants: '3D 4S KH', bead: '', bigroad: '', derived: '', meaning: '', indep: '', system: '', loss: '', bankroll: '' };
const SAMPLE = 'BBPPPBTBBPBPPPB'.split('').map(w => ({ w }));
function picHtml(id) {
  if (PIC[id]) return mini(PIC[id].split(' ').map(B.parse));
  const RB = RD.build(SAMPLE), L = { B: 'B', P: 'P', T: 'T' };
  if (id === 'bead') return RD.beadSvg(SAMPLE, 4, L);
  if (id === 'derived') return RD.bigSvg(RB.eye, 10, 'eye');
  if (id === 'bigroad' || id === 'meaning') return RD.bigSvg(RB.big, 8, 'big');
  return `<span class="lc-num">${{ indep: '45.9%', system: '×2', loss: '1.06%', bankroll: '5%' }[id]}</span>`;
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
  const tut = window.BacTut ? `<button type="button" class="lc-tut" id="lcTut"><span>▶</span><span><b>${esc(BacTut.L('entry'))}</b><small>${esc(BacTut.L('entry.d'))}</small></span><span class="go">›</span></button>` : '';
  return `<p class="lc-lead">${esc(t('lsn.lead'))}</p>${tut}<div class="lc-tabs">${tabs}</div>${head}<div class="lc-grid">${cards}</div>`;
}
function open(o) { cur = null; if (o && o.cat) cat = o.cat; renderShell(); A.openOv('#lessonOverlay'); }
function renderShell() {
  const M = $('#lessonModal');
  const tabs = `<div class="ng-tabs lt-top"><button type="button" data-top="rules">${esc(t('btn.rules'))}</button><button type="button" class="sel" data-top="lessons">${esc(t('btn.lesson'))}</button></div>`;
  const body = !cur ? `<div class="lc-body">${listHtml()}</div><div class="modal-actions"><button class="mbtn go" id="lcClose">${esc(t('close'))}</button></div>` : playHtml();
  M.innerHTML = tabs + body;
  M.querySelectorAll('[data-top]').forEach(b => b.onclick = () => { if (b.dataset.top === 'rules') window.BacRules && BacRules.open(); });
  if (!cur) {
    M.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cat = b.dataset.cat; renderShell(); });
    const tb = $('#lcTut'); if (tb) tb.onclick = () => { A.closeOv('#lessonOverlay'); BacTut.start(); };
    M.querySelectorAll('[data-l]').forEach(b => b.onclick = () => start(b.dataset.l));
    $('#lcClose').onclick = () => A.closeOv('#lessonOverlay');
  } else wirePlay();
}
function start(id) {
  const qs = [], seen = new Set();
  for (let k = 0; qs.length < 5 && k < 60; k++) { const q = G[id](); if (!q) continue; const key = q.q + '|' + q.vis + '|' + q.opts.join(); if (seen.has(key) && k < 40) continue; seen.add(key);
    if (q.ans == null) q.ans = q.opts.indexOf(q.ansV); qs.push(q); }
  cur = { id, step: -1, qs, i: 0, score: 0, chosen: null };
  renderShell();
}
function playHtml() {
  const id = cur.id, n = ALL.findIndex(x => x.id === id) + 1;
  const dots = `<span class="lq-dots">${cur.qs.map((q, k) => `<i class="${k < cur.i ? (q.ok ? 'ok' : 'ng') : k === cur.i && cur.step >= 0 ? 'cur' : ''}"></i>`).join('')}</span>`;
  let main;
  if (cur.step === -1) main = `<div class="lq-intro"><span class="lc-pic lg bc-pic">${picHtml(id)}</span><div>${String(t('x.' + id)).split('\n').map(p => `<p>${esc(p)}</p>`).join('')}<p class="lq-tip">💡 ${esc(t('tip.' + id))}</p></div></div>`;
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
window.BacLessons = { open, G, count: () => ALL.length, passed: () => ALL.filter(x => progress(x.id).pass).length };
})();
