'use strict';
// Ultimate Tic-Tac-Toe — page script, built on the Kōnane page (the site's 2D template: board + side panel, AI (Lv.1–20 + 天上)
// in Web Workers, rated games vs the AI (予備選), lessons, puzzles ("win in N", PZBook v2), post-game review with a coach,
// share / paste, daily puzzle). The board: 9 small boards × 9 cells, a move m = board * 9 + cell (engine.js).
// ====================================================================== rules (shared with the engine)
const E = window.UtttEngine, WIN = E.WIN, WINT = E.WINT;
const P1 = 1, P2 = 2;                 // P1 = X (moves first), P2 = O
const RULE_ORDER = E.RULE_ORDER;
const mB = E.mB, mC = E.mC;
const NS_ = () => 9, NN_ = () => 81;
let gv = 'std';
let HB = null;                        // PC header bar (shared/headerbar.js)
let startSpec = null;                 // lesson / puzzle start position (null = the empty board)
let moves = [];                       // game record (move numbers, see engine.js)
let cur = 0;                          // number of moves shown
let flip = false;                     // (the board is never turned round: X and O sit on the same grid either way)
function setVariant(k) { gv = E.ruleKey(E.ruleOf(k || settings.rule)); settings.rule = gv; E.setRule(gv); anaCache.clear(); }
const startKey = () => gv + ':' + (startSpec ? startSpec.b + '/' + startSpec.side + '/' + (startSpec.n == null ? '' : startSpec.n) + '/' + (startSpec.f == null ? '' : startSpec.f) + '/' + (startSpec.w || '') : '');
const keyOf = i => startKey() + '|' + moves.slice(0, i).join(',');
let posCache = { key: '' };
function posAt(i) {
  const key = keyOf(i);
  if (posCache.key === key) return posCache;
  const r = E.replay(startSpec, moves.slice(0, i));
  posCache = { key, pos: r.pos };
  return posCache;
}
// {over, winner, draw, why}
function statusAt(i) {
  if (manualEnd && !kenSw && manualEnd.n === moves.length && i === moves.length && !lesson && !puzzle && settings.mode !== 'online') return manualEnd;
  if (settings.mode === 'online' && !kenSw && window.olOver && i === moves.length && !lesson && !puzzle) { const o = olOver(); if (o) return o; }
  if (rgame && rgame.over && !kenSw && i === moves.length && !lesson && !puzzle) return rgame.over;
  return E.judge(posAt(i).pos);
}
const toMoveAt = i => posAt(i).pos.turn;
// move name (the whole 9 × 9 grid: columns a–i, rows 1–9 from the bottom)
function mvAt(i) { return E.name(null, moves[i]); }
function mvIn(pos, m) { return E.name(pos, m); }
const isPass = m => m < 0;

// ====================================================================== state
const STORE = 'aicoding-uttt';
const settings = { mode: 'ai', rule: 'std', color: 1, level: 6, level2: 6, anim: true, sound: true, hint: false, eval: true, last: true, send: true, num: true, coach: true, lang: '', bd: 'walnut', pcs: 'token' };
const SUPPORTED = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
function detectLang() { const n = (navigator.language || 'ja').toLowerCase(); if (/^zh-(tw|hk|mo|hant)/.test(n)) return 'zh-TW'; return ['ja', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'].find(c => n.startsWith(c)) || 'en'; }
let LANG = detectLang();
const AIW = () => ({ ru: 'ИИ', tr: 'YZ' })[LANG] || 'AI';   // the word "AI" in displayed player labels (ru / tr use their own abbreviation; saved records keep 'AI')
function t(k, v) { let x = (I18N[LANG] || I18N.en)[k]; if (x === undefined) x = I18N.en[k]; if (x === undefined) x = I18N.ja[k]; if (x === undefined) return k; if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; }
const pname = p => t(p === P1 ? 'p1' : 'p2');
// AI strength: Lv.1 … Lv.20 for people, then 天上Ⅰ–Ⅲ (common rule「天上レベル」: benchmarks, up to 19 s a move, no rewards)
const LV_MAX = 23, LV_HUMAN = 20;
const engLv = n => n, lvOld = n => n;
const TENJO_W = {"ja": "天上", "en": "Celestial", "zh": "天上", "zh-TW": "天上", "ko": "천상", "es": "Celestial", "fr": "Céleste", "pt": "Celestial", "de": "Himmlisch", "hi": "दिव्य", "ar": "سماوي", "ru": "Небесный", "id": "Surgawi", "tr": "Semavi"};
const tenjoName = (n, l) => (TENJO_W[l] || TENJO_W.en) + (/^(ja|zh|zh-TW)$/.test(l) ? 'ⅠⅡⅢⅣⅤⅥⅦⅧ'[n - LV_HUMAN - 1] : ' ' + ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][n - LV_HUMAN - 1]);
const LV = i => i > LV_HUMAN ? tenjoName(i, LANG) : 'Lv.' + i;
const LVD = i => i > LV_HUMAN ? t('lvd.top') : t('lvd')[i <= 4 ? 0 : i <= 9 ? 1 : i <= 15 ? 2 : 3];
function applyI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG;
  document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(e => { e.innerHTML = t(e.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); });
  { const b = document.getElementById('btnResign'); if (b && window.Resign) { b.innerHTML = Resign.icon + '<span></span>'; b.lastChild.textContent = Resign.label(LANG); b.title = Resign.label(LANG); } }
  const sel = document.getElementById('langSel'); if (sel) sel.value = LANG;
  document.title = t('meta.title');
  renderBrand();
}
function renderBrand() { const tt = t('title'); $('#brandTitle').textContent = tt; $('#brandSub').textContent = t('sub'); const h1 = $('#brandTitle').closest('h1'); if (h1) h1.style.setProperty('--tl', Math.max(14, tt.length)); }   // (the portal skin moves the title into its top bar)
let humanColor = P1;
let reviewing = false;
let ken = null, kenSw = false, rvbHov = null, BOX = null;   // PC review box: exploring (検討) state, swap flag, hovered candidate, the box
let manualEnd = null;    // resignation / agreed draw in a game vs the AI or between two players: { over, winner, draw, why, n }
let aiVals = [];         // the AI's own search values (its view), newest last: for its draw offers and resignations
let evals = [];          // evals[i] = evaluation after i moves (P1 = Black's view)
let busyToken = 0;
let lesson = null, puzzle = null;
let rtHold = false;      // a rated game restored on page load: its clock waits for the first move
let rgame = null;        // rated game vs the AI: { id, lv, or, my, tag, ct: [ms, ms], t, over, done }
let gameOverShown = false;

function validMoves(list) {
  try { const pos = E.Pos.from(startSpec); for (const m of list) { if (typeof m !== 'number' || !pos.moves().includes(m)) return false; pos.play(m); } return true; } catch (e) { return false; }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!d) return false;
    Object.assign(settings, d.settings || {});
    if (settings.mode === 'online') settings.mode = 'pvp';
    if (!(settings.level >= 1 && settings.level <= LV_MAX)) settings.level = 6;
    if (!E.RULES[settings.rule] && !/^r[01]{3}$/.test(settings.rule)) settings.rule = 'std';
    if (!(settings.level2 >= 1 && settings.level2 <= LV_MAX)) settings.level2 = 6;
    setVariant(d.rule || settings.rule);
    if (Array.isArray(d.moves)) {
      startSpec = null;
      if (!validMoves(d.moves)) return false;
      moves = d.moves; humanColor = d.humanColor || 1; manualEnd = d.end && d.end.n === d.moves.length ? d.end : null; evals = Array.isArray(d.evals) ? d.evals : [];
      rgame = d.rated && d.rated.id ? d.rated : null; if (rgame && !rgame.over) { rgame.t = Date.now(); rtHold = true; }
      cur = moves.length; gameOverShown = statusAt(cur).over;
      return true;
    }
  } catch (e) {}
  return false;
}
function save() {
  if (settings.mode === 'online') { try { const d = JSON.parse(localStorage.getItem(STORE) || '{}'); d.settings = Object.assign({}, settings, { mode: 'pvp' }); localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {} return; }
  if (lesson || puzzle) { try { const d = JSON.parse(localStorage.getItem(STORE) || '{}'); d.settings = settings; localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {} return; }
  try { localStorage.setItem(STORE, JSON.stringify({ settings, rule: gv, moves, humanColor, evals: evals.slice(0, moves.length + 1), rated: rgame, end: manualEnd })); } catch (e) {}
}

// ====================================================================== engine workers
let jobId = 0;
const ENGINE_URL = 'engine.js?v=1';
function makeWorker() {
  const w = new Worker(ENGINE_URL);
  w.jobs = new Map();
  w.onmessage = e => {
    const m = e.data, j = w.jobs.get(m.id); if (!j) return;
    if (m.type === 'progress') { j.onProgress && j.onProgress(m); return; }
    w.jobs.delete(m.id); j.resolve(m);
  };
  return w;
}
let lastNps = 0;
const npsText = () => '';
let aiW = makeWorker(), anaW = makeWorker();
// (one worker each: the search is the WebAssembly core of engine.js; no thread pool for this game yet)
const MTP = null, MCP = null;
const mtLevel = () => false;
function request(which, msg, onProgress) { return requestW(which, msg, onProgress); }
function requestW(which, msg, onProgress) {
  const w = which === 'ai' ? aiW : anaW;
  return new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve, onProgress }); w.postMessage({ start: startSpec, rule: gv, ...msg, id }); });
}
function cancelWorker(which) {
  const w = which === 'ai' ? aiW : anaW;
  if (!w.jobs.size) return;
  w.terminate();
  w.jobs.forEach(j => j.resolve(null));
  if (which === 'ai') aiW = makeWorker(); else anaW = makeWorker();
}
const anaCache = new Map();

// ====================================================================== sound
let actx = null;
function ctx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === 'suspended') actx.resume(); return actx; }
function noise(a, t0, dur, vol, freq, q, type) {
  const len = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const n = a.createBufferSource(); n.buffer = buf; const f = a.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
  const g = a.createGain(); g.gain.value = vol; n.connect(f).connect(g).connect(a.destination); n.start(t0);
}
function tone(a, t0, f0, f1, dur, vol, type) {
  const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine';
  o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur * 0.7);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
// a mark: a token set down (a wooden clack) or a mark drawn (chalk / pen / brush: a short scratch); delay in ms
function sPlace(soft, delay) {
  if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000, v = soft ? 0.12 : 0.34;
  if (settings.pcs === 'token') { tone(a, t0, 320, 130, 0.12, v); noise(a, t0, 0.03, v * 1.1, 2400, 1.3); return; }
  const f = settings.pcs === 'chalk' ? 3200 : settings.pcs === 'brush' ? 1400 : 5200;
  noise(a, t0, 0.07, v * 0.9, f, 0.9); noise(a, t0 + 0.08, 0.06, v * 0.7, f * 1.1, 0.9);
}
// a small board won: a soft rising chord
function sCrown(delay) { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000; [659.25, 880, 1318.5].forEach((f, i) => tone(a, t0 + i * 0.07, f, 0, 0.5, 0.1, 'triangle')); }
function playChime(win) {
  if (!settings.sound) return;
  const a = ctx(); if (!a) return;
  const t0 = a.currentTime + 0.05, notes = win ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [392, 349.23, 311.13, 261.63];
  notes.forEach((fr, i) => tone(a, t0 + i * (win ? 0.1 : 0.16), fr, 0, 0.7, 0.16, win ? 'triangle' : 'sine'));
}
function playTick() { if (!settings.sound) return; const a = ctx(); if (!a) return; tone(a, a.currentTime, 880, 0, 0.08, 0.05, 'triangle'); }
const sMill = () => sCrown();   // the rules tutorial's "ok" sound

// ====================================================================== DOM / board
const $ = s => document.querySelector(s);
const boardEl = $('#board'), piecesEl = $('#pieces'), fxEl = $('#fx'), linesEl = $('#lines'), zonesEl = $('#sqlayer');
const reduceMotion = false /* site rule: animations are never skipped for the OS reduce-motion setting */;
const animOn = () => settings.anim && !reduceMotion;
// geometry of the rendered boards (tools/gen_art.py): margin M, gap G between small boards, small board S (fractions of the board)
const GEO = (() => { const M = 0.05, G = 0.035, S = (1 - 2 * M - 2 * G) / 3; return { M, G, S }; })();
const boardX = b => GEO.M + (b % 3) * (GEO.S + GEO.G), boardY = b => GEO.M + ((b / 3) | 0) * (GEO.S + GEO.G);
const cellX = m => boardX(mB(m)) + ((mC(m) % 3) + 0.5) * GEO.S / 3, cellY = m => boardY(mB(m)) + (((mC(m) / 3) | 0) + 0.5) * GEO.S / 3;
const ptX = m => cellX(m) * 100, ptY = m => cellY(m) * 100;
function placeAt(el, m) { el.style.left = ptX(m) + '%'; el.style.top = ptY(m) + '%'; }
function placeZone(el, b) { el.style.left = boardX(b) * 100 + '%'; el.style.top = boardY(b) * 100 + '%'; el.style.width = el.style.height = GEO.S * 100 + '%'; }
// the hand-made variant of a cell's mark (the same cell always shows the same one)
const mkVar = m => (m * 7 + 3) % 6, bgVar = b => (b * 5 + 1) % 3;
// coordinates a–i along the bottom margin, 1–9 up the left one (option 座標)
function drawLines() {
  let s = '';
  for (let k = 0; k < 9; k++) {
    const x = (cellX(E.mAt(8, k)) * 100).toFixed(2), y = (cellY(E.mAt(k, 0)) * 100).toFixed(2);
    s += `<text class="num" x="${x}" y="${(100 - GEO.M * 100 * 0.28).toFixed(2)}" text-anchor="middle">${'abcdefghi'[k]}</text>`;
    s += `<text class="num" x="${(GEO.M * 100 * 0.42).toFixed(2)}" y="${(+y + 1.1).toFixed(2)}" text-anchor="middle">${9 - k}</text>`;
  }
  linesEl.setAttribute('viewBox', '0 0 100 100');
  linesEl.innerHTML = s;
  boardEl.classList.toggle('no-num', !settings.num);
  if (!zonesEl.children.length) for (let b = 0; b < 9; b++) { const z = document.createElement('div'); z.className = 'zone'; z.dataset.b = b; placeZone(z, b); zonesEl.appendChild(z); }
}
function setFlip() {}
const flipFor = () => false;
function flipAuto() { return false; }
const pcEls = new Map();      // cell -> mark element
const bigEls = new Map();     // small board -> its big mark
let shownKey = '';
function newMark(p, m, big) {
  const el = document.createElement('div');
  el.className = (big ? 'bigmk ' : 'mk ') + (p === P1 ? 'x' : 'o') + ' v' + (big ? bgVar(m) : mkVar(m));
  el.dataset.k = p; return el;
}
function syncPieces(pos, force, fresh) {
  for (const [i, el] of pcEls) if (force || pos.at(i) !== +el.dataset.k) { el.remove(); pcEls.delete(i); }
  for (let i = 0; i < 81; i++) { const k = pos.at(i); if (k && !pcEls.has(i)) { const el = newMark(k, i); placeAt(el, i); if (fresh === i && animOn()) el.classList.add('fresh'); piecesEl.appendChild(el); pcEls.set(i, el); } }
  for (const [b, el] of bigEls) if (force || (pos.own[b] !== +el.dataset.k)) { el.remove(); bigEls.delete(b); }
  for (let b = 0; b < 9; b++) { const o = pos.own[b]; if ((o === 1 || o === 2) && !bigEls.has(b)) { const el = newMark(o, b, true); placeZone(el, b); if (fresh != null && mB(fresh) === b && animOn()) el.classList.add('fresh'); piecesEl.appendChild(el); bigEls.set(b, el); } }
  for (const [i, el] of pcEls) el.classList.toggle('under', !!pos.own[mB(i)] && pos.own[mB(i)] !== 3 || (pos.own[mB(i)] === 3));
}
const MARK_MS = 300;
function moveDur(m) { return !animOn() || isPass(m) ? 60 : MARK_MS + 60; }
// a new mark: drawn in (a wipe for chalk / pen / brush, a little drop for a token); a small board won: its big mark after it
function animateMove(m, before, pos) {
  syncPieces(pos, false, m);
  const won = !before.own[mB(m)] && (pos.own[mB(m)] === 1 || pos.own[mB(m)] === 2);
  sPlace(false, 20);
  if (won) sCrown(MARK_MS);
  return true;
}
// above / below the board: the small boards each side has won (three in a row of them wins the game)
function renderReserves(pos) {
  const st = statusAt(cur);
  for (const p of [P1, P2]) {
    const el = $(p === P1 ? '#res1' : '#res2');
    const won = pos.count(p), tm = !st.over && pos.turn === p;
    let s = `<span class="rsv-l"><i class="pdisc p${p}"></i>${t('rsv.won', { n: `<b>${won}</b>` })}</span>`;
    el.innerHTML = `<span class="rsv-plate">${s}</span>`;
    el.title = t('rsv.title', { c: pname(p), n: won });
    el.classList.toggle('turn', tm);
  }
}
// the small boards: the ones the side to move may play in glow (common rule「光っている」は露骨に), decided ones are shaded
function renderZones(pos, st) {
  const allow = new Set(st.over ? [] : pos.boards());
  const show = !st.over && (canHumanPlay() || (lesson && !lesson.answered) || (puzzle && puzzle.state === 'play') || settings.mode === 'watch' || reviewing || thinking);
  for (const z of zonesEl.children) {
    const b = +z.dataset.b, o = pos.own[b];
    z.classList.toggle('allow', show && allow.has(b));
    z.classList.toggle('free', show && allow.has(b) && pos.forced < 0);
    z.classList.toggle('won-x', o === 1); z.classList.toggle('won-o', o === 2); z.classList.toggle('drawn', o === 3);
    z.classList.toggle('me-x', pos.turn === P1); z.classList.toggle('me-o', pos.turn === P2);
  }
}
function renderBoard(anim) {
  if (ken && !kenSw) { if (kenOk()) return kenSwap(() => renderBoard(anim)); ken = null; }
  const { pos } = posAt(cur), key = keyOf(cur);
  const prev = shownKey; shownKey = key;
  const m = cur > 0 ? moves[cur - 1] : -1;
  let done = false;
  if (anim && m >= 0 && prev === keyOf(cur - 1)) { done = animateMove(m, posAt(cur - 1).pos, pos); }
  if (!done) syncPieces(pos);
  boardEl.classList.toggle('hide-last', !settings.last);
  boardEl.classList.toggle('no-num', !settings.num);
  renderReserves(pos);
  renderFx();
  boardEl.classList.toggle('can', canHumanPlay());
}

