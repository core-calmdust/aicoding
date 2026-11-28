/* ハーツ — study tools (hearts/study.js)
   Tabs: パス研究 (every candidate pass of a hand, played out by simulation) · 失点期待値 (a deeper look at your current play) ·
   ムーン判定 (the chance this hand takes every point card) · 確率表 (how the unseen cards of a suit split: exact counting) · 得点表. */
(function () {
'use strict';
const A = window.HtApp, HT = window.HT, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
const TABS = ['pass', 'ev', 'moon', 'odds', 'points'];
let tab = 'pass', job = 0;
const R = {};   // results by tab
function open(k) { tab = k || (A.S && A.S.phase === 'play' && A.S.turn === 0 ? 'ev' : 'pass'); for (const x in R) delete R[x]; render(); A.openOv('#studyOverlay'); }
function render() {
  $('#studyTabs').innerHTML = TABS.map(k => `<button type="button" data-t="${k}" class="${k === tab ? 'sel' : ''}">${esc(t('sd.t.' + k))}</button>`).join('');
  document.querySelectorAll('#studyTabs [data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
  const body = $('#studyBody');
  body.innerHTML = `<p class="sd-lead">${A.gl(t('sd.d.' + tab))}</p>` + (tab === 'pass' ? passTab() : tab === 'ev' ? evTab() : tab === 'moon' ? moonTab() : tab === 'odds' ? oddsTab() : pointsTab());
  body.querySelectorAll('[data-run]').forEach(b => b.onclick = () => run(b.dataset.run));
}
// which 13 cards to study: the hand being passed now, or the last hand's dealt cards
function passSource() {
  const S = A.S;
  if (S && S.phase === 'pass' && S.dir) return { S, now: 1 };
  const r = A.D.rev[A.D.rev.length - 1];
  if (r && r.dir) { const T = HT.newHand(r.R, r.start.map(h => h.slice()), r.dir, r.no); return { S: T, now: 0, mine: r.pass[0] }; }
  return null;
}
function run(k) {
  const my = ++job;
  if (k === 'pass') { const P = passSource(); if (!P) return; R.pass = 'busy'; render(); A.think('passEval', P.S, 0, 0, { k: 12, worlds: 90, mine: P.mine || (A.U.psel.size === 3 ? [...A.U.psel] : null) }).then(r => { if (my !== job) return; R.pass = r || []; render(); }); }
  if (k === 'ev') { R.ev = 'busy'; render(); A.think('eval', A.S, 0, 0, { worlds: 300, ms: 4000 }).then(r => { if (my !== job) return; R.ev = r; render(); }); }
  if (k === 'moon') { R.moon = 'busy'; render(); A.think('moon', A.S, 0, 0, { worlds: 400 }).then(r => { if (my !== job) return; R.moon = r; render(); }); }
}
const busy = () => `<p class="muted ck-busy">${esc(t('ck.calc'))}</p>`;
function passTab() {
  const P = passSource();
  if (!P) return `<p class="muted">${esc(t('sd.passNone'))}</p>`;
  let h = `<div class="sd-hand"><small>${esc(P.now ? t('sd.passNow', { d: A.dirName(P.S.dir) }) : t('sd.passLast', { n: P.S.no, d: A.dirName(P.S.dir) }))}</small><span class="mc-row">${HT.sortDisp(P.S.hands[0]).map(c => Cards.mini(c)).join('')}</span></div>`;
  if (!R.pass) return h + `<button type="button" class="abtn go" data-run="pass">${esc(t('sd.run'))}</button>`;
  if (R.pass === 'busy') return h + busy();
  const L = R.pass.slice().sort((a, b) => a.obj - b.obj), lo = L[0].own, hi = Math.max(...L.map(x => x.own)), mk = P.mine ? P.mine.slice().sort().join() : '';
  h += `<div class="sd-tbl"><div class="sd-th"><span>${esc(t('sd.passCol'))}</span><span>${A.gl(t('g.ev.n'))}</span><span>${esc(t('sd.moonCol'))}</span></div>` + L.map((x, i) => `<div class="sd-tr${i === 0 ? ' best' : ''}${x.cards.slice().sort().join() === mk ? ' mine' : ''}"><span class="evl">${x.cards.map(c => Cards.mini(c)).join('')}</span><span class="sd-bar"><span class="evb"><i style="width:${(8 + (hi > lo ? (x.own - lo) / (hi - lo) : 0) * 92).toFixed(1)}%"></i></span><b>${A.fmt(x.own)}</b></span><span class="sd-moon">${Math.round((x.moon || 0) * 100)}%</span></div>`).join('') + `</div><p class="diff-desc">${A.gl(t('sd.passHelp', { n: L[0].n }))}</p>`;
  return h;
}
function evTab() {
  const S = A.S;
  if (!S || S.phase !== 'play' || S.turn !== 0) return `<p class="muted">${esc(t('sd.evNone'))}</p>`;
  if (!R.ev) return `<button type="button" class="abtn go" data-run="ev">${esc(t('sd.run'))}</button>`;
  if (R.ev === 'busy') return busy();
  const L = R.ev.list.slice().sort((a, b) => a.obj - b.obj);
  return `<div class="sd-tbl"><div class="sd-th"><span>${esc(t('sd.card'))}</span><span>${A.gl(t('g.ev.n'))} ± </span><span>${esc(t('sd.moonCol2'))}</span></div>` + L.map((x, i) => `<div class="sd-tr${i === 0 ? ' best' : ''}"><span class="evl">${Cards.mini(x.c)}</span><span class="sd-bar"><b>${A.fmt(x.own, 2)}</b><small>± ${A.fmt(1.96 * x.sd / Math.sqrt(Math.max(1, x.n)), 2)}</small></span><span class="sd-moon">${Math.round(x.moonOther * 100)}%</span></div>`).join('') + `</div><p class="diff-desc">${A.gl(t('sd.evHelp', { n: R.ev.worlds }))}</p>`;
}
function moonTab() {
  const S = A.S;
  if (!S || S.phase !== 'play') return `<p class="muted">${esc(t('sd.moonNone'))}</p>`;
  const sg = A.AI.moonSigns(S.hands[0]);
  let h = `<div class="sd-hand"><small>${esc(t('r.ui.hand'))}</small><span class="mc-row">${HT.sortDisp(S.hands[0]).map(c => Cards.mini(c)).join('')}</span></div>`;
  h += `<div class="sd-signs">${[['sd.sg.top', sg.top.reduce((a, b) => a + b, 0)], ['sd.sg.hiH', sg.hiH], ['sd.sg.long', sg.long], ['sd.sg.qs', sg.qs ? '✓' : '—']].map(([k, v]) => `<div><small>${esc(t(k))}</small><b>${v}</b></div>`).join('')}</div>`;
  if (!A.AI.canShoot(S, 0)) return h + `<p>${esc(t('sd.moonGone'))}</p>`;
  if (R.moon == null) return h + `<button type="button" class="abtn go" data-run="moon">${esc(t('sd.run'))}</button>`;
  if (R.moon === 'busy') return h + busy();
  return h + `<div class="sd-big"><b>${Math.round(R.moon * 100)}%</b><span>${esc(t('sd.moonRes'))}</span></div><p class="diff-desc">${A.gl(t('sd.moonHelp'))}</p>`;
}
// exact split probabilities of the n unseen cards of a suit among three 13-card hands (39 unknown cards)
function C(n, k) { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
function oddsTab() {
  const rows = [];
  for (let k = 0; k <= 9; k++) {
    const n = 13 - k, tot = C(39, n); let vAny = 0, vLeft = 0; const splits = {};
    for (let a = 0; a <= Math.min(13, n); a++) for (let b = 0; b <= Math.min(13, n - a); b++) { const c = n - a - b; if (c > 13) continue; const p = C(13, a) * C(13, b) * C(13, c) / tot; if (a === 0 || b === 0 || c === 0) vAny += p; if (a === 0) vLeft += p; const key = [a, b, c].sort((x, y) => y - x).join('-'); splits[key] = (splits[key] || 0) + p; }
    const top = Object.entries(splits).sort((x, y) => y[1] - x[1])[0];
    rows.push(`<tr><td>${k}</td><td>${n}</td><td>${(vAny * 100).toFixed(1)}%</td><td>${(vLeft * 100).toFixed(1)}%</td><td>${top[0]} <small>${(top[1] * 100).toFixed(0)}%</small></td></tr>`);
  }
  return `<table class="st-tbl sd-odds"><tr><th>${esc(t('sd.o.k'))}</th><th>${esc(t('sd.o.n'))}</th><th>${esc(t('sd.o.any'))}</th><th>${esc(t('sd.o.left'))}</th><th>${esc(t('sd.o.split'))}</th></tr>${rows.join('')}</table><p class="diff-desc">${A.gl(t('sd.oddsHelp'))}</p>`;
}
function pointsTab() {
  const vs = ['std', 'omni', 'maria', 'spot'];
  const cell = (v, c) => { const p = HT.pts(c, HT.rules({ v })); return p ? (p > 0 ? p : `<span class="neg">${p}</span>`) : '·'; };
  const cards = [['♥2〜♥10', HT.card(3, 2)], ['♥J/Q/K', HT.card(3, 12)], ['♥A', HT.card(3, 14)], ['♠Q', HT.QS], ['♠K', HT.KS], ['♠A', HT.AS], ['♦J', HT.JD]];
  return `<table class="st-tbl sd-pts"><tr><th></th>${vs.map(v => `<th>${esc(t('var.' + v))}</th>`).join('')}</tr>${cards.map(([lab, c]) => `<tr><td>${lab}</td>${vs.map(v => `<td>${c === HT.card(3, 2) && v === 'spot' ? '2〜10' : c === HT.card(3, 12) && v === 'spot' ? '11/12/13' : cell(v, c)}</td>`).join('')}</tr>`).join('')}` +
    `<tr class="tot"><td>${esc(t('sd.total'))}</td>${vs.map(v => `<td>${HT.totalPen(HT.rules({ v }))}</td>`).join('')}</tr><tr><td>${esc(t('sd.end'))}</td>${vs.map(v => `<td>${HT.VARIANTS[v].target}</td>`).join('')}</tr></table><p class="diff-desc">${A.gl(t('sd.ptsHelp'))}</p>`;
}
$('#btnStudyClose').onclick = () => { job++; A.closeOv('#studyOverlay'); };
window.HtStudy = { open };
})();
