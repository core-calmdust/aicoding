/* patolli/app.js — パトリ（Patolli）本体：対局（AI／二人／AI同士／レート戦）、豆を投げる、盤の操作、宝（賭け）の支払い、棋譜、
   形勢グラフ、振り返り、ヒント・待った・投了・持ち時間、設定ダイアログ、オンライン（準備中）。ur/app.js を土台にした移植。
   レッスン・パズル・ルールは app-learn.js、コーチは coach.js、PC の振り返りボックスは rvbox.js。
   エンジン：engine.js（window.PatolliEngine）、2D：board2d.js（window.PatolliBoard2D）、AI は worker.js（Web Worker）。
   仕様：claude/patolli-spec.md */
'use strict';
const E = window.PatolliEngine, B2 = window.PatolliBoard2D;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-patolli';
const GID = 'patolli';
const RULES = ['bell', 'popular'];
const SUPPORTED = ['ja', 'en'];   // 言語メニューに出すのは、このゲームの文言がそろった言語だけ（残り12言語は i18n.js に足してからここへ）
const LV_MAX = 20;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ====================================================================== settings / i18n
const settings = { pro: null, pro2: null, mode: 'ai', rule: 'bell', dir: 'same', color: '0', level: 6, level2: 12, clock: 0, fis: '5+3', speed: 2, autoRoll: false, autoPick: true, eval: true, last: true, danger: true, coach: true, sound: true, design: 'petate', pieces: 'pebble', lang: '' };
function detectLang() {
  const n = (navigator.language || 'ja').toLowerCase();
  if (n.startsWith('zh')) return /^zh-(tw|hk|mo)\b|^zh-hant/.test(n) ? 'zh-TW' : 'zh';   // zh-TW / zh-HK / zh-Hant* → 繁體
  return SUPPORTED.find(c => c !== 'zh-TW' && n.startsWith(c.toLowerCase())) || 'en';
}
let LANG = detectLang();
const AIW = () => ({ ru: 'ИИ', tr: 'YZ' })[LANG] || 'AI';   // the word "AI" in displayed player labels (ru / tr use their own abbreviation; saved records keep 'AI')
function t(k, v) {
  let x = (I18N[LANG] || I18N.en)[k]; if (x === undefined) x = I18N.en[k]; if (x === undefined) x = I18N.ja[k]; if (x === undefined) return k;
  if (v && typeof x === 'string') x = x.replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : '');
  return x;
}
window.t = t;
const sideName = s => { const a = t('pn.' + settings.pieces); return Array.isArray(a) ? a[s ? 1 : 0] : t(s ? 'side1' : 'side0'); };   // 駒のデザインに合わせた呼び名（赤／青 など）
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
  $('#rollPill').textContent = t('rollPill');
  document.documentElement.dataset.pcs = settings.pieces;
  $$('#navBar button').forEach(b => { b.title = t('nav.' + b.dataset.n); });
}

