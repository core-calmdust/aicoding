'use strict';
// Go (囲碁) — page script. Same structure as the site's other premium games (Checkers / Nine Men's Morris):
// board + side panel, AI (20 steps) in a Web Worker (engine.js), rated games vs the AI (予備選), lessons, openings,
// puzzles (PZBook v2) — those three live in learn.js —, post-game review with a coach, share / SGF, daily puzzle.
// Online play: online.js + online-ui.js.
// ====================================================================== rules
const R = window.GoRules, PASS = R.PASS;
const P1 = 1, P2 = 2;                     // P1 = Black (moves first), P2 = White
let HB = null;                            // PC header bar (shared/headerbar.js)
let game = { n: 19, komi: 6.5, rule: 'jp', ha: 0 };   // board size, komi, rules ('jp' territory / 'cn' area), handicap stones
let startSpec = null;                     // start position (handicap / lesson / puzzle); null = empty board
let moves = [];                           // game record: point indices (y*n+x), PASS = -1
let cur = 0;                              // number of moves shown
const N = () => game.n;
// ---- positions: an incremental cache of the positions after 0..k moves
let PC = { base: '', list: [], mv: [] };
const baseKey = () => game.n + '/' + (startSpec ? JSON.stringify(startSpec) : '');
function posAt(i) {
  const bk = baseKey();
  if (PC.base !== bk) PC = { base: bk, list: [R.Pos.from(startSpec || { n: game.n })], mv: [] };
  let k = 0; const L = PC.list, mv = PC.mv;
  while (k < mv.length && k < i && mv[k] === moves[k]) k++;
  if (k < mv.length) { L.length = k + 1; mv.length = k; }
  for (let j = mv.length; j < i; j++) { const r = L[j].tryPlay(moves[j]); if (!r) break; L.push(r.pos); mv.push(moves[j]); }
  return L[Math.min(i, L.length - 1)];
}
const toMoveAt = i => posAt(i).turn;
const isCounting = i => i === moves.length && i >= 2 && moves[i - 1] === PASS && moves[i - 2] === PASS && !statusAt(i).over;
// {over, winner, draw, why, diff}
function statusAt(i) {
  if (manualEnd && manualEnd.n === moves.length && i === moves.length && !lesson && !puzzle && settings.mode !== 'online') return manualEnd;
  if (settings.mode === 'online' && window.olOver && i === moves.length && !lesson && !puzzle) { const o = olOver(); if (o) return o; }
  if (rgame && rgame.over && i === moves.length && !lesson && !puzzle) return rgame.over;
  return { over: false };
}
const mvName = (m, n) => m === PASS ? t('mv.pass') : R.coord(m, n || game.n);
function mvAt(i) { return mvName(moves[i]); }

// ====================================================================== state
const STORE = 'aicoding-go';
const settings = { mode: 'ai', color: 1, level: 9, level2: 9, anim: true, sound: true, hint: false, eval: true, last: true, coord: true, coordAll: false, num: false, atari: false, lang: '', bd: 'kaya', st: 'classic', size: 19, rule: 'jp', ha: 0, komi: 'auto', tap: 'auto', terr: false };
const SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
function detectLang() { const n = (navigator.language || 'ja').toLowerCase(); return ['ja', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'].find(c => n.startsWith(c)) || 'en'; }
let LANG = detectLang();
function t(k, v) { let x = (I18N[LANG] || I18N.en)[k]; if (x === undefined) x = I18N.en[k]; if (x === undefined) x = I18N.ja[k]; if (x === undefined) return k; if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; }
const LL = o => o ? (typeof o === 'string' ? o : o[LANG] !== undefined ? o[LANG] : o.en !== undefined ? o.en : o.ja) : '';
const pname = p => t(p === P1 ? 'p1' : 'p2');
// AI strength: 25 steps labelled with the ranks measured on 19x19 against KataGo's human-like model (MODEL_CARD.md):
// 18級 … 1級, 初段 … 八段, then the strongest. 11級 and 8級 sit halfway between their neighbours' settings (not measured).
const RANKS = [null, 'k18', 'k17', 'k16', 'k15', 'k14', 'k13', 'k12', 'k11', 'k10', 'k9', 'k8', 'k7', 'k6', 'k5', 'k4', 'k3', 'k2', 'k1', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 't1'];
const LV_MAX = RANKS.length - 1;
// rank as a number: 18級 = -17 … 1級 = 0, 初段 = 1 … 八段 = 8, beyond = 9+
const rankVal = i => { const r = RANKS[Math.max(1, Math.min(LV_MAX, i))]; const v = +r.slice(1); return r[0] === 'k' ? 1 - v : r[0] === 'd' ? v : 8 + v; };
const LV = i => { const r = RANKS[Math.max(1, Math.min(LV_MAX, i))], v = +r.slice(1); return r[0] === 'k' ? t('lv.kyu', { n: v }) : r[0] === 'd' ? t('lv.dan' + v) : t('lv.top' + v); };
const LVD = i => { const v = rankVal(i); return t('lvd')[v <= -12 ? 0 : v <= -6 ? 1 : v <= 0 ? 2 : v <= 5 ? 3 : 4]; };
// points: 3.5 → "3目半" / "3.5"
function pts(x) { x = Math.abs(Math.round(x * 2) / 2); return t('u.pts', { n: LANG === 'ja' ? (x % 1 ? Math.floor(x) + '目半' : x + '目') : (x % 1 ? x.toFixed(1) : String(x)) }).replace('目目', '目'); }
const fmtLead = v => (v >= 0 ? '+' : '−') + (Math.round(Math.abs(v) * 10) / 10).toFixed(1);
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
function renderBrand() { const tt = t('title'); $('#brandTitle').textContent = tt; $('#brandSub').textContent = t('sub'); const h1 = $('#brandTitle').closest('h1'); if (h1) h1.style.setProperty('--tl', Math.max(14, tt.length)); }   // (the portal skin moves the h1 into its top bar)
let humanColor = P1;
let reviewing = false;
let rbS = null;          // review box study (検討モード, rbox.js): { base, pos: [Pos], mv: [moves] }
let manualEnd = null;    // resignation / time / counted result: { over, winner, draw, why, diff, n, dead }
let aiVals = [];         // AI winrates (its own view) per ply, for its resignation
let evals = [];          // evals[i] = { wr (black), lead (black), src } after i moves
let busyToken = 0;
let lesson = null, puzzle = null;
let rtHold = false;
let rgame = null;        // rated game vs the AI: { id, lv, or, my, tag, ct: [ms, ms], byo: [ms, ms], t, over, done }
let gameOverShown = false;
let count = null;        // counting phase: { key, dead: Set, own, busy }
let terrOwn = null;      // territory overlay (ownership estimate, black view) for the position shown: { key, own }

function validMoves(spec, list, n) {
  try { let p = R.Pos.from(spec || { n }); for (const m of list) { if (typeof m !== 'number') return false; const r = p.tryPlay(m); if (!r) return false; p = r.pos; } return true; } catch (e) { return false; }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!d) return false;
    Object.assign(settings, d.settings || {});
    if (settings.mode === 'online') settings.mode = 'pvp';
    if (!(settings.level >= 1 && settings.level <= LV_MAX)) settings.level = 9;
    if (!(settings.level2 >= 1 && settings.level2 <= LV_MAX)) settings.level2 = 9;
    if (d.game && d.game.n >= 5 && d.game.n <= 19 && Array.isArray(d.moves)) {
      if (!validMoves(d.start || null, d.moves, d.game.n)) return false;
      game = d.game; startSpec = d.start || null;
      moves = d.moves; humanColor = d.humanColor || 1; manualEnd = d.end && d.end.n === d.moves.length ? d.end : null; evals = Array.isArray(d.evals) ? d.evals : [];
      rgame = d.rated && d.rated.id ? d.rated : null; if (rgame && !rgame.over) { rgame.t = Date.now(); rtHold = true; }
      cur = moves.length; gameOverShown = statusAt(cur).over;
      return true;
    }
  } catch (e) {}
  return false;
}
function save() {
  if (settings.mode === 'online' || lesson || puzzle) { try { const d = JSON.parse(localStorage.getItem(STORE) || '{}'); d.settings = Object.assign({}, settings, settings.mode === 'online' ? { mode: 'pvp' } : {}); localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {} return; }
  try { localStorage.setItem(STORE, JSON.stringify({ settings, game, start: startSpec, moves, humanColor, evals: evals.slice(0, moves.length + 1), rated: rgame, end: manualEnd })); } catch (e) {}
}

// ====================================================================== engine worker (one worker; newer jobs pre-empt older ones)
let jobId = 0;
const ENGINE_URL = 'engine.js?v=7';
const COARSE = matchMedia('(pointer: coarse)').matches;
function makeWorker() {
  const w = new Worker(ENGINE_URL);
  w.jobs = new Map();
  w.onmessage = e => {
    const m = e.data, j = w.jobs.get(m.id); if (!j) return;
    if (m.type === 'progress') { j.onProgress && j.onProgress(m); return; }
    w.jobs.delete(m.id); j.resolve(m.superseded || m.error ? null : m);
  };
  w.onerror = () => { w.jobs.forEach(j => j.resolve(null)); w.jobs.clear(); };
  return w;
}
let W = makeWorker();
let W2 = null;            // a second worker only for the post-game review on PCs (whole-game pass, then the review box's searches; kept alive with its nets loaded)
function jobBase(spec, list) { return { spec: spec || { n: game.n }, moves: list, komi: game.komi }; }
function request(msg, onProgress, w) {
  w = w || W;
  return new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve, onProgress }); w.postMessage({ ...msg, id }); });
}
function cancelWorker() { W.postMessage({ type: 'cancel' }); }
const anaCache = new Map();     // position key -> analysis {lead, wr, list}
const rawCache = new Map();     // position key -> raw eval {lead, wr}
const keyOf = i => baseKey() + '|' + game.komi + '|' + moves.slice(0, i).join(',');
const strongNet = () => !COARSE || settings.level >= 26;

// ====================================================================== sound (stone on wood)
let actx = null;
function ctx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === 'suspended' && !document.hidden) actx.resume(); return actx; }
document.addEventListener('visibilitychange', () => { if (actx) { if (document.hidden) actx.suspend(); else actx.resume(); } });
function noise(a, t0, dur, vol, freq, q, type) {
  const len = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  const n = a.createBufferSource(); n.buffer = buf; const f = a.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
  const g = a.createGain(); g.gain.value = vol; n.connect(f).connect(g).connect(a.destination); n.start(t0);
}
function tone(a, t0, f0, f1, dur, vol, type) {
  const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine';
  o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur * 0.7);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
// "pachi": a crisp click of slate on kaya
function sStone(soft, delay) { if (!settings.sound || document.hidden) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000, v = soft ? 0.12 : 0.34; noise(a, t0, 0.025, v * 1.4, 3200, 1.6); tone(a, t0, 1900, 900, 0.05, v * 0.25, 'triangle'); tone(a, t0, 210, 120, 0.09, v * 0.6); }
function sCapture(k, delay) { if (!settings.sound || document.hidden) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000 + 0.12; for (let i = 0; i < Math.min(5, k); i++) noise(a, t0 + i * 0.045 + Math.random() * 0.02, 0.02, 0.16, 4200 + Math.random() * 1500, 2); }
function playChime(win) {
  if (!settings.sound || document.hidden) return;
  const a = ctx(); if (!a) return;
  const t0 = a.currentTime + 0.05;
  if (win) { tone(a, t0, 1318.5, 0, 0.9, 0.16, 'triangle'); tone(a, t0 + 0.22, 1046.5, 0, 1.1, 0.16, 'triangle'); }   // ピ〜ンポ〜ン
  else [392, 330].forEach((fr, i) => tone(a, t0 + i * 0.16, fr, 0, 0.5, 0.12, 'sine'));
}
function playTick() { if (!settings.sound || document.hidden) return; const a = ctx(); if (!a) return; tone(a, a.currentTime, 880, 0, 0.08, 0.05, 'triangle'); }