// ---------------------------------------------------------------- fx: last move, where it sends, hints, marks
let hintList = null;
let lessonMarks = [];          // {at, cls} rings on cells / {zone: b, cls} a small board / {arrow: [m], cls} where a move sends
let labelList = null;          // explicit labels: [{at, big, small, cls}]
const NS = 'http://www.w3.org/2000/svg';
function fxDiv(cls, i) { const d = document.createElement('div'); d.className = cls; placeAt(d, i); fxEl.appendChild(d); return d; }
function fxZone(cls, b) { const d = document.createElement('div'); d.className = cls; placeZone(d, b); fxEl.appendChild(d); return d; }
function fxSvg() { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'fxsvg'); s.setAttribute('viewBox', '0 0 100 100'); s.setAttribute('preserveAspectRatio', 'none'); fxEl.appendChild(s); return s; }
// the arrow of a move to the small board it sends the opponent to (a gentle curve from the cell to that board's edge)
function svgArrow(svg, path, cls) {
  const m = Array.isArray(path) ? path[0] : path; if (m == null || m < 0) return;
  const tb = mC(m), x1 = cellX(m) * 100, y1 = cellY(m) * 100, cx = (boardX(tb) + GEO.S / 2) * 100, cy = (boardY(tb) + GEO.S / 2) * 100;
  const p = document.createElementNS(NS, 'path');
  if (mB(m) === tb) {   // sent back into the same board: a small loop
    p.setAttribute('d', `M${x1},${y1 - 2}c-7,-7 7,-7 0,0`);
  } else {
    let dx = cx - x1, dy = cy - y1; const L = Math.hypot(dx, dy) || 1; const stop = Math.min(L * 0.55, GEO.S * 100 * 0.32);
    const ex = cx - dx / L * stop, ey = cy - dy / L * stop, sx = x1 + dx / L * 2.4, sy = y1 + dy / L * 2.4;
    const mx = (sx + ex) / 2 - dy / L * L * 0.12, my = (sy + ey) / 2 + dx / L * L * 0.12;
    const ux = ex - mx, uy = ey - my, ul = Math.hypot(ux, uy) || 1, h = 2.2, ax = ux / ul, ay = uy / ul;
    p.setAttribute('d', `M${sx.toFixed(2)},${sy.toFixed(2)}Q${mx.toFixed(2)},${my.toFixed(2)} ${ex.toFixed(2)},${ey.toFixed(2)}M${(ex - ax * h - ay * h * 0.8).toFixed(2)},${(ey - ay * h + ax * h * 0.8).toFixed(2)}L${ex.toFixed(2)},${ey.toFixed(2)}L${(ex - ax * h + ay * h * 0.8).toFixed(2)},${(ey - ay * h - ax * h * 0.8).toFixed(2)}`);
  }
  p.setAttribute('class', 'arrow ' + (cls || '')); p.setAttribute('stroke-width', 0.9); p.setAttribute('stroke-linejoin', 'round'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('vector-effect', 'none');
  svg.appendChild(p);
}
// the stroke through the three small boards that won the game (a rendered stroke of the mark set, laid along the line)
function drawWinLine(pos) {
  const L = E.bigLine(pos); if (!L) return;
  const c = b => [(boardX(b) + GEO.S / 2) * 100, (boardY(b) + GEO.S / 2) * 100];
  const [x0, y0] = c(L[0]), [x1, y1] = c(L[2]), len = Math.hypot(x1 - x0, y1 - y0) + GEO.S * 100 * 0.9;
  const d = document.createElement('div'); d.className = 'winline ' + (pos.res === P1 ? 'x' : 'o');
  d.style.left = (x0 + x1) / 2 + '%'; d.style.top = (y0 + y1) / 2 + '%'; d.style.width = len + '%';
  d.style.transform = `translate(-50%,-50%) rotate(${Math.atan2(y1 - y0, x1 - x0)}rad)`;
  fxEl.appendChild(d);
}
function renderFx() {
  if (ken && !kenSw) { if (kenOk()) return kenSwap(renderFx); ken = null; }
  fxEl.innerHTML = '';
  const { pos } = posAt(cur), st = statusAt(cur), m = cur > 0 ? moves[cur - 1] : -1;
  const svg = fxSvg(); $('#millfx').innerHTML = '';
  renderZones(pos, st);
  if (m >= 0 && !isPass(m)) {
    fxDiv('sqfx last', m);
    if (settings.send && settings.last && !st.over && !(lesson && !lesson.study) && !puzzle) svgArrow(svg, m, 'send');
  }
  if (st.over && st.winner) drawWinLine(pos);
  for (const k of lessonMarks) { if (k.arrow) svgArrow(svg, k.arrow, k.cls); else if (k.zone != null) fxZone('zmark ' + k.cls, k.zone); else fxDiv('mark ' + k.cls, k.at); }
  if (labelList) drawLabels(labelList);
  else if (!(rvbHov && BOX && BOX.shown) && !drawReviewFx(svg) && hintList && !st.over) drawHints(hintList, svg);
  rvbFx(svg, pos);
  if (window.UtttCoach && !labelList && !lessonMarks.length) UtttCoach.fx(svg, pos);
  renderPrompt();
}
// under the board: where the side to move may play
function renderPrompt() {
  const el = $('#prompt'); let s = '';
  if (canHumanPlay() && !puzzle && !(lesson && !lesson.study)) {
    const { pos } = posAt(cur);
    s = pos.forced < 0 ? t(cur === 0 && !startSpec ? 'send.first' : 'send.free') : t('send.to', { b: t('bname')[pos.forced] });
  }
  el.textContent = s; el.classList.toggle('show', !!s);
}
// value label for an engine value (mover's view)
function valLabel(v) {
  if (v > WINT) return { cls: 'win', big: t('h.win'), small: v < WINT + 1000 ? t('h.in', { n: (WIN - v + 1) >> 1 }) : '' };
  if (v < -WINT) return { cls: 'loss', big: t('h.loss'), small: -v < WINT + 1000 ? t('h.in', { n: (WIN + v) >> 1 }) : '' };
  if (v > WINT - 1000) return { cls: 'win', big: t('h.win'), small: '' };   // endgame database win (distance unknown)
  if (v < -(WINT - 1000)) return { cls: 'loss', big: t('h.loss'), small: '' };
  const x = v / 100; return { cls: 'heur' + (x < -0.05 ? ' neg' : ''), big: (x > 0.05 ? '+' : '') + (Math.abs(x) < 0.05 ? '0' : x.toFixed(1)), small: '' };
}
// labels on the cells (each legal move's value); the best move's arrow shows where it sends the opponent
function hintGroups(list) { const g = new Map(); for (const e of list) g.set(e.m, e); return g; }
function drawHints(list, svg) {
  const g = hintGroups(list); if (!g.size) return;
  let best = -Infinity; for (const e of g.values()) best = Math.max(best, e.v);
  for (const [at, e] of g) {
    const L = valLabel(e.v), d = fxDiv('hintlbl ' + L.cls + (e.v === best ? ' best' : ''), at);
    d.innerHTML = `<b>${L.big}</b>${L.small ? `<small>${L.small}</small>` : ''}`;
  }
  let bm = null; for (const e of list) if (!bm || e.v > bm.v) bm = e; if (bm) svgArrow(svg, bm.m, 'ok');
}
function drawLabels(list) { for (const L of list) { const d = fxDiv('hintlbl ' + L.cls, L.at); d.innerHTML = `<b>${L.big}</b>${L.small ? `<small>${L.small}</small>` : ''}`; } }

// evaluation (Black's view): {s in [-1,1], kind, side, n}
function sOfV(v) { return v > WINT ? 0.9 + 0.1 * Math.min(1, 6 / (WIN - v + 1)) : v < -WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (WIN + v + 1))) : v > WINT - 1000 ? 0.88 : v < -(WINT - 1000) ? -0.88 : Math.tanh(v / 800) * 0.82; }
function evalFromList(list, mover) {
  if (!list || !list.length) return null;
  let best = -Infinity; for (const e of list) best = Math.max(best, e.v);
  const sign = mover === P1 ? 1 : -1;
  if (best > WINT) return { s: sOfV(best) * sign, kind: 'win', side: mover, n: (WIN - best + 1) >> 1 };
  if (best < -WINT) return { s: sOfV(best) * sign, kind: 'win', side: 3 - mover, n: (WIN + best) >> 1 };
  if (best > WINT - 1000) return { s: sOfV(best) * sign, kind: 'win', side: mover, n: 0 };
  if (best < -(WINT - 1000)) return { s: sOfV(best) * sign, kind: 'win', side: 3 - mover, n: 0 };
  return { s: sOfV(best) * sign, kind: 'heur' };
}
function evalText(ev) {
  if (!ev) return '—';
  if (ev.kind === 'final') return ev.side ? t('ev.won', { c: pname(ev.side) }) : t('res.draw');
  if (ev.kind === 'win') return ev.n ? t('ev.winIn', { c: pname(ev.side), n: ev.n }) : t('ev.winning', { c: pname(ev.side) });
  const a = Math.abs(ev.s), c = pname(ev.s > 0 ? P1 : P2);
  return a < 0.08 ? t('ev.even') : t(a < 0.25 ? 'ev.slight' : a < 0.5 ? 'ev.adv' : 'ev.sup', { c });
}

// ====================================================================== players / panel
function isAIColor(p) { return settings.mode === 'watch' || (settings.mode === 'ai' && p !== humanColor); }
function levelFor(p) { if (rgame && settings.mode === 'ai') return rgame.lv; return settings.mode === 'watch' ? (p === P1 ? settings.level : settings.level2) : settings.level; }
function gameOver(i) { return statusAt(i).over; }
function canHumanPlay() {
  if (ken && kenOk()) return kenSwap(() => !gameOver(cur) && !animating);
  if (gameOver(cur)) return false;
  if (animating) return false;
  if (puzzle) return puzzle.state === 'play' && !puzzle.busy && toMoveAt(cur) === puzzle.me;
  if (lesson && window.SeqPrac && SeqPrac.active()) return SeqPrac.state().waiting;   // the 3-move opening practice
  if (lesson) return !lesson.answered && !lesson.study;
  if (reviewing) return false;
  if (settings.mode === 'online') return !!(window.olCanMove && olCanMove());
  return !isAIColor(toMoveAt(cur)) && !thinking;
}
function playerName(p) {
  if (puzzle) return p === puzzle.me ? t('you') : t('defender');
  if (lesson) return '';
  if (settings.mode === 'online' && window.olPlayerName) return olPlayerName(p);
  if (settings.mode === 'pvp') return '';
  if (settings.mode === 'watch') return `${AIW()} ${LV(levelFor(p))}${proTag(levelFor(p), p)}`;
  if (rgame) return p === humanColor ? t('you') + ' · R' + rgame.my : `${AIW()} ${rtLvName(rgame.lv)} · R${rgame.or}`;
  return p === humanColor ? t('you') : `${AIW()} ${LV(settings.level)}${proTag(settings.level)}`;
}
let thinking = 0, animating = false;
function renderInfo() {
  const { pos } = posAt(cur), st = statusAt(cur), tm = pos.turn;
  for (const p of [P1, P2]) {
    $('#count' + p).textContent = pos.count(p);
    $('#hand' + p).textContent = t('pcs');
    const n = playerName(p); $('#name' + p).textContent = n ? n + ' · ' + pname(p) : pname(p);
    const el = $('#pl' + p);
    el.classList.toggle('active', !st.over && tm === p);
    el.classList.toggle('won', st.winner === p);
    el.classList.toggle('thinking', thinking === p);
    $('#status' + p).textContent = st.winner === p ? t('st.win') : thinking === p ? t('thinking') : '';
  }
  $('#evalCard').classList.toggle('hidden', (!settings.eval && !rtLive()) || !!(window.olLive && olLive()));
  document.body.classList.toggle('rated-live', rtLive());
  for (const p of [P1, P2]) { const c = $('#clk' + p); if (rgame && settings.mode === 'ai' && !lesson && !puzzle) { const ms = rtClockLeft(p - 1); c.textContent = fmtClock(ms); c.classList.toggle('low', ms < 30000 && rtLive()); } else if (settings.mode !== 'online') c.textContent = ''; }
  let ev = st.over ? { s: st.winner === P1 ? 1 : st.winner === P2 ? -1 : 0, kind: 'final', side: st.winner } : evals[cur];
  if (!ev && cur > 0 && evals[cur - 1]) ev = evals[cur - 1];
  $('#evalText').textContent = evalText(ev);
  $('#evalFill').style.width = (50 + 50 * (ev ? ev.s : 0)) + '%';
  renderGraph(); renderKifu();
  $('#btnUndo').disabled = settings.mode === 'watch' || !canUndo();
  wpRender();
  $('#btnResign').disabled = !canResign();
  $('#btnHint').disabled = rtLive() || settings.mode === 'online';
  $('#btnHint').classList.toggle('on', settings.hint);
  $('#btnSound').classList.toggle('on', settings.sound);
  $('#reviewBar').classList.toggle('show', reviewing && !lesson && !puzzle);
  renderReview();
  { const il = $('#infoLine'); il.dataset.base = `${t('info.moves', { n: moves.length })}  ·  ${settings.mode === 'ai' ? AIW() + ' ' + LV(levelFor(0)) + (rgame ? ' · ' + t('ng.rated') : '') : settings.mode === 'watch' ? `${LV(settings.level)} vs ${LV(settings.level2)}` : t('ng.pvp')}  ·  ← → ${t('info.browse')}`; il.textContent = il.dataset.base + npsText(); }
  renderBrand();
  if (window.olAfterInfo) olAfterInfo();
  hbInfo(pos, st);
  if (window.UtttCoach) UtttCoach.render();
}
// PC header bar: whose turn, pieces of each side, evaluation (when shown), move number
const escHb = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function hbInfo(pos, st) {
  if (!HB || !HB.on) return;
  const tm = pos.turn;
  let h = `<span class="hb-chip"><i class="pdisc p${st.over ? (st.winner || tm) : tm}"></i><b>${escHb(st.over ? (st.winner ? t('hb.won', { c: pname(st.winner) }) : t('res.draw')) : t('hb.turn', { c: pname(tm) }))}</b></span>`;
  for (const p of [P1, P2]) h += `<span class="hb-chip cnt"><i class="pdisc p${p}"></i><b>${pos.count(p)}</b><small>${escHb(t('pcs'))}</small></span>`;
  if (!st.over) h += `<span class="hb-chip opt">${escHb(pos.forced < 0 ? t('hb.free') : t('hb.to', { b: t('bname')[pos.forced] }))}</span>`;
  if (gv !== 'std') h += `<span class="hb-chip opt">${escHb(t('hb.var'))}</span>`;
  const evOn = settings.eval && !lesson && !puzzle && !rtLive() && !(window.olLive && olLive());
  if (evOn && $('#evalText').textContent && $('#evalText').textContent !== '—') h += `<span class="hb-chip opt">${escHb(t('eval'))} <b>${escHb($('#evalText').textContent)}</b></span>`;
  if (puzzle) h += `<span class="hb-chip">${escHb(PZBook.t('movesLeft', { n: Math.max(0, puzzle.n - puzzle.used) }))}</span>`;
  else h += `<span class="hb-chip opt">${escHb(t('info.moves', { n: cur }))}</span>`;
  HB.setInfo(h);
}
function evalAt(i) {
  const st = statusAt(i);
  if (st.over) return st.winner === P1 ? 1 : st.winner === P2 ? -1 : 0;
  return evals[i] ? evals[i].s : null;
}
function renderGraph() {
  const svg = $('#graph'), W = 300, H = 74, n = Math.max(moves.length + 1, 30);
  const pts = []; let last = 0;
  for (let i = 0; i <= moves.length; i++) { let v = evalAt(i); if (v == null) v = last; last = v; pts.push([i / (n - 1) * W, H / 2 - v * (H / 2 - 4)]); }
  let path = '', area = '';
  if (pts.length) { path = 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L'); area = path + `L${pts[pts.length - 1][0].toFixed(1)},${H / 2}L0,${H / 2}Z`; }
  const cx = cur / (n - 1) * W;
  svg.innerHTML = `<defs><clipPath id="ctop"><rect x="0" y="0" width="${W}" height="${H / 2}"/></clipPath><clipPath id="cbot"><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}"/></clipPath></defs>
    <path d="${area}" fill="rgba(120,100,92,.55)" clip-path="url(#ctop)"/>
    <path d="${area}" fill="rgba(236,226,200,.42)" clip-path="url(#cbot)"/>
    <line class="zero" vector-effect="non-scaling-stroke" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/>
    <path d="${path}" fill="none" stroke="rgba(240,230,200,.85)" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
    <line class="cur" x1="${cx}" x2="${cx}" y1="0" y2="${H}" vector-effect="non-scaling-stroke"/>`;
}
function renderKifu() {
  const k = $('#kifu');
  if (!moves.length) { k.innerHTML = `<div class="empty">${t('kifu.empty')}</div>`; return; }
  const s0 = startSpec ? startSpec.side : P1;
  let html = '';
  for (let i = 1; i <= moves.length; i++) {
    const p = (i - 1) % 2 === 0 ? s0 : 3 - s0;
    const j = rvOpen && rv && !rv.running ? rvJudge(i - 1) : null, qc = j && j.q ? (j.q === 'bad' ? ' q-bad' : ' q-dub') : '';
    html += `<button data-i="${i}" class="${i === cur ? 'cur' : ''}${qc}" title="${i}${j && j.q ? ' ' + t('q.' + j.q) : ''}"><em>${i}</em><i class="p${p}"></i>${mvAt(i - 1, true)}</button>`;
  }
  k.innerHTML = html;
  const c = k.querySelector('.cur'); if (c) { const top = c.offsetTop - k.offsetTop; if (top < k.scrollTop || top > k.scrollTop + k.clientHeight - 24) k.scrollTop = top - k.clientHeight / 2; }
}
$('#kifu').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
(() => {
  const g = $('#graph'); let dragging = false;
  const idxAt = x => { const r = g.getBoundingClientRect(), n = Math.max(moves.length + 1, 30); return Math.max(0, Math.min(moves.length, Math.round((x - r.left) / r.width * (n - 1)))); };
  const go = x => { const i = idxAt(x); if (i !== cur) viewAt(i); };
  g.addEventListener('pointerdown', e => { if (lesson || puzzle) return; dragging = true; try { g.setPointerCapture(e.pointerId); } catch (_) {} go(e.clientX); e.preventDefault(); });
  g.addEventListener('pointermove', e => { if (dragging) go(e.clientX); });
  const end = e => { dragging = false; try { g.releasePointerCapture(e.pointerId); } catch (_) {} };
  g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
})();
let toastTimer = 0;
function toast(msg, ms = 1500, big) { const el = $('#toast'); el.textContent = msg; el.classList.toggle('big', !!big); el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms); }
function update(anim) { if (!anim) sel = null; renderBoard(anim); renderInfo(); stSync(); document.body.classList.toggle("ai-live", aiGameLive()); }

// ====================================================================== input (tap a cell of a glowing small board)
// the cell under a point, or -1 (outside the small boards: the margins and the gaps between them)
function squareAt(clientX, clientY) {
  const r = boardEl.getBoundingClientRect(), x = (clientX - r.left) / r.width, y = (clientY - r.top) / r.height;
  for (let b = 0; b < 9; b++) {
    const bx = boardX(b), by = boardY(b), pad = GEO.G * 0.35;
    if (x >= bx - pad && x < bx + GEO.S + pad && y >= by - pad && y < by + GEO.S + pad) {
      const c = Math.max(0, Math.min(2, Math.floor((x - bx) / (GEO.S / 3)))), rr = Math.max(0, Math.min(2, Math.floor((y - by) / (GEO.S / 3))));
      return b * 9 + rr * 3 + c;
    }
  }
  return -1;
}
let hoverEl = null, hoverTo = -1;
var sel = null;   // (no two-step input in this game; kept for the shared code paths)
function setHover(i) {
  if (ken && !kenSw && kenOk()) return kenSwap(() => setHover(i));
  if (hoverTo === i && hoverEl) return;
  if (hoverEl) { hoverEl.remove(); hoverEl = null; }
  hoverTo = -1;
  if (i < 0 || !canHumanPlay()) return;
  const { pos } = posAt(cur);
  if (!pos.moves().includes(i)) return;
  hoverTo = i;
  hoverEl = newMark(pos.turn, i); hoverEl.classList.add('hov'); placeAt(hoverEl, i); piecesEl.appendChild(hoverEl);
}
boardEl.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') setHover(squareAt(e.clientX, e.clientY)); });
boardEl.addEventListener('pointerleave', () => setHover(-1));
boardEl.addEventListener('click', e => { const i = squareAt(e.clientX, e.clientY); setHover(-1); onSquare(i); });
function cancelSel() {}
function onSquare(i) {
  ctx();
  if (ken && !kenSw && kenOk()) { kenSwap(() => onSquare(i)); kenFlush(); return; }
  if (!canHumanPlay()) { if (reviewing && !lesson && !puzzle) rsOpen(); return; }
  if (i < 0) return;
  const { pos } = posAt(cur), legal = pos.moves();
  if (legal.includes(i)) { commit(i); return; }
  if (pos.at(i)) { toast(t('cant.taken')); return; }
  if (pos.own[mB(i)] && !E.R.fc) { toast(t('cant.closed')); return; }
  toast(t('cant.board', { b: t('bname')[pos.forced] }), 1800);
}
function commit(m) {
  setHover(-1);
  if (ken && kenSw) { ken.before = posAt(cur).pos; ken.line.push(m); ken.dirty = true; return; }
  if (lesson) return lessonAnswer(m);
  if (puzzle) return puzzleMove(m);
  if (settings.mode === 'online' && window.olHumanMove) return olHumanMove(m);
  playMove(m);
}

// ====================================================================== flow
function newGame(rated) {
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false; wpPaused = false;
  rgame = null; rtHold = false; settings.rsNoRec = false;
  if (rated) rgame = Object.assign(rated, { ct: [RT_CLOCK.base, RT_CLOCK.base], t: Date.now() });
  startSpec = null;
  if (settings.mode === 'ai') humanColor = rated ? (Math.random() < 0.5 ? P1 : P2) : settings.color === 0 ? (Math.random() < 0.5 ? P1 : P2) : settings.color;
  moves = []; cur = 0; reviewing = false; evals = []; hintList = null; gameOverShown = false; sel = null; manualEnd = null; aiVals = []; drawAsked = -99;
  hideOverlay('#resultOverlay');
  request('ai', { type: 'newgame' });
  update(false); save();
  afterPosition();
}
function playMove(m) {
  if (rtHold) { rtHold = false; if (rgame) rgame.t = Date.now(); }   // first move after a reload: no time was charged while held
  if (rtLive()) { const side = toMoveAt(moves.length) - 1, now = Date.now(); rgame.ct[side] = Math.max(0, rgame.ct[side] - (now - rgame.t)) + RT_CLOCK.inc; rgame.t = now; }
  const before = posAt(cur).pos;
  moves = moves.slice(0, cur); moves.push(m); cur = moves.length; reviewing = false;
  evals.length = moves.length;
  hintList = null;
  const d = moveDur(m, before);
  animating = animOn(); setTimeout(() => { animating = false; renderInfo(); renderFx(); boardEl.classList.toggle('can', canHumanPlay()); }, d);
  update(true); save();
  const st = statusAt(cur);
  if (st.over) { const ref = moves; setTimeout(() => { if (moves === ref) onGameEnd(st); }, d + 450); }   // only if this game is still on the board
  afterPosition();
}
function afterPosition() {
  const tok = ++busyToken;
  analyzeCurrent(tok);
  maybeAI(tok);
}
async function maybeAI(tok) {
  if (lesson || puzzle || reviewing || wpPaused || gameOver(cur)) return;
  const p = toMoveAt(cur);
  if (!isAIColor(p)) return;
  thinking = p; renderInfo(); boardEl.classList.remove('can');
  const t0 = Date.now(), shown = moves.slice(0, cur);
  const el = engLv(levelFor(p)), res = await request('ai', { type: 'think', moves: shown, level: el, cfg: proCfg(levelFor(p), p) || rtCap(el) });
  if (!res || tok !== busyToken) { if (tok === busyToken) { thinking = 0; renderInfo(); } return; }
  const prevDur = cur > 0 ? moveDur(moves[cur - 1], posAt(cur - 1).pos) : 0;
  const wait = (settings.mode === 'watch' ? Math.max(700, prevDur + 120) : animating ? prevDur : 0) - (Date.now() - t0);   // AIの着手は即時：前の手のアニメが終わるのを待つだけ（観戦だけ間を取る）
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  if (tok !== busyToken) return;
  thinking = 0;
  if (res.move === undefined || res.move < 0) { renderInfo(); return; }
  if (typeof res.v === 'number') {
    aiVals[cur] = res.v;
    // AI同士: the analysis worker is starved while both AIs think in turn, so the playing AI's own value is the 形勢 of the
    // position when the analysis has not given one (2026-11-14, as amazons)
    if (settings.mode === 'watch' && !evals[cur]) { const ev = evalFromList([{ v: res.v }], p); if (ev) { evals[cur] = ev; renderInfo(); } }
  }
  if (settings.mode === 'ai' && aiResigns(p)) return;
  playMove(res.move);
  if (settings.mode === 'ai') aiMaybeOfferDraw(p);
}
// ---------------------------------------------------------------- resignation and draw offers in games vs the AI
const WINT_JS = 29000;
let drawAsked = -99;   // ply of the last draw offer (either side), so offers are not repeated every move

