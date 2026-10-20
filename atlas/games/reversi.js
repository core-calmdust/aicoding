/* =====================================================================
   Reversi on the 3D table (portal play).  Uses ../reversi/engine.js
   (same AI, weights and opening book as the full game).
   Adapter contract — every game in atlas/games/<id>.js registers:
     Atlas3D[id] = { levels: n, sides: true|false, start(ctx) → { stop() } }
   ctx = { el, Table3D, lang, t(key), hud(html), level, side, onEnd({win, draw, level}) }
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../reversi/';
  let weights = null, book = null;
  const ready = (async () => {
    try {
      let buf = await fetch(BASE + 'weights.bin.gz').then(r => r.arrayBuffer());
      const u8 = new Uint8Array(buf, 0, 2);
      if (u8[0] === 0x1f && u8[1] === 0x8b && 'DecompressionStream' in window) buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      const meta = await fetch(BASE + 'weights.json').then(r => r.json()).catch(() => ({ nphase: 12 }));
      weights = { buffer: buf, nphase: meta.nphase };
    } catch (e) { weights = null; }
    book = await fetch(BASE + 'book.json').then(r => r.ok ? r.json() : null).catch(() => null);
  })();

  const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  function flipsOf(cells, sq, color) {
    if (cells[sq]) return [];
    const opp = 3 - color, r0 = sq >> 3, c0 = sq & 7, out = [];
    for (const [dr, dc] of DIRS) {
      let r = r0 + dr, c = c0 + dc; const line = [];
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && cells[r * 8 + c] === opp) { line.push(r * 8 + c); r += dr; c += dc; }
      if (line.length && r >= 0 && r < 8 && c >= 0 && c < 8 && cells[r * 8 + c] === color) out.push(...line);
    }
    return out;
  }
  const legal = (cells, color) => { const m = []; for (let s = 0; s < 64; s++) if (!cells[s] && flipsOf(cells, s, color).length) m.push(s); return m; };
  const count = (cells, c) => cells.filter(x => x === c).length;

  function start(ctx) {
    const T3 = ctx.Table3D, THREE = window.THREE, t = ctx.t;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), pass: t('p.pass'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const board = T3.MODELS.reversi(true); T3.show('reversi', board);
    const S = board.userData.S, Y = board.userData.top;
    const W = T3.M({ color: 0xf3f0e6, roughness: .32, clearcoat: .6, clearcoatRoughness: .25 }), B = T3.M({ color: 0x111215, roughness: .3, clearcoat: .7, clearcoatRoughness: .2 });
    const hintM = new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: .55 });
    const lastM = new THREE.MeshBasicMaterial({ color: 0xff5d5d });
    const pos = sq => [T3.cellPos(8, S, sq & 7), T3.cellPos(8, S, sq >> 3)];
    const discs = {}, hints = new THREE.Group(); board.add(hints);
    const lastDot = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .02, 16), lastM); lastDot.visible = false; board.add(lastDot);
    const human = ctx.side === 2 ? 2 : 1, ai = 3 - human;
    let cells = Array(64).fill(0); cells[27] = cells[36] = 2; cells[28] = cells[35] = 1;
    let turn = 1, over = false, stopped = false, busy = false, worker = null;

    function makeDisc(sq, color) {
      const g = new THREE.Group();
      const top = T3.bevelDisc(.42, .1, W), bot = T3.bevelDisc(.42, .1, B);
      bot.position.y = 0; top.position.y = .1; g.add(bot, top);   // white side up by default
      const inner = new THREE.Group(); inner.add(g); g.position.y = -.1;
      const outer = new THREE.Group(); outer.add(inner); const ao = T3.contact(.42); ao.position.y = -.098; outer.add(ao);
      const [x, z] = pos(sq); outer.position.set(x, Y + .1, z);
      inner.rotation.x = color === 1 ? Math.PI : 0;
      board.add(outer); discs[sq] = { outer, inner, color };
      return discs[sq];
    }
    function anim(dur, f, done) { const t0 = performance.now(); (function s(n) { const k = Math.min(1, (n - t0) / dur); f(k); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); }
    function drop(sq, color) { const d = makeDisc(sq, color); anim(260, k => { d.outer.position.y = Y + .1 + (1 - k) * (1 - k) * 2.2; }); }
    function flip(sq, color, delay) {
      const d = discs[sq]; d.color = color;
      const from = d.inner.rotation.x, to = color === 1 ? Math.PI : 0;
      setTimeout(() => anim(380, k => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; d.inner.rotation.x = from + (to - from) * e; d.outer.position.y = Y + .1 + Math.sin(k * Math.PI) * .7; }), delay);
    }
    for (let s = 0; s < 64; s++) if (cells[s]) makeDisc(s, cells[s]);

    function showHints() {
      while (hints.children.length) hints.remove(hints.children[0]);
      if (over || turn !== human) return;
      legal(cells, human).forEach(s => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .02, 20), hintM); const [x, z] = pos(s); m.position.set(x, Y + .02, z); hints.add(m); });
    }
    function hud(msg) {
      const b = count(cells, 1), w = count(cells, 2);
      const side = c => `<span class="hs ${turn === c && !over ? 'on' : ''}"><i class="dk ${c === 1 ? 'b' : 'w'}"></i>${c === human ? L.you : L.ai}<b>${c === 1 ? b : w}</b></span>`;
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${side(2)}`);
    }
    function apply(sq, color) {
      const fl = flipsOf(cells, sq, color);
      cells[sq] = color; fl.forEach(s => { cells[s] = color; });
      drop(sq, color);
      const [x, z] = pos(sq);
      fl.sort((a, b) => Math.hypot((a & 7) - (sq & 7), (a >> 3) - (sq >> 3)) - Math.hypot((b & 7) - (sq & 7), (b >> 3) - (sq >> 3))).forEach((s, i) => flip(s, color, 200 + i * 70));
      lastDot.position.set(x, Y + .32, z); lastDot.visible = false;
      setTimeout(() => { lastDot.visible = true; }, 300);
      return 300 + fl.length * 70 + 380;
    }
    function next() {
      if (stopped) return;
      const me = legal(cells, turn), opp = legal(cells, 3 - turn);
      if (!me.length && !opp.length) return end();
      if (!me.length) { hud(L.pass); turn = 3 - turn; return setTimeout(next, 900); }
      showHints();
      if (turn === human) { hud(L.turn); return; }
      hud(L.think); aiMove();
    }
    async function aiMove() {
      busy = true;
      await ready;
      if (stopped) return;
      if (!worker) {
        worker = new Worker(BASE + 'engine.js');
        if (weights) worker.postMessage({ type: 'weights', buffer: weights.buffer.slice(0), nphase: weights.nphase });
        if (book) worker.postMessage({ type: 'book', book });
      }
      const t0 = Date.now();
      worker.onmessage = e => {
        const m = e.data; if (m.type !== 'result' || stopped) return;
        setTimeout(() => {
          if (stopped) return;
          const wait = m.move >= 0 ? apply(m.move, ai) : 0;
          turn = human; busy = false; setTimeout(next, wait);
        }, Math.max(0, 450 - (Date.now() - t0)));
      };
      worker.postMessage({ type: 'think', id: 1, cells: cells.slice(), toMove: ai, opts: { level: ctx.level } });
    }
    function end() {
      over = true; showHints();
      const me = count(cells, human), op = count(cells, ai);
      hud(me > op ? L.win : me < op ? L.lose : L.draw);
      ctx.onEnd({ win: me > op, draw: me === op, level: ctx.level, score: me + ' - ' + op });
    }
    function onClick(e) {
      if (over || busy || turn !== human || T3.wasDrag()) return;
      const p = T3.pick(e, Y); if (!p) return;
      const c = Math.floor((p.x + S / 2) / (S / 8)), r = Math.floor((p.z + S / 2) / (S / 8));
      if (c < 0 || c > 7 || r < 0 || r > 7) return;
      const sq = r * 8 + c;
      if (!flipsOf(cells, sq, human).length) return;
      busy = true; const wait = apply(sq, human); turn = ai;
      while (hints.children.length) hints.remove(hints.children[0]);
      setTimeout(() => { busy = false; next(); }, wait);
    }
    ctx.el.addEventListener('click', onClick);
    setTimeout(next, 600); hud('');
    return { stop() { stopped = true; ctx.el.removeEventListener('click', onClick); if (worker) worker.terminate(); } };
  }

  window.Atlas3D = window.Atlas3D || {};
  // how strong each level is: the full game's level names / search depth, its fixed rating, and a plain-words hint
  const LVN = {"ja": [["入門", "初級", "初級+", "中級", "中級+", "上級", "上級+", "達人", "名人", "最強"], ["ほぼ気まぐれ", "1手読み", "3手読み", "4手読み", "6手読み", "8手読み・終盤14マス完全読み", "最大10手読み・終盤16マス", "約1.5秒・終盤18マス", "約3秒・終盤19マス", "約5秒・終盤20マス"]], "en": [["Beginner", "Novice", "Novice+", "Intermediate", "Intermediate+", "Advanced", "Advanced+", "Expert", "Master", "Strongest"], ["mostly random", "1-ply search", "3-ply search", "4-ply search", "6-ply search", "8-ply, solves last 14", "up to 10-ply, solves last 16", "~1.5 s, solves last 18", "~3 s, solves last 19", "~5 s, solves last 20"]], "zh": [["入门", "初级", "初级+", "中级", "中级+", "高级", "高级+", "达人", "名人", "最强"], ["几乎随机", "搜索1步", "搜索3步", "搜索4步", "搜索6步", "搜索8步・残局14格完全解", "最多搜索10步・残局16格", "约1.5秒・残局18格", "约3秒・残局19格", "约5秒・残局20格"]], "ko": [["입문", "초급", "초급+", "중급", "중급+", "상급", "상급+", "달인", "명인", "최강"], ["거의 무작위", "1수 읽기", "3수 읽기", "4수 읽기", "6수 읽기", "8수 읽기・종반 14칸 완전 해석", "최대 10수 읽기・종반 16칸", "약 1.5초・종반 18칸", "약 3초・종반 19칸", "약 5초・종반 20칸"]], "es": [["Principiante", "Novato", "Novato+", "Intermedio", "Intermedio+", "Avanzado", "Avanzado+", "Experto", "Maestro", "Máximo"], ["casi al azar", "búsqueda a 1 jugada", "búsqueda a 3 jugadas", "búsqueda a 4 jugadas", "búsqueda a 6 jugadas", "8 jugadas, resuelve las últimas 14", "hasta 10 jugadas, resuelve las últimas 16", "~1,5 s, resuelve las últimas 18", "~3 s, resuelve las últimas 19", "~5 s, resuelve las últimas 20"]], "fr": [["Débutant", "Novice", "Novice+", "Intermédiaire", "Intermédiaire+", "Avancé", "Avancé+", "Expert", "Maître", "Maximum"], ["presque au hasard", "recherche à 1 coup", "recherche à 3 coups", "recherche à 4 coups", "recherche à 6 coups", "8 coups, résout les 14 dernières", "jusqu'à 10 coups, résout les 16 dernières", "~1,5 s, résout les 18 dernières", "~3 s, résout les 19 dernières", "~5 s, résout les 20 dernières"]], "pt": [["Iniciante", "Novato", "Novato+", "Intermediário", "Intermediário+", "Avançado", "Avançado+", "Especialista", "Mestre", "Máximo"], ["quase aleatório", "busca de 1 lance", "busca de 3 lances", "busca de 4 lances", "busca de 6 lances", "8 lances, resolve as últimas 14", "até 10 lances, resolve as últimas 16", "~1,5 s, resolve as últimas 18", "~3 s, resolve as últimas 19", "~5 s, resolve as últimas 20"]], "de": [["Einsteiger", "Anfänger", "Anfänger+", "Mittel", "Mittel+", "Fortgeschritten", "Fortgeschritten+", "Experte", "Meister", "Stärkste"], ["fast zufällig", "1 Zug tief", "3 Züge tief", "4 Züge tief", "6 Züge tief", "8 Züge, löst die letzten 14", "bis 10 Züge, löst die letzten 16", "~1,5 s, löst die letzten 18", "~3 s, löst die letzten 19", "~5 s, löst die letzten 20"]], "hi": [["शुरुआती", "नौसिखिया", "नौसिखिया+", "मध्यम", "मध्यम+", "उन्नत", "उन्नत+", "विशेषज्ञ", "मास्टर", "सबसे मज़बूत"], ["लगभग बेतरतीब", "1 चाल खोज", "3 चाल खोज", "4 चाल खोज", "6 चाल खोज", "8 चाल, आखिरी 14 हल करता है", "10 चाल तक, आखिरी 16 हल करता है", "~1.5 से., आखिरी 18 हल करता है", "~3 से., आखिरी 19 हल करता है", "~5 से., आखिरी 20 हल करता है"]], "ar": [["مبتدئ", "مستجد", "مستجد+", "متوسط", "متوسط+", "متقدم", "متقدم+", "خبير", "أستاذ", "الأقوى"], ["عشوائي تقريبًا", "بحث بعمق 1", "بحث بعمق 3", "بحث بعمق 4", "بحث بعمق 6", "عمق 8، يحل آخر 14", "حتى عمق 10، يحل آخر 16", "~1.5 ث، يحل آخر 18", "~3 ث، يحل آخر 19", "~5 ث، يحل آخر 20"]]};
  const RATING = [0, 400, 650, 850, 1000, 1150, 1300, 1450, 1600, 1700, 1800];   // same ladder as reversi rated games
  const WHO = {
    ja: ['はじめての人に', 'ルールを覚えた人に', 'ルールを覚えた人に', '慣れてきた人に', '慣れてきた人に', '強い人に', '強い人に', '上級者でも手ごわい', '上級者でも手ごわい', '最強レベル'],
    en: ['for first-timers', 'once you know the rules', 'once you know the rules', 'getting the hang of it', 'getting the hang of it', 'for strong players', 'for strong players', 'tough even for experts', 'tough even for experts', 'the very strongest'],
    zh: ["适合初次玩", "适合刚学会规则", "适合刚学会规则", "适合渐渐上手", "适合渐渐上手", "适合高手", "适合高手", "高手也觉得难缠", "高手也觉得难缠", "最强等级"],
    ko: ["처음 하는 사람에게", "규칙을 익힌 사람에게", "규칙을 익힌 사람에게", "익숙해진 사람에게", "익숙해진 사람에게", "강한 사람에게", "강한 사람에게", "고수도 버거운", "고수도 버거운", "최강 레벨"],
    es: ["para principiantes", "si ya sabes las reglas", "si ya sabes las reglas", "si ya le vas pillando el truco", "si ya le vas pillando el truco", "para jugadores fuertes", "para jugadores fuertes", "difícil incluso para expertos", "difícil incluso para expertos", "el más fuerte"],
    fr: ["pour débuter", "si tu connais les règles", "si tu connais les règles", "si tu prends le coup de main", "si tu prends le coup de main", "pour les bons joueurs", "pour les bons joueurs", "coriace même pour les experts", "coriace même pour les experts", "le plus fort"],
    pt: ["para iniciantes", "para quem já sabe as regras", "para quem já sabe as regras", "para quem está pegando o jeito", "para quem está pegando o jeito", "para jogadores fortes", "para jogadores fortes", "difícil até para experts", "difícil até para experts", "o mais forte"],
    de: ["für Einsteiger", "wenn du die Regeln kennst", "wenn du die Regeln kennst", "wenn du den Dreh raus hast", "wenn du den Dreh raus hast", "für starke Spieler", "für starke Spieler", "selbst für Profis knifflig", "selbst für Profis knifflig", "die stärkste Stufe"],
    hi: ["पहली बार खेलने वालों के लिए", "नियम सीख चुके लोगों के लिए", "नियम सीख चुके लोगों के लिए", "जिन्हें आदत हो रही है उनके लिए", "जिन्हें आदत हो रही है उनके लिए", "मज़बूत खिलाड़ियों के लिए", "मज़बूत खिलाड़ियों के लिए", "विशेषज्ञों के लिए भी कठिन", "विशेषज्ञों के लिए भी कठिन", "सबसे मज़बूत स्तर"],
    ar: ["لمن يلعب أول مرة", "لمن تعلّم القواعد", "لمن تعلّم القواعد", "لمن بدأ يعتاد اللعب", "لمن بدأ يعتاد اللعب", "للاعبين الأقوياء", "للاعبين الأقوياء", "صعب حتى على الخبراء", "صعب حتى على الخبراء", "أقوى مستوى"],
  };
  function levelInfo(n, lang) {
    const L = LVN[lang] || LVN.en, W = WHO[lang] || WHO.en;
    return { name: L[0][n - 1], desc: L[1][n - 1], rating: RATING[n], who: W[n - 1] };
  }
  window.Atlas3D.reversi = { levels: 10, sides: true, modes: ['ai', 'rated', 'pvp'], start, levelInfo };
})();
