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
    ja: { name: 'ダイスン', next: 'つぎへ', back: 'もどる', start: '対局してみる', again: 'もういちど', roll: '盤をタップして振る', done: 'できた！', hist: '歴史', winH: '勝ち方', cult: '文化', pass: 'パス', choose: '白い印はいくつ？', wrong: 'ちがうよ〜。もう一度！', tapIt: '光っている所をタップしてね' },
    en: { name: 'Dicepup', next: 'Next', back: 'Back', start: "Let's play", again: 'Again', roll: 'Tap the board to roll', done: 'Well done!', hist: 'History', winH: 'How to win', cult: 'Culture', pass: 'Pass', choose: 'How many white tips?', wrong: 'Not quite — try again!', tapIt: 'Tap the glowing spot' },
    zh: { name: '骰子汪', next: '下一步', back: '返回', start: '开始对局', again: '再来一次', roll: '点击棋盘掷骰', done: '做到了！', hist: '历史', winH: '胜利方法', cult: '文化', pass: '跳过', choose: '白点有几个？', wrong: '不对哦，再试一次！', tapIt: '点击发光的位置' },
    ko: { name: '다이슨', next: '다음', back: '이전', start: '대국하기', again: '다시', roll: '판을 탭해서 굴리기', done: '잘했어!', hist: '역사', winH: '이기는 법', cult: '문화', pass: '패스', choose: '흰 표시는 몇 개?', wrong: '아니야~ 다시 해 봐!', tapIt: '빛나는 곳을 탭해 줘' },
    es: { name: 'Dicepup', next: 'Siguiente', back: 'Atrás', start: 'A jugar', again: 'Otra vez', roll: 'Toca el tablero para tirar', done: '¡Bien hecho!', hist: 'Historia', winH: 'Cómo ganar', cult: 'Cultura', pass: 'Pasar', choose: '¿Cuántas puntas blancas?', wrong: '¡Casi! Prueba otra vez', tapIt: 'Toca lo que brilla' },
    fr: { name: 'Dicepup', next: 'Suivant', back: 'Retour', start: 'Jouer', again: 'Encore', roll: 'Touche le plateau pour lancer', done: 'Bravo !', hist: 'Histoire', winH: 'Comment gagner', cult: 'Culture', pass: 'Passer', choose: 'Combien de pointes blanches ?', wrong: 'Presque ! Réessaie', tapIt: 'Touche ce qui brille' },
    pt: { name: 'Dicepup', next: 'Próximo', back: 'Voltar', start: 'Jogar', again: 'De novo', roll: 'Toque no tabuleiro para lançar', done: 'Muito bem!', hist: 'História', winH: 'Como ganhar', cult: 'Cultura', pass: 'Passar', choose: 'Quantas pontas brancas?', wrong: 'Quase! Tente de novo', tapIt: 'Toque no que brilha' },
    de: { name: 'Dicepup', next: 'Weiter', back: 'Zurück', start: 'Spielen', again: 'Nochmal', roll: 'Tippe aufs Brett zum Würfeln', done: 'Gut gemacht!', hist: 'Geschichte', winH: 'So gewinnt man', cult: 'Kultur', pass: 'Passen', choose: 'Wie viele weiße Spitzen?', wrong: 'Fast! Versuch es noch einmal', tapIt: 'Tippe auf das Leuchtende' },
    hi: { name: 'डाइसपप', next: 'आगे', back: 'पीछे', start: 'खेलें', again: 'फिर से', roll: 'बोर्ड छूकर पासे फेंकें', done: 'बहुत अच्छे!', hist: 'इतिहास', winH: 'जीतने का तरीका', cult: 'संस्कृति', pass: 'पास', choose: 'कितनी सफ़ेद नोकें?', wrong: 'लगभग! फिर कोशिश करें', tapIt: 'चमकती जगह छुएँ' },
    ar: { name: 'دايس باب', next: 'التالي', back: 'رجوع', start: 'لنلعب', again: 'مرة أخرى', roll: 'المس اللوحة للرمي', done: 'أحسنت!', hist: 'التاريخ', winH: 'طريقة الفوز', cult: 'الثقافة', pass: 'تمرير', choose: 'كم رأسًا أبيض؟', wrong: 'قريب! حاول مرة أخرى', tapIt: 'المس المكان المضيء' },
  };
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
    el.innerHTML = `<div class="rgd-in"><div class="pic"><img src="${GUIDE}" alt=""></div><div class="bub"><div class="nm">${L.name}<span class="pg"></span></div><div class="tx"></div><div class="cnt"></div></div></div>
      <div class="rgd-act"><button type="button" class="btn ghost sm" data-a="back">◀ ${L.back}</button><span class="dots"></span><button type="button" class="btn big" data-a="next">${L.next} ▶</button></div>`;
    ctx.panel.appendChild(el);
    const $ = s => el.querySelector(s);
    $('.dots').innerHTML = PAGES.map(() => '<i></i>').join('');
    const css = document.createElement('style');
    css.textContent = '.rgd .urq{display:flex;gap:8px;flex-wrap:wrap}.rgd .urq button{min-width:44px;padding:7px 12px;border-radius:12px;border:2px solid #eadfc6;background:#fff;font:900 17px var(--round,inherit);color:#2b3044;cursor:pointer;box-shadow:0 3px 0 #e2d6b8}.rgd .urq button:active{transform:translateY(2px);box-shadow:none}'
      + '.rgd .urp{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:99px;border:0;background:#5f78d6;color:#fff;font-weight:900;font-size:15px;cursor:pointer;box-shadow:0 3px 0 #3c52a8}'
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
    const cnt = html => { $('.cnt').innerHTML = html || ''; };
    const P = () => PAGES[step];
    const waiting = () => P().id !== 'intro' && !played;
    function buttons() {
      const pg = P(), wait = waiting();
      $('[data-a=back]').style.visibility = step ? '' : 'hidden';
      const nx = $('[data-a=next]');
      nx.textContent = pg.last && played ? L.start + ' ▶' : wait ? (phase === 'roll' ? L.roll : L.tapIt) : L.next + ' ▶';
      nx.disabled = !!wait; nx.classList.toggle('wait', !!wait);
      $('.dots').querySelectorAll('i').forEach((d, i) => d.className = i === step ? 'on' : i < step ? 'done' : '');
      $('.pg').textContent = `${step + 1} / ${PAGES.length}`;
      let ag = el.querySelector('[data-a=again]');
      if (pg.last && played && !ag) { ag = document.createElement('button'); ag.type = 'button'; ag.className = 'btn ghost sm'; ag.dataset.a = 'again'; ag.textContent = '↻ ' + L.again; $('.rgd-act').insertBefore(ag, nx); ag.onclick = () => go(0); }
      if (!(pg.last && played) && ag) ag.remove();
    }

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
      if (n != null && phase !== 'roll') kit.marks.dice(PAT[n], 0);
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
      const pg = P(); cnt('');
      if (pg.id === 'intro') {
        say(`<b>${T('intro.t')}</b>`);
        cnt(`<div class="urh"><div class="tg"><span>📍 ${T('intro.origin')}</span><span>👥 ${T('intro.players')}</span><span>⏱ ${T('intro.time')}</span></div><div><b>${L.hist}</b>　${T('intro.hist')}</div><div><b>${L.winH}</b>　${T('intro.win')}</div><div><b>${L.cult}</b>　${T('intro.cult')}</div></div>`);
        if (kit) { st = E.newGame('finkel', 0); kit.sync(st); kit.restDice(0, null); kit.marks.clear(); }
        buttons(); return;
      }
      st = E.clone(pg.s); kit.sync(st); kit.restDice(0, null);
      phase = pg.kind === 'last' ? 'tap' : 'roll';
      say(`<b>${T(pg.id + '.t')}</b>　${T(pg.id + '.b')}`);
      cnt(`<span class="tag" style="white-space:normal;height:auto;line-height:1.35;display:inline-block">👆 ${T(pg.id + '.k')}</span>`);
      marks(); buttons();
    }
    function ok(textKey, v) { played = true; busy = false; phase = 'done'; sel = -1; marks(); cnt(`<span class="tag" style="white-space:normal;height:auto;line-height:1.35;display:inline-block;background:#e8f8ee;color:#16784a">✓ ${T(textKey, v)}</span>`); SND.home(); buttons(); }
    function ng(textKey, v) { cnt(`<span class="tag" style="white-space:normal;height:auto;line-height:1.35;display:inline-block;background:#fff0ee;color:#c23a2a">${textKey ? T(textKey, v) : L.wrong}</span>`); const b = $('.bub'); if (b.animate) b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 }); }
    async function roll() {
      const pg = P(); if (phase !== 'roll' || busy) return;
      busy = true; cnt('');
      const v = pg.rolls[Math.min(k, pg.rolls.length - 1)]; k++;
      await kit.roll(0, PAT[v].slice()); if (stopped) return;
      n = v; busy = false;
      if (pg.kind === 'count') {   // how many white tips? (a choice)
        phase = 'count'; marks();
        cnt(`<div style="display:grid;gap:6px"><b>${L.choose}</b><div class="urq">${[0, 1, 2, 3, 4].map(x => `<button type="button" data-urn="${x}">${x}</button>`).join('')}</div></div>`);
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
      cnt(`<span class="tag" style="white-space:normal;height:auto;line-height:1.35;display:inline-block">🎲 <span class="urn">= ${n}</span>　👆 ${pg.twice && k === 2 ? T('ros.k2') : T(pg.id + '.k')}</span>`);
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
      if (pg.twice && r.again && k < pg.rolls.length) { SND.ros(); phase = 'roll'; marks(); cnt(`<span class="tag" style="white-space:normal;height:auto;line-height:1.35;display:inline-block;background:#e8f0ff;color:#2f4fb0">🌸 ${T('again')} ${T('ros.k2')}</span>`); buttons(); return; }
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
      if (!m) { ng(null); cnt(`<span class="tag" style="white-space:normal;height:auto;line-height:1.35;display:inline-block;background:#fff0ee;color:#c23a2a">${why(from)}</span>`); return; }
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
    loadJS(BASE + 'engine.js?v=2', () => !!window.UrEngine).then(() => loadJS(BASE + 'tour.js?v=1', () => !!window.UrTour)).then(() => {
      if (stopped) return; E = window.UrEngine; TX = window.UrTour && UrTour._TX;
      kit = window.UrKit.make(T3, { sfx: x => SND[x] && SND[x]() });
      later(() => go(0), 250);
    }).catch(() => say('⚠'));
    return {
      stop() { stopped = true; if (kit) kit.stop(); clearInterval(typeT); timers.forEach(clearTimeout); ctx.el.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey, true); el.remove(); css.remove(); },
      panel: el,
      _debug: { step: () => step, phase: () => phase, played: () => played, n: () => n, sel: () => sel, legal: () => E && st ? legal() : [], st: () => st && st.pos.map(a => a.slice()),
        cell: (r, c) => kit && kit.projCell(r, c), slot: (side, kind, kk) => kit && kit.projSlot(side, kind, kk), rc: i => E && rcOf(0, i), go },
    };
  }
  window.AtlasRules = window.AtlasRules || {};
  window.AtlasRules.ur = { start };
})();
