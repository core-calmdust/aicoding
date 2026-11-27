/* ライアーダイス — game controller (liarsdice/app.js)
   You (bottom) and 1–5 computer players round a dice table. Rules: engine.js · computer players, coach numbers: ai.js ·
   the table's look (cups, dice): dice.js · rules tour rules.js · lessons lessons.js · probability calculator, review,
   statistics: tools.js · rated games rated.js.
   Same shell as the poker / guandan pages (header bar, new-game dialog with Game | Rules | Design, right column, phone tabs). */
(function () {
'use strict';
const LD = window.LD, AI = window.LDAI, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-liarsdice', SUPPORTED = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = x => Math.round(x * 100) + '%';

/* ---------------- storage ---------------- */
function load() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
const D = load();
D.set = Object.assign({ lvl: 6, players: 4, preset: 'perudo', wild: 1, palifico: 1, calza: 1, raise: 'std', cup: 'brown', dice: 'bone', felt: 'baize',
  sound: true, anim: 1, speed: 'normal', coach: 1, odds: 1, mTab: 'coach', tipsOpen: 0 }, D.set || {});
D.stats = Object.assign({ games: 0, wins: 0, placeSum: 0, placeN: 0, dudo: 0, dudoOk: 0, calza: 0, calzaOk: 0, bids: 0, caught: 0, bluffs: 0, lost: { call: 0, caught: 0, calza: 0 }, byLvl: {}, grades: { best: 0, good: 0, dubious: 0, bad: 0 } }, D.stats || {});
const set = D.set;
function applyLook() { const d = document.documentElement.dataset; d.felt = set.felt; d.cup = set.cup; d.dice = set.dice; }
applyLook();
function save() { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} }

/* ---------------- language ---------------- */
let LANG = (() => { const n = (navigator.language || 'ja').toLowerCase(); if (/^zh-(tw|hk|mo)\b|^zh-hant/.test(n)) return 'zh-TW'; return SUPPORTED.find(c => c !== 'zh-TW' && n.startsWith(c.toLowerCase())) || 'en'; })();
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) LANG = q; }
function t(k, v) {
  let x = (I18N[LANG] || I18N.en)[k]; if (x === undefined) x = I18N.en[k]; if (x === undefined) x = I18N.ja[k]; if (x === undefined) return k;
  if (v) x = String(x).replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x;
}
function applyI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  $$('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); e.setAttribute('aria-label', e.title); });
  requestAnimationFrame(() => fitLabels());
  $('#langSel').value = LANG; document.title = t('meta.title');
  $('#brandTitle').textContent = t('title'); $('#brandSub').textContent = LANG === 'en' ? '' : "Liar's Dice";
}
const BOTS = ['bot.1', 'bot.2', 'bot.3', 'bot.4', 'bot.5'];
const nameOf = p => p === 0 ? t('you') : t(BOTS[(p - 1) % 5]);
const levelLabel = n => 'Lv.' + n;
// "4 × ⚄" as text and as html (a die picture)
const faceTxt = f => ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][f];
const bidTxt = b => b ? t('bid.txt', { q: b.q, f: b.f }) : '';
const bidHtml = (b, cls) => b ? `<span class="bidv ${cls || ''}"><b>${b.q}</b><i>×</i>${Dice.img(b.f, 'bd')}</span>` : '';

/* ---------------- sound ---------------- */
let AC = null, gest = false;
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { gest = true; }, { capture: true, passive: true }));
try { const sp = localStorage.getItem('atlas-sfx'); if (sp === '0' || sp === '1') set.sound = sp === '1'; } catch (e) {}
function ac() { if (!AC && !gest) return null; if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended' && !document.hidden) AC.resume(); return AC; }
document.addEventListener('visibilitychange', () => { if (AC) { if (document.hidden) AC.suspend(); else AC.resume(); } });
function noise(a, t0, dur, f, q, g, type) { const n = Math.max(1, Math.floor(a.sampleRate * dur)), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = a.createBufferSource(), bp = a.createBiquadFilter(), gn = a.createGain(); s.buffer = b; bp.type = type || 'bandpass'; bp.frequency.value = f; bp.Q.value = q; gn.gain.value = g; s.connect(bp).connect(gn).connect(a.destination); s.start(t0); }
function tone(a, t0, f, dur, g, type) { const o = a.createOscillator(), gn = a.createGain(); o.type = type || 'sine'; o.frequency.value = f; gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(g, t0 + .01); gn.gain.exponentialRampToValueAtTime(.0008, t0 + dur); o.connect(gn).connect(a.destination); o.start(t0); o.stop(t0 + dur + .05); }
// a die knocking on wood / bone inside a leather cup: short resonant clicks, muffled
function clack(a, t0, g, muff) { const f = 1700 + Math.random() * 1600; noise(a, t0, .028, f, 7, g * (muff ? .55 : 1)); tone(a, t0, f * .5 + Math.random() * 300, .05, g * .05, 'triangle'); }
function sfx(k) {
  if (!set.sound || document.hidden) return; const a = ac(); if (!a) return; const n = a.currentTime + .005;
  if (k === 'shake') { for (let i = 0; i < 22; i++) clack(a, n + i * .038 + Math.random() * .02, .55, true); noise(a, n, .9, 400, .6, .12, 'lowpass'); }
  else if (k === 'slam') { noise(a, n, .12, 160, .8, .9, 'lowpass'); noise(a, n, .05, 900, 1, .3); for (let i = 0; i < 4; i++) clack(a, n + .02 + i * .03, .3, true); }
  else if (k === 'lift') noise(a, n, .18, 700, .5, .12, 'lowpass');
  else if (k === 'bid') { tone(a, n, 523, .12, .05, 'triangle'); tone(a, n + .07, 659, .16, .05, 'triangle'); }
  else if (k === 'dudo') { tone(a, n, 392, .25, .09, 'sawtooth'); tone(a, n + .12, 311, .4, .08, 'sawtooth'); noise(a, n, .2, 200, .7, .4, 'lowpass'); }
  else if (k === 'calza') { [660, 880, 1046].forEach((f, i) => tone(a, n + i * .08, f, .3, .06, 'triangle')); }
  else if (k === 'count') clack(a, n, .7, false);
  else if (k === 'lose') { noise(a, n, .1, 1200, 2, .25); tone(a, n + .03, 196, .45, .07, 'sine'); }
  else if (k === 'gain') [784, 988, 1318.5].forEach((f, i) => tone(a, n + i * .08, f, .5, .07, 'triangle'));
  else if (k === 'sel') tone(a, n, 1500, .05, .03, 'triangle');
  else if (k === 'turn') { tone(a, n, 880, .14, .05, 'triangle'); tone(a, n + .09, 1175, .2, .05, 'triangle'); }
  else if (k === 'win') [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(a, n + i * .09, f, .8, .08, 'triangle'));
  else if (k === 'ok') { tone(a, n, 1046.5, .5, .12, 'triangle'); tone(a, n + .2, 1318.5, .7, .12, 'triangle'); }
  else if (k === 'ng' || k === 'bad') tone(a, n, 220, .3, .08, 'sine');
}

/* ---------------- DOM patching (no flicker) ---------------- */
const keyOf = n => n.nodeType === 1 ? n.getAttribute('data-k') : null;
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
  old.forEach(n => { if (!used.has(n)) n.remove(); });
  pairs.forEach(([m, n], i) => { if (m) morphNode(m, n); else m = n; const at = a.childNodes[i]; if (at !== m) a.insertBefore(m, at || null); });
}
function patch(el, html) { const tm = document.createElement(el.tagName); tm.innerHTML = html; morphKids(el, tm); }

/* ---------------- the game state ----------------
   M = { G (engine.js), lvl, lvls: [per seat], mode: 'ai' | 'rated', id, dec: [your decisions with their grade], over, place } */
