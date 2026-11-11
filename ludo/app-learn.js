/* ludo/app-learn.js — 学ぶ（共通仕様：ルール → レッスン → パズル のタブの一覧ダイアログ、手本はセネト）
   - ルール：ludo/tour.js（ルドー／パチーシのチュートリアル、shared/ruletour.js）
   - レッスン（lessons.json）：カテゴリのタブ（アイコン＋名前＋合格数）→ カテゴリの見出しカード → ミニ盤付きのカード（PC 2列）。
     開くと説明（ミニ盤）→ 準備 2（考え方：盤に矢印と印／例題：採点なし）→ 採点問題5（満点20、ヒント3段階：考え方 → 見るところ → 答え、
     誤答はやり直し）→ 合格75。終わりの画面は「レッスンに戻る」「もう一度」「次のステップ」。
   - （パズルは 2026-11-09 に廃止）
     → 問題（★：ヒントなし・まちがいなし3、ヒント／やり直し2、答えを見たら1）。
   問題は本体の盤で解く（SP＝特別モード：G を一時的に差し替え。app.js の commit は SP_commit へ）。
   Shares the globals of app.js (classic scripts): G, SP, SP_commit, settings, LANG, t, E, B, drawBoard, showThrow, placeAll, pcEls, geo, gMarks … */
