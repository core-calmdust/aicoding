/* ハーツ — game controller (hearts/app.js)
   You (bottom) and three computer players (left, top, right), one 52-card deck, 13 cards each, play clockwise.
   Rules: engine.js · players / coach numbers: ai.js (in worker.js) · rules tour rules.js · lessons lessons.js · review review.js · study study.js.
   Same shell as the poker / guandan pages (header bar, new-game dialog with Game | Rules | Design, right column, phone tabs). */
(function () {
'use strict';
const HT = window.HT, AI = window.HAI, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-hearts', SUPPORTED = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const FELTS = ['claret', 'green', 'blue', 'teal', 'charcoal', 'purple', 'mocha', 'wine'];
const BACKS = ['rose', 'crimson', 'ornateBlack', 'ornate', 'floral', 'floralBlack', 'azure', 'azureBlack', 'hex', 'cube', 'red', 'blue', 'navy', 'skullBlack', 'skull', 'gangsta'];
const COURTS = ['classic', 'antique', 'flat', 'gangsta'];
const VARS = ['std', 'omni', 'maria', 'spot'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const { suit, rank, QS, JD } = HT;

/* ---------------- storage ---------------- */
function load() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
const D = load();
D.set = Object.assign({ lvl: 8, v: 'std', pass: '', moon: 'add', target: 0, firstPts: 0, qBreaks: 0, anyLead: -1, felt: 'claret', back: 'rose', court: 'classic', cmode: 'simple', sound: true, anim: 1, speed: 'normal', coach: 1, tap1: 0, mTab: 'coach', lang: '' }, D.set || {});
const ST0 = () => ({ games: 0, gwins: 0, places: [0, 0, 0, 0], hands: 0, pts: 0, zero: 0, qs: 0, moonMe: 0, moonThem: 0, dec: [0, 0, 0, 0], byLv: {}, byV: {}, best: null });
D.stats = Object.assign(ST0(), D.stats || {});
D.rev = D.rev || [];
const set = D.set;
['felt', 'back', 'court', 'cmode'].forEach(k => { document.documentElement.dataset[k] = set[k]; });
function save() { try { localStorage.setItem(STORE, JSON.stringify(D)); } catch (e) { try { D.rev = D.rev.slice(-10); localStorage.setItem(STORE, JSON.stringify(D)); } catch (e2) {} } }

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
  $('#brandTitle').textContent = t('title'); $('#brandSub').textContent = LANG === 'en' ? '' : 'Hearts';
}
const NAMES = () => [t('you'), t('bot.1'), t('bot.2'), t('bot.3')];
const lvLabel = n => 'Lv.' + n;
const cname = c => HT.RKN(rank(c)) + HT.SYM[suit(c)];
const dirName = d => t('dir.' + d);   // 1 left, 3 right, 2 across, 0 hold
const fmt = (x, d) => (Math.round(x * Math.pow(10, d || 1)) / Math.pow(10, d || 1)).toFixed(d == null ? 1 : d);

/* ---------------- glossary terms (dotted underline, tooltip) ---------------- */
const GLOSS = ['break', 'moon', 'void', 'duck', 'smoke', 'paint', 'lady', 'pen', 'lead', 'follow', 'slough', 'exit', 'stopper', 'protect', 'count', 'pass', 'hold', 'trick', 'ev', 'sample'];
function gl(s) {
  // wrap glossary words of the current language (longest first, once per text)
  let out = esc(s);
  const terms = GLOSS.map(k => [k, t('g.' + k + '.n')]).filter(([, n]) => n && !/^g\./.test(n)).sort((a, b) => b[1].length - a[1].length);
  const used = new Set();
  for (const [k, n] of terms) {
    const e = esc(n);
    let i;
    if (/^[A-Za-z]/.test(n)) { const m = new RegExp('\\b' + e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').exec(out); i = m ? m.index : -1; if (m) { out = out.slice(0, i) + `<span class="gl" data-g="${k}" tabindex="0">${m[0]}</span>` + out.slice(i + m[0].length); used.add(k); } continue; }
    i = out.indexOf(e);
    if (i < 0 || used.has(k)) continue;
    // not inside a tag we already made
    const before = out.slice(0, i); if ((before.match(/<span/g) || []).length !== (before.match(/<\/span>/g) || []).length) continue;
    out = before + `<span class="gl" data-g="${k}" tabindex="0">${e}</span>` + out.slice(i + e.length); used.add(k);
  }
  return out;
}
{ const tip = $('#glTip'); let cur = null;
  const show = el => { const k = el.dataset.g; tip.innerHTML = `<b>${esc(t('g.' + k + '.n'))}</b><p>${esc(t('g.' + k))}</p>`; tip.classList.add('show'); const r = el.getBoundingClientRect(), W = innerWidth; const w = Math.min(320, W - 20); tip.style.width = w + 'px'; let x = r.left + r.width / 2 - w / 2; x = Math.max(10, Math.min(W - w - 10, x)); tip.style.left = x + 'px'; const h = tip.offsetHeight; let y = r.top - h - 8; if (y < 8) y = r.bottom + 8; tip.style.top = y + 'px'; cur = el; };
  const hide = () => { tip.classList.remove('show'); cur = null; };
  document.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; const g = e.target.closest && e.target.closest('.gl'); if (g) show(g); else if (cur) hide(); });
  document.addEventListener('click', e => { const g = e.target.closest && e.target.closest('.gl'); if (g) { e.preventDefault(); e.stopPropagation(); if (cur === g) hide(); else show(g); } else if (cur) hide(); }, true);
  addEventListener('scroll', hide, true); }

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
  else if (k === 'take') { if (!playB(a, 'flip', n, .55, vary() * .9)) noise(a, n, .08, 1800, 1, .25); }
  else if (k === 'queen') { tone(a, n, 196, .5, .09, 'triangle'); tone(a, n + .12, 155.6, .7, .08, 'triangle'); }
  else if (k === 'break') { tone(a, n, 660, .25, .05, 'triangle'); tone(a, n + .1, 990, .35, .05, 'triangle'); }
  else if (k === 'sel') tone(a, n, 1500, .05, .03, 'triangle');
  else if (k === 'turn') { tone(a, n, 880, .14, .05, 'triangle'); tone(a, n + .09, 1175, .2, .05, 'triangle'); }
  else if (k === 'win') { if (!playB(a, 'win', n, .9)) [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(a, n + i * .09, f, .8, .08, 'triangle')); }
  else if (k === 'moon') [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, i) => tone(a, n + i * .11, f, .9, .07, 'triangle'));
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

/* ---------------- the thinking worker ---------------- */
let WK = null, wkN = 0; const wkCb = new Map();
try { WK = new Worker('worker.js?v=1'); WK.onmessage = e => { const f = wkCb.get(e.data.id); if (f) { wkCb.delete(e.data.id); f(e.data.r); } }; WK.onerror = () => { WK = null; }; } catch (e) { WK = null; }
// plain copy of a hand state for the worker
const plainS = S => ({ R: S.R, no: S.no, hands: S.hands, dir: S.dir, phase: S.phase, pass: S.pass, got: S.got, turn: S.turn, leader: S.leader, trick: S.trick, tn: S.tn, broken: S.broken, taken: S.taken, tricks: S.tricks, log: S.log, void: S.void });
function think(job, S, p, lv, o) {
  return new Promise(res => {
    const msg = { id: ++wkN, job, S: plainS(S), p, lv, o };
    if (WK) { wkCb.set(msg.id, r => res(r)); WK.postMessage(msg); return; }
    setTimeout(() => {   // no worker (file://): the same work on the page
      let r = null;
      try {
        if (job === 'decide') r = AI.decide(msg.S, p, lv);
        else if (job === 'pass') r = AI.choosePass(msg.S, p, lv);
        else if (job === 'eval') { const x = AI.evalCards(msg.S, p, Object.assign({ exact: 1, moon: 1 }, o || {})); r = { list: x.map(y => ({ c: y.c, own: y.own, obj: y.obj, sd: y.sd, n: y.n, moonMe: y.moonMe, moonOther: y.moonOther })), worlds: x.worlds }; }
        else if (job === 'passEval') { const cands = AI.passCands(msg.S.hands[p], msg.S.R, msg.S.dir, (o && o.k) || 10); if (o && o.mine && o.mine.length === 3) cands.push(o.mine); r = cands.map(c => Object.assign({ cards: c }, AI.evalPass(msg.S, p, c, (o && o.worlds) || 30))); }
        else if (job === 'moon') r = AI.moonChance(msg.S, p, (o && o.worlds) || 80);
      } catch (e) { console.error(e); }
      res(r);
    }, 0);
  });
}

/* ---------------- the game state ---------------- */
let G = null, S = null;
const U = { sel: null, psel: new Set(), last: null, res: null, timer: 0, think: false, coach: null, coachKey: '', recv: null, recvAt: 0, trickShow: null, dec: [], passInfo: null, deal: 0 };
const LV = () => G ? G.lvl : set.lvl;
const isMe = s => s === 0;
const pace = () => !set.anim ? .4 : set.speed === 'slow' ? 1.5 : set.speed === 'fast' ? .55 : 1;
const frozen = () => !!(window.__focusGate && window.__focusGate.frozen) || !!document.querySelector('.overlay.show:not(#resOverlay)');
let schedN = 0;
function sched(fn, ms) {
  clearTimeout(U.timer); const my = ++schedN, end = performance.now() + (ms || 0);
  const tick = () => { if (my !== schedN) return; const left = end - performance.now(); if (left <= 0 && !frozen()) { fn(); return; } U.timer = setTimeout(tick, Math.max(16, Math.min(left, 150))); };
  U.timer = setTimeout(tick, Math.max(0, Math.min(ms || 0, 150)));
}
function unsched() { schedN++; clearTimeout(U.timer); }
function persist() { if (!G) return; D.cur = { G, S, res: U.res, dec: U.dec, passInfo: U.passInfo }; save(); }
function rulesFromSet(v) {
  const o = { v: v || set.v };
  const base = HT.VARIANTS[o.v];
  if (set.pass) o.pass = set.pass;
  o.moon = set.moon || 'add';
  if (set.target) o.target = set.target;
  o.firstPts = set.firstPts ? 1 : 0; o.qBreaks = set.qBreaks ? 1 : 0;
  o.anyLead = set.anyLead === -1 ? base.anyLead : set.anyLead;
  return o;
}
function newGame(o) {
  unsched(); recordAbandon();
  o = o || {};
  G = HT.newGame(rulesFromSet(o.v));
  G.lvl = o.lvl || set.lvl; G.id = Date.now();
  startHand();
}
function startHand() {
  S = HT.deal(G, Math.random);
  U.sel = null; U.psel = new Set(); U.res = null; U.coach = null; U.coachKey = ''; U.recv = null; U.trickShow = null; U.dec = []; U.passInfo = null; U.deal = Date.now();
  sfx('shuffle'); setTimeout(() => sfx('deal'), 250);
  persist(); render();
  if (S.phase === 'pass') aiPasses();
  sched(loop, Math.round(1000 * Math.max(.6, pace())));
}
function aiPasses() {
  const my = G.id, no = S.no;
  for (const s of [1, 2, 3]) if (!S.pass[s]) think('pass', S, s, LV()).then(r => { if (!G || G.id !== my || !S || S.no !== no || S.phase !== 'pass') return; S.pass[s] = r && r.length === 3 ? r : AI.heurPass(S.hands[s], S.R, S.dir); persist(); render(); if (S.pass[0]) sched(loop, 200); });
}

/* ---------------- the loop ---------------- */
let thinking = 0;
function loop() {
  unsched();
  if (!S || U.res) return;
  if (S.phase === 'pass') {
    if (!S.pass[0]) { render(); requestCoach(); return; }
    if (S.pass.some(p => !p)) { render(); return; }
    const recv = HT.passDir ? null : null;
    U.passInfo = { mine: S.pass[0].slice(), got: null, dir: S.dir };
    HT.doPass(S); U.recv = S.got[0].slice(); U.recvAt = Date.now(); U.passInfo.got = U.recv.slice();
    sfx('deal'); persist(); render();
    sched(loop, 1500 * pace()); return;
  }
  if (S.phase === 'play') {
    if (U.trickShow) return;
    if (isMe(S.turn)) { sfx('turn'); render(); requestCoach(); return; }
    const seat = S.turn, my = ++thinking, key = S.log.length;
    U.think = true; render();
    const t0 = performance.now();
    think('decide', S, seat, LV()).then(c => {
      if (my !== thinking || !S || S.phase !== 'play' || S.turn !== seat || S.log.length !== key) return;
      if (c == null || !HT.legal(S, seat).includes(c)) c = AI.fastPick(S, seat);
      const wait = Math.max(0, (S.trick.length ? 430 : 560) * pace() - (performance.now() - t0));
      sched(() => { U.think = false; act(seat, c); }, wait);
    });
  }
}
function act(seat, c) {
  if (!S || S.phase !== 'play' || S.turn !== seat) return;
  const wasBroken = S.broken;
  let ev; try { ev = HT.play(S, seat, c); } catch (e) { console.error(e); toast(t('err.illegal')); return; }
  U.sel = null; U.coach = null;
  sfx(c === QS ? 'queen' : 'play');
  if (!wasBroken && S.broken && suit(c) === 3) setTimeout(() => { sfx('break'); toast(t('msg.broken')); }, 120);
  if (ev.trick) {
    U.trickShow = { cards: ev.trick.cards.map((x, i) => ({ s: S.tricks[S.tricks.length - 1].cards[i].s, c: x })), win: ev.trick.win, pts: ev.trick.pts, at: Date.now() };
    persist(); render();
    sched(() => { sfx('take'); U.trickShow.go = 1; render(); sched(() => { U.trickShow = null; render(); if (ev.end) handEnd(); else loop(); }, 420 * Math.max(.6, pace())); }, 1000 * pace());
    return;
  }
  persist(); render();
  sched(loop, 60);
}

/* ---------------- end of a hand / of the game ---------------- */
function handEnd() {
  const R = HT.finishHand(G, S);
  U.res = R;
  const st = D.stats; st.hands++; st.pts += R.delta[0]; if (R.raw[0] === 0 || (R.moon === 0)) st.zero++;
  if (S.taken[0].includes(QS)) st.qs++;
  if (R.moon === 0) st.moonMe++; else if (R.moon > 0) st.moonThem++;
  const lk = String(LV()); st.byLv[lk] = st.byLv[lk] || { h: 0, p: 0, g: 0, w: 0 }; st.byLv[lk].h++; st.byLv[lk].p += R.delta[0];
  const vk = G.R.v; st.byV[vk] = st.byV[vk] || { h: 0, p: 0, g: 0, w: 0 }; st.byV[vk].h++; st.byV[vk].p += R.delta[0];
  // keep the hand for the review
  try { saveReview(); } catch (e) { console.error(e); }
  if (G.over) {
    st.games++; const pl = HT.places(G.scores)[0]; st.places[pl]++; if (pl === 0) { st.gwins++; st.byLv[lk].w++; st.byV[vk].w++; } st.byLv[lk].g++; st.byV[vk].g++;
    recordGame(pl);
  }
  sfx(R.moon === 0 ? 'moon' : R.delta[0] <= 0 ? 'win' : R.moon > 0 ? 'bad' : 'take');
  persist(); render();
  if (G.over) setTimeout(showGameEnd, 1000);
}
function saveReview() {
  const r = { at: Date.now(), no: S.no, R: S.R, dir: S.dir, start: S.start, dealt: S.dealt, pass: S.pass, got: S.got, log: S.log.map(e => [e.s, e.c]), delta: U.res.delta, raw: U.res.raw, moon: U.res.moon, lvl: LV(), dec: U.dec, passInfo: U.passInfo };
  D.rev.push(r); if (D.rev.length > 30) D.rev.splice(0, D.rev.length - 30);
}
function nextHand() { if (!G) return; if (G.over) { if (!document.querySelector('#resOverlay.show')) showGameEnd(); return; } U.res = null; startHand(); }
function recordGame(place) {
  if (!window.GameRecord || !G || G.recorded) return;
  G.recorded = true;
  const res = place === 0 ? 'w' : place === 3 ? 'l' : 'd';
  try { GameRecord.add({ mode: 'ai', res, opp: 'CPU ' + lvLabel(LV()), key: 'ai:' + LV(), n: G.hand, why: t('rec.place', { n: place + 1, s: G.scores[0] }) }); } catch (e) {}
}
function recordAbandon() {
  if (!G || G.over || G.recorded || !G.hand || (S && S.phase === 'pass' && G.hand === 1)) return;
  D.stats.games++; D.stats.places[3]++; G.recorded = true;
  try { window.GameRecord && GameRecord.add({ mode: 'ai', res: 'l', opp: 'CPU ' + lvLabel(LV()), key: 'ai:' + LV(), n: G.hand, why: t('rec.resign') }); } catch (e) {}
}
function showGameEnd() {
  if (!G || !G.over) return;
  const N = NAMES(), pl = HT.places(G.scores), order = [0, 1, 2, 3].sort((a, b) => G.scores[a] - G.scores[b]);
  const win = pl[0] === 0;
  $('#resBody').innerHTML = `<div class="res-ico">${win ? '🏆' : pl[0] === 3 ? '🥀' : '🃏'}</div><h2>${esc(t(win ? 'g.win' : 'g.place', { n: pl[0] + 1 }))}</h2>` +
    `<ol class="res-rank">${order.map(s => `<li class="${s === 0 ? 'me' : ''}"><em>${pl[s] + 1}</em><b>${esc(N[s])}</b><span>${G.scores[s]}</span></li>`).join('')}</ol>` +
    `<p>${esc(t('g.sum', { n: G.hand, t: G.R.target }))}</p>`;
  openOv('#resOverlay');
}
$('#resClose').onclick = () => closeOv('#resOverlay');
$('#resAgain').onclick = () => { closeOv('#resOverlay'); newGame({ v: G ? G.R.v : set.v, lvl: LV() }); };

/* ---------------- your input ---------------- */
function myLegal() { return S && S.phase === 'play' && isMe(S.turn) && !U.trickShow ? HT.legal(S, 0) : []; }
function tapCard(c) {
  if (!S || U.res) return;
  if (S.phase === 'pass') {
    if (S.pass[0]) return;
    if (U.psel.has(c)) U.psel.delete(c); else { if (U.psel.size >= 3) { toast(t('msg.three')); sfx('bad'); return; } U.psel.add(c); }
    sfx('sel'); render(); return;
  }
  const L = myLegal(); if (!L.length) return;
  if (!L.includes(c)) { sfx('bad'); toast(illegalWhy(c)); shake(c); return; }
  if (U.sel === c || set.tap1) { playMine(c); return; }
  U.sel = c; sfx('sel'); render();
}
function illegalWhy(c) {
  if (S.tn === 0 && !S.trick.length) return t('why.c2');
  if (!S.trick.length) return t('why.hearts');
  const ls = suit(S.trick[0].c);
  if (S.hands[0].some(x => suit(x) === ls)) return t('why.follow', { s: HT.SYM[ls] });
  if (S.tn === 0) return t('why.first');
  return t('err.illegal');
}
function shake(c) { const e = document.querySelector(`#htHand .cd[data-c="${c}"]`); if (!e) return; e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); }
function playMine(c) {
  const L = myLegal(); if (!L.includes(c)) return;
  // the decision record (graded now if the coach's numbers are ready, else later in the review)
  const key = stateKey();
  const ev = U.coach && U.coach.key === key && U.coach.list ? U.coach.list : null;
  U.dec.push({ i: S.log.length, c, ev: ev ? ev.map(x => [x.c, +x.own.toFixed(2), +x.obj.toFixed(2)]) : null, n: ev ? U.coach.worlds : 0 });
  if (ev) { const g = grade(ev, c); if (g >= 0) D.stats.dec[g]++; }
  act(0, c);
}
function confirmPass() {
  if (!S || S.phase !== 'pass' || S.pass[0]) return;
  if (U.psel.size !== 3) { toast(t('msg.three')); sfx('bad'); return; }
  S.pass[0] = [...U.psel]; U.psel = new Set(); sfx('play'); persist(); render(); sched(loop, 250);
}
function hint() {
  if (!S || U.res) return;
  if (S.phase === 'pass' && !S.pass[0]) {
    const best = U.coach && U.coach.pass ? U.coach.pass.slice().sort((a, b) => a.obj - b.obj)[0].cards : AI.heurPass(S.hands[0], S.R, S.dir);
    U.psel = new Set(best); sfx('sel'); render(); return;
  }
  const L = myLegal(); if (!L.length) return;
  const b = U.coach && U.coach.key === stateKey() && U.coach.list ? U.coach.list.slice().sort((x, y) => x.obj - y.obj)[0].c : AI.fastPick(S, 0);
  U.sel = b; sfx('sel'); render();
}
// grade of a played card from the coach's numbers: 0 ◎ best, 1 ○ fine, 2 △ doubtful, 3 ✕ bad
function grade(list, c) {
  const best = Math.min(...list.map(x => x[2] != null ? x[2] : x.obj)), me = list.find(x => (x[0] != null ? x[0] : x.c) === c);
  if (!me) return -1;
  const d = (me[2] != null ? me[2] : me.obj) - best, k = S && S.R.spot || (G && G.R.spot) ? 4 : 1;
  return d < .35 * k ? 0 : d < 1.2 * k ? 1 : d < 3 * k ? 2 : 3;
}
const stateKey = () => S ? S.no + ':' + S.phase + ':' + S.log.length + ':' + (S.pass[0] ? 1 : 0) : '';

