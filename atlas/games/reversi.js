/* =====================================================================
   Reversi on the 3D table (portal play).  Uses ../reversi/engine.js
   (same AI, weights and opening book as the full game).
   Adapter contract — every game in atlas/games/<id>.js registers (see atlas/README.md):
     Atlas3D[id] = { levels: n, sides: true|false, clock, start(ctx) → session }
   ctx = { el, Table3D, lang, t(key), hud(html), level, side, mode, onTurn(side, {human, ply}), onEnd({win, draw, level}) }
   session = { stop(), undo(), canUndo(), hint(), canHint(), resign(), canResign(), timeout(side), human }
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../reversi/';
  let weights = null, book = null, readyP = null;
  // the AI's weights (7.8 MB gzip) and book: loaded on the first game, not with the page; inflated in a worker on the portal
  const gunzipHere = buf => new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const ready = () => readyP || (readyP = (async () => {
    try {
      let buf = await fetch(BASE + 'weights.bin.gz?v=4').then(r => r.arrayBuffer());
      const u8 = new Uint8Array(buf, 0, 2);
      if (u8[0] === 0x1f && u8[1] === 0x8b && 'DecompressionStream' in window) buf = await (window.AtlasTexGen ? AtlasTexGen.gunzip(buf.slice(0)).catch(() => gunzipHere(buf)) : gunzipHere(buf));
      const meta = await fetch(BASE + 'weights.json').then(r => r.json()).catch(() => ({ nphase: 12 }));
      weights = { buffer: buf, nphase: meta.nphase };
    } catch (e) { weights = null; }
    book = await fetch(BASE + 'book.bin?v=2').then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);   // (the opening book, decoded in each worker: engine.js decodeBook)
  })());

  /* ---------- sounds (respect the portal's sound switch): a plastic disc clacking onto the board, light ticks as discs turn ---------- */
  let AC = null;
  function ac() {
    try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {}
    try { AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; }
  }
  function tone(a, t0, f0, f1, dur, vol, type) {
    const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .004); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .02);
  }
  function noise(a, t0, dur, vol, freq, q) {
    const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * dur | 0, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
    n.buffer = b; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q || 1.4;
    const g = a.createGain(); g.gain.value = vol; n.connect(bp).connect(g).connect(a.destination); n.start(t0);
  }
  const SND = {
    put() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 260, 110, .09, .22); noise(a, t, .035, .55, 2600, 1.3); tone(a, t, 1900, 0, .06, .03, 'triangle'); },
    flip(i) { const a = ac(); if (!a) return; const t = a.currentTime, k = Math.pow(1.06, Math.min(i, 12)); noise(a, t, .025, .3, 4200 * k, 2); tone(a, t, 900 * k, 600 * k, .05, .05, 'triangle'); },
    pass() { const a = ac(); if (!a) return; const t = a.currentTime; tone(a, t, 523.25, 0, .22, .06, 'triangle'); tone(a, t + .12, 392, 0, .3, .06, 'triangle'); },
  };

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
  // two players on one device (ctx.mode 'pvp'): the colours' names, whose turn, who won
  const PV = {
    ja: { n: ['黒', '白'], turn: '{p}の番', win: '{p}の勝ち' }, en: { n: ['Black', 'White'], turn: '{p} to move', win: '{p} wins' },
    zh: { n: ['黑', '白'], turn: '轮到{p}', win: '{p}胜' }, ko: { n: ['흑', '백'], turn: '{p} 차례', win: '{p} 승리' },
    es: { n: ['Negras', 'Blancas'], turn: 'Turno: {p}', win: 'Ganan {p}' }, fr: { n: ['Noirs', 'Blancs'], turn: 'Trait : {p}', win: 'Victoire des {p}' },
    pt: { n: ['Pretas', 'Brancas'], turn: 'Vez: {p}', win: 'Vitória das {p}' }, de: { n: ['Schwarz', 'Weiß'], turn: '{p} am Zug', win: '{p} gewinnt' },
    hi: { n: ['काला', 'सफ़ेद'], turn: '{p} की बारी', win: '{p} की जीत' }, ar: { n: ['الأسود', 'الأبيض'], turn: 'دور {p}', win: 'فوز {p}' }, ru: { n: ['Чёрные', 'Белые'], turn: 'Ход: {p}', win: '{p} побеждают' }, 'zh-TW': { n: ['黑方', '白方'], turn: '輪到{p}', win: '{p}獲勝' }, id: { n: ['Hitam', 'Putih'], turn: 'Giliran {p}', win: '{p} menang' }, tr: { n: ['Siyah', 'Beyaz'], turn: 'Sıra: {p}', win: '{p} kazandı' },
  };

  function start(ctx) {
    ready();   // start loading the AI now (it is needed from the first AI move)
    const T3 = ctx.Table3D, THREE = window.THREE, t = ctx.t;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), pass: t('p.pass'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const board = T3.MODELS.reversi(true); T3.show('reversi', board);
    const S = board.userData.S, Y = board.userData.top;
    const RM = T3.rvMats(), DH = T3.rvDisc.H / 2;   // flat, matte Othello discs (half thickness: the centre sits DH above the felt)
    const hintM = new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: .55 });
    const lastM = new THREE.MeshBasicMaterial({ color: 0xff5d5d });
    const pos = sq => [T3.cellPos(8, S, sq & 7), T3.cellPos(8, S, sq >> 3)];
    const discs = {}, hints = new THREE.Group(); board.add(hints);
    const lastDot = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .02, 16), lastM); lastDot.visible = false; board.add(lastDot);
    const pvp = ctx.mode === 'pvp', PX = PV[ctx.lang] || PV.en, pname = c => PX.n[c - 1];   // pvp: both colours are tapped in turn; black (first) at the bottom
    const human = pvp ? 1 : ctx.side === 2 ? 2 : 1, ai = 3 - human;
    let cells = Array(64).fill(0); cells[27] = cells[36] = 2; cells[28] = cells[35] = 1;
    let turn = 1, over = false, stopped = false, busy = false, worker = null, ply = 0, hist = [], last = -1, hintW = null, hintJ = 0, aiJ = 0, hintSq = -1;
    const hintRing = new THREE.Mesh(new THREE.TorusGeometry(.36, .06, 10, 40), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: .95, toneMapped: false }));
    hintRing.rotation.x = Math.PI / 2; hintRing.visible = false; board.add(hintRing);
    const hintGlow = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .015, 32), new THREE.MeshBasicMaterial({ color: 0xffb03a, transparent: true, opacity: .5, toneMapped: false, depthWrite: false }));
    hintGlow.visible = false; board.add(hintGlow);
    const ix = c => c - 1;   // HUD pill / clock side: black (left) 0, white 1
    const onTurn = () => { if (ctx.onTurn) ctx.onTurn(ix(turn), { human: pvp || turn === human, ply }); };
    function hideHint() { hintSq = -1; if (hintRing.visible || hintGlow.visible) { hintRing.visible = hintGlow.visible = false; if (T3.kick) T3.kick(150); } hintJ++; }

    function makeDisc(sq, color) {
      const inner = new THREE.Group(); inner.add(T3.rvDisc(RM));   // white side up by default
      const outer = new THREE.Group(); outer.add(inner); const ao = T3.contact(.42); ao.position.y = -DH + .002; outer.add(ao);
      const [x, z] = pos(sq); outer.position.set(x, Y + DH, z);
      inner.rotation.x = color === 1 ? Math.PI : 0;
      board.add(outer); discs[sq] = { outer, inner, color };
      return discs[sq];
    }
    function anim(dur, f, done) { const t0 = performance.now(); (function s(n) { const k = Math.min(1, (n - t0) / dur); f(k); if (T3.kick) T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); }   // (every frame of it asks for a drawing: the table renders on demand)
    function drop(sq, color, snd) { const d = makeDisc(sq, color); anim(260, k => { d.outer.position.y = Y + DH + (1 - k) * (1 - k) * 2.2; }, () => { if (snd && !stopped) SND.put(); }); }
    function flip(sq, color, delay, i) {
      const d = discs[sq]; d.color = color;
      const from = d.inner.rotation.x, to = color === 1 ? Math.PI : 0;
      if (i != null) setTimeout(() => { if (!stopped) SND.flip(i); }, delay + 190);   // the tick lands as the disc is edge-on
      setTimeout(() => anim(380, k => { const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; d.inner.rotation.x = from + (to - from) * e; d.outer.position.y = Y + DH + Math.sin(k * Math.PI) * .7; }), delay);
    }
    for (let s = 0; s < 64; s++) if (cells[s]) makeDisc(s, cells[s]);

    function showHints() {
      while (hints.children.length) hints.remove(hints.children[0]);
      if (over || (!pvp && turn !== human)) return;
      legal(cells, turn).forEach(s => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .02, 20), hintM); const [x, z] = pos(s); m.position.set(x, Y + .02, z); hints.add(m); });
    }
    function hud(msg) {
      const b = count(cells, 1), w = count(cells, 2);
      const side = c => `<span class="hs ${turn === c && !over ? 'on' : ''}"><i class="dk ${c === 1 ? 'b' : 'w'}"></i>${pvp ? pname(c) : c === human ? L.you : L.ai}<b>${c === 1 ? b : w}</b></span>`;
      ctx.hud(`${side(1)}<span class="hm">${msg || ''}</span>${side(2)}`);
    }
    function apply(sq, color) {
      if (pvp || color === human) hist.push({ cells: cells.slice(), turn: color, last });   // 待った: back to before this move
      hideHint(); ply++; last = sq;
      const fl = flipsOf(cells, sq, color);
      cells[sq] = color; fl.forEach(s => { cells[s] = color; });
      drop(sq, color, true);
      const [x, z] = pos(sq);
      fl.sort((a, b) => Math.hypot((a & 7) - (sq & 7), (a >> 3) - (sq >> 3)) - Math.hypot((b & 7) - (sq & 7), (b >> 3) - (sq >> 3))).forEach((s, i) => flip(s, color, 200 + i * 70, i));
      lastDot.position.set(x, Y + 2 * DH + .012, z); lastDot.visible = false;
      setTimeout(() => { lastDot.visible = true; if (T3.kick) T3.kick(150); }, 300);
      return 300 + fl.length * 70 + 380;
    }
    function next() {
      if (stopped) return;
      const me = legal(cells, turn), opp = legal(cells, 3 - turn);
      if (!me.length && !opp.length) return end();
      if (!me.length) { SND.pass(); hud(pvp ? pname(turn) + ' · ' + L.pass : L.pass); turn = 3 - turn; ply++; onTurn(); if (T3.kick) T3.kick(150); return setTimeout(next, pvp ? 1400 : 900); }
      showHints(); onTurn(); if (T3.kick) T3.kick(150);
      if (pvp) { hud(PX.turn.replace('{p}', pname(turn))); return; }
      if (turn === human) { hud(L.turn); return; }
      hud(L.think); aiMove();
    }
    async function aiMove() {
      busy = true;
      await ready();
      if (stopped) return;
      if (!worker) {
        worker = new Worker(BASE + 'engine.js?v=59');
        if (weights) worker.postMessage({ type: 'weights', buffer: weights.buffer.slice(0), nphase: weights.nphase });
        if (book) worker.postMessage({ type: 'book', book });
      }
      const t0 = Date.now(), j = ++aiJ;
      worker.onmessage = e => {
        const m = e.data; if (m.type !== 'result' || stopped || j !== aiJ || over) return;
        setTimeout(() => {
          if (stopped || j !== aiJ || over) return;
          const wait = m.move >= 0 ? apply(m.move, ai) : 0;
          turn = human; busy = false; onTurn(); setTimeout(next, wait);
        }, 0 /* AIの着手は即時（前の手のアニメは終わっている） */);
      };
      worker.postMessage({ type: 'think', id: 1, cells: cells.slice(), toMove: ai, opts: { level: ctx.level } });
    }
    function end() {
      over = true; hideHint(); showHints(); if (ctx.onTurn) ctx.onTurn(-1); if (T3.kick) T3.kick(150);
      if (pvp) {
        const b = count(cells, 1), w = count(cells, 2), wt = b === w ? '' : PX.win.replace('{p}', pname(b > w ? 1 : 2));
        hud(wt || L.draw);
        return ctx.onEnd({ win: false, draw: b === w, level: ctx.level, score: b + ' - ' + w, pvp: true, winnerText: wt });
      }
      const me = count(cells, human), op = count(cells, ai);
      hud(me > op ? L.win : me < op ? L.lose : L.draw);
      ctx.onEnd({ win: me > op, draw: me === op, level: ctx.level, score: me + ' - ' + op });
    }
    function onClick(e) {
      if (over || busy || (!pvp && turn !== human) || T3.wasDrag()) return;
      const me = pvp ? turn : human;
      const p = T3.pick(e, Y); if (!p) return;
      const c = Math.floor((p.x + S / 2) / (S / 8)), r = Math.floor((p.z + S / 2) / (S / 8));
      if (c < 0 || c > 7 || r < 0 || r > 7) return;
      const sq = r * 8 + c;
      if (!flipsOf(cells, sq, me).length) return;
      busy = true; const wait = apply(sq, me); turn = 3 - me; onTurn();
      while (hints.children.length) hints.remove(hints.children[0]);
      setTimeout(() => { busy = false; next(); }, wait);
    }
    ctx.el.addEventListener('click', onClick);
    setTimeout(next, 600); hud('');
    // test hooks (Playwright): a square's screen position, the state
    window.Atlas3D.reversi._dbg = { at: sq => { const [x, z] = pos(sq); return T3.project(x, z, Y); }, state: () => ({ turn, over, busy, pvp, legal: legal(cells, turn), b: count(cells, 1), w: count(cells, 2), hint: hintSq, hist: hist.length, discs: Object.keys(discs).length }) };
    /* ---------- 待った · 投了 · ヒント · time-out (the portal's action bar) ---------- */
    function rebuild() {   // the discs as `cells` says (after 待った)
      Object.keys(discs).forEach(k => { board.remove(discs[k].outer); delete discs[k]; });
      for (let s = 0; s < 64; s++) if (cells[s]) makeDisc(s, cells[s]);
      if (last >= 0) { const [x, z] = pos(last); lastDot.position.set(x, Y + 2 * DH + .012, z); lastDot.visible = true; } else lastDot.visible = false;
      if (T3.kick) T3.kick(300);
    }
    const myTurn = () => !over && !busy && (pvp || turn === human) && legal(cells, turn).length > 0;
    function finish(loser, why) {   // resign / time-out: the side `loser` (colour) loses
      if (over) return;
      over = true; busy = false; aiJ++; hideHint(); showHints(); if (ctx.onTurn) ctx.onTurn(-1); if (T3.kick) T3.kick(150);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = PX.win.replace('{p}', pname(3 - loser)); hud(wt); return ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: pname(loser), r, w: wt }), pvp: true, winnerText: wt }); }
      hud(L.lose); ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r });
    }
    const api = {
      human: human - 1,
      canUndo: () => myTurn() && hist.length > 0,
      undo() {
        if (!api.canUndo()) return;
        const h = hist.pop(); aiJ++; hideHint();
        cells = h.cells; turn = h.turn; last = h.last; ply++;   // (a new turn for the clock)
        while (hints.children.length) hints.remove(hints.children[0]);
        rebuild(); busy = false; next();
      },
      canHint: () => myTurn(),
      hint() {
        if (!myTurn()) return Promise.resolve(false);
        const j = ++hintJ, c0 = cells.slice(), me = turn;
        return ready().then(() => new Promise(res => {
          if (stopped || j !== hintJ) return res(true);
          if (!hintW) { hintW = new Worker(BASE + 'engine.js?v=59'); if (weights) hintW.postMessage({ type: 'weights', buffer: weights.buffer.slice(0), nphase: weights.nphase }); if (book) hintW.postMessage({ type: 'book', book }); }
          hintW.onmessage = e => {
            const m = e.data; if (m.type !== 'result') return;
            if (stopped || j !== hintJ || turn !== me || over) return res(true);
            if (!(m.move >= 0)) return res(false);
            hintSq = m.move; const [x, z] = pos(m.move); hintRing.position.set(x, Y + .03, z); hintGlow.position.set(x, Y + .012, z); hintRing.visible = hintGlow.visible = true;
            anim(520, k => { const s = 1 + Math.sin(k * Math.PI * 2) * .18 * (1 - k); hintRing.scale.set(s, s, s); if (T3.kick) T3.kick(80); });
            res(true);
          };
          hintW.postMessage({ type: 'think', id: 2, cells: c0, toMove: me, opts: { level: Math.max(14, Math.min(16, ctx.level + 2)) } });
        }));
      },
      canResign: () => !over,
      resign() { if (!over) finish(pvp ? turn : human, 'resign'); },
      timeout(side) { if (!over) finish(side + 1, 'time'); },
      stop() { stopped = true; ctx.el.removeEventListener('click', onClick); if (worker) worker.terminate(); if (hintW) hintW.terminate(); hintRing.geometry.dispose(); hintGlow.geometry.dispose(); },
    };
    return api;
  }

  // v4.1: the full game went from 10 to 20 AI levels; move the portal's saved choice to the same setting on the new scale
  try {
    const P = JSON.parse(localStorage.getItem('atlas-play') || '{}');
    if (P['reversi:lvV'] !== 2) { const OLD = [0, 4, 7, 9, 11, 13, 14, 16, 17, 19, 20]; P['reversi:lv'] = OLD[Math.max(1, Math.min(10, Math.round(+P['reversi:lv'] || 4)))]; P['reversi:lvV'] = 2; localStorage.setItem('atlas-play', JSON.stringify(P)); }
  } catch (e) {}
  window.Atlas3D = window.Atlas3D || {};
  // how strong each level is: the full game's level names / search depth, its fixed rating, and a plain-words hint
  const LVN = {"ja":[["入門Ⅰ","入門Ⅱ","入門Ⅲ","初級Ⅰ","初級Ⅱ","初級Ⅲ","中級Ⅰ","中級Ⅱ","中級Ⅲ","上級Ⅰ","上級Ⅱ","上級Ⅲ","達人Ⅰ","達人Ⅱ","達人Ⅲ","名人Ⅰ","名人Ⅱ","名人Ⅲ","超名人","最強"],["ほぼでたらめ","かなり気まぐれ・1手読み","気まぐれ・1手読み","1手読み・ミス多め","1手読み・ミスあり","2手読み・ミス多め","2手読み・ミスあり","2手読み・ときどきミス","3手読み・ときどきミス","4手読み・ミスあり","4手読み","5手読み","6手読み・終盤12マス","8手読み・終盤14マス完全読み","9手読み・終盤15マス","最大10手読み・終盤16マス","約1.5秒・終盤18マス","約2.2秒・終盤18マス","約3秒・終盤19マス","約5秒・終盤20マス"]],"en":[["Beginner I","Beginner II","Beginner III","Novice I","Novice II","Novice III","Intermediate I","Intermediate II","Intermediate III","Advanced I","Advanced II","Advanced III","Expert I","Expert II","Expert III","Master I","Master II","Master III","Grandmaster","Strongest"],["almost random","very erratic, 1-ply search","erratic, 1-ply search","1-ply search, many mistakes","1-ply search, makes mistakes","2-ply search, many mistakes","2-ply search, makes mistakes","2-ply search, some mistakes","3-ply search, some mistakes","4-ply search, makes mistakes","4-ply search","5-ply search","6-ply search, solves last 12","8-ply search, solves last 14","9-ply search, solves last 15","up to 10-ply, solves last 16","~1.5 s, solves last 18","~2.2 s, solves last 18","~3 s, solves last 19","~5 s, solves last 20"]],"zh":[["入门Ⅰ","入门Ⅱ","入门Ⅲ","初级Ⅰ","初级Ⅱ","初级Ⅲ","中级Ⅰ","中级Ⅱ","中级Ⅲ","高级Ⅰ","高级Ⅱ","高级Ⅲ","达人Ⅰ","达人Ⅱ","达人Ⅲ","名人Ⅰ","名人Ⅱ","名人Ⅲ","超名人","最强"],["几乎随机","非常随意・搜索1步","随意・搜索1步","搜索1步・失误较多","搜索1步・会失误","搜索2步・失误较多","搜索2步・会失误","搜索2步・偶尔失误","搜索3步・偶尔失误","搜索4步・会失误","搜索4步","搜索5步","搜索6步・残局12格","搜索8步・残局14格完全解","搜索9步・残局15格","最多搜索10步・残局16格","约1.5秒・残局18格","约2.2秒・残局18格","约3秒・残局19格","约5秒・残局20格"]],"ko":[["입문 I","입문 II","입문 III","초급 I","초급 II","초급 III","중급 I","중급 II","중급 III","상급 I","상급 II","상급 III","달인 I","달인 II","달인 III","명인 I","명인 II","명인 III","초명인","최강"],["거의 무작위","매우 변덕스러움・1수 읽기","변덕스러움・1수 읽기","1수 읽기・실수 많음","1수 읽기・실수 있음","2수 읽기・실수 많음","2수 읽기・실수 있음","2수 읽기・가끔 실수","3수 읽기・가끔 실수","4수 읽기・실수 있음","4수 읽기","5수 읽기","6수 읽기・종반 12칸","8수 읽기・종반 14칸 완전 해석","9수 읽기・종반 15칸","최대 10수 읽기・종반 16칸","약 1.5초・종반 18칸","약 2.2초・종반 18칸","약 3초・종반 19칸","약 5초・종반 20칸"]],"es":[["Principiante I","Principiante II","Principiante III","Novato I","Novato II","Novato III","Intermedio I","Intermedio II","Intermedio III","Avanzado I","Avanzado II","Avanzado III","Experto I","Experto II","Experto III","Maestro I","Maestro II","Maestro III","Gran maestro","Máximo"],["casi al azar","muy errático, búsqueda a 1 jugadas","errático, búsqueda a 1 jugadas","búsqueda a 1 jugadas, muchos errores","búsqueda a 1 jugadas, comete errores","búsqueda a 2 jugadas, muchos errores","búsqueda a 2 jugadas, comete errores","búsqueda a 2 jugadas, algún error","búsqueda a 3 jugadas, algún error","búsqueda a 4 jugadas, comete errores","búsqueda a 4 jugadas","búsqueda a 5 jugadas","búsqueda a 6 jugadas, resuelve las últimas 12","búsqueda a 8 jugadas, resuelve las últimas 14","búsqueda a 9 jugadas, resuelve las últimas 15","hasta 10 jugadas, resuelve las últimas 16","~1,5 s, resuelve las últimas 18","~2,2 s, resuelve las últimas 18","~3 s, resuelve las últimas 19","~5 s, resuelve las últimas 20"]],"fr":[["Débutant I","Débutant II","Débutant III","Novice I","Novice II","Novice III","Intermédiaire I","Intermédiaire II","Intermédiaire III","Avancé I","Avancé II","Avancé III","Expert I","Expert II","Expert III","Maître I","Maître II","Maître III","Grand maître","Maximum"],["presque au hasard","très erratique, recherche à 1 coups","erratique, recherche à 1 coups","recherche à 1 coups, beaucoup d’erreurs","recherche à 1 coups, fait des erreurs","recherche à 2 coups, beaucoup d’erreurs","recherche à 2 coups, fait des erreurs","recherche à 2 coups, quelques erreurs","recherche à 3 coups, quelques erreurs","recherche à 4 coups, fait des erreurs","recherche à 4 coups","recherche à 5 coups","recherche à 6 coups, résout les 12 dernières","recherche à 8 coups, résout les 14 dernières","recherche à 9 coups, résout les 15 dernières","jusqu'à 10 coups, résout les 16 dernières","~1,5 s, résout les 18 dernières","~2,2 s, résout les 18 dernières","~3 s, résout les 19 dernières","~5 s, résout les 20 dernières"]],"pt":[["Iniciante I","Iniciante II","Iniciante III","Novato I","Novato II","Novato III","Intermediário I","Intermediário II","Intermediário III","Avançado I","Avançado II","Avançado III","Especialista I","Especialista II","Especialista III","Mestre I","Mestre II","Mestre III","Grão-mestre","Máximo"],["quase aleatório","muito errático, busca de 1 lances","errático, busca de 1 lances","busca de 1 lances, muitos erros","busca de 1 lances, comete erros","busca de 2 lances, muitos erros","busca de 2 lances, comete erros","busca de 2 lances, alguns erros","busca de 3 lances, alguns erros","busca de 4 lances, comete erros","busca de 4 lances","busca de 5 lances","busca de 6 lances, resolve as últimas 12","busca de 8 lances, resolve as últimas 14","busca de 9 lances, resolve as últimas 15","até 10 lances, resolve as últimas 16","~1,5 s, resolve as últimas 18","~2,2 s, resolve as últimas 18","~3 s, resolve as últimas 19","~5 s, resolve as últimas 20"]],"de":[["Einsteiger I","Einsteiger II","Einsteiger III","Anfänger I","Anfänger II","Anfänger III","Mittel I","Mittel II","Mittel III","Fortgeschritten I","Fortgeschritten II","Fortgeschritten III","Experte I","Experte II","Experte III","Meister I","Meister II","Meister III","Großmeister","Stärkste"],["fast zufällig","sehr launisch, 1 Züge tief","launisch, 1 Züge tief","1 Züge tief, viele Fehler","1 Züge tief, macht Fehler","2 Züge tief, viele Fehler","2 Züge tief, macht Fehler","2 Züge tief, gelegentliche Fehler","3 Züge tief, gelegentliche Fehler","4 Züge tief, macht Fehler","4 Züge tief","5 Züge tief","6 Züge tief, löst die letzten 12","8 Züge tief, löst die letzten 14","9 Züge tief, löst die letzten 15","bis 10 Züge, löst die letzten 16","~1,5 s, löst die letzten 18","~2,2 s, löst die letzten 18","~3 s, löst die letzten 19","~5 s, löst die letzten 20"]],"hi":[["शुरुआती I","शुरुआती II","शुरुआती III","नौसिखिया I","नौसिखिया II","नौसिखिया III","मध्यम I","मध्यम II","मध्यम III","उन्नत I","उन्नत II","उन्नत III","विशेषज्ञ I","विशेषज्ञ II","विशेषज्ञ III","मास्टर I","मास्टर II","मास्टर III","ग्रैंडमास्टर","सबसे मज़बूत"],["लगभग बेतरतीब","बहुत मनमौजी, 1 चाल खोज","मनमौजी, 1 चाल खोज","1 चाल खोज, बहुत गलतियाँ","1 चाल खोज, गलतियाँ करता है","2 चाल खोज, बहुत गलतियाँ","2 चाल खोज, गलतियाँ करता है","2 चाल खोज, कभी-कभी गलती","3 चाल खोज, कभी-कभी गलती","4 चाल खोज, गलतियाँ करता है","4 चाल खोज","5 चाल खोज","6 चाल खोज, आखिरी 12 हल करता है","8 चाल खोज, आखिरी 14 हल करता है","9 चाल खोज, आखिरी 15 हल करता है","10 चाल तक, आखिरी 16 हल करता है","~1.5 से., आखिरी 18 हल करता है","~2.2 से., आखिरी 18 हल करता है","~3 से., आखिरी 19 हल करता है","~5 से., आखिरी 20 हल करता है"]],"ar":[["مبتدئ I","مبتدئ II","مبتدئ III","مستجد I","مستجد II","مستجد III","متوسط I","متوسط II","متوسط III","متقدم I","متقدم II","متقدم III","خبير I","خبير II","خبير III","أستاذ I","أستاذ II","أستاذ III","أستاذ كبير","الأقوى"],["عشوائي تقريبًا","متقلب جدًا، بحث بعمق 1","متقلب، بحث بعمق 1","بحث بعمق 1، أخطاء كثيرة","بحث بعمق 1، يرتكب أخطاء","بحث بعمق 2، أخطاء كثيرة","بحث بعمق 2، يرتكب أخطاء","بحث بعمق 2، أخطاء أحيانًا","بحث بعمق 3، أخطاء أحيانًا","بحث بعمق 4، يرتكب أخطاء","بحث بعمق 4","بحث بعمق 5","بحث بعمق 6، يحل آخر 12","بحث بعمق 8، يحل آخر 14","بحث بعمق 9، يحل آخر 15","حتى عمق 10، يحل آخر 16","~1.5 ث، يحل آخر 18","~2.2 ث، يحل آخر 18","~3 ث، يحل آخر 19","~5 ث، يحل آخر 20"]], "ru": [['Начальный I', 'Начальный II', 'Начальный III', 'Новичок I', 'Новичок II', 'Новичок III', 'Средний I', 'Средний II', 'Средний III', 'Продвинутый I', 'Продвинутый II', 'Продвинутый III', 'Эксперт I', 'Эксперт II', 'Эксперт III', 'Мастер I', 'Мастер II', 'Мастер III', 'Гроссмейстер', 'Сильнейший'], ['почти случайно', 'очень неровно, поиск 1', 'неровно, поиск 1', 'поиск 1, много ошибок', 'поиск 1, ошибается', 'поиск 2, много ошибок', 'поиск 2, ошибается', 'поиск 2, иногда ошибается', 'поиск 3, иногда ошибается', 'поиск 4, ошибается', 'поиск 4', 'поиск 5', 'поиск 6, решает последние 12', 'поиск 8, решает последние 14', 'поиск 9, решает последние 15', 'до 10, решает последние 16', '~1,5 с, решает последние 18', '~2,2 с, решает последние 18', '~3 с, решает последние 19', '~5 с, решает последние 20']], "zh-TW": [['入門 I', '入門 II', '入門 III', '初級 I', '初級 II', '初級 III', '中級 I', '中級 II', '中級 III', '高級 I', '高級 II', '高級 III', '專家 I', '專家 II', '專家 III', '大師 I', '大師 II', '大師 III', '特級大師', '最強'], ['幾乎隨機', '非常不穩，1層搜尋', '不穩，1層搜尋', '1層搜尋，失誤很多', '1層搜尋，會失誤', '2層搜尋，失誤很多', '2層搜尋，會失誤', '2層搜尋，有些失誤', '3層搜尋，有些失誤', '4層搜尋，會失誤', '4層搜尋', '5層搜尋', '6層搜尋，最後12手完全計算', '8層搜尋，最後14手完全計算', '9層搜尋，最後15手完全計算', '最多10層，最後16手完全計算', '約1.5秒，最後18手完全計算', '約2.2秒，最後18手完全計算', '約3秒，最後19手完全計算', '約5秒，最後20手完全計算']], "id": [['Pemula I', 'Pemula II', 'Pemula III', 'Dasar I', 'Dasar II', 'Dasar III', 'Menengah I', 'Menengah II', 'Menengah III', 'Mahir I', 'Mahir II', 'Mahir III', 'Ahli I', 'Ahli II', 'Ahli III', 'Master I', 'Master II', 'Master III', 'Grandmaster', 'Terkuat'], ['hampir acak', 'sangat tak menentu, pencarian 1 lapis', 'tak menentu, pencarian 1 lapis', 'pencarian 1 lapis, banyak salah', 'pencarian 1 lapis, membuat salah', 'pencarian 2 lapis, banyak salah', 'pencarian 2 lapis, membuat salah', 'pencarian 2 lapis, sedikit salah', 'pencarian 3 lapis, sedikit salah', 'pencarian 4 lapis, membuat salah', 'pencarian 4 lapis', 'pencarian 5 lapis', 'pencarian 6 lapis, memecahkan 12 terakhir', 'pencarian 8 lapis, memecahkan 14 terakhir', 'pencarian 9 lapis, memecahkan 15 terakhir', 'hingga 10 lapis, memecahkan 16 terakhir', '~1,5 dtk, memecahkan 18 terakhir', '~2,2 dtk, memecahkan 18 terakhir', '~3 dtk, memecahkan 19 terakhir', '~5 dtk, memecahkan 20 terakhir']], "tr": [['Başlangıç I', 'Başlangıç II', 'Başlangıç III', 'Acemi I', 'Acemi II', 'Acemi III', 'Orta I', 'Orta II', 'Orta III', 'İleri I', 'İleri II', 'İleri III', 'Uzman I', 'Uzman II', 'Uzman III', 'Usta I', 'Usta II', 'Usta III', 'Büyük usta', 'En güçlü'], ['neredeyse rastgele', 'çok dengesiz, 1 katman arama', 'dengesiz, 1 katman arama', '1 katman arama, çok hata', '1 katman arama, hata yapar', '2 katman arama, çok hata', '2 katman arama, hata yapar', '2 katman arama, bazı hatalar', '3 katman arama, bazı hatalar', '4 katman arama, hata yapar', '4 katman arama', '5 katman arama', '6 katman arama, son 12\'yi çözer', '8 katman arama, son 14\'ü çözer', '9 katman arama, son 15\'i çözer', '10 katmana kadar, son 16\'yı çözer', '~1,5 sn, son 18\'i çözer', '~2,2 sn, son 18\'i çözer', '~3 sn, son 19\'u çözer', '~5 sn, son 20\'yi çözer']]};
  const RATING = [0, 10, 50, 110, 170, 240, 340, 430, 550, 680, 780, 930, 1090, 1290, 1440, 1530, 1590, 1630, 1690, 1780, 1810, 1833, 1852, 1871, 1886, 1902];   // same ladder as reversi rated games (RT_LV)
  const WHO = {
    ja: ["はじめての人に", "はじめての人に", "はじめての人に", "ルールを覚えた人に", "ルールを覚えた人に", "ルールを覚えた人に", "慣れてきた人に", "慣れてきた人に", "慣れてきた人に", "強い人に", "強い人に", "強い人に", "上級者でも手ごわい", "上級者でも手ごわい", "上級者でも手ごわい", "上級者でも手ごわい", "上級者でも手ごわい", "上級者でも手ごわい", "上級者でも手ごわい", "最強レベル"],
    en: ["for first-timers", "for first-timers", "for first-timers", "once you know the rules", "once you know the rules", "once you know the rules", "getting the hang of it", "getting the hang of it", "getting the hang of it", "for strong players", "for strong players", "for strong players", "tough even for experts", "tough even for experts", "tough even for experts", "tough even for experts", "tough even for experts", "tough even for experts", "tough even for experts", "the very strongest"],
    zh: ["适合初次玩", "适合初次玩", "适合初次玩", "适合刚学会规则", "适合刚学会规则", "适合刚学会规则", "适合渐渐上手", "适合渐渐上手", "适合渐渐上手", "适合高手", "适合高手", "适合高手", "高手也觉得难缠", "高手也觉得难缠", "高手也觉得难缠", "高手也觉得难缠", "高手也觉得难缠", "高手也觉得难缠", "高手也觉得难缠", "最强等级"],
    ko: ["처음 하는 사람에게", "처음 하는 사람에게", "처음 하는 사람에게", "규칙을 익힌 사람에게", "규칙을 익힌 사람에게", "규칙을 익힌 사람에게", "익숙해진 사람에게", "익숙해진 사람에게", "익숙해진 사람에게", "강한 사람에게", "강한 사람에게", "강한 사람에게", "고수도 버거운", "고수도 버거운", "고수도 버거운", "고수도 버거운", "고수도 버거운", "고수도 버거운", "고수도 버거운", "최강 레벨"],
    es: ["para principiantes", "para principiantes", "para principiantes", "si ya sabes las reglas", "si ya sabes las reglas", "si ya sabes las reglas", "si ya le vas pillando el truco", "si ya le vas pillando el truco", "si ya le vas pillando el truco", "para jugadores fuertes", "para jugadores fuertes", "para jugadores fuertes", "difícil incluso para expertos", "difícil incluso para expertos", "difícil incluso para expertos", "difícil incluso para expertos", "difícil incluso para expertos", "difícil incluso para expertos", "difícil incluso para expertos", "el más fuerte"],
    fr: ["pour débuter", "pour débuter", "pour débuter", "si tu connais les règles", "si tu connais les règles", "si tu connais les règles", "si tu prends le coup de main", "si tu prends le coup de main", "si tu prends le coup de main", "pour les bons joueurs", "pour les bons joueurs", "pour les bons joueurs", "coriace même pour les experts", "coriace même pour les experts", "coriace même pour les experts", "coriace même pour les experts", "coriace même pour les experts", "coriace même pour les experts", "coriace même pour les experts", "le plus fort"],
    pt: ["para iniciantes", "para iniciantes", "para iniciantes", "para quem já sabe as regras", "para quem já sabe as regras", "para quem já sabe as regras", "para quem está pegando o jeito", "para quem está pegando o jeito", "para quem está pegando o jeito", "para jogadores fortes", "para jogadores fortes", "para jogadores fortes", "difícil até para experts", "difícil até para experts", "difícil até para experts", "difícil até para experts", "difícil até para experts", "difícil até para experts", "difícil até para experts", "o mais forte"],
    de: ["für Einsteiger", "für Einsteiger", "für Einsteiger", "wenn du die Regeln kennst", "wenn du die Regeln kennst", "wenn du die Regeln kennst", "wenn du den Dreh raus hast", "wenn du den Dreh raus hast", "wenn du den Dreh raus hast", "für starke Spieler", "für starke Spieler", "für starke Spieler", "selbst für Profis knifflig", "selbst für Profis knifflig", "selbst für Profis knifflig", "selbst für Profis knifflig", "selbst für Profis knifflig", "selbst für Profis knifflig", "selbst für Profis knifflig", "die stärkste Stufe"],
    hi: ["पहली बार खेलने वालों के लिए", "पहली बार खेलने वालों के लिए", "पहली बार खेलने वालों के लिए", "नियम सीख चुके लोगों के लिए", "नियम सीख चुके लोगों के लिए", "नियम सीख चुके लोगों के लिए", "जिन्हें आदत हो रही है उनके लिए", "जिन्हें आदत हो रही है उनके लिए", "जिन्हें आदत हो रही है उनके लिए", "मज़बूत खिलाड़ियों के लिए", "मज़बूत खिलाड़ियों के लिए", "मज़बूत खिलाड़ियों के लिए", "विशेषज्ञों के लिए भी कठिन", "विशेषज्ञों के लिए भी कठिन", "विशेषज्ञों के लिए भी कठिन", "विशेषज्ञों के लिए भी कठिन", "विशेषज्ञों के लिए भी कठिन", "विशेषज्ञों के लिए भी कठिन", "विशेषज्ञों के लिए भी कठिन", "सबसे मज़बूत स्तर"],
    ar: ["لمن يلعب أول مرة", "لمن يلعب أول مرة", "لمن يلعب أول مرة", "لمن تعلّم القواعد", "لمن تعلّم القواعد", "لمن تعلّم القواعد", "لمن بدأ يعتاد اللعب", "لمن بدأ يعتاد اللعب", "لمن بدأ يعتاد اللعب", "للاعبين الأقوياء", "للاعبين الأقوياء", "للاعبين الأقوياء", "صعب حتى على الخبراء", "صعب حتى على الخبراء", "صعب حتى على الخبراء", "صعب حتى على الخبراء", "صعب حتى على الخبراء", "صعب حتى على الخبراء", "صعب حتى على الخبراء", "أقوى مستوى"],
    ru: ['для первой игры', 'для первой игры', 'для первой игры', 'когда знаете правила', 'когда знаете правила', 'когда знаете правила', 'когда освоились', 'когда освоились', 'когда освоились', 'для сильных игроков', 'для сильных игроков', 'для сильных игроков', 'трудно даже экспертам', 'трудно даже экспертам', 'трудно даже экспертам', 'трудно даже экспертам', 'трудно даже экспертам', 'трудно даже экспертам', 'трудно даже экспертам', 'самый сильный'],
    'zh-TW': ['給第一次玩的人', '給第一次玩的人', '給第一次玩的人', '懂規則之後', '懂規則之後', '懂規則之後', '漸漸上手時', '漸漸上手時', '漸漸上手時', '給高手', '給高手', '給高手', '連專家都覺得難', '連專家都覺得難', '連專家都覺得難', '連專家都覺得難', '連專家都覺得難', '連專家都覺得難', '連專家都覺得難', '最強'],
    id: ['untuk pemula', 'untuk pemula', 'untuk pemula', 'setelah tahu aturannya', 'setelah tahu aturannya', 'setelah tahu aturannya', 'mulai terbiasa', 'mulai terbiasa', 'mulai terbiasa', 'untuk pemain kuat', 'untuk pemain kuat', 'untuk pemain kuat', 'sulit bahkan bagi ahli', 'sulit bahkan bagi ahli', 'sulit bahkan bagi ahli', 'sulit bahkan bagi ahli', 'sulit bahkan bagi ahli', 'sulit bahkan bagi ahli', 'sulit bahkan bagi ahli', 'yang terkuat'],
    tr: ['ilk kez oynayanlar için', 'ilk kez oynayanlar için', 'ilk kez oynayanlar için', 'kuralları bilince', 'kuralları bilince', 'kuralları bilince', 'alışmaya başlayınca', 'alışmaya başlayınca', 'alışmaya başlayınca', 'güçlü oyuncular için', 'güçlü oyuncular için', 'güçlü oyuncular için', 'uzmanlar için bile zor', 'uzmanlar için bile zor', 'uzmanlar için bile zor', 'uzmanlar için bile zor', 'uzmanlar için bile zor', 'uzmanlar için bile zor', 'uzmanlar için bile zor', 'en güçlüsü'],
  };
  { // 2026-11-08: Lv.21–25 above the old top (reversi/i18n.js): Lv.20 renamed, five more names / descriptions / hints
    const X = {"ja": [["伝説Ⅰ", "伝説Ⅱ", "伝説Ⅲ", "神域Ⅰ", "神域Ⅱ", "最強"], ["約6秒・終盤21マス", "約8秒・終盤22マス", "約11秒・終盤22マス", "約14秒・終盤23マス", "約18秒・終盤23マス"]], "en": [["Legend I", "Legend II", "Legend III", "Mythic I", "Mythic II", "Strongest"], ["~6 s, solves last 21", "~8 s, solves last 22", "~11 s, solves last 22", "~14 s, solves last 23", "~18 s, solves last 23"]], "zh": [["传说Ⅰ", "传说Ⅱ", "传说Ⅲ", "神域Ⅰ", "神域Ⅱ", "最强"], ["约6秒・残局21格", "约8秒・残局22格", "约11秒・残局22格", "约14秒・残局23格", "约18秒・残局23格"]], "zh-TW": [["傳說Ⅰ", "傳說Ⅱ", "傳說Ⅲ", "神域Ⅰ", "神域Ⅱ", "最強"], ["約6秒・殘局21格", "約8秒・殘局22格", "約11秒・殘局22格", "約14秒・殘局23格", "約18秒・殘局23格"]], "ko": [["전설 I", "전설 II", "전설 III", "신화 I", "신화 II", "최강"], ["약 6초・종반 21칸", "약 8초・종반 22칸", "약 11초・종반 22칸", "약 14초・종반 23칸", "약 18초・종반 23칸"]], "es": [["Leyenda I", "Leyenda II", "Leyenda III", "Mítico I", "Mítico II", "Máximo"], ["~6 s, resuelve las últimas 21", "~8 s, resuelve las últimas 22", "~11 s, resuelve las últimas 22", "~14 s, resuelve las últimas 23", "~18 s, resuelve las últimas 23"]], "fr": [["Légende I", "Légende II", "Légende III", "Mythique I", "Mythique II", "Maximum"], ["~6 s, résout les 21 dernières", "~8 s, résout les 22 dernières", "~11 s, résout les 22 dernières", "~14 s, résout les 23 dernières", "~18 s, résout les 23 dernières"]], "pt": [["Lenda I", "Lenda II", "Lenda III", "Mítico I", "Mítico II", "Máximo"], ["~6 s, resolve as últimas 21", "~8 s, resolve as últimas 22", "~11 s, resolve as últimas 22", "~14 s, resolve as últimas 23", "~18 s, resolve as últimas 23"]], "de": [["Legende I", "Legende II", "Legende III", "Mythisch I", "Mythisch II", "Stärkste"], ["~6 s, löst die letzten 21", "~8 s, löst die letzten 22", "~11 s, löst die letzten 22", "~14 s, löst die letzten 23", "~18 s, löst die letzten 23"]], "hi": [["किंवदंती I", "किंवदंती II", "किंवदंती III", "मिथक I", "मिथक II", "सबसे मज़बूत"], ["~6 से., आखिरी 21 हल करता है", "~8 से., आखिरी 22 हल करता है", "~11 से., आखिरी 22 हल करता है", "~14 से., आखिरी 23 हल करता है", "~18 से., आखिरी 23 हल करता है"]], "ar": [["أسطورة I", "أسطورة II", "أسطورة III", "خرافي I", "خرافي II", "الأقوى"], ["~6 ث، يحل آخر 21", "~8 ث، يحل آخر 22", "~11 ث، يحل آخر 22", "~14 ث، يحل آخر 23", "~18 ث، يحل آخر 23"]], "ru": [["Легенда I", "Легенда II", "Легенда III", "Миф I", "Миф II", "Сильнейший"], ["~6 с, решает последние 21", "~8 с, решает последние 22", "~11 с, решает последние 22", "~14 с, решает последние 23", "~18 с, решает последние 23"]], "tr": [["Efsane I", "Efsane II", "Efsane III", "Mitik I", "Mitik II", "En güçlü"], ["~6 sn, son 21'i çözer", "~8 sn, son 22'yi çözer", "~11 sn, son 22'yi çözer", "~14 sn, son 23'ü çözer", "~18 sn, son 23'ü çözer"]], "id": [["Legenda I", "Legenda II", "Legenda III", "Mitos I", "Mitos II", "Terkuat"], ["~6 dtk, pecahkan 21 terakhir", "~8 dtk, pecahkan 22 terakhir", "~11 dtk, pecahkan 22 terakhir", "~14 dtk, pecahkan 23 terakhir", "~18 dtk, pecahkan 23 terakhir"]]}, WX = {"ja": ["トップ級の強さ", "トップ級の強さ", "トップ級の強さ", "トップ級の強さ", "トップ級の強さ", "最強レベル"], "en": ["top-class strength", "top-class strength", "top-class strength", "top-class strength", "top-class strength", "the very strongest"], "zh": ["顶尖水平", "顶尖水平", "顶尖水平", "顶尖水平", "顶尖水平", "最强等级"], "zh-TW": ["頂尖水準", "頂尖水準", "頂尖水準", "頂尖水準", "頂尖水準", "最強"], "ko": ["최상위 실력", "최상위 실력", "최상위 실력", "최상위 실력", "최상위 실력", "최강 레벨"], "es": ["nivel de élite", "nivel de élite", "nivel de élite", "nivel de élite", "nivel de élite", "el más fuerte"], "fr": ["niveau élite", "niveau élite", "niveau élite", "niveau élite", "niveau élite", "le plus fort"], "pt": ["nível de elite", "nível de elite", "nível de elite", "nível de elite", "nível de elite", "o mais forte"], "de": ["Spitzenklasse", "Spitzenklasse", "Spitzenklasse", "Spitzenklasse", "Spitzenklasse", "die stärkste Stufe"], "hi": ["शीर्ष स्तर", "शीर्ष स्तर", "शीर्ष स्तर", "शीर्ष स्तर", "शीर्ष स्तर", "सबसे मज़बूत स्तर"], "ar": ["مستوى النخبة", "مستوى النخبة", "مستوى النخبة", "مستوى النخبة", "مستوى النخبة", "أقوى مستوى"], "ru": ["элитный уровень", "элитный уровень", "элитный уровень", "элитный уровень", "элитный уровень", "самый сильный"], "tr": ["elit seviye", "elit seviye", "elit seviye", "elit seviye", "elit seviye", "en güçlüsü"], "id": ["kelas atas", "kelas atas", "kelas atas", "kelas atas", "kelas atas", "yang terkuat"]};
    for (const l in LVN) { const x = X[l] || X.en; LVN[l][0].splice(19, 1, ...x[0]); LVN[l][1].push(...x[1]); }
    for (const l in WHO) { WHO[l].splice(19, 1, ...(WX[l] || WX.en)); }
  }
  function levelInfo(n, lang) {
    const L = LVN[lang] || LVN.en, W = WHO[lang] || WHO.en;
    return { name: L[0][n - 1], desc: L[1][n - 1], rating: RATING[n], who: W[n - 1] };
  }
  window.Atlas3D.reversi = { levels: 25, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'byo', start, levelInfo };   // table: start() plays on the chabudai itself
})();
