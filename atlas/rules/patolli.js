/* =====================================================================
   Patolli — rules course on the 3D table, told by the guide character (Dicepup, the guide of the full game's 3D skin).
   The same pages, positions and words as the full game's tutorial (patolli/tour.js, 14 languages — its texts are loaded
   and reused, so both say the same thing): the game, the board and your road, the beans (1–4, five = 10, none = no move),
   the first piece (any throw), later pieces (only a 1), moving, no landing on a piece, the arm ends (throw again), the marked
   squares (pay), home by exact throw (receive), no move (pay the pool), how to win, and three pages on the other rule set
   (the "popular rules": 52 squares, a 1 to enter, captures in the centre, the offering of a zero).
   History and rules (claude/patolli-spec.md §0): the original rules have not survived; what is taught is R. C. Bell's
   reconstruction of 1960 — said on the first page and under "the board" (the tour's own notes, <page>.n).
   Every page has a task on the 3D board: throw the five beans (they come up as staged, so the task always works) and move.
   Contract: AtlasRules[id] = { start(ctx) → { stop(), panel } }      ctx = { el, Table3D, lang, panel (DOM host), onStart(), onExit() }
   Opening the course sets aicoding-patolli-rules-seen (as the full game's rules do).
   ===================================================================== */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/g-dice.webp', BASE = '../patolli/';
  const EV = 'engine.js?v=2', TV = 'tour.js?v=3';   // the cache keys of patolli/index.html
  const loadJS = (src, ok) => ok() ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  // the portal's own words for the frame of the course (as atlas/rules/ur.js)
  const UI = {
    "ja": {"name":"ダイスン","next":"つぎへ","back":"もどる","start":"対局してみる","again":"もういちど","done":"できた！","pass":"パス","wrong":"ちがうよ〜。もう一度！","tapIt":"光っている所をタップしてね","pickN":"下の数字から選んでね","pressPass":"［パス］を押してね"},
    "en": {"name":"Dicepup","next":"Next","back":"Back","start":"Let's play","again":"Again","done":"Well done!","pass":"Pass","wrong":"Not quite — try again!","tapIt":"Tap the glowing spot","pickN":"Pick a number below","pressPass":"Press “Pass”"},
    "zh": {"name":"骰子汪","next":"下一步","back":"返回","start":"开始对局","again":"再来一次","done":"做到了！","pass":"跳过","wrong":"不对哦，再试一次！","tapIt":"点击发光的位置","pickN":"从下面选一个数字","pressPass":"按“跳过”"},
    "zh-TW": {"name":"骰子汪","next":"下一步","back":"返回","start":"來對局吧","again":"再一次","done":"成功了！","pass":"跳過","wrong":"不對喔～再試一次！","tapIt":"點擊發光的地方","pickN":"從下面的數字中選擇","pressPass":"請按［跳過］"},
    "ko": {"name":"다이슨","next":"다음","back":"이전","start":"대국하기","again":"다시","done":"잘했어!","pass":"패스","wrong":"아니야~ 다시 해 봐!","tapIt":"빛나는 곳을 탭해 줘","pickN":"아래 숫자에서 골라 줘","pressPass":"[패스]를 눌러 줘"},
    "es": {"name":"Dicepup","next":"Siguiente","back":"Atrás","start":"A jugar","again":"Otra vez","done":"¡Bien hecho!","pass":"Pasar","wrong":"¡Casi! Prueba otra vez","tapIt":"Toca lo que brilla","pickN":"Elige un número abajo","pressPass":"Pulsa «Pasar»"},
    "fr": {"name":"Dicepup","next":"Suivant","back":"Retour","start":"Jouer","again":"Encore","done":"Bravo !","pass":"Passer","wrong":"Presque ! Réessaie","tapIt":"Touche ce qui brille","pickN":"Choisis un nombre ci-dessous","pressPass":"Appuie sur « Passer »"},
    "pt": {"name":"Dicepup","next":"Próximo","back":"Voltar","start":"Jogar","again":"De novo","done":"Muito bem!","pass":"Passar","wrong":"Quase! Tente de novo","tapIt":"Toque no que brilha","pickN":"Escolha um número abaixo","pressPass":"Toque em “Passar”"},
    "de": {"name":"Dicepup","next":"Weiter","back":"Zurück","start":"Spielen","again":"Nochmal","done":"Gut gemacht!","pass":"Passen","wrong":"Fast! Versuch es noch einmal","tapIt":"Tippe auf das Leuchtende","pickN":"Wähle unten eine Zahl","pressPass":"Drücke „Passen“"},
    "ru": {"name":"Дайспап","next":"Далее","back":"Назад","start":"Сыграем","again":"Ещё раз","done":"Получилось!","pass":"Пас","wrong":"Не совсем — попробуй ещё!","tapIt":"Нажми на светящееся место","pickN":"Выбери число внизу","pressPass":"Нажми «Пас»"},
    "tr": {"name":"Dicepup","next":"İleri","back":"Geri","start":"Hadi oynayalım","again":"Tekrar","done":"Harika!","pass":"Pas","wrong":"Tam değil — tekrar dene!","tapIt":"Parlayan yere dokun","pickN":"Aşağıdan bir sayı seç","pressPass":"“Pas”a bas"},
    "id": {"name":"Dicepup","next":"Berikutnya","back":"Kembali","start":"Ayo main","again":"Lagi","done":"Berhasil!","pass":"Pass","wrong":"Belum tepat — coba lagi!","tapIt":"Ketuk tempat yang menyala","pickN":"Pilih angka di bawah","pressPass":"Tekan “Pass”"},
    "hi": {"name":"डाइसपप","next":"आगे","back":"पीछे","start":"खेलें","again":"फिर से","done":"बहुत अच्छे!","pass":"पास","wrong":"लगभग! फिर कोशिश करें","tapIt":"चमकती जगह छुएँ","pickN":"नीचे से एक संख्या चुनें","pressPass":"“पास” दबाएँ"},
    "ar": {"name":"دايس باب","next":"التالي","back":"رجوع","start":"لنلعب","again":"مرة أخرى","done":"أحسنت!","pass":"تمرير","wrong":"قريب! حاول مرة أخرى","tapIt":"المس المكان المضيء","pickN":"اختر رقمًا بالأسفل","pressPass":"اضغط «تمرير»"},
  };
  const PAT = { 0: [0, 0, 0, 0, 0], 1: [0, 0, 1, 0, 0], 2: [1, 0, 0, 0, 1], 3: [1, 0, 1, 0, 1], 4: [1, 1, 0, 1, 1], 10: [1, 1, 1, 1, 1] };
  /* the pages (patolli/tour.js PAGES): rule, p0 / p1 = the positions of your pieces (red, near) and the rival's (the rest wait),
     rolls = the throws that come up, in order; check(m, k) → text key of a wrong choice; kind = a special task */
  const PAGES = [
    { id: 'intro', rule: 'bell', p0: [], p1: [], kind: 'mine' },
    { id: 'board', rule: 'bell', p0: [], p1: [], kind: 'last' },
    { id: 'beans', rule: 'bell', p0: [], p1: [], rolls: [3], kind: 'count' },
    { id: 'enter', rule: 'bell', p0: [], p1: [20], rolls: [3] },
    { id: 'enter1', rule: 'bell', p0: [9], p1: [20], rolls: [1], check: m => m.enter ? null : 'enter1.ng' },
    { id: 'move', rule: 'bell', p0: [5], p1: [33], rolls: [4] },
    { id: 'own', rule: 'bell', p0: [3, 6, 12], p1: [39], rolls: [3] },   // 3 → 6 your own piece, 6 → 9 the rival's (its 39 = your 9): only 12 → 15 moves
    { id: 'again', rule: 'bell', p0: [5, 10], p1: [40], rolls: [2, 3], glow: [7], check: (m, k) => k === 1 && !m.again ? 'again.ng' : null, twice: true },
    { id: 'pen', rule: 'bell', p0: [2], p1: [44], rolls: [2] },
    { id: 'goal', rule: 'bell', p0: [58, 57, 60, 60, 20], p1: [41, 60, 12], rolls: [2], check: m => m.finish ? null : 'goal.ng' },
    { id: 'stuck', rule: 'bell', p0: [59, 58, 60, 60, 60, 60], p1: [35, 60, 60, 12], rolls: [3], kind: 'pass' },
    { id: 'win', rule: 'bell', p0: [57, 60, 60, 60, 60, 60], p1: [30, 12, 60, 60], rolls: [3], check: m => m.finish ? null : 'win.ng' },
    { id: 'pop1', rule: 'popular', p0: [], p1: [30], rolls: [1] },
    { id: 'pop2', rule: 'popular', p0: [12, 5], p1: [40, 18], rolls: [2], check: m => m.capture ? null : 'pop2.ng' },   // your 14 = a centre square = the rival's 40
    { id: 'pop3', rule: 'popular', p0: [9, 22], p1: [16, 35], rolls: [0], kind: 'pass', last: true },
  ];

  function start(ctx) {
    const T3 = ctx.Table3D, L = Object.assign({}, UI.en, UI[ctx.lang] || {});
    try { localStorage.setItem('aicoding-patolli-rules-seen', '1'); } catch (e) {}
    let stopped = false, step = 0, played = false, busy = false, timers = [], E = null, TX = null, kit = null, st = null, n = null, k = 0, phase = '', againAt = 0;
    const later = (f, ms) => timers.push(setTimeout(() => { if (!stopped) f(); }, ms));
    const sleep = ms => new Promise(r => later(r, ms));
    const T = (key, v) => { const D = (TX && (TX[ctx.lang] || TX.en)) || {}; let s = D[key]; if (s == null && TX) s = TX.en[key]; if (s == null) s = ''; if (v) s = s.replace(/\{(\w+)\}/g, (_, x) => v[x] != null ? v[x] : ''); return s; };
    const AD = (window.Atlas3D && Atlas3D.patolli) || {}, SND = AD.SND || { put() {}, hop() {}, take() {}, roll() {}, beanHit() {}, coin() {}, again() {}, home() {} };
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    /* ---------- the guide panel (the shared .rgd look of every course) ---------- */
    const el = document.createElement('div'); el.className = 'rgd';
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GUIDE}" alt=""></div><div class="bub"><div class="urm" role="status" aria-live="polite"></div><div class="nm">${L.name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="back">◀ ${L.back}</button><span class="dots"></span><button type="button" class="btn big" data-a="next">${L.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    $('.dots').innerHTML = PAGES.map(() => '<i></i>').join('');
    const css = document.createElement('style');
    css.textContent = '.rgd .urq{display:flex;gap:6px}.rgd .urq button{flex:1;min-width:0;max-width:64px;padding:7px 0;border-radius:12px;border:2px solid #eadfc6;background:#fff;font:900 17px var(--round,inherit);color:#2b3044;cursor:pointer;box-shadow:0 3px 0 #e2d6b8}.rgd .urq button:active{transform:translateY(2px);box-shadow:0 1px 0 #e2d6b8}'
      + '.rgd .urp{display:inline-flex;align-items:center;gap:6px;padding:7px 18px;border-radius:99px;border:0;background:#12a4b8;color:#fff;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 3px 0 #0b6f7e;white-space:nowrap}.rgd .urp.ps{background:#d8452c;box-shadow:0 3px 0 #97301f}'
      + '.rgd .ptr{display:flex;align-items:center;gap:8px;flex-wrap:wrap}'
      + '.rgd .ptn{display:block;margin-top:4px;font-size:.84em;line-height:1.5;color:#7a7f94;font-weight:600}'
      + '.rgd .dots i{width:6px!important;height:6px!important;margin:0 1.5px!important}'
      + '@media (max-width:600px){.rgd .urh .tg span{font-size:11.5px!important}.rgd .dots i{width:4px!important;height:4px!important;margin:0 1px!important}}'
      + '@media (max-width:600px) and (max-height:900px){.rgd .tx{font-size:13.5px;line-height:1.5;min-height:0}.rgd .cnt{margin-top:4px}.rgd .cnt .tag{font-size:13px;padding:4px 12px}.rgd .urq button{padding:5px 0;font-size:16px}.rgd .ptn{font-size:.8em;line-height:1.4}}'
      + '.rgd .urm{position:absolute;left:12px;right:12px;bottom:calc(100% + 8px);display:flex;justify-content:center;pointer-events:none;opacity:0;transform:translateY(6px);transition:opacity .2s,transform .2s}.rgd .urm.on{opacity:1;transform:none}'
      + '.rgd .urm span{background:#fff0ee;color:#c23a2a;border:2px solid #f3c4bc;border-radius:14px;padding:6px 14px;font:800 14px/1.4 var(--round,inherit);box-shadow:0 6px 16px -8px rgba(120,30,0,.5);text-align:center}'
      + '.rgd .urn{font:900 20px var(--round,inherit);color:#0e8a9b;margin-inline-start:4px;direction:ltr;unicode-bidi:isolate}.rgd .urh{display:grid;gap:6px;font-size:14px;line-height:1.6;color:#4a4f66}.rgd .urh b{color:#2b3044}.rgd .urh .tg{display:flex;gap:6px;flex-wrap:wrap}.rgd .urh .tg span{padding:2px 10px;border-radius:99px;background:#f8f0e0;border:1.5px solid #eadfc6;font-weight:800;font-size:12.5px;color:#5a4a2a}';
    document.head.appendChild(css);
    // the guide's voice: a soft blip as the words type out (every guided course has it — common rule)
    let AC = null;
    const blip = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return; AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume(); const f = 520 + Math.random() * 240, t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.035, t + .005); g.gain.exponentialRampToValueAtTime(.001, t + .06); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + .08); } catch (e) {} };
    let typeT = 0;
    function say(html) {
      const tx = $('.tx'); tx.innerHTML = window.TapWord ? TapWord.fix(html) : html; clearInterval(typeT);
      const nodes = []; (function walk(nd) { nd.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walk(c); }); })(tx);
      nodes.forEach(([nd]) => { nd.textContent = ''; });
      let ni = 0, ci = 0, bc = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let q = 0; q < 4; q++) { if (ni >= nodes.length) return clearInterval(typeT); const [nd, s] = nodes[ni]; const ch = s[ci]; nd.textContent = s.slice(0, ++ci); if (ch && !/[\s、。，．,.!?！？…—「」]/.test(ch) && ++bc % 3 === 0) blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 22);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([nd, s]) => { nd.textContent = s; }); };
      const pic = $('.pic'); pic.classList.remove('talk'); void pic.offsetWidth; pic.classList.add('talk');
    }
    const cnt = html => { $('.cnt').innerHTML = html || ''; $('.cnt').onclick = null; msg(''); };
    const tag = (html, bg, col) => `<span class="tag" style="white-space:normal;height:auto;line-height:1.35;display:inline-block${bg ? `;background:${bg};color:${col}` : ''}">${html}</span>`;
    let msgT = 0;
    function msg(html) { const m = $('.urm'); clearTimeout(msgT); m.innerHTML = html || ''; m.classList.toggle('on', !!html); if (html) msgT = setTimeout(() => m.classList.remove('on'), 3400); }
    const P = () => PAGES[step];
    const body = pg => pg.id === 'intro' ? `<b>${T('intro.t')}</b>　${T('intro.win')}` : `<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}${TX && TX.ja[pg.id + '.n'] ? `<span class="ptn">${T(pg.id + '.n')}</span>` : ''}`;
    const rollBtn = () => `<button type="button" class="urp" data-ptr="roll">${esc(T('roll'))}</button>`;
    const taskOf = pg => pg.id === 'intro' ? T('notMine') : T(pg.id + '.k');
    function buttons() {
      const pg = P(), wait = !played;
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = (window.TapWord ? TapWord.fix : x => x)(pg.last && played ? L.start + ' ▶' : wait ? ({ roll: T('first'), count: L.pickN, pass: L.pressPass }[phase] || L.tapIt) : L.next + ' ▶');
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
      PAGES.forEach(pg => {
        const t = body(pg), kk = taskOf(pg);
        const list = [tag(`👆 ${kk}`), tag(`✓ ${T(pg.id + '.ok', { n: 3 })}`)];
        if (pg.rolls) list.push(`<div class="ptr">${rollBtn()}${tag(`👆 ${kk}`)}</div>`, tag(`<span class="urn">= 10</span>　👆 ${kk}`));
        if (pg.twice) list.push(`<div class="ptr">${rollBtn()}${tag(`👆 ${T('again.k2')}`)}</div>`);
        if (pg.kind === 'count') list.push(`<div style="display:grid;gap:6px;width:100%"><b>${T('beans.k2')}</b><div class="urq"><button>0</button></div></div>`);
        if (pg.kind === 'pass') list.push(`<div style="display:grid;gap:6px"><span>${T(pg.id + '.k2')}</span><div><button type="button" class="urp ps">${L.pass}</button></div></div>`);
        if (pg.id === 'intro') list.push(`<div class="urh"><div class="tg"><span>📍 ${T('intro.origin')}</span><span>👥 ${T('intro.players')}</span><span>⏱ ${T('intro.time')}</span></div>${tag(`👆 ${kk}`)}</div>`);
        list.forEach(c => meas(t, c));
      });
      tx.innerHTML = keep[0]; cn.innerHTML = keep[1]; bub.style.minHeight = mx + 'px';
    }
    addEventListener('resize', lockH);

    /* ---------- the position of a page; the words and numbers on the mat ---------- */
    function ST(pg) {
      const s = E.newGame(pg.rule), N = E.RULES[pg.rule].pieces, full = a => { const r = a.slice(); while (r.length < N) r.push(0); return r; };
      s.pos = [full(pg.p0), full(pg.p1)]; s.turn = 0; return s;
    }
    const RL = () => E.RULES[st.rule];
    const rcOf = (side, i) => { const q = E.coords(st.rule, side, i, st.dir[side]); return q ? { r: q[0], c: q[1] } : null; };
    const idxAt = (side, r, c) => { for (const p of st.pos[side]) { if (p < 1 || p > RL().L) continue; const q = rcOf(side, p); if (q.r === r && q.c === c) return p; } return -1; };
    const legal = () => n ? E.legalMoves(st, n) : [];
    function labels(g) {
      g = g || st;
      kit.labels(ctx.el.parentNode, { gold0: [T('tYou'), g.gold[0]], gold1: [T('tOpp'), g.gold[1]], pool: [T('tPool'), g.pool], start0: [T('tWait')], goal0: [T('tHome')], start1: [T('tWait')], goal1: [T('tHome')] });
    }
    function marks() {
      if (!kit || !st) return;
      const pg = P(); kit.marks.clear();
      if (pg.kind === 'mine' && !played) { for (let i = 0; i < 6; i++) kit.marks.tray(0, 'start', 0xffd65a, i); }
      if (pg.kind === 'last') { if (!played) { kit.marks.path(0, 1, RL().L, 0xffe27a); const q = rcOf(0, RL().L); kit.marks.ring(q.r, q.c, 0xffd65a); } else { const q = rcOf(0, RL().L); kit.marks.cell(q.r, q.c, 0x3df59a, .5); } }
      if (!played && !againAt) (pg.glow || []).forEach(i => { const q = rcOf(0, i); kit.marks.glow(q.r, q.c, 0xffd65a, .55); });
      if (againAt && !played) { const q = rcOf(0, againAt); kit.marks.glow(q.r, q.c, 0x6ec8ff, .6); }   // landed on an arm end: that is why you throw again
      if (phase === 'roll' && !busy) kit.marks.spot('dock', 0xffffff);
      if (phase === 'move') {
        for (const m of legal()) {
          const col = m.capture ? 0xffb020 : m.pen ? 0xff5d5d : m.again ? 0x6ec8ff : 0x3df59a;
          if (m.from === 0) kit.marks.tray(0, 'start', 0xffd65a, 0); else { const q = rcOf(0, m.from); kit.marks.ring(q.r, q.c, 0xffd65a); }
          if (m.finish) kit.marks.tray(0, 'goal', col, st.pos[0].filter(p => p > RL().L).length); else { const q = rcOf(0, m.to); kit.marks.cell(q.r, q.c, col, .42); }
        }
      }
    }

    /* ---------- pages ---------- */
    function go(nn) {
      step = Math.max(0, Math.min(PAGES.length - 1, nn)); played = false; busy = false; phase = ''; n = null; k = 0; againAt = 0;
      timers.forEach(clearTimeout); timers = [];
      const pg = P(); lockH();
      kit.setRule(pg.rule); st = ST(pg); kit.beansBig(false, 0); kit.sync(st); kit.restBeans(null); labels();
      phase = pg.kind === 'last' || pg.kind === 'mine' ? 'tap' : 'roll';
      say(body(pg));
      if (pg.id === 'intro') cnt(`<div class="urh"><div class="tg"><span>📍 ${T('intro.origin')}</span><span>👥 ${T('intro.players')}</span><span>⏱ ${T('intro.time')}</span></div>${tag(`👆 ${taskOf(pg)}`)}</div>`);
      else if (phase === 'roll') cnt(`<div class="ptr">${rollBtn()}${tag(`👆 ${taskOf(pg)}`)}</div>`);
      else cnt(tag(`👆 ${taskOf(pg)}`));
      marks(); buttons();
    }
    function ok(textKey, v) {
      played = true; busy = false; phase = 'done'; marks(); cnt(tag(`✓ ${T(textKey, v) || L.done}`, '#e8f8ee', '#16784a')); SND.home(); buttons();
      if (!P().last) { const s0 = step; if (window.AtlasRgdTimer) AtlasRgdTimer($('[data-a=next]'), 2200, () => step === s0); later(() => { if (step === s0 && played) go(step + 1); }, 2200); }   // solved: on to the next page by itself (as every course)
    }
    function ng(textKey, v, html) { msg(`<span>${html || (textKey ? T(textKey, v) : L.wrong)}</span>`); const b = $('.bub'); if (b.animate) b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 }); }
    // the payments of a move / a pass (the engine's events), as on the table: beads fly, then the numbers change
    async function pays(before, res) {
      const sh = { gold: before.gold.slice(), pool: before.pool };
      for (const e of res.ev) {
        if (e.t !== 'pay' && e.t !== 'pot') continue;
        const from = e.t === 'pot' ? 'pool' : e.from;
        SND.coin(); await kit.pay(from, e.to, e.amt); if (stopped) return;
        if (from === 'pool') sh.pool -= e.amt; else sh.gold[from] -= e.amt;
        if (e.to === 'pool') sh.pool += e.amt; else sh.gold[e.to] += e.amt;
        kit.gems(sh.gold, sh.pool); labels(sh); await sleep(300); if (stopped) return;
      }
    }
    async function roll() {
      const pg = P(); if (phase !== 'roll' || busy || !pg.rolls) return;
      busy = true; marks(); msg('');
      const v = pg.rolls[Math.min(k, pg.rolls.length - 1)]; k++;
      kit.beansBig(true, 0);   // thrown large over the middle of the mat, where the marks can be counted
      await kit.roll(0, PAT[v].slice().sort(() => Math.random() - .5)); if (stopped) return;
      n = v; busy = false;
      if (pg.kind === 'count') {   // how many beans show their white mark? (a choice)
        phase = 'count'; marks();
        cnt(`<div style="display:grid;gap:6px;width:100%"><b>${T('beans.k2')}</b><div class="urq">${[0, 1, 2, 3, 4, 5].map(x => `<button type="button" data-urn="${x}">${x}</button>`).join('')}</div></div>`);
        $('.cnt').onclick = e => { const b = e.target.closest('[data-urn]'); if (!b || phase !== 'count') return; if (+b.dataset.urn === n) { $('.cnt').onclick = null; kit.beansBig(false); ok('beans.ok', { n }); } else ng('beans.ng'); };
        buttons(); return;
      }
      if (pg.kind === 'pass') {   // nothing can move (or a zero): press Pass — the payment to the pool follows
        phase = 'pass'; marks();
        cnt(`<div style="display:grid;gap:6px"><span><span class="urn">= ${n}</span>　${T(pg.id + '.k2')}</span><div><button type="button" class="urp ps" data-ptr="pass">${L.pass}</button></div></div>`);
        kit.beansBig(false); buttons(); return;
      }
      phase = 'move';
      cnt(tag(`<span class="urn">= ${n}</span>　👆 ${pg.twice && k === 2 ? T('again.k2') : taskOf(pg)}`));
      busy = true; await kit.beansBig(false); if (stopped) return; busy = false;   // the throw was seen large: the beans step aside, the mat is free for the move
      marks(); buttons();
    }
    async function pass() {
      if (phase !== 'pass' || busy) return;
      busy = true; const before = st, res = E.apply(st, null, n);
      await pays(before, res); if (stopped) return;
      st = res.state; st.turn = 0; kit.sync(st); labels();
      ok(P().id + '.ok');
    }
    // why a piece cannot move with this throw (patolli/tour.js why())
    function why(from) {
      if (from === 0) return n !== 1 ? T('need1') : T('noMove');
      const to = from + n, R = RL();
      if (to > R.goal) return T('over', { n });
      if (to <= R.L) { if (st.pos[0].includes(to)) return T('own'); const q = rcOf(0, to); if (st.pos[1].some(p => p >= 1 && p <= R.L && (o => o.r === q.r && o.c === q.c)(rcOf(1, p)))) return T('opp'); }
      return T('noMove');
    }
    async function play(m) {
      const pg = P();
      if (pg.check) { const bad = pg.check(m, k); if (bad) { ng(bad); return; } }
      busy = true; phase = 'anim'; kit.marks.clear(); msg('');
      await kit.move(0, m.from, m.to, { capture: m.capture, onStep: () => SND.hop(), onHit: () => SND.take(), onLand: () => (m.finish ? SND.home : SND.put)() });
      if (stopped) return;
      const before = st, r = E.apply(st, m, n);
      await pays(before, r); if (stopped) return;
      st = r.state; st.turn = 0; n = null; busy = false; kit.sync(st); labels();
      if (pg.twice && r.again && k < pg.rolls.length) {   // an arm end: throw again
        SND.again(); againAt = m.to; phase = 'roll';
        cnt(`<div class="ptr">${rollBtn()}${tag(`${esc(T('again'))}　👆 ${T('again.k2')}`)}</div>`);
        kit.restBeans(null); marks(); buttons(); return;
      }
      ok(pg.id + '.ok');
    }
    function onClick(e) {
      if (stopped || busy || T3.wasDrag() || e.target.closest('.rgd') || !kit || !st || played) return;
      const pg = P(), h = kit.hit(e);
      if (phase === 'tap') {
        if (pg.kind === 'mine') { if (h && h.tray === 'start' && h.side === 0) ok('', null); else ng('notMine'); return; }
        if (h && h.r != null) { const q = rcOf(0, RL().L); if (q.r === h.r && q.c === h.c) { ok('board.ok'); return; } }
        ng('board.ng'); return;
      }
      if (phase === 'roll') { roll(); return; }
      if (phase !== 'move' || !h || h.dock) return;
      const ms = legal();
      if (h.tray) {
        if (h.side !== 0) { ng('notMine'); return; }
        if (h.tray === 'start' && st.pos[0].includes(0)) { const m = ms.find(x => x.from === 0); if (m) play(m); else ng(null, null, why(0)); }
        else if (h.tray === 'goal') { const m = ms.find(x => x.finish); if (m) play(m); }
        return;
      }
      const i = idxAt(0, h.r, h.c);
      if (i > 0) { const m = ms.find(x => x.from === i); if (m) play(m); else ng(null, null, why(i)); return; }
      const m = ms.find(x => !x.finish && (q => q.r === h.r && q.c === h.c)(rcOf(0, x.to)));   // its destination
      if (m) { play(m); return; }
      if (idxAt(1, h.r, h.c) > 0) ng('notMine');
    }
    el.addEventListener('click', e => { const b = e.target.closest('[data-ptr]'); if (!b || stopped) return; if (b.dataset.ptr === 'roll') roll(); else pass(); });
    $('[data-a=next]').onclick = () => { if (P().last && played) ctx.onStart(); else go(step + 1); };
    $('[data-a=back]').onclick = () => { if (step) go(step - 1); else if (ctx.onExit) ctx.onExit(); };
    ctx.el.addEventListener('click', onClick);
    const onKey = e => {
      if (e.target.closest && e.target.closest('input,textarea,select,[contenteditable]')) return;
      if (e.key === ' ' && (phase === 'roll' || phase === 'pass')) { e.preventDefault(); e.stopPropagation(); if (phase === 'roll') roll(); else pass(); return; }
      if (e.key === 'Enter' || e.key === 'ArrowRight') { e.stopPropagation(); e.preventDefault(); const nx = $('[data-a=next]'); if (!nx.disabled && !(e.key === 'ArrowRight' && P().last)) nx.click(); }
      else if (e.key === 'ArrowLeft') { e.stopPropagation(); e.preventDefault(); if (step) go(step - 1); }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => el.classList.add('on'));
    // the game's rules and words (patolli/engine.js, patolli/tour.js), then the board
    say('…'); $('[data-a=back]').style.visibility = 'hidden'; $('[data-a=next]').disabled = true;
    loadJS(BASE + EV, () => !!window.PatolliEngine).then(() => loadJS(BASE + TV, () => !!window.PatolliTour)).then(() => {
      if (stopped) return; E = window.PatolliEngine; TX = window.PatolliTour && PatolliTour._TX;
      kit = window.PatolliKit.make(T3, { sfx: x => SND[x] && SND[x](), top: true, stage: true });   // the course: straight down, the same view on every page; the beans thrown large in view
      later(() => go(0), 250);
    }).catch(e => { console.error('[patolli rules]', e); say('⚠'); });
    const sess = {
      stop() { stopped = true; if (kit) kit.stop(); clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); removeEventListener('resize', lockH); document.removeEventListener('keydown', onKey, true); el.remove(); css.remove(); },
      panel: el,
      _debug: { step: () => step, pages: PAGES.map(p => p.id), phase: () => phase, played: () => played, busy: () => busy, n: () => n, legal: () => E && st ? legal() : [], st: () => st && E.clone(st), kit: () => kit, go,
        rc: (side, i) => rcOf(side, i), last: () => rcOf(0, RL().L), cell: (r, c) => kit && kit.projCell(r, c), slot: (side, kind, kk) => kit && kit.projSlot(side, kind, kk) },
    };
    window.__rulesSess = sess;   // (tests)
    return sess;
  }
  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.patolli = { start };
})();
