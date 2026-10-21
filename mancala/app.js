'use strict';
// Luxe Mancala — UI
const E = window.MancalaEngine;
const $ = s => document.querySelector(s);
const SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
function detectLang() { const n = (navigator.language || 'en').toLowerCase().slice(0, 2); return SUPPORTED.includes(n) ? n : 'en'; }
let LANG = detectLang();
function t(k, v) {
  let x = (I18N[LANG] || {})[k];
  if (x === undefined) x = I18N.en[k];
  if (x === undefined) x = I18N.ja[k];
  if (x === undefined) return k;
  if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : '');
  return x;
}
const LV = i => t('lv')[i], LVD = i => t('lvd')[i];
const RULE_ORDER = ['basic', 'easy', 'kalah', 'sunka'];   // 'basic' is shown as "Normal"
function applyI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG;
  document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); });
  $('#langSel').value = LANG;
  document.title = t('meta.title');
  document.querySelectorAll('#segSeeds button').forEach(b => { b.textContent = t('ng.seedsN', { n: b.dataset.v }); });
}

// ====================================================================== state
const STORE = 'aicoding-mancala-v1';
const settings = { mode: 'ai', rules: 'kalah', seeds: 4, color: 0, level: 5, level2: 8, eval: true, anim: true, coach: true, preview: true, sound: true, hint: false, lang: '' };
let game = { rules: 'kalah', seeds: 4, moves: [], human: 0, setup: null };
let P = [];              // positions (engine replay)
let cur = 0;             // number of moves shown
let reviewing = false;
let evals = [];          // evals[i] = {v: margin from player 0's view (seeds), exact}
let anaLists = [];       // anaLists[i] = per-pit analysis of position i (mover's view)
let busyToken = 0, thinking = -1, animating = false, gameOverShown = false;
let lesson = null, puzzle = null, savedGame = null;
let hoverPit = -1;
let HB = null;   // PC header bar (shared/headerbar.js)
const reduceMotion = false /* site rule: animations are never skipped for the OS reduce-motion setting */;
const animOn = () => settings.anim;            // seed-by-seed sowing (with reduced motion the gems step without flying arcs)
const motionOn = () => settings.anim && !reduceMotion;

function startBoard() { return game.setup ? Int8Array.from(game.setup.b) : E.initial(game.seeds); }
function startSide() { return game.setup ? game.setup.side : 0; }
function recompute() {
  const r = E.replay(startBoard(), startSide(), game.moves, game.rules);
  if (r.bad >= 0) game.moves.length = r.bad;
  P = r.positions;
  if (cur > game.moves.length) cur = game.moves.length;
}
const shownPos = () => P[cur];
const isOver = i => P[i === undefined ? cur : i].over;

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!d) return false;
    Object.assign(settings, d.settings || {});
    if (!E.RULES[settings.rules]) settings.rules = 'kalah';
    if (d.game && E.RULES[d.game.rules] && [4, 6].includes(d.game.seeds) && Array.isArray(d.game.moves)) {
      game = { rules: d.game.rules, seeds: d.game.seeds, moves: d.game.moves.filter(x => x >= 0 && x <= 5), human: d.game.human ? 1 : 0, setup: null };
      evals = Array.isArray(d.evals) ? d.evals : [];
      recompute(); cur = game.moves.length;
      gameOverShown = isOver();
      return true;
    }
  } catch (e) {}
  return false;
}
function save() {
  if (lesson || puzzle) { try { const d = JSON.parse(localStorage.getItem(STORE) || '{}'); d.settings = settings; localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {} return; }
  try { localStorage.setItem(STORE, JSON.stringify({ settings, game: { rules: game.rules, seeds: game.seeds, moves: game.moves, human: game.human }, evals: evals.slice(0, game.moves.length + 1) })); } catch (e) {}
}

// ====================================================================== workers
let jobId = 0;
function makeWorker() {
  const w = new Worker('engine.js');
  w.jobs = new Map();
  w.onmessage = e => { const m = e.data, j = w.jobs.get(m.id); if (m.type === 'error') console.warn(m.msg); if (!j) return; w.jobs.delete(m.id); j.resolve(m.type === 'error' ? null : m); };
  w.onerror = e => console.warn('worker', e.message);
  return w;
}
let aiW = makeWorker(), anaW = makeWorker();
function request(which, msg) {
  const w = which === 'ai' ? aiW : anaW;
  return new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve }); w.postMessage({ ...msg, id }); });
}
function cancelWorker(which) {
  const w = which === 'ai' ? aiW : anaW;
  if (!w.jobs.size) return;
  w.terminate(); w.jobs.forEach(j => j.resolve(null));
  if (which === 'ai') aiW = makeWorker(); else anaW = makeWorker();
}
const posMsg = (p, rules) => ({ b: Array.from(p.b), side: p.side, rules });

// ====================================================================== sound
let actx = null;
function ctx() { if (!settings.sound) return null; if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (actx.state === 'suspended') actx.resume(); return actx; }
function tone(a, f, t0, dur, vol, type) {
  const o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(a, t0, dur, vol, freq, q, type) {
  const len = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const n = a.createBufferSource(); n.buffer = buf; const f = a.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1;
  const g = a.createGain(); g.gain.value = vol; n.connect(f).connect(g).connect(a.destination); n.start(t0);
}
let dropN = 0;
function sDrop(store) {   // a gem settling into a wooden cup: soft knock + glassy tick
  const a = ctx(); if (!a) return; const t0 = a.currentTime;
  const f = store ? 150 : 210 + (dropN++ % 5) * 14;
  tone(a, f, t0, 0.09, store ? 0.16 : 0.11);
  noise(a, t0, 0.035, store ? 0.12 : 0.09, store ? 1400 : 2400 + Math.random() * 900, 1.2);
  tone(a, 2200 + Math.random() * 900, t0 + 0.004, 0.06, 0.018, 'triangle');
}
function sPick() { const a = ctx(); if (!a) return; noise(a, a.currentTime, 0.12, 0.07, 900, 0.6, 'lowpass'); }
function sExtra() { const a = ctx(); if (!a) return; const t0 = a.currentTime + 0.02; [659.25, 987.77].forEach((f, i) => { tone(a, f, t0 + i * 0.09, 0.5, 0.11, 'triangle'); tone(a, f * 2, t0 + i * 0.09, 0.25, 0.03); }); }
function sCapture() {
  const a = ctx(); if (!a) return; const t0 = a.currentTime;
  noise(a, t0, 0.35, 0.12, 700, 0.5, 'bandpass');
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(a, f, t0 + 0.08 + i * 0.06, 0.45, 0.1, 'triangle'));
}
function sChime(win) {
  const a = ctx(); if (!a) return; const t0 = a.currentTime + 0.05;
  const notes = win > 0 ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : win === 0 ? [392, 523.25, 659.25] : [392, 349.23, 311.13, 261.63];
  notes.forEach((f, i) => tone(a, f, t0 + i * (win > 0 ? 0.1 : 0.15), 0.7, 0.14, win > 0 ? 'triangle' : 'sine'));
}
function sTick() { const a = ctx(); if (!a) return; tone(a, 880, a.currentTime, 0.08, 0.05, 'triangle'); }
function sWrong() { const a = ctx(); if (!a) return; const t0 = a.currentTime; tone(a, 220, t0, 0.3, 0.12, 'triangle'); tone(a, 185, t0 + 0.12, 0.35, 0.1, 'triangle'); }

// ====================================================================== board geometry
const boardEl = $('#board'), slotsEl = $('#slots'), seedsEl = $('#seeds'), fxEl = $('#fx');
const BW = 9.2, BH = 3.7;
let vert = false, U = 60;
const isStore = i => i === 6 || i === 13;
const ownerOf = i => i <= 6 ? 0 : 1;
const pitIndex = (side, k) => (side ? 7 : 0) + k;
function bottomSide() { return (settings.mode === 'ai' && !lesson && !puzzle) ? game.human : 0; }
function slotUV(i) {
  const B = bottomSide(), own = ownerOf(i), bottom = own === B;
  if (isStore(i)) return { x: bottom ? 8.45 : 0.75, y: 1.85, bottom };
  const k = own ? i - 7 : i;
  return bottom ? { x: 1.85 + 1.1 * k, y: 2.9, bottom } : { x: 7.35 - 1.1 * k, y: 0.8, bottom };
}
// phone portrait: the board is turned a quarter counter-clockwise, so sowing stays counter-clockwise,
// your pits are the right column and your store is at the top
const toPx = (x, y) => vert ? [y * U, (BW - x) * U] : [x * U, y * U];
const offPx = (dx, dy) => vert ? [dy * U, -dx * U] : [dx * U, dy * U];
function slotPx(i) { const p = slotUV(i); return toPx(p.x, p.y); }
let slotEls = [], badgeEls = [], pitNoEls = [], storeLbl = [];
function buildBoard() {
  slotsEl.innerHTML = ''; slotEls = []; badgeEls = []; pitNoEls = [];
  storeLbl = [0, 1].map(() => { const d = document.createElement('div'); d.className = 'slabel'; slotsEl.appendChild(d); return d; });
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('div'); s.className = 'slot ' + (isStore(i) ? 'store' : 'pit'); s.dataset.i = i;
    slotsEl.appendChild(s); slotEls.push(s);
    const b = document.createElement('div'); b.className = 'badge' + (isStore(i) ? ' store' : ''); slotsEl.appendChild(b); badgeEls.push(b);
    if (!isStore(i)) { const n = document.createElement('div'); n.className = 'pitno'; n.textContent = (i % 7) + 1; slotsEl.appendChild(n); pitNoEls.push(n); } else pitNoEls.push(null);
    if (!isStore(i)) {
      s.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setHover(i); });
      s.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') setHover(-1); });
      s.addEventListener('pointerdown', e => { lastPtr = e.pointerType; });
      s.addEventListener('click', () => onPit(i));
    }
  }
}
function layout() {
  vert = matchMedia('(max-aspect-ratio: 1/1) and (pointer: coarse)').matches;
  $('#frame').classList.toggle('vert', vert);
  const nu = vert ? boardEl.clientHeight / BW : boardEl.clientWidth / BW;
  if (!(nu > 4)) { setTimeout(layout, 120); return; }   // not laid out yet (iframe loading, rotation in progress): keep the old size and retry
  U = nu;
  for (let i = 0; i < 14; i++) {
    const p = slotUV(i), [x, y] = toPx(p.x, p.y), s = slotEls[i];
    s.style.left = x + 'px'; s.style.top = y + 'px';
    if (isStore(i)) { const w = 1.1 * U, h = 2.7 * U; s.style.width = (vert ? h : w) + 'px'; s.style.height = (vert ? w : h) + 'px'; }
    else { s.style.width = s.style.height = 0.9 * U + 'px'; }
    badgeEls[i].style.left = x + 'px'; badgeEls[i].style.top = (y + 0.03 * U) + 'px';   // the count sits inside the cup, over the gems
    if (pitNoEls[i]) { const [nx, ny] = toPx(p.x, p.y + (p.bottom ? -0.62 : 0.62)); pitNoEls[i].style.left = nx + 'px'; pitNoEls[i].style.top = ny + 'px'; }
  }
  const [tx, ty] = toPx(4.6, 1.85); const tl = $('#turnLbl'); tl.style.top = ty + 'px';
  [6, 13].forEach((st, j) => { const p = slotUV(st), [lx, ly] = toPx(p.x, 0.26); storeLbl[j].style.left = lx + 'px'; storeLbl[j].style.top = ly + 'px'; storeLbl[j].dataset.st = st; });
  for (let i = 0; i < 14; i++) for (const s of seeds[i]) posSeed(s);
  renderFx();
}