function aiGameLive() { return settings.mode === 'ai' && !lesson && !puzzle && !gameOver(moves.length) && cur === moves.length; }
function endManually(st) {
  busyToken++; cancelWorker('ai'); thinking = 0;
  st.n = moves.length;
  if (rgame) rgame.over = st; else manualEnd = st;
  save(); update(false); onGameEnd(st);
}
// the AI resigns when it is lost for sure (database / forced) or far behind with little left; not the weakest levels
function aiResigns(p) {
  const lv = levelFor(p), v = aiVals[cur]; if (lv < 6 || typeof v !== 'number') return false;
  const prev = aiVals.slice(0, cur).filter(x => typeof x === 'number').slice(-1)[0];
  const lost = v < -WINT_JS + 1000 && prev !== undefined && prev < -WINT_JS + 1000;   // lost for sure, two moves in a row
  if (!lost) return false;
  endManually({ over: true, winner: p === P1 ? P2 : P1, why: 'resign', aiResigned: true });
  return true;
}
// Kōnane has no draws (every move takes a stone, so the game always ends): the AI never offers one
function aiMaybeOfferDraw() {}
// 投了 (common spec, shared/resign.js): "投了しますか？" → はい ends the game as your loss
// (vs the AI / rated: you lose; 2 players on one device: the side to move resigns; online: the existing resign is sent)
function canResign() {
  if (lesson || puzzle) return false;
  if (settings.mode === 'online') return !!(window.olLive && olLive());
  if (settings.mode === 'watch') return false;
  if (rtLive()) return true;
  return moves.length > 0 && !gameOver(moves.length);
}
function resignGame() {
  if (!canResign()) return;
  if (settings.mode === 'online') { if (window.olResignBtn) olResignBtn(); return; }
  cur = moves.length; reviewing = false; animating = false; sel = null; hintList = null;
  const loser = settings.mode === 'ai' ? humanColor : toMoveAt(moves.length);
  endManually({ over: true, winner: loser === P1 ? P2 : P1, why: 'resign' });
}
function playerResign() { $('#btnResign').click(); }
$('#btnResign').onclick = () => { if (canResign()) Resign.confirm({ lang: LANG }).then(ok => { if (ok) resignGame(); }); };
// the player asks for a draw: there are none in Kōnane
function playerDraw() { if (aiGameLive()) toast(t('dr.none'), 2200); }
window.aiGameLive = aiGameLive; window.playerResign = playerResign; window.playerDraw = playerDraw;
async function analyzeCurrent(tok) {
  const idx = cur, key = keyOf(idx);
  if (gameOver(idx) || lesson || puzzle) { hintList = null; return; }
  if (rtLive() || (window.olLive && olLive())) { hintList = null; return; }
  const coachOn = !!(window.UtttCoach && UtttCoach.active());
  if (!settings.eval && !settings.hint && !coachOn) return;
  const mover = toMoveAt(idx);
  const apply = list => {
    if (keyOf(idx) !== key || !list) return;
    if (window.UtttCoach) UtttCoach.cands(key, list);
    const ev = evalFromList(list, mover);
    if (ev) evals[idx] = ev;
    if (cur === idx) { hintList = settings.hint ? list : null; renderFx(); renderInfo(); }
  };
  if (anaCache.has(key)) { apply(anaCache.get(key)); coachDeep(idx, key, apply); return; }
  cancelWorker('ana');
  const res = await request('ana', { type: 'analyze', moves: moves.slice(0, idx), time: settings.hint ? 1500 : 900 }, m => apply(m.list));
  if (!res || res.error) return;
  anaCache.set(key, res.list);
  apply(res.list);
  save();
  coachDeep(idx, key, apply);
}
// coach: a second, deeper pass. The all-moves analysis above is quick but shallow,
// and its first choice was weaker than the AI's own search at the top levels,
// so the coach then runs the AI's own stronger search and puts that move at the top of the candidates.
const COACH_DEEP = 18;   // engine LEVELS: Lv.18, 0.7 s
async function coachDeep(idx, key, apply) {
  const list = anaCache.get(key);
  if (!list || !list.length || list.deep || !(window.UtttCoach && UtttCoach.active() && (settings.mode === 'pvp' || toMoveAt(idx) === humanColor))) return;
  // (2026-11-20 audit) with the board's learned evaluation the deeper pass is search v3 + the net as well (no book) — the level's v2 and
  // hand evaluation would put a weaker move above the analysis's; on the threads of core_mt.wasm when they are on, else one worker
  const cfg = null;
  const r = await request('ana', Object.assign({ type: 'think', moves: moves.slice(0, idx), level: COACH_DEEP }, cfg ? { cfg } : {}));
  if (!r || r.error || r.book || r.move === undefined || r.move === null || r.move < 0 || keyOf(idx) !== key || anaCache.get(key) !== list) return;
  const out = deepTop(list, r.move, e => e.v > WINT); out.deep = true;
  anaCache.set(key, out); apply(out); save();
}
// the deep search's move first, valued as the best; a forced win already in the list stays first
function deepTop(list, m, won) {
  let top = list[0]; for (const e of list) if (e.v > top.v) top = e;
  if (won(top)) return list.slice();
  const i = list.findIndex(e => e.m === m), e = Object.assign({}, i >= 0 ? list[i] : top, { m, v: top.v }, top.kind !== undefined ? { kind: top.kind } : {}, top.n !== undefined ? { n: Math.max(...list.map(x => x.n || 0)) } : {});
  return [e].concat(list.filter((x, k) => k !== i));
}
// the result dialog only when a game ends right now on the board (never for a lesson / puzzle, nor for a finished game that is restored)
function onGameEnd(st) {
  if (lesson || puzzle) return;
  if (moves.length !== cur || gameOverShown) return;
  if (settings.mode === 'online') return;   // online: the result comes from online-ui.js
  gameOverShown = true;
  recordGame(st);
  const youWin = settings.mode === 'ai' && st.winner === humanColor;
  const aiWin = settings.mode === 'ai' && st.winner && st.winner !== humanColor;
  playChime(!aiWin);
  if (youWin || (settings.mode === 'pvp' && st.winner)) confetti();
  $('#resultDisc').innerHTML = st.winner ? `<div class="pdisc p${st.winner}"></div>` : '';
  $('#resultTitle').textContent = st.draw ? t('res.draw') : youWin ? t('res.youWin') : aiWin ? t('res.aiWin') : t('res.pWin', { c: pname(st.winner) });
  let sub = (st.aiResigned ? t('dr.aiResigned') : t('res.why.' + st.why)) + '<br>' + t('res.sub', { n: moves.length });
  if (rgame) {
    const rx = rtSettle(st);
    if (rx) sub += `<br>${rx.pl ? Placement.resHtml(rx.pl) : `<span class="rt-res">R ${rx.old} → <b>${rx.now}</b> (${rtD(rx.d)})</span>`} · ${rtRank(rx.now)}<br><small style="color:var(--muted)">${t('rt.opp', { lv: rtLvName(rgame.lv), r: rgame.or })}</small>`;
  } else if (settings.mode === 'ai') sub += '<br>' + t('res.vs', { name: LV(settings.level) });
  $('#resultSub').innerHTML = sub;
  { const ref = moves; setTimeout(() => { if (moves === ref && !lesson && !puzzle) showOverlay('#resultOverlay'); }, 700); }
}
// 勝敗記録 (shared/record.js): games against the AI (free / rated); online games are recorded in online-ui.js finishOnline()
function recordGame(st) {
  if (!window.GameRecord || settings.mode !== 'ai' || settings.rsNoRec || !st || !st.over || !moves.length) return;
  const h = humanColor, opp = rgame ? `AI ${rtLvName(rgame.lv)} · R${rgame.or}` : `AI ${LV(settings.level)}${proTag(settings.level)}`;
  const why = st.aiResigned ? t('dr.aiResigned') : t('res.why.' + st.why);
  GameRecord.add({ mode: rgame ? 'rated' : 'ai', res: !st.winner ? 'd' : st.winner === h ? 'w' : 'l', side: h - 1, opp, key: rgame ? 'rt:' + rgame.lv : (proCfg(settings.level) ? 'ai:pro' : 'ai:') + settings.level, n: moves.length, why });
}
function canUndo() {
  if (lesson || puzzle || rgame || settings.mode === 'online') return false;
  if (settings.mode === 'pvp') return cur > 0;
  if (settings.mode === 'ai') { for (let i = cur - 1; i >= 0; i--) if (toMoveAt(i) === humanColor) return true; return false; }
  return false;
}
// AI同士 (watch): the 待った button is 停止 / 再開 (shared/watchpause.js); Ctrl+Z toggles it too
var wpPaused = false;
function wpActive() { return settings.mode === 'watch' && !lesson && !puzzle; }
function wpRender() {
  if (settings.mode !== 'watch') wpPaused = false;
  const over = gameOver(moves.length), on = wpActive() && (!over || cur < moves.length), b = $('#btnUndo');   // a finished game can be continued from an earlier position
  if (window.WatchPause) WatchPause.set(b, on ? (wpPaused || over ? 'resume' : 'pause') : null, LANG);
  if (on) b.disabled = false;
}
function wpToggle() {
  const over = gameOver(moves.length);
  if (!wpActive() || (over && cur >= moves.length)) return;
  if (!wpPaused && !over) { wpPaused = true; busyToken++; cancelWorker('ai'); thinking = 0; renderInfo(); return; }
  if (cur < moves.length && window.WatchPause) { if (typeof stopPlay === 'function') stopPlay(); WatchPause.ask({ lang: LANG, n: moves.length - cur, latest: over ? null : wpLatest, here: wpHere }); return; }   // an earlier position is shown: ask where to resume from
  wpLatest();
}
function wpLatest() { wpPaused = false; cur = moves.length; reviewing = false; hintList = null; update(false); afterPosition(); }   // resume from the latest position
function wpHere() {   // resume from the shown position: the later moves, their evals and any result are dropped (the kifu's この局面から再開 path)
  if (!wpActive() || cur >= moves.length) { wpLatest(); return; }
  wpPaused = false; reviewing = true; hideOverlay('#resultOverlay'); resumeHere();
}
function undo() {
  if (wpActive()) { wpToggle(); return; }
  if (!canUndo()) return;
  busyToken++; cancelWorker('ai'); thinking = 0; animating = false;
  let i = cur - 1;
  if (settings.mode === 'ai') { while (i > 0 && toMoveAt(i) !== humanColor) i--; }
  moves = moves.slice(0, i); cur = i; reviewing = false; evals.length = i + 1; hintList = null; gameOverShown = false;
  hideOverlay('#resultOverlay');
  update(false); save(); afterPosition();
}
function viewAt(i) {
  if (lesson || puzzle) return;
  i = Math.max(0, Math.min(moves.length, i));
  if (ken) { kenStop(); if (i === cur) { update(false); afterPosition(); return; } }
  if (i === cur) return;
  busyToken++; cancelWorker('ai'); thinking = 0; animating = false;
  const step = i === cur + 1;
  cur = i; reviewing = i !== moves.length; hintList = null;
  update(step);
  afterPosition();
}
function resumeHere() {
  if (!reviewing) return;
  if (rgame) { viewAt(moves.length); return; }
  moves = moves.slice(0, cur); evals.length = cur + 1; reviewing = false; gameOverShown = false;
  update(false); save(); afterPosition();
}
function showOverlay(s) { $(s).classList.add('show'); }
function hideOverlay(s) { $(s).classList.remove('show'); }
function confetti() {
  if (!animOn()) return;
  const cols = ['#ffcf9e', '#fff6dc', '#ff8a6b', '#2a2622', '#2fb5a8', '#f7d77a'];
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
  settings.hint = !settings.hint; save();
  if (!settings.hint) { hintList = null; renderFx(); renderInfo(); }
  else { const k = keyOf(cur); if (anaCache.has(k)) { hintList = anaCache.get(k); renderFx(); } else analyzeCurrent(busyToken); renderInfo(); }
};
$('#btnSound').onclick = () => { settings.sound = !settings.sound; try { localStorage.setItem('atlas-sfx', settings.sound ? '1' : '0'); } catch (e) {} save(); renderInfo(); if (settings.sound) playTick(); };
$('#btnLesson').onclick = () => openLessons();
$('#btnPuzzle').onclick = () => openPuzzles();
$('#btnRules').onclick = () => openRules();
function selTab(v) { document.querySelectorAll('.ls-tabs').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === v))); }
document.querySelectorAll('.ls-tabs').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const inst = on => ['#lessonOverlay', '#puzzleOverlay', '#rulesOverlay'].forEach(x => $(x).classList.toggle('instant', on));
  inst(true);
  if (b.dataset.v !== 'rules') $('#rulesOverlay').classList.remove('show');
  if (b.dataset.v === 'rules') { $('#lessonOverlay').classList.remove('show'); $('#puzzleOverlay').classList.remove('show'); openRules(); }
  if (b.dataset.v === 'puzzle' && !$('#puzzleOverlay').classList.contains('show')) { $('#lessonOverlay').classList.remove('show'); openPuzzles(); }
  if (b.dataset.v === 'lesson') { $('#puzzleOverlay').classList.remove('show'); openLessons(); }
  if (b.dataset.v === 'open') { $('#puzzleOverlay').classList.remove('show'); openOpenings(); }
  setTimeout(() => inst(false), 150);
}));
$('#btnResume').onclick = () => { if (rgame || settings.mode === 'online' || lesson || puzzle || !reviewing) { resumeHere(); return; } openNewDialog(true); };
$('#btnLatest').onclick = () => viewAt(moves.length);
$('#btnReview').onclick = () => hideOverlay('#resultOverlay');
$('#btnAgain').onclick = () => { hideOverlay('#resultOverlay'); if (rgame) rtStart(); else newGame(); };
function recordText() {
  const pos = E.Pos.from(startSpec), out = [];
  const s0 = pos.turn; moves.forEach((m, i) => { const k = i + (s0 === P2 ? 1 : 0); out.push((k % 2 === 0 ? (k / 2 + 1) + '. ' : i === 0 ? '1... ' : '') + mvIn(pos, m)); pos.play(m); });
  return out.join(' ');
}
$('#btnCopy').onclick = async () => {
  if (!moves.length) { toast(t('nokifu')); return; }
  const txt = recordText();
  try { await navigator.clipboard.writeText(txt); toast(t('copied')); } catch (e) { toast(txt, 3000); }
};
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && ![...document.querySelectorAll('.overlay.show')].some(o => o.id !== 'resultOverlay')) { e.preventDefault(); undo(); return; }
  if (document.querySelector('.overlay.show')) { if (e.key === 'Escape') document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); return; }
  if (e.key === 'Escape') { cancelSel(); return; }
  if (e.key === 'Home') viewAt(0);
  else if (e.key === 'End') viewAt(moves.length);
});

// ---------------------------------------------------------------- 2D boards and mark sets (CSS: html[data-bd] / html[data-pcs]; rendered by tools/gen_art.py)
// Boards: oiled walnut with brass inlay (default) · a school slate drawn in chalk · washi with a sumi brush grid · old paper in
// iron-gall ink · white marble with gold inlay · cherry with ebony inlay. Marks: lacquer-and-ivory tokens (default) · sumi and
// vermilion brush · chalk · pen and ink — every mark a rendered hand-made one (six variants each), never a font or a flat line.
const BD_KEYS = ['walnut', 'slate', 'washi', 'parchment', 'marble', 'cherry'], PC_KEYS = ['token', 'brush', 'chalk', 'ink'];
const BD_PAL = { walnut: '#3a2416', slate: '#1d2523', washi: '#cbbd9f', parchment: '#7a5a36', marble: '#b9b3a6', cherry: '#5a2d1a' };   // the frame colour of the mini boards
// a good mark set for each board (shown first in the mark tiles; any pair can be chosen)
const BD_PCS = { walnut: 'token', slate: 'chalk', washi: 'brush', parchment: 'ink', marble: 'ink', cherry: 'token' };
function designApply() {
  if (!BD_KEYS.includes(settings.bd)) settings.bd = 'walnut';
  if (!PC_KEYS.includes(settings.pcs)) settings.pcs = 'token';
  document.documentElement.dataset.bd = settings.bd; document.documentElement.dataset.pcs = settings.pcs;
}
// the position of the design tiles: a few marks and one won board
const DESIGN_LINE = ['e5', 'e6', 'e8', 'd9', 'c8', 'h6', 'e7', 'f2', 'h5', 'e4'];
function designSpec() { return lineSpec(TOUR_POS.board); }
function designPickers() {
  const r1 = $('#bdRow'), r2 = $('#pcRow'); if (!r1 || !r2) return;
  const sp = designSpec();
  r1.innerHTML = BD_KEYS.map(k => `<button type="button" data-bd="${k}" class="${k === settings.bd ? 'sel' : ''}" aria-pressed="${k === settings.bd}">${miniSVG(sp, { cls: 'bdm', bd: k, noAllow: true })}<span>${escHb(t('bd.' + k))}</span></button>`).join('');
  r2.innerHTML = PC_KEYS.map(k => `<button type="button" data-pcs="${k}" class="${k === settings.pcs ? 'sel' : ''}" aria-pressed="${k === settings.pcs}">${pcSwatch(k)}<span>${escHb(t('pcs.' + k))}</span></button>`).join('');
}
// a mark-set tile: an X and an O of the set on a patch of the current board
function pcSwatch(k) {
  return `<svg class="bdm" viewBox="0 0 120 120"><rect x="1" y="1" width="118" height="118" rx="10" fill="${BD_PAL[settings.bd] || '#333'}"/><image href="img/bd-${settings.bd}.webp" x="-60" y="-60" width="300" height="300" preserveAspectRatio="none" clip-path="inset(66px 66px 66px 66px round 6px)"/>` +
    `<image href="img/mk-${k}-x-1.webp" x="10" y="30" width="56" height="56"/><image href="img/mk-${k}-o-2.webp" x="56" y="34" width="56" height="56"/></svg>`;
}
// spec: { b: 81 chars '.xo', side, n, f, w } ; o: { cls, bd, pcs, marks: {cell: 'ok'|'ng'|'ring'|'hl'}, zones: {board: 'ok'|'ng'|'hl'}, arrows: [cell],
//   last, click (cells clickable), noAllow (no glow on the boards to play in) }
const MINI_W = 240;
function miniSVG(spec, o) {
  o = o || {};
  const pos = E.Pos.from(spec), W = MINI_W, bdk = o.bd || settings.bd, pk = o.pcs || settings.pcs;
  const X = m => cellX(m) * W, Y = m => cellY(m) * W, BX = b => boardX(b) * W, BY = b => boardY(b) * W, SW = GEO.S * W, u = SW / 3;
  let s = `<svg class="${o.cls || 'mini'}" viewBox="0 0 ${W} ${W}"><rect x="0" y="0" width="${W}" height="${W}" rx="7" fill="${BD_PAL[bdk] || '#333'}"/><image href="img/bd-${bdk}.webp" x="0" y="0" width="${W}" height="${W}" preserveAspectRatio="none"/>`;
  if (!o.noAllow && pos.res < 0) for (const b of pos.boards()) s += `<rect x="${(BX(b) - 2).toFixed(1)}" y="${(BY(b) - 2).toFixed(1)}" width="${(SW + 4).toFixed(1)}" height="${(SW + 4).toFixed(1)}" rx="5" fill="rgba(255,226,140,.16)" stroke="#ffd36e" stroke-width="2.4"/>`;
  for (const k in o.zones || {}) { const v = o.zones[k], b = +k; s += `<rect x="${(BX(b) - 2).toFixed(1)}" y="${(BY(b) - 2).toFixed(1)}" width="${(SW + 4).toFixed(1)}" height="${(SW + 4).toFixed(1)}" rx="5" fill="${v === 'ng' ? 'rgba(255,90,72,.14)' : 'rgba(61,245,154,.12)'}" stroke="${v === 'ng' ? '#ff6b5b' : '#3df59a'}" stroke-width="2.6" stroke-dasharray="${v === 'hl' ? '5 3' : ''}"/>`; }
  if (o.last != null && o.last >= 0) s += `<circle cx="${X(o.last).toFixed(1)}" cy="${Y(o.last).toFixed(1)}" r="${(u * 0.47).toFixed(1)}" fill="rgba(255,222,130,.42)"/>`;
  for (let m = 0; m < 81; m++) {
    const p = pos.at(m); if (!p) continue;
    const dim = pos.own[mB(m)] === 1 || pos.own[mB(m)] === 2 || pos.own[mB(m)] === 3, sz = u * 0.86;
    s += `<image href="img/mk-${pk}-${p === P1 ? 'x' : 'o'}-${mkVar(m)}.webp" x="${(X(m) - sz / 2).toFixed(1)}" y="${(Y(m) - sz / 2).toFixed(1)}" width="${sz.toFixed(1)}" height="${sz.toFixed(1)}"${dim ? ' opacity=".38"' : ''}/>`;
  }
  for (let b = 0; b < 9; b++) { const w = pos.own[b]; if (w === 1 || w === 2) s += `<image href="img/bg-${pk}-${w === 1 ? 'x' : 'o'}-${bgVar(b)}.webp" x="${BX(b).toFixed(1)}" y="${BY(b).toFixed(1)}" width="${SW.toFixed(1)}" height="${SW.toFixed(1)}"/>`; }
  for (const k in o.marks || {}) {
    const v = o.marks[k], x = X(+k), y = Y(+k), col = v === 'ng' ? '#ff6b5b' : v === 'ok' ? '#3df59a' : v === 'hl' ? '#ffd36e' : '#e2c275';
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(u * 0.44).toFixed(1)}" fill="none" stroke="${col}" stroke-width="2.6" filter="drop-shadow(0 0 1px rgba(0,0,0,.85))"/>`;
  }
  for (const m of o.arrows || []) {
    const tb = mC(m), x1 = X(m), y1 = Y(m), cx = BX(tb) + SW / 2, cy = BY(tb) + SW / 2;
    if (mB(m) === tb) continue;
    let dx = cx - x1, dy = cy - y1; const L = Math.hypot(dx, dy) || 1, stop = Math.min(L * 0.55, SW * 0.32), ex = cx - dx / L * stop, ey = cy - dy / L * stop, h = 6, ax = dx / L, ay = dy / L;
    s += `<path d="M${(x1 + ax * 6).toFixed(1)},${(y1 + ay * 6).toFixed(1)}L${ex.toFixed(1)},${ey.toFixed(1)}M${(ex - ax * h - ay * h * .8).toFixed(1)},${(ey - ay * h + ax * h * .8).toFixed(1)}L${ex.toFixed(1)},${ey.toFixed(1)}L${(ex - ax * h + ay * h * .8).toFixed(1)},${(ey - ay * h - ax * h * .8).toFixed(1)}" stroke="#ffe9a8" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" filter="drop-shadow(0 1px 1px rgba(0,0,0,.7))"/>`;
  }
  { const L = E.bigLine(pos); if (L) { const c = b => [BX(b) + SW / 2, BY(b) + SW / 2]; const [a0, a1] = [c(L[0]), c(L[2])]; s += `<path d="M${a0[0]},${a0[1]}L${a1[0]},${a1[1]}" stroke="${pos.res === P1 ? '#ff7a55' : '#7fb2ff'}" stroke-width="5" stroke-linecap="round" opacity=".85"/>`; } }
  if (o.click) for (let m = 0; m < 81; m++) s += `<rect data-p="${m}" x="${(X(m) - u / 2).toFixed(1)}" y="${(Y(m) - u / 2).toFixed(1)}" width="${u.toFixed(1)}" height="${u.toFixed(1)}" fill="transparent"/>`;
  return s + '</svg>';
}
// the whole board is always shown in the lists (where a move sends the opponent matters everywhere)
var CROP_UID = 0;
const CROP = {};
function cropOf() { return null; }
// a position from a line of moves in notation (['e5', 'e6', …]) — every lesson / tutorial position is a legal game
function lineSpec(line, rule) { const keep = E.rule; if (rule) E.setRule(rule); const p = E.Pos.from(null); for (const nm of line) { const m = E.parse(p, nm); if (m == null) throw new Error('bad line ' + nm); p.play(m); } const sp = p.spec(); if (rule) E.setRule(keep); return sp; }
const sqIdx = nm => E.mAt(9 - +nm[1], 'abcdefghi'.indexOf(nm[0]));

