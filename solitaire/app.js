/* ソリティア — game controller (solitaire/app.js)
   Variant-agnostic: everything about a game type comes from SOL.VARIANTS (variants.js). */
(function () {
'use strict';
const S = window.SOL, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-solitaire', SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const DIFFS = ['easy', 'normal', 'hard', 'expert'];
const FELTS = ['green', 'blue', 'wine', 'charcoal', 'teal', 'purple', 'walnut', 'linen'];
const BACKS = ['red', 'blue', 'crimson', 'navy', 'forest', 'wave', 'stars', 'deco'];
const FACES = ['classic', 'large', 'four'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- storage ---------------- */
function load() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
const D = load();
D.set = Object.assign({ v: 'klondike', prefs: {}, felt: 'green', back: 'red', face: 'classic', auto: 'safe', tap: 'auto', anim: 1, speed: 'normal', left: 0, timer: 1, score: 1, hl: 1, sound: true, lang: '' }, D.set || {});
if (!BACKS.includes(D.set.back)) { D.set.back = 'red'; document.documentElement.dataset.back = 'red'; }
D.stats = D.stats || {}; D.daily = D.daily || {}; D.bank = D.bank || 0;
function save() { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} }
const set = D.set;
function prefOf(v) {   // { diff, o (variant options), deal, undo }
  const V = S.VARIANTS[v], p = set.prefs[v] || (set.prefs[v] = { diff: 'normal' });
  if (!p.o) { p.o = S.defaults(v); applyPreset(v, p, p.diff === 'custom' ? 'normal' : p.diff); }
  p.o = Object.assign(S.defaults(v), p.o);
  if (!p.deal) p.deal = V.solver ? 'winnable' : 'random';
  if (!p.undo) p.undo = 'on';
  return p;
}
function applyPreset(v, p, d) {
  const pr = (S.VARIANTS[v].presets || {})[d]; if (!pr) return;
  p.diff = d;
  for (const k in pr) { if (k === 'deal') p.deal = pr.deal; else if (k === 'undo') p.undo = pr.undo; else p.o[k] = pr[k]; }
  if (p.deal === 'winnable' && !S.VARIANTS[v].solver) p.deal = 'random';
}
function matchPreset(v, p) {
  const P = S.VARIANTS[v].presets || {};
  for (const d of DIFFS) { const pr = P[d]; if (!pr) continue; if (Object.keys(pr).every(k => k === 'deal' ? true : k === 'undo' ? p.undo === pr.undo : p.o[k] === pr[k])) return d; }
  return 'custom';
}

/* ---------------- language ---------------- */
let LANG = (() => { const n = (navigator.language || 'ja').toLowerCase(); return SUPPORTED.find(c => n.startsWith(c)) || 'en'; })();
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) LANG = q; }
function t(k, v) {
  let x = (I18N[LANG] || I18N.en)[k]; if (x === undefined) x = I18N.en[k]; if (x === undefined) x = I18N.ja[k]; if (x === undefined) return k;
  if (v) x = String(x).replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x;
}
const vName = v => t('v.' + v);
const optVal = (k, val) => { const s = t('ov.' + k + '.' + val); return s === 'ov.' + k + '.' + val ? String(val) : s; };
function applyI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  $$('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); e.setAttribute('aria-label', e.title); });
  $('#langSel').value = LANG; document.title = t('meta.title');
  $('#brandTitle').textContent = t('title'); $('#brandSub').textContent = LANG === 'en' ? '' : 'Solitaire';
}

/* ---------------- sound (WebAudio, synthesized) ---------------- */
let AC = null, gest = false;
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { gest = true; }, { capture: true, passive: true }));
try { const sp = localStorage.getItem('atlas-sfx'); if (sp === '0' || sp === '1') set.sound = sp === '1'; } catch (e) {}
function ac() { if (!AC && !gest) return null; if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended' && !document.hidden) AC.resume(); return AC; }
document.addEventListener('visibilitychange', () => { if (AC) { if (document.hidden) AC.suspend(); else AC.resume(); } });
function noise(a, t0, dur, f, q, g) {
  const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const s = a.createBufferSource(), bp = a.createBiquadFilter(), gn = a.createGain(); s.buffer = b; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; gn.gain.value = g;
  s.connect(bp).connect(gn).connect(a.destination); s.start(t0);
}
function tone(a, t0, f, dur, g, type) {
  const o = a.createOscillator(), gn = a.createGain(); o.type = type || 'sine'; o.frequency.value = f;
  gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(g, t0 + .01); gn.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
  o.connect(gn).connect(a.destination); o.start(t0); o.stop(t0 + dur + .05);
}
// recorded sounds (snd/place.mp3, snd/shuffle.mp3): decoded once after the first gesture; synthesized fallback until then
const SND = {}, SND_SRC = { place: 'snd/place.mp3?v=1', shuffle: 'snd/shuffle.mp3?v=1' };
function loadSnd(a) {
  for (const k in SND_SRC) if (!SND[k]) { SND[k] = 'loading'; fetch(SND_SRC[k]).then(r => r.arrayBuffer()).then(b => new Promise((ok, ng) => a.decodeAudioData(b, ok, ng))).then(buf => { SND[k] = buf; }).catch(() => { SND[k] = null; }); }
}
function play(a, k, t, gain, rate) {
  const b = SND[k]; if (!b || b === 'loading') return false;
  const s = a.createBufferSource(), g = a.createGain(); s.buffer = b; s.playbackRate.value = rate || 1; g.gain.value = gain == null ? 1 : gain;
  s.connect(g).connect(a.destination); s.start(t); return true;
}
const vary = () => .93 + Math.random() * .14;   // a little pitch variation so repeated cards don't sound mechanical
function sfx(k) {
  if (!set.sound || document.hidden) return; const a = ac(); if (!a) return; loadSnd(a); const n = a.currentTime + .005;
  const card = (t, g) => play(a, 'place', t, g == null ? .9 : g, vary()) || noise(a, t, .07, 2400, .9, .55);
  if (k === 'place') card(n);
  else if (k === 'flip') { card(n, .8); }
  else if (k === 'draw') card(n, .7);
  else if (k === 'found') { card(n); tone(a, n + .04, 1318.5, .35, .045); tone(a, n + .04, 1975.5, .3, .02); }
  else if (k === 'run') { card(n); [784, 988, 1175, 1568].forEach((f, i) => tone(a, n + .05 + i * .07, f, .5, .06, 'triangle')); }
  else if (k === 'shuffle') { if (!play(a, 'shuffle', n, 1)) for (let i = 0; i < 9; i++) noise(a, n + i * .045, .06, 2600 + Math.random() * 800, .9, .35); }
  else if (k === 'deal') for (let i = 0; i < 5; i++) card(n + i * .07, .55 + Math.random() * .25);   // spider: a card onto every column
  else if (k === 'bad') tone(a, n, 196, .18, .08, 'triangle');
  else if (k === 'ok') { tone(a, n, 1046.5, .5, .12, 'triangle'); tone(a, n + .2, 1318.5, .7, .12, 'triangle'); }
  else if (k === 'ng') tone(a, n, 220, .3, .08, 'sine');
  else if (k === 'win') [523.3, 659.3, 784, 1046.5, 1318.5, 1568].forEach((f, i) => { tone(a, n + i * .09, f, .9, .09, 'triangle'); tone(a, n + i * .09, f * 2, .5, .02); });
  else if (k === 'hint') tone(a, n, 880, .25, .05);
}
// decode the recordings as soon as the page may make sound
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { const a = ac(); if (a) loadSnd(a); }, { once: true, passive: true }));

