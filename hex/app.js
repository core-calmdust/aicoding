'use strict';
// Hex — page script. Same structure as Checkers (the site's reference page): board + side panel, AI (20 steps) in Web Workers,
// rated games vs the AI (予備選), lessons, openings (first-move map + studies), puzzles (PZBook v2), post-game review with a coach,
// share / paste, daily puzzle. Online play: online.js + online-ui.js.
// ====================================================================== rules (shared with the engine)
const E = window.HexEngine, WIN = E.WIN, WINT = E.WINT, SWAP = E.SWAP;
const P1 = 1, P2 = 2;                 // P1 = Red (moves first, joins top and bottom), P2 = Blue (left and right)
const SIZES = [7, 9, 11, 13];
let gN = 11, gSwap = true;            // the board size and swap rule of the game on the board
let gv = 's11';                       // variant id (online): 's' + size
let HB = null;                        // PC header bar (shared/headerbar.js)
let startSpec = null;                 // lesson / puzzle start position (null = an empty board of gN with gSwap)
let moves = [];                       // game record (cell numbers, SWAP)
let cur = 0;                          // number of moves shown
function setVariant(n) { gN = SIZES.includes(+n) ? +n : 11; gv = 's' + gN; }
const startObj = () => startSpec || { n: gN, swap: gSwap };
const startKey = () => startSpec ? startSpec.n + ':' + startSpec.b + '/' + startSpec.side : 'n' + gN + (gSwap ? 's' : '');
const keyOf = i => startKey() + '|' + moves.slice(0, i).join(',');
let posCache = { key: '' };
function posAt(i) {
  const key = keyOf(i);
  if (posCache.key === key) return posCache;
  const r = E.replay(startObj(), moves.slice(0, i));
  posCache = { key, pos: r.pos };
  return posCache;
}
// {over, winner, why}
function statusAt(i) {
  if (manualEnd && manualEnd.n === moves.length && i === moves.length && !lesson && !puzzle && settings.mode !== 'online') return manualEnd;
  if (settings.mode === 'online' && window.olOver && i === moves.length && !lesson && !puzzle) { const o = olOver(); if (o) return o; }
  if (rgame && rgame.over && i === moves.length && !lesson && !puzzle) return rgame.over;
  return E.judge(posAt(i).pos);
}
const toMoveAt = i => posAt(i).pos.side;
const mvAt = (i, html) => { const s = E.name(posAt(i).pos, moves[i]); return html && moves[i] === SWAP ? `<span class="x">⇄</span> ${t('mv.swap')}` : moves[i] === SWAP ? t('mv.swap') : s; };
const mvIn = (pos, m) => m === SWAP ? t('mv.swap') : E.name(pos, m);
const mvName = (m, n) => m === SWAP ? t('mv.swap') : E.nameOf(m, n);

// ====================================================================== state
const STORE = 'aicoding-hex';
const settings = { mode: 'ai', n: 11, swap: true, color: 1, level: 6, level2: 6, anim: true, sound: true, hint: false, eval: true, last: true, threat: false, num: true, path: true, lang: '', bd: 'walnut', pcs: 'classic' };
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
  $('#swapLbl').textContent = t('swap.btn');
  renderBrand();
}
function renderBrand() { const tt = t('title'); $('#brandTitle').textContent = tt; $('#brandSub').textContent = t('sub'); document.querySelector('.brand h1').style.setProperty('--tl', Math.max(14, tt.length)); }
let humanColor = P1;
let reviewing = false;
let manualEnd = null;    // resignation in a game vs the AI or between two players: { over, winner, why, n }
let aiVals = [];         // the AI's own search values (its view), newest last: for its resignations
let evals = [];          // evals[i] = evaluation after i moves (Red's view)
let busyToken = 0;
let lesson = null, puzzle = null;
let rtHold = false;      // a rated game restored on page load: its clock waits for the first move
let rgame = null;        // rated game vs the AI: { id, lv, or, my, tag, ct: [ms, ms], t, over, done }
let gameOverShown = false;
let sel = null;          // (kept for the shared code paths: Hex has no selection step)

function validMoves(list, n, sw) {
  try { const pos = new E.Pos(n, sw); for (const m of list) { if (typeof m !== 'number' || !pos.legal(m)) return false; pos.play(m); } return true; } catch (e) { return false; }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!d) return false;
    Object.assign(settings, d.settings || {});
    if (settings.mode === 'online') settings.mode = 'pvp';
    if (!(settings.level >= 1 && settings.level <= LV_MAX)) settings.level = 6;
    if (!(settings.level2 >= 1 && settings.level2 <= LV_MAX)) settings.level2 = 6;
    if (!SIZES.includes(settings.n)) settings.n = 11;
    if (Array.isArray(d.moves)) {
      startSpec = null;
      const n = SIZES.includes(d.n) ? d.n : 11, sw = d.swap !== false;
      if (!validMoves(d.moves, n, sw)) return false;
      setVariant(n); gSwap = sw;
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
  try { localStorage.setItem(STORE, JSON.stringify({ settings, n: gN, swap: gSwap, moves, humanColor, evals: evals.slice(0, moves.length + 1), rated: rgame, end: manualEnd })); } catch (e) {}
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
  return new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve, onProgress }); w.postMessage({ start: startObj(), ...msg, id }); });
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
// a glazed stone set down on a wooden board; delay in ms
function sPlace(soft, delay) { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000, v = soft ? 0.12 : 0.34; tone(a, t0, 520, 210, 0.09, v * .8); noise(a, t0, 0.025, v, 3400, 1.6); }
function sSwap(delay) { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000; tone(a, t0, 440, 660, 0.18, 0.12, 'triangle'); tone(a, t0 + 0.12, 660, 440, 0.18, 0.12, 'triangle'); }
function sConnect(delay) { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000; [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(a, t0 + i * 0.06, f, 0, 0.45, 0.09, 'triangle')); }
function playChime(win) {
  if (!settings.sound) return;
  const a = ctx(); if (!a) return;
  const t0 = a.currentTime + 0.05, notes = win ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [392, 349.23, 311.13, 261.63];
  notes.forEach((fr, i) => tone(a, t0 + i * (win ? 0.1 : 0.16), fr, 0, 0.7, 0.16, win ? 'triangle' : 'sine'));
}
function playTick() { if (!settings.sound) return; const a = ctx(); if (!a) return; tone(a, a.currentTime, 880, 0, 0.08, 0.05, 'triangle'); }

// ====================================================================== DOM / board geometry
const $ = s => document.querySelector(s);
const boardEl = $('#board'), fxEl = $('#fx'), bdEl = $('#bd'), frameEl = $('#frame');
const reduceMotion = false /* site rule: animations are never skipped for the OS reduce-motion setting */;
const animOn = () => settings.anim && !reduceMotion;
const SQ3 = Math.sqrt(3), HR = 1 / SQ3;       // hex: centre distance 1, radius (centre → corner) 1/√3
const NS = 'http://www.w3.org/2000/svg';
// phones held upright: the board is drawn transposed (rows run down), so its long side follows the screen's
const rotQ = matchMedia('(max-aspect-ratio: 1/1) and (pointer: coarse)');
let ROT = rotQ.matches;
let G = null;   // geometry of the drawn board: { n, rot, vb: [x, y, w, h], X[], Y[] }
function hexXY(i, n) { const r = Math.floor(i / n), c = i % n; return [c + r / 2, r * SQ3 / 2]; }
const tr = (x, y) => ROT ? [y, x] : [x, y];
function geom(n) {
  const X = [], Y = [];
  for (let i = 0; i < n * n; i++) { const [x, y] = tr(...hexXY(i, n)); X.push(x); Y.push(y); }
  const mx = 1.35, my = 1.2;   // room for the edges and the coordinates
  let x0 = -.5 - mx, x1 = (n - 1) * 1.5 + .5 + mx, y0 = -HR - my, y1 = (n - 1) * SQ3 / 2 + HR + my;
  if (ROT) [x0, x1, y0, y1] = [y0, y1, x0, x1];
  return { n, rot: ROT, vb: [x0, y0, x1 - x0, y1 - y0], X, Y };
}
const ptX = i => (G.X[i] - G.vb[0]) / G.vb[2] * 100, ptY = i => (G.Y[i] - G.vb[1]) / G.vb[3] * 100;
function placeAt(el, i) { el.style.left = ptX(i) + '%'; el.style.top = ptY(i) + '%'; }
// the corners of a hex (pointy-top before the transposition), as an SVG points string
function hexPts(x, y, k = 1) {
  const out = [];
  for (let j = 0; j < 6; j++) { const a = Math.PI / 180 * (60 * j - 90); let dx = Math.cos(a) * HR * k, dy = Math.sin(a) * HR * k; if (ROT) [dx, dy] = [dy, dx]; out.push((x + dx).toFixed(3) + ',' + (y + dy).toFixed(3)); }
  return out.join(' ');
}
// the board's sides: segments of the outer cells' edges, coloured by whose edge they are (Red: top / bottom rows, Blue: left / right columns)
const DIRS = [[-1, 0], [-1, 1], [0, 1], [1, 0], [1, -1], [0, -1]];
function rimSegs(n) {
  const segs = { r: [], b: [] }, V = j => { const a = Math.PI / 180 * (60 * j - 90); return [Math.cos(a) * HR, Math.sin(a) * HR]; };
  const SIDE = [[5, 0], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5]];   // direction d → the hex corners of that side
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n, [cx, cy] = hexXY(i, n);
    DIRS.forEach(([dr, dc], d) => {
      const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < n && cc >= 0 && cc < n) return;
      const who = (rr < 0 || rr >= n) ? 'r' : 'b', [a, b] = SIDE[d], [ax, ay] = V(a), [bx, by] = V(b);
      const mxn = (ax + bx) / 2, myn = (ay + by) / 2, L = Math.hypot(mxn, myn), ox = mxn / L * .13, oy = myn / L * .13;   // pushed a little outwards
      segs[who].push([tr(cx + ax + ox, cy + ay + oy), tr(cx + bx + ox, cy + by + oy)]);
    });
  }
  return segs;
}
// the board's outline (the parallelogram of the corner cells' centres pushed out by d on every side), untransposed
function platePts(n, d) {
  const C = [hexXY(0, n), hexXY(n - 1, n), hexXY(n * n - 1, n), hexXY(n * (n - 1), n)];
  return C.map((p, k) => {
    const a = C[(k + 3) % 4], b = C[(k + 1) % 4];
    const nrm = (u, v) => { const dx = v[0] - u[0], dy = v[1] - u[1], L = Math.hypot(dx, dy); return [dy / L, -dx / L]; };   // outward for a clockwise outline (y down)
    const n1 = nrm(a, p), n2 = nrm(p, b), k2 = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    return [p[0] + (n1[0] + n2[0]) * k2, p[1] + (n1[1] + n2[1]) * k2];
  });
}
const segPath = L => L.map(([[x1, y1], [x2, y2]]) => `M${x1.toFixed(3)},${y1.toFixed(3)}L${x2.toFixed(3)},${y2.toFixed(3)}`).join('');
function defsSVG() {
  return `<defs>
    <radialGradient id="cellG" cx="45%" cy="38%" r="75%"><stop offset="0" style="stop-color:var(--cA1)"/><stop offset="1" style="stop-color:var(--cA2)"/></radialGradient>
    <radialGradient id="cellG2" cx="45%" cy="38%" r="75%"><stop offset="0" style="stop-color:var(--cB1)"/><stop offset="1" style="stop-color:var(--cB2)"/></radialGradient>
    <linearGradient id="plateG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--pl1)"/><stop offset="1" style="stop-color:var(--pl2)"/></linearGradient>
    <radialGradient id="stR" cx="36%" cy="30%" r="78%"><stop offset="0" style="stop-color:var(--pr1)"/><stop offset=".32" style="stop-color:var(--pr2)"/><stop offset=".8" style="stop-color:var(--pr3)"/><stop offset="1" style="stop-color:var(--pr4)"/></radialGradient>
    <radialGradient id="stB" cx="36%" cy="30%" r="78%"><stop offset="0" style="stop-color:var(--pb1)"/><stop offset=".32" style="stop-color:var(--pb2)"/><stop offset=".8" style="stop-color:var(--pb3)"/><stop offset="1" style="stop-color:var(--pb4)"/></radialGradient>
    <radialGradient id="stHi" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="blur1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".05"/></filter>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".05" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;
}
// static layer: plate, cells, coloured sides, coordinates
function drawBoardSVG(n) {
  G = geom(n);
  const [vx, vy, vw, vh] = G.vb;
  document.documentElement.style.setProperty('--WU', vw.toFixed(3)); document.documentElement.style.setProperty('--HU', vh.toFixed(3));
  bdEl.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
  // the plate: the board's outline, a little larger
  const P = platePts(n, .98).map(([x, y]) => tr(x, y)).map(([x, y]) => x.toFixed(3) + ',' + y.toFixed(3)).join(' ');
  let s = defsSVG() + `<polygon class="plate" points="${P}"/>`;
  const segs = rimSegs(n);
  s += `<path class="rimsh" d="${segPath(segs.r)}${segPath(segs.b)}" stroke-width=".26" transform="translate(.03,.05)"/>`;
  s += `<path class="rim r" d="${segPath(segs.r)}" stroke-width=".2"/><path class="rim b" d="${segPath(segs.b)}" stroke-width=".2"/>`;
  s += '<g id="cells">';
  for (let i = 0; i < n * n; i++) { const r = Math.floor(i / n), c = i % n; s += `<polygon class="cell${(r + 2 * c) % 3 === 0 ? ' alt' : ''}" points="${hexPts(G.X[i], G.Y[i], .985)}"/>`; }
  s += '</g>';
  // coordinates: letters along Red's edges (columns), numbers along Blue's (rows)
  const fs = .36;
  for (let c = 0; c < n; c++) {
    for (const [r, off] of [[0, -1], [n - 1, 1]]) { const [x, y] = hexXY(r * n + c, n), [tx, ty] = tr(x + (off < 0 ? -.25 : .25), y + off * .98); s += `<text class="co" x="${tx.toFixed(3)}" y="${ty.toFixed(3)}" font-size="${fs}">${E.COLS[c]}</text>`; }
  }
  for (let r = 0; r < n; r++) {
    for (const [c, off] of [[0, -1], [n - 1, 1]]) { const [x, y] = hexXY(r * n + c, n), [tx, ty] = tr(x + off * 1.0, y); s += `<text class="co" x="${tx.toFixed(3)}" y="${ty.toFixed(3)}" font-size="${fs}">${r + 1}</text>`; }
  }
  s += '<g id="thr"></g><g id="stones"></g><g id="over"></g>';
  bdEl.innerHTML = s;
  stoneEls.clear(); shownKey = '';
  boardEl.classList.toggle('no-num', !settings.num);
}
function ensureBoard(n) { if (!G || G.n !== n || G.rot !== ROT) drawBoardSVG(n); }
rotQ.addEventListener && rotQ.addEventListener('change', () => { ROT = rotQ.matches; G = null; update(false); });
const stoneEls = new Map();      // cell → <g>
let shownKey = '';
function stoneSVG(i, p, cls) {
  const x = G.X[i], y = G.Y[i], R = .41;
  return `<g class="st ${p === P1 ? 'r' : 'b'}${cls ? ' ' + cls : ''}" data-c="${i}"><circle class="sh" cx="${(x + .04).toFixed(3)}" cy="${(y + .07).toFixed(3)}" r="${R}"/><circle class="body" cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${R}"/><ellipse class="hi" cx="${(x - .12).toFixed(3)}" cy="${(y - .15).toFixed(3)}" rx="${(R * .5).toFixed(3)}" ry="${(R * .32).toFixed(3)}"/></g>`;
}
function syncStones(pos, animCell) {
  const g = bdEl.querySelector('#stones'); if (!g) return;
  for (const [i, el] of stoneEls) if (pos.at(i) !== +el.dataset.p) { el.remove(); stoneEls.delete(i); }
  let html = '';
  const add = [];
  for (let i = 0; i < pos.b.length; i++) { const p = pos.at(i); if (p && !stoneEls.has(i)) add.push([i, p]); }
  if (add.length) {
    const tmp = document.createElementNS(NS, 'g');
    tmp.innerHTML = add.map(([i, p]) => stoneSVG(i, p, i === animCell && animOn() ? 'drop' : '')).join('');
    [...tmp.children].forEach(el => { const i = +el.dataset.c; el.dataset.p = pos.at(i); g.appendChild(el); stoneEls.set(i, el); });
  }
  void html;
}
function renderBoard(anim) {
  const { pos } = posAt(cur), key = keyOf(cur);
  ensureBoard(pos.n);
  const prev = shownKey; shownKey = key;
  const m = cur > 0 ? moves[cur - 1] : -1;
  const step = anim && m !== undefined && m !== -1 && prev === keyOf(cur - 1);
  if (step && m === SWAP) { for (const [, el] of stoneEls) el.remove(); stoneEls.clear(); syncStones(pos, pos.last); sSwap(); }
  else { syncStones(pos, step ? m : -1); if (step) sPlace(); }
  boardEl.classList.toggle('hide-last', !settings.last);
  boardEl.classList.toggle('no-num', !settings.num);
  renderFx();
  boardEl.classList.toggle('can', canHumanPlay());
}

