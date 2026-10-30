/* NgTabs — on phones the new-game dialog becomes a full-screen sheet like poker's: the settings scroll on top, then the
   action buttons (閉じる / 対局開始), then a tab bar at the very bottom:
     ゲーム (only when the game has variants: blocks marked data-ng="game", shown as cards with art + description)
     ルール (everything not marked; under its label the chosen variant's name)
     デザイン (blocks marked data-ng="design": board / pieces / colours, picked from their icons)
   Shared card styles for the ゲーム tab: .ngt-gcards > button.ngt-gcard[.sel] > .gart + b + p (+ .gpick).
   The variant's name for the ルール tab comes from the chosen card's <b> (or the chosen button / option text).
   A ゲーム block with class "hidden" (e.g. a mode that has no variants) drops the ゲーム tab until it is shown again.
   On PC (no tabs) the cards sit in the dialog: style="--ngt-cols:3" on .ngt-gcards sets the columns there.
   <script src="../shared/ngtabs.js?v=8"></script> after the dialog; nothing else to call. */
(function () {
'use strict';
const MQ = matchMedia('(pointer: coarse) and (max-width: 760px), (pointer: coarse) and (max-height: 560px)');
const L = {
  game: { ja: 'ゲーム', en: 'Game', zh: '游戏', ko: '게임', es: 'Juego', fr: 'Jeu', pt: 'Jogo', de: 'Spiel', hi: 'खेल', ar: 'اللعبة' },
  rules: { ja: 'ルール', en: 'Rules', zh: '规则', ko: '규칙', es: 'Reglas', fr: 'Règles', pt: 'Regras', de: 'Regeln', hi: 'नियम', ar: 'القواعد' },
  design: { ja: 'デザイン', en: 'Design', zh: '外观', ko: '디자인', es: 'Diseño', fr: 'Apparence', pt: 'Visual', de: 'Design', hi: 'डिज़ाइन', ar: 'التصميم' },
};
const CSS = `
.ngt-bar{display:none}
.ngt-foot{display:contents}
.ngt-on .ngt-hide, .modal.ngt-on .ngt-hide, .modal.ngt-on :is(.ng-cols,.ng-col).ngt-hide{display:none!important}
/* the sheet (like poker on phones) */
#newOverlay:has(> .modal.ngt-on){padding:0!important;align-items:stretch!important;justify-content:stretch!important}
#newOverlay > .modal.ngt-on{--ngt-g:6px;width:100vw!important;max-width:none!important;height:100dvh!important;max-height:100dvh!important;margin:0!important;border:0!important;border-radius:0!important;
  padding:10px 12px 0!important;display:flex!important;flex-direction:column!important;overflow-y:auto!important;overscroll-behavior:contain}
#newOverlay > .modal.ngt-on > *{flex-shrink:0}
.modal.ngt-on h2{margin:0 0 var(--ngt-g)!important;font-size:17px!important}
.modal.ngt-on .field{margin:0 0 var(--ngt-g)!important}
.modal.ngt-on :is(.ng-cols,.ng-col){display:block!important;margin:0!important;padding:0!important;gap:0!important}
/* the footer: buttons, then the tabs at the very bottom (stays put; the settings above scroll) */
.modal.ngt-on > .ngt-note{order:8;margin:var(--ngt-g) 0 0!important;text-align:center!important}
/* the credits sit at the very bottom of the settings box, right above the buttons */
.modal.ngt-on > .ngt-note:not(.ngt-hide):not(.ngt-note:not(.ngt-hide) ~ .ngt-note){margin-top:auto!important;padding-top:var(--ngt-g)}
.modal.ngt-on:has(> .ngt-note:not(.ngt-hide)) > .ngt-foot{margin-top:0!important}
.modal.ngt-on > .ngt-foot{order:9}
.modal.ngt-on .ngt-foot{display:block;position:sticky;bottom:0;z-index:4;margin:auto -12px 0;padding:0;background:inherit}
.modal.ngt-on .ngt-foot > :not(.ngt-bar){margin-left:12px!important;margin-right:12px!important}
.modal.ngt-on .modal-actions{margin-top:8px!important;margin-bottom:0!important}
.modal.ngt-on .ngt-foot .ngt-bar{display:flex;gap:4px;margin:8px 0 0!important;padding:0 6px env(safe-area-inset-bottom);border-top:1px solid var(--line,rgba(255,255,255,.14));background:rgba(0,0,0,.25)}
.ngt-bar button{flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:48px;padding:9px 6px 10px;border:0;border-top:2px solid transparent;border-radius:0;background:none;box-shadow:none;color:var(--muted,#aaa);font:inherit;font-size:13.5px;font-weight:600;letter-spacing:.08em;white-space:nowrap;cursor:pointer;-webkit-tap-highlight-color:transparent}
.ngt-bar button small{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;font-size:10.5px;font-weight:400;letter-spacing:.02em;color:var(--muted,#aaa);opacity:.8}
.ngt-bar button small:empty{display:none}
.ngt-bar button.sel{color:var(--text,#eee);border-top-color:var(--accent,#d8b56a)}
/* ゲーム tab: variant cards (art, name, short description) */
.ngt-gcards{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.ngt-gcard{position:relative;display:flex;flex-direction:column;align-items:stretch;gap:4px;padding:8px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.14));background:rgba(0,0,0,.22);color:var(--text,#eee);font:inherit;text-align:start;cursor:pointer;min-width:0;-webkit-tap-highlight-color:transparent}
.ngt-gcard .gart{display:flex;align-items:center;justify-content:center;min-height:64px;padding:4px 0}
.ngt-gcard .gart svg,.ngt-gcard .gart img{max-width:100%;max-height:72px}
.ngt-gcard b{font-size:15px;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ngt-gcard p{margin:0;font-size:11px;line-height:1.5;color:var(--muted,#aaa)}
.ngt-gcard .gpick{position:absolute;top:6px;right:6px;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;color:#111;background:transparent}
.ngt-gcard.sel{border-color:var(--accent,#d8b56a);background:color-mix(in srgb, var(--accent,#d8b56a) 12%, rgba(0,0,0,.22))}
.ngt-gcard.sel .gpick{background:var(--accent,#d8b56a)}
.ngt-gcard.sel .gpick::after{content:'✓'}
.ngt-gcard .gart svg{width:64px;height:64px}
.ngt-gcard .gtag{display:inline-block;margin-inline-end:5px;padding:0 6px;border-radius:999px;border:1px solid color-mix(in srgb, var(--accent,#d8b56a) 55%, transparent);color:var(--accent,#d8b56a);font-size:10px;line-height:1.5;vertical-align:1px}
.ngt-gcard:hover{border-color:color-mix(in srgb, var(--accent,#d8b56a) 60%, transparent)}
@media (min-width: 600px){ .modal:not(.ngt-on) .ngt-gcards{grid-template-columns:repeat(var(--ngt-cols,2),minmax(0,1fr));gap:10px}
  .modal:not(.ngt-on) .ngt-gcard{padding:10px 12px}.modal:not(.ngt-on) .ngt-gcard p{font-size:11.5px} }
`;
const lang = () => (document.documentElement.lang || 'ja').slice(0, 2);
const isSel = b => b.classList.contains('sel') || b.classList.contains('on') || b.classList.contains('active') || b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-checked') === 'true';
function init() {
  const ov = document.getElementById('newOverlay'), modal = ov && ov.querySelector('.modal');
  if (!modal || !modal.querySelector('[data-ng=design], [data-ng=game]')) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const hasGame = () => { const g = modal.querySelector('[data-ng=game]'); return !!g && !g.classList.contains('hidden'); };
  const bar = document.createElement('div'); bar.className = 'ngt-bar'; bar.setAttribute('role', 'tablist');
  // footer: the last action buttons and anything after them, then the tabs
  const acts = [...modal.querySelectorAll('.modal-actions')].pop();
  const foot = document.createElement('div'); foot.className = 'ngt-foot';
  if (acts && acts.parentNode === modal) {
    // credits / notes under the buttons go to the bottom of the settings (above the buttons; CSS order), not into the fixed footer
    for (let n = acts.nextElementSibling; n; n = n.nextElementSibling) n.classList.add('ngt-note');
    modal.insertBefore(foot, acts); foot.appendChild(acts);
  } else if (acts && acts.parentNode) { acts.parentNode.insertBefore(foot, acts); for (let n = acts; n; ) { const nx = n.nextSibling; foot.appendChild(n); n = nx; } }
  else modal.appendChild(foot);
  foot.appendChild(bar);
  const tabs = () => (hasGame() ? ['game'] : []).concat(['rules'].concat(modal.querySelector('[data-ng=design]') ? ['design'] : []));
  let cur = hasGame() ? 'game' : 'rules';
  // the chosen variant's name (under ルール)
  const gameName = () => {
    const g = modal.querySelector('[data-ng=game]'); if (!g) return '';
    const card = [...g.querySelectorAll('.ngt-gcard')].find(isSel); if (card) { const b = card.querySelector('b'); return (b ? b.textContent : card.textContent).trim(); }
    const btn = [...g.querySelectorAll('button')].find(isSel); if (btn) return btn.textContent.trim();
    const s = g.querySelector('select'); return s && s.selectedOptions[0] ? s.selectedOptions[0].text.trim() : '';
  };
  function mark() {
    modal.querySelectorAll('.ngt-hide').forEach(e => e.classList.remove('ngt-hide'));
    if (!MQ.matches) return;
    if (cur === 'rules') { modal.querySelectorAll('[data-ng=design], [data-ng=game]').forEach(e => e.classList.add('ngt-hide')); return; }
    // ゲーム / デザイン: only that tab's blocks (and the boxes that hold them), the title and the footer
    const sel = `[data-ng=${cur}]`;
    const walk = parent => [...parent.children].forEach(el => {
      if (el.matches(sel) || el === foot || (el.classList.contains('ngt-note') && !el.matches('[data-ng]')) || el.tagName === 'H2' || el.matches('script,style')) return;
      if (el.querySelector(sel)) { walk(el); return; }
      el.classList.add('ngt-hide');
    });
    walk(modal);
  }
  // a tab's own credit (data-ng-credit, e.g. the piece images' licence) joins the credits at the bottom of the box on phones
  const credits = [...modal.querySelectorAll('[data-ng-credit]')].map(el => ({ el, home: el.parentNode, next: el.nextSibling }));
  function placeCredits(on) {
    credits.forEach(c => {
      if (on) { if (c.el.parentNode !== modal) { c.el.classList.add('ngt-note'); modal.insertBefore(c.el, modal.querySelector(':scope > .ngt-note') || foot); } }
      else if (c.el.parentNode === modal) { c.el.classList.remove('ngt-note'); c.home.insertBefore(c.el, c.next && c.next.parentNode === c.home ? c.next : null); }
    });
  }
  function sync() {
    const on = MQ.matches; modal.classList.toggle('ngt-on', on); placeCredits(on);
    const ks = tabs(); if (!ks.includes(cur)) cur = ks[0];
    const l = lang(), gn = gameName();
    const h = ks.map(k => `<button type="button" role="tab" data-ngt="${k}"><span></span>${k === 'rules' && ks.includes('game') ? '<small></small>' : ''}</button>`).join('');
    if (bar.dataset.h !== h) { bar.dataset.h = h; bar.innerHTML = h; }
    bar.querySelectorAll('[data-ngt]').forEach(b => {
      const k = b.dataset.ngt, t = L[k][l] || L[k].en, s = b.querySelector('span'), sm = b.querySelector('small');
      if (s.textContent !== t) s.textContent = t; if (sm && sm.textContent !== gn) sm.textContent = gn;
      b.classList.toggle('sel', k === cur); b.setAttribute('aria-selected', k === cur ? 'true' : 'false');
    });
    mark();
  }
  // each tab keeps its own scroll position while the dialog is open
  let tabTop = {};
  bar.addEventListener('click', e => { const b = e.target.closest('[data-ngt]'); if (!b || b.dataset.ngt === cur) return; tabTop[cur] = modal.scrollTop; cur = b.dataset.ngt; sync(); modal.scrollTop = tabTop[cur] || 0; });
  // opens on the first tab; the variant's name follows the choice
  new MutationObserver(() => { const show = ov.classList.contains('show'); if (show && !ov.__ngtShown) { tabTop = {}; cur = tabs()[0]; sync(); modal.scrollTop = 0; } ov.__ngtShown = show; }).observe(ov, { attributes: true, attributeFilter: ['class'] });
  const g = modal.querySelector('[data-ng=game]');
  // (the block shown / hidden → the tabs; otherwise only the name; sync() itself toggles .ngt-hide on the block, so compare first)
  let tk = tabs().join();
  if (g) new MutationObserver(() => { const k = tabs().join(); if (k !== tk) { tk = k; sync(); return; } const n = gameName(), sm = bar.querySelector('small'); if (sm && sm.textContent !== n) sm.textContent = n; }).observe(g, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-pressed', 'aria-checked'] });
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  if (MQ.addEventListener) MQ.addEventListener('change', sync); else MQ.addListener(sync);
  sync();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
