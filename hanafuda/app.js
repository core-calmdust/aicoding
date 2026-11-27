/* 花札（こいこい） — game controller (hanafuda/app.js)
   You (seat 0) against the AI (seat 1). Rules: engine.js · AI: ai.js (in worker.js) · card faces: cards.js
   rules tutorial: rules.js · lessons: lessons.js */
(function () {
'use strict';
const HF = window.HF, AI = window.HFAI, CARDS = window.HFCards;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-hanafuda', SUPPORTED = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const ME = 0, CPU = 1;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- storage ---------------- */
function load() { try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { return {}; } }
const D = load();
D.set = Object.assign({ mode: 'ai', lv: 5, preset: 'nintendo', opts: {}, back: 'black', table: 'indigo', coach: 1, sound: true }, D.set || {});
const set = D.set;
function save() { try { localStorage.setItem(STORE, JSON.stringify(D.m && D.m.tut ? Object.assign({}, D, { m: saved ? JSON.parse(saved) : null }) : D)); } catch (e) {} }
function rules() { return HF.opts(Object.assign({}, HF.PRESETS[set.preset] || {}, set.preset === 'custom' ? set.opts : {})); }

/* ---------------- language ---------------- */
let LANG = (() => { const n = (navigator.language || 'ja').toLowerCase(); if (/^zh-(tw|hk|mo)\b|^zh-hant/.test(n)) return 'zh-TW'; return SUPPORTED.find(c => c !== 'zh-TW' && n.startsWith(c.toLowerCase())) || 'en'; })();
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) LANG = q; }
function t(k, v) {
  let x = (I18N[LANG] || I18N.en)[k]; if (x === undefined) x = I18N.en[k]; if (x === undefined) x = I18N.ja[k]; if (x === undefined) return k;
  if (v) x = String(x).replace(/\{(\w+)\}/g, (_, y) => v[y] !== undefined ? v[y] : ''); return x;
}
const cardName = id => { const c = HF.CARDS[id], P = (window.PLANTS[LANG] || window.PLANTS.en); const sp = LANG === 'ja' || LANG.startsWith('zh') ? '' : ' · '; return P[c.m] + (LANG === 'ja' || LANG.startsWith('zh') ? 'の' : sp) + t('k.' + c.type); };
const cardNameJa = cardName;
function applyI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  $$('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); e.setAttribute('aria-label', e.title); });
  $('#langSel').value = LANG; document.title = t('meta.title');
  $('#brandTitle').textContent = t('title'); $('#brandSub').textContent = t('sub');
  render();
}
$('#langSel').addEventListener('change', e => { LANG = e.target.value; try { localStorage.setItem('aicoding-lang', LANG); } catch (er) {} applyI18n(); if (window.HFRules) HFRules.relang(); });

/* ---------------- sound ---------------- */
let AC = null;
function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended' && !document.hidden) AC.resume(); return AC; }
document.addEventListener('visibilitychange', () => { if (AC) { if (document.hidden) AC.suspend(); else AC.resume(); } });
function tone(a, t0, f, dur, g, type) { const o = a.createOscillator(), gn = a.createGain(); o.type = type || 'sine'; o.frequency.value = f; gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(g, t0 + .01); gn.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.connect(gn).connect(a.destination); o.start(t0); o.stop(t0 + dur + .05); }
function clack(a, t0, g) { const n = Math.floor(a.sampleRate * .05), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 6); const s = a.createBufferSource(), f = a.createBiquadFilter(), gn = a.createGain(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 1.4; gn.gain.value = g; s.buffer = b; s.connect(f).connect(gn).connect(a.destination); s.start(t0); tone(a, t0, 210, .07, g * .25, 'triangle'); }
function sfx(k) {
  if (!set.sound || document.hidden) return; const a = ac(); if (!a) return; const n = a.currentTime + .005;
  if (k === 'play') clack(a, n, .9); else if (k === 'take') { clack(a, n, 1); clack(a, n + .07, .7); }
  else if (k === 'yaku') [659.3, 880, 1174.7].forEach((f, i) => tone(a, n + i * .09, f, .6, .07, 'triangle'));
  else if (k === 'koi') { tone(a, n, 523.3, .25, .08, 'triangle'); tone(a, n + .14, 784, .4, .08, 'triangle'); }
  else if (k === 'win') [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(a, n + i * .1, f, .8, .08, 'triangle'));
  else if (k === 'lose') tone(a, n, 220, .5, .07, 'sine');
  else if (k === 'ok') { tone(a, n, 1046.5, .5, .12, 'triangle'); tone(a, n + .2, 1318.5, .7, .12, 'triangle'); }
  else if (k === 'ng') tone(a, n, 220, .3, .08, 'sine');
}