// ====================================================================== DOM / board
const $ = s => document.querySelector(s);
const svg = $('#bsvg'), goban = $('#goban');
const reduceMotion = false /* site rule: animations are never skipped for the OS reduce-motion setting */;
const animOn = () => settings.anim && !reduceMotion;
const NS = 'http://www.w3.org/2000/svg';
let view = null;             // [x0, y0, x1, y1] zoomed part of the board (lessons / puzzles / openings), null = whole board
let drawnKey = '';           // grid drawn for size / view / coords / design
const stoneEls = new Map();  // point -> <image>
let shownKey = '';
const xyOf = i => [i % N(), Math.floor(i / N())];
function designApply() {
  if (!GoTheme.BOARDS[settings.bd]) settings.bd = 'kaya';
  if (!GoTheme.STONES[settings.st]) settings.st = 'classic';
  document.documentElement.dataset.bd = settings.bd; document.documentElement.dataset.st = settings.st;
  const B = GoTheme.BOARDS[settings.bd], st = goban.style;
  st.setProperty('--bd-line', B.line); st.setProperty('--bd-star', B.star); st.setProperty('--bd-coord', B.coord);
  st.setProperty('--bd-base', B.base[1]); st.setProperty('--bd-edge1', B.edge[0]); st.setProperty('--bd-edge2', B.edge[1]);
  const px = COARSE ? 900 : 1400;
  goban.style.backgroundImage = 'url(' + GoTheme.boardTex(settings.bd, px) + ')';
  drawnKey = ''; stoneEls.forEach(el => el.remove()); stoneEls.clear(); shownKey = '';
}
// board margin: coordinates on the top and left edges (the usual way in Japanese books and software), or on all four sides
function padOf() { return settings.coord ? 1.05 : 0.62; }                       // top / left
function padFar() { return settings.coord && settings.coordAll ? 1.05 : 0.62; }   // bottom / right
// viewBox of the shown part of the board
function vbox() {
  const n = N(), p = padOf(), q = padFar();
  if (!view) return [-p, -p, n - 1 + p + q, n - 1 + p + q];
  let [x0, y0, x1, y1] = view; const w = x1 - x0, h = y1 - y0, s = Math.max(w, h);
  // square box (the frame is square): grow the short side, keep inside the board
  let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  x0 = cx - s / 2; x1 = cx + s / 2; y0 = cy - s / 2; y1 = cy + s / 2;
  const sh = (a, b, lo, hi) => { if (a < lo) { b += lo - a; a = lo; } if (b > hi) { a -= b - hi; b = hi; } return [a, b]; };
  [x0, x1] = sh(x0, x1, 0, n - 1); [y0, y1] = sh(y0, y1, 0, n - 1);
  const pl = x0 <= 0 ? p : 0.55, pt = y0 <= 0 ? p : 0.55, pr = x1 >= n - 1 ? p : 0.55, pb = y1 >= n - 1 ? p : 0.55;   // zoomed: labels on whichever board edges are shown
  return [x0 - pl, y0 - pt, x1 - x0 + pl + pr, y1 - y0 + pt + pb];
}
function drawGrid() {
  const n = N(), vb = vbox(), key = [n, vb.join(','), settings.coord, settings.coordAll, settings.bd].join('|');
  if (key === drawnKey) return;
  drawnKey = key;
  svg.setAttribute('viewBox', vb.map(v => v.toFixed(3)).join(' '));
  goban.classList.toggle('crop', !!view);
  // background texture covers the frame; when zoomed show the texture enlarged so the grain matches the zoom
  const full = n - 1 + padOf() + padFar(), sc = view ? Math.min(1.3, full / vb[2]) : 1;   // zoomed: the grain grows only a little (huge planks look fake)
  goban.style.backgroundSize = (sc * 100) + '% ' + (sc * 100) + '%';
  goban.style.backgroundPosition = view ? `${-((vb[0] + padOf()) / full) * sc * 100 / (sc - 1 || 1)}% ${-((vb[1] + padOf()) / full) * sc * 100 / (sc - 1 || 1)}%` : '0 0';
  const lw = n <= 9 ? 0.024 : n <= 13 ? 0.028 : 0.034;
  let d = '';
  for (let i = 0; i < n; i++) { d += `M0 ${i}H${n - 1}M${i} 0V${n - 1}`; }
  let s = `<g class="grid"><path class="gl" d="${d}" stroke-width="${lw}"/><rect class="gl" x="0" y="0" width="${n - 1}" height="${n - 1}" fill="none" stroke-width="${lw * 1.8}"/>`;
  for (const i of R.starPoints(n)) { const [x, y] = xyOf(i); s += `<circle class="gstar" cx="${x}" cy="${y}" r="${n <= 9 ? 0.09 : 0.11}"/>`; }
  if (settings.coord) {
    const fs = 0.38, o = 0.72;
    const all = settings.coordAll || !!view;
    for (let x = 0; x < n; x++) { const L = R.COLS[x]; s += `<text class="gco" x="${x}" y="${-o}" font-size="${fs}">${L}</text>` + (all ? `<text class="gco" x="${x}" y="${n - 1 + o}" font-size="${fs}">${L}</text>` : ''); }
    for (let y = 0; y < n; y++) { const L = n - y; s += `<text class="gco" x="${-o}" y="${y}" font-size="${fs}">${L}</text>` + (all ? `<text class="gco" x="${n - 1 + o}" y="${y}" font-size="${fs}">${L}</text>` : ''); }
  }
  s += '</g><g id="gTerr"></g><g id="gStones"></g><g id="gMarks"></g><g id="gHints"></g><g id="gGhost"></g>';
  svg.innerHTML = s;
  stoneEls.clear(); shownKey = '';
}
const SR = 0.47;  // stone radius (grid units; real stones are a little smaller than the grid spacing); images are 1.3 x diameter with the shadow
function stoneHref(c, i) { return GoTheme.stoneImg(settings.st, c, c === 2 ? (i * 7 + (i >> 3)) % 4 : i % 2); }
function newStone(i, c) {
  const el = document.createElementNS(NS, 'image'), [x, y] = xyOf(i), w = 2 * SR * 1.3;
  el.setAttribute('href', stoneHref(c, i)); el.setAttribute('x', x - w / 2); el.setAttribute('y', y - w / 2); el.setAttribute('width', w); el.setAttribute('height', w);
  el.setAttribute('class', 'st'); el.dataset.c = c; el.style.transformOrigin = `${x}px ${y}px`; el.style.transformBox = 'view-box';
  return el;
}
function syncStones(pos, anim, captured) {
  const g = $('#gStones'); if (!g) return;
  const n = N();
  for (const [i, el] of stoneEls) if (pos.b[i] !== +el.dataset.c) {
    if (anim && captured && captured.includes(i) && animOn()) { el.classList.add('gone'); setTimeout(() => el.remove(), 480); }
    else el.remove();
    stoneEls.delete(i);
  }
  for (let i = 0; i < n * n; i++) {
    const c = pos.b[i]; if (!c || stoneEls.has(i)) continue;
    const el = newStone(i, c); if (anim && animOn()) el.classList.add('new');
    g.appendChild(el); stoneEls.set(i, el);
  }
}
function renderBoard(anim) {
  drawGrid();
  if (rbS) { syncStones(rbShown(), false, null); renderFx(); svg.classList.add('can'); return; }
  const pos = posAt(cur), key = keyOf(cur), prev = shownKey; shownKey = key;
  let captured = null;
  if (anim && cur > 0 && prev === keyOf(cur - 1) && moves[cur - 1] !== PASS) {
    const before = posAt(cur - 1); captured = [];
    for (let i = 0; i < before.b.length; i++) if (before.b[i] && !pos.b[i]) captured.push(i);
    sStone(false);
    if (captured.length) sCapture(captured.length);
  }
  syncStones(pos, anim, captured);
  renderFx();
  svg.classList.toggle('can', canHumanPlay());
}

// ---------------------------------------------------------------- fx: last move, ko, numbers, territory, hints, marks
let hintList = null;           // candidate moves [{m, lead, wr, n}] (mover's view)
let lessonMarks = [];          // [{at, cls: ok|ng|x|tri|sq|dash}] / [{arrow: [a, b]}]
let labelList = null;          // explicit labels [{at, text, cls}]
function el(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
function renderFx() {
  const gM = $('#gMarks'), gH = $('#gHints'), gT = $('#gTerr'); if (!gM) return;
  gM.innerHTML = ''; gH.innerHTML = ''; gT.innerHTML = '';
  if (rbS) { rbStudyFx(gM, gH); updateGhost(); return; }
  const pos = posAt(cur), n = N(), st = statusAt(cur);
  for (const [, e] of stoneEls) e.classList.remove('dead');
  // territory / counting overlay
  const cnt = count && count.key === keyOf(cur) ? count : null;
  const own = cnt ? cnt.own : (settings.terr && terrOwn && terrOwn.key === keyOf(cur) && !lesson && !puzzle && !rtLive() && !(window.olLive && olLive())) ? terrOwn.own : null;
  if (cnt) {
    const sc = R.score(pos, [...cnt.dead], game.rule, game.komi);
    for (const i of cnt.dead) { const e = stoneEls.get(i); if (e) e.classList.add('dead'); }
    for (let i = 0; i < n * n; i++) {
      const o = sc.own[i]; if ((pos.b[i] && !cnt.dead.has(i)) || (o !== 1 && o !== 2)) continue;
      const [x, y] = xyOf(i);
      el('rect', { x: x - 0.2, y: y - 0.2, width: 0.4, height: 0.4, rx: 0.04, fill: o === 1 ? 'rgba(10,10,12,.85)' : 'rgba(250,248,242,.92)', stroke: o === 1 ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.35)', 'stroke-width': 0.02, class: 'terr' }, gT);
    }
  } else if (own) {
    for (let i = 0; i < n * n; i++) {
      const v = own[i]; if (Math.abs(v) < 0.2) continue;
      const [x, y] = xyOf(i), s = 0.15 + Math.min(1, Math.abs(v)) * 0.32;
      if (pos.b[i] && (pos.b[i] === P1) === (v > 0)) continue;
      el('rect', { x: x - s / 2, y: y - s / 2, width: s, height: s, rx: 0.03, fill: v > 0 ? `rgba(10,10,12,${0.35 + Math.abs(v) * 0.5})` : `rgba(250,248,242,${0.35 + Math.abs(v) * 0.55})`, stroke: v > 0 ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.55)', 'stroke-width': 0.03, class: 'own' }, gT);
    }
  }
  // last move
  const m = cur > 0 ? moves[cur - 1] : null;
  if (settings.last && m != null && m !== PASS && pos.b[m]) {
    const [x, y] = xyOf(m);
    el('circle', { cx: x, cy: y, r: 0.24, class: 'lm', stroke: pos.b[m] === P1 ? '#fff' : '#111' }, gM);
  }
  if (pos.ko >= 0 && !st.over) { const [x, y] = xyOf(pos.ko); el('rect', { x: x - 0.22, y: y - 0.22, width: 0.44, height: 0.44, class: 'halo' }, gM); el('rect', { x: x - 0.22, y: y - 0.22, width: 0.44, height: 0.44, class: 'ko' }, gM); }
  // move numbers (the last 50 moves of the shown position, or all in reviews of short games)
  if (settings.num) {
    const from = Math.max(0, cur - 300);
    const last = new Map(); for (let k = from; k < cur; k++) if (moves[k] !== PASS) last.set(moves[k], k + 1);
    for (const [i, k] of last) { if (!pos.b[i]) continue; const [x, y] = xyOf(i); const tx = el('text', { x, y: y + 0.02, class: 'mnum', 'font-size': k >= 100 ? 0.36 : 0.44, fill: pos.b[i] === P1 ? '#f2f2f2' : '#1b1b1b' }, gM); tx.textContent = k; }
  }
  // groups in atari (beginner aid)
  if (settings.atari && !st.over && !lesson && !puzzle) {
    const seen = new Uint8Array(n * n);
    for (let i = 0; i < n * n; i++) { if (!pos.b[i] || seen[i]) continue; const g = pos.group(i); for (const q of g.stones) seen[q] = 1; if (g.libs === 1) for (const q of g.stones) { const [x, y] = xyOf(q); el('circle', { cx: x, cy: y, r: 0.12, fill: '#ff5b4a' }, gM); } }
  }
  for (const k of lessonMarks) markAt(gM, k);
  if (labelList) for (const L of labelList) labelAt(gH, L);
  else if (!drawReviewFx(gH, gM) && hintList && !st.over) drawHints(hintList, gH);
  rbHoverFx(gH);
  updateGhost();
}
// marks drawn twice: a dark halo under the coloured line, so they read on every board skin (light wood, washi, dark lacquer, night)
function markAt(g, k) {
  const two = (tag, a, cls) => { el(tag, Object.assign({}, a, { class: 'halo' }), g); el(tag, Object.assign({}, a, { class: cls }), g); };
  if (k.arrow) { const [a, b] = k.arrow.map(xyOf); two('path', { d: `M${a[0]},${a[1]}L${b[0]},${b[1]}` }, 'arrow'); return; }
  const [x, y] = xyOf(k.at);
  if (k.cls === 'x') two('path', { d: `M${x - .2},${y - .2}L${x + .2},${y + .2}M${x + .2},${y - .2}L${x - .2},${y + .2}` }, 'mk-x');
  else if (k.cls === 'tri') two('path', { d: `M${x},${y - .27}L${x + .24},${y + .15}L${x - .24},${y + .15}Z` }, 'mk-tri');
  else if (k.cls === 'sq') el('rect', { x: x - .18, y: y - .18, width: .36, height: .36, class: 'mk-sq' }, g);
  else if (k.cls === 'dash') two('circle', { cx: x, cy: y, r: 0.42 }, 'mk-dash');
  else two('circle', { cx: x, cy: y, r: 0.42 }, k.cls === 'ng' ? 'mk-ng' : 'mk-ok');
}
function labelAt(g, L) {
  const [x, y] = xyOf(L.at), pos = posAt(cur);
  const on = pos.b[L.at], gg = el('g', { class: 'hint' }, g);
  if (!on) el('circle', { cx: x, cy: y, r: 0.44, class: 'hc', fill: L.fill || 'rgba(233,199,126,.85)', stroke: 'rgba(0,0,0,.35)' }, gg);
  const tx = el('text', { x, y: y + 0.02, 'font-size': L.fs || 0.36, fill: on ? (on === P1 ? '#fff' : '#111') : '#1b150a' }, gg); tx.textContent = L.text;
}
// candidate moves: the best few, coloured by how much they lose (green → yellow → red), with the score lead
function drawHints(list, g) {
  const L = list.filter(c => c.m !== PASS).slice(0, 8); if (!L.length) return;
  const best = L[0], tot = L.reduce((a, c) => a + c.n, 0) || 1;
  L.forEach((c, k) => {
    const loss = best.lead - c.lead;
    if (k > 0 && (c.n / tot < 0.03 || loss > 6)) return;
    const col = loss < 0.6 ? 'rgba(80,210,140,.88)' : loss < 2 ? 'rgba(180,220,90,.85)' : loss < 4 ? 'rgba(240,200,80,.85)' : 'rgba(255,120,90,.85)';
    const [x, y] = xyOf(c.m), gg = el('g', { class: 'hint' }, g);
    el('circle', { cx: x, cy: y, r: 0.47, fill: 'none', stroke: 'rgba(0,0,0,.8)', 'stroke-width': 0.1 }, gg);
    el('circle', { cx: x, cy: y, r: 0.45, class: 'hc', fill: col.replace(/,\.8\d\)$/, ',.96)'), stroke: k === 0 ? '#fff6d0' : 'rgba(0,0,0,.55)', 'stroke-width': k === 0 ? 0.08 : 0.04 }, gg);
    const tx = el('text', { x, y: y + 0.02, 'font-size': 0.32, fill: '#111' }, gg); tx.textContent = fmtLead(c.lead);
  });
}
// ---- input: tap / click a point (mouse: hover ghost; phones on big boards: tap twice to confirm)
let ghost = null, pending = -1;
function pointAt(e) {
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const m = svg.getScreenCTM(); if (!m) return -1;
  const p = pt.matrixTransform(m.inverse()), x = Math.round(p.x), y = Math.round(p.y), n = N();
  if (x < 0 || y < 0 || x >= n || y >= n || Math.hypot(p.x - x, p.y - y) > 0.62) return -1;
  if (view && (x < view[0] - 0.5 || x > view[2] + 0.5 || y < view[1] - 0.5 || y > view[3] + 0.5)) { /* outside the zoom: still a board point */ }
  return y * n + x;
}
let hoverPt = -1;
function updateGhost() {
  const g = $('#gGhost'); if (!g) return;
  g.innerHTML = '';
  const i = pending >= 0 ? pending : hoverPt;
  if (i < 0 || !(rbS || canHumanPlay()) || (!rbS && count && count.key === keyOf(cur))) return;
  const pos = rbS ? rbShown() : posAt(cur); if (pos.b[i] || !pos.legal(i)) return;
  const e = newStone(i, pos.turn); e.classList.add('ghost'); if (pending >= 0) e.style.opacity = '.75';
  g.appendChild(e);
}
const tapTwice = () => settings.tap === 'two' || (settings.tap === 'auto' && COARSE && N() >= 13 && !lesson && !puzzle);
svg.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; const i = pointAt(e); if (i !== hoverPt) { hoverPt = i; updateGhost(); } });
svg.addEventListener('pointerleave', () => { hoverPt = -1; updateGhost(); });
svg.addEventListener('click', e => { ctx(); onPoint(pointAt(e)); });
function onPoint(i) {
  if (rbS) { if (i >= 0) RBox.play(i); return; }
  if (count && count.key === keyOf(cur) && !count.busy) { if (i >= 0) countToggle(i); return; }
  if (!canHumanPlay()) { if (reviewing && !lesson && !puzzle && settings.mode !== 'online') rsOpen(); return; }
  if (i < 0) { pending = -1; updateGhost(); return; }
  const pos = posAt(cur);
  if (pos.b[i]) { pending = -1; updateGhost(); return; }
  if (!pos.legal(i)) { toast(i === pos.ko ? t('cant.ko') : pos.tryPlay(i, 0, true) === null && suicideAt(pos, i) ? t('cant.suicide') : t('cant.superko'), 1600); pending = -1; updateGhost(); return; }
  if (tapTwice() && pending !== i) { pending = i; updateGhost(); showTip(t('tap.again')); playTick(); return; }
  pending = -1; showTip('');
  commit(i);
}
function suicideAt(pos, i) { const p = pos.clone(); p.ko = -1; p.seen = null; return p.tryPlay(i, 0, true) === null; }
let tipT = 0;
function showTip(s) { const el = $('#confirmTip'); el.textContent = s; el.classList.toggle('show', !!s); clearTimeout(tipT); if (s) tipT = setTimeout(() => el.classList.remove('show'), 2500); }
function commit(m) {
  if (lesson) return lessonAnswer(m);
  if (puzzle) return puzzleMove(m);
  if (settings.mode === 'online' && window.olHumanMove) return olHumanMove(m);
  playMove(m);
}

