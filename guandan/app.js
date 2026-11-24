/* 掼蛋 — game controller (guandan/app.js)
   You (bottom) and your partner (top) against two computer players (left, right), two decks with jokers, 27 cards each.
   Rules: engine.js · computer players and coach: ai.js · rules tutorial rules.js · guided hand tutorial.js · lessons lessons.js.
   Same shell as the poker / baccarat / blackjack pages (header bar, new-game dialog with Game | Rules | Design, right column, phone tabs). */
(function () {
'use strict';
const GD = window.GD, AI = window.GDAI, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-guandan', SUPPORTED = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const FELTS = ['jade', 'green', 'teal', 'blue', 'wine', 'charcoal', 'purple', 'mocha'];
const BACKS = ['crimson', 'ornateBlack', 'ornate', 'floral', 'floralBlack', 'azure', 'azureBlack', 'hex', 'cube', 'red', 'blue', 'navy', 'skullBlack', 'skull', 'gangsta'];
const COURTS = ['classic', 'antique', 'flat', 'gangsta'];
const LEVELS = [1, 2, 3, 4], STARTS = [2, 10, 0];   // 0 = single hands (practice)
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const RKN = r => r === 14 ? 'A' : r === 13 ? 'K' : r === 12 ? 'Q' : r === 11 ? 'J' : String(r);

/* ---------------- storage ---------------- */
function load() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
const D = load();
D.set = Object.assign({ lvl: 2, start: 2, felt: 'jade', back: 'crimson', court: 'classic', cmode: 'simple', sound: true, anim: 1, speed: 'normal', coach: 1, autoPass: 0, mTab: 'coach', lang: '' }, D.set || {});
D.stats = Object.assign({ matches: 0, mwins: 0, hands: 0, hwins: 0, places: [0, 0, 0, 0], bombs: 0, up: 0, passA: 0, byLvl: {} }, D.stats || {});
const set = D.set;
['felt', 'back', 'court', 'cmode'].forEach(k => { document.documentElement.dataset[k] = set[k]; });
function save() { try { const keep = D.cur && D.cur.tut ? Object.assign({}, D, { cur: D.prevCur || null }) : D; localStorage.setItem(STORE, JSON.stringify(keep)); } catch (e) {} }

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
  $('#brandTitle').textContent = t('title'); $('#brandSub').textContent = LANG === 'en' ? '' : 'Guandan';
}
const NAMES = () => [t('you'), t('bot.1'), t('bot.2'), t('bot.3')];
const ctName = c => c ? (c.t === 'bomb' ? t('ct.bombN', { n: c.n }) : t('ct.' + c.t)) : '';
const lvName = L => RKN(L);
const levelLabel = n => t('lv.' + n);

/* ---------------- sound ---------------- */
let AC = null, gest = false;
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { gest = true; }, { capture: true, passive: true }));
try { const sp = localStorage.getItem('atlas-sfx'); if (sp === '0' || sp === '1') set.sound = sp === '1'; } catch (e) {}
function ac() { if (!AC && !gest) return null; if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended' && !document.hidden) AC.resume(); return AC; }
document.addEventListener('visibilitychange', () => { if (AC) { if (document.hidden) AC.suspend(); else AC.resume(); } });
const SND = {}, SND_SRC = { place: '../solitaire/snd/place.mp3?v=2', shuffle: '../solitaire/snd/shuffle.mp3?v=2', flip: '../solitaire/snd/flip.mp3?v=1', draw: '../solitaire/snd/draw.mp3?v=1', win: '../solitaire/snd/win.mp3?v=1' };
function loadSnd(a) { for (const k in SND_SRC) if (!SND[k]) { SND[k] = 'loading'; fetch(SND_SRC[k]).then(r => r.arrayBuffer()).then(b => new Promise((ok, ng) => a.decodeAudioData(b, ok, ng))).then(buf => { SND[k] = buf; }).catch(() => { SND[k] = null; }); } }
function playB(a, k, tm, gain, rate) { const b = SND[k]; if (!b || b === 'loading') return false; const s = a.createBufferSource(), g = a.createGain(); s.buffer = b; s.playbackRate.value = rate || 1; g.gain.value = gain == null ? 1 : gain; s.connect(g).connect(a.destination); s.start(tm); return true; }
function noise(a, t0, dur, f, q, g) { const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3); const s = a.createBufferSource(), bp = a.createBiquadFilter(), gn = a.createGain(); s.buffer = b; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; gn.gain.value = g; s.connect(bp).connect(gn).connect(a.destination); s.start(t0); }
function tone(a, t0, f, dur, g, type) { const o = a.createOscillator(), gn = a.createGain(); o.type = type || 'sine'; o.frequency.value = f; gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(g, t0 + .01); gn.gain.exponentialRampToValueAtTime(.0008, t0 + dur); o.connect(gn).connect(a.destination); o.start(t0); o.stop(t0 + dur + .05); }
const vary = () => .93 + Math.random() * .14;
function sfx(k) {
  if (!set.sound || document.hidden) return; const a = ac(); if (!a) return; loadSnd(a); const n = a.currentTime + .005;
  if (k === 'play') { if (!playB(a, 'place', n, .9, vary())) noise(a, n, .06, 2600, 1, .35); }
  else if (k === 'deal') { if (!playB(a, 'draw', n, .7, vary())) noise(a, n, .05, 3600, 1.2, .3); }
  else if (k === 'shuffle') { if (!playB(a, 'shuffle', n, 1)) for (let i = 0; i < 9; i++) noise(a, n + i * .045, .06, 2600 + Math.random() * 800, .9, .35); }
  else if (k === 'pass') tone(a, n, 330, .18, .05, 'sine');
  else if (k === 'bomb') { noise(a, n, .35, 180, .7, .9); noise(a, n + .02, .25, 900, .8, .35); tone(a, n, 70, .5, .25, 'sine'); }
  else if (k === 'sel') tone(a, n, 1500, .05, .03, 'triangle');
  else if (k === 'turn') { tone(a, n, 880, .14, .05, 'triangle'); tone(a, n + .09, 1175, .2, .05, 'triangle'); }
  else if (k === 'win') { if (!playB(a, 'win', n, .9)) [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(a, n + i * .09, f, .8, .08, 'triangle')); }
  else if (k === 'out') [784, 988, 1318.5].forEach((f, i) => tone(a, n + i * .08, f, .5, .07, 'triangle'));
  else if (k === 'ok') { tone(a, n, 1046.5, .5, .12, 'triangle'); tone(a, n + .2, 1318.5, .7, .12, 'triangle'); }
  else if (k === 'ng' || k === 'bad') tone(a, n, 220, .3, .08, 'sine');
}
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => { const a = ac(); if (a) loadSnd(a); }, { once: true, passive: true }));

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
  pairs.forEach(([m, n], i) => {
    if (m) morphNode(m, n); else m = n;
    const at = a.childNodes[i]; if (at !== m) a.insertBefore(m, at || null);
  });
}
function patch(el, html) { const tm = document.createElement(el.tagName); tm.innerHTML = html; morphKids(el, tm); }

/* ---------------- the game state ---------------- */
let M = null, S = null;                 // the match and the hand (engine.js)
const U = { sel: new Set(), hint: -1, msg: null, choose: null, pins: [], last: {}, res: null, timer: 0, think: false, coach: null, coachKey: '' };
const rng = Math.random;
const LV = () => M ? M.lvl : set.lvl;
const isMe = s => s === 0;
const pace = () => !set.anim ? .35 : set.speed === 'slow' ? 1.5 : set.speed === 'fast' ? .55 : 1;
// the game moves on only while the window is in front (shared/focusgate.js freezes performance.now when it is not)
// (and not while a dialog is open over the table: the rules, a lesson, the settings …)
const frozen = () => !!(window.__focusGate && window.__focusGate.frozen) || !!document.querySelector('.overlay.show:not(#resOverlay)');
let schedN = 0;
function sched(fn, ms) {
  clearTimeout(U.timer); const my = ++schedN, end = performance.now() + (ms || 0);
  const tick = () => { if (my !== schedN) return; const left = end - performance.now(); if (left <= 0 && !frozen()) { fn(); return; } U.timer = setTimeout(tick, Math.max(16, Math.min(left, 150))); };
  U.timer = setTimeout(tick, Math.max(0, Math.min(ms || 0, 150)));
}
function unsched() { schedN++; clearTimeout(U.timer); }
function persist() { if (!M || (D.cur && D.cur.tut)) return; D.cur = { M, S, pins: U.pins, res: U.res }; save(); }
function newMatch(o) {
  unsched();
  recordAbandon();
  o = o || {};
  const st = o.start != null ? o.start : set.start;
  M = GD.newMatch({ start: st || 2, single: st === 0 });
  M.lvl = o.lvl || set.lvl; M.id = Date.now();
  startHand();
}
function startHand() {
  S = GD.dealHand(M, rng);
  U.sel.clear(); U.hint = -1; U.msg = null; U.choose = null; U.pins = []; U.last = {}; U.res = null; U.deal = Date.now(); U.coach = null;
  S.start = Date.now();
  sfx('shuffle');
  persist(); render();
  setTimeout(() => { sfx('deal'); }, 250);
  sched(loop, Math.round(1100 * Math.max(.6, pace())));
}