/* ---------------- the coach (sampling in the worker) ---------------- */
let coachN = 0;
function requestCoach() {
  if (!S) return;
  const key = stateKey();
  if (U.coach && U.coach.key === key) return;
  U.coach = { key, busy: 1 };
  const my = ++coachN;
  if (S.phase === 'pass' && !S.pass[0]) {
    think('passEval', S, 0, 0, { k: 8, worlds: 36 }).then(r => { if (my !== coachN || !U.coach || U.coach.key !== key) return; U.coach.pass = r || []; U.coach.busy = 0; renderSide(); renderActbar(); });
    think('moon', S, 0, 0, { worlds: 90 }).then(r => { if (my !== coachN || !U.coach || U.coach.key !== key) return; U.coach.moon = r; renderSide(); });
    return;
  }
  if (S.phase === 'play' && isMe(S.turn)) {
    const n = HT.legal(S, 0).length;
    think('eval', S, 0, 0, { worlds: n > 1 ? 70 : 1, ms: 1100 }).then(r => { if (my !== coachN || !U.coach || U.coach.key !== key) return; Object.assign(U.coach, { list: r ? r.list : [], worlds: r ? r.worlds : 0, busy: 0 }); renderSide(); });
  }
}

/* ---------------- the table ---------------- */
// the hand: one fanned row (sorted ♣ ♦ ♠ ♥), a little gap between suits
function layoutHand(W, H, n, suits) {
  const gaps = Math.max(0, suits - 1);
  let cw = Math.min(W > 900 ? 104 : 86, H / 1.42);
  const maxStep = cw * 1.04;
  let step = n > 1 ? Math.min(maxStep, (W - cw - gaps * cw * .18) / (n - 1)) : 0;
  if (step < cw * .34 && n > 1) { cw = Math.max(40, (W - gaps * 8) / (1 + (n - 1) * .36)); step = (W - cw - gaps * cw * .12) / (n - 1); }
  return { cw, ch: cw * 1.4, step, gap: Math.min(cw * .18, step * .4) };
}
// where each seat's card of the trick goes (fractions of the felt): bottom, left, top, right
const TP = { 0: [.5, .62], 1: [.33, .46], 2: [.5, .3], 3: [.67, .46] };
function seatHtml(s) {
  const N = NAMES(), nm = N[s], act = S.phase === 'play' && S.turn === s && !U.trickShow && !U.res;
  const raw = HT.rawPts(S, s), qs = S.taken[s].includes(QS), hearts = S.taken[s].filter(c => suit(c) === 3).length, jd = S.R.jd && S.taken[s].includes(JD);
  const tk = (hearts ? `<i class="tk h">♥${hearts}</i>` : '') + (qs ? '<i class="tk q">Q♠</i>' : '') + (S.R.bm ? S.taken[s].filter(c => c === HT.KS || c === HT.AS).map(c => `<i class="tk q">${cname(c)}</i>`).join('') : '') + (jd ? '<i class="tk j">J♦</i>' : '');
  const thinking = act && !isMe(s) && U.think ? '<span class="think"><i></i><i></i><i></i></span>' : '';
  const mt = set.coach && S.phase === 'play' ? moonWatch() : -1;
  const passMark = S.phase === 'pass' && s !== 0 ? `<span class="pready${S.pass[s] ? ' on' : ''}" title="${esc(t('pass.ready'))}">${S.pass[s] ? '✓' : '…'}</span>` : '';
  return `<div class="gseat hseat s${s}${act ? ' act' : ''}" data-k="seat${s}"><div class="plate"><span class="ava av${s}">${esc(nm.slice(0, 1))}</span><span class="pn"><b>${esc(nm)}</b><small>${esc(s === 0 ? t('total') : lvLabel(LV()))} · ${G.scores[s]}</small></span>${thinking}${passMark}<span class="hpts${raw ? ' on' : ''}${raw < 0 ? ' neg' : ''}" title="${esc(t('hpts.t'))}">${raw}</span></div>${tk || mt === s ? `<div class="tks">${tk}${mt === s ? `<i class="tk moon">☾ ${esc(t('moon.watch'))}</i>` : ''}</div>` : ''}</div>`;
}
// someone holding every penalty card so far, with a good number of them (shown to the coach-on player)
function moonWatch() { const F = { npen: [0, 1, 2, 3].map(s => S.taken[s].filter(c => HT.isPen(c, S.R)).length), pts: [0, 1, 2, 3].map(s => HT.rawPts(S, s)), tn: S.tn, R: S.R }; return AI.moonThreat(F); }
function trickHtml(cw, W, H) {
  const tr = U.trickShow ? U.trickShow.cards : S.trick;
  if (!tr.length) return '';
  const w = Math.min(cw * .86, W * .19, H * .15), go = U.trickShow && U.trickShow.go;
  return tr.map((p, i) => {
    const [fx, fy] = TP[p.s];
    let st = `left:${(fx * 100).toFixed(2)}%;top:${(fy * 100).toFixed(2)}%;--cw:${w.toFixed(1)}px;--chh:${(w * 1.4).toFixed(1)}px;z-index:${10 + i}`;
    if (go) { const [gx, gy] = TP[U.trickShow.win]; const dx = (gx - fx) * 3.2, dy = (gy - fy) * 3.2; st += `;--gx:${(dx * 100).toFixed(1)}%;--gy:${(dy * 100).toFixed(1)}%`; }
    const win = U.trickShow && U.trickShow.win === p.s && !go;
    return `<div class="htr s${p.s}${go ? ' go' : ''}${win ? ' win' : ''}" style="${st}" data-k="tr${p.c}">${Cards.html(p.c, { cls: 'in-trick', k: 'tc' + p.c })}</div>`;
  }).join('');
}
function centerHtml() {
  if (U.res) return resHtml();
  if (S.phase === 'pass') {
    const d = S.dir, N = NAMES(), to = (0 + d) % 4;
    const arrow = { 1: 'M60 30H16M28 18 16 30l12 12', 3: 'M16 30h44M48 18l12 12-12 12', 2: 'M38 52V10M26 22 38 10l12 12' }[d];
    return `<div class="passbox" data-k="passbox"><svg viewBox="0 0 76 62" class="parrow d${d}"><path d="${arrow}"/></svg><b>${esc(t('pass.h', { d: dirName(d) }))}</b><small>${esc(S.pass[0] ? t('pass.wait') : t('pass.d', { n: N[to] }))}</small></div>`;
  }
  if (S.phase === 'play' && S.tn === 0 && !S.trick.length && !U.trickShow) {
    const N = NAMES(); return `<div class="passbox small" data-k="c2box"><b>${esc(t('c2.h', { n: N[S.turn] }))}</b></div>`;
  }
  if (S.phase === 'play' && S.dir === 0 && S.tn === 0 && !S.log.length) return '';
  return '';
}
function resHtml() {
  const R = U.res; if (!R) return '';
  const N = NAMES();
  const rows = [0, 1, 2, 3].map(s => `<li class="${s === 0 ? 'me' : ''}${R.moon === s ? ' moon' : ''}"><b>${esc(N[s])}</b><em>${R.delta[s] > 0 ? '+' : ''}${R.delta[s]}</em><span>${G.scores[s]}</span></li>`).join('');
  const note = R.moon >= 0 ? t(R.moon === 0 ? 'res.moonMe' : 'res.moonThem', { n: N[R.moon], p: HT.totalPen(S.R) }) : R.delta[0] === 0 ? t('res.clean') : '';
  return `<div class="hres ${R.delta[0] <= 0 || R.moon === 0 ? 'win' : 'lose'}" data-k="hres"><b class="hres-h">${esc(t('res.h', { n: S.no }))}</b><ol class="hres-pts"><li class="hd"><b></b><em>${esc(t('res.hand'))}</em><span>${esc(t('res.total'))}</span></li>${rows}</ol>${note ? `<p>${esc(note)}</p>` : ''}` +
    `<div class="hres-b"><button class="abtn" id="hrRev">${esc(t('btn.review'))}</button>${G.over ? `<button class="abtn go" id="hrNext">${esc(t('r.final'))}<kbd>Space</kbd></button>` : `<button class="abtn go" id="hrNext">${esc(t('r.next'))}<kbd>Space</kbd></button>`}</div></div>`;
}
function render() {
  if (!S) return;
  const box = $('#htTable'), W = box.clientWidth, H = box.clientHeight;
  if (!W || !H) return;
  const pc = matchMedia(window.HeaderBar && HeaderBar.MEDIA || '(min-width:1040px)').matches;
  const hand = HT.sortDisp(S.hands[0]), nS = new Set(hand.map(suit)).size;
  const handW = W - (pc ? 60 : 16), handH = H * (pc ? .3 : .27);
  const lay = layoutHand(handW, handH, Math.max(hand.length, 1), nS);
  const L = myLegal(), myTurn = L.length > 0, LS = new Set(L);
  let h = '';
  h += [1, 2, 3].map(seatHtml).join('');
  h += `<div class="me-plate" data-k="me" style="bottom:${Math.round(lay.ch + (pc ? 24 : 14))}px">${seatHtml(0)}</div>`;
  h += trickHtml(lay.cw, W, H);
  h += centerHtml();
  // my hand
  const tot = lay.cw + Math.max(0, hand.length - 1) * lay.step + (nS - 1) * lay.gap;
  let x = (handW - tot) / 2, prevS = -1;
  const recv = U.recv && Date.now() - U.recvAt < 2600 ? new Set(U.recv) : null;
  if (recv) { clearTimeout(U.recvT); U.recvT = setTimeout(render, 2650 - (Date.now() - U.recvAt)); }
  const deal = U.deal && Date.now() - U.deal < 1400;
  const cards = hand.map((c, i) => {
    if (prevS >= 0 && suit(c) !== prevS) x += lay.gap;
    prevS = suit(c);
    const lift = lay.ch * .24 + ((S.phase === 'pass' && U.psel.has(c)) || U.sel === c ? -lay.ch * .22 : recv && recv.has(c) ? -lay.ch * .14 : 0);
    const cls = (U.sel === c || U.psel.has(c) ? 'sel ' : '') + (myTurn && !LS.has(c) ? 'dim ' : '') + (myTurn && LS.has(c) ? 'can ' : '') + (recv && recv.has(c) ? 'recv ' : '') + (deal ? 'dealing' : '');
    const el = Cards.html(c, { cls, k: 'h' + c, style: `transform:translate(${x.toFixed(1)}px,${lift.toFixed(1)}px);z-index:${i + 1};--d:${i * 30}ms` });
    x += lay.step; return el;
  }).join('');
  h += `<div class="ghand hhand${myTurn ? ' turn' : ''}" id="htHand" data-k="hand" style="--cw:${lay.cw.toFixed(1)}px;--chh:${lay.ch.toFixed(1)}px;height:${(lay.ch * 1.24).toFixed(0)}px;width:${handW}px">${cards}</div>`;
  patch(box, h);
  box.classList.toggle('small', lay.cw < 60);
  wireHand();
  const nx = $('#hrNext'); if (nx) nx.onclick = nextHand; const rv = $('#hrRev'); if (rv) rv.onclick = () => window.HtReview && HtReview.open(D.rev.length - 1);
  renderActbar(); renderSide(); renderNums();
}
function wireHand() {
  const hb = $('#htHand'); if (!hb || hb._w) return; hb._w = 1;
  hb.addEventListener('click', e => { const cd = e.target.closest('.cd'); if (cd) tapCard(+cd.dataset.c); });
  hb.addEventListener('dblclick', e => { const cd = e.target.closest('.cd'); if (cd && S && S.phase === 'play') { const c = +cd.dataset.c; if (myLegal().includes(c)) playMine(c); } });
  hb.addEventListener('contextmenu', e => { e.preventDefault(); U.sel = null; render(); });
}
function renderActbar() {
  const bar = $('#actbar'); if (!S) return;
  if (U.res) { patch(bar, `<div class="ab-msg">${esc(t(G.over ? 'ab.over' : 'ab.handEnd'))}</div>`); return; }
  if (S.phase === 'pass') {
    if (S.pass[0]) { patch(bar, `<div class="ab-msg wait">${esc(t('pass.wait'))}</div>`); return; }
    const n = U.psel.size, to = NAMES()[S.dir];
    patch(bar, `<div class="ab-msg">${esc(t('pass.pick', { n: 3 - n, p: to }))}</div><div class="ab-btns main"><button class="abtn" id="abHint">${esc(t('btn.hint'))}<kbd>H</kbd></button><button class="abtn go" id="abPass"${n === 3 ? '' : ' disabled'}>${esc(t('pass.do', { d: dirName(S.dir) }))}<kbd>Space</kbd></button></div>`);
    $('#abPass').onclick = confirmPass; $('#abHint').onclick = hint; return;
  }
  if (U.trickShow) { const N = NAMES(); patch(bar, `<div class="ab-msg wait">${esc(t('ab.took', { n: N[U.trickShow.win], p: U.trickShow.pts }))}</div>`); return; }
  if (!isMe(S.turn)) { patch(bar, `<div class="ab-msg wait">${esc(t('ab.wait', { n: NAMES()[S.turn] }))}</div>`); return; }
  let msg;
  if (S.tn === 0 && !S.trick.length) msg = t('ab.c2');
  else if (!S.trick.length) msg = S.broken || S.R.anyLead ? t('ab.lead') : t('ab.leadNoH');
  else { const ls = suit(S.trick[0].c); msg = S.hands[0].some(c => suit(c) === ls) ? t('ab.follow', { s: HT.SYM[ls] }) : t('ab.void', { s: HT.SYM[ls] }); }
  const sel = U.sel != null && myLegal().includes(U.sel);
  patch(bar, `<div class="ab-msg">${esc(msg)}</div><div class="ab-btns main"><button class="abtn" id="abHint">${esc(t('btn.hint'))}<kbd>H</kbd></button><button class="abtn go" id="abPlay"${sel ? '' : ' disabled'}>${esc(sel ? t('btn.playC', { c: cname(U.sel) }) : t('btn.play'))}<kbd>Space</kbd></button></div>`);
  $('#abPlay').onclick = () => { if (U.sel != null) playMine(U.sel); }; $('#abHint').onclick = hint;
}

