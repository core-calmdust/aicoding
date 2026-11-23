/* =====================================================================
   六博 (liubo) — on a museum board (所蔵品で遊ぶ, 2026-11-23: the liubo board and pieces, The Met 1994.285; atlas/museum/play.js).
   The rules of liubo are lost. What the old texts keep: two players, six pieces each, six throwing sticks (箸); a piece that has gone its way is
   stood on end and called an owl (梟 / 驍); the owl goes into the water in the middle and takes a fish — two tallies for a fish pulled, three for
   a fish turned over — and six tallies win. How the pieces went round the marks is not recorded.
   THIS IS A RECONSTRUCTION made for this board (2026-11-23, the user: 「復元で」), kept as small as those fragments allow — the museum's text and
   the rules course both say so:
     the way: the sixteen arms of the eight L marks round the rim (each arm one station), anticlockwise; each side comes on at the L in the middle of
       its own edge, goes once round (stations 1–16), then turns in at its own T — the bar (17), the stem (18) — and into the water (19)
     a turn: throw the six sticks — as many steps as sticks lie flat face up; none flat counts six — and move one piece that far (a piece in hand
       comes on); no piece may stop on a piece of its own; no move, no turn
     stopping on the other side's piece on the rim sends it back to its owner's hand; the T is each side's own (safe)
     a piece that turns in at its T is stood on end: an owl. Reaching the water by the exact count turns a fish over (3 tallies); with steps to
       spare it pulls a fish (2). The piece goes back to hand. Six tallies win.
   The board comes in as ctx.board, its userData: liubo: true · top · ring[16] = [x, z, yaw] · tee(side, k) → [x, z, yaw] (k 0 bar, 1 stem)
     · water [x, z] · hand(side, i) → [x, y, z, yaw] · piece(side) → Mesh (lying: 2.54 long on x, .635 its half height) · stick() → Object3D (flat
     face up at rest) · stickAt(i) → [x, y, z] · fish() → Object3D · fishAt(i) → [x, z]
   Registered as Atlas3D.liubo (museum only). The rules and the AI are plain functions (Atlas3D.liubo.logic) so they can be run without a board.
   ===================================================================== */