// ====================================================================== gems
const GEMS = [
  ['#ffb3bd', '#d6324b', '#5c0a18'], ['#bfe0ff', '#2f7fd6', '#0b2a5c'], ['#c9ffd9', '#26a65b', '#0a3d20'], ['#ffe9b0', '#e0a526', '#6b4206'],
  ['#e8ccff', '#9152d6', '#35115e'], ['#c4fbff', '#21b4c4', '#07434d'], ['#ffffff', '#d9dde6', '#7c8494'], ['#ffd1b0', '#e2702e', '#6b2a07'],
];
let seeds = Array.from({ length: 14 }, () => []);   // per slot: {el, x, y} (offsets in u, horizontal frame)
let gemRs = 1;
function gemRand() { gemRs = (Math.imul(gemRs, 1103515245) + 12345) & 0x7fffffff; return gemRs / 0x7fffffff; }
function newSeed() {
  const el = document.createElement('div'); el.className = 'seed';
  const g = GEMS[Math.floor(gemRand() * GEMS.length)];
  el.style.setProperty('--c1', g[0]); el.style.setProperty('--c2', g[1]); el.style.setProperty('--c3', g[2]);
  seedsEl.appendChild(el);
  return { el, x: 0, y: 0, slot: -1 };
}
function inside(i, x, y) {
  if (isStore(i)) return [Math.max(-0.4, Math.min(0.4, x)), Math.max(-1.19, Math.min(1.19, y))];
  const R = 0.31, r = Math.hypot(x, y); return r > R ? [x / r * R, y / r * R] : [x, y];
}
// drop a gem into a cup: random landing spot, then a few relaxation passes against the gems already there
function placeIn(i, others) {
  const st = isStore(i), n = others.length + 1;
  const area = st ? 0.8 * 2.38 : Math.PI * 0.31 * 0.31;
  const d = Math.min(0.215, Math.sqrt(area / (n * 0.92)));
  let best = null, bestPen = Infinity;
  for (let tr = 0; tr < 5; tr++) {
    let x, y;
    if (st) { x = (gemRand() - 0.5) * 0.8; y = (gemRand() - 0.5) * 2.3; } else { const a = gemRand() * Math.PI * 2, r = Math.sqrt(gemRand()) * 0.28; x = Math.cos(a) * r; y = Math.sin(a) * r; }
    for (let it = 0; it < 14; it++) {
      for (const o of others) {
        const dx = x - o.x, dy = y - o.y, dd = Math.hypot(dx, dy);
        if (dd < d) { const p = (d - dd) * 0.6 / (dd || 1); x += dx * p; y += dy * p; if (!dd) { x += (gemRand() - 0.5) * 0.05; } }
      }
      if (!st) { x *= 0.995; y *= 0.995; } else { y += 0.01; }   // gentle settle toward the bottom of the cup
      [x, y] = inside(i, x, y);
    }
    let pen = 0; for (const o of others) { const dd = Math.hypot(x - o.x, y - o.y); if (dd < d) pen += d - dd; }
    if (pen < bestPen) { bestPen = pen; best = [x, y]; if (pen < 1e-3) break; }
  }
  return best;
}
function seedXY(s) { const [cx, cy] = slotPx(s.slot), [ox, oy] = offPx(s.x, s.y); return [cx + ox, cy + oy]; }
function posSeed(s) {
  const [x, y] = seedXY(s);
  s.el.style.transform = `translate(${x}px,${y}px)`;
  s.el.style.zIndex = 100 + Math.round((vert ? -s.x : s.y) * 100) + 200;
}
function addSeedTo(i, s) { const [x, y] = placeIn(i, seeds[i]); s.x = x; s.y = y; s.slot = i; seeds[i].push(s); }
// make the gems match a board without animation (keeps the gems that are already in place)
function syncSeeds(b) {
  const pool = [];
  for (let i = 0; i < 14; i++) while (seeds[i].length > b[i]) pool.push(seeds[i].pop());
  for (let i = 0; i < 14; i++) while (seeds[i].length < b[i]) { const s = pool.pop() || newSeed(); addSeedTo(i, s); posSeed(s); }
  for (const s of pool) s.el.remove();
  setBadges(b);
}
function resetSeeds() { stopPhysics(); for (let i = 0; i < 14; i++) { for (const s of seeds[i]) s.el.remove(); seeds[i] = []; } gemRs = 7; }
let shownCounts = new Int8Array(14);
function setBadges(b, popAt) {
  for (let i = 0; i < 14; i++) {
    const el = badgeEls[i]; if (!el) continue;
    if (el.textContent !== String(b[i])) el.textContent = b[i];
    el.classList.toggle('zero', b[i] === 0);
    shownCounts[i] = b[i];
  }
  if (popAt >= 0) { const el = badgeEls[popAt]; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  renderPlates(b);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
// cancellable pause used by the move animation: skipAnim()/stopAnim() wake every sleeper at once
let wakers = new Set();
function nap(ms) { return new Promise(r => { const f = () => { clearTimeout(tm); wakers.delete(f); r(); }; const tm = setTimeout(f, ms); wakers.add(f); }); }
function fly(s, to, dur, lift, opt) {
  const [x0, y0] = seedXY(s);
  if (to.slot !== undefined) { s.slot = to.slot; s.x = to.x; s.y = to.y; s.vx = 0; s.vy = 0; }
  const [x1, y1] = seedXY(s);
  if (!s.el.animate) { posSeed(s); return; }
  s.el.classList.add('fly'); if (opt && opt.cap) s.el.classList.add('capfly');
  const done = () => { s.el.classList.remove('fly', 'capfly'); posSeed(s); };
  let kf;
  if (!motionOn()) {   // reduced motion: a short straight glide, no hop
    kf = [{ transform: `translate(${x0}px,${y0}px)` }, { transform: `translate(${x1}px,${y1}px)` }];
    dur = Math.min(dur, 220);
  } else {
    let mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const h = (lift || 0.85) * U;
    if (vert) {
      // upright board: the arc bulges sideways, away from the middle of the board
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1; let nx = -dy / L, ny = dx / L;
      const cx = boardEl.clientWidth / 2; if ((mx - cx) * nx < 0) { nx = -nx; ny = -ny; }
      mx += nx * h * 0.75; my += ny * h * 0.75 - h * 0.3;
    } else my -= h;
    const up = opt && opt.cap ? 1.75 : 1.6;
    kf = [
      { transform: `translate(${x0}px,${y0}px) scale(1)`, easing: 'cubic-bezier(.25,0,.45,1)' },
      { transform: `translate(${(x0 + mx) / 2}px,${(y0 + my) / 2 - h * 0.18}px) scale(${(1 + up) / 2})`, offset: 0.25, easing: 'linear' },
      { transform: `translate(${mx}px,${my}px) scale(${up})`, offset: 0.48, easing: 'cubic-bezier(.55,0,.8,.9)' },
      { transform: `translate(${x1}px,${y1}px) scale(.82,.9)`, offset: 0.78, easing: 'cubic-bezier(.2,.8,.3,1.2)' },   // bouncy landing
      { transform: `translate(${x1}px,${y1 - 0.06 * U}px) scale(1.1)`, offset: 0.9 },
      { transform: `translate(${x1}px,${y1}px) scale(1)` }];
    // a fading trail of ghost gems behind the flying one
    [0.07, 0.14, 0.21].forEach((d, j) => {
      const g = s.el.cloneNode(false); g.className = 'seed ghost'; g.style.cssText = s.el.style.cssText; g.style.opacity = String(0.42 - j * 0.12);
      seedsEl.appendChild(g);
      const a = g.animate(kf.slice(0, 4), { duration: dur * 0.78, delay: dur * d, fill: 'backwards' });
      a.onfinish = () => g.remove(); a.oncancel = () => g.remove();
    });
    setTimeout(() => splash(s.slot), dur * 0.78);
  }
  const a = s.el.animate(kf, { duration: dur });
  s.el.style.transform = `translate(${x1}px,${y1}px)`;
  a.onfinish = done; a.oncancel = done;
}
// a little ripple in the cup where a gem lands
function splash(at) {
  if (!motionOn() || at < 0 || !U) return;
  const [x, y] = slotPx(at), st = isStore(at), d = document.createElement('div');
  d.className = 'splash' + (st ? ' store' : '');
  const w = st ? 1.0 * U : 0.8 * U, h = st ? 2.5 * U : 0.8 * U;
  d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.width = (vert && st ? h : w) + 'px'; d.style.height = (vert && st ? w : h) + 'px';
  boardEl.appendChild(d); setTimeout(() => d.remove(), 700);
}
// the "hand": a glowing ring that travels pit by pit with the number of seeds still to sow
const handEl = document.createElement('div'); handEl.className = 'hand'; handEl.innerHTML = '<b></b>'; boardEl.appendChild(handEl);
function handAt(at, n, cls) {
  const [x, y] = slotPx(at), st = isStore(at), w = st ? 1.22 * U : 1.02 * U, h = st ? 2.82 * U : 1.02 * U;
  handEl.style.left = x + 'px'; handEl.style.top = y + 'px';
  handEl.style.width = (vert && st ? h : w) + 'px'; handEl.style.height = (vert && st ? w : h) + 'px';
  handEl.className = 'hand show' + (st ? ' store' : '') + (cls ? ' ' + cls : '');
  if (motionOn()) { void handEl.offsetWidth; handEl.classList.add('pulse'); }
  handEl.firstChild.textContent = n > 0 ? '×' + n : '';
}
function handHide() { handEl.className = 'hand'; }
let animTok = 0;
// animate one move from board b (side to move `side`, pit k): seed by seed sowing, relays, captures, final sweep
async function animateMove(b, side, k, rules) {
  const tr = E.trace(b, side, k, rules);
  lastAnimBoard = tr.board;
  stopPhysics();
  const tok = ++animTok;
  if (!animOn()) { syncSeeds(tr.board); sDrop(false); return tr; }
  animating = true; boardEl.classList.add('animating');
  const counts = Int8Array.from(b), total = tr.events.filter(e => e.t === 'drop').length;
  // ~300 ms per seed, quicker for very long sows (relays can move dozens of seeds)
  const step = total <= 8 ? 400 : Math.max(200, 400 - (total - 8) * 10), dur = Math.round(step * 1.35);
  let hand = [];
  try {
    for (const ev of tr.events) {
      if (tok !== animTok) break;
      if (ev.t === 'pick') {
        hand = seeds[ev.at].splice(0);
        counts[ev.at] = 0; setBadges(counts);
        handAt(ev.at, hand.length, ev.relay ? 'relay' : '');
        if (ev.relay) relayFx(ev.at);
        sPick();
        await nap(ev.relay ? step * 1.8 : step * 1.1);
      } else if (ev.t === 'drop') {
        const s = hand.shift() || newSeed();
        const [x, y] = placeIn(ev.at, seeds[ev.at]); seeds[ev.at].push(s);
        handAt(ev.at, hand.length, '');
        fly(s, { slot: ev.at, x, y }, dur, isStore(ev.at) ? 1.0 : 0.85);
        const at = ev.at;
        setTimeout(() => { if (tok !== animTok) return; counts[at]++; setBadges(counts, at); sDrop(isStore(at)); }, motionOn() ? dur * 0.78 : 0);
        await nap(step);
      } else if (ev.t === 'cap') {
        await nap(dur);
        if (tok !== animTok) break;
        // capture: both pits light up, then the seeds fly together into the store
        capFx(ev.from); if (ev.own >= 0) capFx(ev.own);
        handAt(ev.to, 0, 'cap');
        showBanner(t('bn.capture'), '+' + (ev.n + (ev.own >= 0 ? 1 : 0)), 'cap'); sCapture();
        await nap(650);
        if (tok !== animTok) break;
        const got = seeds[ev.from].splice(0).concat(ev.own >= 0 ? seeds[ev.own].splice(0) : []);
        counts[ev.from] = 0; if (ev.own >= 0) counts[ev.own] = 0; setBadges(counts);
        got.forEach((s, j) => { const [x, y] = placeIn(ev.to, seeds[ev.to]); seeds[ev.to].push(s); setTimeout(() => { if (tok === animTok) fly(s, { slot: ev.to, x, y }, 1100, 1.7, { cap: true }); }, j * 110); });
        await nap(1150 + got.length * 110);
        if (tok !== animTok) break;
        counts[ev.to] += got.length; setBadges(counts, ev.to);
      } else if (ev.t === 'sweep') {
        await nap(dur);
        if (tok !== animTok) break;
        handHide();
        const moving = [];
        for (let i = 0; i < 14; i++) if (!isStore(i) && seeds[i].length) { const to = ownerOf(i) ? 13 : 6; for (const s of seeds[i].splice(0)) moving.push([s, to]); counts[i] = 0; }
        setBadges(counts);
        moving.forEach(([s, to], j) => { const [x, y] = placeIn(to, seeds[to]); seeds[to].push(s); setTimeout(() => { if (tok === animTok) fly(s, { slot: to, x, y }, 800, 0.7); }, j * 40); });
        await nap(850 + moving.length * 40);
      }
    }
    if (tok === animTok) {
      if (tr.extra && !tr.over) { handAt(tr.land, 0, 'extra'); showBanner(t('bn.extra'), '', ''); sExtra(); await nap(motionOn() ? 900 : 500); }
      else await nap(dur);
    }
  } finally {
    if (tok === animTok) { animating = false; boardEl.classList.remove('animating'); handHide(); syncSeeds(tr.board); }
  }
  return tr;
}
// end the running sowing animation at once (tap on the board, undo, navigation…)
function stopAnim() {
  animTok++; animating = false; boardEl.classList.remove('animating'); handHide();
  wakers.forEach(f => f()); wakers.clear();
  for (let i = 0; i < 14; i++) for (const s of seeds[i]) if (s.el.getAnimations) s.el.getAnimations().forEach(a => a.finish());
}
let skippedAt = 0;
function skipAnim() { if (!animating) return; skippedAt = performance.now(); stopAnim(); if (P.length) syncSeeds(lastAnimBoard || shownPos().b); }
let lastAnimBoard = null;
$('#frame').addEventListener('pointerdown', e => { if (animating) { e.preventDefault(); skipAnim(); } }, true);
function relayFx(at) {
  if (!animOn()) return;
  const [x, y] = slotPx(at), d = document.createElement('div'); d.className = 'ring'; d.style.cssText = `left:${x}px;top:${y}px;width:${0.95 * U}px;height:${0.95 * U}px;border-color:#7fc8ff;transition:opacity .6s`;
  fxEl.appendChild(d); setTimeout(() => { d.style.opacity = 0; }, 450); setTimeout(() => d.remove(), 1100);
}
function capFx(at) {
  const [x, y] = slotPx(at), d = document.createElement('div'); d.className = 'ring cap'; d.style.cssText = `left:${x}px;top:${y}px;width:${0.98 * U}px;height:${0.98 * U}px;transition:opacity .6s`;
  fxEl.appendChild(d); setTimeout(() => { d.style.opacity = 0; }, 1100); setTimeout(() => d.remove(), 1800);
}
let bannerTimer = 0;
function showBanner(text, sub, cls) {
  if (!settings.anim) return;
  if (!motionOn()) { toast(text + (sub ? ' ' + sub : ''), 900); return; }
  const b = $('#banner'); b.className = 'banner ' + (cls || ''); b.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
  void b.offsetWidth; b.classList.add('show');
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => b.classList.remove('show'), 1300);
}

// ====================================================================== gems roll when brushed (mouse over a pit, or a finger sliding across)
// Each touched cup gets a tiny 2-D simulation: the brush gives nearby gems a push, then they roll with friction,
// bounce off each other and off the cup wall (a circle for pits, a pill for stores) and come to rest.
let lastBrush = null;
const physSlots = new Set();
let physRAF = 0, physLast = 0;
function slotAtPx(bx, by) {
  for (let i = 0; i < 14; i++) {
    const [cx, cy] = slotPx(i), ox = bx - cx, oy = by - cy;
    const lx = vert ? -oy / U : ox / U, ly = vert ? ox / U : oy / U;   // offset in the horizontal frame
    if (isStore(i) ? (Math.abs(lx) < 0.56 && Math.abs(ly) < 1.36) : Math.hypot(lx, ly) < 0.47) return { i, lx, ly };
  }
  return null;
}
function brushAt(x, y, now) {
  if (!motionOn() || animating || !U) { lastBrush = null; return; }
  const r = boardEl.getBoundingClientRect(), bx = x - r.left, by = y - r.top;
  const prev = lastBrush; lastBrush = { x: bx, y: by, t: now };
  if (!prev || now - prev.t > 120 || now === prev.t) return;
  const dt = (now - prev.t) / 1000;
  let vx = (bx - prev.x) / U / dt, vy = (by - prev.y) / U / dt;      // u per second, screen frame
  if (vert) { const hx = -vy, hy = vx; vx = hx; vy = hy; }           // to the horizontal frame
  const sp = Math.hypot(vx, vy); if (sp < 0.15) return;
  if (sp > 6) { vx *= 6 / sp; vy *= 6 / sp; }
  const hit = slotAtPx(bx, by); if (!hit) return;
  let touched = false;
  for (const s of seeds[hit.i]) {
    if (s.el.classList.contains('fly')) continue;
    const dx = s.x - hit.lx, dy = s.y - hit.ly, d = Math.hypot(dx, dy);
    if (d > 0.24) continue;
    const k = 1 - d / 0.24;
    s.vx = (s.vx || 0) + vx * 0.5 * k + (dx / (d || 1)) * 0.6 * k;
    s.vy = (s.vy || 0) + vy * 0.5 * k + (dy / (d || 1)) * 0.6 * k;
    touched = true;
  }
  if (touched) { physSlots.add(hit.i); if (!physRAF) { physLast = performance.now(); physRAF = requestAnimationFrame(physStep); } }
}
function physStep(now) {
  const dt = Math.min(0.033, (now - physLast) / 1000); physLast = now;
  for (const i of [...physSlots]) {
    const list = seeds[i], st = isStore(i), n = list.length;
    const d = Math.min(0.215, Math.sqrt((st ? 0.8 * 2.38 : Math.PI * 0.31 * 0.31) / (Math.max(1, n) * 0.92)));
    let moving = false;
    for (const s of list) {
      s.vx = s.vx || 0; s.vy = s.vy || 0;
      // carved bowl: a gentle pull toward the centre, rolling friction
      if (!st) { s.vx -= s.x * 2.2 * dt; s.vy -= s.y * 2.2 * dt; }
      const f = Math.exp(-2.6 * dt); s.vx *= f; s.vy *= f;
      s.x += s.vx * dt; s.y += s.vy * dt;
    }
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {   // gem-to-gem collisions
      const A = list[a], B = list[b], dx = B.x - A.x, dy = B.y - A.y, dd = Math.hypot(dx, dy);
      if (dd >= d || dd === 0) continue;
      const nx = dx / dd, ny = dy / dd, ov = (d - dd) / 2;
      A.x -= nx * ov; A.y -= ny * ov; B.x += nx * ov; B.y += ny * ov;
      const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
      if (rv < 0) { const j = -0.85 * rv; A.vx -= j * nx; A.vy -= j * ny; B.vx += j * nx; B.vy += j * ny; }
    }
    for (const s of list) {                                          // the wall of the cup
      if (st) {
        if (Math.abs(s.x) > 0.4) { s.x = Math.sign(s.x) * 0.4; s.vx *= -0.45; }
        if (Math.abs(s.y) > 1.19) { s.y = Math.sign(s.y) * 1.19; s.vy *= -0.45; }
      } else {
        const r = Math.hypot(s.x, s.y);
        if (r > 0.31) { const nx = s.x / r, ny = s.y / r; s.x = nx * 0.31; s.y = ny * 0.31; const vn = s.vx * nx + s.vy * ny; if (vn > 0) { s.vx -= 1.5 * vn * nx; s.vy -= 1.5 * vn * ny; } }
      }
      if (Math.hypot(s.vx, s.vy) > 0.02) moving = true; else { s.vx = 0; s.vy = 0; }
      posSeed(s);
    }
    if (!moving) physSlots.delete(i);
  }
  physRAF = physSlots.size ? requestAnimationFrame(physStep) : 0;
}
function stopPhysics() { physSlots.clear(); if (physRAF) cancelAnimationFrame(physRAF); physRAF = 0; for (let i = 0; i < 14; i++) for (const s of seeds[i]) { s.vx = 0; s.vy = 0; } }
boardEl.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') brushAt(e.clientX, e.clientY, performance.now()); });
boardEl.addEventListener('pointerleave', () => { lastBrush = null; });
// touchmove keeps firing while the page scrolls, so a finger sliding over the cups rolls the gems without blocking scrolling
boardEl.addEventListener('touchmove', e => { const tc = e.touches[0]; if (tc) brushAt(tc.clientX, tc.clientY, performance.now()); }, { passive: true });
boardEl.addEventListener('touchend', () => { lastBrush = null; }, { passive: true });

// ====================================================================== fx: preview, hints, lesson marks
let fxMarks = [];   // [{at, cls, label}]
function fxRing(at, cls) {
  const [x, y] = slotPx(at), st = isStore(at), d = document.createElement('div');
  d.className = 'ring' + (st ? ' store' : '') + (cls ? ' ' + cls : '');
  const w = st ? 1.2 * U : 1.0 * U, h = st ? 2.8 * U : 1.0 * U;
  d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.width = (vert && st ? h : w) + 'px'; d.style.height = (vert && st ? w : h) + 'px';
  fxEl.appendChild(d); return d;
}
function fxAt(at, dx, dy, cls, html) {
  const p = slotUV(at), [x, y] = toPx(p.x + dx, p.y + dy), d = document.createElement('div');
  d.className = cls; d.innerHTML = html; d.style.left = x + 'px'; d.style.top = y + 'px'; fxEl.appendChild(d); return d;
}
const fmtV = (v, exact) => { const r = exact ? Math.round(v) : Math.round(v * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); };
function renderFx() {
  fxEl.innerHTML = '';
  if (!P.length) return;
  const p = shownPos();
  for (const m of fxMarks) { if (m.ring) fxRing(m.at, m.cls); if (m.label) fxAt(m.at, 0, m.dy || -0.3, 'hintlbl' + (m.lcls ? ' ' + m.lcls : ''), m.label); }
  if (drawReviewFx()) return;
  // hint labels (per-pit predicted final margin for the side to move)
  if (settings.hint && !lesson && !puzzle && !p.over && anaLists[cur] && canHumanPlay()) {
    const list = anaLists[cur]; let best = -1e9; for (const x of list) best = Math.max(best, x.v);
    for (const x of list) { const i = pitIndex(p.side, x.m), u = slotUV(i); fxAt(i, 0, u.bottom ? -0.36 : 0.36, 'hintlbl' + (x.v >= best - 1e-9 ? ' best' : '') + (x.v < 0 ? ' neg' : ''), fmtV(x.v, x.exact)); }
  }
  if (hoverPit >= 0) drawPreview(hoverPit);
}
function previewAllowed() { if (lesson) return lesson.i === 0 || lesson.hinted; if (puzzle) return false; return settings.preview; }
function drawPreview(i) {
  const p = shownPos(); if (p.over || !canHumanPlay() || ownerOf(i) !== p.side || !p.b[i]) return;
  const tr = E.trace(p.b, p.side, i % 7, game.rules);
  const cnt = new Map(), relays = [];
  for (const ev of tr.events) { if (ev.t === 'drop') cnt.set(ev.at, (cnt.get(ev.at) || 0) + 1); if (ev.t === 'pick' && ev.relay) relays.push(ev.at); }
  for (const [at, n] of cnt) { const u = slotUV(at); fxAt(at, isStore(at) ? 0 : 0.33, isStore(at) ? (u.bottom ? 1.05 : -1.05) : (u.bottom ? -0.3 : 0.3), 'chip', '+' + n); }
  relays.forEach((at, j) => fxAt(at, -0.3, 0.3, 'chip relay', '↻' + (j + 1)));
  const tipAt = (at, cls, txt) => { const u = slotUV(at); if (isStore(at)) return fxAt(at, vert ? (u.bottom ? -1.55 : 1.55) : 0, vert ? 0 : -0.2, cls, txt); return fxAt(at, 0, u.bottom ? -0.52 : 0.52, cls + (u.bottom ? '' : ' below'), txt); };
  if (tr.over) { fxRing(tr.land, ''); tipAt(tr.land, 'tip plain', t('pv.end')); return; }
  fxRing(tr.land, tr.extra ? 'ok' : tr.cap ? '' : '');
  const u = slotUV(tr.land);
  if (tr.extra) tipAt(tr.land, 'tip', t('pv.extra'));
  else if (tr.cap) { fxRing(tr.capFrom, 'cap'); tipAt(tr.land, 'tip cap', t('pv.cap', { n: tr.cap + (E.RULES[game.rules].cap === 2 ? 1 : 0) })); }
}
function setHover(i) {
  hoverPit = i;
  slotEls.forEach((s, j) => s.classList.toggle('hov', j === i));
  if (!previewAllowed() && i >= 0) { hoverPit = -1; renderFx(); hoverPit = i; return; }
  renderFx();
}

// ====================================================================== players / panel
function isAISide(s) { if (lesson || puzzle) return false; return settings.mode === 'watch' || (settings.mode === 'ai' && s !== game.human); }
function levelFor(s) { return settings.mode === 'watch' ? (s === 0 ? settings.level : settings.level2) : settings.level; }
function canHumanPlay() {
  const p = shownPos(); if (!p || p.over || animating) return false;
  if (lesson) return !lesson.answered && p.side === 0;
  if (puzzle) return puzzle.state === 'play' && !puzzle.busy && p.side === 0;
  if (reviewing) return false;
  return !isAISide(p.side) && thinking < 0;
}
function sideName(s) {
  if (lesson || puzzle) return s === 0 ? t('you') : (puzzle && puzzle.P.kind === 'end' ? t('defender') : t('opp'));
  if (settings.mode === 'ai') return s === game.human ? t('you') : `AI ${LV(settings.level)}`;
  if (settings.mode === 'watch') return `AI ${LV(levelFor(s))}`;
  return t(s === 0 ? 'p0' : 'p1');
}
function shortName(s) {
  if (settings.mode === 'ai' && !lesson && !puzzle) return s === game.human ? t('you') : 'AI';
  return t(s === 0 ? 'p0' : 'p1');
}
const ICON_P = '<svg viewBox="0 0 24 24"><circle cx="12" cy="7.6" r="4.4"/><path d="M3.6 21.4c0-5 3.8-8 8.4-8s8.4 3 8.4 8z"/></svg>';
const ICON_R = '<svg viewBox="0 0 24 24"><rect x="11" y="1.6" width="2" height="3.6"/><circle cx="12" cy="2" r="1.7"/><path fill-rule="evenodd" d="M7.6 5h8.8A3.6 3.6 0 0 1 20 8.6v6.2a3.6 3.6 0 0 1-3.6 3.6H7.6A3.6 3.6 0 0 1 4 14.8V8.6A3.6 3.6 0 0 1 7.6 5zM9 9.3a1.9 1.9 0 1 0 0 3.8a1.9 1.9 0 1 0 0-3.8zM15 9.3a1.9 1.9 0 1 0 0 3.8a1.9 1.9 0 1 0 0-3.8z"/><rect x="6.5" y="19.6" width="11" height="2.8" rx="1.2"/></svg>';
function renderPlates(b) {
  const p = shownPos(); if (!p) return;
  b = b || p.b;
  const B = bottomSide();
  // phone portrait: your store is at the top, so your plate goes above the board
  (vert ? [['Top', B], ['Bot', 1 - B]] : [['Bot', B], ['Top', 1 - B]]).forEach(([w, s]) => {
    const pl = $('#plate' + w);
    $('#disc' + w).className = 'pdisc p' + s;
    const ai = isAISide(s) || (puzzle && s === 1); const icon = ai ? 'R' : 'P';
    if ($('#disc' + w).dataset.k !== icon) { $('#disc' + w).innerHTML = ai ? ICON_R : ICON_P; $('#disc' + w).dataset.k = icon; }
    $('#name' + w).textContent = sideName(s) + (settings.mode === 'pvp' || lesson || puzzle ? '' : ' · ' + t(s === 0 ? 'p0' : 'p1'));
    const sc = $('#score' + w), v = String(b[E.storeOf(s)]);
    if (sc.textContent !== v) { sc.textContent = v; pl.classList.remove('bump'); void pl.offsetWidth; pl.classList.add('bump'); }
    const active = !p.over && p.side === s && !animating;
    pl.classList.toggle('active', !p.over && p.side === s);
    pl.classList.toggle('thinking', thinking === s);
    let st = '';
    if (thinking === s) st = t('thinking');
    else if (p.over) { const a = p.b[E.storeOf(s)], o = p.b[E.storeOf(1 - s)]; st = a > o ? t('st.win') : a === o ? t('st.draw') : ''; }
    else if (active && cur > 0 && P[cur].mv && P[cur].mv.extra && P[cur].mv.side === s) st = t('st.again');
    else if (active) st = t('st.turn');
    $('#stat' + w).textContent = st;
  });
}
function renderStoreLabels() {
  if (!storeLbl.length) return;
  for (const d of storeLbl) { const st = +d.dataset.st, side = st === 6 ? 0 : 1; d.textContent = shortName(side); d.classList.toggle('me', !puzzle && !lesson ? (settings.mode === 'ai' ? side === game.human : side === 0) : side === 0); }
}
function renderTurnLabel() {
  renderStoreLabels();
  const p = shownPos(), el = $('#turnLbl');
  let txt = '';
  if (p.over) { const a = p.b[6], o = p.b[13]; txt = a === o ? t('res.draw') : (settings.mode === 'ai' && !lesson && !puzzle) ? ((a > o ? 0 : 1) === game.human ? t('res.youWin') : t('res.aiWin')) : t('res.pWin', { c: shortName(a > o ? 0 : 1) }); }
  else if (thinking >= 0) txt = t('turn.thinking');
  else if (lesson || puzzle) txt = p.side === 0 ? t('turn.you') : t('turn.opp');
  else if (settings.mode === 'ai') txt = p.side === game.human ? t('turn.you') : t('turn.ai');
  else txt = t('turn.p', { c: shortName(p.side) });
  el.textContent = txt;
  el.className = 'turnlbl ' + (['en', 'es', 'fr', 'pt', 'de'].includes(LANG) ? 'script' : ['ja', 'zh', 'ko'].includes(LANG) ? 'mincho' : '');
}
function renderPits() {
  const can = canHumanPlay(), p = shownPos();
  for (let i = 0; i < 14; i++) if (!isStore(i)) slotEls[i].classList.toggle('can', can && ownerOf(i) === p.side && p.b[i] > 0);
}
function evalOf(i) {
  const p = P[i]; if (!p) return null;
  if (p.over) return { v: p.b[6] - p.b[13], exact: true, final: true };
  return evals[i] || null;
}
function evalText(ev) {
  if (!ev) return '—';
  const v = ev.v, side = v > 0 ? 0 : 1, n = shortName(side);
  if (ev.final) return Math.round(v) === 0 ? t('res.draw') : t('ev.won', { c: n, n: Math.abs(Math.round(v)) });
  if (ev.exact) return Math.round(v) === 0 ? t('ev.drawExact') : t('ev.exact', { c: n, n: Math.abs(Math.round(v)) });
  const a = Math.abs(v);
  return a < 0.5 ? t('ev.even') : t(a < 3 ? 'ev.slight' : a < 8 ? 'ev.adv' : 'ev.sup', { c: n, n: (Math.round(a * 10) / 10).toFixed(1) });
}
const sq = v => Math.tanh(v / 10);
function renderInfo() {
  if (!P.length) return;
  const p = shownPos();
  renderPlates(); renderTurnLabel(); renderPits();
  let ev = evalOf(cur); if (!ev && cur > 0) ev = evalOf(cur - 1);
  if (!settings.eval && !(rv && rvOpen) && !(ev && ev.final)) ev = null;
  $('#evalText').textContent = evalText(ev);
  $('#evalFill').style.width = (50 + 50 * (ev ? sq(ev.v) : 0)) + '%';
  renderGraph(); renderKifu();
  $('#btnUndo').disabled = !canUndo();
  $('#btnHint').classList.toggle('on', settings.hint);
  $('#btnHint').disabled = settings.mode === 'watch';
  $('#btnSound').classList.toggle('on', settings.sound);
  $('#btnShare').disabled = !game.moves.length;
  $('#btnAnalyze').disabled = !game.moves.length;
  renderReview();
  const nav = $('#navBar'); nav.querySelector('[data-n=first]').disabled = nav.querySelector('[data-n=prev]').disabled = cur === 0;
  nav.querySelector('[data-n=next]').disabled = nav.querySelector('[data-n=last]').disabled = cur >= game.moves.length;
  const mode = settings.mode === 'ai' ? `AI Lv.${settings.level} ${LV(settings.level)}` : settings.mode === 'watch' ? `Lv.${settings.level} vs Lv.${settings.level2}` : t('ng.pvp');
  $('#infoLine').textContent = `${t('rule.' + game.rules)} · ${t('ng.seedsN', { n: game.seeds })} · ${mode} · ${t('info.moves', { n: game.moves.length })}`;
  hbInfo(p, ev);
}
// PC header bar: whose turn, store counts, evaluation (only when it is shown on the board), rules and moves
function hbInfo(p, ev) {
  if (!HB || !HB.on) return;
  const e = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let h = `<span class="hb-chip hb-turn"><i class="pdisc p${p.over ? (p.b[6] >= p.b[13] ? 0 : 1) : p.side}"></i><b>${e($('#turnLbl').textContent)}</b></span>`;
  h += `<span class="hb-chip"><i class="pdisc p0"></i><b>${p.b[6]}</b> – <b>${p.b[13]}</b><i class="pdisc p1"></i></span>`;
  if (ev && !lesson && !puzzle) h += `<span class="hb-chip hb-ev" title="${e(t('eval'))}"><b>${e(evalText(ev))}</b></span>`;
  if (puzzle && puzzle.state === 'play' && puzzle.N > 1) h += `<span class="hb-chip"><b>${e(PZBook.t('movesLeft', { n: pzLeft(puzzle) }))}</b></span>`;
  if (!lesson && !puzzle) h += `<span class="hb-chip hb-mv">${e(t('info.moves', { n: cur }))}</span>`;
  h += `<span class="hb-chip hb-rule">${e(t('rule.' + (puzzle ? puzzle.P.rules : game.rules)))}</span>`;
  HB.setInfo(h);
}
function renderGraph() {
  const svg = $('#graph'), W = 300, H = 74, N = game.moves.length, n = Math.max(N + 1, 24);
  const pts = []; let last = 0;
  for (let i = 0; i <= N; i++) { const e = evalOf(i); let v = e ? sq(e.v) : last; last = v; pts.push([i / (n - 1) * W, H / 2 - v * (H / 2 - 4)]); }
  const path = 'M' + pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join('L');
  const area = path + `L${pts[pts.length - 1][0].toFixed(1)},${H / 2}L0,${H / 2}Z`;
  const cx = cur / (n - 1) * W;
  svg.innerHTML = `<defs><clipPath id="ctop"><rect x="0" y="0" width="${W}" height="${H / 2}"/></clipPath><clipPath id="cbot"><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}"/></clipPath></defs>
    <path d="${area}" fill="rgba(229,195,108,.45)" clip-path="url(#ctop)"/><path d="${area}" fill="rgba(200,206,214,.38)" clip-path="url(#cbot)"/>
    <line class="zero" vector-effect="non-scaling-stroke" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/>
    <path d="${path}" fill="none" stroke="rgba(240,230,200,.85)" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
    <line class="cur" x1="${cx}" x2="${cx}" y1="0" y2="${H}" vector-effect="non-scaling-stroke"/>`;
}
const mvLabel = mv => `${mv.k + 1}`;
function renderKifu() {
  const k = $('#kifu');
  if (!game.moves.length) { k.innerHTML = `<div class="empty">${t('kifu.empty')}</div>`; return; }
  let html = '';
  for (let i = 1; i < P.length; i++) {
    const mv = P[i].mv, j = rvOpen && rv && !rv.running ? rvJudge(i - 1) : null;
    const q = j && (j.q === 'bad' || j.q === 'dubious') ? ' q-' + j.q : '';
    const sup = mv.extra ? '<sup>+</sup>' : mv.cap ? `<sup class="c">×${mv.cap}</sup>` : '';
    html += `<button data-i="${i}" class="${i === cur ? 'cur' : ''}${q}" title="${i}${j && j.q ? ' ' + t('q.' + j.q) : ''}"><i class="p${mv.side}"></i>${mvLabel(mv)}${sup}</button>`;
  }
  k.innerHTML = html;
  const c = k.querySelector('.cur'); if (c) { const top = c.offsetTop - k.offsetTop; if (top < k.scrollTop || top > k.scrollTop + k.clientHeight - 24) k.scrollTop = top - k.clientHeight / 2; }
}
$('#kifu').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
(() => {
  const g = $('#graph'); let dragging = false;
  const idxAt = x => { const r = g.getBoundingClientRect(), n = Math.max(game.moves.length + 1, 24); return Math.max(0, Math.min(game.moves.length, Math.round((x - r.left) / r.width * (n - 1)))); };
  const go = x => { const i = idxAt(x); if (i !== cur) viewAt(i); };
  g.addEventListener('pointerdown', e => { if (lesson || puzzle) return; dragging = true; stopPlay(); try { g.setPointerCapture(e.pointerId); } catch (_) {} go(e.clientX); e.preventDefault(); });
  g.addEventListener('pointermove', e => { if (dragging) go(e.clientX); });
  const end = e => { dragging = false; try { g.releasePointerCapture(e.pointerId); } catch (_) {} };
  g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
})();
let toastTimer = 0, coachTimer = 0;
function toast(msg, ms = 1500) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms); }
function coach(msg, cls, ms = 2400) { const el = $('#coach'); el.textContent = msg; el.className = 'coach show ' + (cls || ''); clearTimeout(coachTimer); coachTimer = setTimeout(() => el.classList.remove('show'), ms); }
// full redraw of the shown position (no animation)
function update() {
  armedPit = -1; hoverPit = -1; slotEls.forEach(s => s.classList.remove('hov'));
  syncSeeds(shownPos().b);
  renderInfo(); renderFx();
}

