/* ハーツ — the play-along tutorial (hearts/tutorial.js)
   The same spotlight + bubble as the poker / blackjack / guandan tutorials, in three chapters:
     1. what the game is — seats and order, the hand, tricks, following suit, the point cards, how the game is won
        (read only, each step pointing at its part of the screen or with small cards to look at);
     2. one scripted hand on the real table: the pass (you make a void), the 2♣ lead, following suit and ducking,
        dumping the Q♠ on someone's trick, breaking hearts, ducking a heart lead. After every computer card the game stops
        and the bubble says what happened and why; only the glowing card is accepted, and a right move moves on by itself.
        After five tricks the rest of the hand runs by itself (everyone plays the quick heuristic);
     3. the result, shooting the moon, the variants, then where the coach / study / review / lessons / rules are.
   The deal was checked with the engine (tools: the 20 scripted cards are legal, the fast play-out ends 0 / 2 / 6 / 18).
   Texts: tu.<id>.t (title) and tu.<id>.b (HTML: <b> / <br> only; {n1} {n2} {n3} = the computer players' names).
   Your saved game comes back afterwards. On every visit an offer box, until "don't show again" or the tutorial is finished. */
(function () {
'use strict';
const A = window.HtApp, HT = window.HT, AI = window.HAI, $ = s => document.querySelector(s);
const esc = s => A.esc(s);
const SU = { C: 0, D: 1, S: 2, H: 3 }, RK = { J: 11, Q: 12, K: 13, A: 14 };
const C = s => HT.card(SU[s.slice(-1)], RK[s.slice(0, -1)] || +s.slice(0, -1)), CS = s => s.trim().split(/\s+/).map(C);
// seats: 0 you (bottom), 1 left, 2 across, 3 right; play goes 0 → 1 → 2 → 3. The hands before the pass (left this time).
const PRE = ['2C 5C 9C 9D KD 3S 7S QS 2H 4H 6H 10H AH', '10C JC 4D 6D 7D AD 5S 6S 8S 10S 5H 8H KH',
  'QC KC AC 2D 3D 5D 8D 10D JS KS AS 7H QH', '3C 4C 6C 7C 8C JD QD 2S 4S 9S 3H 9H JH'];
const PASS = [null, '6S 5S 6D', '3D KS 8D', '3C 2S 3H'];   // the computer players' passes (to their left)
// the computer players' cards for the first five tricks, in order (then everyone plays the quick heuristic)
const SCRIPT = [null, CS('10C JC 4D AD 5H'), CS('AC KC 5D 2D 7H'), CS('4C 7C QD JD 9H')];
let sp = [0, 0, 0, 0];
const T = (k, v) => A.t(k, Object.assign(names(), v || {}));
const names = () => { const N = A.NAMES(); return { n1: N[1], n2: N[2], n3: N[3] }; };
const always = () => true;
const passing = S => S.phase === 'pass' && !S.pass[0];
const logN = n => S => S.phase === 'play' && S.log.length === n;
const myTurn = n => S => S.phase === 'play' && S.turn === 0 && S.log.length === n;
const playing = S => S.phase === 'play';
const ended = S => S.phase === 'end' && !!A.U.res;   // (after the last trick is gathered and the result is shown)
const CARD = s => CS(s).map(id => `#htHand .cd[data-c="${id}"]`).join(', ');
const TR = s => `.htr.s${s}`, TRICK = '.htr', SEAT = s => s === 0 ? '.me-plate .plate' : `.hseat.s${s} .plate`;
/* the steps. k: info (read, then Next) · pass (pick these three, then Pass) · play (play this card) · auto (the rest runs by itself).
   when: the moment the step waits for. at: one ring per entry (an entry may be a list: one ring around them all).
   see: what the text talks about without a ring — the bubble must not cover it either (as in liarsdice/tutorial.js).
   pics: small cards in the bubble (PICS). center: no spotlight, the bubble in the middle. tab: phones — the bottom tab to open
   (and the page scrolled to it). atP: what to ring on phones instead of at. meter: the gauge under the text (who takes this
   trick and its points if you play the selected card). */
const STEPS = [
  // 1. the game
  { id: 'what', k: 'info', when: always, center: true, pics: 'deal', ch: 1 },
  { id: 'seats', k: 'info', when: always, at: [SEAT(0), SEAT(1), SEAT(2), SEAT(3)], ch: 1 },
  { id: 'hand', k: 'info', when: always, at: ['#htHand'], ch: 1 },
  { id: 'trick', k: 'info', when: always, center: true, pics: 'trick', ch: 1 },
  { id: 'follow', k: 'info', when: always, center: true, pics: 'follow', ch: 1 },
  { id: 'points', k: 'info', when: always, center: true, pics: 'points', ch: 1 },
  { id: 'goal', k: 'info', when: always, at: ['.sc-card'], tab: 'score', ch: 1 },
  { id: 'go', k: 'info', when: always, center: true, ch: 1 },
  // 2. the hand
  { id: 'pass', k: 'pass', ids: 'KD 9D AH', when: passing, at: [CARD('KD 9D AH'), '#abPass'], see: ['#htHand', SEAT(1)], ch: 2 },
  { id: 'got', k: 'info', when: logN(0), at: [CARD('3C 2S 3H')], see: [SEAT(3)], ch: 2 },
  { id: 'c2', k: 'play', ids: '2C', when: myTurn(0), at: [CARD('2C'), '#abPlay'], meter: 1, ch: 2 },
  { id: 'n1', k: 'info', when: logN(2), at: [[TR(1), SEAT(1)]], see: [TR(0)], ch: 2 },
  { id: 'n2', k: 'info', when: logN(4), at: [TRICK, SEAT(2)], ch: 2 },
  { id: 'p2', k: 'play', ids: '9C', when: myTurn(6), at: [TRICK, CARD('9C')], see: ['#abPlay', SEAT(2), SEAT(3)], meter: 1, ch: 2 },
  { id: 'n3', k: 'info', when: logN(8), at: [TRICK], see: [SEAT(1), SEAT(2)], ch: 2 },
  { id: 'p3', k: 'play', ids: 'QS', when: myTurn(10), at: [TRICK, CARD('QS')], see: ['#abPlay', SEAT(2), SEAT(3)], meter: 1, ch: 2 },
  { id: 'n4', k: 'info', when: logN(12), at: [TRICK, [SEAT(3), '.hseat.s3 .tks']], see: [SEAT(1)], ch: 2 },
  { id: 'p4', k: 'play', ids: '10H', when: myTurn(13), at: [TRICK, CARD('10H')], see: ['#abPlay', SEAT(3)], meter: 1, ch: 2 },
  { id: 'n5', k: 'info', when: logN(16), at: [TRICK, SEAT(1)], see: ['.hseat.s1 .tks'], ch: 2 },
  { id: 'p5', k: 'play', ids: '6H', when: myTurn(19), at: [TRICK, CARD('6H')], see: ['#abPlay', SEAT(1), SEAT(2), SEAT(3)], meter: 1, ch: 2 },
  { id: 'n6', k: 'info', when: logN(20), at: [TRICK, SEAT(3)], see: [SEAT(0)], ch: 2 },
  { id: 'fast', k: 'auto', when: playing, ch: 2 },
  // 3. after the hand
  { id: 'e1', k: 'info', when: ended, at: ['.hres'], see: [SEAT(3)], ch: 3 },
  { id: 'moon', k: 'info', when: ended, center: true, pics: 'moon', ch: 3 },
  { id: 'vars', k: 'info', when: ended, center: true, pics: 'vars', ch: 3 },
  { id: 'coach', k: 'info', when: ended, at: ['.coach-card', '#btnHint'], atP: ['.coach-card'], tab: 'coach', ch: 3 },
  { id: 'study', k: 'info', when: ended, at: ['#btnStudy', '#btnReview', '.cnt-card'], atP: ['.cnt-card'], tab: 'cnt', ch: 3 },
  { id: 'learn', k: 'info', when: ended, at: ['#btnLesson', '#btnRules'], ch: 3 },
  { id: 'end', k: 'info', when: ended, center: true, last: true, ch: 3 },
];
const FIRST2 = STEPS.findIndex(s => s.ch === 2);
let on = false, idx = 0, layer = null, box = null, mask = null, rings = null, tab0 = null;
function setup() {
  const G = HT.newGame({ v: 'std' }); G.lvl = 1; G.tut = true; G.hand = 1; G.id = Date.now();
  const S = HT.newHand(G.R, PRE.map(h => HT.sortDisp(CS(h))), 1, 1);
  for (const s of [1, 2, 3]) S.pass[s] = CS(PASS[s]);
  return { G, S };
}
function start() {
  on = true; idx = 0; sp = [0, 0, 0, 0];
  const of = $('#tutOffer'); if (of) of.remove();
  document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
  if (tab0 === null) tab0 = A.set.mTab || '';
  A.startTutorial(setup);
  show(); A.sched(A.loop, 400);
}
const cur = () => STEPS[idx];
const active = () => { const st = cur(); return !!(st && A.S && st.when(A.S)); };
// the game waits while a step is being read
function hold() { const st = cur(); return !!st && st.k === 'info' && active(); }
function auto() { const st = cur(); return !!st && st.k === 'auto' && active(); }
function want() { const st = cur(); return st && (st.k === 'play' || st.k === 'pass') && active() ? CS(st.ids) : null; }
// a wrong move: the reason in the bubble (a toast at the bottom would cover the buttons), and the bubble shakes
function say(msg) {
  const e = box && box.querySelector('.tut-ng');
  if (e && layer.classList.contains('show')) { e.textContent = msg; e.hidden = false; place(); } else A.toast(msg);
  shake(); return false;
}
const ng = k => say(T(k));
function allow(a, ids) {
  const st = cur();
  if (!st || !active() || st.k === 'info' || st.k === 'auto') return ng(st && st.k === 'info' && active() ? 'tu.ngNext' : 'tu.watch');
  const w = CS(st.ids);
  if (a === 'select') return st.k === 'play' ? true : ng('tu.wrongPass');
  if (st.k === 'pass') {
    if (a === 'pick') return w.includes(ids[0]) ? true : ng('tu.wrongPass');
    if (a === 'pass') return ids.length === 3 && ids.every(c => w.includes(c)) ? true : ng('tu.wrongPass');
    return false;
  }
  if (a === 'play' && ids.length === 1 && ids[0] === w[0]) return true;
  return ng('tu.wrongCard');
}
// a right move moves the tutorial on by itself
function after(a) {
  const st = cur(); if (!st || !on) return;
  if ((st.k === 'pass' && a === 'pass') || (st.k === 'play' && a === 'play')) { idx++; show(); }
}
function passOf(s) { return CS(PASS[s]); }
// the computer's scripted card (falls back to the quick heuristic if the script and the table disagree)
function bot(S, seat) {
  const c = SCRIPT[seat][sp[seat]];
  if (c != null && HT.legal(S, seat).includes(c)) { sp[seat]++; return c; }
  return AI.fastPick(S, seat);
}
function next() {
  const st = cur(); if (!st) return;
  if (st.last) { try { localStorage.setItem(DONE, '1'); } catch (e) {} finish(); return; }
  A.sfx('flip'); idx++; show();
  if (!A.U.trickShow) A.loop();
}
function finish() {
  const was = on; on = false; hide();
  if (was) { A.endTutorial(); if (tab0 && A.showTab) A.showTab(tab0); tab0 = null; }
}
// a new game started from the menu while the tutorial runs: just stop (app.js puts your saved game aside itself)
function drop() { on = false; hide(); tab0 = null; }
function quit() { A.confirmBox(T('tu.quitQ'), () => { finish(); A.toast(T('tu.quitDone')); }); }
function ev(k) {
  if (!on || k !== 'render') return;
  const st = cur();
  if (st && st.k === 'auto' && A.S && ended(A.S)) idx++;
  mark(); show();
}
// the cards a step wants you to pick glow
function mark() {
  document.querySelectorAll('#htHand .cd.tut-want').forEach(e => e.classList.remove('tut-want'));
  const w = want(); if (!w) return;
  const S = A.S;
  w.forEach(id => { if (S.phase === 'pass' && A.U.psel.has(id)) return; const e = document.querySelector(`#htHand .cd[data-c="${id}"]`); if (e) e.classList.add('tut-want'); });
}

/* ---------- the gauge: who takes this trick, and its points, if you play the selected card ----------
   The rest of the trick is played the way the tutorial hand really goes on (the computer players by the script). */
function outcome(c) {
  const S = Object.assign(HT.clone(A.S), { log: A.S.log.slice(), tricks: A.S.tricks.slice() }), k = sp.slice();   // (clone shares the log)
  const n0 = S.tricks.length;
  HT.play(S, 0, c);
  while (S.phase === 'play' && S.tricks.length === n0) {
    const p = S.turn, sc = p ? SCRIPT[p][k[p]] : null;
    const x = sc != null && HT.legal(S, p).includes(sc) ? (k[p]++, sc) : AI.fastPick(S, p);
    HT.play(S, p, x);
  }
  const tr = S.tricks[S.tricks.length - 1];
  return { win: tr.win, pts: tr.cards.reduce((a, x) => a + HT.pts(x.c != null ? x.c : x, S.R), 0) };
}
let MK = '', MV = null;
function meterHtml(st) {
  if (!st.meter || !active()) return '';
  const key = idx + ':' + A.S.log.length;
  if (MK !== key) { MK = key; MV = {}; try { HT.legal(A.S, 0).forEach(c => { MV[c] = outcome(c); }); } catch (e) { console.error(e); MV = null; } }
  if (!MV) return '';
  const c = A.U.sel;
  if (c == null || !MV[c]) return `<div class="tut-meter none"><small>${esc(T('tu.mPick'))}</small></div>`;
  const o = MV[c], me = o.win === 0, cls = me && o.pts ? 'lo' : me ? 'mid' : 'hi';
  return `<div class="tut-meter ${cls}"><small>${esc(T(me ? 'tu.mMe' : 'tu.mThem', { c: A.cname(c), n: A.NAMES()[o.win], p: o.pts }))}</small><span class="tm-bar"><i style="width:${Math.max(3, Math.round(o.pts / 13 * 100))}%"></i></span><b>${o.pts}</b></div>`;
}

/* ---------- the small cards in the bubble ---------- */
const mc = (s, cls) => CS(s).map(id => Cards.mini(id, cls)).join('');
const row = (s, lab, cls) => `<div class="tp-row${cls ? ' ' + cls : ''}"><span class="tp-c">${mc(s)}</span>${lab ? `<small>${lab}</small>` : ''}</div>`;
const PICS = {
  deal: () => `<div class="tp-pics one">${row('2C 7C JC 4D 9D KD 3S 8S QS 2H 6H 10H AH', '')}</div>`,
  trick: () => `<div class="tp-pics flow">${row('5C', esc(T('tu.pLead')))}<b>›</b>${row('9C', '')}<b>›</b>${row('KC', esc(T('tu.pWin')), 'win')}<b>›</b>${row('AD', esc(T('tu.pOff')))}</div>`,
  follow: () => `<div class="tp-pics grid">${row('7D', esc(T('tu.pLed')))}<span></span>${row('3D 9D', esc(T('tu.pHave')))}${row('QS 5H', esc(T('tu.pNone')))}</div>`,
  points: () => `<div class="tp-pics grid">${row('2H 9H AH', esc(T('tu.p1')))}${row('QS', esc(T('tu.p13')))}${row('AS KC JD', esc(T('tu.p0')))}<div class="tp-row"><span class="tp-big">26</span><small>${esc(T('tu.p26'))}</small></div></div>`,
  moon: () => `<div class="tp-pics one">${row('2H 3H 4H 5H 6H 7H 8H 9H 10H JH QH KH AH QS', esc(T('tu.pMoon')))}</div>`,
  vars: () => `<div class="tp-pics grid">${row('JD', esc(T('tu.pOmni')))}${row('KS AS', esc(T('tu.pMaria')))}${row('QH AH', esc(T('tu.pSpot')))}</div>`,
};

/* ---------- spotlight + bubble (as in guandan/tutorial.js) ---------- */
function ensure() {
  if (layer) return;
  layer = document.createElement('div'); layer.id = 'tutLayer'; layer.className = 'gd-tl ht-tl';
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
    const b = el.getBoundingClientRect(); if ((!b.width && !b.height) || b.bottom < 0 || b.top > innerHeight) return;   // (scrolled out of view on a phone)
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
  if (act && st.tab && phone() && A.showTab) A.showTab(st.tab);
  const key = idx + ':' + act + ':' + A.LANG;
  if (key !== lastKey) {
    if (lastKey.split(':')[0] !== String(idx)) { if (box.classList.contains('auto')) box.classList.remove('min', 'auto'); opened = -1; }
    lastKey = key;
    if (act) reveal(st);
    let inner;
    if (!act || st.k === 'auto') inner = `<p class="tp-wait">${esc(T(st.k === 'auto' ? 'tu.fast' : 'tu.watch'))}</p>`;
    else {
      const btn = st.k === 'info' ? `<button type="button" class="mbtn go" id="tuNext">${esc(T(st.last ? 'tu.done' : 'tu.next'))}</button>`
        : `<span class="tut-do">👉 ${esc(T(st.k === 'pass' ? 'tu.doPass' : 'tu.doPlay'))}</span>`;
      inner = `<b class="tp-h">${esc(T('tu.' + st.id + '.t'))}</b><p>${T('tu.' + st.id + '.b')}</p>${st.pics && PICS[st.pics] ? PICS[st.pics]() : ''}<div class="tut-mt"></div><p class="tut-ng" role="alert" hidden></p><div class="tut-btns">${idx > 0 && idx < FIRST2 ? `<button type="button" class="mbtn" id="tuBack">${esc(T('tu.back'))}</button>` : ''}${btn}</div>`;
    }
    const pct = Math.round(idx / (tot - 1) * 100);
    box.innerHTML = `<div class="tut-top"><em>${esc(T('tu.chap' + st.ch))} · ${esc(T('tu.step', { n, m: tot }))}</em><span class="tut-tr"><button type="button" class="tut-x" id="tuMin">${esc(T(box.classList.contains('min') ? 'tu.max' : 'tu.min'))}</button><button type="button" class="tut-x" id="tuQuit">${esc(T('tu.quit'))}</button></span></div>` +
      `<div class="tut-prog" aria-hidden="true"><i style="width:${pct}%"></i>${[2, 3].map(c => { const at = STEPS.findIndex(s => s.ch === c); return `<s style="--at:${(at / (tot - 1) * 100).toFixed(1)}%"></s>`; }).join('')}</div><div class="tp-body">${inner}</div>`;
    const nb = $('#tuNext'); if (nb) { nb.onclick = next; setTimeout(() => { try { nb.focus({ preventScroll: true }); } catch (e) {} }, 30); }
    const bb = $('#tuBack'); if (bb) bb.onclick = () => { idx--; show(); };
    $('#tuQuit').onclick = quit;
    $('#tuMin').onclick = () => { const was = box.classList.contains('min'); box.classList.toggle('min', !was); box.classList.remove('auto'); opened = was ? idx : -1; lastKey = ''; show(); };
  }
  const mt = box.querySelector('.tut-mt'); if (mt) { const h = meterHtml(st); if (mt.innerHTML !== h) mt.innerHTML = h; }
  layer.classList.add('show');
  layer.classList.toggle('act', act && (st.k === 'play' || st.k === 'pass'));
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
const ringsOf = st => { const at = phone() && st.atP ? st.atP : st.at; return at ? at.map(rectOf).filter(Boolean) : []; };   // phones: the header buttons sit under the docked bubble — ring only the box
// what the text talks about (see), clipped to the screen; off-screen parts do not count
function seeRects(st) {
  const W = innerWidth, H = innerHeight;
  return (st.see || []).map(rectOf).filter(Boolean).map(r => ({ l: Math.max(0, r.l), t: Math.max(0, r.t), r: Math.min(W, r.r), b: Math.min(H, r.b) })).filter(r => r.r - r.l > 4 && r.b - r.t > 4);
}
function place() {
  if (!layer || !layer.classList.contains('show')) return;
  const st = cur(); if (!st) return;
  const act = active() && st.k !== 'auto', W = innerWidth, H = innerHeight, m = 10, pad = phone() ? 5 : 8;
  const list = act ? ringsOf(st) : [], keep = act ? seeRects(st) : [];
  paint(list, pad);
  layer.classList.toggle('center', !list.length && act); layer.classList.toggle('watch', !act);
  // while the computer plays: no veil, a small box at the bottom (the table stays in full view)
  if (!act) {
    box.style.width = phone() ? (W - 2 * m) + 'px' : ''; const bw = box.offsetWidth, bh = box.offsetHeight;
    box.style.left = (phone() ? m : Math.max(m, (W - bw) / 2)) + 'px'; box.style.top = (H - bh - m) + 'px'; return;
  }
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
    // no free band: the compact bubble (smaller text and gaps); still none: folded to the title, the gauge and what to do —
    // "Open" shows the text again (the player's choice, kept for the step)
    if (y == null) { box.classList.add('tight'); bh = box.offsetHeight; y = pick(); }
    if (y == null && opened !== idx && !box.classList.contains('min')) {
      box.classList.add('min', 'auto'); const mb = $('#tuMin'); if (mb) mb.textContent = T('tu.max'); bh = box.offsetHeight; y = pick();
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
    [m, m], [W - bw - m, m], [m, H - bh - m], [W - bw - m, H - bh - m], [clampX(W * .36 - bw / 2), clampY(H * .42 - bh / 2)]];
  // more places: along the edges of the screen, in steps
  for (let x = m; x <= W - bw - m; x += 60) cand.push([x, m], [x, H - bh - m]);
  for (let y = m; y <= H - bh - m; y += 40) cand.push([m, y], [W - bw - m, y]);
  const ov1 = ([x, y], r) => Math.max(0, Math.min(x + bw, r.r + pad) - Math.max(x, r.l - pad)) * Math.max(0, Math.min(y + bh, r.b + pad) - Math.max(y, r.t - pad));
  const over = p => list.reduce((a, r) => a + 3 * ov1(p, r), 0) + keep.reduce((a, r) => a + ov1(p, r), 0);
  const inside = ([x, y]) => x >= m - .5 && y >= m - .5 && x + bw <= W - m + .5 && y + bh <= H - m + .5;
  const best = cand.find(p => inside(p) && over(p) === 0) || cand.map(([x, y]) => [clampX(x), clampY(y)]).sort((a, b) => over(a) - over(b))[0];
  box.style.left = best[0] + 'px'; box.style.top = best[1] + 'px';
}
// phones: the page scrolls — bring the box a step talks about into view (the table back at the top for the others)
function reveal(st) {
  const sc = document.querySelector('.stage'); if (!sc || !phone()) return;
  if (st.tab) {
    const el = document.querySelector(`#side [data-pt="${st.tab}"]`); if (!el) return;
    const top = sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 8;
    sc.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  } else if (sc.scrollTop > 0) sc.scrollTo({ top: 0, behavior: 'smooth' });
}
function hide() { if (layer) { layer.classList.remove('show'); box.innerHTML = ''; rings.innerHTML = ''; lastKey = ''; } document.querySelectorAll('#htHand .cd.tut-want').forEach(e => e.classList.remove('tut-want')); }
function shake() { if (!box) return; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); A.sfx('bad'); }

/* every visit: offer the tutorial, until "don't show again" is ticked or the tutorial is finished (as in poker / guandan) */
const HIDE = 'aicoding-hearts-tut-hide', DONE = 'aicoding-hearts-tut-done';
function offer(force) {
  let hidden = false; try { hidden = !!(localStorage.getItem(HIDE) || localStorage.getItem(DONE)); } catch (e) {}
  if ((!force && hidden) || on || $('#tutOffer')) return;
  const ov = document.createElement('div'); ov.className = 'overlay show'; ov.id = 'tutOffer';
  ov.innerHTML = `<div class="modal tut-offer"><div class="to-art">${A.gArt('std')}</div><h2>${esc(T('tu.offer.h'))}</h2><p>${esc(T('tu.offer.p'))}</p>` +
    `<ul class="to-list">${['1', '2', '3', '4'].map(k => `<li>${esc(T('tu.offer.' + k))}</li>`).join('')}</ul>` +
    `<label class="to-chk"><input type="checkbox" id="toNo"> ${esc(T('tu.offer.no'))}</label>` +
    `<div class="modal-actions half"><button class="mbtn" id="toLater">${esc(T('tu.offer.later'))}</button><button class="mbtn go" id="toGo">${esc(T('tu.offer.go'))}</button></div></div>`;
  document.body.appendChild(ov);
  const close = () => { if ($('#toNo').checked) try { localStorage.setItem(HIDE, '1'); } catch (e) {} ov.remove(); A.sched(A.loop, 300); };
  $('#toLater').onclick = close; $('#toGo').onclick = () => { ov.remove(); start(); };
}
window.HtTut = { start, on: () => on, step: () => STEPS[idx], seeRects: () => (cur() ? seeRects(cur()) : []), outcome, hold, auto, want, allow, say, after, bot, passOf, ev, finish, drop, quit, offer, STEPS };
// on arrival: the offer box once the page has settled (not over another dialog)
setTimeout(() => { if (!document.querySelector('.overlay.show')) offer(false); }, 900);
})();
