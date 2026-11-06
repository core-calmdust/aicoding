/* senet/app.js — セネト（古代エジプト）本体：対局（AI／二人／AI同士／レート戦）、投げ棒、盤の操作、棋譜、
   形勢グラフ、振り返り、ヒント・待った・投了・持ち時間、設定ダイアログ、オンライン（準備中）、3Dスキンのフック。
   レッスン・パズル・ルールは app-learn.js、コーチは coach.js、PC の振り返りボックスは rvbox.js。
   Engine: engine.js (window.SenetEngine)、2D: board2d.js (window.SenetBoard2D)、AI は worker.js（Web Worker）で考える。 */
'use strict';
const E = window.SenetEngine, B2 = window.SenetBoard2D;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-senet';
const GID = 'senet';
const RULES = ['std', 'long'];
const SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const LV_MAX = 20;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ====================================================================== settings / i18n
const settings = { mode: 'ai', rule: 'std', color: '0', level: 6, level2: 12, clock: 0, speed: 2, autoRoll: false, autoPick: true, eval: true, last: true, danger: true, coach: true, sound: true, design: 'tut', pieces: 'tut', lang: '' };
function detectLang() { const n = (navigator.language || 'ja').toLowerCase(); return SUPPORTED.find(c => n.startsWith(c)) || 'en'; }
let LANG = detectLang();
function t(k, v) {
  let x = (I18N[LANG] || I18N.en)[k]; if (x === undefined) x = I18N.en[k]; if (x === undefined) x = I18N.ja[k]; if (x === undefined) return k;
  if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : '');
  return x;
}
window.t = t;
const sideName = s => t(s ? 'side1' : 'side0');
const LV = i => 'Lv.' + i;   // levels 1 … 20 (kyu / dan names are kept for the Japanese games: shogi, go, gomoku)
const LVD = i => t('lvd')[i <= 4 ? 0 : i <= 9 ? 1 : i <= 15 ? 2 : 3];
function applyI18n() {
  document.documentElement.lang = LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (typeof v === 'string') el.textContent = v; });
  $$('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.title = t('meta.title');
  $('#brandTitle').textContent = t('title');
  $('#langSel').value = LANG;
  const tt = { btnNew: 'btn.new.title', btnUndo: 'btn.undo.title', btnHint: 'btn.hint.title', btnRules: 'btn.rules.title', btnLesson: 'btn.lesson.title', btnPuzzle: 'btn.puzzle.title', btnSound: 'btn.sound.title' };
  for (const id in tt) { const el = document.getElementById(id); if (el) el.title = t(tt[id]); }
  $('#btnResign span').textContent = window.Resign ? Resign.label(LANG) : t('btn.resign');
  $('#btnRoll span').textContent = t('roll');
  $('#rollPill').textContent = t('roll');
  $$('#navBar button').forEach(b => { b.title = t('nav.' + b.dataset.n); });
}

// ====================================================================== game state
// ply = { s: side, d: [dice], n, m: {from,to} | null, ag: again }
let game = null;          // { rule, first, human, plies, roll: {d,n}|null, undoLeft, end: {winner, why}|null, id }
let cur = 0;              // plies shown
let reviewing = false;
let rgame = null;         // rated game: { id, lv, or, my, tag, done }
let lesson = null, puzzle = null;   // app-learn.js
let special = null;       // lesson / puzzle board: { state, n, dice, marks, last, hint, onMove(move) }
let playTimer = 0;        // the record replay (▶)
let ken = null;           // PC review box: exploring { base, plies, roll }
let busyToken = 0, thinking = 0, animating = false, gameOverShown = false;
let HB = null, view = null, dice2d = null;
let wpPaused = false;
const evalCache = new Map();
function newGameObj(rule, first, human) { return { rule, first, human, plies: [], roll: null, undoLeft: 2, end: null, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }; }
const line = () => ken ? game.plies.slice(0, ken.base).concat(ken.plies) : game.plies;
let posCache = { key: '', list: [] };
function fullMove(st, m) { if (!m) return null; return E.legalMoves(st, m.to - m.from).find(x => x.from === m.from) || null; }
function posAt(i) {
  const L = line(), key = game.rule + game.first + '|' + (ken ? 'k' + ken.base + ':' : '') + L.length;
  if (posCache.key !== key || posCache.L !== L || posCache.n !== L.length) {
    const list = [E.newGame(game.rule, game.first)];
    for (const p of L) { const st = list[list.length - 1], fm = fullMove(st, p.m); list.push(E.apply(st, fm, p.n).state); }
    posCache = { key, L, n: L.length, list };
  }
  return posCache.list[Math.max(0, Math.min(i, posCache.list.length - 1))];
}
const lineLen = () => line().length;
function statusAt(i) {
  const st = posAt(i);
  if (st.winner >= 0) return { over: true, winner: st.winner, why: 'home' };
  if (game.end && i >= game.plies.length && !ken) return Object.assign({ over: true }, game.end);
  return { over: false };
}
const overNow = () => statusAt(game.plies.length).over;
const curState = () => special ? special.state : posAt(cur);
function isAI(side) { return !special && !ken && (settings.mode === 'watch' || (settings.mode === 'ai' && side !== game.human)); }
function levelFor(side) { if (rgame) return rgame.lv; return settings.mode === 'watch' ? (side === 0 ? settings.level : settings.level2) : settings.level; }
const atLatest = () => cur === lineLen();
const OL = () => settings.mode === 'online' && !special && !ken && typeof olMyTurn === 'function';   // an online game is on the board (online-ui.js)
const myTurnHuman = () => { if (OL()) return olMyTurn(); const st = curState(); return !special ? (atLatest() && !overNow() && !isAI(st.turn) && (!reviewing || ken)) : true; };
const curRoll = () => special ? (special.n != null ? { d: special.dice, n: special.n } : null) : ken ? ken.roll : (atLatest() ? game.roll : null);
function setRoll(r) { if (special) { special.n = r ? r.n : null; special.dice = r ? r.d : null; } else if (ken) ken.roll = r; else game.roll = r; }

// ====================================================================== save / load
function save() {
  if (settings.mode === 'online') { if (typeof olSaveLocal === 'function') olSaveLocal(); return; }   // (the online game is not saved here: the local one is kept)
  try {
    const d = { v: 1, settings, game: game && !special ? { rule: game.rule, first: game.first, human: game.human, plies: game.plies, roll: game.roll, undoLeft: game.undoLeft, end: game.end, id: game.id, mode: settings.mode, level: settings.level, level2: settings.level2 } : null, rgame };
    localStorage.setItem(STORE, JSON.stringify(d));
  } catch (e) {}
}
function load() {
  let d = null; try { d = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
  if (d && d.settings) for (const k in settings) if (k in d.settings) settings[k] = d.settings[k];
  if (!RULES.includes(settings.rule)) settings.rule = 'std';
  if (!B2.BOARDS.includes(settings.design)) settings.design = 'tut';
  if (!B2.PIECES.includes(settings.pieces)) settings.pieces = 'tut';
  if (d && d.game && Array.isArray(d.game.plies)) {
    game = Object.assign(newGameObj(RULES.includes(d.game.rule) ? d.game.rule : 'std', d.game.first || 0, d.game.human || 0), d.game);
    rgame = d.rgame || null;
    cur = game.plies.length;
    try { posAt(cur); } catch (e) { game = null; }
  }
  return !!game;
}

// ====================================================================== sound (WebAudio, quiet)
let actx = null;
function ac() { if (!settings.sound) return null; if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } } if (actx.state === 'suspended') actx.resume().catch(() => {}); return actx; }
function tone(f0, f1, dur, vol, type, delay) { const a = ac(); if (!a) return; const t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .008); g.gain.exponentialRampToValueAtTime(.0005, t0 + dur); o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + .02); }
function noise(dur, vol, freq, delay) { const a = ac(); if (!a) return; const t0 = a.currentTime + (delay || 0), n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2); const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.4; const g = a.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(a.destination); s.start(t0); }
const SND = {
  roll() { for (let i = 0; i < 5; i++) noise(.06, .14, 1400 + Math.random() * 900, i * .06 + Math.random() * .03); },
  dieHit(k = 1) { noise(.035, .13 * k, 2300 + Math.random() * 1500); if (k > .8) tone(1500 + Math.random() * 500, 0, .03, .012 * k, 'triangle'); },
  place() { noise(.06, .22, 1500); tone(420, 260, .08, .05, 'triangle'); },
  cap() { noise(.12, .28, 700); tone(220, 90, .22, .09, 'sine'); },
  rosette() { [659.3, 987.8].forEach((f, i) => tone(f, 0, .5, .045, 'sine', i * .09)); },
  pass() { tone(330, 247, .28, .04, 'sine'); },
  water() { noise(.35, .12, 500); tone(420, 160, .5, .05, 'sine'); },
  home() { [784, 1175].forEach((f, i) => tone(f, 0, .35, .05, 'triangle', i * .07)); },
  ok() { [880, 1318.5].forEach((f, i) => tone(f, 0, .4, .06, 'sine', i * .08)); },
  ng() { tone(392, 330, .25, .05, 'sine'); },
  win() { [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, 0, .6, .06, 'triangle', i * .11)); },
  lose() { [392, 311.1, 261.6].forEach((f, i) => tone(f, 0, .5, .05, 'sine', i * .14)); },
};
const snd = k => { if (document.hidden) return; try { SND[k] && SND[k](); } catch (e) {} };
const snd2 = (k, a) => { if (document.hidden) return; try { SND[k] && SND[k](a); } catch (e) {} };
document.addEventListener('visibilitychange', () => { if (actx) { if (document.hidden) actx.suspend().catch(() => {}); else if (settings.sound) actx.resume().catch(() => {}); } });

