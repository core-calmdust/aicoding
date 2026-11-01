/* バカラ — game controller (baccarat/app.js)
   One seat at a baccarat table against the house: bet on Player / Banker / Tie (and the side bets of the variant), the dealer
   deals by the tableau (engine.js). An 8-deck (or 6-deck) shoe with a cut card; the roads (roads.js) follow the shoe.
   Research: exact odds of the remaining shoe, coach, statistics (expected loss vs luck), tools.js · lessons.js · rules.js. */
(function () {
'use strict';
const B = window.BC, RD = window.BCRoads, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-baccarat', SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const FELTS = ['green', 'teal', 'blue', 'wine', 'charcoal', 'purple', 'mocha', 'linen'];
const BACKS = ['skullBlack', 'skull', 'gangsta', 'ornate', 'ornateBlack', 'floral', 'floralBlack', 'azure', 'azureBlack', 'hex', 'cube', 'red', 'blue', 'crimson', 'navy'];
const COURTS = ['gangsta', 'classic', 'antique', 'flat'];
const DECKS = [8, 6], TIES = [8, 9], START = 10000;
const DENOMS = [25, 100, 500, 1000, 5000], MIN_BET = 25;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => { const r = Math.round(n * 100) / 100; return (Number.isInteger(r) ? r : r.toFixed(2)).toLocaleString ? Number(r).toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(r); };
const sg = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n));
const pct = (x, d) => (x * 100).toFixed(d == null ? 2 : d) + '%';

/* ---------------- storage ---------------- */
function load() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
const D = load();
D.set = Object.assign({ v: 'classic', prefs: {}, felt: 'teal', back: 'ornateBlack', court: 'classic', cmode: 'simple', sound: true, anim: 1, speed: 'normal', coach: 1, squeeze: 0, autoNext: 0, chip: 100, lang: '' }, D.set || {});
D.stats = D.stats || {};
if (!D.set.th3) { if (D.set.felt === 'green' || D.set.felt === 'wine') D.set.felt = 'teal'; D.set.th3 = 1; }   // default table: teal (as the poker)
const set = D.set;
['felt', 'back', 'court', 'cmode'].forEach(k => { document.documentElement.dataset[k] = set[k]; });
document.documentElement.dataset.face = 'classic';
function save() { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} }   // (the tutorial table is never put in D.cur)
function prefOf(v) {
  const p = set.prefs[v] || (set.prefs[v] = {});
  if (!DECKS.includes(p.decks)) p.decks = 8;
  if (!TIES.includes(p.tie)) p.tie = 8;
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
  $('#brandTitle').textContent = t('title'); $('#brandSub').textContent = LANG === 'en' ? '' : 'Baccarat';
}

/* ---------------- sound ---------------- */
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
function chipSnd(a, t0, n) { for (let i = 0; i < n; i++) { const tt = t0 + i * .045 + Math.random() * .02; tone(a, tt, 2400 + Math.random() * 900, .06, .05, 'triangle'); noise(a, tt, .03, 5200, 2, .18); } }
const vary = () => .93 + Math.random() * .14;
function sfx(k) {
  if (!set.sound || document.hidden) return; const a = ac(); if (!a) return; loadSnd(a); const n = a.currentTime + .005;
  if (k === 'deal') { if (!play(a, 'draw', n, .8, vary())) noise(a, n, .05, 3600, 1.2, .3); }
  else if (k === 'flip') { if (!play(a, 'flip', n, .9, vary())) noise(a, n, .05, 3600, 1.2, .35); }
  else if (k === 'shuffle') { if (!play(a, 'shuffle', n, 1)) for (let i = 0; i < 9; i++) noise(a, n + i * .045, .06, 2600 + Math.random() * 800, .9, .35); }
  else if (k === 'chip') chipSnd(a, n, 1);
  else if (k === 'chips') chipSnd(a, n, 4);
  else if (k === 'bigchips') chipSnd(a, n, 9);
  else if (k === 'lose') { if (!play(a, 'place', n, .6, .8)) noise(a, n, .07, 2000, .9, .4); }
  else if (k === 'win') { if (!play(a, 'win', n, .9)) [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(a, n + i * .09, f, .8, .08, 'triangle')); }
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
  nb.forEach((n, i) => {
    const k = keyOf(n); let m = null;
    if (k) { m = keyed.get(k); if (m && (used.has(m) || !same(m, n))) m = null; }
    else { while (idx < old.length && (keyOf(old[idx]) || used.has(old[idx]))) idx++; if (idx < old.length && same(old[idx], n)) m = old[idx++]; }
    if (m) { used.add(m); morphNode(m, n); } else m = n;
    const at = a.childNodes[i]; if (at !== m) a.insertBefore(m, at || null);
  });
  [...a.childNodes].slice(nb.length).forEach(n => n.remove());
}
function patch(el, html) { const tm = document.createElement(el.tagName); tm.innerHTML = html; morphKids(el, tm); }