// ====================================================================== flow
function newGame() {
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = -1; stopAnim(); stopPlay();
  rvCancel(); rv = null; rvOpen = false;
  const human = settings.color === -1 ? (Math.random() < 0.5 ? 0 : 1) : settings.color;
  game = { rules: settings.rules, seeds: settings.seeds, moves: [], human, setup: null };
  recompute(); cur = 0; reviewing = false; evals = []; anaLists = []; gameOverShown = false; fxMarks = [];
  $('#resultOverlay').classList.remove('show');
  resetSeeds(); layout(); update(); save();
  afterPosition();
}
// touch: the first tap on a pit previews the move (landing pit, counts, capture / extra turn), a second tap plays it
let lastPtr = 'mouse', armedPit = -1;
function disarm() { if (armedPit >= 0) { armedPit = -1; setHover(-1); } }
document.addEventListener('pointerdown', e => { if (armedPit >= 0 && !(e.target.closest && e.target.closest('.slot.pit'))) disarm(); }, true);
function onPit(i) {
  ctx();
  if (performance.now() - skippedAt < 450) return;
  if (lastPtr === 'touch' && canHumanPlay() && ownerOf(i) === shownPos().side && shownPos().b[i] && armedPit !== i) {
    armedPit = i; setHover(i);
    let n = 0; try { n = +localStorage.getItem(STORE + '-taphint') || 0; } catch (e) {}
    if (n < 2) { toast(t('tap.again'), 1600); try { localStorage.setItem(STORE + '-taphint', n + 1); } catch (e) {} }
    return;
  }
  armedPit = -1;
  const p = shownPos();
  if (!canHumanPlay()) { if (reviewing && !lesson && !puzzle && !animating) rsOpen(); return; }
  if (ownerOf(i) !== p.side) return;
  if (!p.b[i]) { toast(t('emptyPit'), 1000); return; }
  const k = i % 7;
  setHover(-1);
  if (lesson) return lessonAnswer(k);
  if (puzzle) return puzzleMove(k);
  const q = settings.coach && settings.mode !== 'watch' ? judgeCoach(cur, k) : null;
  playMove(k).then(() => { if (q) coach(q.text, 'q-' + q.cls); });
}
// play move k from the shown position (truncating any future), animate it, then continue the game
async function playMove(k, opts) {
  const from = shownPos(), idx = cur;
  game.moves = game.moves.slice(0, cur); game.moves.push(k);
  evals.length = Math.min(evals.length, cur + 1); anaLists.length = Math.min(anaLists.length, cur + 1);
  if (rv && !(opts && opts.keepRv)) { rvCancel(); rv = null; rvOpen = false; }
  recompute(); reviewing = false;
  fxMarks = [];
  const tok = busyToken;
  thinking = -1; renderInfo(); renderFx();
  await animateMove(from.b, from.side, k, game.rules);
  if (tok !== busyToken) return;
  cur = idx + 1;
  update(); save();
  if (!(opts && opts.noFlow)) afterPosition();
}
function afterPosition() {
  const tok = ++busyToken;
  const p = shownPos();
  if (p.over) { if (!lesson && !puzzle && cur === game.moves.length) setTimeout(() => { if (tok === busyToken) onGameEnd(); }, 350); return; }
  if (lesson || puzzle) return;
  if (!reviewing && isAISide(p.side)) maybeAI(tok);
  else analyzeCurrent(tok);
}
async function maybeAI(tok) {
  const p = shownPos(), side = p.side, idx = cur;
  thinking = side; renderInfo();
  const t0 = performance.now();
  const res = await request('ai', { type: 'move', ...posMsg(p, game.rules), level: levelFor(side) });
  if (!res || tok !== busyToken) { if (tok === busyToken) { thinking = -1; renderInfo(); } return; }
  if (res.value !== undefined && res.value !== null) evals[idx] = { v: side === 0 ? res.value : -res.value, exact: !!res.exact };
  const wait = (settings.mode === 'watch' ? 600 : (P[idx].mv && P[idx].mv.extra ? 280 : 420)) - (performance.now() - t0);
  if (wait > 0) await sleep(wait);
  if (tok !== busyToken) return;
  thinking = -1;
  playMove(res.move);
}
async function analyzeCurrent(tok) {
  const p = shownPos(), idx = cur;
  if (p.over || lesson || puzzle) return;
  if (!settings.eval && !settings.hint && !settings.coach) return;
  if (anaLists[idx]) { renderFx(); return; }
  cancelWorker('ana');
  const res = await request('ana', { type: 'analyze', ...posMsg(p, game.rules), ms: settings.hint ? 1500 : 900 });
  if (!res || P[idx] !== p) return;
  anaLists[idx] = res.list;
  let best = -1e9; for (const x of res.list) best = Math.max(best, x.v);
  if (!evals[idx] || !evals[idx].exact) evals[idx] = { v: p.side === 0 ? best : -best, exact: res.exact };
  if (cur === idx) { renderInfo(); renderFx(); }
  save();
}
function judgeCoach(idx, k) {
  const L = anaLists[idx]; if (!L || L.length < 2) return null;
  let best = -1e9, bm = -1; for (const x of L) if (x.v > best) { best = x.v; bm = x.m; }
  const mine = L.find(x => x.m === k); if (!mine) return null;
  const loss = Math.max(0, best - mine.v);
  const flips = mine.exact && Math.sign(Math.round(best)) > Math.sign(Math.round(mine.v));
  const cls = loss < 0.3 ? 'best' : flips || loss >= 4 ? 'bad' : loss < 1.5 ? 'good' : 'dubious';
  let text = t('q.' + cls);
  if (cls !== 'best') text += '  ' + t('q.loss', { l: (Math.round(loss * 10) / 10), m: bm + 1 });
  return { cls, text };
}
function onGameEnd() {
  if (cur !== game.moves.length || gameOverShown) return;
  gameOverShown = true;
  const b = shownPos().b, a = b[6], o = b[13], w = a > o ? 0 : a < o ? 1 : -1;
  const youWin = settings.mode === 'ai' && w === game.human, aiWin = settings.mode === 'ai' && w >= 0 && w !== game.human;
  sChime(w < 0 ? 0 : aiWin ? -1 : 1);
  if (youWin || (settings.mode === 'pvp' && w >= 0)) confetti();
  $('#resultTitle').textContent = w < 0 ? t('res.draw') : youWin ? t('res.youWin') : aiWin ? t('res.aiWin') : t('res.pWin', { c: shortName(w) });
  $('#res0').textContent = a; $('#res1').textContent = o;
  let sub = `${t('rule.' + game.rules)} · ${t('ng.seedsN', { n: game.seeds })} · ${t('info.moves', { n: game.moves.length })}`;
  if (settings.mode === 'ai') sub += '<br>' + t('res.vs', { name: LV(settings.level), lv: settings.level });
  $('#resultSub').innerHTML = sub;
  setTimeout(() => $('#resultOverlay').classList.add('show'), 500);
}
function canUndo() {
  if (lesson || puzzle || settings.mode === 'watch' || !P.length) return false;
  if (settings.mode === 'pvp') return cur > 0;
  for (let i = cur - 1; i >= 0; i--) if (P[i].side === game.human) return true;
  return false;
}
function undo() {
  if (!canUndo()) return;
  busyToken++; cancelWorker('ai'); thinking = -1; stopAnim(); stopPlay();
  let i = cur - 1;
  if (settings.mode === 'ai') while (i > 0 && P[i].side !== game.human) i--;
  game.moves = game.moves.slice(0, i); recompute(); cur = i; reviewing = false; gameOverShown = false; fxMarks = [];
  evals.length = Math.min(evals.length, i + 1); anaLists.length = Math.min(anaLists.length, i + 1);
  $('#resultOverlay').classList.remove('show');
  update(); save(); afterPosition();
}
function viewAt(i) {
  if (lesson || puzzle) return;
  i = Math.max(0, Math.min(game.moves.length, i));
  if (i === cur && !animating) return;
  busyToken++; cancelWorker('ai'); thinking = -1; stopAnim();
  cur = i; reviewing = i !== game.moves.length; fxMarks = [];
  update(); afterPosition();
}
function resumeHere() {
  if (!reviewing) return;
  game.moves = game.moves.slice(0, cur); recompute(); reviewing = false; gameOverShown = false;
  evals.length = Math.min(evals.length, cur + 1);
  update(); save(); afterPosition();
}
function confetti() {
  if (!motionOn()) return;
  const cols = ['#e6cd8c', '#fff6dc', '#d6324b', '#2f7fd6', '#26a65b', '#9152d6'];
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
  if (settings.hint) { if (!anaLists[cur]) analyzeCurrent(busyToken); else renderFx(); }
  else renderFx();
  renderInfo();
};
$('#btnSound').onclick = () => { settings.sound = !settings.sound; save(); renderInfo(); if (settings.sound) sTick(); };
$('#btnLesson').onclick = () => openLessons();
$('#btnPuzzle').onclick = () => openPuzzles();
$('#btnRules').onclick = () => openRules();
$('#btnReview').onclick = () => $('#resultOverlay').classList.remove('show');
$('#btnAgain').onclick = () => { $('#resultOverlay').classList.remove('show'); openNewDialog(); };
$('#btnResAnalyze').onclick = () => { $('#resultOverlay').classList.remove('show'); runReview(); };
document.addEventListener('keydown', e => {
  const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'z') {
    if (lesson || puzzle) return;
    if ([...document.querySelectorAll('.overlay.show')].some(o => o.id !== 'resultOverlay')) return;
    e.preventDefault(); $('#resultOverlay').classList.remove('show'); undo(); return;
  }
  if (document.querySelector('.overlay.show')) { if (e.key === 'Escape') { const o = document.querySelector('.overlay.show'); outsideClose(o); } return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^[1-6]$/.test(e.key)) { const p = shownPos(); if (p && !p.over) onPit(pitIndex(p.side, +e.key - 1)); return; }
  if (lesson || puzzle) return;
  const k = { ArrowLeft: 'prev', ArrowRight: 'next', ArrowUp: 'last', ArrowDown: 'first', ' ': 'play' }[e.key];
  if (!k) return;
  e.preventDefault(); if (tg && tg.blur && tg !== document.body) tg.blur();
  navGo(k);
});
// record navigation under the evaluation graph
let playTimer = 0;
function stopPlay() { clearInterval(playTimer); playTimer = 0; const b = $('#navPlay'); if (b) b.classList.remove('playing'); }
function navGo(what) {
  if (lesson || puzzle) return;
  const N = game.moves.length;
  if (what === 'play') {
    if (playTimer) { stopPlay(); return; }
    if (cur >= N) viewAt(0);
    $('#navPlay').classList.add('playing');
    playTimer = setInterval(() => { if (lesson || puzzle || cur >= game.moves.length) { stopPlay(); return; } stepForward(); }, 1100);
    return;
  }
  stopPlay();
  const to = what === 'first' ? 0 : what === 'last' ? N : what === 'prev' ? cur - 1 : cur + 1;
  if (to < 0 || to > N || to === cur) return;
  if (what === 'next') stepForward(); else viewAt(to);
}
// one step forward through the record, sown seed by seed
async function stepForward() {
  if (cur >= game.moves.length || animating) return;
  busyToken++; cancelWorker('ai'); thinking = -1;
  const from = P[cur], k = game.moves[cur], tok = busyToken;
  fxMarks = []; fxEl.innerHTML = '';
  await animateMove(from.b, from.side, k, game.rules);
  if (tok !== busyToken) return;
  cur++; reviewing = cur !== game.moves.length;
  update(); afterPosition();
}
$('#navBar').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (b) navGo(b.dataset.n); });