// ====================================================================== AI worker
let aiW = null, jobSeq = 0;
const jobs = new Map();
function worker() {
  if (aiW === false) return null;
  if (!aiW) { try { aiW = new Worker('worker.js?v=1'); aiW.onmessage = e => { const d = e.data, j = jobs.get(d.id); if (j) j(d); }; aiW.onerror = () => { aiW = false; }; } catch (e) { aiW = false; return null; } }
  return aiW;
}
function think(st, n, level) {
  return new Promise(res => {
    const w = worker();
    if (!w) { setTimeout(() => { const m = E.think(st, n, level); res(m ? { from: m.from, to: m.to } : null); }, 30); return; }
    const id = ++jobSeq; jobs.set(id, d => { jobs.delete(id); if (d.error) { const m = E.think(st, n, level); res(m ? { from: m.from, to: m.to } : null); } else res(d.move); });
    w.postMessage({ id, type: 'think', state: E.clone(st), n, level });
  });
}
function reviewJob(list, onProg) {
  return new Promise(res => {
    const w = worker();
    if (!w) { list.forEach((q, i) => onProg(i, { ev: q.n ? E.evaluate(q.state, q.n).map(x => ({ from: x.move.from, to: x.move.to, wp: x.wp })) : [], wp0: E.winProb(q.state) })); res(); return; }
    const id = ++jobSeq; jobs.set(id, d => { if (d.type === 'progress') onProg(d.i, d.res); else { jobs.delete(id); res(); } });
    w.postMessage({ id, type: 'review', list });
  });
}

// ====================================================================== board / dice view
const mqPC = matchMedia(window.HeaderBar ? HeaderBar.MEDIA : '(hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4)');
const mqV = matchMedia('(pointer: coarse) and (max-width: 760px) and (orientation: portrait)');
// phones held sideways (the landscape layout of landtabs.js: the same query)
const mqL = matchMedia('(min-aspect-ratio: 1/1) and (pointer: coarse) and (max-height: 560px), (min-aspect-ratio: 1/1) and (pointer: coarse) and (max-width: 900px)');
const phone = () => mqV.matches || mqL.matches;
// phones held upright: the board turned ('v', the bigger squares on a tall screen) — but on a short one (e.g. 375×667) the board
// lying across the screen gets the bigger squares: 'v' when its squares (the height left from 100lvh ÷ 8.96) are at least those of 'h'
// (the width ÷ 9.24). Either way the dice are thrown in the players' strips (band())
const lvhPx = (() => { let el = null; return () => { if (!el) { el = document.createElement('div'); el.style.cssText = 'position:fixed;left:-9px;top:0;width:1px;height:100vh;height:100lvh;visibility:hidden;pointer-events:none'; document.documentElement.appendChild(el); } return el.offsetHeight || innerHeight; }; })();
const ohPx = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--oh')) || 340;   // (the room the page keeps for the menu, cards and tabs: index.html --oh)
const orient = () => !mqV.matches ? 'h' : (lvhPx() - ohPx()) / 11.04 >= (innerWidth - 20) / 11.04 * 1.15 ? 'v' : 'h';
const animOn = () => settings.speed > 0;
const SPD = () => [3, .7, 1, 1.8][settings.speed] || 1;
function buildView() {
  view = B2.mount($('#board'), { orient: orient(), trayLabel: k => t('tray.' + k), design: settings.design, pieces: settings.pieces, speed: SPD() });
  view.on('cell', e => onCell(e)).on('tray', e => onTray(e));
  bindHover();
  dice2d = null;
  document.documentElement.classList.toggle('bv', orient() === 'v');
  document.documentElement.dataset.pcs = settings.pieces; document.documentElement.dataset.bd = settings.design; discs(settings.pieces);
}
function bindHover() {
  const svg = view.svg(); if (!svg) return;
  svg.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const g = e.target.closest && e.target.closest('.sn-pc'); hoverAt(g); });
  svg.addEventListener('pointerleave', () => hoverAt(null));
}
let hoverMove = null;
function hoverAt(g) {
  let mv = null;
  if (g) {
    const st = curState(), r = curRoll();
    if (r && r.n && myTurnHuman()) {
      const ms = E.legalMoves(st, r.n);
      if (g.classList.contains('sn-pc')) { const q = g.__q; if (q && q.side === st.turn) mv = ms.find(m => m.from === q.pos) || null; }
    }
  }
  if ((mv && mv.from) !== (hoverMove && hoverMove.from)) { hoverMove = mv; renderBoard(); }
}
// phones held upright (the board turned, 'vn'): the dice leave the board — they are thrown in a strip in the card of the
// player to roll (the opponent's above the board, yours below), with the roll plate there; the notch holds the waiting pieces
const band = () => !!view && phone();
// the dice sit in the notch (columns 4–5) on the side of the player to roll
function placeDice() {
  const fr = $('#frame'), dock = $('#diceDock'); if (!fr || !view) return;
  const st = curState(), side = st ? st.turn : 0;
  document.documentElement.classList.toggle('sn-band', band());
  if (band()) {
    const slot = $('#pdk' + side);
    if (dock.parentElement !== slot) slot.appendChild(dock);
    ['left', 'top', 'width', 'height'].forEach(k => { dock.style[k] = ''; });
    const host = $('#diceHost'); ['position', 'width', 'height', 'left', 'top', 'flex'].forEach(k => { host.style[k] = ''; });
    dock.classList.toggle('d3', !!(dice2d && dice2d.is3D && dice2d.is3D()));
    $('#diceCap').style.display = '';
    return;
  }
  if (dock.parentElement !== fr) fr.insertBefore(dock, $('#fxMsg'));
  // the sticks lie in the strip of the side to throw (h: left of its off-board row; v: the top of its column)
  const rr = view.stickRect(side), fb = fr.getBoundingClientRect(); if (!rr) return;
  dock.style.left = (rr.left - fb.left) + 'px'; dock.style.top = (rr.top - fb.top) + 'px'; dock.style.width = rr.width + 'px'; dock.style.height = rr.height + 'px';
  const host = $('#diceHost'); ['position', 'width', 'height', 'left', 'top', 'flex'].forEach(k => { host.style[k] = ''; });
  dock.classList.toggle('d3', false);
  $('#diceCap').style.display = view.orient() === 'v' ? 'none' : '';
}

function lastMarks() {
  if (special) return special.last || null;
  if (!settings.last || cur === 0) return null;
  const L = line(), p = L[cur - 1]; if (!p || !p.m) return null;
  const st = posAt(cur - 1);
  return moveMarks(st, p.s, p.m, posAt(cur));
}
function moveMarks(st, side, m, after) {
  const rl = E.RULES[st.rule];
  const from = rcOf(st.rule, side, m.from);
  let to;
  if (m.to >= rl.goal) { const done = after ? after.pos[side].filter(p => p >= rl.goal).length : 1; to = { tray: 'goal', side, slot: Math.max(0, done - 1) }; }
  else to = rcOf(st.rule, side, after && m.water ? m.dest : m.to);
  return { from, to };
}
function rcOf(rule, side, i) { const c = E.coords(rule, side, i); return c ? { r: c[0], c: c[1] } : null; }
function targetsFor(st, ms) {
  const rl = E.RULES[st.rule];
  return ms.map(m => m.to >= rl.goal ? { tray: 'goal', side: st.turn, slot: st.pos[st.turn].filter(p => p >= rl.goal).length } : Object.assign(rcOf(st.rule, st.turn, m.to), { capture: m.capture, water: m.water }));
}
let hintMove = null, coachHover = null;
function renderBoard() {
  if (!view) return;
  const st = curState(); if (!st) return;
  const r = curRoll(), opt = { marks: [] };
  const lm = lastMarks(); if (lm) opt.last = lm;
  const human = myTurnHuman() && !animating && !thinking;
  if (r && r.n && human && st.winner < 0) {
    const ms = E.legalMoves(st, r.n);
    const show = hoverMove ? [hoverMove] : ms;
    opt.targets = targetsFor(st, show);
    if (hoverMove) { const mm = moveMarks(st, st.turn, hoverMove); opt.hint = { from: mm.from, to: mm.to }; }
  }
  const hm = coachHover || hintMove;
  if (hm && human && r && r.n) { const mm = moveMarks(st, st.turn, hm); opt.hint = { from: mm.from, to: mm.to }; }
  if (special && special.marks) opt.marks = opt.marks.concat(special.marks);
  if (special && special.hint) opt.hint = special.hint;
  // danger (coach on): your pieces that the opponent can hit next turn
  if (!special && settings.danger && window.SenetCoach && SenetCoach.active() && !overNow() && atLatest()) {
    const me = settings.mode === 'pvp' ? st.turn : game.human, rl = E.RULES[st.rule];
    // risk of being hit on the rival's next roll: if it is my turn, after the rival moves next; if it is the rival's turn, now
    const risk = st.turn === me ? E.hitRisk(st, me) : E.hitRisk(Object.assign(E.clone(st), { turn: me }), me);
    st.pos[me].forEach((p, k) => { if (p > 0 && p < rl.goal && risk[k] > 0.005) { const c = rcOf(st.rule, me, p); opt.marks.push({ r: c.r, c: c.c, type: 'danger', text: Math.round(risk[k] * 100) + '%' }); } });
  }
  view.render(st, opt);
  skinSync();
  placeDice();
}
function renderDice() {
  const r = curRoll(), st = curState(), dock = $('#diceDock');
  { const bd = band();
    if (!dice2d || dice2d.band !== bd) { dice2d = B2.dice($('#diceHost'), { style: settings.pieces }); dice2d.count = 4; dice2d.band = bd; } }
  if (r) dice2d.show(r.d); else if (!dice2d.shown) dice2d.show(new Array(E.RULES[st.rule].dice).fill(0));   // after a move the dice keep lying as they fell
  dice2d.shown = true;
  dock.classList.toggle('d3', !!(dice2d.is3D && dice2d.is3D()));
  const canRoll = canRollNow();
  dock.classList.toggle('can', canRoll);
  dock.classList.toggle('dim', !r && !canRoll);
  $('#diceCap').textContent = r ? (band() ? String(r.n) : t('dice.n', { n: r.n }) + (E.AGAIN(r.n) ? ' ↻' : '')) : '';   // (phones: the count alone, a small gilt badge on the strip)
}
function canRollNow() {
  if (animating || thinking) return false;
  const st = curState(); if (!st || st.winner >= 0) return false;
  if (special) return !!special.canRoll && !curRoll();
  if (!myTurnHuman() || curRoll()) return false;
  return true;
}

