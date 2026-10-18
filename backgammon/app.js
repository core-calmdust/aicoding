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
const pname = s => t(s === 0 ? 'p0' : 'p1');
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
const settings = { mode: 'ai', color: 0, level: 6, level2: 6, matchLen: 0, cube: true, eval: true, forced: true, autoRoll: true, coach: false, anim: true, sound: true, hint: false, lang: '' };
const $ = s => document.querySelector(s);
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const anim = () => settings.anim && !reduceMotion;
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
  const w = new Worker('engine.js');
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
function ctx() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === 'suspended') actx.resume(); return actx; }
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
  tick() { if (!settings.sound) return; const a = ctx(); if (!a) return; tone(a, 880, 880, 0.08, 0.05, 'triangle'); },
  chime(win) {
    if (!settings.sound) return; const a = ctx(); if (!a) return;
    const t0 = a.currentTime + 0.05, notes = win ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [392, 349.23, 311.13, 261.63];
    notes.forEach((fr, i) => { const tt = t0 + i * (win ? 0.1 : 0.16); tone(a, fr, fr * 0.999, 0.7, 0.14, win ? 'triangle' : 'sine', tt); });
  },
};

// ====================================================================== board geometry (units)
const G = { W: 15.85, H: 12, LX: 0.5, BX: 6.5, B: 1.2, RX: 7.7, RE: 13.7, TX: 14.05, TW: 1.3, TOP: 0.5, BOT: 11.5, MID: 6, C: 0.94 };
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
function stackStep(n) { return n <= 5 ? G.C : (5 * G.C - G.C) / (n - 1); }
function slotXY(vp, k, n) {
  const st = stackStep(n);
  if (vp >= 13) return [slotX(vp), G.TOP + G.C / 2 + k * st];
  return [slotX(vp), G.BOT - G.C / 2 - k * st];
}
function barXY(s, k, n) {
  const st = n <= 4 ? G.C : (3.9 - G.C) / (n - 1), x = G.BX + G.B / 2;
  return s === view ? [x, G.MID - 1.02 - k * st] : [x, G.MID + 1.02 + k * st];
}
function offXY(s, k) {
  const x = G.TX + G.TW / 2;
  return s === view ? [x, G.BOT - 0.17 - k * 0.28 - 0.25] : [x, G.TOP + 0.17 + k * 0.28];
}
// checker position of the k-th checker (0 = bottom of the stack) of side s on its point p, with n checkers there
function ckXY(s, p, k, n) { if (p === 25) return barXY(s, k, n); return slotXY(toV(s, p), k, n); }
const U = v => `calc(var(--u) * ${+v.toFixed(4)})`;

