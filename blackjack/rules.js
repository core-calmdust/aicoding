/* ブラックジャック — hands-on rules tutorial (blackjack/rules.js)
   One RuleTour per variant (tabs on top). Page 1 = what kind of game it is (+ history / how to win / culture).
   The other pages show a hand on a small felt and ask one question (answer buttons).
   Texts: I18N keys 'r.<variant>.*' and 'r.ui.*' (i18n.js). */
(function () {
'use strict';
const A = window.BJApp, B = window.BJ, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
const CS = s => s ? s.split(' ').map(B.parse) : [];
const card = c => Cards.html(c, {});
// pages: { y: your cards, d: dealer cards ('?' = face down), o: option keys / labels, a: answer index }
const RULES = {
  classic: [
    { y: 'KH 7S', o: ['17', '7', '27'], a: 0 },
    { y: 'AS 6D', o: ['7', '17', 'o7or17'], a: 2 },
    { y: 'AH KC', d: '9S ?', o: ['$150', '$100', '$200'], a: 0 },
    { y: 'TD 6C 9H', d: '7S ?', o: ['oWin', 'oLose'], a: 1 },
    { d: 'KS 6H', o: ['oDHit', 'oDStand'], a: 0 },
    { y: '6S 5D', d: '6H ?', o: ['oHit', 'oStand', 'oDouble'], a: 2 },
    { y: '8S 8D', d: '9C ?', o: ['oHit', 'oStand', 'oSplit'], a: 2 },
    { d: 'AS ?', o: ['2:1', '1:1', '3:2'], a: 0 },
  ],
  european: [
    { y: 'TS 9H', d: '6C', o: ['oNow', 'oAfter'], a: 1 },
    { y: '6S 5D 9C', d: 'TH AS', o: ['$50', '$100', '$200'], a: 2 },
  ],
  spanish: [
    { y: 'JS 9D', o: ['48', '52', '40'], a: 0 },
    { y: '4S 5H 2D 3C 7S', d: 'KH QC AD', o: ['oWin', 'oPush', 'oLose'], a: 0 },
    { y: '6C 7C 8C', o: ['$100', '$150', '$200'], a: 2 },
  ],
  free: [
    { y: '6S 4D', d: '7H ?', o: ['$0', '$100', '$200'], a: 0 },
    { y: 'KS 8D', d: 'KH 6C 6S', o: ['oWin', 'oPush', 'oLose'], a: 1 },
    { y: '8H 8C', d: 'TS ?', o: ['oSplitFree', 'oSplitPay', 'oNoSplit'], a: 0 },
  ],
};
const IMG = '../images/icons/blackjack.svg';
let cur = null; const tours = {}, mounts = {};
const R = (v, k) => t('r.' + v + '.' + k), U = (k, o) => t('r.ui.' + k, o);
function overview(v) {
  const f = String(R(v, 'facts')).split('|').filter(Boolean);
  return `<div class="rt-ov"><span class="rt-ov-art">${A.gArt(v)}</span><div class="rt-ov-t"><p>${esc(t('vg.' + v))}</p><ul>${f.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
}
function sizeCards(box, cols, rows) {
  const W = box.clientWidth || 600, H = box.clientHeight || 420;
  const cw = Math.max(26, Math.min(92, W / (cols * 1.08 + .6), H / (rows * 1.4 * 1.42 + 1.2)));
  box.style.setProperty('--cw', cw.toFixed(1) + 'px'); box.style.setProperty('--chh', (cw * 1.4).toFixed(1) + 'px');
}
const row = cs => `<span class="pkr-row">${cs.map(c => c === '?' ? Cards.html(null, { down: true }) : card(c)).join('')}</span>`;
const lbl = o => /^[$\d]/.test(o) ? o : U(o);
function setupPage(v, j, api) {
  const P = RULES[v][j], pages = t('r.' + v + '.p'), tx = pages[j] || {}, b = api.board;
  b.classList.add('felt-bg'); b.innerHTML = '';
  const host = document.createElement('div'); host.className = 'pkr bcr'; b.appendChild(host);
  let done = false;
  const y = CS(P.y), d = P.d ? P.d.split(' ').map(s => s === '?' ? '?' : B.parse(s)) : [];
  const rows = (y.length ? 1 : 0) + (d.length ? 1 : 0);
  sizeCards(b, Math.max(4, y.length, d.length) + 1.5, Math.max(1, rows) + .9);
  host.innerHTML = (d.length ? `<div class="pkr-me bcr-h"><small>${esc(U('dealer'))}</small>${row(d)}</div>` : '') +
    (y.length ? `<div class="pkr-me bcr-h"><small>${esc(U('you'))}</small>${row(y)}</div>` : '') +
    (tx.info ? `<p class="pkr-info">${esc(tx.info)}</p>` : '') +
    `<div class="pkr-btns">${P.o.map((o, i) => `<button type="button" class="abtn" data-b="${i}">${esc(lbl(o))}</button>`).join('')}</div>`;
  host.querySelectorAll('[data-b]').forEach(el => el.onclick = () => {
    if (done) return;
    if (+el.dataset.b === P.a) { done = true; el.classList.add('rec'); A.sfx('ok'); api.ok(esc(tx.ok || '')); }
    else { A.sfx('bad'); api.ng(esc(tx.ng || '')); }
  });
}
function build(v) {
  if (tours[v]) return tours[v];
  const m = document.createElement('div'); m.className = 'rt-mount'; m.dataset.v = v; $('#rulesBody').appendChild(m); mounts[v] = m;
  const pages = [{ id: 'intro', title: () => esc(A.vName(v)), body: () => '', html: () => overview(v) + RuleTour.intro({ img: IMG, origin: esc(R(v, 'origin')), players: esc(R(v, 'players')), time: esc(R(v, 'time')), history: esc(R(v, 'hist')), win: esc(R(v, 'win')), culture: esc(R(v, 'cult')), lang: A.LANG }) }];
  RULES[v].forEach((P, j) => pages.push({ id: 'p' + j, title: () => esc((t('r.' + v + '.p')[j] || {}).t || ''), body: () => esc((t('r.' + v + '.p')[j] || {}).b || ''), task: () => esc((t('r.' + v + '.p')[j] || {}).task || ''), setup: api => setupPage(v, j, api), teardown() {} }));
  const tour = RuleTour.create({ mount: m, store: 'aicoding-blackjack-rules-' + v, lang: () => A.LANG, aspect: 1.45, sound: k => A.sfx(k),
    close: () => A.closeOv('#rulesOverlay'),
    lessons: () => { A.closeOv('#rulesOverlay'); window.BJLessons && BJLessons.open({ cat: v === 'classic' ? 'basic' : 'extra' }); },
    play: () => { A.closeOv('#rulesOverlay'); A.newSession(v); },
    pages });
  tours[v] = tour; return tour;
}
function tabs() {
  $('#rulesTabs').innerHTML = B.ORDER.map(v => `<button type="button" data-v="${v}" class="${v === cur ? 'sel' : ''}">${esc(A.vName(v))}</button>`).join('') +
    (window.BJTut ? `<button type="button" class="rv-tab-lesson" data-tut="1">▶ ${esc(BJTut.L('entry'))}</button>` : '');
  const tu = document.querySelector('#rulesTabs [data-tut]'); if (tu) tu.onclick = () => { if (cur && tours[cur]) tours[cur].stop(); A.closeOv('#rulesOverlay'); BJTut.start(); };
  document.querySelectorAll('#rulesTabs [data-v]').forEach(b => b.onclick = () => show(b.dataset.v, 0));
  $('#rulesTop').innerHTML = `<button type="button" class="sel" data-top="rules">${esc(t('btn.rules'))}</button><button type="button" data-top="lessons">${esc(t('btn.lesson'))}</button>`;
  document.querySelector('#rulesTop [data-top="lessons"]').onclick = () => { if (cur && tours[cur]) tours[cur].stop(); window.BJLessons && BJLessons.open(); };
}
function show(v, page) {
  if (!RULES[v]) v = 'classic';
  if (cur && tours[cur]) tours[cur].stop();
  cur = v; tabs();
  const tour = build(v);
  Object.keys(mounts).forEach(k => { mounts[k].style.display = k === v ? '' : 'none'; });
  tour.open(page || 0);
}
function open(v) {
  try { localStorage.setItem('aicoding-blackjack-rules-seen', '1'); } catch (e) {}
  A.openOv('#rulesOverlay');
  requestAnimationFrame(() => show(v || cur || 'classic', 0));
}
document.addEventListener('dragstart', e => { if (e.target.closest && e.target.closest('img,.cd,svg')) e.preventDefault(); });
document.getElementById('btnRules').onclick = () => open(cur || (A.T && A.T.v));
document.getElementById('rulesOverlay').addEventListener('pointerdown', e => { if (e.target.id === 'rulesOverlay') { if (cur && tours[cur]) tours[cur].stop(); A.closeOv('#rulesOverlay'); } });
window.BJRules = { open, RULES, relang() { if (document.getElementById('rulesOverlay').classList.contains('show') && cur) { tabs(); tours[cur].render(); } } };
})();
