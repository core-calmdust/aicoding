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
  const LK = 'atlas-bg-look';
  let mine = null; try { const v = localStorage.getItem(LK); mine = v === '0' ? '' : v === 'scarlet' ? 'scarlet' : v === 'marq' ? 'marq' : null; } catch (e) {}
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
    board: frameEl,
    outer: r => ({ top: r.top, height: r.height }),
    guide: '../images/atlas/g-dice.webp', guideFallback: '../images/atlas/backgammon.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'ck\\b|\\.ck|slab|\\.die|cube|dst|glow|lbl|dice3d|arrows|frame',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'pvp' ? 'pvp' : 'ai';
      if (lv >= 1 && lv <= 10) draft.level = lv;
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
  const ckPair = () => { try { return settings.ck || ['gold', 'black']; } catch (e) { return ['gold', 'black']; } };
  const TXT = { gold: '#4a3414', black: '#efe6cf', white: '#3a3630', red: '#fff1e0' };
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
  function look() {
    build();
    de.classList.toggle('atlas-bg3d', !!mine && !!SPR);
    dieColours(!!mine);
    try { oCk.call(BGTheme, ckPair()); } catch (e) {}   // the dice colours (CSS + the rolling dice) follow the look
    paintSprites();
  }
  BG3.sprites(192).then(o => { SPR = o; look(); try { applyCk(); render(); } catch (e) {} });

  /* ---------- hooks into the game ---------- */
  // dice carry their value, so each shows the render of its own face
  const oDie = window.dieHTML;
  if (typeof oDie === 'function') window.dieHTML = function (s, v) { return oDie.apply(this, arguments).replace('<div class="die ', `<div data-v="${v}" class="die `); };
  // a new board drawing (skin, colours, the board's height) → the 3D board follows
  const oDraw = window.drawBoardSvg;
  if (typeof oDraw === 'function') window.drawBoardSvg = function () { const r = oDraw.apply(this, arguments); try { look(); } catch (e) {} return r; };
  BGTheme.applyCheckers = function (pair) { if (mine) dieColours(true); const r = oCk.apply(this, arguments); try { paintSprites(); } catch (e) {} return r; };
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

  /* ---------- the two 3D looks in the board-design row (new-game dialog) ---------- */
  const LBL = {
    marq: { ja: '寄木細工 3D', en: 'Marquetry 3D', zh: '镶嵌木 3D', ko: '상감 목재 3D', es: 'Marquetería 3D', fr: 'Marqueterie 3D', pt: 'Marchetaria 3D', de: 'Intarsie 3D', hi: 'मार्केट्री 3D', ar: 'تطعيم خشبي ثلاثي' },
    scarlet: { ja: 'レザー 3D', en: 'Leather 3D', zh: '皮革 3D', ko: '가죽 3D', es: 'Cuero 3D', fr: 'Cuir 3D', pt: 'Couro 3D', de: 'Leder 3D', hi: 'लेदर 3D', ar: 'جلد ثلاثي' },
  };
  const lang = () => (document.getElementById('langSel') || {}).value || 'ja';
  const row = document.getElementById('skinRow');
  if (row && typeof window.skinSync === 'function') {
    const oSync = window.skinSync;
    window.skinSync = function () {
      const r = oSync.apply(this, arguments);
      try {
        if (mine) row.querySelectorAll('button[data-skin]').forEach(b => b.classList.remove('sel'));
        ['scarlet', 'marq'].forEach(k => {
          const b = document.createElement('button'); b.type = 'button'; b.dataset.look = k; b.className = 'a3d' + (mine === k ? ' sel' : '');
          b.innerHTML = `${BGTheme.thumbSVG(k === 'marq' ? 'marquetry' : 'scarlet', ckPair()[0], ckPair()[1])}<i class="b3d">3D</i><span></span>`;
          b.querySelector('span').textContent = (LBL[k][lang()] || LBL[k].en);
          row.prepend(b);
        });
      } catch (e) {}
      return r;
    };
    row.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.look) {
        e.stopImmediatePropagation();
        mine = b.dataset.look; try { localStorage.setItem(LK, mine); } catch (x) {}
        settings.skin = mine === 'scarlet' ? 'scarlet' : 'marquetry'; try { save(); } catch (x) {}
        applySkinNow(); skinSync();
      } else if (b.dataset.skin) { mine = ''; try { localStorage.setItem(LK, '0'); } catch (x) {} setTimeout(look, 0); }
    }, true);
    try { skinSync(); } catch (e) {}
  }
  look();
})();
