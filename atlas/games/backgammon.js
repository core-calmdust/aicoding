/* =====================================================================
   Backgammon on the portal.
   • The board card (levels, modes). フル機能 opens the full game with the portal
     skin (backgammon/?skin=atlas); level names / descriptions come from the game
     (backgammon/i18n.js 'lv' / 'lvd'). 手番 (sides): 先手 = your die wins the opening
     roll, 後手 = the AI's (the opening dice are dealt so; colours stay as they are,
     2026-11-09); no rated mode.
   • ちゃぶ台で遊ぶ (table: true): a single game vs the AI on the 3D chabudai, with
     the game's own rules (../backgammon/bg.js) and AI worker (../backgammon/engine.js:
     the same nets, bear-off database and level 1..10 search as the full game).
     The tour's board, checkers and dice (atlas/models/backgammon.js) are used;
     board look and checker colours follow the game's saved settings. No doubling
     cube in table play. Rendering is on demand (Table3D.kick while animating).
   ===================================================================== */
(function () {
  'use strict';
  /* ================= table play (ちゃぶ台で遊ぶ) ================= */
  const BASE = '../backgammon/', BV = '20261111c1';   // same files (and cache keys) as the full game
  let bgLoad = null;
  function loadBG() {   // the game's rules on the main thread (legal moves, pips, winner) — window.BG
    if (window.BG && window.BG.genPlays) return Promise.resolve();
    return bgLoad || (bgLoad = new Promise((res, rej) => { const s = document.createElement('script'); s.src = BASE + 'bg.js?v=' + BV; s.onload = res; s.onerror = rej; document.head.appendChild(s); }));
  }
  const TX = {
    ja: { roll: 'サイコロを振る', undo: '戻す', ok: '確定', tapCk: '光る駒をタップ', tapDest: '行き先をタップ', noMove: '動かせる駒がありません', aiNoMove: 'AIは動けません', youFirst: 'あなたが先攻！', aiFirst: 'AIが先攻', k1: 'シングル（1点）', k2: 'ギャモン（2点）', k3: 'バックギャモン（3点）' },
    en: { roll: 'Roll', undo: 'Undo', ok: 'Done', tapCk: 'Tap a glowing checker', tapDest: 'Tap where to go', noMove: 'No legal move', aiNoMove: 'AI cannot move', youFirst: 'You go first!', aiFirst: 'AI goes first', k1: 'Single (1 pt)', k2: 'Gammon (2 pts)', k3: 'Backgammon (3 pts)' },
    zh: { roll: '掷骰子', undo: '撤销', ok: '确定', tapCk: '点击发光的棋子', tapDest: '点击目的地', noMove: '没有可走的棋', aiNoMove: 'AI无法移动', youFirst: '你先走！', aiFirst: 'AI先走', k1: '单赢（1分）', k2: '全胜（2分）', k3: '完胜（3分）' },
    ko: { roll: '주사위 굴리기', undo: '되돌리기', ok: '확정', tapCk: '빛나는 말을 탭', tapDest: '갈 곳을 탭', noMove: '움직일 수 있는 말이 없어요', aiNoMove: 'AI가 움직일 수 없어요', youFirst: '내가 먼저!', aiFirst: 'AI가 먼저', k1: '싱글 (1점)', k2: '개먼 (2점)', k3: '백개먼 (3점)' },
    es: { roll: 'Tirar', undo: 'Deshacer', ok: 'Listo', tapCk: 'Toca una ficha brillante', tapDest: 'Toca el destino', noMove: 'Sin movimientos', aiNoMove: 'La IA no puede mover', youFirst: '¡Empiezas tú!', aiFirst: 'Empieza la IA', k1: 'Simple (1 pt)', k2: 'Gammon (2 pts)', k3: 'Backgammon (3 pts)' },
    fr: { roll: 'Lancer', undo: 'Annuler', ok: 'Valider', tapCk: 'Touchez un pion lumineux', tapDest: 'Touchez la destination', noMove: 'Aucun coup possible', aiNoMove: 'L’IA ne peut pas jouer', youFirst: 'Vous commencez !', aiFirst: 'L’IA commence', k1: 'Simple (1 pt)', k2: 'Gammon (2 pts)', k3: 'Backgammon (3 pts)' },
    pt: { roll: 'Rolar', undo: 'Desfazer', ok: 'Pronto', tapCk: 'Toque numa peça brilhante', tapDest: 'Toque no destino', noMove: 'Nenhum lance possível', aiNoMove: 'A IA não pode mover', youFirst: 'Você começa!', aiFirst: 'A IA começa', k1: 'Simples (1 pt)', k2: 'Gammon (2 pts)', k3: 'Backgammon (3 pts)' },
    de: { roll: 'Würfeln', undo: 'Zurück', ok: 'Fertig', tapCk: 'Leuchtenden Stein antippen', tapDest: 'Ziel antippen', noMove: 'Kein Zug möglich', aiNoMove: 'Die KI kann nicht ziehen', youFirst: 'Du beginnst!', aiFirst: 'Die KI beginnt', k1: 'Einfach (1 Pkt.)', k2: 'Gammon (2 Pkt.)', k3: 'Backgammon (3 Pkt.)' },
    hi: { roll: 'पासा फेंकें', undo: 'वापस', ok: 'पक्का', tapCk: 'चमकती गोटी छुएँ', tapDest: 'जगह छुएँ', noMove: 'कोई चाल नहीं', aiNoMove: 'AI चल नहीं सकता', youFirst: 'आप पहले!', aiFirst: 'AI पहले', k1: 'सिंगल (1 अंक)', k2: 'गैमन (2 अंक)', k3: 'बैकगैमन (3 अंक)' },
    ar: { roll: 'ارمِ النرد', undo: 'تراجع', ok: 'تأكيد', tapCk: 'المس قطعة مضيئة', tapDest: 'المس الوجهة', noMove: 'لا توجد نقلة', aiNoMove: 'الذكاء لا يستطيع التحرك', youFirst: 'أنت تبدأ!', aiFirst: 'الذكاء يبدأ', k1: 'فوز عادي (1)', k2: 'غامون (2)', k3: 'باكغامون (3)' },
    ru: { roll: 'Бросок', undo: 'Отмена', ok: 'Готово', tapCk: 'Нажмите на светящуюся шашку', tapDest: 'Нажмите, куда идти', noMove: 'Нет допустимых ходов', aiNoMove: 'ИИ не может ходить', youFirst: 'Вы ходите первым!', aiFirst: 'ИИ ходит первым', k1: 'Обычная (1 очко)', k2: 'Марс (2 очка)', k3: 'Домашний марс (3 очка)' },
    'zh-TW': { roll: '擲骰', undo: '悔棋', ok: '完成', tapCk: '點擊發光的棋子', tapDest: '點擊要移動到的位置', noMove: '沒有可走的步', aiNoMove: 'AI無法移動', youFirst: '你先走！', aiFirst: 'AI先走', k1: '一般勝（1分）', k2: '全勝（2分）', k3: '完勝（3分）' },
    id: { roll: 'Lempar', undo: 'Urungkan', ok: 'Selesai', tapCk: 'Ketuk bidak yang menyala', tapDest: 'Ketuk tujuan', noMove: 'Tidak ada langkah sah', aiNoMove: 'AI tidak bisa bergerak', youFirst: 'Kamu jalan duluan!', aiFirst: 'AI jalan duluan', k1: 'Tunggal (1 poin)', k2: 'Gammon (2 poin)', k3: 'Backgammon (3 poin)' },
    tr: { roll: 'At', undo: 'Geri al', ok: 'Tamam', tapCk: 'Parlayan pula dokun', tapDest: 'Gideceği yere dokun', noMove: 'Yasal hamle yok', aiNoMove: 'YZ oynayamıyor', youFirst: 'İlk sen başlıyorsun!', aiFirst: 'İlk YZ başlıyor', k1: 'Tek (1 puan)', k2: 'Mars (2 puan)', k3: 'Katmerli mars (3 puan)' },
  };
  const CN = { ja: { gold: '金', black: '黒', white: '白', red: '赤', green: '緑', blue: '青', pearl: 'パール', brown: '茶' }, en: { gold: 'Gold', black: 'Black', white: 'White', red: 'Red', green: 'Green', blue: 'Blue', pearl: 'Pearl', brown: 'Brown' },
    zh: { gold: '金', black: '黑', white: '白', red: '红', green: '绿', blue: '蓝', pearl: '珍珠', brown: '棕' }, 'zh-TW': { gold: '金', black: '黑', white: '白', red: '紅', green: '綠', blue: '藍', pearl: '珍珠', brown: '棕' }, ko: { gold: '금', black: '검정', white: '흰색', red: '빨강', green: '녹색', blue: '파랑', pearl: '진주', brown: '갈색' },
    es: { gold: 'Oro', black: 'Negro', white: 'Blanco', red: 'Rojo', green: 'Verde', blue: 'Azul', pearl: 'Perla', brown: 'Marrón' }, fr: { gold: 'Or', black: 'Noir', white: 'Blanc', red: 'Rouge', green: 'Vert', blue: 'Bleu', pearl: 'Nacre', brown: 'Brun' }, pt: { gold: 'Ouro', black: 'Preto', white: 'Branco', red: 'Vermelho', green: 'Verde', blue: 'Azul', pearl: 'Pérola', brown: 'Marrom' }, de: { gold: 'Gold', black: 'Schwarz', white: 'Weiß', red: 'Rot', green: 'Grün', blue: 'Blau', pearl: 'Perlmutt', brown: 'Braun' },
    ru: { gold: 'Золотые', black: 'Чёрные', white: 'Белые', red: 'Красные', green: 'Зелёные', blue: 'Синие', pearl: 'Перламутровые', brown: 'Коричневые' }, tr: { gold: 'Altın', black: 'Siyah', white: 'Beyaz', red: 'Kırmızı', green: 'Yeşil', blue: 'Mavi', pearl: 'İnci', brown: 'Kahverengi' }, id: { gold: 'Emas', black: 'Hitam', white: 'Putih', red: 'Merah', green: 'Hijau', blue: 'Biru', pearl: 'Mutiara', brown: 'Cokelat' },
    hi: { gold: 'सुनहरा', black: 'काला', white: 'सफ़ेद', red: 'लाल', green: 'हरा', blue: 'नीला', pearl: 'मोती', brown: 'भूरा' }, ar: { gold: 'الذهبي', black: 'الأسود', white: 'الأبيض', red: 'الأحمر', green: 'الأخضر', blue: 'الأزرق', pearl: 'اللؤلؤي', brown: 'البني' } };
  const PV = { ja: { turnC: '{c}の番', firstC: '{c}が先攻！', winC: '{c}の勝ち', noMoveC: '{c}は動かせません' }, en: { turnC: "{c}'s turn", firstC: '{c} goes first!', winC: '{c} wins', noMoveC: '{c} cannot move' },
    zh: { turnC: '轮到{c}', firstC: '{c}先走！', winC: '{c}获胜', noMoveC: '{c}无法移动' }, ko: { turnC: '{c} 차례', firstC: '{c}이(가) 먼저!', winC: '{c} 승리', noMoveC: '{c}은(는) 움직일 수 없어요' },
    ru: { turnC: 'Ход: {c}', firstC: '{c} ходят первыми!', winC: 'Победа: {c}', noMoveC: '{c}: нет ходов' }, 'zh-TW': { turnC: '輪到{c}', firstC: '{c}先走！', winC: '{c}獲勝', noMoveC: '{c}無法移動' },
    id: { turnC: 'Giliran {c}', firstC: '{c} jalan duluan!', winC: '{c} menang', noMoveC: '{c} tidak bisa bergerak' }, tr: { turnC: 'Sıra: {c}', firstC: 'İlk {c} başlıyor!', winC: '{c} kazandı', noMoveC: '{c} oynayamıyor' } };
  const DOT = { gold: 'radial-gradient(circle,#e9dfc8 52%,#d8b25e 56%)', black: 'radial-gradient(circle,#1c1c1f 52%,#d6d8dc 56%)', white: 'radial-gradient(circle,#f5f2ea 52%,#c9ccd2 56%)', red: 'radial-gradient(circle,#a8141d 52%,#d8b25e 56%)', green: 'radial-gradient(circle,#1d7a4f 52%,#d8b25e 56%)', blue: 'radial-gradient(circle,#1f3a8a 52%,#d6d8dc 56%)', pearl: 'radial-gradient(circle,#f2ece8 52%,#d8b25e 56%)', brown: 'radial-gradient(circle,#8a4a22 52%,#e6b296 56%)' };
  const NOSFX = { tok() {}, rattle() {}, blip() {}, chime() {} };

  function tableStart(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, M3 = T3.backgammon, t = ctx.t;
    const L = Object.assign({}, TX.en, TX[ctx.lang] || {}, PV.en, PV[ctx.lang] || {}, { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose') });
    const SFX = (window.AtlasRules && AtlasRules.backgammon && AtlasRules.backgammon.SFX) || NOSFX;
    const level = Math.max(1, Math.min(10, +ctx.level || 6)), PVP = ctx.mode === 'pvp';   // pvp: two players on this device (no AI)
    const PZ = ctx.pz || null;   // a puzzle / lesson position driven by atlas/puzzles.js · lessons3d.js (no AI, no roll: the dice are given; ctx.pz.step / moved judge)
    // the game's saved look and checker colours (backgammon/app.js settings, the skin's board-design choice)
    let look = 'marq', ck = ['gold', 'black'];
    try {
      const v = localStorage.getItem('atlas-bg-look'), st = (JSON.parse(localStorage.getItem('aicoding-backgammon-v2') || '{}') || {}).settings || {};
      look = (M3.LOOKS || ['marq', 'scarlet']).includes(v) ? v : st.skin === 'scarlet' ? 'scarlet' : 'marq';   // (six 3D boards, 2026-11-11)
      if (st.ck && M3.CKL[st.ck[0]] && M3.CKL[st.ck[1]] && st.ck[0] !== st.ck[1]) ck = st.ck.slice();
    } catch (e) {}
    const CID = [ck[0], ck[1]];
    const cname = s => (CN[ctx.lang] || CN.en)[CID[s]] || CID[s], pname = s => PVP ? cname(s) : s ? L.ai : L.you;   // engine side 0 = you (bottom, 24 → 1), side 1 = the AI

    // the case (H = 12; the phone-landscape layout gives it the full game's flatter landscape height, see reshape) inside a holder
    // that also carries the checkers, dice and marks, so the case can be swapped without touching them
    let kase = T3.MODELS.backgammon(true, { look, H: 12 });
    const board = new TH.Group(); board.add(kase); board.userData.top = kase.userData.top;
    T3.show('backgammon', board); T3.play(true);
    const g = M3.geom(12), Y = board.userData.top, W2 = g.W / 2, SC = .62; let H2 = g.H / 2, flat = false, ready = false;   // (ready: the pieces exist — frameOn already asks for a shape while this starts)
    board.scale.setScalar(SC);
    const bvEl = ctx.el.parentNode, isPL = () => !!(bvEl && bvEl.classList.contains('pland'));   // the portal's phone-landscape layout (app.js LAND)
    let turned = false, colUI = false;
    const FR = M3.frameOn(board, T3, { SC, Y, g, left: ctx.bar ? 92 : 6, right: 92,   // (ctx.bar: the portal's action bar takes a column at the landscape left)
      land: isPL, top: () => window.__land ? __land.top() : 0, shape: m => reshape(m === 'land' ? flatH() : 12),
      onChange: m => { turned = m === 'turn'; colUI = m === 'turn' || m === 'wide'; if (bvEl) { bvEl.classList.toggle('land', turned); bvEl.classList.toggle('bgwide', m === 'wide'); }   // the page's UI turns with the view
      setTimeout(() => { if (!stopped) { hud(); placeLater(); T3.kick(300); } }, 0); } });   // the whole case, large; turned 90° on a portrait phone
    const marks = new TH.Group(); board.add(marks);
    let stopped = false, timers = [], cks = [], dice = [], phase = 'wait', over = false, toMove = -1, msg = '';
    let pos = null, T = null, sel = null, dests = null, worker = null, jid = 0, seed = '', stream = null, nRoll = 0, busy = false;
    let ply = 0, hist = [], hintPlay = null, hintJ = 0, lastAI = '';   // 待った: the position + dice at the start of each human turn · ヒント: the best play's remaining steps · lastAI: the AI's last play in its own numbering ("AI Lv6: 24/23 13/8", the full game's status line)
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const turnOn = side => { ply++; if (ctx.onTurn) ctx.onTurn(side, { human: PVP || side === 0, ply }); };   // the clock: a player's time runs from the roll to the last step
    const jobs = new Map();
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const sleep = ms => new Promise(r => later(r, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else { if (done) done(); T3.kick(200); } })(t0); };
    const animP = (dur, f) => new Promise(r => anim(dur, f, r));
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const locOf = (s, p) => p === 25 ? 'bar' : p === 0 ? 'off' : s ? 25 - p : p;   // engine point of side s → view location (your numbering)

    /* ---------- checkers ---------- */
    function spot(c) {   // c = { side, at: view point | 'bar' | 'off', k, n }
      if (c.at === 'bar') { const st = c.n <= 1 ? g.C : Math.min(g.C, (g.MID - g.TOP - 1.6 - g.C) / (c.n - 1)); const uy = c.side ? g.MID + 1.02 + c.k * st : g.MID - 1.02 - c.k * st; return { x: g.BX + g.B / 2 - W2, y: Y, z: uy - H2, edge: false }; }
      if (c.at === 'off') { const st = Math.min(.28, (g.MID - g.TOP - .55) / 15), uy = c.side ? g.TOP + .17 + c.k * st + .125 : g.BOT - .17 - c.k * st - .125; return { x: g.TX + g.TW / 2 - W2, y: Y + M3.CK_R, z: uy - H2, edge: true }; }
      const [x, z] = stackXZ(c.at, c.k, c.n); return { x, y: Y, z, edge: false };
    }
    // a point's stack: on the flat landscape board as in the full game (backgammon/app.js stackStep / stackCap: fewer checkers
    // are drawn, the rest sit under the bottom one and the top one shows the count)
    const stackCap = () => flat ? Math.max(2, Math.floor((g.MID - g.TOP - .12 - g.C) / (g.C * .7)) + 1) : 99;
    function stackXZ(vp, k, n) {
      if (!flat) return M3.stackXZ(vp, k, n, g);
      const cap = stackCap(); if (n > cap) { k = Math.max(0, k - (n - cap)); n = cap; }
      const st = n <= 1 ? g.C : Math.min(g.C, (g.MID - g.TOP - .12 - g.C) / (n - 1)), ux = M3.slotX(vp, g), uy = vp >= 13 ? g.TOP + g.C / 2 + k * st : g.BOT - g.C / 2 - k * st;
      return [ux - W2, uy - H2];
    }
    // the count on a stack's top checker (flat board: more than min(5, cap) checkers), in the checker's own ink as in the full game
    const INK = { gold: '#4a3414', black: '#efe6cf', white: '#3a3630', red: '#fff1e0', green: '#f6e6b8', blue: '#f4e6bc', pearl: '#3e3430', brown: '#fbeedb' }, cntTex = {}, cnts = new TH.Group(); board.add(cnts);
    function cntMesh(n, id) {
      const k = id + n; if (!cntTex[k]) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = INK[id] || '#2b3044'; x.font = '800 78px "Shippori Mincho B1", Georgia, "Times New Roman", serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), 64, 70); cntTex[k] = new TH.CanvasTexture(c); cntTex[k].encoding = TH.sRGBEncoding; }
      const m = new TH.Mesh(new TH.PlaneGeometry(.7, .7), new TH.MeshBasicMaterial({ map: cntTex[k], transparent: true, depthWrite: false, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.renderOrder = 3; return m;
    }
    function counts() {
      while (cnts.children.length) { const m = cnts.children[0]; cnts.remove(m); m.geometry.dispose(); m.material.dispose(); }
      if (!flat) return;
      const grp = {}; cks.forEach(c => { if (typeof c.at === 'number') (grp[c.side + ':' + c.at] = grp[c.side + ':' + c.at] || []).push(c); });
      Object.values(grp).forEach(a => {
        const n = a.length; if (n <= Math.min(5, stackCap())) return;
        const c = a[0], [x, z] = stackXZ(c.at, n - 1, n), m = cntMesh(n, CID[c.side]); m.position.set(x, Y + M3.CK_H + .012, z); cnts.add(m);
      });
      T3.kick(200);
    }
    // the case's height: 12 (the tour's board), or on a phone held sideways the full game's flat landscape board (backgammon/app.js
    // flatFit: as wide as the screen, its height fitted to the room under the bar, 6.4 … 10)
    function flatH() {
      const cv = T3.renderer && T3.renderer() && T3.renderer().domElement, w = cv && cv.clientWidth || innerWidth, h = cv && cv.clientHeight || innerHeight;
      const avail = h - (window.__land ? __land.top() : 80) - 8, u = Math.min((w - 16) / 15.85, avail / 6.4, 60);
      return Math.max(6.4, Math.min(10, avail / u));
    }
    function reshape(H) {
      const fl = H < 11.99;
      if (Math.abs(H - g.H) < .02 && fl === flat) return;
      board.remove(kase); kase.traverse(o => { if (o.geometry && /Extrude|Tube/.test(o.geometry.type)) o.geometry.dispose(); });
      Object.assign(g, M3.geom(H)); H2 = g.H / 2; flat = fl;
      kase = T3.MODELS.backgammon(true, { look, H }); board.add(kase);
      if (!ready) return;
      triGeo = mkTri();
      restack(); cks.forEach(c => { if (c !== lifted) place(c); });
      if (lifted) { const p = spot(lifted); lifted.m.position.set(p.x, Y + .4, p.z); }
      if (phase === 'move' && T && !busy) { const s0 = sel; showSources(); if (s0 !== null && legalNow().some(x => x.from === s0)) select(s0); }
      T3.kick(400);
    }
    function place(c, p) { T3.kick(200); p = p || spot(c); c.m.position.set(p.x, p.y, p.z + (p.edge ? -M3.CK_H / 2 : 0)); c.m.rotation.set(p.edge ? Math.PI / 2 : 0, 0, 0); }
    function mk(side) { const m = M3.checker(CID[side]); const sh = T3.contact(.47, .45); sh.position.y = .002; sh.userData.contact = true; m.add(sh); board.add(m); return m; }
    function restack() { const grp = {}; cks.forEach(c => { const key = c.side + ':' + c.at; (grp[key] = grp[key] || []).push(c); }); Object.values(grp).forEach(a => a.forEach((c, i) => { c.k = i; c.n = a.length; })); counts(); }
    const shadow = c => c.m.children.forEach(ch => { if (ch.userData.contact) ch.visible = c.at !== 'off'; });
    function setBoard() {   // the starting position, dropped in one by one
      const P = { 24: 2, 13: 5, 8: 3, 6: 5 };
      [0, 1].forEach(side => Object.keys(P).forEach(p => { for (let i = 0; i < P[p]; i++) cks.push({ side, at: locOf(side, +p), m: mk(side) }); }));
      restack();
      cks.forEach((c, i) => { place(c); shadow(c); const y0 = c.m.position.y; c.m.visible = false; later(() => { c.m.visible = true; anim(240, k => { c.m.position.y = y0 + (1 - k) * (1 - k) * 1.2; }, () => { c.m.position.y = y0; if (i % 4 === 0) SFX.tok(.3, 1.2); }); }, 420 + i * 14); });
    }
    const topOf = (side, at) => { let r = null; cks.forEach(c => { if (c.side === side && c.at === at && (!r || c.k > r.k)) r = c; }); return r; };
    function landXZ(side, at) { const n = cks.filter(c => c.side === side && c.at === at).length, s = spot({ side, at, k: n, n: n + 1 }); return [s.x, s.z + (s.edge ? -M3.CK_H / 2 : 0)]; }
    function land(c) { anim(150, k => { const s = 1 + Math.sin(k * Math.PI) * .07; c.m.scale.set(s, 1 / s, s); }, () => c.m.scale.set(1, 1, 1)); }
    function moveTo(c, at, hopH, fast) {   // lifted, carried and set down
      return new Promise(done => {
        const p0 = c.m.position.clone(), r0 = c.m.rotation.x; c.at = at; restack();
        const s = spot(c), p1 = new TH.Vector3(s.x, s.y, s.z + (s.edge ? -M3.CK_H / 2 : 0)), d = p0.distanceTo(p1), dur = (fast ? 200 : 260) + d * (fast ? 30 : 45), lift = hopH || Math.min(1.4, .35 + d * .12);
        c.m.children.forEach(ch => { if (ch.userData.contact) ch.visible = false; });
        anim(dur, k => { const e = io(k); c.m.position.lerpVectors(p0, p1, e); c.m.position.y += Math.sin(k * Math.PI) * lift; c.m.rotation.x = r0 + ((s.edge ? Math.PI / 2 : 0) - r0) * e; },
          () => { place(c); shadow(c); SFX.tok(1, at === 'off' ? 1.3 : 1); land(c); cks.filter(o => o !== c).forEach(o => place(o)); done(); });
      });
    }
    // one die's step of side s (engine numbering); you: hop point by point, the AI: one arc. A blot there goes to the bar.
    async function stepAnim(s, from, to, hop) {
      const fl = locOf(s, from), tl = locOf(s, to), c = topOf(s, fl); if (!c) return;
      const victim = typeof tl === 'number' ? cks.find(o => o.side !== s && o.at === tl) : null;
      if (hop) {
        const P = []; for (let v = from - 1; v > Math.max(to, 0); v--) P.push(locOf(s, v));
        const hd = Math.max(90, Math.min(200, 650 / (P.length + 1)));
        for (let i = 0; i < P.length; i++) {
          const [x, z] = landXZ(s, P[i]), p0 = c.m.position.clone(), p1 = new TH.Vector3(x, Y + .3, z);
          c.m.children.forEach(ch => { if (ch.userData.contact) ch.visible = false; });
          await animP(hd, k => { c.m.position.lerpVectors(p0, p1, io(k)); c.m.position.y += Math.sin(k * Math.PI) * .4; });
          SFX.tok(.4, 1 + i * .06);
        }
        await moveTo(c, tl, .5, true);
      } else await moveTo(c, tl);
      if (victim && !stopped) { SFX.tok(.9, .8); await moveTo(victim, 'bar', 1.2); }
    }

    /* ---------- dice ---------- */
    const halfX = side => (side ? g.LX + 3 : g.RX + 3) - W2;   // you roll in the right half, the AI in the left
    function clearDice() { dice.forEach(d => board.remove(d)); dice = []; T3.kick(200); }
    function diceSpots(n, side) { const dbl = n === 4, xs = dbl ? [-1.38, -.46, .46, 1.38] : [-.55, .55]; return xs.map((x, i) => ({ x: halfX(side) + x, z: dbl ? 0 : (i ? .25 : -.2), y: Y + (dbl ? .35 : .4) })); }
    function makeDie(id, v, size, yaw) { const d = M3.die(id, size); M3.dieRot(d, v, yaw); d.userData.v = v; board.add(d); dice.push(d); return d; }
    function throwDice(specs) {   // [{id, v, x, y, z, size, dir}] — thrown in from the side, tumbling, two bounces, then at rest
      clearDice(); SFX.rattle();
      const ds = specs.map((s, i) => { const d = makeDie(s.id, s.v, s.size || .8, (i % 2 ? -.25 : .3) * (s.size < .8 ? .2 : 1)); d.position.set(s.x, s.y, s.z); return d; });
      const ends = ds.map(d => ({ p: d.position.clone(), r: d.rotation.clone() })), spin = ds.map(() => [6 + Math.random() * 4, 5 + Math.random() * 4, 3 + Math.random() * 3]);
      return animP(900, k => ds.forEach((d, i) => {
        const e = ends[i], kk = Math.min(1, k * 1.05 + i * .02), r = 1 - io(kk), hop = Math.abs(Math.sin(kk * Math.PI * 2.5)) * (1 - kk) * 1.6;
        d.position.set(e.p.x + r * 3.2 * specs[i].dir, e.p.y + hop, e.p.z + r * (i % 2 ? .8 : -.9));
        d.rotation.set(e.r.x + r * spin[i][0], e.r.y + r * spin[i][1], e.r.z + r * spin[i][2], 'YXZ');
      })).then(() => { ds.forEach((d, i) => { d.position.copy(ends[i].p); d.rotation.copy(ends[i].r); }); T3.kick(200); SFX.tok(.6, 1.8); });
    }
    function rollFor(side, v) {   // a turn's roll: two dice in the roller's colour (doubles: four)
      const vals = v[0] === v[1] ? [v[0], v[0], v[0], v[0]] : v, sp = diceSpots(vals.length, side);
      return throwDice(vals.map((x, i) => ({ id: CID[side], v: x, x: sp[i].x, y: sp[i].y, z: sp[i].z, size: vals.length === 4 ? .7 : .8, dir: side ? -1 : 1 })));
    }
    function dimDice(left) {   // used dice turn translucent
      const rest = left.slice();
      dice.forEach(d => { const i = rest.indexOf(d.userData.v), used = i < 0; if (!used) rest.splice(i, 1);
        d.traverse(o => { if (!o.isMesh) return; if (!o.userData.m0) { o.userData.m0 = o.material; o.userData.m1 = o.material.clone(); o.userData.m1.transparent = true; o.userData.m1.opacity = .3; } o.material = used ? o.userData.m1 : o.userData.m0; }); });
      T3.kick(120);
    }
    const nextRoll = () => stream.get(nRoll++);

    /* ---------- marks ---------- */
    const mkTri = () => { const s = new TH.Shape(); s.moveTo(-.46, 0); s.lineTo(.46, 0); s.lineTo(0, g.PL); s.closePath(); return new TH.ShapeGeometry(s); };
    let triGeo = mkTri();
    const ringGeo = new TH.TorusGeometry(.33, .05, 10, 40);
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); T3.kick(120); }
    function glowPt(vp, color, op) {
      const top = vp >= 13, m = new TH.Mesh(triGeo, new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false, side: TH.DoubleSide }));
      m.rotation.x = -Math.PI / 2; if (top) m.rotation.z = Math.PI;
      m.position.set(M3.slotX(vp, g) - W2, Y + .006, (top ? g.TOP : g.BOT) - H2); marks.add(m); T3.kick(200); return m;
    }
    function ring(x, y, z, color) { const m = new TH.Mesh(ringGeo, new TH.MeshBasicMaterial({ color, transparent: true, opacity: .95, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); marks.add(m); T3.kick(200); return m; }
    function trayGlow(side = 0) { const h = g.MID - g.TOP - .15, m = new TH.Mesh(new TH.PlaneGeometry(g.TW - .1, h), new TH.MeshBasicMaterial({ color: 0x2fd17a, transparent: true, opacity: .45, toneMapped: false, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.set(g.TX + g.TW / 2 - W2, Y + .006, (side ? g.TOP + .05 : g.MID + .1) + h / 2 - H2); marks.add(m); T3.kick(200); }
    const numTex = {};
    function numSprite(n) {
      if (!numTex[n]) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 9; x.strokeStyle = '#1f9d5a'; x.stroke(); x.fillStyle = '#2b3044'; x.font = '900 74px Fredoka, "Zen Maru Gothic", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), 64, 70); numTex[n] = new TH.CanvasTexture(c); numTex[n].encoding = TH.sRGBEncoding; }
      const sp = new TH.Sprite(new TH.SpriteMaterial({ map: numTex[n], depthTest: false, toneMapped: false })); sp.scale.set(.62, .62, 1); sp.renderOrder = 5; return sp;
    }
    function popIn(o, s1) { o.scale.set(.01, .01, .01); anim(200, k => { const s = s1 * (k < .7 ? k / .7 * 1.15 : 1.15 - (k - .7) / .3 * .15); o.scale.set(s, s, o.isSprite ? 1 : s); }); }
    let lifted = null;
    function drop() { if (!lifted) return; const c = lifted; lifted = null; if (!stopped && c.m.parent) place(c); T3.kick(120); }

    /* ---------- your turn ---------- */
    const legalNow = () => T ? BG.legalSteps(T.pos, T.side, T.left, T.dice, T.steps.length) : [];
    function destsFrom(from) {   // the game's own search (backgammon/app.js destsFrom): dest → steps, shortest, most hits
      const res = new Map();
      const dfs = (q, left, used, pt, path) => {
        for (const x of BG.legalSteps(q, T.side, left, T.dice, used).filter(y => y.from === pt)) {
          const r = q.slice(), code = BG.apply(r, T.side, x.from, x.to), np = path.concat([{ from: x.from, to: x.to, die: x.die, hit: BG.mvHit(code) }]);
          const prev = res.get(x.to), hits = np.filter(y => y.hit).length;
          if (!prev || np.length < prev.length || (np.length === prev.length && hits > prev.filter(y => y.hit).length)) res.set(x.to, np);
          if (x.to !== 0) { const i = left.indexOf(x.die); dfs(r, left.slice(0, i).concat(left.slice(i + 1)), used + 1, x.to, np); }
        }
      };
      dfs(T.pos, T.left, T.steps.length, from, []);
      return res;
    }
    function showSources() {   // a gold ring under the top checker of every point you may move from
      drop(); clearMarks(); sel = null; dests = null;
      const srcs = [...new Set(legalNow().map(x => x.from))];
      srcs.forEach(p => { const c = topOf(T.side, locOf(T.side, p)); if (c) popIn(ring(c.m.position.x, c.m.position.y + M3.CK_H + .02, c.m.position.z, 0xffc928), 1); });
      drawHint();
      return srcs;
    }
    function select(p) {
      showSources(); sel = p; dests = destsFrom(p);
      const c = topOf(T.side, locOf(T.side, p)); if (c) { lifted = c; const y0 = c.m.position.y; anim(160, k => { c.m.position.y = y0 + (Y + .4 - y0) * io(k); }); SFX.tok(.6, 1.6); }
      for (const [to, path] of dests) {
        const pips = path.reduce((a, s) => a + s.die, 0), at = locOf(T.side, to), [x, z] = landXZ(T.side, at);
        if (to === 0) trayGlow(T.side); else glowPt(at, 0x2fd17a, .42);
        popIn(ring(x, Y + .03, z, path.some(s => s.hit) ? 0xff5d5d : 0x2fd17a), 1);
        const sp = numSprite(pips); sp.position.set(x, Y + .8, z); marks.add(sp); popIn(sp, .62); T3.kick(200);
      }
      say(L.tapDest);
    }
    async function doPath(path) {
      busy = true; hintPlay = null; hintJ++; drop(); clearMarks(); say('');
      for (const st of path) {
        if (stopped || !T) return;
        await stepAnim(T.side, st.from, st.to, false);   // one flight, like the AI's moves
        const q = T.pos.slice(), code = BG.apply(q, T.side, st.from, st.to);
        T.pos = q; T.steps.push({ code, die: st.die, from: st.from, to: st.to, hit: BG.mvHit(code) });
        T.left.splice(T.left.indexOf(st.die), 1); dimDice(T.left);
      }
      busy = false; afterStep();
    }
    function afterStep() {
      if (stopped || !T) return;
      if (PZ && T.steps.length && T.pzReport !== T.steps.length) {   // (puzzles / lessons: each step goes to the caller — an obvious mistake stops the play there)
        T.pzReport = T.steps.length; pzClear();
        if (PZ.step && PZ.step({ pos: T.pos.slice(), left: T.left.slice(), steps: T.steps.map(x => x.code), used: T.steps.length, dice: T.dice.slice(), side: T.side }) === false) { phase = 'lock'; clearMarks(); return; }
      }
      if (PZ && !legalNow().length) { const T0 = T; phase = 'lock'; clearMarks(); later(() => { if (T === T0 && PZ.moved) PZ.moved({ key: BG.key(T0.pos), steps: T0.steps.map(x => x.code), pos: T0.pos.slice() }); }, 260); return; }
      const srcs = legalNow().length ? showSources() : (clearMarks(), []);
      if (!srcs.length) { hud(); return; }
      if (srcs.length === 1) select(srcs[0]); else say(L.tapCk);
    }
    async function undo() {
      if (!T || busy || !T.steps.length) return;
      busy = true; hintPlay = null; hintJ++; drop(); clearMarks(); say('');
      const st = T.steps.pop();
      const me = T.side, c = topOf(me, locOf(me, st.to)); if (c) await moveTo(c, locOf(me, st.from));   // flies back the same way
      if (st.hit) { const v = topOf(1 - me, 'bar'); if (v) await moveTo(v, locOf(me, st.to), 1.2); }
      const q = T.start.slice(); T.left = T.dice[0] === T.dice[1] ? [T.dice[0], T.dice[0], T.dice[0], T.dice[0]] : T.dice.slice();
      for (const s of T.steps) { BG.apply(q, me, s.from, s.to); T.left.splice(T.left.indexOf(s.die), 1); }
      T.pos = q; dimDice(T.left); busy = false; afterStep();
    }
    function commit() {
      if (!T || busy || legalNow().length) return;
      if (!T.plays.some(x => BG.key(x.pos) === BG.key(T.pos))) return;   // safety: must be one of the legal plays
      const me = T.side; pos = T.pos; T = null; hintPlay = null; hintJ++; clearMarks(); SFX.tok(.5, 1.5);
      if (!checkEnd()) nextTurn(1 - me);
    }
    function beginMove(d, side = 0) {   // a human's move (side 1 too in a two-player game): the engine in that side's own numbering
      if (stopped || over) return;
      toMove = side; T = { side, dice: d, left: d[0] === d[1] ? [d[0], d[0], d[0], d[0]] : d.slice(), steps: [], pos: pos.slice(), start: pos.slice(), plays: BG.genPlays(pos, side, d[0], d[1]) };
      if (T.plays.length === 1 && !T.plays[0].moves.length) { T = null; say(PVP ? L.noMoveC.replace('{c}', cname(side)) : L.noMove); later(() => { if (!over) { dimDice([]); nextTurn(1 - side); } }, 1700); return; }
      hist.push({ pos: pos.slice(), dice: d.slice(), side });
      phase = 'move'; afterStep();
    }
    async function humanRoll() {
      if (phase !== 'roll' || stopped || over) return;
      phase = 'anim'; say('');
      const side = toMove === 1 ? 1 : 0, d = nextRoll(); await rollFor(side, d); if (stopped || over) return;
      beginMove(d, side);
    }

    /* ---------- the AI's turn (the game's worker, same level) ---------- */
    function ask(m) {
      if (!worker) {
        try { worker = new Worker(BASE + 'engine.js?v=' + BV); } catch (e) { worker = null; }
        if (worker) { worker.onmessage = e => { const j = jobs.get(e.data.id); if (j) { jobs.delete(e.data.id); j(e.data); } }; worker.onerror = () => { jobs.forEach(j => j({})); jobs.clear(); }; }
      }
      if (!worker) return Promise.resolve({});
      return new Promise(r => { const id = ++jid; jobs.set(id, r); worker.postMessage(Object.assign({}, m, { id })); });
    }
    async function aiTurn(d0) {
      if (stopped || over) return;
      toMove = 1; phase = 'ai'; say(''); turnOn(1);
      const k = nRoll, d = d0 || nextRoll();
      if (!d0) { await sleep(350); await rollFor(1, d); if (stopped || over) return; }
      const plays = BG.genPlays(pos, 1, d[0], d[1]);
      if (plays.length === 1 && !plays[0].moves.length) { say(L.aiNoMove); await sleep(1500); if (stopped || over) return; dimDice([]); return yourTurn(); }
      say(L.think);
      const t0 = Date.now();
      const r = await ask({ type: 'move', pos: Array.from(pos), side: 1, dice: d, level, tag: seed + '0:' + (d0 ? 0 : k) });
      if (stopped || over) return;
      let moves = r && r.moves;
      const ok = moves && plays.some(x => { const q = pos.slice(); moves.forEach(c => BG.apply(q, 1, BG.mvFrom(c), BG.mvTo(c))); return BG.key(q) === BG.key(x.pos); });
      if (!ok) moves = plays[0].moves;   // (the worker failed to load: still a legal play)
      // AIの着手は即時（前の手のアニメもさいころも終わっている）
      { const q = pos.slice(), nt = moves.map(c => { const f = BG.mvFrom(c), tt = BG.mvTo(c), hit = BG.mvHit(BG.apply(q, 1, f, tt)); return (f === 25 ? 'bar' : f) + '/' + (tt === 0 ? 'off' : tt) + (hit ? '*' : ''); });
        lastAI = `${L.ai} Lv${level}: ${nt.join(' ')}`; }
      say('');
      const left = d[0] === d[1] ? [d[0], d[0], d[0], d[0]] : d.slice();
      for (const c of moves) {
        if (stopped || over) return;
        const from = BG.mvFrom(c), to = BG.mvTo(c);
        await stepAnim(1, from, to, false); BG.apply(pos, 1, from, to);
        const dd = from - to, i = left.indexOf(dd) >= 0 ? left.indexOf(dd) : left.indexOf(Math.min(...left.filter(v => v > dd)));
        if (i >= 0) left.splice(i, 1); else left.pop();
        dimDice(left); hud(); await sleep(140);
      }
      if (stopped || over || checkEnd()) return;
      await sleep(250); if (!over) yourTurn();
    }
    function yourTurn(side = 0) { if (stopped || over) return; toMove = side; phase = 'roll'; turnOn(side); say(PVP ? L.turnC.replace('{c}', cname(side)) : ''); }
    function nextTurn(side) { if (PVP) yourTurn(side); else if (side === 1) aiTurn(); else yourTurn(0); }

    /* ---------- the end ---------- */
    function checkEnd() {
      const w = BG.winner(pos); if (w < 0) return false;
      over = true; phase = 'over'; toMove = -1; clearMarks(); if (ctx.onTurn) ctx.onTurn(-1);
      const kind = BG.winKind(pos, w), kt = L['k' + Math.min(3, kind)];
      if (PVP) { const t = L.winC.replace('{c}', cname(w)) + ' · ' + kt; say(t); SFX.chime(); ctx.onEnd({ win: false, draw: false, level, score: t, pvp: true }); return true; }
      say((w === 0 ? L.win : L.lose) + ' · ' + kt); SFX.chime();
      ctx.onEnd({ win: w === 0, draw: false, level, score: kt });
      return true;
    }

    /* ---------- HUD: you · buttons · AI (one line); messages in a speech bubble next to it ---------- */
    const css = document.createElement('style');
    css.textContent = '.hud .bgk{width:18px;height:18px;border-radius:50%;display:inline-block;flex:none;box-shadow:0 1px 2px rgba(0,0,0,.35)}.hud .bgm{display:flex;align-items:center;gap:6px;flex:none}.hud .bgb{padding:8px 16px;font-size:15px;white-space:nowrap;box-shadow:0 3px 0 var(--coral2)}.hud .bgb.go{font-size:16px;padding:9px 20px}.hud .bgb.ghost2{background:#fff;color:var(--ink2,#555);box-shadow:0 3px 0 #d9d2bf;border:2px solid #eee4cf}'
      + '.bgbub{position:absolute;z-index:3;left:50%;transform:translateX(-50%);max-width:min(340px,calc(100% - 40px));padding:8px 16px;border-radius:16px;background:#fffdf7;border:2px solid #fff;box-shadow:0 8px 20px -10px rgba(80,40,0,.55);font-weight:900;font-size:14px;color:var(--ink2,#4a4f66);text-align:center;line-height:1.35;pointer-events:none;opacity:0;transition:opacity .2s}.bgbub.on{opacity:1}'
      + '.bgbub::after{content:"";position:absolute;left:50%;margin-left:-8px;border:8px solid transparent}.bgbub.up::after{top:100%;border-top-color:#fffdf7}.bgbub.dn::after{bottom:100%;border-bottom-color:#fffdf7}'
      // the turned page (portrait phone, board sideways): bar along the left edge, buttons in the corners, all read in landscape
      // landscape views: everything in one slim column at the landscape right — やめる at the top, the HUD (the hint just above it) below; nothing on the left
      + '.bv.land .hud,.bv.playing.land .hud,.bv.bgwide .hud,.bv.playing.bgwide .hud{flex-direction:column;gap:6px;padding:7px 5px;border-radius:24px;max-width:none}'
      + '.hud .hs.col{flex-direction:column;gap:1px;padding:5px 7px;font-size:10.5px;line-height:1.1}.hud .hs.col b{font-size:17px;min-width:0}.hud .hs.col .r{display:flex;align-items:center;gap:4px}.hud .hs.col .bgk{width:14px;height:14px}'
      + '.hud .bgb.bgun{background:#36b4ff;color:#fff;box-shadow:0 3px 0 #1f86c4;border:0}.hud .bgb.bgok{background:#1ea36c;color:#fff;box-shadow:0 3px 0 #13764d;border:0}.hud .bgb svg{display:block}.hud .bgb.ic{opacity:1!important}'
      + '.hud .bgm.col{flex-direction:column;gap:7px}.hud .bgb.ic.ic{width:46px;height:46px;padding:0;border-radius:50%;font-size:21px}'
      + '.bv.land .hud,.bv.playing.land .hud{left:calc(50% - 22px);top:calc(100% - 8px - env(safe-area-inset-bottom));bottom:auto;right:auto;transform-origin:0 0;transform:rotate(90deg) translate(-100%,-50%)}'
      + '.bv.land .quit{inset-inline-start:auto;inset-inline-end:auto;left:calc(100% - 8px - env(safe-area-inset-right));right:auto;top:calc(100% - 45px - env(safe-area-inset-bottom));transform-origin:0 0;transform:rotate(90deg) translate(-50%,0)}'
      + '.bv.land .x{inset-inline-start:auto;inset-inline-end:auto;left:calc(100% - 8px - env(safe-area-inset-right));right:auto;top:calc(100% - 45px - env(safe-area-inset-bottom));transform-origin:0 0;transform:rotate(90deg) translate(-50%,0)}'
      + '.bv.land .bgbub{right:auto;bottom:auto;transform-origin:0 0;transform:rotate(90deg) translate(-50%,-100%)}'
      + '.bv.bgwide .hud,.bv.playing.bgwide .hud{top:calc(50% + 22px);bottom:auto;left:auto;right:calc(8px + env(safe-area-inset-right));transform:translateY(-50%)}'
      + '.bv.bgwide .quit{inset-inline-start:auto;inset-inline-end:auto;left:auto;right:calc(45px + env(safe-area-inset-right));top:calc(8px + env(safe-area-inset-top));bottom:auto;transform:translateX(50%)}.bv.bgwide .x{inset-inline-start:auto;inset-inline-end:auto;left:auto;right:calc(45px + env(safe-area-inset-right));top:calc(8px + env(safe-area-inset-top));transform:translateX(50%)}'
      + '.bv.bgwide .bgbub{right:auto;top:auto;transform:translateX(-50%)}.bv.land .bgbub,.bv.bgwide .bgbub{font-size:12px;padding:6px 9px;border-radius:12px;width:max-content;max-width:120px}'
      + '.bv.land .endc{transform:translate(-50%,-50%) rotate(90deg);max-width:calc(100vh - 40px)}.bv.land .endc h3{white-space:nowrap}.bv.land .endc.on{animation:bgpopL .4s cubic-bezier(.3,1.5,.5,1)}@keyframes bgpopL{from{transform:translate(-50%,-50%) rotate(90deg) scale(.7);opacity:0}}'
      // the portal's phone-landscape layout (#bv.pland): roll / undo / done on the board, in the half where the dice fall (as the full game's .bbtn)
      + '.bgbb{position:absolute;z-index:3;display:none;gap:calc(var(--u,40px) * .18);transform:translate(-50%,-50%);flex-wrap:nowrap}.bv.pland .bgbb.on{display:flex}'
      + '.bgbb .bbtn{padding:calc(var(--u,40px) * .16) calc(var(--u,40px) * .3);min-width:calc(var(--u,40px) * 1.7);border-radius:99px;font:900 max(12px,calc(var(--u,40px) * .3)) var(--font,sans-serif);letter-spacing:.06em;white-space:nowrap;background:rgba(255,253,247,.95);color:#2b3044;border:2px solid #fff;box-shadow:0 4px 0 rgba(150,110,50,.45),0 10px 22px rgba(0,0,0,.3);cursor:pointer}'
      + '.bv.pland .hud .bgs{display:flex;gap:4px;margin-inline-end:3px!important}.bgsb{height:24px;display:flex;align-items:center;gap:3px;padding:0 9px 0 6px;border-radius:99px;border:0;background:#36b4ff;color:#fff;font:900 11.5px var(--font,sans-serif);box-shadow:0 2px 0 #1f86c4;cursor:pointer;white-space:nowrap}.bgsb svg{width:13px;height:13px}'
      + '.bgbb .bbtn.go{background:#ff5d5d;color:#fff;border-color:transparent;box-shadow:0 4px 0 #d93c3c,0 10px 22px rgba(0,0,0,.3)}.bgbb .bbtn:active{transform:translateY(2px)}'
      + '@media (max-width:560px){.hud .bgb{padding:7px 10px;font-size:13px}.hud .bgb.go{font-size:14px;padding:8px 12px}.hud .bgm{gap:5px}.bgbub{font-size:13px;padding:7px 13px}}';
    document.head.appendChild(css);
    const host = ctx.el.parentNode || document.body, bub = document.createElement('div'); bub.className = 'bgbub'; host.appendChild(bub);
    const bbt = document.createElement('div'); bbt.className = 'bgbb'; host.appendChild(bbt);
    function placeBB() {   // the on-board buttons: centred on the roller's half of the board (the full game's setButtons)
      if (stopped || !isPL() || !bbt.innerHTML) return;
      const hr = host.getBoundingClientRect(), side = toMove === 1 ? 1 : 0;
      const a = FR.toCur(halfX(side), Y, 0), q = T3.project(a.x, a.z, a.y), l = FR.toCur(-W2, Y, 0), r = FR.toCur(W2, Y, 0), ql = T3.project(l.x, l.z, l.y), qr = T3.project(r.x, r.z, r.y);
      bbt.style.left = (q.x - hr.left) + 'px'; bbt.style.top = (q.y - hr.top) + 'px'; bbt.style.setProperty('--u', ((qr.x - ql.x) / g.W).toFixed(1) + 'px');
    }
    const bbIv = setInterval(placeBB, 400);   // (the camera eases into its framing after every layout change)
    function placeBub() {   // above the bar when it sits at the bottom (phones), below it when it is at the top (PC)
      if (stopped) return;
      const h = document.getElementById('hud'); if (!h || !bub.textContent) { bub.classList.remove('on'); return; }
      const wide = bvEl && bvEl.classList.contains('bgwide');
      if (turned || wide) {   // a landscape view: just above the HUD column (landscape), its tail pointing down at it
        bub.classList.remove('dn', 'lt'); bub.classList.add('up', 'on'); bub.style.maxWidth = '';
        const r = h.getBoundingClientRect(), hr = host.getBoundingClientRect(), bw = bub.offsetWidth;
        if (turned) {   // landscape up = screen right; the column's centre line = its screen y centre
          const c = Math.max(6 + bw / 2, Math.min(r.top + r.height / 2 - hr.top, hr.height - 6 - bw / 2));
          bub.style.left = (r.right - hr.left + 10) + 'px'; bub.style.top = c + 'px'; bub.style.bottom = '';
        } else {
          const c = Math.max(6 + bw / 2, Math.min(r.left + r.width / 2 - hr.left, hr.width - 6 - bw / 2));
          bub.style.left = c + 'px'; bub.style.top = ''; bub.style.bottom = (hr.bottom - r.top + 10) + 'px';
        }
        return;
      }
      bub.style.left = ''; bub.style.maxWidth = '';
      const t0 = h.offsetTop, hh = h.offsetHeight, H = host.clientHeight, up = t0 + hh / 2 > H / 2;   // layout box (the bar slides in with a transform)
      bub.classList.toggle('up', up); bub.classList.toggle('dn', !up);
      bub.style.top = up ? '' : (t0 + hh + 12) + 'px'; bub.style.bottom = up ? (H - t0 + 12) + 'px' : '';
      bub.classList.add('on');
    }
    const placeLater = () => { placeBub(); placeBB(); later(() => { placeBub(); placeBB(); }, 520); };
    addEventListener('resize', placeLater);
    function say(m) { msg = PZ ? '' : m || ''; hud(); }
    function hud() {
      if (stopped) return;
      const P = T ? T.pos : pos, pips = s => P && window.BG ? BG.pips(P, s) : 167;
      const dot = s => `<i class="bgk" style="background:${DOT[CID[s]] || DOT.gold}"></i>`;
      const side = s => colUI ? `<span class="hs col ${toMove === s ? 'on' : ''}">${pname(s)}<span class="r">${dot(s)}<b>${pips(s)}</b></span></span>`
        : `<span class="hs ${toMove === s ? 'on' : ''}">${dot(s)}${pname(s)}<b>${pips(s)}</b></span>`;
      // clear, high-contrast icons (font glyphs like ↶ ✓ render thin / pale on phones)
      const ICU = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';
      const ICK = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7"/></svg>';
      const btn = (a, cls, ic, lb) => colUI ? `<button type="button" class="btn bgb ic ${cls}" data-bgt="${a}" title="${lb}" aria-label="${lb}">${ic}</button>` : `<button type="button" class="btn bgb ${cls}" data-bgt="${a}">${ic} ${lb}</button>`;
      const b = []; let m = msg;
      if (PVP && toMove >= 0 && (m === L.tapCk || m === L.tapDest)) m = `<b>${cname(toMove)}</b> · ${m}`;   // two players: whose move it is
      if (isPL()) {   // phone held sideways: the full game's landscape row — player chips, a status line (the AI's last move · the prompt), buttons on the board
        const nm = s => PVP ? cname(s) : s ? `${L.ai} Lv${level}` : L.you, chip = s => `<span class="hs ${toMove === s ? 'on' : ''}">${dot(s)}${nm(s)}<b>${pips(s)}</b></span>`;
        const bb = (a, cls, lb) => `<button type="button" class="bbtn ${cls}" data-bgt="${a}">${lb}</button>`, sb = [];
        if (phase === 'roll') { b.push(bb('roll', 'go', L.roll)); if (!m) m = PVP ? L.turnC.replace('{c}', cname(toMove)) : L.turn; }
        else if (phase === 'move' && T && !busy) {
          const done = !legalNow().length;
          if (T.steps.length) sb.push(`<button type="button" class="bgsb" data-bgt="undo">${ICU}${L.undo}</button>`);   // (a step back: a small pill at the end of the status line)
          if (done) { b.push(bb('ok', 'go', L.ok)); m = ''; }
        }
        if (!m && phase === 'ai') m = L.think;
        if (!m && phase === 'move' && !PVP) m = L.turn;
        const st = (!PVP && lastAI ? esc(lastAI) + (m ? ' · ' : '') : '') + (m || '');
        ctx.hud(`${chip(0)}<span class="hm">${st}</span>${sb.length ? `<span class="bgs">${sb.join('')}</span>` : ''}${chip(1)}`);
        const bh = b.join(''); if (bbt.innerHTML !== bh) bbt.innerHTML = bh;
        bbt.classList.toggle('on', !!bh); placeBB(); bub.classList.remove('on'); return;
      }
      bbt.classList.remove('on');
      if (phase === 'roll') { b.push(btn('roll', 'go', '🎲', L.roll)); if (!PVP) m = ''; }
      else if (phase === 'move' && T && !busy) {
        const done = !legalNow().length;
        if (T.steps.length) b.push(btn('undo', 'bgun', colUI ? ICU : '↶', L.undo));
        if (done) { b.push(btn('ok', 'go bgok', colUI ? ICK : '✓', L.ok)); m = ''; }
      }
      ctx.hud(`${side(0)}${b.length ? `<span class="bgm${colUI ? ' col' : ''}">${b.join('')}</span>` : ''}${side(1)}`);
      if (bub.innerHTML !== m) { bub.innerHTML = m; placeLater(); } else placeBub();   // (the bar's width changes with its buttons)
    }
    function onHud(e) {
      const b = e.target.closest && e.target.closest('[data-bgt]'); if (!b || stopped) return;
      e.stopPropagation();
      const a = b.dataset.bgt;
      if (a === 'roll') humanRoll(); else if (a === 'undo') undo(); else if (a === 'ok') commit();
    }
    document.addEventListener('click', onHud, true);

    /* ---------- taps on the board ---------- */
    function hitOf(e) {   // which point / bar / tray was tapped → your engine numbering (25 bar, 0 tray)
      const p0 = T3.pick(e, Y * SC); if (!p0) return null;
      const p = FR.toBoard(p0), ux = p.x + W2, uy = p.z + H2;
      if (uy < g.TOP - .5 || uy > g.BOT + .5) return null;
      if (ux >= g.TX - .15 && ux <= g.TX + g.TW + .3) return 0;
      if (ux >= g.BX && ux < g.RX) return 25;
      const top = uy < g.MID;
      if (ux >= g.LX && ux < g.BX) { const col = Math.floor(ux - g.LX); return top ? 13 + col : 12 - col; }
      if (ux >= g.RX && ux < g.RE) { const col = Math.floor(ux - g.RX); return top ? 19 + col : 6 - col; }
      return null;
    }
    function onClick(e) {
      if (stopped || T3.wasDrag()) return;
      if (phase === 'roll') { humanRoll(); return; }   // tapping the board rolls too
      if (phase !== 'move' || busy || !T) return;
      const q0 = hitOf(e), q = q0 === null || q0 === 0 || q0 === 25 || !T.side ? q0 : 25 - q0;   // (side 1: its own numbering)
      if (sel !== null && q !== null && dests && dests.has(q)) { doPath(dests.get(q)); return; }
      const srcs = new Set(legalNow().map(x => x.from));
      if (q !== null && q !== 0 && srcs.has(q) && q !== sel) select(q);
      else if (srcs.size) { showSources(); say(L.tapCk); }
    }
    ctx.el.addEventListener('click', onClick);

    /* ---------- go ---------- */
    ready = true;
    if (!PZ) setBoard();
    const cube = M3.cube(64); cube.position.set(g.BX + g.B / 2 - W2, M3.FY + M3.RH + .43, 0); cube.rotation.y = .1; board.add(cube); T3.kick(400);   // decoration: no doubling in table play
    say('');
    (async () => {
      try { await loadBG(); } catch (e) { say('…'); return; }
      if (stopped) return;
      if (PZ) { pzBoot(); return; }
      if (!PVP) ask({ type: 'eval', pos: Array.from(BG.initial()), side: 0 });   // starts the worker now: nets + bear-off database load while you roll
      pos = BG.initial(); seed = BG.randomSeed(); stream = new BG.DiceStream(seed, 0); hud();
      await sleep(900 + 30 * 14);
      // the opening roll: one die each; the higher one starts and plays both
      let d = nextRoll(); if (!PVP && (ctx.side === 1 || ctx.side === 2) && (d[0] > d[1] ? 0 : 1) !== (ctx.side === 2 ? 1 : 0)) d = [d[1], d[0]];   // 手番: the chosen starter's die is the higher
      await throwDice([{ id: CID[0], v: d[0], x: halfX(0), y: Y + .4, z: 0, size: .8, dir: 1 }, { id: CID[1], v: d[1], x: halfX(1), y: Y + .4, z: 0, size: .8, dir: -1 }]);
      if (stopped) return;
      const s = d[0] > d[1] ? 0 : 1; toMove = s;
      say(`${PVP ? L.firstC.replace('{c}', cname(s)) : s ? L.aiFirst : L.youFirst} ${d[0]}–${d[1]}`);
      await sleep(1300); if (stopped) return;
      const sp = diceSpots(2, s), p0 = dice.map(o => o.position.clone());   // both dice slide over to the starter
      await animP(380, k => dice.forEach((o, i) => { o.position.set(p0[i].x + (sp[i].x - p0[i].x) * io(k), p0[i].y + Math.sin(k * Math.PI) * .5, p0[i].z + (sp[i].z - p0[i].z) * io(k)); }));
      if (stopped) return;
      if (s === 0 || PVP) { say(''); turnOn(s); beginMove(d, s); } else aiTurn(d);
    })();

    /* ---------- 待った · 投了 · ヒント · time-out (the portal's action bar) ---------- */
    function rebuildCks() {   // the checkers exactly as `pos` says (after 待った)
      cks.forEach(c => board.remove(c.m)); cks = [];
      for (const side of [0, 1]) for (let p = 0; p <= 25; p++) for (let i = 0; i < pos[side * 26 + p]; i++) cks.push({ side, at: locOf(side, p), m: mk(side) });
      restack(); cks.forEach(c => { place(c); shadow(c); }); T3.kick(300);
    }
    function drawHint() {   // the best play's remaining steps: a glowing ring on each checker to move, its landing spot lit
      if (!hintPlay || !T) return;
      hintPlay.forEach((st, i) => {
        const fl = locOf(T.side, st.from), c = topOf(T.side, fl);
        if (c) popIn(ring(c.m.position.x, c.m.position.y + M3.CK_H + .04, c.m.position.z, 0xff7a1a), 1.25);
        const at = locOf(T.side, st.to), [x, z] = landXZ(T.side, at);
        if (st.to === 0) trayGlow(T.side); else glowPt(at, 0xffb03a, .5);
        const sp = numSprite(i + 1); sp.position.set(x, Y + .8, z); marks.add(sp); popIn(sp, .5);
      });
      T3.kick(300);
    }
    function finish(loser, why) {   // resign / time-out: engine side `loser` loses (a single game, or the gammon / backgammon already obvious)
      if (over || !pos) return;
      const P = T ? T.pos : pos, w = 1 - loser, kind = P[loser * 26] === 0 && P[w * 26] > 0 && BG.allHome(P, w) ? BG.winKind(P, w) : 1;
      over = true; phase = 'over'; toMove = -1; T = null; hintPlay = null; hintJ++; busy = false; drop(); clearMarks(); if (ctx.onTurn) ctx.onTurn(-1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned'), kt = L['k' + Math.min(3, kind)];
      SFX.chime();
      if (PVP) { const wt = L.winC.replace('{c}', cname(w)); say(wt); return ctx.onEnd({ win: false, draw: false, level, score: t('act.pvpEnd', { p: cname(loser), r, w: wt }) + ' · ' + kt, pvp: true, winnerText: wt }); }
      say(L.lose + ' · ' + r); ctx.onEnd({ win: false, draw: false, level, score: r + ' · ' + kt });
    }

    /* ---------- puzzle / lesson mode (ctx.pz, 2026-11-14): a position and a roll from backgammon/puzzles.json · lessons.json ·
       openings.json; you play side 0 (the caller turns a side-1 problem round). Each step goes to ctx.pz.step (return false: an
       obvious mistake — the play stops there); the finished play to ctx.pz.moved({ key, steps, pos }). No AI, no roll button.
       Marks: rings on the checkers to move, arrows of a play (codes as backgammon/bg.js apply() returns them) from the start. ---------- */
    const decPos = str => { const q = new Int8Array(52); for (let i = 0; i < 52; i++) q[i] = parseInt(String(str)[i], 16) || 0; return q; };
    let pzJob = 0;
    const pzMk = new TH.Group(); board.add(pzMk);
    const PZC = { ok: 0x2fd17a, ng: 0xff3b30, hl: 0xffb21a, ring: 0x2fa8ff };   // (the hint's rings blue: the movable checkers already wear gold ones)
    function pzClear() { pzMk.children.slice().forEach(o => { if (o.geometry && o.userData.own) o.geometry.dispose(); pzMk.remove(o); }); T3.kick(150); }
    function pzLoad(o) {
      o = o || {}; PZ.cur = o; const j = ++pzJob;
      timers.forEach(clearTimeout); timers = []; hintPlay = null; hintJ++; drop(); clearMarks(); pzClear(); clearDice(); busy = false; over = false; sel = null; dests = null;
      pos = typeof o.pos === 'string' ? decPos(o.pos) : Int8Array.from(o.pos || BG.initial()); T = null; phase = 'lock'; toMove = 0;
      rebuildCks();
      const d = o.dice && o.dice.length === 2 ? o.dice.slice() : null;
      (async () => {
        if (d) { await rollFor(0, d); if (stopped || j !== pzJob) return;
          T = { side: 0, dice: d, left: d[0] === d[1] ? [d[0], d[0], d[0], d[0]] : d.slice(), steps: [], pos: pos.slice(), start: pos.slice(), plays: BG.genPlays(pos, 0, d[0], d[1]) }; }
        else { await sleep(300); if (stopped || j !== pzJob) return; }   // (no roll: still after the caller has set itself up)
        hud(); if (PZ.ready) PZ.ready();
      })();
    }
    function pzWait() { if (!T || PZ.cur && PZ.cur.lock) return; T.pzReport = T.steps.length; phase = 'move'; afterStep(); }
    function pzReset() {   // back to the start of the roll (the checkers as they were, every die unused)
      if (!T) return; hintJ++; drop(); clearMarks();
      pos = T.start.slice(); T.pos = T.start.slice(); T.steps = []; T.left = T.dice[0] === T.dice[1] ? [T.dice[0], T.dice[0], T.dice[0], T.dice[0]] : T.dice.slice(); T.pzReport = 0;
      rebuildCks(); dimDice(T.left); phase = 'lock'; T3.kick(300);
    }
    async function pzPlay(codes) {   // a play shown for you (the answer, a study line): one checker after another
      if (!T) return false; phase = 'lock'; busy = true; drop(); clearMarks();
      for (const c of codes) {
        if (stopped || !T) return false;
        const from = BG.mvFrom(c), to = BG.mvTo(c), die = from - to;
        await stepAnim(0, from, to, false); if (stopped || !T) return false;
        const q = T.pos.slice(), code = BG.apply(q, 0, from, to); T.pos = q; T.steps.push({ code, die, from, to, hit: BG.mvHit(code) });
        let i = T.left.indexOf(die); if (i < 0) i = T.left.indexOf(Math.min(...T.left.filter(v => v > die))); if (i >= 0) T.left.splice(i, 1);
        dimDice(T.left); await sleep(180);
      }
      busy = false; T.pzReport = T.steps.length; pos = T.pos.slice(); return true;
    }
    function ptXZ(p, q) {   // where engine point p (side 0) is on the board: the middle of its stack (the bar, the tray too)
      const at = locOf(0, p); if (p === 25) return [g.BX + g.B / 2 - W2, g.MID - 1.6 - H2];
      if (p === 0) return [g.TX + g.TW / 2 - W2, g.BOT - 1.4 - H2];
      const n = Math.max(1, (q || pos)[p] || 1), [x, z] = stackXZ(at, Math.min(n - 1, 2), Math.max(n, 3)); return [x, z];
    }
    function pzArrow(a, b, col, lift) {
      const mat = new TH.MeshBasicMaterial({ color: col, transparent: true, opacity: .92, toneMapped: false, depthWrite: false });
      const [ax, az] = a, [bx, bz] = b, dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz); if (len < .05) return;
      const ang = Math.atan2(dx, dz), head = .5, L = Math.max(.05, len - head - .1), y = Y + M3.CK_H * 3 + .06 + (lift || 0);
      const sg = new TH.BoxGeometry(.18, .012, L), sh = new TH.Mesh(sg, mat); sh.userData.own = true; sh.position.set(ax + Math.sin(ang) * L / 2, y, az + Math.cos(ang) * L / 2); sh.rotation.y = ang; sh.renderOrder = 6; pzMk.add(sh);
      const tri = new TH.Shape(); tri.moveTo(-.3, 0); tri.lineTo(.3, 0); tri.lineTo(0, head); tri.lineTo(-.3, 0);
      const hg = new TH.ShapeGeometry(tri); hg.rotateX(-Math.PI / 2); hg.rotateY(Math.PI);
      const hm = new TH.Mesh(hg, mat); hm.userData.own = true; hm.position.set(ax + Math.sin(ang) * L, y + .004, az + Math.cos(ang) * L); hm.rotation.y = ang; hm.renderOrder = 6; pzMk.add(hm);
    }
    // marks: null clears · [{ from: point, cls }] rings on the checkers to move · { play: [codes], cls: 'ok' | 'ng' } a play's arrows ·
    // { pt: point, cls } a point lit
    function pzMark0(e) { const c = topOf(0, locOf(0, e.from)); if (c) { const r = ring(c.m.position.x, c.m.position.y + M3.CK_H + .04, c.m.position.z, PZC[e.cls] != null ? PZC[e.cls] : PZC.ring); pzMk.add(r); popIn(r, 1.25); } }   // (in the puzzle's own group: the play's rings and glows come and go without them)
    function pzMark(list) {
      pzClear(); if (!list) return;
      const start = T ? T.start : pos;
      const dec = m => { const q = start.slice(), out = []; for (let i = 0; i + 1 < m.length; i += 2) out.push(BG.apply(q, 0, m.charCodeAt(i) - 65, m.charCodeAt(i + 1) - 65)); return out; };   // (a play as the json writes it: letter pairs from → to)
      for (let e of [].concat(list)) {
        if (!e) continue;
        if (typeof e.m === 'string') e = Object.assign({}, e, { play: dec(e.m) });
        if (typeof e.froms === 'string') { [...new Set(dec(e.froms).map(c => BG.mvFrom(c)))].forEach(f => pzMark0({ from: f, cls: e.cls })); continue; }
        const col = PZC[e.cls] != null ? PZC[e.cls] : PZC.ring;
        if (e.play) { const q = start.slice(); e.play.forEach((c, i) => { const f = BG.mvFrom(c), t2 = BG.mvTo(c), a = ptXZ(f, q); BG.apply(q, 0, f, t2); pzArrow(a, ptXZ(t2, q), col, (e.cls === 'ng' ? .03 : 0) + i * .004); }); continue; }
        if (e.from != null) { pzMark0(e); continue; }
        if (e.pt != null && e.pt > 0 && e.pt < 25) pzMk.add(glowPt(locOf(0, e.pt), col, .5));
      }
      T3.kick(400);
    }
    function pzBoot() { if (PZ.bg) pzLoad(PZ.bg); else { pos = BG.initial(); rebuildCks(); hud(); if (PZ.ready) PZ.ready(); } }
    const pzApi = {
      load: o => pzLoad(o), wait: pzWait, lock() { phase = 'lock'; clearMarks(); }, reset: pzReset, play: pzPlay, mark: pzMark,
      pos: () => (T ? T.pos : pos) ? Array.from(T ? T.pos : pos) : null, start: () => T ? Array.from(T.start) : pos ? Array.from(pos) : null,
      turn: () => T ? { dice: T.dice.slice(), left: T.left.slice(), steps: T.steps.map(x => x.code) } : null,
      moves: () => T ? T.steps.map(x => x.code) : [], undo: () => pzReset(), state: () => ({ over: false, n: T ? T.steps.length : 0 }),
    };
    const api = {
      human: 0, pz: PZ ? pzApi : null,
      // 待った (the bar): when it is your turn to roll, the whole last turn pair (yours + the AI's) goes back; you play that roll again
      // (also right after a roll, before any step: one more turn pair back)
      canUndo: () => !stopped && !over && !busy && (PVP || toMove === 0) && (phase === 'roll' ? hist.length > 0 : phase === 'move' && !!T && !T.steps.length && hist.length > 1),
      undo() {
        if (!api.canUndo()) return;
        if (phase === 'move') hist.pop();   // this turn's own snapshot
        const h = hist.pop(); hintPlay = null; hintJ++;
        pos = Int8Array.from(h.pos); T = null; sel = null; dests = null; drop(); clearMarks(); clearDice(); rebuildCks();
        toMove = h.side; phase = 'anim'; say(''); turnOn(h.side);
        rollFor(h.side, h.dice).then(() => { if (!stopped && !over) beginMove(h.dice, h.side); });
      },
      canHint: () => !stopped && !over && !busy && phase === 'move' && !!T && legalNow().length > 0,
      hint() {
        if (!api.canHint()) return Promise.resolve(false);
        const j = ++hintJ, T0 = T, made = T.steps.map(x => x.from + ':' + x.to);
        return ask({ type: 'analyze', pos: Array.from(T.start), side: T.side, dice: T.dice, ply: 1, keep: 8, max: 12, time: 1200 }).then(r => {
          if (stopped || j !== hintJ || T !== T0 || T.steps.length !== made.length) return true;
          const list = (r && r.list) || [];
          for (const e of list) {   // the best play that still fits the steps already made
            const rest = e.moves.map(c => BG.mvFrom(c) + ':' + BG.mvTo(c)), ok = made.every(k => { const i = rest.indexOf(k); if (i < 0) return false; rest.splice(i, 1); return true; });
            if (ok && rest.length) { hintPlay = rest.map(k => { const [from, to] = k.split(':').map(Number); return { from, to }; }); showSources(); say(L.tapCk); return true; }
          }
          return false;
        });
      },
      canResign: () => !stopped && !over && !!pos,
      resign() { if (!over && pos) finish(PVP ? (toMove >= 0 ? toMove : 0) : 0, 'resign'); },
      timeout(side) { finish(side, 'time'); },
      stop() {
        stopped = true; timers.forEach(clearTimeout); timers = [];
        ctx.el.removeEventListener('click', onClick); document.removeEventListener('click', onHud, true);
        if (worker) worker.terminate(); worker = null; jobs.clear(); css.remove(); bub.remove(); bbt.remove(); clearInterval(bbIv); counts(); if (bvEl) bvEl.classList.remove('land', 'bgwide'); removeEventListener('resize', placeLater); FR.stop();
      },
      _debug: { hint: () => hintPlay, hist: () => hist.length, marks: () => marks.children.length, hit: (x, y) => hitOf({ clientX: x, clientY: y }), st: () => ({ phase, busy, toMove, over, sel, pos: pos && Array.from(pos), T: T && { side: T.side, left: T.left.slice(), steps: T.steps.length, legal: legalNow(), pos: Array.from(T.pos) }, dests: dests && [...dests.keys()] }),
        pt: p => { const sd = T ? T.side : 0, at = locOf(sd, p), c = topOf(sd, at); const [x, z] = c && p !== 0 ? [c.m.position.x, c.m.position.z] : landXZ(sd, at); const v = FR.toCur(x, Y, z); return T3.project(v.x, v.z, v.y); },
        dst: p => { const sd = T ? T.side : 0, [x, z] = landXZ(sd, locOf(sd, p)); const v = FR.toCur(x, Y, z); return T3.project(v.x, v.z, v.y); } },
    };
    window.__bgTable = api;   // (tests)
    return api;
  }
  const LVN = {"ja":[["入門","初級","初級+","中級","中級+","上級","上級+","達人","名人","最強"],["でたらめに動かす","大きな見落としが多い","ときどき見落とす","少しミスをする","小さなミス","まれに小さなミス","ニューラルネットの最善手","相手の全ダイスを1手読む","2手読み","2手読み（広く深く）・キューブも最強"]],"en":[["Beginner","Novice","Novice+","Intermediate","Intermediate+","Advanced","Advanced+","Expert","Master","Strongest"],["moves at random","makes big mistakes","misses things now and then","makes some errors","small errors","rare small slips","neural-net best play","looks at every reply roll","2-ply search","wide 2-ply search, strongest cube"]],"zh":[["入门","初级","初级+","中级","中级+","高级","高级+","达人","名人","最强"],["随机走子","经常大失误","偶尔漏看","有些失误","小失误","偶有小失误","神经网络最佳着","考虑对手每种骰子","2层搜索","宽幅2层搜索・最强加倍判断"]],"ko":[["입문","초급","초급+","중급","중급+","상급","상급+","달인","명인","최강"],["무작위로 움직임","큰 실수가 많음","가끔 놓침","약간 실수함","작은 실수","드물게 작은 실수","신경망 최선수","상대의 모든 주사위를 읽음","2수 탐색","넓은 2수 탐색・최강 큐브 판단"]],"es":[["Principiante","Novato","Novato+","Intermedio","Intermedio+","Avanzado","Avanzado+","Experto","Maestro","Máximo"],["mueve al azar","comete grandes errores","a veces se le escapa algo","comete algunos errores","pequeños errores","rara vez se equivoca","mejor jugada de la red neuronal","mira todas las tiradas de respuesta","búsqueda a 2 niveles","búsqueda amplia a 2 niveles, mejor cubo"]],"fr":[["Débutant","Novice","Novice+","Intermédiaire","Intermédiaire+","Avancé","Avancé+","Expert","Maître","Maximum"],["joue au hasard","grosses erreurs","rate des choses parfois","quelques erreurs","petites erreurs","rares petites erreurs","meilleur coup du réseau neuronal","examine chaque lancer adverse","recherche à 2 niveaux","recherche large à 2 niveaux, meilleur videau"]],"pt":[["Iniciante","Novato","Novato+","Intermediário","Intermediário+","Avançado","Avançado+","Especialista","Mestre","Máximo"],["joga ao acaso","comete erros grandes","às vezes deixa passar","comete alguns erros","erros pequenos","raros erros pequenos","melhor lance da rede neural","considera cada rolagem de resposta","busca de 2 níveis","busca ampla de 2 níveis, melhor cubo"]],"de":[["Einsteiger","Anfänger","Anfänger+","Mittel","Mittel+","Fortgeschritten","Fortgeschritten+","Experte","Meister","Stärkste"],["zieht zufällig","macht grobe Fehler","übersieht manchmal etwas","macht einige Fehler","kleine Fehler","seltene kleine Fehler","bester Zug des neuronalen Netzes","prüft jeden Antwortwurf","2-Ply-Suche","breite 2-Ply-Suche, stärkster Würfel"]],"hi":[["शुरुआती","नौसिखिया","नौसिखिया+","मध्यम","मध्यम+","उन्नत","उन्नत+","विशेषज्ञ","मास्टर","सबसे मज़बूत"],["बेतरतीब चलता है","बड़ी गलतियाँ करता है","कभी-कभी चूक जाता है","कुछ गलतियाँ","छोटी गलतियाँ","कभी-कभार छोटी गलती","न्यूरल नेट की सर्वश्रेष्ठ चाल","हर जवाबी पासे को देखता है","2-स्तरीय खोज","चौड़ी 2-स्तरीय खोज, सबसे मज़बूत क्यूब"]],"ar":[["مبتدئ","مستجد","مستجد+","متوسط","متوسط+","متقدم","متقدم+","خبير","أستاذ","الأقوى"],["يتحرك عشوائيًا","يرتكب أخطاء كبيرة","يفوته شيء أحيانًا","يرتكب بعض الأخطاء","أخطاء صغيرة","أخطاء صغيرة نادرة","أفضل نقلة للشبكة العصبية","يفحص كل رمية رد","بحث بمستويين","بحث واسع بمستويين وأقوى قرار مكعب"]], "ru": [['Начальный', 'Новичок', 'Новичок+', 'Средний', 'Средний+', 'Продвинутый', 'Продвинутый+', 'Эксперт', 'Мастер', 'Сильнейший'], ['ходит случайно', 'делает грубые ошибки', 'иногда упускает', 'порой ошибается', 'мелкие ошибки', 'редкие мелкие промахи', 'лучший ход нейросети', 'смотрит каждый ответный бросок', 'поиск на 2 хода', 'широкий поиск на 2 хода, сильнейший куб']], "zh-TW": [['入門', '初級', '初級+', '中級', '中級+', '高級', '高級+', '最高級', '大師', '最強'], ['隨機走', '常犯大錯', '偶爾會漏看', '有些失誤', '小失誤', '罕見的小疏失', '神經網路最佳著', '考慮對手每種擲骰', '2層搜尋', '寬廣的2層搜尋，最強加倍判斷']], "id": [['Pemula', 'Dasar', 'Dasar+', 'Menengah', 'Menengah+', 'Mahir', 'Mahir+', 'Ahli', 'Master', 'Terkuat'], ['bergerak acak', 'membuat kesalahan besar', 'kadang melewatkan', 'beberapa kesalahan', 'kesalahan kecil', 'jarang keliru', 'langkah terbaik jaringan saraf', 'melihat setiap lemparan balasan', 'pencarian 2 lapis', 'pencarian 2 lapis luas, kubus terkuat']], "tr": [['Başlangıç', 'Acemi', 'Acemi+', 'Orta', 'Orta+', 'İleri', 'İleri+', 'Uzman', 'Usta', 'En güçlü'], ['rastgele oynar', 'büyük hatalar yapar', 'ara sıra kaçırır', 'bazı hatalar yapar', 'küçük hatalar', 'nadir küçük kaymalar', 'sinir ağının en iyi hamlesi', 'her cevap atışına bakar', '2 katmanlı arama', 'geniş 2 katmanlı arama, en güçlü zar küpü']]};
  const W = (a, b, c, d, e) => [a, a, b, b, c, c, d, d, e, e];
  const WHO = {
    ja: W('はじめての人に', 'ルールを覚えた人に', '少し慣れてきた人に', '上級者に', '最強レベル'),
    en: W('for first-timers', 'once you know the rules', 'getting the hang of it', 'for strong players', 'the very strongest'),
    zh: W('适合初次玩', '适合学会规则的人', '适合渐渐上手', '适合高手', '最强等级'),
    ko: W('처음 하는 사람에게', '규칙을 익힌 사람에게', '조금 익숙해진 사람에게', '상급자에게', '최강 레벨'),
    es: W('para principiantes', 'si ya sabes las reglas', 'si ya le vas pillando el truco', 'para jugadores fuertes', 'el más fuerte'),
    fr: W('pour débuter', 'si tu connais les règles', 'si tu prends le coup de main', 'pour les bons joueurs', 'le plus fort'),
    pt: W('para iniciantes', 'para quem já sabe as regras', 'para quem está pegando o jeito', 'para jogadores fortes', 'o mais forte'),
    de: W('für Einsteiger', 'wenn du die Regeln kennst', 'wenn du den Dreh raus hast', 'für starke Spieler', 'die stärkste Stufe'),
    hi: W('पहली बार खेलने वालों के लिए', 'नियम सीख चुके लोगों के लिए', 'जिन्हें आदत हो रही है उनके लिए', 'मज़बूत खिलाड़ियों के लिए', 'सबसे मज़बूत स्तर'),
    ar: W('لمن يلعب أول مرة', 'لمن تعلّم القواعد', 'لمن بدأ يعتاد اللعب', 'للاعبين الأقوياء', 'أقوى مستوى'),
    ru: W('для первой игры', 'когда знаете правила', 'когда освоились', 'для сильных игроков', 'самый сильный'),
    'zh-TW': W('給第一次玩的人', '懂規則之後', '漸漸上手時', '給高手', '最強'),
    id: W('untuk pemula', 'setelah tahu aturannya', 'mulai terbiasa', 'untuk pemain kuat', 'yang terkuat'),
    tr: W('ilk kez oynayanlar için', 'kuralları bilince', 'alışmaya başlayınca', 'güçlü oyuncular için', 'en güçlüsü'),
  };
  function levelInfo(n, lang) {   // n = 1..10 (the game's level)
    const L = LVN[lang] || LVN.en, Wh = WHO[lang] || WHO.en;
    return { name: L[0][n - 1], desc: L[1][n - 1], who: Wh[n - 1] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.backgammon = { levels: 10, sides: true, modes: ['ai', 'pvp'], table: true, land: 'pill', tableModes: ['ai', 'pvp'], clock: 'bg', levelInfo, start: tableStart };   // table: start() plays on the chabudai itself
})();