// ---------------------------------------------------------------- fx: last move, hints, marks, threats, the winning chain
let hintList = null;
let lessonMarks = [];          // {at, cls} rings
let labelList = null;          // explicit labels: [{at, big, small, cls}]
function fxDiv(cls, i) { const d = document.createElement('div'); d.className = cls; placeAt(d, i); fxEl.appendChild(d); return d; }
function renderFx() {
  fxEl.innerHTML = '';
  if (!G) return;
  const { pos } = posAt(cur), st = statusAt(cur), m = cur > 0 ? moves[cur - 1] : -1;
  const over = bdEl.querySelector('#over'), thr = bdEl.querySelector('#thr');
  if (!over || !thr) return;
  let o = '', th = '';
  for (const [, el] of stoneEls) el.classList.remove('dim', 'win');
  // last move: a dot on the stone (after a swap: on the swapped stone)
  if (m !== -1 && m !== undefined && cur > 0) { const c = m === SWAP ? pos.last : m; if (c >= 0) o += `<circle class="lastdot" cx="${G.X[c].toFixed(3)}" cy="${G.Y[c].toFixed(3)}" r=".1"/>`; }
  // the winning chain
  const w = pos.winner();
  if (w) {
    const path = pos.path(w);
    if (path) {
      const set = new Set(path);
      for (const [i, el] of stoneEls) { if (set.has(i)) el.classList.add('win'); else if (pos.at(i) !== w) el.classList.add('dim'); }
      o += `<path class="winline" d="M${path.map(i => G.X[i].toFixed(3) + ',' + G.Y[i].toFixed(3)).join('L')}"/>`;
    }
  } else if (st.over && st.winner) for (const [i, el] of stoneEls) if (pos.at(i) !== st.winner) el.classList.add('dim');
  // connection threats: cells where a side would connect at once
  if (settings.threat && !st.over && !lesson && !puzzle && !rtLive()) for (const p of [P1, P2]) for (const c of pos.winCells(p)) th += `<polygon class="thr ${p === P1 ? 'r' : 'b'}" points="${hexPts(G.X[c], G.Y[c], .72)}"/>`;
  over.innerHTML = o; thr.innerHTML = th;
  for (const k of lessonMarks) fxDiv('mark ' + k.cls, k.at);
  if (labelList) drawLabels(labelList);
  else if (!drawReviewFx() && hintList && !st.over) drawHints(hintList);
  renderPrompt();
}
function renderPrompt() {
  const el = $('#prompt'); let s = '';
  const { pos } = posAt(cur);
  const swapNow = canHumanPlay() && pos.swapOk && !puzzle;
  $('#swapBtn').classList.toggle('show', !!swapNow);
  if (swapNow) s = t('swap.prompt');
  el.textContent = s; el.classList.toggle('show', !!s);
}
// value label for an engine value (mover's view: -1000..1000 = winrate, or a proven result)
const wrOf = v => v > WINT ? 1 : v < -WINT ? 0 : Math.max(0, Math.min(1, (v + 1000) / 2000));
function valLabel(v) {
  if (v > WINT) return { cls: 'win', big: t('h.win'), small: '' };
  if (v < -WINT) return { cls: 'loss', big: t('h.loss'), small: '' };
  const p = Math.round(wrOf(v) * 100); return { cls: 'heur' + (p < 45 ? ' neg' : ''), big: p + '%', small: '' };
}
// labels on the best few cells (the most searched moves)
function hintTop(list) {
  if (!list || !list.length) return [];
  const max = Math.max(...list.map(e => e.n || 0));
  return list.filter((e, k) => k < 6 && (e.kind === 'exact' || (e.n || 0) >= max * .04)).slice(0, 6);
}
function drawHints(list) {
  const L = hintTop(list); if (!L.length) return;
  let best = -Infinity; for (const e of L) best = Math.max(best, e.v);
  const { pos } = posAt(cur);
  for (const e of L) {
    if (e.m === SWAP) continue;
    const V = valLabel(e.v), d = fxDiv('hintlbl ' + V.cls + (e === L[0] ? ' best' : ''), e.m);
    d.innerHTML = `<b>${V.big}</b>${V.small ? `<small>${V.small}</small>` : ''}`;
  }
  const sw = L.find(e => e.m === SWAP);
  if (sw && pos.swapOk) $('#swapLbl').textContent = t('swap.btn') + ' ' + valLabel(sw.v).big;
}
function drawLabels(list) { for (const L of list) { const d = fxDiv('hintlbl ' + L.cls, L.at); d.innerHTML = `<b>${L.big}</b>${L.small ? `<small>${L.small}</small>` : ''}`; } }

