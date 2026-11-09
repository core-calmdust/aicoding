/* =====================================================================
   Ludo & Pachisi on the portal — table play (ちゃぶ台で遊ぶ).
   · One card, two rules: the "size" select picks the rule and the number of players
       2 / 3 / 4  → Ludo with that many colours        12 / 14 → Pachisi, 2 players (two colours each) / 4 players (2 v 2)
   · The game's own engine and AI (../ludo/engine.js, LudoEngine.think, levels 1..20) and texts (../ludo/i18n.js, loaded here).
   · Board, pieces, die and cowries: Table3D.MODELS.ludo (atlas/models/ludo.js).
   · You play seat 0 (red / yellow, at the bottom); vs the AI every other colour is the AI (in 4-player Pachisi your partner, black,
     is the AI too). Two players on one device: every colour is tapped in turn.
   ===================================================================== */
(function () {
  'use strict';
  const RN = {   // rule names and the players label for the size select
    ja: ['ルドー', 'パチーシ', '{n}人', 'ルールと人数'], en: ['Ludo', 'Pachisi', '{n} players', 'Rules & players'], zh: ['飞行棋式鲁多', '帕棋西', '{n}人', '规则与人数'],
    'zh-TW': ['魯多', '帕奇西', '{n}人', '規則與人數'], ko: ['루도', '파치시', '{n}인', '규칙·인원'], es: ['Ludo', 'Parchís indio', '{n} jugadores', 'Reglas y jugadores'],
    fr: ['Ludo', 'Pachisi', '{n} joueurs', 'Règle et joueurs'], pt: ['Ludo', 'Pachisi', '{n} jogadores', 'Regras e jogadores'], de: ['Ludo', 'Pachisi', '{n} Spieler', 'Regel & Spieler'],
    ru: ['Лудо', 'Пачиси', '{n} игрока', 'Правила и игроки'], tr: ['Ludo', 'Pachisi', '{n} oyuncu', 'Kural ve oyuncu'], id: ['Ludo', 'Pachisi', '{n} pemain', 'Aturan & pemain'],
    hi: ['लूडो', 'पचीसी', '{n} खिलाड़ी', 'नियम और खिलाड़ी'], ar: ['لودو', 'باتشيسي', '{n} لاعبين', 'القواعد واللاعبون'],
  };
  RN.zh[0] = '鲁多';
  const SIZES = [4, 3, 2, 14, 12];
  const sizeName = (z, l) => { const r = RN[l] || RN.en; return `${r[z > 10 ? 1 : 0]} · ${r[2].replace('{n}', z > 10 ? z - 10 : z)}`; };
  const sizeLabel = l => (RN[l] || RN.en)[3];

  const LVD = {
    ja: ['入門：目に任せて動かす', '初級：取りと安全マスを考える', '中級：危険と得点を比べる', '上級：次の一投まで読む'],
    en: ['Beginner: moves at random', 'Novice: looks for captures and safe squares', 'Intermediate: weighs risk against progress', 'Expert: looks ahead to the next throw'],
    zh: ['入门：随便走', '初级：会吃子、找安全格', '中级：权衡风险与前进', '高级：会算下一掷'], 'zh-TW': ['入門：隨便走', '初級：會吃子、找安全格', '中級：權衡風險與前進', '高級：會算下一擲'],
    ko: ['입문: 아무렇게나 움직인다', '초급: 잡기와 안전 칸을 노린다', '중급: 위험과 전진을 저울질한다', '상급: 다음 던지기까지 읽는다'],
    es: ['Inicial: mueve al azar', 'Principiante: busca capturas y casillas seguras', 'Intermedio: sopesa riesgo y avance', 'Experto: piensa en la próxima tirada'],
    fr: ['Débutant : joue au hasard', 'Novice : cherche prises et cases sûres', 'Intermédiaire : pèse risque et progrès', 'Expert : pense au lancer suivant'],
    pt: ['Iniciante: move ao acaso', 'Básico: procura capturas e casas seguras', 'Intermediário: pesa risco e avanço', 'Especialista: pensa no próximo lance'],
    de: ['Einsteiger: zieht zufällig', 'Anfänger: sucht Schlagen und sichere Felder', 'Mittel: wägt Risiko gegen Fortschritt ab', 'Experte: denkt an den nächsten Wurf'],
    ru: ['Начальный: ходит наугад', 'Новичок: ищет взятия и безопасные клетки', 'Средний: взвешивает риск и продвижение', 'Эксперт: думает о следующем броске'],
    tr: ['Başlangıç: rastgele oynar', 'Acemi: alma ve güvenli kare arar', 'Orta: riski ilerlemeyle tartar', 'Uzman: sonraki atışı düşünür'],
    id: ['Pemula: bergerak acak', 'Dasar: mencari tangkapan dan petak aman', 'Menengah: menimbang risiko dan kemajuan', 'Ahli: memikirkan lemparan berikutnya'],
    hi: ['शुरुआती: बेतरतीब चलता है', 'नौसिखिया: पकड़ और सुरक्षित खाने देखता है', 'मध्यम: जोखिम और बढ़त तौलता है', 'विशेषज्ञ: अगली चाल तक सोचता है'],
    ar: ['مبتدئ: يتحرك عشوائيًا', 'مبتدئ: يبحث عن الأسر والمربعات الآمنة', 'متوسط: يوازن الخطر والتقدم', 'خبير: يفكر في الرمية التالية'],
  };
  const WHO = {
    ja: ['はじめて', 'ルールを覚えた人', '慣れた人', '強い人'], en: ['First game', 'Knows the rules', 'Regular player', 'Strong player'], zh: ['第一次玩', '刚学会规则', '熟练玩家', '强手'], 'zh-TW': ['第一次玩', '懂規則', '常玩的人', '高手'],
    ko: ['처음', '규칙을 익힌 사람', '익숙한 사람', '강한 사람'], es: ['Primera partida', 'Conoce las reglas', 'Jugador habitual', 'Jugador fuerte'], fr: ['Première partie', 'Connaît les règles', 'Joueur régulier', 'Joueur fort'],
    pt: ['Primeira partida', 'Conhece as regras', 'Jogador habitual', 'Jogador forte'], de: ['Erste Partie', 'Kennt die Regeln', 'Geübter Spieler', 'Starker Spieler'], ru: ['Первая игра', 'Знает правила', 'Постоянный игрок', 'Сильный игрок'],
    tr: ['İlk oyun', 'Kuralları biliyor', 'Düzenli oyuncu', 'Güçlü oyuncu'], id: ['Permainan pertama', 'Tahu aturannya', 'Pemain rutin', 'Pemain kuat'], hi: ['पहला खेल', 'नियम जानता है', 'नियमित खिलाड़ी', 'मज़बूत खिलाड़ी'], ar: ['أول مباراة', 'يعرف القواعد', 'لاعب معتاد', 'لاعب قوي'],
  };
  function levelInfo(n, lang) { const b = n <= 3 ? 0 : n <= 8 ? 1 : n <= 14 ? 2 : 3; return { name: 'Lv.' + n, desc: (LVD[lang] || LVD.en)[b], who: (WHO[lang] || WHO.en)[b] }; }

  const SND = (() => {
    let C = null;
    const ac = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {} try { C = C || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    const tone = (a, t0, f0, f1, dur, vol, type) => { const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .004); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .02); };
    const noise = (a, t0, dur, vol, f) => { const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * dur | 0, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 4); n.buffer = b; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 1.3; const g = a.createGain(); g.gain.value = vol; n.connect(bp).connect(g).connect(a.destination); n.start(t0); };
    const at = f => { const a = ac(); if (a) try { f(a, a.currentTime + .005); } catch (e) {} };
    return {
      put: () => at((a, t) => { tone(a, t, 360, 170, .09, .15); noise(a, t, .03, .35, 3000); }),
      hop: () => at((a, t) => noise(a, t, .02, .16, 4200)),
      take: () => at((a, t) => { tone(a, t, 260, 90, .2, .2); noise(a, t, .06, .3, 1200); }),
      roll: () => at((a, t) => { for (let i = 0; i < 6; i++) noise(a, t + i * .07 + Math.random() * .03, .03, .25 + Math.random() * .2, 2600 + Math.random() * 1600); }),
      again: () => at((a, t) => [659.25, 987.77].forEach((f, i) => tone(a, t + i * .09, f, 0, .45, .07, 'triangle'))),
      home: () => at((a, t) => [523.25, 659.25, 783.99].forEach((f, i) => tone(a, t + i * .07, f, 0, .4, .07, 'triangle'))),
    };
  })();

  let i18nP = null;
  function loadTexts() {
    if (window.I18N && window.I18N.ja && window.I18N.ja['st.grace']) return Promise.resolve(window.I18N);
    return i18nP || (i18nP = new Promise(res => { const s = document.createElement('script'); s.src = '../ludo/i18n.js?v=4'; s.onload = () => res(window.I18N || {}); s.onerror = () => { i18nP = null; res({}); }; document.head.appendChild(s); }));
  }

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, E = window.LudoEngine, B2 = window.LudoBoard2D;
    const sz = SIZES.includes(+ctx.size) ? +ctx.size : 4, rule = sz > 10 ? 'pachisi' : 'ludo', players = sz > 10 ? sz - 10 : sz;
    const pvp = ctx.mode === 'pvp', level = Math.max(1, Math.min(20, +ctx.level || 6));
    const board = T3.MODELS.ludo(true, rule); T3.show('ludo', board);
    const U = board.userData, Y = U.top, u = U.u, n = U.n, geo = B2.geometry(rule);
    const tall = innerHeight > innerWidth * 1.15, W = n * u;
    const baseFit = () => innerHeight > innerWidth * 1.15 ? { w: W + .4, d: W + .9, y: Y + .2, pitch: 1.05 } : { w: W + .3, d: W + .6, y: Y + .2, pitch: 1.0 };
    if (T3.fit) T3.fit(baseFit());
    let S = {};   // texts (ludo/i18n.js)
    const tx = (k, o) => { let s = (S[k] != null ? S[k] : k); if (o) for (const q in o) s = s.split('{' + q + '}').join(o[q]); return s; };
    const L = { you: t('p.you'), ai: t('p.ai'), think: t('p.think'), win: t('res.win'), lose: t('res.lose') };
    let st = null, thr = null, moves = [], phase = 'wait', over = false, stopped = false, busy = false, selK = -1, hintMv = null, ply = 0, tok = 0, msg = '';
    const hist = [], timers = [];
    const later = (f, ms) => { const my = tok; timers.push(setTimeout(() => { if (!stopped && my === tok) f(); }, ms)); };
    const sleep = ms => new Promise(r => later(r, ms));
    const human = seat => st && (pvp || st.ctrl[seat] === 0);
    const myTeam = () => st ? st.team[0] : 0;
    const colName = seat => tx('c.' + rule + '.' + seat);
    const seatName = seat => pvp ? colName(seat) : st.ctrl[seat] === 0 ? (rule === 'pachisi' && players === 2 && seat !== 0 ? L.you + '（' + colName(seat) + '）' : L.you) : colName(seat);
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(nw) { if (stopped) return; const k = Math.min(1, Math.max(0, (nw - t0) / dur)); f(k); if (T3.kick) T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const animP = (dur, f) => new Promise(r => anim(dur, f, r));
    const wx = (gx, gy) => U.xz(gx, gy);

    /* ---------- pieces ---------- */
    const pcs = {};   // 'seat,k' → group
    function homeXY(seat, k, p) { const L0 = E.lastOf(st); return p < 0 ? geo.yard(seat, k) : p >= L0 ? geo.home(seat, k) : geo.cellXY(seat, p); }
    function layout() {   // where each piece stands now (pieces sharing a square spread round it, a little smaller)
      const out = {}, groups = {}, L0 = E.lastOf(st);
      for (const seat of st.seats) st.pos[seat].forEach((p, k) => { const key = p < 0 || p >= L0 ? 'y' + seat + k : String(E.cellOf(rule, seat, p)); (groups[key] = groups[key] || []).push([seat, k, p]); });
      for (const key in groups) {
        const G = groups[key], m = G.length;
        G.forEach(([seat, k, p], i) => {
          let [x, y] = homeXY(seat, k, p), z = 1;
          if (m > 1) { const a = i / m * Math.PI * 2 - Math.PI / 2, r = .2; x += Math.cos(a) * r; y += Math.sin(a) * r; z = .8; }
          if (p >= L0) z = rule === 'pachisi' ? .62 : .55;
          out[seat + ',' + k] = { gx: x, gy: y, z };
        });
      }
      return out;
    }
    function mk(seat, k) {
      const g = U.piece(rule, seat), sh = T3.contact(g.userData.r * 1.1, .45); sh.position.y = .002; g.add(sh);
      g.userData.key = seat + ',' + k; board.add(g); return g;
    }
    function place(g, gx, gy, z, h) { const [x, zz] = wx(gx, gy); g.position.set(x, Y + (h || 0), zz); g.scale.set(z, z, z); g.userData.gx = gx; g.userData.gy = gy; g.userData.z = z; }
    function placeAll(skip) { const L0 = layout(); for (const key in L0) { if (skip && skip.has(key)) continue; const q = L0[key]; place(pcs[key], q.gx, q.gy, q.z); } if (T3.kick) T3.kick(200); }
    function build() { Object.values(pcs).forEach(g => board.remove(g)); for (const key in pcs) delete pcs[key]; for (const seat of st.seats) for (let k = 0; k < 4; k++) pcs[seat + ',' + k] = mk(seat, k); placeAll(); }
    // a move: hop square by square (long runs faster), then the captured pieces fly home
    async function walk(s0, m) {
      if (!m || m.pass) return;
      const seat = s0.turn, g = pcs[seat + ',' + m.k], L0 = E.lastOf(s0);
      const pts = [[g.userData.gx, g.userData.gy]];
      if (m.enter) pts.push(geo.cellXY(seat, 0));
      else if (m.to < m.from) for (let p = m.from - 1; p >= m.to; p--) pts.push(geo.cellXY(seat, p));   // (house rule: a step back)
      else for (let p = m.from + 1; p <= m.to; p++) pts.push(p >= L0 ? geo.home(seat, m.k) : geo.cellXY(seat, p));
      const g2 = m.k2 != null ? pcs[seat + ',' + m.k2] : null;   // (house rule: a double moves as one)
      const steps = pts.length - 1, dur = steps > 12 ? 85 : 130, z0 = g.userData.z, z1 = m.to >= L0 ? (rule === 'pachisi' ? .62 : .55) : 1;
      for (let i = 1; i <= steps; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        await animP(dur, k => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, z = z0 + (z1 - z0) * (i - 1 + k) / steps; place(g, ax + (bx - ax) * e, ay + (by - ay) * e, z, Math.sin(k * Math.PI) * u * .45); if (g2) place(g2, ax + (bx - ax) * e + .18, ay + (by - ay) * e + .18, z * .9, Math.sin(k * Math.PI) * u * .45); });
        if (stopped) return; SND.hop();
      }
      SND.put();
    }
    function flyHome(caps) {
      return Promise.all((caps || []).map(c => { const g = pcs[c.seat + ',' + c.k], [x1, y1] = geo.yard(c.seat, c.k), x0 = g.userData.gx, y0 = g.userData.gy, z0 = g.userData.z;
        return animP(560, k => { place(g, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, z0 + (1 - z0) * k, Math.sin(k * Math.PI) * u * 2.2); g.rotation.z = Math.sin(k * Math.PI) * .6; }).then(() => { g.rotation.z = 0; }); }));
    }

    /* ---------- the die / the cowries ---------- */
    const thrown = new TH.Group(); board.add(thrown);
    function throwSpot(seat) {   // ludo: the middle of the seat's yard; pachisi: the open corner left of the seat's arm
      if (rule === 'ludo') { const Y0 = [[0, 9], [0, 0], [9, 0], [9, 9]][seat]; return [Y0[0] + 3, Y0[1] + 3]; }
      const [dx, dy] = [[0, 1], [1, 0], [0, -1], [-1, 0]][seat], lx = -dy, ly = dx; return [9.5 + (dx + lx) * 4.6, 9.5 + (dy + ly) * 4.6];
    }
    const FACE = { 1: [0, 0, 0], 6: [Math.PI, 0, 0], 2: [-Math.PI / 2, 0, 0], 5: [Math.PI / 2, 0, 0], 3: [0, 0, Math.PI / 2], 4: [0, 0, -Math.PI / 2] };
    let dieG = null;
    /* the dice cup (ludo, 2026-11-09 v2): it stands mouth UP in the yard of the seat to throw. The throw: it shakes (the dice
       rattle inside), turns over and comes down mouth down on the board, then lifts away to the side — the dice lie where it
       stood. On the next turn it goes, turning mouth up again, to that seat's yard. */
    let cupG = null, cupSeat = -1;
    const CR0 = .58, CR1 = .54, CH = .72;
    function mkCup() {
      const g = new TH.Group();
      // (2026-11-09 v3) a black leather cup lined with red felt: a rolled rim with a stitch line, a stitched band at the base
      const leather = new TH.MeshStandardMaterial({ color: 0x18181b, roughness: .52, metalness: 0 });
      const inside = new TH.MeshStandardMaterial({ color: 0xa8141d, roughness: 1, metalness: 0, side: TH.BackSide });
      const felt = new TH.MeshStandardMaterial({ color: 0x8e1018, roughness: 1, metalness: 0 });
      const seam = new TH.MeshStandardMaterial({ color: 0x4a4a50, roughness: .7, metalness: 0 });
      const body = new TH.Mesh(new TH.CylinderGeometry(CR1, CR0, CH, 40, 1, true), leather); body.position.y = CH / 2; body.castShadow = true;
      const lin = new TH.Mesh(new TH.CylinderGeometry(CR1 - .03, CR0 - .03, CH - .01, 40, 1, true), inside); lin.position.y = CH / 2;
      const top = new TH.Mesh(new TH.CircleGeometry(CR1, 40), leather); top.rotation.x = -Math.PI / 2; top.position.y = CH;   // the base, outside
      const floor = new TH.Mesh(new TH.CircleGeometry(CR1 - .03, 40), felt); floor.rotation.x = Math.PI / 2; floor.position.y = CH - .012;   // the base, inside (felt)
      const rim = new TH.Mesh(new TH.TorusGeometry(CR0 - .015, .032, 10, 48), leather); rim.rotation.x = Math.PI / 2; rim.position.y = .012;   // the rolled rim (the mouth)
      const s1 = new TH.Mesh(new TH.TorusGeometry(CR0 - .004, .006, 4, 64), seam); s1.rotation.x = Math.PI / 2; s1.position.y = .1;
      const band = new TH.Mesh(new TH.CylinderGeometry(CR1 + .022, CR1 + .026, .13, 40, 1, true), leather); band.position.y = CH - .065;   // the band at the base
      const s2 = new TH.Mesh(new TH.TorusGeometry(CR1 + .025, .006, 4, 64), seam); s2.rotation.x = Math.PI / 2; s2.position.y = CH - .13;
      const sh = T3.contact(CR0 * 1.35, .45); sh.position.y = .002;
      const dice = new TH.Group();   // the dice inside (seen through the mouth while it stands mouth up)
      const inner = new TH.Group(); inner.add(body, lin, top, floor, rim, s1, band, s2, dice); g.add(sh, inner); g.userData = { inner, sh, dice, mats: [leather, inside, felt, seam] };
      return g;
    }
    // fill the cup: one die, two with the two-dice house rule. (Inner coordinates are mouth down: the base is at y = CH, so the
    // dice lie against it — the bottom when the cup stands mouth up.)
    function cupDice(show) {
      const D = cupG.userData.dice;
      while (D.children.length) D.remove(D.children[0]);
      D.visible = !!show; if (!show) return;
      const h = st && st.opt && st.opt.h, n = h && h.dd && h.dd !== 'none' ? 2 : 1, sc = .7;
      for (let i = 0; i < n; i++) {
        const d = U.die(), hh = d.userData.size / 2 * sc; d.scale.setScalar(sc);
        d.children[0].rotation.set(...FACE[1 + Math.floor(Math.random() * 6)]);
        d.position.set(n > 1 ? (i ? .19 : -.19) : 0, CH - hh - .012, n > 1 ? (i ? .06 : -.06) : 0); d.rotation.set(Math.PI, Math.random() * 6.28, 0);
        d.userData.y0 = d.position.y; D.add(d);
      }
    }
    const cupXZ = seat => { const [gx, gy] = throwSpot(seat); return wx(gx, gy); };
    const parkXZ = seat => { const [gx, gy] = throwSpot(seat), ox = gx < 7.5 ? -2.05 : 2.05; return wx(gx + ox, gy - 2.05); };   // the yard's far outer corner (clear of the pieces, behind them as seen)
    // the cup's pose: up = 1 mouth up (standing on its base), 0 mouth down; lift: height above the board
    function cupPose(up, lift, rz) { const I = cupG.userData.inner; I.rotation.set(Math.PI * up, 0, rz || 0); I.position.set(0, CH * up + (lift || 0), 0); cupG.userData.sh.scale.setScalar(Math.max(.4, 1 - (lift || 0) * .5)); }
    // a move across the board in one arc (2026-11-09 v2: up-across-down read as separate steps): the cup rises fast and stays above
    // the pawns (.87 × .66 ≈ .57) while it is over the yard's pieces — it is wider than the gap between two yard slots.
    // Returns [x, z, lift] at k ∈ [0, 1].
    const HOP = .92;
    function hop(x0, z0, x1, z1, k) {
      const e = k * k * (3 - 2 * k), l = HOP * Math.pow(Math.max(0, Math.sin(Math.PI * k)), .4);
      return [x0 + (x1 - x0) * e, z0 + (z1 - z0) * e, l];
    }
    let cupBusy = Promise.resolve(), cupUp = 1;
    // the next turn: the cup (lying mouth down beside the last throw) comes over, turns mouth up beside the dice and they hop in
    // (scooped up — no dice vanishing), then it carries them to the seat to throw (2026-11-09)
    async function scoop() {
      const ds = thrown.children.filter(o => o.userData && o.userData.size), g = cupG;
      if (!ds.length || !g) return false;
      thrown.children.filter(o => !ds.includes(o)).forEach(o => thrown.remove(o));   // (their shadows)
      let cx = 0, cz = 0; ds.forEach(d => { cx += d.position.x / ds.length; cz += d.position.z / ds.length; });
      // (2026-11-09) it turns mouth up where it lies (the yard's corner, clear of the pieces) and the dice hop over into it —
      // moving it beside the dice put it on top of a piece in the yard
      const tx = g.position.x, tz = g.position.z, up0 = cupUp;
      await animP(320, k => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; cupPose(up0 + (1 - up0) * e, Math.sin(k * Math.PI) * .5); });
      if (stopped) return true;
      cupUp = 1;
      const from = ds.map(d => [d.position.x, d.position.y, d.position.z, d.rotation.x, d.rotation.z]), hh = ds[0].userData.size / 2;
      await animP(340, k => ds.forEach((d, i) => { const q = Math.min(1, Math.max(0, k * 1.25 - i * .25)), e = q * q * (3 - 2 * q), f = from[i];
        d.position.set(f[0] + (tx - f[0]) * e, f[1] + (Y + CH * .35 - f[1]) * e + Math.sin(q * Math.PI) * 1.1, f[2] + (tz - f[2]) * e);
        d.rotation.x = f[3] + q * 4; d.rotation.z = f[4] + q * 2.5; d.scale.setScalar(1 - .3 * e); }));
      while (thrown.children.length) thrown.remove(thrown.children[0]);
      cupDice(true); SND.hop(); void hh;
      return true;
    }
    function cupTo(seat, glide) {
      if (rule !== 'ludo') return;
      if (!cupG) { cupG = mkCup(); board.add(cupG); }
      const [x, z] = cupXZ(seat), g = cupG;
      if (!glide || cupSeat < 0) { cupDice(true); g.position.set(x, Y, z); cupPose(1, 0); cupUp = 1; cupSeat = seat; if (T3.kick) T3.kick(200); return; }
      cupBusy = cupBusy.then(async () => {
        await scoop(); if (stopped) return;
        if (!g.userData.dice.children.length) cupDice(true);
        const x0 = g.position.x, z0 = g.position.z, up0 = cupUp; cupSeat = seat;
        if (Math.hypot(x - x0, z - z0) < .01) { cupPose(1, 0); cupUp = 1; return; }
        await animP(520, k => { const [hx, hz, hl] = hop(x0, z0, x, z, k); g.position.set(hx, Y, hz); cupPose(up0 + (1 - up0) * Math.min(1, k * 2), hl); });
        cupUp = 1;
      });
    }
    // the throw: shake mouth up · turn over and come down · lift away (the dice are put under it as it lands)
    async function cupThrow(seat, th) {
      await cupBusy; if (stopped) return;   // (the cup may still be scooping up the last dice / on its way)
      if (!cupG || cupSeat !== seat) cupTo(seat);
      const g = cupG, [cx, cz] = cupXZ(seat);
      g.position.set(cx, Y, cz); cupPose(1, 0);
      if (!g.userData.dice.children.length) cupDice(true);
      const DD = g.userData.dice.children;
      await animP(520, k => { const w = Math.sin(k * Math.PI * 8) * Math.min(1, k * 4) * (1 - Math.max(0, k - .85) / .15); cupPose(1, Math.min(1, k * 4) * .35, w * .22); g.position.x = cx + w * .06;
        DD.forEach((d, i) => { const j = Math.abs(Math.sin(k * Math.PI * 9 + i * 1.7)) * Math.min(1, k * 4); d.position.y = d.userData.y0 - j * .12; d.rotation.x = Math.PI + k * Math.PI * (7 + i) * (i ? -1 : 1) * Math.min(1, k * 4); d.rotation.z = k * Math.PI * (5 - i); d.rotation.y += .25; }); });   // (tumbling: the face on top keeps changing)   // (the dice rattle inside)
      if (stopped) return;
      g.position.x = cx;
      await animP(300, k => { const e = k * k; cupPose(1 - e, .35 * (1 - e) + Math.sin(k * Math.PI) * .45); });
      if (stopped) return;
      cupPose(0, 0); cupUp = 0; SND.put(); cupDice(false);   // (the dice now lie on the board under it)
      // the dice, under the cup
      const fs = th.dice ? (th.three6 ? [6, 6] : th.dice) : [th.v];
      fs.forEach((v, i) => { const d = U.die(), h = d.userData.size / 2, sh = T3.contact(h * 1.4, .4), ox = fs.length > 1 ? (i ? .27 : -.27) : 0, oz = fs.length > 1 ? (i ? .05 : -.05) : 0;
        d.children[0].rotation.set(...FACE[v]); d.position.set(cx + ox, Y + h + .003, cz + oz); d.rotation.y = (Math.random() - .5) * .9; sh.position.set(cx + ox, Y + .002, cz + oz); thrown.add(sh, d); if (!i) dieG = d; });
      await animP(90, k => cupPose(0, Math.sin(k * Math.PI) * .03));
      if (stopped) return;
      await sleep(140); if (stopped) return;
      // lift it away to the side, still mouth down
      const [px, pz] = parkXZ(seat);
      await animP(520, k => { const [hx, hz, hl] = hop(cx, cz, px, pz, k); g.position.set(hx, Y, hz); cupPose(0, hl); });
      cupPose(0, 0);
    }
    function restDie(seat, v) {
      while (thrown.children.length) thrown.remove(thrown.children[0]);
      if (rule === 'ludo') { cupTo(seat); return; }   // (ludo: the cup stands in the yard, the dice under it)
      if (rule !== 'ludo') { if (v) return; return; }
      dieG = U.die(); const [gx, gy] = throwSpot(seat), [x, z] = wx(gx, gy), h = dieG.userData.size / 2;
      dieG.children[0].rotation.set(...FACE[v || 6]); dieG.position.set(x, Y + h, z); dieG.rotation.y = .5;
      const sh = T3.contact(h * 1.5, .4); sh.position.set(x, Y + .002, z); thrown.add(sh, dieG);
      if (T3.kick) T3.kick(200);
    }
    async function throwAnim(seat, th) {
      SND.roll();
      if (rule !== 'ludo') while (thrown.children.length) thrown.remove(thrown.children[0]);   // (ludo: the cup scoops the last dice up first)
      const [gx, gy] = throwSpot(seat), [cx, cz] = wx(gx, gy);
      if (rule === 'ludo') { await cupThrow(seat, th); return; }   // (the cup: shake, over, lift — the dice under it)
      if (rule === 'ludo' && th.dice) {   // (house rule: two dice — 666 shows the double six)
        const fs = th.three6 ? [6, 6] : th.dice, ds = fs.map((v, i) => { const d = U.die(), h = d.userData.size / 2, sh = T3.contact(h * 1.5, .4); thrown.add(sh, d); d.children[0].rotation.set(...FACE[v]);
          const ox = (i ? .55 : -.55) * u, sx = (Math.random() < .5 ? -1 : 1) * (2 + Math.random() * 2) * Math.PI, sy = (Math.random() - .5) * 4 * Math.PI, sz2 = (Math.random() < .5 ? -1 : 1) * 2 * Math.PI, yaw = Math.random() * 6.28;
          return { d, h, sh, x: cx + ox, z: cz + (Math.random() - .5) * u * .6, sx, sy, sz2, yaw }; });
        dieG = ds[0].d;
        await animP(720, k => ds.forEach(o => { const r = Math.pow(1 - k, 2), b = Math.abs(Math.sin(k * Math.PI * 2.5)) * (1 - k) * 1.3; o.d.rotation.set(o.sx * r, o.yaw + o.sy * r, o.sz2 * r); o.d.position.set(o.x, Y + o.h + b, o.z); o.sh.position.set(o.x, Y + .002, o.z); }));
        return;
      }
      if (rule === 'ludo') {
        dieG = U.die(); const h = dieG.userData.size / 2, sh = T3.contact(h * 1.5, .4); sh.position.set(cx, Y + .002, cz); thrown.add(sh, dieG);
        dieG.children[0].rotation.set(...FACE[th.v]);
        const sx = (Math.random() < .5 ? -1 : 1) * (2 + Math.random() * 2) * Math.PI, sy = (Math.random() - .5) * 4 * Math.PI, sz2 = (Math.random() < .5 ? -1 : 1) * 2 * Math.PI, yaw = Math.random() * 6.28;
        const fx = cx + (Math.random() - .5) * u * .8, fz = cz + (Math.random() - .5) * u * .8;
        await animP(720, k => { const r = Math.pow(1 - k, 2), b = Math.abs(Math.sin(k * Math.PI * 2.5)) * (1 - k) * 1.3; dieG.rotation.set(sx * r, yaw + sy * r, sz2 * r); dieG.position.set(fx + (cx - fx) * (1 - k) * .3, Y + h + b, fz); sh.position.set(dieG.position.x, Y + .002, fz); });
        return;
      }
      const shells = th.shells || [0, 1, 2, 3, 4, 5].map(i => i < th.face);
      const ps = []; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + Math.random() * .6, r = (.5 + Math.random() * 1.1) * u; ps.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r, Math.random() * 6.28]); }
      const gs = shells.map((up, i) => { const g = U.cowrie(up); g.position.set(ps[i][0], Y, ps[i][1]); g.rotation.y = ps[i][2]; thrown.add(g); return g; });
      await animP(700, k => gs.forEach((g, i) => { const d = Math.min(1, Math.max(0, k * 1.25 - i * .04)), r = 1 - d; g.position.y = Y + Math.abs(Math.sin(d * Math.PI * 2)) * r * .9 + r * .6; g.rotation.x = r * r * 4 * Math.PI; g.rotation.y = ps[i][2] + r * 3; }));
    }

    /* ---------- marks ---------- */
    const mk2 = new TH.Group(); board.add(mk2);
    const basic = (c, o) => new TH.MeshBasicMaterial({ color: c, transparent: true, opacity: o, toneMapped: false, depthWrite: false });
    const MAT = { can: basic(0xffa000, 1), hint: basic(0xff3d7f, 1), dest: basic(0x3df59a, .8), last: basic(0x2f8cff, .5) };
    const GEO = { ring: new TH.TorusGeometry(u * .48, u * .075, 8, 40), disc: new TH.CircleGeometry(u * .38, 32) };
    GEO.ring.rotateX(Math.PI / 2); GEO.disc.rotateX(-Math.PI / 2);
    let pulse = 0;
    function clearMarks() { while (mk2.children.length) mk2.remove(mk2.children[0]); if (T3.kick) T3.kick(120); }
    function ring(gx, gy, mat, s) { const m = new TH.Mesh(GEO.ring, mat), [x, z] = wx(gx, gy); m.position.set(x, Y + .02, z); m.scale.setScalar(s || 1); m.renderOrder = 3; mk2.add(m); return m; }
    function disc(gx, gy, mat) { const m = new TH.Mesh(GEO.disc, mat), [x, z] = wx(gx, gy); m.position.set(x, Y + .006, z); m.renderOrder = 2; mk2.add(m); return m; }
    function showMarks() {
      clearMarks();
      if (phase !== 'move' || !st || !human(st.turn)) return;
      const seat = st.turn, real = moves.filter(m => !m.pass), ks = [...new Set(real.map(m => m.k))];
      ks.forEach(k => { const g = pcs[seat + ',' + k]; ring(g.userData.gx, g.userData.gy, hintMv && hintMv.k === k ? MAT.hint : MAT.can, g.userData.z); });
      const show = selK >= 0 ? real.filter(m => m.k === selK) : hintMv && !hintMv.pass ? real.filter(m => m.k === hintMv.k && m.to === hintMv.to) : [];
      show.forEach(m => { const [gx, gy] = m.to >= E.lastOf(st) ? geo.home(seat, m.k) : geo.cellXY(seat, m.to); disc(gx, gy, hintMv && m.to === hintMv.to && selK < 0 ? MAT.hint : MAT.dest); });
      if (!pulse) { const t0 = performance.now(); pulse = setInterval(() => { if (stopped || !mk2.children.length) return; const s = 1 + Math.sin((performance.now() - t0) / 220) * .07; mk2.children.forEach(m => { if (m.geometry === GEO.ring) m.scale.setScalar(s * (m.userData.s0 || (m.userData.s0 = m.scale.x))); }); if (T3.kick) T3.kick(80); }, 60); }
    }

    /* ---------- the focus (phones): the camera moves in on the seat to move — its yard and die before the roll, the pieces that can
       move and where they go after it, the walking piece while it walks — and glides on to the next seat (no cut). The button at the
       right edge switches it off (the whole board), remembered in atlas-ludo-zoom. ---------- */
    let zoomPref = true; try { zoomPref = localStorage.getItem('atlas-ludo-zoom') !== '0'; } catch (e) {}
    const small = () => innerWidth <= 700 || innerHeight > innerWidth * 1.15;
    let focusPts = null;
    function yardPts(seat) {
      if (rule === 'ludo') { const Y0 = [[0, 9], [0, 0], [9, 0], [9, 9]][seat]; return [[Y0[0], Y0[1]], [Y0[0] + 6, Y0[1] + 6]]; }
      const [sx, sy] = throwSpot(seat), o = [[sx - 2.6, sy - 2.6], [sx + 2.6, sy + 2.6]];
      for (let k = 0; k < 4; k++) o.push(geo.yard(seat, k));
      return o;
    }
    const cellPt = (seat, m) => m.to >= E.lastOf(st) ? geo.home(seat, m.k) : geo.cellXY(seat, m.to);
    function applyFocus() {
      if (!T3.fit || stopped) return;
      const on = zoomPref && small() && focusPts && focusPts.length;
      if (zoomBtn) { zoomBtn.hidden = !small() || over; zoomBtn.classList.toggle('off', !zoomPref); }
      if (!on) { T3.fit(Object.assign(baseFit(), { ease: true })); return; }
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      focusPts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      const pad = 1.4, sw = Math.max(8, x1 - x0 + pad * 2), sd = Math.max(8, y1 - y0 + pad * 2);
      if (Math.max(sw, sd) > n - 2) { T3.fit(Object.assign(baseFit(), { ease: true })); return; }   // spread over the board: the whole board
      // the view is wider or taller than the box (the screen's shape): keep what it really shows inside the board, no table at the edge
      const asp = (ctx.el.clientWidth || innerWidth) / (ctx.el.clientHeight || innerHeight), vw = Math.min(n, Math.max(sw, sd * asp)), vd = Math.min(n, Math.max(sd, sw / asp * .82));
      const cl = (c, h) => Math.max(h, Math.min(n - h, c));
      const gx = cl((x0 + x1) / 2, vw / 2 - .4), gy = cl((y0 + y1) / 2, vd / 2 - .4), [cx, cz] = wx(gx, gy), B0 = baseFit();
      T3.fit({ w: sw * u, d: sd * u + (B0.d - W), y: Y + .2, pitch: B0.pitch, cx, cz, ease: true });
    }
    function focus(pts) { focusPts = pts; applyFocus(); }
    const focusSeat = seat => focus(yardPts(seat).concat([throwSpot(seat)]));
    function focusMoves(seat, ms) {
      const pts = [];
      ms.filter(m => !m.pass).forEach(m => { const g = pcs[seat + ',' + m.k]; pts.push([g.userData.gx, g.userData.gy]); pts.push(cellPt(seat, m)); });
      if (pts.length) focus(pts);
    }
    let zoomBtn = null;
    {
      const ZL = { ja: ['手番に寄る', '盤全体を見る'], en: ['Zoom to the player', 'Whole board'], zh: ['聚焦当前玩家', '查看整个棋盘'], 'zh-TW': ['聚焦目前玩家', '查看整個棋盤'], ko: ['차례인 사람에게 확대', '판 전체 보기'], es: ['Acercar al turno', 'Tablero entero'], fr: ['Zoom sur le joueur', 'Plateau entier'], pt: ['Aproximar da vez', 'Tabuleiro inteiro'], de: ['Zum Spieler zoomen', 'Ganzes Brett'], ru: ['Приблизить к ходящему', 'Вся доска'], tr: ['Sıradakine yakınlaş', 'Tüm tahta'], id: ['Perbesar ke giliran', 'Seluruh papan'], hi: ['बारी वाले पर ज़ूम', 'पूरा बोर्ड'], ar: ['تقريب إلى صاحب الدور', 'اللوحة كاملة'] };
      const zl = ZL[ctx.lang] || ZL.en;
      zoomBtn = document.createElement('button'); zoomBtn.type = 'button'; zoomBtn.className = 'ldzoom';
      const paint = () => { const t2 = zoomPref ? zl[1] : zl[0]; zoomBtn.title = t2; zoomBtn.setAttribute('aria-label', t2);
        zoomBtn.innerHTML = zoomPref ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M10.5 8v5M8 10.5h5"/></svg>'; };
      paint();
      zoomBtn.onclick = e => { e.stopPropagation(); zoomPref = !zoomPref; try { localStorage.setItem('atlas-ludo-zoom', zoomPref ? '1' : '0'); } catch (er) {} paint(); applyFocus(); };
      (ctx.el.parentNode || document.body).appendChild(zoomBtn);
    }
    const onResize = () => applyFocus();
    addEventListener('resize', onResize);

    /* ---------- HUD ---------- */
    const css = document.createElement('style');
    css.textContent = '.ldzoom{position:absolute;z-index:4;right:12px;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.92);color:#3a3f55;box-shadow:0 3px 10px rgba(0,0,0,.22);display:grid;place-items:center;cursor:pointer;padding:0}.ldzoom svg{width:22px;height:22px}.ldzoom[hidden]{display:none}.ldzoom.off{color:#e0662a}' + '.hud .ldb{padding:8px 16px;font-size:15px;white-space:nowrap}.hud .lds{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:99px;font-weight:800;font-size:13px;opacity:.6;white-space:nowrap}.hud .lds.on{opacity:1;background:rgba(255,255,255,.9);box-shadow:0 2px 8px rgba(0,0,0,.15)}.hud .lds i{width:14px;height:14px;border-radius:50%;display:inline-block;flex:none;box-shadow:inset 0 0 0 1.5px rgba(0,0,0,.25)}.hud .ldm{font-weight:800;font-size:13px;max-width:46vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ldtoast{position:fixed;left:50%;top:calc(76px + env(safe-area-inset-top));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:9px 18px;border-radius:99px;background:#2b3044;color:#fff;font-weight:900;font-size:14px;box-shadow:0 8px 22px rgba(0,0,0,.3);pointer-events:none;white-space:nowrap}@media (max-width:560px){.hud .ldb{padding:7px 11px;font-size:13px}.hud .lds{padding:3px 6px;font-size:12px}.hud .lds .nm{display:none}}';
    document.head.appendChild(css);
    let toastEl = null, toastT = 0;
    function toast(m) { if (toastEl) toastEl.remove(); clearTimeout(toastT); if (!m || stopped) return; toastEl = document.createElement('div'); toastEl.className = 'ldtoast'; toastEl.textContent = m; document.body.appendChild(toastEl); const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 1500); }
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const dot = seat => B2.COL[rule][seat][0];
    function hud() {
      if (stopped || !st) return;
      const L0 = E.lastOf(st);
      const pill = seat => `<span class="lds ${st.turn === seat && !over ? 'on' : ''}"><i style="background:${dot(seat)}"></i><span class="nm">${esc(seatName(seat))}</span><b>${st.pos[seat].filter(p => p >= L0).length}</b></span>`;
      const mine = !over && human(st.turn);
      let mid = `<span class="ldm">${esc(msg)}</span>`;
      if (mine && phase === 'roll') mid = `<button type="button" class="btn go ldb" data-ldt="roll">${rule === 'pachisi' ? '🐚' : '🎲'} ${esc(tx(rule === 'pachisi' ? 'btn.throw' : 'btn.roll'))}</button>`;
      else if (mine && phase === 'move' && moves.some(m => m.pass)) mid = `<span class="ldm">${esc(msg)}</span><button type="button" class="btn ldb" data-ldt="pass">${esc(tx('btn.pass'))}</button>`;
      const half = Math.ceil(st.seats.length / 2);
      ctx.hud(st.seats.slice(0, half).map(pill).join('') + mid + st.seats.slice(half).map(pill).join(''));
    }
    const say = m => { msg = m || ''; hud(); };
    const throwText = th => rule === 'pachisi' ? tx('throw.cowrie', { u: th.face, v: th.v }) : th.dice ? (st.left || th.dice).join(' + ') : String(th.v);

    /* ---------- the flow ---------- */
    function onTurn() { ply++; if (ctx.onTurn) ctx.onTurn(st.team[st.turn] === myTeam() ? 0 : 1, { human: human(st.turn), ply }); }
    function next() {
      if (over || stopped) return;
      thr = null; moves = []; selK = -1; hintMv = null; clearMarks(); onTurn();
      const seat = st.turn;
      focusSeat(seat); cupTo(seat, true);
      if (human(seat)) {
        if (!pvp) hist.push(E.clone(st));
        phase = 'roll'; say(pvp ? tx('st.turn', { p: colName(seat) }) : tx('st.yourRoll', { b: tx(rule === 'pachisi' ? 'st.throwv' : 'st.rollv') }));
      } else { phase = 'ai'; say(tx('st.think', { p: colName(seat) })); later(doRoll, 450); }
    }
    async function doRoll() {
      if (over || stopped || busy || (phase !== 'roll' && phase !== 'ai')) return;
      const ai = phase === 'ai'; busy = true; phase = 'anim'; if (!ai) say('');
      const seat = st.turn, th = E.rollThrow(st);
      await throwAnim(seat, th); if (stopped) return;
      thr = th; busy = false; afterThrow(seat, th);
    }
    function afterThrow(seat, th) {   // the moves of a throw (two dice: again for the rest of it, without a new roll)
      selK = -1; hintMv = null;
      const sub = throwText(th) + (rule === 'pachisi' && th.grace ? ' · ' + tx('st.grace') : '');
      moves = E.legalMoves(st, th); const real = moves.filter(m => !m.pass);
      const dz = rule === 'pachisi' ? '🐚 ' : '🎲 ';
      if (!real.length) { const m = moves[0] || { pass: true }; phase = 'auto'; const w = m.forfeit ? tx('st.three') : tx('st.nomove'); say(dz + sub); toast(w); later(() => commit(m), 560); return; }   // (the bar keeps a short status; the sentence goes up top)
      if (!human(seat)) { phase = 'auto'; const r = E.think(st, th, level); later(() => commit(r.move || real[0]), 380); return; }
      if (real.length === 1 && !moves.some(m => m.pass)) { phase = 'auto'; say(dz + sub); later(() => commit(real[0]), 420); return; }
      phase = 'move'; say(dz + sub); showMarks(); focusMoves(seat, real);
    }
    async function commit(m) {
      if (over || stopped || busy) return;
      busy = true; phase = 'anim'; clearMarks();
      const s0 = st, seat = s0.turn, th = thr;
      if (m && !m.pass) { const g = pcs[seat + ',' + m.k], pts = [[g.userData.gx, g.userData.gy], cellPt(seat, m)]; focus(pts); }
      await walk(s0, m); if (stopped) return;
      if (m && m.cap && m.cap.length) { SND.take(); toast(tx('st.cap')); await flyHome(m.cap); if (stopped) return; }
      const r = E.apply(s0, m, th);
      st = r.state; busy = false; placeAll();
      if (r.cont && !st.over) { if (m && m.home) SND.home(); later(() => afterThrow(st.turn, th), 160); return; }   // (two dice: the rest of the throw)
      if (m && m.home) { SND.home(); toast(tx('st.home')); }
      else if (r.again && !st.over) { SND.again(); toast(rule === 'pachisi' && th.grace ? tx('st.grace') : tx('st.again')); }
      if (st.over) return end();
      later(next, r.again ? 380 : 260);
      void seat;
    }
    function end() {
      over = true; phase = 'over'; clearMarks(); focus(null); if (ctx.onTurn) ctx.onTurn(-1);
      const winSeats = st.seats.filter(x => st.team[x] === st.winner), names = [...new Set(winSeats.map(colName))].join('・');
      const wt = tx('res.lose', { p: names });
      SND.home();
      // the places (as the full game's result): the winning side first, then by pieces home, then by steps walked
      const RK = { ja: n => n + '位', en: n => n + (['th', 'st', 'nd', 'rd'][n % 10 < 4 && (n % 100 < 11 || n % 100 > 13) ? n % 10 : 0]), zh: n => '第' + n + '名', 'zh-TW': n => '第' + n + '名', ko: n => n + '위', es: n => n + '.º', fr: n => n + (n === 1 ? 'er' : 'e'), pt: n => n + 'º', de: n => n + '.', ru: n => n + '-е', tr: n => n + '.', id: n => '#' + n, hi: n => n + '.', ar: n => '#' + n };
      const rk = RK[ctx.lang] || RK.en, L0 = E.lastOf(st);
      const places = [...new Set(st.seats.map(x => st.team[x]))].map(tm => { const ss = st.seats.filter(x => st.team[x] === tm), pcs = ss.flatMap(x => st.pos[x]);
        return { tm, ss, home: pcs.filter(p => p >= L0).length / pcs.length, steps: pcs.reduce((a, p) => a + Math.max(0, Math.min(p, L0) + 1), 0) }; })
        .sort((a, b) => (b.tm === st.winner) - (a.tm === st.winner) || b.home - a.home || b.steps - a.steps);
      const line = places.map((r, i) => `${rk(i + 1)} ${[...new Set(r.ss.map(colName))].join('・')}${!pvp && r.tm === myTeam() ? '（' + tx('p.you') + '）' : ''}`).join(' · ');
      if (pvp) { say(wt); return later(() => ctx.onEnd({ win: false, draw: false, level, score: line, pvp: true, winnerText: wt }), 900); }
      const won = st.winner === myTeam(), myPlace = places.findIndex(r => r.tm === myTeam()) + 1;
      say(won ? L.win : wt + ' · ' + rk(myPlace));
      later(() => ctx.onEnd({ win: won, draw: false, level, score: line }), 900);
    }

    /* ---------- taps ---------- */
    function gridAt(e) { const p = T3.pick(e, Y); return p ? [p.x / u + n / 2, p.z / u + n / 2] : null; }
    function onClick(e) {
      if (stopped || T3.wasDrag() || busy || over || !st) return;
      if (phase === 'roll' && human(st.turn)) { doRoll(); return; }
      if (phase !== 'move' || !human(st.turn)) return;
      const q = gridAt(e); if (!q) return;
      const seat = st.turn, real = moves.filter(m => !m.pass), L0 = E.lastOf(st), d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (selK >= 0) {   // a destination of the chosen piece (pachisi grace: the full throw or one step)
        const c = real.filter(m => m.k === selK).map(m => ({ m, d: d(q, m.to >= L0 ? geo.home(seat, m.k) : geo.cellXY(seat, m.to)) })).sort((a, b) => a.d - b.d)[0];
        if (c && c.d < .75) { commit(c.m); return; }
      }
      let best = null;
      for (const m of real) {
        const ks = m.enter ? [0, 1, 2, 3].filter(k => st.pos[seat][k] < 0) : [m.k];
        for (const k of ks) { const g = pcs[seat + ',' + k], dd = d(q, [g.userData.gx, g.userData.gy]); if (!best || dd < best.d) best = { k: m.k, d: dd }; }
      }
      if (!best || best.d > .8) { if (selK >= 0) { selK = -1; showMarks(); } return; }
      const ms = real.filter(m => m.k === best.k);
      if (ms.length === 1) { commit(ms[0]); return; }
      selK = best.k; showMarks();
    }
    function onHud(e) {
      const b = e.target.closest && e.target.closest('[data-ldt]'); if (!b || stopped) return;
      e.stopPropagation();
      if (b.dataset.ldt === 'roll') doRoll(); else if (b.dataset.ldt === 'pass') { const m = moves.find(x => x.pass); if (m && phase === 'move') commit(m); }
    }
    const onKey = e => { if (e.key !== ' ' || e.repeat || stopped) return; if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return; if (phase === 'roll' && st && human(st.turn)) { e.preventDefault(); doRoll(); } };
    ctx.el.addEventListener('click', onClick);
    document.addEventListener('click', onHud, true);
    document.addEventListener('keydown', onKey);

    /* ---------- go ---------- */
    const LH = window.LudoHouse;   // the house rules (ludo/house.js — the same settings as the 2D game; pachisi keeps its traditional rules)
    st = E.newGame(rule === 'ludo' && LH ? { rule, players, first: 0, house: LH.get() } : { rule, players, first: 0, blocks: false, threeSixes: true });
    build(); restDie(0, 6);
    loadTexts().then(I => {
      if (stopped) return;
      S = Object.assign({}, I.en || {}, I[ctx.lang] || {});
      later(next, 600);
    });

    const myTurn = () => !stopped && !over && !busy && st && human(st.turn) && (phase === 'roll' || phase === 'move');
    function finish(why) {
      if (over || !st) return;
      tok++; over = true; phase = 'over'; busy = false; clearMarks(); focus(null); if (ctx.onTurn) ctx.onTurn(-1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      say(L.lose); setTimeout(() => { if (!stopped) ctx.onEnd(pvp ? { win: false, draw: false, level, score: r, pvp: true, winnerText: r } : { win: false, draw: false, level, score: r }); }, 200);
    }
    const api = {
      human: 0,
      canUndo: () => !pvp && myTurn() && hist.length > (phase === 'roll' ? 1 : 0),
      undo() {
        if (!api.canUndo()) return;
        if (phase === 'roll') hist.pop();   // the turn just begun: go back to the one before
        tok++; st = E.clone(hist.pop()); thr = null; moves = []; busy = false; placeAll(); restDie(st.turn, 6); next();
      },
      canHint: () => myTurn() && phase === 'move',
      hint() {
        if (!api.canHint()) return Promise.resolve(false);
        const r = E.think(st, thr, 20, () => .5);
        if (!r.move || r.move.pass) { toast(tx('hint.pass')); return Promise.resolve(true); }
        hintMv = r.move; selK = -1; showMarks(); return Promise.resolve(true);
      },
      canResign: () => !stopped && !over && !!st,
      resign() { finish('resign'); },
      timeout() { finish('time'); },
      stop() {
        stopped = true; tok++; timers.forEach(clearTimeout); clearInterval(pulse);
        ctx.el.removeEventListener('click', onClick); document.removeEventListener('click', onHud, true); document.removeEventListener('keydown', onKey);
        css.remove(); if (toastEl) toastEl.remove(); if (zoomBtn) zoomBtn.remove(); removeEventListener('resize', onResize);
        Object.values(MAT).forEach(m => m.dispose()); if (cupG) cupG.userData.mats.forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
      },
      _debug: { st: () => st, phase: () => phase, moves: () => moves, thr: () => thr, roll: () => doRoll(), commit: m => commit(m), at: (gx, gy) => { const [x, z] = wx(gx, gy); return T3.project(x, z, Y); }, piece: key => { const g = pcs[key]; return g && T3.project(g.position.x, g.position.z, Y); }, geo },
    };
    window.__ludoTable = api;
    return api;
  }

  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.ludo = { levels: 20, sides: false, modes: ['ai', 'pvp'], table: true, tableModes: ['ai', 'pvp'], sizes: SIZES, size0: 4, sizeLabel, sizeName, levelInfo, start, SND,
    house: window.LudoHouse && {   // the house rules (ludo/house.js — shared with the 2D game); ludo only, not pachisi
      show: z => !(z > 10), label: lang => (LudoHouse.T[lang] || LudoHouse.T.en).ui[0],
      summary: lang => { const H = LudoHouse.T[lang] || LudoHouse.T.en, n = LudoHouse.changed(); return n ? H.ui[9].replace('{n}', n) : ''; },
      open: (lang, cb, theme) => LudoHouse.open({ lang, onClose: cb, theme }) } };
})();
