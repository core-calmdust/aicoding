/* ブラックジャック — game controller (blackjack/app.js)
   One seat (the middle one) at a five-seat blackjack table: four regulars play beside you, each with a habit people really have.
   The dealer deals from a shoe with a cut card; the rules of the variant (engine.js) decide doubles, splits, surrender and the payouts.
   Study: the Hi-Lo count and the exact value of every move for the remaining shoe, the basic strategy chart, a coach that grades
   each decision (by its expected value, not by the result), statistics (rules' edge, your mistakes and luck), tools.js · lessons.js · rules.js. */
(function () {
'use strict';
const B = window.BJ, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-blackjack', SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const FELTS = ['green', 'teal', 'blue', 'wine', 'charcoal', 'purple', 'mocha', 'linen'];
const BACKS = ['skullBlack', 'skull', 'gangsta', 'ornate', 'ornateBlack', 'floral', 'floralBlack', 'azure', 'azureBlack', 'hex', 'cube', 'red', 'blue', 'crimson', 'navy'];
const COURTS = ['gangsta', 'classic', 'antique', 'flat'];
const START = 10000, DENOMS = [25, 100, 500, 1000, 5000], MIN_BET = 25, MAX_BET = 10000;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Number(Math.round(n * 100) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });
const fmt = n => (n < 0 ? '−$' : '$') + num(Math.abs(n));
const kfmt = n => Math.abs(n) >= 10000 ? '$' + (Math.round(n / 100) / 10) + 'K' : fmt(n);
const sg = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n));
const pct = (x, d) => (x * 100).toFixed(d == null ? 2 : d) + '%';
const spct = (x, d) => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x * 100).toFixed(d == null ? 2 : d) + '%';
const PCQ = '(hover:hover) and (pointer:fine) and (min-width:1040px) and (min-aspect-ratio:3/4)';

/* ---------------- storage ---------------- */
function load() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
const D = load();
D.set = Object.assign({ v: 'classic', prefs: {}, felt: 'teal', back: 'ornateBlack', court: 'classic', cmode: 'simple', sound: true, anim: 1, speed: 'normal', coach: 1, count: 1, autoNext: 0, chip: 100, lang: '' }, D.set || {});
D.stats = D.stats || {};
const set = D.set;
['felt', 'back', 'court', 'cmode'].forEach(k => { document.documentElement.dataset[k] = set[k]; });
document.documentElement.dataset.face = 'classic';
function save() { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) {} }
function prefOf(v) {
  const p = set.prefs[v] || (set.prefs[v] = {}), R0 = B.rulesOf(v, {});
  if (!B.DECKS.includes(p.decks)) p.decks = R0.decks;
  B.VARIANTS[v].opts.forEach(k => { if (p[k] === undefined) p[k] = k === 'bj' ? R0.bj : !!R0[k]; });
  return p;
}
const R = () => T.R;

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
  $('#brandTitle').textContent = t('title'); $('#brandSub').textContent = LANG === 'en' ? '' : 'Blackjack';
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
  else if (k === 'bj') { [659.3, 784, 987.8, 1318.5].forEach((f, i) => tone(a, n + i * .08, f, .9, .09, 'triangle')); }
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

