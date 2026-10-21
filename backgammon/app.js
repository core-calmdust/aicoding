// Backgammon V2 — page logic
'use strict';
// ====================================================================== i18n
const SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
function detectLang() {
  const n = (navigator.language || 'en').toLowerCase();
  for (const l of SUPPORTED) if (n.startsWith(l)) return l;
  return 'en';
}
let LANG = detectLang();
function t(k, v) {
  let x = (I18N[LANG] || {})[k];
  if (x === undefined) x = I18N.en[k];
  if (x === undefined) x = I18N.ja[k];
  if (x === undefined) return k;
  if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : '');
  return x;
}
const pname = s => t('ng.' + ((settings.ck && settings.ck[s]) || (s ? 'black' : 'gold')));
const LV = i => t('lv')[i], LVD = i => t('lvd')[i];
const mvb = s => `<bdi class="mv">${s}</bdi>`;
function applyI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG;
  document.querySelectorAll('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-ph]').forEach(e => { e.placeholder = t(e.dataset.i18nPh); });
  const sel = document.getElementById('langSel'); if (sel) sel.value = LANG;
  document.title = t('meta.title');
}

// ====================================================================== settings / state
const STORE = 'aicoding-backgammon-v2';
const settings = { mode: 'ai', color: 0, ck: ['gold', 'black'], skin: 'classic', level: 6, level2: 6, matchLen: 0, cube: true, eval: true, forced: true, autoRoll: true, coach: false, anim: true, sound: true, hint: false, lang: '' };
const $ = s => document.querySelector(s);
// the game's own animation setting is the only switch (the OS "reduce motion" preference is not used: the user
// asked for dice / checker animations to play regardless)
const anim = () => !!settings.anim;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// match: {seed, len, cube, games:[{actions, start:[a,b], crawford}]}
let match = null;
let humanSide = 0;          // vs AI: the human's colour
let view = 0;               // side shown at the bottom
let cur = 0;                // index into timeline()
let reviewing = false;
let turn = null;            // interactive turn in progress {side, dice, left, steps, pos, start}
let busyToken = 0;
let thinking = -1;
let lesson = null, puzzle = null;
let evals = new Map();      // "g:a" -> P(gold wins) & probs
let gameOverShown = new Set();
let streams = new Map();
let hintData = null;        // {key, list} or {key, cube}
let previewPlay = null;     // moves to draw as arrows {side, start, moves, cls}
let extraArrows = [];
let marks = [];             // lesson marks [{side, p, cls}]
let commitHash = '';

function newMatch(seed, len, cube) {
  return { seed: seed || BG.randomSeed(), len: len || 0, cube: cube !== false, games: [{ actions: [], start: [0, 0], crawford: false }] };
}
function stream(g) {
  const k = match.seed + '|' + g;
  if (!streams.has(k)) streams.set(k, new BG.DiceStream(match.seed, g));
  return streams.get(k);
}
function timeline() {
  const tl = [];
  match.games.forEach((gm, g) => { for (let a = 0; a <= gm.actions.length; a++) tl.push([g, a]); });
  return tl;
}
function tlIndex(g, a) { let i = 0; for (let k = 0; k < g; k++) i += match.games[k].actions.length + 1; return i + a; }
function latestIdx() { return tlIndex(match.games.length - 1, match.games[match.games.length - 1].actions.length); }
function at(i) { const tl = timeline(); i = Math.max(0, Math.min(tl.length - 1, i)); return tl[i]; }
function stateAt(g, a) { return BG.replay(match.games[g].actions, a); }
function curGA() { return at(cur); }
function curState() { const [g, a] = curGA(); return stateAt(g, a); }
function isLatest() { return cur === latestIdx(); }
function ctxFor(g, side) {
  const gm = match.games[g], st = stateAt(g, gm.actions.length);
  const len = match.len;
  const atLen1 = len > 0 && (gm.start[0] === len - 1 || gm.start[1] === len - 1);
  return { cube: st.cube, owner: st.owner, me: side, matchLen: len, score: gm.start.slice(), crawford: !!gm.crawford, postCrawford: atLen1 && !gm.crawford, cubeOn: match.cube && !(len === 1), x: 0.68 };
}
function ctxAt(g, a, side) {
  const gm = match.games[g], st = stateAt(g, a), len = match.len;
  const atLen1 = len > 0 && (gm.start[0] === len - 1 || gm.start[1] === len - 1);
  return { cube: st.cube, owner: st.owner, me: side, matchLen: len, score: gm.start.slice(), crawford: !!gm.crawford, postCrawford: atLen1 && !gm.crawford, cubeOn: match.cube, x: 0.68 };
}
function scoreAfter(g) {
  const gm = match.games[g], st = stateAt(g, gm.actions.length), s = gm.start.slice();
  if (st.over) s[st.winner] += st.points;
  return s;
}
function matchOver() {
  const g = match.games.length - 1, st = stateAt(g, match.games[g].actions.length);
  if (!st.over) return false;
  if (!match.len) return false;
  const s = scoreAfter(g); return s[0] >= match.len || s[1] >= match.len;
}
function isAI(s) { if (lesson || puzzle) return false; return settings.mode === 'watch' || (settings.mode === 'ai' && s !== humanSide); }
function levelFor(s) { return settings.mode === 'watch' ? (s === 0 ? settings.level : settings.level2) : settings.level; }
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function playerName(s) {
  if (puzzle || lesson) return s === (lesson || puzzle).side ? t('you') : '';
  if (settings.mode === 'pvp') return '';
  if (settings.mode === 'watch') return `AI ${LV(levelFor(s))}`;
  return s === humanSide ? t('you') : `AI ${LV(settings.level)}`;
}

// ====================================================================== storage
function save() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || '{}');
    d.settings = settings;
    if (!lesson && !puzzle && match) d.match = { seed: match.seed, len: match.len, cube: match.cube, games: match.games.map(gm => ({ k: BG.encodeGame(gm.actions), start: gm.start, crawford: gm.crawford })), humanSide };
    localStorage.setItem(STORE, JSON.stringify(d));
  } catch (e) {}
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (!d) return false;
    Object.assign(settings, d.settings || {});
    if (d.match && d.match.games) {
      const m = { seed: String(d.match.seed || '').replace(/[^a-z0-9]/g, '') || BG.randomSeed(), len: +d.match.len || 0, cube: d.match.cube !== false, games: [] };
      for (const gm of d.match.games) {
        const r = BG.decodeGame(gm.k || '');
        if (r.error) return false;
        m.games.push({ actions: r.actions, start: gm.start || [0, 0], crawford: !!gm.crawford });
      }
      if (!m.games.length) return false;
      match = m; humanSide = d.match.humanSide || 0;
      return true;
    }
  } catch (e) {}
  return false;
}

// ====================================================================== workers
let jobId = 0;
function makeWorker() {
  const w = new Worker('engine.js?v=20261021op');
  w.jobs = new Map();
  w.onmessage = e => { const m = e.data, j = w.jobs.get(m.id); if (!j) return; w.jobs.delete(m.id); if (m.error) console.warn(m.error); j.resolve(m); };
  w.onerror = e => console.warn('worker error', e.message);
  return w;
}
let aiW = makeWorker(), anaW = makeWorker();
function request(which, msg) {
  const w = which === 'ai' ? aiW : which === 'ana' ? anaW : which;
  if (msg.pos) msg.pos = Array.from(msg.pos);
  return new Promise(resolve => { const id = ++jobId; w.jobs.set(id, { resolve }); w.postMessage({ ...msg, id }); });
}
function cancelWorker(which) {
  const w = which === 'ai' ? aiW : anaW;
  if (!w.jobs.size) return;
  w.terminate(); w.jobs.forEach(j => j.resolve(null));
  if (which === 'ai') aiW = makeWorker(); else anaW = makeWorker();
}

// ====================================================================== sound
let actx = null;
// audio may only start after a user gesture (avoids the browser's autoplay warning when a saved game resumes)
let userGestured = false;
for (const ev of ['pointerdown', 'keydown', 'touchstart']) addEventListener(ev, () => { userGestured = true; }, { capture: true, passive: true });
function ctx() { if (!userGestured && (!navigator.userActivation || !navigator.userActivation.hasBeenActive)) return null; if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === 'suspended') actx.resume(); return actx; }
function noise(a, dur, freq, q, vol, t0) {
  const n = a.createBufferSource(), len = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  n.buffer = buf; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.value = vol; n.connect(f).connect(g).connect(a.destination); n.start(t0 || a.currentTime);
}
function tone(a, f0, f1, dur, vol, type, t0) {
  const o = a.createOscillator(), g = a.createGain(); t0 = t0 || a.currentTime;
  o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur * 0.8);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}
const SFX = {
  clack() { if (!settings.sound) return; const a = ctx(); if (!a) return; tone(a, 420, 180, 0.09, 0.28); noise(a, 0.035, 2600, 1.4, 0.5); },
  hit() { if (!settings.sound) return; const a = ctx(); if (!a) return; tone(a, 300, 90, 0.16, 0.4); noise(a, 0.05, 1500, 1, 0.7); noise(a, 0.03, 3800, 2, 0.35, a.currentTime + 0.05); },
  off() { if (!settings.sound) return; const a = ctx(); if (!a) return; noise(a, 0.12, 900, 0.8, 0.35); tone(a, 520, 330, 0.12, 0.12, 'triangle'); },
  dice() { if (!settings.sound) return; const a = ctx(); if (!a) return; const t0 = a.currentTime; for (let i = 0; i < 7; i++) noise(a, 0.025, 2200 + Math.random() * 2400, 2, 0.32 * (1 - i / 9), t0 + i * 0.055 + Math.random() * 0.02); tone(a, 260, 140, 0.08, 0.15, 'sine', t0 + 0.4); },
  cube() { if (!settings.sound) return; const a = ctx(); if (!a) return; tone(a, 180, 70, 0.22, 0.45); noise(a, 0.06, 700, 1, 0.5); },
  land(g = 1) { if (!settings.sound) return; const a = ctx(); if (!a) return; tone(a, 210, 120, 0.07, 0.22 * g); noise(a, 0.03, 1800, 1.2, 0.35 * g); },
  tick() { if (!settings.sound) return; const a = ctx(); if (!a) return; tone(a, 880, 880, 0.08, 0.05, 'triangle'); },
  chime(win) {
    if (!settings.sound) return; const a = ctx(); if (!a) return;
    const t0 = a.currentTime + 0.05, notes = win ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [392, 349.23, 311.13, 261.63];
    notes.forEach((fr, i) => { const tt = t0 + i * (win ? 0.1 : 0.16); tone(a, fr, fr * 0.999, 0.7, 0.14, win ? 'triangle' : 'sine', tt); });
  },
};

// ====================================================================== board geometry (units)
const G = { W: 15.85, H: 12, LX: 0.5, BX: 6.5, B: 1.2, RX: 7.7, RE: 13.7, TX: 14.05, TW: 1.3, TOP: 0.5, BOT: 11.5, MID: 6, C: 0.94, PL: 4.6, FLAT: false };
// phone landscape uses a flatter board (shorter points, stacks compress earlier) so it can span the full width;
// its height (in board units) is fitted to the space left under the slim top row
function setGeom(flat, h, u) {
  G.FLAT = flat; document.body.classList.toggle('flat-geo', flat); G.H = flat ? h : 12; G.BOT = G.H - 0.5; G.MID = G.H / 2; G.PL = (G.MID - G.TOP) * 0.836;
  const st = document.documentElement.style;
  if (flat) { st.setProperty('--gh', h.toFixed(3)); if (u) { st.setProperty('--u', u.toFixed(2) + 'px'); st.setProperty('--fw', (u * 15.85).toFixed(1) + 'px'); st.setProperty('--fh', (u * h).toFixed(1) + 'px'); } }
  else for (const k of ['--gh', '--u', '--fw', '--fh']) st.removeProperty(k);
}
// flat geometry: the board spans the width; its height (board units) fits the space under the top row, which may be
// a taller lesson / puzzle strip — then the board also gets narrower (u) so it still fits without scrolling
function flatFit() {
  const w = ROT ? innerHeight : innerWidth, hgt = ROT ? innerWidth : innerHeight;
  let top = 34;
  const app = document.querySelector('.app');
  if (app && typeof lrect === 'function') {
    const a0 = lrect(app).top;
    for (const sel of ['.brand', '.players', '.controls', '#lessonCard', '#puzzleCard']) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent && getComputedStyle(el).display !== 'none') { const r = lrect(el); if (r.height) top = Math.max(top, r.top - a0 + r.height); }
    }
  }
  const avail = hgt - top - 4 - 5 - 6;
  const u = Math.min((w - 12) / 15.85, avail / 6.4, 60);
  return { h: Math.max(6.4, Math.min(10, avail / u)), u };
}
const frameEl = $('#frame'), ckLayer = $('#ckLayer'), dstLayer = $('#dstLayer'), diceLayer = $('#diceLayer'), glowLayer = $('#glowLayer'), lblLayer = $('#lblLayer'), cubeEl = $('#cube'), arrowsEl = $('#arrows'), bbtns = $('#bbtns');
const uPx = () => frameEl.clientWidth / G.W;
const toV = (s, p) => (p === 0 || p === 25) ? p : (s === view ? p : 25 - p);       // side-s point -> view point
const fromV = (s, vp) => (vp === 0 || vp === 25) ? vp : (s === view ? vp : 25 - vp);
function slotX(vp) {
  if (vp <= 6) return G.RX + (6 - vp) + 0.5;
  if (vp <= 12) return G.LX + (12 - vp) + 0.5;
  if (vp <= 18) return G.LX + (vp - 13) + 0.5;
  return G.RX + (vp - 19) + 0.5;
}
function stackStep(n) { const avail = G.FLAT ? G.MID - G.TOP - 0.12 : 5 * G.C; return n <= 1 ? G.C : Math.min(G.C, (avail - G.C) / (n - 1)); }
// flat board: how many checkers of a stack are drawn (the rest sit under the bottom one; the top shows the count)
function stackCap() { return G.FLAT ? Math.max(2, Math.floor((G.MID - G.TOP - 0.12 - G.C) / (G.C * 0.7)) + 1) : 99; }
function slotXY(vp, k, n) {
  const cap = stackCap(); if (n > cap) { k = Math.max(0, k - (n - cap)); n = cap; }
  const st = stackStep(n);
  if (vp >= 13) return [slotX(vp), G.TOP + G.C / 2 + k * st];
  return [slotX(vp), G.BOT - G.C / 2 - k * st];
}
function barXY(s, k, n) {
  const ba = G.MID - G.TOP - 1.6, st = n <= 1 ? G.C : Math.min(G.C, (ba - G.C) / (n - 1)), x = G.BX + G.B / 2;
  return s === view ? [x, G.MID - 1.02 - k * st] : [x, G.MID + 1.02 + k * st];
}
function offXY(s, k) {
  const x = G.TX + G.TW / 2;
  const st = Math.min(0.28, (G.MID - G.TOP - 0.55) / 15);
  return s === view ? [x, G.BOT - 0.17 - k * st - 0.25] : [x, G.TOP + 0.17 + k * st];
}
// checker position of the k-th checker (0 = bottom of the stack) of side s on its point p, with n checkers there
function ckXY(s, p, k, n) { if (p === 25) return barXY(s, k, n); return slotXY(toV(s, p), k, n); }
const U = v => `calc(var(--u) * ${+v.toFixed(4)})`;

// static board drawing (SVG, 100 user units per board unit)
const curSkin = () => (window.BGTheme ? BGTheme.skin(settings.skin) : { frame: ['#3a2416', '#24150c', '#3b2517'], grain: 'rgba(255,220,170,.05)', felt: ['#1d6a4b', '#145238', '#0b3424'], noise: .9, ptA: ['#efe5cc', '#c8b994'], ptB: ['#7a2a24', '#4a1612'], bar: ['#1f130a', '#3a2416', '#1f130a'], tray: ['#08251a', '#0d2f21', '#08251a'], inlay: ['#f0d68f', '#b8934e', '#e2c275'], hinge: true, mini: { frame: '#2b1a10', felt: '#17573f', a: '#e6dbc2', b: '#6b2420', tray: '#0d2f21' } });
function drawBoardSvg() {
  const w = G.W * 100, h = G.H * 100;
  $('#boardSvg').setAttribute('viewBox', `0 0 ${w} ${h}`); $('#arrows').setAttribute('viewBox', `0 0 ${w} ${h}`);
  $('#boardSvg').innerHTML = window.BGTheme ? BGTheme.boardMarkup(settings.skin, G, 'b') : `<rect width="${w}" height="${h}" rx="28" fill="#2b1a10"/>`;
}
function drawLabels() {
  let h = '';
  for (let vp = 1; vp <= 24; vp++) {
    const x = slotX(vp), y = vp >= 13 ? 0.24 : G.H - 0.24;
    h += `<div class="lbl" style="left:${U(x)};top:${U(y)}">${vp}</div>`;
  }
  const st = shownState();
  const p = st.pos;
  const bx = G.BX + G.B / 2;
  h += `<div class="lbl pip" style="left:${U(bx)};top:${U(G.H - 0.24)}">${BG.pips(p, view)}</div>`;
  h += `<div class="lbl pip" style="left:${U(bx)};top:${U(0.24)}">${BG.pips(p, 1 - view)}</div>`;
  lblLayer.innerHTML = h;
}

