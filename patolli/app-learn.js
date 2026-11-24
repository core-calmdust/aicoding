/* patolli/app-learn.js — 学ぶ：ルール（patolli/tour.js のチュートリアル）、レッスン（lessons.json：準備→採点問題、満点20×5・合格75）、
   次の一手パズル（puzzles.json、shared/pzbook.js の一覧ホーム）。問題は本体の盤（special）で解く。ur/app-learn.js の移植。
   局面は { rule, pos:[[6],[6]], turn:0, gold?, pool?, dir? }（足りない項目は新しい対局の値）。手は [from, to]。
   app.js のグローバル（game, special, lesson, puzzle, settings, LANG, t …）を使う。 */
'use strict';
(function () {
const LS_STORE = STORE + '-lessons', PZ_STORE = STORE + '-puzzles', PZ_LAST = STORE + '-pz-last', PZ_TAB = STORE + '-pz-tab', LS_CAT = STORE + '-ls-cat';
let LESSONS = null;
const lessonsReady = fetch('lessons.json?v=4').then(r => r.json()).then(d => (LESSONS = d)).catch(() => null);
const LL = o => o == null ? '' : typeof o === 'string' ? o : (o[LANG] !== undefined ? o[LANG] : o.en !== undefined ? o.en : o.ja || '');
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v && v[k] !== undefined ? v[k] : '');
const UI = (D, k, v) => fill(D && D.ui && D.ui[k] ? LL(D.ui[k]) : k, v);
const MSG = (D, w) => !w ? '' : fill(D && D.msg && D.msg[w[0]] ? LL(D.msg[w[0]]) : '', w[1] || {});
const diceOf = n => { const k = n >= 10 ? 5 : Math.max(0, Math.min(4, n || 0)), a = [0, 0, 0, 0, 0], o = [2, 0, 4, 1, 3]; for (let i = 0; i < k; i++) a[o[i]] = 1; return a; };
// 局面の足りない項目（宝・場・向き・回）を新しい対局の値で埋める
const norm = s => { const b = E.newGame(s.rule || 'bell', { dir: s.dir }); return Object.assign(b, { winner: -1 }, s, { pos: [s.pos[0].slice(), s.pos[1].slice()], dir: (s.dir || [1, 1]).slice(), gold: (s.gold || b.gold).slice() }); };
function prog(k) { try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e) { return {}; } }
function progSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
const mvName = (st, m) => { const rl = E.RULES[st.rule]; return `${m[0] === 0 ? t('k.enter') : m[0]}→${m[1] >= rl.goal ? t('k.home') : m[1]}`; };
const sameMv = (a, m) => a[0] === m.from && a[1] === m.to;
function arrowOf(st, m) { const fm = E.legalMoves(st, special && special.n != null ? special.n : m[1] - m[0]).find(x => x.from === m[0]); if (!fm) return null; const mm = moveMarks(st, st.turn, fm); return { from: mm.from, to: mm.to }; }
const cardBox = () => (mqPC.matches ? null : $('#boardArea'));

// ---------------------------------------------------------------- special board
function enterSpecial(o) {
  cancelBusy(); hintMove = null; coachHover = null;
  if (ken && window.PatolliRv) PatolliRv.kenStop();
  special = Object.assign({ state: null, n: null, dice: null, marks: [], hint: null, last: null, canRoll: false, msg: '', title: '' }, o);
  special.state = norm(o.state);
  if (special.n != null && !special.dice) special.dice = diceOf(special.n);
  update();
}
function setSpecial(o) { Object.assign(special, o); if (o.state) special.state = norm(o.state); if ('n' in o && o.n != null && !o.dice) special.dice = diceOf(o.n); update(); }
function exitSpecial(silent) {
  if (window.CardBar) CardBar.cancelAuto();
  const had = !!special; special = null; lesson = null; puzzle = null;
  document.body.classList.remove('in-lesson', 'in-puzzle');
  if (!silent && had) { cancelBusy(); update(); afterPosition(); }
}
function quitSpecial() { exitSpecial(); }

