/* ur/app-learn.js — 学ぶ：ルール（ur/tour.js のチュートリアル）、レッスン（ur/lessons.json：準備→採点問題、満点20×5・合格75）、
   次の一手パズル（ur/puzzles.json、shared/pzbook.js の一覧ホーム）。問題は本体の盤（special）で解く。形式は LEARN-FORMAT.md。
   Shares the globals of app.js (classic scripts): game, special, lesson, puzzle, settings, LANG, t, … */
'use strict';
(function () {
const LS_STORE = STORE + '-lessons', PZ_STORE = STORE + '-puzzles', PZ_LAST = STORE + '-pz-last', PZ_TAB = STORE + '-pz-tab', LS_CAT = STORE + '-ls-cat';
let LESSONS = null, PUZZLES = null;
const lessonsReady = fetch('lessons.json?v=1').then(r => r.json()).then(d => (LESSONS = d)).catch(() => null);
const puzzlesReady = fetch('puzzles.json?v=1').then(r => r.json()).then(d => (PUZZLES = d)).catch(() => null);
const LL = o => o == null ? '' : typeof o === 'string' ? o : (o[LANG] !== undefined ? o[LANG] : o.en !== undefined ? o.en : o.ja || '');
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v && v[k] !== undefined ? v[k] : '');
const UI = (D, k, v) => fill(D && D.ui && D.ui[k] ? LL(D.ui[k]) : k, v);
const MSG = (D, w) => !w ? '' : fill(D && D.msg && D.msg[w[0]] ? LL(D.msg[w[0]]) : '', w[1] || {});
const diceOf = n => { const a = [0, 0, 0, 0]; for (let i = 0; i < Math.min(4, n || 0); i++) a[i] = 1; return a; };
function prog(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
function progSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
const mvName = (st, m) => { const rl = E.RULES[st.rule]; return `${m[0] === 0 ? t('k.enter') : m[0]}→${m[1] >= rl.goal ? t('k.home') : m[1]}`; };
const sameMv = (a, m) => a[0] === m.from && a[1] === m.to;
function arrowOf(st, m) { const fm = E.legalMoves(st, m[1] - m[0]).find(x => x.from === m[0]); if (!fm) return null; const mm = moveMarks(st, st.turn, fm); return { from: mm.from, to: mm.to }; }
const cardBox = () => (mqPC.matches ? null : $('#boardArea'));

// ---------------------------------------------------------------- special board
function enterSpecial(o) {
  busyToken++; thinking = 0; animating = false; hintMove = null; coachHover = null;
  if (ken && window.UrRv) UrRv.kenStop();
  special = Object.assign({ state: null, n: null, dice: null, marks: [], hint: null, last: null, canRoll: false, msg: '', title: '' }, o);
  special.state = E.clone(Object.assign({ winner: -1 }, o.state));
  if (special.n != null && !special.dice) special.dice = diceOf(special.n);
  update();
}
function setSpecial(o) { Object.assign(special, o); if (o.state) special.state = E.clone(Object.assign({ winner: -1 }, o.state)); if ('n' in o && o.n != null && !o.dice) special.dice = diceOf(o.n); update(); }
function exitSpecial(silent) {
  if (window.CardBar) CardBar.cancelAuto();
  const had = !!special; special = null; lesson = null; puzzle = null;
  document.body.classList.remove('in-lesson', 'in-puzzle');
  if (!silent && had) { busyToken++; update(); afterPosition(); }
}
function quitSpecial() { exitSpecial(); }

// ---------------------------------------------------------------- tabs of the list dialogs
function selTab(v) { $$('.ls-tabs').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === v))); }
$$('.ls-tabs').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const v = b.dataset.v;
  ['#rulesOverlay', '#lessonOverlay', '#puzzleOverlay'].forEach(s => $(s).classList.add('instant'));
  closeRules(true); hideOverlay('#lessonOverlay'); hideOverlay('#puzzleOverlay');
  if (v === 'rules') openRules(); else if (v === 'lesson') openLessons(); else openPuzzles();
  setTimeout(() => ['#rulesOverlay', '#lessonOverlay', '#puzzleOverlay'].forEach(s => $(s).classList.remove('instant')), 60);
}));