/* ---------------- worker ---------------- */
let W = null, wid = 0; const wait = new Map();
try { W = new Worker('worker.js?v=3'); W.onmessage = e => { const f = wait.get(e.data.id); if (f) { wait.delete(e.data.id); f(e.data); } }; } catch (e) { W = null; }
function think(s, lv) {
  const seed = (Math.random() * 1e9) | 0;
  if (!W) return Promise.resolve(AI.choose(s, lv, seed));
  return new Promise(res => { const id = ++wid; wait.set(id, res); W.postMessage({ id, s, lv, seed }); });
}
// the game does not move on while the window is in the background
function focused() { return new Promise(res => { const ok = () => !document.hidden && document.hasFocus(); if (ok()) return res(); const iv = setInterval(() => { if (ok()) { clearInterval(iv); res(); } }, 300); }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- match state ---------------- */
// D.m = { o, months, k (0-based month index), scores:[me,cpu], oya, s (hand state), hist:[{winner,pts}], lv, over }
let busy = false, pick = null, hintId = null, lastLogLen = 0, gen = 0;
function startMatch() {
  const rated = set.mode === 'rated' && window.HFRated;
  if (rated && HFRated.gate(() => startMatch())) return;
  const o = rated ? HF.opts({ months: 6 }) : rules();
  const od = HF.oyaDraw((Math.random() * 1e9) | 0);
  let lv = set.lv, rt = null;
  if (rated) { const pk = HFRated.pick(); lv = pk.lv; rt = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), lv: pk.lv, or: pk.or }; }
  D.m = { o, months: o.months, k: 0, scores: [0, 0], oya: od.oya, hist: [], lv, s: null, over: false, oyaCards: od.cards, rated: rt };
  deal();
  toast(rated ? HFRated.r('vs', { lv, r: rt.or }) + ' ・ ' + t(od.oya === ME ? 'oya.you' : 'oya.cpu') : t(od.oya === ME ? 'oya.you' : 'oya.cpu'));
}
function deal() {
  const m = D.m;
  m.s = HF.deal((Math.random() * 1e9) | 0, m.oya, m.o);
  m.dec = []; reviewing = false;
  lastLogLen = 0; pick = null; hintId = null; gen++;
  save(); render(); step();
}

/* ---------------- flow ---------------- */
async function step() {
  const m = D.m; if (!m || m.over) return;
  const s = m.s, my = gen;
  if (s.phase === 'over') return handOver();
  if (s.phase === 'draw') { if (s.turn === CPU && m.tut && window.HFTut) { while (HFTut.hold()) { await sleep(250); if (my !== gen) return; } } await sleep(420); if (my !== gen) return; await focused(); act('draw'); return; }
  if (s.turn === CPU && m.tut && window.HFTut) { while (HFTut.hold()) { await sleep(250); if (my !== gen) return; } }
  if (s.turn === CPU) {
    busy = true; render();
    await sleep(s.phase === 'play' ? 520 : 380); await focused();
    if (my !== gen) return;
    const r = m.tut ? { action: m.script.length ? m.script.shift() : HF.actions(s)[0] } : await think(s, m.lv);
    if (my !== gen) return;
    busy = false;
    if (s.phase === 'koi') { banner(t(r.action === 'koi' ? 'koi.cpuKoi' : 'koi.cpuStop')); sfx(r.action === 'koi' ? 'koi' : 'yaku'); await sleep(900); }
    act(r.action);
    return;
  }
  busy = false;
  if (s.phase === 'koi') { sfx('yaku'); showKoi(); }
  render();
  if (set.coach) coachThink();
}
function act(a) {
  const m = D.m, s = m.s;
  if (s.turn === ME && !m.tut && a !== 'draw' && HF.actions(s).length > 1) (m.dec || (m.dec = [])).push({ s, a });
  const before = s.caps[s.turn].length;
  m.s = HF.apply(s, a);
  if (m.s.caps[s.turn].length > before) sfx('take'); else if (a !== 'stop' && a !== 'koi') sfx('play');
  if (a === 'koi') sfx('koi');
  pick = null; hintId = null;
  save(); render(); step();
}
function handOver() {
  const m = D.m, s = m.s, r = s.result;
  if (m.tut) { m.scores[r.winner] += r.pts; showResult(r, false); render(); return; }
  if (r.winner >= 0) m.scores[r.winner] += r.pts;
  m.hist.push({ winner: r.winner, pts: r.pts });
  const last = m.k + 1 >= m.months;
  sfx(r.winner === ME ? 'win' : r.winner === CPU ? 'lose' : 'play');
  showResult(r, last);
  save(); render();
}
function nextHand() {
  const m = D.m;
  if (m.k + 1 >= m.months) { finishMatch(); return; }
  m.oya = HF.nextOya(m.s); m.k++;
  deal();
}
function finishMatch() {
  const m = D.m; m.over = true; save();
  const [a, b] = m.scores, res = a > b ? 'w' : a < b ? 'l' : 'd';
  const x = m.rated && window.HFRated ? HFRated.settle(m, res === 'w' ? 1 : res === 'l' ? 0 : 0.5) : null;
  save();
  if (window.GameRecord) GameRecord.add({ mode: m.rated ? 'rated' : 'ai', res, side: 0, opp: 'AI Lv.' + m.lv, key: (m.rated ? 'rated:' : 'ai:') + m.lv, n: m.months, why: a + '-' + b });
  $('#resBody').innerHTML = `<h2>${esc(t('match.h'))}</h2><div class="big">${esc(t(res === 'w' ? 'match.win' : res === 'l' ? 'match.lose' : 'match.draw'))}</div><div class="pts">${a} − ${b}</div>` + (x ? `<p class="note">${HFRated.resHtml(x)}</p>` : '');
  $('#resClose').style.display = '';
  $('#resNext').textContent = t('match.again');
  $('#resNext').onclick = () => { closeOv('#resOverlay'); openNew(); };
  openOv('#resOverlay'); render();
}

