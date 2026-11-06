/* =====================================================================
   Agon (Queen's Guard, London 1842) on the portal.
   · The board card (levels, sides, modes): Lv.1 … Lv.20, ratings = the game's RT_LV (agon/app.js).
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D table itself with the full game's rules and AI —
     ../agon/engine.js on the page (steps along a ring or one ring inwards, the queen alone on the throne, the
     sandwich capture, relocating captured pieces — the queen anywhere but the throne, guards to the edge —,
     the throne win, guards round an empty throne lose, threefold repetition, the move cap) and the same file
     as a Worker (levels 1..20), asked as agon/app.js asks it.
     Input as on the page: tap a piece, then a cell it can reach; a captured piece must be moved on first (tap it,
     then any lit cell — when only one is waiting it is picked for you).
     ctx.mode 'pvp': two players take turns on one device (White first, at the bottom).
     Board and pieces: atlas/models/agon.js — the board the player last chose on the full page (the 1842 London
     mahogany board by default, or the worn American folk-art panel).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../agon/', VER = '?v=3';   // same file / version as agon/index.html → shared cache
  let engP = null;
  function loadEngine() {
    if (window.AgonEngine) return Promise.resolve(window.AgonEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.AgonEngine ? res(window.AgonEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  const TX = {
    ja: { n: ['白', '黒'], turn: '{p}の番', win: '{p}の勝ち', stuck: 'その駒は動かせません', own: '自分の駒を選んでください', move: 'そこへは行けません', reloc: '取られた駒を置き直そう', relocQ: '取られた女王を置き直そう', throne: '女王が王座に、6人のガードがそろった', empty: '空の王座をガードで囲んでしまった', rep: '同じ局面が3回', cap: '手数の上限で引き分け', took: '捕獲！' },
    en: { n: ['White', 'Black'], turn: '{p} to move', win: '{p} wins', stuck: 'That piece cannot move', own: 'Pick one of your pieces', move: 'It cannot go there', reloc: 'Relocate your captured piece', relocQ: 'Relocate your captured queen', throne: 'Queen on the throne, six guards round her', empty: 'Six guards round an empty throne', rep: 'Threefold repetition', cap: 'Move limit: a draw', took: 'Captured!' },
    zh: { n: ['白方', '黑方'], turn: '轮到{p}', win: '{p}胜', stuck: '这枚棋子不能走', own: '请选择自己的棋子', move: '不能走到那里', reloc: '把被吃的棋子重新放置', relocQ: '把被吃的女王重新放置', throne: '女王登上王座，6名卫兵围成一圈', empty: '用卫兵围住了空王座', rep: '同一局面出现3次', cap: '步数上限：和棋', took: '吃子！' },
    ko: { n: ['백', '흑'], turn: '{p} 차례', win: '{p} 승리', stuck: '그 말은 움직일 수 없습니다', own: '자신의 말을 고르세요', move: '그곳으로는 갈 수 없습니다', reloc: '잡힌 말을 다시 놓으세요', relocQ: '잡힌 여왕을 다시 놓으세요', throne: '여왕이 왕좌에, 호위병 6개가 둘러쌌다', empty: '빈 왕좌를 호위병으로 둘러쌌다', rep: '같은 국면 3회', cap: '수 제한: 무승부', took: '잡았다!' },
    es: { n: ['Blancas', 'Negras'], turn: 'Turno: {p}', win: 'Ganan {p}', stuck: 'Esa pieza no puede moverse', own: 'Elige una de tus piezas', move: 'No puede ir ahí', reloc: 'Recoloca tu pieza capturada', relocQ: 'Recoloca tu reina capturada', throne: 'Reina en el trono y seis guardias alrededor', empty: 'Seis guardias alrededor de un trono vacío', rep: 'Triple repetición', cap: 'Límite de jugadas: tablas', took: '¡Captura!' },
    fr: { n: ['Blancs', 'Noirs'], turn: 'Trait : {p}', win: 'Victoire des {p}', stuck: 'Cette pièce ne peut pas bouger', own: 'Choisissez une de vos pièces', move: 'Impossible d’aller là', reloc: 'Replacez votre pièce capturée', relocQ: 'Replacez votre reine capturée', throne: 'La reine sur le trône, six gardes autour', empty: 'Six gardes autour d’un trône vide', rep: 'Triple répétition', cap: 'Limite de coups : nulle', took: 'Prise !' },
    pt: { n: ['Brancas', 'Pretas'], turn: 'Vez: {p}', win: 'Vitória das {p}', stuck: 'Essa peça não pode se mover', own: 'Escolha uma das suas peças', move: 'Ela não pode ir para lá', reloc: 'Recoloque sua peça capturada', relocQ: 'Recoloque sua rainha capturada', throne: 'Rainha no trono e seis guardas ao redor', empty: 'Seis guardas ao redor de um trono vazio', rep: 'Tripla repetição', cap: 'Limite de lances: empate', took: 'Captura!' },
    de: { n: ['Weiß', 'Schwarz'], turn: '{p} am Zug', win: '{p} gewinnt', stuck: 'Dieser Stein kann nicht ziehen', own: 'Wähle einen deiner Steine', move: 'Dorthin geht es nicht', reloc: 'Setze deinen geschlagenen Stein neu', relocQ: 'Setze deine geschlagene Königin neu', throne: 'Königin auf dem Thron, sechs Wachen um sie', empty: 'Sechs Wachen um einen leeren Thron', rep: 'Dreifache Wiederholung', cap: 'Zuglimit: Remis', took: 'Geschlagen!' },
    hi: { n: ['सफ़ेद', 'काला'], turn: '{p} की बारी', win: '{p} की जीत', stuck: 'यह मोहरा नहीं चल सकता', own: 'अपना कोई मोहरा चुनें', move: 'वहाँ नहीं जा सकते', reloc: 'पकड़ा गया मोहरा दोबारा रखें', relocQ: 'पकड़ी गई रानी दोबारा रखें', throne: 'रानी सिंहासन पर, छह रक्षक चारों ओर', empty: 'खाली सिंहासन को छह रक्षकों ने घेरा', rep: 'तीन बार एक ही स्थिति', cap: 'चाल सीमा: ड्रॉ', took: 'पकड़ लिया!' },
    ar: { n: ['الأبيض', 'الأسود'], turn: 'دور {p}', win: 'فوز {p}', stuck: 'هذه القطعة لا تستطيع الحركة', own: 'اختر إحدى قطعك', move: 'لا يمكن الذهاب إلى هناك', reloc: 'أعد وضع قطعتك المأسورة', relocQ: 'أعد وضع ملكتك المأسورة', throne: 'الملكة على العرش وحولها ستة حراس', empty: 'ستة حراس حول عرش فارغ', rep: 'تكرار ثلاثي', cap: 'حد النقلات: تعادل', took: 'أسر!' },
    ru: { n: ['Белые', 'Чёрные'], turn: 'Ход: {p}', win: '{p} побеждают', stuck: 'Эта фишка не может ходить', own: 'Выберите свою фишку', move: 'Туда нельзя', reloc: 'Переставьте взятую фишку', relocQ: 'Переставьте взятую королеву', throne: 'Королева на троне, вокруг шесть стражей', empty: 'Шесть стражей вокруг пустого трона', rep: 'Троекратное повторение', cap: 'Лимит ходов: ничья', took: 'Взято!' },
    'zh-TW': { n: ['白方', '黑方'], turn: '輪到{p}', win: '{p}獲勝', stuck: '這枚棋子不能移動', own: '請選擇自己的棋子', move: '不能走到那裡', reloc: '把被吃的棋子重新放置', relocQ: '把被吃的女王重新放置', throne: '女王坐上王座，6名護衛圍繞', empty: '6名護衛圍住了空王座', rep: '三次重複局面', cap: '達到步數上限：和局', took: '吃子！' },
    id: { n: ['Putih', 'Hitam'], turn: 'Giliran {p}', win: '{p} menang', stuck: 'Bidak itu tidak bisa bergerak', own: 'Pilih salah satu bidakmu', move: 'Tidak bisa ke sana', reloc: 'Pindahkan bidakmu yang ditangkap', relocQ: 'Pindahkan ratumu yang ditangkap', throne: 'Ratu di takhta, enam pengawal mengelilinginya', empty: 'Enam pengawal mengelilingi takhta kosong', rep: 'Pengulangan tiga kali', cap: 'Batas langkah: seri', took: 'Ditangkap!' },
    tr: { n: ['Beyaz', 'Siyah'], turn: 'Sıra: {p}', win: '{p} kazandı', stuck: 'Bu taş hareket edemez', own: 'Taşlarından birini seç', move: 'Oraya gidemez', reloc: 'Alınan taşını yeniden yerleştir', relocQ: 'Alınan kraliçeni yeniden yerleştir', throne: 'Kraliçe tahtta, çevresinde altı muhafız', empty: 'Boş tahtın çevresinde altı muhafız', rep: 'Üç kez tekrar', cap: 'Hamle sınırı: berabere', took: 'Alındı!' },
  };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  /* ---------- sounds (respect the portal's sound switch): turned wood / bone on a board ---------- */
  let AC = null;
  function ac() {
    try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {}
    try { AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; }
  }
  function tone(a, t0, f0, f1, dur, vol, type) {
    const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .004); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .02);
  }
  const SND = {
    put(v = 1) { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 900 * v, 520, .07, .07, 'triangle'); tone(a, t, 210 * v, 120, .09, .16); },
    lift() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 700, 0, .05, .03, 'triangle'); },
    take() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 330, 180, .16, .12, 'square'); tone(a, t + .05, 260, 140, .14, .08, 'triangle'); },
    crown() { const a = ac(); if (!a) return; const t = a.currentTime; [784, 988, 1175, 1568].forEach((f, i) => tone(a, t + i * .08, f, 0, .5, .06, 'triangle')); },
  };
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.agtoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#6b2a1a;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);pointer-events:none}`;
    document.head.appendChild(s);
  }
  const DK = ['background:radial-gradient(circle at 40% 35%,#fffaf0,#e7dcc2 60%,#b9a67e)', 'background:radial-gradient(circle at 40% 35%,#5a4a40,#2a201b 60%,#120d0a)'];
  const lookOf = () => { try { const v = localStorage.getItem('atlas-agon-look3') || localStorage.getItem('atlas-agon-look'); if (v === 'folk') return 'folk'; } catch (e) {} return 'victorian'; };

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, X = TX[ctx.lang] || TX.en;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const A3 = T3.agon, board = A3.board(lookOf()); T3.show('agon', board);
    const U = board.userData, Y = U.top;
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: A3.B * .98, d: A3.B * .98, y: Y + .2, pitch: 1.0 } : { w: A3.B * .92, d: A3.B * .92, y: Y + .2, pitch: 1.0 });
    const pvp = ctx.mode === 'pvp';
    const human = pvp ? 1 : ctx.side === 2 ? 2 : 1;
    const flip = human === 2;
    const pname = c => X.n[c - 1];
    let E = null;
    const xz = i => flip ? U.pt(-E.XC[i], -E.YC[i]) : U.pt(E.XC[i], E.YC[i]);
    let pos = null, hashes = [], moves = [], legal = [];
    let stopped = false, busy = true, over = false, thinking = false, sel = null, worker = null, jid = 0, toastEl = null, toastT = 0;
    let ply = 0, hintW = null, hintJ = 0;
    const mover = () => pvp && pos ? pos.side + 1 : human;
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.side, { human: pvp || pos.side + 1 === human, ply }); };
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };

    /* ---------- marks: hexagons on the cells ---------- */
    const hl = new TH.Group(), mv = new TH.Group(), cm = new TH.Group(); board.add(hl, mv, cm);
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xffc94a, .34), lastF: basic(0xffc94a, .16), sel: basic(0xffc94a, .95), dest: basic(0x2fd17a, .92), hint: basic(0xff7a1a, .95), cap: basic(0xff5a46, .95), throne: basic(0xffd36b, .9) };
    const hexGeo = r => { const g = new TH.CircleGeometry(r, 6); g.rotateZ(Math.PI / 2); g.rotateX(-Math.PI / 2); return g; };
    const GEO = { hex: hexGeo(.5), ring: new TH.TorusGeometry(.47, .03, 8, 44), dot: new TH.CylinderGeometry(.13, .13, .012, 24), capR: new TH.TorusGeometry(.5, .035, 8, 44) };
    GEO.ring.rotateX(Math.PI / 2); GEO.capR.rotateX(Math.PI / 2);
    function mark(group, geo, mat, i, y = .006) { const m = new TH.Mesh(geo, mat), [x, z] = xz(i); m.position.set(x, Y + y, z); m.renderOrder = 2; group.add(m); kick(); return m; }
    const clear = g => { while (g.children.length) g.remove(g.children[0]); kick(); };
    function pulse(m, n = 2) { anim(520 * n, k => { const s = 1 + Math.sin(k * Math.PI * 2 * n) * .12 * (1 - k); m.scale.set(s, 1, s); }, () => m.scale.set(1, 1, 1)); }

    /* ---------- pieces ---------- */
    let pcs = {};
    function mk(kind, i) { const g = U.piece(kind), sh = T3.contact(A3.R * .95, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh; const [x, z] = xz(i); g.position.set(x, Y, z); board.add(g); return g; }
    function lift(g, h) { g.position.y = Y + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.4); } }
    const hOf = g => g.userData.h0 || 0;
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function lean(g, on, quick) {   // a captured piece leans over until it is relocated
      const a0 = g.rotation.z, a1 = on ? -.22 : 0, b0 = g.rotation.x, b1 = on ? .12 : 0;
      if (quick) { g.rotation.z = a1; g.rotation.x = b1; return; }
      anim(220, k => { const e = io(k); g.rotation.z = a0 + (a1 - a0) * e; g.rotation.x = b0 + (b1 - b0) * e; });
    }
    function capMarks() { clear(cm); for (let i = 0; i < E.N; i++) if (pos.at(i) && pos.captured(i)) mark(cm, GEO.capR, MAT.cap, i, .02); }
    function setup() {
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {};
      let n = 0; const order = []; for (let i = 0; i < E.N; i++) if (pos.at(i)) order.push(i);
      order.sort((a, b) => xz(a)[1] - xz(b)[1]);
      for (const i of order) { const k = pos.at(i), g = mk(k, i); pcs[i] = { g, k }; g.visible = false; const d = 60 + (n++) * 45; kick(200);
        later(() => { g.visible = true; anim(260, q => lift(g, (1 - q) * (1 - q) * 1.3), () => { lift(g, 0); land(g); SND.put(1.1); }); }, d); }
      return 60 + n * 45 + 300;
    }
    function rebuild() { Object.values(pcs).forEach(p => drop(p.g)); pcs = {}; for (let i = 0; i < E.N; i++) { const k = pos.at(i); if (k) { pcs[i] = { g: mk(k, i), k }; if (pos.captured(i)) lean(pcs[i].g, true, true); } } capMarks(); kick(300); }

    /* ---------- position ---------- */
    function refresh() { const r = E.replay(null, moves); pos = r.pos; hashes = r.hashes; }
    function hud(msg) {
      const side = c => `<span class="hs ${pos && pos.side + 1 === c && !over ? 'on' : ''}"><i class="dk" style="${DK[c - 1]}"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}<b>${pos ? (pos.onThrone(c) ? '♛' : '') + pos.ringCount(c) : 0}/6</b></span>`;
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${side(2)}`);
    }
    function toast(msg) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'agtoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2400);
    }
    function showMarks() {
      clear(hl);
      if (moves.length) { const m = moves[moves.length - 1]; if (m !== E.PASS) { const f = E.mFrom(m); if (f !== E.RES) mark(hl, GEO.hex, MAT.lastF, f); mark(hl, GEO.hex, MAT.last, E.mTo(m)); } }
    }

    /* ---------- selection ---------- */
    function drawSel() {
      clear(mv); if (!sel) return;
      if (sel.from >= 0) mark(mv, GEO.ring, MAT.sel, sel.from, .03);
      new Set(sel.cands.map(E.mTo)).forEach(i => mark(mv, GEO.dot, MAT.dest, i, .012));
    }
    function select(i, cands) {
      deselect(); sel = { from: i, cands }; drawSel();
      const p = pcs[i]; if (p) { const g = p.g, h0 = hOf(g); anim(130, k => lift(g, h0 + (.22 - h0) * io(k))); }
      SND.lift();
    }
    function deselect() { clear(mv); if (sel && pcs[sel.from]) { const g = pcs[sel.from].g, h0 = hOf(g); if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); } sel = null; }
    // a side that must relocate: its waiting pieces are offered at once (the only one is picked for it)
    function offerReloc() {
      if (!pos || over) return false;
      const ph = pos.phase(); if (ph !== 'queen' && ph !== 'guard') return false;
      const froms = [...new Set(legal.map(E.mFrom))];
      if (froms.length === 1 && legal[0] !== E.PASS) select(froms[0], legal.filter(m => E.mFrom(m) === froms[0]));
      return true;
    }

    /* ---------- moves ---------- */
    function play(m, done) {
      if (m === E.PASS) { moves.push(m); refresh(); ply++; legal = []; onTurn(); showMarks(); later(done, 300); return; }
      const before = pos, kind = E.kindOfMove(pos, m), f = E.mFrom(m), to = E.mTo(m), caps = pos.capsOf(m);
      clear(mv); sel = null;
      moves.push(m); refresh(); ply++; legal = []; onTurn(); showMarks(); hud('');
      if (kind === 'place') {
        const k = before.side === 0 ? 1 : 3, g = mk(k, to); pcs[to] = { g, k };
        anim(360, q => lift(g, (1 - (1 - Math.pow(1 - q, 3))) * 1.2), () => { lift(g, 0); land(g); SND.put(); capMarks(); done(); });
        return;
      }
      const p = pcs[f]; delete pcs[f];
      if (!p) { rebuild(); later(done, 200); return; }
      pcs[to] = p; const g = p.g, [x0, z0] = xz(f), [x1, z1] = xz(to), h0 = hOf(g);
      if (kind === 'reloc') {
        const d = Math.hypot(x1 - x0, z1 - z0), H = Math.min(2.2, .6 + d * .22), r0x = g.rotation.x, r0z = g.rotation.z;
        clear(cm); SND.lift();
        anim(620, q => { const e = io(q); g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e; lift(g, h0 * (1 - q) + Math.sin(q * Math.PI) * H); g.rotation.x = r0x * (1 - e); g.rotation.z = r0z * (1 - e); },
          () => { g.rotation.set(0, 0, 0); lift(g, 0); land(g); SND.put(); capMarks(); done(); });
        return;
      }
      anim(300, q => { const e = io(q); g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e; lift(g, (h0 + (.16 - h0) * Math.min(1, q / .2)) * (q > .8 ? 1 - (q - .8) / .2 : 1)); },
        () => {
          lift(g, 0); land(g); SND.put();
          if (caps.length) { SND.take(); hud(X.took); caps.forEach(c => { const o = pcs[c]; if (o) lean(o.g, true); }); }
          capMarks();
          if (to === E.CENTER) { SND.crown(); const r = mark(hl, GEO.ring, MAT.throne, to, .03); pulse(r, 1); later(() => hl.remove(r), 1100); }
          done();
        });
    }
    function commit(m) { busy = true; play(m, () => { busy = false; next(); }); }
    function next() {
      if (stopped) return;
      const st = E.judge(pos, hashes);
      if (st.over) return end(st);
      legal = pos.moves();
      if (!legal.length || legal[0] === E.PASS) { commit(E.PASS); return; }
      onTurn();
      if (pvp || pos.side + 1 === human) {
        const ph = pos.phase(), msg = ph === 'queen' ? X.relocQ : ph === 'guard' ? X.reloc : '';
        hud(msg || (pvp ? X.turn.replace('{p}', pname(pos.side + 1)) : L.turn)); offerReloc(); return;
      }
      aiMove();
    }
    function end(st) {
      over = true; busy = false; clear(mv); if (ctx.onTurn) ctx.onTurn(-1);
      const draw = !!st.draw || !st.winner, why = X[st.why] || '';
      const win = !pvp && !draw && st.winner === human, wt = pvp && !draw ? X.win.replace('{p}', pname(st.winner)) : '';
      if (!draw && st.why === 'throne') { const r = mark(hl, GEO.ring, MAT.throne, E.CENTER, .03); pulse(r, 3); SND.crown(); }
      hud(draw ? L.draw : pvp ? wt : win ? L.win : L.lose);
      later(() => ctx.onEnd(pvp ? { win: false, draw, level: ctx.level, score: why, pvp: true, winnerText: wt } : { win, draw, level: ctx.level, score: why }), 900);
    }

    /* ---------- AI: the game's engine worker ---------- */
    function newWorker() { const w = new Worker(BASE + 'engine.js' + VER); w.postMessage({ type: 'newgame', id: 0, rule: 'std' }); return w; }
    function aiMove() {
      thinking = true; hud(L.think);
      if (!worker) worker = newWorker();
      const id = ++jid, t0 = Date.now(), mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (m == null || m < 0) { try { m = E.think(null, mvs, Math.min(ctx.level, 6)).move; } catch (e) { m = -1; } }
        later(() => { if (id !== jid || over) return; thinking = false; if (m == null || !legal.includes(m)) m = legal[0]; commit(m); }, Math.max(0, 450 - (Date.now() - t0)));
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? null : r.move); };
      worker.onerror = () => { worker = null; reply(null); };
      worker.postMessage({ type: 'think', id, start: null, moves: mvs, level: ctx.level, rule: 'std' });
    }

    /* ---------- input ---------- */
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      let best = -1, bd = .55; for (let i = 0; i < E.N; i++) { const [x, z] = xz(i), d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    function onClick(e) {
      if (over || busy || thinking || !pos || pos.side + 1 !== mover() || T3.wasDrag()) return;
      const i = cellOf(e); if (i < 0) { if (!offerReloc()) deselect(); return; }
      const me = pos.side + 1, ph = pos.phase();
      if (ph === 'place') { const m = legal.find(x => E.mTo(x) === i); if (m != null) commit(m); else toast(X.move); return; }
      if (pos.owner(i) === me) {
        if (sel && sel.from === i && ph === 'move') { deselect(); return; }
        const c = legal.filter(m => E.mFrom(m) === i);
        if (!c.length) { toast(ph === 'move' ? X.stuck : ph === 'queen' ? X.relocQ : X.reloc); return; }
        select(i, c); return;
      }
      if (!sel) { if (pos.owner(i)) toast(X.own); else if (ph !== 'move') toast(ph === 'queen' ? X.relocQ : X.reloc); return; }
      const m = sel.cands.find(x => E.mTo(x) === i);
      if (m != null) { commit(m); return; }
      if (!pos.owner(i)) toast(X.move);
      if (!offerReloc()) deselect();
    }
    ctx.el.addEventListener('click', onClick);

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; clear(mv); clear(hl); clear(cm);
      moves = []; over = false; busy = true; sel = null; thinking = false; jid++;
      refresh(); legal = pos.moves(); const wait = setup(); hud('');
      later(() => { busy = false; showMarks(); next(); }, wait + 200);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; E.setRule('std'); if (!pvp) worker = newWorker(); begin(); }).catch(() => hud('⚠'));

    const dbg = {
      at: i => { const [x, z] = xz(i); return T3.project(x, z, Y); },
      state: () => ({ moves: moves.length, side: pos && pos.side, human, pvp, over, busy, thinking, sel: sel ? sel.from : null, pieces: Object.keys(pcs).length, phase: pos && pos.phase(), w: pos && pos.ringCount(1), b: pos && pos.ringCount(2) }),
      legal: () => legal.map(m => ({ m, from: E.mFrom(m), to: E.mTo(m) })),
    };
    window.Atlas3D.agon._dbg = dbg;
    let drawAsked = -99;
    const myTurn = () => !!pos && !over && !busy && !thinking && (pvp || pos.side + 1 === human);
    const undoN = () => {   // back to the human's last turn (the AI's reply and, after a capture, its relocation turns too)
      if (pvp) return 1;
      let n = 0; for (let k = moves.length - 1; k >= 0; k--) { n++; const p = E.replay(null, moves.slice(0, k)).pos; if (p.side + 1 === human) return n; }
      return 0;
    };
    function finish(loser, why) {
      if (over || !pos) return;
      over = true; busy = false; thinking = false; jid++; hintJ++; clear(mv); sel = null; if (ctx.onTurn) ctx.onTurn(-1);
      if (why === 'draw') {   // 合意の引き分け（ポータルの操作バーの［引き分け］）
        hud(L.draw); return later(() => ctx.onEnd(pvp ? { win: false, draw: true, level: ctx.level, score: t('act.drawAgreed'), pvp: true, winnerText: '' } : { win: false, draw: true, level: ctx.level, score: t('act.drawAgreed') }), 200);
      }
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = X.win.replace('{p}', pname(3 - loser)); hud(wt); return later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: pname(loser), r, w: wt }), pvp: true, winnerText: wt }), 200); }
      hud(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r }), 200);
    }
    const api = {
      human: human - 1,
      canUndo: () => myTurn() && undoN() > 0 && moves.length - undoN() >= 0,
      undo() { if (!api.canUndo()) return; const n = undoN(); timers.forEach(clearTimeout); timers.length = 0; jid++; deselect(); moves.splice(moves.length - n); refresh(); rebuild(); ply++; busy = false; legal = pos.moves(); showMarks(); next(); },
      canHint: () => myTurn(),
      hint() {
        if (!myTurn()) return Promise.resolve(false);
        const j = ++hintJ, mvs = moves.slice();
        return new Promise(res => {
          if (!hintW) hintW = newWorker();
          hintW.onmessage = e => {
            const r = e.data; if (r.type !== 'result' || r.id !== j) return;
            if (stopped || j !== hintJ || over || moves.length !== mvs.length) return res(true);
            const m = r.error ? -1 : r.move; if (m == null || !legal.includes(m)) return res(false);
            const f = E.mFrom(m); if (f !== E.RES) pulse(mark(hl, GEO.ring, MAT.hint, f, .04), 2); pulse(mark(hl, GEO.dot, MAT.hint, E.mTo(m), .04), 2);
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, start: null, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)), rule: 'std' });
        });
      },
      // 引き分け（ポータルの操作バー）：2人対局は合意で draw()。AI 対局は offerDraw() → 'yes' / 'no' / 'wait'
      // （AI は強めの探索で形勢を見て、自分が良くなければ同意。20手未満と、断ってから6手以内は受けない）
      canDraw: () => myTurn() && moves.length >= 2,
      offerDraw() {
        if (!myTurn()) return Promise.resolve('no');
        if (moves.length - drawAsked < 6) return Promise.resolve('wait');
        drawAsked = moves.length;
        if (moves.length < 20) return Promise.resolve('no');
        const j = ++hintJ, mvs = moves.slice();
        return new Promise(res => {
          if (!hintW) hintW = newWorker();
          hintW.onmessage = e => { const r = e.data; if (r.type !== 'result' || r.id !== j) return; res(!stopped && !over && moves.length === mvs.length && typeof r.v === 'number' && -r.v <= 0 ? 'yes' : 'no'); };   // r.v: the side to move (you) — the AI's view is -v
          hintW.onerror = () => { hintW = null; res('no'); };
          hintW.postMessage({ type: 'think', id: j, start: null, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)), rule: 'std' });
        });
      },
      draw() { if (pos && !over) finish(-1, 'draw'); },
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.side + 1 : human, 'resign'); },
      timeout(side) { finish(side + 1, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.agon._dbg === dbg) delete window.Atlas3D.agon._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card: Lv.1 … Lv.20 ---------- */
  const LVD = {
    ja: ['入門：王座へ向かうが、はさみ取りを見落とす', '初級〜中級：数手先の捕獲を読む', '上級：置き直しと王座の囲みを計算', '最上級：深い読みで女王の道を作る'],
    en: ['Beginner: heads for the throne but misses captures', 'Novice to intermediate: sees captures a few moves ahead', 'Advanced: counts relocations and the ring round the throne', 'Expert: deep search that clears the queen’s road'],
    zh: ['入门：会走向王座，但常漏看夹吃', '初级～中级：能看几步后的吃子', '高级：会计算重放与王座的包围', '专家：深算为女王开路'],
    ko: ['입문: 왕좌로 향하지만 끼워 잡기를 놓침', '초급~중급: 몇 수 앞의 잡기를 읽음', '상급: 재배치와 왕좌 둘러싸기를 계산', '전문가: 깊은 읽기로 여왕의 길을 만듦'],
    es: ['Principiante: va al trono pero no ve capturas', 'Inicial a intermedio: ve capturas a pocas jugadas', 'Avanzado: cuenta recolocaciones y el anillo del trono', 'Experto: búsqueda profunda que abre paso a la reina'],
    fr: ['Débutant : vise le trône mais rate les prises', 'Novice à moyen : voit les prises quelques coups à l’avance', 'Avancé : calcule les replacements et l’anneau du trône', 'Expert : calcul profond qui ouvre la route de la reine'],
    pt: ['Iniciante: vai ao trono mas não vê capturas', 'Básico a intermediário: vê capturas alguns lances à frente', 'Avançado: conta recolocações e o anel do trono', 'Mestre: busca profunda que abre caminho à rainha'],
    de: ['Einsteiger: will zum Thron, übersieht aber Schläge', 'Anfänger bis Mittel: sieht Schläge einige Züge voraus', 'Fortgeschritten: rechnet Neusetzen und den Ring um den Thron', 'Meister: tiefe Suche, die der Königin den Weg bahnt'],
    hi: ['शुरुआती: सिंहासन की ओर जाता है पर पकड़ चूकता है', 'नौसिखिया से मध्यम: कुछ चाल आगे की पकड़ देखता है', 'उन्नत: दोबारा रखना और सिंहासन का घेरा गिनता है', 'विशेषज्ञ: गहरी गणना से रानी का रास्ता बनाता है'],
    ar: ['مبتدئ: يتجه إلى العرش لكنه يفوّت الأسر', 'مبتدئ إلى متوسط: يرى الأسر قبل بضع نقلات', 'متقدم: يحسب إعادة الوضع وحلقة العرش', 'خبير: بحث عميق يفتح طريق الملكة'],
    ru: ['Начальный: идёт к трону, но упускает взятия', 'Новичок–средний: видит взятия на несколько ходов вперёд', 'Продвинутый: учитывает перестановки и кольцо вокруг трона', 'Эксперт: глубокий поиск, расчищающий путь королеве'],
    'zh-TW': ['入門：會往王座前進但常漏掉吃子', '初級～中級：能看出幾步內的吃子', '高級：計算重新放置與王座周圍的包圍', '最高級：深入搜尋，替女王開路'],
    id: ['Pemula: menuju takhta tapi melewatkan tangkapan', 'Dasar–menengah: melihat tangkapan beberapa langkah ke depan', 'Mahir: memperhitungkan pemindahan dan cincin sekitar takhta', 'Ahli: pencarian mendalam yang membuka jalan sang ratu'],
    tr: ['Başlangıç: tahta yönelir ama almaları kaçırır', 'Acemi–orta: birkaç hamle ilerideki almaları görür', 'İleri: yeniden yerleştirmeleri ve taht çevresini hesaplar', 'Uzman: kraliçenin yolunu açan derin arama'],
  };
  const RATING = [0, 450, 575, 700, 825, 950, 1075, 1200, 1325, 1450, 1575, 1700, 1825, 1950, 2030, 2090, 2150, 2200, 2250, 2300, 2350];   // agon RT_LV (rated games)
  const W7 = (a, b, c, d, e, f) => [a, a, a, a, b, b, b, b, b, c, c, c, c, c, c, d, d, d, e, f];
  const WHO = {
    ja: W7('はじめての人に', 'ルールを覚えた人に', '慣れてきた人に', '強い人に', '上級者でも手ごわい', '最強レベル'),
    en: W7('for first-timers', 'once you know the rules', 'getting the hang of it', 'for strong players', 'tough even for experts', 'the very strongest'),
    zh: W7('适合初次玩', '适合刚学会规则', '适合渐渐上手', '适合高手', '高手也觉得难缠', '最强等级'),
    ko: W7('처음 하는 사람에게', '규칙을 익힌 사람에게', '익숙해진 사람에게', '강한 사람에게', '고수도 버거운', '최강 레벨'),
    es: W7('para principiantes', 'si ya sabes las reglas', 'si ya le vas pillando el truco', 'para jugadores fuertes', 'difícil incluso para expertos', 'el más fuerte'),
    fr: W7('pour débuter', 'si tu connais les règles', 'si tu prends le coup de main', 'pour les bons joueurs', 'coriace même pour les experts', 'le plus fort'),
    pt: W7('para iniciantes', 'para quem já sabe as regras', 'para quem está pegando o jeito', 'para jogadores fortes', 'difícil até para experts', 'o mais forte'),
    de: W7('für Einsteiger', 'wenn du die Regeln kennst', 'wenn du den Dreh raus hast', 'für starke Spieler', 'selbst für Profis knifflig', 'die stärkste Stufe'),
    hi: W7('पहली बार खेलने वालों के लिए', 'नियम सीख चुके लोगों के लिए', 'जिन्हें आदत हो रही है उनके लिए', 'मज़बूत खिलाड़ियों के लिए', 'विशेषज्ञों के लिए भी कठिन', 'सबसे मज़बूत स्तर'),
    ar: W7('لمن يلعب أول مرة', 'لمن تعلّم القواعد', 'لمن بدأ يعتاد اللعب', 'للاعبين الأقوياء', 'صعب حتى على الخبراء', 'أقوى مستوى'),
  };
  function levelInfo(n, lang) {
    const D = LVD[lang] || LVD.en, W = WHO[lang] || WHO.en;
    return { name: '', desc: D[n <= 4 ? 0 : n <= 9 ? 1 : n <= 15 ? 2 : 3], rating: RATING[n], who: W[n - 1] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.agon = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', levelInfo, start };
})();
