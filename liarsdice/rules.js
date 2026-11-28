/* ライアーダイス — hands-on rules tour (liarsdice/rules.js)
   RuleTour pages: an intro (history / how to win / culture), then one idea per page on a small dice table where you peek
   under your cup, make a bid, pick a legal raise, count the dice after a doubt … Answers are checked with engine.js.
   Texts: I18N keys 'r.*'. */
(function () {
'use strict';
const A = window.LdApp, LD = window.LD, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
const R = (id, k, v) => t('r.' + id + '.' + k, v);
const IMG = '../images/icons/liarsdice.svg?v=1';
const N = p => A.nameOf(p);
// a felt panel with rows of seats: [{ p, dice: [..], cup: bool, hl: face (highlight matches), wild }]
function felt(inner) { return `<div class="rtl">${inner}</div>`; }
function seatRow(o) {
  const dice = o.dice.map((d, i) => `<span class="rd${o.hl && (d === o.hl || (o.wild && d === 1 && o.hl !== 1)) ? ' m' : ''}">${Dice.img(d, 'rdi')}</span>`).join('');
  return `<div class="rts${o.p === 0 ? ' me' : ''}"><span class="ava av${o.p}">${esc(N(o.p).slice(0, 1))}</span><b>${esc(N(o.p))}</b>${o.cup ? `<span class="rcup"></span>` : `<span class="rdice">${dice}</span>`}${o.n != null ? `<em>${o.n}</em>` : ''}</div>`;
}
const bidBox = (b, who) => `<div class="rtbid"><small>${esc(who != null ? t('r.ui.bidBy', { n: N(who) }) : t('r.ui.bid'))}</small>${A.bidHtml(b, 'bl')}</div>`;
const optBtns = (opts) => `<div class="rto">${opts.map((o, i) => `<button type="button" class="rtob" data-o="${i}">${o}</button>`).join('')}</div>`;
function choose(api, host, ans, okMsg, ngMsg) {
  let done = false;
  host.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
    if (done) return;
    if (+b.dataset.o === ans) { done = true; b.classList.add('right'); A.sfx('ok'); api.ok(esc(okMsg)); }
    else { b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 500); A.sfx('bad'); api.ng(esc(ngMsg)); }
  });
}
const PAGES = [
  { id: 'peek', setup(api, host) {
    const mine = [2, 2, 4, 5, 6];
    let open = false;
    const draw = () => { host.innerHTML = felt([1, 2, 3].map(p => seatRow({ p, dice: [], cup: true })).join('') + `<div class="rts me lgr"><span class="ava av0">${esc(N(0).slice(0, 1))}</span><b>${esc(N(0))}</b>${open ? `<span class="rdice">${mine.map(d => `<span class="rd">${Dice.img(d, 'rdi')}</span>`).join('')}</span>` : `<button type="button" class="rcup tap" id="rtCup" aria-label="cup"></button>`}</div>`); const c = host.querySelector('#rtCup'); if (c) c.onclick = () => { open = true; A.sfx('lift'); draw(); api.ok(esc(R('peek', 'ok'))); }; };
    draw();
  } },
  { id: 'bid', setup(api, host) {
    const mine = [2, 2, 4, 5, 6]; let q = 1, f = 0; let done = false;
    const draw = () => {
      host.innerHTML = felt(seatRow({ p: 0, dice: mine }) + `<div class="rtb"><div class="qsel"><button type="button" class="qb" data-d="-1">−</button><b>${q}</b><button type="button" class="qb" data-d="1">+</button></div><span class="xmul">×</span><div class="fsel">${[2, 3, 4, 5, 6].map(x => `<button type="button" class="fbtn${x === f ? ' sel' : ''}" data-f="${x}">${Dice.img(x, 'fb')}</button>`).join('')}</div><button type="button" class="abtn go" id="rtBid"${f ? '' : ' disabled'}>${esc(t('act.bid'))}</button></div><p class="rtn">${esc(t('dice.total', { n: 20 }))}</p>`);
      host.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { q = Math.max(1, Math.min(20, q + +b.dataset.d)); draw(); });
      host.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { f = +b.dataset.f; A.sfx('sel'); draw(); });
      host.querySelector('#rtBid').onclick = () => { if (done) return; if (f === 2 && q >= 2) { done = true; A.sfx('bid'); api.ok(esc(R('bid', 'ok', { q }))); } else { A.sfx('bad'); api.ng(esc(R('bid', 'ng'))); } };
    };
    draw();
  } },
  { id: 'raise', setup(api, host) {
    const prev = { q: 4, f: 3 }, ctx = { wild: false, raise: 'std', pal: false, lockFace: 0, prev, total: 20, opening: false };
    const opts = [{ q: 4, f: 2 }, { q: 3, f: 6 }, { q: 4, f: 5 }, { q: 3, f: 4 }];
    const ans = opts.findIndex(b => LD.legalBid(ctx, b.q, b.f));
    host.innerHTML = felt(bidBox(prev, 1) + optBtns(opts.map(b => A.bidHtml(b))));
    choose(api, host, ans, R('raise', 'ok'), R('raise', 'ng'));
  } },
  { id: 'dudo', setup(api, host) {
    const H = [[3, 4, 4, 6, 2], [4, 5, 2, 2, 6], [6, 6, 3, 5, 5], [4, 2, 3, 3, 5]], bid = { q: 6, f: 4 };
    const n = LD.countFace(H, 4, false);   // 4 fours: the bid is false
    host.innerHTML = felt(bidBox(bid, 2) + H.map((d, p) => seatRow({ p, dice: d, hl: 4 })).join('') + `<p class="rtn">${esc(R('dudo', 'q'))}</p>` + optBtns([esc(R('dudo', 'o0', { n: N(2) })), esc(R('dudo', 'o1', { n: N(0) }))]));
    choose(api, host, n >= bid.q ? 1 : 0, R('dudo', 'ok', { c: n }), R('dudo', 'ng', { c: n }));
  } },
  { id: 'wild', setup(api, host) {
    const H = [[1, 5, 5, 3, 2], [6, 1, 4, 5, 2], [3, 3, 6, 2, 4], [5, 1, 2, 6, 6]], f = 5;
    const n = LD.countFace(H, f, true);   // 4 fives + 3 ones = 7
    const opts = [n - 3, n - 1, n, n + 1];
    host.innerHTML = felt(bidBox({ q: 7, f }, 1) + H.map((d, p) => seatRow({ p, dice: d, hl: f, wild: true })).join('') + `<p class="rtn">${esc(R('wild', 'q'))}</p>` + optBtns(opts.map(x => `<b class="rtnum">${x}</b>`)));
    choose(api, host, 2, R('wild', 'ok', { c: n }), R('wild', 'ng', { c: n }));
  } },
  { id: 'toAce', setup(api, host) {
    const prev = { q: 7, f: 4 }, ans = LD.minQ({ wild: true, raise: 'std', prev, total: 20 }, 1);   // 4
    const opts = [{ q: 3, f: 1 }, { q: 4, f: 1 }, { q: 7, f: 1 }, { q: 8, f: 1 }];
    host.innerHTML = felt(bidBox(prev, 3) + `<p class="rtn">${esc(R('toAce', 'q'))}</p>` + optBtns(opts.map(b => A.bidHtml(b))));
    choose(api, host, opts.findIndex(b => b.q === ans), R('toAce', 'ok', { q: ans }), R('toAce', 'ng', { q: ans }));
  } },
  { id: 'fromAce', setup(api, host) {
    const prev = { q: 3, f: 1 }, ans = LD.minQ({ wild: true, raise: 'std', prev, total: 20 }, 5);   // 7
    const opts = [{ q: 4, f: 5 }, { q: 6, f: 5 }, { q: 7, f: 5 }, { q: 9, f: 5 }];
    host.innerHTML = felt(bidBox(prev, 1) + `<p class="rtn">${esc(R('fromAce', 'q'))}</p>` + optBtns(opts.map(b => A.bidHtml(b))));
    choose(api, host, opts.findIndex(b => b.q === ans), R('fromAce', 'ok', { q: ans }), R('fromAce', 'ng', { q: ans }));
  } },
  { id: 'win', setup(api, host) {
    const rows = [{ p: 0, n: 2 }, { p: 1, n: 0 }, { p: 2, n: 0 }, { p: 3, n: 0 }].map(o => `<button type="button" class="rtob rts-b" data-o="${o.p}"><span class="ava av${o.p}">${esc(N(o.p).slice(0, 1))}</span><b>${esc(N(o.p))}</b><span class="dl">${Array.from({ length: 5 }, (_, i) => `<i class="${i < o.n ? 'on' : ''}"></i>`).join('')}</span><em>${o.n}</em></button>`).join('');
    host.innerHTML = felt(`<div class="rto col">${rows}</div>`);
    choose(api, host, 0, R('win', 'ok'), R('win', 'ng'));
  } },
  { id: 'pal', setup(api, host) {
    const prev = { q: 2, f: 5 }, ctx = { wild: false, raise: 'std', pal: true, lockFace: 5, prev, total: 14, opening: false };
    const opts = [{ q: 2, f: 6 }, { q: 3, f: 5 }, { q: 1, f: 1 }, { q: 3, f: 4 }];
    host.innerHTML = felt(`<div class="rtpal">${esc(t('pal.round', { n: N(2) }))}</div>` + bidBox(prev, 2) + optBtns(opts.map(b => A.bidHtml(b))));
    choose(api, host, opts.findIndex(b => LD.legalBid(ctx, b.q, b.f)), R('pal', 'ok'), R('pal', 'ng'));
  } },
  { id: 'calza', setup(api, host) {
    const H = [[3, 3, 2, 6], [1, 4, 5, 2, 6], [3, 5, 5, 4, 2]], bid = { q: 4, f: 3 };
    const n = LD.countFace(H, 3, true);   // 3 threes + 1 one = 4: exact
    host.innerHTML = felt(bidBox(bid, 2) + H.map((d, p) => seatRow({ p, dice: d, hl: 3, wild: true })).join('') + `<p class="rtn">${esc(R('calza', 'q'))}</p>` + optBtns([esc(R('calza', 'o0')), esc(R('calza', 'o1'))]));
    choose(api, host, n === bid.q ? 0 : 1, R('calza', 'ok', { c: n }), R('calza', 'ng', { c: n }));
  } },
];
let tour = null;
function overview() {
  const f = String(t('r.facts')).split('|').filter(Boolean);
  return `<div class="rt-ov"><span class="rt-ov-art">${Dice.art('perudo')}</span><div class="rt-ov-t"><p>${esc(t('r.about'))}</p><ul>${f.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
}
function build() {
  if (tour) return tour;
  const m = document.createElement('div'); m.className = 'rt-mount'; $('#rulesBody').appendChild(m);
  const pages = [{ id: 'intro', title: () => esc(t('title')), body: () => '', html: () => overview() + RuleTour.intro({ img: IMG, origin: esc(t('r.origin')), players: esc(t('r.players')), time: esc(t('r.time')), history: esc(t('r.hist')), win: esc(t('r.howwin')), culture: esc(t('r.cult')), lang: A.LANG }) }];
  PAGES.forEach(P => pages.push({ id: P.id, title: () => esc(R(P.id, 't')), body: () => esc(R(P.id, 'b')), task: () => esc(R(P.id, 'task')),
    setup: api => { const b = api.board; b.innerHTML = ''; const host = document.createElement('div'); host.className = 'rth'; b.appendChild(host); P.setup(api, host); }, teardown() {} }));
  tour = RuleTour.create({ mount: m, store: 'aicoding-liarsdice-rules', lang: () => A.LANG, aspect: 1.15, sound: k => A.sfx(k),
    close: () => A.closeOv('#rulesOverlay'),
    lessons: () => { A.closeOv('#rulesOverlay'); window.LdLessons && LdLessons.open(); },
    play: () => { A.closeOv('#rulesOverlay'); },
    pages });
  tour.mount = m;
  return tour;
}
function tabs() {
  $('#rulesTabs').innerHTML = '';
  $('#rulesTop').innerHTML = `<button type="button" class="sel" data-top="rules">${esc(t('btn.rules'))}</button><button type="button" data-top="lessons">${esc(t('btn.lesson'))}</button>`;
  document.querySelector('#rulesTop [data-top="lessons"]').onclick = () => { if (tour) tour.stop(); window.LdLessons && LdLessons.open(); };
}
function open(page) {
  try { localStorage.setItem('aicoding-liarsdice-rules-seen', '1'); } catch (e) {}
  A.openOv('#rulesOverlay');
  requestAnimationFrame(() => { tabs(); build().open(page || 0); });
}
document.getElementById('btnRules').onclick = () => open();
document.getElementById('rulesOverlay').addEventListener('pointerdown', e => { if (e.target.id === 'rulesOverlay') { if (tour) tour.stop(); A.closeOv('#rulesOverlay'); } });
window.LdRules = { open, PAGES, relang() { if (document.getElementById('rulesOverlay').classList.contains('show')) { tabs(); tour.render(); } } };
})();
