'use strict';
// Checkers (English draughts) — page script. Same structure as Nine Men's Morris (the site's reference page):
// board + side panel, AI (20 steps) in Web Workers, rated games vs the AI (予備選), lessons, openings, puzzles (PZBook v2),
// post-game review with a coach, share / paste, daily puzzle. Online play: online.js + online-ui.js.
// ====================================================================== rules (shared with the engine)
const E = window.CheckersEngine, WIN = E.WIN, WINT = E.WINT;
const P1 = 1, P2 = 2;                 // P1 = Black (moves first), P2 = White
const RULE_ORDER = ['english'];
const mFrom = E.mFrom, mTo = E.mTo, mCap = E.mCap;
let gv = 'english';
let HB = null;                        // PC header bar (shared/headerbar.js)
let startSpec = null;                 // lesson / puzzle start position (null = the normal starting position)
let moves = [];                       // game record (move numbers, see engine.js)
let cur = 0;                          // number of moves shown
let flip = false;                     // board seen from Black's side (Black at the bottom)
function setVariant() { gv = 'english'; }
const startKey = () => startSpec ? startSpec.b + '/' + startSpec.side : '';
const keyOf = i => startKey() + '|' + moves.slice(0, i).join(',');
let posCache = { key: '' };
function posAt(i) {
  const key = keyOf(i);
  if (posCache.key === key) return posCache;
  const r = E.replay(startSpec, moves.slice(0, i));
  posCache = { key, pos: r.pos, hashes: r.hashes };
  return posCache;
}
// {over, winner, draw, why}
function statusAt(i) {
  if (manualEnd && manualEnd.n === moves.length && i === moves.length && !lesson && !puzzle && settings.mode !== 'online') return manualEnd;
  if (settings.mode === 'online' && window.olOver && i === moves.length && !lesson && !puzzle) { const o = olOver(); if (o) return o; }
  if (rgame && rgame.over && i === moves.length && !lesson && !puzzle) return rgame.over;
  const { pos, hashes } = posAt(i);
  return E.judge(pos, hashes);
}
const toMoveAt = i => posAt(i).pos.turn;
// move name in standard notation (needs the position before the move)
function mvAt(i, html) { const s = E.name(posAt(i).pos, moves[i]); return html ? s.replace(/x/g, '<span class="x">×</span>') : s; }
function mvIn(pos, m) { return E.name(pos, m); }
const capCount = m => E.popc(mCap(m));

// ====================================================================== state
const STORE = 'aicoding-checkers';
const settings = { mode: 'ai', rule: 'english', color: 1, level: 8, level2: 8, anim: true, sound: true, hint: false, eval: true, last: true, threat: false, num: true, lang: '', bd: 'classic', pcs: 'ebony' };
const SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
function detectLang() { const n = (navigator.language || 'ja').toLowerCase(); return ['ja', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'].find(c => n.startsWith(c)) || 'en'; }
let LANG = detectLang();
function t(k, v) { let x = (I18N[LANG] || I18N.en)[k]; if (x === undefined) x = I18N.en[k]; if (x === undefined) x = I18N.ja[k]; if (x === undefined) return k; if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; }
const pname = p => t(p === P1 ? 'p1' : 'p2');
// AI strength: 20 steps, 15級 (1) … 1級 (15), 初段 (16) … 五段 (20)
const LV_MAX = 20;
const LV = i => i <= 15 ? t('lv.kyu', { n: 16 - i }) : t('lv.dan' + (i - 15));
const LVD = i => t('lvd')[i <= 4 ? 0 : i <= 9 ? 1 : i <= 15 ? 2 : 3];
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
function renderBrand() { const tt = t('title'); $('#brandTitle').textContent = tt; $('#brandSub').textContent = t('sub'); document.querySelector('.brand h1').style.setProperty('--tl', Math.max(14, tt.length)); }
let humanColor = P1;
let reviewing = false;
let manualEnd = null;    // resignation / agreed draw in a game vs the AI or between two players: { over, winner, draw, why, n }
let aiVals = [];         // the AI's own search values (its view), newest last: for its draw offers and resignations
let evals = [];          // evals[i] = evaluation after i moves (Black's view)
let busyToken = 0;
let lesson = null, puzzle = null;
let rtHold = false;      // a rated game restored on page load: its clock waits for the first move
let rgame = null;        // rated game vs the AI: { id, lv, or, my, tag, ct: [ms, ms], t, over, done }
let gameOverShown = false;
let sel = null;          // human input in progress: { from, trail: [squares], cands: [moves] }

function validMoves(list) {
  try { const pos = E.Pos.from(startSpec); for (const m of list) { if (typeof m !== 'number' || !pos.moves().includes(m)) return false; pos.play(m); } return true; } catch (e) { return false; }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!d) return false;
    Object.assign(settings, d.settings || {});
    if (settings.mode === 'online') settings.mode = 'pvp';
    if (!(settings.level >= 1 && settings.level <= LV_MAX)) settings.level = 8;
    if (!(settings.level2 >= 1 && settings.level2 <= LV_MAX)) settings.level2 = 8;
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
let aiW = makeWorker(), anaW = makeWorker();
function request(which, msg, onProgress) {
  const w = which === 'ai' ? aiW : anaW;
  return new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve, onProgress }); w.postMessage({ start: startSpec, ...msg, id }); });
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
// wooden "clack" of a piece set down; delay in ms
function sPlace(soft, delay) { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000, v = soft ? 0.12 : 0.36; tone(a, t0, 300, 120, 0.12, v); noise(a, t0, 0.03, v * 1.1, 2400, 1.3); }
function sHop(delay) { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000; tone(a, t0, 420, 180, 0.1, 0.22); noise(a, t0, 0.025, 0.3, 2800, 1.4); }
function sTake(delay) { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000; tone(a, t0, 190, 70, 0.2, 0.26); noise(a, t0, 0.07, 0.18, 600, 0.8, 'lowpass'); }
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
const boardEl = $('#board'), piecesEl = $('#pieces'), fxEl = $('#fx'), linesEl = $('#lines');
const reduceMotion = false /* site rule: animations are never skipped for the OS reduce-motion setting */;
const animOn = () => settings.anim && !reduceMotion;
// display row / column of a square (Black's back row on top unless flipped)
const dRC = i => { const [r, c] = E.RC[i]; return flip ? [7 - r, 7 - c] : [r, c]; };
const ptX = i => (dRC(i)[1] + 0.5) / 8 * 100, ptY = i => (dRC(i)[0] + 0.5) / 8 * 100;
function placeAt(el, i) { el.style.left = ptX(i) + '%'; el.style.top = ptY(i) + '%'; }
const CROWN = '<svg viewBox="0 0 24 24"><path d="M3 18 4.5 7l5 4.5L12 5l2.5 6.5 5-4.5L21 18z" fill="#f2d27a" stroke="#7a5a1c" stroke-width="1.2" stroke-linejoin="round"/><path d="M3.5 20.5h17" stroke="#f2d27a" stroke-width="2" stroke-linecap="round"/></svg>';
function drawLines() {
  boardEl.style.setProperty('--S', 8);
  let s = `<defs><linearGradient id="sqDG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--sqD1)"/><stop offset="1" style="stop-color:var(--sqD2)"/></linearGradient><linearGradient id="sqLG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--sqL1)"/><stop offset="1" style="stop-color:var(--sqL2)"/></linearGradient></defs>`;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) s += `<rect class="${(r + c) & 1 ? 'sqd' : 'sql'}" x="${c}" y="${r}" width="1.002" height="1.002"/>`;
  for (let i = 0; i < 32; i++) { const [r, c] = dRC(i); s += `<text class="num" x="${c + 0.07}" y="${r + 0.24}" font-size="0.2">${i + 1}</text>`; }
  linesEl.setAttribute('viewBox', '0 0 8 8');
  linesEl.innerHTML = s;
  boardEl.classList.toggle('no-num', !settings.num);
}
function setFlip(f) { if (f === flip) return; flip = f; drawLines(); syncPieces(posAt(cur).pos, true); }
function flipFor() {   // own pieces at the bottom: the human's colour in games vs the AI, the solver in lessons / puzzles
  if (puzzle) return puzzle.me === P1;
  if (lesson) return lesson.me === P1;
  if (settings.mode === 'online' && window.olMyColor) return olMyColor() === P1;
  if (settings.mode === 'ai') return humanColor === P1;
  return false;
}
const pcEls = new Map();      // square -> element
let shownKey = '';
function newPiece(kind) {     // kind: 1 black man, 2 black king, 3 white man, 4 white king
  const el = document.createElement('div'); el.className = 'pc p' + (kind <= 2 ? 1 : 2) + (kind === 2 || kind === 4 ? ' king' : '');
  el.innerHTML = '<i class="crown">' + CROWN + '</i>'; el.dataset.k = kind; return el;
}
function setKind(el, kind) { el.className = 'pc p' + (kind <= 2 ? 1 : 2) + (kind === 2 || kind === 4 ? ' king' : ''); el.dataset.k = kind; }
function syncPieces(pos, force) {
  for (const [i, el] of pcEls) if (force || pos.at(i) !== +el.dataset.k) { el.remove(); pcEls.delete(i); }
  for (let i = 0; i < 32; i++) { const k = pos.at(i); if (k && !pcEls.has(i)) { const el = newPiece(k); placeAt(el, i); piecesEl.appendChild(el); pcEls.set(i, el); } }
  for (const [i, el] of pcEls) { placeAt(el, i); el.getAnimations && el.getAnimations().forEach(a => a.cancel()); el.classList.remove('sel', 'dim', 'threat', 'mustjump', 'crowned'); el.style.opacity = ''; }
}
const HOP = 260, SLIDE = 300;
function moveDur(m, pos) {
  if (!animOn()) return 60;
  if (!mCap(m)) return SLIDE + (pos && pos.promotes(m) ? 300 : 0);
  const hops = pos ? E.path(pos, m).length - 1 : capCount(m);
  return hops * HOP + 120 + (pos && pos.promotes(m) ? 300 : 0);
}
// animate move m from position `before` (the pieces map shows `before`)
function animateMove(m, before) {
  const f = mFrom(m), tt = mTo(m), cap = mCap(m), el = pcEls.get(f);
  if (!el) return false;
  const path = E.path(before, m), crown = before.promotes(m);
  const r0 = boardEl.getBoundingClientRect(), u = r0.width / 8;
  const pt = i => { const [r, c] = dRC(i); return [(c + 0.5) * u, (r + 0.5) * u]; };
  pcEls.delete(f); placeAt(el, tt); pcEls.set(tt, el);
  el.classList.remove('sel'); el.style.zIndex = 5;
  const [ex, ey] = pt(tt);
  if (!cap) {
    const [sx, sy] = pt(f);
    if (el.animate) el.animate([{ transform: `translate(${sx - ex}px,${sy - ey}px)` }, { transform: 'none' }], { duration: SLIDE, easing: 'cubic-bezier(.3,.7,.3,1)' });
    sPlace(false, SLIDE - 40);
  } else {
    const frames = [];
    for (let k = 0; k < path.length; k++) {
      const [x, y] = pt(path[k]);
      if (k > 0) { const [px, py] = pt(path[k - 1]); frames.push({ transform: `translate(${(x + px) / 2 - ex}px,${(y + py) / 2 - ey}px) scale(1.18)`, offset: (k - 0.5) / (path.length - 1) }); }
      frames.push({ transform: k === path.length - 1 ? 'none' : `translate(${x - ex}px,${y - ey}px)`, offset: k / (path.length - 1) });
    }
    const dur = (path.length - 1) * HOP;
    if (el.animate) el.animate(frames, { duration: dur, easing: 'linear' });
    // the jumped pieces disappear as the piece passes over them
    for (let k = 1; k < path.length; k++) {
      const a = path[k - 1], b = path[k], [ra, ca] = E.RC[a], [rb, cb] = E.RC[b], mid = E.sqAt((ra + rb) / 2, (ca + cb) / 2);
      const vic = pcEls.get(mid); pcEls.delete(mid);
      const at = (k - 0.5) * HOP;
      sHop(at - HOP / 2 + 30);
      if (vic) {
        if (vic.animate) { const an = vic.animate([{ transform: 'none', opacity: 1, filter: 'brightness(1)' }, { transform: 'scale(1.12)', opacity: 1, filter: 'brightness(1.5)', offset: 0.3 }, { transform: 'scale(.3)', opacity: 0, filter: 'brightness(.6)' }], { duration: 320, delay: at, easing: 'ease-in', fill: 'forwards' }); an.onfinish = () => vic.remove(); }
        else vic.remove();
        sTake(at + 40);
      }
    }
    sPlace(false, dur - 30);
  }
  setTimeout(() => { el.style.zIndex = ''; }, moveDur(m, before));
  if (crown) {
    const d = cap ? (path.length - 1) * HOP : SLIDE;
    setTimeout(() => { if (pcEls.get(tt) === el) { setKind(el, +el.dataset.k + 1); el.classList.add('crowned'); } sCrown(); }, d + 40);
  }
  return true;
}
function renderReserves(pos) {
  // captured pieces, shown on the capturer's side of the board (bottom row = the player at the bottom)
  const start = E.Pos.from(startSpec);
  for (const p of [P1, P2]) {
    const lost = Math.max(0, start.count(p) - pos.count(p));
    const bottom = flip ? P1 : P2, el = $(3 - p === bottom ? '#res1' : '#res2');   // next to the player who captured them
    let s = ''; for (let k = 0; k < Math.min(lost, 12); k++) s += `<span class="rv p${p}"></span>`;
    if (lost) s += `<span class="lbl">×${lost}</span>`;
    el.innerHTML = s;
    el.title = lost ? t('captured', { c: pname(p), n: lost }) : '';
    el.classList.remove('turn');
  }
}
function renderBoard(anim) {
  const want = flipFor(); if (want !== flip) { flip = want; drawLines(); pcEls.forEach(el => el.remove()); pcEls.clear(); }
  const { pos } = posAt(cur), key = keyOf(cur);
  const prev = shownKey; shownKey = key;
  const m = cur > 0 ? moves[cur - 1] : -1;
  let done = false;
  if (anim && animOn() && m >= 0 && prev === keyOf(cur - 1)) {
    const before = posAt(cur - 1).pos;
    done = animateMove(m, before);
    if (done) for (let i = 0; i < 32; i++) if (!!pos.at(i) !== pcEls.has(i)) { done = false; break; }
  } else if (anim && m >= 0 && prev === keyOf(cur - 1)) {
    sPlace(); if (mCap(m)) sTake(80);
  }
  if (!done) syncPieces(pos);
  boardEl.classList.toggle('hide-last', !settings.last);
  boardEl.classList.toggle('no-num', !settings.num);
  renderReserves(pos);
  renderFx();
  boardEl.classList.toggle('can', canHumanPlay());
}