/* ---------------- input ---------------- */
function onHand(id) {
  const m = D.m; if (!m || busy) return; const s = m.s;
  if (s.turn !== ME || s.phase !== 'play') return;
  if (m.tut && window.HFTut && !HFTut.allow(id)) return;
  act(id);
}
function onField(id) {
  const m = D.m; if (!m || busy) return; const s = m.s;
  if (s.turn !== ME || (s.phase !== 'pickPlay' && s.phase !== 'pickDraw')) return;
  if (HF.actions(s).indexOf(id) < 0) return;
  act(id);
}

/* ---------------- dialogs ---------------- */
function openOv(sel) { $(sel).classList.add('on'); }
function closeOv(sel) { $(sel).classList.remove('on'); }
function ylist(list) { return '<ul class="ylist">' + list.map(y => `<li><span>${esc(t('y.' + y.id))}</span><b>${esc(t('res.pts', { n: y.pts }))}</b></li>`).join('') + '</ul>'; }
async function showKoi() {
  const s = D.m.s, y = HF.yaku(s.caps[ME], s.o);
  $('#koiBody').innerHTML = ylist(y.list) + `<p>${esc(t('koi.q'))}</p><p class="adv" id="koiAdv"></p>`;
  $('#btnKoi').style.display = HF.canKoi(s) && !D.m.tut ? '' : 'none';
  openOv('#koiOverlay');
  if (set.coach && !D.m.tut) {
    const r = await think(s, 16);
    const sc = Object.fromEntries(r.scores.map(x => [x.a, x.v]));
    const el = $('#koiAdv'); if (el && sc.koi !== undefined) el.textContent = t('coach.koiAdvice', { e: sc.koi.toFixed(1), s: sc.stop.toFixed(1) });
  }
}
$('#btnStop').onclick = () => { closeOv('#koiOverlay'); act('stop'); };
$('#btnKoi').onclick = () => { closeOv('#koiOverlay'); act('koi'); };
function showResult(r, last) {
  let h = '';
  if (r.winner < 0) h = `<div class="big">${esc(t('res.draw'))}</div>`;
  else {
    h = `<div class="big">${esc(t(r.winner === ME ? 'res.win' : 'res.lose'))}</div>` + ylist(r.yaku) + `<div class="pts">${esc(t('res.pts', { n: r.pts }))}</div>`;
    const notes = (r.notes || []).map(n => n === 'over7' ? t('res.over7') : n === 'koigaeshi' ? t('res.koigaeshi') : /^koi\d/.test(n) ? t('res.koiself', { n: n.slice(3), m: +n.slice(3) + 1 }) : '').filter(Boolean);
    if (notes.length) h += `<p class="note">${notes.map(esc).join('<br>')}</p>`;
  }
  h += `<p class="note">${esc(t('monthOf', { n: D.m.k + 1, m: D.m.months }))} ・ ${esc(t('you'))} ${D.m.scores[0]} − ${D.m.scores[1]} ${esc(t('cpu'))}</p>`;
  if (!D.m.tut && window.HFReview && (D.m.dec || []).length) h += `<p style="text-align:center;margin-top:10px"><button type="button" class="mbtn" id="resReview">${esc(HFRated.r('rv'))}</button></p>`;
  $('#resBody').innerHTML = h;
  $('#resClose').style.display = D.m.tut ? 'none' : '';
  const rvb = document.getElementById('resReview');
  if (rvb) rvb.onclick = () => {
    closeOv('#resOverlay'); reviewing = true;
    const box = $('#coachBox'); box.scrollIntoView({ block: 'nearest' });
    HFReview.review(D.m, think, box).then(() => {
      if (!reviewing) return;
      box.insertAdjacentHTML('beforeend', `<div class="rv-btns"><button type="button" class="mbtn go" id="rvNext">${esc(t(last ? 'match.h' : 'res.next'))}</button></div>`);
      document.getElementById('rvNext').onclick = () => { reviewing = false; nextHand(); };
    });
  };
  $('#resNext').textContent = t(last ? 'match.h' : 'res.next');
  $('#resNext').onclick = () => { closeOv('#resOverlay'); if (D.m.tut) { window.HFTut && HFTut.next(); return; } nextHand(); };
  setTimeout(() => openOv('#resOverlay'), 700);
}
$('#resClose').onclick = () => closeOv('#resOverlay');
let toastT = 0;
function toast(msg) { const e = $('#toast'); e.textContent = msg; e.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('on'), 2400); }
let banT = 0;
function banner(msg) { const e = $('#banner'); e.textContent = msg; e.classList.add('on'); clearTimeout(banT); banT = setTimeout(() => e.classList.remove('on'), 1300); }