/* ---------------- chips ---------------- */
const CHIPS = [[5000, 'r'], [1000, 'y'], [500, 'p'], [100, 'k'], [25, 'g']];
const CHIPC = {
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
function chipTop(d, sel) {
  const c = denomKey(d), [body, dark, ins, inlay, txt] = CHIPC[c];
  let spots = ''; for (let a = 0; a < 360; a += 45) spots += `<rect x="22" y="1.5" width="6" height="7" rx="1" fill="${ins}" transform="rotate(${a} 25 25)"/>`;
  return `<svg viewBox="0 0 50 50" class="ctop${sel ? ' sel' : ''}"><circle cx="25" cy="25" r="24" fill="${body}" stroke="${dark}" stroke-width="1.5"/>${spots}<circle cx="25" cy="25" r="15.5" fill="${inlay}" stroke="${dark}" stroke-width="1"/><circle cx="25" cy="25" r="13" fill="none" stroke="${txt}" stroke-width=".7" stroke-dasharray="2 1.4"/><text x="25" y="29.5" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="800" font-size="${CHIPV[c].length > 2 ? 11 : 13}" fill="${txt}">${CHIPV[c]}</text><circle cx="25" cy="25" r="24" fill="url(#chF)"/></svg>`;
}
function chipsAt(amt, x, yb, w) {   // chip stacks (side view) standing on y = yb, centred on x (inside an <svg>)
  let u = Math.round(amt); const st = [];
  for (const [v, c] of CHIPS) { const n = Math.floor(u / v); if (!n) continue; u -= n * v; st.push([c, Math.min(n, 5)]); if (st.length >= 3) break; }
  if (!st.length) st.push(['g', 1]);
  const gap = w * .86, x0 = x - (st.length - 1) * gap / 2;
  return st.map(([c, n], i) => { const sv = chipSvg(c, n), H = +sv.match(/viewBox="0 0 40 ([\d.]+)"/)[1], h = w * H / 40;
    return sv.replace('<svg class="chsv"', `<svg class="chsv" x="${(x0 + i * gap - w / 2).toFixed(1)}" y="${(yb - h).toFixed(1)}" width="${w}" height="${h.toFixed(1)}"`); }).join('');
}

/* ---------------- the table ---------------- */
let T = null;   // { v, R, shoe, rc, bank, bets:{main,pp,t3}, last, phase, seats, dealer, cur, round, session, dec, ins }
const G = { timer: 0, undo: [] };
const mt = () => !set.anim ? 0 : set.speed === 'slow' ? 1.5 : set.speed === 'fast' ? .5 : 1;
const ME = 3, SEATS = [5, 4, 3, 2, 1], PLAY_ORDER = [1, 2, 3, 4, 5];
const BOTS = [
  { id: 'sam', name: 'Sam', av: 4, seat: 1, style: 'count' },     // counts cards (Hi-Lo): small bets in a poor shoe, big ones in a rich shoe; basic strategy
  { id: 'aiko', name: 'Aiko', av: 3, seat: 2, style: 'nobust' },  // never busts: stands on every hard 12+; likes the side bets
  { id: 'marco', name: 'Marco', av: 2, seat: 4, style: 'martin' },// Martingale (doubles the bet after a loss), always takes insurance
  { id: 'lin', name: 'Lin', av: 1, seat: 5, style: 'basic' },     // basic strategy, flat bets: the "correct" way
];
const BOT_START = { lin: 20000, marco: 10000, aiko: 8000, sam: 15000 };
const botOf = n => BOTS.find(b => b.seat === n);
function botState(b) { D.bots = D.bots || {}; const s = D.bots[b.id] || (D.bots[b.id] = { bank: BOT_START[b.id], unit: 1 }); if (s.bank < MIN_BET) { s.bank = BOT_START[b.id]; s.unit = 1; } return s; }
function freshShoe() { T.shoe = B.newShoe(T.R, Math.random); T.rc = 0; T.disc = 0; G.evKey = ''; }
function newSession(v) {
  if (T && T.tut) restoreTut();
  recordSession();
  const p = prefOf(v); set.v = v;
  let bank = typeof D.chips === 'number' ? D.chips : START; if (bank < MIN_BET) bank = START;
  T = { v, R: B.rulesOf(v, p), bank, bets: {}, last: null, phase: 'bet', seats: {}, dealer: null, cur: null, round: 0, dec: [], res: null,
    session: { hands: 0, net: 0, wag: 0, exp: 0, mis: 0, start: Date.now(), buyin: bank, rebuys: 0, peak: bank, graph: [0] } };
  freshShoe(); G.undo = []; botsBet();
  D.cur = T; save(); sfx('shuffle'); render();
}
/* the tutorial: one scripted round on the real table (tutorial.js drives the steps); your chips, the bots and the saved table stay as they were */
function startTutorial() {
  clearTimeout(G.timer); if (T && T.tut) restoreTut(); recordSession();
  G.tutPrev = { cur: D.cur, chips: D.chips, bots: JSON.parse(JSON.stringify(D.bots || {})), set: { coach: set.coach, autoNext: set.autoNext, chip: set.chip } };
  set.coach = 1; set.autoNext = 0; set.chip = 100;
  D.bots = {};   // fresh bots for the script (restored afterwards)
  T = { v: 'classic', R: B.rulesOf('classic', {}), bank: START, bets: {}, last: null, phase: 'bet', seats: {}, dealer: null, cur: null, round: 0, dec: [], res: null, tut: true,
    session: { hands: 0, net: 0, wag: 0, exp: 0, mis: 0, start: Date.now(), buyin: START, rebuys: 0, peak: START, graph: [0] } };
  freshShoe(); botsBet(); BOTS.forEach(b => { T.botBets[b.id] = { main: 100 }; });
  if (window.BJTut) BJTut.setup(T);
  G.undo = []; render();
  if (window.BJTut) BJTut.ev('start');
}
function restoreTut() {
  const p = G.tutPrev; G.tutPrev = null; if (window.BJTut) BJTut.hide();
  if (p) { D.chips = p.chips; D.bots = p.bots; Object.assign(set, p.set); D.cur = p.cur; save(); }
  T = null;
}
function endTutorial() {
  clearTimeout(G.timer); restoreTut();
  if (D.cur && D.cur.shoe && B.VARIANTS[D.cur.v] && D.cur.R) { T = D.cur; T.R = B.rulesOf(T.v, prefOf(T.v)); if (!T.botBets) botsBet(); render(); if (T.phase === 'deal' || T.phase === 'dealer' || (T.phase === 'play' && !myHand())) schedule(400); }
  else newSession(set.v);
}
function recordSession() {
  if (!window.GameRecord || !T || T.tut || !T.session || !T.session.hands || T.session.recorded) return;
  const S = T.session; S.recorded = true;
  try { GameRecord.add({ mode: 'ai', res: S.net > 0 ? 'w' : S.net < 0 ? 'l' : 'd', opp: vName(T.v), key: T.v, why: t('grc.hands', { n: S.hands }) + ' · ' + t('ss.net') + ' ' + sg(S.net) }); } catch (e) {}
}
const betSum = b => Object.values(b || {}).reduce((a, x) => a + (x || 0), 0);
const SIDES = () => T.R.side ? B.SIDEBETS[T.v] : [];
const decksLeft = () => Math.max(.25, (T.shoe.cards.length - T.shoe.pos) / 52);
const trueCount = () => T.rc / decksLeft();
// the composition of the cards not yet seen (the dealer's face-down card counts as unseen)
function unseenP() {
  const n = B.vcounts(T.shoe.cards, T.shoe.pos);
  if (T.dealer && T.dealer.cards[1] != null && !T.dealer.open) n[B.VAL(T.dealer.cards[1])]++;
  return B.probs(n);
}
let BASEP = null; const baseP = () => { const k = B.rkey(T.R); if (!BASEP || BASEP.k !== k) BASEP = { k, p: B.probs(B.fullCounts(T.R)), edge: B.houseEdge(T.R), side: B.sideEdges(T.R) }; return BASEP; };
function shoeEdge() {   // the house edge for the cards that are left (cached per shoe position)
  const k = B.rkey(T.R) + T.shoe.pos + ':' + T.shoe.cards.length;
  if (G.evKey !== k) { G.evKey = k; G.ev = -B.roundEV(B.probs(B.vcounts(T.shoe.cards, T.shoe.pos)), T.R); }
  return G.ev;
}

/* ---------------- betting ---------------- */
function placeBet(k) {
  if (!T || T.phase !== 'bet') return;
  if (T.res) clearRound();
  const d = set.chip, have = T.bank - betSum(T.bets);
  if (have < d) { toast(t('toast.noMoney')); sfx('bad'); return; }
  if (k !== 'main' && !SIDES().includes(k)) return;
  if (T.tut && window.BJTut && !BJTut.allow({ a: 'bet', k })) return;
  if (k === 'main' && (T.bets.main || 0) + d > MAX_BET) { toast(t('toast.max', { n: fmt(MAX_BET) })); return; }
  if (k !== 'main' && (T.bets[k] || 0) + d > 1000) { toast(t('toast.maxSide', { n: fmt(1000) })); return; }
  T.bets[k] = (T.bets[k] || 0) + d; G.undo.push([k, d]); sfx('chip'); render();
  if (T.tut && window.BJTut) BJTut.after('bet');
}
const tutNo = () => T && T.tut && window.BJTut && !BJTut.allow({ a: 'other' });
function unplace() { if (tutNo()) return;
  return unplace0(); }
function unplace0() { const u = G.undo.pop(); if (!u) return; const [k, d] = u; T.bets[k] -= d; if (T.bets[k] <= 0) delete T.bets[k]; sfx('chip'); render(); }
function clearBets() { if (tutNo()) return; T.bets = {}; G.undo = []; render(); }
function rebet(mult) {
  if (tutNo()) return;
  const src = mult === 2 && betSum(T.bets) ? Object.assign({}, T.bets) : T.last; if (!src) return;
  const nb = {}; for (const k in src) if (k === 'main' || SIDES().includes(k)) nb[k] = Math.min(k === 'main' ? MAX_BET : 1000, src[k] * (mult || 1));
  if (betSum(nb) > T.bank) { toast(t('toast.noMoney')); sfx('bad'); return; }
  if (T.res) clearRound();
  T.bets = nb; G.undo = Object.entries(nb).map(([k, a]) => [k, a]); sfx('chips'); render();
}
function clearRound() { T.res = null; T.seats = {}; T.dealer = null; T.cur = null; T.dec = []; T.ins = null; }

/* ---------------- the bots' bets ---------------- */
const r25 = x => Math.max(25, Math.round(x / 25) * 25);
function botsBet() {
  T.botBets = {};
  BOTS.forEach(b => {
    const s = botState(b), cap = x => Math.min(r25(x), Math.floor(s.bank / 25) * 25), bets = {};
    if (b.style === 'basic') bets.main = cap(s.bank >= 20000 ? 500 : 200);
    else if (b.style === 'martin') bets.main = cap(100 * s.unit);
    else if (b.style === 'nobust') { bets.main = cap(100); const sd = SIDES(); if (sd.length && Math.random() < .6) bets[sd[Math.floor(Math.random() * sd.length)]] = 25; }
    else { const tc = Math.floor(trueCount()); bets.main = cap(tc <= 1 ? 100 : 100 * Math.min(8, 2 * (tc - 1))); }
    if (betSum(bets) > s.bank) { delete bets.pp; delete bets.t3; }
    T.botBets[b.id] = bets;
  });
}

/* ---------------- the round ---------------- */
const draw = () => { if (T.shoe.pos >= T.shoe.cards.length) { T.shoe.cards = T.shoe.cards.concat(B.newShoe(T.R).cards); } return T.shoe.cards[T.shoe.pos++]; };
const see = c => { T.rc += B.HILO(c); };
function deal() {
  if (!T || T.phase !== 'bet') return;
  const main = T.bets.main || 0, tot = betSum(T.bets);
  if (main < MIN_BET) { toast(t('toast.minBet', { n: fmt(MIN_BET) })); return; }
  if (tot > T.bank) { toast(t('toast.noMoney')); return; }
  if (T.tut && window.BJTut && !BJTut.allow({ a: 'deal' })) return;
  if (T.res) clearRound();
  if (T.shoe.pos + 40 > T.shoe.cards.length) { freshShoe(); toast(t('toast.newShoe')); }
  T.bank -= tot; T.last = Object.assign({}, T.bets); G.undo = [];
  T.round++; T.dec = []; T.ins = null; T.res = null;
  T.seats = {};
  PLAY_ORDER.forEach(n => {
    if (n === ME) { T.seats[n] = { me: true, side: { pp: T.bets.pp || 0, t3: T.bets.t3 || 0 }, hands: [{ cards: [], bet: main, free: 0 }] }; return; }
    const b = botOf(n), s = botState(b), bb = T.botBets[b.id] || {};
    if (!bb.main || bb.main > s.bank) return;
    s.bank -= betSum(bb);
    T.seats[n] = { bot: b.id, side: { pp: bb.pp || 0, t3: bb.t3 || 0 }, hands: [{ cards: [], bet: bb.main, free: 0 }] };
  });
  T.dealer = { cards: [], open: false };
  // the deal: one card to each seat, the dealer's up card, a second card each, the dealer's hole card (not in the no-hole-card game)
  const q = []; const seats = PLAY_ORDER.filter(n => T.seats[n]);
  seats.forEach(n => q.push(n)); q.push('d'); seats.forEach(n => q.push(n)); if (!T.R.enhc) q.push('h');
  T.q = q; T.phase = 'deal'; render(); schedule(260);
}
function schedule(ms) { clearTimeout(G.timer); G.timer = setTimeout(advance, Math.round(ms * mt()) || 20); }
// the state machine: every timed step of the round goes through here (so a saved table can resume)
function advance() {
  clearTimeout(G.timer); if (!T) return;
  if (T.phase === 'deal') {
    const x = T.q.shift();
    if (x != null) {
      const c = draw();
      if (x === 'd') { T.dealer.cards.push(c); see(c); }
      else if (x === 'h') T.dealer.cards.push(c);
      else { T.seats[x].hands[0].cards.push(c); see(c); }
      sfx('deal'); render(); schedule(T.q.length ? 300 : 420); return;
    }
    afterDeal(); return;
  }
  if (T.phase === 'play') { playStep(); return; }
  if (T.phase === 'dealer') { dealerStep(); return; }
}
function afterDeal() {
  // side bets are decided at once
  for (const n in T.seats) {
    const S = T.seats[n], c = S.hands[0].cards, up = T.dealer.cards[0]; S.sres = {};
    if (S.side.pp) { const r = B.perfectPairs(c[0], c[1]); S.sres.pp = r ? { net: S.side.pp * r.pay, k: r.k } : { net: -S.side.pp }; }
    if (S.side.t3) { const r = B.twentyOne3(c[0], c[1], up); S.sres.t3 = r ? { net: S.side.t3 * r.pay, k: r.k } : { net: -S.side.t3 }; }
    for (const k in S.sres) { const r = S.sres[k]; if (r.net > 0) { if (S.me) T.bank += S.side[k] + r.net; else botState(B_ID(S.bot)).bank += S.side[k] + r.net; } }
  }
  const upV = B.VAL(T.dealer.cards[0]);
  if (upV === 1) {
    // insurance: the bots decide now, you in the bar
    for (const n in T.seats) { const S = T.seats[n]; if (S.me) continue; const b = B_ID(S.bot), st = botState(b), h = S.hands[0];
      const take = b.style === 'martin' || (b.style === 'count' && trueCount() >= 3); const amt = Math.floor(h.bet / 2);
      if (take && amt <= st.bank) { st.bank -= amt; S.ins = amt; } }
    T.phase = 'ins'; render(); return;
  }
  afterIns();
}
const B_ID = id => BOTS.find(b => b.id === id);
function takeIns(yes) {
  if (!T || T.phase !== 'ins') return;
  const S = T.seats[ME], amt = Math.floor(S.hands[0].bet / 2);
  if (yes) { if (amt > T.bank) { toast(t('toast.noMoney')); return; } T.bank -= amt; S.ins = amt; sfx('chip'); }
  // the coach: insurance by the cards left
  const p = unseenP(), ev = 3 * p[10] - 1;
  T.dec.push({ k: 'ins', yes: !!yes, ev, best: ev > 0 ? 'yes' : 'no', loss: yes && ev < 0 ? -ev * .5 : !yes && ev > 0 ? ev * .5 : 0, cards: S.hands[0].cards.slice() });
  T.session.mis += (yes && ev < 0 ? -ev * amt : 0);
  afterIns();
}
function afterIns() {
  const upV = B.VAL(T.dealer.cards[0]);
  // peek: with an ace or a ten up the dealer checks the hole card; a blackjack ends the round
  if (T.R.peek && (upV === 1 || upV === 10) && B.isBJ(T.dealer.cards)) { T.dealer.open = true; see(T.dealer.cards[1]); sfx('flip'); T.note = 'dbj'; settle(); return; }
  T.phase = 'play'; T.cur = null; nextHand();
}
// move the cursor to the next hand that needs a decision
function nextHand() {
  let s = T.cur ? T.cur.s : null, h = T.cur ? T.cur.h + 1 : 0, i = s == null ? 0 : PLAY_ORDER.indexOf(s);
  for (; i < PLAY_ORDER.length; i++, h = 0) {
    const n = PLAY_ORDER[i], S = T.seats[n]; if (!S) continue;
    for (; h < S.hands.length; h++) {
      const H = S.hands[h];
      if (H.done) continue;
      if (H.cards.length === 2 && !H.split && B.isBJ(H.cards)) { H.done = true; continue; }
      T.cur = { s: n, h };
      if (H.cards.length === 1) { const c = draw(); H.cards.push(c); see(c); sfx('deal'); if (H.sa && !T.R.hsa) H.done = true; if (B.hv(H.cards).t >= 21) H.done = true; render(); if (H.done) { schedule(380); return; } }
      if (S.me) { T.phase = 'play'; render(); if (T.tut && window.BJTut) BJTut.ev('turn'); return; }
      render(); schedule(560); return;
    }
  }
  T.cur = null; T.phase = 'dealer'; render(); schedule(520);
}
function playStep() {
  if (!T.cur) { nextHand(); return; }
  const S = T.seats[T.cur.s], H = S.hands[T.cur.h];
  if (H.done) { nextHand(); return; }
  if (S.me) return;   // waiting for you
  const b = B_ID(S.bot), ctx = ctxOf(S, H), A = B.allowed(H.cards, T.R, ctx), up = T.dealer.cards[0];
  let m = b.style === 'nobust' ? B.STRATS.nobust(H.cards, B.VAL(up), T.R, ctx) : B.basicMove(H.cards, B.VAL(up), T.R, ctx);
  if (!A[m]) m = A.H && B.hv(H.cards).t < 17 ? 'H' : 'S';
  const st = botState(b);
  if ((m === 'D' && !A.FD) || (m === 'P' && !A.FP)) { if (st.bank < H.bet) m = A.H && B.hv(H.cards).t < 17 ? 'H' : 'S'; }
  act(S, H, m, true);
}
const ctxOf = (S, H) => ({ nHands: S.hands.length, split: !!H.split, splitAces: !!H.sa });
// apply a move to a hand (yours or a bot's)
function act(S, H, m, bot) {
  const A = B.allowed(H.cards, T.R, ctxOf(S, H));
  if (!A[m]) return false;
  const pay = x => { if (S.me) T.bank -= x; else botState(B_ID(S.bot)).bank -= x; };
  S.say = { m: A.FD && m === 'D' ? 'FD' : A.FP && m === 'P' ? 'FP' : m, k: T.round + ':' + (S.sayN = (S.sayN || 0) + 1) };
  if (m === 'S') { H.done = true; }
  else if (m === 'H') { const c = draw(); H.cards.push(c); see(c); sfx('deal'); if (B.hv(H.cards).t >= 21) H.done = true; }
  else if (m === 'D') {
    if (A.FD) H.free += H.bet || H.free; else { pay(H.bet); H.bet *= 2; }
    H.dbl = true; const c = draw(); H.cards.push(c); see(c); sfx('chip'); H.done = true;
  }
  else if (m === 'P') {
    const c2 = H.cards.pop(), sa = B.VAL(c2) === 1;
    const nh = { cards: [c2], bet: A.FP ? 0 : H.bet, free: A.FP ? (H.bet || H.free) : 0, split: true, sa };
    if (!A.FP) pay(H.bet);
    H.split = true; H.sa = sa;
    S.hands.splice(S.hands.indexOf(H) + 1, 0, nh);
    const c = draw(); H.cards.push(c); see(c); sfx('chips');
    if ((sa && !T.R.hsa) || B.hv(H.cards).t >= 21) H.done = true;
  }
  else if (m === 'R') { H.surr = true; H.done = true; sfx('chip'); }
  render();
  if (H.done) schedule(bot ? 520 : 380); else if (bot) schedule(600);
  return true;
}
// your move (from the buttons / keys): graded against the basic strategy before it is made
function myMove(m) {
  if (!T || T.phase !== 'play' || !T.cur) return;
  const S = T.seats[T.cur.s]; if (!S || !S.me) return;
  const H = S.hands[T.cur.h], ctx = ctxOf(S, H), A = B.allowed(H.cards, T.R, ctx);
  if (!A[m]) return;
  if (T.tut && window.BJTut && !BJTut.allow({ a: 'move', m })) return;
  const up = B.VAL(T.dealer.cards[0]);
  const evB = B.moveEVs(H.cards, up, baseP().p, T.R, ctx), evN = B.moveEVs(H.cards, up, unseenP(), T.R, ctx);
  const best = B.bestOf(evB), bestN = B.bestOf(evN), loss = Math.max(0, evB[best] - evB[m]);
  const unit = H.bet || H.free || T.seats[ME].hands[0].bet;
  T.dec.push({ k: 'move', cards: H.cards.slice(), up, m, best, bestN, loss, ev: evB, evN, hand: T.cur.h, unit });
  if (!T.tut) T.session.mis += loss * unit;
  act(S, H, m, false);
  if (!H.done) render();
}
function dealerStep() {
  const d = T.dealer;
  const live = Object.values(T.seats).some(S => S.hands.some(H => !H.surr && B.hv(H.cards).t <= 21 && !(B.isBJ(H.cards) && !H.split)));
  if (T.R.enhc && d.cards.length === 1) { const c = draw(); d.cards.push(c); see(c); d.open = true; sfx('deal'); render(); schedule(620); return; }
  if (!d.open) { d.open = true; see(d.cards[1]); sfx('flip'); render(); schedule(620); return; }
  if (live && !B.isBJ(d.cards) && B.dealerHits(d.cards, T.R)) { const c = draw(); d.cards.push(c); see(c); sfx('deal'); render(); schedule(680); return; }
  settle();
}
function settle() {
  clearTimeout(G.timer);
  const d = T.dealer.cards, dbj = B.isBJ(d), S0 = T.session;
  let myNet = 0, myStake = 0;
  for (const n in T.seats) {
    const S = T.seats[n];
    let net = 0;
    S.hands.forEach(H => { const r = B.settleHand(H, d, T.R); H.res = r; net += r.net; if (S.me) { T.bank += H.bet + r.net; myStake += H.bet; } else botState(B_ID(S.bot)).bank += H.bet + r.net; });
    if (S.ins) { const r = dbj ? S.ins * 2 : -S.ins; S.insRes = r; net += r; if (r > 0) { if (S.me) T.bank += S.ins * 3; else botState(B_ID(S.bot)).bank += S.ins * 3; } }
    for (const k in (S.sres || {})) net += S.sres[k].net;
    S.net = Math.round(net * 100) / 100;
    if (S.me) myNet = S.net;
    else { const b = B_ID(S.bot), st = botState(b); if (b.style === 'martin') st.unit = S.net < 0 ? Math.min(st.unit * 2, 64) : S.net > 0 ? 1 : st.unit; }
  }
  T.bank = Math.round(T.bank * 100) / 100;
  const me = T.seats[ME], base = baseP();
  // the expected loss of this round: the rules' edge on the main bet, the side bets' edges, and the cost of your decisions
  const exp = -(me.hands[0] ? T.last.main * base.edge : 0) - (T.last.pp || 0) * base.side.pp - (T.last.t3 || 0) * base.side.t3 - T.dec.reduce((a, x) => a + x.loss * (x.unit || T.last.main), 0);
  S0.hands++; S0.net = Math.round((S0.net + myNet) * 100) / 100; S0.wag += betSum(T.last) + myStake - T.last.main; S0.exp += exp; S0.peak = Math.max(S0.peak, T.bank);
  S0.graph.push(S0.net); if (S0.graph.length > 400) S0.graph = S0.graph.filter((_, i) => i % 2 === 0);
  if (!T.tut) recordStats(me, myNet, exp);
  T.res = { net: myNet, exp, dbj }; T.lastRound = { tot: betSum(T.last), net: myNet };
  T.phase = 'done'; T.bets = {};
  T.shoe.n++;
  const kinds = me.hands.map(H => H.res.kind);
  sfx(kinds.includes('bj') ? 'bj' : myNet > 0 ? (myNet >= 1000 ? 'bigchips' : 'win') : myNet < 0 ? 'lose' : 'chips');
  if (T.bank < MIN_BET) { T.bank = START; S0.rebuys++; toast(t('toast.rebuy', { n: fmt(START) })); }
  if (!T.tut) D.chips = T.bank;
  save(); render();
  if (T.tut && window.BJTut) { setTimeout(() => BJTut.ev('done'), Math.round(900 * (mt() || .5))); return; }
  if (set.autoNext) G.timer = setTimeout(nextRound, Math.round(3000 * (mt() || .4)));
}
function nextRound() {
  clearTimeout(G.timer); if (!T || T.phase !== 'done') return;
  T.disc = (T.disc || 0) + Object.values(T.seats).reduce((a, S) => a + S.hands.reduce((x, H) => x + H.cards.length, 0), 0) + (T.dealer ? T.dealer.cards.length : 0);
  clearRound(); T.phase = 'bet';
  if (T.shoe.pos >= T.shoe.cut) { freshShoe(); sfx('shuffle'); toast(t('toast.newShoe')); }
  botsBet(); save(); render();
}

/* ---------------- statistics ---------------- */
function statOf(v) { return D.stats[v] || (D.stats[v] = {}); }
function recordStats(me, net, exp) {
  const S = statOf(T.v);
  S.hands = (S.hands || 0) + 1; S.net = Math.round(((S.net || 0) + net) * 100) / 100; S.wag = (S.wag || 0) + betSum(T.last); S.exp = (S.exp || 0) + exp;
  S.k = S.k || {}; me.hands.forEach(H => { S.k[H.res.kind] = (S.k[H.res.kind] || 0) + 1; });
  S.moves = (S.moves || 0) + T.dec.filter(d => d.k === 'move').length; S.right = (S.right || 0) + T.dec.filter(d => d.k === 'move' && d.loss < 1e-9).length;
  S.mis = Math.round(((S.mis || 0) + T.dec.reduce((a, x) => a + x.loss * (x.unit || T.last.main), 0)) * 100) / 100;
  S.dbust = (S.dbust || 0) + (B.hv(T.dealer.cards).t > 21 ? 1 : 0);
  S.side = S.side || { pp: { n: 0, net: 0 }, t3: { n: 0, net: 0 } };
  for (const k in (me.sres || {})) { S.side[k].n++; S.side[k].net = Math.round((S.side[k].net + me.sres[k].net) * 100) / 100; }
  S.graph = S.graph || [0]; S.graph.push(S.net); if (S.graph.length > 300) S.graph = S.graph.filter((_, i) => i % 2 === 0);
}

/* ---------------- rendering ---------------- */
const LAB = { pp: 'PERFECT PAIRS', t3: '21+3' };
const MOVES = ['H', 'S', 'D', 'P', 'R'];
const mName = m => t('m.' + m);
// table geometry (px of the table box): seats along a curve near the bottom, the dealer at the top
function geom(W, H) {
  const mob = W < 560;
  const u = Math.max(34, Math.min(mob ? 92 : 150, H / (mob ? 4.6 : 5.0), W / (mob ? 5.1 : 5.6)));
  // a tall table (more height than the cards need): the dealer comes down, the seats come up and curve more
  const extra = Math.max(0, H - u * (mob ? 4.6 : 5.0));
  const share = SEATS.map(n => n === ME ? (mob ? 1.7 : 1.55) : 1), tot = share.reduce((a, b) => a + b, 0), pad = mob ? 4 : u * .5;
  let x = pad; const seats = SEATS.map((n, i) => { const w = share[i] / tot * (W - 2 * pad), cx = x + w / 2; x += w; return { n, x: cx, w }; });
  const plateH = mob ? 38 : Math.max(38, u * .4), r = mob ? Math.min(u * .4, 30) : u * .42, ybot = H - plateH - r - (mob ? 6 : u * .1) - extra * .3;
  const curve = (mob ? u * .45 : u * .85) + extra * .07;
  seats.forEach(s => { const f = (s.x - W / 2) / (W / 2); s.y = ybot - curve * f * f; s.r = s.n === ME ? r : r * (mob ? .78 : .8); });
  const dealerY = (mob ? u * .14 : u * .18) + extra * .22, dcw = u * (mob ? .82 : .78);
  return { mob, u, seats, r, plateH, dealerY, dcw, dealerBot: dealerY + dcw * 1.4, W, H };
}
function cardEl(c, x, y, w, k, o) {
  o = o || {};
  const down = !!o.down, h = w * 1.4;
  let html = Cards.html(down ? c : c, { down, cls: 'bj-cd' + (o.cls ? ' ' + o.cls : '') });
  return html.replace('<span class="cd', `<span data-k="${k}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;--cw:${w.toFixed(1)}px;--chh:${h.toFixed(1)}px;--fx:${(o.fx || 0).toFixed(0)}px;--fy:${(o.fy || 0).toFixed(0)}px" class="cd`);
}
const totTxt = cs => { const V = B.hv(cs); if (cs.length === 2 && V.t === 21) return 'BJ'; return V.soft && V.t < 21 ? (V.t - 10) + '/' + V.t : String(V.t); };
function resLab(r) { return t('rk.' + r.kind) + (r.bonus ? ' ★' : ''); }
function render() {
  if (!T) return;
  const box = $('#bjTable'), bw = $('#boardWrap');
  const pcCol = matchMedia(PCQ).matches;
  if (pcCol && bw.style.height) { bw.style.height = ''; bw.style.maxHeight = ''; }
  let W = box.clientWidth, Hh = box.clientHeight;
  if (!pcCol) {   // phones / tablets: the table is as tall as it needs, within what the screen leaves for it
    const sc = $('.stage'), rail = (bw.offsetHeight - Hh) / 2;
    const ab = Math.max(120, $('#actbar').offsetHeight);
    const avail = Math.min(innerWidth * 1.45, 720, Math.max(300, (sc ? sc.clientHeight : innerHeight) - ab - (parseFloat(getComputedStyle(sc).paddingTop) || 0) - (parseFloat(getComputedStyle(sc).rowGap) || 10) - 14 - (G.fitAdj || 0)));
    const need = Math.round(Math.min(avail, Math.max(330, Math.min(innerWidth, 760) * (innerWidth < 560 ? 1.12 : .8)))); if (Math.abs((parseFloat(bw.style.height) || 0) - need) > 2) { bw.style.height = need + 'px'; bw.style.maxHeight = 'none'; }
    Hh = box.clientHeight; W = box.clientWidth; void rail;
  }
  const g = geom(W, Hh), u = g.u, done = T.phase === 'done';
  box.classList.toggle('mob', g.mob);
  box.style.setProperty('--u', u + 'px');
  const shoeX = W - (g.mob ? u * .5 : u * .9), shoeY = g.mob ? u * .3 : u * .4;
  const R0 = T.R;
  // the felt print
  const cx = W / 2, arcR = W * (g.mob ? .7 : .62), y1 = g.dealerBot + u * (g.mob ? .36 : .42);
  // a smile-shaped arc whose lowest point (the middle) is at y
  const arcAt = (y, rr) => { rr = rr || arcR; const span = Math.min(.95, (W * .44) / rr), cy0 = y - rr; const x1 = cx - rr * Math.sin(span), yy = cy0 + rr * Math.cos(span), x2 = cx + rr * Math.sin(span); return `M${x1.toFixed(1)} ${yy.toFixed(1)}A${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 0 ${x2.toFixed(1)} ${yy.toFixed(1)}`; };
  const fs1 = Math.max(10, u * .2), fs2 = Math.max(8, u * .12);
  const line1 = `BLACKJACK PAYS ${R0.bj === 1.2 ? '6 TO 5' : '3 TO 2'}`;
  const line2 = R0.free ? 'DEALER 22 PUSHES' : R0.spanish ? 'PLAYER 21 ALWAYS WINS' : R0.h17 ? 'DEALER MUST HIT SOFT 17' : 'DEALER MUST STAND ON ALL 17s';
  const yIns = y1 + u * (g.mob ? .5 : .56);
  let svg = `<path id="bjA1" d="${arcAt(y1)}" fill="none"/><path id="bjA2" d="${arcAt(y1 + fs2 * 1.9)}" fill="none"/><path id="bjA3" d="${arcAt(yIns + fs2 * .36, arcR + u * .4)}" fill="none"/>` +
    `<text class="bj-p1" style="font-size:${fs1.toFixed(1)}px"><textPath href="#bjA1" startOffset="50%">${line1}</textPath></text>` +
    `<text class="bj-p2" style="font-size:${fs2.toFixed(1)}px"><textPath href="#bjA2" startOffset="50%">${line2}</textPath></text>` +
    `<path class="bj-ins" d="${arcAt(yIns, arcR + u * .4)}" fill="none" style="stroke-width:${(fs2 * 2.3).toFixed(1)}px"/>` +
    `<text class="bj-p3" style="font-size:${(fs2 * .95).toFixed(1)}px"><textPath href="#bjA3" startOffset="50%">INSURANCE PAYS 2 TO 1</textPath></text>`;
  let html = '';
  // seats: betting circles, side spots, chips, plates
  const meBets = T.phase === 'bet' ? T.bets : (T.last || {});
  g.seats.forEach(s => {
    const n = s.n, me = n === ME, b = me ? null : botOf(n), St = T.seats[n];
    const bets = me ? (T.phase === 'bet' ? meBets : { main: St ? St.hands.reduce((a, H) => a + H.bet, 0) : 0, pp: St ? St.side.pp : 0, t3: St ? St.side.t3 : 0 })
      : (T.phase === 'bet' ? (T.botBets && T.botBets[b.id]) || {} : St ? { main: St.hands.reduce((a, H) => a + H.bet, 0), pp: St.side.pp, t3: St.side.t3 } : {});
    const act = T.cur && T.cur.s === n && T.phase === 'play';
    const net = done && St ? St.net : null, st = net == null ? '' : net > 0 ? ' won' : net < 0 ? ' lost' : ' push';
    svg += `<g class="bj-seat${me ? ' me' : ''}${act ? ' act' : ''}${st}" data-k="seat${n}">`;
    svg += `<circle class="bj-c" cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(1)}"${me ? ' data-spot="main"' : ''}/>`;
    if (me && T.phase === 'bet' && !bets.main) svg += `<text class="bj-ct" x="${s.x.toFixed(1)}" y="${(s.y + s.r * .14).toFixed(1)}" style="font-size:${(s.r * .34).toFixed(1)}px">BET</text>`;
    if (bets.main) svg += `<g class="bj-ch">${chipsAt(bets.main, s.x, s.y + s.r * .5, s.r * (me ? 1.05 : .95))}</g>`;
    // side spots: two small circles in front of the main one
    SIDES().forEach((k, i) => {
      const sx = s.x + (i === 0 && SIDES().length > 1 ? -1 : 1) * s.r * (g.mob ? .95 : 1.25) * (SIDES().length > 1 ? 1 : 0) + (SIDES().length === 1 ? s.r * 1.25 : 0), sy = s.y - s.r * (g.mob ? 1.08 : 1.05), rr = s.r * (g.mob ? .36 : .4);
      const sr = done && St && St.sres && St.sres[k] ? St.sres[k] : null;
      svg += `<g class="bj-sd sd-${k}${sr ? (sr.net > 0 ? ' won' : ' lost') : ''}"${me ? ` data-spot="${k}"` : ''}><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${rr.toFixed(1)}"/>` +
        (me && !bets[k] && !g.mob ? `<text x="${sx.toFixed(1)}" y="${(sy + rr * .14).toFixed(1)}" style="font-size:${(rr * .42).toFixed(1)}px">${k === 'pp' ? 'PP' : '21+3'}</text>` : me && !bets[k] ? `<text x="${sx.toFixed(1)}" y="${(sy + rr * .16).toFixed(1)}" style="font-size:${(rr * .5).toFixed(1)}px">${k === 'pp' ? 'PP' : '21+3'}</text>` : '') +
        (bets[k] ? chipsAt(bets[k], sx, sy + rr * .5, rr * 1.5) : '') + `</g>`;
    });
    // insurance chips on the band
    if (St && St.ins) svg += `<g class="bj-ch">${chipsAt(St.ins, s.x + s.r * .2, s.y - s.r * 2.1, s.r * .7)}</g>`;
    svg += `</g>`;
    // plate
    const bank = me ? fmt(T.bank - (T.phase === 'bet' ? betSum(T.bets) : 0)) : (g.mob ? kfmt(botState(b).bank) : fmt(botState(b).bank));
    html += `<div class="bj-pl${me ? ' me' : ''}${act ? ' act' : ''}${st}" data-k="pl${n}" style="left:${s.x.toFixed(1)}px;top:${(s.y + s.r + (g.mob ? 3 : u * .08)).toFixed(1)}px;max-width:${(s.w - 4).toFixed(0)}px">` +
      `<b>${me ? 'YOU' : esc(b.name)}</b>${net != null && net !== 0 ? `<em class="${net > 0 ? 'pos' : 'neg'}">${sg(net)}</em>` : `<small>${bank}</small>`}</div>`;
    // cards: a cascade above the circle; split hands side by side
    if (St) {
      const cw = me ? u * (St.hands.length > 2 ? .6 : St.hands.length > 1 ? (g.mob ? .66 : .72) : (g.mob ? 1 : .86)) : u * (g.mob ? .52 : .56);
      const dx = cw * (me ? .36 : .3), dy = cw * 1.4 * (me ? .1 : .14);
      const widths = St.hands.map(H => cw + Math.max(0, H.cards.length - 1) * dx), gap = u * .14;
      const totalW = widths.reduce((a, b) => a + b, 0) + gap * (St.hands.length - 1);
      let hx = Math.max(2, Math.min(W - totalW - 2, s.x - totalW / 2));
      St.hands.forEach((H, hi) => {
        const nC = H.cards.length, baseY = s.y - s.r - (SIDES().length ? s.r * .9 : 0) - u * (g.mob ? .12 : .14) - cw * 1.4;
        const isCur = act && T.cur.h === hi;
        H.cards.forEach((c, k) => {
          const x = hx + k * dx, y = baseY - k * dy;
          html += cardEl(c, x, y, cw, `c${T.round}-${n}-${hi}-${k}-${c}`, { cls: (isCur ? 'cur' : '') + (H.res && (H.res.kind === 'bust' || H.res.kind === 'lose' || H.res.kind === 'dbj' || H.res.kind === 'surr') ? ' dim' : ''), fx: shoeX - x, fy: shoeY - y });
        });
        if (nC) {
          const tx = hx + (nC - 1) * dx + cw * .5, ty = baseY - (nC - 1) * dy - (g.mob ? 12 : 14);
          const V = B.hv(H.cards), bust = V.t > 21, bj = nC === 2 && !H.split && V.t === 21;
          html += `<span class="bj-tot${bust ? ' bust' : bj ? ' bj' : ''}${isCur ? ' cur' : ''}${me ? ' me' : ''}" data-k="t${n}-${hi}" style="left:${tx.toFixed(1)}px;top:${ty.toFixed(1)}px">${bj ? 'BJ' : bust ? 'BUST' : totTxt(H.cards)}${H.dbl ? '<i>×2</i>' : ''}${H.free ? '<i class="fr">FREE</i>' : ''}</span>`;
          if (H.res) html += `<span class="bj-res r-${H.res.kind}${me ? ' me' : ''}" data-k="r${n}-${hi}" style="left:${(hx + (nC - 1) * dx / 2 + cw / 2).toFixed(1)}px;top:${(baseY + cw * 1.4 * .55).toFixed(1)}px">${esc(resLab(H.res))}</span>`;
        }
        hx += widths[hi] + gap;
      });
      if (St.say && T.phase === 'play' && !me) html += `<span class="bj-say" data-k="say${n}-${St.say.k}" style="left:${s.x.toFixed(1)}px;top:${(s.y - s.r - u * .3).toFixed(1)}px">${esc(mName(St.say.m))}</span>`;
    }
  });
  // the dealer
  if (T.dealer) {
    const d = T.dealer, cw = g.dcw, sp = cw * .62, n = d.cards.length;
    const wtot = cw + (Math.max(1, n) - 1) * sp, x0 = W / 2 - wtot / 2;
    d.cards.forEach((c, k) => { const x = x0 + k * sp, y = g.dealerY; html += cardEl(c, x, y, cw, `d${T.round}-${k}-${c}`, { down: k === 1 && !d.open, fx: shoeX - x, fy: shoeY - y }); });
    if (d.cards.length) {
      const vis = d.open ? d.cards : [d.cards[0]], V = B.hv(vis), bj = d.open && B.isBJ(d.cards);
      html += `<span class="bj-tot dl${V.t > 21 ? ' bust' : ''}${bj ? ' bj' : ''}" data-k="dt" style="left:${(x0 + wtot + (g.mob ? 16 : 22)).toFixed(1)}px;top:${(g.dealerY + cw * .7).toFixed(1)}px">${bj ? 'BJ' : V.t > 21 ? 'BUST' : totTxt(vis)}</span>`;
    }
  }
  // the message in the middle (insurance / result)
  let mid = '';
  if (T.phase === 'ins') mid = `<div class="bj-msg" data-k="msgi"><b>${esc(t(B.isBJ(T.seats[ME].hands[0].cards) ? 'ins.evenQ' : 'ins.q'))}</b></div>`;
  else if (done && T.res) {
    const r = T.res, me = T.seats[ME], k = me.hands.length === 1 ? me.hands[0].res.kind : null;
    mid = `<div class="bj-msg res${r.net > 0 ? ' pos' : r.net < 0 ? ' neg' : ''}" data-k="msg${T.round}"><b>${esc(k === 'bj' ? t('rs.bj') : r.dbj ? t('rs.dbj') : r.net > 0 ? t('rs.win') : r.net < 0 ? t('rs.lose') : t('rs.push'))}</b><span>${esc(r.net ? sg(r.net) : t('res.even'))}</span></div>`;
  }
  const left = T.shoe.cards.length - T.shoe.pos, pctL = left / T.shoe.cards.length;
  html += `<div class="bj-mid" data-k="mid" style="top:${(g.dealerBot + u * .3).toFixed(1)}px">${mid}</div>`;
  html += `<div class="bc-shoe bj-shoe" data-k="shoe" title="${esc(t('shoe.left', { n: left }))}"><span class="bc-shoe-box"><i style="height:${(pctL * 100).toFixed(1)}%"></i><em class="cut" style="bottom:${((T.shoe.cards.length - T.shoe.cut) / T.shoe.cards.length * 100).toFixed(1)}%"></em></span><small><i>SHOE</i>${left}</small></div>`;
  patch(box, `<svg class="bj-svg" data-k="svg" viewBox="0 0 ${W.toFixed(0)} ${Hh.toFixed(0)}" width="${W.toFixed(0)}" height="${Hh.toFixed(0)}">${svg}</svg>` + html);
  box.querySelectorAll('[data-spot]').forEach(el => { el.onclick = () => placeBet(el.dataset.spot); el.onmouseenter = e => spotTip(el.dataset.spot, e); el.onmousemove = e => spotTip(el.dataset.spot, e); el.onmouseleave = () => spotTip(null);
    el.oncontextmenu = e => { e.preventDefault(); if (T.phase !== 'bet' || !T.bets[el.dataset.spot]) return; delete T.bets[el.dataset.spot]; G.undo = G.undo.filter(x => x[0] !== el.dataset.spot); render(); }; });
  renderActbar(); renderSide(); renderNums();
  // phones: the action bar must end above the screen bottom (no scrolling to bet)
  if (!G.reFit && !pcCol && (T.phase === 'bet' || T.phase === 'play')) {
    const sc = $('.stage'), ab = $('#actbar').getBoundingClientRect(), lim = sc.getBoundingClientRect().bottom - 6, over = ab.bottom + sc.scrollTop - lim;
    if (sc.scrollTop < 2 && (over > 1 || (over < -10 && G.fitAdj > 0))) { G.fitAdj = Math.max(0, (G.fitAdj || 0) + Math.ceil(over) + (over < 0 ? 4 : 0)); G.reFit = 1; render(); G.reFit = 0; }
  }
}
/* hover (mouse): what a betting spot is */
let tipEl = null;
function spotTip(k, e) {
  if (!matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'sp-tip'; document.body.appendChild(tipEl); }
  if (!k) { tipEl.classList.remove('show'); return; }
  if (tipEl.dataset.k !== k + T.v + LANG) {
    tipEl.dataset.k = k + T.v + LANG;
    const base = baseP(), edge = k === 'main' ? base.edge : base.side[k];
    tipEl.innerHTML = `<b>${k === 'main' ? 'BLACKJACK' : LAB[k]}</b><small>${esc(t('sp.' + k))}</small><p>${esc(t('sp.d.' + k))}</p>` +
      `<div class="sp-tip-r"><span>${esc(t('tl.pay'))}<em>${esc(t('pay.' + k, { b: T.R.bj === 1.2 ? '6:5' : '3:2' }))}</em></span><span>${esc(t('tl.edge'))}<em>${pct(edge)}</em></span></div>`;
  }
  tipEl.classList.add('show');
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let x = e.clientX + 16, y = e.clientY + 18; if (x + w > innerWidth - 8) x = e.clientX - w - 16; if (y + h > innerHeight - 8) y = e.clientY - h - 14;
  tipEl.style.left = Math.max(8, x) + 'px'; tipEl.style.top = Math.max(8, y) + 'px';
}

/* ---------------- action bar ---------------- */
function myHand() { if (!T.cur || T.phase !== 'play') return null; const S = T.seats[T.cur.s]; return S && S.me ? { S, H: S.hands[T.cur.h] } : null; }
function renderActbar() {
  const bar = $('#actbar');
  if (T.phase === 'deal' || T.phase === 'dealer' || (T.phase === 'play' && !myHand())) { patch(bar, `<div class="ab-msg wait">${esc(t(T.phase === 'dealer' ? 'w.dealer' : T.phase === 'deal' ? 'dealing' : 'w.others'))}</div>`); return; }
  if (T.phase === 'ins') {
    const S = T.seats[ME], amt = Math.floor(S.hands[0].bet / 2), even = B.isBJ(S.hands[0].cards);
    patch(bar, `<div class="ab-msg">${esc(t(even ? 'ins.evenD' : 'ins.d', { n: fmt(amt) }))}</div><div class="ab-btns main"><button class="abtn" id="abNoIns" data-k="ni">${esc(t('ins.no'))}<kbd>N</kbd></button><button class="abtn go" id="abIns" data-k="yi">${esc(t(even ? 'ins.even' : 'ins.yes'))}<kbd>Y</kbd></button></div>`);
    $('#abIns').onclick = () => takeIns(true); $('#abNoIns').onclick = () => takeIns(false); return;
  }
  if (T.phase === 'play') {
    const { S, H } = myHand(), A = B.allowed(H.cards, T.R, ctxOf(S, H)), kb = { H: 'H', S: 'S', D: 'D', P: 'P', R: 'R' };
    const lab = m => m === 'D' && A.FD ? t('m.FD') : m === 'P' && A.FP ? t('m.FP') : mName(m);
    const btn = m => `<button class="abtn mv mv-${m}" data-mv="${m}" data-k="mv${m}"${A[m] ? '' : ' disabled'}>${esc(lab(m))}<kbd>${kb[m]}</kbd></button>`;
    patch(bar, `<div class="ab-btns main mvs">${MOVES.filter(m => m !== 'R' || T.R.surr).map(btn).join('')}</div>`);
    bar.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => myMove(b.dataset.mv));
    return;
  }
  if (T.phase === 'done') {
    patch(bar, `<div class="ab-btns main"><button class="abtn" id="abRe" data-k="re">${esc(t('btn.rebetDeal'))}<kbd>R</kbd></button><button class="abtn go" id="abNext" data-k="nx">${esc(t('next'))}<kbd>Space</kbd></button></div>`);
    $('#abNext').onclick = () => T.tut && window.BJTut ? BJTut.finish() : nextRound(); $('#abRe').onclick = () => { if (T.tut) { window.BJTut && BJTut.finish(); return; } nextRound(); rebet(1); if (betSum(T.bets)) deal(); };
    return;
  }
  const tot = betSum(T.bets);
  const rack = DENOMS.map(d => `<button type="button" class="bc-chip${set.chip === d ? ' sel' : ''}" data-d="${d}" data-k="ch${d}" title="${d}">${chipTop(d, set.chip === d)}</button>`).join('');
  patch(bar, `<div class="bc-rack">${rack}</div><div class="bc-bal"><small>${esc(t('bank'))}</small><b>${fmt(T.bank - tot)}</b><em${tot ? '' : ' class="off"'}>${esc(t('onTable', { n: fmt(tot) }))}</em></div>` +
    `<div class="ab-btns main"><button class="abtn" id="abUndo" data-k="un"${G.undo.length ? '' : ' disabled'}>${esc(t('btn.undo'))}<kbd>Z</kbd></button><button class="abtn" id="abClr" data-k="cl"${tot ? '' : ' disabled'}>${esc(t('btn.clear'))}</button>` +
    `<button class="abtn" id="abRebet" data-k="rb"${T.last && !tot ? '' : ' disabled'}>${esc(t('btn.rebet'))}<kbd>R</kbd></button><button class="abtn" id="abX2" data-k="x2"${tot || T.last ? '' : ' disabled'}>×2</button>` +
    `<button class="abtn go" id="abDeal" data-k="dl"${(T.bets.main || 0) >= MIN_BET ? '' : ' disabled'}>${esc(t('btn.deal'))}<kbd>Space</kbd></button></div>`);
  bar.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { if (tutNo()) return; set.chip = +b.dataset.d; save(); sfx('chip'); renderActbar(); });
  $('#abUndo').onclick = unplace; $('#abClr').onclick = clearBets; $('#abRebet').onclick = () => rebet(1); $('#abX2').onclick = () => rebet(2); $('#abDeal').onclick = deal;
}