// ---------------------------------------------------------------- tabs of the list dialogs
function selTab(v) { $$('.ls-tabs').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === v))); }
// switching tabs: the new dialog is shown at once (no fade) on top of the old one, then the old one is hidden — so the dialog
// never closes and opens again; the lists keep their DOM when nothing changed (setHtml) and the board pictures are preloaded
const LIST_OV = ['#rulesOverlay', '#lessonOverlay'];   // (パズルは 2026-11-24 に廃止：双六系にパズルは作らない)
let tabSwitch = false;
$$('.ls-tabs').forEach(g => g.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b || b.classList.contains('sel')) return;
  const v = b.dataset.v, want = v === 'rules' ? '#rulesOverlay' : '#lessonOverlay';
  const was = LIST_OV.filter(s => s !== want && $(s).classList.contains('show'));
  LIST_OV.forEach(s => $(s).classList.add('instant'));
  $(want).classList.add('ls-top'); was.forEach(s => $(s).classList.add('ls-under'));
  tabSwitch = true;
  try { if (v === 'rules') openRules(); else await openLessons(); } finally { tabSwitch = false; }
  // the old one goes once the new one has been painted
  requestAnimationFrame(() => requestAnimationFrame(() => {
    was.forEach(s => { if (s === '#rulesOverlay') closeRules(true); else hideOverlay(s); $(s).classList.remove('ls-under'); });
    $(want).classList.remove('ls-top');
    LIST_OV.forEach(s => $(s).classList.remove('instant'));
  }));
}));
// the HTML of a list is written only when it changed (the same DOM stays: no reloaded pictures, no jump)
function setHtml(el, html) { if (el.__h !== html) { el.__h = html; el.innerHTML = html; } }
// ---------------------------------------------------------------- rules (PatolliTour)
function openRules(page) {
  selTab('rules'); showOverlay('#rulesOverlay');
  try { localStorage.setItem('aicoding-patolli-rules-seen', '1'); } catch (e) {}
  if (!window.PatolliTour) { $('#rulesBody').innerHTML = `<p style="padding:20px;color:var(--muted)">${esc(t('ls.fail'))}</p>`; return; }
  PatolliTour.open({ mount: '#rulesBody', lang: () => LANG, design: settings.design, pieces: settings.pieces, speed: SPD(), page: page,
    onPlay: () => { closeRules(); openNewDialog(); }, onClose: () => closeRules(), sound: k => snd(k === 'move' ? 'place' : k) });
}
function closeRules(quiet) { if (window.PatolliTour) try { PatolliTour.stop(); } catch (e) {} hideOverlay('#rulesOverlay'); }
$('#btnRules').onclick = () => openRules();

