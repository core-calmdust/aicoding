'use strict';
// Game of the Amazons (Argentina, 1988) — page script, built on the Kōnane page (same structure as Nine Men's Morris, the
// site's reference page): board + side panel, AI (20 steps) in a Web Worker, rated games vs the AI (予備選), post-game review
// with a coach, share / paste. A move has two parts: an amazon moves like a chess queen, then shoots an arrow like a queen
// from where it landed; the arrow's square is blocked for good. Whoever cannot move loses.
// ====================================================================== rules (shared with the engine)
const E = window.AmazonsEngine, WIN = E.WIN, WINT = E.WINT;
const P1 = 1, P2 = 2;                 // P1 = White (moves first), P2 = Black
const RULE_ORDER = E.RULE_ORDER;
const mFrom = E.mFrom, mTo = E.mTo, mArrow = E.mArrow;
const NS_ = () => E.N, NN_ = () => E.NN;
let gv = 'std';
let HB = null;                        // PC header bar (shared/headerbar.js)
let startSpec = null;                 // a start position (null = the normal starting position)
let moves = [];                       // game record (move numbers, see engine.js)
let cur = 0;                          // number of moves shown
let flip = false;                     // board seen from Black's side (Black at the bottom)
function setVariant() { gv = 'std'; settings.rule = gv; anaCache.clear(); document.documentElement.style.setProperty('--S', E.N); }
const startKey = () => gv + ':' + (startSpec ? startSpec.b + '/' + startSpec.side + '/' + (startSpec.n == null ? '' : startSpec.n) : '');
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
  if (manualEnd && !kenSw && manualEnd.n === moves.length && i === moves.length && !lesson && !puzzle && settings.mode !== 'online') return manualEnd;
  if (rgame && rgame.over && !kenSw && i === moves.length && !lesson && !puzzle) return rgame.over;
  return E.judge(posAt(i).pos);
}
const toMoveAt = i => posAt(i).pos.turn;
// move name in standard notation "d1-d7/g7" (the amazon's move, then where the arrow lands)
function mvAt(i) { return E.name(posAt(i).pos, moves[i]); }
function mvIn(pos, m) { return E.name(pos, m); }
const isPass = m => m < 0;
// the amazons of the side to move that can move at all
function movers(pos) { const out = [], p = pos.turn; for (let k = 0; k < 8; k++) { const f = pos.q[k]; if (f < 0 || pos.sq[f] !== p) continue; if (E.NB[f].some(x => !pos.sq[x])) out.push(f); } return out; }