/* ---------------- the loop: tribute, then the plays ---------------- */
function loop() {
  unsched();
  if (!S || U.res) return;
  if (S.phase === 'trib') {
    const pend = S.trib.give.filter(g => g.id == null);
    const ai = pend.filter(g => !isMe(g.from));
    if (ai.length) { for (const g of ai) g.id = AI.chooseTribute(S.hands[g.from], S.L, LV()); persist(); render(); sched(loop, 500 * pace()); return; }
    if (pend.length) { render(); return; }   // your tribute: pick a card
    GD.doTribute(S); sfx('play'); U.tribShow = Date.now(); persist(); render();
    sched(loop, 1400 * pace()); return;
  }
  if (S.phase === 'ret') {
    const pend = S.trib.ret.filter(r => r.id == null);
    const ai = pend.filter(r => !isMe(r.from));
    if (ai.length) { for (const r of ai) r.id = AI.chooseReturn(S.hands[r.from], S.L, LV()); persist(); render(); sched(loop, 500 * pace()); return; }
    if (pend.length) { render(); return; }
    GD.doReturn(S); sfx('play'); persist(); render();
    sched(loop, 1300 * pace()); return;
  }
  if (S.phase === 'play') {
    if (isMe(S.turn)) {
      sfx('turn'); render();
      if (set.autoPass && S.last && !GD.gen(S.hands[0], S.L, { beat: S.last.c }).length) sched(() => { if (S.phase === 'play' && isMe(S.turn)) doAct(0, null); }, 650 * pace());
      return;
    }
    const seat = S.turn;
    if (window.GdTut && GdTut.on() && GdTut.hold()) { U.think = false; render(); return; }
    U.think = true; U.dbg = { seat, at: Date.now() };
    sched(() => {
      U.dbg.fired = Date.now();
      if (!S || S.phase !== 'play' || S.turn !== seat) { U.dbg.skip = 1; return; }
      let c = null; try { c = window.GdTut && GdTut.on() ? GdTut.bot(S, seat) : AI.decide(S, seat, LV(), rng); } catch (e) { console.error(e); c = S.last ? null : GD.gen(S.hands[seat], S.L)[0]; }
      U.think = false; doAct(seat, c);
    }, aiDelay(seat));
    render();
  }
}
function aiDelay(seat) {
  // quicker passes, longer plays; a fresh lead takes a moment
  const base = S.last ? 620 : 820, j = 260 * Math.random();
  return Math.round((base + j) * pace());
}
function doAct(seat, c) {
  let ev;
  try { ev = GD.act(S, seat, c); } catch (e) { console.error(e); toast(t('err.illegal')); return; }
  U.last[seat] = { c, at: Date.now() };
  if (c) { sfx(GD.isBomb(c) ? 'bomb' : 'play'); if (GD.isBomb(c) && isMe(seat)) D.stats.bombs++; }
  else sfx('pass');
  if (ev.out) { setTimeout(() => sfx('out'), 200); }
  if (isMe(seat)) { U.sel.clear(); U.hint = -1; U.msg = null; U.choose = null; U.pins = U.pins.map(p => p.filter(id => S.hands[0].includes(id))).filter(p => p.length); }
  if (ev.trick) { U.trickEnd = { at: Date.now(), lead: ev.trick.lead, jf: ev.trick.jf }; }
  U.coach = null;
  persist(); render();
  if (ev.end) { sched(handEnd, 900 * pace()); return; }
  sched(loop, ev.trick ? 900 * pace() : 120);
}

/* ---------------- end of a hand / of the match ---------------- */
function handEnd() {
  if (window.GdTut && GdTut.on()) { const R = GD.handResult(M, S); R.after = { lv: [Math.min(14, M.lv[0] + (R.win === 0 ? R.up : 0)), M.lv[1] + (R.win === 1 ? R.up : 0)], af: [0, 0] }; R.beforeLv = { lv: M.lv.slice(), af: [0, 0] }; U.res = R; sfx('win'); render(); GdTut.ev('end'); return; }
  const before = { lv: M.lv.slice(), af: M.af.slice() };
  const R = GD.handResult(M, S);
  GD.applyResult(M, R);
  R.after = { lv: M.lv.slice(), af: M.af.slice() };
  R.beforeLv = before;
  U.res = R;
  // statistics
  const st = D.stats; st.hands++; if (R.win === 0) { st.hwins++; st.up += R.up; } st.places[R.order.indexOf(0)]++;
  const lk = String(LV()); st.byLvl[lk] = st.byLvl[lk] || { h: 0, w: 0, m: 0, mw: 0 }; st.byLvl[lk].h++; if (R.win === 0) st.byLvl[lk].w++;
  if (M.over) {
    st.matches++; if (M.winner === 0) st.mwins++; st.byLvl[lk].m++; if (M.winner === 0) st.byLvl[lk].mw++;
    if (R.passA && R.win === 0) st.passA++;
    recordMatch(M.winner === 0 ? 'w' : 'l');
  } else if (M.opts.single) recordMatch(R.win === 0 ? 'w' : 'l');
  sfx(R.win === 0 ? 'win' : 'bad');
  persist(); render();
  if (M.over) setTimeout(showMatchEnd, 900);
}
function nextHand() { if (!M) return; if (window.GdTut && GdTut.on()) { GdTut.finish(); return; } if (M.over) { newMatch({ start: M.opts.single ? 0 : M.opts.start, lvl: M.lvl }); return; } U.res = null; startHand(); }
/* 勝敗記録 (shared/record.js): one entry per match (or per hand in practice mode) */
function recordMatch(res) {
  if (!window.GameRecord || !M || M.recorded || (D.cur && D.cur.tut)) return;
  if (!M.opts.single) M.recorded = true;
  try { GameRecord.add({ mode: 'ai', res, opp: 'CPU ' + levelLabel(LV()), key: M.opts.single ? 'single' : 'match', why: M.opts.single ? t('rec.hand') : t('rec.match', { a: lvName(M.lv[0]), b: lvName(M.lv[1]), n: M.hand }) }); } catch (e) {}
}
// a match left half way (new game / resign): a loss when it had started
function recordAbandon() {
  if (!M || M.over || M.recorded || M.opts.single || (D.cur && D.cur.tut) || !M.hand) return;
  D.stats.matches++; recordMatch('l');
}
function showMatchEnd() {
  if (!M || !M.over) return;
  const win = M.winner === 0;
  $('#resBody').innerHTML = `<div class="res-ico">${win ? '🏆' : '🥀'}</div><h2>${esc(t(win ? 'm.win' : 'm.lose'))}</h2>` +
    `<div class="res-lv"><div class="${win ? 'w' : ''}"><small>${esc(t('team.us'))}</small><b>${esc(lvName(M.lv[0]))}</b></div><span>:</span><div class="${win ? '' : 'w'}"><small>${esc(t('team.them'))}</small><b>${esc(lvName(M.lv[1]))}</b></div></div>` +
    `<p>${esc(t(win ? 'm.win.d' : 'm.lose.d', { n: M.hand }))}</p>`;
  openOv('#resOverlay');
}
$('#resClose').onclick = () => closeOv('#resOverlay');
$('#resAgain').onclick = () => { closeOv('#resOverlay'); newMatch({ start: M ? (M.opts.single ? 0 : M.opts.start) : set.start, lvl: LV() }); };

