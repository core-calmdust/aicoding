/* Dots & Boxes — learning features: rules tutorial, graded lessons, solver-verified openings (study + drill),
 * categorized puzzles (詰めドット) and the daily puzzle. Loaded before the main script; uses its globals at run time.
 * All positions and move values come from the exact solvers (see the repository notes); nothing here is heuristic. */
'use strict';
const LV = '?v=20261021L';
const LSTORE2 = 'dots-lessons-v2', PSTORE2 = 'dots-puzzles-v2', PKEEP = 'dots-pz-keep-v1', OSTORE = 'dots-openings-v1', RSTORE = 'dots-rules-v1';
const K64L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const decE = s => [...s].map(c => K64L.indexOf(c));
const decO = s => [...s].map(c => c === '.' ? -1 : +c);
const decV = s => [...s].map((c, e) => c === '.' ? null : [e, K64L.indexOf(c) - 30]).filter(Boolean);
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleepL = ms => new Promise(r => setTimeout(r, ms));
// resolves once the page is visible again (sequences pause in a background tab instead of playing on)
const waitVis = () => !document.hidden ? Promise.resolve() : new Promise(r => { const f = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', f); r(); } }; document.addEventListener('visibilitychange', f); });
const sleepV = ms => sleepL(ms).then(waitVis);
const ltr = s => `<bdi dir="ltr" class="mvn">${s}</bdi>`;

// ---------------------------------------------------------------- long texts (content/text.<lang>.json, loaded on demand)
const textLoads = {};
function textReady(lang) {
  lang = lang || LANG;
  if (!textLoads[lang]) textLoads[lang] = fetch('content/text.' + lang + '.json' + LV).then(r => r.json()).then(d => { Object.assign(I18N[lang], d); return true; }).catch(e => { console.warn(e); return false; });
  return textLoads[lang];
}
const tA = k => { const x = t(k); return Array.isArray(x) ? x : [x]; };

// ---------------------------------------------------------------- data
let L2 = null, OPN = null, PZI = null; const PZC = {};
const getJSON = f => fetch(f + LV).then(r => { if (!r.ok) throw new Error(f); return r.json(); });
const lessonsLoad = () => L2 ? Promise.resolve(L2) : getJSON('lessons.json').then(d => (L2 = d)).catch(e => { console.warn(e); return null; });
const openLoad = () => OPN ? Promise.resolve(OPN) : getJSON('openings.json').then(d => (OPN = d)).catch(e => { console.warn(e); return null; });
const pzIndexLoad = () => PZI ? Promise.resolve(PZI) : getJSON('puzzles/index.json').then(d => (PZI = d)).catch(e => { console.warn(e); return null; });
const pzCatLoad = id => PZC[id] ? Promise.resolve(PZC[id]) : getJSON('puzzles/' + id + '.json').then(d => (PZC[id] = d)).catch(e => { console.warn(e); return null; });

// ---------------------------------------------------------------- mini boards (rules tutorial, lesson figures, opening intros)
const MU = 40, MM = 18;
function miniGeom(R, C) { return E.geom(R, C); }
// fig: {R, C, by: {edge: player 0/1/2}, own: {box: 0/1/2}, hl:[e], bad:[e], safe:[e], num:{box:text}, click:true}
function miniSVG(f, extra) {
  const R = f.R, C = f.C || f.R, G = miniGeom(R, C), W = C * MU + 2 * MM, H = R * MU + 2 * MM;
  const xy = e => { const [r1, c1, r2, c2] = G.ed[e]; return [MM + c1 * MU, MM + r1 * MU, MM + c2 * MU, MM + r2 * MU]; };
  let s = `<svg class="mini-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" dir="ltr">`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" rx="8" class="mb-bg"/>`;
  for (let b = 0; b < G.B; b++) {
    const r = Math.floor(b / C), c = b % C, o = f.own && f.own[b];
    if (o !== undefined && o !== null && o >= 0) s += `<rect x="${MM + c * MU + 4}" y="${MM + r * MU + 4}" width="${MU - 8}" height="${MU - 8}" rx="4" class="mb-box o${o}${f.newBox && f.newBox.includes(b) ? ' nb' : ''}"/>`;
    if (f.num && f.num[b] !== undefined) s += `<text x="${MM + c * MU + MU / 2}" y="${MM + r * MU + MU / 2 + 1}" class="mb-num${f.numc && f.numc[b] ? ' ' + f.numc[b] : ''}">${f.num[b]}</text>`;
    if (f.cap3 && f.cap3.includes(b)) s += `<rect x="${MM + c * MU + 7}" y="${MM + r * MU + 7}" width="${MU - 14}" height="${MU - 14}" rx="3" class="mb-cap3"/>`;
  }
  for (let e = 0; e < G.E; e++) {
    const [x1, y1, x2, y2] = xy(e), b = f.by ? f.by[e] : undefined;
    if (b === undefined || b === null) s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="mb-guide"/>`;
    else s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="mb-edge p${b}${f.last === e ? ' last' : ''}"/>`;
  }
  for (const [cls, list] of [['mb-hl', f.hl], ['mb-bad', f.bad], ['mb-safe', f.safe]]) for (const e of list || []) { const [x1, y1, x2, y2] = xy(e); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`; }
  for (let r = 0; r <= R; r++) for (let c = 0; c <= C; c++) s += `<circle cx="${MM + c * MU}" cy="${MM + r * MU}" r="3.6" class="mb-dot"/>`;
  if (f.click) for (let e = 0; e < G.E; e++) { if (f.by && f.by[e] !== undefined && f.by[e] !== null) continue; const [x1, y1, x2, y2] = xy(e); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="mb-hit" data-e="${e}"/>`; }
  return s + (extra || '') + '</svg>';
}
// a position of the main-game format as a mini figure: setup edges neutral, owners, aids
function figFromProblem(pr, opts) {
  const by = {}; pr.edges.forEach(e => by[e] = 2);
  const own = {}; pr.owners.forEach((o, b) => { if (o >= 0) own[b] = o; });
  const G = E.geom(pr.n, pr.n), p = E.Pos.from(G, pr.edges);
  const cap3 = []; for (let b = 0; b < G.B; b++) if (p.cnt[b] === 3) cap3.push(b);
  return Object.assign({ R: pr.n, C: pr.n, by, own, cap3 }, opts || {});
}

// ---------------------------------------------------------------- board aids for lessons (drawn by renderBoard via drawAids)
let aids = null;   // {safe:[e], nums:{b:txt}, numc:{b:cls}}
function drawAids() {
  if (!aids || typeof gFx === 'undefined') return;
  const n = game.n;
  for (const e of aids.safe || []) { if (S.p.drawn[e]) continue; const [x1, y1, x2, y2] = edgeXY(e); el('line', { x1, y1, x2, y2, class: 'safeline' }, gFx); }
  for (const e of aids.trap || []) { if (S.p.drawn[e]) continue; const [x1, y1, x2, y2] = edgeXY(e); el('line', { x1, y1, x2, y2, class: 'trapline' }, gFx); }
  for (const e of aids.opt || []) { if (S.p.drawn[e]) continue; const [x1, y1, x2, y2] = edgeXY(e); el('line', { x1, y1, x2, y2, class: 'optline' }, gFx); }
  for (const b in aids.nums || {}) {
    const r = Math.floor(b / n), c = b % n, g = el('g', { class: 'aidnum ' + ((aids.numc || {})[b] || '') }, gFx);
    el('circle', { cx: M + c * U + U / 2, cy: M + r * U + U / 2, r: 22 }, g);
    const tx = el('text', { x: M + c * U + U / 2, y: M + r * U + U / 2 + 1 }, g); tx.textContent = aids.nums[b];
  }
}
// components of a loony-ish position: label each box with the size of its chain (L for loops)
function chainAids(p) {
  const comps = E.components(p, true), nums = {}, numc = {};
  for (const c of comps) for (const b of c.boxes) { nums[b] = (c.loop ? 'L' : '') + c.n; numc[b] = c.loop ? 'loop' : c.n >= 3 ? 'long' : 'short'; }
  return { nums, numc };
}
function safeEdges(p) { return p.legal().filter(e => p.gives(e) === 0 && p.completes(e) === 0); }
function longChains(p) { return E.components(p, true).filter(c => c.simple && !c.loop && c.n >= 3).length; }

// ======================================================================== tabs
function selTabL(v) { document.querySelectorAll('.ls-tabs').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === v))); }
let lessonSrc = 'lesson';   // which list the lesson overlay shows: rules | lesson | open
function showLView(v) { if (v !== 'opDetailView') opDetailStop(); if (v !== 'rulesView') rulesStop(); ['lessonListView', 'lessonIntroView', 'lessonDoneView', 'rulesView', 'opDetailView'].forEach(id => { const x = $('#' + id); if (x) x.classList.toggle('hidden', id !== v); }); $('#lessonOverlay .modal').dataset.view = v; }
function swapOv(from, to, open) {
  const a = $(from), b = $(to);
  a.classList.add('instant'); b.classList.add('instant');
  if (from !== to) a.classList.remove('show');
  open();
  requestAnimationFrame(() => requestAnimationFrame(() => { a.classList.remove('instant'); b.classList.remove('instant'); }));
}
function tabClick(v) {
  const inPz = $('#puzzleOverlay').classList.contains('show');
  if (v === 'puzzle') { if (!inPz) { rulesStop(); opDetailStop(); swapOv('#lessonOverlay', '#puzzleOverlay', openPuzzles); } return; }
  const go = v === 'rules' ? openRules : v === 'open' ? openOpenings : openLessons;
  swapOv(inPz ? '#puzzleOverlay' : '#lessonOverlay', '#lessonOverlay', go);
}