// ====================================================================== game state
// ply = { s: 手番, d: [豆5個 0|1], n: 進む数, m: {from,to} | null（パス）, ag: もう一度 }
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
function newGameObj(rule, first, human, dir) { return { rule, first, human, dir: dir || [1, 1], plies: [], roll: null, undoLeft: 2, end: null, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }; }
const line = () => ken ? game.plies.slice(0, ken.base).concat(ken.plies) : game.plies;
let posCache = { key: '', list: [] };
function fullMove(st, m, n) { if (!m) return null; return E.legalMoves(st, n != null ? n : m.to - m.from).find(x => x.from === m.from) || null; }
function posAt(i) {
  const L = line(), key = game.rule + game.first + game.dir.join('') + '|' + (ken ? 'k' + ken.base + ':' : '') + L.length;
  if (posCache.key !== key || posCache.L !== L || posCache.n !== L.length) {
    const list = [E.newGame(game.rule, { first: game.first, dir: game.dir })];
    for (const p of L) { const st = list[list.length - 1], fm = fullMove(st, p.m, p.n); list.push(E.apply(st, fm, p.n).state); }
    posCache = { key, L, n: L.length, list };
  }
  return posCache.list[Math.max(0, Math.min(i, posCache.list.length - 1))];
}
const lineLen = () => line().length;
function statusAt(i) {
  const st = posAt(i);
  if (st.winner >= 0) return { over: true, winner: st.winner, why: E.RULES[st.rule].rounds ? 'broke' : 'home' };
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
// 宝の支払いを見せている間は、宝の数だけ払う前の数で描く（commit の showEvents）
let payView = null;
const shownState = () => { const st = curState(); return payView && payView.tok === busyToken && st ? Object.assign({}, st, { gold: payView.gold, pool: payView.pool }) : st; };
// レースの残り（全部上げるまでのマスの数）と、中央で取られる確率（広く知られたルールだけ）
function race(st) { const R = E.RULES[st.rule]; return { pips: [0, 1].map(s => st.pos[s].reduce((a, i) => a + (i > R.L ? 0 : R.goal - i), 0)) }; }
function hitRisk(st, side) {
  const R = E.RULES[st.rule], out = st.pos[side].map(() => 0); if (!R.capture) return out;
  const s2 = E.clone(st), op = 1 - side; s2.turn = op;
  for (let k = 1; k < E.STEPS.length; k++) {
    const hit = new Set();
    for (const m of E.legalMoves(s2, E.STEPS[k])) { if (!m.capture) continue; const q = E.qOf(R, op, m.to, s2.dir[op]); st.pos[side].forEach((i, x) => { if (i >= 1 && i <= R.L && E.qOf(R, side, i, st.dir[side]) === q) hit.add(x); }); }
    hit.forEach(x => { out[x] += E.PROB[k]; });
  }
  return out;
}
const curRoll = () => special ? (special.n != null ? { d: special.dice, n: special.n } : null) : ken ? ken.roll : (atLatest() ? game.roll : null);
function setRoll(r) { if (special) { special.n = r ? r.n : null; special.dice = r ? r.d : null; } else if (ken) ken.roll = r; else game.roll = r; }

// ====================================================================== save / load
function save() {
  if (settings.mode === 'online') { if (typeof olSaveLocal === 'function') olSaveLocal(); return; }   // (the online game is not saved here: the local one is kept)
  try {
    const d = { v: 1, settings, game: game && !special ? { rule: game.rule, first: game.first, human: game.human, dir: game.dir, plies: game.plies, roll: game.roll, undoLeft: game.undoLeft, end: game.end, id: game.id, fz: game.fz || null, mode: settings.mode, level: settings.level, level2: settings.level2 } : null, rgame };
    localStorage.setItem(STORE, JSON.stringify(d));
  } catch (e) {}
}
function load() {
  let d = null; try { d = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
  if (d && d.settings) for (const k in settings) if (k in d.settings) settings[k] = d.settings[k];
  if (!RULES.includes(settings.rule)) settings.rule = 'bell';
  if (!B2.BOARDS.includes(settings.design)) settings.design = 'petate';
  if (!B2.PIECES.includes(settings.pieces)) settings.pieces = 'pebble';
  if (d && d.game && Array.isArray(d.game.plies)) {
    game = Object.assign(newGameObj(RULES.includes(d.game.rule) ? d.game.rule : 'bell', d.game.first || 0, d.game.human || 0, d.game.dir), d.game);
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
  roll() { for (let i = 0; i < 5; i++) noise(.04, .1, 1800 + Math.random() * 1400, i * .05 + Math.random() * .03); },
  coin() { [1568, 2093].forEach((f, i) => tone(f, 0, .22, .035, 'triangle', i * .06)); noise(.03, .08, 4200); },
  dieHit(k = 1) { noise(.035, .13 * k, 2300 + Math.random() * 1500); if (k > .8) tone(1500 + Math.random() * 500, 0, .03, .012 * k, 'triangle'); },
  place() { noise(.06, .22, 1500); tone(420, 260, .08, .05, 'triangle'); },
  cap() { noise(.12, .28, 700); tone(220, 90, .22, .09, 'sine'); },
  rosette() { [659.3, 987.8].forEach((f, i) => tone(f, 0, .5, .045, 'sine', i * .09)); },
  pass() { tone(330, 247, .28, .04, 'sine'); },
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
// AI の手・ヒント・振り返りは worker.js（engine.js を読み込んだ Worker）で考える。Worker が使えなければこのページで考える
let aiW = null, jobSeq = 0;
const jobs = new Map();
function worker() {
  if (aiW === false) return null;
  if (!aiW) { try { aiW = new Worker('worker.js?v=1'); aiW.onmessage = e => { const d = e.data, j = jobs.get(d.id); if (j) j(d); }; aiW.onerror = () => { aiW = false; jobs.forEach(j => j({ error: 'worker' })); }; } catch (e) { aiW = false; return null; } }
  return aiW;
}
const thinkHere = (st, n, level, cfg) => { const m = cfg ? E.think(st, n, 20, { d: cfg.d, temp: cfg.temp }) : E.think(st, n, level); return m ? { from: m.from, to: m.to } : null; };
function think(st, n, level, cfg) {   // cfg＝PROモードの { d: 先を読む投げの数, temp: 手のばらつき }
  return new Promise(res => {
    const w = worker();
    if (!w) { setTimeout(() => res(thinkHere(st, n, level, cfg)), 30); return; }
    const id = ++jobSeq; jobs.set(id, d => { jobs.delete(id); res(d.error ? thinkHere(st, n, level, cfg) : d.move); });
    w.postMessage({ id, type: 'think', state: E.clone(st), n, level, cfg: cfg || null });
  });
}
// その局面・その目の全部の手の勝率（良い順。depth 投げ先まで読む）
function evalJob(st, n, depth) {
  const here = () => E.evaluate(st, n, Math.min(depth, 1));
  return new Promise(res => {
    const w = worker();
    if (!w) { res(here()); return; }
    const id = ++jobSeq; jobs.set(id, d => { jobs.delete(id); res(d.error ? here() : d.ev.map(x => ({ move: fullMove(st, x, n), wp: x.wp })).filter(x => x.move)); });
    w.postMessage({ id, type: 'eval', state: E.clone(st), n, d: depth });
  });
}
function reviewJob(list, onProg) {
  return new Promise(res => {
    const w = worker();
    const here = () => { list.forEach((q, i) => onProg(i, { ev: q.n ? E.evaluate(q.state, q.n, 1).map(x => ({ from: x.move.from, to: x.move.to, wp: x.wp })) : [], wp0: E.winProb(q.state, 1) })); res(); };
    if (!w) { here(); return; }
    const id = ++jobSeq; jobs.set(id, d => { if (d.error) { jobs.delete(id); here(); } else if (d.type === 'progress') onProg(d.i, d.res); else { jobs.delete(id); res(); } });
    w.postMessage({ id, type: 'review', list });
  });
}

// ====================================================================== board / dice view
const mqPC = matchMedia(window.HeaderBar ? HeaderBar.MEDIA : '(hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4)');
const mqV = matchMedia('(pointer: coarse) and (max-width: 760px) and (orientation: portrait)');
const phone = () => mqV.matches;
const orient = () => 's';   // 盤は正方形（X を正方形に収める）。向きの切り替えはない
const animOn = () => settings.speed > 0;
const SPD = () => [3, .7, 1, 1.8][settings.speed] || 1;
const trayLabel = k => k === 'pool' ? t('tray.pool') : k === 'gold0' || k === 'gold1' ? (!special && settings.mode === 'ai' && game && +k.slice(4) === game.human ? t('tray.goldYou') : t('tray.gold', { s: sideName(+k.slice(4)) })) : t('tray.' + k);
function buildView() {
  view = B2.mount($('#board'), { trayLabel, design: settings.design, pieces: settings.pieces, speed: SPD() });
  view.on('cell', e => onCell(e)).on('tray', e => onTray(e));
  bindHover();
  dice2d = null;
  document.documentElement.dataset.pcs = settings.pieces; document.documentElement.dataset.bd = settings.design;
}
function bindHover() {
  const svg = view.svg(); if (!svg || svg.__hov) return; svg.__hov = true;
  svg.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const g = e.target.closest && e.target.closest('.pt-pc, .pt-trayb'); hoverAt(g); });
  svg.addEventListener('pointerleave', () => hoverAt(null));
}
let hoverMove = null;
function hoverAt(g) {
  let mv = null;
  if (g) {
    const st = curState(), r = curRoll();
    if (r && r.n && myTurnHuman()) {
      const ms = E.legalMoves(st, r.n);
      if (g.classList.contains('pt-pc')) { if (+g.dataset.side === st.turn) mv = ms.find(m => m.from === +g.dataset.pos) || null; }
      else if (g.dataset.kind === 'start' && +g.dataset.side === st.turn) mv = ms.find(m => m.from === 0) || null;
    }
  }
  if ((mv && mv.from) !== (hoverMove && hoverMove.from)) { hoverMove = mv; renderBoard(); }
}
const band = () => false;
function placeDice() {}   // 豆を投げる場所は盤の左のすき間に固定（index.html の .dice-dock）

function lastMarks() {
  if (special) return special.last || null;
  if (!settings.last || cur === 0) return null;
  const L = line(), p = L[cur - 1]; if (!p || !p.m) return null;
  const st = posAt(cur - 1);
  return moveMarks(st, p.s, p.m, posAt(cur));
}
function moveMarks(st, side, m, after) {
  const rl = E.RULES[st.rule];
  const from = m.from === 0 ? { tray: 'start', side, slot: Math.max(0, st.pos[side].filter(p => p === 0).length - 1) } : rcOf(st, side, m.from);
  let to;
  if (m.to >= rl.goal) { const done = after && after.round === st.round ? after.pos[side].filter(p => p >= rl.goal).length : st.pos[side].filter(p => p >= rl.goal).length + 1; to = { tray: 'goal', side, slot: Math.max(0, done - 1) }; }
  else to = rcOf(st, side, m.to);
  return { from, to };
}
function rcOf(st, side, i) { const c = E.coords(st.rule, side, i, st.dir ? st.dir[side] : 1); return c ? { r: c[0], c: c[1] } : null; }
function targetsFor(st, ms) {
  const rl = E.RULES[st.rule];
  return ms.map(m => m.to >= rl.goal ? { tray: 'goal', side: st.turn, slot: st.pos[st.turn].filter(p => p >= rl.goal).length } : Object.assign(rcOf(st, st.turn, m.to), { capture: m.capture }));
}
let hintMove = null, coachHover = null;
function renderBoard() {
  if (!view) return;
  const st = shownState(); if (!st) return;
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
  // 危険の表示（コーチON・広く知られたルール）：中央のマスにいて、次の相手の番で取られるかもしれない自分の駒
  if (!special && settings.danger && window.PatolliCoach && PatolliCoach.active() && !overNow() && atLatest() && E.RULES[st.rule].capture) {
    const me = settings.mode === 'pvp' ? st.turn : game.human, rl = E.RULES[st.rule], risk = hitRisk(st, me);
    st.pos[me].forEach((p, k) => { if (p > 0 && p < rl.goal && risk[k] > 0.005) { const c = rcOf(st, me, p); opt.marks.push({ r: c.r, c: c.c, type: 'danger', text: Math.round(risk[k] * 100) + '%' }); } });
  }
  view.render(st, opt);
  skinSync();
}
function renderDice() {
  const r = curRoll(), dock = $('#diceDock');
  if (!dice2d) dice2d = B2.dice($('#diceHost'), { speed: SPD() });
  if (r) dice2d.show(r.d); else if (!dice2d.shown) dice2d.show([0, 0, 0, 0, 0]);   // 手のあとも、豆は落ちたまま置いておく
  const canRoll = canRollNow();
  dock.classList.toggle('can', canRoll);
  dock.classList.toggle('dim', !r && !canRoll);
  $('#diceCap').textContent = r ? t('dice.n', { n: r.n }) : '';
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
  if (!special && game && !overNow() && atLatest()) { const rc = race(curState()); extra = t('tip.race', { a: rc.pips[side], b: rc.pips[1 - side] }); }
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

// ====================================================================== 3D skin hooks
// 3D（大百科フル機能版 ?skin=atlas）は別作業。window.PatolliSkin3D があればその関数を使い、なければ2Dの演出（ur と同じ形の受け口）
function skinSync() { const S = window.PatolliSkin3D; if (S && S.sync) { try { S.sync(curState(), view); } catch (e) { console.error(e); } } }
window.PatolliSkinHooks = {
  sync: st => { const S = window.PatolliSkin3D; if (S && S.sync) S.sync(st || curState(), view); },
  async animateMove(side, from, to, info) {
    const S = window.PatolliSkin3D;
    if (S && S.animateMove) { try { await S.animateMove(side, from, to, info || {}); return; } catch (e) { console.error(e); } }
    if (animOn()) await view.animateMove(side, from, to, Object.assign({ speed: SPD() }, info || {}));
  },
  async animateRoll(d) {
    const S = window.PatolliSkin3D;
    if (S && S.animateRoll) { try { await S.animateRoll(d); dice2d.show(d); return; } catch (e) { console.error(e); } }
    if (!dice2d) renderDice();
    if (!animOn()) { dice2d.show(d); return; }
    const dock = $('#diceDock'); dock.classList.add('rolling');
    try { await dice2d.roll(d, { speed: SPD(), side: curState().turn === 0 ? 0 : 1, onHit: (i, k) => snd2('dieHit', k) }); } finally { dock.classList.remove('rolling'); }
  },
  orient: () => 's',
};
window.PatolliApp = {
  get view() { return view; }, get dice() { return dice2d; }, frame: () => $('#frame'), board: () => $('#board'),
  state: () => curState(), roll: () => curRoll(), orient: () => 's', relayout: () => relayout(true), render: () => renderAll(),
};

// ====================================================================== info panel
function homeCount(st, s) { const g = E.RULES[st.rule].goal; return st.pos[s].filter(p => p >= g).length; }
function playerName(s) {
  if (settings.mode === 'online' && typeof olPlayerName === 'function') return olPlayerName(s);
  if (settings.mode === 'pvp') return sideName(s);
  if (settings.mode === 'watch') return AIW() + ' ' + LV(levelFor(s)) + proTag(s);
  return s === game.human ? t('you') : AIW() + ' ' + LV(levelFor(s)) + proTag(s) + (rgame && !phone() ? ` (R${rgame.or})` : '');   // (phones: the narrow card shows the level only)
}
function renderInfo() {
  const st = shownState(), rl = E.RULES[st.rule], rc = race(st), sta = special ? { over: false } : statusAt(cur);
  for (const s of [0, 1]) {
    const el = $('#pl' + s), home = homeCount(st, s), onb = st.pos[s].filter(p => p > 0 && p < rl.goal).length;
    $('#name' + s).textContent = special ? sideName(s) : playerName(s);
    $('#sub' + s).innerHTML = `${esc(t('pl.board'))} <b>${onb}</b> · ${esc(t('pl.left'))} <b>${rc.pips[s]}</b>`;
    $('#home' + s).innerHTML = `${home}<small>/${rl.pieces} ${esc(t('pl.home'))}</small>`;
    $('#gold' + s).innerHTML = `<i></i><b>${st.gold[s]}</b>`; $('#gold' + s).title = t('tray.gold', { s: sideName(s) });
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
  bt.classList.remove('pass');
  bt.querySelector('span').textContent = t('roll');
  bt.disabled = !canRollNow();
  $('#poolInfo').innerHTML = special ? '' : `<span>${esc(t('rule.' + game.rule))}${rl.rounds ? ' · ' + esc(t('round.n', { n: st.round })) : ''}</span><span class="pool"><i></i>${esc(t('tray.pool'))} <b>${st.pool}</b></span>`;
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
  if (window.PatolliCoach) PatolliCoach.render();
  if (window.PatolliRv) PatolliRv.update();
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
    h += `<span class="hb-chip">${esc(t('tray.pool'))} <b>${st.pool}</b></span>`;
    if (rgame) h += `<span class="hb-chip">${esc(t('ng.rated'))} · ${esc(LV(rgame.lv))}</span>`;
  }
  HB.setInfo(h);
}
// win chance of Light at position i (cached by the position key)
function lightWp(i) {
  const st = special ? special.state : posAt(i), k = E.key(st);
  if (evalCache.has(k)) return evalCache.get(k);
  let w; if (st.winner >= 0) w = st.winner === 0 ? 1 : 0; else { const v = E.winProb(st, 1); w = st.turn === 0 ? v : 1 - v; }
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
  svg.innerHTML = `<defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2553f" stop-opacity=".4"/><stop offset="1" stop-color="#e2553f" stop-opacity=".03"/></linearGradient></defs>` +
    `<line class="zero" x1="0" x2="${W}" y1="${y(.5)}" y2="${y(.5)}" vector-effect="non-scaling-stroke"/>` +
    `<path d="${area}" fill="url(#gg)"/><path d="${d}" fill="none" stroke="#ffb59f" stroke-width="1.6" vector-effect="non-scaling-stroke"/>` +
    `<line class="cur" x1="${x(Math.min(cur, N))}" x2="${x(Math.min(cur, N))}" y1="0" y2="${H}" vector-effect="non-scaling-stroke"/>`;
}
// 宝の動き（エンジンの ev）を棋譜の文にする：「場へ1」「青へ2」「場の8を獲得」「第2回へ」
function evText(ev) {
  return ev.map(e => e.t === 'pay' ? (e.to === 'pool' ? t('ev.pool', { a: e.amt }) : t('ev.pay', { s: sideName(e.to), a: e.amt })) : e.t === 'pot' ? t('ev.pot', { a: e.amt }) : e.t === 'round' ? t('ev.round', { n: e.round }) : '').filter(Boolean);
}
function plyText(st, p, html) {
  const sn = sideName(p.s), fm = p.m ? fullMove(st, p.m, p.n) : null;
  let ev = []; try { ev = evText(E.apply(st, fm, p.n).ev); } catch (e) {}
  const pay = ev.length ? (html ? ` <span class="g">${esc(ev.join('・'))}</span>` : '（' + ev.join('・') + '）') : '';
  if (!p.m) return `${sn} ${p.n}${t('sep')}${t('k.pass')}${pay}`;
  const rl = E.RULES[st.rule], a = p.m.from === 0 ? t('k.enter') : String(p.m.from), b = p.m.to >= rl.goal ? t('k.home') : String(p.m.to);
  let s = `${sn} ${p.n}${t('sep')}${a}→${b}`;
  if (fm && fm.capture) s += html ? ` <span class="x">×${esc(t('k.cap'))}</span>` : ' ×' + t('k.cap');
  if (p.ag) s += html ? ` <span class="r">↻</span>` : ' ↻';
  return s + pay;
}
let kifuKey = '';
function renderKifu() {
  const el = $('#kifu'); if (special) { if (kifuKey !== 'sp') { kifuKey = 'sp'; el.innerHTML = `<div class="empty">${esc(t('kifu.special'))}</div>`; } return; }
  const L = ken ? game.plies.slice(0, ken.base) : line(), q = window.PatolliRv ? PatolliRv.quality : () => '';   // (explore moves are not recorded)
  const k = LANG + '|' + L.length + '|' + cur + '|' + (ken ? 'k' : '') + '|' + (window.PatolliRv ? PatolliRv.ver() : 0);
  if (k === kifuKey) return; kifuKey = k;
  if (!L.length) { el.innerHTML = `<div class="empty">${esc(t('kifu.empty'))}</div>`; return; }
  el.innerHTML = L.map((p, i) => { const qq = q(i); return `<button data-i="${i + 1}" class="${i + 1 === cur ? 'cur' : ''} ${qq === 'bad' ? 'q-bad' : qq === 'dubious' ? 'q-dub' : ''}"><em>${i + 1}</em><i class="s${p.s}"></i><span>${plyText(posAt(i), p, true)}</span></button>`; }).join('');
  const c = el.querySelector('.cur'); if (c) { const top = c.offsetTop - el.offsetTop; if (top < el.scrollTop || top > el.scrollTop + el.clientHeight - 24) el.scrollTop = top - el.clientHeight / 2; }
}
$('#kifu').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) viewAt(+b.dataset.i); });
$('#graph').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(), N = lineLen(); if (!N) return; viewAt(Math.round((e.clientX - r.left) / r.width * N)); });
function recordText() {
  const L = game.plies;
  const head = `${t('title')} — ${t('rule.' + game.rule)}${game.rule === 'bell' && game.dir[1] < 0 ? ' / ' + t('ng.dirOpp') : ''}\n${sideName(0)}: ${playerName(0)} / ${sideName(1)}: ${playerName(1)}\n`;
  const body = L.map((p, i) => `${i + 1}. ${plyText(posAt(i), p, false)}`).join('\n');
  const sta = statusAt(L.length);
  const fin = posAt(L.length);
  return head + body + (sta.over ? `\n${t('st.over', { s: sideName(sta.winner) })}` : '') + `\n${t('rec.gold', { a: sideName(0), x: fin.gold[0], b: sideName(1), y: fin.gold[1], p: fin.pool })}\n`;
}

