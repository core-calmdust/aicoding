/* =====================================================================
   The Royal Game of Ur on the portal.
   · The board card (levels, sides, modes): level names = the game's 15 kyu … 5 dan (ur/i18n.js),
     ratings = the game's RT_LV (ur/app.js), descriptions = its lvd lines.
   · No table play on the chabudai: "Play" opens the full game in its 3D skin (ur/?skin=atlas,
     atlas/skin/ur.js) with the level / side / mode picked here (FULL_SKIN in atlas/app.js).
   ===================================================================== */
(function () {
  'use strict';
  const KYU = { ja: '{n}級', en: '{n} kyu', zh: '{n}级', ko: '{n}급', es: '{n} kyu', fr: '{n} kyu', pt: '{n} kyu', de: '{n}. Kyu', hi: '{n} क्यू', ar: '{n} كيو' };
  const DAN = {
    ja: ['初段', '二段', '三段', '四段', '五段'], en: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], zh: ['初段', '二段', '三段', '四段', '五段'], ko: ['초단', '2단', '3단', '4단', '5단'],
    es: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], fr: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], pt: ['1 dan', '2 dan', '3 dan', '4 dan', '5 dan'], de: ['1. Dan', '2. Dan', '3. Dan', '4. Dan', '5. Dan'],
    hi: ['1 दान', '2 दान', '3 दान', '4 दान', '5 दान'], ar: ['1 دان', '2 دان', '3 دان', '4 دان', '5 دان'],
  };
  const LVD = {
    ja: ['入門：目に任せて動かす', '初級〜中級：ロゼットと取りを考える', '上級：危険と勝率を読む', '最上級：期待値を読み切る（最強はほぼ最善）'],
    en: ['Beginner: moves by luck', 'Novice to intermediate: thinks about rosettes and captures', 'Advanced: weighs risks and win chances', 'Expert: reads the expectations through (the top level is nearly perfect)'],
    zh: ['入门：凭运气走', '初级～中级：会考虑花格和吃子', '高级：权衡风险与胜率', '专家：算尽期望值（最强接近最佳）'],
    ko: ['입문: 운에 맡겨 둔다', '초급~중급: 로제트와 잡기를 생각한다', '상급: 위험과 승률을 읽는다', '전문가: 기댓값을 끝까지 읽는다(최강은 거의 최선)'],
    es: ['Principiante: mueve al azar', 'Inicial a intermedio: piensa en rosetas y capturas', 'Avanzado: sopesa riesgos y probabilidades', 'Experto: calcula las esperanzas (el máximo es casi perfecto)'],
    fr: ['Débutant : joue au hasard', 'Novice à intermédiaire : pense aux rosaces et aux prises', 'Avancé : pèse risques et chances', 'Expert : calcule les espérances (le sommet est presque parfait)'],
    pt: ['Iniciante: joga ao acaso', 'Básico a intermediário: pensa em rosetas e capturas', 'Avançado: pesa riscos e chances', 'Especialista: calcula as expectativas (o topo é quase perfeito)'],
    de: ['Einsteiger: zieht nach Glück', 'Anfänger bis Mittel: denkt an Rosetten und Schlagen', 'Fortgeschritten: wägt Risiko und Chancen ab', 'Experte: rechnet die Erwartung durch (die Spitze ist fast perfekt)'],
    hi: ['शुरुआती: किस्मत से चलता है', 'नौसिखिया से मध्यम: रोज़ेट और पकड़ के बारे में सोचता है', 'उन्नत: जोखिम और संभावना तौलता है', 'विशेषज्ञ: अपेक्षाएँ पूरी गणना करता है (सबसे ऊपर लगभग सर्वोत्तम)'],
    ar: ['مبتدئ: يتحرك بالحظ', 'مبتدئ إلى متوسط: يفكر في الورود والأسر', 'متقدم: يوازن المخاطر والفرص', 'خبير: يحسب التوقعات حتى النهاية (الأقوى شبه مثالي)'],
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
  };
  // the game's measured rating of each AI level (ur/app.js RT_LV)
  const RATING = [0, 600, 660, 715, 725, 735, 800, 865, 930, 990, 1070, 1155, 1240, 1325, 1375, 1430, 1485, 1535, 1550, 1570, 1610];
  function levelInfo(n, lang) {
    const name = 'Lv.' + n;
    const d = LVD[lang] || LVD.en, w = WHO[lang] || WHO.en;
    return { name, desc: d[n <= 4 ? 0 : n <= 9 ? 1 : n <= 15 ? 2 : 3], rating: RATING[n], who: w[n <= 2 ? 0 : n <= 5 ? 1 : n <= 8 ? 2 : n <= 11 ? 3 : n <= 15 ? 4 : n <= 18 ? 5 : 6] };
  }
  /* ================= table play (ちゃぶ台で遊ぶ) =================
     A Finkel game on the chabudai with the game's own rules and AI (../ur/engine.js on the page, ../ur/worker.js for the
     AI, levels 1..20, the same files as the full game). Two players on one device too. The board, pieces and tetrahedral
     dice are the full game's 3D set (atlas/models/ur.js, through atlas/games/ur-kit.js). Rated games: the full game. */
  const BASE = '../ur/', EV = '?v=2';   // same files (and cache keys) as ur/index.html
  let engP = null;
  function loadEngine() {
    if (window.UrEngine) return Promise.resolve(window.UrEngine);
    return engP || (engP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = BASE + 'engine.js' + EV; s.onload = () => window.UrEngine ? res(window.UrEngine) : rej(new Error('engine')); s.onerror = () => { engP = null; rej(new Error('engine')); }; document.head.appendChild(s); }));
  }
  const TX = {
    ja: { n: ['明', '暗'], roll: '振る', pass: 'パス', tapRoll: '盤をタップして振る', pick: '光る駒をタップ', dest: '行き先をタップ', again: 'ロゼット！もう一度', zero: '0 — 進めません', noMove: '動かせる駒がありません', cap: '取った！', home: 'ゴール！', turnP: '{p}の番', win: '{p}の勝ち', first: '{p}が先手', aiZero: 'AIは0 — パス', aiNoMove: 'AIは動けません', left: '残り', inHome: 'ゴール' },
    en: { n: ['Light', 'Dark'], roll: 'Roll', pass: 'Pass', tapRoll: 'Tap the board to roll', pick: 'Tap a glowing piece', dest: 'Tap where to go', again: 'Rosette! Roll again', zero: '0 — no move', noMove: 'No piece can move', cap: 'Captured!', home: 'Home!', turnP: "{p}'s turn", win: '{p} wins', first: '{p} starts', aiZero: 'AI rolled 0 — pass', aiNoMove: 'AI cannot move', left: 'left', inHome: 'home' },
    zh: { n: ['明', '暗'], roll: '掷骰', pass: '跳过', tapRoll: '点击棋盘掷骰', pick: '点击发光的棋子', dest: '点击目的地', again: '花格！再掷一次', zero: '0 — 不能走', noMove: '没有可走的棋子', cap: '吃子！', home: '到达！', turnP: '轮到{p}', win: '{p}获胜', first: '{p}先走', aiZero: 'AI掷出0 — 跳过', aiNoMove: 'AI无法走', left: '剩余', inHome: '到达' },
    ko: { n: ['밝은 쪽', '어두운 쪽'], roll: '굴리기', pass: '패스', tapRoll: '판을 탭해서 굴리기', pick: '빛나는 말을 탭', dest: '갈 곳을 탭', again: '로제트! 한 번 더', zero: '0 — 못 움직여요', noMove: '움직일 말이 없어요', cap: '잡았다!', home: '골인!', turnP: '{p} 차례', win: '{p} 승리', first: '{p} 선공', aiZero: 'AI가 0 — 패스', aiNoMove: 'AI가 움직일 수 없어요', left: '남음', inHome: '골' },
    es: { n: ['Claras', 'Oscuras'], roll: 'Tirar', pass: 'Pasar', tapRoll: 'Toca el tablero para tirar', pick: 'Toca una ficha brillante', dest: 'Toca el destino', again: '¡Roseta! Tira otra vez', zero: '0 — sin movimiento', noMove: 'Ninguna ficha puede mover', cap: '¡Capturada!', home: '¡En casa!', turnP: 'Turno: {p}', win: 'Ganan {p}', first: 'Empiezan {p}', aiZero: 'La IA sacó 0 — pasa', aiNoMove: 'La IA no puede mover', left: 'quedan', inHome: 'en casa' },
    fr: { n: ['Clairs', 'Sombres'], roll: 'Lancer', pass: 'Passer', tapRoll: 'Touchez le plateau pour lancer', pick: 'Touchez un pion lumineux', dest: 'Touchez la destination', again: 'Rosace ! Relancez', zero: '0 — pas de coup', noMove: 'Aucun pion ne peut bouger', cap: 'Pris !', home: 'Arrivé !', turnP: 'Aux {p}', win: 'Les {p} gagnent', first: 'Les {p} commencent', aiZero: 'L’IA fait 0 — passe', aiNoMove: 'L’IA ne peut pas jouer', left: 'restants', inHome: 'arrivés' },
    pt: { n: ['Claras', 'Escuras'], roll: 'Lançar', pass: 'Passar', tapRoll: 'Toque no tabuleiro para lançar', pick: 'Toque numa peça brilhante', dest: 'Toque no destino', again: 'Roseta! Lance de novo', zero: '0 — sem lance', noMove: 'Nenhuma peça pode mover', cap: 'Capturou!', home: 'Chegou!', turnP: 'Vez das {p}', win: 'Vencem as {p}', first: 'As {p} começam', aiZero: 'A IA tirou 0 — passa', aiNoMove: 'A IA não pode mover', left: 'restam', inHome: 'em casa' },
    de: { n: ['Hell', 'Dunkel'], roll: 'Würfeln', pass: 'Passen', tapRoll: 'Aufs Brett tippen zum Würfeln', pick: 'Leuchtenden Stein antippen', dest: 'Ziel antippen', again: 'Rosette! Noch einmal', zero: '0 — kein Zug', noMove: 'Kein Stein kann ziehen', cap: 'Geschlagen!', home: 'Im Ziel!', turnP: '{p} am Zug', win: '{p} gewinnt', first: '{p} beginnt', aiZero: 'KI würfelt 0 — passt', aiNoMove: 'Die KI kann nicht ziehen', left: 'übrig', inHome: 'im Ziel' },
    hi: { n: ['उजला', 'गहरा'], roll: 'फेंकें', pass: 'पास', tapRoll: 'बोर्ड छूकर पासे फेंकें', pick: 'चमकता मोहरा छुएँ', dest: 'जगह छुएँ', again: 'रोज़ेट! फिर से', zero: '0 — चाल नहीं', noMove: 'कोई मोहरा नहीं चल सकता', cap: 'पकड़ा!', home: 'घर!', turnP: '{p} की बारी', win: '{p} की जीत', first: '{p} पहले', aiZero: 'AI ने 0 — पास', aiNoMove: 'AI चल नहीं सकता', left: 'बाकी', inHome: 'घर' },
    ar: { n: ['الفاتح', 'الداكن'], roll: 'ارمِ', pass: 'تمرير', tapRoll: 'المس اللوحة للرمي', pick: 'المس قطعة مضيئة', dest: 'المس الوجهة', again: 'وردة! ارمِ مرة أخرى', zero: '0 — لا حركة', noMove: 'لا قطعة تستطيع الحركة', cap: 'أُسرت!', home: 'وصلت!', turnP: 'دور {p}', win: 'فوز {p}', first: '{p} يبدأ', aiZero: 'الذكاء رمى 0 — تمرير', aiNoMove: 'الذكاء لا يستطيع الحركة', left: 'متبقية', inHome: 'وصلت' },
  };
  // sounds (the portal's sound switch): shell on shell, a rattle of bone dice, a soft chime for the rosette
  const SND = (() => {
    let C = null;
    const ac = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {} try { C = C || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    const tone = (a, t0, f0, f1, dur, vol, type) => { const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .004); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .02); };
    const noise = (a, t0, dur, vol, f) => { const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * dur | 0, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4); n.buffer = b; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.3; const g = a.createGain(); g.gain.value = vol; n.connect(bp).connect(g).connect(a.destination); n.start(t0); };
    const at = f => { const a = ac(); if (a) try { f(a, a.currentTime + .005); } catch (e) {} };
    return {
      put: () => at((a, t) => { tone(a, t, 380, 170, .09, .16); noise(a, t, .035, .4, 3200); }),
      hop: () => at((a, t) => { noise(a, t, .02, .18, 4200); }),
      take: () => at((a, t) => { tone(a, t, 260, 90, .2, .2); noise(a, t, .06, .3, 1200); }),
      roll: () => at((a, t) => { for (let i = 0; i < 6; i++) noise(a, t + i * .07 + Math.random() * .03, .03, .25 + Math.random() * .2, 2600 + Math.random() * 1600); }),
      dieStop: () => at((a, t) => { noise(a, t, .025, .3, 3000); }),
      ros: () => at((a, t) => [659.25, 987.77].forEach((f, i) => tone(a, t + i * .09, f, 0, .5, .08, 'triangle'))),
      home: () => at((a, t) => [523.25, 659.25, 783.99].forEach((f, i) => tone(a, t + i * .07, f, 0, .4, .07, 'triangle'))),
    };
  })();
  const DK = ['background:radial-gradient(circle at 35% 30%,#fff,#ece3cf 55%,#c9b994);box-shadow:inset 0 0 0 1px rgba(110,90,50,.35)', 'background:radial-gradient(circle at 35% 30%,#6b6f78,#3a3d44 55%,#202227);box-shadow:inset 0 0 0 1px rgba(0,0,0,.4)'];

  function start(ctx) {
    const T3 = ctx.Table3D, t = ctx.t, X = Object.assign({}, TX.en, TX[ctx.lang] || {});
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose') };
    const pvp = ctx.mode === 'pvp', level = Math.max(1, Math.min(20, +ctx.level || 6));
    const human = pvp ? 0 : ctx.side === 2 ? 1 : 0;   // ctx.side: 1 = you start (Light), 2 = the AI starts. You always play Light (the near row)
    let design = 'orig'; try { design = ((JSON.parse(localStorage.getItem('aicoding-ur') || '{}') || {}).settings || {}).pieces || 'orig'; } catch (e) {}
    const kit = window.UrKit.make(T3, { design, sfx: k => SND[k] && SND[k]() });
    const pname = s => pvp ? X.n[s] : s === 0 ? L.you : L.ai;
    let E = null, st = null, roll = null, phase = 'wait', over = false, stopped = false, busy = false, sel = -1, ply = 0, worker = null, jid = 0, hist = [], hintMv = null, hintJ = 0, msg = '';
    const jobs = new Map(), timers = [];
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const sleep = ms => new Promise(r => later(r, ms));
    const first = pvp ? 0 : human === 0 ? 0 : 1;   // the side that starts (engine side 0 = Light = you)
    const HUD_SIDE = s => s;                       // HUD pill / clock: Light left (0), Dark right (1)
    const onTurn = s => { ply++; if (ctx.onTurn) ctx.onTurn(s < 0 ? -1 : HUD_SIDE(s), { human: s >= 0 && (pvp || s === 0), ply }); };
    const mine = () => st && !over && (pvp || st.turn === 0);
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    // the portal's phone-landscape layout (#bv.pland, app.js LAND 'side'): the cards in a column at the left, the board straight
    // from above in the room beside them (as the full game's landscape page); otherwise the kit's own framing
    const bvEl = ctx.el.parentNode, isPL = () => !!(bvEl && bvEl.classList.contains('pland'));
    function frame() { if (stopped) return; if (T3.fit) T3.fit(isPL() ? { w: kit.U.W + .7, d: kit.U.D + 2.1, y: kit.Y, pitch: 1.5 } : kit.fit0); if (isPL() !== plWas) { plWas = isPL(); hud(); } }
    let plWas = null;
    const onPL = () => { frame(); setTimeout(frame, 350); };
    addEventListener('atlasland', onPL); addEventListener('resize', onPL);

    /* ---------- HUD ---------- */
    function hud() {
      if (stopped) return;
      const goal = E ? E.RULES.finkel.goal : 15;
      const home = s => st ? st.pos[s].filter(p => p >= goal).length : 0;
      const side = s => `<span class="hs ${st && st.turn === s && !over ? 'on' : ''}"><i class="dk" style="${DK[s]};width:18px;height:18px;border-radius:50%;display:inline-block;flex:none"></i>${pname(s)}<b>${home(s)}</b></span>`;
      const btn = phase === 'roll' && mine() ? `<button type="button" class="btn urb go" data-urt="roll">🎲 ${X.roll}</button>` : phase === 'pass' && mine() ? `<button type="button" class="btn urb go" data-urt="pass">${X.pass}</button>` : `<span class="hm">${msg}</span>`;
      if (isPL()) {   // phone held sideways: the full game's landscape cards in a column — the rival above, you below; the roll button
        // (or the message) in the box of the side to move
        const act = phase === 'roll' && mine() ? `<button type="button" class="urb" data-urt="roll">${X.roll}</button>` : phase === 'pass' && mine() ? `<button type="button" class="urb" data-urt="pass">${X.pass}</button>` : esc(msg);
        const card = s => `<div class="urc ${st && st.turn === s && !over ? 'on' : ''}"><div class="urc-h"><i class="dk" style="${DK[s]};width:18px;height:18px;border-radius:50%;display:inline-block;flex:none"></i><span>${esc(pvp ? X.n[s] : s === 0 ? L.you : `${L.ai} Lv.${level}`)}</span><b>${home(s)}</b><small>/7 ${esc(X.inHome)}</small></div><div class="urc-b">${(st ? st.turn === s : s === first) || over ? act : ''}</div></div>`;
        ctx.hud(`${card(1)}${card(0)}`);
      } else ctx.hud(`${side(0)}${btn}${side(1)}`);
      if (phase === 'roll' || phase === 'pass') { if (msg) toast(msg); }
    }
    let toastEl = null, toastT = 0;
    const css = document.createElement('style');
    css.textContent = '.hud .urb{padding:8px 16px;font-size:15px;white-space:nowrap;box-shadow:0 3px 0 var(--coral2)}.urtoast{position:fixed;left:50%;top:calc(76px + env(safe-area-inset-top));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:9px 18px;border-radius:99px;background:#2b3044;color:#fff;font-weight:900;font-size:14px;box-shadow:0 8px 22px rgba(0,0,0,.3);pointer-events:none;animation:urT .25s ease-out;white-space:nowrap}@keyframes urT{from{transform:translate(-50%,-8px);opacity:0}}@media (max-width:560px){.hud .urb{padding:7px 11px;font-size:13px}}';
    document.head.appendChild(css);
    function toast(m) { if (toastEl) toastEl.remove(); clearTimeout(toastT); if (!m) return; toastEl = document.createElement('div'); toastEl.className = 'urtoast'; toastEl.textContent = m; document.body.appendChild(toastEl); const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 1800); }
    const say = m => { msg = m || ''; hud(); };

    /* ---------- marks: the pieces that can move, the destination of the selected one ---------- */
    const goalOf = () => E.RULES.finkel.goal;
    const legal = () => roll && roll.n ? E.legalMoves(st, roll.n) : [];
    const kOf = (side, from) => st.pos[side].findIndex(p => p === from);
    const rcOf = (side, i) => { const q = E.coords('finkel', side, i); return q ? { r: q[0], c: q[1] } : null; };
    function showMarks() {
      kit.marks.clear();
      if (lastMv) { if (lastMv.from) kit.marks.cell(lastMv.from.r, lastMv.from.c, 0xffd65a, .14); if (lastMv.to) kit.marks.cell(lastMv.to.r, lastMv.to.c, 0xffd65a, .28); }
      if (phase !== 'move' || !mine()) return;
      const s = st.turn, ms = legal();
      for (const m of ms) {
        const hot = hintMv && hintMv.from === m.from;
        if (m.from === 0) kit.marks.tray(s, 'start', hot ? 0xff7a1a : 0xffd65a, st.pos[s].filter(p => p <= 0).length - 1);
        else { const q = rcOf(s, m.from); kit.marks.ring(q.r, q.c, hot ? 0xff7a1a : 0xffd65a); }
      }
      const show = sel >= 0 ? ms.filter(m => m.from === sel) : hintMv ? ms.filter(m => m.from === hintMv.from) : [];
      for (const m of show) {
        const col = m.capture ? 0xff5d5d : m.rosette ? 0x6ec8ff : 0x3df59a;
        if (m.finish) kit.marks.tray(s, 'goal', col, st.pos[s].filter(p => p >= goalOf()).length);
        else { const q = rcOf(s, m.to); kit.marks.cell(q.r, q.c, col, .42); kit.marks.ring(q.r, q.c, col); }
        kit.marks.path(s, m.from + 1, Math.min(m.to, goalOf() - 1), 0xfff3b0);
      }
    }
    let lastMv = null;
    function setSel(from) {
      if (sel >= 0) { const k = kOf(st.turn, sel); if (k >= 0) kit.lift(st.turn, k, false); }
      sel = from;
      if (sel >= 0) { const k = kOf(st.turn, sel); if (k >= 0) kit.lift(st.turn, k, true); }
      showMarks(); say(sel >= 0 ? X.dest : X.pick);
    }

    /* ---------- the flow ---------- */
    function patternOf(n) {   // four dice showing n white tips, in a random order
      const d = [0, 0, 0, 0]; const idx = [0, 1, 2, 3].sort(() => Math.random() - .5); for (let i = 0; i < n; i++) d[idx[i]] = 1; return d;
    }
    async function doRoll() {
      if (phase !== 'roll' || busy || over) return;
      busy = true; phase = 'anim'; say('');
      const r0 = E.rollDice(Math.random, 'finkel'), r = { d: r0.dice, n: r0.n };
      await kit.roll(st.turn, r.d); if (stopped) return;
      roll = r; busy = false;
      kit.marks.clear();
      afterRoll();
    }
    function afterRoll() {
      const ms = legal();
      if (!ms.length) {
        phase = 'pass'; say(roll.n ? X.noMove : X.zero); toast(roll.n ? X.noMove : X.zero);
        if (!pvp && st.turn === 1) later(() => commit(null), 1100);
        else later(() => { if (phase === 'pass' && !stopped) commit(null); }, 1600);   // a pass goes over by itself (a tap does it at once)
        return;
      }
      if (!pvp && st.turn === 1) { aiMove(ms); return; }
      phase = 'move'; sel = -1; hintMv = null;
      if (ms.length === 1) { setSel(ms[0].from); } else { showMarks(); say(X.pick); }
    }
    async function commit(m) {
      if (over || stopped || (phase !== 'move' && phase !== 'pass' && phase !== 'ai')) return;
      busy = true; phase = 'anim'; hintMv = null; hintJ++;
      const s = st.turn;
      if (m) {
        if (sel >= 0) { const k = kOf(s, sel); if (k >= 0) kit.lift(s, k, false); }
        sel = -1; kit.marks.clear();
        await kit.move(s, m.from, m.to, { capture: m.capture, onStep: () => SND.hop(), onHit: () => SND.take(), onLand: () => (m.finish ? SND.home : SND.put)() });
        if (stopped) return;
      }
      if (s === 0 || pvp) hist.push({ st: E.clone(st), roll: roll && { d: roll.d.slice(), n: roll.n } });
      const res = E.apply(st, m);
      st = res.state; roll = null; busy = false;
      const tq = m ? (m.finish ? null : rcOf(s, m.to)) : null; lastMv = m ? { from: m.from > 0 ? rcOf(s, m.from) : null, to: tq } : null;
      kit.sync(st); showMarks();
      if (m && m.capture) toast(X.cap); else if (m && m.finish) toast(X.home);
      if (st.winner >= 0) return end(st.winner);
      if (res.again) { SND.ros(); toast(X.again); }
      nextTurn();
    }
    function nextTurn() {
      if (over || stopped) return;
      onTurn(st.turn);
      kit.restDice(st.turn, null);
      if (!pvp && st.turn === 1) { phase = 'ai'; say(L.think); later(doAIRoll, 520); return; }
      phase = 'roll'; say(pvp ? X.turnP.replace('{p}', X.n[st.turn]) : '');
    }
    async function doAIRoll() {
      if (over || stopped) return;
      busy = true; const r0 = E.rollDice(Math.random, 'finkel'), r = { d: r0.dice, n: r0.n };
      await kit.roll(1, r.d); if (stopped) return;
      roll = r; busy = false; kit.marks.clear();
      const ms = legal();
      if (!ms.length) { phase = 'ai'; say(roll.n ? X.aiNoMove : X.aiZero); toast(roll.n ? X.aiNoMove : X.aiZero); later(() => commit(null), 1200); return; }
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
      const w = 420 - (Date.now() - t0); if (w > 0) await sleep(w);
      say(''); commit(m);
    }
    function end(w) {
      over = true; phase = 'over'; kit.marks.clear(); onTurn(-1);
      const wt = X.win.replace('{p}', X.n[w]);
      SND.home();
      if (pvp) { say(wt); return later(() => ctx.onEnd({ win: false, draw: false, level, score: wt, pvp: true, winnerText: wt }), 700); }
      const lostHome = st.pos[1 - w].filter(p => p >= goalOf()).length;
      say(w === 0 ? L.win : L.lose);
      later(() => ctx.onEnd({ win: w === 0, draw: false, level, score: `7 : ${lostHome}` }), 700);
    }

    /* ---------- taps ---------- */
    function onClick(e) {
      if (stopped || T3.wasDrag() || busy) return;
      if (phase === 'roll' && mine()) { doRoll(); return; }
      if (phase === 'pass' && mine()) { commit(null); return; }
      if (phase !== 'move' || !mine()) return;
      const h = kit.hit(e), s = st.turn, ms = legal(); if (!h) { if (sel >= 0) setSel(-1); return; }
      // a destination of the selected piece
      if (sel >= 0) {
        const m = ms.find(x => x.from === sel && (h.tray ? (h.tray === 'goal' && h.side === s && x.finish) : (!x.finish && (q => q.r === h.r && q.c === h.c)(rcOf(s, x.to)))));
        if (m) { commit(m); return; }
      }
      // a piece (or the start tray) of the side to move
      let from = -1;
      if (h.tray === 'start' && h.side === s) from = 0;
      else if (!h.tray) { const i = E.pathOf('finkel', s).findIndex(q => q[0] === h.r && q[1] === h.c) + 1; if (i > 0 && st.pos[s].includes(i)) from = i; }
      // tapping the destination square of the only piece that goes there
      if (from < 0 && !h.tray) { const c = ms.filter(x => !x.finish && (q => q.r === h.r && q.c === h.c)(rcOf(s, x.to))); if (c.length === 1) { commit(c[0]); return; } }
      if (from >= 0 && ms.some(x => x.from === from)) { setSel(from === sel ? -1 : from); return; }
      if (from >= 0) toast(X.noMove);
      setSel(-1);
    }
    function onHud(e) {
      const b = e.target.closest && e.target.closest('[data-urt]'); if (!b || stopped) return;
      e.stopPropagation();
      if (b.dataset.urt === 'roll') doRoll(); else if (b.dataset.urt === 'pass') commit(null);
    }
    ctx.el.addEventListener('click', onClick);
    document.addEventListener('click', onHud, true);
    const onKey = e => { if (e.key !== ' ' || e.repeat || stopped) return; if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return; if (phase === 'roll' && mine()) { e.preventDefault(); doRoll(); } else if (phase === 'pass' && mine()) { e.preventDefault(); commit(null); } };
    document.addEventListener('keydown', onKey);

    /* ---------- go ---------- */
    frame();
    loadEngine().then(e => {
      if (stopped) return; E = e;
      st = E.newGame('finkel', first); kit.sync(st); kit.restDice(st.turn, null);
      if (!pvp) ask(st, 2);   // warms the worker up while the board lands
      toast(X.first.replace('{p}', pname(first)));
      later(() => nextTurn(), 700);
    }).catch(e => { console.error('[ur table]', e); say('⚠'); });

    /* ---------- 待った · ヒント · 投了 · time-out ---------- */
    function finish(loser, why) {
      if (over || !st) return;
      over = true; phase = 'over'; busy = false; kit.marks.clear(); onTurn(-1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = X.win.replace('{p}', X.n[1 - loser]); say(wt); return later(() => ctx.onEnd({ win: false, draw: false, level, score: t('act.pvpEnd', { p: X.n[loser], r, w: wt }), pvp: true, winnerText: wt }), 200); }
      say(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level, score: r }), 200);
    }
    const api = {
      human: 0,
      // 待った: back to the start of your last turn (before its roll); vs the AI the AI's turns after it go too
      canUndo: () => !stopped && !over && !busy && mine() && (phase === 'roll' || phase === 'move' || phase === 'pass') && hist.length > 0,
      undo() {
        if (!api.canUndo()) return;
        const h = hist.pop(); st = E.clone(h.st); roll = null; sel = -1; hintMv = null; hintJ++; lastMv = null;
        kit.sync(st); kit.marks.clear(); onTurn(st.turn); kit.restDice(st.turn, null); phase = 'roll'; say('');
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
        stopped = true; kit.stop(); timers.forEach(clearTimeout); removeEventListener('atlasland', onPL); removeEventListener('resize', onPL);
        ctx.el.removeEventListener('click', onClick); document.removeEventListener('click', onHud, true); document.removeEventListener('keydown', onKey);
        if (worker) worker.terminate(); worker = null; jobs.clear(); css.remove(); if (toastEl) toastEl.remove();
      },
      _debug: { st: () => st && { pos: st.pos.map(a => a.slice()), turn: st.turn, winner: st.winner }, phase: () => phase, roll: () => roll, busy: () => busy, legal: () => E && st ? legal() : [], sel: () => sel, kit,
        cell: (r, c) => kit.projCell(r, c), piece: (s, k) => kit.projPiece(s, k), slot: (s, kind, k) => kit.projSlot(s, kind, k), hint: () => hintMv },
    };
    window.__urTable = api;   // (tests)
    return api;
  }

  window.Atlas3D = window.Atlas3D || {};
  // table: true — ちゃぶ台で遊ぶ (AI / two players, start() above); フル機能 opens ur/?skin=atlas (rated games there)
  window.Atlas3D.ur = { levels: 20, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, land: 'side', tableModes: ['ai', 'pvp'], clock: 'bg', levelInfo, start, SND };   // SND: shared with the rules tour (atlas/rules/ur.js)
})();