/* ---------------- your input ---------------- */
function legalPlays() { return S && S.phase === 'play' && isMe(S.turn) ? GD.gen(S.hands[0], S.L, S.last ? { beat: S.last.c } : null) : []; }
function readings(ids) {
  const r = GD.identify(ids, S.L);
  return S.last ? r.filter(c => GD.beats(c, S.last.c)) : r;
}
function selIds() { return S.hands[0].filter(id => U.sel.has(id)); }
// what the selection would be (for the play button and the message under it)
function selState() {
  const ids = selIds(); if (!ids.length) return { k: 'none' };
  const all = GD.identify(ids, S.L);
  if (!all.length) return { k: 'bad', ids };
  if (!S.last) return { k: 'ok', ids, r: all };
  const ok = all.filter(c => GD.beats(c, S.last.c));
  if (ok.length) return { k: 'ok', ids, r: ok };
  const sameT = all.some(c => c.t === S.last.c.t && c.n === S.last.c.n);
  return { k: sameT ? 'low' : 'shape', ids, r: all };
}
function playSel() {
  if (!S || S.phase !== 'play' || !isMe(S.turn)) return;
  if (tutBlock('play')) return;
  const st = selState();
  if (st.k === 'none') { toast(t('msg.pick')); return; }
  if (st.k !== 'ok') { sfx('bad'); shakeSel(); return; }
  // several readings (wilds; 3+2 or a bomb …): ask which one
  const uniq = [];
  for (const c of st.r.slice().sort((a, b) => b.k - a.k)) if (!uniq.some(x => x.t === c.t)) uniq.push(c);
  if (uniq.length > 1 && !U.choose) { U.choose = uniq; render(); return; }
  const c = uniq.sort((a, b) => GD.tier(b) - GD.tier(a))[0];
  U.choose = null; doAct(0, c);
  if (window.GdTut) GdTut.after('play');
}
function chooseReading(i) { const c = U.choose && U.choose[i]; U.choose = null; if (c) { doAct(0, c); if (window.GdTut) GdTut.after('play'); } }
function passMe() {
  if (!S || S.phase !== 'play' || !isMe(S.turn)) return;
  if (!S.last) { toast(t('msg.mustLead')); sfx('bad'); return; }
  if (tutBlock('pass')) return;
  doAct(0, null);
  if (window.GdTut) GdTut.after('pass');
}
function hintMe() {
  if (!S) return;
  if (S.phase === 'trib' || S.phase === 'ret') { if (myTribChoices().length) { U.sel = new Set([S.phase === 'ret' ? AI.chooseReturn(S.hands[0], S.L, 3) : AI.chooseTribute(S.hands[0], S.L, 3)]); sfx('sel'); render(); } return; }
  if (S.phase !== 'play' || !isMe(S.turn)) return;
  if (tutBlock('hint')) return;
  const L = legalPlays().sort((a, b) => GD.tier(a) - GD.tier(b) || a.k - b.k || a.n - b.n);
  if (!L.length) { toast(t('msg.noPlay')); const b = $('#abPass'); if (b) { b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 1600); } return; }
  U.hint = (U.hint + 1) % L.length; U.sel = new Set(L[U.hint].ids); U.choose = null; sfx('sel'); render();
  if (window.GdTut) GdTut.after('hint');
}
function shakeSel() { $$('#gdHand .cd.sel').forEach(e => { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }); }
function myTribChoices() {
  if (!S) return [];
  if (S.phase === 'trib') { const g = S.trib.give.find(x => isMe(x.from) && x.id == null); return g ? GD.tributeChoices(S.hands[0], S.L) : []; }
  if (S.phase === 'ret') { const r = S.trib.ret.find(x => isMe(x.from) && x.id == null); return r ? GD.returnChoices(S.hands[0], S.L) : []; }
  return [];
}
function giveSel() {
  const ch = myTribChoices(), ids = selIds();
  if (ids.length !== 1 || !ch.includes(ids[0])) { toast(t(S.phase === 'trib' ? 'tb.pickT' : 'tb.pickR')); sfx('bad'); return; }
  if (S.phase === 'trib') S.trib.give.find(x => isMe(x.from)).id = ids[0];
  else S.trib.ret.find(x => isMe(x.from)).id = ids[0];
  U.sel.clear(); sfx('play'); persist(); render(); sched(loop, 300);
}
function sortPin() {
  // 理牌: keep the selected cards together as one column on the left (again: undo all)
  const ids = selIds();
  if (!ids.length) { if (U.pins.length) { U.pins = []; persist(); render(); } else toast(t('msg.pinHelp')); return; }
  U.pins = U.pins.map(p => p.filter(id => !U.sel.has(id))).filter(p => p.length);
  U.pins.unshift(ids); U.sel.clear(); U.hint = -1; persist(); render();
}

