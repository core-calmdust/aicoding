/* =====================================================================
   ガチョウのゲーム (the Game of the Goose) — on a museum board (所蔵品で遊ぶ, 2026-11-23: the chess and goose board, The Met 62.14; atlas/museum/play.js).
   A race of pure chance for two: two dice, 63 spaces, the first to reach 63 exactly wins. The rules are the classic ones (first printed in Italy in the
   late 16th century), kept to the signs this board itself shows:
     geese (5 9 14 18 23 27 32 36 41 45 50 54 59): go on again by the same throw      dice (26, 53): a first throw of 6+3 goes to 26, of 5+4 to 53
     the well (31): miss 2 turns      the maze (42): back to 39      the boat (52, the prison of other boards): miss 3 turns      death (58): back to the start
     a space already taken: the two exchange places (the one found there goes back to where the mover came from — and is free of any waiting)
     63 must be reached exactly: what is over is counted back again
   Levels (2026-11-23, the user: difficulty and Atlamo as the other games have): the game has no choices, so strength cannot differ — the levels are a
   handicap in the open, re-throws: a side may throw again instead of moving, so many times in a game (REROLL[level] = [you, the other side]; both
   shown at the start and counted on the bar). You choose after each throw (進む / 振り直す); the other side re-throws a throw that gains under 5
   spaces as it values them (a hazard counted for what it costs), or any throw near the end that does not finish. Measured over 30,000 games with
   that policy on both sides: 8–0 → 72 % for you, 0–0 → 50 %, 0–5 → 35 %, 0–20 → 18 %.
   (The bridge at 6 and the inn at 19 of other boards are not drawn on this one, and are not played. The well and the boat hold a piece "until another
    comes" in the old rules; for two players that is a count of turns, as many modern rule sheets have it.)
   The board comes in as ctx.board, its userData: goose: true · top · cell(n, k) → [x, y, z] (0 = the start … 63; k = 0 / 1: the two side by side)
     · hit(x, z) → n | -1 · stone(side) → Mesh · die() → Mesh · diceAt(side, i) → [x, z] · dieH
   Registered as Atlas3D.goose (museum only: no board of its own on the portal's table).
   ===================================================================== */