// ---------------------------------------------------------------- lessons
// 一覧カードのミニ盤：駒と印のまわりを切り出して大きく見せる（共通仕様「ミニ盤は注目部分を切り出して拡大」。
// 切り出しは board2d.js の mini({ crop:'auto' })：盤上の駒と印を囲む正方形。広すぎるときは盤全体）
function thumb(s, marks, o) {
  o = o || {};
  const svg = B2.mini(norm(s), { design: settings.design, pieces: settings.pieces, marks: marks || [], crop: 'auto', cropMarks: o.cropMarks !== undefined ? o.cropMarks : marks, trayLabel });
  return `<span class="mb">${svg}</span>`;
}
const LS_IC = {   // category icons (small SVGs)
  basic: '<svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.2L20 9l-4.3 3.9L17 19l-5-3-5 3 1.3-6.1L4 9l5.8-.8z"/></svg>',
  tactics: '<svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  end: '<svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  vari: '<svg viewBox="0 0 24 24"><path d="M4 7h11l-3-3M20 17H9l3 3"/></svg>',
};
const lxBar = (p, ok) => `<span class="lx-bar${ok ? ' ok' : ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span>`;
const plain = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
async function openLessons(cat0) {
  const d = await lessonsReady; selTab('lesson');
  if (!d) { toast(t('ls.fail')); return; }
  let cat = cat0 || ''; if (!cat) try { cat = localStorage.getItem(LS_CAT) || ''; } catch (e) {}
  if (!d.cats.some(c => c.id === cat)) cat = d.cats[0].id;
  const pr = prog(LS_STORE), stat = c => ({ n: c.steps.length, ok: c.steps.filter(id => pr[id] && pr[id].pass).length });
  setHtml($('#lsCats'), d.cats.map(c => { const z = stat(c); return `<button data-c="${c.id}" class="${c.id === cat ? 'sel' : ''}"><span class="ic">${LS_IC[c.id] || LS_IC.basic}</span><span class="nm">${esc(LL(c.name))}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join(''));
  const C = d.cats.find(c => c.id === cat), q = stat(C);
  const banner = `<div class="lx-banner"><span class="ic">${LS_IC[cat] || LS_IC.basic}</span><span class="tx"><b>${esc(LL(C.name))}</b><small>${esc(t('lsc.' + cat))}</small></span><span class="pg">${esc(t('ls.passed', { a: q.ok, b: q.n }))}${lxBar(q.ok / q.n, true)}</span></div>`;
  const cards = C.steps.map((id, k) => { const s = d.steps.find(x => x.id === id); if (!s) return ''; const r = pr[id];
    const st = r ? (r.pass ? `<span class="lx-st ok">✓ ${esc(UI(d, 'pass'))}</span>` : `<span class="lx-st">${esc(UI(d, 'score', { n: r.best }))}</span>`) : `<span class="lx-st new">${esc(t('ls.new'))}</span>`;
    return `<button class="lx-card${r && r.pass ? ' clear' : ''}" data-id="${id}"><span class="lx-th">${s.diagram ? thumb(s.diagram.s, s.diagram.marks) : ''}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">STEP ${k + 1}</span>${st}</span><b class="lx-t">${esc(LL(s.title))}</b><small class="lx-sub">${esc(LL(s.tip))}</small>` +
      `<span class="lx-desc">${esc(plain(LL(s.body)))}</span>${lxBar(r ? r.best / 100 : 0, r && r.pass)}</span></button>`; }).join('');
  setHtml($('#lessonList'), banner + `<div class="lx-grid">${cards}</div>`);
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
$('#lsCats').onclick = e => { const b = e.target.closest('button[data-c]'); if (!b) return; try { localStorage.setItem(LS_CAT, b.dataset.c); } catch (x) {} openLessons(); };
$('#lessonList').onclick = e => { const b = e.target.closest('.lx-card'); if (b) openIntro(b.dataset.id); };
function showLessonView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
let introId = null;
function openIntro(id) {
  const d = LESSONS, s = d.steps.find(x => x.id === id); introId = id;
  const cat = d.cats.find(c => c.steps.includes(id));
  $('#liStep').textContent = cat ? LL(cat.name) : '';
  $('#liTitle').textContent = LL(s.title);
  // the common lesson page (shared/luxintro.js, 2026-11-11): board · facts · how to think · trivia — as much as shogi's page
  if (window.LuxIntro) {
    const FIG = s.diagram ? `<div class="dg" style="width:min(420px,84vw);max-width:none;margin:0">${thumb(s.diagram.s, s.diagram.marks)}</div>` : '', THK = LL(s.body);
    LuxIntro.load('lux.json?v=2').then(X => {
      if (introId !== id || $('#lessonIntroView').classList.contains('hidden')) return;
      const P = LuxIntro.pick, U = P(X.ui || {}) || {}, x = (X.lessons || {})[s.id] || {}, H = k => LuxIntro.head(k, LANG), tr = P(x.trivia), n = (s.problems || []).length;
      LuxIntro.lesson({ step: $('#liStep').textContent, title: $('#liTitle').textContent, fig: FIG, cap: U.figL, chips: [[U.kind, (U.probs || '').replace('{n}', n)], [U.pass, U.passPts]],
        secs: [{ h: H('think'), html: THK }, tr && { h: H('trivia'), html: tr, cls: 'lx-trivia' }].filter(Boolean) });
    });
    showLessonView('lessonIntroView'); showOverlay('#lessonOverlay'); return;
  }
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
// 準備（ramp）で扱える問題の種類。tools/check_lessons.js がこの行を読み、lessons.json の準備がすべてこの中にあるか（＝最後まで進めるか）を確かめる。
// 種類を足すときは、下の lessonMove／renderLessonCard に進め方を書いてから、ここに足す
const RAMP_KINDS = ['explain', 'try:move', 'try:choice'];
function loadItem() {
  const it = lsItem(), D = LESSONS;
  lesson.hint = 0; lesson.done = false; lesson.wrong = false; lesson.tries = 0;
  const st = it.s || lesson.step.diagram && lesson.step.diagram.s || { rule: lesson.step.rule || 'bell', pos: [[0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]], turn: 0 };
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
  $('#lsTitle').textContent = ramp && it.k === 'explain' ? LL(it.t) : LL(s.title);   // 練習の問いは下の本文に出す（見出しと同じ文を2回出さない）
  let pr = '';
  if (ramp) pr = it.k === 'explain' ? LL(it.body) : `<p>${esc(LL(it.t))}</p>` + (it.kind !== 'choice' && it.n != null ? `<p><b>${esc(UI(D, 'roll', { n: it.n }))}</b></p>` : '') + `<p style="font-size:12px;color:var(--dim)">${esc(UI(D, 'rampNote'))}</p>`;
  else pr = `<p>${esc(it.kind === 'choice' ? (LL(it.q) || UI(D, 'qChoice')) : (it.q ? LL(it.q) : UI(D, 'qMove', { n: it.n })))}</p>`;
  $('#lsPrompt').innerHTML = pr;
  const ch = $('#lsChoices');
  if (it.k !== 'explain' && it.kind === 'choice') {   // 選ぶ問題（準備の練習でも、採点の問題でも）
    ch.innerHTML = it.opts.map((o, i) => `<button data-i="${i}" class="${lesson.done && i === it.ans ? 'ok' : ''}">${esc(LL(o))}</button>`).join('');
    ch.onclick = e => { const b = e.target.closest('button'); if (!b || lesson.done) return; const i = +b.dataset.i;
      if (i === it.ans) {
        lesson.done = true; snd('ok');
        if (ramp) fb(`<b class="ok">${esc(UI(D, 'rampGood'))}</b> ${esc(LL(it.g))}`);   // 準備：採点しない。正解で「次へ」が押せる
        else { const pts = score(); lesson.scores[lesson.i] = pts; fb(`<b class="ok">${esc(UI(D, 'correct'))}</b> ${esc(MSG(D, it.why))} <b>${esc(UI(D, 'score', { n: pts }))}</b>`); }
        renderLessonCard(); if (window.CardBar) CardBar.autoNext({ ok: () => lesson && lesson.done, btn: '#lsNext', ms: 1800 });
      }
      // 選ぶ問題は「手」ではないので「もっと良い手があります」とは言わない
      else { lesson.wrong = true; lesson.tries++; b.classList.add('ng'); snd('ng'); const g = it.ngo && it.ngo[i]; fb(`<b class="ng">${esc(UI(D, 'wrongChoice'))}</b>` + (g ? ' ' + esc(MSG(D, [g[0], Object.assign({ x: LL(it.opts[i]) }, g[1])])) : '')); } };   // (2026-11-24 追22: why that choice is wrong — counted from the 32 ways)   // （「もう一度考えてみよう」は同じ意味の文が続くので足さない）
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
const catOf = id => { const c = LESSONS && LESSONS.cats.find(x => x.steps.includes(id)); return c ? c.id : null; };
$('#btnLessonQuit2').onclick = () => { const id = lesson && lesson.id; hideOverlay('#lessonOverlay'); exitSpecial(); openLessons(catOf(id)).then(() => { const el = id && $('#lessonList').querySelector(`[data-id="${id}"]`); if (el) el.scrollIntoView({ block: 'center' }); }); };
$('#btnLessonRetry').onclick = () => { const id = lesson && lesson.id; hideOverlay('#lessonOverlay'); if (id) startLesson(id); };
$('#btnLessonNextStep').onclick = () => { const nx = lesson && lesson.next; hideOverlay('#lessonOverlay'); if (nx) openIntro(nx); };
$('#lsList').onclick = () => { const id = lesson && lesson.id; exitSpecial(); openLessons(catOf(id)).then(() => { const el = id && $('#lessonList').querySelector(`[data-id="${id}"]`); if (el) el.scrollIntoView({ block: 'center' }); }); };
$('#lsQuit').onclick = () => exitSpecial();

window.PatolliLearn = {
  openRules, closeRules, openLessons, exitSpecial, startLesson, lessonsReady,
  relang() {
    if (window.PatolliTour && $('#rulesOverlay').classList.contains('show')) PatolliTour.render();
    if (lesson) renderLessonCard();
    if ($('#lessonOverlay').classList.contains('show') && !$('#lessonListView').classList.contains('hidden')) openLessons();
  },
};
})();
