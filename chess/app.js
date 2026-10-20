'use strict';
// Chess — page logic (board, input, AI flow, lessons, puzzles, review, share). Rules and search live in engine.js.
const E = window.ChessEngine, MATE = E.MATE, MATET = E.MATET;
const P1 = 1, P2 = 2;                         // P1 = White, P2 = Black
const mFrom = m => m & 127, mTo = m => (m >> 7) & 127, mPromo = m => (m >> 14) & 7, mFlag = m => m >> 17;
const PT = ' PNBRQK', PVAL = [0, 1, 3, 3, 5, 9, 0];
let startFen = null;           // lesson / puzzle start (null = normal start)
let net = null;                // online game in progress or being watched (see the online section)
let moves = [];                // game record (engine move ints)
let cur = 0;                   // number of moves shown
const keyOf = i => (startFen || '') + '|' + moves.slice(0, i).join(',');
let posCache = { key: '' };
function posAt(i) {
  const key = keyOf(i);
  if (posCache.key === key) return posCache;
  if (lesson && lesson.drill) {
    const pos = drillPos(startFen);
    for (const m of moves.slice(0, i)) { pos.make(m); pos.side = 0; pos.ep = -1; }
    posCache = { key, pos, hashes: [pos.h1], legal: drillLegal(pos, lesson.stage.safe) };
    return posCache;
  }
  const r = E.replay(startFen, moves.slice(0, i));
  posCache = { key, pos: r.pos, hashes: r.hashes, legal: r.pos.legal() };
  return posCache;
}
const sideP = pos => pos.side ? P2 : P1;
function statusAt(i) {
  if (lesson && lesson.drill) return { over: false };
  if (net && net.over && i === moves.length && !lesson && !puzzle) return net.over;
  if (rgame && rgame.over && i === moves.length && !lesson && !puzzle) return rgame.over;
  const { pos, hashes, legal } = posAt(i);
  if (!legal.length) return pos.inCheck() ? { over: true, winner: pos.side ? P1 : P2, why: 'mate' } : { over: true, winner: 0, draw: true, why: 'stalemate' };
  if (pos.half >= 100) return { over: true, winner: 0, draw: true, why: 'fifty' };
  if (pos.insufficient()) return { over: true, winner: 0, draw: true, why: 'material' };
  let c = 0; for (const h of hashes) if (h === pos.h1) c++;
  if (c >= 3) return { over: true, winner: 0, draw: true, why: 'rep' };
  return { over: false };
}
const toMoveAt = i => sideP(posAt(i).pos);
const sanCache = new Map();
function sanOf(i) {   // SAN of move i (0-based)
  const k = keyOf(i + 1); if (sanCache.has(k)) return sanCache.get(k);
  const { pos, legal } = posAt(i), s = pos.san(moves[i], legal);
  sanCache.set(k, s); return s;
}
function sanAt(pos, m) { return pos.san(m); }
// pieces of `color` attacked by the opponent and either undefended or attacked by something cheaper
// ---------------------------------------------------------------- drills (beginner course): white pieces only, black pieces stand still
const DSENT = 0x08;   // off-board square used as "no king"
function drillPos(fen) {
  const pos = E.Pos.fromFEN(fen);
  for (const c of [0, 1]) if (pos.b[pos.ksq[c]] !== (6 | (c ? 8 : 0))) pos.ksq[c] = DSENT;
  const at = pos.attacked.bind(pos); pos.attacked = (s, by) => s === DSENT ? false : at(s, by);
  return pos;
}
function drillPseudo(pos) {
  const buf = new Int32Array(256), n = pos.gen(buf, false), out = [];
  for (let i = 0; i < n; i++) if (pos.make(buf[i])) { pos.unmake(buf[i]); out.push(buf[i]); }
  return out;
}
function drillDanger(pos, s) { const f = pos.b[s]; pos.b[s] = 0; const a = pos.attacked(s, 1); pos.b[s] = f; return a; }
function drillLegal(pos, safe) {
  const all = drillPseudo(pos);
  if (!safe) return all;
  return all.filter(m => { const f = mFrom(m), p = pos.b[f]; pos.b[f] = 0; const a = drillDanger(pos, mTo(m)); pos.b[f] = p; return !a; });
}
function drillStarsLeft() {
  const st = lesson.stage, seen = new Set(moves.slice(0, cur).map(m => E.sqName(mTo(m))));
  return st.stars.filter(q => !seen.has(q));
}
function hanging(pos, color) {
  const out = [], b = pos.b, them = color ^ 1, atk = new Map();
  const flip = pos.side !== them; if (flip) pos.makeNull();
  const buf = new Int32Array(256), n = pos.gen(buf, true);
  if (flip) pos.unmakeNull();
  for (let i = 0; i < n; i++) { const m = buf[i], t = mTo(m), f = mFrom(m); if (!b[t] || (b[t] >> 3) !== color) continue; const v = PVAL[b[f] & 7] || 100; if (!atk.has(t) || v < atk.get(t)) atk.set(t, v); }
  for (const [s, av] of atk) { const t = b[s] & 7; if (t === 6) continue; if (!pos.attacked(s, color) || av < PVAL[t]) out.push(s); }
  return out;
}

// ====================================================================== state
const STORE = 'aicoding-chess';
const settings = { mode: 'ai', color: 1, level: 5, level2: 5, anim: true, sound: true, hint: false, eval: true, last: true, threat: false, lang: '', flip: false, skin: 'classic', coach: true };
const SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
function detectLang() { const n = (navigator.language || 'ja').toLowerCase(); return ['ja', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'].find(c => n.startsWith(c)) || 'en'; }
let LANG = detectLang();
function t(k, v) { let x = (I18N[LANG] || I18N.en)[k]; if (x === undefined) x = I18N.en[k]; if (x === undefined) x = I18N.ja[k]; if (x === undefined) return k; if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x; }
const pname = p => t(p === P1 ? 'p1' : 'p2');
const LV = i => t('lv')[i], LVD = i => t('lvd')[i];
const $ = s => document.querySelector(s);
function applyI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG;
  document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); });
  const sel = document.getElementById('langSel'); if (sel) sel.value = LANG;
  document.title = t('meta.title');
  try { accRender(); } catch (e) {}   // the Google chip / account box are built in JS
}
let humanColor = P1;
let reviewing = false;
let evals = [];
let busyToken = 0;
let lesson = null, puzzle = null;
let gameOverShown = false;
let sel = null;            // { from }
let thinking = 0, animating = false;
function validMoves(list, fen) { try { E.replay(fen || null, list); return true; } catch (e) { return false; } }
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null'); if (!d) return false;
    Object.assign(settings, d.settings || {});
    if (settings.mode === 'online') settings.mode = 'ai';
    if (Array.isArray(d.moves) && validMoves(d.moves)) {
      moves = d.moves; humanColor = d.humanColor || 1; evals = Array.isArray(d.evals) ? d.evals : [];
      rgame = d.rated && d.rated.id ? d.rated : null;
      // a rated game restored on page load: its clock stays stopped (no time signal) until the next move is played
      if (rgame && !rgame.over) rgame.hold = true;
      cur = moves.length; gameOverShown = statusAt(cur).over; return true;
    }
  } catch (e) {}
  return false;
}
function save() {
  if (settings.mode === 'online') { try { const d = JSON.parse(localStorage.getItem(STORE) || '{}'); d.settings = Object.assign({}, settings, { mode: 'pvp', flip: false }); localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {} return; }   // an online game is not kept as the local game
  if (lesson || puzzle) { try { const d = JSON.parse(localStorage.getItem(STORE) || '{}'); d.settings = settings; localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {} return; }
  try { localStorage.setItem(STORE, JSON.stringify({ settings, moves, humanColor, evals: evals.slice(0, moves.length + 1), rated: rgame })); } catch (e) {}
}

// ====================================================================== workers
let jobId = 0;
function makeWorker() {
  const w = new Worker('engine.js?v=20261019g'); w.jobs = new Map();
  w.onmessage = e => { const m = e.data, j = w.jobs.get(m.id); if (!j) return; if (m.type === 'progress') { j.onProgress && j.onProgress(m); return; } w.jobs.delete(m.id); j.resolve(m); };
  return w;
}
let aiW = makeWorker(), anaW = makeWorker();
function request(which, msg, onProgress) {
  const w = which === 'ai' ? aiW : anaW;
  return new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve, onProgress }); w.postMessage({ fen: startFen, ...msg, id }); });
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
function sMove() { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime; tone(a, t0, 320, 140, 0.09, 0.3); noise(a, t0, 0.03, 0.35, 2400, 1.4); }
function sCapture() { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime; tone(a, t0, 220, 90, 0.16, 0.42); noise(a, t0, 0.05, 0.4, 1500, 0.9); noise(a, t0 + 0.05, 0.04, 0.2, 2600, 1.2); }
function sCheck() { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + 0.05; tone(a, t0, 880, 0, 0.25, 0.08, 'triangle'); tone(a, t0 + 0.08, 1174.7, 0, 0.3, 0.07, 'triangle'); }
function playChime(win) {
  if (!settings.sound) return; const a = ctx(); if (!a) return;
  const t0 = a.currentTime + 0.05, notes = win ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [392, 349.23, 311.13, 261.63];
  notes.forEach((fr, i) => tone(a, t0 + i * (win ? 0.1 : 0.16), fr, 0, 0.7, 0.16, win ? 'triangle' : 'sine'));
}
function playTick() { if (!settings.sound) return; const a = ctx(); if (!a) return; tone(a, a.currentTime, 880, 0, 0.06, 0.04, 'triangle'); }

// ====================================================================== board
const boardEl = $('#board'), piecesEl = $('#pieces'), fxEl = $('#fx'), sqEl = $('#squares');
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const animOn = () => settings.anim && !reduceMotion;
let flipped = false;
function orient() { const base = puzzle ? puzzle.me === P2 : lesson ? lesson.me === P2 : settings.mode === 'online' ? !!(net && net.me === P2) : settings.mode === 'ai' ? humanColor === P2 : false; flipped = base !== !!settings.flip; }
const sqX = s => flipped ? 7 - (s & 7) : (s & 7), sqY = s => flipped ? (s >> 4) : 7 - (s >> 4);
function placeAt(el, s) { el.style.left = sqX(s) * 12.5 + '%'; el.style.top = sqY(s) * 12.5 + '%'; }
function pieceSVG(p) { return `<svg viewBox="0 0 100 100" class="${p & 8 ? 'pb' : 'pw'}"><use href="#s${PT[p & 7]}"/></svg>`; }
function drawSquares() {
  let s = '';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) s += `<rect x="${x}" y="${y}" width="1.002" height="1.002" class="${(x + y) & 1 ? 'd' : 'l'}"/>`;
  for (let y = 0; y < 8; y++) { const r = flipped ? y + 1 : 8 - y; s += `<text x=".06" y="${y + .2}" class="${y & 1 ? 'on-d' : 'on-l'}">${r}</text>`; }
  for (let x = 0; x < 8; x++) { const f = 'abcdefgh'[flipped ? 7 - x : x]; s += `<text x="${x + .84}" y="7.94" class="${(x + 7) & 1 ? 'on-d' : 'on-l'}">${f}</text>`; }
  sqEl.innerHTML = s;
}
const pcEls = new Map();      // square -> element
let shownKey = '';
function newPiece(p) { const el = document.createElement('div'); el.className = 'pc'; el.dataset.p = p; el.innerHTML = pieceSVG(p); return el; }
function syncPieces(b) {
  for (const [s, el] of pcEls) if (+el.dataset.p !== b[s]) { el.remove(); pcEls.delete(s); }
  for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } if (b[s] && !pcEls.has(s)) { const el = newPiece(b[s]); piecesEl.appendChild(el); pcEls.set(s, el); } }
  for (const [s, el] of pcEls) { placeAt(el, s); el.getAnimations && el.getAnimations().forEach(a => a.cancel()); el.classList.remove('drag', 'ghost', 'dim'); el.style.transform = ''; }
}
function flipFrom(el, from, dur) {
  if (!el.animate) return;
  const to = el.getBoundingClientRect(), dx = from.left - to.left, dy = from.top - to.top;
  if (!dx && !dy) return;
  el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: dur || 260, easing: 'cubic-bezier(.3,.7,.3,1)' });
}
function moveDur() { return animOn() ? 280 : 30; }
function animateMove(m, before) {
  const f = mFrom(m), tt = mTo(m), fl = mFlag(m), pr = mPromo(m);
  const el = pcEls.get(f); if (!el) return false;
  const capSq = fl & 2 ? (before.side ? tt + 16 : tt - 16) : tt;
  const vel = pcEls.get(capSq);
  if (vel && vel !== el) { pcEls.delete(capSq); if (vel.animate) { const a = vel.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6)' }], { duration: 220, delay: 140, fill: 'forwards' }); a.onfinish = () => vel.remove(); } else vel.remove(); }
  pcEls.delete(f);
  const r0 = el.getBoundingClientRect(); placeAt(el, tt); el.style.transform = ''; flipFrom(el, r0);
  pcEls.set(tt, el);
  if (fl & 4) {
    const rf = tt > f ? f + 3 : f - 4, rt = tt > f ? f + 1 : f - 1, rel = pcEls.get(rf);
    if (rel) { pcEls.delete(rf); const r1 = rel.getBoundingClientRect(); placeAt(rel, rt); flipFrom(rel, r1, 320); pcEls.set(rt, rel); }
  }
  if (pr) { const np = pr | (before.side ? 8 : 0); setTimeout(() => { el.dataset.p = np; el.innerHTML = pieceSVG(np); }, 200); el.dataset.p = np; }
  return true;
}
function renderReserves(pos) {
  if (lesson && lesson.drill) { $('#resTop').innerHTML = ''; $('#resBot').innerHTML = ''; return; }
  // captured pieces next to the player who took them; material balance
  const cnt = [[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]], init = [0, 8, 2, 2, 2, 1, 1];
  let mat = [0, 0];
  for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = pos.b[s]; if (!p) continue; cnt[p >> 3][p & 7]++; mat[p >> 3] += PVAL[p & 7]; }
  const bottom = flipped ? 1 : 0;
  for (const [id, c] of [['#resBot', bottom], ['#resTop', bottom ^ 1]]) {
    const o = c ^ 1; let html = '';
    for (const tp of (startFen ? [] : [5, 4, 3, 2, 1])) {
      let k = Math.max(0, init[tp] - cnt[o][tp]); if (!k) continue;
      html += '<span class="grp">' + Array.from({ length: k }, () => `<span class="cp">${pieceSVG(tp | (o ? 8 : 0))}</span>`).join('') + '</span>';
    }
    const adv = mat[c] - mat[o];
    if (adv > 0) html += `<span class="adv">+${adv}</span>`;
    const p = c ? P2 : P1, n = playerName(p);
    html += `<span class="who"><span class="pdisc p${p}" style="width:12px;height:12px"></span>${n ? n + ' · ' : ''}${pname(p)}</span>`;
    const el = $(id); el.innerHTML = html; el.classList.toggle('turn', !statusAt(cur).over && sideP(pos) === p);
  }
}
function renderBoard(anim) {
  const { pos } = posAt(cur), key = keyOf(cur), prev = shownKey; shownKey = key;
  const m = cur > 0 ? moves[cur - 1] : 0;
  let done = false;
  if (anim && cur > 0 && prev === keyOf(cur - 1)) {
    const before = posAt(cur - 1).pos;
    const cap = before.b[mTo(m)] || (mFlag(m) & 2);
    if (animOn()) {
      done = animateMove(m, before);
      if (done) for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } if (!!pos.b[s] !== pcEls.has(s)) { done = false; break; } }
    }
    if (pos.inCheck()) setTimeout(sCheck, 60); else if (cap) sCapture(); else sMove();
  }
  if (!done) syncPieces(pos.b);
  boardEl.classList.toggle('hide-last', !settings.last);
  renderReserves(pos);
  renderFx();
  boardEl.classList.toggle('can', canHumanPlay());
}