// evaluation (Red's view): {s in [-1,1], kind, side}
function sOfV(v) { return v > WINT ? 1 : v < -WINT ? -1 : (wrOf(v) - .5) * 2; }
function evalFromList(list, mover) {
  if (!list || !list.length) return null;
  const best = list[0].v, sign = mover === P1 ? 1 : -1;
  if (best > WINT) return { s: sign, kind: 'win', side: mover };
  if (best < -WINT) return { s: -sign, kind: 'win', side: 3 - mover };
  return { s: sOfV(best) * sign, kind: 'heur', p: wrOf(best), side: mover };
}
function evalText(ev) {
  if (!ev) return '—';
  if (ev.kind === 'final') return ev.side ? t('ev.won', { c: pname(ev.side) }) : '—';
  if (ev.kind === 'win') return t('ev.winning', { c: pname(ev.side) });
  const a = Math.abs(ev.s), c = pname(ev.s > 0 ? P1 : P2), pct = Math.round((.5 + a / 2) * 100);
  return a < 0.06 ? t('ev.even') : t(a < 0.2 ? 'ev.slight' : a < 0.45 ? 'ev.adv' : 'ev.sup', { c }) + ` (${pct}%)`;
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
  const { pos } = posAt(cur), st = statusAt(cur), tm = pos.side;
  for (const p of [P1, P2]) {
    $('#count' + p).textContent = pos.count(p);
    const nd = st.over ? 0 : pos.need(p);
    $('#hand' + p).textContent = st.over ? '' : nd >= 999 ? t('need.none') : t('need', { n: nd });
    const n = playerName(p); $('#name' + p).textContent = n ? n + ' · ' + pname(p) : pname(p);
    const el = $('#pl' + p);
    el.classList.toggle('active', !st.over && tm === p);
    el.classList.toggle('won', st.winner === p);
    el.classList.toggle('thinking', thinking === p);
    $('#status' + p).textContent = st.winner === p ? t('st.win') : thinking === p ? t('thinking') : (!st.over && tm === p ? t('st.turn') + (pos.swapOk ? ' · ' + t('st.swapOk') : '') : '');
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
  const sz = `${pos.n}×${pos.n}${!startSpec && gSwap ? ' · ' + t('ng.swapShort') : ''}`;
  $('#infoLine').textContent = `${sz}  ·  ${t('info.moves', { n: moves.length })}  ·  ${settings.mode === 'ai' ? 'AI ' + LV(levelFor(0)) + (rgame ? ' · ' + t('ng.rated') : '') : settings.mode === 'watch' ? `${LV(settings.level)} vs ${LV(settings.level2)}` : t('ng.pvp')}  ·  ← → ${t('info.browse')}`;
  renderBrand();
  if (window.olAfterInfo) olAfterInfo();
  hbInfo(pos, st);
}
// PC header bar: whose turn, stones of each side, evaluation (when shown), move number
const escHb = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function hbInfo(pos, st) {
  if (!HB || !HB.on) return;
  const tm = pos.side;
  let h = `<span class="hb-chip"><i class="pdisc p${st.over ? (st.winner || tm) : tm}"></i><b>${escHb(st.over ? (st.winner ? t('hb.won', { c: pname(st.winner) }) : '') : t('hb.turn', { c: pname(tm) }))}</b>${!st.over && pos.swapOk ? `<small>${escHb(t('st.swapOk'))}</small>` : ''}</span>`;
  h += `<span class="hb-chip cnt">${pos.n}×${pos.n}</span>`;
  for (const p of [P1, P2]) { const nd = st.over ? 999 : pos.need(p); h += `<span class="hb-chip cnt"><i class="pdisc p${p}"></i><b>${pos.count(p)}</b>${nd < 999 ? `<small>${escHb(t('need', { n: nd }))}</small>` : ''}</span>`; }
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
    <path d="${area}" style="fill:var(--pr2);opacity:.45" clip-path="url(#ctop)"/>
    <path d="${area}" style="fill:var(--pb2);opacity:.45" clip-path="url(#cbot)"/>
    <line class="zero" vector-effect="non-scaling-stroke" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/>
    <path d="${path}" fill="none" stroke="rgba(240,236,220,.85)" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
    <line class="cur" x1="${cx}" x2="${cx}" y1="0" y2="${H}" vector-effect="non-scaling-stroke"/>`;
}
function renderKifu() {
  const k = $('#kifu');
  if (!moves.length) { k.innerHTML = `<div class="empty">${t('kifu.empty')}</div>`; return; }
  const s0 = startSpec ? startSpec.side : P1;
  let html = '';
  for (let i = 1; i <= moves.length; i++) {
    const p = posAt(i - 1).pos.side;
    const j = rvOpen && rv && !rv.running ? rvJudge(i - 1) : null, qc = j && j.q ? (j.q === 'bad' ? ' q-bad' : ' q-dub') : '';
    html += `<button data-i="${i}" class="${i === cur ? 'cur' : ''}${qc}" title="${i}${j && j.q ? ' ' + t('q.' + j.q) : ''}"><em>${i}</em><i class="p${p}"></i>${mvAt(i - 1, true)}</button>`;
  }
  void s0;
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

// ====================================================================== input (click a cell; the swap button)
function cellAt(clientX, clientY) {
  if (!G) return -1;
  const r = bdEl.getBoundingClientRect(); if (!r.width) return -1;
  const ux = G.vb[0] + (clientX - r.left) / r.width * G.vb[2], uy = G.vb[1] + (clientY - r.top) / r.height * G.vb[3];
  let best = -1, bd = 1e9;
  for (let i = 0; i < G.X.length; i++) { const d = Math.hypot(G.X[i] - ux, G.Y[i] - uy); if (d < bd) { bd = d; best = i; } }
  return bd < .6 ? best : -1;
}
let ghostAt = -1;
function setHover(i) {
  const g = bdEl.querySelector('#over'); if (!g) return;
  const old = g.querySelector('.ghost'); if (old) old.remove();
  ghostAt = -1;
  if (i < 0 || !canHumanPlay()) return;
  const { pos } = posAt(cur); if (pos.at(i)) return;
  const tmp = document.createElementNS(NS, 'g'); tmp.innerHTML = stoneSVG(i, pos.side, 'ghost'); g.appendChild(tmp.firstChild); ghostAt = i;
}
boardEl.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { const i = cellAt(e.clientX, e.clientY); if (i !== ghostAt) setHover(i); } });
boardEl.addEventListener('pointerleave', () => setHover(-1));
boardEl.addEventListener('click', e => { const i = cellAt(e.clientX, e.clientY); setHover(-1); onCell(i); });
$('#swapBtn').addEventListener('click', e => { e.stopPropagation(); ctx(); if (!canHumanPlay()) return; const { pos } = posAt(cur); if (pos.swapOk) commit(SWAP); });
function cancelSel() { }
function onCell(i) {
  ctx();
  if (!canHumanPlay()) { if (reviewing && !lesson && !puzzle) rsOpen(); return; }
  if (i < 0) return;
  const { pos } = posAt(cur);
  if (pos.at(i)) { toast(t('cant.taken')); return; }
  commit(i);
}
function commit(m) {
  setHover(-1);
  if (lesson) return lessonAnswer(m);
  if (puzzle) return puzzleMove(m);
  if (settings.mode === 'online' && window.olHumanMove) return olHumanMove(m);
  playMove(m);
}

// ====================================================================== flow
function newGame(rated) {
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false;
  rgame = null; rtHold = false;
  if (rated) rgame = Object.assign(rated, { ct: [rtClock().base, rtClock().base], t: Date.now() });
  startSpec = null;
  setVariant(rated ? 11 : settings.n); gSwap = rated ? true : settings.swap;
  if (settings.mode === 'ai') humanColor = rated ? (Math.random() < 0.5 ? P1 : P2) : settings.color === 0 ? (Math.random() < 0.5 ? P1 : P2) : settings.color;
  moves = []; cur = 0; reviewing = false; evals = []; hintList = null; gameOverShown = false; sel = null; manualEnd = null; aiVals = [];
  hideOverlay('#resultOverlay');
  request('ai', { type: 'newgame' });
  update(false); save();
  afterPosition();
}
const MOVE_MS = 340;
function moveDur() { return animOn() ? MOVE_MS : 60; }
function playMove(m) {
  if (rtHold) { rtHold = false; if (rgame) rgame.t = Date.now(); }   // first move after a reload: no time was charged while held
  if (rtLive()) { const side = toMoveAt(moves.length) - 1, now = Date.now(); rgame.ct[side] = Math.max(0, rgame.ct[side] - (now - rgame.t)) + rtClock().inc; rgame.t = now; }
  moves = moves.slice(0, cur); moves.push(m); cur = moves.length; reviewing = false;
  evals.length = moves.length;
  hintList = null;
  const d = moveDur();
  animating = animOn(); setTimeout(() => { animating = false; renderInfo(); renderFx(); boardEl.classList.toggle('can', canHumanPlay()); }, d);
  update(true); save();
  const st = statusAt(cur);
  if (st.over) { if (st.why === 'connect') sConnect(d); setTimeout(() => onGameEnd(st), d + 650); }
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
  const wait = Math.max((settings.mode === 'watch' ? 700 : 420), moveDur() + 120) - (Date.now() - t0);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  if (tok !== busyToken) return;
  thinking = 0;
  if (res.move === undefined || res.move < 0) { renderInfo(); return; }
  if (typeof res.v === 'number') { aiVals[cur] = res.v; }
  if (settings.mode === 'ai' && aiResigns(p)) return;
  if (res.move === SWAP) toast(t('swap.aiDid'), 1800);
  playMove(res.move);
}
// ---------------------------------------------------------------- resignation in games vs the AI
function aiGameLive() { return settings.mode === 'ai' && !lesson && !puzzle && !gameOver(moves.length) && cur === moves.length; }
function endManually(st) {
  busyToken++; cancelWorker('ai'); thinking = 0;
  st.n = moves.length;
  if (rgame) rgame.over = st; else manualEnd = st;
  save(); update(false); onGameEnd(st);
}
// the AI resigns when it is lost for sure (a forced connection found) or hopeless twice in a row; not the weakest levels
function aiResigns(p) {
  const lv = levelFor(p), v = aiVals[cur]; if (lv < 6 || typeof v !== 'number') return false;
  const prev = aiVals.slice(0, cur).filter(x => typeof x === 'number').slice(-1)[0];
  const lost = v < -WINT || (v <= -920 && prev !== undefined && prev <= -900);
  if (!lost) return false;
  endManually({ over: true, winner: p === P1 ? P2 : P1, why: 'resign', aiResigned: true });
  return true;
}
// 投了 (common spec, shared/resign.js): "投了しますか？" → はい ends the game as your loss
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
window.aiGameLive = aiGameLive; window.playerResign = playerResign;
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
  const res = await request('ana', { type: 'analyze', moves: moves.slice(0, idx), time: settings.hint ? 1500 : 800 });
  if (!res || res.error) return;
  anaCache.set(key, res.list);
  apply(res.list);
  save();
}
function onGameEnd(st) {
  if (moves.length !== cur || gameOverShown) return;
  if (settings.mode === 'online') return;   // online: the result comes from online-ui.js
  gameOverShown = true;
  const youWin = settings.mode === 'ai' && st.winner === humanColor;
  const aiWin = settings.mode === 'ai' && st.winner && st.winner !== humanColor;
  playChime(!aiWin);
  if (youWin || (settings.mode === 'pvp' && st.winner)) confetti();
  $('#resultDisc').innerHTML = st.winner ? `<div class="pdisc p${st.winner}"></div>` : '';
  $('#resultTitle').textContent = youWin ? t('res.youWin') : aiWin ? t('res.aiWin') : t('res.pWin', { c: pname(st.winner) });
  let sub = (st.aiResigned ? t('dr.aiResigned') : t('res.why.' + st.why, { c: pname(st.winner) })) + '<br>' + t('res.sub', { n: moves.length });
  if (rgame) {
    const rx = rtSettle(st);
    if (rx) sub += `<br>${rx.pl ? Placement.resHtml(rx.pl) : `<span class="rt-res">R ${rx.old} → <b>${rx.now}</b> (${rtD(rx.d)})</span>`} · ${rtRank(rx.now)}<br><small style="color:var(--muted)">${t('rt.opp', { lv: rtLvName(rgame.lv), r: rgame.or })}</small>`;
  } else if (settings.mode === 'ai') sub += '<br>' + t('res.vs', { name: LV(settings.level) });
  $('#resultSub').innerHTML = sub;
  setTimeout(() => showOverlay('#resultOverlay'), 700);
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
  moves = moves.slice(0, i); cur = i; reviewing = false; evals.length = i + 1; hintList = null; gameOverShown = false; manualEnd = null;
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
  moves = moves.slice(0, cur); evals.length = cur + 1; reviewing = false; gameOverShown = false; manualEnd = null;
  update(false); save(); afterPosition();
}
function showOverlay(s) { $(s).classList.add('show'); }
function hideOverlay(s) { $(s).classList.remove('show'); }
function confetti() {
  if (!animOn()) return;
  const cs = getComputedStyle(document.documentElement), cols = [cs.getPropertyValue('--pr2'), cs.getPropertyValue('--pb2'), '#e9c97a', '#fff6dc', '#7fd6a4', cs.getPropertyValue('--pr1')];
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
  if (!settings.hint) { hintList = null; $('#swapLbl').textContent = t('swap.btn'); renderFx(); renderInfo(); }
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
  const pos = posAt(0).pos.clone(), out = [];
  moves.forEach((m, i) => { out.push(m === SWAP ? 'swap' : E.name(pos, m)); pos.play(m); });
  return `${pos.n}x${pos.n}${!startSpec && !gSwap ? ' noswap' : ''}  ` + out.join(' ');
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
  if (e.key === 'Home') viewAt(0);
  else if (e.key === 'End') viewAt(moves.length);
});

// ---------------------------------------------------------------- small board pictures (rules, lessons / openings / puzzle lists, design pickers)
// spec: { n, b: n*n chars '.' 'r' 'b', side } ; o: { cls, marks: {cell: 'ring'|'ng'|'x'|'dash'|'dot'}, last, click, bd, pcs, heat: [‰ per cell], swapBtn }
const BD_KEYS = ['walnut', 'paper', 'slate', 'jade', 'night'], PC_KEYS = ['classic', 'gem', 'sun', 'mono'];
const BD_PAL = { walnut: ['#f1dcb0', '#d9bd85', 'rgba(70,45,18,.6)', '#3b2a17'], paper: ['#fbf7ee', '#eee6d3', 'rgba(60,60,70,.5)', '#cfc7b4'], slate: ['#4a5266', '#353b4b', 'rgba(160,175,205,.45)', '#1c2130'], jade: ['#9fd3b7', '#6fae8f', 'rgba(20,60,40,.55)', '#173828'], night: ['#1d2a4a', '#141e38', 'rgba(120,160,255,.45)', '#0a1022'] };
const PC_PAL = { classic: [['#ff8a7a', '#e5392e', '#7a0d07'], ['#8cc8ff', '#2f7fe0', '#0b2c6e'], '#e0412f', '#2c78dc'], gem: [['#ffb3d0', '#e0306e', '#6a0a2c'], ['#b6f0ff', '#1aa6c9', '#06414f'], '#d92c66', '#1597b8'], sun: [['#ffe08a', '#f0a020', '#6a3a00'], ['#d8b8ff', '#7a4fd8', '#2a1068'], '#e8951c', '#6d45cc'], mono: [['#6b6b6b', '#2a2a2a', '#000'], ['#ffffff', '#efeee9', '#9a978c'], '#222', '#f3f1ea'] };
let MINI_UID = 0;
function miniSVG(spec, o) {
  o = o || {};
  const n = spec.n || 11, u = 20, R = u * HR, pad = u * 1.15;
  const BP = BD_PAL[o.bd || settings.bd] || BD_PAL.walnut, PP = PC_PAL[o.pcs || settings.pcs] || PC_PAL.classic, id = 'm' + (++MINI_UID);
  const X = i => pad + u * .5 + ((i % n) + Math.floor(i / n) / 2) * u, Y = i => pad + R + Math.floor(i / n) * u * SQ3 / 2;
  const W = pad * 2 + u * (1.5 * (n - 1) + 1), H = pad * 2 + R * 2 + (n - 1) * u * SQ3 / 2;
  const hp = (x, y, k = 1) => { const a = []; for (let j = 0; j < 6; j++) { const t = Math.PI / 180 * (60 * j - 90); a.push((x + Math.cos(t) * R * k).toFixed(1) + ',' + (y + Math.sin(t) * R * k).toFixed(1)); } return a.join(' '); };
  let s = `<svg class="${o.cls || 'mini'}" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}"><defs><radialGradient id="${id}r" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="${PP[0][0]}"/><stop offset=".4" stop-color="${PP[0][1]}"/><stop offset="1" stop-color="${PP[0][2]}"/></radialGradient><radialGradient id="${id}b" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="${PP[1][0]}"/><stop offset=".4" stop-color="${PP[1][1]}"/><stop offset="1" stop-color="${PP[1][2]}"/></radialGradient></defs>`;
  // plate + coloured sides
  s += `<polygon points="${platePts(n, .9).map(([x, y]) => (pad + u * .5 + x * u).toFixed(1) + ',' + (pad + R + y * u).toFixed(1)).join(' ')}" fill="${BP[3]}" stroke="rgba(201,169,97,.5)" stroke-width="1"/>`;
  const segs = { r: [], b: [] }, SIDE = [[5, 0], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5]], V = j => { const a = Math.PI / 180 * (60 * j - 90); return [Math.cos(a) * R, Math.sin(a) * R]; };
  for (let i = 0; i < n * n; i++) { const r = Math.floor(i / n), c = i % n; DIRS.forEach(([dr, dc], d) => { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < n && cc >= 0 && cc < n) return; const who = (rr < 0 || rr >= n) ? 'r' : 'b', [a, b] = SIDE[d], [ax, ay] = V(a), [bx, by] = V(b), mx = (ax + bx) / 2, my = (ay + by) / 2, L = Math.hypot(mx, my); segs[who].push(`M${(X(i) + ax + mx / L * 2.6).toFixed(1)},${(Y(i) + ay + my / L * 2.6).toFixed(1)}L${(X(i) + bx + mx / L * 2.6).toFixed(1)},${(Y(i) + by + my / L * 2.6).toFixed(1)}`); }); }
  s += `<path d="${segs.r.join('')}" stroke="${PP[2]}" stroke-width="4" stroke-linecap="round" fill="none"/><path d="${segs.b.join('')}" stroke="${PP[3]}" stroke-width="4" stroke-linecap="round" fill="none"/>`;
  const heat = o.heat, hc = v => { const k = Math.max(-1, Math.min(1, (v - 500) / 120)); const a = k > 0 ? PP[0][1] : PP[1][1]; return [a, Math.abs(k)]; };
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n;
    s += `<polygon points="${hp(X(i), Y(i), .97)}" fill="${(r + 2 * c) % 3 === 0 ? BP[1] : BP[0]}" stroke="${BP[2]}" stroke-width=".9"/>`;
    if (heat && heat[i] != null) { const [col, a] = hc(heat[i]); s += `<polygon points="${hp(X(i), Y(i), .97)}" fill="${col}" fill-opacity="${(a * .85).toFixed(2)}"/>`; if (o.heatText) s += `<text x="${X(i).toFixed(1)}" y="${(Y(i) + 3.2).toFixed(1)}" font-size="${n >= 13 ? 7 : 8.5}" text-anchor="middle" fill="${a > .5 ? '#fff' : 'rgba(30,25,20,.85)'}" font-family="JetBrains Mono,monospace" font-weight="700">${Math.round(heat[i] / 10)}</text>`; }
  }
  if (o.last != null && o.last >= 0) s += `<polygon points="${hp(X(o.last), Y(o.last), .97)}" fill="rgba(255,222,130,.35)"/>`;
  const b = spec.b || '';
  for (let i = 0; i < n * n; i++) {
    const ch = b[i]; if (ch !== 'r' && ch !== 'b') continue;
    s += `<circle cx="${(X(i) + .8).toFixed(1)}" cy="${(Y(i) + 1.4).toFixed(1)}" r="${(u * .41).toFixed(1)}" fill="rgba(0,0,0,.3)"/><circle cx="${X(i).toFixed(1)}" cy="${Y(i).toFixed(1)}" r="${(u * .41).toFixed(1)}" fill="url(#${id}${ch})"/>`;
  }
  if (o.last != null && o.last >= 0 && b[o.last] && b[o.last] !== '.') s += `<circle cx="${X(o.last).toFixed(1)}" cy="${Y(o.last).toFixed(1)}" r="2.4" fill="rgba(255,255,255,.92)"/>`;
  for (const k in o.marks || {}) {
    const v = o.marks[k], x = X(+k), y = Y(+k);
    if (v === 'x') s += `<path d="M${x - 6},${y - 6}L${x + 6},${y + 6}M${x + 6},${y - 6}L${x - 6},${y + 6}" stroke="#ff6b5b" stroke-width="3" stroke-linecap="round"/>`;
    else if (v === 'dot') s += `<circle cx="${x}" cy="${y}" r="4" fill="#ffe9a8"/>`;
    else if (v === 'tri') s += `<path d="M${x},${y - 6}L${x + 5.5},${y + 4}L${x - 5.5},${y + 4}Z" fill="#ffe9a8" stroke="#6a4a10" stroke-width="1"/>`;
    else s += `<circle cx="${x}" cy="${y}" r="${(u * .46).toFixed(1)}" fill="none" stroke="${v === 'ng' ? '#ff6b5b' : v === 'dash' ? 'rgba(255,255,255,.9)' : v === 'ok2' ? '#8fe3b8' : '#e2c275'}" stroke-width="2.4" ${v === 'dash' || v === 'ok2' ? 'stroke-dasharray="4 3"' : ''}/>`;
  }
  for (const k in o.labels || {}) s += `<text x="${X(+k).toFixed(1)}" y="${(Y(+k) + 3.5).toFixed(1)}" font-size="10" text-anchor="middle" fill="#fff" stroke="rgba(0,0,0,.6)" stroke-width="2.4" paint-order="stroke" font-family="JetBrains Mono,monospace" font-weight="700">${o.labels[k]}</text>`;
  if (o.click) for (let i = 0; i < n * n; i++) s += `<polygon data-p="${i}" points="${hp(X(i), Y(i))}" fill="transparent"/>`;
  if (o.swapBtn) s += `<g data-p="swap" style="cursor:pointer"><rect x="${(W / 2 - 38).toFixed(1)}" y="2" width="76" height="17" rx="8.5" fill="#e9cf8e" stroke="#7a5a1c"/><text x="${(W / 2).toFixed(1)}" y="14" font-size="10.5" text-anchor="middle" fill="#1b150a" font-weight="700">⇄ ${escHb(o.swapBtn)}</text></g>`;
  return s + '</svg>';
}
// position spec from lists of cell names ('f6' …): r = red stones, b = blue stones
function specOf(o) {
  const n = o.n || 7, a = Array(n * n).fill('.');
  const ix = s => typeof s === 'number' ? s : (+s.slice(1) - 1) * n + E.COLS.indexOf(s[0]);
  for (const x of o.r || []) a[ix(x)] = 'r'; for (const x of o.b || []) a[ix(x)] = 'b';
  const sp = { n, b: a.join(''), side: o.side || P1 }; if (o.sw) sp.sw = 1; return sp;
}
const cellIx = (s, n) => (+s.slice(1) - 1) * n + E.COLS.indexOf(s[0]);