/* ---------------- new game dialog (ゲーム｜ルール｜デザイン) ---------------- */
let ngTab = 'game', draft = null;
const OPTS = [
  ['months', [12, 6, 3], v => t('mo.' + v)],
  ['koiBonus', ['opp2', 'self', 'none'], v => t('kb.' + v)],
  ['over7', [true, false], v => t(v ? 'on' : 'off')],
  ['koiLimit', ['once', 'multi'], v => t('kl.' + v)],
  ['viewing', ['on', 'off', 'rain'], v => t('vw.' + v)],
  ['sakeKasu', [true, false], v => t(v ? 'on' : 'off')],
  ['plusExtra', [false, true], v => t(v ? 'on' : 'off')],
  ['handYaku', [true, false], v => t(v ? 'on' : 'off')],
  ['noYaku', ['nogame', 'oyaken'], v => t('ny.' + v)],
  ['nextOya', ['winner', 'alternate'], v => t('no.' + v)],
];
function openNew() { draft = JSON.parse(JSON.stringify(set)); if (!draft.opts || !Object.keys(draft.opts).length) draft.opts = Object.assign({}, rules()); ngTab = 'game'; renderNew(); openOv('#newOverlay'); }
function draftRules() { return HF.opts(Object.assign({}, HF.PRESETS[draft.preset] || {}, draft.preset === 'custom' ? draft.opts : {})); }
function seg(name, vals, label, cur) { return `<div class="seg" data-o="${name}">` + vals.map(v => `<button type="button" data-v='${JSON.stringify(v)}' class="${JSON.stringify(v) === JSON.stringify(cur) ? 'on' : ''}">${esc(label(v))}</button>`).join('') + '</div>'; }
function dd(name, vals, label, cur) { return `<div class="dd" data-o="${name}"><button type="button">${esc(label(cur))}</button><ul>` + vals.map(v => `<li data-v='${JSON.stringify(v)}' class="${JSON.stringify(v) === JSON.stringify(cur) ? 'on' : ''}">${esc(label(v))}</li>`).join('') + '</ul></div>'; }
function renderNew() {
  $('#ngTabs').innerHTML = ['game', 'rule', 'design'].filter(k => !(k === 'rule' && draft.mode === 'rated')).map(k => `<button type="button" data-tab="${k}" class="${k === ngTab ? 'on' : ''}">${esc(t('tab.' + k))}</button>`).join('');
  const r = draftRules();
  let h = '';
  if (ngTab === 'game') {
    const R = window.HFRated;
    h = `<div class="ng-mode seg" data-o="mode">${['ai', 'rated'].map(k => `<button type="button" data-v='"${k}"' class="${draft.mode === k ? 'on' : ''}">${esc(R ? R.r(k) : k)}</button>`).join('')}</div>
      <div class="gcard"><img src="${CARDS.artSrc(0)}" alt=""><div><b>${esc(t('g.koikoi'))}</b><p>${esc(t('g.koikoi.d'))}</p></div></div>` +
      (draft.mode === 'rated' && R ? R.card() : `<div class="opt"><label>${esc(t('o.level'))}</label><div class="lv"><input type="range" min="1" max="20" value="${draft.lv}" id="ngLv"><b id="ngLvB">Lv.${draft.lv}</b></div></div>
      <div class="opt"><label>${esc(t('o.months'))}</label>${seg('months', [12, 6, 3], v => t('mo.' + v), r.months)}</div>`);
  } else if (ngTab === 'rule') {
    h = `<div class="opt"><label>${esc(t('o.preset'))}</label>${seg('preset', ['nintendo', 'app', 'soft', 'custom'], v => t('p.' + v), draft.preset)}</div>`;
    for (const [k, vals, lab] of OPTS) {
      if (k === 'months') continue;
      h += `<div class="opt"><label>${esc(t('o.' + k))}</label>${vals.length > 3 ? dd(k, vals, lab, r[k]) : seg(k, vals, lab, r[k])}</div>`;
    }
  } else {
    const backs = ['black', 'red'], tabs = ['indigo', 'lacquer'];
    h = `<div class="opt"><label>${esc(t('o.back'))}</label><div class="tiles">` + backs.map(b => `<button type="button" class="tile ${draft.back === b ? 'on' : ''}" data-back="${b}"><span class="sw-card" style="background:${b === 'black' ? '#17151b' : '#7a1f1a'};box-shadow:inset 0 0 0 2px #050406"></span>${esc(t('bk.' + b))}</button>`).join('') + '</div></div>' +
      `<div class="opt"><label>${esc(t('o.table'))}</label><div class="tiles">` + tabs.map(b => `<button type="button" class="tile ${draft.table === b ? 'on' : ''}" data-table="${b}"><span class="sw-table" style="background:${b === 'indigo' ? '#1c2c44' : '#3a1712'}"></span>${esc(t('tb.' + b))}</button>`).join('') + '</div></div>' +
      `<p class="credit">${esc(t('credit.art'))} <a href="img/cards/LICENSE.md" target="_blank" rel="noopener">CC BY-SA 4.0</a></p>`;
  }
  $('#ngBody').innerHTML = h;
}
$('#ngTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { ngTab = b.dataset.tab; renderNew(); } });
$('#ngBody').addEventListener('input', e => { if (e.target.id === 'ngLv') { draft.lv = +e.target.value; $('#ngLvB').textContent = 'Lv.' + draft.lv; } });
$('#ngBody').addEventListener('click', e => {
  const ddEl = e.target.closest('.dd');
  if (ddEl && e.target.closest('.dd>button')) { $$('.dd.open').forEach(x => x !== ddEl && x.classList.remove('open')); ddEl.classList.toggle('open'); return; }
  const li = e.target.closest('.dd li'), b = e.target.closest('.seg button');
  const tgt = li || b;
  if (tgt) {
    const k = tgt.closest('[data-o]').dataset.o, v = JSON.parse(tgt.dataset.v);
    if (k === 'mode') { draft.mode = v; renderNew(); return; }
    if (k === 'preset') { draft.preset = v; if (v === 'custom') draft.opts = Object.assign({}, draftRules(), draft.opts); }
    else { if (draft.preset !== 'custom') { draft.opts = Object.assign({}, draftRules()); draft.preset = 'custom'; } draft.opts[k] = v; }
    renderNew(); return;
  }
  const bk = e.target.closest('[data-back]'); if (bk) { draft.back = bk.dataset.back; renderNew(); return; }
  const tb = e.target.closest('[data-table]'); if (tb) { draft.table = tb.dataset.table; renderNew(); }
});
document.addEventListener('click', e => { if (!e.target.closest('.dd')) $$('.dd.open').forEach(x => x.classList.remove('open')); });
$('#btnNewClose').onclick = () => closeOv('#newOverlay');
$('#btnStart').onclick = () => {
  Object.assign(set, draft); document.documentElement.dataset.back = set.back; document.documentElement.dataset.table = set.table;
  closeOv('#newOverlay'); save(); startMatch();
};

/* ---------------- coach ---------------- */
let coachBest = null, coachGen = -1;
async function coachThink() {
  const m = D.m; if (!m || m.rated || m.s.turn !== ME || m.s.phase === 'koi') return;
  const key = gen + ':' + m.s.log.length; if (coachGen === key) return; coachGen = key;
  const r = await think(m.s, 14);
  if (coachGen !== key) return;
  coachBest = { key, a: r.action }; renderCoach();
}
const YAKU_SETS = [
  ['inoshikacho', [HF.ID.boar, HF.ID.deer, HF.ID.butterfly]], ['akatan', [1, 5, 9]], ['aotan', [21, 33, 37]],
  ['hanami', [HF.ID.curtain, HF.ID.sake]], ['tsukimi', [HF.ID.moon, HF.ID.sake]],
  ['sanko', [HF.ID.crane, HF.ID.curtain, HF.ID.moon, HF.ID.phoenix]],
];
function nearSets(caps, s) {
  const have = new Set(caps), out = [];
  const dead = new Set([...s.caps[0], ...s.caps[1]]);
  for (const [id, cards] of YAKU_SETS) {
    if (id === 'sanko') { const n = cards.filter(c => have.has(c)).length; if (n >= 1 && n < 3) out.push({ id, n: 3 - n, need: cards.filter(c => !dead.has(c)) }); continue; }
    if ((id === 'hanami' || id === 'tsukimi') && s.o.viewing === 'off') continue;
    const got = cards.filter(c => have.has(c)).length, need = cards.filter(c => !have.has(c));
    if (got >= 1 && need.length && need.every(c => !dead.has(c))) out.push({ id, n: need.length, need });
  }
  const p = HF.progress(caps, s.o);
  if (p.tane >= 3 && p.tane < 5) out.push({ id: 'tane', n: 5 - p.tane, need: [] });
  if (p.tan >= 3 && p.tan < 5) out.push({ id: 'tan', n: 5 - p.tan, need: [] });
  if (p.kasu >= 7 && p.kasu < 10) out.push({ id: 'kasu', n: 10 - p.kasu, need: [] });
  return out.sort((a, b) => a.n - b.n);
}
let reviewing = false;
function renderCoach() {
  const m = D.m, el = $('#coachBox');
  if (reviewing) return;
  const head = `<h3><span>${esc(t('coach.h'))}</span><button type="button" class="sw ${set.coach ? 'on' : ''}" id="coachSw" aria-label="coach"></button></h3>`;
  if (!set.coach) { el.innerHTML = head + `<p class="muted">${esc(t('coach.off'))}</p>`; return; }
  if (!m) { el.innerHTML = head; return; }
  if (m.rated && !m.over) { el.innerHTML = head + `<p class="muted">${esc(HFRated.r('rest'))}</p>`; return; }
  const s = m.s;
  const mine = nearSets(s.caps[ME], s), opp = nearSets(s.caps[CPU], s);
  let h = head + `<div class="prog"><b>${esc(t('coach.mine'))}</b>` + (mine.length ? mine.slice(0, 4).map(x => `<div class="it"><span>${esc(t('y.' + x.id))}</span><em>${esc(t('coach.near', { n: x.n }))}</em></div>`).join('') : `<div class="it">${esc(t('coach.none'))}</div>`) + '</div>';
  h += `<div class="prog" style="margin-top:10px"><b>${esc(t('coach.opp'))}</b>` + (opp.length ? opp.slice(0, 3).map(x => `<div class="it"><span>${esc(t('y.' + x.id))}</span><em>${esc(t('coach.near', { n: x.n }))}</em></div>`).join('') : `<div class="it">${esc(t('coach.none'))}</div>`) + '</div>';
  const danger = opp.find(x => x.n === 1 && x.need.length);
  if (danger) {
    const months = new Set(danger.need.map(HF.month));
    const onField = s.hands[ME].filter(c => months.has(HF.month(c)));
    if (onField.length) h += `<p class="warn">${esc(t('coach.danger', { y: t('y.' + danger.id), n: 1, c: cardName(onField[0]) }))}</p>`;
  }
  if (s.turn === ME && coachBest && coachBest.key === gen + ':' + s.log.length && typeof coachBest.a === 'number') h += `<div class="best">${esc(t('coach.best', { c: cardName(coachBest.a) }))}</div>`;
  el.innerHTML = h;
}
$('#coachBox').addEventListener('click', e => { if (e.target.closest('#coachSw')) { set.coach = set.coach ? 0 : 1; save(); renderCoach(); if (set.coach) coachThink(); toast(set.coach ? 'ON' : 'OFF'); } });

/* ---------------- render ---------------- */
function cardEl(id, cls, extra) { return `<div class="hf ${cls || ''}" data-id="${id}" ${extra || ''} title="${esc(cardName(id))}">${CARDS.face(id)}</div>`; }
function capsHtml(caps, o) {
  const g = { hikari: [], tane: [], tan: [], kasu: [] };
  caps.slice().sort((a, b) => a - b).forEach(c => g[HF.CARDS[c].type].push(c));
  const y = HF.yaku(caps, o || HF.DEFAULT_OPTS).list.map(x => x.id);
  const hot = { hikari: /goko|shiko|sanko/, tane: /^tane$|inoshikacho|hanami|tsukimi/, tan: /^tan$|akatan|aotan|akaao/, kasu: /^kasu$/ };
  return ['hikari', 'tane', 'tan', 'kasu'].map(k => `<div class="cap-grp ${k} ${y.some(id => hot[k].test(id)) ? 'yk' : ''}"><b>${esc(t('k.' + k))}<em>${g[k].length}</em></b><div class="stack">${g[k].map(c => cardEl(c)).join('')}</div></div>`).join('');
}
function fitCards() {
  const tb = $('#table'); if (!tb) return;
    const pc = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1040px) and (min-aspect-ratio: 3/4)').matches;
  const R = document.documentElement.style;
  if (pc) {
    // table inner box; rows: opponent (backs + captures, small cards), field (rows x perRow), hand, my captures
    const TW = tb.clientWidth - 40, TH = tb.clientHeight - 32, K = 0.5, G = 12, R1 = 1.656;
    let best = { cw: 0, per: 6 };
    for (let per = 5; per <= 10; per++) {
      const rows = Math.ceil(10 / per);
      const wcw = Math.min((TW - 2 * 18 - per * G) / (per + 2), (TW - 7 * 8) / 8);
      const hcw = (TH - 2 * 22 - 3 * G - (rows - 1) * G) / R1 / (2 * K + rows + 1);
      const cw = Math.min(wcw, hcw, 150);
      if (cw > best.cw + 0.5) best = { cw, per };
    }
    let cw = Math.floor(best.cw);
    const set = c => { R.setProperty('--cw', c + 'px'); R.setProperty('--kw', Math.floor(c * K) + 'px'); };
    R.setProperty('--fcols', best.per); set(cw);
    // measure: the field area must hold two full rows; shrink until the content fits the table
    for (let i = 0; i < 6; i++) {
      const need = [...tb.children].filter(e => e.classList.contains('row')).reduce((s, e) => s + e.offsetHeight, 0) + 2 * cw * R1 + G * 4 + 32;
      if (need <= tb.clientHeight + 1) break;
      cw = Math.floor(cw * Math.max(0.9, (tb.clientHeight - 0) / need)); set(cw);
    }
  } else {
    const cw = Math.max(36, Math.floor(Math.min((innerWidth - 36) / 8.4, 64)));
    R.setProperty('--cw', cw + 'px'); R.setProperty('--kw', Math.floor(cw * 0.62) + 'px');
  }
}
function render() {
  fitCards();
  const m = D.m;
  if (!m) { $('#myHand').innerHTML = ''; $('#field').innerHTML = ''; $('#oppHand').innerHTML = ''; renderSide(); return; }
  const s = m.s, my = s.turn === ME && !busy;
  $('#oppHand').innerHTML = s.hands[CPU].map(() => '<div class="hf back"></div>').join('');
  const fieldMatch = new Set();
  const pickable = new Set((s.phase === 'pickPlay' || s.phase === 'pickDraw') && s.turn === ME ? HF.actions(s) : []);
  $('#field').innerHTML = s.field.map(c => cardEl(c, pickable.has(c) ? 'pickable' : '')).join('');
  const canPlay = my && s.phase === 'play';
  $('#myHand').innerHTML = s.hands[ME].map(c => {
    const has = s.field.some(f => HF.month(f) === HF.month(c));
    return cardEl(c, (canPlay ? 'can ' : '') + (has ? '' : 'dead ') + (hintId === c ? 'hint' : ''));
  }).join('');
  $('#oppCaps').innerHTML = capsHtml(s.caps[CPU], s.o);
  $('#myCaps').innerHTML = capsHtml(s.caps[ME], s.o);
  $('#deckN').textContent = s.deck.length;
  // the card just drawn / played and waiting for a choice
  const pend = s.pending != null && (s.phase === 'pickPlay' || s.phase === 'pickDraw') ? s.pending : null;
  const lastDraw = s.log.length && s.log[s.log.length - 1].kind === 'draw' ? s.log[s.log.length - 1] : null;
  $('#drawn').innerHTML = pend != null ? cardEl(pend, 'sel') : (lastDraw && lastDraw.got && !lastDraw.got.length && s.phase !== 'over' ? '' : '');
  renderSide();
  if (window.HFTut) HFTut.onRender();
}
function statusText() {
  const m = D.m; if (!m) return '';
  const s = m.s;
  if (s.phase === 'over') return '';
  if (s.turn === CPU || busy) return t('ph.cpu');
  if (s.phase === 'play') return t('ph.play');
  if (s.phase === 'pickPlay' || s.phase === 'pickDraw') return t('ph.pick');
  if (s.phase === 'koi') return t('ph.koi');
  return '';
}
function renderSide() {
  const m = D.m;
  const pl = (who, name) => {
    if (!m) return `<div class="pl"><span>${esc(name)}</span><b>0</b></div>`;
    const s = m.s, yk = HF.yaku(s.caps[who], s.o).total;
    return `<div class="pl ${s.turn === who && s.phase !== 'over' ? 'turn' : ''}"><span>${esc(name)}${m.oya === who ? `<span class="tag">${esc(t('oya'))}</span>` : ''}${s.koi[who] ? `<span class="tag">${esc(t('koi.go'))}${s.koi[who] > 1 ? '×' + s.koi[who] : ''}</span>` : ''}</span><b>${m.scores[who]}</b></div>`;
  };
  $('#players').innerHTML = `<h3><span>${m ? esc(t('monthOf', { n: m.k + 1, m: m.months })) : ''}</span><span>${m ? 'Lv.' + m.lv : ''}</span></h3>` + pl(CPU, t('cpu')) + pl(ME, t('you')) + `<div class="status">${esc(statusText())}</div>`;
  renderCoach();
  if (m) {
    const L = m.s.log.slice(-40).map(e => {
      const p = e.p === ME ? t('you') : t('cpu');
      if (e.kind === 'koi') return `<li>${esc(t('log.koi', { p }))}</li>`;
      if (e.got && e.got.length) return `<li>${esc(t('log.take', { p, c: cardName(e.card), t: e.got.map(cardName).join('・') }))}</li>`;
      return `<li>${esc(t(e.kind === 'draw' ? 'log.draw' : 'log.play', { p, c: cardName(e.card) }))}</li>`;
    }).reverse();
    $('#logBox').innerHTML = `<h3>${esc(t('log.h'))}</h3><ol>${L.join('')}</ol>`;
  } else $('#logBox').innerHTML = `<h3>${esc(t('log.h'))}</h3>`;
  const canResign = m && !m.over && m.s.phase !== 'over';
  $('#btnResign').disabled = !canResign;
}

