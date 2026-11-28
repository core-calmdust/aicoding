/* ライアーダイス — study tools (liarsdice/tools.js)
   · probability calculator: the odds of a bid from the number of unknown dice and your own matches (plain binomial),
     and, from the game on the table, the same with the reading of the bids (ai.js) and every option's value
   · review: the rounds of a finished game with all the dice shown and your decisions graded (◎○△✕), ← → between rounds
   · statistics */
(function () {
'use strict';
const A = window.LdApp, LD = window.LD, AI = window.LDAI, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => A.esc(s), t = (k, v) => A.t(k, v), pct = x => (x * 100 >= 99.5 && x < 1 ? '>99' : x * 100 < .5 && x > 0 ? '<1' : Math.round(x * 100)) + '%';

/* ---------------- probability calculator ---------------- */
const C = { n: 15, m: 2, q: 5, f: 4, wild: 1, tab: 'calc' };
function fromGame() {
  const g = A.G; if (!g || !g.round) return false;
  const wild = LD.wildOn(g), last = LD.last(g);
  C.wild = wild ? 1 : 0; C.n = LD.total(g) - g.dice[0];
  if (last) { C.q = last.q; C.f = last.f; } else { C.f = A.U.f || 4; C.q = A.U.q || 3; }
  C.m = LD.supportOf(g.hands[0], C.f, wild);
  return true;
}
function calc(fromTable) {
  if (fromTable && fromGame()) C.tab = A.G && A.G.phase === 'bid' && A.G.round.turn === 0 ? 'game' : 'calc';
  renderCalc(); A.openOv('#toolsOverlay');
}
function step(lab, k, lo, hi) { return `<div class="cstep"><small>${esc(lab)}</small><div class="qsel"><button type="button" class="qb" data-st="${k}" data-d="-1">−</button><b>${C[k]}</b><button type="button" class="qb" data-st="${k}" data-d="1">+</button></div></div>`; }
function distHtml(n, m, q, f, wild) {
  const d = LD.binDist(n, LD.pMatch(f, wild)), mx = Math.max(...d);
  return `<div class="cdist">` + d.map((p, k) => { const tot = k + m; return `<div class="cb${tot >= q ? ' ok' : ''}${tot === q ? ' eq' : ''}" title="${tot}: ${(p * 100).toFixed(1)}%"><i style="height:${(p / mx * 100).toFixed(1)}%"></i><small>${tot}</small></div>`; }).join('') + `</div>`;
}
function renderCalc() {
  const M = $('#toolsModal'), g = A.G, inGame = g && g.round && g.phase === 'bid' && !(A.M.mode === 'rated' && !A.M.over);
  const tabs = `<div class="ng-tabs"><button type="button" data-ct="calc" class="${C.tab === 'calc' ? 'sel' : ''}">${esc(t('calc.tab'))}</button><button type="button" data-ct="game" class="${C.tab === 'game' ? 'sel' : ''}"${inGame ? '' : ' disabled'}>${esc(t('calc.tabGame'))}</button></div>`;
  let body;
  if (C.tab === 'game' && inGame) body = gameHtml();
  else {
    C.m = Math.min(C.m, 5); const pe = LD.pMatch(C.f, !!C.wild);
    const P = LD.pAtLeast(C.q, C.m, C.n, C.f, !!C.wild), E = LD.pExact(C.q, C.m, C.n, C.f, !!C.wild), ex = C.m + C.n * pe;
    body = `<div class="calc"><div class="cin">` + step(t('calc.n'), 'n', 0, 30) + step(t('calc.m'), 'm', 0, 5) + step(t('calc.q'), 'q', 1, 35) +
      `<div class="cstep"><small>${esc(t('calc.f'))}</small><div class="fsel">${[1, 2, 3, 4, 5, 6].map(f => `<button type="button" class="fbtn${C.f === f ? ' sel' : ''}" data-cf="${f}">${Dice.img(f, 'fb')}</button>`).join('')}</div></div>` +
      `<div class="cstep"><small>${esc(t('o.wild'))}</small><div class="seg"><button type="button" data-cw="1" class="${C.wild ? 'sel' : ''}">${esc(t('on'))}</button><button type="button" data-cw="0" class="${C.wild ? '' : 'sel'}">${esc(t('off'))}</button></div></div></div>` +
      `<div class="cout"><div class="cbig"><small>${esc(t('calc.pAt', { q: C.q, f: C.f }))}</small><b class="${P < .4 ? 'lo' : P > .65 ? 'hi' : ''}">${pct(P)}</b></div>` +
      `<div class="crow"><span><small>${esc(t('calc.pEq'))}</small><b>${pct(E)}</b></span><span><small>${esc(t('calc.exp'))}</small><b>${ex.toFixed(2)}</b></span><span><small>${esc(t('calc.per'))}</small><b>${C.f === 1 || !C.wild ? '1/6' : '1/3'}</b></span></div>` +
      distHtml(C.n, C.m, C.q, C.f, !!C.wild) + `<p class="diff-desc">${esc(t('calc.help', { m: C.m, n: C.n, p: C.f === 1 || !C.wild ? '1/6' : '1/3' }))}</p></div></div>`;
  }
  M.innerHTML = `<h2>${esc(t('calc.h'))}</h2>${tabs}<div class="tools-body">${body}</div><div class="modal-actions"><button class="mbtn go" id="calcClose">${esc(t('close'))}</button></div>`;
  M.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { C.tab = b.dataset.ct; renderCalc(); });
  M.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { const k = b.dataset.st, lim = { n: [0, 30], m: [0, 5], q: [1, 35] }[k]; C[k] = Math.max(lim[0], Math.min(lim[1], C[k] + +b.dataset.d)); A.sfx('sel'); renderCalc(); });
  M.querySelectorAll('[data-cf]').forEach(b => b.onclick = () => { C.f = +b.dataset.cf; A.sfx('sel'); renderCalc(); });
  M.querySelectorAll('[data-cw]').forEach(b => b.onclick = () => { C.wild = +b.dataset.cw; renderCalc(); });
  $('#calcClose').onclick = () => A.closeOv('#toolsOverlay');
}
// from the table: the last bid with and without the reading of the bids, and every option's value
function gameHtml() {
  const g = A.G, wild = LD.wildOn(g), Co = AI.coach(g, 0), unk = LD.total(g) - g.dice[0];
  let h = `<div class="cg"><div class="cg-h"><span>${esc(t('ck.total'))} <b>${LD.total(g)}</b></span><span>${esc(t('calc.n'))} <b>${unk}</b></span><span>${esc(t('ck.rule'))} <b>${esc(g.round.pal >= 0 ? t('pal.badge') : wild ? t('wild.on') : t('rs.nowild'))}</b></span></div>`;
  h += `<div class="cg-hand"><small>${esc(t('calc.yours'))}</small>${g.hands[0].map(d => Dice.img(d, 'cgd')).join('')}</div>`;
  if (Co.prev) {
    const own = LD.supportOf(g.hands[0], Co.prev.f, wild), plain = LD.pAtLeast(Co.prev.q, own, unk, Co.prev.f, wild);
    h += `<div class="cg-cmp"><div><small>${esc(t('calc.plain'))}</small><b>${pct(plain)}</b></div><div><small>${esc(t('calc.bayes'))}</small><b>${pct(Co.T)}</b></div><p>${esc(t('calc.cmp', { b: A.bidTxt(Co.prev) }))}</p></div>`;
  }
  if (g.round.turn === 0) {
    h += `<div class="tips-h">${esc(t('calc.ev'))}</div><table class="cg-tbl"><tr><th></th><th>${esc(t('ck.colT'))}</th><th>${esc(t('ck.colL'))}</th><th>${esc(t('calc.colG'))}</th><th>${esc(t('ck.colU'))}</th></tr>` +
      Co.opts.slice(0, 8).map((o, i) => `<tr class="${i === 0 ? 'best' : ''}"><td>${o.a.t === 'bid' ? A.bidHtml(o.a, 'sm') : `<b class="ckact ${o.a.t}">${esc(t(o.a.t === 'dudo' ? 'act.dudo' : 'act.calza'))}</b>`}</td><td>${pct(o.a.t === 'calza' ? o.E : o.T)}</td><td>${pct(o.lose)}</td><td>${pct(o.gain)}</td><td class="${o.U >= 0 ? 'pos' : 'neg'}">${o.U >= 0 ? '+' : '−'}${Math.abs(o.U).toFixed(2)}</td></tr>`).join('') + `</table><p class="diff-desc">${esc(t('calc.evHelp'))}</p>`;
  }
  return h + `</div>`;
}

