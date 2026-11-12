/* =====================================================================
   World Board Game Atlas — shared part of the portal skins (<game>/?skin=atlas)
   AtlasSkin.init(opts) sets up everything that isn't game specific:
     • the 3D table behind the page (Table3D.mount, plain tabletop)
     • the guide character + speech bubbles for lesson / puzzle text
     • the portal's top bar (logo, coins, sound, language, home)
     • the dark → light colour conversion of the game's stylesheet
     • the side column fitted to the board, idle pausing, loading screen,
       and auto-start with the level / side picked on the portal
   opts = { board: <DOM board>, outer(r) → {top, height} of the 3D board on screen,
            guide: img url, guideFallback, bubbles: [[id, id], …], skip: RegExp,
            start(lv, side) → true when it started a game }
   ===================================================================== */
(function () {
  'use strict';
  // the board's own box, without the page's zoom on it (shogi 詰将棋: the board is scaled with a CSS transform — window.__boardZoom
  // {s, tx, ty}, origin 0 0; the layout keeps the board's place, only the picture inside zooms) (2026-11-10)
  function bRect(el) {
    const r = el.getBoundingClientRect(), z = window.__boardZoom; if (!z || !z.s || el.style.transform === '') return r;
    const w = r.width / z.s, h = r.height / z.s, l = r.left - z.tx, t = r.top - z.ty;
    return { left: l, top: t, right: l + w, bottom: t + h, width: w, height: h, x: l, y: t };
  }
  const BASE = '../atlas/';
  function init(o) {
    const T3 = window.Table3D;
    // the canvas lives next to the board and scrolls with it (no per-frame re-alignment while the page scrolls, so no flicker);
    // the floor beyond it is the page background, painted from the same texture
    const holder = o.board.parentElement, host = document.createElement('div'); host.id = 'atlasGL'; host.className = 'local';
    holder.style.isolation = 'isolate'; if (getComputedStyle(holder).position === 'static') holder.style.position = 'relative';
    holder.prepend(host);
    try { T3.mount(host, { plain: o.floor || true, local: true }); } catch (e) { document.documentElement.classList.remove('atlas-skin'); host.remove(); if (window.AtlasLoading) AtlasLoading.hide(); return null; }
    const boardDom = o.board, GUIDE = o.guide, GUIDE_FALLBACK = o.guideFallback || o.guide;
    let unitPx = 40;
    // a 3D look: the board leans back a little; the DOM board gets the same CSS perspective, so clicks and marks still match
    const TILT = o.tilt ?? 0, PERSP = o.persp ?? 2.6;   // 0 = straight down (a tilt looked odd)
    if (TILT) document.documentElement.classList.add('atlas-tilt');
    // the board's own (untransformed) box inside the holder — the DOM board is tilted with a CSS 3D transform below
    const box = () => { let x = 0, y = 0, e = boardDom; while (e && e !== holder) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; } return { x, y, w: boardDom.offsetWidth, h: boardDom.offsetHeight }; };
    const placeHost = () => {   // the canvas covers the board with a margin for the bezel / legs and the shadow
      const b = box(), r = { width: b.w, height: b.h }; if (!b.w) return;
      const m = Math.round(Math.max(b.w, b.h) * (typeof o.margin === 'function' ? o.margin() : o.margin ?? .3));   // o.margin: a flat board with a short shadow needs less canvas (fewer pixels to draw)
      Object.assign(host.style, { left: (b.x - m) + 'px', top: (b.y - m) + 'px', width: (b.w + 2 * m) + 'px', height: (b.h + 2 * m) + 'px' });
      if (TILT) boardDom.style.transform = `perspective(${Math.round(b.h * PERSP)}px) rotateX(${TILT}deg)`;   // (untilted: the board's transform is left to the game — senet's phone focus moves it)
      if (o.units) unitPx = r.height / o.units;
      paintFloor();
    };
    const floorURL = {};   // per place (Table3D.table()): the floor picture as a data URL, made once
    const GAME = (location.pathname.match(/([^/]+)\/(?:index\.html)?$/) || [])[1] || '';
    // the floor stays put while the online dock is open (or opening / closing): the board moves and shrinks over it, the
    // table does not (its grain followed the board's place and size before) — repainted again only for a new window size
    // (and once the dock has been opened, also after it is closed again: the closed layout may come back a few px different)
    let floorVP = '', floorHeld = false;
    function paintFloor(force) {
      try {
        const vp = innerWidth + 'x' + innerHeight, cl = document.documentElement.classList;
        if (vp !== floorVP || force) floorHeld = false;
        if (floorVP && !force && (document.body.classList.contains('dock-open') || cl.contains('dock-anim'))) floorHeld = true;
        if (floorVP && floorHeld && vp === floorVP) return;
        const F = T3.floorImage(o.floor === 'tatami' ? 'tatami' : 'wood', GAME); if (!F) return;
        floorVP = vp;
        const de = document.documentElement.style, k = T3.table ? T3.table() : 0;
        cl.toggle('atlas-place-dark', !!F.dark);
        if (F.css) {   // 2D準拠: the game's own 2D page background, as it is
          de.setProperty('background', F.css); de.setProperty('background-attachment', 'fixed');
          return;
        }
        de.removeProperty('background');
        const fk = k + ':' + (F.img.__v || 1);   // (the tatami is redrawn from a photo once loaded: a new picture)
        if (!floorURL[fk]) floorURL[fk] = F.img.toDataURL('image/jpeg', .86);
        const over = F.over ? F.over + ',' : '', n = F.over ? (() => { let d = 0, c = 1; for (const ch of F.over) { if (ch === '(') d++; else if (ch === ')') d--; else if (ch === ',' && !d) c++; } return c; })() : 0, rep = (v) => Array(n).fill(v).join(', ') + (n ? ', ' : '');
        de.setProperty('background-image', `${over}linear-gradient(rgba(0,0,0,.05),rgba(0,0,0,.05)),url("${floorURL[fk]}")`);
        de.setProperty('background-size', `${rep('100% 100%')}auto, ${Math.round(F.w * unitPx)}px ${Math.round(F.h * unitPx)}px`);
        de.setProperty('background-repeat', `${rep('no-repeat')}repeat, repeat`); de.setProperty('background-attachment', `${rep('fixed')}scroll, scroll`);
        const r = bRect(boardDom);   // the tile grid is centred on the board, like the 3D floor
        de.setProperty('background-position', `${rep('0 0')}0 0, ${Math.round(r.left + scrollX + r.width / 2 - F.w * unitPx / 2)}px ${Math.round(r.top + scrollY + r.height / 2 - F.h * unitPx / 2)}px`);
      } catch (e) {}
    }
    // another place / brightness chosen (the デザイン tab, or another tab of the series): the floor follows at once
    addEventListener('atlas-table', () => paintFloor(true));
    addEventListener('atlas-floor', () => paintFloor(true));
    let alignHooked = false;
    const alignTo = (units, top) => {
      o.units = units; placeHost();
      // window.__boardZoom {s, tx, ty}: the game scales its DOM board with a CSS transform (shogi's 詰将棋 zoom) — the camera follows it
      T3.align(() => { const b = box(), z = window.__boardZoom; if (z && z.s > 1) { b.x += z.tx; b.y += z.ty; b.w *= z.s; b.h *= z.s; } return { x: b.x - host.offsetLeft, y: b.y - host.offsetTop, w: b.w, h: b.h, tilt: TILT, persp: b.h * PERSP }; }, units, top);
      if (!alignHooked) {   // (once: a skin that re-aligns on a turn of the phone / a new board added these again every time — the page got slower)
        alignHooked = true;
        addEventListener('resize', () => requestAnimationFrame(placeHost));
        addEventListener('dockrelayout', placeHost);   // the online dock (shared/headerbar.js): the canvas follows the new layout at once
        if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(placeHost)).observe(boardDom);
      }
      setTimeout(placeHost, 300); setTimeout(placeHost, 1200);
    };

  /* ---------- guide character: lesson / puzzle text as speech bubbles ---------- */
  const guide = new Image(); guide.src = GUIDE; guide.onerror = () => { guide.src = GUIDE_FALLBACK; };
  // absolute URLs: a relative url() in a custom property resolves against skin.css (atlas/skin/), not the page
  const abs = u => new URL(u, location.href).href;
  document.documentElement.style.setProperty('--atlas-guide', `url("${abs(GUIDE)}"), url("${abs(GUIDE_FALLBACK)}")`);
  function bubble(ids) {
    const first = document.getElementById(ids[0]); if (!first || first.closest('.atlas-guide')) return;
    const wrap = document.createElement('div'); wrap.className = 'atlas-guide';
    const pic = document.createElement('div'); pic.className = 'pic'; pic.appendChild(guide.cloneNode());
    pic.firstChild.onerror = function () { this.onerror = null; this.src = GUIDE_FALLBACK; };
    const bub = document.createElement('div'); bub.className = 'bub';
    // the bubble sits where the text was; the guide stands below it, in one footer row with all the card's buttons
    first.parentNode.insertBefore(wrap, first); wrap.append(bub);
    ids.forEach(id => { const e = document.getElementById(id); if (e) bub.appendChild(e); });
    const card = wrap.closest('.card'), rows = card ? [...card.querySelectorAll(':scope > .lesson-actions')] : [];
    const foot = document.createElement('div'); foot.className = 'atlas-foot';
    const btns = document.createElement('div'); btns.className = 'atlas-btns';
    rows.forEach(r => { [...r.children].forEach(b => btns.appendChild(b)); r.remove(); });
    // the compact action bar of the cards (shared/cardbar.js: icon tools · primary button, × in the corner) stands beside the guide
    const cb = card && card.querySelector('.cb-bar');
    foot.append(pic); if (cb) foot.append(cb); if (!cb || btns.children.length) foot.append(btns); (card || wrap).appendChild(foot);
    if (cb) foot.classList.add('cb-foot');
    // a little pop whenever the guide says something new
    new MutationObserver(() => { if (!bub.animate) return; if (!pic.getAnimations || !pic.getAnimations().some(x => x.id === 'talk')) { const an = pic.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-6px) scale(1.05,.95)' }, { transform: 'translateY(0) scale(1)' }], { duration: 320 }); an.id = 'talk'; } })
      .observe(bub, { childList: true, characterData: true, subtree: true });
  }
    (o.bubbles || []).forEach(bubble);

  /* ---------- the per-game profile prompt is replaced by the portal's shared account ---------- */
  const pf = document.getElementById('profOverlay');
  if (pf) { const shut = () => { if (pf.classList.contains('show')) { const b = document.getElementById('pfLater'); if (b) b.click(); } }; new MutationObserver(shut).observe(pf, { attributes: true, attributeFilter: ['class'] }); shut(); }

  /* ---------- idle: pause CSS/SVG animations while the tab is hidden or the window isn't focused ---------- */
  (function idle() {
    const st = document.createElement('style'); st.textContent = 'html.atlas-idle *,html.atlas-idle *::before,html.atlas-idle *::after{animation-play-state:paused!important}'; document.head.appendChild(st);
    const set = () => { const on = !document.body.classList.contains('in-online') && (document.hidden || !document.hasFocus()); /* (a live online game keeps moving: the opponent's moves, 2026-11-12) */ document.documentElement.classList.toggle('atlas-idle', on); document.querySelectorAll('svg').forEach(s => { try { on ? s.pauseAnimations() : s.unpauseAnimations(); } catch (e) {} }); };
    document.addEventListener('visibilitychange', set); addEventListener('blur', set); addEventListener('focus', set);
    new MutationObserver(set).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  })();
  /* ---------- light theme: convert the game's dark-theme colours rule by rule ---------- */
  (function retheme() {
    const SKIP = new RegExp('\\b(board|cell|disc|ghost|hint|star|last-mark|odot|sqlbl|edgeband|fx-|confetti|overlay\\b|coach|toast|rbpv|rb-d\\b|pmark|pdot|stone|swatch|piece|atlas-' + (o.skip ? '|' + o.skip : '') + ')');
    const parse = v => { let m = v.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; } m = v.match(/^#([0-9a-f]{3,8})$/i); if (m) { let h = m[1]; if (h.length <= 4) h = h.split('').map(c => c + c).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length > 6 ? parseInt(h.slice(6, 8), 16) / 255 : 1]; } return null; };
    const lum = ([r, g, b]) => (.2126 * r + .7152 * g + .0722 * b) / 255, sat = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    const rgba = (r, g, b, a) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${+a.toFixed(3)})`;
    const fg = c => { if (lum(c) < .5) return null; if (sat(c) > .25) return rgba(c[0] * .62, c[1] * .55, c[2] * .45, Math.max(.85, c[3])); return rgba(43, 48, 68, Math.max(.62, c[3])); };
    const bg = c => { const L = lum(c);
      if (L > .85 && c[3] < .35) return rgba(150, 100, 40, Math.min(.22, c[3] * 1.8 + .04));    // faint white tint → warm tint
      if (L < .3 && c[3] > .55) return rgba(255, 252, 244, c[3]);                                  // dark panel → cream
      if (L < .3 && c[3] <= .55) return rgba(120, 80, 30, c[3] * .35);                             // dark wash → light warm wash
      return null; };
    const bd = c => { if (lum(c) > .6 && c[3] < .5) return rgba(150, 110, 50, Math.min(.5, c[3] * 2 + .1)); if (lum(c) < .3) return rgba(220, 196, 150, Math.max(.6, c[3])); return null; };
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch (e) { continue; }
      if (!rules || (sh.href && /skin\.css/.test(sh.href))) continue;
      const walk = list => { for (const r of list) {
        if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; }
        if (!r.style || !r.selectorText || SKIP.test(r.selectorText)) continue;
        const st = r.style;
        const c = st.getPropertyValue('color'); if (c) { const p = parse(c.trim()); const n = p && fg(p); if (n) st.setProperty('color', n, st.getPropertyPriority('color')); }
        const b = st.getPropertyValue('background-color') || (/^\s*(rgba?\(|#)[^,]*$/.test(st.getPropertyValue('background')) ? st.getPropertyValue('background') : '');
        if (b) { const p = parse(b.trim()); const n = p && bg(p); if (n) st.setProperty('background', n, st.getPropertyPriority('background')); }
        ['border-color', 'border-top-color', 'border-bottom-color', 'border-left-color', 'border-right-color'].forEach(k => { const v = st.getPropertyValue(k); if (v) { const p = parse(v.trim()); const n = p && bd(p); if (n) st.setProperty(k, n); } });
      } };
      walk(rules);
    }
  })();

  /* ---------- PC (o.pc = { vars: the page's board-size custom properties, extras: selector of other parts of the board group }):
     board + the fixed 360px info column, laid out from the 3D board's VISIBLE frame (its projected meshes), not the DOM box:
     the board as large as fits between the portal bar and the online dock, the column's top / bottom = the frame's top / bottom,
     GAP px between them, the whole group centred — the same in every game, at every window size (resize, full screen, zoom) ===== */
  let pcActive = false, pcReview = false, sideFitFn = null;   // (pcReview: pcFit's fitReview places the column — sideFit keeps out)
  (function pcFit() {
    const P = o.pc, THREE = window.THREE; if (!P || !THREE || !T3.project) return;
    const MQ = matchMedia((window.HeaderBar && HeaderBar.MEDIA) || '(hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4)');
    const de = document.documentElement, body = document.body, app = document.querySelector('.app'), side = app && app.querySelector(':scope > .side');
    if (!side) return;
    const GAP = 24, MY = 24, MX = 20, VARS = P.vars || ['--cell'];
    let K = null, model = null, busy = false, on = false, reT = 0;
    // refits asked for by remeasure() alone (no outside change in between) are capped: on some boards (shogi, morris, checkers) the
    // measured frame and the fit kept nudging each other by a fraction of a pixel — a refit (and redraw) every ~2 s, forever
    // (and a frame that only goes back to one already used since the last outside change — two values taking turns — is not refitted:
    // the board and the column were seen shaking by a few px after the online dock closed)
    let refits = 0, usedK = [], checks = 0, chkT = 0; const ext = f => function () { refits = 0; usedK = []; checks = 0; return f.apply(this, arguments); };
    // the board model on the table (skins call T3.show(id, model) — also for a new board size / variant)
    const show0 = T3.show;
    T3.show = function (id, m) { const g = show0.apply(this, arguments); if (m) { const same = model && model.userData && m.userData && model.userData.n === m.userData.n && model.userData.nh === m.userData.nh; model = m; K = P.fit2d && de.classList.contains('atlas-2d') ? k2d() : same ? K : null; /* (the last frame stays until the new one is measured: the skins show the board again on the online dock's relayout, and with no frame the page's own layout took over for ~2 s — the board shrank and moved, then came back, 2026-11-12) */ refits = 0; usedK = []; checks = 0; remeasure(); } return g; };
    const align0 = T3.align;   // (the camera follows the DOM board only once a skin has aligned it: measure again then)
    T3.align = function () { const r = align0.apply(this, arguments); refits = 0; usedK = []; checks = 0; remeasure(); return r; };
    if (T3.turn) T3.turn = ext(T3.turn);   // (盤面反転: the frame turns with the board)
    const grp = () => { let g = boardDom; while (g && g.parentElement !== app) g = g.parentElement; return g; };
    // the frame as the game's own 2D board takes it (P.k2dFix: shogi's 3D board made deeper for the PC komadai bars — not the 2D plate's margin)
    const k2 = m => (P.k2dFix && m ? P.k2dFix(m, model) : m);
    const visible = x => { for (let e = x; e; e = e.parent) if (!e.visible) return false; return true; };
    // the 3D board's visible extent beyond the DOM board, in DOM board heights (the camera is aligned to the DOM board, so this
    // does not change with the size or the place of the board)
    function measure() {
      if (!model || !model.parent || !visible(model) || de.classList.contains('atlas-2d')) return null;   // (the game's own 2D board: the 3D one is hidden, its projection meaningless)
      const r = boardDom.getBoundingClientRect(), h = r.height; if (h < 40) return null;
      const cur = model.parent, v = new THREE.Vector3(), L = []; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
      cur.updateMatrixWorld(true);
      model.traverse(m => {
        if (!m.isMesh || !m.geometry || !visible(m) || m.userData.contact) return;
        const mt = Array.isArray(m.material) ? m.material[0] : m.material;
        if (!mt || mt.visible === false || mt.colorWrite === false || mt.isShadowMaterial || (mt.transparent && mt.opacity < .99)) return;
        if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
        const bx = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld); if (isFinite(bx.min.x)) L.push(bx);
      });
      // the board itself: the large parts (frame, field, base) — not the pieces, a bowl beside it or the legs under it
      const area = b => (b.max.x - b.min.x) * (b.max.z - b.min.z), big = Math.max(0, ...L.map(area));
      L.forEach(bx => {
        if (!P.all && area(bx) < big * .3) return;   // (P.all: every part counts — connect4's thin rails are its top)
        for (let i = 0; i < 8; i++) {
          v.set(i & 1 ? bx.max.x : bx.min.x, i & 2 ? bx.max.y : bx.min.y, i & 4 ? bx.max.z : bx.min.z); cur.worldToLocal(v);
          const p = T3.project(v.x, v.z, v.y); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
        }
        n++;
      });
      if (!n || !isFinite(x0)) return null;
      return { l: (r.left - x0) / h, r: (x1 - r.right) / h, t: (r.top - y0) / h, b: (y1 - r.bottom) / h };
    }
    // measured a few frames after the camera has followed the board (twice the same → settled)
    let mq = 0;
    function remeasure() {
      const my = ++mq; T3.kick(400);
      const step = (k, prev) => setTimeout(() => {   // (timers, not frames: frames stop in a background tab)
        if (my !== mq) return;
        if (de.classList.contains('dock-anim')) return setTimeout(() => step(k, prev), 300);
        const m = measure();
        const same = m && prev && ['l', 'r', 't', 'b'].every(s => Math.abs(m[s] - prev[s]) < .0004);
        if (!same && k < 12) return setTimeout(() => step(k + 1, m), 90);
        if (!m) return k < 40 ? setTimeout(() => step(k + 1, null), 250) : undefined;
        // (a refit that follows a refit needs a clearer change: the frame measured right after a fit can differ by a few tenths of
        // a px each time — the board then grew and shrank by 2–4 px for a couple of seconds)
        const tol = refits ? .004 : .0008, differs = (a, t = tol) => ['l', 'r', 't', 'b'].some(s => Math.abs(m[s] - a[s]) > t);
        try { if (P.fit2d) localStorage.setItem('atlas-k2d2', JSON.stringify(k2(m))); } catch (e) {}
        if (!K || differs(K)) { if (refits >= 4 || usedK.some(a => !differs(a))) { K = m; settle(); return; } refits++; if (K) usedK.push(K); K = m; fit(); }
        // a frame a little off the one the layout was made for (a fraction of a px — or the refits are over): the board stays as it
        // is (a refit would move the camera and the frame once more), only the column (and the review box) are put against the
        // frame as it really is drawn, so the gaps and the edges match exactly
        else if (differs(K, .0001)) { K = m; settle(); }
        // once more a little later (a few times after each outside change): on a busy machine the camera can follow the board
        // only after two equal measurements — the layout then stayed a px or two off the frame as finally drawn
        if (checks < 3) { checks++; clearTimeout(chkT); chkT = setTimeout(remeasure, 1200); }
      }, 40);
      setTimeout(() => step(0, null), 60);
    }
    const reviewBox = () => [...document.querySelectorAll('.app > #rvBox, .app > .rvbox, .app > .rbox, body > .rbox')].some(b => b.getClientRects().length);
    const is2 = () => de.classList.contains('atlas-2d');
    const want = () => MQ.matches && K && (!is2() || P.fit2d) && getComputedStyle(side).display !== 'none' && !reviewBox() && (is2() || visible(model));
    // 振り返り with the review box under the board (reversi, shogi…): the page lays the board, the column and the box out itself (its
    // grid), sized for the flat board — the 3D frame reaching past it would slip under the portal bar or onto the box. So the board is
    // shrunk until its 3D frame fits between the bar and the box with MY px to spare above and below, and moved down (with the column)
    let rvOn = false, rbShare = .32;
    const rvBox = () => [...document.querySelectorAll('.app > #rvBox, .app > .rvbox, .app > .rbox, body > .rbox')].find(b => b.getClientRects().length);
    const wantRv = () => MQ.matches && K && (!is2() || P.fit2d) && getComputedStyle(side).display !== 'none' && !!rvBox() && (is2() || visible(model));
    // 振り返り with the review box under the board (reversi, chess, shogi…): laid out like the page's own 2D grid — the board, the
    // column beside it and the box under both — but from the 3D frame (it reaches past the flat board the grid is sized for): the
    // column the page's column gap to the right of the frame, level with its top and bottom; the box the page's row gap under
    // them, from the frame's left edge to the column's right edge; the board as large as fits with the box between the portal bar
    // and the online dock (MY px to spare), the whole group centred
    function fitReview() {
      const g = grp(), rb = rvBox(); if (!g || !rb) return;
      busy = true;
      try {
        rvOn = true; pcReview = true; unplace(); setVar(null);
        const GP = GPc = gaps();   // (the page's own gaps, measured with its grid as it is: the box still in it)
        // the box leaves the page's grid (placed below; kept in it, a box wider than the flat board's track would widen the track)
        // (its height too, as the page's grid gave it: with the online dock open, headerbar.js makes the box's row shorter)
        rbEl = rb; const r0 = rb.getBoundingClientRect(), w0 = r0.width;
        if (getComputedStyle(rb).position !== 'fixed') { rb.style.setProperty('position', 'absolute', 'important'); rb.style.setProperty('margin', '0', 'important'); rb.style.setProperty('left', '0px', 'important'); rb.style.setProperty('top', '0px', 'important'); }
        rb.style.setProperty('width', w0 + 'px', 'important'); rb.style.setProperty('max-width', 'none', 'important'); rb.style.setProperty('min-width', '0px', 'important');
        if (r0.height > 0) { rb.style.setProperty('height', r0.height + 'px', 'important'); rb.style.setProperty('box-sizing', 'border-box', 'important'); }
        const { top, bot } = room(), SW = side.offsetWidth || 360;
        // (the online dock open: the 2D page lays everything out smaller (headerbar.js shrinks its --vh until it fits), the box
        // too — here the box keeps the share of the height it has with the dock closed, so the board is not the only one to shrink)
        let RH = rb.offsetHeight || 0;
        if (!body.classList.contains('dock-open')) rbShare = RH / Math.max(1, bot - top);
        else if (RH > rbShare * (bot - top)) { RH = Math.max(Math.min(RH, 140), rbShare * (bot - top)); rb.style.setProperty('height', RH + 'px', 'important'); rb.style.setProperty('box-sizing', 'border-box', 'important'); }
        const availH = bot - top - RH - GP.y, availW = innerWidth - 2 * MX - GP.x - SW;
        size(availW, availH);
        prepSide(g);
        const px = (el, p) => parseFloat(getComputedStyle(el)[p]) || 0, appShift = -(parseFloat(getComputedStyle(app).top) || 0);
        for (let i = 0; i < 4; i++) {
          const E = extent(frame()), W = (E.r - E.l) + GP.x + SW, Hh = (E.b - E.t) + GP.y + RH;
          const dx = (innerWidth - W) / 2 - E.l, dy = top + (bot - top - Hh) / 2 - (E.t + appShift);
          if (Math.abs(dx) > .3) g.style.left = (px(g, 'left') + dx) + 'px';
          if (Math.abs(dy) > .3) g.style.top = (px(g, 'top') + dy) + 'px';
          const ok = placeSide(GP.x) & placeBox(rb, GP.y);
          if (ok && Math.abs(dx) <= .3 && Math.abs(dy) <= .3) break;
        }
        placeHost();
        checks = 0; clearTimeout(reT); reT = setTimeout(remeasure, 250);
      } finally { busy = false; }
    }
    // the box: the row gap under the frame (and the column), from the frame's left edge to the column's right edge → true when in place
    function placeBox(rb, gy) {
      const px = (el, p) => parseFloat(getComputedStyle(el)[p]) || 0;
      const F2 = frame(), E2 = extent(F2), sr = side.getBoundingClientRect(), rr = rb.getBoundingClientRect();
      const bw = sr.right - E2.l, bx = E2.l - rr.left, by = Math.max(E2.b, sr.bottom) + gy - rr.top;
      if (Math.abs(rr.width - bw) > .3) rb.style.setProperty('width', bw + 'px', 'important');
      if (Math.abs(bx) > .3) rb.style.setProperty('left', (px(rb, 'left') + bx) + 'px', 'important');
      if (Math.abs(by) > .3) rb.style.setProperty('top', (px(rb, 'top') + by) + 'px', 'important');
      return Math.abs(rr.width - bw) <= .3 && Math.abs(bx) <= .3 && Math.abs(by) <= .3;
    }
    // the frame as measured now, the board left as it is: the column (and the box) against it once more
    let GPc = null;
    function settle() {
      if (busy || !GPc || de.classList.contains('dock-anim')) return;
      busy = true;
      try {
        if (rvOn && rbEl && rbEl.getClientRects().length) { for (let i = 0; i < 3; i++) if (placeSide(GPc.x) & placeBox(rbEl, GPc.y)) break; }
        else if (on) { for (let i = 0; i < 3; i++) if (placeSide(GPc.x)) break; }
      } finally { busy = false; }
    }
    // the gaps of the page's own (2D) layout: its grid's column gap between the board and the column, its row gap above the box
    function gaps() {
      const cs = getComputedStyle(app), x = parseFloat(cs.columnGap), y = parseFloat(cs.rowGap);
      return { x: x > 0 ? x : GAP, y: y > 0 ? y : (x > 0 ? x : GAP) };
    }
    // the free area: under the portal bar, above the online dock (its bar, or the opened dock), MY px to spare
    function room() {
      const bar = [...document.querySelectorAll('.atlas-top, header.hb')].find(b => b.getClientRects().length && getComputedStyle(b).position === 'fixed');
      const top = (bar ? bar.getBoundingClientRect().bottom : 0) + MY;
      const dk = document.getElementById('dock') || document.querySelector('.dock');
      let bot = innerHeight; if (dk && dk.getClientRects().length && getComputedStyle(dk).position === 'fixed') bot = Math.min(bot, dk.getBoundingClientRect().top);
      return { top, bot: bot - MY };
    }
    // the board size: as large as its frame (and the parts beside it) fits both ways (a few passes: not every part scales with the board)
    function size(availW, availH) {
      setVar(null);
      const pr = document.createElement('div'); pr.style.cssText = `position:absolute;visibility:hidden;width:var(${VARS[0]})`; body.appendChild(pr);
      const s0 = pr.offsetWidth; pr.remove();
      let s = s0 || 40;
      for (let i = 0; i < 6; i++) {
        setVar(s); const E = extent(frame()), k = Math.min(availH / (E.b - E.t), availW / (E.r - E.l));
        if (Math.abs(k - 1) < .0015) break;
        s = Math.max(8, s * k);
      }
      const E = extent(frame()); if ((E.b - E.t) > availH + .5 || (E.r - E.l) > availW + .5) { s *= Math.min(availH / (E.b - E.t), availW / (E.r - E.l)); setVar(s); }
    }
    function prepSide(g) {
      if (getComputedStyle(g).position === 'static') g.style.position = 'relative';
      if (getComputedStyle(side).position === 'static') side.style.position = 'relative';
      side.style.setProperty('max-height', 'none', 'important');
      { const si = side.querySelector(':scope > .side-in'); if (si) { si.style.setProperty('height', '100%', 'important'); si.style.setProperty('max-height', '100%', 'important'); } }   // (the cards scroll inside the column, also in the dock's compact mode)
    }
    // the column: gx px right of the board group, its top / bottom level with the 3D frame's → true when nothing had to move
    function placeSide(gx) {
      const px = (el, p) => parseFloat(getComputedStyle(el)[p]) || 0;
      const F2 = frame(), E2 = extent(F2), sr = side.getBoundingClientRect(), V = P.sideOnExtent && P.sideOnExtent() ? E2 : F2;   // (shogi, a PC window up to 3:2: level with the komadai bars above and below the frame)
      const fh = V.b - V.t, sx = E2.r + gx - sr.left, sy = V.t - sr.top;
      if (Math.abs(sr.height - fh) > .3) { side.style.setProperty('height', fh + 'px', 'important'); side.style.setProperty('min-height', '0px', 'important'); }
      if (Math.abs(sx) > .3) side.style.left = (px(side, 'left') + sx) + 'px';
      if (Math.abs(sy) > .3) side.style.top = (px(side, 'top') + sy) + 'px';
      return Math.abs(sx) <= .3 && Math.abs(sy) <= .3 && Math.abs(sr.height - fh) <= .3;
    }
    const setVar = v => VARS.forEach(k => { if (v == null) { de.style.removeProperty(k); body.style.removeProperty(k); } else { de.style.setProperty(k, v + 'px', 'important'); body.style.setProperty(k, v + 'px', 'important'); } });
    const frame = () => { const r = bRect(boardDom), h = r.height; return { l: r.left - K.l * h, t: r.top - K.t * h, r: r.right + K.r * h, b: r.bottom + K.b * h }; };
    const extent = F => {
      if (P.place) P.place(F);   // the game's own parts beside the board (shogi: the komadai) placed against the 3D frame first
      const E = { ...F };
      if (P.extras) app.querySelectorAll(P.extras).forEach(e => {
        if (!e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return;
        if (P.extraOff && P.extraOff(e)) return;   // (a part the game lays elsewhere for now — shogi 詰将棋: sente's stand under the column)
        const q = e.getBoundingClientRect(); if (q.width < 1 || q.height < 1) return;
        E.l = Math.min(E.l, q.left); E.t = Math.min(E.t, q.top); E.r = Math.max(E.r, q.right); E.b = Math.max(E.b, q.bottom);
      });
      return E;
    };
    let rbEl = null;
    const unplace = () => { if (rbEl) { ['position', 'margin', 'margin-left', 'left', 'top', 'width', 'max-width', 'min-width', 'height', 'box-sizing'].forEach(k => rbEl.style.removeProperty(k)); rbEl = null; } const g = grp(); if (g) { g.style.left = ''; g.style.top = ''; } side.style.left = ''; side.style.top = ''; side.style.removeProperty('height'); side.style.removeProperty('max-height'); side.style.removeProperty('min-height'); { const si = side.querySelector(':scope > .side-in'); if (si) { si.style.removeProperty('height'); si.style.removeProperty('max-height'); } } if (P.unplace) P.unplace(); };
    // the game's own 2D board (html.atlas-2d, PC): the page lays the board and the column out itself, sized for the 2D board — no
    // place left over from the 3D layout (the 3D frame is wider than the flat board: the group stayed where the 3D board had put it,
    // off to one side), and the board + column centred in the window (2026-11-07: tafl and the other games with a 2D / 3D switch)
    let c2T = 0;
    function center2d() {
      const g = grp(); if (!g || !MQ.matches) return;
      g.style.left = ''; g.style.top = ''; side.style.left = '';
      clearTimeout(c2T); c2T = setTimeout(() => {
        if (!de.classList.contains('atlas-2d') || on || rvOn || de.classList.contains('dock-anim')) return;
        if (getComputedStyle(side).display === 'none' || getComputedStyle(side).position === 'fixed') return;
        const a = g.getBoundingClientRect(), s = side.getBoundingClientRect(); if (a.width < 40 || s.width < 40) return;
        if (s.left < a.right - 4 && a.left < s.right - 4) return;   // (stacked, not side by side: the page's own phone-like layout)
        const L = Math.min(a.left, s.left), R = innerWidth - Math.max(a.right, s.right), dx = (R - L) / 2;
        if (Math.abs(dx) <= 2 || L + dx < 0) return;
        [g, side].forEach(e => { if (getComputedStyle(e).position === 'static') e.style.position = 'relative'; e.style.left = ((parseFloat(e.style.left) || 0) + dx) + 'px'; });
      }, 60);
    }
    let fitKey = '';
    function fit() {
      if (busy) return;
      if (de.classList.contains('dock-anim')) { setTimeout(later, 150); return; }   // the dock's move first (headerbar.js), then the layout
      const key = innerWidth + 'x' + innerHeight; if (key !== fitKey) { fitKey = key; setTimeout(later, 350); setTimeout(later, 1200); }   // a new window size: once more when everything has settled
      if (wantRv()) { if (on) { on = false; pcActive = false; setVar(null); unplace(); } fitReview(); return; }
      if (rvOn) { rvOn = false; pcReview = false; setVar(null); unplace(); }
      if (!want()) { if (on) { on = false; pcActive = false; setVar(null); unplace(); if (sideFitFn) sideFitFn(); } if (de.classList.contains('atlas-2d')) center2d(); return; }
      const g = grp(); if (!g) return;
      busy = true;
      try {
        on = true; pcActive = true; unplace();
        // (the page's own centring shift of .app — shared/headerbar.js, set before this layout took over — is cleared here, not
        // later: the group placed against it stood a dock's height too high, behind the portal bar, until headerbar.js reset it — if ever, 2026-11-12)
        if (parseFloat(app.style.top)) app.style.top = '0px';
        const GP = GPc = gaps(), { top, bot } = room(), SW = side.offsetWidth || 360, availH = bot - top, availW = innerWidth - 2 * MX - GP.x - SW;
        size(availW, availH);
        // the place: the group (board + column) centred; the column level with the frame, the page's gap to the right of the board
        prepSide(g);
        const px = (el, p) => parseFloat(getComputedStyle(el)[p]) || 0, appShift = -(parseFloat(getComputedStyle(app).top) || 0);
        for (let i = 0; i < 4; i++) {
          const F = frame(), E = extent(F), W = (E.r - E.l) + GP.x + SW;
          const dx = (innerWidth - W) / 2 - E.l, dy = top + (availH - (E.b - E.t)) / 2 - (E.t + appShift);   // (centred as if the online dock's shift of .app were not there: headerbar.js then leaves it at 0)
          if (Math.abs(dx) > .3) g.style.left = (px(g, 'left') + dx) + 'px';
          if (Math.abs(dy) > .3) g.style.top = (px(g, 'top') + dy) + 'px';
          if (placeSide(GP.x) && Math.abs(dx) <= .3 && Math.abs(dy) <= .3) break;
        }
        if (P.afterSide) P.afterSide(frame(), side.getBoundingClientRect());   // (parts laid against the column, once it stands)
        placeHost(); kVars();
        checks = 0; clearTimeout(reT); reT = setTimeout(remeasure, 250);   // check the frame again once the camera has followed the new size
      } finally { busy = false; }
    }
    function kVars() { if (!P.fit2d || !K) return; const h = bRect(boardDom).height; ['l', 't', 'r', 'b'].forEach(k => de.style.setProperty('--k2' + k, (K[k] * h).toFixed(2) + 'px')); }
    let q = 0; const later = () => { if (q) return; q = 1; const go = () => { if (!q) return; q = 0; fit(); }; requestAnimationFrame(go); setTimeout(go, 120); };   // (a timer too: frames wait while the window is hidden or occluded)
    const laterX = ext(later);
    addEventListener('resize', laterX);
    addEventListener('dockrelayout', ext(fit));   // the online dock's probe (shared/headerbar.js): laid out at once, for its final place
    addEventListener('fullscreenchange', () => { laterX(); setTimeout(laterX, 250); });
    if (window.visualViewport) visualViewport.addEventListener('resize', laterX);
    MQ.addEventListener ? MQ.addEventListener('change', laterX) : MQ.addListener(laterX);
    if (window.ResizeObserver) { new ResizeObserver(laterX).observe(de); new ResizeObserver(later).observe(boardDom); }   // (the board's own size: mostly the fit itself)
    // back from the game's own 2D board to the 3D one: the frame is measured afresh (a measurement taken while the 3D board was hidden
    // left the board shrunk to a few px — reversi: 3D → 2D → 3D in the デザイン tab)
    // P.fit2d (shogi): the game's own 2D board is laid out exactly as the 3D one — the same frame (K: the 3D board's extent beyond the
    // DOM board, as last measured in 3D, else P.k2d), so the board, the komadai and the column sit at the very same px; the 2D wood is
    // drawn over that frame (--k2l/t/r/b: its margins in px around the DOM board) (2026-11-10)
    const k2d = () => { try { const v = JSON.parse(localStorage.getItem('atlas-k2d2') || 'null'); if (v && v.l > 0 && v.l < .5) return v; } catch (e) {} return P.k2d || null; };
    if (P.fit2d && de.classList.contains('atlas-2d') && !K) { K = k2d(); setTimeout(laterX, 60); }
    let was2d = de.classList.contains('atlas-2d');
    new MutationObserver(() => { const is2d = de.classList.contains('atlas-2d'); if (is2d !== was2d) { was2d = is2d; K = is2d && P.fit2d ? (K ? k2(K) : k2d()) : null; refits = 0; usedK = []; checks = 0; if (!is2d) { setTimeout(remeasure, 60); setTimeout(ext(remeasure), 700); } } laterX(); }).observe(de, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(() => { laterX(); setTimeout(laterX, 320); setTimeout(laterX, 700); }).observe(body, { attributes: true, attributeFilter: ['class'] });   // (the online dock opens / closes with a .25s transition: once more at its end)
    { const dk = document.getElementById('dock') || document.querySelector('.dock'); if (dk) { dk.addEventListener('transitionend', laterX); if (window.ResizeObserver) new ResizeObserver(laterX).observe(dk); } }   // (and its size: a dock opened while the page was still loading — the portal's オンライン — left the board laid out for the closed dock, behind the open one, 2026-11-12)
    if (document.fonts) document.fonts.ready.then(laterX);
    [800, 2000, 4500].forEach(ms => setTimeout(ext(remeasure), ms));
    setInterval(() => { if (!document.hidden && innerWidth + 'x' + innerHeight !== fitKey) laterX(); }, 700);   // a missed resize (full screen, zoom) never leaves the old size
    window.__atlasPcFit = { fit, remeasure, measure, K: () => K, on: () => on || rvOn, model: () => model, board: () => boardDom, extras: P.extras };   // (test hook)
  })();

  /* ---------- side column = exactly the height of the 3D board; info line inside the kifu card ---------- */
  (function sideFit() {
    const side = document.querySelector('.side'), kc = document.querySelector('.kifu-card'), info = document.getElementById('infoLine');
    if (kc && info) kc.appendChild(info);
    if (!side || !o.outer) return;
    const fit = sideFitFn = () => {
      if (document.documentElement.classList.contains('dock-anim')) return;   // the online dock's FLIP (shared/headerbar.js) moves it; fitted again at its end
      if (pcActive || pcReview) return;   // PC: pcFit below places the column (and sizes the board) — also in the review layout (fitReview):
      // two fits writing the column's top / height in turn made it jump and (in the online dock's review mode, where the CSS
      // height is 0 until a fit sets it) vanish and reappear, forever — each change restarted the dock's move watcher
      side.style.top = ''; side.style.height = ''; side.style.maxHeight = '';
      const r = bRect(boardDom), s = side.getBoundingClientRect();
      if (!r.width || s.left < r.right - 4 || getComputedStyle(side).display === 'contents') return;   // only when the column sits beside the board
      if (document.documentElement.classList.contains('atlas-2d')) return;   // the game's own 2D board: the page's own layout
      const B = o.outer(r);
      side.style.position = 'relative'; side.style.top = (B.top - s.top) + 'px'; side.style.height = B.height + 'px'; side.style.maxHeight = 'none';
    };
    addEventListener('resize', () => requestAnimationFrame(fit));
    addEventListener('dockrelayout', fit);   // within the online dock's probe (shared/headerbar.js): the column is measured with the board
    if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(fit)).observe(boardDom);
    fit(); setTimeout(fit, 120); setTimeout(fit, 600); setTimeout(fit, 1200); if (document.fonts) document.fonts.ready.then(fit);
  })();
  // 形勢 / コーチ / 棋譜 の境目ドラッグ: shared/headerbar.js (sideSplit) — every page, the 2D games too (2026-11-12)
  /* ---------- ルール（RuleTour）: the text card reaches up to the mini board (the board box is often wider than the board drawn in it) ---------- */
  (function rtFit() {
    let q = 0;
    const fit = () => { q = 0;
      document.querySelectorAll('.rt-row .rt-main.has-board').forEach(m => {
        const b = m.querySelector(':scope > .rt-board'), sd = m.querySelector(':scope > .rt-side'); if (!b || !sd) return;
        let el = b.firstElementChild;
        while (el && el.children.length === 1 && el.firstElementChild.children.length) el = el.firstElementChild;
        if (!el) return; let l = 1e9; for (const c of (el.children.length ? el.children : [el])) { const r = c.getBoundingClientRect(); if (r.width) l = Math.min(l, r.left); }
        const free = l - b.getBoundingClientRect().left - 26;   // (room for the frame)
        sd.style.marginInlineEnd = free > 8 && !de.classList.contains('atlas-2d') ? -Math.floor(free) + 'px' : '';
      }); };
    const de = document.documentElement;
    new MutationObserver(() => { if (!q && document.querySelector('.rt-row')) q = requestAnimationFrame(fit); }).observe(document.body, { childList: true, subtree: true });
    addEventListener('resize', () => setTimeout(fit, 200));
  })();
  /* ---------- 新しい対局: the two columns are as tall as the dialog has room for (2026-11-13) ----------
     Their bottom (and its frosted band) ends above the dialog's own band over the buttons, whatever the head above them (the
     「はじめての方へ」 offer comes and goes) — so the dialog itself has nothing to scroll; only a column that is longer scrolls. */
  (function ngFit() {
    const fit = () => document.querySelectorAll('.modal .ng-cols').forEach(cols => {
      const m = cols.closest('.modal'), act = m && m.querySelector('.modal-actions');
      if (!m || !act) return;
      if (!cols.getClientRects().length) { m.classList.remove('ng-fit'); return; }
      const top = cols.getBoundingClientRect().top - m.getBoundingClientRect().top + m.scrollTop;
      let avail = m.clientHeight - top - (act.offsetHeight - 48) - 52;   // (the buttons' box reaches 48px under the dialog's edge; 52: the frosted band over the buttons, and a gap)
      cols.style.setProperty('--ngmax', Math.max(240, Math.floor(avail)) + 'px'); m.classList.toggle('ng-fit', avail >= 240);
      const over = m.scrollHeight - m.clientHeight;   // (whatever else is in the dialog under the columns: take it off too, so the dialog has nothing to scroll)
      if (over > 0 && avail - over >= 240) { avail -= over; cols.style.setProperty('--ngmax', Math.floor(avail) + 'px'); }
    });
    let q = 0; const later = () => { if (!q) q = requestAnimationFrame(() => { q = 0; fit(); }); };
    addEventListener('resize', later);
    if (window.ResizeObserver) { const ro = new ResizeObserver(later); document.querySelectorAll('.modal').forEach(m => { if (m.querySelector('.ng-cols')) ro.observe(m); }); }
    new MutationObserver(later).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'], attributeOldValue: false });
  })();
  // the board is drawn and the game is set up → lift the "loading" overlay (after a couple of rendered frames)
  function ready(waitStart) {
    const t0 = performance.now();
    const f = () => {   // wait until the new-game dialog has really closed (the start can take a moment), then a few settled frames
      if (waitStart && document.querySelector('#newOverlay.show') && performance.now() - t0 < 6000) return setTimeout(f, 120);
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => { if (window.AtlasLoading) AtlasLoading.hide(); }, 450)));
    };
    setTimeout(f, 250);
  }   // let fonts, the side column fit and the first frames settle
  // phones: the fixed menu bar's height for the page's top padding (skin.css --ctlh, 2026-11-11)
  (function ctlH() { const c = document.querySelector('.card.controls'); if (!c || !window.ResizeObserver) return;
    // (hidden — a puzzle or a lesson hides the menu bar: no room kept for it, or the page starts low with an empty band above the
    //  card, 2026-11-11 the user on 詰将棋)
    const set = () => { const h = c.offsetHeight; document.documentElement.style.setProperty('--ctlh', (h || (getComputedStyle(c).display === 'none' ? 0 : 64)) + 'px'); }; new ResizeObserver(set).observe(c); set(); })();
  /* ---------- opened from the portal with a level / side: start right away ---------- */
  (function autoStart() {
    const q = new URLSearchParams(location.search), lv = +q.get('lv'), side = +q.get('side'), mode = q.get('mode') || 'ai';
    if ((!lv && !side && mode === 'ai') || !o.start) { ready(false); return; }
    let tries = 0;
    const go = () => {
      if (lv && window.ProSet && ProSet.suspend) ProSet.suspend();   // (a level chosen on the portal: PRO customizations are off for this page only, kept saved)
      let ok = false; try { ok = o.start(lv, side, mode); } catch (e) { ok = true; }
      if (ok === null && ++tries < 40) return setTimeout(go, 150);   // the page isn't ready yet
      ready(true);
      q.delete('lv'); q.delete('side'); q.delete('mode'); history.replaceState(null, '', location.pathname + '?' + q.toString() + location.hash);   // a reload doesn't restart
    };
    setTimeout(go, 400);
  })();
  /* ---------- 盤面反転 (shared/flipbtn.js) in 3D: the table turns round 180° ----------
     The game redraws its DOM board turned round at once; the 3D board (Table3D.turn) and the DOM board on top of it (marks,
     labels, sprites, the click targets) then start half a turn back — the old view — and turn smoothly to the new one, as if the
     camera walked round the table. While turning, both are scaled down a little so the board's corners stay inside the canvas
     and the window. o.turn:
       (default) round the vertical axis, seen from above;  'y' = a front view (connect4: the tower turns round its upright axis);
       false = no turn (the board model isn't symmetric: the dots notebook)
     o.hold: the skin keeps its 3D pieces at the board's own places (it doesn't mirror the game's turned board): the table stays
       turned round while flipped (yaw π); without it the skin's pieces / sprites already follow the turned board and the 3D board
       turns back home (yaw π → 0)
     o.upright: selector of DOM sprites that stand up (3/4 renders) — they stay upright while turning. */
  let turnRaf = 0;
  const flipNow = () => !!(window.FlipBtn && FlipBtn.on());
  const holdYaw = () => (o.hold && flipNow() ? Math.PI : 0);
  function turnRest() { if (!T3.turn) return; const y = holdYaw(); T3.turn(y ? y : null, 1); }   // where the table rests for the current flip
  function turnTable() {
    if (o.turn === false || !T3.turn) return;
    cancelAnimationFrame(turnRaf);
    const st = boardDom.style, ups = o.upright ? [...boardDom.querySelectorAll(o.upright)] : [];
    const clear = () => { st.rotate = st.scale = ''; ups.forEach(e => { e.style.rotate = ''; }); };
    const b = box();
    if (document.documentElement.classList.contains('atlas-2d') || !host.getClientRects().length || !b.w) { turnRaf = 0; clear(); turnRest(); document.documentElement.classList.remove('atlas-turning'); return; }   // (the 2D board: no turn, the 3D one rests in place for later)
    const front = o.turn === 'y', Y1 = holdYaw(), d = Y1 ? -1 : 1;   // yaw = Y1 + d·a while a goes π → 0
    const m = Math.round(Math.max(b.w, b.h) * (typeof o.margin === 'function' ? o.margin() : o.margin ?? .3));
    let ow = b.w, oh = b.h;   // the 3D board's outer size on screen (its frame round the field)
    try { const r = boardDom.getBoundingClientRect(), q = o.outer && o.outer(r); if (q && q.height > r.height) { ow = b.w + (q.height - r.height) * b.w / r.width; oh = b.h + (q.height - r.height) * b.h / r.height; } } catch (e) {}
    // the room it may take while turning: the canvas, and the window below the top bar (a board that fills the screen zooms out a little more)
    let hw = b.w / 2 + m, hh = b.h / 2 + m;
    try { const r = boardDom.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, tb = bar.getBoundingClientRect(), y0 = tb.height && getComputedStyle(bar).position === 'fixed' ? tb.bottom : 0;
      hw = Math.max(b.w / 2, Math.min(hw, cx, innerWidth - cx)); hh = Math.max(b.h / 2, Math.min(hh, cy - y0, innerHeight - cy)); } catch (e) {}
    const room = a => { const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)); return Math.min(.94 * 2 * hw / (ow * c + oh * s), .94 * 2 * hh / (ow * s + oh * c)); };   // (.94: the bezel's shadow too)
    // one smooth dip: scale = 1 − K·sin(a) — down once to its least at 90°, back up, on the same curve as the turn (following the
    // fit frame by frame looked like shrinking and growing twice: it dips at the diagonals). K is set once, from the worst case
    // between the diagonals (45° … 135°: the corners stay in the room there; a board that fills its room may brush the edge for a
    // moment just after the start / before the end)
    const r0 = Math.min(1, room(0)); let K = 0;
    if (!front) for (let i = 0; i <= 45; i++) { const a = Math.PI / 4 + i * Math.PI / 90, f = Math.min(1, room(a) / r0); K = Math.max(K, (1 - f) / Math.sin(a)); }
    K = Math.min(K, .5); const fit = a => 1 - K * Math.sin(a);
    const D = window.__atlasTurnMs || 900, t0 = performance.now(), ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const deg = a => (a * 180 / Math.PI).toFixed(2) + 'deg';
    const pose = a => {   // a: the angle still to go (π → 0)
      const s = fit(a); if (window.__atlasTurnLog) window.__atlasTurnLog.push([a, s]);   // (a test hook: the turn frame by frame)
      T3.turn(Y1 + d * a, s);
      if (front) st.rotate = 'y ' + deg(-d * a);
      else { st.rotate = deg(-d * a); st.scale = s.toFixed(4); ups.forEach(e => { e.style.rotate = deg(d * a); }); }
    };
    const done = () => { turnRaf = 0; clear(); turnRest(); T3.kick(300); document.documentElement.classList.remove('atlas-turning'); };
    const step = now => { const k = window.__atlasTurnK ?? Math.min(1, (now - t0) / D);   // (__atlasTurnK: a fixed point of the turn, for checking it)
      if (k >= 1) return done(); pose(Math.PI * (1 - ease(k))); turnRaf = requestAnimationFrame(step); };
    document.documentElement.classList.add('atlas-turning');   // (html.atlas-turning: glare layers over the board fade out meanwhile — skin.css)
    pose(Math.PI); turnRaf = requestAnimationFrame(step);
  }
  /* ---------- the portal's top bar: logo, coins, language, home (same layout as the portal) ---------- */
    const lang = () => (document.getElementById('langSel') || {}).value || 'ja';
    const TITLE = { ja: '世界のボドゲ大百科', en: 'World Board Game Atlas', zh: '世界桌游大全', ko: '세계의 보드게임 대전', es: 'Atlas Mundial de Juegos de Mesa', fr: 'Atlas mondial des jeux de société', pt: 'Atlas Mundial de Jogos de Tabuleiro', de: 'Welt-Brettspielatlas', hi: 'विश्व बोर्ड गेम एटलस', ar: 'أطلس ألعاب الطاولة', ru: 'Атлас настольных игр', 'zh-TW': '世界桌遊大百科', id: 'Atlas Permainan Papan Dunia', tr: 'Dünya Masa Oyunları Atlası' };
    const bar = document.createElement('header'); bar.className = 'atlas-top';
    bar.innerHTML = `<a class="atlas-brand" href="${BASE}"><img src="${BASE}logo.svg" alt="" width="44" height="44"><span><b class="wmT"></b><small>World Board Game Atlas</small></span></a><span class="sp"></span>
      <span class="atlas-coin"><i>¢</i><b class="coinN">0</b></span>
      <button type="button" class="atlas-ic" id="atlasFlip" aria-label="Flip"></button>
      <button type="button" class="atlas-ic" id="atlasRec" aria-label="Record"></button>
      <button type="button" class="atlas-ic" id="atlasSnd" aria-label="Sound"></button>
      <button type="button" class="atlas-lbtn" id="atlasLang" aria-label="Language"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg><b class="lc">JA</b></button>
      <div class="atlas-lpop" id="atlasLangPop" hidden></div>
      <a class="atlas-ic" href="${BASE}" aria-label="Portal"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/></svg></a>`;
    document.body.appendChild(bar);
    // sound: reuse the game's own button
    const snd = document.getElementById('btnSound'), mySnd = bar.querySelector('#atlasSnd');
    if (snd) { mySnd.innerHTML = snd.innerHTML; mySnd.onclick = () => { snd.click(); mySnd.className = 'atlas-ic ' + snd.className.replace(/\bsnd\b/, ''); }; mySnd.className = 'atlas-ic ' + snd.className.replace(/\bsnd\b/, ''); } else mySnd.remove();
    // board flip: mirror the game's 盤面反転 button (shared/flipbtn.js)
    const flp = document.getElementById('btnFlip'), myFlp = bar.querySelector('#atlasFlip');
    if (flp) {
      let was = flp.classList.contains('on');
      const sync = () => {
        const on = flp.classList.contains('on');
        if (myFlp.innerHTML !== flp.innerHTML) myFlp.innerHTML = flp.innerHTML;
        myFlp.title = flp.title; myFlp.setAttribute('aria-label', flp.getAttribute('aria-label') || flp.title); myFlp.setAttribute('aria-pressed', on ? 'true' : 'false');
        myFlp.className = 'atlas-ic' + (on ? ' flipped' : '');
        if (on !== was) { was = on; turnTable(); }   // the button or the F key: the table turns round (the game has already redrawn the board turned)
      };
      myFlp.onclick = () => flp.click(); sync(); new MutationObserver(sync).observe(flp, { attributes: true });
      turnRest();   // (a board already flipped when the page opens: a 'hold' skin's table starts turned round)
    } else myFlp.remove();
    // 戦績: mirror the game's record button (shared/record.js — on PC an icon in the icon set; the phones' tab bar keeps its own tab)
    const myRec = bar.querySelector('#atlasRec');
    (function recMirror(n) {
      const rec = document.getElementById('btnRecord');
      if (!rec) { if (n < 40 && window.GameRecord !== undefined) setTimeout(() => recMirror(n + 1), 150); else if (n >= 40 || !window.GameRecord) myRec.remove(); return; }
      const svg = () => { const s = rec.querySelector('svg'); return s ? s.outerHTML : ''; };
      const sync = () => { const h = svg(); if (h && myRec.innerHTML !== h) myRec.innerHTML = h; myRec.title = rec.title; myRec.setAttribute('aria-label', rec.getAttribute('aria-label') || rec.title); };
      myRec.onclick = () => { if (window.GameRecord && GameRecord.open) GameRecord.open(); else rec.click(); };
      sync(); new MutationObserver(sync).observe(rec, { attributes: true, childList: true, subtree: true });
      // phones: the record is a tab in the bottom bar (shared/infotabs.js) — no second way in up here while that tab is shown
      const tabbed = () => { const t = document.querySelector('.grc-tab'); myRec.hidden = !!(t && t.getClientRects().length); };
      tabbed(); addEventListener('resize', () => setTimeout(tabbed, 60)); setTimeout(tabbed, 600); setTimeout(tabbed, 2000);
    })(0);
    const sel = document.getElementById('langSel'), pop = bar.querySelector('#atlasLangPop'), lbtn = bar.querySelector('#atlasLang');
    /* ---------- 3D board or the game's own 2D board (picked in the new-game dialog's デザイン tab) ----------
       view({ key, row, html(label) → the 3D tile's inner HTML, label: {ja, en, …}, cls: [classes only for the 3D look], on(is3d) })
       puts a "3D" tile first in the board row (row); picking any of the game's 2D boards there shows the plain 2D board in the
       portal's frame (html.atlas-2d: the 3D canvas hidden, the skin's 3D-only classes off), the 3D tile brings the 3D board back.
       The choice is kept (localStorage key). Returns { is3d(), set(is3d) }. */
    const V3L = { ja: '3D盤', en: '3D board', zh: '3D棋盘', ko: '3D 보드', es: 'Tablero 3D', fr: 'Plateau 3D', pt: 'Tabuleiro 3D', de: '3D-Brett', hi: '3D बोर्ड', ar: 'لوحة ثلاثية الأبعاد', ru: '3D-доска', 'zh-TW': '3D棋盤', id: 'Papan 3D', tr: '3D tahta' };
    function view(v) {
      if (!document.getElementById('a3vCss')) {
        const st = document.createElement('style'); st.id = 'a3vCss';
        st.textContent = `button.a3v{position:relative}
button.a3v .a3vpic{display:grid!important;place-items:center;width:100%;aspect-ratio:var(--a3v-ar,6/5);border-radius:8px;overflow:hidden;background:radial-gradient(85% 85% at 50% 38%,#fff9ea,#f1dfba 70%,#e3c98f)!important;box-shadow:inset 0 0 0 1px rgba(170,120,40,.25)!important}
button.a3v .a3vpic img{display:block;width:86%!important;height:86%!important;object-fit:contain;filter:drop-shadow(0 4px 5px rgba(90,50,10,.3))}
button.a3v::after{content:'3D';position:absolute;top:8px;inset-inline-start:8px;padding:1px 7px;border-radius:99px;background:linear-gradient(180deg,#ffcf5c,#e09a00);color:#fff;font:900 10.5px/1.5 'Fredoka',system-ui,sans-serif;letter-spacing:.06em;box-shadow:0 2px 0 #b97a00;pointer-events:none}
html.atlas-2d #atlasGL{display:none!important}
html.atlas-skin #bdRow.a3v-row{display:grid}html.atlas-skin .a3v-row ~ .bd-note{display:none!important}`;
        document.head.appendChild(st);
      }
      if (!v.html) v.html = l => `<span class="th a3vpic"><img src="${v.img}" alt="" draggable="false"></span><span class="nm"></span>`.replace('<span class="nm"></span>', `<span class="nm">${l}</span>`);
      if (!v.label) v.label = V3L;
      let is3 = true; try { const s = localStorage.getItem(v.key); if (s === '2d') is3 = false; } catch (e) {}
      if (typeof v.init === 'boolean') is3 = v.init;   // (a skin with its own 3D / 2D tiles keeps its own saved look: no tile here, it calls set())
      const vlang = () => (document.getElementById('langSel') || {}).value || document.documentElement.lang || 'ja';
      const row = v.row; let tile = null;
      if (row) { tile = document.createElement('button'); tile.type = 'button'; tile.className = 'a3v'; tile.dataset.a3view = '1'; row.prepend(tile); }
      const paint = () => { if (!tile) return; const L = v.label || {}; tile.innerHTML = v.html(L[(l => /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : String(l).slice(0, 2))(vlang())] || L.en || '3D'); fix(); };
      function fix() {   // 3D: the tile is the choice (the game's own buttons are not); 2D: the game's own choice
        if (!tile) return;
        if (row.firstElementChild !== tile) row.prepend(tile);   // the game redrew its row (innerHTML): the 3D tile goes back first
        if (tile.classList.contains('sel') !== is3) tile.classList.toggle('sel', is3);
        if (tile.getAttribute('aria-pressed') !== String(is3)) tile.setAttribute('aria-pressed', String(is3));
        if (is3) row.querySelectorAll('button:not([data-a3view])').forEach(b => { if (b.classList.contains('sel')) b.classList.remove('sel'); if (b.getAttribute('aria-pressed') === 'true') b.setAttribute('aria-pressed', 'false'); });
      }
      function apply() {
        const de = document.documentElement;
        de.classList.toggle('atlas-2d', !is3); (v.cls || []).forEach(c => de.classList.toggle(c, is3));
        host.style.display = is3 ? '' : 'none';
        try { if (v.on) v.on(is3); } catch (e) {}
        fix();
        if (is3) { placeHost(); T3.kick(800); }
        [0, 150, 600].forEach(ms => setTimeout(() => dispatchEvent(new Event('resize')), ms));   // the side column / board size follow
      }
      function set(t) { t = !!t; if (t === is3) { fix(); return; } is3 = t; try { localStorage.setItem(v.key, is3 ? '3d' : '2d'); } catch (e) {} apply(); }
      if (row) {
        row.addEventListener('click', e => {
          const b = e.target.closest('button'); if (!b || b.disabled || !row.contains(b)) return;
          if (b === tile) { e.stopImmediatePropagation(); set(true); return; }
          set(false);   // a 2D board (the game's own handler then picks it as usual)
        }, true);
        new MutationObserver(fix).observe(row, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-pressed'] });
        row.classList.add('a3v-row');
      }
      paint(); if (sel) sel.addEventListener('change', () => setTimeout(paint, 40));
      apply();
      return { is3d: () => is3, set };
    }
    const NAMES = { ja: 'Japanese', en: 'English', zh: 'Chinese', ko: 'Korean', es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German', hi: 'Hindi', ar: 'Arabic', ru: 'Russian', 'zh-TW': 'Chinese', id: 'Indonesian', tr: 'Turkish' };
    function fitWM(b, sm) { if (!b || !sm) return; sm.style.fontSize = ''; const k = b.querySelector('.wk'); if (!k || sm.hidden) return; const r = document.createRange(); r.setStartAfter(k); r.setEnd(b, b.childNodes.length); const mw = r.getBoundingClientRect().width, sw = sm.scrollWidth; if (mw > 0 && sw > mw) sm.style.fontSize = Math.max(7, parseFloat(getComputedStyle(sm).fontSize) * mw / sw * .98) + 'px'; }
    // the title never gets cut off: if it doesn't fit beside the buttons, its font steps down (to 12px at least)
    function fitT(b) { if (!b) return; b.style.fontSize = ''; if (document.documentElement.classList.contains('atlas-land')) return; const cw = b.clientWidth, sw = b.scrollWidth; if (cw > 0 && sw > cw + .5) b.style.fontSize = Math.max(12, parseFloat(getComputedStyle(b).fontSize) * cw / sw * .99) + 'px'; }
    const fitB = () => { fitT(bar.querySelector('.wmT')); fitWM(bar.querySelector('.wmT'), bar.querySelector('.atlas-brand small')); };
    if (document.fonts) document.fonts.ready.then(fitB); addEventListener('resize', fitB);
    const paint = () => { { const w = bar.querySelector('.wmT'), KW = {"en": ["WORLD", "Board Game Atlas"], "es": ["ATLAS MUNDIAL", "Juegos de Mesa"], "fr": ["ATLAS MONDIAL", "Jeux de société"], "pt": ["ATLAS MUNDIAL", "Jogos de Tabuleiro"], "de": ["WELT", "Brettspiel-Atlas"], "id": ["ATLAS DUNIA", "Permainan Papan"], "tr": ["DÜNYA ATLASI", "Masa Oyunları"]}[lang()]; if (KW) { w.textContent = ''; const k = document.createElement('i'); k.className = 'wk'; k.textContent = KW[0]; w.append(k, KW[1]); } else w.textContent = TITLE[lang()] || TITLE.en; } bar.querySelector('.atlas-brand small').hidden = lang() === 'en'; fitB(); lbtn.querySelector('.lc').textContent = lang().toUpperCase(); };
    lbtn.onclick = e => { e.stopPropagation(); if (!pop.hidden) { pop.hidden = true; return; }
      pop.innerHTML = [...sel.options].map(o => `<button type="button" data-l="${o.value}" aria-selected="${o.value === lang()}"><b>${o.text}</b><small>${o.value.toUpperCase()} · ${NAMES[o.value]}</small></button>`).join('');
      pop.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { pop.hidden = true; if (sel.value !== b.dataset.l) { sel.value = b.dataset.l; sel.dispatchEvent(new Event('change')); } setTimeout(paint, 50); });
      pop.hidden = false; };
    document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target)) pop.hidden = true; });
    if (sel) sel.addEventListener('change', () => setTimeout(paint, 50));
    paint();
    // the options button (common rule 2026-11-07, shared/headerbar.js): 戦績・サウンド・言語 in one gear panel; 盤面反転,
    // 横画面 (#atlasLand) and home stay in the bar. The language list opens under the gear.
    if (window.HeaderBar && HeaderBar.options) HeaderBar.options({ host: bar, theme: 'atlas', id: 'atlasOpts', gearClass: 'atlas-ic',
      after: '#atlasLand, a.atlas-ic',
      keep: el => !/^(atlasSnd|atlasLang)$/.test(el.id) && !el.classList.contains('hbo-x'),   // (atlasRec: kept outside by headerbar.js, before the gear)
      onClose: () => { if (pop.dataset.side) pop.hidden = true; },
      onLang: (b, g, side) => { const br = bar.getBoundingClientRect(), rtl = getComputedStyle(bar).direction === 'rtl';
        // beside the options panel, level with the language row, when there is room (2026-11-13); otherwise under the gear
        if (side && !pop.hidden && pop.dataset.side) { pop.hidden = true; return 'side'; }
        if (side && pop.hidden) {
          pop.style.visibility = 'hidden'; lbtn.click(); const w = pop.offsetWidth, h = pop.offsetHeight, P = side.panel, R = side.row, M = 8;
          const left = rtl ? P.right + 10 : P.left - 10 - w;
          if (left >= M && left + w <= innerWidth - M) {
            const top = Math.max(M, Math.min(R.top + R.height / 2 - h / 2, innerHeight - M - h));
            if (!pop._home) pop._home = pop.parentNode; pop.style.fontFamily = getComputedStyle(pop).fontFamily; document.body.appendChild(pop);   // (above the page: the bar's own stacking put it under the dock / the talk bubble)
            pop.style.position = 'fixed'; pop.style.left = Math.round(left) + 'px'; pop.style.right = 'auto'; pop.style.top = Math.round(top) + 'px'; pop.style.zIndex = '1000';
            pop.dataset.side = '1'; pop.style.visibility = ''; return 'side';
          }
          pop.hidden = true; pop.style.visibility = '';
        }
        delete pop.dataset.side; pop.style.zIndex = ''; pop.style.position = ''; if (pop._home && pop.parentNode !== pop._home) pop._home.appendChild(pop);
        pop.style.top = Math.round(g.bottom - br.top + 8) + 'px';
        if (rtl) { pop.style.left = Math.max(0, Math.round(g.left - br.left)) + 'px'; pop.style.right = 'auto'; } else { pop.style.right = Math.max(0, Math.round(br.right - g.right)) + 'px'; pop.style.left = 'auto'; }
        if (pop.hidden) lbtn.click(); } });
    // coins: same numbers as the portal (shared/atlas.js)
    const coins = () => { try { const A = window.Atlas; if (!A) return; const W = A.load(); bar.querySelector('.coinN').textContent = A.coins(W, A.achievements(A.allProgress(), W)).balance.toLocaleString(); } catch (e) {} };
    // re-read whenever the shared account's sync lands (it can pull the portal's wallet and other games' progress after the page
    // opened), another tab changes the store, or the page comes back — the bar then always shows the portal's number (2026-11-09)
    setTimeout(coins, 300); document.addEventListener('visibilitychange', () => { if (!document.hidden) coins(); });
    addEventListener('storage', e => { if (!e.key || e.key === 'atlas-v1' || e.key === 'atlas-sync-meta') coins(); });
    { let tries = 0; const hook = () => { if (window.AtlasAccount && AtlasAccount.on) { AtlasAccount.on(st => { if (!st.syncing) coins(); }); return; } if (++tries < 40) setTimeout(hook, 250); }; hook(); }
    [2500, 8000].forEach(ms => setTimeout(coins, ms));
    document.querySelectorAll('a.snd.home, .brand a.series').forEach(a => { a.href = BASE; });
    placeField();
    // AI games: the boss of the level and a watching creature talk now and then (atlas/npc/npc.js, common rule 2026-11-09)
    (function npc() {
      if (o.npc === false || !GAME) return;
      const s = document.createElement('script'); s.src = BASE + 'npc/npc.js?v=30'; s.onload = () => { try { window.AtlasNPC.skin(GAME); } catch (e) {} };
      setTimeout(() => document.head.appendChild(s), 1500);   // after the board and the first frames
    })();
    return { T3, ready, alignTo, view };
  }
  /* ---------- 場所 (the table design, shared with the portal) and 明るさ: the first row of the new-game dialog's デザイン tab ---------- */
  // 時間帯 (the room's time of day: 自動 = the clock), beside 明るさ in the デザイン tab (2026-11-13; the same as the portal's board view)
  const TODK = ['auto', 'morning', 'day', 'evening', 'night'];
  const TOD = { ja: ['自動', '朝', '昼', '夕方', '夜'], en: ['Auto', 'Morning', 'Day', 'Evening', 'Night'], zh: ['自动', '早晨', '白天', '傍晚', '夜晚'], ko: ['자동', '아침', '낮', '저녁', '밤'], es: ['Auto', 'Mañana', 'Día', 'Tarde', 'Noche'], fr: ['Auto', 'Matin', 'Jour', 'Soir', 'Nuit'], pt: ['Auto', 'Manhã', 'Dia', 'Tarde', 'Noite'], de: ['Auto', 'Morgen', 'Tag', 'Abend', 'Nacht'], hi: ['ऑटो', 'सुबह', 'दिन', 'शाम', 'रात'], ar: ['تلقائي', 'صباح', 'نهار', 'مساء', 'ليل'], ru: ['Авто', 'Утро', 'День', 'Вечер', 'Ночь'], 'zh-TW': ['自動', '早晨', '白天', '傍晚', '夜晚'], id: ['Otomatis', 'Pagi', 'Siang', 'Sore', 'Malam'], tr: ['Otomatik', 'Sabah', 'Gündüz', 'Akşam', 'Gece'] };
  const TODH = { ja: '時間帯', en: 'Time of day', zh: '时间段', 'zh-TW': '時段', ko: '시간대', es: 'Hora del día', fr: 'Moment de la journée', pt: 'Hora do dia', de: 'Tageszeit', ru: 'Время суток', tr: 'Günün saati', id: 'Waktu', hi: 'दिन का समय', ar: 'وقت اليوم' };
  const TODSW = { auto: 'conic-gradient(#ffd36b 0 25%,#ffe9a8 0 50%,#ff9d6b 0 75%,#3b4a8a 0)', morning: 'linear-gradient(#ffe7b0,#ffc9a0)', day: 'linear-gradient(#bfe6ff,#7fc8ff)', evening: 'linear-gradient(#ffb36b,#e0607a)', night: 'linear-gradient(#3b4a8a,#151a3a)' };
  function placeField() {
    const X = window.Table3D; if (!X || !X.PLACES || !X.TABLES[5]) return;
    const modal = document.querySelector('#newOverlay .modal'), first = modal && modal.querySelector('[data-ng=design]'); if (!first) return;
    if (!document.getElementById('atlasPlaceCss')) {
      const st = document.createElement('style'); st.id = 'atlasPlaceCss';
      // (#newOverlay #fPlace…: above nglux's auto-fill tiles — the six places stay in one row; their names show when the row is wide enough)
      st.textContent = `#newOverlay #fPlace.atlas-place{container-type:inline-size}
#newOverlay #fPlace.atlas-place .atlas-plrow.dsg{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:6px!important}
#newOverlay #fPlace.atlas-place .atlas-plrow.dsg > button{width:auto!important;max-width:none!important;display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0;padding:3px 3px 3px!important;border-radius:10px!important;cursor:pointer;font:inherit;font-size:14px;font-weight:700}
#newOverlay #fPlace.atlas-place .atlas-plrow img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:7px;background:#efe6d6}
#newOverlay #fPlace.atlas-place .atlas-plrow .nm{display:none;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@container (min-width:600px){#newOverlay #fPlace.atlas-place .atlas-plrow img{aspect-ratio:3/2}#newOverlay #fPlace.atlas-place .atlas-plrow .nm{display:block}#newOverlay #fPlace.atlas-place .atlas-plrow.dsg > button{padding:4px 4px 7px!important}}
#newOverlay #fPlace.atlas-place > .dsg-now{font-size:15px!important;font-weight:800}
#newOverlay #fPlace.atlas-place .atlas-brh{margin:14px 0 8px;font-size:14px;font-weight:800;opacity:.8}
#newOverlay #fPlace.atlas-place .atlas-br{display:flex!important;gap:6px}
#newOverlay #fPlace.atlas-place .atlas-br > button{flex:1 1 0;min-width:0;white-space:nowrap;font-size:15px!important;padding:10px 6px!important}
#newOverlay #fPlace.atlas-place .atlas-tod > button{display:inline-flex!important;align-items:center;justify-content:center;gap:7px}
#newOverlay #fPlace.atlas-place .atlas-tod .sw{flex:none;width:14px;height:14px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)}
@container (min-width:760px){#newOverlay #fPlace.atlas-place .atlas-lt{display:grid;grid-template-columns:3fr 5fr;gap:14px}}   /* (PC: 明るさ and 時間帯 in one row) */
@container (max-width:520px){#newOverlay #fPlace.atlas-place .atlas-tod{flex-wrap:wrap}#newOverlay #fPlace.atlas-place .atlas-tod > button{flex:1 1 30%}}`;
      document.head.appendChild(st);
    }
    const f = document.createElement('div'); f.className = 'field dsg-field atlas-place'; f.id = 'fPlace'; f.dataset.ng = 'design';
    // the デザイン tab in one order for every game (2026-11-13): the board first, then the pieces, then the place (room) last
    { const all = [...modal.querySelectorAll('[data-ng=design]')], host = first.parentNode;
      const rank = e => /^(fBoard|fDesign)$/.test(e.id) || e.querySelector('.bdrow, .dsg-bd, [id*=Board], [id*=board]') ? 0 : e.matches('[data-ng-credit], #pcCredit') ? 2 : 1;
      const list = all.filter(e => e.parentNode === host).sort((a, b) => rank(a) - rank(b) || (a.compareDocumentPosition(b) & 4 ? -1 : 1));
      const anchor = list.length ? list[list.length - 1].nextSibling : null;
      list.forEach(e => host.insertBefore(e, anchor));
      const cr = list.find(e => rank(e) === 2); host.insertBefore(f, cr || anchor); }
    const lang = () => (l => /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : String(l).slice(0, 2))((document.getElementById('langSel') || {}).value || document.documentElement.lang || 'ja');
    const paint = () => {
      const td = X.timeOfDayPick ? X.timeOfDayPick() : 'auto';
      const l = lang(), k = X.table(), b = X.bright(), N = X.PLACES.name[l] || X.PLACES.name.en, B = X.placeUi('b', l);
      f.innerHTML = `<label>${X.placeUi('place', l)}</label><b class="dsg-now">${N[k]}</b>`
        + `<div class="dsg atlas-plrow">${N.map((n, i) => (X.placeOff || []).includes(i) ? '' : `<button type="button" data-k="${i}" class="${i === k ? 'sel' : ''}" aria-pressed="${i === k}" title="${n}"><img class="th" src="${X.placeThumb(i)}" alt="" loading="lazy"><span class="nm">${n}</span></button>`).join('')}</div>`
        + `<div class="atlas-lt"><div><div class="atlas-brh">${X.placeUi('bright', l)}</div><div class="seg atlas-br">${B.map((n, i) => `<button type="button" data-b="${i}" class="${i === b ? 'sel' : ''}" aria-pressed="${i === b}">${n}</button>`).join('')}</div></div>`
        + (X.setTimeOfDay ? `<div><div class="atlas-brh">${TODH[l] || TODH.en}</div><div class="seg atlas-br atlas-tod">${TODK.map((v, i) => `<button type="button" data-t="${v}" class="${v === td ? 'sel' : ''}" aria-pressed="${v === td}"><span class="sw" style="background:${TODSW[v]}"></span>${(TOD[l] || TOD.en)[i]}</button>`).join('')}</div></div>` : '') + '</div>';
    };
    f.addEventListener('click', e => {
      const p = e.target.closest('[data-k]'), q = e.target.closest('[data-b]');
      if (p) { e.stopPropagation(); X.setTable(+p.dataset.k); } else if (q) { e.stopPropagation(); X.setBright(+q.dataset.b); }
      const tq = e.target.closest('[data-t]'); if (tq && X.setTimeOfDay) { e.stopPropagation(); X.setTimeOfDay(tq.dataset.t); paint(); }
    });
    addEventListener('atlas-table', paint);
    addEventListener('storage', e => { if (e.key === 'atlas-table') X.setTable(+e.newValue || 0); else if (e.key === 'atlas-bright2') X.setBright(+e.newValue); });
    const sel = document.getElementById('langSel'); if (sel) sel.addEventListener('change', () => setTimeout(paint, 40));
    paint();
  }
  /* (2026-11-12) Chinese: one Chinese face for the whole page (skin.css html.atlas-zh-sc / -tc), as on the portal — the Japanese
     faces lack many simplified / traditional glyphs and a line mixed two fonts */
  (function zhFace() {
    const de = document.documentElement;
    const cur = () => { const l = (document.getElementById('langSel') || {}).value || de.lang || 'ja'; return /^zh-(tw|hk|mo|hant)/i.test(l) ? 'tc' : /^zh/i.test(l) ? 'sc' : ''; };
    const apply = () => {
      const f = cur(); de.classList.toggle('atlas-zh-sc', f === 'sc'); de.classList.toggle('atlas-zh-tc', f === 'tc');
      if (f && !document.getElementById('atlasZh' + f)) { const l = document.createElement('link'); l.id = 'atlasZh' + f; l.rel = 'stylesheet';
        l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+' + f.toUpperCase() + ':wght@400;500;700;900&display=swap'; document.head.appendChild(l); }
    };
    const go = () => { apply(); const s = document.getElementById('langSel'); if (s) s.addEventListener('change', () => setTimeout(apply, 0));
      new MutationObserver(apply).observe(de, { attributes: true, attributeFilter: ['lang'] }); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  })();
  /* (2026-11-12) the design tab: the 3D boards / 3D pieces no longer in a box of their own under the 2D ones — the 盤 box and the
     駒 box each get a 3D | 2D switch that shows one list or the other (picking a tile works as before: a 3D one turns the table 3D,
     a 2D one the 2D board). The games build #f3D (label + .bdrow = the 3D boards, label.pc3l + .bdrow.pc3 = the 3D pieces) in the 盤
     field; the 3D pieces move into the 駒 field (#segPieces / #pcRow), and #f3D's own lookups keep finding them there. */
  (function splitDesign() {
    const L = { '3d': '3D', '2d': '2D' };
    function sw(field, onPick) {
      const t = document.createElement('div'); t.className = 'seg a32'; t.setAttribute('role', 'tablist');
      t.innerHTML = '<button type="button" data-m="3d">3D</button><button type="button" data-m="2d">2D</button>';
      const lab = field.querySelector(':scope > label'); if (lab) lab.after(t); else field.prepend(t);
      t.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); onPick(b.dataset.m); });
      return t;
    }
    const show = (t, m) => t.querySelectorAll('button').forEach(b => { const on = b.dataset.m === m; b.classList.toggle('sel', on); b.setAttribute('aria-selected', String(on)); });
    let parts = null;
    function build() {
      const f3 = document.getElementById('f3D'); if (!f3 || f3.dataset.a32) return parts;
      const bf = f3.closest('.field'); if (!bf) return null;
      f3.dataset.a32 = '1'; f3.classList.add('a32-box');
      const P = { f3, bf };
      P.b2 = () => [...bf.children].filter(e => e !== f3 && e.tagName !== 'LABEL' && !e.classList.contains('a32') && !e.classList.contains('dsg-now'));
      P.bt = sw(bf, m => { P.bm = m; apply(); });
      // the 3D pieces → the 駒 field
      const pl = f3.querySelector('label.pc3l'), pr = f3.querySelector('.bdrow.pc3'), p2 = document.getElementById('segPieces') || document.getElementById('pcRow'), pf = p2 && p2.closest('.field');
      if (pr) {
        // the 駒 field: the game's own (with its 2D pieces) when the full version shows it, else a new one with the 3D pieces alone
        const own = pf && pf !== bf && getComputedStyle(pf).display !== 'none';
        let host = own ? pf : null;
        if (!host) { host = document.createElement('div'); host.className = bf.className + ' a32-pcf'; host.removeAttribute('id'); if (bf.dataset.ng) host.dataset.ng = bf.dataset.ng; bf.after(host); }
        const box = document.createElement('div'); box.className = 'a32-pc3';
        if (pl) (own ? box : host).appendChild(pl);
        box.appendChild(pr); host.appendChild(box);
        const q1 = f3.querySelector.bind(f3), qa = f3.querySelectorAll.bind(f3);
        f3.querySelector = sel => q1(sel) || host.querySelector(sel);
        f3.querySelectorAll = sel => [...qa(sel), ...host.querySelectorAll(sel)];
        P.pbox = box;
        if (own) { P.p2 = () => [...pf.children].filter(e => e !== box && e.tagName !== 'LABEL' && !e.classList.contains('a32') && !e.classList.contains('dsg-now')); P.pt = sw(pf, m => { P.pm = m; apply(); }); }
      }
      parts = P; return P;
    }
    function apply() {
      const P = parts; if (!P) return;
      const has3 = !P.f3.classList.contains('hidden') && P.f3.querySelector('.bdrow button');
      P.bt.classList.toggle('a32-off', !has3); if (!has3) P.bm = '2d';
      show(P.bt, P.bm); P.f3.classList.toggle('a32-off', P.bm !== '3d'); P.b2().forEach(e => e.classList.toggle('a32-off', P.bm === '3d'));
      if (P.pt) { show(P.pt, P.pm); P.pbox.classList.toggle('a32-off', P.pm !== '3d'); P.p2().forEach(e => e.classList.toggle('a32-off', P.pm === '3d')); }
    }
    // each time the box opens: the lists of what is in use now (a chosen 3D tile → 3D, else 2D)
    function reset() {
      const P = build(); if (!P) return;
      const sel3 = row => !!(row && row.querySelector('button.sel, button[aria-pressed=true]'));
      P.bm = sel3(P.f3.querySelector('.bdrow:not(.pc3)')) || !document.documentElement.classList.contains('atlas-2d') ? '3d' : '2d';
      if (P.pt) P.pm = sel3(P.pbox.querySelector('.bdrow')) ? '3d' : '2d';
      apply();
    }
    const go = () => {
      reset();
      const ov = document.getElementById('newOverlay');
      if (ov) new MutationObserver(() => { if (/\b(show|on|open)\b/.test(ov.className)) setTimeout(reset, 30); }).observe(ov, { attributes: true, attributeFilter: ['class'] });
      document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.ngt-bar > button, #btnNew')) setTimeout(reset, 60); }, true);
    };
    if (document.readyState === 'complete') setTimeout(go, 400); else addEventListener('load', () => setTimeout(go, 400));
  })();
  window.AtlasSkin = { init };
})();
