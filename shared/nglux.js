/* NgLux — the "luxury" look of the new-game dialog (as shogi's, #665–#675), shared by every board game.
   Loaded after the dialog (next to shared/ngtabs.js); nothing to call. It marks #newOverlay > .modal with .ngl and:
     • ルール tab: the settings in framed panels with a soft gradient (two side by side on PC, stacked on phones). The fields of
       the two .ng-col are split into two panels of about the same height, in their original order, every time the mode changes
       (only the fields that have to move are moved); a single field (e.g. the rated card) gets one wide panel.
     • labels in the theme's brass with a hairline, segmented buttons with a gilded selection, display options as tiles,
       the AI level name in the title's serif.
     • デザイン tab: each design row in a framed panel, the choices as big picture tiles.
     • ゲーム tab: the variant cards get the panel gradient.
   Colours come from the game's own theme variables (--brass, --accent, --panel2, --line, --text, --muted); a game can
   override --ngl-a (frame / label colour) and --ngl-hi (selection colour) on #newOverlay.
   The portal skin (html.atlas-skin, light theme) gets cream panels instead of the dark gradient.
     <script src="../shared/nglux.js?v=1"></script>   (before or after ngtabs.js) */
(function () {
'use strict';
const P = '#newOverlay > .modal.ngl';
const CSS = `
${P}{--ngl-a:var(--brass,#c9a961);--ngl-hi:var(--accent,#e2c275);--ngl-pbg:linear-gradient(180deg, color-mix(in srgb, var(--ngl-hi) 7%, transparent), rgba(0,0,0,.16) 55%, rgba(0,0,0,.24));
  --ngl-pbd:color-mix(in srgb, var(--ngl-a) 28%, var(--line,#3a2f24));--ngl-psh:inset 0 1px 0 rgba(255,255,255,.04), 0 10px 30px -18px rgba(0,0,0,.8)}
/* segmented buttons (mode, side, clock …): a recessed tray, the choice gilded */
${P} .seg{padding:4px;gap:4px;border-radius:12px;background:rgba(0,0,0,.3)}
${P} .seg button{border-radius:9px}
${P} .seg button:not(.sel):hover{color:var(--text,#eee);background:rgba(255,255,255,.035)}
${P} .seg button.sel{background:linear-gradient(180deg, color-mix(in srgb, var(--ngl-hi) 22%, var(--panel2,#211b15)), var(--panel2,#211b15));color:var(--text,#eee);box-shadow:0 0 0 1px color-mix(in srgb, var(--ngl-hi) 60%, transparent), 0 4px 12px -6px rgba(0,0,0,.8)}
/* ルール tab: the two framed panels */
${P}[data-ngt=rules] .ng-cols:not(.ngt-hide){display:grid!important;columns:auto!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:16px!important;align-items:stretch!important;column-gap:16px!important}
${P}.ngt-pc[data-ngt=rules] .ng-cols:not(.ngt-hide){flex:1 0 auto!important;margin:0 0 4px!important;overflow:visible!important;max-height:none!important}
${P}[data-ngt=rules] .ng-cols.ngl-one{grid-template-columns:minmax(0,1fr)!important;align-items:start!important}
${P}[data-ngt=rules] .ng-col.ngl-empty{display:none!important}
${P}[data-ngt=rules] .ng-col:not(.ngt-hide):not(.ngl-empty){display:flex!important;flex-direction:column;justify-content:flex-start;gap:20px;min-width:0;margin:0!important;padding:18px 20px 20px!important;border-radius:16px;
  border:1px solid var(--ngl-pbd);background:var(--ngl-pbg);box-shadow:var(--ngl-psh)}
${P}[data-ngt=rules] .ng-col > *{margin:0!important}
${P}[data-ngt=rules] .ng-col > .field{align-self:stretch;width:auto}
${P} :is(.ng-col,[data-ng=design]) > .field > label:first-child,${P} [data-ng=design] > label:first-child,${P}[data-ngt=rules] .ng-col > .field > label:first-child{display:flex;align-items:center;gap:10px;font-size:11.5px;letter-spacing:.22em;color:var(--ngl-a);margin:0 0 10px}
${P} :is(.ng-col,[data-ng=design]) > .field > label:first-child::after,${P} [data-ng=design] > label:first-child::after{content:'';flex:1;min-width:12px;height:1px;background:linear-gradient(90deg, color-mix(in srgb, var(--ngl-a) 40%, transparent), transparent)}
[dir=rtl] ${P} :is(.ng-col,[data-ng=design]) > .field > label:first-child::after,[dir=rtl] ${P} [data-ng=design] > label:first-child::after{background:linear-gradient(270deg, color-mix(in srgb, var(--ngl-a) 40%, transparent), transparent)}
${P} .ng-col .level-name{font-family:var(--ngl-serif,inherit);font-size:22px;color:var(--ngl-hi);letter-spacing:.04em;line-height:1.25;height:auto}
${P} .ng-col .level-name small{font-family:var(--ngl-sans,inherit);letter-spacing:0;font-size:11.5px}
${P} .ng-col .checks{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
${P} .ng-col .checks label{margin:0;padding:8px 11px;border-radius:10px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.05);min-width:0;line-height:1.35;letter-spacing:0}
${P} .ng-col :is(select:not([data-nopd]),.pd-btn){border-radius:10px}
${P} .ng-col .pd-btn{background:rgba(0,0,0,.3)}
${P} .ng-col :is(.ng-info,[id$=Info]) p{line-height:1.75}
/* the mode row (outside the panels): a little more air */
${P}.ngt-pc[data-ngt=rules] .ngt-modef{margin-bottom:16px!important}
${P}.ngt-pc[data-ngt=rules] .ngt-modef > label{letter-spacing:.18em}
/* デザイン tab: each design row in a panel, big picture tiles */
${P}[data-ngt=design] [data-ng=design]:not(.ngt-hide):not(.hidden){margin:0 0 14px!important;padding:16px 18px 18px!important;border-radius:16px;border:1px solid var(--ngl-pbd);background:var(--ngl-pbg);box-shadow:var(--ngl-psh)}
${P}[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow){gap:10px!important}
${P}.ngt-pc[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow){display:grid!important;grid-template-columns:repeat(auto-fill,minmax(var(--ngl-tile,136px),1fr))!important}
${P}[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow) > button{border-radius:12px!important;padding:6px 6px 8px!important;gap:6px;border:1px solid color-mix(in srgb, var(--ngl-a) 18%, var(--line,#3a2f24))!important;
  background:linear-gradient(180deg, rgba(255,255,255,.035), rgba(0,0,0,.2))!important;font-size:12px;letter-spacing:.02em;transition:border-color .15s, transform .15s, box-shadow .15s}
${P}.ngt-pc[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow) > button:not(:disabled):hover{transform:translateY(-2px);border-color:color-mix(in srgb, var(--ngl-hi) 55%, transparent)!important}
${P}[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow) > button:is(.sel,.on,[aria-pressed=true]){border-color:var(--ngl-hi)!important;color:var(--text,#eee)!important;
  background:linear-gradient(180deg, color-mix(in srgb, var(--ngl-hi) 18%, transparent), color-mix(in srgb, var(--ngl-hi) 5%, rgba(0,0,0,.18)))!important;box-shadow:0 0 0 1px color-mix(in srgb, var(--ngl-hi) 55%, transparent), 0 8px 18px -10px rgba(0,0,0,.8)!important}
${P}[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow) > button :is(.th,svg,img,i){border-radius:8px}
/* ゲーム tab: the variant cards in the panel gradient */
${P} .ngt-gcard:not(.sel){border-color:var(--ngl-pbd);background:var(--ngl-pbg);box-shadow:var(--ngl-psh)}
${P} .ngt-gcard.sel{border-color:var(--ngl-hi);background:linear-gradient(180deg, color-mix(in srgb, var(--ngl-hi) 16%, transparent), color-mix(in srgb, var(--ngl-hi) 5%, transparent) 55%, rgba(0,0,0,.18))}
${P}.ngt-pc .ngt-gcard p{font-size:14px!important;line-height:1.75!important;color:color-mix(in srgb, var(--text,#eee) 78%, transparent)}
${P}.ngt-on .ngt-gcard p{font-size:12.5px!important;line-height:1.6}
/* phones: the panels a little tighter, one under the other */
${P}.ngt-on[data-ngt=rules] .ng-cols:not(.ngt-hide){display:flex!important;flex-direction:column;gap:10px!important;margin:0 0 6px!important}
${P}.ngt-on[data-ngt=rules] .ng-col:not(.ngt-hide):not(.ngl-empty){gap:20px;padding:16px 14px 18px!important;border-radius:14px}
${P}.ngt-on :is(.ng-col,[data-ng=design]) > .field > label:first-child,${P}.ngt-on [data-ng=design] > label:first-child{font-size:11px;letter-spacing:.2em;margin-bottom:8px}
${P}.ngt-on[data-ngt=design] [data-ng=design]:not(.ngt-hide):not(.hidden){margin:0 0 10px!important;padding:13px 12px 14px!important;border-radius:14px}
${P}.ngt-on[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow){gap:6px!important}
${P}.ngt-on[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow) > button{padding:3px 3px 5px!important;border-radius:10px!important}
/* the portal skin (light): cream panels and trays */
html.atlas-skin ${P}{--ngl-pbg:linear-gradient(180deg,#fffaf0,#f8eedb);--ngl-pbd:#ecdab4;--ngl-psh:0 1px 0 #fff inset, 0 10px 24px -18px rgba(120,80,20,.55);--ngl-a:#b8812f;--ngl-hi:#e0a33a}
html.atlas-skin ${P} .seg{background:#f2e7cf!important;border-color:#ead9b6!important}
html.atlas-skin ${P} .seg button.sel{background:linear-gradient(180deg,#fffaf0,#fde9c0)!important;color:#2b3044!important;box-shadow:0 0 0 1px #e3b866, 0 3px 8px -4px rgba(150,100,30,.6)!important}
html.atlas-skin ${P} .seg button:not(.sel):hover{background:rgba(255,255,255,.5)}
html.atlas-skin ${P} .ng-col .checks label{background:#fffdf7;border-color:#efe2c6}
html.atlas-skin ${P} .ng-col .pd-btn{background:#fffdf7}
html.atlas-skin ${P} .ng-col .level-name{color:#c0811c}
html.atlas-skin ${P}[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow) > button{background:#fffdf7!important;border-color:#ecdcb8!important}
html.atlas-skin ${P}[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow) > button:is(.sel,.on,[aria-pressed=true]){background:linear-gradient(180deg,#fff6df,#fde6b6)!important;border-color:#e0a33a!important;box-shadow:0 0 0 1px #e9bd6a, 0 6px 14px -8px rgba(150,100,30,.6)!important}
html.atlas-skin ${P} .ngt-gcard.sel{background:linear-gradient(180deg,#fff6df,#fdeac4)}
html.atlas-skin ${P}.ngt-pc .ngt-gcard p{color:#4a5068}
`;
function init() {
  const ov = document.getElementById('newOverlay'), modal = ov && ov.querySelector('.modal');
  if (!modal || modal.classList.contains('ngl')) return;
  modal.classList.add('ngl');
  const st = document.createElement('style'); st.id = 'nglCss'; st.textContent = CSS; document.head.appendChild(st);
  // the title's serif for the level name
  try { const h2 = modal.querySelector('h2'); if (h2) modal.style.setProperty('--ngl-serif', getComputedStyle(h2).fontFamily); modal.style.setProperty('--ngl-sans', getComputedStyle(modal).fontFamily); } catch (e) {}
  const cols = [...modal.querySelectorAll('.ng-col')];
  if (cols.length !== 2 || cols[0].parentNode !== cols[1].parentNode) return;
  const [c1, c2] = cols, wrap = c1.parentNode;
  const own = e => !e.hasAttribute('data-ng') && !e.matches('script,style,template');
  const items = [...c1.children, ...c2.children].filter(own);   // the settings in their original order
  const shown = e => !e.classList.contains('hidden') && !e.hidden && getComputedStyle(e).display !== 'none' && e.offsetHeight > 0;
  function place(col, list) {
    const want = list.concat([...col.children].filter(e => !own(e)));
    want.forEach((e, i) => { if (col.children[i] !== e) col.insertBefore(e, col.children[i] || null); });
  }
  let busy = false;
  function balance() {
    if (busy || !ov.classList.contains('show') || (modal.dataset.ngt && modal.dataset.ngt !== 'rules')) return;
    busy = true;
    try {
      const vis = items.filter(shown); if (!vis.length && items.length) return;
      const h = vis.map(e => e.offsetHeight + 20), tot = h.reduce((a, b) => a + b, 0);
      let k = vis.length, best = Infinity, acc = 0;
      if (vis.length >= 2) for (let i = 1; i < vis.length; i++) { acc += h[i - 1]; const d = Math.abs(tot - 2 * acc); if (d < best) { best = d; k = i; } }
      const cut = k < vis.length ? items.indexOf(vis[k]) : items.length;
      place(c1, items.slice(0, cut)); place(c2, items.slice(cut));
      const e1 = !items.slice(0, cut).some(shown) && ![...c1.children].some(e => !own(e) && shown(e)), e2 = !items.slice(cut).some(shown);
      c1.classList.toggle('ngl-empty', e1); c2.classList.toggle('ngl-empty', e2);
      wrap.classList.toggle('ngl-one', e1 || e2);
    } finally { busy = false; }
  }
  let q = 0;
  const later = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; balance(); }); };
  new MutationObserver(later).observe(modal, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style', 'data-ngt'] });
  new MutationObserver(later).observe(ov, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', later);
  later();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
