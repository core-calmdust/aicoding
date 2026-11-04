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
      boardDom.style.transform = TILT ? `perspective(${Math.round(b.h * PERSP)}px) rotateX(${TILT}deg)` : '';
      if (o.units) unitPx = r.height / o.units;
      paintFloor();
    };
    let floorURL = null;
    // the floor stays put while the online dock is open (or opening / closing): the board moves and shrinks over it, the
    // table does not (its grain followed the board's place and size before) — repainted again only for a new window size
    // (and once the dock has been opened, also after it is closed again: the closed layout may come back a few px different)
    let floorVP = '', floorHeld = false;
    function paintFloor() {
      try {
        const vp = innerWidth + 'x' + innerHeight, cl = document.documentElement.classList;
        if (vp !== floorVP) floorHeld = false;
        if (floorVP && (document.body.classList.contains('dock-open') || cl.contains('dock-anim'))) floorHeld = true;
        if (floorVP && floorHeld && vp === floorVP) return;
        const F = T3.floorImage(o.floor === 'tatami' ? 'tatami' : 'wood'); if (!F) return;
        floorVP = vp;
        if (!floorURL) floorURL = F.img.toDataURL('image/jpeg', .86);
        const de = document.documentElement.style;
        de.setProperty('background-image', `linear-gradient(rgba(0,0,0,.05),rgba(0,0,0,.05)),url("${floorURL}")`);
        de.setProperty('background-size', `auto, ${Math.round(F.w * unitPx)}px ${Math.round(F.h * unitPx)}px`);
        de.setProperty('background-repeat', 'repeat'); de.setProperty('background-attachment', 'scroll');
        const r = boardDom.getBoundingClientRect();   // the tile grid is centred on the board, like the 3D floor
        de.setProperty('background-position', `0 0, ${Math.round(r.left + scrollX + r.width / 2 - F.w * unitPx / 2)}px ${Math.round(r.top + scrollY + r.height / 2 - F.h * unitPx / 2)}px`);
      } catch (e) {}
    }
    const alignTo = (units, top) => {
      o.units = units; placeHost();
      T3.align(() => { const b = box(); return { x: b.x - host.offsetLeft, y: b.y - host.offsetTop, w: b.w, h: b.h, tilt: TILT, persp: b.h * PERSP }; }, units, top);
      addEventListener('resize', () => requestAnimationFrame(placeHost));
      addEventListener('dockrelayout', placeHost);   // the online dock (shared/headerbar.js): the canvas follows the new layout at once
      if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(placeHost)).observe(boardDom);
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
    const SKIP = new RegExp('\\b(board|cell|disc|ghost|hint|star|last-mark|odot|sqlbl|edgeband|fx-|confetti|overlay\\b|coach|toast|atlas-' + (o.skip ? '|' + o.skip : '') + ')');
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
  let pcActive = false, sideFitFn = null;
  (function pcFit() {
    const P = o.pc, THREE = window.THREE; if (!P || !THREE || !T3.project) return;
    const MQ = matchMedia((window.HeaderBar && HeaderBar.MEDIA) || '(hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4)');
    const de = document.documentElement, body = document.body, app = document.querySelector('.app'), side = app && app.querySelector(':scope > .side');
    if (!side) return;
    const GAP = 24, MY = 16, MX = 20, VARS = P.vars || ['--cell'];
    let K = null, model = null, busy = false, on = false, reT = 0;
    // the board model on the table (skins call T3.show(id, model) — also for a new board size / variant)
    const show0 = T3.show;
    T3.show = function (id, m) { const g = show0.apply(this, arguments); if (m) { model = m; K = null; remeasure(); } return g; };
    const align0 = T3.align;   // (the camera follows the DOM board only once a skin has aligned it: measure again then)
    T3.align = function () { const r = align0.apply(this, arguments); remeasure(); return r; };
    const grp = () => { let g = boardDom; while (g && g.parentElement !== app) g = g.parentElement; return g; };
    const visible = x => { for (let e = x; e; e = e.parent) if (!e.visible) return false; return true; };
    // the 3D board's visible extent beyond the DOM board, in DOM board heights (the camera is aligned to the DOM board, so this
    // does not change with the size or the place of the board)
    function measure() {
      if (!model || !model.parent || !visible(model)) return null;
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
        if (!K || ['l', 'r', 't', 'b'].some(s => Math.abs(m[s] - K[s]) > .0008)) { K = m; fit(); }
      }, 40);
      setTimeout(() => step(0, null), 60);
    }
    const reviewBox = () => [...document.querySelectorAll('.app > #rvBox, .app > .rvbox, .app > .rbox, body > .rbox')].some(b => b.getClientRects().length);
    const want = () => MQ.matches && K && !de.classList.contains('atlas-2d') && getComputedStyle(side).display !== 'none' && !reviewBox() && visible(model);
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
    const unplace = () => { const g = grp(); if (g) { g.style.left = ''; g.style.top = ''; } side.style.left = ''; side.style.top = ''; side.style.removeProperty('height'); side.style.removeProperty('max-height'); side.style.removeProperty('min-height'); { const si = side.querySelector(':scope > .side-in'); if (si) { si.style.removeProperty('height'); si.style.removeProperty('max-height'); } } if (P.unplace) P.unplace(); };
    let fitKey = '';
    function fit() {
      if (busy) return;
      if (de.classList.contains('dock-anim')) { setTimeout(later, 150); return; }   // the dock's move first (headerbar.js), then the layout
      const key = innerWidth + 'x' + innerHeight; if (key !== fitKey) { fitKey = key; setTimeout(later, 350); setTimeout(later, 1200); }   // a new window size: once more when everything has settled
      if (!want()) { if (on) { on = false; pcActive = false; setVar(null); unplace(); if (sideFitFn) sideFitFn(); } return; }
      const g = grp(); if (!g) return;
      busy = true;
      try {
        on = true; pcActive = true; unplace();
        // the free area: under the portal bar, above the online dock (its bar, or the opened dock)
        const bar = [...document.querySelectorAll('.atlas-top, header.hb')].find(b => b.getClientRects().length && getComputedStyle(b).position === 'fixed');
        const top = (bar ? bar.getBoundingClientRect().bottom : 0) + MY;
        const dk = document.getElementById('dock') || document.querySelector('.dock');
        let bot = innerHeight; if (dk && dk.getClientRects().length && getComputedStyle(dk).position === 'fixed') bot = Math.min(bot, dk.getBoundingClientRect().top);
        bot -= MY;
        const SW = side.offsetWidth || 360, availH = bot - top, availW = innerWidth - 2 * MX - GAP - SW;
        // the size: as large as fits both ways (a few passes: not every part of the group scales with the board)
        setVar(null);
        const pr = document.createElement('div'); pr.style.cssText = `position:absolute;visibility:hidden;width:var(${VARS[0]})`; body.appendChild(pr);
        const s0 = pr.offsetWidth; pr.remove();
        let s = s0 || 40;
        for (let i = 0; i < 6; i++) {
          setVar(s); const E = extent(frame()), k = Math.min(availH / (E.b - E.t), availW / (E.r - E.l));
          if (Math.abs(k - 1) < .0015) break;
          s = Math.max(8, s * k);
        }
        { const E = extent(frame()); if ((E.b - E.t) > availH + .5 || (E.r - E.l) > availW + .5) { s *= Math.min(availH / (E.b - E.t), availW / (E.r - E.l)); setVar(s); } }
        // the place: the group (board + column) centred; the column level with the frame, GAP px to the right of the board
        if (getComputedStyle(g).position === 'static') g.style.position = 'relative';
        if (getComputedStyle(side).position === 'static') side.style.position = 'relative';
        side.style.setProperty('max-height', 'none', 'important');
        { const si = side.querySelector(':scope > .side-in'); if (si) { si.style.setProperty('height', '100%', 'important'); si.style.setProperty('max-height', '100%', 'important'); } }   // (the cards scroll inside the column, also in the dock's compact mode)
        const px = (el, p) => parseFloat(getComputedStyle(el)[p]) || 0, appShift = -(parseFloat(getComputedStyle(app).top) || 0);
        for (let i = 0; i < 4; i++) {
          const F = frame(), E = extent(F), W = (E.r - E.l) + GAP + SW;
          const dx = (innerWidth - W) / 2 - E.l, dy = top + (availH - (E.b - E.t)) / 2 - (E.t + appShift);   // (centred as if the online dock's shift of .app were not there: headerbar.js then leaves it at 0)
          if (Math.abs(dx) > .3) g.style.left = (px(g, 'left') + dx) + 'px';
          if (Math.abs(dy) > .3) g.style.top = (px(g, 'top') + dy) + 'px';
          const F2 = frame(), E2 = extent(F2), sr = side.getBoundingClientRect();
          const fh = F2.b - F2.t, sx = E2.r + GAP - sr.left, sy = F2.t - sr.top;
          if (Math.abs(sr.height - fh) > .3) { side.style.setProperty('height', fh + 'px', 'important'); side.style.setProperty('min-height', '0px', 'important'); }
          if (Math.abs(sx) > .3) side.style.left = (px(side, 'left') + sx) + 'px';
          if (Math.abs(sy) > .3) side.style.top = (px(side, 'top') + sy) + 'px';
          if (Math.abs(dx) <= .3 && Math.abs(dy) <= .3 && Math.abs(sx) <= .3 && Math.abs(sy) <= .3 && Math.abs(sr.height - fh) <= .3) break;
        }
        placeHost();
        clearTimeout(reT); reT = setTimeout(remeasure, 250);   // check the frame again once the camera has followed the new size
      } finally { busy = false; }
    }
    let q = 0; const later = () => { if (q) return; q = 1; const go = () => { if (!q) return; q = 0; fit(); }; requestAnimationFrame(go); setTimeout(go, 120); };   // (a timer too: frames wait while the window is hidden or occluded)
    addEventListener('resize', later);
    addEventListener('dockrelayout', fit);   // the online dock's probe (shared/headerbar.js): laid out at once, for its final place
    addEventListener('fullscreenchange', () => { later(); setTimeout(later, 250); });
    if (window.visualViewport) visualViewport.addEventListener('resize', later);
    MQ.addEventListener ? MQ.addEventListener('change', later) : MQ.addListener(later);
    if (window.ResizeObserver) { const ro = new ResizeObserver(later); ro.observe(de); ro.observe(boardDom); }
    new MutationObserver(later).observe(de, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(() => { later(); setTimeout(later, 320); setTimeout(later, 700); }).observe(body, { attributes: true, attributeFilter: ['class'] });   // (the online dock opens / closes with a .25s transition: once more at its end)
    { const dk = document.getElementById('dock') || document.querySelector('.dock'); if (dk) dk.addEventListener('transitionend', later); }
    if (document.fonts) document.fonts.ready.then(later);
    [800, 2000, 4500].forEach(ms => setTimeout(remeasure, ms));
    setInterval(() => { if (!document.hidden && innerWidth + 'x' + innerHeight !== fitKey) later(); }, 700);   // a missed resize (full screen, zoom) never leaves the old size
    window.__atlasPcFit = { fit, remeasure, measure, K: () => K, on: () => on, model: () => model };   // (test hook)
  })();

  /* ---------- side column = exactly the height of the 3D board; info line inside the kifu card ---------- */
  (function sideFit() {
    const side = document.querySelector('.side'), kc = document.querySelector('.kifu-card'), info = document.getElementById('infoLine');
    if (kc && info) kc.appendChild(info);
    if (!side || !o.outer) return;
    const fit = sideFitFn = () => {
      if (document.documentElement.classList.contains('dock-anim')) return;   // the online dock's FLIP (shared/headerbar.js) moves it; fitted again at its end
      if (pcActive) return;   // PC: pcFit below places the column (and sizes the board)
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
  /* ---------- the portal's top bar: logo, coins, language, home (same layout as the portal) ---------- */
    const lang = () => (document.getElementById('langSel') || {}).value || 'ja';
    const TITLE = { ja: '世界のボドゲ大百科', en: 'World Board Game Atlas', zh: '世界桌游大全', ko: '세계의 보드게임 대전', es: 'Atlas de Juegos de Mesa', fr: 'Atlas des jeux de société', pt: 'Atlas de Jogos de Tabuleiro', de: 'Brettspiel-Atlas', hi: 'विश्व बोर्ड गेम एटलस', ar: 'أطلس ألعاب الطاولة' };
    const bar = document.createElement('header'); bar.className = 'atlas-top';
    bar.innerHTML = `<a class="atlas-brand" href="${BASE}"><img src="${BASE}logo.svg" alt="" width="44" height="44"><span><b class="wmT"></b><small>World Board Game Atlas</small></span></a><span class="sp"></span>
      <span class="atlas-coin"><i>¢</i><b class="coinN">0</b></span>
      <button type="button" class="atlas-ic" id="atlasFlip" aria-label="Flip"></button>
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
    if (flp) { const sync = () => { myFlp.innerHTML = flp.innerHTML; myFlp.title = flp.title; myFlp.className = 'atlas-ic' + (flp.classList.contains('on') ? ' on' : ''); myFlp.style.color = flp.classList.contains('on') ? '#e2b65e' : ''; }; myFlp.onclick = () => { flp.click(); sync(); }; sync(); new MutationObserver(sync).observe(flp, { attributes: true }); } else myFlp.remove();
    const sel = document.getElementById('langSel'), pop = bar.querySelector('#atlasLangPop'), lbtn = bar.querySelector('#atlasLang');
    /* ---------- 3D board or the game's own 2D board (picked in the new-game dialog's デザイン tab) ----------
       view({ key, row, html(label) → the 3D tile's inner HTML, label: {ja, en, …}, cls: [classes only for the 3D look], on(is3d) })
       puts a "3D" tile first in the board row (row); picking any of the game's 2D boards there shows the plain 2D board in the
       portal's frame (html.atlas-2d: the 3D canvas hidden, the skin's 3D-only classes off), the 3D tile brings the 3D board back.
       The choice is kept (localStorage key). Returns { is3d(), set(is3d) }. */
    const V3L = { ja: '3D盤', en: '3D board', zh: '3D棋盘', ko: '3D 보드', es: 'Tablero 3D', fr: 'Plateau 3D', pt: 'Tabuleiro 3D', de: '3D-Brett', hi: '3D बोर्ड', ar: 'لوحة ثلاثية الأبعاد' };
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
      const paint = () => { if (!tile) return; const L = v.label || {}; tile.innerHTML = v.html(L[vlang().slice(0, 2)] || L.en || '3D'); fix(); };
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
    const NAMES = { ja: 'Japanese', en: 'English', zh: 'Chinese', ko: 'Korean', es: 'Spanish', fr: 'French', pt: 'Portuguese', de: 'German', hi: 'Hindi', ar: 'Arabic' };
    const paint = () => { bar.querySelector('.wmT').textContent = TITLE[lang()] || TITLE.en; bar.querySelector('.atlas-brand small').hidden = lang() === 'en'; bar.querySelector('.lc').textContent = lang().toUpperCase(); };
    lbtn.onclick = e => { e.stopPropagation(); if (!pop.hidden) { pop.hidden = true; return; }
      pop.innerHTML = [...sel.options].map(o => `<button type="button" data-l="${o.value}" aria-selected="${o.value === lang()}"><b>${o.text}</b><small>${o.value.toUpperCase()} · ${NAMES[o.value]}</small></button>`).join('');
      pop.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { pop.hidden = true; if (sel.value !== b.dataset.l) { sel.value = b.dataset.l; sel.dispatchEvent(new Event('change')); } setTimeout(paint, 50); });
      pop.hidden = false; };
    document.addEventListener('click', e => { if (!pop.hidden && !pop.contains(e.target)) pop.hidden = true; });
    if (sel) sel.addEventListener('change', () => setTimeout(paint, 50));
    paint();
    // coins: same numbers as the portal (shared/atlas.js)
    const coins = () => { try { const A = window.Atlas; if (!A) return; const W = A.load(); bar.querySelector('.coinN').textContent = A.coins(W, A.achievements(A.allProgress(), W)).balance.toLocaleString(); } catch (e) {} };
    setTimeout(coins, 300); document.addEventListener('visibilitychange', () => { if (!document.hidden) coins(); });
    document.querySelectorAll('a.snd.home, .brand a.series').forEach(a => { a.href = BASE; });
    return { T3, ready, alignTo, view };
  }
  window.AtlasSkin = { init };
})();