// ====================================================================== effects (soft, translucent)
// PC: the status as a small translucent note at the edge of the board on the side to move (it replaces the status box):
// shown when it changes, gone after a few seconds or as soon as something is played; the race count joins it at a new turn
let tipKey = '', tipT = 0;
function boardTip(msg, sub, side) {
  const el = $('#boardTip'); if (!el || !HB || !HB.on) return;
  const k = msg + '|' + side; if (k === tipKey) return; tipKey = k;
  clearTimeout(tipT);
  if (!msg) { el.classList.remove('show'); return; }
  let extra = sub || '';
  if (!special && game && !overNow() && atLatest()) { const rc = E.raceCount(curState()); extra = t('tip.race', { a: rc.pips[side], b: rc.pips[1 - side] }); }
  el.className = 'board-tip s' + side; el.innerHTML = esc(msg) + (extra ? `<small>${esc(extra)}</small>` : '');
  void el.offsetWidth; el.classList.add('show');
  tipT = setTimeout(() => el.classList.remove('show'), 3600);
}
['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { clearTimeout(tipT); tipT = setTimeout(() => { const el = $('#boardTip'); if (el) el.classList.remove('show'); }, 900); }, true));
let fxT = 0;
function fxMsg(text, sub, cls, ms) {
  const el = $('#fxMsg'), gl = $('#fxGlow');
  el.className = 'fx-msg ' + (cls || ''); el.innerHTML = esc(text) + (sub ? `<small>${esc(sub)}</small>` : '');
  gl.className = 'fx-glow ' + (cls || '');
  void el.offsetWidth; el.classList.add('show'); if (cls !== 'pass') gl.classList.add('show');
  clearTimeout(fxT); fxT = setTimeout(() => { el.classList.remove('show'); gl.classList.remove('show'); }, (ms || 1100) / Math.max(.8, SPD() * .9));
}
let toastT = 0;
function toast(msg, ms) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms || 1600); }
window.toast = toast;

// ====================================================================== 3D skin hooks (SKIN-HOOKS.md)
function skinSync() { const S = window.SenetSkin3D; if (S && S.sync) { try { S.sync(curState(), view); } catch (e) { console.error(e); } } }
window.SenetSkinHooks = {
  sync: st => { const S = window.SenetSkin3D; if (S && S.sync) S.sync(st || curState(), view); },
  async animateMove(side, from, to, info) {
    const S = window.SenetSkin3D;
    if (S && S.animateMove) { try { await S.animateMove(side, from, to, info || {}); return; } catch (e) { console.error(e); } }
    if (animOn()) await view.animateMove(side, from, to, Object.assign({ speed: SPD() }, info || {}));
  },
  async animateRoll(d) {
    const S = window.SenetSkin3D;
    if (S && S.animateRoll && !band()) { try { await S.animateRoll(d); dice2d.show(d); return; } catch (e) { console.error(e); } }
    if (!animOn()) { dice2d.show(d); return; }
    const dock = $('#diceDock'), fr = $('#frame'); dock.classList.add('rolling');
    // thrown in from outside the board, on the roller's side of the notch (below / right of the middle row → from below / the right);
    // phones: from the screen's edge on the roller's side (your strip below the board: from below)
    const dr = dock.getBoundingClientRect(), fb = fr.getBoundingClientRect(), outer = view.orient() === 'v' && !band() ? dr.left + dr.width / 2 > fb.left + fb.width / 2 : dr.top + dr.height / 2 > fb.top + fb.height / 2;
    try { await dice2d.roll(d, { speed: SPD(), side: outer ? 0 : 1, onHit: (i, k) => snd2('dieHit', k) }); } finally { dock.classList.remove('rolling'); }
  },
  orient: () => view ? view.orient() : 'h',
};
window.SenetApp = {
  get view() { return view; }, get dice() { return dice2d; }, frame: () => $('#frame'), board: () => $('#board'),
  state: () => curState(), roll: () => curRoll(), orient: () => view ? view.orient() : 'h', relayout: () => relayout(true), render: () => renderAll(),
};

// ====================================================================== info panel
function homeCount(st, s) { const g = E.RULES[st.rule].goal; return st.pos[s].filter(p => p >= g).length; }
function playerName(s) {
  if (settings.mode === 'online' && typeof olPlayerName === 'function') return olPlayerName(s);
  if (settings.mode === 'pvp') return sideName(s);
  if (settings.mode === 'watch') return 'AI ' + LV(levelFor(s));
  return s === game.human ? t('you') : 'AI ' + LV(levelFor(s)) + (rgame && !phone() ? ` (R${rgame.or})` : '');   // (phones: the narrow card shows the level only)
}
function renderInfo() {
  const st = curState(), rl = E.RULES[st.rule], rc = E.raceCount(st), sta = special ? { over: false } : statusAt(cur);
  for (const s of [0, 1]) {
    const el = $('#pl' + s), home = homeCount(st, s), onb = st.pos[s].filter(p => p > 0 && p < rl.goal).length;
    $('#name' + s).textContent = special ? sideName(s) : playerName(s);
    $('#sub' + s).innerHTML = `${esc(t('pl.board'))} <b>${onb}</b> · ${esc(t('pl.left'))} <b>${rc.pips[s]}</b>`;
    $('#home' + s).innerHTML = `${home}<small>/${rl.pieces} ${esc(t('pl.home'))}</small>`;
    el.classList.toggle('active', !sta.over && st.turn === s);
    el.classList.toggle('won', sta.over && sta.winner === s);
    el.classList.toggle('thinking', !!thinking && st.turn === s);
    $('#status' + s).textContent = thinking && st.turn === s ? t('thinking') : sta.over && sta.winner === s ? t('st.won') : '';
    el.querySelector('.pdisc').className = 'pdisc p' + s;
  }
  // status box + roll button
  const r = curRoll(), bt = $('#btnRoll');
  let msg = '', sub = '';
  if (special) { msg = special.msg || ''; }
  else if (sta.over) { msg = t('st.over', { s: sideName(sta.winner) }); sub = t('res.why.' + (sta.why || 'home')); }
  else if (reviewing && !ken) { msg = t('st.viewing', { n: cur }); }
  else if (OL() && olStatusMsg(st)) { msg = olStatusMsg(st); }
  else if (thinking || isAI(st.turn)) { msg = t('st.ai', { s: playerName(st.turn) }); }
  else if (!r) { msg = t('st.roll', { s: settings.mode === 'pvp' || ken ? sideName(st.turn) : t('you') }); sub = t('st.rollSub'); }
  else if (!r.n) { msg = t('st.zero'); }
  else { const ms = E.legalMoves(st, r.n); msg = ms.length ? t('st.move', { n: r.n }) : t('st.noMove', { n: r.n }); sub = ms.length ? t('st.moveSub') : ''; }
  $('#stText').innerHTML = esc(msg) + (sub ? `<small>${esc(sub)}</small>` : '');
  boardTip(special ? '' : msg, sub, st.turn);
  const pass = r && (!r.n || !E.legalMoves(st, r.n).length) && myTurnHuman() && !animating;
  bt.classList.toggle('pass', !!pass);
  bt.querySelector('span').textContent = pass ? t('pass') : t('roll');
  bt.disabled = !(canRollNow() || pass);
  renderClock();
  // menu
  $('#btnUndo').disabled = !canUndo() && !wpActive();
  $('#btnHint').disabled = !canHint();
  $('#btnResign').disabled = !canResign();
  wpRender();
  document.body.classList.toggle('rated-live', rtLive());
  document.body.classList.toggle('reviewing', reviewing && !special && !ken);
  navNeedSync();
  $('#reviewText').textContent = t('st.viewing', { n: cur });
  renderDice();
  renderEval();
  if (HB) hbInfo();
  if (window.SenetCoach) SenetCoach.render();
  if (window.SenetRv) SenetRv.update();
}
function hbInfo() {
  const st = curState(), r = curRoll();
  let h = '';
  if (special) h = `<span class="hb-chip">${esc(special.title || '')}</span>`;
  else {
    h += `<span class="hb-chip">${esc(t('rule.' + game.rule))}</span>`;
    const sta = statusAt(cur);
    if (!sta.over) h += `<span class="hb-chip"><span class="pdisc p${st.turn}"></span>${esc(t('hb.turn', { s: playerName(st.turn) }))}${r ? ` · <b>${r.n}</b>` : ''}</span>`;
    if (settings.eval && !rtLive() && !olNoEval()) { const w = lightWp(cur); h += `<span class="hb-chip">${esc(t('eval'))} <b>${Math.round(w * 100)}%</b> <small>${esc(sideName(0))}</small></span>`; }
    if (rgame) h += `<span class="hb-chip">${esc(t('ng.rated'))} · ${esc(LV(rgame.lv))}</span>`;
  }
  HB.setInfo(h);
}
// win chance of Light at position i (cached by the position key)
function lightWp(i) {
  const st = special ? special.state : posAt(i), k = E.key(st);
  if (evalCache.has(k)) return evalCache.get(k);
  let w; if (st.winner >= 0) w = st.winner === 0 ? 1 : 0; else { const v = E.winProb(st); w = st.turn === 0 ? v : 1 - v; }
  if (evalCache.size > 5000) evalCache.clear();
  evalCache.set(k, w); return w;
}
const olNoEval = () => settings.mode === 'online' && typeof olLive === 'function' && olLive();   // no win chances while an online game runs
function renderEval() {
  const show = settings.eval && !rtLive() && !olNoEval();
  const w = show ? lightWp(cur) : .5;
  $('#evalFill').style.width = (w * 100).toFixed(1) + '%';
  $('#evalText').textContent = show ? `${sideName(0)} ${Math.round(w * 100)}% — ${sideName(1)} ${100 - Math.round(w * 100)}%` : '—';
  renderGraph(); renderKifu();
}
function renderGraph() {
  const svg = $('#graph'); if (special) { svg.innerHTML = ''; return; }
  const N = ken ? ken.base : lineLen(), W = 300, H = 74;   // (explore moves are not drawn)
  if (!settings.eval || rtLive() || olNoEval()) { svg.innerHTML = ''; return; }
  const pts = []; for (let i = 0; i <= N; i++) pts.push(lightWp(i));
  const x = i => N ? i / N * W : 0, y = v => (H - 4 - v * (H - 8)).toFixed(1);
  let d = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v)}`).join('');
  const area = d + `L${x(N).toFixed(1)} ${H}L0 ${H}Z`;
  svg.innerHTML = `<defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4ecd6" stop-opacity=".35"/><stop offset="1" stop-color="#f4ecd6" stop-opacity=".02"/></linearGradient></defs>` +
    `<line class="zero" x1="0" x2="${W}" y1="${y(.5)}" y2="${y(.5)}" vector-effect="non-scaling-stroke"/>` +
    `<path d="${area}" fill="url(#gg)"/><path d="${d}" fill="none" stroke="#e6c573" stroke-width="1.6" vector-effect="non-scaling-stroke"/>` +
    `<line class="cur" x1="${x(Math.min(cur, N))}" x2="${x(Math.min(cur, N))}" y1="0" y2="${H}" vector-effect="non-scaling-stroke"/>`;
}
function plyText(st, p, html) {
  const sn = sideName(p.s);
  if (!p.m) return `${sn} ${p.n}${t('sep')}${t('k.pass')}`;
  const rl = E.RULES[st.rule], fm = fullMove(st, p.m) || {}, a = String(p.m.from), b = p.m.to >= rl.goal ? t('k.home') : fm.water ? `27≈${fm.dest}` : String(p.m.to);
  let s = `${sn} ${p.n}${t('sep')}${a}→${b}`;
  if (fm.capture) s += html ? ` <span class="x">⇄${esc(t('k.cap'))}</span>` : ' ⇄' + t('k.cap');
  if (p.ag) s += html ? ` <span class="r">↻</span>` : ' ↻';
  return s;
}
let kifuKey = '';
function renderKifu() {
  const el = $('#kifu'); if (special) { if (kifuKey !== 'sp') { kifuKey = 'sp'; el.innerHTML = `<div class="empty">${esc(t('kifu.special'))}</div>`; } return; }
  const L = ken ? game.plies.slice(0, ken.base) : line(), q = window.SenetRv ? SenetRv.quality : () => '';   // (explore moves are not recorded)
  const k = LANG + '|' + L.length + '|' + cur + '|' + (ken ? 'k' : '') + '|' + (window.SenetRv ? SenetRv.ver() : 0);
  if (k === kifuKey) return; kifuKey = k;
  if (!L.length) { el.innerHTML = `<div class="empty">${esc(t('kifu.empty'))}</div>`; return; }
  el.innerHTML = L.map((p, i) => { const qq = q(i); return `<button data-i="${i + 1}" class="${i + 1 === cur ? 'cur' : ''} ${qq === 'bad' ? 'q-bad' : qq === 'dubious' ? 'q-dub' : ''}"><em>${i + 1}</em><i class="s${p.s}"></i><span>${plyText(posAt(i), p, true)}</span></button>`; }).join('');
  const c = el.querySelector('.cur'); if (c) { const top = c.offsetTop - el.offsetTop; if (top < el.scrollTop || top > el.scrollTop + el.clientHeight - 24) el.scrollTop = top - el.clientHeight / 2; }
}
$('#kifu').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
$('#graph').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(), N = lineLen(); if (!N) return; viewAt(Math.round((e.clientX - r.left) / r.width * N)); });
function recordText() {
  const L = game.plies;
  const head = `${t('title')} — ${t('rule.' + game.rule)}\n${sideName(0)}: ${playerName(0)} / ${sideName(1)}: ${playerName(1)}\n`;
  const body = L.map((p, i) => `${i + 1}. ${plyText(posAt(i), p, false)}`).join('\n');
  const sta = statusAt(L.length);
  return head + body + (sta.over ? `\n${t('st.over', { s: sideName(sta.winner) })}` : '') + '\n';
}

