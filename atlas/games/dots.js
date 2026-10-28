/* =====================================================================
   Dots and Boxes on the portal.
   • The board card: 10 AI levels (names / descriptions from the full game,
     dots/i18n.js 'lv' / 'lvd'; ratings from its rated ladder, dots/rated.js
     RT_LV for 4×4), first / second, board size 3×3 · 4×4 · 5×5 boxes (4×4 as
     in the 2D game), AI game or two players. フル機能 opens dots/?skin=atlas.
   • ちゃぶ台で遊ぶ (table: true): the game is played in the spiral notebook
     (atlas/models/dots.js) with the game's own AI worker (../dots/engine.js:
     the same search, solvers and opening book as the full game).
     Tap between two dots: the player's ballpoint pen (red = first, blue =
     second) lifts off the table, draws the line on the page with an animated
     stroke and stays hovering; a closed box is hatched and initialled in the
     closer's ink and that player draws again. The page is a canvas texture,
     redrawn only when a line is committed; the running stroke is a ribbon.
   Adapter contract: see atlas/games/reversi.js.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../dots/', EV = '20261028rb';   // same engine file (and cache key) as the full game
  const LV = {"ja":["","入門","初級","初級+","中級","中級+","上級","達人","名人","超人","最強"],"en":["","Beginner","Novice","Novice+","Intermediate","Intermediate+","Advanced","Expert","Master","Grandmaster","Strongest"],"zh":["","入门","初级","初级+","中级","中级+","高级","达人","大师","宗师","最强"],"ko":["","입문","초급","초급+","중급","중급+","상급","달인","명인","초인","최강"],"es":["","Principiante","Novato","Novato+","Intermedio","Intermedio+","Avanzado","Experto","Maestro","Gran maestro","Máximo"],"fr":["","Débutant","Novice","Novice+","Intermédiaire","Intermédiaire+","Avancé","Expert","Maître","Grand maître","Maximal"],"pt":["","Iniciante","Novato","Novato+","Intermediário","Intermediário+","Avançado","Expert","Mestre","Grão-mestre","Máximo"],"de":["","Anfänger","Neuling","Neuling+","Mittel","Mittel+","Fortgeschritten","Experte","Meister","Großmeister","Stärkste"],"hi":["","शुरुआती","नौसिखिया","नौसिखिया+","मध्यम","मध्यम+","उन्नत","विशेषज्ञ","उस्ताद","महाउस्ताद","सबसे मज़बूत"],"ar":["","مبتدئ","مستجد","مستجد+","متوسط","متوسط+","متقدم","خبير","أستاذ","أستاذ كبير","الأقوى"]};
  const LVD = {"ja":["","でたらめに引く","取れる箱は取る","3辺目を渡さない","渡すなら最小の鎖","鎖を数える・ダブルディール","3手読み＋鎖解析","深読み＋終盤完全読み","完全読みソルバー（3×3は全解析）","3秒・並列探索＋5×5終盤の高速完全読み、4×4は完全プレイ","5秒・並列探索＋5×5終盤の高速完全読み、4×4は完全プレイ"],"en":["","draws at random","takes any free box","never gives a 3rd side","sacrifices the smallest chain","counts chains, double-deals","3-ply search + chain analysis","deep search + exact endgame","exact solver (3×3 fully solved)","3 s, parallel search + fast exact 5×5 endgames; perfect play on 4×4","5 s, parallel search + fast exact 5×5 endgames; perfect play on 4×4"],"zh":["","随机画线","能拿的格子就拿","不送第三条边","送最短的链","数链·双交","3步搜索＋链分析","深度搜索＋残局完全解","完全解算器（3×3完全解析）","3秒·并行搜索＋5×5残局快速完全解，4×4完美对弈","5秒·并行搜索＋5×5残局快速完全解，4×4完美对弈"],"ko":["","무작위로 긋기","얻을 수 있는 상자는 얻기","세 번째 변을 주지 않음","가장 짧은 사슬을 내줌","사슬 세기·더블딜","3수 탐색＋사슬 분석","깊은 탐색＋종반 완전 해석","완전 해석 솔버 (3×3 전체 해석)","3초·병렬 탐색＋5×5 종반 고속 완전 해석, 4×4는 완벽한 플레이","5초·병렬 탐색＋5×5 종반 고속 완전 해석, 4×4는 완벽한 플레이"],"es":["","traza al azar","toma cualquier cuadro libre","nunca da un 3.er lado","sacrifica la cadena más corta","cuenta cadenas, hace double-deal","búsqueda a 3 plies + análisis de cadenas","búsqueda profunda + final exacto","solver exacto (3×3 totalmente resuelto)","3 s, búsqueda paralela + finales de 5×5 calculados con exactitud; juego perfecto en 4×4","5 s, búsqueda paralela + finales de 5×5 calculados con exactitud; juego perfecto en 4×4"],"fr":["","trace au hasard","prend toute case libre","ne donne jamais de 3e côté","sacrifie la plus courte chaîne","compte les chaînes, double-deal","recherche à 3 demi-coups + chaînes","recherche profonde + finale exacte","solveur exact (3×3 entièrement résolu)","3 s, recherche parallèle + finales 5×5 calculées exactement ; jeu parfait en 4×4","5 s, recherche parallèle + finales 5×5 calculées exactement ; jeu parfait en 4×4"],"pt":["","traça ao acaso","pega qualquer quadrado livre","nunca dá o 3º lado","sacrifica a menor corrente","conta correntes, faz double-deal","busca de 3 lances + análise de correntes","busca profunda + final exato","solver exato (3×3 totalmente resolvido)","3 s, busca paralela + finais de 5×5 calculados com exatidão; jogo perfeito no 4×4","5 s, busca paralela + finais de 5×5 calculados com exatidão; jogo perfeito no 4×4"],"de":["","zieht zufällig","nimmt jedes freie Kästchen","gibt nie eine 3. Seite","opfert die kürzeste Kette","zählt Ketten, Double-Deal","3 Halbzüge Suche + Kettenanalyse","tiefe Suche + exaktes Endspiel","exakter Solver (3×3 vollständig gelöst)","3 s, parallele Suche + exakte 5×5-Endspiele; spielt 4×4 perfekt","5 s, parallele Suche + exakte 5×5-Endspiele; spielt 4×4 perfekt"],"hi":["","यादृच्छिक रेखा खींचता है","कोई भी खुला डिब्बा ले लेता है","कभी तीसरी भुजा नहीं देता","सबसे छोटी चेन क़ुर्बान करता है","चेन गिनता है, डबल-डील करता है","3-प्लाई खोज + चेन विश्लेषण","गहरी खोज + सटीक एंडगेम","सटीक सॉल्वर (3×3 पूरी तरह हल)","3 से., समानांतर खोज + 5×5 अंतिम चरण की तेज़ सटीक गणना; 4×4 पर परफ़ेक्ट खेल","5 से., समानांतर खोज + 5×5 अंतिम चरण की तेज़ सटीक गणना; 4×4 पर परफ़ेक्ट खेल"],"ar":["","يرسم عشوائياً","يأخذ أي مربع متاح","لا يعطي ضلعاً ثالثاً أبداً","يضحّي بأقصر سلسلة","يعدّ السلاسل ويستخدم الصفقة المزدوجة","بحث بعمق 3 + تحليل السلاسل","بحث عميق + نهاية دقيقة","محلّل دقيق (3×3 محلولة بالكامل)","3 ث، بحث متوازٍ + حساب دقيق سريع لنهايات 5×5؛ لعب مثالي على 4×4","5 ث، بحث متوازٍ + حساب دقيق سريع لنهايات 5×5؛ لعب مثالي على 4×4"]};
  const RATING = [0, 190, 590, 930, 1110, 1470, 1600, 1690, 1850, 1950, 2000];   // dots/rated.js RT_LV[4]
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
  const TX = {
    ja: { again: 'もう1本！', n: ['赤', '青'], turn: '{p}の番', win: '{p}の勝ち' },
    en: { again: 'Draw again!', n: ['Red', 'Blue'], turn: '{p} to move', win: '{p} wins' },
    zh: { again: '再画一条！', n: ['红', '蓝'], turn: '轮到{p}', win: '{p}胜' },
    ko: { again: '한 줄 더!', n: ['빨강', '파랑'], turn: '{p} 차례', win: '{p} 승리' },
    es: { again: '¡Otra línea!', n: ['Rojo', 'Azul'], turn: 'Turno: {p}', win: 'Gana {p}' },
    fr: { again: 'Encore un trait !', n: ['Rouge', 'Bleu'], turn: 'Trait : {p}', win: 'Victoire : {p}' },
    pt: { again: 'Mais uma linha!', n: ['Vermelho', 'Azul'], turn: 'Vez: {p}', win: 'Vitória: {p}' },
    de: { again: 'Noch ein Strich!', n: ['Rot', 'Blau'], turn: '{p} am Zug', win: '{p} gewinnt' },
    hi: { again: 'एक और रेखा!', n: ['लाल', 'नीला'], turn: '{p} की बारी', win: '{p} की जीत' },
    ar: { again: 'خط آخر!', n: ['الأحمر', 'الأزرق'], turn: 'دور {p}', win: 'فوز {p}' },
  };
  const SIZE_L = { ja: '盤の大きさ', en: 'Board size', zh: '棋盘大小', ko: '판 크기', es: 'Tamaño', fr: 'Taille', pt: 'Tamanho', de: 'Brettgröße', hi: 'बोर्ड आकार', ar: 'حجم اللوحة' };

  const SND = (() => {   // pen on paper, a little chime for a box (the portal's sound setting and AudioContext)
    const C = () => { try { if (window.Atlas && Atlas.sfxOn && !Atlas.sfxOn()) return null; const c = window.__atlasAC; return c && c.state === 'running' ? c : null; } catch (e) { return null; } };
    let nb = null;
    const at = f => { const c = C(); if (c) try { f(c, c.currentTime + .005); } catch (e) {} };
    const tone = (c, t, f, dur, vol) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .05); };
    return {
      scratch: ms => at((c, t) => {
        if (!nb) { nb = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (.6 + .4 * Math.sin(i / 37)); }
        const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), dur = ms / 1000; s.buffer = nb; f.type = 'bandpass'; f.frequency.value = 3400; f.Q.value = .8;
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.09, t + .03); g.gain.setValueAtTime(.09, t + dur * .8); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
        s.connect(f).connect(g).connect(c.destination); s.start(t); s.stop(t + dur + .05);
      }),
      box: k => at((c, t) => { const S = [523.25, 659.25, 783.99, 1046.5]; for (let i = 0; i < k; i++) tone(c, t + i * .07, S[Math.min(i + 1, 3)], .45, .07); }),
    };
  })();

  // cream paper: soft clouds painted small and scaled up, plus a tiled fine grain (fast: no per-pixel work at full size)
  function paperFill(c, CW, CH, T3) {
    const sw = Math.ceil(CW / 6), sh = Math.ceil(CH / 6), sm = document.createElement('canvas'); sm.width = sw; sm.height = sh;
    const sc = sm.getContext('2d'), Nz = T3.makeNoise(3), img = sc.createImageData(sw, sh), d = img.data;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const v = (Nz(x / 12, y / 12, 3) - .5) * 9, i = (y * sw + x) * 4; d[i] = 251 + v; d[i + 1] = 247 + v; d[i + 2] = 236 + v * .9; d[i + 3] = 255; }
    sc.putImageData(img, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(sm, 0, 0, CW, CH);
    const gs = 256, g = document.createElement('canvas'); g.width = g.height = gs;
    const gc = g.getContext('2d'), gi = gc.createImageData(gs, gs), gd = gi.data;
    for (let i = 0; i < gs * gs; i++) { const v = Math.random() < .5 ? 0 : 255; gd[i * 4] = gd[i * 4 + 1] = gd[i * 4 + 2] = v; gd[i * 4 + 3] = 5 + Math.random() * 9; }
    gc.putImageData(gi, 0, 0); c.fillStyle = c.createPattern(g, 'repeat'); c.fillRect(0, 0, CW, CH);
  }

  function start(ctx) {
    const T3 = ctx.Table3D, THREE = window.THREE, t = ctx.t, D = T3.dots;
    const lang = ctx.lang, X = Object.assign({}, TX.en, TX[lang] || {});
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const n = [3, 4, 5].includes(+ctx.size) ? +ctx.size : 4, level = Math.max(1, Math.min(10, +ctx.level || 5));
    const pvp = ctx.mode === 'pvp', human = pvp ? 0 : ctx.side === 2 ? 1 : 0, ai = 1 - human;
    const pname = s => X.n[s];
    const INK = [D.RED, D.BLUE];

    /* ---------- the notebook, the page we draw on, the two pens ---------- */
    const root = new THREE.Group(), nb = D.notebook(false); root.add(nb);
    const PW = D.PW, PD = D.PD, PY = D.PY;
    const page = nb.userData.page;
    // the board: (n+1)² dots spread over the same square as the model's 6 × 6 grid
    const SP = 5.6 / n, X0 = PW / 2 - n * SP / 2, Z0 = PD / 2 + D.GZ - n * SP / 2;
    const dotP = (r, c) => [X0 + c * SP, Z0 + r * SP];   // page units from the top-left corner
    const HN = (n + 1) * n, E = HN + n * (n + 1), B = n * n;
    const edgeRC = e => e < HN ? { h: true, r: Math.floor(e / n), c: e % n } : { h: false, r: Math.floor((e - HN) / (n + 1)), c: (e - HN) % (n + 1) };
    const boxEdges = bx => { const r = Math.floor(bx / n), c = bx % n; return [r * n + c, (r + 1) * n + c, HN + r * (n + 1) + c, HN + r * (n + 1) + c + 1]; };
    const edgeBoxes = e => { const q = edgeRC(e), o = []; if (q.h) { if (q.r > 0) o.push((q.r - 1) * n + q.c); if (q.r < n) o.push(q.r * n + q.c); } else { if (q.c > 0) o.push(q.r * n + q.c - 1); if (q.c < n) o.push(q.r * n + q.c); } return o; };
    // canvas: cached paper (noise, ruling aligned with the dots, margin, punched holes) + the ink of the game on top
    // (square power-of-two canvases drawn with a vertical squash: WebGL would otherwise resize every upload)
    const s = T3.texScale(), CW = Math.round(2048 * s), CH = Math.round(CW * PD / PW), PH = CW, K = CW / PW, U = v => v * K;
    const paper = document.createElement('canvas'); paper.width = CW; paper.height = PH;
    {
      const c = paper.getContext('2d'); c.setTransform(1, 0, 0, PH / CH, 0, 0); paperFill(c, CW, CH, T3);
      c.strokeStyle = 'rgba(80,130,200,.3)'; c.lineWidth = Math.max(1, U(.014));
      for (let z = Z0 - Math.ceil((Z0 - 1.1) / (SP / 2)) * SP / 2; z < PD - .2; z += SP / 2) { c.beginPath(); c.moveTo(0, U(z)); c.lineTo(CW, U(z)); c.stroke(); }
      c.strokeStyle = 'rgba(214,80,90,.4)'; c.lineWidth = U(.016); c.beginPath(); c.moveTo(U(.75), U(.75)); c.lineTo(U(.75), CH); c.stroke();
      c.fillStyle = 'rgba(70,110,170,.55)'; c.font = `600 ${U(.17)}px "Helvetica Neue",Arial,sans-serif`;
      c.fillText('No.', U(4.3), U(.98)); c.fillText('Date', U(5.6), U(.98));
      c.strokeStyle = 'rgba(70,110,170,.5)'; c.lineWidth = U(.01); c.beginPath(); c.moveTo(U(4.62), U(1)); c.lineTo(U(5.45), U(1)); c.moveTo(U(6.05), U(1)); c.lineTo(U(7.2), U(1)); c.stroke();
      for (let i = 0; i < D.HOLES; i++) { const x = D.holeX(i) + PW / 2; c.beginPath(); c.arc(U(x), U(.32), U(.085), 0, 7); c.fillStyle = '#2a2c33'; c.fill(); }
      // the dots, inked by hand once (slightly uneven)
      let q = 99; const rr = () => ((q = (q * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      for (let r = 0; r <= n; r++) for (let cc = 0; cc <= n; cc++) {
        const [px, pz] = dotP(r, cc), x = U(px) + (rr() - .5) * U(.02), y = U(pz) + (rr() - .5) * U(.02);
        c.fillStyle = 'rgba(35,37,44,.3)'; c.beginPath(); c.arc(x, y, U(.095), 0, 7); c.fill();
        c.fillStyle = '#23252c'; c.beginPath(); c.ellipse(x, y, U(.072), U(.066), rr() * 3, 0, 7); c.fill();
      }
    }
    const cv = document.createElement('canvas'); cv.width = CW; cv.height = PH;
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
    page.material = page.material.clone(); page.material.map = tex; page.material.needsUpdate = true;
    // a line's stroke, the same every time it is drawn (seeded by the edge): start, control point, end in page units
    function strokeOf(e) {
      let q = 7919 * (e + 1) + n * 31; const rr = () => ((q = (q * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      const g = edgeRC(e), a = .12;
      let [x1, z1] = dotP(g.r, g.c), [x2, z2] = g.h ? dotP(g.r, g.c + 1) : dotP(g.r + 1, g.c);
      if (g.h) { x1 += a; x2 -= a; } else { z1 += a; z2 -= a; }
      if (rr() < .5) [x1, z1, x2, z2] = [x2, z2, x1, z1];
      const L = Math.hypot(x2 - x1, z2 - z1), nx = -(z2 - z1) / L, nz = (x2 - x1) / L, bow = (rr() - .5) * L * .06;
      return { x1, z1, x2, z2, cx: (x1 + x2) / 2 + nx * bow, cz: (z1 + z2) / 2 + nz * bow, w: .05, j: [(rr() - .5) * .03, (rr() - .5) * .03] };
    }
    const qpt = (st, k) => { const u = 1 - k; return [u * u * st.x1 + 2 * u * k * st.cx + k * k * st.x2, u * u * st.z1 + 2 * u * k * st.cz + k * k * st.z2]; };
    function inkStroke(c, st, col) {   // ballpoint: drawn twice with a little offset (pressure varies), an ink blob where the pen started
      c.strokeStyle = col; c.lineCap = 'round';
      for (let p = 0; p < 2; p++) {
        c.globalAlpha = p ? .5 : .92; c.lineWidth = U(st.w) * (p ? .55 : 1);
        const ox = p ? U(st.j[0]) : 0, oz = p ? U(st.j[1]) : 0;
        c.beginPath(); c.moveTo(U(st.x1) + ox, U(st.z1) + oz); c.quadraticCurveTo(U(st.cx) + ox, U(st.cz) + oz, U(st.x2) - ox, U(st.z2) - oz); c.stroke();
      }
      c.globalAlpha = .8; c.fillStyle = col; c.beginPath(); c.arc(U(st.x1), U(st.z1), U(st.w) * .62, 0, 7); c.fill(); c.globalAlpha = 1;
    }
    function boxInk(c, bx, o) {   // diagonal hatching and the closer's initial
      const r = Math.floor(bx / n), cc = bx % n, [px, pz] = dotP(r, cc), x0 = U(px), y0 = U(pz), sz = U(SP), col = INK[o];
      let q = 131 * (bx + 3); const rr = () => ((q = (q * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      c.save(); c.beginPath(); c.rect(x0 + U(.08), y0 + U(.08), sz - U(.16), sz - U(.16)); c.clip();
      c.strokeStyle = col; c.globalAlpha = .24; c.lineWidth = U(.022);
      const gap = U(Math.max(.11, SP * .11));
      for (let tt = -sz; tt < sz * 2; tt += gap) { c.beginPath(); c.moveTo(x0 + tt + (rr() - .5) * U(.03), y0); c.lineTo(x0 + tt - sz + (rr() - .5) * U(.03), y0 + sz); c.stroke(); }
      c.restore();
      c.save(); c.translate(x0 + sz / 2, y0 + sz / 2 + U(.04)); c.rotate((rr() - .5) * .3); c.globalAlpha = .9; c.fillStyle = col;
      c.font = `italic 700 ${U(Math.min(.95, SP * .5))}px "Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE",cursive`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(o ? 'B' : 'R', 0, 0); c.restore();
    }
    function redraw() {   // paper + every drawn line + every closed box + the running tally in the margin
      const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(paper, 0, 0); c.setTransform(1, 0, 0, PH / CH, 0, 0);
      for (let bx = 0; bx < B; bx++) if (owner[bx] >= 0) boxInk(c, bx, owner[bx]);
      for (let e = 0; e < E; e++) if (by[e] >= 0) inkStroke(c, strokeOf(e), INK[by[e]]);
      c.font = `italic 700 ${U(.34)}px "Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE",cursive`; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      const tally = k => k > 0 ? '  ' + 'I'.repeat(k).replace(/(IIIII)/g, '$1 ') : '';
      c.fillStyle = INK[0]; c.fillText('R' + tally(score[0]), U(1.1), U(1.6)); c.fillStyle = INK[1]; c.fillText('B' + tally(score[1]), U(4.1), U(1.6));
      tex.needsUpdate = true; if (T3.kick) T3.kick(150);
    }
    // the pens: red (first) lies right of the notebook, blue (second) on the left; the one in use is held over the page
    const tall = innerHeight > innerWidth * 1.15;   // phones held upright
    const pens = INK.map((col, i) => {
      const yaw = new THREE.Group(), tilt = new THREE.Group(), p = D.pen(new THREE.Color(col).getHex(), false);
      p.position.set(1.695, 0, 0); tilt.add(p); yaw.add(tilt); root.add(yaw);
      // resting (the tip's position): beside the notebook, or on its bottom margin when the screen is upright
      const rest = tall ? { x: i ? -.15 : -3.6, y: PY + .135, z: i ? 3.72 : 3.98, yaw: i ? .03 : -.02, tilt: 0 } : { x: i ? -4.6 : 4.6, y: .135, z: .7, yaw: i ? 1.39 : 1.75, tilt: 0 };
      const o = { yaw, tilt, rest, pose: Object.assign({}, rest) };
      setPose(o, rest); return o;
    });
    function setPose(o, q) { o.pose = Object.assign({}, q); o.yaw.position.set(q.x, q.y, q.z); o.yaw.rotation.y = q.yaw; o.tilt.rotation.z = q.tilt; }
    const toRoot = (px, pz, y) => { const v = new THREE.Vector3(px - PW / 2, y, pz - PD / 2); nb.localToWorld(v); root.worldToLocal(v); return v; };   // page units → root space
    const WRITE = { yaw: -.75, tilt: .95 };
    root.userData.top = PY; root.userData.viewY = .4;
    T3.show('dots', root);
    if (T3.fit) T3.fit(tall ? { w: 8.3, d: 10.2, y: PY, pitch: 1.3 } : { w: 10.8, d: 10.2, y: PY, pitch: 1.2 });   // the whole page (and the pens beside it)

    /* ---------- state ---------- */
    let by = new Int8Array(E).fill(-1), owner = new Int8Array(B).fill(-1), score = [0, 0], turn = 0, over = false, stopped = false, busy = false;
    let worker = null, hintW = null, ply = 0, hist = [], aiJ = 0, hintJ = 0, tok = 0, hintE = -1, msg = '', moves = [];
    const cnt = bx => boxEdges(bx).filter(e => by[e] >= 0).length;
    const ix = c => c;
    const onTurn = () => { if (ctx.onTurn) ctx.onTurn(ix(turn), { human: pvp || turn === human, ply }); };
    redraw();

    /* ---------- animation helpers ---------- */
    const tweens = new Set(); let raf = 0;
    function loop() {
      raf = 0; const now = performance.now();
      tweens.forEach(w => { const k = Math.min(1, (now - w.t0) / w.dur); if (k < 0) return; w.f(k); if (k >= 1) { tweens.delete(w); if (w.done) w.done(); } });
      if (T3.kick) T3.kick(120);
      if (tweens.size && !stopped) raf = requestAnimationFrame(loop);
    }
    const anim = (dur, f, delay = 0) => new Promise(res => { tweens.add({ t0: performance.now() + delay, dur, f, done: res }); if (!raf) raf = requestAnimationFrame(loop); });
    const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    function penTo(o, q, dur) {
      const a = Object.assign({}, o.pose);
      return anim(dur, k => { const e = ease(k), m = {}; for (const key of ['x', 'y', 'z', 'yaw', 'tilt']) m[key] = a[key] + (q[key] - a[key]) * e; if (q.arc) m.y += Math.sin(k * Math.PI) * q.arc; setPose(o, m); });
    }
    function penHome(i) { const o = pens[i]; if (o.away) { o.away = false; penTo(o, Object.assign({ arc: .8 }, o.rest), 420); } }
    // the running stroke: a flat ribbon on the page along the same curve, revealed segment by segment
    const RSEG = 24, ribbonG = new THREE.BufferGeometry(); ribbonG.setAttribute('position', new THREE.BufferAttribute(new Float32Array((RSEG + 1) * 2 * 3), 3));
    { const I = []; for (let i = 0; i < RSEG; i++) { const a = i * 2; I.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } ribbonG.setIndex(I); }
    const ribbonM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .92, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const ribbon = new THREE.Mesh(ribbonG, ribbonM); ribbon.visible = false; ribbon.renderOrder = 3; nb.add(ribbon);
    function shapeRibbon(geo, st, w, y) {
      const P = geo.attributes.position;
      for (let i = 0; i <= RSEG; i++) {
        const k = i / RSEG, [x, z] = qpt(st, k), [x2, z2] = qpt(st, Math.min(1, k + .01)), [x0, z0] = qpt(st, Math.max(0, k - .01));
        const dx = x2 - x0, dz = z2 - z0, l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2;
        P.setXYZ(i * 2, x - PW / 2 + nx, y, z - PD / 2 + nz); P.setXYZ(i * 2 + 1, x - PW / 2 - nx, y, z - PD / 2 - nz);
      }
      P.needsUpdate = true; geo.computeBoundingSphere();
    }
    // hover preview (mouse) and the hint: a pencil line / an orange highlighter stroke over an edge
    const mkMark = (col, op, w) => { const g = ribbonG.clone(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((RSEG + 1) * 6), 3)); const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, toneMapped: false })); m.visible = false; m.renderOrder = 2; m.userData.w = w; nb.add(m); return m; };
    const preview = mkMark(0x6b6f7a, .32, .045), hintMk = mkMark(0xffa21a, .55, .22);
    function markEdge(m, e) { if (e < 0) { if (m.visible) { m.visible = false; if (T3.kick) T3.kick(120); } return; } const st = strokeOf(e); shapeRibbon(m.geometry, Object.assign({}, st, { x1: st.x1, z1: st.z1 }), m.userData.w, PY + .003); m.visible = true; if (T3.kick) T3.kick(120); }
    function hideHint() { hintE = -1; markEdge(hintMk, -1); hintJ++; }
    // a closed box: a soft flash of the closer's colour
    function flash(bx, o) {
      const r = Math.floor(bx / n), cc = bx % n, [px, pz] = dotP(r, cc);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(SP * .9, SP * .9), new THREE.MeshBasicMaterial({ color: new THREE.Color(INK[o]).getHex(), transparent: true, opacity: .4, depthWrite: false, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(px + SP / 2 - PW / 2, PY + .004, pz + SP / 2 - PD / 2); nb.add(m);
      anim(600, k => { m.material.opacity = .4 * (1 - k); m.scale.setScalar(1 + k * .12); }).then(() => { nb.remove(m); m.geometry.dispose(); m.material.dispose(); });
    }

    /* ---------- drawing a line ---------- */
    async function drawLine(e, pl) {
      const my = ++tok, alive = () => my === tok && !stopped;
      const st = strokeOf(e), o = pens[pl], up = .55;
      penHome(1 - pl);
      o.away = true;
      const a = toRoot(st.x1, st.z1, PY), z = toRoot(st.x2, st.z2, PY);
      const far = Math.hypot(o.pose.x - a.x, o.pose.z - a.z);
      await penTo(o, Object.assign({ x: a.x, y: a.y + up, z: a.z, arc: far > 3 ? .6 : 0 }, WRITE), Math.min(420, 160 + far * 45));
      if (!alive()) return false;
      await penTo(o, Object.assign({ x: a.x, y: a.y + .004, z: a.z }, WRITE), 90);
      if (!alive()) return false;
      ribbonM.color.set(INK[pl]); shapeRibbon(ribbonG, st, st.w, PY + .002); ribbonG.setDrawRange(0, 0); ribbon.visible = true;
      const dur = 320; SND.scratch(dur);
      await anim(dur, k => {
        const e2 = k < .15 ? k * k / .3 : k;   // a slow start, then a steady stroke
        ribbonG.setDrawRange(0, Math.ceil(e2 * RSEG) * 6);
        const [x, zz] = qpt(st, e2), p = toRoot(x, zz, PY);
        setPose(o, Object.assign({ x: p.x, y: p.y + .004 + Math.sin(k * Math.PI * 3) * .006, z: p.z }, WRITE));
      });
      if (!alive()) return false;
      penTo(o, Object.assign({ x: z.x, y: z.y + up, z: z.z }, WRITE), 120);
      return true;
    }
    async function play(e, pl) {   // player pl draws edge e
      if (pvp || pl === human) hist.push({ by: by.slice(), owner: owner.slice(), score: score.slice(), turn, moves: moves.slice() });
      hideHint(); markEdge(preview, -1); busy = true; ply++;
      msg = ''; hud();
      const ok = await drawLine(e, pl);
      if (!ok || stopped) return;
      by[e] = pl; moves.push(e); ribbon.visible = false;
      const closed = edgeBoxes(e).filter(bx => cnt(bx) === 4 && owner[bx] < 0);
      closed.forEach(bx => { owner[bx] = pl; score[pl]++; });
      redraw();
      if (closed.length) { closed.forEach(bx => flash(bx, pl)); SND.box(closed.length); }
      over = moves.length === E;
      if (!closed.length) turn = 1 - turn;
      busy = false;
      if (over) return end();
      if (closed.length) { msg = X.again; hud(); }
      next(!!closed.length);
    }
    function hud(m) {
      if (m !== undefined) msg = m;
      const pill = c => `<span class="hs ${turn === c && !over ? 'on' : ''}"><i class="dk" style="background:${INK[c]};border-radius:4px;transform:rotate(45deg) scale(.8)"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}<b>${score[c]}</b></span>`;
      ctx.hud(`${pill(0)}<span class="hm">${msg || ''}</span>${pill(1)}`);
    }
    function next(again) {
      if (stopped || over) return;
      if (!again) msg = pvp ? X.turn.replace('{p}', pname(turn)) : turn === human ? L.turn : L.think;
      else if (!pvp && turn === ai) msg = L.think;
      hud(); onTurn();
      if (!pvp && turn === ai) aiMove();
      else if (!pens[turn].away) { /* the pen waits on the table until a line is chosen */ }
    }
    function aiMove() {
      busy = true;
      if (!worker) worker = new Worker(BASE + 'engine.js?v=' + EV);
      const t0 = Date.now(), j = ++aiJ;
      worker.onmessage = ev => {
        const m = ev.data; if (m.type !== 'move' || m.id !== j || stopped || j !== aiJ || over) return;
        setTimeout(() => { if (stopped || j !== aiJ || over) return; if (m.move >= 0 && by[m.move] < 0) play(m.move, ai); else { const f = by.findIndex(x => x < 0); if (f >= 0) play(f, ai); } }, Math.max(0, 420 - (Date.now() - t0)));
      };
      worker.postMessage({ type: 'move', id: j, R: n, C: n, edges: moves.slice(), level, lead: score[ai] - score[human] });
    }
    function end() {
      over = true; busy = false; hideHint(); markEdge(preview, -1); if (ctx.onTurn) ctx.onTurn(-1);
      penHome(0); penHome(1);
      const a = score[0], b = score[1];
      if (pvp) {
        const wt = a === b ? '' : X.win.replace('{p}', pname(a > b ? 0 : 1));
        hud(wt || L.draw);
        return ctx.onEnd({ win: false, draw: a === b, level, score: a + ' - ' + b, pvp: true, winnerText: wt });
      }
      const me = score[human], op = score[ai];
      hud(me > op ? L.win : me < op ? L.lose : L.draw);
      ctx.onEnd({ win: me > op, draw: me === op, level, score: me + ' - ' + op });
    }
    // the edge under the pointer: the nearer of the row / column lines, within ~0.38 spacing of it
    function edgeAt(ev) {
      const p = T3.pick(ev, PY); if (!p) return -1;
      const v = new THREE.Vector3(p.x, PY, p.z); root.localToWorld(v); nb.worldToLocal(v);
      const u = (v.x + PW / 2 - X0) / SP, w = (v.z + PD / 2 - Z0) / SP;
      if (u < -.4 || w < -.4 || u > n + .4 || w > n + .4) return -1;
      const rh = Math.round(w), ch = Math.floor(u), dh = Math.abs(w - rh), cv2 = Math.round(u), rv = Math.floor(w), dv = Math.abs(u - cv2);
      const okH = ch >= 0 && ch < n && rh >= 0 && rh <= n, okV = rv >= 0 && rv < n && cv2 >= 0 && cv2 <= n;
      let e = -1, d = .38;
      if (okH && dh < d) { e = rh * n + ch; d = dh; }
      if (okV && dv < d) e = HN + rv * (n + 1) + cv2;
      return e >= 0 && by[e] < 0 ? e : -1;
    }
    const canTap = () => !over && !busy && (pvp || turn === human);
    function onClick(ev) { if (!canTap() || T3.wasDrag()) return; const e = edgeAt(ev); if (e >= 0) play(e, turn); }
    let hov = -1;
    function onMove(ev) {
      if (ev.pointerType && ev.pointerType !== 'mouse') return;
      const e = canTap() ? edgeAt(ev) : -1;
      if (e !== hov) { hov = e; ctx.el.style.cursor = e >= 0 ? 'pointer' : ''; markEdge(preview, e); }
    }
    ctx.el.addEventListener('click', onClick); ctx.el.addEventListener('pointermove', onMove);
    hud(''); setTimeout(() => next(), 600);
    window.Atlas3D.dots._dbg = {
      at: e => { const st = strokeOf(e), [x, z] = qpt(st, .5), v = toRoot(x, z, PY); return T3.project(v.x, v.z, PY); },
      state: () => ({ n, turn, over, busy, human, pvp, score: score.slice(), moves: moves.slice(), drawn: moves.length, E, owner: Array.from(owner), hint: hintE, hist: hist.length }),
      safe: () => { const free = []; for (let e = 0; e < E; e++) if (by[e] < 0 && !edgeBoxes(e).some(bx => cnt(bx) >= 2)) free.push(e); return free; },
      closing: () => { for (let e = 0; e < E; e++) if (by[e] < 0 && edgeBoxes(e).some(bx => cnt(bx) === 3)) return e; return -1; },
    };

    /* ---------- 待った · 投了 · ヒント · time-out ---------- */
    function finish(loser, why) {
      if (over) return;
      over = true; busy = false; aiJ++; tok++; ribbon.visible = false; hideHint(); if (ctx.onTurn) ctx.onTurn(-1); penHome(0); penHome(1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = X.win.replace('{p}', pname(1 - loser)); hud(wt); return ctx.onEnd({ win: false, draw: false, level, score: t('act.pvpEnd', { p: pname(loser), r, w: wt }), pvp: true, winnerText: wt }); }
      hud(L.lose); ctx.onEnd({ win: false, draw: false, level, score: r });
    }
    const api = {
      human: pvp ? 0 : human,
      canUndo: () => canTap() && hist.length > 0,
      undo() {
        if (!api.canUndo()) return;
        const h = hist.pop(); aiJ++; tok++; hideHint();
        by = h.by; owner = h.owner; score = h.score; turn = h.turn; moves = h.moves; ply++;
        redraw(); penHome(0); penHome(1); next();
      },
      canHint: () => canTap(),
      hint() {
        if (!canTap()) return Promise.resolve(false);
        const j = ++hintJ, me = turn, mv = moves.slice();
        return new Promise(res => {
          if (!hintW) hintW = new Worker(BASE + 'engine.js?v=' + EV);
          hintW.onmessage = ev => {
            const m = ev.data; if (m.id !== j) return;
            if (stopped || j !== hintJ || turn !== me || over || busy || moves.length !== mv.length) return res(true);
            const e = m.type === 'analyze' && m.list && m.list.length ? m.list[0].m : -1;
            if (!(e >= 0) || by[e] >= 0) return res(false);
            hintE = e; markEdge(hintMk, e);
            anim(700, k => { hintMk.material.opacity = .3 + .45 * Math.abs(Math.sin(k * Math.PI * 2)); });
            res(true);
          };
          hintW.postMessage({ type: 'analyze', id: j, R: n, C: n, edges: mv, ms: 1200 });
        });
      },
      canResign: () => !over,
      resign() { if (!over) finish(pvp ? turn : human, 'resign'); },
      timeout(sd) { if (!over) finish(sd, 'time'); },
      stop() {
        stopped = true; tok++; tweens.clear(); if (raf) cancelAnimationFrame(raf);
        ctx.el.removeEventListener('click', onClick); ctx.el.removeEventListener('pointermove', onMove); ctx.el.style.cursor = '';
        if (worker) worker.terminate(); if (hintW) hintW.terminate();
        tex.dispose(); ribbonG.dispose();
      },
    };
    return api;
  }

  function levelInfo(n, lang) {
    const a = LV[lang] || LV.en, d = LVD[lang] || LVD.en, w = WHO[lang] || WHO.en;
    return { name: a[n], desc: d[n], rating: RATING[n], who: w[WG[n]] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.dots = { levels: 10, sides: true, modes: ['ai', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'bg', sizes: [3, 4, 5], size0: 4,
    sizeLabel: l => SIZE_L[l] || SIZE_L.en, levelInfo, start };   // table: start() plays on the chabudai itself
})();
