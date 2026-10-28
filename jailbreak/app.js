/* だつごく！スライド — app: home portal (daily / course / modes), the sliding board, modes, economy, rankings */
(function () {
'use strict';
const E = window.JBEngine, A = window.JBArt, SK = window.JBSkins;
SK.inject();
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'jailbreak-slide-v1';
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const fmt = n => Math.round(n).toLocaleString('en-US');
const mmss = s => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
const Q = new URLSearchParams(location.search);

/* ---------------- save data ---------------- */
const DEF = () => ({ v: 1, coin: 0, life: 0, name: '', icon: 0, own: { 0: 1, 1: 1 }, skin: 'concrete', skinOwn: ['concrete', 'brick'], frame: 'steel', frameOwn: ['steel'],
  set: { snd: 1, anim: 1, lang: '' }, st: {}, dl: {}, best: { sl: 0, chain: 0, chainN: 0, ta: 0 },
  stats: { esc: 0, moves: 0, perfect: 0, hints: 0, dig: 0, key: 0, plate: 0, gacha: 0, days: 0, dgold: 0, slRuns: 0, chainRuns: 0 }, ach: {}, tut: {}, login: '', lbs: 0 });
function load() {
  let d; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
  const b = DEF(); if (!d || typeof d !== 'object') return b;
  for (const k in b) if (d[k] === undefined) d[k] = b[k];
  for (const k of ['set', 'best', 'stats']) d[k] = Object.assign({}, b[k], d[k]);
  return d;
}
let DB = load();
try { const sp = localStorage.getItem('atlas-sfx'); if (sp === '0' || sp === '1') DB.set.snd = sp === '1' ? 1 : 0; } catch (e) {}   // site-wide sound switch (shared with the portal)
const save = () => { DB.mt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} };

/* ---------------- i18n ---------------- */
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
let lang = (LANGS.includes(Q.get('lang')) && Q.get('lang')) || DB.set.lang || (() => { const n = (navigator.language || 'ja').slice(0, 2); return LANGS.includes(n) ? n : 'en'; })();
function t(k, v) {
  const I = window.JB_I18N || {};
  let s = (I[lang] && I[lang][k]) ?? (I.en && I.en[k]) ?? (I.ja && I.ja[k]) ?? k;
  if (v) s = s.replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
  return s;
}
function applyI18n() {
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach(e => { e.textContent = t(e.dataset.i18n); });
  $$('[data-i18n-title]').forEach(e => { e.title = t(e.dataset.i18nTitle); e.setAttribute('aria-label', e.title); });
  document.title = t('title.doc');
}

/* ---------------- sound (WebAudio synth) ---------------- */
// iOS only lets audio start inside a real tap (touchend / click), and suspends or "interrupts" the context after a call,
// the lock screen or switching apps. So: create and wake the context inside every tap (a silent 1-sample buffer
// unlocks it), and wake it again when the page comes back.
let AC = null;
function unlockAudio() {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state !== 'running') {
      AC.resume();
      const b = AC.createBuffer(1, 1, 22050), src = AC.createBufferSource(); src.buffer = b; src.connect(AC.destination); src.start(0);
    }
  } catch (e) {}
}
['touchend', 'pointerup', 'click', 'keydown'].forEach(ev => addEventListener(ev, unlockAudio, { capture: true, passive: true }));
const wakeAudio = () => { if (AC && AC.state !== 'running' && !document.hidden) { try { AC.resume(); } catch (e) {} } };
document.addEventListener('visibilitychange', wakeAudio); addEventListener('pageshow', wakeAudio); addEventListener('focus', wakeAudio);
function ac() { if (!AC) return null; if (AC.state !== 'running') { try { AC.resume(); } catch (e) {} } return AC; }
function tone(f, d = .1, type = 'square', v = .07, slide = 0, delay = 0) {
  if (!DB.set.snd) return; const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t0 + d);
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + d + .02);
}
function noise(d = .2, v = .12, hp = 0) {
  if (!DB.set.snd) return; const a = ac(); if (!a) return;
  const n = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const s = a.createBufferSource(), g = a.createGain(); s.buffer = buf; g.gain.value = v;
  if (hp) { const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; s.connect(f); f.connect(g); } else s.connect(g);
  g.connect(a.destination); s.start();
}
const SND = {
  grab: () => tone(330, .04, 'triangle', .05),
  slide: n => { noise(.06 + n * .02, .07, 900); tone(180, .05, 'square', .035, .8); },
  bump: () => tone(110, .07, 'square', .05, .7),
  guard: () => { tone(620, .05, 'square', .03); tone(520, .05, 'square', .03, 1, .06); },
  esc: () => [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * 2 ** (s / 12), .14, 'square', .06, 1, i * .07)),
  key: () => { tone(1320, .08, 'triangle', .07); tone(1760, .16, 'triangle', .06, 1, .08); },
  gate: () => { noise(.3, .12, 300); tone(140, .25, 'sawtooth', .05, 1.6); },
  door: on => tone(on ? 700 : 400, .08, 'square', .04, on ? 1.3 : .7),
  dig: () => { noise(.18, .2, 200); tone(90, .12, 'square', .07, .6); },
  tilt: () => { noise(.25, .1, 200); tone(70, .25, 'sine', .15, .6); },
  star: i => tone(660 * 2 ** (i / 4), .12, 'triangle', .08, 1.2),
  fail: () => [7, 4, 0, -5].forEach((s, i) => tone(392 * 2 ** (s / 12), .18, 'triangle', .07, 1, i * .12)),
  alarm: () => [0, 1, 2, 3].forEach(i => tone(i % 2 ? 660 : 880, .12, 'sawtooth', .05, 1, i * .13)),
  coin: () => { tone(988, .06, 'square', .05); tone(1319, .12, 'square', .05, 1, .06); },
  tick: () => tone(1200, .04, 'square', .04),
  hint: () => tone(780, .1, 'triangle', .06),
};

/* ---------------- data ---------------- */
let ST = null, DL = null;
// courses (stages.json v2): prison courses of 10 floors × 10 stages — 'mix' (classic + rule stages) and 'classic' (plain sliding);
// rule modes of 50 stages. Every stage carries its save key `k` (stages kept from the first edition keep their old key → records stay).
const PER = 10, UNLOCK = 6, MODE_N = 50, SUPER = 20;
const SMODES = ['key', 'plate', 'oneway', 'ice', 'patrol', 'twin', 'dig', 'tilt', 'laser', 'heavy', 'shutter', 'lights', 'vent', 'silent', 'big'];   // stage modes (50 each)
const RULE_OF = { silent: 'silent', big: 'big' };
const COURSES = () => ST ? ST.courses : [];
const courseOf = id => COURSES().find(c => c.id === id);
const COURSE_COL = { halden: '#5f9a8f', singsing: '#6a93b5', fremantle: '#c08a3e', dartmoor: '#5f7a66', colditz: '#9a4f5a', lecumberri: '#3f3a5a', sanquentin: '#b5866a', abashiri: '#5a6b7f', alcatraz: '#2b313c', folsom: '#8e9aa8', leavenworth: '#7f8c6a', lasante: '#7a6fa6', devil: '#8f5a6f' };
const MODE_COL = { silent: '#3b3f6e', key: '#c99a1a', plate: '#d47a1f', oneway: '#2f74b5', ice: '#3aa3c9', patrol: '#2f4d7a', twin: '#c2502a', dig: '#8a4b33', tilt: '#6b7d3a', big: '#4d5a6e', sl: '#1b2333', chain: '#7d2f45', laser: '#b8323a', heavy: '#4a505c', shutter: '#7a3f9a', lights: '#b58a12', vent: '#4f7383', ta: '#1f7a6a' };
const listOf = src => { const c = courseOf(src); return c ? c.st : (ST && ST.modes[src]) || []; };
const recsOfList = L => L.map(r => DB.st[r.k] || 0);
const courseRecs = id => recsOfList(listOf(id));
const modeRecs = m => recsOfList(listOf(m));
const courseKeys = () => { const s = new Set(); COURSES().forEach(c => c.st.forEach(r => s.add(r.k))); return s; };
const secOpen = (recs, j) => { const s = (j / PER) | 0; if (s === 0) return true; let c = 0; for (let i = (s - 1) * PER; i < s * PER; i++) if (recs[i]) c++; return c >= UNLOCK; };
const secOpenQ = (recs, j) => Q.has('unlock') || secOpen(recs, j);
const secMedal = (recs, s) => { const r = recs.slice(s * PER, s * PER + PER); if (r.some(v => !v)) return 0; if (r.every(v => v >= 3)) return 3; if (r.every(v => v >= 2)) return 2; return 1; };
// title stars: every star ever earned (stages retired in the 2026-10 rebuild keep counting, so nobody loses a title)
const starsN = () => Object.values(DB.st).reduce((a, v) => a + (v || 0), 0);
const courseClears = () => { const K = courseKeys(); let n = 0; K.forEach(k => { if (DB.st[k]) n++; }); return n; };
const courseTotal = () => COURSES().reduce((a, c) => a + c.st.length, 0);
const slack = o => Math.max(2, Math.round(o * .3));
const starsFor = (mv, o) => mv <= o ? 3 : mv <= o + slack(o) ? 2 : 1;
// titles (by stars)
const TITLES = [0, 10, 40, 100, 200, 400, 700, 1000, 1500, 2200];
const titleIdx = () => { const s = starsN(); let k = 0; TITLES.forEach((v, i) => { if (s >= v) k = i; }); return k; };

/* ---------------- daily ---------------- */
const EPOCH = Date.UTC(2026, 9, 25);
const dayNo = ds => { const [y, m, d] = ds.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 864e5); };
const DIFFS = [{ k: 'e', base: 3000 }, { k: 'm', base: 5000 }, { k: 'h', base: 8000 }];
function dailyRec(ds, k) { const L = DL[k], n = dayNo(ds), i = ((n * (k === 'e' ? 1 : k === 'm' ? 7 : 13) + (k === 'h' ? 101 : 0)) % L.length + L.length) % L.length; return L[i]; }
// medium: the rule of the day cycles (basic, key, plate, one-way, ice, patrol, dig) — the pool is stored in that order
function dailyRecM(ds) { const L = DL.m, n = dayNo(ds), r = ((n % 7) + 7) % 7, blk = Math.floor(L.length / 7), j = ((Math.floor(n / 7) * 5) % blk + blk) % blk; return L[j * 7 + r] || L[0]; }
const dRec = (ds, k) => k === 'm' ? dailyRecM(ds) : dailyRec(ds, k);
const dlOf = ds => { const r = DB.dl[ds] || (DB.dl[ds] = {}); for (const D of DIFFS) r[D.k] = r[D.k] || { s: 0, md: 0, mv: 0 }; r.sl = r.sl || { s: 0, a: 0 }; return r; };
const dayPlayed = r => !!r && (DIFFS.some(D => r[D.k] && r[D.k].md > 0) || (r.sl && r.sl.a > 0));
const dayGold = r => !!r && DIFFS.some(D => r[D.k] && r[D.k].md >= 3);
function streak() {
  let n = 0; const d = new Date();
  for (let g = 0; g < 2000; g++) { const r = DB.dl[ymd(d)]; if (dayPlayed(r)) { n++; d.setDate(d.getDate() - 1); } else if (n === 0 && ymd(d) === today()) d.setDate(d.getDate() - 1); else break; }
  return n;
}
const DSL_TRIES = 3, SL_TIME = 90;

/* ---------------- coins / achievements ---------------- */
function addCoin(n) { n = Math.max(0, Math.round(n)); if (!n) return 0; DB.coin += n; DB.life += n; save(); updateCoins(); return n; }
const floorsDone = () => { let n = 0; COURSES().forEach(c => { const r = courseRecs(c.id); for (let f = 0; f < 10; f++) if (r.slice(f * PER, f * PER + PER).every(v => v)) n++; }); return n; };
const modeCleared = m => ST ? modeRecs(m).filter(v => v).length : 0;
const ACH = [
  ['esc1', s => [s.esc, 1], 30], ['esc50', s => [s.esc, 50], 150], ['esc300', s => [s.esc, 300], 500], ['esc1000', s => [s.esc, 1000], 1500],
  ['perf10', s => [s.perfect, 10], 100], ['perf100', s => [s.perfect, 100], 500], ['perf500', s => [s.perfect, 500], 1500],
  ['c50', () => [courseClears(), 50], 200], ['c200', () => [courseClears(), 200], 600], ['c600', () => [courseClears(), 600], 3000],
  ['floor1', () => [floorsDone(), 1], 300], ['floorAll', () => [floorsDone(), COURSES().length * 10 || 90], 5000],
  ['star100', () => [Object.values(DB.st).filter(v => v >= 3).length, 100], 400], ['star500', () => [Object.values(DB.st).filter(v => v >= 3).length, 500], 1500],
  ...SMODES.map(m => ['m_' + m, () => [modeCleared(m), 10], 150]),
  ['modesAll', () => [SMODES.reduce((a, m) => a + modeCleared(m), 0), SMODES.length * MODE_N], 4000],
  ['sl3k', () => [DB.best.sl, 3000], 200], ['sl8k', () => [DB.best.sl, 8000], 600],
  ['chain10', () => [DB.best.chainN, 10], 200], ['chain30', () => [DB.best.chainN, 30], 800],
  ['ta1', s => [s.taRuns || 0, 1], 100], ['ta60', () => [DB.best.ta && DB.best.ta <= 60000 ? 1 : 0, 1], 600],
  ['daily1', () => [Object.values(DB.dl).filter(dayPlayed).length, 1], 50], ['streak7', () => [streak(), 7], 300], ['streak30', () => [streak(), 30], 1200], ['gold10', () => [Object.values(DB.dl).filter(dayGold).length, 10], 500],
  ['dig50', s => [s.dig, 50], 200], ['key30', s => [s.key, 30], 200],
  ['col12', () => [Object.keys(DB.own).length, 12], 300], ['col50', () => [Object.keys(DB.own).length, 50], 800], ['col100', () => [Object.keys(DB.own).length, 100], 1500],
  ['colAll', () => [Object.keys(DB.own).length + DB.skinOwn.length + DB.frameOwn.length, A.INMATES.length + SK.FLOORS.length + SK.FRAMES.length], 5000],
];
const achReady = () => ACH.filter(([id, f]) => { const [v, g] = f(DB.stats); return v >= g && !DB.ach[id]; }).length;
function updateBadges() { const on = achReady() ? 'block' : 'none'; $$('[data-go="ach"] .dot, #bnav .dot').forEach(d => { d.style.display = on; }); }

/* ---------------- online ---------------- */
const ON = window.JBOnline;
const who = () => ({ n: DB.name, i: DB.icon });
async function pushTotals() {
  if (!ON || !ON.available || !DB.name) return;
  try { await ON.putBest('jb/stars', Object.assign({ s: starsN() }, who())); if (DB.best.chain) await ON.putBest('jb/chain', Object.assign({ s: DB.best.chain }, who())); } catch (e) {}
}

