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
  { const rb = $('#btnResign span'); if (rb) { rb.textContent = Resign.label(LANG); rb.parentNode.title = Resign.label(LANG); } }
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
let study = null, bxHover = -1;   // 検討 (study) mode of the PC review box: { g: game, n: moves, base, moves: [], P: [] }; hovered candidate
function inStudy() { return !!(study && study.g === game && study.n === game.moves.length && !lesson && !puzzle); }
function studyTop() { return study.P[study.P.length - 1]; }
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
const shownPos = () => inStudy() ? studyTop() : P[cur];
const isOver = i => P[i === undefined ? cur : i].over;
// resignation (common 投了 button): game.resigned = side that resigned; the game then ends at its last move
const resignedNow = () => !lesson && !puzzle && game.resigned != null;
const RSG_T = {
  ja: { you: 'あなたが投了しました', p: '{c}が投了しました' }, en: { you: 'You resigned', p: '{c} resigned' },
  zh: { you: '你认输了', p: '{c}认输' }, ko: { you: '기권했습니다', p: '{c} 기권' },
  es: { you: 'Te has rendido', p: '{c} se rindió' }, fr: { you: 'Vous avez abandonné', p: '{c} abandonne' },
  pt: { you: 'Você desistiu', p: '{c} desistiu' }, de: { you: 'Du hast aufgegeben', p: '{c} gibt auf' },
  hi: { you: 'आपने हार मान ली', p: '{c} ने हार मान ली' }, ar: { you: 'لقد استسلمت', p: 'استسلم {c}' },
};
function resignText() { const L = RSG_T[LANG] || RSG_T.en, s = game.resigned; return settings.mode === 'ai' && s === game.human ? L.you : L.p.replace('{c}', shortName(s)); }
function resignWinText() { const w = 1 - game.resigned; if (settings.mode === 'online' && window.olTurnText) return olTurnText(shownPos()) || ''; return settings.mode === 'ai' ? (w === game.human ? t('res.youWin') : t('res.aiWin')) : t('res.pWin', { c: shortName(w) }); }

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!d) return false;
    Object.assign(settings, d.settings || {});
    if (!E.RULES[settings.rules]) settings.rules = 'kalah';
    if (settings.mode === 'online') settings.mode = 'pvp';
    if (d.game && E.RULES[d.game.rules] && [4, 6].includes(d.game.seeds) && Array.isArray(d.game.moves)) {
      game = { rules: d.game.rules, seeds: d.game.seeds, moves: d.game.moves.filter(x => x >= 0 && x <= 5), human: d.game.human ? 1 : 0, setup: null, resigned: d.game.resigned === 0 || d.game.resigned === 1 ? d.game.resigned : null };
      evals = Array.isArray(d.evals) ? d.evals : [];
      recompute(); cur = game.moves.length;
      gameOverShown = isOver() || game.resigned != null;
      return true;
    }
  } catch (e) {}
  return false;
}
function save() {
  if (settings.mode === 'online') return;   // an online game is not kept as the local game (online-ui.js restores the local one afterwards)
  if (lesson || puzzle) { try { const d = JSON.parse(localStorage.getItem(STORE) || '{}'); d.settings = settings; localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {} return; }
  try { localStorage.setItem(STORE, JSON.stringify({ settings, game: { rules: game.rules, seeds: game.seeds, moves: game.moves, human: game.human, resigned: game.resigned != null ? game.resigned : null }, evals: evals.slice(0, game.moves.length + 1) })); } catch (e) {}
}

// ====================================================================== workers
let jobId = 0;
function makeWorker() {
  const w = new Worker('engine.js?v=20261028B10');
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
function bottomSide() { return ((settings.mode === 'ai' || settings.mode === 'online') && !lesson && !puzzle) ? game.human : 0; }
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
  vert = matchMedia('(max-aspect-ratio: 1/1)').matches && !(window.HeaderBar && matchMedia(HeaderBar.MEDIA).matches);   // any portrait window in the phone layout: the board stands upright (PC layout: always across)
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
  if (inStudy()) { drawStudyFx(); drawBoxFx(); if (hoverPit >= 0) drawPreview(hoverPit); return; }
  if (drawReviewFx()) { drawBoxFx(); return; }
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
  if (inStudy()) return true;
  if (lesson) return !lesson.answered && p.side === 0;
  if (puzzle) return puzzle.state === 'play' && !puzzle.busy && p.side === 0;
  if (reviewing || resignedNow()) return false;
  if (settings.mode === 'online') return !!(window.olCanMove && olCanMove());
  return !isAISide(p.side) && thinking < 0;
}
function sideName(s) {
  if (lesson || puzzle) return s === 0 ? t('you') : (puzzle && puzzle.P.kind === 'end' ? t('defender') : t('opp'));
  if (settings.mode === 'online' && window.olPlayerName) return olPlayerName(s);
  if (settings.mode === 'ai') return s === game.human ? t('you') : `AI ${LV(settings.level)}`;
  if (settings.mode === 'watch') return `AI ${LV(levelFor(s))}`;
  return t(s === 0 ? 'p0' : 'p1');
}
function shortName(s) {
  if (settings.mode === 'online' && window.olShortName && !lesson && !puzzle) return olShortName(s);
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
    const done = p.over || (resignedNow() && cur === game.moves.length);
    const active = !done && p.side === s && !animating;
    pl.classList.toggle('active', !done && p.side === s);
    pl.classList.toggle('thinking', thinking === s);
    let st = '';
    if (thinking === s) st = t('thinking');
    else if (resignedNow() && cur === game.moves.length) st = s === game.resigned ? (settings.mode === 'online' && window.olLoserLabel ? olLoserLabel() : Resign.label(LANG)) : t('st.win');
    else if (p.over) { const a = p.b[E.storeOf(s)], o = p.b[E.storeOf(1 - s)]; st = a > o ? t('st.win') : a === o ? t('st.draw') : ''; }
    else if (active && p.mv && p.mv.extra && p.mv.side === s) st = t('st.again');
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
  if (inStudy() && !p.over) txt = t('turn.p', { c: shortName(p.side) });
  else if (settings.mode === 'online' && window.olTurnText && !lesson && !puzzle) txt = olTurnText(p) || '';
  else if (resignedNow() && cur === game.moves.length) txt = resignWinText();
  else if (p.over) { const a = p.b[6], o = p.b[13]; txt = a === o ? t('res.draw') : (settings.mode === 'ai' && !lesson && !puzzle) ? ((a > o ? 0 : 1) === game.human ? t('res.youWin') : t('res.aiWin')) : t('res.pWin', { c: shortName(a > o ? 0 : 1) }); }
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
  if (inStudy()) { const L = bxCache.get(bxKey(p)); ev = p.over ? { v: p.b[6] - p.b[13], exact: true, final: true } : L && L.length ? { v: p.side === 0 ? L[0].v : -L[0].v, exact: L[0].exact } : null; }
  $('#evalText').textContent = evalText(ev);
  $('#evalFill').style.width = (50 + 50 * (ev ? sq(ev.v) : 0)) + '%';
  renderGraph(); renderKifu();
  $('#btnUndo').disabled = !canUndo();
  $('#btnResign').disabled = !canResign();
  $('#btnHint').classList.toggle('on', settings.hint);
  $('#btnHint').disabled = settings.mode === 'watch' || settings.mode === 'online';
  $('#btnSound').classList.toggle('on', settings.sound);
  $('#btnShare').disabled = !game.moves.length;
  $('#btnAnalyze').disabled = !game.moves.length;
  renderReview(); renderBox();
  const nav = $('#navBar'); nav.querySelector('[data-n=first]').disabled = nav.querySelector('[data-n=prev]').disabled = cur === 0;
  nav.querySelector('[data-n=next]').disabled = nav.querySelector('[data-n=last]').disabled = cur >= game.moves.length;
  const mode = settings.mode === 'ai' ? `AI Lv.${settings.level} ${LV(settings.level)}` : settings.mode === 'watch' ? `Lv.${settings.level} vs Lv.${settings.level2}` : t('ng.pvp');
  $('#infoLine').textContent = `${t('rule.' + game.rules)} · ${t('ng.seedsN', { n: game.seeds })} · ${mode} · ${t('info.moves', { n: game.moves.length })}`;
  hbInfo(p, ev);
  if (window.olAfterInfo) olAfterInfo();
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
  game = { rules: settings.rules, seeds: settings.seeds, moves: [], human, setup: null, resigned: null };
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
  if (!canHumanPlay()) {
    if (inStudy()) return;
    if (settings.mode === 'online' && !lesson && !puzzle) { if (reviewing && !animating) viewAt(game.moves.length); return; }   // online: a tap while looking back returns to the game
    if (reviewing && !lesson && !puzzle && !animating) rsOpen(); return;
  }
  if (ownerOf(i) !== p.side) return;
  if (!p.b[i]) { toast(t('emptyPit'), 1000); return; }
  const k = i % 7;
  setHover(-1);
  if (inStudy()) return studyMove(k);
  if (lesson) return lessonAnswer(k);
  if (puzzle) return puzzleMove(k);
  if (settings.mode === 'online') { if (window.olHumanMove) olHumanMove(k); return; }
  const q = settings.coach && settings.mode !== 'watch' ? judgeCoach(cur, k) : null;
  playMove(k).then(() => { if (q) coach(q.text, 'q-' + q.cls); });
}
// play move k from the shown position (truncating any future), animate it, then continue the game
async function playMove(k, opts) {
  const from = shownPos(), idx = cur;
  game.moves = game.moves.slice(0, cur); game.moves.push(k); game.resigned = null;
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
  if (inStudy()) return;
  const p = shownPos();
  if (p.over) { if (!lesson && !puzzle && cur === game.moves.length && settings.mode !== 'online') setTimeout(() => { if (tok === busyToken) onGameEnd(); }, 350); return; }
  if (lesson || puzzle) return;
  if (settings.mode === 'online') { if (!(window.olNoAna && olNoAna())) analyzeCurrent(tok); return; }   // online: the result comes from online-ui.js; no analysis while it is played
  if (resignedNow()) { if (reviewing) analyzeCurrent(tok); return; }
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
  if (settings.mode === 'online' && window.olNoAna && olNoAna()) return;
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
  if (cur !== game.moves.length || gameOverShown || settings.mode === 'online') return;
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
function canResign() {
  if (inStudy()) return false;
  if (settings.mode === 'online') return !lesson && !puzzle && !!(window.olLive && olLive());
  if (lesson || puzzle || settings.mode === 'watch' || !P.length || resignedNow()) return false;
  return !P[game.moves.length].over;
}
// 投了: vs AI you lose; in a 2-player game the side to move resigns
function resignGame() {
  if (!canResign()) return;
  if (settings.mode === 'online') { if (window.olResignGame) olResignGame(); return; }
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = -1; stopAnim(); stopPlay();
  game.resigned = settings.mode === 'ai' ? game.human : P[game.moves.length].side;
  cur = game.moves.length; reviewing = false; fxMarks = []; gameOverShown = true;
  update(); save();
  const aiWin = settings.mode === 'ai';
  sChime(aiWin ? -1 : 1);
  if (!aiWin) confetti();
  $('#resultTitle').textContent = resignWinText();
  const b = shownPos().b; $('#res0').textContent = b[6]; $('#res1').textContent = b[13];
  let sub = `${resignText()}<br>${t('rule.' + game.rules)} · ${t('ng.seedsN', { n: game.seeds })} · ${t('info.moves', { n: game.moves.length })}`;
  if (settings.mode === 'ai') sub += '<br>' + t('res.vs', { name: LV(settings.level), lv: settings.level });
  $('#resultSub').innerHTML = sub;
  setTimeout(() => $('#resultOverlay').classList.add('show'), 300);
}
function canUndo() {
  if (inStudy()) return false;
  if (lesson || puzzle || settings.mode === 'watch' || settings.mode === 'online' || !P.length) return false;
  if (settings.mode === 'pvp') return cur > 0;
  for (let i = cur - 1; i >= 0; i--) if (P[i].side === game.human) return true;
  return false;
}
function undo() {
  if (!canUndo()) return;
  busyToken++; cancelWorker('ai'); thinking = -1; stopAnim(); stopPlay();
  let i = cur - 1;
  if (settings.mode === 'ai') while (i > 0 && P[i].side !== game.human) i--;
  game.moves = game.moves.slice(0, i); game.resigned = null; recompute(); cur = i; reviewing = false; gameOverShown = false; fxMarks = [];
  evals.length = Math.min(evals.length, i + 1); anaLists.length = Math.min(anaLists.length, i + 1);
  $('#resultOverlay').classList.remove('show');
  update(); save(); afterPosition();
}
function viewAt(i) {
  if (lesson || puzzle) return;
  i = Math.max(0, Math.min(game.moves.length, i));
  if (study) { const s = inStudy(); study = null; bxHover = -1; if (s && i === cur) { busyToken++; stopAnim(); fxMarks = []; update(); afterPosition(); return; } }
  if (i === cur && !animating) return;
  busyToken++; cancelWorker('ai'); thinking = -1; stopAnim();
  cur = i; reviewing = i !== game.moves.length; fxMarks = [];
  update(); afterPosition();
}
function resumeHere() {
  if (!reviewing || settings.mode === 'online') return;
  game.moves = game.moves.slice(0, cur); game.resigned = null; recompute(); reviewing = false; gameOverShown = false;
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
$('#btnResign').onclick = () => { if (canResign()) Resign.confirm({ lang: LANG }).then(ok => { if (ok) resignGame(); }); };
$('#btnHint').onclick = () => {
  settings.hint = !settings.hint; save();
  if (settings.hint) { if (!anaLists[cur]) analyzeCurrent(busyToken); else renderFx(); }
  else renderFx();
  renderInfo();
};
$('#btnSound').onclick = () => { settings.sound = !settings.sound; try { localStorage.setItem('atlas-sfx', settings.sound ? '1' : '0'); } catch (e) {} save(); renderInfo(); if (settings.sound) sTick(); };
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
  if (lpState && !$('#lessonIntroView').classList.contains('hidden') && $('#lessonOverlay').classList.contains('show') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); lpStep(e.key === 'ArrowRight' ? 1 : -1); return; }
  if (document.querySelector('.overlay.show')) { if (e.key === 'Escape') { const o = document.querySelector('.overlay.show'); outsideClose(o); } return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^[1-6]$/.test(e.key)) { const p = shownPos(); if (p && !p.over) onPit(pitIndex(p.side, +e.key - 1)); return; }
  if (lesson || puzzle) return;
  const k = { ArrowLeft: 'prev', ArrowRight: 'next', ArrowUp: 'last', ArrowDown: 'first', ' ': 'play' }[e.key];
  if (!k || inStudy()) return;   // (no record navigation while exploring)
  e.preventDefault(); if (tg && tg.blur && tg !== document.body) tg.blur();
  navGo(k);
});
// record navigation under the evaluation graph
let playTimer = 0;
function stopPlay() { clearInterval(playTimer); playTimer = 0; const b = $('#navPlay'); if (b) b.classList.remove('playing'); }
function navGo(what) {
  if (lesson || puzzle) return;
  if (inStudy()) studyExit();
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
  const [x, y] = RuleTour.svgPoint(svg, e);   // viewBox coordinates (the svg is stretched to the fixed board box)
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
const ruleTour = window.RuleTour ? RuleTour.create({
  mount: '#rulesBody', store: 'mancala-rules-v2', lang: () => LANG, aspect: MB.W / MB.H,
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
const lessonsReady = fetch('lessons.json?v=20261021L3').then(r => r.json()).then(d => (LESSONS = d)).catch(() => null);
const puzzlesReady = fetch('puzzles.json?v=20261021fun').then(r => r.json()).then(d => (PUZZLES = d)).catch(() => null);
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
  reviewing = cur !== game.moves.length; gameOverShown = isOver(game.moves.length) || game.resigned != null;
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
// lessons by rule set (tabs) → category (tabs with an icon, name and progress) → header card → step cards
const LS_RULESETS = {
  kalah: { basic: ['sow', 'extra', 'capture'], tactics: ['defend', 'chain', 'endgame'], kOpen: ['k_open', 'k_open6', 'k_tempo'], kMid: ['k_combo', 'k_hoard', 'k_starve', 'k_count'] },
  basic: { nOpen: ['n_open', 'n_chain'], nCap: ['n_cap', 'n_defend'], nEnd: ['n_play', 'n_end'] },
  easy: { eOpen: ['e_open', 'e_chain'], eMid: ['e_block', 'e_keep', 'e_end'] },
  sunka: { sRelay: ['s_relay', 's_chain', 's_cap'], sEnd: ['s_defend', 's_end'] },
};
const LS_RULE_ORDER = ['kalah', 'basic', 'easy', 'sunka'];
const LS_COURSES = {}; for (const r of LS_RULE_ORDER) Object.assign(LS_COURSES, LS_RULESETS[r]);
const LS_SVG = {
  basic: '<circle cx="6" cy="15" r="2.6"/><circle cx="12" cy="15" r="2.6"/><circle cx="18" cy="15" r="2.6"/><path d="M5 8c3-3 11-3 14 0M16.5 5.5 19 8l-3 1"/>',
  tactics: '<path d="M4 20 15 9M15 9l1.5-4.5L21 3l-1.5 4.5zM20 20 9 9M9 9 7.5 4.5 3 3l1.5 4.5zM6 15l3 3M18 15l-3 3"/>',
  kOpen: '<path d="M5 21V4M5 4h11l-2.5 4L16 12H5"/>', kMid: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12h.01" stroke-width="3.4"/>',
  nOpen: '<path d="M5 21V4M5 4h11l-2.5 4L16 12H5"/>', nCap: '<path d="M4 14c0-4 4-7 8-7s8 3 8 7M8 14l4 5 4-5M12 7v12"/>', nEnd: '<path d="M4 20h16M7 20V10M12 20V6M17 20v-7"/>',
  eOpen: '<path d="M5 21V4M5 4h11l-2.5 4L16 12H5"/>', eMid: '<rect x="4" y="9" width="16" height="11" rx="3"/><circle cx="9" cy="14.5" r="1.8"/><circle cx="15" cy="14.5" r="1.8"/><path d="M8 9V6.5a4 4 0 0 1 8 0V9"/>',
  sRelay: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/>', sEnd: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="M9 12l2 2 4-4"/>',
};
const lsSvg = c => `<svg viewBox="0 0 24 24">${LS_SVG[c] || LS_SVG.basic}</svg>`;
const lsRules = s => s.rules || LESSONS.rules || 'kalah';
const lsCourseOf = id => Object.keys(LS_COURSES).find(c => LS_COURSES[c].includes(id)) || 'basic';
const lsRuleOfCourse = c => LS_RULE_ORDER.find(r => LS_RULESETS[r][c]) || 'kalah';
let lsCourseSel = {}, lsRuleSel = '';
async function openLessons(course, rule) {
  await lessonsReady; selTab('lesson');
  if (!LESSONS) { toast(t('ls.fail')); return; }
  const pr = lsProgress(), byId = {}; LESSONS.steps.forEach((s, i) => { byId[s.id] = i; });
  const stat = ids => { ids = ids.filter(id => id in byId); return { n: ids.length, ok: ids.filter(id => pr[id] && pr[id].clear).length }; };
  if (course && LS_COURSES[course]) { rule = lsRuleOfCourse(course); lsCourseSel[rule] = course; }
  if (rule) lsRuleSel = rule;
  if (!LS_RULESETS[lsRuleSel]) lsRuleSel = LS_RULESETS[settings.rules] ? settings.rules : 'kalah';
  const R = lsRuleSel, courses = Object.keys(LS_RULESETS[R]);
  let c = lsCourseSel[R];
  if (!courses.includes(c)) c = lsCourseSel[R] = courses.find(k => { const q = stat(LS_COURSES[k]); return q.ok < q.n; }) || courses[0];
  const q = stat(LS_COURSES[c]);
  const cards = LS_COURSES[c].filter(id => id in byId).map((id, no) => {
    const i = byId[id], s = LESSONS.steps[i], r = pr[s.id], d = LESSON_D[s.id];
    const th = d ? mThumb(d[0], d[1]) : mThumb(s.problems[0].b, { [s.problems[0].best]: 'src' });
    const st = r ? (r.clear ? `<span class="lx-st ok">✓ ${t('ls.clear')}</span>` : `<span class="lx-st">${t('u.pt', { n: r.best })}</span>`) : `<span class="lx-st new">${t('ls.notyet')}</span>`;
    return `<button class="lx-card${r && r.clear ? ' clear' : ''}" data-i="${i}"><span class="lx-th">${th}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">STEP ${no + 1}</span>${st}</span><b class="lx-t">${t('ls.' + s.id + '.title')}</b><small class="lx-sub">${s.seeds === 6 ? t('ng.seedsN', { n: 6 }) + ' · ' : ''}${t('ls.' + s.id + '.sub')}</small>` +
      `<span class="lx-desc">${plainText(t('ls.' + s.id + '.intro'))}</span>${lxBar(r ? r.best / 100 : 0, r && r.clear ? 'ok' : '')}</span></button>`;
  }).join('');
  const rtabs = LS_RULE_ORDER.map(r => { const z = stat(Object.values(LS_RULESETS[r]).flat()); return `<button data-rule="${r}" class="${r === R ? 'sel' : ''}">${t('rule.' + r)} <small class="${z.ok === z.n ? 'ok' : ''}">${z.ok}/${z.n}</small></button>`; }).join('');
  $('#lessonList').innerHTML = `<div class="lx">` +
    `<div class="seg var-tabs" role="tablist" aria-label="${t('lx.rulesTab')}">${rtabs}</div>` +
    `<div class="lx-tabs lx-c${courses.length}" role="tablist">${courses.map(k => { const z = stat(LS_COURSES[k]); return `<button role="tab" data-course="${k}" class="${k === c ? 'sel' : ''}"><span class="ic">${lsSvg(k)}</span><span class="nm">${t('lc.' + k)}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join('')}</div>` +
    `<div class="lx-banner"><span class="ic">${lsSvg(c)}</span><span class="tx"><b>${t('lc.' + c)}</b><small>${t('rule.' + R)} · ${t('lx.steps', { n: q.n })} — ${t('lc.' + c + '.d')}</small></span><span class="pg">${t('lx.cleared', { a: q.ok, b: q.n })}${lxBar(q.n ? q.ok / q.n : 0, 'ok')}</span></div>` +
    `<div class="lx-grid">${cards}</div></div>`;
  showLessonView('lessonListView'); $('#lessonOverlay').classList.add('show');
}
$('#lessonList').onclick = e => {
  const rb = e.target.closest('[data-rule]'); if (rb) { openLessons(undefined, rb.dataset.rule); return; }
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
function lsAutoDiag(s) {
  const pr = s.problems[0], tr = E.trace(Int8Array.from(pr.b), 0, pr.best, lsRules(s)), path = [pr.best];
  for (const ev of tr.events) if (ev.t === 'drop' && path.length < 14) path.push(ev.at);
  const mk = { [pr.best]: 'src', [tr.land]: tr.extra ? 'store' : 'land' }; if (tr.cap) mk[tr.capFrom] = 'cap';
  return miniBoard(pr.b, mk, tr.relays ? null : path, tr.cap ? { capArrow: [tr.capFrom, 6] } : {});
}
// line player (openings): a mini board stepped with the buttons or the ←→ keys
let lpState = null;
function lpRender() {
  const L = lpState; if (!L) return;
  const el = $('#lpBox'); if (!el) return;
  const r = E.replay(E.initial(L.seeds), 0, L.moves.slice(0, L.j), L.rules), p = r.positions[r.positions.length - 1];
  const mv = p.mv, marks = {};
  let cap = t('lp.start');
  if (mv) {
    const at = (mv.side ? 7 : 0) + mv.k; marks[at] = 'src'; marks[mv.land] = mv.extra ? 'store' : 'land';
    cap = t('lp.move', { n: L.j, who: t(mv.side ? 'p1' : 'p0'), m: mv.k + 1 }) + (mv.extra ? ' · ' + t('lp.extra') : '') + (mv.cap ? ' · ' + t('lp.cap', { n: mv.cap + 1 }) : '');
  }
  const ev = L.vals && L.vals[L.j];
  if (ev !== undefined && ev !== null) cap += ` <span class="lp-ev">${t('lp.eval', { v: (ev >= 0 ? '+' : '−') + Math.abs(ev).toFixed(1) })}</span>`;
  const note = L.notes && L.notes[L.j] ? `<p class="lp-note">${t(L.notes[L.j])}</p>` : '';
  el.innerHTML = miniBoard(p.b, marks, null, { caption: t('lp.cap0') }) + `<div class="lp-bar"><button data-lp="-1" ${L.j ? '' : 'disabled'}>◀</button><span class="lp-cap">${cap}</span><button data-lp="1" ${L.j < L.moves.length ? '' : 'disabled'}>▶</button></div>` + note;
}
function lpStep(d) { if (!lpState) return; const j = Math.max(0, Math.min(lpState.moves.length, lpState.j + d)); if (j !== lpState.j) { lpState.j = j; lpRender(); sTick(); } }
document.addEventListener('click', e => { const b = e.target.closest('[data-lp]'); if (b) lpStep(+b.dataset.lp); });
function openIntro(i) {
  introIdx = i; const s = LESSONS.steps[i], c = lsCourseOf(s.id);
  $('#liStep').textContent = `${t('rule.' + lsRuleOfCourse(c))} · ${t('lc.' + c)} · STEP ${LS_COURSES[c].indexOf(s.id) + 1}`;
  $('#liTitle').textContent = t('ls.' + s.id + '.title');
  lpState = s.line ? { rules: lsRules(s), seeds: s.line.seeds || 4, moves: s.line.moves, vals: s.line.vals, notes: s.line.notes, j: 0 } : null;
  const rl = s.rules ? `<p class="ls-rule">${t('ls.ruleOf', { r: t('rule.' + s.rules), n: s.seeds || 4 })}</p>` : '';
  $('#liBody').innerHTML = rl + (lpState ? '' : LESSON_DIAG[s.id] ? LESSON_DIAG[s.id]() : s.problems[0].b && !LESSON_D[s.id] && s.rules ? lsAutoDiag(s) : '') + t('ls.' + s.id + '.intro') + (lpState ? '<div class="lp" id="lpBox"></div>' : '') + `<p class="note">${t('ls.scoring')}</p>`;
  lpRender();
  showLessonView('lessonIntroView');
}
$('#btnLessonBack').onclick = () => openLessons(LESSONS.steps[introIdx] && lsCourseOf(LESSONS.steps[introIdx].id));
$('#btnLessonClose').onclick = () => $('#lessonOverlay').classList.remove('show');
$('#btnLessonStart').onclick = () => startLesson(introIdx);
// finished screen: 「レッスンに戻る」 ends the lesson and reopens the lesson list on its rule set / course, scrolled to the step
$('#btnLessonQuit2').onclick = async () => {
  const L = lesson; quitSpecial();
  await openLessons(L ? lsCourseOf(LESSONS.steps[L.step].id) : undefined);
  const el = L && $('#lessonList').querySelector(`[data-i="${L.step}"]`); if (el) el.scrollIntoView({ block: 'center' });
};
$('#btnLessonRetry').onclick = () => startLesson(lesson ? lesson.step : introIdx);
// the next step in course order (rule set → category → step); -1 at the end of the rule set
function lsNextIdx(i) {
  const id = LESSONS.steps[i].id, R = lsRuleOfCourse(lsCourseOf(id)), ids = Object.values(LS_RULESETS[R]).flat(), k = ids.indexOf(id);
  for (let j = k + 1; j < ids.length; j++) { const n = LESSONS.steps.findIndex(s => s.id === ids[j]); if (n >= 0) return n; }
  return -1;
}
const lsStepNo = i => { const id = LESSONS.steps[i].id; return LS_COURSES[lsCourseOf(id)].indexOf(id) + 1; };
$('#btnLessonNextStep').onclick = () => { const n = lsNextIdx(lesson ? lesson.step : introIdx); if (n >= 0) openIntro(n); else { $('#lessonOverlay').classList.remove('show'); quitSpecial(); } };
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
  enterSetup(pr.b, 0, lsRules(LESSONS.steps[lesson.step]));
  fxMarks = lessonBaseMarks(); renderFx();
  renderLessonCard(); $('#lsFb').innerHTML = lesson.i === 0 ? `<small>${t('ls.tutorial')}</small>` : lesson.i >= 3 ? `<small>${t('ls.exam')}</small>` : '';
}
function renderLessonCard() {
  const s = LESSONS.steps[lesson.step], n = s.problems.length;
  $('#lsStep').textContent = t('ls.stepq', { s: lsStepNo(lesson.step), i: lesson.i + 1, n }) + (lesson.i >= 3 ? ' · ' + t('ls.examTag') : '');
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
  if (s.id !== 'sow' && typeof mcExplainHTML === 'function') { try { fb += exFold(mcExplainHTML(pr.b, k, pr.best, lsRules(s), t('you'))); } catch (e) { console.warn(e); } }
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
  const th = { extra: 'store', chain: 'store', e_chain: 'store', s_relay: 'store', capture: 'cap', k_combo: 'cap', n_cap: 'cap', s_cap: 'cap', defend: 'def', n_defend: 'def', s_defend: 'def', n_chain: 'store', s_chain: 'store', e_block: 'blk' }[s.id];
  if (th === 'store' && s.id !== 'extra') fxMarks.push({ at: 6, ring: true, cls: '' });
  if (th === 'cap') for (let i = 0; i < 6; i++) if (!b[i] && b[12 - i]) fxMarks.push({ at: 12 - i, ring: true, cls: 'cap' });
  if (th === 'blk') { for (let k = 0; k < 6; k++) { const i = 7 + k; if (!b[i]) continue; const tr = E.trace(Int8Array.from(b), 1, k, lsRules(s)); if (tr.extra && !tr.over) fxMarks.push({ at: i, ring: true, cls: 'cap' }); } }
  if (th === 'def') { for (let k = 0; k < 6; k++) { const i = 7 + k; if (!b[i]) continue; const tr = E.trace(Int8Array.from(b), 1, k, lsRules(s)); if (tr.cap) fxMarks.push({ at: tr.capFrom, ring: true, cls: 'cap' }); } }
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
  $('#btnLessonNextStep').classList.toggle('hidden', lsNextIdx(lesson.step) < 0);
  showLessonView('lessonDoneView'); $('#lessonOverlay').classList.add('show');
  if (pass) { confetti(); sChime(1); }
};
$('#lsQuit').onclick = () => quitSpecial();
$('#lsToList').onclick = () => openLessons(lesson ? lsCourseOf(LESSONS.steps[lesson.step].id) : undefined);
$('#pzToList').onclick = () => openPuzzles();

// ====================================================================== puzzles: categories → themes → stages of 10 (shared/pzbook.js)
// puzzles.json v3: { cats: [{ id, themes: [{ id, puzzles: [...] }] }], total }. Records: key "<theme>-<j>" → stars 1..3.
// The first five themes (max, chain, end, end2, relay) are the original 100 puzzles, same order; old records "<L>-<j>"
// are carried over once.
const PZ_OLD = ['max', 'chain', 'end', 'end2', 'relay'];
let THEMES = [], pzLevel = 0;
function pzIndex() {
  if (!PUZZLES || THEMES.length) return;
  PUZZLES.cats.forEach((C, ci) => C.themes.forEach(T => { T.ci = ci; T.rules = C.rules || T.puzzles[0].rules; T.gi = THEMES.length; THEMES.push(T); }));
}
const starVal = v => v === true ? 3 : +v || 0;
const pzKey = (T, j) => T.id + '-' + j;
function pzMigrate() {
  try {
    const pr = pzProgress(); let ch = false;
    for (const k of Object.keys(pr)) { const m = /^(\d)-(\d+)$/.exec(k); if (m && PZ_OLD[+m[1]]) { const nk = PZ_OLD[+m[1]] + '-' + m[2]; pr[nk] = Math.max(starVal(pr[nk]), starVal(pr[k])); delete pr[k]; ch = true; } }
    if (ch) localStorage.setItem(PZ_STORE, JSON.stringify(pr));
  } catch (e) {}
}
// 2026-10-21 fun refresh (tools/fun.js, tools/refresh_fun.js): low-scoring puzzles were replaced; the previous one is
// in PUZZLES.old["<theme>-<j>"]. A player who had already played a slot (a record when this version first loads, or a
// solve of the old puzzle later, e.g. a daily up to PUZZLES.cut) keeps the old puzzle there; dailies up to the cut stay old.
const PZ_OLDK = STORE + '-pzold';
let pzOldSet = null;
function pzOldKeys() {
  if (pzOldSet) return pzOldSet;
  let d = null; try { d = JSON.parse(localStorage.getItem(PZ_OLDK) || 'null'); } catch (e) {}
  if (!d || !Array.isArray(d.keys)) {
    pzMigrate(); const pr = pzProgress();
    d = { keys: Object.keys((PUZZLES && PUZZLES.old) || {}).filter(k => starVal(pr[k]) > 0) };
    try { localStorage.setItem(PZ_OLDK, JSON.stringify(d)); } catch (e) {}
  }
  return (pzOldSet = new Set(d.keys));
}
function pzOldMark(k) { const s = pzOldKeys(); if (s.has(k)) return; s.add(k); try { localStorage.setItem(PZ_OLDK, JSON.stringify({ keys: [...s] })); } catch (e) {} }
function pzGet(T, j, date) {
  const k = pzKey(T, j), o = PUZZLES.old && PUZZLES.old[k];
  if (o && ((date && date <= PUZZLES.cut) || pzOldKeys().has(k))) return o;
  return T.puzzles[j];
}
const pzRecs = (T, pr) => { pr = pr || pzProgress(); return T.puzzles.map((_, j) => starVal(pr[pzKey(T, j)])); };
// titles (称号) from the stars of all puzzles
const PZ_RANKS = 12;
function pzStarsAll(pr) { let n = 0; for (const T of THEMES) for (let j = 0; j < T.puzzles.length; j++) n += starVal(pr[pzKey(T, j)]); return n; }
function pzRankOf(st) { const M = PUZZLES.total * 3, f = x => Math.ceil(M * Math.pow(x / (PZ_RANKS - 1), 1.6)); let i = 0; while (i + 1 < PZ_RANKS && st >= f(i + 1)) i++; return { i, at: f(i), next: i + 1 < PZ_RANKS ? f(i + 1) : 0 }; }
function pzRankHtml(pr) {
  const st = pzStarsAll(pr), M = PUZZLES.total * 3, R = pzRankOf(st), p = R.next ? (st - R.at) / Math.max(1, R.next - R.at) : 1;
  const done = THEMES.reduce((a, T) => a + pzRecs(T, pr).filter(Boolean).length, 0);
  return `<div class="pz-rank"><span class="rk-badge"><small>${t('pz.rank')}</small><b>${t('pz.ranks')[R.i]}</b><i>${'◆'.repeat(Math.min(5, 1 + Math.floor(R.i / 2.4)))}</i></span><span class="rk-tx"><span class="rk-st">${PZBook.STAR(true)}<b>${st}</b><small>/${M}</small><span class="rk-dn">${t('pz.doneOf', { a: done, b: PUZZLES.total })}</span></span>` +
    `<span class="lx-bar"><i style="width:${Math.round(p * 100)}%"></i></span><small>${R.next ? t('pz.rankNext', { n: R.next - st, r: t('pz.ranks')[R.i + 1] }) : t('pz.rankTop')}</small></span></div>`;
}
// difficulty 1..5 from the puzzle's rating (quantiles over all puzzles, computed once)
let PZ_Q = null;
function pzDiff(P) {
  if (!PZ_Q) { const r = THEMES.flatMap(T => T.puzzles.map(x => x.rt || 0)).sort((a, b) => a - b); PZ_Q = [0.2, 0.4, 0.6, 0.8].map(q => r[Math.floor(q * (r.length - 1))]); }
  const v = P.rt || 0; let d = 1; for (const q of PZ_Q) if (v > q) d++; return d;
}
const themeTier = T => { const d = T.puzzles.reduce((a, P) => a + pzDiff(P), 0) / T.puzzles.length; return Math.max(0, Math.min(5, Math.round((d - 1) * 1.25))); };
// list (same layout as Reversi's puzzle book): title card with the overall progress ring, ★, medals, title (称号) and
// "continue" → daily puzzle → rule-set tabs → category tabs (icon, name, solved/total) + one line → theme cards → stage grid
const PZ_RULES = ['kalah', 'basic', 'easy', 'sunka'], PZ_LAST = STORE + '-pz-last';
const PZI = {
  turn: '<path d="M4 12a8 8 0 0 1 14-5.3M18 3v4h-4"/><circle cx="8" cy="15" r="1.8"/><circle cx="13" cy="15" r="1.8"/><circle cx="18" cy="15" r="1.8"/>',
  tactic: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12h.01" stroke-width="3.4"/>', end: '<path d="M5 21V4h13l-2.5 4L18 12H5"/>',
  max: '<path d="M5 20V12M11 20V5M17 20v-9M2 20h20"/>', chain: '<path d="M10 14a4 4 0 0 1 0-5.6l2.8-2.8a4 4 0 0 1 5.6 5.6l-1.4 1.4M14 10a4 4 0 0 1 0 5.6l-2.8 2.8a4 4 0 0 1-5.6-5.6l1.4-1.4"/>',
  chain2: '<path d="M4 6l6 6-6 6M12 6l6 6-6 6"/>', chain6: '<circle cx="7" cy="8" r="2"/><circle cx="12" cy="8" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="7" cy="15" r="2"/><circle cx="12" cy="15" r="2"/><circle cx="17" cy="15" r="2"/>',
  combo: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>', cap: '<path d="M4 14c0-4 4-7 8-7s8 3 8 7M8 14l4 5 4-5M12 7v12"/>', defend: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/>',
  trap: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6.5M12 16.8v.2"/>', end: '<path d="M5 21V4h13l-2.5 4L18 12H5"/>', end2: '<path d="M4 20h16M7 20V10M12 20V6M17 20v-7"/>',
  end3: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>', count: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h4"/>',
  nChain: '<path d="M4 6l6 6-6 6M12 6l6 6-6 6"/>', nCap: '<path d="M4 14c0-4 4-7 8-7s8 3 8 7M8 14l4 5 4-5M12 7v12"/>', nDefend: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/><path d="M9 12l2 2 4-4"/>', nEnd: '<path d="M4 20h16M7 20V10M12 20V6M17 20v-7"/>',
  eChain: '<path d="M4 6l6 6-6 6M12 6l6 6-6 6"/>', ePick: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12h.01" stroke-width="3.4"/>', eEnd: '<rect x="4" y="9" width="16" height="11" rx="3"/><circle cx="9" cy="14.5" r="1.8"/><circle cx="15" cy="14.5" r="1.8"/>',
  relay: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/>', relay2: '<path d="M3 12a6 6 0 0 1 10.5-4M21 12a6 6 0 0 1-10.5 4M13 4.5V8h-3.5M11 19.5V16h3.5"/>',
  sCap: '<path d="M4 12a8 8 0 0 1 14-5.3M18 3v4h-4"/><path d="M9 14l3 4 3-4M12 9v9"/>', sEnd: '<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z"/>',
};
const pzSvg = k => `<svg viewBox="0 0 24 24">${PZI[k] || PZI.tactic}</svg>`;
const PZ_HUE = { max: ['#f2c060', '#8e6a26'], chain: ['#6fd3a0', '#2f7d5a'], chain2: ['#73d9c6', '#26786b'], chain6: ['#a6dd6c', '#4d7a26'], combo: ['#ffb36b', '#8f5a2a'],
  cap: ['#ff8fa8', '#9a3f57'], defend: ['#9fb8ff', '#3f5299'], trap: ['#ff7a6b', '#8a322a'], end: ['#c0a0ff', '#5b3f99'], end2: ['#d9b0ff', '#6b3f8f'], end3: ['#ff7ad0', '#8f2a6f'], count: ['#ffd36b', '#8e7426'],
  nChain: ['#73d9c6', '#26786b'], nCap: ['#ff8fa8', '#9a3f57'], nDefend: ['#9fb8ff', '#3f5299'], nEnd: ['#c0a0ff', '#5b3f99'], eChain: ['#6fd3a0', '#2f7d5a'], ePick: ['#ff9f6b', '#9a4f2a'], eEnd: ['#cfd6e6', '#56607e'],
  relay: ['#5ec6d8', '#2a6f7f'], relay2: ['#6bc8ff', '#2a5c8f'], sCap: ['#ff8fa8', '#9a3f57'], sEnd: ['#c0a0ff', '#5b3f99'] };
const pzColor = T => PZ_HUE[T.id] || null;
const pzDiffAvg = T => Math.max(1, Math.min(5, Math.round(T.puzzles.reduce((a, P) => a + pzDiff(P), 0) / T.puzzles.length)));
const pzSeeds = P => P.b.reduce((a, x) => a + x, 0) === 72 ? 6 : 4;
const pzBadge = T => pzSvg(T.id);
// the collection home (shared PZBook.home, the layout of 詰めオセロ) under the rule-set tabs:
// hero (ring, ★, medals, title 称号, continue) → daily → category tabs → theme cards with a mini board → stage grid
let pzRule = '', pzCatSel = {};
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
async function openPuzzles(rule, cat) {
  await puzzlesReady; selTab('puzzle');
  if (!PUZZLES) { toast(t('ls.fail')); return; }
  pzIndex(); pzMigrate(); PZBook.setLang(LANG);
  if (rule) pzRule = rule;
  if (!PZ_RULES.includes(pzRule)) pzRule = PZ_RULES.includes(settings.rules) ? settings.rules : 'kalah';
  const R = pzRule, pr = pzProgress(), cats = PUZZLES.cats.map((C, i) => i).filter(i => PUZZLES.cats[i].rules === R);
  if (cat !== undefined) pzCatSel[R] = +cat;
  let ci = pzCatSel[R]; if (!cats.includes(ci)) ci = pzCatSel[R] = cats[0];
  const rs = r => THEMES.filter(T => T.rules === r), cnt = list => { const x = list.map(T => pzRecs(T, pr)).flat(); return [x.filter(v => v > 0).length, x.length]; };
  $('#pzVarTabs').innerHTML = PZ_RULES.map(r => { const [a, b] = cnt(rs(r)); return `<button data-r="${r}" class="${r === R ? 'sel' : ''}">${t('rule.' + r)} <small class="${a === b ? 'ok' : ''}">${a}/${b}</small></button>`; }).join('');
  const mine = rs(R), cont = PZBook.resume(mine.map(T => ({ key: T.gi, recs: pzRecs(T, pr), cat: T.ci })), PZ_LAST + '-' + R);
  const st = pzStarsAll(pr), RK = pzRankOf(st), dl = dailyPick(), di = dailyInfo();
  const rk = `<span class="pz-rk" title="${RK.next ? t('pz.rankNext', { n: RK.next - st, r: t('pz.ranks')[RK.i + 1] }) : t('pz.rankTop')}"><small>${t('pz.rank')}</small><b>${t('pz.ranks')[RK.i]}</b>${RK.next ? `<i>★${st}/${RK.next}</i>` : ''}</span>`;
  const box = $('#pzLevels');
  box.innerHTML = PZBook.home({
    title: t('pz.title') + ' · ' + t('rule.' + R), lead: t('pz.desc'), all: mine.map(T => pzRecs(T, pr)), heroExtra: rk,
    cont: cont && { key: cont.key + ':' + cont.j, no: cont.j + 1, name: t('pz.' + THEMES[cont.key].id) },
    daily: dl ? [{ key: '1', board: mThumb(pzGet(THEMES[dl.L], dl.j, dl.date).b), title: '★ ' + t('daily.title'), date: dl.date.slice(5).replace('-', '/'), done: di.today, go: t('daily.go'),
      sub: `${t('pz.' + THEMES[dl.L].id)} · ${t('pz.diff')} ${pzDiff(pzGet(THEMES[dl.L], dl.j, dl.date))}/5 · 🔥 ${t('daily.streak', { n: di.streak })}${di.best > 1 ? ' · ' + t('daily.best', { n: di.best }) : ''}` }] : [],
    cats: cats.map(i => { const C = PUZZLES.cats[i], [a, b] = cnt(C.themes); return { key: i, icon: pzSvg(C.id), name: t('pzc.' + C.id), done: a, total: b }; }),
    cur: ci, catDesc: t('pzc.' + PUZZLES.cats[ci].id + '.d'),
    cards: PUZZLES.cats[ci].themes.map(T => { const r = pzRecs(T, pr), j = PZBook.nextIndex(r), P = pzGet(T, j >= 0 ? j : r.length - 1);
      return { key: T.gi, badge: pzBadge(T), name: t('pz.' + T.id), desc: (pzSeeds(P) === 6 ? t('ng.seedsN', { n: 6 }) + ' · ' : '') + t('pz.' + T.id + '.d'), recs: r, diff: pzDiffAvg(T), c: pzColor(T), tier: themeTier(T), board: mThumb(P.b, { [P.best]: 'src' }), bdCls: 'mc' }; }),
  });
  PZBook.bindHome(box, {
    cat: k => openPuzzles(undefined, +k),
    cont: x => { const [i, j] = x.split(':').map(Number); startPuzzle(i, j); },
    daily: () => { const dl = dailyPick(); if (dl) startPuzzle(dl.L, dl.j, dl.date); },
    card: i => openPzGrid(+i),
  });
  showPzView('pzListView'); $('#puzzleOverlay').classList.add('show');
}
$('#pzVarTabs').onclick = e => { const b = e.target.closest('button[data-r]'); if (b) openPuzzles(b.dataset.r); };
function openPzGrid(i, cur) {
  pzIndex(); pzLevel = i; const T = THEMES[i]; PZBook.setLang(LANG); pzRule = T.rules; pzCatSel[T.rules] = T.ci;
  const ds = T.puzzles.map(pzDiff), d0 = Math.min(...ds), d1 = Math.max(...ds);
  $('#pzLevelHead').innerHTML = PZBook.ghead({ badge: pzBadge(T), name: t('pz.' + T.id), desc: t('pz.' + T.id + '.d'), c: pzColor(T), diff: pzDiffAvg(T),
    chips: [t('rule.' + T.rules) + (pzSeeds(T.puzzles[0]) === 6 ? ' · ' + t('ng.seedsN', { n: 6 }) : ''), t('pzc.' + PUZZLES.cats[T.ci].id), PZBook.t('count', { n: T.puzzles.length }), t('pz.diff') + ' ' + (d0 === d1 ? d0 : d0 + '–' + d1)] });
  const g = $('#pzGrid'); g.innerHTML = PZBook.grid({ recs: pzRecs(T), cur });
  // each tile shows the position (a small board) under its number and stars, and the difficulty
  g.querySelectorAll('.pb-tile[data-j]').forEach(el => { const P = pzGet(T, +el.dataset.j); el.insertAdjacentHTML('afterbegin', `<span class="th">${mThumb(P.b)}</span>`); el.insertAdjacentHTML('beforeend', `<span class="df">${'●'.repeat(pzDiff(P))}</span>`); });
  showPzView('pzGridView'); $('#puzzleOverlay').classList.add('show');
  const c = g.querySelector('.pb-tile.cur') || g.querySelector('.pb-tile.next'); if (c && c.offsetTop > g.parentNode.clientHeight * 0.6) c.scrollIntoView({ block: 'center' });
}
$('#pzGrid').onclick = e => { const b = e.target.closest('button[data-j]'); if (!b) return; if (b.getAttribute('aria-disabled')) { toast(PZBook.t('locked')); return; } startPuzzle(pzLevel, +b.dataset.j); };
$('#pzBack').onclick = () => openPuzzles();
$('#pzClose').onclick = () => $('#puzzleOverlay').classList.remove('show');
function startPuzzle(L, j, daily, keep) {
  $('#puzzleOverlay').classList.remove('show');
  pzIndex();
  if (!daily && THEMES[L]) PZBook.lastSet(PZ_LAST + '-' + THEMES[L].rules, L);
  stashGame(); lesson = null; document.body.classList.remove('in-lesson');
  const T = THEMES[L], pz = pzGet(T, j, daily);
  puzzle = { L, j, T, P: pz, state: 'play', busy: false, daily: daily || null, hinted: false, failed: false, answered: false, N: pzN(pz), used: 0, slip: null };
  if (keep) { puzzle.hinted = keep.hinted; puzzle.failed = keep.failed; puzzle.answered = keep.answered; }
  document.body.classList.add('in-puzzle');
  enterSetup(pz.b, 0, pz.rules);
  renderPuzzleCard();
  const Z = puzzle;
  pzStatus(pz.kind === 'pick' ? t('pz.startPick') : Z.N > 1 ? t(pz.kind === 'turn' ? 'pz.startTurn2' : 'pz.startEnd2', { n: Z.N }) + pzLeftTxt(Z) : t(pz.kind === 'turn' ? 'pz.startTurn' : 'pz.startEnd'));
}
function pzGain() { return shownPos().b[6] - puzzle.P.b[6]; }
function renderPuzzleCard() {
  const Z = puzzle, T = Z.T, pz = Z.P;
  $('#puzzleCard').classList.toggle('answered', Z.state !== 'play');
  $('#pzStep').textContent = Z.daily ? `★ ${t('daily.title')} · ${Z.daily.slice(5).replace('-', '/')}` : `${t('pz.' + T.id)} · ${PZBook.t('stage', { n: Math.floor(Z.j / PZBook.STAGE) + 1 })} · No.${Z.j + 1}`;
  const r = starVal(pzProgress()[pzKey(T, Z.j)]), d = pzDiff(pz);
  $('#pzTitle').innerHTML = `${t('pz.' + T.id)} <span class="pz-df d${d}" title="${t('pz.diff')}">${t('pz.diff')} ${'●'.repeat(d)}${'○'.repeat(5 - d)}</span>${!Z.daily && r ? ` <span class="pz-best">${[1, 2, 3].map(k => PZBook.STAR(k <= r)).join('')}</span>` : ''}`;
  $('#pzGoal').innerHTML = (pz.rules !== 'kalah' ? `<small style="color:var(--accent);font-weight:500">${t('rule.' + pz.rules)}</small><br>` : '') + (pz.kind === 'turn' ? t('pz.goalTurn', { n: pz.goal }) : pz.kind === 'pick' ? t('pz.goalPick') : t('pz.goalEnd', { a: pz.goal[0], b: pz.goal[1] }));
  $('#pzNext').disabled = !!Z.daily || (Z.j + 1 >= T.puzzles.length && Z.L + 1 >= THEMES.length);
  $('#pzHint').disabled = Z.state !== 'play' || Z.busy; $('#pzAnswer').disabled = Z.busy;
  renderInfo();
}
function pzStatus(html) { $('#pzStatus').innerHTML = html; }
// the explanation in words under a result: folded on short PC screens (the card has a fixed height there), open otherwise
function exFold(html) { if (!html) return ''; const open = !(innerWidth >= 900 && innerHeight < 860); return `<details class="ex-fold"${open ? ' open' : ''}><summary>${t('pz.why')}</summary>${html}</details>`; }
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
// the stored per-pit values (pick puzzles: exact final margins) as labels over the pits, best in gold
function pzValueMarks(pz) {
  if (!pz.sc) return [];
  const best = Math.max(...pz.sc.filter(v => v !== null));
  return pz.sc.map((v, j) => v === null ? null : { at: j, label: fmtV(v, true), lcls: (v >= best ? 'best' : '') + (v < 0 ? ' neg' : ''), dy: -0.36 }).filter(Boolean);
}
function pzExplain(pz, k) { try { return typeof mcExplainHTML === 'function' ? exFold(mcExplainHTML(pz.b, k, pz.best, pz.rules, t('you'))) : ''; } catch (e) { console.warn(e); return ''; } }
function pzLineText(pz) { return pz.line && pz.line.length ? `<div class="pz-line">${t('pz.lineIs')} ${pz.line.map(m => `<bdi class="cr-c">${m + 1}</bdi>`).join(' → ')}</div>` : ''; }
async function puzzleMove(k) {
  const Z = puzzle, pz = Z.P, p = shownPos();
  Z.busy = true; renderPuzzleCard();
  const tok = busyToken;
  if (pz.kind === 'pick') {
    Z.used++;
    const ok = k === pz.best;
    await playMove(k, { noFlow: true });
    if (puzzle !== Z || tok !== busyToken) return;
    await sleep(700); if (puzzle !== Z || tok !== busyToken) return;
    game.moves = []; recompute(); cur = 0; update();
    fxMarks = [{ at: pz.best, ring: true, cls: 'ok' }].concat(ok ? [] : [{ at: k, ring: true, cls: 'ng' }]).concat(pzValueMarks(pz)); renderFx();
    if (ok) return puzzleSolved(t('pz.solvedPick', { v: fmtV(pz.sc[pz.best], true) }) + pzExplain(pz, k));
    Z.state = 'fail'; Z.busy = false; Z.failed = true; sWrong();
    pzStatus(`<b class="ng">${t('pz.fail')}</b> ${t('pz.failPick', { m: k + 1, a: fmtV(pz.sc[k], true), b: fmtV(pz.sc[pz.best], true), x: pz.best + 1 })}` + pzExplain(pz, k));
    renderPuzzleCard(); return;
  }
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
  Z.state = 'fail'; Z.busy = false; Z.failed = true; thinking = -1;
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
  const Z = puzzle; Z.state = 'fail'; Z.busy = false; Z.failed = true;
  const best = bestFn();
  fxMarks = [{ at: pitIndex(0, best), ring: true, cls: 'ok' }, { at: pitIndex(0, k), ring: true, cls: 'ng' }];
  renderFx(); sWrong();
  pzStatus(`<b class="ng">${t('pz.fail')}</b> ${msg} ${t('pz.bestWas', { m: best + 1 })}` + (cur === 0 ? pzExplain(Z.P, k) : ''));
  renderPuzzleCard();
}
function puzzleSolved(msg) {
  const Z = puzzle; if (!Z) return;
  if (Z.state === 'answer') return answerDone();
  Z.state = 'solved'; Z.busy = false;
  if (Z.slip) Z.hinted = true;   // solved by another route after leaving the solution: counted like a hinted solve (★★)
  const pr = pzProgress(), key = pzKey(Z.T, Z.j), stars = PZBook.starsFor(Z), before = pzRecs(Z.T, pr), rk0 = pzRankOf(pzStarsAll(pr)).i;
  pr[key] = Math.max(starVal(pr[key]), stars);
  try { localStorage.setItem(PZ_STORE, JSON.stringify(pr)); } catch (e) {}
  if (PUZZLES.old && PUZZLES.old[key] === Z.P) pzOldMark(key);   // solved the pre-refresh puzzle: keep it for this slot
  const after = pzRecs(Z.T, pr), ev = PZBook.events(before, after, Z.j), rk1 = pzRankOf(pzStarsAll(pr)).i;
  if (Z.daily) dailySolved(Z.daily, Z.hinted);
  const extra = Z.P.kind === 'turn' ? pzLineText(Z.P) : '';
  pzStatus(`<b class="ok">${t('pz.solved')}</b> ${msg}` + extra + (Z.daily ? `<br>${t('daily.streak', { n: dailyInfo().streak })}` : '') + PZBook.solved({ stars, recs: after, j: Z.j, events: ev }) + (rk1 > rk0 ? `<span class="pb-ev cp">${t('pz.rankUp', { r: t('pz.ranks')[rk1] })}</span>` : ''));
  sChime(1); confetti(); renderPuzzleCard();
}
function answerDone() { const Z = puzzle; Z.busy = false; Z.state = 'done'; renderPuzzleCard(); pzStatus(t('pz.answerDone')); }
$('#pzRetry').onclick = () => { if (puzzle) { const Z = puzzle; startPuzzle(Z.L, Z.j, Z.daily, { hinted: Z.hinted, failed: Z.failed || Z.state === 'fail', answered: Z.answered }); } };
$('#pzNext').onclick = () => {
  if (!puzzle) return;
  let { L, j } = puzzle; j++;
  if (j >= THEMES[L].puzzles.length) { L++; j = 0; }
  if (L >= THEMES.length) return;
  if (!PZBook.isOpen(pzRecs(THEMES[L]), j)) { openPzGrid(L, j); toast(PZBook.t('locked')); return; }
  startPuzzle(L, j);
};
$('#pzList').onclick = () => { if (!puzzle) return; if (puzzle.daily) openPuzzles(); else openPzGrid(puzzle.L, puzzle.j); };
$('#pzQuit').onclick = () => quitSpecial();
$('#pzHint').onclick = async () => {
  const Z = puzzle; if (!Z || Z.state !== 'play' || Z.busy) return;
  Z.hinted = true;
  const p = shownPos(); let k;
  if (Z.P.kind === 'pick') { k = Z.P.best; pzStatus(t('pz.hintEnd')); }
  else if (Z.P.kind === 'turn') { k = pzTurnBest(p); pzStatus(t('pz.hintTurn')); }
  else if (cur === 0) { k = Z.P.best; pzStatus(t('pz.hintEnd')); }
  else { const r = await solveReq(p); if (puzzle !== Z) return; k = r.list.reduce((a, x) => x.v > a.v ? x : a).m; pzStatus(t('pz.hintEnd')); }
  fxMarks = [{ at: pitIndex(0, k), ring: true, cls: 'ok' }]; renderFx();
};
async function answerStep(Z, tok) {
  const p = shownPos();
  let k;
  if (Z.P.kind === 'turn') { const g = E.turnMaxFirst(p.b, 0, Z.P.rules), need = Z.P.goal - pzGain(); k = g.findIndex(v => v !== null && v >= need); }
  else if (cur === 0 || Z.P.kind === 'pick') k = Z.P.best;
  else { const r = await solveReq(p); if (puzzle !== Z || tok !== busyToken) return; k = r.list.reduce((a, x) => x.v > a.v ? x : a).m; }
  fxMarks = []; await sleep(450); if (puzzle !== Z || tok !== busyToken) return;
  await playMove(k, { noFlow: true });
  if (puzzle !== Z || tok !== busyToken) return;
  const q = shownPos();
  if (Z.P.kind === 'pick') { fxMarks = pzValueMarks(Z.P).concat([{ at: Z.P.best, ring: true, cls: 'ok' }]); game.moves = []; recompute(); cur = 0; update(); answerDone(); pzStatus(t('pz.answerDone') + pzExplain(Z.P, Z.P.best)); return; }
  if (Z.P.kind === 'turn') { if (q.over || q.side !== 0) { answerDone(); pzStatus(t('pz.answerDone') + pzLineText(Z.P)); return; } return answerStep(Z, tok); }
  return defenderLoop(Z, tok);
}
$('#pzAnswer').onclick = () => {
  const Z0 = puzzle; if (!Z0 || Z0.busy) return;
  startPuzzle(Z0.L, Z0.j, Z0.daily);
  const Z = puzzle; Z.state = 'answer'; Z.busy = true; Z.hinted = true; Z.answered = true; renderPuzzleCard();
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
function revealReview() { if (!(HB && HB.on)) setTimeout(() => $('#reviewCard').scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60); }
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
    if (typeof mcCoach === 'function' && !bxAllowed()) html = mcCoach() + html;   // (PC review box: the commentary is in the box)   // 振り返り解説 (rvcoach.js) first, above the numbers
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

// ====================================================================== PC review box (below the board + right column) and 検討 (study) mode
// While a review is open on a PC (header bar layout), a wide box under the board shows the coach commentary for the
// viewed move (left) and the engine's candidate moves with their lines (right). [検討する] lets both sides play freely
// from the viewed position (the record and the graph stay as they are); [元に戻す] returns at once.
const BX_T = {
  ja: { title: '解説', cand: '候補手', loading: '読み込み中…', running: '分析中… {a}/{b}', study: '検討する', restore: '元に戻す', back: '1手戻す', studying: '検討中', played: '実戦', head: '検討中：{n}手目の局面から +{m}手', hint: '盤上で手を指すか、候補手をクリックして検討できます。◀ で1手戻し、［元に戻す］で元の局面に戻ります。', over: '終局', last: '直前の手：{m}', none: '—', clickHint: 'クリックでこの手を指して検討' },
  en: { title: 'Commentary', cand: 'Candidate moves', loading: 'Loading…', running: 'Analysing… {a}/{b}', study: 'Explore', restore: 'Back to game', back: 'Take back one move', studying: 'Exploring', played: 'played', head: 'Exploring: from the position before move {n}, +{m} moves', hint: 'Play moves on the board or click a candidate to explore. ◀ takes one back, [Back to game] returns to the game position.', over: 'Game over', last: 'Last move: {m}', none: '—', clickHint: 'Click to play this move and explore' },
  zh: { title: '解说', cand: '候选着法', loading: '计算中…', running: '分析中… {a}/{b}', study: '研究', restore: '复原', back: '退一步', studying: '研究中', played: '实战', head: '研究中：从第{n}手的局面起 +{m}手', hint: '可在棋盘上落子，或点击候选着法进行研究。◀ 退一步，［复原］回到原局面。', over: '终局', last: '上一手：{m}', none: '—', clickHint: '点击走这一手并研究' },
  ko: { title: '해설', cand: '후보수', loading: '계산 중…', running: '분석 중… {a}/{b}', study: '검토하기', restore: '되돌리기', back: '한 수 무르기', studying: '검토 중', played: '실전', head: '검토 중: {n}수째 국면에서 +{m}수', hint: '판 위에서 수를 두거나 후보수를 클릭해 검토할 수 있습니다. ◀ 로 한 수 무르고, [되돌리기]로 원래 국면으로 돌아갑니다.', over: '종국', last: '직전 수: {m}', none: '—', clickHint: '클릭하면 이 수를 두고 검토' },
  es: { title: 'Comentario', cand: 'Jugadas candidatas', loading: 'Cargando…', running: 'Analizando… {a}/{b}', study: 'Explorar', restore: 'Volver a la partida', back: 'Deshacer una jugada', studying: 'Explorando', played: 'jugada', head: 'Explorando: desde la posición antes de la jugada {n}, +{m}', hint: 'Juega en el tablero o haz clic en una candidata para explorar. ◀ deshace una, [Volver a la partida] vuelve a la posición original.', over: 'Fin de la partida', last: 'Última jugada: {m}', none: '—', clickHint: 'Clic para jugar esta jugada y explorar' },
  fr: { title: 'Commentaire', cand: 'Coups candidats', loading: 'Chargement…', running: 'Analyse… {a}/{b}', study: 'Explorer', restore: 'Revenir à la partie', back: 'Annuler un coup', studying: 'Exploration', played: 'joué', head: 'Exploration : depuis la position avant le coup {n}, +{m}', hint: 'Jouez sur le plateau ou cliquez sur un candidat pour explorer. ◀ annule un coup, [Revenir à la partie] rétablit la position.', over: 'Partie terminée', last: 'Dernier coup : {m}', none: '—', clickHint: 'Cliquer pour jouer ce coup et explorer' },
  pt: { title: 'Comentário', cand: 'Lances candidatos', loading: 'Carregando…', running: 'Analisando… {a}/{b}', study: 'Explorar', restore: 'Voltar à partida', back: 'Voltar um lance', studying: 'Explorando', played: 'jogado', head: 'Explorando: a partir da posição antes do lance {n}, +{m}', hint: 'Jogue no tabuleiro ou clique em um candidato para explorar. ◀ volta um lance, [Voltar à partida] retorna à posição original.', over: 'Fim de jogo', last: 'Último lance: {m}', none: '—', clickHint: 'Clique para jogar este lance e explorar' },
  de: { title: 'Kommentar', cand: 'Kandidatenzüge', loading: 'Wird berechnet…', running: 'Analyse… {a}/{b}', study: 'Untersuchen', restore: 'Zurück zur Partie', back: 'Einen Zug zurück', studying: 'Analysemodus', played: 'gespielt', head: 'Analysemodus: ab der Stellung vor Zug {n}, +{m}', hint: 'Ziehe auf dem Brett oder klicke einen Kandidaten an. ◀ nimmt einen Zug zurück, [Zurück zur Partie] stellt die Stellung wieder her.', over: 'Partie beendet', last: 'Letzter Zug: {m}', none: '—', clickHint: 'Klicken, um diesen Zug zu spielen' },
  hi: { title: 'टिप्पणी', cand: 'संभावित चालें', loading: 'लोड हो रहा है…', running: 'विश्लेषण… {a}/{b}', study: 'जाँचें', restore: 'वापस खेल पर', back: 'एक चाल वापस', studying: 'जाँच जारी', played: 'खेली गई', head: 'जाँच: चाल {n} से पहले की स्थिति से +{m}', hint: 'बोर्ड पर चाल चलें या किसी संभावित चाल पर क्लिक करें। ◀ एक चाल वापस, [वापस खेल पर] मूल स्थिति पर लौटाता है।', over: 'खेल समाप्त', last: 'पिछली चाल: {m}', none: '—', clickHint: 'यह चाल चलकर जाँचने के लिए क्लिक करें' },
  ar: { title: 'الشرح', cand: 'النقلات المرشحة', loading: 'جارٍ التحميل…', running: 'جارٍ التحليل… {a}/{b}', study: 'استكشاف', restore: 'العودة إلى المباراة', back: 'التراجع نقلة', studying: 'وضع الاستكشاف', played: 'المُلعوبة', head: 'استكشاف: من الوضع قبل النقلة {n}، ‎+{m}', hint: 'العب على اللوحة أو انقر على نقلة مرشحة للاستكشاف. ◀ للتراجع نقلة، و[العودة إلى المباراة] للرجوع إلى الوضع الأصلي.', over: 'انتهت المباراة', last: 'النقلة الأخيرة: {m}', none: '—', clickHint: 'انقر للعب هذه النقلة والاستكشاف' },
};
function bxT(k, v) { let s = (BX_T[LANG] || BX_T.en)[k]; if (s === undefined) s = BX_T.en[k]; return v ? s.replace(/\{(\w+)\}/g, (_, x) => v[x] !== undefined ? v[x] : '') : s; }
const bxEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const bxCache = new Map();  // position key → analysis list with lines
let bxW = null, bxPending = '';
function bxAllowed() {
  return !!(HB && HB.on && !lesson && !puzzle && rvOpen && rv && rv.key === rvKey() && !(settings.mode === 'online' && window.olNoAna && olNoAna())
    && (settings.mode !== 'ai' || isOver(game.moves.length) || game.resigned != null));   // (not while a game against the AI is still on)
}
const bxKey = p => game.rules + p.side + ':' + Array.from(p.b).join(',');
function studyStart(k) {
  if (!bxAllowed() || animating) return;
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = -1; stopAnim(); stopPlay();
  study = { g: game, n: game.moves.length, base: cur, moves: [], P: [P[cur]] };
  fxMarks = []; bxHover = -1; update();
  if (k !== undefined && k >= 0) studyMove(k);
}
function studyRecompute() { study.P = E.replay(P[study.base].b, P[study.base].side, study.moves, game.rules).positions; }
async function studyMove(k) {
  if (!inStudy() || animating) return;
  const from = studyTop(); if (from.over || !from.b[E.baseOf(from.side) + k]) return;
  bxHover = -1; setHover(-1); fxEl.innerHTML = '';
  const tok = ++busyToken;
  await animateMove(from.b, from.side, k, game.rules);
  if (tok !== busyToken || !inStudy()) return;
  study.moves.push(k); studyRecompute();
  update();
}
function studyBack() {
  if (!inStudy() || !study.moves.length) return;
  busyToken++; stopAnim();
  study.moves.pop(); studyRecompute(); bxHover = -1; update();
}
function studyExit() {
  if (!study) return;
  const was = inStudy(); study = null; bxHover = -1;
  if (!was) return;
  busyToken++; stopAnim(); fxMarks = [];
  update(); afterPosition();
}
// the position the box describes and its analysis (multi-move search with lines) on a worker of its own
function bxAnalyze(p) {
  const key = bxKey(p);
  if (bxCache.has(key) || bxPending === key || p.over) return;
  if (bxW) { bxW.terminate(); bxW.jobs.forEach(j => j.resolve(null)); }
  bxW = makeWorker(); bxPending = key;
  const w = bxW, id = ++jobId, at = inStudy() ? -1 : cur, run = rv;
  new Promise(resolve => { w.jobs.set(id, { resolve }); w.postMessage({ type: 'analyze', ...posMsg(p, game.rules), ms: 800, pv: 8, id }); }).then(res => {
    if (bxW === w) { w.terminate(); bxW = null; bxPending = ''; }
    if (!res) return;
    const list = res.list.slice().sort((a, b) => b.v - a.v);
    bxCache.set(key, list); if (bxCache.size > 300) bxCache.delete(bxCache.keys().next().value);
    // a review position: the box's search (a little longer than the review's) becomes the review's values too, so the
    // verdict, the commentary and the numbers on the pits agree with the candidate list
    if (at >= 0 && run && rv === run && !run.running && run.key === rvKey() && P[at] && bxKey(P[at]) === key) {
      const plain = res.list.map(x => ({ m: x.m, v: x.v, exact: x.exact }));
      run.list[at] = plain; anaLists[at] = plain;
      if (!evals[at] || !evals[at].exact) evals[at] = { v: P[at].side === 0 ? list[0].v : -list[0].v, exact: res.exact };
    }
    renderInfo(); renderFx();
  });
}
function bxStop() { if (bxW) { bxW.terminate(); bxW.jobs.forEach(j => j.resolve(null)); bxW = null; bxPending = ''; } }
const bxMv = (side, k, extra) => `<span class="bx-m"><i class="p${side}"></i>${k + 1}${extra ? '<sup>+</sup>' : ''}</span>`;
function bxPV(p, line) {
  let b = Int8Array.from(p.b), out = '';
  for (let j = 0; j < line.length; j++) {
    const x = line[j], tr = E.trace(b, x.side, x.k, game.rules);
    if (j) out += bxMv(x.side, x.k, tr.extra && !tr.over);
    b = tr.board;
  }
  return out;
}
function renderBox() {
  const on = bxAllowed();
  if (!on && study) { const s = inStudy(); study = null; bxHover = -1; if (s) { stopAnim(); setTimeout(() => { update(); afterPosition(); }, 0); } }
  if (study && !inStudy()) study = null;
  const was = document.body.classList.contains('rvbox-on');
  document.body.classList.toggle('rvbox-on', on);
  document.body.classList.toggle('in-study', inStudy());
  if (was !== on) { setTimeout(layout, 30); if (!on) bxStop(); }
  const sb = $('#studyBadge'); sb.textContent = bxT('studying'); sb.classList.toggle('show', inStudy());
  if (!on) return;
  const st = inStudy(), p = st ? studyTop() : P[cur];
  // left: commentary
  let left = '';
  if (st) {
    left = `<p class="cr-mv"><b>${bxEsc(bxT('head', { n: study.base + 1, m: study.moves.length }))}</b></p>`;
    if (study.moves.length) {
      const i = study.P.length - 2, q = study.P[i], k = study.moves[i], L = bxCache.get(bxKey(q));
      let tag = '';
      if (L && L.length > 1) {
        const best = L[0], mine = L.find(x => x.m === k), loss = mine ? Math.max(0, best.v - mine.v) : 0;
        const flips = mine && mine.exact && best.exact && Math.sign(Math.round(best.v)) > Math.sign(Math.round(mine.v));
        const cls = loss < 0.3 ? 'best' : flips || loss >= 4 ? 'bad' : loss < 1.5 ? 'good' : 'dubious';
        tag = ` <span class="tag ${cls}">${bxEsc(t('q.' + cls))}</span>`;
      }
      let ex = []; try { ex = typeof mcExplain === 'function' ? mcExplain(q.b, q.side, k, game.rules) : []; } catch (e) {}
      left += `<p>${bxEsc(bxT('last', { m: '' }))}${bxMv(q.side, k, false)}${tag}</p>` + (ex.length ? `<ul class="cr-list">${ex.map(x => `<li>${x}</li>`).join('')}</ul>` : '');
    } else left += `<p class="bx-note">${bxEsc(bxT('hint'))}</p>`;
  } else if (rv.running) left = `<p class="bx-note">${bxEsc(bxT('running', { a: rv.done, b: rv.total }))}</p>`;
  else { try { left = cur < game.moves.length ? mcMove(cur) : mcSummary(); } catch (e) { console.warn(e); } }
  $('#bxCoach').innerHTML = left;
  // right: candidate moves with their lines
  let right = '';
  if (p.over) right = `<p class="bx-note">${bxEsc(bxT('over'))}</p>`;
  else {
    const L = bxCache.get(bxKey(p));
    if (!L) { right = `<p class="bx-note bx-load">${bxEsc(bxT('loading'))}</p>`; bxAnalyze(p); }
    else {
      const played = !st && cur < game.moves.length ? game.moves[cur] : -1;
      right = L.slice(0, 5).map((x, j) => {
        const tr = E.trace(p.b, p.side, x.m, game.rules);
        return `<button class="bx-c${x.m === played ? ' played' : ''}${j === 0 ? ' top' : ''}" data-k="${x.m}" title="${bxEsc(bxT('clickHint'))}"><span class="rk">${j + 1}</span>${bxMv(p.side, x.m, tr.extra && !tr.over)}<span class="ev${x.v < 0 ? ' neg' : ''}">${fmtV(x.v, x.exact)}</span><span class="pv">${bxPV(p, x.pv || [])}</span>${x.m === played ? `<span class="pl">${bxEsc(bxT('played'))}</span>` : ''}</button>`;
      }).join('');
    }
  }
  $('#bxCands').innerHTML = right;
  $('#bxCandT').textContent = bxT('cand');
  $('#bxTitle').textContent = bxT('title');
  const bs = $('#bxStudy'), br = $('#bxRestore'), bb = $('#bxBack');
  bs.textContent = bxT('study'); br.textContent = bxT('restore'); bb.title = bxT('back');
  bs.classList.toggle('hidden', st); br.classList.toggle('hidden', !st); bb.classList.toggle('hidden', !st);
  bb.disabled = !st || !study.moves.length;
}
// the board while a candidate is hovered: the pit, where its last seed lands and what it captures
function drawBoxFx() {
  if (bxHover < 0 || !document.body.classList.contains('rvbox-on')) return;
  const p = shownPos(); if (p.over || !p.b[pitIndex(p.side, bxHover)]) return;
  const tr = E.trace(p.b, p.side, bxHover, game.rules);
  fxRing(pitIndex(p.side, bxHover), 'cand');
  fxRing(tr.land, tr.extra ? 'ok' : '');
  if (tr.cap) fxRing(tr.capFrom, 'cap');
}
$('#bxCands').addEventListener('pointerover', e => { const b = e.target.closest('.bx-c'); const k = b ? +b.dataset.k : -1; if (k !== bxHover) { bxHover = k; renderFx(); } });
$('#bxCands').addEventListener('pointerleave', () => { if (bxHover >= 0) { bxHover = -1; renderFx(); } });
$('#bxCands').addEventListener('click', e => { const b = e.target.closest('.bx-c'); if (!b) return; const k = +b.dataset.k; if (inStudy()) studyMove(k); else studyStart(k); });
$('#bxStudy').onclick = () => studyStart();
$('#bxRestore').onclick = () => studyExit();
$('#bxBack').onclick = () => studyBack();
$('#bxCoach').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
// study: the values of the moves (from the box's analysis) on the pits
function drawStudyFx() {
  const p = shownPos(); if (p.over) return;
  const L = bxCache.get(bxKey(p)); if (!L) return;
  const best = L[0].v;
  for (const x of L) { const i = pitIndex(p.side, x.m), u = slotUV(i); fxAt(i, 0, u.bottom ? -0.36 : 0.36, 'hintlbl' + (x.v >= best - 1e-9 ? ' best' : '') + (x.v < 0 ? ' neg' : ''), fmtV(x.v, x.exact)); }
}

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
  reviewing = cur !== game.moves.length; gameOverShown = isOver(game.moves.length) || game.resigned != null;
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
  if (!PUZZLES) return null;
  pzIndex();
  const now = new Date(), date = ymd(now);
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
  let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; h >>>= 0;
  // easier puzzles early in the week, harder ones at the weekend (difficulty 1-2 Mon … 4-5 Sat/Sun)
  const want = [[4, 5], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [4, 5]][now.getDay()];
  const pool = []; THEMES.forEach((T, L) => T.puzzles.forEach((P, j) => { const d = pzDiff(P); if (d >= want[0] && d <= want[1]) pool.push([L, j]); }));
  const [L, j] = pool[h % pool.length];
  return { date, L, j };
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
  if (inStudy()) studyExit();
  if (settings.mode === 'online') { openNewDialog(); return; }
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
try { const sp = localStorage.getItem('atlas-sfx'); if (sp === '0' || sp === '1') settings.sound = sp === '1'; } catch (e) {} // サイト共通のサウンド設定（トップページと連動）
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
try { const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) { LANG = q; try { localStorage.setItem('aicoding-lang', q); } catch (_) {} } } catch (e) {}
$('#btnResign').innerHTML = Resign.icon + '<span></span>';
applyI18n();
if (window.PZBook) PZBook.setLang(LANG);
// PC header bar: title left, menu (new > undo > hint > rules > lessons > puzzles) + icons right, game info in between
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnResign', '#btnHint', '#btnRules', '#btnLesson', '#btnPuzzle'], lang: () => LANG }) : null;
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
  const W = window.innerWidth, portrait = window.innerHeight >= W;
  // the online tab bar (+ the chat strip in portrait) at the bottom takes its height from the board (online-ui.js sets html.ol-dock)
  const dk = document.documentElement.classList, H = window.innerHeight - (dk.contains('ol-dock') ? (portrait && !dk.contains('ol-soon') ? 90 : 50) : 0);
  // a height-only change from the browser bars keeps the size; a big height change (or a bogus first measurement
  // taken mid-rotation / while an iframe is still sizing) is recomputed
  if (W === fixW && portrait === fixPortrait && Math.abs(H - fixH) < fixH * 0.25) return;
  if (W < 200 || H < 200) { fixW = 0; root.removeProperty('--u'); return; }   // transient: wait for a real size
  fixW = W; fixH = H; fixPortrait = portrait;
  root.setProperty('--vh', H + 'px');
  if (portrait) root.setProperty('--u', Math.floor(Math.min((W - 24) / 4.2, (H - (dk.contains('ol-dock') ? 222 : 172)) / 9.7, 100)) + 'px');   // with the bottom bars both player plates stay above them
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
  else if (!hadSave) { update(); }   // (no new-game dialog on load: the start position waits for 対局)
  else { update(); if (!isOver()) toast(t('saved'), 1400); afterPosition(); }
});
// test hooks
window.__mancala = { get game() { return game; }, get cur() { return cur; }, get P() { return P; }, settings, get rv() { return rv; }, rvJudge, dailyPick, parseGameText, onPit, newGame, get lesson() { return lesson; }, get puzzle() { return puzzle; }, get animating() { return animating; }, get thinking() { return thinking; }, startPuzzle, startLesson, viewAt };

// first-time banner in the new-game dialog → illustrated rules
if (window.RulesOffer) RulesOffer.init({ game: 'mancala', lang: () => LANG, open: () => openRules(), watch: '#rulesOverlay' });