// ====================================================================== state
const STORE = 'aicoding-amazons';
const settings = { mode: 'ai', rule: 'std', color: 1, level: 6, level2: 6, anim: true, sound: true, hint: false, eval: true, last: true, threat: true, num: true, coach: true, lang: '', bd: 'temple', pcs: 'cameo' };
const SUPPORTED = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
function detectLang() { const n = (navigator.language || 'ja').toLowerCase(); if (/^zh-(tw|hk|mo|hant)/.test(n)) return 'zh-TW'; return ['ja', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'].find(c => n.startsWith(c)) || 'en'; }
let LANG = detectLang();
const AIW = () => ({ ru: 'ИИ', tr: 'YZ' })[LANG] || 'AI';   // the word "AI" in displayed player labels (ru / tr use their own abbreviation; saved records keep 'AI')
function t(k, v) { let x = (I18N[LANG] || I18N.en)[k]; if (x === undefined) x = I18N.en[k]; if (x === undefined) x = I18N.ja[k]; if (x === undefined) return k; if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; }
const pname = p => t(p === P1 ? 'p1' : 'p2');
// AI strength: 20 steps, Lv.1 … Lv.20
const LV_MAX = 23;   // (Lv.21〜23: the top levels on every thread)
const LV = i => 'Lv.' + i;   // levels 1 … 20 (kyu / dan names are kept for the Japanese games: shogi, go, gomoku)
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
let sel = null;          // human input in progress: { from, to (-1 until chosen), cands: [moves of that amazon] }

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
const ENGINE_URL = 'engine.js?v=8';
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
// search speed of the last search on several threads (nodes per second, all threads), shown quietly at the end of the info line
let lastNps = 0;
const npsText = () => lastNps ? '  ·  ' + (lastNps >= 1e6 ? (lastNps / 1e6).toFixed(1) + 'M' : Math.round(lastNps / 1e3) + 'k') + ' nps' : '';
function noteNps(nodes, ms) {
  if (!(nodes > 20000 && ms > 20)) return;
  lastNps = nodes / ms * 1000;
  const el = document.getElementById('infoLine'); if (el && el.dataset.base !== undefined) el.textContent = el.dataset.base + npsText();
}
let aiW = makeWorker(), anaW = makeWorker();
// multi-threaded search (shared/mtsplit.js; common rule「本編のマルチスレッド」): several plain workers of this engine share the
// root moves and the main line (Young Brothers Wait). Analysis, hints, the coach, the review box and the levels that think by
// time (Lv.19〜23, rated games too) go to the threads when they are free; the levels decided by evaluations stay on one thread.
// Shared mode: on a cross-origin isolated page (sw.js) the workers share one transposition table (shared/mttt.js).
if (window.MTSplit) MTSplit.init({ sw: 'sw.js?v=1' });
const MTP = window.MTSplit ? MTSplit.use({ url: ENGINE_URL, drive: MTSplit.ladder.drive }) : null;
const mtLevel = lv => { const L = E.LEVELS[lv]; return !!(L && L.s && L.ms && !L.nk); };   // a level that thinks by time
// The MCTS on several threads (2026-11-10, claude/amazons-spec.md「MCTS」): Lv.19〜23 (mc in LEVELS; rated games, the coach's deeper
// pass and PRO's MCTS too) grow ONE tree on every thread (tree-parallel with virtual loss): core_mt.wasm on a shared memory,
// the lead engine.js?…&mt=1, the helpers mt-helper.js (shared/mtengine.js; only on an isolated page). Without it: one thread.
const MCP = window.MTEngine && MTEngine.use ? MTEngine.use({ wasm: 'core_mt.wasm?v=2', lead: ENGINE_URL + '&mt=1', helper: 'mt-helper.js?v=1', slot: 2 << 20, initial: 1024, maximum: 16384,   // maximum = core_mt.wasm's (1 GiB)
  imports: mem => ({ env: { memory: mem, now: () => Date.now() } }), help: m => m.type === 'think' ? {} : null }) : null;
const mcJob = msg => msg.type === 'think' && (msg.cfg ? !!(msg.cfg.s && msg.cfg.mc) : !!(E.LEVELS[msg.level] || {}).mc);
// the MCTS's default thread count (2026-11-10): the performance cores (shared/mtengine.js perfThreads — 10 of the user's M4 Pro's
// 14; ProSet.defThreads, the other games' timed levels, #1299) for the levels, rated games, the coach's deeper pass and PRO's
// default. The tree search's evaluations per second grew on to 10 threads there (x7.5) and hardly past them (x7.9 on 14).
const mcThreads = () => MCP && MTEngine.on() ? (window.ProSet ? ProSet.defThreads() : Math.max(1, Math.min(1 + MTEngine.maxHelpers(), MTEngine.perfThreads()))) : 1;
function mtWants(which, msg) {
  if (msg.type === 'analyze' || msg.type === 'cands') return true;
  if (msg.type !== 'think') return false;
  if (msg.cfg) return !!msg.cfg.s && msg.cfg.threads > 1;   // PRO: its own thread count with any limit of the search (not the weak steps' root values)
  return mtLevel(msg.level) || (which === 'ana' && msg.level === 19);   // (rated games too: the user's decision 2026-11-08; 19 = COACH_DEEP, the coach's deeper pass)
}
function request(which, msg, onProgress) {
  const mc = mcJob(msg);
  // a top level (Lv.21〜) right after the page has opened: wait up to 4 s for the threads rather than start on one
  if ((mc ? MCP && MTEngine.on() : MTP && MTSplit.on()) && which === 'ai' && msg.type === 'think' && msg.level > 20 && !msg.waited) {
    const P = mc ? MCP : MTP;
    return (async () => { const t0 = Date.now(); while (!P.pool('ai') && Date.now() - t0 < 4000) await new Promise(r => setTimeout(r, 100)); return request(which, Object.assign({}, msg, { waited: 1 }), onProgress); })();
  }
  if (mc) {   // the MCTS: its own pool of threads (PRO: with more than one thread), else the one-thread worker
    const mp = MCP && (!msg.cfg || msg.cfg.threads > 1) && MCP.pool(which === 'ai' ? 'ai' : null);
    if (mp) { const t0 = performance.now(), full = { start: startSpec, rule: gv, ...msg, mtThreads: msg.cfg ? msg.cfg.threads : mcThreads() }; return mp.run(full, onProgress, which).then(r => { if (r) noteNps(r.nodes, performance.now() - t0); return r === undefined ? requestW(which, full, onProgress) : r; }); }
    return requestW(which, msg, onProgress);
  }
  const mp = MTP && mtWants(which, msg) && MTP.pool(which === 'ai' ? 'ai' : null);
  if (mp) { const t0 = performance.now(), full = { start: startSpec, rule: gv, ...msg, ...(msg.cfg ? { mtThreads: msg.cfg.threads } : {}) }; return mp.run(full, onProgress, which).then(r => { if (r) noteNps(r.nodes, performance.now() - t0); return r === undefined ? requestW(which, full, onProgress) : r; }); }
  return requestW(which, msg, onProgress);
}
function requestW(which, msg, onProgress) {   // (the one-thread workers)
  const w = which === 'ai' ? aiW : anaW;
  return new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve, onProgress }); w.postMessage({ start: startSpec, rule: gv, ...msg, id }); });
}
function cancelWorker(which) {
  if (MTP) MTP.cancel(which);
  if (MCP) MCP.cancel(which);
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
function sShoot(delay) { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000; noise(a, t0, 0.16, 0.22, 1800, 0.7, 'bandpass'); tone(a, t0, 900, 520, 0.14, 0.035, 'sine'); }
function sThunk(delay) { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000; tone(a, t0, 220, 90, 0.16, 0.3); noise(a, t0, 0.04, 0.32, 1400, 1.2); }

// ====================================================================== DOM / board
const $ = s => document.querySelector(s);
const boardEl = $('#board'), piecesEl = $('#pieces'), fxEl = $('#fx'), linesEl = $('#lines');
const reduceMotion = false /* site rule: animations are never skipped for the OS reduce-motion setting */;
const animOn = () => settings.anim && !reduceMotion;
// display row / column of a square (Black's side at the bottom unless flipped)
const dRC = i => { const [r, c] = E.RC[i], n = NS_() - 1; return flip ? [n - r, n - c] : [r, c]; };
const ptX = i => (dRC(i)[1] + 0.5) / NS_() * 100, ptY = i => (dRC(i)[0] + 0.5) / NS_() * 100;
function placeAt(el, i) { el.style.left = ptX(i) + '%'; el.style.top = ptY(i) + '%'; }
// the board itself is a baked texture per design (tools/gen_boards.py, html[data-bd]); the SVG layer carries the coordinates only:
// files a… in the bottom row's corners, ranks 1… in the left column's corners (the chess way)
function drawLines() {
  const N = NS_(); document.documentElement.style.setProperty('--S', N);
  let s = '';
  for (let k = 0; k < N; k++) {
    s += `<text class="num" x="${k + 0.93}" y="${N - 0.07}" font-size="0.2" text-anchor="end">${'abcdefghij'[flip ? N - 1 - k : k]}</text>`;
    s += `<text class="num" x="0.06" y="${k + 0.24}" font-size="0.2">${flip ? k + 1 : N - k}</text>`;
  }
  linesEl.setAttribute('viewBox', `0 0 ${N} ${N}`);
  linesEl.innerHTML = s;
  boardEl.classList.toggle('no-num', !settings.num);
}
function setFlip(f) { if (f === flip) return; flip = f; drawLines(); syncPieces(posAt(cur).pos, true); }
const flipFor = () => flipAuto() !== !!(window.FlipBtn && FlipBtn.on());   // + the 盤面反転 button (shared/flipbtn.js)
function flipAuto() {   // the player's side at the bottom: the board turns round for White
  if (puzzle) return puzzle.me === P2;
  if (lesson) return lesson.me === P2;
  if (settings.mode === 'online' && window.olMyColor) return olMyColor() === P2;
  if (settings.mode === 'ai') return humanColor === P2;
  return false;
}
const pcEls = new Map();      // square -> element (the amazons and the arrows)
let shownKey = '';
// a fire arrow. In flight (.fly): the SVG, turned along its line — a leaf-shaped iron head with its ridge, a wooden shaft, silk
// bindings, three barred feathers, the flame (.fire) wrapped behind the head. Stuck in its square: the picture of the 3D arrow
// (.ai, img/arw.webp, tools/pieces3d.html set=arrow) leaning out of the scorch; the newest arrows keep burning (.blaze: .fl3)
const ARROW_SVG = '<i class="ai"></i><svg class="fl3" viewBox="0 0 40 40"><defs><radialGradient id="amzFl" cx=".5" cy=".85" r=".75"><stop offset="0" stop-color="#fffbe0"/><stop offset=".28" stop-color="#ffd658"/><stop offset=".6" stop-color="#ff7a18" stop-opacity=".92"/><stop offset="1" stop-color="#e33a06" stop-opacity="0"/></radialGradient></defs><path class="t t1" d="M20 38C12.5 37 10.5 29.5 13.5 24C15.5 20.5 15.5 15.5 18 8.5C19 14.5 24 18 26 23.5C28 30 26.5 37 20 38Z" fill="url(#amzFl)"/><path class="t t2" d="M20 38C12.5 37 10.5 29.5 13.5 24C15.5 20.5 15.5 15.5 18 8.5C19 14.5 24 18 26 23.5C28 30 26.5 37 20 38Z" fill="url(#amzFl)"/><path class="t t3" d="M20 38C12.5 37 10.5 29.5 13.5 24C15.5 20.5 15.5 15.5 18 8.5C19 14.5 24 18 26 23.5C28 30 26.5 37 20 38Z" fill="url(#amzFl)"/></svg><svg viewBox="0 0 40 40"><defs><linearGradient id="amzSh" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#5a3a20"/><stop offset=".5" stop-color="#a8774a"/><stop offset="1" stop-color="#6a4426"/></linearGradient><linearGradient id="amzHd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9dde2"/><stop offset=".5" stop-color="#7d838b"/><stop offset="1" stop-color="#3a3e44"/></linearGradient></defs>' +
  '<path class="fe" d="M3.2 36.8 1 31.6 4.2 30.4 6.6 33.4ZM3.2 36.8 8.4 39 9.6 35.8 6.6 33.4Z" fill="#efe4c8" stroke="#6a4a2c" stroke-width=".35"/><path d="M2.2 33.9 4.6 33M5 36.8 5.9 34.5M2.9 31.7 4.9 31.1M7.2 38.3 7.9 36.3" stroke="#5a3a20" stroke-width=".9"/>' +
  '<line x1="4" y1="36" x2="29" y2="11" stroke="url(#amzSh)" stroke-width="2.2" stroke-linecap="round"/><path d="M8.6 30.6 10.2 32.2M7.2 32 8.8 33.6" stroke="#9a2a1e" stroke-width="1.1"/>' +
  '<g class="fire"><path d="M31 9c3 4-1 10-15 17 4-6 3-12 8-16 2-2 5-2 7-1z" fill="#ff6a14" opacity=".88"/><path d="M29.6 10.4c1.5 3-1 6.5-9 11 3-4 2.5-8 5.5-10.5 1.2-1 2.6-1.2 3.5-.5z" fill="#ffc24a"/><ellipse cx="27.6" cy="12.6" rx="1.7" ry="1.3" fill="#fff4cc"/></g>' +
  '<path d="M35.5 4.5 27 8.2 26.4 13.6 31.8 13Z" fill="url(#amzHd)" stroke="#2a2d31" stroke-width=".4"/><path d="M35.5 4.5 29.1 10.9" stroke="#f2f4f6" stroke-width=".6" opacity=".8"/></svg>';
function newPiece(kind) {     // kind: 1 White amazon (P1), 3 Black amazon (P2), 5 an arrow
  const el = document.createElement('div');
  if (kind === 5) { el.className = 'arw'; el.innerHTML = ARROW_SVG; el.style.setProperty('--sd', (-Math.random() * 6.5).toFixed(2) + 's'); }   // (each smoke on its own beat)
  else { el.className = 'pc p' + (kind <= 2 ? 1 : 2); el.innerHTML = '<i class="orn"></i>'; }
  el.dataset.k = kind; return el;
}
// every burnt square keeps burning for the rest of the game (2026-11-10 user: where nothing can pass must read at a glance)
function markFires() {
  for (const [, el] of pcEls) if (el.classList.contains('arw')) el.classList.add('blaze');
}
function syncPieces(pos, force) {
  for (const [i, el] of pcEls) if (force || pos.at(i) !== +el.dataset.k) { el.remove(); pcEls.delete(i); }
  for (let i = 0; i < NN_(); i++) { const k = pos.at(i); if (k && !pcEls.has(i)) { const el = newPiece(k); placeAt(el, i); piecesEl.appendChild(el); pcEls.set(i, el); } }
  for (const [i, el] of pcEls) { placeAt(el, i); el.getAnimations && el.getAnimations().forEach(a => a.cancel()); el.classList.remove('sel', 'dim', 'mov', 'ghost', 'away', 'fly'); el.style.opacity = ''; }
  markFires();
}
// the amazon slides (longer for a longer line), a short pause, then the arrow flies from its new square
const sqDist = (a, b) => { const [r0, c0] = E.RC[a], [r1, c1] = E.RC[b]; return Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0)); };
const qDur = m => Math.min(520, 200 + 40 * sqDist(mFrom(m), mTo(m))), aDur = m => Math.min(420, 150 + 32 * sqDist(mTo(m), mArrow(m)));
const SHOOT_GAP = 70;
function moveDur(m) {
  if (!animOn() || isPass(m)) return 60;
  return qDur(m) + SHOOT_GAP + aDur(m) + 60;
}
// animate move m from position `before` (the pieces map shows `before`)
function animateMove(m, before) {
  if (isPass(m)) return true;
  const f = mFrom(m), tq = mTo(m), a = mArrow(m), el = pcEls.get(f);
  if (!el || pcEls.has(a) && a !== f) return false;
  const u = boardEl.offsetWidth / NS_();   // (the board's own size: a CSS transform on it — the 3D skin's lean — changes its box, not its squares)
  const pt = i => { const [r, c] = dRC(i); return [(c + 0.5) * u, (r + 0.5) * u]; };
  const [fx, fy] = pt(f), [tx, ty] = pt(tq), [ax, ay] = pt(a);
  pcEls.delete(f); placeAt(el, tq); pcEls.set(tq, el);
  el.classList.remove('sel', 'ghost', 'away'); el.style.zIndex = 5;
  const qd = qDur(m), ad = aDur(m);
  if (el.animate) el.animate([{ transform: `translate(${fx - tx}px,${fy - ty}px)` }, { transform: `translate(${(fx - tx) * .08}px,${(fy - ty) * .08 - u * .06}px)`, offset: .82 }, { transform: 'none' }], { duration: qd, easing: 'cubic-bezier(.35,.6,.35,1)' });
  sHop(0); sPlace(false, qd - 30);
  // the arrow: shot from the amazon's new square, turned to its flight; it lands and burns the square
  const ar = newPiece(5); placeAt(ar, a); ar.classList.add('fly'); piecesEl.appendChild(ar); pcEls.set(a, ar);
  const sv = ar.querySelector('svg:not(.fl3)'), ang = Math.atan2(ay - ty, ax - tx) * 180 / Math.PI + 45;
  sv.style.transform = `rotate(${ang}deg)`;
  const land = () => {   // it strikes: the flame dies down, the scorch mark glows and cools (CSS .burn / .hot)
    ar.classList.remove('fly'); sv.style.transform = ''; ar.classList.add('burn', 'hot');
    setTimeout(() => ar.classList.remove('burn'), 650); setTimeout(() => ar.classList.remove('hot'), 4500);
    markFires();
  };
  if (ar.animate) {
    const t0 = qd + SHOOT_GAP;
    const an = ar.animate([{ transform: `translate(${tx - ax}px,${ty - ay}px) scale(.75)`, opacity: 1 }, { transform: 'none', opacity: 1 }], { duration: ad, delay: t0, easing: 'cubic-bezier(.45,.05,.7,1)', fill: 'backwards' });
    an.onfinish = land;
    fireFx(tx, ty, ax, ay, u, boardEl.offsetWidth, t0, ad);
  } else land();
  sShoot(qd + SHOOT_GAP); sThunk(qd + SHOOT_GAP + ad - 20);
  setTimeout(() => { el.style.zIndex = ''; }, moveDur(m));
  return true;
}
// sparks shed along the flight (they drift back and down, and die), then a flash and a burst of sparks where the arrow strikes.
// Throwaway elements on the pieces layer (positions in % of the board), removed when their animation ends.
function fireFx(tx, ty, ax, ay, u, W, t0, ad) {
  const fx = (x, y, cls) => { const e = document.createElement('div'); e.className = cls; e.style.left = (x / W * 100) + '%'; e.style.top = (y / W * 100) + '%'; piecesEl.appendChild(e); return e; };
  const done = (e, an) => { an.onfinish = () => e.remove(); an.oncancel = () => e.remove(); };
  const L = Math.hypot(ax - tx, ay - ty) || 1, ux = (ax - tx) / L, uy = (ay - ty) / L;
  const n = Math.min(18, 5 + Math.round(L / u * 2));
  for (let k = 0; k < n; k++) {
    const p = (k + Math.random() * 0.6) / n, e = fx(tx + (ax - tx) * p, ty + (ay - ty) * p, 'spark');
    const dx = (-ux * 0.25 + (Math.random() - 0.5) * 0.35) * u, dy = (-uy * 0.25 + 0.18 + Math.random() * 0.25) * u, s = 0.6 + Math.random() * 0.8;
    done(e, e.animate([{ transform: `scale(${s})`, opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(${s * 0.3})`, opacity: 0 }], { duration: 380 + Math.random() * 260, delay: t0 + p * ad * 0.92, easing: 'ease-out', fill: 'backwards' }));
  }
  const hit = t0 + ad - 15, fl = fx(ax, ay, 'flare');
  done(fl, fl.animate([{ transform: 'scale(.15)', opacity: 0 }, { transform: 'scale(.55)', opacity: 1, offset: 0.18 }, { transform: 'scale(1.05)', opacity: 0 }], { duration: 460, delay: hit, easing: 'ease-out', fill: 'backwards' }));
  for (let k = 0; k < 9; k++) {
    const g = Math.PI * 2 * (k + Math.random() * 0.7) / 9, r = (0.35 + Math.random() * 0.4) * u, e = fx(ax, ay, 'spark');
    done(e, e.animate([{ transform: 'scale(1.2)', opacity: 1 }, { transform: `translate(${Math.cos(g) * r}px,${Math.sin(g) * r + u * 0.12}px) scale(.3)`, opacity: 0 }], { duration: 420 + Math.random() * 240, delay: hit, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'backwards' }));
  }
}
// above / below the board: each side's territory (the empty squares its amazons reach first) and how many squares its amazons
// can move to now (0 on its turn = lost)
function renderReserves(pos) {
  const st = statusAt(cur), T = pos.terr();
  for (const p of [P1, P2]) {
    const bottom = flip ? P2 : P1, el = $(p === bottom ? '#res1' : '#res2');
    const terr = p === P1 ? T.a : T.b, mob = pos.mobility(p), tm = !st.over && pos.turn === p;
    let s = `<span class="rsv-l"><i class="pdisc p${p}"></i>${t('rsv.terr', { n: `<b>${terr}</b>` })}</span>`;
    s += `<span class="rsv-w${mob === 0 ? ' hot' : mob <= 4 && tm ? ' warm' : ''}" title="${escHb(t('rsv.mobT'))}">${t('rsv.mob', { n: `<b>${mob}</b>` })}</span>`;
    el.innerHTML = `<span class="rsv-plate">${s}</span>`;
    el.title = t('rsv.title', { c: pname(p), a: terr, b: mob });
    el.classList.toggle('turn', tm);
  }
}
function renderBoard(anim) {
  if (ken && !kenSw) { if (kenOk()) return kenSwap(() => renderBoard(anim)); ken = null; }
  const want = flipFor(); if (want !== flip) { flip = want; drawLines(); pcEls.forEach(el => el.remove()); pcEls.clear(); }
  const { pos } = posAt(cur), key = keyOf(cur);
  const prev = shownKey; shownKey = key;
  const m = cur > 0 ? moves[cur - 1] : -1;
  let done = false;
  if (anim && animOn() && m >= 0 && prev === keyOf(cur - 1)) {
    const before = posAt(cur - 1).pos;
    done = animateMove(m, before);
    if (done) for (let i = 0; i < NN_(); i++) if (!!pos.at(i) !== pcEls.has(i)) { done = false; break; }
  } else if (anim && m >= 0 && prev === keyOf(cur - 1)) {
    sPlace();
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
function fxSvg() { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'fxsvg'); s.setAttribute('viewBox', `0 0 ${NS_()} ${NS_()}`); fxEl.appendChild(s); return s; }
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
let ghostEl = null;   // the amazon shown on its new square while the arrow is being chosen
// a move on the board: the amazon's line and the arrow's flight (dashed)
function drawMove(svg, m, cls) { svgArrow(svg, [mFrom(m), mTo(m)], cls); svgArrow(svg, [mTo(m), mArrow(m)], (cls || '') + ' shot'); }
function renderFx() {
  if (ken && !kenSw) { if (kenOk()) return kenSwap(renderFx); ken = null; }
  fxEl.innerHTML = '';
  if (ghostEl) { ghostEl.remove(); ghostEl = null; }
  const { pos } = posAt(cur), st = statusAt(cur), m = cur > 0 ? moves[cur - 1] : -1;
  const svg = fxSvg(); $('#millfx').innerHTML = '';
  for (const [, el] of pcEls) el.classList.remove('dim', 'sel', 'mov', 'ghost', 'away');
  // last move: where the amazon came from and went, and the square the arrow burnt
  if (m >= 0 && !isPass(m) && !sel) {
    fxDiv('sqfx lastf', mFrom(m)); fxDiv('sqfx last', mTo(m)); fxDiv('sqfx lasta', mArrow(m));
    if (settings.last) svgArrow(svg, [mTo(m), mArrow(m)], 'shot');
  }
  if (st.over && st.winner) for (const [i, el] of pcEls) { const k = pos.at(i); if ((k === 1 || k === 3) && (k === 1 ? P1 : P2) !== st.winner) el.classList.add('dim'); }
  const canPlay = canHumanPlay();
  // (option) the amazons that can move glow softly
  if (settings.threat && canPlay && !st.over && !sel && !puzzle && !(lesson && !lesson.study)) for (const f of movers(pos)) { const el = pcEls.get(f); if (el) el.classList.add('mov'); }
  if (sel) {
    const el = pcEls.get(sel.from);
    if (sel.to < 0) {   // 1: where the amazon may go
      if (el) el.classList.add('sel');
      for (const tq of new Set(sel.cands.map(mTo))) fxDiv('dest', tq);
      if (hoverTo >= 0 && sel.cands.some(c => mTo(c) === hoverTo)) svgArrow(svg, [sel.from, hoverTo], 'pl');
    } else {            // 2: the amazon stands on its new square; where the arrow may land
      if (el) el.classList.add('away');
      ghostEl = newPiece(pos.turn === P1 ? 1 : 3); ghostEl.classList.add('ghost', 'sel'); placeAt(ghostEl, sel.to); piecesEl.appendChild(ghostEl);
      svgArrow(svg, [sel.from, sel.to], 'pl');
      for (const c of sel.cands) if (mTo(c) === sel.to) fxDiv('dest at', mArrow(c));
      if (hoverTo >= 0) svgArrow(svg, [sel.to, hoverTo], 'shot');
    }
  }
  for (const k of lessonMarks) { if (k.arrow) svgArrow(svg, k.arrow, k.cls); else fxDiv('mark ' + k.cls, k.at); }
  if (labelList) drawLabels(labelList);
  else if (!(rvbHov && BOX && BOX.shown) && !drawReviewFx(svg) && hintList && !st.over) drawHints(hintList, svg);
  rvbFx(svg, pos);
  if (window.AmazonsCoach && !labelList && !lessonMarks.length) AmazonsCoach.fx(svg, pos);
  renderPrompt();
}
// the two steps of a move are told under the board (where the amazon goes, then where the arrow flies)
function renderPrompt() {
  const el = $('#prompt'); let s = '';
  if (canHumanPlay() && sel) s = t(sel.to >= 0 ? 'pr.arrow' : 'pr.move');
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
// labels on the landing squares (the best value per square); while selecting, only the selected amazon's moves (and once it
// stands on its new square, the arrow's squares)
function hintGroups(list) {
  let L = list, key = mTo;
  if (sel) { L = list.filter(e => mFrom(e.m) === sel.from && (sel.to < 0 || mTo(e.m) === sel.to)); if (sel.to >= 0) key = mArrow; }
  const g = new Map();
  for (const e of L) { const k = key(e.m); const o = g.get(k); if (!o || e.v > o.v) g.set(k, e); }
  return g;
}
function drawHints(list, svg) {
  const g = hintGroups(list); if (!g.size) return;
  let best = -Infinity; for (const e of g.values()) best = Math.max(best, e.v);
  for (const [at, e] of g) {
    const L = valLabel(e.v), d = fxDiv('hintlbl ' + L.cls + (e.v === best ? ' best' : '') + (pcEls.has(at) ? ' on-pc' : ''), at);
    d.innerHTML = `<b>${L.big}</b>${L.small ? `<small>${L.small}</small>` : ''}`;
  }
  if (!sel) { let bm = null; for (const e of list) if (!bm || e.v > bm.v) bm = e; if (bm) drawMove(svg, bm.m, 'ok'); }
}
function drawLabels(list) { for (const L of list) { const d = fxDiv('hintlbl ' + L.cls + (pcEls.has(L.at) ? ' on-pc' : ''), L.at); d.innerHTML = `<b>${L.big}</b>${L.small ? `<small>${L.small}</small>` : ''}`; } }

// evaluation (Black's view): {s in [-1,1], kind, side, n}
function sOfV(v) { return v > WINT ? 0.9 + 0.1 * Math.min(1, 6 / (WIN - v + 1)) : v < -WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (WIN + v + 1))) : v > WINT - 1000 ? 0.88 : v < -(WINT - 1000) ? -0.88 : Math.tanh(v / 1500) * 0.82; }
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
  if (settings.mode === 'watch') return `${AIW()} ${LV(levelFor(p))}${proTag(levelFor(p))}`;
  if (rgame) return p === humanColor ? t('you') + ' · R' + rgame.my : `${AIW()} ${rtLvName(rgame.lv)} · R${rgame.or}`;
  return p === humanColor ? t('you') : `${AIW()} ${LV(settings.level)}${proTag(settings.level)}`;
}
let thinking = 0, animating = false;
function renderInfo() {
  const { pos } = posAt(cur), st = statusAt(cur), tm = pos.turn, T = pos.terr();
  for (const p of [P1, P2]) {
    $('#count' + p).textContent = p === P1 ? T.a : T.b;
    $('#hand' + p).textContent = t('pcs', { m: pos.mobility(p) });
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
  if (window.AmazonsCoach) AmazonsCoach.render();
}
// PC header bar: whose turn, each side's territory and freedom, arrows shot, evaluation (when shown), move number
const escHb = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function hbInfo(pos, st) {
  if (!HB || !HB.on) return;
  const tm = pos.turn, T = pos.terr();
  let h = `<span class="hb-chip"><i class="pdisc p${st.over ? (st.winner || tm) : tm}"></i><b>${escHb(st.over ? (st.winner ? t('hb.won', { c: pname(st.winner) }) : t('res.draw')) : t('hb.turn', { c: pname(tm) }))}</b></span>`;
  for (const p of [P1, P2]) h += `<span class="hb-chip cnt" title="${escHb(t('rsv.title', { c: pname(p), a: p === P1 ? T.a : T.b, b: pos.mobility(p) }))}"><i class="pdisc p${p}"></i><b>${p === P1 ? T.a : T.b}</b><small>${escHb(t('hb.mob', { n: pos.mobility(p) }))}</small></span>`;
  if (puzzle) h += `<span class="hb-chip">${escHb(PZBook.t('movesLeft', { n: Math.max(0, puzzle.n - puzzle.used) }))}</span>`;
  h += `<span class="hb-chip opt">${escHb(t('hb.arrows', { n: pos.arrows() }))}</span>`;
  const evOn = settings.eval && !lesson && !puzzle && !rtLive() && !(window.olLive && olLive());
  if (evOn && $('#evalText').textContent && $('#evalText').textContent !== '—') h += `<span class="hb-chip opt">${escHb(t('eval'))} <b>${escHb($('#evalText').textContent)}</b></span>`;
  h += `<span class="hb-chip opt">${escHb(t('info.moves', { n: cur }))}</span>`;
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

// ====================================================================== input (three taps: an amazon, the square it moves to, the square the arrow flies to)
function squareAt(clientX, clientY) {
  const N = NS_();
  // (the portal's 3D skin leans the board with a CSS perspective: the box no longer maps to the squares — it asks the 3D view)
  if (typeof window.boardPick === 'function') { const rc = window.boardPick(clientX, clientY); if (rc) { let [rr, c] = rc; if (c < 0 || c >= N || rr < 0 || rr >= N) return -1; if (flip) { c = N - 1 - c; rr = N - 1 - rr; } return E.sqAt(rr, c); } }
  const r = boardEl.getBoundingClientRect(), u = r.width / N;
  let c = Math.floor((clientX - r.left) / u), rr = Math.floor((clientY - r.top) / u);
  if (c < 0 || c >= N || rr < 0 || rr >= N) return -1;
  if (flip) { c = N - 1 - c; rr = N - 1 - rr; }
  return E.sqAt(rr, c);
}
let hoverEl = null, hoverTo = -1;
function setHover(i) {
  if (ken && !kenSw && kenOk()) return kenSwap(() => setHover(i));
  if (hoverEl) { hoverEl.remove(); hoverEl = null; }
  const prev = hoverTo; hoverTo = -1;
  if (i < 0 || !canHumanPlay() || !sel) { if (prev >= 0) renderFx(); return; }
  const ok = sel.to < 0 ? sel.cands.some(c => mTo(c) === i) : sel.cands.some(c => mTo(c) === sel.to && mArrow(c) === i);
  if (!ok) { if (prev >= 0) renderFx(); return; }
  const { pos } = posAt(cur);
  hoverTo = i;
  hoverEl = newPiece(sel.to < 0 ? (pos.turn === P1 ? 1 : 3) : 5); hoverEl.classList.add('hov'); placeAt(hoverEl, i); piecesEl.appendChild(hoverEl);
  if (prev !== i) renderFx();
}
boardEl.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') setHover(squareAt(e.clientX, e.clientY)); });
boardEl.addEventListener('pointerleave', () => setHover(-1));
boardEl.addEventListener('click', e => { const i = squareAt(e.clientX, e.clientY); setHover(-1); onSquare(i); });
function cancelSel() { if (!sel) return; sel = null; renderFx(); }
// tap one of your amazons, then the square it moves to (a queen's line), then the square the arrow flies to (a queen's line
// from there). Tapping the amazon on its new square takes the second step back; another amazon starts over.
function onSquare(i) {
  ctx();
  if (ken && !kenSw && kenOk()) { kenSwap(() => onSquare(i)); kenFlush(); return; }
  if (!canHumanPlay()) { if (reviewing && !lesson && !puzzle) rsOpen(); return; }
  const { pos } = posAt(cur), me = pos.turn;
  if (i < 0) { cancelSel(); return; }
  if (sel && sel.to >= 0) {   // 2: the arrow
    const m = sel.cands.find(x => mTo(x) === sel.to && mArrow(x) === i);
    if (m !== undefined) { commit(m); return; }
    if (i === sel.to) { sel.to = -1; playTick(); renderFx(); return; }   // the amazon again: choose another square for it
    if (pos.owner(i) === me && i !== sel.from) { pickAmazon(i); return; }
    toast(t('cant.arrow')); return;
  }
  if (pos.owner(i) === me) { if (sel && sel.from === i) { cancelSel(); return; } pickAmazon(i); return; }
  if (!sel) { toast(t('pick.own')); return; }
  if (sel.cands.some(x => mTo(x) === i)) { sel.to = i; setHover(-1); playTick(); renderFx(); return; }   // 1: where the amazon goes
  if (pos.at(i)) { cancelSel(); return; }
  toast(t('cant.move'));
}
function pickAmazon(i) {
  const c = posAt(cur).pos.moves().filter(m => mFrom(m) === i);
  if (!c.length) { toast(t('cant.stuck')); return; }
  sel = { from: i, to: -1, cands: c }; playTick(); renderFx();
}
function commit(m) {
  sel = null; setHover(-1);
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
  const res = await request('ai', { type: 'think', moves: shown, level: levelFor(p), cfg: proCfg(levelFor(p)) || rtCap(levelFor(p)) });
  if (!res || tok !== busyToken) { if (tok === busyToken) { thinking = 0; renderInfo(); } return; }
  const prevDur = cur > 0 ? moveDur(moves[cur - 1], posAt(cur - 1).pos) : 0;
  const wait = (settings.mode === 'watch' ? Math.max(700, prevDur + 120) : animating ? prevDur : 0) - (Date.now() - t0);   // AIの着手は即時：前の手のアニメが終わるのを待つだけ（観戦だけ間を取る）
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
  const coachOn = !!(window.AmazonsCoach && AmazonsCoach.active());
  if (!settings.eval && !settings.hint && !coachOn) return;
  const mover = toMoveAt(idx);
  const apply = list => {
    if (keyOf(idx) !== key || !list) return;
    if (window.AmazonsCoach) AmazonsCoach.cands(key, list);
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
const COACH_DEEP = 19;   // engine LEVELS: 1.5 s of the MCTS (on the MCTS threads when they are there)
async function coachDeep(idx, key, apply) {
  const list = anaCache.get(key);
  if (!list || !list.length || list.deep || !(window.AmazonsCoach && AmazonsCoach.active() && (settings.mode === 'pvp' || toMoveAt(idx) === humanColor))) return;
  const r = await request('ana', { type: 'think', moves: moves.slice(0, idx), level: COACH_DEEP });
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
$('#btnLesson').onclick = () => openLessons();
$('#btnPuzzle').onclick = () => openPuzzles();
$('#btnHint').onclick = () => {
  if (rtLive()) { toast(t('rt.noEval')); return; }
  settings.hint = !settings.hint; save();
  if (!settings.hint) { hintList = null; renderFx(); renderInfo(); }
  else { const k = keyOf(cur); if (anaCache.has(k)) { hintList = anaCache.get(k); renderFx(); } else analyzeCurrent(busyToken); renderInfo(); }
};
$('#btnSound').onclick = () => { settings.sound = !settings.sound; try { localStorage.setItem('atlas-sfx', settings.sound ? '1' : '0'); } catch (e) {} save(); renderInfo(); if (settings.sound) playTick(); };
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

// ---------------------------------------------------------------- 2D board designs and amazon sets (CSS: html[data-bd] / html[data-pcs]; mini boards: BD_PAL)
// Boards (tools/gen_boards.py): the temple of Themiscyra (Carrara and verde antico marble, gold inlay; the default), jungle ruins,
// the Amazonomachy vase (clay and black glaze), navy and ivory lacquer (modern). Amazons: medallions on stands
// rendered from 3D models (tools/pieces3d.html + render_pieces.js): marble cameos (the default), ancient coins, vase paintings,
// modern enamel. (The sculpted 3D figures belong to the 3D board.)
const BD_KEYS = ['temple', 'ruins', 'vase', 'navy'], PC_KEYS = ['cameo', 'coin', 'vase', 'enamel'];   // temple / cameo first: the defaults
// [frame, arrow tile, arrow shaft, fletching]
const BD_PAL = {
  temple: ['#cdbf9f', '#2a1a10', '#f0cf86', '#fff6e2'],
  ruins: ['#26331f', '#241a10', '#dcbc7c', '#f4e6c4'],
  vase: ['#16110d', '#2a1208', '#e88a4e', '#f6d8b0'],
  navy: ['#18243e', '#241a12', '#e0bf7a', '#fff4dc'],
};
function designApply() {
  if (!BD_KEYS.includes(settings.bd)) settings.bd = 'temple';   // (old designs: jungle, wood, … → the new default)
  if (!PC_KEYS.includes(settings.pcs)) settings.pcs = 'cameo';
  document.documentElement.dataset.bd = settings.bd; document.documentElement.dataset.pcs = settings.pcs;
  document.documentElement.classList.toggle('no-anim', !animOn());   // (no smoke either)
}
function designSpec() { const p = E.Pos.from(null); for (const x of ['d1-d7/g7', 'd10-d8/b6']) p.play(E.parse(p, x)); return p.spec(); }
function designPickers() {
  const r1 = $('#bdRow'), r2 = $('#pcRow'); if (!r1 || !r2) return;
  const sp = designSpec();
  r1.innerHTML = BD_KEYS.map(k => `<button type="button" data-bd="${k}" class="${k === settings.bd ? 'sel' : ''}" aria-pressed="${k === settings.bd}">${miniSVG(sp, { cls: 'bdm', bd: k, num: false })}<span>${escHb(t('bd.' + k))}</span></button>`).join('');
  r2.innerHTML = PC_KEYS.map(k => `<button type="button" data-pcs="${k}" class="${k === settings.pcs ? 'sel' : ''}" aria-pressed="${k === settings.pcs}">${pcSwatch(k)}<span>${escHb(t('pcs.' + k))}</span></button>`).join('');
}
// an amazon-set tile: the two amazons on a patch of the current board
function pcSwatch(k) {
  const BP = BD_PAL[settings.bd] || BD_PAL.temple;
  return `<svg class="bdm" viewBox="0 0 120 120"><rect x="1" y="1" width="118" height="118" rx="10" fill="${BP[0]}"/><image href="img/bd-${settings.bd}.webp" x="8" y="8" width="104" height="104" preserveAspectRatio="xMidYMid slice"/>` +
    `<image href="img/pc-${k}-w.webp" x="8" y="18" width="58" height="58"/><image href="img/pc-${k}-b.webp" x="54" y="44" width="58" height="58"/></svg>`;
}
// spec: { b: 100 chars '.wbx', side, n } ; o: { cls, bd, pcs, marks: {sq: 'ok'|'ng'|'x'}, arrows: [[a, b], …], shots: [[a, b], …], flip, click, sel,
// dest: [], adest: [] (arrow targets), last: move (from / to / arrow highlighted), ghost: square (the moving amazon, translucent), away: square, num,
// simple: flat squares and plain pieces (the small pictures) }
const sizeOf = () => 10;
function miniSVG(spec, o) {
  o = o || {};
  const N = 10, fl = !!o.flip, P = i => { const [r, c] = E.RC[i]; return fl ? [N - 1 - r, N - 1 - c] : [r, c]; };
  const u = 24, pad = 8, W = 240 + pad * 2, X = i => pad + (P(i)[1] + 0.5) * u, Y = i => pad + (P(i)[0] + 0.5) * u;
  const bdk = o.bd || settings.bd, BP = BD_PAL[bdk] || BD_PAL.temple, pk = o.pcs || settings.pcs;
  let s = `<svg class="${o.cls || 'mini'}" viewBox="0 0 ${W} ${W}">`;
  if (o.simple) {   // the small pictures of lessons / puzzles / rules (2026-11-10): flat squares, plain discs, plain arrows — easy to read
    s += `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" rx="8" fill="#4a5a4e"/><rect x="${pad}" y="${pad}" width="240" height="240" fill="#f1ece0"/>`;
    for (let i = 0; i < N * N; i++) { const [r, c] = E.RC[i]; if ((r + c) % 2) s += `<rect x="${pad + c * u}" y="${pad + r * u}" width="${u}" height="${u}" fill="#86a38d"/>`; }
  } else s += `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" rx="8" fill="${BP[0]}"/><image href="img/bd-${bdk}.webp" x="${pad}" y="${pad}" width="240" height="240" preserveAspectRatio="none"/>`;
  const sqr = (i, fill, extra) => `<rect x="${X(i) - u / 2}" y="${Y(i) - u / 2}" width="${u}" height="${u}" fill="${fill}" ${extra || ''}/>`;
  if (o.last != null && o.last >= 0) { s += sqr(mFrom(o.last), 'rgba(214,236,134,.22)'); s += sqr(mTo(o.last), 'rgba(214,236,134,.4)'); s += sqr(mArrow(o.last), 'none', 'stroke="rgba(255,150,110,.95)" stroke-width="2.4"'); }
  for (const i of o.hl || []) s += sqr(i, 'rgba(214,236,134,.35)');
  const b = spec && spec.b ? spec.b : '';
  const amazon = (i, side, op) => o.simple ? `<circle cx="${X(i)}" cy="${Y(i)}" r="${u * .36}" fill="${side === 'w' ? '#fffdf7' : '#26262a'}" stroke="${side === 'w' ? '#3a3a3a' : '#000'}" stroke-width="1.6"${op ? ` opacity="${op}"` : ''}/><circle cx="${X(i)}" cy="${Y(i)}" r="${u * .17}" fill="none" stroke="${side === 'w' ? '#b9a77a' : '#c9a24e'}" stroke-width="1.4"${op ? ` opacity="${op}"` : ''}/>` : `<image href="img/pc-${pk}-${side}.webp" x="${(X(i) - u * 0.47).toFixed(1)}" y="${(Y(i) - u * 0.5).toFixed(1)}" width="${(u * 0.94).toFixed(1)}" height="${(u * 0.94).toFixed(1)}"${op ? ` opacity="${op}"` : ''}/>`;
  for (let i = 0; i < N * N; i++) {
    const ch = b[i]; if (!ch || ch === '.') continue;
    if (ch === 'x' && o.simple) { const x = X(i), y = Y(i), h = u * 0.4; s += `<rect x="${x - h}" y="${y - h}" width="${h * 2}" height="${h * 2}" rx="${u * .08}" fill="#5c4434"/><path d="M${x - h * .55},${y + h * .55}L${x + h * .45},${y - h * .45}M${x + h * .6},${y - h * .6}l${-h * .5},${h * .1}l${h * .4},${h * .4}z" stroke="#f2d9a4" stroke-width="${u * .07}" fill="#f2d9a4" stroke-linecap="round"/>`; continue; }
    if (ch === 'x') { const x = X(i), y = Y(i), h = u * 0.44; s += `<circle cx="${x}" cy="${y}" r="${h * 1.08}" fill="${BP[1]}" opacity=".55"/><circle cx="${x}" cy="${y}" r="${h * .78}" fill="${BP[1]}" opacity=".9"/><path d="M${x - h * .55},${y + h * .55}L${x + h * .5},${y - h * .5}" stroke="${BP[2]}" stroke-width="${u * .08}" stroke-linecap="round"/><path d="M${x + h * .7},${y - h * .7}l${-h * .55},${h * .14}l${h * .41},${h * .41}z" fill="${BP[2]}"/><path d="M${x - h * .6},${y + h * .6}l${-h * .28},${h * .05}l${h * .2},${-h * .3}z" fill="${BP[3]}"/>`; continue; }
    s += amazon(i, ch, i === o.away ? 0.3 : 0);
  }
  if (o.ghost != null && o.ghost >= 0) s += amazon(o.ghost, o.ghostSide || 'w', 0.85);
  for (const i of o.dest || []) s += `<circle cx="${X(i)}" cy="${Y(i)}" r="${Math.max(3.5, u * 0.15)}" fill="rgba(214,236,134,.95)" stroke="rgba(0,0,0,.5)" stroke-width="1"/>`;
  for (const i of o.adest || []) { const x = X(i), y = Y(i), h = Math.max(3.5, u * 0.14); s += `<path d="M${x},${y - h}L${x + h},${y}L${x},${y + h}L${x - h},${y}Z" fill="rgba(255,138,96,.95)" stroke="rgba(0,0,0,.5)" stroke-width="1"/>`; }
  if (o.sel != null && o.sel >= 0) s += `<rect x="${X(o.sel) - u / 2 + 1.5}" y="${Y(o.sel) - u / 2 + 1.5}" width="${u - 3}" height="${u - 3}" rx="3" fill="none" stroke="#e8f7a8" stroke-width="2.6"/>`;
  for (const k in o.marks || {}) {
    const v = o.marks[k], x = X(+k), y = Y(+k);
    if (v === 'x') s += `<path d="M${x - 6},${y - 6}L${x + 6},${y + 6}M${x + 6},${y - 6}L${x - 6},${y + 6}" stroke="#ff6b5b" stroke-width="3" stroke-linecap="round"/>`;
    else s += `<rect x="${x - u / 2 + 1.5}" y="${y - u / 2 + 1.5}" width="${u - 3}" height="${u - 3}" rx="3" fill="none" stroke="${v === 'ng' ? '#ff6b5b' : v === 'dash' ? 'rgba(255,255,255,.9)' : '#3df59a'}" stroke-width="2.6" ${v === 'dash' ? 'stroke-dasharray="4 3"' : ''} filter="drop-shadow(0 0 1px rgba(0,0,0,.8))"/>`;
  }
  const line = (a, dash, col) => {
    const pts = a.map(i => [X(i), Y(i)]); if (pts.length < 2) return '';
    const [ax, ay] = pts[0], [bx, by] = pts[1], L = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / L, uy = (by - ay) / L;
    const sx = ax + ux * 8, sy = ay + uy * 8, ex = bx - ux * 9, ey = by - uy * 9, h = 5.5;
    return `<path d="M${sx.toFixed(1)},${sy.toFixed(1)}L${ex.toFixed(1)},${ey.toFixed(1)}M${ex - ux * h - uy * h},${ey - uy * h + ux * h}L${ex},${ey}L${ex - ux * h + uy * h},${ey - uy * h - ux * h}" stroke="${col}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"${dash ? ' stroke-dasharray="4 3"' : ''} filter="drop-shadow(0 1px 1px rgba(0,0,0,.7))"/>`;
  };
  for (const a of o.arrows || []) s += line(a, false, '#e8f7a8');
  for (const a of o.shots || []) s += line(a, true, '#ff9a72');
  if (o.click) for (let i = 0; i < N * N; i++) s += `<rect data-p="${i}" x="${X(i) - u / 2}" y="${Y(i) - u / 2}" width="${u}" height="${u}" fill="transparent"/>`;
  if (o.zoom) {   // (simple pictures) only the part of the board that matters: every piece, mark and line, one square round them, at least 5×5
    // the marks and lines (what the step teaches) and the pieces next to them; other pieces far off are left out of the frame
    const key = []; for (const k in o.marks || {}) key.push(+k); for (const a of [...(o.arrows || []), ...(o.shots || [])]) key.push(...a);
    const pts = key.slice(), near = i => key.some(k => Math.max(Math.abs(E.RC[i][0] - E.RC[k][0]), Math.abs(E.RC[i][1] - E.RC[k][1])) <= 2);
    for (let i = 0; i < N * N; i++) if (b[i] && b[i] !== '.' && (!key.length || near(i))) pts.push(i);
    if (pts.length) {
      const rs = pts.map(i => P(i)[0]), cs = pts.map(i => P(i)[1]);
      let r0 = Math.min(...rs) - 1, r1 = Math.max(...rs) + 1, c0 = Math.min(...cs) - 1, c1 = Math.max(...cs) + 1;
      const n = Math.min(N, Math.max(5, r1 - r0 + 1, c1 - c0 + 1));
      const fit = (a0, a1) => { let a = Math.round((a0 + a1) / 2 - (n - 1) / 2); return Math.max(0, Math.min(N - n, a)); };
      r0 = fit(r0, r1); c0 = fit(c0, c1);
      if (n < N) s = s.replace(/viewBox="[^"]*"/, `viewBox="${pad + c0 * u} ${pad + r0 * u} ${n * u} ${n * u}"`);
    }
  }
  return s + '</svg>';
}
var CROP_UID = 0;
const CROP = {};
function cropOf() { return null; }
// position spec from square names: { w: ['d4', …] (White), b: [...] (Black), x: [...] (arrows), side, n }
const sqIdx = nm => E.sqIdx(nm);
function specOf(o) {
  const a = Array(100).fill('.');
  for (const q of o.x || []) a[sqIdx(q)] = 'x';
  for (const q of o.w || []) a[sqIdx(q)] = 'w'; for (const q of o.b || []) a[sqIdx(q)] = 'b';
  const sp = { b: a.join(''), side: o.side || P1 };
  if (o.n != null) sp.n = o.n;
  return sp;
}
// a row / column of arrows: 'a5-j5' → every square between (a straight line of squares)
function lineOf(a, b) { const out = [], f = sqIdx(a), t = sqIdx(b), [r0, c0] = E.RC[f], [r1, c1] = E.RC[t], dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0); let r = r0, c = c0; for (;;) { out.push(E.sqName(r * 10 + c)); if (r === r1 && c === c1) break; r += dr; c += dc; } return out; }

// ---------------------------------------------------------------- rules: hands-on tutorial on the real board (shared/ruletour.js)
// Only what is needed to play: the board and the amazons, the queen's move, the arrow (a move = both), nothing can be passed
// over, the one who cannot move loses; then territory (read only).
function tourPage(id, spec, o) {
  return {
    id, title: () => t('tr.' + id + '.t'), body: () => t('tr.' + id + '.b').split('\n').map(x => `<p>${x}</p>`).join(''),
    task: () => t('tr.' + id + '.task'),
    setup(api) {
      const pos = E.Pos.from(spec), me = pos.turn, legal = pos.moves();
      const st = { sel: -1, to: -1, last: -1, busy: false, done: false };
      const marks = () => { const m = {}; for (const q of (o.marks || [])) m[sqIdx(q)] = 'ok'; return m; };
      const draw = () => {
        if (!api.alive()) return;
        const mine = st.sel >= 0 ? legal.filter(m => mFrom(m) === st.sel) : [];
        const dest = st.sel >= 0 && st.to < 0 ? [...new Set(mine.map(mTo))] : [];
        const adest = st.to >= 0 ? mine.filter(m => mTo(m) === st.to).map(mArrow) : [];
        api.board.innerHTML = miniSVG(pos.spec(), { cls: 'tour', sel: st.to >= 0 ? st.to : st.sel, dest, adest, last: st.last, marks: st.done ? {} : marks(), arrows: !st.done && o.arrows ? o.arrows.map(a => a.map(sqIdx)) : st.to >= 0 ? [[st.sel, st.to]] : [], ghost: st.to, ghostSide: me === P1 ? 'w' : 'b', away: st.to >= 0 ? st.sel : -1, click: !st.done && !st.busy, flip: me === P2 && !o.noFlip });
      };
      function commit(m) {
        const before = pos.clone(); pos.play(m); st.sel = -1; st.to = -1; st.last = m;
        const r = o.check ? o.check(m, pos, before) : 'ok';
        sHop(); sPlace(false, 120); sShoot(220); sThunk(380);
        if (r === 'ok') { st.done = true; draw(); api.ok(t('tr.' + id + '.ok')); return; }
        st.done = true; draw(); api.ng(typeof r === 'string' ? r : t('tr.' + id + '.ng'));
      }
      function click(i) {
        if (o.moveOnly && st.sel >= 0 && st.to < 0) {   // the queen's move page: the amazon's move is the whole task
          const ok = legal.some(m => mFrom(m) === st.sel && mTo(m) === i);
          if (ok) { const r = o.check(i); sHop(); sPlace(false, 120); st.to = i; st.done = true; if (r === 'ok') { draw(); api.ok(t('tr.' + id + '.ok')); } else { draw(); api.ng(r); } return; }
        }
        if (st.to >= 0) {
          const m = legal.find(x => mFrom(x) === st.sel && mTo(x) === st.to && mArrow(x) === i);
          if (m !== undefined) { commit(m); return; }
          if (i === st.to) { st.to = -1; draw(); return; }
          api.say(t('cant.arrow'), 'ng'); return;
        }
        if (pos.owner(i) === me) {
          if (st.sel === i) { st.sel = -1; draw(); return; }
          if (!legal.some(m => mFrom(m) === i)) { api.say(t('cant.stuck'), 'ng'); return; }
          st.sel = i; playTick(); api.say(''); draw(); return;
        }
        if (st.sel < 0) { api.say(t('pick.own')); return; }
        if (legal.some(m => mFrom(m) === st.sel && mTo(m) === i)) { st.to = i; playTick(); draw(); return; }
        api.say(t('cant.move'));
      }
      api.board.onclick = e => { const el = e.target.closest('[data-p]'); if (!el || st.busy || st.done || !api.alive()) return; ctx(); click(+el.dataset.p); };
      draw();
    },
  };
}
const tourRead = (id, html) => ({ id, title: () => t('tr.' + id + '.t'), body: () => t('tr.' + id + '.b').split('\n').map(x => `<p>${x}</p>`).join(''), html });
const tourPic = (spec, o) => `<div class="tour-pic">${miniSVG(spec, Object.assign({ cls: '', simple: true }, o || {}))}</div>`;
// page 1: what the game is (history / how to win / culture), read only — common spec
const introPage = () => ({ id: 'intro', title: () => t('intro.t'), body: '', html: () => RuleTour.intro({ lang: LANG, img: '../images/atlas/amazons.webp?v=1', origin: t('intro.origin'), players: t('intro.players'), time: t('intro.time'), history: t('intro.hist'), win: t('intro.win'), culture: t('intro.cult') }) });
const TERR_SPEC = specOf({ w: ['b3', 'h2'], b: ['c8', 'h9'], x: lineOf('a6', 'j6'), side: P1 });   // a wall of arrows: White's room 48 squares, Black's 38
const TOUR_PAGES = [
  introPage(),
  // the board: 10×10, four amazons each; White moves first
  tourRead('board', () => tourPic(E.Pos.from(null).spec(), { marks: Object.fromEntries(['a4', 'd1', 'g1', 'j4', 'a7', 'd10', 'g10', 'j7'].map(q => [sqIdx(q), 'ok'])) })),
  // the amazon moves like a chess queen: any distance, straight or diagonal
  tourPage('queen', specOf({ w: ['d4'], b: ['a10'], side: P1 }), { moveOnly: true, marks: ['h8'], check: to => to === sqIdx('h8') ? 'ok' : t('tr.queen.ng') }),
  // then it shoots an arrow (like a queen again, from where it landed); a move is both
  tourPage('arrow', specOf({ w: ['c3'], b: ['h8'], side: P1 }), { marks: ['c7'], check: m => mTo(m) === sqIdx('c7') ? 'ok' : t('tr.arrow.ng') }),
  // nothing passes over an arrow or an amazon (the amazon nor the arrow)
  tourPage('block', specOf({ w: ['b2'], b: ['j10'], x: ['b5', 'e2'], side: P1 }), { marks: ['b4'], check: m => mTo(m) === sqIdx('b4') ? 'ok' : t('tr.block.ng') }),
  // the goal: leave the opponent without a move (here: Black's last amazon has one way out)
  tourPage('win', specOf({ w: ['h1', 'h9'], b: ['a1'], x: ['a2', 'b2'], side: P1 }), { check: (m, pos) => !pos.canMove(P2) ? 'ok' : t('tr.win.ng') }),
  // territory: once the board is cut into rooms, the bigger room wins (read only)
  tourRead('terr', () => tourPic(TERR_SPEC, {})),
];
const TOUR_VARS = 0;
let TOUR = null;
function tourFor() {
  if (TOUR) return TOUR;
  const el = document.createElement('div'); el.className = 'tour-mount'; $('#rulesBody').appendChild(el);
  return (TOUR = RuleTour.create({
    mount: el, store: STORE + '-rules', lang: () => LANG, pages: TOUR_PAGES,
    close: () => closeRules(),
    play: () => { closeRules(); openNewDialog(); },
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
  $('#fRules').classList.add('hidden');   // one rule only: no ゲーム tab (shared/ngtabs.js shows it only for games with variants)
  $('#ruleCards').innerHTML = RULE_ORDER.map(r => `<button type="button" class="ngt-gcard${draft.rule === r ? ' sel' : ''}" data-r="${r}"><span class="gart">${miniSVG(ruleStart(r), { cls: 'gmini' })}</span><b>${t('rule.' + r)}</b><p><span class="gtag">${t('rule.tagStd')}</span>${t('rule.' + r + '.d')}</p><span class="gpick"></span></button>`).join('');
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
  $('#optEval').checked = settings.eval; $('#optLast').checked = settings.last; $('#optAnim').checked = settings.anim; $('#optThreat').checked = settings.threat; $('#optNum').checked = settings.num;
  if (window.ResumeNG) { if (resume) ResumeNG.open({ modes: ['ai', 'pvp', 'watch'], hide: '#fRules' }); else ResumeNG.close(); }
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
// the ルール button on every card (shared/ngtabs.js): the tutorial, or the board-size page
$('#ruleCards').onclick = e => { const b = e.target.closest('.ngt-gcard'); if (b) { draft.rule = b.dataset.r; segSync(); } };
$('#ruleCards').ngtRules = () => openRules(null, 0);
function ruleStart() { return E.Pos.from(null).spec(); }
$('#segColor').onclick = e => { const b = e.target.closest('button'); if (b) { draft.color = +b.dataset.v; segSync(); } };
$('#levelRange').oninput = e => { draft.level = +e.target.value; segSync(); };
// PRO mode (shared/proset.js; common rule「対局設定の Pro モード」): advanced settings for the AI beside the level — vs the AI /
// AI vs AI, never rated. ProSet.ladder() turns the changed values into a step of this engine's ladder (engine.js think: cfg).
const PRO_L = window.ProSet ? ProSet.ladder(E.LEVELS, { dmax: 20, nmax: 20000000 }) : null;
// the search: MCTS (the default of Lv.19〜23) or alpha-beta (Lv.9〜18); a depth limit is always the alpha-beta search
const PRO_ALGO = { key: 'algo', type: 'choice', group: 'read', when: e => e.limit && e.limit.k !== 'depth',
  label: { ja: '探索の方式', en: 'Search', zh: '搜索方式', 'zh-TW': '搜尋方式', ko: '탐색 방식', es: 'Búsqueda', fr: 'Recherche', pt: 'Busca', de: 'Suche', ru: 'Поиск', tr: 'Arama', id: 'Pencarian', hi: 'खोज का तरीका', ar: 'طريقة البحث' },
  help: { ja: 'MCTS は有望な手を深く読み、αβ は候補をそろえて読みます。同じ時間では MCTS のほうが強めです。', en: 'MCTS reads the promising moves deeper; alpha-beta reads the candidates evenly. In the same time MCTS is stronger.', zh: 'MCTS 深入计算有希望的着法，αβ 均匀地计算候选。同样时间下 MCTS 更强。', 'zh-TW': 'MCTS 深入計算有希望的著法，αβ 均勻地計算候選。同樣時間下 MCTS 較強。', ko: 'MCTS는 유망한 수를 깊이 읽고, αβ는 후보를 고르게 읽습니다. 같은 시간이면 MCTS가 더 강합니다.', es: 'MCTS lee más hondo las jugadas prometedoras; alfa-beta lee los candidatos por igual. Con el mismo tiempo, MCTS es más fuerte.', fr: 'MCTS lit plus loin les coups prometteurs ; alpha-bêta lit les candidats de façon égale. À temps égal, MCTS est plus fort.', pt: 'MCTS lê mais fundo os lances promissores; alfa-beta lê os candidatos por igual. No mesmo tempo, MCTS é mais forte.', de: 'MCTS liest vielversprechende Züge tiefer, Alpha-Beta liest die Kandidaten gleichmäßig. Bei gleicher Zeit ist MCTS stärker.', ru: 'MCTS глубже считает перспективные ходы, альфа-бета — все кандидаты поровну. За то же время MCTS сильнее.', tr: 'MCTS umut veren hamleleri daha derin okur, alfa-beta adayları eşit okur. Aynı sürede MCTS daha güçlüdür.', id: 'MCTS membaca langkah yang menjanjikan lebih dalam; alfa-beta membaca kandidat secara merata. Dalam waktu sama MCTS lebih kuat.', hi: 'MCTS आशाजनक चालें गहराई से पढ़ता है, αβ सभी उम्मीदवार बराबर पढ़ता है। उतने ही समय में MCTS ज़्यादा मज़बूत है।', ar: 'يقرأ MCTS النقلات الواعدة أعمق، ويقرأ ألفا-بيتا المرشحات بالتساوي. في الوقت نفسه يكون MCTS أقوى.' },
  opts: [{ v: 'mc', label: { ja: 'MCTS', en: 'MCTS', zh: 'MCTS', 'zh-TW': 'MCTS', ko: 'MCTS', es: 'MCTS', fr: 'MCTS', pt: 'MCTS', de: 'MCTS', ru: 'MCTS', tr: 'MCTS', id: 'MCTS', hi: 'MCTS', ar: 'MCTS' } },
    { v: 'ab', label: { ja: 'αβ', en: 'Alpha-beta', zh: 'αβ', 'zh-TW': 'αβ', ko: 'αβ', es: 'Alfa-beta', fr: 'Alpha-bêta', pt: 'Alfa-beta', de: 'Alpha-Beta', ru: 'Альфа-бета', tr: 'Alfa-beta', id: 'Alfa-beta', hi: 'αβ', ar: 'ألفا-بيتا' } }] };
var PRO = PRO_L ? ProSet.init({ game: 'amazons', lang: () => LANG, level: () => draft.level || settings.level, show: () => draft.mode === 'ai' || draft.mode === 'watch',
  store: { get: () => settings.pro, set: v => { settings.pro = v; } },
  // threads (本編のマルチスレッド, shared/mtsplit.js): with any limit of the search; the default is the levels' own count for the
  // levels that think by time, else one
  defaults: lv => Object.assign(PRO_L.defaults(lv), MTP ? { threads: !mtLevel(lv) ? 1 : (E.LEVELS[lv] || {}).mc ? ProSet.defThreads() : Math.min(ProSet.maxThreads(), MTSplit.autoThreads()) } : {}, { algo: (E.LEVELS[lv] || {}).mc ? 'mc' : 'ab' }),   // (threads: the levels' own count — the MCTS levels (Lv.19〜23) the performance cores (mcThreads), the alpha-beta ones min(cores − 1, 7) + 1: on the user's Mac 14 threads were slower than 8, 2026-11-09)
  params: (MTP ? [PRO_L.params[0], { key: 'threads' }].concat(PRO_L.params.slice(1)) : PRO_L.params).concat([PRO_ALGO]) }) : null;
// a rated game (5 min + 3 s): the timed top levels (Lv.21〜) never think longer than the clock allows — about a twentieth of the
// time left plus most of the increment (on every thread, as without the cap)
function rtCap(lv) {
  const L = E.LEVELS[lv]; if (!rgame || lv <= 20 || !L || !L.ms) return null;
  const left = rtClockLeft(toMoveAt(moves.length) - 1), ms = Math.min(L.ms, Math.max(800, left / 20 + RT_CLOCK.inc * 0.8));
  return ms >= L.ms ? null : Object.assign({}, L, { ms, threads: L.mc ? mcThreads() : MTP && MTSplit.on() ? 1 + MTSplit.helpers() : 1 });
}
function proCfg(lv) {
  if (!PRO || rgame || !(settings.mode === 'ai' || settings.mode === 'watch')) return null;
  const e = PRO.get(lv); if (!e) return null;
  const c = Object.assign(PRO_L.cfg(e, lv), MTP ? { threads: e.threads || 1 } : {});
  if (e.algo === 'mc' && c.s && !c.dx) c.mc = 1;   // (the MCTS with a time or evaluation limit)
  return c;
}
function proTag(lv) { return proCfg(lv) ? ' PRO' : ''; }
$('#levelRange2').oninput = e => { draft.level2 = +e.target.value; segSync(); };
$('#btnCancelNew').onclick = () => hideOverlay('#newOverlay');
$('#btnStart').onclick = () => {
  if (draft.mode === 'online') return;   // handled by online-ui.js
  hideOverlay('#newOverlay');
  if (draft.mode === 'lesson') { openLessons(); return; }
  if (draft.mode === 'puzzle') { openPuzzles(); return; }
  Object.assign(settings, { eval: $('#optEval').checked, last: $('#optLast').checked, anim: $('#optAnim').checked, threat: $('#optThreat').checked, num: $('#optNum').checked });
  document.documentElement.classList.toggle('no-anim', !animOn());
  if (draft.mode === 'rated') { rtStart(draft.rule); return; }
  if (draft.resume) { resumeWith(); return; }
  exitSpecial();
  Object.assign(settings, { mode: draft.mode, color: draft.color, level: draft.level, level2: draft.level2 });
  setVariant(draft.rule); drawLines();
  newGame();
};

// ====================================================================== rated games vs the AI (solo)
const RT_STORE = STORE + '-rated', RT_START = 1000, RT_CLOCK = { base: 300000, inc: 3000 };
// rating of each AI step (a first estimate from short matches of neighbouring levels on the work machine; to be measured on the
// user's Mac): about +110 per step at the bottom, smaller at the top
const RT_LV = [0, 350, 460, 570, 680, 790, 900, 1000, 1100, 1200, 1300, 1390, 1480, 1560, 1640, 1710, 1780, 1840, 1900, 2170, 2240, 2300, 2350, 2390];   // (Lv.19〜23 = the MCTS since 2026-11-10: the alpha-beta values +200, provisional — in the same CPU time it beat the alpha-beta search 82.5% at 0.5 s and 15 of 16 at 1.5 s; to be measured on the user's Mac)
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

// ====================================================================== lessons (20 points per problem, 75 to pass; tools/gen_lessons.js → lessons.json)
// Every right answer was computed from the rules (no engine opinion). Each step opens with a warm-up ramp (考え方 → 例題, not scored).
// Texts are i18n keys (i18n-am-ls.js): ls.<step>.*, rp.<ramp>.*, ru.*, course.*.
let LESSONS = null, introIdx = 0, openChoiceIdx = -1;
const lessonsReady = fetch('lessons.json?v=1').then(r => r.json()).then(d => (LESSONS = d)).catch(() => null);
const LS_STORE = STORE + '-lessons';
function lsProgress() { try { return JSON.parse(localStorage.getItem(LS_STORE) || '{}') || {}; } catch (e) { return {}; } }
const LL = o => !o ? '' : typeof o === 'string' ? t(o) : (o[LANG] !== undefined ? o[LANG] : o.en !== undefined ? o.en : o.ja);
let savedGame = null;
function stashGame() { if (!lesson && !puzzle) savedGame = { moves, cur, evals: evals.slice(), humanColor }; }
function exitSpecial() {
  if (!lesson && !puzzle) return;
  lesson = null; puzzle = null; lessonMarks = []; labelList = null; sel = null;
  document.body.classList.remove('in-lesson', 'in-puzzle');
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false;
  startSpec = null;
  if (savedGame) { moves = savedGame.moves; cur = savedGame.cur; evals = savedGame.evals; humanColor = savedGame.humanColor; savedGame = null; }
  else { moves = []; cur = 0; evals = []; }
  reviewing = cur !== moves.length; hintList = null;
  gameOverShown = gameOver(moves.length);
}
function quitSpecial() { exitSpecial(); update(false); afterPosition(); }
function showLessonView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); if (v === 'lessonDoneView') { const q = $('#btnLessonQuit2'); q.dataset.i18n = 'ls.toList'; q.textContent = t('ls.toList'); } }
const LS_ICON = {
  basics: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="#2f6b46"/><path d="M7 17 17 7" stroke="#d6ec86" stroke-width="2.2" stroke-linecap="round"/><path d="M17 7l-5 1 4 4z" fill="#d6ec86"/><circle cx="7" cy="17" r="3" fill="#f2ead8" stroke="#6b5d44"/></svg>',
  strategy: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3" fill="#2f6b46"/><path d="M3 12h7M14 12h7M12 3v7M12 14v7" stroke="#e08a5a" stroke-width="2.6"/><circle cx="7" cy="7" r="2.6" fill="#f2ead8"/><circle cx="17" cy="17" r="2.6" fill="#2a2420" stroke="#000"/></svg>',
};
const lsIcon = k => `<span class="ic sv">${LS_ICON[k] || '●'}</span>`;
const plainText = html => String(html || '').replace(/<br\s*\/?>|<\/p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const lxBar = (p, cls) => `<span class="lx-bar ${cls || ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span>`;
const lxSt = r => r ? (r.clear ? `<span class="lx-st ok">✓ ${t('ls.clear')} ${t('u.pt', { n: r.best })}</span>` : `<span class="lx-st">${t('u.pt', { n: r.best })}</span>`) : `<span class="lx-st new">${t('ls.notyet')}</span>`;
const MK_CLS = { s_escape: 'ng' };
// the picture of a step: its warm-up's first position (with its marks and the idea drawn), else the first problem
function stepPic(s, cls) {
  const R = s.ramp && s.ramp[0];
  if (R) {
    const o = { cls, marks: {}, arrows: [], shots: [], simple: true, zoom: true };
    for (const [q, c] of R.marks || []) o.marks[q - 1] = c;
    let p = E.Pos.from(R.s); for (const nm of R.seq || []) { const m = rampByName(p, nm); if (m === undefined) break; o.arrows.push([mFrom(m), mTo(m)]); o.shots.push([mTo(m), mArrow(m)]); p = p.clone().play(m); }
    return miniSVG(R.s, o);
  }
  const P = s.problems[0]; return P ? miniSVG(P.s, { cls, simple: true, zoom: true }) : '';
}
const lsCourseSel = {};
const cOf = s => s.course || 'basics';
async function openLessons(v, course) {
  const d = await lessonsReady; selTab('lesson');
  if (!d) { toast(t('ls.fail')); return; }
  $('#btnLessonStart').classList.remove('hidden');
  $('#lsListTitle').textContent = t('ls.title'); $('#lsListDesc').textContent = t('ls.desc');
  const pr = lsProgress(), courses = [...new Set(LESSONS.steps.map(cOf))];
  const stat = c => { const st = LESSONS.steps.filter(s => cOf(s) === c); return { n: st.length, ok: st.filter(s => { const r = pr[s.id]; return r && r.clear; }).length }; };
  if (course) lsCourseSel.c = course;
  let c = lsCourseSel.c;
  if (!courses.includes(c)) c = lsCourseSel.c = courses.find(k => { const q = stat(k); return q.ok < q.n; }) || courses[0];
  const q = stat(c);
  const cards = LESSONS.steps.map((s, i) => {
    if (cOf(s) !== c) return '';
    const r = pr[s.id];
    return `<button class="lx-card${r && r.clear ? ' clear' : ''}" data-i="${i}"><span class="lx-th">${stepPic(s, 'lxb')}</span><span class="lx-tx">` +
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
  const tb = e.target.closest('[data-course]'); if (tb) { openLessons(null, tb.dataset.course); return; }
  const b = e.target.closest('.lx-card[data-i]'); if (b) openIntro(+b.dataset.i);
};
function stepNo(i) { const c = cOf(LESSONS.steps[i]); let n = 0; for (let k = 0; k <= i; k++) if (cOf(LESSONS.steps[k]) === c) n++; return n; }
function openIntro(i) {
  introIdx = i; $('#btnLessonStart').classList.remove('hidden'); const s = LESSONS.steps[i];
  $('#liStep').textContent = t('course.' + cOf(s)) + ' · STEP ' + stepNo(i);
  $('#liTitle').textContent = t('ls.' + s.id + '.title');
  $('#liBody').innerHTML = stepPic(s, 'mini') + t('ls.' + s.id + '.intro');
  showLessonView('lessonIntroView');
}
$('#btnLessonBack').onclick = () => openLessons(null, LESSONS.steps[introIdx] && cOf(LESSONS.steps[introIdx]));
$('#btnLessonClose').onclick = () => hideOverlay('#lessonOverlay');
$('#btnLessonStart').onclick = () => startLesson(introIdx);
function lsReveal(sel) { const el = $('#lessonList').querySelector(sel); if (el) el.scrollIntoView({ block: 'center' }); }
$('#btnLessonQuit2').onclick = async () => {
  const L = lesson; quitSpecial();
  const st = L && LESSONS.steps[L.step]; await openLessons(null, st && cOf(st)); if (L) lsReveal(`[data-i="${L.step}"]`);
};
$('#btnLessonRetry').onclick = () => startLesson(lesson ? lesson.step : introIdx);
$('#btnLessonNextStep').onclick = () => { const n = (lesson ? lesson.step : introIdx) + 1; if (n < LESSONS.steps.length) openIntro(n); else { hideOverlay('#lessonOverlay'); quitSpecial(); } };
function enterSpecial(spec) {
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false; if (typeof stopPlay === 'function') stopPlay();
  startSpec = spec;
  moves = []; cur = 0; reviewing = false; hintList = null; lessonMarks = []; labelList = null; evals = []; sel = null;
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
// ---- warm-up ramp: explain = a position with the idea drawn (the queen's line, then the arrow's flight) and marks; try = a guided move
//      (any move in ok is right; hints go idea → where to look → the answer)
const RU = (k, v) => t('ru.' + k, v);
const rampItem = () => lesson.ramp[lesson.ri];
const rampByName = (pos, s) => pos.moves().find(m => E.name(pos, m) === s);
function moveMarks(m, cls) { return [{ arrow: [mFrom(m), mTo(m)], cls }, { arrow: [mTo(m), mArrow(m)], cls: cls + ' shot' }, { at: mArrow(m), cls }]; }
function rampMarks(it) {
  const out = [];
  if (it.seq) { let p = E.Pos.from(it.s); it.seq.forEach((nm, k) => { const m = rampByName(p, nm); if (m === undefined) return; out.push(...moveMarks(m, k % 2 ? 'ng' : 'ok')); p = p.clone().play(m); }); }
  for (const [q, c] of it.marks || []) out.push({ at: q - 1, cls: c });
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
  const it = rampItem(), n = lesson.ramp.length, last = lesson.ri + 1 >= n;
  $('#lsStep').textContent = RU('step', { i: lesson.ri + 1, n });
  $('#lsTitle').textContent = t('ls.' + curStep().id + '.title');
  const skip = `<button type="button" class="ls-skip" style="margin-top:6px;font-size:12px;background:none;border:0;color:var(--dim);text-decoration:underline;cursor:pointer;padding:0">${RU('skip')} »</button>`;
  $('#lsPrompt').innerHTML = it.k === 'explain'
    ? `<div class="ls-goal"><span>💡</span><span><b>${LL(it.t)}</b></span></div><div class="ls-explain">${LL(it.body)}</div>${skip}`
    : `<div class="ls-goal"><span class="pdisc p${lesson.me}"></span><span>${t('ls.turn', { c: pname(lesson.me) })} ${LL(it.g)}</span></div>${skip}`;
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
  const pos = E.Pos.from(it.s), best = rampByName(pos, it.ok[0]);
  if (lesson.rh === 1) { $('#lsFb').innerHTML = LL(it.h); lessonMarks = []; }
  else if (lesson.rh === 2) { $('#lsFb').innerHTML = LL(it.h) + '<br>' + RU('look'); lessonMarks = (it.look || []).map(q => ({ at: q - 1, cls: 'ok' })); }
  else { $('#lsFb').innerHTML = RU('ans', { m: it.ok[0] }); lessonMarks = best === undefined ? [] : moveMarks(best, 'ok'); }
  sel = null; renderFx();
}
function rampMove(m) {
  const L = lesson, it = rampItem(), ri = L.ri, pos0 = posAt(0).pos;
  if (L.answered) return;
  L.answered = true;
  const good = it.ok.includes(E.name(pos0, m));
  $('#lsFb').innerHTML = good ? `<b class="ok">✓</b> ${LL(it.y)}` : `<b class="ng">✗</b> ${RU('ng')}`;
  L.rok = good; playChime(good); lessonMarks = []; playMove2(m); renderLessonCard();
  if (good) return;
  const tok = busyToken;
  setTimeout(() => {
    if (lesson !== L || !L.ramp || L.ri !== ri || tok !== busyToken) return;
    moves = []; cur = 0; sel = null; L.answered = false; update(false); renderLessonCard();
  }, moveDur(m, pos0) + 1100);
}
const curStep = () => LESSONS.steps[lesson.step];
function lessonProblem() { return curStep().problems[lesson.i]; }
function problemMarks(P) { const c = MK_CLS[curStep().id] || 'ok'; return (P.mk || []).map(at => ({ at, cls: c })); }
function loadLessonProblem() {
  const P = lessonProblem();
  lesson.me = P.s.side;
  enterSpecial(P.s);
  lesson.answered = false; lesson.hinted = false;
  lessonMarks = problemMarks(P);
  update(false); renderLessonCard();
  $('#lsFb').innerHTML = '';
}
function renderLessonCard() {
  if (!lesson) return;
  if (lesson.ramp) return renderRampCard();
  const s = curStep(), n = s.problems.length, P = lessonProblem();
  $('#lsStep').textContent = t('ls.stepq', { s: stepNo(lesson.step), i: lesson.i + 1, n });
  $('#lsTitle').textContent = t('ls.' + s.id + '.title');
  const me = P.s.side;
  $('#lsPrompt').innerHTML = `<div class="ls-goal"><span class="pdisc p${me}"></span><span>${t('ls.turn', { c: pname(me) })} ${t('ls.' + s.id + '.goal')}</span></div>`;
  $('#lsHint').textContent = t('ls.hint');
  $('#lsDots').innerHTML = s.problems.map((_, i) => { const r = lesson.results[i]; return `<i class="${r === undefined ? '' : r >= 16 ? 'ok' : r >= 10 ? 'mid' : 'ng'} ${i === lesson.i ? 'cur' : ''}"></i>`; }).join('');
  $('#lsNext').textContent = lesson.i + 1 < n ? t('ls.next') : t('ls.result');
  $('#lsNext').disabled = !lesson.answered;
  $('#lsHint').disabled = lesson.answered;
}
function playMove2(m) { moves = moves.slice(0, cur); moves.push(m); cur = moves.length; hintList = null; sel = null; update(true); }
// a solved problem moves on by itself after a short success beat (shared/cardbar.js; any tap cancels it); the last one keeps 結果
function lsAuto(good, ms) {
  const L = lesson; if (!good || !L || !window.CardBar || !CardBar.autoNext) return;
  const i = L.i; if (i + 1 >= curStep().problems.length) return;
  CardBar.autoNext({ ms: Math.max(1300, ms || 0), ok: () => lesson === L && L.i === i && L.answered });
}
function lessonAnswer(m) {
  if (lesson.ramp) return rampMove(m);
  const P = lessonProblem(), s = curStep(), pos0 = posAt(0).pos;
  lesson.answered = true;
  const pts = P.ok.includes(m) ? 20 : 0;
  lesson.results[lesson.i] = pts; renderLessonCard();
  const best = pts ? m : P.best;
  $('#lsFb').innerHTML = `<span class="pts ${pts ? 'ok' : 'ng'}">+${t('u.pt', { n: pts })}</span> <b class="${pts ? 'ok' : 'ng'}">${t(pts ? 'fb.perfect' : 'fb.bad')}</b> ` + (pts ? t('ls.' + s.id + '.why', { m: mvIn(pos0, m) }) : t('ls.' + s.id + '.ng', { m: mvIn(pos0, best), x: mvIn(pos0, m) }));
  playChime(!!pts); lessonMarks = []; playMove2(m);
  lsAuto(!!pts, moveDur(m, pos0) + 1100);
  const tok = busyToken, L = lesson;
  setTimeout(() => {
    if (lesson !== L || tok !== busyToken) return;
    // back to the problem: the answer (gold) and, if it was wrong, your move (red)
    moves = []; cur = 0; sel = null; lessonMarks = moveMarks(best, 'ok'); if (!pts) lessonMarks.push(...moveMarks(m, 'ng'));
    update(false);
  }, moveDur(m, pos0) + 900);
}
$('#lsHint').onclick = () => {
  if (lesson && lesson.ramp) { rampHint(); return; }
  if (!lesson || lesson.answered) return;
  lesson.hinted = true;
  const s = curStep(), P = lessonProblem();
  lessonMarks = problemMarks(P);
  for (const f of new Set(P.ok.map(mFrom))) lessonMarks.push({ at: f, cls: 'ok' });
  $('#lsFb').innerHTML = t('ls.' + s.id + '.hint');
  sel = null; renderFx();
};
$('#lsNext').onclick = () => {
  if (lesson && lesson.ramp) { if (!(rampItem().k === 'explain' || lesson.rok)) return; if (lesson.ri + 1 < lesson.ramp.length) { lesson.ri++; loadRamp(); } else rampDone(); return; }
  if (!lesson || !lesson.answered) return;
  const s = curStep();
  if (lesson.i + 1 < s.problems.length) { lesson.i++; loadLessonProblem(); return; }
  const n = lesson.results.reduce((a, b) => a + b, 0), pass = n >= 75;
  const score = `<div class="ld-score ${pass ? 'ok' : 'ng'}">${t('u.pt', { n })}<small> / ${s.problems.length * 20}</small></div>` + lesson.results.map((x, k) => `${k + 1}: ${t('u.pt', { n: x })}`).join('　') + (pass ? '' : `<br>${t('ls.needPass')}`);
  const pr = lsProgress(), old = pr[s.id] || { best: 0, clear: false };
  pr[s.id] = { best: Math.max(old.best, n), clear: old.clear || pass };
  try { localStorage.setItem(LS_STORE, JSON.stringify(pr)); } catch (e) {}
  $('#ldTitle').textContent = t(pass ? 'ls.passed' : 'ls.failed');
  $('#ldSub').innerHTML = score;
  $('#btnLessonNextStep').classList.toggle('hidden', lesson.step + 1 >= LESSONS.steps.length);
  const nx = LESSONS.steps[lesson.step + 1];
  if (pass && cOf(s) === 'basics' && !(nx && cOf(nx) === 'basics')) $('#ldSub').innerHTML += `<p class="ls-grad">${t('course.graduate')}</p>`;
  showLessonView('lessonDoneView'); showOverlay('#lessonOverlay');
  if (pass) confetti();
};
$('#lsQuit').onclick = () => quitSpecial();
$('#lsList').onclick = () => { if (!lesson) return; openLessons(null, cOf(curStep())); };
// ====================================================================== puzzles (PZBook v2; tools/gen_puzzles.js → puzzles.json, exact answers)
// Themes (version 2, 2026-11-11): w2 / w3 leave the opponent without a move within N of your moves (the opponent defends as
// stubbornly as it can), t2 box in the marked amazon within 2 (it runs), e3 an endgame read to the end (engine.js solveWin).
let PUZZLES = null, pzLevel = 0;
const puzzlesReady = fetch('puzzles.json?v=2').then(r => r.json()).then(d => (PUZZLES = d)).catch(() => null);
const PZ_STORE = STORE + '-puzzles2';   // (2026-11-11: the puzzles were renewed — version 2; the first day's records stay under -puzzles)
function pzProgress() { try { return JSON.parse(localStorage.getItem(PZ_STORE) || '{}') || {}; } catch (e) { return {}; } }
const pzKey = (id, j) => id + '-' + j;
const starVal = x => x === true ? 3 : (+x || 0);
function pzRecs(T, pr) { pr = pr || pzProgress(); return T.puzzles.map((_, j) => starVal(pr[pzKey(T.id, j)])); }
function themeTier(T) { return { w2: 2, t2: 2, w3: 3, e3: 3 }[T.id] || 1; }
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
const PZ_LAST = STORE + '-pz-last', PZ_TAB = STORE + '-pz-tab', PZ_GRPS = ['Win', 'Tac', 'End'], PZ_GIC = { Win: 'crown', Tac: 'target', End: 'grid' };
const PZ_TSVG = { t2: '<rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="3"/>', e3: '<path d="M4 4h16v16H4zM12 4v16M4 12h16"/>' };
const pzBadge = T => PZ_TSVG[T.id] ? `<svg viewBox="0 0 24 24" aria-hidden="true">${PZ_TSVG[T.id]}</svg>` : `<b class="gl">${(T.id.match(/\d+$/) || [''])[0]}</b>`;
const pzThumbSVG = (T, j, P) => miniSVG(P.s, { cls: 'lxb', simple: true, flip: P.s.side === P2, marks: P.e !== undefined ? { [P.e]: 'ng' } : {} });
function pzThumbOf(T, j) { if (j < 0) j = T.puzzles.length - 1; const P = T.puzzles[j]; return P && P.s ? { board: pzThumbSVG(T, j, P), tm: `<span class="pdisc p${P.s.side === P2 ? 2 : 1}"></span>` } : { board: '' }; }
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
    daily: dl ? [{ key: '1', board: pzThumbOf(Ts[dl.L], dl.j).board, title: '★ ' + t('daily.title'), date: dl.date.slice(5).replace('-', '/'), done: di.today, go: t('daily.go'),
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
  $('#pzGrid').querySelectorAll('.pb-tile[data-j]').forEach(el => { const P = L.puzzles[+el.dataset.j]; if (P && P.s) el.insertAdjacentHTML('afterbegin', `<span class="th">${pzThumbSVG(L, +el.dataset.j, P)}</span>`); });
  showPzView('pzGridView'); showOverlay('#puzzleOverlay');
}
$('#pzGrid').onclick = e => {
  const b = e.target.closest('button[data-j]'); if (!b) return;
  if (b.getAttribute('aria-disabled')) { toast(PZBook.t('locked')); return; }
  startPuzzle(pzLevel, +b.dataset.j);
};
$('#pzBack').onclick = () => openPuzzles();
$('#pzClose').onclick = () => hideOverlay('#puzzleOverlay');
// the marked amazon of a trap, followed through its moves (its index in pos.q stays the same)
const pzTarget = Pz => { if (Pz.P.e === undefined) return -1; if (Pz.tk === undefined) Pz.tk = E.trapIdx(Pz.P.s, Pz.P.e); return Pz.tk < 0 ? -1 : posAt(cur).pos.q[Pz.tk]; };
const pzMarks = Pz => { const at = pzTarget(Pz); return at >= 0 ? [{ at, cls: 'ng' }] : []; };
function startPuzzle(L, j, daily) {
  hideOverlay('#puzzleOverlay');
  stashGame(); lesson = null; document.body.classList.remove('in-lesson');
  const T = PUZZLES.themes[L], P = T.puzzles[j];
  if (!daily) PZBook.lastSet(PZ_LAST, L);
  PZBook.setLang(LANG);
  const me = P.s.side === P2 ? P2 : P1;
  puzzle = { L, j, P, rk: pzKey(T.id, j), T, kind: T.kind, me, n: P.n, state: 'play', busy: false, used: 0, daily: daily || null, hinted: false, failed: false, answered: false };
  document.body.classList.add('in-puzzle');
  enterSpecial(Object.assign({}, P.s));
  lessonMarks = pzMarks(puzzle);
  update(false); renderPuzzleCard(); pzStatus(t('pz.start'));
}
const pzTitle = Pz => Pz.kind === 'duel' ? t('pz.winIn', { n: Pz.n }) : t('pz.th.' + Pz.T.id);
function renderPuzzleCard() {
  const Pz = puzzle; if (!Pz) return; const L = Pz.T;
  $('#pzStep').textContent = Pz.daily ? `★ ${t('daily.title')} · ${Pz.daily.slice(5).replace('-', '/')}` : `${t('pz.th.' + L.id)} · ${PZBook.t('stage', { n: Math.floor(Pz.j / PZBook.STAGE) + 1 })} · No.${Pz.j + 1}`;
  $('#pzTitle').textContent = pzTitle(Pz);
  $('#pzGoal').innerHTML = `<span class="pdisc p${Pz.me}"></span><span>${t(Pz.kind === 'duel' ? 'pz.goal' : 'pz.goal.' + Pz.kind, { c: pname(Pz.me), n: Pz.n })}</span>`;
  $('#pzDots').innerHTML = Array.from({ length: Pz.n }, (_, i) => `<i class="${i < Pz.used ? 'ok' : ''} ${i === Pz.used && Pz.state === 'play' ? 'cur' : ''}"></i>`).join('');
  $('#pzNext').disabled = !!Pz.daily || Pz.j + 1 >= L.puzzles.length || !PZBook.isOpen(pzRecs(L), Pz.j + 1);
  $('#pzHint').disabled = Pz.state !== 'play'; $('#pzAnswer').disabled = Pz.busy;
  renderInfo();
}
function pzStatus(html) { $('#pzStatus').innerHTML = html; }
// the moves of the puzzle side that still reach the goal from the shown position (engine.js pzGood: exact)
function goodReq(Pz) { return request('ai', { type: 'pzgood', kind: Pz.kind, n: Pz.n - Pz.used, e: Pz.P.e, moves: moves.slice(0, cur) }).then(r => r && r.list ? r.list : null); }
function replyReq(n, Pz) { return request('ai', { type: 'duelReply', kind: Pz && Pz.kind, e: Pz && Pz.P.e, moves: moves.slice(0, cur), n }).then(r => r && r.move != null ? r.move : null); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pzWon = Pz => { const st = statusAt(cur); return st.over && st.winner === Pz.me; };
// the opponent answers (its most stubborn reply); true when the puzzle is solved by then
async function pzOpponent(Pz, tok) {
  if (pzWon(Pz)) return true;
  const st = statusAt(cur); if (st.over) return false;
  const r = await replyReq(Pz.n - Pz.used, Pz);
  if (r == null || r < 0 || puzzle !== Pz || tok !== busyToken) return false;
  const before = posAt(cur).pos.clone();
  await sleep(380); if (puzzle !== Pz || tok !== busyToken) return false;
  playMove2(r); Pz.lastReply = mvIn(before, r);
  await sleep(moveDur(r, before) + 120);
  return pzWon(Pz) || pzDone(Pz);
}
// a trap is done when the marked amazon has no empty square next to it
const pzDone = Pz => { if (Pz.kind !== 'trap') return false; Pz.tk = Pz.tk === undefined ? E.trapIdx(Pz.P.s, Pz.P.e) : Pz.tk; return Pz.tk >= 0 && E.boxed(posAt(cur).pos, Pz.tk); };
async function puzzleMove(m) {
  const Pz = puzzle; Pz.busy = true; lessonMarks = [];
  const left = Pz.n - Pz.used, tok = busyToken;
  pzStatus(t('pz.checking'));
  const good = await goodReq(Pz);
  if (!good || puzzle !== Pz || tok !== busyToken) return;
  const before = posAt(cur).pos.clone(), dm = moveDur(m, before);
  playMove2(m); Pz.used++; renderPuzzleCard();
  if (!good.includes(m)) {
    Pz.state = 'fail'; Pz.failed = true;
    await sleep(dm + 350);
    if (puzzle !== Pz) return;
    moves = moves.slice(0, cur - 1); cur = moves.length; Pz.used--;
    lessonMarks = pzMarks(Pz); if (good[0] !== undefined) lessonMarks.push(...moveMarks(good[0], 'ok')); lessonMarks.push(...moveMarks(m, 'ng'));
    Pz.busy = false; Pz.state = 'play'; update(false); playChime(false); renderPuzzleCard();
    const why = Pz.kind === 'trap' ? t('pz.bl.trap', { m: mvIn(before, m) }) : Pz.kind === 'end' ? t('pz.bl.end', { m: mvIn(before, m) }) : Pz.kind === 'read' ? t('pz.bl.read', { m: mvIn(before, m) }) : t(left <= 1 ? 'pz.bl.last' : 'pz.bl.reach', { n: left, m: mvIn(before, m) });
    pzStatus(`<b class="ng">${t('fb.bad')}</b> ${why} ${t('pz.again')}`);
    return;
  }
  await sleep(dm + 60);
  if (puzzle !== Pz || tok !== busyToken) return;
  lessonMarks = pzMarks(Pz); update(false);
  if (Pz.kind === 'end' || pzWon(Pz) || pzDone(Pz) || await pzOpponent(Pz, tok)) { if (puzzle === Pz) puzzleSolved(); return; }
  lessonMarks = pzMarks(Pz); update(false);
  if (puzzle !== Pz || tok !== busyToken) return;
  Pz.busy = false; renderPuzzleCard(); boardEl.classList.toggle('can', canHumanPlay());
  pzStatus(t('pz.reply', { m: Pz.lastReply || '', n: Math.max(1, Pz.n - Pz.used) }));
}
function puzzleSolved() {
  const Pz = puzzle; if (!Pz) return;
  Pz.state = 'solved'; Pz.busy = false;
  const pr = pzProgress(), k = Pz.rk, stars = PZBook.starsFor(Pz);
  const before = pzRecs(Pz.T, pr);
  pr[k] = Math.max(starVal(pr[k]), stars);
  try { localStorage.setItem(PZ_STORE, JSON.stringify(pr)); } catch (e) {}
  const after = pzRecs(Pz.T, pr), ev = PZBook.events(before, after, Pz.j);
  if (Pz.daily) dailySolved(Pz.daily, Pz.hinted);
  PZBook.setLang(LANG);
  const sub = Pz.kind === 'trap' ? t('pz.solvedTrap') : Pz.kind === 'end' ? t('pz.solvedEnd') : Pz.kind === 'read' ? t('pz.solvedRead') : t('pz.solvedSub', { n: Pz.used });
  pzStatus(`<b class="ok">${t('pz.solved')}</b> ${sub}` + (Pz.daily ? `<br>🔥 ${t('daily.streak', { n: dailyInfo().streak })}` : '') + PZBook.solved({ stars, recs: after, j: Pz.j, events: ev }));
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
// hints: 1) the idea of the theme, 2) the amazons that start a solution, 3) the move
$('#pzHint').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.state !== 'play' || Pz.busy) return;
  const left = Pz.n - Pz.used, good = await goodReq(Pz); if (puzzle !== Pz || !good) return;
  Pz.hinted = true; Pz.hl = Math.min(3, (Pz.hl || 0) + 1);
  lessonMarks = pzMarks(Pz); sel = null;
  if (Pz.hl === 1) pzStatus(t(Pz.kind === 'duel' ? 'pz.hint1' : 'pz.h1.' + Pz.kind, { n: left }));
  else if (Pz.hl === 2) { for (const f of new Set(good.map(mFrom))) lessonMarks.push({ at: f, cls: 'ok' }); pzStatus(t('pz.hintText')); }
  else { lessonMarks.push(...moveMarks(good[0], 'ok')); pzStatus(t('pz.best', { b: mvIn(posAt(cur).pos, good[0]) })); }
  renderFx();
};
$('#pzAnswer').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.busy) return;
  Pz.busy = true; Pz.state = 'answer'; Pz.hinted = true; Pz.answered = true; lessonMarks = []; hintList = null;
  moves = []; cur = 0; Pz.used = 0; update(false); renderPuzzleCard();
  pzStatus(t('pz.showing'));
  const tok = busyToken;
  for (let step = 0; step < 4; step++) {
    if (puzzle !== Pz) return;
    const pos = posAt(cur).pos;
    const good = await goodReq(Pz); if (puzzle !== Pz || !good || !good.length) break;
    await sleep(650); if (puzzle !== Pz) return;
    playMove2(good[0]); Pz.used++;
    renderPuzzleCard();
    await sleep(moveDur(good[0], pos));
    if (Pz.kind !== 'duel' || pzWon(Pz) || await pzOpponent(Pz, tok)) break;
    if (puzzle !== Pz || statusAt(cur).over) break;
  }
  lessonMarks = pzMarks(Pz);
  Pz.busy = false; renderPuzzleCard(); renderFx(); pzStatus(t('pz.answerDone'));
};
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
// openings: none for this game (the stubs keep the shared flow of the page)
function openOpenings() {} function openOpeningChoice() {}
function showStudy() {} function stSync() {} function stGo() {}


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
        const res = await new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve }); w.postMessage({ type: 'analyze', start: st0, rule: gv, moves: game.slice(0, i), extra: [game[i]], time: i < 10 ? 600 : 900, id }); });
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
// 振り返り解説 (Amazons terms): the territory a move leaves each side, an amazon boxed in, a chance to box one in
const crName = (pos, x) => '<bdi>' + mvIn(pos, x) + '</bdi>';
function crExplain(i, j) {   // { kind, txt } for move i (played from position i)
  const pos = posAt(i).pos, m = j.m, b = j.best, me = pos.turn, op = 3 - me;
  const am = pos.clone().play(m), ab = pos.clone().play(b), ta = am.terr(), tb = ab.terr();
  const mine = T => me === P1 ? T.a - T.b : T.b - T.a;
  if (!j.q) {
    if (j.ok) return { kind: '', txt: t('cr.best', { a: me === P1 ? ta.a : ta.b, b: me === P1 ? ta.b : ta.a }) };
    return { kind: '', txt: t('cr.good', { b: crName(pos, b) }) };
  }
  // one of my amazons boxed in (few squares to go) where the better move kept it free
  const free = (p, P) => { let lo = 99; for (let k = 0; k < 8; k++) { const f = P.q[k]; if (f < 0 || P.sq[f] !== p) continue; let n = 0; for (const x of E.NB[f]) if (!P.sq[x]) n++; lo = Math.min(lo, n); } return lo; };
  if (free(me, am) <= 1 && free(me, ab) >= 2) return { kind: 'trap', txt: t('cr.trapped', { b: crName(pos, b) }) };
  if (free(op, ab) <= 1 && free(op, am) >= 2) return { kind: 'block', txt: t('cr.missTrap', { b: crName(pos, b) }) };
  const d = mine(tb) - mine(ta);
  if (d >= 3) return { kind: 'terr', txt: t('cr.terr', { n: d, b: crName(pos, b) }) };
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
  fxDiv('mark played' + (j && j.q ? ' ' + j.q : ''), mTo(m));
  drawMove(svg, m, 'pl');
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
const rvbPath = (p, m) => E.path(p, m);
function kenStart(first) {
  if (ken || !rvbWant()) return;
  stopPlay(); busyToken++; cancelWorker('ai'); thinking = 0; animating = false; sel = null;
  ken = { base: cur, line: [], gk: gameKey(), dirty: false };
  rvbHov = null; if (BOX) BOX.clearHover();
  if (first !== undefined && posAt(cur).pos.isLegal(first)) { ken.before = posAt(cur).pos; ken.line.push(first); ken.dirty = true; kenFlush(); }
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
  kenSwap(() => { if (canHumanPlay() && posAt(cur).pos.isLegal(e.m)) { sel = null; ken.before = posAt(cur).pos; ken.line.push(e.m); ken.dirty = true; } });
  kenFlush();
}
function rvbWant() { return !!(BOX && BOX.pc() && rvOpen && rv && rv.key === gameKey() && !lesson && !puzzle && !rtLive() && settings.mode !== 'online' && !(window.olLive && olLive())); }
function rvbFx(svg, pos) {
  if (!rvbHov || !BOX || !BOX.shown || rvbHov.k !== keyOf(cur) || sel) return;
  const e = rvbHov.e;
  if (!pos.isLegal(e.m)) return;
  drawMove(svg, e.m, 'rvb1');
  let p = pos.clone().play(e.m);
  (e.pv || []).slice(0, 3).forEach((m, k) => { if (!p.isLegal(m)) return; drawMove(svg, m, 'rvb2'); const d = fxDiv('rvb-n', mTo(m)); d.textContent = String(k + 2); p = p.clone().play(m); });
  const d0 = fxDiv('rvb-n first', mTo(e.m)); d0.textContent = '1';
}
const rvbDot = p => `<i style="background:${p === P1 ? '#f3eee2;box-shadow:inset 0 0 0 1.5px #b8ab92' : '#2e2b2a;box-shadow:inset 0 0 0 1.5px #0c0b0b'}"></i>`;
function rvbLine(pos, list, n0) { let p = pos.clone(), out = []; for (const m of list) { if (!p.isLegal(m)) break; out.push((n0 ? (n0 + out.length) + '.' : '') + mvIn(p, m)); p = p.clone().play(m); } return out.join(' '); }
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
  pool: () => MTP && MTP.pool(), cancel: () => { if (MTP) MTP.cancel('rvb'); },   // (the threads when free)
  onHover: e => { rvbHov = e ? { e, k: kenSwap(() => keyOf(cur)) } : null; renderFx(); },
  onPick: e => kenPick(e), onKen: () => kenStart(), onBack: () => kenBack(), onReset: () => kenReset(),
  onGoto: i => viewAt(i), onLayout: () => { renderInfo(); renderFx(); }
});

// ====================================================================== share / load
// 3 characters per move: from, to and the arrow (one character each, 0-9 a-z A-Z … up to 100 squares)
function encMoves(list) {
  let str = '';
  for (const m of list) str += String.fromCharCode(48 + mFrom(m)) + String.fromCharCode(48 + mTo(m)) + String.fromCharCode(48 + mArrow(m));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decMoves(str, start) {
  if (!/^[A-Za-z0-9_-]*$/.test(str)) return null;
  let raw; try { raw = atob(str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4)); } catch (e) { return null; }
  if (raw.length % 3) return null;
  const pos = E.Pos.from(start || null), out = [];
  for (let i = 0; i < raw.length; i += 3) {
    const m = E.mv(raw.charCodeAt(i) - 48, raw.charCodeAt(i + 1) - 48, raw.charCodeAt(i + 2) - 48);
    if (!pos.isLegal(m)) return null;
    out.push(m); pos.play(m);
  }
  return out;
}
// "1. d1-d7/g7 d10-d8/b6 2. ..." or a share URL (#k=<moves>)
function parseGameText(v) {
  v = (v || '').trim();
  const h = v.match(/#(.*)$/);
  if (h) { const q = new URLSearchParams(h[1]); if (!q.has('k')) return null; const list = decMoves(q.get('k') || ''); if (!list) return null; return { list, n: q.has('n') ? parseInt(q.get('n'), 10) : undefined }; }
  v = v.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?(?=\s|$)/g, ' ').replace(/(^|\s)(\*|1-0|0-1)(?=\s|$)/g, ' ');
  const toks = v.split(/[\s,;]+/).filter(Boolean);
  if (!toks.length) return null;
  const pos = E.Pos.from(null), out = [];
  for (let k = 0; k < toks.length; k++) {
    if (!/^[a-j](10|[1-9])[-x]?[a-j](10|[1-9])[/(]?[a-j](10|[1-9])\)?$/i.test(toks[k])) return { bad: k + 1 };
    const m = E.parse(pos, toks[k]); if (m == null) return { bad: k + 1 };
    pos.play(m); out.push(m);
  }
  return { list: out };
}
function openLoaded(list, n) {
  ['#resultOverlay', '#newOverlay', '#pasteOverlay'].forEach(hideOverlay);
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
function shareUrl() { return startSpec ? '' : location.origin + location.pathname + '#k=' + encMoves(moves) + (cur < moves.length ? '&n=' + cur : ''); }
// 共有: a PGN-like record ("d1-d7/g7"), a position line (W / B amazons, X arrows), URL, diagram
function amPos(pos) { const L = k => { const o = []; for (let i = 0; i < NN_(); i++) if (pos.at(i) === k) o.push(E.sqName(i)); return o.join(','); }; return `${pos.side ? 'B' : 'W'}:W${L(1)}:B${L(3)}:X${L(5)}`; }
function amRec() {
  const st = statusAt(moves.length), res = st.over ? (st.winner === P1 ? '1-0' : '0-1') : '*';
  const tk = recordText().split(' ');
  const d = new Date(), date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`, q = v => String(v || '?').replace(/["\\]/g, '');
  return `[Event "World Board Game Atlas"]\n[Site "core-calmdust.github.io/aicoding/amazons"]\n[Date "${date}"]\n[White "${q(playerName(P1))}"]\n[Black "${q(playerName(P2))}"]\n[Result "${res}"]\n[Variant "amazons"]\n\n${tk.concat([res]).join(' ')}\n`;
}
async function amDiagram(mode) {
  const RX = RecordExport, N = NS_(), S = 48, B = S * N, pos = posAt(cur).pos;
  await RX.fonts();
  let cap = RX.tx('start');
  if (cur) cap = `${((cur - 1) >> 1) + 1}.${(cur - 1) & 1 ? '..' : ''} ${E.name(posAt(cur - 1).pos, moves[cur - 1])}`;
  const st = statusAt(cur);
  cap += '　' + (st.over && cur === moves.length ? (st.winner === P1 ? '1-0' : '0-1') : RX.tx('toMove', { s: pname(pos.turn) }));
  const lm = cur ? moves[cur - 1] : -1;
  const pl = [P1, P2].map(p => ({ name: pname(p) + (RX.name(p - 1, playerName(p)) ? ' ' + RX.name(p - 1, playerName(p)) : ''), swatch: (g, x, y, r) => RX.disc(g, x, y, r, p === P1 ? '#ffffff' : '#1a1a1a', '#111', 1.3) }));
  return RX.sheet({ bw: B + 8, bh: B + 8, title: t('meta.title').split(/[|｜—–]/)[0].trim(), caption: cap, players: pl, moves: mode === 'moves' ? recordText().split(' ') : null, path: 'amazons', titleFont: RX.SERIF, draw: (g, x0, y0) => {
    const ox = x0 + 4, oy = y0 + 4;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const x = ox + c * S, y = oy + r * S, i = r * N + c;
      g.fillStyle = (r + c) & 1 ? '#c9d4bd' : '#f1f3ea'; g.fillRect(x, y, S, S);
      if (lm >= 0 && (i === mFrom(lm) || i === mTo(lm))) { g.fillStyle = 'rgba(200,220,90,.45)'; g.fillRect(x, y, S, S); }
      if (mode === 'num') { g.fillStyle = 'rgba(20,30,15,.7)'; g.font = `600 10px ${RX.SANS}`; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(E.sqName(i), x + 2, y + 2); }
      const k = pos.at(i);
      if (k === 5) { g.fillStyle = '#3a2a1c'; g.fillRect(x + 5, y + 5, S - 10, S - 10); g.strokeStyle = '#e4c27a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 13, y + S - 13); g.lineTo(x + S - 13, y + 13); g.stroke(); }
      else if (k) { RX.disc(g, x + S / 2, y + S / 2 + 1, S * 0.36, k === 1 ? '#ffffff' : '#1a1a1a', '#111', 1.6); g.fillStyle = k === 1 ? '#111' : '#fff'; g.font = `700 ${Math.round(S * .36)}px ${RX.SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('♛', x + S / 2, y + S / 2 + 2); }
      if (lm >= 0 && i === mArrow(lm)) { g.strokeStyle = 'rgba(230,110,70,.95)'; g.lineWidth = 3; g.strokeRect(x + 2, y + 2, S - 4, S - 4); }
    }
    g.strokeStyle = '#111'; g.lineWidth = 2.4; g.strokeRect(ox - 1.2, oy - 1.2, B + 2.4, B + 2.4);
  } });
}
RecordExport.attach({ btn: '#btnShare', key: 'amazons', title: t('meta.title'), lang: () => LANG, toast: m => toast(m, 1500),
  empty: () => !moves.length || !!lesson || !!puzzle, emptyMsg: () => t('nokifu'),
  formats: () => [{ id: 'pgn', label: 'PGN', ext: 'pgn', text: amRec }, { id: 'pos', label: 'FEN', ext: 'txt', meta: false, text: () => amPos(posAt(cur).pos) + '\n' }],
  sides: () => [{ label: pname(P1), name: playerName(P1), tag: 'White' }, { label: pname(P2), name: playerName(P2), tag: 'Black' }],
  url: shareUrl, image: { modes: ['board', 'num', 'moves'], draw: amDiagram } });
