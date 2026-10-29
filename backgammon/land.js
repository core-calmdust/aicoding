// Backgammon V2 — phone landscape layout (html.lnd): the phone held sideways, or the CSS-rotated page (html.rot) on a
// phone held upright. One slim top row (title · menu · icons at the right end), the board on the left, a compact tab
// rail at the right edge of the board and a side panel (about 1/3 of the screen) with the chosen box: コーチ / 形勢 /
// 棋譜 / 戦績 / オンライン. The players' names and pip counts sit on the board (in the bear-off tray); status messages
// ("あなたの番です" …) fade in and out over the board instead of taking a box. The boxes are moved into the panel while
// the layout is on and put back (same place in the page) when it goes off, so every other layout stays as it was.
// Loaded after app.js / online-ui.js (shares their globals: ROT, landPhone, lrect, updateGeom, mtab …).
'use strict';
(() => {
const SHORT = {
  ja: ['コーチ', '形勢', '棋譜', '戦績', 'オンライン'], en: ['Coach', 'Eval', 'Moves', 'Record', 'Online'],
  zh: ['教练', '形势', '棋谱', '战绩', '在线'], ko: ['코치', '형세', '기보', '전적', '온라인'],
  es: ['Guía', 'Eval.', 'Jugadas', 'Historial', 'En línea'], fr: ['Coach', 'Éval.', 'Coups', 'Bilan', 'En ligne'],
  pt: ['Treino', 'Aval.', 'Lances', 'Histórico', 'Online'], de: ['Coach', 'Bew.', 'Züge', 'Bilanz', 'Online'],
  hi: ['कोच', 'स्थिति', 'चालें', 'रिकॉर्ड', 'ऑनलाइन'], ar: ['المدرب', 'التقييم', 'النقلات', 'السجل', 'أونلاين'],
};
const TABS = ['coach', 'eval', 'kifu', 'rec', 'online'];
const IC = {
  coach: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/>',
  eval: '<path d="M4 19h16"/><path d="M6 15l4-4 3 3 5-6"/>',
  kifu: '<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  rec: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/>',
  online: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>',
};
const KEY = 'aicoding-backgammon-v2-lndtab';
const $ = s => document.querySelector(s);
const html = document.documentElement, body = document.body;
let active = false, tab = 'coach', moved = [];
try { const v = localStorage.getItem(KEY); if (['coach', 'eval', 'kifu'].includes(v)) tab = v; } catch (e) {}
const app = $('.app');
const mk = (tag, id) => { const e = document.createElement(tag); e.id = id; return e; };
const top = mk('div', 'lndTop'), rail = mk('nav', 'lndRail'), panel = mk('div', 'lndPanel');
rail.setAttribute('aria-label', 'tabs');
rail.innerHTML = TABS.map(k => `<button type="button" data-lt="${k}"><svg viewBox="0 0 24 24">${IC[k]}</svg><span></span></button>`).join('');
const chips = [mk('div', 'lndPl0'), mk('div', 'lndPl1')], msg = mk('div', 'lndMsg');
chips.forEach(c => { c.className = 'lnd-pl'; });
const want = () => !!((ROT || landPhone()) && !html.classList.contains('atlas-skin') && !window.__EMBED);

function enter() {
  const put = (el, host) => { if (!el) return; const ph = document.createComment('lnd'); el.parentNode.insertBefore(ph, el); moved.push([el, ph]); host.appendChild(el); };
  app.append(top, rail, panel);
  put($('.brand-l'), top); put($('.controls'), top); put($('.brand-r'), top);
  for (const s of ['#lessonCard', '#puzzleCard', '#hintCard', '#coachCard', '#reviewCard', '#evalCard', '.kifu-card']) put($(s), panel);
  const fr = $('#frame'); fr.append(chips[0], chips[1], msg);
  html.classList.add('lnd');
  html.style.setProperty('--lnd-h', (ROT ? innerWidth : innerHeight) + 'px');
}
function leave() {
  html.classList.remove('lnd');
  for (const [el, ph] of moved.reverse()) { ph.parentNode.insertBefore(el, ph); ph.remove(); }
  moved = [];
  top.remove(); rail.remove(); panel.remove(); chips.forEach(c => c.remove()); msg.remove();
  body.classList.remove('lnd-rec');
  if (body.classList.contains('mtab-online') && typeof mtab === 'function') { /* the online tab stays as the phone's own */ }
}
function sync() {
  const w = want();
  if (w !== active) { active = w; if (w) enter(); else leave(); }
  if (active) { relabel(); select(); requestAnimationFrame(place); }
}
// panel rectangle for the fixed boxes (online dock, record dialog, move navigation)
function place() {
  if (!active) return;
  html.style.setProperty('--lnd-h', (ROT ? innerWidth : innerHeight) + 'px');
  const r = lrect(panel), a = lrect(app), st = html.style;
  st.setProperty('--lnd-pl', Math.round(r.left - a.left + (app.offsetLeft || 0)) + 'px'); st.setProperty('--lnd-pt', Math.round(r.top - a.top + (app.offsetTop || 0)) + 'px');
  st.setProperty('--lnd-pw', Math.round(r.width) + 'px'); st.setProperty('--lnd-ph', Math.round(r.height) + 'px');
}
function relabel() {
  const l = (typeof LANG !== 'undefined' && SHORT[LANG]) ? LANG : 'en';
  rail.querySelectorAll('button').forEach((b, i) => {
    const s = b.querySelector('span'), v = SHORT[l][i];
    if (s.textContent !== v) { s.textContent = v; b.title = v; b.setAttribute('aria-label', v); b.classList.remove('ic-only'); }
  });
  // a label that does not fit even on two lines: icon only (the title / aria-label keep the name)
  requestAnimationFrame(() => rail.querySelectorAll('button:not(.ic-only) span').forEach(s => { if (s.scrollWidth > s.clientWidth + 1 || s.scrollHeight > s.clientHeight + 1) s.parentNode.classList.add('ic-only'); }));
}
function select() {
  const ck = body.classList.contains('ck-tab');
  if (tab === 'coach' && !ck) tab = 'eval';
  const onl = body.classList.contains('mtab-online'), rec = body.classList.contains('lnd-rec');
  if (body.dataset.lt !== tab) body.dataset.lt = tab;
  rail.querySelectorAll('button').forEach(b => {
    const k = b.dataset.lt, sel = rec ? k === 'rec' : onl ? k === 'online' : k === tab;
    b.classList.toggle('sel', sel);
    b.hidden = (k === 'coach' && !ck) || (k === 'online' && body.classList.contains('no-online'));
  });
}
rail.addEventListener('click', e => {
  const b = e.target.closest('button[data-lt]'); if (!b) return;
  const k = b.dataset.lt;
  if (k === 'rec') { if (window.GameRecord) { body.classList.add('lnd-rec'); place(); GameRecord.open(); } select(); return; }
  if (window.GameRecord && body.classList.contains('lnd-rec')) GameRecord.close();
  if (k === 'online') { place(); if (typeof mtab === 'function') mtab('online'); select(); return; }
  if (body.classList.contains('mtab-online') && typeof mtab === 'function') mtab('game');
  tab = k; try { localStorage.setItem(KEY, k); } catch (er) {}
  select(); panel.scrollTop = 0;
});
// the record dialog closed: back to the tab
new MutationObserver(() => { const ov = $('.grc-ov'); if (ov && !ov.classList.contains('show') && body.classList.contains('lnd-rec')) { body.classList.remove('lnd-rec'); select(); } })
  .observe(body, { subtree: true, attributes: true, attributeFilter: ['class'] });
new MutationObserver(() => { if (active) select(); }).observe(body, { attributes: true, attributeFilter: ['class'] });
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
window.BGLand = { sync, info, say, place, get on() { return active; } };
sync(); if (active) { updateGeom(); try { renderInfo(); } catch (e) {} }
})();
