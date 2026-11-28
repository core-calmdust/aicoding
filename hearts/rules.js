/* ハーツ — hands-on rules tour (hearts/rules.js)
   RuleTour pages: an intro (history / how to win / culture), then one idea per page with a small table where you tap a seat,
   tap or select cards, or pick an answer. Every card answer is checked with the real engine (engine.js: legal plays, winner, points).
   Tabs above the tour: Rules · Glossary. Texts: I18N keys 'r.*' (i18n.js / i18n-more.js). */
(function () {
'use strict';
const A = window.HtApp, HT = window.HT, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
// "10H QS 2C" → card ids
const C = s => { const su = 'CDSH'.indexOf(s.slice(-1)), r = s.slice(0, -1); return HT.card(su, r === 'A' ? 14 : r === 'K' ? 13 : r === 'Q' ? 12 : r === 'J' ? 11 : +r); };
const CS = s => s ? s.trim().split(/\s+/).map(C) : [];
// a hand state for checking a play: the trick so far (seats before you), your hand, the trick number, broken hearts
function stateFor(P) {
  const hand = CS(P.hand), tr = CS(P.trick || ''), R = HT.rules({ v: 'std' });
  const hands = [hand, [], [], []];
  const S = HT.newHand(R, hands, 0, 1);
  S.phase = 'play'; S.tn = P.tn != null ? P.tn : 1; S.broken = !!P.broken;
  S.trick = tr.map((c, i) => ({ s: (4 - tr.length + i) % 4, c })); S.turn = 0; S.leader = S.trick.length ? S.trick[0].s : 0;
  return S;
}
// the pages: m = mode (tap | sel | seat | opt | win), the answer is checked by the engine where it can be
const PAGES = [
  { id: 'goal', m: 'sel', hand: '3C 9C KC 5D 2S 7S QS 4H 8H JH AH 6D 10S', ok: (ids) => { const want = CS('QS 4H 8H JH AH'); return ids.length === want.length && want.every(c => ids.includes(c)); } },
  { id: 'pass', m: 'seat', a: 1, dir: 1 },
  { id: 'c2', m: 'tap', tn: 0, hand: '2C 9C 5D KD 3S 8H' },
  { id: 'follow', m: 'tap', trick: '7D', hand: '4D KD 3C 9S 5H 10C' },
  { id: 'win', m: 'win', trick: '6C KC AH 9C', a: 1 },
  { id: 'void', m: 'tap', trick: '5C JC', hand: '7D QS 2H 9H 4S', good: c => HT.isPen(c, HT.rules({})) },
  { id: 'first', m: 'tap', tn: 0, trick: '2C 8C 10C', hand: 'QS 6H JH 3D 9D KS' },
  { id: 'break', m: 'tap', broken: false, hand: '3H 7H QH 4C 8D 9S' },
  { id: 'score', m: 'opt', trick: '5H QS 9H 3C', optKeys: ['o2', 'o13', 'o15', 'o26'], a: 2 },
  { id: 'moon', m: 'opt', optKeys: ['o0', 'o13', 'o26'], a: 2 },
  { id: 'end', m: 'seat', a: 2, end: true },
];
const IMG = '../images/icons/hearts.svg?v=1';
let tour = null, view = 'rules';
const R = (id, k) => t('r.' + id + '.' + k);
function overview() {
  const f = String(t('r.facts')).split('|').filter(Boolean);
  return `<div class="rt-ov"><span class="rt-ov-art">${A.gArt('std')}</span><div class="rt-ov-t"><p>${esc(t('r.about'))}</p><ul>${f.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
}
function sizeCards(box, cols, rows) {
  const W = box.clientWidth || 600, H = box.clientHeight || 420;
  const cw = Math.max(30, Math.min(84, W / (cols * 1.08 + .6), H / (rows * 1.4 * 1.32 + 1.4)));
  box.style.setProperty('--cw', cw.toFixed(1) + 'px'); box.style.setProperty('--chh', (cw * 1.4).toFixed(1) + 'px');
}
const card = (id, cls) => Cards.html(id, { cls: 'rc' + (cls ? ' ' + cls : ''), k: 'r' + id });
const row = (ids, cls) => `<span class="pkr-row">${ids.map(id => card(id, cls)).join('')}</span>`;
// a trick in the middle: who played what (the seats before you)
function trickBox(tr, labels) {
  const N = A.NAMES(), n = tr.length;
  return `<div class="pkr-board htr-rt"><small>${esc(t('r.ui.trick'))}</small><span class="pkr-row">${tr.map((c, i) => `<span class="rt-tc">${card(c)}<em>${esc(labels ? labels[i] : N[(4 - n + i) % 4])}</em></span>`).join('')}</span></div>`;
}
function setupPage(P, api) {
  const b = api.board, N = A.NAMES();
  b.classList.add('felt-bg'); b.innerHTML = '';
  const host = document.createElement('div'); host.className = 'pkr htrules'; b.appendChild(host);
  let done = false;
  const good = () => { done = true; A.sfx('ok'); api.ok(esc(R(P.id, 'ok'))); };
  const bad = msg => { A.sfx('bad'); api.ng(esc(msg || R(P.id, 'ng'))); };
  if (P.m === 'seat') {
    // a small table: you at the bottom, then clockwise left, top, right
    const pos = [[50, 84], [13, 50], [50, 16], [87, 50]];
    const sc = P.end ? [64, 102, 37, 88] : null;
    const arrow = P.dir ? `<svg class="htr-pass" viewBox="0 0 100 100" aria-hidden="true"><path d="M44 72 C 30 70, 22 62, 22 54"/><path d="M16 60 22 52 28 60"/></svg>` : '';
    host.innerHTML = `<div class="pkr-tbl gdr-tbl"><div class="pkr-oval ht-oval"></div>${pos.map(([x, y], s) => `<button type="button" class="pkr-seat gdr-seat" data-s="${s}" style="left:${x}%;top:${y}%"><span class="av">${esc(N[s].slice(0, 1))}</span><em>${esc(N[s])}</em>${sc ? `<i class="htr-sc${sc[s] >= 100 ? ' over' : ''}">${sc[s]}</i>` : ''}</button>`).join('')}${arrow}</div>`;
    host.querySelectorAll('[data-s]').forEach(el => el.onclick = () => {
      if (done) return;
      if (+el.dataset.s === P.a) { el.classList.add('right'); good(); } else { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 500); bad(); }
    });
    return;
  }
  if (P.m === 'opt') {
    const tr = CS(P.trick || '');
    sizeCards(b, 6, tr.length ? 3 : 1.6);
    host.innerHTML = (tr.length ? trickBox(tr, [N[1], N[2], N[3], N[0]]) : `<p class="pkr-info htr-q">${esc(R(P.id, 'q'))}</p>`) +
      `<div class="pkr-opts h gdr-opts">${P.optKeys.map((k, i) => `<button type="button" class="pkr-opt" data-o="${i}"><b>${esc(R(P.id, k))}</b></button>`).join('')}</div>`;
    host.querySelectorAll('[data-o]').forEach(el => el.onclick = () => {
      if (done) return;
      if (+el.dataset.o === P.a) { el.classList.add('right'); good(); } else { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 500); bad(); }
    });
    return;
  }
  if (P.m === 'win') {   // tap the card that wins the trick
    const tr = CS(P.trick), labels = [N[1], N[2], N[3], N[0]];
    sizeCards(b, 6, 2);
    const S = { trick: tr.map((c, i) => ({ s: i, c })) }, w = HT.winner(S.trick);
    host.innerHTML = trickBox(tr, labels);
    host.querySelectorAll('.cd').forEach((el, i) => { el.classList.add('pick-me'); el.onclick = () => {
      if (done) return;
      if (i === w) { el.classList.add('pick'); good(); } else { el.classList.add('wrongc'); setTimeout(() => el.classList.remove('wrongc'), 500); bad(); }
    }; });
    return;
  }
  const hand = CS(P.hand), tr = CS(P.trick || '');
  if (P.m === 'tap') {
    sizeCards(b, Math.max(5.5, hand.length + 1), tr.length ? 3.2 : 1.8);
    const S = stateFor(P), L = HT.legal(S, 0);
    host.innerHTML = (tr.length ? trickBox(tr) : '') + `<div class="pkr-me"><small>${esc(t('r.ui.hand'))}</small>${row(hand, 'pick-me')}</div>`;
    host.querySelectorAll('.pkr-me .cd').forEach(el => el.onclick = () => {
      if (done) return;
      const c = +el.dataset.c, ok = L.includes(c) && (!P.good || P.good(c));
      if (ok) { el.classList.add('pick'); good(); } else { el.classList.add('wrongc'); setTimeout(() => el.classList.remove('wrongc'), 500); bad(); }
    });
    return;
  }
  // sel: pick several cards, then check
  sizeCards(b, Math.max(7, hand.length * .62 + 1), 2.2);
  const sel = new Set();
  const draw = () => {
    const ids = hand.filter(id => sel.has(id));
    host.innerHTML = `<div class="pkr-me"><small>${esc(t('r.ui.hand'))}</small><span class="pkr-row htr-wrap">${hand.map(id => card(id, sel.has(id) ? 'pick' : '')).join('')}</span></div>` +
      `<div class="pkr-btns"><button type="button" class="abtn go" id="rtCheck"${ids.length ? '' : ' disabled'}>${esc(t('r.ui.check', { n: ids.length }))}</button></div>`;
    host.querySelectorAll('.pkr-me .cd').forEach(el => el.onclick = () => { if (done) return; const id = +el.dataset.c; if (sel.has(id)) sel.delete(id); else sel.add(id); A.sfx('sel'); draw(); });
    host.querySelector('#rtCheck').onclick = () => { if (done) return; if (P.ok(hand.filter(id => sel.has(id)))) good(); else bad(); };
  };
  draw();
}
function build() {
  if (tour) return tour;
  const m = document.createElement('div'); m.className = 'rt-mount'; $('#rulesBody').appendChild(m);
  const pages = [{ id: 'intro', title: () => esc(t('title')), body: () => '', html: () => overview() + RuleTour.intro({ img: IMG, origin: esc(t('r.origin')), players: esc(t('r.players')), time: esc(t('r.time')), history: esc(t('r.hist')), win: esc(t('r.howwin')), culture: esc(t('r.cult')), lang: A.LANG }) }];
  PAGES.forEach(P => pages.push({ id: P.id, title: () => esc(R(P.id, 't')), body: () => esc(R(P.id, 'b')), task: () => esc(R(P.id, 'task')), setup: api => setupPage(P, api), teardown() {} }));
  tour = RuleTour.create({ mount: m, store: 'aicoding-hearts-rules', lang: () => A.LANG, aspect: 1.45, sound: k => A.sfx(k),
    close: () => A.closeOv('#rulesOverlay'),
    lessons: () => { A.closeOv('#rulesOverlay'); window.HtLessons && HtLessons.open(); },
    play: () => { A.closeOv('#rulesOverlay'); },
    pages });
  tour.mount = m;
  return tour;
}
/* the glossary */
const GLOSS = ['trick', 'lead', 'follow', 'slough', 'pen', 'lady', 'pass', 'hold', 'break', 'moon', 'void', 'duck', 'smoke', 'paint', 'protect', 'exit', 'stopper', 'count', 'ev', 'sample'];
function glossHtml() {
  return `<div class="gl-list ht-gl"><p class="lc-lead">${esc(t('gl.lead'))}</p>` + GLOSS.map(k => `<div class="gl-item"><b>${esc(t('g.' + k + '.n'))}</b><p>${esc(t('g.' + k))}</p></div>`).join('') + `</div>`;
}
function tabs() {
  $('#rulesTabs').innerHTML = `<button type="button" data-v="rules" class="${view === 'rules' ? 'sel' : ''}">${esc(t('btn.rules'))}</button><button type="button" data-v="gloss" class="${view === 'gloss' ? 'sel' : ''}">${esc(t('gl.tab'))}</button>` +
    (window.HtTut ? `<button type="button" class="rv-tab-lesson" data-tut="1">▶ ${esc(t('tu.entry'))}</button>` : '');
  const tu = document.querySelector('#rulesTabs [data-tut]'); if (tu) tu.onclick = () => { if (tour) tour.stop(); A.closeOv('#rulesOverlay'); HtTut.start(); };
  document.querySelectorAll('#rulesTabs [data-v]').forEach(b => b.onclick = () => show(b.dataset.v));
  $('#rulesTop').innerHTML = `<button type="button" class="sel" data-top="rules">${esc(t('btn.rules'))}</button><button type="button" data-top="lessons">${esc(t('btn.lesson'))}</button>`;
  document.querySelector('#rulesTop [data-top="lessons"]').onclick = () => { if (tour) tour.stop(); window.HtLessons && HtLessons.open(); };
}
let glossEl = null;
function show(v, page) {
  view = v || 'rules'; tabs();
  const tr = build();
  if (!glossEl) { glossEl = document.createElement('div'); glossEl.className = 'gl-mount'; $('#rulesBody').appendChild(glossEl); }
  if (view === 'gloss') { tr.stop(); tr.mount.style.display = 'none'; glossEl.style.display = ''; glossEl.innerHTML = glossHtml(); }
  else { glossEl.style.display = 'none'; tr.mount.style.display = ''; tr.open(page || 0); }
}
function open(page, v) {
  try { localStorage.setItem('aicoding-hearts-rules-seen', '1'); } catch (e) {}
  A.openOv('#rulesOverlay');
  requestAnimationFrame(() => show(v || 'rules', page || 0));
}
document.addEventListener('dragstart', e => { if (e.target.closest && e.target.closest('img,.cd,svg')) e.preventDefault(); });
document.getElementById('btnRules').onclick = () => open();
document.getElementById('rulesOverlay').addEventListener('pointerdown', e => { if (e.target.id === 'rulesOverlay') { if (tour) tour.stop(); A.closeOv('#rulesOverlay'); } });
window.HtRules = { open, PAGES, C, CS, stateFor, relang() { if (document.getElementById('rulesOverlay').classList.contains('show')) { tabs(); if (view === 'gloss') glossEl.innerHTML = glossHtml(); else tour.render(); } } };
})();