// ====================================================================== clock (1手30秒)
let clockStart = 0, clockKey = '', clockHold = true;   // (a game restored on page load: the clock waits for the first move)
const clockSec = () => rgame ? 30 : settings.clock;
function clockOn() { return settings.mode !== 'online' && !special && !ken && clockSec() > 0 && settings.mode !== 'watch' && !overNow() && atLatest() && !reviewing && !isAI(curState().turn); }
function renderClock() {
  if (settings.mode === 'online' && typeof olClockRender === 'function') { olClockRender(); return; }
  for (const s of [0, 1]) $('#clk' + s).textContent = '';
  if (!clockOn()) { document.body.classList.remove('has-clk'); return; }
  document.body.classList.add('has-clk');
  const st = curState(), k = game.id + ':' + game.plies.length;
  if (clockKey !== k) { if (clockKey) clockHold = false; clockKey = k; clockStart = Date.now(); if (window.CountTick) CountTick.reset('mv'); }
  if (clockHold) clockStart = Date.now();
  const left = Math.max(0, clockSec() * 1000 - (Date.now() - clockStart)), el = $('#clk' + st.turn);
  el.textContent = '0:' + String(Math.ceil(left / 1000)).padStart(2, '0'); el.classList.toggle('low', left <= 10000);
}
setInterval(() => {
  if (!game || !clockOn() || animating) return;
  if (document.hidden || clockHold) { clockStart = clockHold ? Date.now() : clockStart + 250; return; }
  const st = curState(), left = clockSec() * 1000 - (Date.now() - clockStart);
  renderClock();
  if (window.CountTick) CountTick.feed(Math.max(0, left), 'mv');
  if (left <= 0) { busyToken++; game.end = { winner: 1 - st.turn, why: 'time' }; game.roll = null; save(); update(); onGameEnd(); }
}, 250);

