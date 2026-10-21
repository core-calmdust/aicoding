'use strict';
// Go — rules tutorial (shared/ruletour.js), lessons, openings study (定石・布石), puzzles (詰碁, PZBook v2), daily puzzle, boot.
// Shares the page globals of app.js (classic scripts).

// ====================================================================== special modes (lesson / puzzle) keep the game aside
let savedGame = null;
function stashGame() { if (!lesson && !puzzle) savedGame = { game: Object.assign({}, game), start: startSpec, moves, cur, evals: evals.slice(), humanColor, manualEnd }; }
function exitSpecial() {
  if (!lesson && !puzzle) return;
  lesson = null; puzzle = null; lessonMarks = []; labelList = null; view = null; drawnKey = '';
  document.body.classList.remove('in-lesson', 'in-puzzle');
  busyToken++; cancelWorker(); thinking = 0;
  if (savedGame) { setGame(savedGame.game); startSpec = savedGame.start; moves = savedGame.moves; cur = savedGame.cur; evals = savedGame.evals; humanColor = savedGame.humanColor; manualEnd = savedGame.manualEnd; savedGame = null; }
  else { startSpec = null; moves = []; cur = 0; evals = []; }
  reviewing = cur !== moves.length; hintList = null; count = null;
  gameOverShown = gameOver(moves.length);
  if (window.stStop) stStop();
}
function quitSpecial() { exitSpecial(); update(false); afterPosition(); }
function enterSpecial(spec, opt) {
  busyToken++; cancelWorker(); thinking = 0; stopPlay();
  spec = specFrom(spec);
  setGame({ n: spec.n, komi: (opt && opt.komi != null) ? opt.komi : 6.5, rule: 'jp', ha: 0 });
  startSpec = spec; view = opt && opt.view ? opt.view : null;
  moves = []; cur = 0; reviewing = false; hintList = null; lessonMarks = []; labelList = null; evals = []; count = null; terrOwn = null;
}
const gtp = (s, n) => s == null ? null : typeof s === 'number' ? s : R.parseCoord(s, n);
const gtps = (a, n) => (a || []).map(s => gtp(s, n)).filter(x => x != null);

// ====================================================================== rules: hands-on tutorial (only what is needed to play)
function tourBoard(api, spec, o) {
  // a small interactive board: o.click(i, pos) → handled by the page; o.marks
  const st = { pos: R.Pos.from(specFrom(spec)), last: -1, done: false, busy: false, marks: o.marks || {} };
  st.draw = () => { if (!api.alive()) return; api.board.innerHTML = miniSVG(st.pos.spec(), { cls: 'tour', last: st.last, marks: st.marks, click: !st.done && !st.busy }); };
  st.play = (i, c) => { const r = st.pos.tryPlay(i, c); if (!r) return null; st.pos = r.pos; st.last = i; sStone(false); if (r.captured.length) sCapture(r.captured.length); st.draw(); return r; };
  api.board.onclick = e => { const el = e.target.closest('[data-p]'); if (!el || st.busy || st.done || !api.alive()) return; ctx(); o.click(+el.dataset.p, st); };
  st.draw();
  return st;
}
const tP = id => ({ title: () => t('tr.' + id + '.t'), body: () => t('tr.' + id + '.b').split('\n').map(x => `<p>${x}</p>`).join(''), task: () => t('tr.' + id + '.task') });
const S9 = (rows, turn) => ({ n: rows.length, stones: rows.join('').replace(/x/g, 'b').replace(/o/g, 'w'), turn: turn || P1 });
const introPage = () => ({ id: 'intro', title: () => t('intro.t'), body: '', html: () => RuleTour.intro({ lang: LANG, img: '../images/atlas/go.webp', origin: t('intro.origin'), players: t('intro.players'), time: t('intro.time'), history: t('intro.hist'), win: t('intro.win'), culture: t('intro.cult') }) });
const TOUR_PAGES = [
  introPage(),
  // 1. place a stone on an intersection
  Object.assign({ id: 'place' }, tP('place'), { setup(api) {
    tourBoard(api, { n: 9 }, { click(i, st) { const r = st.play(i, P1); if (r) { st.done = true; st.draw(); api.ok(t('tr.place.ok')); } } });
  } }),
  // 2. liberties: a white stone in atari after 3 black stones — take its last liberty
  Object.assign({ id: 'capture' }, tP('capture'), { setup(api) {
    const sp = S9(['.....', '..x..', '.xo..', '..x..', '.....']), cap = 13;
    tourBoard(api, sp, { marks: {}, click(i, st) {
      const r = st.play(i, P1); if (!r) return;
      if (r.captured.length) { st.done = true; st.draw(); api.ok(t('tr.capture.ok')); }
      else { st.done = true; st.draw(); api.ng(t('tr.capture.ng', { m: '<bdi>' + R.coord(cap, 5) + '</bdi>' })); }
    } });
  } }),
  // 3. a connected group shares its liberties — capture two stones at once
  Object.assign({ id: 'group' }, tP('group'), { setup(api) {
    const sp = S9(['......', '..xx..', '.xoo..', '..xx..', '......', '......']);
    tourBoard(api, sp, { click(i, st) {
      const r = st.play(i, P1); if (!r) return;
      st.done = true; st.draw();
      if (r.captured.length >= 2) api.ok(t('tr.group.ok')); else api.ng(t('tr.group.ng'));
    } });
  } }),
  // 4. escape: your stone is in atari — extend to gain liberties
  Object.assign({ id: 'escape' }, tP('escape'), { setup(api) {
    const sp = S9(['......', '..o...', '.oxo..', '......', '......', '......']);
    tourBoard(api, sp, { click(i, st) {
      const r = st.play(i, P1); if (!r) return;
      const g = st.pos.group(14); st.done = true; st.draw();
      if (st.pos.b[14] === P1 && g.libs >= 2) api.ok(t('tr.escape.ok')); else api.ng(t('tr.escape.ng'));
    } });
  } }),
  // 5. no-move points: a point with no liberty is forbidden — unless it captures
  Object.assign({ id: 'suicide' }, tP('suicide'), { setup(api) {
    const sp = S9(['.ox....', 'o.ox...', '.ox....', '.......', '.......', '.......', '.......']);
    tourBoard(api, sp, { marks: {}, click(i, st) {
      if (!st.pos.legal(i)) { api.say(t('tr.suicide.no'), 'ng'); return; }
      const r = st.play(i, P1); if (!r) return;
      st.done = true; st.draw();
      if (r.captured.length) api.ok(t('tr.suicide.ok')); else api.ng(t('tr.suicide.ng'));
    } });
  } }),
  // 6. ko: you cannot take back at once — play elsewhere first
  Object.assign({ id: 'ko' }, tP('ko'), { setup(api) {
    // white has just taken a black stone in a ko shape: black may not retake immediately
    const sp = S9(['.......', '..xo...', '.x.xo..', '..xo...', '.......', '.......', '.......']);
    let p = R.Pos.from(specFrom(sp)); p.turn = P2; const r0 = p.tryPlay(16); p = r0.pos;   // white captures at the ko
    const st = tourBoard(api, p.spec(), { click(i, s) {
      if (i === s.pos.ko) { api.say(t('tr.ko.no'), 'ng'); return; }
      if (s.stage === 1) {
        const r = s.play(i, P1); if (!r) return;
        if (r.captured.length) { s.done = true; s.draw(); api.ok(t('tr.ko.ok')); } else api.say(t('tr.ko.again'));
        return;
      }
      const r = s.play(i, P1); if (!r) return;
      s.busy = true; s.draw(); api.say(t('thinking'));
      api.sleep(650).then(() => {    // white answers elsewhere (does not resolve the ko)
        const far = [44, 45, 43, 36, 38].find(q => s.pos.legal(q) && q !== i);
        s.play(far, P2); s.busy = false; s.stage = 1; s.draw(); api.say(t('tr.ko.now'));
      });
    } });
    st.pos = p; st.stage = 0; st.last = 16; st.draw();
  } }),
  // 7. territory: the empty points you surround are yours — tap the side with more territory
  Object.assign({ id: 'terr' }, tP('terr'), { setup(api) {
    const sp = S9(['..xo.....', '..xo.....', '..xo.....', '..xoo....', '...xo....', '...xo....', '...xo....', '...xo....', '...xo....']);
    const pos = R.Pos.from(specFrom(sp)), sc = R.score(pos, [], 'cn', 0);
    let st;
    st = tourBoard(api, sp, { click(i, s) {
      const c = s.pos.b[i] || (sc.own[i] === 1 ? P1 : sc.own[i] === 2 ? P2 : 0); if (!c) return;
      s.done = true; s.draw();
      const marks = {}; for (let q = 0; q < 81; q++) if (!pos.b[q] && (sc.own[q] === 1 || sc.own[q] === 2)) marks[q] = sc.own[q] === 1 ? 'sq' : 'dash';
      s.marks = marks; s.draw();
      if (c === P2) api.ok(t('tr.terr.ok', { b: sc.terrB, w: sc.terrW })); else api.ng(t('tr.terr.ng', { b: sc.terrB, w: sc.terrW }));
    } });
  } }),
  // 8. the end: both pass, dead stones are removed, territory (+ captures) and komi decide — read only
  { id: 'end', title: () => t('tr.end.t'), body: () => t('tr.end.b').split('\n').map(x => `<p>${x}</p>`).join(''), html: () => {
    const sp = S9(['..xo.....', '..xo.o...', '..xo.....', '..xoo....', '...xo..x.', '...xo....', '...xo....', '...xo....', '...xo....']);
    const marks = {}; marks[42] = 'x'; marks[14] = 'x';
    return `<div class="tour-pic">${miniSVG(sp, { cls: '', marks })}</div>`;
  } },
];
let TOUR = null;
function tourFor() {
  if (TOUR) return TOUR;
  const e = document.createElement('div'); e.className = 'tour-mount'; $('#rulesBody').appendChild(e);
  return (TOUR = RuleTour.create({
    mount: e, store: STORE + '-rules', lang: () => LANG, pages: TOUR_PAGES,
    close: () => closeRules(),
    play: () => { closeRules(); if (lesson || puzzle) quitSpecial(); openNewDialog(); },
    lessons: () => { closeRules(); openLessons(); },
    sound: k => { if (k === 'ok') playChime(true); },
  }));
}
function openRules(r, page) { selTab('rules'); showOverlay('#rulesOverlay'); if (page != null) tourFor().page = page; renderRules(); }
function closeRules() { if (TOUR) TOUR.stop(); hideOverlay('#rulesOverlay'); }
function renderRules() { const tour = tourFor(); tour.open(tour.page); }
$('#rulesClose').onclick = () => closeRules();