/* ---------------- side panel ---------------- */
const coachSw = () => `<button type="button" class="ck-sw${set.coach ? ' on' : ''}" data-csw role="switch" aria-checked="${set.coach ? 'true' : 'false'}" title="${esc(t('set.coach'))}"><b>${set.coach ? 'ON' : 'OFF'}</b><i></i></button>`;
function renderSide() {
  if (!S) return;
  let h = '';
  h += `<div class="card sc-card" data-pt="score" data-k="score"><h3>${esc(t('side.score'))}<span class="h3s">${esc(t('hand.no', { n: S.no }))} · ${esc(t('to.target', { n: G.R.target }))}</span></h3>${scoreHtml()}</div>`;
  if (set.coach) h += `<div class="card coach-card" data-pt="coach" data-k="coach"><h3>${esc(t('side.coach'))}${coachSw()}</h3>${coachHtml()}</div>`;
  else h += `<div class="card coach-card ck-off" data-pt="coach" data-k="coach"><h3>${esc(t('side.coach'))}${coachSw()}</h3><p class="muted">${esc(t('coach.off'))}</p></div>`;
  h += `<div class="card cnt-card" data-pt="cnt" data-k="cnt"><h3>${gl(t('side.count'))}<span class="h3s">${esc(t('cnt.h'))}</span></h3>${countHtml()}</div>`;
  h += `<div class="card log-card" data-pt="log" data-k="log"><h3>${esc(t('side.log'))}<span class="h3s">${esc(t('hand.no', { n: S.no }))}</span></h3><div class="pk-log" id="htLog">${logHtml()}</div></div>`;
  patch($('#side'), h);
  const lg = $('#htLog'); if (lg) lg.scrollTop = lg.scrollHeight;
  $$('#side [data-pick]').forEach(b => b.onclick = () => { const c = +b.dataset.pick; if (S.phase === 'play' && myLegal().includes(c)) { U.sel = c; render(); } });
  const pp = $('#ckPassPick'); if (pp) pp.onclick = () => { const b = U.coach.pass.slice().sort((a, b2) => a.obj - b2.obj)[0]; U.psel = new Set(b.cards); render(); };
  const tm = $('#tipsMore'); if (tm) tm.onclick = () => { set.tipsOpen = set.tipsOpen ? 0 : 1; save(); renderSide(); };
  mTabs();
}
function scoreHtml() {
  const N = NAMES(), hist = G.hist;
  const head = `<tr><th>#</th>${N.map((n, s) => `<th class="${s === 0 ? 'me' : ''}">${esc(n)}</th>`).join('')}</tr>`;
  const rows = hist.slice(-6).map(r => `<tr><td>${r.no}<small>${esc(t('dirS.' + r.dir))}</small></td>${r.delta.map((d, s) => `<td class="${r.moon === s ? 'moon' : ''}${s === 0 ? ' me' : ''}">${d > 0 ? '+' + d : d}</td>`).join('')}</tr>`).join('');
  const cur = S.phase !== 'end' || !U.res ? `<tr class="cur"><td>${S.no}<small>${esc(t('dirS.' + S.dir))}</small></td>${[0, 1, 2, 3].map(s => `<td class="${s === 0 ? 'me' : ''}">${HT.rawPts(S, s) || '·'}</td>`).join('')}</tr>` : '';
  const tot = `<tr class="tot"><td>Σ</td>${G.scores.map((x, s) => `<td class="${s === 0 ? 'me' : ''}">${x}</td>`).join('')}</tr>`;
  const lead = Math.max(...G.scores), pct = Math.min(100, lead / G.R.target * 100);
  return `<table class="sc-tbl">${head}${rows}${cur}${tot}</table><div class="sc-bar"><i style="width:${pct.toFixed(1)}%"></i><span>${esc(G.over ? t('ab.over') : t('to.end', { n: Math.max(0, G.R.target - lead) }))}</span></div>` +
    `<p class="diff-desc">${esc(t('rule.line.' + G.R.v))} ${esc(t('moon.rule.' + (G.R.moon || 'add')))}</p>`;
}
function countHtml() {
  const K = AI.counting(S, 0), N = NAMES();
  const order = [3, 2, 1, 0];
  const rows = order.map(s => {
    const cells = [];
    for (let r = 14; r >= 2; r--) { const c = HT.card(s, r); const st = K.suits[s].mine.includes(c) ? 'me' : K.suits[s].played.includes(c) ? 'gone' : 'out'; cells.push(`<i class="${st}${HT.pts(c, S.R) > 0 ? ' pen' : HT.pts(c, S.R) < 0 ? ' bon' : ''}">${HT.RKN(r)}</i>`); }
    const voids = [1, 2, 3].filter(p => K.voids[p][s]).map(p => N[p]);
    return `<div class="cn-row s${s}"><span class="cn-s">${HT.SYM[s]}<small>${K.suits[s].un.length}</small></span><span class="cn-cells">${cells.join('')}</span>${voids.length ? `<em class="cn-void" title="${esc(t('cnt.void'))}">${esc(t('cnt.voidOf', { n: voids.join('·') }))}</em>` : ''}</div>`;
  }).join('');
  const left = K.ptsLeft.reduce((a, c) => a + Math.max(0, HT.pts(c, S.R)), 0);
  const qsWhere = S.log.some(e => e.c === QS) ? t('cnt.qsGone') : S.hands[0].includes(QS) ? t('cnt.qsMine') : K.known.some(k => k.includes(QS)) ? t('cnt.qsPassed', { n: N[K.known.findIndex(k => k.includes(QS))] }) : t('cnt.qsOut');
  return `<div class="cn-grid">${rows}</div><div class="cn-leg"><span><i class="me"></i>${esc(t('cnt.mine'))}</span><span><i class="out"></i>${esc(t('cnt.out'))}</span><span><i class="gone"></i>${esc(t('cnt.gone'))}</span></div>` +
    `<div class="cn-sum"><span>${esc(t('cnt.ptsLeft'))}<b>${left}</b></span><span>Q♠<b>${esc(qsWhere)}</b></span></div>`;
}
function logHtml() {
  const N = NAMES(); let h = '';
  if (U.passInfo && U.passInfo.got) h += `<div class="lg-st">${esc(t('log.pass', { d: dirName(U.passInfo.dir) }))}</div><div class="lg me"><b>${esc(t('log.gave'))}</b><span class="mc-row">${U.passInfo.mine.map(c => Cards.mini(c)).join('')}</span></div><div class="lg me"><b>${esc(t('log.got'))}</b><span class="mc-row">${U.passInfo.got.map(c => Cards.mini(c)).join('')}</span></div>`;
  for (const tr of S.tricks) {
    const p = tr.cards.reduce((a, x) => a + HT.pts(x.c, S.R), 0);
    h += `<div class="lg t${tr.win === 0 ? ' me' : ''}"><b>${esc(t('log.trick', { n: S.tricks.indexOf(tr) + 1 }))}</b><span class="mc-row">${tr.cards.map(x => Cards.mini(x.c, x.s === tr.win ? 'w' : '')).join('')}</span><em>${esc(N[tr.win])}${p ? ` +${p}` : ''}</em></div>`;
  }
  if (S.trick.length) h += `<div class="lg cur"><b>${esc(t('log.trick', { n: S.tn + 1 }))}</b><span class="mc-row">${S.trick.map(x => Cards.mini(x.c)).join('')}</span></div>`;
  if (!h) h = `<p class="muted">${esc(t('log.none'))}</p>`;
  return h;
}