// ---------------------------------------------------------------- rules: hands-on tutorial (shared/ruletour.js)
// The player has Red. Only the basics: placing, the goal (joining your two edges), blocking, the bridge, no draws, the swap rule.
function tourPage(id, spec, o) {
  return {
    id, title: () => t('tr.' + id + '.t'), body: () => t('tr.' + id + '.b').split('\n').map(x => `<p>${x}</p>`).join(''),
    task: () => t('tr.' + id + '.task'),
    setup(api) {
      const pos = E.Pos.from(spec);
      if (o.pre) o.pre(pos);
      const st = { last: -1, busy: false, done: false };
      const draw = () => { if (!api.alive()) return; api.board.innerHTML = miniSVG(pos.spec(), { cls: 'tour', last: st.last, click: !st.done && !st.busy, swapBtn: pos.swapOk && !st.done ? t('swap.btn') : '' }); };
      function commit(m) {
        pos.play(m); st.last = m === SWAP ? pos.last : m;
        if (m === SWAP) sSwap(); else sPlace();
        const r = o.check ? o.check(m, pos) : 'ok';
        if (r === 'ok') { st.done = true; draw(); if (pos.winner()) sConnect(); api.ok(t('tr.' + id + '.ok')); return; }
        if (typeof r === 'string') { st.done = true; draw(); api.ng(r); return; }
        draw();
        if (o.reply) {   // Blue answers
          st.busy = true; draw(); api.say(t('thinking'));
          api.sleep(600).then(() => { const m2 = o.reply(pos); if (m2 >= 0) { pos.play(m2); st.last = m2; sPlace(true); } st.busy = false; api.say(''); draw(); });
        }
      }
      api.board.onclick = e => {
        const el = e.target.closest('[data-p]'); if (!el || st.busy || st.done || !api.alive()) return; ctx();
        if (el.dataset.p === 'swap') { if (pos.swapOk) commit(SWAP); return; }
        const i = +el.dataset.p;
        if (pos.at(i)) { api.say(t('cant.taken'), 'ng'); return; }
        if (o.onlySwap) { api.say(t('tr.swap.hint'), 'ng'); return; }
        commit(i);
      };
      draw();
    },
  };
}
const tourRead = (id, html) => ({ id, title: () => t('tr.' + id + '.t'), body: () => t('tr.' + id + '.b').split('\n').map(x => `<p>${x}</p>`).join(''), html });
// page 1: what the game is (history / how to win / culture), read only — common spec
const introPage = () => ({ id: 'intro', title: () => t('intro.t'), body: '', html: () => RuleTour.intro({ lang: LANG, img: '../images/atlas/hex.webp', origin: t('intro.origin'), players: t('intro.players'), time: t('intro.time'), history: t('intro.hist'), win: t('intro.win'), culture: t('intro.cult') }) });
const TOUR_N = 5;
const TOUR_PAGES = [
  introPage(),
  tourRead('board', () => `<div class="tour-pic">${miniSVG(specOf({ n: 7, r: ['d2', 'c4', 'd5', 'b7'], b: ['c3', 'e4', 'f2'] }), { cls: '' })}</div>`),
  tourPage('place', specOf({ n: TOUR_N }), { check: () => 'ok' }),
  tourPage('goal', specOf({ n: TOUR_N, r: ['c1', 'c2', 'b3', 'b5'], b: ['d2', 'c4', 'e3'] }), { check: (m, pos) => pos.winner() === P1 ? 'ok' : t('tr.goal.ng') }),
  tourPage('block', specOf({ n: TOUR_N, r: ['c2', 'b4'], b: ['a3', 'b3', 'c3', 'e3'] }), { check: (m, pos) => !pos.winCells(P2).length ? 'ok' : t('tr.block.ng') }),
  tourPage('bridge', specOf({ n: TOUR_N, r: ['c1', 'c2', 'b4', 'a5'], b: ['b3', 'e3'] }), { check: (m, pos) => pos.winner() === P1 || pos.at(cellIx('c3', TOUR_N)) === P1 ? 'ok' : t('tr.bridge.ng') }),
  tourRead('nodraw', () => `<div class="tour-pic">${miniSVG({ n: 5, b: 'rbbrb' + 'rrbbr' + 'brrbb' + 'bbrrb' + 'rbrbb', side: 1 }, { cls: '' })}</div>`),
  tourPage('swap', specOf({ n: TOUR_N, r: ['d2'], side: P2, sw: 1 }), { onlySwap: true, check: m => m === SWAP ? 'ok' : t('tr.swap.hint') }),
];
let TOUR = null;
function tourFor() {
  if (TOUR) return TOUR;
  const el = document.createElement('div'); el.className = 'tour-mount'; $('#rulesBody').appendChild(el);
  return (TOUR = RuleTour.create({
    mount: el, store: STORE + '-rules', lang: () => LANG, pages: TOUR_PAGES, aspect: 1.5,
    close: () => closeRules(),
    play: () => { closeRules(); if (lesson || puzzle) quitSpecial(); openNewDialog(); },
    lessons: () => { closeRules(); openLessons(); },
    sound: k => { if (k === 'ok') sConnect(); },
  }));
}
function openRules(r, page) { selTab('rules'); showOverlay('#rulesOverlay'); if (page != null) tourFor().page = page; renderRules(); }
function closeRules() { if (TOUR) TOUR.stop(); hideOverlay('#rulesOverlay'); }
function renderRules() { const tour = tourFor(); tour.open(tour.page); }
$('#rulesClose').onclick = () => closeRules();