/* ---------------- side panel ---------------- */
const CH_UP = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const CH_ROWS = { h: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17], s: [2, 3, 4, 5, 6, 7, 8, 9], p: [2, 3, 4, 5, 6, 7, 8, 9, 10, 1] };
const rowLab = (k, x) => k === 'h' ? String(x) : k === 's' ? 'A,' + x : (x === 1 ? 'A,A' : x === 10 ? 'T,T' : x + ',' + x);
const cellCls = c => 'cc-' + c.toLowerCase();
const cellTxt = c => ({ H: 'H', S: 'S', D: 'D', Ds: 'Ds', P: 'P', R: 'R', Rs: 'Rs', Rp: 'Rp' })[c] || c;
// which chart cell the current hand is in
function curCell() {
  const mh = myHand(); if (!mh) return null;
  const { S, H } = mh, V = B.hv(H.cards), up = B.VAL(T.dealer.cards[0]), upI = up === 1 ? 11 : up;
  if (H.cards.length === 2 && B.isPair(H.cards) && S.hands.length < T.R.maxHands) return { k: 'p', x: B.VAL(H.cards[0]), up: upI };
  if (V.soft && V.t <= 20) return { k: 's', x: V.t - 11, up: upI };
  return { k: 'h', x: Math.max(5, Math.min(17, V.t)), up: upI };
}
function chartHtml(Rr, kind, hl, cls) {
  const rows = CH_ROWS[kind];
  return `<table class="bj-chart${cls ? ' ' + cls : ''}"><tr><th></th>${CH_UP.map(u => `<th class="${hl && hl.up === u ? 'hl' : ''}">${u === 11 ? 'A' : u}</th>`).join('')}</tr>` +
    rows.map(x => `<tr><th class="${hl && hl.x === x ? 'hl' : ''}">${rowLab(kind, x)}</th>${CH_UP.map(u => { const c = B.chartCell(Rr, kind, x, u); return `<td class="${cellCls(c)}${hl && hl.x === x && hl.up === u ? ' on' : ''}">${cellTxt(c)}</td>`; }).join('')}</tr>`).join('') + `</table>`;
}
function renderSide() {
  let h = '';
  const base = baseP(), left = T.shoe.cards.length - T.shoe.pos, tc = trueCount();
  // the shoe and the count
  const nv = B.vcounts(T.shoe.cards, T.shoe.pos), full = B.fullCounts(T.R), frac = left / T.shoe.cards.length;
  const barV = v => { const exp = full[v] * frac, r = exp ? nv[v] / exp : 1; return `<div class="cmp-c"><i style="height:${Math.min(100, r * 50).toFixed(0)}%" class="${r > 1.08 ? 'hi' : r < .92 ? 'lo' : ''}"></i><small>${v === 1 ? 'A' : v === 10 ? 'T' : v}</small></div>`; };
  const showC = !!set.count, se = shoeEdge();
  h += `<div class="card shoe-card" data-pt="shoe" data-k="shoe"><h3>${esc(t('side.shoe'))}<span class="h3s">${esc(t('shoe.left', { n: left }))} · ${esc(t('shoe.decks', { n: decksLeft().toFixed(1) }))}</span><button type="button" class="rd-zoom" id="cntTgl">${esc(t(showC ? 'cnt.hide' : 'cnt.show'))}</button></h3>` +
    (showC ? `<div class="pr3 bj-cnt"><div class="pB"><small>${esc(t('cnt.rc'))}</small><b>${T.rc > 0 ? '+' : ''}${T.rc}</b></div><div class="pP"><small>${esc(t('cnt.tc'))}</small><b>${tc > 0 ? '+' : ''}${tc.toFixed(1)}</b></div><div class="pT"><small>${esc(t('cnt.edge'))}</small><b class="${se < 0 ? 'pos' : ''}">${spct(-se, 2)}</b></div></div>` +
      `<div class="cmp">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(barV).join('')}</div><p class="diff-desc">${esc(t('cnt.help', { e: pct(base.edge) }))}</p>`
      : `<p class="muted">${esc(t('cnt.hidden'))}</p>`) + `</div>`;
  // the basic strategy chart
  const cc = curCell(), ck = cc ? cc.k : (set.chK || 'h');
  h += `<div class="card chart-card" data-pt="chart" data-k="chart"><h3>${esc(t('side.chart'))}<span class="h3s">${esc(vName(T.v))}</span><span class="rd-hb"><button type="button" class="rd-help" id="chHelp" aria-label="?" title="?">?</button></span></h3>` +
    `<div class="ch-tabs">${['h', 's', 'p'].map(k => `<button type="button" data-chk="${k}" class="${k === ck ? 'sel' : ''}">${esc(t('ch.' + k))}</button>`).join('')}</div>` +
    chartHtml(T.R, ck, cc && cc.k === ck ? cc : null) + `<div class="ch-leg">${['H', 'S', 'D', 'P', 'R'].filter(m => m !== 'R' || T.R.surr).map(m => `<span class="${cellCls(m)}"><i>${m}</i>${esc(mName(m))}</span>`).join('')}</div></div>`;
  // coach
  if (set.coach) h += `<div class="card coach-card" data-pt="coach" data-k="coach"><h3>${esc(t('side.coach'))}</h3>${coachHtml()}</div>`;
  else h += `<div class="card coach-card ck-off" data-pt="coach" data-k="coach"><h3>${esc(t('side.coach'))}</h3><p class="muted">${esc(t('coach.off'))}</p></div>`;
  // session
  const S = T.session, pcCol = matchMedia(PCQ).matches;
  const cells = `<div><small>${esc(t('ss.hands'))}</small><b>${S.hands}</b></div><div><small>${esc(t('ss.net'))}</small><b class="${S.net > 0 ? 'pos' : S.net < 0 ? 'neg' : ''}">${sg(S.net)}</b></div>` +
    `<div><small>${esc(t('ss.wag'))}</small><b>${fmt(S.wag)}</b></div><div><small>${esc(t('ss.exp'))}</small><b class="neg">${sg(Math.round(S.exp))}</b></div>`;
  const btns = `<button class="sbtn" id="sStats">${esc(t('btn.stats'))}</button><button class="sbtn" id="sTools">${esc(t('btn.tools'))}</button>`;
  if (pcCol) patch($('#sessBar'), `<div class="sb-h"><b>${esc(t('side.session'))}</b><small>${esc(vName(T.v))}</small></div><div class="srow">${cells}<div><small>${esc(t('st.mis'))}</small><b class="${S.mis > 0 ? 'neg' : ''}">${sg(-Math.round(S.mis))}</b></div></div><div class="sb-btns">${btns}</div>`);
  else {
    $('#sessBar').innerHTML = '';
    h += `<div class="card" data-pt="sess" data-k="sess"><h3>${esc(t('side.session'))}<span class="h3s">${esc(vName(T.v))}</span></h3><div class="srow">${cells}</div>` +
      `<p class="diff-desc">${esc(t('ss.luck', { n: sg(Math.round(S.net - S.exp)), m: fmt(Math.round(S.mis)) }))}</p><div class="deal-row">${btns}</div></div>`;
  }
  patch($('#side'), h);
  $('#sStats').onclick = openStats; $('#sTools').onclick = () => window.BJTools && BJTools.open();
  $('#chHelp').onclick = () => window.BJTools && BJTools.open('chart');
  $('#cntTgl').onclick = () => { set.count = set.count ? 0 : 1; save(); renderSide(); };
  $$('#side [data-chk]').forEach(b => b.onclick = () => { set.chK = b.dataset.chk; save(); renderSide(); });
  const tm = $('#tipsMore'); if (tm) tm.onclick = () => { set.tipsOpen = set.tipsOpen ? 0 : 1; save(); renderSide(); };
  mTabs();
}

