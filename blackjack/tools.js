/* ブラックジャック — research tools (blackjack/tools.js)
   基本戦略表: the full chart (hard / soft / pairs) for any rule set, computed from the expected values (engine.js).
   ハウスエッジ: what each rule is worth, the four variants, the side bets, an hour at the table.
   カウンティング: Hi-Lo values, the player's edge by true count, insurance by true count, a bet ramp.
   戦い方の検証: Monte Carlo of four ways to play (basic strategy, by feel, never bust, mimic the dealer). */
(function () {
'use strict';
const A = window.BJApp, B = window.BJ, $ = s => document.querySelector(s);
const t = (k, v) => A.t(k, v), esc = s => A.esc(s), pct = A.pct, fmt = A.fmt;
let tab = 'chart', lastTab = '';
const W = { v: null, p: null, sim: { n: 20000, res: null, running: false } };
const curRules = () => B.rulesOf(W.v, W.p);
function ensure() { if (!W.v) { W.v = A.T.v; W.p = JSON.parse(JSON.stringify(A.prefOf(A.T.v))); } }
const seg = (attr, items, cur) => `<div class="seg">${items.map(([v, l]) => `<button type="button" class="${String(v) === String(cur) ? 'sel' : ''}" data-${attr}="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
function rulesBar() {
  const p = W.p, opts = B.VARIANTS[W.v].opts;
  const OV = { h17: [[false, 'S17'], [true, 'H17']], surr: [[true, t('m.R') + ' ' + t('on')], [false, t('m.R') + ' ' + t('off')]], bj: [[1.5, 'BJ 3:2'], [1.2, 'BJ 6:5']], das: [[true, 'DAS ' + t('on')], [false, 'DAS ' + t('off')]] };
  return `<div class="tl-ctl">${seg('tv', B.ORDER.map(v => [v, A.vName(v)]), W.v)}${seg('tdk', B.DECKS.map(d => [d, t('o.deckN', { n: d })]), p.decks)}` +
    opts.filter(k => OV[k]).map(k => seg('to-' + k, OV[k].map(([v, l]) => [String(v), l]), String(p[k]))).join('') + `</div>`;
}
function wireRules(M) {
  M.querySelectorAll('[data-tv]').forEach(b => b.onclick = () => { W.v = b.dataset.tv; W.p = JSON.parse(JSON.stringify(A.prefOf(W.v))); render(); });
  M.querySelectorAll('[data-tdk]').forEach(b => b.onclick = () => { W.p.decks = +b.dataset.tdk; render(); });
  ['h17', 'surr', 'bj', 'das'].forEach(k => M.querySelectorAll(`[data-to-${k}]`).forEach(b => b.onclick = () => { const raw = b.getAttribute('data-to-' + k); W.p[k] = k === 'bj' ? +raw : raw === 'true'; render(); }));
}

/* ---------- 基本戦略表 ---------- */
function chartTab() {
  const R = curRules(), leg = ['H', 'S', 'D', 'Ds', 'P', 'R', 'Rs'].filter(c => R.surr || c[0] !== 'R');
  return rulesBar() + `<div class="tl3 chart-w"><div class="tl-box"><span class="lab">${esc(t('ch.h'))}</span>${A.chartHtml(R, 'h')}</div>` +
    `<div class="tl-box"><span class="lab">${esc(t('ch.s'))}</span>${A.chartHtml(R, 's')}<span class="lab tl-gap">${esc(t('ch.p'))}</span>${A.chartHtml(R, 'p')}</div>` +
    `<div class="tl-col"><div class="tl-box"><span class="lab">${esc(t('tl.legend'))}</span><ul class="tl-leg">${leg.map(c => `<li><i class="cc-${c.toLowerCase()}">${c}</i>${esc(t('tl.c.' + c))}</li>`).join('')}</ul></div>` +
    `<div class="tl-box"><span class="lab">${esc(t('tl.edgeNow'))}</span><div class="tl-big">${pct(B.houseEdge(R))}</div><p class="diff-desc">${esc(t('tl.chartHelp'))}</p></div>` +
    `<div class="tl-box"><span class="lab">${esc(t('tl.keys'))}</span><ol class="tl-steps">${[1, 2, 3, 4, 5, 6].map(i => `<li>${esc(t('tl.key' + i))}</li>`).join('')}</ol></div></div></div>`;
}

/* ---------- ハウスエッジ ---------- */
function edgeTab() {
  const R = curRules(), base = B.houseEdge(R);
  // the effect of each rule: flip it and compare
  const flips = [['h17', 'tl.e.h17'], ['surr', 'tl.e.surr'], ['bj', 'tl.e.bj'], ['das', 'tl.e.das']].filter(([k]) => B.VARIANTS[W.v].opts.includes(k)).map(([k, lab]) => {
    const p2 = Object.assign({}, W.p); p2[k] = k === 'bj' ? (W.p.bj === 1.2 ? 1.5 : 1.2) : !W.p[k];
    const e2 = B.houseEdge(B.rulesOf(W.v, p2)); return { k, lab, cur: W.p[k], d: base - e2 };
  });
  const decks = B.DECKS.map(d => { const p2 = Object.assign({}, W.p, { decks: d }); return [d, B.houseEdge(B.rulesOf(W.v, p2))]; });
  const mx = Math.max(...decks.map(x => x[1]), .001);
  const fl = flips.map(f => `<div class="kv"><span>${esc(t(f.lab + '.' + (f.k === 'bj' ? (f.cur === 1.2 ? '65' : '32') : f.cur ? 'on' : 'off')))}</span><b class="${f.d > 0 ? 'neg' : 'pos'}">${f.d > 0 ? '+' : '−'}${Math.abs(f.d * 100).toFixed(2)}%</b></div>`).join('');
  const vars = B.ORDER.map(v => { const e = B.houseEdge(B.rulesOf(v, A.prefOf(v))); return `<div class="ec-r${v === W.v ? ' sel' : ''}"><b>${esc(A.vName(v))}</b><span class="ec-b"><i style="width:${Math.min(100, e / .025 * 100).toFixed(1)}%"></i><em>${pct(e)}</em></span></div>`; }).join('');
  const se = B.sideEdges(R), sides = B.SIDEBETS[W.v].map(k => `<div class="kv"><span>${esc(t('sp.' + k))}</span><b class="neg">${pct(se[k])}</b></div>`).join('');
  const hour = [['tl.h.basic', base], ['tl.h.gut', .025], ['tl.h.nobust', .05]].map(([k, e]) => `<div class="kv"><span>${esc(t(k))}</span><b class="neg">−${fmt(Math.round(e * 80 * 100))}</b></div>`).join('');
  return rulesBar() + `<div class="tl2"><div class="tl-col"><div class="tl-box"><span class="lab">${esc(t('tl.edgeNow'))}</span><div class="tl-big">${pct(base)}</div><p class="diff-desc">${esc(t('tl.edgeHelp'))}</p></div>` +
    `<div class="tl-box"><span class="lab">${esc(t('tl.ruleFx'))}</span>${fl || `<p class="muted">—</p>`}<p class="diff-desc">${esc(t('tl.ruleFxHelp'))}</p></div>` +
    `<div class="tl-box"><span class="lab">${esc(t('tl.decks'))}</span><div class="ec">${decks.map(([d, e]) => `<div class="ec-r${d === W.p.decks ? ' sel' : ''}"><b>${esc(t('o.deckN', { n: d }))}</b><span class="ec-b"><i style="width:${(e / mx * 100).toFixed(1)}%"></i><em>${pct(e)}</em></span></div>`).join('')}</div></div></div>` +
    `<div class="tl-col"><div class="tl-box"><span class="lab">${esc(t('tl.vars'))}</span><div class="ec">${vars}</div><p class="diff-desc">${esc(t('tl.varsHelp'))}</p></div>` +
    `<div class="tl-box"><span class="lab">${esc(t('tl.sides'))}</span>${sides}<p class="diff-desc">${esc(t('tl.sidesHelp'))}</p></div>` +
    `<div class="tl-box"><span class="lab">${esc(t('tl.hour'))}</span>${hour}<p class="diff-desc">${esc(t('tl.hourHelp'))}</p></div></div></div>`;
}

/* ---------- カウンティング ---------- */
function countTab() {
  const R = curRules(), base = -B.houseEdge(R);
  const tcs = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  const pts = tcs.map(tc => { const p = B.countComp(R, tc); return { tc, e: B.roundEV(p, R), ins: 3 * p[10] - 1 }; });
  const lo = Math.min(...pts.map(x => Math.min(x.e, x.ins))), hi = Math.max(...pts.map(x => Math.max(x.e, x.ins)), .01), Wd = 300, Hd = 150;
  const X = i => 16 + i / (tcs.length - 1) * (Wd - 24), Y = v => Hd - 12 - (v - lo) / ((hi - lo) || 1) * (Hd - 24);
  const line = k => pts.map((q, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(q[k]).toFixed(1)}`).join('');
  const svg = `<svg class="tl-chart" viewBox="0 0 ${Wd} ${Hd}"><line class="z" x1="10" x2="${Wd}" y1="${Y(0)}" y2="${Y(0)}"/>` +
    tcs.map((tc, i) => `<text class="ax" x="${X(i)}" y="${Hd - 1}">${tc > 0 ? '+' : ''}${tc}</text>`).join('') +
    `<path class="l1" d="${line('e')}"/><path class="l2" d="${line('ins')}"/>${pts.map((q, i) => `<circle class="p1" cx="${X(i)}" cy="${Y(q.e)}" r="2.6"/>`).join('')}</svg>`;
  const vals = [[2, 6, '+1', 'up'], [7, 9, '0', ''], [10, 11, '−1', 'dn']].map(([a, b, v, c]) => `<div class="hl-g ${c}"><span>${a === 10 ? '10 J Q K A' : a + '〜' + b}</span><b>${v}</b></div>`).join('');
  const even = pts.find(q => q.e > 0), insOk = pts.find(q => q.ins > 0);
  const ramp = [[1, '$100'], [2, '$200'], [3, '$400'], [4, '$600'], ['5+', '$800']].map(([c, b]) => `<div class="kv"><span>${esc(t('tl.tcN', { n: c }))}</span><b>${b}</b></div>`).join('');
  return rulesBar() + `<div class="tl2"><div class="tl-col"><div class="tl-box"><span class="lab">${esc(t('tl.hilo'))}</span><div class="hl-row">${vals}</div><p class="diff-desc">${esc(t('tl.hiloHelp'))}</p></div>` +
    `<div class="tl-box"><span class="lab">${esc(t('tl.ramp'))}</span>${ramp}<p class="diff-desc">${esc(t('tl.rampHelp'))}</p></div></div>` +
    `<div class="tl-col"><div class="tl-box"><span class="lab">${esc(t('tl.byTc'))}</span>${svg}<div class="tl-lg"><span class="l1">${esc(t('tl.lgEdge'))}</span><span class="l2">${esc(t('tl.lgIns'))}</span></div>` +
    `<table class="tl-tbl"><tr><th>TC</th>${pts.filter((_, i) => i % 2 === 0).map(q => `<th>${q.tc > 0 ? '+' : ''}${q.tc}</th>`).join('')}</tr><tr><td>${esc(t('tl.lgEdge'))}</td>${pts.filter((_, i) => i % 2 === 0).map(q => `<td class="${q.e > 0 ? 'up' : 'dn'}">${A.spct(q.e, 1)}</td>`).join('')}</tr></table>` +
    `<p class="diff-desc">${esc(t('tl.byTcHelp', { b: A.spct(base, 2), e: even ? (even.tc > 0 ? '+' : '') + even.tc : '—', i: insOk ? '+' + insOk.tc : '—' }))}</p></div></div></div>`;
}

/* ---------- 戦い方の検証 ---------- */
const SIM = ['basic', 'gut', 'nobust', 'mimic'];
function simTab() {
  const S = W.sim, R = curRules();
  let res = '';
  if (S.res) {
    const mx = Math.max(...SIM.map(k => Math.abs(S.res[k].mean)), .01);
    res = `<div class="sim-r">${SIM.map(k => { const r = S.res[k], e = -r.mean, ci = 1.96 * r.sd / Math.sqrt(r.n);
      return `<div class="sim-row"><b>${esc(t('sim.' + k))}</b><span class="ec-b"><i style="width:${Math.min(100, Math.abs(r.mean) / mx * 100).toFixed(1)}%" class="${k === 'basic' ? 'best' : ''}"></i><em>${pct(e)} ±${(ci * 100).toFixed(2)}</em></span><small>${esc(t('sim.per', { n: fmt(Math.round(e * 100 * 100)) }))}</small></div>`; }).join('')}</div>` +
      `<p class="sy-note">${esc(t('sim.verdict', { a: pct(-S.res.basic.mean), b: pct(-S.res.mimic.mean), x: Math.max(1, Math.round(S.res.mimic.mean / (S.res.basic.mean || -.001))) }))}</p>`;
  }
  return rulesBar() + `<div class="tl2 sys"><div><div class="rl-list">` +
    `<div class="rl"><div class="rl-t"><b>${esc(t('sim.n'))}</b></div>${seg('sn', [[5000, '5,000'], [20000, '20,000'], [100000, '100,000']], S.n)}</div></div>` +
    `<ul class="sim-d">${SIM.map(k => `<li><b>${esc(t('sim.' + k))}</b><span>${esc(t('sim.d.' + k))}</span></li>`).join('')}</ul>` +
    `<div class="tl-go"><button class="mbtn go" id="simRun"${S.running ? ' disabled' : ''}>${esc(t(S.running ? 'sim.running' : 'sim.run'))}</button></div></div>` +
    `<div>${res || `<p class="muted">${esc(t('sim.help'))}</p>`}<p class="diff-desc">${esc(t('sim.note', { e: pct(B.houseEdge(R)) }))}</p></div></div>`;
}
function runSim() {
  const S = W.sim, R = curRules(); if (S.running) return;
  S.running = true; S.res = null; render();
  const out = {}; let i = 0;
  const step = () => { const k = SIM[i]; out[k] = B.simulate(R, k, S.n, 1000 + i * 7919 + Math.floor(Math.random() * 1e6)); i++;
    if (i < SIM.length) setTimeout(step, 10); else { S.res = out; S.running = false; A.sfx('chips'); if ($('#toolsOverlay').classList.contains('show')) render(); } };
  setTimeout(step, 30);
}

function render() {
  ensure();
  const M = $('#toolsModal'), sb = M.querySelector('.tl-body'), keep = sb && tab === lastTab ? sb.scrollTop : 0; lastTab = tab;
  const tabs = ['chart', 'edge', 'count', 'sim'].map(k => `<button type="button" class="${k === tab ? 'sel' : ''}" data-tt="${k}">${esc(t('tl.' + k))}</button>`).join('');
  const body = tab === 'chart' ? chartTab() : tab === 'edge' ? edgeTab() : tab === 'count' ? countTab() : simTab();
  M.innerHTML = `<h2>${esc(t('tl.h'))}</h2><div class="ng-tabs bc-tt">${tabs}</div><div class="tl-body">${body}</div><div class="modal-actions"><button class="mbtn go" id="tlClose">${esc(t('close'))}</button></div>`;
  if (keep) M.querySelector('.tl-body').scrollTop = keep;
  M.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => { tab = b.dataset.tt; render(); });
  $('#tlClose').onclick = () => A.closeOv('#toolsOverlay');
  wireRules(M);
  if (tab === 'sim') { M.querySelectorAll('[data-sn]').forEach(b => b.onclick = () => { W.sim.n = +b.dataset.sn; W.sim.res = null; render(); }); const r = $('#simRun'); if (r) r.onclick = runSim; }
}
function open(k) { if (k) tab = k; W.v = null; ensure(); render(); A.openOv('#toolsOverlay'); }
window.BJTools = { open };
})();