/* ---------------- chips (side view stacks on the layout, top view in the rack) ---------------- */
const CHIPS = [[5000, 'r'], [1000, 'y'], [500, 'p'], [100, 'k'], [25, 'g']];
const CHIPC = {   // body, darker body, edge inserts, inlay, text
  g: ['#1d8b52', '#0d4a2b', '#f7f1e3', '#eef3e6', '#167043'], k: ['#23262e', '#0b0c10', '#e8c66e', '#f1ede2', '#23262e'], p: ['#6f36b8', '#391a66', '#f7f1e3', '#f0e9f8', '#5b2a9c'],
  y: ['#d9a93a', '#7a5a12', '#2a1f08', '#fbf3dc', '#7a5a12'], r: ['#c8203a', '#7a0d1e', '#f7f1e3', '#f3e7d0', '#a3142b'],
};
const CHIPV = { g: '25', k: '100', p: '500', y: '1K', r: '5K' };
const denomKey = d => CHIPS.find(([v]) => v === d)[1];
function chipSvg(c, n) {
  const [body, dark, ins, inlay, txt] = CHIPC[c], W = 40, rx = 19, ry = 8.6, th = 5, cx = 20, base = 8 + (n - 1) * th + 2 * ry - ry + 1;
  const H = Math.ceil(base + ry + th + 2); let g = '';
  for (let k = 0; k < n; k++) {
    const y = base - k * th;
    g += `<path d="M${cx - rx} ${y}v${th}a${rx} ${ry} 0 0 0 ${2 * rx} 0v-${th}a${rx} ${ry} 0 0 1 -${2 * rx} 0z" fill="${dark}"/>`;
    g += `<path d="M${cx - rx} ${y}v${th}a${rx} ${ry} 0 0 0 ${2 * rx} 0v-${th}a${rx} ${ry} 0 0 1 -${2 * rx} 0z" fill="url(#chS)" opacity=".55"/>`;
    [25, 60, 95, 130, 165].forEach(a => { const r = a * Math.PI / 180, x = cx + rx * Math.cos(r), yy = y + ry * Math.sin(r), w = 2.4 * Math.sin(r) + .4; g += `<rect x="${(x - w / 2).toFixed(2)}" y="${(yy + .5).toFixed(2)}" width="${w.toFixed(2)}" height="${(th - 1).toFixed(2)}" fill="${ins}" opacity=".95"/>`; });
    g += `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${ry}" fill="${body}" stroke="${dark}" stroke-width=".6"/>`;
    if (k === n - 1) {
      for (let a = 0; a < 360; a += 45) { const r1 = (a - 6) * Math.PI / 180, r2 = (a + 6) * Math.PI / 180, P = (r, f) => `${(cx + rx * f * Math.cos(r)).toFixed(2)} ${(y + ry * f * Math.sin(r)).toFixed(2)}`; g += `<path d="M${P(r1, .97)}L${P(r2, .97)}L${P(r2, .76)}L${P(r1, .76)}z" fill="${ins}"/>`; }
      g += `<ellipse cx="${cx}" cy="${y}" rx="${rx * .62}" ry="${ry * .62}" fill="${inlay}" stroke="${dark}" stroke-width=".5"/>`;
      g += `<text x="${cx}" y="${y + 2.5}" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="800" font-size="${CHIPV[c].length > 2 ? 6 : 7.4}" fill="${txt}" transform="translate(0 ${y}) scale(1 .62) translate(0 -${y})">${CHIPV[c]}</text>`;
      g += `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#chF)"/>`;
    }
  }
  return `<svg class="chsv" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
function chipStack(amt) {
  let u = Math.round(amt); const stacks = [];
  for (const [v, c] of CHIPS) { const n = Math.floor(u / v); if (!n) continue; u -= n * v; stacks.push([c, Math.min(n, 6)]); if (stacks.length >= 3) break; }
  if (!stacks.length) stacks.push(['g', 1]);
  return `<span class="chs">${stacks.map(([c, n]) => chipSvg(c, n)).join('')}</span>`;
}
function chipTop(d, sel) {   // a chip seen from above (the rack)
  const c = denomKey(d), [body, dark, ins, inlay, txt] = CHIPC[c];
  let spots = ''; for (let a = 0; a < 360; a += 45) spots += `<rect x="22" y="1.5" width="6" height="7" rx="1" fill="${ins}" transform="rotate(${a} 25 25)"/>`;
  return `<svg viewBox="0 0 50 50" class="ctop${sel ? ' sel' : ''}"><circle cx="25" cy="25" r="24" fill="${body}" stroke="${dark}" stroke-width="1.5"/>${spots}<circle cx="25" cy="25" r="15.5" fill="${inlay}" stroke="${dark}" stroke-width="1"/><circle cx="25" cy="25" r="13" fill="none" stroke="${txt}" stroke-width=".7" stroke-dasharray="2 1.4"/><text x="25" y="29.5" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="800" font-size="${CHIPV[c].length > 2 ? 11 : 13}" fill="${txt}">${CHIPV[c]}</text><circle cx="25" cy="25" r="24" fill="url(#chF)"/></svg>`;
}

/* ---------------- game state ---------------- */
let T = null;   // the table: { v, decks, tie, shoe, res, bank, bets, last, phase, coup, show, hand, session }
const G = { timer: 0, undo: [], seq: 0, odds: null, oddsKey: '', note: null };
const mt = () => !set.anim ? 0 : set.speed === 'slow' ? 1.5 : set.speed === 'fast' ? .5 : 1;
function rnd() { return Math.random(); }
function freshShoe() { const s = B.newShoe(T.decks, rnd); T.shoe = s; T.res = []; T.evHist = []; G.odds = null; }
function newSession(v) {
  if (T && T.tut) restoreTut();
  recordSession();
  const p = prefOf(v); set.v = v;
  // your chips go with you from table to table; at zero you start again from START
  let bank = typeof D.chips === 'number' ? D.chips : START; if (bank < MIN_BET) bank = START;
  T = { v, decks: p.decks, tie: p.tie, bank, bets: {}, last: null, phase: 'bet', coup: null, show: null, hand: 0, res: [],
    session: { hands: 0, net: 0, wag: 0, exp: 0, start: Date.now(), buyin: bank, rebuys: 0, peak: bank, graph: [0] } };
  botsNewTable();
  freshShoe(); G.undo = []; G.note = { k: 'newShoe' };
  D.cur = T; save(); sfx('shuffle'); render();
}
/* the tutorial: one scripted coup on the real table (tutorial.js drives the steps); your chips, the bots and the saved table stay as they were */
function startTutorial() {
  clearTimeout(G.timer); if (T && T.tut) restoreTut(); recordSession();
  G.tutPrev = { cur: D.cur, chips: D.chips, bots: JSON.parse(JSON.stringify(D.bots || {})), set: { coach: set.coach, squeeze: set.squeeze, autoNext: set.autoNext } };
  set.coach = 1; set.autoNext = 0;
  T = { v: 'classic', decks: 8, tie: 8, bank: START, bets: {}, last: null, phase: 'bet', coup: null, show: null, hand: 0, res: [], tut: true,
    session: { hands: 0, net: 0, wag: 0, exp: 0, start: Date.now(), buyin: START, rebuys: 0, peak: START, graph: [0] } };
  freshShoe(); botsNewTable(); if (window.BacTut) BacTut.setup(T);
  G.undo = []; G.note = null; render();
  if (window.BacTut) BacTut.ev('start');
}
function restoreTut() {
  const p = G.tutPrev; G.tutPrev = null; if (window.BacTut) BacTut.hide();
  if (p) { D.chips = p.chips; D.bots = p.bots; Object.assign(set, p.set); D.cur = p.cur; save(); }
  T = null;
}
function endTutorial() {
  clearTimeout(G.timer); restoreTut();
  if (D.cur && D.cur.shoe && B.VARIANTS[D.cur.v]) { T = D.cur; if (!T.bots) botsNewTable(); if (T.phase === 'deal' || T.phase === 'squeeze') { T.phase = 'bet'; T.show = null; T.coup = null; } render(); }
  else newSession(set.v);
}
/* 勝敗記録 (shared/record.js): one entry per session — the net decides win / loss */
function recordSession() {
  if (!window.GameRecord || !T || T.tut || !T.session || !T.session.hands || T.session.recorded) return;
  const S = T.session; S.recorded = true;
  try { GameRecord.add({ mode: 'ai', res: S.net > 0 ? 'w' : S.net < 0 ? 'l' : 'd', opp: vName(T.v), key: T.v, why: t('grc.hands', { n: S.hands }) + ' · ' + t('ss.net') + ' ' + sg(S.net) }); } catch (e) {}
}
const betSum = b => Object.values(b || {}).reduce((a, x) => a + (x || 0), 0);
const VB = () => B.VARIANTS[T.v].bets;

/* odds of the remaining shoe (exact; cached per shoe position) */
function shoeOdds() {
  const key = T.v + ':' + T.tie + ':' + T.shoe.pos + ':' + T.shoe.cards.length;
  if (G.oddsKey !== key) { const R = B.odds(B.counts(T.shoe)); G.odds = { R, E: B.evs(R, T.v, { tie: T.tie }) }; G.oddsKey = key; }
  return G.odds;
}
let BASE = null;   // the full-shoe values (for "house edge")
function baseOdds(v, tie, decks) { const k = v + tie + decks; if (!BASE || BASE.k !== k) { const R = B.odds(B.fullCounts(decks)); BASE = { k, R, E: B.evs(R, v, { tie }) }; } return BASE; }

/* ---------------- betting ---------------- */
function placeBet(k) {
  if (!T || T.phase !== 'bet') return;
  if (T.phase === 'bet' && T.show) clearCoup();
  const d = set.chip, have = T.bank - betSum(T.bets);
  if (have < d) { toast(t('toast.noMoney')); sfx('bad'); return; }
  if (T.tut && window.BacTut && !BacTut.allow({ a: 'bet', k })) return;
  T.bets[k] = (T.bets[k] || 0) + d; G.undo.push([k, d]); sfx('chip'); G.note = null; render();
  if (T.tut && window.BacTut) BacTut.after('bet');
}
function unplace() { const u = G.undo.pop(); if (!u) return; const [k, d] = u; T.bets[k] -= d; if (T.bets[k] <= 0) delete T.bets[k]; sfx('chip'); render(); }
function clearBets() { T.bets = {}; G.undo = []; render(); }
function rebet(mult) {
  const src = mult === 2 && betSum(T.bets) ? Object.assign({}, T.bets) : T.last; if (!src) return;
  const nb = {}; for (const k in src) if (VB().includes(k)) nb[k] = src[k] * (mult || 1);
  if (betSum(nb) > T.bank) { toast(t('toast.noMoney')); sfx('bad'); return; }
  if (T.show) clearCoup();
  T.bets = nb; G.undo = Object.entries(nb).map(([k, a]) => [k, a]); sfx('chips'); render();
}
function clearCoup() { T.coup = null; T.show = null; }

/* ---------------- dealing ---------------- */
// events in the order the dealer turns them: P1 B1 P2 B2 (P3) (B3)
function events(c) { const e = [['p', 0], ['b', 0], ['p', 1], ['b', 1]]; if (c.p[2] != null) e.push(['p', 2]); if (c.b[2] != null) e.push(['b', 2]); return e; }
function deal() {
  if (!T || T.phase !== 'bet') return;
  const tot = betSum(T.bets);
  if (tot < MIN_BET) { toast(t('toast.minBet', { n: MIN_BET })); return; }
  if (tot > T.bank) { toast(t('toast.noMoney')); return; }
  if (T.tut && window.BacTut && !BacTut.allow({ a: 'deal' })) return;
  if (T.shoe.pos + 6 > T.shoe.cards.length) freshShoe();
  T.bank -= tot; T.last = Object.assign({}, T.bets); G.undo = [];
  const c = B.coup(() => T.shoe.cards[T.shoe.pos++]);
  T.coup = c; T.hand++;
  // squeeze: the side of your biggest main bet is dealt face down — you turn its cards yourself
  const sq = set.squeeze && !T.tut && (T.bets.P || T.bets.B) ? ((T.bets.P || 0) > (T.bets.B || 0) ? 'p' : 'b') : null;
  T.show = { n: 0, sq, peel: {}, ev: events(c) };
  T.phase = 'deal'; G.note = null; render(); step();
}
// turn the next card; wait for the squeeze where needed
function step() {
  clearTimeout(G.timer);
  const S = T.show; if (!S) return;
  const pending = () => S.ev.slice(0, S.n).some(([s, i]) => s === S.sq && !S.peel[s + i]);
  if (S.n < S.ev.length) {
    // the third cards come only after the first four are open
    if (S.n === 4 && pending()) { T.phase = 'squeeze'; render(); return; }
    S.n++; sfx('deal'); render();
    const delay = Math.round((S.n <= 4 ? 420 : 900) * mt()) || 30;
    G.timer = setTimeout(step, delay); return;
  }
  if (pending()) { T.phase = 'squeeze'; render(); return; }
  finish();
}
function reveal(side, i) { const S = T.show; if (!S || S.peel[side + i]) return; S.peel[side + i] = 1; sfx('flip'); render(); if (T.phase === 'squeeze') { T.phase = 'deal'; G.timer = setTimeout(step, 380); } }
function revealAll() { const S = T.show; if (!S) return; S.ev.slice(0, S.n).forEach(([s, i]) => { if (s === S.sq) S.peel[s + i] = 1; }); sfx('flip'); if (T.phase === 'squeeze') { T.phase = 'deal'; render(); G.timer = setTimeout(step, 380); } }
function finish() {
  const c = T.coup, r = B.settle(c, T.v, T.bets, { tie: T.tie }), tot = betSum(T.bets);
  T.bank = Math.round((T.bank + r.back) * 100) / 100;
  const base = baseOdds(T.v, T.tie, T.decks);
  const exp = Object.entries(T.bets).reduce((a, [k, x]) => a + x * base.E[k], 0);
  const S = T.session; S.hands++; S.net = Math.round((S.net + r.net) * 100) / 100; S.wag += tot; S.exp += exp; S.peak = Math.max(S.peak, T.bank);
  S.graph.push(S.net); if (S.graph.length > 400) S.graph = S.graph.filter((_, i) => i % 2 === 0);
  const res = { w: c.win, pp: B.RANK(c.p[0]) === B.RANK(c.p[1]) ? 1 : 0, bp: B.RANK(c.b[0]) === B.RANK(c.b[1]) ? 1 : 0, pt: c.pt, bt: c.bt, nat: c.natural ? 1 : 0, n3p: c.p.length, n3b: c.b.length };
  T.res.push(res); T.shoe.n++;
  { const E = shoeOdds().E; (T.evHist || (T.evHist = [])).push({ B: E.B, P: E.P, T: E.T }); }   // the expectation of the shoe after each coup (研究)
  if (!T.tut) recordStats(c, r, tot, exp, res);
  T.result = r; T.phase = 'done'; T.bets = {};
  T.lastCoup = { tot, net: r.net, exp: -exp };
  sfx(r.net > 0 ? (r.net >= 1000 ? 'bigchips' : 'win') : r.net < 0 ? 'lose' : 'chips');
  settleBots(c);
  if (T.bank < MIN_BET) { T.bank = START; S.rebuys++; toast(t('toast.rebuy', { n: fmt(START) })); }
  if (!T.tut) D.chips = T.bank;
  const cutOut = T.shoe.pos >= T.shoe.cut;
  G.note = { k: 'result', cut: cutOut };
  save(); render();
  if (T.tut && window.BacTut) { setTimeout(() => BacTut.ev('done'), Math.round(900 * (mt() || .5))); return; }
  if (set.autoNext) G.timer = setTimeout(nextCoup, Math.round(2600 * (mt() || .4)));
}
function nextCoup() {
  clearTimeout(G.timer); if (!T || T.phase !== 'done') return;
  clearCoup(); T.result = null; T.phase = 'bet';
  if (T.shoe.pos >= T.shoe.cut) { freshShoe(); G.note = { k: 'newShoe' }; sfx('shuffle'); toast(t('toast.newShoe')); }
  botsBet();
  save(); render();
}

/* ---------------- the other players at the table (bots) ----------------
   Four regulars with their own habits — each one shows a way people really bet (and what it does to their chips). */
const BOTS = [
  { id: 'lin', name: 'Lin', av: 1, seat: 6, style: 'banker' },    // always Banker, flat bets: the "correct" way
  { id: 'marco', name: 'Marco', av: 2, seat: 5, style: 'martin' }, // Martingale on Player: doubles after every loss
  { id: 'aiko', name: 'Aiko', av: 3, seat: 2, style: 'trend' },    // reads the road: follows the last winner
  { id: 'sam', name: 'Sam', av: 4, seat: 1, style: 'fun' },        // likes the long shots: Tie, pairs, side bets
];
const BOT_START = { lin: 20000, marco: 10000, aiko: 15000, sam: 8000 };
function botState(b) { D.bots = D.bots || {}; const s = D.bots[b.id] || (D.bots[b.id] = { bank: BOT_START[b.id], unit: 1 }); if (s.bank < MIN_BET) { s.bank = BOT_START[b.id]; s.unit = 1; } return s; }
function botsNewTable() { T.bots = {}; BOTS.forEach(b => { botState(b); T.bots[b.id] = { bets: {}, res: null }; }); botsBet(); }
const r25 = x => Math.max(25, Math.round(x / 25) * 25);
function botsBet() {
  if (!T.bots) T.bots = {};
  const vb = VB(), nt = T.res.filter(r => r.w !== 'T'), last = nt.length ? nt[nt.length - 1].w : null;
  BOTS.forEach(b => {
    const s = botState(b), tb = T.bots[b.id] || (T.bots[b.id] = {}); tb.res = null; const bets = {};
    const cap = x => Math.min(r25(x), Math.floor(s.bank / 25) * 25);
    if (b.style === 'banker') bets.B = cap(s.bank >= 10000 ? 500 : 200);
    else if (b.style === 'martin') bets.P = cap(100 * s.unit);
    else if (b.style === 'trend') { const st = RD.streaks(T.res); bets[last || 'B'] = cap(st.cur >= 3 ? 500 : 300); }
    else {
      const R = Math.random; bets[R() < .5 ? 'P' : 'B'] = cap(100);
      if (R() < .55) bets.T = 25;
      if (R() < .35) bets[R() < .5 ? 'PP' : 'BP'] = 25;
      if (vb.includes('D7') && R() < .4) bets[R() < .5 ? 'D7' : 'P8'] = 25;
    }
    for (const k in bets) if (!vb.includes(k) || !(bets[k] > 0)) delete bets[k];
    let tot = Object.values(bets).reduce((a, x) => a + x, 0); if (tot > s.bank) { for (const k in bets) if (k !== 'P' && k !== 'B') delete bets[k]; }
    tb.bets = bets;
  });
}
function settleBots(c) {
  if (!T.bots) return;
  BOTS.forEach(b => {
    const s = botState(b), tb = T.bots[b.id]; if (!tb || !tb.bets) return;
    const r = B.settle(c, T.v, tb.bets, { tie: T.tie }); s.bank = Math.round((s.bank + r.net) * 100) / 100; tb.res = r;
    if (b.style === 'martin' && tb.bets.P) s.unit = r.per.P < 0 ? Math.min(s.unit * 2, 512) : r.per.P > 0 ? 1 : s.unit;
  });
}

/* ---------------- statistics ---------------- */
function statOf(v) { return D.stats[v] || (D.stats[v] = {}); }
function recordStats(c, r, tot, exp, res) {
  const S = statOf(T.v);
  S.hands = (S.hands || 0) + 1; S.net = Math.round(((S.net || 0) + r.net) * 100) / 100; S.wag = (S.wag || 0) + tot; S.exp = (S.exp || 0) + exp;
  S.w = S.w || { P: 0, B: 0, T: 0 }; S.w[c.win]++;
  S.nat = (S.nat || 0) + (c.natural ? 1 : 0);
  S.pairs = (S.pairs || 0) + (res.pp || res.bp ? 1 : 0);
  S.bets = S.bets || {};
  for (const k in r.per) { const b = S.bets[k] || (S.bets[k] = { n: 0, won: 0, push: 0, net: 0, amt: 0 }); b.n++; b.amt += T.last[k] || 0; b.net = Math.round((b.net + r.per[k]) * 100) / 100; if (r.per[k] > 0) b.won++; else if (r.per[k] === 0) b.push++; }
  // streaks of the same side (ties ignored)
  if (c.win !== 'T') { S.run = S.runW === c.win ? (S.run || 0) + 1 : 1; S.runW = c.win; S.best = Math.max(S.best || 0, S.run); }
  S.graph = S.graph || [0]; S.graph.push(S.net); if (S.graph.length > 300) S.graph = S.graph.filter((_, i) => i % 2 === 0);
}

/* ---------------- rendering: the table ---------------- */
const SPOTS = { P: 'spot.P', B: 'spot.B', T: 'spot.T', PP: 'spot.PP', BP: 'spot.BP', D7: 'spot.D7', P8: 'spot.P8' };
function payTxt(k) {
  if (k === 'P') return '1 : 1';
  if (k === 'B') return T.v === 'classic' ? '0.95 : 1' : T.v === 'nocomm' ? t('pay.b6') : t('pay.b7');
  if (k === 'T') return T.tie + ' : 1';
  if (k === 'PP' || k === 'BP') return '11 : 1';
  if (k === 'D7') return '40 : 1'; if (k === 'P8') return '25 : 1';
}
function handHtml(side) {
  const c = T.coup, S = T.show; if (!c || !S) return `<div class="bc-cards"></div>`;
  const shown = S.ev.slice(0, S.n).filter(([s]) => s === side).map(([, i]) => i);
  const cards = shown.map(i => {
    const id = c[side][i], down = S.sq === side && !S.peel[side + i];
    const cls = (i === 2 ? 'third' : '') + (down ? ' sqz' : '');
    const card = Cards.html(id, { cls }).replace('<span class="cd', `<span data-k="${side}${i}-${T.hand}" data-s="${side}" data-i="${i}" class="cd`);
    return down ? card.replace('</span></span>', `</span><span class="cov"><span class="bk"></span></span></span>`) : card;
  }).join('');
  return `<div class="bc-cards">${cards}</div>`;
}
function visTotal(side) {
  const c = T.coup, S = T.show; if (!c || !S) return null;
  const cs = S.ev.slice(0, S.n).filter(([s]) => s === side).map(([, i]) => i);
  if (!cs.length) return null;
  if (S.sq === side && cs.some(i => !S.peel[side + i])) return null;
  return B.total(cs.map(i => c[side][i]));
}
/* phones: still a baccarat table, but drawn for the thumb — the shared bands PLAYER / BANKER / TIE run across the whole width
   (one big target each), the five seats sit on the rim (6 5 YOU 2 1), and every player's chips lie on the bands at their seat.
   The pairs (and the EZ side bets) are round spots in the corners. */
