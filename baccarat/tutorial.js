/* バカラ — tutorial on the real table (baccarat/tutorial.js)
   One scripted coup: Player 2♠ 3♦ (5, draws 9♥ → 4), Banker K♣ 6♥ (6, stands) → Banker wins 6 to 4.
   You place a bet on BANKER and deal; boxes point at the parts of the screen (spotlight + bubble, the poker tutorial's CSS).
   app.js calls: BacTut.setup(T) · ev('start' | 'done') · allow({a:'bet',k} | {a:'deal'}) · after('bet').
   First visit: a box offers the tutorial ("do not show again"). Keys: aicoding-baccarat-tut-hide / -done. */
(function () {
'use strict';
const A = window.BacApp, B = window.BC, $ = s => document.querySelector(s);
const esc = s => A.esc(s);
const HIDE = 'aicoding-baccarat-tut-hide', DONE = 'aicoding-baccarat-tut-done';
const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

/* ---------- the scripted coup: the next cards out of the shoe, in dealing order P1 B1 P2 B2 P3 ---------- */
const FIX = ['2S', 'KC', '3D', '6H', '9H'];
function setup(T) {
  const S = T.shoe, cs = S.cards;
  FIX.map(B.parse).forEach((id, i) => { const at = S.pos + i, j = cs.findIndex((c, k) => k >= at && c === id); if (j > at) [cs[at], cs[j]] = [cs[j], cs[at]]; });
}

/* ---------- the steps ---------- */
// at: selector(s) to point at (none = a box in the middle) · need: the move the step waits for
// hot: a small control inside the box that gets its own pulsing ring (the roads' ? button)
// ctx: also kept in view with the target when there is room (the chips / the Place bet button) · tab: phones — the bottom tab holding that box
// (the betting boxes: '#bcTable [data-spot=..]' — only your own seat has them, in the printed arcs (PC) and in the touch layout (narrow tables) alike)
const SPOT = k => `#bcTable [data-spot="${k}"]`;
const STEPS = {
  start: [{ k: 'hello' }, { k: 'hands', at: '.bc-hands' }, { k: 'seat', at: ['.seat-g.me', '#bcTable [data-spot]'] }, { k: 'chips', at: ['.bc-rack', '.bc-bal'] },
    { k: 'bet', at: SPOT('B'), need: 'bet:B', ctx: [['.bc-rack', '#abDeal'], ['.bc-rack']] }, { k: 'coach', at: '#side .coach-card', tab: 'coach' },
    { k: 'deal', at: '#abDeal', need: 'deal', ctx: [[SPOT('B'), '.bc-rack']] }],
  done: [{ k: 'result', at: '.bc-hands' }, { k: 'third', at: '#side .ck-ex', tab: 'coach' }, { k: 'payout', at: [SPOT('B'), '.bc-banner'] },
    { k: 'road', at: '#side .road-card', tab: 'road', hot: '#rdHelp' }, { k: 'bots', at: '.lz-svg' }, { k: 'menu', at: ['#btnRules', '#btnLesson', '#btnTools', '#btnStats'] }, { k: 'end', end: true }],
};
let Q = null, cur = null, used = {}, n = 0, tab0 = null;   // tab0: the phone tab before the tutorial (back to it after)
const TOTAL = Object.values(STEPS).reduce((a, x) => a + x.length, 0);
function ev(name) {
  const T = A.T; if (!T || !T.tut || used[name] || !STEPS[name]) return;
  used[name] = true; Q = STEPS[name].slice(); next();
}
function next() { cur = Q && Q.shift(); if (!cur) { hideBox(); return; } n++; show(cur); }
function allow(m) {
  const T = A.T; if (!T || !T.tut) return true;
  if (!cur || !cur.need) { A.toast(L('wait')); return false; }
  const want = m.a === 'bet' ? 'bet:' + m.k : m.a;
  if (cur.need !== want) { A.sfx('bad'); A.toast(L('ng.' + cur.k)); shake(); return false; }
  if (m.a === 'deal') { cur = null; hideBox(); setTimeout(watchDeal, 0); }   // the cards are dealt: the bubble goes until the result, and the table slides to the hands
  return true;
}
// a step that waited for a move: go on once the move is made
function after(a) { if (cur && cur.need && cur.need.startsWith(a)) { cur = null; hideBox(); setTimeout(next, 250); } }

/* the deal: the table slides (smoothly) so both hands are on screen while the cards come out — third cards too */
function watchDeal() {
  const h = document.querySelector('.bc-hands'); if (!h) return;
  const r = h.getBoundingClientRect(); if (!r.height) return;
  const sc = stageEl(), inSc = phone() && sc && sc.contains(h) && sc.scrollHeight > sc.clientHeight;
  const sr = inSc ? sc.getBoundingClientRect() : { top: 0, bottom: innerHeight };
  const tb = document.querySelector('#mTabs'), tbt = tb && tb.offsetHeight ? tb.getBoundingClientRect().top : innerHeight;
  const top = Math.max(0, sr.top), bot = Math.min(sr.bottom, innerHeight, tbt);
  const ban = document.querySelector('.bc-banner'), rb = ban && ban.getBoundingClientRect();
  // the hands (and the result banner under them, when there is room) in the middle of what is visible; the hands grow by a third card: keep some room
  const t0 = r.top - 10, b0 = Math.max(r.bottom, rb && rb.height && rb.top - r.bottom < 120 && rb.bottom - r.top < bot - top - 20 ? rb.bottom : 0) + 10;
  if (t0 >= top && b0 <= bot) return;   // already in view
  const d = Math.round(t0 - (top + Math.max(0, (bot - top - (b0 - t0)) / 2)));
  if (inSc) sc.scrollTo({ top: sc.scrollTop + d, behavior: 'smooth' });
  else scrollBy({ top: d, behavior: 'smooth' });
}

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
    const t = e.target; if (!t.closest || !t.closest('#bcTable') || t.closest('[data-spot]')) return;
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
  if (st.need === 'bet:B' && T && T.phase === 'bet') { let ch = false; if (A.set.chip !== 100) { A.set.chip = 100; ch = true; } if (Object.keys(T.bets).length) { T.bets = {}; ch = true; } if (ch) A.render(); }
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
function watch(st) { if (ro) ro.disconnect(); ro = null; if (!st.at || !window.ResizeObserver) return; let tm = 0; ro = new ResizeObserver(() => { clearTimeout(tm); tm = setTimeout(() => { if (cur === st && layer.classList.contains('show')) place(st); }, 60); }); [].concat(st.at, '#bcTable').flat().forEach(q => document.querySelectorAll(q).forEach(e => ro.observe(e))); }
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
  fold: '折りたたむ', title: 'チュートリアル', next: '次へ', skip: 'やめる', do: '実際に操作してみましょう', skipQ: 'チュートリアルをやめますか？', wait: '説明を読んで「次へ」を押してください', play: '通常のゲームに戻る', again: 'もう一度', thanks: 'チュートリアル完了！ 本番を楽しんでください',
  't.hello': 'ようこそバカラへ！', 'b.hello': '実際の卓で1回遊びながら、賭け方とルールを覚えましょう（約2分）。<br>バカラは<b>プレイヤー</b>と<b>バンカー</b>、どちらの手が<b>9に近くなるか</b>を当てるゲームです。',
  't.hands': 'カードの置き場', 'b.hands': 'ここに PLAYER と BANKER の2つの手が配られます。どちらも人ではなく<b>手の名前</b>。あなたはどちらが勝つかに賭けるだけで、カードを引くかどうかもルールで自動に決まります。',
  't.seat': 'あなたの席', 'b.seat': '真ん中の <b>3番席</b>があなたの席です。PLAYER・BANKER・TIE（引き分け）・ペアの枠に、チップを置いて賭けます。ほかの席にはBOTのプレイヤーが座っています。',
  't.chips': 'チップと持ち金', 'b.chips': '置くチップの額をここで選びます（今は100）。持ち金は次のゲームにも引き継がれ、0になったら10,000から再スタートです。',
  't.bet': 'バンカーに賭けよう', 'b.bet': '自分の席の <b>BANKER</b> の枠をタップして、100を賭けてみましょう。',
  'ng.bet': 'ここでは自分の席（3番）の BANKER の枠をタップしてください',
  't.coach': 'コーチ', 'b.coach': 'コーチが賭けの<b>ハウスエッジ</b>（平均して失う割合）を教えてくれます。バンカーは約1.06%で、カジノの賭けの中でも最も損の小さい賭けの一つです。',
  't.deal': '賭けてみよう', 'b.deal': 'チップを置いたら<b>賭ける</b>を押します。カードはプレイヤー→バンカー→プレイヤー→バンカーの順に配られます。',
  'ng.deal': 'ここでは「賭ける」を押してください',
  't.result': '勝負の結果', 'b.result': 'カードは一の位だけを数えます（10・J・Q・Kは0）。プレイヤーは 2+3=<b>5</b> だったので3枚目を引き、9が来て 14 → <b>4</b>。バンカーは K+6=<b>6</b>。<b>6対4でバンカーの勝ち</b>です。',
  't.third': '3枚目のルール', 'b.third': 'プレイヤーは0〜5なら引き、6・7なら止まります。バンカーは自分の合計とプレイヤーの3枚目で決まり、今回は「バンカー6、3枚目が9 → 止まる」。コーチがこの手順を毎回説明してくれます。',
  't.payout': '配当', 'b.payout': 'バンカーの勝ちは<b>5%のコミッション</b>を引いて0.95倍。100賭けて <b>95</b> の勝ちです。プレイヤーなら1倍、タイなら8倍です。',
  't.road': '罫線', 'b.road': '結果は<b>罫線</b>に記録されます。赤＝バンカー、青＝プレイヤー。カジノでおなじみの記録表ですが、次の結果を予言するものではありません。「？」で読み方を見られます。',
  't.bots': 'BOTのプレイヤー', 'b.bots': '同じ卓のBOTたちにも、それぞれ賭け方の癖があります。バンカー一筋の Lin、負けたら倍にする Marco（マーチンゲール）、流れを追う Aiko、大穴好きの Sam。誰のやり方がうまくいくか、見比べてみましょう。',
  't.menu': 'もっと知りたいときは', 'b.menu': '<b>ルール</b>：3種類のルールを操作しながら学ぶ／<b>レッスン</b>：3枚目ルール・配当・罫線・資金管理を問題で練習／<b>研究</b>：シュー解析や必勝法の検証／<b>統計</b>：理論上の損と運の分。',
  't.end': 'チュートリアル完了！', 'b.end': 'これで基本はばっちりです。チュートリアルの勝ち負けは持ち金に影響しません。チュートリアルは「ルール」や「レッスン」からいつでももう一度できます。',
  'o.h': 'はじめての方へ', 'o.p': '実際の卓で1回遊びながら、バカラの賭け方とルールを覚えるチュートリアルがあります（約2分）。', 'o.list': 'プレイヤーとバンカー、カードの数え方|チップの置き方と配り方|3枚目のルールと配当|罫線とBOTのプレイヤー',
  'o.hide': '次から表示しない', 'o.later': 'あとで', 'o.go': 'チュートリアルを始める', entry: '実戦チュートリアル', 'entry.d': '実際の卓で1回遊びながら賭け方とルールを覚える（約2分）',
},
en: {
  fold: 'Collapse', title: 'Tutorial', next: 'Next', skip: 'Quit', do: 'Make the move yourself', skipQ: 'Quit the tutorial?', wait: 'Read the box and press Next', play: 'Back to the game', again: 'Again', thanks: 'Tutorial complete! Enjoy the game',
  't.hello': 'Welcome to baccarat!', 'b.hello': 'Learn how to bet and the rules by playing one coup at a real table (about 2 minutes).<br>In baccarat you guess which hand, <b>Player</b> or <b>Banker</b>, ends <b>closer to 9</b>.',
  't.hands': 'Where the cards go', 'b.hands': 'The two hands, PLAYER and BANKER, are dealt here. Neither is a person — they are just <b>the names of the hands</b>. You only bet on which one wins; the rules decide every draw.',
  't.seat': 'Your seat', 'b.seat': '<b>Seat 3</b> in the middle is yours. Put chips on PLAYER, BANKER, TIE or the pairs to bet. Bot players sit in the other seats.',
  't.chips': 'Chips and bankroll', 'b.chips': 'Choose the chip to place here (now 100). Your chips carry over to the next game; at zero you start again with 10,000.',
  't.bet': 'Bet on Banker', 'b.bet': 'Tap <b>BANKER</b> in your seat to bet 100.',
  'ng.bet': 'Tap BANKER in your own seat (seat 3)',
  't.coach': 'The coach', 'b.coach': 'The coach shows the <b>house edge</b> of your bets (the share you lose on average). Banker is about 1.06% — one of the cheapest bets in the casino.',
  't.deal': 'Place your bet', 'b.deal': 'Now press <b>Place bet</b>. The cards come Player → Banker → Player → Banker.',
  'ng.deal': 'Press Place bet here',
  't.result': 'The result', 'b.result': 'Only the last digit counts (10, J, Q, K are 0). Player had 2+3 = <b>5</b>, drew a 9: 14 → <b>4</b>. Banker had K+6 = <b>6</b>. <b>Banker wins 6 to 4.</b>',
  't.third': 'The third-card rules', 'b.third': 'Player draws on 0–5 and stands on 6–7. Banker\'s draw depends on its total and Player\'s third card — here "Banker 6, third card 9 → stand". The coach explains these steps every coup.',
  't.payout': 'The payout', 'b.payout': 'A Banker win pays 0.95 to 1 after a <b>5% commission</b>: bet 100, win <b>95</b>. Player pays 1 to 1, Tie 8 to 1.',
  't.road': 'The roads', 'b.road': 'Results are recorded in the <b>roads</b>: red = Banker, blue = Player. Casinos love them, but they do not predict the next coup. Press “?” to learn to read them.',
  't.bots': 'The bot players', 'b.bots': 'Each bot at the table has a habit: Lin always bets Banker, Marco doubles after a loss (the Martingale), Aiko follows the streak, Sam loves long shots. Watch whose way works out.',
  't.menu': 'To learn more', 'b.menu': '<b>Rules</b>: the three variants hands-on · <b>Lessons</b>: practice the drawing rules, payouts, roads and money management · <b>Study</b>: shoe analysis and betting systems tested · <b>Stats</b>: expected loss vs luck.',
  't.end': 'Tutorial complete!', 'b.end': 'You know the basics. The tutorial coup does not touch your chips. You can replay it any time from Rules or Lessons.',
  'o.h': 'New to baccarat?', 'o.p': 'A tutorial teaches how to bet and the rules while you play one coup at a real table (about 2 minutes).', 'o.list': 'Player and Banker, counting the cards|Placing chips and dealing|The third-card rules and payouts|The roads and the bot players',
  'o.hide': 'Do not show again', 'o.later': 'Later', 'o.go': 'Start the tutorial', entry: 'Play-along tutorial', 'entry.d': 'Learn to bet and the rules by playing one coup at a real table (about 2 min)',
},
zh: {
  fold: '收起', title: '教程', next: '下一步', skip: '退出', do: '请亲自操作', skipQ: '要退出教程吗？', wait: '阅读说明后点击“下一步”', play: '返回游戏', again: '再来一次', thanks: '教程完成！祝你玩得开心',
  't.hello': '欢迎来到百家乐！', 'b.hello': '在真实牌桌上玩一局，学习下注方法和规则（约2分钟）。<br>百家乐就是猜<b>闲</b>和<b>庄</b>哪一手牌<b>更接近9点</b>。',
  't.hands': '牌放在哪里', 'b.hands': 'PLAYER 和 BANKER 两手牌发在这里。两者都不是人——只是<b>两手牌的名字</b>。你只需押哪一方赢；是否补牌全由规则决定。',
  't.seat': '你的座位', 'b.seat': '中间的<b>3号座位</b>是你的。把筹码放在 PLAYER、BANKER、TIE 或对子上即可下注。其他座位上坐着机器人玩家。',
  't.chips': '筹码与本金', 'b.chips': '在这里选择要放的筹码（现在是100）。你的筹码会带到下一局游戏；输光后会以10,000重新开始。',
  't.bet': '押庄', 'b.bet': '点击你座位上的 <b>BANKER</b>，押100。',
  'ng.bet': '请点击你自己座位（3号座位）上的 BANKER',
  't.coach': '教练', 'b.coach': '教练会显示你下注的<b>庄家优势</b>（平均输掉的比例）。庄约为1.06%——是赌场里代价最小的下注之一。',
  't.deal': '发牌', 'b.deal': '现在点击<b>发牌</b>。牌按 闲 → 庄 → 闲 → 庄 的顺序发出。',
  'ng.deal': '请在这里点击“发牌”',
  't.result': '结果', 'b.result': '只看个位数（10、J、Q、K 算0）。闲是 2+3 = <b>5</b>，补到一张9：14 → <b>4</b>。庄是 K+6 = <b>6</b>。<b>庄以6比4获胜。</b>',
  't.third': '第三张牌规则', 'b.third': '闲在0–5点时补牌，6–7点时停牌。庄是否补牌取决于自己的点数和闲的第三张牌——这里是“庄6点，第三张牌是9 → 停牌”。教练每局都会讲解这些步骤。',
  't.payout': '赔付', 'b.payout': '庄赢扣除<b>5%佣金</b>后赔 0.95 赔 1：押100，赢<b>95</b>。闲赔 1 赔 1，和赔 8 赔 1。',
  't.road': '路单', 'b.road': '结果记录在<b>路单</b>上：红 = 庄，蓝 = 闲。赌场很喜欢路单，但它无法预测下一局。点击“?”学习怎么看。',
  't.bots': '机器人玩家', 'b.bots': '桌上每个机器人都有自己的习惯：Lin 总是押庄，Marco 输了就加倍（马丁格尔），Aiko 跟着连胜走，Sam 爱押冷门。看看谁的方法行得通。',
  't.menu': '想了解更多', 'b.menu': '<b>规则</b>：动手体验三种玩法 · <b>课程</b>：练习补牌规则、赔率、路单和资金管理 · <b>学习</b>：牌靴分析与投注法检验 · <b>统计</b>：期望损失与运气。',
  't.end': '教程完成！', 'b.end': '你已经掌握了基础。教程中的这一局不会影响你的筹码。你可以随时从“规则”或“课程”中再玩一次。',
  'o.h': '第一次玩百家乐？', 'o.p': '教程会让你在真实牌桌上玩一局，同时学习下注方法和规则（约2分钟）。', 'o.list': '闲和庄，牌的点数计算|放筹码与发牌|第三张牌规则与赔付|路单与机器人玩家',
  'o.hide': '不再显示', 'o.later': '稍后', 'o.go': '开始教程', entry: '实战教程', 'entry.d': '在真实牌桌上玩一局，学习下注方法和规则（约2分钟）',
},
ko: {
  fold: '접기', title: '튜토리얼', next: '다음', skip: '그만하기', do: '직접 해 보세요', skipQ: '튜토리얼을 그만할까요?', wait: '설명을 읽고 \'다음\'을 누르세요', play: '게임으로 돌아가기', again: '다시 하기', thanks: '튜토리얼 완료! 게임을 즐기세요',
  't.hello': '바카라에 오신 것을 환영합니다!', 'b.hello': '실제 테이블에서 한 게임을 하며 베팅 방법과 규칙을 배워 봅시다(약 2분).<br>바카라는 <b>플레이어</b>와 <b>뱅커</b> 중 어느 쪽 패가 <b>9에 더 가까운지</b> 맞히는 게임입니다.',
  't.hands': '카드가 놓이는 곳', 'b.hands': 'PLAYER와 BANKER, 두 패가 여기에 딜됩니다. 둘 다 사람이 아니라 그냥 <b>패의 이름</b>입니다. 어느 쪽이 이길지에만 걸면 되고, 카드를 더 받을지는 모두 규칙이 정합니다.',
  't.seat': '내 자리', 'b.seat': '가운데 <b>3번 자리</b>가 내 자리입니다. PLAYER, BANKER, TIE 또는 페어에 칩을 놓아 베팅합니다. 다른 자리에는 봇 플레이어가 앉아 있습니다.',
  't.chips': '칩과 자금', 'b.chips': '놓을 칩을 여기서 고릅니다(지금은 100). 칩은 다음 게임으로 이어지며, 0이 되면 10,000으로 다시 시작합니다.',
  't.bet': '뱅커에 걸기', 'b.bet': '내 자리의 <b>BANKER</b>를 탭해서 100을 걸어 보세요.',
  'ng.bet': '내 자리(3번)의 BANKER를 탭하세요',
  't.coach': '코치', 'b.coach': '코치가 내 베팅의 <b>하우스 엣지</b>(평균적으로 잃는 비율)를 보여 줍니다. 뱅커는 약 1.06% — 카지노에서 가장 저렴한 베팅 중 하나입니다.',
  't.deal': '딜', 'b.deal': '이제 <b>딜</b>을 누르세요. 카드는 플레이어 → 뱅커 → 플레이어 → 뱅커 순서로 나옵니다.',
  'ng.deal': '여기서는 \'딜\'을 누르세요',
  't.result': '결과', 'b.result': '끝자리만 셉니다(10, J, Q, K는 0). 플레이어는 2+3 = <b>5</b>라서 9를 받아 14 → <b>4</b>. 뱅커는 K+6 = <b>6</b>. <b>뱅커가 6 대 4로 승리.</b>',
  't.third': '세 번째 카드 규칙', 'b.third': '플레이어는 0–5면 받고 6–7이면 멈춥니다. 뱅커는 자기 합계와 플레이어의 세 번째 카드로 정해집니다 — 이번에는 "뱅커 6, 세 번째 카드 9 → 멈춤". 코치가 매 게임 이 과정을 설명해 줍니다.',
  't.payout': '배당', 'b.payout': '뱅커 승리는 <b>5% 커미션</b>을 떼고 0.95 대 1: 100을 걸면 <b>95</b>를 땁니다. 플레이어는 1 대 1, 타이는 8 대 1.',
  't.road': '로드', 'b.road': '결과는 <b>로드</b>에 기록됩니다: 빨강 = 뱅커, 파랑 = 플레이어. 카지노에서 많이 쓰지만 다음 게임을 예측하지는 못합니다. “?”를 누르면 읽는 법을 볼 수 있어요.',
  't.bots': '봇 플레이어', 'b.bots': '테이블의 봇마다 버릇이 있습니다: Lin은 항상 뱅커에 걸고, Marco는 지면 두 배로 올리고(마틴게일), Aiko는 흐름을 따라가고, Sam은 대박을 노립니다. 누구의 방식이 통하는지 지켜보세요.',
  't.menu': '더 알고 싶다면', 'b.menu': '<b>규칙</b>: 세 가지 변형을 직접 해 보며 배우기 · <b>레슨</b>: 드로 규칙, 배당, 로드, 자금 관리 연습 · <b>학습</b>: 슈 분석과 베팅 시스템 검증 · <b>통계</b>: 기대 손실과 운.',
  't.end': '튜토리얼 완료!', 'b.end': '이제 기본은 익혔습니다. 튜토리얼 게임은 칩에 영향을 주지 않습니다. \'규칙\'이나 \'레슨\'에서 언제든 다시 할 수 있어요.',
  'o.h': '바카라가 처음이신가요?', 'o.p': '실제 테이블에서 한 게임을 하며 베팅 방법과 규칙을 배우는 튜토리얼이 있습니다(약 2분).', 'o.list': '플레이어와 뱅커, 카드 세는 법|칩 놓기와 딜|세 번째 카드 규칙과 배당|로드와 봇 플레이어',
  'o.hide': '다시 표시하지 않기', 'o.later': '나중에', 'o.go': '튜토리얼 시작', entry: '실전 튜토리얼', 'entry.d': '실제 테이블에서 한 게임을 하며 베팅 방법과 규칙 배우기(약 2분)',
},
es: {
  fold: 'Plegar', title: 'Tutorial', next: 'Siguiente', skip: 'Salir', do: 'Haz tú la jugada', skipQ: '¿Salir del tutorial?', wait: 'Lee el recuadro y pulsa Siguiente', play: 'Volver al juego', again: 'Otra vez', thanks: '¡Tutorial completado! Disfruta del juego',
  't.hello': '¡Bienvenido al bacará!', 'b.hello': 'Aprende a apostar y las reglas jugando una mano en una mesa real (unos 2 minutos).<br>En el bacará adivinas qué mano, <b>Jugador</b> o <b>Banca</b>, termina <b>más cerca de 9</b>.',
  't.hands': 'Dónde van las cartas', 'b.hands': 'Aquí se reparten las dos manos, PLAYER y BANKER. Ninguna es una persona: son solo <b>los nombres de las manos</b>. Tú solo apuestas a cuál gana; las reglas deciden cada robo.',
  't.seat': 'Tu asiento', 'b.seat': 'El <b>asiento 3</b>, en el centro, es el tuyo. Pon fichas en PLAYER, BANKER, TIE o en las parejas para apostar. En los demás asientos hay jugadores bot.',
  't.chips': 'Fichas y saldo', 'b.chips': 'Elige aquí la ficha que vas a colocar (ahora 100). Tus fichas pasan a la siguiente partida; si llegas a cero, empiezas de nuevo con 10.000.',
  't.bet': 'Apuesta a la Banca', 'b.bet': 'Toca <b>BANKER</b> en tu asiento para apostar 100.',
  'ng.bet': 'Toca BANKER en tu propio asiento (asiento 3)',
  't.coach': 'El coach', 'b.coach': 'El coach muestra la <b>ventaja de la casa</b> de tus apuestas (la parte que pierdes de media). La Banca ronda el 1,06 %: una de las apuestas más baratas del casino.',
  't.deal': 'Repartir', 'b.deal': 'Ahora pulsa <b>Repartir</b>. Las cartas salen Jugador → Banca → Jugador → Banca.',
  'ng.deal': 'Pulsa Repartir aquí',
  't.result': 'El resultado', 'b.result': 'Solo cuenta la última cifra (10, J, Q y K valen 0). El Jugador tenía 2+3 = <b>5</b> y robó un 9: 14 → <b>4</b>. La Banca tenía K+6 = <b>6</b>. <b>La Banca gana 6 a 4.</b>',
  't.third': 'Las reglas de la tercera carta', 'b.third': 'El Jugador roba con 0–5 y se planta con 6–7. El robo de la Banca depende de su total y de la tercera carta del Jugador; aquí, "Banca 6, tercera carta 9 → se planta". El coach explica estos pasos en cada mano.',
  't.payout': 'El pago', 'b.payout': 'Una victoria de la Banca paga 0,95 a 1 tras una <b>comisión del 5 %</b>: apuestas 100, ganas <b>95</b>. El Jugador paga 1 a 1 y el Empate, 8 a 1.',
  't.road': 'Las carreteras', 'b.road': 'Los resultados se anotan en las <b>carreteras</b>: rojo = Banca, azul = Jugador. A los casinos les encantan, pero no predicen la próxima mano. Pulsa “?” para aprender a leerlas.',
  't.bots': 'Los jugadores bot', 'b.bots': 'Cada bot de la mesa tiene su costumbre: Lin siempre apuesta a la Banca, Marco dobla tras perder (la martingala), Aiko sigue la racha y a Sam le encantan las apuestas arriesgadas. Mira qué método funciona.',
  't.menu': 'Para saber más', 'b.menu': '<b>Reglas</b>: las tres variantes, en la práctica · <b>Lecciones</b>: practica las reglas de robo, los pagos, las carreteras y la gestión del dinero · <b>Estudio</b>: análisis del sabot y sistemas de apuestas a prueba · <b>Estadísticas</b>: pérdida esperada frente a suerte.',
  't.end': '¡Tutorial completado!', 'b.end': 'Ya conoces lo básico. La mano del tutorial no afecta a tus fichas. Puedes repetirlo cuando quieras desde Reglas o Lecciones.',
  'o.h': '¿Nuevo en el bacará?', 'o.p': 'Un tutorial te enseña a apostar y las reglas mientras juegas una mano en una mesa real (unos 2 minutos).', 'o.list': 'Jugador y Banca, cómo contar las cartas|Colocar fichas y repartir|Las reglas de la tercera carta y los pagos|Las carreteras y los jugadores bot',
  'o.hide': 'No volver a mostrar', 'o.later': 'Más tarde', 'o.go': 'Empezar el tutorial', entry: 'Tutorial práctico', 'entry.d': 'Aprende a apostar y las reglas jugando una mano en una mesa real (unos 2 min)',
},
fr: {
  fold: 'Replier', title: 'Tutoriel', next: 'Suivant', skip: 'Quitter', do: 'À vous de jouer', skipQ: 'Quitter le tutoriel ?', wait: 'Lisez l\'encadré puis appuyez sur Suivant', play: 'Retour au jeu', again: 'Rejouer', thanks: 'Tutoriel terminé ! Bon jeu',
  't.hello': 'Bienvenue au baccara !', 'b.hello': 'Apprenez à miser et les règles en jouant un coup à une vraie table (environ 2 minutes).<br>Au baccara, vous devinez quelle main, <b>Joueur</b> ou <b>Banque</b>, finit <b>le plus près de 9</b>.',
  't.hands': 'Où vont les cartes', 'b.hands': 'Les deux mains, PLAYER et BANKER, sont distribuées ici. Aucune n\'est une personne : ce sont simplement <b>les noms des mains</b>. Vous misez seulement sur celle qui gagne ; les règles décident de chaque tirage.',
  't.seat': 'Votre place', 'b.seat': 'La <b>place 3</b>, au milieu, est la vôtre. Posez des jetons sur PLAYER, BANKER, TIE ou les paires pour miser. Des joueurs bots occupent les autres places.',
  't.chips': 'Jetons et cagnotte', 'b.chips': 'Choisissez ici le jeton à poser (100 pour l\'instant). Vos jetons passent à la partie suivante ; à zéro, vous repartez avec 10 000.',
  't.bet': 'Misez sur la Banque', 'b.bet': 'Touchez <b>BANKER</b> à votre place pour miser 100.',
  'ng.bet': 'Touchez BANKER à votre propre place (place 3)',
  't.coach': 'Le coach', 'b.coach': 'Le coach affiche l\'<b>avantage de la maison</b> de vos mises (la part perdue en moyenne). La Banque est à environ 1,06 % : l\'une des mises les moins chères du casino.',
  't.deal': 'Distribuer', 'b.deal': 'Appuyez maintenant sur <b>Distribuer</b>. Les cartes viennent Joueur → Banque → Joueur → Banque.',
  'ng.deal': 'Appuyez sur Distribuer ici',
  't.result': 'Le résultat', 'b.result': 'Seul le dernier chiffre compte (10, J, Q, K valent 0). Le Joueur avait 2+3 = <b>5</b> et a tiré un 9 : 14 → <b>4</b>. La Banque avait K+6 = <b>6</b>. <b>La Banque gagne 6 à 4.</b>',
  't.third': 'Les règles de la troisième carte', 'b.third': 'Le Joueur tire sur 0–5 et reste sur 6–7. Le tirage de la Banque dépend de son total et de la troisième carte du Joueur — ici « Banque 6, troisième carte 9 → reste ». Le coach explique ces étapes à chaque coup.',
  't.payout': 'Le gain', 'b.payout': 'Une victoire de la Banque paie 0,95 contre 1 après une <b>commission de 5 %</b> : misez 100, gagnez <b>95</b>. Le Joueur paie 1 contre 1, l\'Égalité 8 contre 1.',
  't.road': 'Les routes', 'b.road': 'Les résultats sont notés dans les <b>routes</b> : rouge = Banque, bleu = Joueur. Les casinos les adorent, mais elles ne prédisent pas le coup suivant. Appuyez sur “?” pour apprendre à les lire.',
  't.bots': 'Les joueurs bots', 'b.bots': 'Chaque bot de la table a son habitude : Lin mise toujours sur la Banque, Marco double après une perte (la martingale), Aiko suit la série, Sam adore les paris risqués. Regardez quelle méthode marche.',
  't.menu': 'Pour en savoir plus', 'b.menu': '<b>Règles</b> : les trois variantes en pratique · <b>Leçons</b> : entraînez-vous aux règles de tirage, aux gains, aux routes et à la gestion de l\'argent · <b>Étude</b> : analyse du sabot et systèmes de mise testés · <b>Stats</b> : perte attendue vs chance.',
  't.end': 'Tutoriel terminé !', 'b.end': 'Vous connaissez les bases. Le coup du tutoriel ne touche pas à vos jetons. Vous pouvez le rejouer à tout moment depuis Règles ou Leçons.',
  'o.h': 'Nouveau au baccara ?', 'o.p': 'Un tutoriel vous apprend à miser et les règles pendant que vous jouez un coup à une vraie table (environ 2 minutes).', 'o.list': 'Joueur et Banque, compter les cartes|Poser des jetons et distribuer|Les règles de la troisième carte et les gains|Les routes et les joueurs bots',
  'o.hide': 'Ne plus afficher', 'o.later': 'Plus tard', 'o.go': 'Lancer le tutoriel', entry: 'Tutoriel en jeu', 'entry.d': 'Apprenez à miser et les règles en jouant un coup à une vraie table (environ 2 min)',
},
pt: {
  fold: 'Recolher', title: 'Tutorial', next: 'Próximo', skip: 'Sair', do: 'Faça a jogada você mesmo', skipQ: 'Sair do tutorial?', wait: 'Leia o quadro e pressione Próximo', play: 'Voltar ao jogo', again: 'De novo', thanks: 'Tutorial concluído! Divirta-se',
  't.hello': 'Bem-vindo ao bacará!', 'b.hello': 'Aprenda a apostar e as regras jogando uma rodada numa mesa de verdade (cerca de 2 minutos).<br>No bacará você adivinha qual mão, <b>Jogador</b> ou <b>Banca</b>, termina <b>mais perto de 9</b>.',
  't.hands': 'Onde ficam as cartas', 'b.hands': 'As duas mãos, PLAYER e BANKER, são distribuídas aqui. Nenhuma é uma pessoa — são só <b>os nomes das mãos</b>. Você só aposta em qual vence; as regras decidem cada compra.',
  't.seat': 'Seu lugar', 'b.seat': 'O <b>lugar 3</b>, no meio, é o seu. Coloque fichas em PLAYER, BANKER, TIE ou nos pares para apostar. Jogadores bots ocupam os outros lugares.',
  't.chips': 'Fichas e saldo', 'b.chips': 'Escolha aqui a ficha a colocar (agora 100). Suas fichas passam para o próximo jogo; se zerar, você recomeça com 10.000.',
  't.bet': 'Aposte na Banca', 'b.bet': 'Toque em <b>BANKER</b> no seu lugar para apostar 100.',
  'ng.bet': 'Toque em BANKER no seu próprio lugar (lugar 3)',
  't.coach': 'O treinador', 'b.coach': 'O treinador mostra a <b>vantagem da casa</b> das suas apostas (a parte que você perde em média). A Banca fica em cerca de 1,06% — uma das apostas mais baratas do cassino.',
  't.deal': 'Distribuir', 'b.deal': 'Agora toque em <b>Distribuir</b>. As cartas saem Jogador → Banca → Jogador → Banca.',
  'ng.deal': 'Toque em Distribuir aqui',
  't.result': 'O resultado', 'b.result': 'Só conta o último dígito (10, J, Q, K valem 0). O Jogador tinha 2+3 = <b>5</b> e comprou um 9: 14 → <b>4</b>. A Banca tinha K+6 = <b>6</b>. <b>A Banca vence por 6 a 4.</b>',
  't.third': 'As regras da terceira carta', 'b.third': 'O Jogador compra com 0–5 e para com 6–7. A compra da Banca depende do total dela e da terceira carta do Jogador — aqui, "Banca 6, terceira carta 9 → para". O treinador explica esses passos a cada rodada.',
  't.payout': 'O pagamento', 'b.payout': 'Uma vitória da Banca paga 0,95 para 1 após uma <b>comissão de 5%</b>: aposte 100, ganhe <b>95</b>. Jogador paga 1 para 1, Empate 8 para 1.',
  't.road': 'As estradas', 'b.road': 'Os resultados são anotados nas <b>estradas</b>: vermelho = Banca, azul = Jogador. Os cassinos adoram, mas elas não preveem a próxima rodada. Toque em “?” para aprender a lê-las.',
  't.bots': 'Os jogadores bots', 'b.bots': 'Cada bot da mesa tem um hábito: Lin sempre aposta na Banca, Marco dobra depois de perder (o Martingale), Aiko segue a sequência, Sam adora apostas arriscadas. Veja qual jeito dá certo.',
  't.menu': 'Para saber mais', 'b.menu': '<b>Regras</b>: as três variantes na prática · <b>Lições</b>: pratique as regras de compra, pagamentos, estradas e gestão do dinheiro · <b>Estudo</b>: análise do sapato e sistemas de apostas testados · <b>Estatísticas</b>: perda esperada vs. sorte.',
  't.end': 'Tutorial concluído!', 'b.end': 'Você já sabe o básico. A rodada do tutorial não mexe nas suas fichas. Você pode repeti-lo quando quiser em Regras ou Lições.',
  'o.h': 'Novo no bacará?', 'o.p': 'Um tutorial ensina a apostar e as regras enquanto você joga uma rodada numa mesa de verdade (cerca de 2 minutos).', 'o.list': 'Jogador e Banca, como contar as cartas|Colocar fichas e distribuir|As regras da terceira carta e os pagamentos|As estradas e os jogadores bots',
  'o.hide': 'Não mostrar novamente', 'o.later': 'Depois', 'o.go': 'Começar o tutorial', entry: 'Tutorial na prática', 'entry.d': 'Aprenda a apostar e as regras jogando uma rodada numa mesa de verdade (cerca de 2 min)',
},
de: {
  fold: 'Einklappen', title: 'Tutorial', next: 'Weiter', skip: 'Beenden', do: 'Jetzt bist du dran', skipQ: 'Tutorial beenden?', wait: 'Lies den Hinweis und drücke auf Weiter', play: 'Zurück zum Spiel', again: 'Nochmal', thanks: 'Tutorial abgeschlossen! Viel Spaß beim Spielen',
  't.hello': 'Willkommen beim Baccara!', 'b.hello': 'Lerne Setzen und Regeln, indem du eine Runde an einem echten Tisch spielst (ca. 2 Minuten).<br>Beim Baccara tippst du, welche Hand, <b>Spieler</b> oder <b>Bank</b>, <b>näher an 9</b> landet.',
  't.hands': 'Wo die Karten liegen', 'b.hands': 'Hier werden die beiden Hände PLAYER und BANKER gegeben. Keine davon ist eine Person — es sind nur <b>die Namen der Hände</b>. Du setzt nur darauf, welche gewinnt; jede gezogene Karte bestimmen die Regeln.',
  't.seat': 'Dein Platz', 'b.seat': '<b>Platz 3</b> in der Mitte ist deiner. Leg Chips auf PLAYER, BANKER, TIE oder die Paare, um zu setzen. Auf den anderen Plätzen sitzen Bot-Spieler.',
  't.chips': 'Chips und Guthaben', 'b.chips': 'Wähle hier den Chip, den du setzt (jetzt 100). Deine Chips gehen ins nächste Spiel mit; bei null fängst du mit 10.000 neu an.',
  't.bet': 'Setz auf die Bank', 'b.bet': 'Tippe auf <b>BANKER</b> an deinem Platz, um 100 zu setzen.',
  'ng.bet': 'Tippe auf BANKER an deinem eigenen Platz (Platz 3)',
  't.coach': 'Der Coach', 'b.coach': 'Der Coach zeigt den <b>Hausvorteil</b> deiner Wetten (den Anteil, den du im Schnitt verlierst). Die Bank liegt bei etwa 1,06 % — eine der günstigsten Wetten im Casino.',
  't.deal': 'Geben', 'b.deal': 'Drück jetzt auf <b>Geben</b>. Die Karten kommen Spieler → Bank → Spieler → Bank.',
  'ng.deal': 'Drück hier auf Geben',
  't.result': 'Das Ergebnis', 'b.result': 'Nur die letzte Ziffer zählt (10, J, Q, K sind 0). Spieler hatte 2+3 = <b>5</b> und zog eine 9: 14 → <b>4</b>. Die Bank hatte K+6 = <b>6</b>. <b>Die Bank gewinnt 6 zu 4.</b>',
  't.third': 'Die Regeln zur dritten Karte', 'b.third': 'Spieler zieht bei 0–5 und bleibt bei 6–7. Ob die Bank zieht, hängt von ihrer Summe und der dritten Karte des Spielers ab — hier „Bank 6, dritte Karte 9 → bleibt“. Der Coach erklärt diese Schritte in jeder Runde.',
  't.payout': 'Die Auszahlung', 'b.payout': 'Ein Bank-Sieg zahlt 0,95 zu 1 nach <b>5 % Provision</b>: 100 setzen, <b>95</b> gewinnen. Spieler zahlt 1 zu 1, Unentschieden 8 zu 1.',
  't.road': 'Die Straßen', 'b.road': 'Die Ergebnisse werden in den <b>Straßen</b> notiert: Rot = Bank, Blau = Spieler. Casinos lieben sie, aber sie sagen die nächste Runde nicht voraus. Drück auf “?”, um sie lesen zu lernen.',
  't.bots': 'Die Bot-Spieler', 'b.bots': 'Jeder Bot am Tisch hat seine Gewohnheit: Lin setzt immer auf die Bank, Marco verdoppelt nach einem Verlust (die Martingale), Aiko folgt der Serie, Sam liebt Außenseiterwetten. Schau, wessen Methode aufgeht.',
  't.menu': 'Mehr erfahren', 'b.menu': '<b>Regeln</b>: die drei Varianten zum Ausprobieren · <b>Lektionen</b>: Ziehregeln, Auszahlungen, Straßen und Geldmanagement üben · <b>Lernen</b>: Schlitten-Analyse und Wettsysteme im Test · <b>Statistik</b>: erwarteter Verlust vs. Glück.',
  't.end': 'Tutorial abgeschlossen!', 'b.end': 'Du kennst jetzt die Grundlagen. Die Tutorial-Runde berührt deine Chips nicht. Du kannst sie jederzeit über Regeln oder Lektionen wiederholen.',
  'o.h': 'Neu beim Baccara?', 'o.p': 'Ein Tutorial bringt dir Setzen und Regeln bei, während du eine Runde an einem echten Tisch spielst (ca. 2 Minuten).', 'o.list': 'Spieler und Bank, Karten zählen|Chips setzen und geben|Die Regeln zur dritten Karte und Auszahlungen|Die Straßen und die Bot-Spieler',
  'o.hide': 'Nicht mehr anzeigen', 'o.later': 'Später', 'o.go': 'Tutorial starten', entry: 'Praxis-Tutorial', 'entry.d': 'Lerne Setzen und Regeln, indem du eine Runde an einem echten Tisch spielst (ca. 2 Min.)',
},
hi: {
  fold: 'समेटें', title: 'ट्यूटोरियल', next: 'आगे', skip: 'बंद करें', do: 'अब खुद चाल चलें', skipQ: 'ट्यूटोरियल बंद करें?', wait: 'बॉक्स पढ़ें और "आगे" दबाएँ', play: 'गेम पर लौटें', again: 'फिर से', thanks: 'ट्यूटोरियल पूरा! खेल का आनंद लें',
  't.hello': 'बैकारेट में आपका स्वागत है!', 'b.hello': 'असली टेबल पर एक राउंड खेलते हुए दांव लगाना और नियम सीखें (लगभग 2 मिनट)।<br>बैकारेट में आप अंदाज़ा लगाते हैं कि कौन-सा हैंड, <b>प्लेयर</b> या <b>बैंकर</b>, <b>9 के ज़्यादा करीब</b> रहेगा।',
  't.hands': 'कार्ड कहाँ आते हैं', 'b.hands': 'दोनों हैंड, PLAYER और BANKER, यहाँ बाँटे जाते हैं। इनमें से कोई भी व्यक्ति नहीं है — ये बस <b>हैंड के नाम</b> हैं। आप सिर्फ़ इस पर दांव लगाते हैं कि कौन जीतेगा; हर कार्ड खींचने का फ़ैसला नियम करते हैं।',
  't.seat': 'आपकी सीट', 'b.seat': 'बीच वाली <b>सीट 3</b> आपकी है। दांव लगाने के लिए PLAYER, BANKER, TIE या पेयर पर चिप्स रखें। बाकी सीटों पर बॉट खिलाड़ी बैठे हैं।',
  't.chips': 'चिप्स और बैंकरोल', 'b.chips': 'रखने वाली चिप यहाँ चुनें (अभी 100)। आपकी चिप्स अगले गेम में भी साथ रहती हैं; शून्य होने पर आप 10,000 से फिर शुरू करते हैं।',
  't.bet': 'बैंकर पर दांव लगाएँ', 'b.bet': '100 का दांव लगाने के लिए अपनी सीट पर <b>BANKER</b> पर टैप करें।',
  'ng.bet': 'अपनी ही सीट (सीट 3) पर BANKER टैप करें',
  't.coach': 'कोच', 'b.coach': 'कोच आपके दांवों का <b>हाउस एज</b> दिखाता है (वह हिस्सा जो आप औसतन हारते हैं)। बैंकर लगभग 1.06% है — कैसीनो के सबसे सस्ते दांवों में से एक।',
  't.deal': 'बाँटें', 'b.deal': 'अब <b>बाँटें</b> दबाएँ। कार्ड प्लेयर → बैंकर → प्लेयर → बैंकर क्रम में आते हैं।',
  'ng.deal': 'यहाँ "बाँटें" दबाएँ',
  't.result': 'नतीजा', 'b.result': 'सिर्फ़ आख़िरी अंक गिना जाता है (10, J, Q, K = 0)। प्लेयर के पास 2+3 = <b>5</b> था, उसने 9 खींचा: 14 → <b>4</b>। बैंकर के पास K+6 = <b>6</b> था। <b>बैंकर 6 बनाम 4 से जीता।</b>',
  't.third': 'तीसरे कार्ड के नियम', 'b.third': 'प्लेयर 0–5 पर कार्ड खींचता है और 6–7 पर रुकता है। बैंकर का खींचना उसके टोटल और प्लेयर के तीसरे कार्ड पर निर्भर है — यहाँ "बैंकर 6, तीसरा कार्ड 9 → रुकें"। कोच हर राउंड में ये कदम समझाता है।',
  't.payout': 'भुगतान', 'b.payout': 'बैंकर की जीत <b>5% कमीशन</b> के बाद 0.95 के बदले 1 देती है: 100 लगाएँ, <b>95</b> जीतें। प्लेयर 1 के बदले 1, टाई 8 के बदले 1 देता है।',
  't.road': 'रोड्स', 'b.road': 'नतीजे <b>रोड्स</b> में दर्ज होते हैं: लाल = बैंकर, नीला = प्लेयर। कैसीनो इन्हें पसंद करते हैं, पर ये अगले राउंड की भविष्यवाणी नहीं करते। इन्हें पढ़ना सीखने के लिए “?” दबाएँ।',
  't.bots': 'बॉट खिलाड़ी', 'b.bots': 'टेबल के हर बॉट की एक आदत है: Lin हमेशा बैंकर पर दांव लगाता है, Marco हार के बाद दोगुना करता है (मार्टिंगेल), Aiko सिलसिले के पीछे चलता है, Sam को जोखिम भरे दांव पसंद हैं। देखें किसका तरीका काम करता है।',
  't.menu': 'और जानने के लिए', 'b.menu': '<b>नियम</b>: तीनों वेरिएंट खुद आज़माएँ · <b>पाठ</b>: खींचने के नियम, भुगतान, रोड्स और पैसे का प्रबंधन अभ्यास करें · <b>अध्ययन</b>: शू विश्लेषण और बेटिंग सिस्टम की जाँच · <b>आँकड़े</b>: अपेक्षित नुकसान बनाम किस्मत।',
  't.end': 'ट्यूटोरियल पूरा!', 'b.end': 'अब आप बुनियादी बातें जानते हैं। ट्यूटोरियल का राउंड आपकी चिप्स को नहीं छूता। आप इसे कभी भी नियम या पाठ से दोबारा खेल सकते हैं।',
  'o.h': 'बैकारेट में नए हैं?', 'o.p': 'एक ट्यूटोरियल असली टेबल पर एक राउंड खिलाते हुए दांव लगाना और नियम सिखाता है (लगभग 2 मिनट)।', 'o.list': 'प्लेयर और बैंकर, कार्ड गिनना|चिप्स रखना और बाँटना|तीसरे कार्ड के नियम और भुगतान|रोड्स और बॉट खिलाड़ी',
  'o.hide': 'दोबारा न दिखाएँ', 'o.later': 'बाद में', 'o.go': 'ट्यूटोरियल शुरू करें', entry: 'खेलकर सीखें', 'entry.d': 'असली टेबल पर एक राउंड खेलते हुए दांव लगाना और नियम सीखें (लगभग 2 मिनट)',
},
ar: {
  fold: 'طيّ', title: 'الدرس التعليمي', next: 'التالي', skip: 'خروج', do: 'قم بالحركة بنفسك', skipQ: 'الخروج من الدرس التعليمي؟', wait: 'اقرأ المربع ثم اضغط «التالي»', play: 'العودة إلى اللعبة', again: 'مرة أخرى', thanks: 'اكتمل الدرس! استمتع باللعب',
  't.hello': 'مرحبًا بك في الباكارا!', 'b.hello': 'تعلّم طريقة الرهان والقواعد بلعب جولة واحدة على طاولة حقيقية (حوالي دقيقتين).<br>في الباكارا تخمّن أي يد، <b>اللاعب</b> أم <b>المصرف</b>، تنتهي <b>أقرب إلى 9</b>.',
  't.hands': 'أين توضع الأوراق', 'b.hands': 'هنا تُوزَّع اليدان PLAYER وBANKER. ليست أيٌّ منهما شخصًا — إنهما مجرد <b>اسمين لليدين</b>. أنت تراهن فقط على أيهما يفوز؛ والقواعد تقرر كل سحب.',
  't.seat': 'مقعدك', 'b.seat': '<b>المقعد 3</b> في الوسط هو مقعدك. ضع الرقائق على PLAYER أو BANKER أو TIE أو الأزواج لتراهن. يجلس لاعبون آليون في المقاعد الأخرى.',
  't.chips': 'الرقائق والرصيد', 'b.chips': 'اختر هنا الرقاقة التي تضعها (الآن 100). تنتقل رقائقك إلى اللعبة التالية؛ وعند الصفر تبدأ من جديد بـ 10,000.',
  't.bet': 'راهن على المصرف', 'b.bet': 'اضغط على <b>BANKER</b> في مقعدك لتراهن بـ 100.',
  'ng.bet': 'اضغط على BANKER في مقعدك أنت (المقعد 3)',
  't.coach': 'المدرب', 'b.coach': 'يعرض المدرب <b>ميزة الكازينو</b> في رهاناتك (النسبة التي تخسرها في المتوسط). المصرف حوالي 1.06% — من أرخص الرهانات في الكازينو.',
  't.deal': 'وزّع', 'b.deal': 'اضغط الآن على <b>وزّع</b>. تأتي الأوراق بالترتيب اللاعب → المصرف → اللاعب → المصرف.',
  'ng.deal': 'اضغط على «وزّع» هنا',
  't.result': 'النتيجة', 'b.result': 'يُحتسب الرقم الأخير فقط (10 وJ وQ وK تساوي 0). كان لدى اللاعب 2+3 = <b>5</b> فسحب 9: 14 → <b>4</b>. وكان لدى المصرف K+6 = <b>6</b>. <b>المصرف يفوز 6 مقابل 4.</b>',
  't.third': 'قواعد الورقة الثالثة', 'b.third': 'يسحب اللاعب عند 0–5 ويتوقف عند 6–7. يعتمد سحب المصرف على مجموعه وعلى الورقة الثالثة للاعب — هنا «المصرف 6، الورقة الثالثة 9 → يتوقف». يشرح المدرب هذه الخطوات في كل جولة.',
  't.payout': 'الدفع', 'b.payout': 'فوز المصرف يدفع 0.95 مقابل 1 بعد <b>عمولة 5%</b>: راهن بـ 100 واربح <b>95</b>. اللاعب يدفع 1 مقابل 1، والتعادل 8 مقابل 1.',
  't.road': 'الطرق', 'b.road': 'تُسجَّل النتائج في <b>الطرق</b>: الأحمر = المصرف، الأزرق = اللاعب. تحبها الكازينوهات، لكنها لا تتنبأ بالجولة التالية. اضغط “?” لتتعلم قراءتها.',
  't.bots': 'اللاعبون الآليون', 'b.bots': 'لكل لاعب آلي على الطاولة عادة: Lin يراهن دائمًا على المصرف، وMarco يضاعف بعد الخسارة (المارتينجال)، وAiko يتبع السلسلة، وSam يحب الرهانات البعيدة. راقب أي طريقة تنجح.',
  't.menu': 'لمعرفة المزيد', 'b.menu': '<b>القواعد</b>: الأنواع الثلاثة عمليًا · <b>الدروس</b>: تدرّب على قواعد السحب والدفعات والطرق وإدارة المال · <b>دراسة</b>: تحليل الصندوق واختبار أنظمة الرهان · <b>إحصاءات</b>: الخسارة المتوقعة مقابل الحظ.',
  't.end': 'اكتمل الدرس!', 'b.end': 'أنت الآن تعرف الأساسيات. جولة الدرس لا تمس رقائقك. يمكنك إعادتها في أي وقت من القواعد أو الدروس.',
  'o.h': 'جديد على الباكارا؟', 'o.p': 'درس تعليمي يعلّمك طريقة الرهان والقواعد بينما تلعب جولة واحدة على طاولة حقيقية (حوالي دقيقتين).', 'o.list': 'اللاعب والمصرف، وعدّ الأوراق|وضع الرقائق والتوزيع|قواعد الورقة الثالثة والدفعات|الطرق واللاعبون الآليون',
  'o.hide': 'لا تعرض مرة أخرى', 'o.later': 'لاحقًا', 'o.go': 'ابدأ الدرس التعليمي', entry: 'درس تعليمي تطبيقي', 'entry.d': 'تعلّم طريقة الرهان والقواعد بلعب جولة واحدة على طاولة حقيقية (حوالي دقيقتين)',
},
};
function L(k) { const T = TX[A.LANG] || TX.en; let x = T[k]; if (x === undefined) x = TX.en[k]; if (x === undefined) x = TX.ja[k] || k; return x; }

