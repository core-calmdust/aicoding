'use strict';
// Gomoku & Renju — page logic (board, input, AI flow, lessons, openings, puzzles, review, share, rated games, online play).
// Rules and search live in engine.js (window.RenjuEngine; the same file runs in the workers).
const E = window.RenjuEngine, WIN = E.WIN, WINT = E.WINT, N = 15;
const P1 = 1, P2 = 2;                         // P1 = black (moves first), P2 = white
const sqName = E.sqName, sqOf = E.sqOf;
let rule = 'renju';            // rule of the game on the board
let startPos = null;           // lesson / puzzle start: { b: [m], w: [m], side } (null = empty board)
let net = null;                // online game in progress or being watched (see the online section)
let moves = [];                // game record (cells 0..224)
let cur = 0;                   // number of moves shown
const startKey = () => startPos ? 'S' + startPos.b.join('.') + '/' + startPos.w.join('.') + '/' + startPos.side : '';
const keyOf = i => rule + '|' + startKey() + '|' + moves.slice(0, i).join(',');
// one position object follows the board; other indices are reached by make / unmake
let G = null, gMoves = [], gBase = '';
function basePos() {
  const p = new E.Pos(rule);
  if (startPos) {
    for (const m of startPos.b) { if (p.side !== P1) p.pass(); p.make(m); }
    for (const m of startPos.w) { if (p.side !== P2) p.pass(); p.make(m); }
    if (p.side !== startPos.side) p.pass();
    p.fresh = false;
  }
  return p;
}
function posAt(i) {
  const bk = rule + '|' + startKey();
  if (!G || gBase !== bk) { G = basePos(); gMoves = []; gBase = bk; }
  let k = 0; while (k < gMoves.length && k < i && gMoves[k] === moves[k]) k++;
  while (gMoves.length > k) { G.unmake(); gMoves.pop(); }
  while (gMoves.length < i) { const m = moves[gMoves.length]; G.make(m); gMoves.push(m); }
  return G;
}
const stCache = new Map();
function statusAt(i) {
  if (net && net.over && i === moves.length && !lesson && !puzzle) return net.over;
  if (rgame && rgame.over && i === moves.length && !lesson && !puzzle) return rgame.over;
  const k = keyOf(i); if (stCache.has(k)) return stCache.get(k);
  const pos = posAt(i);
  let st = pos.status();
  if (!st.over && pos.side === P1 && pos.renju && !pos.legal().length) st = { over: true, winner: P2, why: 'nomove' };
  if (stCache.size > 4000) stCache.clear();
  stCache.set(k, st);
  return st;
}
const toMoveAt = i => posAt(i).side;
const sanOf = i => sqName(moves[i]);

// ====================================================================== state
const STORE = 'aicoding-gomoku';
const settings = { coach: true, lvv: 2, mode: 'ai', rule: 'renju', color: 1, level: 6, level2: 6, anim: true, sound: true, hint: false, eval: true, last: true, threat: false, forbid: true, num: false, confirm: null, lang: '', skin: 'classic' };
const SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
function detectLang() { const n = (navigator.language || 'ja').toLowerCase(); return ['ja', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'].find(c => n.startsWith(c)) || 'en'; }
let LANG = detectLang();
function t(k, v) { let x = (I18N[LANG] || I18N.en)[k]; if (x === undefined) x = I18N.en[k]; if (x === undefined) x = I18N.ja[k]; if (x === undefined) return k; if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; }
const pname = p => t(p === P1 ? 'p1' : 'p2');
// AI strength: 20 steps, 15級 (1) … 1級 (15), 初段 (16) … 五段 (20)
const LV_MAX = 20, LV_OLD = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 20];   // old Lv.1-10 (saved settings / rated history) -> step
const lvMig = v => typeof v === 'number' && v >= 1 ? LV_OLD[Math.min(10, Math.round(v))] : 6;
const lvClamp = v => typeof v === 'number' && v >= 1 && v <= LV_MAX ? Math.round(v) : 6;
const LV = i => i <= 15 ? t('lv.kyu', { n: 16 - i }) : t('lv.dan' + (i - 15)), LVD = i => t('lvd')[i <= 3 ? 0 : i <= 9 ? 1 : i <= 15 ? 2 : 3];
const $ = s => document.querySelector(s);
const coarse = () => matchMedia('(pointer: coarse)').matches;
const confirmOn = () => settings.confirm === null ? coarse() : !!settings.confirm;
function applyI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG;
  document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); });
  const sel = document.getElementById('langSel'); if (sel) sel.value = LANG;
  document.title = t('meta.title');
  renderBrandSub();
}
function renderBrandSub() { const el = $('#brandSub'); if (el) el.textContent = lesson || puzzle ? '' : t('rule.' + rule); }
let humanColor = P1;
let reviewing = false;
let evals = [];
let busyToken = 0;
let lesson = null, puzzle = null;
let gameOverShown = false;
let thinking = 0, animating = false;
let pend = -1;             // tap-to-confirm: the cell waiting for a second tap
function validMoves(list, r, sp) { try { E.replay(r, list, null); return true; } catch (e) { return false; } }
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null'); if (!d) return false;
    Object.assign(settings, d.settings || {});
    if (settings.lvv !== 2) { settings.level = lvMig(settings.level); settings.level2 = lvMig(settings.level2); settings.lvv = 2; if (d.rated && d.rated.lv) d.rated.lv = lvMig(d.rated.lv); }
    settings.level = lvClamp(settings.level); settings.level2 = lvClamp(settings.level2);
    if (settings.mode === 'online') settings.mode = 'ai';
    if (!E.RULES.includes(settings.rule)) settings.rule = 'renju';
    const r = E.RULES.includes(d.rule) ? d.rule : settings.rule;
    if (Array.isArray(d.moves) && validMoves(d.moves, r)) {
      rule = r; moves = d.moves; humanColor = d.humanColor || 1; evals = Array.isArray(d.evals) ? d.evals : [];
      rgame = d.rated && d.rated.id ? d.rated : null;
      // restored on page load (not started by the player): the clock stays stopped until the next move is played
      if (rgame && !rgame.over) rgame.paused = true;
      cur = moves.length; gameOverShown = statusAt(cur).over; return true;
    }
  } catch (e) {}
  return false;
}
function save() {
  if (settings.mode === 'online') { try { const d = JSON.parse(localStorage.getItem(STORE) || '{}'); d.settings = Object.assign({}, settings, { mode: 'pvp' }); localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {} return; }
  if (lesson || puzzle) { try { const d = JSON.parse(localStorage.getItem(STORE) || '{}'); d.settings = settings; localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {} return; }
  try { localStorage.setItem(STORE, JSON.stringify({ settings, rule, moves, humanColor, evals: evals.slice(0, moves.length + 1), rated: rgame })); } catch (e) {}
}

// ====================================================================== workers
let jobId = 0;
function makeWorker() {
  const w = new Worker('engine.js?v=20261020ns'); w.jobs = new Map();
  w.onmessage = e => { const m = e.data, j = w.jobs.get(m.id); if (!j) return; if (m.type === 'progress') { j.onProgress && j.onProgress(m); return; } w.jobs.delete(m.id); j.resolve(m); };
  return w;
}
let aiW = makeWorker(), anaW = makeWorker(), coachW = null;
function request(which, msg, onProgress) {
  const w = which === 'ai' ? aiW : which === 'coach' ? (coachW || (coachW = makeWorker())) : anaW;
  return new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve, onProgress }); w.postMessage({ rule, start: startPos, ...msg, id }); });
}
function cancelWorker(which) {
  const w = which === 'ai' ? aiW : anaW;
  if (!w.jobs.size) return;
  w.terminate(); w.jobs.forEach(j => j.resolve(null));
  if (which === 'ai') aiW = makeWorker(); else anaW = makeWorker();
}
const anaCache = new Map();

// ====================================================================== sound
let actx = null;
function ctx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === 'suspended') actx.resume(); return actx; }
function noise(a, t0, dur, vol, freq, q, type) {
  const len = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 5);
  const n = a.createBufferSource(); n.buffer = buf; const f = a.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
  const g = a.createGain(); g.gain.value = vol; n.connect(f).connect(g).connect(a.destination); n.start(t0);
}
function tone(a, t0, f0, f1, dur, vol, type) {
  const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine';
  o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur * 0.7);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
// a stone on a wooden board: a sharp click and a short woody body
// recorded stone sound (効果音ラボ, see sounds/README.md); the synthesized click is the fallback until it is decoded
let stoneBuf = null, stoneLoading = false;
function loadStone(a) { if (stoneBuf || stoneLoading) return; stoneLoading = true; fetch('sounds/stone.wav?v=1').then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => a.decodeAudioData(b, res, rej))).then(b => { stoneBuf = b; }).catch(() => { stoneLoading = false; }); }
addEventListener('pointerdown', () => { const a = ctx(); if (a) loadStone(a); }, { once: true, capture: true });
function sStone() { if (!settings.sound) return; const a = ctx(); if (!a) return; loadStone(a);
  if (stoneBuf) { const n = a.createBufferSource(), g = a.createGain(); n.buffer = stoneBuf; n.playbackRate.value = 0.97 + Math.random() * 0.06; g.gain.value = 0.9; n.connect(g).connect(a.destination); n.start(); return; }
  const t0 = a.currentTime; noise(a, t0, 0.022, 0.55, 3200, 1.6); tone(a, t0, 520, 210, 0.07, 0.22, 'triangle'); noise(a, t0 + 0.004, 0.06, 0.18, 900, 2.2); }
function sThreat() { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + 0.06; tone(a, t0, 880, 0, 0.22, 0.06, 'triangle'); tone(a, t0 + 0.07, 1174.7, 0, 0.26, 0.05, 'triangle'); }
function playChime(win) {
  if (!settings.sound) return; const a = ctx(); if (!a) return;
  const t0 = a.currentTime + 0.05, notes = win ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [392, 349.23, 311.13, 261.63];
  notes.forEach((fr, i) => tone(a, t0 + i * (win ? 0.1 : 0.16), fr, 0, 0.7, 0.16, win ? 'triangle' : 'sine'));
}
function playTick() { if (!settings.sound) return; const a = ctx(); if (!a) return; tone(a, a.currentTime, 880, 0, 0.06, 0.04, 'triangle'); }

// ====================================================================== board
const boardEl = $('#board'), stonesEl = $('#stones'), fxEl = $('#fx'), gridEl = $('#grid');
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const animOn = () => settings.anim && !reduceMotion;
const cx = m => m % N, cy = m => Math.floor(m / N);
const px = m => (1 + cx(m)), py = m => (15 - cy(m));            // board units (16 per side)
function placeAt(el, m, size) { const s = size || 1; el.style.left = ((px(m) - s / 2) / 16 * 100) + '%'; el.style.top = ((py(m) - s / 2) / 16 * 100) + '%'; }
const FILES = 'abcdefghijklmno';
function drawGrid() {
  let s = '';
  for (let k = 0; k < N; k++) {
    const e = k === 0 || k === N - 1 ? ' class="edge"' : '';
    s += `<line x1="1" y1="${k + 1}" x2="15" y2="${k + 1}"${e}/><line x1="${k + 1}" y1="1" x2="${k + 1}" y2="15"${e}/>`;
  }
  for (const [c, r] of [[7, 7], [3, 3], [11, 3], [3, 11], [11, 11]]) s += `<circle cx="${1 + c}" cy="${15 - r}" r="${c === 7 && r === 7 ? .13 : .11}"/>`;
  for (let k = 0; k < N; k++) { s += `<text x="${k + 1}" y="15.68">${FILES[k]}</text><text x=".36" y="${15 - k}">${k + 1}</text>`; }
  gridEl.innerHTML = s;
}
const stEls = new Map();      // cell -> element
let shownKey = '';
function numberOf(i) { return i + 1; }
function stoneEl(color) { const el = document.createElement('div'); el.className = 'st ' + (color === P1 ? 'b' : 'w'); el.innerHTML = '<span class="n"></span>'; return el; }
// make the stones on the board match position i; `fresh` = the cell of a stone just played (drop animation)
function syncStones(i, fresh) {
  const pos = posAt(i), want = new Map();
  if (startPos) { for (const m of startPos.b) want.set(m, [P1, 0]); for (const m of startPos.w) want.set(m, [P2, 0]); }
  for (let k = 0; k < i; k++) want.set(moves[k], [pos.at(moves[k]), k + 1]);
  for (const [m, el] of stEls) { const w = want.get(m); if (!w || +el.dataset.c !== w[0]) { el.remove(); stEls.delete(m); } }
  for (const [m, [c, n]] of want) {
    let el = stEls.get(m);
    if (!el) { el = stoneEl(c); el.dataset.c = c; placeAt(el, m, 0.94); stonesEl.appendChild(el); stEls.set(m, el); if (m === fresh && animOn()) el.classList.add('drop'); }
    const lbl = n ? String(n) : '';
    const nEl = el.firstChild; if (nEl.textContent !== lbl) nEl.textContent = lbl;
    el.classList.toggle('pz', !!(puzzle && n));
    el.classList.remove('win');
  }
}
function renderBoard(anim) {
  const key = keyOf(cur), prev = shownKey; shownKey = key;
  const fresh = anim && cur > 0 && prev === keyOf(cur - 1) ? moves[cur - 1] : -1;
  syncStones(cur, fresh);
  if (fresh >= 0) { sStone(); const p = posAt(cur); if (!statusAt(cur).over && (p.cnt[3 - p.side][E.C.FIVE] > 0)) setTimeout(sThreat, 90); }
  boardEl.classList.toggle('hide-last', !settings.last);
  boardEl.classList.toggle('hide-num', !(settings.num || puzzle || (lesson && lesson.study)));
  renderFx();
  boardEl.classList.toggle('can', canHumanPlay());
}

// ---------------------------------------------------------------- fx (marks on intersections)
let hintList = null, lessonMarks = [], labelList = null, hover = -1;
const NS = 'http://www.w3.org/2000/svg';
function mk(cls, m, attrs) { const d = document.createElement('div'); d.className = 'mk ' + cls; placeAt(d, m); if (attrs) for (const k in attrs) d.setAttribute(k, attrs[k]); fxEl.appendChild(d); return d; }
function ghost(m, color, cls) { const el = stoneEl(color); el.classList.add(cls); placeAt(el, m, 0.94); fxEl.appendChild(el); return el; }
const FORBID_K = ['', '33', '44', 'OL'];
function renderFx() {
  fxEl.innerHTML = '';
  const pos = posAt(cur), st = statusAt(cur), last = cur > 0 ? moves[cur - 1] : -1;
  if (last >= 0 && settings.last && !st.over) mk('last', last);
  for (const [, el] of stEls) el.classList.remove('win');
  if (st.over && st.line) {
    for (const m of st.line) { const el = stEls.get(m); if (el) el.classList.add('win'); }
    const a = st.line[0], b = st.line[st.line.length - 1];
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'winline'); svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = `<line x1="${px(a)}" y1="${py(a)}" x2="${px(b)}" y2="${py(b)}"/>`; fxEl.appendChild(svg);
  } else if (last >= 0 && settings.last && st.over) mk('last', last);
  const live = !st.over && !reviewing;
  // forbidden points for black (renju), shown when it is black's turn
  if (settings.forbid && pos.renju && pos.side === P1 && !st.over && !(lesson && lesson.noForbidMarks)) {
    for (const f of pos.forbiddenList()) mk('forb why', f.m, { 'data-k': FORBID_K[f.k] });
  }
  // threats: where the opponent would make five (red ring) or a straight four (orange dot); own fours (blue ring)
  if (settings.threat && live && !lesson && !puzzle && !rtLive() && settings.mode !== 'online') {
    const me = pos.side, op = 3 - me;
    for (const x of pos.threatCells(op)) { if (x.k === E.C.FIVE) mk('t4', x.m); else if (x.k === E.C.F4 && (op !== P1 || !pos.renju || !pos.forbidden(x.m))) mk('t3', x.m); }
    for (const x of pos.threatCells(me)) if ((x.k === E.C.B4 || x.k === E.C.F43 || x.k === E.C.F4) && (me !== P1 || !pos.renju || !pos.forbidden(x.m))) mk('m4', x.m);
  }
  for (const k of lessonMarks) mk(k.cls, k.at);
  if (labelList) drawLabels(labelList);
  else if (!drawReviewFx() && hintList && !st.over) drawHints(hintList);
  if (pend >= 0 && canHumanPlay() && !pos.at(pend)) ghost(pend, pos.side, 'pend');
  else if (hover >= 0 && canHumanPlay() && !pos.at(hover) && !confirmOn()) ghost(hover, pos.side, 'ghost');
}
function valLabel(v) {
  if (v > WINT) return { cls: 'win', big: t('lbl.win') };
  if (v < -WINT) return { cls: 'loss', big: t('lbl.loss') };
  const x = v / 100; return { cls: x < -0.05 ? 'neg' : '', big: (x > 0.05 ? '+' : '') + (Math.abs(x) < 0.05 ? '0.0' : x.toFixed(1)) };
}
function drawHints(list) {
  const L = list.slice().sort((a, b) => b.v - a.v).slice(0, 3);
  L.forEach((e, i) => { const lb = valLabel(e.v), d = document.createElement('div'); d.className = 'hintlbl ' + lb.cls + (i === 0 ? ' best' : i === 1 ? ' a2' : ' a3'); placeAt(d, e.m); d.innerHTML = `<b>${lb.big}</b>`; fxEl.appendChild(d); if (i === 0) mk('hl', e.m); });
}
function drawLabels(list) { for (const L of list) { const d = document.createElement('div'); d.className = 'hintlbl ' + L.cls; placeAt(d, L.at); d.innerHTML = `<b>${L.big}</b>`; fxEl.appendChild(d); } }
function sOfV(v) { return v > WINT ? 0.95 : v < -WINT ? -0.95 : Math.tanh(v / 900) * 0.85; }
function evalFromList(list, mover) {
  if (!list || !list.length) return null;
  let best = -Infinity; for (const e of list) best = Math.max(best, e.v);
  const sign = mover === P1 ? 1 : -1;
  if (best > WINT) return { s: 0.95 * sign, kind: 'win', side: mover };
  if (best < -WINT) return { s: -0.95 * sign, kind: 'win', side: 3 - mover };
  return { s: sOfV(best) * sign, kind: 'cp', cp: best * sign };
}
function evalText(ev) {
  if (!ev) return '—';
  if (ev.kind === 'final') return ev.side ? t('ev.won', { c: pname(ev.side) }) : t('res.draw');
  if (ev.kind === 'win') return t('ev.winning', { c: pname(ev.side) });
  const a = Math.abs(ev.s), c = pname(ev.s > 0 ? P1 : P2), num = ev.cp !== undefined ? ` (${ev.cp > 0 ? '+' : ''}${(ev.cp / 100).toFixed(1)})` : '';
  return (a < 0.08 ? t('ev.even') : t(a < 0.25 ? 'ev.slight' : a < 0.5 ? 'ev.adv' : 'ev.sup', { c })) + num;
}

// ====================================================================== panel
function isAIColor(p) { return settings.mode === 'watch' || (settings.mode === 'ai' && p !== humanColor); }
function levelFor(p) { if (rgame && settings.mode === 'ai') return rgame.lv; return settings.mode === 'watch' ? (p === P1 ? settings.level : settings.level2) : settings.level; }
function gameOver(i) { return statusAt(i).over; }
function canHumanPlay() {
  if (gameOver(cur) || animating) return false;
  if (puzzle) return puzzle.state === 'play' && !puzzle.busy && toMoveAt(cur) === puzzle.me;
  if (lesson) return !lesson.answered && !lesson.study;
  if (reviewing) return false;
  if (settings.mode === 'online') return olLive() && !!net.game && net.game.status === 'play' && !net.pending && cur === moves.length && toMoveAt(cur) === net.me;
  return !isAIColor(toMoveAt(cur)) && !thinking;
}
function playerName(p) {
  if (puzzle) return p === puzzle.me ? t('you') : t('defender');
  if (lesson || settings.mode === 'pvp') return '';
  if (settings.mode === 'online') { const g = net && net.game; return !g ? '' : !net.spectate && p === net.me ? t('you') : p === P1 ? g.wn : g.bn; }
  if (settings.mode === 'watch') return `AI ${LV(levelFor(p))}`;
  if (rgame) return p === humanColor ? t('you') + ' · R' + rgame.my : `AI ${rtLvName(rgame.lv)} · R${rgame.or}`;
  return p === humanColor ? t('you') : `AI ${LV(settings.level)}`;
}
function stonesOf(pos, c) { let n = 0; for (let m = 0; m < 225; m++) if (pos.at(m) === c) n++; return n; }
// PC header bar (shared/headerbar.js): turn, move number, evaluation (not in rated / online games, not when switched off), rule
let HB = null;   // set at start-up (end of this file)
const escHb = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function hbInfo(st, tm, ev) {
  if (!HB || !HB.on) return;
  const dot = c => `<span class="pdisc p${c}" style="width:12px;height:12px;flex:none"></span>`;
  let h = st.over ? `<span class="hb-chip">${st.winner ? dot(st.winner) : ''}<b>${escHb(t('hb.over'))}</b></span>` : `<span class="hb-chip">${dot(tm)}<b>${escHb(t('hb.turn', { c: pname(tm) }))}</b></span>`;
  if (cur || !st.over) h += `<span class="hb-chip">${escHb(t('hb.move', { n: cur + (st.over ? 0 : 1) }))}</span>`;
  if (puzzle) h += `<span class="hb-chip">${escHb(pzT('movesLeft', { n: Math.max(0, pzLeft(puzzle)) }))}</span>`;
  else if (!lesson && settings.eval && !rtLive() && settings.mode !== 'online' && ev) h += `<span class="hb-chip">${escHb(t('eval'))} <b>${escHb(evalText(ev))}</b></span>`;
  h += `<span class="hb-chip">${escHb(t('rule.' + rule))}</span>`;
  HB.setInfo(h);
}
function renderInfo() {
  const pos = posAt(cur), st = statusAt(cur), tm = pos.side;
  for (const p of [P1, P2]) {
    const c = p - 1;
    if (settings.mode === 'online' && !lesson && !puzzle) { /* clocks: olClocks() below */ }
    else if (rgame && !lesson && !puzzle && settings.mode === 'ai') { $('#count' + p).textContent = fmtClock(rtClockLeft(c)); $('#hand' + p).textContent = t('rt.clock'); }
    else { $('#count' + p).textContent = stonesOf(pos, p); $('#hand' + p).textContent = t('stones'); }
    const nmEl = $('#name' + p);
    if (settings.mode === 'online' && !lesson && !puzzle) olPName(nmEl, p);
    else { const n = playerName(p); nmEl.classList.remove('pn'); nmEl.removeAttribute('title'); nmEl.textContent = n ? n + ' · ' + pname(p) : pname(p); }
    const el = $('#pl' + p);
    el.classList.toggle('active', !st.over && tm === p); el.classList.toggle('won', st.winner === p); el.classList.toggle('thinking', thinking === p);
    let s = '';
    if (st.winner === p) s = t('st.win');
    else if (thinking === p) s = t('thinking');
    else if (!st.over && tm === p) { s = t('st.turn'); if (pos.cnt[3 - p][E.C.FIVE] > 0) s += ' · ' + t('st.four'); }
    $('#status' + p).textContent = s;
  }
  if (settings.mode === 'online' && !lesson && !puzzle) olClocks(); else olClocksOff();
  $('#btnResign').disabled = !olLive();
  $('#evalCard').classList.toggle('hidden', !settings.eval && !rtLive() && settings.mode !== 'online');
  document.body.classList.toggle('rated-live', rtLive()); $('#evalCard').dataset.rtnote = t('rt.noEval');
  let ev = st.over ? { s: st.winner === P1 ? 1 : st.winner === P2 ? -1 : 0, kind: 'final', side: st.winner } : evals[cur];
  if (!ev && cur > 0 && evals[cur - 1]) ev = evals[cur - 1];
  $('#evalText').textContent = evalText(ev);
  $('#evalFill').style.width = (50 + 50 * (ev ? ev.s : 0)) + '%';
  renderGraph(); renderKifu(); hbInfo(st, tm, ev);
  $('#btnUndo').disabled = settings.mode === 'watch' || !canUndo();
  $('#btnHint').classList.toggle('on', settings.hint);
  $('#btnSound').classList.toggle('on', settings.sound);
  $('#btnNum').classList.toggle('on', !!settings.num);
  renderReview(); renderBrandSub();
  const mode = settings.mode === 'ai' ? 'AI ' + LV(levelFor(0)) + (rgame ? ' · ' + t('ng.rated') : '') : settings.mode === 'watch' ? `Lv.${settings.level} vs Lv.${settings.level2}` : settings.mode === 'online' ? t('ol.title') : t('ng.pvp');
  $('#infoLine').textContent = `${t('info.moves', { n: moves.length })}  ·  ${t('rule.' + rule)}  ·  ${mode}  ·  ← → ${t('info.browse')}`;
}
function evalAt(i) { const st = statusAt(i); if (st.over) return st.winner === P1 ? 1 : st.winner === P2 ? -1 : 0; return evals[i] ? evals[i].s : null; }
function renderGraph() {
  const svg = $('#graph'), W = 300, H = 74, n = Math.max(moves.length + 1, 40);
  const pts = []; let last = 0;
  for (let i = 0; i <= moves.length; i++) { let v = i <= cur + 1 || !reviewing ? evalAt(i) : evals[i] ? evals[i].s : null; if (v == null) v = last; last = v; pts.push([i / (n - 1) * W, H / 2 - v * (H / 2 - 4)]); }
  let path = '', area = '';
  if (pts.length) { path = 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L'); area = path + `L${pts[pts.length - 1][0].toFixed(1)},${H / 2}L0,${H / 2}Z`; }
  const x = cur / (n - 1) * W;
  svg.innerHTML = `<defs><clipPath id="ctop"><rect x="0" y="0" width="${W}" height="${H / 2}"/></clipPath><clipPath id="cbot"><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}"/></clipPath></defs>
    <path d="${area}" fill="rgba(40,40,44,.75)" clip-path="url(#ctop)"/><path d="${area}" fill="rgba(236,232,222,.55)" clip-path="url(#cbot)"/>
    <line class="zero" vector-effect="non-scaling-stroke" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/>
    <path d="${path}" fill="none" stroke="rgba(240,230,200,.85)" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
    <line class="cur" x1="${x}" x2="${x}" y1="0" y2="${H}" vector-effect="non-scaling-stroke"/>`;
}
function renderKifu() {
  const k = $('#kifu');
  if (!moves.length) { k.innerHTML = `<div class="empty">${t('kifu.empty')}</div>`; return; }
  const p0 = posAt(0).side; let html = '';
  for (let i = 0; i < moves.length; i++) {
    const side = (i % 2 === 0) === (p0 === P1) ? P1 : P2;
    const j = rvOpen && rv && !rv.running ? rvJudge(i) : null, qc = j && j.q ? (j.q === 'bad' ? ' q-bad' : ' q-dub') : '';
    html += `<button data-i="${i + 1}" class="${i + 1 === cur ? 'cur' : ''}${qc}" title="${j && j.q ? t('q.' + j.q) : ''}"><em>${i + 1}</em><i class="p${side}"></i>${sanOf(i)}</button>`;
  }
  k.innerHTML = html;
  const c = k.querySelector('.cur'); if (c) { const top = c.offsetTop - k.offsetTop; if (top < k.scrollTop || top > k.scrollTop + k.clientHeight - 24) k.scrollTop = top - k.clientHeight / 2; }
}
$('#kifu').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
(() => {
  const g = $('#graph'); let dragging = false;
  const idxAt = x => { const r = g.getBoundingClientRect(), n = Math.max(moves.length + 1, 40); return Math.max(0, Math.min(moves.length, Math.round((x - r.left) / r.width * (n - 1)))); };
  const go = x => { const i = idxAt(x); if (i !== cur) viewAt(i); };
  g.addEventListener('pointerdown', e => { if (lesson || puzzle) return; dragging = true; try { g.setPointerCapture(e.pointerId); } catch (_) {} go(e.clientX); e.preventDefault(); });
  g.addEventListener('pointermove', e => { if (dragging) go(e.clientX); });
  const end = e => { dragging = false; try { g.releasePointerCapture(e.pointerId); } catch (_) {} };
  g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
})();
let toastTimer = 0;
function toast(msg, ms = 1500, big) { const el = $('#toast'); el.textContent = msg; el.classList.toggle('big', !!big); el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms); }
function update(anim) { if (!anim) pend = -1; renderBoard(anim); renderInfo(); stSync(); }