// ====================================================================== clock (1手30秒)
let clockStart = 0, clockKey = '', clockHold = true;   // (a game restored on page load: the clock waits for the first move)
const clockSec = () => rgame ? 30 : settings.clock;
// settings.clock -1 = Fischer (shared/fischer.js, settings.fis = 'minutes+seconds'): each side has a bank game.fz.left (ms) that
// runs while it is that side's turn (rolling and moving); after every ply it played (the first one included) the side gets inc back.
// No per-move limit. The AI's side never runs. Undo / browsing do not charge; a reloaded game waits for the next move (clockHold).
const fzOn = () => !!(game && game.fz && !rgame && settings.clock < 0 && settings.mode !== 'online');
function fzNew() {
  const f = window.Fischer && Fischer.parse(Fischer.norm(settings.fis)) || { main: 300, inc: 3 };
  return { left: [f.main * 1000, f.main * 1000], inc: f.inc * 1000, n: game ? game.plies.length : 0, used: 0, side: -1 };
}
let fzLast = 0;
function fzStep() {   // a ply was played (or taken back) since the last look: charge the side that was thinking
  if (!fzOn()) return;
  const z = game.fz, n = game.plies.length;
  if (z.n === n) return;
  if (n > z.n && z.side >= 0) z.left[z.side] = Math.max(0, z.left[z.side] - z.used) + z.inc;
  z.n = n; z.used = 0; z.side = -1; clockHold = false;
}
const fzLeft = s => { const z = game.fz; return Math.max(0, z.left[s] - (z.side === s ? z.used : 0)); };
function clockOn() { return settings.mode !== 'online' && !special && !ken && (clockSec() > 0 || fzOn()) && settings.mode !== 'watch' && !overNow() && atLatest() && !reviewing && !isAI(curState().turn); }
function renderClock() {
  if (settings.mode === 'online' && typeof olClockRender === 'function') { olClockRender(); return; }
  for (const s of [0, 1]) $('#clk' + s).textContent = '';
  if (fzOn() && !special && !ken && settings.mode !== 'watch') {   // Fischer: both players' banks (vs the AI: only yours)
    fzStep();
    const on = clockOn(), turn = curState().turn;
    document.body.classList.add('has-clk');
    for (const s of [0, 1]) {
      if (isAI(s)) continue;
      const ms = fzLeft(s), sec = Math.ceil(ms / 1000), el = $('#clk' + s);
      el.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); el.classList.toggle('low', on && s === turn && ms <= 10000);
    }
    return;
  }
  if (!clockOn()) { document.body.classList.remove('has-clk'); return; }
  document.body.classList.add('has-clk');
  const st = curState(), k = game.id + ':' + game.plies.length;
  if (clockKey !== k) { if (clockKey) clockHold = false; clockKey = k; clockStart = Date.now(); if (window.CountTick) CountTick.reset('mv'); }
  if (clockHold) clockStart = Date.now();
  const left = Math.max(0, clockSec() * 1000 - (Date.now() - clockStart)), el = $('#clk' + st.turn);
  el.textContent = '0:' + String(Math.ceil(left / 1000)).padStart(2, '0'); el.classList.toggle('low', left <= 10000);
}
setInterval(() => {
  const now = Date.now(), dt = now - (fzLast || now); fzLast = now;
  if (fzOn()) {
    fzStep();
    if (!clockOn()) return;
    const z = game.fz, st = curState();
    if (z.side !== st.turn) { z.side = st.turn; z.used = 0; if (window.CountTick) CountTick.reset('mv'); }
    if (!document.hidden && !clockHold) z.used += Math.min(dt, 1000);
    const left = fzLeft(st.turn);
    renderClock();
    if (window.CountTick) CountTick.feed(left, 'mv');
    if (left <= 0) { busyToken++; z.left[st.turn] = 0; z.used = 0; game.end = { winner: 1 - st.turn, why: 'time' }; game.roll = null; save(); update(); onGameEnd(); }
    return;
  }
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
  const r0 = OL() ? null : E.rollDice(Math.random), r = OL() ? olRoll() : { d: r0.dice, n: r0.n };
  if (!r) return;
  const tok = busyToken; animating = true; hintMove = null; renderInfo();
  snd('roll');
  await PatolliSkinHooks.animateRoll(r.d);
  animating = false; if (tok !== busyToken) return;
  setRoll(r); if (!special && !ken) save();
  afterRoll(tok);
}
// 0の目・動かせる駒がないときに場へ払う数（ルールによる）
function passFee(st, n) { const R = E.RULES[st.rule], fee = n ? R.penStuck : R.zeroOffer; return Math.min(fee, st.gold[st.turn]); }
function afterRoll(tok) {
  const st = curState(), r = curRoll();
  renderAll();
  if (special) { if (special.onRoll) special.onRoll(r); return; }
  const ms = r.n ? E.legalMoves(st, r.n) : [];
  if (!ms.length) {   // パス：やわらかく知らせてから相手の番へ（場へ払う分は commit が見せる）
    const fee = passFee(st, r.n);
    fxMsg(t('fx.pass'), (r.n ? t('fx.passNoMove') : t('fx.passZero')) + (fee ? ' ・ ' + t(r.n ? 'ev.pool' : 'ev.offer', { a: fee }) : ''), 'pass', 1300);
    snd('pass');
    setTimeout(() => { if (tok === busyToken) commit(null); }, 1150 / Math.max(.7, SPD() * .8));
    return;
  }
  if (isAI(st.turn)) return;
  if (ms.length === 1 && settings.autoPick) setTimeout(() => { if (tok === busyToken && curRoll() === r && !animating) commit(ms[0]); }, 520 / SPD());
}
// 手で起きた宝の支払い（エンジンの ev）を順に見せる：玉が飛んで、数が変わる
async function showEvents(st, fm, res, tok) {
  const list = res.ev.filter(e => e.t === 'pay' || e.t === 'pot'); if (!list.length) return;
  payView = { tok, gold: st.gold.slice(), pool: st.pool };
  update();
  if (fm) {
    const first = list[0], amt = first.amt;
    if (fm.capture) fxMsg(t('fx.cap'), t('fx.get', { s: sideName(1 - st.turn), a: amt }), 'cap', 1300);
    else if (fm.pen) fxMsg(t('fx.pen'), t('fx.give', { s: sideName(1 - st.turn), a: amt }), 'cap', 1300);
    else if (fm.finish) fxMsg(t('fx.home'), first.t === 'pay' ? t('fx.get', { s: sideName(1 - st.turn), a: amt }) : '', '', 1300);
  }
  for (const e of list) {
    if (tok !== busyToken || !payView) break;
    const from = e.t === 'pot' ? 'pool' : e.from, to = e.to;
    snd('coin');
    if (animOn()) await view.animatePay(from, to, e.amt, { speed: SPD() });
    if (tok !== busyToken || !payView) break;
    if (from === 'pool') payView.pool -= e.amt; else payView.gold[from] -= e.amt;
    if (to === 'pool') payView.pool += e.amt; else payView.gold[to] += e.amt;
    update();
  }
  if (payView && payView.tok === tok) payView = null;
}
async function commit(m) {
  const st = curState(), r = curRoll(); if (!r || animating) return;
  const fm = m ? fullMove(st, m, r.n) : null;
  if (m && !fm) return;
  if (OL() && !olRemote && !olSend(st, fm)) return;   // online: my move is written to the record (the other side's plies come with olRemote)
  const tok = ++busyToken; animating = true; hoverMove = null; hintMove = null; coachHover = null;
  renderBoard();
  if (fm) { await PatolliSkinHooks.animateMove(st.turn, fm.from, fm.to, { capture: fm.capture, speed: SPD() }); snd(fm.capture ? 'cap' : fm.finish ? 'home' : 'place'); }
  if (tok !== busyToken) { animating = false; return; }
  const res = E.apply(st, fm, r.n);
  const sp = special;
  if (sp) { if (fm) sp.last = moveMarks(st, st.turn, fm, res.state); sp.state = res.state; sp.n = null; sp.dice = null; }
  else {
    const ply = { s: st.turn, d: r.d, n: r.n, m: fm ? { from: fm.from, to: fm.to } : null, ag: !!res.again };
    if (ken) { ken.plies.push(ply); ken.roll = null; cur = lineLen(); }
    else { game.plies = game.plies.slice(0, cur); game.plies.push(ply); game.roll = null; cur = game.plies.length; reviewing = false; if (window.PatolliRv) PatolliRv.invalidate(); save(); }
  }
  await showEvents(st, fm, res, tok);
  if (tok !== busyToken) return;
  animating = false;
  if (sp) { if (special === sp && sp.onMove) sp.onMove(fm, res); renderAll(); return; }
  const rd = res.ev.find(e => e.t === 'round');
  if (rd) { fxMsg(t('fx.round', { n: rd.round }), t('fx.roundSub', { s: sideName(rd.winner) }), '', 1700); snd('ok'); }
  else if (res.again && res.state.winner < 0) { fxMsg(t('fx.again'), t('fx.againSub'), '', 1200); snd('rosette'); }
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
    const lastP = game.plies[cur - 1], preWait = settings.mode === 'watch' ? 520 : lastP && lastP.ag ? 380 : 0;   // AIの着手は即時：観戦と「もう一度」の案内のときだけ間を取る
    if (preWait) { await sleep(preWait / SPD()); if (tok !== busyToken) return; }
    if (!game.roll) {
      const r0 = E.rollDice(Math.random), r = { d: r0.dice, n: r0.n };
      thinking = 0; animating = true; renderInfo(); snd('roll');
      await PatolliSkinHooks.animateRoll(r.d); animating = false;
      if (tok !== busyToken) return;
      game.roll = r; save(); renderAll();
    }
    const r = game.roll, ms = r.n ? E.legalMoves(st, r.n) : [];
    if (!ms.length) { thinking = 0; afterRoll(tok); return; }
    thinking = 1; renderInfo();
    const t0 = performance.now(), mv = ms.length === 1 ? ms[0] : await think(st, r.n, levelFor(st.turn), proCfg(st.turn));
    const wait = (settings.mode === 'watch' ? 420 / SPD() : 0) - (performance.now() - t0);   // AIの着手は即時（観戦だけ間を取る）
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
  if (!m) m = ms.find(x => { const c = x.to < E.RULES[st.rule].goal ? rcOf(st, st.turn, x.to) : null; return c && c.r === e.r && c.c === e.c; });
  if (!m) { if (e.piece != null && e.side === st.turn) toast(t('tip.cant')); return; }
  play(m);
}
function onTray(e) {
  if (!myTurnHuman() || animating || thinking) return;
  const st = curState(), r = curRoll();
  if (!r) { if (canRollNow()) doRoll(); return; }
  if (!r.n || e.side !== st.turn) return;
  const ms = E.legalMoves(st, r.n);
  const m = e.kind === 'start' ? ms.find(x => x.from === 0) : ms.find(x => x.finish);
  if (m) play(m); else if (e.kind === 'start') toast(t('tip.cantEnter'));
}
function play(m) { if (special && special.check && !special.check(m)) return; commit(m); }
$('#diceDock').addEventListener('click', () => { if (canRollNow()) doRoll(); });
$('#btnRoll').onclick = () => { if (canRollNow()) doRoll(); };
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
  busyToken++; thinking = 0; animating = false; ken = null; wpPaused = false; payView = null;
  if (window.PatolliLearn) PatolliLearn.exitSpecial(true);
  const first = settings.color === 'r' ? (Math.random() < .5 ? 0 : 1) : settings.mode === 'ai' && settings.color === '1' ? 1 : 0;
  rgame = rated || null;
  game = newGameObj(rgame ? 'bell' : settings.rule, rgame ? (Math.random() < .5 ? 0 : 1) : first, 0, [1, !rgame && settings.rule === 'bell' && settings.dir === 'opp' ? -1 : 1]);
  cur = 0; reviewing = false; gameOverShown = false; evalCache.clear(); clockHold = false; clockKey = '';
  game.fz = settings.clock < 0 && !rgame ? fzNew() : null;
  if (window.PatolliRv) PatolliRv.reset();
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
  const fin = posAt(game.plies.length);
  $('#resultTitle').textContent = youWin ? t('res.youWin') : aiWin ? t('res.aiWin') : t('res.pWin', { s: settings.mode === 'watch' ? playerName(sta.winner) : sideName(sta.winner) });
  let sub = esc(t('res.why.' + (sta.why || 'home'))) + '<br>' + esc(t('res.sub', { n: game.plies.length })) + `<span class="res-gold"><span><i class="pdisc p0"></i>${esc(sideName(0))} <b>${fin.gold[0]}</b></span><span><i class="pdisc p1"></i>${esc(sideName(1))} <b>${fin.gold[1]}</b></span>${fin.pool ? `<span>${esc(t('tray.pool'))} <b>${fin.pool}</b></span>` : ''}</span>`;
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
  try { GameRecord.add({ mode, res: sta.winner === game.human ? 'w' : 'l', side: game.first === game.human ? 0 : 1, opp: 'AI ' + LV(levelFor(1)) + proTag(1 - game.human), key: (proFor(1 - game.human) ? 'ai:pro' : 'ai:') + levelFor(1), n: game.plies.length, why: t('res.why.' + (sta.why || 'home')) }); } catch (e) {}
}
function showOverlay(s) { $(s).classList.add('show'); }
function hideOverlay(s) { $(s).classList.remove('show'); }
$('#btnReview').onclick = () => hideOverlay('#resultOverlay');
$('#btnAgain').onclick = () => { hideOverlay('#resultOverlay'); if (rgame) rtStart(); else newGame(); };
$('#btnResAnalyze').onclick = () => { hideOverlay('#resultOverlay'); if (window.PatolliRv) PatolliRv.run(); };

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
  busyToken++; thinking = 0; animating = false; payView = null;
  let i = game.plies.length - 1;
  if (settings.mode === 'ai') { while (i >= 0 && !(game.plies[i].s === game.human && game.plies[i].m)) i--; if (i < 0) return; game.undoLeft--; }
  const p = game.plies[i];
  game.plies = game.plies.slice(0, i); game.roll = { d: p.d, n: p.n }; cur = i; reviewing = false; gameOverShown = false;
  if (window.PatolliRv) PatolliRv.invalidate();
  save(); update(); toast(settings.mode === 'ai' ? t('undo.left', { n: game.undoLeft }) : t('undo.done'));
}
function wpActive() { return settings.mode === 'watch' && !special && !!game; }
function wpRender() { if (!window.WatchPause) return; const on = wpActive() && !overNow(); WatchPause.set($('#btnUndo'), on ? (wpPaused ? 'resume' : 'pause') : null, LANG); if (on) $('#btnUndo').disabled = false; }
function wpToggle() { if (!wpActive() || overNow()) return; wpPaused = !wpPaused; if (wpPaused) { busyToken++; thinking = 0; renderInfo(); } else { cur = game.plies.length; reviewing = false; update(); afterPosition(); } }
// ---- hint
function canHint() { return settings.mode !== 'online' && !special && !ken && !!game && !rgame && atLatest() && !overNow() && myTurnHuman() && !animating; }
async function hint() {
  if (!canHint()) return;
  const st = curState(), r = curRoll();
  if (!r) { toast(t('hint.roll')); return; }
  const tok = busyToken;
  const ev = r.n ? await evalJob(st, r.n, 2) : [];   // 2投げ先まで読む（worker.js）
  if (tok !== busyToken || curRoll() !== r || E.key(curState()) !== E.key(st)) return;
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
  if (ken && window.PatolliRv) PatolliRv.kenStop();
  i = Math.max(0, Math.min(game.plies.length, i)); if (i === cur && !reviewing) return;
  busyToken++; thinking = 0; animating = false; hintMove = null; payView = null;
  cur = i; reviewing = i !== game.plies.length;
  update();
  if (!reviewing) afterPosition();
}
function navGo(what) {
  if (special || !game) return;
  if (ken && window.PatolliRv) { if (what === 'prev') PatolliRv.kenBack(); return; }
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
  if (window.PatolliRv) PatolliRv.invalidate();
  save(); update(); afterPosition();
}