// ====================================================================== shown position
// what is on the board: the record state at cur, or the interactive turn's partial position
function shownState() {
  const [g, a] = curGA();
  const st = stateAt(g, a);
  if (lesson && lesson.posOverride) return Object.assign(st, { pos: lesson.posOverride });
  if (puzzle && puzzle.posOverride) return Object.assign(st, { pos: puzzle.posOverride });
  if (turn && isLatest() && !reviewing) return Object.assign(st, { pos: turn.pos, turnSide: turn.side });
  return st;
}
function renderCheckers(p, opts) {
  opts = opts || {};
  ckLayer.innerHTML = '';
  const movable = opts.movable || new Set();
  const last = opts.last || new Map();
  for (const s of [0, 1]) {
    const m = s * 26;
    for (let pt = 1; pt <= 25; pt++) {
      const n = p[m + pt];
      for (let k = 0; k < n; k++) {
        const [x, y] = ckXY(s, pt, k, n);
        const el = document.createElement('div');
        el.className = 'ck p' + s;
        el.dataset.s = s; el.dataset.p = pt; el.dataset.k = k;
        el.style.left = U(x); el.style.top = U(y);
        if (k === n - 1) {
          if (n > Math.min(5, pt === 25 ? 99 : stackCap()) || (pt === 25 && n > 1)) el.innerHTML = `<b>${n}</b>`;
          if (movable.has(s * 100 + pt)) el.classList.add('movable');
          if (opts.sel && opts.sel.s === s && opts.sel.p === pt) el.classList.add('sel');
          if (last.has(s * 100 + pt)) el.classList.add('last');
        }
        ckLayer.appendChild(el);
      }
    }
    for (let k = 0; k < p[m]; k++) {
      const [x, y] = offXY(s, k);
      const el = document.createElement('div'); el.className = 'slab p' + s; el.dataset.s = s; el.dataset.off = k;
      el.style.left = U(x); el.style.top = U(y);
      ckLayer.appendChild(el);
    }
  }
}
function topChecker(s, pt) {
  const els = ckLayer.querySelectorAll(`.ck[data-s="${s}"][data-p="${pt}"]`);
  return els.length ? els[els.length - 1] : null;
}
function renderCube(st, offeredBy) {
  const v = st.cube;
  let x = G.BX + G.B / 2, y = G.MID, txt = v === 1 ? '64' : String(v), cls = 'cube';
  if (st.owner === view) { x = G.TX + G.TW / 2; y = G.MID + 0.75; }
  else if (st.owner === 1 - view) { x = G.TX + G.TW / 2; y = G.MID - 0.75; }
  if (st.offered) { const d = st.doubler; x = d === view ? G.RX + 3 : G.LX + 3; y = G.MID; txt = String(v * 2); cls += ' offer'; }
  const CQ = (lesson && lesson.cubeQ) ? lesson : (puzzle && puzzle.cubeQ) ? puzzle : null;
  if (CQ) {   // cube lessons / puzzles: centred cube, or a pending double by the opponent
    x = G.BX + G.B / 2; y = G.MID; txt = '64'; cls = 'cube';
    if (CQ.cubeQ === 'take') { x = CQ.side === view ? G.LX + 3 : G.RX + 3; txt = '2'; cls += ' offer'; }
  }
  cubeEl.className = cls; cubeEl.textContent = txt;
  cubeEl.style.left = U(x); cubeEl.style.top = U(y);
  cubeEl.style.display = (match && match.cube && !lesson && !puzzle) || CQ ? '' : 'none';
}
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function dieHTML(s, v, x, y, used, size, yaw) {
  const on = new Set(PIPS[v] || []);
  // yaw: the angle a thrown die came to rest at; the drop shadow is turned back so it still falls straight down
  const rot = yaw ? `transform:rotate(${yaw.toFixed(4)}rad);--sx:${(0.08 * Math.sin(yaw)).toFixed(4)};--sy:${(0.08 * Math.cos(yaw)).toFixed(4)};` : '';
  let h = `<div class="die p${s}${used ? ' used' : ''}" style="left:${U(x)};top:${U(y)};${size ? `--ds:${size};` : ''}${rot}">`;
  for (let i = 0; i < 9; i++) h += `<i class="${on.has(i) ? 'on' : ''}"></i>`;
  return h + '</div>';
}
// dice of side s: values, which are used
function diceLayout(s, dice, usedCount) {
  const cx = s === view ? G.RX + 3 : G.LX + 3, y = G.MID;
  if (dice[0] === dice[1]) {
    let h = ''; const xs = [-1.38, -0.46, 0.46, 1.38];
    for (let i = 0; i < 4; i++) h += dieHTML(s, dice[0], cx + xs[i], y, i < usedCount, 0.74);
    if (performance.now() < dblFlashUntil) h = h.replace(/class="die /g, 'class="die dbl ');
    return h;
  }
  return null;
}
function renderDice(s, dice, used) {
  if (rollAnimating) return;
  // used: array of booleans per die (non-double) or count (double)
  if (!dice) { diceLayer.innerHTML = ''; return; }
  const cx = s === view ? G.RX + 3 : G.LX + 3, y = G.MID;
  if (dice[0] === dice[1]) { diceLayer.innerHTML = diceLayout(s, dice, used || 0); return; }
  const u = used || [false, false];
  const rp = restFor(s, dice);
  if (rp) { diceLayer.innerHTML = rp.map((r, i) => dieHTML(s, dice[i], r.x, r.y, u[i], 0, r.yaw)).join(''); return; }
  diceLayer.innerHTML = dieHTML(s, dice[0], cx - 0.55, y, u[0]) + dieHTML(s, dice[1], cx + 0.55, y, u[1]);
}
// where the dice of the latest throw came to rest (non-doubles keep that place for the whole turn)
let restPose = null;
function restFor(s, dice) {
  const r = restPose;
  if (!r || r.opening || reviewing || !isLatest() || r.s !== s || r.dice[0] !== dice[0] || r.dice[1] !== dice[1] || dice[0] === dice[1]) return null;
  return r.pos;
}
// dice roll (dice3d.js): the whole throw is laid out first — a drop from the hand, three bounces of decreasing height
// under constant gravity while tumbling, then rolling over the edges, a last tip and a little rock — with the faces
// labelled so the rolled number ends on top; it is then played back, drawn in 3D on a canvas.
// Non-doubles stay where they came to rest; doubles slide together into the four-dice row afterwards.
// Tapping anywhere skips to the result; nothing is animated when animations are off in the settings.
let rollSkip = false, rollAnimating = false, dblFlashUntil = 0;
addEventListener('pointerdown', () => { if (rollAnimating) rollSkip = true; }, { capture: true, passive: true });
async function rollAnim(s, dice, opening) {
  SFX.dice();
  restPose = null;
  if (!settings.anim || !window.Dice3D || !Dice3D.ready) return;      // animations switched off in the settings: instant
  const half = side => side === view ? { hx0: G.RX, hx1: G.RE, dir: 1 } : { hx0: G.LX, hx1: G.BX, dir: -1 };
  const specDice = opening ? [Object.assign({ v: dice[0], side: 0 }, half(0)), Object.assign({ v: dice[1], side: 1 }, half(1))]
    : [Object.assign({ v: dice[0], side: s }, half(s)), Object.assign({ v: dice[1], side: s }, half(s))];
  const plan = Dice3D.plan({ dice: specDice, yMid: G.MID, yMin: G.TOP, yMax: G.BOT, band: Math.max(0.7, G.MID - G.TOP - G.PL + 0.15) });
  if (!plan) return;
  // a knock at every impact, louder for harder ones
  const hits = plan.dice.flatMap(d => d.impacts).sort((a, b) => a[0] - b[0]);
  const sfx = []; for (const [t, v] of hits) if (!sfx.length || t - sfx[sfx.length - 1][0] > 0.07) sfx.push([t, Math.min(1, v / 6)]);
  let si = 0;
  const cv = document.createElement('canvas'); cv.className = 'dice3d';
  const ctx = cv.getContext('2d');
  rollAnimating = true; rollSkip = false;
  diceLayer.replaceChildren(cv);
  const t0 = performance.now();
  const end = plan.dice.map(d => d.rest);
  try {
    for (;;) {
      const t = (performance.now() - t0) / 1000;
      if (rollSkip || t >= plan.dur) break;
      if (!diceLayer.contains(cv)) diceLayer.replaceChildren(cv);   // re-attach if something cleared the layer
      const k = uPx() * Math.min(2, window.devicePixelRatio || 1), W = Math.round(G.W * k), Hh = Math.round(G.H * k);
      if (cv.width !== W || cv.height !== Hh) { cv.width = W; cv.height = Hh; cv.style.width = U(G.W); cv.style.height = U(G.H); }
      else ctx.clearRect(0, 0, W, Hh);
      Dice3D.draw(ctx, k, plan.dice.map(d => ({ d, t })));
      while (si < sfx.length && sfx[si][0] <= t) { if (si < 6) SFX.land(sfx[si][1]); si++; }
      await new Promise(r => requestAnimationFrame(r));
    }
    // resting dice as normal dice elements, exactly where (and at the angle) the simulation left them
    diceLayer.innerHTML = plan.dice.map((d, i) => dieHTML(d.side, dice[i], end[i].x, end[i].y, false, 0, end[i].yaw)).join('');
    if (!opening && dice[0] === dice[1] && !rollSkip) {
      // doubles: the two dice slide together into the middle of the four-dice row
      const cx = s === view ? G.RX + 3 : G.LX + 3, order = end[0].x <= end[1].x ? [0, 1] : [1, 0];
      const els = [...diceLayer.querySelectorAll('.die')];
      const tgt = i => cx + (order.indexOf(i) ? 0.46 : -0.46);
      const sym = (dice[0] === 2 || dice[0] === 3 || dice[0] === 6) ? Math.PI : Math.PI / 2;
      const yawT = end.map(e => Math.round(e.yaw / sym) * sym);
      const g0 = performance.now();
      for (;;) {
        const q = Math.min(1, (performance.now() - g0) / 240), e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
        if (rollSkip) break;
        els.forEach((el, i) => {
          const yaw = end[i].yaw + (yawT[i] - end[i].yaw) * e, sc = 1 + (0.74 / 0.82 - 1) * e;
          el.style.left = U(end[i].x + (tgt(i) - end[i].x) * e); el.style.top = U(end[i].y + (G.MID - end[i].y) * e);
          el.style.transform = `rotate(${yaw.toFixed(4)}rad) scale(${sc.toFixed(4)})`;
        });
        if (q >= 1) break;
        await new Promise(r => requestAnimationFrame(r));
      }
    }
  } finally { rollAnimating = false; }
  if (!sfx.length) SFX.land();
  restPose = { s, opening, dice: dice.slice(), pos: end.map(e => ({ x: e.x, y: e.y, yaw: e.yaw })) };
  if (!opening && dice[0] === dice[1]) dblFlashUntil = performance.now() + 1100;
}

// ====================================================================== render
function lastMap(st) {
  const m = new Map();
  if (st.lastMoves && st.lastSide >= 0) for (const c of st.lastMoves) { const to = BG.mvTo(c); if (to >= 1) m.set(st.lastSide * 100 + to, 1); }
  return m;
}
let selected = null;     // {s, p}
function render() {
  document.body.classList.toggle('no-anim', !settings.anim);   // CSS effects follow the game's animation setting
  const st = shownState();
  const opts = {};
  if (turn && isLatest() && !reviewing && canInteract()) {
    const steps = legalNow();
    opts.movable = new Set(steps.map(x => turn.side * 100 + x.from));
    if (selected) opts.sel = selected;
  } else if (settings.anim !== null) opts.last = lastMap(st);
  if (!turn || !isLatest()) opts.last = lastMap(st);
  renderCheckers(st.pos, opts);
  renderCube(st);
  // dice (left alone while the roll animation owns the dice layer)
  if (rollAnimating) {}
  else if (turn && isLatest() && !reviewing) renderTurnDice();
  else if (st.dice && st.lastSide >= 0 && !st.over && !st.offered) renderDice(st.lastSide, st.dice, st.dice[0] === st.dice[1] ? 4 : [true, true]);
  else diceLayer.innerHTML = '';
  if (!rollAnimating && st.dice && !turn && diceLayer.innerHTML && !reviewing) diceLayer.querySelectorAll('.die').forEach(d => d.classList.add('used'));
  renderDests();
  drawLabels();
  renderArrows();
  renderButtons();
}
function renderTurnDice() {
  const d = turn.dice;
  if (d[0] === d[1]) renderDice(turn.side, d, 4 - turn.left.length);
  else { const left = turn.left.slice(); const used = d.map(v => { const i = left.indexOf(v); if (i >= 0) { left.splice(i, 1); return false; } return true; }); renderDice(turn.side, d, used); }
}

// ====================================================================== interactive turn
function canInteract() {
  if (!turn || reviewing || !isLatest()) return false;
  if (turn.locked) return false;
  if (lesson) return !lesson.answered;
  if (puzzle) return puzzle.state === 'play';
  return !isAI(turn.side);
}
function legalNow() { return turn ? BG.legalSteps(turn.pos, turn.side, turn.left, turn.dice, turn.steps.length) : []; }
// destinations reachable by the checker on `from` (side s point): Map dest -> path [{from,to,die}]
function destsFrom(from) {
  const res = new Map();
  const dfs = (q, left, used, pt, path) => {
    const steps = BG.legalSteps(q, turn.side, left, turn.dice, used).filter(x => x.from === pt);
    for (const x of steps) {
      const r = q.slice(); const code = BG.apply(r, turn.side, x.from, x.to);
      const np = path.concat([{ from: x.from, to: x.to, die: x.die, hit: BG.mvHit(code) }]);
      const prev = res.get(x.to);
      const hits = np.filter(y => y.hit).length;
      if (!prev || np.length < prev.length || (np.length === prev.length && hits > prev.filter(y => y.hit).length)) res.set(x.to, np);
      if (x.to !== 0) { const i = left.indexOf(x.die); dfs(r, left.slice(0, i).concat(left.slice(i + 1)), used + 1, x.to, np); }
    }
  };
  dfs(turn.pos, turn.left, turn.steps.length, from, []);
  return res;
}
function renderDests() {
  dstLayer.innerHTML = ''; glowLayer.innerHTML = '';
  // lesson / puzzle marks
  for (const mk of marks) {
    const s = mk.side, p = mk.p, pos = shownState().pos, n = p === 0 ? 0 : pos[s * 26 + p];
    if (p === 0) continue;
    const [x, y] = ckXY(s, p, Math.max(0, n - 1), Math.max(1, n));
    const d = document.createElement('div'); d.className = 'dst ' + (mk.cls || 'far'); d.style.left = U(x); d.style.top = U(y);
    if (mk.cls === 'blot') { d.style.borderColor = '#ff9b90'; d.style.boxShadow = '0 0 12px rgba(255,107,91,.6)'; d.style.animation = 'none'; }
    dstLayer.appendChild(d);
  }
  if (!selected || !canInteract()) return;
  const ds = destsFrom(selected.p);
  for (const [to, path] of ds) {
    const s = turn.side;
    if (to === 0) {
      const g = document.createElement('div'); g.className = 'trayglow';
      const top = s === view ? G.MID + 0.1 : G.TOP + 0.05, h = s === view ? G.BOT - G.MID - 0.15 : G.MID - G.TOP - 0.15;
      g.style.left = U(G.TX + 0.05); g.style.top = U(top); g.style.width = U(G.TW - 0.1); g.style.height = U(h); g.dataset.p = 0;
      dstLayer.appendChild(g); continue;
    }
    const n = turn.pos[s * 26 + to], oppHere = turn.pos[(1 - s) * 26 + 25 - to];
    const [x, y] = ckXY(s, to, n, n + 1);
    const d = document.createElement('div'); d.className = 'dst' + (path.length > 1 ? ' far' : '') + (oppHere === 1 ? ' hitd' : '');
    d.style.left = U(x); d.style.top = U(y); d.dataset.p = to; dstLayer.appendChild(d);
    const vp = toV(s, to), gl = document.createElement('div'); gl.className = 'ptglow';
    gl.style.left = U(slotX(vp) - 0.5); gl.style.top = U(vp >= 13 ? G.TOP : G.MID + 0.2); gl.style.height = U(G.MID - G.TOP - 0.2);
    gl.style.setProperty('--dir', vp >= 13 ? '0deg' : '180deg');
    glowLayer.appendChild(gl);
  }
}
// animate one checker step on the board (DOM of the position before the step is rendered)
async function animStep(p, s, from, to) {
  const el = topChecker(s, from);
  const q = p.slice(); const code = BG.apply(q, s, from, to); const hit = BG.mvHit(code);
  if (!el || !anim()) { if (hit) SFX.hit(); else if (to === 0) SFX.off(); else SFX.clack(); return q; }
  const u = uPx();
  const [x0, y0] = (() => { const n = p[s * 26 + from]; return ckXY(s, from, n - 1, n); })();
  let x1, y1;
  if (to === 0) { [x1, y1] = offXY(s, q[s * 26]); y1 += 0.125; }
  else { const n = q[s * 26 + to]; [x1, y1] = ckXY(s, to, n - 1, n); }
  el.classList.add('flying');
  const dx = (x1 - x0) * u, dy = (y1 - y0) * u, dist = Math.hypot(dx, dy);
  const dur = Math.min(420, 170 + dist * 0.55);
  const lift = Math.min(0.9 * u, dist * 0.18);
  await el.animate([
    { transform: 'translate(0,0) scale(1)' },
    { transform: `translate(${dx * 0.5}px,${dy * 0.5 - lift}px) scale(1.1)`, offset: 0.5 },
    { transform: `translate(${dx}px,${dy}px) scale(1)` }], { duration: dur, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' }).finished.catch(() => {});
  if (to === 0) SFX.off(); else SFX.clack();
  if (hit) {
    const o = 1 - s, victim = topChecker(o, 25 - to);
    if (victim) {
      const [bx, by] = barXY(o, q[o * 26 + 25] - 1, q[o * 26 + 25]);
      const [vx, vy] = ckXY(o, 25 - to, 0, 1);
      SFX.hit();
      await victim.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${(bx - vx) * u}px,${(by - vy) * u}px)` }], { duration: 300, easing: 'cubic-bezier(.3,.6,.3,1)', fill: 'forwards' }).finished.catch(() => {});
    }
  }
  return q;
}
async function startTurn(side, dice, opts) {
  opts = opts || {};
  turn = { side, dice, left: dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice.slice(), steps: [], pos: curState().pos.slice(), start: curState().pos.slice() };
  selected = null; hintData = null; previewPlay = null;
  turn.plays = BG.genPlays(turn.start, side, dice[0], dice[1]);
  render(); renderInfo();
  const tok = busyToken;
  if (lesson || puzzle) return;
  if (turn.plays.length === 1 && turn.plays[0].moves.length === 0) {
    toast(t('nomove'), 1500); turn.locked = true;
    await sleep(1500); if (tok !== busyToken || !turn) return;
    commitTurn(); return;
  }
  if (settings.forced && turn.plays.length === 1 && !isAI(side)) {
    turn.locked = true; renderButtons();
    toast(t('forced'), 900);
    await sleep(500); if (tok !== busyToken || !turn) return;
    await playMovesAnimated(turn.plays[0].moves);
    if (tok !== busyToken || !turn) return;
    turn.locked = false;
    commitTurn(); return;
  }
  maybeHint();
}
async function playMovesAnimated(moves) {
  for (const c of moves) {
    const from = BG.mvFrom(c), to = BG.mvTo(c);
    await doStep({ from, to, die: from === 25 ? 25 - to : from - to }, true);
  }
}
function dieFor(from, to) {
  // which remaining die realises this step (bear-offs may use a larger die)
  const d = from - to;
  if (turn.left.includes(d)) return d;
  const cand = turn.left.filter(v => v > d).sort((a, b) => a - b);
  return cand.length ? cand[0] : d;
}
async function doStep(st, animate) {
  const legal = legalNow().find(x => x.from === st.from && x.to === st.to);
  if (!legal) return false;
  const before = turn.pos;
  if (animate) await animStep(before, turn.side, st.from, st.to);
  else { const q = before.slice(); const c = BG.apply(q, turn.side, st.from, st.to); if (BG.mvHit(c)) SFX.hit(); else if (st.to === 0) SFX.off(); else SFX.clack(); }
  if (!turn || turn.pos !== before) return false;
  const q = before.slice(); const code = BG.apply(q, turn.side, st.from, st.to);
  turn.pos = q; turn.steps.push({ code, die: legal.die, from: st.from, to: st.to });
  const i = turn.left.indexOf(legal.die); turn.left.splice(i, 1);
  selected = null;
  render(); renderInfo();
  if (puzzle && puzzle.state === 'play') pzAfterStep();
  return true;
}
async function doPath(path, animateFirst) {
  turn.locked = true;
  for (let i = 0; i < path.length; i++) { if (!turn) return; await doStep(path[i], i > 0 || animateFirst); }
  if (turn) turn.locked = false;
  render();
  if (turn && legalNow().length === 0 && (lesson || puzzle) && (settings.autoConfirmSpecial)) commitTurn();
}
function undoStep() {
  if (!turn || !turn.steps.length || turn.locked) return false;
  turn.steps.pop();
  const q = turn.start.slice(); turn.left = turn.dice[0] === turn.dice[1] ? [turn.dice[0], turn.dice[0], turn.dice[0], turn.dice[0]] : turn.dice.slice();
  for (const s of turn.steps) { BG.apply(q, turn.side, s.from, s.to); turn.left.splice(turn.left.indexOf(s.die), 1); }
  turn.pos = q; selected = null; SFX.tick();
  render(); renderInfo();
  if (puzzle && puzzle.state === 'play') pzAfterStep();
  return true;
}
function commitTurn() {
  if (!turn) return;
  if (legalNow().length) return;
  const moves = turn.steps.map(s => s.code);
  // safety: the result must be one of the legal plays
  const k = BG.key(turn.pos);
  if (!turn.plays.some(x => BG.key(x.pos) === k)) { console.warn('illegal play rejected'); return; }
  if (lesson && lesson.op) { if (window.OPH) OPH.submit(turn); return; }
  if (lesson) { lessonSubmit(turn); return; }
  if (puzzle) { puzzleSubmit(turn); return; }
  const tt = turn; turn = null; selected = null;
  pushAction({ t: 'r', d: tt.dice, m: moves });
  if (settings.coach && !isAI(tt.side) && settings.mode !== 'watch' && tt.plays.length > 1) coachRate(tt, moves);
}
// ---- pointer interaction
// ---- forced landscape: when the page is CSS-rotated 90deg, map screen coordinates into the page's own frame
let ROT = false;
function lp(e) { return ROT ? [e.clientY, innerWidth - e.clientX] : [e.clientX, e.clientY]; }
function lrect(el) { const r = el.getBoundingClientRect(); return ROT ? { left: r.top, top: innerWidth - r.right, width: r.height, height: r.width } : r; }
function unitXY(e) { const r = lrect(frameEl), [x, y] = lp(e); return [(x - r.left) / r.width * G.W, (y - r.top) / r.height * G.H]; }
function hitPoint(ux, uy) {
  // returns view point (1..24), 25 bar, 0 tray, or -1
  if (ux >= G.TX - 0.15 && ux <= G.TX + G.TW + 0.3) return 0;
  if (ux >= G.BX && ux < G.RX) return 25;
  if (uy < G.TOP - 0.3 || uy > G.BOT + 0.3) return -1;
  const top = uy < G.MID;
  if (ux >= G.LX && ux < G.BX) { const col = Math.floor(ux - G.LX); return top ? 13 + col : 12 - col; }
  if (ux >= G.RX && ux < G.RE) { const col = Math.floor(ux - G.RX); return top ? 19 + col : 6 - col; }
  return -1;
}
let drag = null;
frameEl.addEventListener('pointerdown', e => {
  ctx();
  if (e.button !== undefined && e.button !== 0) return;
  if (!canInteract()) { if (reviewing && !lesson && !puzzle && isPlayingMatch()) rsOpen(); return; }
  const [ux, uy] = unitXY(e), vp = hitPoint(ux, uy);
  if (vp < 0) { selected = null; render(); return; }
  const s = turn.side, p = vp === 0 ? 0 : fromV(s, vp);
  const steps = legalNow();
  // clicking a destination of the current selection
  if (selected) {
    const ds = destsFrom(selected.p);
    if (ds.has(p) && p !== selected.p) { const path = ds.get(p); selected = null; doPath(path, true); e.preventDefault(); return; }
  }
  if (p !== 0 && steps.some(x => x.from === p)) {
    const el = topChecker(s, p);
    drag = { s, p, el, x: lp(e)[0], y: lp(e)[1], moved: false, pid: e.pointerId, wasSel: selected && selected.p === p };
    selected = { s, p }; render();
    drag.el = topChecker(s, p);
    try { frameEl.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
    return;
  }
  selected = null; render();
});
frameEl.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.pid) return;
  const [ex, ey] = lp(e), dx = ex - drag.x, dy = ey - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) > 6) { drag.moved = true; if (drag.el) drag.el.classList.add('drag'); }
  if (drag.moved && drag.el) drag.el.style.transform = `translate(${dx}px,${dy}px) scale(1.08)`;
});
const endDrag = e => {
  if (!drag || (e && e.pointerId !== drag.pid)) return;
  const d = drag; drag = null;
  try { frameEl.releasePointerCapture(d.pid); } catch (_) {}
  if (!turn) return;
  if (d.moved) {
    const [ux, uy] = unitXY(e), vp = hitPoint(ux, uy), p = vp < 0 ? -1 : vp === 0 ? 0 : fromV(d.s, vp);
    const ds = destsFrom(d.p);
    if (p >= 0 && ds.has(p) && p !== d.p) { selected = null; render(); doPath(ds.get(p), false).then(() => {}); const path = ds.get(p); if (path.length === 1) {} return; }
    selected = { s: d.s, p: d.p }; render(); return;
  }
  // click on a source: single destination -> move at once
  const ds = destsFrom(d.p);
  if (ds.size === 1) { const path = [...ds.values()][0]; selected = null; doPath(path, true); return; }
  if (d.wasSel) { selected = null; render(); }
};
frameEl.addEventListener('pointerup', endDrag);
frameEl.addEventListener('pointercancel', e => { if (drag) { drag = null; render(); } });
// Phone landscape: the board lets vertical swipes scroll the page (touch-action: pan-y), except while a checker is
// being dragged — then the first touchmove is cancelled so the drag keeps the gesture.
frameEl.addEventListener('touchmove', e => { if (drag && e.cancelable) e.preventDefault(); }, { passive: false });
// Rotated page (CSS-rotated body): native scrolling cannot follow the rotated axis, so swipes are turned into
// scrolling of the nearest scrollable element (or the page) in the page's own frame, with a little momentum.
(() => {
  let sc = null, last = null, vy = 0, moved = false, raf = 0, start = null;
  const scroller = el => {
    for (; el && el !== document.body; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) return el;
    }
    return document.body;
  };
  addEventListener('touchstart', e => {
    cancelAnimationFrame(raf);
    if (!ROT || e.touches.length !== 1) { sc = null; return; }
    const t = e.touches[0]; sc = scroller(e.target); last = lp(t); start = last; vy = 0; moved = false;
  }, { passive: true, capture: true });
  addEventListener('touchmove', e => {
    if (!ROT || !sc || e.touches.length !== 1) return;
    if (drag) { sc = null; return; }                       // a checker drag owns this gesture
    const p = lp(e.touches[0]), dy = p[1] - last[1];
    if (!moved) { const tx = Math.abs(p[0] - start[0]), ty = Math.abs(p[1] - start[1]); if (ty < 6 || ty < tx) return; moved = true; }
    if (e.cancelable) e.preventDefault();
    sc.scrollTop -= dy; vy = 0.8 * vy + 0.2 * dy; last = p;
  }, { passive: false, capture: true });
  addEventListener('touchend', () => {
    if (!ROT || !sc || !moved) { sc = null; return; }
    const el = sc; sc = null;
    const step = () => { if (Math.abs(vy) < 0.4) return; el.scrollTop -= vy; vy *= 0.94; raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }, { capture: true });
})();

// ====================================================================== on-board buttons
function setButtons(list, side, own) {
  // list: [{id, label, cls, fn}]; own: place them in the half where this side's dice appear
  bbtns.innerHTML = '';
  if (!list.length) { bbtns.style.display = 'none'; return; }
  bbtns.style.display = '';
  const right = own ? side === view : side !== view;
  const x = right ? G.RX + 3 : G.LX + 3;
  bbtns.style.left = U(x); bbtns.style.top = U(G.MID);
  for (const b of list) {
    const el = document.createElement('button'); el.className = 'bbtn ' + (b.cls || ''); el.textContent = b.label; el.id = 'bb-' + b.id;
    el.addEventListener('pointerdown', ev => ev.stopPropagation());
    el.addEventListener('click', ev => { ev.stopPropagation(); ctx(); b.fn(); });
    bbtns.appendChild(el);
  }
}
function renderButtons() {
  renderStatusBox();
  if (!match) { setButtons([]); return; }
  if (lesson || puzzle) {
    if (turn && canInteract()) {
      const b = [];
      if (turn.steps.length) b.push({ id: 'undo', label: t('bb.undo'), fn: undoStep });
      if (!legalNow().length) b.push({ id: 'confirm', label: t('bb.confirm'), cls: 'go', fn: commitTurn });
      setButtons(b, turn.side);
    } else setButtons([]);
    return;
  }
  if (reviewing || !isLatest()) { setButtons([]); return; }
  const [g] = curGA(); const st = stateAt(g, match.games[g].actions.length);
  if (st.over) {
    if (settings.mode === 'watch' || matchOver()) { setButtons([]); return; }
    setButtons([{ id: 'next', label: match.len ? t('bb.nextGame') : t('bb.again'), cls: 'go', fn: nextGame }], view);
    return;
  }
  if (turn) {
    if (!canInteract()) { setButtons([]); return; }
    const b = [];
    if (turn.steps.length) b.push({ id: 'undo', label: t('bb.undo'), fn: undoStep });
    if (!legalNow().length) b.push({ id: 'confirm', label: t('bb.confirm'), cls: 'go', fn: commitTurn });
    setButtons(b, turn.side); return;
  }
  if (thinking >= 0 || busyRolling) { setButtons([]); return; }
  if (st.offered) {
    if (isAI(st.turn)) { setButtons([]); return; }
    setButtons([{ id: 'take', label: t('bb.take'), cls: 'go', fn: () => cubeAnswer(true) }, { id: 'pass', label: t('bb.pass'), cls: 'red', fn: () => cubeAnswer(false) }], st.turn, true);
    return;
  }
  if (st.nRolls === 0) { setButtons([]); return; }
  const s = st.turn;
  if (isAI(s)) { setButtons([]); return; }
  const b = [];
  if (BG.cubeAvailable(st, ctxFor(g, s), s)) b.push({ id: 'double', label: t('bb.double'), fn: humanDouble });
  b.push({ id: 'roll', label: t('bb.roll'), cls: 'go', fn: humanRoll });
  setButtons(b, s, true);
}

// ====================================================================== game flow
let busyRolling = false;
function pushAction(a) {
  const [g] = curGA();
  match.games[g].actions.push(a);
  cur = latestIdx(); reviewing = false;
  save();
  afterAction();
}
function afterAction() {
  hintData = null; previewPlay = null; extraArrows = [];
  render(); renderInfo();
  analyzeCurrent();
  drive();
}
async function drive() {
  const tok = ++busyToken;
  if (!match || lesson || puzzle || reviewing || !isLatest()) { renderButtons(); return; }
  const [g] = curGA(); const gm = match.games[g];
  const st = stateAt(g, gm.actions.length);
  if (st.over) { onGameOver(g); return; }
  if (turn) { renderButtons(); return; }
  if (st.offered) {
    const taker = st.turn;
    if (isAI(taker)) {
      thinking = taker; renderInfo(); renderButtons();
      const r = await request('ai', { type: 'take', pos: st.pos, side: st.doubler, level: levelFor(taker), ctx: ctxFor(g, st.doubler) });
      await sleep(settings.mode === 'watch' ? 700 : 500);
      if (tok !== busyToken || !r) { if (tok === busyToken) { thinking = -1; renderInfo(); } return; }
      thinking = -1;
      toast(r.take ? t('toast.takes', { c: pname(taker) }) : t('toast.passes', { c: pname(taker) }), 1300);
      SFX.cube();
      pushAction({ t: r.take ? 'k' : 'p' });
    } else { renderButtons(); maybeHint(); }
    return;
  }
  if (st.nRolls === 0) {
    await sleep(anim() ? 350 : 50); if (tok !== busyToken) return;
    await doRoll(g, true); return;
  }
  const s = st.turn;
  if (isAI(s)) {
    thinking = s; renderInfo(); renderButtons();
    if (BG.cubeAvailable(st, ctxFor(g, s), s)) {
      const r = await request('ai', { type: 'cube', pos: st.pos, side: s, level: levelFor(s), ctx: ctxFor(g, s) });
      if (tok !== busyToken || !r) return;
      if (r.double) {
        await sleep(350); if (tok !== busyToken) return;
        thinking = -1; SFX.cube(); toast(t('toast.doubles', { c: pname(s), n: st.cube * 2 }), 1400);
        pushAction({ t: 'd' }); return;
      }
    }
    thinking = -1;
    await sleep(settings.mode === 'watch' ? 250 : 120); if (tok !== busyToken) return;
    await doRoll(g, false); return;
  }
  // human
  renderButtons(); maybeHint();
  if (settings.autoRoll && !BG.cubeAvailable(st, ctxFor(g, s), s)) { await sleep(anim() ? 380 : 60); if (tok !== busyToken) return; humanRoll(); }
}
async function doRoll(g, opening) {
  const tok = busyToken;
  const gm = match.games[g];
  const k = gm.actions.filter(a => a.t === 'r').length;
  const dice = stream(g).get(k);
  const st = stateAt(g, gm.actions.length);
  const s = opening ? (dice[0] > dice[1] ? 0 : 1) : st.turn;
  busyRolling = true; renderButtons();
  await rollAnim(s, dice, opening);
  if (tok !== busyToken) { busyRolling = false; return; }
  if (opening) {
    const rp = restPose && restPose.opening ? restPose.pos : null;
    diceLayer.innerHTML = rp ? rp.map((r, i) => dieHTML(i, dice[i], r.x, r.y, false, 0, r.yaw)).join('')
      : dieHTML(0, dice[0], 0 === view ? G.RX + 3 : G.LX + 3, G.MID) + dieHTML(1, dice[1], 1 === view ? G.RX + 3 : G.LX + 3, G.MID);
    toast(t('toast.opening', { c: pname(s), a: dice[0], b: dice[1] }), 1300);
    await sleep(anim() ? 1100 : 400);
    if (tok !== busyToken) { busyRolling = false; return; }
  }
  busyRolling = false;
  if (isAI(s)) {
    renderDice(s, dice, dice[0] === dice[1] ? 0 : [false, false]);
    thinking = s; renderInfo();
    const t0 = Date.now();
    const r = await request('ai', { type: 'move', pos: st.pos, side: s, dice, level: levelFor(s), tag: match.seed + g + ':' + k });
    if (tok !== busyToken || !r) { if (tok === busyToken) { thinking = -1; renderInfo(); } return; }
    const wait = (settings.mode === 'watch' ? 500 : 300) - (Date.now() - t0);
    if (wait > 0) await sleep(wait);
    if (tok !== busyToken) return;
    thinking = -1;
    // animate the AI's moves
    turn = { side: s, dice, left: dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice.slice(), steps: [], pos: st.pos.slice(), start: st.pos.slice(), locked: true, ai: true };
    turn.plays = BG.genPlays(st.pos, s, dice[0], dice[1]);
    render(); renderInfo();
    if (!r.moves.length) { toast(t('toast.dance', { c: pname(s) }), 1100); await sleep(1100); }
    for (const c of r.moves) {
      if (tok !== busyToken || !turn) return;
      const from = BG.mvFrom(c), to = BG.mvTo(c);
      const q = await animStep(turn.pos, s, from, to);
      if (tok !== busyToken || !turn) return;
      turn.pos = q; turn.steps.push({ code: c, from, to, die: dieFor(from, to) });
      const i = turn.left.indexOf(turn.steps[turn.steps.length - 1].die); if (i >= 0) turn.left.splice(i, 1); else turn.left.pop();
      render();
      await sleep(anim() ? 120 : 10);
    }
    await sleep(settings.mode === 'watch' ? 350 : 200);
    if (tok !== busyToken) return;
    turn = null;
    pushAction({ t: 'r', d: dice, m: r.moves });
    return;
  }
  startTurn(s, dice);
}
function humanRoll() {
  if (!match || turn || busyRolling) return;
  const [g] = curGA(); const st = stateAt(g, match.games[g].actions.length);
  if (st.over || st.offered || isAI(st.turn) || st.nRolls === 0) return;
  hintData = null;
  busyToken++;
  doRoll(g, false);
}
function humanDouble() {
  const [g] = curGA(); const st = stateAt(g, match.games[g].actions.length);
  if (turn || !BG.cubeAvailable(st, ctxFor(g, st.turn), st.turn)) return;
  SFX.cube();
  pushAction({ t: 'd' });
}
function cubeAnswer(take) {
  const [g] = curGA(); const st = stateAt(g, match.games[g].actions.length);
  if (!st.offered || isAI(st.turn)) return;
  SFX.cube();
  if (settings.coach && settings.mode !== 'watch') coachCube(g, st, take);
  pushAction({ t: take ? 'k' : 'p' });
}
function onGameOver(g) {
  const key = g + ':' + match.games[g].actions.length;
  renderButtons(); renderInfo();
  if (gameOverShown.has(key)) return;
  gameOverShown.add(key);
  const st = stateAt(g, match.games[g].actions.length), sc = scoreAfter(g);
  const mOver = matchOver();
  const youWin = settings.mode === 'ai' && st.winner === humanSide;
  const aiWin = settings.mode === 'ai' && st.winner !== humanSide;
  SFX.chime(!aiWin);
  const kindTxt = st.dropped ? t('res.drop') : st.kind >= 3 ? t('res.bg') : st.kind === 2 ? t('res.gammon') : st.resigned ? t('res.resign') : t('res.single');
  if (settings.mode === 'watch' && !mOver && match.len) {
    toast(t('res.pWinPts', { c: pname(st.winner), n: st.points }) + ' · ' + kindTxt, 2200);
    setTimeout(() => { if (match && isLatest() && !lesson && !puzzle && stateAt(match.games.length - 1, match.games[match.games.length - 1].actions.length).over && !matchOver()) nextGame(); }, 2600);
    return;
  }
  if (youWin || settings.mode === 'pvp') confetti();
  $('#resultDisc').innerHTML = `<span class="pdisc p${st.winner}"></span>`;
  let title;
  if (mOver) title = youWin ? t('res.youMatch') : aiWin ? t('res.aiMatch') : t('res.pMatch', { c: pname(st.winner) });
  else title = youWin ? t('res.youWin') : aiWin ? t('res.aiWin') : t('res.pWin', { c: pname(st.winner) });
  $('#resultTitle').textContent = title;
  let sub = t('res.points', { n: st.points, k: kindTxt });
  if (match.len) sub += '<br>' + t('res.score', { a: sc[0], b: sc[1], n: match.len, c0: pname(0), c1: pname(1) });
  else if (match.games.length > 1) sub += '<br>' + t('res.total', { a: sc[0], b: sc[1], c0: pname(0), c1: pname(1) });
  if (settings.mode === 'ai') sub += '<br>' + t('res.vs', { name: LV(settings.level), lv: settings.level });
  sub += `<br><span style="font-size:12px;color:var(--dim)">${t('res.seed')}</span> <code>${match.seed}</code>`;
  $('#resultSub').innerHTML = sub;
  $('#btnAgain').textContent = mOver || !match.len ? (match.len ? t('res.again') : t('bb.again')) : t('bb.nextGame');
  setTimeout(() => { if (isLatest()) showOverlay('#resultOverlay'); }, 900);
}
function nextGame() {
  hideOverlay('#resultOverlay');
  if (!match) return;
  const g = match.games.length - 1, st = stateAt(g, match.games[g].actions.length);
  if (!st.over) return;
  if (matchOver()) { startNewMatch(); return; }
  const sc = scoreAfter(g), len = match.len;
  const crawUsed = match.games.some(x => x.crawford);
  const craw = len > 0 && !crawUsed && (sc[0] === len - 1 || sc[1] === len - 1);
  match.games.push({ actions: [], start: sc, crawford: craw });
  cur = latestIdx(); reviewing = false; turn = null;
  if (craw) setTimeout(() => toast(t('toast.crawford'), 1800), 300);
  save(); updateCommit(); afterAction();
}
function startNewMatch() {
  restPose = null;
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = -1;
  if (settings.mode === 'ai') humanSide = settings.color === 2 ? (Math.random() < 0.5 ? 0 : 1) : settings.color;
  view = settings.mode === 'ai' ? humanSide : 0;
  const seed = (pendingSeed || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
  pendingSeed = '';
  match = newMatch(seed || null, settings.matchLen, settings.cube);
  cur = 0; reviewing = false; turn = null; evals = new Map(); gameOverShown = new Set(); rv = null; rvOpen = false;
  hideOverlay('#resultOverlay');
  save(); updateCommit(); afterAction();
}
let pendingSeed = '';
function updateCommit() { commitHash = match ? BG.sha256('bg2|' + match.seed).slice(0, 16) : ''; }

// ====================================================================== undo / navigation
function canUndo() {
  if (!match || settings.mode === 'watch') return false;
  if (lesson || puzzle) return !!(turn && turn.steps.length);
  if (turn && turn.steps.length && canInteract()) return true;
  if (reviewing) return false;
  const [g] = curGA(); const acts = match.games[g].actions;
  if (settings.mode === 'pvp') return acts.length > 0;
  // vs AI: some action by the human in this game
  return lastHumanAction(g) >= 0;
}
function actorOf(g, i) {
  const st = stateAt(g, i), a = match.games[g].actions[i];
  if (a.t === 'r') return st.nRolls === 0 ? (a.d[0] > a.d[1] ? 0 : 1) : st.turn;
  return st.turn;
}
function lastHumanAction(g) {
  const acts = match.games[g].actions;
  for (let i = acts.length - 1; i >= 0; i--) if (actorOf(g, i) === humanSide && !(acts[i].t === 'r' && stateAt(g, i).nRolls === 0 && false)) return i;
  return -1;
}
function undo() {
  if (!canUndo()) return;
  if (turn && turn.steps.length && canInteract()) { undoStep(); return; }
  if (lesson || puzzle) return;
  busyToken++; cancelWorker('ai'); thinking = -1;
  const [g] = curGA(); const acts = match.games[g].actions;
  let i = settings.mode === 'pvp' ? acts.length - 1 : lastHumanAction(g);
  if (i < 0) return;
  const removed = acts[i];
  const side = actorOf(g, i);
  match.games[g].actions = acts.slice(0, i);
  gameOverShown.forEach(k => { if (k.startsWith(g + ':')) gameOverShown.delete(k); });
  cur = latestIdx(); reviewing = false; turn = null; hintData = null;
  hideOverlay('#resultOverlay');
  save();
  // undoing a roll gives the same dice back (they come from the seed), so resume that turn at once
  if (removed.t === 'r' && i > 0) { render(); renderInfo(); analyzeCurrent(); busyToken++; startTurn(side, removed.d); renderButtons(); return; }
  afterAction();
}
function viewAt(i) {
  if (lesson || puzzle || !match) return;
  i = Math.max(0, Math.min(latestIdx(), i));
  if (i === cur && !(turn && i === latestIdx() && reviewing)) return;
  busyToken++; cancelWorker('ai'); thinking = -1;
  if (turn && !turn.ai) { turn.steps = []; turn.pos = turn.start.slice(); turn.left = turn.dice[0] === turn.dice[1] ? [turn.dice[0], turn.dice[0], turn.dice[0], turn.dice[0]] : turn.dice.slice(); }
  if (turn && turn.ai) turn = null;
  cur = i; reviewing = i !== latestIdx(); selected = null; hintData = null; previewPlay = null; extraArrows = [];
  render(); renderInfo(); analyzeCurrent();
  if (!reviewing) { if (turn) { renderButtons(); maybeHint(); } else drive(); }
}
function resumeHere() {
  if (!reviewing) return;
  const [g, a] = curGA();
  match.games = match.games.slice(0, g + 1);
  match.games[g].actions = match.games[g].actions.slice(0, a);
  gameOverShown = new Set([...gameOverShown].filter(k => +k.split(':')[0] < g));
  turn = null; reviewing = false; cur = latestIdx();
  if (settings.mode === 'watch') settings.mode = 'pvp';
  save(); afterAction();
}
function isPlayingMatch() { return !!match; }


// one-line status box (phone landscape header): whose turn / what to do, the last move, the game result
function statusText(st) {
  if (lesson) return `${$('#lsStep').textContent} · ${$('#lsTitle').textContent}`;
  if (puzzle) return $('#pzStep').textContent;
  if (!match) return '';
  const name = s => isAI(s) ? `AI Lv${levelFor(s)}` : settings.mode === 'pvp' ? pname(s) : t('you');
  if (st.over) return `${name(st.winner)} ${t('st.win', { n: st.points })}`;
  let last = '';
  if (st.lastMoves && st.lastSide >= 0) last = `${name(st.lastSide)}: ${st.lastMoves.length ? BG.notation(st.lastMoves) : t('nomove')}`;
  let now = '';
  if (!isLatest()) now = '';
  else if (thinking >= 0) now = isAI(thinking) ? t('sb.aiThinking') : t('thinking');
  else if (st.offered) now = isAI(st.doubler) ? t('sb.offered') : t('st.offer');
  else if (turn && !isAI(turn.side)) now = !legalNow().length && !turn.steps.length ? t('nomove') : settings.mode === 'pvp' ? `${pname(turn.side)}: ${t('sb.yourTurn')}` : t('sb.yourTurn');
  else if (!turn && !busyRolling && !isAI(st.turn)) now = settings.mode === 'pvp' ? `${pname(st.turn)}: ${t('sb.roll')}` : t('sb.roll');
  else if (!turn && isAI(st.turn)) now = t('sb.aiThinking');
  return [last, now].filter(Boolean).join(' · ');
}
function renderStatusBox(st) { const el = $('#statusBox'); if (!el || (!match && !lesson && !puzzle)) return; const txt = statusText(st || shownState()); if (el.textContent !== txt) { el.textContent = txt; el.title = txt; } }
$('#statusBox').addEventListener('click', () => { const txt = $('#statusBox').textContent; if (txt) toast(txt, 2600); });
// ====================================================================== info panel
function renderInfo() {
  if (!match) return;
  const st = shownState(), [g, a] = curGA(), gm = match.games[g];
  const sc = gm.start;
  for (const s of [0, 1]) {
    const nm = playerName(s);
    const full = nm ? nm + ' · ' + pname(s) : pname(s);
    const short = (lesson || puzzle) ? (nm || pname(s)) : settings.mode === 'pvp' ? pname(s) : isAI(s) ? `AI Lv${levelFor(s)}` : t('you');
    $('#name' + s).innerHTML = `<span class="nl">${esc(full)}</span><span class="ns">${esc(short)}</span>`;
    $('#pl' + s).title = full;
    $('#pip' + s).textContent = BG.pips(st.pos, s);
    $('#score' + s).innerHTML = match.len ? `${sc[s]}<small>/${match.len}</small>` : (match.games.length > 1 || st.over ? `${scoreAfterShown(g, a)[s]}<small> ${t('pt')}</small>` : '');
    const el = $('#pl' + s);
    const toMove = turn && isLatest() ? turn.side : st.over ? -1 : st.turn;
    el.classList.toggle('active', !st.over && toMove === s);
    el.classList.toggle('won', st.over && st.winner === s);
    el.classList.toggle('thinking', thinking === s);
    let status = '';
    if (st.over && st.winner === s) status = t('st.win', { n: st.points });
    else if (thinking === s) status = t('thinking');
    else if (!st.over && toMove === s) status = st.offered ? t('st.offer') : turn && isLatest() ? t('st.moving', { d: '\u2066' + turn.dice.join('-') + '\u2069' }) : t('st.turn');
    $('#status' + s).textContent = status;
  }
  renderStatusBox(st);
  // eval
  $('#evalCard').classList.toggle('hidden', !settings.eval);
  const ev = evalOf(g, a);
  $('#evalText').textContent = evalText(ev, st);
  $('#evalFill').style.width = (ev ? ev.p * 100 : 50) + '%';
  renderGraph(); renderKifu();
  $('#btnUndo').disabled = !canUndo();
  $('#btnHint').classList.toggle('on', settings.hint);
  $('#btnSound').classList.toggle('on', settings.sound);
  renderReview(); renderHintCard();
  const mode = settings.mode === 'ai' ? `AI Lv.${settings.level}` : settings.mode === 'watch' ? `Lv.${settings.level} vs Lv.${settings.level2}` : t('ng.pvp');
  const mt = match.len ? t('info.match', { n: match.len }) + (gm.crawford ? ' · ' + t('info.crawford') : '') : t('info.single');
  const over = matchOver() || settings.mode !== 'ai' || (stateAt(match.games.length - 1, match.games[match.games.length - 1].actions.length).over && !match.len);
  const fair = over ? `seed ${match.seed}` : `SHA-256 ${commitHash}…`;
  $('#infoLine').textContent = `${mt} · ${mode} · ${match.cube ? t('info.cube') : t('info.nocube')} · ${fair}`;
  $('#infoLine').title = over ? t('fair.seed') : t('fair.commit');
  $('#plInfo').textContent = $('#infoLine').textContent; $('#plInfo').title = $('#infoLine').title;
  $('#plMeta').textContent = match.len ? `${t('info.match', { n: match.len })} ${gm.start[0]}–${gm.start[1]}` : '';
  hbInfo(st, g, ev);
}
// PC header bar: whose turn + dice, pip counts, win chance (only when the evaluation display is on), match score
var HB = null;
function hbInfo(st, g, ev) {
  if (!HB || !HB.on) return;
  const toMove = turn && isLatest() ? turn.side : st.over ? -1 : st.turn;
  let h = st.over ? `<span class="hb-chip"><i class="hb-disc p${st.winner}"></i><b>${esc(pname(st.winner))} ${esc(t('st.win', { n: st.points }))}</b></span>`
    : toMove >= 0 ? `<span class="hb-chip"><i class="hb-disc p${toMove}"></i><b>${esc(t('hb.turn', { c: pname(toMove) }))}</b>${turn && isLatest() ? ' ' + turn.dice.map(d => `<i class="hb-die p${turn.side}">${d}</i>`).join('') : ''}</span>` : '';
  h += `<span class="hb-chip"><i class="hb-disc p0"></i><b>${BG.pips(st.pos, 0)}</b> – <b>${BG.pips(st.pos, 1)}</b><i class="hb-disc p1"></i> ${esc(t('pips'))}</span>`;
  if (settings.eval && !lesson && !puzzle && ev) h += `<span class="hb-chip">${esc(evalText(ev, st))}</span>`;
  if (match.len && !lesson && !puzzle) h += `<span class="hb-chip">${esc(t('info.match', { n: match.len }))} <b>${match.games[g].start[0]}–${match.games[g].start[1]}</b></span>`;
  HB.setInfo(h);
}
function scoreAfterShown(g, a) {
  const st = stateAt(g, a), s = match.games[g].start.slice();
  if (st.over) s[st.winner] += st.points;
  return s;
}
function evalOf(g, a) {
  const st = stateAt(g, a);
  if (st.over) return { p: st.winner === 0 ? 1 : 0, final: true };
  const e = evals.get(g + ':' + a);
  if (e) return e;
  for (let k = a - 1; k >= 0; k--) { const x = evals.get(g + ':' + k); if (x) return x; }
  return null;
}
function evalText(ev, st) {
  if (!ev) return '—';
  if (ev.final) return t('ev.won', { c: pname(st.winner), n: st.points });
  const p = ev.p, lead = p >= 0.5 ? 0 : 1, pct = (Math.max(p, 1 - p) * 100).toFixed(1);
  const gm = ev.v ? ` · G ${(ev.g0 * 100).toFixed(0)}/${(ev.g1 * 100).toFixed(0)}%` : '';
  return Math.abs(p - 0.5) < 0.02 ? t('ev.even') + gm : t('ev.win', { c: pname(lead), p: pct }) + gm;
}
function renderGraph() {
  const svg = $('#graph'), W = 300, H = 74;
  const tl = timeline(), n = Math.max(tl.length, 30);
  const pts = []; let last = 0.5;
  const seps = [];
  tl.forEach(([g, a], i) => {
    if (a === 0 && g > 0) seps.push(i);
    const e = evalOf(g, a); let v = e ? e.p : last; last = v;
    pts.push([i / (n - 1) * W, H - v * H]);
  });
  let path = '', area = '';
  if (pts.length) { path = 'M' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L'); area = path + `L${pts[pts.length - 1][0].toFixed(1)},${H / 2}L0,${H / 2}Z`; }
  const cx = cur / (n - 1) * W;
  svg.innerHTML = `<defs><clipPath id="ctop"><rect x="0" y="0" width="${W}" height="${H / 2}"/></clipPath><clipPath id="cbot"><rect x="0" y="${H / 2}" width="${W}" height="${H / 2}"/></clipPath></defs>
    <path d="${area}" fill="${ckFlat(0)}" fill-opacity=".5" clip-path="url(#ctop)"/>
    <path d="${area}" fill="${ckFlat(1) === '#202328' ? '#787e8a' : ckFlat(1)}" fill-opacity=".5" clip-path="url(#cbot)"/>
    <line class="zero" vector-effect="non-scaling-stroke" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/>
    ${seps.map(i => `<line class="sep" vector-effect="non-scaling-stroke" x1="${i / (n - 1) * W}" x2="${i / (n - 1) * W}" y1="0" y2="${H}"/>`).join('')}
    <path d="${path}" fill="none" stroke="rgba(240,230,200,.85)" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
    <line class="cur" x1="${cx}" x2="${cx}" y1="0" y2="${H}" vector-effect="non-scaling-stroke"/>`;
}
(() => {
  const g = $('#graph'); let dragging = false;
  const idxAt = x => { const r = lrect(g), n = Math.max(timeline().length, 30); return Math.max(0, Math.min(latestIdx(), Math.round((x - r.left) / r.width * (n - 1)))); };
  const go = x => { const i = idxAt(x); if (i !== cur) viewAt(i); };
  g.addEventListener('pointerdown', e => { if (lesson || puzzle || !match) return; dragging = true; try { g.setPointerCapture(e.pointerId); } catch (_) {} go(lp(e)[0]); e.preventDefault(); });
  g.addEventListener('pointermove', e => { if (dragging) go(lp(e)[0]); });
  const end = e => { dragging = false; try { g.releasePointerCapture(e.pointerId); } catch (_) {} };
  g.addEventListener('pointerup', end); g.addEventListener('pointercancel', end);
})();
function actionLabel(g, i) {
  const a = match.games[g].actions[i];
  if (a.t === 'r') return `<em>${a.d[0]}${a.d[1]}</em>${a.m.length ? BG.notation(a.m) : t('k.dance')}`;
  if (a.t === 'd') return `<em>⧉</em>${t('k.double', { n: stateAt(g, i).cube * 2 })}`;
  if (a.t === 'k') return `<em>✓</em>${t('k.take')}`;
  if (a.t === 'p') return `<em>✕</em>${t('k.pass')}`;
  if (a.t === 'x') return t('k.resign');
  return '?';
}
function renderKifu() {
  const k = $('#kifu');
  if (!match) return;
  const total = match.games.reduce((s, gm) => s + gm.actions.length, 0);
  if (!total) { k.innerHTML = `<div class="empty">${t('kifu.empty')}</div>`; return; }
  let html = '';
  match.games.forEach((gm, g) => {
    if (match.games.length > 1 || match.len) html += `<div class="gh">${t('k.game', { n: g + 1 })} · ${gm.start[0]}–${gm.start[1]}${gm.crawford ? ' · ' + t('info.crawford') : ''}</div>`;
    let col = 0;
    gm.actions.forEach((a, i) => {
      const side = actorOf(g, i);
      if (side !== col) { html += `<span class="ph"></span>`; col = 1 - col; }
      const idx = tlIndex(g, i + 1);
      const j = rvJudgeAt(g, i), qc = j && j.q ? ' q-' + j.q : '';
      html += `<button data-i="${idx}" class="${idx === cur ? 'cur' : ''}${qc}" title="${j && j.q ? t('q.' + j.q) + ' −' + j.loss.toFixed(3) : ''}"><i class="p${side}"></i>${actionLabel(g, i)}</button>`;
      col = 1 - col;
    });
    const st = stateAt(g, gm.actions.length);
    if (st.over) { if (col === 1) html += `<span class="ph"></span>`; html += `<div class="gh" style="border:none;color:var(--accent)">${t('k.result', { c: pname(st.winner), n: st.points })}</div>`; }
  });
  k.innerHTML = html;
  const c = k.querySelector('.cur'); if (c) { const top = c.offsetTop - k.offsetTop; if (top < k.scrollTop || top > k.scrollTop + k.clientHeight - 24) k.scrollTop = top - k.clientHeight / 2; }
  else if (isLatest()) k.scrollTop = k.scrollHeight;
}
$('#kifu').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
let toastTimer = 0;
function toast(msg, ms = 1500) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms); }

// ====================================================================== analysis: eval bar, hints, coach
let evalQueueBusy = false;
async function analyzeCurrent() {
  if (!match || lesson || puzzle || !settings.eval) return;
  // evaluate every state of the match that is missing (cheap static net evaluations), current first
  if (evalQueueBusy) { evalQueueBusy = 'again'; return; }
  evalQueueBusy = true;
  try {
    for (let pass = 0; pass < 3; pass++) {
      const tl = timeline(), [cg, ca] = curGA();
      const todo = [[cg, ca], ...tl.filter(([g, a]) => !(g === cg && a === ca))].filter(([g, a]) => !evals.has(g + ':' + a));
      const items = [];
      for (const [g, a] of todo) {
        const st = stateAt(g, a);
        if (st.over) continue;
        if (st.offered) { items.push({ g, a, side: st.doubler, pos: st.pos }); continue; }
        if (st.nRolls === 0) { evals.set(g + ':' + a, { p: 0.5, v: null }); continue; }
        items.push({ g, a, side: st.turn, pos: st.pos });
        if (items.length >= 400) break;
      }
      if (!items.length) break;
      const res = await request('ana', { type: 'evalMany', items: items.map(x => ({ pos: Array.from(x.pos), side: x.side })) });
      if (!res || !res.list) break;
      items.forEach((x, i) => {
        const v = res.list[i]; // on-roll perspective
        const g0 = x.side === 0 ? v : BG.flip(v);
        evals.set(x.g + ':' + x.a, { p: g0[0], v: g0, g0: g0[1], g1: g0[3] });
      });
      renderInfo();
      if (evalQueueBusy !== 'again') break;
      evalQueueBusy = true;
    }
  } finally { evalQueueBusy = false; }
}
function hintKey() { if (!turn) return ''; return BG.key(turn.start) + '|' + turn.side + '|' + turn.dice.join(''); }
async function maybeHint() {
  if (!settings.hint || lesson || puzzle || !match || reviewing) { renderHintCard(); return; }
  const [g] = curGA(); const st = stateAt(g, match.games[g].actions.length);
  if (turn && !isAI(turn.side)) {
    const key = hintKey();
    if (hintData && hintData.key === key) { renderHintCard(); renderArrows(); return; }
    hintData = { key, loading: true }; renderHintCard();
    const r = await request('ana', { type: 'analyze', pos: turn.start, side: turn.side, dice: turn.dice, ply: 1, keep: 8, max: 6, time: 1500 });
    if (!r || !turn || hintKey() !== key) return;
    hintData = { key, list: r.list, side: turn.side, start: turn.start.slice(), n: r.n };
    renderHintCard(); renderArrows();
    return;
  }
  if (!turn && !st.over && st.nRolls > 0) {
    const human = st.offered ? !isAI(st.turn) : !isAI(st.turn);
    if (!human) return;
    const canD = !st.offered && BG.cubeAvailable(st, ctxFor(g, st.turn), st.turn);
    if (!canD && !st.offered) { hintData = null; renderHintCard(); return; }
    const side = st.offered ? st.doubler : st.turn;
    const key = 'cube|' + BG.key(st.pos) + side + st.offered;
    if (hintData && hintData.key === key) { renderHintCard(); return; }
    hintData = { key, loading: true }; renderHintCard();
    const r = await request('ana', { type: 'cubeinfo', pos: st.pos, side, depth: 1, ctx: ctxFor(g, side) });
    if (!r || !hintData || hintData.key !== key) return;
    hintData = { key, cube: r.cube, v: r.v, offered: st.offered, side };
    renderHintCard();
  }
}
const fmtE = e => (e >= 0 ? '+' : '−') + Math.abs(e).toFixed(3);
function renderHintCard() {
  const card = $('#hintCard');
  const show = settings.hint && !lesson && !puzzle && hintData && !reviewing;
  card.classList.toggle('show', !!show);
  if (!show) return;
  if (hintData.loading) { $('#hintBody').innerHTML = `<div class="hint-note">${t('hint.thinking')}</div>`; return; }
  if (hintData.list) {
    const best = hintData.list[0].e;
    $('#hintBody').innerHTML = `<div class="hl">${hintData.list.map((x, i) => `<button data-i="${i}" class="${i === 0 ? 'best' : ''}${previewPlay && previewPlay.i === i ? ' sel' : ''}"><span class="r">${i + 1}</span><span class="mv">${BG.notation(x.moves)}</span><span class="eq">${fmtE(x.e)}</span><span class="d">${i ? (x.e - best).toFixed(3) : ''}</span></button>`).join('')}</div><div class="hint-note">${t('hint.note', { n: hintData.n })}</div>`;
    return;
  }
  if (hintData.cube) {
    const c = hintData.cube, v = hintData.v;
    let rec;
    if (hintData.offered) rec = c.take ? t('hint.take') : t('hint.pass');
    else rec = c.double ? (c.take ? t('hint.dt') : t('hint.dp')) : t('hint.nd');
    $('#hintBody').innerHTML = `<div class="cubeline"><b>${rec}</b><br>${t('hint.win', { p: (v[0] * 100).toFixed(1), g: (v[1] * 100).toFixed(1), l: (v[3] * 100).toFixed(1) })}<br><span style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--muted)">ND ${fmtE(c.nd)} · D/T ${fmtE(c.dt)} · D/P ${fmtE(c.dp)}</span></div><div class="hint-note">${c.mode === 'match' ? t('hint.cubeMatch') : t('hint.cubeMoney')}</div>`;
  }
}
$('#hintBody').addEventListener('click', e => {
  const b = e.target.closest('button[data-i]'); if (!b || !hintData || !hintData.list) return;
  const i = +b.dataset.i;
  previewPlay = previewPlay && previewPlay.i === i ? null : { i, side: hintData.side, start: hintData.start, moves: hintData.list[i].moves, cls: 'hint' };
  renderHintCard(); renderArrows();
});
$('#hintClose').onclick = () => { settings.hint = false; save(); hintData = null; previewPlay = null; renderHintCard(); renderArrows(); renderInfo(); };
// arrows for a play: from the turn's start position
function playArrows(side, start, moves, color, dashed) {
  const q = start.slice(); let h = '';
  const S = 100;
  for (const c of moves) {
    const f = BG.mvFrom(c), to = BG.mvTo(c);
    const nf = q[side * 26 + f];
    const [x0, y0] = ckXY(side, f, nf - 1, nf);
    BG.apply(q, side, f, to);
    let x1, y1;
    if (to === 0) { [x1, y1] = offXY(side, q[side * 26] - 1); y1 += 0.12; }
    else { const n = q[side * 26 + to]; [x1, y1] = ckXY(side, to, n - 1, n); }
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - Math.min(1.2, Math.abs(x1 - x0) * 0.18 + 0.2) * (y0 < G.MID && y1 < G.MID ? -1 : 1);
    const id = 'ah' + color.replace(/[^a-z0-9]/gi, '');
    h += `<path d="M${x0 * S} ${y0 * S} Q${mx * S} ${my * S} ${x1 * S} ${y1 * S}" stroke="rgba(0,0,0,.45)" stroke-width="15" fill="none" ${dashed ? 'stroke-dasharray="18 14"' : ''}/>`;
    h += `<path d="M${x0 * S} ${y0 * S} Q${mx * S} ${my * S} ${x1 * S} ${y1 * S}" stroke="${color}" stroke-width="9" ${dashed ? 'stroke-dasharray="18 14"' : ''} marker-end="url(#${id})" opacity=".92"/>`;
  }
  return h;
}
function renderArrows() {
  let h = '';
  const defs = c => `<marker id="ah${c.replace(/[^a-z0-9]/gi, '')}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${c}"/></marker>`;
  const colors = new Set();
  const arr = [];
  if (previewPlay) arr.push(previewPlay);
  else if (settings.hint && hintData && hintData.list && turn && hintData.key === hintKey() && !turn.steps.length && !lesson && !puzzle) arr.push({ side: hintData.side, start: hintData.start, moves: hintData.list[0].moves, cls: 'hint' });
  for (const a of extraArrows) arr.push(a);
  for (const a of arr) {
    const col = a.cls === 'bad' ? '#ff7b6b' : a.cls === 'played' ? 'rgba(255,255,255,.85)' : '#ffe6a0';
    colors.add(col);
    h += playArrows(a.side, a.start, a.moves, col, a.cls === 'bad' || a.cls === 'played');
  }
  arrowsEl.innerHTML = `<defs>${[...colors].map(defs).join('')}</defs>` + h;
}
async function coachRate(tt, moves) {
  const k = BG.key(tt.pos);
  const r = await request('ana', { type: 'analyze', pos: tt.start, side: tt.side, dice: tt.dice, ply: 1, keep: 6, max: 3, played: k, time: 1200 });
  if (!r || !r.list || !r.played) return;
  const loss = Math.max(0, r.list[0].e - r.played.e);
  const cls = qualOf(loss, r.list[0].key === k);
  showCoach(cls, cls === 'best' ? t('q.best') : `${t('q.' + cls)}  −${loss.toFixed(3)}  (${t('q.bestIs', { m: BG.notation(r.list[0].moves) })})`);
}
async function coachCube(g, st, take) {
  const r = await request('ana', { type: 'cubeinfo', pos: st.pos, side: st.doubler, depth: 1, ctx: ctxFor(g, st.doubler) });
  if (!r || !r.cube) return;
  const c = r.cube, right = c.take === take, loss = Math.abs(c.dt - c.dp) / (c.mode === 'money' ? st.cube : 1);
  const cls = right ? 'best' : qualOf(loss, false);
  showCoach(cls, right ? t('q.best') : `${t('q.' + cls)}  −${loss.toFixed(3)}  (${t(c.take ? 'hint.take' : 'hint.pass')})`);
}
function qualOf(loss, isBest) { return isBest || loss < 0.002 ? 'best' : loss < 0.04 ? 'good' : loss < 0.08 ? 'dubious' : 'bad'; }
let coachTimer = 0;
function showCoach(cls, text) { const el = $('#coach'); el.className = 'coach show q-' + cls; el.textContent = text; clearTimeout(coachTimer); coachTimer = setTimeout(() => el.classList.remove('show'), 3200); }

// ====================================================================== controls
function showOverlay(s) { const o = $(s); if (!o.classList.contains('show')) { const m = o.querySelector('.modal'); if (m) m.scrollTop = 0; } o.classList.add('show'); }
function hideOverlay(s) { $(s).classList.remove('show'); }
function confetti() {
  if (!anim()) return;
  const cols = ['#e6cd8c', '#fff6dc', '#b39249', '#33363d', '#c9ccd2'];
  for (let i = 0; i < 70; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random() * 100 + '%'; c.style.background = cols[i % cols.length];
    c.style.setProperty('--dx', (Math.random() - 0.5) * 200 + 'px'); c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg');
    c.style.animationDuration = 1.8 + Math.random() * 1.6 + 's'; c.style.animationDelay = Math.random() * 0.4 + 's';
    document.body.appendChild(c); setTimeout(() => c.remove(), 4200);
  }
}
$('#btnNew').onclick = () => (lesson || puzzle) ? openNewDialog() : rsOpen();
$('#btnUndo').onclick = undo;
$('#btnHint').onclick = () => {
  settings.hint = !settings.hint; save();
  if (!settings.hint) { hintData = null; previewPlay = null; }
  else maybeHint();
  renderInfo(); renderArrows();
};
// ---- landscape option for phones: real orientation lock where supported (Android, fullscreen), otherwise rotate the page
const LAND_STORE = STORE + '-land';
let landOn = false, landLocked = false;
try { landOn = localStorage.getItem(LAND_STORE) === '1'; } catch (e) {}
const mqPortrait = matchMedia('(orientation: portrait)'), mqCoarse = matchMedia('(pointer: coarse)');
const mqLandPhone = matchMedia('(min-aspect-ratio: 1/1) and (pointer: coarse) and (max-height: 560px), (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-width: 900px)');
let geomReady = false;
// flat board in any phone-landscape layout (physical landscape or the rotated page)
// PC wide: the board spans the browser width (flat geometry, height fitted to the window), the info row sits below it;
// lessons / puzzles keep their card beside the board; while the review is open the board leaves room for the row's top
const mqPCW = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1000px) and (min-height: 560px)');
let PCW = false;
function pcFit() {
  const w = innerWidth, hgt = innerHeight, hb = (HB && HB.on) ? 56 : 0;
  const side = document.body.classList.contains('in-lesson') || document.body.classList.contains('in-puzzle');
  // the info row below the board has a fixed height (cards scroll inside); board + row fit in the window
  const rowH = Math.round(Math.min(340, Math.max(236, hgt * 0.3)));
  document.documentElement.style.setProperty('--rowh', rowH + 'px');
  const reserve = side ? 0 : rowH + 18;
  const availW = w - 48 - (side ? Math.min(440, Math.max(360, w * 0.3)) + 24 : 0);
  const availH = hgt - hb - 14 - 16 - reserve;
  const hMin = side ? 8.4 : 7.2;
  let u = Math.min(availW / 15.85, 100), h = availH / u;
  if (h < hMin) { u = availH / hMin; h = hMin; }
  return { h: Math.min(12, h), u: Math.max(30, u) };
}
function updateGeom() {
  const pcw = mqPCW.matches && !ROT && !mqCoarse.matches;
  if (pcw !== PCW) { PCW = pcw; document.documentElement.classList.toggle('pcw', pcw); }
  const flat = ROT || mqLandPhone.matches || PCW, f = flat ? (PCW ? pcFit() : flatFit()) : { h: 12, u: 0 };
  if (flat === G.FLAT && Math.abs(f.h - G.H) < 0.05 && Math.abs(f.u - (G.U || 0)) < 0.3 && geomReady) return;
  G.U = f.u; setGeom(flat, f.h, f.u);
  if (geomReady) { try { drawBoardSvg(); render(); } catch (e) {} }
}
function applyLand() {
  const rot = landOn && !landLocked && mqCoarse.matches && mqPortrait.matches;
  if (rot !== ROT) { ROT = rot; document.documentElement.classList.toggle('rot', rot); selected = null; updateGeom(); requestAnimationFrame(() => { try { render(); } catch (e) {} }); }
  $('#btnLand').classList.toggle('on', landOn);
}
(mqLandPhone.addEventListener ? mqLandPhone.addEventListener('change', updateGeom) : mqLandPhone.addListener(updateGeom));
addEventListener('resize', () => { if (G.FLAT || mqLandPhone.matches || mqPCW.matches !== PCW) updateGeom(); });
(mqPCW.addEventListener ? mqPCW.addEventListener('change', updateGeom) : mqPCW.addListener(updateGeom));
// PC wide: lessons / puzzles (body class) change the board's room
let pcwRaf = 0;
function pcwRefit() { if (!PCW || pcwRaf) return; pcwRaf = requestAnimationFrame(() => { pcwRaf = 0; updateGeom(); }); }
new MutationObserver(pcwRefit).observe(document.body, { attributes: true, attributeFilter: ['class'] });
if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (G.FLAT) requestAnimationFrame(updateGeom); }); for (const sel of ['#lessonCard', '#puzzleCard', '.brand', '.players']) { const el = document.querySelector(sel); if (el) ro.observe(el); } }
async function setLand(on) {
  landOn = on; try { localStorage.setItem(LAND_STORE, on ? '1' : '0'); } catch (e) {}
  if (on) {
    landLocked = false;
    try {
      if (mqPortrait.matches && screen.orientation && screen.orientation.lock && document.documentElement.requestFullscreen) {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        await screen.orientation.lock('landscape'); landLocked = true;
        // some browsers resolve the lock without rotating: fall back to the CSS rotation
        await sleep(700); if (mqPortrait.matches) landLocked = false;
      }
    } catch (e) { landLocked = false; if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch (_) {} } }
  } else {
    if (landLocked) { try { screen.orientation.unlock(); } catch (e) {} if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch (_) {} } }
    landLocked = false;
  }
  applyLand();
  toast(t(on ? 'land.on' : 'land.off'), 1100);
}
$('#btnLand').onclick = () => setLand(!landOn);
(mqPortrait.addEventListener ? mqPortrait.addEventListener('change', applyLand) : mqPortrait.addListener(applyLand));
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && landLocked) { landLocked = false; applyLand(); } });
// the rotated page must never scroll (focus / scrollIntoView could shift it)
// (the rotated body itself scrolls vertically in its own frame; only sideways shifts are undone)
for (const el of [document.documentElement, document.body]) el.addEventListener('scroll', () => { if (!ROT) return; if (el.scrollLeft) el.scrollLeft = 0; if (el === document.documentElement && el.scrollTop) el.scrollTop = 0; });
applyLand();
// ---- phone landscape: "▼ Info" / "▲ Board" jump button (the panels sit below the full-width board)
(() => {
  const btn = $('#scrollJump');
  const scroller = () => ROT ? document.body : document.scrollingElement;
  const atTop = () => scroller().scrollTop < 60;
  const upd = () => {
    btn.textContent = atTop() ? '▼ ' + t('land.info') : '▲ ' + t('land.board');
    // in the rotated page, fixed elements live inside the (scrolling) rotated body: keep the button at its bottom edge
    if (ROT) { const b = document.body; btn.style.bottom = 'auto'; btn.style.top = (b.scrollTop + b.clientHeight - btn.offsetHeight - 4) + 'px'; }
    else { btn.style.top = ''; btn.style.bottom = ''; }
  };
  btn.onclick = () => {
    const sc = scroller();
    if (atTop()) { const tgt = document.querySelector('.hint-card.show, .review-card.show') || $('#evalCard'); const top = lrect(tgt).top - lrect(document.querySelector('.app')).top - 8; sc.scrollTo({ top, behavior: 'smooth' }); }
    else sc.scrollTo({ top: 0, behavior: 'smooth' });
  };
  addEventListener('scroll', upd, { passive: true }); document.body.addEventListener('scroll', upd, { passive: true });
  setInterval(upd, 1000); upd();
})();
// ---- one-time tip for phone users in portrait: landscape play is available (queued behind any open dialog)
const LAND_TIP = STORE + '-landtip';
function landTipWanted() { return !landOn && mqCoarse.matches && mqPortrait.matches; }   // shown on every visit in portrait (once per page load)
function pulseLand() { const b = $('#btnLand'); b.classList.add('pulse'); setTimeout(() => b.classList.remove('pulse'), 4500); }
function closeLandTip(on) { hideOverlay('#landTipOverlay'); if (on) setLand(true); setTimeout(pulseLand, 250); }
$('#ltKeep').onclick = () => closeLandTip(false);
$('#ltOn').onclick = () => closeLandTip(true);
if (landTipWanted()) {
  const iv = setInterval(() => {
    if (!landTipWanted()) { clearInterval(iv); return; }
    if (document.querySelector('.overlay.show') || lesson || puzzle) return;
    clearInterval(iv);
    document.body.classList.toggle('no-anim', !settings.anim);
    showOverlay('#landTipOverlay');
  }, 700);
}
$('#btnSound').onclick = () => { settings.sound = !settings.sound; save(); renderInfo(); if (settings.sound) SFX.tick(); };
$('#btnLesson').onclick = () => openLessons();
$('#btnPuzzle').onclick = () => openPuzzles();
$('#btnReview').onclick = () => hideOverlay('#resultOverlay');
$('#btnAgain').onclick = () => { hideOverlay('#resultOverlay'); if (matchOver()) startNewMatch(); else nextGame(); };
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  const ov = [...document.querySelectorAll('.overlay.show')];
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    if (ov.some(o => o.id !== 'resultOverlay') || lesson || puzzle) return;
    e.preventDefault(); undo(); return;
  }
  if (ov.length) { if (e.key === 'Escape') ov.forEach(o => o.classList.remove('show')); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'enter') { const b = $('#bb-confirm') || $('#bb-roll') || $('#bb-next') || $('#bb-take'); if (b) { e.preventDefault(); b.click(); } }
  else if (k === 'r') { const b = $('#bb-roll'); if (b) b.click(); }
  else if (k === 'd') { const b = $('#bb-double'); if (b) b.click(); }
  else if (k === 'backspace' || k === 'u') { if (turn && turn.steps.length) undoStep(); }
});

