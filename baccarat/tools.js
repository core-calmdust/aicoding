/* バカラ — research tools (baccarat/tools.js)
   シュー解析: exact odds / EV of every bet for the remaining cards, and a what-if composition (add / remove cards).
   3枚目ルール: the Player rule and the Banker tableau (grid). 期待値の表: payouts, probabilities, house edge by variant.
   必勝法の検証: Monte Carlo of betting systems (flat, Martingale, Paroli, 1-3-2-6, Fibonacci, d'Alembert).
   罫線の読み方: the five roads on a sample shoe, with what they do (and do not) say. */
(function () {
'use strict';
const A = window.BacApp, B = window.BC, RD = window.BCRoads, $ = s => document.querySelector(s);
const t = (k, v) => A.t(k, v), esc = s => A.esc(s), pct = A.pct, fmt = A.fmt;
let tab = 'shoe', lastTab = '';
const W = { comp: null, v: null, tie: null, ev: null, decks: null, sys: { s: 'martin', side: 'B', base: 100, bank: 10000, hands: 100, res: null } };
const VAL_LAB = ['10/J/Q/K', 'A', '2', '3', '4', '5', '6', '7', '8', '9'];
const vOf = rc => { const v = Array(10).fill(0); for (let r = 1; r <= 13; r++) v[r >= 10 ? 0 : r] += rc[r]; return v; };

/* ---------- シュー解析 ---------- */
function shoeHtml() {
  const T = A.T; if (!W.comp) W.comp = B.counts(T.shoe);
  const rc = W.comp, v = vOf(rc), N = v.reduce((a, b) => a + b, 0), full = 4 * T.decks, fullV = [16 * T.decks].concat(Array(9).fill(full));
  const R = B.odds(rc), E = B.evs(R, T.v, { tie: T.tie }), base = A.baseOdds(T.v, T.tie, T.decks).E;
  const bars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(i => { const share = N ? v[i] / N : 0, norm = fullV[i] / (52 * T.decks), d = share - norm;
    return `<div class="sh-b"><span class="sh-bar"><i style="height:${Math.min(100, share / .35 * 100).toFixed(1)}%"></i><em style="bottom:${(norm / .35 * 100).toFixed(1)}%"></em></span><b>${i === 0 ? '0' : i === 1 ? 'A' : i}</b><small>${v[i]}</small><span class="sh-pm"><button type="button" data-cv="${i}" data-d="-1" aria-label="−">−</button><button type="button" data-cv="${i}" data-d="1" aria-label="+">＋</button></span><em class="${d > .004 ? 'up' : d < -.004 ? 'dn' : ''}">${d >= 0 ? '+' : ''}${(d * 100).toFixed(1)}</em></div>`; }).join('');
  const row = k => { const e = E[k], b = base[k]; return `<tr class="${e > 0 ? 'plus' : ''}"><td>${esc(t(A.SPOTS[k]))}</td><td>${pct(B.winP(R, k), 2)}</td><td><b>${(e * 100).toFixed(3)}%</b></td><td class="${e - b > .0002 ? 'up' : e - b < -.0002 ? 'dn' : ''}">${e - b >= 0 ? '+' : ''}${((e - b) * 100).toFixed(3)}</td></tr>`; };
  return `<div class="tl2"><div><div class="tl-h"><span class="lab">${esc(t('tl.comp', { n: N }))}</span><span class="tl-btns"><button type="button" class="szb" id="cmpNow">${esc(t('tl.compNow'))}</button><button type="button" class="szb" id="cmpFull">${esc(t('tl.compFull', { n: T.decks }))}</button></span></div>` +
    `<div class="sh-bars">${bars}</div><p class="diff-desc">${esc(t('tl.compHelp'))}</p></div>` +
    `<div><span class="lab">${esc(t('tl.evNow', { v: A.vName(T.v) }))}</span><div class="pr3 lg"><div class="pB"><small>${esc(t('rd.B'))}</small><b>${pct(R.B)}</b></div><div class="pP"><small>${esc(t('rd.P'))}</small><b>${pct(R.P)}</b></div><div class="pT"><small>${esc(t('rd.T'))}</small><b>${pct(R.T)}</b></div></div>` +
    `<table class="tl-tbl"><tr><th>${esc(t('ev.bet'))}</th><th>${esc(t('tl.winp'))}</th><th>${esc(t('ev.now'))}</th><th>${esc(t('ev.diff'))}</th></tr>${B.VARIANTS[T.v].bets.map(row).join('')}</table>` +
    `<p class="diff-desc">${esc(t('tl.countNote'))}</p></div></div>`;
}

/* ---------- 3枚目ルール ---------- */
function ruleHtml() {
  const T = A.T, c = T.coup && T.phase === 'done' ? T.coup : null;
  const p3 = c && c.p.length === 3 ? B.VAL(c.p[2]) : null, b0 = c ? B.total(c.b.slice(0, 2)) : null, pDrew = c && c.p.length === 3, nat = c && c.natural;
  const head = `<tr><th>${esc(t('tl.bTot'))}</th><th class="stood">${esc(t('tl.pStood'))}</th>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(p => `<th>${p}</th>`).join('')}</tr>`;
  const rows = [0, 1, 2, 3, 4, 5, 6, 7].map(bt => `<tr><th>${bt}</th>` + [null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(p => {
    const d = B.bankerDraws(bt, p), last = c && !nat && b0 === bt && ((p == null && !pDrew) || (p != null && p === p3));
    return `<td class="${d ? 'dr' : 'st'}${p == null ? ' stood' : ''}${last ? ' last' : ''}">${[...t(d ? 'tl.draw' : 'tl.stand')][0]}</td>`; }).join('') + `</tr>`).join('');
  return `<div class="tl2 rule"><div><span class="lab">${esc(t('tl.pRule'))}</span><div class="pr-rule">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<span class="${n <= 5 ? 'dr' : n <= 7 ? 'st' : 'nat'}"><b>${n}</b><small>${esc(n <= 5 ? t('tl.draw') : n <= 7 ? t('tl.stand') : t('natural'))}</small></span>`).join('')}</div>` +
    `<ol class="tl-steps">${['tl.r1', 'tl.r2', 'tl.r3', 'tl.r4'].map(k => `<li>${esc(t(k))}</li>`).join('')}</ol></div>` +
    `<div><span class="lab">${esc(t('tl.bRule'))}</span><table class="tb-grid">${head}${rows}</table><p class="diff-desc">${esc(t('tl.gridHelp'))}</p>${c ? `<p class="diff-desc">${esc(nat ? t('tl.lastNat') : t('tl.lastHl'))}</p>` : ''}</div></div>`;
}

/* ---------- 期待値の表 ---------- */
function edgeHtml() {
  const T = A.T; W.ev = W.ev || T.v; W.tie = W.tie || T.tie; W.decks = W.decks || T.decks;
  const R = B.odds(B.fullCounts(W.decks)), E = B.evs(R, W.ev, { tie: W.tie });
  const pay = k => k === 'P' ? '1 : 1' : k === 'B' ? (W.ev === 'classic' ? '0.95 : 1' : W.ev === 'nocomm' ? t('pay.b6') : t('pay.b7')) : k === 'T' ? W.tie + ' : 1' : k === 'D7' ? '40 : 1' : k === 'P8' ? '25 : 1' : '11 : 1';
  const rows = B.VARIANTS[W.ev].bets.map(k => { const e = -E[k]; return `<tr><td>${esc(t(A.SPOTS[k]))}</td><td>${esc(pay(k))}</td><td>${pct(B.winP(R, k))}</td><td><span class="eb"><i style="width:${Math.min(100, e / .15 * 100).toFixed(1)}%"></i></span><b>${pct(e, 2)}</b></td><td>−${fmt(Math.round(e * 10000))}</td></tr>`; }).join('');
  const segV = B.ORDER.map(v => `<button type="button" class="${v === W.ev ? 'sel' : ''}" data-ev="${v}">${esc(A.vName(v))}</button>`).join('');
  return `<div class="tl-edge"><div class="tl-ctl"><div class="seg">${segV}</div><div class="seg">${[8, 9].map(x => `<button type="button" class="${x === W.tie ? 'sel' : ''}" data-et="${x}">${esc(t('spot.T'))} ${x}:1</button>`).join('')}</div><div class="seg">${[8, 6].map(x => `<button type="button" class="${x === W.decks ? 'sel' : ''}" data-ed="${x}">${esc(t('o.deckN', { n: x }))}</button>`).join('')}</div></div>` +
    `<table class="tl-tbl wide"><tr><th>${esc(t('ev.bet'))}</th><th>${esc(t('tl.pay'))}</th><th>${esc(t('tl.winp'))}</th><th>${esc(t('tl.edge'))}</th><th>${esc(t('tl.per10k'))}</th></tr>${rows}</table>` +
    `<div class="pr3 lg"><div class="pB"><small>${esc(t('rd.B'))}</small><b>${pct(R.B)}</b></div><div class="pP"><small>${esc(t('rd.P'))}</small><b>${pct(R.P)}</b></div><div class="pT"><small>${esc(t('rd.T'))}</small><b>${pct(R.T)}</b></div></div>` +
    `<p class="diff-desc">${esc(t('tl.edgeHelp.' + W.ev))}</p><p class="diff-desc">${esc(t('tl.edgeHelp'))}</p></div>`;
}

/* ---------- 必勝法の検証 (Monte Carlo) ---------- */
const SYS = ['flat', 'martin', 'paroli', 'p1326', 'fibo', 'dalem'];
function simulate(o) {
  const R = B.odds(B.fullCounts(8)), pB = R.B, pP = R.P;   // independent coups (an endless shoe): what systems really face
  const win = o.side === 'B' ? pB : pP, lose = o.side === 'B' ? pP : pB, payW = o.side === 'B' ? .95 : 1;
  const N = 2000, out = [], rnd = B.mulberry(12345);
  let wagAll = 0, bust = 0, ahead = 0;
  for (let s = 0; s < N; s++) {
    let bank = o.bank, unit = 1, step = 0, fib = [1, 1], fi = 0, wag = 0;
    for (let h = 0; h < o.hands; h++) {
      let mult = o.s === 'flat' ? 1 : o.s === 'martin' ? unit : o.s === 'paroli' ? [1, 2, 4][step] : o.s === 'p1326' ? [1, 3, 2, 6][step] : o.s === 'fibo' ? fib[fi] : unit;
      let bet = o.base * mult; if (bet > bank) bet = bank; if (bet < 1) { break; }
      wag += bet;
      const r = rnd(), res = r < win ? 1 : r < win + lose ? -1 : 0;
      if (res === 1) bank += bet * payW; else if (res === -1) bank -= bet;
      // next stake
      if (o.s === 'martin') unit = res === -1 ? Math.min(unit * 2, 1e9) : res === 1 ? 1 : unit;
      else if (o.s === 'paroli') step = res === 1 ? (step + 1) % 3 : res === -1 ? 0 : step;
      else if (o.s === 'p1326') step = res === 1 ? (step + 1) % 4 : res === -1 ? 0 : step;
      else if (o.s === 'fibo') { if (res === -1) { fi++; while (fib.length <= fi) fib.push(fib[fib.length - 1] + fib[fib.length - 2]); } else if (res === 1) fi = Math.max(0, fi - 2); }
      else if (o.s === 'dalem') unit = res === -1 ? unit + 1 : res === 1 ? Math.max(1, unit - 1) : unit;
      if (bank < o.base) { bust++; break; }
    }
    out.push(bank - o.bank); wagAll += wag; if (bank > o.bank) ahead++;
  }
  out.sort((a, b) => a - b);
  const avg = out.reduce((a, b) => a + b, 0) / N;
  return { avg, med: out[N >> 1], ahead: ahead / N, bust: bust / N, wag: wagAll / N, real: -avg / (wagAll / N), min: out[0], max: out[N - 1], out };
}
function sysHtml() {
  const S = W.sys;
  const opt = (lab, html) => `<div class="rl"><div class="rl-t"><b>${esc(lab)}</b></div>${html}</div>`;
  const seg = (attr, items, cur) => `<div class="seg">${items.map(([v, l]) => `<button type="button" class="${String(v) === String(cur) ? 'sel' : ''}" data-${attr}="${v}">${esc(l)}</button>`).join('')}</div>`;
  let res = '';
  if (S.res) {
    const r = S.res, lo = r.min, hi = Math.max(r.max, 1), bins = 30, hist = Array(bins).fill(0);
    r.out.forEach(x => { hist[Math.min(bins - 1, Math.floor((x - lo) / ((hi - lo) || 1) * bins))]++; });
    const mxh = Math.max(...hist), zx = (0 - lo) / ((hi - lo) || 1) * 300;
    res = `<div class="sy-res"><div class="st-grid"><div><small>${esc(t('sy.avg'))}</small><b class="${r.avg >= 0 ? 'pos' : 'neg'}">${A.fmt(Math.round(r.avg))}</b></div><div><small>${esc(t('sy.med'))}</small><b>${A.fmt(Math.round(r.med))}</b></div><div><small>${esc(t('sy.ahead'))}</small><b>${pct(r.ahead, 1)}</b></div><div><small>${esc(t('sy.bust'))}</small><b class="${r.bust > .05 ? 'neg' : ''}">${pct(r.bust, 1)}</b></div><div><small>${esc(t('sy.wag'))}</small><b>${A.fmt(Math.round(r.wag))}</b></div><div><small>${esc(t('sy.real'))}</small><b>${pct(r.real, 2)}</b></div></div>` +
      `<svg class="sy-hist" viewBox="0 0 300 90" preserveAspectRatio="none">${hist.map((n, i) => `<rect x="${i * 10 + 1}" y="${90 - n / mxh * 86}" width="8" height="${n / mxh * 86}" class="${(lo + (i + .5) * (hi - lo) / bins) >= 0 ? 'w' : 'l'}"/>`).join('')}<line x1="${zx}" x2="${zx}" y1="0" y2="90" class="z"/></svg>` +
      `<p class="sy-note">${esc(t('sy.verdict.' + S.s, { a: pct(r.ahead, 0), b: pct(r.bust, 1) }))}</p></div>`;
  }
  return `<div class="tl2 sys"><div><div class="rl-list">` + opt(t('sy.sys'), `<select id="sySel">${SYS.map(s => `<option value="${s}"${s === S.s ? ' selected' : ''}>${esc(t('sy.n.' + s))}</option>`).join('')}</select>`) +
    opt(t('sy.side'), seg('sside', [['B', t('spot.B')], ['P', t('spot.P')]], S.side)) + opt(t('sy.base'), seg('sbase', [[25, '25'], [100, '100'], [500, '500']], S.base)) +
    opt(t('sy.bank'), seg('sbank', [[5000, '5,000'], [10000, '10,000'], [50000, '50,000']], S.bank)) + opt(t('sy.hands'), seg('shands', [[50, '50'], [100, '100'], [300, '300']], S.hands)) + `</div>` +
    `<p class="sy-desc">${esc(t('sy.d.' + S.s))}</p><div class="tl-go"><button class="mbtn go" id="syRun">${esc(t('sy.run'))}</button></div></div><div>${res || `<p class="muted">${esc(t('sy.help'))}</p>`}<p class="diff-desc">${esc(t('sy.note'))}</p></div></div>`;
}

/* ---------- 罫線の読み方 ---------- */
const SAMPLE = 'BBPTPPPBBBBBBPBPBPPTBBPPPPBPB'.split('').map((w, i) => ({ w, pp: i === 4 ? 1 : 0, bp: i === 9 ? 1 : 0 }));
function roadsHtml() {
  const RB = RD.build(SAMPLE), L = { B: t('rd.B'), P: t('rd.P'), T: t('rd.T') };
  const box = (k, svg) => `<div class="rx"><div class="rx-h"><b>${esc(t('rx.' + k))}</b></div><div class="rx-svg">${svg}</div><p>${esc(t('rx.' + k + '.d'))}</p></div>`;
  return `<div class="rx-wrap"><p class="rx-lead">${esc(t('rx.lead'))}</p>` +
    box('bead', RD.beadSvg(SAMPLE, 9, L)) + box('big', RD.bigSvg(RB.big, 22, 'big', RB.lead)) + box('eye', RD.bigSvg(RB.eye, 22, 'eye')) + box('small', RD.bigSvg(RB.small, 22, 'small')) + box('roach', RD.bigSvg(RB.roach, 22, 'roach')) +
    `<div class="rx"><div class="rx-h"><b>${esc(t('rx.ask'))}</b></div><div class="rd-ask">${['B', 'P'].map(w => `<div class="ask a${w}"><b>${esc(L[w])}</b>${RD.askSvg(RB.ask[w])}</div>`).join('')}</div><p>${esc(t('rx.ask.d'))}</p></div>` +
    `<p class="rx-warn">⚠️ ${esc(t('rx.warn'))}</p></div>`;
}

function render() {
  const M = $('#toolsModal'), sb = M.querySelector('.tl-body'), keep = sb && tab === lastTab ? sb.scrollTop : 0; lastTab = tab;
  const tabs = ['shoe', 'rule', 'edge', 'sys', 'roads'].map(k => `<button type="button" class="${k === tab ? 'sel' : ''}" data-tt="${k}">${esc(t('tl.' + k))}</button>`).join('');
  const body = tab === 'shoe' ? shoeHtml() : tab === 'rule' ? ruleHtml() : tab === 'edge' ? edgeHtml() : tab === 'sys' ? sysHtml() : roadsHtml();
  M.innerHTML = `<h2>${esc(t('tl.h'))}</h2><div class="ng-tabs bc-tt">${tabs}</div><div class="tl-body">${body}</div><div class="modal-actions"><button class="mbtn go" id="tlClose">${esc(t('close'))}</button></div>`;
  if (keep) M.querySelector('.tl-body').scrollTop = keep;
  M.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => { tab = b.dataset.tt; render(); });
  $('#tlClose').onclick = () => A.closeOv('#toolsOverlay');
  if (tab === 'shoe') {
    M.querySelectorAll('[data-cv]').forEach(b => b.onclick = () => { const i = +b.dataset.cv, d = +b.dataset.d, rs = i === 0 ? [10, 11, 12, 13] : [i];
      if (d < 0) { const r = rs.filter(x => W.comp[x] > 0).sort((a, b2) => W.comp[b2] - W.comp[a])[0]; if (r) W.comp[r]--; } else { const r = rs.sort((a, b2) => W.comp[a] - W.comp[b2])[0]; if (W.comp[r] < 4 * A.T.decks) W.comp[r]++; }
      render(); });
    $('#cmpNow').onclick = () => { W.comp = B.counts(A.T.shoe); render(); };
    $('#cmpFull').onclick = () => { W.comp = B.fullCounts(A.T.decks); render(); };
  } else if (tab === 'edge') {
    M.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => { W.ev = b.dataset.ev; render(); });
    M.querySelectorAll('[data-et]').forEach(b => b.onclick = () => { W.tie = +b.dataset.et; render(); });
    M.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => { W.decks = +b.dataset.ed; render(); });
  } else if (tab === 'sys') {
    const S = W.sys;
    $('#sySel').onchange = e => { S.s = e.target.value; S.res = null; render(); };
    M.querySelectorAll('[data-sside]').forEach(b => b.onclick = () => { S.side = b.dataset.sside; S.res = null; render(); });
    M.querySelectorAll('[data-sbase]').forEach(b => b.onclick = () => { S.base = +b.dataset.sbase; S.res = null; render(); });
    M.querySelectorAll('[data-sbank]').forEach(b => b.onclick = () => { S.bank = +b.dataset.sbank; S.res = null; render(); });
    M.querySelectorAll('[data-shands]').forEach(b => b.onclick = () => { S.hands = +b.dataset.shands; S.res = null; render(); });
    $('#syRun').onclick = () => { S.res = simulate(S); A.sfx('chips'); render(); };
  }
  fitHeight(M);
}
let fitH = 0;
function fitHeight(M) {   // PC: one height for every tab (the tallest: 罫線の読み方)
  if (!matchMedia('(min-width:761px)').matches) { M.style.removeProperty('--tl-h'); return; }
  if (!fitH) { const body = M.querySelector('.tl-body'), pr = document.createElement('div'); pr.className = 'tl-body'; pr.style.cssText = 'position:absolute;visibility:hidden;left:0;right:0;top:0;height:auto;max-height:none;overflow:visible'; pr.innerHTML = roadsHtml(); body.parentNode.appendChild(pr); const h = Math.ceil(pr.scrollHeight); pr.remove(); if (h < 200) return; fitH = h + 4; }
  M.style.setProperty('--tl-h', fitH + 'px');
}
addEventListener('resize', () => { fitH = 0; });
function open(k) { if (k) tab = k; W.comp = null; render(); A.openOv('#toolsOverlay'); fitHeight($('#toolsModal')); }
window.BacTools = { open, simulate };
})();
