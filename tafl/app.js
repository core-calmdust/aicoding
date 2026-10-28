'use strict';
// Hnefatafl (Viking chess) — page script. Same structure as Checkers / Nine Men's Morris (the site's reference pages):
// board + side panel, AI (20 steps) in Web Workers, rated games vs the AI (予備選), lessons, openings, puzzles (PZBook v2),
// post-game review with a coach, share / paste, daily puzzle. Online play: online.js + online-ui.js.
// Rule sets: Copenhagen 11x11 (main), Brandubh 7x7, Tablut 9x9 (engine.js / engine.c).
// ====================================================================== rules (shared with the engine)
const E = window.TaflEngine, WIN = E.WIN, WINT = E.WINT;
const P1 = 1, P2 = 2;                 // P1 = the attackers (move first), P2 = the defenders (the king's side)
const RULE_ORDER = ['copenhagen', 'brandubh', 'tablut'];
const mFrom = E.mFrom, mTo = E.mTo;
let gv = 'copenhagen', N = 11;
let HB = null;                        // PC header bar (shared/headerbar.js)
let startSpec = null;                 // lesson / puzzle start position (null = the start position of gv)
let moves = [];                       // game record (move numbers, see engine.js)
let cur = 0;                          // number of moves shown
const flip = false;                   // the board is symmetric: always shown the same way (a1 at the bottom left)
function setVariant(v) {
  gv = RULE_ORDER.includes(v) ? v : 'copenhagen'; N = E.RULES[gv].n;
  document.documentElement.style.setProperty('--S', N);
}
const startKey = () => gv + (startSpec ? ':' + startSpec.b + '/' + startSpec.side : '');
const keyOf = i => startKey() + '|' + moves.slice(0, i).join(',');
let posCache = { key: '' };
function posAt(i) {
  const key = keyOf(i);
  if (posCache.key === key) return posCache;
  const r = E.replay(startSpec, moves.slice(0, i), gv);
  posCache = { key, pos: r.pos, hashes: r.hashes };
  return posCache;
}
// {over, winner, draw, why}
function statusAt(i) {
  if (manualEnd && !kenSw && manualEnd.n === moves.length && i === moves.length && !lesson && !puzzle && settings.mode !== 'online') return manualEnd;
  if (settings.mode === 'online' && !kenSw && window.olOver && i === moves.length && !lesson && !puzzle) { const o = olOver(); if (o) return o; }
  if (rgame && rgame.over && !kenSw && i === moves.length && !lesson && !puzzle) return rgame.over;
  const { pos, hashes } = posAt(i);
  return E.judge(pos, hashes);
}
const toMoveAt = i => posAt(i).pos.turn;
// move name ("d11-d9", "Kf6-f9", captures "xd8"; needs the position before the move)
function mvAt(i, html) { const s = E.name(posAt(i).pos, moves[i]); return html ? s.replace(/x([a-k]\d+)/g, '<span class="x">×$1</span>') : s; }
function mvIn(pos, m) { return E.name(pos, m); }

// ====================================================================== state
const STORE = 'aicoding-tafl';
const settings = { mode: 'ai', rule: 'copenhagen', color: 2, level: 6, level2: 6, anim: true, sound: true, hint: false, eval: true, last: true, threat: false, num: true, lang: '', bd: 'birch', pcs: 'bone' };
const SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
function detectLang() { const n = (navigator.language || 'ja').toLowerCase(); return ['ja', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'].find(c => n.startsWith(c)) || 'en'; }
let LANG = detectLang();
function t(k, v) { let x = (I18N[LANG] || I18N.en)[k]; if (x === undefined) x = I18N.en[k]; if (x === undefined) x = I18N.ja[k]; if (x === undefined) return k; if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; }
const pname = p => t(p === P1 ? 'p1' : 'p2');
// AI strength: 20 steps, 15級 (1) … 1級 (15), 初段 (16) … 五段 (20)
const LV_MAX = 20;
const LV = i => i <= 15 ? t('lv.kyu', { n: 16 - i }) : t('lv.dan' + (i - 15));
const LVD = i => t('lvd')[i <= 3 ? 0 : i <= 7 ? 1 : i <= 15 ? 2 : 3];
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
function renderBrand() { const tt = t('title'); $('#brandTitle').textContent = tt; $('#brandSub').textContent = gv !== 'copenhagen' && !lesson && !puzzle ? t('rule.' + gv) : t('sub'); document.querySelector('.brand h1').style.setProperty('--tl', Math.max(14, tt.length + ($('#brandSub').textContent.length * .5))); }
let humanColor = P2;
let reviewing = false;
let ken = null, kenSw = false, rvbHov = null, BOX = null;   // PC review box: exploring (検討) state, swap flag, hovered candidate, the box
let manualEnd = null;    // resignation / agreed draw in a game vs the AI or between two players: { over, winner, draw, why, n }
let aiVals = [];         // the AI's own search values (its view), newest last: for its resignations
let evals = [];          // evals[i] = evaluation after i moves (the attackers' view)
let busyToken = 0;
let lesson = null, puzzle = null;
let rtHold = false;      // a rated game restored on page load: its clock waits for the first move
let rgame = null;        // rated game vs the AI: { id, lv, or, my, tag, ct: [ms, ms], t, over, done }
let gameOverShown = false;
let sel = null;          // human input in progress: { from, cands: [moves] }

function validMoves(list) {
  try { const pos = E.Pos.from(startSpec, gv); for (const m of list) { if (typeof m !== 'number' || !pos.moves().includes(m)) return false; pos.play(m); } return true; } catch (e) { return false; }
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!d) return false;
    Object.assign(settings, d.settings || {});
    if (settings.mode === 'online') settings.mode = 'pvp';
    if (!(settings.level >= 1 && settings.level <= LV_MAX)) settings.level = 6;
    if (!(settings.level2 >= 1 && settings.level2 <= LV_MAX)) settings.level2 = 6;
    if (!RULE_ORDER.includes(settings.rule)) settings.rule = 'copenhagen';
    setVariant(d.rule || settings.rule);
    if (Array.isArray(d.moves)) {
      startSpec = null;
      if (!validMoves(d.moves)) return false;
      moves = d.moves; humanColor = d.humanColor || P2; manualEnd = d.end && d.end.n === d.moves.length ? d.end : null; evals = Array.isArray(d.evals) ? d.evals : [];
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
const ENGINE_URL = 'engine.js?v=rb1';
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
  return new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve, onProgress }); w.postMessage({ start: startSpec, v: gv, ...msg, id }); });
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
// a wooden "clack" of a piece set down; delay in ms
function sPlace(soft, delay) { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000, v = soft ? 0.12 : 0.34; tone(a, t0, 260, 110, 0.13, v); noise(a, t0, 0.035, v * 1.1, 2000, 1.2); }
function sSlide(delay) { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000; noise(a, t0, 0.14, 0.05, 900, 0.6, 'lowpass'); }
function sTake(delay) { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000; tone(a, t0, 170, 60, 0.22, 0.26); noise(a, t0, 0.08, 0.2, 500, 0.8, 'lowpass'); }
// a short horn call: the king reaches a corner / is captured
function sHorn(delay, low) { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + (delay || 0) / 1000, f = low ? 147 : 196; [[f, 0], [f * 1.5, 0.22], [f * 2, 0.44]].forEach(([fr, dt]) => tone(a, t0 + dt, fr, fr * 1.01, low ? 0.5 : 0.6, 0.09, 'sawtooth')); }
function playChime(win) {
  if (!settings.sound) return;
  const a = ctx(); if (!a) return;
  const t0 = a.currentTime + 0.05, notes = win ? [392, 493.88, 587.33, 783.99, 987.77] : [392, 349.23, 311.13, 261.63];
  notes.forEach((fr, i) => tone(a, t0 + i * (win ? 0.1 : 0.16), fr, 0, 0.7, 0.16, win ? 'triangle' : 'sine'));
}
function playTick() { if (!settings.sound) return; const a = ctx(); if (!a) return; tone(a, a.currentTime, 880, 0, 0.08, 0.05, 'triangle'); }