// ====================================================================== flow
function update() { renderBoard(); renderInfo(); }
function renderAll() { renderBoard(); renderInfo(); }
async function doRoll() {
  if (!canRollNow()) return;
  const st = curState(), r0 = OL() ? null : E.rollDice(Math.random, st.rule), r = OL() ? olRoll() : { d: r0.dice, n: r0.n };   // online: the dice of both players' chains
  if (!r) return;
  const tok = busyToken; animating = true; hintMove = null; renderInfo();
  snd('roll');
  await SenetSkinHooks.animateRoll(r.d);
  animating = false; if (tok !== busyToken) return;
  setRoll(r); if (!special && !ken) save();
  afterRoll(tok);
}
function afterRoll(tok) {
  const st = curState(), r = curRoll();
  renderAll();
  if (special) { if (special.onRoll) special.onRoll(r); return; }
  const ms = r.n ? E.legalMoves(st, r.n) : [];
  if (!ms.length) {   // pass: a soft notice, then the turn goes over (1・4・5: the same side throws again)
    fxMsg(t('fx.pass'), E.AGAIN(r.n) ? t('fx.passAgain') : t('fx.passNoMove'), 'pass', 1300);
    snd('pass');
    setTimeout(() => { if (tok === busyToken) commit(null); }, 1150 / Math.max(.7, SPD() * .8));
    return;
  }
  if (isAI(st.turn)) return;
  if (ms.length === 1 && settings.autoPick) setTimeout(() => { if (tok === busyToken && curRoll() === r && !animating) commit(ms[0]); }, 520 / SPD());
}
async function commit(m) {
  const st = curState(), r = curRoll(); if (!r || animating) return;
  const fm = m ? fullMove(st, m) : null;
  if (m && !fm) return;
  if (OL() && !olRemote && !olSend(st, fm)) return;   // online: my move is written to the record (the other side's plies come with olRemote)
  const tok = ++busyToken; animating = true; hoverMove = null; hintMove = null; coachHover = null;
  renderBoard();
  if (fm) { await SenetSkinHooks.animateMove(st.turn, fm.from, fm.to, { capture: fm.capture, dest: fm.water ? fm.dest : undefined, speed: SPD() }); snd(fm.capture ? 'cap' : fm.finish ? 'home' : fm.water ? 'water' : 'place'); }
  if (tok !== busyToken) { animating = false; return; }
  const res = E.apply(st, fm, r.n);
  animating = false;
  if (special) { if (fm) special.last = moveMarks(st, st.turn, fm, res.state); special.state = res.state; special.n = null; special.dice = null; if (special.onMove) special.onMove(fm, res); renderAll(); return; }
  const ply = { s: st.turn, d: r.d, n: r.n, m: fm ? { from: fm.from, to: fm.to } : null, ag: !!res.again };
  if (ken) { ken.plies.push(ply); ken.roll = null; cur = lineLen(); }
  else { game.plies = game.plies.slice(0, cur); game.plies.push(ply); game.roll = null; cur = game.plies.length; reviewing = false; if (window.SenetRv) SenetRv.invalidate(); save(); }
  if (fm && fm.water) fxMsg(t('fx.water'), t('fx.waterSub', { n: fm.dest }), 'cap', 1400);
  else if (res.again && res.state.winner < 0) { fxMsg(t('fx.again'), t('fx.againSub', { n: r.n }), '', 1100); snd('rosette'); }
  update();
  if (res.state.winner >= 0) { onGameEnd(); return; }
  afterPosition();
}
async function afterPosition() {
  if (special || ken || !game) { renderInfo(); return; }
  const tok = busyToken;
  if (overNow() || !atLatest() || reviewing) { renderInfo(); return; }
  const st = posAt(cur);
  if (isAI(st.turn)) {
    if (wpActive() && wpPaused) return;
    thinking = 1; renderInfo();
    await sleep((settings.mode === 'watch' ? 520 : 380) / SPD());
    if (tok !== busyToken) return;
    if (!game.roll) {
      const r0 = E.rollDice(Math.random, st.rule), r = { d: r0.dice, n: r0.n };
      thinking = 0; animating = true; renderInfo(); snd('roll');
      await SenetSkinHooks.animateRoll(r.d); animating = false;
      if (tok !== busyToken) return;
      game.roll = r; save(); renderAll();
    }
    const r = game.roll, ms = r.n ? E.legalMoves(st, r.n) : [];
    if (!ms.length) { thinking = 0; afterRoll(tok); return; }
    thinking = 1; renderInfo();
    const t0 = performance.now(), mv = await think(st, r.n, levelFor(st.turn));
    const wait = (settings.mode === 'watch' ? 420 : 320) / SPD() - (performance.now() - t0);
    if (wait > 0) await sleep(wait);
    thinking = 0;
    if (tok !== busyToken) { renderInfo(); return; }
    commit(mv || ms[0]);
    return;
  }
  renderAll();
  if (!game.roll && settings.autoRoll) setTimeout(() => { if (tok === busyToken && !game.roll && atLatest() && !reviewing) doRoll(); }, 420 / SPD());
  else if (game.roll) afterRoll(tok);
}
// ---- board input
function onCell(e) {
  if (!myTurnHuman() || animating || thinking) return;
  const st = curState(), r = curRoll();
  if (!r) { if (canRollNow()) doRoll(); return; }
  if (!r.n) return;
  const ms = E.legalMoves(st, r.n);
  let m = null;
  if (e.piece != null && e.side === st.turn) { const p = st.pos[st.turn][e.piece]; m = ms.find(x => x.from === p); }
  if (!m) m = ms.find(x => { const c = x.to < E.RULES[st.rule].goal ? E.coords(st.rule, st.turn, x.to) : null; return c && c[0] === e.r && c[1] === e.c; });
  if (!m) { const c = E.coords; const own = st.pos[st.turn].some(p => { const q = p > 0 && p < E.RULES[st.rule].goal ? c(st.rule, st.turn, p) : null; return q && q[0] === e.r && q[1] === e.c; }); if (own) toast(t('tip.cant')); return; }
  play(m);
}
function onTray(e) {
  if (!myTurnHuman() || animating || thinking) return;
  const st = curState(), r = curRoll();
  if (!r) { if (canRollNow()) doRoll(); return; }
  if (!r.n || e.side !== st.turn) return;
  const ms = E.legalMoves(st, r.n);
  const m = ms.find(x => x.finish);
  if (m) play(m);
}
function play(m) { if (special && special.check && !special.check(m)) return; commit(m); }
$('#diceDock').addEventListener('click', () => { if (canRollNow()) doRoll(); });
$('#btnRoll').onclick = () => {
  if (canRollNow()) { doRoll(); return; }
  const r = curRoll(), st = curState();
  if (r && myTurnHuman() && (!r.n || !E.legalMoves(st, r.n).length)) commit(null);
};
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable)) return;
  if (document.querySelector('.overlay.show, .rsg-ov.show, .grc-ov.show, .pl-ov')) return;
  if (e.key === ' ' || e.key === 'Enter') {
    if (canRollNow()) { e.preventDefault(); if (tg && tg.blur) tg.blur(); doRoll(); return; }
    if (e.key === ' ' && !special && !myTurnHuman()) { e.preventDefault(); navGo('play'); }
    return;
  }
  if (special) return;
  const k = { ArrowLeft: 'prev', ArrowRight: 'next', ArrowDown: 'first', ArrowUp: 'last' }[e.key];
  if (!k) return;
  e.preventDefault(); navGo(k);
});

// ====================================================================== new game / end
function newGame(rated) {
  busyToken++; thinking = 0; animating = false; ken = null; wpPaused = false;
  if (window.SenetLearn) SenetLearn.exitSpecial(true);
  const first = settings.color === 'r' ? (Math.random() < .5 ? 0 : 1) : settings.mode === 'ai' && settings.color === '1' ? 1 : 0;
  rgame = rated || null;
  game = newGameObj(rgame ? 'std' : settings.rule, rgame ? (Math.random() < .5 ? 0 : 1) : first, 0);
  cur = 0; reviewing = false; gameOverShown = false; evalCache.clear(); clockHold = false; clockKey = '';
  if (window.SenetRv) SenetRv.reset();
  hideOverlay('#resultOverlay');
  save(); relayout(); update(); afterPosition();
}
function onGameEnd() {
  if (settings.mode === 'online') { renderInfo(); return; }   // (online-ui.js shows the result)
  const sta = statusAt(game.plies.length);
  if (!sta.over || gameOverShown || cur !== game.plies.length) { renderInfo(); return; }
  gameOverShown = true; game.roll = null; save();
  recordGame(sta);
  const youWin = settings.mode === 'ai' && sta.winner === game.human, aiWin = settings.mode === 'ai' && sta.winner !== game.human;
  snd(aiWin ? 'lose' : 'win');
  $('#resultDisc').innerHTML = `<span class="pdisc p${sta.winner}"></span>`;
  $('#resultTitle').textContent = youWin ? t('res.youWin') : aiWin ? t('res.aiWin') : t('res.pWin', { s: settings.mode === 'watch' ? playerName(sta.winner) : sideName(sta.winner) });
  let sub = t('res.why.' + (sta.why || 'home')) + '<br>' + esc(t('res.sub', { n: game.plies.length, a: homeCount(posAt(game.plies.length), 1 - sta.winner) }));
  if (rgame) { const rx = rtSettle(sta); if (rx) sub += `<br>${rx.pl ? Placement.resHtml(rx.pl) : `<span class="rt-res">R ${rx.old} → <b>${rx.now}</b> (${rtD(rx.d)})</span>`} · ${esc(rtRank(rx.now))}`; }
  else if (settings.mode === 'ai') sub += '<br>' + esc(t('res.vs', { name: LV(settings.level) }));
  $('#resultSub').innerHTML = sub;
  renderInfo();
  const ref = game; setTimeout(() => { if (game === ref && !lesson && !puzzle) showOverlay('#resultOverlay'); }, 800);
}
function recordGame(sta) {
  if (!window.GameRecord || settings.mode === 'watch' || !game.plies.length) return;
  const mode = rgame ? 'rated' : settings.mode === 'pvp' ? 'pvp' : 'ai';
  if (mode === 'pvp') return;
  try { GameRecord.add({ mode, res: sta.winner === game.human ? 'w' : 'l', side: game.first === game.human ? 0 : 1, opp: 'AI ' + LV(levelFor(1)), key: 'ai:' + levelFor(1), n: game.plies.length, why: t('res.why.' + (sta.why || 'home')) }); } catch (e) {}
}
function showOverlay(s) { $(s).classList.add('show'); }
function hideOverlay(s) { $(s).classList.remove('show'); }
$('#btnReview').onclick = () => hideOverlay('#resultOverlay');
$('#btnAgain').onclick = () => { hideOverlay('#resultOverlay'); if (rgame) rtStart(); else newGame(); };
$('#btnResAnalyze').onclick = () => { hideOverlay('#resultOverlay'); if (window.SenetRv) SenetRv.run(); };

// ---- undo (待った): vs the AI twice per game (rated: never); two players: any number; AI vs AI: pause / resume
function canUndo() {
  if (special || ken || !game || rgame || animating) return false;
  if (settings.mode === 'pvp') return game.plies.length > 0 && !overNow();
  if (settings.mode !== 'ai' || game.undoLeft <= 0 || overNow()) return false;
  return game.plies.some(p => p.s === game.human && p.m);
}
function undo() {
  if (wpActive()) { wpToggle(); return; }
  if (!canUndo()) return;
  busyToken++; thinking = 0; animating = false;
  let i = game.plies.length - 1;
  if (settings.mode === 'ai') { while (i >= 0 && !(game.plies[i].s === game.human && game.plies[i].m)) i--; if (i < 0) return; game.undoLeft--; }
  const p = game.plies[i];
  game.plies = game.plies.slice(0, i); game.roll = { d: p.d, n: p.n }; cur = i; reviewing = false; gameOverShown = false;
  if (window.SenetRv) SenetRv.invalidate();
  save(); update(); toast(settings.mode === 'ai' ? t('undo.left', { n: game.undoLeft }) : t('undo.done'));
}
function wpActive() { return settings.mode === 'watch' && !special && !!game; }
function wpRender() { if (!window.WatchPause) return; const on = wpActive() && !overNow(); WatchPause.set($('#btnUndo'), on ? (wpPaused ? 'resume' : 'pause') : null, LANG); if (on) $('#btnUndo').disabled = false; }
function wpToggle() { if (!wpActive() || overNow()) return; wpPaused = !wpPaused; if (wpPaused) { busyToken++; thinking = 0; renderInfo(); } else { cur = game.plies.length; reviewing = false; update(); afterPosition(); } }
// ---- hint
function canHint() { return settings.mode !== 'online' && !special && !ken && !!game && !rgame && atLatest() && !overNow() && myTurnHuman() && !animating; }
function hint() {
  if (!canHint()) return;
  const st = curState(), r = curRoll();
  if (!r) { toast(t('hint.roll')); return; }
  const ev = r.n ? E.evaluate(st, r.n) : [];
  if (!ev.length) { toast(t('hint.none')); return; }
  hintMove = ev[0].move; renderBoard();
  toast(t('hint.best', { m: plyText(st, { s: st.turn, n: r.n, m: ev[0].move }, false), p: Math.round(ev[0].wp * 100) }), 2600);
}
// ---- resign
function canResign() { if (settings.mode === 'online') return typeof olLive === 'function' && olLive(); return !special && !ken && !!game && !overNow() && game.plies.length > 0 && (settings.mode === 'ai' || settings.mode === 'pvp'); }
function resign() {
  if (settings.mode === 'online') { if (typeof olResignAsk === 'function') olResignAsk(); return; }
  if (!canResign()) return;
  const go = () => { busyToken++; thinking = 0; const loser = settings.mode === 'ai' ? game.human : curState().turn; game.end = { winner: 1 - loser, why: 'resign' }; game.roll = null; cur = game.plies.length; reviewing = false; save(); update(); onGameEnd(); };
  if (window.Resign) Resign.confirm({ lang: LANG }).then(ok => { if (ok) go(); }); else if (confirm(t('resign.q'))) go();
}
$('#btnUndo').onclick = undo;
$('#btnHint').onclick = hint;
$('#btnResign').onclick = resign;