/* ============================================================ HOME ============================================================ */
let homeTab = 'daily', courseOpenId = null, modeOpenId = null, afterModal = null, listAfter = null;
function updateCoins() { $$('.coinv').forEach(e => { e.textContent = fmt(DB.coin); }); }
function picHTML(icon = DB.icon) { return A.inmateSVG(icon, { bg: '#cfd6de' }); }
function profCard() {
  const ti = titleIdx(), nx = TITLES[ti + 1], s = starsN();
  $('#profCard').innerHTML = `<button class="pic" id="pfEdit" aria-label="${esc(t('pf.edit'))}">${picHTML()}</button>
    <div class="pinfo"><span class="ptitle">${esc(t('ti.' + ti))}</span><b class="pname">${esc(DB.name || t('pf.guest'))}</b></div>
    <div class="pchips"><div class="pcoin">${A.ICON.coin}<b class="coinv">${fmt(DB.coin)}</b></div><div class="pstreak"><b>${streak()}</b><span>${esc(t('pf.streak'))}</span></div></div>
    <div class="pextra"><div class="plvbar"><span>★ ${s}${nx ? ` → ${nx}` : ''}</span><span class="bar"><i style="width:${nx ? Math.min(100, (s - TITLES[ti]) / (nx - TITLES[ti]) * 100) : 100}%"></i></span><small>${nx ? esc(t('pf.next', { t: t('ti.' + (ti + 1)) })) : ''}</small></div>
      <ul class="pst"><li><span>${esc(t('ht.course'))}</span><b>${courseClears()}<small>/${courseTotal() || 900}</small></b></li>
      <li><span>${esc(t('ht.modes'))}</span><b>${SMODES.reduce((a, m) => a + modeCleared(m), 0)}<small>/${SMODES.length * MODE_N}</small></b></li>
      <li><span>${esc(t('pf.esc'))}</span><b>${fmt(DB.stats.esc)}</b></li><li><span>${esc(t('pf.perfect'))}</span><b>${fmt(DB.stats.perfect)}</b></li></ul>
      <div class="plinks"><button class="btn" data-go="gacha">${A.ICON.locker}<span>${esc(t('ga.title'))}</span></button><button class="btn" data-go="book">${A.ICON.book}<span>${esc(t('bk.title'))}</span></button><button class="btn" data-go="ach">${A.ICON.trophy}<span>${esc(t('ach.title'))}</span><i class="dot"></i></button><button class="btn" data-go="rank">${A.ICON.rank}<span>${esc(t('rk.title'))}</span></button><button class="btn" data-go="rules">${A.ICON.modes}<span>${esc(t('u.rules'))}</span></button><button class="btn" data-go="tut">${A.ICON.help}<span>${esc(t('help'))}</span></button></div></div>`;
  $$('[data-go]', $('#profCard')).forEach(b => { b.onclick = () => ({ gacha: () => openGacha(), book: () => openBook(), ach: openAch, rank: () => openRank('m'), rules: () => openRules(), tut: () => tutorial() })[b.dataset.go](); });
  $('#pfEdit').onclick = () => openProfile();
}
/* phones (portrait): one section at a time + a fixed tab bar at the bottom. The profile card and the calendar move into
   マイページ and the Lucky Locker gets a tab of its own. PC / tablet keep the original layout. */
const PHONE = matchMedia('(max-width:760px)');
const UICON = '<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const BNAV = [['daily', 'ht.daily', 'daily'], ['course', 'ht.course', 'course'], ['modes', 'ht.modes', 'modes'], ['gacha', 'ht.gacha', 'locker'], ['me', 'ht.me', 'user']];
function layoutHome() {
  const ph = PHONE.matches, me = $('.hpanel.me');
  if (ph) { if ($('#profCard').parentNode !== me) me.append($('#profCard'), $('#dCal')); }
  else if ($('#profCard').parentNode === me) { $('#home').prepend($('#profCard')); $('#dBox').append($('#dCal')); }
  document.body.classList.toggle('phnav', ph);
}
function renderHome() {
  layoutHome();
  if (!PHONE.matches && (homeTab === 'gacha' || homeTab === 'me')) homeTab = 'daily';
  profCard(); updateCoins(); updateBadges();
  $$('#htabs button').forEach(b => b.classList.toggle('on', b.dataset.p === homeTab));
  $$('#bnav button').forEach(b => { const on = b.dataset.p === homeTab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
  $$('.hpanel').forEach(p => { p.hidden = p.dataset.p !== homeTab; });
  renderSubnav();
  if (homeTab === 'gacha') openGacha($('#gachaPanel'));
  if (!ST || !DL) { $('#dBox').innerHTML = `<p class="note">${esc(t('err.load'))}</p>`; return; }
  if (homeTab === 'daily' || homeTab === 'me') renderDaily();
  if (homeTab === 'course') courseOpenId ? renderCourse(courseOpenId) : renderCourses();
  if (homeTab === 'modes') modeOpenId ? renderMode(modeOpenId) : renderModes();
}
/* phones: コース / モード show one category at a time, picked from a row of chips fixed just above the tab bar.
   The choice is kept per tab (DB.set.sub); before any choice, コース opens on the category holding the next unfinished course. */
const SUBS = { course: ['mix', 'cls'], modes: ['run', 'rule'] };
const subCount = { mix: () => COURSES().filter(c => c.kind === 'mix').length, cls: () => COURSES().filter(c => c.kind === 'classic').length, run: () => 3, rule: () => SMODES.length };
function subOf(tab) {
  const s = (DB.set.sub || {})[tab];
  if (SUBS[tab].includes(s)) return s;
  if (tab === 'course') { const c = COURSES().find(c => courseRecs(c.id).some(v => !v)); return c && c.kind === 'classic' ? 'cls' : 'mix'; }
  return SUBS[tab][0];
}
const subShown = () => PHONE.matches && !!SUBS[homeTab];
function renderSubnav() {
  const el = $('#subnav'), on = subShown() && !courseOpenId && !modeOpenId && !!ST;
  document.body.classList.toggle('hassub', on);
  if (!on) { el.innerHTML = ''; return; }
  const cur = subOf(homeTab);
  el.innerHTML = SUBS[homeTab].map(k => `<button type="button" role="tab" class="sb-${k}${k === cur ? ' on' : ''}" data-sub="${k}" aria-selected="${k === cur}"><span>${esc(t('sub.' + k))}</span><small>${subCount[k]()}</small></button>`).join('');
  $$('button', el).forEach(b => { b.onclick = () => {
    if (b.dataset.sub === subOf(homeTab)) return;
    DB.set.sub = Object.assign({}, DB.set.sub, { [homeTab]: b.dataset.sub }); save(); SND.page && SND.page();
    renderHome(); const pn = $(`.hpanel[data-p="${homeTab}"]`); if (pn) pn.scrollTop = 0;
  }; });
}
function setHomeTab(p) {
  const same = p === homeTab && !courseOpenId && !modeOpenId; homeTab = p; courseOpenId = modeOpenId = null;
  renderHome(); if (!same) { const pn = $(`.hpanel[data-p="${p}"]`); if (pn) pn.scrollTop = 0; scrollTo(0, 0); }
}
PHONE.addEventListener('change', () => { if (!$('#home').hidden) renderHome(); else layoutHome(); });
const ruleChip = r => r && r !== 'basic' ? `<span class="chip rc" style="--mc:${MODE_COL[r]}">${A.MI[r]}${esc(t('mo.' + r))}</span>` : `<span class="chip rc">${esc(t('mo.basic'))}</span>`;
function renderDaily() {
  const d = today(), r = dlOf(d);
  $('#dPuzzle').innerHTML = `<div class="ptag">${esc(t('d.title'))}<i>${esc(d.slice(5).replace('-', '/'))}</i></div>
    <div class="dhead"><h3>${esc(t('d.head'))}</h3><p>${esc(t('d.desc'))}</p></div>
    <div class="dlvs">${DIFFS.map(D => { const rec = dRec(d, D.k), P = E.decode(rec), rr = r[D.k], played = rr.md > 0, going = !played && !!rr.p;
      return `<div class="dlv lv-${D.k}"><div class="dic">${A.miniBoard(P, P.s0)}</div><div class="dlt"><b>${esc(t('dl.' + D.k))}${rr.md ? `<i class="medal m${rr.md}"></i>` : ''}</b>${ruleChip(rec.r)}<small>${esc(t('u.opt', { n: rec.o }))}</small>
        <span class="dbest"><span>${esc(t('d.best'))}</span><b>${played ? fmt(rr.s) : '—'}</b></span></div>
        <div class="dlb"><button class="btn ${D.k === 'e' ? 'blue' : D.k === 'm' ? 'org' : 'dark'}" data-dl="${D.k}" ${played ? 'disabled' : ''}>${played ? '' : A.ICON.play}${esc(t(played ? 'd.done' : going ? 'd.resume' : 'd.play'))}</button><button class="btn sm" data-rank="${D.k}" aria-label="${esc(t('rk.title'))}">${A.ICON.rank}</button></div></div>`; }).join('')}</div>
    <p class="note">${esc(t('d.medals'))}</p>`;
  const left = DSL_TRIES - r.sl.a;
  $('#dSearch').innerHTML = `<div class="ptag blue">${esc(t('d.sl'))}</div><div class="slrow"><span class="slic">${A.MI.sl}</span><div><h3>${esc(t('d.sl.h'))}</h3><p>${esc(t('d.sl.d', { s: SL_TIME }))}</p>
    <span class="dbest"><span>${esc(t('d.best'))}</span><b>${r.sl.a ? fmt(r.sl.s) : '—'}</b></span></div></div>
    <div class="dabtm"><span class="tries">${[0, 1, 2].map(i => `<i class="${i < r.sl.a ? 'used' : ''}"></i>`).join('')}<em>${esc(t('d.tries', { n: Math.max(0, left) }))}</em></span><button class="btn org" id="dslPlay" ${left <= 0 ? 'disabled' : ''}>${A.ICON.play}${esc(t(left > 0 ? 'd.play' : 'd.done'))}</button><button class="btn sm" data-rank="sl" aria-label="${esc(t('rk.title'))}">${A.ICON.rank}</button><button class="btn sm qbtn" data-rule="sl">?</button></div>`;
  $$('[data-dl]').forEach(b => { b.onclick = () => startDaily(b.dataset.dl); });
  $('#dslPlay').onclick = () => startSearch(true);
  $$('[data-rank]', $('#home')).forEach(b => { b.onclick = () => openRank(b.dataset.rank); });
  renderCal();
}
let calOff = 0;
function renderCal() {
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + calOff);
  const y = base.getFullYear(), m = base.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), td = today();
  let cells = '', gold = 0, played = 0;
  for (let i = 0; i < first; i++) cells += '<i></i>';
  for (let d = 1; d <= days; d++) {
    const k = `${y}-${pad(m + 1)}-${pad(d)}`, r = DB.dl[k], mds = r ? DIFFS.map(D => r[D.k] ? r[D.k].md : 0) : [0, 0, 0], md = Math.max(...mds), sl = !!(r && r.sl && r.sl.a);
    if (dayGold(r)) gold++; if (dayPlayed(r)) played++;
    cells += `<span class="${k === td ? 'today' : ''} ${md ? 'has' : ''}"><b>${d}</b>${md ? `<span class="mds">${mds.map(v => `<i class="medal m${v}"></i>`).join('')}</span>` : ''}${sl ? '<em></em>' : ''}</span>`;
  }
  $('#dCal').innerHTML = `<div class="calh"><button class="ib sm" id="calP" aria-label="prev">${A.ICON.back}</button><b>${y}.${pad(m + 1)}</b><button class="ib sm flip" id="calN" aria-label="next" ${calOff >= 0 ? 'disabled' : ''}>${A.ICON.back}</button></div>
    <div class="calw">${[0, 1, 2, 3, 4, 5, 6].map(i => `<i>${esc(t('wd.' + i))}</i>`).join('')}</div><div class="calg">${cells}</div>
    <div class="calsum"><span><i class="medal m3"></i>×${gold}</span><span>${esc(t('cal.played', { n: played }))}</span><span class="stk">${esc(t('cal.streak', { n: streak() }))}</span></div>`;
  $('#calP').onclick = () => { calOff--; renderCal(); };
  $('#calN').onclick = () => { if (calOff < 0) { calOff++; renderCal(); } };
}
// prison badge for a course card: barred window + the course's initial
function courseIcon(id) { const c = COURSE_COL[id] || '#5a6b7f', L = esc(t('cs.' + id)).slice(0, 1); return `<svg viewBox="0 0 48 48" class="flic"><rect x="4" y="6" width="40" height="36" rx="4" fill="${c}" stroke="#2a2622" stroke-width="3"/><path d="M4 16h40" stroke="#2a2622" stroke-width="2.4"/><path d="M14 16v26M24 16v26M34 16v26" stroke="rgba(0,0,0,.35)" stroke-width="2.6"/><circle cx="11" cy="11" r="2" fill="#ffcd3c"/><circle cx="37" cy="11" r="2" fill="#ffcd3c"/><text x="24" y="36" text-anchor="middle" font-size="17" font-weight="900" fill="#fff" stroke="#2a2622" stroke-width="3" paint-order="stroke" font-family="Jost,sans-serif">${L}</text></svg>`; }
// where "continue" goes: the stage you last played there if it is still uncleared, else the first open uncleared stage
function contIdx(src) {
  const recs = listOf(src).map(r => DB.st[r.k] || 0), last = (DB.last || {})[src];
  if (last != null && !recs[last] && secOpenQ(recs, last)) return last;
  const j = recs.findIndex((v, i) => !v && secOpenQ(recs, i));
  return j >= 0 ? j : Math.min(recs.length - 1, last ?? 0);
}
const lvChip = lv => `<span class="lvc lv${lv}">${esc(t('lv.' + lv))}</span>`;
function courseCard(c) {
  const recs = courseRecs(c.id), done = recs.filter(v => v).length, stars = recs.reduce((a, b) => a + b, 0), N = recs.length, comp = done === N;
  const os = c.st.map(r => r.o), j = contIdx(c.id), started = done > 0 || (DB.last || {})[c.id] != null;
  return `<div class="tcard ccard ${comp ? 'comp' : ''}" style="--tc:${COURSE_COL[c.id]}"><button class="cmain" data-co="${c.id}" data-j="${j}"><span class="tic">${courseIcon(c.id)}</span><span class="tt"><span class="ctl"><b>${esc(t('cs.' + c.id))}</b>${lvChip(c.lv)}</span><small>${esc(t('cs.' + c.id + '.d'))}</small>
    <span class="bar"><i style="width:${done / N * 100}%"></i></span>
    <span class="tmeta"><em>${done}/${N}</em><em class="st">★ ${stars}/${N * 3}</em><em class="mv">${esc(t('u.movesR', { a: Math.min(...os), b: Math.max(...os) }))}</em></span><span class="mnext">${A.ICON.play}${esc(t(started ? 'u.cont' : 'u.start1'))} ${floorLabel(j)}</span></span></button>${comp ? `<span class="crown">${esc(t('co.comp'))}</span>` : ''}</div>`;
}
const floorLabel = j => `${Math.floor(j / PER) + 1}F-${(j % PER) + 1}`;
// long course names shrink until they fit beside the level chip (all languages)
function fitNames(el) { requestAnimationFrame(() => $$('.ctl b', el).forEach(b => { b.style.fontSize = ''; let f = parseFloat(getComputedStyle(b).fontSize); while (b.scrollWidth > b.clientWidth + 1 && f > 11) { f -= .5; b.style.fontSize = f + 'px'; } })); }
addEventListener('resize', () => { const el = $('#coursePanel'); if (el && !el.closest('[hidden]')) fitNames(el); });
// the first time you play a floor of a course, its story comes first
function storyThen(co, j, go) {
  const f = Math.floor(j / PER), k = 'sy_' + co + '_' + f;
  if (DB.tut[k] || !floorOpenC(co, f)) return go();
  DB.tut[k] = 1; save(); showStory(f, go, co);
}
function renderCourses() {
  const el = $('#coursePanel'), mix = COURSES().filter(c => c.kind === 'mix'), cls = COURSES().filter(c => c.kind === 'classic'), sub = subShown() ? subOf('course') : '';
  el.innerHTML = `${sub === 'cls' ? '' : `<section class="card panel secbox sb-mix"><div class="ptag">${esc(t('co.mix.h'))}</div><p class="secd">${esc(t('co.mix.d'))}</p><div class="tgrid">${mix.map(courseCard).join('')}</div></section>`}
    ${sub === 'mix' ? '' : `<section class="card panel secbox sb-cls"><div class="ptag">${esc(t('co.cls.h'))}</div><p class="secd">${esc(t('co.cls.d'))}</p><div class="tgrid">${cls.map(courseCard).join('')}</div></section>`}`;
  // a course card starts its next stage straight away (the stage list opens from the result screen's "list")
  // while nothing on the course is cleared yet, its story comes first (then the stage starts)
  fitNames(el);
  $$('[data-co]', el).forEach(b => { b.onclick = () => { const id = b.dataset.co, j = +b.dataset.j; storyThen(id, j, () => startStage(id, j)); }; });
}
// stage tiles in sections of 10 (course: floors 1F…10F, mode: BLOCK A…E); a section opens once 6 of the one before are cleared
function stageTiles(src, recs) {
  const L = listOf(src), isC = !!courseOf(src), n = recs.length;
  let html = '<div class="stgs">';
  const next = recs.findIndex((v, j) => !v && secOpenQ(recs, j));
  for (let s = 0; s < n / PER; s++) {
    const open = secOpenQ(recs, s * PER), md = secMedal(recs, s), cl = recs.slice(s * PER, s * PER + PER).filter(v => v).length;
    const need = s ? Math.max(0, UNLOCK - recs.slice((s - 1) * PER, s * PER).filter(v => v).length) : 0;
    const sup = L.slice(s * PER, s * PER + PER).some(r => r.o >= SUPER);
    const head = isC ? (open ? `<b class="fln">${esc(floorName(src, s))}</b><button class="ib sm sybtn" data-sy="${s}" aria-label="${esc(t('sy.btn'))}">${A.ICON.book}</button>` : `<b class="fln">${s + 1}F ？？？</b>`) : `<b>BLOCK ${String.fromCharCode(65 + s)}</b><span class="tier">${esc(t('tier.' + Math.min(s, 4)))}</span>`;
    html += `<section class="stg tier${s}"><div class="stgh">${head}${sup ? `<span class="supc">${esc(t('u.super'))}</span>` : ''}<span class="cnt">${cl}/${PER}</span>${md ? `<i class="medal m${md}"></i>` : ''}</div>`;
    if (!open) html += `<div class="locked">${A.ICON.lock}${esc(isC ? t('st.lockF', { f: floorName(src, s - 1), n: need }) : t('st.lock', { s: String.fromCharCode(64 + s), n: need }))}</div>`;
    else {
      html += '<div class="tiles">';
      for (let j = s * PER; j < s * PER + PER; j++) {
        const r = L[j], rr = isC && r.r && r.r !== 'basic' ? r.r : null;
        html += `<button class="tile ${recs[j] ? 'done' : ''} ${j === next ? 'next' : ''} ${r.o >= SUPER ? 'sup' : ''}" data-j="${j}">${rr ? `<span class="trc" style="--mc:${MODE_COL[rr]}">${A.MI[rr]}</span>` : ''}<b>${j % PER + 1}</b><span class="stars">${'★'.repeat(recs[j])}${'☆'.repeat(3 - recs[j])}</span>${j === next ? '<i>NEXT</i>' : ''}</button>`;
      }
      html += '</div>';
    }
    html += '</section>';
  }
  return html + '</div>';
}
function renderCourse(id) {
  const c = courseOf(id); if (!c) { courseOpenId = null; return renderCourses(); }
  const el = $('#coursePanel'), recs = courseRecs(id), done = recs.filter(v => v).length, j = contIdx(id);
  el.innerHTML = `<div class="thead" style="--tc:${COURSE_COL[id]}"><button class="btn sm" id="flBack">${A.ICON.back}${esc(t('u.list'))}</button><span class="tic">${courseIcon(id)}</span>
    <div><h2>${esc(t('cs.' + id))} ${lvChip(c.lv)}</h2><p>${esc(t('cs.' + id + '.d'))}</p><button class="btn sm org" id="coCont">${A.ICON.play}${esc(t(done ? 'u.cont' : 'u.start1'))} <small>${floorLabel(j)}</small></button></div><div class="ring" style="--p:${done / recs.length * 100}"><b>${done}</b><small>/${recs.length}</small></div></div>` + stageTiles(id, recs);
  $('#flBack').onclick = closeList;
  $('#coCont').onclick = () => storyThen(id, j, () => startStage(id, j));
  $$('[data-sy]', el).forEach(b => { b.onclick = e => { e.stopPropagation(); showStory(+b.dataset.sy, null, id); }; });
  $$('.tile', el).forEach(b => { b.onclick = () => { const jj = +b.dataset.j; storyThen(id, jj, () => startStage(id, jj)); }; });
}
// the floor's story: an illustration of the location + a few lines (shown the first time you play a stage on that floor)
// per-course stories (stories.js): floor names and texts in 10 languages; falls back to the shared floor texts
const story = (co, f) => (window.JB_STORIES && JB_STORIES[co] && JB_STORIES[co][f]) || null;
const L10 = o => o ? (o[lang] || o.en || o.ja) : '';
const floorName = (co, f) => { const s = story(co, f); return s ? L10(s.fl) : t('fl.' + f); };
// a floor's story can be read once that floor is unlocked
const floorOpenC = (co, f) => secOpenQ(courseRecs(co), f * PER);
function showStory(f, then, co = courseOpenId) {
  const S = story(co, f), sc = S ? S.sc : f, tx = S ? L10(S.tx) : t('sy.' + f);
  const body = modal(`<div class="story" style="--tc:${COURSE_COL[co] || '#5a6b7f'}"><div class="syfig">${window.JBStory ? JBStory.scene(sc, A.inmateSVG(DB.icon)) : ''}<span class="sytag">${esc(t('sy.tag'))} ${f + 1}F</span></div>
    <h2 class="mh">${esc(co ? t('cs.' + co) + ' · ' : '')}${esc(floorName(co, f))}</h2><p class="sytx">${esc(tx)}</p><div class="mbtns"><button class="btn big org" id="syGo">${A.ICON.play}${esc(t('sy.go'))}</button></div></div>`, 'mwide');
  afterModal = then || null;
  $('#syGo', body).onclick = closeModal;
  SND.page && SND.page();
}
function renderModes() {
  const el = $('#modePanel'), sub = subShown() ? subOf('modes') : '';
  const sc = (m, best, extra) => `<div class="card acard" style="--mc:${MODE_COL[m]}"><div class="ptag">${esc(t('mo.' + m))}</div><button class="qbtn qc" data-rule="${m}">?</button><span class="aic">${A.MI[m]}</span><p>${esc(t('mo.' + m + '.s'))}</p><div class="dbest"><span>${esc(t('d.best'))}</span><b>${best < 0 ? (DB.best.ta ? fmtT(DB.best.ta) : '—') : best ? fmt(best) : '—'}</b>${extra || ''}</div><button class="btn big org" data-sm="${m}">${A.ICON.play}${esc(t('d.play'))}</button></div>`;
  let html = sub === 'rule' ? '' : `<section class="card panel secbox sb-run"><div class="ptag">${esc(t('mo.h'))}</div><p class="secd">${esc(t('mo.d'))}</p><div class="acards">${sc('sl', DB.best.sl)}${sc('chain', DB.best.chain, DB.best.chainN ? `<small>${esc(t('ch.n', { n: DB.best.chainN }))}</small>` : '')}${sc('ta', -1)}</div></section>`;
  if (sub === 'run') { el.innerHTML = html; } else {
  html += `<section class="card panel secbox sb-rule"><div class="ptag">${esc(t('mo.h2'))}</div><p class="secd">${esc(t('mo.d2'))}</p><div class="mgrid">`;
  SMODES.forEach(m => { const recs = modeRecs(m), done = recs.filter(v => v).length, stars = recs.reduce((a, b) => a + b, 0), N = recs.length;
    html += `<div class="mcard" style="--mc:${MODE_COL[m]}"><button class="cmain" data-mode="${m}" data-j="${contIdx(m)}"><span class="mic">${A.MI[m]}</span><span class="mt"><b>${esc(t('mo.' + m))}</b><small>${esc(t('mo.' + m + '.s'))}</small><span class="bar"><i style="width:${done / N * 100}%"></i></span><span class="tmeta"><em>${done}/${N}</em><em class="st">★ ${stars}/${N * 3}</em><span class="mnext">${A.ICON.play}${esc(t(done ? 'u.cont' : 'u.start1'))} ${contIdx(m) + 1}</span></span></span></button>${done === N ? `<span class="crown">${esc(t('co.comp'))}</span>` : ''}</div>`; });
  el.innerHTML = html + '</div></section>'; }
  $$('[data-sm]', el).forEach(b => { b.onclick = () => b.dataset.sm === 'sl' ? startSearch(false) : b.dataset.sm === 'ta' ? startTA() : startChain(); });
  // a rule-mode card starts its next stage straight away (the stage list opens from the result screen's "list")
  $$('[data-mode]', el).forEach(b => { b.onclick = () => startStage(b.dataset.mode, +b.dataset.j); });
  $$('[data-cont]', el).forEach(b => { b.onclick = () => startStage(b.dataset.cont, +b.dataset.j); });
}
function renderMode(m) {
  const el = $('#modePanel'), recs = modeRecs(m), done = recs.filter(v => v).length, j = contIdx(m);
  el.innerHTML = `<div class="thead" style="--tc:${MODE_COL[m]}"><button class="btn sm" id="moBack">${A.ICON.back}${esc(t('u.list'))}</button><span class="tic mtic">${A.MI[m]}</span>
    <div><h2>${esc(t('mo.' + m))}</h2><p>${esc(t('mo.' + m + '.r'))}</p><div class="hbtns"><button class="btn sm org" id="moCont">${A.ICON.play}${esc(t(done ? 'u.cont' : 'u.start1'))} <small>${j + 1}</small></button><button class="btn sm" id="moRule">?${esc(t('u.rules'))}</button></div></div><div class="ring" style="--p:${done / recs.length * 100}"><b>${done}</b><small>/${recs.length}</small></div></div>` + stageTiles(m, recs);
  $('#moBack').onclick = closeList;
  $('#moRule').onclick = () => maybeRuleTip(m, true);
  $('#moCont').onclick = () => startStage(m, j);
  $$('.tile', el).forEach(b => { b.onclick = () => startStage(m, +b.dataset.j); });
}
function closeList() {
  // back to the list: the sub-tab follows the category of the course / mode that was open
  const c = courseOpenId && courseOf(courseOpenId), sk = c ? (c.kind === 'classic' ? 'cls' : 'mix') : modeOpenId ? 'rule' : null;
  if (sk && subOf(homeTab) !== sk && SUBS[homeTab] && SUBS[homeTab].includes(sk)) { DB.set.sub = Object.assign({}, DB.set.sub, { [homeTab]: sk }); save(); }
  courseOpenId = modeOpenId = null; renderHome(); const pn = $(`.hpanel[data-p="${homeTab}"]`); if (pn) pn.scrollTop = 0; scrollTo(0, 0); }