let M = null;
const U = { q: 0, f: 0, phase: 'idle', rollAt: 0, rev: null, revAt: 0, timer: 0, think: -1, coach: null, coachKey: '', said: {}, hover: null, lastDec: null };
const G = () => M && M.G;
// dice counts as shown: before the count of a reveal ends, the counts from before the call
const shownDice = p => U.rev && !U.rev.done ? U.rev.res.diceBefore[p] : G().dice[p];
const shownTotal = () => { let s = 0; for (let p = 0; p < G().n; p++) s += shownDice(p); return s; };
const pace = () => !set.anim ? .35 : set.speed === 'slow' ? 1.45 : set.speed === 'fast' ? .6 : 1;
// the game moves on only while the window is in front (shared/focusgate.js freezes performance.now when it is not)
// (and not while a dialog is open over the table)
const frozen = () => !!(window.__focusGate && window.__focusGate.frozen) || !!document.querySelector('.overlay.show:not(#resOverlay)');
let schedN = 0;
function sched(fn, ms) {
  clearTimeout(U.timer); const my = ++schedN, end = performance.now() + (ms || 0);
  const tick = () => { if (my !== schedN) return; const left = end - performance.now(); if (left <= 0 && !frozen()) { fn(); return; } U.timer = setTimeout(tick, Math.max(16, Math.min(left, 150))); };
  U.timer = setTimeout(tick, Math.max(0, Math.min(ms || 0, 150)));
}
function unsched() { schedN++; clearTimeout(U.timer); }
function persist() { if (!M || M.tut) return; D.cur = M; save(); }
function rulesFromSet(o) { o = o || set; return { wild: !!o.wild, palifico: !!o.palifico, calza: !!o.calza, raise: o.raise, dice: 5 }; }
function newGame(o) {
  unsched();
  if (window.LdRated) LdRated.forfeitIfLive();
  recordAbandon();
  o = o || {};
  const n = o.players || set.players, lvl = o.lvl || set.lvl;
  const g = LD.newGame({ players: n, rules: o.rules || rulesFromSet(), starter: Math.floor(Math.random() * n) });
  M = { G: g, lvl, lvls: [0].concat(Array(n - 1).fill(lvl)), mode: o.mode || 'ai', id: Date.now().toString(36), dec: [], over: false, place: -1, rated: o.rated || null };
  U.rev = null; U.said = {}; U.coach = null; U.lastDec = null;
  startRound();
}
function startRound() {
  const g = G();
  LD.startRound(g);
  U.rev = null; U.said = {}; U.coach = null; U.q = 0; U.f = 0;
  U.phase = 'roll'; U.rollAt = performance.now();
  persist(); render();
  sfx('shake');
  const dur = Math.round(1150 * Math.max(.55, pace()));
  setTimeout(() => sfx('slam'), dur - 120);
  sched(() => { U.phase = 'peek'; sfx('lift'); render(); sched(() => { U.phase = 'bid'; render(); loop(); }, 520 * Math.max(.6, pace())); }, dur);
}

/* ---------------- the loop ---------------- */
function loop() {
  unsched();
  const g = G(); if (!g || U.phase !== 'bid' || g.phase !== 'bid') return;
  const p = g.round.turn;
  if (p === 0) { sfx('turn'); presetBuilder(); render(); return; }
  U.think = p; render();
  // the computer answers at once; we wait only for the previous call's animation (the speech bubble)
  const since = performance.now() - (U.saidAt || 0), wait = Math.max(0, 760 * pace() - since);
  sched(() => {
    const g2 = G(); if (!g2 || g2.phase !== 'bid' || g2.round.turn !== p) return;
    let a; try { a = window.LdTut && LdTut.on() ? LdTut.bot(g2, p) : AI.decide(g2, p, M.lvls[p]); } catch (e) { console.error(e); a = LD.last(g2) ? { t: 'dudo' } : { t: 'bid', q: 1, f: 2 }; }
    U.think = -1; doAct(p, a);
  }, wait);
}
function doAct(p, a) {
  const g = G();
  // your decisions: graded against the coach's numbers before the move (for the review and the statistics)
  if (p === 0 && !M.tut) {
    try { const C = AI.coach(g, 0, a), v = AI.verdict(C.opts, a); const dec = { r: g.round.no, i: g.round.bids.length, a, grade: v.grade, best: v.best.a, U: v.me.U, bestU: v.best.U, T: C.T, opts: C.opts.slice(0, 5).map(o => ({ a: o.a, U: o.U, T: o.T, lose: o.lose })) }; M.dec.push(dec); U.lastDec = dec;
      D.stats.grades[v.grade] = (D.stats.grades[v.grade] || 0) + 1;
      if (a.t === 'bid') { D.stats.bids++; const sup = LD.supportOf(g.hands[0], a.f, LD.wildOn(g)); if (sup === 0) D.stats.bluffs++; } } catch (e) { console.error(e); }
  }
  let res;
  try { res = LD.act(g, p, a); } catch (e) { console.error(e); toast(t('err.illegal')); return; }
  U.said[p] = { a, at: Date.now() }; U.saidAt = performance.now(); U.coach = null;
  sfx(a.t === 'bid' ? 'bid' : a.t === 'dudo' ? 'dudo' : 'calza');
  persist();
  if (res) { reveal(res); return; }
  render();
  sched(loop, p === 0 ? 300 : 0);
}

/* ---------------- the reveal ---------------- */
function reveal(res) {
  const g = G();
  U.phase = 'reveal'; U.rev = { res, at: performance.now(), step: 0 };
  // statistics for you
  if (!M.tut) {
    const st = D.stats;
    if (res.by === 0 && res.t === 'dudo') { st.dudo++; if (!res.ok) st.dudoOk++; }
    if (res.by === 0 && res.t === 'calza') { st.calza++; if (res.ok) st.calzaOk++; }
    if (res.t === 'dudo' && res.bid.p === 0 && !res.ok) st.caught++;
    if (res.loser === 0) st.lost[res.t === 'calza' ? 'calza' : res.by === 0 ? 'call' : 'caught']++;
  }
  render();
  // count the matching dice one by one
  const hits = countOrder(res), per = Math.max(110, Math.min(260, 2400 / Math.max(6, hits.length))) * Math.max(.5, pace());
  U.rev.hits = hits;
  const t0 = 900 * Math.max(.6, pace());
  hits.forEach((h, i) => setTimeout(() => { if (!U.rev || U.rev.res !== res) return; U.rev.step = i + 1; sfx('count'); render(); }, t0 + i * per));
  const tEnd = t0 + hits.length * per + 500;
  setTimeout(() => { if (!U.rev || U.rev.res !== res) return; U.rev.done = true; sfx(res.loser === 0 ? 'lose' : res.gainer >= 0 ? 'gain' : res.loser >= 0 ? 'lose' : 'gain'); render(); afterReveal(); }, tEnd);
  persist();
}
// the matching dice in table order (seat by seat), for the count-up
function countOrder(res) {
  const out = [], f = res.bid.f;
  res.hands.forEach((h, p) => h.forEach((d, i) => { if (d === f || (res.wild && d === 1 && f !== 1)) out.push([p, i]); }));
  return out;
}
function afterReveal() {
  const g = G();
  if (M.tut) { render(); if (window.LdTut) LdTut.ev('reveal'); return; }
  const meOut = g.dice[0] === 0;
  if (g.over || meOut) {
    // you are out: the rest of the table plays on at once (the finishing order decides your place)
    if (!g.over) finishFast();
    M.over = true; M.place = LD.places(g).indexOf(0);
    gameEnd();
  }
  persist(); render();
}
function finishFast() {
  const g = G();
  let guard = 0;
  while (!g.over && guard++ < 400) {
    if (g.phase !== 'bid') LD.startRound(g);
    let r = null, n = 0;
    while (!r && n++ < 200) { const p = g.round.turn; r = LD.act(g, p, AI.decide(g, p, M.lvls[p])); }
  }
}
function nextRound() { const g = G(); if (!g || M.over || U.phase !== 'reveal' || !U.rev || !U.rev.done) return; startRound(); }

/* ---------------- end of the game ---------------- */
function gameEnd() {
  const g = G(), place = M.place, n = g.n, st = D.stats;
  st.games++; if (place === 0) st.wins++; st.placeSum += place; st.placeN++;
  const lk = String(M.lvl); st.byLvl[lk] = st.byLvl[lk] || { g: 0, w: 0, ps: 0 }; st.byLvl[lk].g++; if (place === 0) st.byLvl[lk].w++; st.byLvl[lk].ps += place;
  let rt = null;
  if (M.mode === 'rated' && window.LdRated) rt = LdRated.settle((n - 1 - place) / (n - 1), 'end');
  recordGame(place === 0 ? 'w' : 'l');
  M.rtRes = rt;
  // a short history for the review (last 20 games)
  D.hist = (D.hist || []).concat([{ id: M.id, at: Date.now(), n, lvl: M.lvl, mode: M.mode, place, R: g.R, rounds: g.rounds, dec: M.dec }]).slice(-20);
  save();
  sfx(place === 0 ? 'win' : 'bad');
  setTimeout(showResult, 700);
}
function recordGame(res) {
  if (!window.GameRecord || !M || M.recorded || M.tut) return;
  M.recorded = true;
  try { GameRecord.add({ mode: M.mode === 'rated' ? 'rated' : 'ai', res, opp: 'AI ' + levelLabel(M.lvl), key: 'p' + G().n, n: G().rounds.length, why: t('rec.place', { p: M.place + 1, n: G().n }) }); } catch (e) {}
}
// a game left half way (new game / resign) counts as last place once it has started
function recordAbandon() {
  if (!M || M.over || M.recorded || M.tut || !G() || G().rounds.length === 0) return;
  M.over = true; M.place = G().n - 1;
  D.stats.games++; D.stats.placeSum += M.place; D.stats.placeN++;
  recordGame('l'); save();
}
function showResult() {
  if (!M || !M.over) return;
  const g = G(), win = M.place === 0, order = LD.places(g);
  const rows = order.map((p, i) => `<li class="${p === 0 ? 'me' : ''}"><em>${i + 1}</em><b>${esc(nameOf(p))}</b><small>${p === 0 ? '' : esc(levelLabel(M.lvls[p]))}</small></li>`).join('');
  const rt = M.rtRes && window.LdRated ? LdRated.resHtml(M.rtRes) : '';
  $('#resBody').innerHTML = `<div class="res-ico">${Dice.img(win ? 6 : 1, 'res-die')}</div><h2>${esc(t(win ? 'res.win' : 'res.place', { p: M.place + 1 }))}</h2>` +
    `<p class="res-sub">${esc(t('res.sub', { r: g.rounds.length, n: g.n }))}</p><ol class="res-order">${rows}</ol>${rt ? `<div class="res-rt">${rt}</div>` : ''}`;
  openOv('#resOverlay');
}
$('#resClose').onclick = () => closeOv('#resOverlay');
$('#resReview').onclick = () => { closeOv('#resOverlay'); if (window.LdTools) LdTools.review(); };
$('#resAgain').onclick = () => { closeOv('#resOverlay'); if (M && M.mode === 'rated' && window.LdRated) LdRated.start(); else newGame({ players: G() ? G().n : set.players, lvl: M ? M.lvl : set.lvl, rules: G() ? G().R : null }); };