const MG = { cx: 500, cy: -250, span: 40, R: { plate: [700, 786], P: [565, 700], B: [430, 565], T: [345, 430], S: [265, 345] } };
function mobGeo() {
  const ez = VB().includes('D7'), rIn = ez ? MG.R.S[0] : MG.R.T[0];
  const top = Math.floor(MG.cy + rIn * Math.cos(MG.span * Math.PI / 180) - 14), bot = Math.ceil(MG.cy + MG.R.plate[1] + 8);
  return { ez, rIn, top: Math.min(top, -10), h: bot - Math.min(top, -10) };
}
function layMobHtml() {
  const vb = VB(), done = T.phase === 'done', G0 = mobGeo(), { cx, cy, span, R } = MG;
  const P2 = (r, a) => [cx + r * Math.sin(a * Math.PI / 180), cy + r * Math.cos(a * Math.PI / 180)].map(v => +v.toFixed(1));
  const cell = (r1, r2, a0, a1) => { const [x1, y1] = P2(r2, a0), [x2, y2] = P2(r2, a1), [x3, y3] = P2(r1, a1), [x4, y4] = P2(r1, a0); return `M${x1} ${y1}A${r2} ${r2} 0 0 0 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 1 ${x4} ${y4}Z`; };
  const arc = (r, a0, a1) => { const [x1, y1] = P2(r, a0), [x2, y2] = P2(r, a1); return `M${x1} ${y1}A${r} ${r} 0 0 0 ${x2} ${y2}`; };
  // seats on the rim (angles grow to the right): 6 5 | 3 YOU | 2 1
  const W8 = [1, 1, 1.7, 1, 1], tot = W8.reduce((x, y) => x + y, 0); let acc = -span;
  const seats = [6, 5, 3, 2, 1].map((n, i) => { const a0 = acc; acc += W8[i] / tot * 2 * span; return { n, a0, a1: acc, am: (a0 + acc) / 2 }; });
  const meBets = T.phase === 'bet' ? T.bets : T.last || {}, meRes = done && T.result ? T.result.per : null;
  const who = n => n === ME ? null : BOTS.find(b => b.seat === n);
  const betsOf = n => n === ME ? meBets : ((T.bots && T.bots[who(n).id] && T.bots[who(n).id].bets) || {});
  let g = '';
  // the bands
  const bands = [['P', R.P], ['B', R.B], ['T', R.T]].concat(G0.ez ? [['P8', [R.S[0], R.S[1]], 0], ['D7', [R.S[0], R.S[1]], 1]] : []);
  bands.forEach(([k, [r1, r2], half]) => {
    const a0 = half === undefined ? -span : half ? 0 : -span, a1 = half === undefined ? span : half ? span : 0, rm = (r1 + r2) / 2, h = r2 - r1;
    const rr = meRes ? meRes[k] : undefined, st = rr === undefined ? '' : rr > 0 ? ' won' : rr < 0 ? ' lost' : ' push';
    const id = 'mz' + k, am = (a0 + a1) / 2, lab = LAB[k], fs = half !== undefined ? 28 : k === 'T' ? 40 : 66;
    g += `<g class="lz mz lz-${k}${st}${meBets[k] ? ' has' : ''}" data-spot="${k}" data-k="${id}"><path class="lz-a" d="${cell(r1, r2, a0, a1)}"/>` +
      `<path id="${id}" d="${arc(rm + h * (half === undefined && k !== 'T' ? .06 : .02), a0, a1)}" fill="none"/><text class="lz-n" style="font-size:${fs}px"><textPath href="#${id}" startOffset="50%">${lab}</textPath></text>` +
      `<path id="${id}p" d="${arc(rm + h * (half === undefined && k !== 'T' ? .36 : .38), a0, a1)}" fill="none"/><text class="mz-p"><textPath href="#${id}p" startOffset="50%">${esc(payTxt(k).replace(/ \(.*$/, '').replace(/（.*$/, ''))}</textPath></text>`;
    // everybody's chips on this band, at their seat
    seats.forEach(sx => { const amt = betsOf(sx.n)[k]; if (!amt) return; const a = half === undefined ? sx.am : am + (sx.am / span) * (a1 - a0) / 2 * .8, [x, y] = P2(rm, a), me = sx.n === ME;
      const [xu, yu] = P2(r1 + h * .18, a); if (me) { const [xa, ya] = P2(rm, a - 8), [xb, yb] = P2(rm, a + 9.5); g += `<g class="lz-ch">${chipsAt(amt, xa, ya + h * .28, 96)}</g>` + badge(xb, yb, fmt(amt), 'amt mz-b mz-me'); } else g += `<g class="lz-ch bot">${chipsAt(amt, xu, yu + 14, 58)}</g>`; });
    if (rr !== undefined && meBets[k]) { const [x, y] = P2(rm, half === undefined ? span * .55 : am + (a1 - a0) * .3); g += badge(x, y, rr > 0 ? '+' + fmt(rr) : rr === 0 ? t('res.push') : '−' + fmt(-rr), 'res mz-b'); }
    g += `</g>`;
  });
  // the pairs: round spots in the upper corners
  [['PP', 92, 0], ['BP', 908, 1]].filter(([k]) => vb.includes(k)).forEach(([k, x]) => {
    const y = G0.top + 92, rr = meRes ? meRes[k] : undefined, st = rr === undefined ? '' : rr > 0 ? ' won' : rr < 0 ? ' lost' : ' push';
    const ws = seats.filter(sx => betsOf(sx.n)[k]);
    g += `<g class="lz mz lz-s lz-${k}${st}${meBets[k] ? ' has' : ''}" data-spot="${k}" data-k="mz${k}"><circle class="lz-a" cx="${x}" cy="${y}" r="78"/><circle class="lz-ring" cx="${x}" cy="${y}" r="68"/>` +
      `<text class="lz-sn mz-sn" x="${x}" y="${y - 4}">${LAB[k]}</text><text class="lz-sp mz-sp" x="${x}" y="${y + 30}">11 : 1</text>` +
      ws.map((sx, i) => sx.n === ME ? `<g class="lz-ch">${chipsAt(betsOf(ME)[k], x, y + 74, 80)}</g>` + badge(x, y + 96, fmt(betsOf(ME)[k]), 'amt mz-b mz-me') : `<g class="mz-av"><circle cx="${x + (k === 'PP' ? 1 : -1) * (40 + i * 30)}" cy="${y - 64}" r="17"/><text x="${x + (k === 'PP' ? 1 : -1) * (40 + i * 30)}" y="${y - 57}">${who(sx.n).name[0]}</text></g>`).join('') +
      (rr !== undefined && meBets[k] ? badge(x, y - 92, rr > 0 ? '+' + fmt(rr) : '−' + fmt(-rr), 'res mz-b') : '') + `</g>`;
  });
  // the seats (name plates on the rim)
  let lines = '';
  seats.forEach((sx, i) => {
    const me = sx.n === ME, b = who(sx.n), tb = b && T.bots ? T.bots[b.id] : null, [p1, p2] = R.plate, pid = 'mp' + sx.n;
    const net = me ? (done && T.result && betSum(T.last) ? T.result.net : null) : done && tb && tb.res ? tb.res.net : null;
    g += `<g class="seat-g${me ? ' me' : ''}"><path class="pl-a" d="${cell(p1, p2, sx.a0, sx.a1)}"/><path id="${pid}" d="${arc((p1 + p2) / 2 + 12, sx.a0, sx.a1)}" fill="none"/>` +
      `<text class="pl-t mz-pl"><textPath href="#${pid}" startOffset="50%">${me ? `<tspan class="pl-n">3</tspan> YOU` : `<tspan class="pl-n">${sx.n}</tspan> ${esc(b.name)}`}${net ? ` <tspan class="${net > 0 ? 'pl-w' : 'pl-l'}">${net > 0 ? '+' : '−'}${fmt(Math.abs(net))}</tspan>` : me ? '' : ` <tspan class="pl-b">${fmt(botState(b).bank)}</tspan>`}</textPath></text></g>`;
    if (i) { const [x1, y1] = P2(G0.rIn, sx.a0), [x2, y2] = P2(p2, sx.a0); lines += `<line class="lz-div mz-div" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }
  });
  const rim = `<path class="lz-rim" d="${arc(R.plate[1], -span, span)}"/><path class="lz-rim" d="${arc(G0.rIn, -span, span)}"/>`;
  return `<div class="bc-lay" data-k="laym"><svg class="lz-svg mzs" viewBox="0 ${G0.top} 1000 ${G0.h}" preserveAspectRatio="xMidYMax meet">${g}${lines}${rim}</svg></div>`;
}

/* the layout: a baccarat-table print — five seats (1 2 3 5 6, no 4) along the curve, divided by lines.
   Each seat, from the rim inwards: name plate, PLAYER, BANKER, TIE, then the side bets. You sit in the middle (seat 3). */
let LW = 1000, SPAN = 40, MEW = 1.6;
let LH = 420, LCY = -360;
const LP = (r, a) => [LW / 2 + r * Math.sin(a * Math.PI / 180), LCY + r * Math.cos(a * Math.PI / 180)].map(v => +v.toFixed(1));
const RING_W = { plate: [690, 745], P: [605, 690], B: [520, 605], T: [470, 520], S1: [420, 470], S2: [370, 420] };
const RING_N = { plate: [474, 534], P: [382, 474], B: [290, 382], T: [240, 290], S1: [190, 240], S2: [140, 190] };   // phones: a deeper curve, bigger cells
let RING = RING_W;
const SEATS = [6, 5, 3, 2, 1], ME = 3;
const LAB = { P: 'PLAYER', B: 'BANKER', T: 'TIE', PP: 'P PAIR', BP: 'B PAIR', D7: 'DRAGON 7', P8: 'PANDA 8' };
function seatAngles() { const w = SEATS.map(n => n === ME ? MEW : 1), tot = w.reduce((a, b) => a + b, 0); let a = -SPAN; return SEATS.map((n, i) => { const a0 = a; a += w[i] / tot * 2 * SPAN; return [n, a0, a]; }); }
function cellPath(r1, r2, a0, a1) { const [x1, y1] = LP(r2, a0), [x2, y2] = LP(r2, a1), [x3, y3] = LP(r1, a1), [x4, y4] = LP(r1, a0); return `M${x1} ${y1}A${r2} ${r2} 0 0 0 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 1 ${x4} ${y4}Z`; }
function arcPath(r, a0, a1) { const [x1, y1] = LP(r, a0), [x2, y2] = LP(r, a1); return `M${x1} ${y1}A${r} ${r} 0 0 0 ${x2} ${y2}`; }
function chipsAt(amt, x, yb, w) {   // chip stacks (side view) standing on y = yb, centred on x
  let u = Math.round(amt); const st = [];
  for (const [v, c] of CHIPS) { const n = Math.floor(u / v); if (!n) continue; u -= n * v; st.push([c, Math.min(n, 5)]); if (st.length >= 3) break; }
  if (!st.length) st.push(['g', 1]);
  const gap = w * .86, x0 = x - (st.length - 1) * gap / 2;
  return st.map(([c, n], i) => { const sv = chipSvg(c, n), H = +sv.match(/viewBox="0 0 40 ([\d.]+)"/)[1], h = w * H / 40;
    return sv.replace('<svg class="chsv"', `<svg class="chsv" x="${(x0 + i * gap - w / 2).toFixed(1)}" y="${(yb - h).toFixed(1)}" width="${w}" height="${h.toFixed(1)}"`); }).join('');
}
const resTxt = res => res > 0 ? '+' + fmt(res) : res === 0 ? t('res.push') : '−' + fmt(-res);
function badge(x, y, txt, cls) { const huge = /mz-me/.test(cls), big = /mz-b/.test(cls), w = (huge ? 48 : big ? 28 : 16) + String(txt).length * (huge ? 32 : big ? 22 : 11); return `<g class="lz-badge ${cls}"><rect x="${(x - w / 2).toFixed(1)}" y="${(y - (huge ? 28 : big ? 21 : 13)).toFixed(1)}" width="${w}" height="${huge ? 54 : big ? 40 : 24}" rx="${huge ? 27 : big ? 20 : 12}"/><text x="${x}" y="${(y + (huge ? 13 : big ? 9 : 4.5)).toFixed(1)}"${huge || big ? ` textLength="${(w - (huge ? 34 : 20)).toFixed(0)}" lengthAdjust="spacingAndGlyphs"` : ''}>${esc(txt)}</text></g>`; }
function layHtml() {
  const vb = VB(), done = T.phase === 'done', narrow = !!G.deep;
  LW = narrow ? 1000 : 1180; SPAN = narrow ? 66 : 51; MEW = narrow ? 2 : 1.5; RING = narrow ? RING_N : RING_W; LCY = narrow ? -10 : -360; LH = narrow ? 540 : 420;
  const rings = [['P', ['P']], ['B', ['B']], ['T', ['T']], ['S1', ['PP', 'BP']]].concat(vb.includes('D7') ? [['S2', ['P8', 'D7']]] : []);
  const inner = RING[rings[rings.length - 1][0]][0];
  let g = '', lines = '';
  seatAngles().forEach(([n, a0, a1], si) => {
    const me = n === ME, bot = BOTS.find(x => x.seat === n), tb = bot && T.bots ? T.bots[bot.id] : null;
    const bets = me ? (T.phase === 'bet' ? T.bets : done ? T.last || {} : T.last || {}) : (tb ? tb.bets : {}) || {};
    const res = me ? (done && T.result ? T.result.per : null) : (done && tb && tb.res ? tb.res.per : null);
    g += `<g class="seat-g${me ? ' me' : ''}" data-k="seat${n}">`;
    rings.forEach(([rk, ks]) => {
      const [r1, r2] = RING[rk];
      ks.forEach((k, j) => {
        const b0 = a0 + (a1 - a0) * j / ks.length, b1 = a0 + (a1 - a0) * (j + 1) / ks.length, am = (b0 + b1) / 2, rm = (r1 + r2) / 2, h = r2 - r1;
        const amt = bets[k] || 0, rr = res ? res[k] : undefined;
        const st = rr === undefined ? '' : rr > 0 ? ' won' : rr < 0 ? ' lost' : ' push';
        const id = `lz${n}${k}`, small = ks.length > 1, fs = small ? (me ? 15 : 12) : rk === 'T' ? (me ? 18 : 14) : (me ? 26 : 17);
        g += `<g class="lz lz-${k}${st}${amt ? ' has' : ''}${me ? '' : ' bot'}"${me ? ` data-spot="${k}"` : ''} data-k="${id}"><path class="lz-a" d="${cellPath(r1, r2, b0, b1)}"/>` +
          `<path id="${id}" d="${arcPath(rm + fs * .35 + (me && !small && rk !== 'T' ? 10 : 0), b0, b1)}" fill="none" stroke="none"/><text class="lz-n" style="font-size:${fs}px"><textPath href="#${id}" startOffset="50%">${me ? LAB[k] : LAB[k].replace(' 7', '').replace(' 8', '')}</textPath></text>`;
        if (me && !small) g += `<path id="${id}p" d="${arcPath(rm - h * .28 + (rk === 'T' ? 3 : 0), b0, b1)}" fill="none" stroke="none"/><text class="lz-p" style="font-size:${rk === 'T' ? 12 : 15}px"><textPath href="#${id}p" startOffset="50%">${esc(payTxt(k).replace(/ \(.*$/, ''))}</textPath></text>`;
        if (amt) { const [x, y] = LP(rm, am), w = small || rk === 'T' ? 22 : me ? 34 : 26; g += `<g class="lz-ch">${chipsAt(amt, x, y + h * .32, w)}</g>` + (me ? badge(x, y + h * .32 + 6, fmt(amt), 'amt') : ''); }
        g += `</g>`;
      });
    });
    // the name plate on the rim
    const [p1, p2] = RING.plate, pid = `pl${n}`, net = me ? (done && T.result && betSum(T.last) ? T.result.net : null) : tb && tb.res ? tb.res.net : null;
    const name = me ? 'YOU' : bot ? bot.name : '';
    const bank = me ? '' : bot ? fmt(botState(bot).bank) : '';
    g += `<path class="pl-a" d="${cellPath(p1, p2, a0, a1)}"/><path id="${pid}" d="${arcPath((p1 + p2) / 2 + 6, a0, a1)}" fill="none" stroke="none"/>` +
      `<text class="pl-t"><textPath href="#${pid}" startOffset="50%"><tspan class="pl-n">${n}</tspan>  ${esc(name)}${bank ? `  <tspan class="pl-b">${bank}</tspan>` : ''}${done && net ? `  <tspan class="${net > 0 ? 'pl-w' : 'pl-l'}">${net > 0 ? '+' : '−'}${fmt(Math.abs(net))}</tspan>` : ''}</textPath></text></g>`;
    if (si) { const [x1, y1] = LP(inner, a0), [x2, y2] = LP(p2, a0); lines += `<line class="lz-div" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }
  });
  const rim = `<path class="lz-rim" d="${arcPath(RING.plate[1], -SPAN, SPAN)}"/><path class="lz-rim" d="${arcPath(inner, -SPAN, SPAN)}"/>`;
  return `<div class="bc-lay" data-k="lay"><svg class="lz-svg" viewBox="0 0 ${LW} ${LH}" preserveAspectRatio="xMidYMax meet">${narrow ? "" : `<text class="lz-crest" x="${LW / 2}" y="${LCY + inner - 22}">TIE PAYS ${T.tie} TO 1</text>`}${g}${lines}${rim}</svg></div>`;
}
function render() {
  if (!T) return;
  const box = $('#bcTable'), W = box.clientWidth, H = box.clientHeight;
  const narrow = W < 560, bw = $('#boardWrap');
  // PC (table + right column): the table keeps the window's height and the content is centred.
  // Elsewhere (the info below the table): the table is only as tall as it needs (no empty felt).
  const pcCol = matchMedia('(hover:hover) and (pointer:fine) and (min-width:1040px) and (min-aspect-ratio:3/4)').matches;
  if (pcCol && bw.style.maxHeight) bw.style.maxHeight = '';
  const rail = (bw.offsetHeight - H) / 2, sc = $('.stage');
  // the height the table could have: on phones / tablets the chips and the Deal button must stay on the screen without scrolling
  const Hn = pcCol ? H : Math.min(innerWidth * 1.35, 640, Math.max(260, (sc ? sc.clientHeight : innerHeight) - (G.abH = Math.max(140, $('#actbar').offsetHeight)) - 22)) - 2 * rail;
  G.deep = narrow || (pcCol && H > W * .7);
  G.mob = narrow;   // phones: a touch layout (the other players in a strip, big betting boxes) instead of the printed arcs
  const lzh = G.mob ? (W - 8) * mobGeo().h / 1000 : (W - 24) * (G.deep ? 540 / 1000 : 420 / 1180), lz = G.mob ? Math.min(lzh, Hn * .5) : Math.min(lzh, Hn * .6);
  // the two hands side by side, or (tall tables) one above the other with bigger cards
  const cwS = G.mob ? Math.min(W / 5.5, (Hn - lz) / 2.55) : Math.min(W / (narrow ? 8.1 : 8.6), (Hn - lz) / 3.2), cwT = Math.min(W / (narrow ? 6.6 : 5.7), (Hn - lz) / 4.8);
  const stack = cwT > cwS * 1.12, cw = Math.max(34, Math.min(stack ? cwT : cwS, 124));
  bw.style.setProperty('--cw', cw + 'px'); bw.style.setProperty('--chh', cw * 1.4 + 'px');
  box.classList.toggle('ctr', pcCol); box.classList.toggle('mob', !!G.mob); box.classList.toggle('stk', stack); box.style.setProperty('--lzh', lz + 'px');
  if (!pcCol) { const need = Math.ceil(cw * ((stack ? 3.4 + .4 : G.mob ? 1.85 : 2.12) + .38 + .62) + lz + 2 * rail + 8 + (G.mob ? 16 : 0));
    const mh = parseFloat(bw.style.maxHeight) || 0; if (Math.abs(mh - need) > 2) bw.style.maxHeight = need + 'px'; }
  const c = T.coup, done = T.phase === 'done', win = done ? c.win : null;
  const pt = visTotal('p'), bt = visTotal('b');
  const tag = (side, tot) => tot == null ? '' : `<span class="bc-tot${done && win === side.toUpperCase() ? ' win' : ''}${c && c.natural && done && (side === 'p' ? c.pt : c.bt) >= 8 ? ' nat' : ''}">${tot}</span>`;
  const pair = (side) => done && c && B.RANK(c[side][0]) === B.RANK(c[side][1]) ? `<em class="bc-pair">${esc(t('pair'))}</em>` : '';
  let banner = '';
  if (done) {
    const r = T.result, hadBet = betSum(T.last) > 0;
    const head = win === 'T' ? t('win.T', { n: c.pt }) : t('win.' + win, { a: win === 'P' ? c.pt : c.bt, b: win === 'P' ? c.bt : c.pt });
    banner = `<div class="bc-banner w${win}" data-k="banner${T.hand}"><b>${esc(head)}</b>${c.natural ? `<small>${esc(t('natural'))}</small>` : ''}${hadBet ? `<span class="${r.net > 0 ? 'pos' : r.net < 0 ? 'neg' : ''}">${esc(r.net > 0 ? t('res.win', { n: fmt(r.net) }) : r.net < 0 ? t('res.lose', { n: fmt(-r.net) }) : t('res.even'))}</span>` : ''}</div>`;
  }
  const lay = G.mob ? layMobHtml() : layHtml();
  const shoeLeft = T.shoe.cards.length - T.shoe.pos, shoePct = shoeLeft / T.shoe.cards.length;
  const h = `<div class="bc-hands" data-k="hands">` +
    `<div class="bc-hand bh-p${win === 'P' ? ' win' : ''}" data-k="hp"><div class="bc-hh"><span>PLAYER</span>${tag('p', pt)}${pair('p')}</div>${handHtml('p')}</div>` +
    `<div class="bc-hand bh-b${win === 'B' ? ' win' : ''}" data-k="hb"><div class="bc-hh"><span>BANKER</span>${tag('b', bt)}${pair('b')}</div>${handHtml('b')}</div>` +
    `</div><div class="bc-mid" data-k="mid">${banner}</div>${lay}` +
    `<div class="bc-shoe" data-k="shoe" title="${esc(t('shoe.left', { n: shoeLeft }))}"><span class="bc-shoe-box"><i style="height:${(shoePct * 100).toFixed(1)}%"></i><em class="cut" style="bottom:${((T.shoe.cards.length - T.shoe.cut) / T.shoe.cards.length * 100).toFixed(1)}%"></em></span><small><i>SHOE</i>${shoeLeft}</small></div>`;
  patch(box, h);
  box.querySelectorAll('[data-spot]').forEach(el => { el.onclick = () => placeBet(el.dataset.spot); });
  box.querySelectorAll('[data-spot]').forEach(el => el.oncontextmenu = e => { e.preventDefault(); if (T.phase !== 'bet' || !T.bets[el.dataset.spot]) return; delete T.bets[el.dataset.spot]; G.undo = G.undo.filter(u => u[0] !== el.dataset.spot); render(); });
  wireSqueeze(box);
  renderActbar(); renderSide(); renderNums();
  // phones: the bar under the table changes height between betting and dealing — size the table again for the real one (once)
  if (G.abH && !G.reAb && Math.max(140, $('#actbar').offsetHeight) !== G.abH) { G.reAb = 1; render(); G.reAb = 0; }
}
/* squeeze: drag a face-down card (from any edge) to peel it; tap opens it at once */
function wireSqueeze(box) {
  box.querySelectorAll('.cd.sqz').forEach(el => {
    if (el._sq) return; el._sq = 1;
    let st = null;
    el.onpointerdown = e => { st = { x: e.clientX, y: e.clientY, h: el.getBoundingClientRect().height, moved: false }; el.setPointerCapture(e.pointerId); };
    el.onpointermove = e => {
      if (!st) return; const d = Math.max(Math.abs(e.clientX - st.x), Math.abs(e.clientY - st.y)); if (d > 6) st.moved = true;
      const p = Math.min(1, d / st.h); el.style.setProperty('--pl', p.toFixed(3)); el.classList.add('peeling');
      el.dataset.dir = Math.abs(e.clientX - st.x) > Math.abs(e.clientY - st.y) ? (e.clientX > st.x ? 'l' : 'r') : (e.clientY > st.y ? 't' : 'b');
      if (p > .62) { st = null; reveal(el.dataset.s, +el.dataset.i); }
    };
    el.onpointerup = el.onpointercancel = () => { if (!st) return; const tap = !st.moved; st = null; if (tap) reveal(el.dataset.s, +el.dataset.i); else { el.style.setProperty('--pl', '0'); el.classList.remove('peeling'); } };
  });
}
function renderActbar() {
  const bar = $('#actbar');
  if (T.phase === 'deal') { patch(bar, `<div class="ab-msg wait">${esc(t('dealing'))}</div>`); return; }
  if (T.phase === 'squeeze') {
    patch(bar, `<div class="ab-msg">${esc(t('sq.msg'))}</div><div class="ab-btns"><button class="abtn go" id="abOpen">${esc(t('sq.all'))}</button></div>`);
    $('#abOpen').onclick = revealAll; return;
  }
  if (T.phase === 'done') {
    patch(bar, `<div class="ab-btns main"><button class="abtn" id="abRe" data-k="re">${esc(t('btn.rebetDeal'))}<kbd>R</kbd></button><button class="abtn go" id="abNext" data-k="nx">${esc(t('next'))}<kbd>Space</kbd></button></div>`);
    $('#abNext').onclick = () => T.tut && window.BacTut ? BacTut.finish() : nextCoup(); $('#abRe').onclick = () => { if (T.tut) { window.BacTut && BacTut.finish(); return; } nextCoup(); rebet(1); if (betSum(T.bets)) deal(); };
    return;
  }
  const tot = betSum(T.bets);
  const rack = DENOMS.map(d => `<button type="button" class="bc-chip${set.chip === d ? ' sel' : ''}" data-d="${d}" data-k="ch${d}" title="${d}">${chipTop(d, set.chip === d)}</button>`).join('');
  patch(bar, `<div class="bc-rack">${rack}</div><div class="bc-bal"><small>${esc(t('bank'))}</small><b>${fmt(T.bank - tot)}</b>${tot ? `<em>${esc(t('onTable', { n: fmt(tot) }))}</em>` : ''}</div>` +
    `<div class="ab-btns main"><button class="abtn" id="abUndo" data-k="un"${G.undo.length ? '' : ' disabled'}>${esc(t('btn.undo'))}<kbd>Z</kbd></button><button class="abtn" id="abClr" data-k="cl"${tot ? '' : ' disabled'}>${esc(t('btn.clear'))}</button>` +
    `<button class="abtn" id="abRebet" data-k="rb"${T.last && !tot ? '' : ' disabled'}>${esc(t('btn.rebet'))}<kbd>R</kbd></button><button class="abtn" id="abX2" data-k="x2"${tot || T.last ? '' : ' disabled'}>×2</button>` +
    `<button class="abtn go" id="abDeal" data-k="dl"${tot >= MIN_BET ? '' : ' disabled'}>${esc(t('btn.deal'))}<kbd>Space</kbd></button></div>`);
  bar.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { set.chip = +b.dataset.d; save(); sfx('chip'); renderActbar(); });
  $('#abUndo').onclick = unplace; $('#abClr').onclick = clearBets; $('#abRebet').onclick = () => rebet(1); $('#abX2').onclick = () => rebet(2); $('#abDeal').onclick = deal;
}