/* ---------------- review ---------------- */
let RV = null;
function review(idx) {
  const H = A.D.hist || [];
  if (!H.length) { A.toast(t('rv.none')); return; }
  const gi = idx == null ? H.length - 1 : idx;
  RV = { gi, ri: 0 };
  const gm = H[gi]; const bad = (gm.dec || []).map((d, i) => ({ d, i })).sort((a, b) => (b.d.bestU - b.d.U) - (a.d.bestU - a.d.U))[0];
  RV.ri = 0; RV.key = bad ? bad.d.r : null;
  renderReview(); A.openOv('#reviewOverlay');
}
function nameAt(p) { return A.nameOf(p); }
function renderReview() {
  const H = A.D.hist || [], gm = H[RV.gi]; if (!gm) return;
  const R = gm.rounds[RV.ri], decs = (gm.dec || []).filter(d => d.r === R.no);
  const n = gm.rounds.length, allDec = gm.dec || [];
  const cnt = k => allDec.filter(d => d.grade === k).length;
  const acc = allDec.length ? Math.round((cnt('best') + cnt('good')) / allDec.length * 100) : 0;
  const worst = allDec.slice().sort((a, b) => (b.bestU - b.U) - (a.bestU - a.U))[0];
  const sum = `<div class="lr-sum"><span><small>${esc(t('rv.place'))}</small><b>${gm.place + 1} / ${gm.n}</b></span><span><small>${esc(t('rv.acc'))}</small><b>${acc}%</b></span>` +
    ['best', 'good', 'dubious', 'bad'].map(k => `<span class="g-${k}"><small>${A.GRADE[k]} ${esc(t('grade.' + k))}</small><b>${cnt(k)}</b></span>`).join('') +
    (worst && worst.grade !== 'best' && worst.grade !== 'good' ? `<button type="button" class="sbtn" id="rvWorst">${esc(t('rv.worst', { n: worst.r }))}</button>` : '') + `</div>`;
  // the round: everyone's dice, the bids (yours graded), the result
  const wild = R.res.wild, f = R.res.bid.f;
  const hands = R.hands.map((h, p) => h.length ? `<div class="lr-h${p === 0 ? ' me' : ''}"><b>${esc(nameAt(p))}</b><span>${h.map(d => Dice.img(d, 'rvd' + (d === f || (wild && d === 1 && f !== 1) ? ' m' : ''))).join('')}</span></div>` : '').join('');
  let bids = '';
  R.bids.forEach((b, i) => {
    const d = decs.find(x => x.i === i && x.a.t === 'bid');
    bids += `<div class="lr-b${b.p === 0 ? ' me' : ''}"><b>${esc(nameAt(b.p))}</b>${A.bidHtml(b, 'sm')}${d ? decLine(d) : ''}</div>`;
  });
  const fin = decs.find(x => x.a.t !== 'bid');
  const x = R.res;
  bids += `<div class="lr-b call${x.by === 0 ? ' me' : ''}"><b>${esc(nameAt(x.by))}</b><em class="ckact ${x.t}">${esc(t(x.t === 'dudo' ? 'act.dudo' : 'act.calza'))}</em>${fin ? decLine(fin) : ''}</div>`;
  bids += `<div class="lr-res">${esc(t('log.count', { c: x.n }))} · ${esc(x.loser >= 0 ? t('log.lost', { n: nameAt(x.loser) }) : x.gainer >= 0 ? t('log.gain', { n: nameAt(x.gainer) }) : t('log.even'))}</div>`;
  const M = $('#reviewModal');
  M.innerHTML = `<h2>${esc(t('rv.h'))}</h2>${sum}<div class="lr-nav"><button type="button" class="qb" id="rvPrev" ${RV.ri ? '' : 'disabled'}>◀</button><b>${esc(t('round.no', { n: R.no }))}${R.pal >= 0 ? ' · ' + esc(t('pal.badge')) : ''}</b><small>${RV.ri + 1} / ${n}</small><button type="button" class="qb" id="rvNext" ${RV.ri < n - 1 ? '' : 'disabled'}>▶</button></div>` +
    `<div class="lr-body"><div class="lr-hands">${hands}</div><div class="lr-bids">${bids}</div></div><p class="diff-desc">${esc(t('rv.help'))}</p>` +
    `<div class="modal-actions"><button class="mbtn go" id="rvClose">${esc(t('close'))}</button></div>`;
  $('#rvPrev').onclick = () => go(-1); $('#rvNext').onclick = () => go(1); $('#rvClose').onclick = () => A.closeOv('#reviewOverlay');
  const w = $('#rvWorst'); if (w) w.onclick = () => { RV.ri = Math.max(0, gm.rounds.findIndex(r => r.no === worst.r)); renderReview(); };
}
function decLine(d) {
  const same = d.best.t === d.a.t && (d.a.t !== 'bid' || (d.best.q === d.a.q && d.best.f === d.a.f));
  return `<span class="lr-g g-${d.grade}"><i>${A.GRADE[d.grade]}</i>${esc(same ? t('rv.same', { p: d.T != null ? Math.round(d.T * 100) + '%' : '—' }) : t('rv.alt', { b: A.actTxt(d.best), d: (d.bestU - d.U).toFixed(2) }))}</span>`;
}
function go(d) { const gm = (A.D.hist || [])[RV.gi]; if (!gm) return; RV.ri = Math.max(0, Math.min(gm.rounds.length - 1, RV.ri + d)); renderReview(); }
document.addEventListener('keydown', e => {
  if (!$('#reviewOverlay').classList.contains('show') || !RV) return;
  const ar = A.LANG === 'ar';
  if (e.key === 'ArrowRight') { e.preventDefault(); go(ar ? -1 : 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(ar ? 1 : -1); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); go(999); } else if (e.key === 'ArrowUp') { e.preventDefault(); go(-999); }
});

