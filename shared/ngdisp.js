// shared/ngdisp.js — the new-game dialog keeps to the match settings (common rule, 2026-11-13, first reversi / shogi):
//  1. the display options (the checkboxes of #fDisplay / #fOpts) move to the options (gear) panel, in the game's own box
//     (HeaderBar.addOption with group: true): they work at once. The dialog keeps its checkboxes (hidden by html.ng-disp-gear),
//     which the game still reads when a game starts; a gear toggle sets the checkbox and fires its 'change' too.
//  2. AI同士 (AI vs AI): the first AI's level on the left, the second AI's (#fLevel2) on the right — data-ngl-order of the
//     modal follows whether #fLevel2 is shown (shared/nglux.js reads it again on each pass).
//
//   NgDisp.init({
//     label: { ja: 'チェッカー', en: 'Checkers', … },   // the heading of the game's box in the gear
//     settings,                                         // the game's settings object (the toggles' state)
//     save,                                             // stores the settings
//     map: { optRoll: 'autoRoll' },                     // checkbox id → settings key (default: optFooBar → fooBar)
//     skip: ['optCube'],                                // checkboxes that are match settings, not display: stay in the dialog
//     drop: ['optNum'],                                 // checkboxes the gear already has an item for: only hidden in the dialog
//     rated: () => bool,                                // a rated game is going on: 形勢 / コーチ cannot be turned on
//     apply: (key, on) => {},                           // optional: redraw (default: the game's renderBoard / renderInfo / …)
//     order: { watch: 'fLevel,|,fLevel2', other: '' },  // optional: data-ngl-order for AI同士 / the other modes
//   });
(function () {
  const S = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const IC = {
    eval: `<svg ${S}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>`,
    last: `<svg ${S}><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>`,
    anim: `<svg ${S}><path d="M4 12h3M2 7h5M3 17h4"/><circle cx="15" cy="12" r="6"/></svg>`,
    threat: `<svg ${S}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg>`,
    num: `<svg ${S}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 3v18M3 17h18"/></svg>`,
    coach: `<svg ${S}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9 12h.01M12 12h.01M15 12h.01"/></svg>`,
    legal: `<svg ${S}><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="2.6"/></svg>`,
    dice: `<svg ${S}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 15h.01M15 9h.01M9 15h.01"/></svg>`,
    pick: `<svg ${S}><path d="M8 13V5a2 2 0 0 1 4 0v6M12 11V4a2 2 0 0 1 4 0v7M16 10a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.4L3.5 14a2 2 0 0 1 3.4-2L8 13"/></svg>`,
    warn: `<svg ${S}><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17h.01"/></svg>`,
    path: `<svg ${S}><path d="M4 18c4 0 4-12 8-12s4 12 8 12"/></svg>`,
    eye: `<svg ${S}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
    dot: `<svg ${S}><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/></svg>` };
  const iconFor = k => IC[k] || (/roll/i.test(k) ? IC.dice : /pick/i.test(k) ? IC.pick : /danger|atari|forbid/i.test(k) ? IC.warn
    : /coord|num/i.test(k) ? IC.num : /preview|forced|path/i.test(k) ? IC.eye : IC.dot);
  const keyOf = id => { const s = id.replace(/^opt/, ''); return s.charAt(0).toLowerCase() + s.slice(1); };
  const lang = () => (window.LANG || document.documentElement.lang || 'en');

  function order(o) {
    const ov = document.getElementById('newOverlay'), modal = ov && ov.querySelector('.modal'), l2 = document.getElementById('fLevel2');
    if (!modal || !l2) return;
    const W = (o && o.watch) || 'fLevel,|,fLevel2', O = (o && o.other) || '';
    const sync = () => { const watch = !l2.classList.contains('hidden') && !l2.hidden; const v = watch ? W : O; if ((modal.dataset.nglOrder || '') !== v) modal.dataset.nglOrder = v; };
    sync(); new MutationObserver(sync).observe(l2, { attributes: true, attributeFilter: ['class', 'hidden'] });
  }

  function init(o) {
    order(o.order);
    if (!window.HeaderBar || !HeaderBar.addOption) return;
    const box = document.querySelector('#newOverlay #fDisplay, #newOverlay #fOpts'); if (!box) return;
    const skip = new Set(o.skip || []), map = o.map || {};
    const drop = new Set(o.drop || []);
    const all = [...box.querySelectorAll('input[type=checkbox][id]')].filter(cb => !skip.has(cb.id)), cbs = all.filter(cb => !drop.has(cb.id));
    if (!all.length) return;
    document.documentElement.classList.add('ng-disp-gear');
    // the dialog's display box is hidden; with skipped (match) settings in it only those rows stay
    const st = document.createElement('style');
    st.textContent = skip.size ? all.map(cb => `html.ng-disp-gear #newOverlay #${box.id} label:has(> #${cb.id})`).join(',') + '{display:none!important}'
      : `html.ng-disp-gear #newOverlay #${box.id}{display:none!important}`;
    document.head.appendChild(st);
    const S0 = () => typeof o.settings === 'function' ? o.settings() : o.settings;
    // the box's heading: the game's name (o.label, else the title in the header)
    const GL = o.label || (() => { const h = document.querySelector('.brand-l h1, .brand h1, h1'); if (!h) return ''; const c = h.cloneNode(true); c.querySelectorAll('small, .series, svg').forEach(e => e.remove()); return c.textContent.trim(); });
    const redraw = (k, v) => {
      if (o.apply) { try { o.apply(k, v); } catch (e) { console.warn(e); } return; }
      if (k === 'anim') { try { document.documentElement.classList.toggle('no-anim', typeof window.animOn === 'function' ? !window.animOn() : !v); } catch (e) {} }
      for (const f of ['renderBoard', 'renderFx', 'renderInfo', 'renderEval', 'renderAll', 'refresh', 'render']) {
        if (typeof window[f] === 'function') { try { f === 'renderBoard' ? window[f](false) : window[f](); } catch (e) {} if (f === 'renderAll' || f === 'refresh' || f === 'render') break; }
      }
    };
    cbs.forEach(cb => {
      const k = map[cb.id] || keyOf(cb.id), lab = cb.closest('label');
      HeaderBar.addOption({ id: 'disp-' + k, icon: iconFor(k), type: 'toggle', group: true, groupLabel: GL,
        label: () => ((lab || cb.parentNode).textContent || '').trim(),
        disabled: () => (k === 'eval' || k === 'coach') && !!(o.rated && o.rated()),
        get: () => !!(S0() || {})[k],
        set: v => {
          const s = S0(); if (s) s[k] = !!v;
          cb.checked = !!v; try { cb.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
          try { o.save && o.save(); } catch (e) {}
          redraw(k, !!v);
        } });
    });
  }
  window.NgDisp = { init, order };
})();
// Auto: a page that loads this script and has the usual top-level `settings` / `save` (classic scripts share the global
// lexical scope) gets the gear options and the AI同士 order without code of its own; a game that set things up itself
// (html.ng-disp-gear already, e.g. reversi / shogi / amazons) is left alone.
(function () {
  const GAME = (location.pathname.match(/\/([^/]+)\/(?:index\.html)?$/) || [])[1] || '';
  const PER = { backgammon: { map: { optRoll: 'autoRoll' }, skip: ['optCube'] }, gomoku: { skip: ['optConfirm'], drop: ['optNum'] } };
  function auto() {
    if (document.documentElement.classList.contains('ng-disp-gear') || window.NgDispManual) return;
    let s = null, sv = null, rt = null;
    try { s = settings; } catch (e) {}   // eslint-disable-line no-undef
    try { sv = save; } catch (e) {}      // eslint-disable-line no-undef
    try { rt = rtLive; } catch (e) {}    // eslint-disable-line no-undef
    if (!s || typeof s !== 'object') { NgDisp.order(); return; }
    NgDisp.init(Object.assign({ settings: s, save: typeof sv === 'function' ? sv : null, rated: typeof rt === 'function' ? () => { try { return rt(); } catch (e) { return false; } } : null }, PER[GAME] || {}));
  }
  if (document.readyState === 'complete') setTimeout(auto, 0); else addEventListener('load', () => setTimeout(auto, 0));
})();