/* ---------------- coach ---------------- */
const GR = l => l < 1e-9 ? 'g' : l < .02 ? 'm' : 'b';   // ◎ best · △ small mistake (< 2% of the bet) · ✕ mistake
function evTable(ev, evN, best, bestN) {
  const ks = MOVES.filter(m => ev[m] !== undefined);
  return `<div class="ck-evs">${ks.map(m => `<div class="kv${m === best ? ' best' : ''}"><span>${esc(mName(m))}${m === best ? ' ◎' : ''}${m === bestN && bestN !== best ? ' 🔎' : ''}</span><b class="${ev[m] > 0 ? 'pos' : ev[m] < -.3 ? 'neg' : ''}">${spct(ev[m], 1)}</b></div>`).join('')}</div>`;
}
// why: a short reason for the best move, by the kind of hand and the dealer's card
function whyKey(cards, up, m) {
  const V = B.hv(cards), pair = cards.length === 2 && B.isPair(cards), weak = up >= 2 && up <= 6;
  if (m === 'P') { const v = B.VAL(cards[0]); return v === 1 ? 'why.pA' : v === 8 ? 'why.p8' : weak ? 'why.pWeak' : 'why.p'; }
  if (pair && B.VAL(cards[0]) === 10) return 'why.p10';
  if (pair && B.VAL(cards[0]) === 5 && m === 'D') return 'why.p5';
  if (m === 'R') return 'why.R';
  if (m === 'D') return V.soft ? 'why.Dsoft' : V.t === 11 ? 'why.D11' : 'why.D';
  if (V.soft) return m === 'S' ? 'why.softS' : 'why.softH';
  if (V.t >= 17) return 'why.h17';
  if (V.t >= 12) return m === 'S' ? (weak ? 'why.stiffS' : 'why.stiffS2') : (weak ? 'why.stiffH2' : 'why.stiffH');
  return 'why.low';
}
function coachHtml() {
  let h = '';
  const base = baseP(), S = T.session;
  if (T.phase === 'play' && myHand()) {
    const { S: St, H } = myHand(), up = B.VAL(T.dealer.cards[0]), ctx = ctxOf(St, H);
    const ev = B.moveEVs(H.cards, up, base.p, T.R, ctx), evN = B.moveEVs(H.cards, up, unseenP(), T.R, ctx), best = B.bestOf(ev), bestN = B.bestOf(evN);
    h += `<div class="ck-rec"><span class="rb">${esc(t('ck.best', { m: mName(best) }))}</span><p>${esc(t(whyKey(H.cards, up, best), { u: up === 1 ? 'A' : up, t: B.hv(H.cards).t }))}</p></div>`;
    h += `<div class="tips-h">${esc(t('ck.evh'))}</div>` + evTable(ev, evN, best, bestN);
    if (bestN !== best) h += `<p class="ck-flip">🔎 ${esc(t('ck.dev', { m: mName(bestN), tc: trueCount().toFixed(1) }))}</p>`;
    h += `<p class="diff-desc">${esc(t('ck.evhelp'))}</p>`;
  } else if (T.phase === 'ins') {
    const p = unseenP(), ev = 3 * p[10] - 1;
    h += `<div class="ck-rec"><span class="rb">${esc(t(ev > 0 ? 'ck.insY' : 'ck.insN'))}</span><p>${esc(t('ck.insWhy', { p: pct(p[10], 1), e: spct(ev, 1) }))}</p></div>`;
  } else if (T.phase === 'bet') {
    const bets = T.bets, ks = Object.keys(bets).filter(k => bets[k]);
    if (ks.length) {
      const tot = betSum(bets), share = tot / Math.max(1, T.bank), notes = [];
      ks.forEach(k => { const e = k === 'main' ? base.edge : base.side[k]; notes.push([k === 'main' ? 'g' : bets[k] <= (bets.main || 0) / 4 ? 'm' : 'b', t(k === 'main' ? 'gr.main' : 'gr.side', { k: t('sp.' + k), e: pct(e) })]); });
      notes.push(share <= .05 ? ['g', t('gr.size.ok', { n: Math.round(share * 100) })] : share <= .15 ? ['m', t('gr.size.big', { n: Math.round(share * 100) })] : ['b', t('gr.size.huge', { n: Math.round(share * 100) })]);
      const lc = T.lastRound; if (lc && lc.net < 0 && tot >= lc.tot * 2) notes.push(['b', t('gr.chase', { a: fmt(lc.tot), b: fmt(tot) })]);
      const worst = notes.some(n => n[0] === 'b') ? 'b' : notes.some(n => n[0] === 'm') ? 'm' : 'g';
      h += `<div class="ck-grade g${worst}"><b>${esc(t('gr.h.' + worst))}</b><ul>${notes.map(([g, x]) => `<li class="g${g}">${esc(x)}</li>`).join('')}</ul></div>`;
      const loss = (bets.main || 0) * base.edge + (bets.pp || 0) * base.side.pp + (bets.t3 || 0) * base.side.t3;
      h += `<div class="ck-bets"><div class="kv tot"><span>${esc(t('ck.avgLoss'))}</span><b>−${fmt(Math.round(loss * 100) / 100)}</b></div></div>`;
    } else {
      const start = S.buyin, unit = Math.max(25, Math.round(T.bank * .02 / 25) * 25), stop = Math.round(start * .7 / 25) * 25, goal = Math.round(start * 1.2 / 25) * 25;
      const pos = Math.max(0, Math.min(1, (T.bank - stop) / ((goal - stop) || 1)));
      h += `<div class="ck-plan"><div class="tips-h">${esc(t('pl.h'))}</div>` +
        `<div class="kv"><span>${esc(t('pl.unit'))}</span><b>${fmt(unit)}</b></div><div class="kv"><span>${esc(t('pl.stop'))}</span><b class="neg">${fmt(stop)}</b></div><div class="kv"><span>${esc(t('pl.goal'))}</span><b class="pos">${fmt(goal)}</b></div>` +
        `<div class="pl-bar"><i style="left:${(pos * 100).toFixed(1)}%"></i></div>` +
        (T.bank <= stop ? `<p class="ck-warn">${esc(t('pl.atStop'))}</p>` : T.bank >= goal ? `<p class="ck-good">${esc(t('pl.atGoal'))}</p>` : '') + `</div>`;
    }
    if (set.count) { const tc = trueCount(), se = shoeEdge(); h += `<p class="${se < 0 ? 'ck-good' : 'diff-desc'}">${esc(t(se < 0 ? 'ck.cntPlus' : 'ck.cnt', { tc: (tc > 0 ? '+' : '') + tc.toFixed(1), e: spct(-se, 2) }))}</p>`; }
  } else if (T.phase !== 'done') h += `<p class="muted">${esc(t(T.phase === 'dealer' ? 'w.dealer' : T.phase === 'deal' ? 'dealing' : 'w.others'))}</p>`;
  // this round's decisions, graded
  if (T.dec.length) {
    h += `<div class="ck-ex"><div class="tips-h">${esc(t('ck.decs'))}</div><ul class="ck-dl">${T.dec.map(d => {
      if (d.k === 'ins') { const g = d.loss < 1e-9 ? 'g' : 'm'; return `<li class="g${g}"><span>${esc(t('ck.insL'))}</span><b>${esc(t(d.yes ? 'ins.yes' : 'ins.no'))}</b><em>${g === 'g' ? '◎' : '△'}</em></li>`; }
      const g = GR(d.loss), hand = `${totTxt(d.cards)} vs ${d.up === 1 ? 'A' : d.up}`;
      return `<li class="g${g}"><span>${esc(hand)}</span><b>${esc(mName(d.m))}</b><em>${g === 'g' ? '◎' : g === 'm' ? '△' : '✕'}</em>${g !== 'g' ? `<small>${esc(t('ck.should', { m: mName(d.best), l: pct(d.loss, 1) }))}</small>` : ''}</li>`;
    }).join('')}</ul></div>`;
  }
  if (T.phase === 'done' && T.res) {
    const r = T.res, played = T.dec.filter(d => d.k === 'move'), bad = played.filter(d => d.loss >= 1e-9).length;
    h += `<p class="ck-luck">${esc(t(bad ? 'ck.doneBad' : r.net > 0 ? 'ck.doneWin' : r.net < 0 ? 'ck.doneLose' : 'ck.donePush', { n: bad }))}</p>`;
    h += explainHtml();
  }
  // tips
  const tips = [];
  if (S.hands >= 20) tips.push(t('tip.luck', { e: fmt(Math.round(-S.exp)), n: sg(Math.round(S.net)) }));
  if (D.bots && D.bots.marco && D.bots.marco.unit >= 4) tips.push(t('tip.bot', { n: 'Marco', a: fmt(100 * D.bots.marco.unit) }));
  tips.push(...TIPS_GEN());
  if (tips.length) {
    const n = 3, open = !!set.tipsOpen, show = open ? tips : tips.slice(0, n);
    h += `<div class="tips"><div class="tips-h">💡 ${esc(t('tips.h'))}</div><ul>${show.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` +
      (tips.length > n ? `<button type="button" class="tips-more" id="tipsMore">${esc(open ? t('tips.less') : t('tips.more', { n: tips.length - n }))}</button>` : '') + `</div>`;
  }
  return h;
}
function TIPS_GEN() {
  const pool = []; for (let i = 1; i <= 20; i++) pool.push('tipg.' + i);
  const v = ['tipv.' + T.v];
  const k = T.round % pool.length;
  return v.concat([pool[k], pool[(k + 7) % pool.length], pool[(k + 13) % pool.length]]).map(x => t(x));
}
// the round in words: the dealer's hand and how your hands came out
function explainHtml() {
  const d = T.dealer.cards, V = B.hv(d), lines = [];
  lines.push(B.isBJ(d) ? t('ex.dbj') : V.t > 21 ? t('ex.dbust', { n: V.t, c: d.length }) : t('ex.dstand', { n: V.t, c: d.length }));
  T.seats[ME].hands.forEach((H, i) => { if (!H.res) return; lines.push(t('ex.k.' + H.res.kind, { n: B.hv(H.cards).t, h: T.seats[ME].hands.length > 1 ? t('ex.hand', { n: i + 1 }) : '', a: sg(H.res.net) }) + (H.res.bonus ? ' ' + t('ex.bonus.' + H.res.bonus) : '')); });
  const S = T.seats[ME];
  for (const k in (S.sres || {})) lines.push(t('ex.side', { k: LAB[k], r: S.sres[k].k ? t('sk.' + S.sres[k].k) : t('sk.none'), a: sg(S.sres[k].net) }));
  if (S.ins) lines.push(t(S.insRes > 0 ? 'ex.insW' : 'ex.insL', { a: sg(S.insRes) }));
  return `<div class="ck-ex"><div class="tips-h">${esc(t('ex.h'))}</div><ol>${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ol></div>`;
}