/* ---------------- side panel ---------------- */
const gl = h => h;
function renderSide() {
  let h = '';
  // the shoe (exact odds of the remaining cards)
  const O = shoeOdds(), base = baseOdds(T.v, T.tie, T.decks), left = T.shoe.cards.length - T.shoe.pos;
  const evRow = k => { const e = O.E[k], b = base.E[k], up = e - b; return `<div class="ev-r${e > 0 ? ' plus' : ''}"><span>${esc(t(SPOTS[k]))}</span><b>${(e * 100).toFixed(2)}%</b><small class="${up > .0005 ? 'up' : up < -.0005 ? 'dn' : ''}">${up >= 0 ? '+' : ''}${(up * 100).toFixed(2)}</small></div>`; };
  h += `<div class="card shoe-card" data-pt="shoe" data-k="shoe"><h3>${esc(t('side.shoe'))}<span class="h3s">${esc(t('shoe.left', { n: left }))} · ${esc(t('shoe.coup', { n: T.shoe.n }))}</span></h3>` +
    `<div class="pr3"><div class="pB"><small>${esc(t('rd.B'))}</small><b>${pct(O.R.B, 2)}</b></div><div class="pP"><small>${esc(t('rd.P'))}</small><b>${pct(O.R.P, 2)}</b></div><div class="pT"><small>${esc(t('rd.T'))}</small><b>${pct(O.R.T, 2)}</b></div></div>` +
    `<div class="ev-h"><span>${esc(t('ev.bet'))}</span><span>${esc(t('ev.now'))}</span><span>${esc(t('ev.diff'))}</span></div>${VB().map(evRow).join('')}` +
    `<p class="diff-desc">${esc(t('ev.help'))}</p></div>`;
  // roads
  const RB = RD.build(T.res), L = { B: t('rd.B'), P: t('rd.P'), T: t('rd.T') };
  const cntW = w => T.res.filter(r => r.w === w).length;
  const ask = w => `<div class="ask a${w}"><b>${esc(L[w])}</b>${RD.askSvg(RB.ask[w])}</div>`;
  const cap = k => `<small class="rd-cap">${esc(String(t('rx.' + k)).replace(/（.*|\(.*/, ''))}</small>`;
  h += `<div class="card road-card" data-pt="road" data-k="road"><h3>${esc(t('side.road'))}<span class="h3s">${esc(t('rd.count', { b: cntW('B'), p: cntW('P'), t: cntW('T'), n: T.res.length }))}</span><button type="button" class="rd-zoom" id="rdZoom">⤢ ${esc(t('rd.zoom'))}</button></h3>` +
    `<div class="rd-big">${cap('big')}${RD.bigSvg(RB.big, 16, 'big', RB.lead)}</div>` +
    `<div class="rd-row"><div class="rd-bead">${cap('bead')}${RD.beadSvg(T.res, 7, L)}</div><div class="rd-der"><div>${cap('eye')}${RD.bigSvg(RB.eye, 16, 'eye')}</div><div>${cap('small')}${RD.bigSvg(RB.small, 16, 'small')}</div><div>${cap('roach')}${RD.bigSvg(RB.roach, 16, 'roach')}</div></div></div>` +
    `<div class="rd-ask"><small>${esc(t('rd.ask'))}</small>${ask('B')}${ask('P')}<button type="button" class="rd-help" id="rdHelp" aria-label="?">?</button></div></div>`;
  // coach
  if (set.coach) h += `<div class="card coach-card" data-pt="coach" data-k="coach"><h3>${esc(t('side.coach'))}</h3>${coachHtml()}</div>`;
  else h += `<div class="card coach-card ck-off" data-pt="coach" data-k="coach"><h3>${esc(t('side.coach'))}</h3><p class="muted">${esc(t('coach.off'))}</p></div>`;
  // session: on PC a strip under the table, elsewhere a card (tab) in the side panel
  const S = T.session, pcCol = matchMedia('(hover:hover) and (pointer:fine) and (min-width:1040px) and (min-aspect-ratio:3/4)').matches;
  const cells = `<div><small>${esc(t('ss.hands'))}</small><b>${S.hands}</b></div><div><small>${esc(t('ss.net'))}</small><b class="${S.net > 0 ? 'pos' : S.net < 0 ? 'neg' : ''}">${sg(S.net)}</b></div>` +
    `<div><small>${esc(t('ss.wag'))}</small><b>${fmt(S.wag)}</b></div><div><small>${esc(t('ss.exp'))}</small><b class="neg">${sg(Math.round(S.exp))}</b></div>`;
  const btns = `<button class="sbtn" id="sStats">${esc(t('btn.stats'))}</button><button class="sbtn" id="sTools">${esc(t('btn.tools'))}</button>`;
  if (pcCol) patch($('#sessBar'), `<div class="sb-h"><b>${esc(t('side.session'))}</b><small>${esc(vName(T.v))}</small></div><div class="srow">${cells}<div><small>${esc(t('st.luck'))}</small><b class="${S.net - S.exp > 0 ? 'pos' : S.net - S.exp < 0 ? 'neg' : ''}">${sg(Math.round(S.net - S.exp))}</b></div></div><div class="sb-btns">${btns}</div>`);
  else {
    $('#sessBar').innerHTML = '';
    h += `<div class="card" data-pt="sess" data-k="sess"><h3>${esc(t('side.session'))}<span class="h3s">${esc(vName(T.v))}</span></h3><div class="srow">${cells}</div>` +
      `<p class="diff-desc">${esc(t('ss.luck', { n: sg(Math.round(S.net - S.exp)) }))}</p><div class="deal-row">${btns}</div></div>`;
  }
  patch($('#side'), h);
  $('#sStats').onclick = openStats; $('#sTools').onclick = () => window.BacTools && BacTools.open();
  $('#rdHelp').onclick = () => window.BacTools && BacTools.open('roads');
  $('#rdZoom').onclick = () => { renderRoadZoom(); openOv('#roadOverlay'); };
  if ($('#roadOverlay').classList.contains('show')) renderRoadZoom();
  const tm = $('#tipsMore'); if (tm) tm.onclick = () => { set.tipsOpen = set.tipsOpen ? 0 : 1; save(); renderSide(); };
  mTabs();
}