/* ---------------- statistics ---------------- */
function stats() { renderStats(); A.openOv('#statsOverlay'); }
function renderStats() {
  const st = A.D.stats;
  if (!st.games && !st.dudo && !st.bids) { $('#statsBody').innerHTML = `<p class="muted center">${esc(t('st.none'))}</p>`; return; }
  const pc = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
  const gs = st.grades || {}, gt = (gs.best || 0) + (gs.good || 0) + (gs.dubious || 0) + (gs.bad || 0);
  const cells = [['st.games', st.games], ['st.wins', pc(st.wins, st.games)], ['st.avgPlace', st.placeN ? (st.placeSum / st.placeN + 1).toFixed(2) : '—'], ['st.acc', pc((gs.best || 0) + (gs.good || 0), gt)],
    ['st.dudo', `${st.dudoOk}/${st.dudo}`], ['st.dudoP', pc(st.dudoOk, st.dudo)], ['st.calzaP', `${pc(st.calzaOk, st.calza)} (${st.calza})`], ['st.caught', pc(st.caught, st.bids)], ['st.bluff', pc(st.bluffs, st.bids)]];
  const lost = st.lost || {}, lt = (lost.call || 0) + (lost.caught || 0) + (lost.calza || 0);
  const lrows = ['call', 'caught', 'calza'].map(k => `<div class="fq"><span>${esc(t('st.lost.' + k))}</span><span class="fq-b"><i style="width:${lt ? ((lost[k] || 0) / lt * 100).toFixed(1) : 0}%"></i></span><b>${lost[k] || 0}</b></div>`).join('');
  const lv = Object.keys(st.byLvl || {}).map(Number).sort((a, b) => a - b).map(l => { const b = st.byLvl[l]; return `<tr><td>Lv.${l}</td><td>${b.g}</td><td>${pc(b.w, b.g)}</td><td>${b.g ? (b.ps / b.g + 1).toFixed(2) : '—'}</td></tr>`; }).join('');
  $('#statsBody').innerHTML = `<div class="st-grid">${cells.map(([k, v]) => `<div><small>${esc(t(k))}</small><b>${v}</b></div>`).join('')}</div>` +
    `<div class="st-two"><div><span class="lab">${esc(t('st.lost'))}</span>${lrows}</div>` +
    `<div><span class="lab">${esc(t('st.byLvl'))}</span><table class="st-tbl"><tr><th>AI</th><th>${esc(t('st.games'))}</th><th>${esc(t('st.wins'))}</th><th>${esc(t('st.avgPlace'))}</th></tr>${lv}</table></div></div>` +
    `<p class="diff-desc">${esc(t('st.help'))}</p>`;
}
$('#btnStatsClose').onclick = () => A.closeOv('#statsOverlay');
$('#btnStatsReset').onclick = () => A.confirmBox(t('st.resetQ'), () => { A.D.stats = { games: 0, wins: 0, placeSum: 0, placeN: 0, dudo: 0, dudoOk: 0, calza: 0, calzaOk: 0, bids: 0, caught: 0, bluffs: 0, lost: { call: 0, caught: 0, calza: 0 }, byLvl: {}, grades: { best: 0, good: 0, dubious: 0, bad: 0 } }; A.save(); renderStats(); A.openOv('#statsOverlay'); });

window.LdTools = { calc, review, stats };
})();
