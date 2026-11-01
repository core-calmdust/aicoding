// Language picker — turns the game's native <select id="langSel"> into an in-page menu (common to every game page).
// The <select> stays in the page (hidden): the game keeps reading .value and listening to "change"; picking a language
// here sets .value and fires "change". Code that sets .value is followed too (the button label updates).
// Usage: <script src="../shared/langsel.js?v=1" defer></script>  (after the game's own scripts)
(function () {
'use strict';
const CSS = `
.lsel{position:relative;display:inline-flex;flex:none}
.lsel-btn{display:inline-flex;align-items:center;gap:6px;cursor:pointer;white-space:nowrap;font:inherit;-webkit-tap-highlight-color:transparent}
.lsel-btn svg{width:15px;height:15px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;opacity:.85}
.lsel-btn .lsel-ch{width:11px;height:11px;opacity:.6;transition:transform .15s}
.lsel-btn[aria-expanded=true] .lsel-ch{transform:rotate(180deg)}
.lsel-btn span{overflow:hidden;text-overflow:ellipsis}
.lsel-c{display:none;font-weight:700;letter-spacing:.04em}
@media (max-width:760px){.lsel-btn .lsel-n{display:none}.lsel-btn .lsel-c{display:inline}.lsel-btn{gap:4px;max-width:none!important}}
.lsel-pop{position:fixed;z-index:1000;min-width:180px;max-height:min(70vh,440px);overflow-y:auto;padding:6px;border-radius:14px;
  background:var(--panel2,var(--panel,#1b1d22));color:var(--text,#eee);border:1px solid var(--line,rgba(255,255,255,.14));
  box-shadow:0 18px 44px rgba(0,0,0,.5),0 2px 8px rgba(0,0,0,.3);opacity:0;transform:translateY(-4px) scale(.98);transform-origin:top right;transition:opacity .14s,transform .14s;pointer-events:none;scrollbar-width:thin}
.lsel-pop.on{opacity:1;transform:none;pointer-events:auto}
.lsel-pop button{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;padding:9px 12px;border:0;border-radius:9px;background:none;color:inherit;font:inherit;font-size:14px;text-align:start;cursor:pointer}
.lsel-pop button small{font-size:11px;opacity:.5;letter-spacing:.06em;text-transform:uppercase}
.lsel-pop button:hover,.lsel-pop button:focus-visible{background:rgba(255,255,255,.08);outline:none}
.lsel-pop button.on{background:rgba(255,255,255,.12);font-weight:700}
.lsel-pop button.on small::after{content:' ✓';opacity:1}
`;
const GLOBE = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/></svg>';
const CHEV = '<svg class="lsel-ch" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>';
function enhance(sel) {
  if (!sel || sel.dataset.lsel || sel.hidden || sel.getAttribute('aria-hidden') === 'true') return;
  sel.dataset.lsel = '1';
  if (!document.getElementById('lselCss')) { const st = document.createElement('style'); st.id = 'lselCss'; st.textContent = CSS; document.head.appendChild(st); }
  // the button takes over the select's look (each game styles #langSel its own way)
  const cs = getComputedStyle(sel), wrap = document.createElement('span'), btn = document.createElement('button');
  wrap.className = 'lsel'; btn.type = 'button'; btn.className = 'lsel-btn';
  btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', sel.getAttribute('aria-label') || 'Language');
  ['height', 'minHeight', 'borderRadius', 'border', 'background', 'color', 'fontSize', 'fontFamily', 'fontWeight', 'paddingLeft', 'paddingRight', 'boxShadow', 'maxWidth', 'letterSpacing'].forEach(k => { btn.style[k] = cs[k]; });
  btn.style.paddingLeft = Math.max(8, parseFloat(cs.paddingLeft) || 0) + 'px'; btn.style.paddingRight = Math.max(8, parseFloat(cs.paddingRight) || 0) + 'px';
  sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(btn); wrap.appendChild(sel); sel.style.display = 'none';
  const pop = document.createElement('div'); pop.className = 'lsel-pop'; pop.setAttribute('role', 'listbox'); document.body.appendChild(pop);
  const opts = () => [...sel.options];
  const label = () => { const o = sel.options[sel.selectedIndex] || sel.options[0]; btn.innerHTML = GLOBE + `<span class="lsel-n">${o ? o.textContent : ''}</span><span class="lsel-c">${o ? o.value.toUpperCase() : ''}</span>` + CHEV; };
  // follow programmatic changes of .value / .selectedIndex
  const P = HTMLSelectElement.prototype;
  for (const k of ['value', 'selectedIndex']) {
    const d = Object.getOwnPropertyDescriptor(P, k);
    Object.defineProperty(sel, k, { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); label(); } });
  }
  let open = false;
  function place() {
    const r = btn.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    let left = r.right - w; if (left < 8) left = Math.min(r.left, innerWidth - w - 8);
    let top = r.bottom + 6; if (top + h > innerHeight - 8 && r.top - h - 6 > 8) { top = r.top - h - 6; pop.style.transformOrigin = 'bottom right'; } else pop.style.transformOrigin = 'top right';
    pop.style.left = Math.max(8, left) + 'px'; pop.style.top = Math.max(8, top) + 'px';
  }
  function show() {
    pop.innerHTML = opts().map(o => `<button type="button" role="option" data-v="${o.value}" class="${o.value === sel.value ? 'on' : ''}" aria-selected="${o.value === sel.value}"><span>${o.textContent}</span><small>${o.value}</small></button>`).join('');
    pop.querySelectorAll('[data-v]').forEach(b => { b.onclick = () => pick(b.dataset.v); });
    open = true; btn.setAttribute('aria-expanded', 'true'); place(); pop.classList.add('on');
    const cur = pop.querySelector('.on') || pop.querySelector('button'); if (cur) cur.focus({ preventScroll: true }); if (cur) cur.scrollIntoView({ block: 'nearest' });
  }
  function hide(focus) { if (!open) return; open = false; btn.setAttribute('aria-expanded', 'false'); pop.classList.remove('on'); if (focus) btn.focus({ preventScroll: true }); }
  function pick(v) {
    hide(true);
    if (v === sel.value) return;
    sel.value = v; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true }));
    label();
  }
  btn.onclick = e => { e.stopPropagation(); open ? hide() : show(); };
  document.addEventListener('pointerdown', e => { if (open && !pop.contains(e.target) && !btn.contains(e.target)) hide(); }, true);
  document.addEventListener('keydown', e => {
    if (!open) return;
    const bs = [...pop.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hide(true); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); const n = bs[(i + (e.key === 'ArrowDown' ? 1 : -1) + bs.length) % bs.length]; if (n) n.focus(); }
    else if (e.key === 'Tab') hide();
  }, true);
  addEventListener('resize', () => { if (open) place(); });
  addEventListener('scroll', () => { if (open) place(); }, true);
  label();
}
function run() { enhance(document.getElementById('langSel')); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