// ---------------------------------------------------------------- fx
let hintList = null, lessonMarks = [], labelList = null;
const NS = 'http://www.w3.org/2000/svg';
function hlDiv(cls, s) { const d = document.createElement('div'); d.className = 'hl ' + cls; placeAt(d, s); fxEl.appendChild(d); return d; }
function fxSvg() { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', 'fxsvg'); s.setAttribute('viewBox', '0 0 8 8'); fxEl.appendChild(s); return s; }
function arrow(svg, f, tt, cls) {
  const x1 = sqX(f) + .5, y1 = sqY(f) + .5, x2 = sqX(tt) + .5, y2 = sqY(tt) + .5;
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
  const w = .09, hw = .23, hl = .38, sx = x1 + ux * .28, sy = y1 + uy * .28, ex = x2 - ux * .12, ey = y2 - uy * .12, bx = ex - ux * hl, by = ey - uy * hl;
  const pts = [[sx + px * w, sy + py * w], [bx + px * w, by + py * w], [bx + px * hw, by + py * hw], [ex, ey], [bx - px * hw, by - py * hw], [bx - px * w, by - py * w], [sx - px * w, sy - py * w]];
  const p = document.createElementNS(NS, 'polygon'); p.setAttribute('points', pts.map(q => q[0].toFixed(3) + ',' + q[1].toFixed(3)).join(' ')); p.setAttribute('class', 'arrow ' + (cls || '')); svg.appendChild(p);
}
function renderFx() {
  fxEl.innerHTML = '';
  const { pos, legal } = posAt(cur), st = statusAt(cur), m = cur > 0 ? moves[cur - 1] : 0;
  for (const [, el] of pcEls) el.classList.remove('dim');
  if (m && settings.last) { hlDiv('last', mFrom(m)); hlDiv('last', mTo(m)); }
  if (pos.inCheck()) hlDiv('check', pos.ksq[pos.side]);
  if (st.over && st.winner) for (const [s, el] of pcEls) if (((pos.b[s] >> 3) ? P2 : P1) !== st.winner) el.classList.add('dim');
  if (settings.threat && !st.over && !lesson && !puzzle) for (const c of [0, 1]) for (const s of hanging(pos, c)) hlDiv('hang', s);
  const svg = fxSvg();
  if (sel) {
    hlDiv('sel', sel.from);
    const seen = new Set();
    for (const x of legal) if (mFrom(x) === sel.from && !seen.has(mTo(x))) { seen.add(mTo(x)); const d = document.createElement('div'); d.className = 'dot' + (pos.b[mTo(x)] || (mFlag(x) & 2) ? ' cap' : ''); placeAt(d, mTo(x)); fxEl.appendChild(d); }
  }
  for (const k of lessonMarks) { if (k.arrow) arrow(svg, k.arrow[0], k.arrow[1], k.cls); else hlDiv(k.cls, k.at); }
  if (lesson && lesson.drill) {
    if (lesson.stage.safe) for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } if ((!pos.b[s] || (pos.b[s] >> 3) === 0) && drillDanger(pos, s)) hlDiv('danger', s); }
    for (const q of drillStarsLeft()) { const d = document.createElement('div'); d.className = 'star'; d.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>'; placeAt(d, E.sqOf(q)); fxEl.appendChild(d); }
  }
  if (labelList) drawLabels(labelList);
  else if (!drawReviewFx(svg) && hintList && !st.over) drawHints(hintList, svg);
}
function valLabel(v) {
  if (v > MATET) return { cls: 'win', big: t('lb.win', { n: (MATE - v + 1) >> 1 }) };
  if (v < -MATET) return { cls: 'loss', big: t('lb.loss', { n: (MATE + v) >> 1 }) };
  const x = v / 100; return { cls: x < -0.05 ? 'neg' : '', big: (x > 0.05 ? '+' : '') + (Math.abs(x) < 0.05 ? '0.0' : x.toFixed(1)) };
}
function drawHints(list, svg) {
  let L = list.slice().sort((a, b) => b.v - a.v);
  if (sel) L = L.filter(e => mFrom(e.m) === sel.from);
  const top = L.slice(0, sel ? 8 : 3), seen = new Set();
  top.forEach((e, i) => {
    if (!sel || i === 0) arrow(svg, mFrom(e.m), mTo(e.m), i === 0 ? '' : i === 1 ? 'a2' : 'a3');
    if (seen.has(mTo(e.m))) return; seen.add(mTo(e.m));
    const lb = valLabel(e.v), d = document.createElement('div'); d.className = 'hintlbl ' + lb.cls + (i === 0 ? ' best' : ''); placeAt(d, mTo(e.m));
    d.innerHTML = `<b>${e.kind === 'ub' ? '≤' : ''}${lb.big}</b>`; fxEl.appendChild(d);
  });
}
function drawLabels(list) { for (const L of list) { const d = document.createElement('div'); d.className = 'hintlbl ' + L.cls; placeAt(d, L.at); d.innerHTML = `<b>${L.big}</b>`; fxEl.appendChild(d); } }
function sOfV(v) { return v > MATET ? 0.9 + 0.1 * Math.min(1, 6 / (MATE - v + 1)) : v < -MATET ? -(0.9 + 0.1 * Math.min(1, 6 / (MATE + v + 1))) : Math.tanh(v / 420) * 0.85; }
function evalFromList(list, mover) {
  if (!list || !list.length) return null;
  let best = -Infinity; for (const e of list) best = Math.max(best, e.v);
  const sign = mover === P1 ? 1 : -1;
  if (best > MATET) return { s: sOfV(best) * sign, kind: 'mate', side: mover, n: (MATE - best + 1) >> 1 };
  if (best < -MATET) return { s: sOfV(best) * sign, kind: 'mate', side: 3 - mover, n: (MATE + best) >> 1 };
  return { s: sOfV(best) * sign, kind: 'cp', cp: best * sign };
}
function evalText(ev) {
  if (!ev) return '—';
  if (ev.kind === 'final') return ev.side ? t('ev.won', { c: pname(ev.side) }) : t('res.draw');
  if (ev.kind === 'mate') return t('ev.mateIn', { c: pname(ev.side), n: ev.n });
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
  if (lesson) return !lesson.answered;
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
function material(pos, c) { let m = 0; for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = pos.b[s]; if (p && (p >> 3) === c) m += PVAL[p & 7]; } return m; }
function renderInfo() {
  const { pos } = posAt(cur), st = statusAt(cur), tm = sideP(pos);
  for (const p of [P1, P2]) {
    const c = p - 1;
    if (settings.mode === 'online' && !lesson && !puzzle) { /* clocks: olClocks() below */ }
    else if (rgame && !lesson && !puzzle && settings.mode === 'ai') { $('#count' + p).textContent = fmtClock(rtClockLeft(c)); $('#hand' + p).textContent = t('rt.clock'); }
    else { $('#count' + p).textContent = material(pos, c); $('#hand' + p).textContent = t('mat'); }
    const nmEl = $('#name' + p);
    if (settings.mode === 'online' && !lesson && !puzzle) olPName(nmEl, p);
    else { const n = playerName(p); nmEl.classList.remove('pn'); nmEl.removeAttribute('title'); nmEl.textContent = n ? n + ' · ' + pname(p) : pname(p); }
    const el = $('#pl' + p);
    el.classList.toggle('active', !st.over && tm === p); el.classList.toggle('won', st.winner === p); el.classList.toggle('thinking', thinking === p);
    $('#status' + p).textContent = st.winner === p ? t('st.win') : thinking === p ? t('thinking') : (!st.over && tm === p ? t('st.turn') + (pos.inCheck() ? ' · ' + t('st.check') : '') : '');
  }
  if (settings.mode === 'online' && !lesson && !puzzle) olClocks(); else olClocksOff();
  $('#btnResign').disabled = !olLive();
  $('#evalCard').classList.toggle('hidden', !settings.eval && !rtLive() && settings.mode !== 'online');
  document.body.classList.toggle('rated-live', rtLive()); $('#evalCard').dataset.rtnote = t('rt.noEval');
  let ev = st.over ? { s: st.winner === P1 ? 1 : st.winner === P2 ? -1 : 0, kind: 'final', side: st.winner } : evals[cur];
  if (!ev && cur > 0 && evals[cur - 1]) ev = evals[cur - 1];
  $('#evalText').textContent = evalText(ev);
  $('#evalFill').style.width = (50 + 50 * (ev ? ev.s : 0)) + '%';
  renderGraph(); renderKifu(); hbInfo(pos, st, ev);
  $('#btnUndo').disabled = settings.mode === 'watch' || !canUndo();
  $('#btnHint').classList.toggle('on', settings.hint);
  $('#btnSound').classList.toggle('on', settings.sound);
  $('#btnFlip').classList.toggle('on', !!settings.flip);
  renderReview();
  $('#infoLine').textContent = `${t('info.moves', { n: moves.length })}  ·  ${settings.mode === 'ai' ? 'AI Lv.' + levelFor(0) + ' ' + LV(levelFor(0)) + (rgame ? ' · ' + t('ng.rated') : '') : settings.mode === 'watch' ? `Lv.${settings.level} vs Lv.${settings.level2}` : t('ng.pvp')}  ·  ← → ${t('info.browse')}`;
}
// PC header bar: side to move, move number, evaluation (hidden in rated / online games), opening name
let HB = null;   // set at boot (shared/headerbar.js)
const hbEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let hbOpenKey = '', hbOpenName = '';
function hbOpening() {
  if (startFen || lesson || puzzle || !OPEN || !cur) return '';
  const key = moves.slice(0, cur).join(',');
  if (key === hbOpenKey) return hbOpenName;
  hbOpenKey = key; hbOpenName = '';
  const u = ucisOf(moves.slice(0, cur)).join(' ') + ' ';
  let best = null;
  for (const g of OPEN.sets) if (u.startsWith(g.prefix + ' ') && (!best || g.prefix.length > best.prefix.length)) best = g;
  if (best) hbOpenName = LL(best.title);
  return hbOpenName;
}
function hbInfo(pos, st, ev) {
  if (!HB || !HB.on) return;
  const tm = sideP(pos);
  let h = `<span class="hb-chip"><i class="hb-pd p${st.over ? (st.winner || tm) : tm}"></i><b>${hbEsc(st.over ? (st.winner ? t('ev.won', { c: pname(st.winner) }) : t('res.draw')) : t('hb.turn', { c: pname(tm) }))}</b>${!st.over && pos.inCheck() ? ' · ' + hbEsc(t('hb.check')) : ''}</span>`;
  h += `<span class="hb-chip">${hbEsc(t('hb.move', { n: pos.full }))}</span>`;
  if (settings.eval && ev && !rtLive() && settings.mode !== 'online' && !lesson && !puzzle) h += `<span class="hb-chip">${hbEsc(evalText(ev))}</span>`;
  const op = hbOpening(); if (op) h += `<span class="hb-chip">${hbEsc(op)}</span>`;
  HB.setInfo(h);
}
function evalAt(i) { const st = statusAt(i); if (st.over) return st.winner === P1 ? 1 : st.winner === P2 ? -1 : 0; return evals[i] ? evals[i].s : null; }
function renderGraph() {
  const svg = $('#graph'), W = 300, H = 74, n = Math.max(moves.length + 1, 40);
  const pts = []; let last = 0;
  for (let i = 0; i <= moves.length; i++) { let v = evalAt(i); if (v == null) v = last; last = v; pts.push([i / (n - 1) * W, H / 2 - v * (H / 2 - 4)]); }
  let path = '', area = '';
  if (pts.length) { path = 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L'); area = path + `L${pts[pts.length - 1][0].toFixed(1)},${H / 2}L0,${H / 2}Z`; }
  const cx = cur / (n - 1) * W;
  svg.innerHTML = `<defs><clipPath id="ctop"><rect x="0" y="0" width="${W}" height="${H / 2}"/></clipPath><clipPath id="cbot"><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}"/></clipPath></defs>
    <path d="${area}" fill="rgba(229,195,108,.45)" clip-path="url(#ctop)"/><path d="${area}" fill="rgba(120,128,140,.45)" clip-path="url(#cbot)"/>
    <line class="zero" vector-effect="non-scaling-stroke" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/>
    <path d="${path}" fill="none" stroke="rgba(240,230,200,.85)" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
    <line class="cur" x1="${cx}" x2="${cx}" y1="0" y2="${H}" vector-effect="non-scaling-stroke"/>`;
}
function renderKifu() {
  const k = $('#kifu');
  if (!moves.length) { k.innerHTML = `<div class="empty">${t('kifu.empty')}</div>`; return; }
  const p0 = E.replay(startFen, []).pos; let full = p0.full, side = p0.side, html = '';
  for (let i = 0; i < moves.length; i++) {
    if (side === 0 || i === 0) { html += `<em>${full}.</em>`; if (side === 1) html += '<span></span>'; }
    const j = rvOpen && rv && !rv.running ? rvJudge(i) : null, qc = j && j.q ? (j.q === 'bad' ? ' q-bad' : ' q-dub') : '';
    html += `<button data-i="${i + 1}" class="${i + 1 === cur ? 'cur' : ''}${qc}" title="${j && j.q ? t('q.' + j.q) : ''}"><i class="p${side ? 2 : 1}"></i>${sanOf(i)}</button>`;
    if (side === 1) full++;
    side ^= 1;
  }
  k.innerHTML = html;
  const c = k.querySelector('.cur'); if (c) { const top = c.offsetTop - k.offsetTop; if (top < k.scrollTop || top > k.scrollTop + k.clientHeight - 24) k.scrollTop = top - k.clientHeight / 2; }
}
$('#kifu').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b) return; if (rv && !rv.running && rv.key === gameKey() && !rvOpen) rvOpen = true; viewAt(+b.dataset.i); renderReview(); });
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
function update(anim) { if (!anim) { sel = null; closePromo(); } renderBoard(anim); renderInfo(); stSync(); }

// ====================================================================== input: tap or drag
function squareAt(cx, cy) {
  const r = boardEl.getBoundingClientRect(), x = Math.floor((cx - r.left) / r.width * 8), y = Math.floor((cy - r.top) / r.height * 8);
  if (x < 0 || x > 7 || y < 0 || y > 7) return -1;
  const f = flipped ? 7 - x : x, rk = flipped ? y : 7 - y;
  return rk * 16 + f;
}
let drag = null;     // { from, el, x0, y0, moved, pid }
boardEl.addEventListener('pointerdown', e => {
  ctx(); if (e.button > 0) return;
  const s = squareAt(e.clientX, e.clientY); if (s < 0) return;
  if (!canHumanPlay()) { if (reviewing && !lesson && !puzzle) { if (settings.mode === 'online') viewAt(moves.length); else rsOpen(); } return; }
  if (promoEl) { closePromo(true); sel = null; renderFx(); return; }
  const { pos, legal } = posAt(cur), p = pos.b[s];
  if (p && (p >> 3) === pos.side && legal.some(m => mFrom(m) === s)) {
    const wasSel = sel && sel.from === s;
    if (!wasSel) { sel = { from: s }; renderFx(); playTick(); }
    drag = { from: s, el: pcEls.get(s), x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId, wasSel };
    try { boardEl.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
    return;
  }
  onSquare(s);
});
boardEl.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.pid) return;
  const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
  if (!drag.moved && Math.hypot(dx, dy) < 6) return;
  drag.moved = true;
  if (drag.el) { drag.el.classList.add('drag'); drag.el.style.transform = `translate(${dx}px,${dy}px) scale(1.12)`; }
});
function endDrag(e, cancel) {
  if (!drag || e.pointerId !== drag.pid) return;
  const d = drag; drag = null;
  try { boardEl.releasePointerCapture(e.pointerId); } catch (_) {}
  if (d.el) { d.el.classList.remove('drag'); }
  if (!d.moved) { if (d.wasSel) { if (d.el) d.el.style.transform = ''; sel = null; renderFx(); } return; }
  const s = cancel ? -1 : squareAt(e.clientX, e.clientY);
  const ok = s >= 0 && s !== d.from && tryMove(d.from, s, true);
  if (!ok && d.el) {
    // snap back
    const r0 = d.el.getBoundingClientRect(); d.el.style.transform = ''; flipFrom(d.el, r0, 180);
  }
}
boardEl.addEventListener('pointerup', e => endDrag(e, false));
boardEl.addEventListener('pointercancel', e => endDrag(e, true));
function onSquare(s) {
  const { pos } = posAt(cur);
  if (sel) {
    if (tryMove(sel.from, s, false)) return;
    sel = null; renderFx(); return;
  }
  const p = pos.b[s];
  if (p && (p >> 3) !== pos.side && !lesson && !puzzle) toast(t('pick.own'));
}
// returns true when a move (or the promotion picker) was started
function tryMove(from, to, dragged) {
  const { legal } = posAt(cur);
  const c = legal.filter(m => mFrom(m) === from && mTo(m) === to);
  if (!c.length) { illegalHint(from, to); return false; }
  // a dropped piece already stands on its target square (still keyed by `from`), so the move does not slide it again
  if (dragged) { const el = pcEls.get(from); if (el) { el.style.transform = ''; placeAt(el, to); } }
  if (c.length > 1) { openPromo(c, to); return true; }
  commit(c[0], dragged);
  return true;
}
function illegalHint(from, to) {
  const { pos } = posAt(cur), p = pos.b[from];
  if (!p || (p >> 3) !== pos.side) return;
  const buf = new Int32Array(256), n = pos.gen(buf, false);
  let pseudo = false; for (let i = 0; i < n; i++) if (mFrom(buf[i]) === from && mTo(buf[i]) === to) pseudo = true;
  if (!pseudo) return;
  if (lesson && lesson.drill) { if (lesson.stage.safe) toast(t('dr.danger'), 2200); return; }
  toast(t(pos.inCheck() ? 'ill.inCheck' : 'ill.self'), 2600);
}
let promoEl = null;
function openPromo(cands, to) {
  closePromo();
  const color = posAt(cur).pos.side;
  promoEl = document.createElement('div'); promoEl.className = 'promo';
  const x = sqX(to), y = sqY(to), down = y < 4;
  promoEl.style.left = x * 12.5 + '%';
  if (down) promoEl.style.top = y * 12.5 + '%'; else promoEl.style.bottom = (7 - y) * 12.5 + '%';
  for (const tp of [5, 2, 4, 3]) {
    const m = cands.find(q => mPromo(q) === tp); if (!m) continue;
    const b = document.createElement('button'); b.innerHTML = pieceSVG(tp | (color ? 8 : 0));
    b.addEventListener('pointerdown', e => { e.stopPropagation(); }); b.addEventListener('click', e => { e.stopPropagation(); closePromo(); commit(m, false); });
    promoEl.appendChild(b);
  }
  boardEl.appendChild(promoEl);
}
function closePromo(resync) { if (promoEl) { promoEl.remove(); promoEl = null; if (resync) syncPieces(posAt(cur).pos.b); } }
function commit(m, dragged) {
  sel = null; closePromo();
  if (lesson && lesson.drill) return drillMove(m);
  if (lesson) return lessonAnswer(m);
  if (puzzle) return puzzleMove(m);
  if (settings.mode === 'online') return netMove(m);
  playMove(m);
}

