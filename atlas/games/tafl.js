/* =====================================================================
   Hnefatafl on the portal.
   · The board card (levels, sides, modes, board size): level names come from the game
     (tafl/i18n.js: 15級 … 1級, 初段 … 五段 = levels 1 … 20), ratings = the game's RT_LV.
     Board size picks the rule set: 11 × 11 Copenhagen (the default), 9 × 9 Tablut, 7 × 7 Brandubh; the picker shows just 7×7 / 9×9 / 11×11.
     Side: first = the attackers (they move first), second = the defenders with the king.
   · Table play (ちゃぶ台で遊ぶ): start(ctx) plays on the 3D board (Table3D.MODELS.tafl) with
     the full game's rules and AI — ../tafl/engine.js on the page (moves, captures, shieldwall,
     edge fort, encirclement, repetition) and the same file as a Worker (WebAssembly search,
     levels 1..20), asked exactly as tafl/app.js asks it ({ type:'think', start, moves, level, v }).
     ctx.mode 'pvp': two players take turns on one device (attackers first).
   Rendering is on demand: animations kick Table3D; nothing loops while idle.
   ===================================================================== */
(function () {
  'use strict';
  const BASE = '../tafl/', VER = '?v=1';   // same file / version as tafl/index.html → shared cache
  let engP = null;
  function loadEngine() {
    if (window.TaflEngine) return Promise.resolve(window.TaflEngine);
    return engP || (engP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = BASE + 'engine.js' + VER;
      s.onload = () => window.TaflEngine ? res(window.TaflEngine) : rej(new Error('engine'));
      s.onerror = () => { engP = null; rej(new Error('engine')); };
      document.head.appendChild(s);
    }));
  }
  // the game's own words (tafl/i18n.js): level names, the two sides, whose turn / who won, how a game ends, rule sets
  const TX = {"ja":{"kyu":"{n}級","dan":["初段","二段","三段","四段","五段"],"n":["攻め手","守り手"],"turn":"{c}の番","win":"{c}の勝ち","why":{"escape":"王が脱出しました","fort":"破られない砦（エッジフォート）ができました","capture":"王が捕らえられました","encircle":"守り手が完全に包囲されました","block":"動かせる駒がなくなりました","rep":"同じ局面が3回現れました（守り手の負け）","long":"駒取りがないまま200手が過ぎました"},"rule":{"copenhagen":"コペンハーゲン","brandubh":"ブランドゥブ","tablut":"タブルット"}},"en":{"kyu":"{n} kyu","dan":["1 dan","2 dan","3 dan","4 dan","5 dan"],"n":["Attackers","Defenders"],"turn":"{c} to move","win":"{c} win","why":{"escape":"The king escaped","fort":"An unbreakable edge fort was built","capture":"The king was captured","encircle":"Every defender was encircled","block":"No legal move left","rep":"The same position appeared three times (the defenders lose)","long":"200 moves without a capture"},"rule":{"copenhagen":"Copenhagen","brandubh":"Brandubh","tablut":"Tablut"}},"zh":{"kyu":"{n}级","dan":["初段","二段","三段","四段","五段"],"n":["攻方","守方"],"turn":"轮到{c}","win":"{c}获胜","why":{"escape":"王成功逃脱","fort":"筑成了无法攻破的边堡","capture":"王被擒获","encircle":"守方全部被包围","block":"没有可走的棋子","rep":"同一局面出现了三次（守方负）","long":"200手未吃子"},"rule":{"copenhagen":"哥本哈根","brandubh":"Brandubh","tablut":"Tablut"}},"ko":{"kyu":"{n}급","dan":["초단","2단","3단","4단","5단"],"n":["공격 측","수비 측"],"turn":"{c} 차례","win":"{c} 승리","why":{"escape":"왕이 탈출했습니다","fort":"깨지지 않는 가장자리 요새(엣지 포트)가 완성되었습니다","capture":"왕이 잡혔습니다","encircle":"수비 측이 완전히 포위되었습니다","block":"움직일 수 있는 말이 없습니다","rep":"같은 국면이 3번 나왔습니다(수비 측 패배)","long":"잡기 없이 200수가 지났습니다"},"rule":{"copenhagen":"코펜하겐","brandubh":"브란두브","tablut":"타블루트"}},"es":{"kyu":"{n} kyu","dan":["1 dan","2 dan","3 dan","4 dan","5 dan"],"n":["Atacantes","Defensores"],"turn":"Juega {c}","win":"Ganan los {c}","why":{"escape":"El rey escapó","fort":"Se formó un fuerte en el borde imposible de romper","capture":"El rey fue capturado","encircle":"Todos los defensores quedaron cercados","block":"No queda ninguna jugada legal","rep":"La misma posición apareció tres veces (pierden los defensores)","long":"200 jugadas sin captura"},"rule":{"copenhagen":"Copenhague","brandubh":"Brandubh","tablut":"Tablut"}},"fr":{"kyu":"{n} kyu","dan":["1 dan","2 dan","3 dan","4 dan","5 dan"],"n":["Attaquants","Défenseurs"],"turn":"Aux {c} de jouer","win":"Les {c} gagnent","why":{"escape":"Le roi s’est échappé","fort":"Un fort de bord imprenable a été construit","capture":"Le roi a été capturé","encircle":"Tous les défenseurs ont été encerclés","block":"Plus aucun coup légal","rep":"La même position trois fois (les défenseurs perdent)","long":"200 coups sans prise"},"rule":{"copenhagen":"Copenhague","brandubh":"Brandubh","tablut":"Tablut"}},"pt":{"kyu":"{n} kyu","dan":["1 dan","2 dan","3 dan","4 dan","5 dan"],"n":["Atacantes","Defensores"],"turn":"Vez das {c}","win":"Vitória dos {c}","why":{"escape":"O rei escapou","fort":"Foi construído um forte de borda inquebrável","capture":"O rei foi capturado","encircle":"Todos os defensores foram cercados","block":"Nenhum lance legal restante","rep":"A mesma posição apareceu três vezes (os defensores perdem)","long":"200 lances sem captura"},"rule":{"copenhagen":"Copenhague","brandubh":"Brandubh","tablut":"Tablut"}},"de":{"kyu":"{n} Kyu","dan":["1 Dan","2 Dan","3 Dan","4 Dan","5 Dan"],"n":["Angreifer","Verteidiger"],"turn":"{c} am Zug","win":"Die {c} gewinnen","why":{"escape":"Der König ist entkommen","fort":"Eine unzerstörbare Randfestung wurde gebaut","capture":"Der König wurde gefangen","encircle":"Alle Verteidiger wurden eingekreist","block":"Kein legaler Zug mehr","rep":"Dieselbe Stellung kam dreimal vor (die Verteidiger verlieren)","long":"200 Züge ohne Schlagen"},"rule":{"copenhagen":"Kopenhagen","brandubh":"Brandubh","tablut":"Tablut"}},"hi":{"kyu":"{n} क्यू","dan":["1 डैन","2 डैन","3 डैन","4 डैन","5 डैन"],"n":["आक्रमणकारी","रक्षक"],"turn":"{c} की बारी","win":"{c} जीते","why":{"escape":"राजा भाग निकला","fort":"किनारे पर न टूटने वाला किला बन गया","capture":"राजा पकड़ा गया","encircle":"सभी रक्षक घेर लिए गए","block":"कोई वैध चाल नहीं बची","rep":"एक ही स्थिति तीन बार आई (रक्षक हारे)","long":"बिना पकड़ के 200 चालें"},"rule":{"copenhagen":"कोपेनहेगन","brandubh":"ब्रांडुब","tablut":"ताब्लुट"}},"ar":{"kyu":"{n} كيو","dan":["1 دان","2 دان","3 دان","4 دان","5 دان"],"n":["المهاجمون","المدافعون"],"turn":"دور {c}","win":"فاز {c}","why":{"escape":"هرب الملك","fort":"بُني حصن على الحافة لا يمكن كسره","capture":"أُسر الملك","encircle":"طُوِّق جميع المدافعين","block":"لا توجد نقلة قانونية","rep":"تكرر الوضع نفسه ثلاث مرات (خسارة المدافعين)","long":"200 نقلة دون أسر"},"rule":{"copenhagen":"كوبنهاغن","brandubh":"براندوب","tablut":"تابلوت"}}};
  const SIZE_L = { ja: 'ルール', en: 'Rules', zh: '规则', ko: '규칙', es: 'Reglas', fr: 'Règles', pt: 'Regras', de: 'Regeln', hi: 'नियम', ar: 'القواعد' };
  const VAR = { 11: 'copenhagen', 9: 'tablut', 7: 'brandubh' };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  // a turned wooden piece set down on oak: a dull knock (respects the portal's sound switch)
  let AC = null;
  function knock(v = 1) {
    try { if (localStorage.getItem('atlas-sfx') === '0') return; } catch (e) {}
    try {
      AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume();
      const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter();
      o.type = 'triangle'; o.frequency.setValueAtTime(210 * v, t); o.frequency.exponentialRampToValueAtTime(95 * v, t + .07);
      lp.type = 'lowpass'; lp.frequency.value = 1500;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18, t + .004); g.gain.exponentialRampToValueAtTime(.001, t + .11);
      o.connect(lp).connect(g).connect(AC.destination); o.start(t); o.stop(t + .12);
    } catch (e) {}
  }
  function horn() {   // a short low horn call when the king escapes
    try { if (localStorage.getItem('atlas-sfx') === '0') return; } catch (e) {}
    try {
      AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume();
      const t = AC.currentTime;
      [[147, 0, .5], [196, .32, .8]].forEach(([f, d, len]) => { const o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 700;
        g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.09, t + d + .08); g.gain.setValueAtTime(.09, t + d + len - .15); g.gain.exponentialRampToValueAtTime(.001, t + d + len); o.connect(lp).connect(g).connect(AC.destination); o.start(t + d); o.stop(t + d + len + .05); });
    } catch (e) {}
  }

  function start(ctx) {
    const T3 = ctx.Table3D, TH = window.THREE, t = ctx.t, X = TX[ctx.lang] || TX.en;
    const L = { you: t('p.you'), ai: t('p.ai'), turn: t('p.turn'), think: t('p.think'), win: t('res.win'), lose: t('res.lose'), draw: t('res.draw') };
    const n = VAR[ctx.size] ? ctx.size : 11, v = VAR[n];
    const board = T3.MODELS.tafl(true, { n }); T3.show('tafl', board);
    const U = board.userData, Y = U.top, S = U.S, cs = U.cs;
    if (T3.fit) T3.fit({ w: S + 1.3, d: S + 1.8, y: Y + .3, pitch: 1.0 });   // the whole board, large, from the player's side
    const pvp = ctx.mode === 'pvp';
    const human = pvp ? 0 : ctx.side === 2 ? 1 : 0;   // engine sides: 0 = attackers (P1, first), 1 = defenders
    const mover = () => pvp && pos ? pos.side : human;
    const xz = i => U.cell(i % n, Math.floor(i / n));

    let E = null, pos = null, hashes = [], legal = [], moves = [];
    let stopped = false, busy = true, over = false, thinking = false, sel = -1, worker = null, jid = 0, ply = 0, hintW = null, hintJ = 0, hintMv = -1;
    const onTurn = () => { if (ctx.onTurn && pos) ctx.onTurn(pos.side, { human: pvp || pos.side === human, ply }); };   // HUD pills: attackers (left) 0, defenders 1
    const timers = [], later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const anim = (dur, f, done) => { const t0 = performance.now(); (function s(nw) { if (stopped) return; const k = Math.min(1, Math.max(0, (nw - t0) / dur)); f(k); if (T3.kick) T3.kick(120); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); };

    /* ---------- marks (last move, selection, destinations, captures, the king's open lines) ---------- */
    const hl = new TH.Group(), mv = new TH.Group(); board.add(hl, mv);
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const MAT = { last: basic(0xffcf3a, .4), sel: basic(0x2fd17a, .5), dot: basic(0x1f9e5a, .8), cap: basic(0xe0402a, .9), esc: basic(0x3fa8ff, .85), line: basic(0x3fa8ff, .22), hint: basic(0xff7a1a, .95), hintT: basic(0xffb03a, .42), win: basic(0xffd24a, .6) };
    const GEO = { tile: new TH.BoxGeometry(cs * .94, .012, cs * .94), dot: new TH.CylinderGeometry(cs * .14, cs * .14, .012, 24), ring: new TH.TorusGeometry(cs * .38, cs * .05, 8, 40) };
    GEO.ring.rotateX(Math.PI / 2);
    function mark(group, geo, mat, sq, y = .008) { if (T3.kick) T3.kick(150); const m = new TH.Mesh(geo, mat); const [x, z] = xz(sq); m.position.set(x, Y + y, z); m.renderOrder = 2; group.add(m); return m; }
    const clear = g => { while (g.children.length) g.remove(g.children[0]); if (T3.kick) T3.kick(150); };

    /* ---------- pieces ---------- */
    let pcs = {};   // square → piece group
    function mk(k, sq) {
      const g = U.piece(k), sh = T3.contact(cs * .36, .5); sh.position.y = .002; g.add(sh); g.userData.sh = sh;
      const [x, z] = xz(sq); g.position.set(x, Y, z); board.add(g); return g;
    }
    function lift(g, h) {
      g.position.y = Y + h; g.userData.h0 = h;
      const sh = g.userData.sh; if (sh) { sh.position.y = .002 - h; const s = 1 + h * .45; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 1.2); }
    }
    const hOf = g => g.userData.h0 || 0;
    function land(g) { anim(170, k => { const s = 1 + Math.sin(k * Math.PI) * .07; g.scale.set(s, 1 / s, s); }, () => g.scale.set(1, 1, 1)); }
    function setup() {
      Object.values(pcs).forEach(g => board.remove(g)); pcs = {};
      let i = 0;
      for (let sq = 0; sq < n * n; sq++) {
        const p = pos.b[sq]; if (!p) continue;
        const g = mk(p, sq); pcs[sq] = g;
        g.visible = false; const d = 60 + (i++) * 14; if (T3.kick) T3.kick(200);
        later(() => { g.visible = true; anim(260, k => lift(g, (1 - k) * (1 - k) * 1.5), () => { lift(g, 0); land(g); }); }, d);
      }
      return 60 + i * 14 + 300;
    }
    function rebuild() {
      Object.values(pcs).forEach(g => board.remove(g)); pcs = {};
      board.children.filter(g => g.userData && g.userData.kind).forEach(g => board.remove(g));   // a toppled king, a fading capture
      for (let sq = 0; sq < n * n; sq++) if (pos.b[sq]) pcs[sq] = mk(pos.b[sq], sq);
      if (T3.kick) T3.kick(300);
    }
    function glide(g, to, done) {   // lift — slide along the line — set down
      const x0 = g.position.x, z0 = g.position.z, [x1, z1] = xz(to), d = Math.hypot(x1 - x0, z1 - z0);
      const h0 = hOf(g), H = .3, A = .18, B = .82, dur = 260 + d * 70;
      anim(dur, k => {
        let h, e;
        if (k < A) { e = 0; h = h0 + (H - h0) * io(k / A); }
        else if (k < B) { e = io((k - A) / (B - A)); h = H; }
        else { e = 1; const u = (k - B) / (1 - B); h = H * (1 - u * u); }
        g.position.x = x0 + (x1 - x0) * e; g.position.z = z0 + (z1 - z0) * e; lift(g, h);
      }, () => { lift(g, 0); knock(); land(g); if (done) done(); });
      return dur;
    }
    function topple(g, dx, dz, keep, done) {   // a captured piece falls away and fades; keep: it stays lying (the captured king)
      const mats = [];
      if (!keep) g.traverse(o => { if (o.isMesh && o.material && !o.userData.contact) { o.material = o.material.clone(); o.material.transparent = true; mats.push(o.material); } });
      const sh = g.userData.sh, len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
      const axis = new TH.Vector3(uz, 0, -ux), q0 = g.quaternion.clone(), qt = new TH.Quaternion(), x0 = g.position.x, z0 = g.position.z;
      const maxA = keep ? 1.45 : 1.25, dur = keep ? 900 : 560;
      anim(dur, k => {
        const e = keep ? (k < .75 ? Math.pow(k / .75, 2) : 1 + Math.sin((k - .75) / .25 * Math.PI) * -.06) : k * k, a = maxA * Math.min(1, e);
        qt.setFromAxisAngle(axis, a); g.quaternion.copy(qt).multiply(q0);
        const slide = (keep ? .12 : .35) * Math.min(1, k * 1.4); g.position.x = x0 + ux * slide; g.position.z = z0 + uz * slide; g.position.y = Y + Math.sin(a) * .2;
        if (sh) sh.visible = a < .5;
        if (!keep) { const f = k < .45 ? 1 : 1 - (k - .45) / .55; mats.forEach(m => { m.opacity = Math.max(0, f); }); }
      }, () => { if (!keep) { board.remove(g); mats.forEach(m => m.dispose()); } else knock(.7); if (done) done(); });
    }

    /* ---------- position ---------- */
    function refresh() { const r = E.replay(null, moves, v); pos = r.pos; hashes = r.hashes.map(String); }
    function status() {
      const st = E.judge(pos, hashes);
      if (st.over) return { over: true, draw: !!st.draw, winner: st.winner === 1 ? 0 : st.winner === 2 ? 1 : -1, why: st.why };
      return { over: false, legal: pos.moves() };
    }
    function hud(msg) {
      const cnt = c => c ? pos.count(2) + 1 : pos.count(1);
      const side = c => `<span class="hs ${pos && pos.side === c && !over ? 'on' : ''}"><i class="dk ${c ? 'w' : 'b'}"></i>${pvp ? X.n[c] : c === human ? L.you : L.ai}<b>${pos ? cnt(c) : ''}</b></span>`;
      ctx.hud(`${side(0)}<span class="hm">${msg || ''}</span>${side(1)}`);
    }
    function showMarks() {
      clear(hl); hintMv = -1; hintJ++;
      if (moves.length) { const m = moves[moves.length - 1]; mark(hl, GEO.tile, MAT.last, E.mFrom(m)); mark(hl, GEO.tile, MAT.last, E.mTo(m)); }
      if (pos && pos.king >= 0 && !over) {   // the king's open lines to an escape square (raichi / tuichi)
        const k = pos.king, kr = Math.floor(k / n), kc = k % n;
        pos.kingLines().forEach(q => { const dr = Math.sign(Math.floor(q / n) - kr), dc = Math.sign(q % n - kc); for (let s = k + dr * n + dc; ; s += dr * n + dc) { mark(hl, GEO.tile, MAT.line, s, .009); if (s === q) break; } });
      }
    }

    /* ---------- selection ---------- */
    function select(sq) {
      deselect(); sel = sq; const g = pcs[sq];
      mark(mv, GEO.tile, MAT.sel, sq, .009);
      legal.forEach(m => {
        if (E.mFrom(m) !== sq) return; const to = E.mTo(m), caps = pos.capsOf(m).length, esc = pos.b[sq] === 3 && (E.geo(v).F[to] & 8);
        mark(mv, caps || esc ? GEO.ring : GEO.dot, esc ? MAT.esc : caps ? MAT.cap : MAT.dot, to, caps || esc ? .03 : .01);
      });
      if (g) { const h0 = hOf(g); anim(130, k => lift(g, h0 + (.24 - h0) * io(k))); }
      knock(1.4);
    }
    function deselect() {
      clear(mv);
      if (sel >= 0 && pcs[sel]) { const g = pcs[sel], h0 = hOf(g); if (h0 > 0) anim(120, k => lift(g, h0 * (1 - k))); }
      sel = -1; if (T3.kick) T3.kick(150);
    }

    /* ---------- moves ---------- */
    function play(m, done) {
      const from = E.mFrom(m), to = E.mTo(m), caps = pos.capsOf(m);
      clear(mv); sel = -1;
      const g = pcs[from]; delete pcs[from]; pcs[to] = g;
      const victims = caps.map(q => { const vg = pcs[q]; delete pcs[q]; return [q, vg]; }).filter(([, vg]) => vg);
      moves.push(m); refresh(); ply++; onTurn(); showMarks(); hud('');
      let pending = 1; const fin = () => { if (--pending === 0 && done) done(); };
      const dur = glide(g, to, fin);
      const [x1, z1] = xz(to);
      victims.forEach(([q, vg], i) => { pending++; const [vx, vz] = xz(q); later(() => topple(vg, vx - x1, vz - z1, false, fin), dur * .7 + i * 60); });
    }
    function commit(m) { busy = true; play(m, () => { busy = false; next(); }); }
    function next() {
      if (stopped) return;
      const st = status(); legal = st.legal || [];
      if (st.over) return end(st);
      onTurn();
      if (pvp || pos.side === human) { hud(pvp ? X.turn.replace('{c}', X.n[pos.side]) : L.turn); return; }
      aiMove();
    }
    function end(st) {
      over = true; busy = false; clear(mv); clear(hl); if (ctx.onTurn) ctx.onTurn(-1);
      if (moves.length) { const m = moves[moves.length - 1]; mark(hl, GEO.tile, MAT.last, E.mFrom(m)); mark(hl, GEO.tile, MAT.last, E.mTo(m)); }
      const win = !pvp && !st.draw && st.winner === human, wt = pvp && !st.draw ? X.win.replace('{c}', X.n[st.winner]) : '';
      hud(st.draw ? L.draw : pvp ? wt : win ? L.win : L.lose);
      const why = X.why[st.why] || '';
      let wait = 300;
      if (st.why === 'capture') {   // the captured king lies down
        const ksq = Object.keys(pcs).find(q => pcs[q].userData.kind === 3), last = moves[moves.length - 1];
        if (ksq != null) { const k = pcs[ksq], [x, z] = xz(+ksq), [ox, oz] = xz(E.mTo(last)); later(() => topple(k, x - ox || .3, z - oz || .3, true), 380); wait = 1000; }
      } else if (st.why === 'escape' || st.why === 'fort') {   // the king glows gold and hops
        const ksq = Object.keys(pcs).find(q => pcs[q].userData.kind === 3);
        if (ksq != null) { const k = pcs[ksq]; mark(hl, GEO.tile, MAT.win, +ksq, .011); later(() => { horn(); anim(700, e => lift(k, Math.sin(e * Math.PI) * .7), () => { lift(k, 0); land(k); }); }, 300); wait = 1100; }
      }
      later(() => ctx.onEnd(pvp ? { win: false, draw: !!st.draw, level: ctx.level, score: why, pvp: true, winnerText: wt } : { win, draw: !!st.draw, level: ctx.level, score: why }), wait);
    }

    /* ---------- AI: the game's engine worker ---------- */
    function aiMove() {
      thinking = true; hud(L.think);
      if (!worker) worker = new Worker(BASE + 'engine.js' + VER);
      const id = ++jid, t0 = Date.now(), mvs = moves.slice();
      const reply = m => {
        if (stopped || id !== jid || over) return;
        if (m == null || m < 0) { try { m = E.think(null, mvs, ctx.level, v).move; } catch (e) { m = -1; } }   // the worker failed: the page's (JS) search
        later(() => {
          if (id !== jid || over) return;
          thinking = false;
          if (m == null || m < 0 || !legal.includes(m)) { next(); return; }
          busy = true; play(m, () => { busy = false; next(); });
        }, Math.max(0, 380 - (Date.now() - t0)));
      };
      worker.onmessage = e => { const r = e.data; if (r.id === id && r.type === 'result') reply(r.error ? -1 : r.move); };
      worker.onerror = () => { worker = null; reply(-1); };
      worker.postMessage({ type: 'think', id, start: null, moves: mvs, level: ctx.level, v });
    }

    /* ---------- input ---------- */
    function cellOf(e) {
      const p = T3.pick(e, Y); if (!p) return -1;
      const c = Math.floor((p.x + S / 2) / cs), r = Math.floor((p.z + S / 2) / cs);
      return c < 0 || c >= n || r < 0 || r >= n ? -1 : r * n + c;
    }
    const ownBy = (sq, s) => { const p = pos.b[sq]; return s === 0 ? p === 1 : p === 2 || p === 3; };
    function onClick(e) {
      if (over || busy || !pos || pos.side !== mover() || T3.wasDrag()) return;
      const q = cellOf(e); if (q < 0) { deselect(); return; }
      if (sel >= 0) { const m = legal.find(x => E.mFrom(x) === sel && E.mTo(x) === q); if (m !== undefined) { commit(m); return; } }
      if (q === sel) { deselect(); return; }
      if (ownBy(q, mover()) && legal.some(x => E.mFrom(x) === q)) { select(q); return; }
      deselect();
    }
    ctx.el.addEventListener('click', onClick);

    function begin() {
      timers.forEach(clearTimeout); timers.length = 0; clear(mv); clear(hl);
      moves = []; over = false; busy = true; sel = -1; thinking = false; jid++;
      refresh(); const wait = setup(); hud('');
      later(() => { busy = false; showMarks(); next(); }, wait + 200);
    }
    hud('');
    loadEngine().then(e => { if (stopped) return; E = e; if (!pvp) worker = new Worker(BASE + 'engine.js' + VER); begin(); }).catch(() => hud('⚠'));

    // test hooks (screen position of a square, state, the pieces)
    const dbg = {
      at: nm => { const i = E.sqParse(nm, n), [x, z] = xz(i); return T3.project(x, z, Y); },
      state: () => ({ v, n, hint: hintMv >= 0 ? E.sqName(E.mFrom(hintMv), n) + '-' + E.sqName(E.mTo(hintMv), n) : '', moves: moves.length, side: pos && pos.side, human, pvp, over, busy, thinking, sel, pieces: Object.keys(pcs).length, legal: legal.length }),
      legal: () => legal.map(m => E.sqName(E.mFrom(m), n) + '-' + E.sqName(E.mTo(m), n)),
      play: nm => { const m = legal.find(x => E.sqName(E.mFrom(x), n) + '-' + E.sqName(E.mTo(x), n) === nm); if (m !== undefined && !busy && !over) commit(m); return m !== undefined; },
    };
    window.Atlas3D.tafl._dbg = dbg;

    /* ---------- 待った · 投了 · ヒント · time-out (the portal's action bar) ---------- */
    const myTurn = () => !!pos && !over && !busy && !thinking && (pvp || pos.side === human);
    const undoN = () => pvp ? 1 : 2;
    function finish(loser, why) {   // resign / time-out: side `loser` (0 attackers, 1 defenders) loses
      if (over || !pos) return;
      over = true; busy = false; thinking = false; jid++; hintJ++; clear(mv); if (ctx.onTurn) ctx.onTurn(-1);
      const r = t(why === 'time' ? 'act.timeout' : 'act.resigned');
      if (pvp) { const wt = X.win.replace('{c}', X.n[loser ^ 1]); hud(wt); return later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: t('act.pvpEnd', { p: X.n[loser], r, w: wt }), pvp: true, winnerText: wt }), 200); }
      hud(L.lose); later(() => ctx.onEnd({ win: false, draw: false, level: ctx.level, score: r }), 200);
    }
    const api = {
      human,
      canUndo: () => myTurn() && moves.length >= undoN() && (pvp || moves.length - undoN() >= (human === 1 ? 1 : 0)),
      undo() {
        if (!api.canUndo()) return;
        timers.forEach(clearTimeout); timers.length = 0; jid++; deselect();
        moves.splice(moves.length - undoN()); refresh(); rebuild(); ply++;
        busy = false; showMarks(); next();
      },
      canHint: () => myTurn(),
      hint() {
        if (!myTurn()) return Promise.resolve(false);
        const j = ++hintJ, mvs = moves.slice();
        return new Promise(res => {
          if (!hintW) hintW = new Worker(BASE + 'engine.js' + VER);
          hintW.onmessage = e => {
            const r = e.data; if (r.type !== 'result' || r.id !== j) return;
            if (stopped || j !== hintJ || over || moves.length !== mvs.length) return res(true);
            const m = r.error ? -1 : r.move; if (m == null || m < 0 || !legal.includes(m)) return res(false);
            hintMv = m; const from = E.mFrom(m), to = E.mTo(m);
            const a = mark(hl, GEO.ring, MAT.hint, from, .035), b = mark(hl, GEO.ring, MAT.hint, to, .035); mark(hl, GEO.tile, MAT.hintT, to, .011);
            anim(560, k => { const s = 1 + Math.sin(k * Math.PI * 2) * .16 * (1 - k); a.scale.set(s, s, s); b.scale.set(s, s, s); });
            res(true);
          };
          hintW.onerror = () => { hintW = null; res(false); };
          hintW.postMessage({ type: 'think', id: j, start: null, moves: mvs, level: Math.max(13, Math.min(16, ctx.level + 2)), v });
        });
      },
      canResign: () => !!pos && !over,
      resign() { if (pos && !over) finish(pvp ? pos.side : human, 'resign'); },
      timeout(side) { finish(side, 'time'); },
      stop() {
        stopped = true; jid++;
        timers.forEach(clearTimeout);
        ctx.el.removeEventListener('click', onClick);
        if (worker) worker.terminate(); worker = null; if (hintW) hintW.terminate(); hintW = null;
        Object.values(MAT).forEach(m => m.dispose()); Object.values(GEO).forEach(g => g.dispose());
        if (window.Atlas3D.tafl._dbg === dbg) delete window.Atlas3D.tafl._dbg;
      },
      _debug: dbg,
    };
    return api;
  }

  /* ---------- the board card ---------- */
  const RATING = [450,  570,  670,  790,  960,  1030,  1100,  1160,  1230,  1290,  1390,  1480,  1580,  1670,  1760,  1880,  1960,  2040,  2120,  2200];   // tafl RT_LV (rated games)
  function levelInfo(i, lang) {   // i = 1..20 (the game's level: 15 kyu … 1 kyu, 1 dan … 5 dan)
    const L = TX[lang] || TX.en;
    return { name: i <= 15 ? L.kyu.replace('{n}', 16 - i) : L.dan[i - 16], desc: '', rating: RATING[i - 1] };
  }
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.tafl = { levels: 20, sides: true, modes: ['ai', 'pvp'], table: true, tableModes: ['ai', 'pvp'], clock: 'fis', sizes: [7, 9, 11], size0: 11, sizeLabel: l => SIZE_L[l] || SIZE_L.en, levelInfo, start };   // table: start() plays on the chabudai itself
})();