// ====================================================================== rated games (solo, placement)
const RT_STORE = STORE + '-rated', RT_START = 1000;
// 各レベルのAIのレート：tools/rate_levels.js の自己対局（ベルの復元、隣り合うレベルどうし各1200局）の勝率から。Lv.1 を 800 に固定。
// 豆の運が大きいので、1段ごとの差は小さい（Lv.12 から1投げ先、Lv.20 は2投げ先まで読むので、そこで差がつく）
const RT_LV = [0, 800, 815, 840, 850, 860, 885, 895, 910, 930, 940, 950, 995, 1020, 1045, 1070, 1085, 1095, 1105, 1115, 1205];
function rtLoad() { let s = null; try { s = JSON.parse(localStorage.getItem(RT_STORE) || 'null'); } catch (e) {} if (!s || typeof s.r !== 'number' || !isFinite(s.r)) s = { r: RT_START, n: 0, w: 0, l: 0, d: 0, hist: [] }; if (!Array.isArray(s.hist)) s.hist = []; return s; }
function rtStore(s) { try { localStorage.setItem(RT_STORE, JSON.stringify(s)); } catch (e) {} }
function rtRank(r) { let k = 0; for (let i = 1; i <= LV_MAX; i++) if (r >= RT_LV[i] - 25) k = i; return k ? LV(k) : t('rt.below'); }
const rtD = d => (d >= 0 ? '+' : '−') + Math.abs(d);
function rtPick(r) {
  { const S0 = rtLoad(); if (window.Placement && Placement.on(S0)) return Placement.pick(S0, RT_LV.map((x, i) => [i, x]).slice(1)); }
  const u = Math.random(), v = Math.random(), off = u < .1 ? 100 + v * 100 : u < .2 ? -(100 + v * 100) : (v * 2 - 1) * 70, target = r + off;
  let lv = 1; for (let i = 1; i <= LV_MAX; i++) if (Math.abs(RT_LV[i] - target) < Math.abs(RT_LV[lv] - target)) lv = i;
  const diff = RT_LV[lv] - r; return { lv, or: RT_LV[lv], tag: diff > 100 ? 'up' : diff < -100 ? 'down' : 'even' };
}
function rtLive() { return !!(rgame && game && !overNow() && !special); }
function rtSettle(sta) {
  const R = rgame; if (!R || !sta.over) return null; if (R.done) return R.done;
  const S = rtLoad(), prev = S.hist.find(h => h.id === R.id); if (prev) { R.done = { old: prev.r - prev.d, now: prev.r, d: prev.d }; return R.done; }
  const sc = sta.winner === game.human ? 1 : 0, old = S.r, pl = window.Placement && Placement.on(S) ? Placement.record(S, R.or, sc) : null;
  const K = S.n < 10 ? 40 : 20, Ex = 1 / (1 + Math.pow(10, (R.or - old) / 400));
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
// ルールのカードの絵：本物の盤に、手前側の道を光る矢印で描く
const artCache = new Map();   // （カードは変更のたびに描き直すので、盤の絵はデザインごとに1回だけ作る）
function ruleArt(r) {
  const k = r + '|' + (draft.design || settings.design) + '|' + (draft.pieces || settings.pieces);
  if (!artCache.has(k)) artCache.set(k, B2.mini(E.newGame(r), { design: draft.design || settings.design, pieces: draft.pieces || settings.pieces, crop: 'board', trays: false, marks: [{ type: 'path', side: 0, from: 1, to: E.RULES[r].L, color: '#ffe27a' }] }));
  return artCache.get(k);
}
function levelLabelHTML(v) { return `${esc(LV(v))}<small>${esc(LVD(v))}</small>`; }
let fisUi = null;
function segSync() {
  $$('#segMode button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.mode));
  $$('#segColor button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.color));
  $$('#segDir button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.dir));
  $$('#segClock button').forEach(b => b.classList.toggle('sel', +b.dataset.v === +draft.clock));
  if (window.Fischer) {   // フィッシャー: its presets open under the clock choices
    if (!fisUi) fisUi = Fischer.picker($('#fisPick'), { lang: () => LANG, get: () => draft.fis, set: v => { draft.fis = v; } });
    draft.fis = Fischer.norm(draft.fis); $('#btnFis').textContent = Fischer.name(LANG);
    $('#fisPick').classList.toggle('hidden', +draft.clock >= 0); fisUi.sync();
  }
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
  const rc = $('#ruleCards'), html = RULES.map(r => `<button type="button" class="ngt-gcard${draft.rule === r ? ' sel' : ''}" data-v="${r}"><span class="gart">${ruleArt(r)}</span><b>${esc(t('rule.' + r))}</b><p>${r === 'bell' ? `<span class="gtag">${esc(t('rule.std'))}</span>` : ''}${esc(t('rule.' + r + '.d'))}</p><span class="gpick"></span></button>`).join('');
  if (rc.__h !== html) { rc.__h = html; rc.innerHTML = html; }   // (unchanged: the cards stay as they are — no flicker)
  $('#fRules').classList.toggle('hidden', rated || !!draft.resume);
  $('#fDir').classList.toggle('hidden', rated || !!draft.resume || draft.rule !== 'bell');
  $('#optAutoRoll').checked = !!draft.autoRoll; $('#optAutoPick').checked = !!draft.autoPick; $('#optEval').checked = !!draft.eval; $('#optLast').checked = !!draft.last; $('#optDanger').checked = !!draft.danger;
  $('#btnStart').textContent = t('start');
}
function designPickers() {
  const st = E.newGame('popular'); st.pos = [[0, 0, 3, 9, 20, 53], [0, 5, 14, 31, 53, 53]];
  $('#bdRow').innerHTML = B2.BOARDS.map(d => `<button type="button" data-v="${d}" class="${draft.design === d ? 'sel' : ''}">${B2.mini(st, { design: d, pieces: draft.pieces, crop: 'board', trays: false })}<span>${esc(t('bd.' + d))}</span></button>`).join('');
  $('#pcRow').innerHTML = B2.PIECES.map(p => `<button type="button" data-v="${p}" class="${draft.pieces === p ? 'sel' : ''}"><span class="pp">${B2.pieceIcon(p)}</span><span>${esc(t('pcs.' + p))}</span></button>`).join('');
}
function openNewDialog(resume) {
  draft = { resume: !!resume, mode: rgame ? 'rated' : settings.mode, rule: settings.rule, dir: settings.dir, color: settings.color, level: settings.level, level2: settings.level2, clock: settings.clock, fis: settings.fis, speed: settings.speed, autoRoll: settings.autoRoll, autoPick: settings.autoPick, eval: settings.eval, last: settings.last, danger: settings.danger, design: settings.design, pieces: settings.pieces };
  if (resume && !['ai', 'pvp', 'watch'].includes(draft.mode)) draft.mode = 'ai';
  if (resume) { draft.color = String(game.human || 0); if (rgame) draft.mode = 'ai'; }
  segSync(); designPickers();
  // 「この局面から再開」: the same dialog, only what fits going on from this position (shared/resumeng.js)
  if (window.ResumeNG) { if (resume) ResumeNG.open({ modes: ['ai', 'pvp', 'watch'], seg: '#segMode', hide: '#fRules' }); else ResumeNG.close(); }
  showOverlay('#newOverlay');
}
// the ルール button on each variant card (shared/ngtabs.js): the rules tutorial from its first page
$('#ruleCards').ngtRules = () => { if (window.PatolliLearn) PatolliLearn.openRules(0); };
$('#segMode').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.mode = b.dataset.v; segSync(); };
$('#segColor').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.color = b.dataset.v; segSync(); };
$('#segDir').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.dir = b.dataset.v; segSync(); };
$('#segClock').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.clock = +b.dataset.v; segSync(); };
$('#segSpeed').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.speed = +b.dataset.v; segSync(); };
$('#ruleCards').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.rule = b.dataset.v; segSync(); };
$('#levelRange').oninput = e => { draft.level = +e.target.value; $('#levelName').innerHTML = levelLabelHTML(draft.level); };
$('#levelRange2').oninput = e => { draft.level2 = +e.target.value; $('#levelName2').innerHTML = levelLabelHTML(draft.level2); };
[['optAutoRoll', 'autoRoll'], ['optAutoPick', 'autoPick'], ['optEval', 'eval'], ['optLast', 'last'], ['optDanger', 'danger']].forEach(([id, k]) => { $('#' + id).onchange = e => { draft[k] = e.target.checked; }; });
// デザインは選んだ瞬間に盤へ反映（共通ルール）：開始・キャンセルを待たない
$('#bdRow').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.design = b.dataset.v; designPickers(); setDesign(draft.design, draft.pieces); };
$('#pcRow').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft.pieces = b.dataset.v; designPickers(); setDesign(draft.design, draft.pieces); };
// PROモード（shared/proset.js、共通ルール「対局設定の Pro モード」）：AIの強さの横。AIと対戦／AI同士だけ（レート戦には出さない）。
// 読みの深さ（手のあとに読む投げの数＝engine.js の LEVELS の d）と手のばらつき（ソフトマックスの温度）。worker.js が Lv.20 に重ねて使う
const PRO_TEMP = [0, 0.012, 0.06];   // 手のばらつき なし／小／大
const PRO_UNIT = { depth: { ja: '投げ先', en: 'throws', zh: '掷', 'zh-TW': '擲', ko: '번 앞', es: 'tiradas', fr: 'lancers', pt: 'lances', de: 'Würfe', ru: 'бросков', tr: 'atış', id: 'lemparan', hi: 'फेंक', ar: 'رميات' } };
const proDefaults = lv => { const L = E.LEVELS[lv - 1] || E.LEVELS[19]; return { limit: { k: 'depth', v: L.d }, var: L.rand || L.temp >= 0.04 ? 2 : L.temp > 0 ? 1 : 0 }; };
const proParams = () => [{ key: 'limit', kinds: { depth: [0, 3] }, kunit: PRO_UNIT }, { key: 'var' }];
var PRO = window.ProSet ? ProSet.init({ game: 'patolli', lang: () => LANG, level: () => draft.level || settings.level, show: () => draft.mode === 'ai' || draft.mode === 'watch',
  store: { get: () => settings.pro, set: v => { settings.pro = v; save(); } }, defaults: proDefaults, params: proParams() }) : null;
