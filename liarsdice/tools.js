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
  // both tabs are drawn in the same cell (the hidden one invisible), so the box keeps the size of the larger one
  // ("this position") when you switch tabs
  let body = '';
  {
    C.m = Math.min(C.m, 5); const pe = LD.pMatch(C.f, !!C.wild);
    const P = LD.pAtLeast(C.q, C.m, C.n, C.f, !!C.wild), E = LD.pExact(C.q, C.m, C.n, C.f, !!C.wild), ex = C.m + C.n * pe;
    const X = refHtml();
    body = `<div class="calc2"><div class="c-left"><div class="cin">` + step(t('calc.n'), 'n', 0, 30) + step(t('calc.m'), 'm', 0, 5) + step(t('calc.q'), 'q', 1, 35) +
      `<div class="cstep"><small>${esc(t('calc.f'))}</small><div class="fsel">${[1, 2, 3, 4, 5, 6].map(f => `<button type="button" class="fbtn${C.f === f ? ' sel' : ''}" data-cf="${f}">${Dice.img(f, 'fb')}</button>`).join('')}</div></div>` +
      `<div class="cstep"><small>${esc(t('o.wild'))}</small><div class="seg"><button type="button" data-cw="1" class="${C.wild ? 'sel' : ''}">${esc(t('on'))}</button><button type="button" data-cw="0" class="${C.wild ? '' : 'sel'}">${esc(t('off'))}</button></div></div></div>${X.c3}</div>` +
      `<div class="c-right"><div class="ctop"><div class="cbig"><small>${esc(t('calc.pAt', { q: C.q, f: C.f }))}</small><b class="${P < .4 ? 'lo' : P > .65 ? 'hi' : ''}">${pct(P)}</b></div>` +
      `<div class="crow"><span><small>${esc(t('calc.pEq'))}</small><b>${pct(E)}</b></span><span><small>${esc(t('calc.exp'))}</small><b>${ex.toFixed(2)}</b></span><span><small>${esc(t('calc.per'))}</small><b>${C.f === 1 || !C.wild ? '1/6' : '1/3'}</b></span></div></div>` +
      distHtml(C.n, C.m, C.q, C.f, !!C.wild) + `<p class="diff-desc chelp">${esc(t('calc.help', { m: C.m, n: C.n, p: C.f === 1 || !C.wild ? '1/6' : '1/3' }))}</p><div class="cx">${X.c1}${X.c2}</div></div></div>`;
  }
  const onGame = C.tab === 'game' && inGame;
  body = `<div class="tl-stack"><div class="tl-pane${onGame ? ' off' : ''}"${onGame ? ' aria-hidden="true" inert' : ''}>${body}</div>` +
    (inGame ? `<div class="tl-pane${onGame ? '' : ' off'}"${onGame ? '' : ' aria-hidden="true" inert'}>${gameHtml()}</div>` : '') + `</div>`;
  M.innerHTML = `<h2>${esc(t('calc.h'))}</h2>${tabs}<div class="tools-body">${body}</div><div class="modal-actions"><button class="mbtn go" id="calcClose">${esc(t('close'))}</button></div>`;
  M.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { C.tab = b.dataset.ct; renderCalc(); });
  M.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { const k = b.dataset.st, lim = { n: [0, 30], m: [0, 5], q: [1, 35] }[k]; C[k] = Math.max(lim[0], Math.min(lim[1], C[k] + +b.dataset.d)); A.sfx('sel'); renderCalc(); });
  M.querySelectorAll('[data-cf]').forEach(b => b.onclick = () => { C.f = +b.dataset.cf; A.sfx('sel'); renderCalc(); });
  M.querySelectorAll('[data-cw]').forEach(b => b.onclick = () => { C.wild = +b.dataset.cw; renderCalc(); });
  $('#calcClose').onclick = () => A.closeOv('#toolsOverlay');
}
// study tables under the calculator, all from engine.js's binomial odds:
// (1) at least k of the n hidden dice, for 1/6 and 1/3 (the row you need for the bid marked),
// (2) how many of the face you can bid at 80% / 50% / 20%, with and without wild ones (your matches included),
// (3) the expected count of a face among 5–30 hidden dice
function refHtml() {
  const n = C.n, m = C.m, need = C.q - m, d6 = LD.binDist(n, 1 / 6), d3 = LD.binDist(n, 1 / 3);
  const atl = (d, k) => k <= 0 ? 1 : k > n ? 0 : d.slice(k).reduce((a, b) => a + b, 0);
  const cls = x => x >= .65 ? 'hi' : x < .4 ? 'lo' : '';
  // (1)
  const k0 = Math.max(1, Math.min(need, n) - 3), k1 = Math.min(n, k0 + 6), wcol = C.f !== 1 && C.wild;
  let r1 = '';
  for (let k = k0; k <= k1; k++) r1 += `<tr class="${k === need ? 'cur' : ''}"><td>${k}</td><td class="${cls(atl(d6, k))}${wcol ? '' : ' use'}">${pct(atl(d6, k))}</td><td class="${cls(atl(d3, k))}${wcol ? ' use' : ''}">${pct(atl(d3, k))}</td></tr>`;
  if (n < 1) r1 = `<tr><td colspan="3">—</td></tr>`;
  const c1 = `<div class="cx-card"><b class="cx-h">${esc(t('calc.tblH', { n }))}</b><table class="cx-t ck"><tr><th>${esc(t('calc.k'))}</th><th>1/6<small>${esc(t('rs.nowild'))}</small></th><th>1/3<small>${esc(t('rs.wild'))}</small></th></tr>${r1}</table>` +
    (need >= 1 && need <= n ? `<p class="cx-n">${esc(t('calc.needC', { k: need, q: C.q, m }))}</p>` : '') + `</div>`;
  // (2)
  const safe = (th, wild) => { let best = 0; for (let q = 1; q <= m + n; q++) if (LD.pAtLeast(q, m, n, C.f, wild) >= th) best = q; return best || '—'; };
  const cols = C.f === 1 ? [[true, t('calc.one')]] : [[true, t('rs.wild')], [false, t('rs.nowild')]];
  const r2 = [.9, .7, .5, .3, .1].map(th => `<tr class="${th === .9 || th === .1 ? 'ext' : ''}"><td class="thr">≥${Math.round(th * 100)}%</td>${cols.map(([w]) => `<td class="${C.f === 1 || !!C.wild === w ? 'use' : ''}"><b>${safe(th, w)}</b></td>`).join('')}</tr>`).join('');
  const c2 = `<div class="cx-card"><b class="cx-h">${esc(t('calc.safeH', { m }))}${Dice.img(C.f, 'cxd')}</b><table class="cx-t"><tr><th>${esc(t('ck.colT'))}</th>${cols.map(([, l]) => `<th>${esc(l)}</th>`).join('')}</tr>${r2}</table><p class="cx-n">${esc(t(C.f === 1 ? 'calc.safe1' : 'calc.safeN'))}</p></div>`;
  // (3)
  const ns = [5, 10, 15, 20, 25, 30]; if (n > 0 && !ns.includes(n)) { ns.push(n); ns.sort((a, b) => a - b); }
  const r3 = ns.map(x => `<tr class="${x === n ? 'cur' : (x === 5 || x === 30) ? 'ext' : ''}"><td>${x}</td><td class="${wcol ? '' : 'use'}">${(x / 6).toFixed(1)}</td><td class="${wcol ? 'use' : ''}">${(x / 3).toFixed(1)}</td></tr>`).join('');
  const c3 = `<div class="cx-card"><b class="cx-h">${esc(t('calc.expH'))}</b><table class="cx-t"><tr><th>${esc(t('calc.colN'))}</th><th>×1/6<small>${esc(t('rs.nowild'))}</small></th><th>×1/3<small>${esc(t('rs.wild'))}</small></th></tr>${r3}</table><p class="cx-n">${esc(t('calc.expC'))}</p></div>`;
  return { c1, c2, c3 };
}
// from the table: the last bid with and without the reading of the bids, and every option's value
function gameHtml() {
  const g = A.G, wild = LD.wildOn(g), Co = AI.coach(g, 0), unk = LD.total(g) - g.dice[0];
  let h = `<div class="cg"><div class="cg-h"><span>${esc(t('ck.total'))} <b>${LD.total(g)}</b></span><span>${esc(t('calc.n'))} <b>${unk}</b></span><span>${esc(t('ck.rule'))} <b>${esc(g.round.pal >= 0 ? t('pal.badge') : wild ? t('wild.on') : t('rs.nowild'))}</b></span></div>`;
  let L = `<div class="cg-hand"><small>${esc(t('calc.yours'))}</small>${g.hands[0].map(d => Dice.img(d, 'cgd')).join('')}</div>`;
  if (Co.prev) {
    const own = LD.supportOf(g.hands[0], Co.prev.f, wild), plain = LD.pAtLeast(Co.prev.q, own, unk, Co.prev.f, wild);
    L += `<div class="cg-cmp"><div><small>${esc(t('calc.plain'))}</small><b>${pct(plain)}</b></div><div><small>${esc(t('calc.bayes'))}</small><b>${pct(Co.T)}</b></div><p>${esc(t('calc.cmp', { b: A.bidTxt(Co.prev) }))}</p></div>`;
  }
  // every face: your matches + the hidden dice, by the odds alone and with the reading of the bids
  const cf = Co.prev ? Co.prev.f : 0;
  L += `<div class="cx-card cg-face"><b class="cx-h">${esc(t('calc.faceH'))}</b><table class="cx-t"><tr><th></th><th>${esc(t('calc.colMine'))}</th><th>${esc(t('calc.plain'))}</th><th>${esc(t('calc.bayes'))}</th><th>${esc(t('calc.colTot'))}</th></tr>` +
    [1, 2, 3, 4, 5, 6].map(f => { const mine = LD.supportOf(g.hands[0], f, wild), pl = unk * LD.pMatch(f, wild), rd = Co.expect[f] || 0, up = rd - pl;
      return `<tr class="${f === cf ? 'cur' : ''}"><td>${Dice.img(f, 'cxd')}</td><td>${mine}</td><td>${pl.toFixed(1)}</td><td class="${up > .25 ? 'up' : up < -.25 ? 'dn' : ''}">${rd.toFixed(1)}</td><td class="use"><b>${(mine + rd).toFixed(1)}</b></td></tr>`; }).join('') +
    `</table><p class="cx-n">${esc(t('calc.faceN'))}</p></div>`;
  const reads = Co.reads.filter(r => r.f && r.up > .25 && g.round.bids.some(b => b.p === r.j));
  if (reads.length) L += `<div class="ck-reads cg-reads"><div class="tips-h">${esc(t('ck.reads'))}</div>${reads.map(r => `<div><span class="ava av${r.j}">${esc(A.nameOf(r.j).slice(0, 1))}</span>${esc(t('ck.read', { n: A.nameOf(r.j), u: r.up.toFixed(1) }))}${Dice.img(r.f, 'od')}</div>`).join('')}</div>`;
  let Rr = '';
  if (g.round.turn === 0) {
    Rr = `<div class="tips-h">${esc(t('calc.ev'))}</div><table class="cg-tbl"><tr><th></th><th>${esc(t('ck.colT'))}</th><th>${esc(t('ck.colL'))}</th><th>${esc(t('calc.colG'))}</th><th>${esc(t('ck.colU'))}</th></tr>` +
      Co.opts.slice(0, Co.prev ? 10 : 14).map((o, i) => `<tr class="${i === 0 ? 'best' : ''}"><td>${o.a.t === 'bid' ? A.bidHtml(o.a, 'sm') : `<b class="ckact ${o.a.t}">${esc(t(o.a.t === 'dudo' ? 'act.dudo' : 'act.calza'))}</b>`}</td><td>${pct(o.a.t === 'calza' ? o.E : o.T)}</td><td>${pct(o.lose)}</td><td>${pct(o.gain)}</td><td class="${o.U >= 0 ? 'pos' : 'neg'}">${o.U >= 0 ? '+' : '−'}${Math.abs(o.U).toFixed(2)}</td></tr>`).join('') + `</table><p class="diff-desc">${esc(t('calc.evHelp'))}</p>`;
  }
  h += `<div class="cg-cols"><div class="cg-l">${L}</div>${Rr ? `<div class="cg-r">${Rr}</div>` : ''}</div>`;
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