/* ---------------- the table ---------------- */
function layoutHand(W, H) {
  const L = S.L, hand = S.hands[0], pinned = new Set([].concat(...U.pins));
  const cols = [];
  for (const p of U.pins) cols.push({ ids: GD.sortHand(p, L).reverse(), pin: true });
  const rest = GD.sortHand(hand.filter(id => !pinned.has(id)), L);
  const wild = rest.filter(id => GD.isWild(id, L));
  if (wild.length) cols.push({ ids: wild, wild: true });
  let cur = null;
  for (const id of rest) { if (GD.isWild(id, L)) continue; const v = GD.val(id, L); if (!cur || cur.v !== v) { cur = { v, ids: [] }; cols.push(cur); } cur.ids.push(id); }
  const n = Math.max(1, cols.length);
  // phones: two rows of columns (the strong cards on top) so the cards stay big enough to read and tap
  const rows = W < 640 && n > 8 ? 2 : 1, per = Math.ceil(n / rows), Hr = (H - (rows - 1) * 6) / rows;
  const rowsOf = rows === 1 ? [cols] : [cols.slice(0, per), cols.slice(per)];
  const maxM = Math.max(1, ...cols.map(c => c.ids.length));
  // card size: fit the width without overlap if it can (a 10% gap), within what the height allows; otherwise the columns overlap
  const byH = Hr / 1.4 / (1 + (Math.min(maxM, 5) - 1) * .28);
  const byW = W / (per * 1.1 - .1);
  const minW = W > 900 ? 58 : W > 600 ? 48 : 40;
  let cw = Math.min(W > 900 ? 92 : 80, byH, Math.max(minW, byW));
  cw = Math.max(30, cw);
  let ch = cw * 1.4, vstep = ch * .28;
  if (ch + (maxM - 1) * vstep > Hr) vstep = Math.max(ch * .17, (Hr - ch) / (maxM - 1));
  const gap = cw * .1, pos = new Map();
  let narrow = false, hTot = 0;
  rowsOf.forEach((rc, ri) => {
    const m = rc.length; if (!m) return;
    let step = cw + gap;
    if (m * cw + (m - 1) * gap > W) { step = m > 1 ? (W - cw) / (m - 1) : 0; narrow = true; }
    const tot = cw + (m - 1) * step, x0 = (W - tot) / 2, rm = Math.max(...rc.map(c => c.ids.length));
    const bottom = rows === 1 ? H : (ri + 1) * Hr + ri * 6;
    rc.forEach((c, i) => c.ids.forEach((id, j) => pos.set(id, { x: x0 + i * step, y: bottom - ch - (c.ids.length - 1 - j) * vstep, z: ri * 20 + j + 1, col: ri * per + i, pin: c.pin })));
    if (ri === 0) hTot = rows === 1 ? ch + (rm - 1) * vstep : H - (Hr - ch - (rm - 1) * vstep);
  });
  return { cw, ch, pos, vstep, narrow, h: hTot };
}
// where each seat's played cards go (fractions of the felt)
const TR = { 0: [.5, .6], 1: [.79, .38], 2: [.5, .2], 3: [.21, .38] };
function trickHtml(seat, tw, th, cw) {
  const a = U.last[seat], cur = S.log.filter(e => e.s === seat && e.tr === S.trick);
  let e = cur[cur.length - 1], old = false;
  if (!e && S.trick > 0 && U.trickEnd && Date.now() - U.trickEnd.at < 1100) { const p = S.log.filter(x => x.s === seat && x.tr === S.trick - 1); e = p[p.length - 1]; old = true; }
  if (!e) return '';
  const [fx, fy] = TR[seat];
  const st = `left:${(fx * 100).toFixed(2)}%;top:${(fy * 100).toFixed(2)}%`;
  if (!e.c) return `<div class="gtr pass s${seat}${old ? ' old' : ''}" style="${st}" data-k="tr${seat}-${S.trick}-p"><span class="pbub">${esc(t('pass'))}</span></div>`;
  const ids = GD.sortHand(e.c.ids, S.L), n = ids.length, sc = .72, w = cw * sc, step = n > 6 ? w * .36 : w * .48;
  const cards = ids.map((id, i) => Cards.html(id, { L: S.L, style: `left:${(i * step).toFixed(1)}px`, k: 'p' + id })).join('');
  const big = GD.isBomb(e.c) ? ' bomb' : '';
  return `<div class="gtr s${seat}${old ? ' old' : ''}${big}" style="${st};--pw:${(w + (n - 1) * step).toFixed(1)}px;--cw:${w.toFixed(1)}px;--chh:${(w * 1.4).toFixed(1)}px" data-k="tr${seat}-${S.log.indexOf(e)}"><div class="gtr-c">${cards}</div><span class="ctag">${esc(ctName(e.c))}</span></div>`;
}
function seatHtml(s) {
  const nm = NAMES()[s], n = S.hands[s].length, act = S.phase === 'play' && S.turn === s, place = S.out.indexOf(s);
  const role = s === 2 ? t('role.mate') : s === 0 ? t('role.you') : t('role.opp');
  const cnt = s === 0 ? '' : n === 0 ? '' : n <= 10 ? `<em class="cnt warn">${n}</em>` : `<em class="cnt">${esc(t('cnt.many'))}</em>`;
  const back = s !== 0 && n ? `<span class="gbk"><span class="cd pc dn"><span class="in"><div class="fr"></div><div class="bk"></div></span></span><span class="cd pc dn"><span class="in"><div class="fr"></div><div class="bk"></div></span></span></span>` : '';
  const medal = place >= 0 ? `<span class="medal m${place}">${esc(t('place.' + place))}</span>` : '';
  const thinking = act && !isMe(s) && U.think ? '<span class="think"><i></i><i></i><i></i></span>' : '';
  return `<div class="gseat s${s}${act ? ' act' : ''}${place >= 0 ? ' outp' : ''} t${s % 2}" data-k="seat${s}">${back}<div class="plate"><span class="ava av${s}">${esc(nm.slice(0, 1))}</span><span class="pn"><b>${esc(nm)}</b>${role && role !== nm ? `<small>${esc(role)}</small>` : ''}</span>${cnt}${thinking}</div>${medal}</div>`;
}
function tribHtml() {
  if (!S.trib || S.trib.mode === 'none') return '';
  const T = S.trib, N = NAMES();
  if (S.phase === 'play' && (S.log.length > 0 || !T)) return '';
  let rows = '';
  if (T.mode === 'anti') rows = `<div class="tb-r anti">${esc(t('tb.anti', { n: T.anti.map(s => N[s]).join(' · ') }))}</div>`;
  else {
    const row = (x, kind) => `<div class="tb-r"><span>${esc(N[x.from])}</span><i>→</i><span>${esc(N[x.to >= 0 ? x.to : 0] && x.to >= 0 ? N[x.to] : '?')}</span><b>${x.id != null && (kind === 'g' ? S.phase !== 'trib' || isMe(x.from) : S.phase === 'play' || isMe(x.from) || isMe(x.to)) ? Cards.mini(x.id, S.L) : '<span class="mc dn"></span>'}</b><small>${esc(t(kind === 'g' ? 'tb.give' : 'tb.ret'))}</small></div>`;
    rows = T.give.map(g => row(g, 'g')).join('') + (S.phase !== 'trib' ? T.ret.map(r => row(r, 'r')).join('') : '');
  }
  const head = t('tb.h.' + T.mode);
  return `<div class="tribbox" data-k="trib"><b>${esc(head)}</b>${rows}${S.phase === 'play' ? `<small class="tb-lead">${esc(t('tb.lead', { n: N[S.turn] }))}</small>` : ''}</div>`;
}
function resHtml() {
  const R = U.res; if (!R) return '';
  const N = NAMES(), win = R.win === 0;
  const order = R.order.map((s, i) => `<li class="t${s % 2}"><em>${esc(t('place.' + i))}</em><b>${esc(N[s])}</b></li>`).join('');
  let lv = '';
  if (!M.opts.single) {
    const a = R.beforeLv.lv, b = R.after.lv;
    const team = (k, nm) => `<div class="${R.win === k ? 'w' : ''}"><small>${esc(nm)}</small><b>${esc(lvName(a[k]))}${a[k] !== b[k] ? ` <i>→</i> ${esc(lvName(b[k]))}` : ''}</b></div>`;
    lv = `<div class="res-lv">${team(0, t('team.us'))}${team(1, t('team.them'))}</div>`;
  }
  let note = R.passA ? t('r.passA') : R.failA >= 0 ? t(R.failA === 0 ? 'r.failA.us' : 'r.failA.them', { n: 3 - (R.after.af[R.failA] || 0) }) : !M.opts.single ? t('r.up', { n: R.up, w: R.win === 0 ? t('team.us') : t('team.them') }) : '';
  if (R.reset >= 0) note = t('r.reset', { w: R.reset === 0 ? t('team.us') : t('team.them') });
  return `<div class="hres ${win ? 'win' : 'lose'}" data-k="hres"><b class="hres-h">${esc(t(win ? 'r.win' : 'r.lose'))}</b><ol>${order}</ol>${lv}${note ? `<p>${esc(note)}</p>` : ''}` +
    `<div class="hres-b">${M.over ? `<button class="abtn" id="hrSum">${esc(t('r.summary'))}</button><button class="abtn go" id="hrNext">${esc(t('r.newMatch'))}</button>` : `<button class="abtn go" id="hrNext">${esc(t('r.next'))}<kbd>Space</kbd></button>`}</div></div>`;
}
function render() {
  if (!S) return;
  const box = $('#gdTable'), W = box.clientWidth, H = box.clientHeight;
  if (!W || !H) return;
  const pc = matchMedia('(hover:hover) and (pointer:fine) and (min-width:1040px) and (min-aspect-ratio:3/4)').matches;
  // the hand area: the bottom of the felt
  const handH = Math.round(H * (pc ? .42 : .47)), handW = W - (pc ? 40 : 14);
  const lay = layoutHand(handW, handH - (pc ? 16 : 10));
  const tw = Math.min(W, H) * (pc ? .12 : .145);
  const tcw = Math.max(26, Math.min(pc ? 74 : 46, tw));
  // my played cards sit just above the top of my hand
  const handTop = H - 6 - lay.h - (pc ? 16 : 10);
  TR[0] = [.5, Math.max(.42, (handTop - tcw * 1.4 * .72 / 2 - (pc ? 34 : 26)) / H)];
  // the side seats' cards (and their label) stay above my name plate, which rises with a taller hand, and below their own plates
  const trH = tcw * 1.4 * .72, plateTop = H - lay.h - (pc ? 26 : 18) - (pc ? 44 : 34);
  TR[1][1] = TR[3][1] = Math.max((H * (pc ? .30 : .27) + (pc ? 24 : 18) + trH / 2) / H, Math.min(.38, (plateTop - 6 - (pc ? 30 : 22) - trH / 2) / H));
  const myTurn = S.phase === 'play' && isMe(S.turn);
  const tribCh = new Set(myTribChoices());
  const deal = U.deal && Date.now() - U.deal < 1600;
  let h = '';
  h += [1, 2, 3].map(seatHtml).join('');
  h += [0, 1, 2, 3].map(s => trickHtml(s, W, H, tcw)).join('');
  h += tribHtml();
  // the level of this hand, in the middle
  if (!U.res) h += `<div class="glevel" data-k="glevel"><small>${esc(t('lvl.now'))}</small><b>${esc(lvName(S.L))}</b><span>${Cards.mini(S.L === 14 ? 13 : S.L - 1 + 13, S.L)}<em>${esc(t('lvl.wild'))}</em></span></div>`;
  h += resHtml();
  // my hand
  const sel = U.sel, cards = S.hands[0].map(id => {
    const p = lay.pos.get(id); if (!p) return '';
    const cls = (sel.has(id) ? 'sel ' : '') + (tribCh.size && !tribCh.has(id) ? 'dim ' : '') + (tribCh.has(id) ? 'can ' : '') + (deal ? 'dealing' : '');
    const lift = sel.has(id) ? -lay.vstep * .62 : 0;
    return Cards.html(id, { L: S.L, cls, k: 'h' + id, style: `transform:translate(${p.x.toFixed(1)}px,${(p.y + lift).toFixed(1)}px);z-index:${p.z};--d:${(p.col * 18)}ms` });
  }).join('');
  h += `<div class="ghand${lay.narrow ? ' narrow' : ''}${myTurn ? ' turn' : ''}" id="gdHand" data-k="hand" style="--cw:${lay.cw.toFixed(1)}px;--chh:${lay.ch.toFixed(1)}px;height:${handH}px;width:${handW}px">${cards}</div>`;
  h += `<div class="me-plate" data-k="me" style="bottom:${Math.round(lay.h + (pc ? 26 : 18))}px">${seatHtml(0)}</div>`;
  patch(box, h);
  box.classList.toggle('small', lay.cw < 56);
  wireHand();
  const nx = $('#hrNext'); if (nx) nx.onclick = nextHand; const sm = $('#hrSum'); if (sm) sm.onclick = showMatchEnd;
  renderActbar(); renderSide(); renderNums();
  if (U.trickEnd && Date.now() - U.trickEnd.at < 1100) { clearTimeout(U.reT); U.reT = setTimeout(render, 1150 - (Date.now() - U.trickEnd.at)); }
  if (window.GdTut) GdTut.ev('render');
}
/* tap / drag across cards to pick them */
function wireHand() {
  const hb = $('#gdHand'); if (!hb || hb._w) return; hb._w = 1;
  let drag = null;
  const at = e => { const el = document.elementFromPoint(e.clientX, e.clientY); const cd = el && el.closest && el.closest('#gdHand .cd'); return cd ? +cd.dataset.c : null; };
  hb.addEventListener('pointerdown', e => {
    if (!S || U.res) return;
    const id = at(e); if (id == null) { return; }
    const can = S.phase === 'play' || myTribChoices().length;
    if (!can) return;
    e.preventDefault();
    if (S.phase !== 'play') { U.sel = new Set(U.sel.has(id) ? [] : [id]); sfx('sel'); render(); return; }
    const on = !U.sel.has(id); drag = { on, seen: new Set([id]) };
    if (on) U.sel.add(id); else U.sel.delete(id);
    U.hint = -1; U.choose = null; sfx('sel'); render();
    try { hb.setPointerCapture(e.pointerId); } catch (er) {}
  });
  hb.addEventListener('pointermove', e => {
    if (!drag) return; const id = at(e); if (id == null || drag.seen.has(id)) return; drag.seen.add(id);
    if (drag.on) U.sel.add(id); else U.sel.delete(id); sfx('sel'); render();
  });
  const up = () => { drag = null; };
  hb.addEventListener('pointerup', up); hb.addEventListener('pointercancel', up);
  hb.addEventListener('dblclick', e => { if (S && S.phase === 'play' && isMe(S.turn)) playSel(); });
  hb.addEventListener('contextmenu', e => { e.preventDefault(); U.sel.clear(); U.choose = null; render(); });
}
function renderActbar() {
  const bar = $('#actbar');
  if (U.res) { patch(bar, `<div class="ab-msg">${esc(t(M.over ? 'ab.over' : 'ab.handEnd'))}</div>`); return; }
  if (S.phase === 'trib' || S.phase === 'ret') {
    const mine = myTribChoices().length;
    if (mine) {
      const ids = selIds(), okSel = ids.length === 1 && myTribChoices().includes(ids[0]);
      patch(bar, `<div class="ab-msg">${esc(t(S.phase === 'trib' ? 'tb.youGive' : 'tb.youRet'))}</div><div class="ab-btns main"><button class="abtn" id="abHint">${esc(t('btn.hint'))}<kbd>H</kbd></button><button class="abtn go" id="abGive"${okSel ? '' : ' disabled'}>${esc(t(S.phase === 'trib' ? 'tb.doGive' : 'tb.doRet'))}<kbd>Space</kbd></button></div>`);
      $('#abGive').onclick = giveSel; $('#abHint').onclick = hintMe;
    } else patch(bar, `<div class="ab-msg wait">${esc(t(S.phase === 'trib' ? 'tb.wait' : 'tb.waitR'))}</div>`);
    return;
  }
  if (!isMe(S.turn)) {
    const N = NAMES();
    patch(bar, `<div class="ab-msg wait">${esc(S.out.includes(0) ? t('ab.outWait', { p: t('place.' + S.out.indexOf(0)) }) : t('ab.wait', { n: N[S.turn] }))}</div>`);
    return;
  }
  if (U.choose) {
    patch(bar, `<div class="ab-msg">${esc(t('ab.choose'))}</div><div class="ab-btns main">${U.choose.map((c, i) => `<button class="abtn go" data-ch="${i}">${esc(ctName(c))}${c.t !== 'kings' && c.t !== 'bomb' && c.t !== 'single' && c.t !== 'pair' && c.t !== 'triple' && c.t !== 'full' ? ' ' + esc(t('ab.top', { r: RKN(c.k) })) : ''}</button>`).join('')}<button class="abtn" id="abCancel">${esc(t('cancel'))}</button></div>`);
    bar.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => chooseReading(+b.dataset.ch)); $('#abCancel').onclick = () => { U.choose = null; render(); };
    return;
  }
  const st = selState(), canBeat = !S.last || legalPlays().length > 0;
  let msg;
  if (st.k === 'none') msg = S.last ? (canBeat ? t('ab.follow', { c: ctName(S.last.c) }) : t('ab.cannot')) : t('ab.lead');
  else if (st.k === 'bad') msg = t('ab.bad');
  else if (st.k === 'low') msg = t('ab.low');
  else if (st.k === 'shape') msg = t('ab.shape', { c: ctName(S.last.c) });
  else msg = t('ab.ok', { c: ctName(st.r.slice().sort((a, b) => GD.tier(b) - GD.tier(a))[0]) });
  const can = st.k === 'ok';
  patch(bar, `<div class="ab-msg${st.k === 'bad' || st.k === 'low' || st.k === 'shape' ? ' warn' : ''}${!canBeat && st.k === 'none' ? ' muted' : ''}">${esc(msg)}</div>` +
    `<div class="ab-btns main"><button class="abtn fold${S.last && !canBeat ? ' rec' : ''}" id="abPass"${S.last ? '' : ' disabled'}>${esc(t('pass'))}<kbd>P</kbd></button>` +
    `<button class="abtn" id="abHint">${esc(t('btn.hint'))}<kbd>H</kbd></button><button class="abtn" id="abPin" title="${esc(t('btn.pin.t'))}">${esc(t(U.sel.size ? 'btn.pin' : U.pins.length ? 'btn.unpin' : 'btn.pin'))}</button>` +
    `<button class="abtn go" id="abPlay"${can ? '' : ' disabled'}>${esc(t('btn.play'))}<kbd>Space</kbd></button></div>`);
  $('#abPass').onclick = passMe; $('#abHint').onclick = hintMe; $('#abPlay').onclick = playSel; $('#abPin').onclick = sortPin;
}