// ---------------------------------------------------------------- new game dialog
let draft = {};
function levelLabelHTML(v) { return `${LV(v)}<small>${LVD(v)}</small>`; }
function sizeCards() {
  $('#sizeCards').innerHTML = SIZES.map(n => `<button type="button" data-n="${n}" class="${n === draft.n ? 'sel' : ''}">${miniSVG({ n, b: '', side: 1 }, { cls: '' })}<b>${n}×${n}</b><small>${escHb(t('size.' + n))}</small></button>`).join('');
}
function segSync() {
  document.querySelectorAll('#segMode button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.mode));
  document.querySelectorAll('#segColor button').forEach(b => b.classList.toggle('sel', +b.dataset.v === draft.color));
  document.querySelectorAll('#segSwap button').forEach(b => b.classList.toggle('sel', +b.dataset.v === (draft.swap ? 1 : 0)));
  const m = draft.mode, game = m === 'ai' || m === 'pvp' || m === 'watch';
  $('#fRatedInfo').classList.toggle('hidden', m !== 'rated');
  if (m === 'rated') $('#rtStats').innerHTML = rtStatsHtml();
  $('#fRules').classList.toggle('hidden', !game);
  $('#fSwap').classList.toggle('hidden', !game);
  $('#swapNote').textContent = t(draft.swap ? 'ng.swapOnNote' : 'ng.swapOffNote');
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
  sizeCards();
}
function openNewDialog() {
  draft = { mode: lesson ? 'lesson' : puzzle ? 'puzzle' : rgame && settings.mode === 'ai' ? 'rated' : settings.mode === 'online' ? 'pvp' : settings.mode, color: settings.color, level: settings.level, level2: settings.level2, n: settings.n, swap: settings.swap };
  $('#optEval').checked = settings.eval; $('#optLast').checked = settings.last; $('#optAnim').checked = settings.anim; $('#optThreat').checked = settings.threat; $('#optNum').checked = settings.num; $('#optPath').checked = settings.path;
  segSync(); designPickers(); showOverlay('#newOverlay');
}
$('#sizeCards').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (!b) return; draft.n = +b.dataset.n; segSync(); });
$('#segSwap').onclick = e => { const b = e.target.closest('button'); if (b) { draft.swap = b.dataset.v === '1'; segSync(); } };
// ---------------------------------------------------------------- 2D board designs and stone sets (CSS: html[data-bd] / html[data-pcs])
function designApply() {
  if (!BD_KEYS.includes(settings.bd)) settings.bd = 'walnut';
  if (!PC_KEYS.includes(settings.pcs)) settings.pcs = 'classic';
  document.documentElement.dataset.bd = settings.bd; document.documentElement.dataset.pcs = settings.pcs;
}
const DESIGN_SPEC = specOf({ n: 5, r: ['c2', 'b4', 'c3'], b: ['b3', 'd2', 'd3'] });
function designPickers() {
  const r1 = $('#bdRow'), r2 = $('#pcRow'); if (!r1 || !r2) return;
  r1.innerHTML = BD_KEYS.map(k => `<button type="button" data-bd="${k}" class="${k === settings.bd ? 'sel' : ''}" aria-pressed="${k === settings.bd}">${miniSVG(DESIGN_SPEC, { cls: 'bdm', bd: k })}<span>${escHb(t('bd.' + k))}</span></button>`).join('');
  r2.innerHTML = PC_KEYS.map(k => `<button type="button" data-pcs="${k}" class="${k === settings.pcs ? 'sel' : ''}" aria-pressed="${k === settings.pcs}">${miniSVG(DESIGN_SPEC, { cls: 'bdm', pcs: k })}<span>${escHb(t('pcs.' + k))}</span></button>`).join('');
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
  Object.assign(settings, { eval: $('#optEval').checked, last: $('#optLast').checked, anim: $('#optAnim').checked, threat: $('#optThreat').checked, num: $('#optNum').checked, path: $('#optPath').checked });
  if (draft.mode === 'rated') { rtStart(); return; }
  exitSpecial();
  Object.assign(settings, { mode: draft.mode, color: draft.color, level: draft.level, level2: draft.level2, n: draft.n, swap: draft.swap });
  newGame();
};

