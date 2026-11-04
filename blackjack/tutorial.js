/* ブラックジャック — tutorial on the real table (blackjack/tutorial.js)
   One scripted round at the Vegas Strip table: you get 6♠ 5♦ (11) against the dealer's 6♥, double down and get 9♦ (20);
   the dealer turns K♣ (16), draws 8♣ and busts. The bots all stand. Boxes point at the parts of the screen (spotlight + bubble, the baccarat tutorial's code).
   app.js calls: BJTut.setup(T) · ev('start' | 'turn' | 'done') · allow({a:'bet',k} | {a:'deal'} | {a:'move',m}) · after('bet').
   First visit: a box offers the tutorial ("do not show again"). Keys: aicoding-blackjack-tut-hide / -done. */
(function () {
'use strict';
const A = window.BJApp, B = window.BJ, $ = s => document.querySelector(s);
const esc = s => A.esc(s);
const HIDE = 'aicoding-blackjack-tut-hide', DONE = 'aicoding-blackjack-tut-done';
const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

/* ---------- the scripted round: the next cards out of the shoe, in dealing order (seats 1–5, dealer, seats 1–5, hole), then your double, then the dealer's draw ---------- */
const FIX = ['TS', 'KD', '6S', 'QC', 'JH', '6H', '9C', '8H', '5D', '7D', 'KS', 'KC', '9D', '8C'];
function setup(T) {
  const S = T.shoe, cs = S.cards;
  FIX.map(B.parse).forEach((id, i) => { const at = S.pos + i, j = cs.findIndex((c, k) => k >= at && c === id); if (j > at) [cs[at], cs[j]] = [cs[j], cs[at]]; });
}

/* ---------- the steps ---------- */
const SPOT = k => `#bjTable [data-spot="${k}"]`;
const STEPS = {
  start: [{ k: 'hello' }, { k: 'seat', at: ['.bj-seat.me', '.bj-pl.me'] }, { k: 'chips', at: ['.bc-rack', '.bc-bal'] },
    { k: 'bet', at: SPOT('main'), need: 'bet:main', ctx: [['.bc-rack', '#abDeal'], ['.bc-rack']] }, { k: 'sides', at: [SPOT('pp'), SPOT('t3')] },
    { k: 'deal', at: '#abDeal', need: 'deal', ctx: [[SPOT('main'), '.bc-rack']] }],
  turn: [{ k: 'cards', at: ['.bj-tot.me', '.bj-tot.dl'] }, { k: 'dealer', at: '.bj-tot.dl' }, { k: 'moves', at: '#actbar .mvs' }, { k: 'coach', at: '#side .coach-card', tab: 'coach' },
    { k: 'double', at: '#actbar [data-mv="D"]', need: 'move:D' }],
  done: [{ k: 'result', at: ['.bj-tot.dl', '.bj-mid'] }, { k: 'chart', at: '#side .chart-card', tab: 'chart' }, { k: 'count', at: '#side .shoe-card', tab: 'shoe' },
    { k: 'bots', at: '.bj-pl:not(.me)' }, { k: 'menu', at: ['#btnRules', '#btnLesson', '#btnTools', '#btnStats'] }, { k: 'end', end: true }],
};
let Q = null, cur = null, used = {}, n = 0, tab0 = null;
const TOTAL = Object.values(STEPS).reduce((a, x) => a + x.length, 0);
function ev(name) {
  const T = A.T; if (!T || !T.tut || used[name] || !STEPS[name]) return;
  used[name] = true; Q = STEPS[name].slice(); next();
}
function next() { cur = Q && Q.shift(); if (!cur) { hideBox(); return; } n++; show(cur); }
function allow(m) {
  const T = A.T; if (!T || !T.tut) return true;
  if (!cur || !cur.need) { A.toast(L('wait')); return false; }
  const want = m.a === 'bet' ? 'bet:' + m.k : m.a === 'move' ? 'move:' + m.m : m.a;
  if (cur.need !== want) { A.sfx('bad'); A.toast(L('ng.' + cur.k)); shake(); return false; }
  if (m.a === 'deal' || m.a === 'move') { cur = null; hideBox(); }
  return true;
}
function after(a) { if (cur && cur.need && cur.need.startsWith(a)) { cur = null; hideBox(); setTimeout(next, 250); } }
function watchDeal() {}

/* ---------- spotlight + bubble ---------- */
let layer = null, box = null, hole = null, mask = null, rings = null;
function ensure() {
  if (layer) return;
  layer = document.createElement('div'); layer.id = 'tutLayer'; layer.innerHTML = '<svg class="tut-mask" aria-hidden="true"><path/></svg><div class="tut-rings"></div><div class="tut-hole"></div><div class="tut-box" role="dialog" aria-live="polite"></div>';
  document.body.appendChild(layer); hole = layer.querySelector('.tut-hole'); box = layer.querySelector('.tut-box'); mask = layer.querySelector('.tut-mask'); rings = layer.querySelector('.tut-rings');
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (cur && layer.classList.contains('show')) place(cur); }, 80); });   // (after the table has been drawn again)
  // the player scrolls the table to look around: the spotlight follows its target
  // a step that waits for a move: a tap on the table that is not a betting box of yours (a bot's box, the BANKER hand) says what to tap
  document.addEventListener('pointerdown', e => {
    if (!cur || !cur.need || !layer.classList.contains('show')) return;
    const t = e.target; if (!t.closest || !t.closest('#bjTable') || t.closest('[data-spot]')) return;
    A.sfx('bad'); A.toast(L('ng.' + cur.k)); shake();
  }, true);
  let raf = 0; document.addEventListener('scroll', () => { if (raf || !layer.classList.contains('show') || !lastSt || !lastSt.at) return; raf = requestAnimationFrame(() => { raf = 0; paint(lastSt, phone() ? 6 : 8); }); }, true);
}
function rectOf(at) {
  let r = null;
  [].concat(at || []).flat().forEach(s => document.querySelectorAll(s).forEach(el => {
    const b = el.getBoundingClientRect(); if (!b.width && !b.height) return;
    r = r ? { l: Math.min(r.l, b.left), t: Math.min(r.t, b.top), r: Math.max(r.r, b.right), b: Math.max(r.b, b.bottom) } : { l: b.left, t: b.top, r: b.right, b: b.bottom };
  }));
  return r;
}
function show(st) {
  ensure();
  const btns = st.end ? `<button type="button" class="mbtn" id="tutAgain">${esc(L('again'))}</button><button type="button" class="mbtn go" id="tutPlay">${esc(L('play'))}</button>`
    : st.need ? `<span class="tut-do">👉 ${esc(L('do'))}</span>` : `<button type="button" class="mbtn go" id="tutNext">${esc(L('next'))}</button>`;
  box.innerHTML = `<div class="tut-top"><em>${esc(L('title'))} ${Math.min(n, TOTAL)}/${TOTAL}</em><span class="tut-tr"><button type="button" class="tut-min" id="tutMin" aria-expanded="true" aria-label="${esc(L('fold'))}" title="${esc(L('fold'))}"><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></button><button type="button" class="tut-x" id="tutSkip">${esc(L('skip'))}</button></span></div>` +
    `<b><span class="tut-h">${esc(L('t.' + st.k))}</span>${st.need ? `<span class="tut-do-s">${esc(L('do'))}</span>` : ''}</b><p>${L('b.' + st.k)}</p><div class="tut-btns${st.end ? ' end' : ''}">${btns}</div>`;
  layer.classList.add('show'); layer.classList.toggle('center', !st.at); layer.classList.toggle('act', !!st.need); layer.classList.toggle('fin', !!st.end);
  // the step's own setup: the chip it talks about (100) and no bet left over (a re-entered step)
  const T = A.T;
  if (st.need === 'bet:main' && T && T.phase === 'bet') { let ch = false; if (A.set.chip !== 100) { A.set.chip = 100; ch = true; } if (Object.keys(T.bets).length) { T.bets = {}; ch = true; } if (ch) A.render(); }
  const el = st.at && document.querySelector([].concat(st.at).flat()[0]);
  { const k = st.tab || (el && el.closest && (el.closest('#side [data-pt]') || {}).dataset || {}).pt; if (k && A.showTab) A.showTab(k); }   // phones: open that tab
  if (!phone() && el && el.scrollIntoView) { const b = el.getBoundingClientRect(); if (b.top < 0 || b.bottom > innerHeight) el.scrollIntoView({ block: 'center', behavior: 'instant' }); }
  box.classList.remove('min');
  const mn = $('#tutMin'); if (mn) mn.onclick = () => { box.classList.toggle('min'); mn.setAttribute('aria-expanded', box.classList.contains('min') ? 'false' : 'true'); place(st); };
  place(st); requestAnimationFrame(() => { if (cur === st) { place(st); watch(st); } });
  const nx = $('#tutNext'); if (nx) { nx.onclick = () => { A.sfx('flip'); next(); }; setTimeout(() => nx.focus({ preventScroll: true }), 30); }
  $('#tutSkip').onclick = () => { if (st.end) finish(); else A.confirmBox(L('skipQ'), () => quit()); };
  const pl = $('#tutPlay'); if (pl) pl.onclick = () => finish();
  const ag = $('#tutAgain'); if (ag) ag.onclick = () => { hide(); start(); };
}
/* phones: the bubble is docked (top or bottom, full width, compact) and the table scrolls so the part it talks about
   sits in the free area between the bubble and the edge — nothing the step is about is ever under the text */