/* ---------------- side panel ---------------- */
const coachSw = () => `<button type="button" class="ck-sw${set.coach ? ' on' : ''}" data-csw role="switch" aria-checked="${set.coach ? 'true' : 'false'}" title="${esc(t('set.coach'))}"><b>${set.coach ? 'ON' : 'OFF'}</b><i></i></button>`;
function teamRow(k) {
  const lv = M.lv[k], cur = (M.lt < 0 && !M.opts.single) || M.lt === k, a = lv === 14 && !M.opts.single;
  return `<div class="lvrow t${k}${cur ? ' cur' : ''}"><span class="lvn">${esc(k === 0 ? t('team.us') : t('team.them'))}<small>${esc(k === 0 ? t('team.usD') : t('team.themD'))}</small></span>` +
    `<span class="lvtrack">${[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(r => `<i class="${r < lv ? 'done' : r === lv ? 'now' : ''}">${RKN(r)}</i>`).join('')}</span>` +
    (a ? `<em class="atry">${esc(t('lvl.aTry', { n: 3 - M.af[k] }))}</em>` : '') + `</div>`;
}
function renderSide() {
  let h = '';
  // the match: both teams' levels, this hand's level and wild card
  const single = M.opts.single;
  h += `<div class="card lv-card" data-pt="match" data-k="match"><h3>${esc(t(single ? 'side.practice' : 'side.match'))}<span class="h3s">${esc(t('hand.no', { n: S.no }))} · ${esc('CPU ' + levelLabel(LV()))}</span></h3>` +
    (single ? '' : teamRow(0) + teamRow(1)) +
    `<div class="lv-now"><div><small>${esc(t('lvl.now'))}</small><b>${esc(lvName(S.L))}</b></div><div class="lv-w"><small>${esc(t('lvl.wildL'))}</small><span>${Cards.mini(S.L === 14 ? 13 : S.L - 1 + 13, S.L)}</span><p>${esc(t('lvl.wildD'))}</p></div></div></div>`;
  // coach
  if (set.coach) h += `<div class="card coach-card" data-pt="coach" data-k="coach"><h3>${esc(t('side.coach'))}${coachSw()}</h3>${coachHtml()}</div>`;
  else h += `<div class="card coach-card ck-off" data-pt="coach" data-k="coach"><h3>${esc(t('side.coach'))}${coachSw()}</h3><p class="muted">${esc(t('coach.off'))}</p></div>`;
  // card counter (記牌): what is still out there
  h += `<div class="card cnt-card" data-pt="cnt" data-k="cnt"><h3>${esc(t('side.count'))}<span class="h3s">${esc(t('cnt.h'))}</span></h3>${counterHtml()}</div>`;
  // the log of this hand
  h += `<div class="card log-card" data-pt="log" data-k="log"><h3>${esc(t('side.log'))}<span class="h3s">${esc(t('hand.no', { n: S.no }))}</span></h3><div class="pk-log" id="gdLog">${logHtml()}</div></div>`;
  patch($('#side'), h);
  const lg = $('#gdLog'); if (lg) lg.scrollTop = lg.scrollHeight;
  const cp = $('#ckPick'); if (cp) cp.onclick = () => { const c = U.coach && U.coach.c; if (c && S.phase === 'play' && isMe(S.turn)) { U.sel = new Set(c.ids); U.choose = null; render(); } };
  const tm = $('#tipsMore'); if (tm) tm.onclick = () => { set.tipsOpen = set.tipsOpen ? 0 : 1; save(); renderSide(); };
  mTabs();
}
function counterHtml() {
  const L = S.L, U2 = AI.unseen(S, 0);
  const cells = [[17, 2], [16, 2], ['w', 2], [L, 6]];
  for (let r = 14; r >= 2; r--) if (r !== L) cells.push([r, 8]);
  return `<div class="cnt-grid">` + cells.map(([r, max]) => {
    const n = r === 'w' ? U2.W : U2.cnt[r] || 0;
    const lab = r === 17 ? t('cnt.bj') : r === 16 ? t('cnt.sj') : r === 'w' ? '★' + RKN(L) : RKN(r);
    const cls = (r === 'w' ? 'w ' : r === L ? 'l ' : r >= 16 ? 'j ' : '') + (n === 0 ? 'zero ' : '') + (n >= 4 && r !== 'w' && r < 16 ? 'bm' : '');
    return `<div class="${cls}"><small>${esc(lab)}</small><b>${n}</b><i style="--p:${(n / max).toFixed(2)}"></i></div>`;
  }).join('') + `</div><p class="diff-desc">${esc(t('cnt.help'))}</p>`;
}
function logHtml() {
  const N = NAMES(); let h = '', tr = -1;
  if (S.trib && S.trib.mode !== 'none') {
    if (S.trib.mode === 'anti') h += `<div class="lg-st">${esc(t('tb.anti', { n: S.trib.anti.map(s => N[s]).join(' · ') }))}</div>`;
    else if (S.phase === 'play' || S.phase === 'end') {
      h += `<div class="lg-st">${esc(t('tb.h.' + S.trib.mode))}</div>`;
      for (const g of S.trib.give) h += `<div class="lg${isMe(g.from) || isMe(g.to) ? ' me' : ''}"><b>${esc(N[g.from])} → ${esc(N[g.to])}</b><span>${Cards.mini(g.id, S.L)}</span></div>`;
      for (const r of S.trib.ret) h += `<div class="lg${isMe(r.from) || isMe(r.to) ? ' me' : ''}"><b>${esc(N[r.from])} → ${esc(N[r.to])}</b><span>${isMe(r.from) || isMe(r.to) ? Cards.mini(r.id, S.L) : '<span class="mc dn"></span>'}</span></div>`;
    }
  }
  for (const e of S.log) {
    if (e.tr !== tr) { tr = e.tr; h += `<div class="lg-st">${esc(t('log.trick', { n: tr + 1 }))}</div>`; }
    h += `<div class="lg${isMe(e.s) ? ' me' : ''} t${e.s % 2}"><b>${esc(N[e.s])}</b><span>${e.c ? `<em>${esc(ctName(e.c))}</em> <span class="mc-row">${GD.sortHand(e.c.ids, S.L).map(id => Cards.mini(id, S.L)).join('')}</span>` : `<em class="ps">${esc(t('pass'))}</em>`}</span></div>`;
  }
  if (!S.log.length) h += `<p class="muted">${esc(t('log.none'))}</p>`;
  return h;
}