/* ---------------- game state ---------------- */
let st = null, G = null;   // G: { undo:[], el (ms), t0, started, over, diff, deal, daily, counted }
let timerId = 0;
const mt = () => !set.anim ? 0 : set.speed === 'slow' ? 480 : set.speed === 'fast' ? 170 : 300;
document.documentElement.style.setProperty('--mt', (mt() || 1) / 1000 + 's');
const snap = () => ({ p: st.p.map(q => ({ c: q.c.slice(), d: q.d })), pass: st.pass, runs: st.runs, sc: st.sc, mv: st.mv });
function layoutOpts(o) { return Object.assign({}, o, { left: set.left ? 1 : 0 }); }
function makeState(v, o, no) { const s = S.newGame(v, layoutOpts(o), no); s.o = Object.assign({}, o); s.L = S.VARIANTS[v].layout(layoutOpts(o)); return s; }
function saveGame() {
  if (!st) return;
  D.cur = { v: st.v, o: st.o, no: st.no, p: st.p, pass: st.pass, runs: st.runs, sc: st.sc, mv: st.mv, undo: G.undo.slice(-300), el: elapsed(), started: G.started, over: G.over, diff: G.diff, deal: G.deal, daily: G.daily, undoOk: G.undoOk, counted: G.counted, bank0: G.bank0 };
  save();
}
function elapsed() { return G ? G.el + (G.t0 ? Date.now() - G.t0 : 0) : 0; }
function startTimer() { if (G.over || G.t0 || document.hidden) return; G.t0 = Date.now(); clearInterval(timerId); timerId = setInterval(renderNums, 1000); }
function stopTimer() { if (G && G.t0) { G.el += Date.now() - G.t0; G.t0 = 0; } clearInterval(timerId); }
document.addEventListener('visibilitychange', () => { if (!G) return; if (document.hidden) { stopTimer(); saveGame(); } else if (G.started && !G.over) startTimer(); });
window.addEventListener('pagehide', () => { stopTimer(); saveGame(); });
const fmtT = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/* ---------------- table ---------------- */
let TB = null;
function busy() { return !!(G && G.auto) || $('.overlay.show') != null; }
function initTable() {
  TB = new Table($('#table'), {
    canAct: () => !busy() && st && !G.over,
    hlOn: () => !!set.hl,
    onMove: (mv) => userMove(mv),
    onStock: () => userMove({ s: 1 }),
    onTap: (pi, ci) => tap(pi, ci),
    onDouble: (pi, ci) => toFoundation(pi, ci),
    onPile: pi => pileTap(pi),
    onBad: () => sfx('bad'),
  });
  $('#boardWrap').classList.add('felt-bg');
}
function draw(opt) { TB.set(st, opt); renderAll(); }

/* ---------------- moves ---------------- */
function userMove(mv, quiet) {
  if (!st || G.over || G.auto) return false;
  if (!S.legal(st, mv)) {
    if (mv.s) { toast(t('toast.noStock')); sfx('bad'); }
    else { sfx('bad'); }
    return false;
  }
  G.undo.push(snap()); G.lastMv = mv;
  TB.sel = null;
  const ev = S.apply(st, mv);
  G.started = true; startTimer();
  if (!G.counted) { G.counted = true; countStart(); }
  playEv(ev);
  draw();
  afterMove();
  return true;
}
function playEv(ev) {
  if (ev.runs && ev.runs.length) sfx('run');
  else if (ev.stock) sfx(ev.recycle ? 'shuffle' : ev.deal ? 'deal' : 'draw');
  else if (ev.tk === 'found') sfx('found');
  else sfx(ev.flips.length ? 'flip' : 'place');
}
function afterMove() {
  saveGame();
  $('#stuck').classList.add('hidden');
  runAuto(() => {
    if (G.over) return;
    if (S.won(st)) return win();
    checkAutoComplete();
    if (S.stuck(st)) $('#stuck').classList.remove('hidden');
  });
}
function runAuto(done) {
  const step = () => {
    const mv = S.autoMove(st, set.auto); if (!mv) { G.auto = false; done(); return; }
    G.auto = true;
    const ev = S.apply(st, mv); playEv(ev); draw(); saveGame();
    setTimeout(step, Math.max(60, mt() * .55));
  };
  if (S.autoMove(st, set.auto)) setTimeout(step, Math.max(60, mt() * .6)); else done();
}
function canAutoComplete() {
  const V = S.VARIANTS[st.v]; if (!V.solver) return false;
  const c = S.clone(st);
  if (c.p.some((P, i) => c.L[i].k === 'tab' && P.d > 0)) return false;
  for (let k = 0; k < 120; k++) { const m = S.autoMove(c, 'all'); if (!m) break; S.apply(c, m); }
  return S.won(c);
}
function checkAutoComplete() { $('#btnAuto').classList.toggle('hidden', G.over || !canAutoComplete()); }
function autoComplete() {
  if (G.auto || G.over) return;
  $('#btnAuto').classList.add('hidden'); G.undo.push(snap()); G.auto = true;
  const step = () => {
    const mv = S.autoMove(st, 'all'); if (!mv) { G.auto = false; if (S.won(st)) win(); else afterMove(); return; }
    const ev = S.apply(st, mv); playEv(ev); draw(); setTimeout(step, Math.max(50, mt() * .35));
  };
  step();
}
function destinations(pi, ci) {
  const V = S.VARIANTS[st.v], out = [];
  for (let t = 0; t < st.p.length; t++) if (t !== pi && V.canDrop(st, pi, ci, t)) out.push(t);
  return out;
}
function bestDest(pi, ci) {
  const ds = destinations(pi, ci); if (!ds.length) return null;
  const c = st.p[pi].c[ci], score = t => {
    const k = st.L[t].k, T = st.p[t];
    if (k === 'found') return 100;
    if (k === 'tab' && T.c.length) return 60 + (S.SUIT(S.top(T)) === S.SUIT(c) ? 10 : 0) - Math.abs(t - pi) * .1;
    if (k === 'tab') return ci === 0 && st.L[pi].k === 'tab' ? -10 : 30 - Math.abs(t - pi) * .1;
    if (k === 'cell') return 20 - t * .01;
    return 0;
  };
  return ds.sort((a, b) => score(b) - score(a))[0];
}
function tap(pi, ci) {
  if (set.tap === 'select') {
    if (TB.sel && TB.sel.pi !== pi) { pileTap(pi); return; }
    if (TB.sel && TB.sel.pi === pi && TB.sel.ci === ci) { TB.select(null); return; }
    TB.select(pi, ci); return;
  }
  const t = bestDest(pi, ci);
  if (t == null) { TB.shake(pi, ci); sfx('bad'); return; }
  userMove({ f: pi, i: ci, t });
}
function pileTap(pi) {
  if (!TB.sel) return;
  const { pi: f, ci: i } = TB.sel; TB.sel = null;
  if (!userMove({ f, i, t: pi })) { TB.select(null); TB.shake(f, i); }
}
function toFoundation(pi, ci) {
  const t = destinations(pi, ci).find(x => st.L[x].k === 'found');
  if (t != null) userMove({ f: pi, i: ci, t }); else tap(pi, ci);
}
function undo() {
  if (!st || G.auto) return;
  if (!G.undoOk) { toast(t('toast.noUndo')); sfx('bad'); return; }
  if (G.over || !G.undo.length) { sfx('bad'); return; }
  const s = G.undo.pop(); st.p = s.p; st.pass = s.pass; st.runs = s.runs; st.sc = s.sc; st.mv = s.mv + 1;
  TB.sel = null; sfx('flip'); draw(); saveGame();
  $('#stuck').classList.add('hidden'); checkAutoComplete();
}