// ---------------------------------------------------------------- rules: hands-on tutorial on the real board (shared/ruletour.js)
// Only what is needed to play: the board, any first move, the cell sends the opponent, choosing where to send, winning a small
// board, a decided board means a free move, three small boards in a row win; then drawn boards and the variants.
function tourPage(id, spec, o) {
  return {
    id, title: () => t('tr.' + id + '.t'), body: () => t('tr.' + id + '.b').split('\n').map(x => `<p>${x}</p>`).join(''),
    task: () => t('tr.' + id + '.task'),
    setup(api) {
      const pos = E.Pos.from(spec);
      const st = { last: spec && spec.n ? -1 : -1, done: false };
      const marks = () => { const m = {}; for (const q of (o.marks || [])) m[sqIdx(q)] = 'ok'; return m; };
      const zones = () => { const z = {}; for (const b of (o.zones || [])) z[b] = 'hl'; return z; };
      const draw = () => {
        if (!api.alive()) return;
        api.board.innerHTML = miniSVG(pos.spec(), { cls: 'tour', last: st.last >= 0 ? st.last : o.last != null ? sqIdx(o.last) : -1, marks: st.done ? {} : marks(), zones: st.done ? {} : zones(), arrows: st.done && st.last >= 0 && pos.res < 0 ? [st.last] : (o.arrows || []).map(sqIdx), click: !st.done });
      };
      function click(m) {
        const legal = pos.moves();
        if (!legal.includes(m)) { api.say(t(pos.at(m) ? 'cant.taken' : 'cant.board', { b: t('bname')[pos.forced] }), 'ng'); return; }
        const before = pos.clone(); pos.play(m); st.last = m;
        const r = o.check ? o.check(m, pos, before) : 'ok';
        sPlace(); if ((pos.own[mB(m)] === 1 || pos.own[mB(m)] === 2) && !before.own[mB(m)]) sCrown(250);
        if (r === 'ok') { st.done = true; draw(); api.ok(t('tr.' + id + '.ok')); return; }
        if (typeof r === 'string') { st.done = true; draw(); api.ng(r); return; }
        draw();
      }
      api.board.onclick = e => { const el = e.target.closest('[data-p]'); if (!el || st.done || !api.alive()) return; ctx(); click(+el.dataset.p); };
      draw();
    },
  };
}
const tourRead = (id, html) => ({ id, title: () => t('tr.' + id + '.t'), body: () => t('tr.' + id + '.b').split('\n').map(x => `<p>${x}</p>`).join(''), html });
const tourPic = (spec, o) => `<div class="tour-pic">${miniSVG(spec, Object.assign({ cls: '' }, o || {}))}</div>`;
// page 1: what the game is (history / how to win / culture), read only — common spec
const introPage = () => ({ id: 'intro', title: () => t('intro.t'), body: '', html: () => RuleTour.intro({ lang: LANG, img: '../images/atlas/uttt.webp?v=1', origin: t('intro.origin'), players: t('intro.players'), time: t('intro.time'), history: t('intro.hist'), win: t('intro.win'), culture: t('intro.cult') }) });
// the tutorial positions (move lines: every one a legal game; tools/tour_pos.js)
const TOUR_POS = {"pick":["a9","b9","e9","d9"],"small":["h1","e3","f9","g8","a6","c9","g9","a9","c7","g3","a7","a2","b6","d9"],"free":["g6","b8","e5","d6","a9","b9","d8","b5","e6","d9","c8","h6","f7","i2","i4","g3","c9","h8","e4","e2"],"big":["c3","g8","c4","h1","f2","i5","g6","b7","d3","a9","c7","g3","b9","e7","e1","d1","a3","b8","f4","i2","h6","d9","c9","g9","c8","i6","h7","d2","a6","g4","b3","f9","h9","e8","d6","g1","f7","h3","e9","d8"],"draw":["c3","h7","f1","g1","a3","b7","d3","a9","a7","b2","f6","g9","c8","i6","h8","d6","c7","g3","b9","e9","d9","a8","a4","b1","f3","h9","d7","c2","g6","c9","i7","h2","d4","b3","e7","d1","a6","b8","e4","e3","d8","c5","g5","a5","b5"],"board":["c7","h3","f7","g3","a9","a8","c6","i9","g9","a7","a1","a3","b7","d1","c3","h9","d9","b9","e8","e5","d6","c8","i5","g6","c9","i8","h5","e4","d3","b8"],"send":["f6"]};
const TOUR_PAGES = [
  introPage(),
  tourRead('board', () => tourPic(lineSpec(TOUR_POS.board), { noAllow: true })),
  // the first move: anywhere
  tourPage('first', null, { check: () => 'ok' }),
  // the cell you play sends the opponent to the small board in the same place: O must answer in the glowing board
  tourPage('send', lineSpec(TOUR_POS.send), { last: TOUR_POS.send[TOUR_POS.send.length - 1], arrows: TOUR_POS.send.slice(-1), check: () => 'ok' }),
  // choosing where to send: put the mark on the top-right cell of the board, to send the opponent to the top-right board
  tourPage('pick', lineSpec(TOUR_POS.pick), { check: m => mC(m) === 2 ? 'ok' : t('tr.pick.ng') }),
  // three in a row on a small board wins it
  tourPage('small', lineSpec(TOUR_POS.small), { check: (m, pos, before) => pos.own[mB(m)] === P1 && !before.own[mB(m)] ? 'ok' : t('tr.small.ng') }),
  // sent to a decided board: play anywhere
  tourPage('free', lineSpec(TOUR_POS.free), { check: () => 'ok' }),
  // three small boards in a row win the game
  tourPage('big', lineSpec(TOUR_POS.big), { check: (m, pos) => pos.res === P1 ? 'ok' : t('tr.big.ng') }),
  // a full board with no line belongs to nobody; no line on the big board in the end is a draw
  tourRead('draw', () => tourPic(lineSpec(TOUR_POS.draw), { noAllow: true })),
  // the rule variants of the new-game dialog
  tourRead('vars'),
];
const TOUR_VARS = TOUR_PAGES.findIndex(p => p.id === 'vars');
let TOUR = null;
function tourFor() {
  if (TOUR) return TOUR;
  const el = document.createElement('div'); el.className = 'tour-mount'; $('#rulesBody').appendChild(el);
  return (TOUR = RuleTour.create({
    mount: el, store: STORE + '-rules', lang: () => LANG, pages: TOUR_PAGES,
    close: () => closeRules(),
    play: () => { closeRules(); if (lesson || puzzle) quitSpecial(); openNewDialog(); },
    lessons: () => { closeRules(); openLessons(); },
    sound: k => { if (k === 'ok') sCrown(); },
  }));
}
function openRules(r, page) { selTab('rules'); showOverlay('#rulesOverlay'); if (page != null) tourFor().page = page; renderRules(); }
function closeRules() { if (TOUR) TOUR.stop(); hideOverlay('#rulesOverlay'); }
function renderRules() { const tour = tourFor(); tour.open(tour.page); }
$('#rulesClose').onclick = () => closeRules();

