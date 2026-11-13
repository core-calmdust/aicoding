// "Powered by Praline" — the thinking engine's mark on the games whose AI runs on Praline (claude/praline-spec.md §9,
// addendum "Powered by Praline の表示", 2026-11-11). One file for every game: the page only adds
//   <script src="../shared/praline-badge.js?v=N" defer></script>
// • PC (HeaderBar.MEDIA — mouse, wide, not tall): a small mark fixed at the bottom right of the window, quiet (low opacity),
//   clearer on hover. A game whose own bottom-right element would meet it moves it with data attributes on the script tag:
//   data-bottom="56" / data-right="20" (px from the window's edges), data-place="dock" (inside the online dock's bar, left of
//   its buttons: games whose info column / row reaches down to the dock — Backgammon, Ur, Senet; without the dock it falls
//   back to the corner), data-top="64" (at the top right under the header bar instead), or data-pc="off" (no PC mark: then
//   only the options panel). Without these, an online dock (#dock) along the bottom lifts the mark just above it.
// • phones (everything else): nothing on the screen; the same mark sits at the bottom of the options (gear) panel of
//   shared/headerbar.js (.hbo-pop), under its rows.
// • the 3D full version (フル機能, ?skin=atlas, html.atlas-skin, 2026-11-11): the same — PC at the bottom right (above the
//   online dock), phones at the bottom of the portal bar's gear panel (.hbo-pop.hbo-atlas). Pages inside another page: nothing.
// • the Atlas portal (atlas/index.html loads this with data-portal, 2026-11-11): ① in the footer, beside
//   「トップへ · CALMDUST COLLECTION」 (inline, the footer's size and colour); ② while a Praline game is played on the 3D table
//   (#bv.playing, not the rules tour; the game from the hash #<page>/<id>): PC — fixed at the bottom right, clear of the action
//   bar (.tbar) and the HUD; phones — the icon only, small, at the top right under the やめる button (the bottom holds the action
//   bar, the tab bar and the characters' talk). There the link opens in a
//   new tab (a table game is not saved: leaving would lose it).
// The mark links to the top page's 「ソフトウェア」 (../#software, same tab, as the home button: the games keep their
// position). "Powered by Praline" stays English in every language (a logo); the link's label follows the page language.
// The wordmark is the outlined "Praline" of praline/logo.svg (Outfit 600, no font needed), drawn in the text colour.
(function () {
  'use strict';
  if (window.PralineBadge) return;
  const me = document.currentScript;
  const de = document.documentElement;
  let framed = false; try { framed = window.top !== window.self; } catch (e) { framed = true; }
  if (framed) { window.PralineBadge = { set() {} }; return; }
  const ds = (me && me.dataset) || {};
  const PORTAL = ds.portal != null;
  // the full version (?skin=atlas): at the bottom right above the online dock, as the 2D pages (2026-11-13; it sat in the dock's
  // bar before) — a light pill (the portal's look, legible on any floor). (old note:) the mark went into the
  // online dock's bar (as data-place="dock"), else a light pill in the corner (the portal's look, legible on any floor)
  const SKIN = !PORTAL && (de.classList.contains('atlas-skin') || /[?&]skin=atlas\b/.test(location.search));
  // the games whose AI thinks with Praline (claude/praline-spec.md §2) — the portal shows the mark only for these
  const GAMES = 'xiangqi janggi checkers tafl morris fanorona alquerque reversi shogi chess gomoku go hex amazons ugolki agon konane mancala connect4 dots ur senet ludo backgammon'.split(' ');
  const MQ = (window.HeaderBar && window.HeaderBar.MEDIA) || '(hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4)';
  let href = '../#software';
  try { href = new URL('../#software', me && me.src ? me.src : location.href).href; } catch (e) {}   // (the site's top page, from shared/)
  const AL = { ja: '思考エンジン Praline について', en: 'About Praline, the thinking engine', zh: '关于思考引擎 Praline', 'zh-TW': '關於思考引擎 Praline',
    ko: '사고 엔진 Praline 소개', es: 'Acerca de Praline, el motor de pensamiento', fr: 'À propos de Praline, le moteur de réflexion',
    pt: 'Sobre o Praline, o motor de raciocínio', de: 'Über Praline, die Denk-Engine', ru: 'О движке мышления Praline',
    tr: 'Düşünme motoru Praline hakkında', id: 'Tentang Praline, mesin berpikir', hi: 'सोचने वाले इंजन Praline के बारे में', ar: 'حول Praline، محرك التفكير' };
  const lang = () => { let l = de.lang || 'ja'; if (/^zh-(tw|hk|mo|hant)/i.test(l)) l = 'zh-TW'; else if (!AL[l]) l = String(l).slice(0, 2); return AL[l] ? l : 'en'; };
  const ICON = '<svg class="prlb-ic" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="24" fill="#C9823F"/><circle cx="67.5" cy="30.9" r="14.4" fill="#2A1E17" stroke="#C9823F" stroke-width="4.5"/><circle cx="38.7" cy="40.5" r="21.6" fill="#F5EADB" stroke="#C9823F" stroke-width="4.5"/><circle cx="63.9" cy="64.5" r="16.8" fill="#F5EADB" stroke="#C9823F" stroke-width="4.5"/><circle cx="30.3" cy="70.5" r="12" fill="#2A1E17" stroke="#C9823F" stroke-width="4.5"/></svg>';
  const WORD = '<svg class="prlb-w" viewBox="191 55 222 57" aria-hidden="true"><path fill="currentColor" d="M200.12 90.96V82.87H212.35Q214.75 82.87 216.7 81.88Q218.65 80.89 219.77 79.03Q220.9 77.17 220.9 74.54Q220.9 71.96 219.77 70.1Q218.65 68.24 216.7 67.25Q214.75 66.26 212.35 66.26H200.12V58.17H213.64Q218.55 58.17 222.48 60.16Q226.41 62.14 228.7 65.82Q231 69.5 231 74.54Q231 79.55 228.7 83.23Q226.41 86.91 222.48 88.94Q218.55 90.96 213.64 90.96ZM192.61 110.4V58.17H202.72V110.4Z M235.46 110.4V74.51H245.28V110.4ZM245.28 90.44 241.26 87.58Q242.21 81.11 245.48 77.44Q248.75 73.77 254.68 73.77Q257.31 73.77 259.34 74.6Q261.38 75.43 262.99 77.24L257.01 84.46Q256.14 83.52 254.95 83.05Q253.76 82.57 252.23 82.57Q249.1 82.57 247.19 84.53Q245.28 86.49 245.28 90.44Z M278.36 111.14Q273.43 111.14 269.51 108.7Q265.59 106.26 263.32 102.04Q261.05 97.83 261.05 92.47Q261.05 87.11 263.32 82.9Q265.59 78.68 269.5 76.23Q273.4 73.77 278.36 73.77Q282.13 73.77 285.15 75.27Q288.16 76.77 290.05 79.41Q291.93 82.05 292.15 85.48V99.44Q291.93 102.84 290.08 105.49Q288.24 108.14 285.2 109.64Q282.16 111.14 278.36 111.14ZM280.27 102.19Q284.37 102.19 286.87 99.45Q289.38 96.71 289.38 92.47Q289.38 89.57 288.25 87.37Q287.12 85.18 285.06 83.95Q283 82.72 280.3 82.72Q277.6 82.72 275.53 83.96Q273.45 85.2 272.25 87.4Q271.05 89.59 271.05 92.44Q271.05 95.27 272.23 97.47Q273.4 99.66 275.51 100.93Q277.62 102.19 280.27 102.19ZM288.93 110.4V100.73L290.49 92L288.93 83.29V74.51H298.63V110.4Z M305 110.4V56.68H314.82V110.4Z M321.22 110.4V74.51H331.04V110.4Z M361.69 110.4V89.79Q361.69 86.57 359.68 84.53Q357.68 82.5 354.55 82.5Q352.42 82.5 350.78 83.42Q349.14 84.34 348.2 86Q347.26 87.66 347.26 89.79L343.42 87.83Q343.42 83.67 345.25 80.49Q347.09 77.32 350.36 75.54Q353.63 73.77 357.75 73.77Q361.77 73.77 364.85 75.7Q367.94 77.64 369.73 80.8Q371.51 83.96 371.51 87.66V110.4ZM337.44 110.4V74.51H347.26V110.4Z M394.53 111.19Q388.85 111.19 384.38 108.78Q379.92 106.36 377.37 102.09Q374.81 97.83 374.81 92.44Q374.81 87.09 377.33 82.85Q379.85 78.61 384.15 76.16Q388.45 73.72 393.83 73.72Q399.04 73.72 403.02 76Q407 78.28 409.27 82.33Q411.54 86.37 411.54 91.55Q411.54 92.44 411.44 93.45Q411.34 94.45 411.07 95.77L380.34 95.82V88.75L406.66 88.7L402.56 91.6Q402.51 88.33 401.5 86.13Q400.48 83.94 398.55 82.76Q396.61 81.58 393.83 81.58Q390.91 81.58 388.72 82.9Q386.54 84.21 385.35 86.59Q384.16 88.97 384.16 92.32Q384.16 95.69 385.43 98.14Q386.69 100.58 389.02 101.91Q391.35 103.23 394.48 103.23Q397.26 103.23 399.53 102.27Q401.79 101.3 403.48 99.36L409.09 104.99Q406.46 108.07 402.7 109.63Q398.94 111.19 394.53 111.19Z"/><circle cx="381.2" cy="65.4" r="8.9" fill="#C9823F"/></svg>';
  const CSS = `
.prlb{display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;text-decoration:none!important;color:inherit;direction:ltr;
  font:500 10px/1 system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:.06em;white-space:nowrap;-webkit-tap-highlight-color:transparent}
.prlb .prlb-ic{width:15px;height:15px;flex:none;display:block}
.prlb .prlb-t{display:flex;align-items:center;gap:6px}
.prlb .prlb-by{opacity:.85;text-transform:uppercase}
.prlb .prlb-w{height:11px;width:auto;aspect-ratio:222/57;flex:none;display:block;margin-inline-start:-1px;transform:translateY(-.08em)}
/* (2026-11-12) one line: "POWERED BY" sat ~2px above the wordmark's baseline — both moved onto one baseline, centred on the icon */
.prlb:not(.prlb-pc):not(.prlb-3d) .prlb-by{transform:translateY(.14em)}
.prlb:focus-visible{outline:2px solid var(--accent,#C9823F);outline-offset:3px;border-radius:6px}
/* PC: fixed at the bottom right, quiet */
.prlb-pc{position:fixed;z-index:30;right:var(--prlb-r,14px);bottom:calc(var(--prlb-b,10px) + var(--prlb-lift,0px));padding:5px 8px;border-radius:8px;
  color:var(--text,var(--ink,#888));opacity:.42;transition:opacity .18s,background-color .18s}
/* (PC: stacked — "POWERED BY" over the wordmark — narrow, so it stays clear of the info column's cards) */
.prlb-pc{gap:7px;padding:5px 7px}
.prlb-pc .prlb-ic{width:22px;height:22px}
.prlb-pc .prlb-t{flex-direction:column;align-items:flex-start;gap:3px}
.prlb-pc .prlb-by{font-size:7.5px;letter-spacing:.14em;line-height:1}
.prlb-pc .prlb-w{height:12px;margin:0;transform:none}
.prlb-pc:hover,.prlb-pc:focus-visible{opacity:.95;background:color-mix(in srgb,var(--panel,#808080) 55%,transparent)}
.prlb-pc.prlb-indock{position:static;flex:none;margin-inline-end:4px;padding:3px 6px;opacity:.5}
.prlb-pc.prlb-top{bottom:auto;top:var(--prlb-t,64px)}
html:not(.prlb-on-pc) .prlb-pc{display:none!important}
/* phones: at the bottom of the options panel */
.prlb-foot{display:flex;justify-content:center;margin:6px 4px 2px;padding-top:9px;border-top:1px solid color-mix(in srgb,currentColor 14%,transparent)}
.prlb-foot .prlb{opacity:.6;padding:6px 10px;min-height:32px;border-radius:9px;font-size:10.5px}
.prlb-foot .prlb .prlb-ic{width:16px;height:16px}.prlb-foot .prlb .prlb-w{height:12px}
.prlb-foot .prlb:active{opacity:1;background:color-mix(in srgb,currentColor 8%,transparent)}
html.prlb-on-pc .prlb-foot{display:none!important}
/* the 3D full version: a light pill when not in the dock */
.prlb-pc.prlb-sk:not(.prlb-indock){background:rgba(255,253,247,.86);color:#5a3a12;opacity:.8;border-radius:99px;padding:5px 10px 5px 6px;box-shadow:0 2px 0 rgba(239,227,200,.9)}
.prlb-pc.prlb-sk.prlb-indock{color:inherit}
/* the 3D full version's gear panel (portal look) */
.hbo-atlas .prlb-foot{border-top-color:#efe3c8;margin-top:8px}
.hbo-atlas .prlb-foot .prlb{opacity:.75;font-weight:700}
/* the Atlas portal: ① the footer line (inline, the footer's colour) */
.prlb-fsep{white-space:pre}
.prlb.prlb-inl{gap:5px;vertical-align:middle;opacity:.85;font-size:9.5px;font-weight:700;padding:2px 4px;border-radius:6px;transform:translateY(-2.5px);line-height:1}   /* (on the footer's line: sat a little low beside its text) */
.prlb.prlb-inl .prlb-ic{width:14px;height:14px}.prlb.prlb-inl .prlb-t{gap:5px}.prlb.prlb-inl .prlb-w{height:10.5px}
.prlb.prlb-inl:hover{opacity:1}
@media (max-width:519px){.prlb-fsep{display:none}.prlb.prlb-inl{display:flex;width:max-content;margin:8px auto 0;transform:none}}
/* ② the 3D table while a Praline game is played: a pill at the bottom right (the action bar's look), phones the icon only */
.prlb.prlb-3d{position:absolute;z-index:3;right:calc(14px + env(safe-area-inset-right));bottom:calc(16px + env(safe-area-inset-bottom));padding:6px 10px 6px 7px;border-radius:99px;
  background:rgba(255,253,247,.86);color:#5a3a12;box-shadow:0 2px 0 rgba(239,227,200,.9),0 6px 16px -8px rgba(80,40,0,.45);opacity:.8;gap:7px;transition:opacity .18s}
.prlb.prlb-3d .prlb-ic{width:22px;height:22px}
.prlb.prlb-3d .prlb-t{flex-direction:column;align-items:flex-start;gap:3px}
.prlb.prlb-3d .prlb-by{font-size:7.5px;letter-spacing:.14em;font-weight:700}
.prlb.prlb-3d .prlb-w{height:12px;margin:0;transform:none}
.prlb.prlb-3d:hover{opacity:1}
.prlb.prlb-3d[hidden]{display:none!important}
html:not(.prlb-on-pc) .prlb.prlb-3d{padding:5px;right:calc(10px + env(safe-area-inset-right));bottom:calc(14px + env(safe-area-inset-bottom))}   /* (phones: the icon at the bottom right, 2026-11-13) */
html:not(.prlb-on-pc) .prlb.prlb-3d .prlb-t{display:none}
html:not(.prlb-on-pc) .prlb.prlb-3d .prlb-ic{width:20px;height:20px}
@media print{.prlb-pc,.prlb-3d{display:none!important}}`;
  function mk(cls) {
    const a = document.createElement('a'); a.className = 'prlb ' + cls; a.href = href;
    a.innerHTML = ICON + '<span class="prlb-t"><span class="prlb-by">Powered by</span>' + WORD + '</span>';
    return a;
  }
  const links = [];
  function label() { const t = AL[lang()]; links.forEach(a => { if (a.getAttribute('aria-label') !== t) { a.setAttribute('aria-label', t); a.title = t; } }); }
  let pc = null; const want = {};
  // PralineBadge.set({ bottom, right, top, hidden }) — a game moving / hiding the PC mark at run time (kept until the mark exists)
  function pos(o) {
    for (const k in o) if (o[k] != null) want[k] = o[k];
    if (!pc) return;
    if (want.bottom != null) pc.style.setProperty('--prlb-b', (+want.bottom) + 'px');
    if (want.right != null) pc.style.setProperty('--prlb-r', (+want.right) + 'px');
    if (want.top != null) { pc.classList.add('prlb-top'); pc.style.setProperty('--prlb-t', (+want.top) + 'px'); }
    pc.hidden = !!want.hidden;
  }
  function boot() {
    const st = document.createElement('style'); st.id = 'prlbCss'; st.textContent = CSS; document.head.appendChild(st);
    if (PORTAL) return portal();
    const mq = matchMedia(MQ), on = () => de.classList.toggle('prlb-on-pc', mq.matches);
    on(); (mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on));
    if (ds.pc !== 'off') {
      pc = mk('prlb-pc' + (SKIN ? ' prlb-sk' : '')); links.push(pc); document.body.appendChild(pc);
      pos({ bottom: ds.bottom, right: ds.right, top: ds.top, ...want });
      // the online dock (a bar fixed along the window's bottom, #dock, opened / closed by the player): the mark stays just above it
      let dock = null, ro = null;
      // data-place="dock" (games whose info column / row reaches down to the dock — Backgammon, Ur, Senet): inside the dock's
      // bar instead, right after its spacer (.dk-sp), so it sits left of the online buttons and the status text gives way
      const inDock = () => {
        const sp = ds.place === 'dock' && dock && dock.querySelector('.dock-bar > .dk-sp');
        const ok = !!(sp && mq.matches && dock.getClientRects().length && getComputedStyle(dock).position === 'fixed');
        if (ok) { if (pc.previousElementSibling !== sp) sp.after(pc); }
        else if (pc.parentNode !== document.body) document.body.appendChild(pc);
        pc.classList.toggle('prlb-indock', ok); return ok;
      };
      const lift = () => {
        let h = 0;
        if (!inDock() && dock && dock.isConnected && dock.getClientRects().length && getComputedStyle(dock).position === 'fixed') {
          const r = dock.getBoundingClientRect(); if (r.height && r.bottom >= innerHeight - 2 && r.top > innerHeight * 0.3) h = Math.round(innerHeight - r.top);
        }
        const v = h + 'px'; if (pc.style.getPropertyValue('--prlb-lift') !== v) pc.style.setProperty('--prlb-lift', v);
      };
      const findDock = () => {
        const d = document.getElementById('dock'); if (d === dock) return lift();
        dock = d; if (ro) ro.disconnect(); if (d && window.ResizeObserver) { ro = new ResizeObserver(lift); ro.observe(d); }
        lift();
      };
      findDock();
      new MutationObserver(findDock).observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true });   // (body.dock-open, body.no-online, a dock added later …)
      addEventListener('resize', lift); addEventListener('load', findDock); setTimeout(findDock, 1500);
      pc.addEventListener('click', e => e.stopPropagation());   // (the dock's bar opens / closes on a click)
    }
    // the options panel(s) of shared/headerbar.js: our footer after its row list (headerbar only re-sorts the list)
    const foot = pop => {
      if (pop.querySelector(':scope > .prlb-foot')) return;
      const f = document.createElement('div'); f.className = 'prlb-foot'; const a = mk('prlb-in'); links.push(a); f.appendChild(a); pop.appendChild(f);
      a.addEventListener('click', e => e.stopPropagation());
      label();
    };
    const scan = () => document.querySelectorAll('body > .hbo-pop').forEach(foot);
    scan();
    new MutationObserver(ms => { if (ms.some(m => [...m.addedNodes].some(n => n.nodeType === 1 && n.classList.contains('hbo-pop')))) scan(); }).observe(document.body, { childList: true });
    label();
    new MutationObserver(label).observe(de, { attributes: true, attributeFilter: ['lang'] });
  }
  // the Atlas portal (atlas/index.html): the footer, and the 3D table while a Praline game is played there
  function portal() {
    const mq = matchMedia(MQ), on = () => de.classList.toggle('prlb-on-pc', mq.matches);
    on(); (mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on));
    const ft = document.querySelector('p.foot');
    if (ft && !ft.querySelector('.prlb')) {
      const sep = document.createElement('span'); sep.className = 'prlb-fsep'; sep.textContent = ' · ';
      const a = mk('prlb-inl'); links.push(a); ft.append(sep, a);
    }
    const bv = document.getElementById('bv');
    if (bv) {
      const a = mk('prlb-3d'); a.target = '_blank'; a.rel = 'noopener'; a.hidden = true; links.push(a); bv.appendChild(a);   // (inside the table view, beside its action bar: under its dialogs)
      const gid = () => (location.hash.split('/')[1] || '').replace(/[?&].*$/, '');
      // phones: the bottom holds the action bar, the tab bar and the characters' talk — the icon goes to the top right instead,
      // just under the やめる button (#bvQuit) at the top right
      const fit = () => {
        if (a.hidden || mq.matches) { a.style.removeProperty('--prlb-3dt'); return; }
        const q = document.getElementById('bvQuit'), r = q && q.getClientRects().length ? q.getBoundingClientRect() : null;
        if (r && r.bottom < innerHeight * .3) a.style.setProperty('--prlb-3dt', Math.round(r.bottom + 10) + 'px'); else a.style.removeProperty('--prlb-3dt');
      };
      const sync = () => {
        const show = bv.classList.contains('on') && bv.classList.contains('playing') && !bv.classList.contains('rules') && GAMES.includes(gid());
        if (a.hidden === show) a.hidden = !show;
        fit();
      };
      new MutationObserver(sync).observe(bv, { attributes: true, attributeFilter: ['class'] });
      addEventListener('hashchange', sync); addEventListener('resize', sync); sync();
      setTimeout(sync, 800);   // (the top bar settles after the table view opens)
    }
    label();
    new MutationObserver(label).observe(de, { attributes: true, attributeFilter: ['lang'] });
  }
  window.PralineBadge = { set: o => pos(o || {}) };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