/* ---- the coach ---- */
function coachHtml() {
  if (U.res) return `<p class="muted">${esc(t('ck.handEnd'))}</p>` + tipsHtml(tipList('end'));
  const C = U.coach && U.coach.key === stateKey() ? U.coach : null;
  if (S.phase === 'pass') {
    if (S.pass[0]) return `<p class="muted">${esc(t('ck.passWait'))}</p>` + tipsHtml(tipList('pass'));
    let h = '';
    if (!C || !C.pass) h += `<p class="muted ck-busy">${esc(t('ck.calc'))}</p>`;
    else {
      const L = C.pass.slice().sort((a, b) => a.obj - b.obj), b = L[0];
      const mine = U.psel.size === 3 ? [...U.psel].sort().join() : '';
      h += `<div class="rec"><span class="rb">${esc(t('ck.passRec'))}</span><span class="mc-row ck-cards">${b.cards.map(c => Cards.mini(c)).join('')}</span><p>${gl(passWhy(b.cards))}</p><button type="button" class="sbtn" id="ckPassPick">${esc(t('ck.pick'))}</button></div>`;
      h += `<div class="ev-list"><div class="tips-h">${gl(t('ck.passEv'))}</div>` + L.slice(0, 5).map((x, i) => evRow(x.cards.map(c => Cards.mini(c)).join(''), x.own, L[0].own, L[L.length - 1].own, i === 0, x.cards.slice().sort().join() === mine)).join('') + `</div>`;
    }
    h += moonBox(C);
    return h + tipsHtml(tipList('pass'));
  }
  const myTurn = S.phase === 'play' && isMe(S.turn) && !U.trickShow;
  let h = '';
  if (myTurn) {
    if (!C || C.busy || !C.list) h += `<p class="muted ck-busy">${esc(t('ck.calc'))}</p>`;
    else if (C.list.length) {
      const L = C.list.slice().sort((a, b) => a.obj - b.obj), b = L[0];
      const close = L.length > 1 && L[1].obj - b.obj < .15;
      h += `<div class="rec"><span class="rb">${Cards.mini(b.c)}</span><p>${gl(playWhy(b.c))}${close ? ' ' + gl(t('pk.close')) : ''}</p></div>`;
      const lo = Math.min(...L.map(x => x.own)), hi = Math.max(...L.map(x => x.own));
      h += `<div class="ev-list"><div class="tips-h">${gl(t('ck.ev', { n: C.worlds }))}</div>` + L.map((x, i) => evRow(Cards.mini(x.c), x.own, lo, hi, i === 0, U.sel === x.c, x.c, x.moonMe > .02 ? x.moonMe : 0)).join('') + `<p class="diff-desc">${gl(t('ck.evHelp'))}</p></div>`;
    }
  } else h += `<p class="muted">${esc(t('ck.notTurn'))}</p>`;
  return h + tipsHtml(tipList('play'));
}
function evRow(lab, v, lo, hi, best, mine, c, moon) {
  const w = hi > lo ? (v - lo) / (hi - lo) : 0;
  return `<div class="evr${best ? ' best' : ''}${mine ? ' mine' : ''}"${c != null ? ` data-pick="${c}" role="button" tabindex="0"` : ''}><span class="evl">${lab}</span><span class="evb"><i style="width:${(8 + w * 92).toFixed(1)}%"></i></span><b>${fmt(v)}</b>${moon ? `<em class="evm" title="${esc(t('ck.moonTry'))}">☾${Math.round(moon * 100)}%</em>` : ''}</div>`;
}
function moonBox(C) {
  if (!C || C.moon == null) return '';
  const p = Math.round(C.moon * 100), sg = AI.moonSigns(S.hands[0]);
  const lvl = p >= 25 ? 'hi' : p >= 8 ? 'mid' : 'lo';
  return `<div class="moonbox ${lvl}"><div class="tips-h">☾ ${gl(t('ck.moonH'))}<b>${p}%</b></div><p>${gl(t('ck.moon.' + lvl))}</p><p class="diff-desc">${esc(t('ck.moonSigns', { a: sg.top.reduce((a, b) => a + b, 0), h: sg.hiH, l: sg.long }))}</p></div>`;
}
// reasons in words from the board (never "the AI says")
function passWhy(cards) {
  const h = S.hands[0], R = S.R, out = [];
  const sp = h.filter(c => suit(c) === 2 && rank(c) < 12).length;
  if (cards.includes(QS)) out.push(t('pw.qs', { n: sp }));
  else if (cards.some(c => c === HT.AS || c === HT.KS) && !h.includes(QS)) out.push(t('pw.ak'));
  for (const s of [0, 1]) { const n = h.filter(c => suit(c) === s).length, k = cards.filter(c => suit(c) === s).length; if (k && k === n) out.push(t('pw.void', { s: HT.SYM[s] })); }
  if (cards.some(c => suit(c) === 3 && rank(c) >= 11)) out.push(t('pw.hearts'));
  if (h.includes(QS) && !cards.includes(QS) && sp >= 3) out.push(t('pw.keepQ', { n: sp }));
  if (!out.length) out.push(t('pw.high'));
  return out.join(' ');
}
function playWhy(c) {
  const tr = S.trick, R = S.R, h = S.hands[0];
  if (!tr.length) {
    if (suit(c) === 2 && rank(c) < 12 && !h.includes(QS) && !S.log.some(e => e.c === QS)) return t('pk.smoke');
    if (suit(c) === 3) return t('pk.leadH');
    return t('pk.leadLow');
  }
  const ls = suit(tr[0].c); let w = tr[0]; for (const x of tr) if (suit(x.c) === ls && rank(x.c) > rank(w.c)) w = x;
  const tp = tr.reduce((a, x) => a + HT.pts(x.c, R), 0);
  if (suit(c) !== ls) {
    if (c === QS) return t('pk.dumpQ', { n: NAMES()[w.s] });
    if (HT.pts(c, R) > 0) return t('pk.dumpPts', { n: NAMES()[w.s] });
    return rank(c) >= 10 ? t('pk.dumpHigh') : t('pk.dumpSide', { s: HT.SYM[suit(c)] });
  }
  if (rank(c) < rank(w.c)) return tr.length === 3 ? t('pk.duckLast') : t('pk.duck');
  if (tr.length === 3) return tp > 0 ? t('pk.forced') : t('pk.winClean');
  if (moonWatch() === w.s && w.s !== 0) return t('pk.stopMoon');
  return t('pk.over');
}
function tipList(ph) {
  const out = [], R = S.R, h = S.hands[0];
  if (ph === 'pass') {
    const sp = h.filter(c => suit(c) === 2 && rank(c) < 12).length;
    if (h.includes(QS)) out.push(t(sp >= 4 ? 'tip.qsSafe' : 'tip.qsPass', { n: sp }));
    if ((h.includes(HT.AS) || h.includes(HT.KS)) && !h.includes(QS)) out.push(t('tip.akSp'));
    if ([0, 1].some(s => { const n = h.filter(c => suit(c) === s).length; return n > 0 && n <= 3; })) out.push(t('tip.void'));
    if (S.dir === 3) out.push(t('tip.right')); else if (S.dir === 1) out.push(t('tip.left'));
    out.push(t('tip.lowH'), t('tip.2c'));
    if (R.jd) out.push(t('tip.jd'));
    if (R.bm) out.push(t('tip.bm'));
  } else if (ph === 'play') {
    const mt = moonWatch();
    if (mt > 0) out.push(t('tip.stopMoon', { n: NAMES()[mt] }));
    if (!S.log.some(e => e.c === QS) && !h.includes(QS)) out.push(t('tip.qsOut'));
    if (h.includes(QS)) out.push(t('tip.qsHold'));
    if (!S.broken && !R.anyLead) out.push(t('tip.notBroken'));
    if (S.trick.length === 3) out.push(t('tip.last'));
    const K = AI.counting(S, 0);
    const hearts = K.suits[3].un.length; if (S.tn >= 4) out.push(t('tip.countH', { n: hearts }));
    out.push(t('tip.g1'), t('tip.g2'), t('tip.g3'));
  } else out.push(t('tip.g4'), t('tip.g5'), t('tip.g6'));
  return out;
}
function tipsHtml(tips) {
  if (!tips.length) return '';
  const n = 3, open = !!set.tipsOpen, show = open ? tips : tips.slice(0, n);
  return `<div class="tips"><div class="tips-h">💡 ${esc(t('tips.h'))}</div><ul>${show.map(x => `<li>${gl(x)}</li>`).join('')}</ul>` +
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
if (window.ResizeObserver) { let lw = 0, lh = 0, q = 0; new ResizeObserver(() => { const b = $('#htTable'); if (!b || (b.clientWidth === lw && b.clientHeight === lh)) return; lw = b.clientWidth; lh = b.clientHeight; if (!q) q = requestAnimationFrame(() => { q = 0; if (S) render(); }); }).observe($('#htTable')); }
let HB = null;
function renderNums() {
  const game = `<span class="sg"><b>${esc(t('var.' + G.R.v))}</b><em>${esc('CPU ' + lvLabel(LV()))}</em></span>`;
  const stat = (lab, val, cls) => `<span class="ss${cls ? ' ' + cls : ''}"><small>${esc(lab)}</small><b>${val}</b></span>`;
  const stats = stat(t('hand.short'), '#' + S.no) + stat(t('pass.s'), esc(t('dirS.' + S.dir))) + stat(t('you'), G.scores[0], 'me') + stat(t('to.short'), G.R.target);
  $('#infobar').innerHTML = game + stats;
  const mg = `<b>${esc(t('title'))}</b><em>#${S.no} · ${esc(t('dirS.' + S.dir))} · ${esc(t('you'))} ${G.scores[0]}</em>`;
  if ($('#mGame').innerHTML !== mg) $('#mGame').innerHTML = mg;
  if (HB && HB.on) HB.setInfo(game + `<span class="sdiv"></span>` + stats);
}

/* ---------------- statistics dialog ---------------- */
function openStats() { renderStats(); openOv('#statsOverlay'); }
function renderStats() {
  const st = D.stats;
  if (!st.hands) { $('#statsBody').innerHTML = `<p class="muted center">${esc(t('st.none'))}</p>`; return; }
  const pc = (a, b) => b ? Math.round(a / b * 100) + '%' : '—';
  const dn = st.dec.reduce((a, b) => a + b, 0);
  const cells = [['st.games', st.games], ['st.gwin', pc(st.gwins, st.games)], ['st.hands', st.hands], ['st.avg', fmt(st.pts / st.hands)],
    ['st.zero', pc(st.zero, st.hands)], ['st.qs', pc(st.qs, st.hands)], ['st.moonMe', st.moonMe], ['st.moonThem', st.moonThem]];
  const places = [0, 1, 2, 3].map(i => `<div class="fq"><span>${esc(t('place.' + i))}</span><span class="fq-b"><i style="width:${(st.games ? st.places[i] / st.games * 100 : 0).toFixed(1)}%"></i></span><b>${pc(st.places[i], st.games)}</b></div>`).join('');
  const decs = ['◎', '○', '△', '✕'].map((m, i) => `<div class="fq"><span>${m} ${esc(t('gr.' + i))}</span><span class="fq-b"><i style="width:${(dn ? st.dec[i] / dn * 100 : 0).toFixed(1)}%"></i></span><b>${pc(st.dec[i], dn)}</b></div>`).join('');
  const lvRows = Object.keys(st.byLv).sort((a, b) => a - b).map(l => { const b = st.byLv[l]; return `<tr><td>Lv.${l}</td><td>${b.g}</td><td>${pc(b.w, b.g)}</td><td>${b.h}</td><td>${fmt(b.p / b.h)}</td></tr>`; }).join('');
  const vRows = VARS.filter(v => st.byV[v]).map(v => { const b = st.byV[v]; return `<tr><td>${esc(t('var.' + v))}</td><td>${b.g}</td><td>${pc(b.w, b.g)}</td><td>${b.h}</td><td>${fmt(b.p / b.h)}</td></tr>`; }).join('');
  const th = `<tr><th></th><th>${esc(t('st.games'))}</th><th>${esc(t('st.gwin'))}</th><th>${esc(t('st.hands'))}</th><th>${esc(t('st.avgS'))}</th></tr>`;
  $('#statsBody').innerHTML = `<div class="st-grid">${cells.map(([k, v]) => `<div><small>${esc(t(k))}</small><b>${v}</b></div>`).join('')}</div>` +
    `<div class="st-two"><div><span class="lab">${esc(t('st.places'))}</span>${places}<span class="lab">${esc(t('st.dec'))}</span>${dn ? decs : `<p class="muted">${esc(t('st.decNone'))}</p>`}</div>` +
    `<div><span class="lab">${esc(t('st.byLv'))}</span><table class="st-tbl">${th}${lvRows}</table><span class="lab">${esc(t('st.byV'))}</span><table class="st-tbl">${th}${vRows}</table></div></div>` +
    `<p class="diff-desc">${esc(t('st.help'))}</p>`;
}
$('#btnStatsClose').onclick = () => closeOv('#statsOverlay');
$('#btnStatsReset').onclick = () => confirmBox(t('st.resetQ'), () => { D.stats = ST0(); save(); renderStats(); });

/* ---------------- dialogs ---------------- */
function openOv(sel) { $$('.overlay.show').forEach(o => o.classList.remove('show')); $(sel).classList.add('show'); }
function closeOv(sel) { $(sel).classList.remove('show'); if (S && !document.querySelector('.overlay.show')) { if (S.phase !== 'end' && !U.trickShow) sched(loop, 200); } }
$$('.overlay').forEach(o => o.addEventListener('pointerdown', e => { if (e.target === o && o.id !== 'rulesOverlay') { if (o.id === 'confirmOverlay') cfDone(false); closeOv('#' + o.id); } }));
let cfCb = null;
function confirmBox(msg, yes) { $('#cfMsg').textContent = msg; cfCb = yes; openOv('#confirmOverlay'); setTimeout(() => $('#cfNo').focus(), 30); }
function cfDone(ok) { closeOv('#confirmOverlay'); const f = cfCb; cfCb = null; if (ok && f) f(); }
$('#cfNo').onclick = () => cfDone(false); $('#cfYes').onclick = () => cfDone(true);
let toastT = 0;
function toast(m) { const e = $('#toast'); e.textContent = m; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2600); }