// ---------------------------------------------------------------- new game dialog
let draft = {};
function levelLabelHTML(v) { return `${LV(v)}<small>${LVD(v)}</small>`; }
function segSync() {
  document.querySelectorAll('#segMode button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.mode));
  document.querySelectorAll('#segColor button').forEach(b => b.classList.toggle('sel', +b.dataset.v === draft.color));
  const m = draft.mode, game = m === 'ai' || m === 'pvp' || m === 'watch';
  $('#fRatedInfo').classList.toggle('hidden', m !== 'rated');
  if (m === 'rated') $('#rtStats').innerHTML = rtStatsHtml();
  // the rule variants (ルール tab): three choices, the main rule first; rated games always use the main rule
  $('#fVar').classList.toggle('hidden', !game);
  { const R = E.ruleOf(draft.rule); for (const k of ['fc', 'tie', 'cnt']) document.querySelectorAll(`#seg_${k} button`).forEach(b => b.classList.toggle('sel', +b.dataset.v === R[k])); $('#varNote').textContent = draft.rule === 'std' ? t('var.std') : t('var.custom'); }
  $('#fColor').classList.toggle('hidden', m !== 'ai');
  $('#fLevel').classList.toggle('hidden', !(m === 'ai' || m === 'watch'));
  $('#fLevel2').classList.toggle('hidden', m !== 'watch');
  $('#fDisplay').classList.toggle('hidden', !game);
  $('#fInfo').classList.toggle('hidden', game || m === 'rated');
  $('#fInfoText').textContent = m === 'lesson' ? t('ls.desc') : m === 'puzzle' ? t('pz.desc') : '';
  $('#btnStart').textContent = m === 'lesson' ? t('ng.toLessons') : m === 'puzzle' ? t('ng.toPuzzles') : m === 'rated' ? t('rt.start') : t('start');
  $('#levelLabel').textContent = m === 'watch' ? t('ng.level1') : t('ng.level');
  $('#levelRange').value = draft.level; $('#levelName').innerHTML = levelLabelHTML(draft.level);
  $('#levelRange2').value = draft.level2; $('#levelName2').innerHTML = levelLabelHTML(draft.level2);
}
function openNewDialog(resume) {
  draft = { mode: lesson ? 'lesson' : puzzle ? 'puzzle' : rgame && settings.mode === 'ai' ? 'rated' : settings.mode === 'online' ? 'pvp' : settings.mode, color: settings.color, level: settings.level, level2: settings.level2, rule: settings.rule };
  if (resume) { draft.resume = true; if (!['ai', 'pvp', 'watch'].includes(draft.mode)) draft.mode = 'ai'; draft.color = humanColor; }   // 「ここから再開」: the same dialog, only what fits going on from this position
  $('#optEval').checked = settings.eval; $('#optLast').checked = settings.last; $('#optAnim').checked = settings.anim; $('#optSend').checked = settings.send; $('#optNum').checked = settings.num;
  if (window.ResumeNG) { if (resume) ResumeNG.open({ modes: ['ai', 'pvp', 'watch'], hide: '#fVar' }); else ResumeNG.close(); }
  segSync(); designPickers(); showOverlay('#newOverlay');
}
// 「ここから再開」 with the chosen settings: the position and the moves up to it are kept, who is to move stays
function resumeWith() {
  const pm = settings.mode, ph = humanColor;
  Object.assign(settings, { mode: draft.mode, color: draft.color, level: draft.level, level2: draft.level2 });
  stopPlay(); busyToken++; cancelWorker('ai'); thinking = 0; animating = false; wpPaused = false; sel = null;
  if (settings.mode === 'ai') humanColor = settings.color === 0 ? (Math.random() < 0.5 ? P1 : P2) : settings.color;
  if (settings.mode === 'ai' && (pm !== 'ai' || ph !== humanColor)) settings.rsNoRec = true;   // taken over midway: not a game of the player's for the record
  hideOverlay('#resultOverlay');
  if (reviewing) resumeHere(); else { gameOverShown = false; update(false); save(); afterPosition(); }
}
$('#bdRow').addEventListener('click', e => { const b = e.target.closest('button[data-bd]'); if (!b) return; settings.bd = b.dataset.bd; designApply(); designPickers(); save(); });
$('#pcRow').addEventListener('click', e => { const b = e.target.closest('button[data-pcs]'); if (!b) return; settings.pcs = b.dataset.pcs; designApply(); designPickers(); save(); });
$('#segMode').onclick = e => { const b = e.target.closest('button'); if (b && b.dataset.v) { draft.mode = b.dataset.v; segSync(); } };
$('#fVar').addEventListener('click', e => { const b = e.target.closest('.seg[data-k] button'); if (!b) return; const R = Object.assign({}, E.ruleOf(draft.rule)); R[b.closest('.seg').dataset.k] = +b.dataset.v; draft.rule = E.ruleKey(R); segSync(); });
$('#varHelp').onclick = () => openRules(null, TOUR_VARS);
$('#segColor').onclick = e => { const b = e.target.closest('button'); if (b) { draft.color = +b.dataset.v; segSync(); } };
$('#levelRange').oninput = e => { draft.level = +e.target.value; segSync(); };
// PRO mode (shared/proset.js; common rule「対局設定の Pro モード」): advanced settings for the AI beside the level — vs the AI /
// AI vs AI, never rated. ProSet.ladder() turns the changed values into a step of this engine's ladder (engine.js think: cfg).
const PRO_L = window.ProSet ? ProSet.ladder(Array.from({ length: LV_MAX + 1 }, (_, n) => n ? E.LEVELS[lvOld(n)] : null), { dmax: 20, nmax: 20000000 }) : null;
var PRO = PRO_L ? ProSet.init({ game: 'uttt', lang: () => LANG, level: () => draft.level || settings.level, show: () => draft.mode === 'ai' || draft.mode === 'watch',
  store: { get: () => settings.pro, set: v => { settings.pro = v; } },
  // threads (本編のマルチスレッド, shared/mtsplit.js): with any limit of the search; the default is the levels' own count for the
  // levels that think by time, else one
  defaults: MTP ? lv => Object.assign(PRO_L.defaults(lv), { threads: mtLevel(lv) ? ProSet.defThreads() : 1 }) : PRO_L.defaults,   // (threads: up to the performance cores, MTEngine.perfThreads() — 10 on the user's Mac — as the other games; 2026-11-11, the Mac's bench-all: 10 threads as fast as 8 or faster. Before: min(cores − 1, 7) + 1 = 8)
  params: MTP ? [PRO_L.params[0], { key: 'threads' }, { key: 'ponder' }].concat(PRO_L.params.slice(1)) : PRO_L.params }) : null;
// AI同士: the second AI has a PRO of its own beside its level (#fLevel2), as reversi / shogi (2026-11-14)
var PRO2 = PRO_L ? ProSet.init({ game: 'uttt-w2', field: '#fLevel2', lang: () => LANG, level: () => draft.level2 || settings.level2, show: () => draft.mode === 'watch',
  store: { get: () => settings.pro2, set: v => { settings.pro2 = v; } },
  // threads (本編のマルチスレッド, shared/mtsplit.js): with any limit of the search; the default is the levels' own count for the
  // levels that think by time, else one
  defaults: MTP ? lv => Object.assign(PRO_L.defaults(lv), { threads: mtLevel(lv) ? ProSet.defThreads() : 1 }) : PRO_L.defaults,   // (threads: up to the performance cores, MTEngine.perfThreads() — 10 on the user's Mac — as the other games; 2026-11-11, the Mac's bench-all: 10 threads as fast as 8 or faster. Before: min(cores − 1, 7) + 1 = 8)
  params: MTP ? [PRO_L.params[0], { key: 'threads' }, { key: 'ponder' }].concat(PRO_L.params.slice(1)) : PRO_L.params }) : null;
// a rated game (5 min + 3 s): the timed top levels (Lv.21〜) never think longer than the clock allows — about a twentieth of the
// time left plus most of the increment (on every thread, as without the cap)
function rtCap(lv) {
  const L = E.LEVELS[lv]; if (!rgame || lv <= 20 || !L || !L.ms) return null;
  const left = rtClockLeft(toMoveAt(moves.length) - 1), ms = Math.min(L.ms, Math.max(800, left / 20 + RT_CLOCK.inc * 0.8));
  return ms >= L.ms ? null : Object.assign({}, L, { ms });
}
function proCfg(lv, p) { const PRO = settings.mode === 'watch' && p !== undefined && p !== P1 && window.PRO2 ? window.PRO2 : window.PRO; if (!PRO || rgame || !(settings.mode === 'ai' || settings.mode === 'watch')) return null; const e = PRO.get(lv); return e ? Object.assign(PRO_L.cfg(e, lv), MTP ? { threads: e.threads || 1, ponder: !!e.ponder } : {}) : null; }
// PRO's 先読み (ponder, shared/ponder.js, 2026-11-18): on the human's turn the threads read on from the human's position (every reply
// then gets into the shared table the AI's own search uses: only when that search runs on the threads — a step with threads > 1)
const pdAI = () => humanColor === P1 ? P2 : P1;
const PONDER = window.Ponder && MCP ? Ponder.attach({ mtp: MCP,
  want: () => { if (!MTEngine.on() || settings.mode !== 'ai' || rgame || lesson || puzzle || reviewing || wpPaused || thinking || cur !== moves.length || isAIColor(toMoveAt(cur)) || gameOver(cur)) return false; const c = proCfg(levelFor(pdAI())); return !!(c && c.ponder && c.s && c.threads > 1); },
  key: () => keyOf(cur),
  job: cap => { const c = proCfg(levelFor(pdAI())); if (!c || !c.s || c.threads < 2) return null; const cfg = Object.assign({}, c, { d: 99, ms: cap }); delete cfg.nk; delete cfg.dx; delete cfg.book;
    return { msg: { start: startSpec, rule: gv, type: 'think', moves: moves.slice(0, cur), level: levelFor(pdAI()), cfg, mtThreads: c.threads } }; } }) : null;
function proTag(lv, p) { return proCfg(lv, p) ? ' PRO' : ''; }
$('#levelRange2').oninput = e => { draft.level2 = +e.target.value; segSync(); };
$('#btnCancelNew').onclick = () => hideOverlay('#newOverlay');
$('#btnStart').onclick = () => {
  if (draft.mode === 'online') return;   // handled by online-ui.js
  hideOverlay('#newOverlay');
  if (draft.mode === 'lesson') { openLessons(); return; }
  if (draft.mode === 'puzzle') { openPuzzles(); return; }
  Object.assign(settings, { eval: $('#optEval').checked, last: $('#optLast').checked, anim: $('#optAnim').checked, send: $('#optSend').checked, num: $('#optNum').checked });
  if (draft.mode === 'rated') { rtStart('std'); return; }
  if (draft.resume) { resumeWith(); return; }
  exitSpecial();
  Object.assign(settings, { mode: draft.mode, color: draft.color, level: draft.level, level2: draft.level2 });
  setVariant(draft.rule); drawLines();
  newGame();
};

// ====================================================================== rated games vs the AI (solo)
const RT_STORE = STORE + '-rated', RT_START = 1000, RT_CLOCK = { base: 300000, inc: 3000 };
// rating of each level on the common scale (addendum「AIレートの共通の目盛り」: Lv.1 = 100, Lv.20 = 2500, 天上 2700 / 2800 / 2900); the shape
// between follows the self-play steps measured 2026-11-28 (claude/uttt-spec.md「AIの強さ」)
const RT_LV = [0, 100, 246, 551, 709, 831, 953, 1075, 1172, 1294, 1428, 1562, 1684, 1781, 1879, 1976, 2074, 2171, 2305, 2403, 2500, 2700, 2800, 2900];
function rtLoad() {
  let s = null; try { s = JSON.parse(localStorage.getItem(RT_STORE) || 'null'); } catch (e) {}
  if (!s || typeof s.r !== 'number' || !isFinite(s.r)) s = { r: RT_START, n: 0, w: 0, l: 0, d: 0, hist: [] };
  if (!Array.isArray(s.hist)) s.hist = [];
  return s;
}
function rtStore(s) { try { localStorage.setItem(RT_STORE, JSON.stringify(s)); } catch (e) {} }
function rtRank(r) { let k = 0; for (let i = 1; i <= LV_MAX; i++) if (r >= RT_LV[i] - 50) k = i; return k ? LV(k) : t('rt.below'); }
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
function statusAtRaw(i) { const keep = rgame; rgame = null; try { return statusAt(i); } finally { rgame = keep; } }
function rtLive() { return !!(rgame && !rgame.over && !statusAtRaw(moves.length).over && !lesson && !puzzle && settings.mode === 'ai'); }
function rtClockLeft(c) {   // c: 0 Black, 1 White
  if (!rgame || !rgame.ct) return 0;
  let v = rgame.ct[c];
  if (rtLive() && !rtHold && toMoveAt(moves.length) - 1 === c) v -= Date.now() - rgame.t;
  return Math.max(0, v);
}
function fmtClock(ms) { const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); }
setInterval(() => {
  if (!rtLive()) return;
  if (rtHold) { rgame.t = Date.now(); return; }
  const c = toMoveAt(moves.length) - 1, left = rtClockLeft(c), el = $('#clk' + (c + 1));
  if (el) { el.textContent = fmtClock(left); el.classList.toggle('low', left < 30000); }
  if (window.CountTick) { if (c + 1 === humanColor) CountTick.feed(left, 'rt' + moves.length); }
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
  if (moves.length) recordGame(rgame.over);
  if (x) toast(t('rt.abandoned', { o: x.old, n: x.now, d: rtD(x.d) }), 3200);
  return x;
}
function rtStart(rule) {
  if (rule) { setVariant(rule); drawLines(); }
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
const RT_GUARD = '#btnNew, #btnLesson, #btnPuzzle, #btnStart, #btnPaste';
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
const lessonsReady = fetch('lessons.json?v=1').then(r => r.json()).then(d => (LESSONS = d)).catch(() => null);
const LS_STORE = STORE + '-lessons', PZ_STORE = STORE + '-puzzles';
function lsProgress() { try { return JSON.parse(localStorage.getItem(LS_STORE) || '{}'); } catch (e) { return {}; } }
function pzProgress() { let pr; try { pr = JSON.parse(localStorage.getItem(PZ_STORE) || '{}') || {}; } catch (e) { return {}; } return pzMigrate(pr); }
let introIdx = 0;
let savedGame = null;
function stashGame() { if (!lesson && !puzzle) savedGame = { moves, cur, evals: evals.slice(), humanColor }; }
function exitSpecial() {
  if (window.SeqPrac) SeqPrac.stop();
  if (!lesson && !puzzle) return;
  lesson = null; puzzle = null; lessonMarks = []; labelList = null;
  document.body.classList.remove('in-lesson', 'in-puzzle');
  if (gv !== settings.rule) { setVariant(settings.rule); drawLines(); }
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false;
  startSpec = null;
  if (savedGame) { moves = savedGame.moves; cur = savedGame.cur; evals = savedGame.evals; humanColor = savedGame.humanColor; savedGame = null; }
  else { moves = []; cur = 0; evals = []; }
  reviewing = cur !== moves.length; hintList = null;
  gameOverShown = gameOver(moves.length);
}
function quitSpecial() { exitSpecial(); update(false); afterPosition(); }
function showLessonView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); if (v === 'lessonDoneView') lsDoneLabel(); }
// lesson list (same layout as Gomoku / Morris): a tab per course, a banner, cards with a board picture and a short explanation
const LS_ICON = {
  basics: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="#2a3038" stroke="#8a929c" stroke-width="1"/><path d="M9 4v16M15 4v16M4 9h16M4 15h16" stroke="#d9b46a" stroke-width="1.3"/><path d="M5 5l3 3M8 5L5 8" stroke="#e0583c" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="12" r="1.9" fill="none" stroke="#f1e9d8" stroke-width="1.4"/></svg>',
  strategy: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="#2a3038" stroke="#8a929c" stroke-width="1"/><path d="M9 4v16M15 4v16M4 9h16M4 15h16" stroke="#d9b46a" stroke-width="1.1"/><path d="M6.5 17.5Q12 6 17.5 6.5" fill="none" stroke="#ffd25a" stroke-width="1.6" stroke-linecap="round"/><path d="M15.2 5.4l2.3 1.1-1.3 2.2" fill="none" stroke="#ffd25a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
const lsIcon = k => `<span class="ic sv">${LS_ICON[k] || '●'}</span>`;
const plainText = html => String(html || '').replace(/<br\s*\/?>|<\/p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const lxBar = (p, cls) => `<span class="lx-bar ${cls || ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span>`;
const lxSt = (r, okTxt) => r ? (r[okTxt ? 'pass' : 'clear'] ? `<span class="lx-st ok">✓ ${okTxt ? '' : t('ls.clear') + ' '}${t('u.pt', { n: r.best })}</span>` : `<span class="lx-st">${t('u.pt', { n: r.best })}</span>`) : `<span class="lx-st new">${t('ls.notyet')}</span>`;
function diagSVG(d, cls) {
  const marks = {}; for (const [n, k] of d.marks || []) marks[n - 1] = k;
  const zones = {}; for (const [b, k] of d.zones || []) zones[b] = k;
  return miniSVG(d.s, { cls, marks, zones, arrows: (d.arrows || []).map(a => a[0]) });
}
function lessonThumb(s) {
  const R = s.ramp && s.ramp[0];
  if (R && R.k === 'explain') return diagSVG(R, 'lxb');
  const P = s.problems[0]; return P && P.s ? miniSVG(P.s, { cls: 'lxb' }) : '';
}
const pzThumbSVG = (T, j, P) => miniSVG(P.s, { cls: 'lxb', flip: P.s.side === P2 });
const lsCourseSel = {};
async function openLessons(v, course) {
  const d = await lessonsReady; selTab('lesson');
  if (!d) { toast(t('ls.fail')); return; }
  openChoiceIdx = -1; $('#btnLessonStart').classList.remove('hidden');
  $('#lsListTitle').textContent = t('ls.title'); $('#lsListDesc').textContent = t('ls.desc');
  const pr = lsProgress(), cOf = s => s.course || 'tactics', courses = [...new Set(LESSONS.steps.map(cOf))];
  const stat = c => { const st = LESSONS.steps.filter(s => cOf(s) === c); return { n: st.length, ok: st.filter(s => { const r = pr[s.id]; return r && r.clear; }).length }; };
  if (course) lsCourseSel.c = course;
  let c = lsCourseSel.c;
  if (!courses.includes(c)) c = lsCourseSel.c = courses.find(k => { const q = stat(k); return q.ok < q.n; }) || courses[0];
  const q = stat(c);
  const cards = LESSONS.steps.map((s, i) => {
    if (cOf(s) !== c) return '';
    const r = pr[s.id];
    return `<button class="lx-card${r && r.clear ? ' clear' : ''}" data-i="${i}"><span class="lx-th">${lessonThumb(s)}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">STEP ${stepNo(i)}</span>${lxSt(r)}</span><b class="lx-t">${t('ls.' + s.id + '.title')}</b><small class="lx-sub">${t('ls.' + s.id + '.sub')}</small>` +
      `<span class="lx-desc">${plainText(t('ls.' + s.id + '.intro'))}</span>${lxBar(r ? r.best / 100 : 0, r && r.clear ? 'ok' : '')}</span></button>`;
  }).join('');
  $('#lessonList').innerHTML = `<div class="lx">` +
    `<div class="lx-tabs">${courses.map(k => { const z = stat(k); return `<button data-course="${k}" class="${k === c ? 'sel' : ''}">${lsIcon(k)}<span class="nm">${t('course.' + k)}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join('')}</div>` +
    `<div class="lx-banner">${lsIcon(c)}<span class="tx"><b>${t('course.' + c)}</b><small>${t('course.' + c + '.sub')}</small></span><span class="pg">${t('lx.cleared', { a: q.ok, b: q.n })}${lxBar(q.ok / q.n, 'ok')}</span></div>` +
    `<div class="lx-grid">${cards}</div></div>`;
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
$('#lessonList').onclick = e => {
  const tb = e.target.closest('[data-course],[data-grp]'); if (tb) { if (tb.dataset.course) openLessons(null, tb.dataset.course); else openOpenings(tb.dataset.grp); return; }
  const b = e.target.closest('.lx-card[data-i]'); if (b) openIntro(+b.dataset.i);
};
function stepNo(i) { const c = LESSONS.steps[i].course || 'tactics'; let n = 0; for (let k = 0; k <= i; k++) if ((LESSONS.steps[k].course || 'tactics') === c) n++; return n; }
function openIntro(i) {
  introIdx = i; openChoiceIdx = -1; $('#btnLessonStart').classList.remove('hidden'); const s = LESSONS.steps[i];
  const step = t('course.' + (s.course || 'tactics')) + ' · STEP ' + stepNo(i), title = t('ls.' + s.id + '.title'), fig = s.diagram ? diagSVG(s.diagram, 'mini') : lessonThumb(s);   // (no diagram: the first problem's position)
  $('#liStep').textContent = step; $('#liTitle').textContent = title;
  // the common lesson page (shared/luxintro.js, 2026-11-11): board · facts · goal · how to think · trivia — as much as shogi's page
  if (window.LuxIntro) {
    LuxIntro.load('lux.json?v=1').then(X => {
      if (introIdx !== i || openChoiceIdx >= 0) return;
      const U = LL(X.ui || {}) || {}, x = (X.lessons || {})[s.id] || {}, H = k => LuxIntro.head(k, LANG), n = (s.problems || []).length;
      const gk = 'ls.' + s.id + '.goal', goal = t(gk) !== gk ? t(gk) : '', tr = LL(x.trivia);
      LuxIntro.lesson({ step, title, fig, cap: U.figL, chips: [[U.kind, (U.probs || '').replace('{n}', n)], [U.pass, U.passPts]],
        secs: [goal && { h: H('goal'), html: goal }, { h: H('think'), html: t('ls.' + s.id + '.intro') }, tr && { h: H('trivia'), html: tr, cls: 'lx-trivia' }].filter(Boolean) });
    });
    showLessonView('lessonIntroView'); return;
  }
  $('#liBody').innerHTML = fig + t('ls.' + s.id + '.intro');
  showLessonView('lessonIntroView');
}
$('#btnLessonBack').onclick = () => openChoiceIdx >= 0 ? openOpenings(OPEN.sets[openChoiceIdx] && OPEN.sets[openChoiceIdx].grp) : openLessons(null, LESSONS.steps[introIdx] && (LESSONS.steps[introIdx].course || 'tactics'));
$('#btnLessonClose').onclick = () => hideOverlay('#lessonOverlay');
$('#btnLessonStart').onclick = () => startLesson(introIdx);
// finished screen: 「レッスンに戻る」/「定跡に戻る」 ends the lesson and reopens the list it came from, on its tab, scrolled to the item
const lsDoneSrc = () => !lesson || !lesson.virt ? 'lesson' : lesson.virt.id === 'mk' ? 'game' : 'open';
function lsDoneLabel() { const b = $('#btnLessonQuit2'), k = { lesson: 'ls.toList', open: 'ls.toOpen', game: 'ls.toGame' }[lsDoneSrc()]; b.dataset.i18n = k; b.textContent = t(k); }
function lsReveal(sel) { const el = $('#lessonList').querySelector(sel); if (el) el.scrollIntoView({ block: 'center' }); }
$('#btnLessonQuit2').onclick = async () => {
  const L = lesson, src = lsDoneSrc();
  if (src === 'game') { hideOverlay('#lessonOverlay'); quitSpecial(); return; }
  quitSpecial();
  if (src === 'open') { await openOpenings(OPEN.sets[L.gi] && OPEN.sets[L.gi].grp); lsReveal(`[data-o="${L.gi}"]`); }
  else { const st = L && LESSONS.steps[L.step]; await openLessons(null, st && (st.course || 'tactics')); if (L) lsReveal(`[data-i="${L.step}"]`); }
};
$('#btnLessonRetry').onclick = () => { if (lesson && lesson.virt) startPractice(lesson.gi); else startLesson(lesson ? lesson.step : introIdx); };
$('#btnLessonNextStep').onclick = () => { const n = (lesson ? lesson.step : introIdx) + 1; if (n < LESSONS.steps.length) openIntro(n); else { hideOverlay('#lessonOverlay'); quitSpecial(); } };
function enterSpecial(spec) {
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false; stopPlay();
  if (gv !== 'std') { gv = 'std'; E.setRule('std'); }   // (lessons and puzzles: the main rule)
  startSpec = spec;
  moves = []; cur = 0; reviewing = false; hintList = null; lessonMarks = []; labelList = null; evals = [];
}
function startLesson(step) {
  hideOverlay('#lessonOverlay');
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle');
  lesson = { step, i: 0, results: [], answered: false, hinted: false };
  document.body.classList.add('in-lesson');
  const R = LESSONS.steps[step].ramp;
  if (R && R.length) { lesson.ramp = R; lesson.ri = 0; loadRamp(); return; }
  loadLessonProblem();
}
// ---- warm-up ramp before a lesson's scored problems (lessons.json step.ramp, built by tools/ramps.js; not scored)
//   explain: read-only position + the idea as arrows (seq) + marks + a short explanation (次へ)
//   try: a guided position, any move in ok is right; hints go concept → where to look → the answer
const RU = (k, v) => { let x = LL(LESSONS.rampUi && LESSONS.rampUi[k]) || ''; if (v) x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; };
const rampItem = () => lesson.ramp[lesson.ri];
const rampByName = (pos, s) => pos.moves().find(m => E.name(pos, m) === s);
function rampMarks(it) {
  const out = [];
  for (const [m, c] of it.arrows || []) out.push({ arrow: [m], cls: c });
  for (const [q, c] of it.marks || []) out.push({ at: q - 1, cls: c });
  for (const [b, c] of it.zones || []) out.push({ zone: b, cls: c });
  return out;
}
function loadRamp() {
  const it = rampItem();
  lesson.me = it.s.side;
  enterSpecial(it.s);
  lesson.rh = 0; lesson.rok = false; lesson.answered = it.k === 'explain';
  lessonMarks = it.k === 'explain' ? rampMarks(it) : [];
  update(false); renderLessonCard();
  $('#lsFb').innerHTML = it.k === 'explain' ? '' : `<small style="color:var(--dim)">${RU('note')}</small>`;
}
function renderRampCard() {
  const it = rampItem(), n = lesson.ramp.length, last = lesson.ri + 1 >= n, id = curStep().id;
  $('#lsStep').textContent = RU('step', { i: lesson.ri + 1, n });
  $('#lsTitle').textContent = t('ls.' + id + '.title');
  const skip = `<button type="button" class="ls-skip" style="margin-top:6px;font-size:12px;background:none;border:0;color:var(--dim);text-decoration:underline;cursor:pointer;padding:0">${RU('skip')} »</button>`;
  $('#lsPrompt').innerHTML = it.k === 'explain'
    ? `<div class="ls-goal"><span>💡</span><span><b>${t('ls.' + id + '.ex.t')}</b></span></div><div class="ls-explain">${t('ls.' + id + '.ex.b', lsVals(it.s, it.ans, it.ans))}</div>${skip}`
    : `<div class="ls-goal"><span class="pdisc p${lesson.me}"></span><span>${t('ls.turn', { c: pname(lesson.me) })} ${t('ls.' + id + '.goal')}</span></div>${skip}`;
  const sk = $('#lsPrompt').querySelector('.ls-skip'); if (sk) sk.onclick = rampDone;
  $('#lsDots').innerHTML = lesson.ramp.map((_, i) => `<i class="${i < lesson.ri ? 'ok' : ''} ${i === lesson.ri ? 'cur' : ''}"></i>`).join('');
  $('#lsHint').textContent = t('ls.hint'); $('#lsHint').disabled = it.k === 'explain' || lesson.answered;
  $('#lsNext').textContent = last ? RU('main') : RU('next');
  $('#lsNext').disabled = !(it.k === 'explain' || lesson.rok);
}
function rampDone() { if (!lesson || !lesson.ramp) return; lesson.ramp = null; lesson.i = 0; lesson.results = []; loadLessonProblem(); }
function rampHint() {
  const it = rampItem(); if (it.k !== 'try' || lesson.answered) return;
  lesson.rh = Math.min(3, lesson.rh + 1);
  const id = curStep().id, pos = E.Pos.from(it.s);
  lessonMarks = [];
  if (lesson.rh === 1) $('#lsFb').innerHTML = t('ls.' + id + '.hint');
  else if (lesson.rh === 2) { $('#lsFb').innerHTML = t('ls.' + id + '.hint') + '<br>' + RU('look'); lessonMarks = lsHintMarks(id, it.s); }
  else { $('#lsFb').innerHTML = RU('ans', { m: mvIn(pos, it.best) }); markMove(pos, it.best, 'ok'); }
  renderFx();
}
function rampMove(m) {
  const L = lesson, it = rampItem(), ri = L.ri, pos0 = posAt(0).pos, id = curStep().id;
  if (L.answered) return;
  L.answered = true;
  const good = it.ok.includes(m);
  $('#lsFb').innerHTML = good ? `<b class="ok">✓</b> ${lsWhyText(id, it.s, m)}` : `<b class="ng">✗</b> ${lsNgText(id, it.s, m, it.best)} ${RU('ng')}`;
  L.rok = good; playChime(good); lessonMarks = []; playMove2(m); renderLessonCard();
  if (good) return;
  const tok = busyToken;
  setTimeout(() => {
    if (lesson !== L || !L.ramp || L.ri !== ri || tok !== busyToken) return;
    moves = []; cur = 0; L.answered = false; update(false); renderLessonCard();
  }, moveDur(m, pos0) + 2600);
}
// the values of a lesson text (board facts of ls-facts.js): x the move played, m the answer, b its board, t where it sends,
// r the opponent's reply, tb the board that reply wins, n the moves left (forced wins)
function lsVals(spec, m, best, id) {
  const F = window.UtttLsFacts.fact(E, id || curStep().id, spec, m), bn = t('bname');
  return { x: mvIn(null, m), m: mvIn(null, best), b: bn[mB(m)], t: F.t >= 0 ? bn[F.t] : t('ls.anywhere'), t0: F.t, r: F.r != null ? mvIn(null, F.r) : '', tb: F.tb != null ? bn[F.tb] : '', k: F.k };
}
function lsWhyText(id, spec, m) { const v = lsVals(spec, m, m, id); return t('ls.' + id + '.why', v); }
function lsNgText(id, spec, m, best) {
  const v = lsVals(spec, m, best, id);
  if (/^s_force/.test(id) && v.k === 'slow') {   // the defender's most stubborn reply after the wrong move (the exact prover)
    const n = id === 's_force2' ? 2 : 3, q = E.Pos.from(spec).play(m), R = E.duelReply(q.spec(), [], n - 1);
    v.r = R && R.move != null ? mvIn(null, R.move) : ''; v.n = n - 1;
  }
  const k = v.k === 'take' && v.t0 < 0 ? 'takeFree' : v.k === 'miss' && id === 'b_big' ? 'missBig' : v.k;
  return t('ls.ng.' + k, v) + ' ' + t('ls.ng.ans', v);
}
function lsHintMarks(id, spec) {
  const h = window.UtttLsFacts.hint(E, id, spec); return (h.zones || []).map(b => ({ zone: b, cls: h.ng ? 'ng' : 'hl' }));
}
const curStep = () => lesson.virt || LESSONS.steps[lesson.step];
function lessonProblem() { return curStep().problems[lesson.i]; }
function loadLessonProblem() {
  if (window.SeqPrac) SeqPrac.stop();
  const P = lessonProblem();
  lesson.me = P.s.side;
  enterSpecial(P.s);
  lesson.answered = false; lesson.hinted = false;
  update(false); renderLessonCard();
  $('#lsFb').innerHTML = '';
  if (lesson.virt && lesson.virt.id !== 'mk' && window.seqGameStart && !lesson.ramp) seqGameStart(lessonProblem(), window.SEQ_CFG);   // opening practice: 3 moves in a row (shared/seqgame.js)
}
function renderLessonCard() {
  if (lesson && lesson.ramp) return renderRampCard();
  const s = curStep(), n = s.problems.length, P = lessonProblem();
  $('#lsStep').textContent = lesson.virt ? t('op.practiceStep', { i: lesson.i + 1, n }) : t('ls.stepq', { s: stepNo(lesson.step), i: lesson.i + 1, n });
  $('#lsTitle').textContent = lesson.virt ? LL(s.title) : t('ls.' + s.id + '.title');
  const me = P.s.side;
  $('#lsPrompt').innerHTML = `<div class="ls-goal"><span class="pdisc p${me}"></span><span>${t('ls.turn', { c: pname(me) })} ${lesson.virt ? t('op.goal') : t('ls.' + s.id + '.goal')}</span></div>`;
  $('#lsHint').textContent = t('ls.hint');
  $('#lsDots').innerHTML = s.problems.map((_, i) => { const r = lesson.results[i]; return `<i class="${r === undefined ? '' : r >= 16 ? 'ok' : r >= 10 ? 'mid' : 'ng'} ${i === lesson.i ? 'cur' : ''}"></i>`; }).join('');
  $('#lsNext').textContent = lesson.i + 1 < n ? t('ls.next') : t('ls.result');
  $('#lsNext').disabled = !lesson.answered;
  $('#lsHint').disabled = lesson.answered;
}
function problemPoints(P, m) {
  if (P.ok) return P.ok.includes(m) ? 20 : 0;   // (every problem here has its answer set: a right move or not)
  const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;
  if (mine >= best - 6 && !(best > WINT && mine < best)) return 20;
  if (best > WINT && mine > WINT) return 16;          // a slower forced win
  if (best > WINT && mine <= WINT) return mine > -WINT && mine >= 150 ? 8 : mine > -60 ? 4 : 0;
  if (mine < -WINT && best >= -WINT) return 0;
  const loss = sOfV(best) - sOfV(mine);
  return Math.max(0, Math.round(20 * (1 - loss / 0.5)));
}
function markMove(pos, mm, cls) { lessonMarks.push({ arrow: [mm], cls }); lessonMarks.push({ at: mm, cls }); }
// a solved problem moves on to the next one by itself after a short success beat (shared/cardbar.js; any tap cancels it).
// The last problem of a lesson / drill keeps the usual 結果 button.
function lsAuto(good, ms) {
  const L = lesson; if (!good || !L || L.study || !window.CardBar || !CardBar.autoNext) return;
  const i = L.i; if (i + 1 >= curStep().problems.length) return;
  CardBar.autoNext({ ms: Math.max(1300, ms || 0), ok: () => lesson === L && L.i === i && L.answered });
}
function lessonAnswer(m) {
  if (window.SeqPrac && SeqPrac.active()) { SeqPrac.move(String(m)); return; }
  if (lesson.ramp) return rampMove(m);
  const P = lessonProblem(), s = curStep(), pos0 = posAt(0).pos;
  lesson.answered = true;
  const pts = problemPoints(P, m);
  if (P.ok) return okAnswer(P, s, m, pts);
  lesson.results[lesson.i] = pts;
  renderLessonCard();
  const best = P.best, lbl = pts === 20 ? 'fb.perfect' : pts >= 16 ? 'fb.good' : pts >= 10 ? 'fb.ng' : 'fb.bad';
  let fb = `<span class="pts ${pts >= 16 ? 'ok' : pts >= 10 ? 'mid' : 'ng'}">+${t('u.pt', { n: pts })}</span> <b class="${pts >= 16 ? 'ok' : 'ng'}">${t(lbl)}</b> `;
  fb += lesson.virt ? t('op.why', { m: mvIn(pos0, best) }) : t('ls.' + s.id + '.why', { m: mvIn(pos0, best), x: mvIn(pos0, m) });
  const val = new Map(P.sc), fmt = v => valLabel(v).big + (valLabel(v).small ? ' ' + valLabel(v).small : '');
  fb += `<br><small style="color:var(--dim)">${t('fb.values', { a: fmt(val.has(m) ? val.get(m) : -WIN), b: fmt(val.get(best)) })}</small>`;
  $('#lsFb').innerHTML = fb;
  playChime(pts >= 16);
  playMove2(m);
  lsAuto(pts >= 16, moveDur(m, pos0) + 1100);
  const tok = busyToken;
  setTimeout(() => {
    if (!lesson || tok !== busyToken) return;
    // back to the problem: the answer (gold), your move (red) and the value of each landing square
    moves = []; cur = 0; sel = null; lessonMarks = [];
    markMove(pos0, best, 'ok'); if (m !== best) markMove(pos0, m, 'ng');
    const g = new Map(); for (const [mm, v] of P.sc) { const k = mm; if (!g.has(k) || v > g.get(k)) g.set(k, v); }
    const bv = Math.max(...g.values());
    labelList = [...g].map(([at, v]) => { const L = valLabel(v); return { at, big: L.big, small: L.small, cls: L.cls + (v === bv ? ' best' : '') }; });
    update(false);
  }, moveDur(m, pos0) + 700);
}
function okAnswer(P, s, m, pts) {
  const pos0 = posAt(0).pos;
  lesson.results[lesson.i] = pts; renderLessonCard();
  const best = P.ok.includes(m) ? m : P.best;
  $('#lsFb').innerHTML = `<span class="pts ${pts ? 'ok' : 'ng'}">+${t('u.pt', { n: pts })}</span> <b class="${pts ? 'ok' : 'ng'}">${t(pts ? 'fb.perfect' : 'fb.bad')}</b> ` + (pts ? lsWhyText(s.id, P.s, m) : lsNgText(s.id, P.s, m, best));
  playChime(!!pts); playMove2(m);
  lsAuto(!!pts, moveDur(m, pos0) + 1600);
  const tok = busyToken;
  setTimeout(() => {
    if (!lesson || tok !== busyToken) return;
    moves = []; cur = 0; lessonMarks = [];
    markMove(pos0, best, 'ok');
    if (!pts) { markMove(pos0, m, 'ng'); const F = window.UtttLsFacts.fact(E, s.id, P.s, m); if (F.r != null) lessonMarks.push({ at: F.r, cls: 'hl' }); if (F.tb != null) lessonMarks.push({ zone: F.tb, cls: 'ng' }); }
    update(false);
  }, moveDur(m, pos0) + 900);
}
$('#lsHint').onclick = () => {
  if (lesson && lesson.ramp) { rampHint(); return; }
  if (lesson && lesson.study) { if (lesson.i > 0) { lesson.i--; showStudy(false); } return; }
  if (!lesson || lesson.answered) return;
  lesson.hinted = true;
  const s = curStep(), P = lessonProblem();
  lesson.hl = (lesson.hl || 0) + 1;
  lessonMarks = lsHintMarks(s.id, P.s);
  $('#lsFb').innerHTML = t('ls.' + s.id + '.hint');
  renderFx();
};
$('#lsNext').onclick = () => {
  if (lesson && lesson.ramp) { if (!(rampItem().k === 'explain' || lesson.rok)) return; if (lesson.ri + 1 < lesson.ramp.length) { lesson.ri++; loadRamp(); } else rampDone(); return; }
  if (lesson && lesson.study) { if (lesson.i < lesson.g.study.line.length) { lesson.i++; showStudy(true); } else startPractice(lesson.gi); return; }
  if (!lesson || !lesson.answered) return;
  const s = curStep();
  if (lesson.i + 1 < s.problems.length) { lesson.i++; loadLessonProblem(); return; }
  const n = lesson.results.reduce((a, b) => a + b, 0), pass = n >= 75;
  const score = `<div class="ld-score ${pass ? 'ok' : 'ng'}">${t('u.pt', { n })}<small> / ${s.problems.length * 20}</small></div>` + lesson.results.map((x, k) => `${k + 1}: ${t('u.pt', { n: x })}`).join('　') + (pass ? '' : `<br>${t('ls.needPass')}`);
  if (lesson.virt) {
    const op = opProg(), old = op[s.id] || { best: 0, pass: false }; op[s.id] = { best: Math.max(old.best, n), pass: old.pass || pass };
    try { localStorage.setItem(OP_STORE, JSON.stringify(op)); } catch (e) {}
    $('#ldTitle').textContent = t(pass ? 'op.pass' : n + 20 >= 75 ? 'ls.failed' : 'ls.failedFar');
    $('#ldSub').innerHTML = score;
    $('#btnLessonNextStep').classList.add('hidden');
    showLessonView('lessonDoneView'); showOverlay('#lessonOverlay');
    if (pass) confetti();
    return;
  }
  const pr = lsProgress(), old = pr[s.id] || { best: 0, clear: false };
  pr[s.id] = { best: Math.max(old.best, n), clear: old.clear || pass };
  try { localStorage.setItem(LS_STORE, JSON.stringify(pr)); } catch (e) {}
  $('#ldTitle').textContent = t(pass ? 'ls.passed' : n + 20 >= 75 ? 'ls.failed' : 'ls.failedFar');
  $('#ldSub').innerHTML = score;
  $('#btnLessonNextStep').classList.toggle('hidden', lesson.step + 1 >= LESSONS.steps.length);
  const nx = LESSONS.steps[lesson.step + 1];
  if (pass && s.course === 'basics' && !(nx && nx.course === 'basics')) $('#ldSub').innerHTML += `<p class="ls-grad">${t('course.graduate')}</p>`;
  showLessonView('lessonDoneView'); showOverlay('#lessonOverlay');
  if (pass) confetti();
};
$('#lsQuit').onclick = () => quitSpecial();
$('#lsList').onclick = () => { if (!lesson) return; if (lesson.study || lesson.virt) openOpenings(); else openLessons(null, LESSONS && LESSONS.steps[lesson.step] && (LESSONS.steps[lesson.step].course || 'tactics')); };

// ====================================================================== openings (famous lines, studied move by move, then practice)
let OPEN = null, openChoiceIdx = -1;
const openReady = Promise.resolve(null);   // Kōnane has no recorded opening theory to teach (the lists show no 定跡 tab)
const OP_STORE = STORE + '-open';
function opProg() { try { return JSON.parse(localStorage.getItem(OP_STORE) || '{}'); } catch (e) { return {}; } }
const LL = o => o ? (o[LANG] !== undefined ? o[LANG] : o.en !== undefined ? o.en : o.ja) : '';
const opShort = g => g.short ? LL(g.short) : t('op.' + g.id + '.short');
const opIntro = g => g.intro ? LL(g.intro) : String(t('op.' + g.id + '.intro')).split('\n');
let opGrpSel = '';
function opThumb(g) {
  const k = g.show || 3, pre = g.study.line.slice(0, k), key = pre[pre.length - 1];
  return miniSVG(lineSpec(pre), { cls: 'lxb', last: key !== undefined ? key : -1 });
}
async function openOpenings(grp) {
  await openReady; selTab('open');
  if (!OPEN) { toast(t('ls.fail')); return; }
  $('#lsListTitle').textContent = t('op.title'); $('#lsListDesc').textContent = t('op.desc');
  const pr = opProg(), grps = [...new Set(OPEN.sets.map(g => g.grp))];
  if (grp) opGrpSel = grp; if (!grps.includes(opGrpSel)) opGrpSel = grps[0];
  const G0 = opGrpSel, stat = k => { const L = OPEN.sets.filter(g => g.grp === k); return { n: L.length, ok: L.filter(g => pr[g.id] && pr[g.id].pass).length }; }, q = stat(G0);
  const icon = k => `<span class="ic"><span class="pdisc p1"></span></span>`;
  const cards = OPEN.sets.map((g, i) => {
    if (g.grp !== G0) return '';
    const r = pr[g.id];
    return `<button class="lx-card${r && r.pass ? ' clear' : ''}" data-o="${i}"><span class="lx-th">${opThumb(g)}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">${g.moves}</span>${LANG !== 'en' ? `<span class="lx-bd b1">${LL(g.label)}</span>` : ''}${lxSt(r, true)}</span>` +
      `<b class="lx-t">${LL(g.title)}</b><small class="lx-sub">${opShort(g)}</small><span class="lx-desc">${plainText(opIntro(g)[0])}</span>${lxBar(r ? r.best / 100 : 0, r && r.pass ? 'ok' : '')}</span></button>`;
  }).join('');
  $('#lessonList').innerHTML = `<div class="lx">` +
    `<div class="lx-tabs">${grps.map(k => { const z = stat(k); return `<button data-grp="${k}" class="${k === G0 ? 'sel' : ''}">${icon(k)}<span class="nm">${t('op.grp.' + k)}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join('')}</div>` +
    `<div class="lx-banner">${icon(G0)}<span class="tx"><b>${t('op.grp.' + G0)}</b><small>${t('op.grp.' + G0 + '.sub')}</small></span><span class="pg">${t('lx.cleared', { a: q.ok, b: q.n })}${lxBar(q.ok / q.n, 'ok')}</span></div>` +
    `<div class="lx-grid">${cards}</div><p class="lx-credit">${t('op.credit')}</p></div>`;
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
$('#lessonList').addEventListener('click', e => { const b = e.target.closest('.lx-card[data-o]'); if (b) openOpeningChoice(+b.dataset.o); });
function openOpeningChoice(i) {
  openChoiceIdx = i; const g = OPEN.sets[i], pre = g.study.line.slice(0, g.show || 3), last = pre[pre.length - 1];
  $('#liStep').textContent = t('op.title') + ' · ' + g.moves;
  $('#liTitle').textContent = LL(g.title);
  if (window.LuxIntro) {   // the common opening page (shared/luxintro.js, 2026-11-11): board · lead · the two ways in · history (with trivia)
    const fig = miniSVG(lineSpec(pre), { last: last !== undefined ? last : -1 });
    LuxIntro.load('lux.json?v=1').then(X => {
      if (openChoiceIdx !== i) return;
      const U = LL(X.ui || {}) || {}, x = (X.openings || {})[g.id] || {};
      LuxIntro.opening({ step: $('#liStep').textContent, title: LL(g.title), fig, cap: U.figO, lead: opIntro(g),
        choices: [{ ic: '📖', b: t('op.study'), small: t('op.studyDesc', { n: g.study.line.length }), attrs: 'data-study="1"' }, { ic: '✎', b: t('op.practice'), small: t('op.practiceDesc'), attrs: 'data-practice="1"' }],
        secs: [LL(x.hist) && { h: LuxIntro.head('hist', LANG), html: [LL(x.hist), LL(x.trivia)].filter(Boolean) }].filter(Boolean) });
    });
    $('#btnLessonStart').classList.add('hidden');
    showLessonView('lessonIntroView'); showOverlay('#lessonOverlay'); return;
  }
  $('#liBody').innerHTML = miniSVG(lineSpec(pre), { last: last !== undefined ? last : -1 }) + opIntro(g).map(x => `<p>${x}</p>`).join('') +
    `<div class="op-choice"><button class="lesson-item" data-study="1"><span class="no">📖</span><span class="tx"><b>${t('op.study')}</b><small>${t('op.studyDesc', { n: g.study.line.length })}</small></span></button>` +
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
  lesson = { study: true, gi, g, i: 0, results: [], answered: true, me: g.side };
  document.body.classList.add('in-lesson');
  enterSpecial(null);
  showStudy(false);
}
function showStudy(anim) {
  const L = lesson, g = L.g, st = g.study, i = L.i, N = st.line.length;
  moves = st.line.slice(0, i); cur = i; lessonMarks = []; labelList = null; hintList = null;
  update(anim);
  $('#lsStep').textContent = `${t('op.study')} · ${i}/${N}`;
  $('#lsTitle').textContent = LL(g.title);
  $('#lsDots').innerHTML = `<span class="study-bar"><span style="width:${Math.round(i * 100 / N)}%"></span></span>`;
  let pr, fb = '';
  if (i === 0) { pr = t('op.studyStart'); fb = opIntro(g).join('<br>'); }
  else {
    const side = (i - 1) % 2 ? P2 : P1;
    pr = `<span class="pdisc p${side}"></span><b style="font-size:16px"><bdi>${Math.floor((i - 1) / 2) + 1}${side === P1 ? '.' : '...'} ${mvAt(i - 1)}</bdi></b>`;
    const note = st.notes && st.notes[i - 1]; fb = note ? LL(note) : '';
  }
  if (i === N) fb += (fb ? '<br>' : '') + `<b style="color:var(--brass)">${t('op.studyEnd')}</b>`;
  fb += `<br><button class="op-play" id="lsPlayHere">${t('op.playHere')}</button>`;
  $('#lsPrompt').innerHTML = `<div class="ls-goal">${pr}</div>`; $('#lsFb').innerHTML = fb;
  { const c = $('#lessonCard'); lesson.cardMin = Math.max(lesson.cardMin || 0, c.offsetHeight); c.style.minHeight = lesson.cardMin + 'px'; }
  $('#lsHint').textContent = t('op.prev'); $('#lsHint').disabled = i === 0;
  $('#lsNext').textContent = i === N ? t('op.toPractice') : t('op.next'); $('#lsNext').disabled = false;
  stSync();
}
// ---- opening study: compact step bar (phones) + autoplay (about one move every 1.2 s; any tap / key stops it)
var stTimer = 0;
function stStop() { if (stTimer) { clearInterval(stTimer); stTimer = 0; } stSync(); }
function stTo(to) {
  const N = lesson.g.study.line.length;
  if (to < 0 || to > N || to === lesson.i) return;
  const one = to === lesson.i + 1; lesson.i = to; showStudy(one);
}
function stGo(what) {
  if (!lesson || !lesson.study) return;
  const N = lesson.g.study.line.length;
  if (what === 'auto') {
    if (stTimer) { stStop(); return; }
    if (lesson.i >= N) { lesson.i = 0; showStudy(false); }
    const L0 = lesson;
    stTimer = setInterval(() => { if (lesson !== L0 || !lesson.study || lesson.i >= N) { stStop(); return; } stTo(lesson.i + 1); if (lesson.i >= N) stStop(); }, 1200);
    stSync(); return;
  }
  if (stTimer) stStop();
  stTo(what === 'first' ? 0 : what === 'last' ? N : what === 'prev' ? lesson.i - 1 : lesson.i + 1);
}
function stSync() {
  const on = !!(lesson && lesson.study), nav = document.getElementById('stNav'), au = document.getElementById('lsAuto');
  if (!nav || !au) return;
  document.body.classList.toggle('in-study', on);
  au.classList.toggle('hidden', !on);
  if (!on) { document.body.classList.remove('st-end'); const lc = document.getElementById('lessonCard'); if (lc) lc.style.minHeight = ''; if (stTimer) { clearInterval(stTimer); stTimer = 0; } return; }
  const N = lesson.g.study.line.length, i = lesson.i, q = k => nav.querySelector('[data-sn="' + k + '"]');
  document.body.classList.toggle('st-end', i >= N);
  document.getElementById('stPos').textContent = i + ' / ' + N;
  q('first').disabled = q('prev').disabled = i === 0;
  q('next').disabled = q('last').disabled = i >= N;
  for (const b of [q('auto'), au]) { b.classList.toggle('on', !!stTimer); b.title = t('op.auto'); b.setAttribute('aria-label', t('op.auto')); }
  for (const k of ['first', 'prev', 'next', 'last']) q(k).title = t('nav.' + k);
}
$('#stNav').addEventListener('click', e => { const b = e.target.closest('button[data-sn]'); if (b) stGo(b.dataset.sn); });
$('#lsAuto').onclick = () => stGo('auto');
document.addEventListener('click', e => { if (stTimer && !e.target.closest('[data-sn="auto"],#lsAuto')) stStop(); }, true);
$('#lsFb').addEventListener('click', e => {
  if (!e.target.closest('#lsPlayHere') || !lesson || !lesson.study) return;
  const mv = lesson.g.study.line.slice(0, lesson.i), side = mv.length % 2 === 0 ? P1 : P2;
  savedGame = null; exitSpecial(); setVariant('s8'); drawLines();
  busyToken++; cancelWorker('ai'); cancelWorker('ana');
  Object.assign(settings, { mode: 'ai' }); humanColor = side; rgame = null;
  moves = mv; cur = mv.length; evals = []; reviewing = false; gameOverShown = false;
  update(false); save(); afterPosition();
  toast(t('op.playing'));
});
function startPractice(gi) {
  const g = OPEN.sets[gi], pool = g.problems.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  hideOverlay('#lessonOverlay');
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle');
  lesson = { step: 0, gi, virt: { id: g.id, title: g.title, problems: pool.slice(0, 5) }, i: 0, results: [], answered: false, hinted: false };
  document.body.classList.add('in-lesson');
  loadLessonProblem();
}

// ====================================================================== puzzles: win / win material within N moves (PZBook v2)
let PUZZLES = null;
const puzzlesReady = fetch('puzzles.json?v=1').then(r => r.json()).then(d => { PUZZLES = d; pzProgress(); return d; }).catch(() => null);
let pzLevel = 0;
const pzKey = (id, j) => id + '-' + j;
const starVal = x => x === true ? 3 : (+x || 0);
// v3 (2026-10-28, tools/pzcurate.js): the collection was rebuilt as 10 mixed courses. A record of a v2 slot (old theme ids)
// moves to the slot that now holds the same position (PUZZLES.mig, the best stars kept; "~" = a slot replaced on 2026-10-21,
// moved only when this device had played the new puzzle there). All v2 records are kept aside in PZ_STORE-v2. Runs again
// whenever v2 keys show up (a cloud merge with a device that synced before the update).
const PZ_V2_KEY = /^$^/;
function pzMigrate(pr) {
  let M = null; try { M = PUZZLES && PUZZLES.mig; } catch (e) { return pr; }
  if (!M) return pr;
  const olds = Object.keys(pr).filter(k => PZ_V2_KEY.test(k));
  if (!olds.length) return pr;
  let frozen = null, bak = {};
  try { frozen = JSON.parse(localStorage.getItem(STORE + '-pz-old-2026-10-21') || 'null'); } catch (e) {}
  try { bak = JSON.parse(localStorage.getItem(PZ_STORE + '-v2') || '{}') || {}; } catch (e) {}
  for (const k of olds) {
    const v = starVal(pr[k]); delete pr[k];
    bak[k] = Math.max(v, starVal(bak[k]));
    let to = M[k]; if (!to || !v) continue;
    if (to[0] === '~') { if (!Array.isArray(frozen) || frozen.includes(k)) continue; to = to.slice(1); }
    if (v > starVal(pr[to])) pr[to] = v;
  }
  pr._v = 3;
  try { localStorage.setItem(PZ_STORE, JSON.stringify(pr)); localStorage.setItem(PZ_STORE + '-v2', JSON.stringify(bak)); } catch (e) {}
  return pr;
}
// puzzles replaced on 2026-11-04 (tools/audit_puzzles.js: the material won was lost right back): PUZZLES.old["id-j"] keeps
// the previous puzzle of the slot (as chess/ since 2026-10-21). A player who already has a record for the slot keeps the
// old puzzle; records of the new one go to "id-j~2". The daily puzzle keeps the old one for dates up to PUZZLES.cut.
function pzSlot(T, j, pr, date) {
  const k = pzKey(T.id, j), o = PUZZLES.old && PUZZLES.old[k];
  if (!o) return { P: T.puzzles[j], rk: k };
  pr = pr || pzProgress();
  return pr[k] != null || (date && date <= PUZZLES.cut) ? { P: o, rk: k } : { P: T.puzzles[j], rk: k + '~2' };
}
const pzAt = (T, j, date, pr) => pzSlot(T, j, pr, date).P;
function pzRecs(T, pr) { pr = pr || pzProgress(); return T.puzzles.map((_, j) => starVal(pr[pzSlot(T, j, pr).rk])); }
function themeTier(T) { const n = T.puzzles.reduce((a, P) => a + (P.n || 1), 0) / Math.max(1, T.puzzles.length); return Math.max(0, Math.min(5, Math.round((n - 1) * 1.2))); }
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
// collection home (the layout of 詰めオセロ, PZBook.home): hero → daily → tabs 勝ち / ショット / 終盤 → theme cards with the position
const PZ_LAST = STORE + '-pz-last', PZ_TAB = STORE + '-pz-tab', PZ_GRPS = ['Win', 'Tac'], PZ_GIC = { Win: 'crown', Tac: 'bolt' };
const PZ_TSVG = {   // theme badges (w1..w4 show their number)
  send: '<path d="M4 18Q12 4 20 6"/><path d="M17 4l3 2-2 3"/>',
  free: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>',
};
const pzBadge = T => PZ_TSVG[T.id] ? `<svg viewBox="0 0 24 24" aria-hidden="true">${PZ_TSVG[T.id]}</svg>` : `<b class="gl">${(T.id.match(/\d+$/) || [''])[0]}</b>`;
function pzThumbOf(T, j, date) { if (j < 0) j = T.puzzles.length - 1; const P = pzAt(T, j, date); return P && P.s ? { board: pzThumbSVG(T, j, P), tm: `<span class="pdisc p${P.s.side === P2 ? 2 : 1}"></span>` } : { board: '' }; }
async function openPuzzles() {
  const d = await puzzlesReady; selTab('puzzle');
  if (!d) { toast(t('ls.fail')); return; }
  PZBook.setLang(LANG);
  const pr = pzProgress(), dl = dailyPick(), di = dailyInfo(), Ts = PUZZLES.themes, idx = Ts.map((_, i) => i);
  const cats = PZ_GRPS.filter(g => Ts.some(T => T.grp === g));
  let cur = ''; try { cur = localStorage.getItem(PZ_TAB) || ''; } catch (e) {} if (!cats.includes(cur)) cur = cats[0];
  const cont = PZBook.resume(idx.map(i => ({ key: String(i), recs: pzRecs(Ts[i], pr), cat: Ts[i].grp })), PZ_LAST);
  const box = $('#pzLevels');
  box.innerHTML = PZBook.home({
    title: t('pz.title'), lead: t('pz.desc'), all: idx.map(i => pzRecs(Ts[i], pr)),
    cont: cont && { key: cont.key + ':' + cont.j, no: cont.j + 1, name: t('pz.th.' + Ts[+cont.key].id) },
    daily: dl ? [{ key: '1', board: pzThumbOf(Ts[dl.L], dl.j, dl.date).board, title: '★ ' + t('daily.title'), date: dl.date.slice(5).replace('-', '/'), done: di.today, go: t('daily.go'),
      sub: `${t('pz.th.' + Ts[dl.L].id)} · 🔥 ${t('daily.streak', { n: di.streak })}${di.best > 1 ? ' · ' + t('daily.best', { n: di.best }) : ''}` }] : [],
    cats: cats.map(g => { const r = idx.filter(i => Ts[i].grp === g).map(i => pzRecs(Ts[i], pr)).flat(); return { key: g, icon: PZBook.icon(PZ_GIC[g]), name: t('pz.grp' + g), done: r.filter(x => x > 0).length, total: r.length }; }),
    cur, catDesc: t('pz.grp' + cur + 'Sub'),
    cards: idx.filter(i => Ts[i].grp === cur).map(i => { const T = Ts[i], r = pzRecs(T, pr); return Object.assign({ key: i, badge: pzBadge(T), name: t('pz.th.' + T.id), desc: t('pz.th.' + T.id + '.sub'), recs: r, tier: themeTier(T) }, pzThumbOf(T, PZBook.nextIndex(r))); }),
  });
  PZBook.bindHome(box, {
    cat: k => { try { localStorage.setItem(PZ_TAB, k); } catch (e) {} openPuzzles(); },
    cont: x => { const [i, j] = x.split(':'); startPuzzle(+i, +j); },
    daily: () => { const dl = dailyPick(); if (dl) startPuzzle(dl.L, dl.j, dl.date); },
    card: i => openPzGrid(+i),
  });
  showPzView('pzListView'); showOverlay('#puzzleOverlay');
}
function openPzGrid(i, cur) {
  pzLevel = i; const L = PUZZLES.themes[i];
  PZBook.setLang(LANG);
  $('#pzLevelHead').innerHTML = PZBook.ghead({ badge: pzBadge(L), name: t('pz.th.' + L.id), desc: t('pz.th.' + L.id + '.sub'), chips: [t('pz.grp' + L.grp), PZBook.t('count', { n: L.puzzles.length })], tier: themeTier(L) });
  $('#pzGrid').innerHTML = PZBook.grid({ recs: pzRecs(L), cur });
  $('#pzGrid').querySelectorAll('.pb-tile[data-j]').forEach(el => { const P = pzAt(L, +el.dataset.j); if (P && P.s) el.insertAdjacentHTML('afterbegin', `<span class="th">${pzThumbSVG(L, +el.dataset.j, P)}</span>`); });
  showPzView('pzGridView'); showOverlay('#puzzleOverlay');
}
$('#pzGrid').onclick = e => {
  const b = e.target.closest('button[data-j]'); if (!b) return;
  if (b.getAttribute('aria-disabled')) { toast(PZBook.t('locked')); return; }
  startPuzzle(pzLevel, +b.dataset.j);
};
$('#pzBack').onclick = () => openPuzzles();
$('#pzClose').onclick = () => hideOverlay('#puzzleOverlay');
// "win in N" puzzles: the side to move forces a win within N of its moves, and the opponent defends (it replies with its
// most stubborn move, worked out by the engine's exact solver — duelGood / duelReply in engine.js). Positions come from
// real games (tools/gen_duel.js), with the 40 / 80-move rules and Black's last move in force; every puzzle has one (rarely
// two) winning first moves, and the obvious move (the biggest step towards the corner) does not win.
function startPuzzle(L, j, daily) {
  hideOverlay('#puzzleOverlay');
  stashGame(); lesson = null; document.body.classList.remove('in-lesson');
  const T = PUZZLES.themes[L], { P, rk } = pzSlot(T, j, null, daily);
  if (!daily) PZBook.lastSet(PZ_LAST, L);
  PZBook.setLang(LANG);
  const me = P.s.side === P2 ? P2 : P1;
  puzzle = { L, j, P, rk, T, goal: 'win', g: 0, me, n: P.n, state: 'play', busy: false, used: 0, daily: daily || null, hinted: false, failed: false, answered: false };
  document.body.classList.add('in-puzzle');
  enterSpecial(Object.assign({}, P.s));
  update(false); renderPuzzleCard(); pzStatus(t('pz.start'));
}
function renderPuzzleCard() {
  const Pz = puzzle, L = Pz.T;
  $('#pzStep').textContent = Pz.daily ? `★ ${t('daily.title')} · ${Pz.daily.slice(5).replace('-', '/')}` : `${t('pz.th.' + L.id)} · ${PZBook.t('stage', { n: Math.floor(Pz.j / PZBook.STAGE) + 1 })} · No.${Pz.j + 1}`;
  $('#pzTitle').textContent = t('pz.winIn', { n: Pz.n });
  $('#pzGoal').innerHTML = `<span class="pdisc p${Pz.me}"></span><span>${t('pz.goal', { c: pname(Pz.me), n: Pz.n })}</span>`;
  $('#pzDots').innerHTML = Array.from({ length: Pz.n }, (_, i) => `<i class="${i < Pz.used ? 'ok' : ''} ${i === Pz.used && Pz.state === 'play' ? 'cur' : ''}"></i>`).join('');
  $('#pzNext').disabled = !!Pz.daily || Pz.j + 1 >= L.puzzles.length || !PZBook.isOpen(pzRecs(L), Pz.j + 1);
  $('#pzHint').disabled = Pz.state !== 'play'; $('#pzAnswer').disabled = Pz.busy;
  renderInfo();
}
function pzStatus(html) { $('#pzStatus').innerHTML = html; }
// the moves of the puzzle side that still force a win within n of its moves from the shown position
function mateReq(n) { return request('ai', { type: 'duel', moves: moves.slice(0, cur), n }).then(r => r && r.list ? r.list.map(e => e.m) : null); }
function replyReq(n) { return request('ai', { type: 'duelReply', moves: moves.slice(0, cur), n }).then(r => r && r.move != null ? r.move : null); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pzWon = Pz => { const st = statusAt(cur); return st.over && st.winner === Pz.me; };
function playMove2(m) { moves = moves.slice(0, cur); moves.push(m); cur = moves.length; hintList = null; update(true); }
// the opponent answers (its most stubborn reply); true when the puzzle is solved by then
async function pzOpponent(Pz, tok) {
  if (pzWon(Pz)) return true;
  const st = statusAt(cur); if (st.over) return false;
  const r = await replyReq(Pz.n - Pz.used);
  if (r == null || puzzle !== Pz || tok !== busyToken) return false;
  const before = posAt(cur).pos.clone();
  await sleep(380); if (puzzle !== Pz || tok !== busyToken) return false;
  playMove2(r); Pz.lastReply = mvIn(before, r);
  await sleep(moveDur(r, before) + 120);
  return pzWon(Pz);
}
async function puzzleMove(m) {
  const Pz = puzzle; Pz.busy = true; lessonMarks = [];
  const left = Pz.n - Pz.used, tok = busyToken;
  pzStatus(t('pz.checking'));
  const good = await mateReq(left);
  if (!good || puzzle !== Pz || tok !== busyToken) return;
  const before = posAt(cur).pos.clone(), dm = moveDur(m, before);
  playMove2(m); Pz.used++; renderPuzzleCard();
  if (!good.includes(m)) {
    // the 詰め rule (claude/game-conventions-addendum.md, 2026-11-11): a move off the solution is played on, not taken back, and the right
    // move is not shown by itself. The last move: the opponent's stones that can still jump (red); before it: the defender's most
    // stubborn reply (duelReply, the same as the 3D) and what it did on the board (pzWhy; tools/lesson-verify-konane.js ⑦⑧⑨)
    Pz.failed = true;
    await sleep(dm + 120);
    if (puzzle !== Pz || tok !== busyToken) return;
    const mid = posAt(cur).pos.clone();
    if (left <= 1) { lessonMarks = []; return pzFail(Pz, pzWhy(Pz, { last: true, mid, m: mvIn(before, m) })); }
    const r = await replyReq(left - 1);
    if (r == null || puzzle !== Pz || tok !== busyToken) return;
    await sleep(380); if (puzzle !== Pz || tok !== busyToken) return;
    playMove2(r); await sleep(moveDur(r, mid) + 120); if (puzzle !== Pz) return;
    lessonMarks = [{ at: r, cls: 'ng' }];
    return pzFail(Pz, pzWhy(Pz, { mid, after: posAt(cur).pos, reply: r, left: left - 1 }));
  }
  await sleep(dm + 60);
  if (puzzle !== Pz || tok !== busyToken) return;
  if (pzWon(Pz) || await pzOpponent(Pz, tok)) { if (puzzle === Pz) puzzleSolved(); return; }
  if (puzzle !== Pz || tok !== busyToken) return;
  Pz.busy = false; renderPuzzleCard(); boardEl.classList.toggle('can', canHumanPlay());
  pzStatus(t('pz.reply', { m: Pz.lastReply || '', n: Pz.n - Pz.used }));
}
// the board's facts after a move off the solution (as atlas/games/konane-pz.js why): last = the opponent's jumps still left after the last
// move; stuck = the reply left the player without a jump; far = the jumps the opponent still has, the moves left; k = the stones it took
// the board's facts after a move off the solution: last = the last move did not make three in a row on the big board; otherwise the
// defender's most stubborn reply r (what it did: won a small board / gave the solver a forced board) and the moves left
function pzWhy(Pz, o) {
  const bn = t('bname');
  if (o.last) return t('pz.why.last', { m: o.m });
  const took = !o.mid.own[mB(o.reply)] && o.after.own[mB(o.reply)] === 3 - Pz.me;
  const v = { r: mvIn(null, o.reply), b: bn[mB(o.reply)], t: o.after.forced >= 0 ? bn[o.after.forced] : t('ls.anywhere'), n: o.left, c: pname(Pz.me) };
  return t(took ? 'pz.why.took' : 'pz.why.far', v);
}
function pzFail(Pz, why) {
  Pz.state = 'fail'; Pz.busy = false; update(false); playChime(false); renderPuzzleCard();
  pzStatus(`${why} ${t('pz.why.answer')}`);
}
function puzzleSolved() {
  const Pz = puzzle; if (!Pz) return;
  Pz.state = 'solved'; Pz.busy = false;
  const pr = pzProgress(), k = Pz.rk || pzKey(Pz.T.id, Pz.j), stars = PZBook.starsFor(Pz);
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
$('#pzNext').onclick = () => {
  if (!puzzle) return;
  const { L, j, T } = puzzle;
  if (j + 1 < T.puzzles.length && PZBook.isOpen(pzRecs(T), j + 1)) startPuzzle(L, j + 1);
};
$('#pzList').onclick = () => { if (!puzzle) return; if (puzzle.daily) openPuzzles(); else openPzGrid(puzzle.L, puzzle.j); };
$('#pzQuit').onclick = () => quitSpecial();
// hints: 1) the idea of the theme, 2) the pieces that can start a solution, 3) the move
$('#pzHint').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.state !== 'play' || Pz.busy) return;
  const left = Pz.n - Pz.used, good = await mateReq(left); if (puzzle !== Pz || !good) return;
  Pz.hinted = true; Pz.hl = Math.min(3, (Pz.hl || 0) + 1);
  lessonMarks = [];
  if (Pz.hl === 1) pzStatus(t('pz.hint1', { n: left }));
  else if (Pz.hl === 2) { for (const b of new Set(good.map(mB))) lessonMarks.push({ zone: b, cls: 'hl' }); pzStatus(t('pz.hintText')); }
  else { markMove(posAt(cur).pos, good[0], 'ok'); pzStatus(t('pz.best', { b: mvIn(posAt(cur).pos, good[0]) })); }
  renderFx();
};
$('#pzAnswer').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.busy) return;
  Pz.busy = true; Pz.state = 'answer'; Pz.hinted = true; Pz.answered = true; lessonMarks = []; hintList = null;
  moves = []; cur = 0; Pz.used = 0; update(false); renderPuzzleCard();
  pzStatus(t('pz.showing'));
  const tok = busyToken;
  for (let step = 0; step < 8; step++) {
    if (puzzle !== Pz) return;
    const pos = posAt(cur).pos;
    const good = await mateReq(Pz.n - Pz.used); if (puzzle !== Pz || !good || !good.length) break;
    await sleep(650); if (puzzle !== Pz) return;
    playMove2(good[0]); Pz.used++;
    renderPuzzleCard();
    await sleep(moveDur(good[0], pos));
    if (pzWon(Pz) || await pzOpponent(Pz, tok)) break;
    if (puzzle !== Pz || statusAt(cur).over) break;
  }
  Pz.busy = false; renderPuzzleCard(); pzStatus(t('pz.answerDone'));
};

// ====================================================================== post-game review
const RV_WORKERS = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
let rv = null;        // { key, list: [], done, total, running, ws }
let rvOpen = false;
const gameKey = () => keyOf(moves.length);
function rvCancel() {
  if (rv && rv.ws) { rv.ws.forEach(w => { w.terminate(); w.jobs.forEach(j => j.resolve(null)); }); rv.ws = null; }
  if (rv && rv.running) rv = null;
}
async function runReview() {
  if (lesson || puzzle) return;
  if (moves.length < 1) { toast(t('nokifu')); return; }
  if (rv && rv.key === gameKey() && (rv.running || rv.done === rv.total)) { rvOpen = true; renderReview(); revealReview(); return; }
  rvCancel();
  const game = moves.slice(), key = gameKey(), st0 = startSpec;
  const run = rv = { key, list: [], done: 0, total: game.length, running: true, ws: [] };
  for (let k = 0; k < RV_WORKERS; k++) run.ws.push(makeWorker());
  rvOpen = true; renderReview(); revealReview();
  let next = 0;
  const loop = async w => {
    while (next < game.length && rv === run) {
      const i = next++, pk = startKey() + '|' + game.slice(0, i).join(',');
      let list = anaCache.get(pk);
      if (!list) {
        const res = await new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve }); w.postMessage({ type: 'analyze', start: st0, rule: gv, moves: game.slice(0, i), time: i < 10 ? 500 : 800, id }); });
        if (rv !== run || !res) return;
        list = res.list; anaCache.set(pk, list);
      }
      run.list[i] = list;
      if (gameKey() === key && (!evals[i] || evals[i].kind === 'heur')) { const ev = evalFromList(list, toMoveAt(i)); if (ev) evals[i] = ev; }
      run.done++; renderReview(); renderGraph(); renderKifu();
    }
  };
  await Promise.all(run.ws.map(loop));
  if (rv !== run) return;
  run.ws.forEach(w => w.terminate()); run.ws = null; run.running = false;
  if (gameKey() === key) save();
  renderInfo(); renderFx(); toast(t('rv.done'), 1200);
}
function revealReview() {
  if (getComputedStyle($('.app > .side')).display === 'contents') setTimeout(() => $('#reviewCard').scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
}
// judgement of move i+1 (played from position i)
function rvJudge(i) {
  if (!rv || rv.key !== gameKey()) return null;
  const L = rv.list[i]; if (!L || !L.length) return null;
  const m = moves[i], mine = L.find(e => e.m === m); if (!mine) return null;
  let best = L[0]; for (const e of L) if (e.v > best.v) best = e;
  const loss = sOfV(best.v) - sOfV(mine.v);
  let q = null, desc = '';
  const word = v => t(v > WINT - 1000 ? 'rv.win' : v < -(WINT - 1000) ? 'rv.loss' : 'rv.even');
  if ((best.v > WINT - 1000 && mine.v <= WINT - 1000) || (best.v >= -(WINT - 1000) && mine.v < -(WINT - 1000))) { q = 'bad'; desc = `${word(best.v)}→${word(mine.v)}`; }
  else if (loss >= 0.3) { q = 'bad'; desc = t('rv.eval', { l: ((best.v - mine.v) / 100).toFixed(1) }); }
  else if (loss >= 0.12) { q = 'dubious'; desc = t('rv.eval', { l: ((best.v - mine.v) / 100).toFixed(1) }); }
  const ok = !q && mine.v >= best.v - 10;
  return { q, ok, desc, best: best.m, m, loss };
}
// 振り返り解説 (in this game's terms, every reason a board fact — ls-facts.js after(): what the opponent can do at once after the move):
// the game won / a small board won / missed, a board given away, a free choice given, a threat not blocked
const crName = (pos, x) => '<bdi>' + mvIn(pos, x) + '</bdi>';
function crExplain(i, j) {   // { kind, txt } for move i (played from position i)
  const pos = posAt(i).pos, m = j.m, b = j.best, me = pos.turn, bn = t('bname'), FX = window.UtttLsFacts;
  if (pos.moves().length === 1) return { kind: '', txt: t('cr.forced') };
  if (i === 0 && !startSpec) return { kind: '', txt: t(j.ok ? 'cr.firstOk' : 'cr.first', { b: crName(pos, b) }) };
  const am = pos.clone().play(m), ab = pos.clone().play(b);
  const tookM = !pos.own[mB(m)] && am.own[mB(m)] === me, tookB = !pos.own[mB(b)] && ab.own[mB(b)] === me;
  if (!j.q) {
    if (am.res === me) return { kind: '', txt: t('cr.won') };
    if (j.ok) return tookM ? { kind: 'take', txt: t('cr.bestTake', { t: bn[mB(m)] }) } : { kind: '', txt: t('cr.best') };
    return { kind: '', txt: t('cr.good', { b: crName(pos, b) }) };
  }
  const fm = FX.after(E, pos, m), fb = FX.after(E, pos, b);
  const v = { b: crName(pos, b), r: fm.r != null ? '<bdi>' + mvIn(null, fm.r) + '</bdi>' : '', tb: fm.tb != null ? bn[fm.tb] : '', t: fm.t >= 0 ? bn[fm.t] : '' };
  if (ab.res === me) return { kind: 'take', txt: t('cr.missWin', v) };
  if (fm.k === 'lose' && fb.k !== 'lose') return { kind: 'send', txt: t('cr.allowWin', v) };
  if (fm.k === 'take' && fb.k !== 'take' && fb.k !== 'lose') return { kind: 'send', txt: t('cr.gift', v) };
  if (fm.k === 'free' && fb.k !== 'free') return { kind: 'free', txt: t('cr.free', v) };
  if (tookB && !tookM) return { kind: 'take', txt: t('cr.missTake', Object.assign(v, { tb: bn[mB(b)] })) };
  if (tookM && !tookB) return { kind: 'look', txt: t('cr.tookBad', v) };
  return { kind: 'gen', txt: t('cr.gen', { d: j.desc, b: crName(pos, b) }) };
}
function rvCoach() {
  let h = `<div class="cr-box"><div class="cr-h">${t('cr.title')}</div>`;
  if (cur < moves.length) {   // one move
    const i = cur, j = rvJudge(i), who = toMoveAt(i);
    h += `<p class="cr-mv"><b>${t('cr.move', { n: i + 1, who: sideLabel(who), m: '<bdi>' + mvAt(i) + '</bdi>' })}</b>${j && j.q ? ` <span class="tag ${j.q}">${t('q.' + j.q)}</span>` : j && j.ok ? ` <span class="tag best">${t('q.best')}</span>` : ''}</p>`;
    if (!j) return h + `<p>${t('cr.noData')}</p></div>`;
    const x = crExplain(i, j);
    h += `<p>${x.txt}</p>`;
    if (x.kind) h += `<p class="cr-tip">${t('cr.tip.' + x.kind)}</p>`;
    return h + `<p class="cr-more">${t('cr.nav')}</p></div>`;
  }
  const sides = settings.mode === 'ai' ? [humanColor] : [P1, P2], all = [];
  const st = {}; sides.forEach(p => (st[p] = { n: 0, ok: 0, bad: 0, dubious: 0 }));
  for (let i = 0; i < moves.length; i++) {
    const who = toMoveAt(i); if (!st[who]) continue;
    const j = rvJudge(i); if (!j) continue;
    const x = st[who]; x.n++; if (j.ok) x.ok++; if (j.q) { x[j.q]++; all.push({ i, who, ...j }); }
  }
  for (const p of sides) { const x = st[p]; h += `<p>${t('cr.sum', { who: sideLabel(p), p: x.n ? Math.round(x.ok / x.n * 100) : 0, b: x.bad, d: x.dubious })}</p>`; }
  if (!all.length) h += `<p>${t('cr.clean')}</p>`;
  else {
    const top = all.slice().sort((a, b) => b.loss - a.loss)[0];
    h += `<p class="cr-mv"><span class="cr-turn">${t('cr.turn')}</span> <b>${t('cr.move', { n: top.i + 1, who: sideLabel(top.who), m: '<bdi>' + mvAt(top.i) + '</bdi>' })}</b> <span class="tag ${top.q}">${t('q.' + top.q)}</span> <button class="cr-see" data-i="${top.i}">${t('cr.see')}</button></p>`;
  }
  return h + `<p class="cr-more">${t('cr.nav')}</p></div>`;
}
function sideLabel(p) { return settings.mode === 'ai' ? (p === humanColor ? t('you') : AIW()) : pname(p); }
function renderReview() {
  if (kenSw) return;
  const card = $('#reviewCard');
  if (rv && !lesson && !puzzle && rv.key !== gameKey()) { rvCancel(); rv = null; rvOpen = false; }
  const show = !lesson && !puzzle && rvOpen && rv;
  card.classList.toggle('show', !!show);
  document.body.classList.toggle('rv-on', !!show);
  if (!show) { rvbUpdate(); return; }
  let html;
  if (rv.running) {
    html = `<div style="font-size:12px;color:var(--muted)">${t('rv.running', { a: rv.done, b: rv.total })}</div><div class="rv-prog"><i style="width:${rv.total ? rv.done / rv.total * 100 : 0}%"></i></div>`;
  } else {
    const list = [];
    for (let i = 0; i < moves.length; i++) { const j = rvJudge(i); if (j && j.q) list.push({ i, ...j }); }
    html = rvbWant() ? '' : rvCoach();
    const shown = list.length > 10 ? list.slice().sort((a, b) => (b.q === 'bad') - (a.q === 'bad') || b.loss - a.loss).slice(0, 10).sort((a, b) => a.i - b.i) : list;
    if (shown.length) html += `<div class="rv-list">${shown.map(x => `<button data-i="${x.i}" class="${cur === x.i ? 'cur' : ''}"><span class="tag ${x.q}">${t('q.' + x.q)}</span><span class="mv">${x.i + 1}. <i class="p${toMoveAt(x.i)}"></i>${mvAt(x.i)} → ${mvIn(posAt(x.i).pos, x.best)}</span><span class="ls">${x.desc}</span></button>`).join('')}</div>`;
    else html += `<div class="rv-note" style="color:#8fe3b8">${t('rv.clean')}</div>`;
    html += `<div class="rv-note" style="color:var(--dim);font-size:11px;line-height:1.6">${t('rv.note')}</div>`;
  }
  const keepTop = card.scrollTop;
  $('#rvBody').innerHTML = html;
  { const cb = $('#rvBody > .cr-box'); if (cb) card.style.setProperty('--rvh', Math.round(cb.getBoundingClientRect().bottom - card.getBoundingClientRect().top + card.scrollTop + 14) + 'px'); else card.style.removeProperty('--rvh'); card.scrollTop = keepTop; }
  rvbUpdate();
}
// on the board: the analysis of the viewed position, the move actually played and the best move
function drawReviewFx(svg) {
  if (lesson || puzzle || !rvOpen || !rv || rv.running || rv.key !== gameKey() || cur >= moves.length || sel) return false;
  const L = rv.list[cur]; if (!L) return false;
  drawHints(L, svg);
  const j = rvJudge(cur), m = moves[cur];
  fxDiv('mark played' + (j && j.q ? ' ' + j.q : ''), m);
  svgArrow(svg, m, 'pl');
  return true;
}
$('#rvBody').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
$('#rvClose').onclick = () => { rvOpen = false; if (rv && rv.running) rvCancel(); renderReview(); renderFx(); renderKifu(); };
$('#btnAnalyze').onclick = () => runReview();
$('#btnResAnalyze').onclick = () => { hideOverlay('#resultOverlay'); runReview(); };

// ====================================================================== PC review box (振り返りボックス: 解説 + 候補手と読み筋 + 検討モード)
// Under the board and the info column while a reviewed game is shown on a PC (rvbox.js). 検討: from the position on the board
// both sides' moves can be tried; the record, the graph and the review stay those of the game. While exploring, the board
// functions run with the explored line swapped in for the record (kenSwap), so the game itself is never touched.
const kenMoves = () => moves.slice(0, ken.base).concat(ken.line);
function kenOk() { return !!(ken && ken.gk === gameKey() && rvOpen && rv && !lesson && !puzzle && BOX && BOX.pc()); }
function kenSwap(fn) {
  if (!ken || kenSw) return fn();
  const sm = moves, sc = cur, sr = reviewing, sh = hintList;
  moves = kenMoves(); cur = moves.length; reviewing = false; hintList = null; kenSw = true;
  try { return fn(); } finally { kenSw = false; moves = sm; cur = sc; reviewing = sr; hintList = sh; }
}
const rvbPath = (p, m) => [m];
function kenStart(first) {
  if (ken || !rvbWant()) return;
  stopPlay(); busyToken++; cancelWorker('ai'); thinking = 0; animating = false; sel = null;
  ken = { base: cur, line: [], gk: gameKey(), dirty: false };
  rvbHov = null; if (BOX) BOX.clearHover();
  if (first !== undefined && posAt(cur).pos.moves().includes(first)) { ken.before = posAt(cur).pos; ken.line.push(first); ken.dirty = true; kenFlush(); }
  else update(false);
}
function kenFlush() {
  if (!ken || !ken.dirty) return;
  ken.dirty = false; rvbHov = null;
  const m = ken.line[ken.line.length - 1], d = moveDur(m, ken.before);
  animating = animOn(); setTimeout(() => { animating = false; renderFx(); boardEl.classList.toggle('can', canHumanPlay()); }, d);
  update(true);
}
function kenStop() { if (!ken) return; ken = null; rvbHov = null; sel = null; animating = false; if (BOX) BOX.clearHover(); }
function kenBack() { if (!ken || !ken.line.length) return; ken.line.pop(); rvbHov = null; sel = null; animating = false; update(false); }
function kenReset() { if (!ken) return; kenStop(); update(false); afterPosition(); }
function kenPick(e) {
  if (!ken) { kenStart(e.m); return; }
  kenSwap(() => { if (canHumanPlay() && posAt(cur).pos.moves().includes(e.m)) { sel = null; ken.before = posAt(cur).pos; ken.line.push(e.m); ken.dirty = true; } });
  kenFlush();
}
function rvbWant() { return !!(BOX && BOX.pc() && rvOpen && rv && rv.key === gameKey() && !lesson && !puzzle && !rtLive() && settings.mode !== 'online' && !(window.olLive && olLive())); }
function rvbFx(svg, pos) {
  if (!rvbHov || !BOX || !BOX.shown || rvbHov.k !== keyOf(cur) || sel) return;
  const e = rvbHov.e;
  if (!pos.moves().includes(e.m)) return;
  svgArrow(svg, rvbPath(pos, e.m), 'rvb1');
  let p = pos.clone().play(e.m);
  (e.pv || []).slice(0, 3).forEach((m, k) => { if (!p.moves().includes(m)) return; const d = fxDiv('rvb-n', m); d.textContent = String(k + 2); p = p.clone().play(m); });
  const d0 = fxDiv('rvb-n first', e.m); d0.textContent = '1';
}
const rvbDot = p => p === P1 ? '<svg class="rvb-mk" viewBox="0 0 12 12" width="12" height="12" style="vertical-align:-1px;margin-inline-end:5px"><path d="M2.5 2.5 9.5 9.5M9.5 2.5 2.5 9.5" stroke="#d65a45" stroke-width="2.4" stroke-linecap="round"/></svg>' : '<svg class="rvb-mk" viewBox="0 0 12 12" width="12" height="12" style="vertical-align:-1px;margin-inline-end:5px"><circle cx="6" cy="6" r="3.9" fill="none" stroke="#e9e2d2" stroke-width="2"/></svg>';
function rvbLine(pos, list, n0) { let p = pos.clone(), out = []; for (const m of list) { if (!p.moves().includes(m)) break; out.push((n0 ? (n0 + out.length) + '.' : '') + mvIn(p, m)); p = p.clone().play(m); } return out.join(' '); }
function rvbLeft() {
  if (rv.running) return `<p class="rvb-dim">${BOX.t('analyzing', { a: rv.done, b: rv.total })}</p>`;
  let h = rvCoach().replace(/class="cr-see" data-i=/g, 'class="cr-see rvb-see" data-goto=');
  if (cur >= moves.length) { const st = statusAt(moves.length); h = `<div class="rvb-h">${st.over ? (st.winner ? t('res.pWin', { c: pname(st.winner) }) : t('res.draw')) + ' · ' : BOX.t('now') + ' · '}${t('info.moves', { n: moves.length })}</div>` + h; }
  return h;
}
function rvbKenLeft(key) {
  const L = BOX.cached(key), { pos } = posAt(cur), ev = L && L.length ? evalFromList(L, pos.turn) : null, st = statusAt(cur);
  let h = `<div class="rvb-h">${BOX.t('kenFrom', { n: ken.base + 1 })}</div>`;
  h += `<p>${BOX.t('kenEval')}: <b>${st.over ? (st.winner ? t('res.pWin', { c: pname(st.winner) }) : t('res.draw')) : ev ? evalText(ev) : '…'}</b></p>`;
  h += `<p class="rvb-dim">${BOX.t('kenLine')}: <span class="rvb-kl"><bdi>${ken.line.length ? rvbLine(posAt(ken.base).pos, ken.line, ken.base + 1) : BOX.t('kenNone')}</bdi></span></p>`;
  h += `<p class="rvb-dim">${BOX.t('kenHelp')}</p>`;
  return h;
}
function rvbUpdate() {
  if (!BOX || kenSw) return;
  if (!rvbWant()) { if (ken) { kenStop(); setTimeout(() => update(false), 0); } BOX.update(null); return; }
  kenSwap(() => {
    const { pos } = posAt(cur), key = keyOf(cur), me = pos.turn, over = statusAt(cur).over, at = cur;
    const playedM = !ken && cur < moves.length ? moves[cur] : -1;
    BOX.update({
      key, over, k: 5,
      req: { start: startSpec, rule: gv, moves: moves.slice(0, cur), time: 1200, k: 5, plies: 7 },
      seed: !ken && rv.list[at] ? rv.list[at] : null,
      sub: over ? '' : t('hb.turn', { c: pname(me) }),
      left: ken ? () => kenSwap(() => rvbKenLeft(key)) : () => rvbLeft(),
      ken: ken ? { from: ken.base + 1, canBack: ken.line.length > 0 } : null,
      fmt: e => { const lb = valLabel(e.v); return { mv: rvbDot(me) + '<bdi>' + mvIn(pos, e.m) + '</bdi>', val: lb.big, small: lb.small, cls: /loss/.test(lb.cls) ? 'loss' : /win/.test(lb.cls) ? 'win' : /neg/.test(lb.cls) ? 'neg' : '', pv: e.pv ? rvbLine(pos.clone().play(e.m), e.pv) : '', played: e.m === playedM }; }
    });
  });
}
if (window.RvBox) BOX = RvBox.create({
  app: '.app', frame: '#frame', lang: () => LANG, worker: () => ENGINE_URL,
  // (2026-11-20 #2929/#2938) the analysis's threads, as in the other games (chess, checkers…: the threads when free, else the one worker):
  //  on an isolated page core_mt.wasm's (Praline's YBW) — never mtsplit.js's old search beside them —, on a page that is not isolated
  //  mtsplit.js's (not with the net: the one worker of v3 + the net)
  pool: () => null, cancel: () => {},
  onHover: e => { rvbHov = e ? { e, k: kenSwap(() => keyOf(cur)) } : null; renderFx(); },
  onPick: e => kenPick(e), onKen: () => kenStart(), onBack: () => kenBack(), onReset: () => kenReset(),
  onGoto: i => viewAt(i), onLayout: () => { renderInfo(); renderFx(); }
});

// ====================================================================== share / load
// 1 character per move (the cell number + 48), base64url
function encMoves(list) {
  let s = ''; for (const m of list) s += String.fromCharCode(48 + m);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decMoves(s, start) {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  let raw; try { raw = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); } catch (e) { return null; }
  const pos = E.Pos.from(start || null), out = [];
  for (let i = 0; i < raw.length; i++) { const m = raw.charCodeAt(i) - 48; if (!pos.moves().includes(m)) return null; out.push(m); pos.play(m); }
  return out;
}
// "1. d4 e4 2. f4-d4 c4-e4 ..." or a share URL (#r=<rule>&k=<moves>)
function parseGameText(v) {
  v = (v || '').trim();
  const h = v.match(/#(.*)$/);
  if (h) { const q = new URLSearchParams(h[1]); if (!q.has('k')) return null; const rl = q.get('r'); if (rl && (E.RULES[rl] || /^r[01]{3}$/.test(rl))) { setVariant(rl); } const list = decMoves(q.get('k') || ''); if (!list) return null; return { list, n: q.has('n') ? parseInt(q.get('n'), 10) : undefined }; }
  const rm = v.match(/\[Variant\s+"(\w+)"\]/); if (rm && (E.RULES[rm[1]] || /^r[01]{3}$/.test(rm[1]))) { setVariant(rm[1]); }
  v = v.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/(^|\s)(\*|1-0|0-1|1\/2-1\/2)(?=\s|$)/g, ' ');
  const toks = v.split(/[\s,;]+/).filter(Boolean);
  if (!toks.length) return null;
  const pos = E.Pos.from(null), out = [];
  for (let k = 0; k < toks.length; k++) {
    if (!/^[a-i][1-9]$/i.test(toks[k])) return { bad: k + 1 };
    const m = E.parse(pos, toks[k]); if (m == null) return { bad: k + 1 };
    pos.play(m); out.push(m);
  }
  return { list: out };
}
function openLoaded(list, n) {
  ['#resultOverlay', '#newOverlay', '#lessonOverlay', '#puzzleOverlay', '#pasteOverlay'].forEach(hideOverlay);
  if (lesson || puzzle) { savedGame = null; exitSpecial(); }
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); rvCancel(); rv = null; rvOpen = false; thinking = 0; animating = false;
  settings.mode = 'pvp'; rgame = null; startSpec = null;
  moves = list; evals = []; hintList = null;
  cur = n === undefined || isNaN(n) ? moves.length : Math.max(0, Math.min(moves.length, n));
  reviewing = cur !== moves.length; gameOverShown = gameOver(moves.length);
  update(false); save(); afterPosition();
}
function loadText(v) {
  const r = parseGameText(v);
  if (!r) { toast(t('paste.invalid'), 2200); return false; }
  if (r.bad) { toast(t('paste.bad', { n: r.bad }), 2500); return false; }
  openLoaded(r.list, r.n); toast(t('paste.loaded', { n: r.list.length }), 1800);
  return true;
}
function loadFromHash() {
  const h = location.hash.slice(1); if (!h) return false;
  if (!new URLSearchParams(h).has('k')) return false;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  return loadText('#' + h);
}
window.addEventListener('hashchange', () => { if (/[#&]k=/.test(location.hash)) loadFromHash(); });
function shareUrl() { return startSpec ? '' : location.origin + location.pathname + '#r=' + gv + '&k=' + encMoves(moves) + (cur < moves.length ? '&n=' + cur : ''); }
// 共有: a PGN-like record ("1. e5 e6 2. …", the whole 9 × 9 grid a–i / 1–9), a position line, URL, diagram
function utPos(pos) { return `${pos.side ? 'O' : 'X'}:${pos.spec().b}:${pos.forced < 0 ? '-' : pos.forced + 1}`; }
function utRec() {
  const st = statusAt(moves.length), res = st.over ? (st.winner === P1 ? '1-0' : st.winner === P2 ? '0-1' : '1/2-1/2') : '*';
  const tk = recordText().split(' ');
  const d = new Date(), date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`, q = v => String(v || '?').replace(/["\\]/g, '');
  return `[Event "World Board Game Atlas"]\n[Site "core-calmdust.github.io/aicoding/uttt"]\n[Date "${date}"]\n[X "${q(playerName(P1))}"]\n[O "${q(playerName(P2))}"]\n[Result "${res}"]\n[Variant "${gv}"]\n\n${tk.concat([res]).join(' ')}\n`;
}
async function utDiagram(mode) {
  const RX = RecordExport, B = 486, pos = posAt(cur).pos;
  await RX.fonts();
  let cap = RX.tx('start');
  if (cur) cap = `${((cur - 1) >> 1) + 1}.${(cur - 1) & 1 ? '..' : ''} ${E.name(null, moves[cur - 1])}`;
  const st = statusAt(cur);
  cap += '　' + (st.over && cur === moves.length ? (st.winner === P1 ? '1-0' : st.winner === P2 ? '0-1' : '½-½') : RX.tx('toMove', { s: pname(pos.side ? P2 : P1) }));
  const lt = cur ? moves[cur - 1] : -1;
  const drawX = (g, x, y, r, w) => { g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r); g.lineWidth = w; g.lineCap = 'round'; g.strokeStyle = '#111'; g.stroke(); };
  const drawO = (g, x, y, r, w) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.lineWidth = w; g.strokeStyle = '#111'; g.stroke(); };
  const pl = [P1, P2].map(p => ({ name: pname(p) + (RX.name(p - 1, playerName(p)) ? ' ' + RX.name(p - 1, playerName(p)) : ''), swatch: (g, x, y, r) => (p === P1 ? drawX : drawO)(g, x, y, r * 0.8, 1.6) }));
  return RX.sheet({ bw: B + 8, bh: B + 8, title: t('meta.title').split(/[|｜—–]/)[0].trim(), caption: cap, players: pl, moves: mode === 'moves' ? recordText().split(' ') : null, path: 'uttt', titleFont: RX.SERIF, draw: (g, x0, y0) => {
    const ox = x0 + 4, oy = y0 + 4, X = m => ox + cellX(m) * B, Y = m => oy + cellY(m) * B, u = GEO.S * B / 3;
    g.fillStyle = '#f4efe4'; g.fillRect(ox, oy, B, B);
    for (const b of (st.over ? [] : pos.boards())) { g.fillStyle = 'rgba(232,196,90,.22)'; g.fillRect(ox + boardX(b) * B, oy + boardY(b) * B, GEO.S * B, GEO.S * B); }
    if (lt >= 0) { g.fillStyle = 'rgba(232,196,90,.6)'; g.fillRect(X(lt) - u / 2, Y(lt) - u / 2, u, u); }
    g.strokeStyle = '#111';
    for (const k of [1, 2]) { const v = (GEO.M + k * GEO.S + (k - 0.5) * GEO.G) * B; g.lineWidth = 3; g.beginPath(); g.moveTo(ox + v, oy + 6); g.lineTo(ox + v, oy + B - 6); g.moveTo(ox + 6, oy + v); g.lineTo(ox + B - 6, oy + v); g.stroke(); }
    for (let b = 0; b < 9; b++) for (const k of [1, 2]) { const bx = ox + boardX(b) * B, by = oy + boardY(b) * B, sv = GEO.S * B; g.lineWidth = 1.2; g.beginPath(); g.moveTo(bx + k * sv / 3, by + 3); g.lineTo(bx + k * sv / 3, by + sv - 3); g.moveTo(bx + 3, by + k * sv / 3); g.lineTo(bx + sv - 3, by + k * sv / 3); g.stroke(); }
    for (let m = 0; m < 81; m++) {
      if (mode === 'num') { g.fillStyle = 'rgba(20,30,15,.55)'; g.font = `600 9px ${RX.SANS}`; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(E.sqName(m), X(m) - u / 2 + 2, Y(m) - u / 2 + 2); }
      const o = pos.at(m); if (!o) continue;
      g.globalAlpha = pos.own[mB(m)] ? 0.35 : 1; (o === P1 ? drawX : drawO)(g, X(m), Y(m), u * 0.3, 2); g.globalAlpha = 1;
    }
    for (let b = 0; b < 9; b++) { const w = pos.own[b]; if (w !== 1 && w !== 2) continue; const cx = ox + (boardX(b) + GEO.S / 2) * B, cy = oy + (boardY(b) + GEO.S / 2) * B; (w === 1 ? drawX : drawO)(g, cx, cy, GEO.S * B * 0.36, 6); }
    g.lineWidth = 2.4; g.strokeRect(ox - 1.2, oy - 1.2, B + 2.4, B + 2.4);
  } });
}
RecordExport.attach({ btn: '#btnShare', key: 'uttt', title: t('meta.title'), lang: () => LANG, toast: m => toast(m, 1500),
  empty: () => !moves.length || !!lesson || !!puzzle, emptyMsg: () => t('nokifu'),
  formats: () => [{ id: 'pgn', label: 'PGN', ext: 'pgn', text: utRec }, { id: 'pos', label: 'FEN', ext: 'txt', meta: false, text: () => utPos(posAt(cur).pos) + '\n' }],
  sides: () => [{ label: pname(P1), name: playerName(P1), tag: 'X' }, { label: pname(P2), name: playerName(P2), tag: 'O' }],
  url: shareUrl, image: { modes: ['board', 'num', 'moves'], draw: utDiagram } });
