// Backgammon V2 — 定跡 (opening book): the 15 opening rolls and the key second-roll replies, every play checked by the
// engine (2-ply wildbg hybrid + truncated rollouts, see openings.json). Same layout as the other games' opening pages:
// list (category tabs → banner → item cards) → item page (the lines as cards) → study on the board (step through, ▶ autoplay)
// or drill (通し稽古: play the opening / the replies yourself, the engine's best within a small tolerance counts as correct).
// Loaded after app.js (shares its globals: lesson, turn, view, render, …).
'use strict';
let OPB = null;
const opReady = fetch('openings.json?v=20261021op').then(r => r.json()).then(d => (OPB = d)).catch(() => null);
const OP_STORE = STORE + '-open', OP_TAB = STORE + '-optab';
function opProg() { try { return JSON.parse(localStorage.getItem(OP_STORE) || '{}'); } catch (e) { return {}; } }
function opSave(p) { try { localStorage.setItem(OP_STORE, JSON.stringify(p)); } catch (e) {} }
let opCat = (() => { try { return localStorage.getItem(OP_TAB) || ''; } catch (e) { return ''; } })();
let opItemId = '';           // item shown on the item page
let opView = '';             // 'list' | 'item' while the dialog shows the openings
const OPE = (e, sg) => (e >= 0 ? '+' : '−') + Math.abs(e).toFixed(3);
const opSide = (r, os) => r === 0 ? os : 1 - os;   // relative side (0 opener, 1 replier) -> board side
// ---------------------------------------------------------------- data helpers
function opItem(id) { return OPB && OPB.items[id]; }
function opPlays(it, ln) { return (ln && ln.plays) || it.plays; }
// one decision's plays: [m, e2, ply, ro, se] -> {m, e (final value), e2, ro, se}; the final value is the rollout when the
// play was rolled out, else 2-ply (only the rolled-out plays can be "correct")
function opRank(plays) {
  return plays.map(x => ({ m: x[0], e2: x[1], ply: x[2], ro: x[3], se: x[4], e: x[3] != null ? x[3] : x[1] }));
}
function opBest(plays) { const r = opRank(plays).filter(x => x.ro != null); return r.length ? r.reduce((a, b) => (b.e > a.e ? b : a)) : opRank(plays)[0]; }
// the decision of a line: index in seq of the move the learner makes
function opDecIdx(it, ln) { return it.kind === 'open' ? 0 : ln.seq.length - 1; }
function opNt(p, side, m) { return BG.notation(decMoves(p, side, m).moves); }
// line positions: start position and the position after each step of seq (moves relative to the side that plays them)
function opWalk(seq, os) {
  let p = BG.initial(); const out = [];
  for (const st of seq) { const s = opSide(st.r, os), d = decMoves(p, s, st.m); out.push({ s, d: st.d, m: st.m, moves: d.moves, before: p, after: d.pos }); p = d.pos; }
  return out;
}
const opDice = d => `<bdi class="opd">${d[0]}${d[1]}</bdi>`;
function opSeqText(it, ln, os) {
  const w = opWalk(ln.seq, os);
  return w.map(x => `<span class="ops"><span class="pdisc p${x.s}"></span>${opDice(x.d)} ${mvb(BG.notation(x.moves))}</span>`).join('<span class="opa">→</span>');
}
// a line's name and aim: hand-written keys when present, else built from the move's features (tags)
function opTagText(tg, short) {
  if (!tg) return '';
  const P = a => a.join(t('op.and'));
  const parts = [];
  if (tg.enter) parts.push(t('op.tg.enter'));
  if (tg.hit && tg.hit.length) parts.push(t(short ? 'op.tg.hitS' : 'op.tg.hit', { p: P(tg.hit), q: P(tg.hit.map(x => 25 - x)) }));
  if (tg.make && tg.make.length) parts.push(t(short ? 'op.tg.makeS' : 'op.tg.make', { p: P(tg.make) }));
  if (tg.run) parts.push(t(short ? 'op.tg.runS' : 'op.tg.run', { p: tg.run }));
  if (tg.split) parts.push(t(short ? 'op.tg.splitS' : 'op.tg.split', { p: tg.split }));
  if (tg.slot && tg.slot.length) parts.push(t(short ? 'op.tg.slotS' : 'op.tg.slot', { p: P(tg.slot) }));
  if (tg.build && tg.build.length && (!short || !parts.length)) parts.push(t(short ? 'op.tg.buildS' : 'op.tg.build', { p: P(tg.build) }));
  if (!parts.length) parts.push(t('op.tg.quiet'));
  const r = short ? parts.slice(0, 2).join(' + ') : parts.join(t('op.sep'));
  return r.charAt(0).toLocaleUpperCase() + r.slice(1);
}
function opLineName(it, ln) {
  if (ln.nm) return t('op.nm.' + ln.nm);
  return opTagText(ln.tg, true);
}
function opLineAim(it, ln) {
  const k = 'op.l.' + it.id + '.' + ln.id;
  const v = t(k); return v !== k ? v : opTagText(ln.tg, false) + t('op.dot');
}
function opLineNote(it, ln) { const k = 'op.n.' + it.id + '.' + ln.id, v = t(k); return v !== k ? v : ''; }
// the item's title / key point / description (hand-written)
const opT = (it, f) => { const k = 'op.i.' + it.id + '.' + f, v = t(k); return v !== k ? v : ''; };
// evaluation numbers of a line's decision play
function opLineEval(it, ln) {
  const R = opRank(opPlays(it, ln)), b = opBest(opPlays(it, ln)), x = R.find(y => y.m === ln.m) || R[0];
  return { x, b, diff: x.e - b.e, best: x.m === b.m };
}
// ---------------------------------------------------------------- pictures
const OPI = {   // category icons (24×24, stroke)
  point: '<path d="M6 20 9 5l3 15M12 20l3-15 3 15"/><circle cx="9" cy="17" r="2.2"/><circle cx="9" cy="13" r="2.2"/>',
  slot: '<path d="M7 20l3-15 3 15"/><circle cx="10" cy="17" r="2.4"/><path d="M15 9h5M17.5 6.5v5" />',
  split: '<circle cx="6" cy="17" r="2.4"/><circle cx="17" cy="9" r="2.4"/><path d="M8 15l6.5-4.5" stroke-dasharray="2 2"/><path d="M14 8.5l1.5 1.5 1.5-1.5"/>',
  run: '<circle cx="6" cy="16" r="2.4"/><path d="M9 16h10M15 12l4 4-4 4"/>',
  reply: '<path d="M4 8h11l-3-3M20 16H9l3 3"/>',
  double: '<rect x="3.5" y="6" width="8" height="8" rx="1.8"/><rect x="12.5" y="10" width="8" height="8" rx="1.8"/><circle cx="7.5" cy="10" r="1" fill="currentColor"/><circle cx="16.5" cy="14" r="1" fill="currentColor"/>',
  hit: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
};
const opIcon = k => `<svg viewBox="0 0 24 24" class="opic">${OPI[k] || OPI.point}</svg>`;
// a mini board in the current skin / checker colours: the item's start position with the learner's dice and the play
function opThumb(it, ln, opts) {
  opts = opts || {};
  ln = ln || it.lines[0];
  const w = opWalk(ln.seq, 0), k = opDecIdx(it, ln), st = w[k];
  const sd = st.s;
  const arrows = [{ side: sd, moves: st.moves }];
  return bgThumb(st.before, sd, st.d, { arrows, marks: [] });
}
// ---------------------------------------------------------------- list
function opItemState(id, pr) {
  const r = (pr || opProg())[id];
  if (!r) return { done: false, p: 0, st: `<span class="lx-st new">${t('ls.notyet')}</span>` };
  if (r.pass) return { done: true, p: 1, st: `<span class="lx-st ok">✓ ${t('op.cleared')}</span>` };
  return { done: false, p: r.best || 0, st: `<span class="lx-st">${t('op.best', { n: Math.round((r.best || 0) * 100) })}</span>` };
}
async function openOpenings(cat) {
  await opReady; selTab('open');
  if (!OPB) { toast(t('ls.fail')); return; }
  const pr = opProg(), cats = OPB.cats;
  if (cat) { opCat = cat; try { localStorage.setItem(OP_TAB, cat); } catch (e) {} }
  const stat = c => ({ n: c.items.length, ok: c.items.filter(id => pr[id] && pr[id].pass).length });
  if (!cats.some(c => c.id === opCat)) opCat = (cats.find(c => { const q = stat(c); return q.ok < q.n; }) || cats[0]).id;
  const C = cats.find(c => c.id === opCat), q = stat(C);
  let no = 0;
  for (const c of cats) { if (c === C) break; no += c.items.length; }
  const cards = C.items.map((id, j) => {
    const it = opItem(id), s = opItemState(id, pr), ln = it.lines[0], ev = opLineEval(it, ln);
    return `<button class="lx-card op-card${s.done ? ' clear' : ''}" data-opi="${id}"><span class="lx-th">${opThumb(it, ln)}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">No.${no + j + 1}</span><span class="lx-bd" title="${esc(t('op.evTitle'))}">${t('op.ev')} ${OPE(ev.b.e)}</span>${s.st}</span>` +
      `<b class="lx-t">${opT(it, 't')}</b><small class="lx-sub">${opT(it, 'k')}</small><span class="lx-desc">${plainText(opT(it, 'd'))}</span>${lxBar(s.p, s.done ? 'ok' : '')}</span></button>`;
  }).join('');
  $('#lsH2').textContent = t('op.title');
  $('#lsDesc').textContent = t('op.desc', { n: Object.keys(OPB.items).length });
  const L = $('#lessonList'); L.dataset.mode = 'op';
  L.innerHTML = `<div class="lx">` +
    `<div class="lx-tabs many op-tabs" role="tablist">${cats.map(c => { const z = stat(c); return `<button role="tab" data-opc="${c.id}" class="${c.id === opCat ? 'sel' : ''}"><span class="ic">${opIcon(c.id)}</span><span class="nm">${t('op.catS.' + c.id) !== 'op.catS.' + c.id ? t('op.catS.' + c.id) : t('op.cat.' + c.id)}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join('')}</div>` +
    `<div class="lx-banner"><span class="ic">${opIcon(C.id)}</span><span class="tx"><b>${t('op.cat.' + C.id)}</b><small>${t('op.cat.' + C.id + '.d')}</small></span><span class="pg">${t('op.prog', { a: q.ok, b: q.n })}${lxBar(q.n ? q.ok / q.n : 0, 'ok')}</span></div>` +
    `<div class="lx-grid">${cards}</div><p class="lx-credit op-credit">${t('op.credit', { n: OPB.ro.N, t: OPB.ro.T, n2: OPB.roR.N })}</p></div>`;
  opView = 'list';
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
function opListClick(e) {
  const c = e.target.closest('[data-opc]'); if (c) { openOpenings(c.dataset.opc); $('#lessonOverlay .modal').scrollTop = 0; return true; }
  const b = e.target.closest('[data-opi]'); if (b) { openOpItem(b.dataset.opi); return true; }
  return false;
}
// ---------------------------------------------------------------- item page
function openOpItem(id) {
  const it = opItem(id); if (!it) return;
  opItemId = id; opView = 'item';
  const C = OPB.cats.find(c => c.items.includes(id)), idx = Object.keys(OPB.items).indexOf(id);
  $('#liStep').textContent = `${t('tab.open')} · ${t('op.cat.' + C.id)} · No.${idx + 1}`;
  $('#liTitle').textContent = opT(it, 't');
  const main = it.lines[0], w0 = opWalk(main.seq, 0), k0 = opDecIdx(it, main);
  const heroBoard = it.kind === 'open' ? bgThumb(w0[0].before, 0, it.d, {}) : bgThumb(w0[k0].before, w0[k0].s, null, { arrows: [{ side: w0[0].s, moves: w0[0].moves }] });
  const chips = it.lines.map((ln, i) => `<span>${i + 1}. ${it.kind === 'open' ? mvb(opNt(BG.initial(), 0, ln.m)) : it.dbl ? opDice(ln.seq[0].d) + ' ' + mvb(opNt(BG.initial(), 0, ln.seq[0].m)) : opDice(ln.seq[k0].d)}</span>`).join('');
  const side = it.kind === 'open' ? 0 : 1;
  let h = `<div class="op-hero"><span class="oh-b">${heroBoard}</span><div class="oh-t"><p class="op-lead">${opT(it, 'k')}</p><div class="oh-chips">${chips}</div>`
    + `<details class="op-more"><summary>${t('op.more')}</summary><p>${opT(it, 'd')}</p><p class="note">${t('op.drillNote', { tol: OPB.tol.toFixed(2) })}</p></details>`
    + `<div class="op-dr"><button data-odr="0"><span class="pdisc p0"></span>${t('op.drillAs', { c: pname(0) })}</button><button data-odr="1"><span class="pdisc p1"></span>${t('op.drillAs', { c: pname(1) })}</button></div>`
    + `<p class="op-role">${t(it.kind === 'open' ? 'op.roleOpen' : 'op.roleRep')}</p></div></div>`;
  h += `<div class="op-book">` + it.lines.map((ln, li) => {
    const w = opWalk(ln.seq, 0), k = opDecIdx(it, ln), st = w[k], ev = opLineEval(it, ln);
    const thumb = bgThumb(st.before, st.s, st.d, { arrows: [{ side: st.s, moves: st.moves }] });
    const badge = ev.best ? `<span class="ob-bd best">${t('op.bestBadge')}</span>` : `<span class="ob-bd">${t('op.diff', { d: (ev.diff).toFixed(3) })}</span>`;
    const num = `<div class="ob-ev">${t('op.e2')} <b>${OPE(ev.x.e2)}</b>${ev.x.ro != null ? ` · ${t('op.ro')} <b>${OPE(ev.x.ro)}</b> <small>±${(ev.x.se * 1.96).toFixed(3)}</small>` : ''}</div>`;
    return `<div class="ob" data-ob="${li}" title="${esc(t('op.studyTitle'))}"><span class="ob-th">${thumb}</span><div class="ob-c"><div class="ob-h"><span class="ob-no">${li + 1}</span><span class="nm">${opLineName(it, ln)}</span>${badge}</div>`
      + `<div class="mv">${opSeqText(it, ln, 0)}</div><div class="ob-aim">${opLineAim(it, ln)}</div>${num}</div></div>`;
  }).join('') + `</div>`;
  if (it.kind === 'open') h += opPlaysTable(it.plays, null, t('op.allPlays', { d: it.d.join('') }));
  $('#liBody').innerHTML = h;
  $('#btnLessonStart').textContent = t('op.drillStart');
  showLessonView('lessonIntroView'); showOverlay('#lessonOverlay');
  $('#lessonOverlay .modal').scrollTop = 0;
}
// table of the candidate plays of one decision (2-ply and rollout), the learner's play marked
function opPlaysTable(plays, mine, cap, side) {
  const R = opRank(plays), b = opBest(plays), p0 = BG.initial();
  const rows = R.filter(x => x.ply >= 2 || x.ro != null).slice(0, 8);
  if (mine && !rows.some(x => x.m === mine)) { const x = R.find(y => y.m === mine); if (x) rows.push(x); }
  const nt = m => (opPlaysTable.pos ? BG.notation(decMoves(opPlaysTable.pos, opPlaysTable.side, m).moves) : opNt(p0, 0, m));
  return `<details class="op-more op-pt"${opPlaysTable.open ? ' open' : ''}><summary>${cap}</summary><div class="plays-table op-table"><div class="th"><span>#</span><span>${t('op.play')}</span><span>${t('op.ro')}</span><span>${t('op.e2')}</span></div>${rows.map((x, i) => `<div class="${x.m === b.m ? 'best' : ''} ${x.m === mine ? 'mine' : ''}"><span>${R.indexOf(x) + 1}</span><span>${nt(x.m)}</span><span>${x.ro != null ? OPE(x.ro) : '—'}</span><span>${OPE(x.e2)}</span></div>`).join('')}</div><div class="op-tnote">${t('op.tableNote', { tol: OPB.tol.toFixed(2) })}</div></details>`;
}
$('#liBody').addEventListener('click', e => {
  if (opView !== 'item') return;
  const d = e.target.closest('[data-odr]'); if (d) { startOpDrill(opItemId, +d.dataset.odr); return; }
  const o = e.target.closest('.ob[data-ob]'); if (o) startOpStudy(opItemId, +o.dataset.ob);
});

