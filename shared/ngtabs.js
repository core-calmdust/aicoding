/* NgTabs — on phones the new-game dialog is split into two tabs at its bottom: ルール (how the game is played)
   and デザイン (board / pieces / colours — picked from their icons). A game marks its look fields with data-ng="design"
   (on the .field / block); everything else in the dialog is the ルール tab. Header (h2) and the action buttons stay.
   <script src="../shared/ngtabs.js?v=1"></script> after the dialog; nothing else to call. */
(function () {
'use strict';
const MQ = matchMedia('(pointer: coarse) and (max-width: 760px), (pointer: coarse) and (max-height: 560px)');
const L = {
  rules: { ja: 'ルール', en: 'Rules', zh: '规则', ko: '규칙', es: 'Reglas', fr: 'Règles', pt: 'Regras', de: 'Regeln', hi: 'नियम', ar: 'القواعد' },
  design: { ja: 'デザイン', en: 'Design', zh: '外观', ko: '디자인', es: 'Diseño', fr: 'Apparence', pt: 'Visual', de: 'Design', hi: 'डिज़ाइन', ar: 'التصميم' },
};
const IC = {
  rules: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  design: '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4-4-7.4-9-7.4z"/><circle cx="7.5" cy="11.5" r="1.2"/><circle cx="10.5" cy="7.5" r="1.2"/><circle cx="15" cy="7.8" r="1.2"/></svg>',
};
const CSS = `
.ngt-bar{display:none}
/* tabs, not buttons: a line across the dialog, the chosen tab lit with a bar on that line */
.ngt-on .ngt-bar{display:flex;gap:0;margin:0!important;padding:0;background:inherit;border-top:1px solid var(--line,rgba(255,255,255,.14))}
.ngt-bar button{flex:1 1 0;position:relative;display:flex;align-items:center;justify-content:center;gap:7px;min-height:42px;padding:0 6px;border:0;border-radius:0;background:none;box-shadow:none;color:var(--muted,#aaa);font:inherit;font-size:14px;font-weight:700;white-space:nowrap;cursor:pointer;-webkit-tap-highlight-color:transparent}
.ngt-bar button svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.ngt-bar button.sel{color:var(--text,#eee)}
.ngt-bar button.sel svg{stroke:var(--accent,#d8b56a)}
.ngt-bar button.sel::before{content:'';position:absolute;top:-1px;left:18%;right:18%;height:3px;border-radius:0 0 3px 3px;background:var(--accent,#d8b56a)}
.ngt-on .ngt-hide, .modal.ngt-on .ngt-hide, .modal.ngt-on :is(.ng-cols,.ng-col).ngt-hide{display:none!important}
/* one spacing everywhere (the gap between two rows of settings): between the blocks, around the tabs and inside the frame */
.modal.ngt-on{--ngt-g:6px;padding:12px!important}
/* the dialog sits at the bottom of the screen, so the tabs and the buttons stay in the same place whichever tab is open */
#newOverlay:has(> .modal.ngt-on){align-items:flex-end!important;padding-bottom:max(10px, env(safe-area-inset-bottom))!important}
#newOverlay > .modal.ngt-on{margin-top:auto!important;margin-bottom:0!important}
.modal.ngt-on h2{margin:0 0 var(--ngt-g)!important}
.modal.ngt-on .field{margin:0 0 var(--ngt-g)!important}
.modal.ngt-on :is(.ng-cols,.ng-col){display:block!important;margin:0!important;padding:0!important;gap:0!important}
.ngt-foot{display:contents}
.modal.ngt-on .ngt-foot{display:block;position:sticky;bottom:-12px;z-index:4;margin:var(--ngt-g) -12px -12px;padding:0 12px 12px;background:inherit}
.modal.ngt-on .ngt-foot .ngt-bar{position:static!important;margin:0!important}
.modal.ngt-on .modal-actions{margin:var(--ngt-g) 0 0!important}
`;
const lang = () => (document.documentElement.lang || 'ja').slice(0, 2);
function init() {
  const ov = document.getElementById('newOverlay'), modal = ov && ov.querySelector('.modal');
  if (!modal || !modal.querySelector('[data-ng=design]')) return;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const bar = document.createElement('div'); bar.className = 'ngt-bar'; bar.setAttribute('role', 'tablist');
  bar.innerHTML = ['rules', 'design'].map(k => `<button type="button" role="tab" data-ngt="${k}">${IC[k]}<span></span></button>`).join('');
  // the bar sits right above the action buttons (or at the end of the dialog)
  const acts = [...modal.querySelectorAll('.modal-actions')].pop();
  if (acts && acts.parentNode) acts.parentNode.insertBefore(bar, acts); else modal.appendChild(bar);
  // the tabs, the buttons and any note under them form one footer that stays at the bottom of the dialog
  const foot = document.createElement('div'); foot.className = 'ngt-foot';
  bar.parentNode.insertBefore(foot, bar);
  for (let n = bar; n; ) { const nx = n.nextSibling; foot.appendChild(n); n = nx; }
  let cur = 'rules';
  const keep = el => el === bar || el.tagName === 'H2' || el.classList.contains('modal-actions') || el.contains(bar) && false;
  function mark() {
    modal.querySelectorAll('.ngt-hide').forEach(e => e.classList.remove('ngt-hide'));
    if (!MQ.matches) return;
    if (cur === 'rules') { modal.querySelectorAll('[data-ng=design]').forEach(e => e.classList.add('ngt-hide')); return; }
    // design: keep the design blocks (and the boxes that hold them), the title, the tabs and the action buttons
    const walk = parent => [...parent.children].forEach(el => {
      if (el.matches('[data-ng=design]') || keep(el) || el.matches('script,style')) return;
      if (bar.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) return;   // (notes under the buttons stay, so the tabs don't move)
      if (el.querySelector('[data-ng=design]') || el.contains(bar) || el.querySelector('.modal-actions')) { walk(el); return; }
      el.classList.add('ngt-hide');
    });
    walk(modal);
  }
  const acts2 = () => [...modal.querySelectorAll('.modal-actions')].pop();
  const ah = () => { const a = acts2(); if (a) modal.style.setProperty('--ngt-ah', a.offsetHeight + 'px'); };
  if (window.ResizeObserver && acts2()) new ResizeObserver(ah).observe(acts2());
  function sync() {
    ah();
    const on = MQ.matches; modal.classList.toggle('ngt-on', on);
    const l = lang();
    bar.querySelectorAll('[data-ngt]').forEach(b => { const k = b.dataset.ngt, t = L[k][l] || L[k].en, s = b.querySelector('span'); if (s.textContent !== t) s.textContent = t; b.classList.toggle('sel', k === cur); b.setAttribute('aria-selected', k === cur ? 'true' : 'false'); });
    mark();
  }
  bar.addEventListener('click', e => { const b = e.target.closest('[data-ngt]'); if (!b || b.dataset.ngt === cur) return; cur = b.dataset.ngt; sync(); modal.scrollTop = 0; });
  // the dialog opens on ルール
  new MutationObserver(() => { const show = ov.classList.contains('show'); if (show && !ov.__ngtShown) { cur = 'rules'; sync(); } ov.__ngtShown = show; }).observe(ov, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  if (MQ.addEventListener) MQ.addEventListener('change', sync); else MQ.addListener(sync);
  sync();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