document.addEventListener('click', e => { const b = e.target.closest('[data-rule]'); if (b) { e.stopPropagation(); maybeRuleTip(b.dataset.rule, true); } });

/* ============================================================ GAME ============================================================ */
let G = null;
function showScreen(id) { $$('.screen').forEach(s => { s.hidden = s.id !== id; }); document.body.dataset.screen = id; scrollTo(0, 0); setTimeout(navSync, 0); }
// kinds: stage (course 'c' or a stage mode) · daily · sl (searchlight, dsl = daily) · chain
function newGame(rec, o) {
  const P = E.decode(rec);
  G = Object.assign({ rec, P, S: P.s0.slice(), hist: [], moves: 0, undoN: 0, hinted: false, over: false, busy: false, t0: Date.now(), sol: null, ti0: titleIdx() }, o);
  G.sol = rec.s ? decodeSol(P, rec.s) : null;
  G.limit = G.kind === 'stage' && G.m === 'silent' ? rec.o + 2 : G.kind === 'chain' ? G.budget : 0;
  buildBoard(); hud();
}
// stored solution (2 chars a move) → moves + the state keys along it
function decodeSol(P, s) {
  const ms = [];
  for (let i = 0; i + 1 < s.length; i += 2) {
    const a = s[i], b = s.charCodeAt(i + 1) - 48;
    if (a === '!') ms.push([-1, b]); else if (a === '^') ms.push([-2, b]);
    else { const dir = b >> 3, n = b & 7, [dx, dy] = E.DIRS[dir]; ms.push([a.charCodeAt(0) - 97, dx * n, dy * n]); }
  }
  const keys = new Map(); let S = P.s0;
  ms.forEach((m, k) => { keys.set(E.key(S), k); S = E.apply(P, S, m); });
  return { ms, keys };
}
function startStage(src, j) {
  const L = listOf(src), rec = L[j]; if (!rec) return;
  const isC = !!courseOf(src), f = Math.floor(j / PER), m = rec.r || (RULE_OF[src] || 'basic');
  const title = isC ? `${t('cs.' + src)} ${floorLabel(j)}` : `${t('mo.' + src)} · ${j + 1}`;
  (DB.last = DB.last || {})[src] = j; save();
  newGame(rec, { kind: 'stage', m, src, j, title, isC, tag: [isC ? t('cs.' + src) : t('mo.' + src), isC ? floorLabel(j) : String(j + 1), isC ? COURSE_COL[src] : MODE_COL[src]] });
  startPlay();
  // first visit of a floor: its story · a rule's first appearance: its explanation · the very first stage: a tip
  const tip = () => { if (m !== 'basic') maybeRuleTip(m); else if (j === 0 && !DB.tut.first) { DB.tut.first = 1; save(); setTimeout(() => floatTip(t('tip.first')), 500); } };
  tip();
}
// one play per difficulty a day: the attempt starts when the cell opens; leaving keeps it (resume: same board, moves and clock)
function startDaily(k) {
  const d = today(), rec = dRec(d, k), rr = dlOf(d)[k];
  if (rr.md > 0) return;
  const p = rr.p;
  newGame(rec, { kind: 'daily', m: rec.r || 'basic', dk: k, date: d, title: `${t('d.title')} · ${t('dl.' + k)}`, tag: [t('dl.' + k), '', k === 'e' ? '#2f74b5' : k === 'm' ? '#d4561d' : '#6b3fa0'] });
  if (p) { Object.assign(G, { S: p.S.slice(), hist: p.hist.map(x => x.slice()), moves: p.moves, undoN: p.undoN, hinted: !!p.hinted, t0: Date.now() - p.el }); buildBoard(); hud(); }
  else { rr.p = { S: G.S.slice(), hist: [], moves: 0, undoN: 0, hinted: false, el: 0 }; save(); }
  startPlay(); if (rec.r && rec.r !== 'basic') maybeRuleTip(rec.r);
}
// SEARCHLIGHT: escape as many cells as you can before the light finds you (90 s); daily = same puzzle order for everyone, 3 tries
function slPick(rnd, k) { const L = DL.sprint, o = Math.min(14, 3 + Math.floor(k * .8)), c = L.filter(r => r.o === o); return (c.length ? c : L)[Math.floor(rnd() * (c.length || L.length))]; }
function startSearch(daily) {
  const d = today();
  if (daily) { const r = dlOf(d).sl; if (r.a >= DSL_TRIES) return; r.a++; save(); }
  const rnd = E.rng(daily ? E.hashStr('jb-sl-' + d) : (Math.random() * 2 ** 31) | 0);
  const run = { rnd, k: 0, score: 0, n: 0, perf: 0, tEnd: 0, daily, date: d };
  newGame(slPick(rnd, 0), { kind: 'sl', m: 'basic', run, title: daily ? t('d.sl') : t('mo.sl'), tag: [daily ? t('d.sl') : t('mo.sl'), '', MODE_COL.sl] });
  startPlay(); G.busy = true;
  maybeRuleTip('sl', false, () => { if (G && G.run === run) countdown(() => { run.tEnd = performance.now() + SL_TIME * 1000; G.t0 = Date.now(); loop(); }); });
}
// CHAIN ESCAPE: endless; every cell has a move budget, going over sets off the alarm (3 alarms = game over)
function chainBudget(k, o) { return o + Math.max(1, 4 - Math.floor(k / 6)); }
function startChain() {
  const rnd = E.rng((Math.random() * 2 ** 31) | 0), run = { rnd, k: 0, score: 0, n: 0, lives: 3, combo: 0 };
  const rec = slPick(rnd, 0);
  newGame(rec, { kind: 'chain', m: 'basic', run, budget: chainBudget(0, rec.o), title: t('mo.chain'), tag: [t('mo.chain'), '', MODE_COL.chain] });
  startPlay(); maybeRuleTip('chain');
}
// TIME ATTACK ×10: today's 10 cells (same for everyone), the clock runs until the 10th escape; ranking by time
const TA_O = [4, 5, 6, 7, 7, 8, 9, 10, 11, 12];
const fmtT = ms => { const tn = Math.floor(ms / 100); return `${Math.floor(tn / 600)}:${pad(Math.floor(tn / 10) % 60)}.${tn % 10}`; };
function taList(d) {
  const rnd = E.rng(E.hashStr('jb-ta-' + d)), L = DL.sprint;
  return TA_O.map(o => { const c = L.filter(r => r.o === o); return (c.length ? c : L)[Math.floor(rnd() * (c.length || L.length))]; });
}
function startTA() {
  const d = today(), list = taList(d), run = { list, k: 0, n: 0, perf: 0, el: 0, last: 0, date: d, score: 0 };
  newGame(list[0], { kind: 'ta', m: 'basic', run, title: t('mo.ta'), tag: [t('mo.ta'), '1/10', MODE_COL.ta] });
  startPlay(); G.busy = true;
  maybeRuleTip('ta', false, () => { if (G && G.run === run) countdown(() => { run.last = performance.now(); loopTA(); }); });
}
function loopTA() {
  cancelAnimationFrame(raf);
  const f = now => {
    if (!G || G.kind !== 'ta' || G.over) return;
    const run = G.run; if (!G.paused) run.el += now - run.last; run.last = now;
    const el = $('#taTime'); if (el) el.textContent = fmtT(run.el);
    raf = requestAnimationFrame(f);
  };
  raf = requestAnimationFrame(f);
}
function taEscape(perfect) {
  const run = G.run; run.n++; if (perfect) run.perf++;
  G.busy = true; floatText(perfect ? 'SILENT!' : 'NICE!');
  if (run.k >= TA_O.length - 1) { hud(); return setTimeout(endTA, 450); }
  setTimeout(() => {
    if (!G || G.over) return; run.k++;
    newGame(run.list[run.k], { kind: 'ta', m: 'basic', run, title: t('mo.ta'), tag: [t('mo.ta'), (run.k + 1) + '/10', MODE_COL.ta] });
    boardIn();
  }, 450);
}
function endTA() {
  if (!G || G.over) return;
  G.over = true; cancelAnimationFrame(raf); hud();
  const run = G.run, ms = Math.round(run.el), best = !DB.best.ta || ms < DB.best.ta;
  DB.stats.taRuns = (DB.stats.taRuns || 0) + 1; if (best) DB.best.ta = ms;
  const coins = addCoin(80 + Math.max(0, 180 - ms / 1000)); save();
  if (ON && ON.available && DB.name) ON.putDaily(run.date, 'ta', Object.assign({ s: Math.max(0, 200000 - Math.round(ms / 100)) }, who())).catch(() => {});
  showResult(resultCard('ALL CLEAR!', `<div class="rscore">${fmtT(ms)}</div>${best ? `<div class="ev">${esc(t('r.best'))}</div>` : ''}<div class="rstats"><span><b>${run.perf}<small>/10</small></b>${esc(t('ta.perf'))}</span><span><b>${fmtT(DB.best.ta)}</b>${esc(t('d.best'))}</span></div>${coinLine(coins)}${nameNudge()}`,
    [['again', t('r.retry'), 'org'], ['rank', t('rk.title')], ['home', t('u.home')]]));
  if (DB.set.anim) confetti(); updateBadges();
}
function nextRunPuzzle() {
  const run = G.run; run.k++;
  const rec = slPick(run.rnd, run.k), o = { kind: G.kind, m: 'basic', run, title: G.title, tag: G.tag };
  if (G.kind === 'chain') o.budget = chainBudget(run.k, rec.o);
  const t0 = G.t0; newGame(rec, o); G.t0 = t0;
  boardIn();
}
function startPlay() {
  $('#gameMsg').hidden = true; showScreen('play'); relayout(); hud(); renderInfo();
}