// ====================================================================== new game dialog
let draft = {};
function levelLabelHTML(v) { return `Lv.${v} ${LV(v)}<small>${LVD(v)}</small>`; }
function renderRuleCards() {
  $('#ruleCards').innerHTML = RULE_ORDER.map(r => `<button class="rulecard ${draft.rules === r ? 'sel' : ''}" data-r="${r}"><span class="lvl">${t('rule.' + r + '.lvl')}</span><b>${t('rule.' + r)}</b><small>${t('rule.' + r + '.d')}${r === 'kalah' ? ` <span class="std">${t('rule.std')}</span>` : ''}</small></button>`).join('');
}
function segSync() {
  document.querySelectorAll('#segMode button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.mode));
  document.querySelectorAll('#segColor button').forEach(b => b.classList.toggle('sel', +b.dataset.v === draft.color));
  document.querySelectorAll('#segSeeds button').forEach(b => b.classList.toggle('sel', +b.dataset.v === draft.seeds));
  const m = draft.mode, play = m === 'ai' || m === 'pvp' || m === 'watch';
  ['#fRules', '#fSeeds', '#fDisplay'].forEach(s => $(s).classList.toggle('hidden', !play));
  $('#fColor').classList.toggle('hidden', m !== 'ai');
  $('#fLevel').classList.toggle('hidden', !(m === 'ai' || m === 'watch'));
  $('#fLevel2').classList.toggle('hidden', m !== 'watch');
  $('#fInfo').classList.toggle('hidden', play);
  $('#fInfoText').textContent = m === 'lesson' ? t('ls.desc') : m === 'puzzle' ? t('pz.desc') : '';
  $('#btnStart').textContent = m === 'lesson' ? t('ng.toLessons') : m === 'puzzle' ? t('ng.toPuzzles') : t('start');
  $('#levelLabel').textContent = m === 'watch' ? t('ng.level1') : t('ng.level');
  $('#levelRange').value = draft.level; $('#levelName').innerHTML = levelLabelHTML(draft.level);
  $('#levelRange2').value = draft.level2; $('#levelName2').innerHTML = levelLabelHTML(draft.level2);
  renderRuleCards();
}
function openNewDialog() {
  draft = { mode: lesson ? 'lesson' : puzzle ? 'puzzle' : settings.mode, color: settings.color, level: settings.level, level2: settings.level2, rules: settings.rules, seeds: settings.seeds };
  $('#optEval').checked = settings.eval; $('#optAnim').checked = settings.anim; $('#optCoach').checked = settings.coach; $('#optPreview').checked = settings.preview;
  segSync(); $('#newOverlay').classList.add('show');
}
$('#segMode').onclick = e => { const b = e.target.closest('button'); if (b) { draft.mode = b.dataset.v; segSync(); } };
$('#segColor').onclick = e => { const b = e.target.closest('button'); if (b) { draft.color = +b.dataset.v; segSync(); } };
$('#segSeeds').onclick = e => { const b = e.target.closest('button'); if (b) { draft.seeds = +b.dataset.v; segSync(); } };
$('#ruleCards').onclick = e => { const b = e.target.closest('.rulecard'); if (b) { draft.rules = b.dataset.r; segSync(); } };
$('#ngRulesHelp').onclick = () => openRules(draft.rules);
$('#levelRange').oninput = e => { draft.level = +e.target.value; segSync(); };
document.querySelectorAll('.lvbtn').forEach(b => b.onclick = () => { const k = b.dataset.t, d = +b.dataset.d; draft[k] = Math.max(1, Math.min(10, draft[k] + d)); segSync(); sTick(); });
$('#levelRange2').oninput = e => { draft.level2 = +e.target.value; segSync(); };
$('#btnCancelNew').onclick = () => { $('#newOverlay').classList.remove('show'); maybeRotTip(); };
$('#btnStart').onclick = () => {
  $('#newOverlay').classList.remove('show'); ctx(); maybeRotTip();
  if (draft.mode === 'lesson') { openLessons(); return; }
  if (draft.mode === 'puzzle') { openPuzzles(); return; }
  exitSpecial();
  Object.assign(settings, { mode: draft.mode, color: draft.color, level: draft.level, level2: draft.level2, rules: draft.rules, seeds: draft.seeds,
    eval: $('#optEval').checked, anim: $('#optAnim').checked, coach: $('#optCoach').checked, preview: $('#optPreview').checked });
  applyBg();
  newGame();
};

// ====================================================================== rules page (illustrated)
const MB = { W: 470, H: 192 };
function mbXY(i) {   // player 0 at the bottom
  if (i === 6) return [438, 85]; if (i === 13) return [32, 85];
  if (i < 6) return [85 + i * 60, 122]; return [385 - (i - 7) * 60, 48];
}
// mini board: counts[14], marks: {i: 'land'|'cap'|'src'|'store'|'relay'}, path: [slot indices] drawn as numbered drops
function miniBoard(counts, marks, path, opt) {
  opt = opt || {};
  let s = `<svg viewBox="0 0 ${MB.W} ${MB.H}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#e2c275"/></marker><linearGradient id="wd" x1="0" x2="1"><stop offset="0" stop-color="#202022"/><stop offset=".5" stop-color="#19191b"/><stop offset="1" stop-color="#101011"/></linearGradient><radialGradient id="cup" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="#050506"/><stop offset=".7" stop-color="#121213"/><stop offset="1" stop-color="#232326"/></radialGradient><radialGradient id="gm" cx=".33" cy=".28" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".2" stop-color="#ffb3bd"/><stop offset=".6" stop-color="#d6324b"/><stop offset="1" stop-color="#5c0a18"/></radialGradient></defs>`;
  s += `<rect x="2" y="2" width="${MB.W - 4}" height="${MB.H - 4}" rx="16" fill="url(#wd)" stroke="rgba(255,255,255,.08)" stroke-width="1.5"/>`;
  for (let i = 0; i < 14; i++) {
    const [x, y] = mbXY(i), mk = marks && marks[i];
    if (isStore(i)) s += `<rect x="${x - 22}" y="${y - 62}" width="44" height="124" rx="22" fill="url(#cup)"/>`;
    else s += `<circle cx="${x}" cy="${y}" r="23" fill="url(#cup)"/>`;
    const n = counts[i];
    // a few gems + the count
    const g = Math.min(n, isStore(i) ? 8 : 5);
    for (let j = 0; j < g; j++) { const a = j * 2.4, r = j ? 6 + (j % 3) * 3 : 0; const gx = x + Math.cos(a) * r, gy = y + Math.sin(a) * r * (isStore(i) ? 4 : 1) + (isStore(i) ? 0 : 0); s += `<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="5" fill="url(#gm)" opacity=".9"/>`; }
    s += `<text x="${x}" y="${isStore(i) ? (i === 6 ? y + 78 : y - 70) : (i < 6 ? y + 38 : y - 30)}" fill="${n ? '#f4e4bd' : 'rgba(244,228,189,.4)'}" font-family="JetBrains Mono,monospace" font-size="15" font-weight="700" text-anchor="middle">${n}</text>`;
    if (mk) {
      const col = mk === 'cap' ? '#ff7a6a' : mk === 'relay' ? '#7fc8ff' : mk === 'src' ? '#ffffff' : '#e2c275';
      if (isStore(i)) s += `<rect x="${x - 26}" y="${y - 66}" width="52" height="132" rx="26" fill="none" stroke="${col}" stroke-width="3" stroke-dasharray="${mk === 'src' ? '0' : '6 4'}"/>`;
      else s += `<circle cx="${x}" cy="${y}" r="27" fill="none" stroke="${col}" stroke-width="3" stroke-dasharray="${mk === 'src' ? '0' : '6 4'}"/>`;
    }
  }
  if (path && path.length > 1) {
    const pts = path.map(i => { const [x, y] = mbXY(i); return [x, isStore(i) ? y : y < 85 ? y - 2 : y - 2]; });
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let j = 1; j < pts.length; j++) { const [x0, y0] = pts[j - 1], [x1, y1] = pts[j]; const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 - (Math.abs(y1 - y0) > 40 ? 0 : 26); d += ` Q${cx},${cy} ${x1},${y1}`; }
    s += `<path d="${d}" fill="none" stroke="#e2c275" stroke-width="2.2" stroke-dasharray="5 4" marker-end="url(#ah)" opacity=".95"/>`;
    path.slice(1).forEach((i, j) => { const [x, y] = mbXY(i); const yy = isStore(i) ? y - 20 + j * 0 : y - 2; if (opt.nums !== false) s += `<circle cx="${x + 16}" cy="${yy - 16}" r="9" fill="#e2c275"/><text x="${x + 16}" y="${yy - 12}" font-size="11" font-family="JetBrains Mono,monospace" font-weight="700" text-anchor="middle" fill="#1b150a">${j + 1}</text>`; });
  }
  if (opt.cross) { const [x, y] = mbXY(opt.cross); s += `<path d="M${x - 12} ${y - 12}L${x + 12} ${y + 12}M${x + 12} ${y - 12}L${x - 12} ${y + 12}" stroke="#ff6b5b" stroke-width="4" stroke-linecap="round"/>`; }
  if (opt.capArrow) { const [x0, y0] = mbXY(opt.capArrow[0]), [x1, y1] = mbXY(opt.capArrow[1]); s += `<path d="M${x0},${y0 - 24} Q${(x0 + x1) / 2},${Math.min(y0, y1) - 40} ${x1},${y1 - 66}" fill="none" stroke="#ff8b7d" stroke-width="2.4" marker-end="url(#ah)"/>`; }
  s += `<text x="${MB.W / 2}" y="${MB.H - 7}" fill="rgba(226,194,117,.55)" font-size="11" text-anchor="middle" font-family="sans-serif">${opt.caption || t('rl.youBottom')}</text>`;
  return s + '</svg>';
}
const B0 = (bot, top, s0, s1) => { const b = new Array(14).fill(0); bot.forEach((v, i) => { b[i] = v; }); top.forEach((v, i) => { b[7 + i] = v; }); b[6] = s0 || 0; b[13] = s1 || 0; return b; };
// hands-on rules tour (shared/ruletour.js): short steps, each with a small board where you actually sow
// basics first (sowing, extra turn, capture, end), then what the rule variants change; strategy stays in the lessons
const rtEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function rtDraw(api, c, marks, opt) {
  api.board.innerHTML = miniBoard(c, marks || {}, (opt && opt.path) || null, opt || {});
  const svg = api.board.querySelector('svg'); if (svg && opt && opt.busy) svg.classList.add('busy');
}
// the pit (0-5) under a click on the mini board, or -1
function rtPitAt(api, e) {
  const svg = api.board.querySelector('svg'); if (!svg) return -1;
  const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * MB.W / r.width, y = (e.clientY - r.top) * MB.H / r.height;
  for (let i = 0; i < 6; i++) { const [px, py] = mbXY(i); if (Math.hypot(x - px, y - py) < 32) return i; }
  return -1;
}
// sow pit k on the mini board seed by seed (same sounds as the game); resolves with the engine trace
async function rtSow(api, b, k, rules) {
  const tr = E.trace(Int8Array.from(b), 0, k, rules), c = Array.from(b), path = [k];
  let last = k;
  for (const ev of tr.events) {
    if (ev.t === 'pick') { c[ev.at] = 0; last = ev.at; sPick(); }
    else if (ev.t === 'drop') { c[ev.at]++; last = ev.at; path.push(ev.at); sDrop(isStore(ev.at)); }
    else if (ev.t === 'cap') { c[ev.to] += ev.n + (ev.own >= 0 ? 1 : 0); c[ev.from] = 0; if (ev.own >= 0) c[ev.own] = 0; sCapture(); }
    else if (ev.t === 'sweep') { for (let i = 0; i < 6; i++) { c[6] += c[i]; c[13] += c[7 + i]; c[i] = c[7 + i] = 0; } sDrop(true); }
    const mk = { [k]: 'src', [last]: ev.t === 'cap' ? 'cap' : isStore(last) ? 'store' : 'land' };
    if (ev.t === 'cap') { mk[ev.from] = 'cap'; mk[ev.to] = 'store'; }
    rtDraw(api, c, mk, { busy: true });
    await api.sleep(ev.t === 'pick' ? 260 : ev.t === 'cap' || ev.t === 'sweep' ? 520 : 190);
  }
  const mk = { [k]: 'src', [tr.land]: tr.extra ? 'store' : 'land' };
  if (tr.cap) { mk[tr.capFrom] = 'cap'; mk[6] = 'store'; }
  rtDraw(api, Array.from(tr.board), mk, { busy: true });
  return tr;
}
// a page: board b; clicking a pit sows it; judge(trace, k) -> true (cleared) / string (wrong, message)
function rtSowPage(id, title, body, task, b, rules, judge, opt) {
  opt = opt || {};
  return { id, title, body, task, setup(api) {
    let busy = false;
    rtDraw(api, b, opt.marks);
    if (opt.say) api.say(opt.say());
    api.board.onclick = async e => {
      if (busy || api.state.done) return;
      const k = rtPitAt(api, e); if (k < 0) return;
      if (!b[k]) { api.say(t('emptyPit'), 'ng'); return; }
      if (opt.only !== undefined && k !== opt.only) { api.ng(opt.onlyMsg(), { reset: false }); return; }
      busy = true; ctx();
      const tr = await rtSow(api, b, k, rules);
      const r = judge(tr, k);
      if (r === true) api.ok(opt.okMsg ? opt.okMsg(tr) : '');
      else api.ng(r);
    };
  } };
}
const RT_PAGES = [
  // common spec: the first page introduces the game (history / how to win / culture); the menu / banner entries open here
  { id: 'intro', title: () => t('ri.t'), body: () => '', html: () => RuleTour.intro({ lang: LANG, img: '../images/atlas/mancala.webp', origin: t('ri.origin'), players: t('ri.players'), time: t('ri.time'), history: t('ri.hist'), win: t('ri.win'), culture: t('ri.cult') }) },
  rtSowPage('sow', () => t('rl.sow.h'), () => `<p>${t('rl.sow')}</p>`, () => t('rt.sow.task'),
    B0([1, 2, 0, 1, 2, 9], [3, 1, 2, 2, 1, 3], 3, 4), 'kalah', () => true,
    { only: 5, onlyMsg: () => t('rt.sow.ng'), okMsg: () => t('rt.sow.ok') }),
  rtSowPage('extra', () => t('rl.extra.h'), () => `<p>${t('rl.extra')}</p>`, () => t('rt.extra.task'),
    B0([2, 3, 1, 3, 1, 2], [2, 1, 3, 0, 2, 1], 5, 4), 'kalah', tr => tr.extra || t('rt.extra.ng'),
    { okMsg: () => t('rt.extra.ok') }),
  rtSowPage('cap', () => t('rl.cap.h'), () => `<p>${t('rl.cap')}</p>`, () => t('rt.cap.task'),
    B0([1, 3, 0, 2, 4, 0], [2, 1, 3, 5, 2, 1], 4, 6), 'kalah', tr => tr.cap > 0 || t('rt.cap.ng'),
    { okMsg: () => t('rt.cap.ok') }),
  rtSowPage('end', () => t('rl.end.h'), () => `<p>${t('rl.end')}</p>`, () => t('rt.end.task'),
    B0([0, 0, 0, 0, 0, 1], [2, 0, 3, 1, 0, 2], 26, 13), 'kalah', tr => tr.over || t('rt.end.task'),
    { okMsg: tr => `${t('rt.end.ok')} <b>${tr.board[6]} − ${tr.board[13]}</b>` }),
  { id: 'variants', title: () => t('rt.var.t'), body: () => t('rt.var.b'),
    html: () => `<div class="rt-vars">${RULE_ORDER.map(r => `<div><b>${rtEsc(t('rule.' + r))} <small style="color:var(--muted);font-weight:400">${rtEsc(t('rule.' + r + '.lvl'))}</small></b>${rtEsc(t('rule.' + r + '.d'))}</div>`).join('')}</div>` },
  rtSowPage('capB', () => t('rl.capB.h'), () => `<p>${t('rl.capB')}</p>`, () => t('rt.capB.task'),
    B0([1, 3, 0, 2, 4, 0], [2, 1, 3, 5, 2, 1], 4, 6), 'basic', tr => tr.cap > 0 || t('rt.capB.ng'),
    { okMsg: () => t('rt.capB.ok') }),
  rtSowPage('relay', () => t('rl.relay.h'), () => `<p>${t('rl.relay')}</p>`, () => t('rt.relay.task'),
    B0([1, 0, 2, 0, 1, 2], [1, 0, 2, 0, 1, 3], 3, 4), 'sunka', tr => tr.extra || t('rt.relay.ng'),
    { okMsg: () => t('rt.relay.ok') }),
];
// the new-game dialog's "?" opens the page of that rule variant directly (by page id)
const RT_START = { kalah: 'sow', easy: 'variants', basic: 'capB', sunka: 'relay' };
// rules layout (common spec): step dots on top, 前へ／閉じる／次へ (.rt-nav) pinned at the bottom of the fixed-height dialog,
// the page in .rt-main between them. On board pages the title / text / task go into .rt-text so that, side by side
// (PC, phone held sideways), only the text scrolls and the board keeps its place. Runs right after each render (before paint).
function rtLayout(sel) {
  const m = document.querySelector(sel); if (!m) return;
  const fix = () => {
    const rt = m.querySelector(':scope > .rt'), nav = rt && rt.querySelector(':scope > .rt-nav'); if (!nav || rt.dataset.lay) return;
    rt.dataset.lay = '1';
    let main = rt.querySelector(':scope > .rt-main');
    if (!main) {   // older shared/ruletour.js without .rt-main
      main = document.createElement('div'); main.className = 'rt-main';
      [...rt.children].filter(c => !c.matches('.rt-steps, .rt-nav')).forEach(c => main.appendChild(c));
      rt.insertBefore(main, nav);
    }
    const board = main.querySelector(':scope > .rt-board');
    if (board) {
      const text = document.createElement('div'); text.className = 'rt-text';
      [...main.children].filter(c => c !== board).forEach(c => text.appendChild(c));
      main.prepend(text); main.classList.add('has-board');
    }
    main.classList.toggle('is-fin', !!main.querySelector('.rt-finish'));
    // a ✓ / ✗ message below the fold is scrolled into view
    const task = main.querySelector('.rt-task');
    if (task) new MutationObserver(() => { const g = task.querySelector('.rt-msg'); if (g) g.scrollIntoView({ block: 'nearest' }); }).observe(task, { childList: true });
  };
  new MutationObserver(fix).observe(m, { childList: true }); fix();
}
rtLayout('#rulesBody');
const ruleTour = window.RuleTour ? RuleTour.create({
  mount: '#rulesBody', store: 'mancala-rules-v2', lang: () => LANG,
  close: () => $('#rulesOverlay').classList.remove('show'),
  play: () => { $('#rulesOverlay').classList.remove('show'); openNewDialog(); },
  lessons: () => tabSwitch(() => { $('#rulesOverlay').classList.remove('show'); openLessons(); }),
  sound: k => (k === 'ok' ? sExtra() : sWrong()),
  pages: RT_PAGES,
}) : null;
// r: open at the page of that rule variant (from the new-game dialog); the menu / first-time banner start at step 1
// the rules are the first tab of the lessons dialog (ルール / レッスン / パズル)
function openRules(r) {
  selTab('rules'); $('#lessonOverlay').classList.remove('show'); $('#puzzleOverlay').classList.remove('show');
  $('#rulesOverlay').classList.add('show');
  if (ruleTour) ruleTour.open(r && RT_START[r] ? Math.max(0, RT_PAGES.findIndex(p => p.id === RT_START[r])) : 0);
}
function renderRules() { if (ruleTour) ruleTour.render(); }
$('#rulesClose').onclick = () => { if (ruleTour) ruleTour.stop(); $('#rulesOverlay').classList.remove('show'); };