/* phones: the side cards become tabs (bar at the bottom of the screen) */
function mTabs() {
  const side = $('#side'), have = new Set($$('#side [data-pt]').map(e => e.dataset.pt));
  const cur = set.mTab && have.has(set.mTab) ? set.mTab : 'coach';
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
if (window.ResizeObserver) { let lw = 0, lh = 0, q = 0; new ResizeObserver(() => { const b = $('#bjTable'); if (!b || (b.clientWidth === lw && b.clientHeight === lh)) return; lw = b.clientWidth; lh = b.clientHeight; if (!q) q = requestAnimationFrame(() => { q = 0; if (T) render(); }); }).observe($('#bjTable')); }
let HB = null;
const ruleShort = () => t('rule.short', { d: T.R.decks, s: T.R.h17 ? 'H17' : 'S17', b: T.R.bj === 1.2 ? '6:5' : '3:2' });
function renderNums() {
  const game = `<span class="sg"><b>${esc(vName(T.v))}</b><em>${esc(ruleShort())}</em></span>`;
  const stat = (lab, val) => `<span class="ss"><small>${esc(lab)}</small><b>${val}</b></span>`;
  const stats = stat(t('bank'), fmt(T.bank)) + stat(t('ss.net'), sg(T.session.net)) + (set.count ? stat(t('cnt.tc'), (trueCount() > 0 ? '+' : '') + trueCount().toFixed(1)) : stat(t('ss.round'), '#' + (T.shoe.n + (T.phase === 'bet' ? 1 : 0))));
  $('#infobar').innerHTML = game + stats;
  const mg = `<b>${esc(vName(T.v))}</b><em>${esc(ruleShort())}</em>`; if ($('#mGame').innerHTML !== mg) $('#mGame').innerHTML = mg;
  if (HB && HB.on) HB.setInfo(game);
}

/* ---------------- statistics dialog ---------------- */
let statsV = null;
function openStats() { statsV = statsV || T.v; renderStats(); openOv('#statsOverlay'); }
function renderStats() {
  $('#statsTabs').innerHTML = B.ORDER.map(v => `<button type="button" data-v="${v}" class="${v === statsV ? 'sel' : ''}">${esc(vName(v))}</button>`).join('');
  $$('#statsTabs [data-v]').forEach(b => b.onclick = () => { statsV = b.dataset.v; renderStats(); });
  const S = D.stats[statsV] || {};
  if (!S.hands) { $('#statsBody').innerHTML = `<p class="muted center">${esc(t('st.none'))}</p>`; return; }
  const k = S.k || {}, nh = Object.values(k).reduce((a, x) => a + x, 0) || 1;
  const cells = [['st.hands', S.hands], ['st.net', sg(S.net || 0)], ['st.wag', fmt(S.wag || 0)], ['st.exp', sg(Math.round(S.exp || 0))], ['st.luck', sg(Math.round((S.net || 0) - (S.exp || 0)))], ['st.mis', sg(-Math.round(S.mis || 0))], ['st.right', S.moves ? pct(S.right / S.moves, 1) : '—'], ['st.dbust', pct((S.dbust || 0) / S.hands, 1)]];
  const g = S.graph || [], mn = Math.min(0, ...g), mx = Math.max(0, ...g), W = 600, hh = 120;
  const path = g.length > 1 ? g.map((v, i) => `${i ? 'L' : 'M'}${(i / (g.length - 1) * W).toFixed(1)} ${(hh - (v - mn) / ((mx - mn) || 1) * hh).toFixed(1)}`).join(' ') : '';
  const zero = hh - (0 - mn) / ((mx - mn) || 1) * hh;
  const KS = ['bj', 'win', 'push', 'lose', 'bust', 'dbj', 'surr'];
  const fr = kk => `<div class="fq f${kk}"><span>${esc(t('rk.' + kk))}</span><span class="fq-b"><i style="width:${((k[kk] || 0) / nh * 100).toFixed(1)}%"></i></span><b>${pct((k[kk] || 0) / nh, 1)}</b></div>`;
  const side = S.side ? Object.entries(S.side).filter(([, x]) => x.n).map(([kk, x]) => `<tr><td>${LAB[kk]}</td><td>${x.n}</td><td class="${x.net > 0 ? 'pos' : x.net < 0 ? 'neg' : ''}">${sg(x.net)}</td></tr>`).join('') : '';
  $('#statsBody').innerHTML = `<div class="st-grid">${cells.map(([kk, v]) => `<div><small>${esc(t(kk))}</small><b>${v}</b></div>`).join('')}</div>` +
    `<div class="st-two"><div><span class="lab">${esc(t('st.freq'))}</span>${KS.map(fr).join('')}</div>` +
    `<div><span class="lab">${esc(t('st.side'))}</span>${side ? `<table class="st-tbl"><tr><th>${esc(t('st.bet'))}</th><th>${esc(t('st.n'))}</th><th>${esc(t('st.net'))}</th></tr>${side}</table>` : `<p class="muted">${esc(t('st.noside'))}</p>`}</div></div>` +
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

/* new game: the variants (game cards) and the special rules (toggles) on the Game tab; decks on the Rules tab */
let NG = null, ngTab = 'game';
function openNew() { NGR = 0; const v = T ? T.v : set.v; NG = { v, p: JSON.parse(JSON.stringify(prefOf(v))) }; ngTab = 'game'; renderNew(); openOv('#newOverlay'); }
function seg(items, cur, attr) { return `<div class="seg">${items.map(([val, lab]) => `<button type="button" data-${attr}="${esc(val)}" class="${String(val) === String(cur) ? 'sel' : ''}">${esc(lab)}</button>`).join('')}</div>`; }
const GART = {   // a few cards for each variant: [card, x, y, rot]
  classic: [[0, 0, .12, -8], [12, .62, .05, 6]],                         // A♠ K♠: blackjack
  european: [[13 + 9, 0, .1, -6], [26 + 0, .62, .05, 4], [39 + 10, 1.7, .1, 0]],   // 10♥ A♦ | J♣ (one dealer card)
  spanish: [[5, 0, .12, -10], [19, .5, .04, 0], [33, 1, .12, 10]],       // 6-7-8: a bonus 21
  free: [[8, 0, .1, -6], [21, .62, .05, 6], [39 + 11, 1.7, .1, 0]],      // 9 9 (free split) | Q
};
function gArt(v) { return `<span class="garts">` + GART[v].map(([c, x, y, r]) => `<span class="cd" style="left:calc(var(--cw)*${x});top:calc(var(--cw)*${y});transform:rotate(${r}deg)"><span class="in">${Cards.face(c)}</span></span>`).join('') + `</span>`; }
const OPT_VALS = { h17: [[false, 'S17'], [true, 'H17']], surr: [[true, 'on'], [false, 'off']], bj: [[1.5, '3:2'], [1.2, '6:5']], das: [[true, 'on'], [false, 'off']], side: [[true, 'on'], [false, 'off']] };
function optRow(k, p) {
  const vals = OPT_VALS[k].map(([val, lab]) => [String(val), lab === 'on' ? t('on') : lab === 'off' ? t('off') : lab]);
  return `<div class="sr-o"><div class="sr-t"><b>${esc(t('o.' + k))}</b><small>${esc(t('o.' + k + '.h'))}</small></div>${seg(vals, String(p[k]), 'opt-' + k)}</div>`;
}
function renderNew() {
  const v = NG.v, p = NG.p;
  $('#ngTabs').innerHTML = ['game', 'rules', 'design'].map(k => `<button type="button" class="${k === ngTab ? 'sel' : ''}" data-tab="${k}">${esc(t('tab.' + k))}${k === 'rules' ? `<small>${esc(vName(v))}</small>` : ''}</button>`).join('');
  let h;
  if (ngTab === 'game') {
    const Rr = B.rulesOf(v, p), edge = B.houseEdge(Rr);
    h = `<div class="bc-ngw"><div class="ng-games bc3 bj4">` + B.ORDER.map(id => `<button type="button" class="gcard${id === v ? ' sel' : ''}" data-g="${id}"><span class="gart">${gArt(id)}</span><b>${esc(vName(id))}</b><p>${esc(t('vg.' + id))}</p><span class="gpick">${id === v ? '✓' : ''}</span></button>`).join('') + `</div>` +
      `<div class="sr-box"><div class="sr-h"><b>${esc(t('o.special'))}</b><span>${esc(t('o.edge'))} <em>${pct(edge)}</em></span></div><div class="sr-list">${B.VARIANTS[v].opts.map(k => optRow(k, p)).join('')}</div></div>` + chipsRow() + `</div>`;
  } else if (ngTab === 'rules') {
    const row = (lab, help, html) => `<div class="rl"><div class="rl-t"><b>${esc(lab)}</b><small>${esc(help)}</small></div>${html}</div>`;
    h = `<div class="rl-list">` +
      row(t('o.decks'), t('o.decks.h'), seg(B.DECKS.map(d => [d, t('o.deckN', { n: d })]), p.decks, 'dk')) +
      row(t('set.count'), t('set.count.h'), seg([[0, t('off')], [1, t('on')]], set.count ? 1 : 0, 'cnt')) +
      `</div><div class="rl-sum">${esc(t('o.fixed.' + v))}</div><p class="diff-desc">${esc(t('o.note'))}</p>`;
  } else h = designHtml();
  const body = $('#ngBody'); body.innerHTML = h; body.dataset.tab = ngTab;
  $$('#ngTabs [data-tab]').forEach(b => b.onclick = () => { ngTab = b.dataset.tab; renderNew(); });
  $$('#ngBody [data-g]').forEach(b => { b.onclick = () => { if (NG.v !== b.dataset.g) { NG.v = b.dataset.g; NG.p = JSON.parse(JSON.stringify(prefOf(NG.v))); } renderNew(); }; b.ondblclick = () => $('#btnStart').click(); });
  Object.keys(OPT_VALS).forEach(k => $$(`#ngBody [data-opt-${k}]`).forEach(b => b.onclick = () => { const raw = b.getAttribute('data-opt-' + k); NG.p[k] = k === 'bj' ? +raw : raw === 'true'; renderNew(); }));
  $$('#ngBody [data-dk]').forEach(b => b.onclick = () => { NG.p.decks = +b.dataset.dk; renderNew(); });
  $$('#ngBody [data-cnt]').forEach(b => b.onclick = () => { set.count = +b.dataset.cnt; save(); renderNew(); if (T) renderSide(); });
  if (ngTab === 'design') wireDesign(body);
}
let NGR = 0;
function chipsRow() {
  const cur = T ? T.bank : (typeof D.chips === 'number' ? D.chips : START);
  return `<div class="ng-chips-row"><span class="lab">${esc(t('ng.chips'))}</span><b class="ng-chips">${fmt(cur)}</b><small>${esc(t('o.carry', { s: fmt(START) }))}</small>` +
    (NGR ? `<span class="ng-rq">${esc(t('ng.resetQ', { n: fmt(START) }))}</span><button type="button" class="sbtn" id="ngRNo">${esc(t('no'))}</button><button type="button" class="sbtn go" id="ngRYes">${esc(t('yes'))}</button>`
      : `<button type="button" class="sbtn" id="ngReset"${cur === START ? ' disabled' : ''}>↺ ${esc(t('ng.reset'))}</button>`) + `</div>`;
}
document.addEventListener('click', e => {
  const el = e.target.closest && e.target.closest('#ngReset, #ngRNo, #ngRYes'); if (!el) return;
  const id = el.id;
  if (id === 'ngReset') NGR = 1;
  else if (id === 'ngRNo') NGR = 0;
  else { NGR = 0; D.chips = START; if (T) { if (T.phase === 'bet') { T.bets = {}; G.undo = []; T.bank = START; } else T.bank = START; } save(); if (T) render(); sfx('chips'); toast(t('ng.resetDone', { n: fmt(START) })); }
  renderNew();
});
$('#btnNewClose').onclick = () => closeOv('#newOverlay');
$('#btnStart').onclick = () => { set.prefs[NG.v] = NG.p; save(); closeOv('#newOverlay'); clearTimeout(G.timer); newSession(NG.v); };

/* design (shared with the solitaire / poker / baccarat) */
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
  if (setTab === 'play') h = `<div class="set-cols"><div class="rl-list">` + sw('coach', t('set.coach'), t('set.coach.h')) + sw('count', t('set.count'), t('set.count.h')) + sw('autoNext', t('set.autoNext')) + `</div><div class="rl-list">` + sw('anim', t('set.anim')) + sw('sound', t('set.sound')) +
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
$('#btnHint').onclick = () => {
  if (!T) return;
  if (T.phase === 'play' && myHand()) {
    const { S, H } = myHand(), up = B.VAL(T.dealer.cards[0]), m = B.bestOf(B.moveEVs(H.cards, up, baseP().p, T.R, ctxOf(S, H)));
    toast(t('hint.move', { m: mName(m) }) + ' ' + t(whyKey(H.cards, up, m), { u: up === 1 ? 'A' : up, t: B.hv(H.cards).t }));
    const el = $(`#actbar [data-mv="${m}"]`); if (el) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); }
  } else if (T.phase === 'ins') { const p = unseenP(), ev = 3 * p[10] - 1; toast(t(ev > 0 ? 'ck.insY' : 'ck.insN') + ' ' + t('ck.insWhy', { p: pct(p[10], 1), e: spct(ev, 1) })); }
  else toast(t('hint.bet', { e: pct(baseP().edge) }));
};
$('#btnResign').onclick = () => {
  if (!T) return;
  if (T.phase !== 'bet' && T.phase !== 'done') { toast(t('toast.midRound')); return; }
  const go = () => { clearTimeout(G.timer); const S = T.session; toast(t('cashout', { n: sg(S.net), h: S.hands })); newSession(T.v); };
  const S = T.session, note = !S.hands ? t('co.none') : t(S.net > 0 ? 'co.win' : S.net < 0 ? 'co.lose' : 'co.even', { n: sg(S.net) });
  if (window.Resign) Resign.confirm({ lang: LANG, question: t('cashoutQ'), note }).then(ok => { if (ok) go(); }); else confirmBox(t('cashoutQ') + ' ' + note, go);
};
$('#btnStats').onclick = openStats;
$('#btnTools').onclick = () => window.BJTools && BJTools.open();
$('#btnLesson').onclick = () => window.BJLessons && BJLessons.open();
$('#langSel').onchange = () => { LANG = $('#langSel').value; try { localStorage.setItem('aicoding-lang', LANG); } catch (e) {} applyI18n(); render(); if (window.BJRules && BJRules.relang) BJRules.relang(); if (window.GameRecord) GameRecord.relabel(); };
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea') || $('.overlay.show') || !T) return;
  const k = e.key.toLowerCase();
  if (T.phase === 'bet') {
    if (k === ' ' || k === 'enter') { e.preventDefault(); deal(); }
    else if (k === 'b') placeBet('main');
    else if (k === 'z') unplace(); else if (k === 'r') rebet(1);
    else if (/^[1-5]$/.test(k)) { set.chip = DENOMS[+k - 1]; renderActbar(); }
  } else if (T.phase === 'ins') { if (k === 'y') takeIns(true); else if (k === 'n' || k === ' ') { e.preventDefault(); takeIns(false); } }
  else if (T.phase === 'play' && myHand()) { const m = { h: 'H', s: 'S', d: 'D', p: 'P', r: 'R' }[k]; if (m) { e.preventDefault(); myMove(m); } else if (k === ' ') { e.preventDefault(); myMove('S'); } }
  else if (T.phase === 'done' && !T.tut) { if (k === ' ' || k === 'enter' || k === 'n') { e.preventDefault(); nextRound(); } else if (k === 'r') $('#abRe').click(); }
  if (k === '?' ) $('#btnHint').click();
});