/* the roads, large (a dialog; follows the shoe while it is open) */
function renderRoadZoom() {
  const RB = RD.build(T.res), L = { B: t('rd.B'), P: t('rd.P'), T: t('rd.T') }, cntW = w => T.res.filter(r => r.w === w).length;
  const cols = matchMedia('(max-width:760px)').matches ? 18 : 34;
  const box = (k, svg, wide) => `<div class="rz${wide ? ' wide' : ''}"><div class="rz-h"><b>${esc(t('rx.' + k))}</b></div><div class="rz-svg">${svg}</div></div>`;
  const ask = w => `<div class="ask a${w}"><b>${esc(L[w])}</b>${RD.askSvg(RB.ask[w])}</div>`;
  $('#roadBody').innerHTML = `<div class="rz-top"><span class="rz-n">${esc(t('rd.count', { b: cntW('B'), p: cntW('P'), t: cntW('T') }))}</span><div class="rd-ask"><small>${esc(t('rd.ask'))}</small>${ask('B')}${ask('P')}</div></div>` +
    `<div class="rz-grid">` + box('big', RD.bigSvg(RB.big, cols, 'big', RB.lead), 1) + box('bead', RD.beadSvg(T.res, Math.round(cols / 2.2), L)) +
    `<div class="rz-der">${box('eye', RD.bigSvg(RB.eye, cols, 'eye'))}${box('small', RD.bigSvg(RB.small, cols, 'small'))}${box('roach', RD.bigSvg(RB.roach, cols, 'roach'))}</div></div>` +
    `<p class="diff-desc">${esc(t('rx.warn'))}</p>`;
}
$('#btnRoadClose').onclick = () => closeOv('#roadOverlay');
$('#btnRoadHelp').onclick = () => window.BacTools && BacTools.open('roads');