// ====================================================================== lessons & puzzles: shared
let LESSONS = null, PUZZLES = null;
const lessonsReady = fetch('lessons.json').then(r => r.json()).then(d => (LESSONS = d)).catch(() => null);
const puzzlesReady = fetch('puzzles.json?v=20261021n').then(r => r.json()).then(d => (PUZZLES = d)).catch(() => null);
const LS_STORE = STORE + '-lessons', PZ_STORE = STORE + '-puzzles';
function lsProgress() { try { return JSON.parse(localStorage.getItem(LS_STORE) || '{}'); } catch (e) { return {}; } }
function pzProgress() { try { return JSON.parse(localStorage.getItem(PZ_STORE) || '{}'); } catch (e) { return {}; } }
function stashGame() { if (!lesson && !puzzle) savedGame = { game, cur, evals: evals.slice(), anaLists: anaLists.slice() }; }
function exitSpecial() {
  if (!lesson && !puzzle) return;
  lesson = null; puzzle = null; fxMarks = [];
  document.body.classList.remove('in-lesson', 'in-puzzle');
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); stopAnim(); thinking = -1;
  if (savedGame) { game = savedGame.game; recompute(); cur = savedGame.cur; evals = savedGame.evals; anaLists = savedGame.anaLists; savedGame = null; }
  reviewing = cur !== game.moves.length; gameOverShown = isOver(game.moves.length);
}
function quitSpecial() { exitSpecial(); layout(); update(); afterPosition(); }
function enterSetup(b, side, rules) {
  if (matchMedia('(min-aspect-ratio: 1/1) and (pointer: coarse)').matches) setTimeout(() => window.scrollTo(0, 0), 0);   // phone landscape: board first
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); stopAnim(); stopPlay(); thinking = -1;
  game = { rules, seeds: 4, moves: [], human: 0, setup: { b: Array.from(b), side } };
  recompute(); cur = 0; reviewing = false; fxMarks = []; evals = []; anaLists = [];
  resetSeeds(); layout(); update();
}
function selTab(v) { document.querySelectorAll('.ls-tabs').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === v))); }
// switch between the tab overlays without the fade, so it looks like one dialog
function tabSwitch(fn) {
  const inst = on => ['#lessonOverlay', '#puzzleOverlay', '#rulesOverlay'].forEach(x => $(x).classList.toggle('instant', on));
  inst(true); fn(); setTimeout(() => inst(false), 150);
}
document.querySelectorAll('.ls-tabs').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const v = b.dataset.v, shown = { rules: '#rulesOverlay', lesson: '#lessonOverlay', puzzle: '#puzzleOverlay' }[v];
  if (!shown || ($(shown).classList.contains('show') && !(v === 'lesson' && $('#lessonListView').classList.contains('hidden')))) return;
  tabSwitch(() => {
    if (v !== 'rules' && ruleTour) ruleTour.stop();
    Object.values({ rules: '#rulesOverlay', lesson: '#lessonOverlay', puzzle: '#puzzleOverlay' }).forEach(x => { if (x !== shown) $(x).classList.remove('show'); });
    if (v === 'rules') openRules(); else if (v === 'puzzle') openPuzzles(); else openLessons();
  });
}));