/* ---------------- board DOM ---------------- */
const boardEl = () => $('#board');
// Board size. The board + its frame + the EXIT sign take (w + 1.2) cells across, (h + .8) down (+ .5 more for TWIN's bottom exit).
// Phones: the frame always spans the full width, whatever the board (a 7×7 board just gets smaller cells), and only shrinks
// when the screen is too short for it. PC: as large as the window height allows (up to 860px across), centred.
const hOfTilt = () => { const e = $('#tiltPad'); return e && !e.hidden && e.offsetParent ? e.offsetHeight + 8 : 0; };
function cellSize() {
  // the frame (board + .32 cell of ring + 3px ink a side) fills the play column; the EXIT sign sits on the ring
  const P = G.P, phone = innerWidth < 760;
  const used = ['.gbar', '.gbtns', '#gInfo', '#runInfo', '#tiltPad', '.top', '.slbar'].reduce((a, q) => { const e = $(q); return a + (e && !e.hidden && e.offsetParent ? e.offsetHeight + 8 : 0); }, 0);
  const under = ['#gInfo', '#tiltPad'].reduce((a, q) => { const e = $(q); return a + (e && !e.hidden && e.offsetParent ? e.offsetHeight + 8 : 0); }, 0);
  const H = Math.max(240, innerHeight - used - (phone ? 20 + hOfTilt() : 84));
  const W = phone ? Math.min(innerWidth, 560) - 16 : Math.min(innerWidth - 80, 900);
  return Math.max(28, Math.floor(Math.min((W - 8) / (P.w + .64), (H - 8) / (P.h + .64))));
}
const tr = (x, y) => `translate(${x * G.cs}px, ${y * G.cs}px)`;
// TWIN: the partner is another inmate you own (or the next one)
function twinMate() { const o = Object.keys(DB.own).map(Number).filter(i => i !== DB.icon); return o.length ? o[(DB.icon + 1) % o.length] : (DB.icon + 1) % A.INMATES.length; }
function pieceHTML(p, i) {
  const big = p.l > 1;
  if (p.t === 'P' || p.t === 'Q') return `<span class="suit"></span><span class="face">${A.inmateSVG(p.t === 'P' ? DB.icon : twinMate(), { noSuit: true })}</span><span class="tag">${p.t === 'P' ? 'A' : 'B'}-${String((p.t === 'P' ? DB.icon : twinMate()) + 1).padStart(3, '0')}</span>`;
  if (p.t === 'g') return `<span class="gd">${A.GUARD}<i class="gmouth"></i><i class="gsweat"></i></span><i class="gdir"></i><b class="gbadge"></b><b class="gshock">!?</b>`;
  if (p.t === 'k') return `<span class="kk">${A.KEY}</span>`;
  if (p.t === 'x') return '<span class="crate"></span>';
  if (p.hv) return `<span class="bk safe ${p.v ? 'v' : 'h'}${p.l}"><i class="dial"></i><b class="wt">1</b></span>`;
  return `<span class="bk ${p.v ? 'v' : 'h'}${p.l}">${p.t === 'o' ? `<span class="chev ${p.v ? (p.f > 0 ? 'd' : 'u') : (p.f > 0 ? 'r' : 'l')}">${'<i></i>'.repeat(big ? p.l + 1 : 2)}</span>` : ''}</span>`;
}
function buildBoard() {
  const P = G.P, b = boardEl(); G.cs = cellSize(); const cs = G.cs;
  b.style.setProperty('--cs', cs + 'px'); b.style.width = P.w * cs + 'px'; b.style.height = P.h * cs + 'px';
  b.dataset.mode = G.m; b.dataset.w = P.w;
  const wr = $('#boardWrap'), phone = innerWidth < 760;
  wr.style.paddingRight = ''; wr.style.paddingBottom = '';
  // PC: the play column (title row, buttons, rule line) takes the width of the board's frame
  $('#play').style.maxWidth = phone ? '' : Math.max(440, Math.round(cs * (P.w + .64)) + 6) + 'px';
  let html = '<div class="floor"></div><div class="fxl">';
  const at = c => `style="transform:${tr(c % P.w, (c / P.w) | 0)}"`;
  P.walls.forEach(c => { html += `<div class="cell wall" ${at(c)}></div>`; });
  P.cracks.forEach((c, k) => { html += `<div class="cell crack" data-c="${c}" data-k="${k}" ${at(c)}><i></i></div>`; });
  if (P.plate >= 0) html += `<div class="cell plate" ${at(P.plate)}><i></i></div>`;
  P.doors.forEach(c => { html += `<div class="cell door" ${at(c)}><i></i></div>`; });
  if (P.lock >= 0) html += `<div class="cell lockc" ${at(P.lock)}>${A.LOCK}</div>`;
  P.gate.forEach(c => { html += `<div class="cell gate" ${at(c)}><i></i></div>`; });
  // 2026-10 rules
  P.lz.forEach(([c, d]) => { html += `<div class="cell lzem d${d}" ${at(c)}><i></i></div>`; });
  P.sr.forEach(c => { html += `<div class="cell shut sr" data-c="${c}" ${at(c)}><i></i></div>`; });
  P.sb.forEach(c => { html += `<div class="cell shut sb" data-c="${c}" ${at(c)}><i></i></div>`; });
  if (P.sw >= 0) html += `<div class="cell lsw" ${at(P.sw)}><i></i></div>`;
  if (P.vt) P.vt.forEach((c, k) => { html += `<div class="cell vent v${k}" ${at(c)}><i></i></div>`; });
  html += '</div><div class="beams"></div>';
  // exits (prisoner rows / columns)
  P.pc.forEach((p, i) => {
    if (p.t === 'P') html += `<div class="exit er" style="top:${P.s0[2 * i + 1] * cs}px;height:${cs}px"><span class="sign">${A.ICON.exit}</span></div>`;
    if (p.t === 'Q') html += `<div class="exit eb" style="left:${P.s0[2 * i] * cs}px;width:${cs}px"><span class="sign">${A.ICON.exit}</span></div>`;
  });
  html += '<div class="pcs">' + P.pc.map((p, i) => `<div class="pc t${p.t} ${p.v ? 'pv' : 'ph'} l${p.l} c${i % A.BCOL.length}${p.hv ? ' hv' : ''}" data-i="${i}" style="width:${(p.v ? 1 : p.l) * cs}px;height:${(p.v ? p.l : 1) * cs}px">${pieceHTML(p, i)}</div>`).join('') + '</div>';
  if (P.lock >= 0) html += `<div class="cell lockmk" ${at(P.lock)}>${A.LOCK}</div>`;   // the keyhole stays visible even under a block
  if (P.plate >= 0) html += `<div class="cell platemk" ${at(P.plate)}></div>`;           // so does the pressure switch
  if (P.sw >= 0) html += `<div class="cell lswmk" ${at(P.sw)}></div>`;                    // and the lights switch
  if (P.vt) P.vt.forEach((c, k) => { html += `<div class="cell ventmk v${k}" ${at(c)}></div>`; });
  html += '<div class="ghost" hidden></div><div class="beam" hidden></div>';
  b.innerHTML = html;
  G.els = $$('.pc', b);
  $('#tiltPad').hidden = !P.tilt;
  b.querySelector('.beam').hidden = G.kind !== 'sl';
  render(false);
}
function render(anim = true, ev) {
  if (!G) return;
  const P = G.P, S = G.S, g = E.grid(P, S);
  G.els.forEach((el, i) => {
    const x = S[2 * i], y = S[2 * i + 1], p = P.pc[i];
    el.style.transition = anim ? (p.t === 'g' ? 'transform .2s ease .12s' : P.tilt ? 'transform .28s cubic-bezier(.3,.1,.3,1)' : 'transform .14s ease-out') : 'none';
    if (x < 0) {
      if (!el.classList.contains('gone')) {
        el.classList.add('gone');
        if (anim && ev && ev.esc && ev.esc.includes(i)) { const px = el._last || [0, 0]; el.style.transition = 'transform .5s ease-in, opacity .5s ease-in .2s'; el.style.transform = p.t === 'P' ? tr(P.w + 1, px[1]) : tr(px[0], P.h + 1); el.style.opacity = '0'; el.classList.add('run'); }
        else if (anim && ev && ev.key === i && false) {}
        else if (anim && ev && ev.key === i) { el.style.transition = 'transform .35s, opacity .35s'; el.style.transform = tr(P.lock % P.w, (P.lock / P.w) | 0) + ' scale(.2) rotate(180deg)'; el.style.opacity = '0'; }
        else { el.style.opacity = '0'; }
      }
      return;
    }
    el.classList.remove('gone'); el.style.opacity = '';
    if (anim && ev && ev.vent && ev.vent[0] === i) { el.style.transition = 'none'; el.classList.remove('warp'); void el.offsetWidth; el.classList.add('warp'); }
    el.style.transform = tr(x, y); el._last = [x, y];
    if (p.t === 'g') {
      // full information: which way the guard walks, and in how many of your moves it takes its next step
      const d = S[2 * P.pc.length + P.guards.indexOf(i)]; el.dataset.dir = p.v ? (d > 0 ? 'd' : 'u') : (d > 0 ? 'r' : 'l');
      const n = P.gn - S[P.iTk], bd = el.querySelector('.gbadge'); if (bd) { bd.textContent = n; bd.classList.toggle('now', n === 1); }
    }
  });
  // gate / doors / plate / cracks
  const shut = P.gate.length && E.gateShut(P, S);
  $$('.gate', boardEl()).forEach(e => e.classList.toggle('open', !shut));
  $$('.lockmk', boardEl()).forEach(e => e.classList.toggle('used', !!P.gate.length && !shut));
  const plateOn = P.plate >= 0 && g[P.plate] > 0;
  const pl = $('.plate', boardEl()); if (pl) pl.classList.toggle('on', plateOn);
  const pm = $('.platemk', boardEl()); if (pm) pm.classList.toggle('on', plateOn);
  $$('.door', boardEl()).forEach(e => e.classList.toggle('open', plateOn));
  if (G.plateOn !== undefined && G.plateOn !== plateOn && anim) SND.door(plateOn);
  G.plateOn = plateOn;
  const m = S[P.iCr]; $$('.crack', boardEl()).forEach(e => { const k = +e.dataset.k; e.classList.toggle('dug', !(m >> k & 1)); });
  const dg = P.cracks.length ? E.digs(P, S, g) : [];
  $$('.crack', boardEl()).forEach(e => e.classList.toggle('can', dg.includes(+e.dataset.c)));
  // lasers: one beam per emitter, up to the first wall / piece (prisoners never stand in one)
  const bm = $('.beams', boardEl());
  if (bm && P.lz.length) {
    let h = '';
    for (const [c, d] of P.lz) {
      const [dx, dy] = E.DIRS[d]; let x = c % P.w + dx, y = ((c / P.w) | 0) + dy, n = 0; const x0 = x, y0 = y;
      while (x >= 0 && y >= 0 && x < P.w && y < P.h) { const v = g[y * P.w + x]; if (v < 0 || (v > 0 && P.pc[v - 1].t !== 'P' && P.pc[v - 1].t !== 'Q')) break; n++; x += dx; y += dy; }
      if (!n) continue;
      const lx = dx < 0 ? x0 - n + 1 : x0, ly = dy < 0 ? y0 - n + 1 : y0, vert = !!dy;
      h += `<i class="lb ${vert ? 'v' : 'h'}" style="transform:${tr(lx, ly)};width:${(vert ? 1 : n) * G.cs}px;height:${(vert ? n : 1) * G.cs}px"></i>`;
    }
    bm.innerHTML = h;
  }
  // shutters (shut = bars down; a piece in a shut shutter keeps it jammed open)
  if (P.iSh >= 0) $$('.shut', boardEl()).forEach(e => { const c = +e.dataset.c; e.classList.toggle('closed', !!E.shutNow(P, S, c)); e.classList.toggle('jam', !!E.shutNow(P, S, c) && g[c] > 0); });
  if (P.sw >= 0) { const v = g[P.sw], on = v > 0 && P.pc[v - 1].t !== 'g'; $$('.lsw, .lswmk', boardEl()).forEach(e => e.classList.toggle('on', on)); }
}
// phone: the height of what sits under the board (rule line, tilt pad) is mirrored above it so the board is truly centred
function balance() {
  const pl = $('#play'); if (!pl || pl.hidden) return;
  const hOf = q => { const e = $(q); return e && !e.hidden && e.offsetParent ? e.offsetHeight + 8 : 0; };
  const top = 0, bot = hOf('#tiltPad') + (innerWidth < 760 ? 0 : hOf('#gInfo'));
  pl.style.setProperty('--ihT', Math.max(0, bot - top) + 'px'); pl.style.setProperty('--ihB', Math.max(0, top - bot) + 'px');
}
function relayout() { if (!G || $('#play').hidden) return; balance(); const cs = cellSize(); if (cs !== G.cs) buildBoard(); }
addEventListener('resize', () => { clearTimeout(relayout.t); relayout.t = setTimeout(relayout, 120); });
function boardIn() { const b = boardEl(); b.classList.remove('bin'); void b.offsetWidth; b.classList.add('bin'); }