// ---------------------------------------------------------------- fx: last move, selection, hints, marks
let hintList = null;
let lessonMarks = [];          // {at, cls} rings / {arrow: [squares], cls}
let labelList = null;          // explicit labels: [{at, big, small, cls}]
const NS = 'http://www.w3.org/2000/svg';
function fxDiv(cls, i) { const d = document.createElement('div'); d.className = cls; placeAt(d, i); fxEl.appendChild(d); return d; }
function fxSvg() { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'fxsvg'); s.setAttribute('viewBox', '0 0 8 8'); fxEl.appendChild(s); return s; }
const cXY = i => { const [r, c] = dRC(i); return [c + 0.5, r + 0.5]; };
// an arrow along a path of squares (a move or a multiple jump)
function svgArrow(svg, path, cls) {
  if (!path || path.length < 2) return;
  const pts = path.map(cXY);
  const [x1, y1] = pts[0], [x2, y2] = pts[1], d0 = Math.hypot(x2 - x1, y2 - y1) || 1;
  pts[0] = [x1 + (x2 - x1) / d0 * 0.28, y1 + (y2 - y1) / d0 * 0.28];
  const n = pts.length, [ax, ay] = pts[n - 2], [bx, by] = pts[n - 1], dl = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / dl, uy = (by - ay) / dl;
  const ex = bx - ux * 0.3, ey = by - uy * 0.3; pts[n - 1] = [ex, ey];
  const h = 0.18;
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', 'M' + pts.map(q => q[0].toFixed(3) + ',' + q[1].toFixed(3)).join('L') + `M${ex - ux * h - uy * h * 0.8},${ey - uy * h + ux * h * 0.8}L${ex},${ey}L${ex - ux * h + uy * h * 0.8},${ey - uy * h - ux * h * 0.8}`);
  p.setAttribute('class', 'arrow ' + (cls || '')); p.setAttribute('stroke-width', 0.07); p.setAttribute('stroke-linejoin', 'round'); svg.appendChild(p);
}
// pieces of player p that the opponent could capture right now (if it were the opponent's turn)
function threatened(pos, p) {
  const q = pos.clone(); q.side = p === P1 ? 1 : 0;
  let s = 0; for (const m of q.caps()) s = (s | mCap(m)) >>> 0;
  return s;
}
function renderFx() {
  fxEl.innerHTML = '';
  const { pos } = posAt(cur), st = statusAt(cur), m = cur > 0 ? moves[cur - 1] : -1;
  const svg = fxSvg(); $('#millfx').innerHTML = '';
  for (const [, el] of pcEls) el.classList.remove('dim', 'sel', 'threat', 'mustjump');
  // last move: its squares, the jumped squares
  if (m >= 0 && !sel) {
    const before = posAt(cur - 1).pos, path = E.path(before, m);
    fxDiv('sqfx lastf', path[0]); fxDiv('sqfx last', mTo(m));
    if (settings.last) for (const i of E.bitsOf(mCap(m))) fxDiv('mark took', i);
  }
  if (st.over && st.winner) for (const [i, el] of pcEls) if ((pos.at(i) <= 2 ? P1 : P2) !== st.winner) el.classList.add('dim');
  if (settings.threat && !st.over && !lesson && !puzzle && !sel) for (const p of [P1, P2]) for (const i of E.bitsOf(threatened(pos, p))) { const el = pcEls.get(i); if (el) el.classList.add('threat'); }
  // forced capture: the pieces that can (must) jump pulse
  if (canHumanPlay() && !sel && !st.over) { const caps = pos.caps(); if (caps.length) for (const f of new Set(caps.map(mFrom))) { const el = pcEls.get(f); if (el) el.classList.add('mustjump'); } }
  if (sel) {
    const el = pcEls.get(sel.from); if (el) el.classList.add('sel');
    const k = sel.trail.length;
    for (let j = 1; j < k; j++) fxDiv('sqfx trail', sel.trail[j]);
    const next = new Set(), fin = new Set();
    for (const c of sel.cands) { const p = E.path(pos, c); if (p.length > k) { next.add(p[k]); if (p.length === k + 1) fin.add(p[k]); } }
    next.forEach(i => fxDiv('dest' + (fin.has(i) ? '' : ' mid'), i));
    if (k > 1) svgArrow(svg, sel.trail, 'pl');
  }
  for (const k of lessonMarks) { if (k.arrow) svgArrow(svg, k.arrow, k.cls); else fxDiv('mark ' + k.cls, k.at); }
  if (labelList) drawLabels(labelList);
  else if (!drawReviewFx(svg) && hintList && !st.over) drawHints(hintList, svg);
  renderPrompt();
}
function renderPrompt() {
  const el = $('#prompt'); let s = '';
  if (canHumanPlay() && !lesson) { const { pos } = posAt(cur); if (pos.hasCaps()) s = sel && sel.trail.length > 1 ? t('pick.jumpOn') : t('pick.mustJump'); }
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
// labels on the landing squares (the best value per square); while selecting, only the selected piece's moves
function hintGroups(list) {
  let L = list;
  if (sel) { const { pos } = posAt(cur), k = sel.trail.length; L = list.filter(e => { const p = E.path(pos, e.m); return p.length >= k && sel.trail.every((x, j) => p[j] === x); }); }
  const g = new Map();
  for (const e of L) { const k = mTo(e.m); const o = g.get(k); if (!o || e.v > o.v) g.set(k, e); }
  return g;
}
function drawHints(list, svg) {
  const g = hintGroups(list); if (!g.size) return;
  let best = -Infinity; for (const e of g.values()) best = Math.max(best, e.v);
  for (const [at, e] of g) {
    const L = valLabel(e.v), d = fxDiv('hintlbl ' + L.cls + (e.v === best ? ' best' : '') + (pcEls.has(at) ? ' on-pc' : ''), at);
    d.innerHTML = `<b>${L.big}</b>${L.small ? `<small>${L.small}</small>` : ''}`;
  }
  if (!sel) { let bm = null; for (const e of list) if (!bm || e.v > bm.v) bm = e; if (bm) svgArrow(svg, E.path(posAt(cur).pos, bm.m), 'ok'); }
}
function drawLabels(list) { for (const L of list) { const d = fxDiv('hintlbl ' + L.cls + (pcEls.has(L.at) ? ' on-pc' : ''), L.at); d.innerHTML = `<b>${L.big}</b>${L.small ? `<small>${L.small}</small>` : ''}`; } }

// evaluation (Black's view): {s in [-1,1], kind, side, n}
function sOfV(v) { return v > WINT ? 0.9 + 0.1 * Math.min(1, 6 / (WIN - v + 1)) : v < -WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (WIN + v + 1))) : v > WINT - 1000 ? 0.88 : v < -(WINT - 1000) ? -0.88 : Math.tanh(v / 260) * 0.82; }
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
  if (gameOver(cur)) return false;
  if (animating) return false;
  if (puzzle) return puzzle.state === 'play' && !puzzle.busy && toMoveAt(cur) === puzzle.me;
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
  if (settings.mode === 'watch') return `AI ${LV(levelFor(p))}`;
  if (rgame) return p === humanColor ? t('you') + ' · R' + rgame.my : `AI ${rtLvName(rgame.lv)} · R${rgame.or}`;
  return p === humanColor ? t('you') : `AI ${LV(settings.level)}`;
}
let thinking = 0, animating = false;
function renderInfo() {
  const { pos } = posAt(cur), st = statusAt(cur), tm = pos.turn;
  for (const p of [P1, P2]) {
    $('#count' + p).textContent = pos.count(p);
    const k = pos.kings(p); $('#hand' + p).textContent = t('pcs', { m: pos.count(p) - k, k });
    const n = playerName(p); $('#name' + p).textContent = n ? n + ' · ' + pname(p) : pname(p);
    const el = $('#pl' + p);
    el.classList.toggle('active', !st.over && tm === p);
    el.classList.toggle('won', st.winner === p);
    el.classList.toggle('thinking', thinking === p);
    $('#status' + p).textContent = st.winner === p ? t('st.win') : thinking === p ? t('thinking') : (!st.over && tm === p ? t('st.turn') + (pos.hasCaps() ? ' · ' + t('st.jump') : '') : '');
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
  $('#btnResign').disabled = !canResign();
  $('#btnHint').disabled = rtLive() || settings.mode === 'online';
  $('#btnHint').classList.toggle('on', settings.hint);
  $('#btnSound').classList.toggle('on', settings.sound);
  $('#reviewBar').classList.toggle('show', reviewing && !lesson && !puzzle);
  renderReview();
  $('#infoLine').textContent = `${t('info.moves', { n: moves.length })}  ·  ${settings.mode === 'ai' ? 'AI ' + LV(levelFor(0)) + (rgame ? ' · ' + t('ng.rated') : '') : settings.mode === 'watch' ? `${LV(settings.level)} vs ${LV(settings.level2)}` : t('ng.pvp')}  ·  ← → ${t('info.browse')}`;
  renderBrand();
  if (window.olAfterInfo) olAfterInfo();
  hbInfo(pos, st);
}
// PC header bar: whose turn, pieces of each side, evaluation (when shown), move number
const escHb = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function hbInfo(pos, st) {
  if (!HB || !HB.on) return;
  const tm = pos.turn;
  let h = `<span class="hb-chip"><i class="pdisc p${st.over ? (st.winner || tm) : tm}"></i><b>${escHb(st.over ? (st.winner ? t('hb.won', { c: pname(st.winner) }) : t('res.draw')) : t('hb.turn', { c: pname(tm) }))}</b>${!st.over && pos.hasCaps() ? `<small>${escHb(t('st.jump'))}</small>` : ''}</span>`;
  for (const p of [P1, P2]) { const k = pos.kings(p); h += `<span class="hb-chip cnt"><i class="pdisc p${p}"></i><b>${pos.count(p)}</b>${k ? `<small>${escHb(t('hb.kings', { n: k }))}</small>` : ''}</span>`; }
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

// ====================================================================== input (click a piece, then its landing square; multiple jumps can be clicked hop by hop)
function squareAt(clientX, clientY) {
  const r = boardEl.getBoundingClientRect(), u = r.width / 8;
  let c = Math.floor((clientX - r.left) / u), rr = Math.floor((clientY - r.top) / u);
  if (c < 0 || c > 7 || rr < 0 || rr > 7) return -1;
  if (flip) { c = 7 - c; rr = 7 - rr; }
  return E.sqAt(rr, c);
}
let hoverEl = null;
function setHover(i) {
  if (hoverEl) { hoverEl.remove(); hoverEl = null; }
  if (i < 0 || !canHumanPlay() || !sel) return;
  const { pos } = posAt(cur), k = sel.trail.length;
  if (!sel.cands.some(c => { const p = E.path(pos, c); return p[k] === i; })) return;
  hoverEl = document.createElement('div'); hoverEl.className = 'hov pc p' + pos.turn; placeAt(hoverEl, i); piecesEl.appendChild(hoverEl);
}
boardEl.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') setHover(squareAt(e.clientX, e.clientY)); });
boardEl.addEventListener('pointerleave', () => setHover(-1));
boardEl.addEventListener('click', e => { const i = squareAt(e.clientX, e.clientY); setHover(-1); onSquare(i); });
function cancelSel() { if (!sel) return; sel = null; renderFx(); }
function onSquare(i) {
  ctx();
  if (!canHumanPlay()) { if (reviewing && !lesson && !puzzle) rsOpen(); return; }
  const { pos } = posAt(cur), me = pos.turn, legal = pos.moves();
  if (i < 0) { cancelSel(); return; }
  const mine = pos.at(i) && ((pos.at(i) <= 2 ? P1 : P2) === me);
  if (mine && (!sel || sel.trail.length === 1 || i === sel.from)) {
    if (sel && sel.from === i) { cancelSel(); return; }
    const c = legal.filter(m => mFrom(m) === i);
    if (!c.length) {
      if (legal.length && mCap(legal[0])) toast(t('cant.mustJump'), 1800);
      else toast(t('cant.stuck'));
      return;
    }
    sel = { from: i, trail: [i], cands: c }; playTick(); renderFx(); return;
  }
  if (!sel) { if (pos.at(i)) toast(t('pick.own')); return; }
  const k = sel.trail.length;
  const paths = sel.cands.map(c => ({ m: c, p: E.path(pos, c) }));
  // a landing square that ends exactly one candidate (from any hop) → play it
  const ends = paths.filter(x => mTo(x.m) === i && x.p.length > k && sel.trail.every((s, j) => x.p[j] === s));
  const next = paths.filter(x => x.p[k] === i);
  if (next.length === 1 && next[0].p.length === k + 1) { commit(next[0].m); return; }
  if (next.length >= 1) {
    const done = next.filter(x => x.p.length === k + 1);
    if (done.length === 1 && next.length === 1) { commit(done[0].m); return; }
    if (done.length && next.length === done.length) { commit(done[0].m); return; }   // same landing, different captured set: never happens with short kings
    sel.trail.push(i); sel.cands = next.map(x => x.m); sHop(); renderFx(); return;   // continue the jump hop by hop
  }
  if (ends.length === 1) { commit(ends[0].m); return; }
  if (ends.length > 1) { toast(t('pick.path')); return; }
  if (pos.at(i)) { cancelSel(); return; }
  toast(legal.length && mCap(legal[0]) ? t('cant.mustJump') : t('cant.move'));
}
function commit(m) {
  sel = null; setHover(-1);
  if (lesson) return lessonAnswer(m);
  if (puzzle) return puzzleMove(m);
  if (settings.mode === 'online' && window.olHumanMove) return olHumanMove(m);
  playMove(m);
}

// ====================================================================== flow
function newGame(rated) {
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false;
  rgame = null; rtHold = false;
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
  if (lesson || puzzle || reviewing || gameOver(cur)) return;
  const p = toMoveAt(cur);
  if (!isAIColor(p)) return;
  thinking = p; renderInfo(); boardEl.classList.remove('can');
  const t0 = Date.now(), shown = moves.slice(0, cur);
  const res = await request('ai', { type: 'think', moves: shown, level: levelFor(p) });
  if (!res || tok !== busyToken) { if (tok === busyToken) { thinking = 0; renderInfo(); } return; }
  const prevDur = cur > 0 ? moveDur(moves[cur - 1], posAt(cur - 1).pos) : 0;
  const wait = Math.max((settings.mode === 'watch' ? 700 : 420), prevDur + 120) - (Date.now() - t0);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  if (tok !== busyToken) return;
  thinking = 0;
  if (res.move === undefined || res.move < 0) { renderInfo(); return; }
  if (typeof res.v === 'number') { aiVals[cur] = res.v; }
  if (settings.mode === 'ai' && aiResigns(p)) return;
  playMove(res.move);
  if (settings.mode === 'ai') aiMaybeOfferDraw(p);
}
// ---------------------------------------------------------------- resignation and draw offers in games vs the AI
const WINT_JS = 29000;
let drawAsked = -99;   // ply of the last draw offer (either side), so offers are not repeated every move
const pieces = pos => pos.count(P1) + pos.count(P2);
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
  const lost = v < -WINT_JS + 1000 || (v <= -450 && prev !== undefined && prev <= -450 && posAt(cur).pos.count(p) <= 6);
  if (!lost) return false;
  endManually({ over: true, winner: p === P1 ? P2 : P1, why: 'resign', aiResigned: true });
  return true;
}
// the AI offers a draw in a dead-level ending (nobody can make progress); the player answers in a small dialog
function aiMaybeOfferDraw(p) {
  const v = aiVals[cur - 1]; if (typeof v !== 'number' || !aiGameLive()) return;
  const pos = posAt(cur).pos;
  if (Math.abs(v) > 15 || pieces(pos) > 8 || pos.quiet < 16 || cur - drawAsked < 20) return;
  drawAsked = cur;
  setTimeout(() => {
    if (!aiGameLive()) return;
    olConfirmAny(t('dr.aiOffer'), t('dr.accept'), () => { if (aiGameLive()) endManually({ over: true, winner: 0, draw: true, why: 'agree' }); }, t('dr.decline'));
  }, 900);
}
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
// the player: offer a draw (the AI accepts when it is not better)
function playerDraw() {
  if (!aiGameLive()) return;
  if (cur - drawAsked < 6) { toast(t('dr.wait'), 1800); return; }
  drawAsked = cur;
  const ai = humanColor === P1 ? P2 : P1, vs = aiVals.filter(x => typeof x === 'number'), v = vs.length ? vs[vs.length - 1] : 0, pos = posAt(cur).pos;
  const ok = cur >= 20 && v <= 20 && (pieces(pos) <= 10 || pos.quiet >= 20 || v <= -60);
  if (ok) { toast(t('dr.accepted'), 1600); endManually({ over: true, winner: 0, draw: true, why: 'agree' }); }
  else toast(t('dr.declined'), 2000);
}
window.aiGameLive = aiGameLive; window.playerResign = playerResign; window.playerDraw = playerDraw;
async function analyzeCurrent(tok) {
  const idx = cur, key = keyOf(idx);
  if (gameOver(idx) || lesson || puzzle) { hintList = null; return; }
  if (rtLive() || (window.olLive && olLive())) { hintList = null; return; }
  if (!settings.eval && !settings.hint) return;
  const mover = toMoveAt(idx);
  const apply = list => {
    if (keyOf(idx) !== key || !list) return;
    const ev = evalFromList(list, mover);
    if (ev) evals[idx] = ev;
    if (cur === idx) { hintList = settings.hint ? list : null; renderFx(); renderInfo(); }
  };
  if (anaCache.has(key)) { apply(anaCache.get(key)); return; }
  cancelWorker('ana');
  const res = await request('ana', { type: 'analyze', moves: moves.slice(0, idx), time: settings.hint ? 1500 : 900 }, m => apply(m.list));
  if (!res || res.error) return;
  anaCache.set(key, res.list);
  apply(res.list);
  save();
}
// the result dialog only when a game ends right now on the board (never for a lesson / puzzle, nor for a finished game that is restored)
function onGameEnd(st) {
  if (lesson || puzzle) return;
  if (moves.length !== cur || gameOverShown) return;
  if (settings.mode === 'online') return;   // online: the result comes from online-ui.js
  gameOverShown = true;
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
  hideOverlay('#resultOverlay');
  update(false); save(); afterPosition();
}
function viewAt(i) {
  if (lesson || puzzle) return;
  i = Math.max(0, Math.min(moves.length, i));
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
  const cols = ['#e6cd8c', '#fff6dc', '#efe5cf', '#3b302b', '#b39249', '#7fd6a4'];
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
$('#btnResume').onclick = resumeHere;
$('#btnLatest').onclick = () => viewAt(moves.length);
$('#btnReview').onclick = () => hideOverlay('#resultOverlay');
$('#btnAgain').onclick = () => { hideOverlay('#resultOverlay'); if (rgame) rtStart(); else newGame(); };
function recordText() {
  const pos = E.Pos.from(startSpec), out = [];
  moves.forEach((m, i) => { out.push((i % 2 === 0 ? (i / 2 + 1) + '. ' : '') + mvIn(pos, m)); pos.play(m); });
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

// ---------------------------------------------------------------- small board pictures (rules, lesson / puzzle lists)
// spec: { b: 32 chars, side } ; o: { cls, marks: {sq: 'ring'|'ng'|'x'|'dash'}, arrows: [[squares...]], flip, click, sel, dest: [], last, nums }
// ---------------------------------------------------------------- 2D board designs and piece sets (CSS: html[data-bd] / html[data-pcs]; mini boards: BD_PAL / PC_PAL)
const BD_KEYS = ['classic', 'tournament', 'walnut', 'marble', 'navy'], PC_KEYS = ['ebony', 'red', 'redwhite', 'mono'];
const BD_PAL = { classic: ['#2c5440', '#d3be93'], tournament: ['#232120', '#b8322a'], walnut: ['#5c3a20', '#dcc08f'], marble: ['#5d6368', '#e4e1db'], navy: ['#1d3c72', '#c0cbdc'] };
const PC_PAL = { ebony: [['#3b302b', '#0d0a09'], ['#efe5cf', '#8f8166']], red: [['#3b302b', '#0d0a09'], ['#d9473a', '#5a0f0a']], redwhite: [['#d9473a', '#5a0f0a'], ['#efe5cf', '#8f8166']], mono: [['#262626', '#000'], ['#f6f6f4', '#86867f']] };
function designApply() {
  if (!BD_KEYS.includes(settings.bd)) settings.bd = 'classic';
  if (!PC_KEYS.includes(settings.pcs)) settings.pcs = 'ebony';
  document.documentElement.dataset.bd = settings.bd; document.documentElement.dataset.pcs = settings.pcs;
}
const DESIGN_SPEC = { b: 'bbbbbbbbbb.bb...w.....wwwwwwwwww', side: 1 };
function designPickers() {
  const r1 = $('#bdRow'), r2 = $('#pcRow'); if (!r1 || !r2) return;
  r1.innerHTML = BD_KEYS.map(k => `<button type="button" data-bd="${k}" class="${k === settings.bd ? 'sel' : ''}" aria-pressed="${k === settings.bd}">${miniSVG(DESIGN_SPEC, { cls: 'bdm', bd: k })}<span>${escHb(t('bd.' + k))}</span></button>`).join('');
  r2.innerHTML = PC_KEYS.map(k => `<button type="button" data-pcs="${k}" class="${k === settings.pcs ? 'sel' : ''}" aria-pressed="${k === settings.pcs}">${miniSVG(DESIGN_SPEC, { cls: 'bdm', pcs: k })}<span>${escHb(t('pcs.' + k))}</span></button>`).join('');
}
function miniSVG(spec, o) {
  o = o || {};
  const fl = !!o.flip, P = i => { const [r, c] = E.RC[i]; return fl ? [7 - r, 7 - c] : [r, c]; };
  const u = 30, pad = 6, W = 8 * u + pad * 2, X = i => pad + (P(i)[1] + 0.5) * u, Y = i => pad + (P(i)[0] + 0.5) * u;
  const BP = BD_PAL[o.bd || settings.bd] || BD_PAL.classic, PP = PC_PAL[o.pcs || settings.pcs] || PC_PAL.ebony;
  // o.crop = [r0, r1, c0, c1] (board rows / columns, see cropOf): only that part is shown, enlarged, in a square frame;
  // a side on the board's real edge keeps the frame, a cut side fades out so the board visibly goes on (pieces outside are left out)
  const cr = Array.isArray(o.crop) ? o.crop : null, inC = i => { if (!cr) return true; const [r, c] = E.RC[i]; return r >= cr[0] && r <= cr[1] && c >= cr[2] && c <= cr[3]; };
  let s = cr ? '' : `<svg class="${o.cls || 'mini'}" viewBox="0 0 ${W} ${W}">`;
  s += `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" rx="8" fill="#1a1410" stroke="rgba(201,169,97,.5)"/>`;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) s += `<rect x="${pad + c * u}" y="${pad + r * u}" width="${u}" height="${u}" fill="${(r + c) & 1 ? BP[0] : BP[1]}"/>`;
  if (o.nums) for (let i = 0; i < 32; i++) s += `<text x="${X(i) - u * 0.42}" y="${Y(i) - u * 0.24}" font-size="${u * 0.24}" fill="rgba(255,246,220,.5)" font-family="JetBrains Mono,monospace">${i + 1}</text>`;
  if (o.last != null && o.last >= 0) s += `<rect x="${X(o.last) - u / 2}" y="${Y(o.last) - u / 2}" width="${u}" height="${u}" fill="rgba(255,222,130,.28)"/>`;
  for (const i of o.dest || []) s += `<circle cx="${X(i)}" cy="${Y(i)}" r="4.5" fill="rgba(255,236,170,.9)"/>`;
  const b = spec && spec.b ? spec.b : '';
  for (let i = 0; i < 32; i++) {
    const ch = b[i]; if (!ch || ch === '.' || !inC(i)) continue;
    const p1 = ch === 'b' || ch === 'B', king = ch === 'B' || ch === 'W', x = X(i), y = Y(i), r = u * 0.38;
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${PP[p1 ? 0 : 1][0]}" stroke="${PP[p1 ? 0 : 1][1]}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="${r * 0.68}" fill="none" stroke="${p1 ? 'rgba(255,220,200,.22)' : 'rgba(120,100,60,.35)'}" stroke-width="1.2"/>`;
    if (king) s += `<path transform="translate(${x - r * 0.6},${y - r * 0.6}) scale(${r * 1.2 / 24})" d="M3 18 4.5 7l5 4.5L12 5l2.5 6.5 5-4.5L21 18z" fill="#f2d27a" stroke="#7a5a1c" stroke-width="1.4" stroke-linejoin="round"/>`;
  }
  if (o.sel != null && o.sel >= 0) s += `<circle cx="${X(o.sel)}" cy="${Y(o.sel)}" r="${u * 0.46}" fill="none" stroke="#ffe9a8" stroke-width="2.6"/>`;
  for (const k in o.marks || {}) {
    const v = o.marks[k], x = X(+k), y = Y(+k);
    if (v === 'x') s += `<path d="M${x - 7},${y - 7}L${x + 7},${y + 7}M${x + 7},${y - 7}L${x - 7},${y + 7}" stroke="#ff6b5b" stroke-width="3" stroke-linecap="round"/>`;
    else s += `<circle cx="${x}" cy="${y}" r="${u * 0.46}" fill="none" stroke="${v === 'ng' ? '#ff6b5b' : v === 'dash' ? 'rgba(255,255,255,.85)' : '#e2c275'}" stroke-width="2.4" ${v === 'dash' ? 'stroke-dasharray="4 3"' : ''}/>`;
  }
  for (const a of o.arrows || []) {
    const pts = a.map(i => [X(i), Y(i)]); if (pts.length < 2) continue;
    const n = pts.length, [ax, ay] = pts[n - 2], [bx, by] = pts[n - 1], L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L;
    const ex = bx - ux * 10, ey = by - uy * 10, h = 6; pts[n - 1] = [ex, ey];
    const [sx0, sy0] = pts[0], [sx1, sy1] = pts[1], L0 = Math.hypot(sx1 - sx0, sy1 - sy0); pts[0] = [sx0 + (sx1 - sx0) / L0 * 8, sy0 + (sy1 - sy0) / L0 * 8];
    s += `<path d="M${pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L')}M${ex - ux * h - uy * h},${ey - uy * h + ux * h}L${ex},${ey}L${ex - ux * h + uy * h},${ey - uy * h - ux * h}" stroke="#ffe9a8" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (o.click) for (let i = 0; i < 32; i++) s += `<rect data-p="${i}" x="${X(i) - u / 2}" y="${Y(i) - u / 2}" width="${u}" height="${u}" fill="transparent"/>`;
  if (!cr) return s + '</svg>';
  // cropped: the shown rows / columns on screen (flipped boards turn the box round too)
  const [r0, r1, c0, c1] = fl ? [7 - cr[1], 7 - cr[0], 7 - cr[3], 7 - cr[2]] : cr, FADE = .6 * u, id = 'ckc' + (++CROP_UID);
  const eT = r0 === 0, eB = r1 === 7, eL = c0 === 0, eR = c1 === 7;
  const x0 = eL ? 0 : pad + c0 * u - FADE, x1 = eR ? W : pad + (c1 + 1) * u + FADE, y0 = eT ? 0 : pad + r0 * u - FADE, y1 = eB ? W : pad + (r1 + 1) * u + FADE;
  const k = 100 / Math.max(x1 - x0, y1 - y0), bw = (x1 - x0) * k, bh = (y1 - y0) * k, ox = (100 - bw) / 2, oy = (100 - bh) / 2, f = FADE * k * .9, n = v => +v.toFixed(2);
  const stops = (len, s0, s1) => `<stop offset="0" stop-color="#fff" stop-opacity="${s0 ? 1 : 0}"/><stop offset="${n(s0 ? 0 : f / len)}" stop-color="#fff"/><stop offset="${n(s1 ? 1 : 1 - f / len)}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="${s1 ? 1 : 0}"/>`;
  return `<svg class="${o.cls || 'mini'} crop" viewBox="0 0 100 100"><defs>` +
    `<linearGradient id="${id}h" gradientUnits="userSpaceOnUse" x1="${n(ox)}" y1="0" x2="${n(ox + bw)}" y2="0">${stops(bw, eL, eR)}</linearGradient>` +
    `<linearGradient id="${id}v" gradientUnits="userSpaceOnUse" x1="0" y1="${n(oy)}" x2="0" y2="${n(oy + bh)}">${stops(bh, eT, eB)}</linearGradient>` +
    `<mask id="${id}H"><rect width="100" height="100" fill="url(#${id}h)"/></mask><mask id="${id}V"><rect width="100" height="100" fill="url(#${id}v)"/></mask></defs>` +
    `<g mask="url(#${id}V)"><g mask="url(#${id}H)"><svg x="${n(ox)}" y="${n(oy)}" width="${n(bw)}" height="${n(bh)}" viewBox="${n(x0)} ${n(y0)} ${n(x1 - x0)} ${n(y1 - y0)}">${s}</svg></g></g></svg>`;
}
// ---- crop for the list thumbnails: an 8x8 board shrunk to ~90px makes the pieces tiny, so a position with few pieces
// (endgame lessons / puzzles) shows only the part around them: the pieces (+ the diagram's marks and arrows) and one square around,
// at least 5x5, square or one square longer, taken to the board's edge when only one square would be left; still 7 or more → whole board.
// The answer of a puzzle is never used (that would be a hint).
var CROP_UID = 0;
// hand-tuned crops: 'pz:<theme id>:<index>' | 'ls:<step id>' → [c0, r0, c1, r1] (columns / rows 0-7 from the top-left as Black sees it), or false = whole board
// (a puzzle / lesson problem / diagram can also carry its own .crop)
const CROP = {};
function cropOf(spec, extra, key, data) {
  const m = CROP[key] !== undefined ? CROP[key] : data && data.crop !== undefined ? data.crop : null;
  if (m === false) return null;
  if (Array.isArray(m) && m.length === 4) { const [a, b, c, d] = m.map(Number); return [Math.min(b, d), Math.max(b, d), Math.min(a, c), Math.max(a, c)]; }
  const S = []; for (let i = 0; i < 32; i++) if (spec.b[i] && spec.b[i] !== '.') S.push(i);
  for (const i of extra || []) if (i >= 0 && i < 32) S.push(i);
  if (!S.length) return null;
  const rs = S.map(i => E.RC[i][0]), cs = S.map(i => E.RC[i][1]);
  let r0 = Math.max(0, Math.min(...rs) - 1), r1 = Math.min(7, Math.max(...rs) + 1), c0 = Math.max(0, Math.min(...cs) - 1), c1 = Math.min(7, Math.max(...cs) + 1);
  const grow = (a, b, len) => { while (b - a + 1 < len) { if (b < 7 && (a <= 0 || 7 - b <= a)) b++; else a--; } return [a, b]; };
  const snap = () => { if (r0 === 1) r0 = 0; if (r1 === 6) r1 = 7; if (c0 === 1) c0 = 0; if (c1 === 6) c1 = 7; };
  [r0, r1] = grow(r0, r1, 5); [c0, c1] = grow(c0, c1, 5); snap();
  const Wd = c1 - c0 + 1, Ht = r1 - r0 + 1;
  if (Wd < Ht - 1) [c0, c1] = grow(c0, c1, Ht - 1); else if (Ht < Wd - 1) [r0, r1] = grow(r0, r1, Wd - 1);
  snap();
  return Math.max(c1 - c0, r1 - r0) + 1 >= 7 ? null : [r0, r1, c0, c1];
}
// position spec from lists of square numbers (1..32): men / kings
function specOf(o) {
  const a = Array(32).fill('.');
  for (const x of o.b || []) a[x - 1] = 'b'; for (const x of o.bk || []) a[x - 1] = 'B';
  for (const x of o.w || []) a[x - 1] = 'w'; for (const x of o.wk || []) a[x - 1] = 'W';
  return { b: a.join(''), side: o.side || P1 };
}

// ---------------------------------------------------------------- rules: hands-on tutorial (shared/ruletour.js)
// The player has the White men (at the bottom, moving up). Only the basics: moving, jumping (compulsory, multiple),
// kings, how to win and draws. Tactics and strategy are left to the lessons.
function tourPage(id, spec, o) {
  return {
    id, title: () => t('tr.' + id + '.t'), body: () => t('tr.' + id + '.b').split('\n').map(x => `<p>${x}</p>`).join(''),
    task: () => t('tr.' + id + '.task'),
    setup(api) {
      const pos = E.Pos.from(spec);
      const st = { sel: -1, trail: [], last: -1, busy: false, done: false };
      const draw = () => {
        if (!api.alive()) return;
        let dest = [];
        if (st.sel >= 0) { const k = st.trail.length; for (const m of pos.moves().filter(m => mFrom(m) === st.sel)) { const p = E.path(pos, m); if (p.length > k && st.trail.every((x, j) => p[j] === x)) dest.push(p[k]); } }
        const sp = pos.spec();
        if (st.sel >= 0 && st.trail.length > 1) { const a = sp.b.split(''); const ch = a[st.sel]; a[st.sel] = '.'; a[st.trail[st.trail.length - 1]] = ch; sp.b = a.join(''); }
        api.board.innerHTML = miniSVG(sp, { cls: 'tour', sel: st.sel >= 0 ? st.trail[st.trail.length - 1] : -1, dest, last: st.last, click: !st.done && !st.busy });
      };
      function commit(m) {
        const crown = pos.promotes(m), cap = mCap(m);
        pos.play(m); st.sel = -1; st.trail = []; st.last = mTo(m);
        if (cap) { sHop(); sTake(120); } else sPlace();
        if (crown) setTimeout(() => sCrown(), 160);
        const r = o.check ? o.check(m, pos, crown) : null;
        if (r === 'ok') { st.done = true; draw(); api.ok(t('tr.' + id + '.ok')); return; }
        if (typeof r === 'string') { st.done = true; draw(); api.ng(r); return; }
        draw();
        if (o.reply && pos.status() === 0) {   // Black answers (a random quiet move)
          st.busy = true; draw(); api.say(t('thinking'));
          api.sleep(600).then(() => {
            const all = pos.moves(), pick = all[Math.floor(Math.random() * all.length)];
            pos.play(pick); st.last = mTo(pick); sPlace(true); st.busy = false;
            api.say(''); draw();
          });
        }
      }
      function click(i) {
        const legal = pos.moves(), me = pos.turn, v = pos.at(i), mine = v && ((v <= 2 ? P1 : P2) === me);
        if (mine && (st.sel < 0 || st.trail.length === 1)) {
          if (st.sel === i) { st.sel = -1; st.trail = []; draw(); return; }
          if (!legal.some(m => mFrom(m) === i)) { api.say(legal.length && mCap(legal[0]) ? t('cant.mustJump') : t('cant.stuck'), 'ng'); return; }
          st.sel = i; st.trail = [i]; playTick(); api.say(''); draw(); return;
        }
        if (st.sel < 0) { api.say(t('pick.own')); return; }
        const k = st.trail.length, paths = legal.filter(m => mFrom(m) === st.sel).map(m => ({ m, p: E.path(pos, m) })).filter(x => x.p.length > k && st.trail.every((s, j) => x.p[j] === s));
        const next = paths.filter(x => x.p[k] === i);
        if (next.length === 1 && next[0].p.length === k + 1) { commit(next[0].m); return; }
        if (next.length) { const done = next.filter(x => x.p.length === k + 1); if (done.length && done.length === next.length) { commit(done[0].m); return; } st.trail.push(i); sHop(); draw(); return; }
        const ends = paths.filter(x => mTo(x.m) === i);
        if (ends.length === 1) { commit(ends[0].m); return; }
        api.say(legal.length && mCap(legal[0]) ? t('cant.mustJump') : t('cant.move'));
      }
      api.board.onclick = e => { const el = e.target.closest('[data-p]'); if (!el || st.busy || st.done || !api.alive()) return; ctx(); click(+el.dataset.p); };
      draw();
    },
  };
}
const tourRead = (id, html) => ({ id, title: () => t('tr.' + id + '.t'), body: () => t('tr.' + id + '.b').split('\n').map(x => `<p>${x}</p>`).join(''), html });
// page 1: what the game is (history / how to win / culture), read only — common spec
const introPage = () => ({ id: 'intro', title: () => t('intro.t'), body: '', html: () => RuleTour.intro({ lang: LANG, img: '../images/atlas/checkers.webp', origin: t('intro.origin'), players: t('intro.players'), time: t('intro.time'), history: t('intro.hist'), win: t('intro.win'), culture: t('intro.cult') }) });
const TOUR_PAGES = [
  introPage(),
  tourRead('board', () => `<div class="tour-pic">${miniSVG({ b: 'bbbbbbbbbbbb........wwwwwwwwwwww', side: P1 }, { cls: '' })}</div>`),
  tourPage('move', specOf({ b: [1, 2, 3, 6], w: [21, 22, 23, 26, 27], side: P2 }), { check: m => !mCap(m) ? 'ok' : null }),
  tourPage('jump', specOf({ b: [14, 3], w: [18, 27, 29], side: P2 }), { check: m => mCap(m) ? 'ok' : t('tr.jump.ng') }),
  tourPage('must', specOf({ b: [15, 2, 4], w: [19, 22, 25, 28], side: P2 }), { check: m => mCap(m) ? 'ok' : t('tr.jump.ng') }),
  tourPage('multi', specOf({ b: [19, 11, 2], w: [23, 30], side: P2 }), { check: m => capCount(m) >= 2 ? 'ok' : t('tr.multi.ng') }),
  tourPage('king', specOf({ b: [12, 16], w: [6, 25, 30], side: P2 }), { check: (m, a, crown) => crown ? 'ok' : t('tr.king.ng') }),
  tourPage('kingmove', specOf({ b: [10, 3], wk: [6], w: [29, 31], side: P2 }), { check: (m, a) => mCap(m) && E.RC[mTo(m)][0] > E.RC[mFrom(m)][0] ? 'ok' : t('tr.kingmove.ng') }),
  tourPage('win', specOf({ b: [22], w: [26, 31], wk: [], side: P2 }), { check: (m, a) => a.status() === -1 ? 'ok' : t('tr.win.ng') }),
  tourPage('block', specOf({ b: [28], w: [21], wk: [27], side: P2 }), { check: (m, a) => a.status() === -1 ? 'ok' : t('tr.block.ng') }),
  tourRead('draw', () => `<div class="tour-pic">${miniSVG(specOf({ bk: [1], wk: [32, 28] }), { cls: '', arrows: [[27, 23]] })}</div>`),
];
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
  $('#fRules').classList.add('hidden');
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
function openNewDialog() {
  draft = { mode: lesson ? 'lesson' : puzzle ? 'puzzle' : rgame && settings.mode === 'ai' ? 'rated' : settings.mode === 'online' ? 'pvp' : settings.mode, color: settings.color, level: settings.level, level2: settings.level2 };
  $('#optEval').checked = settings.eval; $('#optLast').checked = settings.last; $('#optAnim').checked = settings.anim; $('#optThreat').checked = settings.threat; $('#optNum').checked = settings.num;
  segSync(); designPickers(); showOverlay('#newOverlay');
}
$('#bdRow').addEventListener('click', e => { const b = e.target.closest('button[data-bd]'); if (!b) return; settings.bd = b.dataset.bd; designApply(); designPickers(); save(); });
$('#pcRow').addEventListener('click', e => { const b = e.target.closest('button[data-pcs]'); if (!b) return; settings.pcs = b.dataset.pcs; designApply(); designPickers(); save(); });
$('#segMode').onclick = e => { const b = e.target.closest('button'); if (b && b.dataset.v) { draft.mode = b.dataset.v; segSync(); } };
$('#segColor').onclick = e => { const b = e.target.closest('button'); if (b) { draft.color = +b.dataset.v; segSync(); } };
$('#ngRulesHelp').onclick = () => openRules();
$('#levelRange').oninput = e => { draft.level = +e.target.value; segSync(); };
$('#levelRange2').oninput = e => { draft.level2 = +e.target.value; segSync(); };
$('#btnCancelNew').onclick = () => hideOverlay('#newOverlay');
$('#btnStart').onclick = () => {
  if (draft.mode === 'online') return;   // handled by online-ui.js
  hideOverlay('#newOverlay');
  if (draft.mode === 'lesson') { openLessons(); return; }
  if (draft.mode === 'puzzle') { openPuzzles(); return; }
  Object.assign(settings, { eval: $('#optEval').checked, last: $('#optLast').checked, anim: $('#optAnim').checked, threat: $('#optThreat').checked, num: $('#optNum').checked });
  if (draft.mode === 'rated') { rtStart(); return; }
  exitSpecial();
  Object.assign(settings, { mode: draft.mode, color: draft.color, level: draft.level, level2: draft.level2 });
  newGame();
};

// ====================================================================== rated games vs the AI (solo)
const RT_STORE = STORE + '-rated', RT_START = 1000, RT_CLOCK = { base: 300000, inc: 3000 };
// rating of each AI step on the kyu / dan scale (100 points per kyu: 15級 = 450 … 1級 = 1850, then 200 per dan)
// measured: adjacent levels played each other (tools/native.c lv, see MODEL_CARD.md); about +125 per step up to 3級, smaller above
const RT_LV = [0, 450, 575, 700, 825, 950, 1075, 1200, 1325, 1450, 1575, 1700, 1825, 1950, 2030, 2090, 2150, 2200, 2250, 2300, 2350];
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
function pzProgress() { try { return JSON.parse(localStorage.getItem(PZ_STORE) || '{}'); } catch (e) { return {}; } }
let introIdx = 0;
let savedGame = null;
function stashGame() { if (!lesson && !puzzle) savedGame = { moves, cur, evals: evals.slice(), humanColor }; }
function exitSpecial() {
  if (!lesson && !puzzle) return;
  lesson = null; puzzle = null; lessonMarks = []; labelList = null;
  document.body.classList.remove('in-lesson', 'in-puzzle');
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
  basics: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#efe5cf" stroke="#8f8166" stroke-width="1.5"/><circle cx="12" cy="12" r="5" fill="none" stroke="#b9ab8e" stroke-width="1.2"/></svg>',
  tactics: '<svg viewBox="0 0 24 24"><circle cx="7" cy="16" r="5" fill="#3b302b" stroke="#0d0a09"/><circle cx="17" cy="8" r="5" fill="#efe5cf" stroke="#8f8166"/><path d="M4 21 20 3" stroke="#ffe9a8" stroke-width="2" stroke-linecap="round"/></svg>',
  endgame: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" fill="#3b302b" stroke="#0d0a09"/><path d="M6 15 7 8l3 3 2-4 2 4 3-3 1 7z" fill="#f2d27a" stroke="#7a5a1c" stroke-width=".8"/></svg>',
  strategy: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="#d3be93"/><path d="M3 3h6v6H3zM15 3h6v6h-6zM9 9h6v6H9zM3 15h6v6H3zM15 15h6v6h-6z" fill="#2c5440"/></svg>',
};
const lsIcon = k => `<span class="ic sv">${LS_ICON[k] || '●'}</span>`;
const plainText = html => String(html || '').replace(/<br\s*\/?>|<\/p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const lxBar = (p, cls) => `<span class="lx-bar ${cls || ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span>`;
const lxSt = (r, okTxt) => r ? (r[okTxt ? 'pass' : 'clear'] ? `<span class="lx-st ok">✓ ${okTxt ? '' : t('ls.clear') + ' '}${t('u.pt', { n: r.best })}</span>` : `<span class="lx-st">${t('u.pt', { n: r.best })}</span>`) : `<span class="lx-st new">${t('ls.notyet')}</span>`;
function diagSVG(d, cls, crop) {
  const marks = {}; for (const [n, k] of d.marks || []) marks[n - 1] = k;
  return miniSVG(specOf(d), { cls, marks, arrows: (d.arrows || []).map(a => a.map(x => x - 1)), flip: !!d.flip, crop });
}
function lessonThumb(s) {
  const d = s.diagram;
  if (d) { const sp = specOf(d), ex = (d.marks || []).map(m => m[0] - 1).concat(...(d.arrows || []).map(a => a.map(x => x - 1))); return diagSVG(d, 'lxb', cropOf(sp, ex, 'ls:' + s.id, d)); }
  const P = s.problems[0]; return P && P.s ? miniSVG(P.s, { cls: 'lxb', flip: P.s.side === P1, crop: cropOf(P.s, null, 'ls:' + s.id, P) }) : '';
}
const pzThumbSVG = (T, j, P) => miniSVG(P.s, { cls: 'lxb', flip: P.s.side === P1, crop: cropOf(P.s, null, 'pz:' + T.id + ':' + j, P) });
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
  $('#liStep').textContent = t('course.' + (s.course || 'tactics')) + ' · STEP ' + stepNo(i);
  $('#liTitle').textContent = t('ls.' + s.id + '.title');
  $('#liBody').innerHTML = (s.diagram ? diagSVG(s.diagram, 'mini') : '') + t('ls.' + s.id + '.intro');
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
  startSpec = spec;
  moves = []; cur = 0; reviewing = false; hintList = null; lessonMarks = []; labelList = null; evals = [];
}
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
  const P = lessonProblem();
  lesson.me = P.s.side;
  enterSpecial(P.s);
  lesson.answered = false; lesson.hinted = false;
  update(false); renderLessonCard();
  $('#lsFb').innerHTML = '';
}
function renderLessonCard() {
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
  if (P.ok) return P.ok.includes(m) ? 20 : 0;
  const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;
  if (mine >= best - 6 && !(best > WINT && mine < best)) return 20;
  if (best > WINT && mine > WINT) return 16;          // a slower forced win
  if (best > WINT && mine <= WINT) return mine > -WINT && mine >= 150 ? 8 : mine > -60 ? 4 : 0;
  if (mine < -WINT && best >= -WINT) return 0;
  const loss = sOfV(best) - sOfV(mine);
  return Math.max(0, Math.round(20 * (1 - loss / 0.5)));
}
function markMove(pos, mm, cls) { lessonMarks.push({ arrow: E.path(pos, mm), cls }); lessonMarks.push({ at: mTo(mm), cls }); }
function lessonAnswer(m) {
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
  const tok = busyToken;
  setTimeout(() => {
    if (!lesson || tok !== busyToken) return;
    // back to the problem: the answer (gold), your move (red) and the value of each landing square
    moves = []; cur = 0; sel = null; lessonMarks = [];
    markMove(pos0, best, 'ok'); if (m !== best) markMove(pos0, m, 'ng');
    const g = new Map(); for (const [mm, v] of P.sc) { const k = mTo(mm); if (!g.has(k) || v > g.get(k)) g.set(k, v); }
    const bv = Math.max(...g.values());
    labelList = [...g].map(([at, v]) => { const L = valLabel(v); return { at, big: L.big, small: L.small, cls: L.cls + (v === bv ? ' best' : '') }; });
    update(false);
  }, moveDur(m, pos0) + 700);
}
function okAnswer(P, s, m, pts) {
  const pos0 = posAt(0).pos;
  lesson.results[lesson.i] = pts; renderLessonCard();
  const best = P.ok.includes(m) ? m : P.best;
  $('#lsFb').innerHTML = `<span class="pts ${pts ? 'ok' : 'ng'}">+${t('u.pt', { n: pts })}</span> <b class="${pts ? 'ok' : 'ng'}">${t(pts ? 'fb.perfect' : 'fb.bad')}</b> ` + (pts ? t('ls.' + s.id + '.why', { m: mvIn(pos0, m) }) : t('ls.' + s.id + '.ng', { m: mvIn(pos0, best), x: mvIn(pos0, m) }));
  playChime(!!pts); playMove2(m);
  const tok = busyToken;
  setTimeout(() => {
    if (!lesson || tok !== busyToken) return;
    moves = []; cur = 0; sel = null; lessonMarks = [];
    markMove(pos0, best, 'ok'); if (!pts) markMove(pos0, m, 'ng');
    update(false);
  }, moveDur(m, pos0) + 700);
}
$('#lsHint').onclick = () => {
  if (lesson && lesson.study) { if (lesson.i > 0) { lesson.i--; showStudy(false); } return; }
  if (!lesson || lesson.answered) return;
  lesson.hinted = true;
  const s = curStep(), P = lessonProblem();
  lessonMarks = [];
  const good = P.ok || [P.best];
  for (const f of new Set(good.map(mFrom))) lessonMarks.push({ at: f, cls: 'ok' });
  $('#lsFb').innerHTML = lesson.virt ? t('op.hint') : t('ls.' + s.id + '.hint');
  renderFx();
};
$('#lsNext').onclick = () => {
  if (lesson && lesson.study) { if (lesson.i < lesson.g.study.line.length) { lesson.i++; showStudy(true); } else startPractice(lesson.gi); return; }
  if (!lesson || !lesson.answered) return;
  const s = curStep();
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
  const nx = LESSONS.steps[lesson.step + 1];
  if (pass && s.course === 'basics' && !(nx && nx.course === 'basics')) $('#ldSub').innerHTML += `<p class="ls-grad">${t('course.graduate')}</p>`;
  showLessonView('lessonDoneView'); showOverlay('#lessonOverlay');
  if (pass) confetti();
};
$('#lsQuit').onclick = () => quitSpecial();
$('#lsList').onclick = () => { if (!lesson) return; if (lesson.study || lesson.virt) openOpenings(); else openLessons(null, LESSONS && LESSONS.steps[lesson.step] && (LESSONS.steps[lesson.step].course || 'tactics')); };

// ====================================================================== openings (famous lines, studied move by move, then practice)
let OPEN = null, openChoiceIdx = -1;
const openReady = fetch('openings.json?v=2').then(r => r.json()).then(d => (OPEN = d)).catch(() => null)
  .then(() => { if (!OPEN) document.querySelectorAll('.ls-tabs button[data-v=open]').forEach(b => b.remove()); });
const OP_STORE = STORE + '-open';
function opProg() { try { return JSON.parse(localStorage.getItem(OP_STORE) || '{}'); } catch (e) { return {}; } }
const LL = o => o ? (o[LANG] !== undefined ? o[LANG] : o.en !== undefined ? o.en : o.ja) : '';
const opShort = g => g.short ? LL(g.short) : t('op.' + g.id + '.short');
const opIntro = g => g.intro ? LL(g.intro) : String(t('op.' + g.id + '.intro')).split('\n');
let opGrpSel = '';
function lineSpec(line) { return E.replay(null, line).pos.spec(); }
function opThumb(g) {
  const k = g.show || 3, pre = g.study.line.slice(0, k), key = pre[pre.length - 1];
  return miniSVG(lineSpec(pre), { cls: 'lxb', last: key !== undefined ? mTo(key) : -1 });
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
  $('#liBody').innerHTML = miniSVG(lineSpec(pre), { last: last !== undefined ? mTo(last) : -1 }) + opIntro(g).map(x => `<p>${x}</p>`).join('') +
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
  savedGame = null; exitSpecial();
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
const puzzlesReady = fetch('puzzles.json?v=3').then(r => r.json()).then(d => (PUZZLES = d)).catch(() => null);
let pzLevel = 0;
const pzKey = (id, j) => id + '-' + j;
const starVal = x => x === true ? 3 : (+x || 0);
// Puzzles replaced on 2026-10-21 (fun score, tools/refresh_fun.js): PUZZLES.old[themeId-j] keeps the previous puzzle of the slot.
// A player who already had a record for the slot when this set first loaded keeps the old puzzle (the list is frozen then,
// so solving the new puzzle later does not switch it back); daily puzzles dated up to PUZZLES.cut keep the old puzzle too.
let pzOldSet = null;
function pzOldKeys() {
  if (pzOldSet) return pzOldSet;
  const old = (PUZZLES && PUZZLES.old) || {}, key = STORE + '-pz-old-' + (PUZZLES && PUZZLES.cut || '');
  let s = null; try { s = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
  if (!Array.isArray(s)) {
    const pr = pzProgress(); s = Object.keys(old).filter(k => pr[k] !== undefined);
    try { if (Object.keys(old).length) localStorage.setItem(key, JSON.stringify(s)); } catch (e) {}
  }
  return (pzOldSet = new Set(s));
}
function pzAt(T, j, date) {
  const P = T.puzzles[j], o = PUZZLES && PUZZLES.old && PUZZLES.old[pzKey(T.id, j)];
  if (!o) return P;
  if (date && PUZZLES.cut && date <= PUZZLES.cut) return o;
  return pzOldKeys().has(pzKey(T.id, j)) ? o : P;
}
function pzRecs(T, pr) { pr = pr || pzProgress(); return T.puzzles.map((_, j) => starVal(pr[pzKey(T.id, j)])); }
function themeTier(T) { const n = T.puzzles.reduce((a, P) => a + (P.n || 1), 0) / Math.max(1, T.puzzles.length); return Math.max(0, Math.min(5, Math.round((n - 1) * 1.2))); }
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
// collection home (the layout of 詰めオセロ, PZBook.home): hero → daily → tabs 勝ち / ショット / 終盤 → theme cards with the position
const PZ_LAST = STORE + '-pz-last', PZ_TAB = STORE + '-pz-tab', PZ_GRPS = ['Win', 'Shot', 'End'], PZ_GIC = { Win: 'trophy', Shot: 'bolt', End: 'crown' };
const PZ_TSVG = {
  shot22: '<path d="M4 18 10 12l4 4 6-6"/><path d="M16 10h4v4"/><circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="2"/>',
  ekings: '<path d="M3 9l4.5 3.5L12 6l4.5 6.5L21 9l-2 9H5z"/>',
  emen: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3.5"/>',
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
const leadOf = (pos, p) => pos.count(p) - pos.count(3 - p);
function startPuzzle(L, j, daily) {
  hideOverlay('#puzzleOverlay');
  stashGame(); lesson = null; document.body.classList.remove('in-lesson');
  const T = PUZZLES.themes[L], P = pzAt(T, j, daily);
  const g = P.g || T.g || 0;
  if (!daily) PZBook.lastSet(PZ_LAST, L);
  puzzle = { L, j, P, T, goal: g ? 'gain' : 'win', g, me: P.s.side, n: P.n, state: 'play', busy: false, used: 0, daily: daily || null, hinted: false, failed: false, answered: false };
  document.body.classList.add('in-puzzle');
  enterSpecial(P.s);
  puzzle.base = leadOf(posAt(0).pos, puzzle.me);
  update(false); renderPuzzleCard(); pzStatus(t('pz.start'));
}
function renderPuzzleCard() {
  const Pz = puzzle, L = Pz.T, gain = Pz.goal === 'gain';
  $('#pzStep').textContent = Pz.daily ? `★ ${t('daily.title')} · ${Pz.daily.slice(5).replace('-', '/')}` : `${t('pz.th.' + L.id)} · ${PZBook.t('stage', { n: Math.floor(Pz.j / PZBook.STAGE) + 1 })} · No.${Pz.j + 1}`;
  $('#pzTitle').textContent = t(gain ? 'pz.gainIn' : 'pz.winIn', { n: Pz.n, g: Pz.g });
  $('#pzGoal').innerHTML = `<span class="pdisc p${Pz.me}"></span><span>${t(gain ? 'pz.goalGain' : 'pz.goal', { c: pname(Pz.me), n: Pz.n, g: Pz.g })}</span>`;
  $('#pzDots').innerHTML = Array.from({ length: Pz.n }, (_, i) => `<i class="${i < Pz.used ? (Pz.bad && Pz.bad.includes(i) ? 'ng' : 'ok') : ''} ${i === Pz.used && Pz.state === 'play' ? 'cur' : ''}"></i>`).join('');
  $('#pzNext').disabled = !!Pz.daily || Pz.j + 1 >= L.puzzles.length || !PZBook.isOpen(pzRecs(L), Pz.j + 1);
  $('#pzHint').disabled = Pz.state !== 'play'; $('#pzAnswer').disabled = Pz.busy;
  renderInfo();
}
function pzStatus(html) { $('#pzStatus').innerHTML = html; }
// engine.c puzzle() measures the attacker's gain from the lead of the position searched (defend = 0), so pass the gain
// still missing against the puzzle start (at least 1) when the lead has changed on the way (e.g. after a sacrifice)
function mateReq(n, defend) {
  let goal = puzzle ? puzzle.g : 0;
  if (goal && !defend) goal = Math.max(1, goal - (leadOf(posAt(cur).pos, puzzle.me) - puzzle.base));
  return request('ai', { type: 'puzzle', moves: moves.slice(0, cur), n, defend: !!defend, goal, base: puzzle ? puzzle.base : 0 }).then(r => r && r.list);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function pickDefence(list) { let best = null; for (const e of list) { const v = e.need === 0 ? 99 : e.need < 0 ? 50 : e.need; if (!best || v > best.v) best = { m: e.m, v }; } return best.m; }
function pickAttack(list, left) { let best = null; for (const e of list) if (e.need > 0 && e.need <= left && (!best || e.need < best.need)) best = e; return best && best.m; }
const pzReached = (Pz, pos) => pos.status() === -1 || (Pz.goal === 'gain' && !pos.hasCaps() && leadOf(pos, Pz.me) - Pz.base >= Pz.g);
// ---- puzzles v2: a wrong move does not end the puzzle at once. The defender (the engine's best reply) answers and the
// player may keep going until the puzzle's move count is used up; reaching the goal within it still counts (★★).
// "Obvious mistake" (flagged at once; the move is taken back and the correct move shown):
//   1. losing at once: after the move the opponent wins with its very next move;
//   2. a free piece: the move lets the opponent jump a piece, while a correct move allows no capture at all;
//   3. goal out of reach: even if the opponent cooperated, the goal cannot be reached in the moves left
//      (checked exactly by a small search when at most 2 own moves remain after this one; otherwise not claimed).
function pzCoop(Pz, pos, k, bud) {   // defender to move; can the attacker reach the goal within k own moves if the defender helps?
  for (const d of pos.moves()) {
    if (--bud.n < 0) return null;
    const q = pos.clone().play(d); if (q.status() === -1) continue;
    for (const a of q.moves()) {
      if (--bud.n < 0) return null;
      const r = q.clone().play(a);
      if (pzReached(Pz, r)) return true;
      if (k > 1) { const x = pzCoop(Pz, r, k - 1, bud); if (x !== false) return x; }
    }
  }
  return false;
}
function pzBlunder(Pz, before, m, list, left) {
  const good = list.filter(x => x.need > 0 && x.need <= left);
  const after = before.clone().play(m);
  if (after.status() !== 0) return null;
  if (after.moves().some(x => after.clone().play(x).status() === -1)) return 'lose';
  if (after.hasCaps() && good.length && good.every(g => !before.clone().play(g.m).hasCaps())) return 'give';
  if (left - 1 >= 1 && left - 1 <= 2 && pzCoop(Pz, after, left - 1, { n: 200000 }) === false) return 'reach';
  return null;
}
async function puzzleMove(m) {
  const Pz = puzzle; Pz.busy = true; lessonMarks = [];
  const left = Pz.n - Pz.used, tok = busyToken;
  pzStatus(t('pz.checking'));
  const list = await mateReq(left);       // values of the position before the move
  if (!list || puzzle !== Pz || tok !== busyToken) return;
  const before = posAt(cur).pos.clone();
  playMove2(m);
  Pz.used++;
  renderPuzzleCard();
  const e = list.find(x => x.m === m), dm = moveDur(m, before);
  if (pzReached(Pz, posAt(cur).pos)) { setTimeout(() => puzzleSolved(), dm + 200); return; }
  const good = list.filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need);
  const failBack = async html => {
    Pz.state = 'fail'; Pz.busy = false; Pz.failed = true;
    await sleep(dm + 300);
    if (puzzle !== Pz) return;
    moves = moves.slice(0, cur - 1); cur = moves.length; Pz.used--;
    const p0 = posAt(cur).pos;
    if (good[0]) markMove(p0, good[0].m, 'ok'); markMove(p0, m, 'ng');
    update(false); playChime(false);
    pzStatus(html); renderPuzzleCard();
  };
  if (!e || !(e.need > 0) || e.need > left) {
    if (left <= 1) {
      await failBack(good.length ? `<b class="ng">${t('pz.fail')}</b> ${t(Pz.goal === 'gain' ? 'pz.failGain' : 'pz.failWhy', { m: mvIn(before, m), b: mvIn(before, good[0].m), n: Pz.n, g: Pz.g })}`
        : `<b class="ng">${t('pz.fail')}</b> ${PZBook.t('outOfMoves', { n: Pz.n })}`);
      return;
    }
    const why = pzBlunder(Pz, before, m, list, left);
    if (why) { await failBack(`<b class="ng">${PZBook.t('blunder')}</b> ${t('pz.bl.' + why, { n: Pz.n, m: mvIn(before, m) })}${good.length ? ' ' + t('pz.best', { b: mvIn(before, good[0].m) }) : ''}`); return; }
    // not the solution, but play on: the defender answers with the engine's best move
    Pz.failed = true; Pz.strayed = true; (Pz.bad = Pz.bad || []).push(Pz.used - 1);
    renderPuzzleCard();
    pzStatus(t('pz.checking'));
    const res = await request('ai', { type: 'think', moves: moves.slice(0, cur), level: 17 });
    if (!res || puzzle !== Pz || tok !== busyToken) return;
    await sleep(Math.max(0, dm + 250));
    if (puzzle !== Pz) return;
    if (res.move === undefined || res.move < 0) { Pz.state = 'fail'; Pz.busy = false; renderPuzzleCard(); pzStatus(`<b class="ng">${t('pz.fail')}</b> ${PZBook.t('outOfMoves', { n: Pz.n })}`); return; }
    const b2 = posAt(cur).pos; playMove2(res.move);
    await sleep(moveDur(res.move, b2));
    if (puzzle !== Pz) return;
    Pz.busy = false;
    if (statusAt(cur).over) { Pz.state = 'fail'; playChime(false); renderPuzzleCard(); pzStatus(`<b class="ng">${t('pz.fail')}</b> ${PZBook.t('outOfMoves', { n: Pz.n })}`); return; }
    renderPuzzleCard(); boardEl.classList.toggle('can', canHumanPlay());
    pzStatus(`<b class="ng">${t('pz.stray')}</b> ${PZBook.t('movesLeft', { n: Pz.n - Pz.used })}`);
    return;
  }
  pzStatus(t('pz.good'));
  const dl = await mateReq(Pz.n - Pz.used, true);
  if (!dl || puzzle !== Pz || tok !== busyToken) return;
  await sleep(Math.max(0, dm + 250));
  if (puzzle !== Pz) return;
  if (!dl.length) { puzzleSolved(); return; }
  const r = pickDefence(dl), b3 = posAt(cur).pos;
  playMove2(r);
  await sleep(moveDur(r, b3));
  if (puzzle !== Pz) return;
  if (pzReached(Pz, posAt(cur).pos) && toMoveAt(cur) !== Pz.me) { puzzleSolved(); return; }
  Pz.busy = false;
  renderPuzzleCard(); boardEl.classList.toggle('can', canHumanPlay());
  pzStatus(t('pz.yourMove', { n: Pz.n - Pz.used }));
}
function playMove2(m) { moves = moves.slice(0, cur); moves.push(m); cur = moves.length; hintList = null; update(true); }
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
  pzStatus(`<b class="ok">${t('pz.solved')}</b> ${t(Pz.goal === 'gain' ? 'pz.solvedGain' : 'pz.solvedSub', { n: Pz.used, g: Pz.g })}` + (Pz.daily ? `<br>🔥 ${t('daily.streak', { n: dailyInfo().streak })}` : '') + PZBook.solved({ stars, recs: after, j: Pz.j, events: ev }));
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
$('#pzHint').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.state !== 'play' || Pz.busy) return;
  const left = Pz.n - Pz.used, list = await mateReq(left); if (puzzle !== Pz || !list) return;
  Pz.hinted = true;
  const good = list.filter(x => x.need > 0 && x.need <= left);
  lessonMarks = [];
  for (const f of new Set(good.map(x => mFrom(x.m)))) lessonMarks.push({ at: f, cls: 'ok' });   // the piece to move, not the whole move
  renderFx();
  pzStatus(t('pz.hintText'));
};
$('#pzAnswer').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.busy) return;
  Pz.busy = true; Pz.state = 'answer'; Pz.hinted = true; Pz.answered = true; lessonMarks = []; hintList = null;
  moves = []; cur = 0; Pz.used = 0; Pz.bad = []; update(false); renderPuzzleCard();
  pzStatus(t('pz.showing'));
  for (let step = 0; step < 24; step++) {
    if (puzzle !== Pz) return;
    const pos = posAt(cur).pos;
    if (statusAt(cur).over || (cur > 0 && pzReached(Pz, pos) && toMoveAt(cur) !== Pz.me)) break;
    const att = toMoveAt(cur) === Pz.me, left = Pz.n - Pz.used;
    let m;
    if (att && step === 0) m = Pz.P.answer;
    else { const list = await mateReq(left, !att); if (puzzle !== Pz || !list) return; m = att ? pickAttack(list, left) : (list.length ? pickDefence(list) : null); }
    if (m == null) break;
    await sleep(700); if (puzzle !== Pz) return;
    playMove2(m); if (att) Pz.used++;
    renderPuzzleCard();
    await sleep(moveDur(m, pos));
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
        const res = await new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve }); w.postMessage({ type: 'analyze', start: st0, moves: game.slice(0, i), time: i < 10 ? 500 : 800, id }); });
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
// material after a move once all forced captures are played out (mover's view, pieces; a king counts 1.3)
function swapGain(pos, depth) {   // side to move: best net gain from the forced capture sequence starting now
  const caps = pos.caps(); if (!caps.length || depth > 10) return 0;
  let best = -Infinity;
  for (const c of caps) { const val = capValue(pos, c) - swapGain(pos.clone().play(c), depth + 1); if (val > best) best = val; }
  return best;
}
function capValue(pos, m) { let v = 0; for (const i of E.bitsOf(mCap(m))) v += pos.at(i) === 2 || pos.at(i) === 4 ? 1.3 : 1; if (pos.promotes(m)) v += 0.3; return v; }
const matAfter = (pos, m) => capValue(pos, m) - swapGain(pos.clone().play(m), 0);
// 振り返り解説: the move being viewed is explained; at the end of the game a short summary
const crName = (pos, x) => '<bdi>' + mvIn(pos, x) + '</bdi>';
function crExplain(i, j) {   // { kind, txt } for move i (played from position i)
  const pos = posAt(i).pos, m = j.m, b = j.best;
  if (pos.moves().length === 1) return { kind: '', txt: t('cr.forced') };
  if (!j.q) {
    if (j.ok) return { kind: capCount(m) >= 2 ? 'goodShot' : '', txt: capCount(m) >= 2 ? t('cr.bestShot', { n: capCount(m) }) : t('cr.best') };
    return { kind: '', txt: t('cr.good', { b: crName(pos, b) }) };
  }
  const gm = matAfter(pos, m), gb = matAfter(pos, b);
  if (gb >= gm + 0.9 && gb >= 0.9) return { kind: 'missShot', txt: t('cr.missShot', { b: crName(pos, b) }) };
  if (gm <= -0.9 && gb >= gm + 0.9) return { kind: 'allowShot', txt: t('cr.allowShot', { b: crName(pos, b) }) };
  if (pos.promotes(b) && !pos.promotes(m)) return { kind: 'missKing', txt: t('cr.missKing', { b: crName(pos, b) }) };
  const am = pos.clone().play(m), ab = pos.clone().play(b), canCrown = q => q.moves().some(x => q.promotes(x));
  if (canCrown(am) && !canCrown(ab)) return { kind: 'allowKing', txt: t('cr.allowKing', { b: crName(pos, b) }) };
  const backRow = pos.turn === P1 ? [0, 1, 2, 3] : [28, 29, 30, 31], men = pos.own(pos.side) & ~pos.k;
  if (backRow.includes(mFrom(m)) && (men & E.bit(mFrom(m))) && !backRow.includes(mFrom(b)) && pos.kings(3 - pos.turn) === 0) return { kind: 'backRank', txt: t('cr.backRank', { b: crName(pos, b) }) };
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
function sideLabel(p) { return settings.mode === 'ai' ? (p === humanColor ? t('you') : 'AI') : pname(p); }
function renderReview() {
  const card = $('#reviewCard');
  if (rv && !lesson && !puzzle && rv.key !== gameKey()) { rvCancel(); rv = null; rvOpen = false; }
  const show = !lesson && !puzzle && rvOpen && rv;
  card.classList.toggle('show', !!show);
  document.body.classList.toggle('rv-on', !!show);
  if (!show) return;
  let html;
  if (rv.running) {
    html = `<div style="font-size:12px;color:var(--muted)">${t('rv.running', { a: rv.done, b: rv.total })}</div><div class="rv-prog"><i style="width:${rv.total ? rv.done / rv.total * 100 : 0}%"></i></div>`;
  } else {
    const list = [];
    for (let i = 0; i < moves.length; i++) { const j = rvJudge(i); if (j && j.q) list.push({ i, ...j }); }
    html = rvCoach();
    const shown = list.length > 10 ? list.slice().sort((a, b) => (b.q === 'bad') - (a.q === 'bad') || b.loss - a.loss).slice(0, 10).sort((a, b) => a.i - b.i) : list;
    if (shown.length) html += `<div class="rv-list">${shown.map(x => `<button data-i="${x.i}" class="${cur === x.i ? 'cur' : ''}"><span class="tag ${x.q}">${t('q.' + x.q)}</span><span class="mv">${x.i + 1}. <i class="p${toMoveAt(x.i)}"></i>${mvAt(x.i)} → ${mvIn(posAt(x.i).pos, x.best)}</span><span class="ls">${x.desc}</span></button>`).join('')}</div>`;
    else html += `<div class="rv-note" style="color:#8fe3b8">${t('rv.clean')}</div>`;
    html += `<div class="rv-note" style="color:var(--dim);font-size:11px;line-height:1.6">${t('rv.note')}</div>`;
  }
  const keepTop = card.scrollTop;
  $('#rvBody').innerHTML = html;
  { const cb = $('#rvBody > .cr-box'); if (cb) card.style.setProperty('--rvh', Math.round(cb.getBoundingClientRect().bottom - card.getBoundingClientRect().top + card.scrollTop + 14) + 'px'); else card.style.removeProperty('--rvh'); card.scrollTop = keepTop; }
}
// on the board: the analysis of the viewed position, the move actually played and the best move
function drawReviewFx(svg) {
  if (lesson || puzzle || !rvOpen || !rv || rv.running || rv.key !== gameKey() || cur >= moves.length || sel) return false;
  const L = rv.list[cur]; if (!L) return false;
  drawHints(L, svg);
  const j = rvJudge(cur), m = moves[cur];
  fxDiv('mark played' + (j && j.q ? ' ' + j.q : ''), mTo(m));
  svgArrow(svg, E.path(posAt(cur).pos, m), 'pl');
  return true;
}
$('#rvBody').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
$('#rvClose').onclick = () => { rvOpen = false; if (rv && rv.running) rvCancel(); renderReview(); renderFx(); renderKifu(); };
$('#btnAnalyze').onclick = () => runReview();
$('#btnResAnalyze').onclick = () => { hideOverlay('#resultOverlay'); runReview(); };

// ====================================================================== share / load
const K64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
// 3 characters per move: from, to, and which of the legal moves with that from / to (almost always A)
function encMoves(list, start) {
  const pos = E.Pos.from(start || null); let s = '';
  for (const m of list) { const same = pos.moves().filter(x => mFrom(x) === mFrom(m) && mTo(x) === mTo(m)); s += K64[mFrom(m)] + K64[mTo(m)] + K64[Math.max(0, same.indexOf(m))]; pos.play(m); }
  return s;
}
function decMoves(s, start) {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 3) return null;
  const pos = E.Pos.from(start || null), out = [];
  for (let i = 0; i < s.length; i += 3) {
    const f = K64.indexOf(s[i]), to = K64.indexOf(s[i + 1]), k = K64.indexOf(s[i + 2]);
    const same = pos.moves().filter(x => mFrom(x) === f && mTo(x) === to);
    if (!same[k]) return null;
    out.push(same[k]); pos.play(same[k]);
  }
  return out;
}
// "1. 11-15 23-19 2. 8-11 22-17 ..." (PDN-like) or a share URL
function parseGameText(v) {
  v = (v || '').trim();
  const h = v.match(/#(.*)$/);
  if (h) { const q = new URLSearchParams(h[1]); if (!q.has('k')) return null; const list = decMoves(q.get('k') || ''); if (!list) return null; return { list, n: q.has('n') ? parseInt(q.get('n'), 10) : undefined }; }
  v = v.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/\*|1-0|0-1|1\/2-1\/2/g, ' ');
  const toks = v.split(/[\s,;]+/).filter(Boolean);
  if (!toks.length) return null;
  const pos = E.Pos.from(null), out = [];
  for (let k = 0; k < toks.length; k++) {
    if (!/^\d+([-x×:]\d+)+$/.test(toks[k])) return { bad: k + 1 };
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
$('#btnShare').onclick = async () => {
  if (!moves.length || lesson || puzzle || startSpec) { toast(t('nokifu')); return; }
  const url = location.origin + location.pathname + '#k=' + encMoves(moves) + (cur < moves.length ? '&n=' + cur : '');
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: t('meta.title'), url }); return; }
    await navigator.clipboard.writeText(url); toast(t('share.copied'), 1400);
  } catch (e) { if (e && e.name === 'AbortError') return; toast(url, 4000); }
};
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
if (window.RulesOffer) RulesOffer.init({ game: 'checkers', lang: () => LANG, open: () => openRules(null, 0), watch: '#rulesOverlay' });
const hadSave = load();
try { const sp = localStorage.getItem('atlas-sfx'); if (sp === '0' || sp === '1') settings.sound = sp === '1'; } catch (e) {} // サイト共通のサウンド設定（トップページと連動）
designApply();
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) { LANG = q; try { localStorage.setItem('aicoding-lang', q); } catch (e) {} } }
applyI18n();
flip = flipFor(); drawLines();
// PC header bar: title left, menu (new > undo > hint > rules > lessons > puzzles) + icons right, game info in between
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnResign', '#btnHint', '#btnRules', '#btnLesson', '#btnPuzzle'], lang: () => LANG }) : null;