// ====================================================================== input: tap / click an intersection
function pointAt(x, y) {
  const r = boardEl.getBoundingClientRect(), u = r.width / 16;
  const fx = (x - r.left) / u - 1, fy = (y - r.top) / u - 1, c = Math.round(fx), rr = Math.round(fy);
  if (c < 0 || c > 14 || rr < 0 || rr > 14) return -1;
  if (Math.hypot(fx - c, fy - rr) > 0.62) return -1;
  return (14 - rr) * N + c;
}
boardEl.addEventListener('pointerdown', e => {
  ctx(); if (e.button > 0) return;
  const m = pointAt(e.clientX, e.clientY); if (m < 0) { if (pend >= 0) { pend = -1; renderFx(); } return; }
  if (lesson && lesson.pick && !lesson.answered) { lessonAnswer(m); return; }
  if (!canHumanPlay()) { if (reviewing && !lesson && !puzzle) { if (settings.mode === 'online') viewAt(moves.length); else rsOpen(); } return; }
  onPoint(m);
});
boardEl.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const m = pointAt(e.clientX, e.clientY);
  if (m !== hover) { hover = m; if (canHumanPlay()) renderFx(); }
});
boardEl.addEventListener('pointerleave', () => { if (hover >= 0) { hover = -1; renderFx(); } });
function illegalReason(pos, m) {
  if (pos.at(m)) return '';
  if (!pos.openingOk(E.M2I[m])) return t('ill.open' + Math.min(pos.ply, 2));
  const f = pos.side === P1 ? pos.forbidden(m) : 0;
  if (f) return t('ill.forbid', { k: t('fb.k' + f) });
  return '';
}
function onPoint(m) {
  const pos = posAt(cur);
  if (pos.at(m)) { if (pend >= 0) { pend = -1; renderFx(); } return; }
  if (!pos.isLegal(m)) {
    // puzzle: a forbidden point for black is an obvious mistake (puzzle v2)
    if (puzzle && puzzle.state === 'play' && pos.side === P1 && pos.openingOk(E.M2I[m]) && pos.forbidden(m)) { pend = -1; pzFailBlunder(puzzle, m, 'forbid', pos.forbidden(m)); return; }
    const why = illegalReason(pos, m);
    if (why) { toast(why, 2400); if (pos.side === P1 && pos.forbidden(m)) { lessonMarksFlash(m); } }
    pend = -1; renderFx(); return;
  }
  if (confirmOn() && pend !== m) { pend = m; playTick(); renderFx(); return; }
  pend = -1;
  commit(m);
}
function lessonMarksFlash(m) { const d = mk('ng', m); setTimeout(() => d.remove(), 1200); }
function commit(m) {
  pend = -1; hover = -1;
  if (lesson) return lessonAnswer(m);
  if (puzzle) return puzzleMove(m);
  if (settings.mode === 'online') return netMove(m);
  playMove(m);
}

// ====================================================================== flow
function setRule(r) { rule = E.RULES.includes(r) ? r : 'renju'; stCache.clear(); }
function newGame(rated) {
  if (net) leaveOnlineGame();
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false;
  startPos = null;
  setRule(rated ? 'renju' : settings.rule);
  if (settings.mode === 'ai') humanColor = settings.color === 0 ? (Math.random() < 0.5 ? P1 : P2) : settings.color;
  rgame = null; coachQ = new Map(); coachPend = null;
  if (rated) { humanColor = Math.random() < 0.5 ? P1 : P2; rgame = Object.assign(rated, { ct: [RT_CLOCK.base, RT_CLOCK.base], t: Date.now() }); }
  moves = []; cur = 0; reviewing = false; evals = []; hintList = null; gameOverShown = false; pend = -1;
  hideOverlay('#resultOverlay');
  shownKey = ''; syncStones(0);
  update(false); save(); afterPosition();
}
// ---------------------------------------------------------------- coach: grades your moves in games against the AI
let coachQ = new Map(), coachPend = null, anaLast = null, coachTimer = 0;   // coachQ: ply index -> { q, list, m }
function coachOn() { return settings.coach && settings.mode === 'ai' && !rgame && !lesson && !puzzle; }
function gradeVals(best, mine, m) {
  const loss = sOfV(best.v) - sOfV(mine.v);
  if ((best.v > WINT && mine.v <= WINT) || (best.v >= -WINT && mine.v < -WINT) || loss >= 0.3) return 'bad';
  if (loss >= 0.12) return 'dubious';
  if (m === best.m || mine.v >= best.v - 20) return 'best';
  return 'good';
}
function coachShow(q) { const el = $('#coach'); el.className = 'coach show q-' + q; el.textContent = t('cq.' + q); clearTimeout(coachTimer); coachTimer = setTimeout(() => el.classList.remove('show'), 1700); }
function coachMove(idx, m) {
  if (!coachOn() || toMoveAt(idx) !== humanColor) return;
  coachPend = null;
  const key = keyOf(idx), list = anaCache.get(key) || (anaLast && anaLast.key === key ? anaLast.list : null);
  if (!list || !list.length) return;
  let best = list[0]; for (const e of list) if (e.v > best.v) best = e;
  const mine = list.find(e => e.m === m);
  // a move outside the AI's candidate list: graded once the next position has been analysed
  if (!mine) {
    const pend = coachPend = { idx, m, list, best }, after = moves.slice(0, idx).concat([m]);
    if (statusAt(idx).over) return;
    request('coach', { type: 'analyze', moves: after, time: 500 }).then(r => { if (r && r.list && coachPend === pend) coachResolve(idx + 1, r.list); });
    return;
  }
  const q = gradeVals(best, mine, m); coachQ.set(idx, { q, list, m }); coachShow(q);
}
function coachResolve(idx, list) {
  const c = coachPend; if (!c || c.idx + 1 !== idx || moves[c.idx] !== c.m || !list.length) return;
  coachPend = null;
  let b2 = -Infinity; for (const e of list) b2 = Math.max(b2, e.v);
  const mine = { m: c.m, v: -b2 }, q = gradeVals(c.best, mine, c.m);
  coachQ.set(c.idx, { q, list: c.list.concat([mine]), m: c.m }); coachShow(q);
}
function playMove(m) {
  coachMove(cur, m);
  if (rtLive()) { const side = toMoveAt(moves.length) - 1, now = Date.now(); rgame.ct[side] = Math.max(0, rgame.ct[side] - (rgame.paused ? 0 : now - rgame.t)) + RT_CLOCK.inc; rgame.paused = false; rgame.t = now; }
  moves = moves.slice(0, cur); moves.push(m); cur = moves.length; reviewing = false;
  evals.length = moves.length; hintList = null;
  animating = animOn(); setTimeout(() => { animating = false; boardEl.classList.toggle('can', canHumanPlay()); }, moveDur());
  update(true); save();
  const st = statusAt(cur);
  if (st.over) setTimeout(() => onGameEnd(st), moveDur() + 500);
  afterPosition();
}
function moveDur() { return animOn() ? 200 : 20; }
function afterPosition() { const tok = ++busyToken; analyzeCurrent(tok); maybeAI(tok); }
async function maybeAI(tok) {
  if (lesson || puzzle || reviewing || gameOver(cur)) return;
  const p = toMoveAt(cur); if (!isAIColor(p)) return;
  thinking = p; renderInfo(); boardEl.classList.remove('can');
  const t0 = Date.now();
  const res = await request('ai', { type: 'think', moves: moves.slice(0, cur), level: levelFor(p) });
  if (!res || tok !== busyToken) { if (tok === busyToken) { thinking = 0; renderInfo(); } return; }
  const wait = (settings.mode === 'watch' ? 650 : 380) - (Date.now() - t0);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  if (tok !== busyToken) return;
  thinking = 0;
  if (res.move === undefined || res.move < 0) { renderInfo(); return; }
  playMove(res.move);
}
async function analyzeCurrent(tok) {
  const idx = cur, key = keyOf(idx);
  if (gameOver(idx) || lesson || puzzle) { hintList = null; return; }
  if (rtLive() || settings.mode === 'online') { hintList = null; return; }
  if (!settings.eval && !settings.hint && !(coachOn() && (toMoveAt(idx) === humanColor || coachPend))) return;
  const mover = toMoveAt(idx);
  const apply = list => {
    if (keyOf(idx) !== key || !list || !list.length) return;
    anaLast = { key, list };
    const ev = evalFromList(list, mover); if (ev) evals[idx] = ev;
    if (cur === idx) { hintList = settings.hint ? list : null; renderFx(); renderInfo(); }
  };
  if (anaCache.has(key)) { apply(anaCache.get(key)); coachResolve(idx, anaCache.get(key)); return; }
  cancelWorker('ana');
  const res = await request('ana', { type: 'analyze', moves: moves.slice(0, idx), time: settings.hint ? 1600 : 900 }, m => apply(m.list));
  if (!res || res.error) return;
  anaCache.set(key, res.list); apply(res.list); coachResolve(idx, res.list); save();
}
function onGameEnd(st) {
  if (settings.mode === 'online') return;          // online: the result dialog comes from finishOnline()
  if (moves.length !== cur || gameOverShown) return;
  gameOverShown = true;
  const youWin = settings.mode === 'ai' && st.winner === humanColor, aiWin = settings.mode === 'ai' && st.winner && st.winner !== humanColor;
  playChime(!aiWin);
  if (youWin || (settings.mode === 'pvp' && st.winner)) confetti();
  $('#resultDisc').innerHTML = st.winner ? `<div class="pdisc p${st.winner}"></div>` : '';
  $('#resultTitle').textContent = st.draw ? t('res.draw') : youWin ? t('res.youWin') : aiWin ? t('res.aiWin') : t('res.pWin', { c: pname(st.winner) });
  let sub = t('res.why.' + st.why) + '<br>' + t('res.sub', { n: moves.length });
  if (rgame) {
    const rx = rtSettle(st);
    if (rx) sub += `<br>${rx.pl ? Placement.resHtml(rx.pl) : `<span class="rt-res">R ${rx.old} → <b>${rx.now}</b> (${rtD(rx.d)})</span>`} · ${rtRank(rx.now)}<br><small style="color:var(--muted)">${t('rt.opp', { lv: rtLvName(rgame.lv), r: rgame.or })}</small>`;
  } else if (settings.mode === 'ai') sub += '<br>' + t('res.vsr', { name: LV(settings.level) });
  $('#resultSub').innerHTML = sub;
  const mk = settings.mode === 'ai' && !rgame ? mistakeProblems() : [];
  $('#btnMistakes').classList.toggle('hidden', !mk.length); $('#btnMistakes').textContent = t('mk.btn', { n: mk.length });
  setTimeout(() => showOverlay('#resultOverlay'), 900);
}
function canUndo() {
  if (lesson || puzzle || rgame || settings.mode === 'online') return false;
  if (settings.mode === 'pvp') return cur > 0;
  if (settings.mode === 'ai') { for (let i = cur - 1; i >= 0; i--) if (toMoveAt(i) === humanColor) return true; return false; }
  return false;
}
function undo() {
  if (!canUndo()) return;
  busyToken++; cancelWorker('ai'); thinking = 0; animating = false;
  let i = cur - 1;
  if (settings.mode === 'ai') { while (i > 0 && toMoveAt(i) !== humanColor) i--; }
  moves = moves.slice(0, i); cur = i; reviewing = false; evals.length = i + 1; hintList = null; gameOverShown = false;
  hideOverlay('#resultOverlay'); update(false); save(); afterPosition();
}
function viewAt(i) {
  if (lesson || puzzle) return;
  i = Math.max(0, Math.min(moves.length, i)); if (i === cur) return;
  busyToken++; cancelWorker('ai'); thinking = 0; animating = false;
  const step = i === cur + 1;
  cur = i; reviewing = i !== moves.length; hintList = null;
  update(step); afterPosition();
}
function resumeHere() { if (!reviewing) return; if (rgame) { viewAt(moves.length); return; } moves = moves.slice(0, cur); evals.length = cur + 1; reviewing = false; gameOverShown = false; update(false); save(); afterPosition(); }
function showOverlay(s) { $(s).classList.add('show'); }
function hideOverlay(s) { $(s).classList.remove('show'); }
function confetti() {
  if (!animOn()) return;
  const cols = ['#e6cd8c', '#fff6dc', '#c8ced8', '#ffffff', '#b39249', '#222'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length];
    c.style.setProperty('--dx', (Math.random() - 0.5) * 200 + 'px'); c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    c.style.animationDuration = 1.8 + Math.random() * 1.6 + 's'; c.style.animationDelay = Math.random() * 0.4 + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 4200);
  }
}

// ====================================================================== controls
$('#btnNew').onclick = () => (lesson || puzzle) ? openNewDialog() : rsOpen();
$('#btnUndo').onclick = undo;
$('#btnHint').onclick = () => {
  if (rtLive()) { toast(t('rt.noEval')); return; }
  if (settings.mode === 'online') return;
  settings.hint = !settings.hint; save();
  if (!settings.hint) { hintList = null; renderFx(); renderInfo(); }
  else { const k = keyOf(cur); if (anaCache.has(k)) { hintList = anaCache.get(k); renderFx(); } else analyzeCurrent(busyToken); renderInfo(); }
};
$('#btnSound').onclick = () => { settings.sound = !settings.sound; save(); renderInfo(); if (settings.sound) playTick(); };
$('#btnNum').onclick = () => { settings.num = !settings.num; save(); renderBoard(false); renderInfo(); };
$('#btnLesson').onclick = () => openLessons();
$('#btnPuzzle').onclick = () => openPuzzles();
$('#btnRules').onclick = () => openRules('basic');
// tabs of the one study dialog (rules > lessons > openings > puzzles); switching is instant so the dialog does not flicker
const inst = on => ['#rulesOverlay', '#lessonOverlay', '#puzzleOverlay'].forEach(x => $(x).classList.toggle('instant', on));
function selTab(v) { document.querySelectorAll('.ls-tabs').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === v))); }
document.querySelectorAll('.ls-tabs').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  inst(true);
  if (b.dataset.v !== 'rules' && $('#rulesOverlay').classList.contains('show')) { if (rulesTour) rulesTour.stop(); $('#rulesOverlay').classList.remove('show'); }
  if (b.dataset.v === 'rules' && !$('#rulesOverlay').classList.contains('show')) openRules('basic');
  if (b.dataset.v === 'puzzle' && !$('#puzzleOverlay').classList.contains('show')) { $('#lessonOverlay').classList.remove('show'); openPuzzles(); }
  if (b.dataset.v === 'lesson') { $('#puzzleOverlay').classList.remove('show'); openLessons(); }
  if (b.dataset.v === 'open') { $('#puzzleOverlay').classList.remove('show'); openOpenings(); }
  setTimeout(() => inst(false), 150);
}));
$('#btnResume').onclick = resumeHere;
$('#btnLatest').onclick = () => viewAt(moves.length);
$('#btnReview').onclick = () => hideOverlay('#resultOverlay');
$('#btnAgain').onclick = () => {
  if (net) {     // online: in a room game ask for a rematch (or accept the opponent's request); otherwise back to the online menu
    const g = net.done && net.game;
    if (olRoomGame(g) && !g.post && !g.next) { if (!(g.again && g.again.by === Online.uid)) Online.requestRematch(net.gid).catch(err => { console.warn(err); toast(t('ol.error'), 2000); }); return; }
    hideOverlay('#resultOverlay'); openOnline(); return;
  }
  hideOverlay('#resultOverlay'); if (rgame) rtStart(); else newGame();
};
// game record as text: "1.h8 2.h9 ..." with a header
function recordText() {
  const st = statusAt(moves.length), res = st.over ? (st.winner === P1 ? '1-0' : st.winner === P2 ? '0-1' : '1/2-1/2') : '*';
  const d = new Date(), date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const bn = net && net.game ? String(net.game.wn).replace(/"/g, '') : settings.mode === 'ai' ? (humanColor === P1 ? 'You' : 'AI ' + LV(settings.level)) : 'Black';
  const wn = net && net.game ? String(net.game.bn).replace(/"/g, '') : settings.mode === 'ai' ? (humanColor === P2 ? 'You' : 'AI ' + LV(settings.level)) : 'White';
  let s = ''; for (let i = 0; i < moves.length; i++) s += (i ? ' ' : '') + (i + 1) + '.' + sanOf(i);
  return `[Event "World Board Game Atlas — Gomoku"]\n[Date "${date}"]\n[Rule "${rule}"]\n[Black "${bn}"]\n[White "${wn}"]\n[Result "${res}"]\n\n${s} ${res}`;
}
$('#btnCopy').onclick = async () => {
  if (!moves.length) { toast(t('nokifu')); return; }
  try { await navigator.clipboard.writeText(recordText()); toast(t('copied')); } catch (e) { toast(t('copyFail'), 2000); }
};
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && ![...document.querySelectorAll('.overlay.show')].some(o => o.id !== 'resultOverlay')) { e.preventDefault(); undo(); return; }
  if (document.querySelector('.overlay.show')) { if (e.key === 'Escape') document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); return; }
  if (e.key === 'Escape') { pend = -1; renderFx(); return; }
  if (e.key === 'n' || e.key === 'N') $('#btnNum').click();
});