// ====================================================================== players / panel
function isAIColor(p) { return settings.mode === 'watch' || (settings.mode === 'ai' && p !== humanColor); }
function levelFor(p) { if (rgame && settings.mode === 'ai') return rgame.lv; return settings.mode === 'watch' ? (p === P1 ? settings.level : settings.level2) : settings.level; }
function gameOver(i) { return statusAt(i).over; }
function canHumanPlay() {
  if (gameOver(cur)) return false;
  if (puzzle) return puzzle.state === 'play' && !puzzle.busy && toMoveAt(cur) === puzzle.me;
  if (lesson) return !lesson.answered && !lesson.study;
  if (reviewing) return false;
  if (isCounting(cur)) return false;
  if (settings.mode === 'online') return !!(window.olCanMove && olCanMove());
  return !isAIColor(toMoveAt(cur)) && !thinking;
}
function playerName(p) {
  if (puzzle) return p === puzzle.me ? t('you') : t('defender');
  if (lesson) return '';
  if (settings.mode === 'online' && window.olPlayerName) return olPlayerName(p);
  if (settings.mode === 'pvp') return '';
  if (settings.mode === 'watch') return `AI ${LV(levelFor(p))}`;
  if (rgame) return p === humanColor ? t('you') + ' · R' + rgame.my : `AI ${LV(rgame.lv)} · R${rgame.or}`;
  return p === humanColor ? t('you') : `AI ${LV(settings.level)}`;
}
let thinking = 0;
function renderInfo() {
  const pos = posAt(cur), st = statusAt(cur), tm = pos.turn, cnting = isCounting(cur);
  for (const p of [P1, P2]) {
    $('#count' + p).textContent = pos.caps[p];
    $('#hand' + p).textContent = t('caps') + (p === P2 && game.komi ? ' · ' + t('komiShort', { k: game.komi }) : '');
    const nm = playerName(p); $('#name' + p).textContent = nm ? nm + ' · ' + pname(p) : pname(p);
    const e = $('#pl' + p);
    e.classList.toggle('active', !st.over && !cnting && tm === p);
    e.classList.toggle('won', st.winner === p);
    e.classList.toggle('thinking', thinking === p);
    $('#status' + p).textContent = st.winner === p ? t('st.win') : thinking === p ? t('thinking') : '';
  }
  $('#evalCard').classList.toggle('hidden', (!settings.eval && !rtLive()) || !!(window.olLive && olLive()));
  document.body.classList.toggle('rated-live', rtLive());
  for (const p of [P1, P2]) { const c = $('#clk' + p); if (rgame && settings.mode === 'ai' && !lesson && !puzzle) { const ms = rtClockLeft(p - 1); c.textContent = rtClockText(p - 1, ms); c.classList.toggle('low', rtLow(p - 1, ms) && rtLive()); } else if (settings.mode !== 'online') c.textContent = ''; }
  let ev = st.over ? { final: true, winner: st.winner, diff: st.diff } : evals[cur];
  if (!ev && cur > 0 && evals[cur - 1]) ev = evals[cur - 1];
  $('#evalText').textContent = evalText(ev);
  $('#evalFill').style.width = (ev && !ev.final ? Math.round(ev.wr * 100) : ev && ev.final ? (ev.winner === P1 ? 100 : ev.winner === P2 ? 0 : 50) : 50) + '%';
  renderGraph(); renderKifu(); renderPlaybar(); renderCount();
  $('#btnUndo').disabled = settings.mode === 'watch' || !canUndo();
  wpRender();
  $('#btnResign').disabled = !canResign();
  $('#btnHint').disabled = rtLive() || settings.mode === 'online';
  $('#btnHint').classList.toggle('on', settings.hint);
  $('#btnTerr').classList.toggle('on', settings.terr);
  $('#btnSound').classList.toggle('on', settings.sound);
  renderReview();
  $('#infoLine').textContent = `${game.n}×${game.n} · ${t('rule.' + game.rule)} · ${t('komiShort', { k: game.komi })}${game.ha ? ' · ' + t('ha', { n: game.ha }) : ''}  ·  ${settings.mode === 'ai' ? 'AI ' + LV(levelFor(0)) + (rgame ? ' · ' + t('ng.rated') : '') : settings.mode === 'watch' ? `${LV(settings.level)} vs ${LV(settings.level2)}` : t('ng.pvp')}  ·  ← → ${t('info.browse')}`;
  renderBrand();
  if (window.olAfterInfo) olAfterInfo();
  hbInfo(pos, st);
}
function evalText(ev) {
  if (!ev) return '—';
  if (ev.final) return ev.winner ? t('ev.won', { c: pname(ev.winner) }) + (ev.diff ? ' · ' + pts(ev.diff) : '') : t('res.draw');
  const side = ev.lead >= 0 ? P1 : P2;
  return t('ev.lead', { c: pname(side), p: (Math.round(Math.abs(ev.lead) * 10) / 10).toFixed(1) }) + ` · ${pname(P1)} ${Math.round(ev.wr * 100)}%`;
}
const escHb = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function hbInfo(pos, st) {
  if (!HB || !HB.on) return;
  const tm = pos.turn, cnting = isCounting(cur);
  let h = `<span class="hb-chip"><i class="pdisc p${st.over ? (st.winner || tm) : tm}"></i><b>${escHb(st.over ? (st.winner ? t('hb.won', { c: pname(st.winner) }) : t('res.draw')) : cnting ? t('cnt.title') : t('hb.turn', { c: pname(tm) }))}</b></span>`;
  for (const p of [P1, P2]) h += `<span class="hb-chip cnt"><i class="pdisc p${p}"></i><small>${escHb(t('caps'))}</small><b>${pos.caps[p]}</b></span>`;
  const evOn = settings.eval && !lesson && !puzzle && !rtLive() && !(window.olLive && olLive());
  if (evOn && $('#evalText').textContent && $('#evalText').textContent !== '—') h += `<span class="hb-chip opt">${escHb(t('eval'))} <b>${escHb($('#evalText').textContent)}</b></span>`;
  if (puzzle) h += `<span class="hb-chip">${escHb(PZBook.t('movesLeft', { n: Math.max(0, puzzle.n - puzzle.used) }))}</span>`;
  else h += `<span class="hb-chip opt">${escHb(game.n + '×' + game.n + ' · ' + t('info.moves', { n: cur }))}</span>`;
  HB.setInfo(h);
}
function renderPlaybar() {
  const pos = posAt(cur), st = statusAt(cur), b = $('#btnPass');
  let s = '';
  if (st.over) s = `<span class="pdisc p${st.winner || pos.turn}"></span><b>${escHb(resultLine(st))}</b>`;
  else if (isCounting(cur)) s = `<b>${escHb(t('cnt.title'))}</b>`;
  else if (thinking) s = `<span class="pdisc p${thinking}"></span>${escHb(t('thinking'))}`;
  else s = `<span class="pdisc p${pos.turn}"></span><b>${escHb(t('hb.turn', { c: pname(pos.turn) }))}</b>` + (cur > 0 && moves[cur - 1] === PASS ? ` · ${escHb(t('passed', { c: pname(3 - pos.turn) }))}` : '') + ` <span style="color:var(--dim)">· ${escHb(t('info.moves', { n: cur }))}</span>`;
  $('#pbTurn').innerHTML = s;
  b.disabled = !canHumanPlay();
}
function resultLine(st) {
  if (!st.over) return '';
  if (st.draw) return t('res.draw');
  const c = pname(st.winner);
  if (st.why === 'score') return t('res.byPts', { c, p: pts(st.diff) });
  return t('res.byWhy', { c, w: t('why.' + st.why) });
}
function evalAt(i) { const e = evals[i]; return e ? e.wr : null; }
function renderGraph() {
  const g = $('#graph'), Wd = 300, H = 74, n = Math.max(moves.length + 1, 40);
  const pts_ = []; let last = 0.5;
  for (let i = 0; i <= moves.length; i++) { let v = evalAt(i); if (v == null) v = last; last = v; pts_.push([i / (n - 1) * Wd, H - v * (H - 6) - 3]); }
  let path = '', area = '';
  if (pts_.length) { path = 'M' + pts_.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L'); area = path + `L${pts_[pts_.length - 1][0].toFixed(1)},${H / 2}L0,${H / 2}Z`; }
  const cx = cur / (n - 1) * Wd;
  g.innerHTML = `<defs><clipPath id="ctop"><rect x="0" y="0" width="${Wd}" height="${H / 2}"/></clipPath><clipPath id="cbot"><rect x="0" y="${H / 2}" width="${Wd}" height="${H / 2}"/></clipPath></defs>
    <path d="${area}" fill="rgba(20,20,24,.75)" clip-path="url(#ctop)"/>
    <path d="${area}" fill="rgba(240,236,226,.5)" clip-path="url(#cbot)"/>
    <line class="zero" vector-effect="non-scaling-stroke" x1="0" x2="${Wd}" y1="${H / 2}" y2="${H / 2}"/>
    <path d="${path}" fill="none" stroke="rgba(233,199,126,.9)" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
    <line class="cur" x1="${cx}" x2="${cx}" y1="0" y2="${H}" vector-effect="non-scaling-stroke"/>`;
}
let kifuHtml = '', kifuRaf = 0;
function renderKifu() {
  const k = $('#kifu');
  if (!moves.length) { kifuHtml = ''; k.innerHTML = `<div class="empty">${t('kifu.empty')}</div>`; return; }
  const s0 = (startSpec && startSpec.turn) || P1;
  let html = '';
  for (let i = 1; i <= moves.length; i++) {
    const p = (i - 1) % 2 === 0 ? s0 : 3 - s0;
    const j = rvOpen && rv && !rv.running ? rvJudge(i - 1) : null, qc = j && j.q ? (j.q === 'bad' ? ' q-bad' : ' q-dub') : '';
    html += `<button data-i="${i}" class="${qc}" title="${i}${j && j.q ? ' ' + t('q.' + j.q) : ''}"><em>${i}</em><i class="p${p}"></i>${mvAt(i - 1)}</button>`;
  }
  // only rebuilt when the record (or its marks) changed; a step just moves the "cur" class
  if (html !== kifuHtml || k.children.length !== moves.length) { kifuHtml = html; k.innerHTML = html; }
  else { const o = k.querySelector('.cur'); if (o) o.classList.remove('cur'); }
  const c = k.children[cur - 1] || null; if (c) c.classList.add('cur');
  // keep the current move in view — measured in the next frame, so a step forces no extra layout of the page
  if (c && !kifuRaf) kifuRaf = requestAnimationFrame(() => { kifuRaf = 0; const c = k.querySelector('.cur'); if (!c) return; const top = c.offsetTop - k.offsetTop; if (top < k.scrollTop || top > k.scrollTop + k.clientHeight - 24) k.scrollTop = top - k.clientHeight / 2; });
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
function toast(msg, ms = 1500, big) { const e = $('#toast'); e.textContent = msg; e.classList.toggle('big', !!big); e.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => e.classList.remove('show'), ms); }
function update(anim) { pending = -1; renderBoard(anim); renderInfo(); if (window.stSync) stSync(); document.body.classList.toggle('ai-live', aiGameLive()); document.body.classList.toggle('counting', !!(count && count.key === keyOf(cur)) && !lesson && !puzzle); }

// ====================================================================== flow
function setGame(g) { game = Object.assign({ n: 19, komi: 6.5, rule: 'jp', ha: 0 }, g); view = null; drawnKey = ''; }
function handicapSpec(n, k) { if (k < 2) return null; return { n, stones: R.handicapPoints(n, k).map(i => [i, P1]), turn: P2 }; }
// boards under 9x9 are scored by area (Chinese): their komi is the perfect-play margin, which only works when stones count
const effRule = (n, rule) => n < 9 ? 'cn' : rule;
function newGame(rated) {
  busyToken++; cancelWorker(); thinking = 0; wpPaused = false;
  rgame = null; rtHold = false; settings.rsNoRec = false;
  if (rated) rgame = Object.assign(rated, { ct: [RT_CLOCK.base, RT_CLOCK.base], byo: [0, 0], t: Date.now() });
  const n = rated ? RT_SIZE : settings.size, rule = effRule(n, settings.rule), ha = rated ? 0 : settings.ha;
  const komi = ha >= 2 ? 0.5 : settings.komi === 'auto' || rated ? R.defaultKomi(n, rule) : +settings.komi;
  setGame({ n, komi, rule, ha });
  startSpec = handicapSpec(n, ha);
  if (settings.mode === 'ai') humanColor = rated ? (Math.random() < 0.5 ? P1 : P2) : settings.color === 0 ? (Math.random() < 0.5 ? P1 : P2) : settings.color;
  moves = []; cur = 0; reviewing = false; evals = []; hintList = null; gameOverShown = false; manualEnd = null; aiVals = []; count = null; terrOwn = null;
  hideOverlay('#resultOverlay');
  update(false); save();
  afterPosition();
}
function playMove(m) {
  if (rtHold) { rtHold = false; if (rgame) rgame.t = Date.now(); }
  if (rtLive()) rtCharge();
  moves = moves.slice(0, cur); moves.push(m); cur = moves.length; reviewing = false;
  evals.length = moves.length; hintList = null; count = null;
  if (m === PASS) toast(t('passed', { c: pname(toMoveAt(cur - 1)) }), 1200);
  update(true); save();
  afterPosition();
}
function afterPosition() {
  const tok = ++busyToken;
  analyzeCurrent(tok);
  if (isCounting(cur) && !lesson && !puzzle && settings.mode !== 'online') { startCounting(tok); return; }
  maybeAI(tok);
}
let aiErrs = 0;
async function maybeAI(tok) {
  if (lesson || puzzle || reviewing || wpPaused || gameOver(cur) || isCounting(cur)) return;
  const p = toMoveAt(cur);
  if (!isAIColor(p)) return;
  thinking = p; renderInfo(); svg.classList.remove('can');
  const t0 = Date.now(), lv = levelFor(p);
  const job = () => request({ type: 'think', preempt: true, ...jobBase(startSpec, moves.slice(0, cur)), level: lv, time: rtLive() ? rtAiTime() : undefined });
  let res = await job();
  if (res && res.error && tok === busyToken) res = await job();   // the engine rebuilds itself after a crash: try once more
  if (!res || tok !== busyToken) { if (tok === busyToken) { thinking = 0; renderInfo(); } return; }
  const wait = (settings.mode === 'watch' ? 650 : 380) - (Date.now() - t0);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  if (tok !== busyToken) return;
  thinking = 0;
  if (typeof res.wr === 'number') aiVals[cur] = res.wr;
  if (settings.mode === 'ai' && aiResigns(p, res)) return;
  if (res.move === undefined) { renderInfo(); if ((aiErrs = (aiErrs || 0) + 1) <= 3) setTimeout(() => { if (tok === busyToken) maybeAI(tok); }, 1200); else toast(t('ai.err')); return; }
  aiErrs = 0;
  playMove(res.move);
}
// ---------------------------------------------------------------- the AI resigns when hopeless (dan levels sooner, kyu levels only when far behind)
function aiResigns(p, res) {
  const lv = levelFor(p), n = N();
  if (lv < 4 || cur < n * n * 0.35) return false;
  const wr = res.wr, lead = res.lead;   // AI's view
  const k = cur;
  const lost = (wr < 0.03 && lead < -(rankVal(lv) >= 1 ? 8 : 20)) || lead < -(n * n * 0.25);
  aiVals[k] = wr;
  if (!lost) return false;
  const prev = aiVals.slice(0, k).filter(x => typeof x === 'number').slice(-2);
  if (prev.length < 2 || prev.some(x => x > 0.08)) return false;
  endManually({ over: true, winner: 3 - p, why: 'resign', aiResigned: true });
  return true;
}
function aiGameLive() { return settings.mode === 'ai' && !lesson && !puzzle && !gameOver(moves.length) && cur === moves.length; }
function endManually(st) {
  busyToken++; cancelWorker(); thinking = 0;
  st.n = moves.length;
  if (rgame) rgame.over = st; else manualEnd = st;
  count = null;
  save(); update(false); onGameEnd(st);
}
// 投了 (common spec, shared/resign.js)
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
  cur = moves.length; reviewing = false; hintList = null;
  const loser = settings.mode === 'ai' ? humanColor : toMoveAt(moves.length);
  endManually({ over: true, winner: 3 - loser, why: 'resign' });
}
$('#btnResign').onclick = () => { if (canResign()) Resign.confirm({ lang: LANG }).then(ok => { if (ok) resignGame(); }); };
window.aiGameLive = aiGameLive;
$('#btnPass').onclick = () => {
  if (!canHumanPlay()) return;
  ctx();
  if (cur >= 1 && moves[cur - 1] !== PASS && !lesson && !puzzle && moves.length < N() * N() * 0.2 && !confirm(t('pass.early'))) return;
  commit(PASS);
};
// ---------------------------------------------------------------- evaluation / hints / territory
async function analyzeCurrent(tok) {
  const idx = cur, key = keyOf(idx);
  if (gameOver(idx) || lesson || puzzle) { hintList = null; return; }
  if (rtLive() || (window.olLive && olLive())) { hintList = null; return; }
  const mover = toMoveAt(idx), sign = mover === P1 ? 1 : -1;
  const toEval = r => ({ wr: sign > 0 ? r.wr : 1 - r.wr, lead: r.lead * sign });
  // territory estimate (ownership) for the overlay
  if (settings.terr) {
    request({ type: 'territory', ...jobBase(startSpec, moves.slice(0, idx)), net: 'light' }).then(r => { if (!r || keyOf(idx) !== key) return; terrOwn = { key, own: r.own }; if (cur === idx) renderFx(); });
  }
  if (!settings.eval && !settings.hint) return;
  if (settings.hint) {
    const apply = r => { if (!r || keyOf(idx) !== key) return; evals[idx] = Object.assign(toEval(r), { src: 'search' }); if (cur === idx) { hintList = r.list; renderFx(); renderInfo(); } };
    if (anaCache.has(key)) { apply(anaCache.get(key)); return; }
    const r = await request({ type: 'analyze', ...jobBase(startSpec, moves.slice(0, idx)), net: strongNet() ? 'strong' : 'light', visits: COARSE ? 40 : 90, time: COARSE ? 1800 : 2500 }, apply);
    if (!r) return;
    anaCache.set(key, { lead: r.lead, wr: r.wr, list: r.list }); apply(r); save();
    return;
  }
  if (evals[idx]) return;   // value already known (whole-game review / earlier evaluation): no engine job while browsing
  if (rawCache.has(key)) { evals[idx] = rawCache.get(key); if (cur === idx) renderInfo(); return; }
  const r = await request({ type: 'policy', ...jobBase(startSpec, moves.slice(0, idx)), net: 'light' });
  if (!r) return;
  const ev = Object.assign(toEval(r), { src: 'raw' });
  rawCache.set(key, ev);
  if (keyOf(idx) !== key) return;
  if (!evals[idx] || evals[idx].src === 'raw') evals[idx] = ev;
  if (cur === idx) renderInfo();
}
// ---------------------------------------------------------------- end of the game: counting (dead stones from the engine, editable)
async function startCounting(tok) {
  const key = keyOf(cur);
  count = { key, dead: new Set(), own: null, busy: true };
  update(false);
  const r = await request({ type: 'territory', preempt: true, ...jobBase(startSpec, moves), net: strongNet() ? 'strong' : 'light' });
  if (!count || count.key !== key) return;
  count.busy = false;
  if (r) { count.dead = new Set(r.dead); count.own = r.own; }
  update(false);
  // AI vs AI: accept at once
  if (settings.mode === 'watch') setTimeout(() => { if (count && count.key === key) countAccept(); }, 900);
}
function countToggle(i) {
  const pos = posAt(cur); if (!pos.b[i] || rtLive()) return;
  if (settings.mode === 'ai' && rgame) return;     // rated: the engine's judgement stands (resume play if you disagree)
  const g = pos.group(i), dead = count.dead.has(i);
  // toggle the whole group (and same-coloured groups sharing the same territory region) — a group is enough
  for (const q of g.stones) { if (dead) count.dead.delete(q); else count.dead.add(q); }
  playTick(); update(false);
}
function renderCount() {
  const on = !!(count && count.key === keyOf(cur)) && !lesson && !puzzle;
  document.body.classList.toggle('counting', on);
  if (!on) return;
  if (count.busy) { $('#cntText').textContent = t('cnt.busy'); $('#cntRes').innerHTML = ''; return; }
  const sc = R.score(posAt(cur), [...count.dead], game.rule, game.komi);
  $('#cntText').textContent = t(rgame ? 'cnt.descRated' : 'cnt.desc');
  const w = sc.diff > 0 ? P1 : sc.diff < 0 ? P2 : 0;
  const row = (p, v, d) => `<span class="pdisc p${p}" style="width:14px;height:14px"></span><span>${escHb(pname(p))}: <b>${v}</b> <small style="color:var(--dim)">${escHb(d)}</small></span>`;
  const jp = game.rule === 'jp';
  $('#cntRes').innerHTML = `<div class="cnt-res">${row(P1, sc.b, jp ? t('cnt.jp', { t: sc.terrB, c: sc.capB }) : t('cnt.cn', { s: sc.stB, t: sc.terrB }))}${row(P2, sc.w, (jp ? t('cnt.jp', { t: sc.terrW, c: sc.capW }) : t('cnt.cn', { s: sc.stW, t: sc.terrW })) + ' + ' + t('komiShort', { k: game.komi }))}</div><div class="cnt-big">${w ? escHb(t('res.byPts', { c: pname(w), p: pts(sc.diff) })) : escHb(t('res.draw'))}</div>`;
}
function countAccept() {
  if (!count || count.busy) return;
  const sc = R.score(posAt(cur), [...count.dead], game.rule, game.komi);
  const st = sc.diff === 0 ? { over: true, winner: 0, draw: true, why: 'score', diff: 0 } : { over: true, winner: sc.diff > 0 ? P1 : P2, why: 'score', diff: Math.abs(sc.diff), dead: [...count.dead] };
  endManually(st);
}
function countResume() {
  if (!count) return;
  // play on: the last pass is taken back, the player who passed first moves on (simple and fair for both)
  count = null;
  moves = moves.slice(0, moves.length - 2); cur = moves.length;
  update(false); save(); afterPosition();
}
$('#cntOk').onclick = () => countAccept();
$('#cntResume').onclick = () => countResume();

