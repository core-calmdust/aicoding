/* Dots & Boxes — learning features: rules tutorial, graded lessons, solver-verified openings (study + drill),
 * categorized puzzles (詰めドット) and the daily puzzle. Loaded before the main script; uses its globals at run time.
 * All positions and move values come from the exact solvers (see the repository notes); nothing here is heuristic. */
'use strict';
const LV = '?v=20261019c';
const LSTORE2 = 'dots-lessons-v2', PSTORE2 = 'dots-puzzles-v2', OSTORE = 'dots-openings-v1', RSTORE = 'dots-rules-v1';
const K64L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const decE = s => [...s].map(c => K64L.indexOf(c));
const decO = s => [...s].map(c => c === '.' ? -1 : +c);
const decV = s => [...s].map((c, e) => c === '.' ? null : [e, K64L.indexOf(c) - 30]).filter(Boolean);
const lsGet = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleepL = ms => new Promise(r => setTimeout(r, ms));
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
function showLView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView', 'rulesView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
function swapOv(from, to, open) {
  const a = $(from), b = $(to);
  a.classList.add('instant'); b.classList.add('instant');
  if (from !== to) a.classList.remove('show');
  open();
  requestAnimationFrame(() => requestAnimationFrame(() => { a.classList.remove('instant'); b.classList.remove('instant'); }));
}
function tabClick(v) {
  const inPz = $('#puzzleOverlay').classList.contains('show');
  if (v === 'puzzle') { if (!inPz) swapOv('#lessonOverlay', '#puzzleOverlay', openPuzzles); return; }
  const go = v === 'rules' ? openRules : v === 'open' ? openOpenings : openLessons;
  swapOv(inPz ? '#puzzleOverlay' : '#lessonOverlay', '#lessonOverlay', go);
}