/* new game */
let NG = null, ngTab = 'game';
function openNew() { NG = { v: G ? G.R.v : set.v, lvl: LV() }; ngTab = 'game'; renderNew(); openOv('#newOverlay'); }
function seg(items, cur, attr) { return `<div class="seg">${items.map(([val, lab]) => `<button type="button" data-${attr}="${esc(val)}" class="${String(val) === String(cur) ? 'sel' : ''}">${esc(lab)}</button>`).join('')}</div>`; }
// the art of each variant: a few cards fanned out
const GART = { std: [HT.card(3, 14), QS, HT.card(3, 10), HT.card(0, 2)], omni: [HT.card(3, 13), JD, QS, HT.card(3, 5)], maria: [HT.AS, HT.KS, QS, HT.card(3, 9)], spot: [HT.card(3, 14), HT.card(3, 13), HT.card(3, 12), QS] };
const ROT = [[0, .15, -10], [.5, .05, -3], [1.05, .05, 4], [1.6, .15, 10]];
function gArt(k) { return `<span class="garts">` + (GART[k] || GART.std).map((c, i) => { const [x, y, r] = ROT[i]; return `<span class="cd" style="left:calc(var(--cw)*${x});top:calc(var(--cw)*${y});transform:rotate(${r}deg)"><span class="in">${Cards.face(c)}</span></span>`; }).join('') + `</span>`; }
function lvDesc(l) { return t(l <= 2 ? 'lvd.1' : l <= 4 ? 'lvd.2' : l <= 7 ? 'lvd.3' : l <= 11 ? 'lvd.4' : l <= 15 ? 'lvd.5' : 'lvd.6'); }
function renderNew() {
  $('#ngTabs').innerHTML = ['game', 'rules', 'design'].map(k => `<button type="button" class="${k === ngTab ? 'sel' : ''}" data-tab="${k}">${esc(t('tab.' + k))}${k === 'rules' ? `<small>${esc(t('var.' + NG.v))}</small>` : ''}</button>`).join('');
  let h;
  if (ngTab === 'game') h = `<div class="ng-games ht4">` + VARS.map(k => `<button type="button" class="gcard${k === NG.v ? ' sel' : ''}" data-g="${k}"><span class="gart">${gArt(k)}</span><b>${esc(t('var.' + k))}</b><p>${esc(t('var.' + k + '.d'))}</p><span class="gpick">${k === NG.v ? '✓' : ''}</span></button>`).join('') +
    `<div class="ht-online" aria-disabled="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.8 5.8 3.8 9s-1.2 6.2-3.8 9c-2.6-2.8-3.8-5.8-3.8-9s1.2-6.2 3.8-9z"/></svg><div><b>${esc(t('ol.h'))}</b><p>${esc(t('ol.d'))}</p></div><em>${esc(t('ol.tag'))}</em></div></div>`;
  else if (ngTab === 'rules') {
    const base = HT.VARIANTS[NG.v];
    const row = (lab, help, html) => `<div class="rl"><div class="rl-t"><b>${esc(lab)}</b>${help ? `<small>${esc(help)}</small>` : ''}</div>${html}</div>`;
    const pass = set.pass || base.pass, target = set.target || base.target, anyLead = set.anyLead === -1 ? base.anyLead : set.anyLead;
    h = `<div class="rl-list">` +
      row(t('o.level'), '', `<div class="lvsl"><input type="range" min="1" max="20" step="1" value="${NG.lvl}" id="ngLv"><b id="ngLvN">${lvLabel(NG.lvl)}</b></div><p class="lv-desc" id="ngLvD">${esc(lvDesc(NG.lvl))}</p>`) +
      row(t('o.pass'), t('o.pass.h'), `<div class="seg" data-pd>${['lrah', 'lra', 'left', 'right', 'none'].map(p => `<button type="button" data-pass="${p}" class="${p === pass ? 'sel' : ''}">${esc(t('pass.' + p))}</button>`).join('')}</div>`) +
      row(t('o.moon'), t('o.moon.h'), seg([['add', t('moon.add')], ['sub', t('moon.sub')], ['best', t('moon.best')]], set.moon || 'add', 'moon')) +
      row(t('o.target'), '', `<div class="seg" data-pd>${(NG.v === 'spot' ? [300, 500, 800] : [50, 100, 150]).map(n => `<button type="button" data-tg="${n}" class="${n === target ? 'sel' : ''}">${n}</button>`).join('')}</div>`) +
      row(t('o.first'), t('o.first.h'), seg([[0, t('off')], [1, t('on')]], set.firstPts ? 1 : 0, 'fp')) +
      row(t('o.qb'), t('o.qb.h'), seg([[0, t('off')], [1, t('on')]], set.qBreaks ? 1 : 0, 'qb')) +
      row(t('o.any'), t('o.any.h'), seg([[0, t('off')], [1, t('on')]], anyLead ? 1 : 0, 'al')) +
      `</div><p class="diff-desc">${esc(t('o.note'))}</p>`;
  } else h = designHtml();
  const body = $('#ngBody'); body.innerHTML = h; body.dataset.tab = ngTab;
  $$('#ngTabs [data-tab]').forEach(b => b.onclick = () => { ngTab = b.dataset.tab; renderNew(); });
  $$('#ngBody [data-g]').forEach(b => { b.onclick = () => { if (NG.v !== b.dataset.g) { NG.v = b.dataset.g; set.pass = ''; set.target = 0; set.anyLead = -1; save(); } renderNew(); }; b.ondblclick = () => $('#btnStart').click(); });
  const lv = $('#ngLv'); if (lv) lv.oninput = () => { NG.lvl = +lv.value; $('#ngLvN').textContent = lvLabel(NG.lvl); $('#ngLvD').textContent = lvDesc(NG.lvl); };
  $$('#ngBody [data-pass]').forEach(b => b.onclick = () => { set.pass = b.dataset.pass === HT.VARIANTS[NG.v].pass ? '' : b.dataset.pass; save(); renderNew(); });
  $$('#ngBody [data-moon]').forEach(b => b.onclick = () => { set.moon = b.dataset.moon; save(); renderNew(); });
  $$('#ngBody [data-tg]').forEach(b => b.onclick = () => { set.target = +b.dataset.tg === HT.VARIANTS[NG.v].target ? 0 : +b.dataset.tg; save(); renderNew(); });
  $$('#ngBody [data-fp]').forEach(b => b.onclick = () => { set.firstPts = +b.dataset.fp; save(); renderNew(); });
  $$('#ngBody [data-qb]').forEach(b => b.onclick = () => { set.qBreaks = +b.dataset.qb; save(); renderNew(); });
  $$('#ngBody [data-al]').forEach(b => b.onclick = () => { const v = +b.dataset.al; set.anyLead = v === HT.VARIANTS[NG.v].anyLead ? -1 : v; save(); renderNew(); });
  if (ngTab === 'design') wireDesign(body);
}
$('#btnNewClose').onclick = () => closeOv('#newOverlay');
$('#btnStart').onclick = () => {
  set.v = NG.v; set.lvl = NG.lvl; save(); closeOv('#newOverlay');
  const go = () => newGame({ v: NG.v, lvl: NG.lvl });
  if (G && !G.over && G.hand > 0 && (G.hist.length || (S && S.log.length))) confirmBox(t('ng.abandonQ'), go); else go();
};