const phone = () => innerWidth <= 760;
const stageEl = () => document.querySelector('.stage');
let padAdded = 0, padTop = 0, lastSt = null, ro = null;
function inStage(at) { const sc = stageEl(), e = at && document.querySelector([].concat(at).flat()[0]); return !!(sc && e && sc.contains(e)); }
function holeAt(r, pad) { hole.style.cssText = r ? `left:${r.l - pad}px;top:${r.t - pad}px;width:${r.r - r.l + pad * 2}px;height:${r.b - r.t + pad * 2}px` : `left:${innerWidth / 2}px;top:${innerHeight / 2}px;width:0;height:0`; }
// phones: the bottom tab bar is on screen (the side boxes are tabs)
const tabBtn = st => { const tb = st && st.tab && document.querySelector(`#mTabs [data-pt="${st.tab}"]`); return tb && tb.offsetHeight && phone() ? tb : null; };
// the spotlight: one hole, or (a tab too) a dark mask with a hole and a ring for the box and for its tab
function paint(st, pad) {
  if (!st) return;
  const list = [], r0 = st.at ? rectOf(st.at) : null;
  if (r0) list.push({ r: r0, hot: !!st.need });
  const tb = tabBtn(st);
  document.querySelectorAll('#mTabs .tut-tab').forEach(e => { if (e !== tb) e.classList.remove('tut-tab'); });
  if (st.hot) document.querySelectorAll(st.hot).forEach(e => { const b = e.getBoundingClientRect(); if (b.width && b.bottom > 0 && b.top < innerHeight) list.push({ r: { l: b.left, t: b.top, r: b.right, b: b.bottom }, hot: true, tab: true, ring: true }); });
  if (tb) { tb.classList.add('tut-tab'); const b = tb.getBoundingClientRect(); list.push({ r: { l: b.left + 4, t: b.top + 2, r: b.right - 4, b: b.bottom - 2 }, hot: true, tab: true }); }
  const multi = list.length > 1;
  layer.classList.toggle('multi', multi);
  if (!multi) { rings.innerHTML = ''; mask.querySelector('path').setAttribute('d', ''); holeAt(list[0] ? list[0].r : null, pad); return; }
  holeAt(null, 0);
  const W = innerWidth, H = innerHeight;
  let d = `M0 0H${W}V${H}H0Z`, h = '';
  list.forEach(x => {
    const p = x.tab ? 2 : pad, l = x.r.l - p, t = x.r.t - p, w = x.r.r - x.r.l + p * 2, ht = x.r.b - x.r.t + p * 2, rr = Math.min(12, w / 2, ht / 2);
    if (!x.ring) d += `M${l + w - rr} ${t}H${l + rr}A${rr} ${rr} 0 0 0 ${l} ${t + rr}V${t + ht - rr}A${rr} ${rr} 0 0 0 ${l + rr} ${t + ht}H${l + w - rr}A${rr} ${rr} 0 0 0 ${l + w} ${t + ht - rr}V${t + rr}A${rr} ${rr} 0 0 0 ${l + w - rr} ${t}Z`;
    h += `<div class="tut-ring${x.hot ? ' hot' : ''}" style="left:${l}px;top:${t}px;width:${w}px;height:${ht}px;border-radius:${rr}px"></div>`;
  });
  mask.setAttribute('viewBox', `0 0 ${W} ${H}`); mask.setAttribute('width', W); mask.setAttribute('height', H);
  mask.querySelector('path').setAttribute('d', d);
  rings.innerHTML = h;
}
function unpad() { const sc = stageEl(); if (sc && padAdded) { sc.style.paddingBottom = ''; padAdded = 0; } if (sc && padTop) { sc.style.paddingTop = ''; padTop = 0; } }
// the target changes size after the step is shown (the coach box, the table drawn again): place again
function watch(st) { if (ro) ro.disconnect(); ro = null; if (!st.at || !window.ResizeObserver) return; let tm = 0; ro = new ResizeObserver(() => { clearTimeout(tm); tm = setTimeout(() => { if (cur === st && layer.classList.contains('show')) place(st); }, 60); }); [].concat(st.at, '#bjTable').flat().forEach(q => document.querySelectorAll(q).forEach(e => ro.observe(e))); }
function placePhone(st) {
  unpad();
  const W = innerWidth, H = innerHeight, sc = stageEl(), gap = 8;
  layer.classList.add('dock'); box.style.left = gap + 'px'; box.style.width = (W - gap * 2) + 'px';
  const bh = box.offsetHeight;
  const sr = sc ? sc.getBoundingClientRect() : { top: 0, bottom: H };
  let r = st.at ? rectOf(st.at) : null;
  const scroll = r && inStage(st.at);
  const zone = d => {
    const t = d === 'top' ? bh + gap * 2 : 0, b = d === 'top' ? H : H - bh - gap * 2;
    return scroll ? { t: Math.max(t, sr.top) + 6, b: Math.min(b, sr.bottom) - 6 } : { t: t + 4, b: b - 4 };
  };
  let dock, d = 0;
  if (!r) dock = 'bottom';                                   // hello / end: the table stays visible above the bubble
  else if (!scroll) dock = tabBtn(st) || r.t + r.b > H ? 'top' : 'bottom';  // a fixed target (header buttons): the other end
  else {
    // try both docks: the scroll that puts the target (with its context when it fits) in the free area — keep the one that fits best
    const plan = dk => {
      const z = zone(dk), room = z.b - z.t;
      let u = null, fit = false, cx = null;
      for (const c of st.ctx || []) { const q = rectOf(c); if (!q) continue; cx = q; u = { t: Math.min(q.t, r.t), b: Math.max(q.b, r.b) }; if (u.b - u.t <= room) { fit = true; break; } }
      const tt = fit ? u.t : r.t, h = (fit ? u.b : r.b) - tt;
      const want = h > room ? z.t : z.t + (room - h) / 2;
      const dd = Math.round(tt - want), t = r.t - dd, b = r.b - dd;
      return { dk, dd, miss: Math.max(0, z.t - t) + Math.max(0, b - z.b), room: room - (cx && !fit ? 1e4 : 0) };
    };
    const a = plan('top'), c = plan('bottom'), best = tabBtn(st) || a.miss < c.miss || (a.miss === c.miss && a.room >= c.room) ? a : c;   // a tab is ringed: the text stays at the top
    dock = best.dk; d = best.dd;
  }
  if (d) {
    const max = sc.scrollHeight - sc.clientHeight;
    if (sc.scrollTop + d > max) { const extra = Math.ceil(sc.scrollTop + d - max); padAdded += extra; sc.style.paddingBottom = `calc(${getComputedStyle(sc).paddingBottom} + ${extra}px)`; }
    if (sc.scrollTop + d < 0) { padTop = Math.ceil(-(sc.scrollTop + d)); sc.style.paddingTop = `calc(${getComputedStyle(sc).paddingTop} + ${padTop}px)`; d = -sc.scrollTop; }
    sc.scrollTop += d;
  }
  box.style.top = (dock === 'top' ? gap : H - bh - gap) + 'px';
  layer.dataset.dock = dock;
  paint(st, 6);
}
// PC / tablets: next to the target — below, above, beside — the first place that covers neither the target nor its context
function place(st) {
  if (!layer) return;
  lastSt = st;
  if (phone()) { placePhone(st); return; }
  unpad(); layer.classList.remove('dock'); box.style.width = '';
  const W = innerWidth, H = innerHeight, r = st.at ? rectOf(st.at) : null, pad = 8, m = 12, g = pad + 14;
  paint(st, pad);
  const bw = box.offsetWidth, bh = box.offsetHeight;
  if (!r) { box.style.left = Math.max(m, (W - bw) / 2) + 'px'; box.style.top = Math.max(m, (H - bh) / 2) + 'px'; return; }
  const keep = [r]; (st.ctx || []).some(c => { const q = rectOf(c); if (q) keep.push(q); return q; });
  const clampX = x => Math.max(m, Math.min(W - bw - m, x)), clampY = y => Math.max(m, Math.min(H - bh - m, y));
  const cx = (r.l + r.r) / 2, cy = (r.t + r.b) / 2;
  const cand = [];
  if (r.l > W * 0.62 && W > 900) cand.push([r.l - bw - 24, clampY(cy - bh / 2)]);   // a target in the right column: box to its left
  cand.push([clampX(cx - bw / 2), r.b + g], [clampX(cx - bw / 2), r.t - g - bh], [r.r + 24, clampY(cy - bh / 2)], [r.l - bw - 24, clampY(cy - bh / 2)]);
  if (H - r.b < r.t) cand.splice(cand.length - 4, 2, cand[cand.length - 3], cand[cand.length - 4]);   // more room above: try above first
  const over = ([x, y]) => keep.reduce((a, q) => a + Math.max(0, Math.min(x + bw, q.r + pad) - Math.max(x, q.l - pad)) * Math.max(0, Math.min(y + bh, q.b + pad) - Math.max(y, q.t - pad)), 0);
  const inside = ([x, y]) => x >= m - .5 && y >= m - .5 && x + bw <= W - m + .5 && y + bh <= H - m + .5;
  let best = cand.find(p => inside(p) && over(p) === 0);
  if (!best) { // nothing is free: the place inside the window covering the least
    best = cand.map(([x, y]) => [clampX(x), clampY(y)]).concat([[m, m], [W - bw - m, m], [m, H - bh - m], [W - bw - m, H - bh - m]]).sort((a, b) => over(a) - over(b))[0];
  }
  box.style.left = best[0] + 'px'; box.style.top = best[1] + 'px';
}
function shake() { if (!box) return; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
function hideBox() { if (layer) { layer.classList.remove('show', 'multi'); rings.innerHTML = ''; } document.querySelectorAll('#mTabs .tut-tab').forEach(e => e.classList.remove('tut-tab')); unpad(); if (ro) { ro.disconnect(); ro = null; } }
function hide() { hideBox(); Q = null; cur = null; }
function start() {
  used = {}; n = 0; Q = null; cur = null; if (tab0 === null) tab0 = A.set.mTab || '';
  ['#tutOfferOv', '#rulesOverlay', '#lessonOverlay', '#newOverlay'].forEach(s => { const o = $(s); if (o) o.classList.remove('show'); });
  A.startTutorial();
}
function backTab() { if (tab0 !== null && A.showTab) A.showTab(tab0); tab0 = null; }
function quit() { hide(); A.endTutorial(); backTab(); }
function finish() {
  put(DONE, '1'); hide(); A.endTutorial(); backTab(); A.toast(L('thanks'));
  // "Tutorial complete! | Enjoy the game": two lines, each kept on one line
  const tt = $('#toast'), m = /^(.*?[!！])\s*(.+)$/.exec(L('thanks'));
  if (tt && m) tt.innerHTML = `<span class="tt-l">${esc(m[1])}</span><span class="tt-l">${esc(m[2])}</span>`;
}

/* ---------- the first-visit box ---------- */
function offer(force) {
  if (!force && (get(HIDE) || get(DONE))) return;
  let ov = $('#tutOfferOv');
  if (!ov) { ov = document.createElement('div'); ov.className = 'overlay'; ov.id = 'tutOfferOv'; ov.innerHTML = '<div class="modal tut-offer"></div>'; document.body.appendChild(ov); }
  ov.querySelector('.modal').innerHTML = `<div class="to-art">${A.gArt('classic')}</div><h2>${esc(L('o.h'))}</h2><p>${esc(L('o.p'))}</p>` +
    `<ul class="to-list">${L('o.list').split('|').map(x => `<li>${esc(x)}</li>`).join('')}</ul>` +
    `<label class="to-chk"><input type="checkbox" id="toHide"${get(HIDE) ? ' checked' : ''}> ${esc(L('o.hide'))}</label>` +
    `<div class="modal-actions"><button class="mbtn" id="toLater">${esc(L('o.later'))}</button><button class="mbtn go" id="toGo">${esc(L('o.go'))}</button></div>`;
  const keep = () => { if ($('#toHide').checked) put(HIDE, '1'); else try { localStorage.removeItem(HIDE); } catch (e) {} };
  $('#toLater').onclick = () => { keep(); A.closeOv('#tutOfferOv'); };
  $('#toGo').onclick = () => { keep(); A.closeOv('#tutOfferOv'); start(); };
  A.openOv('#tutOfferOv');
}

/* ---------- texts ---------- */
const TX = {
ja: {
  fold: '折りたたむ', title: 'チュートリアル', next: '次へ', skip: 'やめる', do: '実際に操作してみましょう', skipQ: 'チュートリアルをやめますか？', wait: '説明を読んで「次へ」を押してください', play: '通常のゲームに戻る', again: 'もう一度', thanks: 'チュートリアル完了！ ゲームを楽しんでください',
  't.hello': 'ようこそブラックジャックへ！', 'b.hello': '実際の卓で1回遊びながら、賭け方と打ち方を覚えましょう（約2分）。<br>ブラックジャックは、カードの合計を<b>21に近づけて</b>ディーラーに勝つゲームです。<b>21を超えたら負け</b>（バスト）。',
  't.seat': 'あなたの席', 'b.seat': '真ん中の丸があなたの席です。左右の席にはBOTのプレイヤーが座っていて、みんなディーラーと1対1で勝負します。',
  't.chips': 'チップと持ち金', 'b.chips': '置くチップの額をここで選びます（今は$100）。持ち金は次のゲームにも引き継がれ、0になったら$10,000から再スタートです。',
  't.bet': '賭けよう', 'b.bet': '自分の席の<b>大きな丸</b>をタップして、$100を賭けてみましょう。',
  'ng.bet': 'ここでは自分の席の大きな丸をタップしてください',
  't.sides': 'サイドベット', 'b.sides': '小さな丸は<b>サイドベット</b>（パーフェクトペア・21+3）。最初の2枚の組み合わせに賭けるおまけの賭けで、損が大きいので今回は使いません。',
  't.deal': '配ってもらおう', 'b.deal': '賭けたら<b>配る</b>を押します。全員に2枚ずつ、ディーラーは1枚を表、1枚を伏せて配られます。',
  'ng.deal': 'ここでは「配る」を押してください',
  't.cards': 'あなたの手', 'b.cards': 'あなたは 6＋5＝<b>11</b>。10・J・Q・Kは10、Aは1か11と数えます。11なら次の1枚で21になりやすい、とても良い手です。',
  't.dealer': 'ディーラーのカード', 'b.dealer': 'ディーラーの表は<b>6</b>。ディーラーは16以下なら必ず引き、17以上で止まるルールなので、6のような小さいカードは<b>バストしやすい</b>カードです。',
  't.moves': 'あなたの選択', 'b.moves': '<b>ヒット</b>＝もう1枚、<b>スタンド</b>＝止まる、<b>ダブル</b>＝賭けを倍にして1枚だけ引く、<b>スプリット</b>＝同じ数字の2枚を分ける、<b>サレンダー</b>＝半分払って降りる。',
  't.coach': 'コーチ', 'b.coach': 'コーチが今の手の<b>おすすめ</b>と理由、それぞれの手の期待値を教えてくれます。11対6は「ダブル」が一番得です。',
  't.double': 'ダブルしよう', 'b.double': '<b>ダブル</b>を押して、賭けを$200にしてもう1枚もらいましょう。',
  'ng.double': 'ここでは「ダブル」を押してください',
  't.result': '勝負の結果', 'b.result': 'あなたは9をもらって<b>20</b>。ディーラーは伏せ札がKで16、もう1枚引いて8が来て<b>24でバスト</b>！ 倍にした$200が勝ちになりました。',
  't.chart': '基本戦略表', 'b.chart': 'どの手でどう打つと一番得かをまとめた<b>基本戦略表</b>。自分の番では今の手のマスが光ります。表どおりに打つと、ハウスエッジは約0.5%まで下がります。',
  't.count': 'シューとカウント', 'b.count': '残りのカードの偏りを<b>ハイロー</b>で数えたカウントです。プラスが大きいほど10とAが多く残っていて、プレイヤー有利。仕組みを学ぶための機能です。',
  't.bots': 'BOTのプレイヤー', 'b.bots': 'BOTたちにも打ち方の癖があります。基本戦略どおりの Lin、マーチンゲールの Marco、絶対バストしない Aiko、カードを数える Sam。長く遊ぶと差が見えてきます。',
  't.menu': 'もっと知りたいときは', 'b.menu': '<b>ルール</b>：4種類のルールを操作しながら学ぶ／<b>レッスン</b>：基本戦略やカウントを問題で練習／<b>研究</b>：戦略表やハウスエッジ、打ち方の検証／<b>統計</b>：判断の正確さと運。',
  't.end': 'チュートリアル完了！', 'b.end': 'これで基本はばっちりです。チュートリアルの勝ち負けは持ち金に影響しません。チュートリアルは「ルール」や「レッスン」からいつでももう一度できます。',
  'o.h': 'はじめての方へ', 'o.p': '実際の卓で1回遊びながら、ブラックジャックの賭け方と打ち方を覚えるチュートリアルがあります（約2分）。', 'o.list': 'カードの数え方と勝ち方|チップの置き方と配り方|ヒット・スタンド・ダブルの選び方|基本戦略表とコーチ',
  'o.hide': '次から表示しない', 'o.later': 'あとで', 'o.go': 'チュートリアルを始める', entry: '実戦チュートリアル', 'entry.d': '実際の卓で1回遊びながら賭け方と打ち方を覚える（約2分）',
},
en: {
  fold: 'Collapse', title: 'Tutorial', next: 'Next', skip: 'Quit', do: 'Make the move yourself', skipQ: 'Quit the tutorial?', wait: 'Read the box and press Next', play: 'Back to the game', again: 'Again', thanks: 'Tutorial complete! Enjoy the game',
  't.hello': 'Welcome to blackjack!', 'b.hello': 'Learn how to bet and play by playing one round at a real table (about 2 minutes).<br>In blackjack you beat the dealer by getting <b>closer to 21</b>. <b>Over 21 loses</b> (bust).',
  't.seat': 'Your seat', 'b.seat': 'The circle in the middle is yours. Bot players sit on both sides — everyone plays one-on-one against the dealer.',
  't.chips': 'Chips and bankroll', 'b.chips': 'Choose the chip to place here (now $100). Your chips carry over to the next game; at zero you start again with $10,000.',
  't.bet': 'Place a bet', 'b.bet': 'Tap the <b>big circle</b> in your seat to bet $100.',
  'ng.bet': 'Tap the big circle in your own seat',
  't.sides': 'Side bets', 'b.sides': 'The small circles are <b>side bets</b> (Perfect Pairs, 21+3) on the first two cards — extras that cost a lot, so skip them this time.',
  't.deal': 'Deal', 'b.deal': 'Now press <b>Deal</b>. Everyone gets two cards; the dealer gets one face up and one face down.',
  'ng.deal': 'Press Deal here',
  't.cards': 'Your hand', 'b.cards': 'You have 6 + 5 = <b>11</b>. 10, J, Q, K count 10; an ace 1 or 11. 11 often makes 21 with one card — a great hand.',
  't.dealer': 'The dealer\'s card', 'b.dealer': 'The dealer shows a <b>6</b>. The dealer must hit 16 or less and stand on 17+, so a small card like 6 <b>busts often</b>.',
  't.moves': 'Your choices', 'b.moves': '<b>Hit</b> = one more card, <b>Stand</b> = stop, <b>Double</b> = double the bet for exactly one card, <b>Split</b> = split two cards of the same rank, <b>Surrender</b> = give up half.',
  't.coach': 'The coach', 'b.coach': 'The coach shows the <b>best move</b>, why, and the value of every move. With 11 against a 6, doubling is best.',
  't.double': 'Double down', 'b.double': 'Press <b>Double</b>: your bet becomes $200 and you get one more card.',
  'ng.double': 'Press Double here',
  't.result': 'The result', 'b.result': 'You drew a 9 for <b>20</b>. The dealer turned a K (16), drew an 8 and <b>busted with 24</b>! Your doubled $200 wins.',
  't.chart': 'Basic strategy', 'b.chart': 'The <b>basic strategy chart</b> shows the best move for every hand. On your turn the cell of your hand lights up. Playing by it brings the house edge down to about 0.5%.',
  't.count': 'Shoe and count', 'b.count': 'The <b>Hi-Lo</b> count of the cards left. The higher it is, the more tens and aces remain — good for the player. It is here to learn how the game works.',
  't.bots': 'The bot players', 'b.bots': 'The bots have habits too: Lin plays the basic strategy, Marco the Martingale, Aiko never busts, Sam counts cards. Over time the difference shows.',
  't.menu': 'To learn more', 'b.menu': '<b>Rules</b>: the four variants hands-on · <b>Lessons</b>: practise the basic strategy and counting · <b>Study</b>: the chart, house edge, ways to play tested · <b>Stats</b>: decision accuracy and luck.',
  't.end': 'Tutorial complete!', 'b.end': 'You know the basics. The tutorial round does not touch your chips. You can replay it any time from Rules or Lessons.',
  'o.h': 'New to blackjack?', 'o.p': 'A tutorial teaches how to bet and play while you play one round at a real table (about 2 minutes).', 'o.list': 'Counting cards and how to win|Placing chips and dealing|Choosing hit, stand or double|The strategy chart and the coach',
  'o.hide': 'Do not show again', 'o.later': 'Later', 'o.go': 'Start the tutorial', entry: 'Play-along tutorial', 'entry.d': 'Learn to bet and play by playing one round at a real table (about 2 min)',
},
};
function L(k) { const T = TX[A.LANG] || TX.en; let x = T[k]; if (x === undefined) x = TX.en[k]; if (x === undefined) x = TX.ja[k] || k; return x; }

window.BJTut = { setup, ev, allow, after, start, hide, finish, offer, L, TX };
setTimeout(() => { if (!document.querySelector('.overlay.show')) offer(false); }, 900);
})();