// ---------------------------------------------------------------- rules (UrTour)
function openRules(page) {
  selTab('rules'); showOverlay('#rulesOverlay');
  try { localStorage.setItem('aicoding-ur-rules-seen', '1'); } catch (e) {}
  if (!window.UrTour) { $('#rulesBody').innerHTML = `<p style="padding:20px;color:var(--muted)">${esc(t('ls.fail'))}</p>`; return; }
  UrTour.open({ mount: '#rulesBody', lang: () => LANG, design: settings.design, pieces: settings.pieces, speed: SPD(), page: page,
    onPlay: () => { closeRules(); openNewDialog(); }, onLessons: () => { closeRules(); openLessons(); }, onClose: () => closeRules(), sound: k => snd(k === 'move' ? 'place' : k) });
}
function closeRules(quiet) { if (window.UrTour) try { UrTour.stop(); } catch (e) {} hideOverlay('#rulesOverlay'); }
$('#btnRules').onclick = () => openRules();

// ---------------------------------------------------------------- lessons
function thumb(s, marks) { return B2.mini(Object.assign({ winner: -1 }, s), { design: settings.design, pieces: settings.pieces, marks: marks || [], crop: 'board', trays: true }); }
async function openLessons() {
  const d = await lessonsReady; selTab('lesson');
  if (!d) { toast(t('ls.fail')); return; }
  let cat = ''; try { cat = localStorage.getItem(LS_CAT) || ''; } catch (e) {}
  if (!d.cats.some(c => c.id === cat)) cat = d.cats[0].id;
  const pr = prog(LS_STORE);
  $('#lsCats').innerHTML = d.cats.map(c => { const n = c.steps.filter(id => pr[id] && pr[id].pass).length; return `<button data-c="${c.id}" class="${c.id === cat ? 'sel' : ''}">${esc(LL(c.name))} <small>${n}/${c.steps.length}</small></button>`; }).join('');
  const C = d.cats.find(c => c.id === cat);
  $('#lessonList').innerHTML = C.steps.map(id => { const s = d.steps.find(x => x.id === id); if (!s) return ''; const r = pr[id];
    return `<button class="ls-item" data-id="${id}"><span class="th">${s.diagram ? thumb(s.diagram.s, s.diagram.marks) : ''}</span><span><b>${esc(LL(s.title))}</b><small>${esc(LL(s.tip))}</small><span class="st ${r && r.pass ? 'ok' : r ? 'part' : ''}">${r ? (r.pass ? '✓ ' : '') + esc(UI(d, 'score', { n: r.best })) : esc(t('ls.new'))}</span></span></button>`; }).join('');
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
$('#lsCats').onclick = e => { const b = e.target.closest('button[data-c]'); if (!b) return; try { localStorage.setItem(LS_CAT, b.dataset.c); } catch (x) {} openLessons(); };
$('#lessonList').onclick = e => { const b = e.target.closest('.ls-item'); if (b) openIntro(b.dataset.id); };
function showLessonView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
let introId = null;
function openIntro(id) {
  const d = LESSONS, s = d.steps.find(x => x.id === id); introId = id;
  const cat = d.cats.find(c => c.steps.includes(id));
  $('#liStep').textContent = cat ? LL(cat.name) : '';
  $('#liTitle').textContent = LL(s.title);
  $('#liBody').innerHTML = LL(s.body) + (s.diagram ? `<div class="dg">${thumb(s.diagram.s, s.diagram.marks)}</div>` : '') + `<p style="font-size:12.5px;color:var(--dim)">${esc(UI(d, 'needPass'))}</p>`;
  showLessonView('lessonIntroView'); showOverlay('#lessonOverlay');
}
$('#btnLessonBack').onclick = () => openLessons();
$('#btnLessonClose').onclick = () => hideOverlay('#lessonOverlay');
$('#btnLessonStart').onclick = () => startLesson(introId);
$('#btnLesson').onclick = () => openLessons();

function startLesson(id) {
  const d = LESSONS, s = d.steps.find(x => x.id === id); if (!s) return;
  hideOverlay('#lessonOverlay');
  puzzle = null; document.body.classList.remove('in-puzzle');
  lesson = { id, step: s, phase: 'ramp', i: 0, scores: [], tries: 0, hint: 0, done: false, wrong: false };
  document.body.classList.add('in-lesson');
  loadItem();
}
const lsItem = () => lesson.phase === 'ramp' ? lesson.step.ramp[lesson.i] : lesson.step.problems[lesson.i];
function loadItem() {
  const it = lsItem(), D = LESSONS;
  lesson.hint = 0; lesson.done = false; lesson.wrong = false; lesson.tries = 0;
  const st = it.s || lesson.step.diagram && lesson.step.diagram.s || { rule: lesson.step.rule || 'finkel', pos: [[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]], turn: 0 };
  enterSpecial({ state: st, n: it.n != null ? it.n : null, marks: (it.marks || []).slice(), title: LL(lesson.step.title), check: m => lessonMove(m), onMove: () => lessonMoved() });
  if (it.k === 'explain' && it.seq && it.seq.length) playSeq(it);
  renderLessonCard();
}
async function playSeq(it) {
  const sp = special, alive = () => special === sp;
  sp.check = () => true; sp.onMove = () => {};
  await sleep(700);
  for (const [f, to] of it.seq) {
    if (!alive()) return;
    const st = sp.state, fm = E.legalMoves(st, to - f).find(x => x.from === f); if (!fm) break;
    sp.n = to - f; sp.dice = diceOf(sp.n); update();
    await sleep(350);
    if (!alive()) return;
    await commit(fm);
    await sleep(500);
  }
  if (special === sp) { sp.check = () => false; sp.onMove = () => lessonMoved(); }
}
function lessonMove(m) {
  const it = lsItem(), D = LESSONS; if (lesson.done || animating) return false;
  if (it.k === 'explain' || it.kind === 'choice') return false;
  const okList = it.ok || [];
  if (okList.some(a => sameMv(a, m))) {
    lesson.done = true;
    if (lesson.phase === 'ramp') fb(`<b class="ok">${esc(UI(D, 'rampGood'))}</b> ${esc(LL(it.g))}`);
    else { const pts = score(); lesson.scores[lesson.i] = pts; fb(`<b class="ok">${esc(UI(D, 'correct'))}</b> ${esc(MSG(D, it.why))} <b>${esc(UI(D, 'score', { n: pts }))}</b>`); }
    snd('ok'); special.marks = []; renderLessonCard();
    return true;
  }
  lesson.wrong = true; lesson.tries++; snd('ng');
  if (lesson.phase === 'ramp') fb(`<b class="ng">${esc(UI(D, 'wrong'))}</b> ${esc(LL(it.y) || UI(D, 'rampRetry'))}`);
  else { const ng = it.ng && it.ng[String(m.from)]; fb(`<b class="ng">${esc(UI(D, 'wrong'))}</b> ${esc(ng ? MSG(D, ng) : UI(D, 'rampRetry'))}`); }
  return false;
}
function lessonMoved() { renderLessonCard(); if (lesson && lesson.done && window.CardBar) CardBar.autoNext({ ok: () => lesson && lesson.done, btn: '#lsNext', ms: 1800 }); }
function score() { const S = LESSONS.score || { per: 20, hint: [16, 12], retry: 10, answer: 0 }; if (lesson.hint >= 3) return S.answer; if (lesson.hint === 2) return S.hint[1]; if (lesson.hint === 1) return lesson.wrong ? Math.min(S.retry, S.hint[0]) : S.hint[0]; return lesson.wrong ? S.retry : S.per; }
function fb(html) { $('#lsFb').innerHTML = html; }
function renderLessonCard() {
  const D = LESSONS, s = lesson.step, it = lsItem(), ramp = lesson.phase === 'ramp';
  $('#lsStep').textContent = ramp ? UI(D, 'rampStep', { i: lesson.i + 1, n: s.ramp.length }) : `${LL(s.title)} · ${lesson.i + 1}/${s.problems.length}`;
  $('#lsDots').innerHTML = ramp ? '' : s.problems.map((_, i) => { const v = lesson.scores[i]; return `<i class="${v == null ? '' : v >= 20 ? 'ok' : v > 0 ? 'part' : 'ng'} ${i === lesson.i ? 'cur' : ''}"></i>`; }).join('');
  $('#lsTitle').textContent = ramp ? LL(it.t) : LL(s.title);
  let pr = '';
  if (ramp) pr = it.k === 'explain' ? LL(it.body) : `<p>${esc(LL(it.t))}</p>` + (it.n != null ? `<p><b>${esc(UI(D, 'roll', { n: it.n }))}</b></p>` : '') + `<p style="font-size:12px;color:var(--dim)">${esc(UI(D, 'rampNote'))}</p>`;
  else pr = `<p>${esc(it.kind === 'choice' ? (LL(it.q) || UI(D, 'qChoice')) : (it.q ? LL(it.q) : UI(D, 'qMove', { n: it.n })))}</p>`;
  $('#lsPrompt').innerHTML = pr;
  const ch = $('#lsChoices');
  if (!ramp && it.kind === 'choice') {
    ch.innerHTML = it.opts.map((o, i) => `<button data-i="${i}" class="${lesson.done && i === it.ans ? 'ok' : ''}">${esc(LL(o))}</button>`).join('');
    ch.onclick = e => { const b = e.target.closest('button'); if (!b || lesson.done) return; const i = +b.dataset.i;
      if (i === it.ans) { lesson.done = true; const pts = score(); lesson.scores[lesson.i] = pts; snd('ok'); fb(`<b class="ok">${esc(UI(D, 'correct'))}</b> ${esc(MSG(D, it.why))} <b>${esc(UI(D, 'score', { n: pts }))}</b>`); renderLessonCard(); if (window.CardBar) CardBar.autoNext({ ok: () => lesson && lesson.done, btn: '#lsNext', ms: 1800 }); }
      else { lesson.wrong = true; b.classList.add('ng'); snd('ng'); fb(`<b class="ng">${esc(UI(D, 'wrong'))}</b> ${esc(UI(D, 'rampRetry'))}`); } };
  } else { ch.innerHTML = ''; ch.onclick = null; }
  if (!lesson.done && !lesson.wrong && lesson.hint === 0) fb('');
  const nx = $('#lsNext');
  nx.textContent = ramp ? (lesson.i + 1 < s.ramp.length ? UI(D, 'next') : UI(D, 'rampMain')) : (lesson.i + 1 < s.problems.length ? UI(D, 'next') : t('ls.finish'));
  nx.disabled = !(it.k === 'explain' || lesson.done);
  $('#lsHint').textContent = ramp && !lesson.done && it.k === 'explain' ? UI(D, 'rampSkip') : lesson.hint >= 2 && !ramp ? UI(D, 'answer') : UI(D, 'hint');
  $('#lsHint').disabled = lesson.done && !(ramp && it.k === 'explain');
  if (it.k === 'explain') $('#lsHint').disabled = false;
  if (HB) hbInfo();
}
$('#lsHint').onclick = () => {
  if (!lesson) return; const D = LESSONS, it = lsItem(), s = lesson.step;
  if (lesson.phase === 'ramp' && it.k === 'explain') { lesson.phase = 'prob'; lesson.i = 0; loadItem(); return; }   // skip the preparation
  if (lesson.done) return;
  lesson.hint++;
  if (lesson.phase === 'ramp') { fb(`💡 ${esc(LL(it.h) || UI(D, 'look'))}`); if (it.look) { special.marks = (it.marks || []).concat(it.look); update(); } return; }
  if (lesson.hint === 1) fb(`💡 ${esc(LL(s.hints && s.hints[0]) || UI(D, 'look'))}`);
  else if (lesson.hint === 2) { fb(`💡 ${esc(LL(s.hints && s.hints[1]) || UI(D, 'look'))}`); if (it.look) { special.marks = (it.marks || []).concat(it.look); update(); } }
  else {
    lesson.done = true; lesson.scores[lesson.i] = 0;
    if (it.kind === 'choice') fb(`${esc(UI(D, 'ans', { m: LL(it.opts[it.ans]) }))} — ${esc(MSG(D, it.why))}`);
    else { special.hint = arrowOf(special.state, it.best); fb(`${esc(UI(D, 'ans', { m: mvName(special.state, it.best) }))} — ${esc(MSG(D, it.why))}`); update(); }
  }
  renderLessonCard();
};
$('#lsNext').onclick = () => {
  if (!lesson) return; const s = lesson.step;
  if (lesson.phase === 'ramp') { if (lesson.i + 1 < s.ramp.length) lesson.i++; else { lesson.phase = 'prob'; lesson.i = 0; } loadItem(); return; }
  if (lesson.i + 1 < s.problems.length) { lesson.i++; loadItem(); return; }
  finishLesson();
};
function finishLesson() {
  const D = LESSONS, s = lesson.step, tot = lesson.scores.reduce((a, b) => a + (b || 0), 0), pass = tot >= ((D.score && D.score.pass) || 75);
  const pr = prog(LS_STORE), old = pr[s.id] || { best: 0, pass: false };
  pr[s.id] = { best: Math.max(old.best, tot), pass: old.pass || pass }; progSet(LS_STORE, pr);
  $('#ldTitle').textContent = pass ? UI(D, 'pass') : t('ls.notYet');
  $('#ldSub').innerHTML = `${esc(LL(s.title))}<br><b style="font-size:26px;color:var(--accent)">${esc(UI(D, 'score', { n: tot }))}</b> / 100<br>${esc(UI(D, 'needPass'))}`;
  const cat = D.cats.find(c => c.steps.includes(s.id)), all = D.cats.flatMap(c => c.steps), nx = all[all.indexOf(s.id) + 1];
  $('#btnLessonNextStep').classList.toggle('hidden', !nx); lesson.next = nx;
  snd(pass ? 'win' : 'ng');
  showLessonView('lessonDoneView'); showOverlay('#lessonOverlay');
}
$('#btnLessonQuit2').onclick = () => { hideOverlay('#lessonOverlay'); exitSpecial(); openLessons(); };
$('#btnLessonRetry').onclick = () => { const id = lesson && lesson.id; hideOverlay('#lessonOverlay'); if (id) startLesson(id); };
$('#btnLessonNextStep').onclick = () => { const nx = lesson && lesson.next; hideOverlay('#lessonOverlay'); if (nx) openIntro(nx); };
$('#lsList').onclick = () => { exitSpecial(); openLessons(); };
$('#lsQuit').onclick = () => exitSpecial();

// ---------------------------------------------------------------- puzzles (PZBook)
const pzKey = (id, j) => id + '-' + j;
function pzRecs(T, pr) { pr = pr || prog(PZ_STORE); return T.puzzles.map((_, j) => +pr[pzKey(T.id, j)] || 0); }
function themeTier(i) { return Math.min(5, Math.floor(i * 6 / Math.max(1, PUZZLES.themes.length))); }
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function dailyPick() {
  const P = PUZZLES; if (!P.daily || !P.daily.length) return null;
  const date = ymd(new Date()); let h = 0; for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const id = P.daily[h % P.daily.length], L = P.themes.findIndex(T => T.id === id); if (L < 0) return null;
  return { L, j: (h >>> 8) % P.themes[L].puzzles.length, date };
}
const PZ_IC = { basic: 'sprout', tactics: 'bolt', end: 'crown' };
async function openPuzzles() {
  const d = await puzzlesReady; selTab('puzzle');
  if (!d) { toast(t('ls.fail')); return; }
  PZBook.setLang(LANG);
  const pr = prog(PZ_STORE), Ts = d.themes, idx = Ts.map((_, i) => i), cats = d.cats.map(c => c.id);
  let cur = ''; try { cur = localStorage.getItem(PZ_TAB) || ''; } catch (e) {} if (!cats.includes(cur)) cur = cats[0];
  const cont = PZBook.resume(idx.map(i => ({ key: String(i), recs: pzRecs(Ts[i], pr), cat: Ts[i].cat })), PZ_LAST);
  const dl = dailyPick(), dd = prog(STORE + '-daily');
  const th = (T, j) => { if (j < 0) j = T.puzzles.length - 1; const P = T.puzzles[j]; return P ? thumb(P.s) : ''; };
  $('#pzLevels').innerHTML = PZBook.home({
    title: t('pz.title'), lead: t('pz.desc'), all: idx.map(i => pzRecs(Ts[i], pr)),
    cont: cont && { key: cont.key + ':' + cont.j, no: cont.j + 1, name: LL(Ts[+cont.key].name) },
    daily: dl ? [{ key: '1', board: th(Ts[dl.L], dl.j), title: '★ ' + t('daily.title'), date: dl.date.slice(5).replace('-', '/'), done: !!dd[dl.date], go: t('daily.go'), sub: LL(Ts[dl.L].name) }] : [],
    cats: d.cats.map(c => { const r = idx.filter(i => Ts[i].cat === c.id).map(i => pzRecs(Ts[i], pr)).flat(); return { key: c.id, icon: PZBook.icon(PZ_IC[c.id] || 'theme'), name: LL(c.name), done: r.filter(x => x > 0).length, total: r.length }; }),
    cur,
    cards: idx.filter(i => Ts[i].cat === cur).map(i => { const T = Ts[i], r = pzRecs(T, pr); return { key: i, badge: '', name: LL(T.name), desc: LL(T.desc), recs: r, tier: themeTier(i), board: th(T, PZBook.nextIndex(r)) }; }),
  });
  PZBook.bindHome($('#pzLevels'), {
    cat: k => { try { localStorage.setItem(PZ_TAB, k); } catch (e) {} openPuzzles(); },
    cont: x => { const [i, j] = x.split(':'); startPuzzle(+i, +j); },
    daily: () => { const dl = dailyPick(); if (dl) startPuzzle(dl.L, dl.j, dl.date); },
    card: i => openPzGrid(+i),
  });
  showPzView('pzListView'); showOverlay('#puzzleOverlay');
}
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
let pzLevel = 0;
function openPzGrid(i, cur) {
  pzLevel = i; const T = PUZZLES.themes[i]; PZBook.setLang(LANG);
  const c = PUZZLES.cats.find(x => x.id === T.cat);
  $('#pzLevelHead').innerHTML = PZBook.ghead({ badge: '', name: LL(T.name), desc: LL(T.desc), chips: [c ? LL(c.name) : '', PZBook.t('count', { n: T.puzzles.length })], tier: themeTier(i) });
  $('#pzGrid').innerHTML = PZBook.grid({ recs: pzRecs(T), cur });
  $('#pzGrid').querySelectorAll('.pb-tile[data-j]').forEach(el => { const P = T.puzzles[+el.dataset.j]; if (P) el.insertAdjacentHTML('afterbegin', `<span class="th">${thumb(P.s)}</span>`); });
  showPzView('pzGridView'); showOverlay('#puzzleOverlay');
}
$('#pzGrid').onclick = e => { const b = e.target.closest('button[data-j]'); if (!b) return; if (b.getAttribute('aria-disabled')) { toast(PZBook.t('locked')); return; } startPuzzle(pzLevel, +b.dataset.j); };
$('#pzBack').onclick = () => openPuzzles();
$('#pzClose').onclick = () => hideOverlay('#puzzleOverlay');
$('#btnPuzzle').onclick = () => openPuzzles();
function startPuzzle(L, j, daily) {
  hideOverlay('#puzzleOverlay');
  const T = PUZZLES.themes[L], P = T.puzzles[j]; if (!P) return;
  lesson = null; document.body.classList.remove('in-lesson');
  if (!daily) PZBook.lastSet(PZ_LAST, L);
  puzzle = { L, j, T, P, daily: daily || null, hinted: false, failed: false, answered: false, solved: false, hint: 0 };
  document.body.classList.add('in-puzzle');
  enterSpecial({ state: P.s, n: P.n, title: LL(T.name), check: m => puzzleMove(m), onMove: () => renderPuzzleCard() });
  renderPuzzleCard(); pzStatus(esc(UI(PUZZLES, 'qMove', { n: P.n })));
}
function puzzleMove(m) {
  const Pz = puzzle, D = PUZZLES; if (Pz.solved || animating) return false;
  if (Pz.P.ok.some(a => sameMv(a, m))) {
    Pz.solved = true; snd('ok');
    const pr = prog(PZ_STORE), k = pzKey(Pz.T.id, Pz.j), before = pzRecs(Pz.T, pr), stars = PZBook.starsFor(Pz);
    if (!Pz.daily) pr[k] = Math.max(+pr[k] || 0, stars); progSet(PZ_STORE, pr);
    if (Pz.daily) { const dd = prog(STORE + '-daily'); dd[Pz.daily] = 1; progSet(STORE + '-daily', dd); }
    const after = pzRecs(Pz.T, pr); PZBook.setLang(LANG);
    special.marks = [];
    pzStatus(`<b class="ok">${esc(UI(D, 'correct'))}</b> ${esc(MSG(D, Pz.P.why))}` + (Pz.daily ? '' : PZBook.solved({ stars, recs: after, j: Pz.j, events: PZBook.events(before, after, Pz.j) })));
    renderPuzzleCard(); return true;
  }
  Pz.failed = true; snd('ng');
  const ng = Pz.P.ng && Pz.P.ng[String(m.from)];
  pzStatus(`<b class="ng">${esc(UI(D, 'wrong'))}</b> ${esc(ng ? MSG(D, ng) : UI(D, 'rampRetry'))}`);
  return false;
}
function pzStatus(h) { $('#pzStatus').innerHTML = h; }
function renderPuzzleCard() {
  const Pz = puzzle; if (!Pz) return;
  $('#pzStep').textContent = Pz.daily ? `★ ${t('daily.title')} · ${Pz.daily.slice(5).replace('-', '/')}` : `${LL(Pz.T.name)} · ${PZBook.t('stage', { n: Math.floor(Pz.j / PZBook.STAGE) + 1 })} · No.${Pz.j + 1}`;
  $('#pzTitle').textContent = t('pz.head');
  $('#pzGoal').innerHTML = `<span class="pdisc p0"></span><span>${esc(UI(PUZZLES, 'roll', { n: Pz.P.n }))} — ${esc(t('pz.goal'))}</span>`;
  $('#pzNext').disabled = !!Pz.daily || Pz.j + 1 >= Pz.T.puzzles.length || !PZBook.isOpen(pzRecs(Pz.T), Pz.j + 1);
  $('#pzHint').disabled = Pz.solved; $('#pzAnswer').disabled = Pz.solved; $('#pzRetry').disabled = !Pz.solved && !Pz.failed;
  if (HB) hbInfo();
}
$('#pzHint').onclick = () => { const Pz = puzzle; if (!Pz || Pz.solved) return; Pz.hinted = true; Pz.hint++; pzStatus(`💡 ${esc(LL(Pz.T.hint) || UI(PUZZLES, 'look'))}`); if (Pz.P.look && Pz.hint >= 1) { special.marks = Pz.P.look.slice(); update(); } };
$('#pzAnswer').onclick = () => { const Pz = puzzle; if (!Pz || Pz.solved) return; Pz.answered = true; special.hint = arrowOf(special.state, Pz.P.best); update(); pzStatus(`${esc(UI(PUZZLES, 'ans', { m: mvName(special.state, Pz.P.best) }))} — ${esc(MSG(PUZZLES, Pz.P.why))}`); };
$('#pzRetry').onclick = () => { const Pz = puzzle; if (!Pz) return; const keep = { hinted: Pz.hinted, failed: Pz.failed, answered: Pz.answered }; startPuzzle(Pz.L, Pz.j, Pz.daily); Object.assign(puzzle, keep); };
$('#pzNext').onclick = () => { const Pz = puzzle; if (Pz && Pz.j + 1 < Pz.T.puzzles.length) startPuzzle(Pz.L, Pz.j + 1); };
$('#pzList').onclick = () => { const L = puzzle ? puzzle.L : 0; exitSpecial(); openPzGrid(L); };
$('#pzQuit').onclick = () => exitSpecial();

window.UrLearn = {
  openRules, closeRules, openLessons, openPuzzles, exitSpecial, startLesson, startPuzzle, lessonsReady, puzzlesReady,
  relang() {
    if (window.UrTour && $('#rulesOverlay').classList.contains('show')) UrTour.render();
    if (lesson) renderLessonCard(); if (puzzle) renderPuzzleCard();
    if ($('#lessonOverlay').classList.contains('show') && !$('#lessonListView').classList.contains('hidden')) openLessons();
    if ($('#puzzleOverlay').classList.contains('show')) { if (!$('#pzListView').classList.contains('hidden')) openPuzzles(); else openPzGrid(pzLevel); }
  },
};
})();