var PRO2 = window.ProSet ? ProSet.init({ game: 'patolli-w2', field: '#fLevel2', lang: () => LANG, level: () => draft.level2 || settings.level2, show: () => draft.mode === 'watch',
  store: { get: () => settings.pro2, set: v => { settings.pro2 = v; save(); } }, defaults: proDefaults, params: proParams() }) : null;
function proFor(side) {
  if (rgame || special || ken || !(settings.mode === 'ai' || settings.mode === 'watch')) return null;
  const P = settings.mode === 'watch' && side === 1 ? window.PRO2 : window.PRO;
  return P ? P.get(levelFor(side)) : null;
}
function proCfg(side) {
  const e = proFor(side); if (!e) return null;
  const L = E.LEVELS[levelFor(side) - 1] || E.LEVELS[19], v = e.changed.includes('var');
  return { d: e.limit.v, temp: v ? PRO_TEMP[e.var] : L.temp };
}
function proTag(side) { return proFor(side) ? ' PRO' : ''; }
$('#btnCancelNew').onclick = () => hideOverlay('#newOverlay');
$('#btnStart').onclick = () => {
  hideOverlay('#newOverlay');
  const rated = draft.mode === 'rated';
  const fzWas = settings.clock + ':' + settings.fis;
  for (const k of ['rule', 'dir', 'color', 'level', 'level2', 'clock', 'fis', 'speed', 'autoRoll', 'autoPick', 'eval', 'last', 'danger']) settings[k] = draft[k];
  if (!rated) settings.mode = draft.mode;
  setDesign(draft.design, draft.pieces);
  if (draft.resume) { if (game && (fzWas !== settings.clock + ':' + settings.fis || !!game.fz !== settings.clock < 0)) game.fz = settings.clock < 0 ? fzNew() : null; resumeWith(); return; }
  if (rated) rtStart(); else newGame();
};
function setDesign(d, p) {
  const ch = d !== settings.design || p !== settings.pieces;
  settings.design = d; settings.pieces = p; save();
  document.documentElement.dataset.pcs = p; document.documentElement.dataset.bd = d;
  if (ch && view) { view.setDesign(d, p); artCache.clear(); kifuKey = ''; renderAll(); }
  if (window.PatolliTour && PatolliTour.setDesign) try { PatolliTour.setDesign(d, p); } catch (e) {}
}
$('#btnNew').onclick = () => {
  if (special && window.PatolliLearn) { PatolliLearn.exitSpecial(); }
  if (game && game.plies.length && !overNow() && !rgame && settings.mode !== 'watch') { $('#rsText').textContent = t('rs.playing', { n: game.plies.length }); showOverlay('#resumeOverlay'); return; }
  openNewDialog();
};
$('#rsCancel').onclick = () => hideOverlay('#resumeOverlay');
$('#rsRestart').onclick = () => { hideOverlay('#resumeOverlay'); openNewDialog(); };
$('#rsResume').onclick = () => { hideOverlay('#resumeOverlay'); openNewDialog(true); };   // the settings dialog in resume mode
// going on from the shown (or latest) position with the mode / side / strength chosen in the resume dialog
function resumeWith() {
  busyToken++; thinking = 0; animating = false; wpPaused = false; payView = null;
  if (settings.mode === 'ai' && settings.color !== 'r') game.human = settings.color === '1' ? 1 : 0;
  hideOverlay('#resultOverlay');
  if (reviewing) resumeHere(); else { gameOverShown = false; save(); relayout(); update(); afterPosition(); }
}