(function () {
  'use strict';
  const TX = {
    ja: { re: "振り直す", go: "進む", hc: "振り直し：あなた{a}回・相手{b}回", aire: "{p}が振り直し！", n: ['白', '緑'], roll: '振る', tap: 'タップしてサイコロを振る', goose: 'ガチョウ！ もう一度 {n} 進む', d63: '6と3：26へ', d54: '5と4：53へ', well: '井戸：2回休み', maze: '迷路：39へ戻る', boat: '舟：3回休み', death: '死：ふりだしへ', swap: '入れかわり', back: '行きすぎ：戻る', rest: '{p}：休み（あと{n}回）', first: '先手：{p}', win: '{p}の勝ち！' },
    en: { re: "Throw again", go: "Move", hc: "Re-throws: you {a} · opponent {b}", aire: "{p} throws again!", n: ['White', 'Green'], roll: 'Roll', tap: 'Tap to throw the dice', goose: 'A goose! {n} more', d63: '6 and 3: on to 26', d54: '5 and 4: on to 53', well: 'The well: miss 2 turns', maze: 'The maze: back to 39', boat: 'The boat: miss 3 turns', death: 'Death: back to the start', swap: 'Places exchanged', back: 'Too far: back again', rest: '{p}: resting ({n} more)', first: 'First: {p}', win: '{p} wins!' },
    zh: { re: "重掷", go: "前进", hc: "重掷次数：你{a}次·对手{b}次", aire: "{p}重掷！", n: ['白', '绿'], roll: '掷骰', tap: '点击掷骰子', goose: '鹅！再走 {n} 步', d63: '6和3：前往26', d54: '5和4：前往53', well: '井：停2回合', maze: '迷宫：退回39', boat: '船：停3回合', death: '死亡：回到起点', swap: '交换位置', back: '走过头：退回', rest: '{p}：休息（还剩{n}回合）', first: '先手：{p}', win: '{p}获胜！' },
    'zh-TW': { re: "重擲", go: "前進", hc: "重擲次數：你{a}次·對手{b}次", aire: "{p}重擲！", n: ['白', '綠'], roll: '擲骰', tap: '點擊擲骰子', goose: '鵝！再走 {n} 步', d63: '6和3：前往26', d54: '5和4：前往53', well: '井：停2回合', maze: '迷宮：退回39', boat: '船：停3回合', death: '死亡：回到起點', swap: '交換位置', back: '走過頭：退回', rest: '{p}：休息（還剩{n}回合）', first: '先手：{p}', win: '{p}獲勝！' },
    ko: { re: "다시 굴리기", go: "나아가기", hc: "다시 굴리기: 나 {a}번 · 상대 {b}번", aire: "{p} 다시 굴리기!", n: ['백', '녹'], roll: '굴리기', tap: '탭해서 주사위 굴리기', goose: '거위! {n}칸 더', d63: '6과 3: 26으로', d54: '5와 4: 53으로', well: '우물: 2번 쉬기', maze: '미로: 39로 돌아가기', boat: '배: 3번 쉬기', death: '죽음: 처음으로', swap: '자리 바꾸기', back: '지나침: 되돌아가기', rest: '{p}: 쉬는 중 (앞으로 {n}번)', first: '선: {p}', win: '{p} 승리!' },
    es: { re: "Volver a tirar", go: "Avanzar", hc: "Repeticiones: tú {a} · rival {b}", aire: "¡{p} vuelve a tirar!", n: ['Blanco', 'Verde'], roll: 'Tirar', tap: 'Toca para tirar los dados', goose: '¡Oca! {n} más', d63: '6 y 3: al 26', d54: '5 y 4: al 53', well: 'El pozo: 2 turnos sin jugar', maze: 'El laberinto: vuelve al 39', boat: 'La barca: 3 turnos sin jugar', death: 'La muerte: a la salida', swap: 'Cambio de lugar', back: 'Te pasaste: retrocede', rest: '{p}: descansa (quedan {n})', first: 'Empieza: {p}', win: '¡Gana {p}!' },
    fr: { re: "Relancer", go: "Avancer", hc: "Relances : vous {a} · adversaire {b}", aire: "{p} relance !", n: ['Blanc', 'Vert'], roll: 'Lancer', tap: 'Touchez pour lancer les dés', goose: 'Une oie ! Encore {n}', d63: '6 et 3 : au 26', d54: '5 et 4 : au 53', well: 'Le puits : 2 tours passés', maze: 'Le labyrinthe : retour au 39', boat: 'La barque : 3 tours passés', death: 'La mort : retour au départ', swap: 'Échange de places', back: 'Trop loin : on recule', rest: '{p} : au repos (encore {n})', first: 'Commence : {p}', win: '{p} gagne !' },
    pt: { re: "Lançar de novo", go: "Avançar", hc: "Relançamentos: tu {a} · adversário {b}", aire: "{p} lança de novo!", n: ['Branco', 'Verde'], roll: 'Lançar', tap: 'Toque para lançar os dados', goose: 'Um ganso! Mais {n}', d63: '6 e 3: para o 26', d54: '5 e 4: para o 53', well: 'O poço: 2 vezes sem jogar', maze: 'O labirinto: volta ao 39', boat: 'O barco: 3 vezes sem jogar', death: 'A morte: volta ao início', swap: 'Troca de lugares', back: 'Passou: recua', rest: '{p}: a descansar (faltam {n})', first: 'Começa: {p}', win: '{p} vence!' },
    de: { re: "Neu würfeln", go: "Ziehen", hc: "Neuwürfe: du {a} · Gegner {b}", aire: "{p} würfelt neu!", n: ['Weiß', 'Grün'], roll: 'Würfeln', tap: 'Tippen, um zu würfeln', goose: 'Eine Gans! Noch {n}', d63: '6 und 3: auf die 26', d54: '5 und 4: auf die 53', well: 'Der Brunnen: 2 Runden aussetzen', maze: 'Das Labyrinth: zurück auf 39', boat: 'Das Boot: 3 Runden aussetzen', death: 'Der Tod: zurück zum Start', swap: 'Plätze getauscht', back: 'Zu weit: wieder zurück', rest: '{p}: setzt aus (noch {n})', first: 'Beginn: {p}', win: '{p} gewinnt!' },
    ru: { re: "Перебросить", go: "Ходить", hc: "Перебросы: вы {a} · соперник {b}", aire: "{p} перебрасывает!", n: ['Белые', 'Зелёные'], roll: 'Бросить', tap: 'Коснитесь, чтобы бросить кости', goose: 'Гусь! Ещё {n}', d63: '6 и 3: на 26', d54: '5 и 4: на 53', well: 'Колодец: пропуск 2 ходов', maze: 'Лабиринт: назад на 39', boat: 'Лодка: пропуск 3 ходов', death: 'Смерть: в начало', swap: 'Обмен местами', back: 'Перебор: назад', rest: '{p}: пропускает (ещё {n})', first: 'Первыми: {p}', win: 'Победа: {p}!' },
    tr: { re: "Yeniden at", go: "İlerle", hc: "Yeniden atış: sen {a} · rakip {b}", aire: "{p} yeniden atıyor!", n: ['Beyaz', 'Yeşil'], roll: 'At', tap: 'Zar atmak için dokun', goose: 'Kaz! {n} daha', d63: '6 ve 3: 26’ya', d54: '5 ve 4: 53’e', well: 'Kuyu: 2 tur bekle', maze: 'Labirent: 39’a dön', boat: 'Kayık: 3 tur bekle', death: 'Ölüm: başa dön', swap: 'Yer değişimi', back: 'Fazla geldi: geri', rest: '{p}: bekliyor ({n} tur daha)', first: 'Başlayan: {p}', win: '{p} kazandı!' },
    id: { re: "Lempar ulang", go: "Maju", hc: "Lempar ulang: kamu {a} · lawan {b}", aire: "{p} melempar ulang!", n: ['Putih', 'Hijau'], roll: 'Lempar', tap: 'Ketuk untuk melempar dadu', goose: 'Angsa! {n} lagi', d63: '6 dan 3: ke 26', d54: '5 dan 4: ke 53', well: 'Sumur: lewati 2 giliran', maze: 'Labirin: kembali ke 39', boat: 'Perahu: lewati 3 giliran', death: 'Maut: kembali ke awal', swap: 'Bertukar tempat', back: 'Kelebihan: mundur lagi', rest: '{p}: istirahat ({n} lagi)', first: 'Mulai: {p}', win: '{p} menang!' },
    hi: { re: "फिर फेंकें", go: "आगे बढ़ें", hc: "दोबारा फेंक: आप {a} · सामने वाला {b}", aire: "{p} ने फिर फेंका!", n: ['सफ़ेद', 'हरा'], roll: 'फेंकें', tap: 'पासे फेंकने के लिए छुएँ', goose: 'हंस! {n} और', d63: '6 और 3: 26 पर', d54: '5 और 4: 53 पर', well: 'कुआँ: 2 बारी छोड़ें', maze: 'भूलभुलैया: 39 पर वापस', boat: 'नाव: 3 बारी छोड़ें', death: 'मृत्यु: शुरुआत पर', swap: 'जगह की अदला-बदली', back: 'आगे निकल गए: वापस', rest: '{p}: आराम ({n} और)', first: 'पहले: {p}', win: '{p} जीता!' },
    ar: { re: "ارمِ ثانية", go: "تقدّم", hc: "إعادة الرمي: أنت {a} · الخصم {b}", aire: "{p} يرمي ثانية!", n: ['الأبيض', 'الأخضر'], roll: 'ارمِ', tap: 'المس لترمي النرد', goose: 'إوزة! {n} أخرى', d63: '6 و3: إلى 26', d54: '5 و4: إلى 53', well: 'البئر: استرح دورين', maze: 'المتاهة: عد إلى 39', boat: 'القارب: استرح 3 أدوار', death: 'الموت: عد إلى البداية', swap: 'تبادل الأماكن', back: 'تجاوزت: ارجع', rest: '{p}: يستريح (بقي {n})', first: 'يبدأ: {p}', win: 'فاز {p}!' },
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



  const GEESE = new Set([5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54, 59]);
  // one throw worked out: the spaces passed (for the piece to walk), and what happened on the way
  function plan(from, a, b, firstThrow) {
    const sum = a + b, path = [], ev = []; let cur = from, dir = 1;
    if (firstThrow && sum === 9 && (a === 6 || a === 3)) { ev.push({ k: 'd63', at: 0 }); path.push(26); return { path, ev, to: 26 }; }
    if (firstThrow && sum === 9) { ev.push({ k: 'd54', at: 0 }); path.push(53); return { path, ev, to: 53 }; }
    for (let rep = 0; rep < 12; rep++) {
      for (let i = 0; i < sum; i++) { if (cur + dir > 63) { dir = -1; ev.push({ k: 'back', at: path.length }); } cur = Math.max(1, cur + dir); path.push(cur); }
      if (cur !== 63 && GEESE.has(cur)) { ev.push({ k: 'goose', at: path.length, n: sum }); continue; }
      break; }
    return { path, ev, to: cur };
  }

  const REROLL = [0, [8, 0], [6, 0], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 10], [1, 12], [1, 14], [1, 17], [1, 20]];
  const worth = to => to === 58 ? 0 : to === 52 ? 31 : to === 31 ? 17 : to === 42 ? 39 : to;
  const again = (from, pl) => pl.to !== 63 && (from >= 51 || worth(pl.to) - from < 5);   // the other side's re-throw policy
  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, B = ctx.board, U = B && B.userData;
    if (!U || !U.goose) { console.warn('[goose] needs the museum board'); return null; }
    const X = Object.assign({}, TX.en, TX[ctx.lang] || {}), L = { you: t('p.you'), ai: t('p.ai'), win: t('res.win'), lose: t('res.lose') };
    const pvp = ctx.mode === 'pvp', first = pvp ? 0 : ctx.side === 2 ? 1 : 0, level = Math.max(1, Math.min(20, +ctx.level || 8)), RR = pvp ? [2, 2] : REROLL[level].slice();
    const hum = s => pvp || s === 0, nm = s => pvp ? X.n[s] : s ? L.ai : L.you;
    const pos = [0, 0], rest = [0, 0], thrown = [0, 0]; let turn = first, dice = null, phase = 'wait', over = false, stopped = false, busy = false, msg = '', ply = -1;
    T3.show('goose', B);
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms)), sleep = ms => new Promise(r => later(r, ms));
    const anim = (dur, f) => new Promise(res => { const t0 = performance.now(); (function s(n) { if (stopped) return res(); const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(150); if (k < 1) requestAnimationFrame(s); else res(); })(t0); });
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    /* ---------- pieces and dice ---------- */
    const G = new TH.Group(); B.add(G);
    const P = [0, 1].map(s => { const o = U.stone(s); G.add(o); return o; });
    const place = (s, n) => { const both = pos[0] === pos[1] && n === pos[1 - s]; return new TH.Vector3(...U.cell(n, n === 0 || both ? s : null)); };
    const settle = () => { [0, 1].forEach(s => P[s].position.copy(place(s, pos[s]))); T3.kick(200); };
    async function hop(s, to, h) { const a = P[s].position.clone(), b = new TH.Vector3(...U.cell(to, to === 0 ? s : null));
      await anim(Math.min(520, 150 + a.distanceTo(b) * 22), k => { const e = io(k); P[s].position.set(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e + Math.sin(k * Math.PI) * (h || 1.1), a.z + (b.z - a.z) * e); }); SND.put(); }
    const D = [U.die(), U.die()]; D.forEach(d => { d.visible = false; G.add(d); });
    const UP = { 1: [0, 0, Math.PI / 2], 2: [0, 0, 0], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0], 5: [Math.PI, 0, 0], 6: [0, 0, -Math.PI / 2] };
    async function throwDice(side, v) {
      SND.roll(); const sg = side ? -1 : 1, y = U.top + (U.dieH || .7), plan = D.map((d, i) => { const [x, z] = U.diceAt(side, i), yaw = (Math.random() - .5) * 1.2; d.visible = true;
        return { d, x, z, x0: x + (Math.random() - .5) * 3, z0: z + sg * (5 + Math.random() * 2), r0: [Math.random() * 9, Math.random() * 9, Math.random() * 9], r1: UP[v[i]], yaw }; });
      await anim(820, k => { plan.forEach((p, i) => { const q = Math.min(1, Math.max(0, k * 1.1 - i * .08)), e = 1 - Math.pow(1 - q, 2.6), up = q < .65 ? Math.sin(q / .65 * Math.PI) * 3.5 : Math.abs(Math.sin((q - .65) / .35 * Math.PI)) * .6 * (1 - q);
        p.d.position.set(p.x0 + (p.x - p.x0) * e, y + up, p.z0 + (p.z - p.z0) * e); const f = 1 - e; p.d.rotation.set(p.r1[0] + p.r0[0] * f, p.yaw * e + p.r0[1] * f, p.r1[2] + p.r0[2] * f); }); });
      plan.forEach(p => { p.d.position.set(p.x, y, p.z); p.d.quaternion.copy(new TH.Quaternion().setFromAxisAngle(new TH.Vector3(0, 1, 0), p.yaw).multiply(new TH.Quaternion().setFromEuler(new TH.Euler(p.r1[0], 0, p.r1[2])))); });
      T3.kick(200);
    }

    /* ---------- HUD ---------- */
    const DOT = ['background:radial-gradient(circle at 35% 30%,#fffaf0,#d9c9a0 60%,#8a7648)', 'background:radial-gradient(circle at 35% 30%,#8fd0a0,#2f7a4c 60%,#123a22)'];
    function hud() {
      if (stopped) return;
      const side = s => `<span class="hs ${turn === s && !over ? 'on' : ''}"><i class="dk" style="${DOT[s]}"></i>${esc(nm(s))}<b>${pos[s]}</b>${RR[s] ? `<small style="opacity:.7;margin-inline-start:5px">↻${RR[s]}</small>` : ''}</span>`;
      const dv = dice ? `<span class="hd" style="font-size:22px;letter-spacing:2px;white-space:nowrap">${DIE[dice[0]]}${DIE[dice[1]]}</span>` : '';
      const mid = phase === 'roll' && hum(turn) && !over ? `<button type="button" data-gsm="roll">${esc(X.roll)}</button>` : msg ? `<span class="hm">${esc(msg)}</span>` : '';
      ctx.hud(`${side(0)}${dv}${mid}${side(1)}`);
    }
    const say = m => { msg = m || ''; hud(); };
    let toastEl = null, toastT = 0;
    function toast(m) { if (toastEl) toastEl.remove(); clearTimeout(toastT); toastEl = document.createElement('div'); toastEl.className = 'urtoast'; toastEl.textContent = m; document.body.appendChild(toastEl); const el = toastEl; toastT = setTimeout(() => el.remove(), 1700); }

    /* ---------- the flow ---------- */
    function nextTurn(s) {
      if (stopped || over) return; turn = s; dice = null;
      if (rest[s] > 0) { rest[s]--; const m = X.rest.replace('{p}', nm(s)).replace('{n}', rest[s]); say(m); toast(m); return later(() => nextTurn(1 - s), 1500); }
      ply++; if (ctx.onTurn) ctx.onTurn(turn, { human: hum(turn), ply });
      phase = 'roll'; say(hum(s) ? X.tap : '');
      if (!hum(s)) later(doRoll, 800);
    }
    async function doRoll() {
      if (phase !== 'roll' || busy || over) return;
      busy = true; phase = 'anim'; say(''); const s = turn, d = [1 + (Math.random() * 6 | 0), 1 + (Math.random() * 6 | 0)];
      await throwDice(s, d); if (stopped) return; dice = d; hud();
      if (RR[s] > 0) {   // a re-throw in hand: you choose; the other side by its policy
        if (hum(s)) { phase = 'choose'; busy = false; say(''); labels(); return; }
        if (again(pos[s], plan(pos[s], d[0], d[1], !thrown[s]))) { RR[s]--; const m = X.aire.replace('{p}', nm(s)); toast(m); say(m); await sleep(900); if (stopped) return; busy = false; phase = 'roll'; return doRoll(); } }
      return move(s, d);
    }
    async function move(s, d) {
      busy = true; phase = 'anim'; say('');
      const from = pos[s], pl = plan(from, d[0], d[1], !thrown[s]); thrown[s] = 1;
      const tell = async e => { const m = (X[e.k] || '').replace('{n}', e.n || ''); toast(m); say(m); await sleep(e.k === 'back' ? 350 : 900); };
      for (let i = 0; i < pl.path.length; i++) { for (const e of pl.ev) if (e.at === i) await tell(e); if (stopped) return; await hop(s, pl.path[i], pl.path.length === 1 ? 5 : 0); }
      let to = pl.to; pos[s] = to;
      const sp = to === 31 ? 'well' : to === 42 ? 'maze' : to === 52 ? 'boat' : to === 58 ? 'death' : '';
      if (sp) { await sleep(250); SND.cut(); await tell({ k: sp }); if (stopped) return;
        if (sp === 'well') rest[s] = 2; else if (sp === 'boat') rest[s] = 3; else { to = sp === 'maze' ? 39 : 0; await hop(s, to, 4); pos[s] = to; } }
      // a space already taken: the two change places
      if (to > 0 && to < 63 && pos[1 - s] === to) { await tell({ k: 'swap' }); if (stopped) return; rest[1 - s] = 0; await hop(1 - s, from, 4); pos[1 - s] = from; }
      settle(); hud(); busy = false;
      if (to === 63) return end(s);
      later(() => nextTurn(1 - s), 500);
    }
    function end(w) {
      over = true; phase = 'over'; busy = false; if (ctx.onTurn) ctx.onTurn(-1, {}); SND.win();
      const score = `${pos[0]} : ${pos[1]}`;
      if (pvp) { const wt = X.win.replace('{p}', X.n[w]); say(wt); return later(() => ctx.onEnd({ win: false, draw: false, level, score, pvp: true, winnerText: wt }), 700); }
      say(w === 0 ? L.win : L.lose); later(() => ctx.onEnd({ win: w === 0, draw: false, level, score }), 700);
    }

    // 進む / 振り直す (2026-11-23, the user: not up on the bar): two labels on the board itself — 進む by your piece, 振り直す by the dice — and a tap
    // near either does it (the nearer of the two; the labels only show where)
    const LB = ['go', 're'].map(k => { const e = document.createElement('div'); e.dataset.k = k;
      e.style.cssText = 'position:fixed;z-index:141;left:0;top:0;pointer-events:none;display:none;padding:7px 14px;border-radius:999px;font:700 14px/1 system-ui,sans-serif;white-space:nowrap;color:#22170a;background:#f3ead6;border:1px solid #c9a55a;box-shadow:0 4px 14px rgba(0,0,0,.5);translate:-50% -50%';
      document.body.appendChild(e); return e; });
    const spots = () => { const p = P[turn].position, [dx, dz] = [0, 1].map(i => (U.diceAt(turn, 0)[i] + U.diceAt(turn, 1)[i]) / 2); return { go: [p.x, p.z], re: [dx, dz] }; };
    let lbOn = false;
    function labels() {
      const on = phase === 'choose' && !over && !stopped; LB.forEach(e => { e.style.display = on ? 'block' : 'none'; }); if (!on) { lbOn = false; return; }
      LB[0].textContent = '▶ ' + X.go; LB[1].textContent = '↻ ' + X.re + ' ×' + RR[turn];
      if (lbOn) return; lbOn = true;
      (function tick() { if (!(phase === 'choose' && !over && !stopped)) { lbOn = false; LB.forEach(e => { e.style.display = 'none'; }); return; }
        const sp = spots(), a = T3.project(sp.go[0], sp.go[1], U.top + 4.6), b = T3.project(sp.re[0], sp.re[1] + 1.9, U.top);   // (under the dice, clear of them at any size of screen: the label hangs below the dice's near edge)
        if (a) { LB[0].style.left = a.x + 'px'; LB[0].style.top = a.y + 'px'; } if (b) { LB[1].style.left = b.x + 'px'; LB[1].style.top = b.y + LB[1].offsetHeight / 2 + 8 + 'px'; }
        requestAnimationFrame(tick); })();
    }
    const choose = re => { if (phase !== 'choose' || busy || over) return; if (re && RR[turn] > 0) { RR[turn]--; phase = 'roll'; dice = null; doRoll(); } else move(turn, dice); };
    function onClick(e) { if (stopped || busy || over || (T3.wasDrag && T3.wasDrag())) return;
      if (phase === 'choose') { const p = T3.pick(e, U.top); if (!p) return; const sp = spots(), dg = Math.hypot(p.x - sp.go[0], p.z - sp.go[1]), dr = Math.hypot(p.x - sp.re[0], p.z - sp.re[1]);
        if (Math.min(dg, dr) > 6) return; choose(dr < dg); return; }
      if (phase === 'roll' && hum(turn)) doRoll(); }
    function onHud(e) { const b = e.target.closest && e.target.closest('[data-gsm]'); if (!b || stopped) return; e.stopPropagation(); if (phase === 'choose') choose(b.dataset.gsm === 're'); else if (phase === 'roll' && hum(turn)) doRoll(); }
    const onKey = e => { if (e.repeat) return; if (phase === 'choose' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); choose(false); } else if (phase === 'choose' && (e.key === 'r' || e.key === 'R')) choose(true); else if (e.key === ' ' && phase === 'roll' && hum(turn)) { e.preventDefault(); doRoll(); } };
    ctx.el.addEventListener('click', onClick); document.addEventListener('click', onHud, true); document.addEventListener('keydown', onKey);
    settle(); hud(); toast(X.hc.replace('{a}', RR[0]).replace('{b}', RR[1])); later(() => { toast(X.first.replace('{p}', nm(first))); nextTurn(first); }, 1700);
    const api = {
      stop() { stopped = true; timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('click', onHud, true); document.removeEventListener('keydown', onKey); if (toastEl) toastEl.remove(); LB.forEach(e => e.remove()); B.remove(G); },
      canResign: () => !over, resign() { if (!over) end(pvp ? 1 - turn : 1); },
      canUndo: () => false, undo() {}, canHint: () => false, hint: () => Promise.resolve(false),
      _debug: { rr: () => RR.slice(), choose, pos: () => pos.slice(), rest: () => rest.slice(), phase: () => phase, turn: () => turn, dice: () => dice, plan, set(s, n) { pos[s] = n; settle(); hud(); } },
    };
    window.__gooseMuseum = api;
    return api;
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.goose = { levels: 20, sides: true, modes: ['ai', 'pvp'], levelInfo: n => ({ name: REROLL[n] ? '↻ ' + REROLL[n][0] + ' : ' + REROLL[n][1] : '' }), start, plan, REROLL };
})();
