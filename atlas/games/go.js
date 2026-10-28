/* =====================================================================
   Go (囲碁) on the portal.
   · The board card (levels, sides, modes, board size): level names come from the game
     (levels 1 … 27 labelled like go/app.js RANKS: 18級 … 1級, 初段 … 八段, then the strongest),
     ratings = the game's RT_LV (450 + 100 per step).
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D go board (atlas/models/goban.js,
     the look chosen in the game's 3D skin, 'atlas-go-look') with the full game's rules and AI:
     ../go/rules.js (captures, no suicide, ko + positional superko, Japanese counting) on the page
     and ../go/engine.js as a Worker, asked exactly as go/app.js asks it
     ({ type:'think', spec:{n}, moves, komi, level }). Boards 9 / 13 / 19, komi = GoRules.defaultKomi,
     a pass button in the HUD; two passes in a row end the game: the engine's 'territory' job
     (net 'light') finds the dead stones and GoRules.score counts (territory + prisoners + komi).
     ctx.mode 'pvp': two players take turns on one device (black first).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../go/', RULES = BASE + 'rules.js?v=2', ENGINE = BASE + 'engine.js?v=7';   // same files / versions as go/index.html + go/app.js → shared cache
  let rulesP = null;
  function loadRules() {
    if (window.GoRules) return Promise.resolve(window.GoRules);
    return rulesP || (rulesP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = RULES;
      s.onload = () => window.GoRules ? res(window.GoRules) : rej(new Error('rules'));
      s.onerror = () => { rulesP = null; rej(new Error('rules')); };
      document.head.appendChild(s);
    }));
  }
  // the game's own words (go/i18n.js)
  const TX = {"ja": {"p1": "黒", "p2": "白", "pass": "パス", "passed": "{c}がパスしました", "ko": "コウです。すぐには取り返せません（一度ほかに打ってから）", "suicide": "そこは着手禁止点です（打つと石が取られてしまう場所）", "superko": "同じ局面に戻る手は打てません", "byPts": "{c}の{p}勝ち", "draw": "持碁（引き分け）", "busy": "死に石を判定しています…", "pts": "{n}", "komiShort": "コミ{k}", "byWhy": "{c}の{w}勝ち", "resign": "中押し", "turn": "{c}の番"}, "en": {"p1": "Black", "p2": "White", "pass": "Pass", "passed": "{c} passed", "ko": "Ko: you cannot retake at once (play elsewhere first)", "suicide": "You cannot play there (the stone would have no liberties)", "superko": "That move would repeat an earlier position", "byPts": "{c} wins by {p}", "draw": "Draw (jigo)", "busy": "Finding the dead stones…", "pts": "{n} points", "komiShort": "Komi {k}", "byWhy": "{c} wins by {w}", "resign": "resignation", "turn": "{c} to play"}, "zh": {"p1": "黑", "p2": "白", "pass": "停一手", "passed": "{c}停一手", "ko": "打劫：不能立即提回（先在别处下一手）", "suicide": "此处禁着（落子后没有气）", "superko": "这手棋会重复之前的局面", "byPts": "{c}胜{p}", "draw": "和棋", "busy": "正在判断死子…", "pts": "{n}目", "komiShort": "贴目{k}", "byWhy": "{c}{w}胜", "resign": "中盘", "turn": "轮到{c}"}, "ko": {"p1": "흑", "p2": "백", "pass": "패스", "passed": "{c} 패스", "ko": "패: 바로 따낼 수 없습니다 (먼저 다른 곳에 두세요)", "suicide": "둘 수 없는 곳입니다 (활로가 없는 자리)", "superko": "이전 국면이 반복되는 수입니다", "byPts": "{c} {p} 승", "draw": "무승부", "busy": "사석을 판정하는 중…", "pts": "{n}집", "komiShort": "덤 {k}", "byWhy": "{c} {w}승", "resign": "불계", "turn": "{c} 차례"}, "es": {"p1": "Negro", "p2": "Blanco", "pass": "Pasar", "passed": "{c} ha pasado", "ko": "Ko: no puedes recapturar enseguida (juega antes en otro sitio)", "suicide": "No puedes jugar ahí (la piedra no tendría libertades)", "superko": "Esa jugada repetiría una posición anterior", "byPts": "Gana {c} por {p}", "draw": "Empate (jigo)", "busy": "Buscando las piedras muertas…", "pts": "{n} puntos", "komiShort": "Komi {k}", "byWhy": "Gana {c} por {w}", "resign": "abandono", "turn": "Juega {c}"}, "fr": {"p1": "Noir", "p2": "Blanc", "pass": "Passer", "passed": "{c} a passé", "ko": "Ko : vous ne pouvez pas reprendre tout de suite (jouez d'abord ailleurs)", "suicide": "Vous ne pouvez pas jouer là (la pierre n'aurait aucune liberté)", "superko": "Ce coup répéterait une position antérieure", "byPts": "{c} gagne de {p}", "draw": "Égalité (jigo)", "busy": "Recherche des pierres mortes…", "pts": "{n} points", "komiShort": "Komi {k}", "byWhy": "{c} gagne par {w}", "resign": "abandon", "turn": "{c} joue"}, "pt": {"p1": "Preto", "p2": "Branco", "pass": "Passar", "passed": "{c} passou", "ko": "Ko: não é possível recapturar de imediato (jogue antes em outro lugar)", "suicide": "Não é possível jogar aí (a pedra ficaria sem liberdades)", "superko": "Esse lance repetiria uma posição anterior", "byPts": "{c} vence por {p}", "draw": "Empate (jigo)", "busy": "Procurando as pedras mortas…", "pts": "{n} pontos", "komiShort": "Komi {k}", "byWhy": "{c} vence por {w}", "resign": "desistência", "turn": "Vez de {c}"}, "de": {"p1": "Schwarz", "p2": "Weiß", "pass": "Passen", "passed": "{c} hat gepasst", "ko": "Ko: Du darfst nicht sofort zurückschlagen (zuerst woanders spielen)", "suicide": "Dort darfst du nicht setzen (der Stein hätte keine Freiheiten)", "superko": "Dieser Zug würde eine frühere Stellung wiederholen", "byPts": "{c} gewinnt mit {p}", "draw": "Unentschieden (Jigo)", "busy": "Tote Steine werden ermittelt…", "pts": "{n} Punkte", "komiShort": "Komi {k}", "byWhy": "{c} gewinnt durch {w}", "resign": "Aufgabe", "turn": "{c} am Zug"}, "hi": {"p1": "काला", "p2": "सफ़ेद", "pass": "पास", "passed": "{c} ने पास किया", "ko": "को: आप तुरंत वापस नहीं पकड़ सकते (पहले कहीं और खेलें)", "suicide": "आप वहाँ नहीं खेल सकते (पत्थर की कोई स्वतंत्रता नहीं बचेगी)", "superko": "यह चाल पिछली स्थिति को दोहराएगी", "byPts": "{c} {p} से जीता", "draw": "बराबरी (जिगो)", "busy": "मृत पत्थर खोजे जा रहे हैं…", "pts": "{n} अंक", "komiShort": "कोमी {k}", "byWhy": "{c} {w} से जीता", "resign": "हार मानने", "turn": "{c} की बारी"}, "ar": {"p1": "الأسود", "p2": "الأبيض", "pass": "تمرير", "passed": "{c} مرّر", "ko": "كو: لا يمكنك الاستعادة فورًا (العب في مكان آخر أولًا)", "suicide": "لا يمكنك اللعب هناك (لن يبقى للحجر أي حرية)", "superko": "هذه النقلة ستكرر وضعًا سابقًا", "byPts": "فوز {c} بفارق {p}", "draw": "تعادل (جيغو)", "busy": "جارٍ تحديد الأحجار الميتة…", "pts": "{n} نقاط", "komiShort": "كومي {k}", "byWhy": "فوز {c} بـ{w}", "resign": "الاستسلام", "turn": "دور {c}"}};
  const SIZE_L = { ja: '碁盤', en: 'Board', zh: '棋盘', ko: '바둑판', es: 'Tablero', fr: 'Goban', pt: 'Tabuleiro', de: 'Brett', hi: 'बोर्ड', ar: 'الرقعة' };

  // a slate / shell stone set down on kaya: a sharp "pachi" and a short woody thud (respects the portal's sound switch)
  let AC = null;
  function pachi(v = 1) {
    try { if (localStorage.getItem('atlas-sfx') === '0') return; } catch (e) {}
    try {
      AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume();
      const t = AC.currentTime, n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * .05 | 0, AC.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
      n.buffer = b; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200 * v; bp.Q.value = 1.6;
      const g = AC.createGain(); g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); n.connect(bp).connect(g).connect(AC.destination); n.start(t);
      const o = AC.createOscillator(), og = AC.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(300 * v, t); o.frequency.exponentialRampToValueAtTime(130, t + .07);
      og.gain.setValueAtTime(.22, t); og.gain.exponentialRampToValueAtTime(.001, t + .1); o.connect(og).connect(AC.destination); o.start(t); o.stop(t + .12);
    } catch (e) {}
  }

  let cssDone = false;
  function css() {
    if (cssDone) return; cssDone = true;
    const s = document.createElement('style');
    s.textContent = `.gotoast{position:fixed;left:50%;bottom:calc(var(--tbclear,18px) + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;max-width:min(92vw,520px);padding:10px 18px;border-radius:99px;background:#2b3044;color:#fff;font-weight:700;font-size:14px;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);animation:goT .2s ease-out;pointer-events:none}
@keyframes goT{from{transform:translate(-50%,8px);opacity:0}}
.hud .gopass{flex:none;padding:7px 16px;font-size:14px;white-space:nowrap;box-shadow:0 3px 0 var(--coral2)}
.hud .gopass:disabled{opacity:.4;box-shadow:none}
.hud .hs b.gocap{font-size:15px;min-width:0;opacity:.75}
@media (max-width:560px){.hud .gopass{padding:6px 10px;font-size:13px}}`;
    document.head.appendChild(s);
  }

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, GB = T3.goban, t = ctx.t, X = TX[ctx.lang] || TX.en, lang = ctx.lang;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const n = [9, 13, 19].includes(+ctx.size) ? +ctx.size : 9;
    const board = T3.MODELS.go(true, { n }); T3.show('go', board);
    const U = board.userData, Y = U.top, c = U.cell;
    const tall = innerHeight > innerWidth * 1.15;   // phones held upright: the width decides, so frame a little wider and keep the board centred
    if (T3.fit) T3.fit(tall ? { w: U.W + 1.9, d: U.W + 3.4, y: Y - 1.3, pitch: 1.0 } : { w: U.W + .6, d: U.W + 3.4, y: Y - 2.4, pitch: 1.0 });   // the whole board from the player's side: the near side and the legs show
    const pvp = ctx.mode === 'pvp', human = pvp ? 1 : ctx.side === 2 ? 2 : 1, ai = 3 - human;
    const pname = col => col === 1 ? X.p1 : X.p2, fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] !== undefined ? o[k] : '');
    const pts = v => { v = Math.abs(Math.round(v * 2) / 2); return lang === 'ja' ? (v % 1 ? Math.floor(v) + '目半' : v + '目') : fmt(X.pts, { n: v % 1 ? v.toFixed(1) : String(v) }); };
    const xz = m => U.pt(m % n, Math.floor(m / n));

    let R = null, pos = null, komi = 6.5, moves = [], stopped = false, busy = true, over = false, worker = null, jobs = new Map(), jid = 0, toastEl = null, toastT = 0;
    let ply = 0, hintJ = 0, hintM = -1, aiWr = [];
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.turn - 1, { human: pvp || pos.turn === human, ply }); };   // HUD pills: black (left) 0, white 1
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(now) { if (stopped) return; const k = Math.min(1, Math.max(0, (now - t0) / dur)); f(k); if (T3.kick) T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };
    const kick = ms => { if (T3.kick) T3.kick(ms || 150); };

    /* ---------- the engine worker (same protocol as go/app.js: { type, id, … } → { type:'done', id, … }) ---------- */
    function request(msg) {
      if (!worker) {
        worker = new Worker(ENGINE);
        worker.onmessage = e => { const m = e.data, j = jobs.get(m.id); if (!j || m.type === 'progress') return; jobs.delete(m.id); j(m.superseded || m.error ? null : m); };
        worker.onerror = () => { jobs.forEach(j => j(null)); jobs.clear(); worker = null; };
      }
      return new Promise(res => { const id = ++jid; jobs.set(id, res); worker.postMessage(Object.assign({ id, spec: { n }, moves: moves.slice(), komi }, msg)); });
    }

    /* ---------- stones ---------- */
    const stones = new TH.Group(), marks = new TH.Group(), terr = new TH.Group(); board.add(stones, marks, terr);
    const st = {};   // point → group
    function place(m, col, animate) {
      const g = new TH.Group(), s = GB.stone(col, c, m * 7 + col), sh = T3.contact(c * .47, .5); sh.position.y = .002; g.add(sh, s); g.userData.s = s; g.userData.sh = sh; g.userData.c = col;
      const [x, z] = xz(m); g.position.set(x, Y, z); stones.add(g); st[m] = g;
      if (!animate) return 0;
      const z0 = c * .45, h0 = c * 1.1; s.position.set(0, h0, z0); s.rotation.x = -.4; sh.material.opacity = 0;
      anim(300, k => {
        const e = 1 - Math.pow(1 - k, 3), hh = k < .72 ? h0 * (1 - Math.pow(k / .72, 2)) : 0;
        s.position.y = hh; s.position.z = z0 * (1 - e); s.rotation.x = -.4 * (1 - Math.min(1, k / .72)); sh.material.opacity = .5 * Math.min(1, k * 1.3);
        if (k > .72) { const q = (k - .72) / .28, sq = Math.sin(q * Math.PI) * .06; s.scale.set(1 + sq, 1 - sq * 1.6, 1 + sq); }
      }, () => { s.position.set(0, 0, 0); s.rotation.x = 0; s.scale.set(1, 1, 1); });
      later(() => pachi(col === 1 ? 1 : 1.12), 215);
      return 320;
    }
    function drop(m) { const g = st[m]; if (!g) return; stones.remove(g); g.userData.sh.material.dispose(); delete st[m]; }
    function capture(list, delay) {   // the captured stones are picked up: they rise a little and shrink away
      list.forEach((m, i) => later(() => {
        const g = st[m]; if (!g) return; delete st[m];
        const s = g.userData.s, sh = g.userData.sh;
        anim(260, k => { s.position.y = c * .6 * k; s.scale.setScalar(Math.max(.01, 1 - k)); sh.material.opacity = .5 * (1 - k); }, () => { stones.remove(g); sh.material.dispose(); });
        if (i < 4) pachi(1.5 + i * .1);
      }, delay + i * 40));
    }
    function redraw() { Object.keys(st).forEach(k => drop(+k)); for (let i = 0; i < n * n; i++) if (pos.b[i]) place(i, pos.b[i], false); kick(300); }

    /* ---------- marks: the last move, the hint, the counted territory, dead stones ---------- */
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xff3b2b, .95), tb: basic(0x15161a, .88), tw: basic(0xfaf7ee, .95), deadB: null, deadW: null };
    const GEO = { last: new TH.CylinderGeometry(c * .13, c * .13, .01, 24), terr: new TH.BoxGeometry(c * .36, .012, c * .36) };
    const H = c * .47 * GB.SH * 2;   // stone height
    let pulsing = [], pulseOn = false;
    function clearMarks() { while (marks.children.length) marks.remove(marks.children[0]); pulsing = []; kick(); }
    function addMark(geo, mat, m, y, grp) { const k = new TH.Mesh(geo, mat), [x, z] = xz(m); k.position.set(x, Y + y, z); k.renderOrder = 3; (grp || marks).add(k); return k; }
    function showMarks() {
      clearMarks(); hintM = -1; hintJ++;
      const lm = moves.length ? moves[moves.length - 1] : -1;
      if (lm >= 0 && pos.b[lm]) addMark(GEO.last, MAT.last, lm, H + .004);
    }
    function pulse() { if (stopped || !pulsing.length) { pulseOn = false; return; } const now = performance.now(); pulsing.forEach(m => m.userData.tick(now)); kick(60); requestAnimationFrame(pulse); }
    function deadMat(col) {
      const k = col === 1 ? 'deadB' : 'deadW'; if (MAT[k]) return MAT[k];
      const m = GB.stoneMat(col).clone(); m.transparent = true; m.opacity = .42; m.depthWrite = false; return (MAT[k] = m);
    }
    function showCount(dead, own) {   // dead stones turn translucent, every point of territory gets a small square of its owner's colour
      while (terr.children.length) terr.remove(terr.children[0]);
      dead.forEach(m => { const g = st[m]; if (g) g.userData.s.material = deadMat(g.userData.c); });
      for (let i = 0; i < n * n; i++) {
        const o = own[i]; if ((o !== 1 && o !== 2) || (pos.b[i] && !dead.includes(i))) continue;
        const k = addMark(GEO.terr, o === 1 ? MAT.tb : MAT.tw, i, .008, terr); k.scale.setScalar(.01);
        later(() => anim(220, q => k.scale.setScalar(.01 + q * .99)), 30 + (i % n + Math.floor(i / n)) * 18);
      }
      kick(600);
    }

    /* ---------- HUD (black pill · pass · white pill) ---------- */
    let msgNow = '';
    function hud(msg) {
      if (msg !== undefined) msgNow = msg || '';
      const side = col => `<span class="hs ${pos && pos.turn === col && !over ? 'on' : ''}"><i class="dk ${col === 1 ? 'b' : 'w'}"></i>${pvp ? pname(col) : col === human ? L.you : L.ai}${pos ? `<b class="gocap" title="">${pos.caps[col]}</b>` : ''}</span>`;
      const canPass = myTurn();
      ctx.hud(`${side(1)}<span class="hm">${msgNow}</span><button type="button" class="btn gopass" data-gop="pass" ${canPass ? '' : 'disabled'}>${X.pass}</button>${side(2)}`);
    }
    function toast(msg) {
      css(); if (toastEl) toastEl.remove(); clearTimeout(toastT);
      toastEl = document.createElement('div'); toastEl.className = 'gotoast'; toastEl.textContent = msg; document.body.appendChild(toastEl);
      const el = toastEl; toastT = setTimeout(() => { el.remove(); if (toastEl === el) toastEl = null; }, 2600);
    }

    /* ---------- flow ---------- */
    const myTurn = () => !!pos && !over && !busy && (pvp || pos.turn === human);
    function play(m) {   // → ms to wait for the stone to land (0: pass)
      const col = pos.turn, r = pos.tryPlay(m); if (!r) return -1;
      moves.push(m); pos = r.pos; ply++; onTurn();
      if (m === R.PASS) { showMarks(); toast(fmt(X.passed, { c: pname(col) })); return 0; }
      const w = place(m, col, true);
      if (r.captured.length) capture(r.captured, 260);
      showMarks(); return w + (r.captured.length ? 120 : 0);
    }
    function next() {
      if (stopped || over) return;
      const k = moves.length;
      if (k >= 2 && moves[k - 1] === R.PASS && moves[k - 2] === R.PASS) return count();
      showMarks(); onTurn();
      if (pvp) { busy = false; hud(fmt(X.turn, { c: pname(pos.turn) })); return; }
      if (pos.turn === human) { busy = false; hud(k && moves[k - 1] === R.PASS ? fmt(X.passed, { c: pname(ai) }) : L.turn); return; }
      aiMove();
    }
    function aiMove() {
      busy = true; hud(L.think);
      const t0 = Date.now(), k = moves.length;
      request({ type: 'think', preempt: true, level: ctx.level }).then(res => {
        if (stopped || over || moves.length !== k) return;
        let m = res && typeof res.move === 'number' ? res.move : R.PASS;
        if (res && typeof res.wr === 'number') aiWr[k] = res.wr;
        if (res && aiResigns(res)) return;
        if (m !== R.PASS && !pos.legal(m)) m = R.PASS;
        later(() => { if (over || moves.length !== k) return; const w = play(m); later(next, Math.max(0, w) + 60); }, Math.max(0, 420 - (Date.now() - t0)));
      });
    }
    // the AI resigns when hopeless (dan levels sooner, kyu levels only when far behind) — like go/app.js
    function aiResigns(res) {
      const lv = ctx.level, k = moves.length;
      if (lv < 4 || k < n * n * .35) return false;
      const lost = (res.wr < .03 && res.lead < -(lv >= 16 ? 8 : 20)) || res.lead < -(n * n * .25);
      if (!lost) return false;
      const prev = aiWr.slice(0, k).filter(x => typeof x === 'number').slice(-2);
      if (prev.length < 2 || prev.some(x => x > .08)) return false;
      const wt = fmt(X.byWhy, { c: pname(human), w: X.resign });
      over = true; busy = false; if (ctx.onTurn) ctx.onTurn(-1); hud(L.win);
      later(() => ctx.onEnd({ win: true, draw: false, level: ctx.level, score: wt }), 500);
      return true;
    }
    // both passed: the engine marks the dead stones, then Japanese counting (territory + prisoners, komi for White)
    function count() {
      busy = true; hud(X.busy); if (ctx.onTurn) ctx.onTurn(-1);
      request({ type: 'territory', preempt: true, net: 'light' }).then(r => {
        if (stopped || over) return;
        const dead = r && Array.isArray(r.dead) ? r.dead : [], sc = R.score(pos, dead, 'jp', komi);
        showCount(dead, sc.own);
        end(sc);
      });
    }
    function end(sc) {
      over = true; busy = false; showMarks();
      const draw = sc.diff === 0, winner = sc.diff > 0 ? 1 : 2;
      const res = draw ? X.draw : fmt(X.byPts, { c: pname(winner), p: pts(sc.diff) });
      const detail = `${X.p1} ${sc.b} · ${X.p2} ${sc.w} (${fmt(X.komiShort, { k: komi })})`;
      if (pvp) { hud(res); later(() => ctx.onEnd({ win: false, draw, level: ctx.level, score: detail, pvp: true, winnerText: draw ? '' : res }), 2200); return; }
      const win = !draw && winner === human;
      hud(draw ? L.draw : win ? L.win : L.lose);
      later(() => ctx.onEnd({ win, draw, level: ctx.level, score: res + ' — ' + detail }), 2200);
    }

    /* ---------- input ---------- */
    function pointOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      const h = (n - 1) / 2, fi = p.x / c + h, fj = p.z / c + h, i = Math.round(fi), j = Math.round(fj);
      if (i < 0 || i >= n || j < 0 || j >= n || Math.hypot(fi - i, fj - j) > .6) return -1;
      return j * n + i;
    }
    function illegalWhy(m) {
      if (m === pos.ko) return X.ko;
      const p = pos.clone(); p.ko = -1; p.seen = null;
      return p.tryPlay(m, 0, true) === null ? X.suicide : X.superko;
    }
    function onClick(e) {
      if (over || busy || !pos || T3.wasDrag() || (e.target.closest && e.target.closest('.hud,.tbar'))) return;
      if (!pvp && pos.turn !== human) return;
      const m = pointOf(e); if (m < 0 || pos.b[m]) return;
      if (!pos.legal(m)) { toast(illegalWhy(m)); pachi(.6); return; }
      busy = true; const w = play(m); hud(''); later(next, w + 60);
    }
    function onHud(e) {
      const b = e.target.closest && e.target.closest('[data-gop]'); if (!b || stopped) return;
      e.stopPropagation();
      if (b.dataset.gop === 'pass' && myTurn()) { busy = true; play(R.PASS); hud(''); later(next, 300); }
    }
    ctx.el.addEventListener('click', onClick);
    document.addEventListener('click', onHud, true);

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; jid++;
      Object.keys(st).forEach(k => drop(+k)); while (terr.children.length) terr.remove(terr.children[0]);
      komi = R.defaultKomi(n, 'jp');
      moves = []; aiWr = []; pos = R.Pos.from({ n }); over = false; busy = true;
      hud(''); toast(`${n}×${n} · ${fmt(X.komiShort, { k: komi })}`);
      later(next, 650);
    }
    hud('');
    loadRules().then(r => { if (stopped) return; R = r; begin(); }).catch(() => hud('⚠'));

    // test hooks (positions on screen, state)
    const dbg = {
      at: m => { const [x, z] = xz(m); return T3.project(x, z, Y); },
      state: () => ({ n, komi, hint: hintM, moves: moves.slice(), turn: pos && pos.turn, human, over, busy, pvp, stones: Object.keys(st).length, board: pos ? Array.from(pos.b) : null, caps: pos ? pos.caps.slice() : null, terr: terr.children.length }),
    };
    window.Atlas3D.go._dbg = dbg;
    /* ---------- 待った · 投了 · ヒント · time-out (the portal's action bar) ---------- */
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {   // resign / time-out: colour `loser` (1 black, 2 white) loses
      if (over || !pos) return;
      over = true; busy = false; jid++; showMarks(); if (ctx.onTurn) ctx.onTurn(-1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = fmt(X.byWhy, { c: pname(3 - loser), w: why === 'time' ? r : X.resign }); hud(wt); return later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: pname(loser), r, w: wt }), pvp: true, winnerText: wt }), 200); }
      hud(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r }), 200);
    }
    const api = {
      human: human - 1,
      canUndo: () => myTurn() && moves.length >= undoN() + (pvp || human === 1 ? 0 : 1),
      undo() {
        if (!api.canUndo()) return;
        timers.forEach(clearTimeout); timers.length = 0; jid++;
        moves.splice(moves.length - undoN());
        let p = R.Pos.from({ n }); for (const m of moves) p = p.tryPlay(m).pos; pos = p;
        ply++; redraw();
        busy = true; next();
      },
      canHint: () => myTurn(),
      hint() {
        if (!myTurn()) return Promise.resolve(false);
        const j = ++hintJ, k = moves.length;
        return request({ type: 'analyze', net: 'light', visits: 40, time: 1500 }).then(r => {
          if (stopped || j !== hintJ || over || moves.length !== k) return true;
          const best = r && r.list && r.list.find(q => q.m !== R.PASS && pos.legal(q.m));
          if (!best) return false;
          hintM = best.m;
          const g = GB.tapMark(c), [x, z] = xz(best.m); g.position.set(x, Y, z); marks.add(g);   // the same vivid "here" marker as gomoku's
          pulsing.push(g); if (!pulseOn) { pulseOn = true; pulse(); }
          later(() => { pulsing = pulsing.filter(q => q !== g); kick(); }, 2600);   // it pulses a few times, then stays lit (no idle loop)
          return true;
        });
      },
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.turn : human, 'resign'); },
      timeout(side) { finish(side + 1, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout); clearTimeout(toastT); if (toastEl) toastEl.remove();
        ctx.el.removeEventListener('click', onClick); document.removeEventListener('click', onHud, true);
        if (worker) worker.terminate(); worker = null; jobs.clear();
        Object.values(MAT).forEach(m => m && m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.go._dbg === dbg) delete window.Atlas3D.go._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card ---------- */
  const LVN = {"ja": {"kyu": "{n}級", "dan": ["初段", "二段", "三段", "四段", "五段", "六段", "七段", "八段"], "top": ["アマ最強", "プロ級", "最強"], "lvd": ["はじめての方", "ルールを覚えた方", "対局に慣れた方", "腕に自信のある方", "高段者・腕試し"]}, "en": {"kyu": "{n} kyu", "dan": ["1 dan", "2 dan", "3 dan", "4 dan", "5 dan", "6 dan", "7 dan", "8 dan"], "top": ["Top amateur", "Pro level", "Strongest"], "lvd": ["New to Go", "Know the rules", "Regular players", "Strong players", "Strong players"]}, "zh": {"kyu": "{n}级", "dan": ["初段", "二段", "三段", "四段", "五段", "六段", "七段", "八段"], "top": ["业余顶尖", "职业级", "最强"], "lvd": ["围棋新手", "已了解规则", "常下棋的棋手", "实力较强的棋手", "高段棋手"]}, "ko": {"kyu": "{n}급", "dan": ["1단", "2단", "3단", "4단", "5단", "6단", "7단", "8단"], "top": ["아마 최강", "프로급", "최강"], "lvd": ["바둑이 처음인 분", "규칙을 아는 분", "대국에 익숙한 분", "실력에 자신 있는 분", "고단자"]}, "es": {"kyu": "{n} kyu", "dan": ["1 dan", "2 dan", "3 dan", "4 dan", "5 dan", "6 dan", "7 dan", "8 dan"], "top": ["Aficionado top", "Nivel pro", "El más fuerte"], "lvd": ["Nuevos en el Go", "Conocen las reglas", "Jugadores habituales", "Jugadores fuertes", "Jugadores fuertes"]}, "fr": {"kyu": "{n} kyu", "dan": ["1 dan", "2 dan", "3 dan", "4 dan", "5 dan", "6 dan", "7 dan", "8 dan"], "top": ["Amateur de pointe", "Niveau pro", "Le plus fort"], "lvd": ["Débutants au go", "Connaissent les règles", "Joueurs réguliers", "Joueurs forts", "Joueurs forts"]}, "pt": {"kyu": "{n} kyu", "dan": ["1 dan", "2 dan", "3 dan", "4 dan", "5 dan", "6 dan", "7 dan", "8 dan"], "top": ["Amador de elite", "Nível pro", "O mais forte"], "lvd": ["Novos no Go", "Conhecem as regras", "Jogadores frequentes", "Jogadores fortes", "Jogadores fortes"]}, "de": {"kyu": "{n} Kyu", "dan": ["1 Dan", "2 Dan", "3 Dan", "4 Dan", "5 Dan", "6. Dan", "7. Dan", "8. Dan"], "top": ["Spitzenamateur", "Profiniveau", "Stärkste Stufe"], "lvd": ["Neu beim Go", "Kennen die Regeln", "Regelmäßige Spieler", "Starke Spieler", "Starke Spieler"]}, "hi": {"kyu": "{n} क्यू", "dan": ["1 डान", "2 डान", "3 डान", "4 डान", "5 डान", "6 दान", "7 दान", "8 दान"], "top": ["शीर्ष शौकिया", "प्रो स्तर", "सबसे मज़बूत"], "lvd": ["गो में नए", "नियम जानते हैं", "नियमित खिलाड़ी", "मज़बूत खिलाड़ी", "मज़बूत खिलाड़ी"]}, "ar": {"kyu": "{n} كيو", "dan": ["1 دان", "2 دان", "3 دان", "4 دان", "5 دان", "6 دان", "7 دان", "8 دان"], "top": ["أقوى الهواة", "مستوى المحترفين", "الأقوى"], "lvd": ["جدد على غو", "يعرفون القواعد", "لاعبون منتظمون", "لاعبون أقوياء", "لاعبون أقوياء"]}};
  // same as go/app.js RANKS (ranks measured against KataGo's human-like model, see go/MODEL_CARD.md)
  const RANKS = [null, 'k18', 'k17', 'k16', 'k15', 'k14', 'k13', 'k12', 'k11', 'k10', 'k9', 'k8', 'k7', 'k6', 'k5', 'k4', 'k3', 'k2', 'k1', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 't1'];
  function levelInfo(i, lang) {   // i = 1..27
    const L = LVN[lang] || LVN.en, r = RANKS[i], v = +r.slice(1), rv = r[0] === 'k' ? 1 - v : r[0] === 'd' ? v : 8 + v;
    const name = r[0] === 'k' ? L.kyu.replace('{n}', v) : r[0] === 'd' ? L.dan[v - 1] : L.top[v - 1];
    return { name, desc: '', rating: 1850 + 100 * rv, who: L.lvd[rv <= -12 ? 0 : rv <= -6 ? 1 : rv <= 0 ? 2 : rv <= 5 ? 3 : 4] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.go = { levels: 27, sides: true, modes: ['ai', 'rated', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'byo', sizes: [9, 13, 19], sizeLabel: l => SIZE_L[l] || SIZE_L.en, levelInfo, start };   // table: start() plays on the chabudai itself
})();