$('#btnPaste').onclick = () => { $('#pasteText').value = ''; showOverlay('#pasteOverlay'); setTimeout(() => $('#pasteText').focus(), 50); };
$('#pasteCancel').onclick = () => hideOverlay('#pasteOverlay');
$('#pasteOk').onclick = () => { const v = $('#pasteText').value; if (!v.trim()) { toast(t('nokifu')); return; } loadText(v); };
$('#pasteText').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) { e.preventDefault(); $('#pasteOk').click(); } else if (e.key === 'Escape') hideOverlay('#pasteOverlay'); });

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
if (window.RulesOffer) RulesOffer.init({ game: 'uttt', lang: () => LANG, open: () => openRules(null, 0), watch: '#rulesOverlay' });
const hadSave = load();
try { const sp = localStorage.getItem('atlas-sfx'); if (sp === '0' || sp === '1') settings.sound = sp === '1'; } catch (e) {} // サイト共通のサウンド設定（トップページと連動）
designApply();
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) { LANG = q; try { localStorage.setItem('aicoding-lang', q); } catch (e) {} } }
applyI18n();
flip = flipFor(); drawLines();
// PC header bar: title left, menu (new > undo > hint > rules > lessons > puzzles) + icons right, game info in between
// 勝敗記録 (shared/record.js) and the coach's switch (coach.js): before the header bar takes the menu / icons
if (window.GameRecord) GameRecord.init({ game: 'uttt', lang: () => LANG, menu: '.controls', sides: () => [pname(P1), pname(P2)] });
if (window.UtttCoach) UtttCoach.init();
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnResign', '#btnHint', '#btnRules', '#btnLesson', '#btnPuzzle'], lang: () => LANG }) : null;

