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
      const m = Math.round(Math.max(b.w, b.h) * (o.margin ?? .3));   // o.margin: a flat board with a short shadow needs less canvas (fewer pixels to draw)
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
        if (!floorURL[k]) floorURL[k] = F.img.toDataURL('image/jpeg', .86);
        const over = F.over ? F.over + ',' : '', n = F.over ? (() => { let d = 0, c = 1; for (const ch of F.over) { if (ch === '(') d++; else if (ch === ')') d--; else if (ch === ',' && !d) c++; } return c; })() : 0, rep = (v) => Array(n).fill(v).join(', ') + (n ? ', ' : '');
        de.setProperty('background-image', `${over}linear-gradient(rgba(0,0,0,.05),rgba(0,0,0,.05)),url("${floorURL[k]}")`);
        de.setProperty('background-size', `${rep('100% 100%')}auto, ${Math.round(F.w * unitPx)}px ${Math.round(F.h * unitPx)}px`);
        de.setProperty('background-repeat', `${rep('no-repeat')}repeat, repeat`); de.setProperty('background-attachment', `${rep('fixed')}scroll, scroll`);
        const r = boardDom.getBoundingClientRect();   // the tile grid is centred on the board, like the 3D floor
        de.setProperty('background-position', `${rep('0 0')}0 0, ${Math.round(r.left + scrollX + r.width / 2 - F.w * unitPx / 2)}px ${Math.round(r.top + scrollY + r.height / 2 - F.h * unitPx / 2)}px`);
      } catch (e) {}
    }
    // another place / brightness chosen (the デザイン tab, or another tab of the series): the floor follows at once
    addEventListener('atlas-table', () => paintFloor(true));
    let alignHooked = false;
    const alignTo = (units, top) => {
      o.units = units; placeHost();
      T3.align(() => { const b = box(); return { x: b.x - host.offsetLeft, y: b.y - host.offsetTop, w: b.w, h: b.h, tilt: TILT, persp: b.h * PERSP }; }, units, top);
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
    const set = () => { const on = document.hidden || !document.hasFocus(); document.documentElement.classList.toggle('atlas-idle', on); document.querySelectorAll('svg').forEach(s => { try { on ? s.pauseAnimations() : s.unpauseAnimations(); } catch (e) {} }); };
    document.addEventListener('visibilitychange', set); addEventListener('blur', set); addEventListener('focus', set);
  })();
  /* ---------- light theme: convert the game's dark-theme colours rule by rule ---------- */
  (function retheme() {
    const SKIP = new RegExp('\\b(board|cell|disc|ghost|hint|star|last-mark|odot|sqlbl|edgeband|fx-|confetti|overlay\\b|coach|toast|rbpv|rb-d\\b|atlas-' + (o.skip ? '|' + o.skip : '') + ')');
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
    T3.show = function (id, m) { const g = show0.apply(this, arguments); if (m) { model = m; K = null; refits = 0; usedK = []; checks = 0; remeasure(); } return g; };
    const align0 = T3.align;   // (the camera follows the DOM board only once a skin has aligned it: measure again then)
    T3.align = function () { const r = align0.apply(this, arguments); refits = 0; usedK = []; checks = 0; remeasure(); return r; };
    if (T3.turn) T3.turn = ext(T3.turn);   // (盤面反転: the frame turns with the board)
    const grp = () => { let g = boardDom; while (g && g.parentElement !== app) g = g.parentElement; return g; };
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
    const want = () => MQ.matches && K && !de.classList.contains('atlas-2d') && getComputedStyle(side).display !== 'none' && !reviewBox() && visible(model);
    // 振り返り with the review box under the board (reversi, shogi…): the page lays the board, the column and the box out itself (its
    // grid), sized for the flat board — the 3D frame reaching past it would slip under the portal bar or onto the box. So the board is
    // shrunk until its 3D frame fits between the bar and the box with MY px to spare above and below, and moved down (with the column)
    let rvOn = false, rbShare = .32;
    const rvBox = () => [...document.querySelectorAll('.app > #rvBox, .app > .rvbox, .app > .rbox, body > .rbox')].find(b => b.getClientRects().length);
    const wantRv = () => MQ.matches && K && !de.classList.contains('atlas-2d') && getComputedStyle(side).display !== 'none' && !!rvBox() && visible(model);
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
      const F2 = frame(), E2 = extent(F2), sr = side.getBoundingClientRect();
      const fh = F2.b - F2.t, sx = E2.r + gx - sr.left, sy = F2.t - sr.top;
      if (Math.abs(sr.height - fh) > .3) { side.style.setProperty('height', fh + 'px', 'important'); side.style.setProperty('min-height', '0px', 'important'); }
      if (Math.abs(sx) > .3) side.style.left = (px(side, 'left') + sx) + 'px';
      if (Math.abs(sy) > .3) side.style.top = (px(side, 'top') + sy) + 'px';
      return Math.abs(sx) <= .3 && Math.abs(sy) <= .3 && Math.abs(sr.height - fh) <= .3;
    }
    const setVar = v => VARS.forEach(k => { if (v == null) { de.style.removeProperty(k); body.style.removeProperty(k); } else { de.style.setProperty(k, v + 'px', 'important'); body.style.setProperty(k, v + 'px', 'important'); } });
    const frame = () => { const r = boardDom.getBoundingClientRect(), h = r.height; return { l: r.left - K.l * h, t: r.top - K.t * h, r: r.right + K.r * h, b: r.bottom + K.b * h }; };
    const extent = F => {
      if (P.place) P.place(F);   // the game's own parts beside the board (shogi: the komadai) placed against the 3D frame first
      const E = { ...F };
      if (P.extras) app.querySelectorAll(P.extras).forEach(e => {
        if (!e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return;
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
        placeHost();
        checks = 0; clearTimeout(reT); reT = setTimeout(remeasure, 250);   // check the frame again once the camera has followed the new size
      } finally { busy = false; }
    }
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
    let was2d = de.classList.contains('atlas-2d');
    new MutationObserver(() => { const is2d = de.classList.contains('atlas-2d'); if (is2d !== was2d) { was2d = is2d; K = null; refits = 0; usedK = []; checks = 0; if (!is2d) { setTimeout(remeasure, 60); setTimeout(ext(remeasure), 700); } } laterX(); }).observe(de, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(() => { laterX(); setTimeout(laterX, 320); setTimeout(laterX, 700); }).observe(body, { attributes: true, attributeFilter: ['class'] });   // (the online dock opens / closes with a .25s transition: once more at its end)
    { const dk = document.getElementById('dock') || document.querySelector('.dock'); if (dk) dk.addEventListener('transitionend', laterX); }
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
      const r = boardDom.getBoundingClientRect(), s = side.getBoundingClientRect();
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
  // the board is drawn and the game is set up → lift the "loading" overlay (after a couple of rendered frames)
  function ready(waitStart) {
    const t0 = performance.now();
    const f = () => {   // wait until the new-game dialog has really closed (the start can take a moment), then a few settled frames
      if (waitStart && document.querySelector('#newOverlay.show') && performance.now() - t0 < 6000) return setTimeout(f, 120);
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => { if (window.AtlasLoading) AtlasLoading.hide(); }, 450)));
    };
    setTimeout(f, 250);
  }   // let fonts, the side column fit and the first frames settle
  /* ---------- opened from the portal with a level / side: start right away ---------- */
  (function autoStart() {
    const q = new URLSearchParams(location.search), lv = +q.get('lv'), side = +q.get('side'), mode = q.get('mode') || 'ai';
    if ((!lv && !side && mode === 'ai') || !o.start) { ready(false); return; }
    let tries = 0;
    const go = () => {
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
    const m = Math.round(Math.max(b.w, b.h) * (o.margin ?? .3));
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
      onLang: (b, g) => { const br = bar.getBoundingClientRect(), rtl = getComputedStyle(bar).direction === 'rtl';
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
      const s = document.createElement('script'); s.src = BASE + 'npc/npc.js?v=10'; s.onload = () => { try { window.AtlasNPC.skin(GAME); } catch (e) {} };
      setTimeout(() => document.head.appendChild(s), 1500);   // after the board and the first frames
    })();
    return { T3, ready, alignTo, view };
  }
  /* ---------- 場所 (the table design, shared with the portal) and 明るさ: the first row of the new-game dialog's デザイン tab ---------- */
  function placeField() {
    const X = window.Table3D; if (!X || !X.PLACES || !X.TABLES[5]) return;
    const modal = document.querySelector('#newOverlay .modal'), first = modal && modal.querySelector('[data-ng=design]'); if (!first) return;
    if (!document.getElementById('atlasPlaceCss')) {
      const st = document.createElement('style'); st.id = 'atlasPlaceCss';
      // (#newOverlay #fPlace…: above nglux's auto-fill tiles — the six places stay in one row; their names show when the row is wide enough)
      st.textContent = `#newOverlay #fPlace.atlas-place{container-type:inline-size}
#newOverlay #fPlace.atlas-place .atlas-plrow.dsg{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:6px!important}
#newOverlay #fPlace.atlas-place .atlas-plrow.dsg > button{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0;padding:3px 3px 3px!important;border-radius:10px!important;cursor:pointer;font:inherit;font-size:14px;font-weight:700}
#newOverlay #fPlace.atlas-place .atlas-plrow img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:7px;background:#efe6d6}
#newOverlay #fPlace.atlas-place .atlas-plrow .nm{display:none;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@container (min-width:600px){#newOverlay #fPlace.atlas-place .atlas-plrow img{aspect-ratio:3/2}#newOverlay #fPlace.atlas-place .atlas-plrow .nm{display:block}#newOverlay #fPlace.atlas-place .atlas-plrow.dsg > button{padding:4px 4px 7px!important}}
#newOverlay #fPlace.atlas-place > .dsg-now{font-size:15px!important;font-weight:800}
#newOverlay #fPlace.atlas-place .atlas-brh{margin:14px 0 8px;font-size:14px;font-weight:800;opacity:.8}
#newOverlay #fPlace.atlas-place .atlas-br{display:flex!important;gap:6px}
#newOverlay #fPlace.atlas-place .atlas-br > button{flex:1 1 0;min-width:0;white-space:nowrap;font-size:15px!important;padding:10px 6px!important}`;
      document.head.appendChild(st);
    }
    const f = document.createElement('div'); f.className = 'field dsg-field atlas-place'; f.id = 'fPlace'; f.dataset.ng = 'design';
    first.parentNode.insertBefore(f, first);
    const lang = () => (l => /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : String(l).slice(0, 2))((document.getElementById('langSel') || {}).value || document.documentElement.lang || 'ja');
    const paint = () => {
      const l = lang(), k = X.table(), b = X.bright(), N = X.PLACES.name[l] || X.PLACES.name.en, B = X.placeUi('b', l);
      f.innerHTML = `<label>${X.placeUi('place', l)}</label><b class="dsg-now">${N[k]}</b>`
        + `<div class="dsg atlas-plrow">${N.map((n, i) => `<button type="button" data-k="${i}" class="${i === k ? 'sel' : ''}" aria-pressed="${i === k}" title="${n}"><img class="th" src="${X.placeThumb(i)}" alt="" loading="lazy"><span class="nm">${n}</span></button>`).join('')}</div>`
        + `<div class="atlas-brh">${X.placeUi('bright', l)}</div><div class="seg atlas-br">${B.map((n, i) => `<button type="button" data-b="${i}" class="${i === b ? 'sel' : ''}" aria-pressed="${i === b}">${n}</button>`).join('')}</div>`;
    };
    f.addEventListener('click', e => {
      const p = e.target.closest('[data-k]'), q = e.target.closest('[data-b]');
      if (p) { e.stopPropagation(); X.setTable(+p.dataset.k); } else if (q) { e.stopPropagation(); X.setBright(+q.dataset.b); }
    });
    addEventListener('atlas-table', paint);
    addEventListener('storage', e => { if (e.key === 'atlas-table') X.setTable(+e.newValue || 0); else if (e.key === 'atlas-bright2') X.setBright(+e.newValue); });
    const sel = document.getElementById('langSel'); if (sel) sel.addEventListener('change', () => setTimeout(paint, 40));
    paint();
  }
  window.AtlasSkin = { init };
})();
