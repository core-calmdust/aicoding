/* ポーカー — game controller (poker/app.js)
   Six-handed cash game against five CPU players. Everything about a poker game comes from PK.VARIANTS (engine.js);
   equity / coach from PKE (equity.js, mostly in the worker). Research tools: research.js · lessons and rules: lessons.js / rules.js. */
(function () {
'use strict';
const P = window.PK, E = window.PKE, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-poker', SUPPORTED = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const FELTS = ['green', 'teal', 'blue', 'wine', 'charcoal', 'purple', 'mocha', 'linen'];
const BACKS = ['skullBlack', 'skull', 'gangsta', 'ornate', 'ornateBlack', 'floral', 'floralBlack', 'azure', 'azureBlack', 'hex', 'cube', 'red', 'blue', 'crimson', 'navy'];
const COURTS = ['gangsta', 'classic', 'antique', 'flat'];
const LEVELS = [1, 2, 3, 4], STACKS = [50, 100, 200];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NAMES = ['Alex', 'Bella', 'Carlos', 'Dana', 'Eli', 'Fiona', 'Gus', 'Hana', 'Ivan', 'Jade', 'Kai', 'Lena', 'Milo', 'Nina', 'Omar', 'Pia', 'Quinn', 'Rosa', 'Sam', 'Tara', 'Umar', 'Vera', 'Wes', 'Yuki', 'Zoe'];
const STYLE_KEYS = ['tag', 'lag', 'rock', 'station'];
// money: the cash game is played for dollars ($1/$2 blinds), a tournament for chips
const num = n => Number(n).toLocaleString('en-US');
const M = n => (T && T.tour ? '' : '$') + num(n);
const SM = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + M(Math.abs(n));
const SD = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + '$' + num(Math.abs(n));   // statistics: always the cash game
const MH = (h, n) => (h && h.tour ? '' : '$') + num(n);   // a recorded hand

/* ---------------- storage ---------------- */
function load() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
const D = load();
D.set = Object.assign({ v: 'holdem', prefs: {}, felt: 'teal', back: 'skullBlack', court: 'gangsta', cmode: 'simple', sound: true, anim: 1, speed: 'normal', hud: 1, coach: 1, autoNext: 1, showBots: 1, lang: '' }, D.set || {});
D.stats = D.stats || {}; D.hist = D.hist || [];
const set = D.set;
['felt', 'back', 'court', 'cmode'].forEach(k => { document.documentElement.dataset[k] = set[k]; });
document.documentElement.dataset.face = 'classic';
function save() { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) { if (D.hist.length > 20) { D.hist = D.hist.slice(-20); try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e2) {} } } }
function prefOf(v) {
  const V = P.VARIANTS[v], p = set.prefs[v] || (set.prefs[v] = {});
  if (!V.limits.includes(p.limit)) p.limit = V.limit;
  if (!LEVELS.includes(p.level)) p.level = 2;
  if (!STACKS.includes(p.stack)) p.stack = 100;
  if (!['mixed', 'tight', 'loose', 'aggr'].includes(p.mix)) p.mix = 'mixed';
  if (!['normal', 'turbo'].includes(p.speed)) p.speed = 'normal';
  return p;
}

/* ---------------- language ---------------- */
let LANG = (() => { const n = (navigator.language || 'ja').toLowerCase(); if (/^zh-(tw|hk|mo|hant)/.test(n)) return 'zh-TW'; return SUPPORTED.find(c => n.split('-')[0] === c) || 'en'; })();
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) LANG = q; }
function t(k, v) {
  let x = (I18N[LANG] || I18N.en)[k]; if (x === undefined) x = I18N.en[k]; if (x === undefined) x = I18N.ja[k]; if (x === undefined) return k;
  if (v) x = String(x).replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x;
}
const vName = v => t('v.' + v);
function applyI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  $$('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); e.setAttribute('aria-label', e.title); });
  requestAnimationFrame(() => fitLabels());
  $('#langSel').value = LANG; document.title = t('meta.title');
  $('#brandTitle').textContent = t('title'); $('#brandSub').textContent = LANG === 'en' ? '' : 'Poker';
}

/* ---------------- sound (recorded card sounds from the solitaire + synthesized chips) ---------------- */
let AC = null, gest = false;
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { gest = true; }, { capture: true, passive: true }));
try { const sp = localStorage.getItem('atlas-sfx'); if (sp === '0' || sp === '1') set.sound = sp === '1'; } catch (e) {}
function ac() { if (!AC && !gest) return null; if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended' && !document.hidden) AC.resume(); return AC; }
document.addEventListener('visibilitychange', () => { if (AC) { if (document.hidden) AC.suspend(); else AC.resume(); } });
const SND = {}, SND_SRC = { place: '../solitaire/snd/place.mp3?v=2', shuffle: '../solitaire/snd/shuffle.mp3?v=2', flip: '../solitaire/snd/flip.mp3?v=1', draw: '../solitaire/snd/draw.mp3?v=1', win: '../solitaire/snd/win.mp3?v=1' };
function loadSnd(a) { for (const k in SND_SRC) if (!SND[k]) { SND[k] = 'loading'; fetch(SND_SRC[k]).then(r => r.arrayBuffer()).then(b => new Promise((ok, ng) => a.decodeAudioData(b, ok, ng))).then(buf => { SND[k] = buf; }).catch(() => { SND[k] = null; }); } }
function play(a, k, tm, gain, rate) { const b = SND[k]; if (!b || b === 'loading') return false; const s = a.createBufferSource(), g = a.createGain(); s.buffer = b; s.playbackRate.value = rate || 1; g.gain.value = gain == null ? 1 : gain; s.connect(g).connect(a.destination); s.start(tm); return true; }
function noise(a, t0, dur, f, q, g) { const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = a.createBufferSource(), bp = a.createBiquadFilter(), gn = a.createGain(); s.buffer = b; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; gn.gain.value = g; s.connect(bp).connect(gn).connect(a.destination); s.start(t0); }
function tone(a, t0, f, dur, g, type) { const o = a.createOscillator(), gn = a.createGain(); o.type = type || 'sine'; o.frequency.value = f; gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(g, t0 + .01); gn.gain.exponentialRampToValueAtTime(.0008, t0 + dur); o.connect(gn).connect(a.destination); o.start(t0); o.stop(t0 + dur + .05); }
function chip(a, t0, n) { for (let i = 0; i < n; i++) { const tt = t0 + i * .045 + Math.random() * .02; tone(a, tt, 2400 + Math.random() * 900, .06, .05, 'triangle'); noise(a, tt, .03, 5200, 2, .18); } }
const vary = () => .93 + Math.random() * .14;
function sfx(k) {
  if (!set.sound || document.hidden) return; const a = ac(); if (!a) return; loadSnd(a); const n = a.currentTime + .005;
  if (k === 'deal') { if (!play(a, 'draw', n, .8, vary())) noise(a, n, .05, 3600, 1.2, .3); }
  else if (k === 'flip') { if (!play(a, 'flip', n, .9, vary())) noise(a, n, .05, 3600, 1.2, .35); }
  else if (k === 'shuffle') { if (!play(a, 'shuffle', n, 1)) for (let i = 0; i < 9; i++) noise(a, n + i * .045, .06, 2600 + Math.random() * 800, .9, .35); }
  else if (k === 'chips') chip(a, n, 3);
  else if (k === 'bigchips') chip(a, n, 7);
  else if (k === 'check') { noise(a, n, .04, 900, 1, .5); noise(a, n + .09, .04, 900, 1, .45); }
  else if (k === 'fold') { if (!play(a, 'place', n, .7, .8)) noise(a, n, .07, 2000, .9, .4); }
  else if (k === 'win') { if (!play(a, 'win', n, .9)) [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(a, n + i * .09, f, .8, .08, 'triangle')); }
  else if (k === 'turn') tone(a, n, 880, .18, .05);
  else if (k === 'ok') { tone(a, n, 1046.5, .5, .12, 'triangle'); tone(a, n + .2, 1318.5, .7, .12, 'triangle'); }
  else if (k === 'ng') tone(a, n, 220, .3, .08, 'sine');
  else if (k === 'bad') tone(a, n, 196, .18, .08, 'triangle');
}
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { const a = ac(); if (a) loadSnd(a); }, { once: true, passive: true }));

/* ---------------- worker (equity / coach) ---------------- */
let worker = null, wid = 0; const wcb = {};
function W() { if (worker === false) return null; if (!worker) { try { worker = new Worker('worker.js?v=3'); worker.onmessage = e => { const f = wcb[e.data.id]; delete wcb[e.data.id]; if (f) f(e.data.err ? null : e.data.r); }; worker.onerror = () => { worker = false; }; } catch (e) { worker = false; return null; } } return worker; }
function ask(msg, cb, fallback) {
  const w = W(); if (!w) { setTimeout(() => cb(fallback()), 5); return; }
  const id = ++wid; msg.id = id; wcb[id] = cb; w.postMessage(msg);
}