/* ---------------- hint ---------------- */
let worker = null, wid = 0; const wcb = {};
function W() {
  if (worker === false) return null;
  if (!worker) { try { worker = new Worker('solver.js?v=1'); worker.onmessage = e => { const f = wcb[e.data.id]; delete wcb[e.data.id]; if (f) f(e.data); }; worker.onerror = () => { worker = false; }; } catch (e) { worker = false; return null; } }
  return worker;
}
function ask(msg, cb, fallback) {
  const w = W(); if (!w) { setTimeout(() => cb(fallback()), 10); return; }
  const id = ++wid; wcb[id] = cb; msg.id = id;
  const tm = setTimeout(() => { if (wcb[id]) { delete wcb[id]; try { worker.terminate(); } catch (e) {} worker = null; cb(fallback()); } }, msg.timeout || 9000);
  const cb0 = cb; wcb[id] = r => { clearTimeout(tm); cb0(r); };
  w.postMessage(msg);
}
let lastHint = 0;
function hint() {
  if (!st || G.over || G.auto || busy()) return;
  const V = S.VARIANTS[st.v], my = ++lastHint;
  const heur = () => {
    let ms = S.moves(st).filter(m => !(m.f != null && st.L[m.f].k === 'tab' && st.L[m.t].k === 'tab' && m.i === 0 && !st.p[m.t].c.length));
    const last = G.undo.length ? G.lastMv : null;
    ms = ms.filter(m => !(last && m.f === last.t && m.t === last.f));
    ms.sort((a, b) => (V.rank ? V.rank(st, b) - V.rank(st, a) : 0));
    return ms[0] || null;
  };
  const show = mv => {
    if (my !== lastHint || G.over) return;
    if (!mv) { toast(t('hint.none')); sfx('bad'); return; }
    if (mv.s) toast(t('hint.stock'));
    TB.hint(mv); sfx('hint');
  };
  if (!V.solver) { show(heur()); return; }
  const snapSt = { v: st.v, o: layoutOpts(st.o), p: st.p, pass: st.pass, runs: st.runs, sc: st.sc, mv: st.mv };
  ask({ cmd: 'solve', st: snapSt, limit: 25000, timeout: 6000 }, r => {
    if (r && r.ok && r.path.length) { show(r.path[0]); return; }
    if (r && !r.ok && !r.out) { toast(t('hint.lose')); const h = heur(); if (h) { TB.hint(h); } return; }
    show(heur());
  }, () => ({ ok: false, out: true }));
}

/* ---------------- new game / deals ---------------- */
function dailyKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dailyNo(v, day) { return S.hashStr('solitaire-daily-' + v + '-' + day) % 999999 + 1; }
function dailyOpts(v) { const p = { o: S.defaults(v) }; applyPreset(v, p, 'normal'); return { o: p.o, undo: 'on' }; }
let finding = 0;
function startGame(v, opt) {
  // opt: { o, diff, deal: 'random'|'winnable'|'number'|'daily', no, undo }
  abandon();
  const V = S.VARIANTS[v]; set.v = v; save();
  const go = no => {
    hideBusy();
    st = makeState(v, opt.o, no);
    G = { undo: [], el: 0, t0: 0, started: false, over: false, diff: opt.diff, deal: opt.deal, daily: opt.deal === 'daily' ? dailyKey() : null, undoOk: opt.undo !== 'off', counted: false };
    if (v === 'klondike' && st.o.scoring === 'vegasCum') { st.sc = D.bank - 52; G.bank0 = D.bank; }
    $('#stuck').classList.add('hidden'); $('#btnAuto').classList.add('hidden');
    TB.sel = null; TB.set(st, { deal: true, anim: !!set.anim, step: v === 'spider' ? 12 : 22 }); renderAll(); sfx('shuffle');
    saveGame(); checkAutoComplete();
    setTimeout(() => { if (st && !G.started && !G.over) runAuto(() => { saveGame(); checkAutoComplete(); }); }, set.anim ? 52 * 22 + 500 : 50);
    if (V.solver && opt.deal !== 'winnable') preFind(v, opt.o);
  };
  if (opt.deal === 'number') return go(Math.max(1, Math.min(1000000, opt.no | 0 || 1)));
  if (opt.deal === 'daily') {
    const d0 = dailyNo(v, dailyKey());
    if (!V.solver) return go(d0);
    const ck = 'dl:' + v + ':' + dailyKey(); if (D[ck]) return go(D[ck]);
    showBusy(t('busy.find'));
    return ask({ cmd: 'find', v, o: layoutOpts(opt.o), tries: 60, limit: 30000, seed: d0, det: 1, timeout: 40000 }, r => { const no = r && r.no || d0; D[ck] = no; Object.keys(D).forEach(k => { if (k.startsWith('dl:') && !k.endsWith(dailyKey())) delete D[k]; }); go(no); }, () => ({ no: d0 }));
  }
  if (opt.deal === 'winnable' && V.solver) {
    const k = cacheKey(v, opt.o), q = (D.pool || {})[k];
    if (q && q.length) { const no = q.shift(); save(); go(no); return; }
    showBusy(t('busy.find')); const my = ++finding;
    ask({ cmd: 'find', v, o: layoutOpts(opt.o), tries: 40, limit: 30000, timeout: 30000 }, r => { if (my !== finding) return; go(r && r.no || randNo()); }, () => ({ no: randNo() }));
    return;
  }
  go(randNo());
}
const randNo = () => 1 + Math.floor(Math.random() * 999999);
const cacheKey = (v, o) => v + ':' + JSON.stringify(o);
let preBusy = false;
function preFind(v, o) {   // keep one winnable deal ready for the next game with the current options
  const k = cacheKey(v, o); D.pool = D.pool || {}; const q = D.pool[k] || (D.pool[k] = []);
  if (q.length >= 1 || preBusy) return; preBusy = true;
  ask({ cmd: 'find', v, o: layoutOpts(o), tries: 30, limit: 30000, timeout: 30000 }, r => { preBusy = false; if (r && r.no) { q.push(r.no); const ks = Object.keys(D.pool); if (ks.length > 12) delete D.pool[ks[0]]; save(); } }, () => ({}));
}
function restart() {
  if (!st) return;
  const v = st.v, o = st.o, no = st.no, keep = { diff: G.diff, deal: G.deal, daily: G.daily, undoOk: G.undoOk, counted: G.counted && !G.over, el: G.over ? 0 : elapsed() };
  stopTimer();
  st = makeState(v, o, no);
  G = { undo: [], el: keep.el, t0: 0, started: keep.counted, over: false, diff: keep.diff, deal: keep.deal, daily: keep.daily, undoOk: keep.undoOk, counted: keep.counted };
  if (v === 'klondike' && st.o.scoring === 'vegasCum') { st.sc = D.bank - 52; G.bank0 = D.bank; }
  $('#stuck').classList.add('hidden'); $('#btnAuto').classList.add('hidden');
  TB.set(st, { deal: true, anim: !!set.anim, step: v === 'spider' ? 12 : 22 }); renderAll(); sfx('shuffle'); saveGame();
}
function curOpt() { return { o: st.o, diff: G.diff, deal: G.deal === 'daily' ? 'number' : G.deal, no: st.no, undo: G.undoOk ? 'on' : 'off' }; }