// ====================================================================== record navigation
// phones (the strip above the bottom tabs, the landscape box of landtabs.js): the |< < ▶ > >| bar only when it is of use — a
// finished game, a past position on view (a tap in the move list / graph), the replay running, the review box open (PC: always)
function navNeedSync() {
  const rv = document.getElementById('reviewCard');
  const need = !special && !!game && (overNow() || reviewing || !!playTimer || !!ken || !!(rv && rv.classList.contains('show')));
  if (document.body.classList.contains('nav-need') !== need) document.body.classList.toggle('nav-need', need);
}
function stopPlay() { clearInterval(playTimer); playTimer = 0; $('#navPlay').classList.remove('playing'); navNeedSync(); }
function viewAt(i) {
  if (special || !game) return;
  if (ken && window.SenetRv) SenetRv.kenStop();
  i = Math.max(0, Math.min(game.plies.length, i)); if (i === cur && !reviewing) return;
  busyToken++; thinking = 0; animating = false; hintMove = null;
  cur = i; reviewing = i !== game.plies.length;
  update();
  if (!reviewing) afterPosition();
}
function navGo(what) {
  if (special || !game) return;
  if (ken && window.SenetRv) { if (what === 'prev') SenetRv.kenBack(); return; }
  const N = game.plies.length;
  if (what === 'play') {
    if (playTimer) { stopPlay(); return; }
    if (cur >= N) viewAt(0);
    $('#navPlay').classList.add('playing');
    playTimer = setInterval(() => { if (special || cur >= game.plies.length) { stopPlay(); return; } viewAt(cur + 1); }, 900);
    navNeedSync();
    return;
  }
  stopPlay();
  const to = what === 'first' ? 0 : what === 'last' ? N : what === 'prev' ? cur - 1 : cur + 1;
  if (to < 0 || to > N) return;
  viewAt(to);
}
{ const rv = $('#reviewCard'); if (rv) new MutationObserver(() => navNeedSync()).observe(rv, { attributes: true, attributeFilter: ['class'] }); }
$('#navBar').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (b) navGo(b.dataset.n); });
$('#statusBox').appendChild($('#reviewBar'));
$('#btnLatest').onclick = () => viewAt(game.plies.length);
$('#btnResume').onclick = () => { if (rgame || special) { resumeHere(); return; } openNewDialog(true); };   // 「ここから再開」: the settings dialog in resume mode
function resumeHere() {
  if (!reviewing || special || !game) return;
  if (rgame) { viewAt(game.plies.length); return; }
  const p = game.plies[cur];
  game.plies = game.plies.slice(0, cur); game.end = null; game.roll = null; reviewing = false; gameOverShown = false;
  if (window.SenetRv) SenetRv.invalidate();
  save(); update(); afterPosition();
}

// ====================================================================== rated games (solo, placement)
const RT_STORE = STORE + '-rated', RT_START = 1000;
// rating of each AI level: Elo from the engine's self-play against Lv.10 (senet/tools/ladder.js, 500 games per level, 200 for
// Lv.19/20, smoothed to a monotone curve; Lv.10 anchored at 1000). The throw sticks decide much of a game, so the steps are small
const RT_LV = [0, 831, 853, 877, 896, 915, 930, 951, 969, 983, 1000, 1010, 1021, 1035, 1046, 1053, 1063, 1070, 1074, 1078, 1081];
function rtLoad() { let s = null; try { s = JSON.parse(localStorage.getItem(RT_STORE) || 'null'); } catch (e) {} if (!s || typeof s.r !== 'number' || !isFinite(s.r)) s = { r: RT_START, n: 0, w: 0, l: 0, d: 0, hist: [] }; if (!Array.isArray(s.hist)) s.hist = []; return s; }
function rtStore(s) { try { localStorage.setItem(RT_STORE, JSON.stringify(s)); } catch (e) {} }
function rtRank(r) { let k = 0; for (let i = 1; i <= LV_MAX; i++) if (r >= RT_LV[i] - 5) k = i; return k ? LV(k) : t('rt.below'); }
const rtD = d => (d >= 0 ? '+' : '−') + Math.abs(d);
function rtPick(r) {
  { const S0 = rtLoad(); if (window.Placement && Placement.on(S0)) return Placement.pick(S0, RT_LV.map((x, i) => [i, x]).slice(1)); }
  const u = Math.random(), v = Math.random(), off = u < .1 ? 30 + v * 30 : u < .2 ? -(30 + v * 30) : (v * 2 - 1) * 20, target = r + off;   // (the levels lie close together: see RT_LV)
  let lv = 1; for (let i = 1; i <= LV_MAX; i++) if (Math.abs(RT_LV[i] - target) < Math.abs(RT_LV[lv] - target)) lv = i;
  const diff = RT_LV[lv] - r; return { lv, or: RT_LV[lv], tag: diff > 30 ? 'up' : diff < -30 ? 'down' : 'even' };
}
function rtLive() { return !!(rgame && game && !overNow() && !special); }
function rtSettle(sta) {
  const R = rgame; if (!R || !sta.over) return null; if (R.done) return R.done;
  const S = rtLoad(), prev = S.hist.find(h => h.id === R.id); if (prev) { R.done = { old: prev.r - prev.d, now: prev.r, d: prev.d }; return R.done; }
  const sc = sta.winner === game.human ? 1 : 0, old = S.r, pl = window.Placement && Placement.on(S) ? Placement.record(S, R.or, sc) : null;
  const K = S.n < 10 ? 16 : 8, Ex = 1 / (1 + Math.pow(10, (R.or - old) / 400));
  const now = pl ? pl.r : Math.max(0, Math.round(old + K * (sc - Ex)));
  S.r = now; S.n++; if (sc) S.w++; else S.l++;
  S.hist.push({ id: R.id, t: Date.now(), lv: R.lv, or: R.or, s: sc, d: now - old, r: now, why: sta.why });
  if (S.hist.length > 100) S.hist = S.hist.slice(-100);
  rtStore(S); R.done = { old, now, d: now - old, pl }; if (pl && pl.final) Placement.reveal(S, rtRank(now)); save();
  return R.done;
}
function rtStart() {
  if (window.Placement && Placement.gate(rtLoad(), rtStore, () => rtStart())) return;
  const S = rtLoad(), pk = rtPick(S.r);
  settings.mode = 'ai';
  newGame({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), lv: pk.lv, or: pk.or, my: S.r, tag: pk.tag });
  toast(t('rt.vs', { lv: LV(pk.lv), r: pk.or, tag: t('rt.' + pk.tag) }), 3600);
}
function rtStatsHtml() {
  const S = rtLoad(), h = S.hist.slice(-10).reverse();
  let html = `<div class="rt-card" style="margin-top:8px;padding:10px 12px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid var(--line)"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span style="font-size:12px;color:var(--muted)">${esc(t('rt.title'))}</span><b style="font-family:var(--serif);font-size:24px;color:var(--accent)">R ${S.r}</b><span>${esc(rtRank(S.r))}</span>${window.Placement && Placement.on(S) ? Placement.badge(S) : ''}</div>`;
  html += `<div style="font-size:12.5px;color:var(--muted);margin-top:3px">${S.n ? esc(t('rt.rec', { n: S.n, w: S.w, l: S.l })) : esc(t('rt.none'))}</div>`;
  if (window.Placement) html += Placement.note(S);
  if (h.length) html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">` + h.map(x => `<span style="font:11px 'JetBrains Mono',monospace;padding:1px 6px;border-radius:6px;border:1px solid var(--line);color:${x.s ? '#8fe3b8' : '#ff9b90'}">${x.s ? 'W' : 'L'} ${rtD(x.d)}</span>`).join('') + '</div>';
  return html + '</div>';
}
// leaving a rated game in progress asks first (the game is then lost)
const RT_GUARD = '#btnNew, #btnLesson, #btnPuzzle, #btnStart';
let rtPass = false;
document.addEventListener('click', e => {
  if (rtPass || !rtLive() || !game.plies.length) return;
  const b = e.target.closest && e.target.closest(RT_GUARD); if (!b || b.disabled) return;
  e.preventDefault(); e.stopImmediatePropagation();
  $('#rtConfirmText').textContent = t('rt.abandonQ'); $('#rtConfirmYes').textContent = t('rt.abandonYes');
  showOverlay('#rtConfirm');
  $('#rtConfirmYes').onclick = () => { hideOverlay('#rtConfirm'); busyToken++; game.end = { winner: 1 - game.human, why: 'abandon' }; game.roll = null; save(); const sta = statusAt(game.plies.length); recordGame(sta); const x = rtSettle(sta); gameOverShown = true; if (x) toast(t('rt.abandoned', { o: x.old, n: x.now, d: rtD(x.d) }), 3000); update(); rtPass = true; try { b.click(); } finally { rtPass = false; } };
}, true);
$('#rtConfirmNo').onclick = () => hideOverlay('#rtConfirm');