/* ---------------- game ---------------- */
let T = null, G = { busy: false, coach: null, coachKey: '', sel: [], hist: null, timer: 0, review: null };
const mt = () => !set.anim ? 0 : set.speed === 'slow' ? 1.5 : set.speed === 'fast' ? .55 : 1;
const botDelay = () => !set.anim ? 120 : Math.round(620 * mt());
const HERO = 0;
function randSeed() { return (Math.random() * 4294967296) >>> 0; }
function botStyle(mix, k) {
  if (mix === 'tight') return ['tag', 'rock'][k % 2];
  if (mix === 'loose') return ['lag', 'station'][k % 2];
  if (mix === 'aggr') return ['lag', 'tag'][k % 2];
  return STYLE_KEYS[(k + Math.floor(Math.random() * 4)) % 4];
}
function newBot(p, k, used) {
  const pool = NAMES.filter(n => !used.includes(n)); const name = pool[Math.floor(Math.random() * pool.length)];
  return { name, stack: p.stack * 2, bot: { style: botStyle(p.mix, k), level: p.level } };
}
/* the tutorial: one scripted hold'em hand on the real table (tutorial.js drives the steps) */
function startTutorial() {
  clearTimeout(G.timer); G.review = null; set.hud = 1; set.coach = 1;
  const names = ['Bella', 'Carlos', 'Dana', 'Eli', 'Fiona'];
  const seats = [{ name: t('you'), stack: 200, human: true }].concat(names.map((n, k) => ({ name: n, stack: 200, bot: { style: STYLE_KEYS[k % 4], level: 2 } })));
  const prev = D.cur;
  T = P.newTable({ v: 'holdem', limit: 'nl', sb: 1, bb: 2, seats, btn: 5 });
  T.tut = true; T.session = { hands: 0, net: 0, start: Date.now(), rebuys: 0, buyin: 200 };
  D.cur = prev;   // the saved table stays the real one
  nextHand();
}
function endTutorial() {
  clearTimeout(G.timer); T = null;
  if (D.cur && D.cur.seats && P.VARIANTS[D.cur.v] && !D.cur.tut) { T = D.cur; render(); if (T.phase === 'bet' || T.phase === 'draw') loop(); }
  else startSession('holdem');
}
/* 勝敗記録 (shared/record.js): one entry per session — when the table is cashed out / replaced, the session's net decides win / loss */
function recordSession() {
  if (!window.GameRecord || !T || T.tut || !T.session || !T.session.hands || T.session.recorded) return;
  const S = T.session; S.recorded = true;
  const sg = n => SM(n), bb = Math.round(S.net / T.bb * 10) / 10;
  try { GameRecord.add({ mode: 'ai', res: S.net > 0 ? 'w' : S.net < 0 ? 'l' : 'd', opp: vName(T.v) + ' · ' + t('lim.' + T.limit), key: T.v + ':' + T.limit, why: t('grc.hands', { n: S.hands }) + ' · ' + t('ss.net') + ' ' + sg(S.net) + ' (' + sg(bb) + ' bb)' }); } catch (e) {}
}
function startSession(v) {
  if (window.PokerTut) PokerTut.hide();
  recordSession();
  const p = prefOf(v); set.v = v;
  const used = [];
  const seats = [{ name: t('you'), stack: p.stack * 2, human: true }];
  for (let k = 0; k < 5; k++) { const b = newBot(p, k, used); used.push(b.name); seats.push(b); }
  T = P.newTable({ v, limit: p.limit, sb: 1, bb: 2, seats, btn: Math.floor(Math.random() * 6) });
  T.session = { hands: 0, net: 0, start: Date.now(), rebuys: 0, buyin: p.stack * 2 };
  D.cur = T; save();
  clearTimeout(G.timer); G.review = null;
  nextHand();
}
/* ---------------- tournament (sit & go): six players, 1,500 chips each, the blinds go up; the last one standing wins ---------------- */
const TSTACK = 1500;
const TLV = [[10, 20], [15, 30], [25, 50], [50, 100], [75, 150], [100, 200], [150, 300], [200, 400], [300, 600], [400, 800], [600, 1200], [800, 1600], [1000, 2000], [1500, 3000], [2000, 4000], [3000, 6000]];
function tourAnte(v, lv) { const bb = TLV[lv][1]; if (P.VARIANTS[v].ante) return Math.max(1, Math.round(bb / 4)); return lv >= 5 ? Math.round(bb / 8 / 5) * 5 || 5 : 0; }
function setLevel(lv) { const [sb, bb] = TLV[lv]; T.tour.lv = lv; T.sb = sb; T.bb = bb; T.small = bb; T.big = bb * 2; T.ante = tourAnte(T.v, lv); }
function startTournament(v) {
  if (window.PokerTut) PokerTut.hide();
  recordSession();
  const p = prefOf(v); set.v = v; set.fmt = 'tour';
  const used = [], seats = [{ name: t('you'), stack: TSTACK, human: true }];
  for (let k = 0; k < 5; k++) { const b = newBot(p, k, used); used.push(b.name); b.stack = TSTACK; seats.push(b); }
  T = P.newTable({ v, limit: p.limit, sb: TLV[0][0], bb: TLV[0][1], ante: tourAnte(v, 0), seats, btn: Math.floor(Math.random() * 6) });
  T.tour = { lv: 0, hands: 0, per: p.speed === 'turbo' ? 5 : 10, start: Date.now() };
  setLevel(0);
  T.session = { hands: 0, net: 0, start: Date.now(), rebuys: 0, buyin: TSTACK, recorded: true };
  D.cur = T; save();
  clearTimeout(G.timer); G.review = null;
  nextHand();
}
// before a hand: who is out, is it over, does the level go up — true when the tournament ended
function tourBefore() {
  const busted = T.seats.filter(s => s.stack <= 0 && !s.out), alive = T.seats.filter(s => s.stack > 0);
  busted.sort((a, b) => (T.startStacks ? T.startStacks[b.i] - T.startStacks[a.i] : 0));
  busted.forEach((s, k) => { s.out = true; s.sitout = true; s.place = alive.length + 1 + k; if (s.i !== HERO) toast(t('t.out', { n: s.name, p: s.place })); });
  if (T.seats[HERO].out) { finishTour(T.seats[HERO].place); return true; }
  if (alive.length <= 1) { finishTour(1); return true; }
  const lv = Math.min(TLV.length - 1, Math.floor(T.tour.hands / T.tour.per));
  if (lv !== T.tour.lv) { setLevel(lv); toast(t('t.up', { b: M(T.sb) + '/' + M(T.bb) })); }
  return false;
}
function finishTour(place) {
  clearTimeout(G.timer); hideResult();
  T.phase = 'over'; T.tour.place = place; T.tour.end = Date.now();
  const R = D.tstats || (D.tstats = {}), S = R[T.v] || (R[T.v] = { n: 0, win: 0, itm: 0, best: 0, sum: 0 });
  S.n++; S.sum += place; if (place === 1) S.win++; if (place <= 3) S.itm++; S.best = S.best ? Math.min(S.best, place) : place;
  try { if (window.GameRecord) GameRecord.add({ mode: 'ai', res: place === 1 ? 'w' : place <= 3 ? 'd' : 'l', opp: vName(T.v) + ' · ' + t('fmt.tour'), key: T.v + ':tour', why: t('grc.place', { p: place }) + ' · ' + t('grc.hands', { n: T.tour.hands }) }); } catch (e) {}
  sfx(place === 1 ? 'win' : place <= 3 ? 'bigchips' : 'fold');
  save(); render();
}
function quitTour() {
  const alive = T.seats.filter(s => s.stack > 0 && !s.out).length;
  T.seats[HERO].out = true; T.seats[HERO].place = alive; finishTour(alive);
}
function nextHand() {
  if (!T) return;
  clearTimeout(G.timer);
  if (T.phase === 'done' && T.result && G.recorded !== T.hand + ':' + T.v && G.hist) { const an = set.autoNext; set.autoNext = 0; handOver(); set.autoNext = an; clearTimeout(G.timer); }   // pressed "next" before the hand was recorded
  hideResult();
  const p = prefOf(T.v);
  // busted CPU players leave and new ones sit down; the player rebuys automatically
  const used = T.seats.map(s => s.name);
  if (T.tour) { if (T.tour.place || tourBefore()) return; }
  else T.seats.forEach((s, i) => {
    if (i === HERO) { if (s.stack < T.bb) { s.stack = p.stack * 2; T.session.rebuys++; toast(t('toast.rebuy', { n: M(p.stack * 2) })); } return; }
    if (s.stack < T.bb) { const b = newBot(p, i, used); used.push(b.name); Object.assign(s, { name: b.name, stack: b.stack, bot: b.bot }); s.fresh = true; } else s.fresh = false;
  });
  T.seats[HERO].name = t('you');
  P.startHand(T, P.mulberry(randSeed()));
  if (T.tut && window.PokerTut) PokerTut.setup(T);
  G.coach = null; G.coachKey = ''; G.sel = []; G.decisions = []; G.dealtAt = Date.now();
  G.hist = { tour: !!T.tour, v: T.v, t: Date.now(), names: T.seats.map(s => s.name), styles: T.seats.map(s => s.bot ? s.bot.style : null), btn: T.btn, start: T.startStacks.slice(), sb: T.sb, bb: T.bb, ante: T.ante, limit: T.limit, cards: null, notes: [] };
  sfx('shuffle');
  render({ deal: true });
  save();
  G.timer = setTimeout(() => T.tut && window.PokerTut ? PokerTut.ev('deal', loop) : loop(), set.anim ? 700 * mt() + 300 : 50);
}
function loop() {
  clearTimeout(G.timer);
  if (!T) return;
  if (T.phase === 'done') return handOver();
  if (T.phase === 'over') return;
  const s = T.toAct;
  if (T.phase === 'draw') {
    if (s === HERO) { render(); return; }
    G.timer = setTimeout(() => { const ix = E.botDraw(T, s); P.draw(T, ix); bubble(s, ix.length ? t('act.drawN', { n: ix.length }) : t('act.pat')); if (ix.length) sfx('deal'); render(); save(); loop(); }, botDelay());
    render(); return;
  }
  if (s === HERO) { render(); requestCoach(); sfx('turn'); if (T.tut && window.PokerTut) PokerTut.ev('turn' + T.street); return; }
  render();
  // decide first: simple moves (fold / check) go quickly, calls a little slower, bets and raises take the full "thinking" time
  const m = T.tut && window.PokerTut ? PokerTut.botMove(T, s) : E.decide(T, s, T.seats[s].bot);
  const k = m.a === 'fold' ? 0.3 : m.a === 'check' ? 0.38 : m.a === 'call' ? 0.6 : 1;
  G.timer = setTimeout(() => doAct(s, m), botDelay() * k * (0.8 + Math.random() * 0.4));
}
function doAct(s, m) {
  const before = T.street, L = P.legal(T), pot = P.potTotal(T);
  if (!P.act(T, m)) { m = L.check ? { a: 'check' } : { a: 'fold' }; P.act(T, m); }
  const e = T.log[T.log.length - 1];
  bubble(s, actLabel(e));
  sfx(e.a === 'fold' ? 'fold' : e.a === 'check' ? 'check' : (e.amt || 0) > pot * 0.6 ? 'bigchips' : 'chips');
  if (T.street !== before || T.phase === 'done') { setTimeout(() => { if (T.board.length) sfx('flip'); }, 180); }
  render(); save();
  const nextStreet = T.street !== before && T.phase !== 'done';
  G.timer = setTimeout(() => nextStreet && T.tut && window.PokerTut ? PokerTut.ev('street' + T.street, loop) : loop(), T.street !== before ? 450 * mt() + 150 : 120);
  void L;
}
function actLabel(e) {
  if (!e) return '';
  if (e.a === 'fold') return t('act.fold');
  if (e.a === 'check') return t('act.check');
  if (e.a === 'call') return t('act.call') + ' ' + M(e.amt) + (e.allin ? ' · ' + t('act.allin') : '');
  if (e.a === 'bet') return t('act.bet') + ' ' + M(e.to) + (e.allin ? ' · ' + t('act.allin') : '');
  if (e.a === 'raise') return t('act.raise') + ' ' + M(e.to) + (e.allin ? ' · ' + t('act.allin') : '');
  return '';
}
/* the player's action (from the action bar or the keyboard) */
function heroAct(m) {
  if (!T || T.phase !== 'bet' || T.toAct !== HERO) return;
  if (T.tut && window.PokerTut && !PokerTut.allow(m)) return;
  const L = P.legal(T);
  // grade the decision against the coach (computed for this exact spot)
  const c = G.coach && G.coachKey === spotKey() ? G.coach : null;
  if (c) {
    const a = m.a === 'raise' ? 'raise' : m.a === 'fold' ? 'fold' : (L.check ? 'check' : 'call');
    const grade = gradeOf(c, a, L);
    G.hist.notes.push({ st: T.street, a, rec: c.rec, eq: c.eq, need: c.need, ev: c.ev, grade, pot: c.pot, toCall: c.toCall, board: T.board.slice(), i: T.log.length, tips: tipsNow(c).slice(0, 8).map(x => ({ k: x.k, v: x.v })) });
    showVerdict(grade, c, a);
    if (!T.tut) { const S = statOf(T.v); S.dec = (S.dec || 0) + 1; if (grade <= 1) S.good = (S.good || 0) + 1; }
  }
  doAct(HERO, m);
}
// 0 best · 1 fine · 2 doubtful · 3 mistake
function gradeOf(c, a, L) {
  if (a === c.rec) return 0;
  const eq = c.eq, need = c.need;
  if (a === 'fold') return eq > need + 0.12 ? 3 : eq > need ? 2 : 1;
  if (a === 'call') return c.rec === 'fold' ? (eq < need - 0.1 ? 3 : 2) : 1;
  if (a === 'check') return c.rec === 'raise' ? 1 : 1;
  if (a === 'raise') { if (c.rec === 'fold') return eq < need * 0.6 ? 3 : 2; if (c.rec === 'check') return eq < c.fair * 0.9 ? 2 : 1; return 1; }
  return 1;
}
const spotKey = () => T ? T.hand + ':' + T.log.length + ':' + T.toAct : '';
function requestCoach() {
  if (!T || T.toAct !== HERO || T.phase !== 'bet') return;
  const key = spotKey(); if (G.coachKey === key && G.coach) { renderSide(); return; }
  G.coachKey = key; G.coach = null; renderSide();
  const snapT = JSON.parse(JSON.stringify(T)); delete snapT.session;
  ask({ cmd: 'coach', T: snapT, s: HERO }, r => { if (G.coachKey !== key) return; G.coach = r; renderSide(); renderActbar(); }, () => E.coach(T, HERO, 400));
}
function heroDraw() {
  if (!T || T.phase !== 'draw' || T.toAct !== HERO) return;
  const ix = G.sel.slice().sort((a, b) => a - b);
  const plan = E.drawPlan(T.seats[HERO].cards, P.VARIANTS[T.v]);
  G.hist.notes.push({ st: T.street, a: 'draw', drew: ix, plan, grade: ix.join() === plan.slice().sort((a, b) => a - b).join() ? 0 : Math.abs(ix.length - plan.length) <= 1 ? 1 : 2 });
  P.draw(T, ix); G.sel = []; bubble(HERO, ix.length ? t('act.drawN', { n: ix.length }) : t('act.pat'));
  if (ix.length) sfx('deal');
  render(); save(); G.timer = setTimeout(loop, 300);
}
function handOver() {
  if (G.recorded === T.hand + ':' + T.v) return; G.recorded = T.hand + ':' + T.v;
  const R = T.result, hero = T.seats[HERO];
  const net = R.net[HERO];
  T.session.hands++; T.session.net += net;
  // statistics (not for the tutorial hand)
  const S = T.tut ? {} : statOf(T.v), pre = T.log.filter(e => e.st === 0 && e.s === HERO);
  S.hands = (S.hands || 0) + 1;
  if (pre.some(e => e.a === 'call' || e.a === 'raise' || e.a === 'bet')) S.vpip = (S.vpip || 0) + 1;
  if (pre.some(e => e.a === 'raise' || e.a === 'bet')) S.pfr = (S.pfr || 0) + 1;
  const aggr = T.log.filter(e => e.s === HERO && (e.a === 'raise' || e.a === 'bet')).length, calls = T.log.filter(e => e.s === HERO && e.a === 'call').length;
  S.aggr = (S.aggr || 0) + aggr; S.calls = (S.calls || 0) + calls;
  if (R.showdown && !hero.folded) { S.wtsd = (S.wtsd || 0) + 1; if (R.won[HERO] > 0) S.wsd = (S.wsd || 0) + 1; }
  if (R.won[HERO] > 0) S.won = (S.won || 0) + 1;
  if (T.tour) T.tour.hands++;
  if (!T.tour) { S.net = (S.net || 0) + net; S.bbNet = (S.bbNet || 0) + net / T.bb; }
  const potSz = R.pots.reduce((a, p) => a + p.amt, 0);
  if (!T.tour) { if (R.won[HERO] > 0 && potSz > (S.bigPot || 0)) S.bigPot = potSz; S.graph = (S.graph || []).concat([Math.round((S.net || 0))]).slice(-200); }
  // hand history (for the review)
  G.hist.cards = T.seats.map(s => s.cards.slice()); G.hist.up = T.seats.map(s => s.up.slice());
  G.hist.board = T.board.slice(); G.hist.log = T.log.slice(); G.hist.folded = T.seats.map(s => s.folded);
  G.hist.won = R.won.slice(); G.hist.net = R.net.slice(); G.hist.showdown = R.showdown; G.hist.hand = T.hand;
  G.hist.scores = R.scores;
  if (!T.tut) { D.hist.push(G.hist); if (D.hist.length > 60) D.hist = D.hist.slice(-60); } else G.tutHist = G.hist;
  save();
  render({ show: true });
  if (R.won[HERO] > 0) sfx(potSz > T.bb * 30 ? 'win' : 'bigchips'); else sfx('chips');
  showResult();
  if (window.PokerBadges && !T.tut && !T.tour) { const TT = T; setTimeout(() => { if (T === TT) PokerBadges.checkHand(TT); }, 900); }
  if (T.tut && window.PokerTut) { PokerTut.ev('done'); return; }
  if (T.tour && T.seats.filter(q => q.stack > 0).length <= 1 || T.tour && T.seats[HERO].stack <= 0) { G.timer = setTimeout(nextHand, 2200 * Math.max(.6, mt())); return; }
  if (set.autoNext) G.timer = setTimeout(nextHand, 3400 * Math.max(.6, mt()));
}
function statOf(v) { return D.stats[v] || (D.stats[v] = {}); }

/* ---------------- rendering: table ---------------- */
// first guess for the seat / bet positions (percent of the table area); layoutTable() then places everything from measured sizes
const SEATPOS = [[50, 84], [9, 62], [14, 21], [50, 11], [86, 21], [91, 62]];
const BETPOS = [[50, 65], [23, 60], [27, 36], [50, 28], [73, 36], [77, 60]];
// portrait tables: side seats pulled in so the name plates stay on the felt
const SEATPOS_T = [[50, 87], [18, 64], [20, 24], [50, 14.5], [80, 24], [82, 64]];   // top seat low enough for its speech bubble
const BETPOS_T = [[50, 71], [27, 57], [29, 34], [50, 28.5], [71, 34], [73, 57]];
let lastBubble = {};
function bubble(s, txt) { lastBubble[s] = { txt, at: Date.now(), hand: T.hand }; }
/* DOM patching: keep the elements that did not change (no re-played animations, no image reloads = no flicker).
   Children with data-k are matched by key, cards by data-c, the rest by position. */