/* ---------------- statistics ---------------- */
function statKey() { return G.daily ? 'daily' : (G.diff || 'custom'); }
function rec(v, k) { const a = D.stats[v] || (D.stats[v] = {}); return a[k] || (a[k] = { n: 0, w: 0, cur: 0, best: 0, bt: 0, bm: 0, bs: null }); }
function countStart() { const r = rec(st.v, statKey()); r.n++; r.cur = r.cur > 0 ? r.cur : 0; save(); }
function abandon() {   // leaving an unfinished game that was started counts as a loss (streak resets)
  if (!st || !G || G.over || !G.counted) return;
  const r = rec(st.v, statKey()); r.cur = 0;
  if (st.v === 'klondike' && st.o.scoring === 'vegasCum') D.bank = st.sc;
  save();
}
function win() {
  if (G.over) return;
  G.over = true; stopTimer(); $('#btnAuto').classList.add('hidden');
  const r = rec(st.v, statKey()), tm = elapsed(), recs = [];
  r.w++; r.cur++; r.best = Math.max(r.best, r.cur);
  if (!r.bt || tm < r.bt) { if (r.bt) recs.push('time'); r.bt = tm; }
  if (!r.bm || st.mv < r.bm) { if (r.bm) recs.push('moves'); r.bm = st.mv; }
  if (hasScore() && (r.bs == null || st.sc > r.bs)) { if (r.bs != null) recs.push('score'); r.bs = st.sc; }
  if (st.v === 'klondike' && st.o.scoring === 'vegasCum') D.bank = st.sc;
  if (G.daily) { const d = D.daily[G.daily] || (D.daily[G.daily] = {}); if (!d[st.v]) d[st.v] = { t: tm, m: st.mv }; }
  saveGame(); renderAll();
  sfx('win');
  const show = () => showResult(tm, recs);
  if (set.anim) cascade(show); else setTimeout(show, 300);
}
function hasScore() { return st.v === 'spider' || (st.v === 'klondike' && st.o.scoring !== 'none'); }
function showResult(tm, recs) {
  if (!G.over) return;
  const r = rec(st.v, statKey());
  $('#resBody').innerHTML = `<div class="nums"><div><small>${esc(t('info.time'))}</small><b>${fmtT(tm)}</b></div><div><small>${esc(t('info.moves'))}</small><b>${st.mv}</b></div><div><small>${esc(t('info.score'))}</small><b>${hasScore() ? st.sc : '—'}</b></div></div>` +
    (recs.length ? `<span class="rec">★ ${esc(t('res.new'))}：${recs.map(k => esc(t('info.' + k))).join('・')}</span>` : '') +
    `<p>${esc(vName(st.v))}・${esc(diffLabel())}　${esc(t('st.rate'))} ${pct(r)}　${esc(t('st.streak'))} ${r.cur}</p>`;
  openOv('#resultOverlay');
}
const pct = r => r.n ? Math.round(100 * r.w / r.n) + '%' : '—';
function diffLabel() { return G.daily ? t('deal.daily') : t('diff.' + (G.diff || 'custom')); }

