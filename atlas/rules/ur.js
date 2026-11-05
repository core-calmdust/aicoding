/* =====================================================================
   The Royal Game of Ur — rules tour on the 3D table (the British Museum board),
   told by the guide character (Dicepup). The same pages and words as the full
   game's tutorial (ur/tour.js, 10 languages — its texts are loaded and reused):
   the game (history · how to win · culture), the board and your track, the dice,
   entering, moving, not onto your own piece, capturing, rosettes, the safe middle
   rosette, the exact roll home, zero and passing, how to win. Every page after
   the first has a task on the 3D board: roll the four pyramid dice (they come up
   as staged, so the task always works) and move a piece.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }
   ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Opening the tour sets aicoding-ur-rules-seen (as the full game's rules do).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-dice.webp', BASE = '../ur/';
  const loadJS = (src, ok) => ok() ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  // the portal's own words for the frame of the tour
  const UI = {
    ja: { name: 'ダイスン', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', roll: 'サイコロをタップして振ってね', done: 'できた！', hist: '歴史', winH: '勝ち方', cult: '文化', pass: 'パス', wrong: 'ちがうよ〜。もう一度！', tapIt: '光っている所をタップしてね', rollK: 'サイコロをタップして振ろう', pickN: '下の数字から選んでね', pressPass: '［パス］を押してね' },
    en: { name: 'Dicepup', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', roll: 'Tap the dice to roll', done: 'Well done!', hist: 'History', winH: 'How to win', cult: 'Culture', pass: 'Pass', wrong: 'Not quite — try again!', tapIt: 'Tap the glowing spot', rollK: 'Tap the dice to roll them', pickN: 'Pick a number below', pressPass: 'Press “Pass”' },
    zh: { name: '骰子汪', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', roll: '点击骰子掷出', done: '做到了！', hist: '历史', winH: '胜利方法', cult: '文化', pass: '跳过', wrong: '不对哦，再试一次！', tapIt: '点击发光的位置', rollK: '点击骰子来掷骰', pickN: '从下面选一个数字', pressPass: '按“跳过”' },
    ko: { name: '다이슨', next: '다음', back: '이전', start: '대국하기', again: '다시', roll: '주사위를 탭해서 굴려', done: '잘했어!', hist: '역사', winH: '이기는 법', cult: '문화', pass: '패스', wrong: '아니야~ 다시 해 봐!', tapIt: '빛나는 곳을 탭해 줘', rollK: '주사위를 탭해서 굴려 봐', pickN: '아래 숫자에서 골라 줘', pressPass: '[패스]를 눌러 줘' },
    es: { name: 'Dicepup', next: 'Siguiente', back: 'Atrás', start: 'A jugar', again: 'Otra vez', roll: 'Toca los dados para tirar', done: '¡Bien hecho!', hist: 'Historia', winH: 'Cómo ganar', cult: 'Cultura', pass: 'Pasar', wrong: '¡Casi! Prueba otra vez', tapIt: 'Toca lo que brilla', rollK: 'Toca los dados para tirarlos', pickN: 'Elige un número abajo', pressPass: 'Pulsa «Pasar»' },
    fr: { name: 'Dicepup', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', roll: 'Touche les dés pour lancer', done: 'Bravo !', hist: 'Histoire', winH: 'Comment gagner', cult: 'Culture', pass: 'Passer', wrong: 'Presque ! Réessaie', tapIt: 'Touche ce qui brille', rollK: 'Touche les dés pour les lancer', pickN: 'Choisis un nombre ci-dessous', pressPass: 'Appuie sur « Passer »' },
    pt: { name: 'Dicepup', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', roll: 'Toque nos dados para lançar', done: 'Muito bem!', hist: 'História', winH: 'Como ganhar', cult: 'Cultura', pass: 'Passar', wrong: 'Quase! Tente de novo', tapIt: 'Toque no que brilha', rollK: 'Toque nos dados para lançar', pickN: 'Escolha um número abaixo', pressPass: 'Toque em “Passar”' },
    de: { name: 'Dicepup', next: 'Weiter', back: 'Zurück', start: 'Spielen', again: 'Nochmal', roll: 'Tippe auf die Würfel', done: 'Gut gemacht!', hist: 'Geschichte', winH: 'So gewinnt man', cult: 'Kultur', pass: 'Passen', wrong: 'Fast! Versuch es noch einmal', tapIt: 'Tippe auf das Leuchtende', rollK: 'Tippe auf die Würfel, um zu würfeln', pickN: 'Wähle unten eine Zahl', pressPass: 'Drücke „Passen“' },
    hi: { name: 'डाइसपप', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', roll: 'पासे छूकर फेंकें', done: 'बहुत अच्छे!', hist: 'इतिहास', winH: 'जीतने का तरीका', cult: 'संस्कृति', pass: 'पास', wrong: 'लगभग! फिर कोशिश करें', tapIt: 'चमकती जगह छुएँ', rollK: 'पासों को छूकर फेंकें', pickN: 'नीचे से एक संख्या चुनें', pressPass: '“पास” दबाएँ' },
    ar: { name: 'دايس باب', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', roll: 'المس النرود للرمي', done: 'أحسنت!', hist: 'التاريخ', winH: 'طريقة الفوز', cult: 'الثقافة', pass: 'تمرير', wrong: 'قريب! حاول مرة أخرى', tapIt: 'المس المكان المضيء', rollK: 'المس النرود لرميها', pickN: 'اختر رقمًا بالأسفل', pressPass: 'اضغط «تمرير»' },
  };
  // the first page: a short greeting as in the other tours (the full history is in the portal's Historia)
  const HELLO = {"ja": "ワン！ ぼくは<b>ダイスン</b>。<b>ウル王朝のゲーム</b>は約4500年前のメソポタミアの盤ゲームで、大英博物館に本物の盤があるんだ。4個のサイコロで進み、<b>7枚すべてを先にゴールさせたら勝ち</b>。いっしょに覚えよう！", "en": "Woof! I'm <b>Dicepup</b>. <b>The Royal Game of Ur</b> was played in Mesopotamia some 4,500 years ago — a real board is in the British Museum. Roll four dice and be the first to bring <b>all seven pieces home</b>. Let's learn it!", "zh": "汪！我是<b>骰子汪</b>。<b>乌尔王族局戏</b>是约4500年前美索不达米亚的棋盘游戏，真正的棋盘藏于大英博物馆。掷4枚骰子前进，<b>先让7枚棋子全部到达终点</b>就赢。一起学吧！", "ko": "멍! 나는 <b>다이슨</b>. <b>우르 왕실 게임</b>은 약 4500년 전 메소포타미아의 보드게임으로, 진짜 판이 대영박물관에 있어. 주사위 4개로 나아가 <b>말 7개를 먼저 모두 골인시키면 승리</b>. 함께 배우자!", "es": "¡Guau! Soy <b>Dicepup</b>. <b>El Juego Real de Ur</b> se jugaba en Mesopotamia hace unos 4500 años; un tablero real está en el Museo Británico. Tira cuatro dados y lleva primero <b>tus siete fichas a casa</b>. ¡Aprendamos!", "fr": "Ouaf ! Je suis <b>Dicepup</b>. <b>Le Jeu royal d’Ur</b> se jouait en Mésopotamie il y a environ 4 500 ans ; un vrai plateau est au British Museum. Lance quatre dés et amène le premier <b>tes sept pions à l’arrivée</b>. Apprenons-le !", "pt": "Au! Eu sou o <b>Dicepup</b>. <b>O Jogo Real de Ur</b> era jogado na Mesopotâmia há uns 4.500 anos — um tabuleiro de verdade está no Museu Britânico. Lance quatro dados e leve primeiro <b>as sete peças para casa</b>. Vamos aprender!", "de": "Wuff! Ich bin <b>Dicepup</b>. <b>Das Königliche Spiel von Ur</b> wurde vor rund 4500 Jahren in Mesopotamien gespielt — ein echtes Brett liegt im British Museum. Würfle mit vier Würfeln und bring als Erster <b>alle sieben Steine ins Ziel</b>. Lernen wir es!", "hi": "भौं! मैं <b>डाइसपप</b> हूँ। <b>उर का शाही खेल</b> लगभग 4500 साल पहले मेसोपोटामिया में खेला जाता था — एक असली बोर्ड ब्रिटिश म्यूज़ियम में है। चार पासे फेंककर <b>सातों मोहरे सबसे पहले घर पहुँचाएँ</b>। चलो सीखें!", "ar": "هاو! أنا <b>دايس باب</b>. <b>اللعبة الملكية في أور</b> كانت تُلعب في بلاد الرافدين قبل نحو 4500 عام، ورقعة حقيقية منها في المتحف البريطاني. ارمِ أربعة نرود وكن أول من يُوصل <b>قطعه السبع إلى النهاية</b>. لنتعلّمها!"};
  const PAT = { 0: [0, 0, 0, 0], 1: [0, 0, 1, 0], 2: [1, 0, 0, 1], 3: [1, 1, 0, 1], 4: [1, 1, 1, 1] };
  const full = a => { const r = a.slice(); while (r.length < 7) r.push(0); return r; };
  const ST = (p0, p1) => ({ rule: 'finkel', pos: [full(p0), full(p1)], turn: 0, winner: -1 });
  /* the pages (ur/tour.js PAGES): s = the position (path indices of Light / Dark), rolls = the dice that come up, in order,
     check(m) → text key of a wrong choice, glow = path indices of Light to light up, kind = a special task */
  const PAGES = [
    { id: 'intro' },
    { id: 'board', s: ST([], []), kind: 'last', glowPath: true },
    { id: 'dice', s: ST([], []), rolls: [3], kind: 'count' },
    { id: 'enter', s: ST([], []), rolls: [3], ok: m => m.enter },
    { id: 'move', s: ST([5], [3]), rolls: [2], check: m => m.enter ? 'move.ng' : null },
    { id: 'own', s: ST([2, 4], [2]), rolls: [2] },
    { id: 'cap', s: ST([6, 2], [9, 3]), rolls: [3], check: m => m.capture ? null : 'cap.ng' },
    { id: 'ros', s: ST([2, 5], [11]), rolls: [2, 1], glow: [4, 8, 14], check: (m, k) => k === 1 && !m.rosette ? 'ros.ng' : null, twice: true },
    { id: 'safe', s: ST([6, 1], [4, 3]), rolls: [2], glow: [8], danger: [6], check: m => m.from === 6 ? null : 'safe.ng' },
    { id: 'goal', s: ST([14, 13, 15, 15, 9], [10, 2]), rolls: [2], check: m => m.finish ? null : 'goal.ng' },
    { id: 'pass', s: ST([3, 7], [5, 1]), rolls: [0], kind: 'pass' },
    { id: 'win', s: ST([12, 15, 15, 15, 15, 15, 15], [11, 6, 15, 15, 0, 0, 0]), rolls: [3], check: m => m.finish ? null : 'win.ng', last: true },
  ];

  function start(ctx) {
    const T3 = ctx.Table3D, L = Object.assign({}, UI.en, UI[ctx.lang] || {});
    try { localStorage.setItem('aicoding-ur-rules-seen', '1'); } catch (e) {}
    let stopped = false, step = 0, played = false, busy = false, timers = [], E = null, TX = null, kit = null, st = null, n = null, k = 0, phase = '', sel = -1;
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const T = (key, v) => { const D = (TX && (TX[ctx.lang] || TX.en)) || {}; let s = D[key]; if (s == null && TX) s = TX.en[key]; if (s == null) s = ''; if (v) s = s.replace(/\{(\w+)\}/g, (_, x) => v[x] != null ? v[x] : ''); return s; };
    const SND = (window.Atlas3D && Atlas3D.ur && Atlas3D.ur.SND) || { put() {}, hop() {}, take() {}, roll() {}, dieStop() {}, ros() {}, home() {} };

    /* ---------- the guide panel (the shared .rgd look of every tour) ---------- */
    const el = document.createElement('div'); el.className = 'rgd';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GUIDE}" alt=""></div><div class="bub"><div class="urm" role="status" aria-live="polite"></div><div class="nm">${L.name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="back">◀ ${L.back}</button><span class="dots"></span><button type="button" class="btn big" data-a="next">${L.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    $('.dots').innerHTML = PAGES.map(() => '<i></i>').join('');
    const css = document.createElement('style');
    css.textContent = '.rgd .urq{display:flex;gap:6px}.rgd .urq button{flex:1;min-width:0;max-width:64px;padding:7px 0;border-radius:12px;border:2px solid #eadfc6;background:#fff;font:900 17px var(--round,inherit);color:#2b3044;cursor:pointer;box-shadow:0 3px 0 #e2d6b8}.rgd .urq button:active{transform:translateY(2px);box-shadow:none}'
      + '.rgd .urp{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:99px;border:0;background:#5f78d6;color:#fff;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 3px 0 #3c52a8}'
      + '@media (max-width:600px){.rgd .urh .tg span{font-size:11.5px!important}}'
      + '@media (max-width:600px) and (max-height:720px){.rgd .tx{font-size:13.5px;line-height:1.55;min-height:0}.rgd .cnt{margin-top:4px}.rgd .cnt .tag{font-size:13px;padding:4px 12px}.rgd .urq button{padding:5px 0;font-size:16px}}'
      + '.rgd .urm{position:absolute;left:12px;right:12px;bottom:calc(100% + 8px);display:flex;justify-content:center;pointer-events:none;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s}.rgd .urm.on{opacity:1;transform:none}'
      + '.rgd .urm span{background:#fff0ee;color:#c23a2a;border:2px solid #f3c4bc;border-radius:14px;padding:6px 14px;font:800 14px/1.4 var(--round,inherit);box-shadow:0 6px 16px -8px rgba(120,30,0,.5);text-align:center}'
      + '.rgd .urn{font:900 20px var(--round,inherit);color:#c9a13d;margin-inline-start:4px}.rgd .urh{display:grid;gap:6px;font-size:14px;line-height:1.6;color:#4a4f66}.rgd .urh b{color:#2b3044}.rgd .urh .tg{display:flex;gap:6px;flex-wrap:wrap}.rgd .urh .tg span{padding:2px 10px;border-radius:99px;background:#f8f0e0;border:1.5px solid #ead9b6;font-size:12.5px;font-weight:700;color:#6a5a3a}';
    document.head.appendChild(css);
    let typeT = 0;
    function say(html) {
      const tx = $('.tx'); tx.innerHTML = html; clearInterval(typeT);
      const nodes = []; (function walk(nd) { nd.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walk(c); }); })(tx);
      nodes.forEach(([nd]) => { nd.textContent = ''; });
      let ni = 0, ci = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let q = 0; q < 3; q++) { if (ni >= nodes.length) return clearInterval(typeT); const [nd, s] = nodes[ni]; nd.textContent = s.slice(0, ++ci); if (ci >= s.length) { ni++; ci = 0; } } }, 22);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([nd, s]) => { nd.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    const cnt = html => { $('.cnt').innerHTML = html || ''; msg(''); };
    const tag = (html, bg, col) => `<span class="tag" style="white-space:normal;height:auto;line-height:1.35;display:inline-block${bg ? `;background:${bg};color:${col}` : ''}">${html}</span>`;
    // a wrong try: a short note above the bubble (the task under it stays as it is, and the panel keeps its height)
    let msgT = 0;
    function msg(html) { const m = $('.urm'); clearTimeout(msgT); m.innerHTML = html || ''; m.classList.toggle('on', !!html); if (html) msgT = setTimeout(() => m.classList.remove('on'), 3200); }
    const P = () => PAGES[step];
    const waiting = () => P().id !== 'intro' && !played;
    function buttons() {
      const pg = P(), wait = waiting();
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = pg.last && played ? L.start + ' ▶' : wait ? ({ roll: L.roll, count: L.pickN, pass: L.pressPass }[phase] || L.tapIt) : L.next + ' ▶';
      nx.disabled = !!wait; nx.classList.toggle('wait', !!wait);
      $('.dots').querySelectorAll('i').forEach((d, i) => d.className = i === step ? 'on' : i < step ? 'done' : '');
      $('.pg').textContent = `${step + 1} / ${PAGES.length}`;
      let ag = el.querySelector('[data-a=again]');
      if (pg.last && played && !ag) { ag = document.createElement('button'); ag.type = 'button'; ag.className = 'btn ghost sm'; ag.dataset.a = 'again'; ag.textContent = '↻ ' + L.again; $('.rgd-act').insertBefore(ag, nx); ag.onclick = () => go(0); }
      if (!(pg.last && played) && ag) ag.remove();
    }

    /* the bubble keeps one height on every page (the tallest page and task in this language and width): the camera frames the
       board above the panel, so a panel that grew or shrank from page to page moved the board each time */
    let lockW = 0;
    function lockH() {
      const bub = $('.bub'), tx = $('.tx'), cn = $('.cnt'), w = bub.clientWidth; if (!TX || !w || w === lockW) return; lockW = w;
      const keep = [tx.innerHTML, cn.innerHTML]; bub.style.minHeight = ''; let mx = 0;
      const meas = (t, c) => { tx.innerHTML = t; cn.innerHTML = c; mx = Math.max(mx, bub.offsetHeight); };
      meas(HELLO[ctx.lang] || HELLO.en, `<div class="urh"><div class="tg"><span>📍 ${T('intro.origin')}</span><span>👥 ${T('intro.players')}</span><span>⏱ ${T('intro.time')}</span></div></div>`);
      PAGES.forEach(pg => {
        if (pg.id === 'intro') return;
        const t = `<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`;
        [tag(`🎲 ${L.rollK}`), tag(`👆 ${T(pg.id + '.k')}`), tag(`🎲 <span class="urn">= 4</span>　👆 ${T(pg.id + '.k')}`), tag(`✓ ${T(pg.id + '.ok', { n: 4 })}`), tag(`🌸 ${T('again')} 🎲 ${L.rollK}`),
          `<div style="display:grid;gap:6px;width:100%"><b>${T('dice.k2')}</b><div class="urq"><button>0</button></div></div>`, `<div style="display:grid;gap:6px"><span>${T('pass.k2')}</span><div><button type="button" class="urp">${L.pass}</button></div></div>`]
          .forEach(c => meas(t, c));
      });
      tx.innerHTML = keep[0]; cn.innerHTML = keep[1]; bub.style.minHeight = mx + 'px';
    }
    addEventListener('resize', lockH);

    /* ---------- the board's marks for the page ---------- */
    const rcOf = (side, i) => { const q = E.coords('finkel', side, i); return q ? { r: q[0], c: q[1] } : null; };
    const legal = () => n ? E.legalMoves(st, n) : [];
    function marks() {
      if (!kit) return;
      const pg = P(); kit.marks.clear();
      if (pg.glowPath && !played) { kit.marks.path(0, 1, 14, 0xffe27a); const q = rcOf(0, 14); kit.marks.ring(q.r, q.c, 0xffd65a); }
      if (pg.glowPath && played) { const q = rcOf(0, 14); kit.marks.cell(q.r, q.c, 0x3df59a, .45); }
      (pg.glow || []).forEach(i => { const q = rcOf(0, i); kit.marks.cell(q.r, q.c, 0xffd65a, .22); });
      (pg.danger || []).forEach(i => { if (played) return; const q = rcOf(0, i); kit.marks.cell(q.r, q.c, 0xff5d5d, .3); });
      if (phase === 'roll' && !busy) kit.marks.frame();   // the dice to tap: a quiet frame round them (the dice themselves are not lit)
      if (phase === 'move') {
        const ms = legal(), show = sel >= 0 ? ms.filter(m => m.from === sel) : [];
        for (const m of ms) { if (m.from === 0) kit.marks.tray(0, 'start', 0xffd65a, st.pos[0].filter(p => p <= 0).length - 1); else { const q = rcOf(0, m.from); kit.marks.ring(q.r, q.c, 0xffd65a); } }
        for (const m of show) { const col = m.capture ? 0xff5d5d : m.rosette ? 0x6ec8ff : 0x3df59a; if (m.finish) kit.marks.tray(0, 'goal', col, st.pos[0].filter(p => p >= 15).length); else { const q = rcOf(0, m.to); kit.marks.cell(q.r, q.c, col, .42); kit.marks.ring(q.r, q.c, col); } }
      }
    }

    /* ---------- pages ---------- */
    function go(nn) {
      step = Math.max(0, Math.min(PAGES.length - 1, nn)); played = false; busy = false; phase = ''; n = null; k = 0; sel = -1;
      timers.forEach(clearTimeout); timers = [];
      const pg = P(); lockH(); cnt('');
      if (pg.id === 'intro') {
        say(HELLO[ctx.lang] || HELLO.en);
        cnt(`<div class="urh"><div class="tg"><span>📍 ${T('intro.origin')}</span><span>👥 ${T('intro.players')}</span><span>⏱ ${T('intro.time')}</span></div></div>`);
        if (kit) { st = E.newGame('finkel', 0); kit.sync(st); kit.diceBig(false, 0); kit.restDice(0, null); kit.marks.clear(); }
        buttons(); return;
      }
      st = E.clone(pg.s); kit.sync(st); kit.diceBig(false, 0); kit.restDice(0, null);
      phase = pg.kind === 'last' ? 'tap' : 'roll';
      say(`<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`);
      cnt(tag(phase === 'roll' ? `🎲 ${L.rollK}` : `👆 ${T(pg.id + '.k')}`));
      if (phase === 'roll') kit.diceBig(true, 0);
      marks(); buttons();
    }
    function ok(textKey, v) { played = true; busy = false; phase = 'done'; sel = -1; marks(); cnt(tag(`✓ ${T(textKey, v)}`, '#e8f8ee', '#16784a')); SND.home(); buttons(); }
    function ng(textKey, v, html) { msg(`<span>${html || (textKey ? T(textKey, v) : L.wrong)}</span>`); const b = $('.bub'); if (b.animate) b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 }); }
    async function roll() {
      const pg = P(); if (phase !== 'roll' || busy) return;
      busy = true; marks();
      const v = pg.rolls[Math.min(k, pg.rolls.length - 1)]; k++;
      await kit.roll(0, PAT[v].slice()); if (stopped) return;
      n = v; busy = false;
      if (pg.kind === 'count') {   // how many blue tips? (a choice)
        phase = 'count'; marks();
        cnt(`<div style="display:grid;gap:6px;width:100%"><b>${T('dice.k2')}</b><div class="urq">${[0, 1, 2, 3, 4].map(x => `<button type="button" data-urn="${x}">${x}</button>`).join('')}</div></div>`);
        $('.cnt').onclick = e => { const b = e.target.closest('[data-urn]'); if (!b || phase !== 'count') return; if (+b.dataset.urn === n) { $('.cnt').onclick = null; ok('dice.ok', { n }); } else ng('dice.ng'); };
        buttons(); return;
      }
      if (pg.kind === 'pass') {
        phase = 'pass'; marks();
        cnt(`<div style="display:grid;gap:6px"><span>${T('pass.k2')}</span><div><button type="button" class="urp" data-urpass="1">${L.pass}</button></div></div>`);
        $('.cnt').onclick = e => { if (e.target.closest('[data-urpass]') && phase === 'pass') { $('.cnt').onclick = null; ok('pass.ok'); } };
        buttons(); return;
      }
      phase = 'move'; marks();
      cnt(tag(`🎲 <span class="urn">= ${n}</span>　👆 ${pg.twice && k === 2 ? T('ros.k2') : T(pg.id + '.k')}`));
      kit.diceBig(false);   // the roll was seen large: the dice step aside, the board is free for the move
      const ms = legal(); if (ms.length === 1) { sel = ms[0].from; const kk = st.pos[0].indexOf(sel); if (kk >= 0) kit.lift(0, kk, true); marks(); }
      buttons();
    }
    // why a piece at path index `from` cannot move (ur/tour.js why())
    function why(from) {
      const to = from + n;
      if (to > 15) return T('over', { n });
      if (to < 15 && st.pos[0].includes(to)) return T('own');
      if (to < 15 && E.isRosette('finkel', 0, to)) { const q = rcOf(0, to); if (st.pos[1].some(p => p >= 1 && p <= 14 && (o => o.r === q.r && o.c === q.c)(rcOf(1, p)))) return T('safeNo'); }
      return T('noMove');
    }
    async function play(m) {
      const pg = P();
      if (pg.check) { const bad = pg.check(m, k); if (bad) { ng(bad); return; } }
      busy = true; phase = 'anim'; const kk = st.pos[0].indexOf(m.from); if (kk >= 0) kit.lift(0, kk, false); sel = -1; kit.marks.clear();
      await kit.move(0, m.from, m.to, { capture: m.capture, onStep: () => SND.hop(), onHit: () => SND.take(), onLand: () => (m.finish ? SND.home : SND.put)() });
      if (stopped) return;
      const r = E.apply(st, m); st = r.state; st.turn = 0; n = null; busy = false; kit.sync(st);
      if (pg.twice && r.again && k < pg.rolls.length) { SND.ros(); phase = 'roll'; kit.diceBig(true); marks(); cnt(tag(`🌸 ${T('again')} 🎲 ${L.rollK}`, '#e8f0ff', '#2f4fb0')); buttons(); return; }
      const key = pg.id === 'enter' ? 'enter.ok' : pg.id + '.ok';
      ok(key);
    }
    function onClick(e) {
      if (stopped || busy || T3.wasDrag() || e.target.closest('.rgd') || !kit) return;
      const pg = P(); if (pg.id === 'intro' || played) return;
      const h = kit.hit(e);
      if (phase === 'tap') {   // the board page: tap the last square of the track
        if (h && !h.tray) { const i = E.pathOf('finkel', 0).findIndex(q => q[0] === h.r && q[1] === h.c) + 1; if (i === 14) { ok('board.ok'); return; } }
        ng('board.ng'); return;
      }
      if (phase === 'roll') { roll(); return; }
      if (phase !== 'move' || !h) return;
      const ms = legal();
      if (sel >= 0) {
        const m = ms.find(x => x.from === sel && (h.tray ? h.tray === 'goal' && h.side === 0 && x.finish : !x.finish && (q => q.r === h.r && q.c === h.c)(rcOf(0, x.to))));
        if (m) { play(m); return; }
      }
      let from = -1;
      if (h.tray === 'start' && h.side === 0 && st.pos[0].includes(0)) from = 0;
      else if (!h.tray) { const i = E.pathOf('finkel', 0).findIndex(q => q[0] === h.r && q[1] === h.c) + 1; if (i > 0 && st.pos[0].includes(i)) from = i; else if (st.pos[1].some(p => p > 0 && p < 15 && (o => o.r === h.r && o.c === h.c)(rcOf(1, p))) && h.r !== 1) { ng('notMine'); return; } }
      if (from < 0 && !h.tray) { const c = ms.filter(x => !x.finish && (q => q.r === h.r && q.c === h.c)(rcOf(0, x.to))); if (c.length === 1) { play(c[0]); return; } }
      if (from < 0) return;
      const m = ms.find(x => x.from === from);
      if (!m) { ng(null, null, why(from)); return; }
      if (sel >= 0) { const k0 = st.pos[0].indexOf(sel); if (k0 >= 0) kit.lift(0, k0, false); }
      if (sel === from) { play(m); return; }   // a second tap on the selected piece plays its (only) move
      sel = from; const k1 = st.pos[0].indexOf(from); if (k1 >= 0) kit.lift(0, k1, true); marks();
    }
    $('[data-a=next]').onclick = () => { if (P().last && played) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (step) go(step - 1); else if (ctx.onExit) ctx.onExit(); };
    ctx.el.addEventListener('click', onClick);
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (e.key === ' ' && phase === 'roll') { e.preventDefault(); e.stopPropagation(); roll(); return; }
      if (e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (!nx.disabled && !(e.key === 'ArrowRight' && P().last)) nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    // the game's rules and words (ur/engine.js, ur/tour.js), then the board
    say('…'); buttons();
    loadJS(BASE + 'engine.js?v=2', () => !!window.UrEngine).then(() => loadJS(BASE + 'tour.js?v=3', () => !!window.UrTour)).then(() => {
      if (stopped) return; E = window.UrEngine; TX = window.UrTour && UrTour._TX;
      kit = window.UrKit.make(T3, { sfx: x => SND[x] && SND[x](), top: true, stage: true });   // the tour: straight down, the same view on every page; the dice rolled large in view
      later(() => go(0), 250);
    }).catch(() => say('⚠'));
    const sess = {
      stop() { stopped = true; if (kit) kit.stop(); clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); removeEventListener('resize', lockH); document.removeEventListener('keydown', onKey, true); el.remove(); css.remove(); },
      panel: el,
      _debug: { step: () => step, phase: () => phase, played: () => played, n: () => n, sel: () => sel, legal: () => E && st ? legal() : [], st: () => st && st.pos.map(a => a.slice()),
        cell: (r, c) => kit && kit.projCell(r, c), slot: (side, kind, kk) => kit && kit.projSlot(side, kind, kk), die: i => kit && kit.projDie(i), kit: () => kit, dieSize: () => { const a = kit.projDie(0), g = kit.dice[0]; if (!a) return 0; const r = kit.U.dieR * g.userData.s; const b = kit.project(g.position.x + r, g.position.y, g.position.z); const c = kit.project(g.position.x, g.position.y, g.position.z + r); return Math.round(2 * Math.max(Math.hypot(b.x - a.x, b.y - a.y), Math.hypot(c.x - a.x, c.y - a.y))); }, rc: i => E && rcOf(0, i), go },
    };
    window.__rulesSess = sess;   // (tests)
    return sess;
  }
  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.ur = { start };
})();
