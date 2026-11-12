/* =====================================================================
   Shogi on the 3D table (portal play, "ちゃぶ台で遊ぶ").
   Uses the full game's engine (../shogi/engine.js: rules, NNUE / WebAssembly search,
   same LEVELS table, same opening book and weights) — the AI is exactly as strong
   per level as in shogi/. Board & pieces: atlas/models/shogi.js.
   Registers window.AtlasShogiPlay.start(ctx) → { stop() }; atlas/games/shogi.js wires it in.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../shogi/', EV = '?v=20261109s4';   // the full game's engine version (shogi/index.html)
  // the full game's AI steps (shogi/index.html LEVELS), index = level - 1
  const LEVELS = [{ depth: 2, noise: 95, greedy: 1 },
    { depth: 2, noise: 60, greedy: 1 }, { depth: 3, noise: 80 }, { depth: 3, noise: 55 }, { depth: 3, noise: 35 },
    { nodes: 8000, linear: 1 }, { nodes: 15000, linear: 1 }, { nodes: 27000, linear: 1 }, { nodes: 48000, linear: 1 },
    { nodes: 260 }, { nodes: 520 }, { nodes: 1000 }, { nodes: 2000 }, { nodes: 3100 }, { nodes: 5000 }, { nodes: 7700 }, { nodes: 10000 },
    { nodes: 18000, time: 12000 }, { nodes: 29000, time: 15000 }, { nodes: 50000, time: 15000 }, { nodes: 100000, time: 15000 }, { nodes: 250000, time: 20000 }, { nodes: 1500000, time: 20000 },
    { time: 4000, mt: 1 }, { time: 9000, mt: 1 }, { time: 20000, mt: 1 }];   // 七段〜九段 (time only; on the table: one worker thread)
  const START = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
  /* ---------- 種目 (2026-11-12): the full game's variants (shogi/variants/) on the table — their rules (mini.js · hasami.js · vshogi.js) here,
     their AI in variants/worker.js; ランダム将棋 is standard shogi from a shuffled start (this page's own engine) ---------- */
  const VFILES = ['variants/mini.js?v=20261021vb', 'variants/hasami.js?v=20261021vb', 'variants/vshogi.js?v=20261030sv'], VWORK = 'variants/worker.js?v=20261030sv';
  const VDIM = { mini: [5, 5], judkins: [6, 6], goro: [5, 6], micro: [4, 5], heian8: [8, 8], heian98: [9, 8] };
  // the variants' AI steps (shogi/variants/variants.js LV / LV_TIME: 19 steps of depth and looseness)
  const VLV = {
    mini: { d: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9, 10, 12], n: [450, 280, 300, 190, 120, 150, 90, 55, 70, 35, 22, 10, 0, 0, 0, 0, 0, 0, 0] },
    hasami: { d: [1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7], n: [320, 220, 130, 200, 130, 90, 55, 60, 35, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0] },
    big: { d: [1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 8, 9, 10], n: [450, 280, 300, 190, 120, 150, 90, 55, 70, 35, 22, 10, 0, 0, 0, 0, 0, 0, 0] } };
  const VLT = [500, 500, 500, 600, 600, 700, 700, 800, 900, 1000, 1100, 1200, 1400, 1600, 1900, 2300, 2800, 3500, 4500];
  const VBIG = { heian8: 1, heian98: 1, heian9: 1, nigyoku: 1 };
  const vLevel = (i, v) => { const L = VLV[v] || (VBIG[v] ? VLV.big : VLV.mini); i = Math.max(0, Math.min(18, i | 0)); return { depth: L.d[i], noise: L.n[i], time: VLT[i] }; };
  // ランダム将棋: the 18 squares behind the pawns hold K R B G G S S N N L L and 7 blanks, shuffled (gote point-symmetric) — variants.js randomStart
  function randomStart() {
    const a = 'KRBGGSSNNLL'.split('').concat(Array(7).fill(''));
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; }
    const row = cells => { let o = '', e = 0; for (const c of cells) { if (!c) { e++; continue; } if (e) { o += e; e = 0; } o += c; } return o + (e || ''); };
    const r8 = a.slice(0, 9), r9 = a.slice(9), g1 = r9.slice().reverse().map(c => c.toLowerCase()), g2 = r8.slice().reverse().map(c => c.toLowerCase());
    return `${row(g1)}/${row(g2)}/ppppppppp/9/9/9/PPPPPPPPP/${row(r8)}/${row(r9)} b - 1`;
  }
  let vloading = null;
  const loadVariants = () => vloading || (vloading = VFILES.reduce((pr, f) => pr.then(() => new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = BASE + f; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); })), Promise.resolve()));
  const SC = .8;                                  // the legged board is life-size: a little smaller on the chabudai
  const HANDS = [6, 5, 7, 4, 3, 2, 1];            // 飛 角 金 銀 桂 香 歩 (stand order)
  const BASET = [0, 1, 2, 3, 4, 5, 6, 7, 8, 1, 2, 3, 4, 5, 6];   // promoted → original

  const STR = {
    ja: { hOpp: '相手の持ち駒', hMe: '持ち駒', mate: 'まで{n}手で詰み', resign: 'まで{n}手で投了', sen: '千日手', perp: '連続王手の千日手', decl: '入玉宣言', max: '512手で引き分け', yes: '成る', no: '成らない', check: '王手！', ply: '{n}手目', book: '定跡' },
    en: { hOpp: 'Their hand', hMe: 'Your hand', mate: 'Checkmate in {n} moves', resign: 'Resigned at move {n}', sen: 'Repetition (sennichite)', perp: 'Perpetual check', decl: 'Entering-king declaration', max: 'Draw at move 512', yes: 'Promote', no: 'Keep', check: 'Check!', ply: 'Move {n}', book: 'Book' },
    zh: { hOpp: '对方持驹', hMe: '我的持驹', mate: '第{n}手将死', resign: '第{n}手认输', sen: '千日手', perp: '连续将军的千日手', decl: '入玉宣言', max: '512手和棋', yes: '升变', no: '不升变', check: '将军！', ply: '第{n}手', book: '定式' },
    ko: { hOpp: '상대 손 패', hMe: '내 손 패', mate: '{n}수 만에 외통', resign: '{n}수 만에 기권', sen: '천일수', perp: '연속 장군 천일수', decl: '입옥 선언', max: '512수 무승부', yes: '승격', no: '승격 안 함', check: '장군!', ply: '{n}수째', book: '정석' },
    es: { hOpp: 'Mano rival', hMe: 'Tu mano', mate: 'Jaque mate en {n} jugadas', resign: 'Abandono en la jugada {n}', sen: 'Repetición (sennichite)', perp: 'Jaque perpetuo', decl: 'Declaración de rey entrado', max: 'Tablas en la jugada 512', yes: 'Promocionar', no: 'No', check: '¡Jaque!', ply: 'Jugada {n}', book: 'Libro' },
    fr: { hOpp: 'Main adverse', hMe: 'Ta main', mate: 'Mat en {n} coups', resign: 'Abandon au coup {n}', sen: 'Répétition (sennichite)', perp: 'Échec perpétuel', decl: 'Déclaration du roi entré', max: 'Nulle au coup 512', yes: 'Promouvoir', no: 'Garder', check: 'Échec !', ply: 'Coup {n}', book: 'Théorie' },
    pt: { hOpp: 'Mão rival', hMe: 'Sua mão', mate: 'Xeque-mate em {n} lances', resign: 'Desistência no lance {n}', sen: 'Repetição (sennichite)', perp: 'Xeque perpétuo', decl: 'Declaração de rei infiltrado', max: 'Empate no lance 512', yes: 'Promover', no: 'Manter', check: 'Xeque!', ply: 'Lance {n}', book: 'Livro' },
    de: { hOpp: 'Gegner-Hand', hMe: 'Deine Hand', mate: 'Matt nach {n} Zügen', resign: 'Aufgabe nach Zug {n}', sen: 'Wiederholung (Sennichite)', perp: 'Dauerschach', decl: 'Eingedrungener König', max: 'Remis nach Zug 512', yes: 'Befördern', no: 'Nicht', check: 'Schach!', ply: 'Zug {n}', book: 'Buch' },
    hi: { hOpp: 'विरोधी के हाथ', hMe: 'आपके हाथ', mate: '{n} चालों में मात', resign: 'चाल {n} पर हार मानी', sen: 'दोहराव (सेन्निचिते)', perp: 'लगातार शह', decl: 'राजा प्रवेश घोषणा', max: 'चाल 512 पर ड्रॉ', yes: 'प्रमोट', no: 'नहीं', check: 'शह!', ply: 'चाल {n}', book: 'ओपनिंग' },
    ar: { hOpp: 'يد الخصم', hMe: 'يدك', mate: 'كش مات في {n} نقلة', resign: 'استسلام عند النقلة {n}', sen: 'تكرار (سينّيتشيتي)', perp: 'كش دائم', decl: 'إعلان دخول الملك', max: 'تعادل عند النقلة 512', yes: 'رقِّ', no: 'أبقِ', check: 'كش!', ply: 'النقلة {n}', book: 'افتتاح' },
    ru: { hOpp: 'В руке соперника', hMe: 'У тебя в руке', mate: 'Мат на {n}-м ходу', resign: 'Сдача на {n}-м ходу', sen: 'Повторение (сэннитэ)', perp: 'Вечный шах', decl: 'Объявление вошедшего короля', max: 'Ничья на 512-м ходу', yes: 'Превратить', no: 'Оставить', check: 'Шах!', ply: 'Ход {n}', book: 'Дебют' },
    'zh-TW': { hOpp: '對方持駒', hMe: '我的持駒', mate: '第{n}手將死', resign: '第{n}手認輸', sen: '千日手', perp: '連續將軍千日手', decl: '入玉宣言', max: '第512手和局', yes: '升變', no: '不升變', check: '將軍！', ply: '第{n}手', book: '定跡' },
    id: { hOpp: 'Tangan lawan', hMe: 'Tanganmu', mate: 'Skakmat di langkah {n}', resign: 'Menyerah di langkah {n}', sen: 'Pengulangan (sennichite)', perp: 'Skak abadi', decl: 'Deklarasi raja masuk', max: 'Seri di langkah 512', yes: 'Promosi', no: 'Tetap', check: 'Skak!', ply: 'Langkah {n}', book: 'Buku' },
    tr: { hOpp: 'Rakibin elinde', hMe: 'Elindeki', mate: '{n}. hamlede mat', resign: '{n}. hamlede terk', sen: 'Tekrar (sennichite)', perp: 'Sürekli şah', decl: 'Giren kral beyanı', max: '512. hamlede berabere', yes: 'Terfi et', no: 'Kalsın', check: 'Şah!', ply: '{n}. hamle', book: 'Kitap' },
  };

  // two players on one device (ctx.mode 'pvp'): the sides' names, whose turn, who won
  const PV = {
    ja: { n: ['先手', '後手'], turn: '{p}の番', win: '{p}の勝ち' }, en: { n: ['Sente', 'Gote'], turn: '{p} to move', win: '{p} wins' },
    zh: { n: ['先手', '后手'], turn: '轮到{p}', win: '{p}胜' }, ko: { n: ['선수', '후수'], turn: '{p} 차례', win: '{p} 승리' },
    es: { n: ['Sente', 'Gote'], turn: 'Turno de {p}', win: 'Gana {p}' }, fr: { n: ['Sente', 'Gote'], turn: 'Au tour de {p}', win: 'Victoire de {p}' },
    pt: { n: ['Sente', 'Gote'], turn: 'Vez de {p}', win: 'Vitória de {p}' }, de: { n: ['Sente', 'Gote'], turn: '{p} am Zug', win: '{p} gewinnt' },
    hi: { n: ['सेंते', 'गोते'], turn: '{p} की बारी', win: '{p} की जीत' }, ar: { n: ['سينتي', 'غوتي'], turn: 'دور {p}', win: 'فوز {p}' }, ru: { n: ['Сэнтэ', 'Готэ'], turn: 'Ход: {p}', win: 'Победа: {p}' }, 'zh-TW': { n: ['先手', '後手'], turn: '輪到{p}', win: '{p}獲勝' }, id: { n: ['Sente', 'Gote'], turn: 'Giliran {p}', win: '{p} menang' }, tr: { n: ['Sente', 'Gote'], turn: 'Sıra: {p}', win: '{p} kazandı' },
  };

  /* ---------- the full game's engine, weights and book (loaded once, on the first game) ---------- */
  let loading = null;
  function load() {
    if (loading) return loading;
    const eng = window.ShogiEngine ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = BASE + 'engine.js' + EV; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    const wts = fetch(BASE + 'weights.bin.gz?v=20261018ol').then(r => r.ok ? r.arrayBuffer() : null).then(async buf => {
      if (!buf) return null; const u8 = new Uint8Array(buf, 0, 2);
      if (u8[0] === 0x1f && u8[1] === 0x8b) buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      return buf;
    }).catch(() => null);
    const book = fetch(BASE + 'book.json?v=20261018ol').then(r => r.ok ? r.json() : null).catch(() => null);
    return (loading = Promise.all([eng, wts, book]).then(([, w, b]) => ({ E: window.ShogiEngine, weights: w, book: b })));
  }

  /* ---------- the recorded piece sound of the full game (falls back to a synthesized knock) ---------- */
  let komaBuf = null, komaLoad = false;
  function audio() { try { const C = window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } }
  function sfxOn() { try { return localStorage.getItem('atlas-sfx') !== '0'; } catch (e) { return true; } }
  function tok(vol = 1) {
    if (!sfxOn()) return; const C = audio(); if (!C || C.state !== 'running') return;
    if (!komaLoad) { komaLoad = true; fetch(BASE + 'sounds/koma.wav?v=1').then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => C.decodeAudioData(b, res, rej))).then(b => { komaBuf = b; }).catch(() => {}); }
    const t = C.currentTime, g = C.createGain(); g.connect(C.destination);
    if (komaBuf) { const s = C.createBufferSource(); s.buffer = komaBuf; g.gain.value = .9 * vol; s.connect(g); s.start(t); return; }
    const o = C.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(330, t); o.frequency.exponentialRampToValueAtTime(150, t + .07);
    g.gain.setValueAtTime(.3 * vol, t); g.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(g); o.start(t); o.stop(t + .12);
  }

  function injectCss() {
    // (詰将棋 hand chips: see handStrip)
    if (document.getElementById('sgPlayCss')) return;
    const s = document.createElement('style'); s.id = 'sgPlayCss';
    s.textContent = `.sgpromo{position:fixed;z-index:1000;display:flex;gap:6px;padding:6px;border-radius:16px;background:rgba(255,253,247,.97);border:2px solid #fff;box-shadow:0 10px 26px -10px rgba(80,40,0,.55);transform:translate(-50%,calc(-100% - 18px));animation:sgpIn .22s cubic-bezier(.3,1.4,.5,1)}
.sgpromo button{font:900 16px/1 var(--round,system-ui,sans-serif);padding:12px 16px;border-radius:12px;border:0;cursor:pointer;white-space:nowrap;box-shadow:0 3px 0 rgba(0,0,0,.18)}
.sgpromo .y{background:#d8321c;color:#fff}.sgpromo .n{background:#ece5d6;color:#3a3226}
@keyframes sgpIn{from{transform:translate(-50%,calc(-100% - 6px)) scale(.8)}}
.hud .sgk{font-style:normal;font-size:18px;line-height:1}
.sghs{position:fixed;z-index:75;top:calc(10px + env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));right:158px;display:flex;flex-direction:column;gap:5px;pointer-events:none}
.sghs .r{display:flex;align-items:center;flex-wrap:wrap;gap:4px;pointer-events:auto}
.sghs .lb{font:800 11px/1 var(--round,system-ui,sans-serif);color:#fff;background:rgba(60,36,16,.72);padding:5px 8px;border-radius:999px;margin-inline-end:2px}
.sghs .op .lb{background:rgba(150,40,30,.78)}
.sghs .c{position:relative;display:inline-grid;place-items:center;min-width:30px;height:30px;padding:0 4px;border-radius:9px;background:#f6e2b8;border:2px solid #b98a4e;box-shadow:0 2px 0 #8a6232;font:900 16px/1 "Hiragino Mincho ProN","Yu Mincho",serif;color:#2a1a0e}
.sghs .op .c{transform:none}
.sghs button.c{cursor:pointer}.sghs button.c.on{background:#bdf0d2;border-color:#2fa864;box-shadow:0 2px 0 #1f7a46}
.sghs .c i{position:absolute;right:-6px;top:-6px;min-width:17px;height:17px;border-radius:9px;background:#2a1a0e;color:#fff;font:800 11px/17px system-ui,sans-serif;font-style:normal;text-align:center;padding:0 3px}
@media (min-width:820px){.sghs{top:calc(16px + env(safe-area-inset-top));gap:14px}.sghs .r{gap:12px}.sghs .lb{font-size:19px;padding:10px 16px;margin-inline-end:6px}
.sghs .c{min-width:78px;height:86px;padding:0 8px;border-radius:18px;border-width:3px;box-shadow:0 5px 0 #8a6232;font-size:48px}
.sghs .c i{right:-11px;top:-11px;min-width:32px;height:32px;border-radius:16px;font-size:18px;line-height:32px}}   /* PC: big enough to read at a glance (2026-11-12; larger again the same day) */
.sgzoom{position:fixed;z-index:75;top:calc(12px + env(safe-area-inset-top));right:106px;display:grid;place-items:center;width:44px;height:44px;padding:0;border-radius:50%;border:2px solid var(--line,#eadfcb);background:#fff;box-shadow:0 3px 0 var(--line,#eadfcb);font:800 13px/1 var(--round,system-ui,sans-serif);color:#3a2e24;cursor:pointer}
.sgzoom.in-rgd{position:absolute;top:auto;right:auto}
.sgzoom svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.sghs .nil{color:rgba(255,255,255,.8);font-weight:800;text-shadow:0 1px 2px rgba(0,0,0,.4)}`;
    document.head.appendChild(s);
  }

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, SG = T3.shogi, t = ctx.t, S = STR[ctx.lang] || STR.en;
    const fmt = (s, n) => s.replace('{n}', n);
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    injectCss();
    const VAR = ctx.pz ? '' : ctx.variant || '', VR = VAR === 'random' ? '' : VAR, VA = window.Atlas3D && Atlas3D.shogi && Atlas3D.shogi.variants;   // VR: a variant with rules of its own
    const [NW, NH] = VDIM[VR] || [9, 9], C0 = 9 - NW;   // its W × H board sits in the top right of the engine's 9 × 9 numbering
    const VNAME = VAR && VA ? VA.name(VAR, ctx.lang) : '', vtxt = k => VA ? VA.text(ctx.lang, k) : '';
    const board = T3.MODELS.shogi(true, NW !== 9 || NH !== 9 ? { w: NW, h: NH } : undefined); board.scale.setScalar(SC); T3.show('shogi', board);
    const Y = board.userData.top, CW = SG.CW, CH = SG.CH, FW = NW * CW, FH = NH * CH;
    const pvp = ctx.mode === 'pvp', PX = PV[ctx.lang] || PV.en;   // pvp: both sides are tapped in turn (sente at the bottom), no AI
    // ctx.pz: a puzzle (詰将棋) driven by atlas/puzzles.js — the position is ctx.pz.sfen, the side to move plays, no AI: after
    // each of the player's moves ctx.pz.moved(usi, info) decides, and the replies come through api.pzPlay (2026-11-10)
    const PZ = ctx.pz || null;
    let SF = PZ ? PZ.sfen : VR ? VA.sfen(VR) + ' b - 1' : VAR === 'random' ? randomStart() : START;
    let zoomOn = true, region = null, zbtn = null, pzSol = PZ ? PZ.sol || [] : [], pan = [0, 0], zEase = false;   // zEase: zoom in / out glides (≈0.4 s) instead of cutting (2026-11-10)   // (詰将棋 zoom: declared before layout() first runs)
    let hc = PZ ? (SF.split(' ')[1] === 'w' ? 1 : 0) : pvp ? 0 : ctx.side === 2 ? 1 : 0, ac = hc ^ 1;         // engine colours: 0 = sente (black), 1 = gote
    const lvIdx = Math.max(0, Math.min(LEVELS.length - 1, (ctx.level || 8) - 1)), LV = LEVELS[lvIdx];
    const vIdx = Math.round(lvIdx * 18 / (LEVELS.length - 1)), VLVL = VR ? vLevel(vIdx, VR) : null;   // (the variants: the level's place on their own 19 steps)
    const newPos = () => VR === 'mini' ? new MiniShogi() : VR === 'hasami' ? new HasamiShogi() : VR ? VShogi.make(VR) : new E.Position();
    const BASEV = VR === 'micro' ? { 1: 1, 3: 1, 4: 4, 2: 4, 7: 7, 6: 7, 5: 5, 9: 5 } : null;   // (マイクロ将棋: a captured piece goes to the hand as its front face)
    let E = null, P = null, moves = [], legal = [], sel = null, over = null, stopped = false, busy = true, worker = null, book = null, jobId = 0, popup = null, last = null;
    let ply = 0, hintW = null, hintJ = 0, hint = null;
    const onTurn = () => { if (ctx.onTurn && P) ctx.onTurn(P.side, { human: pvp || P.side === hc, ply }); };   // HUD pills: sente (left) 0, gote 1
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); T3.kick(dur + 150); (function s(n) { if (stopped) return; const k = Math.min(1, (n - t0) / dur); f(k); T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

    /* ---------- geometry: engine square ↔ screen cell (the player's side at the bottom) ---------- */
    const disp = sq => { const col = sq % 9 - C0, row = (sq / 9) | 0; return hc ? [NW - 1 - col, NH - 1 - row] : [col, row]; };
    const sqAt = (c, r) => hc ? (NH - 1 - r) * 9 + (NW - 1 - c) + C0 : r * 9 + c + C0;
    const cellXZ = sq => { const [c, r] = disp(sq); return [-FW / 2 + CW * (c + .5), -FH / 2 + CH * (r + .5)]; };

    /* ---------- piece stands beside the board on wide screens; on tall ones the pieces in hand lie in a row above / below it ---------- */
    const wood = SG.standMat ? SG.standMat() : T3.M({ map: T3.wood('komadai', '#d9a764', '#a06c30', 256, 256, 1.6), roughness: .55, bumpScale: .002 });   // the board's kaya and tone (2026-11-10)
    const stands = [SG.komadai(wood, Y), SG.komadai(wood, Y)]; stands.forEach(k => board.add(k));   // [0] = the player's, [1] = the AI's
    let tall = false, ST = [], KH = Y;   // KH: the height the pieces in hand rest at (the stand's top; on the table when tall)
    const GRID_W = [[-.92, -1.12], [0, -1.12], [.92, -1.12], [-.92, 0], [0, 0], [.92, 0], [0, 1.12]];   // (pieces in hand made larger, 2026-11-11)          // 3 × 3 on the upright plate
    const GRID_T = [[-3.3, 0], [-2.2, 0], [-1.1, 0], [0, 0], [1.1, 0], [2.2, 0], [3.3, 0]];   // tall screens: one row on the table along the board's edge (no stands, 2026-11-09)
    function layout() {
      const r = ctx.el.getBoundingClientRect();
      tall = r.width < r.height * .95;
      const BWd = FW + 1, BDd = FH + 1;
      const SZ = FH / 2 + (board.userData.mg || 0) - 3.55 / 2;   // (3.55: the stand's top plate, models/shogi.js komadai)
      // phones (tall): no stands — the pieces in hand lie in a row on the table just below (yours) / above (the AI's) the board, so
      // the board itself can be framed much larger (2026-11-09)
      ST = tall ? [{ x: 0, z: BDd / 2 + .72 }, { x: 0, z: -(BDd / 2 + .72) }]
        : [{ x: FW / 2 + 2.15, z: SZ }, { x: -FW / 2 - 2.15, z: -SZ }];   // (the stands' near / far edge in line with the board's, whatever its size, 2026-11-12)
      KH = tall ? .01 : Y;
      stands.forEach((k, i) => { k.position.set(ST[i].x, 0, ST[i].z); k.rotation.y = i ? Math.PI : 0; k.visible = !tall; });   // (the AI's stand turned round: its picture faces the other way, 2026-11-12)
      // wide: the player's stand sits a little nearer the bottom — shift the scene so the HUD stays clear
      board.position.z = tall ? 0 : .25;
      // 詰将棋 (ctx.pz) on phones: the defender's pieces in hand (the row above the board) must be read — more room at the top
      if (PZ && pzFit()) { T3.kick(400); return; }
      if (T3.fit) T3.fit(Object.assign(tall ? { w: (PZ ? FW + .7 : FW + 1.8) * SC, d: (PZ ? FH + 1.9 : FH + 1 + 2 * 1.45) * SC, y: Y * SC, pitch: 1.53, cz: PZ ? -.3 * SC : 0 } : { w: (FW + 8.2) * SC, d: Math.max(FH + 3.2, 12.4) * SC, y: Y * SC, pitch: 1.53 }, PZ && zEase ? { ease: true, ek: .14 } : {}));
      T3.kick(400);
    }
    const HS = () => tall ? .9 : 1.08;   // a piece in hand (was .82 everywhere)
    const slotXZ = (who, t) => {   // who: 0 = player, 1 = AI
      const i = HANDS.indexOf(t), g = (tall ? GRID_T : GRID_W)[i], s = who ? -1 : 1;
      return [ST[who].x + g[0] * s, ST[who].z + g[1] * s];
    };

    /* ---------- pieces ---------- */
    let pcs = {}, hand = [[], []], strays = [], flying = new Set();                   // pcs[sq] = group; hand[who] = [{ t, g, badge }]
    const mk = code => { const c = code >> 4, ty = code & 15, g = SG.piece(ty, c !== hc, c === 1 && ty === 8); g.userData.c = c; g.userData.ty = ty; return g; };
    function swapType(g, ty) { const n = SG.piece(ty, false, g.userData.c === 1 && ty === 8), m = n.children[0]; g.remove(g.children[0]); g.add(m); g.userData.ty = ty; }
    const badgeTex = {};
    function badge(n) {
      const tex = badgeTex[n] || (badgeTex[n] = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
        x.fillStyle = '#2a1a0e'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 8; x.strokeStyle = '#fff4dc'; x.stroke();
        x.fillStyle = '#fff'; x.font = '900 72px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 64, 68);
        const tx = new TH.CanvasTexture(c); tx.encoding = TH.sRGBEncoding; return tx; })());
      const sp = new TH.Sprite(new TH.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false })); sp.scale.set(.5, .5, 1); sp.renderOrder = 5; return sp;
    }
    function buildHands() {   // the stands always show P.hand exactly: one piece per kind + a count badge
      hand.forEach(list => list.forEach(h => { board.remove(h.g); if (h.badge) { board.remove(h.badge); h.badge.material.dispose(); } }));
      hand = [[], []]; strays.forEach(g => board.remove(g)); strays = [];
      for (const who of [0, 1]) {
        const c = who ? ac : hc;
        for (const ty of HANDS) {
          const n = P.hand[c * 8 + ty]; if (!n) continue;
          const g = mk((c ? 16 : 0) + ty), [x, z] = slotXZ(who, ty); g.scale.setScalar(HS()); g.position.set(x, KH, z); board.add(g);
          let b = null; if (n > 1) { b = badge(n); const s = who ? -1 : 1; b.position.set(x + .3 * s, KH + .5, z + .3 * s); board.add(b); }
          hand[who].push({ t: ty, g, badge: b });
        }
      }
      if (PZ && tall) { hand.forEach(l => l.forEach(h => { h.g.visible = false; if (h.badge) h.badge.visible = false; })); strays.forEach(g => { g.visible = false; }); }   // (詰将棋 on phones: the chips at the top show them)
      T3.kick(200); handStrip();
    }
    // 詰将棋 (ctx.pz): the pieces in hand as readable chips at the top of the screen — the defender's (often every piece left)
    // and the player's own (tap one to drop it) — the 3D rows beside the board are too small to read on a phone (2026-11-10)
    let strip = null;
    const HK = { 1: '歩', 2: '香', 3: '桂', 4: '銀', 5: '角', 6: '飛', 7: '金' };   // (engine types: HANDS order 飛 角 金 銀 桂 香 歩)
    function handStrip() {
      if (!PZ || !P) return;
      if (!strip) { strip = document.createElement('div'); strip.className = 'sghs'; (ctx.panelHost || document.body).appendChild(strip);
        strip.addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (!b || busy || over || !pzOn) return; e.stopPropagation(); const ty = +b.dataset.t;
          if (sel && sel.hand === ty) return deselect(); if (legal.some(m => E.isDrop(m) && E.mFrom(m) - 80 === ty)) select({ hand: ty, who: 0 }); }); }
      const row = (who, lb) => { const c = who ? ac : hc, items = HANDS.map(ty => [ty, P.hand[c * 8 + ty]]).filter(x => x[1]);
        return `<div class="r${who ? ' op' : ''}"><span class="lb">${lb}</span>${items.length ? items.map(([ty, n]) => who ? `<span class="c">${HK[ty]}${n > 1 ? `<i>${n}</i>` : ''}</span>` : `<button type="button" class="c${sel && sel.hand === ty ? ' on' : ''}" data-t="${ty}">${HK[ty]}${n > 1 ? `<i>${n}</i>` : ''}</button>`).join('') : '<span class="nil">—</span>'}</div>`; };
      // composed 詰将棋 (no attacker king on the board): the defender holds every remaining piece by convention, so only the
      // player's own hand is shown; the practical mates from real games (the attacker's king is on the board) show both (2026-11-10)
      strip.innerHTML = (P.king[hc] >= 0 ? row(1, S.hOpp || STR.en.hOpp) : '') + row(0, S.hMe || STR.en.hMe);
      if (window.__fitStage) requestAnimationFrame(() => window.__fitStage());   // (the portal frames the board below the chips on phones)
    }
    function buildBoard(fallIn) {
      Object.values(pcs).forEach(g => board.remove(g)); pcs = {}; let i = 0;
      for (let sq = 0; sq < 81; sq++) { const code = P.board[sq]; if (!code) continue;
        const g = mk(code), [x, z] = cellXZ(sq); g.position.set(x, Y, z); board.add(g); pcs[sq] = g;
        if (fallIn) { g.visible = false; const d = 80 + (i++) * 14; later(() => { g.visible = true; anim(260, k => { g.position.y = Y + (1 - k) * (1 - k) * 1.4; }, () => { if (i && d > 80 + 38 * 14) tok(.25); }); }, d); }
      }
    }
    // after every move: make sure the 3D board matches the engine's position (types, owners)
    function verify() {
      for (let sq = 0; sq < 81; sq++) { const code = P.board[sq], g = pcs[sq];
        if (!code) { if (g) { board.remove(g); delete pcs[sq]; } continue; }
        if (g && g.userData.c === code >> 4 && g.userData.ty === (code & 15)) continue;
        if (g) board.remove(g); const n = mk(code), [x, z] = cellXZ(sq); n.position.set(x, Y, z); board.add(n); pcs[sq] = n; }
      buildHands();
      const known = new Set(Object.values(pcs)); hand.forEach(l => l.forEach(h => known.add(h.g)));
      board.children.filter(g => g.userData.ty != null && !known.has(g)).forEach(g => board.remove(g));   // nothing left over from an animation
    }

    /* ---------- marks: selection, destinations, last move, check ---------- */
    const marks = new TH.Group(); board.add(marks);
    const hintRingGeo = new TH.TorusGeometry(.46, .055, 10, 40);
    const tileGeo = new TH.BoxGeometry(CW * .92, .02, CH * .92), ringGeo = new TH.CylinderGeometry(.17, .17, .02, 24), padGeo = new TH.CylinderGeometry(.5, .5, .02, 28);
    const MAT = {};
    const mat = (color, op) => MAT[color + ':' + op] || (MAT[color + ':' + op] = new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false }));
    const clearMarks = () => { while (marks.children.length) marks.remove(marks.children[0]); };
    function tileAt(sq, color, op, geo = tileGeo) { const m = new TH.Mesh(geo, mat(color, op)), [x, z] = cellXZ(sq); m.position.set(x, Y + .012, z); marks.add(m); return m; }
    function drawMarks() {
      clearMarks();
      if (hint && !over) {   // ヒント: the engine's best move — a glowing ring on its square (and on the piece it moves / drops)
        const ring = (x, z, y) => { const m = new TH.Mesh(hintRingGeo, mat(0xff7a1a, .95)); m.rotation.x = Math.PI / 2; m.position.set(x, y + .03, z); marks.add(m); return m; };
        if (hint.from >= 0) { const [x, z] = cellXZ(hint.from); ring(x, z, Y); }
        else { const h = hand[meWho()].find(h => h.t === hint.drop); if (h) ring(h.g.position.x, h.g.position.z, KH); }
        tileAt(hint.to, 0xffb03a, .5); const [x, z] = cellXZ(hint.to); ring(x, z, Y);
      }
      if (last) { if (last.from >= 0) tileAt(last.from, 0xffb347, .28); tileAt(last.to, 0xff9a1f, .38); }
      if (!over && P.inCheck()) { const k = P.checkSq ? P.checkSq() : P.king[P.side]; if (k >= 0) tileAt(k, 0xff2a2a, .45); }   // (二玉将棋: the king in check)
      if (sel) {
        if (sel.sq != null) tileAt(sel.sq, 0x2fd17a, .55);
        else { const h = hand[sel.who || 0].find(h => h.t === sel.hand); if (h) { const m = new TH.Mesh(padGeo, mat(0x2fd17a, .6)); m.position.set(h.g.position.x, KH + .012, h.g.position.z); marks.add(m); } }
        const seen = new Set();
        targets().forEach(m => { const to = E.mTo(m); if (seen.has(to)) return; seen.add(to);
          if (P.board[to]) tileAt(to, 0xd8321c, .5); else tileAt(to, 0xd8321c, .85, ringGeo); });
      }
      T3.kick(150);
    }
    const targets = () => !sel ? [] : legal.filter(m => sel.sq != null ? !E.isDrop(m) && E.mFrom(m) === sel.sq : E.isDrop(m) && E.mFrom(m) - 80 === sel.hand);
    function lift(g, up, y0) { if (!g) return; const a = g.position.y, b = y0 + (up ? .25 : 0); anim(160, k => { g.position.y = a + (b - a) * io(k); }); }
    function selPiece() { return !sel ? null : sel.sq != null ? pcs[sel.sq] : (hand[sel.who || 0].find(h => h.t === sel.hand) || {}).g; }
    const meWho = () => P && P.side !== hc ? 1 : 0;   // whose stand the side to move uses (pvp: gote's is the far one)
    function select(s) {
      const old = selPiece(); if (old) lift(old, false, sel.sq != null ? Y : KH);
      sel = s; const g = selPiece(); if (g) lift(g, true, s.sq != null ? Y : KH);
      closePopup(); drawMarks(); handStrip();
    }
    function deselect() { if (!sel) return; const old = selPiece(); if (old) lift(old, false, sel.sq != null ? Y : KH); sel = null; closePopup(); drawMarks(); handStrip(); }

    /* ---------- hud ---------- */
    function hud(msg) {
      const side = c => `<span class="hs ${P && P.side === c && !over ? 'on' : ''}"><i class="sgk">${c ? '☖' : '☗'}</i>${pvp ? PX.n[c] : c === hc ? L.you : L.ai}</span>`;
      ctx.hud(`${side(0)}<span class="hm">${msg || ''}</span>${side(1)}`);
    }
    const plyTag = () => (VNAME && moves.length < 2 ? VNAME + ' · ' : '') + fmt(S.ply, moves.length + 1);   // (a variant: its name at the start)

    /* ---------- playing a move (both sides): engine first, then the animation ---------- */
    function play(m, done) {
      const c = P.side, who = c === hc ? 0 : 1, from = E.mFrom(m), to = E.mTo(m), drop = E.isDrop(m), promo = E.mPromo(m);
      const victim = drop ? 0 : P.board[to], before = VR === 'hasami' ? Object.keys(pcs).map(Number) : null;
      moves.push(P.toUsi(m)); P.doMove(m);
      const nt = P.board[to] & 15, extra = before ? before.filter(sq => sq !== from && sq !== to && !P.board[sq] && pcs[sq]) : [];   // (はさみ将棋: the pieces taken by the sandwich) P.histChk[P.hn - 1] = P.inCheck() ? 1 : 0; P.sp = 0; hint = null; hintJ++; ply++; onTurn();
      last = { from: drop ? -1 : from, to }; sel = null; clearMarks();
      const [x1, z1] = cellXZ(to);
      let g, y0;
      if (drop) {   // from the stand
        const h = hand[who].find(h => h.t === from - 80);
        g = h ? h.g : mk((c ? 16 : 0) + from - 80);
        if (h) { hand[who].splice(hand[who].indexOf(h), 1); if (h.badge) { board.remove(h.badge); } if (P.hand[c * 8 + h.t]) { const ng = mk((c ? 16 : 0) + h.t); ng.scale.setScalar(HS()); ng.position.copy(h.g.position); ng.position.y = KH; board.add(ng); hand[who].push({ t: h.t, g: ng, badge: null }); } }
        else { const [sx, sz] = slotXZ(who, from - 80); g.position.set(sx, KH, sz); board.add(g); }
        y0 = g.position.y;
      } else { g = pcs[from]; delete pcs[from]; y0 = g.position.y; }
      const vg = victim ? pcs[to] : null; pcs[to] = g;
      const x0 = g.position.x, z0 = g.position.z, s0 = g.scale.x, d = Math.hypot(x1 - x0, z1 - z0), H = drop ? 1.6 : .9 + Math.min(.6, d * .06), dur = (drop ? 520 : 380 + Math.min(240, d * 26)) * (PZ ? .5 : 1);   // (puzzles: quick, 2026-11-10)
      let capStarted = false;
      anim(dur, k => {
        const e = io(k); g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e;
        g.position.y = Y + (y0 - Y) * (1 - e) + Math.sin(k * Math.PI) * H; g.scale.setScalar(s0 + (1 - s0) * e);
        if (!capStarted && k > .55) { capStarted = true; if (vg) toStand(vg, who, c); extra.forEach(sq => { const x = pcs[sq]; delete pcs[sq]; if (x) toStand(x, who, c); }); }
      }, () => {
        g.position.set(x1, Y, z1); g.scale.setScalar(1); tok(victim ? 1 : .85); squash(g);
        if (!capStarted) { capStarted = true; if (vg) toStand(vg, who, c); extra.forEach(sq => { const x = pcs[sq]; delete pcs[sq]; if (x) toStand(x, who, c); }); }
        const fin = () => { const w = () => flying.size ? later(w, 50) : (verify(), done && done()); later(w, 60); };
        if (nt && nt !== g.userData.ty) later(() => flip(g, nt, fin), 90); else fin();   // promotion (マイクロ将棋: the turn-over after a capture, both ways)
      });
    }
    function squash(g) { anim(150, k => { const s = 1 + Math.sin(k * Math.PI) * .07; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function flip(g, ty, done) {   // promotion: lift, roll over, the red side lands face up
      let swapped = false;
      anim(560, k => { g.position.y = Y + Math.sin(k * Math.PI) * 1.0; g.rotation.z = k < .5 ? k * Math.PI : (k - 1) * Math.PI; if (k >= .5 && !swapped) { swapped = true; swapType(g, ty); } },
        () => { g.rotation.z = 0; g.position.y = Y; tok(.8); squash(g); done && done(); });
    }
    function toStand(vg, who, c) {   // a captured piece flies to the capturer's stand, turning to face its new owner, back to its plain side
      const ty0 = vg.userData.ty, base = BASEV ? BASEV[ty0] || ty0 : BASET[ty0], [x1, z1] = slotXZ(who, base), x0 = vg.position.x, z0 = vg.position.z;
      const r0 = vg.rotation.y, r1 = c === hc ? 0 : Math.PI; let swapped = base === ty0;
      const dr = ((r1 - r0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      vg.userData.c = c; flying.add(vg);
      anim(PZ ? 380 : 640, k => { const e = io(k); vg.position.x = x0 + (x1 - x0) * e; vg.position.z = z0 + (z1 - z0) * e; vg.position.y = Y + Math.sin(k * Math.PI) * 2.0; vg.rotation.y = r0 + dr * e; vg.scale.setScalar(1 - .18 * e);
        if (!swapped) { vg.rotation.z = k < .5 ? k * Math.PI : (k - 1) * Math.PI; if (k >= .5) { swapped = true; swapType(vg, base); } } },
        () => { vg.rotation.z = 0; vg.position.y = KH; tok(.5); flying.delete(vg); strays.push(vg); });
    }

    /* ---------- game flow ---------- */
    function checkEnd() {   // same rules as the full game (shogi/index.html checkEnd; the variants: variants.js checkEnd)
      const n = moves.length;
      if (VR) {
        if (VR === 'hasami' && P.result(0) != null) return { winner: P.side ^ 1, reason: 'hasami5', ply: n };
        if (P.cfg && P.cfg.kk && P.result() === 0) return { winner: -1, reason: 'kk', ply: n };   // 平安将棋: 玉対玉
        if (!P.legalMoves().length) return { winner: P.side ^ 1, reason: VR === 'hasami' || !P.inCheck() ? 'nomove' : 'mate', ply: n };
      }
      if (!P.legalMoves(false).length) return { winner: P.side ^ 1, reason: 'mate', ply: n };
      let reps = 0;
      for (let i = P.hn - 1; i >= 0; i -= 2) if (P.histL[i] === P.hl && P.histH[i] === P.hh) reps++;
      if (reps >= 4) {
        let first = -1;
        for (let i = P.hn - 1; i >= 0; i -= 2) if (P.histL[i] === P.hl && P.histH[i] === P.hh) first = i;
        let us = true, them = true;
        for (let j = first; j < P.hn; j += 2) if (!P.histChk[j]) us = false;
        for (let j = first + 1; j < P.hn; j += 2) if (!P.histChk[j]) them = false;
        if (VR === 'hasami') return { winner: -1, reason: 'sen', ply: n };
        return us ? { winner: P.side, reason: 'perp', ply: n } : them ? { winner: P.side ^ 1, reason: 'perp', ply: n } : VR === 'mini' ? { winner: 1, reason: 'sennichiteMini', ply: n } : { winner: -1, reason: 'sen', ply: n };
      }
      if (VR === 'hasami' && n >= 300) { const a = P.hand[1], b = P.hand[9]; return { winner: a > b ? 0 : b > a ? 1 : -1, reason: 'hmax', ply: n }; }
      if (P.canDeclare()) return { winner: P.side, reason: 'decl', ply: n };
      if (n >= 512) return { winner: -1, reason: 'max', ply: n };
      return null;
    }
    function end(o) {
      over = o; busy = true; sel = null; hint = null; hintJ++; jobId++; closePopup(); drawMarks(); if (ctx.onTurn) ctx.onTurn(-1);
      const win = !pvp && o.winner === hc, draw = o.winner < 0, wt = pvp && !draw ? PX.win.replace('{p}', PX.n[o.winner]) : '';
      let sc = o.reason === 'mate' ? fmt(S.mate, o.ply) : o.reason === 'resign' ? fmt(S.resign, o.ply) : o.reason === 'time' ? t('act.timeout') : S[o.reason] || vtxt('res.' + o.reason) || o.reason;
      if (pvp && o.by != null) sc = t('act.pvpEnd', { p: PX.n[o.by], r: o.reason === 'time' ? t('act.timeout') : t('act.resigned'), w: wt });   // the side to move resigned / ran out of time
      hud(`${draw ? L.draw : pvp ? wt : win ? L.win : L.lose} · ${sc}`);
      if (o.reason === 'mate' && P.king) { const k = P.king[o.winner ^ 1], g = pcs[k]; if (g) { const r0 = g.rotation.y; anim(700, k2 => { g.rotation.y = r0 + Math.sin(k2 * Math.PI * 7) * .16 * (1 - k2); }, () => { g.rotation.y = r0; }); } }
      ctx.onEnd(pvp ? { win: false, draw, level: ctx.level, score: sc, pvp: true, winnerText: wt } : { win, draw, level: ctx.level, score: sc });
    }
    function next() {
      if (stopped || over) return;
      const o = checkEnd(); if (o) return end(o);
      onTurn();
      const chk = P.inCheck() ? S.check + ' ' : '';
      if (pvp || P.side === hc) { legal = P.legalMoves(true); busy = false; hud(`${plyTag()} · ${chk}${pvp ? PX.turn.replace('{p}', PX.n[P.side]) : L.turn}`); drawMarks(); return; }
      busy = true; legal = []; hud(`${plyTag()} · ${chk}${L.think}`); drawMarks(); aiMove();
    }
    function bookMove() {
      if (!book || VAR || lvIdx < 2 || moves.length > 30) return null;
      const e = book[P.sfen().replace(/ \d+$/, '')]; if (!e) return null;
      const tot = e.reduce((a, b) => a + b[1], 0); let x = Math.random() * tot;
      for (const [u, c] of e) { x -= c; if (x <= 0) return u; }
      return e[0][0];
    }
    function aiMove() {
      const t0 = performance.now(), go = u => {
        if (stopped || over) return;
        const m = u ? P.fromUsi(u) : 0;
        if (!m || !P.legalMoves(true).includes(m)) { const lm = P.legalMoves(false); if (!lm.length) return end({ winner: hc, reason: 'mate', ply: moves.length }); return play(lm[Math.floor(Math.random() * lm.length)], next); }
        play(m, next);
      };
      const bm = bookMove();
      if (bm) { const id0 = jobId; return later(() => { if (id0 === jobId) go(bm); }, 0); }   // AIの着手は即時（定跡の手も）
      const id = ++jobId;
      worker.onmessage = e => {
        const r = e.data; if (r.id !== id || r.type !== 'result' || stopped || over) return;
        later(() => {
          if (id !== jobId || over) return;
          if (!r.move) return end({ winner: hc, reason: VR === 'hasami' ? 'nomove' : 'mate', ply: moves.length });
          if (!VR && !LV.noise && r.score <= -E.MATE + 200) return end({ winner: hc, reason: 'resign', ply: moves.length });   // hopeless: the strong levels resign, as in the full game
          go(r.move);
        }, 0 /* AIの着手は即時（前の手のアニメは終わっている） */);
      };
      worker.onerror = () => { if (stopped) return; worker.terminate(); worker = newWorker(); later(() => go(null), 50); };
      worker.postMessage(VR ? { type: 'think', id, variant: VR, sfen: SF, moves: moves.slice(), opts: VLVL } : { type: 'think', id, sfen: SF, moves: moves.slice(), opts: LV });
    }
    let weights = null;
    function newWorker() { if (VR) return new Worker(BASE + VWORK); const w = new Worker(BASE + 'engine.js' + EV); if (weights) w.postMessage({ type: 'weights', buffer: weights.slice(0) }); return w; }

    /* ---------- the player's input ---------- */
    function closePopup() { if (popup) { popup.remove(); popup = null; } }
    function toBoard(p) { return { x: (p.x - board.position.x) / SC, z: (p.z - board.position.z) / SC }; }
    function hit(e) {
      const p0 = T3.pick(e, Y * SC); if (!p0) return null;
      const p = toBoard(p0), c = Math.floor((p.x + FW / 2) / CW), r = Math.floor((p.z + FH / 2) / CH);
      if (c >= 0 && c < NW && r >= 0 && r < NH) return { sq: sqAt(c, r) };
      const who = meWho();
      for (const h of hand[who]) if (Math.abs(p.x - h.g.position.x) < .42 && Math.abs(p.z - h.g.position.z) < .5) return { hand: h.t, who };
      return null;
    }
    function tryMove(to) {
      const ms = targets().filter(m => E.mTo(m) === to); if (!ms.length) return false;
      const pro = ms.find(m => E.mPromo(m)), non = ms.find(m => !E.mPromo(m));
      if (pro && non) { askPromo(to, pro, non); return true; }
      commit(pro || non); return true;
    }
    function commit(m) { busy = true; closePopup(); play(m, PZ ? pzAfter : next); }
    function askPromo(to, pro, non) {
      closePopup();
      const [x, z] = cellXZ(to), q = T3.project(x * SC + board.position.x, z * SC + board.position.z, (Y + .3) * SC);
      const el = document.createElement('div'); el.className = 'sgpromo';
      el.innerHTML = `<button type="button" class="y">${S.yes}</button><button type="button" class="n">${S.no}</button>`;
      el.style.left = Math.max(90, Math.min(innerWidth - 90, q.x)) + 'px'; el.style.top = Math.max(70, q.y) + 'px';
      el.querySelector('.y').onclick = ev => { ev.stopPropagation(); commit(pro); };
      el.querySelector('.n').onclick = ev => { ev.stopPropagation(); commit(non); };
      document.body.appendChild(el); popup = el;
      const tile = tileAt(to, 0x2f8bd1, .55); tile.userData.promo = 1; T3.kick(150);
    }
    function onClick(e) {
      if (PZ && pmoved >= 8) { pmoved = 0; return; }   // (the end of a slide of the zoomed board)
      if (busy || over || !P || (!pvp && P.side !== hc) || T3.wasDrag() || (PZ && !pzOn)) return;
      if (popup) { deselect(); return; }
      const h = hit(e); if (!h) { deselect(); return; }
      if (h.sq != null && sel && tryMove(h.sq)) return;
      if (h.sq != null) { const code = P.board[h.sq];
        if (code && code >> 4 === P.side) { if (sel && sel.sq === h.sq) return deselect(); if (legal.some(m => !E.isDrop(m) && E.mFrom(m) === h.sq)) return select({ sq: h.sq }); }
        return deselect(); }
      if (h.hand != null) { if (sel && sel.hand === h.hand) return deselect(); if (legal.some(m => E.isDrop(m) && E.mFrom(m) - 80 === h.hand)) return select({ hand: h.hand, who: h.who }); return deselect(); }
    }
    let lastTall = null;
    function onResize() { closePopup(); layout(); if (lastTall !== tall) { lastTall = tall; if (P) { buildHands(); drawMarks(); } } }
    ctx.el.addEventListener('click', onClick);
    addEventListener('resize', onResize);
    layout(); lastTall = tall;
    hud('…');

    Promise.all([load(), VR ? loadVariants() : null]).then(([r]) => {
      if (stopped) return;
      E = r.E; book = r.book; weights = r.weights;
      P = newPos(); P.setSfen(SF);
      if (!pvp) worker = newWorker();
      buildBoard(true); buildHands();
      if (PZ) { later(pzReady, 80 + 40 * 14 + 300); return; }
      hud(plyTag());
      later(next, 80 + 40 * 14 + 400);
    }).catch(() => { if (!stopped) hud('⚠'); });

    /* ---------- 待った · 投了 · ヒント · time-out (the portal's action bar) ---------- */
    const myTurn = () => !!P && !over && !busy && !popup && (pvp || P.side === hc);
    const undoN = () => pvp ? 1 : 2;
    function replay(n) {   // the position after the first n moves (待った), the 3D board rebuilt to match
      const keep = moves.slice(0, n); P = newPos(); P.setSfen(SF); last = null;
      for (const u of keep) { const m = P.fromUsi(u); P.doMove(m); P.histChk[P.hn - 1] = P.inCheck() ? 1 : 0; P.sp = 0; last = { from: E.isDrop(m) ? -1 : E.mFrom(m), to: E.mTo(m) }; }
      moves = keep; sel = null; hint = null; hintJ++;
      buildBoard(false); verify(); drawMarks(); T3.kick(300);
    }
    /* ---------- puzzle mode (ctx.pz) ---------- */
    let pzOn = false;
    function pzReady() { if (stopped) return; if (!region && zoomOn) pzZoom(); legal = P.legalMoves(true); busy = false; pzOn = true; drawMarks(); if (PZ.ready) PZ.ready(); }
    function pzAfter() {   // the player's move has landed: the puzzle decides what happens next
      legal = []; pzOn = false; drawMarks();
      PZ.moved(moves[moves.length - 1], { check: P.inCheck(), mate: !P.legalMoves(false).length, n: moves.length });
    }
    const hasCheck = () => P.legalMoves(true).some(m => { P.doMove(m); const c = P.inCheck(); P.undoMove(); return c; });
    function pzLoad(sfen, sol) {   // the next puzzle: a new position, the pieces drop in again
      timers.forEach(clearTimeout); timers.length = 0; jobId++; closePopup();
      SF = sfen; hc = SF.split(' ')[1] === 'w' ? 1 : 0; ac = hc ^ 1; pzSol = sol || []; region = null;
      if (!E) return;   // (the engine is still loading: load() starts from SF)
      P = new E.Position(); P.setSfen(SF); moves = []; last = null; sel = null; hint = null; hintJ++; over = null; busy = true; pzOn = false;
      buildBoard(true); buildHands(); drawMarks();
      later(pzReady, 80 + 40 * 14 + 300);
    }
    // 詰将棋 in a corner of the board: the camera frames the part the problem uses (its pieces and the solution's squares,
    // a square of room around, at least 5 × 5), with a button to see the whole board (2026-11-10)
    // zoomed in: a finger (or the mouse) slides the board around (2026-11-10); a slide is not a tap on a square
    let pdrag = null, pmoved = 0, pts = 0;
    const onPDown = e => { pts++; if (!PZ || !zoomOn || !region || pts > 1) { pdrag = null; return; } pdrag = { id: e.pointerId, x: e.clientX, y: e.clientY }; pmoved = 0; };
    const onPMove = e => {
      if (!pdrag || e.pointerId !== pdrag.id) return;
      const a = T3.pick({ clientX: pdrag.x, clientY: pdrag.y }, Y * SC), b = T3.pick(e, Y * SC);
      pmoved += Math.abs(e.clientX - pdrag.x) + Math.abs(e.clientY - pdrag.y); pdrag.x = e.clientX; pdrag.y = e.clientY;
      if (!a || !b || pmoved < 8) return;
      pan[0] += a.x - b.x; pan[1] += a.z - b.z; pzFit(); T3.kick(120);
    };
    const onPUp = () => { pts = Math.max(0, pts - 1); pdrag = null; };
    ctx.el.addEventListener('pointerdown', onPDown); addEventListener('pointermove', onPMove); addEventListener('pointerup', onPUp); addEventListener('pointercancel', onPUp);
    const ZT = { ja: ['全体を見る', '拡大する'], en: ['Whole board', 'Zoom in'], zh: ['看全盘', '放大'], 'zh-TW': ['看全盤', '放大'], ko: ['전체 보기', '확대'], es: ['Tablero entero', 'Ampliar'], fr: ['Tout le plateau', 'Zoomer'], pt: ['Tabuleiro todo', 'Ampliar'], de: ['Ganzes Brett', 'Vergrößern'], hi: ['पूरा बोर्ड', 'बड़ा करें'], ar: ['اللوحة كاملة', 'تكبير'], ru: ['Вся доска', 'Приблизить'], id: ['Seluruh papan', 'Perbesar'], tr: ['Tüm tahta', 'Yakınlaştır'] };
    function pzRegion() {
      const cs = [], rs = [], add = sq => { const [c, r] = disp(sq); cs.push(c); rs.push(r); };
      for (let sq = 0; sq < 81; sq++) if (P.board[sq]) add(sq);
      const Q = new E.Position(); Q.setSfen(SF);
      for (const u of pzSol) { const m = Q.fromUsi(u); if (!m) break; if (!E.isDrop(m)) add(E.mFrom(m)); add(E.mTo(m)); Q.doMove(m); }
      if (!cs.length) return null;
      const span = (a, b) => { a = Math.max(0, a - 1); b = Math.min(8, b + 1); while (b - a < 4) { if (a > 0) a--; if (b - a < 4 && b < 8) b++; } return [a, b]; };
      const [c0, c1] = span(Math.min(...cs), Math.max(...cs)), [r0, r1] = span(Math.min(...rs), Math.max(...rs));
      return c1 - c0 >= 7 && r1 - r0 >= 7 ? null : { c0, c1, r0, r1 };
    }
    function pzFit() {
      if (!zoomOn || !region || !T3.fit) return false;
      const a = SG.cell(region.c0, region.r0), b = SG.cell(region.c1, region.r1);
      const w = Math.abs(b[0] - a[0]) + CW * 1.9, d = Math.abs(b[1] - a[1]) + CH * 1.9;
      const lim = v => Math.max(-FW / 2 * SC, Math.min(FW / 2 * SC, v));
      const cx = ((a[0] + b[0]) / 2) * SC + board.position.x, cz = ((a[1] + b[1]) / 2) * SC + board.position.z;
      pan[0] = lim(cx + pan[0]) - cx; pan[1] = lim(cz + pan[1]) - cz;   // (the frame's middle stays over the board)
      T3.fit(Object.assign({ w: w * SC, d: d * SC, y: Y * SC, pitch: 1.53, cx: cx + pan[0], cz: cz + pan[1] }, zEase ? { ease: true, ek: .14 } : {}));
      return true;
    }
    function zoomBtn() {
      const L = ZT[ctx.lang] || ZT.en;
      if (!region) { if (zbtn) { zbtn.remove(); zbtn = null; } return; }
      if (!zbtn) { zbtn = document.createElement('button'); zbtn.type = 'button'; zbtn.className = 'sgzoom'; document.body.appendChild(zbtn);
        zbtn.onclick = e => { e.stopPropagation(); zoomOn = !zoomOn; pan = [0, 0]; zoomBtn(); zEase = true; layout(); zEase = false; }; }
      // above the guide character of the puzzle panel (atlas/puzzles.js .rgd.pzg), else top right (2026-11-10)
      const host = document.querySelector('.rgd.pzg'), pic = host && host.querySelector('.pic');
      if (host && zbtn.parentElement !== host) { host.appendChild(zbtn); zbtn.classList.add('in-rgd'); }
      if (pic) { const pr = pic.getBoundingClientRect(), hr = host.getBoundingClientRect(); zbtn.style.left = Math.round(pr.left - hr.left + pr.width / 2 - 22) + 'px'; zbtn.style.bottom = Math.round(hr.bottom - pr.top + 22) + 'px'; }
      zbtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${zoomOn ? '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>' : '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M8 10.5h5M10.5 8v5"/>'}</svg>`;   // (icon only, 2026-11-10)
      zbtn.setAttribute('aria-label', zoomOn ? L[0] : L[1]); zbtn.title = zoomOn ? L[0] : L[1];
    }
    function pzZoom() { region = pzRegion(); zoomOn = true; pan = [0, 0]; zoomBtn(); zEase = true; layout(); zEase = false; }
    const pz = {
      play: usi => new Promise(res => { const m = P.fromUsi(usi); if (!m) return res(false); busy = true; pzOn = false; play(m, () => { if (stopped) return; res(true); }); }),
      wait() { legal = P.legalMoves(true); busy = false; pzOn = true; drawMarks(); },   // the player's turn again
      undo(n = 1) { timers.forEach(clearTimeout); timers.length = 0; replay(Math.max(0, moves.length - n)); },
      mark(usi) { const m = usi && P.fromUsi(usi); hint = m ? { from: E.isDrop(m) ? -1 : E.mFrom(m), drop: E.isDrop(m) ? E.mFrom(m) - 80 : -1, to: E.mTo(m), usi } : null; drawMarks(); },
      hasCheck: () => hasCheck(),
      defend: remain => new Promise(res => {   // the defender's longest reply (or an escape): the engine's tsumeDefend
        const id = ++jobId, w = worker || (worker = newWorker());
        w.onmessage = e => { const r = e.data; if (r.id !== id || stopped) return; res(r.type === 'tsume' ? { reply: r.reply, mate: !!r.mate } : null); };
        w.onerror = () => res(null);
        w.postMessage({ type: 'tsumeDefend', id, sfen: SF, moves: moves.slice(), remain });
      }),
      load: pzLoad,
      moves: () => moves.slice(),
    };
    const api = {
      human: hc, pz,
      canUndo: () => myTurn() && moves.length >= undoN() + (pvp || hc === 0 ? 0 : 1),
      undo() {
        if (!api.canUndo()) return;
        timers.forEach(clearTimeout); timers.length = 0; jobId++; closePopup();
        replay(moves.length - undoN()); ply++; next();
      },
      canHint: () => myTurn() && legal.length > 0,
      hint() {
        if (!myTurn()) return Promise.resolve(false);
        const j = ++hintJ, n = moves.length;
        return new Promise(res => {
          if (!hintW) hintW = newWorker();
          hintW.onmessage = e => {
            const r = e.data; if (r.type !== 'result' || r.id !== j) return;
            if (stopped || j !== hintJ || over || moves.length !== n) return res(true);
            const m = r.move ? P.fromUsi(r.move) : 0; if (!m || !legal.includes(m)) return res(false);
            hint = { from: E.isDrop(m) ? -1 : E.mFrom(m), drop: E.isDrop(m) ? E.mFrom(m) - 80 : -1, to: E.mTo(m), usi: r.move };
            drawMarks(); res(true);
          };
          hintW.onerror = () => { if (hintW) hintW.terminate(); hintW = null; res(false); };
          hintW.postMessage(VR ? { type: 'think', id: j, variant: VR, sfen: SF, moves: moves.slice(), opts: vLevel(Math.max(12, vIdx + 3), VR) } : { type: 'think', id: j, sfen: SF, moves: moves.slice(), opts: LEVELS[Math.max(12, Math.min(14, lvIdx + 2))] });
        });
      },
      canResign: () => !!P && !over,
      resign() { if (!P || over) return; const by = pvp ? P.side : hc; end({ winner: by ^ 1, reason: 'resign', ply: moves.length, by }); },
      timeout(side) { if (!P || over) return; end({ winner: side ^ 1, reason: 'time', ply: moves.length, by: side }); },
      stop() {
        stopped = true; timers.forEach(clearTimeout); closePopup();
        ctx.el.removeEventListener('click', onClick); removeEventListener('resize', onResize);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        if (window.__shogiTable === dbg) delete window.__shogiTable;
        if (strip) strip.remove(); if (zbtn) zbtn.remove();
        ctx.el.removeEventListener('pointerdown', onPDown); removeEventListener('pointermove', onPMove); removeEventListener('pointerup', onPUp); removeEventListener('pointercancel', onPUp);
      },
    };
    // test hooks (Playwright): screen positions of squares / the player's hand pieces, and the state
    const dbg = {
      xy(sq) { const [x, z] = cellXZ(sq); return T3.project(x * SC + board.position.x, z * SC + board.position.z, Y * SC); },
      handXY(ty, who = 0) { const h = hand[who].find(h => h.t === ty); if (!h) return null; return T3.project(h.g.position.x * SC + board.position.x, h.g.position.z * SC + board.position.z, KH * SC); },
      sq: u => E.makeSq(+u[0], 'abcdefghi'.indexOf(u[1]) + 1),
      audit() {   // pieces on the board's plane that the engine does not know about (or the other way round)
        const out = []; board.children.forEach(g => { if (g.userData.ty == null || !g.visible) return; if (Object.values(pcs).includes(g) || hand.some(l => l.some(h => h.g === g)) || strays.includes(g) || flying.has(g)) return; out.push('orphan ' + g.userData.ty + '@' + g.position.x.toFixed(2) + ',' + g.position.z.toFixed(2)); });
        for (let sq = 0; sq < 81; sq++) { const code = P.board[sq], g = pcs[sq]; if (!!code !== !!g) out.push('mismatch ' + sq); else if (g && (g.userData.ty !== (code & 15) || g.userData.c !== code >> 4)) out.push('type ' + sq); }
        return out;
      },
      state: () => ({ hint: hint && hint.usi, moves: moves.slice(), side: P && P.side, hc, pvp, busy, over, sfen: P && P.sfen(), legal: legal.map(m => P.toUsi(m)), popup: !!popup, tall, hand: P && Array.from(P.hand) }),
    };
    window.__shogiTable = dbg;
    return api;
  }

  window.AtlasShogiPlay = { start };
})();