// ---------------------------------------------------------------- small board diagrams (rules, lessons, openings)
// o: { b: [names], w: [names], x: [names] forbidden marks, o: [names] circles, d: [names] dots, n: {name: label}, line: [a, b], crop: [c0, r0, w, h] }
function miniBoard(o) {
  o = o || {};
  const P = x => typeof x === 'number' ? x : sqOf(x);
  const all = [...(o.b || []), ...(o.w || []), ...(o.x || []), ...(o.o || []), ...(o.d || [])].map(P).filter(m => m >= 0);
  let c0, r0, w, h;
  if (o.crop) [c0, r0, w, h] = o.crop;
  else if (o.full) { c0 = 0; r0 = 0; w = 15; h = 15; }
  else {
    let a = 14, b = 0, c = 14, d = 0;
    for (const m of all) { a = Math.min(a, cx(m)); b = Math.max(b, cx(m)); c = Math.min(c, cy(m)); d = Math.max(d, cy(m)); }
    if (!all.length) { a = 5; b = 9; c = 5; d = 9; }
    w = Math.max(7, b - a + 3); h = Math.max(7, d - c + 3); w = h = Math.max(w, h);
    c0 = Math.max(0, Math.min(15 - w, Math.round((a + b) / 2 - (w - 1) / 2))); r0 = Math.max(0, Math.min(15 - h, Math.round((c + d) / 2 - (h - 1) / 2)));
  }
  const u = 22, pad = 16, W = (w - 1) * u + pad * 2, H = (h - 1) * u + pad * 2;
  const X = m => pad + (cx(m) - c0) * u, Y = m => pad + (r0 + h - 1 - cy(m)) * u;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="mb"><defs><radialGradient id="mgB" cx="34%" cy="28%" r="70%"><stop offset="0" stop-color="#7a7e86"/><stop offset=".3" stop-color="#2d3035"/><stop offset="1" stop-color="#050505"/></radialGradient><radialGradient id="mgW" cx="34%" cy="28%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#eeeae2"/><stop offset="1" stop-color="#bdb6a6"/></radialGradient></defs>`;
  s += `<rect width="${W}" height="${H}" rx="8" fill="#dcae62" stroke="rgba(201,169,97,.6)"/>`;
  for (let k = 0; k < w; k++) { const x = pad + k * u, edge = c0 + k === 0 || c0 + k === 14; s += `<line x1="${x}" y1="${pad - (r0 + h - 1 < 14 ? 8 : 0)}" x2="${x}" y2="${H - pad + (r0 > 0 ? 8 : 0)}" stroke="#4a3418" stroke-width="${edge ? 1.8 : 1}"/>`; }
  for (let k = 0; k < h; k++) { const y = pad + k * u, edge = r0 + h - 1 - k === 0 || r0 + h - 1 - k === 14; s += `<line x1="${pad - (c0 > 0 ? 8 : 0)}" y1="${y}" x2="${W - pad + (c0 + w - 1 < 14 ? 8 : 0)}" y2="${y}" stroke="#4a3418" stroke-width="${edge ? 1.8 : 1}"/>`; }
  for (const [c, r] of [[7, 7], [3, 3], [11, 3], [3, 11], [11, 11]]) if (c >= c0 && c < c0 + w && r >= r0 && r < r0 + h) s += `<circle cx="${pad + (c - c0) * u}" cy="${pad + (r0 + h - 1 - r) * u}" r="2.6" fill="#4a3418"/>`;
  for (const m of (o.d || []).map(P)) s += `<circle cx="${X(m)}" cy="${Y(m)}" r="4" fill="rgba(40,25,8,.55)"/>`;
  if (o.line) { const a = P(o.line[0]), b = P(o.line[1]); s += `<line x1="${X(a)}" y1="${Y(a)}" x2="${X(b)}" y2="${Y(b)}" stroke="rgba(255,210,80,.85)" stroke-width="5" stroke-linecap="round"/>`; }
  const lab = o.n || {};
  for (const [cls, list] of [['b', o.b], ['w', o.w]]) for (const nm of list || []) {
    const m = P(nm); s += `<circle cx="${X(m)}" cy="${Y(m)}" r="${u * 0.46}" fill="url(#mg${cls === 'b' ? 'B' : 'W'})" stroke="${cls === 'b' ? '#000' : '#9c9484'}" stroke-width=".6"/>`;
    const L = lab[nm]; if (L !== undefined) s += `<text x="${X(m)}" y="${Y(m) + 4}" font-size="11" font-weight="700" text-anchor="middle" font-family="JetBrains Mono,monospace" fill="${cls === 'b' ? '#f2ede4' : '#1b1712'}">${L}</text>`;
  }
  for (const m of (o.o || []).map(P)) s += `<circle cx="${X(m)}" cy="${Y(m)}" r="${u * 0.42}" fill="none" stroke="#1d9b62" stroke-width="2.6"/>`;
  for (const m of (o.x || []).map(P)) s += `<path d="M${X(m) - 6},${Y(m) - 6}L${X(m) + 6},${Y(m) + 6}M${X(m) + 6},${Y(m) - 6}L${X(m) - 6},${Y(m) + 6}" stroke="#d8392a" stroke-width="3" stroke-linecap="round"/>`;
  for (const nm in lab) { const m = P(nm); if ((o.b || []).includes(nm) || (o.w || []).includes(nm)) continue; s += `<text x="${X(m)}" y="${Y(m) + 4}" font-size="12" font-weight="800" text-anchor="middle" font-family="JetBrains Mono,monospace" fill="#b42318">${lab[nm]}</text>`; }
  return s + '</svg>';
}
// ---------------------------------------------------------------- rules: hands-on step-by-step tutorial (shared/ruletour.js)
// Only what is needed to play: placing stones, five in a row, blocking a four, threes, freestyle vs standard (overline),
// the renju forbidden moves for black (3-3, 4-4, overline; 4-3 is allowed) and the renju opening. Tactics -> lessons.
// Each page builds a small board from the engine (rules, forbidden points, five detection all come from E.Pos).
function ruPos(r, b, w, side, fresh) {
  const p = new E.Pos(r);
  for (const m of toCells(b)) { if (p.side !== P1) p.pass(); p.make(m); }
  for (const m of toCells(w)) { if (p.side !== P2) p.pass(); p.make(m); }
  if (p.side !== (side || P1)) p.pass();
  p.fresh = !!fresh;
  return p;
}
// small interactive board: o = { rule, b, w, side, fresh, crop, onPlay(m, B) }; B.play(m) puts a stone for the side to move
function ruBoard(api, o) {
  const pos = ruPos(o.rule, o.b, o.w, o.side, o.fresh), crop = o.crop || [3, 3, 9, 9];
  const B = { pos, x: [], o: [], d: [], lock: false, n: {} };
  const stones = c => { const out = []; for (let m = 0; m < 225; m++) if (pos.at(m) === c) out.push(m); return out; };
  B.draw = () => {
    if (!api.alive()) return;
    const st = pos.status(), n = {}; for (const k in B.n) n[sqName(+k)] = B.n[k];
    api.board.innerHTML = miniBoard({ b: stones(P1).map(sqName), w: stones(P2).map(sqName), x: B.x, o: B.o, d: B.d, crop, line: st.over && st.line ? [st.line[0], st.line[st.line.length - 1]] : null, n });
    const svg = api.board.querySelector('svg'); if (svg) svg.setAttribute('dir', 'ltr');
  };
  B.play = m => { pos.make(m); sStone(); B.draw(); };
  B.undo = () => { pos.unmake(); B.draw(); };
  api.board.onclick = e => {
    const svg = api.board.querySelector('svg'); if (!svg || B.lock) return;
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, k = vb.width / r.width;
    const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k, u = 22, pad = 16;
    const c = Math.round((x - pad) / u), rr = Math.round((y - pad) / u);
    if (c < 0 || c >= crop[2] || rr < 0 || rr >= crop[3] || Math.hypot((x - pad) / u - c, (y - pad) / u - rr) > 0.6) return;
    const m = (crop[1] + crop[3] - 1 - rr) * N + crop[0] + c;
    if (pos.at(m)) return;
    o.onPlay(m, B);
  };
  B.draw();
  return B;
}
const ruFive = (pos, c) => { const out = []; for (let m = 0; m < 225; m++) if (!pos.at(m) && pos.cls[c][E.M2I[m]] === E.C.FIVE) out.push(m); return out; };
const RU_PAGES = [
  // common spec: the first page introduces the game (history / how to win / culture); the plain rules entries open here
  { id: 'intro', title: () => t('ri.t'), body: () => '', html: () => RuleTour.intro({ lang: LANG, img: '../images/atlas/gomoku.webp', origin: t('ri.origin'), players: t('ri.players'), time: t('ri.time'), history: t('ri.hist'), win: t('ri.win'), culture: t('ri.cult') }) },
  { id: 'place', title: () => t('ru.place.t'), body: () => t('ru.place.b'), task: () => t('ru.place.task'),
    setup(api) {
      let k = 0;
      ruBoard(api, { rule: 'free', b: '', w: '', side: P1, onPlay(m, B) {
        B.play(m); k++; B.lock = true;
        // white answers next to the black stone
        api.timer(() => {
          const near = []; for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const c = cx(m) + dx, r = cy(m) + dy; if (c >= 3 && c <= 11 && r >= 3 && r <= 11 && !B.pos.at(r * N + c)) near.push(r * N + c); }
          if (near.length) B.play(near[Math.floor(Math.random() * near.length)]);
          B.lock = false;
          if (k >= 2) { B.lock = true; api.ok(t('ru.place.ok')); }
        }, 450);
      } });
    } },
  { id: 'five', title: () => t('ru.five.t'), body: () => t('ru.five.b'), task: () => t('ru.five.task'),
    setup(api) {
      ruBoard(api, { rule: 'free', b: 'f6 g7 h8 i9', w: 'e5 g6 i8 h10', side: P1, onPlay(m, B) {
        B.lock = true; B.play(m);
        if (B.pos.status().winner === P1) api.ok(t('ru.five.ok')); else api.ng(t('ru.five.ng'));
      } });
    } },
  { id: 'block', title: () => t('ru.block.t'), body: () => t('ru.block.b'), task: () => t('ru.block.task'),
    setup(api) {
      ruBoard(api, { rule: 'free', b: 'e9 g8 h7 f7', w: 'f9 g9 h9 i9', side: P1, onPlay(m, B) {
        B.lock = true; B.play(m);
        const f = ruFive(B.pos, P2);
        if (!f.length) { api.ok(t('ru.block.ok')); return; }
        api.timer(() => { B.play(f[0]); api.ng(t('ru.block.ng')); }, 450);
      } });
    } },
  { id: 'three', title: () => t('ru.three.t'), body: () => t('ru.three.b'), task: () => t('ru.three.task'),
    setup(api) {
      ruBoard(api, { rule: 'free', b: 'f8 g8 h8', w: 'g7 h9 f9', side: P1, onPlay(m, B) {
        B.lock = true; B.play(m);
        const f = ruFive(B.pos, P1);
        if (f.length < 2) { api.ng(t('ru.three.ng')); return; }
        B.o = f.map(sqName); B.draw(); api.ok(t('ru.three.ok'), { next: false });
        // white blocks one end, black makes five at the other; then on to the next page
        api.timer(() => { B.o = []; B.play(f[0]); api.timer(() => { B.play(f[1]); api.next(); }, 650); }, 900);
      } });
    } },
  { id: 'overline', title: () => t('ru.ol.t'), body: () => t('ru.ol.b'), task: () => t('ru.ol.task'),
    setup(api) {
      ruBoard(api, { rule: 'standard', b: 'd8 f8 g8 h8 i8', w: 'f7 g9 h7 e9', side: P1, onPlay(m, B) {
        B.lock = true; B.play(m);
        if (B.pos.status().winner === P1) { api.ok(t('ru.ol.ok')); return; }
        let six = false; for (let d = 0; d < 4 && !six; d++) { const [dx, dy] = [[1, 0], [0, 1], [1, 1], [1, -1]][d]; let n = 1; for (const s of [1, -1]) { let c = cx(m) + s * dx, r = cy(m) + s * dy; while (c >= 0 && c < N && r >= 0 && r < N && B.pos.at(r * N + c) === P1) { n++; c += s * dx; r += s * dy; } } six = n >= 6; }
        api.ng(t(six ? 'ru.ol.ng6' : 'ru.ol.ng'), { delay: six ? 3600 : 2400 });
      } });
    } },
  { id: 'f33', title: () => t('ru.f33.t'), body: () => t('ru.f33.b'), task: () => t('ru.f33.task'),
    setup(api) {
      ruBoard(api, { rule: 'renju', b: 'g8 i8 h9 h10', w: 'j10 e7 k8', side: P1, onPlay(m, B) {
        B.lock = true;
        if (B.pos.forbidden(m)) { B.x = [sqName(m)]; B.draw(); api.ok(t('ru.f33.ok')); }
        else { B.play(m); api.ng(t('ru.f33.ng')); }
      } });
    } },
  { id: 'f44', title: () => t('ru.f44.t'), body: () => t('ru.f44.b'), task: () => t('ru.f44.task'),
    setup(api) {
      const found = new Set();
      ruBoard(api, { rule: 'renju', b: 'e8 f8 g8 h9 h10 h11 d4 e4 f4 h4 i4', w: 'd8 h12 c4 j4 k10 e11', side: P1, crop: [2, 3, 9, 9], onPlay(m, B) {
        const f = B.pos.forbidden(m);
        if (f) {
          if (found.has(m)) return;
          found.add(m); B.x = [...found].map(sqName); B.draw();
          if (found.size >= 2) { B.lock = true; api.ok(t('ru.f44.ok')); } else api.say(t('ru.f44.found', { k: t('fb.k' + f) }), 'ok');
        } else { B.lock = true; B.play(m); api.timer(() => { B.undo(); B.lock = false; api.say(t('ru.f44.ng'), 'ng'); }, 700); }
      } });
    } },
  { id: 'f43', title: () => t('ru.f43.t'), body: () => t('ru.f43.b'), task: () => t('ru.f43.task'),
    setup(api) {
      ruBoard(api, { rule: 'renju', b: 'e8 f8 g8 h9 h10', w: 'd8 i11 g9 j9 f10', side: P1, onPlay(m, B) {
        B.lock = true; B.play(m);
        const f = ruFive(B.pos, P1);
        let three = false; if (f.length === 1) for (let q = 0; q < 225 && !three; q++) if (!B.pos.at(q) && B.pos.cls[P1][E.M2I[q]] === E.C.F4 && !B.pos.forbidden(q)) three = true;
        if (f.length !== 1 || !three) { api.ng(t('ru.f43.ng')); return; }
        api.ok(t('ru.f43.ok'), { next: false });   // the replay below plays out first, then api.next()
        // white blocks the four; black turns the three into a straight four; white blocks one end; black makes five
        const step = () => {
          if (B.pos.status().over) { api.next(); return; }
          const side = B.pos.side, f5 = ruFive(B.pos, side), fo = ruFive(B.pos, 3 - side);
          let q = f5.length ? f5[0] : fo.length ? fo[0] : -1;
          if (q < 0) for (let k = 0; k < 225; k++) if (!B.pos.at(k) && B.pos.cls[side][E.M2I[k]] === E.C.F4 && !B.pos.forbidden(k)) { q = k; break; }
          if (q < 0) { api.next(); return; }
          B.play(q); api.timer(step, 650);
        };
        api.timer(step, 900);
      } });
    } },
  { id: 'open', title: () => t('ru.open.t'), body: () => t('ru.open.b'), task: () => ruOpenStep ? t('ru.open.task3') : t('ru.open.task1'),
    setup(api) {
      ruOpenStep = 0; api.say('');
      ruBoard(api, { rule: 'renju', b: '', w: '', side: P1, fresh: true, onPlay(m, B) {
        if (!B.pos.isLegal(m)) { api.say(t('ill.open' + Math.min(B.pos.ply, 2)), 'ng'); return; }
        B.lock = true; B.d = []; B.play(m); B.n[m] = B.pos.ply;
        if (B.pos.ply === 1) {
          api.say('');
          api.timer(() => {
            const w = 8 * N + 7 + (Math.random() < 0.5 ? 0 : 1); B.play(w); B.n[w] = 2;
            for (let q = 0; q < 225; q++) if (!B.pos.at(q) && B.pos.isLegal(q)) B.d.push(sqName(q));
            B.draw(); ruOpenStep = 1; B.lock = false; api.say('');
          }, 500);
        } else { B.draw(); api.ok(t('ru.open.ok')); }
      } });
    } },
];
let ruOpenStep = 0, rulesTour = null;
function rulesTourGet() {
  if (rulesTour || !window.RuleTour) return rulesTour;
  rulesTour = RuleTour.create({
    mount: '#rulesBody', store: STORE + '-rules-v2', lang: () => LANG, pages: RU_PAGES,
    close: () => hideOverlay('#rulesOverlay'),
    play: () => { hideOverlay('#rulesOverlay'); openNewDialog(); },
    lessons: () => { inst(true); hideOverlay('#rulesOverlay'); openLessons().then(() => setTimeout(() => inst(false), 150)); },
    sound: k => { if (!settings.sound) return; const a = ctx(); if (!a) return; if (k === 'ok') sThreat(); else tone(a, a.currentTime, 220, 0, 0.18, 0.05, 'sine'); },
  });
  return rulesTour;
}
// tab (old entry points): 'renju' opens the forbidden-move pages, 'open' the renju opening, anything else the first page
function openRules(tab) {
  const T = rulesTourGet(); if (!T) return;
  const i = tab === 'renju' ? RU_PAGES.findIndex(p => p.id === 'f33') : tab === 'open' ? RU_PAGES.findIndex(p => p.id === 'open') : 0;
  selTab('rules');
  // the rules are the first tab of the lessons dialog: replace whichever tab is showing
  const swap = ['#lessonOverlay', '#puzzleOverlay'].some(x => $(x).classList.contains('show'));
  if (swap) inst(true);
  ['#lessonOverlay', '#puzzleOverlay'].forEach(hideOverlay);
  showOverlay('#rulesOverlay'); T.open(i);
  if (swap) setTimeout(() => inst(false), 150);
}
function renderRules() { if (rulesTour) rulesTour.render(); }
$('#rulesClose').onclick = () => { if (rulesTour) rulesTour.stop(); hideOverlay('#rulesOverlay'); };

// ---------------------------------------------------------------- new game dialog
let draft = {};
function levelLabelHTML(v) { return `${LV(v)}<small>${LVD(v)}</small>`; }
function segSync() {
  document.querySelectorAll('#segMode button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.mode));
  document.querySelectorAll('#segColor button').forEach(b => b.classList.toggle('sel', +b.dataset.v === draft.color));
  document.querySelectorAll('#segRule button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.rule));
  const m = draft.mode, game = m === 'ai' || m === 'pvp' || m === 'watch', ol = m === 'online';
  $('#fRatedInfo').classList.toggle('hidden', m !== 'rated');
  if (m === 'rated') $('#rtStats').innerHTML = rtStatsHtml();
  $('#fRule').classList.toggle('hidden', !game);
  $('#ruleNote').textContent = t('rule.' + draft.rule + '.note');
  $('#fColor').classList.toggle('hidden', m !== 'ai');
  $('#fLevel').classList.toggle('hidden', !(m === 'ai' || m === 'watch'));
  $('#fLevel2').classList.toggle('hidden', m !== 'watch');
  $('#fDisplay').classList.toggle('hidden', !game);
  $('#fInfo').classList.toggle('hidden', game || m === 'rated');
  $('#fInfoText').textContent = m === 'lesson' ? t('ls.desc') : m === 'puzzle' ? t('pz.desc') : ol ? t('ol.desc') : '';
  $('#btnStart').textContent = m === 'lesson' ? t('ng.toLessons') : m === 'puzzle' ? t('ng.toPuzzles') : m === 'rated' ? t('rt.start') : ol ? t('ng.toOnline') : t('start');
  $('#levelLabel').textContent = m === 'watch' ? t('ng.level1') : t('ng.level');
  $('#levelRange').value = draft.level; $('#levelName').innerHTML = levelLabelHTML(draft.level);
  $('#levelRange2').value = draft.level2; $('#levelName2').innerHTML = levelLabelHTML(draft.level2);
}
function openNewDialog() {
  draft = { mode: lesson ? 'lesson' : puzzle ? 'puzzle' : rgame && settings.mode === 'ai' ? 'rated' : net ? 'online' : settings.mode, color: settings.color, level: settings.level, level2: settings.level2, rule: settings.rule };
  $('#optEval').checked = settings.eval; $('#optLast').checked = settings.last; $('#optAnim').checked = settings.anim; $('#optThreat').checked = settings.threat; $('#optCoach').checked = settings.coach;
  $('#optForbid').checked = settings.forbid; $('#optNum').checked = !!settings.num; $('#optConfirm').checked = confirmOn();
  segSync(); showOverlay('#newOverlay');
}
$('#segMode').onclick = e => { const b = e.target.closest('button'); if (b) { draft.mode = b.dataset.v; segSync(); } };
$('#segColor').onclick = e => { const b = e.target.closest('button'); if (b) { draft.color = +b.dataset.v; segSync(); } };
$('#segRule').onclick = e => { const b = e.target.closest('button'); if (b) { draft.rule = b.dataset.v; segSync(); } };
$('#levelRange').oninput = e => { draft.level = +e.target.value; segSync(); };
$('#levelRange2').oninput = e => { draft.level2 = +e.target.value; segSync(); };
$('#btnCancelNew').onclick = () => hideOverlay('#newOverlay');
$('#btnStart').onclick = () => {
  hideOverlay('#newOverlay');
  if (draft.mode === 'online') { openOnline(); return; }
  if (draft.mode === 'lesson') { openLessons(); return; }
  if (draft.mode === 'puzzle') { openPuzzles(); return; }
  exitSpecial();
  if (draft.mode === 'rated') { rtStart(); return; }
  const cf = $('#optConfirm').checked;
  Object.assign(settings, { mode: draft.mode, rule: draft.rule, color: draft.color, level: draft.level, level2: draft.level2, eval: $('#optEval').checked, last: $('#optLast').checked, anim: $('#optAnim').checked, threat: $('#optThreat').checked, coach: $('#optCoach').checked, forbid: $('#optForbid').checked, num: $('#optNum').checked, confirm: cf === coarse() ? null : cf });
  newGame();
};

// ====================================================================== rated games against the AI (local Elo)
// Each AI level has a rating estimated from self-play (MODEL_CARD.md); the opponent is picked around the player's rating
// (mostly close, sometimes clearly stronger or weaker). Renju rules, 10 min + 5 s per move; leaving a game in progress loses it.
let rgame = null;
const RT_STORE = STORE + '-rated', RT_START = 1000, RT_CLOCK = { base: 600000, inc: 5000 };
// rating of each step on a kyu / dan scale (100 points per kyu: 15級 = 400-499 … 1級 = 1800-1899, then 200 per dan)
const RT_LV = [0, 450, 550, 650, 750, 850, 950, 1050, 1150, 1250, 1350, 1450, 1550, 1650, 1750, 1850, 2000, 2200, 2400, 2600, 2800];
function rtLoad() {
  let s = null; try { s = JSON.parse(localStorage.getItem(RT_STORE) || 'null'); } catch (e) {}
  if (!s || typeof s.r !== 'number' || !isFinite(s.r)) s = { r: RT_START, n: 0, w: 0, l: 0, d: 0, hist: [] };
  if (!Array.isArray(s.hist)) s.hist = [];
  if (s.k !== 2) { s.hist.forEach(h => { h.lv = lvMig(h.lv); }); s.k = 2; if (s.hist.length) rtStore(s); }   // history from the 10-level days
  return s;
}
function rtStore(s) { try { localStorage.setItem(RT_STORE, JSON.stringify(s)); } catch (e) {} }
const RT_CLASS = [800, 1100, 1400, 1700, 2000, 2300];
function rtRank(r) { const k = r < 400 ? t('rt.below') : r < 1900 ? t('lv.kyu', { n: 15 - Math.floor((r - 400) / 100) }) : t('lv.dan' + Math.min(9, 1 + Math.floor((r - 1900) / 200))); return t('rt.rank', { r: k }); }
const rtD = d => (d >= 0 ? '+' : '−') + Math.abs(d);
const rtLvName = lv => LV(lv);
function rtPick(r) {
  { const S0 = rtLoad(); if (Placement.on(S0)) return Placement.pick(S0, RT_LV.map((x, i) => [i, x]).slice(1)); }
  const u = Math.random(), v = Math.random();
  const off = u < 0.1 ? 150 + v * 150 : u < 0.2 ? -(150 + v * 150) : (v * 2 - 1) * 100, target = r + off;
  let lv = 1; for (let i = 1; i <= LV_MAX; i++) if (Math.abs(RT_LV[i] - target) < Math.abs(RT_LV[lv] - target)) lv = i;
  const diff = RT_LV[lv] - r;
  return { lv, or: RT_LV[lv], tag: diff > 150 ? 'up' : diff < -150 ? 'down' : 'even' };
}
function rtLive() { return !!(rgame && !rgame.over && !gameOverRaw() && !lesson && !puzzle && settings.mode === 'ai'); }
function gameOverRaw() { const st = statusAtRaw(moves.length); return st.over; }
function statusAtRaw(i) { const keep = rgame; rgame = null; try { return statusAt(i); } finally { rgame = keep; } }
function rtClockLeft(c) {   // c: 0 black, 1 white
  if (!rgame || !rgame.ct) return 0;
  let v = rgame.ct[c];
  if (rtLive() && !rgame.paused && toMoveAt(moves.length) - 1 === c) v -= Date.now() - rgame.t;
  return Math.max(0, v);
}
function fmtClock(ms) { const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); }
setInterval(() => {
  if (!rtLive()) return;
  if (rgame.paused) { if (window.CountTick) CountTick.reset('rt'); return; }   // restored on load: stopped until the first move
  const c = toMoveAt(moves.length) - 1, left = rtClockLeft(c);
  const el = $('#count' + (c + 1)); if (el) el.textContent = fmtClock(left);
  // time signal (shared/tick.js): the player's own clock, while it is running (their turn)
  if (window.CountTick) { if (c + 1 === humanColor) CountTick.feed(left, 'rt'); else CountTick.reset('rt'); }
  if (left <= 0) { rgame.over = { over: true, winner: c ? P1 : P2, why: 'time' }; busyToken++; cancelWorker('ai'); thinking = 0; save(); update(false); onGameEnd(rgame.over); }
}, 250);
// the result of a finished rated game is applied once (the game id is kept in the history, so a reload never counts twice)
function rtSettle(st) {
  const R = rgame; if (!R || !st || !st.over) return null;
  if (R.done) return R.done;
  const S = rtLoad(), prev = S.hist.find(h => h.id === R.id);
  if (prev) { R.done = { old: prev.r - prev.d, now: prev.r, d: prev.d }; return R.done; }
  const sc = st.draw || !st.winner ? 0.5 : st.winner === humanColor ? 1 : 0;
  const old = S.r, pl = Placement.on(S) ? Placement.record(S, R.or, sc) : null;   // 予備選: the first 3 games set the rating
  const K = S.n < 10 ? 48 : 24, Ex = 1 / (1 + Math.pow(10, (R.or - old) / 400));
  const now = pl ? pl.r : Math.max(0, Math.round(old + K * (sc - Ex)));
  S.r = now; S.n++; if (sc === 1) S.w++; else if (sc === 0) S.l++; else S.d++;
  S.hist.push({ id: R.id, t: Date.now(), lv: R.lv, or: R.or, s: sc, d: now - old, r: now, why: st.why, pl: pl ? pl.k : undefined });
  if (S.hist.length > 100) S.hist = S.hist.slice(-100);
  rtStore(S); R.done = { old, now, d: now - old, pl }; if (pl && pl.final) Placement.reveal(S, rtRank(now)); if (!R.over) R.over = st; save();
  return R.done;
}
function rtForfeit() {
  if (!rtLive()) return null;
  busyToken++; cancelWorker('ai'); thinking = 0;
  rgame.over = { over: true, winner: humanColor === P1 ? P2 : P1, why: 'abandon' };
  const x = rtSettle(rgame.over); save();
  if (x) toast(t('rt.abandoned', { o: x.old, n: x.now, d: rtD(x.d) }), 3200);
  return x;
}
function rtStart() {
  if (Placement.gate(rtLoad(), rtStore, () => rtStart())) return;
  const S = rtLoad(), pk = rtPick(S.r);
  exitSpecial();
  settings.mode = 'ai';
  newGame({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), lv: pk.lv, or: pk.or, my: S.r, tag: pk.tag });
  toast(t('rt.vs', { lv: rtLvName(pk.lv), r: pk.or, tag: t('rt.' + pk.tag) }), 4000);
}
function rtStatsHtml() {
  const S = rtLoad(), h = S.hist.slice(-10).reverse();
  let html = `<div class="rt-card"><div class="rt-head"><span class="rt-lbl">${t('rt.title')}</span><b class="rt-r">R ${S.r}</b><span class="rt-rank">${rtRank(S.r)}</span>${Placement.on(S) ? Placement.badge(S) : S.n < 10 ? `<span class="rt-prov">${t('rt.prov')}</span>` : ''}</div>`;
  html += `<div class="rt-rec">${S.n ? t('rt.rec', { n: S.n, w: S.w, l: S.l, d: S.d }) : t('rt.none')}</div>`;
  html += Placement.note(S);
  const sp = S.hist.slice(-30);
  if (sp.length >= 2) {
    const pts = [sp[0].r - sp[0].d].concat(sp.map(x => x.r)), lo = Math.min(...pts) - 10, hi = Math.max(...pts) + 10, W = 300, H = 34;
    const y = v => (H - 3 - (v - lo) / (hi - lo) * (H - 6)).toFixed(1);
    html += `<svg class="rt-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${y(pts[0])}" y2="${y(pts[0])}" vector-effect="non-scaling-stroke"/><polyline vector-effect="non-scaling-stroke" points="${pts.map((v, i) => (i / (pts.length - 1) * W).toFixed(1) + ',' + y(v)).join(' ')}"/></svg>`;
  }
  if (h.length) html += `<div class="rt-lbl2">${t('rt.recent')}</div><div class="rt-hist">` + h.map(x => { const c = x.s === 1 ? 'w' : x.s === 0 ? 'l' : 'd'; return `<span class="rt-chip ${c}" title="${rtLvName(x.lv)} · R${x.or}"><i>${t('rt.' + c.toUpperCase())}</i><b>${rtD(x.d)}</b></span>`; }).join('') + '</div>';
  return html + '</div>';
}
// buttons that leave a rated game in progress ask first (the game is then lost)
const RT_GUARD = '#btnNew, #btnLesson, #btnPuzzle, #btnStart, #dkAuto, .dk-join, .dk-watch, #olAuto, #olJoin, #btnPaste';
let rtPass = false;
document.addEventListener('click', e => {
  if (rtPass || !rtLive()) return;
  const b = e.target.closest && e.target.closest(RT_GUARD); if (!b || b.disabled) return;
  if (b.id === 'btnNew') { e.preventDefault(); e.stopImmediatePropagation(); rtConfirm(() => { update(false); onGameEnd(rgame.over); }); return; }
  e.preventDefault(); e.stopImmediatePropagation();
  rtConfirm(() => { gameOverShown = true; rtPass = true; try { b.click(); } finally { rtPass = false; } });
}, true);
function rtConfirm(after) {
  $('#rtConfirmHead').textContent = t('ng.rated'); $('#rtConfirmText').textContent = t('rt.abandonQ'); $('#rtConfirmYes').textContent = t('rt.abandonYes');
  showOverlay('#rtConfirm');
  $('#rtConfirmYes').onclick = () => { hideOverlay('#rtConfirm'); const x = rtForfeit(); renderInfo(); if (x) after(); };
}

// ====================================================================== lessons (20 points per problem, 75 to pass)
let LESSONS = null;
const lessonsReady = fetch('lessons.json?v=20261019a').then(r => r.json()).then(d => (LESSONS = d)).catch(() => null);
const LS_STORE = STORE + '-lessons', PZ_STORE = STORE + '-puzzles';
function lsProgress() { try { return JSON.parse(localStorage.getItem(LS_STORE) || '{}'); } catch (e) { return {}; } }
function pzProgress() { try { return JSON.parse(localStorage.getItem(PZ_STORE) || '{}'); } catch (e) { return {}; } }
let introIdx = 0, savedGame = null;
function stashGame() { olDetach(); if (!lesson && !puzzle) savedGame = { moves, cur, evals: evals.slice(), humanColor, rule }; }
function exitSpecial() {
  if (!lesson && !puzzle) return;
  lesson = null; puzzle = null; lessonMarks = []; labelList = null;
  document.body.classList.remove('in-lesson', 'in-puzzle');
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false;
  startPos = null;
  if (savedGame) { moves = savedGame.moves; cur = savedGame.cur; evals = savedGame.evals; humanColor = savedGame.humanColor; setRule(savedGame.rule); savedGame = null; }
  else { moves = []; cur = 0; evals = []; setRule(settings.rule); }
  shownKey = ''; syncStones(0);
  reviewing = cur !== moves.length; hintList = null; gameOverShown = gameOver(moves.length);
}
function quitSpecial() { exitSpecial(); update(false); afterPosition(); }
function showLessonView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
// small flat board picture for list cards (no gradients / ids, so any number can be on a page)
function thumbSvg(b, w, o) {
  o = o || {};
  const P = x => typeof x === 'number' ? x : sqOf(x), B = toCells(b).map(P), W = toCells(w).map(P), all = B.concat(W);
  let c0, r0, n;
  if (o.crop) [c0, r0, n] = o.crop;
  else {
    let a = 14, bb = 0, c = 14, d = 0;
    for (const m of all) { a = Math.min(a, cx(m)); bb = Math.max(bb, cx(m)); c = Math.min(c, cy(m)); d = Math.max(d, cy(m)); }
    if (!all.length) { a = 5; bb = 9; c = 5; d = 9; }
    n = Math.min(15, Math.max(o.min || 7, bb - a + 3, d - c + 3));
    c0 = Math.max(0, Math.min(15 - n, Math.round((a + bb) / 2 - (n - 1) / 2))); r0 = Math.max(0, Math.min(15 - n, Math.round((c + d) / 2 - (n - 1) / 2)));
  }
  const u = 10, pad = 7, S = (n - 1) * u + pad * 2, X = m => pad + (cx(m) - c0) * u, Y = m => pad + (r0 + n - 1 - cy(m)) * u;
  let h = `<svg viewBox="0 0 ${S} ${S}" aria-hidden="true"><rect width="${S}" height="${S}" rx="6" fill="#d9a95c"/><path d="`;
  for (let k = 0; k < n; k++) { const p = pad + k * u; h += `M${p} 0V${S}M0 ${p}H${S}`; }
  h += `" stroke="#6b4a22" stroke-width=".7" opacity=".55"/>`;
  if (7 >= c0 && 7 < c0 + n && 7 >= r0 && 7 < r0 + n) h += `<circle cx="${pad + (7 - c0) * u}" cy="${pad + (r0 + n - 1 - 7) * u}" r="1.6" fill="#6b4a22"/>`;
  const lab = o.n || {};
  for (const [L, col] of [[B, 1], [W, 2]]) for (const m of L) {
    if (cx(m) < c0 || cx(m) >= c0 + n || cy(m) < r0 || cy(m) >= r0 + n) continue;
    h += `<circle cx="${X(m)}" cy="${Y(m)}" r="4.6" fill="${col === 1 ? '#15130f' : '#f4efe4'}" stroke="${col === 1 ? '#000' : '#8f8676'}" stroke-width=".6"/>`;
    const l = lab[sqName(m)]; if (l !== undefined) h += `<text x="${X(m)}" y="${Y(m) + 2.3}" font-size="6.4" font-weight="700" text-anchor="middle" font-family="JetBrains Mono,monospace" fill="${col === 1 ? '#f2ede4' : '#1b1712'}">${l}</text>`;
  }
  if (o.mark !== undefined) { const m = P(o.mark); h += `<circle cx="${X(m)}" cy="${Y(m)}" r="5.6" fill="none" stroke="#e8463a" stroke-width="1.3"/>`; }
  return h + '</svg>';
}
const plainText = html => String(html || '').replace(/<br\s*\/?>|<\/p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const lxBar = (p, cls) => `<span class="lx-bar ${cls || ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span>`;
let lsCourseSel = '', opKindSel = 'direct';
// course icons (SVG so they read clearly at any size): five in a row / forbidden point / crossed swords
const LS_ICON = {
  basics: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><circle cx="3.2" cy="20.8" r="2.5"/><circle cx="7.6" cy="16.4" r="2.5"/><circle cx="12.0" cy="12.0" r="2.5"/><circle cx="16.4" cy="7.6" r="2.5"/><circle cx="20.8" cy="3.2" r="2.5"/></g></svg>',
  renju: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M3 12h18" stroke="currentColor" stroke-width="1.2" opacity=".45"/><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  tactics: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><g transform="rotate(45 12 12) scale(.92) translate(1 1)"><path d="M12 -1.5l2 3V14.5h-4V1.5z"/><rect x="6.5" y="14.5" width="11" height="2.4" rx="1.2"/><rect x="10.8" y="16.9" width="2.4" height="5"/><circle cx="12" cy="23.4" r="1.8"/></g></svg>',
};
async function openLessons(course) {
  await lessonsReady; selTab('lesson');
  $('#lsListTitle').textContent = t('ls.title'); $('#lsListDesc').textContent = t('ls.desc');
  if (!LESSONS) { toast(t('ls.fail')); return; }
  const pr = lsProgress(), courses = [...new Set(LESSONS.steps.map(s => s.course))];
  const stat = c => { const st = LESSONS.steps.filter(s => s.course === c); return { n: st.length, ok: st.filter(s => pr[s.id] && pr[s.id].clear).length }; };
  if (course) lsCourseSel = course;
  if (!courses.includes(lsCourseSel)) lsCourseSel = courses.find(c => { const q = stat(c); return q.ok < q.n; }) || courses[0];
  const c = lsCourseSel, q = stat(c);
  let no = 0;
  const cards = LESSONS.steps.map((s, i) => {
    if (s.course !== c) return '';
    no++;
    const r = pr[s.id], P0 = s.problems[0] || {}, d = s.diagram;
    const th = d ? thumbSvg(d.b || [], d.w || [], { n: d.n }) : thumbSvg(P0.b, P0.w);
    const st = r ? (r.clear ? `<span class="lx-st ok">✓ ${t('ls.clear')}</span>` : `<span class="lx-st">${t('u.pt', { n: r.best })}</span>`) : `<span class="lx-st new">${t('ls.notyet')}</span>`;
    return `<button class="lx-card${r && r.clear ? ' clear' : ''}" data-i="${i}"><span class="lx-th">${th}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">STEP ${no}</span>${st}</span><b class="lx-t">${t('ls.' + s.id + '.title')}</b><small class="lx-sub">${t('ls.' + s.id + '.sub')}</small>` +
      `<span class="lx-desc">${plainText(t('ls.' + s.id + '.intro'))}</span>${lxBar(r ? r.best / 100 : 0, r && r.clear ? 'ok' : '')}</span></button>`;
  }).join('');
  $('#lessonList').innerHTML = `<div class="lx">` +
    `<div class="lx-tabs">${courses.map(k => { const z = stat(k); return `<button data-course="${k}" class="${k === c ? 'sel' : ''}"><span class="ic">${LS_ICON[k] || '●'}</span><span class="nm">${t('course.' + k)}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join('')}</div>` +
    `<div class="lx-banner"><span class="ic">${LS_ICON[c] || '●'}</span><span class="tx"><b>${t('course.' + c)}</b><small>${t('course.' + c + '.sub')}</small></span><span class="pg">${t('ls.cleared', { a: q.ok, b: q.n })}${lxBar(q.ok / q.n, 'ok')}</span></div>` +
    `<div class="lx-grid">${cards}</div></div>`;
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
$('#lessonList').onclick = e => {
  const tb = e.target.closest('[data-course],[data-kind]'); if (tb) { if (tb.dataset.course) openLessons(tb.dataset.course); else openOpenings(tb.dataset.kind); return; }
  const b = e.target.closest('.lx-card'); if (!b) return; if (b.dataset.o !== undefined) openOpeningChoice(+b.dataset.o); else openIntro(+b.dataset.i);
};
function openIntro(i) {
  introIdx = i; const s = LESSONS.steps[i]; openChoiceIdx = -1; $('#btnLessonStart').classList.remove('hidden');
  $('#liStep').textContent = t('course.' + s.course) + ' · STEP ' + stepNo(i);
  $('#liTitle').textContent = t('ls.' + s.id + '.title');
  $('#liBody').innerHTML = (s.diagram ? `<div class="mini">${miniBoard(s.diagram)}</div>` : '') + t('ls.' + s.id + '.intro');
  showLessonView('lessonIntroView');
}
$('#btnLessonBack').onclick = () => openChoiceIdx >= 0 ? openOpenings() : openLessons(LESSONS.steps[introIdx] && LESSONS.steps[introIdx].course);
$('#btnLessonClose').onclick = () => hideOverlay('#lessonOverlay');
$('#btnLessonStart').onclick = () => startLesson(introIdx);
$('#btnLessonQuit2').onclick = () => { hideOverlay('#lessonOverlay'); quitSpecial(); };
$('#btnLessonRetry').onclick = () => { if (lesson && lesson.virt && lesson.virt.id === 'mk') startMistakes(lesson.virt.problems); else if (lesson && lesson.virt) startPractice(lesson.gi); else startLesson(lesson ? lesson.step : introIdx); };
$('#btnLessonNextStep').onclick = () => { const n = (lesson ? lesson.step : introIdx) + 1; if (n < LESSONS.steps.length) openIntro(n); else { hideOverlay('#lessonOverlay'); quitSpecial(); } };
// a set-up position on the board (lessons, openings practice, puzzles)
function enterSpecial(sp, r) {
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false; stopPlay();
  setRule(r || 'renju'); startPos = sp; moves = []; cur = 0; reviewing = false; hintList = null; lessonMarks = []; labelList = null; evals = []; pend = -1;
  shownKey = ''; syncStones(0);
}
const toCells = a => (Array.isArray(a) ? a : String(a || '').split(/\s+/)).filter(Boolean).map(x => typeof x === 'number' ? x : sqOf(x));
function spOf(P) { return { b: toCells(P.b), w: toCells(P.w), side: P.side || 1 }; }
function startLesson(step) {
  hideOverlay('#lessonOverlay');
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle');
  lesson = { step, i: 0, results: [], answered: false, hinted: false, me: P1 };
  document.body.classList.add('in-lesson');
  loadLessonProblem();
}
function stepNo(i) { const c = LESSONS.steps[i].course; let n = 0; for (let k = 0; k <= i; k++) if (LESSONS.steps[k].course === c) n++; return n; }
const curStep = () => lesson.virt || LESSONS.steps[lesson.step];
function lessonProblem() { return curStep().problems[lesson.i]; }
function loadLessonProblem() {
  const P = lessonProblem();
  lesson.me = P.side || P1; lesson.pick = P.kind === 'pick';
  lesson.noForbidMarks = !!(curStep().hideForbid || P.kind === 'pick');
  enterSpecial(spOf(P), P.rule || 'renju');
  P._ok = new Set(toCells(P.ok || []));
  P._sc = P.sc ? P.sc.map(([u, v]) => [sqOf(u), v]) : null;
  lesson.answered = false; lesson.hinted = false;
  if (P.last) lessonMarks = [{ at: sqOf(P.last), cls: 'last' }];
  update(false); renderLessonCard(); $('#lsFb').innerHTML = '';
}
function renderLessonCard() {
  const s = curStep(), n = s.problems.length;
  $('#lsStep').textContent = lesson.virt ? t(lesson.virt.id === 'mk' ? 'mk.step' : 'op.practiceStep', { i: lesson.i + 1, n }) : t('ls.stepq', { s: stepNo(lesson.step), i: lesson.i + 1, n });
  $('#lsTitle').textContent = lesson.virt ? (s.id === 'mk' ? t('mk.title') : LL(s.title)) : t('ls.' + s.id + '.title');
  const goal = lesson.virt ? t(s.id === 'mk' ? 'mk.goal' : 'op.goal') : t('ls.' + s.id + '.goal');
  $('#lsPrompt').innerHTML = `<div class="ls-goal"><span class="pdisc p${lesson.me}"></span><span>${lesson.pick ? '' : t('ls.turn', { c: pname(lesson.me) }) + ' '}${goal}</span></div>`;
  $('#lsDots').innerHTML = s.problems.map((_, i) => { const r = lesson.results[i]; return `<i class="${r === undefined ? '' : r >= 16 ? 'ok' : r >= 10 ? 'mid' : 'ng'} ${i === lesson.i ? 'cur' : ''}"></i>`; }).join('');
  $('#lsHint').textContent = t('ls.hint'); $('#lsHint').disabled = lesson.answered;
  $('#lsNext').textContent = lesson.i + 1 < n ? t('ls.next') : t('ls.result');
  $('#lsNext').disabled = !lesson.answered;
}
function problemPoints(P, m) {
  if (P._sc) {
    const val = new Map(P._sc), best = Math.max(...P._sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : Math.min(...P._sc.map(e => e[1])) - 200;
    if (best > WINT) return mine > WINT ? 20 : 0;
    if (mine >= best - 25) return 20;
    const loss = sOfV(best) - sOfV(mine);
    return Math.max(0, Math.round(20 * (1 - loss / 0.4)));
  }
  return P._ok.has(m) ? 20 : 0;
}
function lessonAnswer(m) {
  const P = lessonProblem(), s = curStep();
  if (lesson.answered) return;
  lesson.answered = true;
  const pts = problemPoints(P, m); lesson.results[lesson.i] = pts; renderLessonCard();
  const okList = [...P._ok], best = P._sc ? P._sc.slice().sort((a, b) => b[1] - a[1])[0][0] : okList[0];
  const ms = sqName(m), bs = best !== undefined ? sqName(best) : '';
  const lbl = pts === 20 ? 'fb.perfect' : pts >= 16 ? 'fb.good' : pts >= 10 ? 'fb.ng' : 'fb.bad';
  let fb = `<span class="pts ${pts >= 16 ? 'ok' : pts >= 10 ? 'mid' : 'ng'}">+${t('u.pt', { n: pts })}</span> <b class="${pts >= 16 ? 'ok' : 'ng'}">${t(lbl)}</b> `;
  if (lesson.virt && s.id === 'mk') fb += pts >= 16 ? t('mk.good') + ' ' + t('op.good', { m: ms }) : t('mk.why', { m: bs, x: P.played || '', q: t('q.' + (P.q || 'bad')) });
  else if (lesson.virt) fb += pts >= 16 ? t('op.good', { m: ms }) : t('op.better', { m: bs, x: ms });
  else fb += pts >= 16 ? t('ls.' + s.id + '.why', { m: ms, n: okList.length }) : t('ls.' + s.id + '.ng', { m: okList.slice(0, 4).map(sqName).join(' / '), x: ms });
  $('#lsFb').innerHTML = fb;
  playChime(pts >= 16);
  if (!lesson.pick) {
    moves = [m]; cur = 1; update(true);
  }
  const tok = busyToken;
  setTimeout(() => {
    if (!lesson || tok !== busyToken) return;
    lessonMarks = [];
    if (P._sc) {
      labelList = [];
      const sorted = P._sc.slice().sort((a, b) => b[1] - a[1]).slice(0, 4);
      sorted.forEach(([mm, v], k) => { const L = valLabel(v); labelList.push({ at: mm, big: L.big, cls: L.cls + (k === 0 ? ' best' : '') }); });
      if (pts < 16) lessonMarks.push({ at: m, cls: 'ng' });
    } else {
      for (const q of okList) if (q !== m) lessonMarks.push({ at: q, cls: 'ok' });
      lessonMarks.push({ at: m, cls: pts ? 'ok' : 'ng' });
    }
    renderFx();
  }, moveDur() + 350);
}
$('#lsHint').onclick = () => {
  if (lesson && lesson.study) { if (lesson.i > 0) { lesson.i--; showStudy(false); } return; }
  if (!lesson || lesson.answered) return;
  lesson.hinted = true;
  const s = curStep(), P = lessonProblem();
  if (lesson.virt) { const b = P._sc.slice().sort((a, c) => c[1] - a[1])[0][0]; lessonMarks = [{ at: b, cls: 'hl2' }]; $('#lsFb').innerHTML = t(s.id === 'mk' ? 'mk.hint' : 'op.hint'); renderFx(); return; }
  $('#lsFb').innerHTML = t('ls.' + s.id + '.hint');
  lessonMarks = (P.hint ? toCells(P.hint) : []).map(q => ({ at: q, cls: 'hl2' }));
  renderFx();
};
$('#lsNext').onclick = () => {
  if (lesson && lesson.study) { if (lesson.i < lesson.line.length - 3) { lesson.i++; showStudy(true); } else startPractice(lesson.gi); return; }
  if (!lesson || !lesson.answered) return;
  const s = curStep(), total = s.problems.length;
  if (lesson.i + 1 < total) { lesson.i++; labelList = null; loadLessonProblem(); return; }
  const n = lesson.results.reduce((a, b) => a + b, 0), pass = n >= 75;
  const scoreHtml = `<div class="ld-score ${pass ? 'ok' : 'ng'}">${t('u.pt', { n })}<small> / 100</small></div>` + lesson.results.map((x, k) => `${k + 1}: ${t('u.pt', { n: x })}`).join('　') + (pass ? '' : `<br>${t('ls.needPass')}`);
  if (lesson.virt) {
    if (s.id !== 'mk') { const op = opProg(), old = op[s.id] || { best: 0, pass: false }; op[s.id] = { best: Math.max(old.best, n), pass: old.pass || pass }; try { localStorage.setItem(OP_STORE, JSON.stringify(op)); } catch (e) {} }
    $('#ldTitle').textContent = s.id === 'mk' ? t('mk.done') : t(pass ? 'op.pass' : 'ls.failed');
    $('#ldSub').innerHTML = scoreHtml;
    $('#btnLessonPlay').classList.add('hidden'); $('#btnLessonNextStep').classList.add('hidden');
    showLessonView('lessonDoneView'); showOverlay('#lessonOverlay');
    if (pass) confetti();
    return;
  }
  const pr = lsProgress(), old = pr[s.id] || { best: 0, clear: false };
  pr[s.id] = { best: Math.max(old.best, n), clear: old.clear || pass };
  try { localStorage.setItem(LS_STORE, JSON.stringify(pr)); } catch (e) {}
  $('#ldTitle').textContent = t(pass ? 'ls.passed' : 'ls.failed');
  $('#ldSub').innerHTML = scoreHtml;
  const lastBasic = s.course === 'basics' && !(LESSONS.steps[lesson.step + 1] && LESSONS.steps[lesson.step + 1].course === 'basics');
  if (lastBasic && pass) $('#ldSub').innerHTML += `<p class="ls-grad">${t('course.graduate')}</p>`;
  $('#btnLessonPlay').classList.toggle('hidden', !(lastBasic && pass));
  $('#btnLessonNextStep').classList.toggle('hidden', lesson.step + 1 >= LESSONS.steps.length);
  showLessonView('lessonDoneView'); showOverlay('#lessonOverlay');
  if (pass) confetti();
};
$('#lsQuit').onclick = () => quitSpecial();
// back to the list the lesson / opening was chosen from (the board keeps the current lesson until another is picked)
$('#lsList').onclick = () => { if (!lesson) return; if (lesson.virt && lesson.virt.id === 'mk') openLessons(); else if (lesson.study || lesson.virt) openOpenings(OPEN.sets[lesson.gi] && OPEN.sets[lesson.gi].kind); else openLessons(LESSONS.steps[lesson.step].course); };
$('#btnLessonPlay').onclick = () => {
  hideOverlay('#lessonOverlay'); savedGame = null; exitSpecial();
  Object.assign(settings, { mode: 'ai', color: P1, level: 1, rule: 'free' });
  newGame();
};

// ====================================================================== openings (26 珠型): study a line, then practice
let OPEN = null, openChoiceIdx = -1;
const openReady = fetch('openings.json?v=20261019a').then(r => r.json()).then(d => (OPEN = d)).catch(() => null)
  .then(() => { if (!OPEN) document.querySelectorAll('.ls-tabs button[data-v=open]').forEach(b => b.remove()); });
const OP_STORE = STORE + '-open';
function opProg() { try { return JSON.parse(localStorage.getItem(OP_STORE) || '{}'); } catch (e) { return {}; } }
const LL = o => o ? (typeof o === 'string' ? o : o[LANG] !== undefined ? o[LANG] : o.en !== undefined ? o.en : o.ja) : '';
const opName = g => LANG === 'ja' ? g.kanji : LANG === 'zh' ? g.zh || g.kanji : LANG === 'ko' ? g.ko || g.name : g.name;
const opEval = g => `<span class="op-ev ${g.ev}">${t('ev.' + g.ev + 'x')}</span>`;
async function openOpenings(kind) {
  await openReady; selTab('open');
  if (!OPEN) { toast(t('ls.fail')); return; }
  $('#lsListTitle').textContent = t('op.title'); $('#lsListDesc').textContent = t('op.desc');
  if (kind) opKindSel = kind;
  const pr = opProg(), kinds = ['direct', 'indirect'], K = opKindSel;
  const stat = k => { const g = OPEN.sets.filter(x => x.kind === k); return { n: g.length, ok: g.filter(x => pr[x.id] && pr[x.id].pass).length }; };
  const q = stat(K);
  const cards = OPEN.sets.map((g, i) => {
    if (g.kind !== K) return '';
    const r = pr[g.id], L = g.line.split(' ');
    const th = thumbSvg([L[0], L[2]], [L[1]], { crop: [5, 5, 5], n: { [L[0]]: 1, [L[1]]: 2, [L[2]]: 3 } });
    const st = r ? (r.pass ? `<span class="lx-st ok">✓ ${t('u.pt', { n: r.best })}</span>` : `<span class="lx-st">${t('u.pt', { n: r.best })}</span>`) : `<span class="lx-st new">${t('ls.notyet')}</span>`;
    const sub = LANG === 'ja' ? g.kana : LANG === 'zh' ? '' : g.kanji;
    return `<button class="lx-card op${r && r.pass ? ' clear' : ''}" data-o="${i}"><span class="lx-th">${th}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">${g.kind === 'direct' ? 'D' : 'I'}${g.no}</span>${opEval(g)}${st}</span><b class="lx-t">${opName(g)}${sub ? `<small>${sub}</small>` : ''}</b>` +
      `<span class="lx-desc">${t('op.d.' + g.id)}</span>${lxBar(r ? r.best / 100 : 0, r && r.pass ? 'ok' : '')}</span></button>`;
  }).join('');
  $('#lessonList').innerHTML = `<div class="lx">` +
    `<div class="lx-tabs">${kinds.map(k => { const z = stat(k); return `<button data-kind="${k}" class="${k === K ? 'sel' : ''}"><span class="ic op">${opIcon(k)}</span><span class="nm">${t('op.tab.' + k)}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join('')}</div>` +
    `<div class="lx-banner"><span class="ic op">${opIcon(K)}</span><span class="tx"><b>${t('op.grp.' + K)}</b><small>${t('op.grp.' + K + '.sub')}</small></span><span class="pg">${t('ls.cleared', { a: q.ok, b: q.n })}${lxBar(q.ok / q.n, 'ok')}</span></div>` +
    `<div class="lx-grid">${cards}</div><p class="lx-credit">${t('op.credit')}</p></div>`;
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
// tab icon: the first two stones (black centre + white direct / indirect)
function opIcon(k) { return thumbSvg(['h8'], [k === 'direct' ? 'h9' : 'i9'], { crop: [6, 6, 3] }); }
function openOpeningChoice(i) {
  openChoiceIdx = i; const g = OPEN.sets[i], L = g.line.split(' ');
  $('#liStep').textContent = t('op.title') + ' · ' + t('op.grp.' + g.kind) + ' ' + g.no;
  $('#liTitle').innerHTML = `${opName(g)} ${opEval(g)}`;
  const d = { b: [L[0], L[2]], w: [L[1]], n: { [L[0]]: 1, [L[1]]: 2, [L[2]]: 3 }, crop: [3, 3, 9, 9] };
  $('#liBody').innerHTML = `<div class="mini">${miniBoard(d)}</div><p>${t('op.read', { k: g.kanji, r: g.kana, n: g.name })}</p><p>${t('op.ev.' + g.ev)}</p>` + (g.note ? `<p class="note">${LL(g.note)}</p>` : '') +
    `<div class="op-choice"><button class="lesson-item" data-study="1"><span class="no">📖</span><span class="tx"><b>${t('op.study')}</b><small>${t('op.studyDesc', { n: g.study.length - 3 })}</small></span></button>` +
    `<button class="lesson-item" data-practice="1"><span class="no">✎</span><span class="tx"><b>${t('op.practice')}</b><small>${t('op.practiceDesc')}</small></span></button></div>`;
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
  lesson = { study: true, gi, g, i: 0, results: [], answered: true, me: P1, line: g.study.map(x => sqOf(x[0])) };
  document.body.classList.add('in-lesson');
  enterSpecial(null, 'renju');
  showStudy(false);
}
// the first three stones are the opening itself; then one move at a time with the AI's evaluation
function showStudy(anim) {
  const L = lesson, g = L.g, i = L.i + 3, N0 = L.line.length;
  moves = L.line.slice(0, i); cur = i; lessonMarks = []; labelList = null; hintList = null;
  update(anim);
  $('#lsStep').textContent = `${t('op.study')} · ${i}/${N0}`;
  $('#lsTitle').innerHTML = `${opName(g)} ${opEval(g)}`;
  $('#lsDots').innerHTML = `<span class="study-bar"><span style="width:${Math.round((i - 3) * 100 / Math.max(1, N0 - 3))}%"></span></span>`;
  let pr, fb = '';
  const x = g.study[i - 1];
  if (i === 3) { pr = t('op.studyStart'); fb = t('op.ev.' + g.ev); }
  else { pr = `<b style="font-size:16px"><bdi>${i}. ${sqName(moves[i - 1])}</bdi></b> <span class="op-meta">${x && x[1] !== undefined ? evalText(evalFromStudy(x[1], i)) : ''}</span>`; fb = x && x[2] ? (typeof x[2] === 'string' && x[2].startsWith('op.n.') ? t(x[2], { c: pname(x[1] > 0 ? P1 : P2) }) : LL(x[2])) : ''; }
  if (i === N0) fb += (fb ? '<br>' : '') + `<b style="color:var(--brass)">${t('op.studyEnd')}</b>`;
  fb += `<br><button class="op-play" id="lsPlayHere">${t('op.playHere')}</button>`;
  $('#lsPrompt').innerHTML = `<div class="ls-goal"><span>${pr}</span></div>`; $('#lsFb').innerHTML = fb;
  // keep the card from shrinking while stepping through the line (a shorter note would pull the page up on phones)
  { const c = $('#lessonCard'); L.cardMin = Math.max(L.cardMin || 0, c.offsetHeight); c.style.minHeight = L.cardMin + 'px'; }
  $('#lsHint').textContent = t('op.prev'); $('#lsHint').disabled = i === 3;
  $('#lsNext').textContent = i === N0 ? t('op.toPractice') : t('op.next'); $('#lsNext').disabled = false;
  stSync();
}
// ---- opening study: compact step bar (phones) + autoplay (about one move every 1.2 s; any tap / key stops it)
var stTimer = 0;
function stStop() { if (stTimer) { clearInterval(stTimer); stTimer = 0; } stSync(); }
function stTo(to) {
  const last = lesson.line.length - 3;
  if (to < 0 || to > last || to === lesson.i) return;
  const one = to === lesson.i + 1; lesson.i = to; showStudy(one);
}
function stGo(what) {
  if (!lesson || !lesson.study) return;
  const last = lesson.line.length - 3;
  if (what === 'auto') {
    if (stTimer) { stStop(); return; }
    if (lesson.i >= last) { lesson.i = 0; showStudy(false); }
    const L0 = lesson;
    stTimer = setInterval(() => { if (lesson !== L0 || !lesson.study || lesson.i >= last) { stStop(); return; } stTo(lesson.i + 1); if (lesson.i >= last) stStop(); }, 1200);
    stSync(); return;
  }
  if (stTimer) stStop();
  stTo(what === 'first' ? 0 : what === 'last' ? last : what === 'prev' ? lesson.i - 1 : lesson.i + 1);
}
function stSync() {
  const on = !!(lesson && lesson.study), nav = document.getElementById('stNav'), au = document.getElementById('lsAuto');
  if (!nav || !au) return;
  document.body.classList.toggle('in-study', on);
  au.classList.toggle('hidden', !on);
  if (!on) { document.body.classList.remove('st-end'); const lc = document.getElementById('lessonCard'); if (lc) lc.style.minHeight = ''; if (stTimer) { clearInterval(stTimer); stTimer = 0; } return; }
  const last = lesson.line.length - 3, i = lesson.i, q = k => nav.querySelector('[data-sn="' + k + '"]');
  document.body.classList.toggle('st-end', i >= last);
  document.getElementById('stPos').textContent = (i + 3) + ' / ' + lesson.line.length;
  q('first').disabled = q('prev').disabled = i === 0;
  q('next').disabled = q('last').disabled = i >= last;
  for (const b of [q('auto'), au]) { b.classList.toggle('on', !!stTimer); b.title = t('op.auto'); b.setAttribute('aria-label', t('op.auto')); }
  for (const k of ['first', 'prev', 'next', 'last']) q(k).title = t('nav.' + k);
}
$('#stNav').addEventListener('click', e => { const b = e.target.closest('button[data-sn]'); if (b) stGo(b.dataset.sn); });
$('#lsAuto').onclick = () => stGo('auto');
document.addEventListener('click', e => { if (stTimer && !e.target.closest('[data-sn="auto"],#lsAuto')) stStop(); }, true);
// study values are stored from black's point of view
function evalFromStudy(v, i) { if (v > WINT) return { s: 0.95, kind: 'win', side: P1 }; if (v < -WINT) return { s: -0.95, kind: 'win', side: P2 }; return { s: sOfV(v), kind: 'cp', cp: v }; }
$('#lsFb').addEventListener('click', e => {
  if (!e.target.closest('#lsPlayHere') || !lesson || !lesson.study) return;
  const mv = lesson.line.slice(0, lesson.i + 3), side = mv.length % 2 === 0 ? P1 : P2;
  savedGame = null; exitSpecial();
  busyToken++; cancelWorker('ai'); cancelWorker('ana');
  Object.assign(settings, { mode: 'ai', rule: 'renju' }); setRule('renju'); humanColor = side;
  moves = mv; cur = mv.length; evals = []; reviewing = false; gameOverShown = false;
  shownKey = ''; syncStones(0); update(false); save(); afterPosition();
  toast(t('op.playing'));
});
function startPractice(gi) {
  const g = OPEN.sets[gi], pool = g.problems.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  hideOverlay('#lessonOverlay');
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle');
  lesson = { step: 0, gi, virt: { id: g.id, title: { ja: g.kanji, en: g.name }, problems: pool.slice(0, 5) }, i: 0, results: [], answered: false, hinted: false, me: P1 };
  document.body.classList.add('in-lesson');
  loadLessonProblem();
}

// ====================================================================== puzzles (詰め連珠): win in N, counted the traditional way
// (moves of both sides up to and including the move that settles the game: a four-three, a four-four, a straight four,
// or for white a three-three / a four whose blocking point is forbidden for black)
let PUZZLES = null;
const puzzlesReady = fetch('puzzles.json?v=20261019a').then(r => r.json()).then(d => (PUZZLES = d)).catch(() => null);
let pzCat = 0, pzLevel = 0;
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
const pzKey = (c, l, j) => PUZZLES.cats[c].id + '-' + PUZZLES.cats[c].levels[l].n + '-' + j;
// records: key -> stars 1..3 (old saves stored true = solved, read as ★3)
const starVal = v => v === true ? 3 : +v || 0;
const pzRecs = (c, l, pr) => { pr = pr || pzProgress(); return PUZZLES.cats[c].levels[l].puzzles.map((_, j) => starVal(pr[pzKey(c, l, j)])); };
const pzTier = n => Math.min(5, Math.max(0, (n - 1) >> 1));
// title (称号) from the stars of all puzzles: 15級 … 五段 (the same scale as the AI levels)
function pzStarsAll(pr) { let n = 0; for (const k in pr) n += starVal(pr[k]); return n; }
function pzRankOf(st) { const M = PUZZLES.total * 3, i = Math.min(20, 1 + Math.floor(19 * Math.sqrt(Math.min(1, st / M)))); return { i, next: i >= 20 ? 0 : Math.ceil(M * Math.pow(i / 19, 2)) }; }
function pzRankHtml(pr) {
  const st = pzStarsAll(pr), M = PUZZLES.total * 3, R = pzRankOf(st), prev = R.i <= 1 ? 0 : Math.ceil(M * Math.pow((R.i - 1) / 19, 2));
  const p = R.next ? (st - prev) / Math.max(1, R.next - prev) : 1;
  return `<div class="pz-rank"><span class="rk-badge"><small>${t('pz.rank')}</small><b>${LV(R.i)}</b></span><span class="rk-tx"><span class="rk-st">${PZBook.STAR(true)}<b>${st}</b><small>/${M}</small></span>` +
    `<span class="lx-bar"><i style="width:${Math.round(p * 100)}%"></i></span><small>${R.next ? t('pz.rankNext', { n: R.next - st }) : t('pz.rankTop')}</small></span></div>`;
}
function pzLevelsHtml(c, pr, dl, di) {
  const C = PUZZLES.cats[c];
  return pzRankHtml(pr) + (dl ? `<button class="lesson-item daily" data-daily="1"><span class="no">★</span><span class="tx"><b>${t('daily.title')} <span style="color:var(--dim);font-weight:400">${dl.date.slice(5).replace('-', '/')}</span></b><small>${t('pzc.' + PUZZLES.cats[dl.c].id)} · ${t('pz.winIn', { n: PUZZLES.cats[dl.c].levels[dl.l].n })} · 🔥 ${t('daily.streak', { n: di.streak })}${di.best > 1 ? ' · ' + t('daily.best', { n: di.best }) : ''}</small></span><span class="lst ${di.today ? 'clear' : ''}">${di.today ? '✓' : t('daily.go')}</span></button>` : '') +
    `<p class="ls-course"><b>${t('pzc.' + C.id)}</b><small>${t('pzc.' + C.id + '.sub')}</small></p>` +
    C.levels.map((L, i) => PZBook.card({ i, no: L.n, name: t('pz.winIn', { n: L.n }), sub: t('pzl.' + C.id, { n: L.n, k: L.puzzles.length }), recs: pzRecs(c, i, pr), tier: pzTier(L.n) })).join('') +
    `<p style="font-size:11px;color:var(--dim);margin-top:6px;line-height:1.6;grid-column:1 / -1">${t('pz.credit', { n: PUZZLES.total })}</p>`;
}
async function openPuzzles(cat) {
  await puzzlesReady; selTab('puzzle');
  if (!PUZZLES) { toast(t('ls.fail')); return; }
  if (cat !== undefined) pzCat = cat;
  PZBook.setLang(LANG);
  const pr = pzProgress(), dl = dailyPick(), di = dailyInfo();
  $('#pzCats').innerHTML = PUZZLES.cats.map((C, i) => { const tot = C.levels.reduce((x, L) => x + L.puzzles.length, 0), dn = C.levels.reduce((x, L, l) => x + pzRecs(i, l, pr).filter(v => v).length, 0); return `<button data-c="${i}" class="${i === pzCat ? 'sel' : ''}">${t('pzc.' + C.id)}<small class="ct${dn === tot ? ' ok' : ''}">${dn}/${tot}</small></button>`; }).join('');
  const box = $('#pzLevels');
  showPzView('pzListView'); showOverlay('#puzzleOverlay');
  // keep the box the size of the tallest category so switching categories does not resize the dialog
  box.style.minHeight = ''; box.style.alignContent = 'start';
  let hMax = 0;
  for (let c = 0; c < PUZZLES.cats.length; c++) { box.innerHTML = pzLevelsHtml(c, pr, dl, di); hMax = Math.max(hMax, box.offsetHeight); }
  box.innerHTML = pzLevelsHtml(pzCat, pr, dl, di);
  if (hMax) box.style.minHeight = hMax + 'px';
}
$('#pzCats').onclick = e => { const b = e.target.closest('button[data-c]'); if (b) openPuzzles(+b.dataset.c); };
$('#pzLevels').onclick = e => { const d = e.target.closest('[data-daily]'); if (d) { const dl = dailyPick(); if (dl) startPuzzle(dl.c, dl.l, dl.j, dl.date); return; } const b = e.target.closest('.pb-card'); if (b) openPzGrid(+b.dataset.i); };
function pzName(c, l) { return t('pzc.' + PUZZLES.cats[c].id) + ' · ' + t('pz.winIn', { n: PUZZLES.cats[c].levels[l].n }); }
function openPzGrid(i, cur) {
  pzLevel = i; const L = PUZZLES.cats[pzCat].levels[i]; PZBook.setLang(LANG);
  $('#pzLevelTitle').textContent = pzName(pzCat, i);
  const g = $('#pzGrid'); g.innerHTML = PZBook.grid({ recs: pzRecs(pzCat, i), cur });
  // each tile shows the position (a small board) under its number and stars
  g.querySelectorAll('.pb-tile[data-j]').forEach(el => { const P = L.puzzles[+el.dataset.j]; el.insertAdjacentHTML('afterbegin', `<span class="th">${thumbSvg(P.b, P.w)}</span>`); el.classList.toggle('wt', P.side === 2); });
  showPzView('pzGridView'); showOverlay('#puzzleOverlay');
  const c = g.querySelector('.pb-tile.cur') || g.querySelector('.pb-tile.next'); if (c && c.offsetTop > g.parentNode.clientHeight * 0.6) c.scrollIntoView({ block: 'center' });
}
$('#pzGrid').onclick = e => { const b = e.target.closest('button[data-j]'); if (!b) return; if (b.getAttribute('aria-disabled')) { toast(PZBook.t('locked')); return; } startPuzzle(pzCat, pzLevel, +b.dataset.j); };
$('#pzBack').onclick = () => openPuzzles();
$('#pzClose').onclick = () => hideOverlay('#puzzleOverlay');
function startPuzzle(c, l, j, daily) {
  hideOverlay('#puzzleOverlay');
  stashGame(); lesson = null; document.body.classList.remove('in-lesson');
  const P = PUZZLES.cats[c].levels[l].puzzles[j];
  const sp = spOf(P);
  puzzle = { c, l, j, P, me: sp.side, n: PUZZLES.cats[c].levels[l].n, state: 'play', busy: false, used: 0, daily: daily || null, hinted: false, failed: false, answered: false };
  document.body.classList.add('in-puzzle');
  enterSpecial(sp, 'renju');
  if (P.last) lessonMarks = [{ at: sqOf(P.last), cls: 'last' }];
  update(false); renderPuzzleCard(); pzStatus(pzPlayStatus(puzzle));
}
const pzLeft = Pz => Pz.n - 2 * Pz.used;
function renderPuzzleCard() {
  const Pz = puzzle, L = PUZZLES.cats[Pz.c].levels[Pz.l], att = (Pz.n + 1) >> 1;
  $('#pzStep').textContent = Pz.daily ? `★ ${t('daily.title')} · ${Pz.daily.slice(5).replace('-', '/')}` : `${t('pzc.' + PUZZLES.cats[Pz.c].id)} · ${pzT('stage', { n: Math.floor(Pz.j / 10) + 1 })} · No.${Pz.j + 1}`;
  { const r = starVal(pzProgress()[pzKey(Pz.c, Pz.l, Pz.j)]); $('#pzBest').innerHTML = !Pz.daily && r ? [1, 2, 3].map(k => PZBook.STAR(k <= r)).join('') : ''; }
  $('#pzTitle').textContent = t('pz.winIn', { n: Pz.n });
  $('#pzGoal').innerHTML = `<span class="pdisc p${Pz.me}"></span><span>${t('pz.goal', { c: pname(Pz.me), n: Pz.n })}</span>`;
  $('#pzDots').innerHTML = Array.from({ length: att }, (_, i) => `<i class="${i < Pz.used ? 'ok' : ''} ${i === Pz.used && Pz.state === 'play' ? 'cur' : ''}"></i>`).join('');
  const C = PUZZLES.cats[Pz.c];
  $('#pzNext').disabled = !!Pz.daily || Pz.j + 1 >= L.puzzles.length || !PZBook.isOpen(pzRecs(Pz.c, Pz.l), Pz.j + 1);
  $('#pzHint').disabled = Pz.state !== 'play'; $('#pzAnswer').disabled = Pz.busy;
  renderInfo();
}
function pzStatus(html) { $('#pzStatus').innerHTML = html; }
function solveReq(n, defend) { return request('ai', { type: 'solve', moves: moves.slice(0, cur), n, defend: !!defend, maxNodes: 3e6 }).then(r => r && r.list); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function pickDefence(list) { let best = null; for (const e of list) { const v = e.need === 0 ? 999 : e.need; if (!best || v > best.v) best = { m: e.m, v }; } return best && best.m; }
function pickAttack(list, left) { let best = null; for (const e of list) if (e.need && e.need <= left && (!best || e.need < best.need)) best = e; return best && best.m; }
function playMove2(m) { moves = moves.slice(0, cur); moves.push(m); cur = moves.length; hintList = null; update(true); }
// ---- puzzle v2: a wrong (but sensible) move does not end the puzzle at once — the defender answers with its best reply and the
// player keeps going until the puzzle's move count is used up (then: failed). Reaching the goal within the count = solved.
// "Obvious mistakes" end the puzzle at once (pzBlunder):
//   - a forbidden point for black (renju)                                  -> 'forbid'  (checked in onPoint, the move cannot be played)
//   - the opponent has a five threat and the move neither blocks it nor makes five  -> 'opp' (the opponent wins on the next move)
//   - VCF puzzles: a move that is not a four (VCF = fours on every move)    -> 'four'
//   - other puzzles (VCT / forbidden-point attacks): a move that is neither a four nor a three (it gives the defender a free move,
//     and the puzzle's win counts only forcing moves)                      -> 'threat'
// 1-move puzzles are judged at once as before.
const pzFiveCells = (pos, c) => { const out = []; for (let q = 0; q < 225; q++) if (!pos.at(q) && pos.cls[c][E.M2I[q]] === E.C.FIVE) out.push(q); return out; };
const pzHasWinCell = (pos, c) => { for (let q = 0; q < 225; q++) if (!pos.at(q) && pos.cls[c][E.M2I[q]] === E.C.F4 && !(c === P1 && pos.renju && pos.forbidden(q))) return true; return false; };
function pzBlunder(Pz, m) {
  if (Pz.n <= 1) return '';
  const pos = posAt(cur), me = pos.side, op = 3 - me;
  if (pos.cls[me][E.M2I[m]] === E.C.FIVE) return '';
  const of = pzFiveCells(pos, op);
  if (of.length) return of.includes(m) ? '' : 'opp';
  pos.make(m);
  const four = pzFiveCells(pos, me).length > 0, three = !four && pzHasWinCell(pos, me);
  pos.unmake();
  if (PUZZLES.cats[Pz.c].id === 'vcf') return four ? '' : 'four';
  return four || three ? '' : 'threat';
}
function pzCanAttack(Pz) {
  const pos = posAt(cur);
  for (let q = 0; q < 225; q++) if (!pos.at(q) && pos.isLegal(q) && !pzBlunder(Pz, q)) return true;
  return false;
}
function pzFailBlunder(Pz, m, why, k) {
  Pz.state = 'fail'; Pz.busy = false; Pz.failed = true;
  lessonMarks = [{ at: m, cls: 'ng' }];
  update(false); playChime(false);
  pzStatus(`<b class="ng">${pzT('blunder')}</b> ${t('pz.bl.' + why, { k: k ? t('fb.k' + k) : '' })}`);
  renderPuzzleCard();
}
function pzFailOut(Pz) {
  Pz.state = 'fail'; Pz.busy = false; Pz.failed = true;
  const pv = toCells(Pz.P.pv || Pz.P.a);
  update(false); playChime(false);
  pzStatus(`<b class="ng">${t('pz.fail')}</b> ${pzT('outOfMoves', { n: Pz.n })}` + (pv.length ? ' ' + t('pz.outAns', { b: `<b>${sqName(pv[0])}</b>` }) : ''));
  renderPuzzleCard();
}
const pzT = (k, v) => window.PZBook ? (PZBook.setLang(LANG), PZBook.t(k, v)) : k;
const pzPlayStatus = Pz => `${t('pz.start')} <b>${pzT('movesLeft', { n: Math.max(1, pzLeft(Pz)) })}</b>`;
async function puzzleMove(m) {
  const Pz = puzzle; Pz.busy = true; lessonMarks = [];
  const left = pzLeft(Pz), tok = busyToken, ms = sqName(m);
  const bl = pzBlunder(Pz, m);
  if (bl) { pzFailBlunder(Pz, m, bl); return; }
  pzStatus(t('pz.checking'));
  const list = await solveReq(left);
  if (!list || puzzle !== Pz || tok !== busyToken) return;
  const e = list.find(x => x.m === m);
  playMove2(m); Pz.used++; renderPuzzleCard();
  if (statusAt(cur).winner === Pz.me) { setTimeout(() => puzzleSolved(), moveDur() + 300); return; }
  const good = e && e.need && e.need <= left;
  if (Pz.n <= 1 && !good) {      // 1-move puzzles: judged at once (as before)
    const best = list.filter(x => x.need && x.need <= left).sort((a, b) => a.need - b.need);
    Pz.state = 'fail'; Pz.busy = false; Pz.failed = true;
    await sleep(moveDur() + 450); if (puzzle !== Pz) return;
    moves = moves.slice(0, cur - 1); cur = moves.length; Pz.used--;
    for (const g of best.slice(0, 3)) lessonMarks.push({ at: g.m, cls: 'ok' });
    lessonMarks.push({ at: m, cls: 'ng' });
    update(false); playChime(false);
    pzStatus(`<b class="ng">${t('pz.fail')}</b> ${t('pz.failWhy', { m: ms, b: best.length ? sqName(best[0].m) : '—', n: left })}`);
    renderPuzzleCard(); return;
  }
  if (good && e.need === 1) { setTimeout(() => puzzleSolved(true), moveDur() + 250); return; }
  if (!good) Pz.off = true;     // off the solution: keep playing to the move count
  if (pzLeft(Pz) < 1) { await sleep(moveDur() + 350); if (puzzle === Pz) pzFailOut(Pz); return; }
  const dl = await solveReq(Math.max(1, left - 2), true);
  if (!dl || puzzle !== Pz || tok !== busyToken) return;
  await sleep(moveDur() + 350); if (puzzle !== Pz) return;
  const r = pickDefence(dl);
  if (r === null || r === undefined) { if (good) puzzleSolved(true); else pzFailOut(Pz); return; }
  playMove2(r);
  await sleep(moveDur()); if (puzzle !== Pz) return;
  if (statusAt(cur).over) { pzFailOut(Pz); return; }
  // off the solution and no forcing move left at all (every move would be an obvious mistake): the goal can no longer be reached
  if (Pz.off && !pzCanAttack(Pz)) { await sleep(350); if (puzzle === Pz) pzFailOut(Pz); return; }
  Pz.busy = false; renderPuzzleCard(); boardEl.classList.toggle('can', canHumanPlay());
  pzStatus(pzPlayStatus(Pz));
}
// after the settling move: play out the finish (block, straight four, ... five)
async function finishLine(Pz) {
  for (let k = 0; k < 6; k++) {
    if (puzzle !== Pz || statusAt(cur).over) return;
    const pos = posAt(cur), att = pos.side === Pz.me;
    let m;
    if (att) { const l = await solveReq(1); if (puzzle !== Pz || !l) return; const f = l.find(x => x.need === -1); m = f ? f.m : pickAttack(l, 1); }
    else { const l = await solveReq(1, true); if (puzzle !== Pz || !l || !l.length) return; m = pickDefence(l); }
    if (m === null || m === undefined) return;
    await sleep(520); if (puzzle !== Pz) return;
    playMove2(m);
  }
}
function puzzleSolved(finish) {
  const Pz = puzzle; if (!Pz) return;
  Pz.state = 'solved'; Pz.busy = false;
  // ★★★ first try without a hint / ★★ after a hint, a failed try or leaving the solution line / ★ after seeing the answer
  const stars = PZBook.starsFor({ hinted: Pz.hinted || Pz.off, failed: Pz.failed, answered: Pz.answered });
  const pr = pzProgress(), k = pzKey(Pz.c, Pz.l, Pz.j), before = pzRecs(Pz.c, Pz.l, pr), rk0 = pzRankOf(pzStarsAll(pr)).i;
  pr[k] = Math.max(starVal(pr[k]), stars);
  try { localStorage.setItem(PZ_STORE, JSON.stringify(pr)); } catch (e) {}
  const after = pzRecs(Pz.c, Pz.l, pr), ev = PZBook.events(before, after, Pz.j), rk1 = pzRankOf(pzStarsAll(pr)).i;
  if (Pz.daily) dailySolved(Pz.daily, Pz.hinted || Pz.off);   // solved after leaving the solution line: counted like a hinted solve
  PZBook.setLang(LANG);
  pzStatus(`<b class="ok">${t('pz.solved')}</b> ${t('pz.solvedSub', { n: Pz.n })}` + (Pz.daily ? `<br>🔥 ${t('daily.streak', { n: dailyInfo().streak })}` : '') +
    PZBook.solved({ stars, recs: after, j: Pz.j, events: ev }) + (rk1 > rk0 ? `<span class="pb-ev rk">🎖 ${t('pz.rankUp', { r: LV(rk1) })}</span>` : ''));
  playChime(true); confetti(); if (ev.length || rk1 > rk0) setTimeout(confetti, 900); renderPuzzleCard();
  if (finish) finishLine(Pz);
}
$('#pzRetry').onclick = () => { if (puzzle) { const o = puzzle; startPuzzle(o.c, o.l, o.j, o.daily); Object.assign(puzzle, { hinted: o.hinted || o.off, failed: o.failed || o.state === 'fail', answered: o.answered }); } };
$('#pzNext').onclick = () => { if (!puzzle || puzzle.daily) return; const { c, l, j } = puzzle; if (j + 1 < PUZZLES.cats[c].levels[l].puzzles.length && PZBook.isOpen(pzRecs(c, l), j + 1)) startPuzzle(c, l, j + 1); };
$('#pzList').onclick = () => { if (!puzzle) return; if (puzzle.daily) openPuzzles(); else { pzCat = puzzle.c; openPzGrid(puzzle.l, puzzle.j); } };
$('#pzQuit').onclick = () => quitSpecial();
$('#pzHint').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.state !== 'play' || Pz.busy) return;
  const left = pzLeft(Pz), list = await solveReq(left); if (puzzle !== Pz || !list) return;
  Pz.hinted = true;
  const good = list.filter(x => x.need && x.need <= left);
  // show a small area around the winning moves rather than the exact point
  const marks = new Set();
  for (const g of good) { const c = cx(g.m), r = cy(g.m); for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [-1, 0], [0, -1]]) { const q = (r + dr) * N + c + dc; if (c + dc >= 0 && c + dc < N && r + dr >= 0 && r + dr < N && !posAt(cur).at(q)) marks.add(q); } }
  lessonMarks = [...marks].map(q => ({ at: q, cls: 'hl2' }));
  renderFx(); pzStatus(t('pz.hintText'));
};
$('#pzAnswer').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.busy) return;
  Pz.busy = true; Pz.state = 'answer'; Pz.hinted = true; Pz.answered = true; lessonMarks = []; hintList = null;
  moves = []; cur = 0; Pz.used = 0; update(false); renderPuzzleCard(); pzStatus(t('pz.showing'));
  const pv = toCells(Pz.P.pv || Pz.P.a);
  for (let k = 0; k < pv.length; k++) {
    await sleep(k ? 650 : 300); if (puzzle !== Pz) return;
    if (!posAt(cur).isLegal(pv[k])) break;
    playMove2(pv[k]); if (!(k & 1)) Pz.used++; renderPuzzleCard();
  }
  await finishLine(Pz); if (puzzle !== Pz) return;
  Pz.busy = false; renderPuzzleCard(); pzStatus(t('pz.answerDone'));
};

// ====================================================================== post-game review
const RV_WORKERS = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
let rv = null, rvOpen = false;
const gameKey = () => keyOf(moves.length);
function rvCancel() { if (rv && rv.ws) { rv.ws.forEach(w => { w.terminate(); w.jobs.forEach(j => j.resolve(null)); }); rv.ws = null; } if (rv && rv.running) rv = null; }
async function runReview() {
  if (lesson || puzzle) return;
  if (rtLive()) { toast(t('rt.noEval')); return; }
  if (net) return;
  if (moves.length < 1) { toast(t('nokifu')); return; }
  if (rv && rv.key === gameKey() && (rv.running || rv.done === rv.total)) { rvOpen = true; renderReview(); revealReview(); return; }
  rvCancel();
  const game = moves.slice(), key = gameKey(), sp = startPos, r0 = rule;
  const run = rv = { key, list: [], done: 0, total: game.length, running: true, ws: [] };
  for (let k = 0; k < RV_WORKERS; k++) run.ws.push(makeWorker());
  rvOpen = true; renderReview(); revealReview();
  let next = 0;
  const loop = async w => {
    while (next < game.length && rv === run) {
      const i = next++, pk = r0 + '|' + startKey() + '|' + game.slice(0, i).join(',');
      let list = anaCache.get(pk);
      if (!list) {
        const res = await new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve }); w.postMessage({ type: 'analyze', rule: r0, start: sp, moves: game.slice(0, i), time: i < 6 ? 300 : 800, id }); });
        if (rv !== run || !res) return;
        list = res.list || []; anaCache.set(pk, list);
      }
      // the move actually played must be in the list: if not, it is valued as clearly worse than the worst listed move
      run.list[i] = list;
      if (gameKey() === key && (!evals[i] || evals[i].kind === 'cp')) { const ev = evalFromList(list, toMoveAt(i)); if (ev) evals[i] = ev; }
      run.done++; renderReview(); renderGraph(); renderKifu();
    }
  };
  await Promise.all(run.ws.map(loop));
  if (rv !== run) return;
  run.ws.forEach(w => w.terminate()); run.ws = null; run.running = false;
  if (gameKey() === key) save();
  renderInfo(); renderFx(); toast(t('rv.done'), 1200);
}
function revealReview() { if (matchMedia('(max-aspect-ratio: 1/1) and (pointer: coarse)').matches) setTimeout(() => $('#reviewCard').scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60); }
function rvJudge(i) {
  if (!rv || rv.key !== gameKey()) return null;
  const L = rv.list[i]; if (!L || !L.length) return null;
  const m = moves[i];
  let best = L[0]; for (const e of L) if (e.v > best.v) best = e;
  let mine = L.find(e => e.m === m);
  // value of the move played: from the list, or from the next position (the opponent's best, negated)
  if (!mine) { const N2 = rv.list[i + 1]; if (N2 && N2.length) { let b2 = -Infinity; for (const e of N2) b2 = Math.max(b2, e.v); mine = { m, v: -b2 }; } else if (statusAt(i + 1).over) mine = { m, v: WIN - 1 }; else return null; }
  const loss = sOfV(best.v) - sOfV(mine.v);
  let q = null, desc = '';
  const word = v => t(v > WINT ? 'rv.win' : v < -WINT ? 'rv.loss' : 'rv.even');
  if ((best.v > WINT && mine.v <= WINT) || (best.v >= -WINT && mine.v < -WINT)) { q = 'bad'; desc = `${word(best.v)}→${word(mine.v)}`; }
  else if (loss >= 0.3) { q = 'bad'; desc = t('rv.eval', { l: ((best.v - mine.v) / 100).toFixed(1) }); }
  else if (loss >= 0.12) { q = 'dubious'; desc = t('rv.eval', { l: ((best.v - mine.v) / 100).toFixed(1) }); }
  const ok = !q && mine.v >= best.v - 20;
  return { q, ok, desc, best: best.m, m, loss, bv: best.v, mv: mine.v };
}
// threats on the board in plain words
const C = E.C;
function threatOf(pos, c) {   // the strongest thing colour c could do next: 'five' | 'win' (four-three / straight four) | ''
  let k = '';
  for (let m = 0; m < N * N; m++) {
    if (pos.at(m)) continue;
    const x = pos.cls[c][E.M2I[m]];
    if (x === C.FIVE) return 'five';
    if ((x === C.F4 || x === C.F43) && (c !== P1 || !pos.renju || !pos.forbidden(m))) k = 'win';
  }
  return k;
}
function bestKind(pos, m) {
  const me = pos.side, op = 3 - me, i = E.M2I[m], a = pos.cls[me][i], d = pos.cls[op][i];
  if (a === C.FIVE || a === C.F4 || a === C.F43) return 'win';
  if (d >= C.F3) return 'block';
  if (a === C.B4) return 'four';
  if (a === C.F3) return 'three';
  return 'shape';
}
// the reason in plain words: lost win / walked into a loss / what the move left open / what the best move does
function plainWhy(i, j) {
  const pos = posAt(i), mover = pos.side, op = 3 - mover, b = sqName(j.best);
  let h;
  if (j.bv > WINT && j.mv < -WINT) h = t('rx.winToLoss', { b });
  else if (j.bv > WINT) h = t('rx.missWin', { b });
  else if (j.mv < -WINT) h = t('rx.toLoss', { b });
  else {
    const word = v => { const x = sOfV(v); return t(x > 0.5 ? 'rx.s4' : x > 0.25 ? 'rx.s3' : x > 0.08 ? 'rx.s2' : x >= -0.08 ? 'rx.s0' : x >= -0.25 ? 'rx.s-2' : x >= -0.5 ? 'rx.s-3' : 'rx.s-4'); };
    const sa = word(j.bv), sb = word(j.mv);
    h = t('rx.cp', { b, x: ((j.bv - j.mv) / 100).toFixed(1) }) + (sa !== sb ? ' ' + t('rx.flow', { c: sideLabel(mover), x: sa, y: sb }) : '');
  }
  // what the played move left to the opponent, if the best move would not have
  const kb = bestKind(pos, j.best);
  pos.make(j.m); const tm = threatOf(pos, op); pos.unmake();
  pos.make(j.best); const tb = threatOf(pos, op); pos.unmake();
  const lvl = x => x === 'five' ? 2 : x === 'win' ? 1 : 0;
  let extra = '';
  if (lvl(tm) > lvl(tb)) extra = t(tm === 'five' ? 'rx.t.five' : kb === 'block' ? 'rx.t.three' : 'rx.t.win');
  return h + (extra ? ' ' + extra : '') + ' ' + t('rx.b.' + kb, { b });
}
// what a move does, in words (attack: five / four-three / four / three / two; defence: blocks a four / a four-three point / a three)
function moveDesc(pos, m) {
  const me = pos.side, op = 3 - me, i = E.M2I[m], a = pos.cls[me][i], d = pos.cls[op][i], out = [];
  if (a === C.FIVE) return ['five'];
  if (d === C.FIVE) out.push('block4');
  else if (d === C.F4 || d === C.F43) out.push('blockwin');
  else if (d === C.F3 || d === C.F33) out.push('block3');
  if (a === C.F4 || a === C.F43) out.unshift('win');
  else if (a === C.B4) out.push('four');
  else if (a === C.F3 || a === C.F33) out.push('three');
  else if (!out.length && (a === C.F2 || a === C.T3)) out.push('two');
  return out.length ? out : ['quiet'];
}
const descText = (pos, m) => t('rx.does', { m: `<b>${sqName(m)}</b>`, d: moveDesc(pos, m).map(k => t('rx.m.' + k)).join(t('rx.and')) });
const winPct = v => Math.round(50 + 50 * sOfV(v)) + '%';
// the move at the current position (like shogi / chess): what the move does, the best move and why, win chances
function rvExplainHtml() {
  if (!rv || rv.running || cur >= moves.length) return '';
  const j = rvJudge(cur); if (!j) return '';
  const pos = posAt(cur), p = pos.side, q = j.q || (j.ok || j.best === j.m ? 'best' : 'good');
  let h = `<div class="rv-ex"><div class="rv-ex-h"><span>${cur + 1}. <i class="p${p}"></i><b>${sanOf(cur)}</b></span><span class="tag ${q}">${t('cq.' + q)}</span></div>`;
  h += `<p>${descText(pos, j.m)}</p>`;
  if (j.best === j.m) h += `<p>${t('rv.ex.same')}</p>`;
  else {
    h += `<p>${t(j.q ? 'rv.ex.best' : 'rv.ex.alt', { m: `<b class="bm">${sqName(j.best)}</b>` })}${j.q ? ` <span class="ls">${j.desc}</span>` : ''}</p>`;
    const same = moveDesc(pos, j.best).join() === moveDesc(pos, j.m).join();
    h += j.q ? `<p class="why">${plainWhy(cur, j)}</p>` : same ? '' : `<p class="why">${descText(pos, j.best)}</p>`;
  }
  h += `<p class="wr">${t('rv.ex.wr', { a: winPct(Math.max(j.bv, j.mv)), b: winPct(j.mv) })}</p>`;
  return h + '</div>';
}
function sideLabel(p) { return settings.mode === 'ai' ? (p === humanColor ? t('you') : 'AI') : pname(p); }
function renderReview() {
  const card = $('#reviewCard');
  if (rv && !lesson && !puzzle && rv.key !== gameKey()) { rvCancel(); rv = null; rvOpen = false; }
  const show = !lesson && !puzzle && rvOpen && rv;
  card.classList.toggle('show', !!show);
  if (!show) return;
  let html;
  if (rv.running) html = `<div style="font-size:12px;color:var(--muted)">${t('rv.running', { a: rv.done, b: rv.total })}</div><div class="rv-prog"><i style="width:${rv.total ? rv.done / rv.total * 100 : 0}%"></i></div>`;
  else {
    const st = { 1: { n: 0, ok: 0, bad: 0, dubious: 0 }, 2: { n: 0, ok: 0, bad: 0, dubious: 0 } }, list = [];
    for (let i = 0; i < moves.length; i++) { const j = rvJudge(i); if (!j) continue; const s = st[toMoveAt(i)]; s.n++; if (j.ok) s.ok++; if (j.q) { s[j.q]++; list.push({ i, ...j }); } }
    const row = p => { const s = st[p]; return `<span class="who"><span class="pdisc p${p}"></span>${sideLabel(p)}</span><span><b>${s.n ? Math.round(s.ok / s.n * 100) : 0}%</b></span><span class="rv-chips"><span class="bad">${t('q.bad')} ${s.bad}</span><span class="dubious">${t('q.dubious')} ${s.dubious}</span></span>`; };
    html = rvExplainHtml() + `<div class="rv-sum"><span></span><span class="h">${t('rv.acc')}</span><span></span>${row(P1)}${row(P2)}</div>`;
    const shown = list.length > 10 ? list.slice().sort((a, b) => (b.q === 'bad') - (a.q === 'bad') || b.loss - a.loss).slice(0, 10).sort((a, b) => a.i - b.i) : list;
    if (shown.length) html += `<div class="rv-list">${shown.map(x => `<button data-i="${x.i}" class="${cur === x.i ? 'cur' : ''}"><span class="tag ${x.q}">${t('q.' + x.q)}</span><span class="mv">${x.i + 1}. <i class="p${toMoveAt(x.i)}"></i>${sanOf(x.i)} → ${sqName(x.best)}</span><span class="ls">${x.desc}</span></button>`).join('')}</div>`;
    else html += `<div class="rv-note" style="color:#8fe3b8">${t('rv.clean')}</div>`;
    html += `<div class="rv-note" style="color:var(--dim);font-size:11px;line-height:1.6">${t('rv.note')}</div>`;
  }
  $('#rvBody').innerHTML = html;
}
function drawReviewFx() {
  if (lesson || puzzle || !rvOpen || !rv || rv.running || rv.key !== gameKey() || cur >= moves.length) return false;
  const L = rv.list[cur]; if (!L) return false;
  drawHints(L);
  const j = rvJudge(cur), m = moves[cur];
  const d = mk('played' + (j && j.q ? ' ' + j.q : ''), m);
  return true;
}
$('#rvBody').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
$('#rvClose').onclick = () => { rvOpen = false; if (rv && rv.running) rvCancel(); renderReview(); renderFx(); renderKifu(); };
$('#btnAnalyze').onclick = () => runReview();
$('#btnResAnalyze').onclick = () => { hideOverlay('#resultOverlay'); runReview(); };
// your dubious moves and blunders against the AI (graded by the coach) become practice problems
function mistakeProblems() {
  const out = [];
  for (const [idx, c] of [...coachQ.entries()].sort((a, b) => a[0] - b[0])) {
    if ((c.q !== 'dubious' && c.q !== 'bad') || idx >= moves.length || moves[idx] !== c.m) continue;
    const pos = posAt(idx), b = [], w = [];
    for (let m = 0; m < N * N; m++) { const x = pos.at(m); if (x === P1) b.push(sqName(m)); else if (x === P2) w.push(sqName(m)); }
    out.push({ b: b.join(' '), w: w.join(' '), side: pos.side, last: idx ? sqName(moves[idx - 1]) : undefined, sc: c.list.map(e => [sqName(e.m), e.v]), played: sqName(c.m), q: c.q, rule });
  }
  return out.slice(-10);
}
function startMistakes(probs) {
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle');
  lesson = { step: 0, virt: { id: 'mk', problems: probs }, i: 0, results: [], answered: false, hinted: false, me: P1 };
  document.body.classList.add('in-lesson');
  loadLessonProblem();
}
$('#btnMistakes').onclick = () => { const p = mistakeProblems(); if (!p.length) return; hideOverlay('#resultOverlay'); startMistakes(p); };

// ====================================================================== share / load (coordinates, URL)
function parseGameText(v) {
  v = (v || '').trim(); if (!v) return null;
  let r = null;
  const h = v.match(/#(.*)$/);
  if (h) {
    const q = new URLSearchParams(h[1]); if (!q.has('k')) return null;
    r = q.get('r'); v = (q.get('k') || '').replace(/\./g, ' ');
    const n = q.has('n') ? parseInt(q.get('n'), 10) : undefined;
    const res = parseMoves(v, E.RULES.includes(r) ? r : 'renju'); if (res) res.n = n; return res;
  }
  const rm = v.match(/\[Rule\s+"(renju|standard|free)"\]/i); if (rm) r = rm[1].toLowerCase();
  v = v.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ');
  return parseMoves(v, r || (E.RULES.includes(settings.rule) ? settings.rule : 'renju'));
}
function parseMoves(v, r) {
  const toks = String(v).toLowerCase().match(/[a-o](1[0-5]|[1-9])(?![0-9])/g);
  if (!toks || !toks.length) return null;
  const list = [];
  // a record that does not start in the centre is read without the renju opening restriction (freestyle)
  let rr = r; if (rr === 'renju' && sqOf(toks[0]) !== E.CENTER) rr = 'standard';
  const pos = new E.Pos(rr);
  for (let k = 0; k < toks.length; k++) { const m = sqOf(toks[k]); if (m < 0 || !pos.isLegal(m)) return { bad: k + 1 }; pos.make(m); list.push(m); if (pos.status().over && k < toks.length - 1) return { bad: k + 2 }; }
  return { rule: rr, list };
}
function openLoaded(r, list, n) {
  ['#resultOverlay', '#newOverlay', '#lessonOverlay', '#puzzleOverlay', '#pasteOverlay'].forEach(hideOverlay);
  if (lesson || puzzle) { savedGame = null; exitSpecial(); }
  if (net) leaveOnlineGame();
  rtForfeit(); rgame = null;
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); rvCancel(); rv = null; rvOpen = false; thinking = 0; animating = false;
  settings.mode = 'pvp'; startPos = null; setRule(r);
  moves = list; evals = []; hintList = null;
  cur = n === undefined || isNaN(n) ? moves.length : Math.max(0, Math.min(moves.length, n));
  reviewing = cur !== moves.length; gameOverShown = gameOver(moves.length);
  shownKey = ''; syncStones(0);
  update(false); save(); afterPosition();
}
function loadText(v) {
  const r = parseGameText(v);
  if (!r) { toast(t('paste.invalid'), 2200); return false; }
  if (r.bad) { toast(t('paste.bad', { n: r.bad }), 2500); return false; }
  openLoaded(r.rule, r.list, r.n); toast(t('paste.loaded', { n: r.list.length }), 1800);
  return true;
}
function loadFromHash() {
  const h = location.hash.slice(1); if (!h) return false;
  const q = new URLSearchParams(h); if (!q.has('k')) return false;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  return loadText('#' + h);
}
window.addEventListener('hashchange', () => { if (/[#&]k=/.test(location.hash)) loadFromHash(); });
$('#btnShare').onclick = async () => {
  if (!moves.length || lesson || puzzle) { toast(t('nokifu')); return; }
  const url = location.origin + location.pathname + '#r=' + rule + '&k=' + moves.map(sqName).join('.') + (cur < moves.length ? '&n=' + cur : '');
  try {
    if (navigator.share && coarse()) { await navigator.share({ title: t('meta.title'), url }); return; }
    await navigator.clipboard.writeText(url); toast(t('share.copied'), 1400);
  } catch (e) { if (e && e.name === 'AbortError') return; toast(url, 4000); }
};
$('#btnPaste').onclick = () => { $('#pasteText').value = ''; showOverlay('#pasteOverlay'); setTimeout(() => $('#pasteText').focus(), 50); };
$('#pasteCancel').onclick = () => hideOverlay('#pasteOverlay');
$('#pasteOk').onclick = () => { const v = $('#pasteText').value; if (!v.trim()) { toast(t('nokifu')); return; } loadText(v); };
$('#pasteText').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('#pasteOk').click(); } else if (e.key === 'Escape') hideOverlay('#pasteOverlay'); });

// ====================================================================== daily puzzle
const DAILY_STORE = STORE + '-daily';
let daily = { last: '', streak: 0, best: 0, days: {} };
try { Object.assign(daily, JSON.parse(localStorage.getItem(DAILY_STORE) || '{}')); } catch (e) {}
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function dailyPick() {
  if (!PUZZLES) return null;
  const now = new Date(), date = ymd(now), day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
  // weekdays get harder towards the weekend: (category id, level index)
  const plan = PUZZLES.daily || [];
  const w = plan[now.getDay()]; if (!w) return null;
  const c = PUZZLES.cats.findIndex(C => C.id === w[0]); if (c < 0) return null;
  const l = Math.min(w[1], PUZZLES.cats[c].levels.length - 1), n = PUZZLES.cats[c].levels[l].puzzles.length;
  let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  return { date, c, l, j: (h >>> 0) % n };
}
function dailyInfo() { const today = ymd(new Date()), y = new Date(); y.setDate(y.getDate() - 1); const alive = daily.last === today || daily.last === ymd(y); return { streak: alive ? daily.streak : 0, best: daily.best || 0, today: !!daily.days[today] }; }
function dailySolved(date, hinted) {
  if (daily.days[date]) return;
  const y = new Date(date + 'T12:00:00'); y.setDate(y.getDate() - 1);
  daily.streak = daily.last === ymd(y) ? daily.streak + 1 : 1; daily.last = date; daily.best = Math.max(daily.best || 0, daily.streak); daily.days[date] = hinted ? 'h' : 1;
  try { localStorage.setItem(DAILY_STORE, JSON.stringify(daily)); } catch (e) {}
}

// ====================================================================== online play (UI; backend in online.js — ported from the Shogi page)
// net = active online game: {gid, game, me (P1 / P2, 0 spectator), opp, unsub, timer, done, pending, over, spectate, saved}
let olView = 'menu', olSearch = null, olRoom = null, olList = [];
const olEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const olX = olEsc;
const olOn = () => !!(window.Online && Online.available);
const olLive = () => !!(net && !net.done && !net.spectate);
function olFmtWait(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function ucisOf(list) { return list.map(sqName); }
// ---- time control (chosen before searching / creating a room; remembered per browser)
const OL_TC_KEY = 'gomoku-online-tc';
function olTc() { try { const v = localStorage.getItem(OL_TC_KEY); if (Online.TC[v]) return v; } catch (e) {} return Online.DEF_TC; }
function olSetTc(v) {
  if (!Online.TC[v]) return;
  try { localStorage.setItem(OL_TC_KEY, v); } catch (e) {}
  document.querySelectorAll('.ol-tc button').forEach(b => { b.classList.toggle('sel', b.dataset.tc === v); b.setAttribute('aria-checked', String(b.dataset.tc === v)); });
}
const tcName = id => t('ol.tc.' + (window.Online && Online.TC[id] ? id : Online.DEF_TC));
const tcTag = id => t('ol.tcn.' + (window.Online && Online.TC[id] ? id : Online.DEF_TC)) + ' ' + t('ol.tcd.' + (window.Online && Online.TC[id] ? id : Online.DEF_TC));
function olTcSel(cls) {
  const cur = olTc();
  return `<div class="ol-tc ${cls || ''}" role="radiogroup" aria-label="${olEsc(t('ol.tc'))}">` + Online.TC_IDS.map(id => `<button type="button" role="radio" data-tc="${id}" class="${id === cur ? 'sel' : ''}" aria-checked="${id === cur}" title="${olEsc(t('ol.tc.' + id))}"><b>${t('ol.tcn.' + id)}</b><small>${t('ol.tcd.' + id)}</small></button>`).join('') + '</div>';
}
document.addEventListener('click', e => { const b = e.target.closest('.ol-tc button'); if (b) olSetTc(b.dataset.tc); });
function olTcToast(g, extra) {
  const nm = tcName(g.tc);
  toast((extra ? extra + ' · ' : '') + (g.rated && Online.TC[g.tc] && g.tc !== olTc() ? t('ol.tcCross', { tc: nm }) : t('ol.tcStart', { tc: nm })), 3200);
}
function olSearchTc(s) {
  return `<small class="ol-tcinfo">${t('ol.tcStart', { tc: tcName(s.tc || olTc()) })}</small><small>${s.crossIn > 0 || s.crossIn == null ? t('ol.crossIn', { s: Math.ceil((s.crossIn == null ? Online.CROSS_WAIT : s.crossIn) / 1000) }) : t('ol.crossOn')}</small>`;
}
// ---- room type: open (listed under open rooms, anyone joins with one tap) / closed (not listed, joined with the key = room code)
const OL_RK_KEY = 'gomoku-room-type', OL_TITLE_KEY = 'gomoku-room-title';
function olTitleSaved() { try { return localStorage.getItem(OL_TITLE_KEY) || ''; } catch (e) { return ''; } }
function olTitle() { const el = document.getElementById('olRoomTitle'); const v = (el ? el.value : olTitleSaved()).replace(/\s+/g, ' ').trim().slice(0, 24); try { localStorage.setItem(OL_TITLE_KEY, v); } catch (e) {} return v; }
function olRk() { try { const v = localStorage.getItem(OL_RK_KEY); if (v === 'open' || v === 'key') return v; } catch (e) {} return 'open'; }
function olRkSel() {
  const cur = olRk();
  return `<div class="ol-rk" role="radiogroup" aria-label="${olEsc(t('ol.newRoom'))}">` + ['open', 'key'].map(id => `<button type="button" role="radio" data-rk="${id}" class="${id === cur ? 'sel' : ''}" aria-checked="${id === cur}"><b>${id === 'open' ? '🔓' : '🔒'} ${t('ol.rk.' + id)}</b><small>${t('ol.rkd.' + id)}</small></button>`).join('') + '</div>';
}
document.addEventListener('click', e => {
  const b = e.target.closest('.ol-rk button'); if (!b) return;
  try { localStorage.setItem(OL_RK_KEY, b.dataset.rk); } catch (_) {}
  document.querySelectorAll('.ol-rk button').forEach(x => { x.classList.toggle('sel', x.dataset.rk === b.dataset.rk); x.setAttribute('aria-checked', String(x.dataset.rk === b.dataset.rk)); });
  const c = $('#olCreate'); if (c) c.textContent = t(b.dataset.rk === 'key' ? 'ol.createKey' : 'ol.createOpen');
});
// open rooms (live; shown in the online menu and the dock / phone online tab), own room marked
let olRooms = [], olRoomsUnsub = null;
function olRoomRows(list) {
  const me = Online.uid;
  return list.length ? list.map(r => {
    const tl = r.title ? `<b class="ol-rtitle">${olEsc(r.title)}</b> ` : '';
    if (!r.game) return `<div class="${r.host === me ? 'me' : ''}"><span>${tl}${olEsc(r.name)} <small>R ${r.rating} · ${olEsc(tcTag(r.tc))}</small></span>${r.host === me ? `<small>${t('ol.yourRoom')}</small>` : `<button class="dk-join" data-code="${olEsc(r.id)}">${t('ol.join')}</button>`}</div>`;
    const mine = r.host === me || r.guest === me, watching = !!(net && net.spectate && net.game && net.game.room === r.id && net.gid === r.game);
    return `<div class="ingame${mine ? ' me' : ''}"><span>${tl}${olEsc(r.name)}${r.gname ? ' <small>vs</small> ' + olEsc(r.gname) : ''} <small class="ol-ing">${t('ol.st.play')} · ${olEsc(tcTag(r.tc))}</small></span>${mine ? `<small>${t(r.host === me ? 'ol.yourRoom' : 'ol.st.play')}</small>` : `<button class="dk-watch" data-code="${olEsc(r.id)}"${watching ? ' disabled' : ''}>${t(watching ? 'ol.st.watch' : 'ol.watch')}</button>`}</div>`;
  }).join('') : `<div class="ol-note small">${t('ol.noRooms')}</div>`;
}
function olRoomsRender() { const el = $('#olRooms'); if (el) el.innerHTML = olRoomRows(olRooms); }
function olWatchRooms() { if (!olRoomsUnsub && window.Online && Online.uid) olRoomsUnsub = Online.watchRooms(l => { olRooms = l; olRoomsRender(); }); }
async function olJoin(code, btn) {
  if (btn) btn.disabled = true;
  let gid = null; try { gid = await Online.joinRoom(code); } catch (e) { console.warn(e); }
  if (gid) { mtab('game'); startOnlineGame(gid); return true; }
  toast(t('ol.noRoom'), 2200); if (btn) btn.disabled = false; return false;
}
async function openOnline(joinCode) {
  showOverlay('#onlineOverlay');
  if (!olOn()) { olRender('setup'); return; }
  olRender('loading');
  try { await Online.init(); } catch (e) { console.warn(e); olRender('error'); return; }
  if (joinCode) {
    let gid = null; try { gid = await Online.joinRoom(joinCode); } catch (e) { console.warn(e); }
    if (gid) { startOnlineGame(gid); return; }
    toast(t('ol.noRoom'), 2200);
  }
  olRender('menu');
}
function olRender(view) {
  olView = view || olView;
  const Pr = window.Online && Online.profile, B = $('#olBody');
  if (olView === 'setup') { B.innerHTML = `<div class="ol-setup"><span class="ol-setup-ic">●</span><p class="ol-note">${t('ol.setup')}</p><p class="ol-note small">${t('ol.desc')}</p></div>`; return; }
  if (olView === 'loading') { B.innerHTML = `<div class="ol-wait"><div class="ol-spin"></div><small>${t('ol.loading')}</small></div>`; return; }
  if (olView === 'error' || !Pr) { B.innerHTML = `<p class="ol-note">${t('ol.error')}</p>`; return; }
  if (olView === 'menu') {
    B.innerHTML = `
      <p class="ol-note" style="margin:-8px 0 14px">${t('ol.desc')}</p>
      <div class="ol-grid"><div class="ol-col">
      <div class="ol-me"><input id="olName" maxlength="16" value="${olEsc(Pr.name)}" aria-label="name"><span class="ol-r">R <b>${Pr.rating}</b><small>${t('ol.record', { g: Pr.games || 0, w: Pr.wins || 0, l: Pr.losses || 0, d: Pr.draws || 0 })}</small></span></div>
      <div class="ol-tcbox"><div class="ol-tcl">${t('ol.tc')}</div>${olTcSel()}</div>
      <div class="ol-acts"><button class="mbtn go" id="olAuto">${t('ol.auto')}</button></div>
      <p class="ol-note small">${t('ol.rules')}</p>
      <div class="ol-sub">${t('ol.ranking')}</div><div class="ol-list" id="olRank"><div class="ol-note small">…</div></div>
      </div><div class="ol-col">
      <div class="ol-sub">${t('ol.rooms')}</div><div class="ol-list ol-rooms" id="olRooms">${olRoomRows(olRooms)}</div>
      ${olMyRoomHtml()}
      <div class="ol-sub">${t('ol.joinKey')}</div>
      <div class="ol-join"><input id="olCode" maxlength="5" placeholder="${t('ol.codePh')}" autocapitalize="characters"><button class="mbtn" id="olJoin">${t('ol.join')}</button></div>
      </div></div>`;
    $('#olName').onchange = async e => { try { e.target.value = await Online.setName(e.target.value); dockRender(); } catch (_) {} };
    $('#olAuto').onclick = olStartSearch;
    olWatchRooms();
    const cr = $('#olCreate'); if (cr) cr.onclick = olCreateRoom;
    $('#olJoin').onclick = async () => {
      const c = $('#olCode').value; olRender('loading');
      let gid = null; try { gid = await Online.joinRoom(c); } catch (e) { console.warn(e); }
      if (gid) startOnlineGame(gid); else { toast(t('ol.noRoom'), 2200); olRender('menu'); }
    };
    $('#olCode').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') $('#olJoin').click(); };
    Online.topPlayers(10).then(list => { const el = $('#olRank'); if (!el) return; el.innerHTML = list.length ? list.map((p, i) => `<div class="${p.me ? 'me' : ''}"><span>${i + 1}. ${olEsc(p.name)}</span><b>${p.rating}</b></div>`).join('') : `<div class="ol-note small">${t('ol.noRank')}</div>`; }).catch(() => {});
    return;
  }
  if (olView === 'search') {
    const s = olSearch || {};
    B.innerHTML = `<div class="ol-wait"><div class="ol-spin"></div><b>${t('ol.searching')}</b><small>${t('ol.searchInfo', { n: s.waiting || 0, w: s.window || 100, t: olFmtWait(s.wait || 0) })}</small>${olSearchTc(s)}</div>
      <div class="ol-sub">${t('ol.lobby', { n: olList.length })}</div>
      <div class="ol-list">${olList.map(p => `<div class="${p.me ? 'me' : ''}"><span>${olEsc(p.name)} <small>${olEsc(tcTag(p.tc))}</small>${p.game ? ' <small>' + t('ol.matched') + '</small>' : ''}</span><b>${p.rating}</b></div>`).join('')}</div>
      <div class="ol-acts"><button class="mbtn" id="olCancel">${t('ol.cancel')}</button></div>`;
    $('#olCancel').onclick = async () => { await Online.leaveLobby(); olRender('menu'); };
    return;
  }
  if (olView === 'room') {
    const R = Online.room; if (!R) { olView = 'menu'; olRender(); return; }
    olRoom = R.code;
    const url = location.origin + location.pathname + '?room=' + olRoom + (Online.mock ? '&mock=1' : '');
    const priv = Online.roomPriv;
    B.innerHTML = `<div class="ol-wait ${priv ? 'ol-closed' : 'ol-open'}"><span class="ol-lock">${t(priv ? 'ol.keyRoom' : 'ol.openRoom')}</span>${R.title ? `<b class="ol-rtitle">${olEsc(R.title)}</b>` : ''}<small>${t(priv ? 'ol.roomKey' : 'ol.roomCode')}</small><div class="ol-code" id="olRoomCode">${olRoom}</div><small class="ol-tcinfo">${t('ol.tcStart', { tc: tcName(Online.roomTc) })}</small><small>${t(priv ? 'ol.roomInfoKey' : 'ol.roomInfoOpen')}</small><small>${t('ol.roomKeep')} <b class="ol-left">${olLeftText()}</b></small></div>
      <div class="ol-acts ol-racts"><button class="mbtn" id="olCopy">${t('ol.copyLink')}</button><button class="mbtn warn" id="olCloseRoom">${t('ol.closeRoom')}</button><button class="mbtn" id="olBack">${t('ol.back')}</button></div>`;
    $('#olCopy').onclick = async () => { try { if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ title: t('meta.title'), url }); else { await navigator.clipboard.writeText(url); toast(t('ol.linkCopied'), 1400); } } catch (e) {} };
  }
}
async function olStartSearch() {
  olSearch = { waiting: 0, window: 100, wait: 0, tc: olTc() }; olList = [];
  olRender('search');
  try {
    await Online.enterLobby({
      onList: list => { olList = list; if (olView === 'search') olRender(); },
      onStatus: s => { olSearch = s; if (olView === 'search') olRender(); },
      onMatched: gid => startOnlineGame(gid),
      tc: olTc(),
    });
  } catch (e) { console.warn(e); olRender('error'); }
}
async function olCreateRoom() {
  const title = olTitle();
  olRender('loading');
  try { olRoom = await Online.createRoom({ onMatched: olRoomMatched, priv: olRk() === 'key', tc: olTc(), title }); olRender('room'); }
  catch (e) { console.warn(e); toast(t('ol.error'), 2000); olRender('menu'); }
}
// closing the dialog cancels a rated-game search, but the own room stays open (closed with "close room", by a join, or after Online.ROOM_TTL)
$('#olClose').onclick = async () => { hideOverlay('#onlineOverlay'); if (olOn() && Online.uid) { try { await Online.leaveLobby(); } catch (e) {} dockRender(); } };
window.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#onlineOverlay').classList.contains('show')) { e.stopImmediatePropagation(); $('#olClose').click(); } }, true);
// ---- the own room (kept while the dialog is closed)
function olLeftText() { const r = olOn() && Online.room; return r ? (r.game ? t('ol.st.play') : t('ol.roomLeft', { t: fmtClock(r.left) })) : ''; }
function olMyRoomHtml() {
  const r = Online.room;
  if (!r) return `<div class="ol-sub">${t('ol.newRoom')}</div>${olRkSel()}<label class="ol-title"><small>${t('ol.roomTitle')}</small><input id="olRoomTitle" maxlength="24" placeholder="${olEsc(t('ol.roomTitlePh'))}" value="${olEsc(olTitleSaved())}"></label><div class="ol-acts"><button class="mbtn" id="olCreate">${t(olRk() === 'key' ? 'ol.createKey' : 'ol.createOpen')}</button></div>`;
  return `<div class="ol-sub">${t('ol.myRoom')}</div><div class="ol-myroom ${r.priv ? 'ol-closed' : 'ol-open'}"><span class="ol-lock">${t(r.priv ? 'ol.keyRoom' : 'ol.openRoom')}</span>${r.title ? `<b class="ol-rtitle">${olEsc(r.title)}</b>` : ''}<b class="ol-mcode">${r.code}</b><small>${olEsc(tcTag(r.tc))} · <span class="ol-left">${olLeftText()}</span></small></div>
    <p class="ol-note small">${t('ol.roomKeep')}</p><div class="ol-acts"><button class="mbtn go" id="olShowRoom">${t('ol.showRoom')}</button><button class="mbtn warn" id="olCloseRoom">${t('ol.closeRoom')}</button></div>`;
}
async function olShowRoom() { if (!Online.room) return; Online.extendRoom().catch(() => {}); olRender('room'); }
async function olCloseRoomNow() { if (!Online.room) return; try { await Online.closeRoom(); } catch (e) { console.warn(e); } }
$('#olBody').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.classList.contains('dk-join')) olJoin(b.dataset.code, b);
  else if (b.id === 'olShowRoom') olShowRoom();
  else if (b.id === 'olCloseRoom') olCloseRoomNow();
  else if (b.id === 'olBack') olRender('menu');
});
// someone joined the own room: start the game even when the dialog is closed (an AI game / lesson / puzzle in progress is left)
function olRoomMatched(gid) {
  const away = !$('#onlineOverlay').classList.contains('show');
  document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show'));
  const again = net && net.done && net.game && net.game.post === 'again';
  startOnlineGame(gid, again ? t('ol.againGo') : away ? t('ol.roomJoined') : null);
}
function olOnRoom(ev, r, g) {
  if (ev === 'reopen') { toast(g ? olPostText(Object.assign({}, g, { host: Online.uid })) : t('ol.pReopen'), 3800); dockRender(); olRoomTick(); return; }
  if (ev === 'expired') toast(t('ol.roomExpired'), 3600);
  else if (ev === 'closed' && olView !== 'search' && olView !== 'loading') toast(t('ol.roomClosed'), 1800);
  else if (ev === 'gone') toast(t('ol.roomClosed'), 1800);
  if ((ev === 'closed' || ev === 'expired' || ev === 'gone') && $('#onlineOverlay').classList.contains('show') && (olView === 'menu' || olView === 'room')) olRender('menu');
  dockRender(); olRoomTick();
}
// remaining time of the own room (menu, room view, dock chip)
function olRoomTick() {
  const r = olOn() && Online.room, chip = $('#dkMyRoom'), btn = $('#dkRoom');
  if (btn) { const k = r ? 'ol.closeRoom' : 'ol.create'; if (btn.dataset.i18n !== k || btn.dataset.l !== LANG) { btn.dataset.i18n = k; btn.dataset.l = LANG; btn.textContent = t(k); btn.classList.toggle('warn', !!r); } }
  if (chip) { chip.classList.toggle('hidden', !r); if (r) { chip.textContent = (r.priv ? '🔒 ' : '🔓 ') + r.code + ' · ' + tcTag(r.tc) + ' · ' + (r.game ? t('ol.st.play') : fmtClock(r.left)); chip.title = t('ol.showRoom'); } }
  if (r) document.querySelectorAll('.ol-left').forEach(el => { el.textContent = olLeftText(); });
}
if (olOn()) { Online.onRoom(olOnRoom); setInterval(olRoomTick, 1000); }
// a reload during an online game keeps it: rejoin (and put the own room back) until the game is over
const OL_LIVE = 'gomoku-online-live';
function olLiveSave(gid) { try { const r = olOn() && Online.room; localStorage.setItem(OL_LIVE, JSON.stringify({ gid, room: r && r.game === gid ? { code: r.code, tc: r.tc, priv: r.priv, title: r.title } : null })); } catch (e) {} }
function olLiveClear() { try { localStorage.removeItem(OL_LIVE); } catch (e) {} }
setTimeout(async () => {
  let s = null; try { s = JSON.parse(localStorage.getItem(OL_LIVE) || 'null'); } catch (e) {}
  if (!s || !s.gid || !olOn()) return;
  try {
    await Online.init();
    const g = await Online.getGame(s.gid);
    if (!g || g.status !== 'play' || (g.b !== Online.uid && g.w !== Online.uid)) { olLiveClear(); return; }
    if (s.room) await Online.resumeRoom(Object.assign({ gid: s.gid }, s.room), { onMatched: olRoomMatched }).catch(e => console.warn(e));
    ['#newOverlay', '#resumeOverlay'].forEach(hideOverlay);
    startOnlineGame(s.gid, t('ol.resumed'));
  } catch (e) { console.warn(e); }
}, 0);

// the local game on the board (put back after spectating)
function olSnap() { return { moves: moves.slice(), cur, evals: evals.slice(), humanColor, mode: settings.mode, rgame, rule }; }
function olRestoreLocal(sv) {
  if (!sv || sv.mode === 'online') { newGame(); return; }
  settings.mode = sv.mode; setRule(sv.rule || 'renju'); moves = sv.moves; cur = sv.cur; evals = sv.evals; humanColor = sv.humanColor; rgame = sv.rgame || null;
  if (rgame && !rgame.over) rgame.t = Date.now();
  startPos = null; reviewing = cur !== moves.length; hintList = null; pend = -1; gameOverShown = gameOver(moves.length);
  shownKey = ''; syncStones(0); update(false); save(); afterPosition();
}
// stop following the online game before something else takes the board (spectators get their local game back)
function olDetach() { if (!net) return; if (net.spectate) olWatchStop(); else leaveOnlineGame(); }
// spec = room code: watch the game read-only (spectator) instead of playing it
function startOnlineGame(gid, intro, spec) {
  if (net && net.gid === gid) return;
  ['#onlineOverlay', '#resultOverlay', '#newOverlay', '#resumeOverlay', '#lessonOverlay', '#puzzleOverlay', '#rtConfirm'].forEach(hideOverlay);
  if (lesson || puzzle) exitSpecial();
  rtForfeit();
  const saved = spec ? (net ? (net.spectate ? net.saved : null) : olSnap()) : null;
  leaveOnlineGame();
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); rvCancel(); rv = null; rvOpen = false; stopPlay(); thinking = 0; animating = false;
  rgame = null; settings.mode = 'online'; setRule('renju');
  startPos = null; moves = []; cur = 0; reviewing = false; evals = []; hintList = null; gameOverShown = false; pend = -1;
  net = { gid, game: null, me: spec ? 0 : P1, opp: null, done: false, first: true, intro, spectate: !!spec, code: spec || null, saved, watchers: 0 };
  if (!spec) olLiveSave(gid);
  document.body.classList.add('in-online'); document.body.classList.toggle('in-watch', !!spec);
  net.unsub = spec ? Online.spectate(gid, onNetGame) : Online.watchGame(gid, onNetGame);
  net.wUnsub = Online.watchCount(gid, n => { if (net && net.gid === gid) { net.watchers = n; olWatchRender(); } });
  net.timer = setInterval(netTick, 250);
  shownKey = ''; syncStones(0); update(false);
  if (!spec) { toast(intro || t('ol.start'), intro ? 3200 : 1400); playChime(true); }
  mtab('game'); olWatchRender(); dockRender();
}
function leaveOnlineGame() {
  if (!net) return;
  if (!net.spectate) olLiveClear();
  net.unsub && net.unsub(); net.wUnsub && net.wUnsub(); clearInterval(net.timer);
  const wasOver = net.over;
  net = null; document.body.classList.remove('in-online', 'in-watch'); olWatchRender();
  if (settings.mode === 'online') settings.mode = 'pvp';
  gameOverShown = gameOver(moves.length) || !!wasOver;
  if (olOn() && Online.uid) { const r = Online.room; Online.setPresence(r && !r.game ? 'room' : 'idle', { room: r && !r.game && !r.priv ? r.code : null }).catch(() => {}); }
  renderInfo(); save();
}
// leaving a live online game (another game, lessons, puzzles, a new search…) = resigning it
function olResignLeave() {
  if (!olLive()) return;
  const gid = net.gid, g = net.game;
  Online.resign(gid).then(() => g && Online.applyResult(gid, g, 0)).catch(e => console.warn(e));
  leaveOnlineGame(); update(false);
}
// server state changed: append the opponent's moves (checked with the engine), detect the end of the game
function onNetGame(g) {
  if (!net || !g) return;
  net.game = g;
  const spec = net.spectate, me = spec ? 0 : g.w === Online.uid ? P1 : P2, first = net.first;
  net.first = false;
  net.me = me; net.opp = spec ? null : me === P1 ? g.b : g.w;
  if (first) {
    if (!spec) { humanColor = me; shownKey = ''; syncStones(cur); }
    olTcToast(g, spec ? net.intro || t('ol.watchStart') : (net.intro ? net.intro + ' · ' : '') + t('ol.youAre', { c: pname(me) }));
  }
  const ms = String(g.moves || '').split(' ').filter(Boolean), mine = ucisOf(moves);
  let reset = false;
  for (let i = 0; i < Math.min(ms.length, mine.length); i++) if (ms[i] !== mine[i]) { reset = true; break; }
  if (reset || (moves.length > ms.length && !net.pending)) { moves = []; evals = []; cur = 0; reviewing = false; reset = true; }
  const before = moves.length;
  for (const u of ms.slice(before)) {
    const m = Online.UCI_RE.test(u) ? sqOf(u) : -1;
    if (m < 0 || !posAt(moves.length).isLegal(m)) { if (!net.warned) { net.warned = true; toast(t('ol.illegal'), 2500); } console.warn('illegal online move', u); break; }
    moves.push(m);
  }
  const added = moves.length - before;
  if (added || reset || first) {
    if (!reviewing) cur = moves.length;
    const anim = added === 1 && !reviewing && !first && !reset;
    if (anim) { animating = animOn(); setTimeout(() => { animating = false; boardEl.classList.toggle('can', canHumanPlay()); }, moveDur()); }
    update(anim);
  } else renderInfo();
  if (!spec && g.status === 'play' && ms.length === moves.length) netMarkOver();
  if (g.status !== 'play' && !net.done) finishOnline(g);
  if (net && net.done) olAfter();
}
// a finished position on the board (five, full board) is reported by either player
function netMarkOver() {
  if (!net || net.spectate || net.marking || net.done) return;
  const st = statusAt(moves.length); if (!st.over) return;
  net.marking = true;
  Online.markOver(net.gid, st.winner || 0, st.why, moves.length).catch(e => console.warn(e)).finally(() => { if (net) net.marking = false; });
}
const olSideToMove = g => (Online.moveCount(g.moves) % 2 ? 'b' : 'w');
function olClocks() {
  if (!net) return;
  const g = net.game, live = !!(g && g.status === 'play' && !net.done), stm = g ? olSideToMove(g) : 'w', now = Online.now(), tc = Online.tcOf(g);
  for (const p of [P1, P2]) {
    const side = p === P1 ? 'w' : 'b', k = g ? Online.clockOf(g, side, live && side === stm && !net.pending, now) : { main: tc.main, left: tc.main, moving: false };
    const el = $('#count' + p), txt = fmtClock(Math.max(0, k.left));
    if (el.textContent !== txt) el.textContent = txt;
    el.classList.toggle('ol-clk', true); el.classList.toggle('ol-move', !!k.moving); el.classList.toggle('ol-low', !!k.moving && k.left <= 20000);
    // time signal (shared/tick.js): only my own clock while it runs (not for spectators)
    if (window.CountTick && !net.spectate && p === net.me) { if (k.moving && live) CountTick.feed(k.left, 'ol'); else CountTick.reset('ol'); }
    const h = $('#hand' + p), lbl = '+' + Math.round(tc.inc / 1000) + 's';
    if (h.textContent !== lbl) h.textContent = lbl;
  }
}
function olClocksOff() { [1, 2].forEach(p => { const el = $('#count' + p); if (el) el.classList.remove('ol-clk', 'ol-move', 'ol-low'); }); }
function netTick() {
  olWatchRender();
  if (net && net.done) { olAfter(); return; }
  if (!net || !net.game) return;
  olClocks();
  const g = net.game; if (g.status !== 'play') return;
  const stm = olSideToMove(g), mine = net.me === P1 ? 'w' : 'b';
  // the opponent ran out of time (with a little grace for latency): claim the win
  if (!net.spectate && stm !== mine && !net.pending && !net.claiming && Online.clockOf(g, stm, true).left < -Online.GRACE) {
    net.claiming = true; Online.claimTimeout(net.gid, net.opp, false).catch(() => {}).finally(() => { if (net) net.claiming = false; });
  }
}
function netMove(m) {
  if (!olLive() || !net.game || net.game.status !== 'play' || net.pending || cur !== moves.length || toMoveAt(cur) !== net.me) { update(false); return; }
  const n = moves.length, uci = sqName(m);
  net.pending = true;
  playMove(m);
  const gid = net.gid;
  Online.sendMove(gid, n, uci).then(ok => {
    if (!net || net.gid !== gid) return; net.pending = false;
    if (!ok) { onNetGame(net.game); return; }      // rejected (race / flag fell / game over): resync with the server
    netMarkOver(); renderInfo();
  }).catch(e => { console.warn(e); if (!net) return; net.pending = false; toast(t('ol.error'), 2200); onNetGame(net.game); });
}
async function finishOnline(g) {
  net.done = true;
  if (!net.spectate) olLiveClear();
  const W = g.w, bst = statusAt(moves.length);
  let winner, why;
  if (g.status === 'resign') { winner = g.loser === W ? P2 : P1; why = 'resign'; }
  else if (g.status === 'timeout') { winner = g.draw ? 0 : g.loser === W ? P2 : P1; why = g.draw ? 'timeDraw' : 'time'; }
  else { winner = typeof g.win === 'number' ? g.win : bst.over ? bst.winner || 0 : 0; why = g.reason || bst.why || 'five'; }
  net.over = { over: true, winner, draw: !winner, why };
  gameOverShown = true; pend = -1;
  update(false); olClocks();
  const nameOf = p => (p === P1 ? g.wn : g.bn);
  const whyTxt = mine => why === 'resign' ? (mine ? t(g.loser === Online.uid ? 'ol.youResigned' : 'ol.oppResigned') : t('ol.wResign'))
    : why === 'time' ? (mine ? t(g.loser === Online.uid ? 'ol.youTimeout' : 'ol.oppTimeout') : t('ol.wTime'))
    : why === 'timeDraw' ? t('ol.timeDraw') : t('res.why.' + why);
  if (net.spectate) {        // spectators: who won and why (no rating change, no result dialog, nothing written)
    net.result = (winner ? t('ol.wWin', { c: pname(winner), n: nameOf(winner) }) : t('res.draw')) + ' · ' + whyTxt(false);
    toast(net.result, 4200); playChime(true); olWatchRender(); dockRender();
    return;
  }
  const score = !winner ? 0.5 : winner === net.me ? 1 : 0, gid = net.gid;
  let r = { old: Online.profile.rating, now: Online.profile.rating, rated: !!g.rated };
  try { r = await Online.applyResult(gid, g, score); } catch (e) { console.warn(e); }
  if (!net || net.gid !== gid) return;
  $('#resultDisc').innerHTML = winner ? `<div class="pdisc p${winner}"></div>` : '';
  $('#resultTitle').textContent = t(score === 1 ? 'res.youWin' : score === 0 ? 'ol.lose' : 'res.draw');
  const diff = r.now - r.old;
  $('#resultSub').innerHTML = olEsc(whyTxt(true)) + '<br>' + t('res.sub', { n: moves.length }) + '<br>' + (r.rated ? `<span class="rt-res">R ${r.old} → <b>${r.now}</b> (${rtD(diff)})</span>` : olEsc(t('ol.unrated')));
  showOverlay('#resultOverlay');
  playChime(score >= 0.5); if (score === 1) confetti();
  dockRender();
}
// side-panel name: "you" tag + name (cut with … when long) + rating (always visible)
function olPName(el, p) {
  const g = net && net.game;
  if (!g) { el.classList.remove('pn'); el.textContent = '… · ' + pname(p); return; }
  const nm = p === P1 ? g.wn : g.bn, r = p === P1 ? g.wr : g.br, you = !net.spectate && p === net.me;
  const h = (you ? `<span class="pn-you">${olX(t('you'))}</span>` : '') + `<span class="pn-n">${olX(nm)}</span><span class="pn-r">${olX(r)}</span>`;
  el.classList.add('pn'); el.title = (you ? t('you') + ' · ' : '') + nm + ' (' + r + ') · ' + pname(p);
  if (el.innerHTML !== h) el.innerHTML = h;
}
$('#btnResign').onclick = () => { if (olLive()) olConfirm(t('confirm.resign'), t('resign.yes'), () => { if (olLive()) Online.resign(net.gid).catch(e => { console.warn(e); toast(t('ol.error'), 2000); }); }); };
$('#btnOnline').onclick = () => openOnline();
// a small yes / no dialog (shared with the rated-game confirmation)
function olConfirm(text, yes, fn) {
  $('#rtConfirmHead').textContent = t('ol.title'); $('#rtConfirmText').textContent = text; $('#rtConfirmYes').textContent = yes;
  showOverlay('#rtConfirm');
  $('#rtConfirmYes').onclick = () => { hideOverlay('#rtConfirm'); fn(); };
}
// buttons that leave a live online game ask first (the game is then resigned)
const OL_GUARD = '#btnNew, #btnLesson, #btnPuzzle, #btnStart, #dkAuto, .dk-join, #olAuto, #olJoin, #btnPaste';
let olPass = false;
document.addEventListener('click', e => {
  if (olPass || !olLive()) return;
  const b = e.target.closest && e.target.closest(OL_GUARD); if (!b || b.disabled) return;
  e.preventDefault(); e.stopImmediatePropagation();
  olConfirm(t('ol.leaveQ'), t('ol.leaveYes'), () => {
    olResignLeave();
    if (b.id === 'btnNew') { openNewDialog(); return; }
    olPass = true; try { b.click(); } finally { olPass = false; }
  });
}, true);

// ====================================================================== online dock (PC: bar at the bottom / phone: "online" tab)
const dock = { on: false, open: false, players: [], rooms: [], lobby: [], rank: [], unsub: [] };
const OL_ST = { idle: 'ol.st.idle', lobby: 'ol.st.lobby', room: 'ol.st.room', play: 'ol.st.play', watch: 'ol.st.watch' };
function dockRender() {
  if (!dock.on) return;
  const me = Online.profile;
  $('#dkStat').textContent = t('ol.dockStat', { n: dock.players.length, w: dock.lobby.length, r: dock.rooms.length });
  $('#mtCount').textContent = dock.players.length ? String(dock.players.length) : '';
  const tcEl = $('#dkTc'); if (tcEl.dataset.l !== LANG) tcEl.outerHTML = olTcSel('dk-tc').replace('class="ol-tc dk-tc"', 'class="ol-tc dk-tc" id="dkTc" data-l="' + LANG + '"');
  if (!dock.editing) $('#dkMe').innerHTML = me ? `<button class="dk-name" title="${olEsc(t('ol.rename'))}">${olEsc(me.name)} <span>✎</span></button> <b>R ${me.rating}</b>` + (net && net.spectate ? ` · ${t('ol.st.watch')}` : net && !net.done && net.game ? ` · ${t('ol.st.play')}` : olView === 'search' && $('#onlineOverlay').classList.contains('show') ? ` · ${t('ol.st.lobby')}` : Online.room ? ` · ${t('ol.st.room')}` : '') : '';
  $('#dkPlayers').innerHTML = dock.players.length ? dock.players.map(p => `<div class="${p.me ? 'me' : ''}"><span>${olEsc(p.name)} <small class="st st-${olEsc(p.st || 'idle')}">${t(OL_ST[p.st] || 'ol.st.idle')}</small></span><b>${p.rating ?? ''}</b></div>`).join('') : `<div class="ol-note small">${t('ol.nobody')}</div>`;
  $('#dkRooms').innerHTML = olRoomRows(dock.rooms);
  $('#dkRank').innerHTML = dock.rank.length ? dock.rank.map((p, i) => `<div class="${p.me ? 'me' : ''}"><span>${i + 1}. ${olEsc(p.name)}</span><b>${p.rating}</b></div>`).join('') : `<div class="ol-note small">${t('ol.noRank')}</div>`;
}
async function dockStart() {
  if (dock.on || !olOn()) return;
  try { await Online.init(); } catch (e) { console.warn(e); $('#dkStat').textContent = t('ol.error'); return; }
  if (dock.on) return;
  dock.on = true;
  Online.setPresence(net && net.spectate ? 'watch' : net && !net.done ? 'play' : 'idle').catch(() => {});
  dock.unsub.push(Online.watchPresence(l => { dock.players = l; dockRender(); }));
  dock.unsub.push(Online.watchRooms(l => { dock.rooms = l; dockRender(); }));
  dock.unsub.push(Online.watchLobby(l => { dock.lobby = l; dockRender(); }));
  const rk = () => Online.topPlayers(10).then(l => { dock.rank = l; dockRender(); }).catch(() => {});
  rk(); setInterval(rk, 60000);
  dockRender();
}
function dockToggle(open) { dock.open = open ?? !dock.open; document.body.classList.toggle('dock-open', dock.open); $('#dkToggle').textContent = dock.open ? '▼' : '▲'; }
$('#dkToggle').onclick = () => dockToggle();
$('#dkMe').addEventListener('click', e => {
  const b = e.target.closest('.dk-name'); if (!b || !Online.profile) return;
  e.stopPropagation();
  dock.editing = true;
  $('#dkMe').innerHTML = `<input class="dk-input" maxlength="16" value="${olEsc(Online.profile.name)}" aria-label="name"><button class="dk-btn dk-ok">${t('ol.save')}</button>`;
  const inp = $('#dkMe .dk-input'); inp.focus(); inp.select();
  const done = async ok => {
    if (!dock.editing) return; dock.editing = false;
    if (ok) { try { const n = await Online.setName(inp.value); toast(t('ol.renamed', { n }), 1400); const f = $('#olName'); if (f) f.value = n; } catch (_) {} }
    dockRender();
  };
  inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') done(true); else if (ev.key === 'Escape') done(false); });
  inp.addEventListener('click', ev => ev.stopPropagation());
  $('#dkMe .dk-ok').addEventListener('click', ev => { ev.stopPropagation(); done(true); });
  inp.addEventListener('blur', () => setTimeout(() => { if (dock.editing && document.activeElement !== $('#dkMe .dk-ok')) done(true); }, 150));
});
$('#dock .dock-bar').addEventListener('click', e => { if (!e.target.closest('button') && !e.target.closest('input')) dockToggle(); });
$('#dkAuto').onclick = async () => { await openOnline(); if (olOn() && Online.uid) olStartSearch(); };
$('#dkRoom').onclick = async () => {
  if (olOn() && Online.room) { olCloseRoomNow(); return; }
  await openOnline(); const c = $('#olCreate'); if (c) c.scrollIntoView({ block: 'center' });
};
$('#dkMyRoom').onclick = async () => { await openOnline(); if (Online.room) olShowRoom(); };
$('#dock').addEventListener('click', e => { const b = e.target.closest('.dk-join'); if (b) olJoin(b.dataset.code, b); });
// phone tabs
function mtab(v) { document.body.classList.toggle('mtab-online', v === 'online'); $('#mtabs').querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.t === v)); if (v === 'online') dockStart(); }
$('#mtabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) mtab(b.dataset.t); });
if (olOn()) setTimeout(dockStart, 800); else document.body.classList.add('no-online');
$('#langSel').addEventListener('change', () => { olRoomTick(); dockRender(); chatRender(); if ($('#onlineOverlay').classList.contains('show')) olRender(); });

// ---- after a room game: either player may ask for a rematch (the other has Online.REMATCH_MS to answer); otherwise the guest
// leaves (declined / no answer / left the result screen) and the host's room takes entrants again. Rated games are not affected.
function olRoomGame(g) { return !!(g && g.room && !g.rated); }
function olPostText(g) {        // why the guest left, from the point of view of this player
  const me = Online.uid, host = g.host === me;
  const by = g.post === 'no' ? ((g.again && g.again.by === me) ? 'opp' : 'me') : null;
  if (host) return (g.post === 'no' ? t(by === 'me' ? 'ol.pNoMe' : 'ol.pNoOpp') + ' · ' : g.post === 'timeout' ? t('ol.pTimeout') + ' · ' : g.post === 'left' ? t('ol.pLeft') + ' · ' : '') + t('ol.pReopen');
  return (g.post === 'no' ? t(by === 'me' ? 'ol.pNoMe' : 'ol.pNoOpp') + ' · ' : g.post === 'timeout' ? t('ol.pTimeout') + ' · ' : g.post === 'host' ? t('ol.pHost') + ' · ' : '') + t('ol.pOut');
}
function olAfter() {
  const box = $('#olAgain'), btn = $('#btnAgain');
  const g = net && net.done && net.game;
  if (net && net.spectate) {      // spectator: follow the rematch, or stay on the final position
    box.classList.add('hidden');
    if (!g) return;
    if (g.next) { if (net.gid !== g.next) startOnlineGame(g.next, t('ol.watchNext'), net.code); return; }
    if (g.post && g.post !== 'again' && !net.note) { net.note = t('ol.watchEnd'); toast(net.note, 3200); olWatchRender(); }
    return;
  }
  if (!olRoomGame(g)) { box.classList.add('hidden'); btn.disabled = false; return; }
  const me = Online.uid, gid = net.gid;
  if (g.next) { if (net.gid !== g.next) startOnlineGame(g.next, t('ol.againGo')); return; }
  if (g.post && g.post !== 'again' && !net.postSeen) {
    net.postSeen = true;
    if (g.host !== me) { toast(olPostText(g), 3800); Online.setPresence(Online.room ? 'room' : 'idle', { room: Online.room && !Online.room.priv ? Online.room.code : null }).catch(() => {}); }
  }
  const pending = g.again && !g.post;
  const left = pending ? Math.max(0, Math.ceil((Online.REMATCH_MS - (Online.now() - g.again.t)) / 1000)) : 0;
  if (pending && left <= 0 && !net.expiring) { net.expiring = true; Online.expireRematch(gid).catch(() => {}).finally(() => { if (net) net.expiring = false; }); }
  let h = '', muted = false;
  if (g.post === 'again') h = `<span>${olX(t('ol.againGo'))}</span>`;
  else if (g.post) { h = `<span>${olX(olPostText(g))}</span>`; muted = true; }
  else if (pending && g.again.by === me) h = `<span>${olX(t('ol.againWait', { s: '\u0001' })).replace('\u0001', `<b class="cd">${left}</b>`)}</span>`;
  else if (pending) h = `<span>${olX(t('ol.againAsk', { s: '\u0001' })).replace('\u0001', `<b class="cd">${left}</b>`)}</span><button class="mbtn go" id="olAgainYes">${olX(t('ol.againYes'))}</button><button class="mbtn" id="olAgainNo">${olX(t('ol.againNo'))}</button>`;
  box.classList.toggle('hidden', !h); box.classList.toggle('muted', muted);
  if (box.dataset.h !== h) { box.dataset.h = h; box.innerHTML = h; }
  btn.disabled = !!(pending && g.again.by === me) || g.post === 'again';
}
$('#olAgain').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || !net || !net.done) return;
  if (b.id === 'olAgainYes' || b.id === 'olAgainNo') { b.disabled = true; Online.answerRematch(net.gid, b.id === 'olAgainYes').catch(() => {}); }
});
// leaving the result screen of a room game in any way (view board, outside click, Esc, new game, …): the guest leaves the room,
// the host stays in it but offers no rematch (the guest is told and leaves)
new MutationObserver(() => {
  const shown = $('#resultOverlay').classList.contains('show');
  if (shown) { if (net && net.done) net.resShown = true; else { $('#olAgain').classList.add('hidden'); $('#btnAgain').disabled = false; } return; }
  const g = net && net.done && net.resShown && !net.spectate && net.game;
  if (!olRoomGame(g) || g.post || g.next) return;
  Online.setPost(net.gid, g.host === Online.uid ? 'host' : 'left').catch(() => {});
}).observe($('#resultOverlay'), { attributes: true, attributeFilter: ['class'] });

// ---- spectating the game of an OPEN room (read-only; follows rematches). net.spectate: no moves, no result / rating / rematch / room
// writes, no resume after a reload. The only write is the spectator count (Online.spectate); players see "N watching" as well.
function olWatchRender() {
  const el = $('#olWatch'); if (!el) return;
  const n = (net && net.watchers) || 0, spec = !!(net && net.spectate);
  let h = '';
  if (spec) {
    h = (net.result || net.note ? `<span class="wr">${olX(net.result || '')}${net.note ? `<small>${olX(net.note)}</small>` : ''}</span>` : '')
      + `<span class="wl">👁 ${olX(t('ol.st.watch'))}</span><span class="wi">${n ? olX(t('ol.watchers', { n })) : ''}</span>`
      + `<button type="button" class="warn" id="olWatchStop">${olX(t('ol.watchStop'))}</button>`;
  } else if (net && n) h = `<span class="wi">👁 ${olX(t('ol.watchers', { n }))}</span>`;
  el.classList.toggle('hidden', !h); el.classList.toggle('pl', !!h && !spec);
  if (el.dataset.h !== h) { el.dataset.h = h; el.innerHTML = h; }
}
async function olWatchRoom(code, btn) {
  if (olLive()) { toast(t('ol.watchBusy'), 2200); return; }
  if (btn) btn.disabled = true;
  let gid = null; try { await Online.init(); gid = await Online.roomGameOf(code); } catch (e) { console.warn(e); }
  if (btn) btn.disabled = false;
  if (!gid) { toast(t('ol.noWatch'), 2200); return; }
  mtab('game');
  if (net && net.spectate && net.gid === gid) { hideOverlay('#onlineOverlay'); return; }
  startOnlineGame(gid, null, code);
}
// "stop watching": back to the local game that was on the board before watching
function olWatchStop() {
  if (!net || !net.spectate) return;
  const sv = net.saved; leaveOnlineGame(); olRestoreLocal(sv);
  dockRender();
}
document.addEventListener('click', e => {
  const b = e.target.closest('.dk-watch, #olWatchStop'); if (!b) return;
  e.stopPropagation();
  if (b.id === 'olWatchStop') olWatchStop();
  else olWatchRoom(b.dataset.code, b);
}, true);

// ---- public chat: one room shared by everyone online in this game (latest Online.CHAT_N messages; no private messages)
const chat = { list: [], seen: -1, unsub: null };
const olCoarse = () => matchMedia('(pointer: coarse)').matches;
function chatVisible() { return document.body.classList.contains('mtab-online') || !olCoarse(); }
function chatShown() { return dock.on && !document.body.classList.contains('no-online') && (!olCoarse() || document.body.classList.contains('mtab-online')); }
function chatStart() {
  if (chat.unsub || !window.Online || !Online.uid) return;
  chat.unsub = Online.watchChat(l => {
    const top = l.length ? l[l.length - 1].n : 0;
    chat.list = l;
    if (chat.seen < 0 || chatVisible()) chat.seen = top;      // history present on arrival is not "unread"
    chatRender();
  });
}
function chatTime(ts) { if (typeof ts !== 'number') return ''; const d = new Date(ts); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
function chatRender() {
  const el = $('#dkChat'), inp = $('#dkChatIn'); if (!el || !olOn()) return;
  if (inp && inp.dataset.l !== LANG) { inp.dataset.l = LANG; inp.placeholder = matchMedia('(hover: hover) and (pointer: fine)').matches ? t('ol.chatPh') : t('ol.chatPh').split(' · ')[0]; inp.setAttribute('aria-label', t('ol.chat')); $('#dkChatSend').textContent = t('ol.chatSend'); $('#dkChatHead').title = t('ol.chatNote'); }
  const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  const h = chat.list.length ? chat.list.map(m => `<div class="cm${m.me ? ' me' : ''}"><b>${olX(m.name)}</b><span>${olX(m.text)}</span><time>${chatTime(m.t)}</time></div>`).join('')
    : `<div class="ol-note small">${olX(t('ol.chatEmpty'))}<br>${olX(t('ol.chatNote'))}</div>`;
  if (el.dataset.h !== h) { el.dataset.h = h; el.innerHTML = h; if (bottom || chat.toBottom) el.scrollTop = el.scrollHeight; chat.toBottom = false; }
  const n = chat.list.filter(m => m.n > chat.seen && !m.me).length, badge = $('#dkUnread'), mt = $('#mtChat');
  badge.classList.toggle('hidden', !n); badge.querySelector('b').textContent = n > 9 ? '9+' : String(n);
  const last = chat.list[chat.list.length - 1]; badge.title = last ? last.name + ': ' + last.text : '';
  if (mt) mt.textContent = n ? '💬' + (n > 9 ? '9+' : n) : '';
  const st = $('#mtStrip');
  if (st) { const hs = chat.list.length ? chat.list.slice(-2).map(m => `<div class="${m.me ? 'me' : ''}"><b>${olX(m.name)}</b>${olX(m.text)}</div>`).join('') : `<div class="empty">💬 ${olX(t('ol.chat'))} · ${olX(t('ol.chatEmpty'))}</div>`; if (st.dataset.h !== hs) { st.dataset.h = hs; st.innerHTML = hs; } }
}
function chatSeen() { if (chatVisible() && chat.list.length) { const top = chat.list[chat.list.length - 1].n; if (top !== chat.seen) { chat.seen = top; chatRender(); } } }
new MutationObserver(chatSeen).observe(document.body, { attributes: true, attributeFilter: ['class'] });
// open the chat (PC: unfold the dock, phone: online tab) and put the cursor in the input
function chatOpen(focus) {
  if (olCoarse()) { if (!document.body.classList.contains('mtab-online')) mtab('online'); }
  else if (!dock.open) dockToggle(true);
  chatStart();
  const el = $('#dkChat'); chat.toBottom = true; el.scrollTop = el.scrollHeight;
  if (focus) { const inp = $('#dkChatIn'); inp.focus({ preventScroll: true }); chatKeep(); }
  else if (olCoarse()) $('#dkChatForm').scrollIntoView({ block: 'end', behavior: 'smooth' });
}
// phones: keep the input above the on-screen keyboard
function chatKeep() {
  if (!olCoarse()) return;
  const vv = window.visualViewport;
  document.body.style.setProperty('--kb', vv ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) + 'px' : '0px');
  setTimeout(() => { if (document.activeElement === $('#dkChatIn')) $('#dkChatForm').scrollIntoView({ block: 'end' }); }, 250);
}
if (window.visualViewport) visualViewport.addEventListener('resize', () => { if (document.activeElement === $('#dkChatIn')) chatKeep(); else document.body.style.setProperty('--kb', '0px'); });
async function chatSend() {
  const inp = $('#dkChatIn'), v = inp.value;
  if (!v.trim()) return false;
  if (!Online.uid) { try { await Online.init(); } catch (e) { toast(t('ol.error'), 1600); return false; } }
  const r = await Online.sendChat(v);
  if (r.ok) { inp.value = ''; chat.toBottom = true; return true; }
  toast(t(r.why === 'rate' ? 'ol.chatWait' : 'ol.error'), 1600);
  return false;
}
$('#dkChatForm').addEventListener('submit', e => { e.preventDefault(); chatSend(); if (olCoarse()) $('#dkChatIn').focus({ preventScroll: true }); });
$('#dkChatIn').addEventListener('keydown', e => {
  e.stopPropagation();                        // typing never reaches the board / record shortcuts
  if (e.key === 'Escape') { e.preventDefault(); e.target.blur(); return; }
  if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
  e.preventDefault();
  chatSend(); if (!olCoarse()) e.target.blur();   // back to the board: game keys work again
});
$('#dkChatIn').addEventListener('focus', () => { chatStart(); chatKeep(); });
$('#dkChatIn').addEventListener('blur', () => document.body.style.setProperty('--kb', '0px'));
$('#mtStrip').addEventListener('click', () => chatOpen(true));
$('#dkUnread').addEventListener('click', e => { e.stopPropagation(); chatOpen(!olCoarse()); });
// Enter anywhere (not in a field, no dialog open) = type in the chat
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
  const tg = e.target; if (tg && tg.closest && tg.closest('input,textarea,select,[contenteditable="true"]')) return;
  if (document.querySelector('.overlay.show') || !chatShown()) return;
  e.preventDefault(); chatOpen(true);
});
if (olOn()) setInterval(() => { if (dock.on) chatStart(); }, 1000);

// ====================================================================== boot
const hadSave = load();
// board & piece skin: applied immediately, kept with the settings
function applySkin() {
  ['grain', 'metal', 'ink'].forEach(k => document.body.classList.toggle('skin-' + k, settings.skin === k));
  $('#segSkin').querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === (settings.skin || 'classic')));
}
$('#segSkin').onclick = e => { const b = e.target.closest('button'); if (!b) return; settings.skin = b.dataset.v; applySkin(); save(); };
applySkin();
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) { LANG = q; try { localStorage.setItem('aicoding-lang', q); } catch (e) {} } }
applyI18n(); drawGrid();
$('#langSel').onchange = e => {
  LANG = e.target.value; settings.lang = LANG; save(); applyI18n();
  try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {}
  renderInfo(); renderBoard(false);
  if ($('#newOverlay').classList.contains('show')) segSync();
  if ($('#lessonOverlay').classList.contains('show') && openChoiceIdx >= 0 && !$('#lessonIntroView').classList.contains('hidden')) openOpeningChoice(openChoiceIdx);
  if ($('#rulesOverlay').classList.contains('show')) renderRules();
  if (HB) HB.relabel();
  if (lesson) renderLessonCard(); if (puzzle) renderPuzzleCard();
  if ($('#lessonOverlay').classList.contains('show')) { if (!$('#lessonListView').classList.contains('hidden')) openLessons(); else if (!$('#lessonIntroView').classList.contains('hidden')) openIntro(introIdx); }
  if ($('#puzzleOverlay').classList.contains('show')) { if (!$('#pzListView').classList.contains('hidden')) openPuzzles(); else openPzGrid(pzLevel); }
  if ($('#lessonOverlay').classList.contains('show') && !$('#lessonListView').classList.contains('hidden') && $('#lsListTitle').textContent === t('op.title')) openOpenings();
};
const olRoomQ = (new URLSearchParams(location.search).get('room') || (location.hash.match(/room=([A-Za-z0-9]{5})/) || [])[1] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
if (loadFromHash()) { /* shared game opened */ }
else if (!hadSave) { update(false); if (!olRoomQ) openNewDialog(); }
else { update(false); afterPosition(); }
// ?room=CODE (or #room=CODE): join a friend's online room
if (olRoomQ) {
  try { const u = new URL(location.href); u.searchParams.delete('room'); if (/room=/.test(u.hash)) u.hash = ''; history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (e) {}
  openOnline(olRoomQ);
}
window.__gm = { get net() { return net; }, get moves() { return moves; }, get cur() { return cur; }, get rule() { return rule; }, settings, get rv() { return rv; }, rvJudge, dailyPick, parseGameText, statusAt, posAt, newGame, sanOf, onPoint, get lesson() { return lesson; }, get puzzle() { return puzzle; }, startLesson, startPuzzle, lessonsReady, puzzlesReady, openReady, get LESSONS() { return LESSONS; }, get PUZZLES() { return PUZZLES; }, get OPEN() { return OPEN; }, commit, startStudy, startPractice, openOpenings, openPuzzles, openLessons, openRules, runReview };

function dismissOverlay(o) {
  const OUTSIDE = { newOverlay: '#btnCancelNew', resultOverlay: '#btnReview', pasteOverlay: '#pasteCancel', puzzleOverlay: '#pzClose', rulesOverlay: '#rulesClose', onlineOverlay: '#olClose' };
  if (o.id === 'lessonOverlay') { const done = $('#lessonDoneView'); if (done && !done.classList.contains('hidden')) $('#btnLessonQuit2').click(); else $('#btnLessonClose').click(); return; }
  const b = OUTSIDE[o.id] && $(OUTSIDE[o.id]); if (b) b.click(); else o.classList.remove('show');
}
document.querySelectorAll('.overlay').forEach(o => {
  let down = false;
  o.addEventListener('pointerdown', e => { down = e.target === o; });
  o.addEventListener('click', e => { if (e.target !== o || !down) return; down = false; dismissOverlay(o); });
});
function backToBoard() { document.querySelectorAll('.overlay.show').forEach(o => dismissOverlay(o)); if (lesson || puzzle) quitSpecial(); if (document.body.classList.contains('mtab-online')) mtab('game'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
(() => { const h = $('.brand h1.to-board'); if (!h) return; h.addEventListener('click', backToBoard); h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); backToBoard(); } }); })();
function rsInProgress() { return !lesson && !puzzle && moves.length > 0 && !gameOver(moves.length); }
function rsViewing() { return !lesson && !puzzle && reviewing; }
function rsOpen() {
  if (net) { openNewDialog(); return; }
  if (!rsInProgress() && !rsViewing()) { openNewDialog(); return; }
  $('#rsText').textContent = rsViewing() ? t('rs.viewing', { n: cur }) : t('rs.playing', { n: moves.length });
  $('#resumeOverlay').classList.add('show');
}
$('#rsCancel').onclick = () => $('#resumeOverlay').classList.remove('show');
$('#rsRestart').onclick = () => { $('#resumeOverlay').classList.remove('show'); openNewDialog(); };
$('#rsResume').onclick = () => { $('#resumeOverlay').classList.remove('show'); if (reviewing) resumeHere(); };
let playTimer = 0;
function stopPlay() { clearInterval(playTimer); playTimer = 0; const b = $('#navPlay'); if (b) b.classList.remove('playing'); }
function navGo(what) {
  if (lesson || puzzle) return;
  const N = moves.length;
  if (what === 'play') {
    if (playTimer) { stopPlay(); return; }
    if (cur >= N) viewAt(0);
    $('#navPlay').classList.add('playing');
    playTimer = setInterval(() => { if (lesson || puzzle || cur >= moves.length) { stopPlay(); return; } viewAt(cur + 1); }, 900);
    return;
  }
  stopPlay();
  const to = what === 'first' ? 0 : what === 'last' ? N : what === 'prev' ? cur - 1 : cur + 1;
  if (to < 0 || to > N || to === cur) return;
  viewAt(to);
}
$('#navBar').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (b) navGo(b.dataset.n); });
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
  if (document.querySelector('.overlay.show')) return;
  // opening study: the arrow keys step through the line like the kifu (← → one move, ↓ ↑ first / last)
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

// first-time banner in the new-game dialog → illustrated rules
if (window.RulesOffer) RulesOffer.init({ game: 'gomoku', lang: () => LANG, open: () => openRules('basic'), watch: '#rulesOverlay' });
// PC header bar: title left, menu (new > undo > hint > rules > lessons > puzzles) + icons right, game info in between
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnHint', '#btnRules', '#btnLesson', '#btnPuzzle'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => renderInfo());
if (window.CountTick) CountTick.setMuted(() => !settings.sound);
renderInfo();
