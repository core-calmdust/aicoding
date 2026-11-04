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
  const yn = [[true, t('on')], [false, t('off')]];
  const OV = { h17: [t('tl.g.h17'), [[false, 'S17'], [true, 'H17']]], surr: [t('m.R'), yn], bj: ['BJ', [[1.5, '3:2'], [1.2, '6:5']]], das: [t('tl.g.das'), yn] };
  const grp = (lab, html, cls) => `<div class="tl-g${cls ? ' ' + cls : ''}"><small>${esc(lab)}</small>${html}</div>`;
  const mob = matchMedia('(max-width:760px)').matches, open = !mob || W.rOpen;
  const sum = [A.vName(W.v), t('o.deckN', { n: p.decks })].concat(opts.filter(k => OV[k]).map(k => { const o = OV[k][1].find(([v]) => String(v) === String(p[k])); return k === 'surr' || k === 'das' ? (p[k] ? OV[k][0] : '') : o ? o[1] : ''; })).filter(Boolean).join(' · ');
  return `<details class="tl-rd" id="tlRd"${open ? ' open' : ''}><summary><small>${esc(t('tl.g.rule'))}</small><b>${esc(sum)}</b></summary><div class="tl-rules">` + grp(t('tl.g.rule'), seg('tv', B.ORDER.map(v => [v, A.vName(v)]), W.v), 'wide') +
    `<div class="tl-opts">` + grp(t('o.decks'), seg('tdk', B.DECKS.map(d => [d, String(d)]), p.decks)) +
    opts.filter(k => OV[k]).map(k => grp(OV[k][0], seg('to-' + k, OV[k][1].map(([v, l]) => [String(v), l]), String(p[k])))).join('') + `</div></div></details>`;
}
function wireRules(M) {
  const rd = M.querySelector('#tlRd'); if (rd) rd.ontoggle = () => { if (matchMedia('(max-width:760px)').matches) W.rOpen = rd.open; };
  M.querySelectorAll('[data-tv]').forEach(b => b.onclick = () => { W.v = b.dataset.tv; W.p = JSON.parse(JSON.stringify(A.prefOf(W.v))); render(); });
  M.querySelectorAll('[data-tdk]').forEach(b => b.onclick = () => { W.p.decks = +b.dataset.tdk; render(); });
  ['h17', 'surr', 'bj', 'das'].forEach(k => M.querySelectorAll(`[data-to-${k}]`).forEach(b => b.onclick = () => { const raw = b.getAttribute('data-to-' + k); W.p[k] = k === 'bj' ? +raw : raw === 'true'; render(); }));
}