/* ---------------- HUD ---------------- */
// the play clock stops while a dialog (rule explanation, story…) is open or the tab is hidden: the paused time moves the start time
function setPaused(v) {
  if (!G) return; v = !!v; if (v === !!G.paused) return;
  if (v) G.pz = Date.now(); else if (G.pz) { G.t0 += Date.now() - G.pz; G.pz = 0; }
  G.paused = v;
}
function keepDaily() {
  if (!G || G.kind !== 'daily' || G.over) return; const rr = dlOf(G.date)[G.dk]; if (!rr.p) return;
  rr.p = { S: G.S.slice(), hist: G.hist.map(x => x.slice()), moves: G.moves, undoN: G.undoN, hinted: G.hinted, el: Date.now() - G.t0 }; save();
}
function hud() {
  keepDaily();
  if (!G) return;
  const o = G.rec.o, mv = G.moves;
  // title: a tag in the course / mode colour + the stage (the phone's top band takes the same colour)
  const tg = G.tag; $('#gTitle').innerHTML = tg ? `<span class="ctag">${esc(tg[0])}</span>${tg[1] ? `<span class="cfl">${esc(tg[1])}</span>` : ''}` : esc(G.title || '');
  $('#play').style.setProperty('--band', (tg && tg[2]) || '#2b313c');
  $('#gTitleSub').innerHTML = (G.m && G.m !== 'basic' ? ruleChip(G.m) : '') + (o >= SUPER && G.kind === 'stage' ? `<span class="supc">${esc(t('u.super'))}</span>` : '');
  const st = G.kind === 'stage' || G.kind === 'daily' ? starsFor(Math.max(mv, o), o) : 0;
  // moves / best in one box
  $('#gNS').innerHTML = `<small>${esc(t('g.ns'))}</small><b><span class="${mv > o ? 'over' : ''}">${mv}</span><i>/</i><em>${o}</em></b>`;
  $('#gStars').innerHTML = G.kind === 'stage' || G.kind === 'daily' ? [0, 1, 2].map(i => `<i class="${i < st ? 'on' : ''}">★</i>`).join('') : '';
  const lim = $('#gLim'); lim.hidden = !G.limit;
  if (G.limit) { lim.className = `lim ${mv >= G.limit ? 'hot' : mv >= G.limit - 1 ? 'warm' : ''}`; lim.innerHTML = `<small>${esc(t(G.kind === 'chain' ? 'u.budget' : 'u.limit'))}</small><b>${G.limit - mv}</b>`; }
  const run = G.run, bi = $('#runInfo');
  if (run && G.kind === 'ta') { bi.hidden = false; bi.innerHTML = `<span class="rs"><small>${esc(t('ta.q'))}</small><b>${run.k + 1}<small>/10</small></b></span><span class="tm" id="taTime">${fmtT(run.el)}</span>`; }
  else if (run) { bi.hidden = false; bi.innerHTML = `<span class="rs"><small>${esc(t('u.score'))}</small><b>${fmt(run.score)}</b></span><span><small>${esc(t('u.escaped'))}</small><b>${run.n}</b></span>${G.kind === 'chain' ? `<span class="lives">${[0, 1, 2].map(i => `<i class="${i < run.lives ? 'on' : ''}"></i>`).join('')}</span>${run.combo > 1 ? `<span class="combo">×${(1 + .1 * run.combo).toFixed(1)}</span>` : ''}` : `<span class="tm" id="slTime">${SL_TIME}</span>`}`; }
  else bi.hidden = true;
  const hb = $('#gHint'), left = hintsLeft();
  hb.hidden = G.kind !== 'stage'; hb.disabled = G.over;
  $('#gHintN').innerHTML = left > 0 ? left : A.ICON.coin; $('#gHintN').classList.toggle('buy', left <= 0);
  $('#gUndo').disabled = !G.hist.length || G.over;
  $('#gRestart').disabled = G.over || !G.hist.length;
  $('#gClock').hidden = G.kind !== 'daily';
}
function renderInfo() {
  const m = G.m, el = $('#gInfo');
  const k = G.kind === 'sl' ? 'sl' : G.kind === 'chain' ? 'chain' : G.kind === 'ta' ? 'ta' : m === 'basic' ? 'basic' : m;
  el.innerHTML = `<span class="ii">${A.MI[k] || A.MI.big}</span><span>${esc(t('in.' + k))}</span>${k !== 'basic' ? `<button class="btn sm qbtn" data-rule="${k}">?</button>` : ''}`;
  balance();
}
setInterval(() => { if (G && G.kind === 'daily' && !G.over) { const c = $('#gClock'); if (c) { const el = ((G.paused && G.pz ? G.pz : Date.now()) - G.t0) / 1000; c.innerHTML = `<small>${esc(t('g.time'))}${G.undoN ? ` · ${esc(t('g.undo'))}×${G.undoN}` : ''}</small><b>${mmss(el)}</b>`; } } }, 250);