/* ---------------- coach ---------------- */
// house edge (full shoe) of a bet for this table
const edge = k => -baseOdds(T.v, T.tie, T.decks).E[k];
function bestMain() { return edge('B') <= edge('P') ? 'B' : 'P'; }
function coachHtml() {
  let h = '';
  const tips = [];
  if (T.phase === 'bet' || T.phase === 'done') {
    const O = shoeOdds();
    // 1. the bets on the table (or the recommendation)
    const bets = T.phase === 'bet' ? T.bets : T.last || {};
    const ks = Object.keys(bets).filter(k => bets[k]);
    // the cheapest main bet *in this shoe* (it can change late in a shoe), shown small: it is a fact, not the coaching
    const bestNow = O.E.B >= O.E.P ? 'B' : 'P', flip = bestNow !== bestMain();
    h += `<div class="kv ck-best${flip ? ' flip' : ''}"><span>${esc(t('ck.best'))}</span><b>${esc(t(SPOTS[bestNow]))} ${(O.E[bestNow] * 100).toFixed(2)}%</b></div>` + (flip ? `<p class="ck-flip">${esc(t('ck.flip', { w: t(SPOTS[bestNow]) }))}</p>` : '');
    const S = T.session, lc = T.lastCoup;
    if (ks.length && T.phase === 'bet') {
      // grade the bet you are about to make: the bets themselves, the size, chasing
      const tot = betSum(bets), loss = ks.reduce((a, k) => a + bets[k] * edge(k), 0), share = tot / Math.max(1, T.bank);
      const notes = [];
      const mainAmt = (bets.B || 0) + (bets.P || 0);
      ks.forEach(k => { const e = edge(k); notes.push([e < .02 ? 'g' : e < .08 || bets[k] <= mainAmt ? 'm' : 'b', t(e < .02 ? 'gr.main' : 'gr.side', { k: t(SPOTS[k]), e: pct(e) })]); });
      if (bets.P && bets.B) notes.push(['b', t('tip.both')]);
      notes.push(share <= .05 ? ['g', t('gr.size.ok', { n: Math.round(share * 100) })] : share <= .15 ? ['m', t('gr.size.big', { n: Math.round(share * 100) })] : ['b', t('gr.size.huge', { n: Math.round(share * 100) })]);
      if (lc && lc.net < 0 && tot >= lc.tot * 2) notes.push(['b', t('gr.chase', { a: fmt(lc.tot), b: fmt(tot) })]);
      const worst = notes.some(n => n[0] === 'b') ? 'b' : notes.some(n => n[0] === 'm') ? 'm' : 'g';
      h += `<div class="ck-grade g${worst}"><b>${esc(t('gr.h.' + worst))}</b><ul>${notes.map(([g, x]) => `<li class="g${g}">${esc(x)}</li>`).join('')}</ul></div>`;
      h += `<div class="ck-bets">${ks.map(k => `<div class="kv"><span>${esc(t(SPOTS[k]))} ${fmt(bets[k])}</span><b class="${edge(k) > .03 ? 'neg' : ''}">${esc(t('edge', { n: pct(edge(k)) }))}</b></div>`).join('')}` +
        `<div class="kv tot"><span>${esc(t('ck.avgLoss'))}</span><b>−${fmt(Math.round(loss * 100) / 100)}</b></div></div>`;
    } else if (T.phase === 'bet') {
      // no bet yet: a money plan from your chips, and how likely it is to be ahead after many coups
      const start = S.buyin, unit = Math.max(25, Math.round(T.bank * .02 / 25) * 25), stop = Math.round(start * .7 / 25) * 25, goal = Math.round(start * 1.2 / 25) * 25;
      const pos = Math.max(0, Math.min(1, (T.bank - stop) / ((goal - stop) || 1)));
      h += `<div class="ck-plan"><div class="tips-h">${esc(t('pl.h'))}</div>` +
        `<div class="kv"><span>${esc(t('pl.unit'))}</span><b>${fmt(unit)}</b></div><div class="kv"><span>${esc(t('pl.stop'))}</span><b class="neg">${fmt(stop)}</b></div><div class="kv"><span>${esc(t('pl.goal'))}</span><b class="pos">${fmt(goal)}</b></div>` +
        `<div class="pl-bar"><i style="left:${(pos * 100).toFixed(1)}%"></i></div>` +
        (T.bank <= stop ? `<p class="ck-warn">${esc(t('pl.atStop'))}</p>` : T.bank >= goal ? `<p class="ck-good">${esc(t('pl.atGoal'))}</p>` : '') + `</div>`;
      const pa = n => { const z = -.01058 * Math.sqrt(n) / .927; return 1 / (1 + Math.exp(-1.702 * z)); };   // normal cdf (logistic approx.)
      h += `<div class="ck-long"><div class="tips-h">${esc(t('lg.h'))}</div><div class="lg-row">${[10, 100, 1000, 10000].map(n => `<div><small>${esc(t('lg.n', { n: fmt(n) }))}</small><b>${pct(pa(n), 0)}</b></div>`).join('')}</div><p class="diff-desc">${esc(t('lg.help'))}</p></div>`;
    }
    // the last coup: did you play it well? (independent of whether it won)
    if (T.phase === 'done' && lc && lc.tot) h += `<p class="ck-luck">${esc(t(lc.net > 0 ? 'ck.won' : lc.net < 0 ? 'ck.lost' : 'ck.push', { e: fmt(Math.round(lc.exp * 100) / 100) }))}</p>`;
    // 2. a +EV spot in this shoe (it happens to side bets late in a shoe)
    const plus = VB().filter(k => O.E[k] > 0);
    if (plus.length) h += `<div class="ck-plus">🔎 ${esc(t('ck.plus', { b: plus.map(k => t(SPOTS[k]) + ' ' + (O.E[k] > 0 ? '+' : '') + (O.E[k] * 100).toFixed(2) + '%').join(' / ') }))}</div>`;
    // 3. the last coup explained (the tableau)
    if (T.phase === 'done' && T.coup) h += explainHtml(T.coup);
  } else if (T.phase === 'deal' || T.phase === 'squeeze') {
    h += `<p class="muted">${esc(t(T.phase === 'squeeze' ? 'coach.sq' : 'coach.deal'))}</p>`;
  }
  // tips from the roads / the session
  const st = RD.streaks(T.res);
  if (st.cur >= 4) tips.push(t('tip.streak', { n: st.cur, w: t('rd.' + st.side) }));
  if (T.res.length >= 6) { const last6 = T.res.slice(-6).filter(r => r.w !== 'T'); let ch = 0; for (let i = 1; i < last6.length; i++) if (last6[i].w !== last6[i - 1].w) ch++; if (ch >= 4) tips.push(t('tip.chop')); }
  if (T.session.hands >= 20) tips.push(t('tip.luck', { e: fmt(Math.round(-T.session.exp)), n: sg(Math.round(T.session.net)) }));
  if (D.bots && D.bots.marco && D.bots.marco.unit >= 4 && T.bots && T.bots.marco && T.bots.marco.bets.P) tips.push(t('tip.bot', { n: 'Marco', a: fmt(T.bots.marco.bets.P) }));
  tips.push(...TIPS_GEN());
  if (tips.length) {
    const n = 3, open = !!set.tipsOpen, show = open ? tips : tips.slice(0, n);
    h += `<div class="tips"><div class="tips-h">💡 ${esc(t('tips.h'))}</div><ul>${show.map(x => `<li>${gl(esc(x))}</li>`).join('')}</ul>` +
      (tips.length > n ? `<button type="button" class="tips-more" id="tipsMore">${esc(open ? t('tips.less') : t('tips.more', { n: tips.length - n }))}</button>` : '') + `</div>`;
  }
  return h;
}
// general tips (rotate with the coup number so they stay put during one coup)
function TIPS_GEN() {
  const pool = [];
  for (let i = 1; i <= 24; i++) pool.push('tipg.' + i);
  const v = T.v === 'nocomm' ? ['tipv.nocomm'] : T.v === 'ez' ? ['tipv.ez1', 'tipv.ez2'] : ['tipv.classic'];
  const k = T.hand % pool.length;
  return v.concat([pool[k], pool[(k + 7) % pool.length], pool[(k + 13) % pool.length]]).map(x => t(x));
}
// the third-card decisions of a coup, in words
function explainHtml(c) {
  const P0 = B.total(c.p.slice(0, 2)), B0 = B.total(c.b.slice(0, 2));
  const lines = [];
  lines.push(t('ex.first', { p: P0, b: B0 }));
  for (const s of c.steps) {
    if (s.k === 'natural') lines.push(t('ex.natural', { n: Math.max(s.pt, s.bt) }));
    else if (s.k === 'pDraw') lines.push(t('ex.pDraw', { n: s.pt }));
    else if (s.k === 'pStand') lines.push(t('ex.pStand', { n: s.pt }));
    else if (s.k === 'bDrawS') lines.push(t('ex.bDrawS', { n: s.bt }));
    else if (s.k === 'bStandS') lines.push(t('ex.bStandS', { n: s.bt }));
    else if (s.k === 'bDraw') lines.push(t('ex.bDraw', { n: s.bt, p: s.p3 }) + ' ' + t('ex.rule.' + Math.min(s.bt, 7)));
    else if (s.k === 'bStand') lines.push(t('ex.bStand', { n: s.bt, p: s.p3 }) + ' ' + t('ex.rule.' + Math.min(s.bt, 7)));
  }
  lines.push(c.win === 'T' ? t('ex.tie', { n: c.pt }) : t('ex.win', { w: t('rd.' + c.win), a: c.win === 'P' ? c.pt : c.bt, b: c.win === 'P' ? c.bt : c.pt }));
  if (T.v === 'nocomm' && c.win === 'B' && c.bt === 6) lines.push(t('ex.b6'));
  if (T.v === 'ez' && c.win === 'B' && c.b.length === 3 && c.bt === 7) lines.push(t('ex.d7'));
  if (T.v === 'ez' && c.win === 'P' && c.p.length === 3 && c.pt === 8) lines.push(t('ex.p8'));
  return `<div class="ck-ex"><div class="tips-h">${esc(t('ex.h'))}</div><ol>${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ol></div>`;
}

