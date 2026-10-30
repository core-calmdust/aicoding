// Backgammon V2 — phone landscape layout (html.lnd): the phone held sideways, or the CSS-rotated page (html.rot) on a
// phone held upright. One slim top row (title · menu · icons at the right end), the board as large as it fits and a tab
// rail at the right edge. A tab opens a drawer that slides in from the right over the board with the chosen box:
// コーチ / 形勢・棋譜 (one page: a slim graph, the moves below) / レッスン (rules · lessons · puzzles) / 戦績 / オンライン.
// Tap the tab again, tap the board or swipe right to close it; swipe left from the right edge to open it (it follows the finger).
// The players' names and pip counts sit on the board (in the bear-off tray); status messages ("あなたの番です" …) fade in
// and out over the board. The boxes are moved into the drawer while the layout is on and put back when it goes off, so
// the portrait and PC layouts stay as they were.
// Loaded after app.js / online-ui.js (shares their globals: ROT, landPhone, lrect, lp, updateGeom, mtab, t …).
'use strict';
(() => {
const SHORT = {
  ja: ['コーチ', '形勢・棋譜', 'ルール\nレッスン', '戦績', 'オンライン'], en: ['Coach', 'Eval · Moves', 'Rules\nLessons', 'Record', 'Online'],
  zh: ['教练', '形势·棋谱', '规则\n课程', '战绩', '在线'], ko: ['코치', '형세·기보', '규칙\n레슨', '전적', '온라인'],
  es: ['Guía', 'Eval. · Jugadas', 'Reglas\nLecciones', 'Historial', 'En línea'], fr: ['Coach', 'Éval. · Coups', 'Règles\nLeçons', 'Bilan', 'En ligne'],
  pt: ['Treino', 'Aval. · Lances', 'Regras\nLições', 'Histórico', 'Online'], de: ['Coach', 'Bew. · Züge', 'Regeln\nLektionen', 'Bilanz', 'Online'],
  hi: ['कोच', 'स्थिति · चालें', 'नियम\nपाठ', 'रिकॉर्ड', 'ऑनलाइन'], ar: ['المدرب', 'التقييم · النقلات', 'القواعد\nالدروس', 'السجل', 'أونلاين'],
};
const TABS = ['coach', 'kifu', 'learn', 'rec', 'online'];
const IC = {
  coach: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/>',
  kifu: '<path d="M4 19h16"/><path d="M6 15l4-4 3 3 5-6"/><path d="M5 4h7"/>',
  learn: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/><path d="M22 9v6"/>',
  rec: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  online: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>',
};
const KEY = 'aicoding-backgammon-v2-lndtab';
const $ = s => document.querySelector(s);
const html = document.documentElement, body = document.body;
let active = false, tab = 'coach', moved = [], open = false;
try { const v = localStorage.getItem(KEY); if (['coach', 'kifu', 'learn'].includes(v)) tab = v; } catch (e) {}
const app = $('.app');
const mk = (tag, id) => { const e = document.createElement(tag); e.id = id; return e; };
const top = mk('div', 'lndTop'), rail = mk('nav', 'lndRail'), drawer = mk('div', 'lndDrawer'), learn = mk('div', 'lndLearn');
rail.setAttribute('aria-label', 'tabs');
rail.innerHTML = TABS.map(k => `<button type="button" data-lt="${k}"><svg viewBox="0 0 24 24">${IC[k]}</svg><span></span></button>`).join('');
// レッスン tab: rules · lessons · puzzles (the same actions as the menu buttons; lessons / puzzles leave the top menu here)
const LEARN = [['#btnRules', 'btn.rules'], ['#btnLesson', 'btn.lesson'], ['#btnPuzzle', 'btn.puzzle']];
learn.innerHTML = LEARN.map(([id]) => { const b = $(id), sv = b && b.querySelector('svg'); return `<button type="button" data-go="${id}">${sv ? sv.outerHTML : ''}<span></span></button>`; }).join('');
learn.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (!b) return; const src = $(b.dataset.go); close(); if (src) src.click(); });
const chips = [mk('div', 'lndPl0'), mk('div', 'lndPl1')], msg = mk('div', 'lndMsg');
chips.forEach(c => { c.className = 'lnd-pl'; });
// move navigation (|< < ▶ > >|): a compact box at the bottom centre of the board that mirrors the game's own #navBar
const nbox = mk('div', 'lndNav'); nbox.className = 'navbar';
{ const nv = $('#navBar'); if (nv) nbox.innerHTML = nv.innerHTML; nbox.querySelectorAll('[id]').forEach(el => el.removeAttribute('id')); }
nbox.addEventListener('click', e => {
  const b = e.target.closest('button[data-n]'), nv = $('#navBar'); if (!b || !nv) return;
  const r = nv.querySelector(`button[data-n="${b.dataset.n}"]`); if (r && !r.disabled) r.click();
});
// shown while there are moves to step through (as the phone strip of infotabs.js: a filled move list, not on the online screen)
function navSync() {
  const nav = $('#navBar'), k = $('#kifu');
  const has = !!k && k.children.length > 0 && !k.querySelector(':scope > .empty');
  const show = active && !!nav && has && !body.classList.contains('mtab-online');
  if (body.classList.contains('lnd-nav') !== show) body.classList.toggle('lnd-nav', show);
  if (!nav) return;
  nav.querySelectorAll('button[data-n]').forEach(b => {
    const c = nbox.querySelector(`button[data-n="${b.dataset.n}"]`); if (!c) return;
    if (c.disabled !== b.disabled) c.disabled = b.disabled;
    const pl = b.classList.contains('playing'); if (c.classList.contains('playing') !== pl) c.classList.toggle('playing', pl);
    if (b.title && c.title !== b.title) c.title = b.title;
  });
}
const want = () => !!((ROT || landPhone()) && !html.classList.contains('atlas-skin') && !window.__EMBED);

