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
.ngt-on .ngt-bar{display:flex;gap:6px;position:sticky;bottom:0;z-index:3;margin:10px -4px 0;padding:6px 4px;background:inherit;border-top:1px solid var(--line,rgba(255,255,255,.12))}
.ngt-bar button{flex:1 1 0;display:flex;align-items:center;justify-content:center;gap:7px;min-height:40px;border-radius:11px;border:1px solid var(--line,rgba(255,255,255,.14));background:rgba(0,0,0,.25);color:var(--muted,#aaa);font:inherit;font-size:14px;font-weight:700;white-space:nowrap;cursor:pointer;-webkit-tap-highlight-color:transparent}
.ngt-bar button svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.ngt-bar button.sel{color:var(--text,#eee);border-color:color-mix(in srgb, var(--accent,#d8b56a) 60%, transparent);background:color-mix(in srgb, var(--accent,#d8b56a) 14%, rgba(0,0,0,.25))}
.ngt-bar button.sel svg{stroke:var(--accent,#d8b56a)}
.ngt-on .ngt-hide{display:none!important}
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
  let cur = 'rules';
  const keep = el => el === bar || el.tagName === 'H2' || el.classList.contains('modal-actions') || el.contains(bar) && false;
  function mark() {
    modal.querySelectorAll('.ngt-hide').forEach(e => e.classList.remove('ngt-hide'));
    if (!MQ.matches) return;
    if (cur === 'rules') { modal.querySelectorAll('[data-ng=design]').forEach(e => e.classList.add('ngt-hide')); return; }
    // design: keep the design blocks (and the boxes that hold them), the title, the tabs and the action buttons
    const walk = parent => [...parent.children].forEach(el => {
      if (el.matches('[data-ng=design]') || keep(el) || el.matches('script,style')) return;
      if (el.querySelector('[data-ng=design]') || el.contains(bar) || el.querySelector('.modal-actions')) { walk(el); return; }
      el.classList.add('ngt-hide');
    });
    walk(modal);
  }
  function sync() {
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
