/* =====================================================================
   Senet on the portal.
   · The board card (levels, sides, modes): Lv.1–20, ratings = the game's RT_LV (senet/app.js), descriptions = its lvd lines.
   · ちゃぶ台で遊ぶ: a standard game (5 pieces each) on the 3D game box with the game's own rules and AI (../senet/engine.js,
     ../senet/worker.js, the same files as the full game). Two players on one device too. Rated games: the full game
     (senet/?skin=atlas). The box, pieces and sticks: atlas/models/senet.js through atlas/games/senet-kit.js.
   ===================================================================== */
(function () {
  'use strict';
  const LVD = {
    ja: ['入門：出た目に任せて動かす', '初級〜中級：入れ替えとペアを考える', '上級：危険と勝率を読む', '最上級：先の投げまで読み切る'],
    en: ['Beginner: moves as the sticks fall', 'Novice–intermediate: thinks about swaps and pairs', 'Advanced: weighs risk and odds', 'Expert: reads ahead through the next throws'],
    zh: ['入门：随点数走', '初级〜中级：考虑互换与成对', '高级：权衡风险与胜率', '顶级：算到之后的投掷'],
    ko: ['입문: 나온 눈대로 움직임', '초급~중급: 교체와 짝을 생각', '상급: 위험과 승률을 읽음', '최상급: 다음 던지기까지 읽음'],
    es: ['Inicial: mueve según caen los palos', 'Novato–intermedio: piensa en cambios y parejas', 'Avanzado: pesa riesgo y probabilidades', 'Experto: calcula las próximas tiradas'],
    fr: ['Débutant : joue au gré des bâtonnets', 'Novice–intermédiaire : pense aux échanges et aux paires', 'Avancé : pèse risques et chances', 'Expert : calcule les lancers suivants'],
    pt: ['Iniciante: move como caem os bastões', 'Novato–intermediário: pensa em trocas e pares', 'Avançado: pesa risco e chances', 'Especialista: calcula os próximos lances'],
    de: ['Einsteiger: zieht, wie die Stäbe fallen', 'Anfänger–Mittel: denkt an Tausch und Paare', 'Fortgeschritten: wägt Risiko und Chancen', 'Experte: rechnet die nächsten Würfe durch'],
    hi: ['आरंभिक: अंक के हिसाब से चलता है', 'शुरुआती–मध्यम: अदला-बदली और जोड़ी सोचता है', 'उन्नत: जोखिम और संभावना तौलता है', 'विशेषज्ञ: अगली फेंकों तक पढ़ता है'],
    ar: ['مبتدئ: يتحرك كما تقع العصيّ', 'مبتدئ–متوسط: يفكر في التبادل والأزواج', 'متقدم: يزن الخطر والاحتمالات', 'خبير: يحسب الرميات القادمة'],
    ru: ['Новичок: ходит как выпадет', 'Начальный–средний: думает об обменах и парах', 'Продвинутый: взвешивает риск и шансы', 'Эксперт: просчитывает следующие броски'],
    'zh-TW': ['入門：照點數隨意走', '初級～中級：會考慮交換與成對', '高級：權衡風險與機率', '專家：預讀接下來的投擲'],
    id: ['Pemula: bergerak sesuai lemparan', 'Pemula–menengah: memikirkan tukar dan pasangan', 'Mahir: menimbang risiko dan peluang', 'Ahli: memperhitungkan lemparan berikutnya'],
    tr: ['Başlangıç: çubuklar nasıl düşerse öyle oynar', 'Acemi–orta: takasları ve çiftleri düşünür', 'İleri: riski ve olasılıkları tartar', 'Uzman: sonraki atışları önceden hesaplar'],
  };
  const WHO = {
    ja: ['はじめて', 'ルールを覚えた人', '何局か遊んだ人', '慣れた人', '強い人', '上級者', '達人'],
    en: ['First game', 'Knows the rules', 'Has played a few games', 'Regular player', 'Strong player', 'Expert', 'Master'],
    zh: ['第一次玩', '刚学会规则', '玩过几局', '熟练玩家', '强手', '高手', '大师'],
    ko: ['처음', '규칙을 익힌 사람', '몇 판 둬 본 사람', '익숙한 사람', '강한 사람', '고수', '달인'],
    es: ['Primera partida', 'Conoce las reglas', 'Ha jugado algunas partidas', 'Jugador habitual', 'Jugador fuerte', 'Experto', 'Maestro'],
    fr: ['Première partie', 'Connaît les règles', 'A joué quelques parties', 'Joueur régulier', 'Joueur fort', 'Expert', 'Maître'],
    pt: ['Primeira partida', 'Conhece as regras', 'Já jogou algumas partidas', 'Jogador habitual', 'Jogador forte', 'Especialista', 'Mestre'],
    de: ['Erste Partie', 'Kennt die Regeln', 'Hat ein paar Partien gespielt', 'Geübter Spieler', 'Starker Spieler', 'Experte', 'Meister'],
    hi: ['पहला खेल', 'नियम जानता है', 'कुछ खेल खेले हैं', 'नियमित खिलाड़ी', 'मज़बूत खिलाड़ी', 'विशेषज्ञ', 'उस्ताद'],
    ar: ['أول مباراة', 'يعرف القواعد', 'لعب بضع مباريات', 'لاعب معتاد', 'لاعب قوي', 'خبير', 'أستاذ'],
    ru: ['Первая игра', 'Знает правила', 'Сыграл несколько партий', 'Играет регулярно', 'Сильный игрок', 'Эксперт', 'Мастер'],
    'zh-TW': ['第一次玩', '懂規則', '玩過幾局', '常玩', '強手', '專家', '大師'],
    id: ['Permainan pertama', 'Tahu aturannya', 'Pernah main beberapa kali', 'Pemain rutin', 'Pemain kuat', 'Ahli', 'Master'],
    tr: ['İlk oyun', 'Kuralları biliyor', 'Birkaç oyun oynadı', 'Düzenli oyuncu', 'Güçlü oyuncu', 'Uzman', 'Usta'],
  };
  const RATING = [0, 831, 853, 877, 896, 915, 930, 951, 969, 983, 1000, 1010, 1021, 1035, 1046, 1053, 1063, 1070, 1074, 1078, 1081];   // senet/app.js RT_LV
  function levelInfo(n, lang) {
    const d = LVD[lang] || LVD.en, w = WHO[lang] || WHO.en;
    return { name: 'Lv.' + n, desc: d[n <= 4 ? 0 : n <= 9 ? 1 : n <= 15 ? 2 : 3], rating: RATING[n], who: w[n <= 2 ? 0 : n <= 5 ? 1 : n <= 8 ? 2 : n <= 11 ? 3 : n <= 15 ? 4 : n <= 18 ? 5 : 6] };
  }
  const BASE = '../senet/', EV = '?v=4';
  const loadJS = (src, ok) => ok() ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const loadEngine = () => loadJS(BASE + 'engine.js' + EV, () => !!window.SenetEngine).then(() => window.SenetEngine);
  const TX = {
    ja: { n: ['糸巻き', '円錐'], roll: '投げる', pass: 'パス', pick: '光る駒をタップ', dest: '行き先をタップ', again: 'もう一度投げる！', noMove: '動かせる駒がありません', aiNoMove: 'AI：動かせる駒なし', cap: '入れ替え！', home: '上がり！', water: '水の家…15へ戻る', first: '先手：{p}', turnP: '{p}の番', win: '{p}の勝ち', off: '上がり' },
    en: { n: ['Spools', 'Cones'], roll: 'Throw', pass: 'Pass', pick: 'Tap a glowing piece', dest: 'Tap where to go', again: 'Throw again!', noMove: 'No piece can move', aiNoMove: 'AI: no move', cap: 'Swap!', home: 'Off!', water: 'Into the water… back to 15', first: 'First: {p}', turnP: '{p} to throw', win: '{p} win', off: 'off' },
    zh: { n: ['线轴', '圆锥'], roll: '投掷', pass: '跳过', pick: '点击发光的棋子', dest: '点击目的地', again: '再投一次！', noMove: '没有可走的棋子', aiNoMove: 'AI：无棋可走', cap: '互换！', home: '移出！', water: '落水…退回15', first: '先手：{p}', turnP: '轮到{p}', win: '{p}获胜', off: '已出' },
    ko: { n: ['실패', '원뿔'], roll: '던지기', pass: '패스', pick: '빛나는 말을 탭', dest: '갈 곳을 탭', again: '한 번 더!', noMove: '움직일 말이 없어요', aiNoMove: 'AI: 움직일 수 없음', cap: '교체!', home: '나감!', water: '물에 빠짐… 15로', first: '선: {p}', turnP: '{p} 차례', win: '{p} 승리', off: '나감' },
    es: { n: ['Carretes', 'Conos'], roll: 'Lanzar', pass: 'Pasar', pick: 'Toca una pieza brillante', dest: 'Toca el destino', again: '¡Lanza otra vez!', noMove: 'Ninguna pieza puede moverse', aiNoMove: 'IA: sin jugada', cap: '¡Intercambio!', home: '¡Fuera!', water: 'Al agua… vuelve a la 15', first: 'Empieza: {p}', turnP: 'Turno de {p}', win: 'Ganan los {p}', off: 'fuera' },
    fr: { n: ['Bobines', 'Cônes'], roll: 'Lancer', pass: 'Passer', pick: 'Touchez un pion lumineux', dest: 'Touchez la destination', again: 'Relancez !', noMove: 'Aucun pion ne peut bouger', aiNoMove: 'IA : aucun coup', cap: 'Échange !', home: 'Sorti !', water: 'À l’eau… retour en 15', first: 'Commence : {p}', turnP: 'Aux {p}', win: 'Les {p} gagnent', off: 'sortis' },
    pt: { n: ['Carretéis', 'Cones'], roll: 'Lançar', pass: 'Passar', pick: 'Toque numa peça brilhante', dest: 'Toque no destino', again: 'Lance de novo!', noMove: 'Nenhuma peça pode mover', aiNoMove: 'IA: sem jogada', cap: 'Troca!', home: 'Fora!', water: 'Na água… volta à 15', first: 'Começa: {p}', turnP: 'Vez dos {p}', win: 'Vencem os {p}', off: 'fora' },
    de: { n: ['Spulen', 'Kegel'], roll: 'Werfen', pass: 'Passen', pick: 'Leuchtende Figur antippen', dest: 'Ziel antippen', again: 'Noch einmal werfen!', noMove: 'Keine Figur kann ziehen', aiNoMove: 'KI: kein Zug', cap: 'Tausch!', home: 'Draußen!', water: 'Ins Wasser … zurück auf 15', first: 'Beginn: {p}', turnP: '{p} am Zug', win: '{p} gewinnen', off: 'raus' },
    hi: { n: ['फिरकी', 'शंकु'], roll: 'फेंकें', pass: 'पास', pick: 'चमकती गोटी छुएँ', dest: 'जगह छुएँ', again: 'फिर फेंकें!', noMove: 'कोई गोटी नहीं चल सकती', aiNoMove: 'AI: चाल नहीं', cap: 'अदला-बदली!', home: 'बाहर!', water: 'पानी में… 15 पर वापस', first: 'पहले: {p}', turnP: '{p} की बारी', win: '{p} जीते', off: 'बाहर' },
    ar: { n: ['البكرات', 'المخاريط'], roll: 'ارمِ', pass: 'تمرير', pick: 'المس قطعة مضيئة', dest: 'المس الوجهة', again: 'ارمِ مرة أخرى!', noMove: 'لا قطعة تتحرك', aiNoMove: 'الذكاء: لا حركة', cap: 'تبادل!', home: 'خرجت!', water: 'في الماء… عودة إلى 15', first: 'يبدأ: {p}', turnP: 'دور {p}', win: 'فازت {p}', off: 'خارج' },
    ru: { n: ['Катушки', 'Конусы'], roll: 'Бросить', pass: 'Пас', pick: 'Нажмите на светящуюся фишку', dest: 'Нажмите, куда идти', again: 'Бросайте ещё!', noMove: 'Ходить нечем', aiNoMove: 'ИИ: хода нет', cap: 'Обмен!', home: 'Вышла!', water: 'В воду… назад на 15', first: 'Первыми ходят: {p}', turnP: 'Бросают: {p}', win: '{p} победили', off: 'вышли' },
    'zh-TW': { n: ['線軸', '圓錐'], roll: '投擲', pass: '跳過', pick: '點選發光的棋子', dest: '點選要去的位置', again: '再投一次！', noMove: '沒有可走的棋子', aiNoMove: 'AI：無法走', cap: '交換！', home: '走出！', water: '落水……回到 15', first: '先手：{p}', turnP: '輪到{p}投擲', win: '{p}獲勝', off: '已出' },
    id: { n: ['Gulungan', 'Kerucut'], roll: 'Lempar', pass: 'Lewati', pick: 'Ketuk bidak yang menyala', dest: 'Ketuk tujuan', again: 'Lempar lagi!', noMove: 'Tidak ada bidak yang bisa bergerak', aiNoMove: 'AI: tidak ada langkah', cap: 'Tukar!', home: 'Keluar!', water: 'Masuk air… kembali ke 15', first: 'Pertama: {p}', turnP: 'Giliran {p} melempar', win: '{p} menang', off: 'keluar' },
    tr: { n: ['Makaralar', 'Koniler'], roll: 'At', pass: 'Pas', pick: 'Parlayan bir taşa dokun', dest: 'Gideceğin yere dokun', again: 'Tekrar at!', noMove: 'Hiçbir taş oynayamaz', aiNoMove: 'YZ: hamle yok', cap: 'Takas!', home: 'Çıktı!', water: 'Suya düştü… 15\'e geri', first: 'İlk: {p}', turnP: 'Atma sırası: {p}', win: '{p} kazandı', off: 'çıktı' },
  };
  // sounds (the portal's sound switch): wood on wood, the clatter of the sticks, a soft chime for the extra throw
  const SND = (() => {
    let C = null;
    const ac = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {} try { C = C || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    const tone = (a, t0, f0, f1, dur, vol, type) => { const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .008); g.gain.exponentialRampToValueAtTime(.0005, t0 + dur); o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + .02); };
    const noise = (a, t0, dur, vol, f) => { const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * dur | 0, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); n.buffer = b; const fl = a.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; const g = a.createGain(); g.gain.value = vol; n.connect(fl); fl.connect(g); g.connect(a.destination); n.start(t0); };
    const at = f => { const a = ac(); if (a) try { f(a, a.currentTime + .005); } catch (e) {} };
    return {
      put: () => at((a, t) => { tone(a, t, 360, 170, .09, .15); noise(a, t, .035, .35, 2400); }),
      hop: () => at((a, t) => { noise(a, t, .02, .16, 3600); }),
      take: () => at((a, t) => { tone(a, t, 260, 120, .2, .16); noise(a, t, .06, .25, 1400); }),
      roll: () => at((a, t) => { for (let i = 0; i < 5; i++) noise(a, t + i * .06 + Math.random() * .03, .05, .22 + Math.random() * .15, 1300 + Math.random() * 800); }),
      dieStop: () => at((a, t) => { noise(a, t, .03, .25, 1800); }),
      ros: () => at((a, t) => [659.25, 987.77].forEach((f, i) => tone(a, t + i * .09, f, 0, .5, .08, 'triangle'))),
      water: () => at((a, t) => { noise(a, t, .35, .2, 500); tone(a, t, 420, 160, .5, .06); }),
      home: () => at((a, t) => [523.25, 659.25, 783.99].forEach((f, i) => tone(a, t + i * .07, f, 0, .4, .07, 'triangle'))),
    };
  })();
  const DK = ['background:radial-gradient(circle at 35% 30%,#fff,#efe2c3 55%,#c9b98f);box-shadow:inset 0 0 0 1px rgba(110,90,50,.35)', 'background:radial-gradient(circle at 35% 30%,#6b5a4a,#3a2a1c 55%,#1b120a);box-shadow:inset 0 0 0 1px rgba(0,0,0,.4)'];
  const PAT = n => { const a = [0, 0, 0, 0]; if (n < 5) { const ix = [0, 1, 2, 3].sort(() => Math.random() - .5); for (let i = 0; i < n; i++) a[ix[i]] = 1; } return a; };

  function start(ctx) {
    const T3 = ctx.Table3D, t = ctx.t, X = Object.assign({}, TX.en, TX[ctx.lang] || {});
    const L = { you: t('p.you'), ai: t('p.ai'), think: t('p.think'), win: t('res.win'), lose: t('res.lose') };
    const pvp = ctx.mode === 'pvp', level = Math.max(1, Math.min(20, +ctx.level || 6));
    const human = pvp ? 0 : ctx.side === 2 ? 1 : 0;
    let look = 'tut', dsg = 'tut'; try { const S = (JSON.parse(localStorage.getItem('aicoding-senet') || '{}') || {}).settings || {}; look = S.pieces || 'tut'; dsg = S.design || 'tut'; } catch (e) {}
    let kit = null;
    const pname = s => pvp ? X.n[s] : s === 0 ? L.you : L.ai;
    let E = null, st = null, roll = null, phase = 'wait', over = false, stopped = false, busy = false, sel = -1, ply = 0, worker = null, jid = 0, hist = [], hintMv = null, hintJ = 0, msg = '', lastMv = null;
    const jobs = new Map(), timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const sleep = ms => new Promise(r => later(r, ms));
    const first = pvp ? 0 : human === 0 ? 0 : 1;
    const onTurn = s => { ply++; if (ctx.onTurn) ctx.onTurn(s, { human: s >= 0 && (pvp || s === 0), ply }); };
    const mine = () => st && !over && (pvp || st.turn === 0);
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const bvEl = ctx.el.parentNode, isPL = () => !!(bvEl && bvEl.classList.contains('pland'));
    let plWas = null;
    function frame() { if (stopped || !kit) return; if (T3.fit) { if (isPL()) T3.fit({ w: kit.U.W + .7, d: kit.U.D + 2.6, y: kit.Y, pitch: 1.5 }); else applyFocus(); } if (isPL() !== plWas) { plWas = isPL(); hud(); } }

    /* ---------- the focus (phones held upright, 2026-11-09 — as Ludo's): the long board seen whole is narrow, so the camera moves in
       to the board's full width and pans along it to what matters now — the sticks before a throw, the pieces that can move and
       where they go after it, the piece on its way while it walks — gliding (no cut); a span too long for the close view zooms out,
       up to the whole board. The button at the right edge switches it off (the whole board), remembered in atlas-senet-zoom. ---------- */
    let zoomPref = true; try { zoomPref = localStorage.getItem('atlas-senet-zoom') !== '0'; } catch (e) {}
    const tallNow = () => innerHeight > innerWidth * 1.15 && !isPL() && kit && kit.fit0.roll;
    let focusX = null;   // [x0, x1]: the stretch of the board (world x, along the track) to keep in view
    function applyFocus() {
      if (!T3.fit || stopped || !kit) return;
      if (zoomBtn) { zoomBtn.hidden = !tallNow() || over; zoomBtn.classList.toggle('off', !zoomPref); }
      const F = kit.fit0;
      if (!(zoomPref && tallNow() && focusX)) { T3.fit(Object.assign({}, F, { ease: true })); return; }
      const W = kit.U.W, w = kit.U.D + 1.9, d = Math.max(5.4, focusX[1] - focusX[0] + 2.4);
      if (d >= F.d - .6) { T3.fit(Object.assign({}, F, { ease: true })); return; }
      const el = ctx.el, asp = (el.clientHeight || innerHeight) / (el.clientWidth || innerWidth), vis = Math.max(d, w * asp * .78);   // (.78: the part of the height left between Quit and the HUD)
      const lim = Math.max(0, W / 2 + .6 - vis / 2), cx = Math.max(-lim, Math.min(lim, (focusX[0] + focusX[1]) / 2));
      T3.fit({ w, d, y: F.y, pitch: F.pitch, roll: F.roll, up: F.up, cx, cz: 0, ease: true });
    }
    const sqX = sq => sq >= 31 ? kit.U.W / 2 - .3 : kit.U.pt(sq)[0];
    function focus(xs) { focusX = xs && xs.length ? [Math.min(...xs), Math.max(...xs)] : null; applyFocus(); }
    const focusSticks = () => focus([-kit.U.W / 2 + .7, -kit.U.W / 2 + 2.6]);   // the sticks lie beside the start end
    const focusMoves = ms => focus(ms.reduce((a, m) => a.concat([sqX(m.from), sqX(m.finish ? 31 : m.to)], m.water && m.dest ? [sqX(m.dest)] : []), []));
    let zoomBtn = null;
    {
      const ZL = { ja: ['手番に寄る', '盤全体を見る'], en: ['Zoom to the player', 'Whole board'], zh: ['聚焦当前玩家', '查看整个棋盘'], 'zh-TW': ['聚焦目前玩家', '查看整個棋盤'], ko: ['차례인 사람에게 확대', '판 전체 보기'], es: ['Acercar al turno', 'Tablero entero'], fr: ['Zoom sur le joueur', 'Plateau entier'], pt: ['Aproximar da vez', 'Tabuleiro inteiro'], de: ['Zum Spieler zoomen', 'Ganzes Brett'], ru: ['Приблизить к ходящему', 'Вся доска'], tr: ['Sıradakine yakınlaş', 'Tüm tahta'], id: ['Perbesar ke giliran', 'Seluruh papan'], hi: ['बारी वाले पर ज़ूम', 'पूरा बोर्ड'], ar: ['تقريب إلى صاحب الدور', 'اللوحة كاملة'] };
      const zl = ZL[ctx.lang] || ZL.en;
      zoomBtn = document.createElement('button'); zoomBtn.type = 'button'; zoomBtn.className = 'ldzoom sn'; zoomBtn.hidden = true;
      const paint = () => { const t2 = zoomPref ? zl[1] : zl[0]; zoomBtn.title = t2; zoomBtn.setAttribute('aria-label', t2);
        zoomBtn.innerHTML = zoomPref ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M10.5 8v5M8 10.5h5"/></svg>'; };
      paint();
      zoomBtn.onclick = e => { e.stopPropagation(); zoomPref = !zoomPref; try { localStorage.setItem('atlas-senet-zoom', zoomPref ? '1' : '0'); } catch (er) {} paint(); applyFocus(); };
      (ctx.el.parentNode || document.body).appendChild(zoomBtn);
    }
    const onPL = () => { frame(); setTimeout(frame, 350); };
    addEventListener('atlasland', onPL); addEventListener('resize', onPL);

    /* ---------- HUD ---------- */
    function hud() {
      if (stopped) return;
      const off = s => st ? st.pos[s].filter(p => p >= 31).length : 0;
      const side = s => `<span class="hs ${st && st.turn === s && !over ? 'on' : ''}"><i class="dk" style="${DK[s]};width:18px;height:18px;border-radius:50%;display:inline-block;flex:none"></i>${esc(pname(s))}<b>${off(s)}</b></span>`;
      const btn = phase === 'roll' && mine() ? `<button type="button" class="btn urb go" data-snt="roll">${esc(X.roll)}</button>` : phase === 'pass' && mine() ? `<button type="button" class="btn urb go" data-snt="pass">${esc(X.pass)}</button>` : `<span class="hmsg">${esc(msg)}</span>`;
      if (isPL()) {
        const act = phase === 'roll' && mine() ? `<button type="button" class="urb" data-snt="roll">${esc(X.roll)}</button>` : phase === 'pass' && mine() ? `<button type="button" class="urb" data-snt="pass">${esc(X.pass)}</button>` : esc(msg);
        const card = s => `<div class="urc ${st && st.turn === s && !over ? 'on' : ''}"><div class="urc-h"><i class="dk" style="${DK[s]};width:18px;height:18px;border-radius:50%;display:inline-block;flex:none"></i><span>${esc(pname(s))}</span><b>${off(s)}</b><small>/${st ? st.pos[s].length : 5}</small></div>${st && st.turn === s && !over ? `<div class="urc-b">${act}</div>` : ''}</div>`;
        ctx.hud(`${card(1)}${card(0)}`);
      } else ctx.hud(`${side(0)}${btn}${side(1)}`);
    }
    let toastEl = null, toastT = 0;
    const css = document.createElement('style');
    css.textContent = '.ldzoom{position:absolute;z-index:4;right:12px;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.92);color:#3a3f55;box-shadow:0 3px 10px rgba(0,0,0,.22);display:grid;place-items:center;cursor:pointer;padding:0}.ldzoom svg{width:22px;height:22px}.ldzoom[hidden]{display:none}.ldzoom.sn{top:72px;transform:none}.ldzoom.off{color:#e0662a}.hud .urb{padding:8px 16px;font-size:15px;white-space:nowrap;box-shadow:0 3px 0 var(--coral2)}.hud .hmsg{font-size:13px;color:#6a7088;padding:0 8px;white-space:nowrap}.urtoast{position:fixed;left:50%;top:calc(76px + env(safe-area-inset-top));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:9px 18px;border-radius:99px;background:rgba(255,253,247,.97);border:2px solid #fff;box-shadow:0 6px 18px -6px rgba(80,40,0,.45);font:800 14px var(--round,sans-serif);color:#2b3044;text-align:center;pointer-events:none;animation:sntIn .25s ease}@keyframes sntIn{from{opacity:0;transform:translate(-50%,-6px)}}';
    document.head.appendChild(css);
    function toast(m) { if (toastEl) toastEl.remove(); clearTimeout(toastT); if (!m) return; toastEl = document.createElement('div'); toastEl.className = 'urtoast'; toastEl.textContent = m; document.body.appendChild(toastEl); const el = toastEl; toastT = setTimeout(() => el.remove(), 1600); }
    const say = m => { msg = m || ''; hud(); };

    /* ---------- marks ---------- */
    const legal = () => roll ? E.legalMoves(st, roll.n) : [];
    const kOf = (side, from) => st.pos[side].findIndex(p => p === from);
    function showMarks() {
      kit.marks.clear();
      if (lastMv) { if (lastMv.from) kit.marks.cell(lastMv.from, 0xffd65a, .14); if (lastMv.to) kit.marks.cell(lastMv.to, 0xffd65a, .28); }
      if (phase === 'roll' && mine()) kit.marks.frame();
      if (phase !== 'move' || !mine()) return;
      const s = st.turn, ms = legal();
      for (const m of ms) kit.marks.ring(m.from, hintMv && hintMv.from === m.from ? 0xff7a1a : 0xffd65a);
      const show = sel >= 0 ? ms.filter(m => m.from === sel) : hintMv ? ms.filter(m => m.from === hintMv.from) : [];
      for (const m of show) {
        const col = m.capture ? 0xff5d5d : m.water ? 0x4da3ff : 0x3df59a;
        if (m.finish) kit.marks.tray(s, col, st.pos[s].filter(p => p >= 31).length);
        else { kit.marks.cell(m.to, col, .42); kit.marks.ring(m.to, col); }
        kit.marks.path(m.from + 1, Math.min(m.to, 30), 0xfff3b0);
      }
    }
    function setSel(from) {
      if (sel >= 0) { const k = kOf(st.turn, sel); if (k >= 0) kit.lift(st.turn, k, false); }
      sel = from;
      if (sel >= 0) { const k = kOf(st.turn, sel); if (k >= 0) kit.lift(st.turn, k, true); }
      showMarks(); say(sel >= 0 ? X.dest : X.pick); { const ms = legal(); focusMoves(sel >= 0 ? ms.filter(m => m.from === sel) : ms); }
    }

    /* ---------- the flow ---------- */
    async function doRoll() {
      if (phase !== 'roll' || busy || over) return;
      busy = true; phase = 'anim'; say(''); kit.marks.clear();
      const r0 = E.rollDice(Math.random), r = { d: r0.dice, n: r0.n };
      await kit.roll(st.turn, r.d); if (stopped) return;
      roll = r; busy = false; afterRoll();
    }
    function afterRoll() {
      const ms = legal();
      if (!ms.length) {
        phase = 'pass'; const ag = E.AGAIN(roll.n); say(X.noMove); toast(X.noMove + (ag ? ' — ' + X.again : ''));
        if (!pvp && st.turn === 1) later(() => commit(null), 1100);
        else later(() => { if (phase === 'pass' && !stopped) commit(null); }, 1600);
        return;
      }
      if (!pvp && st.turn === 1) { aiMove(ms); return; }
      phase = 'move'; sel = -1; hintMv = null; focusMoves(ms);
      if (ms.length === 1) setSel(ms[0].from); else { showMarks(); say(X.pick); }
    }
    async function commit(m) {
      if (over || stopped || (phase !== 'move' && phase !== 'pass' && phase !== 'ai')) return;
      busy = true; phase = 'anim'; hintMv = null; hintJ++;
      const s = st.turn, n = roll.n;
      if (m) {
        if (sel >= 0) { const k = kOf(s, sel); if (k >= 0) kit.lift(s, k, false); }
        sel = -1; kit.marks.clear(); focusMoves([m]);
        await kit.move(s, m, { onStep: () => SND.hop(), onHit: () => SND.take(), onWater: () => SND.water(), onLand: () => (m.finish ? SND.home : SND.put)() });
        if (stopped) return;
      }
      if (s === 0 || pvp) hist.push({ st: E.clone(st) });
      const res = E.apply(st, m, n);
      st = res.state; roll = null; busy = false;
      lastMv = m ? { from: m.from, to: m.finish ? null : (m.water ? m.dest : m.to) } : null;
      kit.sync(st);
      if (m && m.capture) toast(X.cap); else if (m && m.water) toast(X.water); else if (m && m.finish) toast(X.home);
      if (st.winner >= 0) return end(st.winner);
      if (res.again) { SND.ros(); if (!(m && (m.capture || m.water || m.finish))) toast(X.again); }
      nextTurn();
    }
    function nextTurn() {
      if (over || stopped) return;
      onTurn(st.turn);
      kit.restSticks(st.turn, null);
      if (!pvp && st.turn === 1) { phase = 'ai'; say(L.think); showMarks(); focusSticks(); later(doAIRoll, 520); return; }
      phase = 'roll'; showMarks(); say(pvp ? X.turnP.replace('{p}', X.n[st.turn]) : ''); focusSticks();
    }
    async function doAIRoll() {
      if (over || stopped) return;
      busy = true; const r0 = E.rollDice(Math.random), r = { d: r0.dice, n: r0.n };
      await kit.roll(1, r.d); if (stopped) return;
      roll = r; busy = false;
      const ms = legal();
      if (!ms.length) { phase = 'ai'; say(X.aiNoMove); toast(X.aiNoMove); later(() => commit(null), 1100); return; }
      aiMove(ms);
    }
    function ask(state, n) {
      if (!worker) { try { worker = new Worker(BASE + 'worker.js' + EV); worker.onmessage = e => { const j = jobs.get(e.data.id); if (j) { jobs.delete(e.data.id); j(e.data); } }; worker.onerror = () => { jobs.forEach(j => j({})); jobs.clear(); worker = false; }; } catch (e) { worker = false; } }
      if (!worker) return Promise.resolve({ move: (() => { const m = E.think(state, n, level); return m && { from: m.from, to: m.to }; })() });
      return new Promise(r => { const id = ++jid; jobs.set(id, r); worker.postMessage({ id, type: 'think', state: E.clone(state), n, level }); });
    }
    async function aiMove(ms) {
      phase = 'ai'; say(L.think);
      const t0 = Date.now(), r = await ask(st, roll.n); if (stopped || over) return;
      let m = r && r.move ? ms.find(x => x.from === r.move.from) : null; if (!m) m = E.think(st, roll.n, level) || ms[0];
      // AIの着手は即時（前の手のアニメは終わっている）
      say(''); commit(m);
    }
    function end(w) {
      over = true; phase = 'over'; kit.marks.clear(); onTurn(-1); focus(null);
      const wt = X.win.replace('{p}', X.n[w]);
      SND.home();
      if (pvp) { say(wt); return later(() => ctx.onEnd({ win: false, draw: false, level, score: wt, pvp: true, winnerText: wt }), 700); }
      const lost = st.pos[1 - w].filter(p => p >= 31).length;
      say(w === 0 ? L.win : L.lose);
      later(() => ctx.onEnd({ win: w === 0, draw: false, level, score: `${st.pos[w].length} : ${lost}` }), 700);
    }

    /* ---------- taps ---------- */
    function onClick(e) {
      if (stopped || T3.wasDrag() || busy || !kit) return;
      if (phase === 'roll' && mine()) { doRoll(); return; }
      if (phase === 'pass' && mine()) { commit(null); return; }
      if (phase !== 'move' || !mine()) return;
      const h = kit.hit(e), s = st.turn, ms = legal(); if (!h) { if (sel >= 0) setSel(-1); return; }
      if (sel >= 0) { const m = ms.find(x => x.from === sel && (h.tray ? x.finish && h.side === s : !x.finish && x.to === h.sq)); if (m) { commit(m); return; } }
      let from = -1;
      if (h.sq && st.pos[s].includes(h.sq)) from = h.sq;
      if (from < 0 && h.sq) { const c = ms.filter(x => !x.finish && x.to === h.sq); if (c.length === 1) { commit(c[0]); return; } }
      if (from < 0 && h.tray && h.side === s) { const c = ms.filter(x => x.finish); if (c.length === 1) { commit(c[0]); return; } }
      if (from >= 0 && ms.some(x => x.from === from)) { if (sel === from) { const only = ms.filter(x => x.from === from); if (only.length === 1) { commit(only[0]); return; } } setSel(from === sel ? -1 : from); return; }
      if (from >= 0) toast(X.noMove);
      setSel(-1);
    }
    function onHud(e) {
      const b = e.target.closest && e.target.closest('[data-snt]'); if (!b || stopped) return;
      e.stopPropagation();
      if (b.dataset.snt === 'roll') doRoll(); else if (b.dataset.snt === 'pass') commit(null);
    }
    ctx.el.addEventListener('click', onClick);
    document.addEventListener('click', onHud, true);
    const onKey = e => { if (e.key !== ' ' || e.repeat || stopped) return; if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return; if (phase === 'roll' && mine()) { e.preventDefault(); doRoll(); } else if (phase === 'pass' && mine()) { e.preventDefault(); commit(null); } };
    document.addEventListener('keydown', onKey);

    /* ---------- go ---------- */
    loadJS(BASE + 'sprites.js?v=1', () => !!window.SENET_SPRITES).catch(() => null).then(() => loadJS(BASE + 'board2d.js?v=6', () => !!window.SenetBoard2D)).catch(() => null).then(loadEngine).then(e => {
      if (stopped) return; E = e;
      kit = window.SenetKit.make(T3, { design: dsg, pieces: look, sfx: k => SND[k] && SND[k]() });
      frame();
      st = E.newGame('std', first); kit.sync(st); kit.restSticks(st.turn, null);
      if (!pvp) ask(st, 2);
      toast(X.first.replace('{p}', pname(first)));
      later(() => nextTurn(), 700);
    }).catch(e => { console.error('[senet table]', e); say('⚠'); });

    /* ---------- 待った · ヒント · 投了 · time-out ---------- */
    function finish(loser, why) {
      if (over || !st) return;
      over = true; phase = 'over'; busy = false; if (kit) kit.marks.clear(); onTurn(-1); if (kit) focus(null);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = X.win.replace('{p}', X.n[1 - loser]); say(wt); return later(() => ctx.onEnd({ win: false, draw: false, level, score: t('act.pvpEnd', { p: X.n[loser], r, w: wt }), pvp: true, winnerText: wt }), 200); }
      say(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level, score: r }), 200);
    }
    const api = {
      human: 0,
      canUndo: () => !stopped && !over && !busy && mine() && (phase === 'roll' || phase === 'move' || phase === 'pass') && hist.length > 0,
      undo() {
        if (!api.canUndo()) return;
        const h = hist.pop(); st = E.clone(h.st); roll = null; sel = -1; hintMv = null; hintJ++; lastMv = null;
        kit.sync(st); kit.marks.clear(); onTurn(st.turn); kit.restSticks(st.turn, null); phase = 'roll'; showMarks(); say(''); focusSticks();
      },
      canHint: () => !stopped && !over && !busy && phase === 'move' && mine() && legal().length > 0,
      hint() {
        if (!api.canHint()) return Promise.resolve(false);
        const j = ++hintJ, best = E.evaluate(st, roll.n, { depth: 2 })[0];
        if (j !== hintJ || !best) return Promise.resolve(false);
        hintMv = best.move; if (sel >= 0) setSel(-1); showMarks(); say(X.pick);
        return Promise.resolve(true);
      },
      canResign: () => !stopped && !over && !!st,
      resign() { if (!over && st) finish(pvp ? st.turn : 0, 'resign'); },
      timeout(side) { finish(side, 'time'); },
      stop() {
        stopped = true; if (kit) kit.stop(); timers.forEach(clearTimeout); removeEventListener('atlasland', onPL); removeEventListener('resize', onPL);
        ctx.el.removeEventListener('click', onClick); document.removeEventListener('click', onHud, true); document.removeEventListener('keydown', onKey);
        if (worker) worker.terminate(); worker = null; jobs.clear(); css.remove(); if (toastEl) toastEl.remove(); if (zoomBtn) zoomBtn.remove();
      },
      _debug: { st: () => st && { pos: st.pos.map(a => a.slice()), turn: st.turn, winner: st.winner }, phase: () => phase, roll: () => roll, busy: () => busy, legal: () => E && st ? legal() : [], sel: () => sel, kit: () => kit,
        cell: sq => kit && kit.projCell(sq), piece: (s, k) => kit && kit.projPiece(s, k), sticks: s => kit && kit.projSticks(s) },
    };
    window.__senetTable = api;
    return api;
  }

  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.senet = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, land: 'side', tableModes: ['ai', 'pvp'], clock: 'bg', levelInfo, start, SND };
})();
