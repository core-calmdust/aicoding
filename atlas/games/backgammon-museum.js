/* =====================================================================
   バックギャモン — on a museum board (所蔵品で遊ぶ, 2026-11-23: the Ottoman chess / backgammon board, atlas/museum/play.js).
   The same rules (backgammon/bg.js) and AI (backgammon/engine.js, the game's worker, levels 1–10) as the portal's backgammon; no doubling cube, one game.
   The board comes in as ctx.board, its userData (as the Shōsōin sugoroku board's, plus off):
     top · slot(abs, k) → [x, y, z] · bar(side, k) · off(side, k) · hit(x, z) → abs 1–24 | 0 (the bar) | 25 (borne off) | -1
     · stone(side) → Mesh · die() → Mesh · diceAt(side, i) → [x, z]
   Side 0 (you, the near side, light) moves 24 → 1 into the near right table; side 1 (the AI, dark) the other way. Registered as Atlas3D.backgammon.museum.
   ===================================================================== */
(function () {
  'use strict';
  const TX = {
    ja: { n: ['白', '黒'], roll: '振る', pick: '光る駒をタップ', dest: '行き先をタップ', noMove: '動かせる駒がありません', aiNoMove: 'AI：動かせる駒なし', hit: 'ヒット！', hitMe: 'ヒットされた…', enter: 'バーの駒を先に戻します', first: '先手：{p}', win: '{p}の勝ち！', off: 'ゴール' },
    en: { n: ['White', 'Black'], roll: 'Roll', pick: 'Tap a glowing checker', dest: 'Tap where to go', noMove: 'No checker can move', aiNoMove: 'AI: no move', hit: 'Hit!', hitMe: 'You were hit…', enter: 'Bring the checker in from the bar first', first: 'First: {p}', win: '{p} wins!', off: 'Off' },
    zh: { n: ['白', '黑'], roll: '掷骰', pick: '点击发光的棋子', dest: '点击目的地', noMove: '没有可走的棋子', aiNoMove: 'AI：无子可走', hit: '打中！', hitMe: '被打了…', enter: '先把中栏的棋子放回', first: '先手：{p}', win: '{p}获胜！', off: '离盘' },
    'zh-TW': { n: ['白', '黑'], roll: '擲骰', pick: '點擊發光的棋子', dest: '點擊目的地', noMove: '沒有可走的棋子', aiNoMove: 'AI：無子可走', hit: '打中！', hitMe: '被打了…', enter: '先把中欄的棋子放回', first: '先手：{p}', win: '{p}獲勝！', off: '離盤' },
    ko: { n: ['백', '흑'], roll: '굴리기', pick: '빛나는 말을 탭', dest: '갈 곳을 탭', noMove: '움직일 말이 없어요', aiNoMove: 'AI: 움직일 수 없음', hit: '히트!', hitMe: '히트당했다…', enter: '바의 말을 먼저 넣어요', first: '선: {p}', win: '{p} 승리!', off: '골' },
    es: { n: ['Blancas', 'Negras'], roll: 'Tirar', pick: 'Toca una ficha brillante', dest: 'Toca el destino', noMove: 'Ninguna ficha puede moverse', aiNoMove: 'IA: sin jugada', hit: '¡Golpe!', hitMe: 'Te han golpeado…', enter: 'Primero entra la ficha de la barra', first: 'Empieza: {p}', win: '¡Ganan {p}!', off: 'Fuera' },
    fr: { n: ['Blancs', 'Noirs'], roll: 'Lancer', pick: 'Touchez un pion lumineux', dest: 'Touchez la destination', noMove: 'Aucun pion ne peut bouger', aiNoMove: 'IA : aucun coup', hit: 'Frappé !', hitMe: 'Frappé…', enter: 'Rentrez d’abord le pion de la barre', first: 'Commence : {p}', win: '{p} gagnent !', off: 'Sorti' },
    pt: { n: ['Brancas', 'Pretas'], roll: 'Lançar', pick: 'Toque numa peça brilhante', dest: 'Toque no destino', noMove: 'Nenhuma peça pode mover', aiNoMove: 'IA: sem jogada', hit: 'Acertou!', hitMe: 'Foi atingido…', enter: 'Primeiro entre com a peça da barra', first: 'Começa: {p}', win: '{p} vencem!', off: 'Fora' },
    de: { n: ['Weiß', 'Schwarz'], roll: 'Würfeln', pick: 'Leuchtenden Stein antippen', dest: 'Ziel antippen', noMove: 'Kein Stein kann ziehen', aiNoMove: 'KI: kein Zug', hit: 'Geschlagen!', hitMe: 'Geschlagen …', enter: 'Erst den Stein von der Bar einsetzen', first: 'Beginn: {p}', win: '{p} gewinnt!', off: 'Aus' },
    ru: { n: ['Белые', 'Чёрные'], roll: 'Бросить', pick: 'Коснитесь светящейся шашки', dest: 'Коснитесь цели', noMove: 'Ходов нет', aiNoMove: 'ИИ: ходов нет', hit: 'Побита!', hitMe: 'Вашу шашку побили…', enter: 'Сначала введите шашку с бара', first: 'Первыми: {p}', win: 'Победили {p}!', off: 'Снято' },
    tr: { n: ['Beyaz', 'Siyah'], roll: 'At', pick: 'Parlayan pula dokun', dest: 'Gideceği yere dokun', noMove: 'Oynayacak pul yok', aiNoMove: 'YZ: hamle yok', hit: 'Kırıldı!', hitMe: 'Pulun kırıldı…', enter: 'Önce kırık pulu sok', first: 'Başlayan: {p}', win: '{p} kazandı!', off: 'Toplandı' },
    id: { n: ['Putih', 'Hitam'], roll: 'Lempar', pick: 'Ketuk bidak yang menyala', dest: 'Ketuk tujuan', noMove: 'Tak ada bidak yang bisa jalan', aiNoMove: 'AI: tak ada langkah', hit: 'Kena!', hitMe: 'Bidakmu kena…', enter: 'Masukkan dulu bidak dari bar', first: 'Mulai: {p}', win: '{p} menang!', off: 'Keluar' },
    hi: { n: ['सफ़ेद', 'काला'], roll: 'फेंकें', pick: 'चमकती गोटी छुएँ', dest: 'जगह छुएँ', noMove: 'कोई गोटी नहीं चल सकती', aiNoMove: 'AI: चाल नहीं', hit: 'हिट!', hitMe: 'गोटी हिट हुई…', enter: 'पहले बार की गोटी अंदर लाएँ', first: 'पहले: {p}', win: '{p} जीता!', off: 'बाहर' },
    ar: { n: ['الأبيض', 'الأسود'], roll: 'ارمِ', pick: 'المس حجرًا مضيئًا', dest: 'المس الوجهة', noMove: 'لا حجر يتحرك', aiNoMove: 'الذكاء: لا حركة', hit: 'ضربة!', hitMe: 'ضُرب حجرك…', enter: 'أدخل حجر البار أولًا', first: 'يبدأ: {p}', win: 'فاز {p}!', off: 'خارج' },
  };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const DIE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  // sounds (the portal's sound switch): glass on wood, the dice in the cup
  const SND = (() => { let C = null;
    const ac = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {} try { C = C || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    const tone = (a, t, f0, f1, d, v, ty) => { const o = a.createOscillator(), g = a.createGain(); o.type = ty || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02); };
    const noise = (a, t, d, v, f) => { const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * d | 0, a.sampleRate), x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 2); n.buffer = b; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; const g = a.createGain(); g.gain.value = v; n.connect(bp).connect(g).connect(a.destination); n.start(t); };
    const at = f => { const a = ac(); if (a) try { f(a, a.currentTime + .005); } catch (e) {} };
    return { put: () => at((a, t) => { tone(a, t, 1800, 900, .07, .05, 'triangle'); noise(a, t, .03, .25, 2600); }), cut: () => at((a, t) => { tone(a, t, 520, 200, .25, .1); noise(a, t, .06, .3, 1500); }),
      roll: () => at((a, t) => { for (let i = 0; i < 6; i++) noise(a, t + i * .055 + Math.random() * .02, .04, .25, 1500 + Math.random() * 900); }), win: () => at((a, t) => [523.25, 659.25, 783.99].forEach((f, i) => tone(a, t + i * .08, f, 0, .45, .07, 'triangle'))) };
  })();


  let bgLoad = null;
  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, B = ctx.board, U = B && B.userData, FI = (window.Atlas3D.backgammon && Atlas3D.backgammon.files) || { BASE: '../backgammon/', BV: '1' };
    if (!U || !U.slot || !U.off) { console.warn('[backgammon-museum] needs the museum board'); return null; }
    const X = Object.assign({}, TX.en, TX[ctx.lang] || {}), L = { you: t('p.you'), ai: t('p.ai'), think: t('p.think'), win: t('res.win'), lose: t('res.lose') };
    const level = Math.max(1, Math.min(10, +ctx.level || 3)), pvp = ctx.mode === 'pvp', first = pvp ? 0 : ctx.side === 2 ? 1 : 0;
    const hum = s => pvp || s === 0, nm = s => pvp ? X.n[s] : s ? L.ai : L.you;
    let BG = null, pos = null, turn = first, T = null, dice = null, phase = 'wait', over = false, stopped = false, busy = false, sel = null, msg = '', hintM = null, ply = 0, worker = null, jid = 0;
    const jobs = new Map();
    T3.show('backgammon', B);
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms)), sleep = ms => new Promise(r => later(r, ms));
    const anim = (dur, f) => new Promise(res => { const t0 = performance.now(); (function s(n) { if (stopped) return res(); const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(150); if (k < 1) requestAnimationFrame(s); else res(); })(t0); });
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    // a side's own point (24 → 1, 25 = the bar, 0 = off) ↔ the board's (1–24 as side 0 counts, 0 = the bar, 25 = off)
    const abs = (s, i) => i === 25 ? 0 : i === 0 ? 25 : s ? 25 - i : i;

    /* ---------- checkers ---------- */
    const G = new TH.Group(); B.add(G);
    const stacks = Array.from({ length: 25 }, () => []), bars = [[], []], offs = [[], []];
    function sync(p) {
      const pool = [[], []]; [...stacks, ...bars, ...offs].forEach(a => { a.forEach(m => pool[m.userData.side].push(m)); a.length = 0; });
      const take = side => pool[side].pop() || (() => { const o = U.stone(side); o.userData.side = side; G.add(o); return o; })();
      for (const s of [0, 1]) { const m = s * 26;
        for (let i = 1; i <= 24; i++) for (let k = 0; k < p[m + i]; k++) { const a = abs(s, i), o = take(s); o.position.set(...U.slot(a, stacks[a].length)); stacks[a].push(o); }
        for (let k = 0; k < p[m + 25]; k++) { const o = take(s); o.position.set(...U.bar(s, k)); bars[s].push(o); }
        for (let k = 0; k < p[m]; k++) { const o = take(s); o.position.set(...U.off(s, k)); offs[s].push(o); } }
      pool.forEach(a => a.forEach(m => G.remove(m))); T3.kick(300);
    }
    async function moveStone(side, f, to, hit) {   // f, to: the side's own points
      const src = f === 25 ? bars[side] : stacks[abs(side, f)], o = src.pop(); if (!o) return;
      const dst = to === 0 ? offs[side] : stacks[abs(side, to)]; let vic = null; if (hit) vic = dst.pop();
      const a = o.position.clone(), b = new TH.Vector3(...(to === 0 ? U.off(side, dst.length) : U.slot(abs(side, to), dst.length))), H = 3;
      await anim(Math.min(600, 260 + a.distanceTo(b) * 8), k => { const e = io(k); o.position.set(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e + Math.sin(k * Math.PI) * H, a.z + (b.z - a.z) * e); });
      dst.push(o); SND.put();
      if (vic) { SND.cut(); const p0 = vic.position.clone(), p1 = new TH.Vector3(...U.bar(1 - side, bars[1 - side].length)); bars[1 - side].push(vic);
        await anim(480, k => { const e = io(k); vic.position.set(p0.x + (p1.x - p0.x) * e, p0.y + (p1.y - p0.y) * e + Math.sin(k * Math.PI) * 4, p0.z + (p1.z - p0.z) * e); }); }
    }

    /* ---------- dice ---------- */
    const D = [U.die(), U.die()]; D.forEach(d => { d.visible = false; G.add(d); });
    const UP = { 1: [0, 0, Math.PI / 2], 2: [0, 0, 0], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0], 5: [Math.PI, 0, 0], 6: [0, 0, -Math.PI / 2] };   // (+x 1 / −x 6, +y 2 / −y 5, +z 3 / −z 4)
    async function throwDice(side, v) {
      SND.roll(); const sg = side ? -1 : 1, plan = D.map((d, i) => { const [x, z] = U.diceAt(side, i), yaw = (Math.random() - .5) * 1.2; d.visible = true;
        return { d, x, z, x0: x + (Math.random() - .5) * 4, z0: z + sg * (6 + Math.random() * 2), r0: [Math.random() * 9, Math.random() * 9, Math.random() * 9], r1: UP[v[i]], yaw }; });
      const y = U.top + (U.dieH || .65);
      await anim(820, k => { plan.forEach((p, i) => { const q = Math.min(1, Math.max(0, k * 1.1 - i * .08)), e = 1 - Math.pow(1 - q, 2.6), hop = q < .65 ? Math.sin(q / .65 * Math.PI) * 4 : Math.abs(Math.sin((q - .65) / .35 * Math.PI)) * .7 * (1 - q);
        p.d.position.set(p.x0 + (p.x - p.x0) * e, y + hop, p.z0 + (p.z - p.z0) * e);
        const f = 1 - e; p.d.rotation.set(p.r1[0] + p.r0[0] * f, p.yaw * e + p.r0[1] * f, p.r1[2] + p.r0[2] * f); }); });
      plan.forEach(p => { p.d.position.set(p.x, y, p.z); p.d.quaternion.copy(new TH.Quaternion().setFromAxisAngle(new TH.Vector3(0, 1, 0), p.yaw).multiply(new TH.Quaternion().setFromEuler(new TH.Euler(p.r1[0], 0, p.r1[2])))); });
      T3.kick(200);
    }
    const rollDice = () => [1 + (Math.random() * 6 | 0), 1 + (Math.random() * 6 | 0)];

    /* ---------- marks ---------- */
    const MG = new TH.Group(); B.add(MG);
    const basic = (c, op) => new TH.MeshBasicMaterial({ color: c, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const RR = U.R || 1.7, RING = new TH.TorusGeometry(RR * 1.08, RR * .08, 8, 40); RING.rotateX(Math.PI / 2);
    const DISC = new TH.CircleGeometry(RR * .8, 32); DISC.rotateX(-Math.PI / 2);
    const MAT = { can: basic(0xffd65a, .95), sel: basic(0x3df59a, .95), dest: basic(0x3df59a, .6), hit: basic(0xff5d5d, .65) };
    const clearMarks = () => { while (MG.children.length) MG.remove(MG.children[0]); T3.kick(120); };
    const arr = (side, a) => a === 0 ? bars[side] : a === 25 ? offs[side] : stacks[a];
    const options = () => !T ? [] : BG.legalSteps(T.pos, T.side, T.left, T.dice, T.steps.length).map(o => ({ f: o.from, t: o.to, die: o.die, from: abs(T.side, o.from), to: abs(T.side, o.to), hit: o.to > 0 && T.pos[(1 - T.side) * 26 + 25 - o.to] === 1 }));
    function ring(a, mat) { const s = arr(T.side, a); if (!s.length) return; const p = s[s.length - 1].position, m = new TH.Mesh(RING, mat); m.position.set(p.x, p.y + (U.th || .8) + .05, p.z); m.renderOrder = 3; MG.add(m); }
    function disc(o) { const s = arr(T.side, o.to), k = o.hit ? 0 : s.length, [x, y, z] = o.to === 25 ? U.off(T.side, k) : U.slot(o.to, k), m = new TH.Mesh(DISC, o.hit ? MAT.hit : MAT.dest); m.position.set(x, y + (o.hit ? (U.th || .8) : 0) + .06, z); m.renderOrder = 2; MG.add(m); }
    function showMarks() {
      clearMarks(); if (phase !== 'move' || !T || !hum(T.side)) return;
      const ops = options(); [...new Set(ops.map(o => o.from))].forEach(f => ring(f, f === sel ? MAT.sel : MAT.can));
      if (sel != null) { const seen = new Set(); ops.filter(o => o.from === sel && !seen.has(o.to) && seen.add(o.to)).forEach(disc); }
      if (hintM) { ring(hintM.from, MAT.can); disc(hintM); }
      const tick = () => { if (stopped || !MG.children.length) return; const k = .5 + .5 * Math.sin(performance.now() / 260); MG.children.forEach(m => { if (m.geometry === RING) m.scale.setScalar(.92 + k * .14); }); T3.kick(60); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }

    /* ---------- HUD ---------- */
    const DOT = ['background:radial-gradient(circle at 35% 30%,#fffaf0,#d9c9a0 60%,#8a7648)', 'background:radial-gradient(circle at 35% 30%,#6a4a34,#24140c 60%,#0c0604)'];
    function hud() {
      if (stopped || !pos) return; const P = T ? T.pos : pos;
      const side = s => `<span class="hs ${turn === s && !over ? 'on' : ''}"><i class="dk" style="${DOT[s]}"></i>${esc(nm(s))}<b>${P[s * 26]}/15</b></span>`;
      const left = T ? T.left.slice() : null;
      const dv = dice ? `<span class="hd" style="font-size:22px;letter-spacing:2px;white-space:nowrap">${(dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice).map(v => { let on = !left; if (left) { const i = left.indexOf(v); if (i >= 0) { left.splice(i, 1); on = true; } } return `<span style="opacity:${on ? 1 : .3}">${DIE[v]}</span>`; }).join('')}</span>` : '';
      const mid = phase === 'roll' && hum(turn) && !over ? `<button type="button" data-bgm="roll">${esc(X.roll)}</button>` : msg ? `<span class="hm">${esc(msg)}</span>` : '';
      ctx.hud(`${side(0)}${dv}${mid}${side(1)}`);
    }
    const say = m => { msg = m || ''; hud(); };
    let toastEl = null, toastT = 0;
    function toast(m) { if (toastEl) toastEl.remove(); clearTimeout(toastT); toastEl = document.createElement('div'); toastEl.className = 'urtoast'; toastEl.textContent = m; document.body.appendChild(toastEl); const el = toastEl; toastT = setTimeout(() => el.remove(), 1600); }

    /* ---------- the AI (the game's own worker) ---------- */
    function ask(m) {
      if (!worker) { try { worker = new Worker(FI.BASE + 'engine.js?v=' + FI.BV); } catch (e) { worker = null; }
        if (worker) { worker.onmessage = e => { const j = jobs.get(e.data.id); if (j) { jobs.delete(e.data.id); j(e.data); } }; worker.onerror = () => { jobs.forEach(j => j({})); jobs.clear(); }; } }
      if (!worker) return Promise.resolve({});
      return new Promise(r => { const id = ++jid; jobs.set(id, r); worker.postMessage(Object.assign({}, m, { id })); setTimeout(() => { if (jobs.has(id)) { jobs.delete(id); r({}); } }, 20000); });
    }

    /* ---------- the flow ---------- */
    function nextTurn(s) {
      if (stopped || over) return; turn = s; dice = null; T = null; sel = null; hintM = null; clearMarks();
      ply++; if (ctx.onTurn) ctx.onTurn(turn, { human: hum(turn), ply });
      if (!hum(turn)) { phase = 'ai'; say(L.think); later(aiTurn, 500); return; }
      phase = 'roll'; say('');
    }
    const guide = () => { const ops = options(), fr = [...new Set(ops.map(o => o.from))]; sel = fr.length === 1 ? fr[0] : null; say(T.pos[T.side * 26 + 25] ? X.enter : sel != null ? X.dest : X.pick); showMarks(); };
    async function doRoll() {
      if (phase !== 'roll' || busy || over || !hum(turn)) return;
      busy = true; phase = 'anim'; say(''); const d = rollDice(); await throwDice(turn, d); if (stopped) return; busy = false; dice = d;
      const plays = BG.genPlays(pos, turn, d[0], d[1]);
      if (plays.length === 1 && !plays[0].moves.length) { say(X.noMove); toast(X.noMove); const s = turn; later(() => nextTurn(1 - s), 1400); return; }
      T = { side: turn, dice: d, left: d[0] === d[1] ? [d[0], d[0], d[0], d[0]] : d.slice(), steps: [], pos: pos.slice(), start: pos.slice() };
      phase = 'move'; guide();
    }
    async function play(o) {
      hintM = null; busy = true; phase = 'anim'; clearMarks(); const side = T.side;
      await moveStone(side, o.f, o.t, o.hit); if (stopped) return;
      BG.apply(T.pos, side, o.f, o.t); T.left.splice(T.left.indexOf(o.die), 1); T.steps.push(o); busy = false;
      if (o.hit) toast(X.hit);
      if (!options().length) { pos = T.pos; T = null; hud(); if (BG.winner(pos) >= 0) return end(BG.winner(pos)); return later(() => nextTurn(1 - side), 350); }
      phase = 'move'; guide();
    }
    async function aiTurn() {
      if (over || stopped) return; busy = true;
      const d = rollDice(); await throwDice(1, d); if (stopped) return; dice = d; hud();
      const plays = BG.genPlays(pos, 1, d[0], d[1]);
      if (plays.length === 1 && !plays[0].moves.length) { busy = false; say(X.aiNoMove); toast(X.aiNoMove); return later(() => nextTurn(0), 1400); }
      const r = await ask({ type: 'move', pos: Array.from(pos), side: 1, dice: d, level, tag: 'm' + Date.now() + ':' + ply }); if (stopped || over) return;
      let moves = r && r.moves;
      const ok = moves && plays.some(x => { const q = pos.slice(); moves.forEach(c => BG.apply(q, 1, BG.mvFrom(c), BG.mvTo(c))); return BG.key(q) === BG.key(x.pos); });
      if (!ok) moves = plays[0].moves;
      await sleep(250);
      for (const c of moves) { if (stopped || over) return; const f = BG.mvFrom(c), to = BG.mvTo(c), hit = to > 0 && pos[25 - to] === 1;
        await moveStone(1, f, to, hit); BG.apply(pos, 1, f, to); if (hit) toast(X.hitMe); hud(); await sleep(160); }
      busy = false; if (BG.winner(pos) >= 0) return end(BG.winner(pos));
      later(() => nextTurn(0), 350);
    }
    function end(w) {
      over = true; phase = 'over'; clearMarks(); busy = false; T = null; if (ctx.onTurn) ctx.onTurn(-1, {}); SND.win();
      const score = `${pos[0]} : ${pos[26]}`;
      if (pvp) { const wt = X.win.replace('{p}', X.n[w]); say(wt); return later(() => ctx.onEnd({ win: false, draw: false, level, score, pvp: true, winnerText: wt }), 700); }
      say(w === 0 ? L.win : L.lose); later(() => ctx.onEnd({ win: w === 0, draw: false, level, score }), 700);
    }

    /* ---------- taps ---------- */
    function onClick(e) {
      if (stopped || busy || over || !pos || (T3.wasDrag && T3.wasDrag())) return;
      if (phase === 'roll' && hum(turn)) { doRoll(); return; }
      if (phase !== 'move' || !T || !hum(T.side)) return;
      const p = T3.pick(e, U.top); if (!p) return;
      const h = U.hit(p.x, p.z), ops = options();
      if (h < 0) { sel = null; showMarks(); say(X.pick); return; }
      if (sel != null) { const m = ops.find(o => o.from === sel && o.to === h); if (m) return play(m); }
      if (ops.some(o => o.from === h)) { const mine = ops.filter(o => o.from === h);
        if (sel === h && new Set(mine.map(o => o.to)).size === 1) return play(mine[0]);
        sel = h; showMarks(); say(X.dest); return; }
      const to = ops.filter(o => o.to === h); if (to.length && new Set(to.map(o => o.from)).size === 1) return play(to[0]);
      sel = null; showMarks(); say(X.pick);
    }
    function onHud(e) { const b = e.target.closest && e.target.closest('[data-bgm]'); if (!b || stopped) return; e.stopPropagation(); doRoll(); }
    const onKey = e => { if (e.key === ' ' && !e.repeat && phase === 'roll' && pos && hum(turn)) { e.preventDefault(); doRoll(); } };
    ctx.el.addEventListener('click', onClick); document.addEventListener('click', onHud, true); document.addEventListener('keydown', onKey);

    const boot = () => { if (stopped) return; BG = window.BG; pos = BG.initial(); sync(pos); hud(); if (!pvp) ask({ type: 'eval', pos: Array.from(pos), side: 0 }); toast(X.first.replace('{p}', nm(first))); ply = -1; later(() => nextTurn(first), 700); };
    (window.BG && window.BG.genPlays ? Promise.resolve() : (bgLoad || (bgLoad = new Promise((res, rej) => { const s = document.createElement('script'); s.src = FI.BASE + 'bg.js?v=' + FI.BV; s.onload = res; s.onerror = rej; document.head.appendChild(s); })))).then(boot).catch(e => console.warn('[backgammon-museum]', e));
    const api = {
      stop() { stopped = true; timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('click', onHud, true); document.removeEventListener('keydown', onKey); if (toastEl) toastEl.remove(); if (worker) { try { worker.terminate(); } catch (e) {} worker = null; } B.remove(G); B.remove(MG); },
      canResign: () => !over && !!pos, resign() { if (!over && pos) end(pvp ? 1 - turn : 1); },
      // 待った: the checkers played this turn go back (the same dice)
      canUndo: () => !stopped && !over && !busy && phase === 'move' && !!T && hum(T.side) && T.steps.length > 0,
      undo() { if (!api.canUndo()) return; T.pos = T.start.slice(); T.steps = []; T.left = T.dice[0] === T.dice[1] ? [T.dice[0], T.dice[0], T.dice[0], T.dice[0]] : T.dice.slice(); hintM = null; sync(T.pos); hud(); guide(); },
      // ヒント: the strongest level's play for this throw — its first checker (before any is moved)
      canHint: () => !stopped && !over && !busy && phase === 'move' && !!T && hum(T.side) && T.steps.length === 0,
      hint() { if (!api.canHint()) return Promise.resolve(false); const T0 = T;
        return ask({ type: 'move', pos: Array.from(T.start), side: T.side, dice: T.dice, level: 10, tag: 'h' + Date.now() }).then(r => { if (stopped || T !== T0 || T.steps.length || !r || !r.moves || !r.moves.length) return false;
          const c = r.moves[0], o = options().find(q => q.f === BG.mvFrom(c) && q.t === BG.mvTo(c)); if (!o) return false; hintM = o; sel = o.from; say(X.dest); showMarks(); return true; }); },
      _debug: { pos: () => pos && Array.from(T ? T.pos : pos), phase: () => phase, busy: () => busy, dice: () => dice, options: () => phase === 'move' ? options() : [], sel: () => sel, turn: () => turn,
        at: (a, k) => { const [x, y, z] = a === 0 ? U.bar(0, k || 0) : a === 25 ? U.off(0, k || 0) : U.slot(a, k || 0); return T3.project(x, z, y); } },
    };
    window.__bgMuseum = api;
    return api;
  }
  window.Atlas3D = window.Atlas3D || {};
  (window.Atlas3D.backgammon = window.Atlas3D.backgammon || {}).museum = start;
})();