/* ---------------- your input: the bid builder ---------------- */
function myCtx() { const g = G(); return g && g.phase === 'bid' && g.round.turn === 0 ? LD.bidCtx(g, 0) : null; }
// start the builder on the smallest raise of the face you hold most of (or the last face)
function presetBuilder() {
  const ctx = myCtx(); if (!ctx) return;
  const g = G(), wild = LD.wildOn(g);
  let bestF = 0, bs = -1;
  for (let f = 1; f <= 6; f++) { const m = LD.minQ(ctx, f); if (m > ctx.total) continue; const s = LD.supportOf(g.hands[0], f, wild) * 10 - (ctx.prev && f === ctx.prev.f ? 0 : 1) + f * .01; if (s > bs) { bs = s; bestF = f; } }
  U.f = bestF; U.q = bestF ? LD.minQ(ctx, bestF) : 0;
}
function setFace(f) {
  const ctx = myCtx(); if (!ctx) return;
  const m = LD.minQ(ctx, f); if (m > ctx.total) { sfx('bad'); return; }
  U.f = f; if (!U.q || U.q < m || !LD.legalBid(ctx, U.q, f)) U.q = m;
  sfx('sel'); render();
}
function stepQ(d) {
  const ctx = myCtx(); if (!ctx || !U.f) return;
  let q = U.q + d; const m = LD.minQ(ctx, U.f);
  q = Math.max(m, Math.min(ctx.total, q));
  if (!LD.legalBid(ctx, q, U.f)) return;
  U.q = q; sfx('sel'); render();
}
function bidMe() {
  const ctx = myCtx(); if (!ctx) return;
  if (tutBlock({ t: 'bid', q: U.q, f: U.f })) return;
  if (!U.f || !LD.legalBid(ctx, U.q, U.f)) { sfx('bad'); toast(t('msg.illegal')); return; }
  doAct(0, { t: 'bid', q: U.q, f: U.f });
  if (window.LdTut) LdTut.after('bid');
}
function dudoMe() { const g = G(); if (!myCtx() || !LD.canDudo(g, 0)) return; if (tutBlock({ t: 'dudo' })) return; doAct(0, { t: 'dudo' }); if (window.LdTut) LdTut.after('dudo'); }
function calzaMe() { const g = G(); if (!myCtx() || !LD.canCalza(g, 0)) return; if (tutBlock({ t: 'calza' })) return; doAct(0, { t: 'calza' }); if (window.LdTut) LdTut.after('calza'); }
function hintMe() {
  const g = G(); if (!myCtx()) return;
  if (M.mode === 'rated') { toast(t('hint.rated')); return; }
  const C = getCoach(); if (!C || !C.opts.length) return;
  const a = C.opts[0].a;
  if (a.t === 'bid') { U.f = a.f; U.q = a.q; render(); }
  else { const b = $(a.t === 'dudo' ? '#abDudo' : '#abCalza'); if (b) { b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); } }
  toast(t('hint.say', { a: actTxt(a) }));
  sfx('sel');
}
const actTxt = a => a.t === 'bid' ? bidTxt(a) : t(a.t === 'dudo' ? 'act.dudo' : 'act.calza');