'use strict';
(function () {
  const LS_STORE = STORE + '-lessons', LS_CAT = STORE + '-ls-cat';
  let LESSONS = null;
  // 2026-11-09: shorter steps — a basics step (lb / pb) is the rule's explanation and ONE question; a tactics step (lt / pt) three questions
  const lessonsReady = fetch('lessons.json?v=2').then(r => r.json()).then(d => {
    d.steps.forEach(st => { const basic = /^(lb|pb)$/.test(st.cat); if (basic) st.ramp = st.ramp.filter(r => r.k === 'explain'); st.problems = st.problems.slice(0, basic ? 1 : 3); });
    return (LESSONS = d); }).catch(() => null);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const prog = k => { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } };
  const progSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const showOv = s => $(s).classList.add('show'), hideOv = s => $(s).classList.remove('show');
  const kTitle = (kind, rule) => t(kind === 'enter' || kind === 'safe' ? 'k.' + kind + '.' + rule : 'k.' + kind);
  const kTip = (kind, rule) => t(kind === 'enter' || kind === 'safe' ? 'kd.' + kind + '.' + rule : 'kd.' + kind);
  const sOk = () => [880, 1320].forEach((f, i) => setTimeout(() => tone(f, .35, 'triangle', .06), i * 150));   // 「ピ〜ンポ〜ン」
  const sNg = () => tone(200, .2, 'sawtooth', .04);
  // lesson progress: { id: { best, pass } } (old saves: a number = the best score)
  const lsRec = (pr, id) => { const r = pr[id]; return r == null ? null : typeof r === 'number' ? { best: r, pass: r >= 75 } : r; };

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
  const throwText = (rule, th) => rule === 'pachisi' ? t('throw.cowrie', { u: th.face, v: th.v }) : String(th.v);
  const mvName = m => !m ? '' : (m[0] < 0 ? '—' : '');
  function moveText(st, mv) { const m = E.legalMoves(st, SP ? SP.thr : G.thr).find(x => !x.pass && x.k === mv[0] && x.to === mv[1]); return m ? E.moveText(st, m) : ''; }
  const isOk = (p, m) => !m.pass && (p.ok || [p.best]).some(a => a[0] === m.k && a[1] === m.to);

  /* ---------------- marks (board2d grid units) ---------------- */
  function marksSVG(marks) {
    return (marks || []).map(m => {
      if (m.type === 'arrow') { const [x0, y0] = m.from, [x1, y1] = m.to, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, ex = x1 - ux * .42, ey = y1 - uy * .42;
        return `<g class="mk-ar"><path d="M${x0 + ux * .3} ${y0 + uy * .3}L${ex} ${ey}" stroke="#123" stroke-opacity=".55" stroke-width=".26" stroke-linecap="round"/><path d="M${x0 + ux * .3} ${y0 + uy * .3}L${ex} ${ey}" stroke="${m.color}" stroke-width=".16" stroke-linecap="round"/>` +
          `<path d="M${x1 - ux * .2} ${y1 - uy * .2}L${ex - uy * .26} ${ey + ux * .26}L${ex + uy * .26} ${ey - ux * .26}Z" fill="${m.color}" stroke="#123" stroke-opacity=".5" stroke-width=".05"/></g>`; }
      const [x, y] = m.at; return `<circle cx="${x}" cy="${y}" r=".46" fill="none" stroke="#123" stroke-opacity=".55" stroke-width=".2"/><circle class="mk-ring" cx="${x}" cy="${y}" r=".46" fill="none" stroke="${m.color}" stroke-width=".11"/>`;
    }).join('');
  }
  // a mini board: the 2D board with the pieces and marks, cut out around the focus (the marks) and enlarged
  function miniSVG(st, marks, o) {
    o = o || {};
    const rule = st.rule, d = B.drawBoard(rule, settings.design[rule]), g = B.geometry(rule), L = E.lastOf(st), n = d.n, groups = {};
    for (const seat of st.seats) st.pos[seat].forEach((p, k) => { const key = p < 0 || p >= L ? 'y' + seat + k : String(E.cellOf(rule, seat, p)); (groups[key] = groups[key] || []).push([seat, k, p]); });
    let pcs = '';
    for (const key in groups) { const A = groups[key]; A.forEach(([seat, k, p], i) => { let [x, y] = p < 0 ? g.yard(seat, k) : p >= L ? g.home(seat, k) : g.cellXY(seat, p); let z = rule === 'pachisi' ? .95 : 1; if (A.length > 1) { const a = i / A.length * Math.PI * 2 - Math.PI / 2; x += Math.cos(a) * .16; y += Math.sin(a) * .16; z *= .78; } if (p >= L) z *= .58; pcs += `<g transform="translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${z})">${B.pieceSVG(rule, seat)}</g>`; }); }
    let vb = `-0.4 -0.4 ${n + .8} ${n + .8}`;
    const pts = []; (o.focus || marks || []).forEach(m => { if (m.at) pts.push(m.at); if (m.from) pts.push(m.from); if (m.to) pts.push(m.to); });
    if (o.crop !== false && pts.length) {
      const min = rule === 'pachisi' ? 9 : 8; let x0 = Math.min(...pts.map(p => p[0])) - 1.2, x1 = Math.max(...pts.map(p => p[0])) + 1.2, y0 = Math.min(...pts.map(p => p[1])) - 1.2, y1 = Math.max(...pts.map(p => p[1])) + 1.2;
      let w = Math.max(min, x1 - x0, y1 - y0); const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      if (w < n - 1) { let a = Math.max(-.4, Math.min(n + .4 - w, cx - w / 2)), b = Math.max(-.4, Math.min(n + .4 - w, cy - w / 2)); vb = `${a.toFixed(2)} ${b.toFixed(2)} ${w.toFixed(2)} ${w.toFixed(2)}`; }
    }
    return `<span class="mb"><svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${d.svg}${marksSVG(marks)}${pcs}</svg></span>`;
  }

  /* ---------------- the special board: a lesson / puzzle position on the main board ---------------- */
  function enterSpecial(o) {   // o: { s (packed), t, marks, title, canMove, kind }
    if (!SP) { SP = { saved: G }; if (window.LudoRv) LudoRv.close(); }
    const s = unpack(o.s), thr = o.t ? throwOf(s.rule, o.t) : null;
    Object.assign(SP, o, { state: s, thr });
    G = { opts: { rule: s.rule }, mode: 'pvp', level: 20, state: s, thr, log: [], hist: [], plies: [] };
    token++; busy = false;
    drawBoard(); rollLabel(); showThrow(thr); paintSpecial();
  }
  function paintSpecial() {
    clearMarks(); gMarks.innerHTML = marksSVG(SP.marks);
    $('#btnRoll').disabled = true; $('#btnPass').classList.add('hidden');
    if (SP.canMove && G.thr) {
      moves = E.legalMoves(G.state, G.thr);
      new Set(moves.filter(m => !m.pass).map(m => m.k)).forEach(k => pcEls['0,' + k] && pcEls['0,' + k].classList.add('can'));
      $('#btnPass').classList.toggle('hidden', !moves.some(m => m.pass));
    } else moves = [];
    setStatus('');
  }
  function exitSpecial(silent) {
    if (window.CardBar) CardBar.cancelAuto();
    if (!SP) return;
    G = SP.saved; SP = null; lesson = null;
    document.body.classList.remove('in-lesson');
    token++; busy = false;
    if (!silent && G) { drawBoard(); rollLabel(); showThrow(G.thr); renderKifu(); step(); }
  }
  let lesson = null;
  // a move tapped on the special board
  SP_commit = async function (m) {
    if (busy || !SP) return;
    if (lesson) return lessonMove(m);
  };
  async function playMove(m) {   // the right answer: the piece walks there (captures fly home)
    busy = true; clearMarks(); $('#btnPass').classList.add('hidden');
    const s0 = G.state, g0 = G;
    await animateMove(s0, m); if (G !== g0) return false;
    if (m.cap && m.cap.length) { sCap(); await animateCaptures(s0, m.cap); if (G !== g0) return false; }
    G.state = E.apply(s0, m, G.thr).state; G.state.turn = 0; placeAll(); busy = false;
    return true;
  }

  /* ---------------- tabs of the list dialogs: switching tabs shows the new dialog at once on top of the old one ---------------- */
  // the tabs: ルール（ルドー） · ルール（パチーシ） · レッスン (2026-11-09: the rule picks moved up into the tabs; puzzles retired)
  function tabLabels() { const [o, c] = /^(ja|zh)/.test(LANG) ? ['（', '）'] : [' (', ')'];
    $$('.ls-tabs').forEach(g => g.querySelectorAll('button').forEach(b => { const v = b.dataset.v; if (v === 'lesson') { b.textContent = t('tab.lesson'); return; }
      if (innerWidth <= 600) b.innerHTML = `<span class="tl">${t('tab.rules')}</span><span class="tn">${t('rule.' + v.slice(6))}</span>`;   // phones: two lines
      else b.textContent = t('tab.rules') + o + t('rule.' + v.slice(6)) + c; })); void o; void c; }
  function selTab(v) { tabLabels(); $$('.ls-tabs').forEach(g => g.querySelectorAll('button').forEach(b => { const on = b.dataset.v === v; b.classList.toggle('sel', on); b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); })); }
  const LIST_OV = ['#rulesOverlay', '#lessonOverlay'];
  $$('.ls-tabs').forEach(g => g.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b || b.classList.contains('sel')) return;
    const v = b.dataset.v, want = v === 'lesson' ? '#lessonOverlay' : '#rulesOverlay';
    const was = LIST_OV.filter(s => s !== want && $(s).classList.contains('show'));
    if (v === 'lesson') await openLessons(); else openRules(v.slice(6));
    requestAnimationFrame(() => was.forEach(s => { if (s === '#rulesOverlay') closeRules(); else hideOv(s); }));
  }));
  function setHtml(el, html) { if (el.__h !== html) { el.__h = html; el.innerHTML = html; } }

  /* ---------------- rules ---------------- */
  let rrule = null;
  function openRules(rule) {
    rrule = rule || rrule || (G ? G.state.rule : settings.rule);
    selTab('rules-' + rrule); showOv('#rulesOverlay');
    try { localStorage.setItem('aicoding-ludo-rules-seen', '1'); } catch (e) {}
    LudoTour.open({ mount: '#rulesBody', rule: rrule, lang: () => LANG, design: settings.design,
      sound: k => { if (k === 'step') sTick(); else if (k === 'cap') sCap(); else if (k === 'ok') tone(880, .12); else if (k === 'roll') sRattle(); },
      onClose: () => closeRules(), onPlay: () => { closeRules(); openNew(); }, onLessons: () => { closeRules(); openLessons(); } });
  }
  function closeRules() { try { LudoTour.stop(); } catch (e) {} hideOv('#rulesOverlay'); }
  $('#btnRules').onclick = () => openRules();

  /* ---------------- lessons ---------------- */
  const LS_IC = {
    lb: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.3"/><circle cx="15" cy="15" r="1.3"/><circle cx="15" cy="9" r="1.3"/><circle cx="9" cy="15" r="1.3"/></svg>',
    lt: '<svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.2L20 9l-4.3 3.9L17 19l-5-3-5 3 1.3-6.1L4 9l5.8-.8z"/></svg>',
    pb: '<svg viewBox="0 0 24 24"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>',
    pt: '<svg viewBox="0 0 24 24"><path d="M5 21V9l7-5 7 5v12"/><path d="M9 21v-6h6v6M5 13l14 0"/></svg>',
  };
  const lxBar = (p, ok) => `<span class="lx-bar${ok ? ' ok' : ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span>`;
  async function openLessons(cat0) {
    const d = await lessonsReady; selTab('lesson');
    if (!d) { toast(t('ls.fail')); return; }
    let cat = cat0 || ''; if (!cat) try { cat = localStorage.getItem(LS_CAT) || ''; } catch (e) {}
    if (!d.cats.some(c => c.id === cat)) cat = (d.cats.find(c => c.rule === (G ? G.state.rule : settings.rule)) || d.cats[0]).id;
    const pr = prog(LS_STORE), stat = c => ({ n: c.steps.length, ok: c.steps.filter(id => (lsRec(pr, id) || {}).pass).length });
    setHtml($('#lsCats'), d.cats.map(c => { const z = stat(c); return `<button data-c="${c.id}" class="${c.id === cat ? 'sel' : ''}"><span class="ic">${LS_IC[c.id]}</span><span class="nm">${esc(t('lsc.' + c.id))}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join(''));
    const C = d.cats.find(c => c.id === cat), q = stat(C);
    const banner = `<div class="lx-banner"><span class="ic">${LS_IC[cat]}</span><span class="tx"><b>${esc(t('lsc.' + cat))}</b><small>${esc(t('lscd.' + cat))}</small></span><span class="pg">${esc(t('ls.passed', { a: q.ok, b: q.n }))}${lxBar(q.ok / q.n, true)}</span></div>`;
    const cards = C.steps.map((id, k) => { const s = d.steps.find(x => x.id === id); if (!s) return ''; const r = lsRec(pr, id);
      const st = r ? (r.pass ? `<span class="lx-st ok">✓ ${esc(t('ls.pass'))}</span>` : `<span class="lx-st">${esc(t('ls.score', { n: r.best }))}</span>`) : `<span class="lx-st new">${esc(t('ls.new'))}</span>`;
      return `<button class="lx-card${r && r.pass ? ' clear' : ''}" data-id="${id}"><span class="lx-th">${miniSVG(unpack(s.diagram.s), s.diagram.marks)}</span><span class="lx-tx">` +
        `<span class="lx-top"><span class="lx-no">STEP ${k + 1}</span>${st}</span><b class="lx-t">${esc(kTitle(s.kind, s.rule))}</b><small class="lx-sub">${esc(kTip(s.kind, s.rule))}</small>` +
        `<span class="lx-desc">${esc(t('lb.' + s.kind + '.' + s.rule))}</span>${lxBar(r ? r.best / 100 : 0, r && r.pass)}</span></button>`; }).join('');
    setHtml($('#lessonList'), banner + `<div class="lx-grid">${cards}</div>`);
    showLessonView('lessonListView'); showOv('#lessonOverlay');
  }
  $('#lsCats').onclick = e => { const b = e.target.closest('button[data-c]'); if (!b) return; try { localStorage.setItem(LS_CAT, b.dataset.c); } catch (x) {} openLessons(b.dataset.c); };
  $('#lessonList').onclick = e => { const b = e.target.closest('.lx-card'); if (b) openIntro(b.dataset.id); };
  function showLessonView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
  let introId = null;
  function openIntro(id) {
    const d = LESSONS, s = d.steps.find(x => x.id === id); introId = id;
    $('#liStep').textContent = t('lsc.' + s.cat);
    $('#liTitle').textContent = kTitle(s.kind, s.rule);
    // the common lesson page (shared/luxintro.js, 2026-11-11): board · facts · how to think · trivia — as much as shogi's page
    if (window.LuxIntro) {
      const FIG = `<div class="dg" style="width:min(340px,80vw);margin:0">${miniSVG(unpack(s.diagram.s), s.diagram.marks, { crop: false })}</div>`, THK = `<p><b>${esc(kTip(s.kind, s.rule))}</b></p><p>${esc(t('lb.' + s.kind + '.' + s.rule))}</p>`;
      LuxIntro.load('lux.json?v=1').then(X => {
        if (introId !== id || $('#lessonIntroView').classList.contains('hidden')) return;
        const P = LuxIntro.pick, U = P(X.ui || {}) || {}, x = (X.lessons || {})[s.id] || {}, H = k => LuxIntro.head(k, LANG), tr = P(x.trivia), n = typeof s.problems === 'number' ? s.problems : (s.problems || []).length;
        LuxIntro.lesson({ step: $('#liStep').textContent, title: $('#liTitle').textContent, fig: FIG, cap: U.figL, chips: [[U.kind, (U.probs || '').replace('{n}', n)], [U.pass, U.passPts]],
          secs: [{ h: H('think'), html: THK }, tr && { h: H('trivia'), html: tr, cls: 'lx-trivia' }].filter(Boolean) });
      });
      showLessonView('lessonIntroView'); showOv('#lessonOverlay'); return;
    }
    $('#liBody').innerHTML = `<p><b>${esc(kTip(s.kind, s.rule))}</b></p><p>${esc(t('lb.' + s.kind + '.' + s.rule))}</p><div class="dg">${miniSVG(unpack(s.diagram.s), s.diagram.marks, { crop: false })}</div><p style="font-size:12.5px;color:var(--dim)">${esc(t('ls.needPass'))}</p>`;
    showLessonView('lessonIntroView'); showOv('#lessonOverlay');
  }
  $('#btnLessonBack').onclick = () => openLessons();
  $('#btnLessonClose').onclick = () => hideOv('#lessonOverlay');
  $('#btnLessonStart').onclick = () => startLesson(introId);
  $('#btnLesson').onclick = () => openLessons();

  function startLesson(id) {
    const s = LESSONS.steps.find(x => x.id === id); if (!s) return;
    hideOv('#lessonOverlay');
    lesson = { id, step: s, phase: 'ramp', i: 0, scores: [], hint: 0, done: false, wrong: false };
    document.body.classList.add('in-lesson');
    loadItem();
  }
  const lsItem = () => lesson.phase === 'ramp' ? lesson.step.ramp[lesson.i] : lesson.step.problems[lesson.i];
  function loadItem() {
    const it = lsItem(); lesson.hint = 0; lesson.done = false; lesson.wrong = false;
    enterSpecial({ s: it.s, t: it.t, marks: it.k === 'explain' ? it.marks : [], canMove: it.k !== 'explain', title: kTitle(lesson.step.kind, lesson.step.rule) });
    renderLessonCard();
  }
  async function lessonMove(m) {
    const it = lsItem(); if (lesson.done || it.k === 'explain') return;
    if (isOk(it, m)) {
      lesson.done = true; SP.canMove = false; sOk();
      const ok = await playMove(m); if (!ok || !lesson) return;
      if (lesson.phase === 'ramp') fb(`<b class="ok">${esc(t('ls.rampGood'))}</b> ${esc(t('kw.' + lesson.step.kind))}`);
      else { const pts = score(); lesson.scores[lesson.i] = pts; fb(`<b class="ok">${esc(t('ls.right'))}</b> ${esc(t('kw.' + lesson.step.kind))} <b>${esc(t('ls.score', { n: pts }))}</b>`); }
      renderLessonCard();
      if (window.CardBar) CardBar.autoNext({ ok: () => lesson && lesson.done, btn: '#lsNext', ms: 1800 });
      return;
    }
    lesson.wrong = true; sNg();
    fb(`<b class="ng">${esc(t('ls.ng'))}</b>`);
  }
  function score() { const S = LESSONS.score; if (lesson.hint >= 3) return S.answer; if (lesson.hint === 2) return S.hint[1]; if (lesson.hint === 1) return lesson.wrong ? Math.min(S.retry, S.hint[0]) : S.hint[0]; return lesson.wrong ? S.retry : S.per; }
  function fb(html) { $('#lsFb').innerHTML = html; }
  function renderLessonCard() {
    if (!lesson) return;
    const s = lesson.step, it = lsItem(), ramp = lesson.phase === 'ramp', rule = s.rule;
    $('#lsStep').textContent = ramp ? t('ls.rampStep', { i: lesson.i + 1, n: s.ramp.length }) : `${kTitle(s.kind, rule)} · ${lesson.i + 1}/${s.problems.length}`;
    $('#lsDots').innerHTML = ramp ? '' : s.problems.map((_, i) => { const v = lesson.scores[i]; return `<i class="${v == null ? '' : v >= 20 ? 'ok' : v > 0 ? 'part' : 'ng'} ${i === lesson.i ? 'cur' : ''}"></i>`; }).join('');
    $('#lsTitle').textContent = ramp ? (it.k === 'explain' ? t('ls.explainT') : t('ls.exampleT')) : kTitle(s.kind, rule);
    const task = t('ls.task', { c: t('c.' + rule + '.0'), v: throwText(rule, G.thr || it.t) });
    let pr;
    if (ramp && it.k === 'explain') pr = `<p>${esc(t('lb.' + s.kind + '.' + rule))}</p><p style="font-size:12px;color:var(--dim)">${esc(t('ls.rampNote'))}</p>`;
    else if (ramp) pr = `<p>${esc(t('ls.exampleQ'))}</p><p><b>${esc(task)}</b></p><p style="font-size:12px;color:var(--dim)">${esc(t('ls.rampNote'))}</p>`;
    else pr = `<p><b>${esc(task)}</b></p><p style="font-size:12.5px;color:var(--muted)">${esc(kTip(s.kind, rule))}</p>`;
    $('#lsPrompt').innerHTML = pr;
    if (!lesson.done && !lesson.wrong && lesson.hint === 0) fb('');
    const nx = $('#lsNext');
    nx.textContent = ramp ? (lesson.i + 1 < s.ramp.length ? t('ls.next') : t('ls.rampMain')) : (lesson.i + 1 < s.problems.length ? t('ls.next') : t('ls.finish'));
    nx.disabled = !(it.k === 'explain' || lesson.done);
    $('#lsHint').textContent = ramp && it.k === 'explain' ? t('ls.rampSkip') : lesson.hint >= 2 ? t('ls.answer') : t('ls.hint');
    $('#lsHint').disabled = lesson.done && !(ramp && it.k === 'explain');
  }
  $('#lsHint').onclick = () => {
    if (!lesson) return; const it = lsItem(), s = lesson.step;
    if (lesson.phase === 'ramp' && it.k === 'explain') { lesson.phase = 'prob'; lesson.i = 0; loadItem(); return; }   // skip the warm-up
    if (lesson.done) return;
    lesson.hint++;
    if (lesson.hint === 1) fb(`💡 ${esc(t('lh.' + s.kind))}`);
    else if (lesson.hint === 2) { fb(`💡 ${esc(t('ls.look'))}`); SP.marks = it.look || []; gMarks.innerHTML = marksSVG(SP.marks); }
    else {   // the answer: an arrow on the board; the problem counts 0
      lesson.done = true; SP.canMove = false; if (lesson.phase !== 'ramp') lesson.scores[lesson.i] = 0;
      const p = it, bm = E.legalMoves(G.state, G.thr).find(x => !x.pass && x.k === p.best[0] && x.to === p.best[1]);
      SP.marks = answerMarks(bm); paintSpecial();
      fb(`${esc(t('ls.ans', { m: bm ? E.moveText(G.state, bm) : '' }))} — ${esc(t('kw.' + s.kind))}`);
    }
    renderLessonCard();
  };
  function answerMarks(m) {
    if (!m) return []; const g = geo, L = E.lastOf(G.state);
    const at = (p, k) => p < 0 ? g.yard(0, k) : p >= L ? g.home(0, k) : g.cellXY(0, p);
    return [{ type: 'arrow', from: at(m.from, m.k), to: at(m.to, m.k), color: '#3df59a' }, { type: 'ring', at: at(m.to, m.k), color: '#3df59a' }];
  }
  $('#lsNext').onclick = () => {
    if (!lesson) return; const s = lesson.step;
    if (lesson.phase === 'ramp') { if (lesson.i + 1 < s.ramp.length) lesson.i++; else { lesson.phase = 'prob'; lesson.i = 0; } loadItem(); return; }
    if (lesson.i + 1 < s.problems.length) { lesson.i++; loadItem(); return; }
    finishLesson();
  };
  function finishLesson() {
    const D = LESSONS, s = lesson.step, tot = Math.round(lesson.scores.reduce((a, b) => a + (b || 0), 0) / (D.score.per * s.problems.length) * 100), pass = tot >= D.score.pass;   // (out of 100 whatever the number of questions)
    const pr = prog(LS_STORE), old = lsRec(pr, s.id) || { best: 0, pass: false };
    pr[s.id] = { best: Math.max(old.best, tot), pass: old.pass || pass }; progSet(LS_STORE, pr);
    $('#ldTitle').textContent = pass ? t('ls.pass') : t('ls.notYet');
    $('#ldSub').innerHTML = `${esc(kTitle(s.kind, s.rule))}<br><b style="font-size:26px;color:var(--accent)">${esc(t('ls.score', { n: tot }))}</b> / 100<br>${esc(t('ls.needPass'))}`;
    const all = D.cats.flatMap(c => c.steps), nx = all[all.indexOf(s.id) + 1];
    $('#btnLessonNextStep').classList.toggle('hidden', !nx); lesson.next = nx;
    if (pass) sHome(); else sNg();
    showLessonView('lessonDoneView'); showOv('#lessonOverlay');
  }
  const catOf = id => { const c = LESSONS && LESSONS.cats.find(x => x.steps.includes(id)); return c ? c.id : null; };
  function backToList(id) { exitSpecial(); openLessons(catOf(id)).then(() => { const el = id && $('#lessonList').querySelector(`[data-id="${id}"]`); if (el) el.scrollIntoView({ block: 'center' }); }); }
  $('#btnLessonQuit2').onclick = () => { const id = lesson && lesson.id; hideOv('#lessonOverlay'); backToList(id); };
  $('#btnLessonRetry').onclick = () => { const id = lesson && lesson.id; hideOv('#lessonOverlay'); if (id) startLesson(id); };
  $('#btnLessonNextStep').onclick = () => { const nx = lesson && lesson.next; hideOv('#lessonOverlay'); exitSpecial(); if (nx) openIntro(nx); };
  $('#lsList').onclick = () => backToList(lesson && lesson.id);
  $('#lsQuit').onclick = () => exitSpecial();

  window.LudoLearn = {
    openRules, openLessons, quit: () => exitSpecial(), exitSpecial, startLesson, lessonsReady, miniSVG, marksSVG,
    get active() { return !!SP; },
    relang() {
      if ($('#rulesOverlay').classList.contains('show')) openRules();
      if (lesson) renderLessonCard(); tabLabels();
      if ($('#lessonOverlay').classList.contains('show') && !$('#lessonListView').classList.contains('hidden')) openLessons();
    },
    open(which) { if (which === 'lesson') openLessons(); else openRules(); },
  };
  void mvName; void moveText;
})();