/* ---------------- input: drag pieces ---------------- */
let D = null;
function onDown(e) {
  if (!G || G.over || G.busy || G.paused) return;
  const crack = e.target.closest('.crack');
  if (crack && crack.classList.contains('can')) { e.preventDefault(); doMove([-1, +crack.dataset.c]); return; }
  const el = e.target.closest('.pc'); if (!el || G.P.tilt) { if (G.P.tilt) tiltStart(e); return; }
  const i = +el.dataset.i, p = G.P.pc[i];
  if (p.t === 'g') { el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope'); SND.bump(); toast(t('tip.guard')); return; }
  e.preventDefault();
  const rg = E.range(G.P, G.S, i); if (!rg) return;
  D = { i, el, x0: e.clientX, y0: e.clientY, rg, axis: p.l > 1 || p.t === 'P' || p.t === 'Q' || p.t === 'b' || p.t === 'o' ? (p.v ? 'v' : 'h') : null, off: 0, id: e.pointerId };
  if (p.l === 1 && (p.t === 'k' || p.t === 'x')) D.axis = null;
  try { el.setPointerCapture(e.pointerId); } catch (er) {}
  el.classList.add('drag'); el.style.transition = 'none'; clearHint(); SND.grab();
}
function lims(axis, d = D) { const r = d.rg, neg = axis === 'h' ? r.l : r.u, pos = axis === 'h' ? r.r : r.d; return [neg ? -neg.n : 0, pos ? pos.n : 0, pos && pos.esc]; }
function onMove(e) {
  if (!D || e.pointerId !== D.id) return;
  const dx = e.clientX - D.x0, dy = e.clientY - D.y0, cs = G.cs;
  if (!D.axis) { if (Math.hypot(dx, dy) < 6) return; D.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'; }
  const [lo, hi] = lims(D.axis), raw = (D.axis === 'h' ? dx : dy) / cs;
  // a little rubber band past the limit
  let off = raw < lo ? lo - Math.min(.18, (lo - raw) * .25) : raw > hi ? hi + Math.min(.18, (raw - hi) * .25) : raw;
  if (raw > hi + .05 || raw < lo - .05) { if (!D.bumped) { D.bumped = 1; SND.bump(); } } else D.bumped = 0;
  D.off = off;
  const x = G.S[2 * D.i], y = G.S[2 * D.i + 1];
  D.el.style.transform = D.axis === 'h' ? tr(x + off, y) : tr(x, y + off);
}
function onUp(e) {
  if (!D || e.pointerId !== D.id) return;
  const d = D; D = null; d.el.classList.remove('drag');
  if (!d.axis) { render(true); return; }
  const [lo, hi] = lims(d.axis, d);
  let k = Math.max(lo, Math.min(hi, Math.round(d.off)));
  if (G.P.ice) k = d.off > .25 ? hi : d.off < -.25 ? lo : 0;
  if (!k) { render(true); return; }
  doMove(d.axis === 'h' ? [d.i, k, 0] : [d.i, 0, k]);
}
// tilt: swipe anywhere on the board, the arrow pad, or the arrow keys
let TS = null;
function tiltStart(e) { TS = { x: e.clientX, y: e.clientY, id: e.pointerId }; }
function tiltEnd(e) {
  if (!TS || e.pointerId !== TS.id) return; const dx = e.clientX - TS.x, dy = e.clientY - TS.y; TS = null;
  if (Math.hypot(dx, dy) < 24) return;
  tilt(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 0 : 1) : (dy < 0 ? 2 : 3));
}
function tilt(d) {
  if (!G || !G.P.tilt || G.over || G.busy || G.paused) return;
  if (!E.tiltState(G.P, G.S, d)) { const b = boardEl(); b.classList.remove('shake' + d); void b.offsetWidth; b.classList.add('shake' + d); SND.bump(); return; }
  const b = boardEl(); b.dataset.tilt = d; setTimeout(() => { delete b.dataset.tilt; }, 260);
  doMove([-2, d]);
}

/* ---------------- moves ---------------- */
function doMove(m) {
  if (!G || G.over) return;
  const ev = {};
  G.hist.push(G.S); G.S = E.apply(G.P, G.S, m, ev); G.moves++; DB.stats.moves++;
  if (m[0] === -1) { SND.dig(); DB.stats.dig++; const c = $(`.crack[data-c="${m[1]}"]`, boardEl()); if (c) { c.classList.add('boom'); } dust(m[1]); }
  else if (m[0] === -2) SND.tilt();
  else SND.slide(Math.abs(m[1] || m[2]));
  if (ev.key != null) { DB.stats.key++; setTimeout(() => { SND.key(); setTimeout(SND.gate, 250); }, 120); toast(t('tip.keyUsed')); }
  if (ev.guards) setTimeout(SND.guard, 140);
  if (ev.lights) { flash('dark'); SND.door(false); toast(t('tip.lights')); shockGuards(); }
  if (ev.vent) { noise(.25, .1, 600); tone(300, .2, 'triangle', .06, 2.2, .05); }
  if (ev.shut) tone(ev.shut && G.S[G.P.iSh] ? 240 : 200, .05, 'square', .025);
  render(true, ev);
  if (ev.esc) { SND.esc(); }
  clearHint(); hud();
  if (E.solved(G.P, G.S)) { G.busy = true; setTimeout(() => { G.busy = false; win(); }, 520); return; }
  if (G.limit && G.moves >= G.limit) { G.busy = true; setTimeout(() => { G.busy = false; overLimit(); }, 300); return; }
  // rule sets with one-way effects can reach a dead end: tell the player
  if (!['basic', 'big', 'silent', 'plate', 'heavy', 'shutter'].includes(G.m)) {
    const S = G.S; setTimeout(() => { if (!G || G.S !== S) return; const r = E.solve(G.P, S, 60000); $('#deadEnd').hidden = !(r.n < 0 && !r.capped); }, 60);
  } else $('#deadEnd').hidden = true;
}
function undo() {
  if (!G || !G.hist.length || G.busy || G.over) return;
  G.S = G.hist.pop(); G.moves--; G.undoN++; $('#deadEnd').hidden = true;
  buildBoard(); hud(); tone(520, .06, 'triangle', .05, .8);
}
function restart() {
  if (!G || G.busy) return;
  if (G.kind === 'sl' || G.kind === 'chain' || G.kind === 'ta') { if (G.over) return; G.S = G.P.s0.slice(); G.hist = []; G.moves = 0; buildBoard(); hud(); return; }
  if (G.over) return;
  G.S = G.P.s0.slice(); G.hist = []; G.moves = 0; G.retried = true; $('#deadEnd').hidden = true; $('#gameMsg').hidden = true;
  buildBoard(); hud(); tone(440, .08, 'triangle', .05, .7);
}
/* ---------------- hint (solver-driven) ---------------- */
function nextMove() {
  const k = E.key(G.S);
  if (G.sol && G.sol.keys.has(k)) return G.sol.ms[G.sol.keys.get(k)];
  const r = E.solve(G.P, G.S, 500000);
  if (!r.path) return null;
  // cache this path as the new solution from here
  const keys = new Map(); let S = G.S; r.path.forEach((m, j) => { keys.set(E.key(S), j); S = E.apply(G.P, S, m); });
  G.sol = { ms: r.path, keys };
  return r.path[0];
}
// 3 free hints per stage (kept per stage, so a retry doesn't refill them); more cost coins
const HINT_FREE = 3, HINT_COST = 30;
const hintsLeft = () => !G || G.kind !== 'stage' ? 0 : Math.max(0, HINT_FREE - ((DB.hu || {})[G.rec.k] || 0));
function hint() {
  if (!G || G.kind !== 'stage' || G.busy || G.over) return;
  if (hintsLeft() <= 0) {
    if (DB.coin < HINT_COST) { SND.bump(); toast(t('h.nocoin', { c: HINT_COST })); return; }
    return ask(t('h.buyq', { c: HINT_COST, n: fmt(DB.coin) }), [[t('h.buy', { c: HINT_COST }), 'org', () => { DB.coin -= HINT_COST; save(); updateCoins(); SND.coin(); showHint(); }], [t('q.cancel')]]);
  }
  showHint(true);
}
function showHint(free) {
  const m = nextMove();
  if (!m) { toast(t('h.none')); $('#deadEnd').hidden = false; return; }
  if (free) { DB.hu = DB.hu || {}; DB.hu[G.rec.k] = (DB.hu[G.rec.k] || 0) + 1; save(); }
  G.hinted = true; DB.stats.hints++; clearHint(); SND.hint(); hud();
  const b = boardEl();
  if (m[0] === -1) { const c = $(`.crack[data-c="${m[1]}"]`, b); if (c) c.classList.add('hint'); return; }
  if (m[0] === -2) { const btn = $(`#tiltPad [data-t="${m[1]}"]`); if (btn) btn.classList.add('hint'); return; }
  const [i, dx, dy] = m, el = G.els[i], p = G.P.pc[i], gh = $('.ghost', b);
  el.classList.add('hint');
  const x = G.S[2 * i] + dx, y = G.S[2 * i + 1] + dy;
  gh.hidden = false; gh.style.width = (p.v ? 1 : p.l) * G.cs + 'px'; gh.style.height = (p.v ? p.l : 1) * G.cs + 'px'; gh.style.transform = tr(x, y);
  gh.dataset.d = dx < 0 ? 'l' : dx > 0 ? 'r' : dy < 0 ? 'u' : 'd';
}
function clearHint() { const b = boardEl(); if (!b) return; $$('.hint', document).forEach(e => e.classList.remove('hint')); const gh = $('.ghost', b); if (gh) gh.hidden = true; }

/* ---------------- endings ---------------- */
function win() {
  if (!G || G.over) return;
  const o = G.rec.o, mv = G.moves, perfect = mv <= o;
  DB.stats.esc++; if (perfect) DB.stats.perfect++;
  if (G.kind === 'sl' || G.kind === 'chain') return runEscape(perfect);
  if (G.kind === 'ta') return taEscape(perfect);
  G.over = true; hud();
  let html = '', coins = 0;
  if (G.kind === 'stage') {
    let stars = starsFor(mv, o); if (G.hinted) stars = 1;
    const key = G.rec.k, old = DB.st[key] || 0;
    const recsB = recsOfList(listOf(G.src));
    if (stars > old) { DB.st[key] = stars; coins = addCoin((stars - old) * 8 + (old ? 0 : 12) + (G.rec.o >= SUPER ? (stars - old) * 4 : 0)); }
    const recsA = recsOfList(listOf(G.src)), jj = G.j, s = (jj / PER) | 0, N = recsA.length;
    const ev = [], secName = k => G.isC ? floorName(G.src, k) : 'BLOCK ' + String.fromCharCode(65 + k);
    if (secMedal(recsA, s) > secMedal(recsB, s)) ev.push(t('ev.medalS', { s: secName(s) }));
    if ((s + 1) * PER < N && !secOpen(recsB, (s + 1) * PER) && secOpen(recsA, (s + 1) * PER)) ev.push(t('ev.unlockS', { s: secName(s + 1) }));
    if (recsA.every(v => v) && !recsB.every(v => v)) ev.push(t('ev.comp'));
    const ti0 = G.ti0 ?? titleIdx(); if (titleIdx() > ti0) ev.push(t('ev.title', { t: t('ti.' + titleIdx()) }));
    const nj = jj + 1, canNext = nj < N && secOpenQ(recsA, nj);
    html = resultCard('ESCAPED!', starRow(stars) + `<p class="rmv">${esc(t('r.moves', { m: mv, o }))}</p><p>${esc(t(G.hinted ? 'r.s0' : stars === 3 ? 'r.s3' : stars === 2 ? 'r.s2' : 'r.s1', { n: o + slack(o) }))}</p>${ev.map(e => `<div class="ev">${esc(e)}</div>`).join('')}${coinLine(coins)}`,
      [['retry', t('r.retry')], canNext ? ['next', t('r.next'), 'org'] : null, ['list', t('u.list')]]);
    [0, 1, 2].forEach(i => i < stars && setTimeout(() => SND.star(i), 500 + i * 180));
    pushTotals();
  } else if (G.kind === 'daily') {
    const D = DIFFS.find(x => x.k === G.dk), rr = dlOf(G.date)[G.dk], md = starsFor(mv, o), sec = (Date.now() - G.t0) / 1000;
    const B = { base: D.base + o * 100, extra: -120 * Math.max(0, mv - o), undo: -30 * G.undoN, time: Math.round(Math.max(0, (o * 6 + 30) * 2 - sec) * 6) };
    const final = Math.max(100, B.base + B.extra + B.undo + B.time), best = final > rr.s;
    delete rr.p; if (best) rr.s = final; rr.md = Math.max(rr.md, md); if (!rr.mv || mv < rr.mv) rr.mv = mv;
    if (md >= 3) DB.stats.dgold++;
    coins = addCoin(final / 60);
    if (best && ON && ON.available && DB.name) ON.putDaily(G.date, G.dk, Object.assign({ s: final }, who())).catch(() => {});
    const row = (l, v, c = '') => `<li class="${c}"><span>${esc(l)}</span><b>${v >= 0 ? '+' : '−'}${fmt(Math.abs(v))}</b></li>`;
    html = resultCard(md === 3 ? 'PERFECT ESCAPE!' : 'ESCAPED!', `<div class="rscore">${fmt(final)}</div><ul class="rbonus"><li><span>${esc(t('db.base'))}</span><b>${fmt(B.base)}</b></li>${row(t('db.extra', { n: mv - o }), B.extra, B.extra ? 'neg' : '')}${G.undoN ? row(t('db.undo', { n: G.undoN }), B.undo, 'neg') : ''}${row(t('db.time', { t: mmss(sec) }), B.time, B.time ? 'pos' : '')}</ul>
      <p class="rmv">${esc(t('r.moves', { m: mv, o }))}</p><div class="rmedal"><i class="medal big m${md}"></i>${esc(t('md.' + md))}</div>${best ? `<div class="ev">${esc(t('r.best'))}</div>` : ''}${coinLine(coins)}${nameNudge()}`,
      [['home', t('u.home'), 'org'], ['rank', t('rk.title')]]);
    [0, 1, 2].forEach(i => i < md && setTimeout(() => SND.star(i), 500 + i * 180));
  }
  save(); if (DB.set.anim) confetti(); showResult(html); updateBadges();
}
function overLimit() {
  if (!G || G.over) return;
  if (G.kind === 'chain') { const run = G.run; run.lives--; run.combo = 0; SND.alarm(); flash('alarm'); toast(t('ch.alarm')); if (run.lives <= 0) return endRun(); hud(); setTimeout(nextRunPuzzle, 700); return; }
  G.over = true; SND.alarm(); flash('alarm'); hud();
  showResult(resultCard('SPOTTED!', `<p>${esc(t('r.spotted', { n: G.limit }))}</p>`, [['retry', t('r.retry'), 'org'], ['undo1', t('g.undo')], ['list', t('u.list')]], 'fail'));
}
function runEscape(perfect) {
  const run = G.run, o = G.rec.o;
  run.n++; if (perfect) run.perf++;
  let pts = 100 + 20 * o + (perfect ? 50 : 0);
  if (G.kind === 'chain') { run.combo++; pts = Math.round((100 + 30 * o + 40 * Math.max(0, G.limit - G.moves)) * (1 + .1 * (run.combo - 1))); }
  G.busy = true; run.score += pts; floatText('+' + fmt(pts) + (perfect ? '  SILENT!' : ''));
  hud(); setTimeout(() => { if (G && !G.over) nextRunPuzzle(); }, 550);
}
function endRun() {
  if (!G || G.over) return;
  G.over = true; cancelAnimationFrame(raf); hud();
  const run = G.run, sc = run.score; let best = false, coins = addCoin(sc / 80);
  if (G.kind === 'sl') {
    DB.stats.slRuns++;
    if (sc > DB.best.sl) { DB.best.sl = sc; best = true; }
    if (run.daily) { const r = dlOf(run.date).sl; if (sc > r.s) { r.s = sc; best = true; } if (ON && ON.available && DB.name) ON.putDaily(run.date, 'sl', Object.assign({ s: sc }, who())).catch(() => {}); }
  } else { DB.stats.chainRuns++; if (sc > DB.best.chain) { DB.best.chain = sc; best = true; } DB.best.chainN = Math.max(DB.best.chainN, run.n); pushTotals(); }
  save();
  const left = run.daily ? DSL_TRIES - dlOf(run.date).sl.a : 1;
  const btns = [left > 0 ? ['again', run.daily ? t('r.againN', { n: left }) : t('r.retry'), 'org'] : null, run.daily ? ['rank', t('rk.title')] : null, ['home', t('u.home')]];
  showResult(resultCard(G.kind === 'sl' ? 'LIGHTS ON!' : 'BUSTED!', `<div class="rscore">${fmt(sc)}</div>${best ? `<div class="ev">${esc(t('r.best'))}</div>` : ''}<div class="rstats"><span><b>${run.n}</b>${esc(t('u.escaped'))}</span><span><b>${run.perf}</b>${esc(t('r.perf'))}</span></div>${coinLine(coins)}${run.daily ? nameNudge() : ''}`, btns));
  if (DB.set.anim && sc > 0) confetti(); updateBadges();
}
// searchlight timer
let raf = 0;
function loop() {
  cancelAnimationFrame(raf);
  const f = () => {
    if (!G || G.kind !== 'sl' || G.over) return;
    if (G.paused) { G.run.tEnd += 16; raf = requestAnimationFrame(f); return; }
    const left = Math.max(0, (G.run.tEnd - performance.now()) / 1000), el = $('#slTime');
    if (el) { el.textContent = Math.ceil(left); el.classList.toggle('hot', left < 10); }
    const bar = $('#slBar'); if (bar) bar.style.width = (left / SL_TIME * 100) + '%';
    if (left < 10 && Math.ceil(left) !== loop.last) { loop.last = Math.ceil(left); SND.tick(); }
    if (left <= 0) { flash('light'); SND.alarm(); return endRun(); }
    raf = requestAnimationFrame(f);
  };
  raf = requestAnimationFrame(f);
}
function countdown(done) {
  G.busy = true; const m = $('#gameMsg'); let n = 3;
  const step = () => { if (!G) return; if (n === 0) { m.hidden = true; G.busy = false; done(); return; } m.hidden = false; m.innerHTML = `<div class="cd">${n}</div>`; SND.tick(); n--; setTimeout(step, 600); };
  step();
}
const STAR_SVG = A.ICON.star;
const starRow = n => `<div class="rstars">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}" style="--i:${i}">${STAR_SVG}</i>`).join('')}</div>`;
const coinLine = n => n ? `<div class="rcoin">${A.ICON.coin}+${fmt(n)}</div>` : '';
const nameNudge = () => (ON && ON.available && !DB.name) ? `<button class="nudge" data-act="name">${esc(t('r.nudge'))}</button>` : '';
function resultCard(head, body, btns, cls = '') {
  return `<div class="result ${cls}"><div class="rbody"><div class="rhead"><b>${esc(head)}</b></div>${body}</div><div class="rbtns">${btns.filter(Boolean).map(([a, l, c]) => `<button class="btn ${c || ''}" data-act="${a}">${esc(l)}</button>`).join('')}</div></div>`;
}
function showResult(html) { const m = $('#gameMsg'); m.innerHTML = html; m.hidden = false; $$('[data-act]', m).forEach(b => { b.onclick = () => resultAct(b.dataset.act); }); centerMsg(); }
// PC: the result card sits on the centre of the board (not of the window, which the side panel shifts)
function centerMsg() {
  const r = $('#gameMsg .result'); if (!r) return; r.style.translate = '';
  if (innerWidth < 1000 || !G || $('#play').hidden) return;
  const b = boardEl().getBoundingClientRect(), c = r.getBoundingClientRect(); if (!b.width) return;
  const dx = (b.left + b.width / 2) - (c.left + c.width / 2), dy = (b.top + b.height / 2) - (c.top + c.height / 2);
  const cx = Math.max(8 - c.left, Math.min(innerWidth - 8 - c.right, dx)), cy = Math.max(8 - c.top, Math.min(innerHeight - 8 - c.bottom, dy));
  r.style.translate = `${Math.round(cx)}px ${Math.round(cy)}px`;
}
addEventListener('resize', () => { if (!$('#gameMsg').hidden) centerMsg(); });
function resultAct(a) {
  const m = $('#gameMsg');
  if (a === 'retry') { if (G.kind === 'stage') { const s = G.src, j = G.j; startStage(s, j); G.retried = true; } return; }
  if (a === 'undo1') { m.hidden = true; G.over = false; G.S = G.hist.pop() || G.S; G.moves--; buildBoard(); hud(); return; }
  if (a === 'next') { const s = G.src; return startStage(s, G.j + 1); }
  if (a === 'list') { listAfter = G.src; return leavePlay(); }
  if (a === 'home') return leavePlay();
  if (a === 'rank') return openRank(G.kind === 'daily' ? G.dk : G.kind === 'ta' ? 'ta' : 'sl');
  if (a === 'name') return openProfile();
  if (a === 'again') { if (G.kind === 'sl') return startSearch(G.run.daily); if (G.kind === 'ta') return startTA(); return startChain(); }
}
// leaving a course / rule-mode stage lands on that course's / mode's stage list ("list" on a result does the same)
function goHome() {
  cancelAnimationFrame(raf);
  if (G && G.kind === 'stage' && !listAfter) listAfter = G.src;
  if (listAfter) { const L = listAfter; listAfter = null; if (courseOf(L)) { homeTab = 'course'; courseOpenId = L; modeOpenId = null; } else { homeTab = 'modes'; modeOpenId = L; courseOpenId = null; } }
  G = null; $('#deadEnd').hidden = true; $('#gameMsg').hidden = true; if (!$('#modal').hidden) { $('#modal').hidden = true; afterModal = null; setPaused(false); }
  showScreen('home'); renderHome(); const pn = $(`.hpanel[data-p="${homeTab}"]`); if (pn) pn.scrollTop = 0;
}
const leavePlay = goHome;
function quitGame() {
  if (G && G.kind === 'ta' && !G.over) return ask(t('q.quit'), [[t('q.keep'), 'org'], [t('q.home'), '', () => { G.over = true; cancelAnimationFrame(raf); leavePlay(); }]]);
  if (G && (G.kind === 'sl' || G.kind === 'chain') && !G.over) return ask(t('q.quit'), [[t('q.keep'), 'org'], [t('q.home'), '', () => { endRun(); leavePlay(); }]]);
  leavePlay();
}
/* ---------------- back swipe / browser back: one step back inside the app ----------------
   While the app is anywhere but its root (デイリー tab, no dialog, no game), one spare history entry is kept.
   Going back pops it: we take one step back (close the dialog → leave the game → close the stage list → デイリー tab)
   and add the entry again if we're still not at the root, so the next back steps again; at the root, back leaves the page. */
const NAV = { skip: false };
const navRoot = () => $('#modal').hidden && !$('#home').hidden && !courseOpenId && !modeOpenId && homeTab === 'daily';
function navSync() {
  if (NAV.skip) return;
  const trap = !!(history.state && history.state.jb);
  // push only right after a tap / key: an entry added without user activation is skipped by the browser's back (iOS / Chrome)
  const act = !navigator.userActivation || navigator.userActivation.isActive;
  if (!navRoot() && !trap && act) { try { history.pushState({ jb: 1 }, ''); } catch (e) {} }
  else if (navRoot() && trap) { NAV.skip = true; history.back(); }   // closed with ✕ / a button: drop the spare entry (its popstate is ignored)
}
function navBack() {
  if (!$('#modal').hidden) { if (!$('#home').hidden) afterModal = null; closeModal(); return; }
  if (!$('#play').hidden) { if (G) quitGame(); else goHome(); return; }
  if (courseOpenId || modeOpenId) { closeList(); return; }
  if (homeTab !== 'daily') { setHomeTab('daily'); return; }
}
addEventListener('popstate', () => {
  if (NAV.skip) { NAV.skip = false; return; }
  navBack(); setTimeout(navSync, 0);
});
document.addEventListener('click', () => setTimeout(navSync, 0), true);
document.addEventListener('pointerup', () => setTimeout(navSync, 0), true);
document.addEventListener('keydown', () => setTimeout(navSync, 0), true);
// a sideways swipe on the home screen (tablets / touch PCs, where there is no tab bar) = one step back
(function homeSwipe() {
  let T = null;
  addEventListener('touchstart', e => { if ($('#home').hidden || !$('#modal').hidden || e.touches.length > 1 || PHONE.matches) { T = null; return; } const p = e.touches[0]; T = { x: p.clientX, y: p.clientY, t: Date.now() }; }, { passive: true });
  addEventListener('touchend', e => {
    if (!T) return; const p = e.changedTouches[0], dx = p.clientX - T.x, dy = p.clientY - T.y, dt = Date.now() - T.t; T = null;
    if (dt > 700 || Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * .6) return;
    if ((document.documentElement.dir === 'rtl') ? dx < 0 : dx > 0) navBack();
  }, { passive: true });
})();

/* ---------------- effects ---------------- */
// lights out: every guard jumps with a startled face for a moment
function shockGuards() {
  const els = (G.els || []).filter((el, i) => G.P.pc[i].t === 'g');
  setTimeout(() => { els.forEach(el => { el.classList.remove('shock'); void el.offsetWidth; el.classList.add('shock'); }); tone(880, .12, 'square', .05, 1.6); }, 260);
  clearTimeout(shockGuards.t); shockGuards.t = setTimeout(() => els.forEach(el => el.classList.remove('shock')), 1900);
}
function flash(kind) { const f = document.createElement('div'); f.className = 'flash ' + kind; document.body.appendChild(f); setTimeout(() => f.remove(), 900); }
function floatText(s) { const b = boardEl(), d = document.createElement('div'); d.className = 'ftext'; d.textContent = s; b.appendChild(d); setTimeout(() => d.remove(), 1100); }
function dust(c) {
  const b = boardEl(), P = G.P, x = (c % P.w + .5) * G.cs, y = (((c / P.w) | 0) + .5) * G.cs;
  for (let k = 0; k < 10; k++) { const d = document.createElement('i'); d.className = 'dust'; d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.setProperty('--dx', (Math.random() - .5) * G.cs * 1.6 + 'px'); d.style.setProperty('--dy', (Math.random() - .5) * G.cs * 1.6 + 'px'); b.appendChild(d); setTimeout(() => d.remove(), 700); }
}
function confetti() {
  const cv = $('#fx'), ctx = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
  const cols = ['#f26b1d', '#ffcd3c', '#1fa463', '#3d8fd1', '#fff'], P = [];
  for (let i = 0; i < 110; i++) P.push({ x: innerWidth * (.2 + Math.random() * .6), y: innerHeight * .55, vx: (Math.random() - .5) * 14, vy: -8 - Math.random() * 12, w: 6 + Math.random() * 8, c: cols[(Math.random() * cols.length) | 0], a: Math.random() * 6 });
  const t0 = performance.now();
  (function f(now) {
    ctx.clearRect(0, 0, cv.width, cv.height); let live = 0;
    for (const p of P) { p.vy += .42; p.x += p.vx; p.y += p.vy; p.a += .12; if (p.y < cv.height + 20) live++; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 1.5; ctx.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); ctx.strokeRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); ctx.restore(); }
    if (live && now - t0 < 4500) requestAnimationFrame(f); else ctx.clearRect(0, 0, cv.width, cv.height);
  })(t0);
}
function toast(s) {
  const e = $('#toast'); e.style.fontSize = '';
  // up to two lines, broken only between words / after punctuation (never inside a word or phrase); shrink when that is not enough
  e.innerHTML = String(s).split(/(\s+)/).map(w => /^\s+$/.test(w) ? ' ' : w.split(/(?<=[、。！？])/).filter(Boolean).map(p => `<span class="tw">${esc(p)}</span>`).join('')).join('');
  const over = () => { const c = getComputedStyle(e); return e.offsetHeight - 20 > (parseFloat(c.lineHeight) || 20) * 2.2 || e.scrollWidth > e.clientWidth + 1; };
  for (let k = 0; k < 8 && over(); k++) e.style.fontSize = (parseFloat(getComputedStyle(e).fontSize) * .92) + 'px';
  e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2200); }
function floatTip(s) { const e = $('#gInfo'); if (e) { e.classList.remove('pulse'); void e.offsetWidth; e.classList.add('pulse'); } toast(s); }

/* ============================================================ MODALS ============================================================ */
function modal(html, cls = '') {
  { const ls = $('#langSel'), lh = $('#langHold'); if (ls && lh && ls.parentNode !== lh) lh.append(ls); }   // the picker lives in settings; park it before the body is replaced
  afterModal = null; const m = $('#modal'); m.className = 'modal ' + cls; $('#modalBody').innerHTML = html; m.hidden = false; $('#modalBody').scrollTop = 0; setPaused(true); setTimeout(navSync, 0);
  centerOnBoard();
  return $('#modalBody');
}
// during play, dialogs sit over the middle of the board (kept inside the window)
function centerOnBoard() {
  const box = $('#modal .mbox'); box.style.translate = '';
  if (!G || $('#play').hidden) return;
  const b = boardEl().getBoundingClientRect(), r = box.getBoundingClientRect();
  if (!b.width) return;
  const dx = (b.left + b.width / 2) - (r.left + r.width / 2), dy = (b.top + b.height / 2) - (r.top + r.height / 2);
  const cx = Math.max(8 - r.left, Math.min(innerWidth - 8 - r.right, dx)), cy = Math.max(8 - r.top, Math.min(innerHeight - 8 - r.bottom, dy));
  box.style.translate = `${Math.round(cx)}px ${Math.round(cy)}px`;
}
function closeModal() { $('#modal .mbox').style.translate = ''; $('#modal').hidden = true; setPaused(false); const f = afterModal; afterModal = null; if (!$('#home').hidden) renderHome(); if (f) f(); }
function ask(msg, btns) {
  const body = modal(`<div class="askb">${A.inmateSVG(DB.icon)}<p>${esc(msg)}</p><div class="mbtns">${btns.map(([l, c], i) => `<button class="btn big ${c || ''}" data-i="${i}">${esc(l)}</button>`).join('')}</div></div>`, 'mask');
  $$('[data-i]', body).forEach(b => { b.onclick = () => { $('#modal').hidden = true; setPaused(false); const f = btns[+b.dataset.i][2]; f && f(); }; });
}
// rule explanations (with a small example board)
const RULE_EX = {
  basic: { g: '..B...' + '..B...' + 'AAB...' + '...CC.' + '......' + '......' },
  sl: { g: '.B....' + '.B.C..' + 'AA.C..' + '......' + '......' + '......' },
  chain: { g: '...B..' + '...B..' + 'AA.B..' + '......' + '......' + '......' },
  silent: { g: '...B..' + '...B..' + 'AA.B..' + 'CC....' + '......' + '......' },
  key: { g: '......' + '.k....' + 'AA....' + '......' + '....#.' + '......', r: 'key', lk: 27, gt: [17] },
  plate: { g: '......' + '......' + 'AA....' + '...B..' + '...B..' + '......', r: 'plate', pl: 33, dr: [17] },
  oneway: { g: '....B.' + '....B.' + 'AA..B.' + '......' + '......' + '......', r: 'oneway', ow: { B: 1 } },
  ice: { g: '......' + '..#...' + 'AA....' + '......' + '...B..' + '...B..', r: 'ice' },
  patrol: { g: '......' + '....Y.' + 'AA....' + '......' + '......' + '......', r: 'patrol', gd: { Y: 1 } },
  twin: { g: '...Z..' + '...Z..' + 'AA....' + '......' + '......' + '......', r: 'twin' },
  dig: { g: '......' + '...#..' + '...AA%' + '...#..' + '......' + '......', r: 'dig' },
  tilt: { g: '......' + '....x.' + 'AA....' + '..#...' + '......' + '..x...', r: 'tilt' },
  big: { w: 8, h: 8, g: '........' + '..B.....' + '..B.....' + 'AAB.....' + '...CCC..' + '........' + '........' + '........' },
  laser: { g: '....#.' + 'CC....' + 'AA....' + '......' + '......' + '......', r: 'laser', lz: [[4, 3]] },
  heavy: { g: '......' + '...B..' + 'AA.B..' + '......' + '......' + '......', r: 'heavy', hv: { B: 1 } },
  shutter: { g: '......' + '......' + 'AA....' + '......' + '......' + '......', r: 'shutter', sr: [15], sb: [16] },
  lights: { g: '......' + '....Y.' + 'AA....' + '......' + 'B.....' + 'B.....', r: 'lights', gd: { Y: 1 }, sw: 18 },
  vent: { g: '......' + '......' + 'AA.x..' + '......' + '......' + '......', r: 'vent', vt: [9, 33] },
  ta: { g: '..B...' + '..B...' + 'AAB...' + '...CC.' + '......' + '......' },
};
function maybeRuleTip(m, force, then) {
  if (!force && DB.tut['r_' + m]) { if (then) then(); return false; } DB.tut['r_' + m] = 1; save();
  const ex = RULE_EX[m] || RULE_EX.basic, P = E.decode(Object.assign({ w: 6, h: 6 }, ex));
  modal(`<div class="tut"><div class="ttl"><span class="ttag">${A.MI[m] || ''}<b>${esc(t('mo.' + m))}</b></span></div><div class="tpanel"><div class="tmas">${A.inmateSVG(DB.icon)}</div><div class="balloon"><p>${esc(t('mo.' + m + '.r'))}</p></div></div><div class="tdemo">${A.miniBoard(P, P.s0, 'mini big')}<p class="note">${esc(t('ex.' + m))}</p></div><div class="mbtns"><button class="btn big org" id="tOk">OK!</button></div></div>`, 'mtut');
  afterModal = then || null;
  $('#tOk').onclick = closeModal;
  return true;
}
// the rules button: how to play + every rule with its explanation
function openRules() {
  const rs = ['basic', ...SMODES, 'sl', 'chain', 'ta'];
  const body = modal(`<h2 class="mh">${esc(t('u.rules'))}</h2><p class="note">${esc(t('ru.d'))}</p><div class="rugrid">${rs.map(m => `<button class="rucard" data-ru="${m}" style="--mc:${MODE_COL[m] || '#555c6a'}"><span class="mic">${A.MI[m] || A.MI.big}</span><span class="mt"><b>${esc(t('mo.' + m))}</b><small>${esc(t('in.' + m))}</small></span></button>`).join('')}</div>`, 'mwide');
  $$('[data-ru]', body).forEach(b => { b.onclick = () => { const m = b.dataset.ru; if (m === 'basic') tutorial(); else { maybeRuleTip(m, true); afterModal = openRules; } }; });
}
// first visit: how to play (3 pages)
function tutorial() {
  let k = 0; const pages = ['tu.1', 'tu.2', 'tu.3', 'tu.4'];
  const EX = [RULE_EX.basic, { g: '......' + '......' + '....AA' + '......' + '......' + '......' }, RULE_EX.silent, RULE_EX.key];
  const draw = () => {
    const P = E.decode(Object.assign({ w: 6, h: 6 }, EX[k]));
    const body = modal(`<div class="tut"><div class="ttl"><span class="ttag"><b>${esc(t('help'))}</b></span><span class="tsub">${k + 1} / ${pages.length}</span></div><div class="tpanel"><div class="tmas">${A.inmateSVG(DB.icon)}</div><div class="balloon"><b>${esc(t(pages[k] + '.h'))}</b><p>${esc(t(pages[k]))}</p></div></div><div class="tdemo">${A.miniBoard(P, P.s0, 'mini big')}</div>
      <div class="mbtns"><button class="btn big" id="tPrev" ${k ? '' : 'disabled'}>${esc(t('u.prev'))}</button><button class="btn big org" id="tNext">${esc(t(k < pages.length - 1 ? 'u.next' : 'u.start'))}</button></div></div>`, 'mtut');
    $('#tPrev', body).onclick = () => { if (k) { k--; draw(); } };
    $('#tNext', body).onclick = () => { if (k < pages.length - 1) { k++; draw(); } else closeModal(); };
  };
  draw();
}
// character lists (profile icons, collection): rarity filter + sort, remembered per viewer
const SORTS = ['no', 'rar', 'rarA'];
function sortList(items, rarOf, idOf) {
  const m = DB.set.csort || 'no', f = DB.set.cflt ?? -1;
  const a = items.filter(x => f < 0 || rarOf(x) === f);
  return a.sort((x, y) => m === 'rar' ? rarOf(y) - rarOf(x) || idOf(x) - idOf(y) : m === 'rarA' ? rarOf(x) - rarOf(y) || idOf(x) - idOf(y) : idOf(x) - idOf(y));
}
function sortBar() {
  const m = DB.set.csort || 'no', f = DB.set.cflt ?? -1;
  return `<div class="sortbar"><div class="sgrp"><span>${esc(t('so.r'))}</span>${[-1, 0, 1, 2, 3].map(r => `<button class="rf r${r} ${r === f ? 'on' : ''}" data-cf="${r}">${r < 0 ? esc(t('so.all')) : A.RAR[r]}</button>`).join('')}</div>
    <div class="sgrp"><span>${esc(t('so.label'))}</span>${SORTS.map(k => `<button class="${k === m ? 'on' : ''}" data-cs="${k}">${esc(t('so.' + k))}</button>`).join('')}</div></div>`;
}
// re-render a dialog without losing its scroll position
function keepScroll(fn) { const y = $('#modalBody').scrollTop; fn(); $('#modalBody').scrollTop = y; }
function bindSort(body, again) {
  $$('[data-cs]', body).forEach(b => { b.onclick = () => { DB.set.csort = b.dataset.cs; save(); keepScroll(again); }; });
  $$('[data-cf]', body).forEach(b => { b.onclick = () => { DB.set.cflt = +b.dataset.cf; save(); keepScroll(again); }; });
}
function openProfile() {
  const pend = openProfile.p || (openProfile.p = { icon: DB.icon, skin: DB.skin, frame: DB.frame, name: DB.name });
  const owned = sortList(Object.keys(DB.own).map(Number), id => A.INMATES[id].rar, id => id);
  const body = modal(`<h2 class="mh">${esc(t('pf.edit'))}</h2><div class="pfhead"><div class="pic big">${picHTML(pend.icon)}</div><div class="pfn"><label class="fld"><span>${esc(t('pf.name'))}</span><input id="pfName" maxlength="12" value="${esc(pend.name)}" placeholder="${esc(t('pf.ph'))}"></label><p class="note">${esc(t('pf.note'))}</p></div></div>
    <h3 class="mh3">${esc(t('pf.icon'))} <small>${Object.keys(DB.own).length}/${A.INMATES.length}</small></h3>${sortBar()}<div class="cgrid">${owned.map(id => `<button class="cc r${A.INMATES[id].rar} ${id === pend.icon ? 'on' : ''}" data-ic="${id}">${A.inmateSVG(id)}<i class="rr">${A.RAR[A.INMATES[id].rar]}</i></button>`).join('') || `<p class="note">${esc(t('so.none'))}</p>`}</div>
    <h3 class="mh3">${esc(t('pf.skin'))}</h3><div class="skgrid">${SK.FLOORS.filter(s => DB.skinOwn.includes(s.id)).map(s => `<button class="skb ${s.id === pend.skin ? 'on' : ''}" data-sk="${s.id}"><span class="skp" data-skin="${s.id}"></span><b>${esc(skinName(s.id))}</b></button>`).join('')}</div>
    <h3 class="mh3">${esc(t('pf.frame'))}</h3><div class="skgrid">${SK.FRAMES.filter(s => DB.frameOwn.includes(s.id)).map(s => `<button class="skb ${s.id === pend.frame ? 'on' : ''}" data-fr="${s.id}"><span class="frp" data-frame="${s.id}"></span><b>${esc(frameName(s.id))}</b></button>`).join('')}</div>
    <div class="mbtns"><button class="btn big org" id="pfSave">${esc(t('u.save'))}</button></div>`, 'mwide');
  const keep = () => { pend.name = $('#pfName').value; };
  $$('[data-ic]', body).forEach(b => { b.onclick = () => { keep(); pend.icon = +b.dataset.ic; keepScroll(openProfile); }; });
  bindSort(body, () => { keep(); openProfile(); });
  $$('[data-sk]', body).forEach(b => { b.onclick = () => { keep(); pend.skin = b.dataset.sk; keepScroll(openProfile); }; });
  $$('[data-fr]', body).forEach(b => { b.onclick = () => { keep(); pend.frame = b.dataset.fr; keepScroll(openProfile); }; });
  $('#pfSave').onclick = () => { DB.name = $('#pfName').value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12); DB.icon = pend.icon; DB.skin = pend.skin; DB.frame = pend.frame; openProfile.p = null; save(); applySkin(); pushTotals(); closeModal(); };
  $('#modalX').addEventListener('click', () => { openProfile.p = null; }, { once: true });
}
function openAch() {
  const rows = ACH.map(([id, f, rw]) => { const [v, g] = f(DB.stats), done = v >= g, got = DB.ach[id];
    return `<div class="ach ${got ? 'got' : done ? 'ready' : ''}"><span class="ai">${got ? '★' : done ? '!' : ''}</span><span class="at"><b>${esc(id.startsWith('m_') ? t('ach.mode', { m: t('mo.' + id.slice(2)) }) : t('ach.' + id))}</b><span class="bar"><i style="width:${Math.min(100, v / g * 100)}%"></i></span><small>${fmt(Math.min(v, g))} / ${fmt(g)}</small></span>
      ${got ? `<span class="ag">${esc(t('ach.got'))}</span>` : `<button class="btn sm ${done ? 'org' : ''}" data-ach="${id}" ${done ? '' : 'disabled'}>${A.ICON.coin}${rw}</button>`}</div>`; }).join('');
  const ti = titleIdx();
  const body = modal(`<h2 class="mh">${esc(t('ach.title'))}</h2><p class="note">${esc(t('ach.d'))}</p>
    <div class="titles">${TITLES.map((v, i) => `<span class="tl ${i <= ti ? 'got' : ''} ${i === ti ? 'cur' : ''}"><b>${esc(t('ti.' + i))}</b><small>★${v}</small></span>`).join('')}</div><div class="alist">${rows}</div>`, 'mwide');
  $$('[data-ach]', body).forEach(b => { b.onclick = () => { const a = ACH.find(x => x[0] === b.dataset.ach); DB.ach[a[0]] = 1; addCoin(a[2]); SND.coin(); save(); openAch(); updateBadges(); }; });
}
// --- gacha: the "Lucky Locker" (inmates + floor skins)
const RATE = [[3, .03], [2, .12], [1, .30], [0, .55]], G_COST = 200, G_COST10 = 1800, REFUND = [10, 25, 60, 150];
// the locker holds inmates, floor designs and board frames (inmates come up about twice as often as the designs)
const GPOOL = [[], [], [], []];
A.INMATES.forEach(c => { GPOOL[c.rar].push({ t: 'c', id: c.id }); GPOOL[c.rar].push({ t: 'c', id: c.id }); });
SK.FLOORS.forEach(s => { if (s.id !== 'concrete') GPOOL[s.rar].push({ t: 's', id: s.id }); });
SK.FRAMES.forEach(s => { if (s.id !== 'steel') GPOOL[s.rar].push({ t: 'f', id: s.id }); });
const floorOf = id => SK.FLOORS.find(s => s.id === id), frameOf = id => SK.FRAMES.find(s => s.id === id);
const itemRar = it => it.t === 'c' ? A.INMATES[it.id].rar : it.t === 's' ? floorOf(it.id).rar : frameOf(it.id).rar;
const hasItem = it => it.t === 'c' ? !!DB.own[it.id] : it.t === 's' ? DB.skinOwn.includes(it.id) : DB.frameOwn.includes(it.id);
const skinName = id => { const k = 'sk.' + id, v = t(k); return v !== k ? v : SK.nameOf(floorOf(id), lang); };
const frameName = id => SK.nameOf(frameOf(id), lang);
const itemName = it => it.t === 'c' ? t('in.n', { n: it.id + 1 }) : it.t === 's' ? skinName(it.id) : frameName(it.id);
const itemSVG = it => it.t === 'c' ? A.inmateSVG(it.id) : it.t === 's' ? `<span class="skp" data-skin="${it.id}"></span>` : `<span class="frp" data-frame="${it.id}"></span>`;
function rollOne(g) { let r = Math.random(), rar = 0; for (const [k, p] of RATE) { if (r < p) { rar = k; break; } r -= p; } if (g && rar < 2) rar = 2; const pool = GPOOL[rar]; return pool[(Math.random() * pool.length) | 0]; }
function openGacha(into) {
  // phones: the locker is a tab of its own (the profile link goes there too)
  if (!into && PHONE.matches && !$('#home').hidden) { if (!$('#modal').hidden) { $('#modal').hidden = true; setPaused(false); } return setHomeTab('gacha'); }
  const html = `<h2 class="mh">${esc(t('ga.title'))}</h2><div class="gmach"><div class="glock">${'<i></i>'.repeat(6)}<b>LUCKY LOCKER</b></div><div class="gcoin">${A.ICON.coin}<b class="coinv">${fmt(DB.coin)}</b></div>
    <div class="gbtns"><button class="btn big org" id="g1" ${DB.coin < G_COST ? 'disabled' : ''}>${esc(t('ga.one'))}<small>${A.ICON.coin}${G_COST}</small></button><button class="btn big blue" id="g10" ${DB.coin < G_COST10 ? 'disabled' : ''}>${esc(t('ga.ten'))}<small>${A.ICON.coin}${fmt(G_COST10)}</small></button></div>
    <p class="note">${esc(t('ga.rate'))}</p><p class="note">${esc(t('ga.dup', { a: REFUND[0], b: REFUND[1], c: REFUND[2], d: REFUND[3] }))}</p></div><div id="gaRes"></div>`;
  if (into) into.innerHTML = html; else modal(html, 'mwide');
  $('#g1').onclick = () => pull(1); $('#g10').onclick = () => pull(10);
}
function pull(n) {
  const cost = n === 10 ? G_COST10 : G_COST; if (DB.coin < cost) return;
  DB.coin -= cost; DB.stats.gacha += n;
  const items = []; let refund = 0;
  for (let i = 0; i < n; i++) { const it = rollOne(n === 10 && i === 9), dup = hasItem(it); if (dup) refund += REFUND[itemRar(it)]; else if (it.t === 'c') DB.own[it.id] = 1; else if (it.t === 's') DB.skinOwn.push(it.id); else DB.frameOwn.push(it.id); items.push(Object.assign({ dup }, it)); }
  DB.coin += refund; save(); updateCoins();
  const best = Math.max(...items.map(itemRar));
  $('#gaRes').innerHTML = `<div class="gres r${best}"><div class="gitems n${n}">${items.map((it, i) => `<div class="gi r${itemRar(it)}" style="--i:${i}">${itemSVG(it)}<span class="gk">${esc(itemName(it))}</span><span class="rr">${A.RAR[itemRar(it)]}</span>${it.dup ? `<span class="dup">+${REFUND[itemRar(it)]}</span>` : '<span class="new">NEW</span>'}</div>`).join('')}</div>${refund ? `<p class="note">${esc(t('ga.refund', { n: refund }))}</p>` : ''}</div>`;
  SND.esc(); if (best >= 2) setTimeout(confetti, 300);
  $('#g1').disabled = DB.coin < G_COST; $('#g10').disabled = DB.coin < G_COST10;
}
function openBook(tab = 'c') {
  const own = { c: id => !!DB.own[id], s: id => DB.skinOwn.includes(id), f: id => DB.frameOwn.includes(id) };
  const cells = tab === 'c' ? sortList(A.INMATES.slice(), c => c.rar, c => c.id).map(c => `<div class="bkc ${DB.own[c.id] ? '' : 'no'} r${c.rar}">${DB.own[c.id] ? A.inmateSVG(c.id) : '<span>?</span>'}<i>${A.RAR[c.rar]}</i><small>No.${String(c.id + 1).padStart(3, '0')}</small></div>`)
    : sortList((tab === 's' ? SK.FLOORS : SK.FRAMES).map((s, i) => Object.assign({ i }, s)), s => s.rar, s => s.i).map(s => { const has = own[tab](s.id), it = { t: tab, id: s.id };
      return `<div class="bkc sk ${has ? '' : 'no'} r${s.rar}">${has ? itemSVG(it) : '<span>?</span>'}<i>${A.RAR[s.rar]}</i><small>${has ? esc(itemName(it)) : '???'}</small></div>`; });
  const nC = Object.keys(DB.own).length, nS = DB.skinOwn.length, nF = DB.frameOwn.length, tot = A.INMATES.length + SK.FLOORS.length + SK.FRAMES.length;
  const body = modal(`<h2 class="mh">${esc(t('bk.title'))}</h2><p class="note">${esc(t('bk.d', { n: nC + nS + nF, m: tot }))}</p>
    <div class="mtabs"><button class="${tab === 'c' ? 'on' : ''}" data-bt="c">${esc(t('bk.c'))} <small>${nC}/${A.INMATES.length}</small></button><button class="${tab === 's' ? 'on' : ''}" data-bt="s">${esc(t('bk.s'))} <small>${nS}/${SK.FLOORS.length}</small></button><button class="${tab === 'f' ? 'on' : ''}" data-bt="f">${esc(t('bk.f'))} <small>${nF}/${SK.FRAMES.length}</small></button></div>${sortBar()}<div class="bkgrid ${tab}">${cells.join('') || `<p class="note">${esc(t('so.none'))}</p>`}</div>`, 'mwide');
  $$('[data-bt]', body).forEach(b => { b.onclick = () => openBook(b.dataset.bt); });
  bindSort(body, () => openBook(tab));
}
// --- rankings
async function openRank(tab = 'm') {
  const tabs = [['e', 'dl.e'], ['m', 'dl.m'], ['h', 'dl.h'], ['sl', 'd.sl'], ['ta', 'mo.ta'], ['chain', 'mo.chain'], ['stars', 'rk.stars']];
  const body = modal(`<h2 class="mh">${esc(t('rk.title'))}</h2><div class="mtabs rtabs">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-tab="${k}">${esc(t(l))}</button>`).join('')}</div><p class="note rkn">${esc(t(['e', 'm', 'h', 'sl', 'ta'].includes(tab) ? 'rk.today' : 'rk.all', { d: today() }))}</p><div id="rkBody"><div class="loading">${esc(t('rk.load'))}</div></div>`, 'mrank mwide');
  $$('[data-tab]', body).forEach(b => { b.onclick = () => openRank(b.dataset.tab); });
  const el = $('#rkBody');
  if (!ON || !ON.available) { el.innerHTML = `<div class="soon">${A.MI.sl}<p>${esc(t('rk.off'))}</p></div>`; return; }
  const path = ['e', 'm', 'h', 'sl', 'ta'].includes(tab) ? `jb/d/${today()}/${tab}` : 'jb/' + tab;
  try {
    const [list, me] = await Promise.all([ON.top(path, 50), ON.mine(path)]);
    if (!el.isConnected) return;
    el.innerHTML = (DB.name ? '' : `<button class="nudge" id="rkName">${esc(t('r.nudge'))}</button>`) +
      (list.length ? `<ol class="rlist">${list.map((r, i) => `<li class="${r.uid === ON.uid ? 'me' : ''} p${i + 1}"><b class="rn">${i + 1}</b><span class="ri">${A.inmateSVG((r.i | 0) % A.INMATES.length)}</span><span class="rnm">${esc(r.n)}</span><b class="rs">${tab === 'ta' ? fmtT((200000 - r.s) * 100) : fmt(r.s)}</b></li>`).join('')}</ol>` : `<p class="note">${esc(t('rk.empty'))}</p>`) +
      (me && me.rank > 50 ? `<div class="rme">${esc(t('rk.me', { r: me.rank, s: tab === 'ta' ? fmtT((200000 - me.me.s) * 100) : fmt(me.me.s) }))}</div>` : '');
    const nb = $('#rkName'); if (nb) nb.onclick = () => openProfile();
  } catch (e) { el.innerHTML = `<p class="note">${esc(t('rk.err'))}</p>`; }
}
function openSettings() {
  const sw = (k, l) => `<label class="sw"><span>${esc(t(l))}</span><input type="checkbox" data-k="${k}" ${DB.set[k] ? 'checked' : ''}><i></i></label>`;
  const body = modal(`<h2 class="mh">${esc(t('set.title'))}</h2>${sw('snd', 'set.snd')}<div class="sw lrow"><span>${esc(t('set.lang'))}</span><span id="langSlot"></span></div>${sw('anim', 'set.anim')}
    <div class="mbtns"><button class="btn" id="setTut">${esc(t('help'))}</button><button class="btn" id="setReset">${esc(t('set.reset'))}</button></div>`);
  { const slot = $('#langSlot'), ls = $('#langSel'); if (slot && ls) { ls.value = lang; slot.append(ls); } }
  $$('[data-k]', body).forEach(c => { c.onchange = () => { DB.set[c.dataset.k] = c.checked ? 1 : 0; if (c.dataset.k === 'snd') { try { localStorage.setItem('atlas-sfx', c.checked ? '1' : '0'); } catch (e) {} if (c.checked) SND.coin(); } save(); }; });
  $('#setTut').onclick = () => tutorial();
  $('#setReset').onclick = () => ask(t('set.reset.q'), [[t('q.cancel'), 'org'], [t('set.reset'), '', () => { localStorage.removeItem(KEY); location.reload(); }]]);
}
function applySkin() {
  document.body.dataset.floor = floorOf(DB.skin) && DB.skinOwn.includes(DB.skin) ? DB.skin : 'concrete';
  document.body.dataset.frame = frameOf(DB.frame) && DB.frameOwn.includes(DB.frame) ? DB.frame : 'steel';
}
// login bonus: 30 coins a day, 150 on every 7th day in a row
function loginBonus() {
  const d = today(); if (DB.login === d) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  DB.lbs = DB.login === ymd(y) ? (DB.lbs || 0) + 1 : 1; DB.login = d; DB.stats.days++;
  const n = DB.lbs % 7 === 0 ? 150 : 30; addCoin(n); save();
  setTimeout(() => toast(t('lb.msg', { n, d: DB.lbs })), 900);
}

