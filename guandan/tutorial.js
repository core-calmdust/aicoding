/* 掼蛋 — the tutorial (guandan/tutorial.js)
   Rebuilt 2026-11-24 after "the tutorial is far too unfriendly": the same spotlight + bubble as the blackjack / poker / baccarat
   tutorials, and three chapters:
     1. what the game is — the goal, teams, the order of play, card ranks, levels and level cards, the wild card, every shape,
        how a trick goes round, bombs (read only, each step pointing at its part of the screen, with small cards to look at);
     2. one short scripted hand on the real table (level 7, nine cards each) — after EVERY computer move the game stops and the
        bubble says what happened and why it was allowed (spotlight on that player's cards); your moves are the only ones accepted;
     3. the result — places, how many levels the team climbs, the next hand's level, tribute, how a match is won, coach / hint / menus.
   Texts: tu.<id>.t (title) and tu.<id>.b (HTML: <b> / <br> only) in i18n.js / i18n-src. Your saved match comes back afterwards.
   First visit: an offer box (once). */
(function () {
'use strict';
const A = window.GdApp, GD = window.GD, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
const C = s => window.GdRules.C(s), CS = s => s.trim().split(/\s+/).map(C);
const L = 7;
// seats: 0 you (bottom), 1 Jun (right), 2 Mei (top, partner), 3 Lan (left); play goes 0 → 1 → 2 → 3
const HANDS = ["4S 4D 9C 10D JS QC 7H 7C 2S'", '9S 9D 8S 8D 8C 8H 2S 3H', "QS QD 5C KS KD KC KH KS' 3S", 'AD 2C 2D 2H 3D'];
// the computer players' moves, in order (null = pass)
const SCRIPT = [[1, '9S 9D'], [2, 'QS QD'], [3, null], [1, null], [2, '5C'], [3, 'AD'], [1, null], [2, null], [3, null], [1, '8S 8D 8C 8H'], [2, "KS KD KC KH KS'"], [3, null], [1, null], [2, '3S'], [3, null], [1, null]];
const myTurn = S => S.phase === 'play' && S.turn === 0;
const bots = n => () => sp === n;   // after the n-th scripted computer move
const ended = S => S.phase === 'end';
const always = () => true;
const CARD = s => CS(s).map(id => `#gdHand .cd[data-c="${id}"]`).join(', ');
const TR = s => `.gtr.s${s}:not(.old)`, SEAT = s => s === 0 ? '.me-plate' : `.gseat.s${s}`;
/* the steps. k: info (read, then Next) · play (select these cards and play) · pass. when: the moment the step waits for.
   at: what the spotlight shows — one ring per entry (an entry may list several selectors: one ring around them all).
   pics: small cards in the bubble (see PICS). center: no spotlight, the bubble in the middle. */
const STEPS = [
  // 1. the game
  { id: 'what', k: 'info', when: always, center: true, pics: 'deal' },
  { id: 'goal', k: 'info', when: always, center: true },
  { id: 'team', k: 'info', when: always, at: [SEAT(0), SEAT(2)] },
  { id: 'opp', k: 'info', when: always, at: [SEAT(1), SEAT(3)] },
  { id: 'order', k: 'info', when: always, at: [SEAT(0), SEAT(1), SEAT(2), SEAT(3)] },
  { id: 'hand', k: 'info', when: always, at: ['#gdHand'] },
  { id: 'rank', k: 'info', when: always, center: true, pics: 'rank' },
  { id: 'level', k: 'info', when: always, at: ['.glevel', [CARD('7C'), CARD('7H')]] },
  { id: 'wild', k: 'info', when: always, at: [CARD('7H')] },
  { id: 'shapes', k: 'info', when: always, center: true, pics: 'shapes1' },
  { id: 'runs', k: 'info', when: always, center: true, pics: 'shapes2' },
  { id: 'flow', k: 'info', when: always, center: true, pics: 'flow' },
  { id: 'bomb', k: 'info', when: always, center: true, pics: 'bombs' },
  { id: 'go', k: 'info', when: always, center: true },
  // 2. the hand
  { id: 'p1', k: 'play', ids: '4S 4D', when: myTurn, at: [CARD('4S 4D'), '#abPlay'] },
  { id: 'n1', k: 'info', when: bots(1), at: [TR(1), SEAT(1)] },
  { id: 'n2', k: 'info', when: bots(2), at: [TR(2), SEAT(2)] },
  { id: 'n3', k: 'info', when: bots(3), at: [[TR(3), SEAT(3)]] },
  { id: 'p2', k: 'pass', when: myTurn, at: [TR(2), '#abPass'] },
  { id: 'n4', k: 'info', when: bots(4), at: [SEAT(2)] },
  { id: 'n5', k: 'info', when: bots(5), at: [TR(2)] },
  { id: 'n6', k: 'info', when: bots(6), at: [TR(3)] },
  { id: 'p3', k: 'play', ids: '7C', when: myTurn, at: [CARD('7C'), '.glevel', '#abPlay'] },
  { id: 'n7', k: 'info', when: bots(9), at: [TR(0)] },
  { id: 'p4', k: 'play', ids: '9C 10D JS QC 7H', when: myTurn, at: [CARD('9C 10D JS QC 7H'), '#abPlay'] },
  { id: 'n8', k: 'info', when: bots(10), at: [TR(1)] },
  { id: 'n9', k: 'info', when: bots(11), at: [TR(2)] },
  { id: 'p5', k: 'pass', when: myTurn, at: [TR(2), '#abPass'] },
  { id: 'n10', k: 'info', when: bots(13), at: [SEAT(2)] },
  { id: 'n11', k: 'info', when: bots(14), at: [[TR(2), SEAT(2)]] },
  { id: 'p6', k: 'pass', when: myTurn, at: [TR(2), CARD("2S'"), '#abPass'] },
  { id: 'n12', k: 'info', when: bots(16), at: [SEAT(0), SEAT(2)] },
  { id: 'p7', k: 'play', ids: "2S'", when: myTurn, at: [CARD("2S'"), '#abPlay'] },
  // 3. after the hand
  { id: 'e1', k: 'info', when: ended, at: ['.hres ol'] },
  { id: 'e2', k: 'info', when: ended, at: ['.hres .res-lv'] },
  { id: 'e3', k: 'info', when: ended, center: true, pics: 'trib' },
  { id: 'e4', k: 'info', when: ended, center: true },
  { id: 'e5', k: 'info', when: ended, at: ['#btnHint', '.coach-card'], tab: 'coach' },
  { id: 'e6', k: 'info', when: ended, at: ['#btnRules', '#btnLesson'] },
  { id: 'end', k: 'info', when: ended, center: true, last: true },
];
let on = false, idx = 0, sp = 0, layer = null, box = null, mask = null, rings = null, tab0 = null;
function setup() {
  const M = GD.newMatch({ start: L }); M.lvl = 3; M.tut = true;
  const S = { L, lt: -1, hands: HANDS.map(CS), out: [], turn: 0, last: null, passN: 0, trick: 0, log: [], played: [], phase: 'play', trib: null, no: 1, first: 0, lead0: 0 };
  return { M, S };
}
function start() {
  on = true; idx = 0; sp = 0;
  try { localStorage.setItem('aicoding-guandan-tut', '1'); } catch (e) {}
  ['#tutOffer'].forEach(s => { const o = $(s); if (o) o.remove(); });
  ['#rulesOverlay', '#lessonOverlay', '#newOverlay'].forEach(s => { const o = $(s); if (o) o.classList.remove('show'); });
  if (tab0 === null) tab0 = (document.querySelector('.side') || {}).dataset ? (document.querySelector('.side').dataset.pt || '') : '';
  A.startTutorial(setup);
  show(); A.sched(A.loop, 400);
}
function cur() { return STEPS[idx]; }
const active = () => { const st = cur(); return !!(st && A.S && st.when(A.S)); };
// the computer waits while a step is being read
function hold() { const st = cur(); if (!st) return false; return st.k === 'info' && active(); }
function allow(a, ids) {
  const st = cur();
  if (!st || !active() || st.k === 'info') { A.toast(t(st && st.k === 'info' && active() ? 'tu.ngNext' : 'tu.watch')); shake(); return false; }
  if (a === 'hint') return st.k === 'play';
  if (st.k === 'pass') { if (a === 'pass') return true; A.toast(t('tu.ngPass')); shake(); return false; }
  if (a !== 'play') { A.toast(t('tu.doPlay')); shake(); return false; }
  const want = CS(st.ids).sort((x, y) => x - y).join(), got = ids.slice().sort((x, y) => x - y).join();
  if (want === got) return true;
  A.toast(t('tu.wrongCards')); shake(); return false;
}
function after(a) {
  const st = cur(); if (!st || st.k === 'info') return;
  if ((st.k === 'pass' && a === 'pass') || (st.k === 'play' && a === 'play')) { idx++; show(); }
}
// the computer's scripted move (falls back to a pass / the first legal lead if the script and the table disagree)
function bot(S, seat) {
  const m = SCRIPT[sp];
  if (m && m[0] === seat) { sp++; if (!m[1]) return null; const c = GD.identify(CS(m[1]), S.L).sort((x, y) => GD.tier(y) - GD.tier(x))[0]; return c; }
  return S.last ? null : GD.gen(S.hands[seat], S.L)[0];
}
function next() {
  const st = cur(); if (!st) return;
  if (st.last) { finish(); return; }
  A.sfx('flip'); idx++; show(); A.loop();
}
function finish() {
  const was = on; on = false; hide();
  if (was) { A.endTutorial(); if (tab0 && A.showTab) A.showTab(tab0); tab0 = null; }
}
function ev(k) { if (!on) return; if (k === 'render') { mark(); show(); } }
// the cards a step wants you to pick glow
function mark() {
  const st = cur(); document.querySelectorAll('#gdHand .cd.tut-want').forEach(e => e.classList.remove('tut-want'));
  if (!st || st.k !== 'play' || !active()) return;
  CS(st.ids).forEach(id => { const e = document.querySelector(`#gdHand .cd[data-c="${id}"]`); if (e) e.classList.add('tut-want'); });
}

/* ---------- the small cards in the bubble ---------- */
const row = (s, lab, cls) => `<div class="tp-row${cls ? ' ' + cls : ''}"><span class="tp-c">${CS(s).map(id => Cards.mini(id, L)).join('')}</span>${lab ? `<small>${lab}</small>` : ''}</div>`;
const PICS = {
  deal: () => `<div class="tp-pics one">${row("2S 3H 5C 8D 10S JH QC KD AS 7H 7C SJ BJ", '')}</div>`,
  rank: () => `<div class="tp-pics"><div class="tp-scale"><span>${esc(t('tu.weak'))}</span>${CS('2S 3S 4S 5S 6S 7S 8S 9S 10S JS QS KS AS').map(id => Cards.mini(id, 0)).join('')}<span>${esc(t('tu.strong'))}</span></div>` +
    `<div class="tp-scale up">${Cards.mini(C('AS'), 0)}<i>‹</i><span class="tp-k">${Cards.mini(C('7S'), L)}<small>${esc(t('tu.lvCard'))}</small></span><i>‹</i><span class="tp-k">${Cards.mini(C('SJ'), L)}<small>${esc(t('tu.sj'))}</small></span><i>‹</i><span class="tp-k">${Cards.mini(C('BJ'), L)}<small>${esc(t('tu.bj'))}</small></span></div></div>`,
  shapes1: () => `<div class="tp-pics grid">${row('9C', esc(t('ct.single')))}${row('9C 9D', esc(t('ct.pair')))}${row('9C 9D 9H', esc(t('ct.triple')))}${row('9C 9D 9H 4S 4C', esc(t('ct.full')))}</div>`,
  shapes2: () => `<div class="tp-pics grid">${row('5S 6D 7C 8H 9S', esc(t('ct.straight')))}${row('5S 5D 6C 6H 7S 7D', esc(t('ct.tube')))}${row('8S 8D 8C 9H 9S 9D', esc(t('ct.plate')))}${row('AS 2D 3C 4H 5S', esc(t('tu.lowA')))}</div>`,
  flow: () => `<div class="tp-pics flow">${row('4S 4D', esc(t('tu.f1')))}<b>›</b>${row('9S 9D', esc(t('tu.f2')))}<b>›</b>${row('QS QD', esc(t('tu.f3')))}<b>›</b><div class="tp-row"><span class="tp-pass">${esc(t('pass'))} ×3</span><small>${esc(t('tu.f4'))}</small></div></div>`,
  bombs: () => `<div class="tp-pics grid">${row('8S 8D 8C 8H', esc(t('ct.bombN', { n: 4 })))}${row("KS KD KC KH KS'", esc(t('ct.bombN', { n: 5 })))}${row('9H 10H JH QH KH', esc(t('ct.sflush')))}${row("SJ SJ' BJ BJ'", esc(t('ct.kings')))}</div>`,
  trib: () => `<div class="tp-pics flow">${row('BJ', esc(t('tu.t1')))}<b>⇄</b>${row('4C', esc(t('tu.t2')))}</div>`,
};

/* ---------- spotlight + bubble ---------- */
function ensure() {
  if (layer) return;
  layer = document.createElement('div'); layer.id = 'tutLayer'; layer.className = 'gd-tl';
  layer.innerHTML = '<svg class="tut-mask" aria-hidden="true"><path fill-rule="evenodd"/></svg><div class="tut-rings"></div><div class="tut-box gd-box" role="dialog" aria-live="polite"></div>';
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
let lastKey = '';
function show() {
  if (!on) return;
  ensure();
  const st = cur(); if (!st) { hide(); return; }
  const act = active(), n = idx + 1, tot = STEPS.length;
  // phones: the side boxes are tabs — open the one the step talks about
  if (act && st.tab && phone() && A.showTab) A.showTab(st.tab);
  const key = idx + ':' + act + ':' + A.LANG;
  if (key !== lastKey) {
    lastKey = key;
    const chap = idx < 14 ? 1 : st.when === ended ? 3 : 2;
    let inner;
    if (!act) inner = `<p class="tp-wait">${esc(t('tu.watch'))}</p>`;
    else {
      const btn = st.k === 'info' ? `<button type="button" class="mbtn go" id="tuNext">${esc(st.last ? t('tu.done') : t('tu.next'))}</button>`
        : `<span class="tut-do">👉 ${esc(t(st.k === 'pass' ? 'tu.doPass' : 'tu.doPlay'))}</span>`;
      inner = `<b class="tp-h">${esc(t('tu.' + st.id + '.t'))}</b><p>${t('tu.' + st.id + '.b')}</p>${st.pics && PICS[st.pics] ? PICS[st.pics]() : ''}<div class="tut-btns">${idx > 0 && idx < 14 ? `<button type="button" class="mbtn" id="tuBack">${esc(t('tu.back'))}</button>` : ''}${btn}</div>`;
    }
    box.innerHTML = `<div class="tut-top"><em>${esc(t('tu.chap' + chap))} · ${esc(t('tu.step', { n, m: tot }))}</em><span class="tut-tr"><button type="button" class="tut-x" id="tuMin">${esc(t(box.classList.contains('min') ? 'tu.max' : 'tu.min'))}</button><button type="button" class="tut-x" id="tuQuit">${esc(t('tu.quit'))}</button></span></div><div class="tp-body">${inner}</div>`;
    const nb = $('#tuNext'); if (nb) { nb.onclick = next; setTimeout(() => { try { nb.focus({ preventScroll: true }); } catch (e) {} }, 30); }
    const bb = $('#tuBack'); if (bb) bb.onclick = () => { idx--; show(); };
    $('#tuQuit').onclick = () => A.confirmBox(t('tu.quitQ'), () => { finish(); A.toast(t('tu.quitDone')); });
    $('#tuMin').onclick = () => { box.classList.toggle('min'); lastKey = ''; show(); };
  }
  layer.classList.add('show');
  layer.classList.toggle('act', act && st.k !== 'info');
  place(); requestAnimationFrame(place); [380, 800, 1400].forEach(ms => setTimeout(place, ms));   // (cards fly in, the result panel fades in: measure again)
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
  paint(list, pad);
  layer.classList.toggle('center', !list.length && act); layer.classList.toggle('watch', !act);
  // while the computer plays: no veil, a small box at the bottom (the table stays in full view)
  if (!act) {
    box.style.width = phone() ? (W - 2 * m) + 'px' : ''; const bw = box.offsetWidth, bh = box.offsetHeight;
    box.style.left = (phone() ? m : Math.max(m, (W - bw) / 2)) + 'px'; box.style.top = (H - bh - m) + 'px'; return;
  }
  // phones: the bubble docks at the top or the bottom, on the side away from what it points at
  if (phone()) {
    box.style.width = (W - 2 * m) + 'px'; box.style.left = m + 'px';
    const bh = box.offsetHeight;
    if (!list.length) { box.style.top = Math.max(m, (H - bh) / 2) + 'px'; return; }
    const u = list.reduce((a, r) => ({ t: Math.min(a.t, r.t), b: Math.max(a.b, r.b) }), { t: 1e9, b: -1e9 });
    const top = m, bot = H - bh - m;
    const cover = y => list.reduce((a, r) => a + Math.max(0, Math.min(y + bh, r.b + pad) - Math.max(y, r.t - pad)), 0);
    box.style.top = (cover(top) < cover(bot) || (cover(top) === cover(bot) && u.t + u.b > H) ? top : bot) + 'px';
    return;
  }
  box.style.width = ''; const bw = box.offsetWidth, bh = box.offsetHeight;
  if (!list.length) { box.style.left = Math.max(m, (W - bw) / 2) + 'px'; box.style.top = Math.max(m, (H - bh) / 2) + 'px'; return; }
  const u = list.reduce((a, r) => ({ l: Math.min(a.l, r.l), t: Math.min(a.t, r.t), r: Math.max(a.r, r.r), b: Math.max(a.b, r.b) }), { l: 1e9, t: 1e9, r: -1e9, b: -1e9 });
  const cx = (u.l + u.r) / 2, cy = (u.t + u.b) / 2, g = 22;
  const clampX = x => Math.max(m, Math.min(W - bw - m, x)), clampY = y => Math.max(m, Math.min(H - bh - m, y));
  const cand = [[clampX(cx - bw / 2), u.b + g], [clampX(cx - bw / 2), u.t - g - bh], [u.r + g, clampY(cy - bh / 2)], [u.l - g - bw, clampY(cy - bh / 2)],
    [clampX(W * .36 - bw / 2), clampY(H * .42 - bh / 2)], [m, m], [W - bw - m, m], [m, H - bh - m], [W - bw - m, H - bh - m]];
  const over = ([x, y]) => list.reduce((a, r) => a + Math.max(0, Math.min(x + bw, r.r + pad) - Math.max(x, r.l - pad)) * Math.max(0, Math.min(y + bh, r.b + pad) - Math.max(y, r.t - pad)), 0);
  const inside = ([x, y]) => x >= m - .5 && y >= m - .5 && x + bw <= W - m + .5 && y + bh <= H - m + .5;
  const best = cand.find(p => inside(p) && over(p) === 0) || cand.map(([x, y]) => [clampX(x), clampY(y)]).sort((a, b) => over(a) - over(b))[0];
  box.style.left = best[0] + 'px'; box.style.top = best[1] + 'px';
}
function hide() { if (layer) { layer.classList.remove('show'); box.innerHTML = ''; rings.innerHTML = ''; lastKey = ''; } document.querySelectorAll('#gdHand .cd.tut-want').forEach(e => e.classList.remove('tut-want')); }
function shake() { if (!box) return; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); A.sfx('bad'); }

/* the first visit: offer the tutorial once */
function offer() {
  let ok = false; try { ok = !localStorage.getItem('aicoding-guandan-tut') && !localStorage.getItem('aicoding-guandan-rules-seen'); } catch (e) {}
  if (!ok || on) return;
  const ov = document.createElement('div'); ov.className = 'overlay show'; ov.id = 'tutOffer';
  ov.innerHTML = `<div class="modal tut-offer"><div class="to-art">${A.gArt(2)}</div><h2>${esc(t('tu.offer.h'))}</h2><p>${esc(t('tu.offer.p'))}</p>` +
    `<ul class="to-list">${['1', '2', '3', '4'].map(k => `<li>${esc(t('tu.offer.' + k))}</li>`).join('')}</ul>` +
    `<label class="to-chk"><input type="checkbox" id="toNo"> ${esc(t('tu.offer.no'))}</label>` +
    `<div class="modal-actions half"><button class="mbtn" id="toLater">${esc(t('tu.offer.later'))}</button><button class="mbtn go" id="toGo">${esc(t('tu.offer.go'))}</button></div></div>`;
  document.body.appendChild(ov);
  const close = () => { if ($('#toNo').checked) try { localStorage.setItem('aicoding-guandan-tut', '1'); } catch (e) {} ov.remove(); };
  $('#toLater').onclick = close; $('#toGo').onclick = () => { ov.remove(); start(); };
}
window.GdTut = { start, on: () => on, hold, allow, after, bot, ev, finish, offer, STEPS };
setTimeout(offer, 900);
})();