/* ---------------- the table ---------------- */
// seat positions round an ellipse: you at the bottom, the others clockwise (left, top, right)
function seatPos(p, n) {
  if (p === 0) return [50, 88];
  const a = Math.PI / 2 + p * 2 * Math.PI / n;
  const ph = window.innerWidth < 761;
  return [50 + Math.cos(a) * (ph ? 34 : 41), (ph ? 53 : 50) + Math.sin(a) * (ph ? 37 : 33)];
}
function render() {
  const g = G(); if (!g) return;
  const box = $('#ldTable'), W = box.clientWidth, H = box.clientHeight;
  if (!W || !H) return;
  const n = g.n, r = g.round, rev = U.rev, wild = rev ? rev.res.wild : LD.wildOn(g);
  // sizes from the table
  const S = Math.min(W, H * 1.35);
  const cupW = Math.round(Math.max(46, Math.min(150, S * (n > 4 ? .105 : .12))));
  const dSm = Math.round(Math.max(15, Math.min(52, S * (n > 4 ? .04 : .046))));
  const dMe = Math.round(Math.max(34, Math.min(86, S * .085)));
  box.style.setProperty('--cupw', cupW + 'px'); box.style.setProperty('--dsm', dSm + 'px'); box.style.setProperty('--dme', dMe + 'px');
  const shaking = U.phase === 'roll', hitSet = new Set(rev && rev.hits ? rev.hits.slice(0, rev.step).map(([p, i]) => p + ':' + i) : []);
  const bidF = rev ? rev.res.bid.f : 0;
  let h = '';
  for (let p = 0; p < n; p++) {
    const [x, y] = seatPos(p, n), on = g.dice[p] > 0 || (rev && rev.res.diceBefore[p] > 0), act = U.phase === 'bid' && g.phase === 'bid' && r.turn === p;
    const said = U.said[p], last = LD.last(g);
    const lostNow = rev && rev.done && rev.res.loser === p, gainNow = rev && rev.done && rev.res.gainer === p;
    const nd = rev ? rev.res.diceBefore[p] : g.dice[p];
    // dice left (small pips under the name)
    const left = Array.from({ length: 5 }, (_, i) => `<i class="${i < shownDice(p) ? 'on' : ''}${lostNow && i === g.dice[p] ? ' lost' : ''}${gainNow && i === g.dice[p] - 1 ? ' got' : ''}"></i>`).join('');
    const stat = !on ? `<small class="out">${esc(t('seat.out'))}</small>` : '';
    const pal = r && r.pal === p ? `<span class="palb">${esc(t('pal.badge'))}</span>` : '';
    const think = U.think === p ? '<span class="think"><i></i><i></i><i></i></span>' : '';
    const plate = `<div class="plate${act ? ' act' : ''}${on ? '' : ' gone'}" data-n="${shownDice(p)}"><span class="ava av${p}">${esc(nameOf(p).slice(0, 1))}</span><span class="pn"><b>${esc(nameOf(p))}</b><small>${p === 0 ? esc(M.mode === 'rated' ? t('mode.rated') : '') : esc(levelLabel(M.lvls[p]))}</small></span>${think}<span class="dl">${left}</span>${stat}${pal}</div>`;
    // the speech bubble: this round's last call by this seat
    let bub = '';
    if (said && (!rev || said.a.t !== 'bid' || (last && last.p === p))) {
      const a = said.a, isLast = a.t === 'bid' && last && last.p === p && last.q === a.q && last.f === a.f;
      bub = a.t === 'bid' ? `<div class="bub${isLast ? ' cur' : ''}" data-k="bub${p}-${a.q}-${a.f}">${bidHtml(a)}</div>` : `<div class="bub call ${a.t}" data-k="bub${p}-${a.t}"><b>${esc(t(a.t === 'dudo' ? 'act.dudo' : 'act.calza'))}</b></div>`;
    }
    // the cup and the dice under it
    let dice = '';
    if (on && nd > 0) {
      const hand = rev ? rev.res.hands[p] : g.hands[p];
      const show = rev || (p === 0 && U.phase !== 'roll');
      if (show) dice = `<div class="dice${p === 0 ? ' me' : ''}" data-k="dice${p}-${r ? r.no : 0}">` + hand.map((d, i) => {
        const match = rev && (d === bidF || (wild && d === 1 && bidF !== 1));
        const hit = hitSet.has(p + ':' + i), lose = lostNow && i === hand.length - 1 && rev.res.t === 'dudo' || (lostNow && rev.res.t === 'calza' && i === hand.length - 1);
        return Dice.die(d, { k: `d${p}-${i}-${r ? r.no : 0}`, cls: (rev ? (match ? 'm' : 'x') : '') + (hit ? ' hit' : '') + (lose ? ' gone' : ''), rot: Dice.rot(r ? r.no : 0, p, i) });
      }).join('') + `</div>`;
    }
    const cupCls = p === 0 ? (U.phase === 'roll' ? 'shake' : 'up') : rev ? 'up' : shaking ? 'shake' : '';
    const cup = on && nd > 0 ? `<div class="cup ${cupCls}" data-k="cup${p}" style="--sd:${(p * 97 % 160)}ms"><span class="cupi"></span></div>` : '';
    h += `<div class="seat s${p}${p === 0 ? ' me' : ''}${act ? ' act' : ''}${on ? '' : ' gone'}${y < 40 ? ' top' : ''}${x > 62 ? ' rside' : ''}" data-k="seat${p}" style="left:${x}%;top:${y}%">${cup}${dice}${plate}${bub}</div>`;
  }
  // the middle: the bid on the table, the round, wild / palifico
  const last = rev ? rev.res.bid : LD.last(g);
  let mid = `<div class="mid" data-k="mid"><div class="mid-h"><small>${esc(t('round.no', { n: r ? r.no : 0 }))}</small>${r && r.pal >= 0 ? `<span class="palt">${esc(t('pal.round', { n: nameOf(r.pal) }))}</span>` : wild ? `<span class="wildt">${Dice.img(1, 'wd')}${esc(t('wild.on'))}</span>` : ''}</div>`;
  if (rev) {
    const R = rev.res, cnt = Math.min(rev.step, rev.hits ? rev.hits.length : 0);
    mid += `<div class="mid-bid rv">${bidHtml(R.bid, 'bl')}<em>${esc(nameOf(R.bid.p))}</em></div><div class="count"><small>${esc(t('rev.count'))}</small><b class="${rev.done ? (R.n >= R.bid.q ? 'yes' : 'no') : ''}">${cnt}</b></div>`;
    if (rev.done) mid += `<div class="verdict ${R.loser === 0 ? 'bad' : R.gainer === 0 ? 'good' : ''}">${esc(verdictTxt(R))}</div>`;
  } else if (last) mid += `<div class="mid-bid">${bidHtml(last, 'bl')}<em>${esc(nameOf(last.p))}</em></div><div class="mid-tot">${esc(t('dice.total', { n: LD.total(g) }))}</div>`;
  else mid += `<div class="mid-open">${esc(U.phase === 'roll' ? t('roll.now') : r && r.turn === 0 ? t('open.you') : t('open.wait', { n: nameOf(r ? r.turn : 0) }))}</div><div class="mid-tot">${esc(t('dice.total', { n: LD.total(g) }))}</div>`;
  // the bids of this round so far
  const bids = rev ? (g.rounds[g.rounds.length - 1] || {}).bids || [] : r ? r.bids : [];
  if (bids.length > 1 && !rev) mid += `<div class="hist">${bids.slice(-7, -1).map(b => `<span class="ldh">${esc(nameOf(b.p).slice(0, 1))}<b>${b.q}</b>${Dice.img(b.f, 'hd')}</span>`).join('')}</div>`;
  mid += `</div>`;
  h += mid;
  patch(box, h);
  box.classList.toggle('reveal', !!rev);
  renderActbar(); renderSide(); renderNums();
  if (window.LdTut) LdTut.ev('render');
}
function verdictTxt(R) {
  if (R.t === 'calza') return R.ok ? t(R.gainer >= 0 ? 'rev.calzaOkGain' : 'rev.calzaOk', { n: nameOf(R.by) }) : t('rev.calzaNg', { n: nameOf(R.by), c: R.n });
  return R.ok ? t('rev.true', { c: R.n, n: nameOf(R.by) }) : t('rev.false', { c: R.n, n: nameOf(R.bid.p) });
}
function renderActbar() {
  const bar = $('#actbar'), g = G();
  if (!g) { patch(bar, ''); return; }
  if (M.over) { patch(bar, `<div class="ab-msg">${esc(t('ab.over', { p: M.place + 1 }))}</div><div class="ab-btns main"><button class="abtn" id="abReview">${esc(t('btn.review'))}</button><button class="abtn go" id="abNew">${esc(t('btn.again'))}</button></div>`); $('#abReview').onclick = () => window.LdTools && LdTools.review(); $('#abNew').onclick = () => $('#resAgain').click(); return; }
  if (U.phase === 'roll' || U.phase === 'peek') { patch(bar, `<div class="ab-msg wait">${esc(t('roll.now'))}</div>`); return; }
  if (U.phase === 'reveal') {
    const done = U.rev && U.rev.done;
    patch(bar, `<div class="ab-msg wait rv">${esc(done ? verdictTxt(U.rev.res) : t('rev.open'))}</div>` + (done && !M.tut ? `<div class="ab-btns main"><button class="abtn go" id="btnNextRound">${esc(t('next.round'))}<kbd>Space</kbd></button></div>` : ''));
    const nb = $('#btnNextRound'); if (nb) nb.onclick = nextRound; return;
  }
  const ctx = myCtx();
  if (!ctx) { patch(bar, `<div class="ab-msg wait">${esc(t('ab.wait', { n: nameOf(g.round.turn) }))}</div>`); return; }
  const faces = [1, 2, 3, 4, 5, 6].map(f => { const m = LD.minQ(ctx, f), ok = m <= ctx.total; return `<button type="button" class="fbtn${U.f === f ? ' sel' : ''}${ok ? '' : ' off'}" data-f="${f}"${ok ? '' : ' disabled'} title="${ok ? esc(t('min.q', { q: m })) : ''}">${Dice.img(f, 'fb')}<small>${ok ? m + '+' : '—'}</small></button>`; }).join('');
  const legal = U.f && LD.legalBid(ctx, U.q, U.f);
  const msg = ctx.prev ? t('ab.raise', { b: bidTxt(ctx.prev) }) : t('ab.open');
  const C = set.odds && M.mode !== 'rated' ? getCoach() : null;
  const pT = C && U.f && legal ? `<span class="oddsv" title="${esc(t('set.odds.h'))}"><small>${esc(t('odds.lab'))}</small><b>${pct(AI.pTrue(C.V, U.q, U.f))}</b></span>` : '';
  patch(bar, `<div class="ab-msg turn">${esc(msg)}</div>` +
    `<div class="bld">${pT}<div class="qsel"><button type="button" class="qb" id="qMinus" aria-label="−">−</button><b id="qVal">${U.q || '–'}</b><button type="button" class="qb" id="qPlus" aria-label="+">+</button></div><span class="xmul">×</span><div class="fsel">${faces}</div></div>` +
    `<div class="ab-btns main">${ctx.prev ? `<button class="abtn dudo" id="abDudo">${esc(t('act.dudo'))}<kbd>D</kbd></button>` : ''}` +
    (G().R.calza && ctx.prev ? `<button class="abtn calza" id="abCalza"${LD.canCalza(g, 0) ? '' : ' disabled'} title="${esc(t('calza.t'))}">${esc(t('act.calza'))}<kbd>C</kbd></button>` : '') +
    `<button class="abtn go" id="abBid"${legal ? '' : ' disabled'}><span class="pcl">${esc(legal ? t('act.bidN', { b: bidTxt({ q: U.q, f: U.f }) }) : t('act.bid'))}</span><span class="phl">${esc(t('act.bid'))}</span><kbd>Space</kbd></button></div>`);
  bar.querySelectorAll('[data-f]').forEach(b => b.onclick = () => setFace(+b.dataset.f));
  $('#qMinus').onclick = () => stepQ(-1); $('#qPlus').onclick = () => stepQ(1);
  $('#abBid').onclick = bidMe; const dd = $('#abDudo'); if (dd) dd.onclick = dudoMe; const cz = $('#abCalza'); if (cz) cz.onclick = calzaMe;
}