function enter() {
  const put = (el, host) => { if (!el) return; const ph = document.createComment('lnd'); el.parentNode.insertBefore(ph, el); moved.push([el, ph]); host.appendChild(el); };
  app.append(top, rail, drawer, nbox);
  put($('.brand-l'), top); put($('.controls'), top); put($('.brand-r'), top);
  drawer.appendChild(learn);
  for (const s of ['#lessonCard', '#puzzleCard', '#hintCard', '#coachCard', '#reviewCard', '#evalCard', '.kifu-card']) put($(s), drawer);
  const fr = $('#frame'); fr.append(chips[0], chips[1], msg);
  html.classList.add('lnd');
  html.style.setProperty('--lnd-h', (ROT ? innerWidth : innerHeight) + 'px');
}
function leave() {
  setOpen(false);
  html.classList.remove('lnd');
  for (const [el, ph] of moved.reverse()) { ph.parentNode.insertBefore(el, ph); ph.remove(); }
  moved = [];
  top.remove(); rail.remove(); drawer.remove(); nbox.remove(); body.classList.remove('lnd-nav'); learn.remove(); chips.forEach(c => c.remove()); msg.remove();
}
function sync() {
  const w = want();
  if (w !== active) { active = w; if (w) enter(); else leave(); }
  if (active) { relabel(); select(); requestAnimationFrame(place); }
  navSync();
}
// the drawer's rectangle (in the page's own frame) for the boxes that are fixed elsewhere: online dock, record dialog, move navigation
function place() {
  if (!active) return;
  const st = html.style;
  st.setProperty('--lnd-h', (ROT ? innerWidth : innerHeight) + 'px');
  const tp = lrect(top), a = lrect(app);
  st.setProperty('--lnd-dt', Math.round(tp.top - a.top + tp.height + 6) + 'px');
  // (measured without the slide: the drawer's own box minus its transform)
  const pt = drawer.style.transform, ptr = drawer.style.transition; drawer.style.transition = 'none'; drawer.style.transform = 'none';
  const r = lrect(drawer); drawer.style.transform = pt; void drawer.offsetWidth; drawer.style.transition = ptr;
  st.setProperty('--lnd-dl', Math.round(r.left - a.left) + 'px'); st.setProperty('--lnd-dw', Math.round(r.width) + 'px'); st.setProperty('--lnd-dh', Math.round(r.height) + 'px');
}
function relabel() {
  const l = (typeof LANG !== 'undefined' && SHORT[LANG]) ? LANG : 'en';
  rail.querySelectorAll('button').forEach((b, i) => {
    const s = b.querySelector('span'), v = SHORT[l][i];
    if (s.textContent !== v) { s.textContent = v; b.title = v; b.setAttribute('aria-label', v); b.classList.remove('ic-only'); }
  });
  learn.querySelectorAll('button').forEach((b, i) => { const v = typeof t === 'function' ? t(LEARN[i][1]) : ''; const s = b.querySelector('span'); if (s.textContent !== v) s.textContent = v; });
  // a label that does not fit even on two lines: icon only (the title / aria-label keep the name)
  requestAnimationFrame(() => rail.querySelectorAll('button:not(.ic-only) span').forEach(s => { if (s.scrollWidth > s.clientWidth + 2 || s.scrollHeight > s.clientHeight + 3) s.parentNode.classList.add('ic-only'); }));
}
const lessonOn = () => body.classList.contains('in-lesson') || body.classList.contains('in-puzzle');
function select() {
  const ck = body.classList.contains('ck-tab');
  if (tab === 'coach' && !ck) tab = 'kifu';
  if (lessonOn() && (tab === 'coach' || tab === 'kifu')) tab = 'learn';
  const onl = body.classList.contains('mtab-online'), rec = body.classList.contains('lnd-rec');
  if (body.dataset.lt !== tab) body.dataset.lt = tab;
  rail.querySelectorAll('button').forEach(b => {
    const k = b.dataset.lt, sel = rec ? k === 'rec' : onl ? k === 'online' : open && k === tab;
    b.classList.toggle('sel', sel);
    b.hidden = (k === 'coach' && !ck) || (k === 'online' && body.classList.contains('no-online'));
  });
}
function setOpen(v) {
  open = !!v;
  body.classList.toggle('lnd-open', open);
  if (!open) {
    if (window.GameRecord && body.classList.contains('lnd-rec')) GameRecord.close();
    body.classList.remove('lnd-rec');
    if (body.classList.contains('mtab-online') && typeof mtab === 'function') mtab('game');
  }
  if (active) select();
}
function close() { setOpen(false); }
function show(k) {
  place();
  if (k === 'rec') { if (body.classList.contains('mtab-online') && typeof mtab === 'function') mtab('game'); if (window.GameRecord) { body.classList.add('lnd-rec'); GameRecord.open(); } open = false; body.classList.remove('lnd-open'); select(); return; }
  if (window.GameRecord && body.classList.contains('lnd-rec')) { GameRecord.close(); body.classList.remove('lnd-rec'); }
  if (k === 'online') { const was = body.classList.contains('mtab-online'); open = false; body.classList.remove('lnd-open'); if (typeof mtab === 'function') mtab(was ? 'game' : 'online'); select(); return; }   // the same tab again closes it
  if (body.classList.contains('mtab-online') && typeof mtab === 'function') mtab('game');
  tab = k; try { localStorage.setItem(KEY, k); } catch (er) {}
  setOpen(true); drawer.scrollTop = 0;
}
rail.addEventListener('click', e => {
  const b = e.target.closest('button[data-lt]'); if (!b) return;
  if (b.classList.contains('sel')) { close(); return; }   // the same tab again: close
  show(b.dataset.lt);
});
// tap on the board while a box is out: close it (the tap does not move a checker)
const anyOpen = () => open || body.classList.contains('lnd-rec') || body.classList.contains('mtab-online');
document.addEventListener('pointerdown', e => {
  if (!active || !anyOpen() || !e.target.closest('.board-area')) return;
  e.stopPropagation(); e.preventDefault(); close();
  const stop = ev => { ev.stopPropagation(); ev.preventDefault(); };
  document.addEventListener('click', stop, { capture: true, once: true });
}, true);
// swipes: right on the drawer closes it, left from the right edge (the rail) opens it — the drawer follows the finger
let sw = null;
const P = e => { const q = e.touches ? e.touches[0] || e.changedTouches[0] : e; return lp(q); };
document.addEventListener('touchstart', e => {
  if (!active || e.touches.length !== 1) return;
  const [x, y] = P(e), W = ROT ? innerHeight : innerWidth;
  const inDrawer = open && e.target.closest('#lndDrawer'), edge = !open && !lessonOn() && (x > W - 80) && !e.target.closest('#lndTop');
  if (!inDrawer && !edge) return;
  sw = { x, y, open: !!inDrawer, dx: 0, live: false, w: drawer.offsetWidth || 300 };
}, { passive: true, capture: true });
document.addEventListener('touchmove', e => {
  if (!sw) return;
  const [x, y] = P(e), dx = x - sw.x, dy = y - sw.y;
  if (!sw.live) { if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.3) { if (Math.abs(dy) > 14) sw = null; return; } sw.live = true; body.classList.add('lnd-drag'); }
  sw.dx = dx;
  const off = sw.open ? Math.max(0, dx) : Math.max(0, sw.w + 76 + Math.min(0, dx));
  drawer.style.transform = `translateX(${off}px)`;
  if (e.cancelable) e.preventDefault();   // the page must not pan under the finger
}, { passive: false, capture: true });
document.addEventListener('touchend', () => {
  if (!sw) return;
  const s = sw; sw = null;
  if (!s.live) return;
  body.classList.remove('lnd-drag'); drawer.style.transform = '';
  if (s.open && s.dx > 60) close();
  else if (!s.open && s.dx < -50) show(tab);
}, { capture: true });
// the record dialog / online closed from inside: back to normal
new MutationObserver(() => { const ov = $('.grc-ov'); if (ov && !ov.classList.contains('show') && body.classList.contains('lnd-rec')) { body.classList.remove('lnd-rec'); select(); } })
  .observe(body, { subtree: true, attributes: true, attributeFilter: ['class'] });
