/* =====================================================================
   Senet — portal skin (senet/?skin=atlas)
   The full page keeps every feature (AI in 20 levels, rated games, two players, lessons, puzzles, review, coach…). This file:
     • draws the game box (atlas/models/senet.js: Tutankhamun's ebony casket on its lion-legged stand; its top is the 2D board's
       own picture, so the design tab's four boards all work in 3D) with the 3D table; the camera is aligned to the DOM board
       (#frame), which stays on top (transparent) for taps, the green destinations, the arrows and the marks
     • horizontal on PC / landscape, turned a quarter on a phone held upright (board2d 'v' is the 'h' board turned)
     • mirrors the page's pieces (SenetSkin3D.sync): spools and cones; a move lifts the piece, steps it along the reverse-S track
       and sets it down; a swap sends the rival piece back to the square the mover left; the House of Water sinks a piece and it
       rises again on the House of Rebirth
     • the four throw sticks are thrown into the strip of the side to move and land light or dark side up
     • lesson / puzzle text → the guide's speech bubble (shared AtlasSkin)
   World units = the page's SVG units / 100 (1 = one square). Rendering is on demand (Table3D.kick).
   ===================================================================== */
(function () {
  'use strict';
  const THREE = window.THREE, T3 = window.Table3D, E = window.SenetEngine, B2 = window.SenetBoard2D;
  if (!THREE || !T3 || !T3.senet || !E || !B2 || !window.AtlasSkin || !window.SenetApp) return;
  const de = document.documentElement, frameEl = document.getElementById('frame');
  if (!frameEl) return;
  de.classList.add('atlas-sn');

  /* ---------- page: the DOM board's pictures become invisible (taps and marks stay) ---------- */
  const st = document.createElement('style');
  st.textContent = `
html.atlas-sn .board-wrap svg.sn-board{filter:none!important}
html.atlas-sn .sn-img,html.atlas-sn .sn-tray rect,html.atlas-sn .sn-tray circle{opacity:0!important}
html.atlas-sn .sn-pieces .sn-pc{opacity:0!important}
html.atlas-sn .sn-over text{fill:#fff3d2!important}
html.atlas-sn .frame > .dice-dock .dice-host{opacity:0!important}
html.atlas-sn .dice-dock{background:none!important}
html.atlas-sn .frame > .dice-dock .dice-cap{color:#fff3d2!important;text-shadow:0 1px 3px rgba(0,0,0,.85)!important}
html.atlas-sn.sn-band .pdk{background:rgba(120,80,30,.1)!important;border-color:rgba(150,110,50,.28)!important;box-shadow:inset 0 1px 3px rgba(90,60,20,.25)!important}
/* the throw button: a cream plate with gold letters and a stick icon, pressed into a gold shadow (matching the gold trim around it) */
html.atlas-sn .dice-dock .roll-pill{background:linear-gradient(180deg,#fff8e2,#f0dcaa)!important;border:2px solid #c39a45!important;border-radius:99px!important;box-shadow:0 4px 0 #8a6420,0 8px 16px -8px rgba(90,60,20,.55)!important;filter:none!important;animation:none!important;
  color:#8a6420!important;text-shadow:none!important;font-family:'Zen Maru Gothic',sans-serif!important;font-weight:900!important;letter-spacing:.12em!important;text-indent:0!important;writing-mode:horizontal-tb!important;gap:.35em}
html.atlas-sn .dice-dock .roll-pill::before{content:'';position:static!important;inset:auto!important;box-shadow:none!important;flex:none;width:1.05em;height:1.05em;border-radius:0!important;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a6420' stroke-width='2.2' stroke-linecap='round'%3E%3Cpath d='M6 4v16M10 4v16M14 4v16M18 4v16'/%3E%3C/svg%3E") center/contain no-repeat}
html.atlas-sn .dice-dock .roll-pill:active,html.atlas-sn .dice-dock.press .roll-pill{box-shadow:0 1px 0 #8a6420!important;transform:translate(-50%,-50%) translateY(3px)!important}
html.atlas-sn .dice-dock.can:not(.rolling) .roll-pill{animation:snRp 2.2s ease-in-out infinite!important}
@keyframes snRp{0%,100%{box-shadow:0 4px 0 #8a6420,0 0 0 0 rgba(195,154,69,0)}50%{box-shadow:0 4px 0 #8a6420,0 0 0 5px rgba(195,154,69,.28)}}
html.atlas-sn .frame > .dice-dock .roll-pill{font-size:calc(var(--bw) * .022)!important}
html.atlas-sn body:is(.in-lesson,.in-puzzle){--oh:410px!important}
@media not all and (hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4){
  html.atlas-sn .controls{gap:5px!important}
  html.atlas-sn .controls .btn{padding:7px 1px!important;min-width:0}
  html.atlas-sn .controls .btn span{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;font-size:9.5px!important;letter-spacing:-.04em}
  html.atlas-sn .board-area > .player{background:rgba(255,253,247,.95)!important;border:2px solid #fff!important;border-radius:16px!important;box-shadow:0 10px 24px -16px rgba(80,40,0,.55)!important}
  html.atlas-sn .board-area > .player.active{border-color:#ffc928!important}
  html.atlas-sn .board-area > .player .sub{color:#6a7088!important}
  html.atlas-sn .board-area > .player .sub b{color:#2b3044!important}
  html.atlas-sn .board-area > .player .home small{color:#7a7f94!important}
}
/* phones held sideways (the page's landtabs.js → html.sn-land): the portal bar is a slim pill in the page's top row (logo · name ·
   icons), the menu icons as cream pills beside it, the rail / drawer / cards in the cream portal look on the wood */
@media (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-height: 560px), (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-width: 900px){
  html.atlas-sn.sn-land .app{padding-top:6px!important}
  html.atlas-sn.sn-land body.lt-on .app{grid-template-columns:auto minmax(0,1fr) 58px!important;grid-template-areas:"bl ct ct" "board board rl"!important}
  html.atlas-sn.sn-land .app > .atlas-top{position:relative;z-index:6;grid-area:bl;top:auto;left:auto;right:auto;height:32px;min-width:0;gap:4px;padding:0 3px 0 2px;background:rgba(255,246,226,.94);backdrop-filter:none;-webkit-backdrop-filter:none;border:2px solid #fff;border-radius:99px;box-shadow:0 3px 0 rgba(150,110,50,.35);align-self:center;justify-self:start}
  html.atlas-sn.sn-land .atlas-top .sp{flex:0 0 4px;min-width:0}
  html.atlas-sn.sn-land .atlas-brand{gap:6px;flex:0 1 auto;min-width:0}
  html.atlas-sn.sn-land .atlas-brand img{width:26px;height:26px}
  html.atlas-sn.sn-land .atlas-brand span{flex-direction:row;align-items:baseline;gap:7px;white-space:nowrap}
  html.atlas-sn.sn-land .atlas-brand b{font-size:12.5px;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
  html.atlas-sn.sn-land .atlas-brand small{display:none}
  html.atlas-sn.sn-land .atlas-coin{display:none}
  html.atlas-sn.sn-land .atlas-gname{display:block;flex:none;font-style:normal;font-weight:900;font-size:13px;color:#13647a;white-space:nowrap}
  html.atlas-sn.sn-land :is(.atlas-ic,.atlas-lbtn){height:26px;min-width:30px;width:30px;padding:0;border-width:1.5px;box-shadow:0 2px 0 #efe3c8;flex:none;justify-content:center}
  html.atlas-sn.sn-land :is(.atlas-ic,.atlas-lbtn) svg{width:15px;height:15px}
  html.atlas-sn.sn-land .atlas-lbtn b{display:none}
  html.atlas-sn.sn-land .atlas-lpop{top:34px;right:0;z-index:90}
  html.atlas-sn.sn-land body.lt-on .controls .btn{width:38px!important;height:30px!important;border-radius:99px!important;background:rgba(255,253,247,.95)!important;border:2px solid #fff!important;box-shadow:0 3px 0 rgba(150,110,50,.35)!important;color:var(--text)!important}
  html.atlas-sn.sn-land body.lt-on .controls .btn.primary{background:#ff5d5d!important;color:#fff!important;border-color:#ff5d5d!important;box-shadow:0 3px 0 #d93c3c!important}
  html.atlas-sn.sn-land body.lt-on .controls .btn.primary svg{stroke:#fff!important}
  html.atlas-sn.sn-land body.lt-on .controls .btn:disabled{opacity:1!important;color:#bdb5a4!important;box-shadow:none!important}
  html.atlas-sn.sn-land body.lt-on .board-area > .player{background:rgba(255,253,247,.95)!important;border:2px solid #fff!important;border-radius:16px!important;box-shadow:0 10px 24px -16px rgba(80,40,0,.55)!important}
  html.atlas-sn.sn-land body.lt-on .board-area > .player.active{border-color:#ffc928!important}
  html.atlas-sn.sn-land body.lt-on .board-area > .player .home small{color:#7a7f94!important}
  html.atlas-sn.sn-land body.lt-on #ltRail{background:rgba(255,253,247,.95)!important;border:2px solid #fff!important;box-shadow:0 3px 0 rgba(150,110,50,.35)}
  html.atlas-sn.sn-land body.lt-on #ltRail button{color:#6a7088!important}
  html.atlas-sn.sn-land body.lt-on #ltRail button.sel{color:#d93c3c!important;background:#fff3d8!important}
  html.atlas-sn.sn-land body.lt-on #ltRail button.sel::before{background:#d93c3c!important}
  html.atlas-sn.sn-land body.lt-on #ltPanel{background:#fffaf0!important;border:2px solid #fff!important;box-shadow:-18px 0 40px -14px rgba(80,40,0,.55)!important}
  html.atlas-sn.sn-land body.lt-on #ltLearn button{background:#fff!important;border:2px solid #efe3c8!important;color:var(--text)!important}
  html.atlas-sn.sn-land body.lt-on #ltLearn button svg{stroke:#d93c3c!important}
  html.atlas-sn.sn-land body.lt-on.mtab-online .ol-pane{background:#fffaf0!important;border:2px solid #fff!important;color:var(--text)}
  html.atlas-sn.sn-land body.lt-on.mtab-online .ol-pane h3{color:#2b3044!important}
  html.atlas-sn.sn-land body.lt-on.mtab-online .ol-pane p{color:#5a6078!important}
  html.atlas-sn.sn-land body.lt-on.lt-nav #ltNav{background:rgba(255,253,247,.96)!important;border:2px solid #fff!important;box-shadow:0 6px 18px -8px rgba(80,40,0,.55)!important}
}
html.atlas-sn .sn3dnote{margin:8px 0 0;padding:12px 14px;border-radius:14px;background:#f8f0e0;border:2px solid #ead9b6;font-size:13px;line-height:1.6;color:#4a4f66}
html.atlas-sn .sn3dnote b{display:block;font-size:14px;color:#2b3044;margin-bottom:2px}
`;
  document.head.appendChild(st);
  // PC: the page's header-bar rules (html.hb-on) are copied for the portal bar (html.hb-atlas, 64px)
  (function hbAtlas() {
    const css = ['html.atlas-sn.hb-atlas,html.atlas-sn.hb-atlas body{--hb-h:64px}', 'html.atlas-sn.hb-atlas body{padding-top:64px}'];
    const conv = sel => sel.replace(/\b(html|body)\.hb-on\b/g, '$1.hb-atlas');
    const walk = (rules, wrap) => { for (const r of rules) {
      if (r.cssRules && r.conditionText !== undefined) { walk(r.cssRules, t => wrap((r.type === 4 ? '@media ' : '@supports ') + r.conditionText + '{' + t + '}')); continue; }
      if (r.selectorText && /\b(html|body)\.hb-on\b/.test(r.selectorText)) css.push(wrap(conv(r.selectorText) + '{' + r.style.cssText + '}'));
    } };
    for (const sh of document.styleSheets) { const n = sh.ownerNode; if (sh.href || (n && n.id === 'hbCss')) continue; let R; try { R = sh.cssRules; } catch (e) { continue; } walk(R, t => t); }
    css.push('@media (hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4){html.atlas-sn.hb-atlas .app{padding-top:28px!important}}');
    const s2 = document.createElement('style'); s2.textContent = css.join('\n'); document.head.appendChild(s2);
  })();

  const skin = AtlasSkin.init({
    margin: 0.12,
    board: document.getElementById('board') || frameEl,   // (the board itself: when the phone focus slides it inside the frame, the 3D box follows — senet/app.js Z2)
    outer: r => ({ top: r.top, height: r.height }),
    guide: '../images/atlas/g-dice.webp', guideFallback: '../images/atlas/senet.webp',
    bubbles: [['lsPrompt', 'lsFb'], ['pzGoal', 'pzStatus']],
    skip: 'sn-|dice|roll-pill|fx-|frame|board-wrap',
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
  const dsg = () => de.dataset.bd || 'tut';
  let board = T3.senet.board(dsg()), U = board.userData, Y = U.top; inner.add(board);
  let O = 'h';
  const vkey = () => { const v = SenetApp.view; return v && v.key ? v.key() : O; };
  const units = () => { const v = SenetApp.view; return ((v && v.vbox) ? v.vbox() : B2.VIEW[O])[3] / 100; };   // (the frame's height in board units: no trays on a phone held sideways)
  function orientTo(o) {
    O = String(o)[0] === 'v' ? 'v' : 'h';
    board.rotation.y = O === 'v' ? -Math.PI / 2 : 0;
    skin.alignTo(units(), Y);
  }
  function rebuild() {   // the design tab changed the board: the box is made again with the new top / wood
    const d = dsg(); if (U.design === d) return;
    inner.remove(board); board = T3.senet.board(d); U = board.userData; inner.add(board); orientTo(O); T3.kick(400);
  }
  T3.show('senet', root, { still: true });
  orientTo(vkey());
  T3.kick(800);
  { let last = ''; const app = document.querySelector('.app') || document.body;
    const chk = () => { const r = frameEl.getBoundingClientRect(), k = Math.round(r.left) + ',' + Math.round(r.top + scrollY) + ',' + Math.round(r.width) + ',' + Math.round(r.height); if (k !== last) { last = k; dispatchEvent(new Event('resize')); } };
    if (window.ResizeObserver) { new ResizeObserver(() => requestAnimationFrame(chk)).observe(app); new ResizeObserver(() => requestAnimationFrame(chk)).observe(frameEl); }
    setTimeout(chk, 3000); setTimeout(chk, 6000); }

  /* ---------- the new-game dialog: a note under the boards ---------- */
  const NOTE = {
    ja: ['3D：ツタンカーメンのゲーム箱', '黒檀の箱を獅子の脚の台に載せた、ツタンカーメン王墓のセネトをもとにしています。上の盤面の絵は選んだ盤のデザインになります。'],
    en: ['3D: Tutankhamun’s game box', 'After the senet box from Tutankhamun’s tomb: an ebony casket on a lion-legged stand. Its top shows the board design you choose above.'],
    zh: ['3D：图坦卡蒙的棋盒', '参照图坦卡蒙墓中的塞尼特：乌木棋盒放在狮足台座上。盘面图案随上方所选的棋盘设计而变。'],
    ko: ['3D: 투탕카멘의 게임 상자', '투탕카멘 무덤의 세네트를 바탕으로, 흑단 상자를 사자 다리 받침에 올렸습니다. 판 그림은 위에서 고른 판 디자인이 됩니다.'],
    es: ['3D: la caja de Tutankamón', 'Inspirada en el senet de la tumba de Tutankamón: un cofre de ébano sobre un soporte con patas de león. La tapa muestra el tablero elegido arriba.'],
    fr: ['3D : le coffret de Toutânkhamon', 'D’après le senet de la tombe de Toutânkhamon : un coffret d’ébène sur un support à pattes de lion. Le dessus reprend le plateau choisi plus haut.'],
    pt: ['3D: a caixa de Tutancâmon', 'Inspirada no senet do túmulo de Tutancâmon: um cofre de ébano sobre um suporte com patas de leão. O tampo mostra o tabuleiro escolhido acima.'],
    de: ['3D: Tutanchamuns Spielkasten', 'Nach dem Senet aus Tutanchamuns Grab: ein Ebenholzkasten auf einem Gestell mit Löwenbeinen. Oben zeigt er das darüber gewählte Brett.'],
    hi: ['3D: तूतनख़ामुन का खेल-बक्सा', 'तूतनख़ामुन की कब्र के सेनेट पर आधारित: शेर-पैरों वाले स्टैंड पर आबनूस का बक्सा। ऊपर चुना गया बोर्ड डिज़ाइन इसकी सतह पर दिखता है।'],
    ar: ['ثلاثي الأبعاد: صندوق توت عنخ آمون', 'مستوحى من سينيت مقبرة توت عنخ آمون: صندوق من الأبنوس على حامل بأرجل أسد. يظهر على سطحه تصميم اللوح الذي تختاره أعلاه.'],
    ru: ['3D: игровой ларец Тутанхамона', 'По образцу ларца для сенета из гробницы Тутанхамона: эбеновый ящик на подставке с львиными лапами. На крышке — выбранный выше рисунок доски.'],
    'zh-TW': ['3D：圖坦卡門的遊戲盒', '仿照圖坦卡門墓中的塞尼特盒：放在獅腳台座上的烏木箱。盒面是上方選擇的棋盤圖樣。'],
    id: ['3D: kotak permainan Tutankhamun', 'Meniru kotak senet dari makam Tutankhamun: peti eboni di atas penyangga berkaki singa. Bagian atasnya menampilkan desain papan yang Anda pilih di atas.'],
    tr: ['3D: Tutankamon\'un oyun kutusu', 'Tutankamon\'un mezarındaki senet kutusundan: aslan ayaklı bir kaide üstünde abanoz bir sandık. Üstünde yukarıda seçtiğin tahta deseni görünür.'],
  };
  const fd = document.getElementById('fDesign');
  if (fd) {
    const p = document.createElement('p'); p.className = 'sn3dnote'; fd.appendChild(p);
    const paint = () => { const l = (document.getElementById('langSel') || {}).value || 'ja', n = NOTE[l] || NOTE.en; p.innerHTML = ''; const b = document.createElement('b'); b.textContent = n[0]; p.append(b, n[1]); };
    paint(); const ls = document.getElementById('langSel'); if (ls) ls.addEventListener('change', () => setTimeout(paint, 30));
    // every senet board is a 3D box here, so the 盤 row is the 3D board picker: each tile shows its box on the table
    // (atlas/img/board-senet-<design>.webp, rendered by atlas/tools/boards.html) with the 3D badge, under a 「3D盤」 label
    const V3L = { ja: '3D盤', en: '3D boards', zh: '3D棋盘', ko: '3D 판', es: 'Tableros 3D', fr: 'Plateaux 3D', pt: 'Tabuleiros 3D', de: '3D-Bretter', hi: '3D बोर्ड', ar: 'رقع ثلاثية الأبعاد', ru: '3D-доски', 'zh-TW': '3D棋盤', id: 'Papan 3D', tr: '3D tahtalar' };
    const row = document.getElementById('bdRow'), lab = fd.querySelector(':scope > label');
    const thumbs = () => {
      if (lab) { const l = (document.getElementById('langSel') || {}).value || 'ja', t = V3L[l] || V3L[l.slice(0, 2)] || V3L.en; if (lab.textContent !== t) lab.textContent = t; }
      if (row) row.querySelectorAll('button[data-v]').forEach(bt => {
        if (bt.querySelector('img.sn3t')) return;
        const sv = bt.querySelector('svg'), im = document.createElement('img'); im.className = 'sn3t'; im.alt = ''; im.draggable = false;
        im.src = '../atlas/img/board-senet-' + bt.dataset.v + '.webp?v=3';
        if (sv) sv.replaceWith(im); else bt.prepend(im); bt.classList.add('sn3b');
      });
    };
    thumbs(); if (row) new MutationObserver(thumbs).observe(row, { childList: true });
    if (lab) new MutationObserver(() => { if (lab.textContent && !/3D/.test(lab.textContent)) thumbs(); }).observe(lab, { childList: true, characterData: true, subtree: true });
    const st3 = document.createElement('style');
    st3.textContent = `html.atlas-sn #bdRow button.sn3b{position:relative}
html.atlas-sn #bdRow img.sn3t{display:block;width:100%;aspect-ratio:320/104;object-fit:cover;object-position:50% 46%;border-radius:6px}
html.atlas-sn #bdRow button.sn3b::after{content:'3D';position:absolute;top:6px;inset-inline-start:6px;padding:0 6px;border-radius:99px;background:linear-gradient(180deg,#ffcf5c,#e09a00);color:#fff;font:900 10px/1.5 'Fredoka',system-ui,sans-serif;letter-spacing:.06em;box-shadow:0 2px 0 #b97a00;pointer-events:none}`;
    document.head.appendChild(st3);
  }

  /* ---------- helpers ---------- */
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const animOk = () => { try { return typeof animOn === 'function' ? animOn() : true; } catch (e) { return true; } };
  const spd = () => { try { return typeof SPD === 'function' ? SPD() : 1; } catch (e) { return 1; } };
  let tok = 0;
  const anim = (dur, f, my) => new Promise(res => { const t0 = performance.now(); (function s(n) { if (my !== undefined && my !== tok) return res(); const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(150); if (k < 1) requestAnimationFrame(s); else res(); })(t0); });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // SVG user units → (x, z); a piece lower than the playing surface (on the table) is pushed out a little so that, seen from the
  // camera, it still covers its DOM place (the camera stands about 2.6 × the frame height above the board)
  const camD = () => 2.6 * units();
  const at = (xy, y = Y) => { const f = 1 + (Y - y) / camD(); return [xy[0] / 100 * f, xy[1] / 100 * f]; };
  const pcs = () => de.dataset.pcs || 'tut';

  /* ---------- pieces ---------- */
  const P3 = new Map();
  function mk(side, k) {
    const g = new THREE.Group(), p = T3.senet.piece(side, pcs()); g.add(p);
    const sh = T3.contact(T3.senet.PR * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh; g.userData.pc = p;
    inner.add(g); return { g, side, k, pos: null, look: pcs(), h: 0 };
  }
  function lift(o, h) { o.h = h; o.g.userData.pc.position.y = h; const sh = o.g.userData.sh, s = 1 + h * .6; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 2); }
  function layout(s) {
    const out = new Map(), L = B2.layout(s, O);
    const v = SenetApp.view, tr = !(v && v.trays) || v.trays();   // (no trays: the pieces borne off leave the table)
    for (const q of L.pieces) out.set(q.side * 100 + q.k, { xy: q.xy, y: q.where === 'board' ? Y : 0, pos: q.pos, side: q.side, k: q.k, sc: q.d / B2.PD, hide: !tr && q.where !== 'board' });
    return out;
  }
  function placeAt(o, q) { const [x, z] = at(q.xy, q.y); o.g.position.set(x, q.y, z); o.g.scale.setScalar(q.sc || 1); o.pos = q.pos; o.g.visible = !q.hide; }
  let moving = null, lastState = null;
  function selected(s) {
    let hm = null; try { hm = typeof hoverMove !== 'undefined' ? hoverMove : null; } catch (e) {}
    if (hm && s && s.pos[s.turn]) { const k = s.pos[s.turn].findIndex(p => p === hm.from); if (k >= 0) return s.turn * 100 + k; }
    return -1;
  }
  function mirror(s) {
    if (!s || !s.pos) return;
    lastState = s;
    const L = layout(s), sel = selected(s), lk = pcs();
    for (const [key, o] of P3) if (!L.has(key) || o.look !== lk) { inner.remove(o.g); o.g.userData.sh.material.dispose(); P3.delete(key); }
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

  /* ---------- a move ---------- */
  async function travel(side, from, to, info) {
    const s = lastState || SenetApp.state(); if (!s) return;
    const k = s.pos[side].findIndex(p => p === from); if (k < 0) return;
    const o = P3.get(side * 100 + k); if (!o) return;
    const my = ++tok, sp = Math.max(.5, (info && info.speed) || spd());
    const L = layout(s), pts = [L.get(side * 100 + k)];
    for (let i = from + 1; i <= Math.min(to, 30); i++) pts.push({ xy: B2.sqXY(O, i), y: Y });
    if (to >= E.GOAL) { const ns = E.clone(s); ns.pos[side][k] = E.GOAL; pts.push(layout(ns).get(side * 100 + k)); }
    let vic = null;
    if (info && info.capture) { const vk = s.pos[1 - side].indexOf(to); if (vk >= 0) vic = { o: P3.get((1 - side) * 100 + vk), side: 1 - side, k: vk }; }
    moving = new Set([side * 100 + k]); if (vic) moving.add(vic.side * 100 + vic.k);
    const W = pts.map(q => { const [x, z] = at(q.xy, q.y); return [x, q.y, z]; });
    const H = .34, legT = 160 / sp, h0 = o.h;
    await anim(150 / sp, q => lift(o, h0 + (H - h0) * io(q)), my);
    for (let i = 0; i < W.length - 1 && my === tok; i++) {
      const [x0, ya, z0] = W[i], [x1, yb, z1] = W[i + 1];
      await anim(legT, q => { const e = io(q); o.g.position.x = x0 + (x1 - x0) * e; o.g.position.z = z0 + (z1 - z0) * e; o.g.position.y = ya + (yb - ya) * e; lift(o, H + Math.sin(q * Math.PI) * .06); }, my);
    }
    if (my !== tok) return;
    if (to >= E.GOAL) { const q = pts[pts.length - 1]; o.g.scale.setScalar(q.sc || 1); }
    // a swap: the rival piece hops back to the square the mover left
    let vp = null;
    if (vic && vic.o) {
      const vo = vic.o, [tx, tz] = at(B2.sqXY(O, from)), sx = vo.g.position.x, sz = vo.g.position.z;
      vp = anim(460 / sp, q => { const e = io(q); vo.g.position.set(sx + (tx - sx) * e, Y, sz + (tz - sz) * e); lift(vo, Math.sin(q * Math.PI) * .6); }, my).then(() => lift(vo, 0));
    }
    await anim(150 / sp, q => lift(o, H * (1 - io(q))), my);
    if (my !== tok) return;
    // the House of Water: the piece sinks and rises again on the House of Rebirth
    if (info && info.dest != null && info.dest !== to && to <= 30) {
      const body = o.g.userData.pc;
      await anim(380 / sp, q => { body.position.y = -q * .5; body.scale.setScalar(1 - q * .6); }, my);
      const [bx, bz] = at(B2.sqXY(O, info.dest)); o.g.position.set(bx, Y, bz);
      await anim(380 / sp, q => { body.position.y = -(1 - q) * .3; body.scale.setScalar(.4 + q * .6); }, my);
      body.position.y = 0; body.scale.setScalar(1);
    }
    o.pos = info && info.dest != null ? info.dest : to;
    await anim(110 / sp, q => { const s2 = 1 + Math.sin(q * Math.PI) * .06; o.g.userData.pc.scale.set(s2, 1 / s2, s2); }, my);
    o.g.userData.pc.scale.set(1, 1, 1);
    if (vp) await vp;
  }

  /* ---------- the throw sticks, in the strip of the side to move ---------- */
  const STICKS = [], SK = .72;
  let rolling = false, stickSide = -1, shown = null;
  function ensureSticks() {
    while (STICKS.length < 4) {
      const g = new THREE.Group(), s = T3.senet.stick(); s.scale.setScalar(SK); g.add(s);
      const sh = T3.contact(.3, .35); sh.scale.set(.5, 1, 2.2); sh.position.y = .002; g.add(sh);
      g.userData = { s, sh }; inner.add(g); STICKS.push(g);
    }
  }
  function stickPlaces(side) {   // four sticks lying across the strip, side by side
    const b = B2.stickBox(O, side), cy = b[1] + b[3] / 2, out = [];
    // across the strip where the page keeps the (hidden) 2D sticks: PC lays them at the left with the count beside them (senet/app.js placeDock)
    let cx = b[0] + b[2] / 2;
    const dk = document.getElementById('diceDock'), hs = document.getElementById('diceHost');
    if (O !== 'v' && dk && hs && dk.style.flexDirection === 'row') { const r = dk.getBoundingClientRect(), h = hs.getBoundingClientRect(); if (r.width > 0) cx = b[0] + b[2] * Math.min(.5, Math.max(.12, (h.left + h.width / 2 - r.left) / r.width)); }
    for (let i = 0; i < 4; i++) { const t = (i - 1.5) * 42; out.push(O === 'v' ? [cx + ((i * 37) % 7 - 3) * 1.5, cy + t] : [cx + t, cy + ((i * 37) % 7 - 3) * 1.5]); }
    return out;
  }
  const yawOf = (i, side) => (O === 'v' ? Math.PI / 2 : 0) + ((i * 53 + side * 17) % 11 - 5) * .03;
  const REST = T3.senet.STK.Th * SK / 2;
  function restSticks(side, d) {
    ensureSticks(); const P = stickPlaces(side);
    STICKS.forEach((g, i) => { const [x, z] = at(P[i], REST); T3.senet.stickUp(g.userData.s, !!(d && d[i]), yawOf(i, side)); g.position.set(x, REST, z); g.userData.sh.position.y = .002 - REST; g.userData.sh.rotation.z = yawOf(i, side); g.visible = true; });
    stickSide = side; shown = d ? d.slice() : null; T3.kick(200);
  }
  async function roll(d) {
    const s = SenetApp.state() || lastState, side = s ? s.turn : 0;
    ensureSticks(); rolling = true; const my = ++tok;
    const dur = (animOk() ? 900 : 0) / Math.max(.6, spd());
    if (dur < 50) { restSticks(side, d); rolling = false; return; }
    const P = stickPlaces(side), sg = side === 0 ? 1 : -1;
    const plan = STICKS.map((g, i) => {
      const [x1, z1] = at(P[i], REST), off = 1.4 + Math.random() * .5;
      const from = O === 'v' ? [x1 - sg * off, z1 + (Math.random() - .5)] : [x1 + (Math.random() - .5), z1 + sg * off];
      const flips = 2 + (Math.random() * 3 | 0), end = d[i] ? 0 : Math.PI, spin = end + flips * Math.PI * 2 * (Math.random() < .5 ? 1 : -1);
      return { g, from, to: [x1, z1], spin, end, yaw0: yawOf(i, side) + (Math.random() - .5) * 2.5, yaw1: yawOf(i, side), delay: i * 45 };
    });
    const total = dur + 140;
    await anim(total, k => {
      const t = k * total;
      for (const p of plan) {
        const u = Math.max(0, Math.min(1, (t - p.delay) / dur)), e = 1 - Math.pow(1 - u, 2.4);
        const hop = u < .7 ? Math.sin(u / .7 * Math.PI) * 1.1 : Math.abs(Math.sin((u - .7) / .3 * Math.PI)) * .18 * (1 - u) * 3;
        p.g.position.set(p.from[0] + (p.to[0] - p.from[0]) * e, REST + hop, p.from[1] + (p.to[1] - p.from[1]) * e);
        const b = p.g.userData.s.userData.body; b.rotation.z = p.spin + (p.end - p.spin) * e;
        p.g.userData.s.rotation.y = p.yaw0 + (p.yaw1 - p.yaw0) * e;
        p.g.userData.sh.position.y = .002 - p.g.position.y; p.g.userData.sh.rotation.z = p.g.userData.s.rotation.y;
      }
    }, my);
    if (my === tok) restSticks(side, d);
    rolling = false;
    await sleep(100 / Math.max(.6, spd()));
  }
  const offBoard = () => de.classList.contains('sn-band');
  function syncSticks(s) {
    if (offBoard()) { if (STICKS.some(g => g.visible)) { STICKS.forEach(g => { g.visible = false; }); stickSide = -1; T3.kick(100); } return; }
    if (rolling || !s) return;
    const r = SenetApp.roll(), d = r && r.d ? r.d : null;
    if (!(stickSide === s.turn && JSON.stringify(shown) === JSON.stringify(d) && STICKS.length === 4 && STICKS[0].visible)) restSticks(s.turn, d);
  }

  /* ---------- the hooks the page calls ---------- */
  let lastO = null;
  function checkOrient() { const o = vkey(); if (o !== lastO) { lastO = o; orientTo(o); return true; } return false; }
  window.SenetSkin3D = {
    sync(s) {
      rebuild();
      const ch = checkOrient();
      if (ch) { tok++; moving = null; rolling = false; }
      try { mirror(s); } catch (e) { console.error(e); }
      if (ch) { shown = null; stickSide = -1; }
      syncSticks(s);
    },
    async animateMove(side, from, to, info) {
      if (!animOk()) return;
      try { await travel(side, from, to, info || {}); } finally { moving = null; }
    },
    async animateRoll(d) { checkOrient(); await roll(d || [0, 0, 0, 0]); },
  };
  lastO = vkey();
  try { SenetApp.render(); } catch (e) { try { window.SenetSkin3D.sync(SenetApp.state()); } catch (x) {} }
  new MutationObserver(() => { rebuild(); const s = lastState || SenetApp.state(); if (s) mirror(s); }).observe(de, { attributes: true, attributeFilter: ['data-pcs', 'data-bd'] });


  /* ---------- phones held sideways (the backgammon template): the game's name in the portal pill, and the rotate (landscape)
     button — the page's own one is in its hidden brand row → a copy in the portal bar (touch screens only, skin.css .atlas-land-b) ---------- */
  (function landBtn() {
    const bar = document.querySelector('.atlas-top'), land = document.getElementById('btnLand');
    if (!bar) return;
    const brand = bar.querySelector('.atlas-brand span');
    if (brand && !brand.querySelector('.atlas-gname')) {
      const g = document.createElement('em'); g.className = 'atlas-gname'; brand.appendChild(g);
      const paint = () => { const t = document.getElementById('brandTitle') || document.querySelector('h1 [data-i18n=title]'); g.textContent = t ? t.textContent : ''; };
      paint(); const sel = document.getElementById('langSel'); if (sel) sel.addEventListener('change', () => setTimeout(paint, 60));
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

  window.__snSkin = { pieces: () => P3.size, sticks: () => STICKS.filter(g => g.visible).length, board: () => U.design };
})();