// ---------------------------------------------------------------- new game dialog
let draft = {};
function levelLabelHTML(v) { return `Lv.${v} ${LV(v)}<small>${LVD(v)}</small>`; }
function segSync() {
  document.querySelectorAll('#segMode button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.mode));
  ckSync(); skinSync();
  document.querySelectorAll('#segMatch button').forEach(b => b.classList.toggle('sel', +b.dataset.v === draft.matchLen));
  const m = draft.mode, game = m === 'ai' || m === 'pvp' || m === 'watch';
  $('#fColor').classList.toggle('hidden', !game);
  $('#fLevel').classList.toggle('hidden', !(m === 'ai' || m === 'watch'));
  $('#fLevel2').classList.toggle('hidden', m !== 'watch');
  $('#fDisplay').classList.toggle('hidden', !game);
  $('#fMatch').classList.toggle('hidden', !game);
  $('#fSeed').classList.toggle('hidden', !game);
  $('#fInfo').classList.toggle('hidden', game);
  $('#fInfoText').textContent = m === 'lesson' ? t('ls.desc2', { n: LESSONS ? LESSONS.steps.length : 23 }) : m === 'puzzle' ? t('pz.desc') : '';
  $('#btnStart').textContent = m === 'lesson' ? t('ng.toLessons') : m === 'puzzle' ? t('ng.toPuzzles') : t('start');
  $('#levelLabel').textContent = m === 'watch' ? t('ng.levelC', { c: t('ng.' + draft.ck[0]) }) : t('ng.level');
  if ($('#level2Label')) $('#level2Label').textContent = t('ng.levelC', { c: t('ng.' + draft.ck[1]) });
  $('#levelRange').value = draft.level; $('#levelName').innerHTML = levelLabelHTML(draft.level);
  $('#levelRange2').value = draft.level2; $('#levelName2').innerHTML = levelLabelHTML(draft.level2);
}
// checker colours: one row per side (AI game: you / AI), four swatches each; the two sides always differ
function ckSync() {
  const T = window.BGTheme; if (!T) return;
  const m = draft.mode, lab = s => m === 'ai' ? (s === 0 ? t('you') : 'AI') : m === 'watch' ? 'AI ' + (s + 1) : t('ng.pl', { n: s + 1 });
  document.querySelectorAll('#ckRows .ckrow').forEach(row => {
    const s = +row.dataset.s;
    row.querySelector('.ckl').textContent = lab(s);
    row.querySelector('.cksw').innerHTML = T.CK_IDS.map(id => { const c = T.CK[id]; return `<button data-c="${id}" class="${draft.ck[s] === id ? 'sel' : draft.ck[1 - s] === id ? 'dim' : ''}" title="${esc(t('ng.' + id))}"><i class="sw" style="background:radial-gradient(circle at 35% 30%,${c.c1},${c.c2} 40%,${c.c3} 80%,${c.c4});box-shadow:inset 0 0 0 1.5px ${c.ring},0 1px 3px rgba(0,0,0,.5)"></i><span>${esc(t('ng.' + id))}</span></button>`; }).join('');
  });
}
$('#ckRows').onclick = e => {
  const b = e.target.closest('button[data-c]'); if (!b) return;
  const s = +b.closest('.ckrow').dataset.s, ck = draft.ck.slice(); ck[s] = b.dataset.c;
  draft.ck = BGTheme.fixPair(ck[0], ck[1], s); segSync(); skinSync();
};
// board skins: small previews in the new-game dialog; a click applies (and keeps) the skin at once
function skinPreview(id) { const ck = (draft && draft.ck) || settings.ck; return BGTheme.thumbSVG(id, ck[0], ck[1]); }
function skinSync() {
  if (!window.BGTheme) return;
  $('#skinRow').innerHTML = BGTheme.SKIN_IDS.map(id => `<button data-skin="${id}" class="${BGTheme.skinId(settings.skin) === id ? 'sel' : ''}">${skinPreview(id)}<span>${esc(t('skin.' + id))}</span></button>`).join('');
}
$('#skinRow').onclick = e => { const b = e.target.closest('button[data-skin]'); if (!b) return; settings.skin = b.dataset.skin; save(); applySkinNow(); skinSync(); };
function applySkinNow() { if (window.BGTheme) BGTheme.applySkin(settings.skin); drawBoardSvg(); try { render(); } catch (e) {} }
function applyCk() { if (window.BGTheme) { settings.ck = BGTheme.fixPair(settings.ck[0], settings.ck[1]); BGTheme.applyCheckers(settings.ck); } }
function openNewDialog() {
  draft = { mode: lesson ? 'lesson' : puzzle ? 'puzzle' : settings.mode, color: 0, ck: (settings.ck || ['gold', 'black']).slice(), level: settings.level, level2: settings.level2, matchLen: settings.matchLen };
  $('#optCube').checked = settings.cube; $('#optEval').checked = settings.eval; $('#optForced').checked = settings.forced;
  $('#optRoll').checked = settings.autoRoll; $('#optCoach').checked = settings.coach; $('#optAnim').checked = settings.anim;
  $('#seedInput').value = '';
  segSync(); showOverlay('#newOverlay');
}
$('#segMode').onclick = e => { const b = e.target.closest('button'); if (b) { draft.mode = b.dataset.v; segSync(); } };
$('#segMatch').onclick = e => { const b = e.target.closest('button'); if (b) { draft.matchLen = +b.dataset.v; segSync(); } };
$('#levelRange').oninput = e => { draft.level = +e.target.value; segSync(); };
$('#levelRange2').oninput = e => { draft.level2 = +e.target.value; segSync(); };
$('#btnCancelNew').onclick = () => hideOverlay('#newOverlay');
$('#btnStart').onclick = () => {
  hideOverlay('#newOverlay');
  if (draft.mode === 'lesson') { openLessons(); return; }
  if (draft.mode === 'puzzle') { openPuzzles(); return; }
  exitSpecial();
  Object.assign(settings, { mode: draft.mode, color: 0, ck: draft.ck.slice(), level: draft.level, level2: draft.level2, matchLen: draft.matchLen,
    cube: $('#optCube').checked, eval: $('#optEval').checked, forced: $('#optForced').checked, autoRoll: $('#optRoll').checked, coach: $('#optCoach').checked, anim: $('#optAnim').checked });
  pendingSeed = $('#seedInput').value;
  applyCk(); drawBoardSvg();
  startNewMatch();
};

// ====================================================================== post-game review
const RV_WORKERS = Math.max(1, Math.min(2, (navigator.hardwareConcurrency || 2) - 1));
let rv = null, rvOpen = false;
function rvSig() { return match ? match.seed + '|' + match.games.map(gm => BG.encodeGame(gm.actions)).join('~') : ''; }
function rvCancel() {
  if (rv && rv.ws) { rv.ws.forEach(w => { w.terminate(); w.jobs.forEach(j => j.resolve(null)); }); rv.ws = null; }
  if (rv && rv.running) rv = null;
}
async function runReview() {
  if (lesson || puzzle || !match) return;
  const total = match.games.reduce((s, gm) => s + gm.actions.length, 0);
  if (!total) { toast(t('nokifu')); return; }
  const sig = rvSig();
  if (rv && rv.sig === sig) { rvOpen = true; renderReview(); revealReview(); return; }
  rvCancel();
  // jobs: plays and cube decisions
  const jobs = [];
  match.games.forEach((gm, g) => {
    gm.actions.forEach((a, i) => {
      const st = stateAt(g, i);
      if (a.t === 'r') {
        const s = st.nRolls === 0 ? (a.d[0] > a.d[1] ? 0 : 1) : st.turn;
        const plays = BG.genPlays(st.pos, s, a.d[0], a.d[1]);
        const after = st.pos.slice(); for (const c of a.m) BG.apply(after, s, BG.mvFrom(c), BG.mvTo(c));
        if (plays.length > 1) jobs.push({ kind: 'play', g, i, side: s, msg: { type: 'analyze', pos: st.pos, side: s, dice: a.d, ply: 1, keep: 6, max: 3, played: BG.key(after), time: 2500, explain: true } });
        if (st.nRolls > 0 && BG.cubeAvailable(st, ctxAt(g, i, s), s)) jobs.push({ kind: 'nodouble', g, i, side: s, cube: st.cube, msg: { type: 'cubeinfo', pos: st.pos, side: s, depth: 1, ctx: ctxAt(g, i, s) } });
      } else if (a.t === 'd') {
        jobs.push({ kind: 'double', g, i, side: st.turn, cube: st.cube, msg: { type: 'cubeinfo', pos: st.pos, side: st.turn, depth: 1, ctx: ctxAt(g, i, st.turn) } });
      } else if (a.t === 'k' || a.t === 'p') {
        jobs.push({ kind: a.t === 'k' ? 'take' : 'pass', g, i, side: st.turn, cube: st.cube, msg: { type: 'cubeinfo', pos: st.pos, side: st.doubler, depth: 1, ctx: ctxAt(g, i, st.doubler) } });
      }
    });
  });
  const run = rv = { sig, items: new Map(), done: 0, total: jobs.length, running: true, ws: [] };
  for (let k = 0; k < RV_WORKERS; k++) run.ws.push(makeWorker());
  rvOpen = true; renderReview(); revealReview();
  let next = 0;
  const loop = async w => {
    while (next < jobs.length && rv === run) {
      const j = jobs[next++];
      const res = await request(w, j.msg);
      if (rv !== run || !res) return;
      const key = j.g + ':' + j.i;
      let item = null;
      if (j.kind === 'play' && res.list && res.played) {
        const loss = Math.max(0, res.list[0].e - res.played.e);
        item = { kind: 'play', side: j.side, loss, best: res.list[0].moves, played: res.played.moves, isBest: res.list[0].key === res.played.key, x: res.x || null, sit: res.sit || null, wb: res.list[0].v, wp: res.played.v };
      } else if (res.cube) {
        const c = res.cube, norm = c.mode === 'money' ? j.cube : 1;
        let loss = 0, bestTxt = '';
        if (j.kind === 'nodouble') { loss = c.double ? Math.max(0, Math.min(c.dt, c.dp) - c.nd) / norm : 0; bestTxt = c.double ? t('rv.shouldDouble') : ''; }
        else if (j.kind === 'double') { loss = !c.double ? Math.max(0, c.nd - Math.min(c.dt, c.dp)) / norm : 0; bestTxt = t('rv.noDouble'); }
        else if (j.kind === 'take') { loss = !c.take ? Math.max(0, c.dt - c.dp) / norm : 0; bestTxt = t('hint.pass'); }
        else if (j.kind === 'pass') { loss = c.take ? Math.max(0, c.dp - c.dt) / norm : 0; bestTxt = t('hint.take'); }
        item = { kind: 'cube', sub: j.kind, side: j.side, loss, isBest: loss < 0.002, bestTxt, cx: window.BGX && res.v ? BGX.cube(res.v, c, j.kind) : null };
      }
      if (item) {
        item.q = item.isBest || item.loss < 0.04 ? null : item.loss < 0.08 ? 'dubious' : 'bad';
        const prev = run.items.get(key);
        if (!prev || item.loss > prev.loss || (j.kind === 'play')) {
          if (prev && prev.kind === 'cube' && prev.loss > item.loss) { prev.play = item; }
          else { if (prev) item.cube = prev; run.items.set(key, item); }
        }
        (run.all || (run.all = [])).push(item);
      }
      run.done++; renderReview(); if (run.done % 4 === 0) renderKifu();
    }
  };
  await Promise.all(run.ws.map(loop));
  if (rv !== run) return;
  run.ws.forEach(w => w.terminate()); run.ws = null; run.running = false;
  renderInfo(); toast(t('rv.done'), 1200);
}
function revealReview() { if (!ROT && matchMedia('(max-aspect-ratio: 1/1) and (pointer: coarse)').matches) setTimeout(() => $('#reviewCard').scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60); }
function rvJudgeAt(g, i) { if (!rv || rv.running || !rvOpen || rv.sig !== rvSig()) return null; return rv.items.get(g + ':' + i) || null; }
function sideLabel(s) { return settings.mode === 'ai' ? (s === humanSide ? t('you') : 'AI') : pname(s); }
let rvSel = null;   // the move picked in the review list {g, i} (the board then shows the position before it, with arrows)
function rvCurrent() {
  if (!rv || rv.running || !match) return null;
  const [g, a] = curGA();
  if (rvSel && tlIndex(rvSel.g, rvSel.i) === cur) return rvSel;
  rvSel = null;
  return a > 0 ? { g, i: a - 1 } : null;
}
const rxt = r => t(r.k, r.a);
// commentary for one analysed action: played vs best, the reasons (computed features -> templates) and the situation
function rvCommentHTML(g, i, opts) {
  const it = rv && rv.items.get(g + ':' + i), a = match.games[g] && match.games[g].actions[i];
  if (!it || !a) return `<div class="rv-cur empty">${t('rv.noMove')}</div>`;
  const main = it, other = it.play || it.cube || null;
  const q = main.q || (other && other.q) || null;
  const loss = Math.max(main.loss, other ? other.loss : 0);
  const head = `<div class="h"><b>${t('rv.cur')}</b><span class="pdisc p${main.side}" style="width:12px;height:12px"></span>${esc(sideLabel(main.side))}${match.games.length > 1 ? ' · G' + (g + 1) : ''}` +
    (q ? `<span class="tag ${q}">${t('q.' + q)}</span><span style="font-family:'JetBrains Mono',monospace">−${loss.toFixed(3)}</span>` : `<span class="tag ok">${t('q.best')}</span>`) + `</div>`;
  let body = '';
  const playIt = main.kind === 'play' ? main : other && other.kind === 'play' ? other : null;
  const cubeIt = main.kind === 'cube' ? main : other && other.kind === 'cube' ? other : null;
  if (playIt) {
    const pl = BG.notation(playIt.played), bs = BG.notation(playIt.best), dice = a.t === 'r' ? a.d.join('') + ' ' : '';
    body += `<div class="mvs"><span>${t('rv.played')}</span><bdi class="mv pld">${dice}${pl}</bdi>` + (playIt.isBest || playIt.loss < 0.004 ? '' : `<span>${t('rv.best')}</span><bdi class="mv bst">${dice}${bs}</bdi>`) + `</div>`;
    if (playIt.x && playIt.x.length && playIt.loss >= 0.02) body += `<ul>${playIt.x.map(r => `<li class="${r.k === 'x.win' ? 'num' : ''}">${rxt(r)}</li>`).join('')}</ul>`;
    else body += `<ul><li>${t('rv.goodMove')}</li></ul>`;
  }
  if (cubeIt && cubeIt.cx && (cubeIt.q || cubeIt.sub !== 'nodouble')) {
    if (!playIt) body += `<div class="mvs"><span>${t('rv.played')}</span><bdi class="mv pld">${t('rv.cube.' + cubeIt.sub)}</bdi>${cubeIt.q ? `<span>${t('rv.best')}</span><bdi class="mv bst">${esc(cubeIt.bestTxt)}</bdi>` : ''}</div>`;
    body += `<ul>${cubeIt.cx.map(r => `<li>${rxt(r)}</li>`).join('')}</ul>`;
  }
  const sit = playIt && playIt.sit;
  if (sit) body += `<div class="sit"><b>${t('rv.sitLbl')}</b>${t(sit.k, sit.a)}</div>`;
  return `<div class="rv-cur">${head}${body}</div>`;
}
function rvShortWhy(it) {
  const p = it.kind === 'play' ? it : it.play && it.play.q ? it.play : null;
  if (p && p.x) { const r = p.x.find(r => r.k !== 'x.win'); if (r) return rxt(r); }
  const c = it.kind === 'cube' ? it : it.cube;
  if (c && c.cx && c.cx.length) return rxt(c.cx[0]);
  return '';
}
function renderReview() {
  const card = $('#reviewCard');
  if (rv && !lesson && !puzzle && rv.sig !== rvSig() && !rv.running) { rv = null; rvOpen = false; }
  const show = !lesson && !puzzle && rvOpen && rv;
  if (card.classList.contains('show') !== !!show) { card.classList.toggle('show', !!show); pcwRefit(); }
  if (!show) return;
  let html;
  if (rv.running) {
    html = `<div style="font-size:13px;color:var(--muted)">${t('rv.running', { a: rv.done, b: rv.total })}</div><div class="rv-prog"><i style="width:${rv.total ? rv.done / rv.total * 100 : 0}%"></i></div>`;
  } else {
    const st = { 0: { n: 0, best: 0, bad: 0, dubious: 0, loss: 0 }, 1: { n: 0, best: 0, bad: 0, dubious: 0, loss: 0 } };
    for (const it of rv.all || []) {
      const s = st[it.side];
      if (it.kind === 'play') { s.n++; if (it.isBest) s.best++; }
      s.loss += it.loss;
    }
    const list = [];
    for (const [key, it] of rv.items) { const [g, i] = key.split(':').map(Number); if (it.q) { st[it.side][it.q]++; list.push({ g, i, it, ...it }); } }
    // compact overview: one stats row per side, then at most 3 key moments (the biggest losses) with jump buttons
    const chip = s => { const x = st[s], pr = x.n ? (x.loss / x.n * 500) : 0; return `<span class="rv-st"><span class="pdisc p${s}"></span><b>${esc(sideLabel(s))}</b> ${t('rv.acc')} <b>${x.n ? Math.round(x.best / x.n * 100) : 0}%</b> · PR <b title="${t('rv.prTitle')}">${pr.toFixed(1)}</b> · <span class="bad">${t('q.bad')} ${x.bad}</span> <span class="dubious">${t('q.dubious')} ${x.dubious}</span></span>`; };
    const cr = rvCurrent();
    html = cr ? rvCommentHTML(cr.g, cr.i) : `<div class="rv-cur empty">${t('rv.pick')}</div>`;
    html += `<div class="rv-sum2">${chip(0)}${chip(1)}</div>`;
    const key = list.slice().sort((a, b) => b.loss - a.loss).slice(0, 3).sort((a, b) => a.g - b.g || a.i - b.i);
    const curKey = cr ? cr.g + ':' + cr.i : '';
    if (key.length) html += `<div class="rv-kh">${t('rv.key')}</div><div class="rv-list">${key.map(x => {
      const lbl = x.kind === 'play' ? `${match.games[x.g].actions[x.i].d.join('')} ${BG.notation(x.played)} → ${BG.notation(x.best)}` : `${t('rv.cube.' + x.sub)} → ${x.bestTxt}`;
      return `<button data-g="${x.g}" data-i="${x.i}" class="${curKey === x.g + ':' + x.i ? 'cur' : ''}"><span class="row"><span class="tag ${x.q}">${t('q.' + x.q)}</span><span class="mv">${match.games.length > 1 ? 'G' + (x.g + 1) + ' ' : ''}<i class="p${x.side}"></i>${lbl}</span><span class="ls">−${x.loss.toFixed(3)}</span></span></button>`;
    }).join('')}</div>`;
    else html += `<div class="rv-note" style="color:#8fe3b8">${t('rv.clean')}</div>`;
  }
  $('#rvBody').innerHTML = html;
}
$('#rvBody').addEventListener('click', e => {
  const b = e.target.closest('button[data-g]'); if (!b) return;
  const g = +b.dataset.g, i = +b.dataset.i;
  rvSel = { g, i };
  viewAt(tlIndex(g, i));
  const it = rv && rv.items.get(g + ':' + i);
  extraArrows = [];
  if (it && it.kind === 'play') {
    const st = stateAt(g, i), a = match.games[g].actions[i];
    const s = st.nRolls === 0 ? (a.d[0] > a.d[1] ? 0 : 1) : st.turn;
    extraArrows = [{ side: s, start: st.pos, moves: it.best, cls: 'hint' }, { side: s, start: st.pos, moves: it.played, cls: 'bad' }];
    renderDice(s, a.d, a.d[0] === a.d[1] ? 0 : [false, false]);
  }
  renderArrows(); renderReview();
});
$('#rvClose').onclick = () => { rvOpen = false; rvSel = null; if (rv && rv.running) rvCancel(); extraArrows = []; renderReview(); renderArrows(); renderKifu(); };
$('#btnAnalyze').onclick = () => runReview();
$('#btnResAnalyze').onclick = () => { hideOverlay('#resultOverlay'); runReview(); };

// ====================================================================== share / load
function encodeMatch() { return `${match.seed}.${match.len}.${match.cube ? 1 : 0}.` + match.games.map(gm => BG.encodeGame(gm.actions)).join('~'); }
function parseMatchText(v) {
  v = (v || '').trim(); let n;
  const h = v.match(/#(.*)$/);
  if (h) { const q = new URLSearchParams(h[1]); if (!q.has('k')) return null; v = q.get('k') || ''; if (q.has('n')) n = parseInt(q.get('n'), 10); }
  const m = v.match(/^([a-z0-9]{1,24})\.(\d{1,2})\.([01])\.([0-9A-Za-z~\-]*)$/);
  if (!m) return null;
  return { seed: m[1], len: +m[2], cube: m[3] === '1', games: m[4] ? m[4].split('~') : [''], n };
}
function buildMatch(r) {
  const mt = { seed: r.seed, len: r.len, cube: r.cube, games: [] };
  let score = [0, 0], crawUsed = false;
  for (let g = 0; g < r.games.length; g++) {
    const d = BG.decodeGame(r.games[g]);
    if (d.error) return { error: d.error, g };
    const craw = r.len > 0 && !crawUsed && (score[0] === r.len - 1 || score[1] === r.len - 1);
    if (craw) crawUsed = true;
    mt.games.push({ actions: d.actions, start: score.slice(), crawford: craw });
    const st = BG.replay(d.actions);
    if (g < r.games.length - 1) { if (!st.over) return { error: d.actions.length + 1, g }; score[st.winner] += st.points; }
  }
  return { match: mt };
}
function openLoaded(mt, n) {
  ['#resultOverlay', '#newOverlay', '#lessonOverlay', '#puzzleOverlay', '#pasteOverlay'].forEach(hideOverlay);
  if (lesson || puzzle) { savedGame = null; exitSpecial(); }
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); rvCancel(); rv = null; rvOpen = false; thinking = -1;
  settings.mode = 'pvp'; view = 0;
  match = mt; evals = new Map(); turn = null; hintData = null;
  gameOverShown = new Set();
  match.games.forEach((gm, g) => { if (BG.replay(gm.actions).over) gameOverShown.add(g + ':' + gm.actions.length); });
  cur = n === undefined || isNaN(n) ? latestIdx() : Math.max(0, Math.min(latestIdx(), n));
  reviewing = cur !== latestIdx();
  updateCommit(); save(); render(); renderInfo(); analyzeCurrent(); if (!reviewing) drive();
}
function loadText(v) {
  const r = parseMatchText(v);
  if (!r) { toast(t('paste.invalid'), 2200); return false; }
  const b = buildMatch(r);
  if (b.error) { toast(t('paste.bad', { n: b.error, g: b.g + 1 }), 2500); return false; }
  openLoaded(b.match, r.n);
  toast(t('paste.loaded', { n: b.match.games.reduce((s, gm) => s + gm.actions.length, 0) }), 1800);
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
  if (!match || !match.games.some(gm => gm.actions.length)) { toast(t('nokifu')); return; }
  const url = location.origin + location.pathname + '#k=' + encodeMatch() + (cur < latestIdx() ? '&n=' + cur : '');
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { await navigator.share({ title: 'Backgammon V2', url }); return; }
    await navigator.clipboard.writeText(url); toast(t('share.copied'), 1400);
  } catch (e) { if (e && e.name === 'AbortError') return; toast(url, 4000); }
};
$('#btnPaste').onclick = () => { $('#pasteText').value = ''; showOverlay('#pasteOverlay'); setTimeout(() => $('#pasteText').focus(), 50); };
$('#pasteCancel').onclick = () => hideOverlay('#pasteOverlay');
$('#pasteOk').onclick = () => { const v = $('#pasteText').value; if (!v.trim()) { toast(t('nokifu')); return; } loadText(v); };
$('#pasteText').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#pasteOk').click(); } else if (e.key === 'Escape') hideOverlay('#pasteOverlay'); });
$('#btnCopy').onclick = async () => {
  if (!match || !match.games.some(gm => gm.actions.length)) { toast(t('nokifu')); return; }
  let txt = `Backgammon V2 — ${match.len ? match.len + '-point match' : 'money game'} · seed ${match.seed}\n`;
  match.games.forEach((gm, g) => {
    txt += `\nGame ${g + 1} (${pname(0)} ${gm.start[0]} - ${pname(1)} ${gm.start[1]})${gm.crawford ? ' Crawford' : ''}\n`;
    gm.actions.forEach((a, i) => {
      const s = actorOf(g, i);
      const line = a.t === 'r' ? `${a.d[0]}${a.d[1]}: ${a.m.length ? BG.notation(a.m) : '(no move)'}` : a.t === 'd' ? `Doubles => ${stateAt(g, i).cube * 2}` : a.t === 'k' ? 'Takes' : a.t === 'p' ? 'Passes' : 'Resigns';
      txt += `${pname(s)} ${line}\n`;
    });
    const st = stateAt(g, gm.actions.length);
    if (st.over) txt += `${pname(st.winner)} wins ${st.points} point(s)\n`;
  });
  txt += `\n${location.origin + location.pathname}#k=${encodeMatch()}\n`;
  try { await navigator.clipboard.writeText(txt); toast(t('copied')); } catch (e) { toast(t('copyFail'), 2000); }
};