const keyOf = n => n.nodeType === 1 ? (n.getAttribute('data-k') || (n.hasAttribute('data-c') ? 'c' + n.getAttribute('data-c') : null)) : null;
function same(a, b) { return a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.tagName === b.tagName && keyOf(a) === keyOf(b))); }
function morphNode(a, b) {
  if (a.nodeType === 3) { if (a.data !== b.data) a.data = b.data; return; }
  for (const at of [...b.attributes]) if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
  for (const at of [...a.attributes]) if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
  morphKids(a, b);
}
function morphKids(a, b) {
  const old = [...a.childNodes], keyed = new Map();
  old.forEach(n => { const k = keyOf(n); if (k && !keyed.has(k)) keyed.set(k, n); });
  const used = new Set(), nb = [...b.childNodes];
  let idx = 0;
  const pairs = nb.map(n => {
    const k = keyOf(n); let m = null;
    if (k) { m = keyed.get(k); if (m && (used.has(m) || !same(m, n))) m = null; }
    else { while (idx < old.length && (keyOf(old[idx]) || used.has(old[idx]))) idx++; if (idx < old.length && same(old[idx], n)) m = old[idx++]; }
    if (m) used.add(m);
    return [m, n];
  });
  // drop the nodes that go away first: moving a node that stays would restart its CSS animation
  old.forEach(n => { if (!used.has(n)) n.remove(); });
  pairs.forEach(([m, n], i) => {
    if (m) morphNode(m, n); else m = n;
    const at = a.childNodes[i]; if (at !== m) a.insertBefore(m, at || null);
  });
}
function patch(el, html) { const t = document.createElement(el.tagName); t.innerHTML = html; morphKids(el, t); }
/* chips: amount → small stacks (white 1BB, red 5, green 25, black 100, purple 500) */
/* chips: amount → stacks of casino chips drawn in SVG (side band with edge inserts, face with inlay and value)
   white 1BB · red 5 · green 25 · black 100 · purple 500 */
const CHIPS = [[500, 'p'], [100, 'k'], [25, 'g'], [5, 'r'], [1, 'w']];
const CHIPC = {   // body, darker body, edge inserts, inlay, text
  w: ['#efe9db', '#b9b1a0', '#2f5fb8', '#fbf8f0', '#2f5fb8'], r: ['#c8203a', '#7a0d1e', '#f7f1e3', '#f3e7d0', '#a3142b'],
  g: ['#1d8b52', '#0d4a2b', '#f7f1e3', '#eef3e6', '#167043'], k: ['#23262e', '#0b0c10', '#e8c66e', '#f1ede2', '#23262e'], p: ['#6f36b8', '#391a66', '#f7f1e3', '#f0e9f8', '#5b2a9c'],
};
const CHIPV = { w: '1', r: '5', g: '25', k: '100', p: '500' };
function chipSvg(c, n) {
  const [body, dark, ins, inlay, txt] = CHIPC[c], W = 40, rx = 19, ry = 8.6, t = 5, cx = 20, base = 8 + (n - 1) * t + 2 * ry - ry + 1;
  const H = Math.ceil(base + ry + t + 2);
  let g = '';
  for (let k = 0; k < n; k++) {
    const y = base - k * t;   // centre of the chip's top face
    // side band: lower half-ellipse extruded by t
    g += `<path d="M${cx - rx} ${y}v${t}a${rx} ${ry} 0 0 0 ${2 * rx} 0v-${t}a${rx} ${ry} 0 0 1 -${2 * rx} 0z" fill="${dark}"/>`;
    g += `<path d="M${cx - rx} ${y}v${t}a${rx} ${ry} 0 0 0 ${2 * rx} 0v-${t}a${rx} ${ry} 0 0 1 -${2 * rx} 0z" fill="url(#chS)" opacity=".55"/>`;
    // edge inserts on the visible side (angles 20°…160°)
    [25, 60, 95, 130, 165].forEach(a => {
      const r = a * Math.PI / 180, x = cx + rx * Math.cos(r), yy = y + ry * Math.sin(r), w = 2.4 * Math.sin(r) + .4;
      g += `<rect x="${(x - w / 2).toFixed(2)}" y="${(yy + .5).toFixed(2)}" width="${w.toFixed(2)}" height="${(t - 1).toFixed(2)}" fill="${ins}" opacity=".95"/>`;
    });
    // top face
    g += `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${ry}" fill="${body}" stroke="${dark}" stroke-width=".6"/>`;
    if (k === n - 1) {
      // rim inserts on the face (8 spots)
      for (let a = 0; a < 360; a += 45) {
        const r1 = (a - 6) * Math.PI / 180, r2 = (a + 6) * Math.PI / 180, o = .97, i = .76;
        const P = (r, f) => `${(cx + rx * f * Math.cos(r)).toFixed(2)} ${(y + ry * f * Math.sin(r)).toFixed(2)}`;
        g += `<path d="M${P(r1, o)}L${P(r2, o)}L${P(r2, i)}L${P(r1, i)}z" fill="${ins}"/>`;
      }
      g += `<ellipse cx="${cx}" cy="${y}" rx="${rx * .62}" ry="${ry * .62}" fill="${inlay}" stroke="${dark}" stroke-width=".5"/>`;
      g += `<ellipse cx="${cx}" cy="${y}" rx="${rx * .52}" ry="${ry * .52}" fill="none" stroke="${txt}" stroke-width=".55" stroke-dasharray="1.4 1"/>`;
      g += `<text x="${cx}" y="${y + 2.5}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="800" font-size="${CHIPV[c].length > 2 ? 6 : 7.4}" fill="${txt}" transform="translate(0 ${y}) scale(1 .62) translate(0 -${y})">${CHIPV[c]}</text>`;
      g += `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#chF)"/>`;
    }
  }
  return `<svg class="chsv" viewBox="0 0 ${W} ${H}" style="--h:${H}">${g}</svg>`;
}
function chipStack(amt, maxStacks) {
  let u = Math.max(1, Math.round(amt / (T ? T.bb : 2))); const stacks = [];
  for (const [v, c] of CHIPS) { let n = Math.floor(u / v); if (!n) continue; u -= n * v; stacks.push([c, Math.min(n, 6)]); if (stacks.length >= (maxStacks || 2)) break; }
  if (!stacks.length) stacks.push(['w', 1]);
  return `<span class="chs">${stacks.map(([c, n]) => chipSvg(c, n)).join('')}</span>`;
}
function render(o) {
  o = o || {};
  if (!T) return;
  const V = P.VARIANTS[T.v], box = $('#pkTable'), bw = $('#boardWrap');
  // the card size comes from the table's normal (CSS) size; the table itself is then squeezed so the action bar fits on screen
  const R = fitBoard(bw, box), W = R.w, H = R.h;
  const narrow = W < 640, tall = H > W * (narrow ? .95 : 1.1);   // portrait boards have room for much bigger cards
  const cw = Math.max(26, Math.min(W / (V.stud ? (narrow || tall ? 10.5 : 13.5) : (narrow || tall ? 7.2 : 9.8)), H / (V.stud ? (tall || narrow ? 8 : 6.6) : (tall || narrow ? 8.2 : 5.7)), tall ? 170 : 130));
  bw.style.setProperty('--cw', cw + 'px'); bw.style.setProperty('--chh', cw * 1.4 + 'px');
  const done = T.phase === 'done', showAll = done && T.result && T.result.showdown;
  const winners = done ? new Set(T.result.pots.flatMap(p => p.winners || [])) : new Set();
  const heroBest = done && showAll ? null : null; void heroBest;
  let h = '';
  // board + pot
  const pot = P.potTotal(T) - P.stBets(T);
  const best5 = {};
  if (showAll) T.seats.forEach((s, i) => { if (!s.folded) best5[i] = new Set(P.handInfo(T, i).five); });
  const winFive = new Set(); if (showAll) winners.forEach(i => { (best5[i] || []).forEach(c => winFive.add(c)); });
  if (V.board) {
    h += `<div class="pk-board" data-k="board">` + [0, 1, 2, 3, 4].map(k => T.board[k] != null ? Cards.html(T.board[k], { cls: (o.deal ? '' : 'in-board') + (showAll && winFive.size && !winFive.has(T.board[k]) ? ' dim' : '') + (showAll && winFive.has(T.board[k]) ? ' hi' : '') }) : `<span class="pk-slot"></span>`).join('') + `</div>`;
  }
  h += `<div class="pk-pot${pot ? '' : ' empty'}" data-k="pot">${pot ? chipStack(pot, 3) : '<span class="chipico"></span>'}<b>${M(pot)}</b><small>${esc(t('pot'))}</small></div>`;
  // seats
  T.seats.forEach((s, i) => {
    const [x, y] = (tall || narrow ? SEATPOS_T : SEATPOS)[i], hero = i === HERO, toAct = T.toAct === i && (T.phase === 'bet' || T.phase === 'draw');
    const cards = s.cards.map((c, k) => {
      const up = V.stud ? s.up[k] : false;
      const visible = hero || up || (showAll && !s.folded && (set.showBots || winners.has(i) || true));
      const sel = hero && T.phase === 'draw' && T.toAct === HERO && G.sel.includes(k);
      const cls = [hero ? 'hero' : 'opp', sel ? 'sel' : '', showAll && !s.folded && best5[i] && best5[i].size && !best5[i].has(c) ? 'dim' : '', V.stud && !up ? 'hole' : ''].filter(Boolean).join(' ');
      return Cards.html(visible ? c : null, { cls: cls, style: `--k:${k}` });
    }).join('');
    const bub = !done && lastBubble[i] && lastBubble[i].hand === T.hand && Date.now() - lastBubble[i].at < 2600 ? lastBubble[i].txt : '';
    const info = done && showAll && !s.folded ? handName(P.handInfo(T, i)) : '';
    const style = s.bot ? t('style.' + s.bot.style) : '';
    h += `<div class="seat${hero ? ' me' : ''}${s.out ? ' out' : ''}${s.folded && T.phase !== 'idle' ? ' folded' : ''}${toAct ? ' act' : ''}${winners.has(i) ? ' win' : ''}${s.allin ? ' allin' : ''}${V.stud ? ' stud' : ''}${V.hole >= 4 && !V.stud ? ' many' : ''}${!hero && (showAll && !s.folded || V.stud) ? ' shown' : ''}" style="left:${x}%;top:${y}%" data-seat="${i}" data-k="seat${i}">` +
      `<div class="sc" style="--n:${V.stud ? 7 : V.hole}">${cards}</div>` +
      `<div class="plate"><span class="ava av${i}">${hero ? '★' : esc(s.name[0])}</span><span class="pn"><b>${esc(s.name)}</b><small>${hero ? esc(t('you.sub')) : esc(style)}</small></span><span class="st">${s.out ? 'OUT' : M(s.stack)}</span>${info ? `<span class="hinfo">${esc(info)}</span>` : ''}</div>` +
      (bub ? `<div class="bub" data-k="bub${T.hand}-${lastBubble[i].at}">${esc(bub)}</div>` : '') +
      (T.btn === i && !V.stud ? `<span class="dbtn">D</span>` : '') + `</div>`;
    if (s.bet > 0) { const [bx, by] = (tall || narrow ? BETPOS_T : BETPOS)[i]; h += `<div class="pk-bet" data-k="bet${i}" style="left:${bx}%;top:${by}%">${chipStack(s.bet)}<span>${M(s.bet)}</span></div>`; }
  });
  box.classList.toggle('nb', narrow && !!V.board && (V.hole < 4 || W < 350));   // squeezed phone table: the pot goes under the board
  if (o.deal || !box.firstChild) box.innerHTML = h; else patch(box, h);
  layoutTable(box);
  // dealing: cards fly in from the dealer (the centre)
  if (o.deal && set.anim) {
    const br = box.getBoundingClientRect(), cx = br.left + br.width / 2, cy = br.top + br.height * .42;
    let k = 0;
    box.querySelectorAll('.seat .cd').forEach(el => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--fx', (cx - r.left - r.width / 2) + 'px'); el.style.setProperty('--fy', (cy - r.top - r.height / 2) + 'px');
      el.style.animationDelay = (k++ * 55 * mt()) + 'ms'; el.classList.add('dealing');
    });
    for (let i = 0; i < Math.min(k, 14); i++) setTimeout(() => sfx('deal'), i * 55 * mt() + 40);
  }
  box.querySelectorAll('.seat.me .cd').forEach((el, k) => { el.onclick = () => { if (T.phase === 'draw' && T.toAct === HERO) { const j = G.sel.indexOf(k); if (j >= 0) G.sel.splice(j, 1); else G.sel.push(k); render(); } }; });
  renderActbar(); renderSide(); renderNums();
}

/* the action bar is always on screen (2026-11-04): the board gets the height left above it (phones: above the bar pinned
   over the tab bar; landscape phones: the bar is a column beside the board). Returns the board's normal inner size,
   which sets the card size — so the cards stay as big as before and may overlap the rail of the squeezed table. */
function fitBoard(bw, box) {
  bw.style.height = ''; bw.style.minHeight = '';
  const rail = bw.offsetHeight - box.clientHeight, refH = box.clientHeight;
  const bar = $('#actbar'), sc = $('.stage'), wr = bw.getBoundingClientRect(), br = bar.getBoundingClientRect();
  const beside = br.left >= wr.right - 1, cs = getComputedStyle(bar);
  const refW = box.clientWidth + (beside ? br.width + (parseFloat(getComputedStyle(bar.parentNode).columnGap) || 0) : 0);
  const abh = beside ? 0 : Math.max(bar.offsetHeight, parseFloat(cs.minHeight) || 0) + (parseFloat(cs.marginTop) || 0) + 10;
  let room;
  if (getComputedStyle(sc).overflowY === 'auto') {   // phones: the middle scrolls, the bar is pinned to its bottom
    const top = sc.style.paddingTop ? 0 : wr.top - sc.getBoundingClientRect().top + sc.scrollTop;
    room = sc.clientHeight - top - abh - (parseFloat(cs.bottom) || 0);
  } else room = innerHeight - (wr.top + scrollY) - abh - 8;
  const h = Math.round(Math.max(160, Math.min(bw.offsetHeight, room)));
  if (h < bw.offsetHeight) { bw.style.minHeight = '0'; bw.style.height = h + 'px'; }
  return { w: refW, h: refH };
}
/* table layout (2026-11-04): the seats, the board, the pot and the bets are placed from their measured sizes so that
   nothing covers a name plate, a hand or another bet. The table may be squeezed (fitBoard), so the seats may sit on the rail.
   The seats + the board + a slot for each seat's bet and for the pot are solved once per size (cached: no jumping seats);
   each render only drops the bets / the pot into their slots. */
