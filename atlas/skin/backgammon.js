/* =====================================================================
   Backgammon — portal skin (backgammon/?skin=atlas)
   The full backgammon page keeps every feature (AI, two players, AI vs AI,
   lessons, puzzles, daily puzzle, doubling cube, matches, review, analysis…).
   This file:
     • draws the museum-piece board with the 3D table (walnut marquetry or
       black scarlet leather); the camera is aligned to the DOM board, which
       stays on top (transparent) for taps, drags, marks and arrows. The board
       follows the game's geometry (its PC / phone-landscape boards are shorter)
     • swaps the page's checkers, the borne-off slabs, the resting dice and the
       cube for top-down renders of the 3D pieces (metal-rimmed leather checkers,
       ivory / ebony dice) — so every state the game draws (stacks, the bar, the
       tray, both orientations, lessons, review…) stays correct by construction.
       A moving checker is lifted (its shadow grows) and set down again
     • adds the two 3D looks to the board-design row of the new-game dialog
       (the game's own 2D boards stay selectable)
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   The 3D picture is only redrawn when it changes (Table3D.kick).
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D;
  if (!THREE || !T3 || !T3.backgammon || !window.AtlasSkin || !window.BGTheme || typeof window.renderCheckers !== 'function') return;
  const BG3 = T3.backgammon, frameEl = document.getElementById('frame'), de = document.documentElement;
  de.classList.add('atlas-backgammon');
  const geoH = () => { try { return G.H || 12; } catch (e) { return 12; } };

  /* ---------- look: 'marq' | 'scarlet' | '' (the game's own 2D drawing) ---------- */
  const LK = 'atlas-bg-look', LOOKS = BG3.LOOKS || ['marq', 'scarlet'];
  // (2026-11-11) six 3D boards; under each the 2D page keeps a related 2D skin (labels, the 2D thumbnails)
  const SK2D = { marq: 'marquetry', scarlet: 'scarlet', oak: 'classic', butterfly: 'midnight', marble: 'marble', croc: 'classic' };
  let mine = null; try { const v = localStorage.getItem(LK); mine = v === '0' ? '' : LOOKS.includes(v) ? v : null; } catch (e) {}
  if (mine === null) { let sk = ''; try { sk = settings.skin; } catch (e) {} mine = sk === 'scarlet' ? 'scarlet' : 'marq'; }

  // the dice take the 3D set's colours (resting dice, the rolling dice and the small diagrams); restored for the 2D boards
  const DIE0 = {}; BGTheme.CK_IDS.forEach(id => { DIE0[id] = JSON.parse(JSON.stringify(BGTheme.CK[id].die)); });
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const dk = (c, k) => c.map(v => Math.round(v * k));
  function dieColours(on) {
    BGTheme.CK_IDS.forEach(id => {
      const d = BGTheme.CK[id].die;
      if (!on) { Object.assign(d, JSON.parse(JSON.stringify(DIE0[id]))); return; }
      const [f, p] = BG3.DIE[id] || BG3.DIE.gold, F = rgb(f);
      Object.assign(d, { face: F, edge: dk(F, .78), pip: p, css: [f, f, '#' + dk(F, .82).map(v => v.toString(16).padStart(2, '0')).join('')], cpip: [p, p] });
    });
  }

  const skin = AtlasSkin.init({
    margin: 0.16,   // canvas margin around the board (less = fewer pixels to draw; enough for the bezel and its shadow)
    board: frameEl,
    outer: r => ({ top: r.top, height: r.height }),
    guide: '../images/atlas/g-dice.webp', guideFallback: '../images/atlas/backgammon.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'ck\\b|\\.ck|slab|\\.die|cube|dst|glow|lbl|dice3d|arrows|frame',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      // the portal's card: straight to the puzzles / the lessons / the online match search (backgammon/app.js AtlasDeep, 2026-11-14)
      if (/^(puzzle|lesson|online)$/.test(mode)) { if (!window.AtlasDeep) return null; const q = new URLSearchParams(location.search); return AtlasDeep(mode, q.get('sub')); }
      openNewDialog();
      draft.mode = mode === 'pvp' ? 'pvp' : 'ai';
      if (lv >= 1 && lv <= 10) draft.level = lv;
      if (draft.mode === 'ai' && (side === 1 || side === 2)) window.__bgFirst = side === 2 ? 1 - (draft.side | 0) : (draft.side | 0);   // 手番 from the card: who wins the opening roll (app.js newMatch deals the seed)
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;

  /* ---------- the 3D board (rebuilt when the look or the game's board height changes) ---------- */
  const holder = new THREE.Group();
  let board = null, built = '';
  T3.show('backgammon', holder, { still: true });
  let alignFn = null; const oAlign = T3.align;
  T3.align = function (fn, size, top) { alignFn = fn; return oAlign.call(this, fn, size, top); };
  function build() {
    const look = mine || 'marq', H = geoH(), key = look + ':' + H.toFixed(2);
    if (key !== built) {
      if (board) { holder.remove(board); board.traverse(o => { if (o.geometry && /Extrude|Tube/.test(o.geometry.type)) o.geometry.dispose(); }); }
      board = BG3.board(look, H); holder.add(board); built = key;
      if (alignFn) oAlign(alignFn, H, board.userData.top);
    }
    holder.visible = !!mine;
    T3.kick(400);
  }
  build();
  skin.alignTo(geoH(), board.userData.top);

  const oCk = BGTheme.applyCheckers;
  /* ---------- sprites of the 3D pieces as CSS images ---------- */
  let SPR = null;
  let shownPair = null;   // the colours the game last applied (online: as shown, mine on my side), or a live preview from the dialog
  const ckPair = () => { if (shownPair) return shownPair; try { return (typeof CKV !== 'undefined' && CKV) || settings.ck || ['gold', 'black']; } catch (e) { return ['gold', 'black']; } };
  const TXT = { gold: '#4a3414', black: '#efe6cf', white: '#3a3630', red: '#fff1e0', green: '#f6e6b8', blue: '#f4e6bc', pearl: '#3e3430', brown: '#fbeedb' };
  function paintSprites() {
    if (!SPR) return;
    const st = de.style;
    ckPair().forEach((id, s) => {
      const k = BG3.CKL[id] ? id : 'gold';
      st.setProperty(`--bgc${s}`, `url("${SPR.ck[k]}")`); st.setProperty(`--bgs${s}`, `url("${SPR.slab[k]}")`); st.setProperty(`--bgt${s}`, TXT[k]);
      for (let v = 1; v <= 6; v++) st.setProperty(`--bgd${s}${v}`, `url("${SPR.die[k][v]}")`);
    });
    st.setProperty('--bgcube', `url("${SPR.cube}")`);
  }
  let V = null;   // AtlasSkin.view: a 2D board = the plain 2D page (no 3D table), a 3D look = the 3D board
  function look() {
    if (V) V.set(!!mine);
    build();
    de.classList.toggle('atlas-bg3d', !!mine && !!SPR);
    dieColours(!!mine);
    try { oCk.call(BGTheme, ckPair()); } catch (e) {}   // the dice colours (CSS + the rolling dice) follow the look
    paintSprites();
  }
  BG3.sprites(192).then(o => { SPR = o; look(); try { applyCk(); render(); ckSprites(); } catch (e) {} });

  /* ---------- hooks into the game ---------- */
  // dice carry their value, so each shows the render of its own face
  const oDie = window.dieHTML;
  if (typeof oDie === 'function') window.dieHTML = function (s, v) { return oDie.apply(this, arguments).replace('<div class="die ', `<div data-v="${v}" class="die `); };
  // a new board drawing (skin, colours, the board's height) → the 3D board follows
  const oDraw = window.drawBoardSvg;
  if (typeof oDraw === 'function') window.drawBoardSvg = function () { const r = oDraw.apply(this, arguments); try { look(); } catch (e) {} return r; };
  BGTheme.applyCheckers = function (pair) { if (pair && pair.length === 2) shownPair = pair.slice(); if (mine) dieColours(true); const r = oCk.apply(this, arguments); try { paintSprites(); } catch (e) {} return r; };
  // a moving checker is lifted off the board: its shadow drops away and grows, then it is set down
  const oStep = window.animStep;
  if (typeof oStep === 'function') window.animStep = function (p, s, from, to) {
    try {
      const el = mine && typeof topChecker === 'function' ? topChecker(s, from) : null;
      if (el && el.animate && settings.anim) {
        const n = p[s * 26 + from], [x0, y0] = ckXY(s, from, n - 1, n), u = uPx();
        let x1, y1; const q = p.slice(); BG.apply(q, s, from, to);
        if (to === 0) [x1, y1] = offXY(s, q[s * 26]); else { const m = q[s * 26 + to]; [x1, y1] = ckXY(s, to, m - 1, m); }
        const dist = Math.hypot(x1 - x0, y1 - y0) * u, dur = Math.min(420, 170 + dist * .55);
        const a = `drop-shadow(${u * .05}px ${u * .07}px ${u * .05}px rgba(0,0,0,.55))`, b = `drop-shadow(${u * .22}px ${u * .34}px ${u * .2}px rgba(0,0,0,.3))`;
        el.animate([{ filter: a }, { filter: b, offset: .5 }, { filter: a }], { duration: dur, easing: 'cubic-bezier(.4,.1,.3,1)' });
      }
    } catch (e) {}
    return oStep.apply(this, arguments);
  };

  /* ---------- rolling dice: the game's throw physics (dice3d.js) drives the 3D dice of the set ----------
     (its own canvas drawing is skipped); when the dice come to rest the page shows its resting dice — the renders of the same dice */
  const D3 = window.Dice3D;
  if (D3 && typeof D3.draw === 'function' && typeof D3.pose === 'function') {
    const oD3 = D3.draw, rolling = []; let hideT = 0;
    const hideRoll = () => { rolling.forEach(m => { m.visible = false; }); T3.kick(120); };
    D3.draw = function (ctx, k, list) {
      if (!mine || !SPR) return oD3.apply(this, arguments);
      try {
        const H = geoH(), W = 15.85, top = board.userData.top, pair = ckPair();
        list.forEach(({ d, t }, i) => {
          const id = BG3.CKL[pair[d.side]] ? pair[d.side] : 'gold';
          let m = rolling[i]; if (!m || m.userData.die !== id) { if (m) holder.remove(m); m = rolling[i] = BG3.dieG(id, .82); holder.add(m); }
          const ps = D3.pose(d, t); m.visible = true;
          m.position.set(ps.p[0] - W / 2, top + ps.p[2], ps.p[1] - H / 2); BG3.dieGPose(m, ps.m);
        });
        for (let i = list.length; i < rolling.length; i++) rolling[i].visible = false;
        T3.kick(150); clearTimeout(hideT); hideT = setTimeout(hideRoll, 250);   // no new frame → the page's resting dice have taken over
      } catch (e) { return oD3.apply(this, arguments); }
    };
  }
  // the checker colours follow the new-game dialog live while it is open (and fall back to the game's colours when it closes)
  const ckRows = document.getElementById('ckRows'), newOv = document.getElementById('newOverlay');
  if (ckRows) ckRows.addEventListener('click', () => setTimeout(() => { try { if (draft && draft.ck) { shownPair = draft.ck.slice(); paintSprites(); } } catch (e) {} }, 0));
  if (newOv) new MutationObserver(() => { if (!newOv.classList.contains('show')) { try { shownPair = null; applyCk(); } catch (e) {} } }).observe(newOv, { attributes: true, attributeFilter: ['class'] });

  /* ---------- 3D盤 (2026-11-11): the six 3D boards in a 「3D盤」 box under the 2D boards (the standard of the other
     games, atlas/skin/shogi.js); a 2D board picked = the 2D page. 3D駒: the colour swatches show the 3D checkers ---------- */
  const T3L = { ja: '3D盤', en: '3D boards', zh: '3D棋盘', ko: '3D 판', es: 'Tableros 3D', fr: 'Plateaux 3D', pt: 'Tabuleiros 3D', de: '3D-Bretter', hi: '3D बोर्ड', ar: 'رقع ثلاثية الأبعاد', ru: '3D-доски', 'zh-TW': '3D棋盤', id: 'Papan 3D', tr: '3D tahtalar' };
  const lang = () => (l => /^zh-(tw|hk|mo|hant)/i.test(l) ? 'zh-TW' : String(l).slice(0, 2))((document.getElementById('langSel') || {}).value || 'ja');
  const row = document.getElementById('skinRow');
  let f3 = null;
  function paint3() {
    if (!f3) return;
    const l = lang();
    f3.querySelector('label').textContent = T3L[l] || T3L.en;
    const r3 = f3.querySelector('.bdrow');
    if (!r3.children.length) LOOKS.forEach(k => {
      const bt = document.createElement('button'); bt.type = 'button'; bt.dataset.look = k;
      const im = document.createElement('img'); im.src = T3.boardIcon ? T3.boardIcon('backgammon', k) : ''; im.alt = ''; im.draggable = false;
      bt.append(im, document.createElement('span')); bt.onclick = () => setLook(k); r3.appendChild(bt);
    });
    r3.querySelectorAll('button').forEach(bt => { const k = bt.dataset.look, sel = mine === k; bt.querySelector('span').textContent = T3.boardName ? T3.boardName(k, l, 'backgammon') : k; bt.classList.toggle('sel', sel); bt.setAttribute('aria-pressed', String(sel)); });
    if (row && mine) row.querySelectorAll('button.sel').forEach(b => b.classList.remove('sel'));
  }
  function setLook(k) {
    mine = k; try { localStorage.setItem(LK, mine); } catch (x) {}
    settings.skin = SK2D[k] || 'marquetry'; try { save(); } catch (x) {}
    try { dispatchEvent(new CustomEvent('atlas-board', { detail: { id: 'backgammon', look: k } })); } catch (x) {}
    applySkinNow(); skinSync(); paint3();
  }
  // the colour swatches of the new-game dialog: the renders of the 3D checkers while a 3D board is on
  function ckSprites() {
    if (!SPR) return;
    document.querySelectorAll('#ckRows .cksw button[data-c]').forEach(b => { const i = b.querySelector('.sw'); if (!i) return; if (mine && SPR.ck[b.dataset.c]) { i.style.background = `url("${SPR.ck[b.dataset.c]}") center/100% 100% no-repeat`; i.style.boxShadow = '0 1px 3px rgba(0,0,0,.45)'; i.classList.add('sw3'); } });
  }
  if (typeof window.ckSync === 'function') { const oc = window.ckSync; window.ckSync = function () { const r = oc.apply(this, arguments); try { ckSprites(); } catch (e) {} return r; }; }
  if (row && typeof window.skinSync === 'function') {
    const oSync = window.skinSync;
    window.skinSync = function () { const r = oSync.apply(this, arguments); try { paint3(); ckSprites(); } catch (e) {} return r; };
    row.addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.skin) { mine = ''; try { localStorage.setItem(LK, '0'); } catch (x) {} setTimeout(() => { look(); paint3(); try { ckSync(); } catch (x) {} }, 0); } }, true);
    const fd = document.getElementById('fSkin') || row.parentNode;
    const st = document.createElement('style');
    st.textContent = `html.atlas-skin #f3D{margin:12px 0 0;padding:10px 12px 12px;border-radius:14px;background:#f7efe1;border:2px solid #e3cfa6}
html.atlas-skin #f3D > label{display:block;font-weight:700;font-size:14px;color:#7a4e1c;margin:0 0 8px}
html.atlas-skin #f3D .bdrow{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px}
html.atlas-skin #f3D .bdrow button{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 4px 7px;border-radius:12px;border:2px solid transparent;background:#fffaf0;cursor:pointer;font:600 13px/1.25 inherit;color:#5a3a16;min-width:0}
html.atlas-skin #f3D .bdrow button img{display:block;width:100%;aspect-ratio:4/3;object-fit:contain;border-radius:8px}
html.atlas-skin #f3D .bdrow button.sel{border-color:#e09a00;background:#fff3d6;box-shadow:0 0 0 2px rgba(224,154,0,.25)}
html.atlas-skin #f3D .bdrow button span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
html.atlas-skin #ckRows .cksw{grid-template-columns:repeat(4,minmax(0,1fr))}
html.atlas-skin #ckRows .sw.sw3{border-radius:50%}`;
    document.head.appendChild(st);
    f3 = document.createElement('div'); f3.id = 'f3D'; f3.innerHTML = '<label></label><div class="bdrow"></div>';
    fd.appendChild(f3);
    const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint3, 30));
    try { skinSync(); } catch (e) {}
  }
  addEventListener('storage', e => { if (e.key === LK) { const v = e.newValue; mine = v === '0' ? '' : LOOKS.includes(v) ? v : mine; look(); paint3(); } });
  if (skin.view) V = skin.view({ key: 'atlas-bg-view', init: !!mine, on() { setTimeout(() => { try { render(); } catch (e) {} }, 0); } });
  look();


  /* ---------- phone landscape (land.js, html.lnd) in the portal look: the 2D page's layout, cream pills and cards ---------- */
  const LAND_CSS = [
    'html.atlas-backgammon.lnd #lndTop{gap:5px}',
    'html.atlas-backgammon.lnd #lndTop > :is(.brand-l,.brand-r){display:none!important}',
    'html.atlas-backgammon.lnd #lndTop > .atlas-top{position:relative;z-index:6;top:auto;left:auto;right:auto;flex:0 1 auto;height:34px;min-width:0;gap:4px;padding:0 3px 0 2px;background:rgba(255,246,226,.95);backdrop-filter:none;-webkit-backdrop-filter:none;border:2px solid #fff;border-radius:99px;box-shadow:0 3px 0 rgba(150,110,50,.35)}',
    'html.atlas-backgammon.lnd #lndTop > .atlas-top .sp{flex:0 0 2px;min-width:0}',
    'html.atlas-backgammon.lnd .atlas-brand{gap:6px;flex:0 1 auto;min-width:0}',
    'html.atlas-backgammon.lnd .atlas-brand img{width:26px;height:26px}',
    'html.atlas-backgammon.lnd .atlas-brand span{flex-direction:row;align-items:baseline;gap:7px;white-space:nowrap}',
    'html.atlas-backgammon.lnd .atlas-brand b{font-size:13px;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}',
    'html.atlas-backgammon.lnd .atlas-brand small{display:none}',
    'html.atlas-backgammon.lnd .atlas-gname{display:block;flex:none;font-style:normal;font-weight:900;font-size:14px;color:#d93c3c;white-space:nowrap}',
    'html.atlas-backgammon.lnd .atlas-coin{display:none}',
    'html.atlas-backgammon.lnd #lndTop :is(.atlas-ic,.atlas-lbtn){height:28px;min-width:32px;width:32px;padding:0;border-width:1.5px;box-shadow:0 2px 0 #efe3c8;flex:none;justify-content:center}',
    'html.atlas-backgammon.lnd #lndTop :is(.atlas-ic,.atlas-lbtn) svg{width:16px;height:16px}',
    'html.atlas-backgammon.lnd .atlas-lbtn b{display:none}',
    'html.atlas-backgammon.lnd .atlas-lpop{top:36px;left:0;right:auto;z-index:90}',
    'html[dir=rtl].atlas-backgammon.lnd .atlas-lpop{left:auto;right:0}',
    // the menu (新規 · 待った · 投了 · ヒント): round white chips, as the portal's other landscape pages
    'html.atlas-backgammon.lnd #lndTop .controls .btn{width:40px!important;height:32px!important;border-radius:99px!important;background:rgba(255,253,247,.96)!important;border:2px solid #fff!important;box-shadow:0 3px 0 rgba(150,110,50,.35)!important;color:var(--text)!important}',
    'html.atlas-backgammon.lnd #lndTop .controls .btn.primary{background:#ff5d5d!important;color:#fff!important;border-color:#ff5d5d!important;box-shadow:0 3px 0 #d93c3c!important}',
    'html.atlas-backgammon.lnd #lndTop .controls .btn:disabled{opacity:1!important;color:#bdb5a4!important;box-shadow:none!important}',
    'html.atlas-backgammon.lnd #lndTop .controls .btn svg{width:18px!important;height:18px!important}',
    // the tab rail and its drawer: a cream card, coral for the open tab
    'html.atlas-backgammon.lnd #lndRail{background:rgba(255,253,247,.96)!important;border:2px solid #fff!important;box-shadow:0 3px 0 rgba(150,110,50,.35)!important}',
    'html.atlas-backgammon.lnd #lndRail button{color:#5a6078!important;font-family:"Zen Maru Gothic",var(--font,sans-serif)!important;font-weight:900!important;font-size:10.5px!important;letter-spacing:-.02em!important}',
    'html.atlas-backgammon.lnd #lndRail button svg{stroke-width:2.1!important}',
    'html.atlas-backgammon.lnd #lndRail button.sel{color:#d93c3c!important;background:#fff3d8!important}',
    'html.atlas-backgammon.lnd #lndRail button.sel svg{stroke:#d93c3c!important}',
    'html.atlas-backgammon.lnd #lndRail button.sel::before{background:#d93c3c!important}',
    'html.atlas-backgammon.lnd #lndDrawer{background:#fffaf0!important;border:2px solid #fff!important;box-shadow:-18px 0 40px -14px rgba(80,40,0,.55)!important;color:var(--text)}',
    'html.atlas-backgammon.lnd #lndDrawer > .card{box-shadow:none!important;border:2px solid #f3e7cc!important;border-radius:16px!important}',
    'html.atlas-backgammon.lnd #lndLearn button{background:#fff!important;border:2px solid #efe3c8!important;color:var(--text)!important;box-shadow:0 2px 0 #efe3c8}',
    'html.atlas-backgammon.lnd #lndLearn button svg{stroke:#d93c3c!important}',
    'html.atlas-backgammon.lnd body.lnd-nav #lndNav{background:rgba(255,253,247,.96)!important;border:2px solid #fff!important;box-shadow:0 6px 18px -8px rgba(80,40,0,.55)!important}',
    'html.atlas-backgammon.lnd body.mtab-online .dock{border:2px solid #fff!important}',
    // the players in the bear-off tray and the status messages over the board (large, readable)
    'html.atlas-backgammon.lnd .lnd-pl{background:rgba(255,253,247,.95)!important;border:2px solid #fff!important;border-radius:12px!important;color:#2b3044!important;box-shadow:0 4px 10px -4px rgba(0,0,0,.45)}',
    'html.atlas-backgammon.lnd .lnd-pl.on{border-color:#ffc928!important;box-shadow:0 0 0 2px rgba(255,201,40,.45),0 4px 10px -4px rgba(0,0,0,.45)!important}',
    'html.atlas-backgammon.lnd .lnd-pl.won{border-color:#5cc98d!important}',
    'html.atlas-backgammon.lnd .lnd-pl :is(span,em){color:#5a6078!important}',
    'html.atlas-backgammon.lnd #lndMsg{background:rgba(43,48,68,.88)!important;border:0!important;color:#fff!important;font:700 14px "Zen Maru Gothic",var(--font,sans-serif)!important;padding:6px 16px!important}',
  ].join('\n');
  /* ---------- phone landscape (a landscape phone, or the page rotated on a portrait phone) ----------
     the portal's top bar becomes the slim first row of the game's grid (logo · game name · sound · language · rotate · home),
     next to the player chips; status line + menu icons in the second row; the 3D board across the full width below */
  (function landscape() {
    const bar = document.querySelector('.atlas-top'), app = document.querySelector('.app'), land = document.getElementById('btnLand');
    if (!bar || !app) return;
    const home = bar.querySelector('a.atlas-ic[aria-label=Portal]');
    // the game's name next to the portal's title
    const brand = bar.querySelector('.atlas-brand span'), gname = document.createElement('em'); gname.className = 'atlas-gname';
    if (brand) brand.appendChild(gname);
    const paintName = () => { const t = document.querySelector('h1 [data-i18n=title]'); gname.textContent = t ? t.textContent : ''; };
    paintName(); const sel = document.getElementById('langSel'); if (sel) sel.addEventListener('change', () => setTimeout(paintName, 60));
    // the rotate (landscape) button: the game's own one is in its hidden title row
    if (land) {
      const rb = document.createElement('button'); rb.type = 'button'; rb.id = 'atlasLand'; rb.innerHTML = land.innerHTML;
      rb.setAttribute('aria-label', land.getAttribute('aria-label') || 'Landscape');
      const sync = () => { rb.className = 'atlas-ic atlas-land-b' + (land.classList.contains('on') ? ' on' : '') + (land.classList.contains('pulse') ? ' pulse' : ''); rb.title = land.title || ''; };
      rb.onclick = e => { e.stopPropagation(); land.click(); setTimeout(sync, 0); };
      new MutationObserver(sync).observe(land, { attributes: true, attributeFilter: ['class', 'title'] }); sync();
      bar.insertBefore(rb, home || null);
    }
    // the game's own landscape layout (backgammon/land.js → html.lnd: a phone held sideways, or the page turned by the 横画面
    // button) — the same top row, tab rail and drawer as the 2D page; the portal bar joins its top row as a slim pill
    // (logo · title · game name · 反転 · language · 横画面 · home) in place of the page's title and icons, the 3D board lies
    // under the DOM board straight from above (the camera follows #frame)
    const css = document.createElement('style'); css.textContent = LAND_CSS; document.head.appendChild(css);
    let on = null;
    const apply = () => {
      const v = de.classList.contains('lnd');
      if (v === on) return; on = v;
      const top = document.getElementById('lndTop');
      if (v && top) top.insertBefore(bar, top.firstChild); else document.body.appendChild(bar);
      try { updateGeom(); } catch (e) {}
      requestAnimationFrame(() => { try { updateGeom(); render(); } catch (e) {} T3.kick(600); });
      T3.kick(600);
    };
    new MutationObserver(apply).observe(de, { attributes: true, attributeFilter: ['class'] });
    apply();
  })();
})();