// ---------------------------------------------------------------- study on the board
// steps: a roll (dice appear, the coming play drawn dashed) then each checker move; ← → one step, ▶ autoplay (1.2 s)
let opTimer = 0;
function opStop() { if (opTimer) { clearInterval(opTimer); opTimer = 0; } opSync(); }
function opStudySteps(it, ln, os) {
  const w = opWalk(ln.seq, os), steps = [];
  w.forEach((x, ti) => { steps.push({ t: 'roll', ti, s: x.s, d: x.d }); x.moves.forEach((c, j) => steps.push({ t: 'mv', ti, s: x.s, d: x.d, c, j })); });
  return { w, steps };
}
function startOpStudy(id, li, os) {
  const it = opItem(id); if (!it) return;
  hideOverlay('#lessonOverlay');
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle'); $('#toast').classList.remove('show');
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = -1; rvOpen = false; opStop();
  os = os || 0;
  const ln = it.lines[li], S = opStudySteps(it, ln, os);
  lesson = { op: 'study', it, li, ln, os, w: S.w, steps: S.steps, k: 0, answered: true, side: 0, minH: 0 };
  document.body.classList.add('in-lesson');
  const learner = opSide(it.kind === 'open' ? 0 : 1, os);
  setupProblem(BG.initial(), learner, [1, 2]); turn = null; lesson.posOverride = BG.initial(); view = learner;
  opShow(false);
  setTimeout(() => { if (lesson && lesson.op === 'study' && lesson.ln === ln && lesson.k === 0) opGo('auto'); }, 450);
}
// board state at step k
function opStateAt(L, k) {
  if (k <= 0) return { pos: BG.initial(), cur: null };
  const st = L.steps[k - 1], x = L.w[st.ti];
  const done = st.t === 'mv' ? x.moves.slice(0, st.j + 1) : [];
  const q = x.before.slice(); for (const c of done) BG.apply(q, x.s, BG.mvFrom(c), BG.mvTo(c));
  return { pos: q, cur: x, done };
}
function opApplyBoard(L, k) {
  const S = opStateAt(L, k);
  marks = []; previewPlay = null; extraArrows = [];
  if (!S.cur) { turn = null; lesson.posOverride = S.pos; return S; }
  const x = S.cur, dice = x.d, left = dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice.slice();
  for (const c of S.done) { const f = BG.mvFrom(c), to = BG.mvTo(c), dd = f === 25 ? 25 - to : f - to; let i = left.indexOf(dd); if (i < 0) i = left.findIndex(v => v > dd); if (i >= 0) left.splice(i, 1); }
  lesson.posOverride = null;
  turn = { side: x.s, dice, left, steps: S.done.map(c => ({ code: c, from: BG.mvFrom(c), to: BG.mvTo(c) })), pos: S.pos, start: x.before.slice(), locked: true, plays: [], op: 1 };
  const all = S.done.length === x.moves.length;
  extraArrows = [{ side: x.s, start: x.before, moves: x.moves, cls: all ? 'hint' : 'played' }];
  return S;
}
async function opShow(animate) {
  const L = lesson; if (!L || L.op !== 'study') return;
  const k = L.k, st = k > 0 ? L.steps[k - 1] : null;
  if (animate && st && st.t === 'mv') {
    // animate the checker from the previous step's board, then draw the new state
    opApplyBoard(L, k - 1); render();
    L.anim = true;
    await animStep(turn ? turn.pos : lesson.posOverride, st.s, BG.mvFrom(st.c), BG.mvTo(st.c));
    L.anim = false;
    if (lesson !== L || L.k !== k) return;
  } else if (animate && st && st.t === 'roll') SFX.dice();
  opApplyBoard(L, k); render(); renderInfo(); opStudyCard();
}
function opGo(what) {
  const L = lesson; if (!L || L.op !== 'study') return;
  const N = L.steps.length;
  if (what === 'auto') {
    if (opTimer) { opStop(); opStudyCard(); return; }
    if (L.k >= N) { L.k = 0; opShow(false); }
    opTimer = setInterval(() => { if (lesson !== L || L.op !== 'study' || L.k >= N) { opStop(); if (lesson === L) opStudyCard(); return; } if (L.anim) return; L.k++; opShow(true); if (L.k >= N) { opStop(); opStudyCard(); } }, 1200);
    opStudyCard(); return;
  }
  if (opTimer) opStop();
  const to = what === 'first' ? 0 : what === 'last' ? N : what === 'prev' ? L.k - 1 : what === 'next' ? L.k + 1 : +what;
  if (to < 0 || to > N || to === L.k) return;
  const one = to === L.k + 1; L.k = to; opShow(one);
}
function opStepLabel(L, i) {   // i: 1-based step
  const st = L.steps[i - 1];
  if (st.t === 'roll') return `<span class="pdisc p${st.s}"></span>${st.d[0]}${st.d[1]}`;
  return BG.notation([st.c]);
}
function opStudyCard() {
  const L = lesson; if (!L || L.op !== 'study') return;
  const it = L.it, ln = L.ln, N = L.steps.length, nL = it.lines.length;
  $('#lsStep').textContent = `${t('op.study')} · ${opT(it, 't')}`;
  $('#lsTitle').innerHTML = `<span class="st-pg"><button data-opg="-1" ${L.li <= 0 ? 'disabled' : ''} title="${esc(t('op.prevLine'))}">‹</button><span>${opLineName(it, ln)}</span><button data-opg="1" ${L.li >= nL - 1 ? 'disabled' : ''} title="${esc(t('op.nextLine'))}">›</button><small>${L.li + 1} / ${nL}</small></span>`;
  $('#lsDots').innerHTML = ''; $('#lsChoices').innerHTML = '';
  const seq = L.steps.map((s, i) => `<button data-osq="${i + 1}" class="${L.k === i + 1 ? 'cur' : ''}${s.t === 'roll' ? ' roll' : ''}">${opStepLabel(L, i + 1)}</button>`).join(' ');
  $('#lsPrompt').innerHTML = `<div class="op-seq" dir="ltr"><button data-osq="0" class="${L.k === 0 ? 'cur' : ''}">${t('op.start')}</button> ${seq}</div>`
    + `<div class="op-nav" dir="ltr"><button data-osn="first" title="${esc(t('nav.first'))}">⏮</button><button data-osn="prev" title="${esc(t('nav.prev'))}">◀</button><button data-osn="auto" class="${opTimer ? 'on' : ''}" title="${esc(t('op.auto'))}">${opTimer ? '⏸' : '▶'}</button><button data-osn="next" title="${esc(t('nav.next'))}">▶</button><button data-osn="last" title="${esc(t('nav.last'))}">⏭</button><span class="pos">${L.k} / ${N}</span></div>`;
  const ev = opLineEval(it, ln), note = opLineNote(it, ln), x = L.w[opDecIdx(it, ln)];
  let fb = `<div class="op-info op-cm"><div class="op-aim">${opLineAim(it, ln)}</div>`;
  // walkthrough commentary: what the current turn does (from the step's turn), the detailed note once the line is complete
  const cur = L.k > 0 ? L.w[L.steps[L.k - 1].ti] : null;
  if (cur) fb += `<p class="op-now"><span class="pdisc p${cur.s}"></span>${t('op.nowTurn', { c: pname(cur.s), d: cur.d.join(''), m: mvb(BG.notation(cur.moves)) })} ${opTagText(opTags(cur), false)}${t('op.dot')}</p>`;
  else fb += `<p class="op-now">${t('op.startNote', { c: pname(L.w[0].s), d: L.w[0].d.join('') })}</p>`;
  if (note && L.k >= N) fb += `<p class="op-note">${note}</p>`;
  else if (note) fb += `<details class="op-more"><summary>${t('op.detail')}</summary><p class="op-note">${note}</p></details>`;
  fb += `<div class="ob-ev">${ev.best ? `<span class="ob-bd best">${t('op.bestBadge')}</span>` : `<span class="ob-bd">${t('op.diff', { d: ev.diff.toFixed(3) })}</span>`} ${t('op.e2')} <b>${OPE(ev.x.e2)}</b>${ev.x.ro != null ? ` · ${t('op.ro')} <b>${OPE(ev.x.ro)}</b>` : ''}</div></div>`;
  opPlaysTable.pos = x.before; opPlaysTable.side = x.s;
  fb += opPlaysTable(opPlays(it, ln), ln.m, t('op.cands', { d: x.d.join('') }));
  opPlaysTable.pos = null;
  fb += `<div class="op-dr" style="margin-top:10px"><button data-odr="${L.os}"><span class="pdisc p${it.kind === 'open' ? L.os : 1 - L.os}"></span>${t('op.drillThis')}</button><button data-oitem="1">${t('op.toItem')}</button></div>`;
  $('#lsFb').innerHTML = fb;
  $('#lsHint').style.display = 'none';
  $('#lsNext').style.display = 'none';
  $('#lsAuto').classList.remove('hidden');
  opSync();
  // the explanation card only grows while stepping through a line (no jumps)
  const card = $('#lessonCard'); card.style.minHeight = '';
  const h = card.offsetHeight; if (h > L.minH) L.minH = h; if (L.minH && !G.FLAT) card.style.minHeight = L.minH + 'px';
}
// tags of a played turn (for the walkthrough line): computed on the fly (same rules as the build script)
function opTags(x) {
  const p = x.before, s = x.s, q = x.after, tg = { hit: [], make: [], slot: [], build: [] };
  for (const c of x.moves) if (BG.mvHit(c)) tg.hit.push(BG.mvTo(c));
  const n0 = i => p[s * 26 + i], n1 = i => q[s * 26 + i];
  if (n0(25) > 0 && n1(25) < n0(25)) tg.enter = true;
  for (let i = 1; i <= 24; i++) {
    if (n1(i) >= 2 && n0(i) < 2) tg.make.push(i);
    else if (n1(i) === 1 && n0(i) === 0 && i <= 7 && i >= 3 && !tg.hit.includes(i)) tg.slot.push(i);
  }
  const back0 = n0(24), back1 = n1(24);
  if (back1 < back0) {
    let lo = 25; for (const c of x.moves) if (BG.mvFrom(c) === 24 || (BG.mvFrom(c) > 12 && BG.mvFrom(c) < 24 && n0(BG.mvFrom(c)) === 0)) lo = Math.min(lo, BG.mvTo(c));
    for (const c of x.moves) { const f = BG.mvFrom(c); if (f >= 18 && f <= 24) lo = Math.min(lo, BG.mvTo(c)); }
    if (lo <= 15) tg.run = lo; else if (lo < 24 && !tg.make.includes(lo)) tg.split = lo;
  }
  for (let i = 7; i <= 11; i++) if (n1(i) === 1 && n0(i) === 0 && !tg.hit.includes(i) && !tg.slot.includes(i) && tg.run !== i && tg.split !== i) tg.build.push(i);
  tg.hit = [...new Set(tg.hit)];
  return tg;
}
function opSync() {
  const on = !!(lesson && lesson.op === 'study'), nav = $('#stNav'), au = $('#lsAuto');
  document.body.classList.toggle('in-study', on);
  if (au) au.classList.toggle('hidden', !on);
  if (!on || !nav) { document.body.classList.remove('st-end'); return; }
  const N = lesson.steps.length, i = lesson.k, q = k => nav.querySelector('[data-sn="' + k + '"]');
  document.body.classList.toggle('st-end', i >= N);
  $('#stPos').textContent = i + ' / ' + N;
  q('first').disabled = q('prev').disabled = i === 0;
  q('next').disabled = q('last').disabled = i >= N;
  for (const b of [q('auto'), au]) { b.classList.toggle('on', !!opTimer); b.title = t('op.auto'); b.setAttribute('aria-label', t('op.auto')); }
  for (const k of ['first', 'prev', 'next', 'last']) q(k).title = t('nav.' + k);
}
$('#stNav').addEventListener('click', e => { const b = e.target.closest('button[data-sn]'); if (b) opGo(b.dataset.sn); });
$('#lsAuto').addEventListener('click', () => { if (lesson && lesson.op === 'study') opGo('auto'); });
document.addEventListener('click', e => { if (opTimer && !e.target.closest('[data-sn="auto"],#lsAuto,[data-osn="auto"]')) opStop(); }, true);
$('#lessonCard').addEventListener('click', e => {
  if (!lesson || !lesson.op) return;
  if (lesson.op === 'study') {
    const a = e.target.closest('[data-osq]'); if (a) { opGo(a.dataset.osq); return; }
    const n = e.target.closest('[data-osn]'); if (n) { opGo(n.dataset.osn); return; }
    const g = e.target.closest('[data-opg]'); if (g && !g.disabled) { const L = lesson, li = L.li + +g.dataset.opg; if (li >= 0 && li < L.it.lines.length) { opStop(); lesson = null; startOpStudyKeep(L, li); } return; }
  }
  const d = e.target.closest('[data-odr]'); if (d) { startOpDrill(lesson.it.id, +d.dataset.odr); return; }
  const b = e.target.closest('[data-oitem]'); if (b) { opBackToItem(); return; }
  const nx = e.target.closest('[data-onext]'); if (nx) { opDrillNext(); return; }
});
function startOpStudyKeep(L, li) {   // next / previous line of the same item, keeping the saved game
  lesson = L; startOpStudy(L.it.id, li, L.os);
}
function opBackToItem() { const id = lesson && lesson.it ? lesson.it.id : opItemId; opStop(); quitSpecial(); openOpItem(id); }
document.addEventListener('keydown', e => {
  if (!lesson || lesson.op !== 'study' || e.metaKey || e.ctrlKey || e.altKey) return;
  const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
  if (document.querySelector('.overlay.show')) return;
  const k = { ArrowLeft: 'prev', ArrowRight: 'next', ArrowDown: 'first', ArrowUp: 'last', ' ': 'auto' }[e.key];
  if (!k) return;
  e.preventDefault(); if (tg && tg.blur && tg !== document.body) tg.blur();
  opGo(k);
});