const ovR = (a, b, m) => { m = m || 0; const w = Math.min(a.r, b.r) - Math.max(a.l, b.l) + m, h = Math.min(a.b, b.b) - Math.max(a.t, b.t) + m; return w > 0 && h > 0 ? w * h : 0; };
const rectAt = (cx, cy, w, h) => ({ l: cx - w / 2, t: cy - h / 2, r: cx + w / 2, b: cy + h / 2 });
let LAYC = null;
function layMeasure(box) {
  const W = box.clientWidth, H = box.clientHeight, wrap = box.parentNode, rail = (wrap.offsetHeight - H) / 2;
  const rr = (getComputedStyle(wrap).borderTopLeftRadius || '0').split(' ').map(parseFloat);
  const q = v => Math.ceil(v / 6) * 6, n = box.querySelectorAll('.seat').length;
  const seats = [...box.querySelectorAll('.seat')].map(el => {
    const i = +el.dataset.seat, c = Math.cos(Math.PI / 2 + i * 2 * Math.PI / n);
    el.classList.remove('bdn', 'bup', 'bin', 'bpl'); el.classList.toggle('cr', c < -.01); el.classList.toggle('cl', c >= -.01);
    el.style.left = '0'; el.style.top = '0';
    const w = el.offsetWidth, h = el.offsetHeight;
    const parts = [...el.children].filter(c => c.matches('.sc,.plate') && c.offsetWidth > 1)
      .map(c => ({ x: Math.round(c.offsetLeft - w / 2), y: Math.round(c.offsetTop - h / 2), w: q(c.offsetWidth), h: q(c.offsetHeight), plate: c.classList.contains('plate'), soft: !el.classList.contains('me') && c.classList.contains('sc'), hero: el.classList.contains('me') }));
    return { el, i, me: el.classList.contains('me'), parts };
  });
  const boardEl = box.querySelector('.pk-board');
  const probe = (cls, html) => { const e = document.createElement('div'); e.className = cls; e.style.cssText = 'visibility:hidden;left:0;top:0;animation:none'; e.innerHTML = html; box.appendChild(e); const r = [q(e.offsetWidth), q(e.offsetHeight)]; e.remove(); return r; };
  const bb = T ? T.bb : 2, [betW, betH] = probe('pk-bet', chipStack(bb * 66) + '<span>8888</span>'), [pw, ph] = probe('pk-pot', chipStack(bb * 666, 3) + `<b>88888</b><small>${esc(t('pot'))}</small>`);
  const hud = $('#mHud'), hudOn = hud && getComputedStyle(hud).display !== 'none' && hud.offsetWidth > 0, hpos = hud && hud.dataset.pos;
  const wr = wrap.getBoundingClientRect();
  const hudFixed = hudOn && hpos === 'corner' ? [...hud.querySelectorAll('.mh')].map(e => { const k = e.getBoundingClientRect(); return { l: k.left - wr.left - rail, t: k.top - wr.top - rail, r: k.right - wr.left - rail, b: k.bottom - wr.top - rail }; }).filter(k => k.r > k.l) : [];
  const G = { W, H, rail, rx: Math.max(0, (rr[0] || 0) - 3), ry: Math.max(0, (rr[1] == null ? rr[0] : rr[1]) - 3), n, seats,
    bw: boardEl ? q(boardEl.offsetWidth) : 0, bh: boardEl ? q(boardEl.offsetHeight) : 0, betW, betH, pw, ph, hudFixed,
    betOn: box.classList.contains('nocd'), hudW: hudOn && hpos !== 'corner' ? hud.offsetWidth : 0, hudH: hudOn && hpos !== 'corner' ? hud.offsetHeight : 0, hpos };
  G.key = JSON.stringify([G.betOn, W, H, rail, G.rx, G.ry, seats.map(s => s.parts.map(p => [Math.round(p.x / 6), Math.round(p.y / 6), p.w, p.h])), G.bw, G.bh, betW, betH, pw, ph, hudFixed.map(k => Math.round(k.t)), G.hudW, G.hudH]);
  return G;
}
function layIn(G) {   // is a rectangle inside the (rounded) table, rail included
  const { W, H, rail, rx, ry } = G, L = -rail + 3, TP = -rail + 3, RT = W + rail - 3, BT = H + rail - 3;
  const inPt = (x, y) => {
    if (x < L - .5 || x > RT + .5 || y < TP - .5 || y > BT + .5) return false;
    if (!rx || !ry) return true;
    const ex = Math.min(Math.max(x, L + rx), RT - rx), ey = Math.min(Math.max(y, TP + ry), BT - ry);
    return ((x - ex) / rx) ** 2 + ((y - ey) / ry) ** 2 <= 1.02;
  };
  return r => inPt(r.l, r.t) && inPt(r.r, r.t) && inPt(r.l, r.b) && inPt(r.r, r.b);
}
function laySolve(G, relax) {
  const { W, H, rail, rx, ry, n, seats, bw, bh, betW, betH, pw, ph } = G;
  const L = -rail + 3, TP = -rail + 3, RT = W + rail - 3, BT = H + rail - 3, cx = W / 2, inRect = layIn(G);
  const ov = relax ? (a, b, m) => ovR(a, b, Math.min(m || 0, 3)) : ovR, g = Math.max(4, Math.round(Math.min(W, H) / 42)), S = (W + H) / 4, gc = relax ? g * 1.6 : g;
  const ang = i => Math.PI / 2 + i * 2 * Math.PI / n;
  const partsAt = (s, x, y) => s.parts.map(p => ({ l: x + p.x, t: y + p.y, r: x + p.x + p.w, b: y + p.y + p.h, plate: p.plate, soft: p.soft, hero: p.hero }));
  // the opponents' face-down cards may be partly covered (by a bet, another plate's edge): a small cost, not a collision
  // (the player's seat is drawn over the others, so its cards may cover an opponent's face-down cards)
  const wt = (a, b) => a.soft && b.soft ? .02 : a.soft || b.soft ? (a.plate || b.plate ? 1 : .05) : a.plate || b.plate ? 3 : 1;
  // candidate centres per seat (inside the table, near the seat's direction)
  const cands = seats.map(s => {
    const a = ang(s.i), out = [];
    for (let y = TP; y <= BT; y += gc) for (let x = L; x <= RT; x += gc) {
      const u = (x - cx) / (W / 2), v = (y - H / 2) / (H / 2), r = Math.hypot(u, v);
      let d = Math.abs(Math.atan2(v, u) - a) % (2 * Math.PI); if (d > Math.PI) d = 2 * Math.PI - d;
      if (r < .3 || d > (relax ? 1.9 : 1.25)) continue;
      if (!partsAt(s, x, y).every(inRect)) continue;
      out.push([x, y, d * S * (s.me ? (relax ? 1.2 : 3) : 1) + (1.3 - Math.min(r, 1.3)) * S * .7]);
    }
    return out.sort((a, b) => a[2] - b[2]);
  });
  const order = seats.slice().sort((a, b) => (b.me - a.me) || (Math.sin(ang(a.i)) - Math.sin(ang(b.i))));
  function solve(by, ord, pm) {
    ord = ord || order;
    const board = bw ? rectAt(cx, by, bw, bh) : null, mid = [cx, board ? by : H * .46];
    const hudR = G.hudW ? (G.hpos === 'mid' && board ? rectAt(cx, board.b + 10 + G.hudH / 2, G.hudW, G.hudH) : rectAt(cx, H * .46, G.hudW, G.hudH)) : null;
    const soft = G.hudFixed.concat(hudR ? [hudR] : []);
    const fixed = board ? [board] : [];
    let potR = null;
    if (pm && board) { potR = rectAt(cx + (pm[1] === 'l' ? -1 : pm[1] === 'r' ? 1 : 0) * (bw - pw) / 2, pm[0] === 'a' ? board.t - 4 - ph / 2 : board.b + 4 + ph / 2, pw, ph); if (!inRect(potR)) return null; fixed.push(potR); }
    const st = {};   // seat → { x, y, P, slot, hd, c }
    const others = s => { const o = []; for (const k in st) if (+k !== s.i) { o.push(...st[k].P); if (st[k].slot) o.push(st[k].slot); } return o; };
    function place(s, list) {
      const oth = others(s); let best = null;
      for (const [x, y, base] of list || cands[s.i]) {
        if (best && base >= best.c) break;
        const P = partsAt(s, x, y); let hd = 0, sf = 0;
        for (const p of P) {
          for (const f of fixed) hd += ov(p, f, 6) * wt(p, f);
          for (const o of oth) hd += ov(p, o, 6) * wt(p, o);
          if (!s.me) for (const o of soft) sf += ov(p, o, 2);
        }
        let c = hd * 1000 + base + sf * .15;
        if (best && c >= best.c) continue;
        // the bet's slot: between the seat and the middle
        const bx = { l: Math.min(...P.map(p => p.l)), t: Math.min(...P.map(p => p.t)), r: Math.max(...P.map(p => p.r)), b: Math.max(...P.map(p => p.b)) };
        const pl = P.find(p => p.plate) || bx, dx = mid[0] - x, dy = mid[1] - y, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, uy = dy / dl;
        const ext = Math.abs(ux) * (bx.r - bx.l) / 2 + Math.abs(uy) * (bx.b - bx.t) / 2 + Math.abs(ux) * betW / 2 + Math.abs(uy) * betH / 2 + 4;
        const sx = (bx.l + bx.r) / 2, sy = (bx.t + bx.b) / 2, side = ux >= 0 ? 1 : -1;
        const sl = [[sx + ux * ext, sy + uy * ext, 0], [sx + ux * (ext + betH), sy + uy * (ext + betH), 6],
          [side > 0 ? bx.r + 4 + betW / 2 : bx.l - 4 - betW / 2, (pl.t + pl.b) / 2, 4], [side > 0 ? bx.r + 4 + betW / 2 : bx.l - 4 - betW / 2, sy, 5],
          [sx, uy < 0 ? bx.t - 4 - betH / 2 : bx.b + 4 + betH / 2, 8], [sx, uy < 0 ? bx.b + 4 + betH / 2 : bx.t - 4 - betH / 2, 30]];
        if (relax) for (let k = -2; k <= 2; k++) for (const [ax, ay] of [[1, 0], [0, 1]]) { const f = k * (ax ? betW : betH) * .5; sl.push([sx + ux * ext + ax * f, sy + uy * ext + ay * f, 10 + Math.abs(k) * 4], [side > 0 ? bx.r + 4 + betW / 2 : bx.l - 4 - betW / 2, (pl.t + pl.b) / 2 + k * betH * .5, 12 + Math.abs(k) * 4]); }
        let bs = null;
        if (G.betOn && !s.me) { sl.length = 0; sl.push([(pl.l + pl.r) / 2, pl.t - 2 - betH / 2, 0], [(pl.l + pl.r) / 2, pl.b + 2 + betH / 2, 20]); }
        for (const [qx, qy, pr] of sl) {
          const r = rectAt(qx, qy, betW, betH); if (!inRect(r)) continue;
          let h2 = 0; for (const f of fixed) h2 += ov(r, f, 4); for (const o of oth) h2 += ov(r, o, 4) * (o.soft ? .05 : 1); for (const p of P) h2 += ov(r, p, 2) * (p.soft ? .05 : 1);
          const c2 = h2 * 1000 + pr * 3;
          if (!bs || c2 < bs.c) bs = { c: c2, r, h2 };
        }
        if (!bs) bs = { c: 5e5, r: null, h2: 500 };
        c += bs.c; hd += bs.h2;
        if (!best || c < best.c) best = { x, y, P, slot: bs.r, hd, c };
      }
      return best || { x: cx, y: H / 2, P: partsAt(s, cx, H / 2), slot: null, hd: 1e6, c: 1e9 };
    }
    for (const s of ord) st[s.i] = place(s);
    for (let round = 0; round < (relax ? 4 : 2); round++) {
      let moved = false;
      for (const s of ord) { const old = st[s.i]; delete st[s.i]; const nb = place(s); st[s.i] = nb.c < old.c - .5 ? nb : old; if (st[s.i] !== old) moved = true; }
      if (!moved) break;
    }
    if (relax) for (let round = 0; round < 2; round++) for (const s of ord) {   // fine-tune: small steps around each seat
      const old = st[s.i]; if (!old.hd) continue;
      const base = (cands[s.i].find(c => c[0] === old.x && c[1] === old.y) || [0, 0, 0])[2], list = [];
      for (let dy = -g; dy <= g; dy += 2) for (let dx = -g; dx <= g; dx += 2) if (partsAt(s, old.x + dx, old.y + dy).every(inRect)) list.push([old.x + dx, old.y + dy, base]);
      delete st[s.i]; const nb = place(s, list); st[s.i] = nb.c < old.c - .5 ? nb : old;
    }
    let hard = 0, cost = 0; for (const k in st) { hard += st[k].hd; cost += st[k].c - st[k].hd * 1000; }
    // the pot: just above / below the board (or the middle of the table)
    const all = []; for (const k in st) { all.push(...st[k].P); if (st[k].slot) all.push(st[k].slot); }
    let pot = potR ? { c: 0, r: potR, hd: 0 } : null; const cs = [];
    if (potR) {} else if (board) {
      cs.push([cx, board.t - 5 - ph / 2, 0], [cx, board.b + 5 + ph / 2, 2]);
      for (const f of [-.25, .25, -.4, .4]) cs.push([cx + f * bw, board.t - 5 - ph / 2, 4], [cx + f * bw, board.b + 5 + ph / 2, 5]);
    }
    if (!potR) for (let y = TP + ph / 2; y <= BT - ph / 2; y += g) for (let x = L + pw / 2; x <= RT - pw / 2; x += g) cs.push([x, y, 12 + Math.hypot(x - mid[0], (y - mid[1]) * 1.5) * .25]);
    for (const [x, y, pr] of cs) {
      if (pot && pr * 4 >= pot.c) continue;
      const r = rectAt(x, y, pw, ph); if (!inRect(r)) continue;
      let hd = 0, sf = 0; for (const p of all) hd += ov(r, p, 4) * (p.soft ? .05 : 1); for (const f of fixed) hd += ov(r, f, 3); for (const o of soft) sf += ov(r, o, 2);
      const c = hd * 1000 + pr * 4 + sf * .1;
      if (!pot || c < pot.c) pot = { c, r, hd };
    }
    if (pot) { hard += pot.hd; cost += pot.c - pot.hd * 1000; }
    return { hard, cost: cost + (board ? Math.abs(by - H * .44) * .3 : 0), st, pot: pot && pot.r, potHd: pot ? pot.hd : -1, board, all };
  }
  let best = null;
  const better = r => r && (!best || r.hard * 1000 + r.cost < best.hard * 1000 + best.cost);
  const pms = relax && bw ? [null, 'a', 'b', 'bl', 'br', 'al', 'ar'] : [null];
  if (bw) {
    const lo = TP + bh / 2, hi = BT - bh / 2, c = 3 * g;
    let bpm = null;
    for (const pm of pms) for (let by = lo; by <= hi; by += pm ? 2 * c : c) { const r = solve(by, null, pm); if (better(r)) { best = r; bpm = pm; } if (best.hard <= 0 && relax) break; }
    const b0 = (best.board.t + best.board.b) / 2;
    for (let by = Math.max(lo, b0 - c); by <= Math.min(hi, b0 + c); by += g) { const r = solve(by, null, bpm); if (better(r)) best = r; }
    best.pm = bpm;
  } else best = solve(H * .44);
  if (relax && best.hard > 0) {   // cramped: other seat orders around the best board height
    const b0 = best.board ? (best.board.t + best.board.b) / 2 : H * .44, alt = [order.slice().reverse(), order.slice(0, 1).concat(order.slice(1).reverse()),
      order.slice().sort((a, b) => b.parts.reduce((x, p) => x + p.w * p.h, 0) - a.parts.reduce((x, p) => x + p.w * p.h, 0))];
    const pm0 = best.pm; for (const o of alt) for (const by of bw ? [b0, b0 + 2 * g, b0 - 2 * g] : [b0]) { if (bw && (by < TP + bh / 2 || by > BT - bh / 2)) continue; const r = solve(by, o, pm0); if (better(r)) best = r; }
    // still colliding: more seat orders (a fixed pseudo-random sequence, so a size always gives the same table)
    let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < (G.betOn ? 16 : 6) && layReal(best) > 0; k++) {
      const o = order.slice(0, 1).concat(order.slice(1).map(x => [rnd(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]));
      const by = bw ? Math.min(BT - bh / 2, Math.max(TP + bh / 2, b0 + Math.round((rnd() - .5) * 4) * g)) : b0;
      const r = solve(by, o, rnd() < .5 ? pm0 : pms[Math.floor(rnd() * pms.length)]); if (r && layReal(r) < layReal(best) - 1) best = r;
    }
  }
  return best;
}
/* real collisions of a solution: name plates, the player's hand, the board, the pot and the bet slots (no margins) */
function layReal(r) {
  const R = []; for (const k in r.st) { r.st[k].P.forEach(p => { if (!p.soft) R.push([k, p]); else { if (r.board) R.push([k, p, 1]); } }); if (r.st[k].slot) R.push([k + 'b', r.st[k].slot]); }
  if (r.board) R.push(['B', r.board]); if (r.pot) R.push(['P', r.pot]);
  let x = 0; for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) if (R[i][0] !== R[j][0] && (!R[i][2] && !R[j][2] || R[i][0] === 'B' || R[j][0] === 'B' || R[i][0] === 'P' || R[j][0] === 'P')) x += ovR(R[i][1], R[j][1]);
  return x;
}
const LAY_LS = 'aicoding-poker-lay';
function layoutTable(box) {
  // cramped tables, one step at a time until nothing collides: the opponents' cards tuck behind their name plates,
  // the board's gaps close up, the bets and the pot get compact, the name plates get compact, the table's corners get
  // less round, the opponents' cards go beside their plates, the player's plate goes beside the hand, and at last the opponents'
  // face-down cards become a small mark on their plates (shown over the plate at the showdown). The first step is solved at once, the others in the
  // background (a small phone takes a moment); the result is kept per table size (also across visits).
  const wrap = box.parentNode, R = v => () => wrap.style.setProperty('--R', typeof v === 'number' ? v + 'px' : Math.round(Math.min(90, wrap.offsetHeight * .26)) + 'px');
  const C = (...k) => () => box.classList.add(...k), M = ['tuck', 'tight', 'cbet', 'mini'];
  const steps = [[], [C('tuck')], [C('tuck', 'tight')], [C('tuck', 'tight', 'cbet')], [C(...M)], [C(...M), R()], [C(...M), R(44)], [C(...M, 'side'), R()], [C(...M, 'side'), R(44)], [C(...M, 'mside'), R(44)], [C(...M, 'side', 'mside'), R(44)], [C(...M, 'nocd'), R()], [C(...M, 'nocd'), R(44)]];
  const relaxAt = 4;
  const reset = () => { box.classList.remove('tuck', 'tight', 'cbet', 'mini', 'side', 'mside', 'nocd'); wrap.style.removeProperty('--R'); };
  const use = k => { reset(); steps[k].forEach(f => f()); };
  reset();
  const G0 = layMeasure(box);
  if (!LAYC || LAYC.key !== G0.key) { try { const c = JSON.parse(localStorage.getItem(LAY_LS) || '[]').find(e => e.key === G0.key); if (c) LAYC = c; } catch (e) {} }
  if (!LAYC || LAYC.key !== G0.key) {
    const r = laySolve(G0, false), real = layReal(r), key = G0.key;
    const tok = {};   // one background search at a time (a newer table size replaces it)
    const save = () => { try { const c = JSON.parse(localStorage.getItem(LAY_LS) || '[]').filter(e => e.key !== key); c.unshift(Object.assign({}, LAYC, { tok: undefined })); localStorage.setItem(LAY_LS, JSON.stringify(c.slice(0, 8))); } catch (e) {} };
    LAYC = { key, tok, best: { hard: r.hard, real, st: r.st, pot: r.pot, board: r.board }, at: 0, done: real <= 0 };
    // the order of the search: the gentle steps first; a table that is still far from fitting tries the most compact
    // steps next (so it is clean soon), then the ones in between until one fits
    const area = G0.W * G0.H, last = steps.length - 1;
    let queue = [1, 2, 3], shown = real <= 0;
    const more = () => {
      if (!LAYC || LAYC.tok !== tok || LAYC.done || !T) return;
      if ($('#pkTable') !== box || !box.isConnected) return;
      const k = queue.shift();
      const keep = { cls: box.className, R: wrap.style.getPropertyValue('--R'), pos: [...box.children].map(e => [e, e.style.left, e.style.top, e.className]) };
      use(k);
      const r2 = laySolve(layMeasure(box), k >= relaxAt), real2 = layReal(r2);
      box.className = keep.cls; if (keep.R) wrap.style.setProperty('--R', keep.R); else wrap.style.removeProperty('--R');
      keep.pos.forEach(([e, l, t, c]) => { e.style.left = l; e.style.top = t; e.className = c; });
      const b = LAYC.best, clean = real2 <= 0;
      if (clean ? b.real > 0 || k < LAYC.at : real2 < b.real - 1 || (real2 <= b.real + 1 && r2.hard < b.hard - 1)) LAYC = Object.assign(LAYC, { best: { hard: r2.hard, real: real2, st: r2.st, pot: r2.pot, board: r2.board }, at: k });
      if (k === 3 && !queue.length) queue = LAYC.best.real > area * .02 ? [last - 1, last].concat(steps.map((f, i) => i).slice(relaxAt, last - 1)) : steps.map((f, i) => i).slice(relaxAt);
      if (clean) queue = k >= last - 1 ? [] : queue.filter(i => i < k);   // a fit: done (a far-off table keeps its compact fit)
      if (!queue.length) { LAYC.done = true; save(); render(); return; }
      if (clean && !shown) { shown = true; render(); }
      setTimeout(more, 16);
    };
    if (!LAYC.done) setTimeout(more, 16); else save();
  }
  use(LAYC.at);
  box.dataset.layDone = LAYC.done ? '1' : '0';
  const G = LAYC.at ? layMeasure(box) : G0, best = LAYC.best, rail = G.rail, inT = layIn(G);
  // apply: seats, board, pot
  G.seats.forEach(s => { const p = best.st[s.i]; if (!p) return; s.el.style.left = p.x + 'px'; s.el.style.top = p.y + 'px'; });
  const boardEl = box.querySelector('.pk-board'), potEl = box.querySelector('.pk-pot');
  if (boardEl && best.board) { boardEl.style.top = (best.board.t + best.board.b) / 2 + 'px'; wrap.style.setProperty('--bbot', rail + best.board.b + 'px'); }
  else wrap.style.removeProperty('--bbot');
  // actual sizes (may differ from the slots): placed at the slot, nudged if they would touch something
  const fixed = [];
  G.seats.forEach(s => { const p = best.st[s.i]; if (p) fixed.push(...p.P); });
  if (best.board) fixed.push(best.board);
  const drop = (el, slot, extra) => {
    el.style.left = '0'; el.style.top = '0'; el.style.transform = 'translate(-50%,-50%)';
    const w = el.offsetWidth, h = el.offsetHeight, c0 = [(slot.l + slot.r) / 2, (slot.t + slot.b) / 2];
    let best2 = null;
    const test = (x, y, d) => {
      const r = rectAt(x, y, w, h);
      let hd = inT(r) ? 0 : 50; for (const f of fixed) hd += ovR(r, f, 3) * (f.soft ? .05 : 1); for (const f of extra) hd += ovR(r, f, 3);
      const c = hd * 100 + d;
      if (!best2 || c < best2.c) best2 = { c, r };
    };
    for (let k = 0; k <= 12 && !(best2 && best2.c < 100); k++) for (let a = 0; a < (k ? 8 : 1); a++) test(c0[0] + Math.cos(a * Math.PI / 4) * k * 5, c0[1] + Math.sin(a * Math.PI / 4) * k * 4, k);
    if (best2.c >= 100) for (let y = -rail + h / 2; y <= G.H + rail - h / 2; y += 4) for (let x = -rail + w / 2; x <= G.W + rail - w / 2; x += 4) test(x, y, Math.hypot(x - c0[0], y - c0[1]) * .2);   // nothing free nearby: anywhere on the table
    el.style.left = (best2.r.l + best2.r.r) / 2 + 'px'; el.style.top = (best2.r.t + best2.r.b) / 2 + 'px';
    return best2.r;
  };
  const placed = [];
  if (best.pot) placed.push(drop(potEl, best.pot, []));
  box.querySelectorAll('.pk-bet').forEach(el => { const i = +el.dataset.k.slice(3), p = best.st[i]; if (p && p.slot) placed.push(drop(el, p.slot, placed)); });
  box.dataset.lay = Math.round(best.hard);
  // speech bubbles: above the seat, below it, over its own cards or over its own plate, whichever covers nothing
  const wb = wrap.getBoundingClientRect(), RR = e => { const k = e.getBoundingClientRect(); return { l: k.left, t: k.top, r: k.right, b: k.bottom }; };
  const obs = [...box.querySelectorAll('.seat .plate,.seat.me .sc,.pk-board,.pk-pot,.pk-bet')].map(e => [e, RR(e)]);
  const bubs = [];
  box.querySelectorAll('.seat .bub').forEach(bu => {
    const own = bu.parentNode, opts = own.classList.contains('me') ? ['', 'bup', 'bin'] : ['', 'bdn', 'bin', 'bpl'];   // the player's own name stays visible
    let pick = null;
    for (const o of opts) {
      own.classList.remove('bdn', 'bup', 'bin', 'bpl'); if (o) own.classList.add(o);
      const k = RR(bu);
      const op = own.querySelector('.plate');
      let c = ovR(k, RR(op)) * 2 + (o === 'bin' && own.classList.contains('me') ? 600 : 0) + (k.t < wb.top + 2 || k.l < wb.left + 2 || k.r > wb.right - 2 || k.b > wb.bottom - 2) ? 1e6 : 0;
      for (const [e, r] of obs) if (!own.contains(e)) c += ovR(k, r) * (e.classList.contains('plate') ? 3 : 1);
      for (const r of bubs) c += ovR(k, r, 2) * 2;
      if (!pick || c < pick.c) pick = { o, c, k };
      if (!c) break;
    }
    own.classList.remove('bdn', 'bup', 'bin', 'bpl'); if (pick.o) own.classList.add(pick.o);
    bubs.push(pick.k);
  });
}

