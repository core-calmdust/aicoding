/* ポーカー — research tools (poker/tools.js)
   勝率計算機: any hands (or random / a top-x% range) and any board → win / tie / equity per player, exact when small;
   pot-odds & EV calculator; スターティングハンド表: 169 hands, equity vs 1–5 players and opening ranges by position; 役一覧. */
(function () {
'use strict';
const A = window.PokerApp, P = window.PK, E = window.PKE, $ = s => document.querySelector(s);
const t = (k, v) => A.t(k, v), esc = s => A.esc(s);
let tab = 'calc';
const C = { v: 'holdem', n: 2, hands: [[null, null], [null, null]], ranges: [null, null], board: [null, null, null, null, null], slot: { p: 0, k: 0 }, res: null, busy: false, pot: 100, call: 50 };
const RANGES = [null, 0.05, 0.1, 0.2, 0.3, 0.5];
const POS = { UTG: 0.15, HJ: 0.19, CO: 0.27, BTN: 0.45, SB: 0.38 };
const RS = '23456789TJQKA';
function holeN() { return P.VARIANTS[C.v].hole; }
function resize() {
  const n = holeN();
  C.hands = C.hands.slice(0, C.n).map(h => { const x = (h || []).slice(0, n); while (x.length < n) x.push(null); return x; });
  while (C.hands.length < C.n) C.hands.push(Array(n).fill(null));
  C.ranges = C.ranges.slice(0, C.n); while (C.ranges.length < C.n) C.ranges.push(null);
  if (C.v !== 'holdem' && C.v !== 'shortdeck') C.ranges = C.ranges.map(() => null);
  const deck = new Set(P.deckOf(P.VARIANTS[C.v].short));
  C.hands = C.hands.map(h => h.map(c => c != null && deck.has(c) ? c : null)); C.board = C.board.map(c => c != null && deck.has(c) ? c : null);
}
const used = () => new Set([].concat(...C.hands, C.board).filter(c => c != null));
const card = (c, act, attr) => c == null ? `<button type="button" class="ts${act ? ' act' : ''}" ${attr}>＋</button>` : `<button type="button" class="ts f s${P.SUIT(c)}${act ? ' act' : ''}" ${attr}>${P.vch(P.V(c))}<small>${'♠♥♦♣'[P.SUIT(c)]}</small></button>`;
function calcHtml() {
  const V = P.VARIANTS[C.v], u = used();
  const games = ['holdem', 'plo', 'shortdeck'].map(v => `<button type="button" class="${v === C.v ? 'sel' : ''}" data-cv="${v}">${esc(A.vName(v))}</button>`).join('');
  const rows = C.hands.map((h, p) => {
    const r = C.res, eq = r ? r.eq[p] : null;
    const rangeSel = (C.v === 'holdem' || C.v === 'shortdeck') && V.hole === 2 ? `<select data-rg="${p}" aria-label="${esc(t('tl.range'))}">${RANGES.map(x => `<option value="${x == null ? '' : x}"${C.ranges[p] === x ? ' selected' : ''}>${esc(x == null ? t('tl.rangeAny') : t('tl.rangeTop', { n: Math.round(x * 100) }))}</option>`).join('')}</select>` : '';
    const name = r && C.board.every(c => c != null) && h.every(c => c != null) ? t('hand.' + P.catOf(V.omaha ? P.bestOmaha(h, C.board, V.short) : P.evalCards(h.concat(C.board), V.short), V.short)) : '';
    return `<div class="tp"><span class="tp-n">${esc(t('tl.player', { n: p + 1 }))}</span><span class="tp-c">${h.map((c, k) => card(c, C.slot.p === p && C.slot.k === k, `data-sp="${p}" data-sk="${k}"`)).join('')}</span>${h.every(c => c == null) ? rangeSel : `<button type="button" class="szb" data-clr="${p}">✕</button>`}` +
      `<span class="tp-r">${eq != null ? `<span class="eqbar"><i class="w" style="width:${r.win[p] * 100}%"></i><i class="t" style="width:${r.tie[p] * 100}%"></i></span><b>${(eq * 100).toFixed(1)}%</b><small>${esc(t('tl.wt', { w: (r.win[p] * 100).toFixed(1), t: (r.tie[p] * 100).toFixed(1) }))}${name ? ' · ' + esc(name) : ''}</small>` : ''}</span></div>`;
  }).join('');
  const board = C.board.map((c, k) => card(c, C.slot.p === -1 && C.slot.k === k, `data-sp="-1" data-sk="${k}"`)).join('');
  const deck = P.deckOf(V.short);
  const picker = [0, 1, 2, 3].map(s => `<div class="pk-row">` + deck.filter(c => P.SUIT(c) === s).sort((a, b) => P.V(b) - P.V(a)).map(c => `<button type="button" class="pkc s${s}" data-pick="${c}"${u.has(c) ? ' disabled' : ''}>${P.vch(P.V(c))}<small>${'♠♥♦♣'[s]}</small></button>`).join('') + `</div>`).join('');
  const eq0 = C.res ? C.res.eq[0] : null, need = C.call / (C.pot + C.call || 1);
  return `<div class="tl-calc"><div class="tl-l"><div class="seg">${games}</div>` +
    `<div class="tl-sec"><span class="lab">${esc(t('tl.players'))}</span><span class="tl-np">${[2, 3, 4, 5, 6].map(n => `<button type="button" class="szb${n === C.n ? ' sel' : ''}" data-np="${n}">${n}</button>`).join('')}</span></div>` +
    `<div class="tps">${rows}</div><div class="tl-sec"><span class="lab">${esc(t('tl.board'))}</span><span class="tp-c">${board}</span><button type="button" class="szb" data-clr="b">✕</button></div>` +
    `<div class="tl-go"><button class="mbtn" id="tlClear">${esc(t('tl.clear'))}</button><button class="mbtn go" id="tlRun">${C.busy ? '<span class="spin s"></span>' : ''}${esc(t('tl.run'))}</button></div>` +
    (C.res ? `<p class="diff-desc">${esc(C.res.n > 50000 || C.res.exact ? t('tl.exact', { n: C.res.n.toLocaleString() }) : t('tl.mc', { n: C.res.n.toLocaleString() }))}</p>` : `<p class="diff-desc">${esc(t('tl.help'))}</p>`) +
    `</div><div class="tl-r"><span class="lab">${esc(t('tl.pick'))}</span><div class="picker">${picker}</div>` +
    `<div class="tl-odds"><span class="lab">${esc(t('tl.odds'))}</span><div class="od-in"><label>${esc(t('pot'))}<input type="number" id="odPot" min="0" value="${C.pot}"></label><label>${esc(t('tl.toCall'))}<input type="number" id="odCall" min="0" value="${C.call}"></label></div>` +
    `<div class="kv"><span>${esc(t('hud.need'))}</span><b>${(need * 100).toFixed(1)}%</b></div>` +
    (eq0 != null ? `<div class="kv"><span>${esc(t('tl.evCall'))}</span><b class="${eq0 * (C.pot + C.call) - C.call >= 0 ? 'pos' : 'neg'}">${(eq0 * (C.pot + C.call) - C.call).toFixed(1)}</b></div><div class="kv"><span>${esc(t('tl.verdict'))}</span><b>${esc(eq0 >= need ? t('tl.callOk') : t('tl.callNo'))}</b></div>` : `<p class="muted">${esc(t('tl.oddsHelp'))}</p>`) +
    `<p class="diff-desc">${esc(t('tl.rule24'))}</p></div></div></div>`;
}
function rangeHtml() {
  const n = C.rn || 1, pos = C.pos || 'BTN', sel = C.cell || 'AKs';
  const PRE = window.PK_PRE || {};
  const cells = E.ALLKEYS.map(k => {
    const eq = PRE[k] ? PRE[k][n - 1] / 1000 : E.preEq(k, n), base = 1 / (n + 1), x = Math.max(0, Math.min(1, (eq - base * .6) / (1 - base * .6)));
    const inR = E.PCT[k] <= POS[pos];
    return `<button type="button" class="rc${inR ? ' in' : ''}${k === sel ? ' sel' : ''}" data-cell="${k}" style="--x:${x.toFixed(2)}"><b>${k}</b><small>${Math.round(eq * 100)}</small></button>`;
  }).join('');
  const k = sel, eqs = PRE[k] || [1, 2, 3, 4, 5].map(j => Math.round(E.preEq(k, j) * 1000));
  const info = `<div class="rc-info"><b class="rc-k">${k}</b><span>${esc(t('tl.combos', { n: E.COMBOS(k) }))} · ${esc(t('tl.top', { n: (E.PCT[k] * 100).toFixed(1) }))}</span>` +
    `<div class="rc-eqs">${eqs.map((e, j) => `<div><small>${esc(t('tl.vsN', { n: j + 1 }))}</small><span class="eqbar"><i class="w" style="width:${e / 10}%"></i></span><b>${(e / 10).toFixed(1)}%</b></div>`).join('')}</div>` +
    `<p class="diff-desc">${esc(Object.keys(POS).filter(p => E.PCT[k] <= POS[p]).length ? t('tl.openFrom', { p: Object.keys(POS).filter(p => E.PCT[k] <= POS[p]).join(' · ') }) : t('tl.openNone'))}</p></div>`;
  return `<div class="tl-range"><div class="rg-l"><div class="rg-ctl"><span class="lab">${esc(t('tl.vs'))}</span><span>${[1, 2, 3, 4, 5].map(j => `<button type="button" class="szb${j === n ? ' sel' : ''}" data-rn="${j}">${j}</button>`).join('')}</span>` +
    `<span class="lab">${esc(t('tl.pos'))}</span><span>${Object.keys(POS).map(p => `<button type="button" class="szb${p === pos ? ' sel' : ''}" data-pos="${p}" title="${esc(t('tl.posName.' + p))}">${p}</button>`).join('')}</span></div>` +
    `<div class="rgrid">${cells}</div><p class="diff-desc">${esc(t('tl.rangeHelp', { p: pos, n: Math.round(POS[pos] * 100) }))}</p></div><div class="rg-r">${info}<p class="diff-desc">${esc(t('tl.posHelp'))}</p></div></div>`;
}
const EX = { sf: '9H 8H 7H 6H 5H', quads: 'QS QH QD QC 3S', full: 'KS KH KD 7C 7D', flush: 'AD JD 8D 5D 2D', straight: 'TS 9D 8C 7H 6S', trips: '7S 7H 7D KC 2S', two: 'JS JD 4C 4H AS', pair: 'TS TH KC 6D 3S', high: 'AS JD 8C 5H 3S' };
const PROB7 = { sf: 0.0311, quads: 0.168, full: 2.6, flush: 3.03, straight: 4.62, trips: 4.83, two: 23.5, pair: 43.8, high: 17.4 };
function handsHtml() {
  const order = ['sf', 'quads', 'full', 'flush', 'straight', 'trips', 'two', 'pair', 'high'];
  const sdOrder = ['sf', 'quads', 'flush', 'full', 'trips', 'straight', 'two', 'pair', 'high'];
  const row = (k, i) => `<div class="hr"><span class="hr-i">${i + 1}</span><b>${esc(t('hand.' + k))}</b>${window.PokerReview.mini(EX[k].split(' ').map(P.parse))}<small>${esc(t('hx.' + k))}</small><em>${PROB7[k]}%</em></div>`;
  return `<div class="tl-hands"><div><span class="lab">${esc(t('tl.ranking'))}</span>${order.map(row).join('')}<p class="diff-desc">${esc(t('tl.prob'))}</p></div>` +
    `<div><span class="lab">${esc(t('tl.sdRanking'))}</span><div class="sd-list">${sdOrder.map((k, i) => `<div class="hr sm${['flush', 'full', 'trips', 'straight'].includes(k) ? ' chg' : ''}"><span class="hr-i">${i + 1}</span><b>${esc(t('hand.' + k))}</b></div>`).join('')}</div><p class="diff-desc">${esc(t('tl.sdNote'))}</p>` +
    `<span class="lab">${esc(t('tl.ties'))}</span><p class="diff-desc">${esc(t('tl.tiesNote'))}</p></div></div>`;
}
function render() {
  const tabs = ['calc', 'range', 'hands'].map(k => `<button type="button" class="${k === tab ? 'sel' : ''}" data-tt="${k}">${esc(t('tl.' + k))}</button>`).join('');
  $('#toolsModal').innerHTML = `<h2>${esc(t('tl.h'))}</h2><div class="ng-tabs">${tabs}</div><div class="tl-body">${tab === 'calc' ? calcHtml() : tab === 'range' ? rangeHtml() : handsHtml()}</div><div class="modal-actions"><button class="mbtn go" id="tlClose">${esc(t('close'))}</button></div>`;
  const M = $('#toolsModal');
  M.querySelectorAll('[data-tt]').forEach(b => b.onclick = () => { tab = b.dataset.tt; render(); });
  $('#tlClose').onclick = () => A.closeOv('#toolsOverlay');
  if (tab === 'calc') {
    M.querySelectorAll('[data-cv]').forEach(b => b.onclick = () => { C.v = b.dataset.cv; C.res = null; resize(); render(); });
    M.querySelectorAll('[data-np]').forEach(b => b.onclick = () => { C.n = +b.dataset.np; C.res = null; resize(); render(); });
    M.querySelectorAll('[data-sp]').forEach(b => b.onclick = () => { C.slot = { p: +b.dataset.sp, k: +b.dataset.sk }; const p = C.slot.p; if (p >= 0 && C.hands[p][C.slot.k] != null) C.hands[p][C.slot.k] = null; else if (p < 0 && C.board[C.slot.k] != null) C.board[C.slot.k] = null; C.res = null; render(); });
    M.querySelectorAll('[data-clr]').forEach(b => b.onclick = () => { const v = b.dataset.clr; if (v === 'b') C.board = C.board.map(() => null); else C.hands[+v] = C.hands[+v].map(() => null); C.res = null; render(); });
    M.querySelectorAll('[data-rg]').forEach(s => s.onchange = () => { C.ranges[+s.dataset.rg] = s.value === '' ? null : +s.value; C.res = null; render(); });
    M.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { place(+b.dataset.pick); });
    $('#tlClear').onclick = () => { C.hands = C.hands.map(h => h.map(() => null)); C.board = C.board.map(() => null); C.res = null; C.slot = { p: 0, k: 0 }; render(); };
    $('#tlRun').onclick = run;
    const op = $('#odPot'), oc = $('#odCall'); op.onchange = () => { C.pot = Math.max(0, +op.value || 0); render(); }; oc.onchange = () => { C.call = Math.max(0, +oc.value || 0); render(); };
  } else if (tab === 'range') {
    M.querySelectorAll('[data-rn]').forEach(b => b.onclick = () => { C.rn = +b.dataset.rn; render(); });
    M.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => { C.pos = b.dataset.pos; render(); });
    M.querySelectorAll('[data-cell]').forEach(b => b.onclick = () => { C.cell = b.dataset.cell; render(); });
  }
}
function place(c) {
  const s = C.slot;
  if (s.p >= 0) C.hands[s.p][s.k] = c; else C.board[s.k] = c;
  // next empty slot: this hand, the next hands, then the board
  const order = []; C.hands.forEach((h, p) => h.forEach((x, k) => order.push({ p, k }))); C.board.forEach((x, k) => order.push({ p: -1, k }));
  const cur = order.findIndex(o => o.p === s.p && o.k === s.k);
  const nx = order.slice(cur + 1).concat(order.slice(0, cur)).find(o => (o.p >= 0 ? C.hands[o.p][o.k] : C.board[o.k]) == null);
  if (nx) C.slot = nx;
  C.res = null; render();
}
function run() {
  const V = P.VARIANTS[C.v], board = C.board.filter(c => c != null);
  if ([1, 2].includes(board.length)) { A.toast(t('tl.boardErr')); return; }
  const hands = C.hands.map(h => h.every(c => c != null) ? h.slice() : h.some(c => c != null) ? 'part' : null);
  if (hands.includes('part')) { A.toast(t('tl.partErr')); return; }
  if (hands.every(h => h == null)) { A.toast(t('tl.needOne')); return; }
  C.busy = true; render();
  const spec = { v: C.v, hands, board, iters: V.omaha ? 6000 : 30000, ranges: C.ranges };
  A.ask({ cmd: 'equity', spec }, r => { C.busy = false; if (r) { C.res = r; C.res.exact = hands.every(h => h) && 5 - board.length <= 2; } render(); }, () => E.equity(Object.assign(spec, { iters: 4000 })));
}
function open() { resize(); render(); A.openOv('#toolsOverlay'); }
window.PokerTools = { open };
})();