if (HB) HB.onChange(() => { renderInfo(); renderFx(); });
if (window.CountTick) CountTick.setMuted(() => !settings.sound);
$('#langSel').onchange = e => {
  LANG = e.target.value; settings.lang = LANG; save(); applyI18n();
  try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {}
  renderInfo(); renderFx();
  if ($('#newOverlay').classList.contains('show')) { segSync(); designPickers(); }
  if ($('#rulesOverlay').classList.contains('show')) renderRules();
  if (HB) HB.relabel();
  if (window.UtttCoach) UtttCoach.relabel();
  if (window.GameRecord) GameRecord.relabel();
  if (lesson) { if (lesson.study) showStudy(false); else renderLessonCard(); }
  if (puzzle) renderPuzzleCard();
  if ($('#lessonOverlay').classList.contains('show')) { if (!$('#lessonListView').classList.contains('hidden')) (document.querySelector('.ls-tabs button.sel[data-v=open]') ? openOpenings() : openLessons()); else if (!$('#lessonIntroView').classList.contains('hidden')) (openChoiceIdx >= 0 ? openOpeningChoice(openChoiceIdx) : openIntro(introIdx)); }
  if ($('#puzzleOverlay').classList.contains('show')) { if (!$('#pzListView').classList.contains('hidden')) openPuzzles(); else openPzGrid(pzLevel); }
};
if (loadFromHash()) { /* shared game opened */ }
else if (!hadSave) { update(false); afterPosition(); }   // no saved game: the starting position, waiting (the settings dialog opens from 対局)
else { update(false); afterPosition(); }
// expose for tests
window.__ut = { get moves() { return moves; }, get cur() { return cur; }, settings, get rv() { return rv; }, rvJudge, dailyPick, parseGameText, encMoves, decMoves, onSquare, statusAt, posAt, newGame, get lesson() { return lesson; }, get puzzle() { return puzzle; }, get sel() { return sel; }, startLesson, startPuzzle, lessonsReady, puzzlesReady, get LESSONS() { return LESSONS; }, get PUZZLES() { return PUZZLES; }, playMove, viewAt };