// ======================================================================== rules tutorial
// boards are R x C boxes; h(r,c) / v(r,c) give edge numbers
const hE = (R, C, r, c) => r * C + c, vE = (R, C, r, c) => (R + 1) * C + r * (C + 1) + c;
function boxEdges(R, C, r, c) { return [hE(R, C, r, c), hE(R, C, r + 1, c), vE(R, C, r, c), vE(R, C, r, c + 1)]; }
const RULES = [
  { id: 'intro', intro: true },   // page 1: what the game is (history / how to win / culture) — common spec, RuleTour.intro
  { id: 1, R: 2, C: 2, anim: [[0, 0], [11, 1], [4, 0], [1, 1], [9, 0]], task: 'any' },
  { id: 2, R: 2, C: 2, setup: [0, 2, 6, 11, 4], task: 'complete' },
  { id: 3, R: 1, C: 3, setup: [0, 1, 2, 3, 4, 5, 6], task: 'chain', need: 3 },
  { id: 4, R: 2, C: 3, setup: [0, 2, 9, 12, 7, 15], task: 'safe' },
  { id: 5, R: 2, C: 2, setup: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10], own: { 2: 0 }, anim: [[11, 1], [7, 1]], task: 'end' },
  { id: 6, sizes: true },
  { id: 7, finish: true },
];
let RU = null;   // {i, st: {by, own, turn, score, done, wait}}
async function openRules(i) {
  await textReady(); lessonSrc = 'rules'; selTabL('rules');
  RU = { i: i || 0 };
  showLView('rulesView'); $('#lessonOverlay').classList.add('show');
  rulesRender();
}
// stop every running rules sequence (animation, the opponent's reply, delayed re-render): timers are cleared and
// async loops see a new generation number and quit
function rulesStop() { if (!RU) return; clearTimeout(RU.timer); RU.timer = 0; RU.gen = (RU.gen || 0) + 1; }
function rulesPageInit() {
  const P = RULES[RU.i]; rulesStop();
  RU.st = null; if (!P.R) return;
  const by = {}; (P.setup || []).forEach(e => by[e] = 2);
  RU.st = { by, own: Object.assign({}, P.own || {}), turn: 0, score: [0, 0], done: false, msg: '', took: 0, hl: [], bad: [], newBox: [] };
}
function rulesRender(keepState) {
  const P = RULES[RU.i], n = RULES.length;
  if (!keepState) rulesPageInit();
  const done = lsGet(RSTORE, {});
  // layout (common spec): step dots on top, 前へ／閉じる／次へ pinned at the bottom of the fixed-height dialog (same place on
  // every page), the page in .ru-main between them (the board scales to the space left; only the text scrolls when too long)
  const steps = `<div class="ru-steps">${RULES.map((x, j) => `<button data-ru="${j}" class="${j === RU.i ? 'cur' : ''} ${done[x.id] ? 'ok' : ''}" aria-label="${j + 1}">${j + 1}</button>`).join('')}</div>`;
  const ar = P.R ? ((P.C || P.R) * MU + 2 * MM) / (P.R * MU + 2 * MM) : 1;
  let h = steps + `<div class="ru-main${P.R ? ' has-board' : ''}${P.finish ? ' is-fin' : ''}" style="--ru-ar:${ar.toFixed(4)}">`;
  if (P.R) h += '<div class="ru-side"><div class="ru-text">';   // board pages: title / text (scrolls by itself), then the fixed-size board and the task
  if (P.intro) h += `<h2>${escH(t('intro.t'))}</h2>`;
  else h += `<h2>${escH(t('ru.p' + P.id + '.t'))}</h2><div class="lesson-intro ru-body">${t('ru.p' + P.id + '.b')}</div>`;
  if (P.intro) {
    h += window.RuleTour ? `<div class="ru-intro">${RuleTour.intro({ lang: LANG, img: '../images/atlas/dots.webp', origin: t('intro.origin'), players: t('intro.players'), time: t('intro.time'), history: t('intro.hist'), win: t('intro.win'), culture: t('intro.cult') })}</div>`
      : `<div class="lesson-intro ru-body"><p>${t('intro.hist')}</p><p>${t('intro.win')}</p><p>${t('intro.cult')}</p></div>`;
  } else if (P.sizes) {
    h += `<div class="ru-sizes">${[3, 4, 5].map(k => `<figure>${miniSVG({ R: k, C: k })}<figcaption><b>${k} × ${k}</b><br>${escH(t('ru.size', { d: (k + 1) * (k + 1), e: 2 * k * (k + 1), b: k * k }))}</figcaption></figure>`).join('')}</div>`;
  } else if (P.finish) {
    h += `<div class="ru-finish"><button class="mbtn go" id="ruPlay">${escH(t('ru.play'))}</button><button class="mbtn go" id="ruLessons">${escH(t('ru.toLessons'))}</button></div>`;
  } else {
    h += `</div><div class="ru-task" id="ruTask"></div></div><div class="ru-board" id="ruBoard"></div>`;
  }
  h += `</div><div class="modal-actions ru-nav"><button class="mbtn" id="ruPrev" ${RU.i === 0 ? 'disabled' : ''}>${escH(t('ru.prev'))}</button><button class="mbtn" id="ruClose">${escH(t('close'))}</button><button class="mbtn go" id="ruNext" ${RU.i === n - 1 ? 'disabled' : ''}>${escH(t('ru.next'))}</button></div>`;
  $('#rulesBody').innerHTML = h;
  rulesLayout();
  if (P.R) { rulesDraw(); if (P.anim) rulesAnim(); else rulesTaskText(); }
  if (P.intro || P.sizes || P.finish) rulesMark(P.id);
}
// correct answer: ✓ is shown, then the next page opens by itself after ~1.8 s (common spec, same as RuleTour api.ok).
// Called only after the page's own animation has finished; any page change / close / retry clears the timer (rulesStop).
function rulesAutoNext(st, ms) {
  const R0 = RU; clearTimeout(RU.timer);
  RU.timer = setTimeout(() => { if (RU === R0 && RU.st === st && RU.i < RULES.length - 1 && !$('#rulesView').classList.contains('hidden')) { RU.i++; rulesRender(); } }, ms || 1800);
}
function rulesMark(id) { const d = lsGet(RSTORE, {}); if (!d[id]) { d[id] = 1; lsSet(RSTORE, d); const b = document.querySelector(`.ru-steps button[data-ru="${RU.i}"]`); if (b) b.classList.add('ok'); } }
function rulesDraw() {
  const P = RULES[RU.i], st = RU.st, G = E.geom(P.R, P.C);
  const p = E.Pos.from(G, Object.keys(st.by).map(Number));
  const cap3 = []; for (let b = 0; b < G.B; b++) if (p.cnt[b] === 3 && P.task !== 'any') cap3.push(b);
  const num = {}; if (st.plus) for (const b of st.plus) num[b] = '+1';
  $('#ruBoard').innerHTML = miniSVG({ R: P.R, C: P.C, by: st.by, own: st.own, hl: st.hl, bad: st.bad, cap3, last: st.last, click: !st.done && !st.wait, num, newBox: st.newBox });
}
// the ✓/✗ line and the 「もう一度」 button always keep their space (common spec), so answering never moves anything
function rulesTaskText(note) {
  const P = RULES[RU.i], st = RU.st, msg = st.msg || note || '';
  let h = `<span class="ru-q">👉 ${t('ru.p' + P.id + '.task')}</span><div class="ru-fb"><div class="ru-msg ${st.msg ? st.msgCls || '' : msg ? '' : 'is-empty'}" aria-live="polite">${msg || '&nbsp;'}</div>`;
  if (st.done) h += `<button class="ru-again" id="ruAgain">↺ ${escH(t('ru.again'))}</button>`;
  $('#ruTask').innerHTML = h + '</div>';
}
// one fixed board size for every page (shared/ruletour.js RuleTour.box): computed from the dialog only, never from the text
function rulesLayout() {
  const body = $('#rulesBody'), main = body && body.querySelector('.ru-main'), b = main && window.RuleTour && RuleTour.box && RuleTour.box(main, 1);
  if (!b) return;
  body.classList.toggle('rt-row', b.row); body.classList.toggle('rt-col', !b.row);
  for (const k in b.vars) body.style.setProperty(k, b.vars[k]);
  if (RuleTour.more) RuleTour.more(main.querySelector('.ru-text'));
}
{ let rzT = 0; addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (RU && !$('#rulesView').classList.contains('hidden')) rulesLayout(); }, 60); }); }
// play a scripted sequence on the mini board, then hand over to the task
async function rulesAnim() {
  const P = RULES[RU.i], st = RU.st, my = RU, gen = RU.gen, G = E.geom(P.R, P.C);
  const gone = () => RU !== my || RU.gen !== gen || RULES[RU.i] !== P || RU.st !== st;
  st.wait = true; rulesDraw(); rulesTaskText(escH(t('ru.watch')));
  await sleepV(500);
  for (const [e, pl] of P.anim) {
    if (gone()) return;
    const p = E.Pos.from(G, Object.keys(st.by).map(Number));
    const k = p.play(e); st.by[e] = pl; st.last = e;
    st.newBox = [];
    if (k) for (const b of [G.eb0[e], G.eb1[e]]) if (b >= 0 && p.cnt[b] === 4 && st.own[b] === undefined) { st.own[b] = pl; st.score[pl]++; st.newBox.push(b); }
    playLine(); if (k) { chainCount = 0; playBox(k); }
    rulesDraw();
    await sleepV(settings.anim ? 750 : 350);
  }
  if (gone()) return;
  st.wait = false;
  if (P.task === 'end') {   // finished game: show the final count, then offer replay
    st.done = true; st.msg = t('ru.p5.ok', { a: Object.values(st.own).filter(o => o === 0).length, b: Object.values(st.own).filter(o => o === 1).length }); st.msgCls = 'ok';
    rulesMark(P.id); rulesDraw(); rulesTaskText(); rulesAutoNext(st, 2600); return;
  }
  // the task starts from a fresh copy of the end position
  rulesDraw(); rulesTaskText();
}
function rulesClick(e) {
  const P = RULES[RU.i], st = RU.st; if (!st || st.done || st.wait) return;
  const G = E.geom(P.R, P.C), p = E.Pos.from(G, Object.keys(st.by).map(Number));
  if (p.drawn[e]) return;
  ac();
  const fail = (msg) => {
    st.bad = [e]; st.msg = msg; st.msgCls = 'ng'; playWrong(); rulesDraw(); rulesTaskText();
    st.wait = true; RU.timer = setTimeout(() => { if (RU && RU.st === st) { rulesRender(); } }, 2400);
  };
  const k = p.completes(e), gives = p.gives(e);
  switch (P.task) {
    case 'any': {
      st.by[e] = 0; st.last = e; playLine();
      if (k) { st.own[G.eb0[e]] = 0; }
      st.done = true; st.msg = t('ru.p1.ok'); st.msgCls = 'ok'; rulesMark(P.id); break;
    }
    case 'complete': {
      if (!k) return fail(t('ru.p2.ng'));
      p.play(e); st.by[e] = 0; st.last = e; st.newBox = [];
      for (const b of [G.eb0[e], G.eb1[e]]) if (b >= 0 && p.cnt[b] === 4) { st.own[b] = 0; st.newBox.push(b); }
      st.plus = st.newBox.slice(); playLine(); chainCount = 0; playBox(k);
      st.done = true; st.msg = t('ru.p2.ok'); st.msgCls = 'ok'; rulesMark(P.id); break;
    }
    case 'chain': {
      if (!k) return fail(t('ru.p3.ng'));
      p.play(e); st.by[e] = 0; st.last = e; st.newBox = [];
      for (const b of [G.eb0[e], G.eb1[e]]) if (b >= 0 && p.cnt[b] === 4 && st.own[b] === undefined) { st.own[b] = 0; st.newBox.push(b); st.took++; }
      playLine(); if (st.took === 1) chainCount = 0; playBox(k);
      if (st.took >= P.need) { st.done = true; st.msg = t('ru.p3.ok'); st.msgCls = 'ok'; rulesMark(P.id); }
      else { st.msg = t('ru.p3.more', { n: st.took }); st.msgCls = 'ok'; }
      break;
    }
    case 'safe': {
      if (k || gives) {   // the opponent takes what was given
        st.by[e] = 0; st.last = e; p.play(e); playLine(); playWrong();
        st.bad = [e]; st.msg = t('ru.p4.ng', { n: gives }); st.msgCls = 'ng'; st.wait = true; rulesDraw(); rulesTaskText();
        const my = st, R0 = RU, gen = RU.gen, gone = () => RU !== R0 || RU.gen !== gen || RU.st !== my;
        RU.timer = setTimeout(async () => {
          await waitVis(); if (gone()) return;
          for (let b = 0; b < G.B; b++) if (p.cnt[b] === 3) { const f = p.missing(b, -1); p.play(f); my.by[f] = 1; my.last = f; for (const bb of [G.eb0[f], G.eb1[f]]) if (bb >= 0 && p.cnt[bb] === 4 && my.own[bb] === undefined) my.own[bb] = 1; playLine(); playBox(1); rulesDraw(); await sleepV(500); if (gone()) return; b = -1; }
          RU.timer = setTimeout(() => { if (!gone()) rulesRender(); }, 1500);
        }, 900);
        return;
      }
      st.by[e] = 0; st.last = e; playLine();
      st.done = true; st.msg = t('ru.p4.ok'); st.msgCls = 'ok'; rulesMark(P.id); break;
    }
  }
  rulesDraw(); rulesTaskText();
  if (st.done) rulesAutoNext(st);
}
function rulesWire() {
  $('#rulesBody').addEventListener('click', e => {
    const hit = e.target.closest('.mb-hit'); if (hit) { rulesClick(+hit.dataset.e); return; }
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ru !== undefined) { RU.i = +b.dataset.ru; rulesRender(); return; }
    if (b.id === 'ruPrev') { if (RU.i > 0) { RU.i--; rulesRender(); } }
    else if (b.id === 'ruNext') { if (RU.i < RULES.length - 1) { RU.i++; rulesRender(); } }
    else if (b.id === 'ruClose') { closeLessonOverlay(); }
    else if (b.id === 'ruAgain') rulesRender();
    else if (b.id === 'ruPlay') { closeLessonOverlay(); endLesson(true); endPuzzle(true); savedGame = null; Object.assign(settings, { mode: 'ai', size: 3, order: 0, level: 1 }); newGame(); }
    else if (b.id === 'ruLessons') openLessons();
  });
  // ← → page through the rules (reversed for Arabic / RTL), only while the rules view is visible and not while typing
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    if (!RU || !$('#lessonOverlay').classList.contains('show') || $('#rulesView').classList.contains('hidden')) return;
    const tg = e.target; if (tg && (/^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName) || tg.isContentEditable)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const d = (e.key === 'ArrowRight' ? 1 : -1) * (document.documentElement.lang === 'ar' ? -1 : 1), i = RU.i + d;
    if (i >= 0 && i < RULES.length) { RU.i = i; rulesRender(); }
  }, true);
  // hover preview on the mini board
  $('#rulesBody').addEventListener('pointerover', e => { const h = e.target.closest('.mb-hit'); if (h) h.classList.add('hov'); });
  $('#rulesBody').addEventListener('pointerout', e => { const h = e.target.closest('.mb-hit'); if (h) h.classList.remove('hov'); });
  // however the dialog gets hidden (close button, Esc, backdrop, switching to the puzzle dialog, loading a game…), stop its sounds
  new MutationObserver(() => { if (!$('#lessonOverlay').classList.contains('show')) { rulesStop(); opDetailStop(); } }).observe($('#lessonOverlay'), { attributes: true, attributeFilter: ['class'] });
}
function closeLessonOverlay() { rulesStop(); opDetailStop(); $('#lessonOverlay').classList.remove('show'); }