/* ---------------- win cascade ---------------- */
function cascade(done) {
  const cv = $('#winCanvas'), ctx = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr); cv.classList.remove('hidden');
  const u = TB.g.u, w = u, h = u * S.CH, br = $('#table').getBoundingClientRect();
  const F = S.pilesOf(st, 'found').map(i => ({ i, c: st.p[i].c.slice(), x: br.left + TB.g.ox + st.L[i].x * u, y: br.top + TB.g.oy + st.L[i].y * u }));
  const queue = []; for (let r = 0; r < 13; r++) F.forEach(f => { const c = f.c[f.c.length - 1 - r]; if (c != null) queue.push({ c, x: f.x, y: f.y }); });
  const live = []; let k = 0, last = 0, stop = false, raf = 0;
  const end = () => { if (stop) return; stop = true; cancelAnimationFrame(raf); cv.classList.add('hidden'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); cv.onclick = null; done(); };
  cv.onclick = end;
  const H = innerHeight, gap = queue.length > 60 ? 45 : 85;
  const frame = ts => {
    if (stop) return;
    if (k < queue.length && ts - last > gap) { const q = queue[k++]; live.push({ c: q.c, x: q.x, y: q.y, vx: (Math.random() < .5 ? -1 : 1) * (2.5 + Math.random() * 4.5), vy: -Math.random() * 7 - 1 }); last = ts; }
    for (const p of live) {
      if (p.done) continue;
      p.vy += 0.5; p.x += p.vx; p.y += p.vy;
      if (p.y + h > H) { p.y = H - h; p.vy = -p.vy * (0.62 + Math.random() * .12); if (Math.abs(p.vy) < 2) p.vy = -7; }
      if (p.x < -w - 4 || p.x > innerWidth + 4) { p.done = true; continue; }
      drawCard(ctx, p.c, p.x, p.y, w, h);
    }
    if (k >= queue.length && live.every(p => p.done)) { setTimeout(end, 200); return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  setTimeout(end, 14000);
}
function drawCard(ctx, c, x, y, w, h) {
  const r = w * .085, s = S.SUIT(c), red = s === 1 || s === 2, face = document.documentElement.dataset.face;
  const col = face === 'four' && s === 2 ? '#1f5fbf' : face === 'four' && s === 3 ? '#1c7a3c' : red ? '#c51f30' : '#1b1c22';
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
  ctx.fillStyle = '#fbf6ea'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${w * .27}px 'Cormorant Garamond', serif`; ctx.fillText(Table.RK[S.RANK(c) - 1], x + w * .18, y + w * .2);
  ctx.font = `${w * .5}px serif`; ctx.fillText('♠♥♦♣'[s], x + w / 2, y + h * .56);
}

/* ---------------- rendering: info ---------------- */
let HB = null;
function rulesSummary(v, o) {
  const V = S.VARIANTS[v]; return (V.opts || []).map(x => { const k = 'os.' + x.k + '.' + o[x.k], s = t(k); return s !== k ? s : t('o.' + x.k) + '：' + optVal(x.k, o[x.k]); });
}
function renderNums() {
  if (!st) return;
  const tm = fmtT(elapsed()), sc = hasScore() ? st.sc : null;
  const extra = st.v === 'klondike' ? (st.o.passes ? t('info.passes', { n: Math.max(0, st.o.passes - 1 - st.pass) }) : '') : st.v === 'spider' ? t('info.deals', { n: Math.ceil(st.p[S.pilesOf(st, 'stock')[0]].c.length / 10) }) + '　' + t('info.runs', { n: st.runs }) : '';
  const ib = [`<span>⏱<b>${set.timer ? tm : '—'}</b></span>`, `<span>${esc(t('info.moves'))}<b>${st.mv}</b></span>`];
  if (sc != null && set.score) ib.push(`<span>${esc(t('info.score'))}<b>${sc}</b></span>`);
  ib.push(`<span>#<b>${st.no}</b></span>`);
  $('#infobar').innerHTML = ib.join('');
  const n = $('#nums'); if (n) n.innerHTML = `<div><small>${esc(t('info.time'))}</small><b>${set.timer ? tm : '—'}</b></div><div><small>${esc(t('info.moves'))}</small><b>${st.mv}</b></div><div><small>${esc(t('info.score'))}</small><b>${sc != null && set.score ? sc : '—'}</b></div>` + (extra ? `<div class="sub">${esc(extra)}</div>` : '');
  if (HB && HB.on) HB.setInfo(`<span class="hb-chip"><b>${esc(vName(st.v))}</b>・${esc(diffLabel())}</span><span class="hb-chip">⏱ <b>${set.timer ? tm : '—'}</b></span><span class="hb-chip">${esc(t('info.moves'))} <b>${st.mv}</b></span>` + (sc != null && set.score ? `<span class="hb-chip">${esc(t('info.score'))} <b>${sc}</b></span>` : '') + (extra ? `<span class="hb-chip">${esc(extra)}</span>` : ''));
}
const GICON = {
  klondike: '<svg viewBox="0 0 54 44"><rect x="3" y="4" width="15" height="21" rx="2.5" fill="#7b1220"/><rect x="5" y="6" width="11" height="17" rx="1.5" fill="none" stroke="#f3e4c4" stroke-width=".8"/><rect x="20" y="4" width="15" height="21" rx="2.5" fill="#fbf6ea"/><text x="23" y="12" font-size="7" font-weight="700" fill="#c51f30" font-family="serif">A</text><rect x="37" y="4" width="15" height="21" rx="2.5" fill="none" stroke="#dcbb6c" stroke-dasharray="2 2"/><rect x="11" y="18" width="15" height="21" rx="2.5" fill="#fbf6ea" stroke="#0003"/><text x="14" y="26" font-size="7" font-weight="700" fill="#1b1c22" font-family="serif">K</text><rect x="28" y="22" width="15" height="21" rx="2.5" fill="#fbf6ea" stroke="#0003"/><text x="31" y="30" font-size="7" font-weight="700" fill="#c51f30" font-family="serif">Q</text></svg>',
  spider: '<svg viewBox="0 0 54 44"><g fill="#fbf6ea" stroke="#0003">' + [0, 1, 2, 3, 4].map(i => `<rect x="${2 + i * 10.4}" y="${4 + (i % 2) * 6}" width="9.5" height="13" rx="1.8"/><rect x="${2 + i * 10.4}" y="${10 + (i % 2) * 6}" width="9.5" height="13" rx="1.8"/><rect x="${2 + i * 10.4}" y="${16 + (i % 2) * 6}" width="9.5" height="13" rx="1.8"/>`).join('') + '</g><g transform="translate(27 30)" fill="#1b1c22"><circle r="4"/><circle cy="-5" r="2.6"/><path d="M-3-1-11-6M3-1 11-6M-4 1-12 2M4 1 12 2M-3 3-10 9M3 3 10 9M-2-3-8-11M2-3 8-11" stroke="#1b1c22" stroke-width="1.3" fill="none"/></g></svg>',
  freecell: '<svg viewBox="0 0 54 44"><g fill="none" stroke="#dcbb6c" stroke-width="1"><rect x="2" y="3" width="11" height="15" rx="2"/><rect x="15" y="3" width="11" height="15" rx="2"/></g><rect x="28" y="3" width="11" height="15" rx="2" fill="#fbf6ea"/><text x="30.5" y="10" font-size="6" font-weight="700" fill="#1b1c22" font-family="serif">A</text><rect x="41" y="3" width="11" height="15" rx="2" fill="#fbf6ea"/><text x="43.5" y="10" font-size="6" font-weight="700" fill="#c51f30" font-family="serif">2</text><g fill="#fbf6ea" stroke="#0003">' + [0, 1, 2, 3].map(i => `<rect x="${3 + i * 12.5}" y="21" width="11" height="15" rx="2"/><rect x="${3 + i * 12.5}" y="27" width="11" height="15" rx="2"/>`).join('') + '</g></svg>',
};
function gIcon(v) { return GICON[v] || '<svg viewBox="0 0 54 44"><rect x="12" y="6" width="22" height="31" rx="3" fill="#fbf6ea"/></svg>'; }
function renderSide() {
  if (!st) return;
  const r = rec(st.v, statKey()), dk = dailyKey(), dd = D.daily[dk] || {};
  const chips = rulesSummary(st.v, st.o).concat(G.undoOk ? [] : [t('o.undo') + '：' + t('ov.undo.off')]);
  let h = `<div class="card"><h3>${esc(t('side.game'))}</h3><div class="g-title"><b>${esc(vName(st.v))}</b><span class="badge">${esc(diffLabel())}</span></div><div class="chips">${chips.map(c => `<span>${esc(c)}</span>`).join('')}</div>` +
    `<div class="deal-row">${esc(t('info.deal'))} <code>#${st.no}</code><span class="sp"></span><button class="sbtn" id="sCopy">${esc(t('copy'))}</button><button class="sbtn" id="sRestart">${esc(t('restart'))}</button></div></div>`;
  h += `<div class="card"><div class="nums" id="nums"></div></div>`;
  h += `<div class="card"><h3>${esc(t('side.stats'))}・${esc(vName(st.v))}（${esc(diffLabel())}）</h3><div class="srow"><div><small>${esc(t('st.played'))}</small><b>${r.n}</b></div><div><small>${esc(t('st.rate'))}</small><b>${pct(r)}</b></div><div><small>${esc(t('st.streak'))}</small><b>${r.cur}</b></div><div><small>${esc(t('st.time'))}</small><b>${r.bt ? fmtT(r.bt) : '—'}</b></div></div><div class="deal-row"><span class="sp"></span><button class="sbtn" id="sStats">${esc(t('st.more'))}</button></div></div>`;
  h += `<div class="card"><h3>${esc(t('side.daily'))}　<span style="color:var(--muted);font-weight:400;letter-spacing:0">${dk}</span></h3><div class="daily-list">` + S.ORDER.map(v => `<div class="dl-item"><span class="dl-ico">${gIcon(v)}</span><span class="nm">${esc(vName(v))}</span>${dd[v] ? `<span class="ok">✓ ${fmtT(dd[v].t)}</span>` : ''}<button class="sbtn${dd[v] ? '' : ' go'}" data-daily="${v}">${esc(t(dd[v] ? 'daily.again' : 'daily.play'))}</button></div>`).join('') + `</div><div class="deal-row">${esc(t('daily.streak', { n: dailyStreak() }))}</div></div>`;
  h += `<div class="card keys-card"><div class="keys">${t('keys')}</div></div>`;
  $('#side').innerHTML = h;
  $('#sCopy').onclick = () => { try { navigator.clipboard.writeText(String(st.no)); } catch (e) {} toast(t('copied')); };
  $('#sRestart').onclick = () => confirmBox(t('restartQ'), restart);
  $('#sStats').onclick = () => openStats(st.v);
  $$('#side [data-daily]').forEach(b => b.onclick = () => playDaily(b.dataset.daily));
  renderNums();
}
function dailyStreak() {
  let n = 0; const d = new Date();
  for (;;) { const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); if (D.daily[k] && Object.keys(D.daily[k]).length) { n++; d.setDate(d.getDate() - 1); } else if (n === 0 && k === dailyKey()) d.setDate(d.getDate() - 1); else break; if (n > 3650) break; }
  return n;
}
function playDaily(v) {
  const go = () => { const d = dailyOpts(v); startGame(v, { o: d.o, diff: 'normal', deal: 'daily', undo: 'on' }); };
  if (G && G.started && !G.over) confirmBox(t('newQ'), go); else go();
}
function renderAll() { renderSide(); $('#btnUndo').disabled = !G || !G.undoOk; $('#btnSound').classList.toggle('on', !!set.sound); }