/* ---------------- action bar ---------------- */
function renderActbar() {
  const bar = $('#actbar'); if (!T) { bar.innerHTML = ''; return; }
  const myTurn = T.toAct === HERO && T.phase === 'bet', L = myTurn ? P.legal(T) : null;
  if (T.tour && T.tour.place) {
    const pl = T.tour.place;
    bar.innerHTML = `<div class="ab-msg tour-end${pl === 1 ? ' win' : ''}"><b>${esc(pl === 1 ? t('t.win') : t('t.end', { p: pl }))}</b>${pl <= 3 ? `<small>${esc(t('t.itm'))}</small>` : ''}</div><div class="ab-btns"><button class="abtn" id="abCash">${esc(t('t.toCash'))}</button><button class="abtn go" id="abAgain">${esc(t('t.again'))}</button></div>`;
    $('#abAgain').onclick = () => startTournament(T.v); $('#abCash').onclick = () => { set.fmt = 'cash'; save(); startSession(T.v); };
    return;
  }
  if (T.phase === 'draw' && T.toAct === HERO) {
    const n = G.sel.length;
    bar.innerHTML = `<div class="ab-msg">${esc(t('draw.msg'))}</div><div class="ab-btns"><button class="abtn" id="abPlan">${esc(t('draw.plan'))}</button><button class="abtn go" id="abDraw">${esc(n ? t('draw.n', { n }) : t('draw.pat'))}</button></div>`;
    $('#abDraw').onclick = heroDraw;
    $('#abPlan').onclick = () => { G.sel = E.drawPlan(T.seats[HERO].cards, P.VARIANTS[T.v]).slice(); render(); };
    return;
  }
  if (T.phase === 'done') {
    bar.innerHTML = `<div class="ab-msg">${esc(resultLine())}</div><div class="ab-btns"><button class="abtn" id="abReview">${esc(t('btn.review'))}</button><button class="abtn go" id="abNext">${esc(t('next'))}</button></div>`;
    $('#abNext').onclick = () => T.tut && window.PokerTut ? PokerTut.finish() : nextHand(); $('#abReview').onclick = () => window.PokerReview && (T.tut ? PokerReview.openHand(G.tutHist) : PokerReview.open(D.hist.length - 1));
    return;
  }
  if (!myTurn) { const who = T.toAct >= 0 ? T.seats[T.toAct] : null; bar.innerHTML = `<div class="ab-msg wait">${who ? esc(t('wait', { n: who.name })) : ''}</div>`; return; }
  const pot = P.potTotal(T), rec = set.coach && G.coach ? G.coach.rec : null;
  const recCls = a => rec && (rec === a || (a === 'call' && rec === 'check' && L.check)) ? ' rec' : '';
  let h = `<div class="ab-btns main">`;
  h += L.fold ? `<button class="abtn fold${recCls('fold')}" data-a="fold"><b>${esc(t('act.fold'))}</b><kbd>F</kbd></button>` : '';
  h += L.check ? `<button class="abtn${recCls('check')}" data-a="check"><b>${esc(t('act.check'))}</b><kbd>C</kbd></button>` : `<button class="abtn${recCls('call')}" data-a="call"><b>${esc(t('act.call'))} ${M(L.call)}</b><kbd>C</kbd></button>`;
  if (L.canRaise) {
    const word = T.curBet === 0 ? t('act.bet') : t('act.raise');
    if (L.minTo === L.maxTo) h += `<button class="abtn go${recCls('raise')}" data-a="raise" data-to="${L.minTo}"><b>${esc(word)} ${M(L.minTo)}</b><kbd>R</kbd></button>`;
    else {
      const cur = Math.max(L.minTo, Math.min(L.maxTo, G.raiseTo || L.minTo));
      h += `<button class="abtn go${recCls('raise')}" data-a="raise" id="abRaise"><b>${esc(word)} <span id="abTo">${M(cur)}</span></b><kbd>R</kbd></button>`;
      h += `</div><div class="ab-size"><input type="range" id="abRange" min="${L.minTo}" max="${L.maxTo}" step="1" value="${cur}" aria-label="${esc(word)}">` +
        [['min', L.minTo], ['half', T.curBet + Math.round((pot + L.toCall) / 2)], ['3q', T.curBet + Math.round((pot + L.toCall) * .75)], ['pot', T.curBet + pot + L.toCall], ['allin', L.maxTo]]
          .map(([k, v], j) => `<button class="szb" data-to="${Math.max(L.minTo, Math.min(L.maxTo, v))}">${esc(t('sz.' + k))}<kbd>${j + 1}</kbd></button>`).join('');
    }
  }
  h += `</div>`;
  bar.innerHTML = h;
  bar.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a; if (a !== 'raise') return heroAct({ a });
    const to = b.dataset.to ? +b.dataset.to : +$('#abRange').value; G.raiseTo = 0; heroAct({ a: 'raise', to });
  });
  const rg = $('#abRange'); if (rg) { rg.oninput = () => { G.raiseTo = +rg.value; $('#abTo').textContent = M(rg.value); }; bar.querySelectorAll('.szb').forEach(b => b.onclick = () => { rg.value = b.dataset.to; G.raiseTo = +rg.value; $('#abTo').textContent = M(rg.value); }); }
}
function resultLine() {
  const R = T.result; if (!R) return '';
  const net = R.net[HERO];
  return net > 0 ? t('res.won', { n: M(net) }) : net < 0 ? t('res.lost', { n: M(-net) }) : t('res.even');
}