/* ---------------- side panel ---------------- */
function getCoach() {
  const g = G(); if (!g || g.phase !== 'bid' || !g.round) return null;
  const key = g.round.no + ':' + g.round.bids.length + ':' + g.round.turn;
  if (!U.coach || U.coachKey !== key) { try { U.coach = AI.coach(g, 0); } catch (e) { console.error(e); U.coach = null; } U.coachKey = key; }
  return U.coach;
}
const coachSw = () => `<button type="button" class="ck-sw${set.coach ? ' on' : ''}" data-csw role="switch" aria-checked="${set.coach ? 'true' : 'false'}" title="${esc(t('set.coach'))}"><b>${set.coach ? 'ON' : 'OFF'}</b><i></i></button>`;
function renderSide() {
  const g = G(); let h = '';
  // players (order of play, dice left, levels)
  h += `<div class="card pl-card" data-k="pl"><h3>${esc(t('side.table'))}<span class="h3s">${esc(t(M.mode === 'rated' ? 'mode.rated' : 'mode.ai'))} · ${esc(rulesShort(g.R))}</span></h3><div class="pl-rows">` +
    Array.from({ length: g.n }, (_, p) => p).map(p => `<div class="plr${g.round && g.round.turn === p && U.phase === 'bid' ? ' act' : ''}${g.dice[p] ? '' : ' gone'}"><span class="ava av${p}">${esc(nameOf(p).slice(0, 1))}</span><b>${esc(nameOf(p))}</b><small>${p ? esc(levelLabel(M.lvls[p])) : ''}</small><span class="dl">${Array.from({ length: 5 }, (_, i) => `<i class="${i < shownDice(p) ? 'on' : ''}"></i>`).join('')}</span><em>${shownDice(p)}</em></div>`).join('') + `</div></div>`;
  // coach
  const coachOk = !M.tut && M.mode !== 'rated' && !M.over;
  if (!coachOk) h += `<div class="card coach-card ck-rest" data-pt="coach" data-k="coach"><h3>${esc(t('side.coach'))}</h3><p class="muted">${esc(t(M.over ? 'coach.over' : M.mode === 'rated' ? 'coach.rated' : 'coach.rest'))}</p>${M.over ? `<button type="button" class="sbtn" id="ckReview">${esc(t('btn.review'))}</button>` : ''}</div>`;
  else if (set.coach) h += `<div class="card coach-card" data-pt="coach" data-k="coach"><h3>${esc(t('side.coach'))}${coachSw()}</h3>${coachHtml()}</div>`;
  else h += `<div class="card coach-card ck-off" data-pt="coach" data-k="coach"><h3>${esc(t('side.coach'))}${coachSw()}</h3><p class="muted">${esc(t('coach.off'))}</p></div>`;
  // odds: expected matches among all the dice, per face
  h += M.mode === 'rated' && !M.over ? `<div class="card odds-card ck-rest" data-pt="odds" data-k="odds"><h3>${esc(t('side.odds'))}</h3><p class="muted">${esc(t('odds.rated'))}</p></div>`
    : `<div class="card odds-card" data-pt="odds" data-k="odds"><h3>${esc(t('side.odds'))}<button type="button" class="sbtn mini" id="oddsCalc">${esc(t('btn.calc'))}</button></h3>${oddsHtml()}</div>`;
  // log
  h += `<div class="card log-card" data-pt="log" data-k="log"><h3>${esc(t('side.log'))}<span class="h3s">${esc(t('round.no', { n: g.round ? g.round.no : 0 }))}</span></h3><div class="pk-log" id="ldLog">${logHtml()}</div></div>`;
  // rating
  if (window.LdRated) h += `<div class="card rate-card" data-pt="rate" data-k="rate"><h3>${esc(t('side.rate'))}</h3>${LdRated.cardHtml()}</div>`;
  patch($('#side'), h);
  const lg = $('#ldLog'); if (lg) lg.scrollTop = lg.scrollHeight;
  const oc = $('#oddsCalc'); if (oc) oc.onclick = () => window.LdTools && LdTools.calc(true);
  const cr = $('#ckReview'); if (cr) cr.onclick = () => window.LdTools && LdTools.review();
  $$('#side [data-opt]').forEach(el => {
    const o = U.coach && U.coach.opts[+el.dataset.opt]; if (!o) return;
    el.onclick = () => { if (!myCtx()) return; if (o.a.t === 'bid') { U.f = o.a.f; U.q = o.a.q; render(); } else { const b = $(o.a.t === 'dudo' ? '#abDudo' : '#abCalza'); if (b) { b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); } } };
  });
  const tm = $('#tipsMore'); if (tm) tm.onclick = () => { set.tipsOpen = set.tipsOpen ? 0 : 1; save(); renderSide(); };
  if (window.LdRated) LdRated.wire();
  mTabs();
}
function rulesShort(R) { return [R.wild ? t('rs.wild') : t('rs.nowild'), R.palifico ? t('rs.pal') : '', R.calza ? t('rs.calza') : ''].filter(Boolean).join('・'); }
function oddsHtml() {
  const g = G(); if (!g.round) return '';
  const wild = U.rev ? U.rev.res.wild : LD.wildOn(g), unk = LD.total(g) - g.dice[0], mine = g.hands[0];
  const rows = [1, 2, 3, 4, 5, 6].map(f => {
    const own = LD.supportOf(mine, f, wild), e = unk * LD.pMatch(f, wild), tot = own + e;
    return `<div class="od${wild && f === 1 ? ' w' : ''}">${Dice.img(f, 'od')}<span class="od-b"><i class="own" style="width:${(own / Math.max(1, LD.total(g)) * 100 * 2.2).toFixed(1)}%"></i><i class="ex" style="width:${(e / Math.max(1, LD.total(g)) * 100 * 2.2).toFixed(1)}%"></i></span><b>${tot.toFixed(1)}</b><small>${own}+${e.toFixed(1)}</small></div>`;
  }).join('');
  return `<div class="odds">${rows}</div><p class="diff-desc">${esc(t(wild ? 'odds.help.w' : 'odds.help', { n: unk }))}</p>`;
}
function logHtml() {
  const g = G(); let h = '';
  const rounds = g.rounds.slice(-6);
  for (const R of rounds) {
    h += `<div class="lg-st">${esc(t('round.no', { n: R.no }))}${R.pal >= 0 ? ' · ' + esc(t('pal.badge')) : ''}</div>`;
    for (const b of R.bids) h += `<div class="lg${b.p === 0 ? ' me' : ''}"><b>${esc(nameOf(b.p))}</b><span>${bidHtml(b, 'sm')}</span></div>`;
    const x = R.res; h += `<div class="lg res${x.loser === 0 ? ' bad' : ''}"><b>${esc(nameOf(x.by))}</b><span><em>${esc(t(x.t === 'dudo' ? 'act.dudo' : 'act.calza'))}</em> → ${esc(t('log.count', { c: x.n }))} · ${esc(x.loser >= 0 ? t('log.lost', { n: nameOf(x.loser) }) : x.gainer >= 0 ? t('log.gain', { n: nameOf(x.gainer) }) : t('log.even'))}</span></div>`;
  }
  const r = g.round;
  if (r && !U.rev && r.bids.length) { h += `<div class="lg-st">${esc(t('round.no', { n: r.no }))}${r.pal >= 0 ? ' · ' + esc(t('pal.badge')) : ''}</div>`; for (const b of r.bids) h += `<div class="lg${b.p === 0 ? ' me' : ''}"><b>${esc(nameOf(b.p))}</b><span>${bidHtml(b, 'sm')}</span></div>`; }
  if (!h) h = `<p class="muted">${esc(t('log.none'))}</p>`;
  return h;
}