/* ---------------- dialogs ---------------- */
function openOv(sel) { $$('.overlay.show').forEach(o => { if (o.id !== 'busyOverlay') o.classList.remove('show'); }); $(sel).classList.add('show'); }
function closeOv(sel) { $(sel).classList.remove('show'); }
$$('.overlay').forEach(o => o.addEventListener('pointerdown', e => { if (e.target === o && o.id !== 'busyOverlay' && o.id !== 'rulesOverlay') { if (o.id === 'confirmOverlay') cfDone(false); o.classList.remove('show'); } }));
let cfCb = null;
function confirmBox(msg, yes) { $('#cfMsg').textContent = msg; cfCb = yes; openOv('#confirmOverlay'); setTimeout(() => $('#cfNo').focus(), 30); }
function cfDone(ok) { closeOv('#confirmOverlay'); const f = cfCb; cfCb = null; if (ok && f) f(); }
$('#cfNo').onclick = () => cfDone(false); $('#cfYes').onclick = () => cfDone(true);
function showBusy(m) { $('#busyMsg').textContent = m; $('#busyOverlay').classList.add('show'); }
function hideBusy() { $('#busyOverlay').classList.remove('show'); }
let toastT = 0;
function toast(m) { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2400); }

/* new game dialog */
let NG = null;   // draft { v, p: {diff,o,deal,undo,no} }
function openNew() {
  const v = st ? st.v : set.v, p = JSON.parse(JSON.stringify(prefOf(v)));
  NG = { v, p: Object.assign(p, { no: st ? st.no : 1 }) };
  renderNew(); openOv('#newOverlay');
}
function draftFor(v) { const p = JSON.parse(JSON.stringify(prefOf(v))); p.no = NG.p.no; return p; }
function seg(items, cur, attr) { return `<div class="seg">${items.map(([val, lab, dis]) => `<button type="button" data-${attr}="${esc(val)}" class="${String(val) === String(cur) ? 'sel' : ''}"${dis ? ' disabled' : ''}>${esc(lab)}</button>`).join('')}</div>`; }
function renderNew() {
  const v = NG.v, V = S.VARIANTS[v], p = NG.p;
  $('#ngGames').innerHTML = S.ORDER.map(id => `<button type="button" class="gtile${id === v ? ' sel' : ''}" data-g="${id}">${gIcon(id)}<span><b>${esc(vName(id))}</b><small>${esc(t('vd.' + id))}</small></span></button>`).join('');
  let L = `<div class="sec"><span class="lab">${esc(t('new.diff'))}</span>${seg(DIFFS.map(d => [d, t('diff.' + d)]).concat([['custom', t('diff.custom')]]), p.diff, 'diff')}<p class="diff-desc">${esc(t('dd.' + v + '.' + p.diff) !== 'dd.' + v + '.' + p.diff ? t('dd.' + v + '.' + p.diff) : t('dd.custom'))}</p></div>`;
  L += `<div class="sec"><span class="lab">${esc(t('new.deal'))}</span>${seg([['random', t('deal.random')], ['winnable', t('deal.winnable'), !V.solver], ['number', t('deal.number')], ['daily', t('deal.daily')]], p.deal, 'deal')}` +
    (p.deal === 'number' ? `<div class="dno"><input id="ngNo" type="number" min="1" max="1000000" value="${p.no || 1}" inputmode="numeric" aria-label="${esc(t('deal.number'))}"></div>` : '') +
    `<p class="diff-desc">${esc(t('dealD.' + p.deal))}${!V.solver && p.deal !== 'daily' ? '　' + esc(t('deal.winnable.na')) : ''}</p></div>`;
  L += `<div class="sec"><span class="lab">${esc(t('new.rules'))}</span><div class="rules-box">` + (V.opts || []).map(x => `<div class="opt"><span>${esc(t('o.' + x.k))}</span>${seg(x.vals.map(val => [val, optVal(x.k, val)]), p.o[x.k], 'o-' + x.k)}</div>`).join('') +
    `<div class="opt"><span>${esc(t('o.undo'))}</span>${seg([['on', t('ov.undo.on')], ['off', t('ov.undo.off')]], p.undo, 'undo')}</div></div></div>`;
  $('#ngLeft').innerHTML = L;
  $('#ngRight').innerHTML = designHtml();
  // events
  $$('#ngGames [data-g]').forEach(b => b.onclick = () => { NG.v = b.dataset.g; NG.p = draftFor(NG.v); renderNew(); });
  $$('#ngLeft [data-diff]').forEach(b => b.onclick = () => { const d = b.dataset.diff; if (d === 'custom') NG.p.diff = 'custom'; else applyPreset(NG.v, NG.p, d); renderNew(); });
  $$('#ngLeft [data-deal]').forEach(b => b.onclick = () => { NG.p.deal = b.dataset.deal; renderNew(); });
  (V.opts || []).forEach(x => $$('#ngLeft [data-o-' + x.k + ']').forEach(b => b.onclick = () => { const raw = b.dataset['o-' + x.k] !== undefined ? b.dataset['o-' + x.k] : b.getAttribute('data-o-' + x.k); NG.p.o[x.k] = typeof x.def === 'number' ? +raw : raw; NG.p.diff = matchPreset(NG.v, NG.p); renderNew(); }));
  $$('#ngLeft [data-undo]').forEach(b => b.onclick = () => { NG.p.undo = b.dataset.undo; NG.p.diff = matchPreset(NG.v, NG.p); renderNew(); });
  const no = $('#ngNo'); if (no) no.oninput = () => { NG.p.no = +no.value; };
  wireDesign($('#ngRight'));
}
function designHtml() {
  const mini = (cls, inner) => `<span class="mini-card">${inner}</span>`;
  const felt = FELTS.map(f => `<button type="button" class="tile${set.felt === f ? ' sel' : ''}" data-felt="${f}"><span class="pv felt-pv" style="${feltStyle(f)}"></span><small>${esc(t('felt.' + f))}</small></button>`).join('');
  const back = BACKS.map(b => `<button type="button" class="tile${set.back === b ? ' sel' : ''}" data-back="${b}"><span class="pv"><span class="mini-card bk-pv" data-b="${b}"><span class="bk"></span></span></span><small>${esc(t('back.' + b))}</small></button>`).join('');
  const face = FACES.map(f => `<button type="button" class="tile${set.face === f ? ' sel' : ''}" data-face="${f}"><span class="pv">${facePv(f)}</span><small>${esc(t('face.' + f))}</small></button>`).join('');
  return `<div class="sec"><span class="lab">${esc(t('new.felt'))}</span><div class="tiles">${felt}</div></div><div class="sec"><span class="lab">${esc(t('new.back'))}</span><div class="tiles">${back}</div></div><div class="sec"><span class="lab">${esc(t('new.face'))}</span><div class="tiles faces">${face}</div></div>`;
}
function feltStyle(f) {
  const c = { green: ['#22704a', '#0e3a25'], blue: ['#235c97', '#0f2a4d'], wine: ['#7a2434', '#3b0e18'], charcoal: ['#3a3f45', '#16191c'], teal: ['#1d7474', '#0b3535'], purple: ['#56357f', '#24123d'], walnut: ['#7b5232', '#3d2512'], linen: ['#efe6d2', '#d6c7a6'] }[f];
  return `background:radial-gradient(120% 90% at 50% 20%,${c[0]},${c[1]})`;
}
function facePv(f) {   // two small real cards rendered in that face style
  return [12, 27].map(c => `<span class="fpv" data-fv="${f}"><span class="cd" style="position:absolute;inset:0;width:100%;height:100%"><span class="in">${Table.faceHtml(c)}</span></span></span>`).join('');
}
function wireDesign(root) {
  root.querySelectorAll('[data-felt]').forEach(b => b.onclick = () => { set.felt = b.dataset.felt; document.documentElement.dataset.felt = set.felt; save(); root.innerHTML = designHtml(); wireDesign(root); });
  root.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { set.back = b.dataset.back; document.documentElement.dataset.back = set.back; save(); root.innerHTML = designHtml(); wireDesign(root); });
  root.querySelectorAll('[data-face]').forEach(b => b.onclick = () => { set.face = b.dataset.face; document.documentElement.dataset.face = set.face; Table.applyFace(); save(); root.innerHTML = designHtml(); wireDesign(root); });
  // back previews show their own design regardless of the current one
  root.querySelectorAll('.bk-pv').forEach(e => { const b = e.dataset.b; e.querySelector('.bk').style.cssText = backCss(b); });
  root.querySelectorAll('.fpv').forEach(e => { const f = e.dataset.fv; e.classList.toggle('face-large', f === 'large'); e.classList.toggle('face-four', f === 'four'); });
}
function backCss(b) {   // read the rule for html[data-back=b] .bk from the style sheet
  for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } for (const r of rules) if (r.selectorText === `html[data-back="${b}"] .bk` || r.selectorText === `html[data-back=${b}] .bk`) return r.style.cssText.replace(/var\(--cw\)/g, '26px') + ';transform:none;position:absolute;inset:0;border-radius:3px'; }
  return '';
}
$('#btnNewClose').onclick = () => closeOv('#newOverlay');
$('#btnStart').onclick = () => {
  const v = NG.v, p = NG.p; const no = $('#ngNo'); if (no) p.no = +no.value;
  const keep = set.prefs[v] = { diff: p.diff, o: p.o, deal: p.deal === 'daily' ? (set.prefs[v] && set.prefs[v].deal || 'random') : p.deal, undo: p.undo }; save();
  closeOv('#newOverlay');
  if (p.deal === 'daily') return playDaily(v);
  startGame(v, { o: p.o, diff: p.diff, deal: p.deal, no: p.no, undo: p.undo }); void keep;
};