// ====================================================================== lessons
let introIdx = 0;
function showLessonView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
// lesson / puzzle lists: course tabs, a banner, cards with a board picture and a short explanation (same layout as gomoku)
// flat mini board for list cards (no gradients / ids, so any number can be on a page): the count in each pit, tinted by its size
function mThumb(c, marks) {
  let s = `<svg viewBox="0 0 ${MB.W} ${MB.H}" aria-hidden="true"><rect x="2" y="2" width="${MB.W - 4}" height="${MB.H - 4}" rx="18" fill="#2a1d14" stroke="#6b4a2a" stroke-width="3"/>`;
  for (let i = 0; i < 14; i++) {
    const [x, y] = mbXY(i), n = c[i], st = isStore(i), mk = marks && marks[i];
    s += st ? `<rect x="${x - 24}" y="${y - 64}" width="48" height="128" rx="24" fill="#0d0a08"/>` : `<circle cx="${x}" cy="${y}" r="25" fill="#0d0a08"/>`;
    if (n) s += st ? `<rect x="${x - 24}" y="${y - 64}" width="48" height="128" rx="24" fill="#c8384f" opacity="${Math.min(.55, .12 + n * .015).toFixed(2)}"/>` : `<circle cx="${x}" cy="${y}" r="25" fill="#c8384f" opacity="${Math.min(.6, .14 + n * .06).toFixed(2)}"/>`;
    s += `<text x="${x}" y="${y + 12}" fill="${n ? '#fff3d6' : 'rgba(251,236,203,.3)'}" font-family="JetBrains Mono,monospace" font-size="${st ? 32 : 32}" font-weight="700" text-anchor="middle">${n}</text>`;
    if (mk) { const col = mk === 'cap' ? '#ff7a6a' : mk === 'relay' ? '#7fc8ff' : mk === 'src' ? '#ffffff' : '#e2c275'; s += st ? `<rect x="${x - 28}" y="${y - 68}" width="56" height="136" rx="28" fill="none" stroke="${col}" stroke-width="5"/>` : `<circle cx="${x}" cy="${y}" r="29" fill="none" stroke="${col}" stroke-width="5"/>`; }
  }
  return s + '</svg>';
}
const plainText = html => String(html || '').replace(/<br\s*\/?>|<\/p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const lxBar = (p, cls) => `<span class="lx-bar ${cls || ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span>`;
// lessons in two courses: the three basic moves, then playing to win
const LS_COURSES = { basic: ['sow', 'extra', 'capture'], tactics: ['defend', 'chain', 'endgame'] };
const LS_ICON = { basic: '①', tactics: '⚔' };
const lsCourseOf = id => Object.keys(LS_COURSES).find(c => LS_COURSES[c].includes(id)) || 'basic';
let lsCourseSel = '';
async function openLessons(course) {
  await lessonsReady; selTab('lesson');
  if (!LESSONS) { toast(t('ls.fail')); return; }
  const pr = lsProgress(), courses = Object.keys(LS_COURSES);
  const stat = c => { const st = LESSONS.steps.filter(s => lsCourseOf(s.id) === c); return { n: st.length, ok: st.filter(s => pr[s.id] && pr[s.id].clear).length }; };
  if (course) lsCourseSel = course;
  if (!courses.includes(lsCourseSel)) lsCourseSel = courses.find(c => { const q = stat(c); return q.ok < q.n; }) || courses[0];
  const c = lsCourseSel, q = stat(c);
  const cards = LESSONS.steps.map((s, i) => {
    if (lsCourseOf(s.id) !== c) return '';
    const r = pr[s.id], d = LESSON_D[s.id];
    const th = d ? mThumb(d[0], d[1]) : mThumb(s.problems[0].b);
    const st = r ? (r.clear ? `<span class="lx-st ok">✓ ${t('ls.clear')}</span>` : `<span class="lx-st">${t('u.pt', { n: r.best })}</span>`) : `<span class="lx-st new">${t('ls.notyet')}</span>`;
    return `<button class="lx-card${r && r.clear ? ' clear' : ''}" data-i="${i}"><span class="lx-th">${th}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">STEP ${i + 1}</span>${st}</span><b class="lx-t">${t('ls.' + s.id + '.title')}</b><small class="lx-sub">${t('ls.' + s.id + '.sub')}</small>` +
      `<span class="lx-desc">${plainText(t('ls.' + s.id + '.intro'))}</span>${lxBar(r ? r.best / 100 : 0, r && r.clear ? 'ok' : '')}</span></button>`;
  }).join('');
  $('#lessonList').innerHTML = `<div class="lx">` +
    `<div class="lx-tabs">${courses.map(k => { const z = stat(k); return `<button data-course="${k}" class="${k === c ? 'sel' : ''}"><span class="ic">${LS_ICON[k]}</span><span class="nm">${t('lx.c.' + k)}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join('')}</div>` +
    `<div class="lx-banner"><span class="ic">${LS_ICON[c]}</span><span class="tx"><b>${t('lx.c.' + c)}</b><small>${t('lx.c.' + c + '.d')}</small></span><span class="pg">${t('lx.cleared', { a: q.ok, b: q.n })}${lxBar(q.ok / q.n, 'ok')}</span></div>` +
    `<div class="lx-grid">${cards}</div></div>`;
  showLessonView('lessonListView'); $('#lessonOverlay').classList.add('show');
}
$('#lessonList').onclick = e => {
  const tb = e.target.closest('[data-course]'); if (tb) { openLessons(tb.dataset.course); return; }
  const b = e.target.closest('.lx-card'); if (b) openIntro(+b.dataset.i);
};
// [counts, marks, path, opt] of each lesson's picture (intro page and list card)
const LESSON_D = {
  sow: [B0([2, 1, 3, 0, 2, 1], [2, 1, 3, 0, 2, 2], 3, 4), { 2: 'src', 5: 'land' }, [2, 3, 4, 5]],
  extra: [B0([1, 4, 2, 0, 2, 1], [2, 1, 3, 1, 2, 2], 4, 4), { 5: 'src', 6: 'land' }, [5, 6]],
  capture: [B0([0, 2, 1, 0, 3, 1], [2, 1, 0, 5, 2, 1], 4, 6), { 1: 'src', 3: 'land', 9: 'cap' }, [1, 2, 3], { capArrow: [9, 6] }],
  defend: [B0([1, 2, 6, 1, 0, 2], [2, 0, 1, 0, 2, 3], 6, 6), { 2: 'cap', 7: 'src', 10: 'land' }, null],
  chain: [B0([3, 0, 2, 3, 2, 1], [2, 1, 1, 2, 3, 2], 5, 6), { 5: 'src', 6: 'land' }, [5, 6]],
  endgame: [B0([0, 0, 2, 0, 1, 1], [1, 0, 0, 2, 0, 0], 21, 21), { 6: 'land', 13: 'land' }, null],
};
const LESSON_DIAG = {}; for (const k in LESSON_D) LESSON_DIAG[k] = () => miniBoard(...LESSON_D[k]);
function openIntro(i) {
  introIdx = i; const s = LESSONS.steps[i];
  $('#liStep').textContent = 'STEP ' + (i + 1);
  $('#liTitle').textContent = t('ls.' + s.id + '.title');
  $('#liBody').innerHTML = (LESSON_DIAG[s.id] ? LESSON_DIAG[s.id]() : '') + t('ls.' + s.id + '.intro') + `<p class="note">${t('ls.scoring')}</p>`;
  showLessonView('lessonIntroView');
}
$('#btnLessonBack').onclick = () => openLessons(LESSONS.steps[introIdx] && lsCourseOf(LESSONS.steps[introIdx].id));
$('#btnLessonClose').onclick = () => $('#lessonOverlay').classList.remove('show');
$('#btnLessonStart').onclick = () => startLesson(introIdx);
$('#btnLessonQuit2').onclick = () => { $('#lessonOverlay').classList.remove('show'); quitSpecial(); };
$('#btnLessonRetry').onclick = () => startLesson(lesson ? lesson.step : introIdx);
$('#btnLessonNextStep').onclick = () => { const n = (lesson ? lesson.step : introIdx) + 1; if (n < LESSONS.steps.length) openIntro(n); else { $('#lessonOverlay').classList.remove('show'); quitSpecial(); } };
function startLesson(step) {
  $('#lessonOverlay').classList.remove('show');
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle');
  lesson = { step, i: 0, results: [], answered: false, hinted: false };
  document.body.classList.add('in-lesson');
  loadLessonProblem();
}
const lessonProblem = () => LESSONS.steps[lesson.step].problems[lesson.i];
function lessonBaseMarks() {
  const s = LESSONS.steps[lesson.step], pr = lessonProblem();
  return s.id === 'sow' ? [{ at: pr.target, ring: true, cls: 'target' }] : [];
}
function loadLessonProblem() {
  const pr = lessonProblem();
  lesson.answered = false; lesson.hinted = false;
  enterSetup(pr.b, 0, LESSONS.rules || 'kalah');
  fxMarks = lessonBaseMarks(); renderFx();
  renderLessonCard(); $('#lsFb').innerHTML = lesson.i === 0 ? `<small>${t('ls.tutorial')}</small>` : lesson.i >= 3 ? `<small>${t('ls.exam')}</small>` : '';
}
function renderLessonCard() {
  const s = LESSONS.steps[lesson.step], n = s.problems.length;
  $('#lsStep').textContent = t('ls.stepq', { s: lesson.step + 1, i: lesson.i + 1, n }) + (lesson.i >= 3 ? ' · ' + t('ls.examTag') : '');
  $('#lsTitle').textContent = t('ls.' + s.id + '.title');
  $('#lsPrompt').innerHTML = `<div class="ls-goal">${t('ls.' + s.id + '.goal')}</div>`;
  $('#lsDots').innerHTML = s.problems.map((_, i) => { const r = lesson.results[i]; return `<i class="${r === undefined ? '' : r >= 16 ? 'ok' : r >= 10 ? 'mid' : 'ng'} ${i === lesson.i ? 'cur' : ''}"></i>`; }).join('');
  $('#lsNext').textContent = lesson.i + 1 < n ? t('ls.next') : t('ls.result');
  $('#lsNext').disabled = !lesson.answered;
  $('#lsHint').disabled = lesson.answered;
}
function problemPoints(sc, k) {
  const all = sc.filter(v => v !== null), mine = sc[k], best = Math.max(...all), n = all.length;
  if (n <= 1 || mine >= best - 1e-9) return 20;
  const r = all.filter(v => v > mine + 1e-9).length;
  return Math.max(0, Math.round(20 * (n - 1 - r) / (n - 1)));
}
async function lessonAnswer(k) {
  const pr = lessonProblem(), s = LESSONS.steps[lesson.step];
  lesson.answered = true;
  const pts = problemPoints(pr.sc, k);
  lesson.results[lesson.i] = pts;
  renderLessonCard();
  const L = pts >= 16 ? 'ok' : 'ng', lbl = pts === 20 ? 'fb.perfect' : pts >= 16 ? 'fb.good' : pts >= 10 ? 'fb.ng' : 'fb.bad';
  let fb = `<span class="pts ${pts >= 16 ? 'ok' : pts >= 10 ? 'mid' : 'ng'}">+${t('u.pt', { n: pts })}</span> <b class="${L}">${t(lbl)}</b> `;
  if (pts < 20) fb += t('fb.answerIs', { m: pr.best + 1 }) + ' ';
  fb += t('ls.' + s.id + '.why', { m: pr.best + 1, x: k + 1 });
  if (s.id !== 'sow') fb += `<br><small>${t('fb.values', { a: fmtV(pr.sc[k], false), b: fmtV(pr.sc[pr.best], false) })}</small>`;
  $('#lsFb').innerHTML = fb;
  if (pts >= 16) sChime(1); else sWrong();
  const tok = busyToken;
  await playMove(k, { noFlow: true });
  if (!lesson || tok !== busyToken) return;
  await sleep(900);
  if (!lesson || tok !== busyToken) return;
  // back to the problem: show the answer (gold ring), your move (red ring) and the engine's score of each pit
  game.moves = []; recompute(); cur = 0;
  fxMarks = lessonBaseMarks().concat([{ at: pr.best, ring: true, cls: 'ok' }]);
  if (k !== pr.best) fxMarks.push({ at: k, ring: true, cls: 'ng' });
  if (s.id !== 'sow') { let best = Math.max(...pr.sc.filter(v => v !== null)); pr.sc.forEach((v, j) => { if (v !== null) fxMarks.push({ at: j, label: fmtV(v, false), lcls: (v >= best ? 'best' : '') + (v < 0 ? ' neg' : ''), dy: -0.36 }); }); }
  update();
}
$('#lsHint').onclick = () => {
  if (!lesson || lesson.answered) return;
  lesson.hinted = true;
  const s = LESSONS.steps[lesson.step], pr = lessonProblem(), b = pr.b;
  $('#lsFb').innerHTML = t('ls.' + s.id + '.hint');
  fxMarks = lessonBaseMarks();
  if (s.id === 'extra') fxMarks.push({ at: 6, ring: true, cls: '' });
  if (s.id === 'capture') for (let i = 0; i < 6; i++) if (!b[i] && b[12 - i]) fxMarks.push({ at: 12 - i, ring: true, cls: 'cap' });
  if (s.id === 'defend') { for (let k = 0; k < 6; k++) { const i = 7 + k; if (!b[i]) continue; const tr = E.trace(Int8Array.from(b), 1, k, 'kalah'); if (tr.cap) fxMarks.push({ at: tr.capFrom, ring: true, cls: 'cap' }); } }
  renderFx();
};
$('#lsNext').onclick = () => {
  if (!lesson || !lesson.answered) return;
  const s = LESSONS.steps[lesson.step];
  if (lesson.i + 1 < s.problems.length) { lesson.i++; loadLessonProblem(); return; }
  const n = lesson.results.reduce((a, b) => a + b, 0), pass = n >= 75;
  const pr = lsProgress(); const old = pr[s.id] || { best: 0, clear: false };
  pr[s.id] = { best: Math.max(old.best, n), clear: old.clear || pass };
  try { localStorage.setItem(LS_STORE, JSON.stringify(pr)); } catch (e) {}
  $('#ldTitle').textContent = t(pass ? 'ls.passed' : 'ls.failed');
  $('#ldSub').innerHTML = `<div class="ld-score ${pass ? 'ok' : 'ng'}">${t('u.pt', { n })}<small> / 100</small></div>` + lesson.results.map((x, k) => `${k + 1}: ${t('u.pt', { n: x })}`).join('　') + (pass ? '' : `<br>${t('ls.needPass')}`);
  $('#btnLessonNextStep').classList.toggle('hidden', lesson.step + 1 >= LESSONS.steps.length);
  showLessonView('lessonDoneView'); $('#lessonOverlay').classList.add('show');
  if (pass) { confetti(); sChime(1); }
};
$('#lsQuit').onclick = () => quitSpecial();
$('#lsToList').onclick = () => openLessons(lesson ? lsCourseOf(LESSONS.steps[lesson.step].id) : undefined);
$('#pzToList').onclick = () => openPuzzles();

// ====================================================================== puzzles
let pzLevel = 0;
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
async function openPuzzles() {
  await puzzlesReady; selTab('puzzle');
  if (!PUZZLES) { toast(t('ls.fail')); return; }
  const pr = pzProgress(), dl = dailyPick(), di = dailyInfo();
  const daily = dl ? `<button class="lesson-item daily" data-daily="1"><span class="no">★</span><span class="tx"><b>${t('daily.title')} <span style="color:var(--dim);font-weight:400">${dl.date.slice(5).replace('-', '/')}</span></b><small>${t('pz.' + PUZZLES.levels[dl.L].id)} · ${t('daily.streak', { n: di.streak })}${di.best > 1 ? ' · ' + t('daily.best', { n: di.best }) : ''}</small></span><span class="st ${di.today ? 'clear' : ''}">${di.today ? '✓' : t('daily.go')}</span></button>` : '';
  const cards = PUZZLES.levels.map((L, i) => {
    const solved = L.puzzles.filter((_, j) => pr[`${i}-${j}`]).length, all = solved === L.puzzles.length, P0 = L.puzzles[0];
    const ns = L.puzzles.map(p => pzN(p)), lo = Math.min(...ns), hi = Math.max(...ns);
    return `<button class="lx-card pz${all ? ' clear' : ''}" data-i="${i}"><span class="lx-th">${mThumb(P0.b, { [P0.best]: 'src' })}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">LEVEL ${i + 1}</span><span class="lx-st${all ? ' ok' : solved ? '' : ' new'}">${all ? '✓ ' : ''}${t('lx.solved', { a: solved, b: L.puzzles.length })}</span></span>` +
      `<b class="lx-t">${t('pz.' + L.id)}</b><small class="lx-sub">${t('rule.' + P0.rules)} · ${t('lx.moves', { n: lo === hi ? lo : lo + '–' + hi })}</small><span class="lx-desc">${t('pz.' + L.id + '.d')}</span>${lxBar(solved / L.puzzles.length, all ? 'ok' : '')}</span></button>`;
  }).join('');
  $('#pzLevels').innerHTML = `<div class="lx">${daily}<div class="lx-grid">${cards}</div></div>`;
  showPzView('pzListView'); $('#puzzleOverlay').classList.add('show');
}
$('#pzLevels').onclick = e => {
  const b = e.target.closest('.lesson-item, .lx-card'); if (!b) return;
  if (b.dataset.daily) { const dl = dailyPick(); if (dl) startPuzzle(dl.L, dl.j, dl.date); } else openPzGrid(+b.dataset.i);
};
function openPzGrid(i) {
  pzLevel = i; const pr = pzProgress(), L = PUZZLES.levels[i];
  $('#pzLevelTitle').textContent = `${i + 1}. ${t('pz.' + L.id)}`;
  // each tile shows the position (a small board) with its number
  $('#pzGrid').innerHTML = L.puzzles.map((P, j) => `<button data-j="${j}" class="th${pr[`${i}-${j}`] ? ' solved' : ''}"><span class="tth">${mThumb(P.b)}</span><span class="tn">${j + 1}</span></button>`).join('');
  showPzView('pzGridView'); $('#puzzleOverlay').classList.add('show');
}
$('#pzGrid').onclick = e => { const b = e.target.closest('button[data-j]'); if (b) startPuzzle(pzLevel, +b.dataset.j); };
$('#pzBack').onclick = () => openPuzzles();
$('#pzClose').onclick = () => $('#puzzleOverlay').classList.remove('show');
function startPuzzle(L, j, daily) {
  $('#puzzleOverlay').classList.remove('show');
  stashGame(); lesson = null; document.body.classList.remove('in-lesson');
  const pz = PUZZLES.levels[L].puzzles[j];
  puzzle = { L, j, P: pz, state: 'play', busy: false, daily: daily || null, hinted: false, N: pzN(pz), used: 0, slip: null };
  document.body.classList.add('in-puzzle');
  enterSetup(pz.b, 0, pz.rules);
  renderPuzzleCard();
  const Z = puzzle;
  pzStatus(Z.N > 1 ? t(pz.kind === 'turn' ? 'pz.startTurn2' : 'pz.startEnd2', { n: Z.N }) + pzLeftTxt(Z) : t(pz.kind === 'turn' ? 'pz.startTurn' : 'pz.startEnd'));
}
function pzGain() { return shownPos().b[6] - puzzle.P.b[6]; }
function renderPuzzleCard() {
  const Z = puzzle, L = PUZZLES.levels[Z.L], pz = Z.P;
  $('#pzStep').textContent = Z.daily ? `★ ${t('daily.title')} · ${Z.daily.slice(5).replace('-', '/')}` : `${Z.L + 1}. ${t('pz.' + L.id)} · No.${Z.j + 1}`;
  $('#pzTitle').textContent = t('pz.' + L.id);
  $('#pzGoal').innerHTML = (pz.rules !== 'kalah' ? `<small style="color:var(--accent);font-weight:500">${t('rule.' + pz.rules)}</small><br>` : '') + (pz.kind === 'turn' ? t('pz.goalTurn', { n: pz.goal }) : t('pz.goalEnd', { a: pz.goal[0], b: pz.goal[1] }));
  $('#pzNext').disabled = !!Z.daily || (Z.j + 1 >= L.puzzles.length && Z.L + 1 >= PUZZLES.levels.length);
  $('#pzHint').disabled = Z.state !== 'play' || Z.busy; $('#pzAnswer').disabled = Z.busy;
  renderInfo();
}
function pzStatus(html) { $('#pzStatus').innerHTML = html; }
function solveReq(p) { return request('ana', { type: 'solve', ...posMsg(p, puzzle.P.rules), ms: 9000 }); }
// ---------------------------------------------------------------- puzzles v2
// Every puzzle has a move count N (puzzles.json "n": your moves in the solution; each extra turn is one more move).
// N = 1: judged at once as before. N >= 2: a move off the solution does not fail at once — the opponent answers
// with its best reply and you keep playing until your N moves are used. Only an obvious mistake fails at once:
//  - "turn" puzzles (store at least `goal` seeds): a move after which an exact search proves the goal can no
//    longer be reached within the remaining moves against the opponent's best defence (pzReach; when the search
//    is too big the move is not called a mistake and play goes on). Reaching the goal within N moves by another
//    route is a success.
//  - "end" puzzles (finish with the best result against perfect play): a move that makes the result
//    (win / draw / loss) worse, or loses PZ_BLUNDER_SEEDS or more seeds against the best move. A smaller slip plays
//    on (the defender keeps answering perfectly) until N moves are used or the game ends; the best result can then
//    no longer be reached, so it is a failure that shows where you slipped.
const PZ_BLUNDER_SEEDS = 6;
// can player 0 still gain `need` seeds within r own moves, against any defence? (true / false / null = search too big)
function pzReach(b, side, need, r, rules) {
  let nodes = 0; const memo = new Map(), LIMIT = 250000;
  const rec = (b, side, need, r) => {
    if (need <= 0) return true;
    if (side === 0 && r <= 0) return false;
    if (++nodes > LIMIT) throw pzReach;
    const key = b.join(',') + '|' + side + '|' + need + '|' + r;
    if (memo.has(key)) return memo.get(key);
    let res = side === 1;
    for (let k = 0; k < 6; k++) {
      if (!b[(side ? 7 : 0) + k]) continue;
      const t = E.trace(b, side, k, rules), g = t.board[6] - b[6];
      const ok = g >= need ? true : t.over ? false : rec(t.board, t.next, need - g, side === 0 ? r - 1 : r);
      if (side === 0 && ok) { res = true; break; }
      if (side === 1 && !ok) { res = false; break; }
    }
    memo.set(key, res); return res;
  };
  try { return rec(Int8Array.from(b), side, need, r); } catch (e) { if (e === pzReach) return null; throw e; }
}
const pzN = pz => pz.n || (pz.line ? pz.line.length : 1);
const pzLeft = Z => Math.max(0, Z.N - Z.used);
const pzLeftTxt = Z => Z.N > 1 && window.PZBook ? ` <small class="pz-left">${PZBook.t('movesLeft', { n: pzLeft(Z) })}</small>` : '';
// a good move for player 0 in a turn puzzle (hint / gold ring): reach the goal this turn if possible, else keep it reachable
function pzTurnBest(p) {
  const Z = puzzle, g = E.turnMaxFirst(p.b, 0, Z.P.rules), need = Z.P.goal - pzGain();
  const k = g.findIndex(v => v !== null && v >= need); if (k >= 0) return k;
  for (let j = 0; j < 6; j++) {
    if (!p.b[j]) continue;
    const t1 = E.trace(p.b, 0, j, Z.P.rules), gg = t1.board[6] - p.b[6];
    if (gg >= need || (!t1.over && pzReach(t1.board, t1.next, need - gg, pzLeft(Z) - 1, Z.P.rules) !== false)) return j;
  }
  return g.indexOf(Math.max(...g.filter(x => x !== null)));
}
async function puzzleMove(k) {
  const Z = puzzle, pz = Z.P, p = shownPos();
  Z.busy = true; renderPuzzleCard();
  const tok = busyToken;
  if (pz.kind === 'turn') {
    const g = E.turnMaxFirst(p.b, 0, pz.rules), gain = pzGain();
    if (Z.N <= 1) {   // one-move puzzle: judged at once (as in v1)
      if (gain + g[k] < pz.goal) return puzzleFail(k, p, () => g.indexOf(Math.max(...g.filter(x => x !== null))), t('pz.failTurn', { m: k + 1, n: gain + g[k], g: pz.goal }));
    } else {
      const t1 = E.trace(p.b, 0, k, pz.rules), got = gain + t1.board[6] - p.b[6], rest = Z.N - Z.used - 1;
      if (got < pz.goal && rest > 0) {   // (the last move simply runs out of moves: not called a blunder)
        const can = t1.over ? false : pzReach(t1.board, t1.next, pz.goal - got, rest, pz.rules);
        if (can === false) return puzzleFail(k, p, () => pzTurnBest(p), `${PZBook.t('blunder')} ${t('pz.failTurn', { m: k + 1, n: gain + g[k], g: pz.goal })}`);
      }
      if (gain + g[k] < pz.goal && !Z.slip) Z.slip = { i: Z.used + 1, m: k, b: pzTurnBest(p) };
    }
    Z.used++;
    await playMove(k, { noFlow: true });
    if (puzzle !== Z || tok !== busyToken) return;
    return turnFlow(Z, tok);
  }
  // endgame puzzle: the defender plays perfectly; every move is compared with the exact optimum
  let list;
  if (cur === 0 && Z.N <= 1) list = null;
  else { pzStatus(t('pz.checking')); const r = await solveReq(p); if (puzzle !== Z || tok !== busyToken) return; list = r && r.list; }
  let ok, bestM, mine, best;
  if (!list) { ok = k === pz.best; bestM = pz.best; }
  else { best = Math.max(...list.map(x => x.v)); mine = list.find(x => x.m === k); bestM = list.reduce((a, x) => x.v > a.v ? x : a).m; ok = mine && mine.v >= best - 1e-9; }
  if (!ok) {
    const sg = v => v > 0.5 ? 1 : v < -0.5 ? -1 : 0;
    const blunder = Z.N <= 1 || !list || !mine || sg(mine.v) < sg(best) || best - mine.v >= PZ_BLUNDER_SEEDS - 1e-9;
    if (blunder) return puzzleFail(k, p, () => bestM, (Z.N > 1 ? PZBook.t('blunder') + ' ' : '') + t('pz.failEnd', { m: k + 1 }));
    if (!Z.slip) Z.slip = { i: Z.used + 1, m: k, b: bestM };
  }
  Z.used++;
  await playMove(k, { noFlow: true });
  if (puzzle !== Z || tok !== busyToken) return;
  await defenderLoop(Z, tok);
}
// turn puzzle after your move: goal reached? out of moves? otherwise the opponent answers until it is your turn again
async function turnFlow(Z, tok) {
  for (;;) {
    const q = shownPos(), gain = pzGain();
    if (Z.state === 'answer') return;
    if (gain >= Z.P.goal) return puzzleSolved(t('pz.solvedTurn', { n: gain }));
    if (q.over || (q.side === 0 && pzLeft(Z) <= 0) || (Z.N <= 1 && q.side !== 0)) return pzOutOfMoves(Z);
    if (q.side === 0) {
      Z.busy = false; renderPuzzleCard();
      pzStatus((Z.slip ? t('pz.yourMove') : `<b class="ok">${t('pz.good')}</b> ${t('pz.again', { n: Z.P.goal - gain })}`) + pzLeftTxt(Z));
      return;
    }
    // the opponent: a reply that makes the goal unreachable if there is one, else the engine's best move
    pzStatus(t('pz.opp')); thinking = 1; renderInfo();
    let m = -1;
    for (let j = 0; j < 6 && m < 0; j++) {
      if (!q.b[7 + j]) continue;
      const t1 = E.trace(q.b, 1, j, Z.P.rules), g1 = t1.board[6] - q.b[6];
      if (g1 < Z.P.goal - gain && (t1.over || pzReach(t1.board, t1.next, Z.P.goal - gain - g1, pzLeft(Z), Z.P.rules) === false)) m = j;
    }
    if (m < 0) { const r = await solveReq(q); if (puzzle !== Z || tok !== busyToken) return; m = r.list.reduce((a, x) => x.v > a.v ? x : a).m; }
    await sleep(350); if (puzzle !== Z || tok !== busyToken) return;
    thinking = -1;
    await playMove(m, { noFlow: true });
    if (puzzle !== Z || tok !== busyToken) return;
  }
}
// the move count is used up (or the game ended) without reaching the goal
function pzOutOfMoves(Z) {
  Z.state = 'fail'; Z.busy = false; thinking = -1;
  fxMarks = []; renderFx(); sWrong();
  const q = shownPos(), sl = Z.slip;
  const what = Z.P.kind === 'end' ? (q.over ? t('pz.solvedEnd', { a: q.b[6], b: q.b[13] }) + ' ' : '') : t('pz.solvedTurn', { n: pzGain() }) + ' ';
  pzStatus(`<b class="ng">${t('pz.fail')}</b> ${PZBook.t('outOfMoves', { n: Z.N })} ${what}` + (sl ? t('pz.slipAt', { i: sl.i, m: sl.m + 1, b: sl.b + 1 }) : ''));
  renderPuzzleCard();
}
async function defenderLoop(Z, tok) {
  for (;;) {
    const q = shownPos();
    if (q.over) { if (Z.state === 'answer') return answerDone(); if (Z.slip) return pzOutOfMoves(Z); return puzzleSolved(t('pz.solvedEnd', { a: q.b[6], b: q.b[13] })); }
    if (q.side === 0) {
      if (Z.state === 'answer') { await answerStep(Z, tok); return; }
      if (Z.slip && pzLeft(Z) <= 0) return pzOutOfMoves(Z);
      Z.busy = false; renderPuzzleCard(); pzStatus((Z.slip ? '' : `<b class="ok">${t('pz.good')}</b> `) + t('pz.yourMove') + pzLeftTxt(Z)); return;
    }
    pzStatus(t('pz.opp')); thinking = 1; renderInfo();
    const r = await solveReq(q);
    if (puzzle !== Z || tok !== busyToken) return;
    thinking = -1;
    const m = r.list.reduce((a, x) => x.v > a.v ? x : a).m;
    await sleep(350); if (puzzle !== Z || tok !== busyToken) return;
    await playMove(m, { noFlow: true });
    if (puzzle !== Z || tok !== busyToken) return;
  }
}
function puzzleFail(k, p, bestFn, msg) {
  const Z = puzzle; Z.state = 'fail'; Z.busy = false;
  const best = bestFn();
  fxMarks = [{ at: pitIndex(0, best), ring: true, cls: 'ok' }, { at: pitIndex(0, k), ring: true, cls: 'ng' }];
  renderFx(); sWrong();
  pzStatus(`<b class="ng">${t('pz.fail')}</b> ${msg} ${t('pz.bestWas', { m: best + 1 })}`);
  renderPuzzleCard();
}
function puzzleSolved(msg) {
  const Z = puzzle; if (!Z) return;
  if (Z.state === 'answer') return answerDone();
  Z.state = 'solved'; Z.busy = false;
  if (Z.slip) Z.hinted = true;   // solved by another route after leaving the solution: counted like a hinted solve (★★)
  const pr = pzProgress(); pr[`${Z.L}-${Z.j}`] = true;
  try { localStorage.setItem(PZ_STORE, JSON.stringify(pr)); } catch (e) {}
  if (Z.daily) dailySolved(Z.daily, Z.hinted);
  pzStatus(`<b class="ok">${t('pz.solved')}</b> ${msg}` + (Z.daily ? `<br>${t('daily.streak', { n: dailyInfo().streak })}` : ''));
  sChime(1); confetti(); renderPuzzleCard();
}
function answerDone() { const Z = puzzle; Z.busy = false; Z.state = 'done'; renderPuzzleCard(); pzStatus(t('pz.answerDone')); }
$('#pzRetry').onclick = () => { if (puzzle) { const h = puzzle.hinted; startPuzzle(puzzle.L, puzzle.j, puzzle.daily); puzzle.hinted = h; } };
$('#pzNext').onclick = () => {
  if (!puzzle) return;
  let { L, j } = puzzle; j++;
  if (j >= PUZZLES.levels[L].puzzles.length) { L++; j = 0; }
  if (L < PUZZLES.levels.length) startPuzzle(L, j);
};
$('#pzList').onclick = () => { if (!puzzle) return; if (puzzle.daily) openPuzzles(); else openPzGrid(puzzle.L); };
$('#pzQuit').onclick = () => quitSpecial();
$('#pzHint').onclick = async () => {
  const Z = puzzle; if (!Z || Z.state !== 'play' || Z.busy) return;
  Z.hinted = true;
  const p = shownPos(); let k;
  if (Z.P.kind === 'turn') { k = pzTurnBest(p); pzStatus(t('pz.hintTurn')); }
  else if (cur === 0) { k = Z.P.best; pzStatus(t('pz.hintEnd')); }
  else { const r = await solveReq(p); if (puzzle !== Z) return; k = r.list.reduce((a, x) => x.v > a.v ? x : a).m; pzStatus(t('pz.hintEnd')); }
  fxMarks = [{ at: pitIndex(0, k), ring: true, cls: 'ok' }]; renderFx();
};
async function answerStep(Z, tok) {
  const p = shownPos();
  let k;
  if (Z.P.kind === 'turn') { const g = E.turnMaxFirst(p.b, 0, Z.P.rules), need = Z.P.goal - pzGain(); k = g.findIndex(v => v !== null && v >= need); }
  else if (cur === 0) k = Z.P.best;
  else { const r = await solveReq(p); if (puzzle !== Z || tok !== busyToken) return; k = r.list.reduce((a, x) => x.v > a.v ? x : a).m; }
  fxMarks = []; await sleep(450); if (puzzle !== Z || tok !== busyToken) return;
  await playMove(k, { noFlow: true });
  if (puzzle !== Z || tok !== busyToken) return;
  const q = shownPos();
  if (Z.P.kind === 'turn') { if (q.over || q.side !== 0) return answerDone(); return answerStep(Z, tok); }
  return defenderLoop(Z, tok);
}
$('#pzAnswer').onclick = () => {
  const Z0 = puzzle; if (!Z0 || Z0.busy) return;
  startPuzzle(Z0.L, Z0.j, Z0.daily);
  const Z = puzzle; Z.state = 'answer'; Z.busy = true; Z.hinted = true; renderPuzzleCard();
  pzStatus(t('pz.showing'));
  answerStep(Z, busyToken);
};

