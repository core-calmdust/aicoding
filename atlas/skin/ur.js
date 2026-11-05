/* =====================================================================
   The Royal Game of Ur — portal skin (ur/?skin=atlas)
   The full page keeps every feature (AI in 20 levels, rated games, two players, lessons,
   puzzles, review, coach…). This file:
     • draws the British Museum board (atlas/models/ur.js) with the 3D table; the camera is
       aligned to the DOM board (#frame), which stays on top (transparent) for taps, the
       green destinations, the arrows, the last-move frames and the danger marks
     • horizontal board on PC / landscape, the board turned on a phone held upright (the
       board is symmetric across its middle row, so a quarter turn gives the same picture as
       the page's mirrored vertical layout; the pieces follow the page's own coordinates)
     • mirrors the page's pieces (UrSkin3D.sync): shell / shale discs (or the ivory, wood,
       gold looks of the design tab); a move lifts the piece, slides it along its route square
       by square and sets it down; a captured piece is knocked back to its owner's start tray;
       the selected piece is lifted
     • the four tetrahedral dice are thrown in the notch on the side of the player to move:
       they drop, tumble, bounce and settle with the rolled number of white tips on top
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   World units = the page's SVG units / 100 (1 = one square). Rendering is on demand (Table3D.kick).
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D, E = window.UrEngine, B2 = window.UrBoard2D;
  if (!THREE || !T3 || !T3.ur || !E || !B2 || !window.AtlasSkin || !window.UrApp || !window.UrDice3D) return;
  const de = document.documentElement, frameEl = document.getElementById('frame');
  if (!frameEl) return;
  de.classList.add('atlas-ur');

  /* ---------- page: the DOM board's pictures become invisible (taps and marks stay) ---------- */
  const st = document.createElement('style');
  st.textContent = `
html.atlas-ur .board-wrap svg.ur-board{filter:none!important}
html.atlas-ur .ur-img,html.atlas-ur .ur-tray rect,html.atlas-ur .ur-tray circle{opacity:0!important}
html.atlas-ur .ur-pieces .ur-pc{opacity:0!important}
html.atlas-ur .frame > .dice-dock .dice-host{opacity:0!important}
html.atlas-ur .dice-dock{background:none!important}
html.atlas-ur .frame > .dice-dock.can{animation:urDk 1.8s ease-in-out infinite!important}
@keyframes urDk{0%,100%{box-shadow:0 0 0 2px rgba(255,214,120,.35),0 0 10px rgba(255,214,120,.2)}50%{box-shadow:0 0 0 3px rgba(255,214,120,.75),0 0 22px rgba(255,214,120,.5)}}
html.atlas-ur .frame > .dice-dock .dice-cap{color:#fff3d2!important;text-shadow:0 1px 3px rgba(0,0,0,.85)!important}
/* phones held upright (html.ur-band): the page's own dice in the players' strips (off the 3D board) — a soft tray in the cream card;
   the portal bar is taller than the page's brand row: the board leaves it room (--oh) */
html.atlas-ur.ur-band .pdk{background:rgba(120,80,30,.1)!important;border-color:rgba(150,110,50,.28)!important;box-shadow:inset 0 1px 3px rgba(90,60,20,.25)!important}
/* (2026-11-05) the same board size as the 2D page on a phone held upright: a slimmer portal bar (40px; the page's own brand row +
   gaps take 34px), no extra margin around the board, the same 8px gaps → the page's --oh + 6px − the face strip below (16px) */
html.atlas-ur{--oh:330px!important}
/* the roll button (2026-11-05): a cream plate with lapis-blue letters, a die icon and a thin lapis rim (the same family as the ゴール
   tag), pressed into a lapis shadow; it breathes softly on your turn. The 2D page keeps its bitumen-and-gold plate */
html.atlas-ur .dice-dock .roll-pill{background:linear-gradient(180deg,#fffdf6,#f6ecd6)!important;border:2px solid #3d5fc4!important;border-radius:99px!important;box-shadow:0 4px 0 #1f3a8f,0 8px 16px -8px rgba(30,40,90,.55)!important;filter:none!important;animation:none!important;
  color:#1f3a8f!important;text-shadow:none!important;font-family:'Zen Maru Gothic',sans-serif!important;font-weight:900!important;letter-spacing:.12em!important;text-indent:0!important;writing-mode:horizontal-tb!important;gap:.35em}
html.atlas-ur .dice-dock .roll-pill::before{content:'';position:static!important;inset:auto!important;box-shadow:none!important;flex:none;width:1.05em;height:1.05em;border-radius:0!important;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231f3a8f' stroke-width='2.2' stroke-linejoin='round'%3E%3Cpath d='M12 3 3 19h18z'/%3E%3Cpath d='M12 3v16M3 19l9-6 9 6'/%3E%3C/svg%3E") center/contain no-repeat}
html.atlas-ur .dice-dock .roll-pill:active,html.atlas-ur .dice-dock.press .roll-pill{box-shadow:0 1px 0 #1f3a8f!important;transform:translate(-50%,-50%) translateY(3px)!important}
html.atlas-ur .dice-dock.can:not(.rolling) .roll-pill{animation:urRp 2.2s ease-in-out infinite!important}
@keyframes urRp{0%,100%{box-shadow:0 4px 0 #1f3a8f,0 0 0 0 rgba(61,95,196,0)}50%{box-shadow:0 4px 0 #1f3a8f,0 0 0 5px rgba(61,95,196,.2)}}
html.atlas-ur .frame > .dice-dock .roll-pill{font-size:calc(var(--bw) * .022)!important}
/* phones held upright: the side columns (手持ち / ゴール, board2d 'vfn') — framed on the wood with dark labels */
html.atlas-ur .ur-vfn .ur-tray .ur-trayb > circle{opacity:1!important;fill:none!important;stroke:rgba(90,55,15,.28)!important;stroke-dasharray:4 4}   /* (the DOM board lies over the 3D pieces: outlines only) */
html.atlas-ur .ur-vfn .ur-sb{fill:rgba(255,248,230,.0)!important;stroke-width:3!important}
/* 手持ち = bitumen brown / gold, ゴール = lapis lazuli; the label on a cream plate with the colour's rim (like the portal's tags) */
html.atlas-ur .ur-vfn .ur-sb-start{stroke:#7a5426!important;stroke-opacity:.85!important;stroke-width:3.5!important}
html.atlas-ur .ur-vfn .ur-sb-goal{stroke:#24409a!important;stroke-opacity:.9!important;stroke-width:3.5!important}
html.atlas-ur .ur-vfn .ur-slb{fill:#fffaf0!important;stroke-width:2.5!important;stroke-opacity:1!important}
html.atlas-ur .ur-vfn .ur-slb-start{stroke:#b98a3e!important}
html.atlas-ur .ur-vfn .ur-slb-goal{stroke:#3d5fc4!important}
html.atlas-ur .ur-vfn :is(.ur-sl,.ur-sn){font-family:'Zen Maru Gothic',sans-serif!important;font-weight:900!important;stroke:none!important}
html.atlas-ur .ur-vfn .ur-sl-start, html.atlas-ur .ur-vfn .ur-sn-start{fill:#6b4518!important}
html.atlas-ur .ur-vfn .ur-sl-goal, html.atlas-ur .ur-vfn .ur-sn-goal{fill:#1f3a8f!important}
html.atlas-ur body:is(.in-lesson,.in-puzzle){--oh:410px!important}
@media (pointer: coarse) and (max-width: 760px) and (orientation: portrait){
  html.atlas-skin.atlas-ur .app{padding-top:48px!important}
  html.atlas-ur .atlas-top{height:40px;gap:6px}
  html.atlas-ur .atlas-brand img{width:28px;height:28px}
  html.atlas-ur .atlas-brand b{font-size:15px}
  html.atlas-ur .atlas-brand small{font-size:8.5px}
  html.atlas-ur :is(.atlas-ic,.atlas-lbtn){height:32px;min-width:32px;width:32px}
  html.atlas-ur :is(.atlas-ic,.atlas-lbtn) svg{width:17px;height:17px}
  html.atlas-ur .atlas-lpop{top:40px}
  html.atlas-ur.ur-band .board-area > #frame{margin:0!important}
  /* (the 3D board has no side-face strip under it as the 2D picture: its bottom edge is ~33 units higher — your card comes up by that) */
  html.atlas-ur.ur-band.bv .board-area > #frame{margin-bottom:calc(var(--bw) * -.0569)!important}
  html.atlas-ur.ur-band .controls .btn{padding:5px 1px!important}
}
/* phones held sideways (the page's landtabs.js → html.ur-land): the portal bar is a slim pill in the page's top row (logo · name ·
   icons), the menu icons as cream pills beside it, the rail / drawer / cards in the cream portal look on the wood */
@media (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-height: 560px), (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-width: 900px){
  html.atlas-ur.ur-land .app{padding-top:6px!important}
  html.atlas-ur.ur-land body.lt-on .app{grid-template-columns:auto minmax(0,1fr) 58px!important;grid-template-areas:"bl ct ct" "board board rl"!important}
  html.atlas-ur.ur-land .app > .atlas-top{position:relative;z-index:6;grid-area:bl;top:auto;left:auto;right:auto;height:32px;min-width:0;gap:4px;padding:0 3px 0 2px;background:rgba(255,246,226,.94);backdrop-filter:none;-webkit-backdrop-filter:none;border:2px solid #fff;border-radius:99px;box-shadow:0 3px 0 rgba(150,110,50,.35);align-self:center;justify-self:start}
  html.atlas-ur.ur-land .atlas-top .sp{flex:0 0 4px;min-width:0}
  html.atlas-ur.ur-land .atlas-brand{gap:6px;flex:0 1 auto;min-width:0}
  html.atlas-ur.ur-land .atlas-brand img{width:26px;height:26px}
  html.atlas-ur.ur-land .atlas-brand span{flex-direction:row;align-items:baseline;gap:7px;white-space:nowrap}
  html.atlas-ur.ur-land .atlas-brand b{font-size:12.5px;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
  html.atlas-ur.ur-land .atlas-brand small{display:none}
  html.atlas-ur.ur-land .atlas-coin{display:none}
  html.atlas-ur.ur-land :is(.atlas-ic,.atlas-lbtn){height:26px;min-width:30px;width:30px;padding:0;border-width:1.5px;box-shadow:0 2px 0 #efe3c8;flex:none;justify-content:center}
  html.atlas-ur.ur-land :is(.atlas-ic,.atlas-lbtn) svg{width:15px;height:15px}
  html.atlas-ur.ur-land .atlas-lbtn b{display:none}
  html.atlas-ur.ur-land .atlas-lpop{top:34px;right:0;z-index:90}
  html.atlas-ur.ur-land body.lt-on .controls .btn{width:38px!important;height:30px!important;border-radius:99px!important;background:rgba(255,253,247,.95)!important;border:2px solid #fff!important;box-shadow:0 3px 0 rgba(150,110,50,.35)!important;color:var(--text)!important}
  html.atlas-ur.ur-land body.lt-on .controls .btn:disabled{opacity:1!important;color:#bdb5a4!important;box-shadow:none!important}
  html.atlas-ur.ur-land body.lt-on .board-area > .player{background:rgba(255,253,247,.95)!important;border:2px solid #fff!important;border-radius:16px!important;box-shadow:0 10px 24px -16px rgba(80,40,0,.55)!important}
  html.atlas-ur.ur-land body.lt-on .board-area > .player.active{border-color:#ffc928!important}
  html.atlas-ur.ur-land body.lt-on .board-area > .player .home small{color:#7a7f94!important}
  html.atlas-ur.ur-land body.lt-on #ltRail{background:rgba(255,253,247,.95)!important;border:2px solid #fff!important;box-shadow:0 3px 0 rgba(150,110,50,.35)}
  html.atlas-ur.ur-land body.lt-on #ltRail button{color:#6a7088!important}
  html.atlas-ur.ur-land body.lt-on #ltRail button.sel{color:#d93c3c!important;background:#fff3d8!important}
  html.atlas-ur.ur-land body.lt-on #ltRail button.sel::before{background:#d93c3c!important}
  html.atlas-ur.ur-land body.lt-on #ltPanel{background:#fffaf0!important;border:2px solid #fff!important;box-shadow:-18px 0 40px -14px rgba(80,40,0,.55)!important}
  html.atlas-ur.ur-land body.lt-on #ltLearn button{background:#fff!important;border:2px solid #efe3c8!important;color:var(--text)!important}
  html.atlas-ur.ur-land body.lt-on #ltLearn button svg{stroke:#d93c3c!important}
  html.atlas-ur.ur-land body.lt-on.mtab-online .ol-pane{background:#fffaf0!important;border:2px solid #fff!important;color:var(--text)}
  html.atlas-ur.ur-land body.lt-on.mtab-online .ol-pane h3{color:#2b3044!important}
  html.atlas-ur.ur-land body.lt-on.mtab-online .ol-pane p{color:#5a6078!important}
  html.atlas-ur.ur-land body.lt-on.lt-nav #ltNav{background:rgba(255,253,247,.96)!important;border:2px solid #fff!important;box-shadow:0 6px 18px -8px rgba(80,40,0,.55)!important}
}
html.atlas-ur #bdRow{display:none!important}
/* phones / narrow: the menu buttons are round chips (skin.css): their labels stay on one line, small, never cut mid-glyph */
@media not all and (hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4){
  html.atlas-ur .controls{gap:5px!important}
  html.atlas-ur .controls .btn{padding:7px 1px!important;min-width:0}
  html.atlas-ur .controls .btn span{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;font-size:9.5px!important;letter-spacing:-.04em}
  html.atlas-ur .controls .btn[data-short] > span{font-size:0!important}
  html.atlas-ur .controls .btn[data-short] > span::after{content:attr(data-s);font-size:9.5px;letter-spacing:-.04em}
  /* the players above / below the board: the same cream cards as the other 3D games (readable over the wood) */
  html.atlas-ur .board-area > .player{background:rgba(255,253,247,.95)!important;border:2px solid #fff!important;border-radius:16px!important;box-shadow:0 10px 24px -16px rgba(80,40,0,.55)!important}
  html.atlas-ur .board-area > .player.active{border-color:#ffc928!important}
  html.atlas-ur .board-area > .player .sub{color:#6a7088!important}
  html.atlas-ur .board-area > .player .sub b{color:#2b3044!important}
  html.atlas-ur .board-area > .player .home small{color:#7a7f94!important}
}
html.atlas-ur .ur3dnote{margin:0;padding:12px 14px;border-radius:14px;background:#f8f0e0;border:2px solid #ead9b6;font-size:13px;line-height:1.6;color:#4a4f66}
html.atlas-ur .ur3dnote b{display:block;font-size:14px;color:#2b3044;margin-bottom:2px}
`;
  document.head.appendChild(st);
  // PC: the page lays out its header-bar layout under html.hb-on; with the portal bar as the header it gets html.hb-atlas
  // instead (shared/headerbar.js), so the page's hb-on rules are copied for hb-atlas (64px portal bar)
  (function hbAtlas() {
    const css = ['html.atlas-ur.hb-atlas,html.atlas-ur.hb-atlas body{--hb-h:64px}', 'html.atlas-ur.hb-atlas body{padding-top:64px}'];
    const conv = sel => sel.replace(/\b(html|body)\.hb-on\b/g, '$1.hb-atlas');
    const walk = (rules, wrap) => { for (const r of rules) {
      if (r.cssRules && r.conditionText !== undefined) { walk(r.cssRules, t => wrap((r.type === 4 ? '@media ' : '@supports ') + r.conditionText + '{' + t + '}')); continue; }
      if (r.selectorText && /\b(html|body)\.hb-on\b/.test(r.selectorText)) css.push(wrap(conv(r.selectorText) + '{' + r.style.cssText + '}'));
    } };
    for (const sh of document.styleSheets) { const n = sh.ownerNode; if (sh.href || (n && n.id === 'hbCss')) continue; let R; try { R = sh.cssRules; } catch (e) { continue; } walk(R, t => t); }   // (not the header bar's own sheet: its 2D bar must stay hidden)
    // a little room under the portal bar (the page's own 12px left the 3D pieces above the board touching it)
    css.push('@media (hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4){html.atlas-ur.hb-atlas .app{padding-top:28px!important}}');
    const s2 = document.createElement('style'); s2.textContent = css.join('\n'); document.head.appendChild(s2);
  })();

  const skin = AtlasSkin.init({
    margin: 0.12,
    board: frameEl,
    outer: r => ({ top: r.top, height: r.height }),
    guide: '../images/atlas/g-dice.webp', guideFallback: '../images/atlas/ur.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'ur-|dice|roll-pill|fx-|frame|board-wrap',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      if (side === 1 || side === 2) draft.color = side === 2 ? '1' : '0';
      if (lv >= 1 && lv <= 20) draft.level = lv;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;

  /* ---------- the board ---------- */
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const board = T3.MODELS.ur(true), U = board.userData, Y = U.top; inner.add(board);
  // the frame's centre is SVG (0, 4) (viewBox −272 … 280 down the frame): world = SVG / 100 with that centre at the origin
  // (phones held upright, 'vn': the frame is the board alone, −434 … 462 down → centre (0, 14))
  let CZ = .04, CX = 0;   // (phones sideways, 'hn': the board alone, −434 … 462 across → centre (0.14, 0))
  let O = 'h';
  const vkey = () => { const v = UrApp.view; return v && v.key ? v.key() : O; };
  const VB = () => B2.VIEW[vkey()] || (O === 'v' ? B2.VIEW.v : B2.VIEW.h);
  const units = () => VB()[3] / 100;
  function orientTo(o) {
    O = String(o)[0] === 'v' ? 'v' : 'h';
    { const V = VB(); CZ = (V[1] + V[3] / 2) / 100; CX = (V[0] + V[2] / 2) / 100; }
    // (phones held upright, 'vf…': the board turned the other way — the big block at the bottom, row 2 (Light) on the right)
    const fl = O === 'v' && String(o).indexOf('f') > 0;
    U.orient && U.orient(fl ? 'vccw' : O);
    board.rotation.y = O === 'v' ? (fl ? U.rot.vccw : U.rot.v) : 0;
    inner.position.set(-CX, 0, -CZ);   // (the vertical viewBox, −272 … 272 across and −462 … 470 down, has its centre at (0, 4) too)
    skin.alignTo(units(), Y);
  }
  T3.show('ur', root, { still: true });
  orientTo(vkey());
  T3.kick(800);
  { let last = ''; const app = document.querySelector('.app') || document.body;   // the header bar / info row can move the board without resizing it
    const chk = () => { const r = frameEl.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width) + ',' + Math.round(r.height); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (window.ResizeObserver) { new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); new ResizeObserver(() => requestAnimationFrame(chk)).observe(frameEl); }
    setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- the new-game dialog: the 3D board replaces the four 2D boards ---------- */
  const NOTE = {
    ja: ['3D：大英博物館の盤', 'ウル王墓出土の盤（貝殻・ラピスラズリ・赤い石灰岩の象嵌）を3Dで表示しています。駒の見た目は下で選べます。'],
    en: ['3D: the British Museum board', 'The board from the Royal Tombs of Ur (shell, lapis lazuli and red limestone inlay) in 3D. Choose the look of the pieces below.'],
    zh: ['3D：大英博物馆的棋盘', '以3D呈现乌尔王陵出土的棋盘（贝壳、青金石与红色石灰岩镶嵌）。棋子外观可在下方选择。'],
    ko: ['3D: 대영박물관의 판', '우르 왕릉에서 나온 판(조개껍데기·청금석·붉은 석회암 상감)을 3D로 표시합니다. 말의 모양은 아래에서 고릅니다.'],
    es: ['3D: el tablero del Museo Británico', 'El tablero de las Tumbas Reales de Ur (taracea de concha, lapislázuli y caliza roja) en 3D. Elige abajo el aspecto de las fichas.'],
    fr: ['3D : le plateau du British Museum', 'Le plateau des tombes royales d’Ur (marqueterie de coquillage, lapis-lazuli et calcaire rouge) en 3D. Choisissez ci-dessous l’aspect des pions.'],
    pt: ['3D: o tabuleiro do Museu Britânico', 'O tabuleiro dos Túmulos Reais de Ur (marchetaria de concha, lápis-lazúli e calcário vermelho) em 3D. Escolha abaixo o visual das peças.'],
    de: ['3D: das Brett des British Museum', 'Das Brett aus den Königsgräbern von Ur (Einlagen aus Muschel, Lapislazuli und rotem Kalkstein) in 3D. Das Aussehen der Steine wählst du unten.'],
    hi: ['3D: ब्रिटिश म्यूज़ियम का बोर्ड', 'उर की शाही कब्रों से मिला बोर्ड (सीप, लाजवर्द और लाल चूना पत्थर की जड़ाई) 3D में। गोटियों का रूप नीचे चुनें।'],
    ar: ['ثلاثي الأبعاد: رقعة المتحف البريطاني', 'رقعة المقابر الملكية في أور (تطعيم بالصدف واللازورد والحجر الجيري الأحمر) بالأبعاد الثلاثة. اختر شكل القطع أدناه.'],
  };
  // phones: a shorter label where the page's one does not fit a round menu chip (like checkers' "Game")
  const SHORT = { btnNew: { en: 'Game', es: 'Partida', pt: 'Partida', fr: 'Partie', de: 'Partie' }, btnUndo: { es: 'Atrás', pt: 'Voltar' }, btnResign: { fr: 'Abandon', de: 'Aufgabe', es: 'Rendir', hi: 'हार' },
    btnLesson: { es: 'Lección', de: 'Lektion' }, btnPuzzle: { es: 'Retos', pt: 'Retos', fr: 'Défis', de: 'Rätsel' } };
  function shortLabels() {
    const l = (document.getElementById('langSel') || {}).value || 'ja';
    for (const id in SHORT) { const b = document.getElementById(id), sp = b && b.querySelector('span'); if (!sp) continue; const v = SHORT[id][l];
      if (v) { b.dataset.short = '1'; sp.dataset.s = v; } else { delete b.dataset.short; delete sp.dataset.s; } }
  }
  shortLabels(); { const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(shortLabels, 40)); }
  const fd = document.getElementById('fDesign');
  if (fd) {
    const p = document.createElement('p'); p.className = 'ur3dnote'; fd.appendChild(p);
    const paint = () => { const l = (document.getElementById('langSel') || {}).value || 'ja', n = NOTE[l] || NOTE.en; p.innerHTML = ''; const b = document.createElement('b'); b.textContent = n[0]; p.append(b, n[1]); };
    paint(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint, 30));
  }

  /* ---------- helpers ---------- */
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const spd = () => { try { return typeof SPD === 'function' ? SPD() : 1; } catch (e) { return 1; } };
  let tok = 0;
  const anim = (dur, f, my) => new Promise(res => { const t0 = performance.now(); (function s(n) { if (my !== undefined && my !== tok) return res(); const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(150); if (k < 1) requestAnimationFrame(s); else res(); })(t0); });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // SVG user units → the board group's (x, z); a piece standing lower than the playing surface (on the table) is pushed out a
  // little so that, seen from the camera, it still covers its DOM place (the camera stands PERSP × the frame height above the field)
  const camD = () => 2.6 * units();
  const at = (xy, y = Y) => { const f = 1 + (Y - y) / camD(); return [(xy[0] / 100 - CX) * f + CX, (xy[1] / 100 - CZ) * f + CZ]; };
  const vw = () => UrApp.view;
  const cellXY = (r, c) => vw().cellXY(r, c);
  const oKey = () => { const v = vw(); return v ? (v.key ? v.key() : v.orient() + (v.rotated && v.rotated() ? 'r' : '')) : 'h'; };
  const design = () => de.dataset.pcs || 'orig';
  const goalOf = s => (E.RULES[s.rule] || E.RULES.finkel).goal;

  /* ---------- pieces ---------- */
  const P3 = new Map();   // side * 100 + k → { g, side, k, pos, design }
  function mk(side, k) {
    const g = new THREE.Group(), p = U.piece(side, design()); g.add(p);
    const sh = T3.contact(U.PR * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh; g.userData.pc = p;
    inner.add(g); return { g, side, k, pos: null, design: design(), h: 0 };
  }
  function lift(o, h) {
    o.h = h; o.g.userData.pc.position.y = h;
    const sh = o.g.userData.sh; const s = 1 + h * .6; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 2);
  }
  // where each piece of a state stands: { place: [x, z], y }
  function layout(s) {
    const o = oKey(), goal = goalOf(s), out = new Map();
    for (const side of [0, 1]) {
      const R = B2.route(s.rule, side), ps = s.pos[side], n = ps.length;
      const S = B2.traySlots(o, side, 'start', n), G = B2.traySlots(o, side, 'goal', n);
      const sl = [], gl = []; ps.forEach((p, k) => { if (p <= 0) sl.push(k); else if (p >= goal) gl.push(k); });
      ps.forEach((p, k) => {
        let xy, y;
        if (p <= 0) { xy = S[sl.indexOf(k)]; y = 0; }
        else if (p >= goal) { xy = G[gl.indexOf(k)]; y = 0; }
        else { const [r, c] = R[p - 1]; xy = cellXY(r, c); y = Y; }
        out.set(side * 100 + k, { xy, y, pos: p, side, k });
      });
    }
    return out;
  }
  function placeAt(o, q) { const [x, z] = at(q.xy, q.y); o.g.position.set(x, q.y, z); o.g.rotation.y = (o.k * 1.7 + o.side) % (Math.PI * 2); o.pos = q.pos; }
  let moving = null, lastState = null;
  // the piece to lift: the page's selected piece (its gold ring, lessons / puzzles), or the piece the mouse is over whose move the
  // page previews (hoverMove: a tap moves it at once, there is no separate selection step in a game): side * 100 + k
  function selected(s) {
    const v = vw(), svg = v && v.svg && v.svg();
    if (svg) for (const g of svg.querySelectorAll('.ur-pc')) { const ring = g.children[1]; if (ring && +ring.getAttribute('opacity') > 0 && g.__q) return g.__q.side * 100 + g.__q.k; }
    let hm = null; try { hm = typeof hoverMove !== 'undefined' ? hoverMove : null; } catch (e) {}
    if (hm && s && s.pos[s.turn]) { const k = s.pos[s.turn].findIndex(p => p === hm.from); if (k >= 0) return s.turn * 100 + k; }
    return -1;
  }
  function mirror(s) {
    if (!s || !s.pos) return;
    lastState = s;
    const L = layout(s), sel = selected(s), dz = design();
    for (const [key, o] of P3) if (!L.has(key) || o.design !== dz) { inner.remove(o.g); o.g.userData.sh.material.dispose(); P3.delete(key); }
    for (const [key, q] of L) {
      let o = P3.get(key);
      if (!o) { o = mk(q.side, q.k); P3.set(key, o); }
      if (moving && moving.has(key)) continue;
      placeAt(o, q);
      const want = key === sel ? .22 : 0;
      if (Math.abs(o.h - want) > .001) { const h0 = o.h; anim(want ? 130 : 110, k => lift(o, h0 + (want - h0) * io(k))); } else lift(o, want);
    }
    T3.kick(300);
  }

  /* ---------- a move: lift, slide along the route square by square, set down; a hit piece goes home ---------- */
  async function travel(side, from, to, info) {
    const s = lastState || UrApp.state(); if (!s) return;
    const goal = goalOf(s), o3 = oKey(), R = B2.route(s.rule, side);
    const k = s.pos[side].findIndex(p => p === from); if (k < 0) return;
    const o = P3.get(side * 100 + k); if (!o) return;
    const my = ++tok, sp = Math.max(.5, (info && info.speed) || spd());
    // the waypoints: the start tray slot (or the square it stands on), each square on the way, the square / goal slot reached
    const L = layout(s), pts = [L.get(side * 100 + k)];
    for (let i = Math.max(1, from + 1); i <= Math.min(to, goal - 1); i++) { const [r, c] = R[i - 1]; pts.push({ xy: cellXY(r, c), y: Y }); }
    if (to >= goal) { const n = s.pos[side].length, G = B2.traySlots(o3, side, 'goal', n), j = s.pos[side].filter(p => p >= goal).length; pts.push({ xy: G[j], y: 0 }); }
    // the piece hit: the opponent's piece on the square reached
    let vic = null;
    if (info && info.capture && to < goal) {
      const [r, c] = R[to - 1], op = 1 - side, Ro = B2.route(s.rule, op);
      const vk = s.pos[op].findIndex(p => p > 0 && p < goal && Ro[p - 1][0] === r && Ro[p - 1][1] === c);
      if (vk >= 0) vic = { o: P3.get(op * 100 + vk), side: op, k: vk };
    }
    moving = new Set([side * 100 + k]); if (vic) moving.add(vic.side * 100 + vic.k);
    const W = pts.map(q => { const [x, z] = at(q.xy, q.y); return [x, q.y, z]; });
    const H = .34, up = 150 / sp, legT = 170 / sp, down = 150 / sp, legs = W.length - 1;
    const h0 = o.h;
    // lift
    await anim(up, q => { const e = io(q); lift(o, h0 + (H - h0) * e); }, my);
    // slide along the route (each square a small dip, so the count of squares reads)
    for (let i = 0; i < legs && my === tok; i++) {
      const [x0, ya, z0] = W[i], [x1, yb, z1] = W[i + 1];
      await anim(legT, q => { const e = io(q); o.g.position.x = x0 + (x1 - x0) * e; o.g.position.z = z0 + (z1 - z0) * e; o.g.position.y = ya + (yb - ya) * e; lift(o, H + Math.sin(q * Math.PI) * .06); }, my);   // a little hop over each square: the count reads
    }
    if (my !== tok) return;
    // the hit piece is knocked off as the piece comes down, and slides home to its start tray
    let vp = null;
    if (vic && vic.o) {
      const ns = { rule: s.rule, pos: [s.pos[0].slice(), s.pos[1].slice()] }; ns.pos[side][k] = to; ns.pos[vic.side][vic.k] = 0;
      const tq = layout(ns).get(vic.side * 100 + vic.k), [tx, tz] = at(tq.xy, 0), vo = vic.o, sx = vo.g.position.x, sz = vo.g.position.z, sy = vo.g.position.y;
      vp = anim(520 / sp, q => { const e = io(q); vo.g.position.set(sx + (tx - sx) * e, sy * (1 - e), sz + (tz - sz) * e); lift(vo, Math.sin(q * Math.PI) * .9); vo.g.rotation.z = Math.sin(q * Math.PI) * .9; }, my).then(() => { vo.g.rotation.z = 0; lift(vo, 0); });
    }
    await anim(down, q => lift(o, H * (1 - io(q))), my);
    if (my !== tok) return;
    o.pos = to;
    await anim(110 / sp, q => { const s2 = 1 + Math.sin(q * Math.PI) * .06; o.g.userData.pc.scale.set(s2, 1 / s2, s2); }, my);
    o.g.userData.pc.scale.set(1, 1, 1);
    if (vp) await vp;
  }

  /* ---------- dice: four tetrahedra in the notch of the side to move ---------- */
  const DICE = [], DS = .8;   // the dice a little smaller than the model's, so four fit in the notch side by side
  const REST = () => U.dieRest * DS;
  let rolling = false, diceSide = 0, shown = null;
  function diceN(s) { return (E.RULES[(s || lastState || {}).rule] || E.RULES.finkel).dice || 4; }
  function ensureDice(n) {
    while (DICE.length < n) {
      const g = new THREE.Group(), d = U.die(); d.scale.setScalar(DS); g.add(d);
      const sh = T3.contact(U.dieR * DS * 1.05, .45); sh.position.y = .002; g.add(sh);
      g.userData = { d, sh }; inner.add(g); DICE.push(g);
    }
    DICE.forEach((g, i) => { g.visible = i < n; });
  }
  function dicePlaces(side, n) {   // along the notch (columns 4–5) on that side
    const row = side === 0 ? 2 : 0, a = cellXY(row, 4), b = cellXY(row, 5), out = [];
    const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, ux = (b[0] - a[0]) / 100, uy = (b[1] - a[1]) / 100;
    for (let i = 0; i < n; i++) { const t = (i - (n - 1) / 2) * 41, j = ((i * 37) % 11 - 5) * 1.4; out.push([cx + ux * t - uy * j, cy + uy * t + ux * j]); }
    return out;
  }
  function restDice(side, d) {
    const n = d ? d.length : diceN(); ensureDice(n);
    const P = dicePlaces(side, n);
    for (let i = 0; i < n; i++) {
      const g = DICE[i], [x, z] = at(P[i], REST());
      U.dieUp(g.userData.d, !!(d && d[i]), i * 1.9 + side * .7 + .3);
      g.userData.d.position.set(0, 0, 0); g.position.set(x, REST(), z);
      g.userData.sh.position.y = .002 - REST();
    }
    diceSide = side; shown = d ? d.slice() : null; T3.kick(200);
  }
  // a throw: each die drops from the player's hand side, tumbles, bounces 2–3 times and settles on its rolled orientation
  async function roll(d) {
    const s = UrApp.state() || lastState, side = s ? s.turn : 0, n = d.length;
    ensureDice(n); rolling = true; const my = ++tok;
    const P = dicePlaces(side, n), sgn = (O === 'v' ? 1 : 1) * (side === 0 ? 1 : -1);
    // thrown in from outside the board on the player's side (atlas/models/ur-dice.js: the shared throw)
    const items = DICE.slice(0, n).map((g, i) => {
      const [x1, z1] = at(P[i], REST());
      const out = O === 'v' ? [x1 + sgn * (1.6 + Math.random() * .6), z1 + (Math.random() - .5) * 1.2] : [x1 + (Math.random() - .5) * 1.2, z1 + sgn * (1.6 + Math.random() * .6)];
      return { g, d: g.userData.d, sh: g.userData.sh, from: out, to: [x1, z1], marked: !!d[i], rest: REST() };
    });
    const dur = (animOk() ? 980 : 0) / Math.max(.6, spd());
    if (dur < 50) { restDice(side, d); rolling = false; return; }
    const TP = window.UrDice3D.throwPlan(items, { dur });
    await anim(TP.total, k => TP.frame(k * TP.total), my);
    if (my === tok) TP.end();
    diceSide = side; shown = d.slice(); rolling = false; T3.kick(200);
    await sleep(120 / Math.max(.6, spd()));
  }
  // phones held upright (html.ur-band): the page throws its own dice in the players' strips, off the board — none here
  const offBoard = () => de.classList.contains('ur-band');
  function syncDice(s) {
    if (offBoard()) { if (DICE.some(g => g.visible)) { DICE.forEach(g => { g.visible = false; }); diceSide = -1; T3.kick(100); } return; }
    if (rolling || !s) return;
    const r = UrApp.roll(), n = diceN(s);
    const d = r && r.d && r.d.length === n ? r.d : null;
    const same = diceSide === s.turn && DICE.length >= n && DICE.slice(0, n).every(g => g.visible) && JSON.stringify(shown) === JSON.stringify(d);
    if (!same) restDice(s.turn, d);
  }

  /* ---------- the hooks the page calls (ur/SKIN-HOOKS.md) ---------- */
  let lastO = null;
  function checkOrient() { const o = vkey(); if (o !== lastO) { lastO = o; orientTo(o); return true; } return false; }
  window.UrSkin3D = {
    sync(s) {
      const ch = checkOrient();
      if (ch) { tok++; moving = null; rolling = false; }
      try { mirror(s); } catch (e) { console.error(e); }
      syncDice(s);
      if (ch) { shown = null; diceSide = -1; syncDice(s); }
    },
    async animateMove(side, from, to, info) {
      if (!animOk()) return;
      try { await travel(side, from, to, info || {}); } finally { moving = null; }
    },
    async animateRoll(d) { checkOrient(); await roll(d || []); },
  };
  lastO = vkey();
  try { UrApp.render(); } catch (e) { try { window.UrSkin3D.sync(UrApp.state()); } catch (x) {} }
  // the design tab: the piece look changes the 3D pieces (the page re-renders after setDesign)
  new MutationObserver(() => { const s = lastState || UrApp.state(); if (s) { mirror(s); } }).observe(de, { attributes: true, attributeFilter: ['data-pcs'] });

  /* ---------- the rotate (landscape) button: the page's own one is in its hidden brand row → a copy in the portal bar (as backgammon;
     shown on touch screens only, skin.css .atlas-land-b) ---------- */
  (function landBtn() {
    const bar = document.querySelector('.atlas-top'), land = document.getElementById('btnLand');
    if (!bar || !land || document.getElementById('atlasLand')) return;
    const home = bar.querySelector('a.atlas-ic[aria-label=Portal]');
    const rb = document.createElement('button'); rb.type = 'button'; rb.id = 'atlasLand'; rb.innerHTML = land.innerHTML;
    rb.setAttribute('aria-label', land.getAttribute('aria-label') || 'Landscape');
    const sync = () => { rb.className = 'atlas-ic atlas-land-b' + (land.classList.contains('on') ? ' on' : '') + (land.classList.contains('pulse') ? ' pulse' : ''); rb.title = land.title || ''; };
    rb.onclick = e => { e.stopPropagation(); land.click(); setTimeout(sync, 0); };
    new MutationObserver(sync).observe(land, { attributes: true, attributeFilter: ['class', 'title'] }); sync();
    bar.insertBefore(rb, home || null);
  })();

  // test hooks (Playwright)
  window.__urSkin = {
    pieces: () => P3.size, dice: () => DICE.filter(g => g.visible).length, lifted: () => [...P3.values()].filter(o => o.h > .1).length,
    at: (r, c) => { const [x, z] = at(cellXY(r, c)); const v = new THREE.Vector3(x, Y, z); inner.localToWorld(v); return T3.project(v.x, v.z, Y); },
    up: () => DICE.filter(g => g.visible).map(g => { const v = new THREE.Vector3(...U.dieVerts[0]).applyQuaternion(g.userData.d.quaternion), w = new THREE.Vector3(...U.dieVerts[1]).applyQuaternion(g.userData.d.quaternion); return Math.max(v.y, w.y) > U.dieR * .9 ? 1 : 0; }),
  };
})();
