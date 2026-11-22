/* =====================================================================
   盤双六「本双六」— play on the museum's 木画紫檀双六局 (所蔵品で遊ぶ, 2026-11-23). Rules and AI: atlas/games/sugoroku-engine.js.
   Driven by atlas/museum/play.js through a stand-in for Table3D; the board comes in as ctx.board, its userData:
     top (the field's height) · slot(abs, k) → [x, y, z] (the k-th stone on point abs, from the rim inward) · bar(side, k) (the middle strip)
     · hit(x, z) → abs 1–24 | 0 (the middle strip) | -1 · stone(side) → Mesh · die() → Mesh · diceAt(side, i) → [x, z]
   Side 0 (you, the near side, green) moves 24 → 1 into the near left table; side 1 (the AI, yellow) the other way.
   ===================================================================== */
(function () {
  'use strict';
  const TX = {
    ja: { n: ['緑', '黄'], roll: '振る', pick: '光る石をタップ', dest: '行き先をタップ', noMove: '動かせる石がありません', aiNoMove: 'AI：動かせる石なし', cut: '切った！', cutMe: '切られた…', enter: '切られた石を入れます', first: '先手：{p}', win: '{p}の勝ち！', home: '内地' },
    en: { n: ['Green', 'Yellow'], roll: 'Roll', pick: 'Tap a glowing stone', dest: 'Tap where to go', noMove: 'No stone can move', aiNoMove: 'AI: no move', cut: 'Cut!', cutMe: 'Cut…', enter: 'Bring the cut stone back in', first: 'First: {p}', win: '{p} wins!', home: 'Home' },
    zh: { n: ['绿', '黄'], roll: '掷骰', pick: '点击发光的子', dest: '点击目的地', noMove: '没有可走的子', aiNoMove: 'AI：无子可走', cut: '打掉！', cutMe: '被打掉了…', enter: '先把被打掉的子放回', first: '先手：{p}', win: '{p}获胜！', home: '内盘' },
    'zh-TW': { n: ['綠', '黃'], roll: '擲骰', pick: '點擊發光的子', dest: '點擊目的地', noMove: '沒有可走的子', aiNoMove: 'AI：無子可走', cut: '打掉！', cutMe: '被打掉了…', enter: '先把被打掉的子放回', first: '先手：{p}', win: '{p}獲勝！', home: '內盤' },
    ko: { n: ['초록', '노랑'], roll: '굴리기', pick: '빛나는 돌을 탭', dest: '갈 곳을 탭', noMove: '움직일 돌이 없어요', aiNoMove: 'AI: 움직일 수 없음', cut: '잘랐다!', cutMe: '잘렸다…', enter: '잘린 돌을 먼저 넣어요', first: '선: {p}', win: '{p} 승리!', home: '안쪽' },
    es: { n: ['Verde', 'Amarillo'], roll: 'Tirar', pick: 'Toca una ficha brillante', dest: 'Toca el destino', noMove: 'Ninguna ficha puede moverse', aiNoMove: 'IA: sin jugada', cut: '¡Cortada!', cutMe: 'Te han cortado…', enter: 'Entra la ficha cortada', first: 'Empieza: {p}', win: '¡Gana {p}!', home: 'Casa' },
    fr: { n: ['Vert', 'Jaune'], roll: 'Lancer', pick: 'Touchez un pion lumineux', dest: 'Touchez la destination', noMove: 'Aucun pion ne peut bouger', aiNoMove: 'IA : aucun coup', cut: 'Coupé !', cutMe: 'Coupé…', enter: 'Faites rentrer le pion coupé', first: 'Commence : {p}', win: '{p} gagne !', home: 'Jan' },
    pt: { n: ['Verde', 'Amarelo'], roll: 'Lançar', pick: 'Toque numa peça brilhante', dest: 'Toque no destino', noMove: 'Nenhuma peça pode mover', aiNoMove: 'IA: sem jogada', cut: 'Cortou!', cutMe: 'Cortada…', enter: 'Entre com a peça cortada', first: 'Começa: {p}', win: '{p} vence!', home: 'Casa' },
    de: { n: ['Grün', 'Gelb'], roll: 'Würfeln', pick: 'Leuchtenden Stein antippen', dest: 'Ziel antippen', noMove: 'Kein Stein kann ziehen', aiNoMove: 'KI: kein Zug', cut: 'Geschlagen!', cutMe: 'Geschlagen …', enter: 'Erst den geschlagenen Stein einsetzen', first: 'Beginn: {p}', win: '{p} gewinnt!', home: 'Heimfeld' },
    ru: { n: ['Зелёные', 'Жёлтые'], roll: 'Бросить', pick: 'Коснитесь светящейся шашки', dest: 'Коснитесь цели', noMove: 'Ходов нет', aiNoMove: 'ИИ: ходов нет', cut: 'Срублена!', cutMe: 'Вас срубили…', enter: 'Сначала введите срубленную', first: 'Первыми: {p}', win: 'Победили {p}!', home: 'Дом' },
    tr: { n: ['Yeşil', 'Sarı'], roll: 'At', pick: 'Parlayan taşa dokun', dest: 'Gideceği yere dokun', noMove: 'Oynayacak taş yok', aiNoMove: 'YZ: hamle yok', cut: 'Kırıldı!', cutMe: 'Taşın kırıldı…', enter: 'Önce kırılan taşı sok', first: 'Başlayan: {p}', win: '{p} kazandı!', home: 'Ev' },
    id: { n: ['Hijau', 'Kuning'], roll: 'Lempar', pick: 'Ketuk batu yang menyala', dest: 'Ketuk tujuan', noMove: 'Tak ada batu yang bisa jalan', aiNoMove: 'AI: tak ada langkah', cut: 'Dipotong!', cutMe: 'Batumu dipotong…', enter: 'Masukkan dulu batu yang dipotong', first: 'Mulai: {p}', win: '{p} menang!', home: 'Rumah' },
    hi: { n: ['हरा', 'पीला'], roll: 'फेंकें', pick: 'चमकती गोटी छुएँ', dest: 'जगह छुएँ', noMove: 'कोई गोटी नहीं चल सकती', aiNoMove: 'AI: चाल नहीं', cut: 'काटी!', cutMe: 'गोटी कट गई…', enter: 'पहले कटी गोटी अंदर लाएँ', first: 'पहले: {p}', win: '{p} जीता!', home: 'घर' },
    ar: { n: ['الأخضر', 'الأصفر'], roll: 'ارمِ', pick: 'المس حجرًا مضيئًا', dest: 'المس الوجهة', noMove: 'لا حجر يتحرك', aiNoMove: 'الذكاء: لا حركة', cut: 'قُطع!', cutMe: 'قُطع حجرك…', enter: 'أدخل الحجر المقطوع أولًا', first: 'يبدأ: {p}', win: 'فاز {p}!', home: 'البيت' },
  };
  const levelInfo = n => ({ name: 'Lv.' + n });
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

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, E = window.SugorokuEngine, t = ctx.t, B = ctx.board, U = B && B.userData;
    if (!E || !U || !U.slot) { console.warn('[sugoroku] needs the museum board'); return null; }
    const X = Object.assign({}, TX.en, TX[ctx.lang] || {}), L = { you: t('p.you'), ai: t('p.ai'), think: t('p.think'), win: t('res.win'), lose: t('res.lose') };
    const level = Math.max(1, Math.min(20, +ctx.level || 6)), pvp = ctx.mode === 'pvp', first = pvp ? 0 : ctx.side === 2 ? 1 : 0;
    const hum = s => pvp || s === 0, nm = s => pvp ? X.n[s] : s ? L.ai : L.you;   // (二人で: both sides are people, named by their colour)
    let ply = 0;
    T3.show('sugoroku', B);
    let st = null, at0 = null, hintM = null, dice = null, used = [], seqs = [], taken = [], cs = null, phase = 'wait', over = false, stopped = false, busy = false, sel = null, msg = '';
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms)), sleep = ms => new Promise(r => later(r, ms));
    const anim = (dur, f) => new Promise(res => { const t0 = performance.now(); (function s(n) { if (stopped) return res(); const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(150); if (k < 1) requestAnimationFrame(s); else res(); })(t0); });
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    /* ---------- stones: stacks per point, the middle strip per side ---------- */
    const G = new TH.Group(); B.add(G);
    const stacks = Array.from({ length: 25 }, () => []), bars = [[], []];
    function sync(s) {
      const pool = [[], []]; stacks.forEach(a => { a.forEach(m => pool[m.userData.side].push(m)); a.length = 0; }); bars.forEach(a => { a.forEach(m => pool[m.userData.side].push(m)); a.length = 0; });
      const take = side => { const m = pool[side].pop() || (() => { const o = U.stone(side); o.userData.side = side; G.add(o); return o; })(); return m; };
      for (let i = 1; i <= 24; i++) { const n = s.b[i], side = n > 0 ? 0 : 1; for (let k = 0; k < Math.abs(n); k++) { const m = take(side); m.position.set(...U.slot(i, k)); stacks[i].push(m); } }
      for (const side of [0, 1]) for (let k = 0; k < s.bar[side]; k++) { const m = take(side); m.position.set(...U.bar(side, k)); bars[side].push(m); }
      pool.forEach(a => a.forEach(m => G.remove(m)));
      T3.kick(300);
    }
    async function moveStone(side, m) {
      const src = m.from === 0 ? bars[side] : stacks[m.from], o = src.pop(); if (!o) return;
      let vic = null; if (m.hit) vic = stacks[m.to].pop();
      const a = o.position.clone(), b = new TH.Vector3(...U.slot(m.to, stacks[m.to].length)), H = 2.2;
      await anim(Math.min(560, 260 + a.distanceTo(b) * 9), k => { const e = io(k); o.position.set(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e + Math.sin(k * Math.PI) * H, a.z + (b.z - a.z) * e); });
      stacks[m.to].push(o); SND.put();
      if (vic) { SND.cut(); const p0 = vic.position.clone(), p1 = new TH.Vector3(...U.bar(1 - side, bars[1 - side].length)); bars[1 - side].push(vic);
        await anim(480, k => { const e = io(k); vic.position.set(p0.x + (p1.x - p0.x) * e, p0.y + (p1.y - p0.y) * e + Math.sin(k * Math.PI) * 3, p0.z + (p1.z - p0.z) * e); }); }
    }

    /* ---------- dice: two ivory dice thrown onto the field on the thrower's side ---------- */
    const D = [U.die(), U.die()]; D.forEach(d => { d.visible = false; G.add(d); });
    // the face up for each number (+x 1 / −x 6, +y 2 / −y 5, +z 3 / −z 4: the exhibit's dice)
    const UP = { 1: [0, 0, Math.PI / 2], 2: [0, 0, 0], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0], 5: [Math.PI, 0, 0], 6: [0, 0, -Math.PI / 2] };
    async function throwDice(side, v) {
      SND.roll(); const sg = side ? -1 : 1, plan = D.map((d, i) => { const [x, z] = U.diceAt(side, i), yaw = (Math.random() - .5) * 1.2; d.visible = true;
        return { d, x, z, x0: x + (Math.random() - .5) * 4, z0: z + sg * (7 + Math.random() * 2), r0: [Math.random() * 9, Math.random() * 9, Math.random() * 9], r1: UP[v[i]], yaw }; });
      const y = U.top + .68;
      await anim(820, k => { plan.forEach((p, i) => { const q = Math.min(1, Math.max(0, k * 1.1 - i * .08)), e = 1 - Math.pow(1 - q, 2.6), hop = q < .65 ? Math.sin(q / .65 * Math.PI) * 4 : Math.abs(Math.sin((q - .65) / .35 * Math.PI)) * .7 * (1 - q);
        p.d.position.set(p.x0 + (p.x - p.x0) * e, y + hop, p.z0 + (p.z - p.z0) * e);
        const f = 1 - e; p.d.rotation.set(p.r1[0] + p.r0[0] * f, p.yaw * e + p.r0[1] * f, p.r1[2] + p.r0[2] * f); }); });
      plan.forEach(p => { p.d.position.set(p.x, y, p.z); const r = new TH.Euler(p.r1[0], 0, p.r1[2]), qq = new TH.Quaternion().setFromAxisAngle(new TH.Vector3(0, 1, 0), p.yaw).multiply(new TH.Quaternion().setFromEuler(r)); p.d.quaternion.copy(qq); });
      T3.kick(200);
    }

    /* ---------- marks ---------- */
    const MG = new TH.Group(); B.add(MG);
    const basic = (c, op) => new TH.MeshBasicMaterial({ color: c, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const RING = new TH.TorusGeometry(1.45, .11, 8, 40); RING.rotateX(Math.PI / 2);
    const DISC = new TH.CircleGeometry(1.2, 32); DISC.rotateX(-Math.PI / 2);
    const MAT = { can: basic(0xffd65a, .95), sel: basic(0x3df59a, .95), dest: basic(0x3df59a, .55), hit: basic(0xff5d5d, .6), last: basic(0xffd65a, .35) };
    const clearMarks = () => { while (MG.children.length) MG.remove(MG.children[0]); T3.kick(120); };
    const topOf = from => { const a = from === 0 ? bars[st.turn] : stacks[from]; return a.length ? a[a.length - 1].position : null; };
    function ring(from, mat) { const p = topOf(from); if (!p) return; const m = new TH.Mesh(RING, mat); m.position.set(p.x, p.y + .5, p.z); m.renderOrder = 3; MG.add(m); }
    function disc(to, hit) { const k = hit ? 0 : stacks[to].length, [x, y, z] = U.slot(to, k); const m = new TH.Mesh(DISC, hit ? MAT.hit : MAT.dest); m.position.set(x, (hit ? y + 1.0 : U.top) + .03, z); m.renderOrder = 2; MG.add(m); }
    const options = () => { const k = taken.length, seen = new Map(); for (const q of seqs) { if (q.steps.length <= k) continue; if (!taken.every((s, i) => q.steps[i].from === s.from && q.steps[i].to === s.to)) continue; const s = q.steps[k]; seen.set(s.from + ':' + s.to, s); } return [...seen.values()]; };
    function showMarks() {
      clearMarks(); if (phase !== 'move' || !hum(st.turn)) return;
      const ops = options(), froms = [...new Set(ops.map(o => o.from))];
      froms.forEach(f => ring(f, f === sel ? MAT.sel : MAT.can));
      if (sel != null) ops.filter(o => o.from === sel).forEach(o => disc(o.to, o.hit));
      if (hintM) { ring(hintM.from, MAT.can); const k = hintM.hit ? 0 : stacks[hintM.to].length, [x, y, z] = U.slot(hintM.to, k), m = new TH.Mesh(RING, MAT.can); m.position.set(x, U.top + .05, z); MG.add(m); }
      let pulse = true; const tick = () => { if (stopped || !MG.children.length || !pulse) return; const k = .5 + .5 * Math.sin(performance.now() / 260); MG.children.forEach(m => { if (m.geometry === RING) m.scale.setScalar(.9 + k * .16); }); T3.kick(60); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }

    /* ---------- HUD ---------- */
    const homeN = side => { let n = 0; for (let i = side ? 19 : 1; i <= (side ? 24 : 6); i++) n += Math.max(0, E.own(st, side, i)); return n; };
    const DOT = ['background:radial-gradient(circle at 35% 30%,#7fd08f,#1f6b34 60%,#0c3418)', 'background:radial-gradient(circle at 35% 30%,#ffe59a,#c9921c 60%,#7a5208)'];
    function hud() {
      if (stopped || !st) return;
      const side = s => `<span class="hs ${st.turn === s && !over ? 'on' : ''}"><i class="dk" style="${DOT[s]}"></i>${esc(nm(s))}<b>${homeN(s)}/15</b></span>`;
      const dv = dice ? `<span class="hd" style="font-size:22px;letter-spacing:2px;white-space:nowrap">${dice.map((v, i) => `<span style="opacity:${used[i] ? .3 : 1}">${DIE[v]}</span>`).join('')}</span>` : '';
      const mid = phase === 'roll' && hum(st.turn) && !over ? `<button type="button" data-sgr="roll">${esc(X.roll)}</button>` : msg ? `<span class="hm">${esc(msg)}</span>` : '';
      ctx.hud(`${side(0)}${dv}${mid}${side(1)}`);
    }
    const say = m => { msg = m || ''; hud(); };
    let toastEl = null, toastT = 0;
    function toast(m) { if (toastEl) toastEl.remove(); clearTimeout(toastT); toastEl = document.createElement('div'); toastEl.className = 'urtoast'; toastEl.textContent = m; document.body.appendChild(toastEl); const el = toastEl; toastT = setTimeout(() => el.remove(), 1600); }

    /* ---------- the flow ---------- */
    function nextTurn() {
      if (stopped || over) return; dice = null; used = []; sel = null; taken = []; clearMarks();
      ply++; if (ctx.onTurn) ctx.onTurn(st.turn, { human: hum(st.turn), ply });
      if (!pvp && st.turn === 1) { phase = 'ai'; say(L.think); later(aiTurn, 600); return; }
      phase = 'roll'; say('');
    }
    function markUsed(d) { const i = dice.findIndex((v, j) => v === d && !used[j]); if (i >= 0) used[i] = true; }
    async function doRoll() {
      if (phase !== 'roll' || busy || over || !hum(st.turn)) return;
      busy = true; phase = 'anim'; say(''); dice = E.rollDice(); await throwDice(st.turn, dice); if (stopped) return; busy = false; hud();
      seqs = E.sequences(st, dice); cs = E.clone(st); taken = []; at0 = E.clone(st);
      if (!seqs.length) { say(X.noMove); toast(X.noMove); later(endTurn, 1300); return; }
      phase = 'move'; sel = null; const fr = [...new Set(options().map(o => o.from))]; if (fr.length === 1) sel = fr[0];
      say(st.bar[st.turn] ? X.enter : sel != null ? X.dest : X.pick); showMarks();
    }
    async function play(m) {
      hintM = null; busy = true; phase = 'anim'; clearMarks(); const side = cs.turn;
      await moveStone(side, m); if (stopped) return;
      E.step(cs, side, m); taken.push(m); markUsed(m.d); st = cs; busy = false;
      if (m.hit) toast(side && !pvp ? X.cutMe : X.cut);
      if (cs.winner >= 0) return end(cs.winner);
      if (hum(side)) { const ops = options(); if (!ops.length) return endTurn(); phase = 'move'; sel = null; const fr = [...new Set(ops.map(o => o.from))]; if (fr.length === 1) sel = fr[0]; say(cs.bar[side] ? X.enter : sel != null ? X.dest : X.pick); showMarks(); }
      else hud();
    }
    function endTurn() { if (over || stopped) return; st = E.finish(cs || st); cs = null; seqs = []; nextTurn(); }
    async function aiTurn() {
      if (over || stopped) return;
      busy = true; dice = E.rollDice(); await throwDice(1, dice); if (stopped) return; hud();
      cs = E.clone(st); taken = [];
      const q = E.think(st, dice, level);
      if (!q) { busy = false; say(X.aiNoMove); toast(X.aiNoMove); later(endTurn, 1300); return; }
      await sleep(250);
      for (const m of q.steps) { if (stopped || over) return; await play(m); if (over) return; await sleep(180); }
      busy = false; later(endTurn, 400);
    }
    function end(w) {
      over = true; phase = 'over'; clearMarks(); busy = false; if (ctx.onTurn) ctx.onTurn(-1, {});
      SND.win();
      if (pvp) { const wt = X.win.replace('{p}', X.n[w]); say(wt); return later(() => ctx.onEnd({ win: false, draw: false, level, score: `${homeN(0)} : ${homeN(1)}`, pvp: true, winnerText: wt }), 700); }
      say(w === 0 ? L.win : L.lose);
      later(() => ctx.onEnd({ win: w === 0, draw: false, level, score: `${homeN(0)} : ${homeN(1)}` }), 700);
    }

    /* ---------- taps ---------- */
    function onClick(e) {
      if (stopped || busy || over || (T3.wasDrag && T3.wasDrag())) return;
      if (phase === 'roll' && hum(st.turn)) { doRoll(); return; }
      if (phase !== 'move' || !hum(st.turn)) return;
      const p = T3.pick(e, U.top); if (!p) return;
      const h = U.hit(p.x, p.z), ops = options();
      if (h < 0) { sel = null; showMarks(); say(X.pick); return; }
      if (sel != null) { const m = ops.find(o => o.from === sel && o.to === h); if (m) return play(m); }
      if (ops.some(o => o.from === h)) {
        const mine = ops.filter(o => o.from === h);
        if (sel === h && new Set(mine.map(o => o.to)).size === 1) return play(mine[0]);
        sel = h; showMarks(); say(X.dest); return;
      }
      const to = ops.filter(o => o.to === h); if (to.length && new Set(to.map(o => o.from)).size === 1) return play(to[0]);
      sel = null; showMarks(); say(X.pick);
    }
    function onHud(e) { const b = e.target.closest && e.target.closest('[data-sgr]'); if (!b || stopped) return; e.stopPropagation(); doRoll(); }
    const onKey = e => { if (e.key === ' ' && !e.repeat && phase === 'roll' && st && hum(st.turn)) { e.preventDefault(); doRoll(); } };
    ctx.el.addEventListener('click', onClick); document.addEventListener('click', onHud, true); document.addEventListener('keydown', onKey);

    st = E.newGame(first); sync(st); toast(X.first.replace('{p}', nm(first))); later(nextTurn, 700);
    const api = {
      stop() { stopped = true; timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('click', onHud, true); document.removeEventListener('keydown', onKey); if (toastEl) toastEl.remove(); B.remove(G); B.remove(MG); },
      canResign: () => !over, resign() { if (!over) end(pvp ? 1 - st.turn : 1); },
      // 待った: the stones played this turn go back (the same dice — the throw itself is not taken back)
      canUndo: () => !stopped && !over && !busy && phase === 'move' && st && hum(st.turn) && taken.length > 0,
      undo() { if (!api.canUndo()) return; st = E.clone(at0); cs = E.clone(at0); taken = []; used = []; sel = null; hintM = null; sync(st); const fr = [...new Set(options().map(o => o.from))]; if (fr.length === 1) sel = fr[0]; say(st.bar[st.turn] ? X.enter : sel != null ? X.dest : X.pick); showMarks(); },
      // ヒント: the strongest level's choice for the rest of this throw — its next stone and where it goes
      canHint: () => !stopped && !over && !busy && phase === 'move' && st && hum(st.turn) && options().length > 0,
      hint() { if (!api.canHint()) return Promise.resolve(false);
        let best = null, bv = -Infinity; const k = taken.length;
        for (const q of seqs) { if (q.steps.length <= k || !taken.every((t, i) => q.steps[i].from === t.from && q.steps[i].to === t.to)) continue; const v = E.evaluate(q.state, st.turn); if (v > bv) { bv = v; best = q.steps[k]; } }
        if (!best) return Promise.resolve(false); hintM = best; sel = best.from; say(X.dest); showMarks(); return Promise.resolve(true); },
      _debug: { st: () => st && E.clone(st), cs: () => cs && E.clone(cs), phase: () => phase, busy: () => busy, dice: () => dice, options: () => phase === 'move' ? options() : [], sel: () => sel,
        at: (abs, k) => { const [x, y, z] = abs === 0 ? U.bar(0, k || 0) : U.slot(abs, k || 0); return T3.project(x, z, y); } },
    };
    window.__sugorokuTable = api;
    return api;
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.sugoroku = { levels: 20, sides: true, modes: ['ai', 'pvp'], levelInfo, start };
})();