// ====================================================================== post-game review
const RV_WORKERS = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
let rv = null, rvOpen = false;
function rvCancel() {
  if (rv && rv.ws) { rv.ws.forEach(w => { w.terminate(); w.jobs.forEach(j => j.resolve(null)); }); rv.ws = null; }
  if (rv && rv.running) rv = null;
}
const rvKey = () => game.rules + game.seeds + ':' + game.moves.join('');
async function runReview() {
  if (lesson || puzzle) return;
  if (!game.moves.length) { toast(t('nokifu')); return; }
  if (rv && rv.key === rvKey()) { rvOpen = true; renderInfo(); renderFx(); revealReview(); return; }
  rvCancel();
  const key = rvKey(), N = game.moves.length, Ps = P.slice(), rules = game.rules;
  const run = rv = { key, list: [], done: 0, total: N, running: true, ws: [] };
  for (let k = 0; k < RV_WORKERS; k++) run.ws.push(makeWorker());
  rvOpen = true; renderInfo(); revealReview();
  let next = N - 1;   // from the end: late positions are solved exactly and warm the tables
  const loop = async w => {
    while (next >= 0 && rv === run) {
      const i = next--;
      let list = anaLists[i];
      if (!list) {
        const res = await new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve }); w.postMessage({ type: 'analyze', ...posMsg(Ps[i], rules), ms: 650, id }); });
        if (rv !== run || !res) return;
        list = res.list; anaLists[i] = list;
        let best = -1e9; for (const x of list) best = Math.max(best, x.v);
        if (!evals[i] || !evals[i].exact) evals[i] = { v: Ps[i].side === 0 ? best : -best, exact: res.exact };
      }
      run.list[i] = list; run.done++;
      renderReview(); renderGraph();
    }
  };
  await Promise.all(run.ws.map(loop));
  if (rv !== run) return;
  run.ws.forEach(w => w.terminate()); run.ws = null; run.running = false;
  save(); renderInfo(); renderFx(); toast(t('rv.done'), 1200);
}
function revealReview() { if (matchMedia('(max-aspect-ratio: 1/1) and (pointer: coarse)').matches) setTimeout(() => $('#reviewCard').scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60); }
function rvJudge(i) {
  if (!rv || rv.key !== rvKey()) return null;
  const L = rv.list[i]; if (!L || L.length < 2) return null;
  const k = game.moves[i], mine = L.find(x => x.m === k); if (!mine) return null;
  let best = L[0]; for (const x of L) if (x.v > best.v) best = x;
  const loss = Math.max(0, best.v - mine.v);
  const flips = mine.exact && best.exact && Math.sign(Math.round(best.v)) > Math.sign(Math.round(mine.v));
  const q = loss < 0.3 ? 'best' : flips || loss >= 4 ? 'bad' : loss < 1.5 ? 'good' : 'dubious';
  return { q, loss, best: best.m, k, side: P[i].side, exact: mine.exact && best.exact };
}
function renderReview() {
  const card = $('#reviewCard');
  if (rv && rv.key !== rvKey() && !rv.running) { rv = null; rvOpen = false; }
  const show = !lesson && !puzzle && rvOpen && rv;
  card.classList.toggle('show', !!show);
  if (!show) return;
  let html;
  if (rv.running) html = `<div style="font-size:12px;color:var(--muted)">${t('rv.running', { a: rv.done, b: rv.total })}</div><div class="rv-prog"><i style="width:${rv.total ? rv.done / rv.total * 100 : 0}%"></i></div>`;
  else {
    const st = [0, 1].map(() => ({ n: 0, ok: 0, bad: 0, dubious: 0, loss: 0 })), list = [];
    for (let i = 0; i < game.moves.length; i++) {
      const j = rvJudge(i); if (!j) continue;
      const s = st[j.side]; s.n++; s.loss += j.loss; if (j.q === 'best') s.ok++; if (j.q === 'bad' || j.q === 'dubious') { s[j.q]++; list.push({ i, ...j }); }
    }
    const row = p => { const s = st[p]; return `<span class="who"><span class="pdisc p${p}"></span>${shortName(p)}</span><span><b>${s.n ? Math.round(s.ok / s.n * 100) : 0}%</b> <span class="h">${t('rv.avg', { l: s.n ? (s.loss / s.n).toFixed(1) : '0.0' })}</span></span><span class="rv-chips"><span class="bad">${t('q.bad')} ${s.bad}</span><span class="dubious">${t('q.dubious')} ${s.dubious}</span></span>`; };
    html = `<div class="rv-sum"><span></span><span class="h">${t('rv.acc')}</span><span></span>${row(0)}${row(1)}</div>`;
    const shown = list.length > 10 ? list.slice().sort((a, b) => b.loss - a.loss).slice(0, 10).sort((a, b) => a.i - b.i) : list;
    if (shown.length) html += `<div class="rv-list">${shown.map(x => `<button data-i="${x.i}" class="${cur === x.i ? 'cur' : ''}"><span class="tag ${x.q}">${t('q.' + x.q)}</span><span class="mv">${x.i + 1}. <i class="p${x.side}"></i>${x.k + 1} → ${x.best + 1}</span><span class="ls">−${(Math.round(x.loss * 10) / 10)}</span></button>`).join('')}</div>`;
    else html += `<div class="rv-note" style="color:#8fe3b8">${t('rv.clean')}</div>`;
    html += `<div class="rv-note">${t('rv.note')}</div>`;
  }
  $('#rvBody').innerHTML = html;
}
// the viewed position in a finished review: per-pit values, the move played and the best move
function drawReviewFx() {
  if (lesson || puzzle || !rvOpen || !rv || rv.running || rv.key !== rvKey() || cur >= game.moves.length) return false;
  const L = rv.list[cur]; if (!L) return false;
  const p = shownPos(); let best = -1e9; for (const x of L) best = Math.max(best, x.v);
  for (const x of L) { const i = pitIndex(p.side, x.m), u = slotUV(i); fxAt(i, 0, u.bottom ? -0.36 : 0.36, 'hintlbl' + (x.v >= best - 1e-9 ? ' best' : '') + (x.v < 0 ? ' neg' : ''), fmtV(x.v, x.exact)); }
  const j = rvJudge(cur);
  fxRing(pitIndex(p.side, game.moves[cur]), 'played' + (j && (j.q === 'bad' || j.q === 'dubious') ? ' ' + j.q : ''));
  return true;
}
$('#rvBody').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
$('#rvClose').onclick = () => { rvOpen = false; if (rv && rv.running) rvCancel(); renderInfo(); renderFx(); };
$('#btnAnalyze').onclick = () => runReview();