// ====================================================================== flow
function newGame(rated) {
  if (net) leaveOnlineGame();
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false;
  startFen = null;
  if (settings.mode === 'ai') humanColor = settings.color === 0 ? (Math.random() < 0.5 ? P1 : P2) : settings.color;
  rgame = null; coachQ = new Map();
  if (rated) { humanColor = Math.random() < 0.5 ? P1 : P2; rgame = Object.assign(rated, { ct: [RT_CLOCK.base, RT_CLOCK.base], t: Date.now() }); }
  moves = []; cur = 0; reviewing = false; evals = []; hintList = null; gameOverShown = false; sel = null;
  hideOverlay('#resultOverlay');
  orient(); drawSquares(); shownKey = ''; syncPieces(new Int8Array(128));
  update(false); save(); afterPosition();
}
// ---------------------------------------------------------------- coach: grades your moves in games against the AI
let coachQ = new Map(), anaLast = null, coachTimer = 0;   // coachQ: ply index -> { q, list, m }
function coachOn() { return settings.coach && settings.mode === 'ai' && !rgame && !lesson && !puzzle; }
function gradeMove(list, m) {
  const mine = list.find(e => e.m === m); if (!mine) return null;
  let best = list[0]; for (const e of list) if (e.v > best.v) best = e;
  const loss = sOfV(best.v) - sOfV(mine.v);
  if ((best.v > MATET && mine.v <= MATET) || (best.v >= -MATET && mine.v < -MATET) || loss >= 0.3) return 'bad';
  if (loss >= 0.12) return 'dubious';
  if (m === best.m || (mine.v >= best.v - 15 && mine.kind !== 'ub')) return 'best';
  return 'good';
}
function coachShow(q) { const el = $('#coach'); el.className = 'coach show q-' + q; el.textContent = t('cq.' + q); clearTimeout(coachTimer); coachTimer = setTimeout(() => el.classList.remove('show'), 1700); }
function coachMove(idx, m) {
  if (!coachOn() || toMoveAt(idx) !== humanColor) return;
  const key = keyOf(idx), list = anaCache.get(key) || (anaLast && anaLast.key === key ? anaLast.list : null);
  if (!list || !list.length) return;
  const q = gradeMove(list, m); if (!q) return;
  coachQ.set(idx, { q, list, m }); coachShow(q);
}
function playMove(m) {
  coachMove(cur, m);
  if (rtLive() && rgame.hold) { rgame.hold = false; rgame.t = Date.now(); }   // first move after a restore: the clocks start now
  if (rtLive()) { const side = toMoveAt(moves.length) - 1, now = Date.now(); rgame.ct[side] = Math.max(0, rgame.ct[side] - (now - rgame.t)) + RT_CLOCK.inc; rgame.t = now; }
  moves = moves.slice(0, cur); moves.push(m); cur = moves.length; reviewing = false;
  evals.length = moves.length; hintList = null;
  animating = animOn(); setTimeout(() => { animating = false; boardEl.classList.toggle('can', canHumanPlay()); }, moveDur());
  update(true); save();
  const st = statusAt(cur);
  if (st.over) setTimeout(() => onGameEnd(st), moveDur() + 450);
  afterPosition();
}
function afterPosition() { const tok = ++busyToken; analyzeCurrent(tok); maybeAI(tok); }
async function maybeAI(tok) {
  if (lesson || puzzle || reviewing || gameOver(cur)) return;
  const p = toMoveAt(cur); if (!isAIColor(p)) return;
  thinking = p; renderInfo(); boardEl.classList.remove('can');
  const t0 = Date.now();
  const res = await request('ai', { type: 'think', moves: moves.slice(0, cur), level: levelFor(p) });
  if (!res || tok !== busyToken) { if (tok === busyToken) { thinking = 0; renderInfo(); } return; }
  const wait = (settings.mode === 'watch' ? 650 : 350) - (Date.now() - t0);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  if (tok !== busyToken) return;
  thinking = 0;
  if (!res.move) { renderInfo(); return; }
  playMove(res.move);
}
async function analyzeCurrent(tok) {
  const idx = cur, key = keyOf(idx);
  if (gameOver(idx) || lesson || puzzle) { hintList = null; return; }
  if (rtLive() || settings.mode === 'online') { hintList = null; return; }
  if (!settings.eval && !settings.hint && !(coachOn() && toMoveAt(idx) === humanColor)) return;
  const mover = toMoveAt(idx);
  const apply = list => {
    if (keyOf(idx) !== key || !list || !list.length) return;
    anaLast = { key, list };
    const ev = evalFromList(list.filter(e => e.kind !== 'ub'), mover); if (ev) evals[idx] = ev;
    if (cur === idx) { hintList = settings.hint ? list : null; renderFx(); renderInfo(); }
  };
  if (anaCache.has(key)) { apply(anaCache.get(key)); return; }
  cancelWorker('ana');
  const res = await request('ana', { type: 'analyze', moves: moves.slice(0, idx), time: settings.hint ? 1800 : 1100 }, m => apply(m.list));
  if (!res || res.error) return;
  anaCache.set(key, res.list); apply(res.list); save();
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
  let sub = t('res.why.' + st.why) + '<br>' + t('res.sub', { n: Math.ceil(moves.length / 2) });
  if (rgame) {
    const rx = rtSettle(st);
    if (rx) sub += `<br>${rx.pl ? Placement.resHtml(rx.pl) : `<span class="rt-res">R ${rx.old} → <b>${rx.now}</b> (${rtD(rx.d)})</span>`} · ${rtRank(rx.now)}<br><small style="color:var(--muted)">${t('rt.opp', { lv: rtLvName(rgame.lv), r: rgame.or })}</small>`;
  } else if (settings.mode === 'ai') sub += '<br>' + t('res.vs', { name: LV(settings.level), lv: settings.level });
  $('#resultSub').innerHTML = sub;
  const mk = settings.mode === 'ai' ? mistakeProblems() : [];
  $('#btnMistakes').classList.toggle('hidden', !mk.length); $('#btnMistakes').textContent = t('mk.btn', { n: mk.length });
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
  const cols = ['#e6cd8c', '#fff6dc', '#c8ced8', '#ffffff', '#b39249'];
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
$('#btnFlip').onclick = () => { settings.flip = !settings.flip; save(); orient(); drawSquares(); shownKey = ''; syncPieces(posAt(cur).pos.b); renderBoard(false); renderInfo(); };
$('#btnLesson').onclick = () => openLessons();
$('#btnPuzzle').onclick = () => openPuzzles();
$('#btnRules').onclick = () => openRules('move');
function selTab(v) { document.querySelectorAll('.ls-tabs').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === v))); }
document.querySelectorAll('.ls-tabs').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const inst = on => ['#lessonOverlay', '#puzzleOverlay', '#rulesOverlay'].forEach(x => $(x).classList.toggle('instant', on));
  inst(true);
  const v = b.dataset.v;
  if (v !== 'rules' && $('#rulesOverlay').classList.contains('show')) { if (window.ChessRules) ChessRules.stop(); $('#rulesOverlay').classList.remove('show'); }
  if (v === 'rules' && !$('#rulesOverlay').classList.contains('show')) { $('#lessonOverlay').classList.remove('show'); $('#puzzleOverlay').classList.remove('show'); openRules('move'); }
  if (v === 'puzzle' && !$('#puzzleOverlay').classList.contains('show')) { $('#lessonOverlay').classList.remove('show'); openPuzzles(); }
  if (v === 'lesson') { $('#puzzleOverlay').classList.remove('show'); openLessons(); }
  if (v === 'open') { $('#puzzleOverlay').classList.remove('show'); openOpenings(); }
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
function pgnText() {
  const st = statusAt(moves.length), res = st.over ? (st.winner === P1 ? '1-0' : st.winner === P2 ? '0-1' : '1/2-1/2') : '*';
  const p0 = E.replay(startFen, []).pos; let full = p0.full, side = p0.side, s = '';
  for (let i = 0; i < moves.length; i++) { if (side === 0) s += full + '. '; else if (i === 0) s += full + '... '; s += sanOf(i) + ' '; if (side === 1) full++; side ^= 1; }
  const d = new Date(), date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  return `[Event "World Board Game Atlas"]\n[Date "${date}"]\n[White "${net && net.game ? String(net.game.wn).replace(/"/g, '') : settings.mode === 'ai' ? (humanColor === P1 ? 'You' : 'AI Lv.' + settings.level) : 'White'}"]\n[Black "${net && net.game ? String(net.game.bn).replace(/"/g, '') : settings.mode === 'ai' ? (humanColor === P2 ? 'You' : 'AI Lv.' + settings.level) : 'Black'}"]\n[Result "${res}"]\n${startFen ? `[FEN "${startFen}"]\n` : ''}\n${s}${res}`;
}
$('#btnCopy').onclick = async () => {
  if (!moves.length) { toast(t('nokifu')); return; }
  const txt = pgnText();
  try { await navigator.clipboard.writeText(txt); toast(t('copied')); } catch (e) { toast(t('copyFail'), 2000); }
};
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && ![...document.querySelectorAll('.overlay.show')].some(o => o.id !== 'resultOverlay')) { e.preventDefault(); undo(); return; }
  if (document.querySelector('.overlay.show')) { if (e.key === 'Escape') document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); return; }
  if (e.key === 'Escape') { sel = null; closePromo(); renderFx(); return; }
  if (e.key === 'f' || e.key === 'F') $('#btnFlip').click();
});