/* ---------------- boot ---------------- */
function bind() {
  $('#htabs').innerHTML = [['daily', 'ht.daily', A.ICON.daily], ['course', 'ht.course', A.ICON.course], ['modes', 'ht.modes', A.ICON.modes]].map(([p, k, ic]) => `<button data-p="${p}">${ic}<span data-i18n="${k}">${esc(t(k))}</span></button>`).join('');
  $$('#htabs button').forEach(b => { b.onclick = () => setHomeTab(b.dataset.p); });
  $('#bnav').setAttribute('role', 'tablist');
  $('#bnav').innerHTML = BNAV.map(([p, k, ic]) => `<button type="button" role="tab" data-p="${p}"><span class="bni">${ic === 'user' ? UICON : A.ICON[ic]}${p === 'me' ? '<i class="dot"></i>' : ''}</span><span class="bnl" data-i18n="${k}">${esc(t(k))}</span></button>`).join('');
  $$('#bnav button').forEach(b => { b.onclick = () => setHomeTab(b.dataset.p); });
  // header: only settings / language / home (sound and how-to-play → settings; locker, collection, achievements, rankings, rules → profile card / tabs)
  const IC = { btnHelp: 'help', btnSet: 'gear', homeLink: 'home', gBack: 'back', gUndo: 'undo', gHint: 'hint', gRestart: 'retry' };
  for (const [id, k] of Object.entries(IC)) { const e = $('#' + id); if (e) e.insertAdjacentHTML('afterbegin', A.ICON[k]); }
  $('#btnSet').onclick = openSettings;
  $('#btnHelp').onclick = () => tutorial();
  const ls = $('#langSel'); ls.value = lang; ls.onchange = () => { lang = ls.value; DB.set.lang = lang; save(); applyI18n(); if (G) { hud(); renderInfo(); } else renderHome(); };
  $('#logo').onclick = () => { if (!$('#play').hidden) quitGame(); else setHomeTab('daily'); };
  $('#modalX').onclick = closeModal; $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  $('#gBack').onclick = quitGame; $('#gUndo').onclick = undo; $('#gHint').onclick = hint; $('#gRestart').onclick = restart;
  $('#deadEnd').onclick = undo;
  const bw = $('#boardWrap');
  bw.addEventListener('pointerdown', e => { if (e.target.closest('.result,.cd')) return; if (e.target.closest('#board')) onDown(e); });
  addEventListener('pointermove', onMove, { passive: false }); addEventListener('pointerup', e => { onUp(e); tiltEnd(e); }); addEventListener('pointercancel', e => { if (D && e.pointerId === D.id) { D.el.classList.remove('drag'); D = null; render(true); } TS = null; });
  $$('#tiltPad [data-t]').forEach(b => { b.innerHTML = A.ICON[['arrowL', 'arrowR', 'arrowU', 'arrowD'][+b.dataset.t]]; b.onclick = () => tilt(+b.dataset.t); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    if (!$('#play').hidden && G && $('#modal').hidden) {
      if ((e.key === 'z' && (e.ctrlKey || e.metaKey)) || e.key === 'Backspace') { e.preventDefault(); undo(); }
      if (e.key === 'h' && !e.ctrlKey && !e.metaKey) hint();
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) restart();
      const ak = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3 }[e.key]; if (ak != null && G.P.tilt) { e.preventDefault(); tilt(ak); }
    }
  });
  document.addEventListener('visibilitychange', () => { setPaused(document.hidden || !$('#modal').hidden); });
}
async function boot() {
  bind(); applyI18n(); applySkin();
  try { [ST, DL] = await Promise.all([fetch('stages.json?v=4').then(r => r.json()), fetch('daily.json?v=2').then(r => r.json())]); } catch (e) { ST = DL = null; }
  showScreen('home'); renderHome();
  if (!DB.tut.basic && !Q.has('notut')) { DB.tut.basic = 1; save(); setTimeout(tutorial, 400); }
  loginBonus();
  if (ON && ON.available) ON.init().catch(() => {});
}
// test hooks (Playwright) — read-only handles + the real game entry points
window.JBApp = { get DB() { return DB; }, get G() { return G; }, get ST() { return ST; }, get DL() { return DL; }, startStage, startDaily, startSearch, startChain, startTA, doMove, tilt, hint, nextMove, renderHome, openRank, toast };
boot();
})();
