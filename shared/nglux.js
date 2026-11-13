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
${P}[data-ngt=rules] .ng-col:not(.ngt-hide):not(.ngl-empty){display:flex!important;flex-direction:column;justify-content:flex-start;gap:20px!important;min-width:0;margin:0!important;padding:18px 20px 20px!important;border-radius:16px;
  border:1px solid var(--ngl-pbd);background:var(--ngl-pbg);box-shadow:var(--ngl-psh)}
${P}[data-ngt=rules] .ng-col > *{margin:0!important}
${P}[data-ngt=rules] .ng-col > .field{align-self:stretch;width:auto}
${P} :is(.ng-col,[data-ng=design]) > .field > label:first-child,${P} [data-ng=design] > label:first-child,${P}[data-ngt=rules] .ng-col > .field > label:first-child{display:flex;align-items:center;gap:10px;font-size:11.5px;letter-spacing:.22em;color:var(--ngl-a);margin:0 0 10px}
${P} :is(.ng-col,[data-ng=design]) > .field > label:first-child::after,${P} [data-ng=design] > label:first-child::after{content:'';flex:1;min-width:12px;height:1px;background:linear-gradient(90deg, color-mix(in srgb, var(--ngl-a) 40%, transparent), transparent)}
[dir=rtl] ${P} :is(.ng-col,[data-ng=design]) > .field > label:first-child::after,[dir=rtl] ${P} [data-ng=design] > label:first-child::after{background:linear-gradient(270deg, color-mix(in srgb, var(--ngl-a) 40%, transparent), transparent)}
${P} .ng-col .level-name{font-family:var(--ngl-serif,inherit);font-size:22px;color:var(--ngl-hi);letter-spacing:.04em;line-height:1.25;height:auto}
${P} .ng-col .level-name small{font-family:var(--ngl-sans,inherit);letter-spacing:.02em;font-size:14.5px;color:color-mix(in srgb, var(--text,#eee) 78%, transparent)}   /* (2026-11-13: larger, easier to read) */
/* the level description on its own fixed two-line row, so the slider never jumps */
${P} .level-name{flex-wrap:wrap!important}
${P} .level-name small{flex:0 0 100%!important;width:100%;display:block!important;margin:6px 0 0!important;line-height:1.5!important;min-height:3em;display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;white-space:normal!important}
${P} .ng-col .checks{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
${P} .ng-col .checks label{margin:0;padding:8px 11px;border-radius:10px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.05);min-width:0;line-height:1.35;letter-spacing:0}
${P} .ng-col :is(select:not([data-nopd]),.pd-btn){border-radius:10px}
${P} .ng-col .pd-btn{background:rgba(0,0,0,.3)}
${P} .ng-col :is(.ng-info,[id$=Info]) p{line-height:1.75}
/* a field whose label sat beside its control (phones) now stacks: the label with its hairline on top */
${P}[data-ngt=rules] .ng-col > .field:not(.hidden):not(.ngt-hide):not([data-ng]){display:block!important}
${P}[data-ngt=rules] .ng-col > .field > label:first-child{width:auto!important;max-width:none!important;white-space:normal}
/* PC: the display options sit at the foot of their panel (as shogi's) */
${P}.ngt-pc[data-ngt=rules] .ng-col > .ngl-foot{margin-top:auto!important}
/* the chosen design's name (phones show only pictures): at the end of the label's hairline */
${P} [data-ng=design]:not(.ngt-hide):has(> .dsg-now){display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:center}
${P} [data-ng=design]:has(> .dsg-now) > *{grid-column:1 / -1;min-width:0}
${P} [data-ng=design]:has(> .dsg-now) > label:first-child{grid-column:1}
${P} [data-ng=design] > .dsg-now{grid-column:2;margin:0 0 10px 10px!important;font-size:12.5px;color:var(--ngl-hi)}
/* the footer band: 閉じる / 対局開始, 220 px each, centred (as the full version) */
${P}.ngt-pc .ngt-foot .modal-actions{display:flex!important;justify-self:stretch!important;gap:10px!important;justify-content:center!important;width:auto!important;max-width:none!important;margin-left:0!important;margin-right:0!important}
${P}.ngt-pc .ngt-foot .modal-actions > :is(.mbtn,button){flex:0 0 220px!important;width:220px!important;max-width:none!important;min-height:50px;padding-top:12px!important;padding-bottom:12px!important;font-size:17px!important}   /* (2026-11-13: the full version's size — 220 × 50, centred) */
/* the mode row (outside the panels): a little more air */
${P} > :is(.ngt-modef,.ng-cols){order:0!important}
${P}.ngt-pc[data-ngt=rules] .ngt-modef{margin-bottom:16px!important}
${P}.ngt-pc[data-ngt=rules] .ngt-modef > label{letter-spacing:.18em}
/* デザイン tab: each design row in a panel, big picture tiles */
${P}[data-ngt=design] [data-ng=design]:not(.ngt-hide):not(.hidden):not([data-ng-credit]){margin:0 0 14px!important;padding:16px 18px 18px!important;border-radius:16px;border:1px solid var(--ngl-pbd);background:var(--ngl-pbg);box-shadow:var(--ngl-psh)}
${P}[data-ngt=design] [data-ng-credit]{margin:4px 0 0!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;text-align:center}   /* the design credit: just a line at the bottom, no frame */
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
${P}.ngt-on[data-ngt=rules] .ng-col:not(.ngt-hide):not(.ngl-empty){gap:22px!important;padding:16px 14px 18px!important;border-radius:14px}
${P}.ngt-on :is(.ng-col,[data-ng=design]) > .field > label:first-child,${P}.ngt-on [data-ng=design] > label:first-child{font-size:11px;letter-spacing:.2em;margin-bottom:8px}
${P}.ngt-on[data-ngt=design] [data-ng=design]:not(.ngt-hide):not(.hidden):not([data-ng-credit]){margin:0 0 10px!important;padding:13px 12px 14px!important;border-radius:14px}
${P}.ngt-on[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow){gap:6px!important}
${P}.ngt-on[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow) > button{padding:3px 3px 5px!important;border-radius:10px!important}
/* phones held sideways (html.ngt-land / html.rot, 2026-11-07): the dialog is short and wide — the ルール panels side by side
   (two columns, tighter), the デザイン rows two per line (a wide row such as the portal's 場所 keeps the full width) */
:is(html.ngt-land,html.rot) ${P}.ngt-on[data-ngt=rules] .ng-cols:not(.ngt-hide){display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:10px!important;align-items:start!important;margin:0 0 6px!important}
:is(html.ngt-land,html.rot) ${P}.ngt-on[data-ngt=rules] .ng-cols.ngl-one:not(.ngt-hide){grid-template-columns:minmax(0,1fr)!important}
:is(html.ngt-land,html.rot) ${P}.ngt-on[data-ngt=rules] .ng-col:not(.ngt-hide):not(.ngl-empty){gap:12px!important;padding:11px 12px 12px!important}
:is(html.ngt-land,html.rot) ${P}.ngt-on :is(.ng-col,[data-ng=design]) > .field > label:first-child,:is(html.ngt-land,html.rot) ${P}.ngt-on [data-ng=design] > label:first-child{margin-bottom:5px}
:is(html.ngt-land,html.rot) ${P}.ngt-on[data-ngt=rules] .level-wrap{gap:4px!important}
:is(html.ngt-land,html.rot) ${P}.ngt-on[data-ngt=rules] :is(.level-name,#levelName){min-height:0!important}
:is(html.ngt-land,html.rot) ${P}.ngt-on[data-ngt=rules] .rules-offer{padding-top:6px!important;padding-bottom:6px!important}
:is(html.ngt-land,html.rot) ${P}.ngt-on[data-ngt=design] .ng-col:has(> [data-ng=design]:not(.ngt-hide)){display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;align-items:start}
:is(html.ngt-land,html.rot) ${P}.ngt-on[data-ngt=design] .ng-col:has(> [data-ng=design]:not(.ngt-hide)) > [data-ng=design]{margin:0!important;min-width:0}
:is(html.ngt-land,html.rot) ${P}.ngt-on[data-ngt=design] .ng-col > [data-ng=design]:is(.atlas-place,.wide){grid-column:1 / -1}
:is(html.ngt-land,html.rot) ${P}.ngt-on[data-ngt=rules]:has(> .rules-offer:not(.hidden)):has(> .ngt-modef:not(.hidden)){flex-flow:row wrap!important;align-content:flex-start!important;column-gap:10px!important}
:is(html.ngt-land,html.rot) ${P}.ngt-on[data-ngt=rules]:has(> .rules-offer:not(.hidden)):has(> .ngt-modef:not(.hidden)) > *{flex:1 1 100%;min-width:0}
:is(html.ngt-land,html.rot) ${P}.ngt-on[data-ngt=rules]:has(> .rules-offer:not(.hidden)):has(> .ngt-modef:not(.hidden)) > :is(.rules-offer,.ngt-modef){flex:1 1 calc(50% - 5px)!important;width:auto!important;margin-bottom:8px!important;align-self:stretch}
:is(html.ngt-land,html.rot) ${P}.ngt-on[data-ngt=rules] > .rules-offer span{font-size:12px!important;line-height:1.45!important}
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
/* the portal look is flat (2026-11-10): solid fills, a solid border and at most a solid bottom edge — no gradients, glows or soft drop shadows */
html.atlas-skin ${P}{--ngl-pbg:#fffaf0;--ngl-psh:0 3px 0 #ecdab4}
html.atlas-skin ${P} :is(.ng-col,[data-ng=design],.ngt-gcard,.ngt-modef,.ngt-rl){background-image:none!important}
html.atlas-skin ${P} .seg button.sel{background:#fff!important;box-shadow:0 2px 0 #e3cfa4!important}
html.atlas-skin ${P}[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow) > button{box-shadow:0 2px 0 #efe2c4!important}
html.atlas-skin ${P}[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow) > button:is(.sel,.on,[aria-pressed=true]){background:#fff3d6!important;border-color:#e0a33a!important;box-shadow:0 0 0 1px #e0a33a, 0 3px 0 #e6c27a!important;transform:none!important}
html.atlas-skin ${P}[data-ngt=design] [data-ng=design] :is(.dsg,.bdrow,.skrow,.skinrow) > button :is(.th,svg,img,i){box-shadow:none!important}
html.atlas-skin ${P} .ngt-gcard{box-shadow:0 3px 0 #ecdab4!important}
html.atlas-skin ${P} .ngt-gcard.sel{background:#fff3d6!important;border-color:#e0a33a!important;box-shadow:0 0 0 1px #e0a33a, 0 3px 0 #e6c27a!important}
html.atlas-skin ${P} .ngt-gcard .gart{box-shadow:none!important;background-image:none!important}
`;
function init() {
  const ov = document.getElementById('newOverlay'), modal = ov && ov.querySelector('.modal');
  if (!modal || modal.classList.contains('ngl')) return;
  modal.classList.add('ngl');
  const st = document.createElement('style'); st.id = 'nglCss'; st.textContent = CSS; document.head.appendChild(st);
  // (2026-11-13, every game) the mode row is for games only: レッスン / 詰め… / パズル leave it (they have their own buttons in the
  // menu band); オンライン shows the online room screen inside this dialog (below)
  { const sm = modal.querySelector('#segMode');
    if (sm) {
      const gone = sm.querySelectorAll(':scope > [data-v=lesson], :scope > [data-v=puzzle], :scope > [data-v=tsume]');
      gone.forEach(b => b.classList.add('ngl-gone'));
      st.textContent += '#segMode > .ngl-gone{display:none!important}';
      if (gone.length) new MutationObserver(() => { if (!ov.classList.contains('show')) return; const sel = sm.querySelector(':scope > .ngl-gone:is(.sel,.on,.active,[aria-pressed=true])'), ai = sm.querySelector(':scope > [data-v=ai]'); if (sel && ai) ai.click(); }).observe(ov, { attributes: true, attributeFilter: ['class'] });
      // オンライン: the online room screen (#olBody of #onlineOverlay) is shown inside this dialog, in place of the panels (2026-11-13)
      const on = sm.querySelector(':scope > [data-v=online]'), olo = document.getElementById('onlineOverlay'), olb = document.getElementById('olBody');
      if (on && olo && olb && typeof window.openOnline === 'function') {
        st.textContent += '#onlineOverlay.ngl-inline:not(#_){display:none!important}html body:not(#_):not(#_) #newOverlay .modal.ngl-ol:not([data-ngt=design]):not(#_) :is(.ng-cols,.ng-col,#btnStart):not(#_):not(#_){display:none!important}#newOverlay .modal:is(:not(.ngl-ol),[data-ngt=design]) .ngl-online{display:none!important}html body:not(#_) #newOverlay .modal.ngl-ol:not(#_) > .rules-offer{display:none!important}html body:not(#_) #newOverlay .ngl-online:not(#_) .ol-me{margin:0 0 10px!important;padding:6px 14px!important}html body:not(#_) #newOverlay .ngl-online:not(#_) .ol-lux{gap:14px!important}html body:not(#_) #newOverlay .ngl-online:not(#_) .ol-lux .ol-pane{padding:12px 18px 14px!important}html body:not(#_) #newOverlay .ngl-online:not(#_) .ol-lux .ol-ph{margin:0 0 2px!important}html body:not(#_) #newOverlay .ngl-online:not(#_) .ol-lux :is(.ol-sub,.ol-tcl){margin:9px 0 5px!important}html body:not(#_) #newOverlay .ngl-online:not(#_) .ol-lux .ol-pane > .ol-acts:last-child{padding-top:10px!important;margin-top:auto}html body:not(#_) #newOverlay .ngl-online:not(#_) :is(.ol-join input,.ol-title input,.ol-list > div){padding-top:7px!important;padding-bottom:7px!important;min-height:0!important}html body:not(#_) #newOverlay .ngl-online:not(#_) .ol-join button{padding-top:7px!important;padding-bottom:7px!important}html body:not(#_) #newOverlay .ngl-online:not(#_) .ol-title > small{display:none!important}html body:not(#_) #newOverlay .ngl-online:not(#_) .ol-title{margin-top:8px!important;display:block}html body:not(#_) #newOverlay .ngl-online:not(#_) .ol-acts .mbtn{padding-top:11px!important;padding-bottom:11px!important}html body:not(#_) #newOverlay .ngl-online:not(#_) .ol-rulesd{margin:6px 0 0!important}#newOverlay .ngl-online{flex:none;overflow:visible;margin:-6px 0 0;padding:0 2px}#newOverlay .modal.ngl-ol{overflow-y:auto!important}';
        const home = olb.parentNode, next = olb.nextSibling, box = document.createElement('div'); box.className = 'ngl-online';
        let inl = false, quiet = false;
        const hideNew = () => { if (typeof window.hideOverlay === 'function') window.hideOverlay('#newOverlay'); else ov.classList.remove('show'); };
        const enter = () => { if (inl) return; inl = true; const mf = sm.closest('.field') || sm, cols = modal.querySelector('.ng-cols'); if (cols) cols.after(box); else mf.after(box);   // (after the panels: the mode row stays above, wherever balance() puts it)
          box.appendChild(olb); olo.classList.add('ngl-inline'); modal.classList.add('ngl-ol'); try { window.openOnline(); } catch (e) { console.warn(e); } };
        const leave = closeOl => { if (!inl) return; inl = false; modal.classList.remove('ngl-ol'); home.insertBefore(olb, next && next.parentNode === home ? next : null); olo.classList.remove('ngl-inline');
          if (closeOl && olo.classList.contains('show')) { quiet = true; const c = document.getElementById('olClose'); try { if (c) c.click(); else olo.classList.remove('show'); } finally { quiet = false; } } };
        sm.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || b.parentNode !== sm) return; setTimeout(() => { if (b.dataset.v === 'online') enter(); else leave(true); }, 0); });
        // the room screen closed itself (an online game started, or its own close): the dialog goes too
        new MutationObserver(() => { if (inl && !quiet && !olo.classList.contains('show')) { leave(false); hideNew(); } }).observe(olo, { attributes: true, attributeFilter: ['class'] });
        new MutationObserver(() => { if (!ov.classList.contains('show')) leave(true); else if (!inl && on.matches('.sel,.on,[aria-pressed=true]')) enter(); }).observe(ov, { attributes: true, attributeFilter: ['class'] });
      }
    } }
  // the title's serif for the level name
  try { const h2 = modal.querySelector('h2'); if (h2) modal.style.setProperty('--ngl-serif', getComputedStyle(h2).fontFamily); modal.style.setProperty('--ngl-sans', getComputedStyle(modal).fontFamily); } catch (e) {}
  if (!modal.querySelector('.ng-cols, .ng-col')) {   // a dialog without columns (dots): its settings after the mode row go into two
    const sm = modal.querySelector('#segMode'), mf = sm && sm.closest('.field'), acts = modal.querySelector('.modal-actions');
    if (mf && mf.parentNode === modal) {
      const list = []; for (let n = mf.nextElementSibling; n && n !== acts && !n.classList.contains('ngt-foot') && !n.classList.contains('modal-actions'); n = n.nextElementSibling) if (n.classList.contains('field') && !n.hasAttribute('data-ng')) list.push(n);
      if (list.length) { const w = document.createElement('div'); w.className = 'ng-cols'; const a = document.createElement('div'), b = document.createElement('div'); a.className = b.className = 'ng-col'; w.append(a, b); mf.after(w); list.forEach(e => a.appendChild(e)); }
    }
  }
  { const cs = [...modal.querySelectorAll('.ng-col')];   // two columns straight in the dialog (morris): give them the wrapper
    if (cs.length === 2 && cs[0].parentNode === modal && cs[1].parentNode === modal) { const w = document.createElement('div'); w.className = 'ng-cols'; cs[0].before(w); w.append(cs[0], cs[1]); } }
  const cols = [...modal.querySelectorAll('.ng-col')];
  if (cols.length !== 2 || cols[0].parentNode !== cols[1].parentNode) return;
  const [c1, c2] = cols, wrap = c1.parentNode;
  const own = e => !e.hasAttribute('data-ng') && !e.matches('script,style,template');
  // the mode row goes above the panels (some games keep it after the columns)
  const mf = (() => { const sm = modal.querySelector('#segMode'); return sm && sm.closest('.field'); })();
  if (mf && mf.parentNode === wrap.parentNode && (wrap.compareDocumentPosition(mf) & Node.DOCUMENT_POSITION_FOLLOWING)) wrap.before(mf);
  const items = [...c1.children, ...c2.children].filter(e => own(e) && e !== mf);   // the settings in their original order
  let ord = (modal.dataset.nglOrder || '').split(',').filter(Boolean);   // a game's own order of the panels' settings (data-ngl-order="fLevel,fColor,…", 2026-11-13)
  let bar = ord.indexOf('|');   // ('|' in the order: the split between the two panels, fixed — e.g. shogi's level alone on the left, 2026-11-13)
  const items0 = items.slice();
  const order = () => { const o = (modal.dataset.nglOrder || '').split(',').filter(Boolean); if (!o.length && !ord.length) return; ord = o; bar = ord.indexOf('|');   // (read again on each pass: a game may change it with the mode)
    items.length = 0; items.push(...items0);
    if (ord.length) items.sort((a, b) => { const i = ord.indexOf(a.id), j = ord.indexOf(b.id); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); }); };
  order();
  const side = ord.length ? null : items.find(e => e.id === 'fColor'); if (side && side.parentNode === c2) { items.splice(items.indexOf(side), 1); const i = items.findIndex(e => e.parentNode === c1 && !/Info$/.test(e.id)); items.splice(i < 0 ? 0 : i, 0, side); }   // your side first, as in every game
  // (a field in a column hidden as empty has no height: it still counts as shown when it is not hidden itself — otherwise a
  //  column emptied by a mode with few settings (レッスン…) never came back, 2026-11-10)
  const shown = e => !e.classList.contains('hidden') && !e.hidden && getComputedStyle(e).display !== 'none' && (e.offsetHeight > 0 || !!e.closest('.ngl-empty'));
  function place(col, list) {
    const want = list.concat([...col.children].filter(e => !own(e)));
    want.forEach((e, i) => { if (col.children[i] !== e) col.insertBefore(e, col.children[i] || null); });
  }
  let busy = false;
  function balance() {
    if (busy || !ov.classList.contains('show') || (modal.dataset.ngt && modal.dataset.ngt !== 'rules')) return;
    busy = true;
    try {
      order();
      if (mf && wrap.contains(mf)) wrap.before(mf);   // the mode row always above the panels (reversi keeps it in a column)
      const vis = items.filter(shown); if (!vis.length && items.length) return;
      const h = vis.map(e => e.offsetHeight + 20 - [...e.querySelectorAll('.pro-panel:not(.hidden), #fisPick:not(.hidden)')].reduce((a, p) => a + p.offsetHeight, 0)), tot = h.reduce((a, b) => a + b, 0);   // (an open PRO panel / the フィッシャー presets do not move the settings to the other side, 2026-11-13)
      let k = vis.length, best = Infinity, acc = 0;
      if (vis.length >= 2) for (let i = 1; i < vis.length; i++) { acc += h[i - 1]; const d = Math.abs(tot - 2 * acc); if (d < best) { best = d; k = i; } }
      let cut = k < vis.length ? items.indexOf(vis[k]) : items.length;
      if (bar >= 0) { const r = items.findIndex(e => { const i = ord.indexOf(e.id); return i < 0 || i > bar; }); cut = r < 0 ? items.length : r; }
      place(c1, items.slice(0, cut)); place(c2, items.slice(cut));
      const e1 = !items.slice(0, cut).some(shown) && ![...c1.children].some(e => !own(e) && shown(e)), e2 = !items.slice(cut).some(shown);
      [c1, c2].forEach(c => { const v = [...c.children].filter(e => own(e) && shown(e)); v.forEach((e, i) => e.classList.toggle('ngl-foot', i > 0 && i === v.length - 1 && /^(fDisplay|fOpts|fOptions)$/.test(e.id))); });   // display options at the foot of a panel that has more
      c1.classList.toggle('ngl-empty', e1); c2.classList.toggle('ngl-empty', e2);
      wrap.classList.toggle('ngl-one', e1 || e2);
    } finally { busy = false; }
  }
  let q = 0;
  const later = () => { if (q) return; q = requestAnimationFrame(() => { q = 0; balance(); }); };
  new MutationObserver(later).observe(modal, { subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style', 'data-ngt', 'data-ngl-order'] });
  new MutationObserver(later).observe(ov, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', later);
  later();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