/* ---------------- coach ---------------- */
const GRADE = { best: '◎', good: '○', dubious: '△', bad: '✕' };
function optLabel(o) { return o.a.t === 'bid' ? bidHtml(o.a, 'sm') : `<b class="ckact ${o.a.t}">${esc(t(o.a.t === 'dudo' ? 'act.dudo' : 'act.calza'))}</b>`; }
function coachHtml() {
  const g = G();
  if (U.phase === 'reveal' && U.rev) return U.rev.done ? revealCoach(U.rev.res) : `<p class="muted">${esc(t('rev.open'))}</p>`;
  if (U.phase !== 'bid') return `<p class="muted">${esc(t('roll.now'))}</p>`;
  const C = getCoach(); if (!C) return '';
  const my = g.round.turn === 0, wild = LD.wildOn(g);
  let h = '';
  // summary chips
  const chips = [[t('ck.total'), LD.total(g)], [t('ck.mine'), g.dice[0]], [t('ck.rule'), g.round.pal >= 0 ? t('pal.badge') : wild ? t('wild.on') : t('rs.nowild')]];
  if (C.prev) chips.push([t('ck.bidNow'), bidTxt(C.prev)]);
  h += `<div class="ck-chips">${chips.map(([a, b]) => `<span><small>${esc(a)}</small><b>${esc(String(b))}</b></span>`).join('')}</div>`;
  if (C.prev) {
    const own = LD.supportOf(g.hands[0], C.prev.f, wild), plain = LD.pAtLeast(C.prev.q, own, LD.total(g) - g.dice[0], C.prev.f, wild);
    h += `<div class="ck-p"><div><small>${esc(t('ck.pNow', { b: bidTxt(C.prev) }))}</small><b class="${C.T < .4 ? 'lo' : C.T > .65 ? 'hi' : ''}">${pct(C.T)}</b></div><p>${esc(t('ck.pWhy', { m: own, u: LD.total(g) - g.dice[0], p: pct(plain) }))}</p></div>`;
  }
  if (my) {
    const best = C.opts[0];
    h += `<div class="rec"><span class="rb">${optLabel(best)}</span><p>${esc(recWhy(C, best))}</p></div>`;
    // the branches: the best options with their numbers (tap = choose it)
    h += `<div class="tips-h">${esc(t('ck.opts'))}</div><div class="ck-opts"><div class="ck-oh"><span></span><small>${esc(t('ck.colT'))}</small><small>${esc(t('ck.colL'))}</small><small>${esc(t('ck.colU'))}</small></div>` +
      C.opts.slice(0, 5).map((o, i) => `<button type="button" class="ck-o${i === 0 ? ' best' : ''}" data-opt="${i}"><span class="lab">${optLabel(o)}<em>${esc(t('kind.' + kindOf(o, g)))}</em></span><b>${o.a.t === 'calza' ? pct(o.E) : pct(o.T)}</b><b class="lo">${pct(o.lose)}</b><b class="${o.U >= 0 ? 'pos' : 'neg'}">${o.U >= 0 ? '+' : '−'}${Math.abs(o.U).toFixed(2)}</b></button>`).join('') +
      `</div><p class="diff-desc">${esc(t('ck.optsHelp'))}</p>`;
  } else h += `<p class="muted">${esc(t('ck.notTurn'))}</p>`;
  // what the others' bids say
  const reads = C.reads.filter(r => r.f && r.up > .25 && g.round.bids.some(b => b.p === r.j));
  if (reads.length) h += `<div class="ck-reads"><div class="tips-h">${esc(t('ck.reads'))}</div>${reads.map(r => `<div><span class="ava av${r.j}">${esc(nameOf(r.j).slice(0, 1))}</span>${esc(t('ck.read', { n: nameOf(r.j), u: r.up.toFixed(1) }))}${Dice.img(r.f, 'od')}</div>`).join('')}</div>`;
  // tips
  const tips = [];
  if (C.prev && C.T < .35) tips.push(t('tip.lowP'));
  if (C.prev && wild && C.prev.f !== 1 && LD.minQ(LD.bidCtx(g, 0), 1) <= LD.total(g)) tips.push(t('tip.toAces', { q: LD.minQ(LD.bidCtx(g, 0), 1) }));
  if (g.round.pal >= 0) tips.push(t('tip.pal'));
  if (g.dice[0] === 1) tips.push(t('tip.oneDie'));
  if (!C.prev) tips.push(t('tip.open'));
  tips.push(t('tip.expect', { n: (LD.total(g) - g.dice[0]), e: ((LD.total(g) - g.dice[0]) * (wild ? 1 / 3 : 1 / 6)).toFixed(1) }));
  const gen = ['tip.g1', 'tip.g2', 'tip.g3', 'tip.g4', 'tip.g5', 'tip.g6'], k = g.round.no % gen.length; tips.push(t(gen[k]), t(gen[(k + 2) % gen.length]));
  h += tipsHtml(tips);
  // your last decision
  if (U.lastDec) h += decHtml(U.lastDec);
  return h;
}
function kindOf(o, g) {
  if (o.a.t !== 'bid') return o.a.t;
  const sup = LD.supportOf(g.hands[0], o.a.f, LD.wildOn(g));
  return sup === 0 ? 'bluff' : o.T > .8 ? 'safe' : 'push';
}
function recWhy(C, o) {
  const g = G();
  if (o.a.t === 'dudo') return t('why.dudo', { p: pct(C.T), l: pct(C.opts.find(x => x.a.t === 'bid') ? C.opts.find(x => x.a.t === 'bid').lose : 1) });
  if (o.a.t === 'calza') return t('why.calza', { p: pct(o.E) });
  const sup = LD.supportOf(g.hands[0], o.a.f, LD.wildOn(g));
  return t(sup ? 'why.bid' : 'why.bluff', { b: bidTxt(o.a), m: sup, p: pct(o.T), d: pct(o.d || 0) });
}
function decHtml(d) {
  const same = d.best.t === d.a.t && (d.a.t !== 'bid' || (d.best.q === d.a.q && d.best.f === d.a.f));
  return `<div class="ck-dec g-${d.grade}"><span class="gm">${GRADE[d.grade]}</span><div><small>${esc(t('ck.lastDec'))}</small><b>${esc(actTxt(d.a))}</b><p>${esc(same ? t('dec.same') : t('dec.alt', { b: actTxt(d.best), d: (d.bestU - d.U).toFixed(2) }))}</p></div></div>`;
}
function revealCoach(R) {
  const mine = R.by === 0 || R.bid.p === 0;
  const k = R.t === 'calza' ? (R.ok ? 'rv.calzaOk' : 'rv.calzaNg') : R.ok ? 'rv.held' : 'rv.broke';
  let h = `<p>${esc(t(k, { c: R.n, q: R.bid.q }))}</p>`;
  if (mine && U.lastDec) h += decHtml(U.lastDec);
  h += tipsHtml([t('tip.after1'), t('tip.after2')]);
  return h;
}
function tipsHtml(tips) {
  if (!tips.length) return '';
  const n = 3, open = !!set.tipsOpen, show = open ? tips : tips.slice(0, n);
  return `<div class="tips"><div class="tips-h">💡 ${esc(t('tips.h'))}</div><ul>${show.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` +
    (tips.length > n ? `<button type="button" class="tips-more" id="tipsMore">${esc(open ? t('tips.less') : t('tips.more', { n: tips.length - n }))}</button>` : '') + `</div>`;
}

/* phones: the side cards become tabs */
function mTabs() {
  const side = $('#side'), have = new Set($$('#side [data-pt]').map(e => e.dataset.pt));
  const cur = set.mTab && have.has(set.mTab) ? set.mTab : 'coach';
  side.dataset.pt = cur;
  $$('#mTabs [data-pt]').forEach(b => { b.hidden = !have.has(b.dataset.pt); b.classList.toggle('sel', b.dataset.pt === cur); });
}
$('#mTabRec').onclick = () => window.GameRecord && GameRecord.open();
$$('#mTabs [data-pt]').forEach(b => b.onclick = () => {
  const sc = $('.stage'), pt = b.dataset.pt, same = $('#side').dataset.pt === pt;
  if (same) { sc.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  set.mTab = pt; save(); mTabs();
  const box = $(`#side [data-pt="${pt}"]`) || $('#side');
  const top = sc.scrollTop + box.getBoundingClientRect().top - sc.getBoundingClientRect().top - 8;
  sc.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
});
function fitLabels() {
  $$('.controls .btn span').forEach(sp => { sp.style.fontSize = ''; if (!sp.offsetParent) return; let f = parseFloat(getComputedStyle(sp).fontSize); while (sp.scrollWidth > sp.clientWidth + .5 && f > 8) { f -= .5; sp.style.fontSize = f + 'px'; } });
}
addEventListener('resize', () => requestAnimationFrame(fitLabels));
{ const sc = $('.stage'), upd = () => { const h = sc.clientHeight; if (h) document.documentElement.style.setProperty('--sh', h + 'px'); };
  if (window.ResizeObserver) new ResizeObserver(upd).observe(sc); upd(); }
if (window.ResizeObserver) { let lw = 0, lh = 0, q = 0; new ResizeObserver(() => { const b = $('#ldTable'); if (!b || (b.clientWidth === lw && b.clientHeight === lh)) return; lw = b.clientWidth; lh = b.clientHeight; if (!q) q = requestAnimationFrame(() => { q = 0; if (G()) render(); }); }).observe($('#ldTable')); }
let HB = null;
function renderNums() {
  const g = G();
  const game = `<span class="sg"><b>${esc(t(M.mode === 'rated' ? 'mode.rated' : 'mode.ai'))}</b><em>${esc('AI ' + levelLabel(M.lvl))}</em></span>`;
  const stat = (lab, val, cls) => `<span class="ss${cls ? ' ' + cls : ''}"><small>${esc(lab)}</small><b>${val}</b></span>`;
  const last = U.rev ? U.rev.res.bid : LD.last(g);
  const stats = stat(t('round.short'), '#' + (g.round ? g.round.no : 0)) + stat(t('ck.total'), shownTotal()) + stat(t('ck.mine'), shownDice(0)) + (last ? stat(t('ck.bidNow'), esc(bidTxt(last))) : '');
  $('#infobar').innerHTML = game + stats;
  const mg = `<b>${esc(t('title'))}</b><em>${esc(t('round.no', { n: g.round ? g.round.no : 0 }))} · ${esc(t('dice.total', { n: shownTotal() }))}</em>`;
  if ($('#mGame').innerHTML !== mg) $('#mGame').innerHTML = mg;
  if (HB && HB.on) HB.setInfo(game + `<span class="sdiv"></span>` + stats);
}

/* ---------------- dialogs ---------------- */
function openOv(sel) { $$('.overlay.show').forEach(o => o.classList.remove('show')); $(sel).classList.add('show'); }
function closeOv(sel) { $(sel).classList.remove('show'); if (G() && U.phase === 'bid' && !$('.overlay.show')) render(); }
$$('.overlay').forEach(o => o.addEventListener('pointerdown', e => { if (e.target === o && o.id !== 'rulesOverlay') { if (o.id === 'confirmOverlay') cfDone(false); o.classList.remove('show'); } }));
let cfCb = null;
function confirmBox(msg, yes) { $('#cfMsg').textContent = msg; cfCb = yes; openOv('#confirmOverlay'); setTimeout(() => $('#cfNo').focus(), 30); }
function cfDone(ok) { closeOv('#confirmOverlay'); const f = cfCb; cfCb = null; if (ok && f) f(); }
$('#cfNo').onclick = () => cfDone(false); $('#cfYes').onclick = () => cfDone(true);
let toastT = 0;
function toast(m) { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2600); }