// static board drawing (SVG, 100 user units per board unit)
function drawBoardSvg() {
  const S = 100, w = G.W * S, h = G.H * S;
  let s = `<defs>
    <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a2416"/><stop offset=".45" stop-color="#24150c"/><stop offset="1" stop-color="#3b2517"/></linearGradient>
    <pattern id="grainP" width="400" height="60" patternUnits="userSpaceOnUse"><path d="M0 12 Q100 2 200 14 T400 10 M0 34 Q120 26 220 38 T400 32 M0 52 Q90 46 200 55 T400 50" stroke="rgba(255,220,170,.05)" stroke-width="3" fill="none"/></pattern>
    <radialGradient id="felt" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="#1d6a4b"/><stop offset=".65" stop-color="#145238"/><stop offset="1" stop-color="#0b3424"/></radialGradient>
    <linearGradient id="ivory" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe5cc"/><stop offset="1" stop-color="#c8b994"/></linearGradient>
    <linearGradient id="ivoryB" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#efe5cc"/><stop offset="1" stop-color="#c8b994"/></linearGradient>
    <linearGradient id="ox" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a2a24"/><stop offset="1" stop-color="#4a1612"/></linearGradient>
    <linearGradient id="oxB" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7a2a24"/><stop offset="1" stop-color="#4a1612"/></linearGradient>
    <linearGradient id="brassG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0d68f"/><stop offset=".5" stop-color="#b8934e"/><stop offset="1" stop-color="#e2c275"/></linearGradient>
    <linearGradient id="barG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1f130a"/><stop offset=".5" stop-color="#3a2416"/><stop offset="1" stop-color="#1f130a"/></linearGradient>
    <linearGradient id="trayG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#08251a"/><stop offset=".5" stop-color="#0d2f21"/><stop offset="1" stop-color="#08251a"/></linearGradient>
    <filter id="nz" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <filter id="ptShadow"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".35"/></filter>
  </defs>`;
  s += `<rect x="0" y="0" width="${w}" height="${h}" rx="28" fill="url(#wood)"/><rect x="0" y="0" width="${w}" height="${h}" rx="28" fill="url(#grainP)"/>`;
  const half = (x0) => {
    let r = `<rect x="${x0 * S}" y="${G.TOP * S}" width="${6 * S}" height="${(G.BOT - G.TOP) * S}" fill="url(#felt)"/>`;
    r += `<rect x="${x0 * S}" y="${G.TOP * S}" width="${6 * S}" height="${(G.BOT - G.TOP) * S}" fill="#fff" filter="url(#nz)" opacity=".9"/>`;
    for (let i = 0; i < 6; i++) {
      const x = (x0 + i) * S, a = (i % 2 === 0);
      r += `<path d="M${x + 4} ${G.TOP * S} L${x + S - 4} ${G.TOP * S} L${x + S / 2} ${(G.TOP + 4.6) * S} Z" fill="url(#${a ? 'ivory' : 'ox'})" filter="url(#ptShadow)"/>`;
      r += `<path d="M${x + 4} ${G.BOT * S} L${x + S - 4} ${G.BOT * S} L${x + S / 2} ${(G.BOT - 4.6) * S} Z" fill="url(#${a ? 'oxB' : 'ivoryB'})" filter="url(#ptShadow)"/>`;
    }
    r += `<rect x="${x0 * S}" y="${G.TOP * S}" width="${6 * S}" height="${(G.BOT - G.TOP) * S}" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="6"/>`;
    return r;
  };
  s += half(G.LX) + half(G.RX);
  // bar
  s += `<rect x="${G.BX * S}" y="${G.TOP * S - 12}" width="${G.B * S}" height="${(G.BOT - G.TOP) * S + 24}" fill="url(#barG)"/>`;
  s += `<rect x="${(G.BX + G.B / 2) * S - 2}" y="${G.TOP * S}" width="4" height="${(G.BOT - G.TOP) * S}" fill="rgba(201,169,97,.25)"/>`;
  // tray
  s += `<rect x="${G.TX * S}" y="${G.TOP * S}" width="${G.TW * S}" height="${(G.BOT - G.TOP) * S}" rx="14" fill="url(#trayG)" stroke="rgba(0,0,0,.5)" stroke-width="6"/>`;
  s += `<line x1="${(G.TX + 0.15) * S}" x2="${(G.TX + G.TW - 0.15) * S}" y1="${G.MID * S}" y2="${G.MID * S}" stroke="rgba(201,169,97,.28)" stroke-width="3"/>`;
  // brass inlay lines
  const inl = (x, y, ww, hh) => `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" rx="10" fill="none" stroke="url(#brassG)" stroke-width="3.2" opacity=".85"/>`;
  s += inl(G.LX * S - 9, G.TOP * S - 9, (G.RE - G.LX) * S + 18, (G.BOT - G.TOP) * S + 18);
  s += inl(G.TX * S - 9, G.TOP * S - 9, G.TW * S + 18, (G.BOT - G.TOP) * S + 18);
  // brass corner studs
  for (const [cx, cy] of [[24, 24], [w - 24, 24], [24, h - 24], [w - 24, h - 24]]) s += `<circle cx="${cx}" cy="${cy}" r="9" fill="url(#brassG)" stroke="rgba(0,0,0,.4)" stroke-width="2"/>`;
  // hinge marks on the bar
  for (const y of [G.TOP + 1.2, G.BOT - 1.2]) s += `<rect x="${(G.BX + 0.32) * S}" y="${y * S - 22}" width="${(G.B - 0.64) * S}" height="44" rx="6" fill="url(#brassG)" opacity=".75"/>`;
  $('#boardSvg').innerHTML = s;
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
          if (n > 5 || (pt === 25 && n > 1)) el.innerHTML = `<b>${n}</b>`;
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
  if (lesson && lesson.cubeQ) {   // cube lessons: centred cube, or a pending double by the opponent
    x = G.BX + G.B / 2; y = G.MID; txt = '64'; cls = 'cube';
    if (lesson.cubeQ === 'take') { x = lesson.side === view ? G.LX + 3 : G.RX + 3; txt = '2'; cls += ' offer'; }
  }
  cubeEl.className = cls; cubeEl.textContent = txt;
  cubeEl.style.left = U(x); cubeEl.style.top = U(y);
  cubeEl.style.display = (match && match.cube && !lesson && !puzzle) || (lesson && lesson.cubeQ) ? '' : 'none';
}
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function dieHTML(s, v, x, y, used, size) {
  const on = new Set(PIPS[v] || []);
  let h = `<div class="die p${s}${used ? ' used' : ''}" style="left:${U(x)};top:${U(y)};${size ? `--ds:${size}` : ''}">`;
  for (let i = 0; i < 9; i++) h += `<i class="${on.has(i) ? 'on' : ''}"></i>`;
  return h + '</div>';
}
// dice of side s: values, which are used
function diceLayout(s, dice, usedCount) {
  const cx = s === view ? G.RX + 3 : G.LX + 3, y = G.MID;
  if (dice[0] === dice[1]) {
    let h = ''; const xs = [-1.38, -0.46, 0.46, 1.38];
    for (let i = 0; i < 4; i++) h += dieHTML(s, dice[0], cx + xs[i], y, i < usedCount, 0.74);
    return h;
  }
  return null;
}
function renderDice(s, dice, used) {
  // used: array of booleans per die (non-double) or count (double)
  if (!dice) { diceLayer.innerHTML = ''; return; }
  const cx = s === view ? G.RX + 3 : G.LX + 3, y = G.MID;
  if (dice[0] === dice[1]) { diceLayer.innerHTML = diceLayout(s, dice, used || 0); return; }
  const u = used || [false, false];
  diceLayer.innerHTML = dieHTML(s, dice[0], cx - 0.55, y, u[0]) + dieHTML(s, dice[1], cx + 0.55, y, u[1]);
}
async function rollAnim(s, dice, opening) {
  SFX.dice();
  if (!anim()) { return; }
  const cx = s === view ? G.RX + 3 : G.LX + 3;
  const t0 = performance.now(), dur = 560;
  while (performance.now() - t0 < dur) {
    const f = (performance.now() - t0) / dur;
    const r1 = 1 + Math.floor(Math.random() * 6), r2 = 1 + Math.floor(Math.random() * 6);
    if (opening) diceLayer.innerHTML = dieHTML(0, r1, (0 === view ? G.RX + 3 : G.LX + 3) + (Math.random() - .5) * .2, G.MID + (Math.random() - .5) * .2) + dieHTML(1, r2, (1 === view ? G.RX + 3 : G.LX + 3) + (Math.random() - .5) * .2, G.MID + (Math.random() - .5) * .2);
    else diceLayer.innerHTML = dieHTML(s, r1, cx - 0.55 + (1 - f) * 1.2 + (Math.random() - .5) * .25, G.MID + (Math.random() - .5) * .5 * (1 - f)) + dieHTML(s, r2, cx + 0.55 + (1 - f) * 1.6 + (Math.random() - .5) * .25, G.MID + (Math.random() - .5) * .5 * (1 - f));
    diceLayer.querySelectorAll('.die').forEach(d => { d.style.transform = `rotate(${(Math.random() - .5) * 60 * (1 - f)}deg)`; });
    await sleep(55);
  }
}

