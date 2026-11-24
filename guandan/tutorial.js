/* 掼蛋 — the guided hand (guandan/tutorial.js)
   One short scripted hand on the real table (level 7, eight or nine cards each): you play a pair, let your partner's pair stand,
   beat an A with a level card, make a straight with the wild ★, watch a bomb and a bigger bomb, "catch the wind" after your
   partner goes out and go out yourself — your team 1st and 2nd: +3 levels. The steps show in a bubble over the table; only the
   move a step asks for is accepted. Your saved match comes back afterwards. First visit: an offer box (once). */
(function () {
'use strict';
const A = window.GdApp, GD = window.GD, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
const C = s => window.GdRules.C(s), CS = s => s.trim().split(/\s+/).map(C);
const L = 7;
const HANDS = ['4S 4D 9C 10D JS QC 7H 7C 6S', '9S 9D 8S 8D 8C 8H 2S 3H', "QS QD 5C KS KD KC KH KS' 3S", 'AD 2C 2D 2H 3D'];
// the computer players' moves, in order (null = pass)
const SCRIPT = [[1, '9S 9D'], [2, 'QS QD'], [3, null], [1, null], [2, '5C'], [3, 'AD'], [1, null], [2, null], [3, null], [1, '8S 8D 8C 8H'], [2, "KS KD KC KH KS'"], [3, null], [1, null], [2, '3S'], [3, null], [1, null]];
// the steps: info (read, then Next) or do (your move: play these cards / pass). when: the step waits for this moment
const myTurn = S => S.phase === 'play' && S.turn === 0;
const lastIs = (seat, n) => S => { const e = S.log[S.log.length - 1]; return e && e.s === seat && e.c && e.c.n === n; };
const STEPS = [
  { k: 'info', id: 's1', when: () => true, center: true },
  { k: 'play', id: 's2', ids: '4S 4D', when: myTurn },
  { k: 'pass', id: 's3', when: myTurn },
  { k: 'play', id: 's4', ids: '7C', when: myTurn },
  { k: 'play', id: 's5', ids: '9C 10D JS QC 7H', when: myTurn },
  { k: 'info', id: 's6', when: lastIs(1, 4) },
  { k: 'info', id: 's7', when: lastIs(2, 5) },
  { k: 'pass', id: 's8', when: myTurn },
  { k: 'pass', id: 's9', when: myTurn },
  { k: 'play', id: 's10', ids: '6S', when: myTurn },
  { k: 'info', id: 's11', when: S => S.phase === 'end', last: true },
];
let on = false, idx = 0, seen = false, sp = 0, layer = null;
function setup() {
  const M = GD.newMatch({ start: L }); M.lvl = 3; M.tut = true;
  const hands = HANDS.map(CS);
  const S = { L, lt: -1, hands, out: [], turn: 0, last: null, passN: 0, trick: 0, log: [], played: [], phase: 'play', trib: null, no: 1, first: 0, lead0: 0 };
  return { M, S };
}
function start() {
  on = true; idx = 0; seen = false; sp = 0;
  try { localStorage.setItem('aicoding-guandan-tut', '1'); } catch (e) {}
  A.startTutorial(setup);
  show(); A.sched(A.loop, 400);
}
function cur() { return STEPS[idx]; }
const active = () => { const st = cur(); return !!(st && A.S && st.when(A.S)); };
function hold() { const st = cur(); if (!st) return false; if (st.k === 'info') return active(); return false; }
function allow(a, ids) {
  const st = cur();
  if (!st || !active()) { shake(); return false; }
  if (a === 'hint') return st.k === 'play';
  if (st.k === 'pass') { if (a === 'pass') return true; shake(); return false; }
  if (st.k === 'play') {
    if (a !== 'play') { shake(); return false; }
    const want = CS(st.ids).sort((x, y) => x - y).join(), got = ids.slice().sort((x, y) => x - y).join();
    if (want === got) return true;
    A.toast(t('tu.wrongCards')); shake(); return false;
  }
  shake(); return false;
}
function after(a) {
  const st = cur(); if (!st || st.k === 'info') return;
  if ((st.k === 'pass' && a === 'pass') || (st.k === 'play' && a === 'play')) { idx++; show(); }
}
// the computer's scripted move (falls back to a legal pass / the AI if the script and the table disagree)
function bot(S, seat) {
  const m = SCRIPT[sp];
  if (m && m[0] === seat) { sp++; if (!m[1]) return null; const ids = CS(m[1]); const c = GD.identify(ids, S.L).sort((x, y) => GD.tier(y) - GD.tier(x))[0]; return c; }
  return S.last ? null : GD.gen(S.hands[seat], S.L)[0];
}
function next() { const st = cur(); if (!st) return; if (st.last) { finish(); return; } idx++; show(); A.loop(); }
function finish() { const was = on; on = false; hide(); if (was) A.endTutorial(); }
function ev(k) { if (!on) return; if (k === 'render') { mark(); show(); } if (k === 'end') show(); }
// the cards a step wants you to pick glow
function mark() {
  const st = cur(); document.querySelectorAll('#gdHand .cd.tut-want').forEach(e => e.classList.remove('tut-want'));
  if (!st || st.k !== 'play' || !active()) return;
  CS(st.ids).forEach(id => { const e = document.querySelector(`#gdHand .cd[data-c="${id}"]`); if (e) e.classList.add('tut-want'); });
}
function ensure() {
  if (layer) return layer;
  layer = document.createElement('div'); layer.id = 'gdTut'; layer.className = 'gd-tut';
  document.querySelector('#boardWrap').appendChild(layer);
  return layer;
}
let lastHtml = '';
function show() {
  if (!on) return;
  const st = cur(), el = ensure(); if (!st) { hide(); return; }
  const act = active();
  const n = idx + 1, tot = STEPS.length;
  const txt = act ? t('tu.' + st.id) : t('tu.watch');
  const btns = st.k === 'info' && act ? `<button type="button" class="mbtn go" id="tuNext">${esc(st.last ? t('tu.done') : t('tu.next'))}</button>` : st.k !== 'info' && act ? `<span class="tut-do">${esc(t(st.k === 'pass' ? 'tu.doPass' : 'tu.doPlay'))}</span>` : '';
  const html = `<div class="tut-box${st.center && act ? ' center' : ''}"><div class="tut-top"><em>${esc(t('tu.step', { n, m: tot }))}</em><button type="button" class="tut-x" id="tuQuit">${esc(t('tu.quit'))}</button></div><p>${esc(txt)}</p><div class="tut-btns">${btns}</div></div>`;
  el.classList.add('show');
  if (html !== lastHtml) { el.innerHTML = html; lastHtml = html; }
  const nb = $('#tuNext'); if (nb) nb.onclick = next;
  $('#tuQuit').onclick = () => { finish(); A.toast(t('tu.quitDone')); };
}
function hide() { if (layer) { layer.classList.remove('show'); layer.innerHTML = ''; lastHtml = ''; } }
function shake() { const b = document.querySelector('#gdTut .tut-box'); if (!b) return; b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); A.sfx('bad'); }

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
