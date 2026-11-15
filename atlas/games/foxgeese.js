/* =====================================================================
   Fox and Geese (the cross of 33 points) on the portal.
   · The board card (levels, sides, modes, 種目): Lv.1 … Lv.20 with the game's descriptions (foxgeese/i18n-fg*.js),
     ratings = the game's RT_LV (foxgeese/app.js). 種目 = the full game's two rules (the card's "size" value:
     13 = the traditional 13 geese · 17 = 17 geese that move only forward or sideways). 先手 = the fox (it moves first).
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D table itself with the full game's rules and AI —
     ../foxgeese/engine.js on the page (steps along the lines, the fox's jumps — several in one move, it may stop,
     capturing is never compulsory — the fox shut in, five geese or fewer, the 80-move rule) and the same file as
     a Worker (levels 1..20), asked as foxgeese/app.js asks it.
     Input as on the page: tap a piece and the point it goes to. The fox's jumps are tapped one landing at a time;
     to stop where it could jump on, tap that landing point (or the fox) once more.
     ctx.mode 'pvp': two players take turns on one device. The board is never turned: the geese are always near.
     Board and pieces: atlas/models/foxgeese.js (the look and the set chosen in the portal's 盤 / 駒 rows).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../foxgeese/', VER = '?v=1';   // same file / version as foxgeese/index.html → shared cache
  let engP = null;
  function loadEngine() {
    if (window.FoxEngine) return Promise.resolve(window.FoxEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.FoxEngine ? res(window.FoxEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  // n: the sides · turn / win (two players) · own / stuck / move: a tap that does nothing · more: the fox could jump on ·
  // wFew / wTrap / wStuck / wQuiet: why the game ended · took: geese taken in one move
  const TX = {
    ja: { n: ['狐', 'ガチョウ'], turn: '{p}の番', win: '{p}の勝ち', own: '自分の駒を選んでください', stuck: 'その駒はいま動かせません', move: 'そこへは動かせません', more: 'まだ跳べるよ。ここで止まるなら同じ点をもう一度タップ', wFew: 'ガチョウが5羽以下になった（もう狐を囲めない）', wTrap: '狐が動けなくなった', wStuck: 'ガチョウが動けなくなった', wQuiet: '取り合いのないまま80手ずつ進んだ', took: '{n}羽続けて取った！' },
    en: { n: ['Fox', 'Geese'], turn: '{p} to move', win: '{p} wins', own: 'Pick one of your pieces', stuck: 'That piece cannot move now', move: 'It cannot go there', more: 'It can jump on. To stop here, tap this point once more', wFew: 'Five geese or fewer are left — they can no longer shut the fox in', wTrap: 'The fox cannot move', wStuck: 'The geese cannot move', wQuiet: '80 moves each without a capture', took: '{n} geese in one move!' },
    zh: { n: ['狐狸', '鹅'], turn: '轮到{p}', win: '{p}胜', own: '请选择自己的棋子', stuck: '这枚棋子现在不能动', move: '不能走到那里', more: '还可以继续跳。想停在这里，就再点一次这个点', wFew: '鹅只剩5只或更少（已围不住狐狸）', wTrap: '狐狸动不了了', wStuck: '鹅动不了了', wQuiet: '双方各80步没有吃子', took: '连吃{n}只！' },
    ko: { n: ['여우', '거위'], turn: '{p} 차례', win: '{p} 승리', own: '내 말을 고르세요', stuck: '그 말은 지금 움직일 수 없습니다', move: '그곳으로는 갈 수 없습니다', more: '더 뛸 수 있어요. 여기서 멈추려면 같은 점을 한 번 더 탭', wFew: '거위가 5마리 이하가 되었다(더는 여우를 가둘 수 없다)', wTrap: '여우가 움직일 수 없게 되었다', wStuck: '거위가 움직일 수 없게 되었다', wQuiet: '잡기 없이 80수씩 진행되었다', took: '{n}마리 연속으로 잡았다!' },
    es: { n: ['Zorro', 'Ocas'], turn: 'Turno: {p}', win: 'Gana: {p}', own: 'Elige una de tus piezas', stuck: 'Esa pieza no puede moverse ahora', move: 'No puede ir ahí', more: 'Puede seguir saltando. Para parar aquí, toca este punto otra vez', wFew: 'Quedan cinco ocas o menos: ya no pueden encerrar al zorro', wTrap: 'El zorro no puede moverse', wStuck: 'Las ocas no pueden moverse', wQuiet: '80 jugadas por bando sin capturas', took: '¡{n} ocas de una vez!' },
    fr: { n: ['Renard', 'Oies'], turn: 'Trait : {p}', win: 'Victoire : {p}', own: 'Choisissez une de vos pièces', stuck: 'Cette pièce ne peut pas bouger maintenant', move: 'Elle ne peut pas aller là', more: 'Il peut encore sauter. Pour s’arrêter ici, touchez ce point une fois de plus', wFew: 'Il reste cinq oies ou moins : elles ne peuvent plus enfermer le renard', wTrap: 'Le renard ne peut plus bouger', wStuck: 'Les oies ne peuvent plus bouger', wQuiet: '80 coups chacun sans prise', took: '{n} oies d’un coup !' },
    pt: { n: ['Raposa', 'Gansos'], turn: 'Vez: {p}', win: 'Vitória: {p}', own: 'Escolha uma de suas peças', stuck: 'Essa peça não pode se mover agora', move: 'Ela não pode ir para aí', more: 'Ela pode continuar saltando. Para parar aqui, toque neste ponto mais uma vez', wFew: 'Restam cinco gansos ou menos: já não conseguem cercar a raposa', wTrap: 'A raposa não pode se mover', wStuck: 'Os gansos não podem se mover', wQuiet: '80 lances de cada lado sem capturas', took: '{n} gansos de uma vez!' },
    de: { n: ['Fuchs', 'Gänse'], turn: 'Am Zug: {p}', win: 'Sieg: {p}', own: 'Wähle eine deiner Figuren', stuck: 'Diese Figur kann gerade nicht ziehen', move: 'Dorthin kann sie nicht', more: 'Er kann weiterspringen. Zum Anhalten tippe diesen Punkt noch einmal an', wFew: 'Nur noch fünf Gänse oder weniger – sie können den Fuchs nicht mehr einsperren', wTrap: 'Der Fuchs kann nicht mehr ziehen', wStuck: 'Die Gänse können nicht mehr ziehen', wQuiet: 'Je 80 Züge ohne Schlag', took: '{n} Gänse in einem Zug!' },
    hi: { n: ['लोमड़ी', 'कलहंस'], turn: '{p} की बारी', win: '{p} की जीत', own: 'अपना एक मोहरा चुनो', stuck: 'वह मोहरा अभी नहीं चल सकता', move: 'वहाँ नहीं जा सकता', more: 'लोमड़ी और कूद सकती है। यहीं रुकना हो तो इसी बिंदु को एक बार और टैप करो', wFew: 'पाँच या कम कलहंस बचे — अब वे लोमड़ी को घेर नहीं सकते', wTrap: 'लोमड़ी हिल नहीं सकती', wStuck: 'कलहंस हिल नहीं सकते', wQuiet: 'दोनों की 80-80 चालें बिना किसी कब्ज़े के', took: 'एक चाल में {n} कलहंस!' },
    ar: { n: ['الثعلب', 'الإوز'], turn: 'دور {p}', win: 'فوز {p}', own: 'اختر إحدى قطعك', stuck: 'هذه القطعة لا تستطيع الحركة الآن', move: 'لا يمكنها الذهاب إلى هناك', more: 'يستطيع الثعلب متابعة القفز. للتوقف هنا المس هذه النقطة مرة أخرى', wFew: 'بقيت خمس إوزات أو أقل: لم تعد تستطيع حصار الثعلب', wTrap: 'الثعلب لا يستطيع الحركة', wStuck: 'الإوز لا يستطيع الحركة', wQuiet: '80 نقلة لكل طرف بلا أخذ', took: '{n} إوزات في نقلة واحدة!' },
    ru: { n: ['Лиса', 'Гуси'], turn: 'Ход: {p}', win: 'Победа: {p}', own: 'Выберите свою фигуру', stuck: 'Эта фигура сейчас не может ходить', move: 'Туда пойти нельзя', more: 'Можно прыгать дальше. Чтобы остановиться здесь, нажмите эту точку ещё раз', wFew: 'Гусей осталось пять или меньше — лису уже не запереть', wTrap: 'Лиса не может ходить', wStuck: 'Гуси не могут ходить', wQuiet: 'По 80 ходов без взятий', took: '{n} гусей за один ход!' },
    'zh-TW': { n: ['狐狸', '鵝'], turn: '輪到{p}', win: '{p}獲勝', own: '請選擇自己的棋子', stuck: '這顆棋子現在不能動', move: '不能走到那裡', more: '還可以繼續跳。想停在這裡，就再點一次這個點', wFew: '鵝只剩5隻或更少（已圍不住狐狸）', wTrap: '狐狸動不了了', wStuck: '鵝動不了了', wQuiet: '雙方各80步沒有吃子', took: '連吃{n}隻！' },
    id: { n: ['Rubah', 'Angsa'], turn: 'Giliran {p}', win: '{p} menang', own: 'Pilih salah satu bidakmu', stuck: 'Bidak itu tidak bisa bergerak sekarang', move: 'Tidak bisa ke sana', more: 'Masih bisa melompat lagi. Untuk berhenti di sini, ketuk titik ini sekali lagi', wFew: 'Angsa tinggal lima atau kurang — rubah tidak bisa dikurung lagi', wTrap: 'Rubah tidak bisa bergerak', wStuck: 'Angsa tidak bisa bergerak', wQuiet: '80 langkah masing-masing tanpa tangkapan', took: '{n} angsa sekaligus!' },
    tr: { n: ['Tilki', 'Kazlar'], turn: 'Sıra: {p}', win: 'Kazanan: {p}', own: 'Taşlarından birini seç', stuck: 'Bu taş şu an hareket edemez', move: 'Oraya gidemez', more: 'Atlamaya devam edebilir. Burada durmak için bu noktaya bir kez daha dokun', wFew: 'Beş ya da daha az kaz kaldı — artık tilkiyi kapatamazlar', wTrap: 'Tilki hareket edemiyor', wStuck: 'Kazlar hareket edemiyor', wQuiet: '80’er hamle taş alınmadı', took: 'Tek hamlede {n} kaz!' },
  };
  // 種目: the two rules (names and descriptions as the full game's rule cards)
  const RIDS = ['g13', 'g17'], RSZ = [13, 17];
  const RN = {
    ja: { n: ['ガチョウ13羽', 'ガチョウ17羽'], d: ['昔からの形。ガチョウはどの線にも1歩、後ろにも下がれます。狐がやや有利。', 'ガチョウが4羽多いかわりに、前か横にしか進めません（斜め・後ろは不可）。ガチョウ有利。'] },
    en: { n: ['13 geese', '17 geese'], d: ['The traditional game. The geese step along any line, backwards too. Slightly better for the fox.', 'Four more geese — but they move only forward or sideways (never diagonally or backwards). Better for the geese.'] },
    zh: { n: ['13只鹅', '17只鹅'], d: ['传统玩法。鹅可沿任意线走一步，也能后退。狐狸略占优。', '多4只鹅，但只能向前或向两侧走（不能斜走、不能后退）。鹅占优。'] },
    ko: { n: ['거위 13마리', '거위 17마리'], d: ['옛날부터의 형태. 거위는 어느 선으로든 한 칸, 뒤로도 물러날 수 있습니다. 여우가 조금 유리.', '거위가 4마리 많은 대신 앞이나 옆으로만 갑니다(대각선·뒤는 불가). 거위가 유리.'] },
    es: { n: ['13 ocas', '17 ocas'], d: ['El juego tradicional. Las ocas dan un paso por cualquier línea, también hacia atrás. Ligera ventaja del zorro.', 'Cuatro ocas más, pero solo avanzan o van de lado (nunca en diagonal ni hacia atrás). Ventaja de las ocas.'] },
    fr: { n: ['13 oies', '17 oies'], d: ['Le jeu traditionnel. Les oies avancent d’un pas sur n’importe quelle ligne, même en arrière. Léger avantage au renard.', 'Quatre oies de plus, mais elles ne vont que vers l’avant ou de côté (jamais en diagonale ni en arrière). Avantage aux oies.'] },
    pt: { n: ['13 gansos', '17 gansos'], d: ['O jogo tradicional. Os gansos dão um passo por qualquer linha, também para trás. Leve vantagem da raposa.', 'Quatro gansos a mais, mas só andam para a frente ou para os lados (nunca na diagonal nem para trás). Vantagem dos gansos.'] },
    de: { n: ['13 Gänse', '17 Gänse'], d: ['Das traditionelle Spiel. Die Gänse ziehen einen Schritt auf jeder Linie, auch rückwärts. Leichter Vorteil für den Fuchs.', 'Vier Gänse mehr – sie ziehen aber nur vorwärts oder seitwärts (nie diagonal oder rückwärts). Vorteil für die Gänse.'] },
    hi: { n: ['13 कलहंस', '17 कलहंस'], d: ['पारंपरिक खेल। कलहंस किसी भी रेखा पर एक कदम चलते हैं, पीछे भी। लोमड़ी को थोड़ी बढ़त।', 'चार कलहंस ज़्यादा — पर वे सिर्फ़ आगे या बगल में चलते हैं (तिरछे या पीछे कभी नहीं)। कलहंसों को बढ़त।'] },
    ar: { n: ['13 إوزة', '17 إوزة'], d: ['اللعبة التقليدية. يخطو الإوز خطوة على أي خط، وإلى الخلف أيضًا. أفضلية بسيطة للثعلب.', 'أربع إوزات إضافية، لكنها لا تتحرك إلا إلى الأمام أو إلى الجانب (لا قُطريًّا ولا إلى الخلف). الأفضلية للإوز.'] },
    ru: { n: ['13 гусей', '17 гусей'], d: ['Традиционная игра. Гуси ходят на шаг по любой линии, в том числе назад. Небольшой перевес у лисы.', 'Гусей на четыре больше, но ходят они только вперёд или вбок (не по диагонали и не назад). Перевес у гусей.'] },
    'zh-TW': { n: ['13隻鵝', '17隻鵝'], d: ['傳統玩法。鵝可沿任意線走一步，也能後退。狐狸略占優。', '多4隻鵝，但只能向前或向兩側走（不能斜走、不能後退）。鵝占優。'] },
    id: { n: ['13 angsa', '17 angsa'], d: ['Permainan tradisional. Angsa melangkah di garis mana pun, juga mundur. Rubah sedikit diuntungkan.', 'Empat angsa lebih banyak — tetapi hanya boleh maju atau menyamping (tidak diagonal, tidak mundur). Angsa diuntungkan.'] },
    tr: { n: ['13 kaz', '17 kaz'], d: ['Geleneksel oyun. Kazlar her çizgide bir adım atar, geriye de gidebilir. Tilki biraz avantajlı.', 'Dört kaz fazla — ama yalnızca ileri ya da yana giderler (çapraz ve geri yok). Kazlar avantajlı.'] },
  };
  const rn = l => RN[l] || RN.en, rix = z => Math.max(0, RSZ.indexOf(+z));
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  /* ---------- sounds (respect the portal's sound switch): wood on wood ---------- */
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
    put(v = 1) { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 700 * v, 320, .08, .07, 'triangle'); tone(a, t, 190 * v, 100, .1, .16); },
    hop() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 1200, 900, .06, .035, 'triangle'); },
    take() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 620, 1240, .12, .05, 'triangle'); },
    lift() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 1000, 0, .05, .03, 'triangle'); },
  };
  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.fgtoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#5d6a1f;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);pointer-events:none}`;
    document.head.appendChild(s);
  }
  const DK = ['background:radial-gradient(circle at 40% 35%,#f0a060,#b4502a 60%,#6a2a12)', 'background:radial-gradient(circle at 40% 35%,#fff,#f1e8d4 60%,#c9bd9f)'];

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, X = TX[ctx.lang] || TX.en, F3 = T3.foxgeese;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const N = 7, rule = RIDS[rix(ctx.size)], board = F3.board(); T3.show('foxgeese', board);
    const U = board.userData, Y = U.top - U.sink;
    const tall = innerHeight > innerWidth * 1.15;
    if (T3.fit) T3.fit(tall ? { w: U.W + .6, d: U.H + .8, y: U.top + .2, pitch: 1.0 } : { w: U.W + .3, d: U.H + .5, y: U.top + .2, pitch: 1.0 });
    const pvp = ctx.mode === 'pvp';
    const human = pvp ? 1 : ctx.side === 2 ? 2 : 1;   // 1 the fox (moves first) · 2 the geese
    const pname = c => X.n[c - 1];
    let E = null;
    const xz = i => { const [r, c] = E.RC[i]; return U.pt(c, r); };   // (never turned: the geese are always on the near side)

    let pos = null, moves = [], legal = [];
    let stopped = false, busy = true, over = false, thinking = false, sel = null, worker = null, jid = 0, toastEl = null, toastT = 0;
    let ply = 0, hintW = null, hintJ = 0;
    const mover = () => pvp && pos ? pos.side + 1 : human;
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.side, { human: pvp || pos.side + 1 === human, ply }); };
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(n) { if (stopped) return; const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };

    /* ---------- marks ---------- */
    const hl = new TH.Group(), mv = new TH.Group(); board.add(hl, mv);
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xffc94a, .4), lastF: basic(0xffc94a, .2), sel: basic(0xffc94a, .95), dest: basic(0x3fe0c4, .92), stop: basic(0xff9a4a, .95), hint: basic(0xff7a1a, .95) };
    const GEO = { cup: new TH.CircleGeometry(.36, 40), ring: new TH.TorusGeometry(.4, .03, 8, 44), dot: new TH.CylinderGeometry(.13, .13, .012, 24) };
    GEO.cup.rotateX(-Math.PI / 2); GEO.ring.rotateX(Math.PI / 2);
    function mark(group, geo, mat, i, y = .006) { const m = new TH.Mesh(geo, mat), [x, z] = xz(i); m.position.set(x, U.top + y, z); m.renderOrder = 2; group.add(m); kick(); return m; }
    const clear = g => { while (g.children.length) g.remove(g.children[0]); kick(); };
    function pulse(m, n = 2) { anim(520 * n, k => { const s = 1 + Math.sin(k * Math.PI * 2 * n) * .12 * (1 - k); m.scale.set(s, 1, s); }, () => m.scale.set(1, 1, 1)); }

    /* ---------- pieces ---------- */
    let pcs = {};   // point → { g, c }
    function mk(col, i) { const g = U.piece(col), sh = T3.contact(F3.R * (col === 1 ? 1.2 : .95), .45); sh.position.y = .002; g.add(sh); g.userData.sh = sh; const [x, z] = xz(i); g.position.set(x, Y, z); board.add(g); return g; }
    function lift(g, h) { g.position.y = Y + h; g.userData.h0 = h; const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .5; sh.scale.set(s, s, s); sh.material.opacity = .45 / (1 + h * 1.4); } }
    const hOf = g => g.userData.h0 || 0;
    function drop(g) { if (g.userData.sh) g.userData.sh.material.dispose(); board.remove(g); }
    function land(g) { anim(160, k => { const s = 1 + Math.sin(k * Math.PI) * .05; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function vanish(g, delay) { later(() => { SND.take(); const x0 = g.position.x, z0 = g.position.z; anim(340, k => { lift(g, Math.sin(k * Math.PI * .6) * .5); const s = 1 - io(k) * .85; g.scale.set(s, s, s); g.rotation.z = k * .6; g.position.x = x0; g.position.z = z0; }, () => drop(g)); }, delay); }
    function setup() {
      Object.values(pcs).forEach(p => drop(p.g)); pcs = {};
      let n = 0; const order = E.POINTS.filter(i => pos.owner(i));
      order.sort((a, b) => E.RC[b][0] - E.RC[a][0] || E.RC[a][1] - E.RC[b][1]);
      for (const i of order) { const c = pos.owner(i), g = mk(c, i); pcs[i] = { g, c }; g.visible = false; const d = 60 + (n++) * 34; kick(200);
        later(() => { g.visible = true; anim(240, q => lift(g, (1 - q) * (1 - q) * 1.2), () => { lift(g, 0); land(g); SND.put(c === 1 ? .8 : 1.1); }); }, d); }
      return 60 + n * 34 + 300;
    }
    function rebuild() { Object.values(pcs).forEach(p => drop(p.g)); pcs = {}; for (const i of E.POINTS) { const c = pos.owner(i); if (c) pcs[i] = { g: mk(c, i), c }; } kick(300); }
    const HOP = 280;
    // along the points of the move: a step slides, a jump (two points apart) flies in an arc over the goose
    function travel(g, path, done) {
      const pts = path.map(xz), h0 = hOf(g), legs = path.length - 1, far = k => { const a = E.RC[path[k]], b = E.RC[path[k + 1]]; return Math.abs(a[0] - b[0]) === 2 || Math.abs(a[1] - b[1]) === 2; }, hopped = [];
      anim(legs * (far(0) ? HOP : 210), k => {
        const r = k * legs, i = Math.min(legs - 1, Math.floor(r)), q0 = r - i, jump = far(i), q = jump ? q0 : io(q0), [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
        g.position.x = x0 + (x1 - x0) * q; g.position.z = z0 + (z1 - z0) * q;
        if (!hopped[i]) { hopped[i] = true; if (jump) SND.hop(); }
        lift(g, Math.max(0, Math.sin(q * Math.PI) * (jump ? .7 : .07) + (i === 0 ? h0 * (1 - q) : 0)));
      }, () => { lift(g, 0); SND.put(); land(g); if (done) done(); });
    }

    /* ---------- position ---------- */
    function refresh() { pos = E.replay(null, moves).pos; }
    function hud(msg) {
      const num = c => pos ? (c === 1 ? pos.cap : pos.geese) : 0;   // the fox: geese taken · the geese: how many are left
      const side = c => `<span class="hs ${pos && pos.side + 1 === c && !over ? 'on' : ''}"><i class="dk" style="${DK[c - 1]}"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}<b>${num(c)}</b></span>`;
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${side(2)}`);
    }
    function toast(msg) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'fgtoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2600);
    }
    function showMarks() {
      clear(hl); hintJ++;
      if (moves.length) { const p = E.path(moves[moves.length - 1]); mark(hl, GEO.cup, MAT.lastF, p[0]); mark(hl, GEO.cup, MAT.last, p[p.length - 1]); }
    }

    /* ---------- selection: sel = { from, pre: the points tapped so far (pre[0] = from), cands: the moves that start with pre } ---------- */
    const startsWith = (m, pre) => { const p = E.path(m); return p.length >= pre.length && pre.every((x, k) => p[k] === x); };
    function drawSel() {
      clear(mv); if (!sel) return;
      const at = sel.pre[sel.pre.length - 1], k = sel.pre.length;
      mark(mv, GEO.ring, sel.pre.length > 1 ? MAT.stop : MAT.sel, at, .05);
      sel.pre.slice(1, -1).forEach(i => mark(mv, GEO.dot, MAT.sel, i, .03));
      new Set(sel.cands.filter(m => E.path(m).length > k).map(m => E.path(m)[k])).forEach(i => mark(mv, GEO.dot, MAT.dest, i, .03));
    }
    function select(i, cands) {
      deselect(); sel = { from: i, pre: [i], cands }; drawSel();
      const p = pcs[i]; if (p) { const g = p.g, h0 = hOf(g); anim(130, k => lift(g, h0 + (.2 - h0) * io(k))); }
      SND.lift();
    }
    function deselect() { clear(mv); if (sel && pcs[sel.from]) { const g = pcs[sel.from].g, h0 = hOf(g); if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); } sel = null; }

    /* ---------- moves ---------- */
    function play(m, done) {
      const path = E.path(m), f = path[0], to = path[path.length - 1], fox = pos.owner(f) === 1, caps = fox ? E.jumped(m) : [];
      clear(mv); sel = null;
      const p = pcs[f]; delete pcs[f];
      caps.forEach((q, k) => { const c = pcs[q]; if (c) { delete pcs[q]; vanish(c.g, k * HOP + HOP * .45); } });
      moves.push(m); refresh(); ply++; legal = []; onTurn(); showMarks(); hud(caps.length > 1 ? X.took.replace('{n}', caps.length) : '');
      if (!p) { rebuild(); later(done, 200); return; }
      pcs[to] = p;
      travel(p.g, path, done);
    }
    function commit(m) { busy = true; play(m, () => { busy = false; next(); }); }
    function next() {
      if (stopped) return;
      const st = E.judge(pos);
      if (st.over) return end(st);
      legal = pos.moves();
      showMarks();
      onTurn();
      if (pvp || pos.side + 1 === human) { hud(pvp ? X.turn.replace('{p}', pname(pos.side + 1)) : L.turn); return; }
      aiMove();
    }
    function end(st) {
      over = true; busy = false; clear(mv); if (ctx.onTurn) ctx.onTurn(-1);
      const draw = !!st.draw, why = X[{ few: 'wFew', trap: 'wTrap', stuck: 'wStuck', quiet: 'wQuiet' }[st.why]] || '';
      if (pvp) { const wt = draw ? L.draw : X.win.replace('{p}', pname(st.winner)); hud(wt); later(() => ctx.onEnd({ win: false, draw, level: ctx.level, score: why, pvp: true, winnerText: wt }), 700); return; }
      const win = !draw && st.winner === human;
      hud(draw ? L.draw : win ? L.win : L.lose);
      later(() => ctx.onEnd({ win, draw, level: ctx.level, score: why }), 700);
    }

    /* ---------- AI: the game's engine worker ---------- */
    function newWorker() { const w = new Worker(BASE + 'engine.js' + VER); w.postMessage({ type: 'newgame', id: 0, rule }); return w; }
    function aiMove() {
      thinking = true; hud(L.think);
      if (!worker) worker = newWorker();
      const id = ++jid, mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (m == null || m < 0) { try { E.setRule(rule); m = E.think(null, mvs, Math.min(ctx.level, 6)).move; } catch (e) { m = -1; } }
        later(() => { if (id !== jid || over) return; thinking = false; if (m == null || !legal.includes(m)) m = legal[0]; commit(m); }, 0 /* AIの着手は即時（前の手のアニメは終わっている） */);
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? null : r.move); };
      worker.onerror = () => { worker = null; reply(null); };
      worker.postMessage({ type: 'think', id, start: null, moves: mvs, level: ctx.level, rule });
    }

    /* ---------- input ---------- */
    function pointOf(e) {
      const p = T3.pick(e, U.top); if (!p) return -1;
      const c = Math.round(p.x + (N - 1) / 2), r = Math.round(p.z + (N - 1) / 2);
      if (c < 0 || c > N - 1 || r < 0 || r > N - 1) return -1;
      const i = E.sqAt(r, c); return E.ON[i] ? i : -1;
    }
    function onClick(e) {
      if (over || busy || thinking || !pos || pos.side + 1 !== mover() || T3.wasDrag()) return;
      const i = pointOf(e); if (i < 0) { deselect(); return; }
      const me = pos.side + 1;
      if (sel) {
        const k = sel.pre.length, at = sel.pre[k - 1];
        if (k > 1 && (i === at || i === sel.from)) { const m = sel.cands.find(x => E.path(x).length === k); if (m != null) { commit(m); return; } }   // stop here
        const go = sel.cands.filter(x => E.path(x).length > k && E.path(x)[k] === i);
        if (go.length) {
          if (go.length === 1 && E.path(go[0]).length === k + 1) { commit(go[0]); return; }   // nothing beyond: the move is complete
          sel.pre.push(i); sel.cands = go; drawSel(); SND.lift(); toast(X.more); return;   // the fox could jump on from there
        }
        if (k > 1) { toast(X.more); return; }
      }
      if (pos.owner(i) === me) {
        if (sel && sel.from === i) { deselect(); return; }
        const c = legal.filter(m => E.mFrom(m) === i);
        if (!c.length) { toast(X.stuck); return; }
        select(i, c); return;
      }
      if (!sel) { if (pos.owner(i)) toast(X.own); return; }
      if (!pos.owner(i)) toast(X.move);
      deselect();
    }
    ctx.el.addEventListener('click', onClick);
    // the board view's 駒 row (Table3D.PIECES) during a game: the pieces on the board are rebuilt in the new set at once
    const onPcs = e => { if (!stopped && pos && e.detail && e.detail.id === 'foxgeese') { sel = null; clear(mv); rebuild(); } };
    addEventListener('atlas-pieces', onPcs);

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; clear(mv); clear(hl);
      moves = []; over = false; busy = true; sel = null; thinking = false; jid++;
      refresh(); legal = pos.moves(); const wait = setup(); hud('');
      later(() => { busy = false; next(); }, wait + 200);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; E.setRule(rule); if (!pvp) worker = newWorker(); begin(); }).catch(() => hud('⚠'));

    const dbg = {
      at: i => { const [x, z] = xz(i); return T3.project(x, z, U.top); },
      state: () => ({ moves: moves.length, side: pos && pos.side, human, pvp, over, busy, thinking, rule, sel: sel ? sel.pre.slice() : null, pieces: Object.keys(pcs).length, geese: pos && pos.geese, cap: pos && pos.cap }),
      legal: () => legal.map(m => ({ m, from: E.mFrom(m), to: E.mTo(m), path: E.path(m) })),
    };
    window.Atlas3D.foxgeese._dbg = dbg;
    const myTurn = () => !!pos && !over && !busy && !thinking && (pvp || pos.side + 1 === human);
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {
      if (over || !pos) return;
      over = true; busy = false; thinking = false; jid++; hintJ++; clear(mv); sel = null; if (ctx.onTurn) ctx.onTurn(-1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = X.win.replace('{p}', pname(3 - loser)); hud(wt); return later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: pname(loser), r, w: wt }), pvp: true, winnerText: wt }), 200); }
      hud(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r }), 200);
    }
    const api = {
      human: human - 1,
      canUndo: () => myTurn() && moves.length >= undoN() && (pvp || moves.length - undoN() >= (human === 2 ? 1 : 0)),
      undo() { if (!api.canUndo()) return; timers.forEach(clearTimeout); timers.length = 0; jid++; deselect(); moves.splice(moves.length - undoN()); refresh(); rebuild(); ply++; busy = false; next(); },
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
            E.path(m).map((s, k) => mark(hl, k ? GEO.dot : GEO.ring, MAT.hint, s, .06)).forEach(x => pulse(x, 2));
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, start: null, moves: mvs, level: Math.max(14, Math.min(17, ctx.level + 2)), rule });
        });
      },
      canDraw: () => false,   // (a draw only comes from the 80-move rule)
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.side + 1 : human, 'resign'); },
      timeout(side) { finish(side + 1, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick); removeEventListener('atlas-pieces', onPcs);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.foxgeese._dbg === dbg) delete window.Atlas3D.foxgeese._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card: Lv.1 … Lv.20 (foxgeese/i18n-fg*.js) ---------- */
  const LVD = {
    ja: ['入門：目先の1手だけを見る', '初級〜中級：跳ばれる形に気づく', '上級：数手先の囲みを読む', '最上級：深く読んで追いつめる'],
    en: ['Beginner: looks one move ahead', 'Novice–intermediate: notices geese that can be jumped', 'Advanced: reads the net a few moves ahead', 'Top: reads deep and closes in'],
    zh: ['入门：只看眼前一步', '初级～中级：会注意会被跳吃的棋形', '高级：能算几步之后的包围', '最高级：深算并步步紧逼'],
    ko: ['입문: 눈앞의 한 수만 본다', '초급~중급: 뛰어넘길 모양을 알아챈다', '상급: 몇 수 앞의 포위를 읽는다', '최상급: 깊이 읽고 몰아넣는다'],
    es: ['Principiante: solo mira una jugada', 'Novato–intermedio: ve las ocas que pueden ser saltadas', 'Avanzado: calcula el cerco unas jugadas más allá', 'Experto: calcula a fondo y va cerrando'],
    fr: ['Débutant : ne regarde qu’un coup', 'Novice–intermédiaire : repère les oies qu’on peut sauter', 'Avancé : calcule l’encerclement quelques coups plus loin', 'Expert : calcule en profondeur et resserre l’étau'],
    pt: ['Iniciante: olha só um lance', 'Novato–intermediário: percebe gansos que podem ser saltados', 'Avançado: calcula o cerco alguns lances à frente', 'Especialista: calcula fundo e vai fechando'],
    de: ['Anfänger: schaut nur einen Zug voraus', 'Einsteiger–Mittel: bemerkt Gänse, die übersprungen werden können', 'Fortgeschritten: rechnet das Netz ein paar Züge voraus', 'Experte: rechnet tief und zieht die Schlinge zu'],
    hi: ['शुरुआती: सिर्फ़ अगली चाल देखता है', 'नौसिखिया–मध्यम: कूदे जा सकने वाले कलहंस पहचान लेता है', 'उन्नत: कुछ चालें आगे का घेरा पढ़ता है', 'विशेषज्ञ: गहराई से पढ़कर घेरा कसता है'],
    ar: ['مبتدئ: يرى نقلة واحدة فقط', 'مبتدئ–متوسط: ينتبه للإوز المعرّض للقفز', 'متقدم: يحسب الحصار لبضع نقلات', 'خبير: يحسب بعمق ويضيّق الخناق'],
    ru: ['Начальный: видит на один ход', 'Новичок–средний: замечает гусей, через которых можно прыгнуть', 'Продвинутый: считает окружение на несколько ходов', 'Эксперт: считает глубоко и затягивает кольцо'],
    'zh-TW': ['入門：只看眼前一步', '初級～中級：會注意會被跳吃的棋形', '高級：能算幾步之後的包圍', '最高級：深算並步步進逼'],
    id: ['Pemula: hanya melihat satu langkah', 'Dasar–menengah: menyadari angsa yang bisa dilompati', 'Mahir: membaca kepungan beberapa langkah ke depan', 'Ahli: membaca dalam dan terus mempersempit'],
    tr: ['Başlangıç: yalnızca bir hamle ileriye bakar', 'Acemi–orta: üzerinden atlanabilecek kazları fark eder', 'İleri: kuşatmayı birkaç hamle ileriye okur', 'Uzman: derin okur ve çemberi daraltır'],
  };
  const RATING = [0, 450, 575, 700, 825, 950, 1075, 1200, 1325, 1450, 1575, 1700, 1825, 1950, 2030, 2090, 2150, 2200, 2250, 2450, 2500];   // foxgeese RT_LV (rated games; not measured yet — see the spec)
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
    ru: W7('для первой игры', 'когда знаете правила', 'когда освоились', 'для сильных игроков', 'трудно даже экспертам', 'самый сильный'),
    'zh-TW': W7('給第一次玩的人', '懂規則之後', '漸漸上手時', '給高手', '連專家都覺得難', '最強'),
    id: W7('untuk pemula', 'setelah tahu aturannya', 'mulai terbiasa', 'untuk pemain kuat', 'sulit bahkan bagi ahli', 'yang terkuat'),
    tr: W7('ilk kez oynayanlar için', 'kuralları bilince', 'alışmaya başlayınca', 'güçlü oyuncular için', 'uzmanlar için bile zor', 'en güçlüsü'),
  };
  function levelInfo(n, lang) {
    const D = LVD[lang] || LVD.en, W = WHO[lang] || WHO.en;
    return { name: '', desc: D[n <= 4 ? 0 : n <= 9 ? 1 : n <= 15 ? 2 : 3], rating: RATING[n], who: W[Math.min(n, 20) - 1] };
  }
  // the 種目 cards' pictures: the cross with its lines, the fox in the middle and the 13 / 17 geese
  function kindArt(sid, v) {
    const k = rix(v), u = 12, pd = 8, w = 6 * u + pd * 2, on = (x, y) => (x >= 2 && x <= 4) || (y >= 2 && y <= 4), P = (x, y) => `${pd + x * u} ${pd + y * u}`;
    let o = `<svg viewBox="0 0 ${w} ${w}" aria-hidden="true"><rect width="${w}" height="${w}" rx="6" fill="#6b4a2a"/><path d="M${pd + 2 * u - 6} ${pd - 6}h${2 * u + 12}v${2 * u}h${2 * u}v${2 * u + 12}h${-2 * u}v${2 * u}h${-2 * u - 12}v${-2 * u}h${-2 * u}v${-2 * u - 12}h${2 * u}z" fill="#c9a26a"/><g stroke="#5a3a1c" stroke-width=".8" fill="none">`;
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { if (!on(x, y)) continue;
      if (x < 6 && on(x + 1, y)) o += `<path d="M${P(x, y)}L${P(x + 1, y)}"/>`; if (y < 6 && on(x, y + 1)) o += `<path d="M${P(x, y)}L${P(x, y + 1)}"/>`;
      if ((x + y) % 2 === 0) { if (x < 6 && y < 6 && on(x + 1, y + 1)) o += `<path d="M${P(x, y)}L${P(x + 1, y + 1)}"/>`; if (x > 0 && y < 6 && on(x - 1, y + 1)) o += `<path d="M${P(x, y)}L${P(x - 1, y + 1)}"/>`; } }
    o += '</g>';
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) if (on(x, y) && (y >= 4 || (k === 1 && y === 3 && (x < 2 || x > 4)))) o += `<circle cx="${pd + x * u}" cy="${pd + y * u}" r="3.6" fill="#f4ead6" stroke="#8a7550" stroke-width=".5"/>`;
    return o + `<circle cx="${pd + 3 * u}" cy="${pd + 3 * u}" r="4.6" fill="#c8501e" stroke="#6a2a12" stroke-width=".6"/></svg>`;
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.foxgeese = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', kindFirst: true, sizes: RSZ, size0: 13, sizeLabel: () => 'Rules',
    sizeName: (z, l) => rn(l).n[rix(z)], optInfo: (sid, v, l) => sid === 'bvSize' ? { sub: rn(l).d[rix(v)] } : null, kindArt, levelInfo, start };
})();
