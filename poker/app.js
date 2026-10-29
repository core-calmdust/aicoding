/* ポーカー — game controller (poker/app.js)
   Six-handed cash game against five CPU players. Everything about a poker game comes from PK.VARIANTS (engine.js);
   equity / coach from PKE (equity.js, mostly in the worker). Research tools: research.js · lessons and rules: lessons.js / rules.js. */
(function () {
'use strict';
const P = window.PK, E = window.PKE, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-poker', SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const FELTS = ['green', 'teal', 'blue', 'wine', 'charcoal', 'purple', 'mocha', 'linen'];
const BACKS = ['skullBlack', 'skull', 'gangsta', 'ornate', 'ornateBlack', 'floral', 'floralBlack', 'azure', 'azureBlack', 'hex', 'cube', 'red', 'blue', 'crimson', 'navy'];
const COURTS = ['gangsta', 'classic', 'antique', 'flat'];
const LEVELS = [1, 2, 3, 4], STACKS = [50, 100, 200];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NAMES = ['Alex', 'Bella', 'Carlos', 'Dana', 'Eli', 'Fiona', 'Gus', 'Hana', 'Ivan', 'Jade', 'Kai', 'Lena', 'Milo', 'Nina', 'Omar', 'Pia', 'Quinn', 'Rosa', 'Sam', 'Tara', 'Umar', 'Vera', 'Wes', 'Yuki', 'Zoe'];
const STYLE_KEYS = ['tag', 'lag', 'rock', 'station'];

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
  return p;
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
function startSession(v) {
  if (window.PokerTut) PokerTut.hide();
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
function nextHand() {
  if (!T) return;
  clearTimeout(G.timer);
  if (T.phase === 'done' && T.result && G.recorded !== T.hand + ':' + T.v && G.hist) { const an = set.autoNext; set.autoNext = 0; handOver(); set.autoNext = an; clearTimeout(G.timer); }   // pressed "next" before the hand was recorded
  hideResult();
  const p = prefOf(T.v);
  // busted CPU players leave and new ones sit down; the player rebuys automatically
  const used = T.seats.map(s => s.name);
  T.seats.forEach((s, i) => {
    if (i === HERO) { if (s.stack < T.bb) { s.stack = p.stack * 2; T.session.rebuys++; toast(t('toast.rebuy', { n: p.stack * 2 })); } return; }
    if (s.stack < T.bb) { const b = newBot(p, i, used); used.push(b.name); Object.assign(s, { name: b.name, stack: b.stack, bot: b.bot }); s.fresh = true; } else s.fresh = false;
  });
  T.seats[HERO].name = t('you');
  P.startHand(T, P.mulberry(randSeed()));
  if (T.tut && window.PokerTut) PokerTut.setup(T);
  G.coach = null; G.coachKey = ''; G.sel = []; G.decisions = []; G.dealtAt = Date.now();
  G.hist = { v: T.v, t: Date.now(), names: T.seats.map(s => s.name), styles: T.seats.map(s => s.bot ? s.bot.style : null), btn: T.btn, start: T.startStacks.slice(), sb: T.sb, bb: T.bb, ante: T.ante, limit: T.limit, cards: null, notes: [] };
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
  if (e.a === 'call') return t('act.call') + ' ' + e.amt + (e.allin ? ' · ' + t('act.allin') : '');
  if (e.a === 'bet') return t('act.bet') + ' ' + e.to + (e.allin ? ' · ' + t('act.allin') : '');
  if (e.a === 'raise') return t('act.raise') + ' ' + e.to + (e.allin ? ' · ' + t('act.allin') : '');
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
  S.net = (S.net || 0) + net; S.bbNet = (S.bbNet || 0) + net / T.bb;
  const potSz = R.pots.reduce((a, p) => a + p.amt, 0); if (R.won[HERO] > 0 && potSz > (S.bigPot || 0)) S.bigPot = potSz;
  S.graph = (S.graph || []).concat([Math.round((S.net || 0))]).slice(-200);
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
  if (window.PokerBadges && !T.tut) { const TT = T; setTimeout(() => { if (T === TT) PokerBadges.checkHand(TT); }, 900); }
  if (T.tut && window.PokerTut) { PokerTut.ev('done'); return; }
  if (set.autoNext) G.timer = setTimeout(nextHand, 3400 * Math.max(.6, mt()));
}
function statOf(v) { return D.stats[v] || (D.stats[v] = {}); }

/* ---------------- rendering: table ---------------- */
// seat positions on the oval (percent of the table area); seat 0 (the player) bottom centre
const SEATPOS = [[50, 84], [9, 62], [14, 21], [50, 11], [86, 21], [91, 62]];
const BETPOS = [[50, 65], [23, 60], [27, 36], [50, 28], [73, 36], [77, 60]];
// portrait tables: side seats pulled in so the name plates stay on the felt
const SEATPOS_T = [[50, 87], [18, 64], [20, 23], [50, 11], [80, 23], [82, 64]];
const BETPOS_T = [[50, 71], [27, 57], [29, 33], [50, 25], [71, 33], [73, 57]];
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
  nb.forEach((n, i) => {
    const k = keyOf(n); let m = null;
    if (k) { m = keyed.get(k); if (m && (used.has(m) || !same(m, n))) m = null; }
    else { while (idx < old.length && (keyOf(old[idx]) || used.has(old[idx]))) idx++; if (idx < old.length && same(old[idx], n)) m = old[idx++]; }
    if (m) { used.add(m); morphNode(m, n); } else m = n;
    const at = a.childNodes[i]; if (at !== m) a.insertBefore(m, at || null);
  });
  [...a.childNodes].slice(nb.length).forEach(n => n.remove());
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
  const V = P.VARIANTS[T.v], box = $('#pkTable'), W = box.clientWidth, H = box.clientHeight;
  const narrow = W < 640, tall = H > W * (narrow ? .95 : 1.1);   // portrait boards have room for much bigger cards
  const cw = Math.max(26, Math.min(W / (V.stud ? (narrow || tall ? 10.5 : 13.5) : (narrow || tall ? 7.2 : 9.8)), H / (V.stud ? (tall ? 8 : 6.6) : (tall ? 8.2 : 5.7)), tall ? 170 : 130));
  const bw = $('#boardWrap'); bw.style.setProperty('--cw', cw + 'px'); bw.style.setProperty('--chh', cw * 1.4 + 'px');
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
  h += `<div class="pk-pot${pot ? '' : ' empty'}" data-k="pot">${pot ? chipStack(pot, 3) : '<span class="chipico"></span>'}<b>${pot}</b><small>${esc(t('pot'))}</small></div>`;
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
    h += `<div class="seat${hero ? ' me' : ''}${s.folded && T.phase !== 'idle' ? ' folded' : ''}${toAct ? ' act' : ''}${winners.has(i) ? ' win' : ''}${s.allin ? ' allin' : ''}${V.stud ? ' stud' : ''}${V.hole >= 4 && !V.stud ? ' many' : ''}" style="left:${x}%;top:${y}%" data-seat="${i}" data-k="seat${i}">` +
      `<div class="sc">${cards}</div>` +
      `<div class="plate"><span class="ava av${i}">${hero ? '★' : esc(s.name[0])}</span><span class="pn"><b>${esc(s.name)}</b><small>${hero ? esc(t('you.sub')) : esc(style)}</small></span><span class="st">${s.stack}</span></div>` +
      (bub ? `<div class="bub" data-k="bub${T.hand}-${lastBubble[i].at}">${esc(bub)}</div>` : '') + (info ? `<div class="hinfo">${esc(info)}</div>` : '') +
      (T.btn === i && !V.stud ? `<span class="dbtn">D</span>` : '') + `</div>`;
    if (s.bet > 0) { const [bx, by] = (tall || narrow ? BETPOS_T : BETPOS)[i]; h += `<div class="pk-bet" data-k="bet${i}" style="left:${bx}%;top:${by}%">${chipStack(s.bet)}<span>${s.bet}</span></div>`; }
  });
  if (o.deal || !box.firstChild) box.innerHTML = h; else patch(box, h);
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

/* ---------------- action bar ---------------- */
function renderActbar() {
  const bar = $('#actbar'); if (!T) { bar.innerHTML = ''; return; }
  const myTurn = T.toAct === HERO && T.phase === 'bet', L = myTurn ? P.legal(T) : null;
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
  h += L.check ? `<button class="abtn${recCls('check')}" data-a="check"><b>${esc(t('act.check'))}</b><kbd>C</kbd></button>` : `<button class="abtn${recCls('call')}" data-a="call"><b>${esc(t('act.call'))} ${L.call}</b><kbd>C</kbd></button>`;
  if (L.canRaise) {
    const word = T.curBet === 0 ? t('act.bet') : t('act.raise');
    if (L.minTo === L.maxTo) h += `<button class="abtn go${recCls('raise')}" data-a="raise" data-to="${L.minTo}"><b>${esc(word)} ${L.minTo}</b><kbd>R</kbd></button>`;
    else {
      const cur = Math.max(L.minTo, Math.min(L.maxTo, G.raiseTo || L.minTo));
      h += `<button class="abtn go${recCls('raise')}" data-a="raise" id="abRaise"><b>${esc(word)} <span id="abTo">${cur}</span></b><kbd>R</kbd></button>`;
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
  const rg = $('#abRange'); if (rg) { rg.oninput = () => { G.raiseTo = +rg.value; $('#abTo').textContent = rg.value; }; bar.querySelectorAll('.szb').forEach(b => b.onclick = () => { rg.value = b.dataset.to; G.raiseTo = +rg.value; $('#abTo').textContent = rg.value; }); }
}
function resultLine() {
  const R = T.result; if (!R) return '';
  const net = R.net[HERO];
  return net > 0 ? t('res.won', { n: net }) : net < 0 ? t('res.lost', { n: -net }) : t('res.even');
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
        (c.toCall ? `<div class="kv"><span>${esc(t('hud.odds'))}</span><b>${c.toCall} : ${c.pot} → ${pct(c.need)}</b></div><div class="kv"><span>${esc(t('hud.ev'))}</span><b class="${c.ev >= 0 ? 'pos' : 'neg'}">${c.ev >= 0 ? '+' : ''}${c.ev.toFixed(1)}</b></div>` : `<div class="kv"><span>${esc(t('hud.fair'))}</span><b>${pct(c.fair)}</b></div>`) +
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
    h += `<div class="card coach-card" data-pt="coach"><h3>${esc(t('side.coach'))}</h3>${body}</div>`;
  }
  // this hand (the "棋譜")
  const streets = V.streets;
  const lines = []; let cur = -1;
  T.log.forEach(e => {
    if (e.a === 'ante' || e.a === 'return') return;
    if (e.st !== cur) { cur = e.st; lines.push(`<div class="lg-st">${esc(t('st.' + streets[e.st]))}${e.st > 0 && V.board ? ' ' + boardStr(e.st) : ''}</div>`); }
    const nm = T.seats[e.s].name, lab = e.a === 'sb' ? t('act.sb') + ' ' + e.amt : e.a === 'bb' ? t('act.bb') + ' ' + e.amt : e.a === 'bring' ? t('act.bring') + ' ' + e.amt : e.a === 'draw' ? t('act.drawN', { n: e.n }) : actLabel(e);
    lines.push(`<div class="lg${e.s === HERO ? ' me' : ''}"><b>${esc(nm)}</b><span>${esc(lab)}</span></div>`);
  });
  h += `<div class="card log-card" data-pt="log"><h3>${esc(t('side.log'))}<span class="h3s">#${T.hand}</span></h3><div class="pk-log" id="pkLog">${lines.join('')}</div></div>`;
  // session
  const S = T.session, bb100 = S.hands >= 10 ? ((S.net / T.bb) / S.hands * 100).toFixed(1) : '—';
  h += `<div class="card" data-pt="sess"><h3>${esc(t('side.session'))}<span class="h3s">${esc(vName(T.v))} · ${esc(t('lim.' + T.limit))}</span></h3><div class="srow"><div><small>${esc(t('ss.hands'))}</small><b>${S.hands}</b></div><div><small>${esc(t('ss.net'))}</small><b class="${S.net >= 0 ? 'pos' : 'neg'}">${S.net >= 0 ? '+' : ''}${S.net}</b></div><div><small>bb/100</small><b>${bb100}</b></div><div><small>${esc(t('ss.stack'))}</small><b>${T.seats[HERO].stack}</b></div></div>` +
    `<div class="deal-row"><button class="sbtn" id="sHist">${esc(t('btn.history'))}</button><button class="sbtn" id="sStats">${esc(t('btn.stats'))}</button><button class="sbtn" id="sTools">${esc(t('btn.tools'))}</button></div></div>`;
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
  const open = document.body.classList.contains('mt-open');
  $$('#mTabs [data-pt]').forEach(b => { b.hidden = !have.has(b.dataset.pt); b.classList.toggle('sel', open && b.dataset.pt === cur); });
}
$$('#mTabs [data-pt]').forEach(b => b.onclick = () => {
  const open = document.body.classList.contains('mt-open'), pt = b.dataset.pt;
  if (open && $('#side').dataset.pt === pt) document.body.classList.remove('mt-open');   // tap the open tab again: close
  else { set.mTab = pt; save(); document.body.classList.add('mt-open'); }
  mTabs(); $('#side').scrollTop = 0;
});
/* phones: make the header labels fit (no "…") */
function fitLabels() {
  $$('.controls .btn span').forEach(sp => { sp.style.fontSize = ''; if (!sp.offsetParent) return; let f = parseFloat(getComputedStyle(sp).fontSize); while (sp.scrollWidth > sp.clientWidth + .5 && f > 8) { f -= .5; sp.style.fontSize = f + 'px'; } });
}
addEventListener('resize', () => requestAnimationFrame(fitLabels));
/* phones: the scrolling middle's height → the table size (--sh) */
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
  const stakes = `${T.sb}/${T.bb}` + (T.ante ? ` (${t('ante')} ${T.ante})` : '');
  const game = `<span class="sg"><b>${esc(vName(T.v))}</b><em>${esc(t('lim.' + T.limit))} · ${stakes}</em></span>`;
  const stat = (lab, val) => `<span class="ss"><small>${esc(lab)}</small><b>${val}</b></span>`;
  const stats = stat(t('pot'), P.potTotal(T)) + stat(t('ss.hand'), '#' + T.hand);
  $('#infobar').innerHTML = game + stats;
  // phones: the game name in the header, the session numbers on the felt
  const mg = `<b>${esc(vName(T.v))}</b><em>${esc(t('lim.' + T.limit))} · ${stakes}</em>`; if ($('#mGame').innerHTML !== mg) $('#mGame').innerHTML = mg;
  const S = T.session, hs = (lab, val, cls) => `<span><small>${esc(lab)}</small><b${cls ? ` class="${cls}"` : ''}>${val}</b></span>`;
  const bb100 = S.hands >= 10 ? ((S.net / T.bb) / S.hands * 100).toFixed(1) : '—';
  const hv = P.VARIANTS[T.v], mhPos = hv.stud || hv.draw || hv.hole >= 4 ? (hv.board ? 'mid' : 'center') : 'corner'; if ($('#mHud').dataset.pos !== mhPos) $('#mHud').dataset.pos = mhPos;
  patch($('#mHud'), `<div class="mh l">${hs(t('ss.hands'), S.hands) + hs(t('ss.net'), (S.net >= 0 ? '+' : '') + S.net, S.net > 0 ? 'pos' : S.net < 0 ? 'neg' : '')}</div><div class="mh r">${hs(t('ss.stack'), T.seats[HERO].stack) + hs('bb/100', bb100)}</div>`);
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
    return `<div class="rl-p">${R.pots.length > 1 ? `<small>${esc(k ? t('res.side', { n: k }) : t('res.main'))}</small>` : ''}<b>${esc(ws)}</b><span>${p.amt} · ${esc(how)}</span></div>`;
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
  if (!S.hands) { $('#statsBody').innerHTML = `<p class="muted center">${esc(t('st.none'))}</p>` + badges; return; }
  const r = (a, b) => b ? (a / b * 100).toFixed(1) + '%' : '—';
  const cells = [['st.hands', S.hands], ['st.net', (S.net >= 0 ? '+' : '') + (S.net || 0)], ['bb/100', ((S.bbNet || 0) / S.hands * 100).toFixed(1)], ['st.won', r(S.won || 0, S.hands)],
    ['VPIP', r(S.vpip || 0, S.hands)], ['PFR', r(S.pfr || 0, S.hands)], ['AF', S.calls ? ((S.aggr || 0) / S.calls).toFixed(2) : '—'], ['WTSD', r(S.wtsd || 0, S.hands)], ['W$SD', r(S.wsd || 0, S.wtsd || 0)],
    ['st.big', S.bigPot || 0], ['st.coach', r(S.good || 0, S.dec || 0)]];
  const g = S.graph || [], mn = Math.min(0, ...g), mx = Math.max(0, ...g), w = 600, hh = 120;
  const path = g.length > 1 ? g.map((v, i) => `${i ? 'L' : 'M'}${(i / (g.length - 1) * w).toFixed(1)} ${(hh - (v - mn) / ((mx - mn) || 1) * hh).toFixed(1)}`).join(' ') : '';
  const zero = hh - (0 - mn) / ((mx - mn) || 1) * hh;
  $('#statsBody').innerHTML = `<div class="st-grid">${cells.map(([k, v]) => `<div><small>${esc(k.startsWith('st.') ? t(k) : k)}</small><b>${v}</b></div>`).join('')}</div>` +
    `<div class="st-graph"><small>${esc(t('st.graph'))}</small><svg viewBox="0 0 ${w} ${hh}" preserveAspectRatio="none"><line x1="0" x2="${w}" y1="${zero}" y2="${zero}" class="z"/><path d="${path}"/></svg></div>` +
    `<p class="diff-desc">${esc(t('st.help'))}</p>` + badges;
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
function openNew() { const v = T ? T.v : set.v; NG = { v, p: JSON.parse(JSON.stringify(prefOf(v))) }; ngTab = 'game'; renderNew(); openOv('#newOverlay'); }
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
  if (ngTab === 'game') h = `<div class="ng-games pk5">` + P.ORDER.map(id => `<button type="button" class="gcard${id === v ? ' sel' : ''}" data-g="${id}"><span class="gart">${gArt(id)}</span><b>${esc(vName(id))}</b><p>${esc(t('vg.' + id))}</p><span class="gpick">${id === v ? '✓' : ''}</span></button>`).join('') + `</div>`;
  else if (ngTab === 'rules') {
    const row = (lab, help, html) => `<div class="rl"><div class="rl-t"><b>${esc(lab)}</b><small>${esc(help)}</small></div>${html}</div>`;
    h = `<div class="rl-list">` +
      row(t('o.limit'), t('o.limit.h'), seg(V.limits.map(l => [l, t('lim.' + l)]), p.limit, 'lim')) +
      row(t('o.level'), t('o.level.h'), `<div class="seg lv">${LEVELS.map(l => `<button type="button" data-lv="${l}" class="${p.level === l ? 'sel' : ''}"><span class="dsel-pips">${pipsD(l)}</span>${esc(t('lv.' + l))}</button>`).join('')}</div>`) +
      row(t('o.mix'), t('o.mix.h'), seg(['mixed', 'tight', 'loose', 'aggr'].map(m => [m, t('mix.' + m)]), p.mix, 'mix')) +
      row(t('o.stack'), t('o.stack.h'), seg(STACKS.map(s => [s, t('stack.bb', { n: s })]), p.stack, 'stk')) +
      `</div><p class="diff-desc">${esc(t('o.stakes', { sb: 1, bb: 2 }))}${V.ante ? ' ' + esc(t('o.anteNote')) : ''}</p>`;
  } else h = designHtml();
  const body = $('#ngBody'); body.innerHTML = h; body.dataset.tab = ngTab;
  $$('#ngTabs [data-tab]').forEach(b => b.onclick = () => { ngTab = b.dataset.tab; renderNew(); });
  $$('#ngBody [data-g]').forEach(b => { b.onclick = () => { if (NG.v !== b.dataset.g) { NG.v = b.dataset.g; NG.p = JSON.parse(JSON.stringify(prefOf(NG.v))); } renderNew(); }; b.ondblclick = () => $('#btnStart').click(); });
  $$('#ngBody [data-lim]').forEach(b => b.onclick = () => { NG.p.limit = b.dataset.lim; renderNew(); });
  $$('#ngBody [data-lv]').forEach(b => b.onclick = () => { NG.p.level = +b.dataset.lv; renderNew(); });
  $$('#ngBody [data-mix]').forEach(b => b.onclick = () => { NG.p.mix = b.dataset.mix; renderNew(); });
  $$('#ngBody [data-stk]').forEach(b => b.onclick = () => { NG.p.stack = +b.dataset.stk; renderNew(); });
  if (ngTab === 'design') wireDesign(body);
}
$('#btnNewClose').onclick = () => closeOv('#newOverlay');
$('#btnStart').onclick = () => { set.prefs[NG.v] = NG.p; save(); closeOv('#newOverlay'); startSession(NG.v); };

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
  const go = () => { clearTimeout(G.timer); const S = T.session; toast(t('cashout', { n: S.net >= 0 ? '+' + S.net : S.net, h: S.hands })); startSession(T.v); };
  if (window.Resign) Resign.confirm({ lang: LANG }).then(ok => { if (ok) go(); }); else confirmBox(t('cashoutQ'), go);
};
$('#btnStats').onclick = openStats;
$('#btnTools').onclick = () => window.PokerTools && PokerTools.open();
$('#btnLesson').onclick = () => window.PokerLessons && PokerLessons.open();
$('#langSel').onchange = () => { LANG = $('#langSel').value; try { localStorage.setItem('aicoding-lang', LANG); } catch (e) {} applyI18n(); if (T) T.seats[HERO].name = t('you'); render(); if (window.SolRules && SolRules.relang) SolRules.relang(); };
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

window.PokerApp = { showTab(pt) { set.mTab = pt; document.body.classList.add('mt-open'); mTabs(); }, get T() { return T; }, get LANG() { return LANG; }, t, vName, sfx, esc, openOv, closeOv, toast, confirmBox, set, D, save, prefOf, startSession, startTutorial, endTutorial, render, chipStackDemo: (a, m) => chipStack(a, m), ask, gArt, HERO, statOf };
})();