// ====================================================================== DOM / board
const $ = s => document.querySelector(s);
const boardEl = $('#board'), piecesEl = $('#pieces'), fxEl = $('#fx'), linesEl = $('#lines');
const reduceMotion = false /* site rule: animations are never skipped for the OS reduce-motion setting */;
const animOn = () => settings.anim && !reduceMotion;
const dRC = i => [Math.floor(i / N), i % N];
const ptX = i => (dRC(i)[1] + 0.5) / N * 100, ptY = i => (dRC(i)[0] + 0.5) / N * 100;
function placeAt(el, i) { el.style.left = ptX(i) + '%'; el.style.top = ptY(i) + '%'; }
// piece emblems: attackers an axe-head rune (ᛏ), defenders a ring, the king a crown
const EM = {
  1: '<svg viewBox="0 0 24 24"><path d="M12 3.5 20.5 12 12 20.5 3.5 12z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>',
  2: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>',
  3: '<svg viewBox="0 0 24 24"><path d="M3 17.5 4.4 7.5l4.6 4.2L12 4.5l3 7.2 4.6-4.2 1.4 10z" fill="#f2d27a" stroke="#7a5a1c" stroke-width="1.2" stroke-linejoin="round"/><path d="M3.5 20.5h17" stroke="#f2d27a" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="13.5" r="1.6" fill="#c0392b"/></svg>',
};
// knot marks of the special squares (the throne, the corners)
const knotPath = (x, y, s) => { const r = .3 * s; return `M${x - r},${y}A${r},${r} 0 1 0 ${x + r},${y}A${r},${r} 0 1 0 ${x - r},${y}M${x},${y - r * 1.25}L${x},${y + r * 1.25}M${x - r * 1.25},${y}L${x + r * 1.25},${y}`; };
function drawLines() {
  boardEl.style.setProperty('--S', N);
  const G = E.geo(gv), F = G.F;
  let s = `<defs><linearGradient id="wdG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--wd1)"/><stop offset=".55" style="stop-color:var(--wd2)"/><stop offset="1" style="stop-color:var(--wd3)"/></linearGradient></defs>`;
  s += `<rect class="wd" x="0" y="0" width="${N}" height="${N}"/>`;
  for (let i = 0; i < N * N; i++) if (F[i] & 16) { const [r, c] = dRC(i); s += `<rect class="sp" x="${c + .04}" y="${r + .04}" width=".92" height=".92" rx=".08"/><path class="knot" d="${knotPath(c + .5, r + .5, 1)}"/>`; }
  let d = ''; for (let k = 0; k <= N; k++) d += `M${k},0V${N}M0,${k}H${N}`;
  s += `<path class="gl" d="${d}"/>`;
  for (let c = 0; c < N; c++) s += `<text class="num" x="${c + .93}" y="${N - .07}" font-size=".2" text-anchor="end">${String.fromCharCode(97 + c)}</text>`;
  for (let r = 0; r < N; r++) s += `<text class="num" x=".07" y="${r + .23}" font-size=".2">${N - r}</text>`;
  linesEl.setAttribute('viewBox', `0 0 ${N} ${N}`);
  linesEl.innerHTML = s;
  boardEl.classList.toggle('no-num', !settings.num);
}
const pcEls = new Map();      // square -> element
let shownKey = '';
function newPiece(kind) {     // kind: 1 attacker, 2 defender, 3 king
  const el = document.createElement('div'); el.className = 'pc p' + (kind === 1 ? 1 : 2) + (kind === 3 ? ' k' : '');
  el.innerHTML = '<i class="em">' + EM[kind] + '</i>'; el.dataset.k = kind; return el;
}
function syncPieces(pos, force) {
  for (const [i, el] of pcEls) if (force || pos.at(i) !== +el.dataset.k) { el.remove(); pcEls.delete(i); }
  for (let i = 0; i < N * N; i++) { const k = pos.at(i); if (k && !pcEls.has(i)) { const el = newPiece(k); placeAt(el, i); piecesEl.appendChild(el); pcEls.set(i, el); } }
  for (const [i, el] of pcEls) { placeAt(el, i); el.getAnimations && el.getAnimations().forEach(a => a.cancel()); el.classList.remove('sel', 'dim', 'threat', 'kdanger'); el.style.opacity = ''; }
}
const SLIDE = 220;
function moveDur(m, pos) {
  if (!animOn()) return 60;
  const [r0, c0] = dRC(mFrom(m)), [r1, c1] = dRC(mTo(m)), d = Math.abs(r1 - r0) + Math.abs(c1 - c0);
  return SLIDE + d * 32 + (pos && pos.capsOf(m).length ? 260 : 0);
}
// animate move m from position `before` (the pieces map shows `before`)
function animateMove(m, before) {
  const f = mFrom(m), tt = mTo(m), el = pcEls.get(f);
  if (!el) return false;
  const caps = before.capsOf(m), after = before.clone().play(m);
  const r0 = boardEl.getBoundingClientRect(), u = r0.width / N;
  const pt = i => { const [r, c] = dRC(i); return [(c + 0.5) * u, (r + 0.5) * u]; };
  pcEls.delete(f); placeAt(el, tt); pcEls.set(tt, el);
  el.classList.remove('sel'); el.style.zIndex = 5;
  const [ex, ey] = pt(tt), [sx, sy] = pt(f), dur = SLIDE + (Math.abs(ex - sx) + Math.abs(ey - sy)) / u * 32;
  if (el.animate) el.animate([{ transform: `translate(${sx - ex}px,${sy - ey}px) scale(1.06)` }, { transform: 'none' }], { duration: dur, easing: 'cubic-bezier(.3,.7,.3,1)' });
  sSlide(); sPlace(false, dur - 30);
  for (const i of caps) {
    const vic = pcEls.get(i); pcEls.delete(i);
    if (!vic) continue;
    if (vic.animate) { const an = vic.animate([{ transform: 'none', opacity: 1, filter: 'brightness(1)' }, { transform: 'scale(1.12)', opacity: 1, filter: 'brightness(1.5)', offset: 0.3 }, { transform: 'scale(.3)', opacity: 0, filter: 'brightness(.6)' }], { duration: 320, delay: dur - 40, easing: 'ease-in', fill: 'forwards' }); an.onfinish = () => vic.remove(); }
    else vic.remove();
  }
  if (caps.length) sTake(dur);
  if (after.res) sHorn(dur + 120, after.res === P1);
  setTimeout(() => { el.style.zIndex = ''; }, dur + 300);
  return true;
}
function startCounts() { const s = E.Pos.from(startSpec, gv); return { a: s.count(P1), d: s.count(P2) }; }
function renderReserves(pos) {
  // captured pieces, shown on the capturer's side of the board: the attackers' losses at the bottom (the defenders took them)
  const st = startCounts();
  for (const p of [P1, P2]) {
    const lost = Math.max(0, (p === P1 ? st.a : st.d) - pos.count(p));
    const el = $(p === P1 ? '#res1' : '#res2');
    let s = ''; for (let k = 0; k < Math.min(lost, 14); k++) s += `<span class="rv p${p}"></span>`;
    if (lost) s += `<span class="lbl">×${lost}</span>`;
    el.innerHTML = s;
    el.title = lost ? t('captured', { c: pname(p), n: lost }) : '';
    el.classList.remove('turn');
  }
}
function renderBoard(anim) {
  if (ken && !kenSw) { if (kenOk()) return kenSwap(() => renderBoard(anim)); ken = null; }
  const { pos } = posAt(cur), key = keyOf(cur);
  const prev = shownKey; shownKey = key;
  const m = cur > 0 ? moves[cur - 1] : -1;
  let done = false;
  if (anim && animOn() && m >= 0 && prev === keyOf(cur - 1)) {
    const before = posAt(cur - 1).pos;
    done = animateMove(m, before);
    if (done) for (let i = 0; i < N * N; i++) if (!!pos.at(i) !== pcEls.has(i)) { done = false; break; }
  } else if (anim && m >= 0 && prev === keyOf(cur - 1)) {
    sPlace(); if (pos.lastCaps.length) sTake(80);
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
function fxSvg() { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'fxsvg'); s.setAttribute('viewBox', `0 0 ${N} ${N}`); fxEl.appendChild(s); return s; }
const cXY = i => { const [r, c] = dRC(i); return [c + 0.5, r + 0.5]; };
function svgArrow(svg, path, cls) {
  if (!path || path.length < 2) return;
  const pts = path.map(cXY);
  const [x1, y1] = pts[0], [x2, y2] = pts[1], d0 = Math.hypot(x2 - x1, y2 - y1) || 1;
  pts[0] = [x1 + (x2 - x1) / d0 * 0.28, y1 + (y2 - y1) / d0 * 0.28];
  const n = pts.length, [ax, ay] = pts[n - 2], [bx, by] = pts[n - 1], dl = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / dl, uy = (by - ay) / dl;
  const ex = bx - ux * 0.3, ey = by - uy * 0.3; pts[n - 1] = [ex, ey];
  const h = 0.2;
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', 'M' + pts.map(q => q[0].toFixed(3) + ',' + q[1].toFixed(3)).join('L') + `M${ex - ux * h - uy * h * 0.8},${ey - uy * h + ux * h * 0.8}L${ex},${ey}L${ex - ux * h + uy * h * 0.8},${ey - uy * h - ux * h * 0.8}`);
  p.setAttribute('class', 'arrow ' + (cls || '')); p.setAttribute('stroke-width', 0.08); p.setAttribute('stroke-linejoin', 'round'); svg.appendChild(p);
}
// pieces of player p that the opponent could capture with its next move
function threatened(pos, p) {
  const q = pos.clone(); q.turn = p === P1 ? P2 : P1; q.res = 0;
  const out = new Set(); for (const m of q.moves()) for (const i of q.capsOf(m)) out.add(i);
  return out;
}
// the king can be captured by the attackers' next move
function kingInDanger(pos) {
  if (pos.king < 0) return false;
  const q = pos.clone(); q.turn = P1; q.res = 0;
  const k = pos.king, adj = q.nb(k);
  return q.moves().some(m => adj.includes(mTo(m)) && q.clone().play(m).res === P1);
}
// king escape lines (squares of the open paths to the escape squares)
function escPaths(pos) {
  const ends = pos.kingLines(), out = [];
  if (!ends.length) return out;
  const [kr, kc] = pos.rc(pos.king);
  for (const e of ends) { const [er, ec] = pos.rc(e), dr = Math.sign(er - kr), dc = Math.sign(ec - kc), path = []; for (let r = kr + dr, c = kc + dc; ; r += dr, c += dc) { path.push(r * N + c); if (r === er && c === ec) break; } out.push(path); }
  return out;
}
function renderFx() {
  if (ken && !kenSw) { if (kenOk()) return kenSwap(renderFx); ken = null; }
  fxEl.innerHTML = '';
  const { pos } = posAt(cur), st = statusAt(cur), m = cur > 0 ? moves[cur - 1] : -1;
  const svg = fxSvg(); $('#millfx').innerHTML = '';
  for (const [, el] of pcEls) el.classList.remove('dim', 'sel', 'threat', 'kdanger');
  if (m >= 0 && !sel) {
    fxDiv('sqfx lastf', mFrom(m)); fxDiv('sqfx last', mTo(m));
    if (settings.last) for (const i of pos.lastCaps) fxDiv('mark took', i);
  }
  if (st.over && st.winner) for (const [i, el] of pcEls) if ((pos.at(i) === 1 ? P1 : P2) !== st.winner) el.classList.add('dim');
  if (settings.threat && !st.over && !lesson && !puzzle && !sel) {
    for (const p of [P1, P2]) for (const i of threatened(pos, p)) { const el = pcEls.get(i); if (el) el.classList.add('threat'); }
    for (const path of escPaths(pos)) { path.forEach((q, k) => fxDiv(k === path.length - 1 ? 'sqfx esc' : 'sqfx path', q)); }
    if (kingInDanger(pos)) { const el = pcEls.get(pos.king); if (el) el.classList.add('kdanger'); }
  }
  if (sel) {
    const el = pcEls.get(sel.from); if (el) el.classList.add('sel');
    for (const c of sel.cands) { const q = pos.clone().play(c); fxDiv('dest' + (q.res === pos.turn ? ' win' : q.lastCaps.length ? ' cap' : ''), mTo(c)); }
  }
  for (const k of lessonMarks) { if (k.arrow) svgArrow(svg, k.arrow, k.cls); else if (k.sq) fxDiv('sqfx ' + k.cls, k.at); else fxDiv('mark ' + k.cls, k.at); }
  if (labelList) drawLabels(labelList);
  else if (!(rvbHov && BOX && BOX.shown) && !drawReviewFx(svg) && hintList && !st.over) drawHints(hintList, svg);
  rvbFx(svg, pos);
  renderPrompt();
}
function renderPrompt() {
  const el = $('#prompt'); let s = '';
  if (canHumanPlay() && !lesson && !puzzle && settings.threat) { const { pos } = posAt(cur), L = pos.kingLines().length; if (L) s = t(L >= 2 ? 'st.tuichi' : 'st.raichi'); }
  el.textContent = s; el.classList.toggle('show', !!s);
}
// value label for an engine value (mover's view)
function valLabel(v) {
  if (v > WINT) return { cls: 'win', big: t('h.win'), small: v < WINT + 1000 ? t('h.in', { n: (WIN - v + 1) >> 1 }) : '' };
  if (v < -WINT) return { cls: 'loss', big: t('h.loss'), small: -v < WINT + 1000 ? t('h.in', { n: (WIN + v) >> 1 }) : '' };
  const x = v / 100; return { cls: 'heur' + (x < -0.05 ? ' neg' : ''), big: (x > 0.05 ? '+' : '') + (Math.abs(x) < 0.05 ? '0' : x.toFixed(1)), small: '' };
}
// labels on the landing squares: the selected piece's moves, or the best few moves of the position
function hintGroups(list) {
  let L = list;
  if (sel) L = list.filter(e => mFrom(e.m) === sel.from);
  else L = list.slice().sort((a, b) => b.v - a.v).slice(0, 6);
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
  if (!sel) { let bm = null; for (const e of list) if (!bm || e.v > bm.v) bm = e; if (bm) svgArrow(svg, [mFrom(bm.m), mTo(bm.m)], 'ok'); }
}
function drawLabels(list) { for (const L of list) { const d = fxDiv('hintlbl ' + L.cls + (pcEls.has(L.at) ? ' on-pc' : ''), L.at); d.innerHTML = `<b>${L.big}</b>${L.small ? `<small>${L.small}</small>` : ''}`; } }

// evaluation (the attackers' view): {s in [-1,1], kind, side, n}
function sOfV(v) { return v > WINT ? 0.9 + 0.1 * Math.min(1, 6 / (WIN - v + 1)) : v < -WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (WIN + v + 1))) : Math.tanh(v / 450) * 0.85; }
function evalFromList(list, mover) {
  if (!list || !list.length) return null;
  let best = -Infinity; for (const e of list) best = Math.max(best, e.v);
  const sign = mover === P1 ? 1 : -1;
  if (best > WINT) return { s: sOfV(best) * sign, kind: 'win', side: mover, n: (WIN - best + 1) >> 1 };
  if (best < -WINT) return { s: sOfV(best) * sign, kind: 'win', side: 3 - mover, n: (WIN + best) >> 1 };
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
  if (settings.mode === 'watch') return `AI ${LV(levelFor(p))}`;
  if (rgame) return p === humanColor ? t('you') + ' · R' + rgame.my : `AI ${rtLvName(rgame.lv)} · R${rgame.or}`;
  return p === humanColor ? t('you') : `AI ${LV(settings.level)}`;
}
let thinking = 0, animating = false;
function renderInfo() {
  const { pos } = posAt(cur), st = statusAt(cur), tm = pos.turn;
  const lines = !st.over ? pos.kingLines().length : 0;
  for (const p of [P1, P2]) {
    $('#count' + p).textContent = pos.count(p);
    $('#hand' + p).textContent = p === P1 ? t('pcs.att') : t(pos.king >= 0 && pos.at(pos.king) === 3 ? 'pcs.def' : 'pcs.defNoKing');
    const n = playerName(p); $('#name' + p).textContent = n ? n + ' · ' + pname(p) : pname(p);
    const el = $('#pl' + p);
    el.classList.toggle('active', !st.over && tm === p);
    el.classList.toggle('won', st.winner === p);
    el.classList.toggle('thinking', thinking === p);
    $('#status' + p).textContent = st.winner === p ? t('st.win') : thinking === p ? t('thinking') : (!st.over && tm === p ? t('st.turn') + (lines ? ' · ' + t(lines >= 2 ? 'st.tuichi' : 'st.raichi') : '') : '');
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
  $('#infoLine').textContent = `${t('rule.' + gv)}  ·  ${t('info.moves', { n: moves.length })}  ·  ${settings.mode === 'ai' ? 'AI ' + LV(levelFor(0)) + (rgame ? ' · ' + t('ng.rated') : '') : settings.mode === 'watch' ? `${LV(settings.level)} vs ${LV(settings.level2)}` : t('ng.pvp')}  ·  ← → ${t('info.browse')}`;
  renderBrand();
  if (window.olAfterInfo) olAfterInfo();
  hbInfo(pos, st, lines);
}
// PC header bar: whose turn, pieces of each side, evaluation (when shown), move number
const escHb = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function hbInfo(pos, st, lines) {
  if (!HB || !HB.on) return;
  const tm = pos.turn;
  let h = `<span class="hb-chip"><i class="pdisc p${st.over ? (st.winner || tm) : tm}"></i><b>${escHb(st.over ? (st.winner ? t('hb.won', { c: pname(st.winner) }) : t('res.draw')) : t('hb.turn', { c: pname(tm) }))}</b>${lines ? `<small>${escHb(t(lines >= 2 ? 'st.tuichi' : 'st.raichi'))}</small>` : ''}</span>`;
  for (const p of [P1, P2]) h += `<span class="hb-chip cnt"><i class="pdisc p${p}${p === P2 ? ' k' : ''}"></i><b>${pos.count(p)}</b></span>`;
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
    <path d="${area}" fill="rgba(110,116,128,.55)" clip-path="url(#ctop)"/>
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
function update(anim) { if (!anim) sel = null; renderBoard(anim); renderInfo(); stSync(); document.body.classList.toggle('ai-live', aiGameLive()); }

// ====================================================================== input (click a piece, then the square it should slide to)
function squareAt(clientX, clientY) {
  const r = boardEl.getBoundingClientRect(), u = r.width / N;
  const c = Math.floor((clientX - r.left) / u), rr = Math.floor((clientY - r.top) / u);
  if (c < 0 || c >= N || rr < 0 || rr >= N) return -1;
  return rr * N + c;
}
let hoverEl = null;
function setHover(i) {
  if (ken && !kenSw && kenOk()) return kenSwap(() => setHover(i));
  if (hoverEl) { hoverEl.remove(); hoverEl = null; }
  if (i < 0 || !canHumanPlay() || !sel) return;
  if (!sel.cands.some(c => mTo(c) === i)) return;
  const { pos } = posAt(cur), k = pos.at(sel.from);
  hoverEl = document.createElement('div'); hoverEl.className = 'hov pc p' + (k === 1 ? 1 : 2) + (k === 3 ? ' k' : ''); placeAt(hoverEl, i); piecesEl.appendChild(hoverEl);
}
boardEl.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') setHover(squareAt(e.clientX, e.clientY)); });
boardEl.addEventListener('pointerleave', () => setHover(-1));
boardEl.addEventListener('click', e => { const i = squareAt(e.clientX, e.clientY); setHover(-1); onSquare(i); });
function cancelSel() { if (!sel) return; sel = null; renderFx(); }
const ownPiece = (pos, i) => { const x = pos.at(i); return !!x && (x === 1 ? P1 : P2) === pos.turn; };
function onSquare(i) {
  ctx();
  if (ken && !kenSw && kenOk()) { kenSwap(() => onSquare(i)); kenFlush(); return; }
  if (!canHumanPlay()) { if (reviewing && !lesson && !puzzle) rsOpen(); return; }
  const { pos } = posAt(cur);
  if (i < 0) { cancelSel(); return; }
  if (sel) { const m = sel.cands.find(c => mTo(c) === i); if (m !== undefined) { commit(m); return; } }
  if (ownPiece(pos, i)) {
    if (sel && sel.from === i) { cancelSel(); return; }
    const c = pos.movesFrom(i);
    if (!c.length) { toast(t('cant.stuck')); return; }
    sel = { from: i, cands: c }; playTick(); renderFx(); return;
  }
  if (!sel) { if (pos.at(i)) toast(t('pick.own')); return; }
  if (pos.at(i)) { cancelSel(); return; }
  const F = E.geo(gv).F;
  toast(F[i] & 16 && pos.at(sel.from) !== 3 ? t('cant.restricted') : t('cant.move'));
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
  rgame = null; rtHold = false;
  if (rated) rgame = Object.assign(rated, { ct: [RT_CLOCK.base, RT_CLOCK.base], t: Date.now() });
  startSpec = null;
  setVariant(rated ? 'copenhagen' : settings.rule); drawLines();
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
}
// ---------------------------------------------------------------- resignation and draw offers in games vs the AI
let drawAsked = -99;   // ply of the last draw offer, so offers are not repeated every move
function aiGameLive() { return settings.mode === 'ai' && !lesson && !puzzle && !gameOver(moves.length) && cur === moves.length; }
function endManually(st) {
  busyToken++; cancelWorker('ai'); thinking = 0;
  st.n = moves.length;
  if (rgame) rgame.over = st; else manualEnd = st;
  save(); update(false); onGameEnd(st);
}
// the AI resigns when it sees a forced loss a few moves away (not the weakest levels)
function aiResigns(p) {
  const lv = levelFor(p), v = aiVals[cur]; if (lv < 6 || typeof v !== 'number') return false;
  if (!(v < -WINT && WIN + v >= 4)) return false;
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
// the player offers a draw: the AI accepts only when it stands clearly worse and the game has gone on for a while
function playerDraw() {
  if (!aiGameLive()) return;
  if (cur - drawAsked < 6) { toast(t('dr.wait'), 1800); return; }
  drawAsked = cur;
  const vs = aiVals.filter(x => typeof x === 'number'), v = vs.length ? vs[vs.length - 1] : 0;
  if (cur >= 40 && v <= -350 && v > -WINT) { toast(t('dr.accepted'), 1600); endManually({ over: true, winner: 0, draw: true, why: 'agree' }); }
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
  $('#resultDisc').innerHTML = st.winner ? `<div class="pdisc p${st.winner}${st.winner === P2 ? ' k' : ''}"></div>` : '';
  $('#resultTitle').textContent = st.draw ? t('res.draw') : youWin ? t('res.youWin') : aiWin ? t('res.aiWin') : t('res.pWin', { c: pname(st.winner) });
  let sub = (st.aiResigned ? t('dr.aiResigned') : t('res.why.' + st.why)) + '<br>' + t('res.sub', { n: moves.length });
  if (rgame) {
    const rx = rtSettle(st);
    if (rx) sub += `<br>${rx.pl ? Placement.resHtml(rx.pl) : `<span class="rt-res">R ${rx.old} → <b>${rx.now}</b> (${rtD(rx.d)})</span>`} · ${rtRank(rx.now)}<br><small style="color:var(--muted)">${t('rt.opp', { lv: rtLvName(rgame.lv), r: rgame.or })} · ${t('rt.side', { c: pname(humanColor) })}</small>`;
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
// AI同士 (watch): the 待った button is 停止 / 再開 (shared/watchpause.js); Ctrl+Z toggles it too
var wpPaused = false;
function wpActive() { return settings.mode === 'watch' && !lesson && !puzzle; }
function wpRender() {
  if (settings.mode !== 'watch') wpPaused = false;
  const on = wpActive() && !gameOver(moves.length), b = $('#btnUndo');
  if (window.WatchPause) WatchPause.set(b, on ? (wpPaused ? 'resume' : 'pause') : null, LANG);
  if (on) b.disabled = false;
}
function wpToggle() {
  if (!wpActive() || gameOver(moves.length)) return;
  if (!wpPaused) { wpPaused = true; busyToken++; cancelWorker('ai'); thinking = 0; renderInfo(); return; }
  wpPaused = false; cur = moves.length; reviewing = false; hintList = null;   // resume from the latest position
  update(false); afterPosition();
}
function undo() {
  if (wpActive()) { wpToggle(); return; }
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
  moves = moves.slice(0, cur); evals.length = cur + 1; reviewing = false; gameOverShown = false; manualEnd = null;
  update(false); save(); afterPosition();
}
function showOverlay(s) { $(s).classList.add('show'); }
function hideOverlay(s) { $(s).classList.remove('show'); }
function confetti() {
  if (!animOn()) return;
  const cols = ['#e6cd8c', '#fff6dc', '#ece1c8', '#2c2e34', '#b39249', '#7fd6a4'];
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
const VTAG = { copenhagen: 'Copenhagen', brandubh: 'Brandubh', tablut: 'Tablut' };
function recordText() {
  const pos = E.Pos.from(startSpec, gv), out = [];
  moves.forEach((m, i) => { out.push((i % 2 === 0 ? (i / 2 + 1) + '. ' : '') + mvIn(pos, m)); pos.play(m); });
  return `[${VTAG[gv]}] ` + out.join(' ');
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

// ---------------------------------------------------------------- small board pictures (rules, lesson / puzzle lists, design pickers)
// spec: { v, b: N*N chars '.adk', side } ; o: { cls, marks: {sq: 'ring'|'ng'|'x'|'dash'}, arrows: [[from, to]], esc: [squares],
//   click, sel, dest: [], last, crop: [r0, r1, c0, c1], bd, pcs }
const BD_KEYS = ['birch', 'oak', 'stone', 'fjord', 'leather'], PC_KEYS = ['bone', 'amber', 'red', 'mono'];
const BD_PAL = { birch: ['#e1c697', '#c9a56d', 'rgba(70,42,16,.5)', '#a8792f', 'rgba(70,40,10,.7)'], oak: ['#8a5a33', '#5e3a1e', 'rgba(255,226,170,.3)', '#3a2210', 'rgba(255,214,140,.6)'], stone: ['#a7aaa6', '#7d817d', 'rgba(30,34,36,.45)', '#5a3c2a', 'rgba(150,40,30,.75)'], fjord: ['#5d7f94', '#3b5b6b', 'rgba(220,240,255,.3)', '#1d3644', 'rgba(226,194,117,.75)'], leather: ['#9a4a32', '#6a2b1d', 'rgba(255,215,160,.3)', '#3c1610', 'rgba(242,207,122,.8)'] };
const PC_PAL = { bone: [['#2c2e34', '#050506'], ['#ece1c8', '#7a6a48']], amber: [['#2c2e34', '#050506'], ['#f0b44a', '#6b3d08']], red: [['#c8392d', '#3d0806'], ['#ece1c8', '#7a6a48']], mono: [['#262626', '#000'], ['#f6f6f4', '#86867f']] };
function designApply() {
  if (!BD_KEYS.includes(settings.bd)) settings.bd = 'birch';
  if (!PC_KEYS.includes(settings.pcs)) settings.pcs = 'bone';
  document.documentElement.dataset.bd = settings.bd; document.documentElement.dataset.pcs = settings.pcs;
}
const DESIGN_SPEC = { v: 'brandubh', b: E.START.brandubh, side: 1 };
function designPickers() {
  const r1 = $('#bdRow'), r2 = $('#pcRow'); if (!r1 || !r2) return;
  r1.innerHTML = BD_KEYS.map(k => `<button type="button" data-bd="${k}" class="${k === settings.bd ? 'sel' : ''}" aria-pressed="${k === settings.bd}">${miniSVG(DESIGN_SPEC, { cls: 'bdm', bd: k })}<span>${escHb(t('bd.' + k))}</span></button>`).join('');
  r2.innerHTML = PC_KEYS.map(k => `<button type="button" data-pcs="${k}" class="${k === settings.pcs ? 'sel' : ''}" aria-pressed="${k === settings.pcs}">${miniSVG(DESIGN_SPEC, { cls: 'bdm', pcs: k })}<span>${escHb(t('pcs.' + k))}</span></button>`).join('');
}
var CROP_UID = 0;
function miniSVG(spec, o) {
  o = o || {};
  const v = spec && spec.v || gv, n = E.RULES[v].n, F = E.geo(v).F;
  const u = 30 * 8 / Math.max(8, n) * (n <= 7 ? 1.15 : 1), pad = 6, W = n * u + pad * 2, X = i => pad + (i % n + 0.5) * u, Y = i => pad + (Math.floor(i / n) + 0.5) * u;
  const BP = BD_PAL[o.bd || settings.bd] || BD_PAL.birch, PP = PC_PAL[o.pcs || settings.pcs] || PC_PAL.bone;
  const cr = Array.isArray(o.crop) ? o.crop : null, inC = i => { if (!cr) return true; const r = Math.floor(i / n), c = i % n; return r >= cr[0] && r <= cr[1] && c >= cr[2] && c <= cr[3]; };
  let s = cr ? '' : `<svg class="${o.cls || 'mini'}" viewBox="0 0 ${W.toFixed(1)} ${W.toFixed(1)}">`;
  const gid = 'mw' + (++CROP_UID);
  s += `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BP[0]}"/><stop offset="1" stop-color="${BP[1]}"/></linearGradient></defs>`;
  s += `<rect x="1" y="1" width="${W - 2}" height="${W - 2}" rx="8" fill="#141c22" stroke="rgba(201,169,97,.5)"/><rect x="${pad}" y="${pad}" width="${n * u}" height="${n * u}" fill="url(#${gid})"/>`;
  for (let i = 0; i < n * n; i++) if (F[i] & 16) { const x = X(i), y = Y(i); s += `<rect x="${x - u / 2 + 1}" y="${y - u / 2 + 1}" width="${u - 2}" height="${u - 2}" rx="2" fill="${BP[3]}"/><circle cx="${x}" cy="${y}" r="${u * .26}" fill="none" stroke="${BP[4]}" stroke-width="1.3"/>`; }
  let d = ''; for (let k = 0; k <= n; k++) d += `M${pad + k * u},${pad}V${pad + n * u}M${pad},${pad + k * u}H${pad + n * u}`;
  s += `<path d="${d}" stroke="${BP[2]}" stroke-width="1" fill="none"/>`;
  if (o.last != null && o.last >= 0) s += `<rect x="${X(o.last) - u / 2}" y="${Y(o.last) - u / 2}" width="${u}" height="${u}" fill="rgba(255,222,130,.32)"/>`;
  for (const i of o.esc || []) s += `<rect x="${X(i) - u / 2}" y="${Y(i) - u / 2}" width="${u}" height="${u}" fill="rgba(127,214,164,.3)"/>`;
  for (const i of o.dest || []) s += `<circle cx="${X(i)}" cy="${Y(i)}" r="${u * .14}" fill="rgba(255,236,170,.95)" stroke="rgba(80,50,10,.5)"/>`;
  const b = spec && spec.b ? spec.b : '';
  for (let i = 0; i < n * n; i++) {
    const ch = b[i]; if (!ch || ch === '.' || !inC(i)) continue;
    const att = ch === 'a', king = ch === 'k', x = X(i), y = Y(i), r = u * (king ? 0.42 : 0.37), P = PP[att ? 0 : 1];
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${P[0]}" stroke="${king ? '#e2c275' : P[1]}" stroke-width="${king ? 2.2 : 1.4}"/><circle cx="${x}" cy="${y}" r="${r * 0.6}" fill="none" stroke="${att ? 'rgba(220,228,240,.25)' : 'rgba(120,100,60,.4)'}" stroke-width="1.1"/>`;
    if (king) s += `<path transform="translate(${x - r * 0.62},${y - r * 0.62}) scale(${r * 1.24 / 24})" d="M3 17.5 4.4 7.5l4.6 4.2L12 4.5l3 7.2 4.6-4.2 1.4 10z" fill="#f2d27a" stroke="#7a5a1c" stroke-width="1.4" stroke-linejoin="round"/>`;
  }
  if (o.sel != null && o.sel >= 0) s += `<circle cx="${X(o.sel)}" cy="${Y(o.sel)}" r="${u * 0.47}" fill="none" stroke="#ffe9a8" stroke-width="2.6"/>`;
  for (const k in o.marks || {}) {
    const vv = o.marks[k], x = X(+k), y = Y(+k);
    if (vv === 'x') s += `<path d="M${x - 7},${y - 7}L${x + 7},${y + 7}M${x + 7},${y - 7}L${x - 7},${y + 7}" stroke="#ff6b5b" stroke-width="3" stroke-linecap="round"/>`;
    else s += `<circle cx="${x}" cy="${y}" r="${u * 0.47}" fill="none" stroke="${vv === 'ng' ? '#ff6b5b' : vv === 'dash' ? 'rgba(255,255,255,.9)' : vv === 'esc' ? '#8fe3b8' : '#e2c275'}" stroke-width="2.4" ${vv === 'dash' ? 'stroke-dasharray="4 3"' : ''}/>`;
  }
  for (const a of o.arrows || []) {
    const pts = a.map(i => [X(i), Y(i)]); if (pts.length < 2) continue;
    const m = pts.length, [ax, ay] = pts[m - 2], [bx, by] = pts[m - 1], L = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / L, uy = (by - ay) / L;
    const ex = bx - ux * 9, ey = by - uy * 9, h = 6; pts[m - 1] = [ex, ey];
    const [sx0, sy0] = pts[0], [sx1, sy1] = pts[1], L0 = Math.hypot(sx1 - sx0, sy1 - sy0) || 1; pts[0] = [sx0 + (sx1 - sx0) / L0 * 8, sy0 + (sy1 - sy0) / L0 * 8];
    s += `<path d="M${pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L')}M${ex - ux * h - uy * h},${ey - uy * h + ux * h}L${ex},${ey}L${ex - ux * h + uy * h},${ey - uy * h - ux * h}" stroke="#ffe9a8" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (o.click) for (let i = 0; i < n * n; i++) s += `<rect data-p="${i}" x="${X(i) - u / 2}" y="${Y(i) - u / 2}" width="${u}" height="${u}" fill="transparent"/>`;
  if (!cr) return s + '</svg>';
  // cropped: only the part of the board in cr, enlarged, in a square frame; a cut side fades out
  const [r0, r1, c0, c1] = cr, FADE = .6 * u, id = 'tfc' + (++CROP_UID);
  const eT = r0 === 0, eB = r1 === n - 1, eL = c0 === 0, eR = c1 === n - 1;
  const x0 = eL ? 0 : pad + c0 * u - FADE, x1 = eR ? W : pad + (c1 + 1) * u + FADE, y0 = eT ? 0 : pad + r0 * u - FADE, y1 = eB ? W : pad + (r1 + 1) * u + FADE;
  const k = 100 / Math.max(x1 - x0, y1 - y0), bw = (x1 - x0) * k, bh = (y1 - y0) * k, ox = (100 - bw) / 2, oy = (100 - bh) / 2, f = FADE * k * .9, nn = q => +q.toFixed(2);
  const stops = (len, s0, s1) => `<stop offset="0" stop-color="#fff" stop-opacity="${s0 ? 1 : 0}"/><stop offset="${nn(s0 ? 0 : f / len)}" stop-color="#fff"/><stop offset="${nn(s1 ? 1 : 1 - f / len)}" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="${s1 ? 1 : 0}"/>`;
  return `<svg class="${o.cls || 'mini'} crop" viewBox="0 0 100 100"><defs>` +
    `<linearGradient id="${id}h" gradientUnits="userSpaceOnUse" x1="${nn(ox)}" y1="0" x2="${nn(ox + bw)}" y2="0">${stops(bw, eL, eR)}</linearGradient>` +
    `<linearGradient id="${id}v" gradientUnits="userSpaceOnUse" x1="0" y1="${nn(oy)}" x2="0" y2="${nn(oy + bh)}">${stops(bh, eT, eB)}</linearGradient>` +
    `<mask id="${id}H"><rect width="100" height="100" fill="url(#${id}h)"/></mask><mask id="${id}V"><rect width="100" height="100" fill="url(#${id}v)"/></mask></defs>` +
    `<g mask="url(#${id}V)"><g mask="url(#${id}H)"><svg x="${nn(ox)}" y="${nn(oy)}" width="${nn(bw)}" height="${nn(bh)}" viewBox="${nn(x0)} ${nn(y0)} ${nn(x1 - x0)} ${nn(y1 - y0)}">${s}</svg></g></g></svg>`;
}
// crop for the list thumbnails: an 11x11 board shrunk to ~90px makes the pieces tiny, so a position with few pieces shows only the
// part around them (and one square around, at least 6x6); 9 or more rows / columns → the whole board
function cropOf(spec, extra) {
  const n = E.RULES[spec.v || gv].n; if (n < 9) return null;
  const S = []; for (let i = 0; i < n * n; i++) if (spec.b[i] && spec.b[i] !== '.') S.push(i);
  for (const i of extra || []) if (i >= 0 && i < n * n) S.push(i);
  if (!S.length) return null;
  const rs = S.map(i => Math.floor(i / n)), cs = S.map(i => i % n);
  let r0 = Math.max(0, Math.min(...rs) - 1), r1 = Math.min(n - 1, Math.max(...rs) + 1), c0 = Math.max(0, Math.min(...cs) - 1), c1 = Math.min(n - 1, Math.max(...cs) + 1);
  const grow = (a, b, len) => { while (b - a + 1 < len) { if (b < n - 1 && (a <= 0 || n - 1 - b <= a)) b++; else a--; } return [a, b]; };
  [r0, r1] = grow(r0, r1, 6); [c0, c1] = grow(c0, c1, 6);
  const Wd = c1 - c0 + 1, Ht = r1 - r0 + 1;
  if (Wd < Ht) [c0, c1] = grow(c0, c1, Ht); else if (Ht < Wd) [r0, r1] = grow(r0, r1, Wd);
  if (r0 === 1) r0 = 0; if (c0 === 1) c0 = 0; if (r1 === n - 2) r1 = n - 1; if (c1 === n - 2) c1 = n - 1;
  return Math.max(c1 - c0, r1 - r0) + 1 >= 9 ? null : [r0, r1, c0, c1];
}
// position spec from square names: { v, a: ['d11', …], d: [...], k: 'f6', side }
function specOf(o) {
  const v = o.v || 'copenhagen', n = E.RULES[v].n, a = Array(n * n).fill('.');
  for (const x of o.a || []) a[E.sqParse(x, n)] = 'a'; for (const x of o.d || []) a[E.sqParse(x, n)] = 'd'; if (o.k) a[E.sqParse(o.k, n)] = 'k';
  return { v, b: a.join(''), side: o.side || P1 };
}
const sq = (s, v) => E.sqParse(s, E.RULES[v || 'copenhagen'].n);

// ---------------------------------------------------------------- rules: hands-on tutorial (shared/ruletour.js)
// The player moves pieces on small Copenhagen boards: moving, capturing, the special squares, the king's escape and capture.
// Shieldwalls, edge forts and the other endings are shown as pictures; tactics and strategy are left to the lessons.
function tourPage(id, spec, o) {
  return {
    id, title: () => t('tr.' + id + '.t'), body: () => t('tr.' + id + '.b').split('\n').map(x => `<p>${x}</p>`).join(''),
    task: () => t('tr.' + id + '.task'),
    setup(api) {
      const pos = E.Pos.from(spec);
      const st = { sel: -1, last: -1, busy: false, done: false };
      const draw = () => {
        if (!api.alive()) return;
        const dest = st.sel >= 0 ? pos.movesFrom(st.sel).map(mTo) : [];
        api.board.innerHTML = miniSVG(pos.spec(), { cls: 'tour', sel: st.sel, dest, last: st.last, click: !st.done && !st.busy, marks: o.marks ? o.marks(pos) : null });
      };
      function commit(m) {
        const before = pos.clone(); pos.play(m); st.sel = -1; st.last = mTo(m);
        if (pos.lastCaps.length) { sPlace(); sTake(100); } else sPlace();
        if (pos.res) sHorn(120, pos.res === P1);
        const r = o.check ? o.check(m, pos, before) : null;
        if (r === 'ok') { st.done = true; draw(); api.ok(t('tr.' + id + '.ok')); return; }
        if (typeof r === 'string') { st.done = true; draw(); api.ng(r); return; }
        draw();
      }
      function click(i) {
        if (pos.at(i) && (pos.at(i) === 1 ? P1 : P2) === pos.turn) {
          if (st.sel === i) { st.sel = -1; draw(); return; }
          if (!pos.movesFrom(i).length) { api.say(t('cant.stuck'), 'ng'); return; }
          st.sel = i; playTick(); api.say(''); draw(); return;
        }
        if (st.sel < 0) { api.say(t('pick.own')); return; }
        const m = st.sel + 256 * i;
        if (pos.movesFrom(st.sel).includes(m)) { commit(m); return; }
        api.say((E.geo(spec.v).F[i] & 16) && pos.at(st.sel) !== 3 ? t('cant.restricted') : t('cant.move'));
      }
      api.board.onclick = e => { const el = e.target.closest('[data-p]'); if (!el || st.busy || st.done || !api.alive()) return; ctx(); click(+el.dataset.p); };
      draw();
    },
  };
}
const tourRead = (id, html) => ({ id, title: () => t('tr.' + id + '.t'), body: () => t('tr.' + id + '.b').split('\n').map(x => `<p>${x}</p>`).join(''), html });
// page 1: what the game is (history / how to win / culture), read only — common spec
const introPage = () => ({ id: 'intro', title: () => t('intro.t'), body: '', html: () => RuleTour.intro({ lang: LANG, img: '../images/atlas/tafl.webp', origin: t('intro.origin'), players: t('intro.players'), time: t('intro.time'), history: t('intro.hist'), win: t('intro.win'), culture: t('intro.cult') }) });
const TS = (a, d, k, side, v) => specOf({ v, a, d, k, side });
const pic = (spec, o) => () => `<div class="tour-pic">${miniSVG(spec, Object.assign({ cls: '' }, o || {}))}</div>`;
const TOUR_PAGES = [
  introPage(),
  tourRead('board', pic({ v: 'copenhagen', b: E.START.copenhagen, side: 1 }, { marks: { 0: 'ring', 10: 'ring', 110: 'ring', 120: 'ring', 60: 'ring' } })),
  tourPage('move', TS(['d8', 'h3', 'b6'], ['f8', 'c5'], 'f6', P2), { check: m => 'ok' }),
  tourPage('capture', TS(['e7', 'c3', 'j9'], ['e8', 'h6'], 'f2', P2), { check: (m, a) => a.lastCaps.length ? 'ok' : t('tr.capture.ng') }),
  tourPage('hostile', TS(['b11', 'e4', 'h9'], ['d11', 'g5'], 'f2', P2), { check: (m, a) => a.lastCaps.length ? 'ok' : t('tr.hostile.ng') }),
  tourRead('safe', pic(TS(['e6', 'g6'], ['f6'], 'h2', P2), { marks: { [sq('f6')]: 'ring' } })),
  tourPage('escape', TS(['a3', 'h8', 'e9', 'c10'], ['g6', 'e6'], 'a7', P2), { check: (m, a) => a.res === P2 ? 'ok' : t('tr.escape.ng') }),
  tourPage('kingcap', TS(['e7', 'd6', 'f5', 'j6', 'b3'], ['c9', 'h4'], 'e6', P1), { check: (m, a) => a.res === P1 ? 'ok' : t('tr.kingcap.ng') }),
  tourRead('edge', pic(TS(['a6', 'c9', 'b7', 'b8'], ['a7', 'a8'], 'f6', P1), { marks: { [sq('a7')]: 'x', [sq('a8')]: 'x' }, arrows: [[sq('c9'), sq('a9')]] })),
  tourRead('fort', pic(TS(['c7', 'c3', 'd8', 'e2'], ['a5', 'b4', 'b3', 'a2'], 'a4', P1), { esc: [sq('a4'), sq('a3')] })),
  tourRead('ends', pic(TS(['d6', 'c5', 'e5', 'b4', 'f4', 'c3', 'e3', 'd2'], ['d5', 'c4', 'e4', 'd3'], 'd4', P2))),
  tourRead('variants', () => `<div class="tour-pic" style="gap:10px;display:flex;justify-content:center">${miniSVG({ v: 'brandubh', b: E.START.brandubh, side: 1 }, { cls: '' })}${miniSVG({ v: 'tablut', b: E.START.tablut, side: 1 }, { cls: '' })}</div>`),
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
    sound: k => { if (k === 'ok') sHorn(); },
  }));
}
function openRules(r, page) { selTab('rules'); showOverlay('#rulesOverlay'); if (page != null) tourFor().page = page; renderRules(); }
function closeRules() { if (TOUR) TOUR.stop(); hideOverlay('#rulesOverlay'); }
function renderRules() { const tour = tourFor(); tour.open(tour.page); }
$('#rulesClose').onclick = () => closeRules();

// ---------------------------------------------------------------- new game dialog
let draft = {};
function levelLabelHTML(v) { return `${LV(v)}<small>${LVD(v)}</small>`; }
function ruleIcon(r) {
  const n = E.RULES[r].n, u = 40 / n, F = E.geo(r).F, b = E.START[r];
  let s = `<svg viewBox="0 0 44 44"><rect x="0.5" y="0.5" width="43" height="43" rx="6" fill="#d9bd8a" stroke="rgba(201,169,97,.5)"/>`;
  for (let i = 0; i < n * n; i++) { const x = 2 + (i % n) * u, y = 2 + Math.floor(i / n) * u; if (F[i] & 16) s += `<rect x="${x}" y="${y}" width="${u}" height="${u}" fill="#8a5f22"/>`; if (b[i] !== '.') s += `<circle cx="${x + u / 2}" cy="${y + u / 2}" r="${u * .36}" fill="${b[i] === 'a' ? '#26282d' : '#f4ead2'}" ${b[i] === 'k' ? 'stroke="#c9a961" stroke-width="1"' : ''}/>`; }
  return s + '</svg>';
}
function renderRuleCards() {
  $('#ruleCards').innerHTML = RULE_ORDER.map(r => `<button class="rulecard ${draft.rule === r ? 'sel' : ''}" data-r="${r}">${ruleIcon(r)}<b>${t('rule.' + r)}</b><small>${t('rule.' + r + '.d')}${r === 'copenhagen' ? ` <span class="std">${t('rule.std')}</span>` : ''}</small></button>`).join('');
}
function segSync() {
  document.querySelectorAll('#segMode button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.mode));
  document.querySelectorAll('#segColor button').forEach(b => b.classList.toggle('sel', +b.dataset.v === draft.color));
  const m = draft.mode, game = m === 'ai' || m === 'pvp' || m === 'watch';
  $('#fRatedInfo').classList.toggle('hidden', m !== 'rated');
  if (m === 'rated') $('#rtStats').innerHTML = rtStatsHtml();
  $('#fRules').classList.toggle('hidden', !game);
  if (game) renderRuleCards();
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
  draft = { mode: lesson ? 'lesson' : puzzle ? 'puzzle' : rgame && settings.mode === 'ai' ? 'rated' : settings.mode === 'online' ? 'pvp' : settings.mode, color: settings.color, level: settings.level, level2: settings.level2, rule: settings.rule };
  $('#optEval').checked = settings.eval; $('#optLast').checked = settings.last; $('#optAnim').checked = settings.anim; $('#optThreat').checked = settings.threat; $('#optNum').checked = settings.num;
  segSync(); designPickers(); showOverlay('#newOverlay');
}
$('#bdRow').addEventListener('click', e => { const b = e.target.closest('button[data-bd]'); if (!b) return; settings.bd = b.dataset.bd; designApply(); designPickers(); save(); });
$('#pcRow').addEventListener('click', e => { const b = e.target.closest('button[data-pcs]'); if (!b) return; settings.pcs = b.dataset.pcs; designApply(); designPickers(); save(); });
$('#segMode').onclick = e => { const b = e.target.closest('button'); if (b && b.dataset.v) { draft.mode = b.dataset.v; segSync(); } };
$('#segColor').onclick = e => { const b = e.target.closest('button'); if (b) { draft.color = +b.dataset.v; segSync(); } };
$('#ruleCards').onclick = e => { const b = e.target.closest('.rulecard'); if (b) { draft.rule = b.dataset.r; segSync(); } };
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
  Object.assign(settings, { mode: draft.mode, color: draft.color, level: draft.level, level2: draft.level2, rule: draft.rule || settings.rule });
  newGame();
};

// ====================================================================== rated games vs the AI (solo, Copenhagen rules)
const RT_STORE = STORE + '-rated', RT_START = 1000, RT_CLOCK = { base: 420000, inc: 4000 };
// rating of each AI step (15級 = 450): measured by self-play of adjacent levels, both sides, smoothed (MODEL_CARD.md)
const RT_LV = [0, 450, 570, 670, 790, 960, 1030, 1100, 1160, 1230, 1290, 1390, 1480, 1580, 1670, 1760, 1880, 1960, 2040, 2120, 2200];
// the defenders' advantage at equal strength (Elo, fitted from the same self-play per level, smoothed): a player who takes the
// defenders is expected to score as if RT_SIDE_LV[level] points stronger; it grows with the level (strong attackers rarely break through)
const RT_SIDE_LV = [0, 30, 30, 30, 30, 70, 70, 70, 70, 70, 200, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350];
const RT_SIDE = lv => RT_SIDE_LV[Math.max(1, Math.min(20, lv || 1))];
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
function rtClockLeft(c) {   // c: 0 attackers, 1 defenders
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
  const adj = humanColor === P2 ? RT_SIDE(R.lv) : -RT_SIDE(R.lv);   // the side played: the defenders are expected to score more
  const old = S.r, pl = Placement.on(S) ? Placement.record(S, R.or - adj, sc) : null;   // 予備選: the first 3 games set the rating
  const K = S.n < 10 ? 48 : 24, Ex = 1 / (1 + Math.pow(10, (R.or - old - adj) / 400));
  const now = pl ? pl.r : Math.max(0, Math.round(old + K * (sc - Ex)));
  S.r = now; S.n++; if (sc === 1) S.w++; else if (sc === 0) S.l++; else S.d++;
  S.hist.push({ id: R.id, t: Date.now(), lv: R.lv, or: R.or, s: sc, d: now - old, r: now, why: st.why, side: humanColor, pl: pl ? pl.k : undefined });
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
  toast(t('rt.vs', { lv: rtLvName(pk.lv), r: pk.or, tag: t('rt.' + pk.tag) }) + ' · ' + t('rt.side', { c: pname(humanColor) }), 4000);
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
  if (h.length) html += `<div class="rt-lbl2">${t('rt.recent')}</div><div class="rt-hist">` + h.map(x => { const c = x.s === 1 ? 'w' : x.s === 0 ? 'l' : 'd'; return `<span class="rt-chip ${c}" title="${rtLvName(x.lv)} · R${x.or}${x.side ? ' · ' + pname(x.side) : ''}"><i>${t('rt.' + c.toUpperCase())}</i><b>${rtD(x.d)}</b></span>`; }).join('') + '</div>';
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
function stashGame() { if (!lesson && !puzzle) savedGame = { gv, moves, cur, evals: evals.slice(), humanColor }; }
function exitSpecial() {
  if (!lesson && !puzzle) return;
  lesson = null; puzzle = null; lessonMarks = []; labelList = null;
  document.body.classList.remove('in-lesson', 'in-puzzle');
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false;
  startSpec = null;
  if (savedGame) { setVariant(savedGame.gv); moves = savedGame.moves; cur = savedGame.cur; evals = savedGame.evals; humanColor = savedGame.humanColor; savedGame = null; }
  else { setVariant(settings.rule); moves = []; cur = 0; evals = []; }
  drawLines();
  reviewing = cur !== moves.length; hintList = null;
  gameOverShown = gameOver(moves.length);
}
function quitSpecial() { exitSpecial(); update(false); afterPosition(); }
function showLessonView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); if (v === 'lessonDoneView') lsDoneLabel(); }
// lesson list (same layout as Gomoku / Morris): a tab per course, a banner, cards with a board picture and a short explanation
const LS_ICON = {
  basics: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#ece1c8" stroke="#7a6a48" stroke-width="1.5"/><path d="M5 16 6.4 8.5l3.4 3L12 6l2.2 5.5 3.4-3L19 16z" fill="#f2d27a" stroke="#7a5a1c" stroke-width=".8"/></svg>',
  tactics: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="4" fill="#2c2e34" stroke="#000"/><circle cx="12" cy="12" r="4" fill="#ece1c8" stroke="#7a6a48"/><circle cx="19" cy="12" r="4" fill="#2c2e34" stroke="#000"/><path d="M9 6l6 12M15 6 9 18" stroke="#ff6b5b" stroke-width="1.6" stroke-linecap="round"/></svg>',
  strategy: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" fill="#d9bd8a"/><path d="M3 3h5v5H3zM16 3h5v5h-5zM3 16h5v5H3zM16 16h5v5h-5z" fill="#8a5f22"/><circle cx="12" cy="12" r="3" fill="#f4ead2" stroke="#c9a961"/></svg>',
  variants: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="9" height="9" rx="1.5" fill="#d9bd8a"/><rect x="13" y="10" width="9" height="9" rx="1.5" fill="#c9a56d"/><circle cx="6.5" cy="9.5" r="1.8" fill="#f4ead2"/><circle cx="17.5" cy="14.5" r="1.8" fill="#26282d"/></svg>',
};
const lsIcon = k => `<span class="ic sv">${LS_ICON[k] || '●'}</span>`;
const plainText = html => String(html || '').replace(/<br\s*\/?>|<\/p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const lxBar = (p, cls) => `<span class="lx-bar ${cls || ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span>`;
const lxSt = (r, okTxt) => r ? (r[okTxt ? 'pass' : 'clear'] ? `<span class="lx-st ok">✓ ${okTxt ? '' : t('ls.clear') + ' '}${t('u.pt', { n: r.best })}</span>` : `<span class="lx-st">${t('u.pt', { n: r.best })}</span>`) : `<span class="lx-st new">${t('ls.notyet')}</span>`;
// a lesson diagram: { s: spec, marks: [[sq, kind]], arrows: [[from, to]], esc: [squares] }
function diagSVG(d, cls, crop) {
  const n = E.RULES[d.s.v].n, marks = {}; for (const [x, k] of d.marks || []) marks[E.sqParse(x, n)] = k;
  return miniSVG(d.s, { cls, marks, arrows: (d.arrows || []).map(a => a.map(x => E.sqParse(x, n))), esc: (d.esc || []).map(x => E.sqParse(x, n)), crop });
}
function lessonThumb(s) {
  const d = s.diagram;
  if (d) return diagSVG(d, 'lxb', cropOf(d.s));
  const P = s.problems[0]; return P && P.s ? miniSVG(P.s, { cls: 'lxb', crop: cropOf(P.s) }) : '';
}
const pzThumbSVG = (T, j, P) => miniSVG(P.s, { cls: 'lxb', crop: cropOf(P.s) });
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
      `<span class="lx-top"><span class="lx-no">STEP ${stepNo(i)}</span>${s.v && s.v !== 'copenhagen' ? `<span class="lx-bd b2">${t('rule.' + s.v)}</span>` : ''}${lxSt(r)}</span><b class="lx-t">${t('ls.' + s.id + '.title')}</b><small class="lx-sub">${t('ls.' + s.id + '.sub')}</small>` +
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
  if (spec && spec.v && spec.v !== gv) { setVariant(spec.v); drawLines(); }
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
  $('#lsPrompt').innerHTML = `<div class="ls-goal"><span class="pdisc p${me}${me === P2 ? ' k' : ''}"></span><span>${t('ls.turn', { c: pname(me) })} ${lesson.virt ? t('op.goal') : t('ls.' + s.id + '.goal')}</span></div>`;
  $('#lsHint').textContent = t('ls.hint');
  $('#lsDots').innerHTML = s.problems.map((_, i) => { const r = lesson.results[i]; return `<i class="${r === undefined ? '' : r >= 16 ? 'ok' : r >= 10 ? 'mid' : 'ng'} ${i === lesson.i ? 'cur' : ''}"></i>`; }).join('');
  $('#lsNext').textContent = lesson.i + 1 < n ? t('ls.next') : t('ls.result');
  $('#lsNext').disabled = !lesson.answered;
  $('#lsHint').disabled = lesson.answered;
}
function problemPoints(P, m) {
  if (P.ok) return P.ok.includes(m) ? 20 : 0;
  const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;
  if (mine >= best - 15 && !(best > WINT && mine < best)) return 20;
  if (best > WINT && mine > WINT) return 16;          // a slower forced win
  if (best > WINT && mine <= WINT) return mine > -WINT && mine >= 300 ? 8 : mine > -100 ? 4 : 0;
  if (mine < -WINT && best >= -WINT) return 0;
  const loss = sOfV(best) - sOfV(mine);
  return Math.max(0, Math.round(20 * (1 - loss / 0.5)));
}
function markMove(pos, mm, cls) { lessonMarks.push({ arrow: [mFrom(mm), mTo(mm)], cls }); lessonMarks.push({ at: mTo(mm), cls }); }
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
    // back to the problem: the answer (gold), your move (red) and the values of the best landing squares
    moves = []; cur = 0; sel = null; lessonMarks = [];
    markMove(pos0, best, 'ok'); if (m !== best) markMove(pos0, m, 'ng');
    const g = new Map(); for (const [mm, v] of P.sc.slice().sort((a, b) => b[1] - a[1]).slice(0, 6).concat(P.sc.filter(e => e[0] === m))) { const k = mTo(mm); if (!g.has(k) || v > g.get(k)) g.set(k, v); }
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

// ====================================================================== openings (opening plans, studied move by move, then practice)
let OPEN = null, openChoiceIdx = -1;
const openReady = fetch('openings.json?v=1').then(r => r.json()).then(d => (OPEN = d)).catch(() => null)
  .then(() => { if (!OPEN) document.querySelectorAll('.ls-tabs button[data-v=open]').forEach(b => b.remove()); });
const OP_STORE = STORE + '-open';
function opProg() { try { return JSON.parse(localStorage.getItem(OP_STORE) || '{}'); } catch (e) { return {}; } }
const LL = o => o ? (o[LANG] !== undefined ? o[LANG] : o.en !== undefined ? o.en : o.ja) : '';
const opShort = g => LL(g.short);
const opIntro = g => LL(g.intro) || [];
let opGrpSel = '';
function lineSpec(line) { return E.replay(null, line, 'copenhagen').pos.spec(); }
function opThumb(g) {
  const k = g.show || 4, pre = g.study.line.slice(0, k), key = pre[pre.length - 1];
  return miniSVG(lineSpec(pre), { cls: 'lxb', last: key !== undefined ? mTo(key) : -1 });
}
async function openOpenings(grp) {
  await openReady; selTab('open');
  if (!OPEN) { toast(t('ls.fail')); return; }
  $('#lsListTitle').textContent = t('op.title'); $('#lsListDesc').textContent = t('op.desc');
  const pr = opProg(), grps = [...new Set(OPEN.sets.map(g => g.grp))];
  if (grp) opGrpSel = grp; if (!grps.includes(opGrpSel)) opGrpSel = grps[0];
  const G0 = opGrpSel, stat = k => { const L = OPEN.sets.filter(g => g.grp === k); return { n: L.length, ok: L.filter(g => pr[g.id] && pr[g.id].pass).length }; }, q = stat(G0);
  const icon = k => `<span class="ic"><span class="pdisc p${k === 'att' ? 1 : 2}${k === 'att' ? '' : ' k'}"></span></span>`;
  const cards = OPEN.sets.map((g, i) => {
    if (g.grp !== G0) return '';
    const r = pr[g.id];
    return `<button class="lx-card${r && r.pass ? ' clear' : ''}" data-o="${i}"><span class="lx-th">${opThumb(g)}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">${g.moves}</span>${lxSt(r, true)}</span>` +
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
  openChoiceIdx = i; const g = OPEN.sets[i], pre = g.study.line.slice(0, g.show || 4), last = pre[pre.length - 1];
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
  enterSpecial(null); setVariant('copenhagen'); drawLines();
  showStudy(false);
}
function showStudy(anim) {
  const L = lesson, g = L.g, st = g.study, i = L.i, Nn = st.line.length;
  moves = st.line.slice(0, i); cur = i; lessonMarks = []; labelList = null; hintList = null;
  update(anim);
  $('#lsStep').textContent = `${t('op.study')} · ${i}/${Nn}`;
  $('#lsTitle').textContent = LL(g.title);
  $('#lsDots').innerHTML = `<span class="study-bar"><span style="width:${Math.round(i * 100 / Nn)}%"></span></span>`;
  let pr, fb = '';
  if (i === 0) { pr = t('op.studyStart'); fb = opIntro(g).join('<br>'); }
  else {
    const side = (i - 1) % 2 ? P2 : P1;
    pr = `<span class="pdisc p${side}"></span><b style="font-size:16px"><bdi>${Math.floor((i - 1) / 2) + 1}${side === P1 ? '.' : '...'} ${mvAt(i - 1)}</bdi></b>`;
    const note = st.notes && st.notes[i - 1]; fb = note ? LL(note) : '';
  }
  if (i === Nn) fb += (fb ? '<br>' : '') + `<b style="color:var(--brass)">${t('op.studyEnd')}</b>`;
  fb += `<br><button class="op-play" id="lsPlayHere">${t('op.playHere')}</button>`;
  $('#lsPrompt').innerHTML = `<div class="ls-goal">${pr}</div>`; $('#lsFb').innerHTML = fb;
  { const c = $('#lessonCard'); lesson.cardMin = Math.max(lesson.cardMin || 0, c.offsetHeight); c.style.minHeight = lesson.cardMin + 'px'; }
  $('#lsHint').textContent = t('op.prev'); $('#lsHint').disabled = i === 0;
  $('#lsNext').textContent = i === Nn ? t('op.toPractice') : t('op.next'); $('#lsNext').disabled = false;
  stSync();
}
// ---- opening study: compact step bar (phones) + autoplay (about one move every 1.2 s; any tap / key stops it)
var stTimer = 0;
function stStop() { if (stTimer) { clearInterval(stTimer); stTimer = 0; } stSync(); }
function stTo(to) {
  const Nn = lesson.g.study.line.length;
  if (to < 0 || to > Nn || to === lesson.i) return;
  const one = to === lesson.i + 1; lesson.i = to; showStudy(one);
}
function stGo(what) {
  if (!lesson || !lesson.study) return;
  const Nn = lesson.g.study.line.length;
  if (what === 'auto') {
    if (stTimer) { stStop(); return; }
    if (lesson.i >= Nn) { lesson.i = 0; showStudy(false); }
    const L0 = lesson;
    stTimer = setInterval(() => { if (lesson !== L0 || !lesson.study || lesson.i >= Nn) { stStop(); return; } stTo(lesson.i + 1); if (lesson.i >= Nn) stStop(); }, 1200);
    stSync(); return;
  }
  if (stTimer) stStop();
  stTo(what === 'first' ? 0 : what === 'last' ? Nn : what === 'prev' ? lesson.i - 1 : lesson.i + 1);
}
function stSync() {
  const on = !!(lesson && lesson.study), nav = document.getElementById('stNav'), au = document.getElementById('lsAuto');
  if (!nav || !au) return;
  document.body.classList.toggle('in-study', on);
  au.classList.toggle('hidden', !on);
  if (!on) { document.body.classList.remove('st-end'); const lc = document.getElementById('lessonCard'); if (lc) lc.style.minHeight = ''; if (stTimer) { clearInterval(stTimer); stTimer = 0; } return; }
  const Nn = lesson.g.study.line.length, i = lesson.i, q = k => nav.querySelector('[data-sn="' + k + '"]');
  document.body.classList.toggle('st-end', i >= Nn);
  document.getElementById('stPos').textContent = i + ' / ' + Nn;
  q('first').disabled = q('prev').disabled = i === 0;
  q('next').disabled = q('last').disabled = i >= Nn;
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
  Object.assign(settings, { mode: 'ai', rule: 'copenhagen' }); setVariant('copenhagen'); drawLines(); humanColor = side; rgame = null;
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

// ====================================================================== puzzles: the king escapes / is captured within N moves (PZBook v2)
let PUZZLES = null;
const puzzlesReady = fetch('puzzles.json?v=1').then(r => r.json()).then(d => (PUZZLES = d)).catch(() => null);
let pzLevel = 0;
const pzKey = (id, j) => id + '-' + j;
const starVal = x => x === true ? 3 : (+x || 0);
function pzAt(T, j) { return T.puzzles[j]; }
function pzRecs(T, pr) { pr = pr || pzProgress(); return T.puzzles.map((_, j) => starVal(pr[pzKey(T.id, j)])); }
function themeTier(T) { const n = T.puzzles.reduce((a, P) => a + (P.n || 1), 0) / Math.max(1, T.puzzles.length); return Math.max(0, Math.min(5, Math.round((n - 1) * 1.4 + (T.v === 'copenhagen' ? 1 : 0)))); }
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
// collection home (PZBook.home): hero → daily → tabs 逃げる / 捕らえる / 変則ルール → theme cards with the position
const PZ_LAST = STORE + '-pz-last', PZ_TAB = STORE + '-pz-tab', PZ_GRPS = ['Esc', 'Cap', 'Var'], PZ_GIC = { Esc: 'trophy', Cap: 'bolt', Var: 'crown' };
const PZ_TSVG = {
  esc: '<path d="M4 20V4h16"/><path d="M9 15l6-6M11 9h4v4"/>',
  cap: '<circle cx="12" cy="12" r="3"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>',
};
const pzBadge = T => `<svg viewBox="0 0 24 24" aria-hidden="true">${PZ_TSVG[T.goal] || PZ_TSVG.esc}</svg>`;
function pzThumbOf(T, j) { if (j < 0) j = T.puzzles.length - 1; const P = pzAt(T, j); return P && P.s ? { board: pzThumbSVG(T, j, P), tm: `<span class="pdisc p${P.s.side}"></span>` } : { board: '' }; }
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
  $('#pzLevelHead').innerHTML = PZBook.ghead({ badge: pzBadge(L), name: t('pz.th.' + L.id), desc: t('pz.th.' + L.id + '.sub'), chips: [t('rule.' + L.v), t('pz.grp' + L.grp), PZBook.t('count', { n: L.puzzles.length })], tier: themeTier(L) });
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
function startPuzzle(L, j, daily) {
  hideOverlay('#puzzleOverlay');
  stashGame(); lesson = null; document.body.classList.remove('in-lesson');
  const T = PUZZLES.themes[L], P = pzAt(T, j);
  if (!daily) PZBook.lastSet(PZ_LAST, L);
  puzzle = { L, j, P, T, goal: T.goal, me: P.s.side, n: P.n, state: 'play', busy: false, used: 0, daily: daily || null, hinted: false, failed: false, answered: false };
  document.body.classList.add('in-puzzle');
  enterSpecial(P.s);
  update(false); renderPuzzleCard(); pzStatus(t('pz.start'));
}
function renderPuzzleCard() {
  const Pz = puzzle, L = Pz.T;
  $('#pzStep').textContent = Pz.daily ? `★ ${t('daily.title')} · ${Pz.daily.slice(5).replace('-', '/')}` : `${t('pz.th.' + L.id)} · ${PZBook.t('stage', { n: Math.floor(Pz.j / PZBook.STAGE) + 1 })} · No.${Pz.j + 1}`;
  $('#pzTitle').textContent = t(Pz.goal === 'cap' ? 'pz.capIn' : 'pz.escIn', { n: Pz.n });
  $('#pzGoal').innerHTML = `<span class="pdisc p${Pz.me}${Pz.me === P2 ? ' k' : ''}"></span><span>${t(Pz.goal === 'cap' ? 'pz.goalCap' : 'pz.goalEsc', { c: pname(Pz.me), n: Pz.n })}</span>`;
  $('#pzDots').innerHTML = Array.from({ length: Pz.n }, (_, i) => `<i class="${i < Pz.used ? (Pz.bad && Pz.bad.includes(i) ? 'ng' : 'ok') : ''} ${i === Pz.used && Pz.state === 'play' ? 'cur' : ''}"></i>`).join('');
  $('#pzNext').disabled = !!Pz.daily || Pz.j + 1 >= L.puzzles.length || !PZBook.isOpen(pzRecs(L), Pz.j + 1);
  $('#pzHint').disabled = Pz.state !== 'play'; $('#pzAnswer').disabled = Pz.busy;
  renderInfo();
}
function pzStatus(html) { $('#pzStatus').innerHTML = html; }
// engine.c puzzle(): defend = 0 → need = the solver's own moves to its win after each move (0 = not within n);
// defend = 1 (the opponent to move) → need = moves the solver still needs after each reply (0 = escaped)
function mateReq(n, defend) { return request('ai', { type: 'puzzle', moves: moves.slice(0, cur), n, defend: !!defend }).then(r => r && r.list); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function pickDefence(list) { let best = null; for (const e of list) { const v = e.need === 0 ? 99 : e.need < 0 ? 50 : e.need; if (!best || v > best.v) best = { m: e.m, v }; } return best.m; }
function pickAttack(list, left) { let best = null; for (const e of list) if (e.need > 0 && e.need <= left && (!best || e.need < best.need)) best = e; return best && best.m; }
const pzReached = (Pz, pos) => { const j = E.judge(pos, []); return j.over && j.winner === Pz.me; };
// ---- puzzles v2: a wrong move does not end the puzzle at once. The opponent (the engine's best reply) answers and the
// player may keep going until the puzzle's move count is used up; reaching the goal within it still counts (★★).
// "Obvious mistake" (flagged at once; the move is taken back and the correct move shown): after the move the opponent
// wins with its very next move.
function pzBlunder(Pz, before, m) {
  const after = before.clone().play(m);
  if (after.res) return null;
  if (after.moves().some(x => { const q = after.clone().play(x); return q.res && q.res !== Pz.me; })) return 'lose';
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
      await failBack(good.length ? `<b class="ng">${t('pz.fail')}</b> ${t(Pz.goal === 'cap' ? 'pz.failCap' : 'pz.failEsc', { m: mvIn(before, m), b: mvIn(before, good[0].m), n: Pz.n })}`
        : `<b class="ng">${t('pz.fail')}</b> ${PZBook.t('outOfMoves', { n: Pz.n })}`);
      return;
    }
    const why = pzBlunder(Pz, before, m);
    if (why) { await failBack(`<b class="ng">${PZBook.t('blunder')}</b> ${t('pz.bl.' + why, { n: Pz.n, m: mvIn(before, m) })}${good.length ? ' ' + t('pz.best', { b: mvIn(before, good[0].m) }) : ''}`); return; }
    // not the solution, but play on: the opponent answers with the engine's best move
    Pz.failed = true; Pz.strayed = true; (Pz.bad = Pz.bad || []).push(Pz.used - 1);
    renderPuzzleCard();
    pzStatus(t('pz.checking'));
    const res = await request('ai', { type: 'think', moves: moves.slice(0, cur), level: 16 });
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
  if (pzReached(Pz, posAt(cur).pos)) { puzzleSolved(); return; }
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
  pzStatus(`<b class="ok">${t('pz.solved')}</b> ${t(Pz.goal === 'cap' ? 'pz.solvedCap' : 'pz.solvedEsc', { n: Pz.used })}` + (Pz.daily ? `<br>🔥 ${t('daily.streak', { n: dailyInfo().streak })}` : '') + PZBook.solved({ stars, recs: after, j: Pz.j, events: ev }));
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
  for (let step = 0; step < 16; step++) {
    if (puzzle !== Pz) return;
    const pos = posAt(cur).pos;
    if (statusAt(cur).over) break;
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
  const game = moves.slice(), key = gameKey(), st0 = startSpec, v0 = gv;
  const run = rv = { key, list: [], done: 0, total: game.length, running: true, ws: [] };
  for (let k = 0; k < RV_WORKERS; k++) run.ws.push(makeWorker());
  rvOpen = true; renderReview(); revealReview();
  let next = 0;
  const loop = async w => {
    while (next < game.length && rv === run) {
      const i = next++, pk = startKey() + '|' + game.slice(0, i).join(',');
      let list = anaCache.get(pk);
      if (!list) {
        const res = await new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve }); w.postMessage({ type: 'analyze', start: st0, v: v0, moves: game.slice(0, i), time: i < 10 ? 500 : 800, id }); });
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
  const word = v => t(v > WINT ? 'rv.win' : v < -WINT ? 'rv.loss' : 'rv.even');
  if ((best.v > WINT && mine.v <= WINT) || (best.v >= -WINT && mine.v < -WINT)) { q = 'bad'; desc = `${word(best.v)}→${word(mine.v)}`; }
  else if (loss >= 0.3) { q = 'bad'; desc = t('rv.eval', { l: ((best.v - mine.v) / 100).toFixed(1) }); }
  else if (loss >= 0.12) { q = 'dubious'; desc = t('rv.eval', { l: ((best.v - mine.v) / 100).toFixed(1) }); }
  const ok = !q && mine.v >= best.v - 20;
  return { q, ok, desc, best: best.m, m, loss };
}
// 振り返り解説: the move being viewed is explained; at the end of the game a short summary
const crName = (pos, x) => '<bdi>' + mvIn(pos, x) + '</bdi>';
const oppWinsNext = q => !q.res && q.moves().some(x => { const r = q.clone().play(x); return r.res && r.res !== q.turn ? false : !!r.res; });
function crExplain(i, j) {   // { kind, txt } for move i (played from position i)
  const pos = posAt(i).pos, m = j.m, b = j.best, me = pos.turn;
  if (pos.moves().length === 1) return { kind: '', txt: t('cr.forced') };
  if (!j.q) {
    const caps = pos.capsOf(m).length;
    if (j.ok) return { kind: caps ? 'goodCap' : '', txt: caps ? t('cr.bestCap', { n: caps }) : t('cr.best') };
    return { kind: '', txt: t('cr.good', { b: crName(pos, b) }) };
  }
  const am = pos.clone().play(m), ab = pos.clone().play(b);
  if (ab.res === me) return { kind: me === P2 ? 'missEsc' : 'missKill', txt: t(me === P2 ? 'cr.missEsc' : 'cr.missKill', { b: crName(pos, b) }) };
  if (oppWinsNext(am) && !oppWinsNext(ab)) return { kind: me === P1 ? 'allowEsc' : 'allowCapK', txt: t(me === P1 ? 'cr.allowEsc' : 'cr.allowCapK', { b: crName(pos, b) }) };
  const cm = pos.capsOf(m).length, cb = pos.capsOf(b).length;
  if (cb > cm) return { kind: 'missCap', txt: t('cr.missCap', { b: crName(pos, b) }) };
  const lostM = threatened(am, me).size, lostB = threatened(ab, me).size;
  if (lostM > lostB) return { kind: 'allowCap', txt: t('cr.allowCap', { b: crName(pos, b) }) };
  if (me === P1 && am.kingLines().length === 0) { const kmM = am.clone(); kmM.turn = P2; const thM = kmM.moves().filter(x => x % 256 === am.king).some(x => kmM.clone().play(x).kingLines().length >= 2); const kmB = ab.clone(); kmB.turn = P2; const thB = kmB.moves().filter(x => x % 256 === ab.king).some(x => kmB.clone().play(x).kingLines().length >= 2); if (thM && !thB) return { kind: 'allowFork', txt: t('cr.allowFork', { b: crName(pos, b) }) }; }
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
  svgArrow(svg, [mFrom(m), mTo(m)], 'pl');
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
const rvbPath = (p, m) => [mFrom(m), mTo(m)];
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
  (e.pv || []).slice(0, 3).forEach((m, k) => { if (!p.moves().includes(m)) return; svgArrow(svg, rvbPath(p, m), 'rvb2'); const d = fxDiv('rvb-n', mTo(m)); d.textContent = String(k + 2); p = p.clone().play(m); });
  const d0 = fxDiv('rvb-n first', mTo(e.m)); d0.textContent = '1';
}
const rvbDot = p => `<i style="background:${p === P1 ? '#2e2e2e;box-shadow:inset 0 0 0 1.5px #9a9a9a' : '#efe5cf'}"></i>`;
function rvbLine(pos, list, n0) { let p = pos.clone(), out = []; for (const m of list) { if (!p.moves().includes(m)) break; out.push((n0 ? (n0 + out.length) + '.' : '') + mvIn(p, m)); p = p.clone().play(m); } return out.join(' '); }
function rvbLeft() {
  if (rv.running) return `<p class="rvb-dim">${BOX.t('analyzing', { a: rv.done, b: rv.total })}</p>`;
  let h = rvCoach().replace(/class="cr-see" data-i=/g, 'class="cr-see rvb-see" data-goto=');
  if (cur >= moves.length) { const st = statusAt(moves.length); h = `<div class="rvb-h">${st.over ? (st.winner ? t('res.pWin', { c: pname(st.winner) }) : t('res.draw')) + ' · ' : ''}${t('info.moves', { n: moves.length })}</div>` + h; }
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
      req: { start: startSpec, v: gv, moves: moves.slice(0, cur), time: 1200, k: 5, plies: 7 },
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
  onHover: e => { rvbHov = e ? { e, k: kenSwap(() => keyOf(cur)) } : null; renderFx(); },
  onPick: e => kenPick(e), onKen: () => kenStart(), onBack: () => kenBack(), onReset: () => kenReset(),
  onGoto: i => viewAt(i), onLayout: () => { renderInfo(); renderFx(); }
});

// ====================================================================== share / load
const K64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
// 3 characters per move: from * 128 + to in base 64 (the same code as online play)
const encMove = m => { const x = mFrom(m) * 128 + mTo(m); return K64[x >> 12] + K64[(x >> 6) & 63] + K64[x & 63]; };
function encMoves(list) { return list.map(encMove).join(''); }
function decMoves(s, start, v) {
  if (!/^[A-Za-z0-9_-]*$/.test(s) || s.length % 3) return null;
  const pos = E.Pos.from(start || null, v), out = [];
  for (let i = 0; i < s.length; i += 3) {
    const x = (K64.indexOf(s[i]) << 12) | (K64.indexOf(s[i + 1]) << 6) | K64.indexOf(s[i + 2]), m = (x >> 7) + 256 * (x & 127);
    if (!pos.moves().includes(m)) return null;
    out.push(m); pos.play(m);
  }
  return out;
}
// "[Copenhagen] 1. d11-d9 f5-f9 2. ..." or a share URL
function parseGameText(v) {
  v = (v || '').trim();
  const h = v.match(/#(.*)$/);
  if (h) { const q = new URLSearchParams(h[1]); if (!q.has('k')) return null; const vr = RULE_ORDER.includes(q.get('v')) ? q.get('v') : 'copenhagen'; const list = decMoves(q.get('k') || '', null, vr); if (!list) return null; return { list, v: vr, n: q.has('n') ? parseInt(q.get('n'), 10) : undefined }; }
  let vr = 'copenhagen';
  const tag = v.match(/\[\s*(copenhagen|brandubh|tablut)[^\]]*\]/i); if (tag) vr = tag[1].toLowerCase();
  v = v.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/\d+\.(\.\.)?/g, ' ');
  const toks = v.split(/[\s,;]+/).filter(Boolean);
  if (!toks.length) return null;
  const pos = E.Pos.from(null, vr), out = [];
  for (let k = 0; k < toks.length; k++) {
    if (!/^k?[a-k]\d{1,2}[-–]?[a-k]\d{1,2}(x[a-k]\d{1,2})*$/i.test(toks[k])) return { bad: k + 1 };
    const m = E.parse(pos, toks[k]); if (m == null) return { bad: k + 1 };
    pos.play(m); out.push(m);
    if (pos.res) break;
  }
  return { list: out, v: vr };
}
function openLoaded(list, n, v) {
  ['#resultOverlay', '#newOverlay', '#lessonOverlay', '#puzzleOverlay', '#pasteOverlay'].forEach(hideOverlay);
  if (lesson || puzzle) { savedGame = null; exitSpecial(); }
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); rvCancel(); rv = null; rvOpen = false; thinking = 0; animating = false;
  settings.mode = 'pvp'; rgame = null; startSpec = null; manualEnd = null;
  setVariant(v || 'copenhagen'); settings.rule = gv; drawLines();
  moves = list; evals = []; hintList = null;
  cur = n === undefined || isNaN(n) ? moves.length : Math.max(0, Math.min(moves.length, n));
  reviewing = cur !== moves.length; gameOverShown = gameOver(moves.length);
  update(false); save(); afterPosition();
}
function loadText(v) {
  const r = parseGameText(v);
  if (!r) { toast(t('paste.invalid'), 2200); return false; }
  if (r.bad) { toast(t('paste.bad', { n: r.bad }), 2500); return false; }
  openLoaded(r.list, r.n, r.v); toast(t('paste.loaded', { n: r.list.length }), 1800);
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
  const url = location.origin + location.pathname + '#k=' + encMoves(moves) + (gv !== 'copenhagen' ? '&v=' + gv : '') + (cur < moves.length ? '&n=' + cur : '');
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
if (window.RulesOffer) RulesOffer.init({ game: 'tafl', lang: () => LANG, open: () => openRules(null, 0), watch: '#rulesOverlay' });
const hadSave = load();
try { const sp = localStorage.getItem('atlas-sfx'); if (sp === '0' || sp === '1') settings.sound = sp === '1'; } catch (e) {} // サイト共通のサウンド設定（トップページと連動）
designApply();
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) { LANG = q; try { localStorage.setItem('aicoding-lang', q); } catch (e) {} } }
if (!hadSave) setVariant(settings.rule);
applyI18n();
drawLines();
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
  if ($('#lessonOverlay').classList.contains('show')) { if (!$('#lessonListView').classList.contains('hidden')) (document.querySelector('.ls-tabs button.sel[data-v=open]') ? openOpenings() : openLessons()); else if (!$('#lessonIntroView').classList.contains('hidden')) (openChoiceIdx >= 0 ? openOpeningChoice(openChoiceIdx) : openIntro(introIdx)); }
  if ($('#puzzleOverlay').classList.contains('show')) { if (!$('#pzListView').classList.contains('hidden')) openPuzzles(); else openPzGrid(pzLevel); }
};
if (loadFromHash()) { /* shared game opened */ }
else if (!hadSave) { update(false); afterPosition(); }   // no saved game: the starting position, waiting (the settings dialog opens from 対局)
else { update(false); afterPosition(); }
// expose for tests
window.__tf = { get moves() { return moves; }, get cur() { return cur; }, settings, get gv() { return gv; }, get rv() { return rv; }, rvJudge, dailyPick, parseGameText, encMoves, decMoves, onSquare, statusAt, posAt, newGame, get lesson() { return lesson; }, get puzzle() { return puzzle; }, get sel() { return sel; }, startLesson, startPuzzle, startStudy, startPractice, lessonsReady, puzzlesReady, openReady, get LESSONS() { return LESSONS; }, get PUZZLES() { return PUZZLES; }, get OPEN() { return OPEN; }, playMove, viewAt, setVariant, get humanColor() { return humanColor; } };

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
  if (ken && kenOk()) { if (what === 'prev') kenBack(); return; }   // exploring: ◀ takes one explored move back, the rest waits for 元に戻す
  const Nn = moves.length;
  if (what === 'play') {
    if (playTimer) { stopPlay(); return; }
    if (cur >= Nn) viewAt(0);
    document.querySelector('#navPlay').classList.add('playing');
    playTimer = setInterval(() => { if (lesson || puzzle || cur >= moves.length) { stopPlay(); return; } viewAt(cur + 1); }, 1000);
    return;
  }
  stopPlay();
  const to = what === 'first' ? 0 : what === 'last' ? Nn : what === 'prev' ? cur - 1 : cur + 1;
  if (to < 0 || to > Nn || to === cur) return;
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