let wasLesson = false;
new MutationObserver(() => {
  if (!active) return;
  const ls = lessonOn();
  if (ls && !wasLesson) { tab = 'learn'; setOpen(true); }   // a lesson / puzzle starts: its card is in the レッスン drawer
  if (!ls && wasLesson && tab === 'learn') setOpen(false);
  wasLesson = ls; select();
}).observe(body, { attributes: true, attributeFilter: ['class'] });
{ const k = $('#kifu'), nv = $('#navBar');
  if (k) new MutationObserver(navSync).observe(k, { childList: true });
  if (nv) new MutationObserver(navSync).observe(nv, { subtree: true, attributes: true, attributeFilter: ['disabled', 'class', 'title'] }); }
new MutationObserver(navSync).observe(body, { attributes: true, attributeFilter: ['class'] });
new MutationObserver(() => { if (active) relabel(); }).observe(html, { attributes: true, attributeFilter: ['lang'] });
addEventListener('resize', () => requestAnimationFrame(place));

// players on the board: name, pips (and the match score) in the bear-off tray, the top / bottom player as on the board
function info() {
  if (!active || typeof G === 'undefined') return;
  const v = typeof view !== 'undefined' ? view : 0;
  [[1 - v, 0], [v, 1]].forEach(([s, bot]) => {
    const c = chips[bot], nm = $('#name' + s + ' .ns'), pip = $('#pip' + s), sc = $('#score' + s), pl = $('#pl' + s);
    const h = `<i class="pdisc p${s}"></i><b>${pip ? pip.textContent : ''}</b><span>${nm ? esc(nm.textContent) : ''}</span>${sc && sc.textContent.trim() ? `<em>${esc(sc.textContent.trim())}</em>` : ''}`;
    if (c.dataset.h !== h) { c.dataset.h = h; c.innerHTML = h; }
    c.classList.toggle('bot', !!bot); c.classList.toggle('on', !!(pl && pl.classList.contains('active'))); c.classList.toggle('won', !!(pl && pl.classList.contains('won')));
    c.style.left = `calc(var(--u) * ${(G.TX + G.TW / 2).toFixed(3)})`;
    c.style.top = `calc(var(--u) * ${(bot ? G.MID + 0.12 : G.MID - 0.12).toFixed(3)})`;
  });
}
// status messages: a small toast that fades in and out over the board
let msgT = 0, last = '';
function say(txt) {
  if (!active || !txt || txt === last) { last = txt || last; return; }
  last = txt; msg.textContent = txt; msg.classList.add('show');
  clearTimeout(msgT); msgT = setTimeout(() => msg.classList.remove('show'), 2400);
}
window.BGLand = { sync, info, say, place, show, close, get on() { return active; }, get open() { return open; } };
sync(); if (active) { updateGeom(); try { renderInfo(); } catch (e) {} }
})();
