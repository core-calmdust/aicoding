/* =====================================================================
   Mancala on the portal.
   • The board card: 10 AI levels (names / descriptions from the full game,
     mancala/i18n.js 'lv' / 'lvd'), first / second, 4 or 6 seeds per pit,
     AI game or two players on one device. フル機能 opens mancala/?skin=atlas.
   • ちゃぶ台で遊ぶ (table: true): Kalah on the piano-black 3D board
     (atlas/models/mancala.js) with the game's own rules (../mancala/engine.js,
     loaded on demand: trace() gives the sowing events) and its AI worker (the
     same alpha-beta search / endgame solver and level 1..10 as the full game).
     Tap one of your pits: the gems are lifted into a "hand" above the pit and
     dropped one by one into the following pits / your store (the 2D game's
     「ふつう」 speed), captures fly into the store, an extra turn is announced.
     Gold engraved numbers beside every hollow show its count.
   Adapter contract: see atlas/games/reversi.js.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../mancala/', EV = '20261028B10';   // same engine file (and cache key) as the full game
  let engLoad = null;
  function loadEngine() {   // the rules on the main thread (window.MancalaEngine: trace / legal)
    if (window.MancalaEngine) return Promise.resolve();
    return engLoad || (engLoad = new Promise((res, rej) => { const s = document.createElement('script'); s.src = BASE + 'engine.js?v=' + EV; s.onload = res; s.onerror = rej; document.head.appendChild(s); }));
  }
  const LV = {"ja":["","入門","初級","初級+","中級","中級+","上級","上級+","達人","名人","最強"],"en":["","Novice","Beginner","Beginner+","Casual","Casual+","Strong","Strong+","Expert","Master","Grandmaster"],"zh":["","入门","初级","初级+","中级","中级+","高级","高级+","达人","大师","最强"],"ko":["","입문","초급","초급+","중급","중급+","상급","상급+","달인","명인","최강"],"es":["","Novato","Principiante","Principiante+","Aficionado","Aficionado+","Fuerte","Fuerte+","Experto","Maestro","Gran maestro"],"fr":["","Novice","Débutant","Débutant+","Amateur","Amateur+","Fort","Fort+","Expert","Maître","Grand maître"],"pt":["","Novato","Iniciante","Iniciante+","Amador","Amador+","Forte","Forte+","Especialista","Mestre","Grão-mestre"],"de":["","Neuling","Anfänger","Anfänger+","Hobby","Hobby+","Stark","Stark+","Experte","Meister","Großmeister"],"hi":["","नौसिखिया","शुरुआती","शुरुआती+","सामान्य","सामान्य+","मज़बूत","मज़बूत+","विशेषज्ञ","उस्ताद","महाउस्ताद"],"ar":["","مستجد","مبتدئ","مبتدئ+","هاوٍ","هاوٍ+","قوي","قوي+","خبير","أستاذ","أستاذ كبير"]};
  const LVD = {"ja":["","でたらめにまく","ときどき一番多く取る手","いつも一番多く取る手（連続手も）","2手読み","4手読み","6手読み","8手読み","約0.4秒の深読み","約1秒・終盤は読み切り","約2秒・深読み＋終盤は完全読み"],"en":["","sows at random","sometimes takes the most","always takes the most this turn (with chains)","looks 2 moves ahead","looks 4 moves ahead","looks 6 moves ahead","looks 8 moves ahead","deep search, ~0.4 s","~1 s, solves the endgame","~2 s, deep search + perfect endgame"],"zh":["","随便播","有时取最多的手","总是取本回合最多（含连续）","看2步","看4步","看6步","看8步","深度搜索约0.4秒","约1秒·残局算尽","约2秒·深度搜索＋残局完美"],"ko":["","무작위로 뿌림","가끔 가장 많이 얻는 수","항상 이번 차례 최대 (연속 포함)","2수 읽기","4수 읽기","6수 읽기","8수 읽기","약 0.4초 깊은 읽기","약 1초·종반은 완전 읽기","약 2초·깊은 읽기＋완벽한 종반"],"es":["","siembra al azar","a veces toma lo máximo","siempre toma lo máximo del turno (con cadenas)","ve 2 jugadas","ve 4 jugadas","ve 6 jugadas","ve 8 jugadas","búsqueda profunda, ~0,4 s","~1 s, resuelve el final","~2 s, búsqueda profunda + final perfecto"],"fr":["","sème au hasard","prend parfois le maximum","prend toujours le maximum du tour (enchaînements compris)","voit 2 coups","voit 4 coups","voit 6 coups","voit 8 coups","recherche profonde, ~0,4 s","~1 s, résout la fin","~2 s, recherche profonde + fin parfaite"],"pt":["","semeia ao acaso","às vezes pega o máximo","sempre pega o máximo da vez (com encadeamentos)","vê 2 lances","vê 4 lances","vê 6 lances","vê 8 lances","busca profunda, ~0,4 s","~1 s, resolve o final","~2 s, busca profunda + final perfeito"],"de":["","sät zufällig","nimmt manchmal das Maximum","nimmt immer das Maximum des Zugs (mit Ketten)","sieht 2 Züge","sieht 4 Züge","sieht 6 Züge","sieht 8 Züge","tiefe Suche, ~0,4 s","~1 s, löst das Endspiel","~2 s, tiefe Suche + perfektes Endspiel"],"hi":["","यादृच्छिक बोता है","कभी-कभी सबसे ज़्यादा लेता है","हमेशा इस बारी में सबसे ज़्यादा (कड़ियों सहित)","2 चाल आगे देखता है","4 चाल आगे देखता है","6 चाल आगे देखता है","8 चाल आगे देखता है","गहरी खोज, ~0.4 से.","~1 से., अंत का हल","~2 से., गहरी खोज + सटीक अंत"],"ar":["","يبذر عشوائيًا","يأخذ الأكثر أحيانًا","يأخذ دائمًا أكثر ما في الدور (مع السلاسل)","يرى نقلتين للأمام","يرى 4 نقلات","يرى 6 نقلات","يرى 8 نقلات","بحث عميق، ~0.4 ث","~1 ث، يحل النهاية","~2 ث، بحث عميق + نهاية مثالية"]};
  // who a level suits (the portal's shared wording, as in reversi): level 1..10 → group
  const WHO = {
    ja: ['はじめての人に', 'ルールを覚えた人に', '慣れてきた人に', '強い人に', '上級者でも手ごわい', '最強レベル'],
    en: ['for first-timers', 'once you know the rules', 'getting the hang of it', 'for strong players', 'tough even for experts', 'the very strongest'],
    zh: ['适合初次玩', '适合刚学会规则', '适合渐渐上手', '适合高手', '高手也觉得难缠', '最强等级'],
    ko: ['처음 하는 사람에게', '규칙을 익힌 사람에게', '익숙해진 사람에게', '강한 사람에게', '고수도 버거운', '최강 레벨'],
    es: ['para principiantes', 'si ya sabes las reglas', 'si ya le vas pillando el truco', 'para jugadores fuertes', 'difícil incluso para expertos', 'el más fuerte'],
    fr: ['pour débuter', 'si tu connais les règles', 'si tu prends le coup de main', 'pour les bons joueurs', 'coriace même pour les experts', 'le plus fort'],
    pt: ['para iniciantes', 'para quem já sabe as regras', 'para quem está pegando o jeito', 'para jogadores fortes', 'difícil até para experts', 'o mais forte'],
    de: ['für Einsteiger', 'wenn du die Regeln kennst', 'wenn du den Dreh raus hast', 'für starke Spieler', 'selbst für Profis knifflig', 'die stärkste Stufe'],
    hi: ['पहली बार खेलने वालों के लिए', 'नियम सीख चुके लोगों के लिए', 'जिन्हें आदत हो रही है उनके लिए', 'मज़बूत खिलाड़ियों के लिए', 'विशेषज्ञों के लिए भी कठिन', 'सबसे मज़बूत स्तर'],
    ar: ['لمن يلعب أول مرة', 'لمن تعلّم القواعد', 'لمن بدأ يعتاد اللعب', 'للاعبين الأقوياء', 'صعب حتى على الخبراء', 'أقوى مستوى'],
  };
  const WG = [0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 5];
  // table play: messages (capture / extra turn are the full game's banners) and two players on one device
  const TX = {
    ja: { cap: '横取り！', extra: 'もう一回！', tap: '自分の穴をタップ', turn: '{p}の番', win: '{p}の勝ち' },
    en: { cap: 'Capture!', extra: 'Extra Turn!', tap: 'Tap one of your pits', turn: '{p} to move', win: '{p} wins' },
    zh: { cap: '吃子！', extra: '再走一次！', tap: '点击自己的坑', turn: '轮到{p}', win: '{p}胜' },
    ko: { cap: '가져오기!', extra: '한 번 더!', tap: '내 구멍을 탭하세요', turn: '{p} 차례', win: '{p} 승리' },
    es: { cap: '¡Captura!', extra: '¡Turno extra!', tap: 'Toca uno de tus hoyos', turn: 'Turno: {p}', win: 'Gana {p}' },
    fr: { cap: 'Capture !', extra: 'Tour en plus !', tap: 'Touchez un de vos trous', turn: 'Trait : {p}', win: 'Victoire : {p}' },
    pt: { cap: 'Captura!', extra: 'Jogada extra!', tap: 'Toque numa das suas casas', turn: 'Vez: {p}', win: 'Vitória: {p}' },
    de: { cap: 'Gefangen!', extra: 'Extrazug!', tap: 'Tippe eine deiner Mulden an', turn: '{p} am Zug', win: '{p} gewinnt' },
    hi: { cap: 'पकड़!', extra: 'अतिरिक्त चाल!', tap: 'अपना कोई गड्ढा छुएँ', turn: '{p} की बारी', win: '{p} की जीत' },
    ar: { cap: 'أسر!', extra: 'دور إضافي!', tap: 'المس إحدى حفرك', turn: 'دور {p}', win: 'فوز {p}' },
  };
  const SEEDS_L = { ja: '種の数', en: 'Seeds', zh: '种子数', ko: '씨앗 수', es: 'Semillas', fr: 'Graines', pt: 'Sementes', de: 'Samen', hi: 'बीज', ar: 'البذور' };
  const SEEDS_N = { ja: '{n}粒', en: '{n} seeds', zh: '{n}颗', ko: '{n}개', es: '{n} semillas', fr: '{n} graines', pt: '{n} sementes', de: '{n} Samen', hi: '{n} बीज', ar: '{n} بذور' };

  /* ---------- small synthesized sounds (the portal's sound setting, its shared AudioContext) ---------- */
  const SND = (() => {
    const C = () => { try { if (window.Atlas && Atlas.sfxOn && !Atlas.sfxOn()) return null; const c = window.__atlasAC; return c && c.state === 'running' ? c : null; } catch (e) { return null; } };
    const tone = (c, t, f0, f1, dur, type, vol) => { const o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur * .8); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05); };
    const at = f => { const c = C(); if (c) try { f(c, c.currentTime + .005); } catch (e) {} };
    return {
      drop: store => at((c, t) => { const f = (store ? 1250 : 1650) + Math.random() * 500; tone(c, t, f, f * .7, .09, 'sine', .05); tone(c, t, 240, 140, .07, 'triangle', .05); }),   // glass on lacquer
      pick: () => at((c, t) => { tone(c, t, 700, 1100, .12, 'sine', .035); }),
      cap: () => at((c, t) => [659, 880, 1175].forEach((f, i) => tone(c, t + i * .07, f, 0, .35, 'triangle', .06))),
      extra: () => at((c, t) => [659.25, 987.77].forEach((f, i) => tone(c, t + i * .09, f, 0, .5, 'triangle', .08))),
    };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, THREE = window.THREE, t = ctx.t, MC = T3.mancala, G = MC.G;
    const lang = ctx.lang, X = Object.assign({}, TX.en, TX[lang] || {});
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const board = T3.MODELS.mancala(true); T3.show('mancala', board);
    // phones held upright: the long board stands up the screen (camera rolled), your row on the right and your store at the top as in the 2D game
    const tall = innerHeight > innerWidth * 1.15;
    if (tall) board.rotation.y = Math.PI;
    if (T3.fit) T3.fit(tall ? { w: 6.4, d: 13.4, y: G.TOP, pitch: 1.5, roll: true } : { w: 12.2, d: 5.8, y: G.TOP, pitch: 1.05 });
    const TOP = G.TOP, level = Math.max(1, Math.min(10, +ctx.level || 5)), SEEDS = +ctx.size === 6 ? 6 : 4, RULES = 'kalah';
    const pvp = ctx.mode === 'pvp', human = pvp ? 0 : ctx.side === 2 ? 1 : 0, ai = 1 - human;
    const pname = s => s ? t('bv.second') : t('bv.first');
    const bottom = human;   // the human's row (pvp: the first player's) is the near one, sowing counter-clockwise
    let b = new Int8Array(14); for (let i = 0; i < 6; i++) { b[i] = SEEDS; b[i + 7] = SEEDS; }
    let side = 0, over = false, stopped = false, busy = false, worker = null, hintW = null, ply = 0, hist = [], aiJ = 0, hintJ = 0, tok = 0, hintPit = -1, msg = '';
    const ix = s => s;   // HUD pill / clock: first player left (0), second right (1)
    const onTurn = () => { if (ctx.onTurn) ctx.onTurn(ix(side), { human: pvp || side === human, ply }); };

    /* ---------- geometry: engine slot → hollow on the board ---------- */
    const isStore = i => i === 6 || i === 13, ownerOf = i => i <= 6 ? 0 : 1;
    function hollow(i) {   // [x, z, straight half length, radius, depth]
      const near = ownerOf(i) === bottom;
      if (isStore(i)) return [near ? G.SX : -G.SX, 0, G.SL, G.SR, G.SDEP];
      const k = i % 7, p = near ? MC.PITS[k * 2] : MC.PITS[(5 - k) * 2 + 1];
      return [p[0], p[1], 0, G.PR, G.PDEP];
    }
    let rs = 12345; const rnd = () => ((rs = (rs * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const slots = Array.from({ length: 14 }, () => []);   // the gem meshes in each hollow (userData.tp = its resting spot)
    function spot(i) {   // the lowest free spot among a few random candidates (on the bowl or on the gems already there)
      const [cx, cz, Ls, r, dep] = hollow(i), hs = G.SRAD * G.SFLAT, d2 = (G.SRAD * 1.92) ** 2;
      let best = null;
      for (let k = 0; k < 14; k++) {
        const a = rnd() * Math.PI * 2, rho = Math.sqrt(rnd()) * (r - G.SRAD * 1.15), lz = Ls ? (rnd() * 2 - 1) * Ls : 0;
        const x = cx + Math.cos(a) * rho, z = cz + lz + Math.sin(a) * rho;
        let y = MC.floorY(rho, r, dep) + hs * .92;
        for (const s of slots[i]) { const p = s.userData.tp, dd = (p.x - x) ** 2 + (p.z - z) ** 2; if (dd < d2) y = Math.max(y, p.y + Math.sqrt(d2 - dd) * .62); }
        if (!best || y < best.y) best = new THREE.Vector3(x, y, z);
      }
      return best;
    }
    let gemN = 0;
    function newGem() { const s = MC.stone((gemN++ * 5 + (rnd() * 8 | 0)) % MC.GEMS.length); s.rotation.set((rnd() - .5) * .5, rnd() * 6.3, (rnd() - .5) * .5); board.add(s); return s; }
    function rebuild() {   // the gems as `b` says, without animation
      slots.forEach(l => { l.forEach(s => board.remove(s)); l.length = 0; });
      for (let i = 0; i < 14; i++) for (let n = 0; n < b[i]; n++) { const s = newGem(), p = spot(i); s.position.copy(p); s.userData.tp = p; slots[i].push(s); }
      for (let i = 0; i < 14; i++) setCount(i, b[i]);
      if (T3.kick) T3.kick(300);
    }

    /* ---------- gold engraved counts beside every hollow ---------- */
    const labels = [];
    for (let i = 0; i < 14; i++) {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
      const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(.84, .42), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
      m.rotation.set(-Math.PI / 2, 0, tall ? -Math.PI / 2 : 0); m.renderOrder = 2;   // (upright phone: the digits turn with the camera)
      const [x, z] = hollow(i), near = ownerOf(i) === bottom;
      m.position.set(x, TOP + .004, isStore(i) ? (near ? 1.76 : -1.76) : z + (near ? 1 : -1) * (G.PR + .3));
      board.add(m); labels.push({ m, cv, tex, n: -1 });
    }
    function setCount(i, n) {
      const l = labels[i]; if (l.n === n) return; l.n = n;
      const c = l.cv.getContext('2d'); c.clearRect(0, 0, 128, 64);
      c.font = '700 54px Fredoka, "Zen Maru Gothic", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(0,0,0,.6)'; c.fillText(n, 64, 36);
      const g = c.createLinearGradient(0, 8, 0, 58); g.addColorStop(0, '#fff6d8'); g.addColorStop(.45, '#f0cf84'); g.addColorStop(1, '#b8873a');
      c.fillStyle = n ? g : 'rgba(226,191,114,.42)'; c.fillText(n, 64, 33);
      l.tex.needsUpdate = true; if (T3.kick) T3.kick(120);
    }

    /* ---------- glows: your playable pits, the hint ---------- */
    const glowM = new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: .8, toneMapped: false, depthWrite: false });
    const glowG = new THREE.TorusGeometry(G.PR + .085, .032, 8, 44); glowG.rotateX(Math.PI / 2);
    const glows = []; for (let k = 0; k < 6; k++) { const m = new THREE.Mesh(glowG, glowM); m.visible = false; board.add(m); glows.push(m); }
    const hintRing = new THREE.Mesh(new THREE.TorusGeometry(G.PR + .16, .06, 10, 44), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: .95, toneMapped: false }));
    hintRing.rotation.x = Math.PI / 2; hintRing.visible = false; board.add(hintRing);
    const capM = new THREE.MeshBasicMaterial({ color: 0xff5d5d, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
    const capRings = [0, 1].map(() => { const m = new THREE.Mesh(glowG, capM); m.scale.setScalar(1.12); m.visible = false; board.add(m); return m; });
    let hover = -1;
    function showGlows() {
      const mine = !over && !busy && (pvp || side === human) && window.MancalaEngine;
      for (let k = 0; k < 6; k++) {
        const i = (side ? 7 : 0) + k, g = glows[k];
        g.visible = !!(mine && b[i] > 0);
        if (g.visible) { const [x, z] = hollow(i); g.position.set(x, TOP - .005, z); g.scale.setScalar(i === hover ? 1.07 : 1); }
      }
      if (T3.kick) T3.kick(150);
    }
    function hideHint() { hintPit = -1; if (hintRing.visible) { hintRing.visible = false; if (T3.kick) T3.kick(150); } hintJ++; }

    /* ---------- animation helpers ---------- */
    const tweens = new Set(); let raf = 0;
    function loop() {
      raf = 0; const now = performance.now();
      tweens.forEach(w => { const k = Math.min(1, (now - w.t0) / w.dur); if (k < 0) return; w.f(k); if (k >= 1) { tweens.delete(w); if (w.done) w.done(); } });
      if (T3.kick) T3.kick(120);
      if (tweens.size && !stopped) raf = requestAnimationFrame(loop);
    }
    function anim(dur, f, done, delay = 0) { tweens.add({ t0: performance.now() + delay, dur, f, done }); if (!raf) raf = requestAnimationFrame(loop); }
    const nap = ms => new Promise(r => setTimeout(r, ms));
    const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    function fly(s, to, dur, h, delay = 0) {   // an arc from where the gem is to `to`, with a small bounce on landing
      return new Promise(res => {
        let p0 = null;
        anim(dur, k => {
          if (!p0) p0 = s.position.clone();
          const e = ease(k);
          s.position.set(p0.x + (to.x - p0.x) * e, p0.y + (to.y - p0.y) * k + h * 4 * k * (1 - k), p0.z + (to.z - p0.z) * e);
          if (k > .82) s.position.y = to.y + Math.sin((k - .82) / .18 * Math.PI) * .045;
        }, () => { s.position.copy(to); res(); }, delay);
      });
    }
    // the hand: the gems picked up from a pit float above it in a small ring and travel pit by pit
    const hand = new THREE.Group(); board.add(hand); const HY = TOP + 1.05;
    let inHand = [];
    function arrangeHand(dur) {
      inHand.forEach((s, j) => {
        const n = inHand.length, a = j / Math.max(1, n) * Math.PI * 2 + .4, r = n > 1 ? Math.min(.36, .12 + n * .025) : 0, lay = Math.floor(j / 12);
        const to = new THREE.Vector3(Math.cos(a) * r, lay * .2 + Math.sin(j * 1.7) * .03, Math.sin(a) * r);
        if (dur) { const p0 = s.position.clone(); anim(dur, k => { s.position.lerpVectors(p0, to, ease(k)); }); } else s.position.copy(to);
      });
    }
    function moveHand(i, dur) { const [x, z] = hollow(i), p0 = hand.position.clone(), to = new THREE.Vector3(x, HY, z); return new Promise(res => anim(dur, k => { hand.position.lerpVectors(p0, to, ease(k)); }, res)); }

    /* ---------- one move with the sowing animation (engine events) ---------- */
    async function animate(tr) {
      const my = ++tok, alive = () => my === tok && !stopped;
      const counts = Int8Array.from(b), total = tr.events.filter(e => e.t === 'drop').length;
      const step = total <= 8 ? 400 : Math.max(200, 400 - (total - 8) * 10), dur = Math.round(step * 1.35);   // the full game's 「ふつう」 timing
      for (const ev of tr.events) {
        if (!alive()) return;
        if (ev.t === 'pick') {
          const [x, z] = hollow(ev.at); hand.position.set(x, HY, z);
          inHand = slots[ev.at].splice(0); counts[ev.at] = 0; setCount(ev.at, 0);
          inHand.forEach(s => { const w = s.position.clone(); board.remove(s); hand.add(s); s.position.copy(w.sub(hand.position)); });
          arrangeHand(Math.round(step * .9)); SND.pick();
          await nap(step * 1.1);
        } else if (ev.t === 'drop') {
          moveHand(ev.at, Math.round(step * .55));
          const s = inHand.shift() || newGem(), to = spot(ev.at);
          // back to the board where the gem is now, then down into the hollow
          const w = new THREE.Vector3(); s.getWorldPosition(w); board.worldToLocal(w); hand.remove(s); board.add(s); s.position.copy(w);
          s.userData.tp = to; slots[ev.at].push(s);
          const at = ev.at;
          fly(s, to, dur, .35, Math.round(step * .3)).then(() => { if (!alive()) return; counts[at]++; setCount(at, counts[at]); SND.drop(isStore(at)); });
          arrangeHand(Math.round(step * .5));
          await nap(step);
        } else if (ev.t === 'cap') {
          await nap(dur);
          if (!alive()) return;
          // both pits light up, then their gems fly together into the store
          const lit = [ev.from].concat(ev.own >= 0 ? [ev.own] : []);
          lit.forEach((i, j) => { const [x, z] = hollow(i), m = capRings[j]; m.position.set(x, TOP - .004, z); m.visible = true; });
          anim(600, k => { capM.opacity = Math.sin(k * Math.PI) * .95; });
          msg = X.cap + ' +' + (ev.n + (ev.own >= 0 ? 1 : 0)); hud(); SND.cap();
          await nap(650);
          if (!alive()) return;
          capRings.forEach(m => { m.visible = false; });
          const got = slots[ev.from].splice(0).concat(ev.own >= 0 ? slots[ev.own].splice(0) : []);
          counts[ev.from] = 0; setCount(ev.from, 0); if (ev.own >= 0) { counts[ev.own] = 0; setCount(ev.own, 0); }
          got.forEach((s, j) => { const to = spot(ev.to); s.userData.tp = to; slots[ev.to].push(s); fly(s, to, 1100, 1.4, j * 110).then(() => { if (!alive()) return; counts[ev.to]++; setCount(ev.to, counts[ev.to]); SND.drop(true); }); });
          await nap(1150 + got.length * 110);
        } else if (ev.t === 'sweep') {
          await nap(dur);
          if (!alive()) return;
          const moving = [];
          for (let i = 0; i < 14; i++) if (!isStore(i) && slots[i].length) { const to = ownerOf(i) ? 13 : 6; slots[i].splice(0).forEach(s => moving.push([s, to])); counts[i] = 0; setCount(i, 0); }
          moving.forEach(([s, to], j) => { const p = spot(to); s.userData.tp = p; slots[to].push(s); fly(s, p, 800, .9, j * 40).then(() => { if (!alive()) return; counts[to]++; setCount(to, counts[to]); }); });
          await nap(850 + moving.length * 40);
        }
      }
      if (!alive()) return;
      if (tr.extra && !tr.over) { msg = X.extra; hud(); SND.extra(); await nap(900); }
      else await nap(dur);
    }

    /* ---------- the game ---------- */
    function hud(m) {
      if (m !== undefined) msg = m;
      const pill = c => `<span class="hs ${side === c && !over ? 'on' : ''}"><i class="dk ${c ? 'w' : 'b'}"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}<b>${b[c ? 13 : 6]}</b></span>`;
      ctx.hud(`${pill(0)}<span class="hm">${msg || ''}</span>${pill(1)}`);
    }
    function turnMsg() { return pvp ? X.turn.replace('{p}', pname(side)) : side === human ? L.turn : L.think; }
    async function play(k, mover) {   // mover sows pit k (0..5 from its first pit)
      if (pvp || mover === human) hist.push({ b: Int8Array.from(b), side });   // 待った: back to before this move
      hideHint(); busy = true; hover = -1; showGlows(); ply++;
      const tr = MancalaEngine.trace(b, mover, k, RULES);
      msg = ''; hud();
      await animate(tr);
      if (stopped) return;
      b = Int8Array.from(tr.board); for (let i = 0; i < 14; i++) setCount(i, b[i]);
      over = tr.over; side = tr.over ? side : tr.next; busy = false;
      if (over) return end();
      next();
    }
    function next() {
      if (stopped || over) return;
      msg = turnMsg(); hud(); showGlows(); onTurn();
      if (!pvp && side === ai) aiMove();
    }
    function aiMove() {
      busy = true; showGlows();
      if (!worker) worker = new Worker(BASE + 'engine.js?v=' + EV);
      const t0 = Date.now(), j = ++aiJ;
      worker.onmessage = e => {
        const m = e.data; if (m.type !== 'move' || m.id !== j || stopped || j !== aiJ || over) return;
        setTimeout(() => { if (stopped || j !== aiJ || over) return; if (m.move >= 0) play(m.move, ai); }, Math.max(0, 500 - (Date.now() - t0)));
      };
      worker.postMessage({ type: 'move', id: j, b: Array.from(b), side: ai, rules: RULES, level });
    }
    function end() {
      over = true; busy = false; hideHint(); showGlows(); if (ctx.onTurn) ctx.onTurn(-1);
      const s0 = b[6], s1 = b[13];
      if (pvp) {
        const wt = s0 === s1 ? '' : X.win.replace('{p}', pname(s0 > s1 ? 0 : 1));
        hud(wt || L.draw);
        return ctx.onEnd({ win: false, draw: s0 === s1, level, score: s0 + ' - ' + s1, pvp: true, winnerText: wt });
      }
      const me = human ? s1 : s0, op = human ? s0 : s1;
      hud(me > op ? L.win : me < op ? L.lose : L.draw);
      ctx.onEnd({ win: me > op, draw: me === op, level, score: me + ' - ' + op });
    }
    function pitAt(e) {
      const p = T3.pick(e, TOP); if (!p) return -1;
      for (let k = 0; k < 6; k++) { const i = (side ? 7 : 0) + k, [x, z] = hollow(i); if (Math.hypot(p.x - x, p.z - z) < G.PR * 1.2) return i; }
      return -1;
    }
    const canTap = () => !over && !busy && (pvp || side === human) && !!window.MancalaEngine;
    function onClick(e) {
      if (!canTap() || T3.wasDrag()) return;
      const i = pitAt(e); if (i < 0 || !b[i]) return;
      play(i % 7, side);
    }
    function onMove(e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const i = canTap() ? pitAt(e) : -1, h = i >= 0 && b[i] ? i : -1;
      if (h !== hover) { hover = h; ctx.el.style.cursor = h >= 0 ? 'pointer' : ''; showGlows(); }
    }
    ctx.el.addEventListener('click', onClick); ctx.el.addEventListener('pointermove', onMove);
    rebuild(); hud('');
    loadEngine().then(() => { if (!stopped) setTimeout(next, 500); }).catch(() => hud('—'));
    // test hooks (Playwright): a hollow's screen position, the state
    window.Atlas3D.mancala._dbg = { at: i => { const [x, z] = hollow(i); return T3.project(x, z, TOP); }, state: () => ({ b: Array.from(b), side, over, busy, human, pvp, hint: hintPit, hist: hist.length, gems: slots.map(l => l.length), labels: labels.map(l => l.n) }) };

    /* ---------- 待った · 投了 · ヒント · time-out ---------- */
    const myTurn = () => canTap();
    function finish(loser, why) {
      if (over) return;
      over = true; busy = false; aiJ++; tok++; hideHint(); showGlows(); if (ctx.onTurn) ctx.onTurn(-1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = X.win.replace('{p}', pname(1 - loser)); hud(wt); return ctx.onEnd({ win: false, draw: false, level, score: t('act.pvpEnd', { p: pname(loser), r, w: wt }), pvp: true, winnerText: wt }); }
      hud(L.lose); ctx.onEnd({ win: false, draw: false, level, score: r });
    }
    const api = {
      human: pvp ? 0 : human,
      canUndo: () => myTurn() && hist.length > 0,
      undo() {
        if (!api.canUndo()) return;
        const h = hist.pop(); aiJ++; tok++; hideHint();
        b = h.b; side = h.side; ply++;
        rebuild(); next();
      },
      canHint: () => myTurn(),
      hint() {
        if (!myTurn()) return Promise.resolve(false);
        const j = ++hintJ, me = side;
        return new Promise(res => {
          if (!hintW) hintW = new Worker(BASE + 'engine.js?v=' + EV);
          hintW.onmessage = e => {
            const m = e.data; if (m.type !== 'move' || m.id !== j) return;
            if (stopped || j !== hintJ || side !== me || over || busy) return res(true);
            if (!(m.move >= 0)) return res(false);
            hintPit = (me ? 7 : 0) + m.move; const [x, z] = hollow(hintPit); hintRing.position.set(x, TOP + .02, z); hintRing.visible = true;
            anim(560, k => { const s = 1 + Math.sin(k * Math.PI * 2) * .16 * (1 - k); hintRing.scale.set(s, s, s); });
            res(true);
          };
          hintW.postMessage({ type: 'move', id: j, b: Array.from(b), side: me, rules: RULES, level: 9 });
        });
      },
      canResign: () => !over,
      resign() { if (!over) finish(pvp ? side : human, 'resign'); },
      timeout(s) { if (!over) finish(s, 'time'); },
      stop() {
        stopped = true; tok++; tweens.clear(); if (raf) cancelAnimationFrame(raf);
        ctx.el.removeEventListener('click', onClick); ctx.el.removeEventListener('pointermove', onMove); ctx.el.style.cursor = '';
        if (worker) worker.terminate(); if (hintW) hintW.terminate();
        labels.forEach(l => { l.tex.dispose(); l.m.geometry.dispose(); l.m.material.dispose(); });
      },
    };
    return api;
  }

  function levelInfo(n, lang) {
    const a = LV[lang] || LV.en, d = LVD[lang] || LVD.en, w = WHO[lang] || WHO.en;
    return { name: a[n], desc: d[n], rating: 0, who: w[WG[n]] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.mancala = { levels: 10, sides: true, modes: ['ai', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'bg', sizes: [4, 6], size0: 4,
    sizeLabel: l => SEEDS_L[l] || SEEDS_L.en, sizeName: (z, l) => (SEEDS_N[l] || SEEDS_N.en).replace('{n}', z), levelInfo, start };   // table: start() plays on the chabudai itself
})();
