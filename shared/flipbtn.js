// FlipBtn — 盤面反転 (turn the board round) for the 世界のボドゲ大全 board games (common spec).
//
// A button in the icon set, left of the sound button (#btnSound; it moves with the icon set into the PC header bar).
// The game keeps its own automatic orientation (e.g. your own pieces at the bottom); the button turns the board round on
// top of that. The choice is remembered per game (localStorage atlas-flip-<game>).
//
// Usage (after the DOM is built):
//   FlipBtn.init({ game: 'chess', lang: () => LANG, onChange: on => redrawBoard() });
//   FlipBtn.on()        // true while the board is turned round by the button: the game XORs it with its own orientation
//   FlipBtn.toggle()    // also bound to the F key (when no text field has the focus)
(function () {
'use strict';
const T = {
  ja: '盤面を反転', en: 'Flip the board', zh: '翻转棋盘', ko: '판 뒤집기', es: 'Girar el tablero', fr: 'Retourner le plateau',
  pt: 'Girar o tabuleiro', de: 'Brett drehen', hi: 'बोर्ड पलटें', ar: 'قلب اللوحة',
};
const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9a8 8 0 0 1 14.3-3.3"/><path d="M18.6 2.6v3.3h-3.3"/><path d="M20 15a8 8 0 0 1-14.3 3.3"/><path d="M5.4 21.4v-3.3h3.3"/><path d="M9.5 9.5h5v5h-5z"/></svg>';
const CSS = '.flip-btn.on{color:var(--accent,#d8b56a)!important;border-color:color-mix(in srgb,var(--accent,#d8b56a) 55%,transparent)!important;background:color-mix(in srgb,var(--accent,#d8b56a) 12%,transparent)!important}';
let O = null, state = false, btn = null;
const key = () => 'atlas-flip-' + O.game;
const lang = () => { const l = (O && O.lang && O.lang()) || document.documentElement.lang || 'ja'; return T[l] ? l : 'en'; };
function relabel() { if (!btn) return; const t = T[lang()]; btn.title = t; btn.setAttribute('aria-label', t); btn.classList.toggle('on', state); btn.setAttribute('aria-pressed', state ? 'true' : 'false'); }
function set(v) { state = !!v; try { localStorage.setItem(key(), state ? '1' : '0'); } catch (e) {} relabel(); if (O.onChange) O.onChange(state); }
function toggle() { set(!state); }
function init(o) {
  O = o; try { state = localStorage.getItem(key()) === '1'; } catch (e) {}
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const snd = document.getElementById('btnSound');
  btn = document.createElement('button'); btn.type = 'button'; btn.id = 'btnFlip';
  btn.className = (snd && snd.className ? snd.className : 'snd') + ' flip-btn';
  btn.innerHTML = ICON;
  btn.addEventListener('click', e => { e.preventDefault(); toggle(); });
  if (snd && snd.parentNode) snd.parentNode.insertBefore(btn, snd);
  else { const r = document.querySelector(o.mount || '.brand-r'); if (r) r.insertBefore(btn, r.firstChild); }
  document.addEventListener('keydown', e => {
    if (e.key !== 'f' && e.key !== 'F') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable)) return;
    toggle();
  });
  new MutationObserver(relabel).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  relabel();
  return window.FlipBtn;
}
window.FlipBtn = { init, on: () => state, set, toggle, relabel };
})();
