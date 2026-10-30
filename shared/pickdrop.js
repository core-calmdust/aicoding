/* PickDrop — on phones, long rows of choice buttons in the new-game dialog become custom dropdowns.
   The original buttons stay in the page (hidden) and keep all of the game's logic: the dropdown shows a copy of
   the chosen button, and choosing an entry clicks the original. Converted automatically inside #newOverlay:
   - every .seg with 4 or more buttons
   - any group marked data-pd (e.g. colour swatches, board skins), whatever its size
   The list opens in place (pushes the content down), so it also works in a turned (rotated) page.
   <script src="../shared/pickdrop.js?v=1"></script> after the dialog markup; nothing else to call. */
(function () {
'use strict';
const MQ = matchMedia('(pointer: coarse) and (max-width: 760px), (pointer: coarse) and (max-height: 560px)');
const CSS = `
.pd-on{display:none!important}
.pd-sel{display:none!important}
.pd{position:relative;width:100%}
.pd-btn{display:flex;align-items:center;gap:10px;width:100%;min-height:42px;box-sizing:border-box;padding:6px 12px;border-radius:11px;border:1px solid var(--line,rgba(255,255,255,.14));background:rgba(0,0,0,.25);color:var(--text,#eee);font:inherit;font-size:14px;text-align:start;cursor:pointer;-webkit-tap-highlight-color:transparent}
.pd-btn .pd-cur{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pd-btn .pd-chev{flex:none;width:18px;height:18px;fill:none;stroke:var(--muted,#aaa);stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s}
.pd.open .pd-btn{border-color:color-mix(in srgb, var(--accent,#d8b56a) 60%, transparent)}
.pd.open .pd-chev{transform:rotate(180deg)}
.pd-list{display:grid;grid-template-rows:0fr;transition:grid-template-rows .22s ease;margin-top:0}
.pd.open .pd-list{grid-template-rows:1fr;margin-top:6px}
.pd-list > div{min-height:0;overflow:hidden;border-radius:11px;border:1px solid transparent;background:rgba(0,0,0,.32)}
.pd.open .pd-list > div{border-color:var(--line,rgba(255,255,255,.14))}
.pd-opt{display:flex;align-items:center;gap:10px;width:100%;min-height:42px;box-sizing:border-box;padding:6px 12px;border:0;border-top:1px solid var(--line,rgba(255,255,255,.08));background:none;color:var(--text,#eee);font:inherit;font-size:14px;text-align:start;cursor:pointer;-webkit-tap-highlight-color:transparent}
.pd-opt:first-child{border-top:0}
.pd-opt .pd-lb{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pd-opt .pd-ck{flex:none;width:16px;height:16px;fill:none;stroke:var(--accent,#d8b56a);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;visibility:hidden}
.pd-opt.sel{background:color-mix(in srgb, var(--accent,#d8b56a) 12%, transparent)}
.pd-opt.sel .pd-ck{visibility:visible}
.pd-opt:disabled,.pd-opt.dis{opacity:.4}
.pd :is(.pd-cur,.pd-lb) > *{flex:none;margin:0!important;position:static!important;transform:none!important}
.pd :is(.pd-cur,.pd-lb) svg{width:18px;height:18px}
.pd :is(.pd-cur,.pd-lb) [class*=sw],.pd :is(.pd-cur,.pd-lb) [class*=disc],.pd :is(.pd-cur,.pd-lb) [class*=chip]{width:22px;height:22px}
`;
const CHEV = '<svg class="pd-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
const CK = '<svg class="pd-ck" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const isSel = b => b.classList.contains('on') || b.classList.contains('sel') || b.classList.contains('active') || b.classList.contains('selected') || b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-checked') === 'true';
const visible = b => !b.hidden && b.style.display !== 'none' && !b.classList.contains('hidden');
// the content of a choice: its own markup (icons, swatches, text); a choice with no text gets its title / aria-label as the text
function content(b) {
  const c = b.cloneNode(true);
  c.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
  let h = c.innerHTML.trim();
  const txt = (b.textContent || '').trim(), name = b.getAttribute('aria-label') || b.title || b.dataset.name || '';
  if (!txt && name) h += `<span>${name.replace(/[&<>"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]))}</span>`;
  return h || (b.dataset.v || '');
}
const all = [];
function make(group) {
  if (group.__pd) return;
  const d = document.createElement('div'); d.className = 'pd';
  d.innerHTML = `<button type="button" class="pd-btn" aria-haspopup="listbox" aria-expanded="false"><span class="pd-cur"></span>${CHEV}</button><div class="pd-list"><div role="listbox"></div></div>`;
  group.parentNode.insertBefore(d, group.nextSibling);
  const btn = d.firstChild, list = d.querySelector('[role=listbox]');
  const o = { group, d, btn, list, sig: '' };
  group.__pd = o; all.push(o);
  btn.addEventListener('click', e => { e.stopPropagation(); const open = !d.classList.contains('open'); closeAll(); if (open) { d.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); } });
  list.addEventListener('click', e => {
    const op = e.target.closest('.pd-opt'); if (!op) return; e.stopPropagation();
    const src = o.items[+op.dataset.i]; if (src && !src.disabled) src.click();
    closeAll(); sync(o);
  });
  new MutationObserver(() => sync(o)).observe(group, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-pressed', 'aria-checked', 'disabled', 'hidden', 'style', 'title'] });
  sync(o);
}
function sync(o) {
  const items = [...o.group.children].filter(b => b.tagName === 'BUTTON' && (o.group.classList.contains('pd-sel') || visible(b)));
  o.items = items;
  const sig = items.map(b => (isSel(b) ? '1' : '0') + (b.disabled ? 'd' : '') + b.innerHTML + (b.title || '')).join('|');
  if (o.sel) o.d.style.display = MQ.matches && !o.sel.disabled && getComputedStyle(o.sel.parentNode).display !== 'none' ? '' : 'none';
  if (sig === o.sig) return; o.sig = sig;
  const cur = items.find(isSel);
  o.btn.querySelector('.pd-cur').innerHTML = cur ? content(cur) : '—';
  o.list.innerHTML = items.map((b, i) => `<button type="button" role="option" class="pd-opt${isSel(b) ? ' sel' : ''}${b.disabled ? ' dis' : ''}" data-i="${i}" aria-selected="${isSel(b)}"><span class="pd-lb">${content(b)}</span>${CK}</button>`).join('');
}
function closeAll() { all.forEach(o => { o.d.classList.remove('open'); o.btn.setAttribute('aria-expanded', 'false'); }); }
function apply() {
  const on = MQ.matches;
  all.forEach(o => {
    const src = o.sel || o.group, shown = !o.sel || (o.sel.offsetParent !== null || o.sel.classList.contains('pd-on'));
    src.classList.toggle('pd-on', on); o.d.style.display = on && shown ? '' : 'none';
  });
  if (!on) closeAll();
}
// a native <select> gets the same dropdown: a hidden row of stand-in buttons mirrors its options
function fromSelect(sel) {
  if (sel.__pdg) return;
  const g = document.createElement('div'); g.className = 'pd-sel'; g.hidden = true; sel.__pdg = g;
  sel.parentNode.insertBefore(g, sel.nextSibling);
  const fill = () => {
    const h = [...sel.options].map((o, i) => `<button type="button" data-i="${i}" class="${o.selected ? 'on' : ''}"${o.disabled ? ' disabled' : ''}></button>`).join('');
    if (g.dataset.h !== h + sel.value + [...sel.options].map(o => o.text).join()) {
      g.innerHTML = h; [...g.children].forEach((b, i) => { b.textContent = sel.options[i].text; b.onclick = () => { sel.selectedIndex = i; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); fill(); }; });
      g.dataset.h = h + sel.value + [...sel.options].map(o => o.text).join();
    }
  };
  fill(); sel.addEventListener('change', fill);
  new MutationObserver(fill).observe(sel, { childList: true, subtree: true, attributes: true, characterData: true });
  setInterval(() => { if (sel.offsetParent || g.__pd) fill(); }, 800);   // value set from script (no event)
  make(g); g.__pd.sel = sel;
}
function scan() {
  const ov = document.getElementById('newOverlay'); if (!ov) return;
  ov.querySelectorAll('select').forEach(fromSelect);
  ov.querySelectorAll('.seg, [data-pd]').forEach(g => {
    if (g.__pd) return;
    const n = [...g.children].filter(b => b.tagName === 'BUTTON').length;
    if (g.hasAttribute('data-pd') ? n >= 2 : n >= 4) make(g);
  });
  apply();
}
function init() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  scan();
  // groups filled later by the game (colour swatches…) and the dialog opening
  const ov = document.getElementById('newOverlay');
  if (ov) new MutationObserver(() => { scan(); if (!ov.classList.contains('show')) closeAll(); }).observe(ov, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('click', e => { if (!e.target.closest || !e.target.closest('.pd')) closeAll(); });
  if (MQ.addEventListener) MQ.addEventListener('change', apply); else MQ.addListener(apply);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
window.PickDrop = { scan, closeAll };
})();