function onGameEnd(st) {
  if (moves.length !== cur || gameOverShown) return;
  if (lesson || puzzle) return;   // (a lesson / puzzle opened meanwhile: the game result is only shown right when the game ends)
  if (settings.mode === 'online') return;
  gameOverShown = true;
  recordGame(st);
  const youWin = settings.mode === 'ai' && st.winner === humanColor;
  const aiWin = settings.mode === 'ai' && st.winner && st.winner !== humanColor;
  playChime(!aiWin);
  if (youWin || (settings.mode === 'pvp' && st.winner)) confetti();
  $('#resultDisc').innerHTML = st.winner ? `<div class="pdisc p${st.winner}"></div>` : '';
  $('#resultTitle').textContent = st.draw ? t('res.draw') : youWin ? t('res.youWin') : aiWin ? t('res.aiWin') : t('res.pWin', { c: pname(st.winner) });
  let sub = (st.aiResigned ? t('ai.resigned') : resultLine(st)) + '<br>' + t('res.sub', { n: moves.length });
  if (rgame) {
    const rx = rtSettle(st);
    if (rx) sub += `<br>${rx.pl ? Placement.resHtml(rx.pl) : `<span class="rt-res">R ${rx.old} → <b>${rx.now}</b> (${rtD(rx.d)})</span>`} · ${rtRank(rx.now)}<br><small style="color:var(--muted)">${t('rt.opp', { lv: LV(rgame.lv), r: rgame.or })}</small>`;
  } else if (settings.mode === 'ai') sub += '<br>' + t('res.vs', { name: LV(settings.level) });
  $('#resultSub').innerHTML = sub;
  const mv = moves;
  setTimeout(() => { if (moves === mv && !lesson && !puzzle) showOverlay('#resultOverlay'); }, 700);   // not when a lesson / puzzle / other game was opened meanwhile
}
// 勝敗記録 (shared/record.js): games against the AI (free / rated); online games are recorded in online-ui.js finishOnline()
function recordGame(st) {
  if (!window.GameRecord || settings.mode !== 'ai' || settings.rsNoRec || !st || !st.over || st.rec || !moves.length) return;
  st.rec = 1;
  const why = st.why === 'score' ? resultLine(st) : st.why ? t('why.' + st.why) : '';
  const lv = rgame ? rgame.lv : settings.level;
  GameRecord.add({ mode: rgame ? 'rated' : 'ai', res: st.draw || !st.winner ? 'd' : st.winner === humanColor ? 'w' : 'l', side: humanColor - 1, opp: 'AI ' + LV(lv) + ' · ' + game.n + '×' + game.n, key: (rgame ? 'rt:' : 'ai:') + lv + ':' + game.n, n: moves.length, why });
}
function canUndo() {
  if (lesson || puzzle || rgame || settings.mode === 'online') return false;
  if (settings.mode === 'pvp') return cur > 0;
  if (settings.mode === 'ai') { for (let i = cur - 1; i >= 0; i--) if (toMoveAt(i) === humanColor) return true; return false; }
  return false;
}
// AI同士 (watch): the 待った button is 停止 / 再開 (shared/watchpause.js); Ctrl+Z toggles it too
var wpPaused = false;
function wpActive() { return settings.mode === 'watch' && !lesson && !puzzle && !rbS; }
function wpRender() {
  if (settings.mode !== 'watch') wpPaused = false;
  const over = gameOver(moves.length), on = wpActive() && (!over || cur < moves.length), b = $('#btnUndo');   // a finished game can be continued from an earlier position
  if (window.WatchPause) WatchPause.set(b, on ? (wpPaused || over ? 'resume' : 'pause') : null, LANG);
  if (on) b.disabled = false;
}
function wpToggle() {
  const over = gameOver(moves.length);
  if (!wpActive() || (over && cur >= moves.length)) return;
  if (!wpPaused && !over) { wpPaused = true; busyToken++; cancelWorker(); thinking = 0; renderInfo(); return; }
  if (cur < moves.length && window.WatchPause) { if (typeof stopPlay === 'function') stopPlay(); WatchPause.ask({ lang: LANG, n: moves.length - cur, latest: over ? null : wpLatest, here: wpHere }); return; }   // an earlier position is shown: ask where to resume from
  wpLatest();
}
function wpLatest() { wpPaused = false; cur = moves.length; reviewing = false; hintList = null; update(false); afterPosition(); }   // resume from the latest position
function wpHere() {   // resume from the shown position: the later moves, their evals and any result are dropped (the kifu's この局面から再開 path)
  if (!wpActive() || cur >= moves.length) { wpLatest(); return; }
  wpPaused = false; reviewing = true; count = null; hideOverlay('#resultOverlay'); resumeHere();
}
function undo() {
  if (rbS) { RBox.back(); return; }
  if (wpActive()) { wpToggle(); return; }
  if (!canUndo()) return;
  busyToken++; cancelWorker(); thinking = 0;
  let i = cur - 1;
  if (settings.mode === 'ai') { while (i > 0 && toMoveAt(i) !== humanColor) i--; }
  moves = moves.slice(0, i); cur = i; reviewing = false; evals.length = i + 1; hintList = null; gameOverShown = false; manualEnd = null; count = null;
  hideOverlay('#resultOverlay');
  update(false); save(); afterPosition();
}
function viewAt(i) {
  if (rbS) RBox.stop();
  if (lesson || puzzle) return;
  i = Math.max(0, Math.min(moves.length, i));
  if (i === cur) return;
  busyToken++; thinking = 0;
  // drop the engine jobs of the position left (hint / territory searches would otherwise queue up while stepping);
  // not while the whole-game review is running in this worker (phones)
  if (!(rv && rv.running && !W2)) cancelWorker();
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
  const cols = ['#e9c77e', '#fff6dc', '#f2efe7', '#141414', '#e0553d', '#7fd6a4'];
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
  else { const k = keyOf(cur); if (anaCache.has(k)) { hintList = anaCache.get(k).list; renderFx(); } else analyzeCurrent(busyToken); renderInfo(); }
};
$('#btnTerr').onclick = () => {
  if (rtLive() || (window.olLive && olLive())) { toast(t('rt.noEval')); return; }
  settings.terr = !settings.terr; save();
  if (settings.terr) analyzeCurrent(busyToken); else { terrOwn = null; renderFx(); }
  renderInfo();
};
$('#btnSound').onclick = () => { settings.sound = !settings.sound; save(); renderInfo(); if (settings.sound) playTick(); };
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
$('#btnReview').onclick = () => hideOverlay('#resultOverlay');
$('#btnAgain').onclick = () => { hideOverlay('#resultOverlay'); if (rgame) rtStart(); else newGame(); };
function sgfText() {
  const st = statusAt(moves.length);
  const res = st.over ? (st.draw ? '0' : (st.winner === P1 ? 'B+' : 'W+') + (st.why === 'score' ? st.diff : st.why === 'time' ? 'T' : 'R')) : '';
  const pb = settings.mode === 'ai' ? (humanColor === P1 ? t('you') : 'AI ' + LV(levelFor(P1))) : '', pw = settings.mode === 'ai' ? (humanColor === P2 ? t('you') : 'AI ' + LV(levelFor(P2))) : '';
  return R.sgfWrite({ n: game.n, komi: game.komi, rule: game.rule, ha: game.ha, start: startSpec, moves, result: res, pb, pw, date: new Date().toISOString().slice(0, 10) });
}
$('#btnCopy').onclick = async () => {
  if (!moves.length) { toast(t('nokifu')); return; }
  const txt = sgfText();
  try { await navigator.clipboard.writeText(txt); toast(t('copied')); } catch (e) { toast(t('copyFail'), 2000); }
  // also offer the file
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/x-go-sgf' })); a.download = 'go-' + new Date().toISOString().slice(0, 10) + '.sgf'; if (!COARSE) a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); } catch (e) {}
};
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && ![...document.querySelectorAll('.overlay.show')].some(o => o.id !== 'resultOverlay')) { e.preventDefault(); undo(); return; }
  if (document.querySelector('.overlay.show')) { if (e.key === 'Escape') document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); return; }
  if (e.key === 'Escape') { pending = -1; updateGhost(); return; }
  if (e.key === 'Home') viewAt(0);
  else if (e.key === 'End') viewAt(moves.length);
  else if ((e.key === 'p' || e.key === 'P') && canHumanPlay()) $('#btnPass').click();
});