/* phones: the side cards become tabs (bar at the bottom of the screen) */
function mTabs() {
  const side = $('#side'), have = new Set($$('#side [data-pt]').map(e => e.dataset.pt));
  const cur = set.mTab && have.has(set.mTab) ? set.mTab : 'road';
  side.dataset.pt = cur;
  $$('#mTabs [data-pt]').forEach(b => { b.hidden = !have.has(b.dataset.pt); b.classList.toggle('sel', b.dataset.pt === cur); });
  const sc = $('.stage'), max = sc.scrollHeight - sc.clientHeight; if (sc.scrollTop > max + 1) sc.scrollTop = Math.max(0, max);
}
$('#mTabRec').onclick = () => window.GameRecord && GameRecord.open();
$$('#mTabs [data-pt]').forEach(b => b.onclick = () => {
  const sc = $('.stage'), pt = b.dataset.pt, same = $('#side').dataset.pt === pt;
  const tableTop = () => { const tb = $('.board-wrap'); const r = tb.getBoundingClientRect(), y = sc.scrollTop + r.top - sc.getBoundingClientRect().top + r.height / 2 - sc.clientHeight / 2; return Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, Math.round(y))); };
  if (same && Math.abs(sc.scrollTop - tableTop()) > 8) { sc.style.paddingBottom = ''; sc.scrollTo({ top: tableTop(), behavior: 'smooth' }); return; }
  if (!same) { set.mTab = pt; save(); mTabs(); }
  sc.style.paddingBottom = '';
  const h = sc.clientHeight, box = $(`#side [data-pt="${pt}"]`) || $('#side');
  let max = sc.scrollHeight - h, top = sc.scrollTop + box.getBoundingClientRect().top - sc.getBoundingClientRect().top - 8;
  if (top > max) { sc.style.paddingBottom = `calc(${getComputedStyle(sc).paddingBottom} + ${Math.ceil(top - max)}px)`; max = top; }
  sc.scrollTo({ top: Math.max(0, Math.min(max, top)), behavior: 'smooth' });
});
$('.stage').addEventListener('scroll', e => { const sc = e.currentTarget; if (sc.scrollTop < 1 && sc.style.paddingBottom) sc.style.paddingBottom = ''; }, { passive: true });
function fitLabels() {
  $$('.controls .btn span').forEach(sp => { sp.style.fontSize = ''; if (!sp.offsetParent) return; let f = parseFloat(getComputedStyle(sp).fontSize); while (sp.scrollWidth > sp.clientWidth + .5 && f > 8) { f -= .5; sp.style.fontSize = f + 'px'; } });
}
addEventListener('resize', () => requestAnimationFrame(fitLabels));
{ const sc = $('.stage'), upd = () => { const h = sc.clientHeight; if (h) document.documentElement.style.setProperty('--sh', h + 'px'); };
  if (window.ResizeObserver) new ResizeObserver(upd).observe(sc); upd(); }
if (window.ResizeObserver) { let lw = 0, lh = 0, q = 0; new ResizeObserver(() => { const b = $('#bcTable'); if (!b || (b.clientWidth === lw && b.clientHeight === lh)) return; lw = b.clientWidth; lh = b.clientHeight; if (!q) q = requestAnimationFrame(() => { q = 0; if (T) render(); }); }).observe($('#bcTable')); }
let HB = null;
function renderNums() {
  const game = `<span class="sg"><b>${esc(vName(T.v))}</b><em>${esc(t('rule.short', { d: T.decks, t: T.tie }))}</em></span>`;
  const stat = (lab, val) => `<span class="ss"><small>${esc(lab)}</small><b>${val}</b></span>`;
  const stats = stat(t('bank'), fmt(T.bank)) + stat(t('ss.net'), sg(T.session.net)) + stat(t('ss.coup'), '#' + (T.shoe.n + (T.phase === 'bet' ? 1 : 0)));
  $('#infobar').innerHTML = game + stats;
  const mg = `<b>${esc(vName(T.v))}</b><em>${esc(t('rule.short', { d: T.decks, t: T.tie }))}</em>`; if ($('#mGame').innerHTML !== mg) $('#mGame').innerHTML = mg;
  if (HB && HB.on) HB.setInfo(game + `<span class="sdiv"></span>` + stats);
}