(function () {
  'use strict';
  const TX = {
    ja: { n: ['白', '黒'], roll: '振る', tap: 'タップして箸を振る', pick: '光っている駒をタップ', thr: '{n} 進む', zero: '平らな面なし：6 進む', pass: '{p}：動かせる駒がない', cap: '取った！ 手元へ戻す', owl: '梟になった', pull: '魚を引く：籌 +2', flip: '魚を翻す：籌 +3', first: '先手：{p}', win: '{p}の勝ち！', tally: '籌', recon: '復元ルール：籌を6本先に取ったほうの勝ち' },
    en: { n: ['White', 'Black'], roll: 'Throw', tap: 'Tap to throw the sticks', pick: 'Tap a glowing piece', thr: 'Move {n}', zero: 'No flat face: move 6', pass: '{p}: no piece can move', cap: 'Taken! Back to the hand', owl: 'Now an owl', pull: 'A fish pulled: +2 tallies', flip: 'A fish turned over: +3 tallies', first: 'First: {p}', win: '{p} wins!', tally: 'Tallies', recon: 'Reconstructed rules: first to six tallies wins' },
    zh: { n: ['白', '黑'], roll: '掷', tap: '点击掷箸', pick: '点击发光的棋子', thr: '走 {n} 步', zero: '没有平面朝上：走 6 步', pass: '{p}：无子可走', cap: '吃子！送回手中', owl: '成为枭', pull: '牵鱼：筹 +2', flip: '翻鱼：筹 +3', first: '先手：{p}', win: '{p}获胜！', tally: '筹', recon: '复原规则：先得六筹者胜' },
    'zh-TW': { n: ['白', '黑'], roll: '擲', tap: '點擊擲箸', pick: '點擊發光的棋子', thr: '走 {n} 步', zero: '沒有平面朝上：走 6 步', pass: '{p}：無子可走', cap: '吃子！送回手中', owl: '成為梟', pull: '牽魚：籌 +2', flip: '翻魚：籌 +3', first: '先手：{p}', win: '{p}獲勝！', tally: '籌', recon: '復原規則：先得六籌者勝' },
    ko: { n: ['백', '흑'], roll: '던지기', tap: '탭해서 막대 던지기', pick: '빛나는 말을 탭하세요', thr: '{n}칸 이동', zero: '평평한 면 없음: 6칸 이동', pass: '{p}: 움직일 말이 없음', cap: '잡았다! 손으로 되돌림', owl: '올빼미가 되었다', pull: '물고기를 끌다: 산가지 +2', flip: '물고기를 뒤집다: 산가지 +3', first: '선: {p}', win: '{p} 승리!', tally: '산가지', recon: '복원 규칙: 산가지 6개를 먼저 얻으면 승리' },
    es: { n: ['Blancas', 'Negras'], roll: 'Lanzar', tap: 'Toca para lanzar los palillos', pick: 'Toca una pieza que brilla', thr: 'Avanza {n}', zero: 'Ninguna cara plana: avanza 6', pass: '{p}: ninguna pieza puede mover', cap: '¡Capturada! Vuelve a la mano', owl: 'Ahora es un búho', pull: 'Pez arrastrado: +2 tantos', flip: 'Pez volteado: +3 tantos', first: 'Empieza: {p}', win: '¡Gana {p}!', tally: 'Tantos', recon: 'Reglas reconstruidas: gana quien llega antes a seis tantos' },
    fr: { n: ['Blancs', 'Noirs'], roll: 'Lancer', tap: 'Touchez pour lancer les baguettes', pick: 'Touchez une pièce qui brille', thr: 'Avancez de {n}', zero: 'Aucune face plate : avancez de 6', pass: '{p} : aucune pièce ne peut bouger', cap: 'Prise ! Retour en main', owl: 'Devenue hibou', pull: 'Poisson tiré : +2 jetons', flip: 'Poisson retourné : +3 jetons', first: 'Commence : {p}', win: '{p} gagne !', tally: 'Jetons', recon: 'Règles reconstituées : le premier à six jetons gagne' },
    pt: { n: ['Brancas', 'Pretas'], roll: 'Lançar', tap: 'Toque para lançar as varetas', pick: 'Toque numa peça que brilha', thr: 'Avança {n}', zero: 'Nenhuma face plana: avança 6', pass: '{p}: nenhuma peça pode mover', cap: 'Capturada! Volta para a mão', owl: 'Agora é uma coruja', pull: 'Peixe puxado: +2 tentos', flip: 'Peixe virado: +3 tentos', first: 'Começa: {p}', win: '{p} vence!', tally: 'Tentos', recon: 'Regras reconstruídas: vence quem chegar primeiro a seis tentos' },
    de: { n: ['Weiß', 'Schwarz'], roll: 'Werfen', tap: 'Tippen, um die Stäbe zu werfen', pick: 'Tippe einen leuchtenden Stein an', thr: '{n} ziehen', zero: 'Keine flache Seite: 6 ziehen', pass: '{p}: kein Stein kann ziehen', cap: 'Geschlagen! Zurück in die Hand', owl: 'Jetzt eine Eule', pull: 'Fisch gezogen: +2 Zählstäbe', flip: 'Fisch gewendet: +3 Zählstäbe', first: 'Beginn: {p}', win: '{p} gewinnt!', tally: 'Zählstäbe', recon: 'Rekonstruierte Regeln: Wer zuerst sechs Zählstäbe hat, gewinnt' },
    ru: { n: ['Белые', 'Чёрные'], roll: 'Бросить', tap: 'Коснитесь, чтобы бросить палочки', pick: 'Коснитесь светящейся фишки', thr: 'Ход на {n}', zero: 'Нет плоских сторон: ход на 6', pass: '{p}: нет хода', cap: 'Взята! Обратно в руку', owl: 'Стала совой', pull: 'Рыба вытянута: +2 бирки', flip: 'Рыба перевёрнута: +3 бирки', first: 'Первыми: {p}', win: 'Победа: {p}!', tally: 'Бирки', recon: 'Реконструкция правил: побеждает первый, кто наберёт шесть бирок' },
    tr: { n: ['Beyaz', 'Siyah'], roll: 'At', tap: 'Çubukları atmak için dokun', pick: 'Parlayan bir taşa dokun', thr: '{n} ilerle', zero: 'Düz yüz yok: 6 ilerle', pass: '{p}: oynayacak taş yok', cap: 'Alındı! Ele geri döner', owl: 'Artık bir baykuş', pull: 'Balık çekildi: +2 çetele', flip: 'Balık çevrildi: +3 çetele', first: 'Başlayan: {p}', win: '{p} kazandı!', tally: 'Çetele', recon: 'Yeniden kurulan kurallar: altı çeteleye ilk ulaşan kazanır' },
    id: { n: ['Putih', 'Hitam'], roll: 'Lempar', tap: 'Ketuk untuk melempar bilah', pick: 'Ketuk bidak yang menyala', thr: 'Maju {n}', zero: 'Tidak ada sisi datar: maju 6', pass: '{p}: tidak ada bidak yang bisa jalan', cap: 'Tertangkap! Kembali ke tangan', owl: 'Menjadi burung hantu', pull: 'Ikan ditarik: +2 tanda', flip: 'Ikan dibalik: +3 tanda', first: 'Mulai: {p}', win: '{p} menang!', tally: 'Tanda', recon: 'Aturan rekonstruksi: yang lebih dulu meraih enam tanda menang' },
    hi: { n: ['सफ़ेद', 'काला'], roll: 'फेंकें', tap: 'छड़ियाँ फेंकने के लिए छुएँ', pick: 'चमकती गोटी को छुएँ', thr: '{n} चलें', zero: 'कोई चपटा पहलू नहीं: 6 चलें', pass: '{p}: कोई गोटी नहीं चल सकती', cap: 'पकड़ी गई! हाथ में वापस', owl: 'अब उल्लू बनी', pull: 'मछली खींची: +2 गिनती', flip: 'मछली पलटी: +3 गिनती', first: 'पहले: {p}', win: '{p} जीता!', tally: 'गिनती', recon: 'पुनर्निर्मित नियम: जो पहले छह गिनती पाए वह जीतता है' },
    ar: { n: ['الأبيض', 'الأسود'], roll: 'ارمِ', tap: 'المس لترمي العيدان', pick: 'المس قطعة مضيئة', thr: 'تحرّك {n}', zero: 'لا وجه مسطّح: تحرّك 6', pass: '{p}: لا قطعة تتحرك', cap: 'أُسرت! تعود إلى اليد', owl: 'صارت بومة', pull: 'سُحبت سمكة: +2', flip: 'قُلبت سمكة: +3', first: 'يبدأ: {p}', win: 'فاز {p}!', tally: 'العلامات', recon: 'قواعد معاد بناؤها: يفوز من يبلغ ست علامات أولًا' },
  };

  /* ---------- the rules (no board needed) ---------- */
  // a state: { p: [[6 places], [6 places]], sc: [a, b] }; a place: 0 in hand · 1–16 on the rim · 17 the T's bar · 18 its stem
  const WATER = 19, GOAL = 6, PROB = [0, 6 / 64, 15 / 64, 20 / 64, 15 / 64, 6 / 64, 2 / 64];   // the chance of each count (six two-faced sticks; none flat = 6)
  const st = (s, q) => (q - 1 + 8 * s) % 16;   // the rim station under a side's place
  const fresh = () => ({ p: [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]], sc: [0, 0] });
  const copy = S => ({ p: [S.p[0].slice(), S.p[1].slice()], sc: S.sc.slice() });
  // the moves of side s for a count n: [{ i, from, to, cap (the other side's piece sent home, or -1), gain }]
  function moves(S, s, n) {
    const out = [], me = S.p[s], op = S.p[1 - s]; let hand = false;
    for (let i = 0; i < 6; i++) { const from = me[i]; if (from === 0) { if (hand) continue; hand = true; }
      let to = from + n, gain = 0, cap = -1;
      if (to >= WATER) { gain = to === WATER ? 3 : 2; to = WATER; }
      else { if (me.indexOf(to) >= 0) continue; if (to <= 16) { const a = st(s, to); for (let j = 0; j < 6; j++) if (op[j] >= 1 && op[j] <= 16 && st(1 - s, op[j]) === a) cap = j; } }
      out.push({ i, from, to, cap, gain }); }
    return out;
  }
  function play(S, s, m) { if (m.cap >= 0) S.p[1 - s][m.cap] = 0; if (m.to === WATER) { S.p[s][m.i] = 0; S.sc[s] += m.gain; } else S.p[s][m.i] = m.to; return S; }
  const won = S => S.sc[0] >= GOAL ? 0 : S.sc[1] >= GOAL ? 1 : -1;
  // the worth of a position to side s: tallies first, then how far the pieces have come — less for a piece the other side can reach with its next throw
  function worth(S, s) {
    let v = 0;
    for (let k = 0; k < 2; k++) { const sg = k === s ? 1 : -1, me = S.p[k], op = S.p[1 - k]; v += sg * Math.min(GOAL, S.sc[k]) * 26;
      for (let i = 0; i < 6; i++) { const q = me[i]; if (!q) continue; let w = 2 + q * (q > 16 ? 1.15 : 1);
        if (q <= 16) { const a = st(k, q); let risk = 0, hd = false; for (let j = 0; j < 6; j++) { const o = op[j]; if (o > 16 || (o === 0 && hd)) continue; if (o === 0) hd = true; const d = o === 0 ? ((a - 8 * (1 - k)) % 16 + 16) % 16 + 1 : (a - st(1 - k, o) + 16) % 16; if (d >= 1 && d <= 6 && o + d <= 16) risk = Math.max(risk, PROB[d]); }
          w *= 1 - risk * (k === s ? .55 : .9); }   // (the side to move next is the other one: its threats are real, mine a throw later)
        v += sg * w; } }
    return v;
  }
  // the value of side s's position with `who` about to throw, looking `d` throws on
  function look(S, s, who, d) {
    const w = won(S); if (w >= 0) return w === s ? 1000 : -1000; if (d <= 0) return worth(S, s);
    let v = 0; for (let n = 1; n <= 6; n++) { const ms = moves(S, who, n); let b;
      if (!ms.length) b = look(S, s, 1 - who, d - 1);
      else { b = who === s ? -1e9 : 1e9; for (const m of ms) { const x = look(play(copy(S), who, m), s, 1 - who, d - 1); if (who === s ? x > b : x < b) b = x; } }
      v += PROB[n] * b; }
    return v;
  }
  // the levels: how far it looks, how often it moves at random, how much noise is on its judgement
  const LV = n => ({ d: n >= 17 ? 2 : n >= 9 ? 1 : 0, rnd: n >= 12 ? 0 : [0, .9, .75, .6, .48, .38, .3, .22, .16, .3, .2, .1][n], noise: n >= 20 ? 0 : n >= 17 ? (20 - n) * 1.2 : n >= 12 ? (17 - n) * 1.6 : 3 });
  function choose(S, s, n, level, rng) {
    const ms = moves(S, s, n), R = rng || Math.random; if (ms.length < 2) return ms[0] || null;
    const L = LV(level); if (R() < L.rnd) return ms[R() * ms.length | 0];
    let best = null, bv = -1e9; for (const m of ms) { const v = look(play(copy(S), s, m), s, 1 - s, L.d) + (R() - .5) * 2 * L.noise; if (v > bv) { bv = v; best = m; } }
    return best;
  }
  const throwSticks = rng => { const R = rng || Math.random, f = []; let n = 0; for (let i = 0; i < 6; i++) { const u = R() < .5; f.push(u); if (u) n++; } return { flat: f, n: n || 6 }; };
  const logic = { fresh, copy, moves, play, won, worth, look, choose, throwSticks, st, WATER, GOAL, PROB, LV };

  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const SND = (() => { let C = null;
    const ac = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return null; } catch (e) {} try { C = C || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
    const tone = (a, t, f0, f1, d, v, ty) => { const o = a.createOscillator(), g = a.createGain(); o.type = ty || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02); };
    const noise = (a, t, d, v, f) => { const n = a.createBufferSource(), b = a.createBuffer(1, a.sampleRate * d | 0, a.sampleRate), x = b.getChannelData(0); for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 2); n.buffer = b; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; const g = a.createGain(); g.gain.value = v; n.connect(bp).connect(g).connect(a.destination); n.start(t); };
    const at = f => { const a = ac(); if (a) try { f(a, a.currentTime + .005); } catch (e) {} };
    return { put: () => at((a, t) => { tone(a, t, 900, 420, .06, .05, 'triangle'); noise(a, t, .035, .3, 1700); }), cut: () => at((a, t) => { tone(a, t, 420, 160, .25, .1); noise(a, t, .06, .3, 1200); }),
      roll: () => at((a, t) => { for (let i = 0; i < 9; i++) noise(a, t + i * .045 + Math.random() * .02, .05, .22, 2300 + Math.random() * 1500); }),
      fish: () => at((a, t) => [587.33, 880].forEach((f, i) => tone(a, t + i * .09, f, 0, .4, .07, 'triangle'))), win: () => at((a, t) => [523.25, 659.25, 783.99].forEach((f, i) => tone(a, t + i * .08, f, 0, .45, .07, 'triangle'))) };
  })();

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, B = ctx.board, U = B && B.userData;
    if (!U || !U.liubo) { console.warn('[liubo] needs the museum board'); return null; }
    const X = Object.assign({}, TX.en, TX[ctx.lang] || {}), L = { you: t('p.you'), ai: t('p.ai'), win: t('res.win'), lose: t('res.lose') };
    const pvp = ctx.mode === 'pvp', first = pvp ? 0 : ctx.side === 2 ? 1 : 0, level = Math.max(1, Math.min(20, +ctx.level || 8));
    const hum = s => pvp || s === 0, nm = s => pvp ? X.n[s] : s ? L.ai : L.you;
    const S = fresh(); let turn = first, thr = null, phase = 'wait', over = false, stopped = false, busy = false, msg = '', ply = -1, legal = [];
    T3.show('liubo', B);
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms)), sleep = ms => new Promise(r => later(r, ms));
    const anim = (dur, f) => new Promise(res => { const t0 = performance.now(); (function s(n) { if (stopped) return res(); const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(150); if (k < 1) requestAnimationFrame(s); else res(); })(t0); });
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    /* ---------- pieces, sticks, fish ---------- */
    const G = new TH.Group(); B.add(G);
    const P = [0, 1].map(s => [0, 1, 2, 3, 4, 5].map(() => { const o = U.piece(s); G.add(o); return o; }));
    const HY = .635, HS = 1.27;   // a piece's half height lying, and standing on end
    // where a piece is: [x, y, z, yaw, standing]
    const spot = (s, i, q) => { if (q === 0) { const h = U.hand(s, i); return [h[0], h[1] + HY, h[2], h[3], 0]; } if (q <= 16) { const r = U.ring[st(s, q)]; return [r[0], U.top + HY, r[1], r[2], 0]; }
      if (q < WATER) { const r = U.tee(s, q - 17); return [r[0], U.top + HS, r[1], r[2], 1]; } return [U.water[0], U.top + HS, U.water[1] + (s ? -2.6 : 2.6), 0, 1]; };
    const pose = (o, a) => { o.position.set(a[0], a[1], a[2]); o.rotation.set(0, a[3], a[4] ? Math.PI / 2 : 0); };
    const settle = () => { [0, 1].forEach(s => S.p[s].forEach((q, i) => pose(P[s][i], spot(s, i, q)))); T3.kick(200); };
    async function hop(o, a, b, h, ms) { await anim(ms || Math.min(420, 130 + Math.hypot(b[0] - a[0], b[2] - a[2]) * 14), k => { const e = io(k); o.position.set(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e + Math.sin(k * Math.PI) * h, a[2] + (b[2] - a[2]) * e);
        let dy = b[3] - a[3]; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); o.rotation.set(0, a[3] + dy * e, (a[4] + (b[4] - a[4]) * e) * Math.PI / 2); }); pose(o, b); SND.put(); }
    const D = [0, 1, 2, 3, 4, 5].map(() => { const d = U.stick(); d.visible = false; G.add(d); return d; });
    const F = [0, 1].map(i => { const f = U.fish(); const [x, z] = U.fishAt(i); f.position.set(x, U.top + .14, z); f.rotation.y = i ? 2.9 : -.25; G.add(f); return f; });
    async function throwSticks(side, flat) {
      SND.roll(); const sg = 1, pl = D.map((d, i) => { const [x, y, z] = U.stickAt(i), yaw = (U.stickYaw || 0) + (Math.random() - .5) * .16; d.visible = true;
        return { d, x, y, z, x0: x + 2 + Math.random() * 2, z0: z + sg * (7 + Math.random() * 3), yaw, r0: Math.random() * 6 + 8, rz: flat[i] ? 0 : Math.PI }; });
      await anim(900, k => { pl.forEach((p, i) => { const q = Math.min(1, Math.max(0, k * 1.12 - i * .02)), e = 1 - Math.pow(1 - q, 2.6), up = q < .6 ? Math.sin(q / .6 * Math.PI) * 5 : Math.abs(Math.sin((q - .6) / .4 * Math.PI)) * .7 * (1 - q);
        p.d.position.set(p.x0 + (p.x - p.x0) * e, p.y + up, p.z0 + (p.z - p.z0) * e); const f = 1 - e; p.d.rotation.set(0, p.yaw + f * 2.2, 0); p.d.children[0].rotation.x = p.rz + p.r0 * f; }); });
      pl.forEach(p => { p.d.position.set(p.x, p.y, p.z); p.d.rotation.set(0, p.yaw, 0); p.d.children[0].rotation.x = p.rz; }); T3.kick(200);
    }

    /* ---------- what can move: a soft light on the pieces, a ring where each would go ---------- */
    const glowM = new TH.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: .5, blending: TH.AdditiveBlending, depthWrite: false });
    const ringG = new TH.RingGeometry(.95, 1.3, 32); ringG.rotateX(-Math.PI / 2);
    const marks = []; let pulse = 0;
    function mark() {
      marks.forEach(m => G.remove(m)); marks.length = 0; if (phase !== 'pick' || !hum(turn)) return T3.kick(100);
      legal.forEach(m => { const o = P[turn][m.i], sh = new TH.Mesh(o.geometry, glowM); sh.scale.setScalar(1.14); sh.position.copy(o.position); sh.rotation.copy(o.rotation); G.add(sh); marks.push(sh);
        const a = spot(turn, m.i, m.to), r = new TH.Mesh(ringG, glowM); r.position.set(a[0], (m.to === WATER || m.to <= 18 ? U.top : 0) + .06, m.to === WATER ? U.water[1] : a[2]); if (m.to === WATER) r.scale.setScalar(2.2); G.add(r); marks.push(r); });
      if (!pulse) (function tick() { if (stopped || phase !== 'pick') { pulse = 0; return; } pulse = requestAnimationFrame(tick); glowM.opacity = .34 + .22 * Math.sin(performance.now() / 260); T3.kick(60); })();
    }

    /* ---------- HUD ---------- */
    const DOT = ['background:radial-gradient(circle at 35% 30%,#fffaf0,#d9c9a0 60%,#8a7648)', 'background:radial-gradient(circle at 35% 30%,#6a5a4c,#2a1f18 60%,#0c0806)'];
    function hud() {
      if (stopped) return;
      const side = s => `<span class="hs ${turn === s && !over ? 'on' : ''}"><i class="dk" style="${DOT[s]}"></i>${esc(nm(s))}<b title="${esc(X.tally)}">${S.sc[s]}<small style="opacity:.6">/${GOAL}</small></b></span>`;
      const dv = thr ? `<span class="hd" style="font-size:20px;font-weight:800;white-space:nowrap">${thr.n}</span>` : '';
      const mid = phase === 'roll' && hum(turn) && !over ? `<button type="button" data-lbo="roll">${esc(X.roll)}</button>` : msg ? `<span class="hm">${esc(msg)}</span>` : '';
      ctx.hud(`${side(0)}${dv}${mid}${side(1)}`);
    }
    const say = m => { msg = m || ''; hud(); };
    let toastEl = null, toastT = 0;
    function toast(m) { if (toastEl) toastEl.remove(); clearTimeout(toastT); toastEl = document.createElement('div'); toastEl.className = 'urtoast'; toastEl.textContent = m; document.body.appendChild(toastEl); const el = toastEl; toastT = setTimeout(() => el.remove(), 1700); }

    /* ---------- the flow ---------- */
    function nextTurn(s) {
      if (stopped || over) return; turn = s; thr = null; legal = []; ply++; if (ctx.onTurn) ctx.onTurn(turn, { human: hum(turn), ply });
      phase = 'roll'; say(hum(s) ? X.tap : ''); mark();
      if (!hum(s)) later(doRoll, 750);
    }
    async function doRoll(force) {
      if (phase !== 'roll' || busy || over) return;
      busy = true; phase = 'anim'; say(''); const s = turn, r = force || logic.throwSticks();
      await throwSticks(s, r.flat); if (stopped) return; thr = r; busy = false;
      const m0 = r.flat.some(Boolean) ? X.thr.replace('{n}', r.n) : X.zero; legal = moves(S, s, r.n);
      if (!legal.length) { const m = X.pass.replace('{p}', nm(s)); say(m); toast(m); phase = 'anim'; return later(() => nextTurn(1 - s), 1300); }
      if (hum(s)) { phase = 'pick'; say(m0 + ' — ' + X.pick); mark(); if (legal.length === 1) later(() => { if (phase === 'pick' && turn === s && legal.length === 1) move(legal[0]); }, 900); return; }
      say(m0); await sleep(650); if (stopped) return; move(choose(S, s, r.n, level));
    }
    async function move(m) {
      if (busy || over || !m) return; busy = true; phase = 'anim'; mark(); const s = turn, o = P[s][m.i];
      let a = spot(s, m.i, m.from);
      for (let q = m.from + 1; q <= m.to; q++) { if (stopped) return; const b = spot(s, m.i, q); if (q === 17) { toast(X.owl); }
        await hop(o, a, b, q === WATER ? 2.4 : m.from === 0 && q === 1 ? 2.2 : 1.0, m.from === 0 && q === 1 ? 380 : 0); a = b; }
      if (m.cap >= 0) { SND.cut(); toast(X.cap); const e = P[1 - s][m.cap], from = spot(1 - s, m.cap, S.p[1 - s][m.cap]); play(S, s, m); await hop(e, from, spot(1 - s, m.cap, 0), 4.5, 520); }
      else if (m.to === WATER) {
        SND.fish(); const f = F[m.gain === 3 ? 0 : 1], m1 = m.gain === 3 ? X.flip : X.pull; toast(m1); say(m1);
        const p0 = f.position.clone(), r0 = f.rotation.clone();
        if (m.gain === 3) await anim(700, k => { f.position.y = p0.y + Math.sin(k * Math.PI) * 2.6; f.rotation.z = r0.z + Math.PI * io(k); });
        else await anim(700, k => { const e = Math.sin(k * Math.PI); f.position.z = p0.z + (s ? -1 : 1) * 2.2 * e; f.position.y = p0.y + .5 * e; });
        f.position.copy(p0); if (m.gain !== 3) f.rotation.copy(r0);
        play(S, s, m); hud(); if (stopped) return; await hop(o, a, spot(s, m.i, 0), 4.5, 520); }
      else play(S, s, m);
      settle(); hud(); busy = false;
      const w = won(S); if (w >= 0) return end(w);
      later(() => nextTurn(1 - s), 420);
    }
    function end(w) {
      over = true; phase = 'over'; busy = false; mark(); if (ctx.onTurn) ctx.onTurn(-1, {}); SND.win();
      const score = `${S.sc[0]} : ${S.sc[1]}`;
      if (pvp) { const wt = X.win.replace('{p}', X.n[w]); say(wt); return later(() => ctx.onEnd({ win: false, draw: false, level, score, pvp: true, winnerText: wt }), 700); }
      say(w === 0 ? L.win : L.lose); later(() => ctx.onEnd({ win: w === 0, draw: false, level, score }), 700);
    }

    // a tap: on a piece that can move, or on the ring where it would go (the nearest within 2.6 cm; a piece in hand lies on the plinth, lower)
    function onClick(e) { if (stopped || busy || over || (T3.wasDrag && T3.wasDrag())) return;
      if (phase === 'roll' && hum(turn)) return doRoll(); if (phase !== 'pick' || !hum(turn)) return;
      const a = T3.pick(e, U.top + .6), b = T3.pick(e, .6); let best = null, bd = 2.6;
      legal.forEach(m => { const f = spot(turn, m.i, m.from), p = m.from === 0 ? b : a; if (p) { let d = Math.hypot(p.x - f[0], p.z - f[2]); if (m.from === 0) { const hs = [0, 1, 2, 3, 4, 5].filter(i => S.p[turn][i] === 0).map(i => { const h = U.hand(turn, i); return Math.hypot(p.x - h[0], p.z - h[2]); }); d = Math.min.apply(null, hs); } if (d < bd) { bd = d; best = m; } }
        if (a) { const to = m.to === WATER ? [U.water[0], 0, U.water[1]] : spot(turn, m.i, m.to), d = Math.hypot(a.x - to[0], a.z - to[2]) * (m.to === WATER ? .5 : 1) + (m.to === WATER && m.gain !== 3 ? .01 : 0); if (d < bd) { bd = d; best = m; } } });
      if (best) move(best); }
    function onHud(e) { const b = e.target.closest && e.target.closest('[data-lbo]'); if (!b || stopped) return; e.stopPropagation(); if (phase === 'roll' && hum(turn)) doRoll(); }
    const onKey = e => { if (e.repeat) return; if (e.key === ' ' && phase === 'roll' && hum(turn)) { e.preventDefault(); doRoll(); } };
    ctx.el.addEventListener('click', onClick); document.addEventListener('click', onHud, true); document.addEventListener('keydown', onKey);
    settle(); hud(); toast(X.recon); later(() => { toast(X.first.replace('{p}', nm(first))); nextTurn(first); }, 1900);
    const api = {
      stop() { stopped = true; timers.forEach(clearTimeout); cancelAnimationFrame(pulse); ctx.el.removeEventListener('click', onClick); document.removeEventListener('click', onHud, true); document.removeEventListener('keydown', onKey); if (toastEl) toastEl.remove(); glowM.dispose(); ringG.dispose(); B.remove(G); },
      canResign: () => !over, resign() { if (!over) end(pvp ? 1 - turn : 1); },
      canUndo: () => false, undo() {}, canHint: () => false, hint: () => Promise.resolve(false),
      _debug: { S, phase: () => phase, turn: () => turn, thr: () => thr, legal: () => legal.slice(), roll: f => doRoll(f), move: i => move(legal[i]), settle, hud, spot },
    };
    window.__liuboMuseum = api;
    return api;
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.liubo = { levels: 20, sides: true, modes: ['ai', 'pvp'], start, logic };
})();