// ====================================================================== online: online.js (PatolliOnline) + online-ui.js (the dock / tab, the
// lobby, the online game on this board); its hooks here are the settings.mode === 'online' branches

// ====================================================================== layout
// 対局者の欄：PC は右の情報欄（相手が上・自分が下）。それ以外は相手を盤の上、自分と状態の箱（豆を投げるボタン）を盤の下へ
function relayout(force) {
  const pc = mqPC.matches;
  const ba = $('#boardArea'), fr = $('#frame'), col = $('#plCol'), pl = $('#players'), sb = $('#statusBox'), rb = $('#reviewBar');
  const me = game ? (settings.mode === 'ai' || settings.mode === 'online' ? game.human : 0) : 0;
  if (pc) { pl.appendChild($('#pl' + (1 - me))); pl.appendChild($('#pl' + me)); if (sb.parentElement !== col) col.appendChild(sb); }
  else { ba.insertBefore($('#pl' + (1 - me)), fr); fr.after($('#pl' + me)); $('#pl' + me).after(sb); }
  if (pc) { if (rb.previousElementSibling !== pl) pl.after(rb); } else if (rb.parentElement !== sb) sb.appendChild(rb);
  pl.classList.toggle('hidden', !pc);
  requestAnimationFrame(() => renderBoard());
}
mqPC.addEventListener ? mqPC.addEventListener('change', () => relayout()) : mqPC.addListener(() => relayout());
mqV.addEventListener ? mqV.addEventListener('change', () => relayout()) : mqV.addListener(() => relayout());