/* ---------------- coach ---------------- */
const WHY = { finish: 'ck.finish', route: 'ck.route', feed: 'ck.feed', block: 'ck.block', 'lead-low': 'ck.leadLow', 'bombs-only': 'ck.bombsOnly', partner: 'ck.partner', 'partner-out': 'ck.partnerOut', unload: 'ck.unload', 'finish-route': 'ck.finishRoute', beat: 'ck.beat', stop: 'ck.stop', 'beat-break': 'ck.beatBreak', 'bomb-stop': 'ck.bombStop', 'bomb-route': 'ck.bombRoute', save: 'ck.save', cannot: 'ck.cannot', 'cannot-cheap': 'ck.cannotCheap', pass: 'ck.save', lead: 'ck.leadLow' };
function coachHtml() {
  if (S.phase === 'trib' || S.phase === 'ret') {
    const mine = myTribChoices().length;
    if (!mine) return `<p class="muted">${esc(t('ck.tribWait'))}</p>` + tipsHtml(['tip.trib1', 'tip.trib2']);
    return `<div class="rec"><span class="rb">${esc(t(S.phase === 'trib' ? 'tb.doGive' : 'tb.doRet'))}</span><p>${esc(t(S.phase === 'trib' ? 'ck.trib' : 'ck.ret'))}</p></div>` + tipsHtml(S.phase === 'trib' ? ['tip.trib1', 'tip.trib2'] : ['tip.ret1', 'tip.ret2']);
  }
  if (U.res) return `<p class="muted">${esc(t('ck.handEnd'))}</p>` + tipsHtml(['tip.g1', 'tip.g2', 'tip.g3']);
  const key = S.log.length + ':' + S.turn + ':' + S.hands[0].length;
  if (!U.coach || U.coachKey !== key) {
    try { U.coach = AI.coach(S, 0); } catch (e) { console.error(e); U.coach = null; }
    U.coachKey = key;
  }
  const C = U.coach; if (!C) return '';
  let h = '';
  const myTurn = S.phase === 'play' && isMe(S.turn);
  if (S.out.includes(0)) return `<p class="muted">${esc(t('ck.out'))}</p>` + tipsHtml(['tip.g4', 'tip.g5']);
  if (myTurn) {
    const c = C.c;
    h += `<div class="rec"><span class="rb">${c ? esc(ctName(c)) : esc(t('pass'))}</span>${c ? `<span class="mc-row ck-cards">${GD.sortHand(c.ids, S.L).map(id => Cards.mini(id, S.L)).join('')}</span>` : ''}<p>${esc(t(WHY[C.why] || 'ck.leadLow'))}</p>${c ? `<button type="button" class="sbtn" id="ckPick">${esc(t('ck.pick'))}</button>` : ''}</div>`;
  } else h += `<p class="muted">${esc(t('ck.notTurn'))}</p>`;
  // your hand as plays
  const gs = C.groups.slice().sort((a, b) => GD.tier(a) - GD.tier(b) || a.k - b.k);
  h += `<div class="ck-plan"><div class="tips-h">${esc(t('ck.plan', { n: C.turns, b: C.bombs }))}</div><div class="ck-groups">` +
    gs.map(g => `<span class="ckg${GD.isBomb(g) ? ' bomb' : ''}"><em>${esc(ctName(g))}</em><span class="mc-row">${GD.sortHand(g.ids, S.L).map(id => Cards.mini(id, S.L)).join('')}</span></span>`).join('') + `</div><p class="diff-desc">${esc(t('ck.planHelp'))}</p></div>`;
  // tips for this moment
  const tips = [];
  const opp = [1, 3].filter(x => S.hands[x].length).map(x => S.hands[x].length), mate = S.hands[2].length;
  if (opp.length && Math.min(...opp) <= 5) tips.push(t('tip.danger', { n: Math.min(...opp) }));
  if (mate && mate <= 5 && !S.out.includes(2)) tips.push(t('tip.mateShort', { n: mate }));
  if (S.last && S.last.s === 2) tips.push(t('tip.mateLed'));
  if (C.bombs) tips.push(t('tip.bombs'));
  if (S.hands[0].some(id => GD.isWild(id, S.L))) tips.push(t('tip.wild'));
  if (S.L === 14 && !M.opts.single) tips.push(t('tip.aLevel'));
  const gen = ['tip.g1', 'tip.g2', 'tip.g3', 'tip.g4', 'tip.g5', 'tip.g6', 'tip.g7', 'tip.g8'];
  const k = S.no % gen.length; tips.push(t(gen[k]), t(gen[(k + 3) % gen.length]));
  return h + tipsHtml(null, tips);
}
function tipsHtml(keys, list) {
  const tips = list || keys.map(k => t(k)); if (!tips.length) return '';
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
if (window.ResizeObserver) { let lw = 0, lh = 0, q = 0; new ResizeObserver(() => { const b = $('#gdTable'); if (!b || (b.clientWidth === lw && b.clientHeight === lh)) return; lw = b.clientWidth; lh = b.clientHeight; if (!q) q = requestAnimationFrame(() => { q = 0; if (S) render(); }); }).observe($('#gdTable')); }
let HB = null;
function renderNums() {
  const single = M.opts.single;
  const game = `<span class="sg"><b>${esc(t(single ? 'mode.single' : 'mode.match'))}</b><em>${esc('CPU ' + levelLabel(LV()))}</em></span>`;
  const stat = (lab, val, cls) => `<span class="ss${cls ? ' ' + cls : ''}"><small>${esc(lab)}</small><b>${val}</b></span>`;
  const stats = stat(t('lvl.now'), esc(lvName(S.L)), 'lvnow') + (single ? '' : stat(t('team.us'), esc(lvName(M.lv[0])), 't0') + stat(t('team.them'), esc(lvName(M.lv[1])), 't1')) + stat(t('hand.short'), '#' + S.no);
  $('#infobar').innerHTML = game + stats;
  const mg = `<b>${esc(t('title'))}</b><em>${esc(t('lvl.now'))} ${esc(lvName(S.L))}${single ? '' : ` · ${esc(t('team.us'))} ${esc(lvName(M.lv[0]))} : ${esc(lvName(M.lv[1]))}`}</em>`;
  if ($('#mGame').innerHTML !== mg) $('#mGame').innerHTML = mg;
  if (HB && HB.on) HB.setInfo(game + `<span class="sdiv"></span>` + stats);
}

/* ---------------- statistics dialog ---------------- */
function openStats() { renderStats(); openOv('#statsOverlay'); }
function renderStats() {
  const st = D.stats;
  if (!st.hands) { $('#statsBody').innerHTML = `<p class="muted center">${esc(t('st.none'))}</p>`; return; }
  const pc = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
  const cells = [['st.matches', st.matches], ['st.mwin', pc(st.mwins, st.matches)], ['st.hands', st.hands], ['st.hwin', pc(st.hwins, st.hands)],
    ['st.first', pc(st.places[0], st.hands)], ['st.up', st.hwins ? (st.up / st.hwins).toFixed(2) : '—'], ['st.bombs', st.bombs], ['st.passA', st.passA]];
  const places = [0, 1, 2, 3].map(i => `<div class="fq"><span>${esc(t('place.' + i))}</span><span class="fq-b"><i style="width:${(st.places[i] / st.hands * 100).toFixed(1)}%"></i></span><b>${pc(st.places[i], st.hands)}</b></div>`).join('');
  const rows = LEVELS.map(l => { const b = st.byLvl[l] || { h: 0, w: 0, m: 0, mw: 0 }; return `<tr><td>${esc(levelLabel(l))}</td><td>${b.m}</td><td>${pc(b.mw, b.m)}</td><td>${b.h}</td><td>${pc(b.w, b.h)}</td></tr>`; }).join('');
  $('#statsBody').innerHTML = `<div class="st-grid">${cells.map(([k, v]) => `<div><small>${esc(t(k))}</small><b>${v}</b></div>`).join('')}</div>` +
    `<div class="st-two"><div><span class="lab">${esc(t('st.places'))}</span>${places}</div>` +
    `<div><span class="lab">${esc(t('st.byLvl'))}</span><table class="st-tbl"><tr><th>CPU</th><th>${esc(t('st.matches'))}</th><th>${esc(t('st.mwin'))}</th><th>${esc(t('st.hands'))}</th><th>${esc(t('st.hwin'))}</th></tr>${rows}</table></div></div>` +
    `<p class="diff-desc">${esc(t('st.help'))}</p>`;
}
$('#btnStatsClose').onclick = () => closeOv('#statsOverlay');
$('#btnStatsReset').onclick = () => confirmBox(t('st.resetQ'), () => { D.stats = { matches: 0, mwins: 0, hands: 0, hwins: 0, places: [0, 0, 0, 0], bombs: 0, up: 0, passA: 0, byLvl: {} }; save(); renderStats(); });

/* ---------------- dialogs ---------------- */
function openOv(sel) { $$('.overlay.show').forEach(o => o.classList.remove('show')); $(sel).classList.add('show'); }
function closeOv(sel) { $(sel).classList.remove('show'); }
$$('.overlay').forEach(o => o.addEventListener('pointerdown', e => { if (e.target === o && o.id !== 'rulesOverlay') { if (o.id === 'confirmOverlay') cfDone(false); o.classList.remove('show'); } }));
let cfCb = null;
function confirmBox(msg, yes) { $('#cfMsg').textContent = msg; cfCb = yes; openOv('#confirmOverlay'); setTimeout(() => $('#cfNo').focus(), 30); }
function cfDone(ok) { closeOv('#confirmOverlay'); const f = cfCb; cfCb = null; if (ok && f) f(); }
$('#cfNo').onclick = () => cfDone(false); $('#cfYes').onclick = () => cfDone(true);
let toastT = 0;
function toast(m) { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2600); }