/* settings */
function openSettings() {
  const ch = (k, lab) => `<label class="chk"><input type="checkbox" data-k="${k}"${set[k] ? ' checked' : ''}>${esc(lab)}</label>`;
  $('#setBody').innerHTML =
    `<div class="sec"><span class="lab">${esc(t('set.auto'))}</span>${seg([['off', t('set.auto.off')], ['safe', t('set.auto.safe')], ['all', t('set.auto.all')]], set.auto, 'auto')}</div>` +
    `<div class="sec"><span class="lab">${esc(t('set.tap'))}</span>${seg([['auto', t('set.tap.auto')], ['select', t('set.tap.select')]], set.tap, 'tap')}</div>` +
    `<div class="sec"><span class="lab">${esc(t('set.speed'))}</span>${seg([['slow', t('set.speed.slow')], ['normal', t('set.speed.normal')], ['fast', t('set.speed.fast')]], set.speed, 'speed')}</div>` +
    `<div class="sec">${ch('anim', t('set.anim'))}${ch('hl', t('set.hl'))}${ch('timer', t('set.timer'))}${ch('score', t('set.score'))}${ch('left', t('set.left'))}${ch('sound', t('set.sound'))}</div>` +
    designHtml() + `<p class="credit">${esc(t('credit'))}<br><a href="https://www.figma.com/community/file/1272002619371253628/classic-playing-cards" target="_blank" rel="noopener">Classic Playing Cards</a> by Alborz Heydaryan（Figma Community）・<a href="https://creativecommons.org/licenses/by/4.0/deed.ja" target="_blank" rel="noopener">CC BY 4.0</a></p>`;
  const body = $('#setBody');
  body.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => { set.auto = b.dataset.auto; save(); openSettings(); });
  body.querySelectorAll('[data-tap]').forEach(b => b.onclick = () => { set.tap = b.dataset.tap; TB.select(null); save(); openSettings(); });
  body.querySelectorAll('[data-speed]').forEach(b => b.onclick = () => { set.speed = b.dataset.speed; applySpeed(); save(); openSettings(); });
  body.querySelectorAll('input[data-k]').forEach(i => i.onchange = () => {
    const k = i.dataset.k; set[k] = i.checked ? 1 : 0; if (k === 'sound') { set.sound = i.checked; try { localStorage.setItem('atlas-sfx', i.checked ? '1' : '0'); } catch (e) {} }
    if (k === 'anim') applySpeed();
    if (k === 'left' && st) { st.L = S.VARIANTS[st.v].layout(layoutOpts(st.o)); TB.set(st); }
    save(); renderAll();
  });
  wireDesign(body);
  openOv('#setOverlay');
}
function applySpeed() { document.documentElement.style.setProperty('--mt', (mt() || 1) / 1000 + 's'); }
$('#btnSetClose').onclick = () => closeOv('#setOverlay');