$('#btnPaste').onclick = () => { $('#pasteText').value = ''; showOverlay('#pasteOverlay'); setTimeout(() => $('#pasteText').focus(), 50); };
$('#pasteCancel').onclick = () => hideOverlay('#pasteOverlay');
$('#pasteOk').onclick = () => { const v = $('#pasteText').value; if (!v.trim()) { toast(t('nokifu')); return; } loadText(v); };
$('#pasteText').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) { e.preventDefault(); $('#pasteOk').click(); } else if (e.key === 'Escape') hideOverlay('#pasteOverlay'); });

// ====================================================================== boot
if (window.RulesOffer) RulesOffer.init({ game: 'amazons', lang: () => LANG, open: () => openRules(null, 0), watch: '#rulesOverlay' });
const hadSave = load();
try { const sp = localStorage.getItem('atlas-sfx'); if (sp === '0' || sp === '1') settings.sound = sp === '1'; } catch (e) {} // サイト共通のサウンド設定（トップページと連動）
designApply();
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) { LANG = q; try { localStorage.setItem('aicoding-lang', q); } catch (e) {} } }
applyI18n();
if (window.FlipBtn) FlipBtn.init({ game: 'amazons', lang: () => LANG, onChange: () => { renderBoard(); renderInfo(); } });
flip = flipFor(); drawLines();
// PC header bar: title left, menu (new > undo > resign > hint > rules) + icons right, game info in between
// 勝敗記録 (shared/record.js) and the coach's switch (coach.js): before the header bar takes the menu / icons
if (window.GameRecord) GameRecord.init({ game: 'amazons', lang: () => LANG, menu: '.controls', sides: () => [pname(P1), pname(P2)] });
if (window.AmazonsCoach) AmazonsCoach.init();
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
  if (window.AmazonsCoach) AmazonsCoach.relabel();
  if (window.GameRecord) GameRecord.relabel();
};
if (loadFromHash()) { /* shared game opened */ }
else if (!hadSave) { update(false); afterPosition(); }   // no saved game: the starting position, waiting (the settings dialog opens from 対局)
else { update(false); afterPosition(); }
// expose for tests
window.__am = { get moves() { return moves; }, get cur() { return cur; }, settings, get rv() { return rv; }, rvJudge, parseGameText, encMoves, decMoves, onSquare, statusAt, posAt, newGame, get lesson() { return lesson; }, get puzzle() { return puzzle; }, get sel() { return sel; }, startLesson, startPuzzle, lessonsReady, puzzlesReady, get LESSONS() { return LESSONS; }, get PUZZLES() { return PUZZLES; }, playMove, viewAt };

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
