/* ハーツ — lessons (hearts/lessons.js)
   5 categories · 13 lessons. Each lesson: the idea (with a worked example) → one practice problem (not scored) → 5 problems,
   4 right to pass. Problems come from lessons-gen.js (answers worked out from the board / an exact search / a checked pool).
   Hints in 3 steps (the way to think → what to look at → the answer; the answer counts as a miss).
   Progress: 'aicoding-hearts-lessons'. The dialog has the common tabs ルール → レッスン. */
(function () {
'use strict';
const A = window.HtApp, HT = window.HT, LG = window.HLG, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
const STORE = 'aicoding-hearts-lessons';
let PR = {}; try { PR = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) {}
const saveP = () => { try { localStorage.setItem(STORE, JSON.stringify(PR)); } catch (e) {} };
const NQ = 5, PASS = 4;
const CATS = [
  { id: 'basic', items: ['legal', 'winner', 'score'] },
  { id: 'defense', items: ['duck', 'discard', 'queen'] },
  { id: 'pass', items: ['passQ', 'passAK', 'passVoid'] },
  { id: 'read', items: ['count', 'end3'] },
  { id: 'moon', items: ['stopMoon', 'shoot'] },
];
const ALL = []; CATS.forEach(c => c.items.forEach(id => ALL.push({ id, cat: c.id })));
const ICO = {
  basic: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="10" height="14" rx="2"/><rect x="10" y="3" width="10" height="14" rx="2" transform="rotate(12 15 10)"/></svg>',
  defense: '<svg viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/></svg>',
  pass: '<svg viewBox="0 0 24 24"><path d="M4 12h13M13 7l5 5-5 5"/><rect x="2" y="4" width="5" height="7" rx="1"/></svg>',
  read: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m16 16 5 5"/><path d="M8.5 11h5"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
};
// a few cards for each lesson card in the list
const PIC = { legal: ['7D', '4D', 'KD'], winner: ['6C', 'KC', 'AH'], score: ['5H', 'QS', '9H'], duck: ['10H', '9H', 'QH'], discard: ['QS', 'KH'], queen: ['AS', 'QS'], passQ: ['QS', '3S', 'AD'], passAK: ['AS', 'KS', '4S'], passVoid: ['KC', '9C', '2C'], count: ['2H', '7H', 'JH', 'AH'], end3: ['3D', '8S', '5H'], stopMoon: ['AH', 'KH'], shoot: ['AH', 'QS', 'AC'] };
const C = s => { const su = 'CDSH'.indexOf(s.slice(-1)), r = s.slice(0, -1); return HT.card(su, r === 'A' ? 14 : r === 'K' ? 13 : r === 'Q' ? 12 : r === 'J' ? 11 : +r); };
const picHtml = id => `<span class="mc-row">${(PIC[id] || []).map(s => Cards.mini(C(s))).join('')}</span>`;
let cat = 'basic', cur = null;
const progress = id => PR[id] || { best: 0, pass: false };
const tx = a => a ? t(a[0], a[1] ? names(a[1]) : null) : '';
// {m}/{who}/{w} seat numbers → names
function names(v) { const N = A.NAMES(), o = Object.assign({}, v); for (const k of ['m', 'who']) if (typeof o[k] === 'number') o[k] = N[o[k]]; return o; }
function listHtml() {
  const c = CATS.find(x => x.id === cat), passed = id => progress(id).pass;
  const tabs = CATS.map(x => `<button type="button" class="lc-tab${x.id === cat ? ' sel' : ''}" data-cat="${x.id}"><span class="lc-ico">${ICO[x.id]}</span><b>${esc(t('cat.' + x.id))}</b><small>${x.items.filter(passed).length}/${x.items.length}</small></button>`).join('');
  const done = c.items.filter(passed).length;
  const head = `<div class="lc-head"><span class="lc-ico lg">${ICO[c.id]}</span><div><b>${esc(t('cat.' + c.id))}</b><p>${esc(t('catd.' + c.id))}</p></div><div class="lc-prog"><small>${esc(t('lsn.passed', { n: done, m: c.items.length }))}</small><span class="bar"><i style="width:${done / c.items.length * 100}%"></i></span></div></div>`;
  const cards = c.items.map(id => { const pr = progress(id), n = ALL.findIndex(x => x.id === id) + 1;
    return `<button type="button" class="lc-card${pr.pass ? ' pass' : ''}" data-l="${id}"><span class="lc-pic ht-pic">${picHtml(id)}</span><span class="lc-txt"><span class="lc-top"><em>STEP ${n}</em><small class="${pr.pass ? 'ok' : ''}">${esc(pr.pass ? t('lsn.pass') : pr.best ? t('lsn.best', { n: pr.best }) : t('lsn.new'))}</small></span><b>${esc(t('l.' + id))}</b><span class="lc-d">${esc(t('ld.' + id))}</span><span class="bar"><i style="width:${(pr.best || 0) / NQ * 100}%"></i></span></span></button>`; }).join('');
  return `<p class="lc-lead">${esc(t('lsn.lead'))}</p><div class="lc-tabs ht5">${tabs}</div>${head}<div class="lc-grid">${cards}</div>`;
}
function open(o) { cur = null; if (o && o.cat) cat = o.cat; renderShell(); A.openOv('#lessonOverlay'); }
function renderShell() {
  const M = $('#lessonModal');
  const tabs = `<div class="ng-tabs lt-top"><button type="button" data-top="rules">${esc(t('btn.rules'))}</button><button type="button" class="sel" data-top="lessons">${esc(t('btn.lesson'))}</button>${window.HtTut ? `<button type="button" class="lt-tut" data-tut="1">▶ ${esc(t('tu.entry'))}</button>` : ''}</div>`;
  const body = !cur ? `<div class="lc-body">${listHtml()}</div><div class="modal-actions"><button class="mbtn go" id="lcClose">${esc(t('close'))}</button></div>` : playHtml();
  M.innerHTML = tabs + body;
  M.querySelectorAll('[data-top]').forEach(b => b.onclick = () => { if (b.dataset.top === 'rules') window.HtRules && HtRules.open(); });
  const tb = M.querySelector('[data-tut]'); if (tb) tb.onclick = () => { A.closeOv('#lessonOverlay'); HtTut.start(); };
  if (!cur) {
    M.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cat = b.dataset.cat; renderShell(); });
    M.querySelectorAll('[data-l]').forEach(b => b.onclick = () => start(b.dataset.l));
    $('#lcClose').onclick = () => A.closeOv('#lessonOverlay');
  } else wirePlay();
}
function start(id) {
  const qs = LG.makeSet(id, NQ + 2);
  if (qs.length < NQ + 1) { A.toast(t('lsn.none')); return; }
  // the easiest one is the worked example, the next the practice, then 5 problems (easy → hard)
  const ex = qs.shift(), pr = qs.shift();
  cur = { id, phase: 'idea', ex, pr, qs: qs.slice(0, NQ), i: 0, score: 0, chosen: null, hint: 0 };
  renderShell();
}
/* ---- drawing a problem ---- */
const cdx = (c, cls) => Cards.html(c, { cls: 'lcd' + (cls ? ' ' + cls : ''), k: 'l' + c });
function visHtml(q, showAns) {
  const v = q.vis || {}, N = A.NAMES();
  let h = '';
  if (v.info && v.info.length) h += v.info.map(x => `<p class="lq-info">${A.gl(tx(x))}</p>`).join('');
  if (v.taken) h += `<div class="lq-taken">${v.taken.map(p => `<div class="${p.s === q.who ? 'who' : ''}"><b>${esc(N[p.s])}</b><span>♥×${p.h}${p.q ? ' · Q♠' : ''}${p.j ? ' · J♦' : ''}</span></div>`).join('')}${v.v === 'omni' ? `<p class="lq-info">${esc(t('li.omni'))}</p>` : ''}</div>`;
  if (v.log) h += `<div class="lq-log">${v.log.map((tr, i) => `<div><em>${i + 1}</em><span class="mc-row">${tr.map(x => Cards.mini(x.c)).join('')}</span></div>`).join('')}</div>`;
  if (v.open) h += `<div class="lq-open">${v.open.map((hh, s) => `<div class="${s === 0 ? 'me' : ''}"><b>${esc(N[s])}</b><span class="lq-row">${hh.map(c => cdx(c)).join('')}</span></div>`).join('')}</div>`;
  if (v.trick && v.trick.length) {
    const tv = v.trick, win = HT.winner(tv), hl = cur && cur.hint >= 2 && !showAns;
    h += `<div class="lq-trick"><small>${esc(t('r.ui.trick'))}</small><span class="lq-row">${tv.map(p => `<span class="rt-tc">${cdx(p.c, hl && p.s === win ? 'hl' : '')}<em>${esc(N[p.s])}</em></span>`).join('')}</span></div>`;
  }
  if (v.hand && q.kind !== 'pass') h += `<div class="lq-hand"><small>${esc(t('r.ui.hand'))}</small><span class="mc-row">${v.hand.map(c => Cards.mini(c, q.kind === 'card' && q.opts.includes(c) ? 'op' : '')).join('')}</span></div>`;
  if (v.hand && q.kind === 'pass') h += `<div class="lq-hand lq-phand"><small>${esc(t('lq.passHand'))}</small><span class="lq-row wrap">${v.hand.map(c => cdx(c)).join('')}</span></div>`;
  return h;
}
function optHtml(q, k, state) {
  const o = q.opts[k], N = A.NAMES();
  let lab;
  if (q.kind === 'card') lab = cdx(o);
  else if (q.kind === 'seat') lab = `<b>${esc(N[o])}</b>`;
  else if (q.kind === 'num') lab = `<b>${o}</b>`;
  else lab = `<span class="lq-row">${o.map(c => cdx(c)).join('')}</span>`;
  return `<button type="button" class="lq-o k-${q.kind}${state}" data-o="${k}"${state && state !== ' hl' ? ' disabled' : ''}>${lab}</button>`;
}
function qHtml(q, chosen, mode) {   // mode: 'ex' (example: answer shown), 'pr' (practice), 'test'
  const show = mode === 'ex';
  let h = `<div class="lq-q"><p class="lq-qt">${A.gl(tx(q.q))}</p>${visHtml(q, show)}<div class="lq-opts ht-opts k-${q.kind}">`;
  h += q.opts.map((o, k) => optHtml(q, k, chosen != null ? (k === q.ans ? ' right' : k === chosen ? ' wrong' : ' off') : (show || (cur.hint >= 3)) && k === q.ans ? ' hl' : '')).join('') + `</div>`;
  if (chosen == null && mode !== 'ex' && cur.hint) h += `<div class="lq-hint"><b>💡 ${esc(t('lsn.hintN', { n: cur.hint }))}</b><p>${A.gl(cur.hint === 1 ? t('lh.' + cur.id) : cur.hint === 2 ? t('lh2.' + cur.id) : t('lsn.hintAns'))}</p></div>`;
  if (chosen != null) {
    const ok = chosen === q.ans;
    h += `<div class="lq-exp ${ok ? 'ok' : 'ng'}"><b>${esc(t(ok ? 'lsn.right' : 'lsn.wrong'))}</b>${!ok && q.why[chosen] ? `<p>${A.gl(tx(q.why[chosen]))}</p>` : ''}<p>${A.gl(tx(q.exp))}</p></div>`;
  } else if (show) h += `<div class="lq-exp ok"><b>${esc(t('lsn.example'))}</b><p>${A.gl(tx(q.exp))}</p><p class="muted">${esc(t('lsn.exTap'))}</p></div>`;
  return h + `</div>`;
}
function playHtml() {
  const id = cur.id, n = ALL.findIndex(x => x.id === id) + 1;
  const prep = ['idea', 'ex', 'pr'].indexOf(cur.phase);
  const dots = cur.phase === 'test' || cur.phase === 'end' ? `<span class="lq-dots">${cur.qs.map((q, k) => `<i class="${k < cur.i ? (q.ok ? 'ok' : 'ng') : k === cur.i && cur.phase === 'test' ? 'cur' : ''}"></i>`).join('')}</span>` : `<span class="lq-prep">${esc(t('lsn.prep', { i: prep + 1, n: 3 }))}</span>`;
  let main;
  if (cur.phase === 'idea') main = `<div class="lq-intro"><span class="lc-pic lg ht-pic">${picHtml(id)}</span><div>${String(t('lx.' + id)).split('\n').map(p => `<p>${A.gl(p)}</p>`).join('')}<p class="lq-tip">💡 ${A.gl(t('lt.' + id))}</p></div></div>`;
  else if (cur.phase === 'ex') main = qHtml(cur.ex, cur.chosen, 'ex');
  else if (cur.phase === 'pr') main = qHtml(cur.pr, cur.chosen, 'pr');
  else if (cur.phase === 'end') { const pass = cur.score >= PASS; main = `<div class="lq-end"><div class="lq-score ${pass ? 'ok' : ''}">${cur.score} / ${NQ}</div><b>${esc(t(pass ? 'lsn.endPass' : 'lsn.endFail'))}</b><p>${esc(t(pass ? 'lsn.endPassD' : 'lsn.endFailD'))}</p></div>`; }
  else main = qHtml(cur.qs[cur.i], cur.chosen, 'test');
  const canHint = (cur.phase === 'pr' || cur.phase === 'test') && cur.chosen == null && cur.hint < 3;
  let foot;
  if (cur.phase === 'idea') foot = `<button class="mbtn" id="lqList">${esc(t('lsn.backList'))}</button><button class="mbtn go" id="lqGo">${esc(t('lsn.toEx'))}</button>`;
  else if (cur.phase === 'end') foot = `<button class="mbtn" id="lqList">${esc(t('lsn.backLesson'))}</button><button class="mbtn" id="lqRetry">${esc(t('lsn.retry'))}</button><button class="mbtn go" id="lqNext">${esc(t('lsn.nextLesson'))}</button>`;
  else foot = `<button class="mbtn" id="lqList">${esc(t('lsn.backList'))}</button>${canHint ? `<button class="mbtn" id="lqHint">💡 ${esc(t('btn.hint'))}</button>` : ''}<button class="mbtn go" id="lqGo"${cur.chosen == null ? ' disabled' : ''}>${esc(cur.phase === 'test' && cur.i === cur.qs.length - 1 ? t('lsn.finish') : cur.phase === 'pr' ? t('lsn.startQ') : t('lsn.nextQ'))}</button>`;
  const skip = cur.phase === 'idea' || cur.phase === 'ex' || cur.phase === 'pr' ? `<button type="button" class="sbtn" id="lqSkip">${esc(t('lsn.skip'))}</button>` : '';
  return `<div class="lq"><div class="lq-head"><em>STEP ${n}</em><b>${esc(t('l.' + id))}</b>${dots}</div><div class="lq-main">${main}</div><div class="modal-actions">${foot}</div><div class="lq-quit">${skip}<button type="button" class="sbtn" id="lqX">${esc(t('lsn.quit'))}</button></div></div>`;
}
function wirePlay() {
  const M = $('#lessonModal');
  const toList = () => { const id = cur.id; cur = null; cat = ALL.find(x => x.id === id).cat; renderShell(); const el = M.querySelector(`[data-l="${id}"]`); if (el) el.scrollIntoView({ block: 'nearest' }); };
  $('#lqX').onclick = toList; const li = $('#lqList'); if (li) li.onclick = toList;
  const sk = $('#lqSkip'); if (sk) sk.onclick = () => { cur.phase = 'test'; cur.chosen = null; cur.hint = 0; renderShell(); };
  const hb = $('#lqHint'); if (hb) hb.onclick = () => { cur.hint++; A.sfx('sel'); renderShell(); };
  M.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
    if (cur.chosen != null) return;
    const q = cur.phase === 'ex' ? cur.ex : cur.phase === 'pr' ? cur.pr : cur.qs[cur.i]; const k = +b.dataset.o;
    if (cur.phase === 'ex' && k !== q.ans) { b.classList.add('shk'); setTimeout(() => b.classList.remove('shk'), 400); return; }
    cur.chosen = k; q.ok = k === q.ans && cur.hint < 3;
    if (cur.phase === 'test' && q.ok) cur.score++;
    A.sfx(k === q.ans ? 'ok' : 'ng'); renderShell();
  });
  const go = $('#lqGo'); if (go) go.onclick = () => {
    if (cur.phase === 'idea') { cur.phase = 'ex'; cur.chosen = null; renderShell(); return; }
    if (cur.phase === 'ex') { cur.phase = 'pr'; cur.chosen = null; cur.hint = 0; renderShell(); return; }
    if (cur.phase === 'pr') { cur.phase = 'test'; cur.chosen = null; cur.hint = 0; renderShell(); return; }
    cur.chosen = null; cur.hint = 0; cur.i++;
    if (cur.i >= cur.qs.length) { cur.phase = 'end'; const pr = progress(cur.id); PR[cur.id] = { best: Math.max(pr.best || 0, cur.score), pass: pr.pass || cur.score >= PASS }; saveP(); if (cur.score >= PASS) A.sfx('win'); }
    renderShell();
  };
  const rt = $('#lqRetry'); if (rt) rt.onclick = () => { const id = cur.id; start(id); if (cur) { cur.phase = 'test'; renderShell(); } };
  const nx = $('#lqNext'); if (nx) nx.onclick = () => { const i = ALL.findIndex(x => x.id === cur.id); const n = ALL[(i + 1) % ALL.length]; cat = n.cat; start(n.id); };
  const lm = $('#lessonModal .lq-main'); if (lm) lm.scrollTop = 0;
}
document.addEventListener('keydown', e => {
  if (!$('#lessonOverlay').classList.contains('show') || !cur) return;
  if ((cur.phase === 'test' || cur.phase === 'pr' || cur.phase === 'ex') && cur.chosen == null && /^[1-6]$/.test(e.key)) { const b = document.querySelector(`#lessonModal [data-o="${+e.key - 1}"]`); if (b) b.click(); }
  else if ((e.key === 'Enter' || e.key === 'ArrowRight') && $('#lqGo') && !$('#lqGo').disabled) $('#lqGo').click();
});
window.HtLessons = { open, ALL, CATS, count: () => ALL.length, passed: () => ALL.filter(x => progress(x.id).pass).length };
})();