// ====================================================================== new-game dialog
let draft = {};
// the variant's art: the real board with its start (the pieces on 1–10 / 1–14) and the reverse-S track as a glowing arrow
const artCache = new Map();   // (the cards are redrawn on every change: the board pictures are made once per design)
function ruleArt(r) {
  const k = r + '|' + (draft.design || settings.design) + '|' + (draft.pieces || settings.pieces);
  if (!artCache.has(k)) artCache.set(k, B2.mini(E.newGame(r, 0), { design: draft.design || settings.design, pieces: draft.pieces || settings.pieces, crop: 'board', trays: false, marks: [{ type: 'path', from: 1, to: 30, color: '#ffe27a', dash: '2 14' }] }));
  return artCache.get(k);
}
function levelLabelHTML(v) { return `${esc(LV(v))}<small>${esc(LVD(v))}</small>`; }
function segSync() {
  $$('#segMode button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.mode));
  $$('#segColor button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.color));
  $$('#segClock button').forEach(b => b.classList.toggle('sel', +b.dataset.v === +draft.clock));
  $$('#segSpeed button').forEach(b => b.classList.toggle('sel', +b.dataset.v === +draft.speed));
  const m = draft.mode, rated = m === 'rated';
  $('#fRatedInfo').classList.toggle('hidden', !rated);
  if (rated) $('#rtStats').innerHTML = rtStatsHtml();
  $('#fRules').classList.toggle('hidden', rated);
  $('#fColor').classList.toggle('hidden', m !== 'ai');
  $('#fLevel').classList.toggle('hidden', rated || m === 'pvp');
  $('#fLevel2').classList.toggle('hidden', m !== 'watch');
  $('#fClock').classList.toggle('hidden', m === 'watch' || rated);
  $('#levelLabel').textContent = m === 'watch' ? t('ng.level1') : t('ng.level');
  $('#levelRange').value = draft.level; $('#levelName').innerHTML = levelLabelHTML(draft.level);
  $('#levelRange2').value = draft.level2; $('#levelName2').innerHTML = levelLabelHTML(draft.level2);
  // the variant cards in the shared form (shared/ngtabs.js: art, name, the standard tag + description, the pick mark, ルール)
  const rc = $('#ruleCards'), html = RULES.map(r => `<button type="button" class="ngt-gcard${draft.rule === r ? ' sel' : ''}" data-v="${r}"><span class="gart">${ruleArt(r)}</span><b>${esc(t('rule.' + r))}</b><p>${r === 'std' ? `<span class="gtag">${esc(t('tag.std'))}</span>` : ''}${esc(t('rule.' + r + '.d'))}</p><span class="gpick"></span></button>`).join('');
  if (rc.__h !== html) { rc.__h = html; rc.innerHTML = html; }   // (unchanged: the cards stay as they are — no flicker)
  $('#fRules').classList.toggle('hidden', rated || !!draft.resume);
  $('#optAutoRoll').checked = !!draft.autoRoll; $('#optAutoPick').checked = !!draft.autoPick; $('#optEval').checked = !!draft.eval; $('#optLast').checked = !!draft.last; $('#optDanger').checked = !!draft.danger;
  $('#btnStart').textContent = t('start');
}
function designPickers() {
  const st = { rule: 'std', pos: [[3, 9, 14, 21, 26], [5, 8, 12, 15, 27]], turn: 0, winner: -1 };
  $('#bdRow').innerHTML = B2.BOARDS.map(d => `<button type="button" data-v="${d}" class="${draft.design === d ? 'sel' : ''}">${B2.mini(st, { design: d, pieces: draft.pieces, crop: 'board', trays: false })}<span>${esc(t('bd.' + d))}</span></button>`).join('');
  $('#pcRow').innerHTML = B2.PIECES.map(p => `<button type="button" data-v="${p}" class="${draft.pieces === p ? 'sel' : ''}"><span class="pp">${B2.pieceIcon(0, p, 46)}${B2.pieceIcon(1, p, 46)}</span><span>${esc(t('pcs.' + p))}</span></button>`).join('');
}
function openNewDialog(resume) {
  draft = { resume: !!resume, mode: rgame ? 'rated' : settings.mode, rule: settings.rule, color: settings.color, level: settings.level, level2: settings.level2, clock: settings.clock, speed: settings.speed, autoRoll: settings.autoRoll, autoPick: settings.autoPick, eval: settings.eval, last: settings.last, danger: settings.danger, design: settings.design, pieces: settings.pieces };
  if (resume && !['ai', 'pvp', 'watch'].includes(draft.mode)) draft.mode = 'ai';
  if (resume) { draft.color = String(game.human || 0); if (rgame) draft.mode = 'ai'; }
  segSync(); designPickers();
  // 「この局面から再開」: the same dialog, only what fits going on from this position (shared/resumeng.js)
  if (window.ResumeNG) { if (resume) ResumeNG.open({ modes: ['ai', 'pvp', 'watch'], seg: '#segMode', hide: '#fRules' }); else ResumeNG.close(); }
  showOverlay('#newOverlay');
}
// the ルール button on each variant card (shared/ngtabs.js): the rules tutorial from its first page
$('#ruleCards').ngtRules = () => { if (window.SenetLearn) SenetLearn.openRules(0); };
$('#segMode').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.mode = b.dataset.v; segSync(); };
$('#segColor').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.color = b.dataset.v; segSync(); };
$('#segClock').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.clock = +b.dataset.v; segSync(); };
$('#segSpeed').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.speed = +b.dataset.v; segSync(); };
$('#ruleCards').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.rule = b.dataset.v; segSync(); };
$('#levelRange').oninput = e => { draft.level = +e.target.value; $('#levelName').innerHTML = levelLabelHTML(draft.level); };
$('#levelRange2').oninput = e => { draft.level2 = +e.target.value; $('#levelName2').innerHTML = levelLabelHTML(draft.level2); };
[['optAutoRoll', 'autoRoll'], ['optAutoPick', 'autoPick'], ['optEval', 'eval'], ['optLast', 'last'], ['optDanger', 'danger']].forEach(([id, k]) => { $('#' + id).onchange = e => { draft[k] = e.target.checked; }; });
$('#bdRow').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.design = b.dataset.v; designPickers(); };
$('#pcRow').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.pieces = b.dataset.v; designPickers(); };
$('#btnCancelNew').onclick = () => hideOverlay('#newOverlay');
$('#btnStart').onclick = () => {
  hideOverlay('#newOverlay');
  const rated = draft.mode === 'rated';
  for (const k of ['rule', 'color', 'level', 'level2', 'clock', 'speed', 'autoRoll', 'autoPick', 'eval', 'last', 'danger']) settings[k] = draft[k];
  if (!rated) settings.mode = draft.mode;
  setDesign(draft.design, draft.pieces);
  if (draft.resume) { resumeWith(); return; }
  if (rated) rtStart(); else newGame();
};
// the player-row discs (.pdisc) show the chosen pieces: the same picture as on the board, as a CSS image
function discs(p) {
  try { const st = document.documentElement.style; [0, 1].forEach(k => st.setProperty('--pd' + k, `url("data:image/svg+xml,${encodeURIComponent(B2.pieceIcon(k, p, 44))}")`)); } catch (e) {}
}
function setDesign(d, p) {
  const ch = d !== settings.design || p !== settings.pieces;
  settings.design = d; settings.pieces = p; save();
  document.documentElement.dataset.pcs = p; document.documentElement.dataset.bd = d; discs(p);
  if (ch && view) { view.setDesign(d, p); if (dice2d) dice2d.setStyle(p); bindHover(); renderAll(); }
  if (window.SenetTour && SenetTour.setDesign) try { SenetTour.setDesign(d, p); } catch (e) {}
}
$('#btnNew').onclick = () => {
  if (special && window.SenetLearn) { SenetLearn.exitSpecial(); }
  if (game && game.plies.length && !overNow() && !rgame && settings.mode !== 'watch') { $('#rsText').textContent = t('rs.playing', { n: game.plies.length }); showOverlay('#resumeOverlay'); return; }
  openNewDialog();
};
$('#rsCancel').onclick = () => hideOverlay('#resumeOverlay');
$('#rsRestart').onclick = () => { hideOverlay('#resumeOverlay'); openNewDialog(); };
$('#rsResume').onclick = () => { hideOverlay('#resumeOverlay'); openNewDialog(true); };   // the settings dialog in resume mode
// going on from the shown (or latest) position with the mode / side / strength chosen in the resume dialog
function resumeWith() {
  busyToken++; thinking = 0; animating = false; wpPaused = false;
  if (settings.mode === 'ai' && settings.color !== 'r') game.human = settings.color === '1' ? 1 : 0;
  hideOverlay('#resultOverlay');
  if (reviewing) resumeHere(); else { gameOverShown = false; save(); relayout(); update(); afterPosition(); }
}

// ====================================================================== online: online.js (SenetOnline) + online-ui.js (the dock / tab, the
// lobby, the online game on this board); its hooks here are the settings.mode === 'online' branches

