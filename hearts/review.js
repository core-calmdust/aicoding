/* ハーツ — review (hearts/review.js): the last 30 hands, card by card, with every hand open.
   At each of your plays: the coach's expected points of every card you could play (stored when you played, or worked out now by
   sampling — from what you could see at that moment, not from the open hands), the grade ◎○△✕ and why.
   The pass: what you gave and got, and the pass evaluation. At the end a short summary (best-match rate, mistakes, the turning point).
   Keys: ← → one card, ↑ ↓ first / last. */
(function () {
'use strict';
const A = window.HtApp, HT = window.HT, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
const MARK = ['◎', '○', '△', '✕'];
let V = null;   // { idx, step, cache }
function rev() { return A.D.rev[V.idx]; }
// the state just before log entry i (i = 0..52); i = -1 → the pass
function stateAt(r, i) {
  const S = HT.newHand(r.R, r.dealt.map(h => h.slice()), 0, r.no);
  S.dir = r.dir; S.pass = r.pass || [null, null, null, null]; S.got = r.got || [null, null, null, null];
  for (let k = 0; k < i; k++) HT.play(S, r.log[k][0], r.log[k][1]);
  return S;
}
function decAt(r, i) { return (r.dec || []).find(d => d.i === i); }
function gradeOf(list, c) { const best = Math.min(...list.map(x => x[2])), me = list.find(x => x[0] === c); if (!me) return -1; const d = me[2] - best, k = r0().R.spot ? 4 : 1; return d < .35 * k ? 0 : d < 1.2 * k ? 1 : d < 3 * k ? 2 : 3; }
const r0 = () => rev();
function open(idx) {
  const D = A.D;
  if (!D.rev.length) { A.toast(t('rv.none')); return; }
  V = { idx: idx == null || idx < 0 ? D.rev.length - 1 : Math.min(idx, D.rev.length - 1), step: 0, busy: {} };
  render(); A.openOv('#reviewOverlay');
  analyseAll();
}
// work out the missing numbers of this hand in the background (one decision at a time)
function analyseAll() {
  const r = rev(), my = V.idx;
  const todo = (r.dec || []).filter(d => !d.ev && !V.busy[d.i]);
  if (!todo.length) return;
  const d = todo[0]; V.busy[d.i] = 1;
  const S = stateAt(r, d.i);
  A.think('eval', S, 0, 0, { worlds: 60, ms: 900 }).then(res => {
    if (!V || V.idx !== my) return;
    if (res && res.list) { d.ev = res.list.map(x => [x.c, +x.own.toFixed(2), +x.obj.toFixed(2)]); d.n = res.worlds; const g = gradeOf(d.ev, d.c); if (g >= 0 && !d.counted) { d.counted = 1; A.D.stats.dec[g]++; } A.save(); }
    render(); analyseAll();
  });
}
function cardsRow(cs, cls) { return `<span class="hv-row">${HT.sortDisp(cs).map(c => Cards.mini(c, cls)).join('')}</span>`; }
function render() {
  if (!V) return;
  const D = A.D, r = rev(), N = A.NAMES(), last = r.log.length;
  V.step = Math.max(-1, Math.min(last, V.step));
  const S = stateAt(r, Math.max(0, V.step));
  // the hand picker
  const picker = `<div class="hv-pick">${D.rev.map((x, k) => `<button type="button" class="${k === V.idx ? 'sel' : ''}" data-h="${k}"><b>#${x.no}</b><small>${x.delta[0] > 0 ? '+' + x.delta[0] : x.delta[0]}</small></button>`).join('')}</div>`;
  // decisions summary
  const decs = (r.dec || []).filter(d => d.ev);
  const gs = [0, 0, 0, 0]; decs.forEach(d => { const g = gradeOf(d.ev, d.c); if (g >= 0) gs[g]++; });
  const sum = `<div class="hv-sum"><span>${esc(t('rv.handH', { n: r.no, d: A.dirName(r.dir) }))}</span><span class="hv-pts">${esc(t('rv.youGot', { p: r.delta[0] }))}</span>${MARK.map((m, i) => `<span class="hv-g g${i}">${m}<b>${gs[i]}</b></span>`).join('')}</div>`;
  // the open table
  const trick = V.step >= 0 ? S.trick : [];
  const seat = s => `<div class="hv-seat s${s}"><b>${esc(N[s])}</b>${cardsRow(S.hands[s], '')}<small>${HT.rawPts(S, s)}${esc(t('rv.pts'))}</small></div>`;
  const nextE = V.step >= 0 && V.step < last ? r.log[V.step] : null;
  const tr = `<div class="hv-trick">${trick.map(p => `<span class="hv-tc s${p.s}">${Cards.mini(p.c)}<em>${esc(N[p.s])}</em></span>`).join('')}${nextE ? `<span class="hv-next">${esc(t('rv.next', { n: N[nextE[0]] }))} ${Cards.mini(nextE[1], 'nx')}</span>` : ''}</div>`;
  const table = V.step < 0 ? passView(r) : `<div class="hv-table">${[2, 1, 3, 0].map(seat).join('')}${tr}</div>`;
  // the panel for this step
  let panel = '';
  if (V.step < 0) panel = passPanel(r);
  else if (V.step >= last) panel = endPanel(r, decs);
  else if (nextE[0] === 0) panel = decPanel(r, V.step);
  else panel = `<p class="muted">${esc(t('rv.theirs', { n: N[nextE[0]] }))}</p>`;
  const nav = `<div class="hv-nav"><button type="button" data-nv="first">⏮</button><button type="button" data-nv="prev">◀</button><span>${V.step < 0 ? esc(t('rv.passStep')) : V.step >= last ? esc(t('rv.endStep')) : `${V.step + 1} / ${last}`}</span><button type="button" data-nv="next">▶</button><button type="button" data-nv="last">⏭</button><button type="button" class="hv-myn" data-nv="mine">${esc(t('rv.nextMine'))}</button></div>`;
  $('#reviewBody').innerHTML = picker + sum + `<div class="hv-main"><div class="hv-l">${table}${nav}</div><div class="hv-r">${panel}</div></div>`;
  $('#reviewBody').querySelectorAll('[data-h]').forEach(b => b.onclick = () => { V.idx = +b.dataset.h; V.step = 0; V.busy = {}; render(); analyseAll(); });
  $('#reviewBody').querySelectorAll('[data-nv]').forEach(b => b.onclick = () => nav1(b.dataset.nv));
  $('#reviewBody').querySelectorAll('[data-go]').forEach(b => b.onclick = () => { V.step = +b.dataset.go; render(); });
  const p = $('#reviewBody .hv-pick .sel'); if (p) p.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function nav1(k) {
  const r = rev(), last = r.log.length;
  if (k === 'first') V.step = -1; else if (k === 'last') V.step = last; else if (k === 'prev') V.step = Math.max(-1, V.step - 1); else if (k === 'next') V.step = Math.min(last, V.step + 1);
  else if (k === 'mine') { let i = V.step + 1; while (i < last && r.log[i][0] !== 0) i++; V.step = Math.min(last, i); }
  render();
}
function passView(r) {
  const N = A.NAMES();
  if (!r.dir) return `<div class="hv-table pass"><p class="muted">${esc(t('rv.hold'))}</p>${cardsRow(r.dealt[0])}</div>`;
  const pi = r.passInfo || { mine: r.pass[0], got: r.got[0] };
  return `<div class="hv-table pass"><div><small>${esc(t('rv.dealt'))}</small>${cardsRow(r.start[0])}</div><div><small>${esc(t('rv.gave', { n: N[r.dir] }))}</small>${cardsRow(pi.mine || [], 'gv')}</div><div><small>${esc(t('rv.got', { n: N[(4 - r.dir) % 4] }))}</small>${cardsRow(pi.got || [], 'gt')}</div></div>`;
}
function passPanel(r) {
  if (!r.dir) return `<p class="muted">${esc(t('rv.holdD'))}</p>`;
  const key = 'pass';
  if (!V.passEv && !V.busy.pass) {
    V.busy.pass = 1; const my = V.idx;
    const S = HT.newHand(r.R, r.start.map(h => h.slice()), r.dir, r.no);
    A.think('passEval', S, 0, 0, { k: 8, worlds: 40, mine: r.pass[0] }).then(res => { if (!V || V.idx !== my) return; V.passEv = res || []; render(); });
  }
  if (!V.passEv) return `<p class="muted ck-busy">${esc(t('ck.calc'))}</p>`;
  const L = V.passEv.slice().sort((a, b) => a.obj - b.obj), mineK = r.pass[0].slice().sort().join();
  const lo = L[0].own, hi = Math.max(...L.map(x => x.own));
  const mine = L.find(x => x.cards.slice().sort().join() === mineK);
  const d = mine ? mine.obj - L[0].obj : 0, g = d < .35 ? 0 : d < 1.2 ? 1 : d < 3 ? 2 : 3;
  return `<div class="hv-dec"><div class="tips-h">${esc(t('rv.passH'))}</div><p class="hv-grade g${g}">${MARK[g]} ${esc(t('gr.' + g))}</p>` +
    L.slice(0, 6).map((x, i) => `<div class="evr${i === 0 ? ' best' : ''}${x === mine ? ' mine' : ''}"><span class="evl">${x.cards.map(c => Cards.mini(c)).join('')}</span><span class="evb"><i style="width:${(8 + (hi > lo ? (x.own - lo) / (hi - lo) : 0) * 92).toFixed(1)}%"></i></span><b>${A.fmt(x.own)}</b></div>`).join('') + `<p class="diff-desc">${esc(t('rv.passHelp'))}</p></div>`;
}
function decPanel(r, i) {
  const d = decAt(r, i), c = r.log[i][1];
  if (!d) return `<p class="muted">${esc(t('rv.noDec'))}</p>`;
  if (!d.ev) return `<p class="muted ck-busy">${esc(t('ck.calc'))}</p>`;
  const L = d.ev.slice().sort((a, b) => a[2] - b[2]), g = gradeOf(d.ev, c), best = L[0];
  const lo = Math.min(...L.map(x => x[1])), hi = Math.max(...L.map(x => x[1]));
  const me = d.ev.find(x => x[0] === c);
  const why = g <= 0 ? t('rv.why.best') : t('rv.why.loss', { a: A.cname(c), b: A.cname(best[0]), d: A.fmt(me[1] - best[1]) });
  return `<div class="hv-dec"><div class="tips-h">${esc(t('rv.youPlayed'))} ${Cards.mini(c)}</div><p class="hv-grade g${g}">${MARK[g]} ${esc(t('gr.' + g))}</p><p>${A.gl(why)}</p>` +
    L.map(x => `<div class="evr${x === best ? ' best' : ''}${x[0] === c ? ' mine' : ''}"><span class="evl">${Cards.mini(x[0])}</span><span class="evb"><i style="width:${(8 + (hi > lo ? (x[1] - lo) / (hi - lo) : 0) * 92).toFixed(1)}%"></i></span><b>${A.fmt(x[1])}</b></div>`).join('') + `<p class="diff-desc">${A.gl(t('rv.decHelp', { n: d.n || 0 }))}</p></div>`;
}
function endPanel(r, decs) {
  const N = A.NAMES();
  if (!decs.length) return `<p class="muted">${esc(t('rv.endNone'))}</p>`;
  const best = decs.filter(d => gradeOf(d.ev, d.c) === 0).length;
  let worst = null, wl = 0;
  for (const d of decs) { const b = Math.min(...d.ev.map(x => x[2])), me = d.ev.find(x => x[0] === d.c); const l = me ? me[2] - b : 0; if (l > wl) { wl = l; worst = d; } }
  const bad = decs.filter(d => gradeOf(d.ev, d.c) >= 2).length;
  return `<div class="hv-dec"><div class="tips-h">${esc(t('rv.endH'))}</div><div class="hv-endg"><div><small>${esc(t('rv.match'))}</small><b>${Math.round(best / decs.length * 100)}%</b></div><div><small>${esc(t('rv.bad'))}</small><b>${bad}</b></div><div><small>${esc(t('res.hand'))}</small><b>${r.delta[0]}</b></div></div>` +
    (worst && wl >= .35 ? `<p>${esc(t('rv.turn', { c: A.cname(worst.c), d: A.fmt(wl) }))}</p><button type="button" class="sbtn" data-go="${worst.i}">${esc(t('rv.see'))}</button>` : `<p>${esc(t('rv.clean'))}</p>`) + `</div>`;
}
$('#btnReviewClose').onclick = () => { V = null; A.closeOv('#reviewOverlay'); };
document.addEventListener('keydown', e => {
  if (!V || !$('#reviewOverlay').classList.contains('show')) return;
  const k = e.key;
  if (k === 'ArrowRight') { e.preventDefault(); nav1(document.documentElement.dir === 'rtl' ? 'prev' : 'next'); }
  else if (k === 'ArrowLeft') { e.preventDefault(); nav1(document.documentElement.dir === 'rtl' ? 'next' : 'prev'); }
  else if (k === 'ArrowUp') { e.preventDefault(); nav1('first'); }
  else if (k === 'ArrowDown') { e.preventDefault(); nav1('last'); }
});
window.HtReview = { open, stateAt };
})();