/* hover: show which field cards a hand card matches */
$('#myHand').addEventListener('mouseover', e => { const c = e.target.closest('.hf'); $$('#field .hf').forEach(f => f.classList.toggle('match', !!c && HF.month(+f.dataset.id) === HF.month(+c.dataset.id))); });
$('#myHand').addEventListener('mouseleave', () => $$('#field .hf').forEach(f => f.classList.remove('match')));
$('#myHand').addEventListener('click', e => { const c = e.target.closest('.hf'); if (c) onHand(+c.dataset.id); });
$('#field').addEventListener('click', e => { const c = e.target.closest('.hf'); if (c) onField(+c.dataset.id); });

/* ---------------- menu ---------------- */
$('#btnNew').onclick = openNew;
$('#btnHint').onclick = async () => {
  const m = D.m; if (!m || m.s.turn !== ME || busy || m.s.phase === 'over' || m.rated) { toast(t('hint.none')); return; }
  const r = await think(m.s, 18);
  if (typeof r.action === 'number') { hintId = r.action; render(); $$(`.hf[data-id="${r.action}"]`).forEach(x => x.classList.add('hint')); toast(t('coach.best', { c: cardName(r.action) })); }
  else toast(t('coach.best', { c: t(r.action === 'koi' ? 'koi.go' : 'koi.stop') }));
};
$('#btnResign').onclick = () => {
  const m = D.m; if (!m || m.over) return;
  const go = () => { m.scores[CPU] = Math.max(m.scores[CPU], m.scores[ME] + 1); gen++; closeOv('#koiOverlay'); finishMatch(); };
  if (window.Resign) Resign.confirm({ lang: LANG }).then(ok => { if (ok) go(); }); else if (confirm(t('resignQ'))) go();
};
$('#btnRules').onclick = () => { if (window.HFRules) HFRules.open(); };
$('#btnLesson').onclick = () => { if (window.HFLessons) HFLessons.open(); };
$$('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o && (o.id === 'rulesOverlay' || o.id === 'lessonOverlay' || o.id === 'newOverlay')) o.classList.remove('on'); }));
addEventListener('keydown', e => { if (e.key === 'Escape') ['#newOverlay', '#rulesOverlay', '#lessonOverlay'].forEach(closeOv); });
addEventListener('resize', () => fitCards());
$('#mTabs').addEventListener('click', e => { const b = e.target.closest('[data-pt]'); if (!b) return; const el = b.dataset.pt === 'coach' ? $('#coachBox') : b.dataset.pt === 'online' ? $('#onlineBox') : $('#logBox'); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

/* ---------------- tutorial hooks ---------------- */
let saved = null;
function tutStart(layoutDef, script) {
  saved = D.m ? JSON.stringify(D.m) : null;
  closeOv('#resOverlay'); closeOv('#koiOverlay');
  const o = HF.opts({});
  D.m = { o, months: 1, k: 0, scores: [0, 0], oya: layoutDef.oya || 0, hist: [], lv: 1, s: HF.layout(layoutDef, o), over: false, tut: true, script: script.slice() };
  gen++; busy = false; render(); step();
}
function tutEnd() {
  gen++; busy = false; closeOv('#resOverlay'); closeOv('#koiOverlay');
  D.m = saved ? JSON.parse(saved) : null; saved = null;
  save(); render(); if (D.m && !D.m.over && D.m.s && D.m.s.phase !== 'over') step(); else if (!D.m) startMatch();
}
/* ---------------- shared parts ---------------- */
window.HFApp = { tutStart, tutEnd, state: () => D.m, render, t, esc, sfx, cardName, LANG: () => LANG, openOv, closeOv, toast, startMatch: () => openNew(), set, save };
if (window.GameRecord) GameRecord.init({ game: 'hanafuda', lang: () => LANG, menu: '.controls' });
if (window.HeaderBar) HeaderBar.init({ order: ['#btnNew', '#btnResign', '#btnHint', '#btnRules', '#btnLesson'], lang: () => LANG });
if (window.RulesOffer) RulesOffer.init({ game: 'hanafuda', lang: () => LANG, open: () => window.HFRules && HFRules.open(), watch: '#rulesOverlay' });

applyI18n();
requestAnimationFrame(() => fitCards());
setTimeout(() => { if (window.HFTut && !D.m) HFTut.offer(); }, 600);
if (!D.m) { startMatch(); D.firstVisit = 1; setTimeout(() => window.HFTut && HFTut.offer(), 700); }
else if (D.m && !D.m.over && D.m.s) { if (D.m.s.phase === 'over') { /* finished hand: wait for the player */ render(); } else { gen++; step(); } }
})();