/* new game: Game (rule sets) | Rules (mode, players, level, each rule) | Design (cups, dice, table) */
let NG = null, ngTab = 'game';
const PRESETS = ['perudo', 'dudo', 'classic'];
function openNew() {
  NG = { mode: 'ai', preset: set.preset, wild: set.wild, palifico: set.palifico, calza: set.calza, raise: set.raise, players: set.players, lvl: set.lvl };
  ngTab = 'game'; renderNew(); openOv('#newOverlay');
}
function seg(items, cur, attr) { return `<div class="seg">${items.map(([val, lab]) => `<button type="button" data-${attr}="${esc(val)}" class="${String(val) === String(cur) ? 'sel' : ''}">${esc(lab)}</button>`).join('')}</div>`; }
function presetOf(o) { for (const k of PRESETS) { const P = LD.PRESETS[k]; if (!!P.wild === !!o.wild && !!P.palifico === !!o.palifico && !!P.calza === !!o.calza && P.raise === o.raise) return k; } return 'custom'; }
function renderNew() {
  NG.preset = presetOf(NG);
  $('#ngTabs').innerHTML = ['game', 'rules', 'design'].map(k => `<button type="button" class="${k === ngTab ? 'sel' : ''}" data-tab="${k}">${esc(t('tab.' + k))}${k === 'rules' ? `<small>${esc(t('gm.' + NG.preset))}</small>` : ''}</button>`).join('');
  let h;
  if (ngTab === 'game') h = `<div class="ng-games ld3">` + PRESETS.map(k => `<button type="button" class="gcard${k === NG.preset ? ' sel' : ''}" data-g="${k}"><span class="gart">${Dice.art(k)}</span><b>${esc(t('gm.' + k))}</b><p>${esc(t('gm.' + k + '.d'))}</p><span class="gpick">${k === NG.preset ? '✓' : ''}</span></button>`).join('') + `</div>`;
  else if (ngTab === 'rules') {
    const row = (lab, help, html) => `<div class="rl"><div class="rl-t"><b>${esc(lab)}</b>${help ? `<small>${esc(help)}</small>` : ''}</div>${html}</div>`;
    const lvRow = NG.mode === 'rated' ? (window.LdRated ? `<div class="rl rl-rated">${LdRated.ngHtml()}</div>` : '') :
      `<div class="rl lvrow"><div class="rl-t"><b>${esc(t('o.level'))}</b><small>${esc(t('o.level.h'))}</small></div><div class="lvsel"><button type="button" class="qb" data-lvd="-1">−</button><input type="range" min="1" max="20" value="${NG.lvl}" id="ngLv"><button type="button" class="qb" data-lvd="1">+</button><b id="ngLvV">Lv.${NG.lvl}</b></div><p class="lv-desc" id="ngLvD">${esc(t('lvd.' + lvBand(NG.lvl)))}</p></div>`;
    h = `<div class="ng-mode">${seg([['ai', t('mode.ai')], ['rated', t('mode.rated')], ['online', t('mode.online')]], NG.mode, 'md')}</div>` +
      (NG.mode === 'online' ? `<div class="soon"><b>${esc(t('online.soon'))}</b><p>${esc(t('online.soon.d'))}</p></div>` :
      `<div class="rl-list two"><div>` + lvRow +
      (NG.mode === 'rated' ? '' : row(t('o.players'), t('o.players.h'), seg([2, 3, 4, 5, 6].map(n => [n, String(n)]), NG.players, 'np'))) +
      `</div><div>` +
      row(t('o.wild'), t('o.wild.h'), seg([[1, t('on')], [0, t('off')]], NG.wild ? 1 : 0, 'wd')) +
      row(t('o.pal'), t('o.pal.h'), seg([[1, t('on')], [0, t('off')]], NG.palifico ? 1 : 0, 'pl')) +
      row(t('o.calza'), t('o.calza.h'), seg([[1, t('on')], [0, t('off')]], NG.calza ? 1 : 0, 'cz')) +
      row(t('o.raise'), t('o.raise.h'), seg([['std', t('raise.std')], ['strict', t('raise.strict')]], NG.raise, 'rs')) +
      `</div></div>`);
  } else h = designHtml();
  const body = $('#ngBody'); body.innerHTML = h; body.dataset.tab = ngTab;
  $('#btnStart').disabled = NG.mode === 'online';
  $$('#ngTabs [data-tab]').forEach(b => b.onclick = () => { ngTab = b.dataset.tab; renderNew(); });
  $$('#ngBody [data-g]').forEach(b => { b.onclick = () => { Object.assign(NG, LD.PRESETS[b.dataset.g]); NG.wild = +NG.wild; NG.palifico = +NG.palifico; NG.calza = +NG.calza; renderNew(); }; b.ondblclick = () => $('#btnStart').click(); });
  $$('#ngBody [data-md]').forEach(b => b.onclick = () => { NG.mode = b.dataset.md; renderNew(); });
  $$('#ngBody [data-np]').forEach(b => b.onclick = () => { NG.players = +b.dataset.np; renderNew(); });
  $$('#ngBody [data-wd]').forEach(b => b.onclick = () => { NG.wild = +b.dataset.wd; renderNew(); });
  $$('#ngBody [data-pl]').forEach(b => b.onclick = () => { NG.palifico = +b.dataset.pl; renderNew(); });
  $$('#ngBody [data-cz]').forEach(b => b.onclick = () => { NG.calza = +b.dataset.cz; renderNew(); });
  $$('#ngBody [data-rs]').forEach(b => b.onclick = () => { NG.raise = b.dataset.rs; renderNew(); });
  const lv = $('#ngLv'); if (lv) { const upd = () => { NG.lvl = +lv.value; $('#ngLvV').textContent = 'Lv.' + NG.lvl; $('#ngLvD').textContent = t('lvd.' + lvBand(NG.lvl)); }; lv.oninput = upd; }
  $$('#ngBody [data-lvd]').forEach(b => b.onclick = () => { NG.lvl = Math.max(1, Math.min(20, NG.lvl + +b.dataset.lvd)); renderNew(); });
  if (ngTab === 'design') wireDesign(body);
  if (window.LdRated && NG.mode === 'rated') LdRated.wire();
}
const lvBand = L => L <= 3 ? 'a' : L <= 4 ? 'b' : L <= 8 ? 'c' : L <= 16 ? 'd' : 'e';
$('#btnNewClose').onclick = () => closeOv('#newOverlay');
$('#btnStart').onclick = () => {
  if (NG.mode === 'online') return;
  Object.assign(set, { preset: NG.preset, wild: NG.wild, palifico: NG.palifico, calza: NG.calza, raise: NG.raise, players: NG.players, lvl: NG.lvl }); save();
  closeOv('#newOverlay');
  const go = () => { if (NG.mode === 'rated' && window.LdRated) LdRated.start(); else newGame({ players: NG.players, lvl: NG.lvl, rules: rulesFromSet(NG) }); };
  if (M && !M.over && !M.tut && G().rounds.length) confirmBox(t('ng.abandonQ'), go); else go();
};

