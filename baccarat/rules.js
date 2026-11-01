/* バカラ — hands-on rules tutorial (baccarat/rules.js)
   One RuleTour per variant (tabs on top). Page 1 = what kind of game it is (+ history / how to win / culture).
   The other pages show a deal on a small felt and ask one question (answer buttons); every deal follows the real tableau.
   Texts: I18N keys 'r.<variant>.*' and 'r.ui.*' (i18n.js). */
(function () {
'use strict';
const A = window.BacApp, B = window.BC, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
const CS = s => s ? s.split(' ').map(B.parse) : [];
const card = (c, cls) => Cards.html(c, { cls });
// pages: { c: 'single row' | p/b: hands, q: question key, o: option keys / labels, a: answer index }
const RULES = {
  classic: [
    { c: '7S 8H', o: ['15', '5', '1'], a: 1 },
    { c: 'KH 9D', o: ['19', '9', '0'], a: 1 },
    { p: '4S 4D', b: 'KC 5H', o: ['oP', 'oB', 'oGo'], a: 0 },
    { p: '3H 2C', b: '6S KD', o: ['draw', 'stand'], a: 0 },
    { p: '7S QD', b: '2H 3D', o: ['draw', 'stand'], a: 0 },
    { p: '2S 3D 8C', b: '2C AH', o: ['draw', 'stand'], a: 1 },
    { bet: true, o: ['200', '195', '150'], a: 1 },
    { p: '6S AD', b: '4H 3C', o: ['0', '100', '900'], a: 1 },
  ],
  nocomm: [
    { p: '2S 3D KC', b: '3H 3C', o: ['200', '195', '150'], a: 2 },
    { o: ['oP', 'oB'], a: 0 },
  ],
  ez: [
    { p: '3S 2D KC', b: '2H AC 4D', o: ['200', '100', '0'], a: 1 },
    { p: 'AS 4D 3H', b: 'KS 7C', o: ['win', 'lose'], a: 0 },
  ],
};
const IMG = '../images/icons/baccarat.svg';
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
const row = cs => `<span class="pkr-row">${cs.map((c, i) => card(c, i === 2 ? 'third' : '')).join('')}</span>`;
const lbl = o => /^\d+$/.test(o) ? o : U(o);
function setupPage(v, j, api) {
  const P = RULES[v][j], pages = t('r.' + v + '.p'), tx = pages[j] || {}, b = api.board;
  b.classList.add('felt-bg'); b.innerHTML = '';
  const host = document.createElement('div'); host.className = 'pkr bcr'; b.appendChild(host);
  let done = false;
  const p = CS(P.p), bk = CS(P.b), c = CS(P.c);
  const rows = (p.length ? 1 : 0) + (bk.length ? 1 : 0) + (c.length ? 1 : 0);
  sizeCards(b, Math.max(4, p.length, bk.length, c.length) + 1.5, Math.max(1, rows) + .9);
  const tot = cs => `<em class="bcr-t">${B.total(cs)}</em>`;
  host.innerHTML = (c.length ? `<div class="pkr-me">${row(c)}</div>` : '') +
    (p.length ? `<div class="pkr-me bcr-h"><small>${esc(t('side.P'))}</small>${row(p)}${tot(p)}</div>` : '') +
    (bk.length ? `<div class="pkr-me bcr-h"><small>${esc(t('side.B'))}</small>${row(bk)}${tot(bk)}</div>` : '') +
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
  const tour = RuleTour.create({ mount: m, store: 'aicoding-baccarat-rules-' + v, lang: () => A.LANG, aspect: 1.45, sound: k => A.sfx(k),
    close: () => A.closeOv('#rulesOverlay'),
    lessons: () => { A.closeOv('#rulesOverlay'); window.BacLessons && BacLessons.open({ cat: v === 'classic' ? 'basic' : 'bets' }); },
    play: () => { A.closeOv('#rulesOverlay'); A.newSession(v); },
    pages });
  tours[v] = tour; return tour;
}
function tabs() {
  $('#rulesTabs').innerHTML = B.ORDER.map(v => `<button type="button" data-v="${v}" class="${v === cur ? 'sel' : ''}">${esc(A.vName(v))}</button>`).join('') +
    (window.BacTut ? `<button type="button" class="rv-tab-lesson" data-tut="1">▶ ${esc(BacTut.L('entry'))}</button>` : '');
  const tu = document.querySelector('#rulesTabs [data-tut]'); if (tu) tu.onclick = () => { if (cur && tours[cur]) tours[cur].stop(); A.closeOv('#rulesOverlay'); BacTut.start(); };
  document.querySelectorAll('#rulesTabs [data-v]').forEach(b => b.onclick = () => show(b.dataset.v, 0));
  $('#rulesTop').innerHTML = `<button type="button" class="sel" data-top="rules">${esc(t('btn.rules'))}</button><button type="button" data-top="lessons">${esc(t('btn.lesson'))}</button>`;
  document.querySelector('#rulesTop [data-top="lessons"]').onclick = () => { if (cur && tours[cur]) tours[cur].stop(); window.BacLessons && BacLessons.open(); };
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
  try { localStorage.setItem('aicoding-baccarat-rules-seen', '1'); } catch (e) {}
  A.openOv('#rulesOverlay');
  requestAnimationFrame(() => show(v || cur || 'classic', 0));
}
document.addEventListener('dragstart', e => { if (e.target.closest && e.target.closest('img,.cd,svg')) e.preventDefault(); });
document.getElementById('btnRules').onclick = () => open(cur || (A.T && A.T.v));
document.getElementById('rulesOverlay').addEventListener('pointerdown', e => { if (e.target.id === 'rulesOverlay') { if (cur && tours[cur]) tours[cur].stop(); A.closeOv('#rulesOverlay'); } });
window.BacRules = { open, RULES, relang() { if (document.getElementById('rulesOverlay').classList.contains('show') && cur) { tabs(); tours[cur].render(); } } };
})();