/* ---------------- side panel ---------------- */
const pct = x => (x * 100).toFixed(1) + '%';
/* situational tips (tips.js): computed once per spot */
const gl = h => window.PokerGloss ? PokerGloss.mark(h, LANG) : h;   // glossary terms (gloss.js)
function tipsNow(c) {
  if (!window.PokerTips || !T) return [];
  const key = spotKey(); if (G.tipsKey === key && G.tips) return G.tips;
  try { G.tips = PokerTips.make(T, HERO, c); } catch (e) { G.tips = []; }
  G.tipsKey = key; return G.tips;
}
function tipsHtml(list) {
  if (!list || !list.length) return '';
  const n = 3, open = !!set.tipsOpen, show = open ? list : list.slice(0, n);
  return `<div class="tips" data-k="tips"><div class="tips-h">💡 ${esc(PokerTips.ui('head', LANG))}</div><ul>${show.map(x => `<li>${gl(esc(PokerTips.text(x, LANG)))}</li>`).join('')}</ul>` +
    (list.length > n ? `<button type="button" class="tips-more" id="tipsMore">${esc(open ? PokerTips.ui('less', LANG) : PokerTips.ui('more', LANG, { n: list.length - n }))}</button>` : '') + `</div>`;
}
const coachSw = () => `<button type="button" class="ck-sw${set.coach ? ' on' : ''}" data-csw role="switch" aria-checked="${set.coach ? 'true' : 'false'}" title="${esc(t('set.coach'))}"><b>${set.coach ? 'ON' : 'OFF'}</b><i></i></button>`;
function renderSide() {
  if (!T) return;
  const V = P.VARIANTS[T.v], c = G.coach && G.coachKey === spotKey() ? G.coach : null, myTurn = T.toAct === HERO && T.phase === 'bet';
  let h = '';
  // equity (the "形勢" of poker)
  if (set.hud) {
    let body;
    if (T.phase === 'done' || T.seats[HERO].folded) body = `<p class="muted">${esc(T.seats[HERO].folded && T.phase !== 'done' ? t('hud.folded') : t('hud.after'))}</p>`;
    else if (!myTurn && !c) body = `<p class="muted">${esc(t('hud.wait'))}</p>`;
    else if (!c) body = `<p class="muted calc"><span class="spin s"></span>${esc(t('hud.calc'))}</p>`;
    else {
      const winW = c.win * 100, tieW = c.tie * 100;
      const handNow = !T.seats[HERO].cards.length ? '' : V.low27 ? handName(P.handInfo(T, HERO)) : t('hand.' + P.catOf(V.omaha ? P.bestOmaha(T.seats[HERO].cards, T.board, V.short) : P.evalCards(T.seats[HERO].cards.concat(T.board), V.short), V.short));
      body = `<div class="eqbig"><b>${pct(c.eq)}</b><small>${esc(t('hud.eq', { n: c.nOpp }))}</small></div>` +
        `<div class="eqbar"><i class="w" style="width:${winW}%"></i><i class="t" style="width:${tieW}%"></i><span class="need" style="left:${Math.min(100, c.need * 100)}%" title="${esc(t('hud.need'))}"></span></div>` +
        `<div class="kv"><span>${esc(t('hud.hand'))}</span><b>${esc(handNow)}</b></div>` +
        (c.toCall ? `<div class="kv"><span>${esc(t('hud.odds'))}</span><b>${M(c.toCall)} : ${M(c.pot)} → ${pct(c.need)}</b></div><div class="kv"><span>${esc(t('hud.ev'))}</span><b class="${c.ev >= 0 ? 'pos' : 'neg'}">${c.ev >= 0 ? '+' : ''}${c.ev.toFixed(1)}</b></div>` : `<div class="kv"><span>${esc(t('hud.fair'))}</span><b>${pct(c.fair)}</b></div>`) +
        (c.outs ? `<div class="kv"><span>${esc(t('hud.outs'))}</span><b>${c.outs.length}${c.outs.length ? ` <em>(≈${pct(Math.min(1, c.outs.length * (T.board.length === 3 ? 4 : 2) / 100))})</em>` : ''}</b></div>` : '');
    }
    h += `<div class="card" data-pt="eq"><h3>${esc(t('side.eq'))}</h3>${body}</div>`;
  }
  // coach
  if (set.coach) {
    let body;
    const last = G.verdict && G.verdict.hand === T.hand ? G.verdict : null;
    if (myTurn && c) body = `<div class="rec"><span class="rb">${esc(t('rec.' + c.rec))}</span><p>${gl(esc(t('why.' + c.why[0], { eq: pct(c.eq), need: pct(c.need), fair: pct(c.fair) })))}</p></div>` + tipsHtml(tipsNow(c));
    else if (myTurn) body = `<p class="muted calc"><span class="spin s"></span>${esc(t('hud.calc'))}</p>`;
    else body = '';
    if (last) body += `<div class="verdict g${last.grade}"><b>${esc(t('grade.' + last.grade))}</b><span>${esc(t('verdict', { a: t('rec.' + last.a), rec: t('rec.' + last.rec) }))}</span></div>`;
    if (!body) body = `<p class="muted">${esc(t('coach.idle'))}</p>`;
    h += `<div class="card coach-card" data-pt="coach"><h3>${esc(t('side.coach'))}${coachSw()}</h3>${body}</div>`;
  } else h += `<div class="card coach-card ck-off" data-pt="coach"><h3>${esc(t('side.coach'))}${coachSw()}</h3><p class="muted">${esc(t('coach.off'))}</p></div>`;
  // this hand (the "棋譜")
  const streets = V.streets;
  const lines = []; let cur = -1;
  T.log.forEach(e => {
    if (e.a === 'ante' || e.a === 'return') return;
    if (e.st !== cur) { cur = e.st; lines.push(`<div class="lg-st">${esc(t('st.' + streets[e.st]))}${e.st > 0 && V.board ? ' ' + boardStr(e.st) : ''}</div>`); }
    const nm = T.seats[e.s].name, lab = e.a === 'sb' ? t('act.sb') + ' ' + M(e.amt) : e.a === 'bb' ? t('act.bb') + ' ' + M(e.amt) : e.a === 'bring' ? t('act.bring') + ' ' + M(e.amt) : e.a === 'draw' ? t('act.drawN', { n: e.n }) : actLabel(e);
    lines.push(`<div class="lg${e.s === HERO ? ' me' : ''}"><b>${esc(nm)}</b><span>${esc(lab)}</span></div>`);
  });
  h += `<div class="card log-card" data-pt="log"><h3>${esc(t('side.log'))}<span class="h3s">#${T.hand}</span></h3><div class="pk-log" id="pkLog">${lines.join('')}</div></div>`;
  // session
  const S = T.session, bb100 = S.hands >= 10 ? ((S.net / T.bb) / S.hands * 100).toFixed(1) : '—';
  if (T.tour) {
    const alive = T.seats.filter(q => q.stack > 0), me = T.seats[HERO].stack, rank = alive.filter(q => q.stack > me).length + 1, avg = Math.round(alive.reduce((x, q) => x + q.stack, 0) / Math.max(1, alive.length));
    const nextIn = T.tour.per - T.tour.hands % T.tour.per, nl = TLV[Math.min(TLV.length - 1, T.tour.lv + 1)];
    h += `<div class="card" data-pt="sess"><h3>${esc(t('fmt.tour'))}<span class="h3s">${esc(vName(T.v))} · ${esc(t('t.level', { n: T.tour.lv + 1 }))} ${M(T.sb)}/${M(T.bb)}</span></h3><div class="srow"><div><small>${esc(t('t.left'))}</small><b>${alive.length}/6</b></div><div><small>${esc(t('t.rank'))}</small><b>${T.seats[HERO].out ? '—' : rank}</b></div><div><small>${esc(t('ss.chips'))}</small><b>${M(me)}</b></div><div><small>${esc(t('t.avg'))}</small><b>${M(avg)}</b></div></div>` +
      `<p class="diff-desc">${esc(T.tour.place ? (T.tour.place === 1 ? t('t.win') : t('t.end', { p: T.tour.place })) : t('t.next', { n: nextIn, b: M(nl[0]) + '/' + M(nl[1]) }))}</p>`;
  } else
  h += `<div class="card" data-pt="sess"><h3>${esc(t('side.session'))}<span class="h3s">${esc(vName(T.v))} · ${esc(t('lim.' + T.limit))}</span></h3><div class="srow"><div><small>${esc(t('ss.hands'))}</small><b>${S.hands}</b></div><div><small>${esc(t('ss.net'))}</small><b class="${S.net >= 0 ? 'pos' : 'neg'}">${SM(S.net)}</b></div><div><small>bb/100</small><b>${bb100}</b></div><div><small>${esc(t(T.tour ? 'ss.chips' : 'ss.stack'))}</small><b>${M(T.seats[HERO].stack)}</b></div></div>`;
  h += `<div class="deal-row"><button class="sbtn" id="sHist">${esc(t('btn.history'))}</button><button class="sbtn" id="sStats">${esc(t('btn.stats'))}</button><button class="sbtn" id="sTools">${esc(t('btn.tools'))}</button></div></div>`;
  patch($('#side'), h);
  const lg = $('#pkLog'); if (lg) lg.scrollTop = lg.scrollHeight;
  $('#sHist').onclick = () => window.PokerReview && PokerReview.openList();
  const tm = $('#tipsMore'); if (tm) tm.onclick = () => { set.tipsOpen = set.tipsOpen ? 0 : 1; save(); renderSide(); };
  $('#sStats').onclick = openStats;
  $('#sTools').onclick = () => window.PokerTools && PokerTools.open();
  mTabs();
}
/* phones: the side cards become tabs (bar at the bottom of the screen) */
function mTabs() {
  const side = $('#side'), have = new Set($$('#side [data-pt]').map(e => e.dataset.pt));
  let cur = set.mTab && have.has(set.mTab) ? set.mTab : have.has('coach') ? 'coach' : have.has('eq') ? 'eq' : 'log';
  side.dataset.pt = cur;
  $$('#mTabs [data-pt]').forEach(b => { b.hidden = !have.has(b.dataset.pt); b.classList.toggle('sel', b.dataset.pt === cur); });
  // a shorter box after a switch: don't leave the view scrolled past the end (iOS keeps the old position → empty space)
  const sc = $('.stage'), max = sc.scrollHeight - sc.clientHeight; if (sc.scrollTop > max + 1) sc.scrollTop = Math.max(0, max);
}
$('#mTabRec').onclick = () => window.GameRecord && GameRecord.open();   // 戦績: opens the record dialog (not a panel)
$$('#mTabs [data-pt]').forEach(b => b.onclick = () => {
  const sc = $('.stage'), pt = b.dataset.pt, same = $('#side').dataset.pt === pt;
  // the same tab again while away from the table: back to the table (tap → box, tap → table, tap → box …)
  // back at the table = the table in the middle of the screen
  const tableTop = () => { const t = $('.board-wrap') || $('#pkTable'); if (!t) return 0; const r = t.getBoundingClientRect(), y = sc.scrollTop + r.top - sc.getBoundingClientRect().top + r.height / 2 - sc.clientHeight / 2; return Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, Math.round(y))); };
  if (same && Math.abs(sc.scrollTop - tableTop()) > 8) { const keep = sc.scrollTop; sc.style.paddingBottom = ''; sc.scrollTop = keep; sc.scrollTo({ top: tableTop(), behavior: 'smooth' }); return; }
  if (!same) { set.mTab = pt; save(); mTabs(); }   // mTabs() keeps the view inside the (maybe shorter) content in the same frame — no jump
  // 勝率: to the very bottom; the other boxes: their top just under the top of the scrolling area
  // (a short box gets room below it, so it can still come all the way up; the room goes once back at the table)
  sc.style.paddingBottom = '';
  const h = sc.clientHeight, box = $(`#side [data-pt="${pt}"]`) || $('#side');
  let max = sc.scrollHeight - h, top = max;
  if (pt !== 'eq') {
    top = sc.scrollTop + box.getBoundingClientRect().top - sc.getBoundingClientRect().top - 8;
    if (top > max) { sc.style.paddingBottom = `calc(${getComputedStyle(sc).paddingBottom} + ${Math.ceil(top - max)}px)`; max = top; }
  }
  sc.scrollTo({ top: Math.max(0, Math.min(max, top)), behavior: 'smooth' });
});
$('.stage').addEventListener('scroll', e => { const sc = e.currentTarget; if (sc.scrollTop < 1 && sc.style.paddingBottom) sc.style.paddingBottom = ''; }, { passive: true });
/* phones: make the header labels fit (no "…") */
function fitLabels() {
  $$('.controls .btn span').forEach(sp => { sp.style.fontSize = ''; if (!sp.offsetParent) return; let f = parseFloat(getComputedStyle(sp).fontSize); while (sp.scrollWidth > sp.clientWidth + .5 && f > 8) { f -= .5; sp.style.fontSize = f + 'px'; } });
}
addEventListener('resize', () => requestAnimationFrame(fitLabels));
/* phones: the scrolling middle's height → the table size (--sh) */
{ const sc = $('.stage'), upd = () => { const h = sc.clientHeight; if (h) document.documentElement.style.setProperty('--sh', h + 'px'); };
  if (window.ResizeObserver) new ResizeObserver(upd).observe(sc); upd(); }