/* design: cups, dice, table (pictures; applied at once) */
const CUPS = ['brown', 'black', 'oxblood', 'tan'], DICE = ['bone', 'ebony', 'boxwood', 'resin'], FELTS = ['baize', 'oxblood', 'tan', 'navy'];
function designHtml() {
  const tile = (attr, k, cur, pv, lab) => `<button type="button" class="tile${cur === k ? ' sel' : ''}" data-${attr}="${k}"><span class="pv">${pv}</span><small>${esc(lab)}</small></button>`;
  const cups = CUPS.map(k => tile('cup', k, set.cup, `<img class="cup-pv" src="img/cup-${k}.webp?v=2" alt="">`, t('cup.' + k))).join('');
  const dice = DICE.map(k => tile('dice', k, set.dice, `<span class="dice-pv">${[5, 3, 1].map(f => `<img src="img/die-${k}-${f}.webp?v=2" alt="">`).join('')}</span>`, t('dmat.' + k))).join('');
  const felts = FELTS.map(k => tile('felt', k, set.felt, `<span class="felt-pv" style="background-image:url(img/felt-${k}.webp?v=2)"></span>`, t('felt.' + k))).join('');
  return `<div class="dz"><div class="dz-l"><div class="sec"><span class="lab">${esc(t('new.cup'))}</span><div class="tiles cups">${cups}</div></div><div class="sec"><span class="lab">${esc(t('new.dice'))}</span><div class="tiles dicet">${dice}</div></div></div>` +
    `<div class="dz-r"><div class="sec"><span class="lab">${esc(t('new.felt'))}</span><div class="tiles feltt">${felts}</div></div></div></div><p class="credit">${esc(t('credit'))}</p>`;
}
function wireDesign(root) {
  const re = () => { root.innerHTML = designHtml(); wireDesign(root); if (G()) render(); };
  root.querySelectorAll('[data-cup]').forEach(b => b.onclick = () => { set.cup = b.dataset.cup; applyLook(); save(); re(); });
  root.querySelectorAll('[data-dice]').forEach(b => b.onclick = () => { set.dice = b.dataset.dice; applyLook(); save(); re(); });
  root.querySelectorAll('[data-felt]').forEach(b => b.onclick = () => { set.felt = b.dataset.felt; applyLook(); save(); re(); });
}

/* settings (the gear) */
let setTab = 'play';
function openSettings() {
  const sw = (k, lab, help) => `<div class="rl"><div class="rl-t"><b>${esc(lab)}</b>${help ? `<small>${esc(help)}</small>` : ''}</div><label class="tgl"><input type="checkbox" data-k="${k}"${set[k] ? ' checked' : ''}><i></i></label></div>`;
  $('#setTabs').innerHTML = ['play', 'design'].map(k => `<button type="button" class="${k === setTab ? 'sel' : ''}" data-st="${k}">${esc(t('tab.' + k))}</button>`).join('');
  let h;
  if (setTab === 'play') h = `<div class="set-cols"><div class="rl-list">` + sw('coach', t('set.coach'), t('set.coach.h')) + sw('odds', t('set.odds'), t('set.odds.h')) + `</div><div class="rl-list">` + sw('anim', t('set.anim')) + sw('sound', t('set.sound')) +
    `<div class="rl"><div class="rl-t"><b>${esc(t('set.speed'))}</b></div>${seg([['slow', t('sp.slow')], ['normal', t('sp.normal')], ['fast', t('sp.fast')]], set.speed, 'sp')}</div></div></div>`;
  else h = designHtml();
  $('#setBody').innerHTML = h;
  $$('#setTabs [data-st]').forEach(b => b.onclick = () => { setTab = b.dataset.st; openSettings(); });
  $$('#setBody [data-k]').forEach(c => c.onchange = () => { set[c.dataset.k] = c.checked ? 1 : 0; if (c.dataset.k === 'sound') { set.sound = c.checked; try { localStorage.setItem('atlas-sfx', c.checked ? '1' : '0'); } catch (e) {} } save(); render(); });
  $$('#setBody [data-sp]').forEach(b => b.onclick = () => { set.speed = b.dataset.sp; save(); openSettings(); });
  if (setTab === 'design') wireDesign($('#setBody'));
  openOv('#setOverlay');
}
$('#btnSetClose').onclick = () => closeOv('#setOverlay');

/* ---------------- tutorial hooks ---------------- */
function tutBlock(a) { return !!(window.LdTut && LdTut.on() && !LdTut.allow(a)); }

/* ---------------- buttons & keys ---------------- */
$('#btnNew').onclick = openNew;
$('#btnSettings').onclick = openSettings;
$('#btnHint').onclick = hintMe;
$('#btnResign').onclick = () => {
  if (!M || M.tut || M.over) return;
  const go = () => {
    unsched();
    if (M.mode === 'rated' && window.LdRated) { M.rtRes = LdRated.settle(0, 'resign'); }
    recordAbandon(); M.over = true; M.place = G().n - 1; U.phase = 'over';
    persist(); render(); toast(t('resigned'));
    if (M.rtRes) showResult();
  };
  if (window.Resign) Resign.confirm({ lang: LANG }).then(ok => { if (ok) go(); }); else confirmBox(t('resignQ'), go);
};
$('#btnStats').onclick = () => window.LdTools && LdTools.stats();
$('#btnCalc').onclick = () => window.LdTools && LdTools.calc(!(M && M.mode === 'rated' && !M.over));
$('#btnLesson').onclick = () => window.LdLessons && LdLessons.open();
$('#langSel').onchange = () => { LANG = $('#langSel').value; try { localStorage.setItem('aicoding-lang', LANG); } catch (e) {} applyI18n(); U.coach = null; render(); if (window.LdRules && LdRules.relang) LdRules.relang(); if (window.GameRecord) GameRecord.relabel(); };
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea') || $('.overlay.show') || !G()) return;
  const k = e.key.toLowerCase();
  if (U.phase === 'reveal' && U.rev && U.rev.done && (k === ' ' || k === 'enter')) { e.preventDefault(); nextRound(); return; }
  if (!myCtx()) return;
  if (k === ' ' || k === 'enter') { e.preventDefault(); bidMe(); }
  else if (k === 'd') dudoMe(); else if (k === 'c') calzaMe(); else if (k === 'h') hintMe();
  else if (/^[1-6]$/.test(k)) setFace(+k);
  else if (k === 'arrowup') { e.preventDefault(); stepQ(1); } else if (k === 'arrowdown') { e.preventDefault(); stepQ(-1); }
  else if (k === 'arrowright' || k === 'arrowleft') { e.preventDefault(); const ctx = myCtx(); const dir = (k === 'arrowright') !== (LANG === 'ar') ? 1 : -1; for (let f = (U.f || 1) + dir; f >= 1 && f <= 6; f += dir) if (LD.minQ(ctx, f) <= ctx.total) { setFace(f); break; } }
});

/* ---------------- start ---------------- */
applyI18n();
if (window.GameRecord) GameRecord.init({ game: 'liarsdice', lang: () => LANG, menu: '.controls', sides: () => [t('you'), 'AI'] });
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnResign', '#btnHint', '#btnRules', '#btnLesson', '#btnCalc', '#btnStats'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => setTimeout(() => { if (G()) render(); }, 0));
if (window.RulesOffer) RulesOffer.init({ game: 'liarsdice', lang: () => LANG, open: () => window.LdRules && LdRules.open(), watch: '#rulesOverlay' });
// resume the saved game (a round in progress continues where it was; a round being revealed is shown again)
function resume() {
  const c = D.cur;
  if (!c || !c.G || !c.G.round) return false;
  M = c; const g = M.G;
  if (M.over) { U.phase = 'over'; render(); return true; }
  if (g.phase === 'bid') { U.phase = 'bid'; render(); loop(); return true; }
  if (g.phase === 'reveal' || g.phase === 'over') {
    const R = g.rounds[g.rounds.length - 1];
    U.phase = 'reveal'; U.rev = { res: R.res, at: 0, step: 0, done: true }; U.rev.hits = countOrder(R.res); U.rev.step = U.rev.hits.length;
    render(); afterReveal(); return true;
  }
  return false;
}
if (!resume()) newGame();

window.LdApp = { get M() { return M; }, get G() { return G(); }, get LANG() { return LANG; }, get U() { return U; }, t, esc, sfx, openOv, closeOv, toast, confirmBox, set, D, save, render, nameOf, bidTxt, bidHtml, actTxt, levelLabel, newGame, startRound, loop, doAct, sched, unsched, persist, rulesFromSet, GRADE,
  setM(m) { M = m; }, showTab(pt) { set.mTab = pt; mTabs(); } };
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-csw]'); if (!b || !G()) return; e.preventDefault(); const sc = document.querySelector('.stage'), st = sc ? sc.scrollTop : 0; set.coach = set.coach ? 0 : 1; save(); render(); toast(t('side.coach') + ' ' + (set.coach ? 'ON' : 'OFF')); if (sc) sc.scrollTop = st; });
})();