/* ---------- 基本戦略表 ---------- */
const KIND = { h: 'HARD TOTALS', s: 'SOFT TOTALS', p: 'PAIRS' };
const upLab = u => u === 11 || u === 1 ? 'A' : String(u);
function chartTable(R, k) {
  const sel = W.sel && W.sel.k === k ? W.sel : null;
  return `<table class="lx-ch" data-kind="${k}"><thead><tr><th class="cn">${esc(t('ch.' + k))}</th>${A.CH_UP.map(u => `<th>${upLab(u)}</th>`).join('')}</tr></thead><tbody>` +
    A.CH_ROWS[k].map(x => `<tr><th>${esc(A.rowLab(k, x))}</th>${A.CH_UP.map(u => { const c = B.chartCell(R, k, x, u); return `<td class="${A.cellCls(c)}${sel && sel.x === x && sel.u === u ? ' sel' : ''}" data-x="${x}" data-u="${u}">${c}</td>`; }).join('')}</tr>`).join('') + `</tbody></table>`;
}
function inspHtml(k, x, u) {
  const R = curRules(), c = B.cellEVs(R, k, x, u), ev = c.ev, ms = Object.keys(ev).sort((a, b) => ev[b] - ev[a]);
  const best = ms[0], second = ms[1], up = c.up, tot = B.hv(c.cards).t;
  const lo = Math.min(-1, ...ms.map(m => ev[m])), hi = Math.max(.6, ...ms.map(m => ev[m])), span = hi - lo, z = -lo / span * 100;
  const bar = v => { const a = (Math.min(v, 0) - lo) / span * 100, b = (Math.max(v, 0) - lo) / span * 100; return `<span class="lx-ev"><i class="zero" style="left:${z.toFixed(1)}%"></i><i class="b ${v >= 0 ? 'p' : 'n'}" style="left:${a.toFixed(1)}%;width:${Math.max(.6, b - a).toFixed(1)}%"></i></span>`; };
  const code = c.code, why = t(A.whyKey(c.cards, up, best), { u: upLab(u), t: tot });
  return `<div class="lx-k">${esc(t('tl.insp.h'))}</div>` +
    `<div class="lx-hand"><b>${esc(t('ch.' + k))} ${esc(A.rowLab(k, x))}</b><span>${esc(t('tl.insp.vs', { u: upLab(u) }))}</span></div>` +
    `<div class="lx-best"><i class="${A.cellCls(code)}">${code}</i><div><small>${esc(t('tl.insp.best'))}</small><b>${esc(['H', 'S', 'D', 'Ds', 'P', 'R', 'Rs'].includes(code) ? t('tl.c.' + code) : A.mName(best))}</b></div></div>` +
    `<div class="lx-evs">${ms.map(m => `<div class="lx-er${m === best ? ' top' : ''}"><span class="n">${esc(A.mName(m))}${m === best ? ' ◎' : ''}</span>${bar(ev[m])}<b class="${ev[m] > 0 ? 'pos' : ev[m] < 0 ? 'neg' : ''}">${A.spct(ev[m], 1)}</b></div>`).join('')}</div>` +
    (second ? `<p class="lx-gap">${esc(t('tl.insp.gap', { m: A.mName(second), d: pct(ev[best] - ev[second], 2) }))}</p>` : '') +
    `<p class="lx-why">${esc(why)}</p>`;
}
function chartTab() {
  const R = curRules(), leg = ['H', 'S', 'D', 'Ds', 'P', 'R', 'Rs'].filter(c => R.surr || c[0] !== 'R'), ct = W.ct || 'h';
  if (!W.sel || W.sel.k !== ct) W.sel = ct === 'h' ? { k: 'h', x: 16, u: 10 } : ct === 's' ? { k: 's', x: 7, u: 9 } : { k: 'p', x: 8, u: 10 };
  return rulesBar() + `<div class="lx-chart">` +
    `<section class="lx-p lx-main"><header class="lx-ph"><div class="lx-sub">${['h', 's', 'p'].map(k => `<button type="button" data-ct="${k}" class="${k === ct ? 'sel' : ''}">${esc(t('ch.' + k))}</button>`).join('')}</div></header>` +
    `<div class="lx-tw"><div class="lx-dl">${esc(t('tl.dealerUp'))}</div>${chartTable(R, ct)}</div>` +
    `<div class="lx-lf"><ul class="lx-leg">${leg.map(c => `<li><i class="${A.cellCls(c)}">${c}</i>${esc(t('tl.c.' + c))}</li>`).join('')}</ul><div class="lx-he"><small>${esc(t('tl.edge'))}</small><b>${pct(B.houseEdge(R))}</b></div></div></section>` +
    `<aside class="lx-side"><section class="lx-p lx-insp" id="lxInsp">${inspHtml(W.sel.k, W.sel.x, W.sel.u)}</section>` +
    `<section class="lx-p lx-keys"><div class="lx-k">${esc(t('tl.keys'))}</div><ol>${[1, 2, 3, 4, 5, 6].map(i => `<li>${esc(t('tl.key' + i))}</li>`).join('')}</ol></section></aside></div>`;
}
function wireChart(M) {
  const tb = M.querySelector('.lx-ch'), box = M.querySelector('#lxInsp'); if (!tb || !box) return;
  const mark = td => { tb.querySelectorAll('.hx').forEach(e => e.classList.remove('hx')); if (!td) return; const ci = td.cellIndex, tr = td.parentNode; tr.querySelectorAll('td,th').forEach(e => e.classList.add('hx')); tb.querySelectorAll('tr').forEach(r => { const e = r.children[ci]; if (e) e.classList.add('hx'); }); };
  const show = td => { box.innerHTML = inspHtml(tb.dataset.kind, +td.dataset.x, +td.dataset.u); };
  tb.querySelectorAll('td[data-x]').forEach(td => {
    td.onpointerenter = e => { if (e.pointerType !== 'mouse') return; mark(td); show(td); };
    td.onclick = () => { W.sel = { k: tb.dataset.kind, x: +td.dataset.x, u: +td.dataset.u }; tb.querySelectorAll('td.sel').forEach(e => e.classList.remove('sel')); td.classList.add('sel'); mark(td); show(td); if (matchMedia('(max-width:760px)').matches) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
  });
  tb.onpointerleave = () => { mark(null); const s0 = W.sel; box.innerHTML = inspHtml(s0.k, s0.x, s0.u); };
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
  const hr = Math.round(base * 80 * 100);
  const fx = flips.length ? flips.map(f => { const w = Math.min(50, Math.abs(f.d) / .016 * 50); return `<div class="lx-fx"><span class="n">${esc(t(f.lab + '.' + (f.k === 'bj' ? (f.cur === 1.2 ? '65' : '32') : f.cur ? 'on' : 'off')))}</span><span class="lx-dv"><i class="${f.d > 0 ? 'n' : 'p'}" style="${f.d > 0 ? 'left:50%' : 'right:50%'};width:${w.toFixed(1)}%"></i></span><b class="${f.d > 0 ? 'neg' : 'pos'}">${f.d > 0 ? '+' : '−'}${Math.abs(f.d * 100).toFixed(2)}%</b></div>`; }).join('') : `<p class="muted">—</p>`;
  const bars = (rows, mx) => `<div class="lx-bars">${rows.map(([lab, e, sel]) => `<div class="lx-br${sel ? ' sel' : ''}"><span class="n">${esc(lab)}</span><span class="lx-bt"><i style="width:${Math.max(1.5, e / mx * 100).toFixed(1)}%"></i></span><b>${pct(e)}</b></div>`).join('')}</div>`;
  const vr = B.ORDER.map(v => [A.vName(v), B.houseEdge(B.rulesOf(v, A.prefOf(v))), v === W.v]);
  return rulesBar() + `<div class="lx-edge">` +
    `<section class="lx-p lx-hero"><div class="lx-k">${esc(t('tl.edge'))}</div><div class="lx-hrow"><b class="lx-num xl">${pct(base)}</b><small>${esc(t('tl.edgeNow'))}</small></div>` +
    `<div class="lx-hour"><div class="lx-k">${esc(t('tl.hour'))}</div>${[['tl.h.basic', base], ['tl.h.gut', .025], ['tl.h.nobust', .05]].map(([k, e]) => `<div><span>${esc(t(k))}</span><b>−${fmt(Math.round(e * 80 * 100))}</b></div>`).join('')}</div></section>` +
    `<section class="lx-p lx-vars"><div class="lx-k">${esc(t('tl.vars'))}</div>${bars(vr, .025)}<p class="lx-note">${esc(t('tl.varsHelp'))}</p></section>` +
    `<section class="lx-p lx-c2"><div class="lx-k">${esc(t('tl.ruleFx'))}</div>${fx}<p class="lx-note">${esc(t('tl.ruleFxHelp'))}</p></section>` +
    `<section class="lx-p lx-c2"><div class="lx-k">${esc(t('tl.decks'))}</div>${bars(decks.map(([d, e]) => [t('o.deckN', { n: d }), e, d === W.p.decks]), mx)}</section>` +
    `<section class="lx-p lx-c2"><div class="lx-k">${esc(t('tl.sides'))}</div>${B.SIDEBETS[W.v].length ? bars(B.SIDEBETS[W.v].map(k => [t('sp.' + k), se[k], false]), .08) : '<p class="muted">—</p>'}<p class="lx-note">${esc(t('tl.sidesHelp'))}</p></section></div>`;
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
  return rulesBar() + `<div class="tl2 sys lx-sim"><section class="lx-p"><div class="rl-list">` +
    `<div class="rl"><div class="rl-t"><b>${esc(t('sim.n'))}</b></div>${seg('sn', [[5000, '5,000'], [20000, '20,000'], [100000, '100,000']], S.n)}</div></div>` +
    `<ul class="sim-d">${SIM.map(k => `<li><b>${esc(t('sim.' + k))}</b><span>${esc(t('sim.d.' + k))}</span></li>`).join('')}</ul>` +
    `<div class="tl-go"><button class="mbtn go" id="simRun"${S.running ? ' disabled' : ''}>${esc(t(S.running ? 'sim.running' : 'sim.run'))}</button></div></section>` +
    `<section class="lx-p">${res || `<p class="muted">${esc(t('sim.help'))}</p>`}<p class="diff-desc">${esc(t('sim.note', { e: pct(B.houseEdge(R)) }))}</p></section></div>`;
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
  M.classList.add('bjx'); M.innerHTML = `<h2>${esc(t('tl.h'))}</h2><div class="ng-tabs bc-tt">${tabs}</div><div class="tl-body">${body}</div><div class="modal-actions"><button class="mbtn go" id="tlClose">${esc(t('close'))}</button></div>`;
  if (keep) M.querySelector('.tl-body').scrollTop = keep;
  M.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => { tab = b.dataset.tt; render(); });
  $('#tlClose').onclick = () => A.closeOv('#toolsOverlay');
  wireRules(M);
  M.querySelectorAll('button[data-ct]').forEach(b => b.onclick = () => { W.ct = b.dataset.ct; render(); });
  if (tab === 'chart') wireChart(M);
  if (tab === 'sim') { M.querySelectorAll('[data-sn]').forEach(b => b.onclick = () => { W.sim.n = +b.dataset.sn; W.sim.res = null; render(); }); const r = $('#simRun'); if (r) r.onclick = runSim; }
}
function open(k) { if (k) tab = k; W.v = null; ensure(); render(); A.openOv('#toolsOverlay'); }
window.BJTools = { open };
})();
