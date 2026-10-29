'use strict';
// Phone landscape (also the turned page of the "landscape on a phone held upright" option): the info boxes become tabs.
// A compact tab rail at the right edge of the board (コーチ / 形勢 / 棋譜 / 戦績 / オンライン) and a side panel of about a third
// of the screen that shows the chosen box. The boxes are moved into the panel while this layout is on and put back in
// their places when it is left (PC / portrait keep their own layouts). 戦績 opens the record dialog; オンライン shows the
// online dock in the panel. Labels are never cut: a label that does not fit its tab is hidden (the tab keeps its aria-label).
(() => {
const MQ = matchMedia('(min-aspect-ratio: 1/1) and (pointer: coarse) and (max-height: 560px), (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-width: 900px)');
const KEY = 'mancala-landtab';
const ICON = {
  coach: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/></svg>',
  eval: '<svg viewBox="0 0 24 24"><path d="M4 19h16"/><path d="M6 15l4-4 3 3 5-6"/></svg>',
  kifu: '<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  rec: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>',
  online: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/></svg>',
};
const ONL = { ja: 'オンライン', en: 'Online', zh: '在线', ko: '온라인', es: 'En línea', fr: 'En ligne', pt: 'Online', de: 'Online', hi: 'ऑनलाइन', ar: 'أونلاين' };
const REC = { ja: '戦績', en: 'Record', zh: '战绩', ko: '전적', es: 'Historial', fr: 'Bilan', pt: 'Histórico', de: 'Bilanz', hi: 'रिकॉर्ड', ar: 'السجل' };
const $ = s => document.querySelector(s);
let rail = null, panel = null, on = false, cur = 'coach', saved = false, homes = [];
try { const v = localStorage.getItem(KEY); if (v === 'coach' || v === 'eval' || v === 'kifu') { cur = v; saved = true; } } catch (e) {}
const lang = () => (typeof LANG !== 'undefined' ? LANG : (document.documentElement.lang || 'ja').slice(0, 2));
const boxes = () => [['coach', $('#coachCard')], ['coach', $('#reviewCard')], ['eval', $('#evalCard')], ['kifu', $('.kifu-card')], ['ls', $('.lesson-card')], ['ls', $('.puzzle-card')]].filter(x => x[1]);
const coachOk = () => document.body.classList.contains('ck-tab');
function label(k) {
  const l = lang();
  if (k === 'coach') return window.MancalaCoach ? MancalaCoach.tx('head') : 'Coach';
  if (k === 'eval') return typeof t === 'function' ? t('eval') : 'Eval';
  if (k === 'kifu') return typeof t === 'function' ? t('kifu') : 'Moves';
  if (k === 'rec') return REC[l] || REC.en;
  return ONL[l] || ONL.en;
}
function build() {
  rail = document.createElement('nav'); rail.id = 'ltRail'; rail.setAttribute('role', 'tablist');
  rail.innerHTML = ['coach', 'eval', 'kifu', 'rec', 'online'].map(k => `<button type="button" data-lt="${k}">${ICON[k]}<span></span></button>`).join('');
  panel = document.createElement('div'); panel.id = 'ltPanel';
  rail.addEventListener('click', e => {
    const b = e.target.closest('[data-lt]'); if (!b) return;
    const k = b.dataset.lt;
    if (k === 'rec') { if (window.GameRecord) GameRecord.open(); return; }
    if (k === 'online') { if (typeof mtab === 'function') mtab(document.body.classList.contains('mtab-online') ? 'game' : 'online'); sync(); return; }
    if (document.body.classList.contains('mtab-online') && typeof mtab === 'function') mtab('game');
    cur = k; saved = true; try { localStorage.setItem(KEY, k); } catch (er) {}
    sync(); panel.scrollTop = 0;
  });
  relabel();
}
function relabel() {
  if (!rail) return;
  rail.querySelectorAll('[data-lt]').forEach(b => {
    const s = b.querySelector('span'), l = label(b.dataset.lt);
    if (s.textContent !== l) s.textContent = l;
    b.setAttribute('aria-label', l); b.title = l;
  });
  fit();
}
// a label that does not fit the rail is hidden (never cut off)
function fit() {
  if (!rail || !on) return;
  rail.querySelectorAll('[data-lt] span').forEach(s => { s.style.display = ''; if (s.scrollWidth > s.parentNode.clientWidth - 2) s.style.display = 'none'; });
}
function sync() {
  if (!on) return;
  if (cur === 'coach' && !coachOk()) cur = 'eval';
  const online = document.body.classList.contains('mtab-online');
  rail.querySelectorAll('[data-lt]').forEach(b => {
    const k = b.dataset.lt, sel = online ? k === 'online' : k === cur;
    b.classList.toggle('sel', sel); b.setAttribute('aria-selected', sel ? 'true' : 'false');
    if (k === 'coach') b.hidden = !coachOk();
    if (k === 'online') b.hidden = document.body.classList.contains('no-online');
  });
  if (document.body.dataset.lt !== cur) document.body.dataset.lt = cur;
}
function enter() {
  if (on) return; on = true;
  if (!rail) build();
  homes = boxes().map(([k, el]) => ({ el, parent: el.parentNode, next: el.nextSibling, k }));
  const app = $('.app');
  app.appendChild(rail); app.appendChild(panel);
  for (const h of homes) { h.el.dataset.ltc = h.k; panel.appendChild(h.el); }
  document.body.classList.add('lt-on');
  if (!saved && coachOk()) cur = 'coach';
  sync(); refit();
}
function leave() {
  if (!on) return; on = false;
  for (const h of homes.slice().reverse()) { delete h.el.dataset.ltc; h.parent.insertBefore(h.el, h.next && h.next.parentNode === h.parent ? h.next : null); }
  homes = [];
  rail.remove(); panel.remove();
  document.body.classList.remove('lt-on'); delete document.body.dataset.lt;
  refit();
}
function refit() {
  try { fixW = 0; fixSize(); } catch (e) {}
  setTimeout(() => { try { layout(); } catch (e) {} fit(); }, 30);
}
function check() { if (MQ.matches && !document.documentElement.classList.contains('atlas-skin')) enter(); else leave(); }
// the coach tab appears / the review opens: show the coach tab
let ckWas = coachOk(), rvWas = false;
new MutationObserver(() => {
  const a = coachOk(), rv = !!$('#reviewCard.show');
  if ((a && !ckWas && !saved) || (rv && !rvWas)) cur = 'coach';
  ckWas = a; rvWas = rv; sync();
}).observe(document.body, { attributes: true, attributeFilter: ['class'] });
{ const rc = $('#reviewCard'); if (rc) new MutationObserver(() => { const rv = rc.classList.contains('show'); if (rv && !rvWas) cur = 'coach'; rvWas = rv; sync(); }).observe(rc, { attributes: true, attributeFilter: ['class'] }); }
new MutationObserver(relabel).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
if (MQ.addEventListener) MQ.addEventListener('change', check); else MQ.addListener(check);
addEventListener('resize', () => fit());
check();
window.LandTabs = { on: () => on, sync, relabel };
})();