// ====================================================================== layout
let lastO = '', lastPC = null;
function relayout(force) {
  const o = orient(), pc = mqPC.matches;
  document.documentElement.classList.toggle('bv', o === 'v');
  if (view && (o !== view.orient() || force)) { view.setOrient(o); bindHover(); }
  // players: PC — in the info row; elsewhere — the opponent above the board, you (and the status / roll box) below it
  const ba = $('#boardArea'), fr = $('#frame'), col = $('#plCol'), pl = $('#players'), sb = $('#statusBox');
  const me = game ? (settings.mode === 'ai' || settings.mode === 'online' ? game.human : 0) : 0;
  const ev = $('#evalCard'), rb = $('#reviewBar');
  // the review bar (ここから再開 / 最新の局面へ): PC — under the player cards (the status box is not shown there); else in the status box
  if (pc) { if (pl.parentElement !== col) { col.prepend(pl); pl.appendChild($('#pl0')); pl.appendChild($('#pl1')); col.appendChild(sb); } if (ev.parentElement !== col) col.appendChild(ev); }
  else {
    if (ev.parentElement === col) $('#coachCard').parentElement.insertBefore(ev, $('.kifu-card'));
    ba.insertBefore($('#pl' + (1 - me)), fr); fr.after($('#pl' + me)); $('#pl' + me).after(sb);
  }
  // (phones held upright: in your card, in place of the dice strip — the dice are not needed while looking back)
  if (pc) { if (rb.previousElementSibling !== pl) pl.after(rb); }
  else if (phone()) { const hm = $('#pl' + me); if (rb.parentElement !== hm) hm.appendChild(rb); }
  else if (rb.parentElement !== sb) sb.appendChild(rb);
  pl.classList.toggle('hidden', !pc);
  lastO = o; lastPC = pc;
  requestAnimationFrame(() => { placeDice(); renderBoard(); });
}
mqPC.addEventListener ? mqPC.addEventListener('change', () => relayout()) : mqPC.addListener(() => relayout());
mqV.addEventListener ? mqV.addEventListener('change', () => relayout()) : mqV.addListener(() => relayout());
mqL.addEventListener ? mqL.addEventListener('change', () => relayout()) : mqL.addListener(() => relayout());
addEventListener('resize', () => { if (orient() !== lastO) relayout(); else placeDice(); });
if (window.ResizeObserver) new ResizeObserver(() => placeDice()).observe($('#frame'));

// ====================================================================== dialogs: outside click, title, tabs
function dismissOverlay(o) {
  const OUT = { newOverlay: '#btnCancelNew', resultOverlay: '#btnReview', puzzleOverlay: '#pzClose', resumeOverlay: '#rsCancel', olOverlay: '#olClose', rtConfirm: '#rtConfirmNo', landTipOverlay: '#lpKeep' };
  if (o.id === 'rulesOverlay') { if (window.SenetLearn) SenetLearn.closeRules(); else o.classList.remove('show'); return; }
  if (o.id === 'lessonOverlay') { const b = $('#lessonDoneView:not(.hidden)') ? $('#btnLessonQuit2') : $('#btnLessonClose'); if (b) b.click(); return; }
  const b = OUT[o.id] && $(OUT[o.id]); if (b) b.click(); else o.classList.remove('show');
}
$$('.overlay').forEach(o => { let down = false; o.addEventListener('pointerdown', e => { down = e.target === o; }); o.addEventListener('click', e => { if (e.target !== o || !down) return; down = false; dismissOverlay(o); }); });
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; const o = $('.overlay.show'); if (o) dismissOverlay(o); });
$('.brand h1').addEventListener('click', () => { $$('.overlay.show').forEach(o => dismissOverlay(o)); if (special && window.SenetLearn) SenetLearn.exitSpecial(); scrollTo({ top: 0, behavior: 'smooth' }); });
$('#btnSound').onclick = () => { settings.sound = !settings.sound; try { localStorage.setItem('atlas-sfx', settings.sound ? '1' : '0'); } catch (e) {} $('#btnSound').classList.toggle('on', settings.sound); save(); if (settings.sound) snd('place'); };
$('#langSel').onchange = e => {
  LANG = e.target.value; settings.lang = LANG; save(); try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {}
  applyI18n(); kifuKey = ''; renderAll();
  if ($('#newOverlay').classList.contains('show')) { segSync(); designPickers(); }
  if (HB) HB.relabel();
  if (window.SenetCoach) SenetCoach.relabel();
  if (window.GameRecord && GameRecord.relabel) GameRecord.relabel();
  if (window.SenetLearn) SenetLearn.relang();
};

// ====================================================================== boot
const hadSave = load();
try { const sp = localStorage.getItem('atlas-sfx'); if (sp === '0' || sp === '1') settings.sound = sp === '1'; } catch (e) {}
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) { LANG = q; try { localStorage.setItem('aicoding-lang', q); } catch (e) {} } }
if (!game) { game = newGameObj(settings.rule, 0, 0); cur = 0; }
applyI18n();
$('#btnSound').classList.toggle('on', settings.sound);
buildView();
if (window.CountTick) { CountTick.setMuted(() => !settings.sound); }
if (window.RulesOffer) RulesOffer.init({ game: GID, lang: () => LANG, open: () => window.SenetLearn && SenetLearn.openRules(0), watch: '#rulesOverlay' });
if (window.GameRecord) GameRecord.init({ game: GID, lang: () => LANG, menu: '.controls', sides: () => [t('first'), t('second')], variant: () => ({ k: game.rule, n: t('rule.' + game.rule) }), variants: () => RULES, variantName: k => t('rule.' + k), defVariant: 'std' });
if (window.SenetCoach) SenetCoach.init();
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnResign', '#btnHint', '#btnRules', '#btnLesson', '#btnPuzzle'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => relayout(true));
if (window.RecordExport) RecordExport.attach({ btn: '#btnShare', key: GID, title: t('meta.title'), lang: () => LANG, toast: m => toast(m), empty: () => !game.plies.length,
  formats: () => [{ id: 'txt', label: t('fmt.txt'), ext: 'txt', meta: 'self', text: () => recordText() }],
  sides: () => [{ label: sideName(0), name: playerName(0), tag: 'Light' }, { label: sideName(1), name: playerName(1), tag: 'Dark' }] });
$('#btnCopy').onclick = () => { if (!game.plies.length) { toast(t('kifu.empty')); return; } const tx = recordText(); (navigator.clipboard ? navigator.clipboard.writeText(tx) : Promise.reject()).then(() => toast(t('copied'))).catch(() => toast(t('copied'))); };
relayout(true);
update();
if (hadSave) { if (overNow()) gameOverShown = true; afterPosition(); }
// expose for tests / other modules
window.__senet = { get game() { return game; }, get cur() { return cur; }, settings, newGame, doRoll, commit, curState, curRoll, viewAt, rtStart, openNewDialog, get busy() { return animating || thinking; }, overNow, statusAt, posAt, line };
// ====================================================================== landscape option (phones, as fanorona / backgammon)
// The option turns the phone's screen even with the rotation locked: real fullscreen + orientation lock where the browser
// allows it (Android), otherwise the page reloads into a wrapper (index.html) that shows the game in an iframe turned 90°,
// so the game inside sees a real landscape viewport (the phone landscape layout of landtabs.js: the board across with its
// 12-square block on the left; hit testing and touches stay correct). window.__EMBED: this page is the turned copy.
const LAND_KEY = STORE + '-landscape', LAND_SKIP = STORE + '-landtip-skip';
const landOn = () => { try { return localStorage.getItem(LAND_KEY) === '1'; } catch (e) { return false; } };
const landCoarse = () => matchMedia('(pointer: coarse)').matches;
function renderLandBtn() { const b = $('#btnLand'); if (b) b.classList.toggle('on', landOn()); }
function landSkipNext() { try { sessionStorage.setItem(LAND_SKIP, '1'); } catch (e) {} }   // no tip right after the button reloaded the page
async function setLand(want) {
  try { localStorage.setItem(LAND_KEY, want ? '1' : '0'); } catch (e) {}
  renderLandBtn(); landSkipNext();
  toast(t(want ? 'land.on' : 'land.off'), 1100);
  if (want) {
    if (innerWidth > innerHeight) return;   // already held sideways (the wrapper takes over on the next visit)
    let locked = false;
    try {
      if (document.documentElement.requestFullscreen && screen.orientation && screen.orientation.lock) {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        await Promise.race([screen.orientation.lock('landscape'), sleep(1500).then(() => { throw new Error('lock timeout'); })]);
        await sleep(700); locked = innerWidth > innerHeight;   // some browsers resolve the lock without turning: trust only a turned viewport
      }
    } catch (e) {}
    if (!locked) { try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) {} setTimeout(() => location.reload(), 350); }   // iOS etc.: the turned iframe
  } else {
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (e) {}
    if (window.__EMBED && window.top !== window) setTimeout(() => window.top.location.reload(), 350);
  }
}
$('#btnLand').onclick = () => setLand(!landOn());
if (window.__EMBED) document.querySelectorAll('a.home, a.series').forEach(a => { a.target = '_top'; });
renderLandBtn();
// tip for phone users held upright: landscape play exists (every visit while the option is off; queued behind any dialog)
{
  const skip = (() => { try { const v = sessionStorage.getItem(LAND_SKIP) === '1'; sessionStorage.removeItem(LAND_SKIP); return v; } catch (e) { return false; } })();
  const wanted = () => !skip && !window.__EMBED && !landOn() && landCoarse() && innerHeight > innerWidth;
  const pulse = () => { const b = $('#btnLand'); b.classList.add('pulse'); setTimeout(() => b.classList.remove('pulse'), 4500); };
  const closeTip = on => { hideOverlay('#landTipOverlay'); if (on) setLand(true); else setTimeout(pulse, 250); };
  $('#lpKeep').onclick = () => closeTip(false);
  $('#lpOn').onclick = () => closeTip(true);
  if (wanted()) {
    const iv = setInterval(() => {
      if (!wanted()) { clearInterval(iv); return; }
      if (document.querySelector('.overlay.show') || lesson || puzzle || document.hidden) return;
      clearInterval(iv);
      document.body.classList.toggle('no-anim', !animOn());
      showOverlay('#landTipOverlay');
    }, 700);
  }
}