// ====================================================================== share / load
const RULE_CODE = { kalah: 'kalah', basic: 'basic', easy: 'easy', sunka: 'sunka' };
function parseGameText(v) {
  v = (v || '').trim(); let n, r = null, s = null;
  const h = v.match(/#(.*)$/) || (/(^|&)k=/.test(v) ? [null, v] : null);
  if (h) { const q = new URLSearchParams(h[1]); if (!q.has('k')) return null; v = q.get('k') || ''; if (q.has('n')) n = parseInt(q.get('n'), 10); r = q.get('r'); s = q.get('s'); }
  if (!/^[\s1-6,.-]*$/.test(v)) return null;
  const moves = v.replace(/[^1-6]/g, '').split('').map(c => +c - 1);
  return { moves, n, rules: RULE_CODE[r] || 'kalah', seeds: s === '6' ? 6 : 4 };
}
function openLoaded(d) {
  ['#resultOverlay', '#newOverlay', '#lessonOverlay', '#puzzleOverlay', '#pasteOverlay', '#rulesOverlay'].forEach(s => $(s).classList.remove('show'));
  if (lesson || puzzle) { savedGame = null; exitSpecial(); }
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); rvCancel(); rv = null; rvOpen = false; thinking = -1; stopAnim(); stopPlay();
  settings.mode = 'pvp'; settings.rules = d.rules; settings.seeds = d.seeds;
  game = { rules: d.rules, seeds: d.seeds, moves: d.moves.slice(), human: 0, setup: null };
  recompute(); evals = []; anaLists = []; fxMarks = [];
  cur = d.n === undefined || isNaN(d.n) ? game.moves.length : Math.max(0, Math.min(game.moves.length, d.n));
  reviewing = cur !== game.moves.length; gameOverShown = isOver(game.moves.length);
  resetSeeds(); layout(); update(); save(); afterPosition();
}
function loadText(v) {
  const d = parseGameText(v);
  if (!d || !d.moves.length) { toast(t('paste.invalid'), 2200); return false; }
  const r = E.replay(E.initial(d.seeds), 0, d.moves, d.rules);
  if (r.bad >= 0) { toast(t('paste.bad', { n: r.bad + 1 }), 2500); return false; }
  openLoaded(d); toast(t('paste.loaded', { n: d.moves.length }), 1800);
  return true;
}
function loadFromHash() {
  const h = location.hash.slice(1); if (!h || !new URLSearchParams(h).has('k')) return false;
  try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  return loadText('#' + h);
}
window.addEventListener('hashchange', () => { if (/[#&]k=/.test(location.hash)) loadFromHash(); });
$('#btnShare').onclick = async () => {
  if (!game.moves.length || game.setup) { toast(t('nokifu')); return; }
  const url = location.origin + location.pathname + '#k=' + game.moves.map(k => k + 1).join('') + '&r=' + game.rules + '&s=' + game.seeds + (cur < game.moves.length ? '&n=' + cur : '');
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: 'Luxe Mancala', url }); return; }
    await navigator.clipboard.writeText(url); toast(t('share.copied'), 1400);
  } catch (e) { if (e && e.name === 'AbortError') return; toast(url, 4000); }
};
$('#btnPaste').onclick = () => { $('#pasteText').value = ''; $('#pasteOverlay').classList.add('show'); setTimeout(() => $('#pasteText').focus(), 50); };
$('#pasteCancel').onclick = () => $('#pasteOverlay').classList.remove('show');
$('#pasteOk').onclick = () => { const v = $('#pasteText').value; if (!v.trim()) { toast(t('nokifu')); return; } loadText(v); };
$('#pasteText').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#pasteOk').click(); } });

// ====================================================================== daily puzzle
const DAILY_STORE = STORE + '-daily';
let daily = { last: '', streak: 0, best: 0, days: {} };
try { Object.assign(daily, JSON.parse(localStorage.getItem(DAILY_STORE) || '{}')); } catch (e) {}
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function dailyPick() {
  if (!PUZZLES || PUZZLES.levels.length < 5) return null;
  const now = new Date(), date = ymd(now);
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
  const L = [3, 0, 1, 2, 4, 2, 3][now.getDay()];   // Sun..Sat: easier early in the week, deep endgames at the weekend
  const n = PUZZLES.levels[L].puzzles.length;
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

// ====================================================================== dialogs: outside click, resume popup
const OUTSIDE = { rotTipOverlay: '#rotTipNo', newOverlay: '#btnCancelNew', resultOverlay: '#btnReview', pasteOverlay: '#pasteCancel', puzzleOverlay: '#pzClose', rulesOverlay: '#rulesClose', resumeOverlay: '#rsCancel' };
function outsideClose(o) {
  if (o.id === 'lessonOverlay') { if (!$('#lessonDoneView').classList.contains('hidden')) $('#btnLessonQuit2').click(); else $('#btnLessonClose').click(); return; }
  const b = OUTSIDE[o.id] && $(OUTSIDE[o.id]);
  if (b) b.click(); else o.classList.remove('show');
}
document.querySelectorAll('.overlay').forEach(o => {
  let down = false;
  o.addEventListener('pointerdown', e => { down = e.target === o; });
  o.addEventListener('click', e => { if (e.target !== o || !down) return; down = false; outsideClose(o); });
});
// the game title in the header: back to the board from lessons, puzzles and dialogs
function backToBoard() {
  document.querySelectorAll('.overlay.show').forEach(o => outsideClose(o));
  if (lesson || puzzle) quitSpecial();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
(() => {
  const h = document.querySelector('.brand h1.to-board'); if (!h) return;
  h.addEventListener('click', backToBoard);
  h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); backToBoard(); } });
})();
function rsInProgress() { return !lesson && !puzzle && game.moves.length > 0 && !isOver(game.moves.length); }
function rsOpen() {
  if (!rsInProgress() && !reviewing) { openNewDialog(); return; }
  $('#rsText').textContent = reviewing ? t('rs.viewing', { n: cur }) : t('rs.playing', { n: game.moves.length });
  $('#resumeOverlay').classList.add('show');
}
$('#rsCancel').onclick = () => $('#resumeOverlay').classList.remove('show');
$('#rsRestart').onclick = () => { $('#resumeOverlay').classList.remove('show'); openNewDialog(); };
$('#rsResume').onclick = () => { $('#resumeOverlay').classList.remove('show'); if (reviewing) resumeHere(); };

// ====================================================================== landscape option (phones)
const ROT_KEY = 'aicoding-mancala-landscape';
function rotOn() { try { return localStorage.getItem(ROT_KEY) === '1'; } catch (e) { return false; } }
function renderRotBtn() { const b = $('#btnRot'); if (b) b.classList.toggle('on', rotOn()); }
$('#btnRot').onclick = async () => {
  const want = !rotOn();
  try { localStorage.setItem(ROT_KEY, want ? '1' : '0'); } catch (e) {}
  renderRotBtn();
  if (want) {
    toast(t('rot.title') + ' ON', 1200);
    if (window.innerWidth > window.innerHeight) return;            // already held sideways
    let locked = false;
    try {                                                          // Android: real fullscreen + orientation lock
      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      if (screen.orientation && screen.orientation.lock) {
        await Promise.race([screen.orientation.lock('landscape'), sleep(1500).then(() => { throw new Error('lock timeout'); })]);
        await sleep(350); locked = window.innerWidth > window.innerHeight;   // only trust it if the viewport really turned
      }
    } catch (e) {}
    if (!locked) { try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) {} location.reload(); }   // iOS etc.: turned iframe
  } else {
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) {}
    if (window.__EMBED && window.top !== window) window.top.location.reload();
  }
};
if (window.__EMBED) document.querySelectorAll('a.home, a.series').forEach(a => { a.target = '_top'; });
renderRotBtn();

// tip for phone users: landscape mode exists. Shown on every visit in portrait while the option is off,
// queued until no dialog is open (new-game dialog, resumed game, lesson / puzzle, animations)
let rotTipDone = false;
function rotTipEligible() { return !window.__EMBED && !window.__ROTWRAP && !rotOn() && matchMedia('(pointer: coarse)').matches; }
function maybeRotTip() { /* kept for the dialog handlers; the queue below does the work */ }
function startRotTip() {
  if (!rotTipEligible()) return;
  const iv = setInterval(() => {
    if (rotTipDone || !rotTipEligible()) { clearInterval(iv); return; }
    if (window.innerWidth > window.innerHeight) return;                       // held sideways: wait
    if (document.querySelector('.overlay.show') || lesson || puzzle || animating || document.hidden) return;
    clearInterval(iv); rotTipDone = true;
    $('#rotTipOverlay').classList.add('show');
  }, 700);
}
$('#rotTipYes').onclick = () => { $('#rotTipOverlay').classList.remove('show'); if (!rotOn()) $('#btnRot').click(); };
$('#rotTipNo').onclick = () => {
  $('#rotTipOverlay').classList.remove('show');
  const b = $('#btnRot'); b.classList.add('hintpulse'); setTimeout(() => b.classList.remove('hintpulse'), 5000);
};

// ====================================================================== boot
// animated background: off with the animation setting, paused while the tab is hidden
function applyBg() { document.body.classList.toggle('no-bganim', !settings.anim); }
document.addEventListener('visibilitychange', () => { const b = document.getElementById('bgfx'); if (b) b.classList.toggle('paused', document.hidden); });
buildBoard();
const hadSave = load();
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
try { const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) { LANG = q; try { localStorage.setItem('aicoding-lang', q); } catch (_) {} } } catch (e) {}
applyI18n();
if (window.PZBook) PZBook.setLang(LANG);
// PC header bar: title left, menu (new > undo > hint > rules > lessons > puzzles) + icons right, game info in between
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnHint', '#btnRules', '#btnLesson', '#btnPuzzle'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => { setTimeout(layout, 30); renderInfo(); });
applyBg();
startRotTip();
if (!P.length) recompute();
$('#langSel').onchange = e => {
  LANG = e.target.value; settings.lang = LANG; save(); applyI18n();
  if (window.PZBook) PZBook.setLang(LANG);
  if (HB) HB.relabel();
  try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {}
  renderInfo(); renderFx();
  if ($('#newOverlay').classList.contains('show')) segSync();
  if ($('#rulesOverlay').classList.contains('show')) renderRules();
  if (lesson) renderLessonCard();
  if (puzzle) renderPuzzleCard();
  if ($('#lessonOverlay').classList.contains('show')) { if (!$('#lessonListView').classList.contains('hidden')) openLessons(); else if (!$('#lessonIntroView').classList.contains('hidden')) openIntro(introIdx); }
  if ($('#puzzleOverlay').classList.contains('show')) { if (!$('#pzListView').classList.contains('hidden')) openPuzzles(); else openPzGrid(pzLevel); }
};
// Phones: the board size is computed once and only recomputed when the width or the orientation really changes,
// so the address bar appearing / disappearing while scrolling never resizes the board.
const coarseMQ = matchMedia('(pointer: coarse)');
let fixW = 0, fixH = 0, fixPortrait = null;
function fixSize() {
  const root = document.documentElement.style;
  if (!coarseMQ.matches) { root.removeProperty('--u'); root.removeProperty('--vh'); fixW = 0; return; }
  const W = window.innerWidth, H = window.innerHeight, portrait = H >= W;
  // a height-only change from the browser bars keeps the size; a big height change (or a bogus first measurement
  // taken mid-rotation / while an iframe is still sizing) is recomputed
  if (W === fixW && portrait === fixPortrait && Math.abs(H - fixH) < fixH * 0.25) return;
  if (W < 200 || H < 200) { fixW = 0; root.removeProperty('--u'); return; }   // transient: wait for a real size
  fixW = W; fixH = H; fixPortrait = portrait;
  root.setProperty('--vh', H + 'px');
  if (portrait) root.setProperty('--u', Math.floor(Math.min((W - 24) / 4.2, (H - 172) / 9.7, 100)) + 'px');
  else if (H <= 560 || W <= 900) root.setProperty('--u', Math.floor(Math.min((H - 6 - 34 - 6 - 8) / 4.2, (W - 24) / 9.7, 110)) + 'px');   // board across the width, cards below
  else root.removeProperty('--u');
}
fixSize();
let rzT = 0;
window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { fixSize(); layout(); }, 60); });
window.addEventListener('orientationchange', () => setTimeout(() => { fixW = 0; fixSize(); layout(); }, 120));
if (window.ResizeObserver) { let lastBW = 0, lastBH = 0; new ResizeObserver(() => { const w = boardEl.clientWidth, h = boardEl.clientHeight; if (w !== lastBW || h !== lastBH) { lastBW = w; lastBH = h; if (w && h) layout(); } }).observe(boardEl); }
if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { fixSize(); layout(); }, 80); });
requestAnimationFrame(() => {
  layout();
  if (loadFromHash()) { /* shared game opened */ }
  else if (!hadSave) { update(); openNewDialog(); }
  else { update(); if (!isOver()) toast(t('saved'), 1400); afterPosition(); }
});
// test hooks
window.__mancala = { get game() { return game; }, get cur() { return cur; }, get P() { return P; }, settings, get rv() { return rv; }, rvJudge, dailyPick, parseGameText, onPit, newGame, get lesson() { return lesson; }, get puzzle() { return puzzle; }, get animating() { return animating; }, get thinking() { return thinking; }, startPuzzle, startLesson, viewAt };

// first-time banner in the new-game dialog → illustrated rules
if (window.RulesOffer) RulesOffer.init({ game: 'mancala', lang: () => LANG, open: () => openRules(), watch: '#rulesOverlay' });