/* ---------------- start ---------------- */
applyI18n();
if (window.GameRecord) GameRecord.init({ game: 'blackjack', lang: () => LANG, menu: '.controls', variant: () => { const v = T ? T.v : set.v; return { k: v, n: vName(v) }; }, variants: () => B.ORDER, variantName: k => vName(k), defVariant: 'classic' });
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnResign', '#btnHint', '#btnRules', '#btnLesson', '#btnTools', '#btnStats'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => setTimeout(() => { if (T) render(); }, 0));
if (window.RulesOffer) RulesOffer.init({ game: 'blackjack', lang: () => LANG, open: () => window.BJRules && BJRules.open(NG ? NG.v : T && T.v), watch: '#rulesOverlay' });
// resume the saved table (a round in progress goes on from where it was)
if (D.cur && D.cur.shoe && B.VARIANTS[D.cur.v] && D.cur.R) {
  T = D.cur; T.R = B.rulesOf(T.v, prefOf(T.v)); if (!T.botBets) botsBet();
  render();
  if (T.phase === 'deal' || T.phase === 'dealer' || (T.phase === 'play' && !myHand())) schedule(400);
} else newSession(set.v);
// keep the table saved during a round too
setInterval(() => { if (T && !T.tut && T.phase !== 'bet') { D.cur = T; save(); } }, 4000);
addEventListener('pagehide', () => { if (T && !T.tut) { D.cur = T; save(); } });

window.BJApp = { num, startTutorial, endTutorial, showTab(pt) { set.mTab = pt; mTabs(); }, get T() { return T; }, get LANG() { return LANG; }, t, vName, sfx, esc, fmt, pct, spct, openOv, closeOv, toast, confirmBox, set, D, save, prefOf, newSession, render, gArt, chartHtml, CH_ROWS, mName, totTxt, statOf, LAB };
})();