/* design (shared with the poker / guandan pages) */
function designHtml() {
  const felt = FELTS.map(f => `<button type="button" class="tile${set.felt === f ? ' sel' : ''}" data-felt="${f}"><span class="pv felt-pv" style="${feltStyle(f)}"></span><small>${esc(t('felt.' + f))}</small></button>`).join('');
  const back = BACKS.map(b => `<button type="button" class="tile${set.back === b ? ' sel' : ''}" data-back="${b}"><span class="pv"><span class="mini-card bk-pv" data-b="${b}"><span class="bk"></span></span></span><small>${esc(t('back.' + b))}</small></button>`).join('');
  const court = COURTS.map(k => `<button type="button" class="tile${set.court === k ? ' sel' : ''}" data-court="${k}"><span class="pv">${['K', 'Q', 'J'].map((r, i) => `<img class="ct-pv${Cards.FULL_DECKS.includes(k) ? ' full' : ''}" src="${Cards.IMG}${Cards.COURT_DIR[k]}${Cards.FULL_DECKS.includes(k) ? ['A', '7', 'K'][i] : r}${'hsd'[i]}.webp" alt="">`).join('')}</span><small>${esc(t('court.' + k))}</small></button>`).join('');
  return `<div class="dz"><div class="dz-l"><div class="sec"><span class="lab">${esc(t('new.back'))}</span><div class="tiles backs">${back}</div></div></div><div class="dz-r"><div class="sec"><span class="lab">${esc(t('new.court'))}</span><div class="tiles faces">${court}</div></div></div></div><div class="sec dz-felt"><span class="lab">${esc(t('new.felt'))}</span><div class="tiles felts">${felt}</div></div>`;
}
function feltStyle(f) {
  const c = { claret: ['#7d2236', '#2c0812'], green: ['#22704a', '#0e3a25'], blue: ['#235c97', '#0f2a4d'], wine: ['#5a2a52', '#200a1e'], charcoal: ['#3a3f45', '#16191c'], teal: ['#1d7474', '#0b3535'], purple: ['#56357f', '#24123d'], mocha: ['#6e4a2f', '#2e1b0f'] }[f];
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
  if (setTab === 'play') h = `<div class="set-cols"><div class="rl-list">` + sw('coach', t('set.coach'), t('set.coach.h')) + sw('tap1', t('set.tap1'), t('set.tap1.h')) + `</div><div class="rl-list">` + sw('anim', t('set.anim')) + sw('sound', t('set.sound')) +
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
$('#btnHint').onclick = hint;
$('#btnResign').onclick = () => {
  if (!G) return;
  if (G.over) { newGame(); return; }
  const go = () => { unsched(); recordAbandon(); toast(t('resigned')); newGame({ v: G.R.v, lvl: G.lvl }); };
  if (window.Resign) Resign.confirm({ lang: LANG }).then(ok => { if (ok) go(); }); else confirmBox(t('resignQ'), go);
};
$('#btnStats').onclick = openStats;
$('#btnLesson').onclick = () => window.HtLessons && HtLessons.open();
$('#btnStudy').onclick = () => window.HtStudy && HtStudy.open();
$('#btnReview').onclick = () => window.HtReview && HtReview.open(D.rev.length - 1);
$('#langSel').onchange = () => { LANG = $('#langSel').value; try { localStorage.setItem('aicoding-lang', LANG); } catch (e) {} applyI18n(); render(); if (window.HtRules && HtRules.relang) HtRules.relang(); if (window.GameRecord) GameRecord.relabel(); };
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea') || $('.overlay.show') || !S) return;
  const k = e.key.toLowerCase();
  if (U.res && (k === ' ' || k === 'enter')) { e.preventDefault(); nextHand(); return; }
  if (k === 'h') { hint(); return; }
  if (S.phase === 'pass') { if (k === ' ' || k === 'enter') { e.preventDefault(); confirmPass(); } return; }
  const L = myLegal(); if (!L.length) return;
  if (k === ' ' || k === 'enter') { e.preventDefault(); if (U.sel != null) playMine(U.sel); }
  else if (k === 'arrowleft' || k === 'arrowright') {
    e.preventDefault(); const hs = HT.sortDisp(S.hands[0]).filter(c => L.includes(c)); let i = hs.indexOf(U.sel);
    i = i < 0 ? (k === 'arrowleft' ? hs.length - 1 : 0) : (i + (k === 'arrowleft' ? -1 : 1) + hs.length) % hs.length; U.sel = hs[i]; sfx('sel'); render();
  } else if (k === 'escape') { U.sel = null; render(); }
});

