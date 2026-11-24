/* 掼蛋 — hands-on rules tutorial (guandan/rules.js)
   RuleTour pages: an intro (history / how to win / culture), then one page per idea with a small table where you pick seats,
   tap cards or select a combination and press Play. Every answer is checked with the real engine (engine.js).
   Tabs above the tour: Rules · Glossary (Chinese terms with pinyin, explained in your language) · ▶ the guided hand (tutorial.js).
   Texts: I18N keys 'r.*' and 'gl.*' (i18n.js / i18n-more.js). */
(function () {
'use strict';
const A = window.GdApp, GD = window.GD, $ = s => document.querySelector(s);
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
const SU = { S: 0, H: 1, D: 2, C: 3 };
function C(s) {
  const two = s.endsWith("'"); if (two) s = s.slice(0, -1);
  let b;
  if (s === 'SJ') b = 52; else if (s === 'BJ') b = 53;
  else { const su = SU[s.slice(-1)], r = s.slice(0, -1), rk = r === 'A' ? 1 : r === 'J' ? 11 : r === 'Q' ? 12 : r === 'K' ? 13 : +r; b = su * 13 + rk - 1; }
  return b + (two ? 54 : 0);
}
const CS = s => s ? s.trim().split(/\s+/).map(C) : [];
// the pages: m = mode (seat | tap | sel | opt), L = level, table / hand = cards, a = answer
const PAGES = [
  { id: 'team', m: 'seat', a: 2 },
  { id: 'order', m: 'tap', L: 2, hand: '9S AD SJ KC', a: 'SJ' },
  { id: 'combo1', m: 'sel', L: 2, hand: '8S 8D 8C KH KS 4D JC', ok: c => c.t === 'full' },
  { id: 'combo2', m: 'sel', L: 2, hand: '5S 5H 6D 6C 7S 7D 9C QH', ok: c => c.t === 'tube' },
  { id: 'follow', m: 'sel', L: 2, table: '9S 9D', hand: '7C 7D JS JH QD QC QS 4S 5D', ok: (c, tb) => GD.beats(c, tb) && c.t === 'pair' },
  { id: 'bomb', m: 'sel', L: 2, table: '10S JD QC KH AS', hand: '5S 5H 5D 5C 3S 8D 9C', ok: (c, tb) => GD.isBomb(c) && GD.beats(c, tb) },
  { id: 'bombs', m: 'opt', L: 2, table: '6H 7H 8H 9H 10H', opts: ["AS AD AC AH AS'", "3S 3D 3C 3H 3S' 3D'", 'KS KD KC KH'], a: 1 },
  { id: 'level', m: 'tap', L: 7, hand: 'AS KD 7C 10H', a: '7C' },
  { id: 'wild', m: 'sel', L: 7, hand: '3S 4D 6C 7S 7H KS 9D', ok: (c, tb, ids) => (c.t === 'straight' || c.t === 'sflush') && ids.includes(C('7H')) },
  { id: 'lead', m: 'seat', a: 0, story: true },
  { id: 'up', m: 'opt', optKeys: ['+3', '+2', '+1'], a: 1 },
  { id: 'trib', m: 'tap', L: 5, hand: 'AS KH 5H 5C 9D 3S', a: '5C' },
  { id: 'goA', m: 'opt', optKeys: ['o14', 'o13', 'o23'], a: 1 },
];
const IMG = '../images/icons/guandan.svg?v=1';
let tour = null, view = 'rules';
const R = (id, k) => t('r.' + id + '.' + k);
function overview() {
  const f = String(t('r.facts')).split('|').filter(Boolean);
  return `<div class="rt-ov"><span class="rt-ov-art">${A.gArt(2)}</span><div class="rt-ov-t"><p>${esc(t('r.about'))}</p><ul>${f.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
}
function sizeCards(box, cols, rows) {
  const W = box.clientWidth || 600, H = box.clientHeight || 420;
  const cw = Math.max(30, Math.min(88, W / (cols * 1.08 + .6), H / (rows * 1.4 * 1.32 + 1.4)));
  box.style.setProperty('--cw', cw.toFixed(1) + 'px'); box.style.setProperty('--chh', (cw * 1.4).toFixed(1) + 'px');
}
const card = (id, L, cls) => Cards.html(id, { L, cls: 'rc' + (cls ? ' ' + cls : ''), k: 'r' + id });
const row = (ids, L, cls) => `<span class="pkr-row">${ids.map(id => card(id, L, cls)).join('')}</span>`;
function setupPage(P, api) {
  const b = api.board, L = P.L || 2, N = A.NAMES();
  b.classList.add('felt-bg'); b.innerHTML = '';
  const host = document.createElement('div'); host.className = 'pkr gdr'; b.appendChild(host);
  let done = false;
  const good = () => { done = true; A.sfx('ok'); api.ok(esc(R(P.id, 'ok'))); };
  const bad = msg => { A.sfx('bad'); api.ng(esc(msg || R(P.id, 'ng'))); };
  if (P.m === 'seat') {
    // a small table: you at the bottom, the others counter-clockwise
    const pos = [[50, 86], [86, 50], [50, 14], [14, 50]];
    const story = P.story ? `<div class="gdr-story">${esc(R(P.id, 'story'))}</div>` : '';
    host.innerHTML = `<div class="pkr-tbl gdr-tbl"><div class="pkr-oval"></div>${pos.map(([x, y], s) => `<button type="button" class="pkr-seat gdr-seat t${s % 2}${P.story && s === 2 ? ' out' : ''}" data-s="${s}" style="left:${x}%;top:${y}%"><span class="av">${esc(N[s].slice(0, 1))}</span><em>${esc(N[s])}</em>${P.story && s === 2 ? `<i class="gdr-tag">${esc(t('place.0'))}</i>` : ''}</button>`).join('')}` +
      `<svg class="gdr-dir" viewBox="0 0 100 100" aria-hidden="true"><path d="M58 76 A 30 30 0 0 0 76 58" /><path d="M76 42 A 30 30 0 0 0 58 24"/><path d="M42 24 A 30 30 0 0 0 24 42"/><path d="M24 58 A 30 30 0 0 0 42 76"/></svg></div>${story}`;
    host.querySelectorAll('[data-s]').forEach(el => el.onclick = () => {
      if (done) return;
      if (+el.dataset.s === P.a) { el.classList.add('right'); good(); } else { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 500); bad(); }
    });
    return;
  }
  const hand = CS(P.hand), table = CS(P.table);
  const tb = table.length ? GD.identify(table, L).sort((x, y) => GD.tier(y) - GD.tier(x))[0] : null;
  const lvl = `<div class="gdr-lv"><small>${esc(t('lvl.now'))}</small><b>${esc(A.RKN(L))}</b></div>`;
  if (P.m === 'tap') {
    sizeCards(b, Math.max(5, hand.length + 1.5), 1.8);
    host.innerHTML = (P.L && P.L !== 2 || P.id === 'trib' ? lvl : '') + `<div class="pkr-me">${row(hand, P.L ? L : 0, 'pick-me')}</div>`;
    host.querySelectorAll('.cd').forEach(el => el.onclick = () => {
      if (done) return;
      if (+el.dataset.c === C(P.a)) { el.classList.add('pick'); good(); } else { el.classList.add('wrongc'); setTimeout(() => el.classList.remove('wrongc'), 500); bad(); }
    });
    return;
  }
  if (P.m === 'opt') {
    const opts = P.opts ? P.opts.map(CS) : null;
    sizeCards(b, opts ? 8 : 6, opts ? 3.4 : 2);
    const lab = i => P.optKeys ? esc(R(P.id, P.optKeys[i])) : esc(A.ctName(GD.identify(opts[i], L)[0]));
    host.innerHTML = (tb ? `<div class="pkr-board"><small>${esc(t('r.ui.table'))}</small>${row(table, L)}</div>` : '') + (P.optKeys ? `<p class="pkr-info">${esc(R(P.id, 'q'))}</p>` : '') +
      `<div class="pkr-opts${opts ? '' : ' h'} gdr-opts">${(opts || P.optKeys).map((o, i) => `<button type="button" class="pkr-opt" data-o="${i}">${opts ? `<span class="pkr-row gdr-mini">${opts[i].map(id => card(id, L)).join('')}</span>` : ''}<b>${lab(i)}</b></button>`).join('')}</div>`;
    host.querySelectorAll('[data-o]').forEach(el => el.onclick = () => {
      if (done) return;
      if (+el.dataset.o === P.a) { el.classList.add('right'); good(); } else { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 500); bad(); }
    });
    return;
  }
  // sel: pick cards, then Play
  sizeCards(b, Math.max(6, hand.length + 1), tb ? 3 : 2);
  const sel = new Set();
  const draw = () => {
    const ids = hand.filter(id => sel.has(id)), r = GD.identify(ids, L);
    const msg = !ids.length ? '' : r.length ? t('ab.ok', { c: A.ctName(r.sort((x, y) => GD.tier(y) - GD.tier(x))[0]) }) : t('ab.bad');
    host.innerHTML = (L !== 2 ? lvl : '') + (tb ? `<div class="pkr-board"><small>${esc(t('r.ui.table'))}</small>${row(table, L)}</div>` : '') +
      `<div class="pkr-me"><small>${esc(t('r.ui.hand'))}</small><span class="pkr-row">${hand.map(id => card(id, L, sel.has(id) ? 'pick' : '')).join('')}</span></div>` +
      `<p class="pkr-cnt">${esc(msg)}</p><div class="pkr-btns"><button type="button" class="abtn go" id="rtPlay"${ids.length ? '' : ' disabled'}>${esc(t('btn.play'))}</button></div>`;
    host.querySelectorAll('.pkr-me .cd').forEach(el => el.onclick = () => { if (done) return; const id = +el.dataset.c; if (sel.has(id)) sel.delete(id); else sel.add(id); A.sfx('sel'); draw(); });
    host.querySelector('#rtPlay').onclick = () => {
      if (done) return;
      const ids2 = hand.filter(id => sel.has(id)), rs = GD.identify(ids2, L);
      if (rs.some(c => P.ok(c, tb, ids2))) good(); else bad();
    };
  };
  draw();
}
function build() {
  if (tour) return tour;
  const m = document.createElement('div'); m.className = 'rt-mount'; $('#rulesBody').appendChild(m);
  const pages = [{ id: 'intro', title: () => esc(t('title')) + ` <small class="rt-py">guàndàn</small>`, body: () => '', html: () => overview() + RuleTour.intro({ img: IMG, origin: esc(t('r.origin')), players: esc(t('r.players')), time: esc(t('r.time')), history: esc(t('r.hist')), win: esc(t('r.win')), culture: esc(t('r.cult')), lang: A.LANG }) }];
  PAGES.forEach(P => pages.push({ id: P.id, title: () => esc(R(P.id, 't')), body: () => esc(R(P.id, 'b')), task: () => esc(R(P.id, 'task')), setup: api => setupPage(P, api), teardown() {} }));
  tour = RuleTour.create({ mount: m, store: 'aicoding-guandan-rules', lang: () => A.LANG, aspect: 1.45, sound: k => A.sfx(k),
    close: () => A.closeOv('#rulesOverlay'),
    lessons: () => { A.closeOv('#rulesOverlay'); window.GdLessons && GdLessons.open(); },
    play: () => { A.closeOv('#rulesOverlay'); },
    pages });
  tour.mount = m;
  return tour;
}
/* the glossary: Chinese terms with pinyin, explained in the reader's language */
const GLOSS = [['掼蛋', 'guàndàn', 'name'], ['级牌', 'jípái', 'level'], ['逢人配', 'féngrénpèi', 'wild'], ['炸弹', 'zhàdàn', 'bomb'], ['同花顺', 'tónghuāshùn', 'sflush'], ['四大天王', 'sìdà tiānwáng', 'kings'],
  ['顺子', 'shùnzi', 'straight'], ['三连对', 'sānliánduì', 'tube'], ['钢板', 'gāngbǎn', 'plate'], ['三带二', 'sān dài èr', 'full'], ['进贡', 'jìngòng', 'trib'], ['还贡', 'huángòng', 'ret'],
  ['抗贡', 'kànggòng', 'anti'], ['头游', 'tóuyóu', 'first'], ['末游', 'mòyóu', 'last'], ['双下', 'shuāngxià', 'double'], ['接风', 'jiēfēng', 'wind'], ['报牌', 'bàopái', 'report'], ['打A', 'dǎ A', 'playA'], ['升级', 'shēngjí', 'up']];
function glossHtml() {
  return `<div class="gl-list"><p class="lc-lead">${esc(t('gl.lead'))}</p>` + GLOSS.map(([zh, py, k]) => `<div class="gl-item"><span class="gl-zh" lang="zh-CN">${zh}</span><span class="gl-py">${py}</span><b>${esc(t('gl.' + k + '.n'))}</b><p>${esc(t('gl.' + k))}</p></div>`).join('') + `</div>`;
}
function tabs() {
  $('#rulesTabs').innerHTML = `<button type="button" data-v="rules" class="${view === 'rules' ? 'sel' : ''}">${esc(t('btn.rules'))}</button><button type="button" data-v="gloss" class="${view === 'gloss' ? 'sel' : ''}">${esc(t('gl.tab'))}</button>` +
    (window.GdTut ? `<button type="button" class="rv-tab-lesson" data-tut="1">▶ ${esc(t('tu.entry'))}</button>` : '');
  const tu = document.querySelector('#rulesTabs [data-tut]'); if (tu) tu.onclick = () => { if (tour) tour.stop(); A.closeOv('#rulesOverlay'); GdTut.start(); };
  document.querySelectorAll('#rulesTabs [data-v]').forEach(b => b.onclick = () => show(b.dataset.v));
  $('#rulesTop').innerHTML = `<button type="button" class="sel" data-top="rules">${esc(t('btn.rules'))}</button><button type="button" data-top="lessons">${esc(t('btn.lesson'))}</button>`;
  document.querySelector('#rulesTop [data-top="lessons"]').onclick = () => { if (tour) tour.stop(); window.GdLessons && GdLessons.open(); };
}
let glossEl = null;
function show(v, page) {
  view = v || 'rules'; tabs();
  const tr = build();
  if (!glossEl) { glossEl = document.createElement('div'); glossEl.className = 'gl-mount'; $('#rulesBody').appendChild(glossEl); }
  if (view === 'gloss') { tr.stop(); tr.mount.style.display = 'none'; glossEl.style.display = ''; glossEl.innerHTML = glossHtml(); }
  else { glossEl.style.display = 'none'; tr.mount.style.display = ''; tr.open(page || 0); }
}
function open(page) {
  try { localStorage.setItem('aicoding-guandan-rules-seen', '1'); } catch (e) {}
  A.openOv('#rulesOverlay');
  requestAnimationFrame(() => show('rules', page || 0));
}
document.addEventListener('dragstart', e => { if (e.target.closest && e.target.closest('img,.cd,svg')) e.preventDefault(); });
document.getElementById('btnRules').onclick = () => open();
document.getElementById('rulesOverlay').addEventListener('pointerdown', e => { if (e.target.id === 'rulesOverlay') { if (tour) tour.stop(); A.closeOv('#rulesOverlay'); } });
window.GdRules = { open, PAGES, C, relang() { if (document.getElementById('rulesOverlay').classList.contains('show')) { tabs(); if (view === 'gloss') glossEl.innerHTML = glossHtml(); else tour.render(); } } };
})();
