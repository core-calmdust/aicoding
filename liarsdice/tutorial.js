/* ライアーダイス — the tutorial on the real table (liarsdice/tutorial.js)
   The same spotlight + bubble as the guandan / poker / blackjack tutorials, in three chapters:
     1. what the game is — cups, the dice only you can see, bids, dudo and who loses a die, how a game is won
        (read only, each step pointing at its part of the table);
     2. one scripted round on the real table (3 players, Perudo rules, fixed dice) — the game stops after every computer
        bid and the bubble says what it means; two tasks for you: a bid (any 5 or 6 × ⚂) and Dudo, each with a meter
        (the chance the bid holds / the chance the doubt is right), and the bubble moves on by itself when you do it;
     3. after the count — the bluff that was caught, palifico, calza, the coach / odds / lessons.
   Dice: you 1 3 3 3 6 · Luca 2 4 4 5 6 · Mina 2 2 5 6 6. Luca opens 3 × ⚃, Mina 4 × ⚃, you 5–6 × ⚂, Luca 6 × ⚃, Mina 8 × ⚃,
   you Dudo: three ⚃ (Luca's two and your 1) → Mina loses a die. tools: node liarsdice/tools/test.js checks the script.
   app.js calls: start · on · hold · allow · after · bot · ev('render' | 'reveal') · hint · stop. Texts: tu.* in i18n.js / i18n-src.
   First visit: an offer box (every visit until "don't show again" is ticked or the tutorial is finished). */