// ====================================================================== dialogs: outside click, title, tabs
function dismissOverlay(o) {
  const OUT = { newOverlay: '#btnCancelNew', resultOverlay: '#btnReview', puzzleOverlay: '#pzClose', resumeOverlay: '#rsCancel', olOverlay: '#olClose', rtConfirm: '#rtConfirmNo' };
  if (o.id === 'rulesOverlay') { if (window.PatolliLearn) PatolliLearn.closeRules(); else o.classList.remove('show'); return; }
  if (o.id === 'lessonOverlay') { const b = $('#lessonDoneView:not(.hidden)') ? $('#btnLessonQuit2') : $('#btnLessonClose'); if (b) b.click(); return; }
  const b = OUT[o.id] && $(OUT[o.id]); if (b) b.click(); else o.classList.remove('show');
}
$$('.overlay').forEach(o => { let down = false; o.addEventListener('pointerdown', e => { down = e.target === o; }); o.addEventListener('click', e => { if (e.target !== o || !down) return; down = false; dismissOverlay(o); }); });
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; const o = $('.overlay.show'); if (o) dismissOverlay(o); });
$('.brand h1').addEventListener('click', () => { $$('.overlay.show').forEach(o => dismissOverlay(o)); if (special && window.PatolliLearn) PatolliLearn.exitSpecial(); scrollTo({ top: 0, behavior: 'smooth' }); });
$('#btnSound').onclick = () => { settings.sound = !settings.sound; try { localStorage.setItem('atlas-sfx', settings.sound ? '1' : '0'); } catch (e) {} $('#btnSound').classList.toggle('on', settings.sound); save(); if (settings.sound) snd('place'); };
$('#langSel').onchange = e => {
  LANG = e.target.value; settings.lang = LANG; save(); try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {}
  applyI18n(); kifuKey = ''; renderAll();
  if ($('#newOverlay').classList.contains('show')) { segSync(); designPickers(); }
  if (HB) HB.relabel();
  if (window.PatolliCoach) PatolliCoach.relabel();
  if (window.GameRecord && GameRecord.relabel) GameRecord.relabel();
  if (window.PatolliLearn) PatolliLearn.relang();
};