/* new game */
let NG = null, ngTab = 'game';
function openNew() { NG = { start: M ? (M.opts.single ? 0 : M.opts.start) : set.start, lvl: M ? M.lvl : set.lvl }; ngTab = 'game'; renderNew(); openOv('#newOverlay'); }
function seg(items, cur, attr) { return `<div class="seg">${items.map(([val, lab]) => `<button type="button" data-${attr}="${esc(val)}" class="${String(val) === String(cur) ? 'sel' : ''}">${esc(lab)}</button>`).join('')}</div>`; }
// the art of the game cards (new-game dialog, rules intro): a few cards fanned out
const GART = {
  2: [[53, 0, .15, -10], [52, .5, .05, -3], [14, 1.05, .05, 4], [40 + 54, 1.6, .15, 10]],      // big joker, small joker, 2♥, 2♣
  10: [[22, 0, .15, -9], [9 + 54, .5, .05, -3], [35, 1.05, .05, 4], [48, 1.6, .15, 10]],
  0: [[3, 0, .1, -8], [17, .5, .05, -3], [31, 1.0, .05, 3], [45, 1.5, .1, 8]],
};
function gArt(k) { return `<span class="garts">` + (GART[k] || GART[2]).map(([c, x, y, r]) => `<span class="cd" style="left:calc(var(--cw)*${x});top:calc(var(--cw)*${y});transform:rotate(${r}deg)"><span class="in">${Cards.face(c)}</span></span>`).join('') + `</span>`; }
function renderNew() {
  $('#ngTabs').innerHTML = ['game', 'rules', 'design'].map(k => `<button type="button" class="${k === ngTab ? 'sel' : ''}" data-tab="${k}">${esc(t('tab.' + k))}${k === 'rules' ? `<small>${esc(t('gm.' + NG.start))}</small>` : ''}</button>`).join('');
  let h;
  if (ngTab === 'game') h = `<div class="ng-games gd3">` + STARTS.map(k => `<button type="button" class="gcard${k === NG.start ? ' sel' : ''}" data-g="${k}"><span class="gart">${gArt(k)}</span><b>${esc(t('gm.' + k))}</b><p>${esc(t('gm.' + k + '.d'))}</p><span class="gpick">${k === NG.start ? '✓' : ''}</span></button>`).join('') + `</div>`;
  else if (ngTab === 'rules') {
    const row = (lab, help, html) => `<div class="rl"><div class="rl-t"><b>${esc(lab)}</b><small>${esc(help)}</small></div>${html}</div>`;
    h = `<div class="rl-list">` +
      row(t('o.level'), t('o.level.h'), `<div class="seg lv">${LEVELS.map(l => `<button type="button" data-lv="${l}" class="${l === NG.lvl ? 'sel' : ''}"><span>${esc(levelLabel(l))}</span><i class="dsel-pips">${'●'.repeat(l)}<s>${'●'.repeat(4 - l)}</s></i></button>`).join('')}</div>`) +
      row(t('o.autoPass'), t('o.autoPass.h'), seg([[0, t('off')], [1, t('on')]], set.autoPass ? 1 : 0, 'ap')) +
      `</div><p class="diff-desc">${esc(t('o.note'))}</p>`;
  } else h = designHtml();
  const body = $('#ngBody'); body.innerHTML = h; body.dataset.tab = ngTab;
  $$('#ngTabs [data-tab]').forEach(b => b.onclick = () => { ngTab = b.dataset.tab; renderNew(); });
  $$('#ngBody [data-g]').forEach(b => { b.onclick = () => { NG.start = +b.dataset.g; renderNew(); }; b.ondblclick = () => $('#btnStart').click(); });
  $$('#ngBody [data-lv]').forEach(b => b.onclick = () => { NG.lvl = +b.dataset.lv; renderNew(); });
  $$('#ngBody [data-ap]').forEach(b => b.onclick = () => { set.autoPass = +b.dataset.ap; save(); renderNew(); });
  if (ngTab === 'design') wireDesign(body);
}
$('#btnNewClose').onclick = () => closeOv('#newOverlay');
$('#btnStart').onclick = () => {
  set.start = NG.start; set.lvl = NG.lvl; save(); closeOv('#newOverlay');
  const go = () => newMatch({ start: NG.start, lvl: NG.lvl });
  if (M && !M.over && M.hand > 0 && !M.opts.single) confirmBox(t('ng.abandonQ'), go); else go();
};