(function () {
'use strict';
const A = window.LdApp, LD = window.LD, AI = window.LDAI, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
const HANDS = [[1, 3, 3, 3, 6], [2, 4, 4, 5, 6], [2, 2, 5, 6, 6]];
const SCRIPT = [[1, { t: 'bid', q: 3, f: 4 }], [2, { t: 'bid', q: 4, f: 4 }], [1, { t: 'bid', q: 6, f: 4 }], [2, { t: 'bid', q: 8, f: 4 }]];
const TASK_F = 3, TASK_Q = [5, 6];
const G = () => A.G, U = () => A.U;
const bidding = () => !!G() && U().phase === 'bid';
const bots = n => () => bidding() && sp === n;
const myTurn = () => bidding() && G().round.turn === 0;
const counted = () => !!(U().rev && U().rev.done);
const SEAT = p => `.seat.s${p} .plate`, BUB = p => `.seat.s${p} .bub`, CUP = p => `.seat.s${p} .cup`;
/* the steps. k: info (read, then Next) · bid / dudo (do it on the table). ch: the chapter. when: the moment the step waits for.
   at: one ring per entry (an entry may be a list: one ring around them all). see: what the text talks about without a ring —
   the bubble must not cover it either (no ring, no veil hole). pics: a small picture in the bubble. center: no ring. */
const STEPS = [
  { id: 'what', ch: 1, k: 'info', when: bidding, center: true, pics: 'what' },
  { id: 'mine', ch: 1, k: 'info', when: bidding, at: ['.seat.me .dice'] },
  { id: 'cups', ch: 1, k: 'info', when: bidding, at: [[CUP(1), SEAT(1)], [CUP(2), SEAT(2)]] },
  { id: 'bid', ch: 1, k: 'info', when: bidding, center: true, pics: 'bid' },
  { id: 'raise', ch: 1, k: 'info', when: bidding, center: true, pics: 'raise' },
  { id: 'dudo', ch: 1, k: 'info', when: bidding, center: true, pics: 'dudo' },
  { id: 'goal', ch: 1, k: 'info', when: bidding, at: [SEAT(0), SEAT(1), SEAT(2)] },
  { id: 'go', ch: 1, k: 'info', when: bidding, center: true },
  { id: 'n1', ch: 2, k: 'info', when: bots(1), at: [[BUB(1), SEAT(1)], '.mid-bid'] },
  { id: 'wild', ch: 2, k: 'info', when: bots(1), at: ['.seat.me .dice', '.mid .wildt'] },
  { id: 'n2', ch: 2, k: 'info', when: bots(2), at: [[BUB(2), SEAT(2)], '.mid-bid'], see: [BUB(1)] },
  { id: 'p1', ch: 2, k: 'bid', when: myTurn, at: [['#actbar .bld'], '#abBid'], see: ['.mid-bid', '.seat.me .dice'], meter: 'bid' },
  { id: 'n3', ch: 2, k: 'info', when: bots(3), at: [[BUB(1), SEAT(1)], '.mid .hist'], see: [BUB(0)] },
  { id: 'n4', ch: 2, k: 'info', when: bots(4), at: [[BUB(2), SEAT(2)], '.mid-bid'], see: ['.seat.me .dice', [BUB(1), SEAT(1)]] },
  { id: 'p2', ch: 2, k: 'dudo', when: myTurn, at: ['.mid-bid', '#abDudo'], see: [[BUB(1), SEAT(1)], [BUB(2), SEAT(2)], '.seat.me .dice'], meter: 'dudo' },
  { id: 'c1', ch: 2, k: 'info', when: counted, at: ['.mid .count', '.mid .verdict'], see: ['.seat.s1 .dice', ['.seat.s2 .dice', SEAT(2)], '.seat.me .dice'] },
  { id: 'c2', ch: 2, k: 'info', when: counted, at: [['.seat.s2 .dice', SEAT(2)], ['.seat.s1 .dice']] },
  { id: 'pal', ch: 3, k: 'info', when: counted, center: true, pics: 'pal' },
  { id: 'calza', ch: 3, k: 'info', when: counted, center: true, pics: 'calza' },
  { id: 'tools', ch: 3, k: 'info', when: counted, at: ['#btnHint', '#btnCalc', '#btnLesson', '#btnRules'], see: ['.coach-card'] },
  { id: 'end', ch: 3, k: 'info', when: counted, center: true, last: true },
];
let on = false, idx = 0, sp = 0, layer = null, box = null, mask = null, rings = null, tab0 = null;
const cur = () => STEPS[idx];
const active = () => { const st = cur(); return !!(on && st && G() && st.when()); };
function start() {
  const o = $('#tutOffer'); if (o) o.remove();
  ['#rulesOverlay', '#lessonOverlay', '#newOverlay', '#resOverlay'].forEach(s => { const e = $(s); if (e) e.classList.remove('show'); });
  if (tab0 === null) tab0 = A.set.mTab || '';
  on = true; idx = 0; sp = 0; lastKey = '';
  A.startTutorial(HANDS);
  show();
}
// the computer waits while a step is being read
function hold() { const st = cur(); return !!(on && st && st.k === 'info' && active()); }
function bot(g, p) {
  const m = SCRIPT[sp];
  if (m && m[0] === p) { const ctx = LD.bidCtx(g, p); if (m[1].t !== 'bid' || LD.legalBid(ctx, m[1].q, m[1].f)) { sp++; return m[1]; } }
  return AI.decide(g, p, 3);   // (the script and the table disagree: never happens with the fixed dice)
}
const okBid = a => a.t === 'bid' && a.f === TASK_F && TASK_Q.includes(a.q);
// a wrong move: the reason in the bubble (not a toast: at the bottom it would cover the buttons), and the bubble shakes
function ng(k) {
  const e = box && box.querySelector('.tut-ng');
  if (e && layer.classList.contains('show')) { e.textContent = t(k); e.hidden = false; place(); } else A.toast(t(k));
  shake(); return false;
}
function allow(a) {
  const st = cur();
  if (!st || !active() || st.k === 'info') return ng(st && st.k === 'info' && active() ? 'tu.ngNext' : 'tu.watch');
  if (st.k === 'bid') {
    if (a.t !== 'bid') return ng('tu.ngBidNow');
    if (!okBid(a)) return ng('tu.ngBid');
    return true;
  }
  if (a.t !== 'dudo') return ng('tu.ngDudo');
  return true;
}
function after(a) {
  const st = cur(); if (!on || !st || st.k === 'info') return;
  if (st.k === a) { A.sfx('gain'); idx++; lastKey = ''; show(); }
}
// the hint button: the task's answer (a bid of 5 × ⚂ in the builder, or the Dudo button flashes)
function hint() {
  const st = cur(); if (!st || !active()) return;
  if (st.k === 'bid') { A.U.f = TASK_F; A.U.q = TASK_Q[0]; A.render(); }
  else if (st.k === 'dudo') { const b = $('#abDudo'); if (b) { b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); } }
}
function next() {
  const st = cur(); if (!st) return;
  if (st.last) { try { localStorage.setItem(DONE, '1'); } catch (e) {} finish(); A.toast(t('tu.thanks')); return; }
  A.sfx('sel'); idx++; lastKey = ''; show(); A.loop();
}
function back() { if (idx > 0 && STEPS[idx - 1].when === cur().when) { idx--; lastKey = ''; show(); } }
// the end (or quit): back to the game that was on the table before
function finish() {
  const was = on; stop();
  if (was) { A.endTutorial(); if (tab0 && A.showTab) A.showTab(tab0); tab0 = null; }
}
// stop without restoring (a new game was started over the tutorial)
function stop() { on = false; hide(); }
function ev(k) { if (on && (k === 'render' || k === 'reveal')) show(); }

/* ---------- the meter: the chance the bid you are building holds / the chance your doubt is right ---------- */
let CK = null, CKkey = '';
function coach() {
  const g = G(); const key = g.round.no + ':' + g.round.bids.length;
  if (CKkey !== key) { CKkey = key; try { CK = AI.coach(g, 0); } catch (e) { CK = null; } }
  return CK;
}
function meterHtml(st) {
  if (!st.meter || !active()) return '';
  const C = coach(); if (!C) return '';
  let p, lab;
  if (st.meter === 'dudo') { p = 1 - C.T; lab = t('tu.mDudo', { b: A.bidTxt(LD.last(G())) }); }
  else {
    const u = A.U; if (!u.f || !u.q) return '';
    p = AI.pTrue(C.V, u.q, u.f); lab = t('tu.mBid', { b: A.bidTxt({ q: u.q, f: u.f }) });
  }
  const v = Math.round(p * 100), cls = v >= 70 ? 'hi' : v >= 40 ? 'mid' : 'lo';
  return `<div class="tut-meter ${cls}"><small>${esc(lab)}</small><span class="tm-bar"><i style="width:${v}%"></i></span><b>${v}%</b></div>`;
}

/* ---------- the small pictures in the bubble ---------- */
const D = (f, c) => Dice.img(f, 'tpd' + (c ? ' ' + c : ''));
const bidP = (q, f, lab, cls) => `<div class="tp-row${cls ? ' ' + cls : ''}"><span class="tp-bid"><b>${q}</b><i>×</i>${D(f)}</span>${lab ? `<small>${lab}</small>` : ''}</div>`;
const PICS = {
  what: () => `<div class="tp-pics one"><span class="tp-art">${Dice.art('perudo')}</span></div>`,
  bid: () => `<div class="tp-pics flow">${bidP(3, 4, esc(t('tu.pBid')))}<b>=</b><div class="tp-row"><span class="tp-c">${[4, 4, 4].map(f => D(f)).join('')}<em>+</em></span><small>${esc(t('tu.pBid2'))}</small></div></div>`,
  raise: () => `<div class="tp-pics flow">${bidP(3, 4, esc(t('tu.pR0')))}<b>›</b>${bidP(4, 4, esc(t('tu.pR1')))}<b>/</b>${bidP(3, 5, esc(t('tu.pR2')))}</div>`,
  dudo: () => `<div class="tp-pics grid">${bidP(8, 4, esc(t('tu.pD1')), 'ng')}${bidP(3, 4, esc(t('tu.pD2')), 'ok')}</div>`,
  pal: () => `<div class="tp-pics flow"><div class="tp-row"><span class="tp-c">${D(5)}</span><small>${esc(t('tu.pP1'))}</small></div><b>›</b><div class="tp-row"><span class="tp-c">${D(1, 'nw')}</span><small>${esc(t('tu.pP2'))}</small></div></div>`,
  calza: () => `<div class="tp-pics grid">${bidP(5, 2, esc(t('tu.pC1')), 'ok')}${bidP(5, 2, esc(t('tu.pC2')), 'ng')}</div>`,
};

/* ---------- spotlight + bubble (the guandan tutorial's) ---------- */
function ensure() {
  if (layer) return;
  layer = document.createElement('div'); layer.id = 'tutLayer'; layer.className = 'ld-tl';
  layer.innerHTML = '<svg class="tut-mask" aria-hidden="true"><path fill-rule="evenodd"/></svg><div class="tut-rings"></div><div class="tut-box ld-box" role="dialog" aria-live="polite"></div>';
  document.body.appendChild(layer);
  box = layer.querySelector('.tut-box'); mask = layer.querySelector('.tut-mask'); rings = layer.querySelector('.tut-rings');
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(place, 80); });
  addEventListener('scroll', () => { if (layer.classList.contains('show')) place(); }, true);
}
const phone = () => innerWidth <= 760;
function rectOf(sel) {
  let r = null;
  [].concat(sel).forEach(s => document.querySelectorAll(s).forEach(el => {
    const b = el.getBoundingClientRect(); if (!b.width && !b.height) return;
    r = r ? { l: Math.min(r.l, b.left), t: Math.min(r.t, b.top), r: Math.max(r.r, b.right), b: Math.max(r.b, b.bottom) } : { l: b.left, t: b.top, r: b.right, b: b.bottom };
  }));
  return r;
}
let lastKey = '', opened = -1;
function show() {
  if (!on) return;
  ensure();
  const st = cur(); if (!st) { hide(); return; }
  const act = active(), n = idx + 1, tot = STEPS.length;
  if (act && phone() && A.showTab && A.set.mTab !== 'coach') A.showTab('coach');
  const key = idx + ':' + act + ':' + A.LANG;
  if (key !== lastKey) {
    if (lastKey.split(':')[0] !== String(idx)) { if (box.classList.contains('auto')) box.classList.remove('min', 'auto'); opened = -1; }
    lastKey = key;
    let inner;
    if (!act) inner = `<p class="tp-wait">${esc(t('tu.watch'))}</p>`;
    else {
      const btn = st.k === 'info' ? `<button type="button" class="mbtn go" id="tuNext">${esc(st.last ? t('tu.done') : t('tu.next'))}</button>`
        : `<span class="tut-do">👉 ${esc(t(st.k === 'bid' ? 'tu.doBid' : 'tu.doDudo'))}</span>`;
      const canBack = idx > 0 && STEPS[idx - 1].when === st.when;
      inner = `<b class="tp-h">${esc(t('tu.' + st.id + '.t'))}</b><p>${t('tu.' + st.id + '.b')}</p>${st.pics && PICS[st.pics] ? PICS[st.pics]() : ''}<div class="tut-mt"></div><p class="tut-ng" role="alert" hidden></p><div class="tut-btns">${canBack ? `<button type="button" class="mbtn" id="tuBack">${esc(t('tu.back'))}</button>` : ''}${btn}</div>`;
    }
    box.innerHTML = `<div class="tut-top"><em>${esc(t('tu.chap' + st.ch))} · ${esc(t('tu.step', { n, m: tot }))}</em><span class="tut-tr"><button type="button" class="tut-x" id="tuMin">${esc(t(box.classList.contains('min') ? 'tu.max' : 'tu.min'))}</button><button type="button" class="tut-x" id="tuQuit">${esc(t('tu.quit'))}</button></span></div>` +
      `<span class="tut-prog" aria-hidden="true"><i style="width:${Math.round(n / tot * 100)}%"></i></span><div class="tp-body">${inner}</div>`;
    const nb = $('#tuNext'); if (nb) { nb.onclick = next; setTimeout(() => { try { nb.focus({ preventScroll: true }); } catch (e) {} }, 30); }
    const bb = $('#tuBack'); if (bb) bb.onclick = back;
    $('#tuQuit').onclick = () => A.confirmBox(t('tu.quitQ'), () => { finish(); A.toast(t('tu.quitDone')); });
    $('#tuMin').onclick = () => { const was = box.classList.contains('min'); box.classList.toggle('min', !was); box.classList.remove('auto'); opened = was ? idx : -1; lastKey = ''; show(); };
  }
  const mt = box.querySelector('.tut-mt'); if (mt) { const h = meterHtml(st); if (mt.innerHTML !== h) mt.innerHTML = h; }
  layer.classList.add('show');
  layer.classList.toggle('act', act && st.k !== 'info');
  place(); requestAnimationFrame(place); [380, 800, 1400].forEach(ms => setTimeout(place, ms));   // (bubbles pop in, the count runs: measure again)
}
// the spotlight: a dark veil with a hole and a ring for each entry of at
function paint(list, pad) {
  const W = innerWidth, H = innerHeight;
  let d = `M0 0H${W}V${H}H0Z`, h = '';
  list.forEach(r => {
    const l = r.l - pad, tp = r.t - pad, w = r.r - r.l + pad * 2, ht = r.b - r.t + pad * 2, rr = Math.min(14, w / 2, ht / 2);
    d += `M${l + rr} ${tp}H${l + w - rr}A${rr} ${rr} 0 0 1 ${l + w} ${tp + rr}V${tp + ht - rr}A${rr} ${rr} 0 0 1 ${l + w - rr} ${tp + ht}H${l + rr}A${rr} ${rr} 0 0 1 ${l} ${tp + ht - rr}V${tp + rr}A${rr} ${rr} 0 0 1 ${l + rr} ${tp}Z`;
    h += `<div class="tut-ring" style="left:${l}px;top:${tp}px;width:${w}px;height:${ht}px;border-radius:${rr}px"></div>`;
  });
  mask.setAttribute('viewBox', `0 0 ${W} ${H}`); mask.setAttribute('width', W); mask.setAttribute('height', H);
  mask.querySelector('path').setAttribute('d', d);
  rings.innerHTML = h;
}
function place() {
  if (!layer || !layer.classList.contains('show')) return;
  const st = cur(); if (!st) return;
  const act = active(), W = innerWidth, H = innerHeight, m = 10, pad = phone() ? 5 : 8;
  const list = act && st.at ? st.at.map(rectOf).filter(Boolean) : [];
  const keep = act ? seeRects(st) : [];
  paint(list, pad);
  layer.classList.toggle('center', !list.length && act); layer.classList.toggle('watch', !act);
  // while the computer plays: no veil, a small box at the bottom (the table stays in full view)
  if (!act) {
    box.style.width = phone() ? (W - 2 * m) + 'px' : ''; const bw = box.offsetWidth, bh = box.offsetHeight;
    box.style.left = (phone() ? m : Math.max(m, (W - bw) / 2)) + 'px'; box.style.top = (phone() ? m : H - bh - m) + 'px'; return;
  }
  // phones: the bubble docks at the top or the bottom, on the side away from what it points at
  // phones: full width; the top, the bottom, or a free band between the things to keep in view
  if (phone()) {
    box.style.width = (W - 2 * m) + 'px'; box.style.left = m + 'px';
    box.classList.remove('tight');
    let bh = box.offsetHeight;
    if (!list.length && !keep.length) { box.style.top = Math.max(m, (H - bh) / 2) + 'px'; return; }
    const obs = list.map(r => ({ r, w: 3 })).concat(keep.map(r => ({ r, w: 1 })));
    const cover = y => obs.reduce((a, o) => a + o.w * Math.max(0, Math.min(y + bh, o.r.b + pad) - Math.max(y, o.r.t - pad)), 0);
    const pick = () => {
      const ys = [m, H - bh - m].concat(...obs.map(o => [o.r.b + pad + 4, o.r.t - pad - 4 - bh])).filter(y => y >= m - .5 && y + bh <= H - m + .5);
      const free = ys.filter(y => cover(y) === 0);
      return free.length ? free[0] : null;
    };
    let y = pick();
    // no free band: the compact bubble (smaller text and gaps); still none (short phones): folded to the title, the meter and
    // what to do — "Open" shows the text again (the player's choice, kept for the step)
    if (y == null) { box.classList.add('tight'); bh = box.offsetHeight; y = pick(); }
    if (y == null && opened !== idx && !box.classList.contains('min')) {
      box.classList.add('min', 'auto'); const mb = $('#tuMin'); if (mb) mb.textContent = t('tu.max'); bh = box.offsetHeight; y = pick();
    }
    if (y == null) y = [m, H - bh - m].concat(...obs.map(o => [o.r.b + pad + 4, o.r.t - pad - 4 - bh])).map(v => Math.max(m, Math.min(H - bh - m, v))).sort((a, b) => cover(a) - cover(b))[0];
    box.style.top = y + 'px';
    return;
  }
  box.style.width = ''; const bw = box.offsetWidth, bh = box.offsetHeight;
  if (!list.length && !keep.length) { box.style.left = Math.max(m, (W - bw) / 2) + 'px'; box.style.top = Math.max(m, (H - bh) / 2) + 'px'; return; }
  const ul = list.length ? list : keep;
  const u = ul.reduce((a, r) => ({ l: Math.min(a.l, r.l), t: Math.min(a.t, r.t), r: Math.max(a.r, r.r), b: Math.max(a.b, r.b) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
  const cx = (u.l + u.r) / 2, cy = (u.t + u.b) / 2, g = 22;
  const clampX = x => Math.max(m, Math.min(W - bw - m, x)), clampY = y => Math.max(m, Math.min(H - bh - m, y));
  const cand = [[clampX(cx - bw / 2), u.b + g], [clampX(cx - bw / 2), u.t - g - bh], [u.r + g, clampY(cy - bh / 2)], [u.l - g - bw, clampY(cy - bh / 2)],
    [m, m], [W - bw - m, m], [m, H - bh - m], [W - bw - m, H - bh - m], [clampX(W * .5 - bw / 2), clampY(H * .42 - bh / 2)]];
  const ov1 = ([x, y], r) => Math.max(0, Math.min(x + bw, r.r + pad) - Math.max(x, r.l - pad)) * Math.max(0, Math.min(y + bh, r.b + pad) - Math.max(y, r.t - pad));
  const over = p => list.reduce((a, r) => a + 3 * ov1(p, r), 0) + keep.reduce((a, r) => a + ov1(p, r), 0);
  const inside = ([x, y]) => x >= m - .5 && y >= m - .5 && x + bw <= W - m + .5 && y + bh <= H - m + .5;
  const best = cand.find(p => inside(p) && over(p) === 0) || cand.map(([x, y]) => [clampX(x), clampY(y)]).sort((a, b) => over(a) - over(b))[0];
  box.style.left = best[0] + 'px'; box.style.top = best[1] + 'px';
}
// what the text talks about (see), clipped to the screen; off-screen parts do not count
function seeRects(st) {
  const W = innerWidth, H = innerHeight;
  return (st.see || []).map(rectOf).filter(Boolean).map(r => ({ l: Math.max(0, r.l), t: Math.max(0, r.t), r: Math.min(W, r.r), b: Math.min(H, r.b) })).filter(r => r.r - r.l > 4 && r.b - r.t > 4);
}
function hide() { if (layer) { layer.classList.remove('show'); box.innerHTML = ''; rings.innerHTML = ''; lastKey = ''; } }
function shake() { if (!box) return; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); A.sfx('bad'); }

/* ---------- the offer: every visit until "don't show again" is ticked or the tutorial is finished (as in poker / guandan) ---------- */
const HIDE = 'aicoding-liarsdice-tut-hide', DONE = 'aicoding-liarsdice-tut-done';
function offer(force) {
  let hidden = false; try { hidden = !!(localStorage.getItem(HIDE) || localStorage.getItem(DONE)); } catch (e) {}
  if ((!force && hidden) || on || $('#tutOffer')) return;
  const ov = document.createElement('div'); ov.className = 'overlay show'; ov.id = 'tutOffer';
  ov.innerHTML = `<div class="modal tut-offer"><div class="to-art">${Dice.art('perudo')}</div><h2>${esc(t('tu.offer.h'))}</h2><p>${esc(t('tu.offer.p'))}</p>` +
    `<ul class="to-list">${['1', '2', '3'].map(k => `<li>${esc(t('tu.offer.' + k))}</li>`).join('')}</ul>` +
    `<label class="to-chk"><input type="checkbox" id="toNo"> ${esc(t('tu.offer.no'))}</label>` +
    `<div class="modal-actions half"><button class="mbtn" id="toLater">${esc(t('tu.offer.later'))}</button><button class="mbtn go" id="toGo">${esc(t('tu.offer.go'))}</button></div></div>`;
  document.body.appendChild(ov);
  const close = () => { if ($('#toNo').checked) try { localStorage.setItem(HIDE, '1'); } catch (e) {} ov.remove(); if (A.G && A.U.phase === 'bid') A.loop(); };
  $('#toLater').onclick = close; $('#toGo').onclick = () => { ov.remove(); start(); };
}
window.LdTut = { start, on: () => on, step: () => STEPS[idx], seeRects: () => (cur() ? seeRects(cur()) : []), hold, allow, after, bot, ev, hint, finish, stop, offer, STEPS, SCRIPT, HANDS, TASK: { f: TASK_F, q: TASK_Q } };
// first visit: the offer box once the page has settled (not over another dialog)
setTimeout(() => { if (!document.querySelector('.overlay.show')) offer(false); }, 900);
})();
