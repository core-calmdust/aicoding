'use strict';
// Chess — page logic (board, input, AI flow, lessons, puzzles, review, share). Rules and search live in engine.js.
const E = window.ChessEngine, MATE = E.MATE, MATET = E.MATET;
const P1 = 1, P2 = 2;                         // P1 = White, P2 = Black
const mFrom = m => m & 127, mTo = m => (m >> 7) & 127, mPromo = m => (m >> 14) & 7, mFlag = m => m >> 17;
const PT = ' PNBRQK', PVAL = [0, 1, 3, 3, 5, 9, 0];
let startFen = null;           // lesson / puzzle start (null = normal start)
let moves = [];                // game record (engine move ints)
let cur = 0;                   // number of moves shown
const keyOf = i => (startFen || '') + '|' + moves.slice(0, i).join(',');
let posCache = { key: '' };
function posAt(i) {
  const key = keyOf(i);
  if (posCache.key === key) return posCache;
  const r = E.replay(startFen, moves.slice(0, i));
  posCache = { key, pos: r.pos, hashes: r.hashes, legal: r.pos.legal() };
  return posCache;
}
const sideP = pos => pos.side ? P2 : P1;
function statusAt(i) {
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
const settings = { mode: 'ai', color: 1, level: 5, level2: 5, anim: true, sound: true, hint: false, eval: true, last: true, threat: false, lang: '', flip: false };
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
    if (Array.isArray(d.moves) && validMoves(d.moves)) {
      moves = d.moves; humanColor = d.humanColor || 1; evals = Array.isArray(d.evals) ? d.evals : [];
      cur = moves.length; gameOverShown = statusAt(cur).over; return true;
    }
  } catch (e) {}
  return false;
}
function save() {
  if (lesson || puzzle) { try { const d = JSON.parse(localStorage.getItem(STORE) || '{}'); d.settings = settings; localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {} return; }
  try { localStorage.setItem(STORE, JSON.stringify({ settings, moves, humanColor, evals: evals.slice(0, moves.length + 1) })); } catch (e) {}
}

// ====================================================================== workers
let jobId = 0;
function makeWorker() {
  const w = new Worker('engine.js?v=20261018b'); w.jobs = new Map();
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
function orient() { const base = settings.mode === 'ai' ? humanColor === P2 : puzzle ? puzzle.me === P2 : lesson ? lesson.me === P2 : false; flipped = base !== !!settings.flip; }
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
  if (labelList) drawLabels(labelList);
  else if (!drawReviewFx(svg) && hintList && !st.over) drawHints(hintList, svg);
}
function valLabel(v) {
  if (v > MATET) return { cls: 'win', big: 'M' + ((MATE - v + 1) >> 1) };
  if (v < -MATET) return { cls: 'loss', big: '-M' + ((MATE + v) >> 1) };
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
function levelFor(p) { return settings.mode === 'watch' ? (p === P1 ? settings.level : settings.level2) : settings.level; }
function gameOver(i) { return statusAt(i).over; }
function canHumanPlay() {
  if (gameOver(cur) || animating) return false;
  if (puzzle) return puzzle.state === 'play' && !puzzle.busy && toMoveAt(cur) === puzzle.me;
  if (lesson) return !lesson.answered;
  if (reviewing) return false;
  return !isAIColor(toMoveAt(cur)) && !thinking;
}
function playerName(p) {
  if (puzzle) return p === puzzle.me ? t('you') : t('defender');
  if (lesson || settings.mode === 'pvp') return '';
  if (settings.mode === 'watch') return `AI ${LV(levelFor(p))}`;
  return p === humanColor ? t('you') : `AI ${LV(settings.level)}`;
}
function material(pos, c) { let m = 0; for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const p = pos.b[s]; if (p && (p >> 3) === c) m += PVAL[p & 7]; } return m; }
function renderInfo() {
  const { pos } = posAt(cur), st = statusAt(cur), tm = sideP(pos);
  for (const p of [P1, P2]) {
    const c = p - 1;
    $('#count' + p).textContent = material(pos, c);
    $('#hand' + p).textContent = t('mat');
    const n = playerName(p); $('#name' + p).textContent = n ? n + ' · ' + pname(p) : pname(p);
    const el = $('#pl' + p);
    el.classList.toggle('active', !st.over && tm === p); el.classList.toggle('won', st.winner === p); el.classList.toggle('thinking', thinking === p);
    $('#status' + p).textContent = st.winner === p ? t('st.win') : thinking === p ? t('thinking') : (!st.over && tm === p ? t('st.turn') + (pos.inCheck() ? ' · ' + t('st.check') : '') : '');
  }
  $('#evalCard').classList.toggle('hidden', !settings.eval);
  let ev = st.over ? { s: st.winner === P1 ? 1 : st.winner === P2 ? -1 : 0, kind: 'final', side: st.winner } : evals[cur];
  if (!ev && cur > 0 && evals[cur - 1]) ev = evals[cur - 1];
  $('#evalText').textContent = evalText(ev);
  $('#evalFill').style.width = (50 + 50 * (ev ? ev.s : 0)) + '%';
  renderGraph(); renderKifu();
  $('#btnUndo').disabled = settings.mode === 'watch' || !canUndo();
  $('#btnHint').classList.toggle('on', settings.hint);
  $('#btnSound').classList.toggle('on', settings.sound);
  $('#btnFlip').classList.toggle('on', !!settings.flip);
  renderReview();
  $('#infoLine').textContent = `${t('info.moves', { n: moves.length })}  ·  ${settings.mode === 'ai' ? 'AI Lv.' + settings.level + ' ' + LV(settings.level) : settings.mode === 'watch' ? `Lv.${settings.level} vs Lv.${settings.level2}` : t('ng.pvp')}  ·  ← → ${t('info.browse')}`;
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
function update(anim) { if (!anim) { sel = null; closePromo(); } renderBoard(anim); renderInfo(); }

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
  if (!canHumanPlay()) { if (reviewing && !lesson && !puzzle) rsOpen(); return; }
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
  if (!c.length) return false;
  // a dropped piece already stands on its target square (still keyed by `from`), so the move does not slide it again
  if (dragged) { const el = pcEls.get(from); if (el) { el.style.transform = ''; placeAt(el, to); } }
  if (c.length > 1) { openPromo(c, to); return true; }
  commit(c[0], dragged);
  return true;
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
  if (lesson) return lessonAnswer(m);
  if (puzzle) return puzzleMove(m);
  playMove(m);
}

// ====================================================================== flow
function newGame() {
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = 0; animating = false;
  startFen = null;
  if (settings.mode === 'ai') humanColor = settings.color === 0 ? (Math.random() < 0.5 ? P1 : P2) : settings.color;
  moves = []; cur = 0; reviewing = false; evals = []; hintList = null; gameOverShown = false; sel = null;
  hideOverlay('#resultOverlay');
  orient(); drawSquares(); shownKey = ''; syncPieces(new Int8Array(128));
  update(false); save(); afterPosition();
}
function playMove(m) {
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
  if (!settings.eval && !settings.hint) return;
  const mover = toMoveAt(idx);
  const apply = list => {
    if (keyOf(idx) !== key || !list || !list.length) return;
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
  if (moves.length !== cur || gameOverShown) return;
  gameOverShown = true;
  const youWin = settings.mode === 'ai' && st.winner === humanColor, aiWin = settings.mode === 'ai' && st.winner && st.winner !== humanColor;
  playChime(!aiWin);
  if (youWin || (settings.mode === 'pvp' && st.winner)) confetti();
  $('#resultDisc').innerHTML = st.winner ? `<div class="pdisc p${st.winner}"></div>` : '';
  $('#resultTitle').textContent = st.draw ? t('res.draw') : youWin ? t('res.youWin') : aiWin ? t('res.aiWin') : t('res.pWin', { c: pname(st.winner) });
  let sub = t('res.why.' + st.why) + '<br>' + t('res.sub', { n: Math.ceil(moves.length / 2) });
  if (settings.mode === 'ai') sub += '<br>' + t('res.vs', { name: LV(settings.level), lv: settings.level });
  $('#resultSub').innerHTML = sub;
  setTimeout(() => showOverlay('#resultOverlay'), 700);
}
function canUndo() {
  if (lesson || puzzle) return false;
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
function resumeHere() { if (!reviewing) return; moves = moves.slice(0, cur); evals.length = cur + 1; reviewing = false; gameOverShown = false; update(false); save(); afterPosition(); }
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
  const inst = on => ['#lessonOverlay', '#puzzleOverlay'].forEach(x => $(x).classList.toggle('instant', on));
  inst(true);
  if (b.dataset.v === 'puzzle' && !$('#puzzleOverlay').classList.contains('show')) { $('#lessonOverlay').classList.remove('show'); openPuzzles(); }
  if (b.dataset.v === 'lesson' && !$('#lessonOverlay').classList.contains('show')) { $('#puzzleOverlay').classList.remove('show'); openLessons(); }
  setTimeout(() => inst(false), 150);
}));
$('#btnResume').onclick = resumeHere;
$('#btnLatest').onclick = () => viewAt(moves.length);
$('#btnReview').onclick = () => hideOverlay('#resultOverlay');
$('#btnAgain').onclick = () => { hideOverlay('#resultOverlay'); newGame(); };
function pgnText() {
  const st = statusAt(moves.length), res = st.over ? (st.winner === P1 ? '1-0' : st.winner === P2 ? '0-1' : '1/2-1/2') : '*';
  const p0 = E.replay(startFen, []).pos; let full = p0.full, side = p0.side, s = '';
  for (let i = 0; i < moves.length; i++) { if (side === 0) s += full + '. '; else if (i === 0) s += full + '... '; s += sanOf(i) + ' '; if (side === 1) full++; side ^= 1; }
  const d = new Date(), date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  return `[Event "World Board Game Atlas"]\n[Date "${date}"]\n[White "${settings.mode === 'ai' ? (humanColor === P1 ? 'You' : 'AI Lv.' + settings.level) : 'White'}"]\n[Black "${settings.mode === 'ai' ? (humanColor === P2 ? 'You' : 'AI Lv.' + settings.level) : 'Black'}"]\n[Result "${res}"]\n${startFen ? `[FEN "${startFen}"]\n` : ''}\n${s}${res}`;
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
function openRules(tab) { rulesTab = RULE_TABS.includes(tab) ? tab : 'move'; renderRules(); showOverlay('#rulesOverlay'); }
function renderRules() {
  $('#rulesTabs').innerHTML = RULE_TABS.map(r => `<button data-r="${r}" class="${r === rulesTab ? 'sel' : ''}">${t('rl.tab.' + r)}</button>`).join('');
  $('#rulesBody').innerHTML = `<p class="rl-lead">${t('rl.lead.' + rulesTab)}</p><div class="rl-grid">${ruleItems(rulesTab)}</div>`;
}
$('#rulesTabs').onclick = e => { const b = e.target.closest('button[data-r]'); if (b) { rulesTab = b.dataset.r; renderRules(); } };
$('#rulesClose').onclick = () => hideOverlay('#rulesOverlay');

// ---------------------------------------------------------------- new game dialog
let draft = {};
function levelLabelHTML(v) { return `Lv.${v} ${LV(v)}<small>${LVD(v)}</small>`; }
function segSync() {
  document.querySelectorAll('#segMode button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.mode));
  document.querySelectorAll('#segColor button').forEach(b => b.classList.toggle('sel', +b.dataset.v === draft.color));
  const m = draft.mode, game = m === 'ai' || m === 'pvp' || m === 'watch';
  $('#fColor').classList.toggle('hidden', m !== 'ai');
  $('#fLevel').classList.toggle('hidden', !(m === 'ai' || m === 'watch'));
  $('#fLevel2').classList.toggle('hidden', m !== 'watch');
  $('#fDisplay').classList.toggle('hidden', !game);
  $('#fInfo').classList.toggle('hidden', game);
  $('#fInfoText').textContent = m === 'lesson' ? t('ls.desc') : m === 'puzzle' ? t('pz.desc') : '';
  $('#btnStart').textContent = m === 'lesson' ? t('ng.toLessons') : m === 'puzzle' ? t('ng.toPuzzles') : t('start');
  $('#levelLabel').textContent = m === 'watch' ? t('ng.level1') : t('ng.level');
  $('#levelRange').value = draft.level; $('#levelName').innerHTML = levelLabelHTML(draft.level);
  $('#levelRange2').value = draft.level2; $('#levelName2').innerHTML = levelLabelHTML(draft.level2);
}
function openNewDialog() {
  draft = { mode: lesson ? 'lesson' : puzzle ? 'puzzle' : settings.mode, color: settings.color, level: settings.level, level2: settings.level2 };
  $('#optEval').checked = settings.eval; $('#optLast').checked = settings.last; $('#optAnim').checked = settings.anim; $('#optThreat').checked = settings.threat;
  segSync(); showOverlay('#newOverlay');
}
$('#segMode').onclick = e => { const b = e.target.closest('button'); if (b) { draft.mode = b.dataset.v; segSync(); } };
$('#segColor').onclick = e => { const b = e.target.closest('button'); if (b) { draft.color = +b.dataset.v; segSync(); } };
$('#levelRange').oninput = e => { draft.level = +e.target.value; segSync(); };
$('#levelRange2').oninput = e => { draft.level2 = +e.target.value; segSync(); };
$('#btnCancelNew').onclick = () => hideOverlay('#newOverlay');
$('#btnStart').onclick = () => {
  hideOverlay('#newOverlay');
  if (draft.mode === 'lesson') { openLessons(); return; }
  if (draft.mode === 'puzzle') { openPuzzles(); return; }
  exitSpecial();
  Object.assign(settings, { mode: draft.mode, color: draft.color, level: draft.level, level2: draft.level2, eval: $('#optEval').checked, last: $('#optLast').checked, anim: $('#optAnim').checked, threat: $('#optThreat').checked, flip: false });
  newGame();
};

// ====================================================================== lessons (20 points per problem, 75 to pass)
let LESSONS = null;
const lessonsReady = fetch('lessons.json?v=20261018b').then(r => r.json()).then(d => (LESSONS = d)).catch(() => null);
const LS_STORE = STORE + '-lessons', PZ_STORE = STORE + '-puzzles';
function lsProgress() { try { return JSON.parse(localStorage.getItem(LS_STORE) || '{}'); } catch (e) { return {}; } }
function pzProgress() { try { return JSON.parse(localStorage.getItem(PZ_STORE) || '{}'); } catch (e) { return {}; } }
let introIdx = 0, savedGame = null;
function stashGame() { if (!lesson && !puzzle) savedGame = { moves, cur, evals: evals.slice(), humanColor }; }
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
  if (!LESSONS) { toast(t('ls.fail')); return; }
  const pr = lsProgress();
  $('#lessonList').innerHTML = LESSONS.steps.map((s, i) => {
    const r = pr[s.id];
    return `<button class="lesson-item" data-i="${i}"><span class="no">${i + 1}</span><span class="tx"><b>${t('ls.' + s.id + '.title')}</b><small>${t('ls.' + s.id + '.sub')}</small></span><span class="st ${r && r.clear ? 'clear' : ''}">${r ? (r.clear ? t('ls.clear') + ' ' : '') + t('u.pt', { n: r.best }) : t('ls.notyet')}</span></button>`;
  }).join('');
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
$('#lessonList').onclick = e => { const b = e.target.closest('.lesson-item'); if (b) openIntro(+b.dataset.i); };
function fenPieces(fen) { const out = {}; const rows = fen.split(' ')[0].split('/'); rows.forEach((row, i) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) { f += +ch; continue; } out['abcdefgh'[f] + (8 - i)] = ch; f++; } }); return out; }
function openIntro(i) {
  introIdx = i; const s = LESSONS.steps[i];
  $('#liStep').textContent = 'STEP ' + (i + 1);
  $('#liTitle').textContent = t('ls.' + s.id + '.title');
  const d = s.diagram;
  $('#liBody').innerHTML = (d ? `<div class="mini">${miniBoard(fenPieces(d.fen), { arrows: d.arrows || [], hl: d.hl || [], dots: d.dots || [] })}</div>` : '') + t('ls.' + s.id + '.intro');
  showLessonView('lessonIntroView');
}
$('#btnLessonBack').onclick = () => openLessons();
$('#btnLessonClose').onclick = () => hideOverlay('#lessonOverlay');
$('#btnLessonStart').onclick = () => startLesson(introIdx);
$('#btnLessonQuit2').onclick = () => { hideOverlay('#lessonOverlay'); quitSpecial(); };
$('#btnLessonRetry').onclick = () => startLesson(lesson ? lesson.step : introIdx);
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
function lessonProblem() { return LESSONS.steps[lesson.step].problems[lesson.i]; }
function loadLessonProblem() {
  const P = lessonProblem();
  lesson.me = P.fen.split(' ')[1] === 'b' ? P2 : P1;
  enterSpecial(P.fen);
  // the stored moves are UCI strings: convert once for this position
  const pos = posAt(0).pos; P._sc = P.sc.map(([u, v]) => [pos.fromUci(u), v]); P._best = pos.fromUci(P.best);
  lesson.answered = false; lesson.hinted = false;
  update(false); renderLessonCard(); $('#lsFb').innerHTML = '';
}
function renderLessonCard() {
  const s = LESSONS.steps[lesson.step], n = s.problems.length;
  $('#lsStep').textContent = t('ls.stepq', { s: lesson.step + 1, i: lesson.i + 1, n });
  $('#lsTitle').textContent = t('ls.' + s.id + '.title');
  $('#lsPrompt').innerHTML = `<div class="ls-goal"><span class="pdisc p${lesson.me}"></span><span>${t('ls.turn', { c: pname(lesson.me) })} ${t('ls.' + s.id + '.goal')}</span></div>`;
  $('#lsDots').innerHTML = s.problems.map((_, i) => { const r = lesson.results[i]; return `<i class="${r === undefined ? '' : r >= 16 ? 'ok' : r >= 10 ? 'mid' : 'ng'} ${i === lesson.i ? 'cur' : ''}"></i>`; }).join('');
  $('#lsNext').textContent = lesson.i + 1 < n ? t('ls.next') : t('ls.result');
  $('#lsNext').disabled = !lesson.answered; $('#lsHint').disabled = lesson.answered;
}
function problemPoints(P, m) {
  const val = new Map(P._sc), best = Math.max(...P._sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -MATE;
  if (best > MATET && mine > MATET) return mine >= best ? 20 : 16;
  if (mine >= best - 10) return 20;
  if (best > MATET) return mine > 150 ? 8 : mine > -60 ? 4 : 0;
  if (mine < -MATET) return 0;
  const loss = sOfV(best) - sOfV(mine);
  return Math.max(0, Math.round(20 * (1 - loss / 0.45)));
}
function lessonAnswer(m) {
  const P = lessonProblem(), s = LESSONS.steps[lesson.step], { pos } = posAt(0);
  lesson.answered = true;
  const pts = problemPoints(P, m); lesson.results[lesson.i] = pts; renderLessonCard();
  const best = P._best, lbl = pts === 20 ? 'fb.perfect' : pts >= 16 ? 'fb.good' : pts >= 10 ? 'fb.ng' : 'fb.bad';
  const bs = pos.san(best), ms = pos.san(m), val = new Map(P._sc), fmt = v => valLabel(v).big;
  let fb = `<span class="pts ${pts >= 16 ? 'ok' : pts >= 10 ? 'mid' : 'ng'}">+${t('u.pt', { n: pts })}</span> <b class="${pts >= 16 ? 'ok' : 'ng'}">${t(lbl)}</b> `;
  fb += t('ls.' + s.id + '.why', { m: bs, x: ms });
  fb += `<br><small style="color:var(--dim)">${t('fb.values', { a: fmt(val.has(m) ? val.get(m) : -MATE), b: fmt(val.get(best)), x: ms })}</small>`;
  $('#lsFb').innerHTML = fb;
  playChime(pts >= 16);
  playMove2(m);
  const tok = busyToken;
  setTimeout(() => {
    if (!lesson || tok !== busyToken) return;
    moves = []; cur = 0; sel = null; lessonMarks = [];
    lessonMarks.push({ arrow: [mFrom(best), mTo(best)], cls: '' }, { at: mTo(best), cls: 'ok' });
    if (m !== best) lessonMarks.push({ arrow: [mFrom(m), mTo(m)], cls: 'ng' }, { at: mTo(m), cls: 'ng' });
    const sorted = P._sc.slice().sort((a, b) => b[1] - a[1]).slice(0, 4), seen = new Set();
    labelList = [];
    for (const [mm, v] of sorted) { if (seen.has(mTo(mm))) continue; seen.add(mTo(mm)); const L = valLabel(v); labelList.push({ at: mTo(mm), big: L.big, cls: L.cls + (mm === best ? ' best' : '') }); }
    if (!seen.has(mTo(m)) && val.has(m)) { const L = valLabel(val.get(m)); labelList.push({ at: mTo(m), big: L.big, cls: L.cls }); }
    update(false);
  }, moveDur() + 800);
}
$('#lsHint').onclick = () => {
  if (!lesson || lesson.answered) return;
  lesson.hinted = true;
  const s = LESSONS.steps[lesson.step], { pos } = posAt(cur), me = pos.side, op = me ^ 1;
  $('#lsFb').innerHTML = t('ls.' + s.id + '.hint');
  lessonMarks = [];
  if (s.id === 'capture') for (const q of hanging(pos, op)) lessonMarks.push({ at: q, cls: 'hang' });
  if (s.id === 'escape') for (const q of hanging(pos, me)) lessonMarks.push({ at: q, cls: 'hang' });
  if (s.id === 'mate1' || s.id === 'mate2') lessonMarks.push({ at: pos.ksq[op], cls: 'hang' });
  if (s.id === 'fork' || s.id === 'pin') { const P = lessonProblem(); lessonMarks.push({ at: mFrom(P._best), cls: 'ok' }); }
  if (s.id === 'promote') { const P = lessonProblem(); lessonMarks.push({ at: mFrom(P._best), cls: 'ok' }); }
  renderFx();
};
$('#lsNext').onclick = () => {
  if (!lesson || !lesson.answered) return;
  const s = LESSONS.steps[lesson.step];
  if (lesson.i + 1 < s.problems.length) { lesson.i++; loadLessonProblem(); return; }
  const n = lesson.results.reduce((a, b) => a + b, 0), pass = n >= 75;
  const pr = lsProgress(), old = pr[s.id] || { best: 0, clear: false };
  pr[s.id] = { best: Math.max(old.best, n), clear: old.clear || pass };
  try { localStorage.setItem(LS_STORE, JSON.stringify(pr)); } catch (e) {}
  $('#ldTitle').textContent = t(pass ? 'ls.passed' : 'ls.failed');
  $('#ldSub').innerHTML = `<div class="ld-score ${pass ? 'ok' : 'ng'}">${t('u.pt', { n })}<small> / 100</small></div>` + lesson.results.map((x, k) => `${k + 1}: ${t('u.pt', { n: x })}`).join('　') + (pass ? '' : `<br>${t('ls.needPass')}`);
  $('#btnLessonNextStep').classList.toggle('hidden', lesson.step + 1 >= LESSONS.steps.length);
  showLessonView('lessonDoneView'); showOverlay('#lessonOverlay');
  if (pass) confetti();
};
$('#lsQuit').onclick = () => quitSpecial();

// ====================================================================== puzzles: mate in N
let PUZZLES = null;
const puzzlesReady = fetch('puzzles.json?v=20261018b').then(r => r.json()).then(d => (PUZZLES = d)).catch(() => null);
let pzLevel = 0;
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
async function openPuzzles() {
  await puzzlesReady; selTab('puzzle');
  if (!PUZZLES) { toast(t('ls.fail')); return; }
  const pr = pzProgress(), dl = dailyPick(), di = dailyInfo();
  $('#pzLevels').innerHTML = (dl ? `<button class="lesson-item daily" data-daily="1"><span class="no">★</span><span class="tx"><b>${t('daily.title')} <span style="color:var(--dim);font-weight:400">${dl.date.slice(5).replace('-', '/')}</span></b><small>${t('pz.level' + (dl.L + 1))} · ${t('pz.winIn', { n: PUZZLES.levels[dl.L].n })} · 🔥 ${t('daily.streak', { n: di.streak })}${di.best > 1 ? ' · ' + t('daily.best', { n: di.best }) : ''}</small></span><span class="st ${di.today ? 'clear' : ''}">${di.today ? '✓' : t('daily.go')}</span></button>` : '') + PUZZLES.levels.map((L, i) => {
    const solved = L.puzzles.filter((_, j) => pr[`${i}-${j}`]).length;
    return `<button class="lesson-item" data-i="${i}"><span class="no">${i + 1}</span><span class="tx"><b>${t('pz.level' + (i + 1))}</b><small>${t('pz.levelSub', { n: L.n })}</small></span><span class="st ${solved === L.puzzles.length ? 'clear' : ''}">${solved}/${L.puzzles.length}</span></button>`;
  }).join('');
  showPzView('pzListView'); showOverlay('#puzzleOverlay');
}
$('#pzLevels').onclick = e => { const b = e.target.closest('.lesson-item'); if (!b) return; if (b.dataset.daily) { const dl = dailyPick(); if (dl) startPuzzle(dl.L, dl.j, dl.date); } else openPzGrid(+b.dataset.i); };
function openPzGrid(i) {
  pzLevel = i; const pr = pzProgress(), L = PUZZLES.levels[i];
  $('#pzLevelTitle').textContent = t('pz.level' + (i + 1)) + ' — ' + t('pz.winIn', { n: L.n });
  $('#pzGrid').innerHTML = L.puzzles.map((_, j) => `<button data-j="${j}" class="${pr[`${i}-${j}`] ? 'solved' : ''}">${j + 1}</button>`).join('');
  showPzView('pzGridView'); showOverlay('#puzzleOverlay');
}
$('#pzGrid').onclick = e => { const b = e.target.closest('button[data-j]'); if (b) startPuzzle(pzLevel, +b.dataset.j); };
$('#pzBack').onclick = () => openPuzzles();
$('#pzClose').onclick = () => hideOverlay('#puzzleOverlay');
function startPuzzle(L, j, daily) {
  hideOverlay('#puzzleOverlay');
  stashGame(); lesson = null; document.body.classList.remove('in-lesson');
  const P = PUZZLES.levels[L].puzzles[j];
  puzzle = { L, j, P, me: P.fen.split(' ')[1] === 'b' ? P2 : P1, n: PUZZLES.levels[L].n, state: 'play', busy: false, used: 0, daily: daily || null, hinted: false };
  document.body.classList.add('in-puzzle');
  enterSpecial(P.fen);
  update(false); renderPuzzleCard(); pzStatus(t('pz.start'));
}
function renderPuzzleCard() {
  const Pz = puzzle, L = PUZZLES.levels[Pz.L];
  $('#pzStep').textContent = Pz.daily ? `★ ${t('daily.title')} · ${Pz.daily.slice(5).replace('-', '/')}` : `${t('pz.level' + (Pz.L + 1))} · No.${Pz.j + 1}`;
  $('#pzTitle').textContent = t('pz.winIn', { n: Pz.n });
  $('#pzGoal').innerHTML = `<span class="pdisc p${Pz.me}"></span><span>${t('pz.goal', { c: pname(Pz.me), n: Pz.n })}</span>`;
  $('#pzDots').innerHTML = Array.from({ length: Pz.n }, (_, i) => `<i class="${i < Pz.used ? 'ok' : ''} ${i === Pz.used && Pz.state === 'play' ? 'cur' : ''}"></i>`).join('');
  $('#pzNext').disabled = !!Pz.daily || (Pz.j + 1 >= L.puzzles.length && Pz.L + 1 >= PUZZLES.levels.length);
  $('#pzHint').disabled = Pz.state !== 'play'; $('#pzAnswer').disabled = Pz.busy;
  renderInfo();
}
function pzStatus(html) { $('#pzStatus').innerHTML = html; }
function mateReq(n, defend) { return request('ai', { type: 'mate', moves: moves.slice(0, cur), n, defend: !!defend, maxNodes: 3e7 }).then(r => r && r.list); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
function pickDefence(list) { let best = null; for (const e of list) { const v = e.need ? e.need : 99; if (!best || v > best.v) best = { m: e.m, v }; } return best.m; }
function pickAttack(list, left) { let best = null; for (const e of list) if (e.need && e.need <= left && (!best || e.need < best.need)) best = e; return best && best.m; }
async function puzzleMove(m) {
  const Pz = puzzle; Pz.busy = true; lessonMarks = [];
  const left = Pz.n - Pz.used, tok = busyToken, { pos } = posAt(cur), ms = pos.san(m);
  pzStatus(t('pz.checking'));
  const list = await mateReq(left);
  if (!list || puzzle !== Pz || tok !== busyToken) return;
  playMove2(m); Pz.used++; renderPuzzleCard();
  if (statusAt(cur).winner === Pz.me) { setTimeout(() => puzzleSolved(), moveDur() + 300); return; }
  const e = list.find(x => x.m === m);
  if (!e || !e.need || e.need > left) {
    const good = list.filter(x => x.need && x.need <= left).sort((a, b) => a.need - b.need);
    Pz.state = 'fail'; Pz.busy = false;
    await sleep(moveDur() + 400); if (puzzle !== Pz) return;
    moves = moves.slice(0, cur - 1); cur = moves.length; Pz.used--;
    if (good[0]) lessonMarks.push({ arrow: [mFrom(good[0].m), mTo(good[0].m)], cls: '' }, { at: mTo(good[0].m), cls: 'ok' });
    lessonMarks.push({ arrow: [mFrom(m), mTo(m)], cls: 'ng' });
    update(false); playChime(false);
    pzStatus(`<b class="ng">${t('pz.fail')}</b> ${t('pz.failWhy', { m: ms, b: good.length ? pos.san(good[0].m) : '—', n: Pz.n })}`);
    renderPuzzleCard(); return;
  }
  pzStatus(t('pz.good'));
  const dl = await mateReq(Pz.n - Pz.used, true);
  if (!dl || puzzle !== Pz || tok !== busyToken) return;
  await sleep(moveDur() + 300); if (puzzle !== Pz) return;
  if (!dl.length) { puzzleSolved(); return; }
  const r = pickDefence(dl); playMove2(r);
  await sleep(moveDur()); if (puzzle !== Pz) return;
  Pz.busy = false; renderPuzzleCard(); boardEl.classList.toggle('can', canHumanPlay());
  pzStatus(t('pz.yourMove', { n: Pz.n - Pz.used }));
}
function playMove2(m) { moves = moves.slice(0, cur); moves.push(m); cur = moves.length; hintList = null; update(true); }
function puzzleSolved() {
  const Pz = puzzle; if (!Pz) return;
  Pz.state = 'solved'; Pz.busy = false;
  const pr = pzProgress(); pr[`${Pz.L}-${Pz.j}`] = true;
  try { localStorage.setItem(PZ_STORE, JSON.stringify(pr)); } catch (e) {}
  if (Pz.daily) dailySolved(Pz.daily, Pz.hinted);
  pzStatus(`<b class="ok">${t('pz.solved')}</b> ${t('pz.solvedSub', { n: Pz.used })}` + (Pz.daily ? `<br>🔥 ${t('daily.streak', { n: dailyInfo().streak })}` : ''));
  playChime(true); confetti(); renderPuzzleCard();
}
$('#pzRetry').onclick = () => { if (puzzle) { const h = puzzle.hinted; startPuzzle(puzzle.L, puzzle.j, puzzle.daily); puzzle.hinted = h; } };
$('#pzNext').onclick = () => { if (!puzzle) return; let { L, j } = puzzle; j++; if (j >= PUZZLES.levels[L].puzzles.length) { L++; j = 0; } if (L < PUZZLES.levels.length) startPuzzle(L, j); };
$('#pzList').onclick = () => { if (!puzzle) return; if (puzzle.daily) openPuzzles(); else openPzGrid(puzzle.L); };
$('#pzQuit').onclick = () => quitSpecial();
$('#pzHint').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.state !== 'play' || Pz.busy) return;
  const left = Pz.n - Pz.used, list = await mateReq(left); if (puzzle !== Pz || !list) return;
  Pz.hinted = true;
  lessonMarks = list.filter(x => x.need && x.need <= left).map(g => ({ at: mFrom(g.m), cls: 'ok' }));
  renderFx(); pzStatus(t('pz.hintText'));
};
$('#pzAnswer').onclick = async () => {
  const Pz = puzzle; if (!Pz || Pz.busy) return;
  Pz.busy = true; Pz.state = 'answer'; Pz.hinted = true; lessonMarks = []; hintList = null;
  moves = []; cur = 0; Pz.used = 0; update(false); renderPuzzleCard(); pzStatus(t('pz.showing'));
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
  return { q, ok, desc, best: best.m, m, loss };
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
    html = `<div class="rv-sum"><span></span><span class="h">${t('rv.acc')}</span><span></span>${row(P1)}${row(P2)}</div>`;
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
  const wd = now.getDay(), L = wd >= 1 && wd <= 2 ? 1 : wd >= 3 && wd <= 4 ? 2 : 3;
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

// ====================================================================== boot
const hadSave = load();
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) { LANG = q; try { localStorage.setItem('aicoding-lang', q); } catch (e) {} } }
applyI18n(); orient(); drawSquares();
$('#langSel').onchange = e => {
  LANG = e.target.value; settings.lang = LANG; save(); applyI18n();
  try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {}
  renderInfo(); renderBoard(false);
  if ($('#newOverlay').classList.contains('show')) segSync();
  if ($('#rulesOverlay').classList.contains('show')) renderRules();
  if (lesson) renderLessonCard(); if (puzzle) renderPuzzleCard();
  if ($('#lessonOverlay').classList.contains('show')) { if (!$('#lessonListView').classList.contains('hidden')) openLessons(); else if (!$('#lessonIntroView').classList.contains('hidden')) openIntro(introIdx); }
  if ($('#puzzleOverlay').classList.contains('show')) { if (!$('#pzListView').classList.contains('hidden')) openPuzzles(); else openPzGrid(pzLevel); }
};
if (loadFromHash()) { /* shared game opened */ }
else if (!hadSave) { update(false); openNewDialog(); }
else { update(false); afterPosition(); }
window.__ch = { get moves() { return moves; }, get cur() { return cur; }, settings, get rv() { return rv; }, rvJudge, dailyPick, parseGameText, statusAt, posAt, newGame, sanOf, tryMove, onSquare, get lesson() { return lesson; }, get puzzle() { return puzzle; }, get sel() { return sel; }, startLesson, startPuzzle, lessonsReady, puzzlesReady, get LESSONS() { return LESSONS; }, get PUZZLES() { return PUZZLES; }, commit };