/* the table follows its box (phones: it shrinks while the info panel is open) */
if (window.ResizeObserver) { let lw = 0, lh = 0, q = 0; new ResizeObserver(() => { const b = $('#pkTable'); if (!b || (b.clientWidth === lw && b.clientHeight === lh)) return; lw = b.clientWidth; lh = b.clientHeight; if (!q) q = requestAnimationFrame(() => { q = 0; if (T) render(); }); }).observe($('#pkTable')); }
function boardStr(st) {
  const V = P.VARIANTS[T.v]; let n = 0; for (let k = 0; k < st; k++) n += V.board[k]; const cs = T.board.slice(n - V.board[st - 1], n);
  return cs.map(c => `${P.vch(P.V(c))}${'♠♥♦♣'[P.SUIT(c)]}`).join(' ');
}
let HB = null;
function renderNums() {
  if (!T) return;
  const V = P.VARIANTS[T.v];
  const stakes = (T.tour ? t('t.level', { n: T.tour.lv + 1 }) + ' · ' : '') + `${M(T.sb)}/${M(T.bb)}` + (T.ante ? ` (${t('ante')} ${M(T.ante)})` : '');
  const game = `<span class="sg"><b>${esc(vName(T.v))}</b><em>${esc(t('lim.' + T.limit))} · ${stakes}</em></span>`;
  const stat = (lab, val) => `<span class="ss"><small>${esc(lab)}</small><b>${val}</b></span>`;
  const stats = stat(t('pot'), M(P.potTotal(T))) + (T.tour ? stat(t('t.left'), T.seats.filter(q => q.stack > 0).length + '/6') : stat(t('ss.hand'), '#' + T.hand));
  $('#infobar').innerHTML = game + stats;
  // phones: the game name in the header, the session numbers on the felt
  const mg = `<b>${esc(vName(T.v))}</b><em>${esc(t('lim.' + T.limit))} · ${stakes}</em>`; if ($('#mGame').innerHTML !== mg) $('#mGame').innerHTML = mg;
  const S = T.session, hs = (lab, val, cls) => `<span><small>${esc(lab)}</small><b${cls ? ` class="${cls}"` : ''}>${val}</b></span>`;
  const bb100 = S.hands >= 10 ? ((S.net / T.bb) / S.hands * 100).toFixed(1) : '—';
  const hv = P.VARIANTS[T.v], mhPos = hv.stud || hv.draw || hv.hole >= 4 ? (hv.board ? 'mid' : 'center') : 'corner'; if ($('#mHud').dataset.pos !== mhPos) $('#mHud').dataset.pos = mhPos;
  patch($('#mHud'), T.tour ? `<div class="mh l">${hs(t('t.levelS'), T.tour.lv + 1) + hs(t('t.left'), T.seats.filter(q => q.stack > 0).length + '/6')}</div><div class="mh r">${hs(t('ss.chips'), M(T.seats[HERO].stack)) + hs('BB', Math.floor(T.seats[HERO].stack / T.bb))}</div>` : `<div class="mh l">${hs(t('ss.hands'), S.hands) + hs(t('ss.net'), SM(S.net), S.net > 0 ? 'pos' : S.net < 0 ? 'neg' : '')}</div><div class="mh r">${hs(t(T.tour ? 'ss.chips' : 'ss.stack'), M(T.seats[HERO].stack)) + hs('bb/100', bb100)}</div>`);
  if (HB && HB.on) HB.setInfo(game + `<span class="sdiv"></span>` + stats);
  void V;
}

/* ---------------- result / verdict ---------------- */
function showVerdict(grade, c, a) { G.verdict = { grade, rec: c.rec, a, hand: T.hand }; if (set.coach) { if (grade === 3) sfx('ng'); } }
function showResult() {
  const R = T.result, el = $('#pkResult');
  const lines = R.pots.map((p, k) => {
    const ws = p.winners.map(i => T.seats[i].name).join('・');
    const how = R.showdown ? handName(P.handInfo(T, p.winners[0])) : t('res.uncontested');
    return `<div class="rl-p">${R.pots.length > 1 ? `<small>${esc(k ? t('res.side', { n: k }) : t('res.main'))}</small>` : ''}<b>${esc(ws)}</b><span>${M(p.amt)} · ${esc(how)}</span></div>`;
  }).join('');
  el.innerHTML = lines; el.classList.add('show');
}
function hideResult() { const el = $('#pkResult'); if (el) el.classList.remove('show'); }

/* ---------------- statistics dialog ---------------- */
let statsV = null;
function openStats() { statsV = statsV || (T ? T.v : set.v); renderStats(); openOv('#statsOverlay'); }
function renderStats() {
  $('#statsTabs').innerHTML = P.ORDER.map(v => `<button type="button" data-v="${v}" class="${v === statsV ? 'sel' : ''}">${esc(vName(v))}</button>`).join('');
  $$('#statsTabs [data-v]').forEach(b => b.onclick = () => { statsV = b.dataset.v; renderStats(); });
  const S = D.stats[statsV] || {};
  const badges = window.PokerBadges ? PokerBadges.collection() : '';
  const TS = (D.tstats || {})[statsV], tour = TS && TS.n ? `<div class="st-tour"><span class="lab">${esc(t('fmt.tour'))}</span><div class="st-grid">${[[t('st.tn'), TS.n], [t('st.twin'), TS.win], [t('st.titm'), TS.itm], [t('st.tbest'), TS.best + ''], [t('st.tavg'), (TS.sum / TS.n).toFixed(1)]].map(([k, v]) => `<div><small>${esc(k)}</small><b>${v}</b></div>`).join('')}</div></div>` : '';
  if (!S.hands) { $('#statsBody').innerHTML = `<p class="muted center">${esc(t('st.none'))}</p>` + tour + badges; return; }
  const r = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
  const cells = [['st.hands', S.hands], ['st.net', SD(S.net || 0)], ['bb/100', ((S.bbNet || 0) / S.hands * 100).toFixed(1)], ['st.won', r(S.won || 0, S.hands)],
    ['VPIP', r(S.vpip || 0, S.hands)], ['PFR', r(S.pfr || 0, S.hands)], ['AF', S.calls ? ((S.aggr || 0) / S.calls).toFixed(2) : '—'], ['WTSD', r(S.wtsd || 0, S.hands)], ['W$SD', r(S.wsd || 0, S.wtsd || 0)],
    ['st.big', '$' + num(S.bigPot || 0)], ['st.coach', r(S.good || 0, S.dec || 0)]];
  const g = S.graph || [], mn = Math.min(0, ...g), mx = Math.max(0, ...g), w = 600, hh = 120;
  const path = g.length > 1 ? g.map((v, i) => `${i ? 'L' : 'M'}${(i / (g.length - 1) * w).toFixed(1)} ${(hh - (v - mn) / ((mx - mn) || 1) * hh).toFixed(1)}`).join(' ') : '';
  const zero = hh - (0 - mn) / ((mx - mn) || 1) * hh;
  $('#statsBody').innerHTML = `<div class="st-grid">${cells.map(([k, v]) => `<div><small>${esc(k.startsWith('st.') ? t(k) : k)}</small><b>${v}</b></div>`).join('')}</div>` +
    `<div class="st-graph"><small>${esc(t('st.graph'))}</small><svg viewBox="0 0 ${w} ${hh}" preserveAspectRatio="none"><line x1="0" x2="${w}" y1="${zero}" y2="${zero}" class="z"/><path d="${path}"/></svg></div>` +
    `<p class="diff-desc">${esc(t('st.help'))}</p>` + tour + badges;
}
$('#btnStatsClose').onclick = () => closeOv('#statsOverlay');
$('#btnStatsReset').onclick = () => confirmBox(t('st.resetQ'), () => { delete D.stats[statsV]; save(); renderStats(); });

/* ---------------- dialogs ---------------- */
function openOv(sel) { $$('.overlay.show').forEach(o => { if (o.id !== 'busyOverlay') o.classList.remove('show'); }); $(sel).classList.add('show'); }
function closeOv(sel) { $(sel).classList.remove('show'); }
$$('.overlay').forEach(o => o.addEventListener('pointerdown', e => { if (e.target === o && !['busyOverlay', 'rulesOverlay'].includes(o.id)) { if (o.id === 'confirmOverlay') cfDone(false); o.classList.remove('show'); } }));
let cfCb = null;
function confirmBox(msg, yes) { $('#cfMsg').textContent = msg; cfCb = yes; openOv('#confirmOverlay'); setTimeout(() => $('#cfNo').focus(), 30); }
function cfDone(ok) { closeOv('#confirmOverlay'); const f = cfCb; cfCb = null; if (ok && f) f(); }
$('#cfNo').onclick = () => cfDone(false); $('#cfYes').onclick = () => cfDone(true);
let toastT = 0;
function toast(m) { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2400); }

/* new game */
let NG = null, ngTab = 'game';
function openNew() { const v = T ? T.v : set.v; NG = { v, p: JSON.parse(JSON.stringify(prefOf(v))), fmt: T && T.tour ? 'tour' : (set.fmt === 'tour' ? 'tour' : 'cash') }; ngTab = 'game'; renderNew(); openOv('#newOverlay'); }
function seg(items, cur, attr) { return `<div class="seg">${items.map(([val, lab]) => `<button type="button" data-${attr}="${esc(val)}" class="${String(val) === String(cur) ? 'sel' : ''}">${esc(lab)}</button>`).join('')}</div>`; }
const GART = {   // a few cards for each game (new-game dialog)
  holdem: [[0, 0, 0, -6], [12, .62, .08, 6], ['b', 1.55, .75, 0], [26, 1.85, .75, 0], [39, 2.15, .75, 0]],
  plo: [[0, 0, 0, -10], [13, .38, .02, -3], [25, .76, .04, 4], [38, 1.14, .08, 10], ['b', 1.9, .8, 0]],
  shortdeck: [[5, 0, .1, -6], [6, .45, .05, 0], [7, .9, .1, 6], [8, 1.35, .2, 10], [0, 1.85, .35, 14]],
  stud: [['b', 0, .2, 0], ['b', .38, .2, 0], [12, .9, .2, 0], [25, 1.28, .2, 0], [38, 1.66, .2, 0]],
  draw: [[1, 0, .1, -12], [14, .42, 0, -6], [27, .84, -.03, 0], [40, 1.26, 0, 6], [9, 1.68, .1, 12]],
  triple: [[6, 0, .1, -12], [17, .42, 0, -6], [29, .84, -.03, 0], [41, 1.26, 0, 6], [14, 1.68, .1, 12]],   // 7-5-4-3-2: the best 2-7 low
};
// the name of a made hand (2-7 lowball: "8-6-5-4-2 low")
function handName(info) { return info.low && info.cat === 'low' ? info.name + ' ' + t('hand.low') : t('hand.' + info.cat); }
function gArt(v) { return `<span class="garts">` + GART[v].map(([c, x, y, r]) => `<span class="cd${c === 'b' ? ' dn' : ''}" style="left:calc(var(--cw)*${x});top:calc(var(--cw)*${y});transform:rotate(${r}deg)"><span class="in">${Cards.face(c === 'b' ? 0 : c)}</span></span>`).join('') + `</span>`; }
const pipsD = d => '♦'.repeat(d) + '<s>' + '♦'.repeat(4 - d) + '</s>';
function renderNew() {
  const v = NG.v, V = P.VARIANTS[v], p = NG.p;
  $('#ngTabs').innerHTML = ['game', 'rules', 'design'].map(k => `<button type="button" class="${k === ngTab ? 'sel' : ''}" data-tab="${k}">${esc(t('tab.' + k))}${k === 'rules' ? `<small>${esc(vName(v))}</small>` : ''}</button>`).join('');
  let h;
  if (ngTab === 'game') h = `<div class="pk-ngw"><div class="ng-games pk5">` + P.ORDER.map(id => `<button type="button" class="gcard${id === v ? ' sel' : ''}" data-g="${id}"><span class="gart">${gArt(id)}</span><b>${esc(vName(id))}</b><p>${esc(t('vg.' + id))}</p><span class="gpick">${id === v ? '✓' : ''}</span></button>`).join('') + `</div>` +
    `<div class="pk-fmt"><span class="lab">${esc(t('fmt.h'))}</span><div class="pk-fmts">${['cash', 'tour'].map(f => `<button type="button" class="pk-fm${NG.fmt === f ? ' sel' : ''}" data-fmt="${f}"><b>${esc(t('fmt.' + f))}</b><small>${esc(t('fmt.' + f + '.d'))}</small></button>`).join('')}</div></div></div>`;
  else if (ngTab === 'rules') {
    const row = (lab, help, html) => `<div class="rl"><div class="rl-t"><b>${esc(lab)}</b><small>${esc(help)}</small></div>${html}</div>`;
    h = `<div class="rl-list">` +
      row(t('o.limit'), t('o.limit.h'), seg(V.limits.map(l => [l, t('lim.' + l)]), p.limit, 'lim')) +
      row(t('o.level'), t('o.level.h'), `<div class="seg lv">${LEVELS.map(l => `<button type="button" data-lv="${l}" class="${p.level === l ? 'sel' : ''}"><span class="dsel-pips">${pipsD(l)}</span>${esc(t('lv.' + l))}</button>`).join('')}</div>`) +
      row(t('o.mix'), t('o.mix.h'), seg(['mixed', 'tight', 'loose', 'aggr'].map(m => [m, t('mix.' + m)]), p.mix, 'mix')) +
      (NG.fmt === 'tour' ? row(t('o.speed'), t('o.speed.h'), seg(['normal', 'turbo'].map(x => [x, t('speed.' + x)]), p.speed, 'spd'))
        : row(t('o.stack'), t('o.stack.h'), seg(STACKS.map(s => [s, t('stack.bb', { n: s })]), p.stack, 'stk'))) +
      `</div><p class="diff-desc">${esc(NG.fmt === 'tour' ? t('o.tourNote') : t('o.stakes', { sb: '$1', bb: '$2' }))}${V.ante ? ' ' + esc(t('o.anteNote')) : ''}</p>`;
  } else h = designHtml();
  const body = $('#ngBody'); body.innerHTML = h; body.dataset.tab = ngTab;
  $$('#ngTabs [data-tab]').forEach(b => b.onclick = () => { ngTab = b.dataset.tab; renderNew(); });
  $$('#ngBody [data-g]').forEach(b => { b.onclick = () => { if (NG.v !== b.dataset.g) { NG.v = b.dataset.g; NG.p = JSON.parse(JSON.stringify(prefOf(NG.v))); } renderNew(); }; b.ondblclick = () => $('#btnStart').click(); });
  $$('#ngBody [data-lim]').forEach(b => b.onclick = () => { NG.p.limit = b.dataset.lim; renderNew(); });
  $$('#ngBody [data-lv]').forEach(b => b.onclick = () => { NG.p.level = +b.dataset.lv; renderNew(); });
  $$('#ngBody [data-mix]').forEach(b => b.onclick = () => { NG.p.mix = b.dataset.mix; renderNew(); });
  $$('#ngBody [data-stk]').forEach(b => b.onclick = () => { NG.p.stack = +b.dataset.stk; renderNew(); });
  $$('#ngBody [data-spd]').forEach(b => b.onclick = () => { NG.p.speed = b.dataset.spd; renderNew(); });
  $$('#ngBody [data-fmt]').forEach(b => b.onclick = () => { NG.fmt = b.dataset.fmt; renderNew(); });
  if (ngTab === 'design') wireDesign(body);
}
$('#btnNewClose').onclick = () => closeOv('#newOverlay');
// the ルール button on each game card (shared/ngtabs.js): that game's rules tutorial
$('#ngBody').ngtRules = id => window.PokerRules && PokerRules.open(id);
$('#btnStart').onclick = () => { set.prefs[NG.v] = NG.p; set.fmt = NG.fmt; save(); closeOv('#newOverlay'); if (NG.fmt === 'tour') startTournament(NG.v); else startSession(NG.v); };