// ---------------------------------------------------------------- drill (通し稽古)
// The learner holds colour `col`. Opening items: one decision (the opening roll). Reply items: every line in turn — the
// opponent's opening is played automatically, then the learner plays the reply roll. Correct = within OPB.tol of the best.
function startOpDrill(id, col) {
  const it = opItem(id); if (!it) return;
  hideOverlay('#lessonOverlay');
  const keep = lesson && lesson.op;
  if (!keep) stashGame();
  puzzle = null; document.body.classList.remove('in-puzzle'); $('#toast').classList.remove('show');
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = -1; rvOpen = false; opStop();
  const os = it.kind === 'open' ? col : 1 - col;
  const order = it.kind === 'open' ? [0] : it.lines.map((_, i) => i);
  lesson = { op: 'drill', it, col, os, order, oi: 0, res: [], answered: true, done: false, side: col, minH: 0 };
  document.body.classList.add('in-lesson'); document.body.classList.remove('in-study');
  if (G.FLAT) { scrollTo(0, 0); document.body.scrollTop = 0; }
  opDrillLine();
}
async function opDrillLine() {
  const L = lesson; if (!L || L.op !== 'drill') return;
  const it = L.it, ln = it.lines[L.order[L.oi]], w = opWalk(ln.seq, L.os), k = opDecIdx(it, ln);
  L.ln = ln; L.w = w; L.fb = null; L.answered = true;
  setupProblem(BG.initial(), L.col, [1, 2]); turn = null; lesson.posOverride = BG.initial(); view = L.col;
  marks = []; extraArrows = [];
  render(); renderInfo(); opDrillCard();
  const tok = busyToken;
  await sleep(anim() ? 450 : 120); if (lesson !== L || tok !== busyToken) return;
  for (let i = 0; i < k; i++) {   // the opponent's turns before the decision
    const x = w[i];
    lesson.posOverride = null;
    turn = { side: x.s, dice: x.d, left: x.d[0] === x.d[1] ? [x.d[0], x.d[0], x.d[0], x.d[0]] : x.d.slice(), steps: [], pos: x.before.slice(), start: x.before.slice(), locked: true, plays: [], op: 1 };
    render(); opDrillCard();
    await rollAnim(x.s, x.d, i === 0); if (lesson !== L || tok !== busyToken) return;
    render();
    await sleep(anim() ? 350 : 80); if (lesson !== L || tok !== busyToken) return;
    for (const c of x.moves) {
      const from = BG.mvFrom(c), to = BG.mvTo(c);
      const q = await animStep(turn.pos, x.s, from, to); if (lesson !== L || tok !== busyToken || !turn) return;
      turn.pos = q; turn.steps.push({ code: c, from, to, die: dieFor(from, to) });
      const j = turn.left.indexOf(turn.steps[turn.steps.length - 1].die); if (j >= 0) turn.left.splice(j, 1); else turn.left.pop();
      render(); await sleep(anim() ? 140 : 20); if (lesson !== L || tok !== busyToken) return;
    }
    await sleep(anim() ? 500 : 120); if (lesson !== L || tok !== busyToken) return;
  }
  // the learner's turn
  const x = w[k];
  turn = null; lesson.posOverride = x.before; render();
  await rollAnim(x.s, x.d, k === 0); if (lesson !== L || tok !== busyToken) return;
  lesson.posOverride = null;
  setupProblem(x.before, x.s, x.d); view = L.col;
  L.answered = false; L.dec = x;
  render(); renderInfo(); opDrillCard();
}
function opSubmit(tt) {
  const L = lesson; if (!L || L.op !== 'drill' || L.answered) return;
  const it = L.it, ln = L.ln, x = L.dec, plays = opPlays(it, ln), R = opRank(plays), b = opBest(plays);
  const key = BG.key(tt.pos);
  const mine = R.find(y => BG.key(decMoves(x.before, x.s, y.m).pos) === key);
  const rolled = R.some(y => y.ro != null);
  const ok = !!(mine && (rolled ? mine.ro != null : mine.ply === 2) && b.e - mine.e <= OPB.tol + 1e-9);
  L.answered = true;
  L.res.push(ok ? 1 : 0);
  L.fb = { ok, mine: mine ? mine.m : null, mineMoves: tt.steps.map(s => s.code), b };
  SFX.chime(ok);
  turn.pos = turn.start.slice(); turn.steps = []; turn.left = [];
  extraArrows = [{ side: x.s, start: x.before, moves: decMoves(x.before, x.s, b.m).moves, cls: 'hint' }];
  if (!ok) extraArrows.push({ side: x.s, start: x.before, moves: L.fb.mineMoves, cls: 'bad' });
  render(); opDrillCard();
  if (L.oi + 1 >= L.order.length) opDrillFinish();
}
function opDrillFinish() {
  const L = lesson; L.done = true;
  const n = L.res.length, ok = L.res.reduce((a, b) => a + b, 0), pr = opProg(), id = L.it.id, old = pr[id] || {};
  const best = Math.max(old.best || 0, n ? ok / n : 0);
  pr[id] = { pass: !!old.pass || ok === n, best, c: Object.assign({}, old.c, { [L.col]: Math.max((old.c || {})[L.col] || 0, ok / n) }) };
  opSave(pr);
  if (ok === n) setTimeout(() => { if (lesson === L) { confetti(); SFX.chime(true); } }, 700);
  opDrillCard();
}
function opDrillNext() {
  const L = lesson; if (!L || L.op !== 'drill' || !L.answered) return;
  if (L.done) { startOpDrill(L.it.id, L.col); return; }
  L.oi++; opDrillLine();
}
function opDrillCard() {
  const L = lesson; if (!L || L.op !== 'drill') return;
  const it = L.it, ln = L.ln, n = L.order.length;
  $('#lsStep').textContent = `${t('op.drill')} · ${opT(it, 't')}`;
  $('#lsTitle').textContent = it.kind === 'open' ? t('op.drillOpenT', { d: it.d.join('') }) : opT(it, 't');
  $('#lsDots').innerHTML = n > 1 ? L.order.map((_, i) => { const r = L.res[i]; return `<i class="${r === undefined ? '' : r ? 'ok' : 'ng'} ${i === L.oi ? 'cur' : ''}"></i>`; }).join('') : '';
  $('#lsChoices').innerHTML = '';
  const x = L.w && L.w[opDecIdx(it, ln)];
  let pr = '';
  if (!L.answered && x) pr = `<div class="ls-goal"><span class="pdisc p${x.s}"></span><span>${t('op.drillTurn', { c: pname(x.s), d: x.d.join('') })}</span></div>`;
  else if (!L.fb && x) pr = `<div class="ls-goal"><span class="pdisc p${1 - L.col}"></span><span>${t('op.drillWait', { c: pname(1 - L.col) })}</span></div>`;
  if (x && n > 1) pr += `<div class="op-ctx">${t('op.drillCtx', { i: L.oi + 1, n })} ${opSeqText(it, { seq: ln.seq.slice(0, opDecIdx(it, ln)) }, L.os)}</div>`;
  $('#lsPrompt').innerHTML = pr;
  let fb = '';
  const F = L.fb;
  if (F) {
    const bn = BG.notation(decMoves(x.before, x.s, F.b.m).moves);
    const R = opRank(opPlays(it, ln)), mine = F.mine ? R.find(y => y.m === F.mine) : null;
    fb += F.ok ? `<b class="ok">${t('op.ok')}</b> ` : `<b class="ng">${t('op.ng')}</b> `;
    if (F.ok && F.mine === F.b.m) fb += t('op.okBest', { m: mvb(bn), e: OPE(F.b.e) });
    else if (F.ok) fb += t('op.okNear', { m: mvb(BG.notation(F.mineMoves)), b: mvb(bn), d: (F.b.e - mine.e).toFixed(3) });
    else fb += t('op.ngText', { m: mvb(BG.notation(F.mineMoves)), b: mvb(bn), e: OPE(F.b.e), me: mine ? OPE(mine.e) : t('op.lower'), d: mine ? (F.b.e - mine.e).toFixed(3) : '—' });
    // the aim of the best play: the matching line of the item, else its features
    const bl = it.kind === 'open' ? it.lines.find(l => l.m === F.b.m) : ln;
    fb += `<div class="op-info op-cm"><div class="op-aim">${bl ? opLineAim(it, bl) : opTagText(opTags({ before: x.before, s: x.s, moves: decMoves(x.before, x.s, F.b.m).moves, after: decMoves(x.before, x.s, F.b.m).pos }), false)}</div>${bl && opLineNote(it, bl) ? `<p class="op-note">${opLineNote(it, bl)}</p>` : ''}</div>`;
    opPlaysTable.pos = x.before; opPlaysTable.side = x.s; opPlaysTable.open = true;
    fb += opPlaysTable(opPlays(it, ln), F.mine || '', t('op.cands', { d: x.d.join('') }));
    opPlaysTable.pos = null; opPlaysTable.open = false;
    if (L.done) {
      const ok = L.res.reduce((a, b) => a + b, 0);
      fb += `<div class="op-sum">${ok === L.res.length ? `<b class="ok">${t('op.perfect')}</b> ` : ''}${t('op.drillDone', { ok, n: L.res.length })}</div>`;
    }
  }
  $('#lsFb').innerHTML = fb;
  $('#lsHint').style.display = ''; $('#lsHint').textContent = t('ls.hint'); $('#lsHint').disabled = L.answered;
  $('#lsNext').style.display = ''; $('#lsNext').textContent = L.done ? t('op.again') : t('op.nextLine2');
  $('#lsNext').disabled = !L.answered || !F; $('#lsNext').style.opacity = (!L.answered || !F) ? .4 : 1;
  $('#lsAuto').classList.add('hidden');
  $('#lessonCard').classList.toggle('answered', !!F);
}
function opDrillHint() {
  const L = lesson; if (!L || L.op !== 'drill' || L.answered) return;
  const x = L.dec, b = opBest(opPlays(L.it, L.ln)), d = decMoves(x.before, x.s, b.m);
  marks = [...new Set(d.moves.map(c => BG.mvFrom(c)))].map(f => ({ side: x.s, p: f, cls: 'far' }));
  render();
  $('#lsFb').innerHTML = `💡 ${t('op.hintText', { a: opTagText(opTags({ before: x.before, s: x.s, moves: d.moves, after: d.pos }), true) })}`;
}
// ---------------------------------------------------------------- hooks used by app.js
window.OPH = {
  list: opListClick,
  open: openOpenings,
  isList: () => opView === 'list' && $('#lessonList').dataset.mode === 'op',
  isItem: () => opView === 'item',
  leave: () => { opView = ''; $('#btnLessonStart').textContent = t('ls.start'); },
  back: () => { const C = OPB && OPB.cats.find(c => c.items.includes(opItemId)); openOpenings(C ? C.id : undefined); },
  start: () => startOpDrill(opItemId, 0),
  submit: opSubmit,
  hint: opDrillHint,
  next: opDrillNext,
  stop: opStop,
  relang: () => {
    if (lesson && lesson.op === 'study') opStudyCard();
    else if (lesson && lesson.op === 'drill') opDrillCard();
    if ($('#lessonOverlay').classList.contains('show')) { if (opView === 'list') openOpenings(); else if (opView === 'item') openOpItem(opItemId); }
  },
  listBack: () => { const id = lesson && lesson.it ? lesson.it.id : opItemId; quitSpecial(); openOpItem(id); },
  toList: () => { const C = lesson && lesson.it && OPB.cats.find(c => c.items.includes(lesson.it.id)); quitSpecial(); openOpenings(C ? C.id : undefined); },
};