// ======================================================================== lessons
function lessonProg() {
  const p = lsGet(LSTORE2, null);
  if (p) return p;
  // migrate the old 5-step progress (correct answers out of 3)
  const old = lsGet(LSTORE, {}), ids = ['safe', 'chain', 'parity', 'double', 'loop'], out = {};
  for (const i in old) if (ids[i] !== undefined) out[ids[i]] = { best: Math.round(old[i] / 3 * 100), clear: old[i] >= 3 };
  return out;
}
function stepNoL(i) { const c = L2.steps[i].course; let k = 0; for (let j = 0; j <= i; j++) if (L2.steps[j].course === c) k++; return k; }
// lesson list (same layout as Gomoku): a tab per course, a banner, cards with a board picture and a short explanation
const LS_ICON = { basic: '①', mid: '②', adv: '③', exam: '🎓' };
const plainText = html => String(html || '').replace(/<br\s*\/?>|<\/p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const lxBar = (p, cls) => `<span class="lx-bar ${cls || ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span>`;
const lxState = (r, okKey) => r ? (r.clear ? `<span class="lx-st ok">✓ ${escH(t(okKey || 'ls.clear'))} ${escH(t('u.pt', { n: r.best }))}</span>` : `<span class="lx-st">${escH(t('u.pt', { n: r.best }))}</span>`) : `<span class="lx-st new">${escH(t('ls.notyet'))}</span>`;
// small board picture of a lesson: its first (easiest) position with the best move(s) in gold
function lessonThumb(s) {
  if (s._th) return s._th;
  const ex = decodeProblem(s.problems[0]), best = Math.max(...ex.values.map(x => x[1]));
  return (s._th = miniSVG(figFromProblem(ex, { hl: ex.values.filter(x => x[1] === best).map(x => x[0]).slice(0, 3) })));
}
// one-line gist for the card: the step's tip, or the first paragraph of its explanation
function lessonGist(s) { const L = I18N[LANG] || {}, k = 'ls.' + s.id + '.tip'; return plainText(L[k] !== undefined ? t(k) : tA('ls.' + s.id + '.body')[0]); }
let lsCourseSel = '';
async function openLessons(course) {
  await Promise.all([lessonsLoad(), textReady()]); lessonSrc = 'lesson'; selTabL('lesson');
  if (!L2) { toast(t('ls.fail')); return; }
  $('#lsListTitle').textContent = t('ls.title'); $('#lsListDesc').innerHTML = t('ls.desc2'); $('#lessonList').classList.remove('op-list');
  const prog = lessonProg(), courses = [...new Set(L2.steps.map(s => s.course))];
  const ruDone = Object.keys(lsGet(RSTORE, {})).length;
  const stat = c => { const st = L2.steps.filter(s => s.course === c); return { n: st.length, ok: st.filter(s => prog[s.id] && prog[s.id].clear).length }; };
  if (course) lsCourseSel = course;
  if (!courses.includes(lsCourseSel)) lsCourseSel = courses.find(c => { const q = stat(c); return q.ok < q.n; }) || courses[0];
  const c = lsCourseSel, q = stat(c);
  let cards = '';
  // the rules tutorial sits at the head of the first course
  if (c === courses[0]) cards += `<button class="lx-card wide${ruDone >= RULES.length ? ' clear' : ''}" data-rules="1"><span class="lx-th ico">📖</span><span class="lx-tx">` +
    `<span class="lx-top"><span class="lx-no">START</span><span class="lx-st${ruDone >= RULES.length ? ' ok' : ''}">${ruDone >= RULES.length ? '✓' : ruDone + '/' + RULES.length}</span></span><b class="lx-t">${escH(t('ru.title'))}</b><span class="lx-desc">${escH(t('ru.short'))}</span>${lxBar(ruDone / RULES.length, ruDone >= RULES.length ? 'ok' : '')}</span></button>`;
  let no = 0;
  L2.steps.forEach((s, i) => {
    if (s.course !== c) return; no++;
    const r = prog[s.id];
    cards += `<button class="lx-card${r && r.clear ? ' clear' : ''}" data-i="${i}"><span class="lx-th">${lessonThumb(s)}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">STEP ${i + 1}</span>${lxState(r)}</span><b class="lx-t">${escH(t('ls.' + s.id + '.t'))}</b><small class="lx-sub">${escH(t('ls.' + s.id + '.d'))}</small>` +
      `<span class="lx-desc">${escH(lessonGist(s))}</span>${lxBar(r ? r.best / 100 : 0, r && r.clear ? 'ok' : '')}</span></button>`;
  });
  $('#lessonList').innerHTML = `<div class="lx">` +
    `<div class="lx-tabs">${courses.map(k => { const z = stat(k); return `<button data-course="${k}" class="${k === c ? 'sel' : ''}"><span class="ic">${LS_ICON[k] || '●'}</span><span class="nm">${escH(t('course.' + k))}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join('')}</div>` +
    `<div class="lx-banner"><span class="ic">${LS_ICON[c] || '●'}</span><span class="tx"><b>${escH(t('course.' + c))}</b><small>${escH(t('course.' + c + '.sub'))}</small></span><span class="pg">${escH(t('lx.cleared', { a: q.ok, b: q.n }))}${lxBar(q.ok / q.n, 'ok')}</span></div>` +
    `<div class="lx-grid">${cards}</div></div>`;
  showLView('lessonListView'); $('#lessonOverlay').classList.add('show');
}
let introI = 0;
function decodeProblem(q) { return { n: q.n, edges: decE(q.e), owners: decO(q.o), values: decV(q.v), k: q.k }; }
function openIntroL(i) {
  introI = i; lessonSrc = 'lesson'; $('#btnLessonStart').classList.remove('hidden');
  const s = L2.steps[i];
  $('#liStep').textContent = t('course.' + s.course) + ' · STEP ' + (i + 1);
  $('#liTitle').textContent = t('ls.' + s.id + '.t');
  // worked example: the first (easiest) position of the pool, with its best move in gold
  const ex = decodeProblem(s.problems[0]), best = Math.max(...ex.values.map(x => x[1]));
  const G = E.geom(ex.n, ex.n), p = E.Pos.from(G, ex.edges);
  const fig = figFromProblem(ex, { hl: ex.values.filter(x => x[1] === best).map(x => x[0]).slice(0, 3) });
  const ca = chainAids(p); if (['chain', 'hard', 'double', 'control', 'loop', 'count', 'exam'].includes(s.id)) { fig.num = ca.nums; fig.numc = ca.numc; }
  if (['safe', 'third', 'parity', 'sacrifice', 'open3', 'mid4', 'mid5'].includes(s.id)) fig.safe = safeEdges(p).filter(e => !fig.hl.includes(e));
  const fin = finalAt(ex, best);
  const body = tA('ls.' + s.id + '.body').map(x => `<p>${x}</p>`).join('');
  const figs = (LFIGS[s.id] || []).map(f => `<figure class="mini">${miniSVG(f.fig)}<figcaption>${t(f.cap)}</figcaption></figure>`).join('');
  $('#liBody').innerHTML = body + figs + `<figure class="mini">${miniSVG(fig)}<figcaption>${t('ls.exampleCap', { a: fin[0], b: fin[1] })} ${t('ls.' + s.id + '.ex')}</figcaption></figure>` + `<p class="note">${t('ls.scoring')}</p>`;
  showLView('lessonIntroView'); $('#lessonOverlay').classList.add('show');
  $('#lessonOverlay .modal').scrollTop = 0;
}
function finalAt(pr, v) { const sc = [0, 0]; let filled = 0; pr.owners.forEach(o => { if (o >= 0) { sc[o]++; filled++; } }); const rem = pr.n * pr.n - filled; return [sc[0] + (rem + v) / 2, sc[1] + (rem - v) / 2]; }
// dense rank: the best value scores 20, the worst 0, linear over the distinct values in between
function rankPoints(values, mine) {
  const d = [...new Set(values.map(x => x[1]))].sort((a, b) => b - a);
  if (d.length <= 1) return 20;
  const i = d.indexOf(mine); return Math.max(0, Math.round(20 * (d.length - 1 - i) / (d.length - 1)));
}
function startLessonL(i) {
  endPuzzle(true); if (lesson) endLesson(true);
  enterSetup(null, 4);
  const s = L2.steps[i], pool = s.problems.slice(1).map(decodeProblem);   // problem 0 is the worked example
  const rest = pool.slice(1).map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).slice(0, 4).map(x => x[1]);
  const order = new Map(pool.map((x, j) => [x, j]));
  const probs = [pool[0], ...rest.sort((a, b) => order.get(a) - order.get(b))];
  lesson = { i, s, probs, k: 0, results: [], answered: false };
  document.body.classList.add('in-lesson');
  loadProblemL();
}
function loadProblemL() {
  const pr = lesson.probs[lesson.k];
  lesson.pr = pr; lesson.answered = false; lesson.hinted = false; lesson.mine = null;
  hintEdge = -1; badEdge = -1; chainCount = 0; aids = null;
  game = { n: pr.n, moves: [], human: 0, setup: { edges: pr.edges, owners: pr.owners } };
  builtFor = '';
  refresh(false);
  renderLessonCard();
}
function renderLessonCard() {
  if (!lesson) return;
  if (lesson.study) return studyRender();
  if (lesson.drill) return drillRender();
  const L = lesson, s = L.s, exam = L.k >= 3;
  const tot = L.results.reduce((a, b) => a + b, 0);
  $('#lsStep').textContent = `STEP ${L.i + 1} · ${t('ls.qn', { i: L.k + 1 })}` + (exam ? ' · 🎓 ' + t('ls.exam') : '') + ` · ${t('ls.total', { n: tot })}`;
  $('#lsTitle').textContent = t('ls.' + s.id + '.t');
  $('#lsDots').innerHTML = L.probs.map((_, j) => `<i class="${j < L.results.length ? (L.results[j] >= 16 ? 'ok' : L.results[j] >= 10 ? 'mid' : 'ng') : j === L.k ? 'cur' : ''}"></i>`).join('');
  $('#lsPrompt').innerHTML = `<span class="ls-size">${L.pr.n}×${L.pr.n}</span> ` + t('ls.' + s.id + '.q');
  $('#lsNext').textContent = L.k === L.probs.length - 1 ? t('ls.result') : t('ls.next');
  $('#lsNext').disabled = !L.answered; $('#lsNext').style.display = '';
  $('#lsHint').textContent = t('ls.hint'); $('#lsHint').disabled = L.answered;
  $('#lsFb').innerHTML = L.answered ? answerFb() : L.hinted ? hintText() : (L.k === 0 ? `📘 ${t('ls.firstNote')}` : exam ? `🎓 ${t('ls.examNote')}` : '');
}
function hintText() { return `💡 ${t('ls.' + lesson.s.id + '.hint')}` + (lesson.k >= 3 ? '' : aidsNote()); }
function aidsNote() {
  const p = S.p, safe = safeEdges(p);
  const kind = lesson.s.id;
  if (['safe', 'third', 'parity', 'sacrifice', 'open3', 'mid4', 'mid5'].includes(kind)) return `<br><small>${t('ls.aidSafe', { n: safe.length, l: longChains(p) })}</small>`;
  return `<br><small>${t('ls.aidChain')}</small>`;
}
function lessonAnswer(e) {
  const L = lesson; if (!L || L.answered) return;
  if (L.drill) return drillAnswer(e);
  const pr = L.pr, vals = new Map(pr.values), v = vals.get(e); if (v === undefined) return;
  const best = Math.max(...pr.values.map(x => x[1]));
  const pts = rankPoints(pr.values, v);
  L.answered = true; L.results[L.k] = pts; L.mine = e; L.before = S.p.clone();
  aids = null;
  applyMove(e, true);
  if (v < best) { hintEdge = pr.values.find(x => x[1] === best)[0]; badEdge = -1; renderBoard(false); playWrong(); }
  else coach(t('ls.ok'), 'gold', 1200);
  renderLessonCard();
}
function answerFb() {
  const L = lesson, pr = L.pr, e = L.mine, vals = new Map(pr.values), v = vals.get(e), best = Math.max(...pr.values.map(x => x[1]));
  const pts = L.results[L.k], fin = finalAt(pr, v), fb = finalAt(pr, best);
  const bests = pr.values.filter(x => x[1] === best).map(x => x[0]);
  const lbl = pts === 20 ? 'fb.perfect' : pts >= 16 ? 'fb.good' : pts >= 10 ? 'fb.ng' : 'fb.bad';
  let h = `<span class="pts ${pts >= 16 ? 'ok' : pts >= 10 ? 'mid' : 'ng'}">+${t('u.pt', { n: pts })}</span> <b class="${pts === 20 ? 'ok' : 'ng'}">${t(lbl)}</b> `;
  h += t('ls.outcome2', { m: ltr(edgeName(e)), a: fin[0], b: fin[1] });
  if (v < best) h += ' ' + t('ls.bestIs2', { m: ltr(bests.slice(0, 3).map(edgeName).join(' ')), a: fb[0], b: fb[1] });
  else if (bests.length > 1) h += ' ' + t('ls.alsoBest', { n: bests.length });
  const why = reasonL(L.before, e, bests[0], v, best);
  if (why) h += `<br>${why}`;
  h += `<br><span class="tip">${t('ls.' + L.s.id + '.tip')}</span>`;
  return h;
}
// facts about the chosen and the best move, from the position itself
function reasonL(p, e, b, v, best) {
  const out = [];
  const g = p.gives(e), k = p.completes(e);
  const cm = p.hasCapture() ? E.captureMoves(p) : null;
  const isDecl = cm && cm.declines && cm.declines.includes(e), bestDecl = cm && cm.declines && cm.declines.includes(b);
  if (cm && cm.forced === undefined) {
    if (v < best) out.push(t(bestDecl ? 'r.shouldDecline' : 'r.shouldTake'));
    else out.push(t(isDecl ? 'r.declineOk' : 'r.takeOk'));
  } else if (p.hasCapture() && !k && v < best) out.push(t('r.missedTake'));
  if (!k && g > 0 && safeEdges(p).length && v < best && p.gives(b) === 0) out.push(t('r.gaveBoxes', { n: g }));
  if (!k && g > 0 && v === best && safeEdges(p).length) out.push(t('r.sacOk', { n: g }));
  // safe lines left after the move and long chains (parity facts)
  if (safeEdges(p).length) {
    const q = p.clone(); q.play(e); const qb = p.clone(); qb.play(b);
    out.push(t('r.after', { m: ltr(edgeName(e)), s: safeEdges(q).length, l: longChains(q) }) + (e !== b ? t('r.afterBest', { m: ltr(edgeName(b)), s: safeEdges(qb).length, l: longChains(qb) }) : ''));
  } else if (!p.hasCapture()) {
    const comps = E.components(p, true).map(c => (c.loop ? 'L' : '') + c.n).sort();
    out.push(t('r.comps', { c: ltr(comps.join(' · ')) }));
  }
  return out.join(' ');
}
function lessonHint() {
  if (lesson && lesson.study) { studyBack(); return; }
  if (lesson && lesson.drill) { drillHint(); return; }
  if (!lesson || lesson.answered) return;
  lesson.hinted = true;
  if (lesson.k < 3) {   // problems 4-5 are the step's exam: hint text only
    const p = S.p, kind = lesson.s.id;
    if (['safe', 'third', 'parity', 'sacrifice', 'open3', 'mid4', 'mid5'].includes(kind)) aids = { safe: safeEdges(p) };
    else aids = chainAids(p);
    renderBoard(false);
  }
  $('#lsFb').innerHTML = hintText();
}
function lessonNext() {
  const L = lesson;
  if (L && L.drill) { if (L.done) startDrill(L.si, L.li, L.color); return; }
  if (!L || !L.answered || L.study) return;
  if (L.k < L.probs.length - 1) { L.k++; loadProblemL(); return; }
  const n = L.results.reduce((a, b) => a + b, 0), pass = n >= 75;
  const prog = lessonProg(), pr = prog[L.s.id] || { best: 0, clear: false };
  pr.best = Math.max(pr.best, n); pr.clear = pr.clear || pass; prog[L.s.id] = pr; lsSet(LSTORE2, prog);
  introI = L.i;
  $('#ldTitle').textContent = t(pass ? 'ls.passed' : 'ls.failed');
  $('#ldSub').innerHTML = `<div class="ld-score ${pass ? 'ok' : 'ng'}">${t('u.pt', { n })}<small> / 100</small></div>` + L.results.map((x, k) => `${k + 1}: ${t('u.pt', { n: x })}`).join('　') + (pass ? '' : `<br>${t('ls.needPass')}`) + (pass && L.s.course === 'exam' ? `<p class="ls-grad">${t('ls.graduate')}</p>` : '');
  $('#btnLessonNextStep').classList.toggle('hidden', L.i + 1 >= L2.steps.length);
  playChime(pass ? 1 : -1);
  lessonSrc = 'lesson'; showLView('lessonDoneView'); $('#lessonOverlay').classList.add('show');
}
function endLesson(silent) {
  if (!lesson) return;
  if (lesson.timer) clearInterval(lesson.timer);
  lesson = null; aids = null; document.body.classList.remove('in-lesson');
  $('#lsNext').style.display = '';
  if (!silent) restoreGame();
}

// small hand-made concept figures for some lesson intros
const LFIGS = (() => {
  const f = {}, by = {};
  // 3x3: a loop of four boxes (top left) and a chain of five around it — every box has exactly two sides
  [0, 1, 6, 7, 10, 11, 12, 14, 15, 16, 18, 19, 20, 23].forEach(e => by[e] = 2);
  f.chain = [{ fig: { R: 3, C: 3, by, num: { 0: 'L4', 1: 'L4', 3: 'L4', 4: 'L4', 2: 5, 5: 5, 8: 5, 7: 5, 6: 5 }, numc: { 0: 'loop', 1: 'loop', 3: 'loop', 4: 'loop', 2: 'long', 5: 'long', 8: 'long', 7: 'long', 6: 'long' } }, cap: 'ls.chain.fig' }];
  // 1x4: the opponent opened the chain at the left end; you took two boxes and now leave the last two (gold line)
  const by2 = {}; for (let c = 0; c < 4; c++) { by2[c] = 2; by2[4 + c] = 2; }
  by2[8] = 1; by2[9] = 0; by2[10] = 0;
  f.double = [{ fig: { R: 1, C: 4, by: by2, own: { 0: 0, 1: 0 }, hl: [12], cap3: [2] }, cap: 'ls.double.fig' }];
  return f;
})();

// ======================================================================== openings (定跡)
function openProg() { return lsGet(OSTORE, {}); }
function edgeNameN(n, e) { const G = E.geom(n, n), [r1, c1, r2] = G.ed[e]; return letters[c1] + (r1 + 1) + (r1 === r2 ? '–' : '|'); }
// sub-tabs of the 定跡 list: 'basic' (concepts) or a set index (3×3, 4×4); remembered per device
let opTab = lsGet('dots-optab-v1', 'basic');
const opSides = l => l.side === -1 ? [0, 1] : [l.side || 0];
// difficulty of a line for the side(s) that practise it: critical moments with at most 2 good moves out of many
function opHard(s, l) { const F = l._facts || (l._facts = lineFacts(s, l)); return F.crit.filter(c => c.i < l.drill && c.nb <= 2 && c.nl >= 6).reduce((a, c) => a + (c.nb === 1 ? 1.5 : 1), 0) + F.crit.filter(c => c.i < l.drill).reduce((a, c) => a + c.worse / c.nl, 0) * 0.5; }
// 1-3 by rank within the set (thirds), so each board has easy, medium and hard lines
function opLevel(s, l) {
  if (!s._lv) { const h = s.lines.map(x => opHard(s, x)), sorted = h.slice().sort((a, b) => a - b), n = h.length; s._lv = h.map(v => { const r = sorted.indexOf(v); return r < n / 3 ? 1 : r < 2 * n / 3 ? 2 : 3; }); }
  return s._lv[s.lines.indexOf(l)];
}
const opStars = k => '★'.repeat(k) + '<i>' + '★'.repeat(3 - k) + '</i>';
// highlight move names (b2– a3| …) inside a plain text
const hlMoves = s => escH(s).replace(/(^|[^a-z0-9])([a-f][1-6][–|])/g, (_, p, m) => p + `<bdi dir="ltr" class="mvn hm">${m}</bdi>`);
const sentences = s => String(s).split(/(?<=[。！？!?।])\s*|(?<=\.)\s+/).map(x => x.trim()).filter(Boolean);
// small board of a line: the first moves (up to 6) with the last one highlighted
function lineThumb(s, l) {
  if (l._th) return l._th;
  const L = { s, moves: decE(l.moves) }, k = Math.min(6, l.drill || 6, L.moves.length), ps = opPos(L, k);
  const num = {}; return (l._th = miniSVG({ R: s.n, C: s.n, by: ps.by, own: ps.own, last: k ? L.moves[k - 1] : -1, num }));
}
const opIcon = v => v === 'basic' ? '💡' : miniSVG({ R: OPN.sets[v].n, C: OPN.sets[v].n, by: {} });
async function openOpenings(tab) {
  await Promise.all([openLoad(), textReady()]); lessonSrc = 'open'; selTabL('open');
  if (!OPN) { toast(t('ls.fail')); return; }
  if (tab !== undefined) { opTab = tab; lsSet('dots-optab-v1', tab); }
  if (opTab !== 'basic' && !OPN.sets[opTab]) opTab = 'basic';
  $('#lsListTitle').textContent = t('op.title'); $('#lsListDesc').innerHTML = t('op.desc2');
  const prog = openProg();
  const stat = si => { const s = OPN.sets[si]; return { n: s.lines.length, ok: s.lines.filter(l => prog[s.id + ':' + l.id]).length }; };
  const tabs = [['basic', t('op.tab.basic')], ...OPN.sets.map((s, i) => [i, s.n + ' × ' + s.n])];
  let h = `<div class="lx"><div class="lx-tabs" role="tablist">` + tabs.map(([v, nm]) => { const z = v === 'basic' ? null : stat(v); return `<button data-opt="${v}" class="${String(v) === String(opTab) ? 'sel' : ''}" role="tab"><span class="ic${v === 'basic' ? '' : ' sv'}">${opIcon(v)}</span><span class="nm">${escH(nm)}</span>${z ? `<span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span>` : ''}</button>`; }).join('') + `</div>`;
  if (opTab === 'basic') {
    h += `<div class="lx-banner"><span class="ic">💡</span><span class="tx"><b>${escH(t('op.tab.basic'))}</b><small>${escH(t('lx.op.basic.sub'))}</small></span></div>`;
    h += `<div class="lesson-list op-list">${opBasicHtml()}</div>`;
  } else {
    const si = +opTab, s = OPN.sets[si], z = stat(si);
    h += `<div class="lx-banner"><span class="ic sv">${opIcon(si)}</span><span class="tx"><b>${escH(t('op.' + s.id + '.t'))}</b><small>${t('op.' + s.id + '.short')}</small></span><span class="pg">${escH(t('op.drilled', { n: z.ok, t: z.n }))}${lxBar(z.ok / z.n, 'ok')}</span></div>`;
    h += `<details class="op-about lx-about"><summary>${escH(t('op.h.about', { n: s.n }))}</summary>${tA('op.' + s.id + '.intro').map(x => `<p>${x}</p>`).join('')}</details>`;
    h += `<div class="lx-grid">` + s.lines.map((l, li) => {
      const lv = opLevel(s, l), ok = prog[s.id + ':' + l.id];
      return `<div class="lx-card op-card${ok ? ' clear done' : ''}" data-oc="${li}" tabindex="0" role="button"><span class="lx-th">${lineThumb(s, l)}</span><span class="lx-tx">`
        + `<span class="lx-top"><span class="lx-no">No.${li + 1}</span><span class="lx-bd b${lv}">${opStars(lv)} ${escH(t('op.lv')[lv])}</span><span class="lx-bd">${escH(t('op.side.' + (l.side === -1 ? 'both' : l.side || 0)))}</span>${ok ? `<span class="lx-st ok">✓ ${escH(t('op.done'))}</span>` : `<span class="lx-st new">${escH(t('op.moves', { n: l.drill }))}</span>`}</span>`
        + `<b class="lx-t">${escH(t('op.L.' + l.id))}</b><span class="lx-desc">${hlMoves(t('op.S.' + l.id))}</span>`
        + `<span class="lx-acts oc-btns">${opSides(l).map(c => `<button data-li="${li}" data-c="${c}">${c === 0 ? '● ' + escH(t('op.drillF')) : '○ ' + escH(t('op.drillS'))}</button>`).join('')}<span class="oc-open">${escH(t('op.open'))} ›</span></span></span></div>`;
    }).join('') + `</div>`;
  }
  h += `<p class="op-credit lx-credit">${t('op.credit')}</p></div>`;
  $('#lessonList').innerHTML = h;
  $('#lessonList').classList.remove('op-list');
  showLView('lessonListView'); $('#lessonOverlay').classList.add('show');
}
// 基本の考え方: short sections with a heading, a few short paragraphs and (some) a small figure
function opBasicHtml() {
  const figs = {
    chain: LFIGS.chain[0].fig,
    mirror: (() => { const by = {}; by[4] = 0; by[7] = 1; return { R: 3, C: 3, by, hl: [7], num: { 4: '★' } }; })(),
    double: LFIGS.double[0].fig,
  };
  let h = '';
  for (const k of ['goal', 'chain', 'mirror', 'double', 'use']) {
    const f = figs[k];
    h += `<section class="op-basic${f ? ' has-fig' : ''}"><h3>${escH(t('op.B.' + k + '.h'))}</h3><div class="ob-body">${tA('op.B.' + k).map(x => `<p>${x}</p>`).join('')}</div>`
      + (f ? `<figure class="mini">${miniSVG(f)}<figcaption>${t('op.B.' + k + '.cap')}</figcaption></figure>` : '') + `</section>`;
  }
  return h;
}
// ---- detail view: board + stepper + explanation (inside the dialog)
let OD = null;   // {si, li, s, l, moves, cur, showOpt, facts, timer}
function openOpDetail(si, li, cur) {
  const s = OPN.sets[si], l = s.lines[li];
  if (OD && OD.timer) clearInterval(OD.timer);
  OD = { si, li, s, l, moves: decE(l.moves), cur: cur || 0, showOpt: OD ? OD.showOpt : false, facts: l._facts || (l._facts = lineFacts(s, l)), timer: 0 };
  lessonSrc = 'open'; opTab = si;
  showLView('opDetailView'); $('#lessonOverlay').classList.add('show');
  opDetailRender(true);
  $('#lessonOverlay .modal').scrollTop = 0;
}
function opPos(L, upto) {   // drawn edges by player, owned boxes and the mover after `upto` moves
  const G = E.geom(L.s.n, L.s.n), p = new E.Pos(G), by = {}, own = {}; let turn = 0;
  for (let i = 0; i < upto; i++) {
    const e = L.moves[i], k = p.play(e); by[e] = turn;
    if (k) for (const b of [G.eb0[e], G.eb1[e]]) if (b >= 0 && p.cnt[b] === 4 && own[b] === undefined) own[b] = turn;
    if (!k) turn ^= 1;
  }
  return { p, by, own, turn };
}
function opBoardSvg() {
  const L = OD, n = L.s.n, ps = opPos(L, L.cur), f = { R: n, C: n, by: ps.by, own: ps.own, last: L.cur ? L.moves[L.cur - 1] : -1 };
  if (L.cur < L.moves.length) {
    const vs = L.l.vals[L.cur] ? decV(L.l.vals[L.cur]) : [];
    if (L.showOpt && vs.length > 1) { const b = Math.max(...vs.map(x => x[1])); f.hl = vs.filter(x => x[1] === b).map(x => x[0]); if (L.l.full[L.cur]) f.bad = vs.filter(x => x[1] < b).map(x => x[0]); }
    else f.hl = [L.moves[L.cur]];   // the next move of the line, dashed gold
  }
  return miniSVG(f);
}
function opDetailRender(full) {
  const L = OD; if (!L) return;
  const s = L.s, l = L.l, nL = s.lines.length, last = L.moves.length, prog = openProg();
  if (full) {
    const lv = opLevel(s, l);
    let h = `<div class="lt">${escH(t('tab.open'))} · ${s.n}×${s.n} · ${L.li + 1} / ${nL}</div>`;
    h += `<h2 class="od-title"><button class="od-pg" data-odpg="-1" ${L.li <= 0 ? 'disabled' : ''} aria-label="${escH(t('op.prevLine'))}">‹</button><span>${escH(t('op.L.' + l.id))}</span><button class="od-pg" data-odpg="1" ${L.li >= nL - 1 ? 'disabled' : ''} aria-label="${escH(t('op.nextLine'))}">›</button></h2>`;
    h += `<div class="oc-meta od-meta"><span class="oc-badge lv${lv}">${opStars(lv)} ${escH(t('op.lv')[lv])}</span><span class="oc-badge sd">${escH(t('op.side.' + (l.side === -1 ? 'both' : l.side || 0)))}</span>${prog[s.id + ':' + l.id] ? `<span class="oc-badge ok">✓ ${escH(t('op.done'))}</span>` : ''}</div>`;
    h += `<div class="od-grid"><div class="od-left"><div class="od-board" id="odBoard"></div><div class="od-ply" id="odPly"></div>`
      + `<div class="op-nav od-nav" dir="ltr"><button data-odn="first" aria-label="first">⏮</button><button data-odn="prev" aria-label="prev">◀</button><button data-odn="play" id="odPlay" aria-label="play">▶</button><button data-odn="next" aria-label="next">▶</button><button data-odn="last" aria-label="last">⏭</button></div>`
      + `<label class="op-opt"><input type="checkbox" id="odOpt" ${L.showOpt ? 'checked' : ''}> ${escH(t('op.showOpt'))}</label>`
      + `<div class="op-seq od-seq" id="odSeq" dir="ltr"></div><p class="od-keys">${escH(t('op.keys'))}</p></div>`
      + `<div class="od-right"><section class="od-sec"><h3>${escH(t('op.h.point'))}</h3><ul class="od-pts">${sentences(t('op.N.' + l.id)).map(x => `<li>${hlMoves(x)}</li>`).join('')}</ul></section>`
      + `<section class="od-sec od-now"><h3>${escH(t('op.h.now'))}</h3><div id="odNow"></div></section>`
      + `<div class="od-actions"><div class="od-row">${opSides(l).map(c => `<button class="mbtn go" data-odr="${c}">${c === 0 ? '● ' + escH(t('op.drillF')) : '○ ' + escH(t('op.drillS'))}</button>`).join('')}</div><div class="od-row"><button class="mbtn" id="odBack">${escH(t('ls.list'))}</button><button class="mbtn" id="odBoardPlay">${escH(t('op.boardPlay'))}</button></div></div></div></div>`;
    $('#opDetailView').innerHTML = h;
  }
  $('#odBoard').innerHTML = opBoardSvg();
  const mover = L.cur < last ? opPos(L, L.cur).turn : -1;
  $('#odPly').innerHTML = L.cur === 0 ? escH(t('op.start')) : `${escH(t('op.plyOf', { n: L.cur, t: last }))}` + (mover >= 0 ? ` · <span class="od-who p${mover}">${escH(t('op.toMove', { who: t(mover === 0 ? 'op.first' : 'op.second') }))}</span>` : '');
  const F = L.facts;
  $('#odSeq').innerHTML = `<button data-ods="0" class="${L.cur === 0 ? 'cur' : ''}">${escH(t('op.start'))}</button> ` + L.moves.map((e, i) => `<button data-ods="${i + 1}" class="${L.cur === i + 1 ? 'cur' : ''}${i >= l.drill ? ' ext' : ''}${F.crit.find(c => c.i === i && c.nb <= 2) ? ' crit' : ''}">${i + 1}.${edgeNameN(s.n, e)}</button>`).join(' ');
  $('#odNow').innerHTML = studyNote(L, true);
  $('#odPlay').textContent = L.timer ? '⏸' : '▶';
  const cb = $('#odSeq button.cur'); if (cb && cb.scrollIntoView && !full) { const box = $('#odSeq'); if (cb.offsetTop < box.scrollTop || cb.offsetTop > box.scrollTop + box.clientHeight - 24) box.scrollTop = cb.offsetTop - box.clientHeight / 2; }
}
function opDetailNav(what) {
  const L = OD; if (!L) return;
  const last = L.moves.length;
  if (what === 'play') {
    if (L.timer) { clearInterval(L.timer); L.timer = 0; opDetailRender(); return; }
    if (L.cur >= last) L.cur = 0;
    L.timer = setInterval(() => { if (document.hidden) return; if (OD !== L || L.cur >= last || $('#opDetailView').classList.contains('hidden')) { clearInterval(L.timer); L.timer = 0; if (OD === L) opDetailRender(); return; } L.cur++; playLine(); opDetailRender(); }, settings.anim ? 800 : 450);
    opDetailRender(); return;
  }
  if (L.timer) { clearInterval(L.timer); L.timer = 0; }
  const to = what === 'first' ? 0 : what === 'last' ? last : what === 'prev' ? L.cur - 1 : what === 'next' ? L.cur + 1 : +what;
  if (to < 0 || to > last || to === L.cur) return;
  if (to === L.cur + 1) playLine();
  L.cur = to; opDetailRender();
}
function opDetailStop() { if (OD && OD.timer) { clearInterval(OD.timer); OD.timer = 0; } }
// analysis of a line for the study view: critical moments and the chain structure when the safe moves run out
function lineFacts(s, l) {
  const n = s.n, G = E.geom(n, n), moves = decE(l.moves), p = new E.Pos(G);
  const crit = [];
  let safeEnd = -1, struct = null, toMove = 0, turn = 0;
  for (let i = 0; i < moves.length; i++) {
    const vs = l.vals[i] ? decV(l.vals[i]) : [];
    if (l.full[i] && vs.length > 3) { const b = Math.max(...vs.map(x => x[1])), nb = vs.filter(x => x[1] === b).length; crit.push({ i, nb, nl: vs.length, worse: vs.length - nb }); }
    if (safeEnd < 0 && !safeEdges(p).length && !p.hasCapture()) { safeEnd = i; struct = E.components(p, true).map(c => ({ n: c.n, loop: c.loop })); toMove = turn; }
    const k = p.play(moves[i]); if (!k) turn ^= 1;
  }
  return { crit, safeEnd, struct, toMove };
}
function startStudy(si, li, ply) {
  const s = OPN.sets[si], l = s.lines[li];
  endPuzzle(true); if (lesson) endLesson(true);
  enterSetup(null, s.n);
  $('#lessonOverlay').classList.remove('show');
  lesson = { study: true, answered: true, si, li, s, l, moves: decE(l.moves), cur: ply || 0, timer: 0, showOpt: false, facts: lineFacts(s, l) };
  document.body.classList.add('in-lesson');
  studyShow();
  if (!ply) setTimeout(() => { if (lesson && lesson.study && lesson.l === l && lesson.cur === 0) studyNav('play'); }, 450);
}
function studyShow(anim) {
  const L = lesson;
  game = { n: L.s.n, moves: L.moves.slice(0, L.cur), human: 0, setup: null };
  builtFor = builtFor === String(L.s.n) ? builtFor : '';
  aids = null;
  if (L.showOpt && L.cur < L.moves.length && L.l.vals[L.cur]) {
    const vs = decV(L.l.vals[L.cur]); if (vs.length > 1) { const b = Math.max(...vs.map(x => x[1])); aids = { opt: vs.filter(x => x[1] === b).map(x => x[0]), trap: L.l.full[L.cur] ? vs.filter(x => x[1] < b).map(x => x[0]) : [] }; }
  }
  refresh(!!anim);
  studyRender();
}
function studyNav(what) {
  const L = lesson; if (!L || !L.study) return;
  const last = L.moves.length;
  if (what === 'play') {
    if (L.timer) { clearInterval(L.timer); L.timer = 0; studyRender(); return; }
    if (L.cur >= last) { L.cur = 0; studyShow(); }
    L.timer = setInterval(() => { if (document.hidden) return; if (lesson !== L || L.cur >= last) { clearInterval(L.timer); L.timer = 0; if (lesson === L) studyRender(); return; } L.cur++; playLine(); studyShow(true); }, settings.anim ? 800 : 420);
    studyRender(); return;
  }
  if (L.timer) { clearInterval(L.timer); L.timer = 0; }
  const to = what === 'first' ? 0 : what === 'last' ? last : what === 'prev' ? L.cur - 1 : what === 'next' ? L.cur + 1 : +what;
  if (to < 0 || to > last) return;
  const fwd = to === L.cur + 1; L.cur = to; if (fwd) playLine(); studyShow(fwd);
}
function studyRender() {
  const L = lesson, s = L.s, l = L.l, nL = s.lines.length, F = L.facts;
  $('#lsStep').textContent = `${t('op.study')} · ${s.n}×${s.n}`;
  $('#lsTitle').innerHTML = `<span class="st-pg"><button data-spg="-1" ${L.li <= 0 ? 'disabled' : ''} title="${escH(t('op.prevLine'))}">‹</button><span>${escH(t('op.L.' + l.id))}</span><button data-spg="1" ${L.li >= nL - 1 ? 'disabled' : ''} title="${escH(t('op.nextLine'))}">›</button><small>${L.li + 1} / ${nL}</small></span>`;
  $('#lsDots').innerHTML = '';
  const seq = L.moves.map((e, i) => `<button data-sply="${i + 1}" class="${L.cur === i + 1 ? 'cur' : ''}${i >= l.drill ? ' ext' : ''}${F.crit.find(c => c.i === i && c.nb <= 2) ? ' crit' : ''}">${i + 1}.${edgeNameN(s.n, e)}</button>`).join(' ');
  $('#lsPrompt').innerHTML = `<div class="op-seq" dir="ltr"><button data-sply="0" class="${L.cur === 0 ? 'cur' : ''}">${t('op.start')}</button> ${seq}</div>`
    + `<div class="op-nav" dir="ltr"><button data-snav="first">⏮</button><button data-snav="prev">◀</button><button data-snav="play">${L.timer ? '⏸' : '▶'}</button><button data-snav="next">▶</button><button data-snav="last">⏭</button><label class="op-opt"><input type="checkbox" id="opOpt" ${L.showOpt ? 'checked' : ''}> ${escH(t('op.showOpt'))}</label></div>`;
  $('#lsFb').innerHTML = studyNote() + `<div class="op-dr" style="margin-top:10px">${(l.side === -1 ? [0, 1] : [l.side]).map(c => `<button data-sdr="${c}">${c === 0 ? '● ' + t('op.drillF') : '○ ' + t('op.drillS')}</button>`).join('')}</div>`;
  $('#lsHint').textContent = t('ls.back'); $('#lsHint').disabled = false;
  $('#lsNext').style.display = 'none';
}
// explanation for the current step of the line
function studyNote(L, noInfo) {
  L = L || lesson; const s = L.s, l = L.l, F = L.facts, i = L.cur;
  let h = noInfo ? '' : `<div class="op-info">${escH(t('op.N.' + l.id))}</div>`;
  const v0 = l.vals[0] ? decV(l.vals[0]) : [];
  const res = l.final ? t('op.result', { a: l.final[0], b: l.final[1] }) : '';
  if (i < L.moves.length && l.vals[i]) {
    const vs = decV(l.vals[i]), mover = moverAt(L, i);
    if (vs.length) {
      const b = Math.max(...vs.map(x => x[1]));
      const who = t(mover === 0 ? 'op.first' : 'op.second');
      if (l.full[i] && vs.length > 1) {
        const nb = vs.filter(x => x[1] === b).length;
        h += `<p>${t('op.atPly', { n: i + 1, who, k: nb, t: vs.length })}` + (nb <= 2 ? ' ' + t('op.critical') : '') + '</p>';
      } else h += `<p>${t('op.next', { n: i + 1, who, m: ltr(edgeNameN(s.n, L.moves[i])) })}</p>`;
    }
  }
  if (F.safeEnd >= 0 && i >= F.safeEnd && F.struct) {
    const longs = F.struct.filter(c => !c.loop && c.n >= 3).length, loops = F.struct.filter(c => c.loop).length;
    const dots = (s.n + 1) * (s.n + 1), sum = dots + longs;
    if (!longs) h += `<p>${t('op.noLong', { k: F.safeEnd, c: ltr(F.struct.map(c => (c.loop ? 'L' : '') + c.n).join(' · ')) })}</p>`;
    else h += `<p>${t('op.struct', { k: F.safeEnd, c: ltr(F.struct.map(c => (c.loop ? 'L' : '') + c.n).join(' · ')), l: longs, d: dots, s: sum, p: t(sum % 2 ? 'op.odd' : 'op.even'), w: t(sum % 2 ? 'op.second' : 'op.first') })}${loops ? ' ' + t('op.loopNote') : ''}</p>`;
  } else if (i === 0) h += `<p>${t('op.value' + s.n)}</p>`;
  if (i >= L.moves.length && res) h += `<p><b>${res}</b></p>`;
  return h;
}
function moverAt(L, i) { const G = E.geom(L.s.n, L.s.n), p = new E.Pos(G); let turn = 0; for (let j = 0; j < i; j++) { const k = p.play(L.moves[j]); if (!k) turn ^= 1; } return turn; }
function studyPage(d) { const L = lesson; if (!L || !L.study) return; const li = L.li + d; if (li < 0 || li >= L.s.lines.length) return; if (L.timer) clearInterval(L.timer); startStudy(L.si, li); }
async function studyBack() { const L = lesson; endLesson(); await openOpenings(L ? L.si : undefined); if (L) openOpDetail(L.si, L.li, L.cur); }
// ---- drill: play one side of the line; the other side is played automatically
function startDrill(si, li, color) {
  const s = OPN.sets[si], l = s.lines[li];
  endPuzzle(true); if (lesson) { if (lesson.timer) clearInterval(lesson.timer); lesson = null; }
  enterSetup(null, s.n);
  $('#lessonOverlay').classList.remove('show');
  lesson = { drill: true, si, li, s, l, moves: decE(l.moves), color, k: 0, miss: 0, mine: 0, alt: 0, answered: true, done: false, last: null };
  document.body.classList.add('in-lesson');
  game = { n: s.n, moves: [], human: color, setup: null }; builtFor = ''; aids = null;
  refresh(false); drillRender(); drillStep();
}
async function drillStep() {
  const L = lesson;
  while (L === lesson && L.k < L.l.drill) {
    if (S.turn === L.color) { L.answered = false; refresh(false); drillRender(); return; }
    L.answered = true; drillRender();
    await sleepV(settings.anim ? 550 : 200); if (L !== lesson) return;
    game.moves.push(L.moves[L.k]); L.k++; playLine(); refresh(true);
  }
  if (L !== lesson) return;
  L.done = true; L.answered = true; refresh(false); drillRender();
  if (L.mine) playChime(L.miss === 0 ? 1 : 0);
  if (L.miss === 0 && L.mine) { const pr = openProg(); pr[L.s.id + ':' + L.l.id] = 1; lsSet(OSTORE, pr); }
}
function drillAnswer(e) {
  const L = lesson; if (L.answered || L.done) return;
  const want = L.moves[L.k], vs = new Map(L.l.vals[L.k] ? decV(L.l.vals[L.k]) : []);
  const best = vs.size ? Math.max(...vs.values()) : null;
  L.mine++; aids = null;
  if (e === want) { L.last = { ok: 1 }; game.moves.push(e); L.k++; playLine(); refresh(true); drillStep(); return; }
  L.answered = true;
  const v = vs.get(e);
  if (L.l.full[L.k] && v !== undefined && v === best) {   // another optimal move: accepted, the line continues with the book move
    L.alt++; L.last = { alt: 1, e, want }; hintEdge = want; renderBoard(false); drillRender();
  } else {
    L.miss++; L.last = { miss: 1, e, want, v, best }; hintEdge = want; badEdge = e; renderBoard(false); playWrong(); drillRender();
  }
  setTimeout(() => { if (lesson !== L) return; hintEdge = -1; badEdge = -1; game.moves.push(want); L.k++; playLine(); refresh(true); drillStep(); }, 1500);
}
function drillHint() {
  const L = lesson; if (!L || L.answered || L.done) return;
  if (L.hinted !== L.k) { L.hinted = L.k; L.miss++; }
  hintEdge = L.moves[L.k]; renderBoard(false);
  $('#lsFb').innerHTML = `💡 ${t('op.drillHint')}`;
}
function drillRender() {
  const L = lesson, s = L.s;
  $('#lsStep').textContent = `${t('op.drill')} · ${t(L.color === 0 ? 'op.first' : 'op.second')}`;
  $('#lsTitle').textContent = t('op.L.' + L.l.id);
  $('#lsDots').innerHTML = '';
  const shown = L.moves.slice(0, L.k).map((e, i) => `${i + 1}.${edgeNameN(s.n, e)}`).join(' ') + (L.done ? '' : ` <b>${L.k + 1}.?</b>`);
  let h = `<div class="op-seq" dir="ltr">${shown}</div>`;
  if (!L.done) h += `<p>${t(L.answered ? 'op.drillWait' : 'op.drillYour', { c: t(L.color === 0 ? 'op.first' : 'op.second') })}</p>`;
  $('#lsPrompt').innerHTML = h;
  let fb = '';
  const x = L.last;
  if (x && x.miss) fb = `<b class="ng">${t('op.drillMiss', { m: ltr(edgeNameN(s.n, x.e)), a: ltr(edgeNameN(s.n, x.want)) })}</b>` + (x.v !== undefined && x.best !== null ? ' ' + t('op.drillLoss', { n: (x.best - x.v) / 2 }) : '');
  else if (x && x.alt) fb = `<b class="ok">${t('op.drillAlt', { m: ltr(edgeNameN(s.n, x.e)), a: ltr(edgeNameN(s.n, x.want)) })}</b>`;
  else if (x && x.ok) fb = `<b class="ok">${t('op.drillOk')}</b>`;
  if (L.done) fb = (L.miss === 0 ? `<b class="ok">${t('op.drillPerfect', { n: L.mine })}</b>` : `<b class="ng">${t('op.drillDone', { n: L.mine, m: L.miss })}</b>`) + (L.alt ? ' ' + t('op.drillAlts', { n: L.alt }) : '') + `<br>${escH(t('op.N.' + L.l.id))}`;
  $('#lsFb').innerHTML = fb;
  $('#lsNext').style.display = L.done ? '' : 'none'; $('#lsNext').textContent = t('op.again'); $('#lsNext').disabled = false;
  $('#lsHint').textContent = t('ls.hint'); $('#lsHint').disabled = L.answered || L.done;
}

// ======================================================================== puzzles (詰めドット)
// Records: dots-puzzles-v2, key cat-lv-k (the puzzle's place in its data file). Value = stars, encoded so that the
// cloud sync's max() merge keeps the best: 1 = ★★★ (also every record of the old solved/unsolved format), 0.5 = ★★, 0.25 = ★.
function pzProg() {
  let p = lsGet(PSTORE2, null);
  if (!p) {   // migrate the old 45-puzzle progress through the index's legacy table
    p = {}; const old = lsGet(PSTORE, {});
    if (PZI && PZI.legacy) for (const [li, k, cat, lv, k2] of PZI.legacy) if (old[li + '-' + k]) p[cat + '-' + lv + '-' + k2] = 1;
    if (Object.keys(old).length) lsSet(PSTORE2, p);
  }
  return p;
}
const pzKey = (cat, lv, k) => cat + '-' + lv + '-' + k;
const pzStars = x => x === true || x >= 1 ? 3 : x >= 0.5 ? 2 : x > 0 ? 1 : 0;
const pzEnc = s => s >= 3 ? 1 : s === 2 ? 0.5 : s === 1 ? 0.25 : 0;
const pzC = id => PZI.cats.find(c => c.id === id);
// order: the theme's puzzles easy -> hard (estimated with the solver, see puzzles/index.json "order")
const pzOrder = C => C.order || C.counts.flatMap((c, lv) => Array.from({ length: c }, (_, k) => [lv, k]));
function pzRecs(C, prog) { prog = prog || pzProg(); return pzOrder(C).map(([lv, k]) => pzStars(prog[pzKey(C.id, lv, k)])); }
const PZ_GROUPS = [['T', ['take', 'double', 'longchain', 'loop', 'sacrifice', 'count']], ['R', ['real3', 'real4', 'real5']]];
function pzTier(C) { if (!C.diff) return 0; const m = C.diff.reduce((a, b) => a + b, 0) / C.diff.length; return Math.max(0, Math.min(5, Math.round((m - 5.6) / 0.9))); }
// collection home (the layout of 詰めオセロ, PZBook.home): hero → daily → tabs テーマ別 / 実戦 → theme cards with the position
const PZ_LAST = 'dots-pz-last', PZ_TAB = 'dots-pztab-v1';
const PZ_SVG = {
  take: '<path d="M3 6h18v12H3zM9 6v12M15 6v12"/><path d="M5 12h13.5M16 9.5l2.5 2.5-2.5 2.5"/>',
  double: '<path d="M3 7h18v10H3zM12 7v10"/><path d="M5.5 10l3 4M8.5 10l-3 4M15.5 10l3 4M18.5 10l-3 4"/>',
  longchain: '<rect x="2.5" y="8.5" width="11" height="7" rx="3.5"/><rect x="10.5" y="8.5" width="11" height="7" rx="3.5"/>',
  loop: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v16M4 12h16"/>',
  sacrifice: '<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7C10 3 6 4 8 7M12 7c2-4 6-3 4 0"/>',
  count: '<path d="M18 5H6l6 7-6 7h12"/>',
};
const pzBadge = id => PZ_SVG[id] ? `<svg viewBox="0 0 24 24" aria-hidden="true">${PZ_SVG[id]}</svg>` : `<b class="gl">${PZ_ICON[id] || '◆'}</b>`;
// Puzzles replaced on 2026-10-21 (fun refresh, tools/refresh_fun.js): the data file keeps the previous one in
// old["lv-k"]. A player who already had a record for the slot when this version first ran keeps the old puzzle
// (snapshot in PKEEP), and dailies up to index.json "cut" keep theirs; everyone else gets the new one.
function pzKeep() {
  if (!PZI || !PZI.cut) return [];
  let s = lsGet(PKEEP, null);
  if (!s || s.cut !== PZI.cut) { const prog = pzProg(); s = { cut: PZI.cut, keys: (PZI.rep || []).filter(k => prog[k] !== undefined && prog[k] !== null) }; lsSet(PKEEP, s); }
  return s.keys;
}
function pzQ(id, lv, k, daily) {
  const D = PZC[id], q = D && D.levels[lv] && D.levels[lv][k], o = D && D.old && D.old[lv + '-' + k];
  if (o && ((daily && daily <= PZI.cut) || pzKeep().includes(pzKey(id, lv, k)))) return o;
  return q;
}
function pzThumbAt(C, j, daily) {
  const o = pzOrder(C)[j], q = o && pzQ(C.id, o[0], o[1], daily);
  if (!q) return ''; try { return miniSVG(figFromProblem(decodePz(q))); } catch (e) { return ''; }
}
async function openPuzzles() {
  await Promise.all([pzIndexLoad(), textReady()]); selTabL('puzzle');
  if (!PZI) { toast(t('pz.fail2')); return; }
  PZBook.setLang(LANG);
  const prog = pzProg(), dl = dailyPick(), di = dailyInfo();
  const grp = id => (PZ_GROUPS.find(g => g[1].includes(id)) || PZ_GROUPS[0])[0];
  const cats = PZ_GROUPS.map(g => g[0]);
  let cur = lsGet(PZ_TAB, cats[0]); if (!cats.includes(cur)) cur = cats[0];
  const ids = PZ_GROUPS.flatMap(g => g[1]).filter(id => pzC(id)), shown = ids.filter(id => grp(id) === cur);
  await Promise.all(shown.concat(dl ? [dl.cat] : []).map(pzCatLoad));
  const cont = PZBook.resume(ids.map(id => ({ key: id, recs: pzRecs(pzC(id), prog), cat: grp(id) })), PZ_LAST);
  const box = $('#pzLevels'); box.className = 'pz-home';
  box.innerHTML = PZBook.home({
    title: t('pz.title'), lead: t('pz.desc2'), all: ids.map(id => pzRecs(pzC(id), prog)),
    cont: cont && { key: cont.key + ':' + cont.j, no: cont.j + 1, name: t('pc.' + cont.key + '.t') },
    daily: dl ? [{ key: '1', board: pzThumbAt(pzC(dl.cat), dl.j, dl.date), title: '★ ' + t('daily.title'), date: dl.date.slice(5).replace('-', '/'), done: di.today, go: t('daily.go'),
      sub: `${t('pc.' + dl.cat + '.t')} · ${PZBook.t('stage', { n: Math.floor(dl.j / PZBook.STAGE) + 1 })} · No.${dl.j + 1} · 🔥 ${t('daily.streak', { n: di.streak })}${di.best > 1 ? ' · ' + t('daily.best', { n: di.best }) : ''}` }] : [],
    cats: cats.map(g => { const r = ids.filter(id => grp(id) === g).map(id => pzRecs(pzC(id), prog)).flat(); return { key: g, icon: PZBook.icon(g === 'T' ? 'theme' : 'grid'), name: t('pz.grp' + g), done: r.filter(x => x > 0).length, total: r.length }; }),
    cur, catDesc: t('pz.grp' + cur + 'Sub'),
    cards: shown.map(id => { const C = pzC(id), r = pzRecs(C, prog), j = PZBook.nextIndex(r); return { key: id, board: pzThumbAt(C, j >= 0 ? j : r.length - 1), badge: pzBadge(id), name: t('pc.' + id + '.t'), desc: t('pc.' + id + '.d'), recs: r, tier: pzTier(C) }; }),
  });
  PZBook.bindHome(box, {
    cat: k => { lsSet(PZ_TAB, k); openPuzzles(); },
    cont: v => { const [id, j] = v.split(':'); $('#puzzleOverlay').classList.remove('show'); startPuzzle(id, +j); },
    daily: () => { const d = dailyPick(); if (!d) return; $('#puzzleOverlay').classList.remove('show'); startPuzzle(d.cat, d.j, d.date); },
    card: id => openPzCat(id),
  });
  $('#pzListView').classList.remove('hidden'); $('#pzGridView').classList.add('hidden');
  $('#puzzleOverlay').classList.add('show');
}
const PZ_ICON = { take: '✋', double: '✌', longchain: '⛓', loop: '◯', sacrifice: '🎁', count: '∑', real3: '3', real4: '4', real5: '5' };
let pzCat = null;
async function openPzCat(id, cur) {
  await Promise.all([pzIndexLoad(), textReady()]);
  const C = pzC(id); if (!C) return;
  pzCat = id; PZBook.setLang(LANG);
  $('#pzLevelHead').innerHTML = PZBook.ghead({ badge: pzBadge(id), name: t('pc.' + id + '.t'), desc: t('pc.' + id + '.d'), chips: [t('pz.grp' + (PZ_GROUPS.find(g => g[1].includes(id)) || PZ_GROUPS[0])[0]), PZBook.t('count', { n: pzOrder(C).length })], tier: pzTier(C) });
  $('#pzGrid').innerHTML = `<p class="pz-catdesc">${t('pc.' + id + '.long')} <span class="pz-ord">${escH(t('pz.orderNote'))}</span></p>` + PZBook.grid({ recs: pzRecs(C), cur });
  // each tile shows its position (a small board) under the number and stars
  const D = await pzCatLoad(id), ord = pzOrder(C);
  if (D && pzCat === id) $('#pzGrid').querySelectorAll('.pb-tile[data-j]').forEach(el => {
    const o = ord[+el.dataset.j], q = o && pzQ(id, o[0], o[1]); if (!q) return;
    try { el.insertAdjacentHTML('afterbegin', `<span class="th">${miniSVG(figFromProblem(decodePz(q)))}</span>`); } catch (e) {}
  });
  $('#pzListView').classList.add('hidden'); $('#pzGridView').classList.remove('hidden');
  $('#puzzleOverlay').classList.add('show');
  const m = $('#puzzleOverlay .modal'); m.scrollTop = 0;
  if (cur !== undefined) { const b = $(`#pzGrid .pb-tile[data-j="${cur}"]`); if (b) m.scrollTop = Math.max(0, b.offsetTop - m.clientHeight / 2); }
}
function decodePz(q) { return { n: q.n, edges: decE(q.e), owners: decO(q.o), values: decV(q.v), target: q.t, tag: q.g }; }
async function startPuzzle(cat, j, daily, keep) {
  const d = await pzCatLoad(cat); await pzIndexLoad(); if (!d || !PZI) return;
  const C = pzC(cat), [lv, k] = pzOrder(C)[j];
  endLesson(true);
  pzKeep();   // take the keep-old snapshot before this play can add a record
  const pz = decodePz(pzQ(cat, lv, k, daily));
  pz.best = pz.values.reduce((a, b) => b[1] > a[1] ? b : a)[0];
  enterSetup({ edges: pz.edges, owners: pz.owners }, pz.n);
  if (!daily) PZBook.lastSet(PZ_LAST, cat);
  puzzle = Object.assign({ cat, j, lv, k, pz, state: 'play', waiting: false, first: true, dev: null, total: 0, daily: daily || null, hinted: false, failed: false, answered: false }, keep || {});
  document.body.classList.add('in-puzzle');
  refresh(false);
  puzzle.total = S.p.undrawn;
  renderPuzzleCard(t('pz.start'));
}
function renderPuzzleCard(status) {
  const P = puzzle; if (!P) return;
  const C = pzC(P.cat), n = pzOrder(C).length;
  PZBook.setLang(LANG);
  $('#pzStep').textContent = (P.daily ? `★ ${t('daily.title')} ${P.daily.slice(5).replace('-', '/')} · ` : '') + `${t('pc.' + P.cat + '.t')} · ${PZBook.t('stage', { n: Math.floor(P.j / PZBook.STAGE) + 1 })} · No.${P.j + 1}`;
  $('#pzTitle').textContent = t('pz.title');
  $('#pzGoal').innerHTML = t('pz.goal', { a: P.pz.target[0], b: P.pz.target[1] });
  if (status !== undefined) $('#pzStatus').innerHTML = status;
  $('#pzNext').disabled = !!P.daily || P.j + 1 >= n || !PZBook.isOpen(pzRecs(C), P.j + 1);
  $('#pzHint').disabled = P.state !== 'play';
}
function puzzleFail(e, v, bestE, why) {
  const P = puzzle; P.state = 'fail'; P.failed = true;
  const fin = finalFromValue(v);
  hintEdge = bestE; badEdge = e; renderBoard(false); playWrong();
  PZBook.setLang(LANG);
  renderPuzzleCard(`<b class="ng">${why ? escH(PZBook.t('blunder')) : t('pz.fail')}</b> ${why ? t('pz.bl.' + why) + ' ' : ''}${t('pz.failWhy', { m: ltr(edgeName(e)), a: fin[0], b: fin[1] })}`);
  renderInfo();
}
// Puzzle v2 (common spec): a wrong line does not end the puzzle at once. The opponent (exact solver, Lv8) keeps answering
// and the puzzle is played to the end of the game — its "move count" is every line left on the board — and then the final
// score is judged against the target. Reaching it anyway counts as solved, with ★★ (as after a retry).
// An OBVIOUS mistake fails at once (shown with PZBook 'blunder'):
//   take — a box with three sides was there to take and taking was (one of) the solver's best moves, but the line drawn
//          completes no box. Declining on purpose (the double-dealing move that leaves the last two boxes of a chain)
//          is not flagged when it is a best move, since only moves worse than the best can be mistakes.
//   give — nothing to take, the line drawn hands boxes over (draws a box's third side) while a safe line existed and a
//          safe line was the solver's best move.
// Any other move worse than the best only marks the puzzle as off the solution line (P.dev) and play goes on.
function pzBlunderKind(p, e, vals, best) {
  if (p.completes(e) > 0) return '';
  const caps = p.legal().filter(f => p.completes(f) > 0);
  if (caps.length) return caps.some(f => vals.get(f) === best) ? 'take' : '';
  if (p.gives(e) > 0 && safeEdges(p).some(f => vals.get(f) === best)) return 'give';
  return '';
}
// could this move be an obvious mistake at all? (after leaving the line, the solver is only asked for those)
function pzBlunderCand(p, e) { return p.completes(e) === 0 && (p.hasCapture() || (p.gives(e) > 0 && safeEdges(p).length > 0)); }
async function puzzleHumanMove(e) {
  const P = puzzle; if (P.state !== 'play' || P.waiting) return;
  const p = S.p;
  let vals = null;
  if (P.first) vals = new Map(P.pz.values);
  else if (!P.dev || pzBlunderCand(p, e)) {
    P.waiting = true; renderInfo();
    const tok = busy;
    const r = await askAna('solve', 8000);
    if (tok !== busy || puzzle !== P) return;
    P.waiting = false;
    if (r.list) vals = new Map(r.list.map(x => [x.m, x.v]));
  }
  if (vals && vals.has(e)) {
    let best = -Infinity, bestE = -1; for (const [m, v] of vals) if (v > best) { best = v; bestE = m; }
    if (P.first) bestE = P.pz.best;
    const v = vals.get(e);
    if (v < best) {
      const why = pzBlunderKind(p, e, vals, best);
      if (why) { puzzleFail(e, v, bestE, why); return; }
      if (!P.dev) { P.dev = { e, best: bestE }; P.failed = true; }
    }
  }
  P.first = false;
  applyMove(e, true);
  if (S.over) return puzzleDone();
  renderPuzzleCard(P.dev ? pzDevText() : `<b class="ok">${t('pz.good')}</b>`);
  puzzleAfterMove();
}
function pzDevText(extra) { PZBook.setLang(LANG); return `${t('pz.dev')} <b>${escH(PZBook.t('movesLeft', { n: S.p.undrawn }))}</b>` + (extra ? ' ' + extra : ''); }
function puzzleAfterMove() {
  const P = puzzle; if (!P) return;
  if (S.over) return puzzleDone();
  if (P.state === 'answer') return answerStep();
  if (S.turn === 1) { renderPuzzleCard(P.dev ? pzDevText(t('pz.opp')) : t('pz.opp')); aiTurn(); }
  else if (!P.first) renderPuzzleCard(P.dev ? pzDevText(t('yourTurn')) : `<b class="ok">${t('pz.good')}</b> ${t('yourTurn')}`);
}
function puzzleDone() {
  const P = puzzle; if (!P) return;
  if (P.state === 'answer') { renderPuzzleCard(t('pz.answerDone') + '<br>' + t('pz.final', { a: S.scores[0], b: S.scores[1] })); P.state = 'done'; return; }
  if (S.scores[0] < P.pz.target[0]) {   // the whole game was played and the target score was not reached
    P.state = 'fail'; P.failed = true; playWrong(); PZBook.setLang(LANG);
    const d = P.dev ? ' ' + t('pz.devWas', { m: ltr(edgeNameN(P.pz.n, P.dev.e)), b: ltr(edgeNameN(P.pz.n, P.dev.best)) }) : '';
    renderPuzzleCard(`<b class="ng">${t('pz.fail')}</b> ${escH(PZBook.t('outOfMoves', { n: P.total }))} ${t('pz.final', { a: S.scores[0], b: S.scores[1] })}${d}`);
    renderInfo(); return;
  }
  P.state = 'solved';
  const C = pzC(P.cat), prog = pzProg(), key = pzKey(P.cat, P.lv, P.k), stars = PZBook.starsFor(P);
  const before = pzRecs(C, prog);
  prog[key] = pzEnc(Math.max(pzStars(prog[key]), stars)); lsSet(PSTORE2, prog);
  const after = pzRecs(C, prog), ev = PZBook.events(before, after, P.j);
  if (P.daily) dailySolved(P.daily, P.hinted || P.failed);
  PZBook.setLang(LANG);
  playChime(1); coach(t('pz.solved'), 'gold', 1800);
  confettiL(); if (ev.length) setTimeout(confettiL, 650);
  renderPuzzleCard(`<b class="ok">${t('pz.solved')}</b> ${t('pz.final', { a: S.scores[0], b: S.scores[1] })}` + (P.daily ? `<br>🔥 ${t('daily.streak', { n: dailyInfo().streak })}` : '') + PZBook.solved({ stars, recs: after, j: P.j, events: ev }));
  renderInfo();
}
function answerStep() {
  const P = puzzle; if (!P || P.state !== 'answer') return;
  if (S.over) return puzzleDone();
  const tok = busy;
  if (document.hidden) { waitVis().then(() => { if (tok === busy && puzzle === P) answerStep(); }); return; }   // pause the answer playback in a background tab
  if (game.moves.length === 0) { setTimeout(() => { if (tok !== busy) return; applyMove(P.pz.best, true); answerStep(); }, 500); return; }
  aiPending = true; renderInfo();
  askAI(8).then(r => { if (tok !== busy) return; setTimeout(() => { if (tok !== busy) return; aiPending = false; applyMove(r.move, true); answerStep(); }, 420); });
}
function endPuzzle(silent) {
  if (!puzzle) return;
  puzzle = null; document.body.classList.remove('in-puzzle');
  if (!silent) restoreGame();
}
const PZ_TAG = { take: 'take', double: 'decline', longchain: 'parity', loop: 'loop', sacrifice: 'sacrifice', hard: 'hard', count: 'order', plan: 'plan' };
// two bursts of confetti over the board (puzzle solved; a second one for stage clear / medal / unlock / complete)
function confettiL() {
  if (false /* site rule: animations are never skipped for the OS reduce-motion setting */) return;
  const cv = document.createElement('canvas'), dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  cv.className = 'confetti-l'; cv.width = W * dpr; cv.height = H * dpr; document.body.appendChild(cv);
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const cols = ['#f2c060', '#6fd3a0', '#7aa2ff', '#ff8fa8', '#e9e2c8', '#f28a6c', '#6db3ee'];
  const ps = Array.from({ length: 110 }, () => ({ x: W * (0.2 + Math.random() * 0.6), y: H * 0.35, vx: (Math.random() - 0.5) * 9, vy: -6 - Math.random() * 8, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4, w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, c: cols[Math.floor(Math.random() * cols.length)] }));
  const t0 = performance.now();
  const step = now => {
    const k = (now - t0) / 1700; g.clearRect(0, 0, W, H);
    if (k >= 1) { cv.remove(); return; }
    g.globalAlpha = Math.min(1, (1 - k) * 2.2);
    for (const p of ps) { p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore(); }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------- daily puzzle: from all themes
const DAILY_STORE = 'dots-daily-v1';
let daily = { last: '', streak: 0, best: 0, days: {} };
try { Object.assign(daily, JSON.parse(localStorage.getItem(DAILY_STORE) || '{}')); } catch (e) {}
// reload the daily record after a cloud sync replaced it in localStorage
function dailyReload() { daily = { last: '', streak: 0, best: 0, days: {} }; try { Object.assign(daily, JSON.parse(localStorage.getItem(DAILY_STORE) || '{}')); } catch (e) {} }
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Mon–Tue: the easy third of a theme, Wed–Thu: the middle third, Fri–Sun: the hard third; the theme rotates with the day
function dailyPick() {
  if (!PZI) return null;
  const now = new Date(), date = ymd(now);
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
  const wd = (now.getDay() + 6) % 7;
  const part = wd <= 1 ? 0 : wd <= 3 ? 1 : 2;
  let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15;
  const C = PZI.cats[(day * 7 + (h & 3)) % PZI.cats.length], n = pzOrder(C).length;
  const a = Math.floor(n * part / 3), b = Math.floor(n * (part + 1) / 3);
  return { date, cat: C.id, j: a + (h >>> 3) % Math.max(1, b - a), wd };
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

// ======================================================================== post-game coach review (振り返り解説)
// Shown under the review summary: a short story of the game (when the safe lines ran out, the chains and the long-chain
// count, the turning point and a tip), or, while a move is on the board, why that move was good or bad.
let crTextAsked = false;
function rvCoach() {
  if (typeof rv === 'undefined' || !rv || rv.running || rv.key !== game.moves.join(',')) return '';
  if (t('r.after') === 'r.after') { if (!crTextAsked) { crTextAsked = true; textReady().then(() => renderReview()); } return ''; }
  const n = game.n, G = E.geom(n, n), moves = game.moves, at = i => { const p = new E.Pos(G); for (let k = 0; k < i; k++) p.play(moves[k]); return p; };
  let h = `<div class="cr-box"><div class="cr-h">${escH(t('cr.title'))}</div>`;
  if (viewPly !== null && viewPly < moves.length) {
    const i = viewPly, j = rvJudge(i), e = moves[i];
    h += `<p class="cr-mv"><b>${escH(t('cr.move', { n: i + 1, who: shortName(rv.mover[i]) }))} ${ltr(edgeName(e))}</b>${j ? ` <span class="tag ${j.q}">${escH(t('q.' + j.q))}</span>` : ''}</p>`;
    if (!j) h += `<p>${escH(t(rv.items[i] && rv.items[i].skip ? 'cr.forced' : 'cr.noData'))}</p>`;
    else if (j.loss < 0.5) h += `<p>${escH(t('cr.same'))}</p>`;
    else {
      h += `<p>${t('cr.best', { b: ltr(edgeName(j.it.bestMove)), l: (j.exact ? '' : '≈') + fmtLoss(j) })}</p>`;
      if (j.exact) { const why = reasonL(at(i), e, j.it.bestMove, j.it.played, j.it.best); if (why) h += `<p class="cr-why">${why}</p>`; }
      h += `<p class="cr-tip">💡 ${escH(t('cr.tip.' + crKind(at(i), e, j.it.bestMove)))}</p>`;
    }
    return h + '</div>';
  }
  // the story of the whole game
  const out = [];
  const p = new E.Pos(G); let turn = 0, safeEnd = -1, struct = null, toMove = 0;
  for (let i = 0; i < moves.length; i++) {
    if (safeEnd < 0 && !safeEdges(p).length && !p.hasCapture()) { safeEnd = i; struct = E.components(p, true); toMove = turn; }
    if (!p.play(moves[i])) turn ^= 1;
  }
  if (struct) {
    const c = ltr(struct.map(x => (x.loop ? 'L' : '') + x.n).join(' · ')), longs = struct.filter(x => !x.loop && x.n >= 3).length;
    out.push(t('cr.safeEnd', { k: safeEnd + 1, c, who: shortName(toMove) }));
    const dots = (n + 1) * (n + 1), s = dots + longs;
    if (longs) out.push(t('cr.long', { l: longs, d: dots, s, p: t(s % 2 ? 'op.odd' : 'op.even'), w: shortName(s % 2 ? 1 : 0) }));
    else out.push(t('cr.noLong'));
  }
  let worst = null;
  for (let i = 0; i < moves.length; i++) {
    const j = rvJudge(i); if (!j || j.loss < 0.5) continue;
    if (settings.mode === 'ai' && rv.mover[i] !== game.human) continue;
    if (!worst || j.loss > worst.j.loss) worst = { i, j };
  }
  if (worst) {
    const { i, j } = worst;
    out.push(t('cr.turn', { n: i + 1, m: ltr(edgeName(moves[i])), who: shortName(rv.mover[i]), b: ltr(edgeName(j.it.bestMove)), l: (j.exact ? '' : '≈') + fmtLoss(j) }) + ` <button class="cr-go" data-i="${i}">${escH(t('cr.show'))}</button>`);
    out.push('💡 ' + escH(t('cr.tip.' + crKind(at(i), moves[i], j.it.bestMove))));
  } else out.push(escH(t('cr.clean')));
  return h + `<ul class="cr-list">${out.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
}
// what kind of mistake: gave boxes while safe lines were left / wrong take-or-decline / chain parity / endgame order
function crKind(p, e, b) {
  if (p.hasCapture()) { const cm = E.captureMoves(p); if (cm && cm.forced === undefined) return 'decline'; }
  const safe = safeEdges(p).length;
  if (safe && p.gives(e) > 0 && p.completes(e) === 0 && p.gives(b) === 0) return 'gave';
  if (safe) return 'parity';
  return 'order';
}

// ======================================================================== wiring (called once by the main script)
function learnInit() {
  document.querySelectorAll('.ls-tabs').forEach(g => g.addEventListener('click', e => { const b = e.target.closest('button'); if (b) tabClick(b.dataset.v); }));
  // views and buttons added by the learning UI
  $('#lessonOverlay .modal').insertAdjacentHTML('beforeend', '<div id="opDetailView" class="hidden"></div>');
  $('#btnLessonBack').dataset.i18n = 'ls.list'; $('#btnLessonBack').textContent = t('ls.list');
  $('#lsQuit').insertAdjacentHTML('beforebegin', '<button id="lsList" data-i18n="ls.list"></button>');
  $('#pzQuit').insertAdjacentHTML('beforebegin', '<button id="pzList" data-i18n="pz.list"></button>');
  $('#lsList').textContent = t('ls.list'); $('#pzList').textContent = t('pz.list');
  $('#lessonList').addEventListener('click', e => {
    const st = e.target.closest('[data-opt]'); if (st) { openOpenings(st.dataset.opt === 'basic' ? 'basic' : +st.dataset.opt); return; }
    const dr = e.target.closest('.op-card button[data-li]'); if (dr) { startDrill(+opTab, +dr.dataset.li, +dr.dataset.c); return; }
    const oc = e.target.closest('.op-card'); if (oc) { openOpDetail(+opTab, +oc.dataset.oc); return; }
    const cb = e.target.closest('[data-course]'); if (cb) { openLessons(cb.dataset.course); return; }
    const b = e.target.closest('.lx-card, .lesson-item'); if (!b) return;
    if (b.dataset.rules) openRules(0); else if (b.dataset.i !== undefined) openIntroL(+b.dataset.i);
  });
  $('#lessonList').addEventListener('keydown', e => { const oc = e.target.closest && e.target.closest('.op-card'); if (oc && e.target === oc && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openOpDetail(+opTab, +oc.dataset.oc); } });
  $('#opDetailView').addEventListener('click', e => {
    const L = OD; if (!L) return;
    const g = e.target.closest('[data-odpg]'); if (g) { if (!g.disabled) openOpDetail(L.si, L.li + +g.dataset.odpg); return; }
    const nv = e.target.closest('[data-odn]'); if (nv) { opDetailNav(nv.dataset.odn); return; }
    const sq = e.target.closest('[data-ods]'); if (sq) { opDetailNav(sq.dataset.ods); return; }
    const dr = e.target.closest('[data-odr]'); if (dr) { opDetailStop(); startDrill(L.si, L.li, +dr.dataset.odr); return; }
    if (e.target.closest('#odBack')) { opDetailStop(); openOpenings(L.si); return; }
    if (e.target.closest('#odBoardPlay')) { opDetailStop(); startStudy(L.si, L.li, L.cur || undefined); return; }
  });
  $('#opDetailView').addEventListener('change', e => { if (e.target.id === 'odOpt' && OD) { OD.showOpt = e.target.checked; opDetailRender(); } });
  // ← → one move, ↓ ↑ first / last: the opening detail view and the opening study on the board
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tg = e.target; if (tg && ((tg.tagName === 'INPUT' && tg.type !== 'checkbox') || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
    const k = { ArrowLeft: 'prev', ArrowRight: 'next', ArrowUp: 'last', ArrowDown: 'first' }[e.key]; if (!k) return;
    if ($('#lessonOverlay').classList.contains('show') && !$('#opDetailView').classList.contains('hidden')) { e.preventDefault(); opDetailNav(k); return; }
    if (lesson && lesson.study && !document.querySelector('.overlay.show')) { e.preventDefault(); studyNav(k); }
  });
  $('#btnLessonClose').onclick = () => closeLessonOverlay();
  $('#btnLessonBack').onclick = () => { $('#btnLessonStart').classList.remove('hidden'); lessonSrc === 'open' ? openOpenings() : openLessons(L2 && L2.steps[introI] && L2.steps[introI].course); };
  $('#btnLessonStart').onclick = () => { closeLessonOverlay(); startLessonL(introI); };
  $('#btnLessonQuit2').onclick = () => { closeLessonOverlay(); endLesson(); };
  $('#btnLessonRetry').onclick = () => { closeLessonOverlay(); startLessonL(lesson ? lesson.i : introI); };
  $('#btnLessonNextStep').onclick = () => { const i = (lesson ? lesson.i : introI) + 1; endLesson(true); if (i < L2.steps.length) openIntroL(i); else { closeLessonOverlay(); restoreGame(); } };
  $('#lessonCard').addEventListener('click', e => {
    if (!lesson || !lesson.study) return;
    const a = e.target.closest('[data-sply]'); if (a) { studyNav(a.dataset.sply); return; }
    const n = e.target.closest('[data-snav]'); if (n) { studyNav(n.dataset.snav); return; }
    const d = e.target.closest('[data-sdr]'); if (d) { startDrill(lesson.si, lesson.li, +d.dataset.sdr); return; }
    const g = e.target.closest('[data-spg]'); if (g && !g.disabled) { studyPage(+g.dataset.spg); return; }
  });
  $('#lessonCard').addEventListener('change', e => { if (e.target.id === 'opOpt' && lesson && lesson.study) { lesson.showOpt = e.target.checked; studyShow(); } });
  $('#lsHint').onclick = lessonHint;
  $('#lsNext').onclick = lessonNext;
  $('#lsQuit').onclick = () => endLesson();
  $('#lsList').onclick = () => { const L = lesson; endLesson(); if (L && (L.study || L.drill)) openOpenings(L.si); else if (L) openLessons(L2 && L.i !== undefined && L2.steps[L.i] ? L2.steps[L.i].course : undefined).then(() => { if (L2 && L.i !== undefined) { const b = $(`#lessonList .lx-card[data-i="${L.i}"]`); if (b) b.scrollIntoView({ block: 'center' }); } }); };
  rulesWire();
  // puzzles
  $('#pzGrid').addEventListener('click', e => {
    const b = e.target.closest('button[data-j]'); if (!b) return;
    if (b.getAttribute('aria-disabled')) { toast(PZBook.t('locked')); return; }
    $('#puzzleOverlay').classList.remove('show'); startPuzzle(pzCat, +b.dataset.j);
  });
  $('#pzClose').onclick = () => $('#puzzleOverlay').classList.remove('show');
  $('#pzBack').onclick = () => openPuzzles();
  $('#btnPuzzle').onclick = () => openPuzzles();
  $('#btnLesson').onclick = () => openLessons();
  $('#pzRetry').onclick = () => { if (puzzle) { const P = puzzle; startPuzzle(P.cat, P.j, P.daily, { hinted: P.hinted, failed: P.failed || P.state !== 'play' || !P.first, answered: P.answered }); } };
  $('#pzAnswer').onclick = async () => {
    if (!puzzle) return;
    const P = puzzle; await startPuzzle(P.cat, P.j, P.daily, { hinted: true, failed: P.failed, answered: true }); puzzle.state = 'answer';
    hintEdge = puzzle.pz.best; renderBoard(false);
    renderPuzzleCard(t('pz.showing')); answerStep();
  };
  $('#pzHint').onclick = () => { if (!puzzle || puzzle.state !== 'play') return; puzzle.hinted = true; renderPuzzleCard(t('pz.hintText', { t: t('tag.' + (PZ_TAG[puzzle.pz.tag] || 'order')) })); };
  $('#pzNext').onclick = () => {
    if (!puzzle || puzzle.daily) return; const P = puzzle, C = pzC(P.cat);
    if (P.j + 1 < pzOrder(C).length && PZBook.isOpen(pzRecs(C), P.j + 1)) startPuzzle(P.cat, P.j + 1);
  };
  $('#pzQuit').onclick = () => endPuzzle();
  $('#pzList').onclick = () => { const P = puzzle; if (!P) return; endPuzzle(); if (P.daily) openPuzzles(); else openPzCat(P.cat, P.j); };
  $('#rvBody').addEventListener('click', e => { const b = e.target.closest('.cr-go'); if (b) { e.stopPropagation(); viewAt(+b.dataset.i); } });
  $('#btnRulesOffer').onclick = () => { $('#newOverlay').classList.remove('show'); openRules(0); };
  // warm up the current language's texts and the puzzle index (daily card)
  textReady(); pzIndexLoad();
}
// re-render whatever learning view is open after a language change
async function learnLangChanged() {
  await textReady();
  if ($('#lsList')) $('#lsList').textContent = t('ls.list');
  if ($('#pzList')) $('#pzList').textContent = t('pz.list');
  if (lesson) renderLessonCard();
  if (puzzle) renderPuzzleCard(t('pz.start'));
  const ov = $('#lessonOverlay');
  if (ov.classList.contains('show')) {
    if (!$('#rulesView').classList.contains('hidden')) rulesRender(true);
    else if (!$('#lessonListView').classList.contains('hidden')) (lessonSrc === 'open' ? openOpenings : openLessons)();
    else if (!$('#lessonIntroView').classList.contains('hidden')) openIntroL(introI);
    else if (!$('#opDetailView').classList.contains('hidden') && OD) opDetailRender(true);
  }
  if ($('#puzzleOverlay').classList.contains('show')) { if (!$('#pzGridView').classList.contains('hidden') && pzCat) openPzCat(pzCat); else openPuzzles(); }
}
function learnPlayerName(i) {
  if (lesson && (lesson.study || lesson.drill)) return t(i === 0 ? 'op.first' : 'op.second') + (lesson.drill && i === lesson.color ? ' (' + t('you') + ')' : '');
  return i === 0 ? t('you') : t('ai');
}