/* design (shared with the poker / baccarat) */
function designHtml() {
  const felt = FELTS.map(f => `<button type="button" class="tile${set.felt === f ? ' sel' : ''}" data-felt="${f}"><span class="pv felt-pv" style="${feltStyle(f)}"></span><small>${esc(t('felt.' + f))}</small></button>`).join('');
  const back = BACKS.map(b => `<button type="button" class="tile${set.back === b ? ' sel' : ''}" data-back="${b}"><span class="pv"><span class="mini-card bk-pv" data-b="${b}"><span class="bk"></span></span></span><small>${esc(t('back.' + b))}</small></button>`).join('');
  const court = COURTS.map(k => `<button type="button" class="tile${set.court === k ? ' sel' : ''}" data-court="${k}"><span class="pv">${['K', 'Q', 'J'].map((r, i) => `<img class="ct-pv${Cards.FULL_DECKS.includes(k) ? ' full' : ''}" src="${Cards.IMG}${Cards.COURT_DIR[k]}${Cards.FULL_DECKS.includes(k) ? ['A', '7', 'K'][i] : r}${'hsd'[i]}.webp" alt="">`).join('')}</span><small>${esc(t('court.' + k))}</small></button>`).join('');
  return `<div class="dz"><div class="dz-l"><div class="sec"><span class="lab">${esc(t('new.back'))}</span><div class="tiles backs">${back}</div></div></div><div class="dz-r"><div class="sec"><span class="lab">${esc(t('new.court'))}</span><div class="tiles faces">${court}</div></div></div></div><div class="sec dz-felt"><span class="lab">${esc(t('new.felt'))}</span><div class="tiles felts">${felt}</div></div>`;
}
function feltStyle(f) {
  const c = { jade: ['#1f7d5e', '#0a3527'], green: ['#22704a', '#0e3a25'], blue: ['#235c97', '#0f2a4d'], wine: ['#7a2434', '#3b0e18'], charcoal: ['#3a3f45', '#16191c'], teal: ['#1d7474', '#0b3535'], purple: ['#56357f', '#24123d'], mocha: ['#6e4a2f', '#2e1b0f'] }[f];
  return `background:radial-gradient(120% 90% at 50% 20%,${c[0]},${c[1]})`;
}
function wireDesign(root) {
  const re = () => { root.innerHTML = designHtml(); wireDesign(root); if (S) render(); };
  root.querySelectorAll('[data-felt]').forEach(b => b.onclick = () => { set.felt = b.dataset.felt; document.documentElement.dataset.felt = set.felt; save(); re(); });
  root.querySelectorAll('[data-court]').forEach(b => b.onclick = () => { set.court = b.dataset.court; document.documentElement.dataset.court = set.court; save(); re(); });
  root.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { set.back = b.dataset.back; document.documentElement.dataset.back = set.back; save(); re(); });
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
  if (setTab === 'play') h = `<div class="set-cols"><div class="rl-list">` + sw('coach', t('set.coach'), t('set.coach.h')) + sw('autoPass', t('o.autoPass'), t('o.autoPass.h')) + `</div><div class="rl-list">` + sw('anim', t('set.anim')) + sw('sound', t('set.sound')) +
    `<div class="rl"><div class="rl-t"><b>${esc(t('set.speed'))}</b></div>${seg([['slow', t('sp.slow')], ['normal', t('sp.normal')], ['fast', t('sp.fast')]], set.speed, 'sp')}</div></div></div><p class="credit">${esc(t('credit'))}</p>`;
  else h = designHtml();
  $('#setBody').innerHTML = h;
  $$('#setTabs [data-st]').forEach(b => b.onclick = () => { setTab = b.dataset.st; openSettings(); });
  $$('#setBody [data-k]').forEach(c => c.onchange = () => { set[c.dataset.k] = c.checked ? 1 : 0; if (c.dataset.k === 'sound') { set.sound = c.checked; try { localStorage.setItem('atlas-sfx', c.checked ? '1' : '0'); } catch (e) {} } save(); render(); });
  $$('#setBody [data-sp]').forEach(b => b.onclick = () => { set.speed = b.dataset.sp; save(); openSettings(); });
  if (setTab === 'design') wireDesign($('#setBody'));
  openOv('#setOverlay');
}
$('#btnSetClose').onclick = () => closeOv('#setOverlay');

/* ---------------- tutorial hooks (tutorial.js) ---------------- */
function tutBlock(a) { return !!(window.GdTut && GdTut.on() && !GdTut.allow(a, selIds())); }
function startTutorial(setup) {
  unsched();
  D.prevCur = D.cur && !D.cur.tut ? D.cur : D.prevCur;
  const o = setup();   // { M, S }
  M = o.M; S = o.S; D.cur = { tut: true };
  U.sel.clear(); U.hint = -1; U.msg = null; U.choose = null; U.pins = []; U.last = {}; U.res = null; U.coach = null; U.deal = Date.now();
  render();
}
function endTutorial() {
  unsched();
  const p = D.prevCur; D.prevCur = null; D.cur = p || null; save();
  if (p && p.M && p.S) { M = p.M; S = p.S; U.pins = p.pins || []; U.res = p.res || null; U.last = {}; U.sel.clear(); render(); loop(); }
  else newMatch();
}

/* ---------------- buttons & keys ---------------- */
$('#btnNew').onclick = openNew;
$('#btnSettings').onclick = openSettings;
$('#btnSound').onclick = () => { set.sound = !set.sound; try { localStorage.setItem('atlas-sfx', set.sound ? '1' : '0'); } catch (e) {} save(); $('#btnSound').classList.toggle('on', !!set.sound); };
$('#btnHint').onclick = hintMe;
$('#btnResign').onclick = () => {
  if (!M || (D.cur && D.cur.tut)) return;
  if (M.over || M.opts.single) { newMatch(); return; }
  const go = () => { unsched(); recordAbandon(); M.recorded = true; toast(t('resigned')); newMatch({ start: M.opts.start, lvl: M.lvl }); };
  if (window.Resign) Resign.confirm({ lang: LANG }).then(ok => { if (ok) go(); }); else confirmBox(t('resignQ'), go);
};
$('#btnStats').onclick = openStats;
$('#btnLesson').onclick = () => window.GdLessons && GdLessons.open();
$('#langSel').onchange = () => { LANG = $('#langSel').value; try { localStorage.setItem('aicoding-lang', LANG); } catch (e) {} applyI18n(); U.coach = null; render(); if (window.GdRules && GdRules.relang) GdRules.relang(); if (window.GameRecord) GameRecord.relabel(); };
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea') || $('.overlay.show') || !S) return;
  const k = e.key.toLowerCase();
  if (U.res && (k === ' ' || k === 'enter')) { e.preventDefault(); if (!M.over) nextHand(); return; }
  if (S.phase === 'trib' || S.phase === 'ret') { if (k === ' ' || k === 'enter') { e.preventDefault(); giveSel(); } else if (k === 'h') hintMe(); return; }
  if (S.phase !== 'play' || !isMe(S.turn)) return;
  if (k === ' ' || k === 'enter') { e.preventDefault(); if (U.choose) chooseReading(0); else playSel(); }
  else if (k === 'p') passMe(); else if (k === 'h') hintMe();
  else if (k === 'escape') { U.sel.clear(); U.choose = null; render(); }
});

/* ---------------- start ---------------- */
applyI18n();
if (window.GameRecord) GameRecord.init({ game: 'guandan', lang: () => LANG, menu: '.controls', variant: () => { const k = M && M.opts.single ? 'single' : 'match'; return { k, n: t('mode.' + k) }; }, variants: () => ['match', 'single'], variantName: k => t('mode.' + k), defVariant: 'match' });
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnResign', '#btnHint', '#btnRules', '#btnLesson', '#btnStats'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => setTimeout(() => { if (S) render(); }, 0));
if (window.RulesOffer) RulesOffer.init({ game: 'guandan', lang: () => LANG, open: () => window.GdRules && GdRules.open(), watch: '#rulesOverlay' });
$('#btnSound').classList.toggle('on', !!set.sound);
// resume the saved match (a hand in progress continues where it was)
if (D.cur && D.cur.M && D.cur.S && !D.cur.tut) {
  M = D.cur.M; S = D.cur.S; U.pins = D.cur.pins || []; U.res = D.cur.res || null;
  if (S.phase === 'end' && !U.res) { render(); handEnd(); }
  else { render(); sched(loop, 700); }
} else newMatch();

window.GdApp = { get M() { return M; }, get S() { return S; }, get LANG() { return LANG; }, t, esc, sfx, openOv, closeOv, toast, confirmBox, set, D, save, render, gArt, ctName, lvName, RKN, NAMES, newMatch, startHand, nextHand, startTutorial, endTutorial, loop, doAct, sched, unsched, selIds, U, levelLabel, showTab(pt) { set.mTab = pt; mTabs(); } };
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-csw]'); if (!b || !S) return; e.preventDefault(); const sc = document.querySelector('.stage'), st = sc ? sc.scrollTop : 0; set.coach = set.coach ? 0 : 1; save(); render(); toast(t('side.coach') + ' ' + (set.coach ? 'ON' : 'OFF')); if (sc) sc.scrollTop = st; });
})();