/* statistics dialog */
let statsV = null;
function openStats(v) { statsV = v || (st ? st.v : 'klondike'); renderStats(); openOv('#statsOverlay'); }
function renderStats() {
  $('#statsTabs').innerHTML = S.ORDER.map(v => `<button type="button" data-v="${v}" class="${v === statsV ? 'sel' : ''}">${esc(vName(v))}</button>`).join('');
  $$('#statsTabs [data-v]').forEach(b => b.onclick = () => { statsV = b.dataset.v; renderStats(); });
  const A = D.stats[statsV] || {}, keys = DIFFS.concat(['custom', 'daily']).filter(k => A[k]);
  if (!keys.length) { $('#statsBody').innerHTML = `<p style="text-align:center;color:var(--muted)">${esc(t('st.none'))}</p>`; return; }
  const tot = { n: 0, w: 0, best: 0 };
  const row = (lab, r) => `<tr><td>${esc(lab)}</td><td>${r.n}</td><td>${r.w}</td><td>${pct(r)}</td><td>${r.cur != null ? r.cur : '—'}</td><td>${r.best}</td><td>${r.bt ? fmtT(r.bt) : '—'}</td><td>${r.bm || '—'}</td><td>${r.bs != null ? r.bs : '—'}</td></tr>`;
  let h = `<div class="stats-wrap"><table><tr><th></th><th>${esc(t('st.played'))}</th><th>${esc(t('st.won'))}</th><th>${esc(t('st.rate'))}</th><th>${esc(t('st.streak'))}</th><th>${esc(t('st.best'))}</th><th>${esc(t('st.time'))}</th><th>${esc(t('st.moves'))}</th><th>${esc(t('st.score'))}</th></tr>`;
  keys.forEach(k => { const r = A[k]; tot.n += r.n; tot.w += r.w; tot.best = Math.max(tot.best, r.best); h += row(k === 'daily' ? t('deal.daily') : t('diff.' + k), r); });
  h += `<tr class="tot"><td>${esc(t('st.all'))}</td><td>${tot.n}</td><td>${tot.w}</td><td>${pct(tot)}</td><td>—</td><td>${tot.best}</td><td></td><td></td><td></td></tr></table></div>`;
  if (statsV === 'klondike' && D.bank) h += `<p class="diff-desc">${esc(t('st.bank', { n: D.bank }))}</p>`;
  $('#statsBody').innerHTML = h;
}
$('#btnStatsClose').onclick = () => closeOv('#statsOverlay');
$('#btnStatsReset').onclick = () => { const v = statsV; confirmBox(t('st.resetQ', { v: vName(v) }), () => { delete D.stats[v]; if (v === 'klondike') D.bank = 0; save(); renderAll(); openStats(v); }); };

/* result */
$('#btnResStats').onclick = () => openStats(st.v);
$('#btnResAgain').onclick = () => { closeOv('#resultOverlay'); restart(); };
$('#btnResNext').onclick = () => { closeOv('#resultOverlay'); const p = prefOf(st.v); startGame(st.v, { o: p.o, diff: p.diff, deal: p.deal, undo: p.undo }); };

/* ---------------- buttons / keys ---------------- */
$('#btnNew').onclick = () => openNew();
$('#btnUndo').onclick = () => undo();
$('#btnHint').onclick = () => hint();
$('#btnStats').onclick = () => openStats();
$('#btnSettings').onclick = () => openSettings();
$('#btnAuto').onclick = () => autoComplete();
$('#stUndo').onclick = () => undo();
$('#stRestart').onclick = () => restart();
$('#stNew').onclick = () => openNew();
$('#btnSound').onclick = () => { set.sound = !set.sound; try { localStorage.setItem('atlas-sfx', set.sound ? '1' : '0'); } catch (e) {} save(); renderAll(); if (set.sound) sfx('place'); };
$('#langSel').onchange = e => {
  LANG = e.target.value; set.lang = LANG; save(); try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {}
  applyI18n(); renderAll(); if (HB) HB.relabel();
  if ($('#newOverlay').classList.contains('show')) renderNew();
  if ($('#statsOverlay').classList.contains('show')) renderStats();
  if ($('#setOverlay').classList.contains('show')) openSettings();
  if (window.SolRules) SolRules.relang();
};
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea')) return;
  const ov = $('.overlay.show');
  if (ov) { if (e.key === 'Escape' && ov.id !== 'busyOverlay') { if (ov.id === 'confirmOverlay') cfDone(false); else ov.classList.remove('show'); } return; }
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === 'z' || k === 'backspace') { e.preventDefault(); undo(); }
  else if (k === 'h') hint();
  else if (k === 'n') openNew();
  else if (k === ' ' || k === 'd') { e.preventDefault(); if (st && S.pilesOf(st, 'stock').length) userMove({ s: 1 }); }
  else if (k === 'a') { if (!$('#btnAuto').classList.contains('hidden')) autoComplete(); }
  else if (k === 'escape') TB.select(null);
});

/* ---------------- layout (phones: board fills the screen below the menu) ---------------- */
function fitTop() {
  const bw = $('#boardWrap'), r = bw.getBoundingClientRect();
  document.documentElement.style.setProperty('--top-h', Math.round(r.top + window.scrollY) + 'px');
}
window.addEventListener('resize', fitTop);

/* ---------------- start ---------------- */
applyI18n();
initTable();
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnHint', '#btnRules', '#btnStats'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => { setTimeout(() => { fitTop(); TB.relayout(); renderNums(); }, 0); });
fitTop();
if (window.RulesOffer) RulesOffer.init({ game: 'solitaire', lang: () => LANG, open: () => window.SolRules && SolRules.open(NG ? NG.v : st && st.v), watch: '#rulesOverlay' });
(function resume() {
  const c = D.cur;
  if (c && c.v && S.VARIANTS[c.v] && c.p) {
    try {
      st = makeState(c.v, c.o, c.no); st.p = c.p; st.pass = c.pass; st.runs = c.runs; st.sc = c.sc; st.mv = c.mv;
      G = { undo: c.undo || [], el: c.el || 0, t0: 0, started: !!c.started, over: !!c.over, diff: c.diff, deal: c.deal, daily: c.daily, undoOk: c.undoOk !== false, counted: !!c.counted, bank0: c.bank0 };
      TB.set(st, { anim: false }); renderAll(); checkAutoComplete();
      if (!G.over && S.stuck(st)) $('#stuck').classList.remove('hidden');
      const p = prefOf(c.v); if (S.VARIANTS[c.v].solver && p.deal === 'winnable') preFind(c.v, p.o);
      return;
    } catch (e) { console.error(e); }
  }
  const p = prefOf(set.v); startGame(set.v, { o: p.o, diff: p.diff, deal: p.deal, undo: p.undo });
})();

window.SolApp = { _st: () => st, _G: () => G, _move: m => userMove(m), t, get LANG() { return LANG; }, sfx, startGame, prefOf, openNew, vName, optVal, gIcon, set, closeOv, openOv, toast };
})();