// ---------------------------------------------------------------- mini boards (rules / lists / design pickers)
// spec: { n, stones (string) | ab/aw, turn }, o: { cls, marks: {i: ok|ng|x|tri|sq|dash}, last, nums: {i: k}, crop: [x0,y0,x1,y1], click, bd, st, labels: {i: text} }
var CROP_UID = 0;
function specFrom(o) {
  if (!o) return { n: 9 };
  if (o.stones || !o.ab && !o.aw) return o;
  const n = o.n || 19, a = Array(n * n).fill('.');
  for (const s of o.ab || []) { const i = R.parseCoord(s, n); if (i != null && i >= 0) a[i] = 'b'; }
  for (const s of o.aw || []) { const i = R.parseCoord(s, n); if (i != null && i >= 0) a[i] = 'w'; }
  return { n, stones: a.join(''), turn: o.turn || P1 };
}
function miniSVG(spec, o) {
  o = o || {}; spec = specFrom(spec);
  const n = spec.n || 9, C = GoTheme.miniColors(o.bd || settings.bd, o.st || settings.st), u = 10, pad = 7;
  const W = (n - 1) * u + pad * 2, X = i => pad + (i % n) * u, Y = i => pad + Math.floor(i / n) * u;
  const pos = R.Pos.from(spec);
  const cr = Array.isArray(o.crop) ? o.crop : null;
  let s = `<rect x="0" y="0" width="${W}" height="${W}" rx="${cr ? 0 : 3}" fill="${C.board}"/>`;
  let d = ''; for (let k = 0; k < n; k++) d += `M${pad} ${pad + k * u}H${pad + (n - 1) * u}M${pad + k * u} ${pad}V${pad + (n - 1) * u}`;
  s += `<path d="${d}" stroke="${C.line}" stroke-width="${n > 13 ? .5 : .65}" fill="none" opacity=".85"/>`;
  for (const i of R.starPoints(n)) s += `<circle cx="${X(i)}" cy="${Y(i)}" r="1.1" fill="${C.line}"/>`;
  for (let i = 0; i < n * n; i++) {
    const c = pos.b[i]; if (!c) continue;
    const id = c === P1 ? 'b' : 'w';
    s += `<circle cx="${X(i)}" cy="${Y(i)}" r="${u * 0.47}" fill="${c === P1 ? C.b : C.w}" stroke="${c === P1 ? '#000' : 'rgba(0,0,0,.45)'}" stroke-width=".5"/>`;
    if (c === P1) s += `<circle cx="${X(i) - u * .14}" cy="${Y(i) - u * .16}" r="${u * .14}" fill="rgba(255,255,255,.18)"/>`;
    void id;
  }
  if (o.last != null && o.last >= 0 && pos.b[o.last]) s += `<circle cx="${X(o.last)}" cy="${Y(o.last)}" r="${u * .22}" fill="none" stroke="${pos.b[o.last] === P1 ? '#fff' : '#111'}" stroke-width="1"/>`;
  for (const k in o.nums || {}) { const i = +k; s += `<text x="${X(i)}" y="${Y(i) + 2.4}" font-size="${o.nums[k] >= 10 ? 5.2 : 6.4}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="700" fill="${pos.b[i] === P1 ? '#fff' : '#111'}">${o.nums[k]}</text>`; }
  for (const k in o.marks || {}) {
    const v = o.marks[k], x = X(+k), y = Y(+k);
    if (v === 'x') s += `<path d="M${x - 2.6},${y - 2.6}L${x + 2.6},${y + 2.6}M${x + 2.6},${y - 2.6}L${x - 2.6},${y + 2.6}" stroke="#ff5b4a" stroke-width="1.4" stroke-linecap="round"/>`;
    else if (v === 'tri') s += `<path d="M${x},${y - 3.2}L${x + 2.9},${y + 1.8}L${x - 2.9},${y + 1.8}Z" fill="none" stroke="#e9c77e" stroke-width="1.1"/>`;
    else if (v === 'sq') s += `<rect x="${x - 2}" y="${y - 2}" width="4" height="4" fill="rgba(233,199,126,.75)"/>`;
    else s += `<circle cx="${x}" cy="${y}" r="${u * .44}" fill="none" stroke="${v === 'ng' ? '#ff5b4a' : v === 'dash' ? 'rgba(255,255,255,.9)' : '#3fd28a'}" stroke-width="1.3" ${v === 'dash' ? 'stroke-dasharray="2 1.6"' : ''}/>`;
  }
  for (const k in o.labels || {}) { const i = +k; s += `<circle cx="${X(i)}" cy="${Y(i)}" r="${u * .42}" fill="rgba(233,199,126,.9)"/><text x="${X(i)}" y="${Y(i) + 2.3}" font-size="6" text-anchor="middle" font-weight="700" fill="#1b150a">${o.labels[k]}</text>`; }
  for (const a of o.arrows || []) { const [p, q] = a; s += `<path d="M${X(p)},${Y(p)}L${X(q)},${Y(q)}" stroke="#ffe9a8" stroke-width="1.3" stroke-linecap="round"/>`; }
  if (o.click) for (let i = 0; i < n * n; i++) s += `<rect data-p="${i}" x="${X(i) - u / 2}" y="${Y(i) - u / 2}" width="${u}" height="${u}" fill="transparent"/>`;
  if (!cr) return `<svg class="${o.cls || 'mini'}" viewBox="0 0 ${W} ${W}">${s}</svg>`;
  // cropped (corner / side): the part is enlarged in a square box; cut sides fade out so the board visibly goes on
  let [x0, y0, x1, y1] = cr; const sz = Math.max(x1 - x0, y1 - y0);
  const fit = (a, b) => { while (b - a < sz) { if (b < n - 1) b++; else a--; } return [a, b]; };
  [x0, x1] = fit(x0, x1); [y0, y1] = fit(y0, y1);
  const eL = x0 <= 0, eT = y0 <= 0, eR = x1 >= n - 1, eB = y1 >= n - 1, FADE = 0.7 * u;
  const vx0 = eL ? 0 : pad + x0 * u - FADE, vx1 = eR ? W : pad + x1 * u + FADE, vy0 = eT ? 0 : pad + y0 * u - FADE, vy1 = eB ? W : pad + y1 * u + FADE;
  const id = 'gc' + (++CROP_UID), w = vx1 - vx0, h = vy1 - vy0, nn = v => +v.toFixed(2), f = FADE / w * .9, fv = FADE / h * .9;
  const stops = (a, b, ff) => `<stop offset="0" stop-color="#fff" stop-opacity="${a ? 1 : 0}"/><stop offset="${nn(a ? 0 : ff)}" stop-color="#fff"/><stop offset="${nn(b ? 1 : 1 - ff)}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="${b ? 1 : 0}"/>`;
  return `<svg class="${o.cls || 'mini'} crop" viewBox="${nn(vx0)} ${nn(vy0)} ${nn(w)} ${nn(h)}"><defs><linearGradient id="${id}h" gradientUnits="userSpaceOnUse" x1="${nn(vx0)}" y1="0" x2="${nn(vx1)}" y2="0">${stops(eL, eR, f)}</linearGradient><linearGradient id="${id}v" gradientUnits="userSpaceOnUse" x1="0" y1="${nn(vy0)}" x2="0" y2="${nn(vy1)}">${stops(eT, eB, fv)}</linearGradient>` +
    `<mask id="${id}H"><rect x="${nn(vx0)}" y="${nn(vy0)}" width="${nn(w)}" height="${nn(h)}" fill="url(#${id}h)"/></mask><mask id="${id}V"><rect x="${nn(vx0)}" y="${nn(vy0)}" width="${nn(w)}" height="${nn(h)}" fill="url(#${id}v)"/></mask></defs><g mask="url(#${id}V)"><g mask="url(#${id}H)">${s}</g></g></svg>`;
}
// auto crop for list thumbnails / zoomed boards: the stones (+ marks) and 1–2 points around, at least 7x7, snapped to the edges
function cropOf(spec, extra, minSz) {
  spec = specFrom(spec); const n = spec.n || 9;
  if (n <= 9) return null;
  const pos = R.Pos.from(spec), S = [];
  for (let i = 0; i < n * n; i++) if (pos.b[i]) S.push(i);
  for (const i of extra || []) if (i >= 0) S.push(i);
  if (!S.length) return null;
  const xs = S.map(i => i % n), ys = S.map(i => Math.floor(i / n));
  let x0 = Math.max(0, Math.min(...xs) - 1), x1 = Math.min(n - 1, Math.max(...xs) + 1), y0 = Math.max(0, Math.min(...ys) - 1), y1 = Math.min(n - 1, Math.max(...ys) + 1);
  const ms = minSz || 7;
  const grow = (a, b) => { while (b - a + 1 < ms) { if (b < n - 1 && (a <= 0 || n - 1 - b <= a)) b++; else a--; } return [a, b]; };
  [x0, x1] = grow(x0, x1); [y0, y1] = grow(y0, y1);
  if (x0 <= 2) x0 = 0; if (y0 <= 2) y0 = 0; if (x1 >= n - 3) x1 = n - 1; if (y1 >= n - 3) y1 = n - 1;
  if (Math.max(x1 - x0, y1 - y0) + 1 >= n - 2) return null;
  return [x0, y0, x1, y1];
}

// ---------------------------------------------------------------- board design pickers (8 boards, 4 stone sets)
const DESIGN_SPEC = { n: 9, stones: '.........' + '...w.....' + '..bwb....' + '...b.w...' + '......b..' + '.........' + '.........' + '.........' + '.........', turn: 2 };
function designPickers() {
  const r1 = $('#bdRow'), r2 = $('#stRow'); if (!r1 || !r2) return;
  r1.innerHTML = GoTheme.BOARD_IDS.map(k => `<button type="button" data-bd="${k}" class="${k === settings.bd ? 'sel' : ''}" aria-pressed="${k === settings.bd}">${designThumb(k, settings.st)}<span>${escHb(t('bd.' + k))}</span></button>`).join('');
  r2.innerHTML = GoTheme.STONE_IDS.map(k => `<button type="button" data-st="${k}" class="${k === settings.st ? 'sel' : ''}" aria-pressed="${k === settings.st}">${designThumb(settings.bd, k)}<span>${escHb(t('st.' + k))}</span></button>`).join('');
}
// a real little board with the texture and stone images
function designThumb(bd, st) {
  const B = GoTheme.BOARDS[bd], n = 7, u = 10, pad = 7, W = (n - 1) * u + pad * 2;
  let d = ''; for (let k = 0; k < n; k++) d += `M${pad} ${pad + k * u}H${pad + (n - 1) * u}M${pad + k * u} ${pad}V${pad + (n - 1) * u}`;
  const st9 = [[2, 2, 1], [3, 2, 2], [3, 3, 1], [4, 3, 2], [2, 4, 2], [4, 4, 1]];
  let s = `<svg viewBox="0 0 ${W} ${W}"><image href="${GoTheme.boardTex(bd, 256)}" x="0" y="0" width="${W}" height="${W}" preserveAspectRatio="none"/><path d="${d}" stroke="${B.line}" stroke-width=".7" fill="none"/>`;
  for (const [x, y, c] of st9) { const w = u * 1.3; s += `<image href="${GoTheme.stoneImg(st, c, x)}" x="${pad + x * u - w / 2}" y="${pad + y * u - w / 2}" width="${w}" height="${w}"/>`; }
  return s + '</svg>';
}
$('#bdRow').addEventListener('click', e => { const b = e.target.closest('button[data-bd]'); if (!b) return; settings.bd = b.dataset.bd; designApply(); designPickers(); save(); update(false); });
$('#stRow').addEventListener('click', e => { const b = e.target.closest('button[data-st]'); if (!b) return; settings.st = b.dataset.st; designApply(); designPickers(); save(); update(false); });

