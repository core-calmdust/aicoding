/* だつごく！スライド — app: home portal (daily / course / modes), the sliding board, modes, economy, rankings */
(function () {
'use strict';
const E = window.JBEngine, A = window.JBArt;
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
const DEF = () => ({ v: 1, coin: 0, life: 0, name: '', icon: 0, own: { 0: 1, 1: 1 }, skin: 'concrete', skinOwn: ['concrete', 'brick'],
  set: { snd: 1, anim: 1, lang: '' }, st: {}, dl: {}, best: { sl: 0, chain: 0, chainN: 0 },
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
let AC = null, gestured = false;
addEventListener('pointerdown', () => { gestured = true; }, { once: true, capture: true });
function ac() { if (!gestured) return null; if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
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
const FLOORS = 12, PER = 10, UNLOCK = 6, FLOOR_N = 50, FLOOR_UNLOCK = 30;
const SMODES = ['silent', 'key', 'plate', 'oneway', 'ice', 'patrol', 'twin', 'dig', 'tilt', 'big'];   // stage modes (40 each)
const MODE_COL = { silent: '#3b3f6e', key: '#c99a1a', plate: '#d47a1f', oneway: '#2f74b5', ice: '#3aa3c9', patrol: '#2f4d7a', twin: '#c2502a', dig: '#8a4b33', tilt: '#6b7d3a', big: '#4d5a6e', sl: '#1b2333', chain: '#7d2f45' };
const FLOOR_COL = ['#8e9aa8', '#7f8c6a', '#6a93b5', '#b5866a', '#7a6fa6', '#5f9a8f', '#a86a5a', '#6e7f99', '#9a8a4f', '#5a6b7f', '#8f5a6f', '#3e4a5e'];
const stKeyC = idx => 'c' + idx, stKeyM = (m, j) => m + '.' + j;
const recsOf = (pfx, n) => { const a = []; for (let j = 0; j < n; j++) a.push(DB.st[pfx(j)] || 0); return a; };
const floorRecs = f => recsOf(j => stKeyC(f * FLOOR_N + j), FLOOR_N);
const modeRecs = m => recsOf(j => stKeyM(m, j), 40);
const secOpen = (recs, j) => { const s = (j / PER) | 0; if (s === 0) return true; let c = 0; for (let i = (s - 1) * PER; i < s * PER; i++) if (recs[i]) c++; return c >= UNLOCK; };
const floorOpen = f => f === 0 || floorRecs(f - 1).filter(v => v).length >= FLOOR_UNLOCK || Q.has('unlock');
const secMedal = (recs, s) => { const r = recs.slice(s * PER, s * PER + PER); if (r.some(v => !v)) return 0; if (r.every(v => v >= 3)) return 3; if (r.every(v => v >= 2)) return 2; return 1; };
const ST_TOTAL = () => ST ? ST.course.length + SMODES.reduce((a, m) => a + ST.modes[m].length, 0) : 1000;
const clearedN = () => Object.values(DB.st).filter(v => v > 0).length;
const starsN = () => Object.values(DB.st).reduce((a, v) => a + (v || 0), 0);
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
const floorDone = f => floorRecs(f).every(v => v);
const modeCleared = m => modeRecs(m).filter(v => v).length;
const ACH = [
  ['esc1', s => [s.esc, 1], 30], ['esc50', s => [s.esc, 50], 150], ['esc300', s => [s.esc, 300], 500], ['esc1000', s => [s.esc, 1000], 1500],
  ['perf10', s => [s.perfect, 10], 100], ['perf100', s => [s.perfect, 100], 500], ['perf500', s => [s.perfect, 500], 1500],
  ['c50', () => [Object.keys(DB.st).filter(k => k[0] === 'c' && DB.st[k]).length, 50], 200], ['c200', () => [Object.keys(DB.st).filter(k => k[0] === 'c' && DB.st[k]).length, 200], 600], ['c600', () => [Object.keys(DB.st).filter(k => k[0] === 'c' && DB.st[k]).length, 600], 3000],
  ['floor1', () => [Array.from({ length: FLOORS }, (_, f) => f).filter(floorDone).length, 1], 300], ['floorAll', () => [Array.from({ length: FLOORS }, (_, f) => f).filter(floorDone).length, FLOORS], 5000],
  ['star100', () => [Object.values(DB.st).filter(v => v >= 3).length, 100], 400], ['star500', () => [Object.values(DB.st).filter(v => v >= 3).length, 500], 1500],
  ...SMODES.map(m => ['m_' + m, () => [modeCleared(m), 10], 150]),
  ['modesAll', () => [SMODES.reduce((a, m) => a + modeCleared(m), 0), SMODES.length * 40], 4000],
  ['sl3k', () => [DB.best.sl, 3000], 200], ['sl8k', () => [DB.best.sl, 8000], 600],
  ['chain10', () => [DB.best.chainN, 10], 200], ['chain30', () => [DB.best.chainN, 30], 800],
  ['daily1', () => [Object.values(DB.dl).filter(dayPlayed).length, 1], 50], ['streak7', () => [streak(), 7], 300], ['streak30', () => [streak(), 30], 1200], ['gold10', () => [Object.values(DB.dl).filter(dayGold).length, 10], 500],
  ['dig50', s => [s.dig, 50], 200], ['key30', s => [s.key, 30], 200],
  ['col12', () => [Object.keys(DB.own).length, 12], 300], ['colAll', () => [Object.keys(DB.own).length + DB.skinOwn.length, A.INMATES.length + A.SKINS.length], 3000],
];
const achReady = () => ACH.filter(([id, f]) => { const [v, g] = f(DB.stats); return v >= g && !DB.ach[id]; }).length;
function updateBadges() { const d = $('#btnAch .dot'); if (d) d.style.display = achReady() ? 'block' : 'none'; }

/* ---------------- online ---------------- */
const ON = window.JBOnline;
const who = () => ({ n: DB.name, i: DB.icon });
async function pushTotals() {
  if (!ON || !ON.available || !DB.name) return;
  try { await ON.putBest('jb/stars', Object.assign({ s: starsN() }, who())); if (DB.best.chain) await ON.putBest('jb/chain', Object.assign({ s: DB.best.chain }, who())); } catch (e) {}
}

/* ============================================================ HOME ============================================================ */
let homeTab = 'daily', floorOpenId = null, modeOpenId = null;
function updateCoins() { $$('.coinv').forEach(e => { e.textContent = fmt(DB.coin); }); }
function picHTML(icon = DB.icon) { return A.inmateSVG(icon, { bg: '#cfd6de' }); }
function profCard() {
  const ti = titleIdx(), nx = TITLES[ti + 1], s = starsN();
  $('#profCard').innerHTML = `<button class="pic" id="pfEdit" aria-label="${esc(t('pf.edit'))}">${picHTML()}</button>
    <div class="pinfo"><span class="ptitle">${esc(t('ti.' + ti))}</span><b class="pname">${esc(DB.name || t('pf.guest'))}</b></div>
    <div class="pcoin">${A.ICON.coin}<b class="coinv">${fmt(DB.coin)}</b></div>
    <div class="pstreak"><b>${streak()}</b><span>${esc(t('pf.streak'))}</span></div>
    <div class="pextra"><div class="plvbar"><span>★ ${s}${nx ? ` → ${nx}` : ''}</span><span class="bar"><i style="width:${nx ? Math.min(100, (s - TITLES[ti]) / (nx - TITLES[ti]) * 100) : 100}%"></i></span><small>${nx ? esc(t('pf.next', { t: t('ti.' + (ti + 1)) })) : ''}</small></div>
      <ul class="pst"><li><span>${esc(t('ht.course'))}</span><b>${Object.keys(DB.st).filter(k => k[0] === 'c' && DB.st[k]).length}<small>/${ST ? ST.course.length : 600}</small></b></li>
      <li><span>${esc(t('ht.modes'))}</span><b>${SMODES.reduce((a, m) => a + modeCleared(m), 0)}<small>/${SMODES.length * 40}</small></b></li>
      <li><span>${esc(t('pf.esc'))}</span><b>${fmt(DB.stats.esc)}</b></li><li><span>${esc(t('pf.perfect'))}</span><b>${fmt(DB.stats.perfect)}</b></li></ul>
      <div class="plinks"><button class="btn" data-go="gacha">${A.ICON.locker}${esc(t('ga.title'))}</button><button class="btn" data-go="book">${A.ICON.book}${esc(t('bk.title'))}</button><button class="btn" data-go="ach">${A.ICON.trophy}${esc(t('ach.title'))}</button><button class="btn" data-go="rank">${A.ICON.rank}${esc(t('rk.title'))}</button></div></div>`;
  $$('[data-go]', $('#profCard')).forEach(b => { b.onclick = () => ({ gacha: openGacha, book: () => openBook(), ach: openAch, rank: () => openRank('m') })[b.dataset.go](); });
  $('#pfEdit').onclick = () => openProfile();
}
function renderHome() {
  profCard(); updateCoins(); updateBadges();
  $$('#htabs button').forEach(b => b.classList.toggle('on', b.dataset.p === homeTab));
  $$('.hpanel').forEach(p => { p.hidden = p.dataset.p !== homeTab; });
  if (!ST || !DL) { $('#dBox').innerHTML = `<p class="note">${esc(t('err.load'))}</p>`; return; }
  if (homeTab === 'daily') renderDaily();
  if (homeTab === 'course') floorOpenId != null ? renderFloor(floorOpenId) : renderFloors();
  if (homeTab === 'modes') modeOpenId ? renderMode(modeOpenId) : renderModes();
}
const ruleChip = r => r && r !== 'basic' ? `<span class="chip rc" style="--mc:${MODE_COL[r]}">${A.MI[r]}${esc(t('mo.' + r))}</span>` : `<span class="chip rc">${esc(t('mo.basic'))}</span>`;
function renderDaily() {
  const d = today(), r = dlOf(d);
  $('#dPuzzle').innerHTML = `<div class="ptag">${esc(t('d.title'))}<i>${esc(d.slice(5).replace('-', '/'))}</i></div>
    <div class="dhead"><h3>${esc(t('d.head'))}</h3><p>${esc(t('d.desc'))}</p></div>
    <div class="dlvs">${DIFFS.map(D => { const rec = dRec(d, D.k), P = E.decode(rec), rr = r[D.k], played = rr.md > 0, going = !played && !!rr.p;
      return `<div class="dlv lv-${D.k}"><div class="dic">${A.miniBoard(P, P.s0)}</div><div class="dlt"><b>${esc(t('dl.' + D.k))}</b>${ruleChip(rec.r)}<small>${esc(t('u.opt', { n: rec.o }))}</small>
        <span class="dbest"><span>${esc(t('d.best'))}</span><b>${played ? fmt(rr.s) : '—'}</b>${rr.md ? `<i class="medal m${rr.md}"></i>` : ''}</span></div>
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
function floorIcon(f) { return `<svg viewBox="0 0 48 48" class="flic"><rect x="4" y="8" width="40" height="34" rx="3" fill="${FLOOR_COL[f]}" stroke="#2a2622" stroke-width="3"/><path d="M12 8v34M20 8v34M28 8v34M36 8v34" stroke="#2a2622" stroke-width="2.6"/><text x="24" y="31" text-anchor="middle" font-size="16" font-weight="900" fill="#fff" stroke="#2a2622" stroke-width="3" paint-order="stroke" font-family="Jost,sans-serif">${f + 1}F</text></svg>`; }
function renderFloors() {
  const el = $('#coursePanel');
  let html = `<div class="sechead"><h2>${esc(t('co.h'))}</h2><p>${esc(t('co.d', { n: ST.course.length }))}</p></div><div class="tgrid">`;
  for (let f = 0; f < FLOORS; f++) {
    const recs = floorRecs(f), done = recs.filter(v => v).length, stars = recs.reduce((a, b) => a + b, 0), open = floorOpen(f), comp = done === FLOOR_N;
    const os = ST.course.slice(f * FLOOR_N, f * FLOOR_N + FLOOR_N).map(r => r.o);
    html += `<button class="tcard ${comp ? 'comp' : ''} ${open ? '' : 'lockd'}" data-fl="${f}" style="--tc:${FLOOR_COL[f]}" ${open ? '' : 'aria-disabled="true"'}>
      <span class="tic">${floorIcon(f)}</span><span class="tt"><b>${esc(t('fl.' + f))}</b><small>${esc(t('fl.' + f + '.d'))}</small>
      <span class="bar"><i style="width:${done * 2}%"></i></span>
      <span class="tmeta"><em>${done}/${FLOOR_N}</em><em class="st">★ ${stars}/${FLOOR_N * 3}</em><em class="mv">${esc(t('u.movesR', { a: Math.min(...os), b: Math.max(...os) }))}</em></span>
      ${open ? '' : `<span class="lk">${A.ICON.lock}${esc(t('co.lock', { n: Math.max(0, FLOOR_UNLOCK - floorRecs(f - 1).filter(v => v).length) }))}</span>`}</span>${comp ? `<span class="crown">${esc(t('co.comp'))}</span>` : ''}</button>`;
  }
  el.innerHTML = html + '</div>';
  $$('.tcard', el).forEach(b => { b.onclick = () => { const f = +b.dataset.fl; if (!floorOpen(f)) { SND.bump(); toast(t('co.lockT')); return; } floorOpenId = f; renderFloor(f); scrollTo(0, 0); }; });
}
function stageTiles(recs, n, keyOf, isNext, cls = '') {
  let html = '<div class="stgs">';
  const next = recs.findIndex((v, j) => !v && secOpen(recs, j));
  for (let s = 0; s < n / PER; s++) {
    const open = secOpen(recs, s * PER), md = secMedal(recs, s), cl = recs.slice(s * PER, s * PER + PER).filter(v => v).length;
    const need = s ? Math.max(0, UNLOCK - recs.slice((s - 1) * PER, s * PER).filter(v => v).length) : 0;
    html += `<section class="stg tier${s}"><div class="stgh"><b>BLOCK ${String.fromCharCode(65 + s)}</b><span class="tier">${esc(t('tier.' + Math.min(s, 4)))}</span><span class="cnt">${cl}/${PER}</span>${md ? `<i class="medal m${md}"></i>` : ''}</div>`;
    if (!open) html += `<div class="locked">${A.ICON.lock}${esc(t('st.lock', { s: String.fromCharCode(64 + s), n: need }))}</div>`;
    else { html += '<div class="tiles">'; for (let j = s * PER; j < s * PER + PER; j++) html += `<button class="tile ${recs[j] ? 'done' : ''} ${j === next ? 'next' : ''} ${cls}" data-j="${j}"><b>${j + 1}</b><span class="stars">${'★'.repeat(recs[j])}${'☆'.repeat(3 - recs[j])}</span>${j === next ? '<i>NEXT</i>' : ''}</button>`; html += '</div>'; }
    html += '</section>';
  }
  return html + '</div>';
}
function renderFloor(f) {
  const el = $('#coursePanel'), recs = floorRecs(f), done = recs.filter(v => v).length;
  el.innerHTML = `<div class="thead" style="--tc:${FLOOR_COL[f]}"><button class="btn sm" id="flBack">${A.ICON.back}${esc(t('u.list'))}</button><span class="tic">${floorIcon(f)}</span>
    <div><h2>${esc(t('fl.' + f))}</h2><p>${esc(t('fl.' + f + '.d'))}</p></div><div class="ring" style="--p:${done * 2}"><b>${done}</b><small>/${FLOOR_N}</small></div></div>` + stageTiles(recs, FLOOR_N);
  $('#flBack').onclick = () => { floorOpenId = null; renderFloors(); };
  $$('.tile', el).forEach(b => { b.onclick = () => startStage('c', f * FLOOR_N + +b.dataset.j); });
}
function renderModes() {
  const el = $('#modePanel');
  const sc = (m, best, extra) => `<div class="card acard" style="--mc:${MODE_COL[m]}"><div class="ptag">${esc(t('mo.' + m))}</div><button class="qbtn qc" data-rule="${m}">?</button><span class="aic">${A.MI[m]}</span><p>${esc(t('mo.' + m + '.s'))}</p><div class="dbest"><span>${esc(t('d.best'))}</span><b>${best ? fmt(best) : '—'}</b>${extra || ''}</div><button class="btn big org" data-sm="${m}">${A.ICON.play}${esc(t('d.play'))}</button></div>`;
  let html = `<div class="sechead"><h2>${esc(t('mo.h'))}</h2><p>${esc(t('mo.d'))}</p></div><div class="acards">${sc('sl', DB.best.sl)}${sc('chain', DB.best.chain, DB.best.chainN ? `<small>${esc(t('ch.n', { n: DB.best.chainN }))}</small>` : '')}</div>
    <div class="sechead"><h2>${esc(t('mo.h2'))}</h2><p>${esc(t('mo.d2'))}</p></div><div class="mgrid">`;
  SMODES.forEach(m => { const recs = modeRecs(m), done = recs.filter(v => v).length, stars = recs.reduce((a, b) => a + b, 0);
    html += `<button class="mcard" data-mode="${m}" style="--mc:${MODE_COL[m]}"><span class="mic">${A.MI[m]}</span><span class="mt"><b>${esc(t('mo.' + m))}</b><small>${esc(t('mo.' + m + '.s'))}</small><span class="bar"><i style="width:${done / 40 * 100}%"></i></span><span class="tmeta"><em>${done}/40</em><em class="st">★ ${stars}/120</em></span></span>${done === 40 ? `<span class="crown">${esc(t('co.comp'))}</span>` : ''}</button>`; });
  el.innerHTML = html + '</div>';
  $$('[data-sm]', el).forEach(b => { b.onclick = () => b.dataset.sm === 'sl' ? startSearch(false) : startChain(); });
  $$('[data-mode]', el).forEach(b => { b.onclick = () => { modeOpenId = b.dataset.mode; renderMode(modeOpenId); scrollTo(0, 0); maybeRuleTip(modeOpenId); }; });
}
function renderMode(m) {
  const el = $('#modePanel'), recs = modeRecs(m), done = recs.filter(v => v).length;
  el.innerHTML = `<div class="thead" style="--tc:${MODE_COL[m]}"><button class="btn sm" id="moBack">${A.ICON.back}${esc(t('u.list'))}</button><span class="tic mtic">${A.MI[m]}</span>
    <div><h2>${esc(t('mo.' + m))}</h2><p>${esc(t('mo.' + m + '.r'))}</p><button class="btn sm" id="moRule">?${esc(t('u.rules'))}</button></div><div class="ring" style="--p:${done / 40 * 100}"><b>${done}</b><small>/40</small></div></div>` + stageTiles(recs, 40);
  $('#moBack').onclick = () => { modeOpenId = null; renderModes(); };
  $('#moRule').onclick = () => maybeRuleTip(m, true);
  $$('.tile', el).forEach(b => { b.onclick = () => startStage(m, +b.dataset.j); });
}
document.addEventListener('click', e => { const b = e.target.closest('[data-rule]'); if (b) { e.stopPropagation(); maybeRuleTip(b.dataset.rule, true); } });

/* ============================================================ GAME ============================================================ */
let G = null;
function showScreen(id) { $$('.screen').forEach(s => { s.hidden = s.id !== id; }); document.body.dataset.screen = id; scrollTo(0, 0); }
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
  const rec = src === 'c' ? ST.course[j] : ST.modes[src][j];
  const title = src === 'c' ? `${t('fl.' + Math.floor(j / FLOOR_N))} · ${(j % FLOOR_N) + 1}` : `${t('mo.' + src)} · ${j + 1}`;
  newGame(rec, { kind: 'stage', m: src === 'c' ? 'basic' : src, src, j, title });
  startPlay();
  if (src !== 'c') maybeRuleTip(src); else if (j === 0 && !DB.tut.first) { DB.tut.first = 1; save(); setTimeout(() => floatTip(t('tip.first')), 500); }
}
// one play per difficulty a day: the attempt starts when the cell opens; leaving keeps it (resume: same board, moves and clock)
function startDaily(k) {
  const d = today(), rec = dRec(d, k), rr = dlOf(d)[k];
  if (rr.md > 0) return;
  const p = rr.p;
  newGame(rec, { kind: 'daily', m: rec.r || 'basic', dk: k, date: d, title: `${t('d.title')} · ${t('dl.' + k)}` });
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
  newGame(slPick(rnd, 0), { kind: 'sl', m: 'basic', run, title: daily ? t('d.sl') : t('mo.sl') });
  startPlay(); maybeRuleTip('sl');
  countdown(() => { run.tEnd = performance.now() + SL_TIME * 1000; G.t0 = Date.now(); loop(); });
}
// CHAIN ESCAPE: endless; every cell has a move budget, going over sets off the alarm (3 alarms = game over)
function chainBudget(k, o) { return o + Math.max(1, 4 - Math.floor(k / 6)); }
function startChain() {
  const rnd = E.rng((Math.random() * 2 ** 31) | 0), run = { rnd, k: 0, score: 0, n: 0, lives: 3, combo: 0 };
  const rec = slPick(rnd, 0);
  newGame(rec, { kind: 'chain', m: 'basic', run, budget: chainBudget(0, rec.o), title: t('mo.chain') });
  startPlay(); maybeRuleTip('chain');
}
function nextRunPuzzle() {
  const run = G.run; run.k++;
  const rec = slPick(run.rnd, run.k), o = { kind: G.kind, m: 'basic', run, title: G.title };
  if (G.kind === 'chain') o.budget = chainBudget(run.k, rec.o);
  const t0 = G.t0; newGame(rec, o); G.t0 = t0;
  boardIn();
}
function startPlay() { $('#gameMsg').hidden = true; showScreen('play'); relayout(); hud(); renderInfo(); }

/* ---------------- board DOM ---------------- */
const boardEl = () => $('#board');
function cellSize() {
  const P = G.P, wrap = $('#boardWrap'), W = Math.min(wrap.clientWidth || innerWidth, 560), H = Math.max(260, innerHeight - (innerWidth < 760 ? 250 : 230));
  const twin = P.pc.some(p => p.t === 'Q');   // frame (.36 cell a side) + room for the EXIT sign on the right (and below for TWIN)
  return Math.max(30, Math.floor(Math.min((W - 8) / (P.w + 1.75), H / (P.h + (twin ? 1.6 : .8)))));
}
const tr = (x, y) => `translate(${x * G.cs}px, ${y * G.cs}px)`;
// TWIN: the partner is another inmate you own (or the next one)
function twinMate() { const o = Object.keys(DB.own).map(Number).filter(i => i !== DB.icon); return o.length ? o[(DB.icon + 1) % o.length] : (DB.icon + 1) % A.INMATES.length; }
function pieceHTML(p, i) {
  const big = p.l > 1;
  if (p.t === 'P' || p.t === 'Q') return `<span class="suit"></span><span class="face">${A.inmateSVG(p.t === 'P' ? DB.icon : twinMate(), { noSuit: true })}</span><span class="tag">${p.t === 'P' ? 'A' : 'B'}-${String((p.t === 'P' ? DB.icon : twinMate()) + 1).padStart(3, '0')}</span>`;
  if (p.t === 'g') return `<span class="gd">${A.GUARD}</span><i class="gdir"></i>`;
  if (p.t === 'k') return `<span class="kk">${A.KEY}</span>`;
  if (p.t === 'x') return '<span class="crate"></span>';
  return `<span class="bk ${p.v ? 'v' : 'h'}${p.l}">${p.t === 'o' ? `<span class="chev ${p.v ? (p.f > 0 ? 'd' : 'u') : (p.f > 0 ? 'r' : 'l')}">${'<i></i>'.repeat(big ? p.l + 1 : 2)}</span>` : ''}</span>`;
}
function buildBoard() {
  const P = G.P, b = boardEl(); G.cs = cellSize(); const cs = G.cs;
  b.style.setProperty('--cs', cs + 'px'); b.style.width = P.w * cs + 'px'; b.style.height = P.h * cs + 'px';
  b.dataset.mode = G.m; b.dataset.w = P.w;
  const wr = $('#boardWrap'); wr.style.paddingRight = Math.round(cs * 1.05) + 'px'; wr.style.paddingBottom = P.pc.some(p => p.t === 'Q') ? Math.round(cs * .95) + 'px' : '';
  let html = '<div class="floor"></div><div class="fxl">';
  const at = c => `style="transform:${tr(c % P.w, (c / P.w) | 0)}"`;
  P.walls.forEach(c => { html += `<div class="cell wall" ${at(c)}></div>`; });
  P.cracks.forEach((c, k) => { html += `<div class="cell crack" data-c="${c}" data-k="${k}" ${at(c)}><i></i></div>`; });
  if (P.plate >= 0) html += `<div class="cell plate" ${at(P.plate)}><i></i></div>`;
  P.doors.forEach(c => { html += `<div class="cell door" ${at(c)}><i></i></div>`; });
  if (P.lock >= 0) html += `<div class="cell lockc" ${at(P.lock)}>${A.LOCK}</div>`;
  P.gate.forEach(c => { html += `<div class="cell gate" ${at(c)}><i></i></div>`; });
  html += '</div>';
  // exits (prisoner rows / columns)
  P.pc.forEach((p, i) => {
    if (p.t === 'P') html += `<div class="exit er" style="top:${P.s0[2 * i + 1] * cs}px;height:${cs}px"><span class="sign">${A.ICON.exit}</span></div>`;
    if (p.t === 'Q') html += `<div class="exit eb" style="left:${P.s0[2 * i] * cs}px;width:${cs}px"><span class="sign">${A.ICON.exit}</span></div>`;
  });
  html += '<div class="pcs">' + P.pc.map((p, i) => `<div class="pc t${p.t} ${p.v ? 'pv' : 'ph'} l${p.l} c${i % A.BCOL.length}" data-i="${i}" style="width:${(p.v ? 1 : p.l) * cs}px;height:${(p.v ? p.l : 1) * cs}px">${pieceHTML(p, i)}</div>`).join('') + '</div>';
  if (P.lock >= 0) html += `<div class="cell lockmk" ${at(P.lock)}>${A.LOCK}</div>`;   // the keyhole stays visible even under a block
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
        else if (anim && ev && ev.key === i) { el.style.transition = 'transform .35s, opacity .35s'; el.style.transform = tr(P.lock % P.w, (P.lock / P.w) | 0) + ' scale(.2) rotate(180deg)'; el.style.opacity = '0'; }
        else { el.style.opacity = '0'; }
      }
      return;
    }
    el.classList.remove('gone'); el.style.opacity = '';
    el.style.transform = tr(x, y); el._last = [x, y];
    if (p.t === 'g') { const d = S[2 * P.pc.length + P.guards.indexOf(i)]; el.dataset.dir = p.v ? (d > 0 ? 'd' : 'u') : (d > 0 ? 'r' : 'l'); }
  });
  // gate / doors / plate / cracks
  const shut = P.gate.length && E.gateShut(P, S);
  $$('.gate', boardEl()).forEach(e => e.classList.toggle('open', !shut));
  $$('.lockmk', boardEl()).forEach(e => e.classList.toggle('used', !!P.gate.length && !shut));
  const plateOn = P.plate >= 0 && g[P.plate] > 0;
  const pl = $('.plate', boardEl()); if (pl) pl.classList.toggle('on', plateOn);
  $$('.door', boardEl()).forEach(e => e.classList.toggle('open', plateOn));
  if (G.plateOn !== undefined && G.plateOn !== plateOn && anim) SND.door(plateOn);
  G.plateOn = plateOn;
  const m = S[P.iCr]; $$('.crack', boardEl()).forEach(e => { const k = +e.dataset.k; e.classList.toggle('dug', !(m >> k & 1)); });
  const dg = P.cracks.length ? E.digs(P, S, g) : [];
  $$('.crack', boardEl()).forEach(e => e.classList.toggle('can', dg.includes(+e.dataset.c)));
}
function relayout() { if (!G || $('#play').hidden) return; const cs = cellSize(); if (cs !== G.cs) buildBoard(); }
addEventListener('resize', () => { clearTimeout(relayout.t); relayout.t = setTimeout(relayout, 120); });
function boardIn() { const b = boardEl(); b.classList.remove('bin'); void b.offsetWidth; b.classList.add('bin'); }

/* ---------------- HUD ---------------- */
function keepDaily() {
  if (!G || G.kind !== 'daily' || G.over) return; const rr = dlOf(G.date)[G.dk]; if (!rr.p) return;
  rr.p = { S: G.S.slice(), hist: G.hist.map(x => x.slice()), moves: G.moves, undoN: G.undoN, hinted: G.hinted, el: Date.now() - G.t0 }; save();
}
function hud() {
  keepDaily();
  if (!G) return;
  const o = G.rec.o, mv = G.moves;
  $('#gTitle').textContent = G.title || '';
  $('#gTitleSub').innerHTML = G.m && G.m !== 'basic' ? ruleChip(G.m) : '';
  const st = G.kind === 'stage' || G.kind === 'daily' ? starsFor(Math.max(mv, o), o) : 0;
  let sub = `<span class="mvs"><small>${esc(t('u.moves'))}</small><b>${mv}</b></span><span class="opt"><small>${esc(t('u.best'))}</small><b>${o}</b></span>`;
  if (G.limit) sub += `<span class="lim ${mv >= G.limit ? 'hot' : mv >= G.limit - 1 ? 'warm' : ''}"><small>${esc(t(G.kind === 'chain' ? 'u.budget' : 'u.limit'))}</small><b>${G.limit - mv}</b></span>`;
  if (G.kind === 'stage' || G.kind === 'daily') sub += `<span class="hst">${[0, 1, 2].map(i => `<i class="${i < st ? 'on' : ''}">★</i>`).join('')}<small>${esc(t('u.star3', { n: o }))}</small></span>`;
  $('#gSub').innerHTML = sub;
  const run = G.run, bi = $('#runInfo');
  if (run) { bi.hidden = false; bi.innerHTML = `<span class="rs"><small>${esc(t('u.score'))}</small><b>${fmt(run.score)}</b></span><span><small>${esc(t('u.escaped'))}</small><b>${run.n}</b></span>${G.kind === 'chain' ? `<span class="lives">${[0, 1, 2].map(i => `<i class="${i < run.lives ? 'on' : ''}"></i>`).join('')}</span>${run.combo > 1 ? `<span class="combo">×${(1 + .1 * run.combo).toFixed(1)}</span>` : ''}` : `<span class="tm" id="slTime">${SL_TIME}</span>`}`; }
  else bi.hidden = true;
  $('#gHint').disabled = !(G.kind === 'stage') || G.over;
  $('#gUndo').disabled = !G.hist.length || G.over;
  $('#gClock').hidden = G.kind !== 'daily';
}
function renderInfo() {
  const m = G.m, el = $('#gInfo');
  const k = G.kind === 'sl' ? 'sl' : G.kind === 'chain' ? 'chain' : m === 'basic' ? 'basic' : m;
  el.innerHTML = `<span class="ii">${A.MI[k] || A.MI.big}</span><span>${esc(t('in.' + k))}</span>${k !== 'basic' ? `<button class="btn sm qbtn" data-rule="${k}">?</button>` : ''}`;
}
setInterval(() => { if (G && G.kind === 'daily' && !G.over) { const c = $('#gClock'); if (c) c.textContent = mmss((Date.now() - G.t0) / 1000) + (G.undoN ? `  ·  ${t('g.undo')}×${G.undoN}` : ''); } }, 500);

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
  render(true, ev);
  if (ev.esc) { SND.esc(); }
  clearHint(); hud();
  if (E.solved(G.P, G.S)) { G.busy = true; setTimeout(() => { G.busy = false; win(); }, 520); return; }
  if (G.limit && G.moves >= G.limit) { G.busy = true; setTimeout(() => { G.busy = false; overLimit(); }, 300); return; }
  // rule sets with one-way effects can reach a dead end: tell the player
  if (G.m !== 'basic' && G.m !== 'big' && G.m !== 'silent' && G.m !== 'plate') {
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
  if (G.kind === 'sl' || G.kind === 'chain') { if (G.over) return; G.S = G.P.s0.slice(); G.hist = []; G.moves = 0; buildBoard(); hud(); return; }
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
function hint() {
  if (!G || G.kind !== 'stage' || G.busy || G.over) return;
  const m = nextMove();
  if (!m) { toast(t('h.none')); $('#deadEnd').hidden = false; return; }
  G.hinted = true; DB.stats.hints++; clearHint(); SND.hint();
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
  G.over = true; hud();
  let html = '', coins = 0;
  if (G.kind === 'stage') {
    let stars = starsFor(mv, o); if (G.hinted) stars = 1;
    const key = G.src === 'c' ? stKeyC(G.j) : stKeyM(G.src, G.j), old = DB.st[key] || 0;
    const recsB = G.src === 'c' ? floorRecs(Math.floor(G.j / FLOOR_N)) : modeRecs(G.src);
    if (stars > old) { DB.st[key] = stars; coins = addCoin((stars - old) * 8 + (old ? 0 : 12)); }
    const recsA = G.src === 'c' ? floorRecs(Math.floor(G.j / FLOOR_N)) : modeRecs(G.src), jj = G.src === 'c' ? G.j % FLOOR_N : G.j, s = (jj / PER) | 0, N = recsA.length;
    const ev = [];
    if (secMedal(recsA, s) > secMedal(recsB, s)) ev.push(t('ev.medal', { s: String.fromCharCode(65 + s) }));
    if ((s + 1) * PER < N && !secOpen(recsB, (s + 1) * PER) && secOpen(recsA, (s + 1) * PER)) ev.push(t('ev.unlock', { s: String.fromCharCode(66 + s) }));
    if (G.src === 'c') { const f = Math.floor(G.j / FLOOR_N); if (f + 1 < FLOORS && recsB.filter(v => v).length < FLOOR_UNLOCK && recsA.filter(v => v).length >= FLOOR_UNLOCK) ev.push(t('ev.floor', { f: t('fl.' + (f + 1)) })); }
    if (recsA.every(v => v) && !recsB.every(v => v)) ev.push(t('ev.comp'));
    const ti0 = G.ti0 ?? titleIdx(); if (titleIdx() > ti0) ev.push(t('ev.title', { t: t('ti.' + titleIdx()) }));
    const nj = jj + 1, canNext = nj < N && secOpen(recsA, nj);
    html = resultCard('ESCAPED!', starRow(stars) + `<p class="rmv">${esc(t('r.moves', { m: mv, o }))}</p><p>${esc(t(G.hinted ? 'r.s0' : stars === 3 ? 'r.s3' : stars === 2 ? 'r.s2' : 'r.s1', { n: o + slack(o) }))}</p>${ev.map(e => `<div class="ev">${esc(e)}</div>`).join('')}${coinLine(coins)}`,
      [canNext ? ['next', t('r.next'), 'org'] : null, ['retry', t('r.retry')], ['list', t('u.list')]]);
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
  return `<div class="result ${cls}"><div class="rhead"><b>${esc(head)}</b></div>${body}<div class="rbtns">${btns.filter(Boolean).map(([a, l, c]) => `<button class="btn ${c || ''}" data-act="${a}">${esc(l)}</button>`).join('')}</div></div>`;
}
function showResult(html) { const m = $('#gameMsg'); m.innerHTML = html; m.hidden = false; $$('[data-act]', m).forEach(b => { b.onclick = () => resultAct(b.dataset.act); }); }
function resultAct(a) {
  const m = $('#gameMsg');
  if (a === 'retry') { if (G.kind === 'stage') { const s = G.src, j = G.j; startStage(s, j); G.retried = true; } return; }
  if (a === 'undo1') { m.hidden = true; G.over = false; G.S = G.hist.pop() || G.S; G.moves--; buildBoard(); hud(); return; }
  if (a === 'next') { const s = G.src; return startStage(s, G.j + 1); }
  if (a === 'list') { if (G.src === 'c') { homeTab = 'course'; floorOpenId = Math.floor(G.j / FLOOR_N); } else { homeTab = 'modes'; modeOpenId = G.src; } return goHome(); }
  if (a === 'home') return goHome();
  if (a === 'rank') return openRank(G.kind === 'daily' ? G.dk : 'sl');
  if (a === 'name') return openProfile();
  if (a === 'again') { if (G.kind === 'sl') return startSearch(G.run.daily); return startChain(); }
}
function goHome() { cancelAnimationFrame(raf); G = null; $('#deadEnd').hidden = true; showScreen('home'); renderHome(); }
function quitGame() {
  const leave = () => { if (G && G.kind === 'stage') { if (G.src === 'c') { homeTab = 'course'; floorOpenId = Math.floor(G.j / FLOOR_N); } else { homeTab = 'modes'; modeOpenId = G.src; } } goHome(); };
  if (G && (G.kind === 'sl' || G.kind === 'chain') && !G.over) return ask(t('q.quit'), [[t('q.keep'), 'org'], [t('q.home'), '', () => { endRun(); leave(); }]]);
  leave();
}

/* ---------------- effects ---------------- */
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
function toast(s) { const e = $('#toast'); e.textContent = s; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2200); }
function floatTip(s) { const e = $('#gInfo'); if (e) { e.classList.remove('pulse'); void e.offsetWidth; e.classList.add('pulse'); } toast(s); }

/* ============================================================ MODALS ============================================================ */
function modal(html, cls = '') { const m = $('#modal'); m.className = 'modal ' + cls; $('#modalBody').innerHTML = html; m.hidden = false; $('#modalBody').scrollTop = 0; if (G) G.paused = true; return $('#modalBody'); }
function closeModal() { $('#modal').hidden = true; if (G) G.paused = false; if (!$('#home').hidden) renderHome(); }
function ask(msg, btns) {
  const body = modal(`<div class="askb">${A.inmateSVG(DB.icon)}<p>${esc(msg)}</p><div class="mbtns">${btns.map(([l, c], i) => `<button class="btn big ${c || ''}" data-i="${i}">${esc(l)}</button>`).join('')}</div></div>`, 'mask');
  $$('[data-i]', body).forEach(b => { b.onclick = () => { $('#modal').hidden = true; if (G) G.paused = false; const f = btns[+b.dataset.i][2]; f && f(); }; });
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
};
function maybeRuleTip(m, force) {
  if (!force && DB.tut['r_' + m]) return; DB.tut['r_' + m] = 1; save();
  const ex = RULE_EX[m] || RULE_EX.basic, P = E.decode(Object.assign({ w: 6, h: 6 }, ex));
  modal(`<div class="tut"><div class="ttl"><span class="ttag">${A.MI[m] || ''}<b>${esc(t('mo.' + m))}</b></span></div><div class="tpanel"><div class="tmas">${A.inmateSVG(DB.icon)}</div><div class="balloon"><p>${esc(t('mo.' + m + '.r'))}</p></div></div><div class="tdemo">${A.miniBoard(P, P.s0, 'mini big')}<p class="note">${esc(t('ex.' + m))}</p></div><div class="mbtns"><button class="btn big org" id="tOk">OK!</button></div></div>`, 'mtut');
  $('#tOk').onclick = closeModal;
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
function openProfile() {
  const pend = openProfile.p || (openProfile.p = { icon: DB.icon, skin: DB.skin, name: DB.name });
  const owned = Object.keys(DB.own).map(Number).sort((a, b) => a - b);
  const body = modal(`<h2 class="mh">${esc(t('pf.edit'))}</h2><div class="pfhead"><div class="pic big">${picHTML(pend.icon)}</div><div class="pfn"><label class="fld"><span>${esc(t('pf.name'))}</span><input id="pfName" maxlength="12" value="${esc(pend.name)}" placeholder="${esc(t('pf.ph'))}"></label><p class="note">${esc(t('pf.note'))}</p></div></div>
    <h3 class="mh3">${esc(t('pf.icon'))}</h3><div class="cgrid">${owned.map(id => `<button class="cc ${id === pend.icon ? 'on' : ''}" data-ic="${id}">${A.inmateSVG(id)}</button>`).join('')}</div>
    <h3 class="mh3">${esc(t('pf.skin'))}</h3><div class="skgrid">${A.SKINS.filter(s => DB.skinOwn.includes(s.id)).map(s => `<button class="skb ${s.id === pend.skin ? 'on' : ''}" data-sk="${s.id}"><span class="skp" data-skin="${s.id}"></span><b>${esc(t('sk.' + s.id))}</b></button>`).join('')}</div>
    <div class="mbtns"><button class="btn big org" id="pfSave">${esc(t('u.save'))}</button></div>`, 'mwide');
  const keep = () => { pend.name = $('#pfName').value; };
  $$('[data-ic]', body).forEach(b => { b.onclick = () => { keep(); pend.icon = +b.dataset.ic; openProfile(); }; });
  $$('[data-sk]', body).forEach(b => { b.onclick = () => { keep(); pend.skin = b.dataset.sk; openProfile(); }; });
  $('#pfSave').onclick = () => { DB.name = $('#pfName').value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12); DB.icon = pend.icon; DB.skin = pend.skin; openProfile.p = null; save(); applySkin(); pushTotals(); closeModal(); };
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
const GPOOL = [[], [], [], []];
A.INMATES.forEach(c => GPOOL[c.rar].push({ t: 'c', id: c.id }));
A.SKINS.forEach(s => { if (s.id !== 'concrete') GPOOL[s.rar].push({ t: 's', id: s.id }); });
const itemRar = it => it.t === 'c' ? A.INMATES[it.id].rar : A.SKINS.find(s => s.id === it.id).rar;
const hasItem = it => it.t === 'c' ? !!DB.own[it.id] : DB.skinOwn.includes(it.id);
const itemSVG = it => it.t === 'c' ? A.inmateSVG(it.id) : `<span class="skp" data-skin="${it.id}"></span>`;
function rollOne(g) { let r = Math.random(), rar = 0; for (const [k, p] of RATE) { if (r < p) { rar = k; break; } r -= p; } if (g && rar < 2) rar = 2; const pool = GPOOL[rar]; return pool[(Math.random() * pool.length) | 0]; }
function openGacha() {
  modal(`<h2 class="mh">${esc(t('ga.title'))}</h2><div class="gmach"><div class="glock">${'<i></i>'.repeat(6)}<b>LUCKY LOCKER</b></div><div class="gcoin">${A.ICON.coin}<b class="coinv">${fmt(DB.coin)}</b></div>
    <div class="gbtns"><button class="btn big org" id="g1" ${DB.coin < G_COST ? 'disabled' : ''}>${esc(t('ga.one'))}<small>${A.ICON.coin}${G_COST}</small></button><button class="btn big blue" id="g10" ${DB.coin < G_COST10 ? 'disabled' : ''}>${esc(t('ga.ten'))}<small>${A.ICON.coin}${fmt(G_COST10)}</small></button></div>
    <p class="note">${esc(t('ga.rate'))}</p><p class="note">${esc(t('ga.dup', { a: REFUND[0], b: REFUND[1], c: REFUND[2], d: REFUND[3] }))}</p></div><div id="gaRes"></div>`, 'mwide');
  $('#g1').onclick = () => pull(1); $('#g10').onclick = () => pull(10);
}
function pull(n) {
  const cost = n === 10 ? G_COST10 : G_COST; if (DB.coin < cost) return;
  DB.coin -= cost; DB.stats.gacha += n;
  const items = []; let refund = 0;
  for (let i = 0; i < n; i++) { const it = rollOne(n === 10 && i === 9), dup = hasItem(it); if (dup) refund += REFUND[itemRar(it)]; else if (it.t === 'c') DB.own[it.id] = 1; else DB.skinOwn.push(it.id); items.push(Object.assign({ dup }, it)); }
  DB.coin += refund; save(); updateCoins();
  const best = Math.max(...items.map(itemRar));
  $('#gaRes').innerHTML = `<div class="gres r${best}"><div class="gitems n${n}">${items.map((it, i) => `<div class="gi r${itemRar(it)}" style="--i:${i}">${itemSVG(it)}<span class="gk">${esc(it.t === 'c' ? t('in.n', { n: it.id + 1 }) : t('sk.' + it.id))}</span><span class="rr">${A.RAR[itemRar(it)]}</span>${it.dup ? `<span class="dup">+${REFUND[itemRar(it)]}</span>` : '<span class="new">NEW</span>'}</div>`).join('')}</div>${refund ? `<p class="note">${esc(t('ga.refund', { n: refund }))}</p>` : ''}</div>`;
  SND.esc(); if (best >= 2) setTimeout(confetti, 300);
  $('#g1').disabled = DB.coin < G_COST; $('#g10').disabled = DB.coin < G_COST10;
}
function openBook(tab = 'c') {
  const cells = tab === 'c' ? A.INMATES.map(c => `<div class="bkc ${DB.own[c.id] ? '' : 'no'} r${c.rar}">${DB.own[c.id] ? A.inmateSVG(c.id) : '<span>?</span>'}<i>${A.RAR[c.rar]}</i><small>No.${String(c.id + 1).padStart(3, '0')}</small></div>`)
    : A.SKINS.map(s => `<div class="bkc sk ${DB.skinOwn.includes(s.id) ? '' : 'no'} r${s.rar}">${DB.skinOwn.includes(s.id) ? `<span class="skp" data-skin="${s.id}"></span>` : '<span>?</span>'}<i>${A.RAR[s.rar]}</i><small>${DB.skinOwn.includes(s.id) ? esc(t('sk.' + s.id)) : '???'}</small></div>`);
  const nC = Object.keys(DB.own).length, nS = DB.skinOwn.length;
  const body = modal(`<h2 class="mh">${esc(t('bk.title'))}</h2><p class="note">${esc(t('bk.d', { n: nC + nS, m: A.INMATES.length + A.SKINS.length }))}</p>
    <div class="mtabs"><button class="${tab === 'c' ? 'on' : ''}" data-bt="c">${esc(t('bk.c'))} <small>${nC}/${A.INMATES.length}</small></button><button class="${tab === 's' ? 'on' : ''}" data-bt="s">${esc(t('bk.s'))} <small>${nS}/${A.SKINS.length}</small></button></div><div class="bkgrid ${tab}">${cells.join('')}</div>`, 'mwide');
  $$('[data-bt]', body).forEach(b => { b.onclick = () => openBook(b.dataset.bt); });
}
// --- rankings
async function openRank(tab = 'm') {
  const tabs = [['e', 'dl.e'], ['m', 'dl.m'], ['h', 'dl.h'], ['sl', 'd.sl'], ['chain', 'mo.chain'], ['stars', 'rk.stars']];
  const body = modal(`<h2 class="mh">${esc(t('rk.title'))}</h2><div class="mtabs rtabs">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-tab="${k}">${esc(t(l))}</button>`).join('')}</div><p class="note rkn">${esc(t(['e', 'm', 'h', 'sl'].includes(tab) ? 'rk.today' : 'rk.all', { d: today() }))}</p><div id="rkBody"><div class="loading">${esc(t('rk.load'))}</div></div>`, 'mrank mwide');
  $$('[data-tab]', body).forEach(b => { b.onclick = () => openRank(b.dataset.tab); });
  const el = $('#rkBody');
  if (!ON || !ON.available) { el.innerHTML = `<div class="soon">${A.MI.sl}<p>${esc(t('rk.off'))}</p></div>`; return; }
  const path = ['e', 'm', 'h', 'sl'].includes(tab) ? `jb/d/${today()}/${tab}` : 'jb/' + tab;
  try {
    const [list, me] = await Promise.all([ON.top(path, 50), ON.mine(path)]);
    if (!el.isConnected) return;
    el.innerHTML = (DB.name ? '' : `<button class="nudge" id="rkName">${esc(t('r.nudge'))}</button>`) +
      (list.length ? `<ol class="rlist">${list.map((r, i) => `<li class="${r.uid === ON.uid ? 'me' : ''} p${i + 1}"><b class="rn">${i + 1}</b><span class="ri">${A.inmateSVG((r.i | 0) % A.INMATES.length)}</span><span class="rnm">${esc(r.n)}</span><b class="rs">${fmt(r.s)}</b></li>`).join('')}</ol>` : `<p class="note">${esc(t('rk.empty'))}</p>`) +
      (me && me.rank > 50 ? `<div class="rme">${esc(t('rk.me', { r: me.rank, s: fmt(me.me.s) }))}</div>` : '');
    const nb = $('#rkName'); if (nb) nb.onclick = () => openProfile();
  } catch (e) { el.innerHTML = `<p class="note">${esc(t('rk.err'))}</p>`; }
}
function openSettings() {
  const sw = (k, l) => `<label class="sw"><span>${esc(t(l))}</span><input type="checkbox" data-k="${k}" ${DB.set[k] ? 'checked' : ''}><i></i></label>`;
  const body = modal(`<h2 class="mh">${esc(t('set.title'))}</h2>${sw('snd', 'set.snd')}${sw('anim', 'set.anim')}
    <div class="mbtns"><button class="btn" id="setTut">${esc(t('help'))}</button><button class="btn" id="setReset">${esc(t('set.reset'))}</button></div>`);
  $$('[data-k]', body).forEach(c => { c.onchange = () => { DB.set[c.dataset.k] = c.checked ? 1 : 0; if (c.dataset.k === 'snd') { try { localStorage.setItem('atlas-sfx', c.checked ? '1' : '0'); } catch (e) {} } save(); sndIcon(); }; });
  $('#setTut').onclick = () => tutorial();
  $('#setReset').onclick = () => ask(t('set.reset.q'), [[t('q.cancel'), 'org'], [t('set.reset'), '', () => { localStorage.removeItem(KEY); location.reload(); }]]);
}
function sndIcon() { const b = $('#btnSound'); b.innerHTML = DB.set.snd ? A.ICON.sound : A.ICON.mute; b.classList.toggle('muted', !DB.set.snd); }
function applySkin() { document.body.dataset.floor = A.SKINS.some(s => s.id === DB.skin) && DB.skinOwn.includes(DB.skin) ? DB.skin : 'concrete'; }
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
  $$('#htabs button').forEach(b => { b.onclick = () => { homeTab = b.dataset.p; if (homeTab !== 'course') floorOpenId = null; if (homeTab !== 'modes') modeOpenId = null; renderHome(); }; });
  const IC = { btnAch: 'trophy', btnGacha: 'locker', btnBook: 'book', btnRank: 'rank', btnSet: 'gear', btnHelp: 'help', homeLink: 'home', gBack: 'back', gUndo: 'undo', gHint: 'hint', gRestart: 'retry' };
  for (const [id, k] of Object.entries(IC)) { const e = $('#' + id); if (e) e.insertAdjacentHTML('afterbegin', A.ICON[k]); }
  $('#btnAch').onclick = openAch; $('#btnGacha').onclick = openGacha; $('#btnBook').onclick = () => openBook(); $('#btnRank').onclick = () => openRank('m');
  $('#btnSet').onclick = openSettings; $('#btnHelp').onclick = () => tutorial();
  $('#btnSound').onclick = () => { DB.set.snd = DB.set.snd ? 0 : 1; try { localStorage.setItem('atlas-sfx', DB.set.snd ? '1' : '0'); } catch (e) {} save(); sndIcon(); if (DB.set.snd) SND.coin(); };
  $('#logo').onclick = () => { if (!$('#play').hidden) quitGame(); else { homeTab = 'daily'; floorOpenId = modeOpenId = null; renderHome(); } };
  $('#modalX').onclick = closeModal; $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  $('#gBack').onclick = quitGame; $('#gUndo').onclick = undo; $('#gHint').onclick = hint; $('#gRestart').onclick = restart;
  $('#deadEnd').onclick = undo;
  const bw = $('#boardWrap');
  bw.addEventListener('pointerdown', e => { if (e.target.closest('.result,.cd')) return; if (e.target.closest('#board')) onDown(e); });
  addEventListener('pointermove', onMove, { passive: false }); addEventListener('pointerup', e => { onUp(e); tiltEnd(e); }); addEventListener('pointercancel', e => { if (D && e.pointerId === D.id) { D.el.classList.remove('drag'); D = null; render(true); } TS = null; });
  $$('#tiltPad [data-t]').forEach(b => { b.innerHTML = A.ICON[['arrowL', 'arrowR', 'arrowU', 'arrowD'][+b.dataset.t]]; b.onclick = () => tilt(+b.dataset.t); });
  const ls = $('#langSel'); ls.value = lang; ls.onchange = () => { lang = ls.value; DB.set.lang = lang; save(); applyI18n(); renderHome(); if (G) { hud(); renderInfo(); } };
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    if (!$('#play').hidden && G && $('#modal').hidden) {
      if ((e.key === 'z' && (e.ctrlKey || e.metaKey)) || e.key === 'Backspace') { e.preventDefault(); undo(); }
      if (e.key === 'h' && !e.ctrlKey && !e.metaKey) hint();
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) restart();
      const ak = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3 }[e.key]; if (ak != null && G.P.tilt) { e.preventDefault(); tilt(ak); }
    }
  });
  document.addEventListener('visibilitychange', () => { if (G) G.paused = document.hidden || !$('#modal').hidden; });
}
async function boot() {
  bind(); applyI18n(); applySkin(); sndIcon();
  try { [ST, DL] = await Promise.all([fetch('stages.json?v=1').then(r => r.json()), fetch('daily.json?v=1').then(r => r.json())]); } catch (e) { ST = DL = null; }
  showScreen('home'); renderHome();
  if (!DB.tut.basic && !Q.has('notut')) { DB.tut.basic = 1; save(); setTimeout(tutorial, 400); }
  loginBonus();
  if (ON && ON.available) ON.init().catch(() => {});
}
// test hooks (Playwright) — read-only handles + the real game entry points
window.JBApp = { get DB() { return DB; }, get G() { return G; }, get ST() { return ST; }, get DL() { return DL; }, startStage, startDaily, startSearch, startChain, doMove, tilt, hint, nextMove, renderHome, openRank };
boot();
})();