// ====================================================================== lessons (20 points per problem, 75 to pass)
let LESSONS = null;
const lessonsReady = fetch('lessons.json?v=1').then(r => r.json()).then(d => (LESSONS = d)).catch(() => null);
const LS_STORE = STORE + '-lessons', PZ_STORE = STORE + '-puzzles';
function lsProgress() { try { return JSON.parse(localStorage.getItem(LS_STORE) || '{}'); } catch (e) { return {}; } }
function pzProgress() { try { return JSON.parse(localStorage.getItem(PZ_STORE) || '{}'); } catch (e) { return {}; } }
let introIdx = 0;
function showLessonView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
const ICON_STONES = (a, b) => `<svg viewBox="0 0 24 24"><circle cx="9" cy="12" r="6" fill="${a}" stroke="#000" stroke-width=".6"/><circle cx="15.5" cy="12" r="6" fill="${b}" stroke="rgba(0,0,0,.5)" stroke-width=".6"/></svg>`;
const LS_ICON = {
  basics: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="3" fill="#e1b469"/><path d="M7 2v20M12 2v20M17 2v20M2 7h20M2 12h20M2 17h20" stroke="#2a1c0e" stroke-width=".9"/><circle cx="12" cy="12" r="3.6" fill="#141414"/></svg>',
  tactics: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="3" fill="#e1b469"/><path d="M4 20 20 4" stroke="#e0553d" stroke-width="2.2" stroke-linecap="round"/><circle cx="8" cy="8" r="3.4" fill="#f4f1ea" stroke="#777"/><circle cx="16" cy="16" r="3.4" fill="#141414"/></svg>',
  lifedeath: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="3" fill="#e1b469"/><circle cx="7" cy="12" r="3.2" fill="#141414"/><circle cx="12" cy="8" r="3.2" fill="#141414"/><circle cx="17" cy="12" r="3.2" fill="#141414"/><circle cx="12" cy="16" r="3.2" fill="#141414"/><circle cx="12" cy="12" r="1.4" fill="#e0553d"/></svg>',
  opening: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="3" fill="#e1b469"/><circle cx="7" cy="7" r="3" fill="#141414"/><circle cx="17" cy="17" r="3" fill="#141414"/><circle cx="17" cy="7" r="3" fill="#f4f1ea" stroke="#777"/><circle cx="7" cy="17" r="3" fill="#f4f1ea" stroke="#777"/></svg>',
  middle: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="3" fill="#e1b469"/><path d="M5 18c4-10 10-10 14-12" stroke="#e0553d" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="8" cy="9" r="3" fill="#141414"/><circle cx="15" cy="15" r="3" fill="#f4f1ea" stroke="#777"/></svg>',
  endgame: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="3" fill="#e1b469"/><path d="M2 12h20" stroke="#2a1c0e"/><rect x="5" y="4" width="4" height="4" fill="#141414"/><rect x="15" y="16" width="4" height="4" fill="#f4f1ea" stroke="#777" stroke-width=".6"/><circle cx="12" cy="12" r="3" fill="#141414"/></svg>',
};
const lsIcon = k => `<span class="ic sv">${LS_ICON[k] || ICON_STONES('#141414', '#f4f1ea')}</span>`;
const plainText = html => String(html || '').replace(/<br\s*\/?>|<\/p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const lxBar = (p, cls) => `<span class="lx-bar ${cls || ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span>`;
const lxSt = (r, okTxt) => r ? (r[okTxt ? 'pass' : 'clear'] ? `<span class="lx-st ok">✓ ${okTxt ? '' : t('ls.clear') + ' '}${t('u.pt', { n: r.best })}</span>` : `<span class="lx-st">${t('u.pt', { n: r.best })}</span>`) : `<span class="lx-st new">${t('ls.notyet')}</span>`;
function diagSVG(d, cls) {
  const sp = specFrom(d.s || d), n = sp.n, marks = {};
  for (const [p, k] of d.marks || []) { const i = gtp(p, n); if (i != null) marks[i] = k; }
  const arrows = (d.arrows || []).map(a => a.map(p => gtp(p, n)));
  return miniSVG(sp, { cls, marks, arrows, crop: d.view || cropOf(sp, Object.keys(marks).map(Number)) });
}
function lessonThumb(s) {
  if (s.diagram) return diagSVG(s.diagram, 'lxb');
  const P = s.problems[0]; return P && P.s ? miniSVG(P.s, { cls: 'lxb', crop: P.view || cropOf(P.s) }) : '';
}
const lsCourseSel = {};
const stepTitle = s => LL(s.title);
async function openLessons(v, course) {
  const d = await lessonsReady; selTab('lesson');
  if (!d) { toast(t('ls.fail')); return; }
  openChoiceIdx = -1; $('#btnLessonStart').classList.remove('hidden');
  $('#lsListTitle').textContent = t('ls.title'); $('#lsListDesc').textContent = t('ls.desc');
  const pr = lsProgress(), cOf = s => s.course || 'basics', courses = (LESSONS.courses || []).map(c => c.id).filter(id => LESSONS.steps.some(s => cOf(s) === id));
  const CI = id => (LESSONS.courses || []).find(c => c.id === id) || {};
  const stat = c => { const st = LESSONS.steps.filter(s => cOf(s) === c); return { n: st.length, ok: st.filter(s => { const r = pr[s.id]; return r && r.clear; }).length }; };
  if (course) lsCourseSel.c = course;
  let c = lsCourseSel.c;
  if (!courses.includes(c)) c = lsCourseSel.c = courses.find(k => { const q = stat(k); return q.ok < q.n; }) || courses[0];
  const q = stat(c);
  const cards = LESSONS.steps.map((s, i) => {
    if (cOf(s) !== c) return '';
    const r = pr[s.id];
    return `<button class="lx-card${r && r.clear ? ' clear' : ''}" data-i="${i}"><span class="lx-th">${lessonThumb(s)}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">STEP ${stepNo(i)}</span>${lxSt(r)}</span><b class="lx-t">${stepTitle(s)}</b><small class="lx-sub">${LL(s.sub)}</small>` +
      `<span class="lx-desc">${plainText(LL(s.intro))}</span>${lxBar(r ? r.best / 100 : 0, r && r.clear ? 'ok' : '')}</span></button>`;
  }).join('');
  $('#lessonList').innerHTML = `<div class="lx">` +
    `<div class="lx-tabs">${courses.map(k => { const z = stat(k); return `<button data-course="${k}" class="${k === c ? 'sel' : ''}">${lsIcon(k)}<span class="nm">${LL(CI(k).title)}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join('')}</div>` +
    `<div class="lx-banner">${lsIcon(c)}<span class="tx"><b>${LL(CI(c).title)}</b><small>${LL(CI(c).sub)}</small></span><span class="pg">${t('lx.cleared', { a: q.ok, b: q.n })}${lxBar(q.ok / Math.max(1, q.n), 'ok')}</span></div>` +
    `<div class="lx-grid">${cards}</div></div>`;
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
$('#lessonList').onclick = e => {
  const tb = e.target.closest('[data-course],[data-grp]'); if (tb) { if (tb.dataset.course) openLessons(null, tb.dataset.course); else openOpenings(tb.dataset.grp); return; }
  const b = e.target.closest('.lx-card[data-i]'); if (b) openIntro(+b.dataset.i);
  const o = e.target.closest('.lx-card[data-o]'); if (o) openOpeningChoice(+o.dataset.o);
};
function stepNo(i) { const c = LESSONS.steps[i].course || 'basics'; let n = 0; for (let k = 0; k <= i; k++) if ((LESSONS.steps[k].course || 'basics') === c) n++; return n; }
function courseTitle(id) { const c = (LESSONS.courses || []).find(x => x.id === id); return c ? LL(c.title) : id; }
function openIntro(i) {
  introIdx = i; openChoiceIdx = -1; $('#btnLessonStart').classList.remove('hidden'); const s = LESSONS.steps[i];
  $('#liStep').textContent = courseTitle(s.course || 'basics') + ' · STEP ' + stepNo(i);
  $('#liTitle').textContent = stepTitle(s);
  const intro = LL(s.intro); $('#liBody').innerHTML = (s.diagram ? diagSVG(s.diagram, 'mini') : '') + (/<p/.test(intro) ? intro : intro.split('\n').map(x => `<p>${x}</p>`).join(''));
  showLessonView('lessonIntroView');
}
$('#btnLessonBack').onclick = () => openChoiceIdx >= 0 ? openOpenings(OPEN.sets[openChoiceIdx] && OPEN.sets[openChoiceIdx].cat) : openLessons(null, LESSONS.steps[introIdx] && (LESSONS.steps[introIdx].course || 'basics'));
$('#btnLessonClose').onclick = () => hideOverlay('#lessonOverlay');
$('#btnLessonStart').onclick = () => startLesson(introIdx);
$('#btnLessonQuit2').onclick = () => { hideOverlay('#lessonOverlay'); quitSpecial(); };
$('#btnLessonRetry').onclick = () => { if (lesson && lesson.virt) startPractice(lesson.gi); else startLesson(lesson ? lesson.step : introIdx); };
$('#btnLessonNextStep').onclick = () => { const n = (lesson ? lesson.step : introIdx) + 1; if (n < LESSONS.steps.length) openIntro(n); else { hideOverlay('#lessonOverlay'); quitSpecial(); } };
function startLesson(step) {
  hideOverlay('#lessonOverlay');
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle');
  lesson = { step, i: 0, results: [], answered: false, hinted: false };
  document.body.classList.add('in-lesson');
  loadLessonProblem();
}
const curStep = () => lesson.virt || LESSONS.steps[lesson.step];
function lessonProblem() { return curStep().problems[lesson.i]; }
function loadLessonProblem() {
  const P = lessonProblem(), sp = specFrom(P.s);
  lesson.me = sp.turn || P1;
  enterSpecial(sp, { view: P.view || (sp.n > 9 ? cropOf(sp, gtps(P.ok, sp.n), 9) : null), komi: P.komi });
  lesson.answered = false; lesson.hinted = false;
  update(false); renderLessonCard();
  $('#lsFb').innerHTML = '';
}
function renderLessonCard() {
  const s = curStep(), n = s.problems.length;
  $('#lsStep').textContent = lesson.virt ? t('op.practiceStep', { i: lesson.i + 1, n }) : t('ls.stepq', { s: stepNo(lesson.step), i: lesson.i + 1, n });
  $('#lsTitle').textContent = lesson.virt ? LL(s.title) : stepTitle(s);
  const me = lesson.me;
  $('#lsPrompt').innerHTML = `<div class="ls-goal"><span class="pdisc p${me}"></span><span>${t('ls.turn', { c: pname(me) })} ${lesson.virt ? t('op.goal') : LL(s.goal)}</span></div>`;
  $('#lsHint').textContent = t('ls.hint');
  $('#lsDots').innerHTML = s.problems.map((_, i) => { const r = lesson.results[i]; return `<i class="${r === undefined ? '' : r >= 16 ? 'ok' : r >= 10 ? 'mid' : 'ng'} ${i === lesson.i ? 'cur' : ''}"></i>`; }).join('');
  $('#lsNext').textContent = lesson.i + 1 < n ? t('ls.next') : t('ls.result');
  $('#lsNext').disabled = !lesson.answered;
  $('#lsHint').disabled = lesson.answered;
}
function problemPoints(P, m, n) {
  if (gtps(P.ok, n).includes(m)) return 20;
  if (gtps(P.good, n).includes(m)) return 16;
  if (gtps(P.half, n).includes(m)) return 10;
  return 0;
}
async function lessonAnswer(m) {
  const P = lessonProblem(), s = curStep(), n = game.n;
  lesson.answered = true;
  const pts_ = problemPoints(P, m, n);
  lesson.results[lesson.i] = pts_;
  renderLessonCard();
  const okm = gtps(P.ok, n)[0];
  const lbl = pts_ === 20 ? 'fb.perfect' : pts_ >= 16 ? 'fb.good' : pts_ >= 10 ? 'fb.ng' : 'fb.bad';
  let fb = `<span class="pts ${pts_ >= 16 ? 'ok' : pts_ >= 10 ? 'mid' : 'ng'}">+${t('u.pt', { n: pts_ })}</span> <b class="${pts_ >= 16 ? 'ok' : 'ng'}">${t(lbl)}</b> `;
  if (lesson.virt) fb += t('op.why', { m: '<bdi>' + mvName(okm) + '</bdi>' });
  else fb += pts_ >= 16 ? LL(P.why) : (LL(P.ng) || LL(P.why));
  if (pts_ < 20 && okm != null) fb += `<br><small style="color:var(--dim)">${t('fb.answer', { m: '<bdi>' + mvName(okm) + '</bdi>' })}</small>`;
  $('#lsFb').innerHTML = fb;
  playChime(pts_ >= 16);
  playMove2(m);
  const tok = busyToken;
  await sleep(700);
  if (!lesson || tok !== busyToken) return;
  // the correct line (or the answer) is shown on the board
  moves = []; cur = 0; lessonMarks = [];
  const line = gtps(P.line, n);
  if (okm != null) lessonMarks.push({ at: okm, cls: 'ok' });
  if (m !== okm && m !== PASS) lessonMarks.push({ at: m, cls: 'ng' });
  update(false);
  if (line.length > 1) {
    await sleep(500);
    for (let k = 0; k < line.length; k++) {
      if (!lesson || tok !== busyToken) return;
      const r = posAt(cur).tryPlay(line[k]); if (!r) break;
      lessonMarks = []; playMove2(line[k]);
      labelList = line.slice(0, k + 1).map((q, j) => ({ at: q, text: String(j + 1), fs: 0.4 }));
      renderFx();
      await sleep(850);
    }
  }
}
function playMove2(m) { moves = moves.slice(0, cur); moves.push(m); cur = moves.length; hintList = null; update(true); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
$('#lsHint').onclick = () => {
  if (lesson && lesson.study) { if (window.stGo) stGo('prev'); return; }
  if (!lesson || lesson.answered) return;
  lesson.hinted = true;
  const s = curStep(), P = lessonProblem();
  lessonMarks = [];
  // the area of the answer (3x3 around it), not the point itself
  const okm = gtps(P.ok, game.n)[0];
  if (okm != null) { const n = game.n, x = okm % n, y = Math.floor(okm / n); for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < n && yy < n && !posAt(0).b[yy * n + xx]) lessonMarks.push({ at: yy * n + xx, cls: 'tri' }); } }
  $('#lsFb').innerHTML = lesson.virt ? t('op.hint') : (LL(s.hint) || t('ls.hintArea'));
  renderFx();
};
$('#lsNext').onclick = () => {
  if (lesson && lesson.study) { if (window.stGo) stGo('next'); return; }
  if (!lesson || !lesson.answered) return;
  const s = curStep();
  labelList = null;
  if (lesson.i + 1 < s.problems.length) { lesson.i++; loadLessonProblem(); return; }
  const n = lesson.results.reduce((a, b) => a + b, 0), pass = n >= 75;
  const score = `<div class="ld-score ${pass ? 'ok' : 'ng'}">${t('u.pt', { n })}<small> / ${s.problems.length * 20}</small></div>` + lesson.results.map((x, k) => `${k + 1}: ${t('u.pt', { n: x })}`).join('　') + (pass ? '' : `<br>${t('ls.needPass')}`);
  if (lesson.virt) {
    const op = opProg(), old = op[s.id] || { best: 0, pass: false }; op[s.id] = { best: Math.max(old.best, n), pass: old.pass || pass };
    try { localStorage.setItem(OP_STORE, JSON.stringify(op)); } catch (e) {}
    $('#ldTitle').textContent = t(pass ? 'op.pass' : 'ls.failed');
    $('#ldSub').innerHTML = score;
    $('#btnLessonNextStep').classList.add('hidden');
    showLessonView('lessonDoneView'); showOverlay('#lessonOverlay');
    if (pass) confetti();
    return;
  }
  const pr = lsProgress(), old = pr[s.id] || { best: 0, clear: false };
  pr[s.id] = { best: Math.max(old.best, n), clear: old.clear || pass };
  try { localStorage.setItem(LS_STORE, JSON.stringify(pr)); } catch (e) {}
  $('#ldTitle').textContent = t(pass ? 'ls.passed' : 'ls.failed');
  $('#ldSub').innerHTML = score;
  $('#btnLessonNextStep').classList.toggle('hidden', lesson.step + 1 >= LESSONS.steps.length);
  showLessonView('lessonDoneView'); showOverlay('#lessonOverlay');
  if (pass) confetti();
};
$('#lsQuit').onclick = () => quitSpecial();
$('#lsList').onclick = () => { if (!lesson) return; if (lesson.study || lesson.virt) openOpenings(); else openLessons(null, LESSONS && LESSONS.steps[lesson.step] && (LESSONS.steps[lesson.step].course || 'basics')); };

// ====================================================================== openings: 布石・定石 studied move by move (notes, side lines, engine values), then practice
let OPEN = null, openChoiceIdx = -1;
const openReady = fetch('openings.json?v=1').then(r => r.json()).then(d => (OPEN = d)).catch(() => null)
  .then(() => { if (!OPEN) document.querySelectorAll('.ls-tabs button[data-v=open]').forEach(b => b.remove()); });
const OP_STORE = STORE + '-open';
function opProg() { try { return JSON.parse(localStorage.getItem(OP_STORE) || '{}'); } catch (e) { return {}; } }
let opCatSel = '';
function opLine(g) { return gtps(g.line, g.n || 19); }
function opStart(g) { return g.start ? specFrom(Object.assign({ n: g.n || 19 }, g.start)) : g.handi ? handicapSpec(g.n || 19, g.handi) : { n: g.n || 19 }; }
function opSpecAt(g, k) { let p = R.Pos.from(opStart(g)); for (const m of opLine(g).slice(0, k)) { const r = p.tryPlay(m); if (!r) break; p = r.pos; } return p.spec(); }
function opThumb(g) {
  const L = opLine(g), k = Math.min(L.length, g.show || L.length), sp = opSpecAt(g, k);
  const nums = {}; L.slice(0, k).forEach((m, j) => { if (m >= 0) nums[m] = j + 1; });
  return miniSVG(sp, { cls: 'lxb', nums: L.length <= 30 ? nums : {}, crop: g.view || null });
}
const OP_ICON = { basic: ICON_STONES('#141414', '#f4f1ea'), hoshi: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="3" fill="#e1b469"/><path d="M2 8h20M2 14h20M8 2v20M14 2v20" stroke="#2a1c0e" stroke-width=".8"/><circle cx="14" cy="8" r="3.4" fill="#141414"/></svg>', komoku: '<svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="3" fill="#e1b469"/><path d="M2 8h20M2 14h20M8 2v20M14 2v20" stroke="#2a1c0e" stroke-width=".8"/><circle cx="14" cy="8" r="3.4" fill="#141414"/><circle cx="8" cy="8" r="3.4" fill="#f4f1ea" stroke="#777"/></svg>' };
const opIcon = k => `<span class="ic sv">${OP_ICON[k] || LS_ICON.opening}</span>`;
async function openOpenings(cat) {
  await openReady; selTab('open');
  if (!OPEN) { toast(t('ls.fail')); return; }
  $('#lsListTitle').textContent = t('op.title'); $('#lsListDesc').textContent = t('op.desc');
  const pr = opProg(), cats = (OPEN.cats || []).map(c => c.id).filter(id => OPEN.sets.some(g => g.cat === id));
  const CI = id => (OPEN.cats || []).find(c => c.id === id) || {};
  if (cat) opCatSel = cat; if (!cats.includes(opCatSel)) opCatSel = cats[0];
  const C0 = opCatSel, stat = k => { const L = OPEN.sets.filter(g => g.cat === k); return { n: L.length, ok: L.filter(g => pr[g.id] && (pr[g.id].pass || pr[g.id].seen)).length }; }, q = stat(C0);
  const lvl = g => g.level ? `<span class="lx-bd b${Math.min(3, g.level)}">${t('op.lv' + Math.min(3, g.level))}</span>` : '';
  const cards = OPEN.sets.map((g, i) => {
    if (g.cat !== C0) return '';
    const r = pr[g.id];
    return `<button class="lx-card${r && r.pass ? ' clear' : ''}" data-o="${i}"><span class="lx-th">${opThumb(g)}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">${(g.n || 19)}${t('u.ro')} · ${opLine(g).length}${t('u.te')}</span>${lvl(g)}${r ? (r.pass ? `<span class="lx-st ok">✓ ${t('u.pt', { n: r.best })}</span>` : r.seen ? `<span class="lx-st">${t('op.studied')}</span>` : `<span class="lx-st">${t('u.pt', { n: r.best || 0 })}</span>`) : `<span class="lx-st new">${t('ls.notyet')}</span>`}</span>` +
      `<b class="lx-t">${LL(g.title)}</b><small class="lx-sub">${LL(g.short)}</small><span class="lx-desc">${plainText(LL(g.story))}</span>${lxBar(r ? (r.pass ? 1 : r.seen ? 0.5 : 0) : 0, r && r.pass ? 'ok' : '')}</span></button>`;
  }).join('');
  $('#lessonList').innerHTML = `<div class="lx">` +
    `<div class="lx-tabs">${cats.map(k => { const z = stat(k); return `<button data-grp="${k}" class="${k === C0 ? 'sel' : ''}">${opIcon(k)}<span class="nm">${LL(CI(k).title)}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join('')}</div>` +
    `<div class="lx-banner">${opIcon(C0)}<span class="tx"><b>${LL(CI(C0).title)}</b><small>${LL(CI(C0).sub)}</small></span><span class="pg">${t('lx.cleared', { a: q.ok, b: q.n })}${lxBar(q.ok / Math.max(1, q.n), 'ok')}</span></div>` +
    `<div class="lx-grid">${cards}</div><p class="lx-credit">${t('op.credit')}</p></div>`;
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
function openOpeningChoice(i) {
  openChoiceIdx = i; const g = OPEN.sets[i], L = opLine(g);
  $('#liStep').textContent = t('op.title') + ' · ' + (g.n || 19) + t('u.ro');
  $('#liTitle').textContent = LL(g.title);
  const story = LL(g.story);
  $('#liBody').innerHTML = opThumb(g).replace('class="lxb', 'class="mini') + (/<p/.test(story) ? story : story.split('\n').map(x => `<p>${x}</p>`).join('')) +
    `<div class="op-choice"><button class="lesson-item" data-study="1"><span class="no">📖</span><span class="tx"><b>${t('op.study')}</b><small>${t('op.studyDesc', { n: L.length })}</small></span></button>` +
    ((g.problems || []).length ? `<button class="lesson-item" data-practice="1"><span class="no">✎</span><span class="tx"><b>${t('op.practice')}</b><small>${t('op.practiceDesc')}</small></span></button>` : '') + `</div>`;
  $('#btnLessonStart').classList.add('hidden');
  showLessonView('lessonIntroView'); showOverlay('#lessonOverlay');
}
$('#liBody').addEventListener('click', e => {
  const b = e.target.closest('.lesson-item'); if (!b || openChoiceIdx < 0) return;
  hideOverlay('#lessonOverlay');
  if (b.dataset.study) startStudy(openChoiceIdx); else startPractice(openChoiceIdx);
});
function startStudy(gi) {
  const g = OPEN.sets[gi];
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle');
  lesson = { study: true, gi, g, i: 0, results: [], answered: true, me: g.side || P1, vr: null };
  document.body.classList.add('in-lesson');
  enterSpecial(opStart(g), { view: g.view || null, komi: g.komi != null ? g.komi : (g.handi ? 0.5 : R.defaultKomi(g.n || 19, 'jp')) });
  const pr = opProg(); pr[g.id] = Object.assign({ best: 0, pass: false }, pr[g.id], { seen: true }); try { localStorage.setItem(OP_STORE, JSON.stringify(pr)); } catch (e) {}
  showStudy(false);
}
// the line being studied: the main line, or a side line (vr) branching after `at` moves
function studyLine() { const L = lesson, g = L.g, main = opLine(g); if (!L.vr) return main; const v = g.vars[L.vr.k]; return main.slice(0, v.at).concat(gtps(v.line, g.n || 19)); }
function studyNote(i) {
  const L = lesson, g = L.g;
  if (L.vr) { const v = g.vars[L.vr.k]; if (i > v.at) return LL((v.notes || {})[i - v.at]); }
  return LL((g.notes || {})[i]);
}
function showStudy(anim) {
  const L = lesson, g = L.g, line = studyLine(), i = L.i, NN = line.length;
  moves = line.slice(0, i); cur = i; lessonMarks = []; labelList = null; hintList = null;
  update(anim);
  $('#lsStep').textContent = `${t('op.study')} · ${i}/${NN}` + (L.vr ? ' · ' + t('op.var') : '');
  $('#lsTitle').textContent = LL(g.title) + (L.vr ? ' — ' + LL(g.vars[L.vr.k].title) : '');
  $('#lsDots').innerHTML = `<span class="study-bar"><span style="width:${Math.round(i * 100 / Math.max(1, NN))}%"></span></span>`;
  let pr, fb = '';
  if (i === 0) { pr = t('op.studyStart'); const s = LL(g.story); fb = plainText(s).slice(0, 220) + (plainText(s).length > 220 ? '…' : ''); }
  else {
    const side = toMoveAt(i - 1);
    const ev = !L.vr && g.evals && g.evals[i - 1] != null ? `<span class="op-eval">${t('op.evalBlack', { v: fmtLead(g.evals[i - 1]) })}</span>` : '';
    pr = `<span class="pdisc p${side}"></span><b style="font-size:16px"><bdi>${i}. ${mvAt(i - 1)}</bdi></b>${ev}`;
    fb = studyNote(i) || '';
  }
  // side lines that branch here
  const vs = (g.vars || []).map((v, k) => ({ v, k })).filter(x => x.v.at === i && !L.vr);
  if (vs.length) fb += `<div class="op-vars"><span style="font-size:12px;color:var(--muted)">${t('op.vars')}</span>${vs.map(x => `<button data-var="${x.k}">${LL(x.v.title) || t('op.var') + ' ' + (x.k + 1)}</button>`).join('')}</div>`;
  if (L.vr) fb += `<div class="op-vars"><button data-var="-1">${t('op.backMain')}</button></div>`;
  if (i === NN) fb += (fb ? '<br>' : '') + `<b style="color:var(--brass)">${t('op.studyEnd')}</b>`;
  fb += `<br><button class="op-play" id="lsPlayHere">${t('op.playHere')}</button>`;
  $('#lsPrompt').innerHTML = `<div class="ls-goal">${pr}</div>`; $('#lsFb').innerHTML = fb;
  // the moves of this line so far are numbered on the board
  labelList = null;
  { const c = $('#lessonCard'); lesson.cardMin = Math.max(lesson.cardMin || 0, c.offsetHeight); c.style.minHeight = lesson.cardMin + 'px'; }
  $('#lsHint').textContent = t('op.prev'); $('#lsHint').disabled = i === 0;
  $('#lsNext').textContent = i === NN ? ((g.problems || []).length ? t('op.toPractice') : t('ls.list')) : t('op.next'); $('#lsNext').disabled = false;
  stSync();
}
var stTimer = 0;
function stStop() { if (stTimer) { clearInterval(stTimer); stTimer = 0; } stSync(); }
function stTo(to) {
  const NN = studyLine().length;
  if (to < 0 || to > NN || to === lesson.i) return;
  const one = to === lesson.i + 1; lesson.i = to; showStudy(one);
}
function stGo(what) {
  if (!lesson || !lesson.study) return;
  const NN = studyLine().length;
  if (what === 'auto') {
    if (stTimer) { stStop(); return; }
    if (lesson.i >= NN) { lesson.i = 0; showStudy(false); }
    const L0 = lesson;
    stTimer = setInterval(() => { if (lesson !== L0 || !lesson.study || lesson.i >= studyLine().length) { stStop(); return; } stTo(lesson.i + 1); if (lesson.i >= studyLine().length) stStop(); }, 1200);
    stSync(); return;
  }
  if (stTimer) stStop();
  if (what === 'next' && lesson.i >= NN) { const g = lesson.g; if ((g.problems || []).length) startPractice(lesson.gi); else openOpenings(g.cat); return; }
  stTo(what === 'first' ? 0 : what === 'last' ? NN : what === 'prev' ? lesson.i - 1 : lesson.i + 1);
}
function stSync() {
  const on = !!(lesson && lesson.study), nav = document.getElementById('stNav'), au = document.getElementById('lsAuto');
  if (!nav || !au) return;
  document.body.classList.toggle('in-study', on);
  au.classList.toggle('hidden', !on);
  if (!on) { document.body.classList.remove('st-end'); const lc = document.getElementById('lessonCard'); if (lc) lc.style.minHeight = ''; if (stTimer) { clearInterval(stTimer); stTimer = 0; } return; }
  const NN = studyLine().length, i = lesson.i, q = k => nav.querySelector('[data-sn="' + k + '"]');
  document.body.classList.toggle('st-end', i >= NN);
  document.getElementById('stPos').textContent = i + ' / ' + NN;
  q('first').disabled = q('prev').disabled = i === 0;
  q('next').disabled = q('last').disabled = i >= NN;
  for (const b of [q('auto'), au]) { b.classList.toggle('on', !!stTimer); b.title = t('op.auto'); b.setAttribute('aria-label', t('op.auto')); }
  for (const k of ['first', 'prev', 'next', 'last']) q(k).title = t('nav.' + k);
}
window.stSync = stSync; window.stGo = stGo; window.stStop = stStop;
$('#stNav').addEventListener('click', e => { const b = e.target.closest('button[data-sn]'); if (b) stGo(b.dataset.sn); });
$('#lsAuto').onclick = () => stGo('auto');
document.addEventListener('click', e => { if (stTimer && !e.target.closest('[data-sn="auto"],#lsAuto')) stStop(); }, true);
$('#lsFb').addEventListener('click', e => {
  const vb = e.target.closest('button[data-var]');
  if (vb && lesson && lesson.study) { const k = +vb.dataset.var; if (k < 0) { const at = lesson.g.vars[lesson.vr.k].at; lesson.vr = null; lesson.i = at; } else { lesson.vr = { k }; lesson.i = lesson.g.vars[k].at; } showStudy(false); return; }
  if (!e.target.closest('#lsPlayHere') || !lesson || !lesson.study) return;
  const g = lesson.g, mv = studyLine().slice(0, lesson.i), side = toMoveAt(lesson.i);
  const st0 = startSpec, g0 = Object.assign({}, game);
  savedGame = null; exitSpecial();
  busyToken++; cancelWorker();
  Object.assign(settings, { mode: 'ai' }); humanColor = side; rgame = null; manualEnd = null;
  setGame(Object.assign(g0, { ha: g.handi || 0 })); startSpec = st0 && st0.stones && st0.stones.includes && /[bw]/.test(st0.stones) ? st0 : g.handi ? st0 : null;
  moves = mv; cur = mv.length; evals = []; reviewing = false; gameOverShown = false;
  update(false); save(); afterPosition();
  toast(t('op.playing'));
});
function startPractice(gi) {
  const g = OPEN.sets[gi], L = opLine(g), pool = (g.problems || []).slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const probs = pool.slice(0, 5).sort((a, b) => a.at - b.at).map(p => ({ s: opSpecAt(g, p.at), ok: p.ok, good: p.good, half: p.half, view: g.view, komi: g.komi != null ? g.komi : (g.handi ? 0.5 : R.defaultKomi(g.n || 19, 'jp')), last: L[p.at - 1] }));
  hideOverlay('#lessonOverlay');
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle');
  lesson = { step: 0, gi, virt: { id: g.id, title: g.title, problems: probs }, i: 0, results: [], answered: false, hinted: false };
  document.body.classList.add('in-lesson');
  loadLessonProblem();
}

// ====================================================================== puzzles: 詰碁 (PZBook v2; solver in the worker: tsumego.js)
let PUZZLES = null;
const puzzlesReady = fetch('puzzles.json?v=1').then(r => r.json()).then(d => (PUZZLES = d)).catch(() => null);
let pzLevel = 0;
const pzKey = (id, j) => id + '-' + j;
const starVal = x => x === true ? 3 : (+x || 0);
function pzAt(T, j) { return T.puzzles[j]; }
function pzRecs(T, pr) { pr = pr || pzProgress(); return T.puzzles.map((_, j) => starVal(pr[pzKey(T.id, j)])); }
function themeTier(T) { const n = T.puzzles.reduce((a, P) => a + (P.n || 1), 0) / Math.max(1, T.puzzles.length); return Math.max(0, Math.min(5, Math.round((n - 1) * 1.1))); }
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
const PZ_LAST = STORE + '-pz-last', PZ_TAB = STORE + '-pz-tab', PZ_GRPS = ['Cap', 'LD', 'Fight'], PZ_GIC = { Cap: 'target', LD: 'sprout', Fight: 'bolt' };
const pzBadge = T => `<b class="gl">${escHb((T.badge || T.id.replace(/\D+/g, '')) || '')}</b>`;
function pzView(P) { const sp = specFrom(P.s); return P.view || cropOf(sp, null, 7); }
function pzThumbSVG(T, j, P) { return miniSVG(P.s, { cls: 'lxb', crop: pzView(P) }); }
function pzThumbOf(T, j) { if (j < 0) j = T.puzzles.length - 1; const P = pzAt(T, j); return P && P.s ? { board: pzThumbSVG(T, j, P), tm: `<span class="pdisc p${specFrom(P.s).turn === P2 ? 2 : 1}"></span>` } : { board: '' }; }
async function openPuzzles() {
  const d = await puzzlesReady; selTab('puzzle');
  if (!d) { toast(t('ls.fail')); return; }
  PZBook.setLang(LANG);
  const pr = pzProgress(), dl = dailyPick(), di = dailyInfo(), Ts = PUZZLES.themes, idx = Ts.map((_, i) => i);
  const cats = PZ_GRPS.filter(g => Ts.some(T => T.grp === g));
  let curT = ''; try { curT = localStorage.getItem(PZ_TAB) || ''; } catch (e) {} if (!cats.includes(curT)) curT = cats[0];
  const cont = PZBook.resume(idx.map(i => ({ key: String(i), recs: pzRecs(Ts[i], pr), cat: Ts[i].grp })), PZ_LAST);
  const box = $('#pzLevels');
  box.innerHTML = PZBook.home({
    title: t('pz.title'), lead: t('pz.desc'), all: idx.map(i => pzRecs(Ts[i], pr)),
    cont: cont && { key: cont.key + ':' + cont.j, no: cont.j + 1, name: LL(Ts[+cont.key].title) },
    daily: dl ? [{ key: '1', board: pzThumbOf(Ts[dl.L], dl.j).board, title: '★ ' + t('daily.title'), date: dl.date.slice(5).replace('-', '/'), done: di.today, go: t('daily.go'),
      sub: `${LL(Ts[dl.L].title)} · 🔥 ${t('daily.streak', { n: di.streak })}${di.best > 1 ? ' · ' + t('daily.best', { n: di.best }) : ''}` }] : [],
    cats: cats.map(g => { const r = idx.filter(i => Ts[i].grp === g).map(i => pzRecs(Ts[i], pr)).flat(); return { key: g, icon: PZBook.icon(PZ_GIC[g]), name: t('pz.grp' + g), done: r.filter(x => x > 0).length, total: r.length }; }),
    cur: curT, catDesc: t('pz.grp' + curT + 'Sub'),
    cards: idx.filter(i => Ts[i].grp === curT).map(i => { const T = Ts[i], r = pzRecs(T, pr); return Object.assign({ key: i, badge: pzBadge(T), name: LL(T.title), desc: LL(T.sub), recs: r, tier: themeTier(T) }, pzThumbOf(T, PZBook.nextIndex(r))); }),
  });
  PZBook.bindHome(box, {
    cat: k => { try { localStorage.setItem(PZ_TAB, k); } catch (e) {} openPuzzles(); },
    cont: x => { const [i, j] = x.split(':'); startPuzzle(+i, +j); },
    daily: () => { const dl2 = dailyPick(); if (dl2) startPuzzle(dl2.L, dl2.j, dl2.date); },
    card: i => openPzGrid(+i),
  });
  showPzView('pzListView'); showOverlay('#puzzleOverlay');
}
function openPzGrid(i, curJ) {
  pzLevel = i; const L = PUZZLES.themes[i];
  PZBook.setLang(LANG);
  $('#pzLevelHead').innerHTML = PZBook.ghead({ badge: pzBadge(L), name: LL(L.title), desc: LL(L.sub), chips: [t('pz.grp' + L.grp), PZBook.t('count', { n: L.puzzles.length })], tier: themeTier(L) });
  $('#pzGrid').innerHTML = PZBook.grid({ recs: pzRecs(L), cur: curJ });
  $('#pzGrid').querySelectorAll('.pb-tile[data-j]').forEach(e => { const P = pzAt(L, +e.dataset.j); if (P && P.s) e.insertAdjacentHTML('afterbegin', `<span class="th">${pzThumbSVG(L, +e.dataset.j, P)}</span>`); });
  showPzView('pzGridView'); showOverlay('#puzzleOverlay');
}
$('#pzGrid').onclick = e => {
  const b = e.target.closest('button[data-j]'); if (!b) return;
  if (b.getAttribute('aria-disabled')) { toast(PZBook.t('locked')); return; }
  startPuzzle(pzLevel, +b.dataset.j);
};
$('#pzBack').onclick = () => openPuzzles();
$('#pzClose').onclick = () => hideOverlay('#puzzleOverlay');
function pzProblem(P) {   // the JSON problem with point indices, as the solver wants it
  const sp = specFrom(P.s), n = sp.n;
  return { s: sp, goal: P.goal, target: gtps(P.target, n), region: gtps(P.region, n), n: P.n, answer: gtp(P.answer, n), line: gtps(P.line, n) };
}
function startPuzzle(Li, j, daily) {
  hideOverlay('#puzzleOverlay');
  stashGame(); lesson = null; document.body.classList.remove('in-lesson');
  const T = PUZZLES.themes[Li], P = pzAt(T, j), Pi = pzProblem(P);
  if (!daily) PZBook.lastSet(PZ_LAST, Li);
  puzzle = { L: Li, j, P, Pi, T, me: Pi.s.turn || P1, n: P.n, state: 'play', busy: false, used: 0, daily: daily || null, hinted: false, failed: false, answered: false };
  document.body.classList.add('in-puzzle');
  enterSpecial(Pi.s, { view: pzView(P) });
  update(false); renderPuzzleCard(); pzStatus(t('pz.start'));
}
const goalKey = g => 'pz.goal.' + (g || 'kill');
function renderPuzzleCard() {
  const Pz = puzzle, L = Pz.T;
  $('#pzStep').textContent = Pz.daily ? `★ ${t('daily.title')} · ${Pz.daily.slice(5).replace('-', '/')}` : `${LL(L.title)} · ${PZBook.t('stage', { n: Math.floor(Pz.j / PZBook.STAGE) + 1 })} · No.${Pz.j + 1}`;
  $('#pzTitle').textContent = t('pz.inN', { g: t(goalKey(Pz.P.goal)), n: Pz.n });
  $('#pzGoal').innerHTML = `<span class="pdisc p${Pz.me}"></span><span>${t('pz.goalLine', { c: pname(Pz.me), g: t(goalKey(Pz.P.goal)), n: Pz.n })}</span>`;
  $('#pzDots').innerHTML = Array.from({ length: Pz.n }, (_, i) => `<i class="${i < Pz.used ? (Pz.bad && Pz.bad.includes(i) ? 'ng' : 'ok') : ''} ${i === Pz.used && Pz.state === 'play' ? 'cur' : ''}"></i>`).join('');
  $('#pzNext').disabled = !!Pz.daily || Pz.j + 1 >= L.puzzles.length || !PZBook.isOpen(pzRecs(L), Pz.j + 1);
  $('#pzHint').disabled = Pz.state !== 'play'; $('#pzAnswer').disabled = Pz.busy;
  renderInfo();
}
function pzStatus(html) { $('#pzStatus').innerHTML = html; }
function mateReq(left, defend) { return request({ type: 'tsumego', P: puzzle.Pi, moves: moves.slice(0, cur), left, defend: !!defend }).then(r => r && r.list); }
function reachedReq() { return request({ type: 'tsumego', P: puzzle.Pi, moves: moves.slice(0, cur), reached: true }).then(r => !!(r && r.reached)); }
function pickDefence(list) { let best = null; for (const e of list) { const v = e.need === 0 ? 99 : e.need; if (!best || v > best.v) best = { m: e.m, v }; } return best ? best.m : PASS; }
function pickAttack(list, left) { let best = null; for (const e of list) if (e.need > 0 && e.need <= left && (!best || e.need < best.need)) best = e; return best && best.m; }
// obvious mistakes (flagged at once): a move outside the problem area, a self-atari of the key stones, or the goal out of reach
async function puzzleMove(m) {
  const Pz = puzzle; Pz.busy = true; lessonMarks = [];
  const left = Pz.n - Pz.used, tok = busyToken;
  pzStatus(t('pz.checking'));
  const list = await mateReq(left);
  if (!list || puzzle !== Pz || tok !== busyToken) { if (puzzle === Pz) Pz.busy = false; return; }
  const before = posAt(cur);
  playMove2(m);
  Pz.used++;
  renderPuzzleCard();
  if (await reachedReq()) { if (puzzle === Pz) setTimeout(() => puzzleSolved(), 350); return; }
  if (puzzle !== Pz) return;
  const e = list.find(x => x.m === m);
  const good = list.filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need);
  const failBack = async html => {
    Pz.state = 'fail'; Pz.busy = false; Pz.failed = true;
    await sleep(450);
    if (puzzle !== Pz) return;
    moves = moves.slice(0, cur - 1); cur = moves.length; Pz.used--;
    if (good[0]) lessonMarks.push({ at: good[0].m, cls: 'ok' }); if (m !== PASS) lessonMarks.push({ at: m, cls: 'ng' });
    update(false); playChime(false);
    pzStatus(html); renderPuzzleCard();
  };
  if (!e || !(e.need > 0) || e.need > left) {
    if (left <= 1) { await failBack(`<b class="ng">${t('pz.fail')}</b> ` + (good.length ? t('pz.failWhy', { b: '<bdi>' + mvName(good[0].m) + '</bdi>' }) : PZBook.t('outOfMoves', { n: Pz.n }))); return; }
    const region = new Set(Pz.Pi.region);
    if (m === PASS || (region.size && !region.has(m))) { await failBack(`<b class="ng">${PZBook.t('blunder')}</b> ${t('pz.bl.away')}${good.length ? ' ' + t('pz.best', { b: '<bdi>' + mvName(good[0].m) + '</bdi>' }) : ''}`); return; }
    if (e && e.need === 0 && e.hopeless) { await failBack(`<b class="ng">${PZBook.t('blunder')}</b> ${t('pz.bl.reach', { n: Pz.n })}${good.length ? ' ' + t('pz.best', { b: '<bdi>' + mvName(good[0].m) + '</bdi>' }) : ''}`); return; }
    // not the solution: play on, the defender answers with its best move
    Pz.failed = true; (Pz.bad = Pz.bad || []).push(Pz.used - 1);
    renderPuzzleCard();
    pzStatus(t('pz.checking'));
    const dl = await mateReq(Pz.n - Pz.used, true);
    if (!dl || puzzle !== Pz || tok !== busyToken) return;
    await sleep(380); if (puzzle !== Pz) return;
    const r = dl.length ? pickDefence(dl) : PASS;
    playMove2(r);
    Pz.busy = false;
    renderPuzzleCard(); svg.classList.toggle('can', canHumanPlay());
    pzStatus(`<b class="ng">${t('pz.stray')}</b> ${PZBook.t('movesLeft', { n: Pz.n - Pz.used })}`);
    return;
  }
  pzStatus(t('pz.good'));
  const dl = await mateReq(Pz.n - Pz.used, true);
  if (!dl || puzzle !== Pz || tok !== busyToken) return;
  await sleep(380); if (puzzle !== Pz) return;
  if (!dl.length) { puzzleSolved(); return; }
  const r = pickDefence(dl);
  playMove2(r);
  if (await reachedReq() && puzzle === Pz) { puzzleSolved(); return; }
  if (puzzle !== Pz) return;
  Pz.busy = false;
  renderPuzzleCard(); svg.classList.toggle('can', canHumanPlay());
  pzStatus(t('pz.yourMove', { n: Pz.n - Pz.used }));
}
function puzzleSolved() {
  const Pz = puzzle; if (!Pz) return;
  Pz.state = 'solved'; Pz.busy = false;
  const pr = pzProgress(), k = pzKey(Pz.T.id, Pz.j), stars = PZBook.starsFor(Pz);
  const before = pzRecs(Pz.T, pr);
  pr[k] = Math.max(starVal(pr[k]), stars);
  try { localStorage.setItem(PZ_STORE, JSON.stringify(pr)); } catch (e) {}
  const after = pzRecs(Pz.T, pr), ev = PZBook.events(before, after, Pz.j);
  if (Pz.daily) dailySolved(Pz.daily, Pz.hinted);
  PZBook.setLang(LANG);
  pzStatus(`<b class="ok">${t('pz.solved')}</b> ${t('pz.solvedSub', { n: Pz.used })}` + (Pz.daily ? `<br>🔥 ${t('daily.streak', { n: dailyInfo().streak })}` : '') + PZBook.solved({ stars, recs: after, j: Pz.j, events: ev }));
  playChime(true); confetti(); if (ev.length) setTimeout(confetti, 600); renderPuzzleCard();
}
$('#pzRetry').onclick = () => { if (puzzle) { const { hinted: h, failed: f, answered: a } = puzzle; startPuzzle(puzzle.L, puzzle.j, puzzle.daily); Object.assign(puzzle, { hinted: h, failed: f || puzzle.state !== 'play', answered: a }); } };
$('#pzNext').onclick = () => { if (!puzzle) return; const { L, j, T } = puzzle; if (j + 1 < T.puzzles.length && PZBook.isOpen(pzRecs(T), j + 1)) startPuzzle(L, j + 1); };
$('#pzList').onclick = () => { if (!puzzle) return; if (puzzle.daily) openPuzzles(); else openPzGrid(puzzle.L, puzzle.j); };
$('#pzQuit').onclick = () => quitSpecial();
$('#pzHint').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.state !== 'play' || Pz.busy) return;
  const left = Pz.n - Pz.used, list = await mateReq(left); if (puzzle !== Pz || !list) return;
  Pz.hinted = true;
  const good = list.filter(x => x.need > 0 && x.need <= left);
  lessonMarks = [];
  // the area of the key move (its neighbours), not the move itself
  const n = game.n;
  for (const x of good.slice(0, 1)) { const px = x.m % n, py = Math.floor(x.m / n); for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) { const xx = px + dx, yy = py + dy; if (xx >= 0 && yy >= 0 && xx < n && yy < n && !posAt(cur).b[yy * n + xx] && (dx || dy)) lessonMarks.push({ at: yy * n + xx, cls: 'tri' }); } }
  renderFx();
  pzStatus(t('pz.hintText'));
};
$('#pzAnswer').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.busy) return;
  Pz.busy = true; Pz.state = 'answer'; Pz.hinted = true; Pz.answered = true; lessonMarks = []; hintList = null;
  moves = []; cur = 0; Pz.used = 0; Pz.bad = []; update(false); renderPuzzleCard();
  pzStatus(t('pz.showing'));
  const line = Pz.Pi.line.length ? Pz.Pi.line : [Pz.Pi.answer];
  for (let k = 0; k < line.length; k++) {
    if (puzzle !== Pz) return;
    await sleep(750); if (puzzle !== Pz) return;
    if (!posAt(cur).legal(line[k])) break;
    const att = toMoveAt(cur) === Pz.me;
    playMove2(line[k]); if (att) Pz.used++;
    renderPuzzleCard();
  }
  labelList = Pz.Pi.line.map((q, j) => q >= 0 && posAt(cur).b[q] ? { at: q, text: String(j + 1), fs: 0.4 } : null).filter(Boolean);
  renderFx();
  Pz.busy = false; renderPuzzleCard(); pzStatus(t('pz.answerDone'));
};

// ====================================================================== daily puzzle
const DAILY_STORE = STORE + '-daily';
let daily = { last: '', streak: 0, best: 0, days: {} };
try { Object.assign(daily, JSON.parse(localStorage.getItem(DAILY_STORE) || '{}')); } catch (e) {}
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function dailyPick() {
  if (!PUZZLES || !PUZZLES.themes) return null;
  const now = new Date(), date = ymd(now);
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
  const ids = PUZZLES.daily || PUZZLES.themes.map(x => x.id), id = ids[now.getDay() % ids.length];
  const L = Math.max(0, PUZZLES.themes.findIndex(x => x.id === id));
  const n = PUZZLES.themes[L].puzzles.length;
  let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  return { date, L, j: (h >>> 0) % n };
}
function dailyInfo() {
  const today = ymd(new Date()), y = new Date(); y.setDate(y.getDate() - 1);
  const alive = daily.last === today || daily.last === ymd(y);
  return { streak: alive ? daily.streak : 0, best: daily.best || 0, today: !!daily.days[today] };
}
function dailySolved(date, hinted) {
  if (daily.days[date]) return;
  const y = new Date(date + 'T12:00:00'); y.setDate(y.getDate() - 1);
  daily.streak = daily.last === ymd(y) ? daily.streak + 1 : 1;
  daily.last = date; daily.best = Math.max(daily.best || 0, daily.streak); daily.days[date] = hinted ? 'h' : 1;
  try { localStorage.setItem(DAILY_STORE, JSON.stringify(daily)); } catch (e) {}
}

// ====================================================================== boot
if (window.RulesOffer) RulesOffer.init({ game: 'go', lang: () => LANG, open: () => openRules(null, 0), watch: '#rulesOverlay' });
const hadSave = load();
designApply();
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) { LANG = q; try { localStorage.setItem('aicoding-lang', q); } catch (e) {} } }
applyI18n();
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnResign', '#btnHint', '#btnRules', '#btnLesson', '#btnPuzzle'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => { renderInfo(); renderFx(); });
if (window.CountTick) CountTick.setMuted(() => !settings.sound);
request({ type: 'init', net: 'light' });
$('#langSel').onchange = e => {
  LANG = e.target.value; settings.lang = LANG; save(); applyI18n();
  try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {}
  renderInfo(); renderFx();
  if ($('#newOverlay').classList.contains('show')) { segSync(); designPickers(); }
  if ($('#rulesOverlay').classList.contains('show')) renderRules();
  if (HB) HB.relabel();
  if (lesson) { if (lesson.study) showStudy(false); else renderLessonCard(); }
  if (puzzle) renderPuzzleCard();
  if ($('#lessonOverlay').classList.contains('show')) { if (!$('#lessonListView').classList.contains('hidden')) (document.querySelector('.ls-tabs button.sel[data-v=open]') ? openOpenings() : openLessons()); else if (!$('#lessonIntroView').classList.contains('hidden')) (openChoiceIdx >= 0 ? openOpeningChoice(openChoiceIdx) : openIntro(introIdx)); }
  if ($('#puzzleOverlay').classList.contains('show')) { if (!$('#pzListView').classList.contains('hidden')) openPuzzles(); else openPzGrid(pzLevel); }
};
if (loadFromHash()) { /* shared game opened */ }
else if (!hadSave) { setGame({ n: settings.size || 19, komi: R.defaultKomi(settings.size || 19, settings.rule), rule: settings.rule, ha: 0 }); update(false); openNewDialog(); }
else { update(false); afterPosition(); }
window.__go = { get moves() { return moves; }, get cur() { return cur; }, settings, get game() { return game; }, get rv() { return rv; }, rvJudge, dailyPick, encMoves, decMoves, onPoint, statusAt, posAt, newGame, get lesson() { return lesson; }, get puzzle() { return puzzle; }, startLesson, startPuzzle, lessonsReady, puzzlesReady, openReady, get LESSONS() { return LESSONS; }, get PUZZLES() { return PUZZLES; }, get OPEN() { return OPEN; }, playMove, viewAt, startStudy, get count() { return count; } };

function dismissOverlay(o) {
  const OUTSIDE = { newOverlay: '#btnCancelNew', resultOverlay: '#btnReview', pasteOverlay: '#pasteCancel', puzzleOverlay: '#pzClose', rulesOverlay: '#rulesClose' };
  if (o.id === 'lessonOverlay') { const done = document.querySelector('#lessonDoneView'); if (done && !done.classList.contains('hidden')) document.querySelector('#btnLessonQuit2').click(); else document.querySelector('#btnLessonClose').click(); return; }
  const b = OUTSIDE[o.id] && document.querySelector(OUTSIDE[o.id]);
  if (b) b.click(); else o.classList.remove('show');
}
document.querySelectorAll('.overlay').forEach(o => {
  let down = false;
  o.addEventListener('pointerdown', e => { down = e.target === o; });
  o.addEventListener('click', e => { if (e.target !== o || !down) return; down = false; dismissOverlay(o); });
});
function backToBoard() {
  document.querySelectorAll('.overlay.show').forEach(o => dismissOverlay(o));
  if (lesson || puzzle) quitSpecial();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
(() => {
  const h = document.querySelector('.brand h1.to-board'); if (!h) return;
  h.addEventListener('click', backToBoard);
  h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); backToBoard(); } });
})();
function rsInProgress() { return !lesson && !puzzle && moves.length > 0 && !gameOver(moves.length); }
function rsViewing() { return !lesson && !puzzle && reviewing; }
function rsOpen() {
  if (settings.mode === 'online') { openNewDialog(); return; }
  if (!rsInProgress() && !rsViewing()) { openNewDialog(); return; }
  document.querySelector('#rsText').textContent = rsViewing() ? t('rs.viewing', { n: cur }) : t('rs.playing', { n: moves.length });
  document.querySelector('#resumeOverlay').classList.add('show');
}
document.querySelector('#rsCancel').onclick = () => document.querySelector('#resumeOverlay').classList.remove('show');
document.querySelector('#rsRestart').onclick = () => { document.querySelector('#resumeOverlay').classList.remove('show'); openNewDialog(); };
document.querySelector('#rsResume').onclick = () => { document.querySelector('#resumeOverlay').classList.remove('show'); if (reviewing) resumeHere(); };
let playTimer = 0;
function stopPlay() { clearInterval(playTimer); playTimer = 0; const b = document.querySelector('#navPlay'); if (b) b.classList.remove('playing'); }
function navGo(what) {
  if (lesson || puzzle) return;
  const NN = moves.length;
  if (what === 'play') {
    if (playTimer) { stopPlay(); return; }
    if (cur >= NN) viewAt(0);
    document.querySelector('#navPlay').classList.add('playing');
    playTimer = setInterval(() => { if (lesson || puzzle || cur >= moves.length) { stopPlay(); return; } viewAt(cur + 1); }, 800);
    return;
  }
  stopPlay();
  const to = what === 'first' ? 0 : what === 'last' ? NN : what === 'prev' ? cur - 1 : cur + 1;
  if (to < 0 || to > NN || to === cur) return;
  viewAt(to);
}
document.querySelector('#navBar').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (b) navGo(b.dataset.n); });
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
  if (document.querySelector('.overlay.show')) return;
  if (lesson && lesson.study) {
    const k = { ArrowLeft: 'prev', ArrowRight: 'next', ArrowDown: 'first', ArrowUp: 'last', ' ': 'auto' }[e.key];
    if (k === undefined) return;
    e.preventDefault(); if (tg && tg.blur && tg !== document.body) tg.blur();
    stGo(k);
    return;
  }
  if (lesson || puzzle) return;
  const k = { ArrowLeft: 'prev', ArrowRight: 'next', ArrowUp: 'last', ArrowDown: 'first', ' ': 'play' }[e.key];
  if (!k) return;
  e.preventDefault(); if (tg && tg.blur && tg !== document.body) tg.blur();
  navGo(k);
});
window.addEventListener('resize', () => renderFx());