// ---------------------------------------------------------------- illustrated rules
// small board: pieces = {sq: piece char like 'N' / 'p'}, dots = squares, arrows = [[from,to]]
function miniBoard(pieces, o) {
  o = o || {};
  const u = 26, W = u * 8 + 8;
  let s = `<svg viewBox="0 0 ${W} ${W}"><rect width="${W}" height="${W}" rx="6" fill="#1a130d" stroke="rgba(201,169,97,.5)"/>`;
  for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) s += `<rect x="${4 + f * u}" y="${4 + (7 - r) * u}" width="${u}" height="${u}" fill="${(r + f) & 1 ? '#e3cfa8' : '#9c7349'}"/>`;
  const XY = n => [4 + (n.charCodeAt(0) - 97) * u, 4 + (7 - (n.charCodeAt(1) - 49)) * u];
  for (const n of o.hl || []) { const [x, y] = XY(n); s += `<rect x="${x}" y="${y}" width="${u}" height="${u}" fill="rgba(255,90,70,.55)"/>`; }
  for (const n in pieces) { const [x, y] = XY(n), ch = pieces[n], p = ' PNBRQK'.indexOf(ch.toUpperCase()) | (ch === ch.toLowerCase() ? 8 : 0); s += `<svg x="${x}" y="${y}" width="${u}" height="${u}" viewBox="0 0 100 100" class="${p & 8 ? 'pb' : 'pw'}"><use href="#s${PT[p & 7]}"/></svg>`; }
  for (const n of o.dots || []) { const [x, y] = XY(n); s += `<circle cx="${x + u / 2}" cy="${y + u / 2}" r="${u * 0.16}" fill="rgba(20,14,8,.5)"/>`; }
  for (const [a, b] of o.arrows || []) {
    const [x1, y1] = XY(a), [x2, y2] = XY(b), cx1 = x1 + u / 2, cy1 = y1 + u / 2, cx2 = x2 + u / 2, cy2 = y2 + u / 2;
    const L = Math.hypot(cx2 - cx1, cy2 - cy1), ux = (cx2 - cx1) / L, uy = (cy2 - cy1) / L, ex = cx2 - ux * 5, ey = cy2 - uy * 5, h = 7;
    s += `<path d="M${cx1 + ux * 6},${cy1 + uy * 6}L${ex},${ey}M${ex - ux * h - uy * h * .7},${ey - uy * h + ux * h * .7}L${ex},${ey}L${ex - ux * h + uy * h * .7},${ey - uy * h - ux * h * .7}" stroke="rgba(255,220,120,.95)" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  return s + '</svg>';
}
// squares a piece can reach on an otherwise empty board (for the move diagrams)
function reach(ch, at, blockers) {
  const pos = E.Pos.fromFEN('8/8/8/8/8/8/8/8 w - - 0 1'), s0 = E.sqOf(at), p = ' PNBRQK'.indexOf(ch);
  pos.b[s0] = p; for (const b in blockers || {}) pos.b[E.sqOf(b)] = ' PNBRQK'.indexOf(blockers[b].toUpperCase()) | (blockers[b] === blockers[b].toLowerCase() ? 8 : 0);
  pos.ksq[0] = p === 6 ? s0 : 0; const buf = new Int32Array(256), n = pos.gen(buf, false), out = [];
  for (let i = 0; i < n; i++) if (mFrom(buf[i]) === s0) out.push(E.sqName(mTo(buf[i])));
  return [...new Set(out)];
}
const RULE_TABS = ['move', 'special', 'end'];
function ruleItems(tab) {
  const it = (h, svg, p) => `<div class="rl-item"><h4>${t(h)}</h4>${svg}<p>${t(p)}</p></div>`;
  if (tab === 'move') return [
    it('rl.K.h', miniBoard({ e4: 'K' }, { dots: reach('K', 'e4') }), 'rl.K'),
    it('rl.Q.h', miniBoard({ d4: 'Q' }, { dots: reach('Q', 'd4') }), 'rl.Q'),
    it('rl.R.h', miniBoard({ d4: 'R' }, { dots: reach('R', 'd4') }), 'rl.R'),
    it('rl.B.h', miniBoard({ d4: 'B' }, { dots: reach('B', 'd4') }), 'rl.B'),
    it('rl.N.h', miniBoard({ d4: 'N', d5: 'p', e4: 'P' }, { dots: reach('N', 'd4', { d5: 'p', e4: 'P' }).filter(x => x !== 'e4') }), 'rl.N'),
    it('rl.P.h', miniBoard({ e2: 'P', c5: 'P', d6: 'p', b6: 'n', c6: 'p' }, { dots: ['e3', 'e4', 'd6', 'b6'] }), 'rl.P'),
  ].join('');
  if (tab === 'special') return [
    it('rl.castle.h', miniBoard({ e1: 'K', h1: 'R', a1: 'R', f2: 'P', g2: 'P', h2: 'P' }, { arrows: [['e1', 'g1'], ['h1', 'f1']] }), 'rl.castle'),
    it('rl.ep.h', miniBoard({ e5: 'P', d5: 'p' }, { arrows: [['e5', 'd6']], hl: ['d5'] }), 'rl.ep'),
    it('rl.promo.h', miniBoard({ e7: 'P', b8: 'q' }, { arrows: [['e7', 'e8']] }), 'rl.promo'),
    it('rl.check.h', miniBoard({ e8: 'k', e1: 'R', a1: 'K' }, { hl: ['e8'] }), 'rl.check'),
  ].join('');
  return [
    it('rl.mate.h', miniBoard({ g8: 'k', f7: 'p', g7: 'p', h7: 'p', d8: 'R', g1: 'K' }, { hl: ['g8'] }), 'rl.mate'),
    it('rl.stale.h', miniBoard({ h8: 'k', f7: 'Q', g6: 'K' }), 'rl.stale'),
    it('rl.draw.h', miniBoard({ e4: 'K', e6: 'k', c3: 'N' }), 'rl.draw'),
    it('rl.value.h', miniBoard({ a1: 'P', b1: 'N', c1: 'B', d1: 'R', e1: 'Q' }), 'rl.value'),
  ].join('');
}
let rulesTab = 'move';
// the rules dialog is the hands-on tutorial of rules.js (shared/ruletour.js); the old illustrated tabs are kept below as a fallback
function openRules(tab) { selTab('rules'); showOverlay('#rulesOverlay'); if (window.ChessRules) { ChessRules.open(0); return; } rulesTab = RULE_TABS.includes(tab) ? tab : 'move'; renderRules(); }
function renderRules() {
  if (window.ChessRules) { ChessRules.render(); return; }
  $('#rulesTabs').innerHTML = RULE_TABS.map(r => `<button data-r="${r}" class="${r === rulesTab ? 'sel' : ''}">${t('rl.tab.' + r)}</button>`).join('');
  $('#rulesBody').innerHTML = `<p class="rl-lead">${t('rl.lead.' + rulesTab)}</p><div class="rl-grid">${ruleItems(rulesTab)}</div>`;
}
$('#rulesTabs').onclick = e => { const b = e.target.closest('button[data-r]'); if (b) { rulesTab = b.dataset.r; renderRules(); } };
$('#rulesClose').onclick = () => { if (window.ChessRules) ChessRules.stop(); hideOverlay('#rulesOverlay'); };

// ---------------------------------------------------------------- new game dialog
let draft = {};
function levelLabelHTML(v) { return `Lv.${v} ${LV(v)}<small>${LVD(v)}</small>`; }
function segSync() {
  document.querySelectorAll('#segMode button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.mode));
  document.querySelectorAll('#segColor button').forEach(b => b.classList.toggle('sel', +b.dataset.v === draft.color));
  const m = draft.mode, game = m === 'ai' || m === 'pvp' || m === 'watch', ol = m === 'online';
  $('#fRatedInfo').classList.toggle('hidden', m !== 'rated');
  if (m === 'rated') $('#rtStats').innerHTML = rtStatsHtml();
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
  draft = { mode: lesson ? 'lesson' : puzzle ? 'puzzle' : rgame && settings.mode === 'ai' ? 'rated' : net ? 'online' : settings.mode, color: settings.color, level: settings.level, level2: settings.level2 };
  $('#optEval').checked = settings.eval; $('#optLast').checked = settings.last; $('#optAnim').checked = settings.anim; $('#optThreat').checked = settings.threat; $('#optCoach').checked = settings.coach;
  segSync(); showOverlay('#newOverlay');
}
$('#segMode').onclick = e => { const b = e.target.closest('button'); if (b) { draft.mode = b.dataset.v; segSync(); } };
$('#segColor').onclick = e => { const b = e.target.closest('button'); if (b) { draft.color = +b.dataset.v; segSync(); } };
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
  Object.assign(settings, { mode: draft.mode, color: draft.color, level: draft.level, level2: draft.level2, eval: $('#optEval').checked, last: $('#optLast').checked, anim: $('#optAnim').checked, threat: $('#optThreat').checked, coach: $('#optCoach').checked, flip: false });
  newGame();
};

// ====================================================================== rated games against the AI (local Elo)
// Each AI level has a rating measured against Stockfish's UCI_Elo scale (MODEL_CARD.md); the opponent is picked around the
// player's rating (mostly close, sometimes clearly stronger or weaker). 10 min + 5 s per move; leaving a game in progress loses it.
let rgame = null;
const RT_STORE = STORE + '-rated', RT_START = 1000, RT_CLOCK = { base: 600000, inc: 5000 };
const RT_LV = [0, 700, 1000, 1450, 1700, 1900, 2200, 2450, 3000, 3050, 3100];
function rtLoad() {
  let s = null; try { s = JSON.parse(localStorage.getItem(RT_STORE) || 'null'); } catch (e) {}
  if (!s || typeof s.r !== 'number' || !isFinite(s.r)) s = { r: RT_START, n: 0, w: 0, l: 0, d: 0, hist: [] };
  if (!Array.isArray(s.hist)) s.hist = [];
  return s;
}
function rtStore(s) { try { localStorage.setItem(RT_STORE, JSON.stringify(s)); } catch (e) {} }
const RT_CLASS = [800, 1200, 1600, 2000, 2400, 2700];
function rtRank(r) { let k = 0; while (k < RT_CLASS.length && r >= RT_CLASS[k]) k++; return t('rt.class' + (k + 1)); }
const rtD = d => (d >= 0 ? '+' : '−') + Math.abs(d);
const rtLvName = lv => `Lv.${lv} ${LV(lv)}`;
function rtPick(r) {
  { const S0 = rtLoad(); if (Placement.on(S0)) return Placement.pick(S0, RT_LV.map((x, i) => [i, x]).slice(1)); }
  const u = Math.random(), v = Math.random();
  const off = u < 0.1 ? 150 + v * 150 : u < 0.2 ? -(150 + v * 150) : (v * 2 - 1) * 100, target = r + off;
  let lv = 1; for (let i = 1; i <= 10; i++) if (Math.abs(RT_LV[i] - target) < Math.abs(RT_LV[lv] - target)) lv = i;
  const diff = RT_LV[lv] - r;
  return { lv, or: RT_LV[lv], tag: diff > 150 ? 'up' : diff < -150 ? 'down' : 'even' };
}
function rtLive() { return !!(rgame && !rgame.over && !gameOverRaw() && !lesson && !puzzle && settings.mode === 'ai'); }
function gameOverRaw() { const st = statusAtRaw(moves.length); return st.over; }
function statusAtRaw(i) { const keep = rgame; rgame = null; try { return statusAt(i); } finally { rgame = keep; } }
function rtClockLeft(c) {   // c: 0 white, 1 black
  if (!rgame || !rgame.ct) return 0;
  let v = rgame.ct[c];
  if (rtLive() && !rgame.hold && toMoveAt(moves.length) - 1 === c) v -= Date.now() - rgame.t;
  return Math.max(0, v);
}
function fmtClock(ms) { const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); }
let rtTickPly = -1;
setInterval(() => {
  if (!rtLive() || rgame.hold) return;
  const c = toMoveAt(moves.length) - 1, left = rtClockLeft(c);
  const el = $('#count' + (c + 1)); if (el) el.textContent = fmtClock(left);
  // time signal: only for my own clock while it is running (a new countdown each move)
  if (window.CountTick) { if (rtTickPly !== moves.length) { rtTickPly = moves.length; CountTick.reset('rt'); } if (c + 1 === humanColor) CountTick.feed(left, 'rt'); }
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
const lessonsReady = fetch('lessons.json?v=20261019g').then(r => r.json()).then(d => (LESSONS = d)).catch(() => null);
const LS_STORE = STORE + '-lessons', PZ_STORE = STORE + '-puzzles';
function lsProgress() { try { return JSON.parse(localStorage.getItem(LS_STORE) || '{}'); } catch (e) { return {}; } }
function pzProgress() { try { return JSON.parse(localStorage.getItem(PZ_STORE) || '{}'); } catch (e) { return {}; } }
let introIdx = 0, savedGame = null;
function stashGame() { olDetach(); if (!lesson && !puzzle) savedGame = { moves, cur, evals: evals.slice(), humanColor }; }
function exitSpecial() {
  if (!lesson && !puzzle) return;
  lesson = null; puzzle = null; lessonMarks = []; labelList = null;
  document.body.classList.remove('in-lesson', 'in-puzzle');
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false;
  startFen = null;
  if (savedGame) { moves = savedGame.moves; cur = savedGame.cur; evals = savedGame.evals; humanColor = savedGame.humanColor; savedGame = null; }
  else { moves = []; cur = 0; evals = []; }
  orient(); drawSquares(); shownKey = ''; syncPieces(new Int8Array(128));
  reviewing = cur !== moves.length; hintList = null; gameOverShown = gameOver(moves.length);
}
function quitSpecial() { exitSpecial(); update(false); afterPosition(); }
function showLessonView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
async function openLessons() {
  await lessonsReady; selTab('lesson');
  $('#lsListTitle').textContent = t('ls.title'); $('#lsListDesc').textContent = t('ls.desc');
  if (!LESSONS) { toast(t('ls.fail')); return; }
  const pr = lsProgress();
  let course = '', no = 0;
  $('#lessonList').innerHTML = LESSONS.steps.map((s, i) => {
    const r = pr[s.id], c = s.course || 'tactics';
    let head = '';
    if (c !== course) { course = c; no = 0; head = `<p class="ls-course"><b>${t('course.' + c)}</b><small>${t('course.' + c + '.sub')}</small></p>`; }
    no++;
    const score = r ? (s.kind === 'drill' ? '★' + r.best + '/' + s.stages.length * 3 : t('u.pt', { n: r.best })) : '';
    return head + `<button class="lesson-item" data-i="${i}"><span class="no">${no}</span><span class="tx"><b>${t('ls.' + s.id + '.title')}</b><small>${t('ls.' + s.id + '.sub')}</small></span><span class="st ${r && r.clear ? 'clear' : ''}">${r ? (r.clear ? t('ls.clear') + ' ' : '') + score : t('ls.notyet')}</span></button>`;
  }).join('');
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
$('#lessonList').onclick = e => { const b = e.target.closest('.lesson-item'); if (!b) return; if (b.dataset.o !== undefined) openOpeningChoice(+b.dataset.o); else openIntro(+b.dataset.i); };
function fenPieces(fen) { const out = {}; const rows = fen.split(' ')[0].split('/'); rows.forEach((row, i) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) { f += +ch; continue; } out['abcdefgh'[f] + (8 - i)] = ch; f++; } }); return out; }
function openIntro(i) {
  introIdx = i; const s = LESSONS.steps[i]; openChoiceIdx = -1; $('#btnLessonStart').classList.remove('hidden');
  $('#liStep').textContent = t('course.' + (s.course || 'tactics')) + ' · STEP ' + stepNo(i);
  $('#liTitle').textContent = t('ls.' + s.id + '.title');
  const d = s.diagram;
  $('#liBody').innerHTML = (d ? `<div class="mini">${miniBoard(fenPieces(d.fen), { arrows: d.arrows || [], hl: d.hl || [], dots: d.dots || [] })}</div>` : '') + t('ls.' + s.id + '.intro');
  showLessonView('lessonIntroView');
}
$('#btnLessonBack').onclick = () => openChoiceIdx >= 0 ? openOpenings() : openLessons();
$('#btnLessonClose').onclick = () => hideOverlay('#lessonOverlay');
$('#btnLessonStart').onclick = () => startLesson(introIdx);
$('#btnLessonQuit2').onclick = () => { hideOverlay('#lessonOverlay'); quitSpecial(); };
$('#btnLessonRetry').onclick = () => { if (lesson && lesson.virt && lesson.virt.id === 'mk') { hideOverlay('#lessonOverlay'); lesson = { step: 0, virt: lesson.virt, i: 0, results: [], answered: false, hinted: false, me: P1 }; document.body.classList.add('in-lesson'); loadLessonProblem(); return; } if (lesson && lesson.virt) startPractice(lesson.gi); else startLesson(lesson ? lesson.step : introIdx); };
$('#btnLessonNextStep').onclick = () => { const n = (lesson ? lesson.step : introIdx) + 1; if (n < LESSONS.steps.length) openIntro(n); else { hideOverlay('#lessonOverlay'); quitSpecial(); } };
function enterSpecial(fen) {
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false; stopPlay();
  startFen = fen; moves = []; cur = 0; reviewing = false; hintList = null; lessonMarks = []; labelList = null; evals = [];
  orient(); drawSquares(); shownKey = ''; syncPieces(new Int8Array(128));
}
function startLesson(step) {
  hideOverlay('#lessonOverlay');
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle');
  lesson = { step, i: 0, results: [], answered: false, hinted: false, me: P1 };
  document.body.classList.add('in-lesson');
  loadLessonProblem();
}
function stepNo(i) { const c = LESSONS.steps[i].course || 'tactics'; let n = 0; for (let k = 0; k <= i; k++) if ((LESSONS.steps[k].course || 'tactics') === c) n++; return n; }
const curStep = () => lesson.virt || LESSONS.steps[lesson.step];
function lessonProblem() { return curStep().problems[lesson.i]; }
function loadLessonProblem() {
  const s = curStep();
  if (s.kind === 'drill') {
    const st = s.stages[lesson.i];
    lesson.drill = true; lesson.stage = st; lesson.used = 0; lesson.me = P1;
    enterSpecial(st.fen + ' w - - 0 1');
    lesson.answered = false; lesson.hinted = false;
    update(false); renderLessonCard(); $('#lsFb').innerHTML = t('dr.start', { p: st.par });
    // a single piece: select it right away so the reachable squares are shown
    const { pos } = posAt(0), mine = []; for (let q = 0; q < 128; q++) { if (q & 0x88) { q += 7; continue; } if (pos.b[q] && !(pos.b[q] >> 3)) mine.push(q); }
    if (mine.length === 1) { sel = { from: mine[0] }; renderFx(); }
    return;
  }
  lesson.drill = false;
  const P = lessonProblem();
  lesson.me = P.fen.split(' ')[1] === 'b' ? P2 : P1;
  enterSpecial(P.fen);
  // the stored moves are UCI strings: convert once for this position
  const pos = posAt(0).pos;
  if (P.cand) { P._freq = new Map(P.cand.map(([u, c]) => [pos.fromUci(u), c])); P._best = pos.fromUci(P.cand[0][0]); P._sc = null; P._ok = null; }
  else if (P.ok) { P._ok = new Set(P.ok.map(u => pos.fromUci(u))); P._best = pos.fromUci(P.ok[0]); P._sc = null; }
  else { P._sc = P.sc.map(([u, v]) => [pos.fromUci(u), v]); P._best = pos.fromUci(P.best); }
  lesson.answered = false; lesson.hinted = false;
  update(false); renderLessonCard(); $('#lsFb').innerHTML = '';
}
function renderLessonCard() {
  const s = curStep(), n = s.kind === 'drill' ? s.stages.length : s.problems.length;
  const mk = lesson.virt && s.id === 'mk';
  $('#lsStep').textContent = lesson.virt ? t(mk ? 'mk.step' : 'op.practiceStep', { i: lesson.i + 1, n }) : t('ls.stepq', { s: stepNo(lesson.step), i: lesson.i + 1, n });
  $('#lsTitle').textContent = mk ? t('mk.title') : lesson.virt ? LL(s.title) : t('ls.' + s.id + '.title');
  if (s.kind === 'drill') {
    $('#lsPrompt').innerHTML = `<div class="ls-goal"><span class="dstar">★</span><span>${t('ls.' + s.id + '.goal')} ${t('dr.par', { p: lesson.stage.par })}</span></div>`;
    $('#lsDots').innerHTML = s.stages.map((_, i) => { const r = lesson.results[i]; return `<i class="${r === undefined ? '' : r >= 2 ? 'ok' : 'mid'} ${i === lesson.i ? 'cur' : ''}"></i>`; }).join('');
    $('#lsHint').textContent = t('dr.reset'); $('#lsHint').disabled = false;
  } else {
    $('#lsPrompt').innerHTML = `<div class="ls-goal"><span class="pdisc p${lesson.me}"></span><span>${t('ls.turn', { c: pname(lesson.me) })} ${lesson.virt ? t(mk ? 'mk.goal' : 'op.goal') : t('ls.' + s.id + '.goal')}</span></div>`;
    $('#lsDots').innerHTML = s.problems.map((_, i) => { const r = lesson.results[i]; return `<i class="${r === undefined ? '' : r >= 16 ? 'ok' : r >= 10 ? 'mid' : 'ng'} ${i === lesson.i ? 'cur' : ''}"></i>`; }).join('');
    $('#lsHint').textContent = t('ls.hint'); $('#lsHint').disabled = lesson.answered;
  }
  $('#lsNext').textContent = lesson.i + 1 < n ? t('ls.next') : t('ls.result');
  $('#lsNext').disabled = !lesson.answered;
}
function problemPoints(P, m) {
  if (P._freq) { const c = P._freq.get(m) || 0, top = P.cand[0][1]; return c >= top ? 20 : c ? Math.max(4, Math.round(20 * Math.sqrt(c / top))) : 0; }
  if (P._ok) return P._ok.has(m) ? 20 : 0;
  const val = new Map(P._sc), best = Math.max(...P._sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -MATE;
  if (best > MATET && mine > MATET) return mine >= best ? 20 : 16;
  if (mine >= best - 10) return 20;
  if (best > MATET) return mine > 150 ? 8 : mine > -60 ? 4 : 0;
  if (mine < -MATET) return 0;
  const loss = sOfV(best) - sOfV(mine);
  return Math.max(0, Math.round(20 * (1 - loss / 0.45)));
}
function lessonAnswer(m) {
  const P = lessonProblem(), s = curStep(), { pos } = posAt(0);
  lesson.answered = true;
  if (P._freq) return openingAnswer(P, m, pos);
  const pts = problemPoints(P, m); lesson.results[lesson.i] = pts; renderLessonCard();
  const best = P._best, lbl = pts === 20 ? 'fb.perfect' : pts >= 16 ? 'fb.good' : pts >= 10 ? 'fb.ng' : 'fb.bad';
  const bs = pos.san(best), ms = pos.san(m), val = new Map(P._sc || []), fmt = v => valLabel(v).big;
  let fb = `<span class="pts ${pts >= 16 ? 'ok' : pts >= 10 ? 'mid' : 'ng'}">+${t('u.pt', { n: pts })}</span> ` + (P._ok ? '' : `<b class="${pts >= 16 ? 'ok' : 'ng'}">${t(lbl)}</b> `);
  if (P._ok) fb += pts ? t('ls.' + s.id + '.why', { m: ms, x: ms }) : t('ls.' + s.id + '.ng', { m: bs, x: ms });
  else {
    fb += s.id === 'mk' ? t('mk.why', { m: bs, x: pos.san(pos.fromUci(P.played)), q: t('q.' + P.q) }) : t('ls.' + s.id + '.why', { m: bs, x: ms });
    fb += `<br><small style="color:var(--dim)">${t('fb.values', { a: fmt(val.has(m) ? val.get(m) : -MATE), b: fmt(val.get(best)), x: ms })}</small>`;
  }
  $('#lsFb').innerHTML = fb;
  playChime(pts >= 16);
  playMove2(m);
  const tok = busyToken;
  setTimeout(() => {
    if (!lesson || tok !== busyToken) return;
    moves = []; cur = 0; sel = null; lessonMarks = [];
    lessonMarks.push({ arrow: [mFrom(best), mTo(best)], cls: '' }, { at: mTo(best), cls: 'ok' });
    if (m !== best && !(P._ok && P._ok.has(m))) lessonMarks.push({ arrow: [mFrom(m), mTo(m)], cls: 'ng' }, { at: mTo(m), cls: 'ng' });
    if (P._ok) { if (P._ok.has(m)) lessonMarks = [{ arrow: [mFrom(m), mTo(m)], cls: '' }, { at: mTo(m), cls: 'ok' }]; update(false); return; }
    const sorted = P._sc.slice().sort((a, b) => b[1] - a[1]).slice(0, 4), seen = new Set();
    labelList = [];
    for (const [mm, v] of sorted) { if (seen.has(mTo(mm))) continue; seen.add(mTo(mm)); const L = valLabel(v); labelList.push({ at: mTo(mm), big: L.big, cls: L.cls + (mm === best ? ' best' : '') }); }
    if (!seen.has(mTo(m)) && val.has(m)) { const L = valLabel(val.get(m)); labelList.push({ at: mTo(m), big: L.big, cls: L.cls }); }
    update(false);
  }, moveDur() + 800);
}
$('#lsHint').onclick = () => {
  if (lesson && lesson.study) { if (lesson.i > 0) { lesson.i--; showStudy(false); } return; }
  if (lesson && lesson.drill) { loadLessonProblem(); return; }
  if (!lesson || lesson.answered) return;
  lesson.hinted = true;
  const s = curStep(), { pos } = posAt(cur), me = pos.side, op = me ^ 1;
  if (lesson.virt) { const P = lessonProblem(); lessonMarks = [{ at: mFrom(P._best), cls: 'ok' }]; $('#lsFb').innerHTML = t(s.id === 'mk' ? 'mk.hint' : 'op.hint'); renderFx(); return; }
  $('#lsFb').innerHTML = t('ls.' + s.id + '.hint');
  lessonMarks = [];
  if (s.id === 'capture') for (const q of hanging(pos, op)) lessonMarks.push({ at: q, cls: 'hang' });
  if (s.id === 'escape') for (const q of hanging(pos, me)) lessonMarks.push({ at: q, cls: 'hang' });
  if (s.id === 'mate1' || s.id === 'mate2') lessonMarks.push({ at: pos.ksq[op], cls: 'hang' });
  if (s.id === 'fork' || s.id === 'pin') { const P = lessonProblem(); lessonMarks.push({ at: mFrom(P._best), cls: 'ok' }); }
  if (s.id === 'promote' || s.id === 'b_special') { const P = lessonProblem(); lessonMarks.push({ at: mFrom(P._best), cls: 'ok' }); }
  if (s.id === 'b_check' || s.id === 'b_mate' || s.id === 'b_draw') lessonMarks.push({ at: pos.ksq[op], cls: 'hang' });
  if (s.id === 'b_escape') { lessonMarks.push({ at: pos.ksq[me], cls: 'hang' }); for (let q = 0; q < 128; q++) { if (q & 0x88) { q += 7; continue; } const p = pos.b[q]; if (!p || (p >> 3) !== op) continue; const b2 = pos.b.slice(); for (let z = 0; z < 128; z++) if (!(z & 0x88) && z !== q && pos.b[z] && (pos.b[z] >> 3) === op && (pos.b[z] & 7) !== 6) pos.b[z] = 0; const a = pos.attacked(pos.ksq[me], op); pos.b.set(b2); if (a) lessonMarks.push({ at: q, cls: 'ng' }); } }
  renderFx();
};
$('#lsNext').onclick = () => {
  if (lesson && lesson.study) { if (lesson.i < lesson.g.study.steps.length) { lesson.i++; showStudy(true); } else startPractice(lesson.gi); return; }
  if (!lesson || !lesson.answered) return;
  const s = curStep(), total = s.kind === 'drill' ? s.stages.length : s.problems.length;
  if (lesson.i + 1 < total) { lesson.i++; loadLessonProblem(); return; }
  const n = lesson.results.reduce((a, b) => a + b, 0), pass = s.kind === 'drill' ? true : n >= 75;
  if (lesson.virt) {
    const mk = s.id === 'mk', full = total * 20, ok = mk ? n >= full * 0.75 : pass;
    if (!mk) { const op = opProg(), old = op[s.id] || { best: 0, pass: false }; op[s.id] = { best: Math.max(old.best, n), pass: old.pass || pass }; try { localStorage.setItem(OP_STORE, JSON.stringify(op)); } catch (e) {} }
    $('#ldTitle').textContent = mk ? t(ok ? 'mk.good' : 'mk.done') : t(pass ? 'op.pass' : 'ls.failed');
    $('#ldSub').innerHTML = `<div class="ld-score ${ok ? 'ok' : 'ng'}">${t('u.pt', { n })}<small> / ${full}</small></div>` + lesson.results.map((x, k) => `${k + 1}: ${t('u.pt', { n: x })}`).join('　') + (ok || mk ? '' : `<br>${t('ls.needPass')}`);
    $('#btnLessonPlay').classList.add('hidden'); $('#btnLessonNextStep').classList.add('hidden');
    showLessonView('lessonDoneView'); showOverlay('#lessonOverlay');
    if (ok) confetti();
    return;
  }
  const pr = lsProgress(), old = pr[s.id] || { best: 0, clear: false };
  pr[s.id] = { best: Math.max(old.best, n), clear: old.clear || pass };
  try { localStorage.setItem(LS_STORE, JSON.stringify(pr)); } catch (e) {}
  $('#ldTitle').textContent = t(pass ? 'ls.passed' : 'ls.failed');
  if (s.kind === 'drill') $('#ldSub').innerHTML = `<div class="ld-score ok">★ ${n}<small> / ${total * 3}</small></div>` + lesson.results.map((x, k) => `${k + 1}: ${'★'.repeat(x)}${'☆'.repeat(3 - x)}`).join('　') + `<br><small style="color:var(--dim)">${t('dr.more')}</small>`;
  else $('#ldSub').innerHTML = `<div class="ld-score ${pass ? 'ok' : 'ng'}">${t('u.pt', { n })}<small> / 100</small></div>` + lesson.results.map((x, k) => `${k + 1}: ${t('u.pt', { n: x })}`).join('　') + (pass ? '' : `<br>${t('ls.needPass')}`);
  const lastBasic = s.course === 'basics' && !(LESSONS.steps[lesson.step + 1] && LESSONS.steps[lesson.step + 1].course === 'basics');
  if (lastBasic && pass) $('#ldSub').innerHTML += `<p class="ls-grad">${t('course.graduate')}</p>`;
  $('#btnLessonPlay').classList.toggle('hidden', !(lastBasic && pass));
  $('#btnLessonNextStep').classList.toggle('hidden', lesson.step + 1 >= LESSONS.steps.length);
  showLessonView('lessonDoneView'); showOverlay('#lessonOverlay');
  if (pass) confetti();
};
$('#lsQuit').onclick = () => quitSpecial();
$('#lsList').onclick = () => { if (!lesson) return; if (lesson.study || lesson.virt) openOpenings(); else openLessons(); };
$('#btnLessonPlay').onclick = () => {
  hideOverlay('#lessonOverlay'); savedGame = null; exitSpecial();
  Object.assign(settings, { mode: 'ai', color: P1, level: 1 });
  newGame();
};
function drillMove(m) {
  const L = lesson; if (!L || L.answered) return;
  const before = drillStarsLeft().length;
  moves = moves.slice(0, cur); moves.push(m); cur = moves.length; L.used++;
  update(true);
  const left = drillStarsLeft();
  if (left.length < before) playTick();
  if (!left.length) {
    L.answered = true;
    const par = L.stage.par, k = L.used, st = k <= par ? 3 : k <= par + 2 ? 2 : 1;
    L.results[L.i] = st;
    setTimeout(() => playChime(true), 150);
    $('#lsFb').innerHTML = `<b class="ok">${t('dr.clear')}</b> <span class="dstars">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span><br>${t('dr.used', { n: k, p: par })}` + (st < 3 ? ` ${t('dr.tryPar')}` : '');
    renderLessonCard();
  } else $('#lsFb').innerHTML = t('dr.progress', { n: L.used, left: left.length });
}

// ====================================================================== openings: study a main line, then practice the moves strong players choose
let OPEN = null, openChoiceIdx = -1;
const openReady = fetch('openings.json?v=20261019g').then(r => r.json()).then(d => (OPEN = d)).catch(() => null)
  .then(() => { if (!OPEN) document.querySelectorAll('.ls-tabs button[data-v=open]').forEach(b => b.remove()); });
const OP_STORE = STORE + '-open';
function opProg() { try { return JSON.parse(localStorage.getItem(OP_STORE) || '{}'); } catch (e) { return {}; } }
const LL = o => o ? (o[LANG] !== undefined ? o[LANG] : o.en !== undefined ? o.en : o.ja) : '';
async function openOpenings() {
  await openReady; selTab('open');
  if (!OPEN) { toast(t('ls.fail')); return; }
  $('#lsListTitle').textContent = t('op.title'); $('#lsListDesc').textContent = t('op.desc');
  const pr = opProg();
  let head = '';
  $('#lessonList').innerHTML = OPEN.sets.map((g, i) => {
    const r = pr[g.id], first = g.prefix.split(' ')[0];
    const grp = first === 'e2e4' ? 'e4' : first === 'd2d4' ? 'd4' : 'other';
    let h = ''; if (grp !== head) { head = grp; h = `<p class="ls-course"><b>${t('op.grp.' + grp)}</b></p>`; }
    return h + `<button class="lesson-item" data-o="${i}"><span class="no op">${LL(g.label)}</span><span class="tx"><b>${LL(g.title)}</b><small>${LL(g.short)}</small></span><span class="st ${r && r.pass ? 'clear' : ''}">${r ? (r.pass ? '✓ ' : '') + t('u.pt', { n: r.best }) : t('ls.notyet')}</span></button>`;
  }).join('') + `<p style="font-size:11px;color:var(--dim);margin-top:6px;line-height:1.6;grid-column:1 / -1">${LL(OPEN.credit)}</p>`;
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
function lineAfter(uciList) { const pos = E.Pos.fromFEN(E.START); const pcs = {}; for (const u of uciList) pos.make(pos.fromUci(u)); for (let q = 0; q < 128; q++) { if (q & 0x88) { q += 7; continue; } const p = pos.b[q]; if (p) pcs[E.sqName(q)] = ' PNBRQK'[p & 7][p & 8 ? 'toLowerCase' : 'toUpperCase'](); } return pcs; }
function openOpeningChoice(i) {
  openChoiceIdx = i; const g = OPEN.sets[i], pre = g.prefix.split(' ');
  $('#liStep').textContent = t('op.title') + ' · ' + t(g.side === 'w' ? 'op.forWhite' : 'op.forBlack');
  $('#liTitle').textContent = LL(g.title);
  const last = pre[pre.length - 1];
  $('#liBody').innerHTML = `<div class="mini">${miniBoard(lineAfter(pre), { arrows: [[last.slice(0, 2), last.slice(2, 4)]], hl: [], dots: [] })}</div>` + LL(g.intro).map(x => `<p>${x}</p>`).join('') +
    `<div class="op-choice"><button class="lesson-item" data-study="1"><span class="no">📖</span><span class="tx"><b>${t('op.study')}</b><small>${t('op.studyDesc', { n: g.study.steps.length })}</small></span></button>` +
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
  lesson = { study: true, gi, g, i: 0, results: [], answered: true, me: g.side === 'b' ? P2 : P1 };
  document.body.classList.add('in-lesson');
  enterSpecial(null);
  const pos = E.Pos.fromFEN(E.START); lesson.line = g.study.steps.map(st => { const m = pos.fromUci(st[0]); pos.make(m); return m; });
  showStudy(false);
}
function showStudy(anim) {
  const L = lesson, g = L.g, st = g.study, i = L.i, N = st.steps.length;
  moves = L.line.slice(0, i); cur = i; lessonMarks = []; labelList = null; hintList = null;
  update(anim);
  $('#lsStep').textContent = `${t('op.study')} · ${i}/${N}`;
  $('#lsTitle').textContent = LL(g.title);
  $('#lsDots').innerHTML = `<span class="study-bar"><span style="width:${Math.round(i * 100 / N)}%"></span></span>`;
  let pr, fb = '';
  if (i === 0) { pr = t('op.studyStart'); fb = LL(g.intro).join('<br>'); }
  else {
    const [, pct, win] = st.steps[i - 1], no = Math.floor((i - 1) / 2) + 1, dots = (i - 1) % 2 ? '…' : '.';
    pr = `<b style="font-size:16px"><bdi>${no}${dots} ${sanOf(i - 1)}</bdi></b> <span class="op-meta">${t('op.pct', { p: pct, w: win })}</span>`;
    const note = st.notes && st.notes[i - 1]; fb = note ? LL(note) : '';
  }
  if (i === N) fb += (fb ? '<br>' : '') + `<b style="color:var(--brass)">${t('op.studyEnd')}</b>`;
  fb += `<br><button class="op-play" id="lsPlayHere">${t('op.playHere')}</button>`;
  $('#lsPrompt').innerHTML = `<div class="ls-goal"><span>${pr}</span></div>`; $('#lsFb').innerHTML = fb;
  // keep the card from shrinking while stepping through the line (a shorter note would pull the page up on phones)
  { const c = $('#lessonCard'); lesson.cardMin = Math.max(lesson.cardMin || 0, c.offsetHeight); c.style.minHeight = lesson.cardMin + 'px'; }
  $('#lsHint').textContent = t('op.prev'); $('#lsHint').disabled = i === 0;
  $('#lsNext').textContent = i === N ? t('op.toPractice') : t('op.next'); $('#lsNext').disabled = false;
  stSync();
}
// ---- opening study: compact step bar (phones) + autoplay (about one move every 1.2 s; any tap / key stops it)
var stTimer = 0;
function stStop() { if (stTimer) { clearInterval(stTimer); stTimer = 0; } stSync(); }
function stTo(to) {
  const N = lesson.g.study.steps.length;
  if (to < 0 || to > N || to === lesson.i) return;
  const one = to === lesson.i + 1; lesson.i = to; showStudy(one);
}
function stGo(what) {
  if (!lesson || !lesson.study) return;
  const N = lesson.g.study.steps.length;
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
  const N = lesson.g.study.steps.length, i = lesson.i, q = k => nav.querySelector('[data-sn="' + k + '"]');
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
  const mv = lesson.line.slice(0, lesson.i), side = mv.length % 2 === 0 ? P1 : P2;
  savedGame = null; exitSpecial();
  busyToken++; cancelWorker('ai'); cancelWorker('ana');
  Object.assign(settings, { mode: 'ai' }); humanColor = side;
  moves = mv; cur = mv.length; evals = []; reviewing = false; gameOverShown = false;
  orient(); drawSquares(); shownKey = ''; syncPieces(new Int8Array(128)); update(false); save(); afterPosition();
  toast(t('op.playing'));
});
function startPractice(gi) {
  const g = OPEN.sets[gi], pool = g.problems.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  hideOverlay('#lessonOverlay');
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle');
  lesson = { step: 0, gi, virt: { id: g.id, title: g.title, problems: pool.slice(0, 5) }, i: 0, results: [], answered: false, hinted: false, me: P1 };
  document.body.classList.add('in-lesson');
  loadLessonProblem();
}
function openingAnswer(P, m, pos) {
  const pts = problemPoints(P, m); lesson.results[lesson.i] = pts; renderLessonCard();
  const tot = P.cand.reduce((a, c) => a + c[1], 0), pc = c => Math.round(c * 100 / tot);
  const ms = pos.san(m), top = P.cand.slice(0, 3).map(([u, c]) => `<bdi>${pos.san(pos.fromUci(u))}</bdi> ${pc(c)}%`).join(' · ');
  const c = P._freq.get(m) || 0, lbl = pts === 20 ? 'fb.perfect' : c ? 'fb.good' : 'fb.bad';
  $('#lsFb').innerHTML = `<span class="pts ${pts >= 16 ? 'ok' : pts >= 10 ? 'mid' : 'ng'}">+${t('u.pt', { n: pts })}</span> <b class="${c ? 'ok' : 'ng'}">${t(lbl)}</b> ` + (c ? t('op.yourPct', { m: ms, p: pc(c) }) : t('op.rare', { m: ms })) + `<br><small style="color:var(--dim)">${t('op.top')}: ${top}</small>`;
  playChime(pts >= 10); playMove2(m);
  const tok = busyToken;
  setTimeout(() => {
    if (!lesson || tok !== busyToken) return;
    moves = []; cur = 0; sel = null; lessonMarks = [];
    labelList = [];
    P.cand.slice(0, 3).forEach(([u, cc], k) => { const mm = pos.fromUci(u); lessonMarks.push({ arrow: [mFrom(mm), mTo(mm)], cls: k ? 'a' + Math.min(3, k + 1) : '' }); labelList.push({ at: mTo(mm), big: pc(cc) + '%', cls: k ? '' : 'best' }); });
    if (!c) lessonMarks.push({ arrow: [mFrom(m), mTo(m)], cls: 'ng' });
    update(false);
  }, moveDur() + 800);
}

// ====================================================================== puzzles: mate in N
let PUZZLES = null;
const puzzlesReady = fetch('puzzles.json?v=20261019g').then(r => r.json()).then(d => (PUZZLES = d)).catch(() => null);
let pzLevel = 0;
// progress: { "level-index": stars 0..3 } (old saves stored true = solved, read as ★3)
const pzKey = (i, j) => `${i}-${j}`;
const starVal = x => x === true ? 3 : (+x || 0);
function pzRecs(i, pr) { pr = pr || pzProgress(); return PUZZLES.levels[i].puzzles.map((_, j) => starVal(pr[pzKey(i, j)])); }
// card colour from difficulty: mate length (1..4) or the tactics rating band
function themeTier(L) { if (L.kind === 'line') { const m = (L.band[0] + L.band[1]) / 2; return Math.max(0, Math.min(5, Math.floor((m - 700) / 300))); } return Math.max(0, Math.min(5, Math.round(((L.n || 1) - 1) * 1.4))); }
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
async function openPuzzles() {
  await puzzlesReady; selTab('puzzle');
  if (!PUZZLES) { toast(t('ls.fail')); return; }
  const pr = pzProgress(), dl = dailyPick(), di = dailyInfo(); PZBook.setLang(LANG);
  $('#pzLevels').innerHTML = (dl ? `<button class="lesson-item daily" data-daily="1"><span class="no">★</span><span class="tx"><b>${t('daily.title')} <span style="color:var(--dim);font-weight:400">${dl.date.slice(5).replace('-', '/')}</span></b><small>${pzName(dl.L)} · ${PUZZLES.levels[dl.L].kind === 'line' ? pzSub(dl.L) : t('pz.winIn', { n: PUZZLES.levels[dl.L].n })} · 🔥 ${t('daily.streak', { n: di.streak })}${di.best > 1 ? ' · ' + t('daily.best', { n: di.best }) : ''}</small></span><span class="st ${di.today ? 'clear' : ''}">${di.today ? '✓' : t('daily.go')}</span></button>` : '') + PUZZLES.levels.map((L, i) => {
    const prev = PUZZLES.levels[i - 1];
    let head = '';
    if (i === 0) head = `<p class="ls-course"><b>${t('pz.mateHead')}</b><small>${t('pz.mateHeadSub')}</small></p>`;
    if (L.kind === 'line' && (!prev || prev.kind !== 'line')) head = `<p class="ls-course"><b>${t('pz.tacHead')}</b><small>${t('pz.tacHeadSub')}</small></p>`;
    return head + PZBook.card({ i, no: pzNo(i), name: pzName(i), sub: pzSub(i), recs: pzRecs(i, pr), tier: themeTier(L) });
  }).join('') + (PUZZLES.levels.some(L => L.kind === 'line') ? `<p style="font-size:11px;color:var(--dim);margin-top:6px;line-height:1.6;grid-column:1 / -1">${t('pz.credit')}</p>` : '');
  showPzView('pzListView'); showOverlay('#puzzleOverlay');
}
$('#pzLevels').onclick = e => { const b = e.target.closest('.lesson-item, .pb-card'); if (!b) return; if (b.dataset.daily) { const dl = dailyPick(); if (dl) startPuzzle(dl.L, dl.j, dl.date); } else openPzGrid(+b.dataset.i); };
function pzNo(i) { const L = PUZZLES.levels[i]; let k = 0; for (let q = 0; q <= i; q++) if ((PUZZLES.levels[q].kind || 'mate') === (L.kind || 'mate')) k++; return k; }
function pzName(i) { const L = PUZZLES.levels[i]; return L.kind === 'line' ? t('pz.tlevel' + pzNo(i)) : t('pz.level' + (i + 1)); }
function pzSub(i) { const L = PUZZLES.levels[i]; return L.kind === 'line' ? t('pz.tsub', { a: L.band[0], b: L.band[1] }) : t('pz.levelSub', { n: L.n }); }
function openPzGrid(i, cur) {
  pzLevel = i; const L = PUZZLES.levels[i]; PZBook.setLang(LANG);
  $('#pzLevelTitle').textContent = pzName(i) + ' — ' + (L.kind === 'line' ? pzSub(i) : t('pz.winIn', { n: L.n }));
  $('#pzGrid').innerHTML = PZBook.grid({ recs: pzRecs(i), cur });
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
  const P = PUZZLES.levels[L].puzzles[j];
  if (P.line) {
    // tactics: the opponent's last move is shown first, then you play the solution line
    const me = P.fen.split(' ')[1] === 'b' ? P1 : P2;
    puzzle = { L, j, P, me, n: P.line.length >> 1, line: true, k: 1, state: 'play', busy: true, used: 0, daily: daily || null, hinted: false, failed: false, answered: false };
    document.body.classList.add('in-puzzle');
    enterSpecial(P.fen);
    update(false); renderPuzzleCard(); pzStatus(t('pz.tStart'));
    const Pz = puzzle;
    setTimeout(() => { if (puzzle !== Pz) return; playMove2(posAt(0).pos.fromUci(P.line[0])); setTimeout(() => { if (puzzle !== Pz) return; Pz.busy = false; renderPuzzleCard(); boardEl.classList.toggle('can', canHumanPlay()); pzPrefetch(Pz); }, moveDur()); }, 450);
    return;
  }
  puzzle = { L, j, P, me: P.fen.split(' ')[1] === 'b' ? P2 : P1, n: PUZZLES.levels[L].n, state: 'play', busy: false, used: 0, daily: daily || null, hinted: false, failed: false, answered: false };
  document.body.classList.add('in-puzzle');
  enterSpecial(P.fen);
  update(false); renderPuzzleCard(); pzStatus(t('pz.start'));
}
const THEMES = ['mateIn1', 'mateIn2', 'mateIn3', 'fork', 'pin', 'skewer', 'discoveredAttack', 'doubleCheck', 'sacrifice', 'deflection', 'attraction', 'hangingPiece', 'trappedPiece', 'backRankMate', 'smotheredMate', 'promotion', 'xRayAttack', 'intermezzo', 'quietMove', 'clearance', 'interference', 'capturingDefender', 'zugzwang', 'exposedKing', 'defensiveMove', 'endgame'];
function themeText(P) { return (P.th || []).filter(x => THEMES.includes(x)).map(x => t('th.' + x)).join(' · '); }
// ---------------------------------------------------------------- puzzles v2 (common spec): keep playing up to the puzzle's move count
// Mate in N (N >= 2): a move that does not force mate is not failed at once — the defender answers with the engine's best
//   defence and you may play on until the N moves are used ("N moves left" in the status). Mating earlier (or with another
//   line inside the count) is a solution. Obvious mistakes are flagged at once (blunder + failed):
//     - after the move the opponent can mate in one,
//     - the move stalemates (a draw),
//     - after the move the attacker no longer has the material to mate at all (lone king, king + one minor piece).
// Tactics (best line, 2+ own moves): a move other than the main line may continue only while it keeps the advantage the
//   puzzle aims at (engine values, from the mover's side; best = value of the best move before the move, mine = value after it):
//     keep  : best is a mate and mine is still a mate or >= +6.00, otherwise mine >= +2.00 and mine >= best - max(1.50, 40% of best)
//             -> the opponent answers with the engine's best reply; finishing the count while still keeping it solves the
//                puzzle as ★★ (not the main line), mating on the way solves it too.
//     lost  : below that -> failed (the answer is shown).
//     blunder: the opponent can now force mate, or mine <= -1.50 and at least 4.00 below best (material given away for
//             nothing) -> "clear mistake" + failed.
// Puzzles with a single own move (mate in 1, one-move tactics) are judged at once as before.
const pzAnswerSan = Pz => { const p0 = posAt(0).pos, u = Pz.line ? Pz.P.line[1] : Pz.P.answer; if (Pz.line) { const q = E.replay(startFen, [p0.fromUci(Pz.P.line[0])]).pos; return q.san(q.fromUci(u)); } return p0.san(p0.fromUci(u)); };
function pzAnswerWas(Pz) { try { return ' ' + t('pz2.answerWas', { b: pzAnswerSan(Pz) }); } catch (e) { return ''; } }
function pzRewindFail(Pz, m, best, html) {   // take the last move back, show it in red (and the right move in gold)
  moves = moves.slice(0, cur - 1); cur = moves.length; Pz.used--; Pz.busy = false; Pz.state = 'fail'; Pz.failed = true;
  lessonMarks = [];
  if (best) lessonMarks.push({ arrow: [mFrom(best), mTo(best)], cls: '' }, { at: mTo(best), cls: 'ok' });
  lessonMarks.push({ arrow: [mFrom(m), mTo(m)], cls: 'ng' });
  update(false); playChime(false); pzStatus(html); renderPuzzleCard();
}
function pzOutOfMoves(Pz) {
  Pz.state = 'fail'; Pz.failed = true; Pz.busy = false; playChime(false);
  pzStatus(`<b class="ng">${t('pz.fail')}</b> ${PZBook.t('outOfMoves', { n: Pz.n })}${pzAnswerWas(Pz)}`); renderPuzzleCard();
}
const pzAna = () => request('ana', { type: 'analyze', moves: moves.slice(0, cur), time: 900 });
function pzPrefetch(Pz) { if (Pz.line && Pz.n > 1 && Pz.state === 'play') Pz.pre = pzAna(); }
const topOf = r => { let b = null; for (const e of (r && r.list) || []) if (!b || e.v > b.v) b = e; return b; };
async function linePuzzleMove(m) {
  const Pz = puzzle, P = Pz.P, { pos } = posAt(cur), exp = Pz.off ? 0 : pos.fromUci(P.line[Pz.k]), ms = pos.san(m), es = exp ? pos.san(exp) : '';
  const pre = Pz.pre; Pz.pre = null;
  Pz.busy = true; lessonMarks = [];
  playMove2(m); Pz.used++;
  const st = statusAt(cur), last = Pz.used >= Pz.n;
  renderPuzzleCard();
  if (st.over && st.winner === Pz.me) { setTimeout(() => puzzleSolved(), moveDur() + 300); return; }
  if (m !== exp && Pz.n === 1) {   // one-move puzzle: judged at once
    await sleep(moveDur() + 400); if (puzzle !== Pz) return;
    pzRewindFail(Pz, m, exp, `<b class="ng">${t('pz.fail')}</b> ${t('pz.failLine', { m: ms, b: es })}`); return;
  }
  if (m !== exp) {
    // off the main line: judge with the engine
    const tok = busyToken; pzStatus(t('pz.checking'));
    const before = (pre && await pre) || null;
    if (puzzle !== Pz || tok !== busyToken) return;
    let bestV = topOf(before) ? topOf(before).v : null;
    if (bestV === null) { const b2 = await request('ana', { type: 'analyze', moves: moves.slice(0, cur - 1), time: 900 }); if (puzzle !== Pz) return; bestV = topOf(b2) ? topOf(b2).v : 300; }
    const after = st.over ? null : await pzAna();
    if (puzzle !== Pz || tok !== busyToken) return;
    const opp = topOf(after), mine = st.over ? 0 : opp ? -opp.v : 0;
    let verdict;
    if (opp && opp.v > MATET) verdict = 'mated';
    else if (mine <= -150 && mine <= bestV - 400) verdict = 'loses';
    else if (bestV > MATET) verdict = mine > MATET || mine >= 600 ? 'keep' : 'lost';
    else verdict = mine >= 200 && mine >= bestV - Math.max(150, bestV * 0.4) ? 'keep' : 'lost';
    if (verdict === 'mated' || verdict === 'loses') {
      await sleep(250); if (puzzle !== Pz) return;
      pzRewindFail(Pz, m, exp, `<b class="ng">${PZBook.t('blunder')}</b> ${t(verdict === 'mated' ? 'pz2.tMated' : 'pz2.tLoses', { m: ms })}${pzAnswerWas(Pz)}`); return;
    }
    if (verdict === 'lost') {
      await sleep(250); if (puzzle !== Pz) return;
      if (exp) pzRewindFail(Pz, m, exp, `<b class="ng">${t('pz.fail')}</b> ${t('pz2.tLost', { m: ms, b: es })}`);
      else pzRewindFail(Pz, m, 0, `<b class="ng">${t('pz.fail')}</b> ${t('pz2.tLost', { m: ms, b: '—' })}${pzAnswerWas(Pz)}`);
      return;
    }
    // keeps the advantage: play on with the engine's replies
    Pz.off = true; Pz.failed = true;
    if (last) { setTimeout(() => puzzleSolved(), moveDur() + 200); return; }
    pzStatus(t('pz2.tCont', { m: ms }));
    await sleep(moveDur() + 350); if (puzzle !== Pz) return;
    if (!opp) { puzzleSolved(); return; }
    playMove2(opp.m);
    await sleep(moveDur()); if (puzzle !== Pz) return;
    if (statusAt(cur).over) { pzOutOfMoves(Pz); return; }
    Pz.busy = false; renderPuzzleCard(); boardEl.classList.toggle('can', canHumanPlay());
    pzStatus(PZBook.t('movesLeft', { n: Pz.n - Pz.used })); pzPrefetch(Pz);
    return;
  }
  if (last) { setTimeout(() => puzzleSolved(), moveDur() + 300); return; }
  pzStatus(t('pz.tGood'));
  await sleep(moveDur() + 350); if (puzzle !== Pz) return;
  playMove2(posAt(cur).pos.fromUci(P.line[Pz.k + 1])); Pz.k += 2;
  await sleep(moveDur()); if (puzzle !== Pz) return;
  Pz.busy = false; renderPuzzleCard(); boardEl.classList.toggle('can', canHumanPlay());
  pzStatus(t('pz.tYourMove', { n: Pz.n - Pz.used })); pzPrefetch(Pz);
}
function renderPuzzleCard() {
  const Pz = puzzle, L = PUZZLES.levels[Pz.L]; PZBook.setLang(LANG);
  $('#pzStep').textContent = Pz.daily ? `★ ${t('daily.title')} · ${Pz.daily.slice(5).replace('-', '/')}` : `${pzName(Pz.L)} · ${PZBook.t('stage', { n: Math.floor(Pz.j / PZBook.STAGE) + 1 })} · No.${Pz.j + 1}`;
  $('#pzTitle').textContent = Pz.line ? t('pz.tTitle') : t('pz.winIn', { n: Pz.n });
  $('#pzGoal').innerHTML = `<span class="pdisc p${Pz.me}"></span><span>${Pz.line ? t('pz.tGoal', { c: pname(Pz.me), n: Pz.n }) : t('pz.goal', { c: pname(Pz.me), n: Pz.n })}</span>`;
  $('#pzDots').innerHTML = Array.from({ length: Pz.n }, (_, i) => `<i class="${i < Pz.used ? 'ok' : ''} ${i === Pz.used && Pz.state === 'play' ? 'cur' : ''}"></i>`).join('');
  $('#pzNext').disabled = !!Pz.daily || Pz.j + 1 >= L.puzzles.length || !PZBook.isOpen(pzRecs(Pz.L), Pz.j + 1);
  $('#pzHint').disabled = Pz.state !== 'play'; $('#pzAnswer').disabled = Pz.busy;
  renderInfo();
}
function pzStatus(html) { $('#pzStatus').innerHTML = html; }
function mateReq(n, defend) { return request('ai', { type: 'mate', moves: moves.slice(0, cur), n, defend: !!defend, maxNodes: 3e7 }).then(r => r && r.list); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function pickDefence(list) { let best = null; for (const e of list) { const v = e.need ? e.need : 99; if (!best || v > best.v) best = { m: e.m, v }; } return best.m; }
function pickAttack(list, left) { let best = null; for (const e of list) if (e.need && e.need <= left && (!best || e.need < best.need)) best = e; return best && best.m; }
// mate puzzles: is the move an obvious mistake? (see the rules above) -> reason html, or '' to play on
async function pzMateBlunder(Pz, ms) {
  const st = statusAt(cur);
  if (st.over) return st.draw ? (st.why === 'stalemate' ? t('rl.stale.h') + ' — ' : '') + t('res.draw') : '';
  if (!canMate(Pz.me)) return t('pz2.noMate', { m: ms });
  const ol = await mateReq(1);   // the opponent is to move: can they mate at once?
  if (puzzle !== Pz) return '';
  const mm = ol && ol.find(x => x.need === 1);
  return mm ? t('pz2.mateThreat', { m: ms, r: posAt(cur).pos.san(mm.m) }) : '';
}
// the defender's reply: longest resistance; if the proof search gives up (big trees after a stray move), the engine's move
async function pzDefend(left) {
  const dl = await mateReq(left, true);
  if (dl && dl.length) return pickDefence(dl);
  if (dl && !dl.length) return 0;
  const r = await request('ai', { type: 'think', moves: moves.slice(0, cur), level: 7 });
  return r && r.move || 0;
}
async function puzzleMove(m) {
  if (puzzle.line) return linePuzzleMove(m);
  const Pz = puzzle; Pz.busy = true; lessonMarks = [];
  const left = Pz.n - Pz.used, tok = busyToken, { pos } = posAt(cur), ms = pos.san(m);
  pzStatus(t('pz.checking'));
  const list = (await mateReq(left)) || [];   // null = the proof search gave up: treated as "no forced mate known"
  if (puzzle !== Pz || tok !== busyToken) return;
  playMove2(m); Pz.used++; renderPuzzleCard();
  if (statusAt(cur).winner === Pz.me) { setTimeout(() => puzzleSolved(), moveDur() + 300); return; }
  const e = list.find(x => x.m === m);
  const good = list.filter(x => x.need && x.need <= left).sort((a, b) => a.need - b.need);
  const stray = !e || !e.need || e.need > left;
  if (stray && Pz.n === 1) {   // mate in one: judged at once
    await sleep(moveDur() + 400); if (puzzle !== Pz) return;
    pzRewindFail(Pz, m, good[0] && good[0].m, `<b class="ng">${t('pz.fail')}</b> ${t('pz.failWhy', { m: ms, b: good.length ? pos.san(good[0].m) : '—', n: Pz.n })}`);
    return;
  }
  if (stray) {
    const why = await pzMateBlunder(Pz, ms);
    if (puzzle !== Pz || tok !== busyToken) return;
    if (why) {
      await sleep(moveDur() + 300); if (puzzle !== Pz) return;
      pzRewindFail(Pz, m, good[0] && good[0].m, `<b class="ng">${PZBook.t('blunder')}</b> ${why}${good[0] ? ' ' + t('pz2.answerWas', { b: pos.san(good[0].m) }) : pzAnswerWas(Pz)}`);
      return;
    }
    Pz.failed = true; Pz.strayed = true;
    if (Pz.used >= Pz.n) { await sleep(moveDur() + 200); if (puzzle === Pz) pzOutOfMoves(Pz); return; }
    pzStatus(t('pz2.cont', { m: ms }) + ' ' + PZBook.t('movesLeft', { n: Pz.n - Pz.used }));
  } else pzStatus(t('pz.good'));
  const r = await pzDefend(Pz.n - Pz.used);
  if (puzzle !== Pz || tok !== busyToken) return;
  await sleep(moveDur() + 300); if (puzzle !== Pz) return;
  if (!r) { if (statusAt(cur).winner === Pz.me) puzzleSolved(); else pzOutOfMoves(Pz); return; }
  playMove2(r);
  await sleep(moveDur()); if (puzzle !== Pz) return;
  if (statusAt(cur).over) { pzOutOfMoves(Pz); return; }
  Pz.busy = false; renderPuzzleCard(); boardEl.classList.toggle('can', canHumanPlay());
  pzStatus(Pz.strayed ? PZBook.t('movesLeft', { n: Pz.n - Pz.used }) : t('pz.yourMove', { n: Pz.n - Pz.used }));
}
function playMove2(m) { moves = moves.slice(0, cur); moves.push(m); cur = moves.length; hintList = null; update(true); }
function puzzleSolved() {
  const Pz = puzzle; if (!Pz) return;
  Pz.state = 'solved'; Pz.busy = false;
  const pr = pzProgress(), k = pzKey(Pz.L, Pz.j), stars = PZBook.starsFor(Pz);
  const before = pzRecs(Pz.L, pr);
  pr[k] = Math.max(starVal(pr[k]), stars);
  try { localStorage.setItem(PZ_STORE, JSON.stringify(pr)); } catch (e) {}
  const after = pzRecs(Pz.L, pr), ev = PZBook.events(before, after, Pz.j);
  if (Pz.daily) dailySolved(Pz.daily, Pz.hinted);
  PZBook.setLang(LANG);
  const th = Pz.line ? themeText(Pz.P) : '';
  pzStatus(`<b class="ok">${t('pz.solved')}</b> ${Pz.line ? (Pz.off ? t('pz2.tKept') + ' ' : '') + t('pz.tSolved', { r: Pz.P.r }) : t('pz.solvedSub', { n: Pz.used })}` + (th ? `<br><small style="color:var(--dim)">${t('pz.theme')}: ${th}</small>` : '') + (Pz.daily ? `<br>🔥 ${t('daily.streak', { n: dailyInfo().streak })}` : '') + PZBook.solved({ stars, recs: after, j: Pz.j, events: ev }));
  playChime(true); confetti(); if (ev.length) setTimeout(confetti, 600); renderPuzzleCard();
}
$('#pzRetry').onclick = () => { if (puzzle) { const { hinted: h, failed: f, answered: a } = puzzle; startPuzzle(puzzle.L, puzzle.j, puzzle.daily); Object.assign(puzzle, { hinted: h, failed: f || puzzle.state !== 'play', answered: a }); } };
$('#pzNext').onclick = () => {
  if (!puzzle || puzzle.daily) return;
  const { L, j } = puzzle;
  if (j + 1 < PUZZLES.levels[L].puzzles.length && PZBook.isOpen(pzRecs(L), j + 1)) startPuzzle(L, j + 1);
};
$('#pzList').onclick = () => { if (!puzzle) return; if (puzzle.daily) openPuzzles(); else openPzGrid(puzzle.L, puzzle.j); };
$('#pzQuit').onclick = () => quitSpecial();
$('#pzHint').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.state !== 'play' || Pz.busy) return;
  if (Pz.line && Pz.off) { const pre = Pz.pre || (Pz.pre = pzAna()), r = await pre; if (puzzle !== Pz || !topOf(r)) return; Pz.hinted = true; lessonMarks = [{ at: mFrom(topOf(r).m), cls: 'ok' }]; renderFx(); pzStatus(t('pz.hintText')); return; }
  if (Pz.line) { Pz.hinted = true; const m = posAt(cur).pos.fromUci(Pz.P.line[Pz.k]); lessonMarks = [{ at: mFrom(m), cls: 'ok' }]; renderFx(); pzStatus(t('pz.hintText')); return; }
  const left = Pz.n - Pz.used, list = await mateReq(left); if (puzzle !== Pz || !list) return;
  Pz.hinted = true;
  lessonMarks = list.filter(x => x.need && x.need <= left).map(g => ({ at: mFrom(g.m), cls: 'ok' }));
  renderFx(); pzStatus(t('pz.hintText'));
};
$('#pzAnswer').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.busy) return;
  Pz.busy = true; Pz.state = 'answer'; Pz.hinted = true; Pz.answered = true; Pz.off = false; Pz.strayed = false; lessonMarks = []; hintList = null;
  moves = []; cur = 0; Pz.used = 0; update(false); renderPuzzleCard(); pzStatus(t('pz.showing'));
  if (Pz.line) {
    for (let k = 0; k < Pz.P.line.length; k++) { await sleep(k ? 700 : 300); if (puzzle !== Pz) return; playMove2(posAt(cur).pos.fromUci(Pz.P.line[k])); if (k & 1) Pz.used++; renderPuzzleCard(); }
    const th = themeText(Pz.P);
    Pz.busy = false; renderPuzzleCard(); pzStatus(t('pz.answerDone') + (th ? `<br><small style="color:var(--dim)">${t('pz.theme')}: ${th}</small>` : '')); return;
  }
  for (let step = 0; step < 12; step++) {
    if (puzzle !== Pz || statusAt(cur).over) break;
    const att = toMoveAt(cur) === Pz.me, left = Pz.n - Pz.used;
    let m;
    if (att && step === 0) m = posAt(0).pos.fromUci(Pz.P.answer);
    else { const list = await mateReq(left, !att); if (puzzle !== Pz || !list) return; m = att ? pickAttack(list, left) : pickDefence(list); }
    if (!m) break;
    await sleep(700); if (puzzle !== Pz) return;
    playMove2(m); if (att) Pz.used++; renderPuzzleCard(); await sleep(moveDur());
  }
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
  const game = moves.slice(), key = gameKey(), fen = startFen;
  const run = rv = { key, list: [], done: 0, total: game.length, running: true, ws: [] };
  for (let k = 0; k < RV_WORKERS; k++) run.ws.push(makeWorker());
  rvOpen = true; renderReview(); revealReview();
  let next = 0;
  const loop = async w => {
    while (next < game.length && rv === run) {
      const i = next++, pk = (fen || '') + '|' + game.slice(0, i).join(',');
      let list = anaCache.get(pk);
      if (!list) {
        const res = await new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve }); w.postMessage({ type: 'analyze', fen, moves: game.slice(0, i), time: i < 8 ? 500 : 900, id }); });
        if (rv !== run || !res) return;
        list = res.list; anaCache.set(pk, list);
      }
      run.list[i] = list;
      if (gameKey() === key && (!evals[i] || evals[i].kind === 'cp')) { const ev = evalFromList(list.filter(e => e.kind !== 'ub'), toMoveAt(i)); if (ev) evals[i] = ev; }
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
  const m = moves[i], mine = L.find(e => e.m === m); if (!mine) return null;
  let best = L[0]; for (const e of L) if (e.v > best.v) best = e;
  const loss = sOfV(best.v) - sOfV(mine.v);
  let q = null, desc = '';
  const word = v => t(v > MATET ? 'rv.win' : v < -MATET ? 'rv.loss' : 'rv.even');
  if ((best.v > MATET && mine.v <= MATET) || (best.v >= -MATET && mine.v < -MATET)) { q = 'bad'; desc = `${word(best.v)}→${word(mine.v)}`; }
  else if (loss >= 0.3) { q = 'bad'; desc = t('rv.eval', { l: ((best.v - mine.v) / 100).toFixed(1) }); }
  else if (loss >= 0.12) { q = 'dubious'; desc = t('rv.eval', { l: ((best.v - mine.v) / 100).toFixed(1) }); }
  const ok = !q && mine.v >= best.v - 15 && mine.kind !== 'ub';
  return { q, ok, desc, best: best.m, m, loss, plain: q ? plainWhy(best, mine, toMoveAt(i), posAt(i).pos) : '' };
}
// the reason in plain words: lost win / walked into mate / how much material it was worth
function plainWhy(best, mine, mover, pos) {
  const b = pos.san(best.m), nb = (MATE - best.v + 1) >> 1, nl = (MATE + mine.v) >> 1;
  if (best.v > MATET && mine.v < -MATET) return t('rx.winToLoss', { b, n: nb, k: nl });
  if (best.v > MATET) return t('rx.missWin', { b, n: nb });
  if (mine.v < -MATET) return t('rx.toLoss', { b, k: nl });
  const d = (best.v - mine.v) / 100;
  const amt = d >= 7 ? t('rx.amtQ') : d >= 4 ? t('rx.amtR') : d >= 2.5 ? t('rx.amtN') : t('rx.amtP', { x: d.toFixed(1) });
  const word = v => { const x = sOfV(v); return t(x > 0.5 ? 'rx.s4' : x > 0.25 ? 'rx.s3' : x > 0.08 ? 'rx.s2' : x >= -0.08 ? 'rx.s0' : x >= -0.25 ? 'rx.s-2' : x >= -0.5 ? 'rx.s-3' : 'rx.s-4'); };
  const sa = word(best.v), sb = word(mine.v);
  return t('rx.cp', { b, a: amt }) + (sa !== sb ? ' ' + t('rx.flow', { c: sideLabel(mover), x: sa, y: sb }) : '');
}
function sideLabel(p) { return settings.mode === 'ai' ? (p === humanColor ? t('you') : 'AI') : pname(p); }
// the move at the current position only (like shogi): what the best move was and why
function rvExplainHtml() {
  if (!rv || rv.running || cur >= moves.length) return '';
  const j = rvJudge(cur); if (!j) return '';
  const ps = posAt(cur).pos, no = `${Math.floor(cur / 2) + 1}${ps.side ? '…' : '.'}`;
  const tag = j.q ? `<span class="tag ${j.q}">${t('q.' + j.q)}</span>` : '';
  let h = `<div class="rv-ex"><div class="rv-ex-h"><span>${no} <i class="p${ps.side ? 2 : 1}"></i><b>${sanOf(cur)}</b></span>${tag}</div>`;
  if (j.best === j.m) h += `<p>${t('rv.ex.same')}</p>`;
  else if (!j.q) h += `<p>${t('rv.ex.alt', { m: `<b class="bm">${ps.san(j.best)}</b>` })}</p>`;
  else h += `<p>${t('rv.ex.best', { m: `<b class="bm">${ps.san(j.best)}</b>` })} <span class="ls">${j.desc}</span></p><p class="why">${j.plain}</p>`;
  return h + '</div>';
}
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
    if (shown.length) html += `<div class="rv-list">${shown.map(x => { const ps = posAt(x.i).pos; return `<button data-i="${x.i}" class="${cur === x.i ? 'cur' : ''}"><span class="tag ${x.q}">${t('q.' + x.q)}</span><span class="mv">${Math.floor(x.i / 2) + 1}${ps.side ? '…' : '.'} <i class="p${ps.side ? 2 : 1}"></i>${sanOf(x.i)} → ${ps.san(x.best)}</span><span class="ls">${x.desc}</span></button>`; }).join('')}</div>`;
    else html += `<div class="rv-note" style="color:#8fe3b8">${t('rv.clean')}</div>`;
    html += `<div class="rv-note" style="color:var(--dim);font-size:11px;line-height:1.6">${t('rv.note')}</div>`;
  }
  $('#rvBody').innerHTML = html;
}
function drawReviewFx(svg) {
  if (lesson || puzzle || !rvOpen || !rv || rv.running || rv.key !== gameKey() || cur >= moves.length || sel) return false;
  const L = rv.list[cur]; if (!L) return false;
  drawHints(L, svg);
  const j = rvJudge(cur), m = moves[cur];
  hlDiv('played' + (j && j.q ? ' ' + j.q : ''), mTo(m)); arrow(svg, mFrom(m), mTo(m), 'pl');
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
    const { pos } = posAt(idx); let best = c.list[0]; for (const e of c.list) if (e.v > best.v) best = e;
    out.push({ fen: pos.fen(), best: pos.uci(best.m), sc: c.list.map(e => [pos.uci(e.m), e.v]), played: pos.uci(c.m), q: c.q });
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

// ====================================================================== share / load (PGN, FEN, UCI, URL)
function parseGameText(v) {
  v = (v || '').trim(); if (!v) return null;
  const h = v.match(/#(.*)$/);
  if (h) {
    const q = new URLSearchParams(h[1]); if (!q.has('k') && !q.has('fen')) return null;
    const fen = q.get('fen') || null, toks = (q.get('k') || '').split('.').filter(Boolean);
    const pos = E.Pos.fromFEN(fen || E.START), list = [];
    for (let k = 0; k < toks.length; k++) { const m = pos.fromUci(toks[k]); if (!m) return { bad: k + 1 }; pos.make(m); list.push(m); }
    const n = q.has('n') ? parseInt(q.get('n'), 10) : undefined;
    return { fen, list, n };
  }
  // FEN only
  if (/^[1-8pnbrqkPNBRQK\/]+ [wb] [KQkq-]+ [a-h1-8-]+( \d+ \d+)?$/.test(v)) { try { const p = E.Pos.fromFEN(v); if (p.legal().length || true) return { fen: v.split(' ').length === 4 ? v + ' 0 1' : v, list: [] }; } catch (e) { return null; } }
  let fen = null; const fm = v.match(/\[FEN\s+"([^"]+)"\]/); if (fm) fen = fm[1];
  let body = v.replace(/\[[^\]]*\]/g, ' ').replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ');
  while (/\([^()]*\)/.test(body)) body = body.replace(/\([^()]*\)/g, ' ');
  body = body.replace(/\$\d+/g, ' ').replace(/\d+\.(\.\.)?/g, ' ').replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, ' ');
  const toks = body.split(/\s+/).filter(Boolean);
  if (!toks.length) return null;
  let pos; try { pos = E.Pos.fromFEN(fen || E.START); } catch (e) { return null; }
  const list = [];
  for (let k = 0; k < toks.length; k++) { const m = pos.fromSan(toks[k]); if (!m) return { bad: k + 1 }; pos.make(m); list.push(m); }
  return { fen, list };
}
function openLoaded(fen, list, n) {
  ['#resultOverlay', '#newOverlay', '#lessonOverlay', '#puzzleOverlay', '#pasteOverlay'].forEach(hideOverlay);
  if (lesson || puzzle) { savedGame = null; exitSpecial(); }
  if (net) leaveOnlineGame();
  rtForfeit(); rgame = null;
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); rvCancel(); rv = null; rvOpen = false; thinking = 0; animating = false;
  settings.mode = 'pvp'; startFen = fen || null;
  moves = list; evals = []; hintList = null;
  cur = n === undefined || isNaN(n) ? moves.length : Math.max(0, Math.min(moves.length, n));
  reviewing = cur !== moves.length; gameOverShown = gameOver(moves.length);
  orient(); drawSquares(); shownKey = ''; syncPieces(new Int8Array(128));
  update(false); save(); afterPosition();
}
function loadText(v) {
  const r = parseGameText(v);
  if (!r) { toast(t('paste.invalid'), 2200); return false; }
  if (r.bad) { toast(t('paste.bad', { n: r.bad }), 2500); return false; }
  openLoaded(r.fen, r.list, r.n); toast(t('paste.loaded', { n: r.list.length }), 1800);
  return true;
}
function loadFromHash() {
  const h = location.hash.slice(1); if (!h) return false;
  const q = new URLSearchParams(h); if (!q.has('k') && !q.has('fen')) return false;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  return loadText('#' + h);
}
window.addEventListener('hashchange', () => { if (/[#&](k|fen)=/.test(location.hash)) loadFromHash(); });
$('#btnShare').onclick = async () => {
  if (!moves.length || lesson || puzzle) { toast(t('nokifu')); return; }
  const p = E.Pos.fromFEN(startFen || E.START), us = []; for (const m of moves) { us.push(p.uci(m)); p.make(m); }
  const url = location.origin + location.pathname + '#' + (startFen ? 'fen=' + encodeURIComponent(startFen) + '&' : '') + 'k=' + us.join('.') + (cur < moves.length ? '&n=' + cur : '');
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: t('meta.title'), url }); return; }
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
  if (!PUZZLES || PUZZLES.levels.length < 4) return null;
  const now = new Date(), date = ymd(now), day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
  const wd = now.getDay(), T = PUZZLES.levels.map((x, i) => x.kind === 'line' ? i : -1).filter(i => i >= 0);
  const L = T.length >= 5 ? [3, T[0], T[1], T[2], T[2], T[3], T[4]][wd] : (wd >= 1 && wd <= 2 ? 1 : wd >= 3 && wd <= 4 ? 2 : 3);
  const n = PUZZLES.levels[L].puzzles.length;
  let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13;
  return { date, L, j: (h >>> 0) % n };
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
function ucisOf(list) { const p = E.Pos.fromFEN(E.START), out = []; for (const m of list) { out.push(p.uci(m)); p.make(m); } return out; }
// ---- time control (chosen before searching / creating a room; remembered per browser)
const OL_TC_KEY = 'chess-online-tc';
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
const OL_RK_KEY = 'chess-room-type', OL_TITLE_KEY = 'chess-room-title';
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
  if (olView === 'setup') { B.innerHTML = `<div class="ol-setup"><span class="ol-setup-ic">♞</span><p class="ol-note">${t('ol.setup')}</p><p class="ol-note small">${t('ol.desc')}</p></div>`; return; }
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
    $('#olName').onchange = async e => { try { e.target.value = await Online.setName(e.target.value); syncTouch(); dockRender(); } catch (_) {} };
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
    $('#olCopy').onclick = async () => { try { if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ title: 'Chess', url }); else { await navigator.clipboard.writeText(url); toast(t('ol.linkCopied'), 1400); } } catch (e) {} };
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
const OL_LIVE = 'chess-online-live';
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
function olSnap() { return { moves: moves.slice(), cur, evals: evals.slice(), humanColor, mode: settings.mode, rgame }; }
function olRestoreLocal(sv) {
  if (!sv || sv.mode === 'online') { newGame(); return; }
  settings.mode = sv.mode; moves = sv.moves; cur = sv.cur; evals = sv.evals; humanColor = sv.humanColor; rgame = sv.rgame || null;
  if (rgame && !rgame.over) rgame.t = Date.now();
  startFen = null; reviewing = cur !== moves.length; hintList = null; sel = null; gameOverShown = gameOver(moves.length);
  orient(); drawSquares(); shownKey = ''; syncPieces(new Int8Array(128)); update(false); save(); afterPosition();
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
  const keepFlip = !!(spec && net && net.spectate && settings.flip);
  leaveOnlineGame();
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); rvCancel(); rv = null; rvOpen = false; stopPlay(); thinking = 0; animating = false;
  rgame = null; settings.mode = 'online'; settings.flip = keepFlip;
  startFen = null; moves = []; cur = 0; reviewing = false; evals = []; hintList = null; gameOverShown = false; sel = null; closePromo();
  net = { gid, game: null, me: spec ? 0 : P1, opp: null, done: false, first: true, intro, spectate: !!spec, code: spec || null, saved, watchers: 0 };
  if (!spec) olLiveSave(gid);
  document.body.classList.add('in-online'); document.body.classList.toggle('in-watch', !!spec);
  net.unsub = spec ? Online.spectate(gid, onNetGame) : Online.watchGame(gid, onNetGame);
  net.wUnsub = Online.watchCount(gid, n => { if (net && net.gid === gid) { net.watchers = n; olWatchRender(); } });
  net.timer = setInterval(netTick, 250);
  orient(); drawSquares(); shownKey = ''; syncPieces(new Int8Array(128)); update(false);
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
    if (!spec) { humanColor = me; orient(); drawSquares(); shownKey = ''; syncPieces(posAt(cur).pos.b); }
    olTcToast(g, spec ? net.intro || t('ol.watchStart') : (net.intro ? net.intro + ' · ' : '') + t('ol.youAre', { c: pname(me) }));
  }
  const ms = String(g.moves || '').split(' ').filter(Boolean), mine = ucisOf(moves);
  let reset = false;
  for (let i = 0; i < Math.min(ms.length, mine.length); i++) if (ms[i] !== mine[i]) { reset = true; break; }
  if (reset || (moves.length > ms.length && !net.pending)) { moves = []; evals = []; cur = 0; reviewing = false; reset = true; }
  const before = moves.length;
  for (const u of ms.slice(before)) {
    const m = Online.UCI_RE.test(u) ? posAt(moves.length).pos.fromUci(u) : 0;
    if (!m) { if (!net.warned) { net.warned = true; toast(t('ol.illegal'), 2500); } console.warn('illegal online move', u); break; }
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
// a finished position on the board (mate, stalemate, repetition, 50 moves, material) is reported by either player
function netMarkOver() {
  if (!net || net.spectate || net.marking || net.done) return;
  const st = statusAt(moves.length); if (!st.over) return;
  net.marking = true;
  Online.markOver(net.gid, st.winner || 0, st.why, moves.length).catch(e => console.warn(e)).finally(() => { if (net) net.marking = false; });
}
const olSideToMove = g => (Online.moveCount(g.moves) % 2 ? 'b' : 'w');
// can this colour (1 / 2) still checkmate? (lone king, or king + one minor piece, cannot)
function canMate(p) {
  const { pos } = posAt(moves.length), c = p - 1; let minors = 0;
  for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const x = pos.b[s]; if (!x || (x >> 3) !== c) continue; const k = x & 7; if (k === 1 || k === 4 || k === 5) return true; if (k === 2 || k === 3) minors++; }
  return minors >= 2;
}
function olClocks() {
  if (!net) return;
  const g = net.game, live = !!(g && g.status === 'play' && !net.done), stm = g ? olSideToMove(g) : 'w', now = Online.now(), tc = Online.tcOf(g);
  for (const p of [P1, P2]) {
    const side = p === P1 ? 'w' : 'b', k = g ? Online.clockOf(g, side, live && side === stm && !net.pending, now) : { main: tc.main, left: tc.main, moving: false };
    const el = $('#count' + p), txt = fmtClock(Math.max(0, k.left));
    if (el.textContent !== txt) el.textContent = txt;
    el.classList.toggle('ol-clk', true); el.classList.toggle('ol-move', !!k.moving); el.classList.toggle('ol-low', !!k.moving && k.left <= 20000);
    // time signal: my own clock while it runs (not when watching); a new countdown every time it starts again
    if (window.CountTick && !net.spectate && p === net.me) { if (k.moving) CountTick.feed(k.left, 'ol'); else CountTick.reset('ol'); }
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
  // the opponent ran out of time (with a little grace for latency): claim the win (a draw if I cannot mate)
  if (!net.spectate && stm !== mine && !net.pending && !net.claiming && Online.clockOf(g, stm, true).left < -Online.GRACE) {
    net.claiming = true; Online.claimTimeout(net.gid, net.opp, !canMate(net.me)).catch(() => {}).finally(() => { if (net) net.claiming = false; });
  }
}
function netMove(m) {
  if (!olLive() || !net.game || net.game.status !== 'play' || net.pending || cur !== moves.length || toMoveAt(cur) !== net.me) { update(false); return; }
  const n = moves.length, uci = posAt(n).pos.uci(m);
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
  else { winner = typeof g.win === 'number' ? g.win : bst.over ? bst.winner || 0 : 0; why = g.reason || bst.why || 'mate'; }
  net.over = { over: true, winner, draw: !winner, why };
  gameOverShown = true; sel = null; closePromo();
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
  $('#resultSub').innerHTML = olEsc(whyTxt(true)) + '<br>' + t('res.sub', { n: Math.ceil(moves.length / 2) }) + '<br>' + (r.rated ? `<span class="rt-res">R ${r.old} → <b>${r.now}</b> (${rtD(diff)})</span>` : olEsc(t('ol.unrated')));
  showOverlay('#resultOverlay');
  playChime(score >= 0.5); if (score === 1) confetti();
  dockRender(); syncTouch();
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
  if (window.ChessSync) accRender();     // (defined further down; not before the page script has run)
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
    if (ok) { try { const n = await Online.setName(inp.value); syncTouch(); toast(t('ol.renamed', { n }), 1400); const f = $('#olName'); if (f) f.value = n; } catch (_) {} }
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
if (!olOn()) document.body.classList.add('no-online');   // the dock connects after a moment (see the Google link section)
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
      + `<button type="button" id="olWatchFlip">${olX(t('ol.flip'))}</button>`
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
  const sv = net.saved; settings.flip = false; leaveOnlineGame(); olRestoreLocal(sv);
  dockRender();
}
document.addEventListener('click', e => {
  const b = e.target.closest('.dk-watch, #olWatchStop, #olWatchFlip'); if (!b) return;
  e.stopPropagation();
  if (b.id === 'olWatchStop') olWatchStop();
  else if (b.id === 'olWatchFlip') $('#btnFlip').click();
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
  if (!e.target.value.trim() && !olCoarse()) { e.target.blur(); dockToggle(false); return; }   // empty: fold the online box away again
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
// a different account (Google switch / sign-out) is a different "me"
if (olOn()) Online.onAuth(() => { if (chat.unsub) { chat.unsub(); chat.unsub = null; } chatStart(); });

// ====================================================================== Google link (ported from Dots & Boxes): account box in the dock / online tab
const GLOGO = '<svg class="glogo" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>';
{ const s = $('#pfGoogle .glogo-slot'); if (s) s.outerHTML = GLOGO; }
const olOk = () => {};
// Google sign-in errors in words the user can act on
function authErrText(e) {
  const c = (e && (e.code || e.message)) || '';
  if (/unauthorized-domain/.test(c)) return t('err.domain', { d: location.hostname });
  if (/operation-not-allowed|admin-restricted-operation/.test(c)) return t('err.provider');
  if (/referer|referrer|API_KEY_HTTP_REFERRER_BLOCKED|requests-from-referer/i.test(c)) return t('err.referrer', { d: location.origin });
  if (/api-key-not-valid|invalid-api-key/.test(c)) return t('err.apikey');
  if (/network-request-failed|load https/.test(c)) return t('err.network');
  if (/popup-blocked/.test(c)) return t('err.popup');
  if (/not-configured/.test(c)) return t('ol.setup');
  if (/configuration-not-found/.test(c)) return t('err.config');
  return t('sync.err') + (c ? ' (' + c + ')' : '');
}
const authCancelled = e => e && /popup-closed-by-user|cancelled-popup-request|user-cancelled/.test(e.code || '');
function mtabIfPhone() { if (olCoarse()) mtab('online'); }
function accRender() {
  if (!olOn()) return;
  const acc = Online.account(), box = $('#dkAcc'), g = $('#dkG');
  const gh = acc ? `${GLOGO}<span>✓ ${olEsc(acc.email || acc.name)}</span>` : `${GLOGO}<span>${olEsc(t('sync.link'))}</span>`;
  if (g.dataset.h !== gh) { g.dataset.h = gh; g.innerHTML = gh; }
  g.classList.toggle('on', !!acc); g.title = acc ? t('sync.on', { e: acc.email || acc.name }) : t('sync.desc');
  const h = acc
    ? `<p class="ol-note">${olEsc(t('sync.on', { e: acc.email || acc.name }))}${acc.name && acc.email ? '<br><small>' + olEsc(acc.name) + '</small>' : ''}</p><p class="ol-note small" id="accLast">${olEsc(syncLastText())}</p><div class="ol-acts"><button class="dk-btn" id="accNow">${olEsc(t('sync.now'))}</button><button class="dk-btn warn" id="accOut">${olEsc(t('sync.logout'))}</button></div>`
    : `<p class="ol-note">${olEsc(t('sync.desc'))}</p><div class="ol-acts"><button class="dk-btn gbtn" id="accIn">${GLOGO}${olEsc(t('sync.google'))}</button></div>`;
  if (box.dataset.h === h) return;
  box.dataset.h = h; box.innerHTML = h;
  const a = $('#accIn'); if (a) a.onclick = () => googleLink();
  const n = $('#accNow'); if (n) n.onclick = () => syncNow(false);
  const o = $('#accOut'); if (o) o.onclick = () => olConfirm(t('sync.logoutQ'), t('sync.logout'), async () => {
    if (olLive()) olResignLeave();
    await syncPush(); try { await Online.logout(); } catch (e) { console.warn(e); }
    olAfterAuth(); toast(t('sync.out'), 1800);
  });
}
$('#dkG').onclick = e => { e.stopPropagation(); if (Online.account()) { dockToggle(true); mtabIfPhone(); } else googleLink(); };
// after a Google switch / sign-out: this page is a different player now (presence, dock, open dialog)
function olAfterAuth() {
  if (dock.on) Online.setPresence(net && net.spectate ? 'watch' : 'idle', { room: null }).catch(() => {});
  dock.rank = []; if (dock.on) Online.topPlayers(10).then(l => { dock.rank = l; dockRender(); }).catch(() => {});
  if ($('#onlineOverlay').classList.contains('show') && (olView === 'menu' || olView === 'room' || olView === 'search')) olRender('menu');
  dockRender();
}
let gBusy = false;
async function googleLink() {
  if (!olOn() || gBusy) return false;
  if (olLive()) { toast(t('sync.notNow'), 2000); return false; }
  gBusy = true;
  try {
    const r = await Online.google();
    await syncNow(true);
    toast(r.switched ? t('sync.switched') : t('sync.linked'), 2200);
    dockStart(); olAfterAuth();
    return true;
  } catch (e) {
    if (!authCancelled(e)) { console.warn(e); olConfirm(authErrText(e), 'OK', olOk); }
    return false;
  } finally { gBusy = false; dockRender(); }
}

// ====================================================================== cloud sync of local progress (sync/<uid> = {d, t}), as on the Dots & Boxes page
// d = JSON of a snapshot: ls lessons {id: {best, clear}}, pz puzzles {key: stars}, op openings {id: {best, pass}}, ru rules seen,
// dy daily puzzle {last, streak, best, days{date: 1 | 'h'}}, rd rated games vs the AI {r, n, w, l, d, hist, pl},
// set settings (+ setT), nm online name (+ nmT), rt online rating (+ rtT; the server record itself is carried by Online.google()).
// Not synced: the game on the board, a live online game (chess-online-live), room / time-control choices, mock data.
// Merge: progress is united (best = max, clear / pass = or, stars = max), daily days united and the streak recomputed,
// rated record: the one with the newer last game (else more games), settings / name: newest change wins.
const ChessSync = (() => {
  const META = 'chess-sync-meta', RU_KEY = 'aicoding-chess-rules-seen';
  const SET_KEYS = ['anim', 'sound', 'hint', 'eval', 'last', 'threat', 'skin', 'coach', 'level', 'level2', 'color', 'lang'];
  const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const prevDay = s => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() - 1); return ymd(d); };
  const setOf = () => { const o = {}; SET_KEYS.forEach(k => { if (settings[k] !== undefined) o[k] = settings[k]; }); o.lang = LANG; return o; };
  // the current local state; a value that changed since the last snapshot gets the current time
  function snapshot(now) {
    now = now || Date.now();
    let m = get(META, null);
    const fresh = !m; m = m || {};
    const set = setOf();
    const nm = (Online.profile && Online.profile.name) || Online.localName() || '';
    const rt = Online.profile ? Online.profile.rating : null;
    const stamp = (key, val) => { const h = JSON.stringify(val); if (m[key + 'H'] !== h) { m[key + 'H'] = h; m[key + 'T'] = fresh ? 1 : now; } return m[key + 'T'] || 1; };
    let ru = false; try { ru = !!localStorage.getItem(RU_KEY); } catch (e) {}
    const d = {
      v: 1,
      ls: get(LS_STORE, {}), pz: get(PZ_STORE, {}), op: get(OP_STORE, {}), ru,
      dy: get(DAILY_STORE, { last: '', streak: 0, best: 0, days: {} }),
      rd: get(RT_STORE, null),
      set, setT: stamp('set', set), nm, nmT: stamp('nm', nm), rt, rtT: stamp('rt', rt),
    };
    put(META, m);
    return d;
  }
  function mergeRec(a, b) {        // {id: {best, clear | pass}}
    const o = Object.assign({}, a || {});
    for (const k in (b || {})) {
      const x = o[k], y = b[k];
      if (!x || typeof x !== 'object') { o[k] = y; continue; }
      if (!y || typeof y !== 'object') continue;
      const z = Object.assign({}, x, y, { best: Math.max(+x.best || 0, +y.best || 0) });
      if ('clear' in x || 'clear' in y) z.clear = !!(x.clear || y.clear);
      if ('pass' in x || 'pass' in y) z.pass = !!(x.pass || y.pass);
      o[k] = z;
    }
    return o;
  }
  function mergeStars(a, b) { const o = Object.assign({}, a || {}); for (const k in (b || {})) o[k] = Math.max(starVal(o[k]), starVal(b[k])); return o; }
  function mergeDaily(a, b) {
    a = a || {}; b = b || {};
    const days = Object.assign({}, a.days || {});
    for (const k in (b.days || {})) days[k] = days[k] === 1 || b.days[k] === 1 ? 1 : (days[k] || b.days[k]);
    const last = [a.last || '', b.last || '', ...Object.keys(days)].sort().pop() || '';
    let streak = 0;
    if (last) { for (let d = last; days[d]; d = prevDay(d)) streak++; }
    if (a.last === last) streak = Math.max(streak, a.streak || 0);
    if (b.last === last) streak = Math.max(streak, b.streak || 0);
    return { last, streak, best: Math.max(a.best || 0, b.best || 0, streak), days };
  }
  const rdTime = x => { const h = x && Array.isArray(x.hist) ? x.hist : []; const l = h[h.length - 1]; return (l && +l.t) || 0; };
  const rdGames = x => (x && (+x.n || 0)) || 0;
  function mergeRated(a, b) {
    if (!a || typeof a.r !== 'number') return b && typeof b.r === 'number' ? b : (a || null);
    if (!b || typeof b.r !== 'number') return a;
    const ta = rdTime(a), tb = rdTime(b);
    if (ta || tb) return tb > ta ? b : a;
    return rdGames(b) > rdGames(a) ? b : a;
  }
  const newer = (a, b, key) => ((b[key + 'T'] || 0) > (a[key + 'T'] || 0) ? b : a);
  function merge(L, C) {
    if (!C) return L; if (!L) return C;
    const s = newer(L, C, 'set'), n = newer(L, C, 'nm'), r = newer(L, C, 'rt');
    return {
      v: 1,
      ls: mergeRec(L.ls, C.ls), pz: mergeStars(L.pz, C.pz), op: mergeRec(L.op, C.op), ru: !!(L.ru || C.ru),
      dy: mergeDaily(L.dy, C.dy), rd: mergeRated(L.rd, C.rd),
      set: Object.assign({}, s.set), setT: s.setT || 0,
      nm: n.nm || L.nm || C.nm || '', nmT: n.nmT || 0,
      rt: r.rt != null ? r.rt : (L.rt != null ? L.rt : C.rt), rtT: r.rtT || 0,
    };
  }
  // write a merged snapshot back to this device
  function apply(d) {
    put(LS_STORE, d.ls || {}); put(PZ_STORE, d.pz || {}); put(OP_STORE, d.op || {});
    if (d.ru) { try { localStorage.setItem(RU_KEY, '1'); } catch (e) {} }
    if (d.dy) { put(DAILY_STORE, d.dy); daily.last = d.dy.last || ''; daily.streak = d.dy.streak || 0; daily.best = d.dy.best || 0; daily.days = Object.assign({}, d.dy.days || {}); }
    if (d.rd) put(RT_STORE, d.rd);
    const m = get(META, null) || {};
    const langWas = LANG;
    if (d.set) {
      SET_KEYS.forEach(k => { if (k !== 'lang' && d.set[k] !== undefined) settings[k] = d.set[k]; });
      let lang = d.set.lang && SUPPORTED.includes(d.set.lang) ? d.set.lang : LANG;
      m.setH = JSON.stringify(Object.assign(setOf(), { lang })); m.setT = d.setT || 1;
      if (lang !== langWas) { const sel = $('#langSel'); sel.value = lang; sel.dispatchEvent(new Event('change')); }
      applySkin();
    }
    if (d.nm) { m.nmH = JSON.stringify(d.nm); m.nmT = d.nmT || 1; if (Online.ready && Online.profile.name !== d.nm) Online.setName(d.nm).then(() => dockRender()).catch(() => {}); else { try { localStorage.setItem('chess-online-name', d.nm); } catch (e) {} } }
    m.rtH = JSON.stringify(d.rt); m.rtT = d.rtT || 1;
    put(META, m);
    save(); renderInfo();
  }
  return { snapshot, merge, apply, mergeDaily, mergeRated };
})();
window.ChessSync = ChessSync;
let syncing = false, lastPushed = '', syncLast = 0;
const signedIn = () => !!(olOn() && Online.ready && Online.account());
const syncStrip = d => JSON.stringify(Object.assign({}, d, { t: undefined }));
function syncLastText() { return syncLast ? t('sync.last', { t: new Date(syncLast).toLocaleTimeString(LANG, { hour: '2-digit', minute: '2-digit' }) }) : ''; }
async function syncPush() {
  if (!signedIn()) return;
  const d = ChessSync.snapshot(), s = syncStrip(d);
  try { await Online.push(JSON.stringify(d)); lastPushed = s; syncLast = Date.now(); } catch (e) { console.warn(e); }
}
async function syncNow(quiet) {
  if (!signedIn() || syncing) return;
  syncing = true;
  try {
    const local = ChessSync.snapshot();
    const c = await Online.pull();
    let merged = local;
    if (c && c.d) { try { merged = ChessSync.merge(local, JSON.parse(c.d)); } catch (e) { console.warn(e); } }
    ChessSync.apply(merged);
    syncing = false;
    await syncPush();
    if (!quiet) toast(t('sync.done'), 1400);
  } catch (e) { console.warn(e); if (!quiet) olConfirm(authErrText(e), 'OK', olOk); }
  syncing = false;
  accRender();
}
// local changes are pushed a few seconds later (polling keeps the rest of the page untouched)
let syncT = 0;
function syncTouch() { clearTimeout(syncT); syncT = setTimeout(() => { if (signedIn() && !syncing && syncStrip(ChessSync.snapshot()) !== lastPushed) syncPush(); }, 3000); }
if (olOn()) {
  setInterval(syncTouch, 20000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) syncPush(); else if (signedIn()) syncNow(true); });
  Online.onAuth(() => dockRender());
}

// ====================================================================== first visit: online name + optional Google link (only while online play is available)
const PF_KEY = 'chess-profile-asked';
const pfAsked = () => { try { return !!localStorage.getItem(PF_KEY); } catch (e) { return true; } };
const pfDone = () => { try { localStorage.setItem(PF_KEY, String(Date.now())); } catch (e) {} };
function pfOpen() { $('#pfName').value = Online.localName() || Online.defaultName(); showOverlay('#profOverlay'); }
async function pfSaveName() {
  const n = Online.cleanName($('#pfName').value);
  try { localStorage.setItem('chess-online-name', n); } catch (e) {}
  if (Online.ready) { try { await Online.setName(n); } catch (e) { console.warn(e); } }
  const f = $('#olName'); if (f) f.value = n;
  syncTouch(); dockRender();
}
$('#pfLater').onclick = () => { pfDone(); pfSaveName(); hideOverlay('#profOverlay'); };
$('#pfGoogle').onclick = async () => { pfDone(); await pfSaveName(); hideOverlay('#profOverlay'); await Online.init().catch(e => { olConfirm(authErrText(e), 'OK', olOk); }); if (Online.ready) googleLink(); };
$('#pfName').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('#pfLater').click(); else if (e.key === 'Escape') { e.preventDefault(); $('#pfLater').click(); } });
window.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#profOverlay').classList.contains('show')) { e.stopImmediatePropagation(); $('#pfLater').click(); } }, true);
// shown once, only while nothing else is on screen (no dialog, no lesson / puzzle, no online game)
const pfTimer = setInterval(() => {
  if (!olOn() || pfAsked()) { clearInterval(pfTimer); return; }
  if (document.hidden || document.querySelector('.overlay.show') || lesson || puzzle || net || document.body.classList.contains('mtab-online')) return;
  clearInterval(pfTimer); pfOpen();
}, 1200);
if (olOn()) { accRender(); setTimeout(() => { dockStart().then(() => { if (signedIn()) syncNow(true); }); }, 800); }

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
applyI18n(); orient(); drawSquares();
// PC header bar: title left, menu (new > undo > hint > rules > lessons > puzzles) + icons right, game info in between
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnHint', '#btnRules', '#btnLesson', '#btnPuzzle'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => renderInfo());
openReady.then(() => { if (HB && HB.on) renderInfo(); });
// time-signal beeps (last 5 seconds) follow the sound setting
if (window.CountTick) CountTick.setMuted(() => !settings.sound);
$('#langSel').onchange = e => {
  LANG = e.target.value; settings.lang = LANG; save(); applyI18n();
  try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {}
  renderInfo(); renderBoard(false);
  if ($('#newOverlay').classList.contains('show')) segSync();
  if ($('#rulesOverlay').classList.contains('show')) renderRules();
  if (HB) HB.relabel();
  if (lesson) renderLessonCard(); if (puzzle) renderPuzzleCard();
  if ($('#lessonOverlay').classList.contains('show')) { if (!$('#lessonListView').classList.contains('hidden')) openLessons(); else if (!$('#lessonIntroView').classList.contains('hidden')) openIntro(introIdx); }
  if ($('#puzzleOverlay').classList.contains('show')) { if (!$('#pzListView').classList.contains('hidden')) openPuzzles(); else openPzGrid(pzLevel); }
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
window.__ch = { get net() { return net; }, get moves() { return moves; }, get cur() { return cur; }, settings, get rv() { return rv; }, rvJudge, dailyPick, parseGameText, statusAt, posAt, newGame, sanOf, tryMove, onSquare, get lesson() { return lesson; }, get puzzle() { return puzzle; }, get sel() { return sel; }, startLesson, startPuzzle, lessonsReady, puzzlesReady, get LESSONS() { return LESSONS; }, get PUZZLES() { return PUZZLES; }, commit };

function dismissOverlay(o) {
  const OUTSIDE = { newOverlay: '#btnCancelNew', resultOverlay: '#btnReview', pasteOverlay: '#pasteCancel', puzzleOverlay: '#pzClose', rulesOverlay: '#rulesClose', onlineOverlay: '#olClose', profOverlay: '#pfLater' };
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
if (window.RulesOffer) RulesOffer.init({ game: 'chess', lang: () => LANG, open: () => openRules('move'), watch: '#rulesOverlay' });
