// CardBar — compact action bar for the lesson / puzzle cards of the 世界のボドゲ大全 games (common spec).
//
// The cards used to show every action as a big text button in one or two loose rows (ヒント / やり直す / 答えを見る /
// 次の問題 / 問題一覧 / やめる). This module rebuilds them, keeping the original buttons (ids, handlers, i18n) as they are:
//   [ icon tools ……… ]  [ text actions / primary ]        × (やめる) in the top corner of the card
//   puzzle: 💡 hint · ↺ retry · 👁 answer · ▦ list (· ‹ prev)   |  次の問題 ›  — gold once solved, the retry icon glows after a failure
//   lesson: ▦ list · ▶ auto                                     |  ヒント (its label changes with the mode) · 次へ (primary)
// Icon buttons carry their (translated) label as title + aria-label, kept in sync with the text the game writes into them.
// Usage: include after the card markup — <script src="../shared/cardbar.js?v=N"></script>.
// Portal skin (?skin=atlas): the same bar; atlas/skin/common.js puts it next to the guide character and skin.css gives it the portal look.
(function () {
'use strict';
const P = d => `<path d="${d}"/>`;
const SVG = body => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${body}</svg>`)}")`;
const ICONS = {
  hint: SVG(P('M9 18h6M10 21h4') + P('M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z')),
  retry: SVG(P('M4 4v6h6') + P('M5.5 15a7 7 0 1 0 1.6-7.3L4 10')),
  answer: SVG(P('M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z') + `<circle cx='12' cy='12' r='3'/>`),
  list: SVG(`<rect x='4' y='4' width='6.5' height='6.5' rx='1.5'/><rect x='13.5' y='4' width='6.5' height='6.5' rx='1.5'/><rect x='4' y='13.5' width='6.5' height='6.5' rx='1.5'/><rect x='13.5' y='13.5' width='6.5' height='6.5' rx='1.5'/>`),
  quit: SVG(P('M6 6l12 12M18 6 6 18')),
  prev: SVG(P('M15 6l-6 6 6 6')),
  next: SVG(P('M9 6l6 6-6 6')),
};
const CSS = `
:where(.cb-card){position:relative}
.cb-card > .lh{padding-inline-end:36px}
.cb-bar{display:flex;align-items:center;gap:8px;margin-top:12px;min-width:0}
.cb-tools{display:flex;align-items:center;gap:6px;flex:none}
.cb-main{display:flex;align-items:center;justify-content:flex-end;gap:6px;flex:1 1 auto;min-width:0}
.cb-main:empty{display:none}
.cb-bar .hidden,.cb-card .cb-hide{display:none!important}
.cb-bar button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;box-sizing:border-box;margin:0;
  transition:color .15s,border-color .15s,background-color .15s,opacity .15s}
.cb-ic{flex:none;display:inline-grid;place-items:center;width:40px;height:40px;padding:0;border-radius:11px;font-size:0;line-height:0;
  border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(0,0,0,.18);color:var(--muted,#aaa)}
.cb-ic:not(#lsAuto) > *{display:none}
.cb-ic:not(#lsAuto)::before{content:'';width:20px;height:20px;background:currentColor;-webkit-mask:var(--cb-i) center/contain no-repeat;mask:var(--cb-i) center/contain no-repeat}
#lsAuto.cb-ic svg{width:17px;height:17px}
.cb-ic:hover:not(:disabled){color:var(--text,#eee);border-color:color-mix(in srgb,var(--accent,#c9a961) 60%,transparent)}
.cb-ic:focus-visible,.cb-t:focus-visible{outline:2px solid var(--accent,#c9a961);outline-offset:2px}
.cb-ic.cb-go{color:var(--accent,#c9a961);border-color:var(--accent,#c9a961);background:color-mix(in srgb,var(--accent,#c9a961) 16%,transparent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent,#c9a961) 18%,transparent)}
.cb-bar button:disabled{opacity:.3;cursor:default}
.cb-x{position:absolute;top:8px;inset-inline-end:8px;z-index:1;width:30px;height:30px;border-radius:50%;border-color:transparent;background:transparent;color:var(--dim,var(--muted,#999))}
.cb-x::before{width:16px!important;height:16px!important}
.cb-x:hover{background:rgba(255,255,255,.07)}
.cb-t{flex:1 1 0;min-width:0;max-width:240px;height:40px;padding:0 12px;border-radius:11px;font-size:13px;font-weight:700;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  display:inline-flex;align-items:center;justify-content:center;gap:4px;border:1px solid var(--line,rgba(255,255,255,.12));background:rgba(0,0,0,.18);color:var(--muted,#aaa)}
.cb-t:hover:not(:disabled){color:var(--text,#eee)}
.cb-t.go{background:var(--cb-go-bg,linear-gradient(180deg,#d8bb72,#a98a48));color:var(--cb-go-fg,#1b150a);border-color:transparent;box-shadow:0 6px 16px -10px var(--accent,#c9a961)}
.cb-t.go:hover:not(:disabled){color:var(--cb-go-fg,#1b150a);filter:brightness(1.06)}
.cb-t.go:disabled{opacity:.4}
.cb-nx::after{content:'';flex:none;width:15px;height:15px;margin-inline-end:-4px;background:currentColor;-webkit-mask:${ICONS.next} center/contain no-repeat;mask:${ICONS.next} center/contain no-repeat}
html[dir=rtl] .cb-nx::after,html[lang=ar] .cb-nx::after,html[dir=rtl] .cb-ic[data-cb=prev]::before,html[lang=ar] .cb-ic[data-cb=prev]::before{transform:scaleX(-1)}
.cb-bar .cb-ic{display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:0!important;width:40px!important;height:40px!important;min-height:0!important;max-height:none!important;min-width:0!important;line-height:0!important;flex:none!important;vertical-align:middle}
.cb-bar .cb-ic::before{display:block;flex:none;margin:0!important}
.cb-bar .cb-t{height:40px!important;min-height:0!important;padding-top:0!important;padding-bottom:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;line-height:1!important}
.cb-bar,.cb-tools,.cb-main{align-items:center!important}
@media (pointer:coarse){ .cb-bar .cb-ic,.cb-bar .cb-t{height:42px!important}.cb-bar .cb-ic{width:42px!important} }
@media (max-width:360px){ .cb-bar{gap:6px}.cb-tools{gap:4px}.cb-bar .cb-ic{width:38px!important}.cb-bar .cb-t{padding:0 8px!important} }
`;
const st = document.createElement('style'); st.id = 'cardbar-css'; st.textContent = CSS; document.head.appendChild(st);

const $ = id => document.getElementById(id);
const label = b => (b.id === 'lsAuto' ? (b.title || (document.querySelector('[data-sn="auto"]') || {}).title || '') : b.textContent.replace(/\s+/g, ' ').trim());
function icon(b, kind) {
  b.classList.add('cb-ic'); b.classList.remove('go'); b.dataset.cb = kind;
  if (ICONS[kind]) b.style.setProperty('--cb-i', ICONS[kind]);
}
function build(card, spec) {
  if (!card || card.querySelector('.cb-bar')) return;
  const rows = [...card.querySelectorAll(':scope > .lesson-actions, :scope > .pz-acts, :scope > .pz-nav')];
  if (!rows.length) return;
  // the game's own primary-button colours (its .lesson-actions .go rule) become the primary colour of the bar
  const goB = card.querySelector('.lesson-actions .go');
  if (goB) { const cs = getComputedStyle(goB); if (cs.backgroundImage && cs.backgroundImage !== 'none') card.style.setProperty('--cb-go-bg', cs.backgroundImage); else if (cs.backgroundColor) card.style.setProperty('--cb-go-bg', cs.backgroundColor); card.style.setProperty('--cb-go-fg', cs.color); }
  card.classList.add('cb-card');
  const bar = document.createElement('div'); bar.className = 'cb-bar';
  const tools = document.createElement('div'); tools.className = 'cb-tools';
  const main = document.createElement('div'); main.className = 'cb-main';
  bar.append(tools, main);
  const used = new Set();
  for (const [id, kind] of spec.tools) { const b = $(id); if (b && card.contains(b)) { icon(b, kind); tools.appendChild(b); used.add(b); } }
  for (const id of spec.hide || []) { const b = $(id); if (b && card.contains(b)) { b.classList.add('cb-hide'); used.add(b); } }
  const rest = [];
  rows.forEach(r => [...r.querySelectorAll('button')].forEach(b => { if (!used.has(b) && b.id !== spec.quit && b.id !== spec.next) rest.push(b); }));
  rest.forEach(b => { b.classList.add('cb-t'); main.appendChild(b); });
  const nx = $(spec.next); if (nx && card.contains(nx)) { nx.classList.add('cb-t'); if (spec.nextChev) nx.classList.add('cb-nx'); main.appendChild(nx); }
  const q = $(spec.quit); if (q && card.contains(q)) { icon(q, 'quit'); q.classList.add('cb-x'); bar.appendChild(q); }
  rows[rows.length - 1].after(bar); rows.forEach(r => r.remove());
  // labels of icon buttons → tooltip + accessible name; puzzle state → primary button
  const toolKind = new Map(spec.tools);
  const sync = () => {
    // buttons a game adds later (e.g. next to the quit button) join the bar the same way
    [...bar.children].forEach(b => { if (b.tagName !== 'BUTTON' || b.classList.contains('cb-x')) return;
      if (toolKind.has(b.id)) { icon(b, toolKind.get(b.id)); tools.appendChild(b); } else { b.classList.add('cb-t'); main.insertBefore(b, nx && main.contains(nx) ? nx : null); } });
    bar.querySelectorAll('.cb-ic').forEach(b => { const l = label(b); if (l && b.getAttribute('aria-label') !== l) { b.setAttribute('aria-label', l); b.title = l; } });
    if (spec.puzzle) {
      const sv = !!card.querySelector('.pz-status .pb-sv, #pzStatus .pb-sv'), h = $('pzHint'), r = $('pzRetry');
      const failed = !sv && !!(h && h.disabled) && !!card.querySelector('#pzStatus .ng');
      if (nx) { const on = sv && !nx.disabled; if (nx.classList.contains('go') !== on) nx.classList.toggle('go', on); }
      if (r && r.classList.contains('cb-go') !== failed) r.classList.toggle('cb-go', failed);
    }
  };
  new MutationObserver(sync).observe(card, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'title'] });
  sync();
}
function init() {
  build($('puzzleCard'), { puzzle: true, tools: [['pzHint', 'hint'], ['pzRetry', 'retry'], ['pzAnswer', 'answer'], ['pzList', 'list'], ['pzPrev', 'prev']], hide: ['pzToList'], next: 'pzNext', nextChev: true, quit: 'pzQuit' });
  build($('lessonCard'), { tools: [['lsList', 'list'], ['lsToList', 'list'], ['lsAuto', 'auto']], next: 'lsNext', quit: 'lsQuit' });
}
if (document.readyState === 'loading' && !($('puzzleCard') || $('lessonCard'))) document.addEventListener('DOMContentLoaded', init); else init();
window.CardBar = { init };
})();