// clicking the dimmed area outside a dialog does the same as its close button
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
// the game title in the header: back to the board from lessons, puzzles and dialogs
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
// "対局" button: if a game is in progress (or a past move is on screen) ask whether to continue from here or start over
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
document.querySelector('#rsResume').onclick = () => { document.querySelector('#resumeOverlay').classList.remove('show'); if (rgame || settings.mode === 'online') { if (reviewing) resumeHere(); return; } openNewDialog(true); };   // the settings dialog in resume mode (rated games go on as they are)
// record navigation (first / prev / play / next / last) under the evaluation graph, with ← → ↑ ↓ and Space
let playTimer = 0;
function stopPlay() { clearInterval(playTimer); playTimer = 0; const b = document.querySelector('#navPlay'); if (b) b.classList.remove('playing'); }
function navGo(what) {
  if (lesson || puzzle) return;
  if (ken && kenOk()) { if (what === 'prev') kenBack(); return; }   // exploring: ◀ takes one explored move back, the rest waits for 元に戻す
  const N = moves.length;
  if (what === 'play') {
    if (playTimer) { stopPlay(); return; }
    if (cur >= N) viewAt(0);
    document.querySelector('#navPlay').classList.add('playing');
    playTimer = setInterval(() => { if (lesson || puzzle || cur >= moves.length) { stopPlay(); return; } viewAt(cur + 1); }, 1000);
    return;
  }
  stopPlay();
  const to = what === 'first' ? 0 : what === 'last' ? N : what === 'prev' ? cur - 1 : cur + 1;
  if (to < 0 || to > N || to === cur) return;
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
  if (ken && kenOk()) { e.preventDefault(); return; }   // exploring: the record keys are off (use ◀ / 元に戻す in the box)
  e.preventDefault(); if (tg && tg.blur && tg !== document.body) tg.blur();
  navGo(k);
});
window.addEventListener('resize', () => renderFx());