// ====================================================================== render
function lastMap(st) {
  const m = new Map();
  if (st.lastMoves && st.lastSide >= 0) for (const c of st.lastMoves) { const to = BG.mvTo(c); if (to >= 1) m.set(st.lastSide * 100 + to, 1); }
  return m;
}
let selected = null;     // {s, p}
function render() {
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
  // dice
  if (turn && isLatest() && !reviewing) renderTurnDice();
  else if (st.dice && st.lastSide >= 0 && !st.over && !st.offered) renderDice(st.lastSide, st.dice, st.dice[0] === st.dice[1] ? 4 : [true, true]);
  else diceLayer.innerHTML = '';
  if (st.dice && !turn && diceLayer.innerHTML && !reviewing) diceLayer.querySelectorAll('.die').forEach(d => d.classList.add('used'));
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
  return true;
}
function commitTurn() {
  if (!turn) return;
  if (legalNow().length) return;
  const moves = turn.steps.map(s => s.code);
  // safety: the result must be one of the legal plays
  const k = BG.key(turn.pos);
  if (!turn.plays.some(x => BG.key(x.pos) === k)) { console.warn('illegal play rejected'); return; }
  if (lesson) { lessonSubmit(turn); return; }
  if (puzzle) { puzzleSubmit(turn); return; }
  const tt = turn; turn = null; selected = null;
  pushAction({ t: 'r', d: tt.dice, m: moves });
  if (settings.coach && !isAI(tt.side) && settings.mode !== 'watch' && tt.plays.length > 1) coachRate(tt, moves);
}
// ---- pointer interaction
function unitXY(e) { const r = frameEl.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * G.W, (e.clientY - r.top) / r.height * G.H]; }
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
    drag = { s, p, el, x: e.clientX, y: e.clientY, moved: false, pid: e.pointerId, wasSel: selected && selected.p === p };
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
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
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
    diceLayer.innerHTML = dieHTML(0, dice[0], 0 === view ? G.RX + 3 : G.LX + 3, G.MID) + dieHTML(1, dice[1], 1 === view ? G.RX + 3 : G.LX + 3, G.MID);
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