/* ---------------- statistics dialog ---------------- */
let statsV = null;
function openStats() { statsV = statsV || T.v; renderStats(); openOv('#statsOverlay'); }
function renderStats() {
  $('#statsTabs').innerHTML = B.ORDER.map(v => `<button type="button" data-v="${v}" class="${v === statsV ? 'sel' : ''}">${esc(vName(v))}</button>`).join('');
  $$('#statsTabs [data-v]').forEach(b => b.onclick = () => { statsV = b.dataset.v; renderStats(); });
  const S = D.stats[statsV] || {};
  if (!S.hands) { $('#statsBody').innerHTML = `<p class="muted center">${esc(t('st.none'))}</p>`; return; }
  const base = baseOdds(statsV, prefOf(statsV).tie, prefOf(statsV).decks).R, w = S.w || { P: 0, B: 0, T: 0 };
  const cells = [['st.hands', S.hands], ['st.net', sg(S.net || 0)], ['st.wag', fmt(S.wag || 0)], ['st.exp', sg(Math.round(S.exp || 0))], ['st.luck', sg(Math.round((S.net || 0) - (S.exp || 0)))], ['st.best', S.best || 0], ['st.nat', pct((S.nat || 0) / S.hands, 1)], ['st.pairs', pct((S.pairs || 0) / S.hands, 1)]];
  const g = S.graph || [], mn = Math.min(0, ...g), mx = Math.max(0, ...g), W = 600, hh = 120;
  const path = g.length > 1 ? g.map((v, i) => `${i ? 'L' : 'M'}${(i / (g.length - 1) * W).toFixed(1)} ${(hh - (v - mn) / ((mx - mn) || 1) * hh).toFixed(1)}`).join(' ') : '';
  const zero = hh - (0 - mn) / ((mx - mn) || 1) * hh;
  const fr = k => `<div class="fq f${k}"><span>${esc(t('rd.' + k))}</span><span class="fq-b"><i style="width:${(w[k] / S.hands * 100).toFixed(1)}%"></i><em style="left:${(base[k] * 100).toFixed(1)}%"></em></span><b>${pct(w[k] / S.hands, 1)}</b><small>${esc(t('st.theory', { n: pct(base[k], 1) }))}</small></div>`;
  const bets = Object.entries(S.bets || {}).map(([k, b]) => `<tr><td>${esc(t(SPOTS[k]))}</td><td>${b.n}</td><td>${b.n ? pct(b.won / b.n, 1) : '—'}</td><td class="${b.net > 0 ? 'pos' : b.net < 0 ? 'neg' : ''}">${sg(b.net)}</td></tr>`).join('');
  $('#statsBody').innerHTML = `<div class="st-grid">${cells.map(([k, v]) => `<div><small>${esc(t(k))}</small><b>${v}</b></div>`).join('')}</div>` +
    `<div class="st-two"><div><span class="lab">${esc(t('st.freq'))}</span>${['B', 'P', 'T'].map(fr).join('')}</div>` +
    `<div><span class="lab">${esc(t('st.bets'))}</span><table class="st-tbl"><tr><th>${esc(t('st.bet'))}</th><th>${esc(t('st.n'))}</th><th>${esc(t('st.winp'))}</th><th>${esc(t('st.net'))}</th></tr>${bets}</table></div></div>` +
    `<div class="st-graph"><small>${esc(t('st.graph'))}</small><svg viewBox="0 0 ${W} ${hh}" preserveAspectRatio="none"><line x1="0" x2="${W}" y1="${zero}" y2="${zero}" class="z"/><path d="${path}"/></svg></div>` +
    `<p class="diff-desc">${esc(t('st.help'))}</p>`;
}
$('#btnStatsClose').onclick = () => closeOv('#statsOverlay');
$('#btnStatsReset').onclick = () => confirmBox(t('st.resetQ'), () => { delete D.stats[statsV]; save(); renderStats(); });

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
function openNew() { NGR = 0; const v = T ? T.v : set.v; NG = { v, p: JSON.parse(JSON.stringify(prefOf(v))) }; ngTab = 'game'; renderNew(); openOv('#newOverlay'); }
function seg(items, cur, attr) { return `<div class="seg">${items.map(([val, lab]) => `<button type="button" data-${attr}="${esc(val)}" class="${String(val) === String(cur) ? 'sel' : ''}">${esc(lab)}</button>`).join('')}</div>`; }
const GART = {   // a few cards for each variant (new-game dialog): [card, x, y, rot]
  classic: [[47, 0, .15, -8], [30, .55, .05, 4], [12, 1.6, .2, -4], [4, 2.15, .1, 8]],      // K♣ 5♦ | K♠ 5♠ …
  nocomm: [[18, 0, .1, -6], [26, .55, .05, 6], [5, 1.6, .1, -6], [13, 2.15, .05, 6]],
  ez: [[3, 0, .1, -6], [43, .5, .05, 0], [16, .98, .1, 6], [6, 1.75, .1, -4], [22, 2.25, .1, 6]],
};
function gArt(v) { return `<span class="garts">` + GART[v].map(([c, x, y, r]) => `<span class="cd" style="left:calc(var(--cw)*${x});top:calc(var(--cw)*${y});transform:rotate(${r}deg)"><span class="in">${Cards.face(c)}</span></span>`).join('') + `</span>`; }
function renderNew() {
  const v = NG.v, p = NG.p;
  $('#ngTabs').innerHTML = ['game', 'rules', 'design'].map(k => `<button type="button" class="${k === ngTab ? 'sel' : ''}" data-tab="${k}">${esc(t('tab.' + k))}${k === 'rules' ? `<small>${esc(vName(v))}</small>` : ''}</button>`).join('');
  let h;
  if (ngTab === 'game') h = `<div class="bc-ngw"><div class="ng-games bc3">` + B.ORDER.map(id => `<button type="button" class="gcard${id === v ? ' sel' : ''}" data-g="${id}"><span class="gart">${gArt(id)}</span><b>${esc(vName(id))}</b><p>${esc(t('vg.' + id))}</p><span class="gpick">${id === v ? '✓' : ''}</span></button>`).join('') + `</div>` + chipsRow() + `</div>`;
  else if (ngTab === 'rules') {
    const row = (lab, help, html) => `<div class="rl"><div class="rl-t"><b>${esc(lab)}</b><small>${esc(help)}</small></div>${html}</div>`;
    h = `<div class="rl-list">` +
      row(t('o.decks'), t('o.decks.h'), seg(DECKS.map(d => [d, t('o.deckN', { n: d })]), p.decks, 'dk')) +
      row(t('o.tie'), t('o.tie.h'), seg(TIES.map(x => [x, x + ' : 1']), p.tie, 'tie')) +
      row(t('o.squeeze'), t('o.squeeze.h'), seg([[0, t('off')], [1, t('on')]], set.squeeze ? 1 : 0, 'sq')) +
      `</div><p class="diff-desc">${esc(t('o.note'))}</p>`;
  } else h = designHtml();
  const body = $('#ngBody'); body.innerHTML = h; body.dataset.tab = ngTab;
  $$('#ngTabs [data-tab]').forEach(b => b.onclick = () => { ngTab = b.dataset.tab; renderNew(); });
  $$('#ngBody [data-g]').forEach(b => { b.onclick = () => { if (NG.v !== b.dataset.g) { NG.v = b.dataset.g; NG.p = JSON.parse(JSON.stringify(prefOf(NG.v))); } renderNew(); }; b.ondblclick = () => $('#btnStart').click(); });
  $$('#ngBody [data-dk]').forEach(b => b.onclick = () => { NG.p.decks = +b.dataset.dk; renderNew(); });
  $$('#ngBody [data-tie]').forEach(b => b.onclick = () => { NG.p.tie = +b.dataset.tie; renderNew(); });
  $$('#ngBody [data-sq]').forEach(b => b.onclick = () => { set.squeeze = +b.dataset.sq; save(); renderNew(); });
  if (ngTab === 'design') wireDesign(body);
}
// your chips (carried over between games) and a reset to the starting amount (two taps: ask, then do)
let NGR = 0;
function chipsRow() {
  const cur = T && !T.tut ? T.bank : (typeof D.chips === 'number' ? D.chips : START);
  return `<div class="ng-chips-row"><span class="lab">${esc(t('ng.chips'))}</span><b class="ng-chips">${fmt(cur)}</b><small>${esc(t('o.carry', { s: fmt(START) }))}</small>` +
    (NGR ? `<span class="ng-rq">${esc(t('ng.resetQ', { n: fmt(START) }))}</span><button type="button" class="sbtn" id="ngRNo">${esc(t('no'))}</button><button type="button" class="sbtn go" id="ngRYes">${esc(t('yes'))}</button>`
      : `<button type="button" class="sbtn" id="ngReset"${cur === START ? ' disabled' : ''}>↺ ${esc(t('ng.reset'))}</button>`) + `</div>`;
}
document.addEventListener('click', e => {
  const id = e.target.closest && e.target.closest('#ngReset, #ngRNo, #ngRYes') ? e.target.closest('#ngReset, #ngRNo, #ngRYes').id : '';
  if (!id) return;
  if (id === 'ngReset') NGR = 1;
  else if (id === 'ngRNo') NGR = 0;
  else { NGR = 0; D.chips = START; if (T && !T.tut) { if (T.phase === 'bet') { T.bets = {}; G.undo = []; } T.bank = START; } save(); if (T) render(); sfx('chips'); toast(t('ng.resetDone', { n: fmt(START) })); }
  renderNew();
});
$('#btnNewClose').onclick = () => closeOv('#newOverlay');
$('#btnStart').onclick = () => { set.prefs[NG.v] = NG.p; save(); closeOv('#newOverlay'); clearTimeout(G.timer); newSession(NG.v); };

/* design (shared with the solitaire / poker) */
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
  const re = () => { root.innerHTML = designHtml(); wireDesign(root); if (T) render(); };
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
  if (setTab === 'play') h = `<div class="set-cols"><div class="rl-list">` + sw('coach', t('set.coach'), t('set.coach.h')) + sw('squeeze', t('o.squeeze'), t('o.squeeze.h')) + sw('autoNext', t('set.autoNext')) + `</div><div class="rl-list">` + sw('anim', t('set.anim')) + sw('sound', t('set.sound')) +
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

/* ---------------- buttons & keys ---------------- */
$('#btnNew').onclick = openNew;
$('#btnSettings').onclick = openSettings;
$('#btnSound').onclick = () => { set.sound = !set.sound; try { localStorage.setItem('atlas-sfx', set.sound ? '1' : '0'); } catch (e) {} save(); $('#btnSound').classList.toggle('on', !!set.sound); };
$('#btnHint').onclick = () => {
  if (!T) return;
  const O = shoeOdds(), plus = VB().filter(k => O.E[k] > 0), best = bestMain();
  toast(t('hint.best', { w: t(SPOTS[best]), e: pct(edge(best)) }) + (plus.length ? ' ' + t('hint.plus', { b: plus.map(k => t(SPOTS[k])).join('・') }) : ''));
  const el = $(`#bcTable [data-spot="${best}"]`); if (el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); }
};
$('#btnResign').onclick = () => {
  if (!T) return;
  const go = () => { clearTimeout(G.timer); const S = T.session; toast(t('cashout', { n: sg(S.net), h: S.hands })); newSession(T.v); };
  // cashing out is not a defeat: the session's net decides how it is recorded, and the chips are kept
  const S = T.session, note = !S.hands || T.tut ? t('co.none') : t(S.net > 0 ? 'co.win' : S.net < 0 ? 'co.lose' : 'co.even', { n: sg(S.net) });
  if (window.Resign) Resign.confirm({ lang: LANG, question: t('cashoutQ'), note }).then(ok => { if (ok) go(); }); else confirmBox(t('cashoutQ') + ' ' + note, go);
};
$('#btnStats').onclick = openStats;
$('#btnTools').onclick = () => window.BacTools && BacTools.open();
$('#btnLesson').onclick = () => window.BacLessons && BacLessons.open();
$('#langSel').onchange = () => { LANG = $('#langSel').value; try { localStorage.setItem('aicoding-lang', LANG); } catch (e) {} applyI18n(); render(); if (window.BacRules && BacRules.relang) BacRules.relang(); if (window.GameRecord) GameRecord.relabel(); };
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea') || $('.overlay.show') || !T) return;
  const k = e.key.toLowerCase();
  if (T.phase === 'bet') {
    if (k === ' ' || k === 'enter') { e.preventDefault(); deal(); }
    else if (k === 'p') placeBet('P'); else if (k === 'b') placeBet('B'); else if (k === 't') placeBet('T');
    else if (k === 'z') unplace(); else if (k === 'r') rebet(1);
    else if (/^[1-5]$/.test(k)) { set.chip = DENOMS[+k - 1]; renderActbar(); }
    else if (k === 'h') $('#btnHint').click();
  } else if (T.phase === 'squeeze' && (k === ' ' || k === 'enter')) { e.preventDefault(); revealAll(); }
  else if (T.phase === 'done' && !T.tut) { if (k === ' ' || k === 'enter' || k === 'n') { e.preventDefault(); nextCoup(); } else if (k === 'r') $('#abRe').click(); }
});

/* ---------------- start ---------------- */
applyI18n();
if (window.GameRecord) GameRecord.init({ game: 'baccarat', lang: () => LANG, menu: '.controls', variant: () => { const v = T ? T.v : set.v; return { k: v, n: vName(v) }; }, variants: () => B.ORDER, variantName: k => vName(k), defVariant: 'classic' });
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnResign', '#btnHint', '#btnRules', '#btnLesson', '#btnTools', '#btnStats'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => setTimeout(() => { if (T) render(); }, 0));
if (window.RulesOffer) RulesOffer.init({ game: 'baccarat', lang: () => LANG, open: () => window.BacRules && BacRules.open(NG ? NG.v : T && T.v), watch: '#rulesOverlay' });
$('#btnSound').classList.toggle('on', !!set.sound);
// resume the saved table (a coup in progress is finished at once); otherwise start a Punto Banco table
if (D.cur && D.cur.shoe && B.VARIANTS[D.cur.v]) {
  T = D.cur; if (!T.bots) botsNewTable();
  if (T.phase === 'deal' || T.phase === 'squeeze') { T.show.n = T.show.ev.length; T.show.ev.forEach(([s, i]) => { T.show.peel[s + i] = 1; }); finish(); }
  render();
} else newSession(set.v);

window.BacApp = { explainHtml, startTutorial, endTutorial, showTab(pt) { set.mTab = pt; mTabs(); }, get T() { return T; }, get LANG() { return LANG; }, t, vName, sfx, esc, fmt, pct, openOv, closeOv, toast, confirmBox, set, D, save, prefOf, newSession, render, gArt, baseOdds, shoeOdds, SPOTS, chipTop, statOf };
})();