// ====================================================================== rated games vs the AI (solo, 11×11 with the swap rule)
const RT_STORE = STORE + '-rated', RT_START = 1000;
const rtClock = () => ({ base: 300000, inc: 3000 });
// rating of each AI step on the kyu / dan scale (100 points per kyu: 15級 = 450 … 1級 = 1850, then 200 per dan);
// measured by level matches on 11×11 (tools/native.c match, see MODEL_CARD.md)
const RT_LV = [0, 450, 560, 670, 835, 1000, 1165, 1365, 1490, 1555, 1650, 1690, 1730, 1795, 1835, 1875, 1915, 1955, 1995, 2035, 2095];   // from self-play matches (MODEL_CARD.md), compressed ×0.75
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
function rtClockLeft(c) {   // c: 0 Red, 1 Blue
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
  const sc = !st.winner ? 0.5 : st.winner === humanColor ? 1 : 0;
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
  html += `<div class="rt-rec">${S.n ? t('rt.rec', { n: S.n, w: S.w, l: S.l }) : t('rt.none')}</div>`;
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
function stashGame() { if (!lesson && !puzzle) savedGame = { moves, cur, evals: evals.slice(), humanColor, n: gN, swap: gSwap }; }
function exitSpecial() {
  if (!lesson && !puzzle) return;
  lesson = null; puzzle = null; lessonMarks = []; labelList = null;
  document.body.classList.remove('in-lesson', 'in-puzzle');
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false;
  startSpec = null;
  if (savedGame) { moves = savedGame.moves; cur = savedGame.cur; evals = savedGame.evals; humanColor = savedGame.humanColor; setVariant(savedGame.n); gSwap = savedGame.swap; savedGame = null; }
  else { moves = []; cur = 0; evals = []; }
  reviewing = cur !== moves.length; hintList = null;
  gameOverShown = gameOver(moves.length);
}
function quitSpecial() { exitSpecial(); update(false); afterPosition(); }
function showLessonView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); if (v === 'lessonDoneView') lsDoneLabel(); }
const LS_ICON = {
  basics: '<svg viewBox="0 0 24 24"><path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" fill="#e9d2a2" stroke="#8e7440" stroke-width="1.2"/><circle cx="12" cy="12" r="4.6" fill="#e5392e"/></svg>',
  tactics: '<svg viewBox="0 0 24 24"><circle cx="7.5" cy="8" r="4" fill="#e5392e"/><circle cx="16.5" cy="16" r="4" fill="#e5392e"/><circle cx="16" cy="7.6" r="2.4" fill="none" stroke="#ffe9a8" stroke-width="1.6"/><circle cx="8" cy="16.4" r="2.4" fill="none" stroke="#ffe9a8" stroke-width="1.6"/></svg>',
  strategy: '<svg viewBox="0 0 24 24"><path d="M3 6h18M3 18h18" stroke="#e0412f" stroke-width="3" stroke-linecap="round"/><path d="M4 7l4 10M20 7l-4 10" stroke="#2c78dc" stroke-width="3" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" fill="#e9c97a"/></svg>',
};
const lsIcon = k => `<span class="ic sv">${LS_ICON[k] || '●'}</span>`;
const plainText = html => String(html || '').replace(/<br\s*\/?>|<\/p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const lxBar = (p, cls) => `<span class="lx-bar ${cls || ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span>`;
const lxSt = (r, okTxt) => r ? (r[okTxt ? 'pass' : 'clear'] ? `<span class="lx-st ok">✓ ${okTxt ? '' : t('ls.clear') + ' '}${t('u.pt', { n: r.best })}</span>` : `<span class="lx-st">${t('u.pt', { n: r.best })}</span>`) : `<span class="lx-st new">${t('ls.notyet')}</span>`;
function diagSVG(d, cls) { const marks = {}; for (const [c, k] of d.marks || []) marks[typeof c === 'number' ? c : cellIx(c, d.n || 7)] = k; return miniSVG(typeof d.b === 'string' ? d : specOf(d), { cls, marks }); }
function lessonThumb(s) {
  const d = s.diagram;
  if (d) return diagSVG(d, 'lxb');
  const P = s.problems[0]; return P && P.s ? miniSVG(P.s, { cls: 'lxb' }) : '';
}
const pzThumbSVG = (T, j, P) => miniSVG(P.s, { cls: 'lxb' });
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
$('#btnLessonBack').onclick = () => openChoiceIdx >= 0 ? openOpenings(OPEN.sets[openChoiceIdx] && OPEN.sets[openChoiceIdx].grp) : openChoiceIdx === -2 ? openOpenings('map') : openLessons(null, LESSONS.steps[introIdx] && (LESSONS.steps[introIdx].course || 'tactics'));
$('#btnLessonClose').onclick = () => hideOverlay('#lessonOverlay');
$('#btnLessonStart').onclick = () => startLesson(introIdx);
const lsDoneSrc = () => !lesson || !lesson.virt ? 'lesson' : lesson.virt.id === 'mk' ? 'game' : 'open';
function lsDoneLabel() { const b = $('#btnLessonQuit2'), k = { lesson: 'ls.toList', open: 'ls.toOpen', game: 'ls.toGame' }[lsDoneSrc()]; b.dataset.i18n = k; b.textContent = t(k); }
function lsReveal(sel2) { const el = $('#lessonList').querySelector(sel2); if (el) el.scrollIntoView({ block: 'center' }); }
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
  const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : (P.sc.length ? Math.min(...P.sc.map(e => e[1])) - 60 : -1000);
  if (mine >= best - 15 && !(best > WINT && mine < best)) return 20;
  if (best > WINT && mine <= WINT) return mine > 400 ? 8 : 0;
  if (mine < -WINT && best >= -WINT) return 0;
  const loss = wrOf(best) - wrOf(mine);
  return Math.max(0, Math.round(20 * (1 - loss / 0.25)));
}
const cellOfMove = (pos, m) => m === SWAP ? (() => { for (let i = 0; i < pos.b.length; i++) if (pos.b[i]) return i; return -1; })() : m;
function markMove(pos, mm, cls) { const c = cellOfMove(pos, mm); if (c >= 0) lessonMarks.push({ at: c, cls }); }
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
  const val = new Map(P.sc), fmt = v => valLabel(v).big;
  fb += `<br><small style="color:var(--dim)">${t('fb.values', { a: val.has(m) ? fmt(val.get(m)) : '—', b: fmt(val.get(best)) })}</small>`;
  $('#lsFb').innerHTML = fb;
  playChime(pts >= 16);
  playMove2(m);
  const tok = busyToken;
  setTimeout(() => {
    if (!lesson || tok !== busyToken) return;
    // back to the problem: the answer (gold), your move (red) and the value of the best few cells
    moves = []; cur = 0; lessonMarks = [];
    markMove(pos0, best, 'ok'); if (m !== best) markMove(pos0, m, 'ng');
    const top = P.sc.slice().sort((a, b) => b[1] - a[1]).slice(0, 6), bv = top.length ? top[0][1] : 0;
    labelList = top.filter(([mm]) => mm !== SWAP).map(([at, v]) => { const L = valLabel(v); return { at, big: L.big, small: L.small, cls: L.cls + (v === bv ? ' best' : '') }; });
    update(false);
  }, moveDur() + 700);
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
    moves = []; cur = 0; lessonMarks = [];
    markMove(pos0, best, 'ok'); if (!pts) markMove(pos0, m, 'ng');
    if (P.ok.length > 1) for (const k of P.ok) if (k !== best && k !== m) markMove(pos0, k, 'ok2');
    update(false);
  }, moveDur() + 700);
}
$('#lsHint').onclick = () => {
  if (lesson && lesson.study) { if (lesson.i > 0) { lesson.i--; showStudy(false); } return; }
  if (!lesson || lesson.answered) return;
  lesson.hinted = true;
  const s = curStep(), P = lessonProblem();
  lessonMarks = [];
  // the hint: the area of the answer (a ring round the cells next to it), never the cell itself
  const pos0 = posAt(0).pos, c = cellOfMove(pos0, P.best), nb = E.geo(pos0.n).NB[c] || [];
  if (P.best === SWAP) lessonMarks.push({ at: c, cls: 'ok' });
  else { const e = nb.filter(x => !pos0.at(x)); lessonMarks.push({ at: e.length ? e[Math.floor(Math.random() * e.length)] : c, cls: 'carrier' }); lessonMarks.push({ at: c, cls: 'carrier' }); }
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

// ====================================================================== openings: the first-move map (swap map) + studied lines, then practice
let OPEN = null, openChoiceIdx = -1;
const openReady = fetch('openings.json?v=1').then(r => r.json()).then(d => (OPEN = d)).catch(() => null)
  .then(() => { if (!OPEN) document.querySelectorAll('.ls-tabs button[data-v=open]').forEach(b => b.remove()); });
const OP_STORE = STORE + '-open';
function opProg() { try { return JSON.parse(localStorage.getItem(OP_STORE) || '{}'); } catch (e) { return {}; } }
const LL = o => o ? (o[LANG] !== undefined ? o[LANG] : o.en !== undefined ? o.en : o.ja) : '';
const opShort = g => g.short ? LL(g.short) : t('op.' + g.id + '.short');
const opIntro = g => g.intro ? LL(g.intro) : String(t('op.' + g.id + '.intro')).split('\n');
let opGrpSel = '';
function lineSpec(g, line) { return E.replay({ n: g.n, swap: g.swap !== false }, line).pos.spec(); }
function lineLast(g, line) { const pos = E.replay({ n: g.n, swap: g.swap !== false }, line).pos; return pos.last; }
function opThumb(g) { const k = g.show || 3, pre = g.study.line.slice(0, k); return miniSVG(lineSpec(g, pre), { cls: 'lxb', last: lineLast(g, pre) }); }
const fmThumb = n => { const F = OPEN.first[n]; return miniSVG({ n, b: '', side: 1 }, { cls: 'lxb', heat: F.wr }); };
async function openOpenings(grp) {
  await openReady; selTab('open');
  if (!OPEN) { toast(t('ls.fail')); return; }
  $('#lsListTitle').textContent = t('op.title'); $('#lsListDesc').textContent = t('op.desc');
  const pr = opProg(), grps = ['map', ...new Set(OPEN.sets.map(g => g.grp))];
  if (grp) opGrpSel = grp; if (!grps.includes(opGrpSel)) opGrpSel = grps[0];
  const G0 = opGrpSel, seen = JSON.parse(localStorage.getItem(STORE + '-fm') || '{}');
  const stat = k => { if (k === 'map') { const L = Object.keys(OPEN.first); return { n: L.length, ok: L.filter(x => seen[x]).length }; } const L = OPEN.sets.filter(g => g.grp === k); return { n: L.length, ok: L.filter(g => pr[g.id] && pr[g.id].pass).length }; }, q = stat(G0);
  const icon = k => k === 'map' ? `<span class="ic sv">${LS_ICON.strategy}</span>` : `<span class="ic"><span class="pdisc p1"></span></span>`;
  let cards;
  if (G0 === 'map') cards = Object.keys(OPEN.first).map(n => `<button class="lx-card${seen[n] ? ' clear' : ''}" data-fm="${n}"><span class="lx-th">${fmThumb(+n)}</span><span class="lx-tx"><span class="lx-top"><span class="lx-no">${n}×${n}</span>${seen[n] ? '<span class="lx-st ok">✓</span>' : `<span class="lx-st new">${t('ls.notyet')}</span>`}</span><b class="lx-t">${t('fm.title', { n })}</b><small class="lx-sub">${t('fm.sub')}</small><span class="lx-desc">${plainText(t('fm.desc'))}</span></span></button>`).join('');
  else cards = OPEN.sets.map((g, i) => {
    if (g.grp !== G0) return '';
    const r = pr[g.id];
    return `<button class="lx-card${r && r.pass ? ' clear' : ''}" data-o="${i}"><span class="lx-th">${opThumb(g)}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">${g.n}×${g.n} · ${escHb(g.moves)}</span>${lxSt(r, true)}</span>` +
      `<b class="lx-t">${LL(g.title)}</b><small class="lx-sub">${opShort(g)}</small><span class="lx-desc">${plainText(opIntro(g)[0])}</span>${lxBar(r ? r.best / 100 : 0, r && r.pass ? 'ok' : '')}</span></button>`;
  }).join('');
  $('#lessonList').innerHTML = `<div class="lx">` +
    `<div class="lx-tabs">${grps.map(k => { const z = stat(k); return `<button data-grp="${k}" class="${k === G0 ? 'sel' : ''}">${icon(k)}<span class="nm">${t('op.grp.' + k)}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join('')}</div>` +
    `<div class="lx-banner">${icon(G0)}<span class="tx"><b>${t('op.grp.' + G0)}</b><small>${t('op.grp.' + G0 + '.sub')}</small></span><span class="pg">${t('lx.cleared', { a: q.ok, b: q.n })}${lxBar(q.ok / q.n, 'ok')}</span></div>` +
    `<div class="lx-grid">${cards}</div><p class="lx-credit">${t('op.credit')}</p></div>`;
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
$('#lessonList').addEventListener('click', e => { const b = e.target.closest('.lx-card[data-o]'); if (b) openOpeningChoice(+b.dataset.o); const f = e.target.closest('.lx-card[data-fm]'); if (f) openFirstMap(+f.dataset.fm); });
// the first-move map: Red's winrate after every first move (AI evaluation), i.e. which openings Blue should swap
function openFirstMap(n) {
  openChoiceIdx = -2; const F = OPEN.first[n];
  try { const s = JSON.parse(localStorage.getItem(STORE + '-fm') || '{}'); s[n] = 1; localStorage.setItem(STORE + '-fm', JSON.stringify(s)); } catch (e) {}
  let lo = 1e9, hi = -1, li = 0, hiI = 0; F.wr.forEach((v, i) => { if (v < lo) { lo = v; li = i; } if (v > hi) { hi = v; hiI = i; } });
  const fair = F.wr.map((v, i) => [v, i]).filter(([v]) => Math.abs(v - 500) <= 30).map(([, i]) => E.nameOf(i, n));
  $('#liStep').textContent = t('op.title') + ' · ' + n + '×' + n;
  $('#liTitle').textContent = t('fm.title', { n });
  $('#liBody').innerHTML = `<div class="fm-wrap"><div class="fm-sizes">${Object.keys(OPEN.first).map(k => `<button data-fmn="${k}" class="${+k === n ? 'sel' : ''}">${k}×${k}</button>`).join('')}</div>${miniSVG({ n, b: '', side: 1 }, { cls: '', heat: F.wr, heatText: true })}<div class="fm-legend"><span>${t('fm.blue')}</span><i></i><span>${t('fm.red')}</span></div></div>` +
    `<p>${t('fm.how')}</p><p>${t('fm.best', { m: E.nameOf(hiI, n), p: Math.round(hi / 10) })} ${t('fm.worst', { m: E.nameOf(li, n), p: Math.round(lo / 10) })}</p>` +
    (fair.length ? `<p>${t('fm.fair', { list: fair.slice(0, 12).join(', ') })}</p>` : '') + `<p class="note">${t('fm.note', { s: Math.round((F.ms || 0) / 1000) })}</p>`;
  $('#btnLessonStart').classList.add('hidden');
  showLessonView('lessonIntroView'); showOverlay('#lessonOverlay');
}
function openOpeningChoice(i) {
  openChoiceIdx = i; const g = OPEN.sets[i], pre = g.study.line.slice(0, g.show || 3);
  $('#liStep').textContent = t('op.title') + ' · ' + g.n + '×' + g.n;
  $('#liTitle').textContent = LL(g.title);
  $('#liBody').innerHTML = miniSVG(lineSpec(g, pre), { last: lineLast(g, pre) }) + opIntro(g).map(x => `<p>${x}</p>`).join('') +
    `<div class="op-choice"><button class="lesson-item" data-study="1"><span class="no">📖</span><span class="tx"><b>${t('op.study')}</b><small>${t('op.studyDesc', { n: g.study.line.length })}</small></span></button>` +
    `<button class="lesson-item" data-practice="1"><span class="no">✎</span><span class="tx"><b>${t('op.practice')}</b><small>${t('op.practiceDesc')}</small></span></button></div>`;
  $('#btnLessonStart').classList.add('hidden');
  showLessonView('lessonIntroView'); showOverlay('#lessonOverlay');
}
$('#liBody').addEventListener('click', e => {
  const z = e.target.closest('[data-fmn]'); if (z) { openFirstMap(+z.dataset.fmn); return; }
  const b = e.target.closest('.lesson-item'); if (!b || openChoiceIdx < 0) return;
  hideOverlay('#lessonOverlay');
  if (b.dataset.study) startStudy(openChoiceIdx); else startPractice(openChoiceIdx);
});
function startStudy(gi) {
  const g = OPEN.sets[gi];
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle');
  lesson = { study: true, gi, g, i: 0, results: [], answered: true, me: g.side };
  document.body.classList.add('in-lesson');
  enterSpecial(null); setVariant(g.n); gSwap = g.swap !== false;
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
    const side = posAt(i - 1).pos.side;
    pr = `<span class="pdisc p${side}"></span><b style="font-size:16px"><bdi>${i}. ${mvAt(i - 1)}</bdi></b>`;
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
  const g = lesson.g, mv = g.study.line.slice(0, lesson.i), side = posAt(lesson.i).pos.side;
  savedGame = null; exitSpecial();
  busyToken++; cancelWorker('ai'); cancelWorker('ana');
  Object.assign(settings, { mode: 'ai' }); humanColor = side; rgame = null; setVariant(g.n); gSwap = g.swap !== false;
  moves = mv; cur = mv.length; evals = []; reviewing = false; gameOverShown = false; manualEnd = null;
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

// ====================================================================== puzzles: connect within N moves / stop the opponent's connection (PZBook v2)
let PUZZLES = null;
const puzzlesReady = fetch('puzzles.json?v=1').then(r => r.json()).then(d => (PUZZLES = d)).catch(() => null);
let pzLevel = 0;
const pzKey = (id, j) => id + '-' + j;
const starVal = x => x === true ? 3 : (+x || 0);
const pzAt = (T, j) => T.puzzles[j];
function pzRecs(T, pr) { pr = pr || pzProgress(); return T.puzzles.map((_, j) => starVal(pr[pzKey(T.id, j)])); }
function themeTier(T) { const n = T.puzzles.reduce((a, P) => a + (P.d ? P.d : P.n || 1), 0) / Math.max(1, T.puzzles.length); return Math.max(0, Math.min(5, Math.round((n - 1.5) * 1.1))); }
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
// collection home (PZBook.home): hero → daily → tabs つなぐ / 止める → theme cards with the position
const PZ_LAST = STORE + '-pz-last', PZ_TAB = STORE + '-pz-tab', PZ_GRPS = ['Win', 'Block', 'Big'], PZ_GIC = { Win: 'trophy', Block: 'shield', Big: 'crown' };
const pzBadge = T => `<b class="gl">${T.d ? '⛉' : ''}${(T.id.match(/\d+$/) || [''])[0]}</b>`;
function pzThumbOf(T, j) { if (j < 0) j = T.puzzles.length - 1; const P = pzAt(T, j); return P && P.s ? { board: pzThumbSVG(T, j, P), tm: `<span class="pdisc p${P.s.side === P2 ? 2 : 1}"></span>` } : { board: '' }; }
async function openPuzzles() {
  const d = await puzzlesReady; selTab('puzzle');
  if (!d) { toast(t('ls.fail')); return; }
  PZBook.setLang(LANG);
  const pr = pzProgress(), dl = dailyPick(), di = dailyInfo(), Ts = PUZZLES.themes, idx = Ts.map((_, i) => i);
  const cats = PZ_GRPS.filter(g => Ts.some(T => T.grp === g));
  let cur2 = ''; try { cur2 = localStorage.getItem(PZ_TAB) || ''; } catch (e) {} if (!cats.includes(cur2)) cur2 = cats[0];
  const cont = PZBook.resume(idx.map(i => ({ key: String(i), recs: pzRecs(Ts[i], pr), cat: Ts[i].grp })), PZ_LAST);
  const box = $('#pzLevels');
  box.innerHTML = PZBook.home({
    title: t('pz.title'), lead: t('pz.desc'), all: idx.map(i => pzRecs(Ts[i], pr)),
    cont: cont && { key: cont.key + ':' + cont.j, no: cont.j + 1, name: t('pz.th.' + Ts[+cont.key].id) },
    daily: dl ? [{ key: '1', board: pzThumbOf(Ts[dl.L], dl.j).board, title: '★ ' + t('daily.title'), date: dl.date.slice(5).replace('-', '/'), done: di.today, go: t('daily.go'),
      sub: `${t('pz.th.' + Ts[dl.L].id)} · 🔥 ${t('daily.streak', { n: di.streak })}${di.best > 1 ? ' · ' + t('daily.best', { n: di.best }) : ''}` }] : [],
    cats: cats.map(g => { const r = idx.filter(i => Ts[i].grp === g).map(i => pzRecs(Ts[i], pr)).flat(); return { key: g, icon: PZBook.icon(PZ_GIC[g]), name: t('pz.grp' + g), done: r.filter(x => x > 0).length, total: r.length }; }),
    cur: cur2, catDesc: t('pz.grp' + cur2 + 'Sub'),
    cards: idx.filter(i => Ts[i].grp === cur2).map(i => { const T = Ts[i], r = pzRecs(T, pr); return Object.assign({ key: i, badge: pzBadge(T), name: t('pz.th.' + T.id), desc: t('pz.th.' + T.id + '.sub'), recs: r, tier: themeTier(T) }, pzThumbOf(T, PZBook.nextIndex(r))); }),
  });
  PZBook.bindHome(box, {
    cat: k => { try { localStorage.setItem(PZ_TAB, k); } catch (e) {} openPuzzles(); },
    cont: x => { const [i, j] = x.split(':'); startPuzzle(+i, +j); },
    daily: () => { const dl = dailyPick(); if (dl) startPuzzle(dl.L, dl.j, dl.date); },
    card: i => openPzGrid(+i),
  });
  showPzView('pzListView'); showOverlay('#puzzleOverlay');
}
function openPzGrid(i, cur2) {
  pzLevel = i; const L = PUZZLES.themes[i];
  PZBook.setLang(LANG);
  $('#pzLevelHead').innerHTML = PZBook.ghead({ badge: pzBadge(L), name: t('pz.th.' + L.id), desc: t('pz.th.' + L.id + '.sub'), chips: [t('pz.grp' + L.grp), PZBook.t('count', { n: L.puzzles.length })], tier: themeTier(L) });
  $('#pzGrid').innerHTML = PZBook.grid({ recs: pzRecs(L), cur: cur2 });
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
function startPuzzle(L, j, daily) {
  hideOverlay('#puzzleOverlay');
  stashGame(); lesson = null; document.body.classList.remove('in-lesson');
  const T = PUZZLES.themes[L], P = pzAt(T, j);
  if (!daily) PZBook.lastSet(PZ_LAST, L);
  const block = !!P.d;
  puzzle = { L, j, P, T, goal: block ? 'block' : 'win', k: P.d || 0, me: P.s.side, n: block ? 1 : P.n, state: 'play', busy: false, used: 0, daily: daily || null, hinted: false, failed: false, answered: false };
  document.body.classList.add('in-puzzle');
  enterSpecial(P.s);
  update(false); renderPuzzleCard(); pzStatus(t(block ? 'pz.startBlock' : 'pz.start'));
}
function renderPuzzleCard() {
  const Pz = puzzle, L = Pz.T, block = Pz.goal === 'block';
  $('#pzStep').textContent = Pz.daily ? `★ ${t('daily.title')} · ${Pz.daily.slice(5).replace('-', '/')}` : `${t('pz.th.' + L.id)} · ${PZBook.t('stage', { n: Math.floor(Pz.j / PZBook.STAGE) + 1 })} · No.${Pz.j + 1}`;
  $('#pzTitle').textContent = t(block ? 'pz.blockIn' : 'pz.winIn', { n: Pz.n, k: Pz.k });
  $('#pzGoal').innerHTML = `<span class="pdisc p${Pz.me}"></span><span>${t(block ? 'pz.goalBlock' : 'pz.goal', { c: pname(Pz.me), o: pname(3 - Pz.me), n: Pz.n, k: Pz.k })}</span>`;
  $('#pzDots').innerHTML = Array.from({ length: Pz.n }, (_, i) => `<i class="${i < Pz.used ? (Pz.bad && Pz.bad.includes(i) ? 'ng' : 'ok') : ''} ${i === Pz.used && Pz.state === 'play' ? 'cur' : ''}"></i>`).join('');
  $('#pzNext').disabled = !!Pz.daily || Pz.j + 1 >= L.puzzles.length || !PZBook.isOpen(pzRecs(L), Pz.j + 1);
  $('#pzHint').disabled = Pz.state !== 'play'; $('#pzAnswer').disabled = Pz.busy;
  renderInfo();
}
function pzStatus(html) { $('#pzStatus').innerHTML = html; }
// engine.c puzzle(): attacker to move → need = own moves to connect after each move (1 = this move connects, 0 = not within n);
// defender to move → need = attacker moves still needed after each reply (0 = the defender escaped)
function mateReq(n, defend) { return request('ai', { type: 'puzzle', moves: moves.slice(0, cur), n, defend: !!defend, budget: 4000 }).then(r => r && r.list); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function pickDefence(list) { let best = null; for (const e of list) { const v = e.need === 0 ? 99 : e.need < 0 ? 50 : e.need; if (!best || v > best.v || (v === best.v && Math.random() < .3)) best = { m: e.m, v }; } return best.m; }
function pickAttack(list, left) { let best = null; for (const e of list) if (e.need > 0 && e.need <= left && (!best || e.need < best.need)) best = e; return best && best.m; }
const pzReached = (Pz, pos) => pos.winner() === Pz.me;
// ---- puzzles v2: a wrong move does not end the puzzle at once. The defender (the engine's best reply) answers and the
// player may keep going until the puzzle's move count is used up; reaching the goal within it still counts (★★).
// "Obvious mistake" (flagged at once; the move is taken back and the correct move shown):
//   1. losing at once: after the move the opponent connects with its very next move;
//   2. goal out of reach: the connection now needs more empty cells than the moves left.
function pzBlunder(Pz, before, m, left) {
  const after = before.clone().play(m);
  if (after.winner()) return null;
  if (after.winCells(3 - Pz.me).length) return 'lose';
  if (after.need(Pz.me) > left - 1) return 'reach';
  return null;
}
async function puzzleMove(m) {
  const Pz = puzzle; Pz.busy = true; lessonMarks = [];
  if (Pz.goal === 'block') return blockMove(m);
  const left = Pz.n - Pz.used, tok = busyToken;
  pzStatus(t('pz.checking'));
  const list = await mateReq(left);       // values of the position before the move
  if (!list || puzzle !== Pz || tok !== busyToken) return;
  const before = posAt(cur).pos.clone();
  playMove2(m);
  Pz.used++;
  renderPuzzleCard();
  const e = list.find(x => x.m === m), dm = moveDur();
  if (pzReached(Pz, posAt(cur).pos)) { sConnect(dm); setTimeout(() => puzzleSolved(), dm + 300); return; }
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
      await failBack(good.length ? `<b class="ng">${t('pz.fail')}</b> ${t('pz.failWhy', { m: mvIn(before, m), b: mvIn(before, good[0].m), n: Pz.n })}`
        : `<b class="ng">${t('pz.fail')}</b> ${PZBook.t('outOfMoves', { n: Pz.n })}`);
      return;
    }
    const why = pzBlunder(Pz, before, m, left);
    if (why) { await failBack(`<b class="ng">${PZBook.t('blunder')}</b> ${t('pz.bl.' + why, { n: Pz.n, m: mvIn(before, m) })}${good.length ? ' ' + t('pz.best', { b: mvIn(before, good[0].m) }) : ''}`); return; }
    // not the solution, but play on: the defender answers with the engine's best move
    Pz.failed = true; Pz.strayed = true; (Pz.bad = Pz.bad || []).push(Pz.used - 1);
    renderPuzzleCard();
    pzStatus(t('pz.checking'));
    const res = await request('ai', { type: 'think', moves: moves.slice(0, cur), level: 16 });
    if (!res || puzzle !== Pz || tok !== busyToken) return;
    await sleep(Math.max(0, dm + 250));
    if (puzzle !== Pz) return;
    if (res.move === undefined || res.move < 0) { Pz.state = 'fail'; Pz.busy = false; renderPuzzleCard(); pzStatus(`<b class="ng">${t('pz.fail')}</b> ${PZBook.t('outOfMoves', { n: Pz.n })}`); return; }
    playMove2(res.move);
    await sleep(dm);
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
  const r = pickDefence(dl);
  playMove2(r);
  await sleep(dm);
  if (puzzle !== Pz) return;
  Pz.busy = false;
  renderPuzzleCard(); boardEl.classList.toggle('can', canHumanPlay());
  pzStatus(t('pz.yourMove', { n: Pz.n - Pz.used }));
}
// "stop the connection": one move; it must leave the opponent without a forced connection within k moves
async function blockMove(m) {
  const Pz = puzzle, tok = busyToken;
  pzStatus(t('pz.checking'));
  const list = await mateReq(Pz.k, true);
  if (!list || puzzle !== Pz || tok !== busyToken) return;
  const before = posAt(cur).pos.clone();
  playMove2(m); Pz.used = 1; renderPuzzleCard();
  const e = list.find(x => x.m === m), good = list.filter(x => x.need === 0), dm = moveDur();
  await sleep(dm + 250); if (puzzle !== Pz) return;
  if (e && e.need === 0) { puzzleSolved(); return; }
  Pz.state = 'fail'; Pz.busy = false; Pz.failed = true;
  // show how the opponent connects after the wrong move, then go back
  const att = await mateReq(Math.max(1, e && e.need > 0 ? e.need : Pz.k));
  if (puzzle !== Pz) return;
  const a = att && pickAttack(att, Pz.k + 1);
  if (a != null && a >= 0) { playMove2(a); await sleep(dm + 500); if (puzzle !== Pz) return; }
  moves = []; cur = 0; Pz.used = 0;
  if (good[0]) markMove(before, good[0].m, 'ok'); markMove(before, m, 'ng');
  update(false); playChime(false);
  pzStatus(`<b class="ng">${t('pz.fail')}</b> ${t('pz.failBlock', { m: mvIn(before, m), b: good[0] ? mvIn(before, good[0].m) : '—', k: Pz.k, o: pname(3 - Pz.me) })}`);
  renderPuzzleCard();
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
  pzStatus(`<b class="ok">${t('pz.solved')}</b> ${t(Pz.goal === 'block' ? 'pz.solvedBlock' : 'pz.solvedSub', { n: Pz.used, k: Pz.k })}` + (Pz.daily ? `<br>🔥 ${t('daily.streak', { n: dailyInfo().streak })}` : '') + PZBook.solved({ stars, recs: after, j: Pz.j, events: ev }));
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
  const block = Pz.goal === 'block', left = Pz.n - Pz.used;
  const list = block ? await mateReq(Pz.k, true) : await mateReq(left); if (puzzle !== Pz || !list) return;
  Pz.hinted = true;
  // the hint: the threatened area / where the connection goes — the opponent's connection path (block) or own shortest gaps
  const pos = posAt(cur).pos, good = list.filter(x => block ? x.need === 0 : x.need > 0 && x.need <= left);
  lessonMarks = [];
  const nb = new Set(); for (const g of good) for (const c of E.geo(pos.n).NB[g.m] || []) if (!pos.at(c)) nb.add(c);
  const pick = [...nb].slice(0, 3); if (good[0]) pick.push(good[0].m);
  pick.forEach(c => lessonMarks.push({ at: c, cls: 'carrier' }));
  renderFx();
  pzStatus(t(block ? 'pz.hintBlock' : 'pz.hintText'));
};
$('#pzAnswer').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.busy) return;
  Pz.busy = true; Pz.state = 'answer'; Pz.hinted = true; Pz.answered = true; lessonMarks = []; hintList = null;
  moves = []; cur = 0; Pz.used = 0; Pz.bad = []; update(false); renderPuzzleCard();
  pzStatus(t('pz.showing'));
  if (Pz.goal === 'block') {
    await sleep(600); if (puzzle !== Pz) return;
    playMove2(Pz.P.answer); Pz.used = 1;
    Pz.busy = false; renderPuzzleCard(); pzStatus(t('pz.answerDoneBlock')); return;
  }
  for (let step = 0; step < 30; step++) {
    if (puzzle !== Pz) return;
    const pos = posAt(cur).pos;
    if (statusAt(cur).over) break;
    const att = toMoveAt(cur) === Pz.me, left = Pz.n - Pz.used;
    let m;
    if (att && step === 0) m = Pz.P.answer;
    else { const list = await mateReq(Math.max(1, left), !att); if (puzzle !== Pz || !list) return; m = att ? pickAttack(list, left) : (list.length ? pickDefence(list) : null); }
    if (m == null) break;
    await sleep(700); if (puzzle !== Pz) return;
    playMove2(m); if (att) Pz.used++;
    renderPuzzleCard();
    await sleep(moveDur());
    void pos;
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
  const game = moves.slice(), key = gameKey(), st0 = startObj(), sk = startKey();
  const run = rv = { key, list: [], done: 0, total: game.length + 1, running: true, ws: [] };
  for (let k = 0; k < RV_WORKERS; k++) run.ws.push(makeWorker());
  rvOpen = true; renderReview(); revealReview();
  let next = 0;
  const loop = async w => {
    while (next <= game.length && rv === run) {
      const i = next++, pk = sk + '|' + game.slice(0, i).join(',');
      let list = anaCache.get(pk);
      if (!list) {
        const res = await new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve }); w.postMessage({ type: 'analyze', start: st0, moves: game.slice(0, i), time: 700, id }); });
        if (rv !== run || !res) return;
        list = res.list; anaCache.set(pk, list);
      }
      run.list[i] = list;
      if (gameKey() === key && (!evals[i] || evals[i].kind === 'heur') && list.length) { const ev = evalFromList(list, toMoveAt(i)); if (ev) evals[i] = ev; }
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
  if (matchMedia('(max-aspect-ratio: 1/1) and (pointer: coarse)').matches) setTimeout(() => $('#reviewCard').scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
}
// judgement of move i+1 (played from position i): winrate of the best move vs the move played
// (the played move's own search value when it was searched enough, else the value of the next position)
function rvValueAfter(i) {
  const L = rv.list[i + 1];
  if (i + 1 === moves.length) { const w = posAt(i + 1).pos.winner(); if (w) return w === toMoveAt(i) ? WIN - 1 : -(WIN - 1); }
  if (!L || !L.length) return null;
  return -L[0].v;
}
function rvJudge(i) {
  if (!rv || rv.key !== gameKey()) return null;
  const L = rv.list[i]; if (!L || !L.length) return null;
  const m = moves[i], best = L[0], own = L.find(e => e.m === m);
  let mine = own && (own.n >= Math.max(60, best.n * .1) || own.kind === 'exact') ? own.v : rvValueAfter(i);
  if (mine == null) return null;
  if (own && own.kind === 'exact') mine = own.v;
  const loss = wrOf(best.v) - wrOf(mine);
  let q = null, desc = '';
  const word = v => t(v > WINT ? 'rv.win' : v < -WINT ? 'rv.loss' : wrOf(v) >= .5 ? 'rv.ahead' : 'rv.behind');
  if (best.v > WINT && mine <= WINT) { q = 'bad'; desc = `${t('rv.win')}→${word(mine)}`; }
  else if (wrOf(best.v) >= .55 && wrOf(mine) < .42 && loss >= .15) { q = 'bad'; desc = `${Math.round(wrOf(best.v) * 100)}%→${Math.round(wrOf(mine) * 100)}%`; }
  else if (loss >= 0.2) { q = 'bad'; desc = t('rv.eval', { l: Math.round(loss * 100) }); }
  else if (loss >= 0.09) { q = 'dubious'; desc = t('rv.eval', { l: Math.round(loss * 100) }); }
  const ok = !q && (m === best.m || loss < 0.03);
  return { q, ok, desc, best: best.m, m, loss };
}
// 振り返り解説 (coach): the move being viewed is explained; at the end of the game a short summary
const crName = (pos, x) => '<bdi>' + mvIn(pos, x) + '</bdi>';
// did the opponent's last move intrude into a bridge of the mover (and was the other cell of the bridge left)?
function bridgeSave(pos) {
  const last = pos.last; if (last < 0 || pos.ply < 1) return -1;
  const n = pos.n, me = pos.side, r0 = Math.floor(last / n), c0 = last % n, ring = [];
  for (const [dr, dc] of DIRS) { const r = r0 + dr, c = c0 + dc; ring.push(r >= 0 && r < n && c >= 0 && c < n ? r * n + c : (r < 0 || r >= n) && c >= 0 && c < n ? -1 : (c < 0 || c >= n) && r >= 0 && r < n ? -2 : -3); }
  const own = v => v >= 0 ? pos.at(v) === me : v === -1 ? me === P1 : v === -2 ? me === P2 : false;
  for (let k = 0; k < 6; k++) { const y = ring[k]; if (y < 0 || pos.at(y)) continue; const a = ring[(k + 5) % 6], b = ring[(k + 1) % 6]; if (own(a) && own(b) && !(a < 0 && b < 0)) return y; }
  return -1;
}
function crExplain(i, j) {   // { kind, txt } for move i (played from position i)
  const pos = posAt(i).pos, m = j.m, b = j.best;
  if (!j.q) return { kind: '', txt: j.ok ? t('cr.best') : t('cr.good', { b: crName(pos, b) }) };
  const L = rv.list[i], bestV = L && L[0] ? L[0].v : 0;
  if (bestV > WINT) return { kind: 'missWin', txt: t('cr.missWin', { b: crName(pos, b) }) };
  const after = pos.clone().play(m);
  if (m !== SWAP && after.winCells(3 - pos.side).length) return { kind: 'allowWin', txt: t('cr.allowWin', { b: crName(pos, b) }) };
  const sv = bridgeSave(pos);
  if (sv >= 0 && b === sv && m !== sv) return { kind: 'bridge', txt: t('cr.bridge', { b: crName(pos, b) }) };
  if (m === SWAP) return { kind: 'swap', txt: t('cr.swapBad', { b: crName(pos, b) }) };
  if (b === SWAP) return { kind: 'swap', txt: t('cr.swapMiss') };
  const r = Math.floor(m / pos.n), c = m % pos.n, edge = pos.side === P1 ? (c === 0 || c === pos.n - 1) : (r === 0 || r === pos.n - 1);
  if (pos.ply < pos.n && (r === 0 || r === pos.n - 1 || c === 0 || c === pos.n - 1) && !edge) return { kind: 'edge', txt: t('cr.edge', { b: crName(pos, b) }) };
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
function drawReviewFx() {
  if (lesson || puzzle || !rvOpen || !rv || rv.running || rv.key !== gameKey() || cur >= moves.length) return false;
  const L = rv.list[cur]; if (!L) return false;
  drawHints(L);
  const j = rvJudge(cur), m = moves[cur];
  if (m !== SWAP) fxDiv('mark played' + (j && j.q ? ' ' + j.q : ''), m);
  return true;
}
$('#rvBody').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
$('#rvClose').onclick = () => { rvOpen = false; if (rv && rv.running) rvCancel(); renderReview(); renderFx(); renderKifu(); };
$('#btnAnalyze').onclick = () => runReview();
$('#btnResAnalyze').onclick = () => { hideOverlay('#resultOverlay'); runReview(); };

// ====================================================================== share / load
const K64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
// 2 characters per move: the cell number (SWAP = 1023 → "P_")
const encMoves = list => list.map(m => K64[m >> 6] + K64[m & 63]).join('');
function decMoves(s, n, sw) {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 2) return null;
  const pos = new E.Pos(n, sw), out = [];
  for (let i = 0; i < s.length; i += 2) { const m = K64.indexOf(s[i]) * 64 + K64.indexOf(s[i + 1]); if (!pos.legal(m)) return null; pos.play(m); out.push(m); }
  return out;
}
// "11x11 f6 swap e7 …" (an optional size / "noswap", then cell names and "swap") or a share URL
function parseGameText(v) {
  v = (v || '').trim();
  const h = v.match(/#(.*)$/);
  if (h) {
    const q = new URLSearchParams(h[1]); if (!q.has('k')) return null;
    const n = SIZES.includes(+q.get('s')) ? +q.get('s') : 11, sw = q.get('w') !== '0';
    const list = decMoves(q.get('k') || '', n, sw); if (!list) return null; return { list, n: q.has('n') ? parseInt(q.get('n'), 10) : undefined, size: n, swap: sw };
  }
  v = v.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ');
  let toks = v.split(/[\s,;]+/).filter(Boolean), n = 0, sw = true;
  toks = toks.filter(x => { const m = x.match(/^(\d{1,2})x\1$/i) || x.match(/^n=(\d{1,2})$/i) || x.match(/^size=?(\d{1,2})$/i); if (m) { n = +m[1]; return false; } if (/^noswap$/i.test(x)) { sw = false; return false; } return true; });
  if (!toks.length) return null;
  const tryN = n ? [n] : [gN, ...SIZES.filter(x => x !== gN)];
  let bad = 0;
  for (const nn of tryN) {
    if (!SIZES.includes(nn)) continue;
    const pos = new E.Pos(nn, sw), out = []; let ok = true;
    for (let k = 0; k < toks.length; k++) { const m = E.parse(pos, toks[k]); if (m == null) { ok = false; bad = Math.max(bad, k + 1); break; } pos.play(m); out.push(m); }
    if (ok) return { list: out, size: nn, swap: sw };
  }
  return { bad: bad || 1 };
}
function openLoaded(list, n, size, sw) {
  ['#resultOverlay', '#newOverlay', '#lessonOverlay', '#puzzleOverlay', '#pasteOverlay'].forEach(hideOverlay);
  if (lesson || puzzle) { savedGame = null; exitSpecial(); }
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); rvCancel(); rv = null; rvOpen = false; thinking = 0; animating = false;
  settings.mode = 'pvp'; rgame = null; startSpec = null; manualEnd = null; setVariant(size); gSwap = sw !== false;
  moves = list; evals = []; hintList = null;
  cur = n === undefined || isNaN(n) ? moves.length : Math.max(0, Math.min(moves.length, n));
  reviewing = cur !== moves.length; gameOverShown = gameOver(moves.length);
  update(false); save(); afterPosition();
}
function loadText(v) {
  const r = parseGameText(v);
  if (!r) { toast(t('paste.invalid'), 2200); return false; }
  if (r.bad) { toast(t('paste.bad', { n: r.bad }), 2500); return false; }
  openLoaded(r.list, r.n, r.size, r.swap); toast(t('paste.loaded', { n: r.list.length }), 1800);
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
  const url = location.origin + location.pathname + '#k=' + encMoves(moves) + '&s=' + gN + '&w=' + (gSwap ? 1 : 0) + (cur < moves.length ? '&n=' + cur : '');
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
if (window.RulesOffer) RulesOffer.init({ game: 'hex', lang: () => LANG, open: () => openRules(null, 0), watch: '#rulesOverlay' });
const hadSave = load();
try { const sp = localStorage.getItem('atlas-sfx'); if (sp === '0' || sp === '1') settings.sound = sp === '1'; } catch (e) {} // サイト共通のサウンド設定（トップページと連動）
designApply();
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) { LANG = q; try { localStorage.setItem('aicoding-lang', q); } catch (e) {} } }
applyI18n();
if (!hadSave) { setVariant(settings.n); gSwap = settings.swap; }
// PC header bar: title left, menu (new > undo > hint > rules > lessons > puzzles) + icons right, game info in between
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
  if (lesson) { if (lesson.study) showStudy(false); else renderLessonCard(); }
  if (puzzle) renderPuzzleCard();
  if ($('#lessonOverlay').classList.contains('show')) { if (!$('#lessonListView').classList.contains('hidden')) (document.querySelector('.ls-tabs button.sel[data-v=open]') ? openOpenings() : openLessons()); else if (!$('#lessonIntroView').classList.contains('hidden')) (openChoiceIdx >= 0 ? openOpeningChoice(openChoiceIdx) : openChoiceIdx === -2 ? openFirstMap(G ? G.n : 11) : openIntro(introIdx)); }
  if ($('#puzzleOverlay').classList.contains('show')) { if (!$('#pzListView').classList.contains('hidden')) openPuzzles(); else openPzGrid(pzLevel); }
};
if (loadFromHash()) { /* shared game opened */ }
else if (!hadSave) { update(false); openNewDialog(); }
else { update(false); afterPosition(); }
// expose for tests
window.__hx = { get moves() { return moves; }, get cur() { return cur; }, settings, get rv() { return rv; }, rvJudge, dailyPick, parseGameText, encMoves, decMoves, onCell, statusAt, posAt, newGame, get lesson() { return lesson; }, get puzzle() { return puzzle; }, startLesson, startPuzzle, lessonsReady, puzzlesReady, openReady, get LESSONS() { return LESSONS; }, get PUZZLES() { return PUZZLES; }, get OPEN() { return OPEN; }, playMove, viewAt, cellAt, get G() { return G; }, commit, get gN() { return gN; } };

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