// PC layout (common spec): [left: this game — players, evaluation, info] [board] [right: record, review, lesson / puzzle, watching].
// The right-hand cards move into their own column (.side-r) while the PC layout is on, and back into the one info column otherwise.
(() => {
  const side = document.querySelector('.app > .side'), L = side && side.querySelector('.side-in'); if (!L || !window.HeaderBar) return;
  const R = document.createElement('aside'); R.className = 'side side-r'; R.innerHTML = '<div class="side-in"></div>'; side.after(R);
  const RI = R.firstChild, home = new Map(), mq = matchMedia(HeaderBar.MEDIA);
  const SEL = ['#olWatch', '#lessonCard', '#puzzleCard', '#reviewCard', '.kifu-card'];
  const apply = () => {
    const pc = mq.matches;
    for (const sel of SEL) {
      const c = L.querySelector(':scope > ' + sel) || RI.querySelector(':scope > ' + sel); if (!c) continue;
      if (!home.has(c)) { if (c.parentNode !== L) continue; const ph = document.createComment('side'); L.insertBefore(ph, c); home.set(c, ph); }
      if (pc) RI.appendChild(c); else { const ph = home.get(c); ph.parentNode.insertBefore(c, ph.nextSibling); }
    }
    document.documentElement.classList.toggle('side3', pc);
  };
  const init = () => { apply(); const f = () => { apply(); window.dispatchEvent(new Event('resize')); }; if (mq.addEventListener) mq.addEventListener('change', f); else mq.addListener(f); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);
})();
if (HB) HB.onChange(() => { renderInfo(); renderFx(); });
if (window.CountTick) CountTick.setMuted(() => !settings.sound);
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
else if (!hadSave) { update(false); afterPosition(); }   // no saved game: the starting position, waiting (the settings dialog opens from 対局)
else { update(false); afterPosition(); }
// expose for tests
window.__ck = { get moves() { return moves; }, get cur() { return cur; }, settings, get rv() { return rv; }, rvJudge, dailyPick, parseGameText, encMoves, decMoves, onSquare, statusAt, posAt, newGame, get lesson() { return lesson; }, get puzzle() { return puzzle; }, get sel() { return sel; }, startLesson, startPuzzle, lessonsReady, puzzlesReady, get LESSONS() { return LESSONS; }, get PUZZLES() { return PUZZLES; }, playMove, viewAt };

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
document.querySelector('#rsResume').onclick = () => { document.querySelector('#resumeOverlay').classList.remove('show'); if (reviewing) resumeHere(); };
// record navigation (first / prev / play / next / last) under the evaluation graph, with ← → ↑ ↓ and Space
let playTimer = 0;
function stopPlay() { clearInterval(playTimer); playTimer = 0; const b = document.querySelector('#navPlay'); if (b) b.classList.remove('playing'); }
function navGo(what) {
  if (lesson || puzzle) return;
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
  e.preventDefault(); if (tg && tg.blur && tg !== document.body) tg.blur();
  navGo(k);
});
window.addEventListener('resize', () => renderFx());