function dismissOverlay(o) {
  const OUTSIDE = { newOverlay: '#btnCancelNew', resultOverlay: '#btnReview', pasteOverlay: '#pasteCancel', puzzleOverlay: '#pzClose', rulesOverlay: '#rulesClose' };
  if (o.id === 'lessonOverlay') { const done = $('#lessonDoneView'); if (done && !done.classList.contains('hidden')) $('#btnLessonQuit2').click(); else $('#btnLessonClose').click(); return; }
  const b = OUTSIDE[o.id] && $(OUTSIDE[o.id]); if (b) b.click(); else o.classList.remove('show');
}
document.querySelectorAll('.overlay').forEach(o => {
  let down = false;
  o.addEventListener('pointerdown', e => { down = e.target === o; });
  o.addEventListener('click', e => { if (e.target !== o || !down) return; down = false; dismissOverlay(o); });
});
function backToBoard() { document.querySelectorAll('.overlay.show').forEach(o => dismissOverlay(o)); if (lesson || puzzle) quitSpecial(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
(() => { const h = $('.brand h1.to-board'); if (!h) return; h.addEventListener('click', backToBoard); h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); backToBoard(); } }); })();
function rsInProgress() { return !lesson && !puzzle && moves.length > 0 && !gameOver(moves.length); }
function rsViewing() { return !lesson && !puzzle && reviewing; }
function rsOpen() {
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
  if (document.querySelector('.overlay.show') || lesson || puzzle) return;
  const k = { ArrowLeft: 'prev', ArrowRight: 'next', ArrowUp: 'last', ArrowDown: 'first', ' ': 'play' }[e.key];
  if (!k) return;
  e.preventDefault(); if (tg && tg.blur && tg !== document.body) tg.blur();
  navGo(k);
});
window.addEventListener('resize', () => renderFx());