// ---------------------------------------------------------------- new game dialog
let draft = {};
const SIZES_MAIN = [19, 13, 9, 7, 5];
function levelLabelHTML(v) { return `${LV(v)}<small>${LVD(v)}</small>`; }
function segSync() {
  document.querySelectorAll('#segMode button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.mode));
  document.querySelectorAll('#segColor button').forEach(b => b.classList.toggle('sel', +b.dataset.v === draft.color));
  const m = draft.mode, gm = m === 'ai' || m === 'pvp' || m === 'watch';
  $('#fRatedInfo').classList.toggle('hidden', m !== 'rated');
  if (m === 'rated') $('#rtStats').innerHTML = rtStatsHtml();
  $('#fSize').classList.toggle('hidden', !gm);
  $('#fRule').classList.toggle('hidden', !gm);
  $('#fColor').classList.toggle('hidden', m !== 'ai');
  $('#fLevel').classList.toggle('hidden', !(m === 'ai' || m === 'watch'));
  $('#fLevel2').classList.toggle('hidden', m !== 'watch');
  $('#fDisplay').classList.toggle('hidden', !(gm || m === 'rated'));
  $('#fInfo').classList.toggle('hidden', gm || m === 'rated');
  $('#fInfoText').textContent = m === 'lesson' ? t('ls.desc') : m === 'puzzle' ? t('pz.desc') : '';
  $('#btnStart').textContent = m === 'lesson' ? t('ng.toLessons') : m === 'puzzle' ? t('ng.toPuzzles') : m === 'rated' ? t('rt.start') : t('start');
  $('#levelLabel').textContent = m === 'watch' ? t('ng.level1') : t('ng.level');
  $('#levelRange').value = draft.level; $('#levelName').innerHTML = levelLabelHTML(draft.level);
  $('#levelRange2').value = draft.level2; $('#levelName2').innerHTML = levelLabelHTML(draft.level2);
  // sizes
  const other = []; for (let k = 5; k <= 19; k++) if (!SIZES_MAIN.includes(k)) other.push(k);
  const isOther = !SIZES_MAIN.includes(draft.size);
  $('#segSize').innerHTML = SIZES_MAIN.map(k => `<button data-s="${k}" class="${k === draft.size ? 'sel' : ''}">${k}${t('u.ro')}</button>`).join('') +
    `<select id="selSizeOther" class="${isOther ? 'sel' : ''}"><option value="">${t('ng.otherSize')}</option>${other.map(k => `<option value="${k}" ${k === draft.size ? 'selected' : ''}>${k}${t('u.ro')}</option>`).join('')}</select>`;
  $('#selRule').value = effRule(draft.size, draft.rule); $('#selRule').disabled = draft.size < 9;
  const hs = $('#selHandi'); hs.innerHTML = [0, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<option value="${k}" ${k === draft.ha ? 'selected' : ''}>${k ? t('ha', { n: k }) : t('ha0')}</option>`).join('');
  hs.disabled = draft.size < 7;
  const ks = $('#selKomi'), dk = R.defaultKomi(draft.size, effRule(draft.size, draft.rule));
  const kopts = ['auto', 0.5, 0, 5.5, 6.5, 7.5]; if (draft.size < 13) kopts.push(dk);
  ks.innerHTML = [...new Set(kopts)].map(k => `<option value="${k}" ${String(k) === String(draft.komi) ? 'selected' : ''}>${k === 'auto' ? t('komi.auto', { k: draft.ha >= 2 ? 0.5 : dk }) : k}</option>`).join('');
  ks.disabled = draft.ha >= 2;
  $('#selTap').value = draft.tap;
}
function openNewDialog(resume) {
  draft = { mode: lesson ? 'lesson' : puzzle ? 'puzzle' : rgame && settings.mode === 'ai' ? 'rated' : settings.mode === 'online' ? 'pvp' : settings.mode, color: settings.color, level: settings.level, level2: settings.level2, size: settings.size, rule: settings.rule, ha: settings.ha, komi: settings.komi, tap: settings.tap };
  if (resume) { draft.resume = true; if (!['ai', 'pvp', 'watch'].includes(draft.mode)) draft.mode = 'ai'; draft.color = humanColor; }   // 「ここから再開」: the same dialog, only what fits going on from this position
  $('#optEval').checked = settings.eval; $('#optLast').checked = settings.last; $('#optAnim').checked = settings.anim; $('#optCoord').checked = settings.coord; $('#optCoordAll').checked = settings.coordAll; $('#optCoordAll').disabled = !settings.coord; $('#optNum').checked = settings.num; $('#optAtari').checked = settings.atari;
  if (window.ResumeNG) { if (resume) ResumeNG.open({ modes: ['ai', 'pvp', 'watch'], hide: '#fSize, #fRule > .row2:first-child, #fRule > .row2:nth-child(2) > div:first-child' }); else ResumeNG.close(); }
  segSync(); designPickers(); showOverlay('#newOverlay');
}
// 「ここから再開」 with the chosen settings: the position and the moves up to it are kept, who is to move stays
function resumeWith() {
  const pm = settings.mode, ph = humanColor;
  Object.assign(settings, { mode: draft.mode, color: draft.color, level: draft.level, level2: draft.level2 });
  stopPlay(); busyToken++; cancelWorker(); thinking = 0; wpPaused = false;
  if (settings.mode === 'ai') humanColor = settings.color === 0 ? (Math.random() < 0.5 ? P1 : P2) : settings.color;
  if (settings.mode === 'ai' && (pm !== 'ai' || ph !== humanColor)) settings.rsNoRec = true;   // taken over midway: not a game of the player's for the record
  hideOverlay('#resultOverlay');
  if (reviewing) resumeHere(); else { gameOverShown = false; update(false); save(); afterPosition(); }
}
$('#segMode').onclick = e => { const b = e.target.closest('button'); if (b && b.dataset.v) { draft.mode = b.dataset.v; segSync(); } };
$('#segColor').onclick = e => { const b = e.target.closest('button'); if (b) { draft.color = +b.dataset.v; segSync(); } };
$('#segSize').addEventListener('click', e => { const b = e.target.closest('button[data-s]'); if (b) { draft.size = +b.dataset.s; if (draft.size < 7) draft.ha = 0; segSync(); } });
$('#segSize').addEventListener('change', e => { if (e.target.id === 'selSizeOther' && e.target.value) { draft.size = +e.target.value; if (draft.size < 7) draft.ha = 0; segSync(); } });
$('#selRule').onchange = e => { if (draft.size < 9) return; draft.rule = e.target.value; segSync(); };
$('#selHandi').onchange = e => { draft.ha = +e.target.value; segSync(); };
$('#selKomi').onchange = e => { draft.komi = e.target.value === 'auto' ? 'auto' : +e.target.value; };
$('#selTap').onchange = e => { draft.tap = e.target.value; };
$('#levelRange').oninput = e => { draft.level = +e.target.value; segSync(); };
$('#levelRange2').oninput = e => { draft.level2 = +e.target.value; segSync(); };
$('#btnCancelNew').onclick = () => hideOverlay('#newOverlay');
$('#btnStart').onclick = () => {
  if (draft.mode === 'online') return;
  hideOverlay('#newOverlay');
  if (draft.mode === 'lesson') { openLessons(); return; }
  if (draft.mode === 'puzzle') { openPuzzles(); return; }
  Object.assign(settings, { eval: $('#optEval').checked, last: $('#optLast').checked, anim: $('#optAnim').checked, coord: $('#optCoord').checked, coordAll: $('#optCoordAll').checked, num: $('#optNum').checked, atari: $('#optAtari').checked, tap: draft.tap });
  drawnKey = '';
  if (draft.mode === 'rated') { rtStart(); return; }
  if (draft.resume) { resumeWith(); return; }
  exitSpecial();
  Object.assign(settings, { mode: draft.mode, color: draft.color, level: draft.level, level2: draft.level2, size: draft.size, rule: draft.rule, ha: draft.ha, komi: draft.komi });
  newGame();
};

// ====================================================================== rated games vs the AI (solo): 9x9, 5 min + 20 s byo-yomi
const RT_STORE = STORE + '-rated', RT_START = 1000, RT_SIZE = 9, RT_CLOCK = { base: 300000, byo: 20000 };
// rating of each AI step on the kyu / dan scale (100 per kyu: 15級 = 450 … 1級 = 1850, then about 100 per dan)
// AI ratings on the EGF scale (GoR): 1級 2000, 初段 2100, 100 per rank up to 五段 2500, then 50 per rank (六段 2550 … 八段 2650), top amateur 2700
const egfOf = i => { const v = rankVal(i); return v <= 5 ? 2000 + 100 * v : Math.min(2700, 2500 + 50 * (v - 5)); };
const RT_LV = [0].concat(Array.from({ length: LV_MAX }, (_, i) => egfOf(i + 1)));
function rtLoad() {
  let s = null; try { s = JSON.parse(localStorage.getItem(RT_STORE) || 'null'); } catch (e) {}
  if (!s || typeof s.r !== 'number' || !isFinite(s.r)) s = { r: RT_START, n: 0, w: 0, l: 0, d: 0, hist: [] };
  if (!Array.isArray(s.hist)) s.hist = [];
  return s;
}
function rtStore(s) { try { localStorage.setItem(RT_STORE, JSON.stringify(s)); } catch (e) {} }
function rtRank(r) { let k = 0; for (let i = 1; i <= LV_MAX; i++) if (r >= RT_LV[i] - 50) k = i; return k ? LV(k) : t('rt.below'); }
const rtD = d => (d >= 0 ? '+' : '−') + Math.abs(d);
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
// clock: main time, then byo-yomi (each move within RT_CLOCK.byo once the main time is used up)
function rtClockLeft(c) {
  if (!rgame || !rgame.ct) return 0;
  let v = rgame.ct[c];
  if (rtLive() && !rtHold && toMoveAt(moves.length) - 1 === c) v -= Date.now() - rgame.t;
  return v;   // may go below 0: then byo-yomi is running (v + byo)
}
const rtInByo = (c, ms) => ms <= 0;
function rtClockText(c, ms) { if (ms > 0) return fmtClock(ms); const b = Math.max(0, RT_CLOCK.byo + ms); return t('byo', { s: Math.ceil(b / 1000) }); }
function rtLow(c, ms) { return ms <= 0 ? RT_CLOCK.byo + ms < 10000 : ms < 30000; }
function rtCharge() { const side = toMoveAt(moves.length) - 1, now = Date.now(); let v = rgame.ct[side] - (now - rgame.t); if (v < 0) v = 0; /* in byo-yomi the period resets each move */ rgame.ct[side] = v; rgame.t = now; }
function rtAiTime() { const side = toMoveAt(moves.length) - 1, left = rtClockLeft(side); return left > 60000 ? undefined : Math.max(800, (left > 0 ? left : RT_CLOCK.byo + left) / 6); }
function fmtClock(ms) { const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); }
setInterval(() => {
  if (!rtLive()) return;
  if (rtHold) { rgame.t = Date.now(); return; }
  const c = toMoveAt(moves.length) - 1, left = rtClockLeft(c), e = $('#clk' + (c + 1));
  if (e) { e.textContent = rtClockText(c, left); e.classList.toggle('low', rtLow(c, left)); }
  if (window.CountTick && c + 1 === humanColor) CountTick.feed(left > 0 ? left : RT_CLOCK.byo + left, 'rt' + moves.length);
  if (left <= -RT_CLOCK.byo) { rgame.over = { over: true, winner: c ? P1 : P2, why: 'time' }; busyToken++; cancelWorker(); thinking = 0; save(); update(false); onGameEnd(rgame.over); }
}, 250);
function rtSettle(st) {
  const Rg = rgame; if (!Rg || !st || !st.over) return null;
  if (Rg.done) return Rg.done;
  const S = rtLoad(), prev = S.hist.find(h => h.id === Rg.id);
  if (prev) { Rg.done = { old: prev.r - prev.d, now: prev.r, d: prev.d }; return Rg.done; }
  const sc = st.draw || !st.winner ? 0.5 : st.winner === humanColor ? 1 : 0;
  const old = S.r, pl = Placement.on(S) ? Placement.record(S, Rg.or, sc) : null;
  const K = S.n < 10 ? 48 : 24, Ex = 1 / (1 + Math.pow(10, (Rg.or - old) / 400));
  const now = pl ? pl.r : Math.max(0, Math.round(old + K * (sc - Ex)));
  S.r = now; S.n++; if (sc === 1) S.w++; else if (sc === 0) S.l++; else S.d++;
  S.hist.push({ id: Rg.id, t: Date.now(), lv: Rg.lv, or: Rg.or, s: sc, d: now - old, r: now, why: st.why, pl: pl ? pl.k : undefined });
  if (S.hist.length > 100) S.hist = S.hist.slice(-100);
  rtStore(S); Rg.done = { old, now, d: now - old, pl }; if (pl && pl.final) Placement.reveal(S, rtRank(now)); if (!Rg.over) Rg.over = st; save();
  return Rg.done;
}
function rtForfeit() {
  if (!rtLive()) return null;
  busyToken++; cancelWorker(); thinking = 0;
  rgame.over = { over: true, winner: humanColor === P1 ? P2 : P1, why: 'abandon' };
  const x = rtSettle(rgame.over); save(); recordGame(rgame.over);
  if (x) toast(t('rt.abandoned', { o: x.old, n: x.now, d: rtD(x.d) }), 3200);
  return x;
}
function rtStart() {
  if (Placement.gate(rtLoad(), rtStore, () => rtStart())) return;
  const S = rtLoad(), pk = rtPick(S.r);
  exitSpecial();
  settings.mode = 'ai';
  newGame({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), lv: pk.lv, or: pk.or, my: S.r, tag: pk.tag });
  toast(t('rt.vs', { lv: LV(pk.lv), r: pk.or, tag: t('rt.' + pk.tag) }), 4000);
}
function rtStatsHtml() {
  const S = rtLoad(), h = S.hist.slice(-10).reverse();
  let html = `<div class="rt-card"><div class="rt-head"><span class="rt-lbl">${t('rt.title')}</span><b class="rt-r">R ${S.r}</b><span class="rt-rank">${rtRank(S.r)}</span>${Placement.on(S) ? Placement.badge(S) : S.n < 10 ? `<span class="rt-prov">${t('rt.prov')}</span>` : ''}</div>`;
  html += `<div class="rt-rec">${S.n ? t('rt.rec', { n: S.n, w: S.w, l: S.l, d: S.d }) : t('rt.none')}</div>`;
  html += Placement.note(S);
  const sp = S.hist.slice(-30);
  if (sp.length >= 2) {
    const ps = [sp[0].r - sp[0].d].concat(sp.map(x => x.r)), lo = Math.min(...ps) - 10, hi = Math.max(...ps) + 10, Wd = 300, H = 34;
    const y = v => (H - 3 - (v - lo) / (hi - lo) * (H - 6)).toFixed(1);
    html += `<svg class="rt-spark" viewBox="0 0 ${Wd} ${H}" preserveAspectRatio="none"><line x1="0" x2="${Wd}" y1="${y(ps[0])}" y2="${y(ps[0])}" vector-effect="non-scaling-stroke"/><polyline vector-effect="non-scaling-stroke" points="${ps.map((v, i) => (i / (ps.length - 1) * Wd).toFixed(1) + ',' + y(v)).join(' ')}"/></svg>`;
  }
  if (h.length) html += `<div class="rt-lbl2">${t('rt.recent')}</div><div class="rt-hist">` + h.map(x => { const c = x.s === 1 ? 'w' : x.s === 0 ? 'l' : 'd'; return `<span class="rt-chip ${c}" title="${LV(x.lv)} · R${x.or}"><i>${t('rt.' + c.toUpperCase())}</i><b>${rtD(x.d)}</b></span>`; }).join('') + '</div>';
  return html + '</div>';
}
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

// ====================================================================== post-game review (raw pass for every move, search to confirm the mistakes)
let rv = null;        // { key, list: [{lead, wr, best, top: [...]}] per position, done, total, running }
let rvOpen = false;
const gameKey = () => keyOf(moves.length);
function rvCancel() { if (rv && rv.running) { rv.cancel = true; rv = null; } }
async function runReview() {
  if (lesson || puzzle) return;
  if (moves.length < 1) { toast(t('nokifu')); return; }
  if (rv && rv.key === gameKey() && (rv.running || rv.done === rv.total)) { rvOpen = true; renderReview(); revealReview(); return; }
  rvCancel();
  const game0 = moves.slice(), key = gameKey(), st0 = startSpec, g0 = Object.assign({}, game);
  const run = rv = { key, list: [], done: 0, total: game0.length + 1, running: true };
  rvOpen = true; renderReview(); revealReview();
  if (!W2 && !COARSE) W2 = makeWorker();
  const w = W2 || W;
  const req = msg => request(msg, null, w);
  // pass 1: raw net value of every position (fast)
  for (let i = 0; i <= game0.length; i++) {
    if (rv !== run) return;
    const r = await req({ type: 'policy', spec: st0 || { n: g0.n }, moves: game0.slice(0, i), komi: g0.komi, net: 'light' });
    if (rv !== run) return;
    if (!r) { await new Promise(res => setTimeout(res, 50)); i--; continue; }
    const sign = (i === 0 ? ((st0 && st0.turn) || P1) : posAt(i).turn) === P1 ? 1 : -1;
    run.list[i] = { lead: r.lead * sign, wr: sign > 0 ? r.wr : 1 - r.wr, top: r.list.slice(0, 6) };
    if (gameKey() === key && (!evals[i] || evals[i].src === 'raw')) evals[i] = { wr: run.list[i].wr, lead: run.list[i].lead, src: 'raw' };
    run.done = i + 1;
    if (i % 4 === 0 || i === game0.length) { renderReview(); renderGraph(); }
  }
  // pass 2: search the positions where the raw values suggest a mistake (or where the move was not the net's choice)
  // only the worst-looking moves are searched (biggest raw losses first, capped), and each position is searched once:
  // the search after move i is the search before move i+1 when both are checked
  let sus = [];
  for (let i = 0; i < game0.length; i++) {
    const a = run.list[i], b = run.list[i + 1]; if (!a || !b) continue;
    const mover = i === 0 ? ((st0 && st0.turn) || P1) : posAt(i).turn, s = mover === P1 ? 1 : -1;
    const loss = (a.lead - b.lead) * s, off = a.top[0] && a.top[0].m !== game0[i] && a.top[0].p > 0.5;
    if (loss > 1.2 || off) sus.push({ i, sc: Math.max(loss, off ? a.top[0].p : 0) });
  }
  const CAP = COARSE ? 20 : 36;
  sus = sus.sort((x, y) => y.sc - x.sc).slice(0, CAP).map(x => x.i).sort((x, y) => x - y);
  const net = COARSE ? 'light' : 'strong', got = new Map();
  const search = async (j, visits, time) => {
    if (got.has(j)) return got.get(j);
    const r = await req({ type: 'analyze', spec: st0 || { n: g0.n }, moves: game0.slice(0, j), komi: g0.komi, net, visits, time });
    if (r) got.set(j, r);
    return r;
  };
  const need = new Set(sus);
  run.phase2 = { done: 0, total: sus.length };
  for (const i of sus) {
    if (rv !== run) return;
    const r = await search(i, COARSE ? 24 : 48, 2500);
    if (rv !== run) return;
    const r2 = await search(i + 1, need.has(i + 1) ? (COARSE ? 24 : 48) : (COARSE ? 16 : 32), need.has(i + 1) ? 2500 : 2000);
    if (rv !== run) return;
    if (r && r2) {
      const mover = i === 0 ? ((st0 && st0.turn) || P1) : posAt(i).turn, s = mover === P1 ? 1 : -1;
      run.list[i].srch = { best: r.list[0] ? r.list[0].m : null, bestLead: r.lead, cands: r.list.slice(0, 5) };
      run.list[i].lead = r.lead * s;
      run.list[i + 1].lead2 = r2.lead * -s;   // after the move, from the mover's... stored in black view below
      run.list[i].after = -r2.lead;            // mover's view after the move
    }
    run.phase2.done++; renderReview();
  }
  run.running = false;
  if (gameKey() === key) save();
  renderInfo(); renderFx(); toast(t('rv.done'), 1200);
}
function revealReview() { if (matchMedia('(max-aspect-ratio: 1/1) and (pointer: coarse)').matches) setTimeout(() => $('#reviewCard').scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60); }
// judgement of move i+1 (played from position i): points lost (mover's view)
function rvJudge(i) {
  if (!rv || rv.key !== gameKey()) return null;
  if (rv.running) return rvJudge0(i);
  // finished review: the judgements never change — memoised (the record, the mistake list and the coach ask for all of them on every step)
  const c = rv.jc && rv.jc.lang === LANG && rv.jc.n === game.n ? rv.jc : (rv.jc = { lang: LANG, n: game.n, a: [] });
  return i in c.a ? c.a[i] : (c.a[i] = rvJudge0(i));
}
function rvJudge0(i) {
  const a = rv.list[i], b = rv.list[i + 1]; if (!a || !b) return null;
  const mover = toMoveAt(i), s = mover === P1 ? 1 : -1, m = moves[i];
  let loss, best;
  if (a.srch && a.after != null) { loss = a.srch.bestLead - a.after; best = a.srch.best; }
  else { loss = (a.lead - b.lead) * s; best = a.top[0] ? a.top[0].m : null; }
  const n2 = game.n * game.n, scale = n2 >= 300 ? 1 : n2 >= 150 ? 0.8 : 0.6;
  let q = null;
  if (loss >= 6 * scale) q = 'bad'; else if (loss >= 2.5 * scale) q = 'dubious';
  if (!a.srch && q) q = loss >= 9 * scale ? 'bad' : 'dubious';   // unconfirmed (no search): softer
  const ok = !q && (best === m || loss < 0.6);
  return { q, ok, loss: Math.max(0, loss), best, m, desc: t('rv.loss', { p: (Math.round(Math.max(0, loss) * 10) / 10).toFixed(1) }) };
}
// coach: why a move was a mistake, in plain words
const crName = m => '<bdi>' + mvName(m) + '</bdi>';
function nearPts(n, a, b) { if (a == null || b == null || a < 0 || b < 0) return 99; return Math.max(Math.abs(a % n - b % n), Math.abs(Math.floor(a / n) - Math.floor(b / n))); }
function crExplain(i, j) {
  const pos = posAt(i), m = j.m, b = j.best, n = game.n, me = pos.turn;
  if (m === PASS) return { kind: 'pass', txt: t('cr.pass', { b: crName(b) }) };
  if (!j.q) return j.ok ? { kind: '', txt: t('cr.best') } : { kind: '', txt: t('cr.good', { b: crName(b) }) };
  const after = posAt(i + 1);
  // the opponent can now capture a lot / our group got into atari
  let atari = 0; { const seen = new Uint8Array(n * n); for (let q = 0; q < n * n; q++) { if (after.b[q] !== me || seen[q]) continue; const g = after.group(q); for (const s of g.stones) seen[s] = 1; if (g.libs === 1) atari += g.stones.length; } }
  let wasAtari = 0; { const seen = new Uint8Array(n * n); for (let q = 0; q < n * n; q++) { if (pos.b[q] !== me || seen[q]) continue; const g = pos.group(q); for (const s of g.stones) seen[s] = 1; if (g.libs === 1) wasAtari += g.stones.length; } }
  if (wasAtari >= 2 && atari >= wasAtari) return { kind: 'ignoreAtari', txt: t('cr.ignoreAtari', { b: crName(b) }) };
  if (atari >= 2) return { kind: 'selfAtari', txt: t('cr.selfAtari', { b: crName(b) }) };
  // the best move captures
  if (b != null && b !== PASS) { const r = pos.tryPlay(b); if (r && r.captured.length >= 2) return { kind: 'missCapture', txt: t('cr.missCapture', { b: crName(b), n: r.captured.length }) }; }
  const last = i > 0 ? moves[i - 1] : null, opening = i < n * n * 0.12;
  if (b != null && b !== PASS && last != null && last !== PASS && nearPts(n, b, last) <= 2 && nearPts(n, m, last) > 3) return { kind: 'urgent', txt: t('cr.urgent', { b: crName(b) }) };
  if (opening && b != null && nearPts(n, m, last) <= 2 && nearPts(n, b, last) > 4) return { kind: 'bigPoint', txt: t('cr.bigPoint', { b: crName(b) }) };
  if (i > n * n * 0.55) return { kind: 'endgame', txt: t('cr.endgame', { b: crName(b), d: j.desc }) };
  return { kind: 'gen', txt: t('cr.gen', { d: j.desc, b: crName(b) }) };
}
function sideLabel(p) { return settings.mode === 'ai' ? (p === humanColor ? t('you') : 'AI') : pname(p); }
// commentary of the move played from the position shown: { head, tag, body } (the coach card and the review box)
function rvCoachMove() {
  const i = cur, j = rvJudge(i), who = toMoveAt(i);
  const head = t('cr.move', { n: i + 1, who: sideLabel(who), m: '<bdi>' + mvAt(i) + '</bdi>' });
  const tag = j && j.q ? `<span class="tag ${j.q}">${t('q.' + j.q)}</span>` : j && j.ok ? `<span class="tag best">${t('q.best')}</span>` : '';
  if (!j) return { head, tag, body: `<p>${t('cr.noData')}</p>` };
  const x = crExplain(i, j);
  return { head, tag, body: `<p>${x.txt}</p>` + (x.kind ? `<p class="cr-tip">${t('cr.tip.' + x.kind)}</p>` : '') };
}
function rvCoach() {
  let h = `<div class="cr-box"><div class="cr-h">${t('cr.title')}</div>`;
  if (cur < moves.length) {
    const x = rvCoachMove();
    return h + `<p class="cr-mv"><b>${x.head}</b>${x.tag ? ' ' + x.tag : ''}</p>${x.body}<p class="cr-more">${t('cr.nav')}</p></div>`;
  }
  const sides = settings.mode === 'ai' ? [humanColor] : [P1, P2], all = [];
  const stt = {}; sides.forEach(p => (stt[p] = { n: 0, ok: 0, bad: 0, dubious: 0 }));
  for (let i = 0; i < moves.length; i++) {
    const who = toMoveAt(i); if (!stt[who]) continue;
    const j = rvJudge(i); if (!j) continue;
    const x = stt[who]; x.n++; if (j.ok) x.ok++; if (j.q) { x[j.q]++; all.push({ i, who, ...j }); }
  }
  for (const p of sides) { const x = stt[p]; h += `<p>${t('cr.sum', { who: sideLabel(p), p: x.n ? Math.round(x.ok / x.n * 100) : 0, b: x.bad, d: x.dubious })}</p>`; }
  if (!all.length) h += `<p>${t('cr.clean')}</p>`;
  else {
    const top = all.slice().sort((a, b) => b.loss - a.loss)[0];
    h += `<p class="cr-mv"><span class="cr-turn">${t('cr.turn')}</span> <b>${t('cr.move', { n: top.i + 1, who: sideLabel(top.who), m: '<bdi>' + mvAt(top.i) + '</bdi>' })}</b> <span class="tag ${top.q}">${t('q.' + top.q)}</span> <button class="cr-see" data-i="${top.i}">${t('cr.see')}</button></p>`;
  }
  return h + `<p class="cr-more">${t('cr.nav')}</p></div>`;
}
let rvHtml = '';
window.addEventListener('resize', () => { rvHtml = ''; });
function renderReview() {
  const card = $('#reviewCard');
  if (rv && !lesson && !puzzle && rv.key !== gameKey()) { rvCancel(); rv = null; rvOpen = false; }
  if (window.RBox) RBox.sync();
  const show = !lesson && !puzzle && rvOpen && rv;
  card.classList.toggle('show', !!show);
  document.body.classList.toggle('rv-on', !!show);
  if (!show) { rvHtml = ''; return; }
  let html;
  if (rv.running) {
    const p2 = rv.phase2, a = p2 ? rv.total + p2.done : rv.done, b = p2 ? rv.total + p2.total : rv.total * 1.3;
    html = `<div style="font-size:12px;color:var(--muted)">${t('rv.running', { a: Math.min(rv.done, rv.total), b: rv.total })}${p2 ? ' · ' + t('rv.check', { a: p2.done, b: p2.total }) : ''}</div><div class="rv-prog"><i style="width:${Math.min(100, a / b * 100)}%"></i></div>`;
  } else {
    const list = [];
    for (let i = 0; i < moves.length; i++) { const j = rvJudge(i); if (j && j.q) list.push({ i, ...j }); }
    html = RBox.isOn() ? '' : rvCoach();
    const shown = list.length > 10 ? list.slice().sort((a, b) => (b.q === 'bad') - (a.q === 'bad') || b.loss - a.loss).slice(0, 10).sort((a, b) => a.i - b.i) : list;
    if (shown.length) html += `<div class="rv-list">${shown.map(x => `<button data-i="${x.i}" class="${cur === x.i ? 'cur' : ''}"><span class="tag ${x.q}">${t('q.' + x.q)}</span><span class="mv">${x.i + 1}. <i class="p${toMoveAt(x.i)}"></i>${mvAt(x.i)} → ${mvName(x.best)}</span><span class="ls">${x.desc}</span></button>`).join('')}</div>`;
    else html += `<div class="rv-note" style="color:#8fe3b8">${t('rv.clean')}</div>`;
    html += `<div class="rv-note" style="color:var(--dim);font-size:11px;line-height:1.6">${t('rv.note')}</div>`;
  }
  const sig = html;
  if (sig === rvHtml) return;   // unchanged (e.g. stepping on PC, where the commentary is in the review box): no DOM work
  rvHtml = sig;
  const keepTop = card.scrollTop;
  $('#rvBody').innerHTML = html;
  { const cb = $('#rvBody > .cr-box'); if (cb) card.style.setProperty('--rvh', Math.round(cb.getBoundingClientRect().bottom - card.getBoundingClientRect().top + card.scrollTop + 14) + 'px'); else card.style.removeProperty('--rvh'); card.scrollTop = keepTop; }
}
// on the board while reviewing: the move played (dashed ring) and the best move (gold ring + candidates)
function drawReviewFx(gH, gM) {
  if (rbS) return false;
  if (lesson || puzzle || !rvOpen || !rv || rv.running || rv.key !== gameKey() || cur >= moves.length) return false;
  const j = rvJudge(cur); if (!j) return false;
  const a = rv.list[cur];
  if (a && a.srch && a.srch.cands) drawHints(a.srch.cands, gH);
  else if (j.best != null && j.best !== PASS) markAt(gM, { at: j.best, cls: 'ok' });
  if (moves[cur] !== PASS) markAt(gM, { at: moves[cur], cls: j.q ? 'ng' : 'dash' });
  return true;
}
$('#rvBody').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
$('#rvClose').onclick = () => { rvOpen = false; if (rv && rv.running) rvCancel(); renderReview(); renderFx(); renderKifu(); };
$('#btnAnalyze').onclick = () => runReview();
$('#btnResAnalyze').onclick = () => { hideOverlay('#resultOverlay'); runReview(); };

// ====================================================================== review box (PC): commentary + candidate moves with lines + study mode (rbox.js)
function rbShown() { return rbS ? rbS.pos[rbS.pos.length - 1] : posAt(cur); }
function rbMoves() { return rbS ? moves.slice(0, rbS.base).concat(rbS.mv) : moves.slice(0, cur); }
function rbActive() {
  if (!document.documentElement.classList.contains('pc2') || lesson || puzzle || settings.mode === 'online' || rtLive()) return false;
  if (!rvOpen || !rv || rv.running || rv.key !== gameKey() || !moves.length) return false;
  // finished games — also while the dead stones are being marked after both passed (整地), so 分析 works before the count is
  // confirmed — or a loaded / two-player record
  return gameOver(moves.length) || isCounting(moves.length) || settings.mode === 'pvp';
}
// the review box's searches run in the review worker W2 (already holding the strong net after the whole-game pass): no third
// worker / second copy of the net. Positions already searched by the whole-game review are shown at once (rbSeed); the box
// (rbox.js) caches finished results per position, waits a moment before searching and cancels the search on every step.
function rbWorker() { if (!W2) W2 = makeWorker(); return W2; }
function rbFmt(r, fin) {
  if (!r || !r.list) return [];
  const turn = rbShown().turn, played = !rbS && cur < moves.length ? moves[cur] : -9;
  const tot = r.list.reduce((a, c) => a + c.n, 0) || 1;
  return r.list.filter((c, k) => c.n > 0 && (k < 3 || c.n / tot >= 0.02)).slice(0, 5).map(c => {
    let side = 3 - turn; const pv = [];
    for (const m of c.pv || []) { pv.push({ t: mvName(m), s: side, m }); side = 3 - side; }
    return { id: c.m, mv: mvName(c.m), val: fmtLead(c.lead), sub: Math.round(c.wr * 100) + '%', cls: c.lead >= 0.5 ? 'good' : c.lead <= -0.5 ? 'bad' : '', pv: fin || c.pv ? pv : null, played: c.m === played };
  });
}
// candidates of the shown position already computed (the whole-game review's search of a suspicious move, or the hint search)
function rbSeedRaw() {
  if (rbS || cur >= moves.length || statusAt(cur).over || isCounting(cur)) return null;
  const a = rv && rv.key === gameKey() ? rv.list[cur] : null;
  if (a && a.srch && a.srch.cands && a.srch.cands.length) return { list: a.srch.cands };
  const h = anaCache.get(keyOf(cur));
  return h && h.list && h.list.length ? h : null;
}
function rbSeed() { const r = rbSeedRaw(); return r ? rbFmt(r, false) : null; }
function rbAnalyze(done, st) {
  if (!rbS && (statusAt(cur).over || isCounting(cur))) { done([], true); return null; }
  if (rbS && rbS.mv.length >= 2 && rbS.mv[rbS.mv.length - 1] === PASS && rbS.mv[rbS.mv.length - 2] === PASS) { done([], true); return null; }
  // continuous analysis: deeper and deeper searches (visits ×2 each round, lines kept from the last finished round)
  // until about 45 s have been spent or the box's 停止 cancels it (the last results stay on screen).
  // st = { k, spent, last }: where an earlier run on this position stopped (rbox.js caches it per position) — continue from there
  const w = rbWorker(), sd = rbSeedRaw(), seedN = sd ? sd.list.reduce((a, c) => a + (c.n || 0), 0) : 0;
  let live = true, last = st ? st.last : null, spent = st ? st.spent : 0, k = st ? st.k : 0;
  const v0 = game.n <= 9 ? 1600 : game.n <= 13 ? 900 : 600, LIMIT = 45000, job = jobBase(startSpec, rbMoves());
  (async () => {
    while (live) {
      const tm = Math.min(3500 * (1 << k), LIMIT - spent), t0 = performance.now();
      // progress of the first round replaces the shown list once it has looked at more than what is already shown (seed)
      const r = await request({ type: 'analyze', preempt: true, ...job, net: 'strong', visits: v0 * (1 << k), time: tm, pv: 5, prog0: 120 }, m => { if (live && !last && m.visits >= seedN) done(rbFmt(m, false), false); }, w);
      if (!live) return;
      spent += performance.now() - t0; k++;
      if (r) last = rbFmt(r, true);
      const end = !r || spent >= LIMIT - 500 || k > 6, state = { k, spent, last };
      if (end) { live = false; done(last || [], true, state); return; }
      done(last, false, state);
    }
  })();
  return () => { if (live) { live = false; w.postMessage({ type: 'cancel' }); } };
}
function rbSeq() {
  const c = RBox.hovered(); if (!c) return null;
  let side = rbShown().turn; const seq = [{ m: c.id, s: side }]; side = 3 - side;
  for (const x of c.pv || []) seq.push({ m: x.m, s: x.s });
  return seq;
}
function rbHoverFx(gH) {
  const seq = rbSeq(); if (!seq) return;
  gH.innerHTML = '';
  const used = new Set();
  seq.forEach((x, k) => {
    if (x.m == null || x.m < 0 || used.has(x.m)) return; used.add(x.m);
    const [px, py] = xyOf(x.m), g = el('g', { class: 'hint rbpv' }, gH);
    el('circle', { cx: px, cy: py, r: 0.44, fill: x.s === P1 ? 'rgba(14,14,14,.82)' : 'rgba(248,246,238,.9)', stroke: k === 0 ? '#f0c766' : 'rgba(0,0,0,.4)', 'stroke-width': k === 0 ? 0.09 : 0.03 }, g);
    const tx = el('text', { x: px, y: py + 0.02, 'font-size': 0.42, fill: x.s === P1 ? '#fff' : '#111' }, g); tx.textContent = k + 1;
  });
}
function rbStudyFx(gM, gH) {
  const pos = rbShown(), m = rbS.mv.length ? rbS.mv[rbS.mv.length - 1] : (rbS.base > 0 ? moves[rbS.base - 1] : null);
  if (settings.last && m != null && m !== PASS && pos.b[m]) { const [x, y] = xyOf(m); el('circle', { cx: x, cy: y, r: 0.24, class: 'lm', stroke: pos.b[m] === P1 ? '#fff' : '#111' }, gM); }
  if (pos.ko >= 0) { const [x, y] = xyOf(pos.ko); el('rect', { x: x - 0.22, y: y - 0.22, width: 0.44, height: 0.44, class: 'halo' }, gM); el('rect', { x: x - 0.22, y: y - 0.22, width: 0.44, height: 0.44, class: 'ko' }, gM); }
  rbHoverFx(gH);
}
function rbStudyPlay(i) {
  const pos = rbShown();
  if (i !== PASS && (pos.b[i] || !pos.legal(i))) { if (i >= 0 && !pos.b[i]) toast(i === pos.ko ? t('cant.ko') : t('cant.suicide'), 1400); return false; }
  const r = pos.tryPlay(i); if (!r) return false;
  rbS.pos.push(r.pos); rbS.mv.push(i);
  if (i !== PASS) { sStone(false); if (r.captured && r.captured.length) sCapture(r.captured.length); }
  syncStones(r.pos, true, r.captured); renderFx();
  return true;
}
if (window.RBox) RBox.init({
  host: $('.app'), badgeHost: $('#frame'), lang: () => LANG,
  active: rbActive,
  key: () => (rbS ? 'S' + rbS.mv.join(',') : 'G') + '|' + keyOf(rbS ? rbS.base : cur),
  baseMove: () => cur,
  explain: () => {
    if (cur < moves.length) { const x = rvCoachMove(); return { head: x.head, tag: x.tag, html: x.body }; }
    const h = rvCoach().replace(/^<div class="cr-box"><div class="cr-h">[^<]*<\/div>/, '').replace(/<\/div>$/, '').replace(/<p class="cr-more">.*?<\/p>/, '');
    return { head: RBox.t('final') + (statusAt(moves.length).over ? ' · ' + escHb(resultLine(statusAt(moves.length))) : ''), html: h + `<p class="rb-note">${RBox.t('finalNote')}</p>` };
  },
  analyze: rbAnalyze,
  seed: rbSeed,
  hover: () => renderFx(),
  studyStart: () => { busyToken++; stopPlay(); hintList = null; rbS = { base: cur, pos: [posAt(cur)], mv: [] }; renderBoard(false); },
  studyPlay: rbStudyPlay,
  studyBack: () => { if (rbS && rbS.mv.length) { rbS.mv.pop(); rbS.pos.pop(); syncStones(rbShown(), false, null); renderFx(); } },
  studyEnd: () => { rbS = null; svg.classList.toggle('can', canHumanPlay()); renderBoard(false); renderInfo(); },
  studyLen: () => rbS ? rbS.mv.length : 0,
  studyInfo: () => { const p = rbShown(); return `<b>${escHb(t('hb.turn', { c: pname(p.turn) }))}</b> · ${escHb(t('caps'))} ●${p.caps[P1]} ○${p.caps[P2]}`; },
});

// ====================================================================== share / load (URL hash or SGF)
const K64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const encMv = m => m === PASS ? '__' : K64[m >> 6] + K64[m & 63];
function encMoves(list) { return list.map(encMv).join(''); }
function decMoves(s, n) {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 2) return null;
  const out = [];
  for (let i = 0; i < s.length; i += 2) { if (s.slice(i, i + 2) === '__') { out.push(PASS); continue; } const v = K64.indexOf(s[i]) * 64 + K64.indexOf(s[i + 1]); if (v < 0 || v >= n * n) return null; out.push(v); }
  return out;
}
function openLoaded(g, start, list, n) {
  ['#resultOverlay', '#newOverlay', '#lessonOverlay', '#puzzleOverlay', '#pasteOverlay'].forEach(hideOverlay);
  if (lesson || puzzle) { savedGame = null; exitSpecial(); }
  busyToken++; cancelWorker(); rvCancel(); rv = null; rvOpen = false; thinking = 0;
  settings.mode = 'pvp'; rgame = null; manualEnd = null; count = null;
  setGame(g); startSpec = start || null;
  moves = list; evals = []; hintList = null;
  cur = n === undefined || isNaN(n) ? moves.length : Math.max(0, Math.min(moves.length, n));
  reviewing = cur !== moves.length; gameOverShown = true;
  update(false); save(); afterPosition();
}
function loadText(v) {
  v = (v || '').trim();
  const h = v.match(/#(.*)$/);
  if (h && /(^|&)g=/.test(h[1])) return loadHashStr(h[1]);
  const r = R.sgfRead(v);
  if (!r) { toast(t('paste.invalid'), 2200); return false; }
  if (r.bad) { toast(t('paste.bad'), 2500); return false; }
  openLoaded({ n: r.n, komi: r.komi, rule: r.rule, ha: r.ha }, r.start && (r.start.stones || r.start.turn === P2) ? r.start : null, r.moves);
  toast(t('paste.loaded', { n: r.moves.length }), 1800);
  return true;
}
// #g=<n>.<komi>.<rule>.<handicap>.<moves>[&n=<shown>]
function loadHashStr(h) {
  const q = new URLSearchParams(h), g = (q.get('g') || '').split('.');
  if (g.length < 5) { toast(t('paste.invalid')); return false; }
  const n = +g[0], komi = +g[1] / 2, rule = g[2] === 'c' ? 'cn' : 'jp', ha = +g[3] || 0;
  if (!(n >= 5 && n <= 19)) { toast(t('paste.invalid')); return false; }
  const list = decMoves(g.slice(4).join('.'), n), start = handicapSpec(n, ha);
  if (!list || !validMoves(start, list, n)) { toast(t('paste.invalid')); return false; }
  openLoaded({ n, komi, rule, ha }, start, list, q.has('n') ? parseInt(q.get('n'), 10) : undefined);
  toast(t('paste.loaded', { n: list.length }), 1800);
  return true;
}
function loadFromHash() {
  const h = location.hash.slice(1); if (!h || !/(^|&)g=/.test(h)) return false;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  return loadHashStr(h);
}
window.addEventListener('hashchange', () => { if (/[#&]g=/.test(location.hash)) loadFromHash(); });
$('#btnShare').onclick = async () => {
  if (!moves.length || lesson || puzzle || (startSpec && !game.ha)) { toast(t('nokifu')); return; }
  const url = location.origin + location.pathname + '#g=' + [game.n, Math.round(game.komi * 2), game.rule === 'cn' ? 'c' : 'j', game.ha || 0, encMoves(moves)].join('.') + (cur < moves.length ? '&n=' + cur : '');
  try {
    if (navigator.share && COARSE) { await navigator.share({ title: t('meta.title'), url }); return; }
    await navigator.clipboard.writeText(url); toast(t('share.copied'), 1400);
  } catch (e) { if (e && e.name === 'AbortError') return; toast(url, 4000); }
};
$('#btnPaste').onclick = () => { $('#pasteText').value = ''; showOverlay('#pasteOverlay'); setTimeout(() => $('#pasteText').focus(), 50); };
$('#pasteCancel').onclick = () => hideOverlay('#pasteOverlay');
$('#pasteOk').onclick = () => { const v = $('#pasteText').value; if (!v.trim()) { toast(t('nokifu')); return; } loadText(v); };
$('#pasteFile').onclick = () => $('#pasteInput').click();
$('#pasteInput').onchange = e => { const f = e.target.files && e.target.files[0]; if (!f) return; f.text().then(txt => { $('#pasteText').value = txt; loadText(txt); }); e.target.value = ''; };
$('#pasteText').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('#pasteOk').click(); } else if (e.key === 'Escape') hideOverlay('#pasteOverlay'); });
$('#optCoord').addEventListener('change', e => { $('#optCoordAll').disabled = !e.target.checked; });