/* design (shared with the solitaire: card backs, card designs, tables) */
function designHtml() {
  const felt = FELTS.map(f => `<button type="button" class="tile${set.felt === f ? ' sel' : ''}" data-felt="${f}"><span class="pv felt-pv" style="${feltStyle(f)}"></span><small>${esc(t('felt.' + f))}</small></button>`).join('');
  const back = BACKS.map(b => `<button type="button" class="tile${set.back === b ? ' sel' : ''}" data-back="${b}"><span class="pv"><span class="mini-card bk-pv" data-b="${b}"><span class="bk"></span></span></span><small>${esc(t('back.' + b))}</small></button>`).join('');
  const court = COURTS.map(k => `<button type="button" class="tile${set.court === k ? ' sel' : ''}" data-court="${k}"><span class="pv">${['K', 'Q', 'J'].map((r, i) => `<img class="ct-pv${Cards.FULL_DECKS.includes(k) ? ' full' : ''}" src="${Cards.IMG}${Cards.COURT_DIR[k]}${Cards.FULL_DECKS.includes(k) ? ['A', '7', 'K'][i] : r}${'hsd'[i]}.webp" alt="">`).join('')}</span><small>${esc(t('court.' + k))}</small></button>`).join('');
  return `<div class="dz"><div class="dz-l"><div class="sec"><span class="lab">${esc(t('new.back'))}</span><div class="tiles backs">${back}</div></div></div><div class="dz-r"><div class="sec"><span class="lab">${esc(t('new.court'))}</span><div class="tiles faces">${court}</div><div class="cmode" title="${esc(t('cmode.h'))}">${seg([['simple', t('cmode.simple')], ['real', t('cmode.real')]], set.cmode, 'cmode')}</div></div></div></div><div class="sec dz-felt"><span class="lab">${esc(t('new.felt'))}</span><div class="tiles felts">${felt}</div></div>`;
}
function feltStyle(f) {
  const c = { green: ['#22704a', '#0e3a25'], blue: ['#235c97', '#0f2a4d'], wine: ['#7a2434', '#3b0e18'], charcoal: ['#3a3f45', '#16191c'], teal: ['#1d7474', '#0b3535'], purple: ['#56357f', '#24123d'], mocha: ['#6e4a2f', '#2e1b0f'], linen: ['#efe6d2', '#d6c7a6'] }[f];
  return `background:radial-gradient(120% 90% at 50% 20%,${c[0]},${c[1]})`;
}
function wireDesign(root) {
  const re = () => { root.innerHTML = designHtml(); wireDesign(root); render(); };
  root.querySelectorAll('[data-felt]').forEach(b => b.onclick = () => { set.felt = b.dataset.felt; document.documentElement.dataset.felt = set.felt; save(); re(); });
  root.querySelectorAll('[data-court]').forEach(b => b.onclick = () => { set.court = b.dataset.court; document.documentElement.dataset.court = set.court; save(); re(); });
  root.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { set.back = b.dataset.back; document.documentElement.dataset.back = set.back; save(); re(); });
  root.querySelectorAll('[data-cmode]').forEach(b => b.onclick = () => { set.cmode = b.dataset.cmode; document.documentElement.dataset.cmode = set.cmode; save(); re(); });
  root.querySelectorAll('.bk-pv').forEach(e => { e.querySelector('.bk').style.cssText = backCss(e.dataset.b); });
}
function backCss(b) {
  for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } for (const r of rules) if (r.selectorText === `html[data-back="${b}"] .bk` || r.selectorText === `html[data-back=${b}] .bk`) return r.style.cssText.replace(/var\(--cw\)/g, '26px') + ';transform:none;position:absolute;inset:0;border-radius:3px'; }
  return '';
}

/* settings */
let setTab = 'play';
function openSettings() {
  const sw = (k, lab, help) => `<div class="rl"><div class="rl-t"><b>${esc(lab)}</b>${help ? `<small>${esc(help)}</small>` : ''}</div><label class="tgl"><input type="checkbox" data-k="${k}"${set[k] ? ' checked' : ''}><i></i></label></div>`;
  $('#setTabs').innerHTML = ['play', 'design'].map(k => `<button type="button" class="${k === setTab ? 'sel' : ''}" data-st="${k}">${esc(t('tab.' + k))}</button>`).join('');
  let h;
  if (setTab === 'play') h = `<div class="set-cols"><div class="rl-list">` + sw('hud', t('set.hud'), t('set.hud.h')) + sw('coach', t('set.coach'), t('set.coach.h')) + sw('autoNext', t('set.autoNext')) + `</div><div class="rl-list">` + sw('anim', t('set.anim')) + sw('sound', t('set.sound')) +
    `<div class="rl"><div class="rl-t"><b>${esc(t('set.speed'))}</b></div>${seg([['slow', t('sp.slow')], ['normal', t('sp.normal')], ['fast', t('sp.fast')]], set.speed, 'sp')}</div></div></div>` + CREDIT_HTML();
  else h = designHtml();
  $('#setBody').innerHTML = h;
  $$('#setTabs [data-st]').forEach(b => b.onclick = () => { setTab = b.dataset.st; openSettings(); });
  $$('#setBody [data-k]').forEach(c => c.onchange = () => { set[c.dataset.k] = c.checked ? 1 : 0; if (c.dataset.k === 'sound') { set.sound = c.checked; try { localStorage.setItem('atlas-sfx', c.checked ? '1' : '0'); } catch (e) {} } save(); render(); if (set.coach || set.hud) requestCoach(); });
  $$('#setBody [data-sp]').forEach(b => b.onclick = () => { set.speed = b.dataset.sp; save(); openSettings(); });
  if (setTab === 'design') wireDesign($('#setBody'));
  openOv('#setOverlay');
}
const CREDIT_HTML = () => `<p class="credit">${esc(t('credit'))}<br>Badges: Designed by Freepik — “Poker glossy labels set”</p>`;
$('#btnSetClose').onclick = () => closeOv('#setOverlay');

/* ---------------- buttons & keys ---------------- */
$('#btnNew').onclick = openNew;
$('#btnSettings').onclick = openSettings;
$('#btnSound').onclick = () => { set.sound = !set.sound; try { localStorage.setItem('atlas-sfx', set.sound ? '1' : '0'); } catch (e) {} save(); $('#btnSound').classList.toggle('on', !!set.sound); };
$('#btnHint').onclick = () => {
  if (!T || T.toAct !== HERO || T.phase !== 'bet') { toast(t('hint.none')); return; }
  const c = G.coach && G.coachKey === spotKey() ? G.coach : null;
  if (!c) { toast(t('hud.calc')); requestCoach(); return; }
  toast(t('rec.' + c.rec) + ' — ' + t('why.' + c.why[0], { eq: pct(c.eq), need: pct(c.need), fair: pct(c.fair) }));
  const b = $(`#actbar [data-a="${c.rec === 'check' ? 'check' : c.rec}"]`); if (b) { b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 1600); }
};
$('#btnResign').onclick = () => {
  if (!T) return;
  if (T.tour) {
    if (T.tour.place) { startTournament(T.v); return; }
    const alive = T.seats.filter(s => s.stack > 0 && !s.out).length;
    if (window.Resign) Resign.confirm({ lang: LANG, question: t('t.quitQ'), note: t('t.quitNote', { p: alive }) }).then(ok => { if (ok) quitTour(); }); else confirmBox(t('t.quitQ'), quitTour);
    return;
  }
  const go = () => { clearTimeout(G.timer); const S = T.session; toast(t('cashout', { n: SM(S.net), h: S.hands })); startSession(T.v); };
  if (window.Resign) Resign.confirm({ lang: LANG }).then(ok => { if (ok) go(); }); else confirmBox(t('cashoutQ'), go);
};
$('#btnStats').onclick = openStats;
$('#btnTools').onclick = () => window.PokerTools && PokerTools.open();
$('#btnLesson').onclick = () => window.PokerLessons && PokerLessons.open();
$('#langSel').onchange = () => { LANG = $('#langSel').value; try { localStorage.setItem('aicoding-lang', LANG); } catch (e) {} applyI18n(); if (T) T.seats[HERO].name = t('you'); render(); if (window.SolRules && SolRules.relang) SolRules.relang(); if (window.GameRecord) GameRecord.relabel(); };
document.addEventListener('keydown', e => {
  if (e.target.closest('input:not([type=range]), select, textarea') || $('.overlay.show')) return;
  const k = e.key.toLowerCase();
  if (T && T.phase === 'bet' && T.toAct === HERO) {
    const L = P.legal(T);
    if (k === 'f' && L.fold) heroAct({ a: 'fold' });
    else if (k === 'c') heroAct({ a: L.check ? 'check' : 'call' });
    else if (k === 'r' && L.canRaise) heroAct({ a: 'raise', to: $('#abRange') ? +$('#abRange').value : L.minTo });
    else if (k === 'h') $('#btnHint').click();
    else if (/^[1-5]$/.test(k)) { const b = $$('#actbar .ab-size .szb')[+k - 1]; if (b) b.click(); }
    else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && $('#abRange')) { e.preventDefault(); const rg = $('#abRange'); rg.value = Math.max(+rg.min, Math.min(+rg.max, +rg.value + (e.key === 'ArrowUp' ? T.bb : -T.bb))); rg.oninput(); }
  } else if (T && T.phase === 'done' && !T.tut && (k === ' ' || k === 'enter' || k === 'n')) { e.preventDefault(); nextHand(); }
  else if (k === 'n' && !T) openNew();
});
window.addEventListener('resize', () => { if (T) render(); });

/* ---------------- start ---------------- */
applyI18n();
if (window.GameRecord) GameRecord.init({ game: 'poker', lang: () => LANG, menu: '.controls', variant: () => { const v = T ? T.v : set.v; return { k: v, n: vName(v) }; }, variants: () => P.ORDER, variantName: k => vName(k), defVariant: 'holdem' });   // 戦績 by game (Hold'em, Omaha, …)   // 勝敗記録: menu button before the header bar takes the menu
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnResign', '#btnHint', '#btnRules', '#btnLesson', '#btnTools', '#btnStats'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => setTimeout(() => { if (T) render(); }, 0));
if (window.RulesOffer) RulesOffer.init({ game: 'poker', lang: () => LANG, open: () => window.PokerRules && PokerRules.open(NG ? NG.v : T && T.v), watch: '#rulesOverlay' });
$('#btnSound').classList.toggle('on', !!set.sound);
// resume the saved table (the hand in progress continues); otherwise start a hold'em table right away
if (D.cur && D.cur.seats && P.VARIANTS[D.cur.v] && !D.cur.tut) {
  T = D.cur; T.seats[HERO].name = t('you'); if (T.phase === 'done') G.recorded = T.hand + ':' + T.v;
  G.hist = { v: T.v, t: Date.now(), names: T.seats.map(s => s.name), styles: T.seats.map(s => s.bot ? s.bot.style : null), btn: T.btn, start: (T.startStacks || []).slice(), sb: T.sb, bb: T.bb, ante: T.ante, limit: T.limit, notes: [] };
  render(); if (T.phase === 'done' || T.phase === 'idle' || T.phase === 'over') { render(); } else loop();
} else startSession(set.v);

window.PokerApp = { M, SM, MH, num, showTab(pt) { set.mTab = pt; mTabs(); }, get T() { return T; }, get LANG() { return LANG; }, t, vName, sfx, esc, openOv, closeOv, toast, confirmBox, set, D, save, prefOf, startSession, startTutorial, endTutorial, render, chipStackDemo: (a, m) => chipStack(a, m), ask, gArt, HERO, statOf };
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-csw]'); if (!b || !T) return; e.preventDefault(); const sy = window.scrollY, sc = document.querySelector('.stage'), st = sc ? sc.scrollTop : 0; set.coach = set.coach ? 0 : 1; save(); render(); if (set.coach || set.hud) requestCoach(); toast(t('side.coach') + ' ' + (set.coach ? 'ON' : 'OFF')); if (sc) sc.scrollTop = st; window.scrollTo(0, sy); });
})();
