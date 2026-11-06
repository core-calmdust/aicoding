/* =====================================================================
   Fanorona — portal skin (fanorona/?skin=atlas)
   The full page keeps every feature (AI in 20 levels, rated games, two players, online,
   lessons, openings, puzzles, review / analysis, the coach, the 5×5 and 3×3 boards…). This file:
     • draws the carved acacia board (atlas/models/fanorona.js) with the 3D table; the camera is
       aligned to the DOM board, which stays on top (transparent) for taps, the destinations, the
       approach / withdrawal marks, arrows, hints and labels. The DOM frame becomes the 3D slab's
       outer edge ((points + 2) × (points + 3)); the page keeps its own layout (wide on PC, as the 2D page)
     • mirrors the page's pieces (syncPieces / animateStep / animateMove) into matte wooden balls:
       a move rolls the ball along the line (it really turns as it goes), each captured ball pops
       out of its point and hops into the capturer's groove on the long side of the board;
       the selected ball is lifted. Telo: the balls still to place wait in their owner's groove and
       roll out onto the point
     • the grooves always hold what the page's trays say (captured balls / balls to place)
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   Rendering is on demand (Table3D.kick); nothing is drawn while idle.
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D, E = window.FanoronaEngine;
  // Alquerque (alquerque/) runs on the same page scripts: its own board (atlas/models/alquerque.js, the same userData)
  const GID = (window.GAME && GAME.id) || 'fanorona', ALQ = GID === 'alquerque', F3 = T3 && (ALQ ? T3.alquerque : T3.fanorona);
  if (!THREE || !T3 || !F3 || !E || !window.AtlasSkin || typeof window.syncPieces !== 'function' || typeof window.animateStep !== 'function' || typeof window.renderReserves !== 'function') return;
  const boardDom = document.getElementById('board'), piecesDom = document.getElementById('pieces'), de = document.documentElement;
  de.classList.add('atlas-fanorona'); if (ALQ) de.classList.add('atlas-alq3');
  const GS = .66;   // the balls in the grooves: two thirds the size (22 fit the 9×5 board's groove)

  /* ---------- page layout: the DOM frame = the slab's outer edge ---------- */
  const st = document.createElement('style');
  st.textContent = `
html.atlas-fanorona,html.atlas-fanorona body{--fwc:calc(var(--bwc) + 1)!important;--fhc:calc(var(--bhc) + 2)!important}
html.atlas-fanorona .frame{padding:calc(var(--cell) * 1) calc(var(--cell) * .5)!important;background:transparent!important;box-shadow:none!important;border:0!important;border-radius:0!important}
html.atlas-fanorona .frame::before,html.atlas-fanorona .frame::after,html.atlas-fanorona .board::after{display:none!important}
html.atlas-fanorona .board{background:none!important;box-shadow:none!important}
html.atlas-fanorona .lines{filter:none!important}
html.atlas-fanorona .lines :is(line,circle,path,rect){opacity:0!important}
html.atlas-fanorona .lines .num{fill:rgba(255,236,205,.62)!important;font-weight:700}
html.atlas-fanorona .pieces .pc:not(.hov){background:none!important;box-shadow:none!important;filter:none!important;opacity:1!important;border:0!important}
html.atlas-fanorona .pieces .pc:not(.hov)::before,html.atlas-fanorona .pieces .pc:not(.hov)::after{display:none!important;animation:none!important}
html.atlas-fanorona .pieces .pc.sel{box-shadow:0 0 0 3px rgba(255,236,170,.95),0 0 18px rgba(255,214,120,.8)!important}
html.atlas-fanorona .pieces .pc.mustjump{animation:fnMJ 1.1s ease-in-out infinite!important}
@keyframes fnMJ{0%,100%{box-shadow:0 0 0 2px rgba(255,200,90,.7),0 0 10px rgba(255,200,90,.4)}50%{box-shadow:0 0 0 4px rgba(255,214,120,.95),0 0 22px rgba(255,214,120,.8)}}
html.atlas-fanorona .pieces .pc.threat{box-shadow:0 0 0 2.5px rgba(255,90,70,.9),0 0 12px rgba(255,90,70,.6)!important}
html.atlas-fanorona .pieces .hov{opacity:.4!important;box-shadow:none!important}
html.atlas-fanorona .pieces .hov::before,html.atlas-fanorona .pieces .hov::after{display:none!important}
html.atlas-fanorona .pieces .hov.p1{background:radial-gradient(circle at 38% 32%,#f6e2bf,#d6ab73 55%,#9c7240)!important}
html.atlas-fanorona .pieces .hov.p2{background:radial-gradient(circle at 38% 32%,#6a4a36,#2e1d14 60%,#140b06)!important}
html.atlas-fanorona .reserve{height:calc(var(--cell) * 1.24)!important;background:none!important;box-shadow:none!important;justify-content:flex-end!important;padding-inline-end:calc(var(--cell) * .55)}
html.atlas-fanorona .reserve .rv{display:none!important}
html.atlas-fanorona .reserve .lbl{position:relative;z-index:2;padding:1px 7px;border-radius:99px;background:rgba(40,18,6,.62);color:#fbe9cf!important;font-size:max(11px, calc(var(--cell) * .2));font-weight:700;text-shadow:none!important}
html.atlas-fanorona .reserve.turn::after{display:none!important}
html.atlas-fanorona .sqfx.last{box-shadow:0 0 0 3px rgba(255,220,140,.85),0 0 14px rgba(255,214,120,.5)!important}
html.atlas-fanorona .pdisc.p1,html.atlas-fanorona .kifu button i.p1,html.atlas-fanorona .rv-list .mv i.p1{background:radial-gradient(circle at 38% 32%,#f6e2bf,#d6ab73 55%,#9c7240)!important;box-shadow:0 1px 2px rgba(0,0,0,.3)!important}
html.atlas-fanorona .pdisc.p2,html.atlas-fanorona .kifu button i.p2,html.atlas-fanorona .rv-list .mv i.p2{background:radial-gradient(circle at 38% 32%,#6a4a36,#2e1d14 60%,#140b06)!important;box-shadow:0 1px 2px rgba(0,0,0,.3)!important}
html.atlas-fanorona #fPieces{display:none!important}
/* PC: the page's own layout under the 64px portal bar (as the 2D page sits 12px under its bar; --vh already leaves the bar out) */
@media (hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4){html.atlas-fanorona.hb-atlas body .app.app.app.app:not(#zz):not(#zy):not(#zx){padding-top:88px!important}
  html.atlas-fanorona.hb-atlas{--vh:calc(100vh - 64px - 36px)}html.atlas-fanorona.hb-atlas.ol-dock{--vh:calc(100vh - 108px - 64px - 36px)}
  @supports (height:100dvh){html.atlas-fanorona.hb-atlas{--vh:calc(100dvh - 64px - 36px)}html.atlas-fanorona.hb-atlas.ol-dock{--vh:calc(100dvh - 108px - 64px - 36px)}}
  /* the square boards (5×5 / 3×3): the page centres board + column in a box of --vh — that box starts under the bar */
  html.atlas-fanorona.hb-atlas:is([data-rule=dimy],[data-rule=telo],[data-rule=alq]) body .app.app.app.app:not(#zz):not(#zy):not(#zx){padding-top:0!important;margin-top:76px!important}
  html.atlas-fanorona.hb-atlas:is([data-rule=dimy],[data-rule=telo],[data-rule=alq]){--vh:calc(100vh - 64px - 24px)}html.atlas-fanorona.hb-atlas.ol-dock:is([data-rule=dimy],[data-rule=telo],[data-rule=alq]){--vh:calc(100vh - 108px - 64px - 24px)}
  @supports (height:100dvh){html.atlas-fanorona.hb-atlas:is([data-rule=dimy],[data-rule=telo],[data-rule=alq]){--vh:calc(100dvh - 64px - 24px)}html.atlas-fanorona.hb-atlas.ol-dock:is([data-rule=dimy],[data-rule=telo],[data-rule=alq]){--vh:calc(100dvh - 108px - 64px - 24px)}}}
html.atlas-fanorona .fn3dnote{margin:8px 0 0;padding:12px 14px;border-radius:14px;background:#f8f0e0;border:2px solid #ead9b6;font-size:13px;line-height:1.6;color:#4a4f66}
html.atlas-2d .fn3dnote{display:none!important}
html.atlas-fanorona .fn3dnote b{display:block;font-size:14px;color:#2b3044;margin-bottom:2px}
html.atlas-alq3 .pieces .hov.p1,html.atlas-alq3 .pdisc.p1,html.atlas-alq3 .kifu button i.p1,html.atlas-alq3 .rv-list .mv i.p1{background:radial-gradient(circle at 38% 32%,#fff0b8,#d9ad4a 55%,#8a6420)!important}
html.atlas-alq3 .pieces .hov.p2,html.atlas-alq3 .pdisc.p2,html.atlas-alq3 .kifu button i.p2,html.atlas-alq3 .rv-list .mv i.p2{background:radial-gradient(circle at 38% 32%,#4a78e0,#1d3f9a 60%,#0d2470)!important}
html.atlas-alq3 .reserve .lbl{background:rgba(70,10,20,.62)!important}
html.atlas-alq3 .fn3dnote{background:#fbf1e4;border-color:#ecd5b8}
/* phones held sideways (the page's landtabs.js → html.lt-land; also the page turned by the 横画面 button): the 2D page's own
   layout — one top row, the board, the tab rail at the right edge and its drawer — in the portal look; the portal bar is a slim
   pill in place of the page's title and icons (logo · name · 反転 · 戦績 · language · 横画面 · home), as ur/?skin=atlas */
html.atlas-fanorona.lt-land body.lt-on .app.app{grid-template-columns:auto minmax(0,1fr) 58px!important;grid-template-areas:"bl ct ct" "board board rl"!important;padding-top:6px!important}
html.atlas-fanorona.lt-land body.lt-on .side > .brand{display:none!important}
html.atlas-fanorona.lt-land .app > .atlas-top{position:relative;z-index:6;grid-area:bl;top:auto;left:auto;right:auto;height:34px;min-width:0;gap:4px;padding:0 3px 0 2px;background:rgba(255,246,226,.95);backdrop-filter:none;-webkit-backdrop-filter:none;border:2px solid #fff;border-radius:99px;box-shadow:0 3px 0 rgba(150,110,50,.35);align-self:center;justify-self:start}
html.atlas-fanorona.lt-land .atlas-top .sp{flex:0 0 2px;min-width:0}
html.atlas-fanorona.lt-land .atlas-brand{gap:6px;flex:0 1 auto;min-width:0}
html.atlas-fanorona.lt-land .atlas-brand img{width:26px;height:26px}
html.atlas-fanorona.lt-land .atlas-brand span{flex-direction:row;align-items:baseline;gap:7px;white-space:nowrap}
html.atlas-fanorona.lt-land .atlas-brand b{font-size:13px;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
html.atlas-fanorona.lt-land .atlas-brand small{display:none}
html.atlas-fanorona.lt-land .atlas-brand .fngn{display:block!important;flex:none;font-style:normal;font-weight:900;font-size:14px;color:#d93c3c;white-space:nowrap}
html.atlas-fanorona.lt-land .atlas-coin{display:none}
html.atlas-fanorona:not(.lt-land) .atlas-brand .fngn{display:none}
html.atlas-fanorona.lt-land .atlas-top :is(.atlas-ic,.atlas-lbtn){height:28px;min-width:32px;width:32px;padding:0;border-width:1.5px;box-shadow:0 2px 0 #efe3c8;flex:none;justify-content:center}
html.atlas-fanorona.lt-land .atlas-top :is(.atlas-ic,.atlas-lbtn) svg{width:16px;height:16px}
html.atlas-fanorona.lt-land .atlas-lbtn b{display:none}
html.atlas-fanorona.lt-land .atlas-lpop{top:36px;left:0;right:auto;z-index:90}
html[dir=rtl].atlas-fanorona.lt-land .atlas-lpop{left:auto;right:0}
html.atlas-fanorona.lt-land body.lt-on .app .controls.card{margin-inline-start:4px;background:none!important;border:0!important;box-shadow:none!important;border-radius:0!important}
html.atlas-fanorona.lt-land body.lt-on .controls .btn{width:40px!important;height:32px!important;border-radius:99px!important;background:rgba(255,253,247,.96)!important;border:2px solid #fff!important;box-shadow:0 3px 0 rgba(150,110,50,.35)!important;color:var(--text)!important}
html.atlas-fanorona.lt-land body.lt-on .controls .btn.primary{background:#ff5d5d!important;color:#fff!important;border-color:#ff5d5d!important;box-shadow:0 3px 0 #d93c3c!important}
html.atlas-fanorona.lt-land body.lt-on .controls .btn:disabled{opacity:1!important;color:#bdb5a4!important;box-shadow:none!important}
html.atlas-fanorona.lt-land body.lt-on .controls .btn svg{width:18px!important;height:18px!important}
html.atlas-fanorona.lt-land body.lt-on #ltRail{background:rgba(255,253,247,.96)!important;border:2px solid #fff!important;box-shadow:0 3px 0 rgba(150,110,50,.35)!important}
html.atlas-fanorona.lt-land body.lt-on #ltRail button{color:#5a6078!important;font-family:'Zen Maru Gothic',var(--font,sans-serif)!important;font-weight:900!important;font-size:10.5px!important;letter-spacing:-.05em!important}
html.atlas-fanorona.lt-land body.lt-on #ltRail button.sel{color:#d93c3c!important;background:#fff3d8!important}
html.atlas-fanorona.lt-land body.lt-on #ltRail button.sel::before{background:#d93c3c!important}
html.atlas-fanorona.lt-land body.lt-on #ltPanel{background:#fffaf0!important;border:2px solid #fff!important;box-shadow:-18px 0 40px -14px rgba(80,40,0,.55)!important;color:var(--text)}
html.atlas-fanorona.lt-land body.lt-on #ltPanel > .card{box-shadow:none!important;border:2px solid #f3e7cc!important;border-radius:16px!important}
html.atlas-fanorona.lt-land body.lt-on #ltLearn button{background:#fff!important;border:2px solid #efe3c8!important;color:var(--text)!important;box-shadow:0 2px 0 #efe3c8}
html.atlas-fanorona.lt-land body.lt-on #ltLearn button svg{stroke:#d93c3c!important}
html.atlas-fanorona.lt-land body.lt-on.lt-nav #ltNav{background:rgba(255,253,247,.96)!important;border:2px solid #fff!important;box-shadow:0 6px 18px -8px rgba(80,40,0,.55)!important}
html.atlas-fanorona.lt-land body.lt-on .reserve .onb{background:rgba(255,253,247,.95)!important;border:2px solid #fff!important;color:#2b3044!important;font:800 15px/1 'Zen Maru Gothic',var(--font,sans-serif)!important;padding:3px 10px 3px 6px!important;box-shadow:0 3px 8px -3px rgba(0,0,0,.45)}
html.atlas-fanorona.lt-land body.lt-on .reserve .onb.on{border-color:#ffc928!important;box-shadow:0 0 0 2px rgba(255,201,40,.45)!important}
html.atlas-fanorona.lt-land body.lt-on .reserve .lbl{display:none!important}
`;
  document.head.appendChild(st);

  const skin = AtlasSkin.init({
    get margin() { return NRp() === 5 && (() => { try { return E.dims().w === 9; } catch (e) { return true; } })() ? .13 : .32; },   // canvas margin round the DOM board: the slab's edge and its shadow (the square boards' slab reaches further out)
    board: boardDom,
    persp: 10,   // a long lens: the balls stand high off the board, so a near camera showed them off their points (the DOM rings stay round them)
    outer: r => { const H = r.height * (NRp() + 3) / (NRp() + 1); return { top: r.top + r.height / 2 - H / 2, height: H }; },   // slab edge to slab edge
    guide: ALQ ? '../images/atlas/g-gem.webp' : '../images/atlas/g-crab.webp', guideFallback: ALQ ? '../images/atlas/alquerque.webp' : '../images/atlas/fanorona.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'lines|\\.pc|\\.rv|reserve|sqfx|\\.dest|\\.mark|\\.hov|fxsvg|hintlbl|frame|prompt',
    start(lv, side, mode) {
      if (typeof openNewDialog !== 'function' || typeof draft !== 'object' || typeof segSync !== 'function' || !document.getElementById('btnStart')) return null;
      openNewDialog();
      draft.mode = mode === 'rated' || mode === 'pvp' ? mode : 'ai';
      draft.rule = ALQ ? 'alq' : 'sivy';
      if (side === 1 || side === 2) draft.color = side;
      if (lv >= 1 && lv <= 20) draft.level = lv;
      segSync(); document.getElementById('btnStart').click();
      return true;
    },
  });
  if (!skin) return;
  function NRp() { try { return E.dims().h; } catch (e) { return 5; } }

  /* ---------- the board (rebuilt for another board size: 9×5 / 5×5 / 3×3) ---------- */
  const holder = new THREE.Group();
  let root = null, U = null, Y = 0, built = '';
  const P3 = new Map();      // point → { g, k }
  const G = [[], []];        // the grooves: 0 far (the top tray), 1 near (the bottom tray) — ball groups, in slot order
  let tok = 0, running = 0;  // a full re-sync cancels running animations
  function build() {
    const rule = (() => { try { return E.rule(); } catch (e) { return 'sivy'; } })();
    const key = rule === 'alqf' ? 'alq' : rule;
    if (key === built && root) return;
    built = key; tok++;
    if (root) holder.remove(root);
    P3.clear(); G[0].length = G[1].length = 0;
    root = F3.board(rule); U = root.userData; Y = U.top; holder.add(root);
    T3.show(GID, holder, { still: true });
    skin.alignTo(U.NR + 1, Y);
    T3.kick(600);
  }
  build();
  if (skin.view) skin.view({ key: 'atlas-' + GID + '-view', row: document.getElementById('bdRow'), img: '../images/atlas/' + GID + '.webp', cls: ['atlas-fanorona'].concat(ALQ ? ['atlas-alq3'] : []) });
  new MutationObserver(() => { build(); try { mirror(); syncGrooves(); } catch (e) {} }).observe(de, { attributes: true, attributeFilter: ['data-rule', 'data-variant'] });
  T3.kick(800);
  { let last = ''; const app = document.querySelector('.app');   // the online dock / header bar can move the board without resizing it
    const chk = () => { const r = boardDom.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (app && window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- the new-game dialog: the 3D set replaces the 2D board / piece designs ---------- */
  const NOTE = {
    ja: ['3D 木彫りの盤', 'アカシアの一枚板に線と点を彫って焦がした伝統的な盤と、マットな木の玉（白＝白木、黒＝黒檀）で表示しています。取った玉は盤の両側の溝に並びます。'],
    en: ['Carved 3D board', 'A traditional acacia board with its lines and points carved and scorched, and matte wooden balls (White: pale wood, Black: ebony). Captured balls line up in the grooves on the long sides.'],
    zh: ['3D木雕棋盘', '在整块相思木上雕刻并烙黑线与点的传统棋盘，配哑光木球（白＝原木，黑＝乌木）。吃掉的棋子排在棋盘两侧的槽里。'],
    ko: ['3D 목각 판', '아카시아 통판에 선과 점을 새기고 그을린 전통 판과, 무광 나무 구슬(백=밝은 나무, 흑=흑단)로 표시합니다. 잡은 구슬은 판 양옆의 홈에 놓입니다.'],
    es: ['Tablero tallado 3D', 'Un tablero tradicional de acacia con líneas y puntos tallados y quemados, y bolas de madera mate (blancas: madera clara, negras: ébano). Las bolas capturadas se alinean en las ranuras de los lados largos.'],
    fr: ['Plateau sculpté 3D', 'Un plateau traditionnel en acacia aux lignes et points gravés et brûlés, avec des billes en bois mat (Blancs : bois clair, Noirs : ébène). Les billes prises s’alignent dans les rainures des grands côtés.'],
    pt: ['Tabuleiro entalhado 3D', 'Um tabuleiro tradicional de acácia com linhas e pontos entalhados e queimados, e bolas de madeira fosca (brancas: madeira clara, pretas: ébano). As bolas capturadas ficam nas canaletas dos lados longos.'],
    de: ['Geschnitztes 3D-Brett', 'Ein traditionelles Akazienbrett mit eingeschnitzten, gebrannten Linien und Punkten und matten Holzkugeln (Weiß: helles Holz, Schwarz: Ebenholz). Geschlagene Kugeln liegen in den Rillen an den Längsseiten.'],
    hi: ['3D नक्काशीदार बोर्ड', 'बबूल की एक लकड़ी पर रेखाएँ और बिंदु खोदकर जलाए गए पारंपरिक बोर्ड और मैट लकड़ी की गोलियाँ (सफ़ेद: हल्की लकड़ी, काला: आबनूस)। पकड़ी गई गोलियाँ लंबी तरफ़ की नालियों में रखी जाती हैं।'],
    ar: ['رقعة منحوتة ثلاثية الأبعاد', 'رقعة تقليدية من خشب الأكاسيا خطوطها ونقاطها منحوتة ومحروقة، مع كرات خشبية مطفأة (الأبيض: خشب فاتح، الأسود: أبنوس). تصطف الكرات المأسورة في المجاري على الجانبين الطويلين.'],
  };
  const NOTE_ALQ = {
    ja: ['3D ダマスカス象嵌の盤', 'くるみ材に骨・黒檀・真珠母貝の寄木細工をほどこしたアラブ伝統の象嵌盤（線は真珠母貝、点は真鍮の鋲）と、真鍮の駒（白）と藍の七宝の駒（黒）で表示しています。取った駒は上下のベルベットのトレイに並びます。'],
    en: ['Damascene inlaid 3D board', 'A traditional Arab inlaid board of walnut with bone, ebony and mother-of-pearl marquetry (mother-of-pearl lines, brass studs at the points), with brass pieces (White) and cobalt enamel pieces (Black). Captured pieces line up in the velvet trays above and below.'],
    zh: ['3D大马士革镶嵌棋盘', '核桃木上镶嵌骨、乌木与珍珠母的阿拉伯传统镶嵌棋盘（线为珍珠母，点为黄铜钉），配黄铜棋子（白）与钴蓝珐琅棋子（黑）。吃掉的棋子排在上下的天鹅绒托盘里。'],
    ko: ['3D 다마스쿠스 상감 판', '호두나무에 뼈·흑단·자개를 박은 아랍 전통 상감 판(선은 자개, 점은 황동 징)과, 황동 말(백)·코발트 칠보 말(흑)로 표시합니다. 잡은 말은 위아래 벨벳 트레이에 놓입니다.'],
    es: ['Tablero 3D de taracea damasquina', 'Un tablero árabe tradicional de nogal con taracea de hueso, ébano y nácar (líneas de nácar, tachuelas de latón en los puntos), con piezas de latón (blancas) y de esmalte cobalto (negras). Las capturas se colocan en las bandejas de terciopelo.'],
    fr: ['Plateau 3D marqueté de Damas', 'Un plateau arabe traditionnel en noyer marqueté d’os, d’ébène et de nacre (lignes de nacre, clous de laiton aux points), avec des pions en laiton (Blancs) et en émail cobalt (Noirs). Les prises se rangent dans les plateaux de velours.'],
    pt: ['Tabuleiro 3D marchetado de Damasco', 'Um tabuleiro árabe tradicional de nogueira com marchetaria de osso, ébano e madrepérola (linhas de madrepérola, tachas de latão nos pontos), com peças de latão (brancas) e de esmalte cobalto (pretas). As capturadas ficam nas bandejas de veludo.'],
    de: ['Damaszener Intarsienbrett 3D', 'Ein traditionelles arabisches Brett aus Nussbaum mit Intarsien aus Bein, Ebenholz und Perlmutt (Linien aus Perlmutt, Messingnägel an den Punkten), mit Messingsteinen (Weiß) und Kobaltemaille-Steinen (Schwarz). Geschlagene Steine liegen in den Samtschalen.'],
    hi: ['3D दमिश्क़ी जड़ाऊ बोर्ड', 'अखरोट की लकड़ी पर हड्डी, आबनूस और सीप की जड़ाई वाला पारंपरिक अरबी बोर्ड (रेखाएँ सीप की, बिंदु पीतल की कीलें), पीतल के मोहरे (सफ़ेद) और कोबाल्ट मीनाकारी मोहरे (काला)। पकड़े गए मोहरे मखमली ट्रे में रहते हैं।'],
    ar: ['رقعة دمشقية مطعّمة ثلاثية الأبعاد', 'رقعة عربية تقليدية من خشب الجوز مطعّمة بالعظم والأبنوس والصدف (خطوط من الصدف ومسامير نحاسية عند النقاط)، مع قطع نحاسية (الأبيض) وقطع من المينا الكوبالتية (الأسود). تصطف القطع المأسورة في صواني المخمل.'],
  };
  const fd = document.getElementById('fDesign');
  if (fd) {
    const p = document.createElement('p'); p.className = 'fn3dnote'; fd.appendChild(p);
    const paint = () => { const l = (document.getElementById('langSel') || {}).value || 'ja', n = (ALQ ? NOTE_ALQ : NOTE)[l] || (ALQ ? NOTE_ALQ : NOTE).en; p.innerHTML = ''; const b = document.createElement('b'); b.textContent = n[0]; p.append(b, n[1]); };
    paint(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint, 30));
  }

  /* ---------- sounds: wood on wood (the page's own sounds still play; these are only the groove's soft clacks) ---------- */
  let AC = null;
  const sndOn = () => { try { return settings.sound !== false; } catch (e) { return true; } };
  function clack(delay, v = 1) {
    if (!sndOn()) return;
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const a = AC; if (a.state === 'suspended') a.resume();
    const t0 = a.currentTime + (delay || 0) / 1000, o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(900 * v, t0); o.frequency.exponentialRampToValueAtTime(420 * v, t0 + .05);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.07, t0 + .003); g.gain.exponentialRampToValueAtTime(.001, t0 + .08); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + .1);
  }

  /* ---------- 3D balls mirrored from the page's pieces ---------- */
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const xz = i => { let rc; try { rc = dRC(i); } catch (e) { rc = E.RC[i]; } return U.pt(rc[1], rc[0]); };
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const bottom = () => { try { return flip ? 2 : 1; } catch (e) { return 1; } };
  const errs = [];
  const anim = (dur, f, done, my) => { running++; const t0 = performance.now(); let fin = false; const end = () => { if (!fin) { fin = true; running--; } };
    (function s(n) { if (my !== undefined && my !== tok) return end(); const k = Math.min(1, Math.max(0, (n - t0) / dur));
      try { f(k); } catch (e) { end(); errs.push(String(e)); return; } T3.kick(120); if (k < 1) requestAnimationFrame(s); else { end(); try { if (done) done(); } catch (e) { errs.push(String(e)); } } })(t0); };
  const later = (ms, f, my) => { if (ms <= 0) return f(); running++; setTimeout(() => { running--; if (my === tok) f(); }, ms); };
  function mk(k, i, scale = 1) {
    const g = U.piece(k, scale), r = g.userData.r;
    const sh = T3.contact(r * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
    if (i != null) { const [x, z] = xz(i); g.position.set(x, U.rest, z); }
    root.add(g); return g;
  }
  // the ball's centre h above its resting height; the contact shadow stays on the surface below it
  function lift(g, h, base) {
    const b = base === undefined ? (g.userData.base ?? U.rest) : base; g.userData.base = b;
    g.position.y = b + h; g.userData.h0 = h;
    const sh = g.userData.sh; if (sh) { const surf = g.userData.surf ?? (U.top + .002); sh.position.y = surf - g.position.y; const s = 1 + h * .6; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.6); }
  }
  const hOf = g => g.userData.h0 || 0;
  // rolling: the ball turns about the horizontal axis across its path by the distance / radius
  const _ax = new THREE.Vector3(), _q = new THREE.Quaternion();
  function roll(g, dx, dz) { if (g.userData.noRoll) return; const d = Math.hypot(dx, dz); if (d < 1e-5) return; _ax.set(dz / d, 0, -dx / d); _q.setFromAxisAngle(_ax, d / g.userData.r); const b = g.userData.ball; b.quaternion.premultiply(_q); }
  function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); if (g.parent) g.parent.remove(g); }
  function bump(g, my) { anim(150, k => { const s = 1 + Math.sin(k * Math.PI) * .04; g.userData.ball.scale.setScalar(g.userData.r * s); }, () => g.userData.ball.scale.setScalar(g.userData.r), my); }

  /* ---------- the grooves ---------- */
  const NMAX = () => { try { return E.dims().pcs || 22; } catch (e) { return 22; } };
  function slot(side, i) { const [x, z] = U.groove.at(side, i, NMAX()); return [x, U.groove.y(GS), z]; }
  function placeGroove(side) { G[side].forEach((g, i) => { const [x, y, z] = slot(side, i); g.position.set(x, y, z); g.userData.r = F3.R * GS; g.userData.base = y; g.userData.surf = y - g.userData.r + .002; lift(g, 0); g.userData.ball.scale.setScalar(g.userData.r); g.userData.flying = false; }); }
  function grooveBall(col, side) {   // a new ball at the end of a groove (no animation)
    const g = mk(col, null, GS); G[side].push(g); placeGroove(side); return g;
  }
  // what the page's trays say: captured balls next to the capturer (Telo: the balls still to place, in their owner's groove)
  function wantGrooves() {
    let pos; try { pos = posAt(cur).pos; } catch (e) { return null; }
    const bt = bottom(), out = [];
    let telo = false; try { telo = E.dims().telo; } catch (e) {}
    let start; try { start = E.Pos.from(startSpec); } catch (e) { start = new E.Pos(); }
    for (const side of [0, 1]) {
      const owner = side ? bt : 3 - bt;
      if (telo) out.push({ col: owner, n: Math.max(0, 3 - pos.count(owner)) });
      else { const lost = 3 - owner; out.push({ col: lost, n: Math.max(0, start.count(lost) - pos.count(lost)) }); }
    }
    return out;
  }
  function syncGrooves() {
    const w = wantGrooves(); if (!w || !root) return;
    w.forEach(({ col, n }, side) => {
      const L = G[side];
      if (L.length === n && L.every(g => g.userData.col === col)) return;
      L.forEach(drop); L.length = 0;
      for (let i = 0; i < n; i++) grooveBall(col, side);
    });
    T3.kick(200);
  }

  // the selected ball is lifted (the page marks it with .sel)
  function applySel() {
    let els; try { els = pcEls; } catch (e) { return; }
    for (const [i, o] of P3) {
      const el = els.get(i), on = !!(el && el.classList.contains('sel')), g = o.g;
      if (g.userData.moving || on === !!g.userData.up) continue;
      g.userData.up = on; const h0 = hOf(g), h1 = on ? .22 : 0;
      anim(on ? 130 : 110, k => lift(g, h0 + (h1 - h0) * io(k)));
    }
  }
  function mirror() {
    let els; try { els = pcEls; } catch (e) { return; }
    if (!root) return;
    tok++;
    const want = new Map(); for (const [i, el] of els) want.set(i, +el.dataset.k);
    for (const [i, o] of P3) if (want.get(i) !== o.k) { drop(o.g); P3.delete(i); }
    for (const [i, k] of want) {
      const o = P3.get(i);
      if (!o) { P3.set(i, { g: mk(k, i), k }); continue; }
      const g = o.g, [x, z] = xz(i); g.position.x = x; g.position.z = z; g.userData.moving = false; g.userData.up = false; g.userData.ball.scale.setScalar(g.userData.r); lift(g, 0, U.rest);
    }
    // balls caught mid-flight to a groove: straight into their slots
    [0, 1].forEach(placeGroove);
    applySel(); T3.kick(300);
  }
  // one step as the page animates it (animateStep in fanorona/app.js): the ball rolls along the line; its captures hop into the groove
  const STEP = 330, SLIDE = 300, POP = 280;
  function step3(stp, delay) {
    const o = P3.get(stp.from); if (!o) return false;
    const my = tok, g = o.g, cap = stp.cap || [];
    P3.delete(stp.from); P3.set(stp.to, o);
    const vict = []; cap.forEach(c => { const v = P3.get(c); if (v) { vict.push([c, v.g]); P3.delete(c); } });
    // the capturer's groove: the near one when the mover is the player at the bottom
    const side = o.k === bottom() ? 1 : 0, slots = vict.map(([, vg]) => { G[side].push(vg); vg.userData.flying = true; return G[side].length - 1; });
    const [x0, z0] = xz(stp.from), [x1, z1] = xz(stp.to), dur = cap.length ? STEP - 40 : SLIDE;
    g.userData.moving = true;
    later(delay, () => {
      const h0 = hOf(g); let px = g.position.x, pz = g.position.z;
      anim(dur, k => {
        const e = io(k), x = x0 + (x1 - x0) * e, z = z0 + (z1 - z0) * e;
        roll(g, x - px, z - pz); px = x; pz = z; g.position.x = x; g.position.z = z;
        lift(g, h0 * (1 - Math.min(1, k * 3)) + Math.sin(k * Math.PI) * .035, U.rest);   // (a hair of lift so it rolls over the cups)
      }, () => { g.userData.moving = false; g.userData.up = false; lift(g, 0, U.rest); bump(g, my); }, my);
    }, my);
    // the captured balls: one after the other (from the nearest), each pops up and hops into its slot in the groove
    vict.forEach(([c, vg], k) => {
      later(delay + STEP - 90 + k * 55, () => {
        const sx = vg.position.x, sz = vg.position.z, sy = vg.position.y, [tx, ty, tz] = slot(side, slots[k]);
        const s0 = vg.userData.r, H = .9 + Math.min(1.2, Math.abs(tz - sz) * .12);
        let px = sx, pz = sz;
        anim(POP + 260 + Math.min(240, Math.hypot(tx - sx, tz - sz) * 28), q => {
          const e = io(q), x = sx + (tx - sx) * e, z = sz + (tz - sz) * e, y = sy + (ty - sy) * e + Math.sin(q * Math.PI) * H;
          roll(vg, (x - px) * .5, (z - pz) * .5); px = x; pz = z;
          vg.position.set(x, y, z);
          const r = s0 + (F3.R * GS - s0) * e; vg.userData.ball.scale.setScalar(r); vg.userData.r = r;
          const sh = vg.userData.sh; if (sh) { sh.material.opacity = .5 * Math.max(0, 1 - Math.sin(q * Math.PI) * 1.2); sh.position.y = (U.top + .002 + (ty - r - U.top) * e) - y; }
        }, () => {
          vg.userData.r = F3.R * GS; vg.userData.flying = false; vg.userData.base = ty; vg.userData.surf = ty - vg.userData.r + .002; lift(vg, 0); bump(vg, my); clack(0, 1 + Math.random() * .2);
        }, my);
      }, my);
    });
    return true;
  }
  // Telo: a ball rolls out of its owner's groove onto the point
  function place3(to, k) {
    const side = k === bottom() ? 1 : 0, L = G[side];
    let g = null;
    for (let j = L.length - 1; j >= 0; j--) if (L[j].userData.col === k) { g = L.splice(j, 1)[0]; break; }
    if (!g) return false;
    const my = tok, sx = g.position.x, sy = g.position.y, sz = g.position.z, [tx, tz] = xz(to), r0 = g.userData.r;
    P3.set(to, { g, k }); g.userData.moving = true;
    anim(380, q => {
      const e = io(q), y = sy + (U.rest - sy) * e + Math.sin(q * Math.PI) * .9;
      g.position.set(sx + (tx - sx) * e, y, sz + (tz - sz) * e);
      const r = r0 + (F3.R - r0) * e; g.userData.ball.scale.setScalar(r); g.userData.r = r;
      if (g.userData.sh) { g.userData.sh.position.y = U.top + .002 - y; g.userData.sh.material.opacity = .5 * (1 - Math.sin(q * Math.PI) * .9); }
    }, () => { g.userData.r = F3.R; g.userData.moving = false; g.userData.surf = undefined; g.userData.base = U.rest; lift(g, 0); bump(g, my); }, my);
    return true;
  }

  const oSync = window.syncPieces;
  window.syncPieces = function () { const r = oSync.apply(this, arguments); try { mirror(); } catch (e) {} return r; };
  const oStep = window.animateStep;
  window.animateStep = function (stp, delay) {
    const r = oStep.apply(this, arguments);
    try { if (!step3(stp, delay || 0)) mirror(); } catch (e) { try { mirror(); } catch (x) {} }
    return r;
  };
  const oMove = window.animateMove;
  window.animateMove = function (m, before) {
    let S = null; try { S = before.steps(m); } catch (e) {}
    const telo = S && S[0] && S[0].from < 0, k = telo ? before.turn : 0;
    const ok = oMove.apply(this, arguments);
    if (ok && telo) { try { if (!animOk() || !place3(S[0].to, k)) mirror(); } catch (e) { try { mirror(); } catch (x) {} } }
    return ok;
  };
  const oRes = window.renderReserves;
  window.renderReserves = function () { const r = oRes.apply(this, arguments); try { syncGrooves(); } catch (e) {} return r; };
  // the selection / forced-capture marks come with renderFx; the selected ball lifts. Anything the page moved without
  // telling us (a step entered with the animations off) is caught here: the balls follow the page's pieces once idle
  if (piecesDom) {
    new MutationObserver(() => applySel()).observe(piecesDom, { subtree: true, attributes: true, attributeFilter: ['class'] });
    let q = 0;
    new MutationObserver(() => { if (q) return; q = 1; setTimeout(() => { q = 0; let els; try { els = pcEls; } catch (e) { return; }
      if (running) return;
      const same = els.size === P3.size && [...els].every(([i, el]) => P3.has(i) && P3.get(i).k === +el.dataset.k);
      if (!same) mirror(); }, 120); }).observe(piecesDom, { childList: true });
  }
  // the page may have drawn its pieces before we hooked in
  try { mirror(); syncGrooves(); } catch (e) {}

  /* ---------- phones held sideways (landtabs.js): the portal bar in the top row carries the game's name (as the 2D page's title)
     and the rotate (横画面) button — the page's own ones are in its hidden title row (as ur / backgammon) ---------- */
  (function landBar() {
    const bar = document.querySelector('.atlas-top'), land = document.getElementById('btnLand');
    if (!bar) return;
    const span = bar.querySelector('.atlas-brand span');
    if (span && !span.querySelector('.fngn')) {
      const em = document.createElement('em'); em.className = 'fngn'; span.appendChild(em);
      const paint = () => { const t = document.getElementById('brandTitle'), v = t ? t.textContent.trim() : ''; if (em.textContent !== v) em.textContent = v; };
      paint(); const t = document.getElementById('brandTitle'); if (t) new MutationObserver(paint).observe(t, { childList: true, characterData: true, subtree: true });
    }
    if (!land || document.getElementById('atlasLand')) return;
    const home = bar.querySelector('a.atlas-ic[aria-label=Portal]');
    const rb = document.createElement('button'); rb.type = 'button'; rb.id = 'atlasLand'; rb.innerHTML = land.innerHTML;
    rb.setAttribute('aria-label', land.getAttribute('aria-label') || 'Landscape');
    const sync = () => { rb.className = 'atlas-ic atlas-land-b' + (land.classList.contains('on') ? ' on' : '') + (land.classList.contains('pulse') ? ' pulse' : ''); rb.title = land.title || ''; };
    rb.onclick = e => { e.stopPropagation(); land.click(); setTimeout(sync, 0); };
    new MutationObserver(sync).observe(land, { attributes: true, attributeFilter: ['class', 'title'] }); sync();
    bar.insertBefore(rb, home || null);
  })();

  // test hooks (Playwright)
  window.__fnSkin = { pieces: () => P3.size, grooves: () => G.map(L => L.length), at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); }, running: () => running, errs };
})();