// ======================================================================== rules tutorial
// boards are R x C boxes; h(r,c) / v(r,c) give edge numbers
const hE = (R, C, r, c) => r * C + c, vE = (R, C, r, c) => (R + 1) * C + r * (C + 1) + c;
function boxEdges(R, C, r, c) { return [hE(R, C, r, c), hE(R, C, r + 1, c), vE(R, C, r, c), vE(R, C, r, c + 1)]; }
const RULES = [
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
function rulesPageInit() {
  const P = RULES[RU.i]; RU.timer && clearTimeout(RU.timer); RU.timer = 0;
  RU.st = null; if (!P.R) return;
  const by = {}; (P.setup || []).forEach(e => by[e] = 2);
  RU.st = { by, own: Object.assign({}, P.own || {}), turn: 0, score: [0, 0], done: false, msg: '', took: 0, hl: [], bad: [], newBox: [] };
}
function rulesRender(keepState) {
  const P = RULES[RU.i], n = RULES.length;
  if (!keepState) rulesPageInit();
  const done = lsGet(RSTORE, {});
  let h = `<div class="ru-steps">${RULES.map((x, j) => `<button data-ru="${j}" class="${j === RU.i ? 'cur' : ''} ${done[x.id] ? 'ok' : ''}" aria-label="${j + 1}">${j + 1}</button>`).join('')}</div>`;
  h += `<h2>${escH(t('ru.p' + P.id + '.t'))}</h2><div class="lesson-intro ru-body">${t('ru.p' + P.id + '.b')}</div>`;
  if (P.sizes) {
    h += `<div class="ru-sizes">${[3, 4, 5].map(k => `<figure>${miniSVG({ R: k, C: k })}<figcaption><b>${k} × ${k}</b><br>${escH(t('ru.size', { d: (k + 1) * (k + 1), e: 2 * k * (k + 1), b: k * k }))}</figcaption></figure>`).join('')}</div>`;
  } else if (P.finish) {
    h += `<div class="ru-finish"><button class="mbtn go" id="ruPlay">${escH(t('ru.play'))}</button><button class="mbtn go" id="ruLessons">${escH(t('ru.toLessons'))}</button></div>`;
  } else {
    h += `<div class="ru-board" id="ruBoard"></div><div class="ru-task" id="ruTask"></div>`;
  }
  h += `<div class="modal-actions"><button class="mbtn" id="ruPrev" ${RU.i === 0 ? 'disabled' : ''}>${escH(t('ru.prev'))}</button><button class="mbtn" id="ruClose">${escH(t('close'))}</button><button class="mbtn go" id="ruNext" ${RU.i === n - 1 ? 'disabled' : ''}>${escH(t('ru.next'))}</button></div>`;
  $('#rulesBody').innerHTML = h;
  if (P.R) { rulesDraw(); if (P.anim) rulesAnim(); else rulesTaskText(); }
  if (P.sizes || P.finish) rulesMark(P.id);
}
function rulesMark(id) { const d = lsGet(RSTORE, {}); if (!d[id]) { d[id] = 1; lsSet(RSTORE, d); const b = document.querySelector(`.ru-steps button[data-ru="${RU.i}"]`); if (b) b.classList.add('ok'); } }
function rulesDraw() {
  const P = RULES[RU.i], st = RU.st, G = E.geom(P.R, P.C);
  const p = E.Pos.from(G, Object.keys(st.by).map(Number));
  const cap3 = []; for (let b = 0; b < G.B; b++) if (p.cnt[b] === 3 && P.task !== 'any') cap3.push(b);
  const num = {}; if (st.plus) for (const b of st.plus) num[b] = '+1';
  $('#ruBoard').innerHTML = miniSVG({ R: P.R, C: P.C, by: st.by, own: st.own, hl: st.hl, bad: st.bad, cap3, last: st.last, click: !st.done && !st.wait, num, newBox: st.newBox });
}
function rulesTaskText(extra) {
  const P = RULES[RU.i], st = RU.st;
  let h = `<span class="ru-q">👉 ${t('ru.p' + P.id + '.task')}</span>`;
  if (st.msg) h += `<div class="ru-msg ${st.msgCls || ''}">${st.msg}</div>`;
  if (st.done) h += `<button class="ru-again" id="ruAgain">↺ ${escH(t('ru.again'))}</button>`;
  $('#ruTask').innerHTML = h + (extra || '');
}
// play a scripted sequence on the mini board, then hand over to the task
async function rulesAnim() {
  const P = RULES[RU.i], st = RU.st, my = RU, G = E.geom(P.R, P.C);
  st.wait = true; rulesDraw(); rulesTaskText(`<div class="ru-msg">${escH(t('ru.watch'))}</div>`);
  await sleepL(500);
  for (const [e, pl] of P.anim) {
    if (RU !== my || RULES[RU.i] !== P || !RU.st || RU.st !== st) return;
    const p = E.Pos.from(G, Object.keys(st.by).map(Number));
    const k = p.play(e); st.by[e] = pl; st.last = e;
    st.newBox = [];
    if (k) for (const b of [G.eb0[e], G.eb1[e]]) if (b >= 0 && p.cnt[b] === 4 && st.own[b] === undefined) { st.own[b] = pl; st.score[pl]++; st.newBox.push(b); }
    playLine(); if (k) { chainCount = 0; playBox(k); }
    rulesDraw();
    await sleepL(settings.anim ? 750 : 350);
  }
  if (RU !== my || RU.st !== st) return;
  st.wait = false;
  if (P.task === 'end') {   // finished game: show the final count, then offer replay
    st.done = true; st.msg = t('ru.p5.ok', { a: Object.values(st.own).filter(o => o === 0).length, b: Object.values(st.own).filter(o => o === 1).length }); st.msgCls = 'ok';
    rulesMark(P.id); rulesDraw(); rulesTaskText(); return;
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
        const my = st;
        RU.timer = setTimeout(async () => {
          if (!RU || RU.st !== my) return;
          for (let b = 0; b < G.B; b++) if (p.cnt[b] === 3) { const f = p.missing(b, -1); p.play(f); my.by[f] = 1; my.last = f; for (const bb of [G.eb0[f], G.eb1[f]]) if (bb >= 0 && p.cnt[bb] === 4 && my.own[bb] === undefined) my.own[bb] = 1; playLine(); playBox(1); rulesDraw(); await sleepL(500); b = -1; }
          setTimeout(() => { if (RU && RU.st === my) rulesRender(); }, 1500);
        }, 900);
        return;
      }
      st.by[e] = 0; st.last = e; playLine();
      st.done = true; st.msg = t('ru.p4.ok'); st.msgCls = 'ok'; rulesMark(P.id); break;
    }
  }
  rulesDraw(); rulesTaskText();
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
  // hover preview on the mini board
  $('#rulesBody').addEventListener('pointerover', e => { const h = e.target.closest('.mb-hit'); if (h) h.classList.add('hov'); });
  $('#rulesBody').addEventListener('pointerout', e => { const h = e.target.closest('.mb-hit'); if (h) h.classList.remove('hov'); });
}
function closeLessonOverlay() { if (RU && RU.timer) clearTimeout(RU.timer); $('#lessonOverlay').classList.remove('show'); }

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
async function openLessons() {
  await Promise.all([lessonsLoad(), textReady()]); lessonSrc = 'lesson'; selTabL('lesson');
  if (!L2) { toast(t('ls.fail')); return; }
  $('#lsListTitle').textContent = t('ls.title'); $('#lsListDesc').innerHTML = t('ls.desc2');
  const prog = lessonProg(); let course = '';
  const ruDone = Object.keys(lsGet(RSTORE, {})).length;
  let h = `<button class="lesson-item ru-item" data-rules="1"><span class="no">📖</span><span class="tx"><b>${escH(t('ru.title'))}</b><small>${escH(t('ru.short'))}</small></span><span class="st ${ruDone >= RULES.length ? 'clear' : ''}">${ruDone >= RULES.length ? '✓' : ruDone + '/' + RULES.length}</span></button>`;
  L2.steps.forEach((s, i) => {
    if (s.course !== course) { course = s.course; h += `<p class="ls-course"><b>${escH(t('course.' + course))}</b><small>${escH(t('course.' + course + '.sub'))}</small></p>`; }
    const pr = prog[s.id];
    const st = pr ? `<span class="st ${pr.clear ? 'clear' : ''}">${pr.clear ? t('ls.clear') + ' ✓ ' : ''}${t('u.pt', { n: pr.best })}</span>` : `<span class="st">${t('ls.notyet')}</span>`;
    h += `<button class="lesson-item" data-i="${i}"><span class="no">${i + 1}</span><span class="tx"><b>${escH(t('ls.' + s.id + '.t'))}</b><small>${escH(t('ls.' + s.id + '.d'))}</small></span>${st}</button>`;
  });
  $('#lessonList').innerHTML = h;
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
async function openOpenings() {
  await Promise.all([openLoad(), textReady()]); lessonSrc = 'open'; selTabL('open');
  if (!OPN) { toast(t('ls.fail')); return; }
  $('#lsListTitle').textContent = t('op.title'); $('#lsListDesc').innerHTML = t('op.desc');
  const prog = openProg();
  $('#lessonList').innerHTML = OPN.sets.map((s, i) => {
    const done = s.lines.filter(l => prog[s.id + ':' + l.id]).length;
    return `<button class="lesson-item" data-op="${i}"><span class="no">${s.n}×${s.n}</span><span class="tx"><b>${escH(t('op.' + s.id + '.t'))}</b><small>${escH(t('op.' + s.id + '.short'))}</small><span class="op-lines">${s.lines.slice(0, 4).map(l => escH(t('op.L.' + l.id))).join(' · ')}${s.lines.length > 4 ? ' …' : ''}</span></span><span class="st ${done === s.lines.length ? 'clear' : ''}">${t('op.drilled', { n: done, t: s.lines.length })}</span></button>`;
  }).join('') + `<p class="op-credit">${t('op.credit')}</p>`;
  showLView('lessonListView'); $('#lessonOverlay').classList.add('show');
}
const mvSeq = (n, moves) => moves.map((e, i) => `<i>${i + 1}</i>${edgeNameN(n, e)}`).join(' ');
function edgeNameN(n, e) { const G = E.geom(n, n), [r1, c1, r2] = G.ed[e]; return letters[c1] + (r1 + 1) + (r1 === r2 ? '–' : '|'); }
let opSet = 0;
function openSetIntro(si) {
  opSet = si; lessonSrc = 'open'; introI = si;
  const s = OPN.sets[si], prog = openProg();
  $('#liStep').textContent = t('tab.open') + ' · ' + s.n + '×' + s.n;
  $('#liTitle').textContent = t('op.' + s.id + '.t');
  let h = tA('op.' + s.id + '.intro').map(x => `<p>${x}</p>`).join('');
  h += `<p class="note">${t('op.studyNote')}</p><div class="op-book">`;
  s.lines.forEach((l, li) => {
    const moves = decE(l.moves);
    const dr = l.side === 0 || l.side === undefined || l.side < 0 ? [0] : [];
    const sides = l.side === -1 ? [0, 1] : [l.side];
    h += `<div class="ob" data-ob="${li}"><div class="ob-h"><span class="nm">${escH(t('op.L.' + l.id))}</span>${prog[s.id + ':' + l.id] ? '<span class="ob-ok">✓</span>' : ''}<span class="op-dr">${sides.map(c => `<button data-li="${li}" data-c="${c}">${c === 0 ? '● ' + t('op.drillF') : '○ ' + t('op.drillS')}</button>`).join('')}</span></div><div class="mv" dir="ltr">${mvSeq(s.n, moves.slice(0, l.drill))}</div><div class="ob-info">${escH(t('op.N.' + l.id))}</div></div>`;
  });
  h += '</div>';
  $('#liBody').innerHTML = h;
  $('#btnLessonStart').classList.add('hidden');
  showLView('lessonIntroView'); $('#lessonOverlay').classList.add('show'); $('#lessonOverlay .modal').scrollTop = 0;
}
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
    L.timer = setInterval(() => { if (lesson !== L || L.cur >= last) { clearInterval(L.timer); L.timer = 0; if (lesson === L) studyRender(); return; } L.cur++; playLine(); studyShow(true); }, settings.anim ? 800 : 420);
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
function studyNote() {
  const L = lesson, s = L.s, l = L.l, F = L.facts, i = L.cur;
  let h = `<div class="op-info">${escH(t('op.N.' + l.id))}</div>`;
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
async function studyBack() { const si = lesson ? lesson.si : opSet; endLesson(); await openOpenings(); openSetIntro(si); }
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
    await sleepL(settings.anim ? 550 : 200); if (L !== lesson) return;
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
function lvName(C, lv) { return C.size ? t('pz.diff')[lv] : `${lv + 3}×${lv + 3}`; }
async function openPuzzles() {
  await Promise.all([pzIndexLoad(), textReady()]); selTabL('puzzle');
  if (!PZI) { toast(t('pz.fail2')); return; }
  const prog = pzProg();
  const dl = dailyPick(), di = dailyInfo();
  const total = PZI.cats.reduce((a, c) => a + c.counts.reduce((x, y) => x + y, 0), 0);
  const solvedAll = Object.keys(prog).length;
  let h = dl ? `<button class="lesson-item daily" data-daily="1"><span class="no">★</span><span class="tx"><b>${t('daily.title')} <span style="color:var(--dim);font-weight:400">${dl.date.slice(5).replace('-', '/')}</span></b><small>${escH(t('pc.' + dl.cat + '.t'))} · ${escH(lvName(PZI.cats.find(c => c.id === dl.cat), dl.lv))} · ${t('daily.streak', { n: di.streak })}${di.best > 1 ? ' · ' + t('daily.best', { n: di.best }) : ''}</small></span><span class="st ${di.today ? 'clear' : ''}">${di.today ? '✓' : t('daily.go')}</span></button>` : '';
  h += `<p class="pz-total">${t('pz.totalSolved', { n: solvedAll, t: total })}</p>`;
  h += PZI.cats.map(C => {
    const tot = C.counts.reduce((a, b) => a + b, 0);
    let sv = 0; C.counts.forEach((c, lv) => { for (let k = 0; k < c; k++) if (prog[pzKey(C.id, lv, k)]) sv++; });
    return `<button class="lesson-item pz-cat" data-cat="${C.id}"><span class="no">${PZ_ICON[C.id] || '◆'}</span><span class="tx"><b>${escH(t('pc.' + C.id + '.t'))}</b><small>${escH(t('pc.' + C.id + '.d'))}</small><span class="pz-bar"><i style="width:${tot ? sv / tot * 100 : 0}%"></i></span></span><span class="st ${sv === tot ? 'clear' : ''}">${t('pz.solvedCount', { n: sv, t: tot })}</span></button>`;
  }).join('');
  $('#pzLevels').innerHTML = h;
  $('#pzListView').classList.remove('hidden'); $('#pzGridView').classList.add('hidden');
  $('#puzzleOverlay').classList.add('show');
}
const PZ_ICON = { take: '✋', double: '✌', longchain: '⛓', loop: '◯', sacrifice: '🎁', count: '∑', real3: '3', real4: '4', real5: '5' };
let pzCat = null;
async function openPzCat(id) {
  const d = await pzCatLoad(id); if (!d) { toast(t('pz.fail2')); return; }
  pzCat = id;
  const C = PZI.cats.find(c => c.id === id), prog = pzProg();
  $('#pzLevelTitle').textContent = t('pc.' + id + '.t');
  let h = `<p class="pz-catdesc">${t('pc.' + id + '.long')}</p>`;
  d.levels.forEach((lv, li) => {
    const sv = lv.filter((_, k) => prog[pzKey(id, li, k)]).length;
    h += `<div class="pz-lv"><div class="pz-lvh"><b>${t('pz.level', { n: li + 1 })} · ${escH(lvName(C, li))}</b><span class="${sv === lv.length ? 'clear' : ''}">${t('pz.solvedCount', { n: sv, t: lv.length })}</span></div><div class="pz-grid">${lv.map((_, k) => `<button data-lv="${li}" data-k="${k}" class="${prog[pzKey(id, li, k)] ? 'solved' : ''}">${k + 1}</button>`).join('')}</div></div>`;
  });
  $('#pzGrid').innerHTML = h;
  $('#pzListView').classList.add('hidden'); $('#pzGridView').classList.remove('hidden');
  $('#puzzleOverlay .modal').scrollTop = 0;
}
function decodePz(q) { return { n: q.n, edges: decE(q.e), owners: decO(q.o), values: decV(q.v), target: q.t, tag: q.g }; }
async function startPuzzle(cat, lv, k, daily) {
  const d = await pzCatLoad(cat); if (!d) return;
  endLesson(true);
  const pz = decodePz(d.levels[lv][k]);
  pz.best = pz.values.reduce((a, b) => b[1] > a[1] ? b : a)[0];
  enterSetup({ edges: pz.edges, owners: pz.owners }, pz.n);
  puzzle = { cat, lv, k, pz, state: 'play', waiting: false, first: true, daily: daily || null, hint: false };
  document.body.classList.add('in-puzzle');
  refresh(false);
  renderPuzzleCard(t('pz.start'));
}
function renderPuzzleCard(status) {
  const P = puzzle; if (!P) return;
  const C = PZI.cats.find(c => c.id === P.cat);
  $('#pzStep').textContent = (P.daily ? `★ ${t('daily.title')} ${P.daily.slice(5).replace('-', '/')} · ` : '') + `${t('pc.' + P.cat + '.t')} · ${lvName(C, P.lv)} · ${t('pz.num', { k: P.k + 1 })}`;
  $('#pzTitle').textContent = t('pz.title');
  $('#pzGoal').innerHTML = t('pz.goal', { a: P.pz.target[0], b: P.pz.target[1] });
  if (status !== undefined) $('#pzStatus').innerHTML = status;
  const d = PZC[P.cat];
  $('#pzNext').disabled = !d || (P.k + 1 >= d.levels[P.lv].length && P.lv + 1 >= d.levels.length);
}
function puzzleFail(e, v, bestE) {
  const P = puzzle; P.state = 'fail';
  const fin = finalFromValue(v);
  hintEdge = bestE; badEdge = e; renderBoard(false); playWrong();
  renderPuzzleCard(`<b class="ng">${t('pz.fail')}</b> ${t('pz.failWhy', { m: ltr(edgeName(e)), a: fin[0], b: fin[1] })}`);
}
async function puzzleHumanMove(e) {
  const P = puzzle; if (P.state !== 'play' || P.waiting) return;
  let v, best, bestE;
  if (P.first) { const vals = new Map(P.pz.values); v = vals.get(e); best = Math.max(...P.pz.values.map(x => x[1])); bestE = P.pz.best; }
  else {
    P.waiting = true; renderInfo();
    const tok = busy;
    const r = await askAna('solve', 8000);
    if (tok !== busy || puzzle !== P) return;
    P.waiting = false;
    if (!r.list) { v = 0; best = 0; }
    else { const m = new Map(r.list.map(x => [x.m, x.v])); v = m.get(e); best = Math.max(...r.list.map(x => x.v)); bestE = r.list.find(x => x.v === best).m; }
  }
  if (v < best) { puzzleFail(e, v, bestE); return; }
  P.first = false;
  applyMove(e, true);
  if (S.over) return puzzleDone();
  renderPuzzleCard(`<b class="ok">${t('pz.good')}</b>`);
  puzzleAfterMove();
}
function puzzleAfterMove() {
  const P = puzzle; if (!P) return;
  if (S.over) return puzzleDone();
  if (P.state === 'answer') return answerStep();
  if (S.turn === 1) { renderPuzzleCard(t('pz.opp')); aiTurn(); }
  else if (!P.first) renderPuzzleCard(`<b class="ok">${t('pz.good')}</b> ${t('yourTurn')}`);
}
function puzzleDone() {
  const P = puzzle; if (!P) return;
  if (P.state === 'answer') { renderPuzzleCard(t('pz.answerDone') + '<br>' + t('pz.final', { a: S.scores[0], b: S.scores[1] })); P.state = 'done'; return; }
  P.state = 'solved';
  const prog = pzProg(); prog[pzKey(P.cat, P.lv, P.k)] = 1; lsSet(PSTORE2, prog);
  if (P.daily) dailySolved(P.daily, P.hint);
  playChime(1); coach(t('pz.solved'), 'gold', 1800);
  renderPuzzleCard(`<b class="ok">${t('pz.solved')}</b> ${t('pz.final', { a: S.scores[0], b: S.scores[1] })}` + (P.daily ? `<br>★ ${t('daily.streak', { n: dailyInfo().streak })}` : ''));
}
function answerStep() {
  const P = puzzle; if (!P || P.state !== 'answer') return;
  if (S.over) return puzzleDone();
  const tok = busy;
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

// ---------------------------------------------------------------- daily puzzle: from all categories
const DAILY_STORE = 'dots-daily-v1';
let daily = { last: '', streak: 0, best: 0, days: {} };
try { Object.assign(daily, JSON.parse(localStorage.getItem(DAILY_STORE) || '{}')); } catch (e) {}
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Mon–Tue: level 1 (3×3 / beginner), Wed–Thu: level 2, Fri–Sun: level 3; the category rotates with the day
function dailyPick() {
  if (!PZI) return null;
  const now = new Date(), date = ymd(now);
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
  const wd = (now.getDay() + 6) % 7;
  const lv = wd <= 1 ? 0 : wd <= 3 ? 1 : 2;
  let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15;
  const C = PZI.cats[(day * 7 + (h & 3)) % PZI.cats.length];
  const cnt = C.counts[lv];
  return { date, cat: C.id, lv, k: (h >>> 3) % cnt, wd };
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

// ======================================================================== wiring (called once by the main script)
function learnInit() {
  document.querySelectorAll('.ls-tabs').forEach(g => g.addEventListener('click', e => { const b = e.target.closest('button'); if (b) tabClick(b.dataset.v); }));
  $('#lessonList').addEventListener('click', e => {
    const b = e.target.closest('.lesson-item'); if (!b) return;
    if (b.dataset.rules) openRules(0); else if (b.dataset.op !== undefined) openSetIntro(+b.dataset.op); else openIntroL(+b.dataset.i);
  });
  $('#btnLessonClose').onclick = () => closeLessonOverlay();
  $('#btnLessonBack').onclick = () => { $('#btnLessonStart').classList.remove('hidden'); lessonSrc === 'open' ? openOpenings() : openLessons(); };
  $('#btnLessonStart').onclick = () => { closeLessonOverlay(); startLessonL(introI); };
  $('#btnLessonQuit2').onclick = () => { closeLessonOverlay(); endLesson(); };
  $('#btnLessonRetry').onclick = () => { closeLessonOverlay(); startLessonL(lesson ? lesson.i : introI); };
  $('#btnLessonNextStep').onclick = () => { const i = (lesson ? lesson.i : introI) + 1; endLesson(true); if (i < L2.steps.length) openIntroL(i); else { closeLessonOverlay(); restoreGame(); } };
  $('#liBody').addEventListener('click', e => {
    const b = e.target.closest('button[data-li]'); if (b) { startDrill(opSet, +b.dataset.li, +b.dataset.c); return; }
    const o = e.target.closest('.ob[data-ob]'); if (o) startStudy(opSet, +o.dataset.ob);
  });
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
  $('#lsQuit').onclick = () => { const L = lesson; endLesson(); if (L && (L.study || L.drill)) { openOpenings().then(() => openSetIntro(L.si)); } };
  rulesWire();
  // puzzles
  $('#pzLevels').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.daily) { const d = dailyPick(); $('#puzzleOverlay').classList.remove('show'); startPuzzle(d.cat, d.lv, d.k, d.date); }
    else if (b.dataset.cat) openPzCat(b.dataset.cat);
  });
  $('#pzGrid').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; $('#puzzleOverlay').classList.remove('show'); startPuzzle(pzCat, +b.dataset.lv, +b.dataset.k); });
  $('#pzClose').onclick = () => $('#puzzleOverlay').classList.remove('show');
  $('#pzBack').onclick = () => openPuzzles();
  $('#btnPuzzle').onclick = openPuzzles;
  $('#btnLesson').onclick = openLessons;
  $('#pzRetry').onclick = () => { if (puzzle) { const P = puzzle, h = P.hint; startPuzzle(P.cat, P.lv, P.k, P.daily).then(() => { if (puzzle) puzzle.hint = h; }); } };
  $('#pzAnswer').onclick = async () => {
    if (!puzzle) return;
    const P = puzzle; await startPuzzle(P.cat, P.lv, P.k, P.daily); puzzle.state = 'answer'; puzzle.hint = true;
    hintEdge = puzzle.pz.best; renderBoard(false);
    renderPuzzleCard(t('pz.showing')); answerStep();
  };
  $('#pzHint').onclick = () => { if (!puzzle) return; puzzle.hint = true; renderPuzzleCard(t('pz.hintText', { t: t('tag.' + (PZ_TAG[puzzle.pz.tag] || 'order')) })); };
  $('#pzNext').onclick = () => {
    if (!puzzle) return; const P = puzzle, d = PZC[P.cat];
    if (P.k + 1 < d.levels[P.lv].length) startPuzzle(P.cat, P.lv, P.k + 1);
    else if (P.lv + 1 < d.levels.length) startPuzzle(P.cat, P.lv + 1, 0);
  };
  $('#pzQuit').onclick = () => endPuzzle();
  $('#btnRulesOffer').onclick = () => { $('#newOverlay').classList.remove('show'); openRules(0); };
  // warm up the current language's texts and the puzzle index (daily card)
  textReady(); pzIndexLoad();
}
// re-render whatever learning view is open after a language change
async function learnLangChanged() {
  await textReady();
  if (lesson) renderLessonCard();
  if (puzzle) renderPuzzleCard(t('pz.start'));
  const ov = $('#lessonOverlay');
  if (ov.classList.contains('show')) {
    if (!$('#rulesView').classList.contains('hidden')) rulesRender(true);
    else if (!$('#lessonListView').classList.contains('hidden')) (lessonSrc === 'open' ? openOpenings : openLessons)();
    else if (!$('#lessonIntroView').classList.contains('hidden')) (lessonSrc === 'open' ? openSetIntro : openIntroL)(introI);
  }
  if ($('#puzzleOverlay').classList.contains('show')) { if (!$('#pzGridView').classList.contains('hidden') && pzCat) openPzCat(pzCat); else openPuzzles(); }
}
function learnPlayerName(i) {
  if (lesson && (lesson.study || lesson.drill)) return t(i === 0 ? 'op.first' : 'op.second') + (lesson.drill && i === lesson.color ? ' (' + t('you') + ')' : '');
  return i === 0 ? t('you') : t('ai');
}