// ====================================================================== boot
const hadSave = load();
try { const sp = localStorage.getItem('atlas-sfx'); if (sp === '0' || sp === '1') settings.sound = sp === '1'; } catch (e) {}
if (settings.lang && SUPPORTED.includes(settings.lang)) LANG = settings.lang;
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) { LANG = q; try { localStorage.setItem('aicoding-lang', q); } catch (e) {} } }
if (!game) { game = newGameObj(settings.rule, 0, 0, [1, settings.rule === 'bell' && settings.dir === 'opp' ? -1 : 1]); cur = 0; }
applyI18n();
$('#btnSound').classList.toggle('on', settings.sound);
buildView();
if (window.CountTick) { CountTick.setMuted(() => !settings.sound); }
if (window.RulesOffer) RulesOffer.init({ game: GID, lang: () => LANG, open: () => window.PatolliLearn && PatolliLearn.openRules(0), watch: '#rulesOverlay' });
if (window.GameRecord) GameRecord.init({ game: GID, lang: () => LANG, menu: '.controls', sides: () => [t('first'), t('second')], variant: () => ({ k: game.rule, n: t('rule.' + game.rule) }), variants: () => RULES, variantName: k => t('rule.' + k), defVariant: 'bell' });
if (window.PatolliCoach) PatolliCoach.init();
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnResign', '#btnHint', '#btnRules', '#btnLesson', '#btnPuzzle'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => relayout(true));
if (window.RecordExport) RecordExport.attach({ btn: '#btnShare', key: GID, title: t('meta.title'), lang: () => LANG, toast: m => toast(m), empty: () => !game.plies.length,
  formats: () => [{ id: 'txt', label: t('fmt.txt'), ext: 'txt', meta: 'self', text: () => recordText() }],
  sides: () => [{ label: sideName(0), name: playerName(0), tag: 'Red' }, { label: sideName(1), name: playerName(1), tag: 'Blue' }] });
$('#btnCopy').onclick = () => { if (!game.plies.length) { toast(t('kifu.empty')); return; } const tx = recordText(); (navigator.clipboard ? navigator.clipboard.writeText(tx) : Promise.reject()).then(() => toast(t('copied'))).catch(() => toast(t('copied'))); };
relayout(true);
update();
if (hadSave) { if (overNow()) gameOverShown = true; afterPosition(); }
// expose for tests / other modules
window.__patolli = { get game() { return game; }, get cur() { return cur; }, settings, newGame, doRoll, commit, curState, curRoll, viewAt, rtStart, openNewDialog, get busy() { return animating || thinking; }, overNow, statusAt, posAt, line, race, hitRisk, get payView() { return payView; } };