// ====================================================================== "対局" popup and nav
function rsInProgress() { if (lesson || puzzle || !match) return false; const g = match.games.length - 1, gm = match.games[g]; return !matchOver() && (gm.actions.length > 0 || g > 0) && !(match.len === 0 && stateAt(g, gm.actions.length).over); }
function rsViewing() { return !lesson && !puzzle && reviewing; }
function rsOpen() {
  if (!rsInProgress() && !rsViewing()) { openNewDialog(); return; }
  $('#rsText').textContent = rsViewing() ? t('rs.viewing') : t('rs.playing');
  showOverlay('#resumeOverlay');
}
$('#rsCancel').onclick = () => hideOverlay('#resumeOverlay');
$('#rsRestart').onclick = () => { hideOverlay('#resumeOverlay'); openNewDialog(); };
$('#rsResume').onclick = () => { hideOverlay('#resumeOverlay'); if (reviewing) resumeHere(); };
let playTimer = 0;
function stopPlay() { clearInterval(playTimer); playTimer = 0; $('#navPlay').classList.remove('playing'); }
function navGo(what) {
  if (lesson || puzzle || !match) return;
  const N = latestIdx();
  if (what === 'play') {
    if (playTimer) { stopPlay(); return; }
    if (cur >= N) viewAt(0);
    $('#navPlay').classList.add('playing');
    playTimer = setInterval(() => { if (lesson || puzzle || cur >= latestIdx()) { stopPlay(); return; } viewAt(cur + 1); }, 900);
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
// clicking outside a dialog = its close button
(() => {
  const OUTSIDE = { landTipOverlay: '#ltKeep', newOverlay: '#btnCancelNew', resultOverlay: '#btnReview', pasteOverlay: '#pasteCancel', puzzleOverlay: '#pzClose', resumeOverlay: '#rsCancel', rulesOverlay: '#rulesClose' };
  document.querySelectorAll('.overlay').forEach(o => {
    let down = false;
    o.addEventListener('pointerdown', e => { down = e.target === o; });
    o.addEventListener('click', e => {
      if (e.target !== o || !down) return; down = false;
      if (o.id === 'lessonOverlay') { if (!$('#lessonDoneView').classList.contains('hidden')) $('#btnLessonQuit2').click(); else $('#btnLessonClose').click(); return; }
      const b = OUTSIDE[o.id] && $(OUTSIDE[o.id]);
      if (b) b.click(); else o.classList.remove('show');
    });
  });
})();

// ====================================================================== lessons & puzzles (shared helpers)
// positions in data files: 52 hex digits (side 0 then side 1, index 0..25 each); plays: moves as letter pairs (from, to)
function decPos(s) { const p = new Int8Array(52); for (let i = 0; i < 52; i++) p[i] = parseInt(s[i], 16); return p; }
function decMoves(p, side, s) { const q = p.slice(), out = []; for (let i = 0; i < s.length; i += 2) { const f = s.charCodeAt(i) - 65, to = s.charCodeAt(i + 1) - 65; out.push(BG.apply(q, side, f, to)); } return { moves: out, pos: q }; }
let savedGame = null;
function stashGame() { if (!lesson && !puzzle && match) savedGame = { match, cur, view, humanSide, evals, gameOverShown }; }
function exitSpecial() {
  if (!lesson && !puzzle) return;
  if (lesson && lesson.op && window.OPH) OPH.stop();
  lesson = null; puzzle = null; marks = []; extraArrows = []; previewPlay = null; turn = null;
  document.body.classList.remove('in-lesson', 'in-puzzle', 'in-study', 'st-end');
  $('#lessonCard').style.minHeight = ''; $('#lsHint').style.display = ''; $('#lsNext').style.display = ''; $('#lsNext').style.opacity = ''; $('#lsAuto').classList.add('hidden');
  busyToken++; cancelWorker('ai'); cancelWorker('ana');
  if (savedGame) { ({ match, cur, view, humanSide, evals, gameOverShown } = savedGame); savedGame = null; }
  if (!match) match = newMatch(null, settings.matchLen, settings.cube);
  reviewing = cur !== latestIdx(); hintData = null;
}
function quitSpecial() { exitSpecial(); render(); renderInfo(); analyzeCurrent(); if (!reviewing) drive(); }
// set up a problem position on the board: a one-off match whose state is the given position
function setupProblem(p, side, dice) {
  match = { seed: 'lesson', len: 0, cube: false, games: [{ actions: [], start: [0, 0], crawford: false }] };
  cur = 0; reviewing = false; view = side; evals = new Map();
  lesson && (lesson.posOverride = null);
  // a fake state: we drive the interactive turn directly from p
  turn = { side, dice, left: dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice.slice(), steps: [], pos: p.slice(), start: p.slice() };
  turn.plays = BG.genPlays(p, side, dice[0], dice[1]);
  selected = null; marks = []; extraArrows = []; previewPlay = null;
}
// shownState() for special modes uses turn.pos; the cube/scores come from the dummy match
function problemPoints(n, rank) { if (n <= 1 || rank === 0) return 20; return Math.max(0, Math.round(20 * (n - 1 - rank) / (n - 1))); }
function miniBoardSVG(p, side, opts) {   // always drawn with the standard (tall) geometry
  const flat = G.FLAT, fh = G.H, fu = G.U; if (flat) setGeom(false);
  try { return miniBoardSVG0(p, side, opts); } finally { if (flat) setGeom(true, fh, fu); }
}
// the board of the small diagrams in the current skin's flat colours: fields (marquetry rings as bands), points, tray, gold line
function miniBase(S) {
  const m = curSkin().mini, ln = m.line;
  let s = '';
  for (const x0 of [G.LX, G.RX]) {
    s += `<rect x="${x0 * S}" y="${G.TOP * S}" width="${6 * S}" height="${11 * S}" fill="${m.felt}"/>`;
    if (m.rings) m.rings.forEach((c, k) => { s += `<rect x="${x0 * S}" y="${(G.TOP + 3.3 + k * 0.9) * S}" width="${6 * S}" height="${0.9 * S}" fill="${c}" opacity=".85"/>`; });
    for (let i = 0; i < 6; i++) { const x = (x0 + i) * S, st = ln ? ` stroke="${ln}" stroke-width=".5" stroke-opacity=".7"` : ''; s += `<path d="M${x + 1} ${G.TOP * S}L${x + S - 1} ${G.TOP * S}L${x + S / 2} ${(G.TOP + 4.6) * S}Z" fill="${i % 2 ? m.b : m.a}"${st}/><path d="M${x + 1} ${G.BOT * S}L${x + S - 1} ${G.BOT * S}L${x + S / 2} ${(G.BOT - 4.6) * S}Z" fill="${i % 2 ? m.a : m.b}"${st}/>`; }
  }
  s += `<rect x="${G.TX * S}" y="${G.TOP * S}" width="${G.TW * S}" height="${11 * S}" rx="3" fill="${m.tray}"/>`;
  if (ln) s += `<rect x="${G.LX * S - 2}" y="${G.TOP * S - 2}" width="${(G.RE - G.LX) * S + 4}" height="${11 * S + 4}" rx="2" fill="none" stroke="${ln}" stroke-width="1"/>`;
  return s;
}
const ckPal = sd => (window.BGTheme && BGTheme.CK[settings.ck[sd]]) || null;
const ckFlat = sd => { const c = ckPal(sd); return c ? c.flat : sd ? '#202328' : '#e2c275'; };
const ckEdge = sd => { const c = ckPal(sd); return c ? c.edge : sd ? '#c9ccd2' : '#7a5c22'; };
function miniBoardSVG0(p, side, opts) {
  opts = opts || {};
  const S = 20, W = 15.85 * S, H = 12 * S;
  let s = `<svg class="mini" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" rx="8" fill="${curSkin().mini.frame}"/>`;
  s += miniBase(S);
  const v0 = view; view = side;
  // highlighted zones [side, fromPt, toPt, colour] (points in that side's numbering)
  for (const z of opts.zones || []) for (let pt = Math.min(z[1], z[2]); pt <= Math.max(z[1], z[2]); pt++) {
    const vp = toV(z[0], pt), x = slotX(vp), top = vp >= 13;
    s += `<rect x="${(x - .5) * S + 1}" y="${(top ? G.TOP : G.MID + .15) * S}" width="${S - 2}" height="${(G.MID - G.TOP - .15) * S}" rx="3" fill="${z[3] || 'rgba(255,226,140,.28)'}"/>`;
  }
  if (p) for (const sd of [0, 1]) for (let pt = 1; pt <= 25; pt++) { const n = p[sd * 26 + pt]; for (let k = 0; k < n; k++) { const [x, y] = ckXY(sd, pt, k, n); s += `<circle cx="${x * S}" cy="${y * S}" r="${0.45 * S}" fill="${ckFlat(sd)}" stroke="${ckEdge(sd)}" stroke-width="1"/>`; } }
  for (const lb of opts.labels || []) {   // [side, pt, text]: a tag beside the point's base
    const vp = toV(lb[0], lb[1]), x = slotX(vp), top = vp >= 13, y = top ? G.TOP + 5.3 : G.BOT - 5.3;
    s += `<text x="${x * S}" y="${y * S}" font-size="9" font-weight="700" font-family="JetBrains Mono,sans-serif" fill="#fff3cf" text-anchor="middle" stroke="#0b1110" stroke-width="2.4" paint-order="stroke">${esc(lb[2])}</text>`;
  }
  if (opts.pips && p) {   // pip counts in the tray: the opponent at the top, the side at the bottom
    const tx = (G.TX + G.TW / 2) * S;
    s += `<text x="${tx}" y="${(G.TOP + .9) * S}" font-size="9.5" font-weight="700" font-family="JetBrains Mono,monospace" fill="${ckFlat(1 - side) === '#202328' ? '#c9ccd2' : ckFlat(1 - side)}" text-anchor="middle">${BG.pips(p, 1 - side)}</text>`;
    s += `<text x="${tx}" y="${(G.BOT - .5) * S}" font-size="9.5" font-weight="700" font-family="JetBrains Mono,monospace" fill="${ckFlat(side) === '#202328' ? '#c9ccd2' : ckFlat(side)}" text-anchor="middle">${BG.pips(p, side)}</text>`;
  }
  for (const mk of opts.marks || []) { const n = p[mk[0] * 26 + mk[1]]; const [x, y] = ckXY(mk[0], mk[1], Math.max(0, n - 1), Math.max(1, n)); s += `<circle cx="${x * S}" cy="${y * S}" r="${0.5 * S}" fill="none" stroke="${mk[2] || '#fff3cf'}" stroke-width="2.4" stroke-dasharray="${mk[3] ? '4 3' : ''}"/>`; }
  for (const ar of opts.arrows || []) {
    const q = p.slice(); for (const c of ar.moves) { const f = BG.mvFrom(c), to = BG.mvTo(c); const nf = q[ar.side * 26 + f]; const [x0, y0] = ckXY(ar.side, f, nf - 1, nf); BG.apply(q, ar.side, f, to); const n = to ? q[ar.side * 26 + to] : 1; const [x1, y1] = to ? ckXY(ar.side, to, n - 1, n) : [G.TX + .65, G.MID]; s += `<line x1="${x0 * S}" y1="${y0 * S}" x2="${x1 * S}" y2="${y1 * S}" stroke="#ffe6a0" stroke-width="2.4" stroke-linecap="round"/><circle cx="${x1 * S}" cy="${y1 * S}" r="3" fill="#ffe6a0"/>`; }
  }
  view = v0;
  return s + '</svg>';
}

// ====================================================================== rules (illustrated)
// positions for the pictures: gold by its own points, black by the view (= gold) point numbers
function rlPos(g, b, o) {
  o = o || {}; const p = new Int8Array(52);
  for (const k in g) p[+k] = g[k];
  for (const k in b) p[26 + 25 - +k] = b[k];
  if (o.gOff) p[0] = o.gOff; if (o.bOff) p[26] = o.bOff; if (o.gBar) p[25] = o.gBar; if (o.bBar) p[51] = o.bBar;
  return p;
}
const RL_INIT = () => rlPos({ 24: 2, 13: 5, 8: 3, 6: 5 }, { 1: 2, 12: 5, 17: 3, 19: 5 });
function rulesSVG(p, o) {
  const flat = G.FLAT, fh = G.H, fu = G.U; if (flat) setGeom(false);
  const v0 = view; view = 0;
  try { return rulesSVG0(p, o || {}); } finally { view = v0; if (flat) setGeom(true, fh, fu); }
}
function rlDie(x, y, n, dark, sz) {
  const S = 20, z = (sz || 0.8) * S, x0 = x * S - z / 2, y0 = y * S - z / 2, r = z * 0.09;
  const PIPS = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] };
  let s = `<rect x="${x0}" y="${y0}" width="${z}" height="${z}" rx="${z * .18}" fill="${dark ? '#24272d' : '#f6eedb'}" stroke="${dark ? '#8a8f99' : '#b8a882'}" stroke-width=".8"/>`;
  for (const [i, j] of PIPS[n]) s += `<circle cx="${x0 + z * (0.24 + i * 0.26)}" cy="${y0 + z * (0.24 + j * 0.26)}" r="${r}" fill="${dark ? '#e2c275' : '#6b2420'}"/>`;
  return s;
}
function rulesSVG0(p, o) {
  const S = 20, W = G.W * S, H = G.H * S, q = p ? p.slice() : null;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img"><rect width="${W}" height="${H}" rx="8" fill="${curSkin().mini.frame}"/>`;
  s += miniBase(S);
  if (o.homes) {
    s += `<rect x="${G.RX * S}" y="${G.MID * S}" width="${6 * S}" height="${(G.BOT - G.MID) * S}" fill="rgba(226,194,117,.22)" stroke="#e2c275" stroke-width="1.6" stroke-dasharray="4 3"/>`;
    s += `<rect x="${G.RX * S}" y="${G.TOP * S}" width="${6 * S}" height="${(G.MID - G.TOP) * S}" fill="rgba(201,204,210,.16)" stroke="#c9ccd2" stroke-width="1.6" stroke-dasharray="4 3"/>`;
  }
  if (o.nums) for (let vp = 1; vp <= 24; vp++) s += `<text x="${slotX(vp) * S}" y="${(vp >= 13 ? G.TOP - 0.1 : G.BOT + 0.42) * S}" font-size="7.5" font-family="JetBrains Mono,monospace" fill="rgba(226,194,117,.85)" text-anchor="middle">${vp}</text>`;
  const ck = (sd, x, y) => `<circle cx="${x * S}" cy="${y * S}" r="${0.45 * S}" fill="${sd ? '#202328' : '#e2c275'}" stroke="${sd ? '#c9ccd2' : '#7a5c22'}" stroke-width="1"/>`;
  const slab = (sd, k) => { const [x, y] = offXY(sd, k); return `<rect x="${(x - 0.5) * S}" y="${(y - 0.12) * S}" width="${S}" height="${0.24 * S}" rx="1.5" fill="${sd ? '#33363d' : '#e2c275'}" stroke="${sd ? '#9aa0aa' : '#7a5c22'}" stroke-width=".6"/>`; };
  if (p) for (const sd of [0, 1]) {
    for (let pt = 1; pt <= 25; pt++) { const n = p[sd * 26 + pt]; for (let k = 0; k < n; k++) { const [x, y] = ckXY(sd, pt, k, n); s += ck(sd, x, y); } }
    for (let k = 0; k < p[sd * 26]; k++) s += slab(sd, k);
  }
  // track arrows (direction of play)
  if (o.track) {
    const yT = G.TOP + 3.1, yB = G.BOT - 3.1, xL = G.LX + 0.5, xR = G.RE - 0.5, ex = G.TX + G.TW / 2;
    const gold = `M${xR * S} ${yT * S}L${xL * S} ${yT * S}Q${(xL - 0.35) * S} ${G.MID * S} ${xL * S} ${yB * S}L${(xR + 0.2) * S} ${yB * S}L${ex * S} ${(yB + 1.6) * S}`;
    const yT2 = G.TOP + 1.2, yB2 = G.BOT - 1.2;
    const blk = `M${xR * S} ${yB2 * S}L${xL * S} ${yB2 * S}Q${(xL - 0.35) * S} ${G.MID * S} ${xL * S} ${yT2 * S}L${(xR + 0.2) * S} ${yT2 * S}L${ex * S} ${(yT2 - 0.3) * S}`;
    s += `<defs><marker id="rlA0" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#ffe6a0"/></marker><marker id="rlA1" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#dfe3ea"/></marker></defs>`;
    s += `<path d="${blk}" fill="none" stroke="#dfe3ea" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="7 4" marker-end="url(#rlA1)" opacity=".9"/>`;
    s += `<path d="${gold}" fill="none" stroke="#ffe6a0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#rlA0)"/>`;
    const lab = (x, y, txt, c) => `<text x="${x * S}" y="${y * S}" font-size="10" font-weight="700" fill="${c}" text-anchor="middle" stroke="#0b1110" stroke-width="2.6" paint-order="stroke">${txt}</text>`;
    s += lab(G.RX + 3, G.MID + 1.25, t('rl.home', { c: pname(0) }), '#ffe6a0') + lab(G.RX + 3, G.MID - 0.9, t('rl.home', { c: pname(1) }), '#e6e9ee');
  }
  // checker moves, played in order on a copy: [side, from, to, kind]  (own point numbers; 25 = bar, 0 = off)
  for (const [sd, f, to, kind] of o.moves || []) {
    const b = sd * 26, nf = q[b + f];
    const [x0, y0] = ckXY(sd, f, Math.max(0, nf - 1), Math.max(1, nf));
    q[b + f]--;
    let x1, y1;
    if (to === 0) [x1, y1] = offXY(sd, q[b]);
    else { const nt = q[b + to]; [x1, y1] = ckXY(sd, to, nt, nt + 1); }
    if (kind !== 'ng') q[b + to]++;
    const col = kind === 'ng' || kind === 'hit' ? '#ff9b90' : '#ffe6a0';
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, bend = Math.min(1.4, L * 0.22);
    const cx = (x0 + x1) / 2 + dy / L * bend, cy = (y0 + y1) / 2 - dx / L * bend;
    const tx = x1 - cx, ty = y1 - cy, tl = Math.hypot(tx, ty) || 1, ux = tx / tl, uy = ty / tl, h = 0.34;
    const ex = x1 - ux * 0.32, ey = y1 - uy * 0.32;
    s += `<path d="M${x0 * S} ${y0 * S}Q${cx * S} ${cy * S} ${ex * S} ${ey * S}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round"${kind === 'hit' || kind === 'ng' ? ' stroke-dasharray="4 3"' : ''}/>`;
    s += `<path d="M${(ex - ux * h - uy * h) * S} ${(ey - uy * h + ux * h) * S}L${ex * S} ${ey * S}L${(ex - ux * h + uy * h) * S} ${(ey - uy * h - ux * h) * S}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (kind === 'ng') s += `<path d="M${(x1 - .32) * S} ${(y1 - .32) * S}L${(x1 + .32) * S} ${(y1 + .32) * S}M${(x1 + .32) * S} ${(y1 - .32) * S}L${(x1 - .32) * S} ${(y1 + .32) * S}" stroke="#ff6b5b" stroke-width="3" stroke-linecap="round"/>`;
  }
  // rings / crosses on a view point's top checker: [vp, kind]
  for (const [vp, kind] of o.marks || []) {
    const n0 = p[vp], n1 = p[26 + 25 - vp], sd = n1 ? 1 : 0, n = n0 + n1;
    const [x, y] = ckXY(sd, sd ? 25 - vp : vp, Math.max(0, n - 1), Math.max(1, n));
    if (kind === 'x') s += `<path d="M${(x - .3) * S} ${(y - .3) * S}L${(x + .3) * S} ${(y + .3) * S}M${(x + .3) * S} ${(y - .3) * S}L${(x - .3) * S} ${(y + .3) * S}" stroke="#ff6b5b" stroke-width="3" stroke-linecap="round"/>`;
    else s += `<circle cx="${x * S}" cy="${y * S}" r="${0.56 * S}" fill="none" stroke="${kind === 'ng' ? '#ff6b5b' : '#fff3cf'}" stroke-width="2.2"/>`;
  }
  // dice: [[n, dark, x?]]
  (o.dice || []).forEach((d, i, a) => { const x = d[2] !== undefined ? d[2] : G.RX + 3 + (i - (a.length - 1) / 2) * 0.95; s += rlDie(x, G.MID, d[0], d[1]); });
  if (o.extra) s += o.extra(S);
  if (o.cube) { const x = o.cube[1], z = 0.86 * S; s += `<rect x="${x * S - z / 2}" y="${G.MID * S - z / 2}" width="${z}" height="${z}" rx="${z * .16}" fill="#e2c275" stroke="${o.cube[2] ? '#fff3cf' : '#8e7440'}" stroke-width="${o.cube[2] ? 2.2 : 1}"/><text x="${x * S}" y="${G.MID * S + 4}" font-size="11" font-weight="700" font-family="JetBrains Mono,monospace" fill="#2a1e08" text-anchor="middle">${o.cube[0]}</text>`; }
  return s + '</svg>';
}
function rlMatchSVG() {
  const W = 317, H = 130;
  const disc = (x, sd) => `<circle cx="${x}" cy="52" r="17" fill="${sd ? '#202328' : '#e2c275'}" stroke="${sd ? '#c9ccd2' : '#7a5c22'}" stroke-width="1.5"/>`;
  const num = (x, n) => `<text x="${x}" y="64" font-size="32" font-weight="800" font-family="Shippori Mincho B1,serif" fill="#e8eee9" text-anchor="middle">${n}</text>`;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img"><rect width="${W}" height="${H}" rx="10" fill="${curSkin().mini.frame}"/><rect x="8" y="8" width="${W - 16}" height="${H - 16}" rx="7" fill="${curSkin().mini.felt}"/>`;
  s += `<text x="${W / 2}" y="27" font-size="12" font-weight="700" fill="#e2c275" text-anchor="middle">${t('info.match', { n: 5 })}</text>`;
  s += disc(46, 0) + num(96, 4) + `<text x="${W / 2 - 40}" y="62" font-size="22" fill="#8fa39a" text-anchor="middle">–</text>` + num(W / 2 - 4, 2) + disc(W / 2 + 34, 1);
  const cx = 262, cy = 56, z = 30;
  s += `<rect x="${cx - z / 2}" y="${cy - z / 2}" width="${z}" height="${z}" rx="5" fill="#e2c275" stroke="#8e7440"/><text x="${cx}" y="${cy + 5}" font-size="13" font-weight="700" font-family="JetBrains Mono,monospace" fill="#2a1e08" text-anchor="middle">64</text>`;
  s += `<path d="M${cx - 21} ${cy + 21}L${cx + 21} ${cy - 21}" stroke="#ff6b5b" stroke-width="4" stroke-linecap="round"/>`;
  s += `<text x="${W / 2}" y="107" font-size="11.5" fill="#cfd8d2" text-anchor="middle">${t('rl.crawLbl')}</text>`;
  return s + '</svg>';
}
// ---- hands-on rules tutorial (shared/ruletour.js): small boards where the player really moves the checkers.
// Only what is needed to play; tactics / cube strategy are in the lessons.
const RT_X = 7.1;   // bar centre (board units), where the cube sits
function rtStd(fn) { const flat = G.FLAT, fh = G.H, fu = G.U; if (flat) setGeom(false); try { return fn(); } finally { if (flat) setGeom(true, fh, fu); } }
// board units under a tap; the svg fills the fixed board box (shared/ruletour.js), so allow for letterboxing
function rtUnits(e, svg) { const r = lrect(svg), [x, y] = lp(e), k = Math.min(r.width / 15.85, r.height / 12); return [(x - r.left - (r.width - 15.85 * k) / 2) / k, (y - r.top - (r.height - 12 * k) / 2) / k]; }
function rtHit(e, svg) { const [ux, uy] = rtUnits(e, svg); return rtStd(() => hitPoint(ux, uy)); }
const rtx = k => t('rt.' + k, { c: t('ng.gold'), o: t('ng.black') });   // the rules pictures keep gold / black
// a tiny interactive turn for gold (side 0, view 0): tap a checker, then one of the marked points
function rtGame(api, cfg) {
  const dice = cfg.dice, st = { pos: cfg.pos.slice(), dice, left: dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice.slice(), used: 0, sel: null, hits: 0, fin: false };
  let svg = null;
  const steps = () => {
    if (!st.left.length) return [];
    let a = BG.legalSteps(st.pos, 0, st.left, st.dice, st.used);
    if (cfg.order) a = a.filter(x => x.die === st.left[0]);
    return a;
  };
  const from = p => steps().filter(x => x.from === p);
  const marks = S => {
    let h = '';
    if (st.sel !== null) {
      const n = st.pos[st.sel], [x, y] = ckXY(0, st.sel, n - 1, n);
      h += `<circle cx="${x * S}" cy="${y * S}" r="${0.56 * S}" fill="none" stroke="#fff3cf" stroke-width="2.4"/>`;
      for (const s of from(st.sel)) {
        if (s.to === 0) { h += `<rect x="${(G.TX + 0.05) * S}" y="${(G.MID + 0.1) * S}" width="${(G.TW - 0.1) * S}" height="${(G.BOT - G.MID - 0.15) * S}" rx="3" fill="rgba(226,194,117,.25)" stroke="#e2c275" stroke-width="2" stroke-dasharray="4 3"/>`; continue; }
        const m = st.pos[s.to], [dx, dy] = ckXY(0, s.to, m, m + 1), hit = st.pos[26 + 25 - s.to] === 1;
        h += `<circle cx="${dx * S}" cy="${dy * S}" r="${0.42 * S}" fill="${hit ? 'rgba(255,107,91,.25)' : 'rgba(226,194,117,.22)'}" stroke="${hit ? '#ff9b90' : '#ffe6a0'}" stroke-width="2" stroke-dasharray="4 3"/>`;
      }
    } else if (!st.fin) {
      const fr = new Set(steps().map(x => x.from));
      for (const p of fr) { const n = st.pos[p], [x, y] = ckXY(0, p, n - 1, n); h += `<circle cx="${x * S}" cy="${y * S}" r="${0.5 * S}" fill="none" stroke="rgba(255,243,207,.55)" stroke-width="1.6" stroke-dasharray="3 3"/>`; }
    }
    return h;
  };
  const draw = () => {
    api.board.innerHTML = rulesSVG(st.pos, Object.assign({ nums: true, dice: st.left.map(d => [d]), extra: marks }, cfg.svg || {}));
    svg = api.board.querySelector('svg');
    if (!st.fin) api.setTask(st.left.length ? `<div class="rt-msg">${esc(t('rt.left', { d: st.left.join(' · ') }))}</div>` : '');
  };
  const finish = () => { st.fin = true; st.sel = null; draw(); api.setTask(''); cfg.end(st); };
  api.board.onclick = e => {
    if (st.fin || !api.alive()) return;
    const p = rtHit(e, svg); if (p < 0) return;
    ctx();
    if (st.sel !== null) {
      const mv = from(st.sel).find(x => x.to === p);
      if (mv) {
        const code = BG.apply(st.pos, 0, mv.from, mv.to);
        if (BG.mvHit(code)) { st.hits++; SFX.hit(); } else if (mv.to === 0) SFX.off(); else SFX.clack();
        st.left.splice(st.left.indexOf(mv.die), 1); st.used++;
        st.sel = mv.to > 0 && from(mv.to).length ? mv.to : null;
        if (cfg.step) cfg.step(st, mv, code);
        if (!steps().length) { finish(); return; }
        api.say(''); draw(); return;
      }
    }
    if (p > 0 && st.pos[p] && from(p).length) { st.sel = st.sel === p ? null : p; api.say(''); draw(); return; }
    // why not?
    if (st.pos[25] && p !== 25 && st.pos[p]) api.ng(esc(rtx('barFirst')), { reset: false });
    else if (st.sel !== null && p > 0 && p < 25 && st.pos[26 + 25 - p] >= 2) api.ng(esc(rtx('blocked')), { reset: false });
    else if (p > 0 && st.pos[p]) api.ng(esc(rtx('cant')), { reset: false });
  };
  draw();
  return st;
}
const RT_PAGES = [
  { id: 'board', setup(api) {
      api.board.innerHTML = rulesSVG(RL_INIT(), { nums: true, track: true });
      const svg = api.board.querySelector('svg');
      api.board.onclick = e => {
        const p = rtHit(e, svg); if (p < 0) return;
        if (p >= 1 && p <= 6) { api.board.innerHTML = rulesSVG(RL_INIT(), { nums: true, track: true, homes: true }); api.ok(esc(rtx('board.ok'))); api.board.onclick = null; }
        else api.ng(esc(rtx('board.ng')), { reset: false });
      };
    } },
  { id: 'move', setup(api) {
      rtGame(api, { pos: RL_INIT(), dice: [3, 5], order: true, end: () => api.ok(esc(rtx('move.ok'))) });
    } },
  { id: 'dbl', setup(api) {
      rtGame(api, { pos: RL_INIT(), dice: [6, 6], end: () => api.ok(esc(rtx('dbl.ok'))) });
    } },
  { id: 'block', setup(api) {
      rtGame(api, { pos: rlPos({ 13: 2, 6: 5, 8: 3, 24: 2 }, { 9: 2, 7: 2, 12: 3, 17: 3, 19: 3 }), dice: [4, 6], end: () => api.ok(esc(rtx('block.ok'))) });
    } },
  { id: 'hit', setup(api) {
      rtGame(api, { pos: rlPos({ 13: 4, 8: 3, 6: 5, 24: 2, 4: 1 }, { 9: 1, 12: 5, 17: 3, 19: 4, 20: 2 }), dice: [4, 1],
        end: st => st.hits ? api.ok(esc(rtx('hit.ok'))) : api.ng(esc(rtx('hit.ng'))) });
    } },
  { id: 'enter', setup(api) {
      rtGame(api, { pos: rlPos({ 13: 4, 8: 3, 6: 5, 5: 2 }, { 19: 3, 21: 2, 22: 2, 23: 1, 12: 4, 17: 3 }, { gBar: 1 }), dice: [5, 3],
        end: st => st.pos[25] ? api.ng(esc(rtx('enter.ng'))) : api.ok(esc(rtx('enter.ok'))) });
    } },
  { id: 'off', setup(api) {
      const P = rlPos({ 6: 3, 5: 3, 4: 3, 3: 2, 2: 2 }, { 19: 3, 20: 3, 21: 2, 22: 2, 24: 1 }, { gOff: 2, bOff: 4 });
      rtGame(api, { pos: P, dice: [6, 4], end: st => st.pos[0] - P[0] >= 2 ? api.ok(esc(rtx('off.ok'))) : api.ng(esc(rtx('off.ng'))) });
    } },
  { id: 'win', setup(api) {
      const P = rlPos({ 3: 1, 1: 1 }, { 9: 2, 12: 3, 17: 4, 19: 3, 20: 3 }, { gOff: 13 });
      rtGame(api, { pos: P, dice: [3, 1], end: st => st.pos[0] === 15 ? api.ok(esc(rtx('win.ok'))) : api.ng(esc(rtx('win.ng'))) });
    } },
  { id: 'cube', setup(api) {
      const P = rlPos({ 13: 3, 8: 3, 6: 4, 5: 2, 4: 2, 3: 1 }, { 1: 2, 12: 3, 17: 3, 19: 4, 20: 3 });
      let done = false;
      const draw = () => { api.board.innerHTML = rulesSVG(P, done ? { cube: [2, G.LX + 3, true] } : { cube: [64, RT_X, false] }); };
      draw();
      api.board.onclick = e => {
        if (done) return;
        const [ux, uy] = rtUnits(e, api.board.querySelector('svg'));
        if (Math.abs(ux - RT_X) < 0.9 && Math.abs(uy - 6) < 0.9) { done = true; SFX.cube(); draw(); api.ok(esc(rtx('cube.ok'))); }
        else api.ng(esc(rtx('cube.ng')), { reset: false });
      };
    } },
].map(P => Object.assign({ title: () => esc(rtx(P.id + '.t')), body: () => `<p>${rtx(P.id + '.b')}</p>`, task: () => esc(rtx(P.id + '.task')) }, P));
// page 1: what the game is (history / how to win / culture), read only — common spec
if (window.RuleTour) RT_PAGES.unshift({ id: 'intro', title: () => esc(t('intro.t')), body: '', html: () => RuleTour.intro({ lang: LANG, img: '../images/atlas/backgammon.webp', origin: t('intro.origin'), players: t('intro.players'), time: t('intro.time'), history: t('intro.hist'), win: t('intro.win'), culture: t('intro.cult') }) });
const rulesTour = window.RuleTour ? RuleTour.create({
  mount: '#rulesBody', store: STORE + '-rules-v2', lang: () => LANG, pages: RT_PAGES, aspect: 15.85 / 12,
  close: () => hideOverlay('#rulesOverlay'),
  play: () => { hideOverlay('#rulesOverlay'); openNewDialog(); },
  lessons: () => { hideOverlay('#rulesOverlay'); openLessons(); },
  sound: k => SFX.chime(k === 'ok'),
}) : null;
let rulesOpened = false;
function openRules(page) { selTab('rules'); showOverlay('#rulesOverlay'); if (rulesTour) rulesTour.open(page != null ? page : rulesOpened ? rulesTour.page : 0); rulesOpened = true; }
function renderRules() { if (rulesTour) rulesTour.render(); }
$('#btnRules').onclick = () => openRules();
$('#rulesClose').onclick = () => { if (rulesTour) rulesTour.stop(); hideOverlay('#rulesOverlay'); };

// ====================================================================== lessons
let LESSONS = null;
const lessonsReady = fetch('lessons.json?v=20261021pz').then(r => r.json()).then(d => {
  LESSONS = d;
  if (d.cats) { LS_COURSES = {}; for (const c of d.cats) LS_COURSES[c.id] = c.steps; }
  return d;
}).catch(() => null);
const LS_STORE = STORE + '-lessons', PZ_STORE = STORE + '-puzzles';
function lsProgress() { try { return JSON.parse(localStorage.getItem(LS_STORE) || '{}'); } catch (e) { return {}; } }
function pzProgress() { try { return JSON.parse(localStorage.getItem(PZ_STORE) || '{}'); } catch (e) { return {}; } }
let introIdx = 0;
function selTab(v) { document.querySelectorAll('.ls-tabs').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === v))); }
document.querySelectorAll('.ls-tabs').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const inst = on => ['#lessonOverlay', '#puzzleOverlay', '#rulesOverlay'].forEach(x => $(x).classList.toggle('instant', on));
  inst(true);
  if (b.dataset.v === 'rules') { hideOverlay('#lessonOverlay'); hideOverlay('#puzzleOverlay'); openRules(); }
  else if (b.dataset.v === 'puzzle') { hideOverlay('#lessonOverlay'); hideOverlay('#rulesOverlay'); openPuzzles(); }
  else if (b.dataset.v === 'open' && window.OPH) { hideOverlay('#puzzleOverlay'); hideOverlay('#rulesOverlay'); OPH.open(); }
  else { hideOverlay('#puzzleOverlay'); hideOverlay('#rulesOverlay'); openLessons(); }
  setTimeout(() => inst(false), 150);
}));
function showLessonView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
// lesson / puzzle lists: course tabs, a banner, cards with a board picture and a short explanation (same layout as gomoku)
// list-card picture: the existing mini board (flat, no ids) plus the dice to play, in the side's own view
function bgThumb(pos, side, dice, opts) {
  const p = typeof pos === 'string' ? decPos(pos) : pos, sd = side || 0;
  let s = miniBoardSVG(p, sd, opts);
  if (dice && dice.length) { const y = G.MID, x = G.RX + 3, dark = sd === 1; s = s.replace(/<\/svg>$/, rlDie(x - .6, y, dice[0], dark, 1.05) + rlDie(x + .6, y, dice[1], dark, 1.05) + '</svg>'); }
  return s;
}
const plainText = html => String(html || '').replace(/\{fig\d\}/g, ' ').replace(/<br\s*\/?>|<\/p>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const lxBar = (p, cls) => `<span class="lx-bar ${cls || ''}"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></span>`;
// lessons in two courses: moving and fighting, then the race home and the cube
// lessons in categories (tabs): from lessons.json (v2: cats), with the old two courses as the fallback
let LS_COURSES = { basic: ['move', 'hit', 'prime', 'safe'], home: ['bearoff', 'race', 'cube'] };
const LS_ICON = { basic: '⚀', home: '⚑', rules: '⚀', opening: '⚁', middle: '⛓', safety: '⛨', race: '⚑', cube: '⧉', adv: '♛' };
const lsCourseOf = id => Object.keys(LS_COURSES).find(c => LS_COURSES[c].includes(id)) || Object.keys(LS_COURSES)[0];
let lsCourseSel = '';
function lsThumb(s) {
  const d = s.diagram || (s.figs && s.figs[0]);
  if (d) { const p = decPos(d.pos), sd = d.side || 0; return bgThumb(p, sd, null, { marks: d.marks || [], arrows: d.play ? [{ side: sd, moves: decMoves(p, sd, d.play).moves }] : [] }); }
  const P = s.problems[0]; return bgThumb(P.pos, P.side, P.dice);
}
async function openLessons(course) {
  await lessonsReady; selTab('lesson');
  if (!LESSONS) { toast(t('ls.fail')); return; }
  const pr = lsProgress(), courses = Object.keys(LS_COURSES);
  const stat = c => { const st = LESSONS.steps.filter(s => lsCourseOf(s.id) === c); return { n: st.length, ok: st.filter(s => pr[s.id] && pr[s.id].pass).length }; };
  if (course) lsCourseSel = course;
  if (!courses.includes(lsCourseSel)) lsCourseSel = courses.find(c => { const q = stat(c); return q.ok < q.n; }) || courses[0];
  const c = lsCourseSel, q = stat(c);
  const cards = LESSONS.steps.map((s, i) => {
    if (lsCourseOf(s.id) !== c) return '';
    const r = pr[s.id];
    const st = r ? (r.pass ? `<span class="lx-st ok">✓ ${t('u.pt', { n: r.best })}</span>` : `<span class="lx-st">${t('u.pt', { n: r.best })}</span>`) : `<span class="lx-st new">${t('ls.notyet')}</span>`;
    return `<button class="lx-card${r && r.pass ? ' clear' : ''}" data-i="${i}"><span class="lx-th">${lsThumb(s)}</span><span class="lx-tx">` +
      `<span class="lx-top"><span class="lx-no">STEP ${i + 1}</span>${st}</span><b class="lx-t">${t('ls.' + s.id + '.title')}</b><small class="lx-sub">${t('ls.' + s.id + '.sub')}</small>` +
      `<span class="lx-desc">${plainText(t('ls.' + s.id + '.intro'))}</span>${lxBar(r ? r.best / 100 : 0, r && r.pass ? 'ok' : '')}</span></button>`;
  }).join('');
  $('#lsDesc').textContent = t('ls.desc2', { n: LESSONS.steps.length });
  $('#lsH2').textContent = t('ls.title'); $('#lessonList').dataset.mode = 'ls'; if (window.OPH) OPH.leave();
  $('#lessonList').innerHTML = `<div class="lx">` +
    `<div class="lx-tabs${courses.length > 3 ? ' many' : ''}">${courses.map(k => { const z = stat(k); return `<button data-course="${k}" class="${k === c ? 'sel' : ''}"><span class="ic">${LS_ICON[k]}</span><span class="nm">${t('lx.c.' + k)}</span><span class="ct${z.ok === z.n ? ' ok' : ''}">${z.ok}/${z.n}</span></button>`; }).join('')}</div>` +
    `<div class="lx-banner"><span class="ic">${LS_ICON[c]}</span><span class="tx"><b>${t('lx.c.' + c)}</b><small>${t('lx.c.' + c + '.d')}</small></span><span class="pg">${t('lx.cleared', { a: q.ok, b: q.n })}${lxBar(q.ok / q.n, 'ok')}</span></div>` +
    `<div class="lx-grid">${cards}</div></div>`;
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
$('#lessonList').onclick = e => {
  if ($('#lessonList').dataset.mode === 'op') { if (window.OPH) OPH.list(e); return; }
  const tb = e.target.closest('[data-course]'); if (tb) { openLessons(tb.dataset.course); return; }
  const b = e.target.closest('.lx-card'); if (b) openIntro(+b.dataset.i);
};
function openIntro(i) {
  if (window.OPH) OPH.leave();
  introIdx = i; const s = LESSONS.steps[i];
  $('#liStep').textContent = 'STEP ' + (i + 1);
  $('#liTitle').textContent = t('ls.' + s.id + '.title');
  let dia = '';
  if (s.diagram) { const p = decPos(s.diagram.pos); const ar = s.diagram.play ? [{ side: s.diagram.side || 0, moves: decMoves(p, s.diagram.side || 0, s.diagram.play).moves }] : []; dia = miniBoardSVG(p, s.diagram.side || 0, { marks: s.diagram.marks || [], arrows: ar }); }
  let body = t('ls.' + s.id + '.intro', { c: pname(0), o: pname(1), fig0: '{fig0}', fig1: '{fig1}' });
  if (s.figs) body = body.replace(/\{fig(\d)\}/g, (_, i) => s.figs[+i] ? lsFigHTML(s.figs[+i], t('ls.' + s.id + '.cap' + i)) : '');
  else body = dia + body;
  $('#liBody').innerHTML = body;
  showLessonView('lessonIntroView');
}
$('#btnLessonBack').onclick = () => (window.OPH && OPH.isItem()) ? OPH.back() : openLessons(LESSONS.steps[introIdx] && lsCourseOf(LESSONS.steps[introIdx].id));
$('#btnLessonClose').onclick = () => hideOverlay('#lessonOverlay');
$('#btnLessonStart').onclick = () => (window.OPH && OPH.isItem()) ? OPH.start() : startLesson(introIdx);
$('#btnLessonQuit2').onclick = () => { hideOverlay('#lessonOverlay'); quitSpecial(); };
$('#btnLessonRetry').onclick = () => startLesson(lesson ? lesson.step : introIdx);
$('#btnLessonNextStep').onclick = () => { const n = (lesson ? lesson.step : introIdx) + 1; if (n < LESSONS.steps.length) openIntro(n); else { hideOverlay('#lessonOverlay'); quitSpecial(); } };
// an illustrated figure of a lesson intro: board + arrows of the play + marks / highlighted zones / labels / pip counts
function lsFigHTML(f, cap) {
  const p = decPos(f.pos), sd = f.side || 0;
  const ar = f.play ? [{ side: sd, moves: decMoves(p, sd, f.play).moves }] : [];
  let svg = miniBoardSVG(p, sd, { marks: f.marks || [], arrows: ar, zones: f.zones || [], labels: f.labels || [], pips: !!f.pips });
  if (f.dice) { const y = 6, x = 7.7 + 3, dark = sd === 1; svg = svg.replace(/<\/svg>$/, rlDie(x - .6, y, f.dice[0], dark, 1.05) + rlDie(x + .6, y, f.dice[1], dark, 1.05) + '</svg>'); }
  return `<figure class="ls-fig">${svg}${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
}
function startLesson(step) {
  hideOverlay('#lessonOverlay');
  if (lesson && lesson.op) exitSpecial();
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle'); $('#toast').classList.remove('show');
  if (G.FLAT) { scrollTo(0, 0); document.body.scrollTop = 0; }   // landscape: keep the board in view (the card is below)
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = -1; rvOpen = false;
  lesson = { step, i: 0, results: [], answered: false, side: 0 };
  document.body.classList.add('in-lesson');
  loadLessonProblem();
}
function lessonProblem() { return LESSONS.steps[lesson.step].problems[lesson.i]; }
function loadLessonProblem() {
  const P = lessonProblem();
  const p = decPos(P.pos);
  lesson.answered = false; lesson.hinted = false; lesson.side = P.side; lesson.choice = null;
  lesson.cubeQ = P.kind === 'choice' && (P.q === 'double' || P.q === 'take') ? P.q : null;
  if (P.kind === 'play') { setupProblem(p, P.side, P.dice); lesson.posOverride = null; }
  else { setupProblem(p, P.side, [1, 2]); turn = null; lesson.posOverride = p; }
  // tutorial aids on the first problem
  if (P.aid && lesson.i === 0) marks = P.aid.map(([s, pt, cls]) => ({ side: s, p: pt, cls }));
  if (P.mk) marks = P.mk.map(([s, pt, cls]) => ({ side: s, p: pt, cls: cls || 'blot' }));
  if (P.kind !== 'play') { diceLayer.innerHTML = ''; }
  render(); renderInfo(); renderLessonCard();
  if (P.kind !== 'play') { diceLayer.innerHTML = ''; setButtons([]); }
  $('#lsFb').innerHTML = '';
}
const QV = P => Object.assign({ c: pname(P.side), o: pname(1 - P.side) }, P.qv || {});
function stepTitle(s) { return t('ls.' + s.id + '.title'); }
function renderLessonCard() {
  const s = LESSONS.steps[lesson.step], n = s.problems.length, P = lessonProblem();
  $('#lsStep').textContent = t('ls.stepq', { s: lesson.step + 1, i: lesson.i + 1, n });
  $('#lsTitle').textContent = stepTitle(s);
  const goal = P.kind === 'play' ? t('ls.' + s.id + '.goal', { d: P.dice.join('-') }) : t('ls.q.' + P.q, QV(P));
  $('#lsPrompt').innerHTML = `<div class="ls-goal"><span class="pdisc p${P.side}"></span><span>${P.kind === 'play' ? t('ls.turn', { c: pname(P.side) }) + ' ' : ''}${goal}</span></div>` + (lesson.i >= 3 ? `<div style="font-size:12.5px;color:var(--brass)">${t('ls.exam')}</div>` : '');
  const ch = $('#lsChoices');
  if (P.kind === 'choice') {
    ch.innerHTML = P.opts.map((o, i) => { const [ok, on] = Array.isArray(o) ? o : [o]; return `<button data-i="${i}" ${lesson.answered ? 'disabled' : ''} class="${lesson.answered ? (i === P.ans ? 'right' : i === lesson.choice ? 'wrong' : '') : ''}">${t('ls.opt.' + ok, Object.assign(QV(P), { n: on }))}</button>`; }).join('');
  } else ch.innerHTML = '';
  $('#lsDots').innerHTML = s.problems.map((_, i) => { const r = lesson.results[i]; return `<i class="${r === undefined ? '' : r >= 16 ? 'ok' : r >= 10 ? 'mid' : 'ng'} ${i === lesson.i ? 'cur' : ''}"></i>`; }).join('');
  $('#lsNext').textContent = lesson.i + 1 < n ? t('ls.next') : t('ls.result');
  $('#lsNext').disabled = !lesson.answered;
  $('#lsHint').disabled = lesson.answered;
}
$('#lsChoices').addEventListener('click', e => {
  const b = e.target.closest('button[data-i]'); if (!b || !lesson || lesson.answered) return;
  const P = lessonProblem(), i = +b.dataset.i;
  lesson.answered = true; lesson.choice = i;
  const ok = i === P.ans, pts = ok ? (lesson.hinted ? 16 : 20) : 0;
  lesson.results[lesson.i] = pts;
  SFX.chime(ok);
  lesson.fb = { pts, ok, kind: 'choice' };
  renderLessonFb(); renderLessonCard();
});
function lessonSubmit(tt) {
  const P = lessonProblem(), s = LESSONS.steps[lesson.step];
  const k = BG.key(tt.pos);
  const plays = P.plays.map(([m, e]) => { const d = decMoves(decPos(P.pos), P.side, m); return { moves: d.moves, key: BG.key(d.pos), pos: d.pos, e }; });
  const best = plays[0].e;
  let rank = plays.findIndex(x => x.key === k);
  if (rank < 0) rank = plays.length - 1;
  const mine = plays[rank];
  // equal-equity plays share the best rank
  const effRank = plays.filter(x => x.e > mine.e + 0.004).length;
  let pts = problemPoints(plays.length, effRank);
  if (lesson.hinted && pts === 20) pts = 16;
  lesson.answered = true; lesson.results[lesson.i] = pts;
  lesson.fb = { pts, ok: pts >= 16, kind: 'play', plays, mine: rank, loss: best - mine.e };
  SFX.chime(pts >= 16);
  // show the best play (gold arrows) and the chosen one (dashed) from the start position
  turn.pos = turn.start.slice(); turn.steps = []; turn.left = [];
  extraArrows = [{ side: P.side, start: turn.start, moves: plays[0].moves, cls: 'hint' }];
  if (effRank > 0) extraArrows.push({ side: P.side, start: turn.start, moves: mine.moves, cls: 'bad' });
  render(); renderLessonFb(); renderLessonCard();
}
function renderLessonFb() {
  const P = lessonProblem(), s = LESSONS.steps[lesson.step], F = lesson.fb;
  $('#lessonCard').classList.toggle('answered', !!F);
  if (!F) { $('#lsFb').innerHTML = ''; return; }
  const lbl = F.pts === 20 ? 'fb.perfect' : F.pts >= 16 ? 'fb.good' : F.pts >= 10 ? 'fb.ng' : 'fb.bad';
  let h = `<span class="pts ${F.pts >= 16 ? 'ok' : F.pts >= 10 ? 'mid' : 'ng'}">+${t('u.pt', { n: F.pts })}</span> <b class="${F.pts >= 16 ? 'ok' : 'ng'}">${t(lbl)}</b> `;
  if (F.kind === 'play') {
    const bestN = BG.notation(F.plays[0].moves);
    if (F.pts < 20) h += t('fb.answerIs', { m: mvb(bestN) }) + ' ' + tagText(P);
    else h += whyText(P, bestN);
    h += `<div class="plays-table">${F.plays.slice(0, 4).map((x, i) => `<div class="${i === 0 ? 'best' : ''} ${i === F.mine ? 'mine' : ''}"><span>${i + 1}</span><span>${BG.notation(x.moves)}</span><span>${fmtE(x.e)}</span></div>`).join('')}${F.mine >= 4 ? `<div class="mine"><span>${F.mine + 1}</span><span>${BG.notation(F.plays[F.mine].moves)}</span><span>${fmtE(F.plays[F.mine].e)}</span></div>` : ''}</div><div style="font-size:12px;color:var(--dim);margin-top:4px">${t('fb.eqNote', { n: F.plays.length })}</div>`;
    h += lsWhyHTML(P, F);
  } else {
    const qv = QV(P); if (P.q === 'shots') qv.m = t('ls.why.shotsD', { d: (P.qv || {}).d });
    h += t('ls.why.' + (P.why || P.q), qv);
  }
  $('#lsFb').innerHTML = h;
}
// why the best play is better (computed features -> the same templates as the review), plus what kind of position it is
function lsWhyHTML(P, F) {
  if (!window.BGX || !F.plays || F.plays.length < 2) return '';
  try {
    const p = decPos(P.pos), mineBest = F.mine === 0 || F.pts === 20, alt = mineBest ? F.plays[1] : F.plays[F.mine];
    if (!alt) return '';
    const x = BGX.compare(p, P.side, F.plays[0], alt);
    const NEG = ['x.shots', 'x.shots0', 'x.win', 'x.stack', 'x.noHit', 'x.subtle'];
    const r = x.r.filter(z => !(mineBest && NEG.includes(z.k)) && z.k !== 'x.win');
    const li = r.map(z => `<li>${t(z.k, z.a)}</li>`).join('');
    return `<div class="ls-why">${li ? `<ul>${li}</ul>` : ''}<div class="sit"><b>${t('rv.sitLbl')}</b>${t(x.sit.k, x.sit.a)}</div></div>`;
  } catch (e) { return ''; }
}
function tagText(P) { return P.tags && P.tags.length ? P.tags.map(tg => t('tag.' + tg[0], { n: tg[1] })).join(' ') : ''; }
function whyText(P, bestN) {
  const s = LESSONS.steps[lesson.step];
  return t('ls.' + s.id + '.why', { m: mvb(bestN) }) + ' ' + tagText(P);
}
$('#lsHint').onclick = () => {
  if (lesson && lesson.op) { OPH.hint(); return; }
  if (!lesson || lesson.answered) return;
  lesson.hinted = true;
  const P = lessonProblem(), s = LESSONS.steps[lesson.step];
  $('#lsFb').innerHTML = t('ls.' + s.id + '.hint');
  if (P.kind === 'play' && P.plays) {
    const d = decMoves(decPos(P.pos), P.side, P.plays[0][0]);
    const froms = new Set(d.moves.map(c => BG.mvFrom(c)));
    marks = [...froms].map(f => ({ side: P.side, p: f, cls: 'far' }));
    render();
  }
};
$('#lsNext').onclick = () => {
  if (lesson && lesson.op) { OPH.next(); return; }
  if (!lesson || !lesson.answered) return;
  const s = LESSONS.steps[lesson.step];
  lesson.fb = null; extraArrows = []; marks = [];
  if (lesson.i + 1 < s.problems.length) { lesson.i++; loadLessonProblem(); return; }
  const score = lesson.results.reduce((a, b) => a + (b || 0), 0), pass = score >= 75;
  const pr = lsProgress(); const old = pr[s.id] || { best: 0, pass: false };
  pr[s.id] = { best: Math.max(old.best, score), pass: old.pass || pass };
  try { localStorage.setItem(LS_STORE, JSON.stringify(pr)); } catch (e) {}
  $('#ldTitle').textContent = pass ? t('ls.passed') : t('ls.almost');
  $('#ldSub').innerHTML = t('ls.total', { n: score }) + (pass ? '' : '<br>' + t('ls.needPass'));
  $('#btnLessonNextStep').classList.toggle('hidden', lesson.step + 1 >= LESSONS.steps.length);
  showLessonView('lessonDoneView'); showOverlay('#lessonOverlay');
  if (pass) confetti();
};
$('#lsQuit').onclick = () => quitSpecial();
$('#lsList').onclick = () => { if (!lesson) return; if (lesson.op) { OPH.toList(); return; } const id = LESSONS.steps[lesson.step].id; openLessons(lsCourseOf(id)); };

// ====================================================================== puzzles
let PUZZLES = null;
// puzzles v3: categories (tabs / cards) of stages of 10 (shared PZBook: stars, medals, unlocks). Each puzzle has an id;
// the 16 original puzzles keep their old progress keys ("L-j") as ids. Progress: PZ_STORE {id: stars (1–3) | true (old = 3)}.
const puzzlesReady = fetch('puzzles.json?v=20261021pz').then(r => r.json()).then(d => {
  if (!d.cats && d.levels) d.cats = [{ id: 'mix', puzzles: d.levels.flatMap((L, i) => L.puzzles.map((P, j) => Object.assign({ id: i + '-' + j }, P))) }];
  return (PUZZLES = d);
}).catch(() => null);
let pzCat = 0;
const pzcName = id => id === 'mix' ? t('btn.puzzle') : t('pzc.' + id), pzcText = (id, k) => id === 'mix' ? '' : t('pzc.' + id + k);
const pzStars = v => v === true ? 3 : (+v || 0);
function pzRecs(C, pr) { pr = pr || pzProgress(); return C.puzzles.map(P => pzStars(pr[P.id])); }
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
// collection layout (same as Reversi's): hero with overall progress + continue, daily card, group tabs, theme cards with a board, stage grid
const PZ_GROUPS = [['mid', ['opening', 'hit', 'point', 'prime', 'blitz']], ['def', ['safe', 'defense']], ['end', ['race', 'bearoff']], ['cube', ['cube']]];
const PZ_LAST = 'aicoding-backgammon-pz-last', PZ_GTAB = 'aicoding-backgammon-pz-tab';
const PZI = {
  mid: '<path d="M4 20 20 4M14 4h6v6"/><path d="M4 14l6 6"/>', def: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', end: '<path d="M5 21V4h13l-2.5 4L18 12H5"/>', cube: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h.01M15 15h.01M15 9h.01M9 15h.01" stroke-width="3.2"/>',
  opening: '<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/><path d="M7 7h.01M17 17h.01" stroke-width="3"/>', hit: '<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3.5 3.5M15.5 15.5 19 19M19 5l-3.5 3.5M8.5 15.5 5 19"/><circle cx="12" cy="12" r="2.4"/>',
  point: '<path d="M5 20 12 4l7 16z"/><circle cx="12" cy="16.5" r="1.8"/>', prime: '<path d="M3 20 6 6l3 14 3-14 3 14 3-14 3 14"/>', blitz: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  safe: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>', defense: '<path d="M12 3v14M7 8h10M5 13c0 4 3 7 7 7s7-3 7-7"/><circle cx="12" cy="4.5" r="1.6"/>',
  race: '<path d="M3 12h13M12 6l6 6-6 6"/><path d="M3 7h5M3 17h5"/>', bearoff: '<path d="M4 20h16M7 16h10M9 12h6M12 3v6M9.5 6.5 12 9l2.5-2.5"/>',
};
const pzSvg = k => `<svg viewBox="0 0 24 24">${PZI[k] || PZI.point}</svg>`;
const PZ_HUE = { opening: ['#6fd3a0', '#2f7d5a'], hit: ['#ff8f7a', '#9a3f2a'], point: ['#f2c060', '#8e6a26'], prime: ['#c0a0ff', '#5b3f99'], blitz: ['#ffd36b', '#8e7426'],
  safe: ['#73d9c6', '#26786b'], defense: ['#9fb8ff', '#3f5299'], race: ['#5ec6d8', '#2a6f7f'], bearoff: ['#a6dd6c', '#4d7a26'], cube: ['#ff9fd0', '#8f2a6f'], mix: ['#f2c060', '#8e6a26'] };
const PZ_DIFF = { opening: 2, hit: 2, point: 2, prime: 3, blitz: 3, safe: 3, defense: 4, race: 3, bearoff: 3, cube: 4, mix: 3 };
const pzGroupOf = id => (PZ_GROUPS.find(g => g[1].includes(id)) || PZ_GROUPS[0])[0];
function pzThumb(P) { return P.kind === 'cube' ? bgThumb(P.pos, P.side, null) : bgThumb(P.pos, P.side, P.dice); }
async function openPuzzles() {
  await puzzlesReady; selTab('puzzle');
  if (!PUZZLES) { toast(t('ls.fail')); return; }
  PZBook.setLang(LANG);
  const cats = PUZZLES.cats, recsOf = i => pzRecs(cats[i]);
  const groups = PZ_GROUPS.map(([g, ids]) => [g, cats.map((C, i) => ids.includes(C.id) ? i : -1).filter(i => i >= 0)]).filter(g => g[1].length);
  let cur = ''; try { cur = localStorage.getItem(PZ_GTAB) || ''; } catch (e) {}
  if (!groups.some(g => g[0] === cur)) cur = groups.length ? groups[0][0] : '';
  const shown = groups.length > 1 ? (groups.find(g => g[0] === cur) || groups[0])[1] : cats.map((_, i) => i);
  const cont = PZBook.resume(cats.map((C, i) => ({ key: i, recs: recsOf(i), cat: pzGroupOf(C.id) })), PZ_LAST);
  const dl = dailyPick(), di = dailyInfo();
  const box = $('#pzLevels');
  box.innerHTML = PZBook.home({
    title: t('pz.title'), lead: t('pz.desc'), all: cats.map((_, i) => recsOf(i)),
    cont: cont && { key: cont.key + ':' + cont.j, no: cont.j + 1, name: pzcName(cats[cont.key].id) },
    daily: dl ? [{ key: '1', board: pzThumb(cats[dl.c].puzzles[dl.j]), title: '★ ' + t('daily.title'), date: dl.date.slice(5).replace('-', '/'), done: di.today, go: t('daily.go'),
      sub: `${pzcName(cats[dl.c].id)} · ${PZBook.t('stage', { n: Math.floor(dl.j / PZBook.STAGE) + 1 })} · No.${dl.j + 1} · 🔥 ${t('daily.streak', { n: di.streak })}${di.best > 1 ? ' · ' + t('daily.best', { n: di.best }) : ''}` }] : [],
    cats: groups.length > 1 ? groups.map(([g, ii]) => { const r = ii.map(recsOf).flat(); return { key: g, icon: pzSvg(g), name: t('pzg.' + g), done: r.filter(x => x > 0).length, total: r.length }; }) : [],
    cur, catDesc: groups.length > 1 ? t('pzg.' + cur + '.d') : '',
    cards: shown.map(i => { const C = cats[i], r = recsOf(i), j = PZBook.nextIndex(r), P = C.puzzles[j >= 0 ? j : r.length - 1];
      return { key: String(i), board: P ? pzThumb(P) : '', badge: pzSvg(C.id), name: pzcName(C.id), desc: pzcText(C.id, '.d'), recs: r, diff: PZ_DIFF[C.id] || 3, c: PZ_HUE[C.id] }; }),
  });
  PZBook.bindHome(box, {
    cat: k => { try { localStorage.setItem(PZ_GTAB, k); } catch (e) {} openPuzzles(); },
    cont: v => { const [i, j] = v.split(':').map(Number); startPuzzle(i, j); },
    daily: () => { const d = dailyPick(); if (d) startPuzzle(d.c, d.j, d.date); },
    card: k => openPzGrid(+k),
  });
  showPzView('pzListView'); showOverlay('#puzzleOverlay');
}
function openPzGrid(i, cur) {
  pzCat = i; const C = PUZZLES.cats[i];
  PZBook.setLang(LANG);
  $('#pzLevelHead').innerHTML = PZBook.ghead({ badge: pzSvg(C.id), name: pzcName(C.id), desc: pzcText(C.id, '.long'), chips: [t('pzg.' + pzGroupOf(C.id)), PZBook.t('count', { n: C.puzzles.length })], diff: PZ_DIFF[C.id] || 3, c: PZ_HUE[C.id] });
  const g = $('#pzGrid'); g.innerHTML = PZBook.grid({ recs: pzRecs(C), cur });
  // each tile shows its position (a small board) under the number and stars
  g.querySelectorAll('.pb-tile[data-j]').forEach(el => { const P = C.puzzles[+el.dataset.j]; if (!P) return; el.insertAdjacentHTML('afterbegin', `<span class="th">${pzThumb(P)}</span>`); el.classList.add('hasth'); });
  showPzView('pzGridView'); showOverlay('#puzzleOverlay');
  const c = g.querySelector('.pb-tile.cur') || g.querySelector('.pb-tile.next'); if (c && c.offsetTop > g.parentNode.clientHeight * 0.6) c.scrollIntoView({ block: 'center' });
}
$('#pzGrid').onclick = e => {
  const b = e.target.closest('[data-j]'); if (!b) return;
  if (b.getAttribute('aria-disabled')) { toast(PZBook.t('locked')); return; }
  startPuzzle(pzCat, +b.dataset.j);
};
$('#pzBack').onclick = () => openPuzzles();
$('#pzClose').onclick = () => hideOverlay('#puzzleOverlay');
function startPuzzle(ci, j, daily, keep) {
  hideOverlay('#puzzleOverlay');
  if (lesson && lesson.op) exitSpecial();
  stashGame(); lesson = null; document.body.classList.remove('in-lesson'); $('#toast').classList.remove('show');
  if (G.FLAT && !PCW) { scrollTo(0, 0); document.body.scrollTop = 0; }
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = -1; rvOpen = false;
  const P = PUZZLES.cats[ci].puzzles[j];
  if (!daily) PZBook.lastSet(PZ_LAST, ci);
  puzzle = Object.assign({ ci, j, P, side: P.side, state: 'play', daily: daily || null, hinted: false, failed: false, answered: false, cubeQ: P.kind === 'cube' ? P.q : null, posOverride: null }, keep || {});
  document.body.classList.add('in-puzzle');
  if (P.kind === 'cube') { setupProblem(decPos(P.pos), P.side, [1, 2]); turn = null; puzzle.posOverride = decPos(P.pos); }
  else setupProblem(decPos(P.pos), P.side, P.dice);
  render(); if (P.kind === 'cube') { diceLayer.innerHTML = ''; setButtons([]); }
  renderInfo(); renderPuzzleCard();
  if (P.kind === 'cube') pzStatus(pzCubeChoices()); else pzAfterStep();
}
const pzCatId = Pz => PUZZLES.cats[Pz.ci].id;
function renderPuzzleCard() {
  const Pz = puzzle, C = PUZZLES.cats[Pz.ci];
  if (window.PZBook) PZBook.setLang(LANG);
  $('#pzStep').textContent = (Pz.daily ? `★ ${t('daily.title')} ${Pz.daily.slice(5).replace('-', '/')} · ` : '') + `${pzcName(C.id)} · ${PZBook.t('stage', { n: Math.floor(Pz.j / PZBook.STAGE) + 1 })} · No.${Pz.j + 1}`;
  $('#pzTitle').textContent = t('pz.theme.' + (Pz.P.theme || 'best'));
  const goal = Pz.P.kind === 'cube' ? t(Pz.P.q === 'take' ? 'ls.q.take' : 'ls.q.double', { c: pname(Pz.side), o: pname(1 - Pz.side) }) : t('pz.goal', { c: pname(Pz.side), d: Pz.P.dice.join('-') });
  $('#pzGoal').innerHTML = `<span class="pdisc p${Pz.side}"></span><span>${goal}</span>`;
  $('#pzNext').disabled = !!Pz.daily || Pz.j + 1 >= C.puzzles.length || !PZBook.isOpen(pzRecs(C), Pz.j + 1);
  $('#pzHint').disabled = Pz.state !== 'play'; $('#pzAnswer').disabled = Pz.state === 'answer' || Pz.state === 'solved';
  renderInfo();
}
function pzStatus(html) { $('#pzStatus').innerHTML = html; }
function pzPlays() { const P = puzzle.P, p = decPos(P.pos); return P.plays.map(([m, e]) => { const d = decMoves(p, P.side, m); return { moves: d.moves, key: BG.key(d.pos), pos: d.pos, e }; }); }
function pzTable(plays, mine) { return `<div class="plays-table">${plays.slice(0, 5).map((x, i) => `<div class="${i === 0 ? 'best' : ''} ${i === mine ? 'mine' : ''}"><span>${i + 1}</span><span>${BG.notation(x.moves)}</span><span>${fmtE(x.e)}</span></div>`).join('')}</div>`; }
// positional explanation stored with the puzzle (computed from features at generation with the 2-ply values):
// the situation (what this kind of position asks for), why the best play is right, and how it beats the tempting alternative
function pzExplainHTML(mine) {
  const P = puzzle.P; if (!P.r && !P.sit && !P.cx) return '';
  const plays = P.kind === 'cube' ? null : pzPlays();
  let h = '<div class="ls-why pz-why">';
  if (P.sit) h += `<div class="sit" style="margin:0 0 6px"><b>${t('rv.sitLbl')}</b>${t(P.sit[0], P.sit[1])}</div>`;
  if (P.cx) h += `<ul>${P.cx.map(r => `<li>${t(r[0], r[1])}</li>`).join('')}</ul>`;
  if (plays && P.r) {
    const alt = mine > 0 && mine < plays.length ? mine : (P.alt || 1), altP = plays[alt];
    const rs = (alt === (P.alt || 1) ? P.r : null);
    if (altP) h += `<div class="pz-alt">${t('pz.altIs', { m: mvb(BG.notation(altP.moves)), d: (plays[0].e - altP.e).toFixed(3) })}</div>`;
    let list = rs;
    if (!list && window.BGX) { try { list = BGX.compare(decPos(P.pos), P.side, plays[0], altP).r.map(z => [z.k, z.a]); } catch (e) { list = P.r; } }
    if (list && list.length) h += `<ul>${list.map(r => `<li class="${r[0] === 'x.win' ? 'num' : ''}">${t(r[0], r[1])}</li>`).join('')}</ul>`;
  }
  return h + '</div>';
}
// ---- puzzles v2 (common spec): a puzzle is one play (all the dice of the roll). The player keeps moving checkers
// until the whole play is made (status shows the dice still to play) and it is judged on "Confirm" as before.
// OBVIOUS MISTAKE (flagged at once, mid-play): a checker move after which none of the stored candidate plays (the
// engine's top plays for this roll, up to six) can be reached any more — however the rest of the roll is played,
// the result is worse than all of them. Illegal uses of the dice cannot happen: the board only offers legal steps.
function pzReach(q, left, used) {   // final positions reachable from a part-played turn
  const out = new Set(), seen = new Set(), side = turn.side, dice = turn.dice;
  const rec = (q, left, used) => {
    const k = BG.key(q) + left.join(''); if (seen.has(k)) return; seen.add(k);
    const st = BG.legalSteps(q, side, left, dice, used);
    if (!st.length) { out.add(BG.key(q)); return; }
    for (const x of st) { const r = q.slice(); BG.apply(r, side, x.from, x.to); const i = left.indexOf(x.die); rec(r, left.slice(0, i).concat(left.slice(i + 1)), used + 1); }
  };
  rec(q, left, used);
  return out;
}
function pzFail(html) {
  const Pz = puzzle; Pz.state = 'fail'; Pz.failed = true; SFX.chime(false);
  pzStatus(html); render(); renderPuzzleCard();
}
function pzAfterStep() {
  const Pz = puzzle; if (!Pz || !turn || Pz.state !== 'play') return;
  const plays = pzPlays().slice(0, 6), reach = pzReach(turn.pos, turn.left, turn.steps.length);
  if (turn.steps.length && !plays.some(x => reach.has(x.key))) {   // obvious mistake: fail now
    turn.locked = true;
    const steps = turn.steps.map(s => s.code);
    turn.pos = turn.start.slice(); turn.steps = []; turn.left = [];
    extraArrows = [{ side: Pz.side, start: turn.start, moves: plays[0].moves, cls: 'hint' }, { side: Pz.side, start: turn.start, moves: steps, cls: 'bad' }];
    pzFail(`<b class="ng">${PZBook.t('blunder')}</b> ${t('pz.failWhy', { m: mvb(BG.notation(plays[0].moves)), l: '>' + (plays[0].e - plays[plays.length - 1].e).toFixed(3) })}` + pzExplainHTML(-1) + pzTable(pzPlays(), -1));
    return;
  }
  const n = BG.maxUse(turn.pos, turn.side, turn.left);
  pzStatus(t('pz.start') + (n ? ` <b>${PZBook.t('movesLeft', { n })}</b>` : ''));
}
function pzSolved(extra) {
  const Pz = puzzle, C = PUZZLES.cats[Pz.ci], pr = pzProgress(), stars = PZBook.starsFor(Pz);
  const before = pzRecs(C, pr);
  pr[Pz.P.id] = Math.max(pzStars(pr[Pz.P.id]), stars); try { localStorage.setItem(PZ_STORE, JSON.stringify(pr)); } catch (e) {}
  const after = pzRecs(C, pr), ev = PZBook.events(before, after, Pz.j);
  Pz.state = 'solved';
  if (Pz.daily) dailySolved(Pz.daily, Pz.hinted || Pz.failed);
  SFX.chime(true); confetti(); if (ev.length) setTimeout(confetti, 650);
  pzStatus(`<b class="ok">${t('pz.solved')}</b> ${extra || ''}` + (Pz.daily ? `<br>🔥 ${t('daily.streak', { n: dailyInfo().streak })}` : '') + PZBook.solved({ stars, recs: after, j: Pz.j, events: ev }) + pzExplainHTML(0));
  render(); renderPuzzleCard();
}
function puzzleSubmit(tt) {
  const Pz = puzzle, plays = pzPlays(), k = BG.key(tt.pos);
  const mine = plays.findIndex(x => x.key === k);
  const ok = mine === 0 || (mine > 0 && plays[mine].e >= plays[0].e - 0.004);
  turn.locked = true;
  if (ok) { pzSolved(t('pz.solvedSub', { m: mvb(BG.notation(plays[0].moves)), g: (plays[0].e - plays[1].e).toFixed(3) }) + pzTable(plays, 0)); return; }
  const myE = mine >= 0 ? plays[mine].e : null;
  turn.pos = turn.start.slice(); turn.steps = []; turn.left = [];
  extraArrows = [{ side: Pz.side, start: turn.start, moves: plays[0].moves, cls: 'hint' }, { side: Pz.side, start: turn.start, moves: tt.steps.map(s => s.code), cls: 'bad' }];
  pzFail(`<b class="ng">${t('pz.fail')}</b> ${t('pz.failWhy', { m: mvb(BG.notation(plays[0].moves)), l: myE === null ? '>' + (plays[0].e - plays[plays.length - 1].e).toFixed(3) : (plays[0].e - myE).toFixed(3) })}` + pzExplainHTML(mine) + pzTable(plays, mine));
}
// cube puzzles: the decision buttons live in the status area
function pzCubeChoices() {
  const P = puzzle.P;
  return `<div class="choices pz-choices">${P.opts.map((o, i) => `<button data-ci="${i}">${t('ls.opt.' + o)}</button>`).join('')}</div>`;
}
$('#pzStatus').addEventListener('click', e => {
  const b = e.target.closest('button[data-ci]'); const Pz = puzzle; if (!b || !Pz || Pz.state !== 'play' || Pz.P.kind !== 'cube') return;
  const i = +b.dataset.ci, P = Pz.P;
  if (i === P.ans) pzSolved(`${t('pz.cubeAns', { a: t('ls.opt.' + P.opts[P.ans]) })}`);
  else pzFail(`<b class="ng">${t('pz.fail')}</b> ${t('pz.cubeAns', { a: t('ls.opt.' + P.opts[P.ans]) })}` + pzExplainHTML(-1));
});
$('#pzRetry').onclick = () => { if (puzzle) startPuzzle(puzzle.ci, puzzle.j, puzzle.daily, { hinted: puzzle.hinted, failed: puzzle.failed, answered: puzzle.answered }); };
$('#pzNext').onclick = () => {
  if (!puzzle) return;
  const { ci, j } = puzzle, C = PUZZLES.cats[ci];
  if (j + 1 < C.puzzles.length && PZBook.isOpen(pzRecs(C), j + 1)) startPuzzle(ci, j + 1);
};
$('#pzList').onclick = () => { if (!puzzle) return; if (puzzle.daily) openPuzzles(); else openPzGrid(puzzle.ci, puzzle.j); };
$('#pzQuit').onclick = () => quitSpecial();
$('#pzHint').onclick = () => {
  const Pz = puzzle; if (!Pz || Pz.state !== 'play') return;
  Pz.hinted = true;
  if (Pz.P.kind === 'cube') { pzStatus(t('ls.' + (Pz.P.q === 'take' ? 'takepoint' : 'racecube') + '.hint') + pzCubeChoices()); return; }
  const plays = pzPlays(); const froms = new Set(plays[0].moves.map(c => BG.mvFrom(c)));
  marks = [...froms].map(f => ({ side: Pz.side, p: f, cls: 'far' }));
  render(); pzStatus(t('pz.hintText', { n: froms.size }) + (Pz.P.sit ? ' ' + t(Pz.P.sit[0], Pz.P.sit[1]) : Pz.P.theme ? ' ' + t('pz.themeHint.' + Pz.P.theme) : ''));
};
$('#pzAnswer').onclick = async () => {
  const Pz = puzzle; if (!Pz) return;
  Pz.state = 'answer'; Pz.hinted = true; Pz.answered = true; marks = []; extraArrows = [];
  if (Pz.P.kind === 'cube') { pzStatus(`${t('pz.cubeAns', { a: t('ls.opt.' + Pz.P.opts[Pz.P.ans]) })}` + pzExplainHTML(-1)); renderPuzzleCard(); return; }
  const plays = pzPlays();
  setupProblem(decPos(Pz.P.pos), Pz.side, Pz.P.dice); render(); renderPuzzleCard();
  pzStatus(t('pz.showing'));
  await sleep(400);
  if (puzzle !== Pz) return;
  turn.locked = false;
  await playMovesAnimated(plays[0].moves);
  if (puzzle !== Pz || !turn) return;
  turn.locked = true; render();
  pzStatus(t('pz.answerDone', { m: mvb(BG.notation(plays[0].moves)) }) + pzExplainHTML(0) + pzTable(plays, -1));
  renderPuzzleCard();
};
// ---- daily puzzle
const DAILY_STORE = STORE + '-daily';
let daily = { last: '', streak: 0, best: 0, days: {} };
try { Object.assign(daily, JSON.parse(localStorage.getItem(DAILY_STORE) || '{}')); } catch (e) {}
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// a different category every day; weekdays get easier stages early in the week, the weekend the hardest
function dailyPick() {
  if (!PUZZLES || !PUZZLES.cats || !PUZZLES.cats.length) return null;
  const now = new Date(), date = ymd(now);
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
  let h = Math.imul(day, 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; h >>>= 0;
  const cats = PUZZLES.cats, c = day % cats.length, n = cats[c].puzzles.length, wd = now.getDay();
  const st = Math.max(1, Math.ceil(n / PZBook.STAGE)), stage = Math.min(st - 1, wd === 0 || wd === 6 ? st - 1 : Math.floor((wd - 1) * st / 5));
  const a = stage * PZBook.STAGE, b = Math.min(n, a + PZBook.STAGE);
  return { date, c, j: a + h % Math.max(1, b - a) };
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
updateGeom(); geomReady = true;
const hadSave = load();
applyCk();
if (window.BGTheme) { settings.skin = BGTheme.skinId(settings.skin); BGTheme.applySkin(settings.skin); }
drawBoardSvg();
// a game that was already finished when the page was saved: don't show its result (win condition) again on every visit
try { if (hadSave && match) match.games.forEach((gm, g) => { if (stateAt(g, gm.actions.length).over) gameOverShown.add(g + ':' + gm.actions.length); }); } catch (e) {}
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
try { const q = new URLSearchParams(location.search).get('lang'); if (q && SUPPORTED.includes(q)) LANG = q; } catch (e) {}
applyI18n();
$('#langSel').onchange = e => {
  LANG = e.target.value; settings.lang = LANG; save(); applyI18n();
  try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {}
  render(); renderInfo();
  if ($('#newOverlay').classList.contains('show')) segSync();
  if (lesson && lesson.op) { if (window.OPH) OPH.relang(); }
  else if (lesson) { renderLessonCard(); renderLessonFb(); }
  if (puzzle) renderPuzzleCard();
  if (window.OPH && (OPH.isList() || OPH.isItem())) { if (!(lesson && lesson.op)) OPH.relang(); }
  else if ($('#lessonOverlay').classList.contains('show')) { if (!$('#lessonListView').classList.contains('hidden')) openLessons(); else if (!$('#lessonIntroView').classList.contains('hidden')) openIntro(introIdx); }
  if ($('#puzzleOverlay').classList.contains('show')) { if (!$('#pzListView').classList.contains('hidden')) openPuzzles(); else openPzGrid(pzCat); }
  if ($('#rulesOverlay').classList.contains('show')) renderRules();
  if (window.PZBook) PZBook.setLang(LANG);
  if (HB) HB.relabel();
};
if (window.PZBook) PZBook.setLang(LANG);
// PC header bar: title left, menu (new > undo > hint > rules > lessons > puzzles) + icons right, game info in between
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnHint', '#btnRules', '#btnLesson', '#btnPuzzle'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => { try { updateGeom(); if (match) renderInfo(); } catch (e) {} });
updateGeom();
if (window.RulesOffer) RulesOffer.init({ game: 'backgammon', lang: () => LANG, open: () => openRules(0), watch: '#rulesOverlay' });
if (hadSave) { view = settings.mode === 'ai' ? humanSide : 0; cur = latestIdx(); updateCommit(); }
if (loadFromHash()) { /* shared match opened */ }
else if (!hadSave) { match = newMatch(null, settings.matchLen, settings.cube); updateCommit(); render(); renderInfo(); openNewDialog(); }
else { render(); renderInfo(); analyzeCurrent(); drive(); }
// for tests
window.__bg = {
  get match() { return match; }, get cur() { return cur; }, get turn() { return turn; }, settings, get lesson() { return lesson; }, get puzzle() { return puzzle; }, get rv() { return rv; },
  BG, startNewMatch, humanRoll, commitTurn, undoStep, viewAt, latestIdx, encodeMatch, loadText, stateAt, curState, legalNow, doStep: s => (turn && !turn.locked ? doStep(s, false) : false), runReview,
  get busy() { return thinking >= 0 || busyRolling || !!(turn && turn.locked); }, dailyPick, setSeed: s => { pendingSeed = s; },
};