// ====================================================================== info panel
function renderInfo() {
  if (!match) return;
  const st = shownState(), [g, a] = curGA(), gm = match.games[g];
  const sc = gm.start;
  for (const s of [0, 1]) {
    const nm = playerName(s);
    $('#name' + s).textContent = nm ? nm + ' · ' + pname(s) : pname(s);
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
    <path d="${area}" fill="rgba(229,195,108,.45)" clip-path="url(#ctop)"/>
    <path d="${area}" fill="rgba(120,126,138,.45)" clip-path="url(#cbot)"/>
    <line class="zero" vector-effect="non-scaling-stroke" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"/>
    ${seps.map(i => `<line class="sep" vector-effect="non-scaling-stroke" x1="${i / (n - 1) * W}" x2="${i / (n - 1) * W}" y1="0" y2="${H}"/>`).join('')}
    <path d="${path}" fill="none" stroke="rgba(240,230,200,.85)" stroke-width="1.4" vector-effect="non-scaling-stroke"/>
    <line class="cur" x1="${cx}" x2="${cx}" y1="0" y2="${H}" vector-effect="non-scaling-stroke"/>`;
}
(() => {
  const g = $('#graph'); let dragging = false;
  const idxAt = x => { const r = g.getBoundingClientRect(), n = Math.max(timeline().length, 30); return Math.max(0, Math.min(latestIdx(), Math.round((x - r.left) / r.width * (n - 1)))); };
  const go = x => { const i = idxAt(x); if (i !== cur) viewAt(i); };
  g.addEventListener('pointerdown', e => { if (lesson || puzzle || !match) return; dragging = true; try { g.setPointerCapture(e.pointerId); } catch (_) {} go(e.clientX); e.preventDefault(); });
  g.addEventListener('pointermove', e => { if (dragging) go(e.clientX); });
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
    c.style.left = Math.random() * 100 + 'vw'; c.style.background = cols[i % cols.length];
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
  document.querySelectorAll('#segColor button').forEach(b => b.classList.toggle('sel', +b.dataset.v === draft.color));
  document.querySelectorAll('#segMatch button').forEach(b => b.classList.toggle('sel', +b.dataset.v === draft.matchLen));
  const m = draft.mode, game = m === 'ai' || m === 'pvp' || m === 'watch';
  $('#fColor').classList.toggle('hidden', m !== 'ai');
  $('#fLevel').classList.toggle('hidden', !(m === 'ai' || m === 'watch'));
  $('#fLevel2').classList.toggle('hidden', m !== 'watch');
  $('#fDisplay').classList.toggle('hidden', !game);
  $('#fMatch').classList.toggle('hidden', !game);
  $('#fSeed').classList.toggle('hidden', !game);
  $('#fInfo').classList.toggle('hidden', game);
  $('#fInfoText').textContent = m === 'lesson' ? t('ls.desc') : m === 'puzzle' ? t('pz.desc') : '';
  $('#btnStart').textContent = m === 'lesson' ? t('ng.toLessons') : m === 'puzzle' ? t('ng.toPuzzles') : t('start');
  $('#levelLabel').textContent = m === 'watch' ? t('ng.level1') : t('ng.level');
  $('#levelRange').value = draft.level; $('#levelName').innerHTML = levelLabelHTML(draft.level);
  $('#levelRange2').value = draft.level2; $('#levelName2').innerHTML = levelLabelHTML(draft.level2);
}
function openNewDialog() {
  draft = { mode: lesson ? 'lesson' : puzzle ? 'puzzle' : settings.mode, color: settings.color, level: settings.level, level2: settings.level2, matchLen: settings.matchLen };
  $('#optCube').checked = settings.cube; $('#optEval').checked = settings.eval; $('#optForced').checked = settings.forced;
  $('#optRoll').checked = settings.autoRoll; $('#optCoach').checked = settings.coach; $('#optAnim').checked = settings.anim;
  $('#seedInput').value = '';
  segSync(); showOverlay('#newOverlay');
}
$('#segMode').onclick = e => { const b = e.target.closest('button'); if (b) { draft.mode = b.dataset.v; segSync(); } };
$('#segColor').onclick = e => { const b = e.target.closest('button'); if (b) { draft.color = +b.dataset.v; segSync(); } };
$('#segMatch').onclick = e => { const b = e.target.closest('button'); if (b) { draft.matchLen = +b.dataset.v; segSync(); } };
$('#levelRange').oninput = e => { draft.level = +e.target.value; segSync(); };
$('#levelRange2').oninput = e => { draft.level2 = +e.target.value; segSync(); };
$('#btnCancelNew').onclick = () => hideOverlay('#newOverlay');
$('#btnStart').onclick = () => {
  hideOverlay('#newOverlay');
  if (draft.mode === 'lesson') { openLessons(); return; }
  if (draft.mode === 'puzzle') { openPuzzles(); return; }
  exitSpecial();
  Object.assign(settings, { mode: draft.mode, color: draft.color, level: draft.level, level2: draft.level2, matchLen: draft.matchLen,
    cube: $('#optCube').checked, eval: $('#optEval').checked, forced: $('#optForced').checked, autoRoll: $('#optRoll').checked, coach: $('#optCoach').checked, anim: $('#optAnim').checked });
  pendingSeed = $('#seedInput').value;
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
        if (plays.length > 1) jobs.push({ kind: 'play', g, i, side: s, msg: { type: 'analyze', pos: st.pos, side: s, dice: a.d, ply: 1, keep: 6, max: 3, played: BG.key(after), time: 2500 } });
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
        item = { kind: 'play', side: j.side, loss, best: res.list[0].moves, played: res.played.moves, isBest: res.list[0].key === res.played.key };
      } else if (res.cube) {
        const c = res.cube, norm = c.mode === 'money' ? j.cube : 1;
        let loss = 0, bestTxt = '';
        if (j.kind === 'nodouble') { loss = c.double ? Math.max(0, Math.min(c.dt, c.dp) - c.nd) / norm : 0; bestTxt = c.double ? t('rv.shouldDouble') : ''; }
        else if (j.kind === 'double') { loss = !c.double ? Math.max(0, c.nd - Math.min(c.dt, c.dp)) / norm : 0; bestTxt = t('rv.noDouble'); }
        else if (j.kind === 'take') { loss = !c.take ? Math.max(0, c.dt - c.dp) / norm : 0; bestTxt = t('hint.pass'); }
        else if (j.kind === 'pass') { loss = c.take ? Math.max(0, c.dp - c.dt) / norm : 0; bestTxt = t('hint.take'); }
        item = { kind: 'cube', sub: j.kind, side: j.side, loss, isBest: loss < 0.002, bestTxt };
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
function revealReview() { if (matchMedia('(max-aspect-ratio: 1/1) and (pointer: coarse)').matches) setTimeout(() => $('#reviewCard').scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60); }
function rvJudgeAt(g, i) { if (!rv || rv.running || !rvOpen || rv.sig !== rvSig()) return null; return rv.items.get(g + ':' + i) || null; }
function sideLabel(s) { return settings.mode === 'ai' ? (s === humanSide ? t('you') : 'AI') : pname(s); }
function renderReview() {
  const card = $('#reviewCard');
  if (rv && !lesson && !puzzle && rv.sig !== rvSig() && !rv.running) { rv = null; rvOpen = false; }
  const show = !lesson && !puzzle && rvOpen && rv;
  card.classList.toggle('show', !!show);
  if (!show) return;
  let html;
  if (rv.running) {
    html = `<div style="font-size:12px;color:var(--muted)">${t('rv.running', { a: rv.done, b: rv.total })}</div><div class="rv-prog"><i style="width:${rv.total ? rv.done / rv.total * 100 : 0}%"></i></div>`;
  } else {
    const st = { 0: { n: 0, best: 0, bad: 0, dubious: 0, loss: 0 }, 1: { n: 0, best: 0, bad: 0, dubious: 0, loss: 0 } };
    for (const it of rv.all || []) {
      const s = st[it.side];
      if (it.kind === 'play') { s.n++; if (it.isBest) s.best++; }
      s.loss += it.loss;
    }
    const list = [];
    for (const [key, it] of rv.items) { const [g, i] = key.split(':').map(Number); if (it.q) { st[it.side][it.q]++; list.push({ g, i, ...it }); } }
    const row = s => { const x = st[s], pr = x.n ? (x.loss / x.n * 500) : 0; return `<span class="who"><span class="pdisc p${s}"></span>${sideLabel(s)}</span><span><b>${x.n ? Math.round(x.best / x.n * 100) : 0}%</b></span><span><b>${pr.toFixed(1)}</b></span><span class="rv-chips"><span class="bad">${t('q.bad')} ${x.bad}</span><span class="dubious">${t('q.dubious')} ${x.dubious}</span></span>`; };
    html = `<div class="rv-sum"><span></span><span class="h">${t('rv.acc')}</span><span class="h" title="${t('rv.prTitle')}">PR</span><span></span>${row(0)}${row(1)}</div>`;
    const shown = list.length > 12 ? list.slice().sort((a, b) => b.loss - a.loss).slice(0, 12).sort((a, b) => a.g - b.g || a.i - b.i) : list;
    const curKey = curGA().join(':');
    if (shown.length) html += `<div class="rv-list">${shown.map(x => {
      const lbl = x.kind === 'play' ? `${match.games[x.g].actions[x.i].d.join('')} ${BG.notation(x.played)} → ${BG.notation(x.best)}` : `${t('rv.cube.' + x.sub)} → ${x.bestTxt}`;
      return `<button data-g="${x.g}" data-i="${x.i}" class="${curKey === x.g + ':' + x.i ? 'cur' : ''}"><span class="tag ${x.q}">${t('q.' + x.q)}</span><span class="mv">${match.games.length > 1 ? 'G' + (x.g + 1) + ' ' : ''}<i class="p${x.side}"></i>${lbl}</span><span class="ls">−${x.loss.toFixed(3)}</span></button>`;
    }).join('')}</div>`;
    else html += `<div class="rv-note" style="color:#8fe3b8">${t('rv.clean')}</div>`;
    html += `<div class="rv-note" style="color:var(--dim);font-size:11px">${t('rv.note')}</div>`;
  }
  $('#rvBody').innerHTML = html;
}
$('#rvBody').addEventListener('click', e => {
  const b = e.target.closest('button[data-g]'); if (!b) return;
  const g = +b.dataset.g, i = +b.dataset.i;
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
$('#rvClose').onclick = () => { rvOpen = false; if (rv && rv.running) rvCancel(); extraArrows = []; renderReview(); renderArrows(); renderKifu(); };
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
  const OUTSIDE = { newOverlay: '#btnCancelNew', resultOverlay: '#btnReview', pasteOverlay: '#pasteCancel', puzzleOverlay: '#pzClose', resumeOverlay: '#rsCancel' };
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
  lesson = null; puzzle = null; marks = []; extraArrows = []; previewPlay = null; turn = null;
  document.body.classList.remove('in-lesson', 'in-puzzle');
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
function miniBoardSVG(p, side, opts) {
  opts = opts || {};
  const S = 20, W = 15.85 * S, H = 12 * S;
  let s = `<svg class="mini" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" rx="8" fill="#2b1a10"/>`;
  for (const x0 of [G.LX, G.RX]) {
    s += `<rect x="${x0 * S}" y="${G.TOP * S}" width="${6 * S}" height="${11 * S}" fill="#17573f"/>`;
    for (let i = 0; i < 6; i++) { const x = (x0 + i) * S; s += `<path d="M${x + 1} ${G.TOP * S}L${x + S - 1} ${G.TOP * S}L${x + S / 2} ${(G.TOP + 4.6) * S}Z" fill="${i % 2 ? '#6b2420' : '#e6dbc2'}"/><path d="M${x + 1} ${G.BOT * S}L${x + S - 1} ${G.BOT * S}L${x + S / 2} ${(G.BOT - 4.6) * S}Z" fill="${i % 2 ? '#e6dbc2' : '#6b2420'}"/>`; }
  }
  s += `<rect x="${G.TX * S}" y="${G.TOP * S}" width="${G.TW * S}" height="${11 * S}" rx="3" fill="#0d2f21"/>`;
  const v0 = view; view = side;
  if (p) for (const sd of [0, 1]) for (let pt = 1; pt <= 25; pt++) { const n = p[sd * 26 + pt]; for (let k = 0; k < n; k++) { const [x, y] = ckXY(sd, pt, k, n); s += `<circle cx="${x * S}" cy="${y * S}" r="${0.45 * S}" fill="${sd ? '#202328' : '#e2c275'}" stroke="${sd ? '#c9ccd2' : '#7a5c22'}" stroke-width="1"/>`; } }
  for (const mk of opts.marks || []) { const n = p[mk[0] * 26 + mk[1]]; const [x, y] = ckXY(mk[0], mk[1], Math.max(0, n - 1), Math.max(1, n)); s += `<circle cx="${x * S}" cy="${y * S}" r="${0.5 * S}" fill="none" stroke="${mk[2] || '#fff3cf'}" stroke-width="2.4" stroke-dasharray="${mk[3] ? '4 3' : ''}"/>`; }
  for (const ar of opts.arrows || []) {
    const q = p.slice(); for (const c of ar.moves) { const f = BG.mvFrom(c), to = BG.mvTo(c); const nf = q[ar.side * 26 + f]; const [x0, y0] = ckXY(ar.side, f, nf - 1, nf); BG.apply(q, ar.side, f, to); const n = to ? q[ar.side * 26 + to] : 1; const [x1, y1] = to ? ckXY(ar.side, to, n - 1, n) : [G.TX + .65, G.MID]; s += `<line x1="${x0 * S}" y1="${y0 * S}" x2="${x1 * S}" y2="${y1 * S}" stroke="#ffe6a0" stroke-width="2.4" stroke-linecap="round"/><circle cx="${x1 * S}" cy="${y1 * S}" r="3" fill="#ffe6a0"/>`; }
  }
  view = v0;
  return s + '</svg>';
}

// ====================================================================== lessons
let LESSONS = null;
const lessonsReady = fetch('lessons.json').then(r => r.json()).then(d => (LESSONS = d)).catch(() => null);
const LS_STORE = STORE + '-lessons', PZ_STORE = STORE + '-puzzles';
function lsProgress() { try { return JSON.parse(localStorage.getItem(LS_STORE) || '{}'); } catch (e) { return {}; } }
function pzProgress() { try { return JSON.parse(localStorage.getItem(PZ_STORE) || '{}'); } catch (e) { return {}; } }
let introIdx = 0;
function selTab(v) { document.querySelectorAll('.ls-tabs').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === v))); }
document.querySelectorAll('.ls-tabs').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const inst = on => ['#lessonOverlay', '#puzzleOverlay'].forEach(x => $(x).classList.toggle('instant', on));
  inst(true);
  if (b.dataset.v === 'puzzle') { hideOverlay('#lessonOverlay'); openPuzzles(); }
  else { hideOverlay('#puzzleOverlay'); openLessons(); }
  setTimeout(() => inst(false), 150);
}));
function showLessonView(v) { ['lessonListView', 'lessonIntroView', 'lessonDoneView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
async function openLessons() {
  await lessonsReady; selTab('lesson');
  if (!LESSONS) { toast(t('ls.fail')); return; }
  const pr = lsProgress();
  $('#lessonList').innerHTML = LESSONS.steps.map((s, i) => {
    const r = pr[s.id];
    return `<button class="lesson-item" data-i="${i}"><span class="no">${i + 1}</span><span class="tx"><b>${t('ls.' + s.id + '.title')}</b><small>${t('ls.' + s.id + '.sub')}</small></span><span class="st ${r && r.pass ? 'clear' : ''}">${r ? (r.pass ? t('ls.passed') + '<br>' : '') + t('u.pt', { n: r.best }) : t('ls.notyet')}</span></button>`;
  }).join('');
  showLessonView('lessonListView'); showOverlay('#lessonOverlay');
}
$('#lessonList').onclick = e => { const b = e.target.closest('.lesson-item'); if (b) openIntro(+b.dataset.i); };
function openIntro(i) {
  introIdx = i; const s = LESSONS.steps[i];
  $('#liStep').textContent = 'STEP ' + (i + 1);
  $('#liTitle').textContent = t('ls.' + s.id + '.title');
  let dia = '';
  if (s.diagram) { const p = decPos(s.diagram.pos); const ar = s.diagram.play ? [{ side: s.diagram.side || 0, moves: decMoves(p, s.diagram.side || 0, s.diagram.play).moves }] : []; dia = miniBoardSVG(p, s.diagram.side || 0, { marks: s.diagram.marks || [], arrows: ar }); }
  $('#liBody').innerHTML = dia + t('ls.' + s.id + '.intro');
  showLessonView('lessonIntroView');
}
$('#btnLessonBack').onclick = () => openLessons();
$('#btnLessonClose').onclick = () => hideOverlay('#lessonOverlay');
$('#btnLessonStart').onclick = () => startLesson(introIdx);
$('#btnLessonQuit2').onclick = () => { hideOverlay('#lessonOverlay'); quitSpecial(); };
$('#btnLessonRetry').onclick = () => startLesson(lesson ? lesson.step : introIdx);
$('#btnLessonNextStep').onclick = () => { const n = (lesson ? lesson.step : introIdx) + 1; if (n < LESSONS.steps.length) openIntro(n); else { hideOverlay('#lessonOverlay'); quitSpecial(); } };
function startLesson(step) {
  hideOverlay('#lessonOverlay');
  stashGame(); puzzle = null; document.body.classList.remove('in-puzzle'); $('#toast').classList.remove('show');
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
  const plays = P.plays.map(([m, e]) => { const d = decMoves(decPos(P.pos), P.side, m); return { moves: d.moves, key: BG.key(d.pos), e }; });
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
  if (!F) { $('#lsFb').innerHTML = ''; return; }
  const lbl = F.pts === 20 ? 'fb.perfect' : F.pts >= 16 ? 'fb.good' : F.pts >= 10 ? 'fb.ng' : 'fb.bad';
  let h = `<span class="pts ${F.pts >= 16 ? 'ok' : F.pts >= 10 ? 'mid' : 'ng'}">+${t('u.pt', { n: F.pts })}</span> <b class="${F.pts >= 16 ? 'ok' : 'ng'}">${t(lbl)}</b> `;
  if (F.kind === 'play') {
    const bestN = BG.notation(F.plays[0].moves);
    if (F.pts < 20) h += t('fb.answerIs', { m: mvb(bestN) }) + ' ' + tagText(P);
    else h += whyText(P, bestN);
    h += `<div class="plays-table">${F.plays.slice(0, 4).map((x, i) => `<div class="${i === 0 ? 'best' : ''} ${i === F.mine ? 'mine' : ''}"><span>${i + 1}</span><span>${BG.notation(x.moves)}</span><span>${fmtE(x.e)}</span></div>`).join('')}${F.mine >= 4 ? `<div class="mine"><span>${F.mine + 1}</span><span>${BG.notation(F.plays[F.mine].moves)}</span><span>${fmtE(F.plays[F.mine].e)}</span></div>` : ''}</div><div style="font-size:12px;color:var(--dim);margin-top:4px">${t('fb.eqNote', { n: F.plays.length })}</div>`;
  } else {
    h += t('ls.why.' + (P.why || P.q), QV(P));
  }
  $('#lsFb').innerHTML = h;
}
function tagText(P) { return P.tags && P.tags.length ? P.tags.map(tg => t('tag.' + tg[0], { n: tg[1] })).join(' ') : ''; }
function whyText(P, bestN) {
  const s = LESSONS.steps[lesson.step];
  return t('ls.' + s.id + '.why', { m: mvb(bestN) }) + ' ' + tagText(P);
}
$('#lsHint').onclick = () => {
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

// ====================================================================== puzzles
let PUZZLES = null;
const puzzlesReady = fetch('puzzles.json').then(r => r.json()).then(d => (PUZZLES = d)).catch(() => null);
let pzLevel = 0;
function showPzView(v) { ['pzListView', 'pzGridView'].forEach(id => $('#' + id).classList.toggle('hidden', id !== v)); }
async function openPuzzles() {
  await puzzlesReady; selTab('puzzle');
  if (!PUZZLES) { toast(t('ls.fail')); return; }
  const pr = pzProgress(), dl = dailyPick(), di = dailyInfo();
  $('#pzLevels').innerHTML = (dl ? `<button class="lesson-item daily" data-daily="1"><span class="no">★</span><span class="tx"><b>${t('daily.title')} <span style="color:var(--dim);font-weight:400">${dl.date.slice(5).replace('-', '/')}</span></b><small>${t('pz.level' + (dl.L + 1))} · 🔥 ${t('daily.streak', { n: di.streak })}${di.best > 1 ? ' · ' + t('daily.best', { n: di.best }) : ''}</small></span><span class="st ${di.today ? 'clear' : ''}">${di.today ? '✓' : t('daily.go')}</span></button>` : '') + PUZZLES.levels.map((L, i) => {
    const solved = L.puzzles.filter((_, j) => pr[`${i}-${j}`]).length;
    return `<button class="lesson-item" data-i="${i}"><span class="no">${i + 1}</span><span class="tx"><b>${t('pz.level' + (i + 1))}</b><small>${t('pz.levelSub' + (i + 1))}</small></span><span class="st ${solved === L.puzzles.length ? 'clear' : ''}">${solved}/${L.puzzles.length}</span></button>`;
  }).join('');
  showPzView('pzListView'); showOverlay('#puzzleOverlay');
}
$('#pzLevels').onclick = e => {
  const b = e.target.closest('.lesson-item'); if (!b) return;
  if (b.dataset.daily) { const dl = dailyPick(); if (dl) startPuzzle(dl.L, dl.j, dl.date); } else openPzGrid(+b.dataset.i);
};
function openPzGrid(i) {
  pzLevel = i; const pr = pzProgress(), L = PUZZLES.levels[i];
  $('#pzLevelTitle').textContent = t('pz.level' + (i + 1));
  $('#pzGrid').innerHTML = L.puzzles.map((_, j) => `<button data-j="${j}" class="${pr[`${i}-${j}`] ? 'solved' : ''}">${j + 1}</button>`).join('');
  showPzView('pzGridView'); showOverlay('#puzzleOverlay');
}
$('#pzGrid').onclick = e => { const b = e.target.closest('button[data-j]'); if (b) startPuzzle(pzLevel, +b.dataset.j); };
$('#pzBack').onclick = () => openPuzzles();
$('#pzClose').onclick = () => hideOverlay('#puzzleOverlay');
function startPuzzle(L, j, daily) {
  hideOverlay('#puzzleOverlay');
  stashGame(); lesson = null; document.body.classList.remove('in-lesson'); $('#toast').classList.remove('show');
  busyToken++; cancelWorker('ai'); cancelWorker('ana'); thinking = -1; rvOpen = false;
  const P = PUZZLES.levels[L].puzzles[j];
  puzzle = { L, j, P, side: P.side, state: 'play', daily: daily || null, hinted: false };
  document.body.classList.add('in-puzzle');
  setupProblem(decPos(P.pos), P.side, P.dice);
  render(); renderInfo(); renderPuzzleCard(); pzStatus(t('pz.start'));
}
function renderPuzzleCard() {
  const Pz = puzzle;
  $('#pzStep').textContent = Pz.daily ? `★ ${t('daily.title')} · ${Pz.daily.slice(5).replace('-', '/')}` : `${t('pz.level' + (Pz.L + 1))} · No.${Pz.j + 1}`;
  $('#pzTitle').textContent = t('pz.theme.' + (Pz.P.theme || 'best'));
  $('#pzGoal').innerHTML = `<span class="pdisc p${Pz.side}"></span><span>${t('pz.goal', { c: pname(Pz.side), d: Pz.P.dice.join('-') })}</span>`;
  $('#pzNext').disabled = !!Pz.daily || (Pz.j + 1 >= PUZZLES.levels[Pz.L].puzzles.length && Pz.L + 1 >= PUZZLES.levels.length);
  $('#pzHint').disabled = Pz.state !== 'play'; $('#pzAnswer').disabled = Pz.state === 'answer';
  renderInfo();
}
function pzStatus(html) { $('#pzStatus').innerHTML = html; }
function pzPlays() { const P = puzzle.P, p = decPos(P.pos); return P.plays.map(([m, e]) => { const d = decMoves(p, P.side, m); return { moves: d.moves, key: BG.key(d.pos), e }; }); }
function pzTable(plays, mine) { return `<div class="plays-table">${plays.slice(0, 5).map((x, i) => `<div class="${i === 0 ? 'best' : ''} ${i === mine ? 'mine' : ''}"><span>${i + 1}</span><span>${BG.notation(x.moves)}</span><span>${fmtE(x.e)}</span></div>`).join('')}</div>`; }
function puzzleSubmit(tt) {
  const Pz = puzzle, plays = pzPlays(), k = BG.key(tt.pos);
  const mine = plays.findIndex(x => x.key === k);
  const ok = mine === 0 || (mine > 0 && plays[mine].e >= plays[0].e - 0.004);
  turn.locked = true;
  if (ok) {
    Pz.state = 'solved';
    const pr = pzProgress(); pr[`${Pz.L}-${Pz.j}`] = true; try { localStorage.setItem(PZ_STORE, JSON.stringify(pr)); } catch (e) {}
    if (Pz.daily) dailySolved(Pz.daily, Pz.hinted);
    SFX.chime(true); confetti();
    pzStatus(`<b class="ok">${t('pz.solved')}</b> ${t('pz.solvedSub', { m: mvb(BG.notation(plays[0].moves)), g: (plays[0].e - plays[1].e).toFixed(3) })}` + (Pz.daily ? `<br>🔥 ${t('daily.streak', { n: dailyInfo().streak })}` : '') + pzTable(plays, 0));
  } else {
    Pz.state = 'fail';
    SFX.chime(false);
    const myE = mine >= 0 ? plays[mine].e : null;
    turn.pos = turn.start.slice(); turn.steps = []; turn.left = [];
    extraArrows = [{ side: Pz.side, start: turn.start, moves: plays[0].moves, cls: 'hint' }, { side: Pz.side, start: turn.start, moves: tt.steps.map(s => s.code), cls: 'bad' }];
    pzStatus(`<b class="ng">${t('pz.fail')}</b> ${t('pz.failWhy', { m: mvb(BG.notation(plays[0].moves)), l: myE === null ? '>' + (plays[0].e - plays[plays.length - 1].e).toFixed(3) : (plays[0].e - myE).toFixed(3) })}` + pzTable(plays, mine));
  }
  render(); renderPuzzleCard();
}
$('#pzRetry').onclick = () => { if (puzzle) startPuzzle(puzzle.L, puzzle.j, puzzle.daily); };
$('#pzNext').onclick = () => {
  if (!puzzle) return;
  let { L, j } = puzzle; j++;
  if (j >= PUZZLES.levels[L].puzzles.length) { L++; j = 0; }
  if (L < PUZZLES.levels.length) startPuzzle(L, j);
};
$('#pzList').onclick = () => { if (!puzzle) return; if (puzzle.daily) openPuzzles(); else openPzGrid(puzzle.L); };
$('#pzQuit').onclick = () => quitSpecial();
$('#pzHint').onclick = () => {
  const Pz = puzzle; if (!Pz || Pz.state !== 'play') return;
  Pz.hinted = true;
  const plays = pzPlays(); const froms = new Set(plays[0].moves.map(c => BG.mvFrom(c)));
  marks = [...froms].map(f => ({ side: Pz.side, p: f, cls: 'far' }));
  render(); pzStatus(t('pz.hintText', { n: froms.size }) + (Pz.P.theme ? ' ' + t('pz.themeHint.' + Pz.P.theme) : ''));
};
$('#pzAnswer').onclick = async () => {
  const Pz = puzzle; if (!Pz) return;
  Pz.state = 'answer'; Pz.hinted = true; marks = []; extraArrows = [];
  const plays = pzPlays();
  setupProblem(decPos(Pz.P.pos), Pz.side, Pz.P.dice); render(); renderPuzzleCard();
  pzStatus(t('pz.showing'));
  await sleep(400);
  if (puzzle !== Pz) return;
  turn.locked = false;
  await playMovesAnimated(plays[0].moves);
  if (puzzle !== Pz || !turn) return;
  turn.locked = true; render();
  pzStatus(t('pz.answerDone', { m: mvb(BG.notation(plays[0].moves)) }) + pzTable(plays, -1));
  renderPuzzleCard();
};
// ---- daily puzzle
const DAILY_STORE = STORE + '-daily';
let daily = { last: '', streak: 0, best: 0, days: {} };
try { Object.assign(daily, JSON.parse(localStorage.getItem(DAILY_STORE) || '{}')); } catch (e) {}
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function dailyPick() {
  if (!PUZZLES || !PUZZLES.levels.length) return null;
  const now = new Date(), date = ymd(now);
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 864e5);
  const wd = now.getDay(), nL = PUZZLES.levels.length;
  const L = Math.min(nL - 1, wd === 0 || wd === 6 ? nL - 1 : Math.floor((wd - 1) * nL / 5));
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

// ====================================================================== boot
drawBoardSvg();
const hadSave = load();
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
try { const q = new URLSearchParams(location.search).get('lang'); if (q && SUPPORTED.includes(q)) LANG = q; } catch (e) {}
applyI18n();
$('#langSel').onchange = e => {
  LANG = e.target.value; settings.lang = LANG; save(); applyI18n();
  try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {}
  render(); renderInfo();
  if ($('#newOverlay').classList.contains('show')) segSync();
  if (lesson) { renderLessonCard(); renderLessonFb(); }
  if (puzzle) renderPuzzleCard();
  if ($('#lessonOverlay').classList.contains('show')) { if (!$('#lessonListView').classList.contains('hidden')) openLessons(); else if (!$('#lessonIntroView').classList.contains('hidden')) openIntro(introIdx); }
  if ($('#puzzleOverlay').classList.contains('show')) { if (!$('#pzListView').classList.contains('hidden')) openPuzzles(); else openPzGrid(pzLevel); }
};
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