/* ---------------- start ---------------- */
applyI18n();
if (window.GameRecord) GameRecord.init({ game: 'hearts', lang: () => LANG, menu: '.controls', variant: () => { const k = G ? G.R.v : set.v; return { k, n: t('var.' + k) }; }, variants: () => VARS, variantName: k => t('var.' + k), defVariant: 'std' });
HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnResign', '#btnHint', '#btnRules', '#btnLesson', '#btnStudy', '#btnReview', '#btnStats'], lang: () => LANG }) : null;
if (HB) HB.onChange(() => setTimeout(() => { if (S) render(); }, 0));
if (window.RulesOffer) RulesOffer.init({ game: 'hearts', lang: () => LANG, open: () => window.HtRules && HtRules.open(), watch: '#rulesOverlay' });
$('#btnSound').classList.toggle('on', !!set.sound);
// resume the saved game (a hand in progress continues where it was)
if (D.cur && D.cur.G && D.cur.S) {
  G = D.cur.G; S = D.cur.S; U.res = D.cur.res || null; U.dec = D.cur.dec || []; U.passInfo = D.cur.passInfo || null;
  if (S.phase === 'end' && !U.res) { render(); handEnd(); }
  else { render(); if (S.phase === 'pass') aiPasses(); if (!U.res) sched(loop, 700); }
} else { newGame(); }

window.HtApp = { get G() { return G; }, get S() { return S; }, get LANG() { return LANG; }, t, esc, gl, sfx, openOv, closeOv, toast, confirmBox, set, D, save, render, gArt, cname, NAMES, dirName, newGame, nextHand, loop, sched, unsched, U, lvLabel, think, grade, fmt, AI, HT, showTab(pt) { set.mTab = pt; mTabs(); } };
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-csw]'); if (!b || !S) return; e.preventDefault(); const sc = document.querySelector('.stage'), st = sc ? sc.scrollTop : 0; set.coach = set.coach ? 0 : 1; save(); render(); toast(t('side.coach') + ' ' + (set.coach ? 'ON' : 'OFF')); if (set.coach) requestCoach(); if (sc) sc.scrollTop = st; });
})();