window.BacTut = { setup, ev, allow, after, start, hide, finish, offer, L, TX };
// first visit: the offer box (after the page has settled)
setTimeout(() => { if (!document.querySelector('.overlay.show')) offer(false); }, 900);
})();
/* the button is now "Place bet" (not "Deal") */
(function () {
  const TX = window.BacTut && window.BacTut.TX; if (!TX) return;
  const rep = { zh: ['发牌', '下注'], ko: ['딜', '베팅'], es: ['Repartir', 'Apostar'], fr: ['Distribuer', 'Miser'], pt: ['Distribuir', 'Apostar'], de: ['Geben', 'Setzen'], hi: ['बाँटें', 'दांव लगाएँ'], ar: ['وزّع', 'راهن'] };
  for (const l in rep) if (TX[l]) ['t.deal', 'b.deal', 'ng.deal'].forEach(k => { if (TX[l][k]) TX[l][k] = TX[l][k].split(rep[l][0]).join(rep[l][1]); });
})();
/* amounts are in dollars */
(function () {
  const TX = window.BacTut && window.BacTut.TX; if (!TX) return;
  for (const l in TX) ['b.chips', 'b.bet', 'b.payout'].forEach(k => { if (TX[l][k]) TX[l][k] = TX[l][k].replace(/(^|[^\d$.,])(10[,. ]000|100|95)(?![\d%])/g, '$1$$$2'); });
})();
