/* ludo/app-learn.js — 学ぶ：ルール（ludo/tour.js）、レッスン（learn.json の lessons：1ステップ5問・満点100・75で合格）、
   次の一手パズル（learn.json の puzzles：ルールごと60問）。問題は本体の盤で解く（SP＝特別モード中は G を一時的に差し替え）。
   Shares the globals of app.js (classic scripts): G, SP, settings, LANG, t, E, B, drawBoard, showThrow, placeAll, pcEls, … */
'use strict';
(function () {
  const LS_STORE = STORE + '-lessons', PZ_STORE = STORE + '-puzzles';
  let DATA = null;
  const ready = fetch('learn.json?v=1').then(r => r.json()).then(d => (DATA = d)).catch(() => null);
  const prog = k => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
  const progSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const kindTitle = (kind, rule) => t(kind === 'enter' || kind === 'safe' ? 'k.' + kind + '.' + rule : 'k.' + kind);
  const kindDesc = (kind, rule) => t(kind === 'enter' || kind === 'safe' ? 'kd.' + kind + '.' + rule : 'kd.' + kind);
  function unpack(p) {
    const s = E.newGame({ rule: p.r, players: p.players });
    Object.assign(s, { seats: p.seats.slice(), team: p.team.slice(), pos: p.pos.map(a => a && a.slice()), entered: p.entered.slice(), opt: Object.assign({}, p.opt), turn: 0, streak: 0, over: false, winner: -1 });
    s.ctrl = [0, 1, 2, 3].map(x => s.pos[x] ? (x === 0 ? 0 : 1) : -1);
    return s;
  }
  function throwOf(rule, t0) {
    const T = E.throwsOf(rule).find(x => x.v === t0.v);
    if (rule !== 'pachisi') return Object.assign({}, T);
    const up = T.face, sh = [0, 1, 2, 3, 4, 5].map(i => i < up); for (let i = 5; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [sh[i], sh[j]] = [sh[j], sh[i]]; }
    return Object.assign({ shells: sh }, T);
  }
  /* ---------------- the special mode (a problem on the main board) ---------------- */
  const bar = () => document.getElementById('lsBar');
  function enter(o) {   // o: { kind: 'lesson'|'puzzle', rule, list: [problems], idx, title, onDone }
    if (!SP) SP = { saved: G };
    Object.assign(SP, o, { score: 0, got: [], answered: false });
    document.body.classList.add('in-learn');
    show();
  }
  function show() {
    const p = SP.list[SP.idx], s = unpack(p.s);
    G = { opts: { rule: s.rule }, mode: 'pvp', level: 20, state: s, thr: throwOf(s.rule, p.t), log: [], hist: [] };
    SP.answered = false; token++; busy = false;
    drawBoard(); rollLabel(); showThrow(G.thr); clearMarks();
    moves = E.legalMoves(G.state, G.thr);
    new Set(moves.filter(m => !m.pass).map(m => m.k)).forEach(k => pcEls['0,' + k].classList.add('can'));
    $('#btnPass').classList.toggle('hidden', !moves.some(m => m.pass)); $('#btnRoll').disabled = true;
    paintBar();
  }
  function paintBar(msg, cls) {
    const b = bar(), p = SP.list[SP.idx], rule = G.state.rule;
    const dots = SP.kind === 'lesson' ? `<div class="ls-dots">${SP.list.map((_, i) => `<i class="${i < SP.got.length ? (SP.got[i] >= 20 ? 'ok' : SP.got[i] > 0 ? 'half' : 'ng') : i === SP.idx ? 'cur' : ''}"></i>`).join('')}</div>` : `<div class="ls-dots"><span>${t('ls.prog', { n: SP.idx + 1, m: SP.list.length })}</span>${'★'.repeat(p.d || 1)}</div>`;
    b.innerHTML = `<div class="ls-h"><b>${SP.title}</b>${dots}</div><div class="ls-task">${t('ls.task', { c: t('c.' + rule + '.0'), v: G.thr.v })}</div>` +
      (msg ? `<div class="ls-msg ${cls || ''}">${msg}</div>` : '') +
      `<div class="ls-acts"><button class="btn" data-a="quit">${t('ls.quit')}</button>${SP.answered ? `<button class="btn primary" data-a="next">${t('ls.next')}</button>` : ''}</div>`;
    b.classList.remove('hidden');
  }
  // the answer: animate the chosen move, then score it and show the best move
  SP_commit = async function (m) {
    if (SP.answered || busy) return;
    busy = true; clearMarks(); $('#btnPass').classList.add('hidden');
    const p = SP.list[SP.idx], s0 = G.state, g0 = G;
    await animateMove(s0, m);
    if (G !== g0) return;
    const key = m.pass ? [-1, -1] : [m.k, m.to];
    const sc = p.sc, best = sc[0][2], worst = sc[sc.length - 1][2], mine = (sc.find(x => x[0] === key[0] && x[1] === key[1]) || [0, 0, worst])[2];
    const right = key[0] === p.best[0] && key[1] === p.best[1];
    const pts = right ? 20 : Math.max(0, Math.min(12, Math.round(20 * Math.pow((mine - worst) / Math.max(1e-6, best - worst), 2) * .6)));
    SP.answered = true; busy = false;
    if (right) { sHome(); } else { tone(200, .2, 'sawtooth', .04); }
    // show the best move: the piece glows at its start, a marker on its destination
    if (right) { G.state = E.apply(s0, m, G.thr).state; G.state.turn = 0; placeAll(); }
    else { G.state = s0; placeAll(); }
    if (!right) {
      const bk = p.best[0], el = pcEls['0,' + bk]; if (el) el.classList.add('hint');
      const [x, y] = p.best[1] >= E.lastOf(s0) ? geo.home(0, bk) : geo.cellXY(0, p.best[1]);
      gMarks.innerHTML = `<circle cx="${x}" cy="${y}" r=".42" fill="none" stroke="#7fffb0" stroke-width=".1"/>`;
    }
    const why = t('kw.' + p.kind);
    if (SP.kind === 'lesson') {
      SP.got.push(pts); SP.score += pts;
      paintBar((right ? t('ls.right') : pts >= 8 ? t('ls.close') : t('ls.wrong')) + ` <span class="pts">${t('ls.pts', { p: pts })}</span><br><small>${why}</small>`, right ? 'ok' : 'ng');
    } else {
      if (right) { const P = prog(PZ_STORE); P[SP.rule + ':' + SP.idx] = 1; progSet(PZ_STORE, P); }
      paintBar((right ? t('pz.ok') : t('ls.wrong')) + `<br><small>${why}</small>`, right ? 'ok' : 'ng');
    }
  };
  function next() {
    if (SP.kind === 'lesson' && SP.idx + 1 >= SP.list.length) { finishLesson(); return; }
    if (SP.kind === 'puzzle' && SP.idx + 1 >= SP.list.length) { quit(); return; }
    SP.idx++; show();
  }
  function finishLesson() {
    const P = prog(LS_STORE), id = SP.id, best = Math.max(P[id] || 0, SP.score); P[id] = best; progSet(LS_STORE, P);
    const pass = SP.score >= 75;
    bar().innerHTML = `<div class="ls-h"><b>${SP.title}</b></div><div class="ls-final ${pass ? 'ok' : ''}">${t('ls.done', { s: SP.score })}<small>${pass ? t('ls.pass') : t('ls.fail')}</small></div>` +
      `<div class="ls-acts"><button class="btn" data-a="quit">${t('close')}</button><button class="btn" data-a="retry">${t('ls.retry')}</button><button class="btn primary" data-a="list">${t('tab.lesson')}</button></div>`;
    if (pass) sHome();
  }
  function quit() {
    if (!SP) return;
    G = SP.saved; SP = null; document.body.classList.remove('in-learn'); bar().classList.add('hidden');
    token++; busy = false;
    if (G) { drawBoard(); rollLabel(); showThrow(G.thr); renderKifu(); step(); }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('#lsBar [data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'quit') quit();
    else if (a === 'next') next();
    else if (a === 'retry') { SP.idx = 0; SP.score = 0; SP.got = []; show(); }
    else if (a === 'list') { quit(); openLearn('lesson'); }
  });
  /* ---------------- the dialog: rules | lessons | puzzles ---------------- */
  let tab = 'rules', lrule = null;
  function openLearn(which) {
    tab = which || 'rules'; lrule = lrule || (G ? G.state.rule : settings.rule);
    $('#learnOverlay').classList.add('show'); render();
  }
  function render() {
    document.querySelectorAll('#learnTabs button').forEach(b => b.classList.toggle('on', b.dataset.v === tab));
    document.querySelectorAll('#learnRule button').forEach(b => { b.classList.toggle('on', b.dataset.v === lrule); b.textContent = t('rule.' + b.dataset.v); });
    const body = $('#learnBody');
    $('.lclose').classList.toggle('hidden', tab === 'rules');
    if (tab === 'rules') {
      body.innerHTML = '<div id="rulesBody"></div>';
      LudoTour.open({ mount: '#rulesBody', rule: lrule, lang: () => LANG, design: settings.design, sound: k => { if (k === 'step') sTick(); else if (k === 'cap') sCap(); else if (k === 'ok') tone(880, .12); else if (k === 'roll') sRattle(); },
        onClose: closeLearn, onPlay: () => { closeLearn(); openNew(); }, onLessons: () => { tab = 'lesson'; render(); } });
      return;
    }
    LudoTour.stop();
    if (!DATA) { body.innerHTML = '<p class="muted">…</p>'; ready.then(render); return; }
    if (tab === 'lesson') {
      const P = prog(LS_STORE), L = DATA.lessons.filter(l => l.rule === lrule);
      body.innerHTML = ['basics', 'tactics'].map(c => `<h3 class="ls-cat">${t('ls.' + c)}</h3><div class="ls-grid">` + L.filter(l => l.course === c).map(l => {
        const best = P[l.id] || 0;
        return `<button class="ls-card${best >= 75 ? ' pass' : ''}" data-id="${l.id}"><span class="ls-ic" style="background:${B.COL[lrule][0][0]}"></span><span class="ls-tx"><b>${kindTitle(l.kind, lrule)}</b><small>${kindDesc(l.kind, lrule)}</small></span><span class="ls-sc">${best ? t('ls.best', { s: best }) : ''}${best >= 75 ? ' ✓' : ''}</span></button>`;
      }).join('') + '</div>').join('');
    } else {
      const P = prog(PZ_STORE), list = DATA.puzzles[lrule] || [], n = list.filter((_, i) => P[lrule + ':' + i]).length;
      body.innerHTML = `<div class="pz-head">${t('pz.solved', { n, m: list.length })}</div><div class="pz-grid">` + list.map((p, i) => `<button class="pz-t${P[lrule + ':' + i] ? ' done' : ''}" data-i="${i}"><b>${i + 1}</b><small>${'★'.repeat(p.d || 1)}</small></button>`).join('') + '</div>';
    }
  }
  function closeLearn() { LudoTour.stop(); $('#learnOverlay').classList.remove('show'); }
  $('#learnTabs').onclick = e => { const b = e.target.closest('button[data-v]'); if (b) { tab = b.dataset.v; render(); } };
  $('#learnRule').onclick = e => { const b = e.target.closest('button[data-v]'); if (b) { lrule = b.dataset.v; render(); } };
  $('#learnClose').onclick = closeLearn;
  $('#learnBody').addEventListener('click', e => {
    const c = e.target.closest('.ls-card');
    if (c) { const l = DATA.lessons.find(x => x.id === c.dataset.id); closeLearn(); enter({ kind: 'lesson', id: l.id, rule: l.rule, list: l.problems, idx: 0, title: kindTitle(l.kind, l.rule) }); return; }
    const z = e.target.closest('.pz-t');
    if (z) { closeLearn(); enter({ kind: 'puzzle', rule: lrule, list: DATA.puzzles[lrule], idx: +z.dataset.i, title: t('pz.title') }); }
  });
  $('#btnRules').onclick = () => openLearn('rules');
  $('#btnLesson').onclick = () => openLearn('lesson');
  $('#btnPuzzle').onclick = () => openLearn('puzzle');
  window.LudoLearn = { open: openLearn, quit, render, get active() { return !!SP; } };
})();
