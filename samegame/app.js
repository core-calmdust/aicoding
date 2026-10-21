/* さめが〜め POP! — app (home portal, puzzle / action game, economy, rankings) */
(function () {
'use strict';
const E = window.SameEngine, A = window.SameArt;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'samegame-pop-v1';
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const fmt = n => Math.round(n).toLocaleString('en-US');

/* ---------------- save data ---------------- */
const DEF = () => ({ v: 1, coin: 0, life: 0, mon: {}, name: '', icon: 0, own: { 0: 1 }, bg: 'dots', bgOwn: ['dots'],
  set: { snd: 1, anim: 1, emb: 1, lang: '', skin: '' }, st: {}, dl: {}, act: { blitz: 0, rise: 0, mis: {} }, free: {},
  stats: { pops: 0, blocks: 0, big: 0, combo: 0, perfect: 0, hero: 0, fever: 0, games: 0, gacha: 0, days: 0 }, ach: {}, tut: {}, login: '' });
function load() {
  let d; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
  const b = DEF(); if (!d) return b;
  for (const k in b) if (d[k] === undefined) d[k] = b[k];
  for (const k of ['set', 'act', 'stats']) d[k] = Object.assign({}, b[k], d[k]);
  return d;
}
let DB = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} };

/* ---------------- i18n ---------------- */
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
let lang = DB.set.lang || (() => { const n = (navigator.language || 'ja').slice(0, 2); return LANGS.includes(n) ? n : 'en'; })();
function t(k, v) {
  const I = window.SAME_I18N || {};
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
let AC = null;
let gestured = false; addEventListener('pointerdown', () => { gestured = true; }, { once: true, capture: true });
function ac() { if (!gestured) return null; if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function tone(f, d = .1, type = 'square', v = .08, slide = 0, delay = 0) {
  if (!DB.set.snd) return; const a = ac(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t0 + d);
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + d + .02);
}
function noise(d = .25, v = .15) {
  if (!DB.set.snd) return; const a = ac(); if (!a) return;
  const n = a.sampleRate * d, buf = a.createBuffer(1, n, a.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const s = a.createBufferSource(), g = a.createGain(); s.buffer = buf; g.gain.value = v; s.connect(g); g.connect(a.destination); s.start();
}
const SND = {
  pop: (n, combo = 1) => { const f = 330 * 2 ** (Math.min(n, 20) / 14) * (1 + Math.min(combo - 1, 8) * .06); tone(f, .09, 'square', .07, 1.8); tone(f * 1.5, .07, 'triangle', .05, 1.4, .04); },
  bad: () => tone(140, .12, 'sawtooth', .05, .7),
  bomb: () => { noise(.35, .2); tone(90, .3, 'sine', .2, .4); },
  star: (i) => tone(660 * 2 ** (i / 4), .12, 'triangle', .08, 1.2, i * .02),
  fan: () => [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * 2 ** (s / 12), .16, 'square', .06, 1, i * .09)),
  over: () => [7, 4, 0, -5].forEach((s, i) => tone(392 * 2 ** (s / 12), .18, 'triangle', .07, 1, i * .12)),
  tick: () => tone(1200, .04, 'square', .05),
  hero: () => [0, 7, 12].forEach((s, i) => tone(660 * 2 ** (s / 12), .1, 'square', .06, 1, i * .05)),
  coin: () => { tone(988, .06, 'square', .05); tone(1319, .12, 'square', .05, 1, .06); },
  fever: () => [0, 3, 7, 10, 12, 15].forEach((s, i) => tone(440 * 2 ** (s / 12), .1, 'sawtooth', .05, 1, i * .05)),
};

/* ---------------- data: stages, themes, missions ---------------- */
let STG = null;
const THEMES = ['cl', 'tr', 'rk', 'ic', 'bm', 'wd', 'pt', 'mx'];
const TIERS = ['t.0', 't.1', 't.2', 't.3', 't.4', 't.5'];
const PER = 10, UNLOCK = 6;
const stKey = (th, j) => th + '.' + j;
const stRec = th => { const a = []; for (let j = 0; j < 50; j++) a.push(DB.st[stKey(th, j)] || 0); return a; };
const stageOpen = (recs, j) => { const s = (j / PER) | 0; if (s === 0) return true; let c = 0; for (let i = (s - 1) * PER; i < s * PER; i++) if (recs[i]) c++; return c >= UNLOCK; };
const stMedal = (recs, s) => { const r = recs.slice(s * PER, s * PER + PER); if (r.some(v => !v)) return 0; if (r.every(v => v >= 3)) return 3; if (r.every(v => v >= 2)) return 2; return 1; };
// gimmick names used in action modes
const GIM = ['hero', 'bomb', 'rock', 'ice', 'wild', 'ink'];
// action missions: m=mode, k=colors, t=seconds, g=gimmicks, goal=[type,value], s2/s3 = score for ★2/★3
const MIS = (() => {
  const L = [];
  const add = (tier, m, k, tm, g, goal, s1) => L.push({ id: L.length, tier, m, k, t: tm, g, goal, s2: Math.round(s1 * 1.6 / 100) * 100, s3: Math.round(s1 * 2.4 / 100) * 100 });
  // ROOKIE
  add(0, 'blitz', 3, 60, ['hero'], ['score', 2000], 2000);
  add(0, 'blitz', 3, 60, ['hero'], ['big', 10], 2500);
  add(0, 'blitz', 3, 60, ['hero'], ['combo', 5], 2500);
  add(0, 'blitz', 4, 60, ['hero'], ['hero', 2], 2000);
  add(0, 'blitz', 4, 60, ['hero', 'bomb'], ['score', 3000], 3000);
  add(0, 'rise', 3, 0, [], ['survive', 60], 1500);
  add(0, 'blitz', 4, 60, ['hero'], ['fever', 1], 3000);
  add(0, 'blitz', 4, 60, ['hero', 'rock'], ['score', 3000], 3000);
  add(0, 'rise', 4, 0, ['bomb'], ['survive', 60], 2000);
  add(0, 'blitz', 4, 60, ['hero', 'ice'], ['pops', 40], 3000);
  // HERO
  add(1, 'blitz', 4, 60, ['hero', 'bomb'], ['score', 5000], 5000);
  add(1, 'blitz', 4, 45, ['hero'], ['combo', 10], 4000);
  add(1, 'blitz', 5, 60, ['hero'], ['big', 10], 3500);
  add(1, 'rise', 4, 0, ['rock'], ['survive', 90], 3000);
  add(1, 'blitz', 4, 60, ['hero', 'wild'], ['score', 6000], 6000);
  add(1, 'blitz', 4, 60, ['hero', 'ink'], ['score', 4500], 4500);
  add(1, 'blitz', 5, 60, ['hero', 'bomb', 'ice'], ['fever', 2], 4500);
  add(1, 'rise', 5, 0, ['ice'], ['survive', 90], 3000);
  add(1, 'blitz', 4, 60, ['hero', 'rock', 'ice'], ['hero', 4], 4500);
  add(1, 'blitz', 5, 60, ['hero', 'ink', 'wild'], ['score', 5500], 5500);
  // LEGEND
  add(2, 'blitz', 5, 60, ['hero', 'bomb', 'rock'], ['score', 8000], 8000);
  add(2, 'blitz', 5, 45, ['hero', 'ink'], ['combo', 15], 6000);
  add(2, 'rise', 5, 0, ['rock', 'ice'], ['survive', 120], 5000);
  add(2, 'blitz', 6, 60, ['hero', 'wild'], ['big', 12], 6000);
  add(2, 'blitz', 5, 60, ['hero', 'bomb', 'ice', 'ink'], ['fever', 3], 7000);
  add(2, 'blitz', 5, 30, ['hero'], ['score', 4000], 4000);
  add(2, 'rise', 5, 0, ['rock', 'ink'], ['survive', 150], 6000);
  add(2, 'blitz', 6, 60, ['hero', 'rock', 'ice', 'wild'], ['score', 7000], 7000);
  add(2, 'blitz', 6, 60, ['hero', 'bomb', 'ink'], ['hero', 6], 7000);
  add(2, 'rise', 6, 0, ['bomb', 'rock', 'ice', 'ink'], ['survive', 180], 8000);
  return L;
})();
const MIS_TIER = ['mt.0', 'mt.1', 'mt.2'];

/* ---------------- daily ---------------- */
const DAILY_GIM = ['', 'rk', 'ic', 'bm', 'wd', 'pt', 'mx'];
function dailyCfg(date) {
  const h = E.hashStr('same-' + date), r = E.rng(h);
  const g = DAILY_GIM[h % DAILY_GIM.length];
  const sp = { '': {}, rk: { rock: 7 }, ic: { ice: 14 }, bm: { bomb: 6 }, wd: { wild: 4 }, pt: { paint: 5 }, mx: { rock: 3, bomb: 3, ice: 6 } }[g];
  return { g, board: E.randomBoard(10, 14, 4, r, sp), seed: h };
}
const dlRec = (date) => DB.dl[date] || (DB.dl[date] = { p: { s: 0, left: -1, md: 0 }, b: { s: 0, a: 0 } });
const medalFor = left => left === 0 ? 3 : left <= 5 ? 2 : left <= 15 ? 1 : 0;
function streak() {
  let n = 0; const d = new Date();
  for (;;) { const r = DB.dl[ymd(d)]; if (r && (r.p.left >= 0 || r.b.a > 0)) { n++; d.setDate(d.getDate() - 1); } else if (n === 0 && ymd(d) === today()) { d.setDate(d.getDate() - 1); } else break; if (n > 999) break; }
  return n;
}

/* ---------------- coins / achievements ---------------- */
function addCoin(n, why) {
  n = Math.max(0, Math.round(n)); if (!n) return 0;
  DB.coin += n; DB.life += n; const ym = today().slice(0, 7); DB.mon[ym] = (DB.mon[ym] || 0) + n; save(); updateCoins();
  pushScores();
  return n;
}
const ACH = [
  // id, group, test(stats) → [value, goal], reward
  ['first', s => [s.pops, 1], 30], ['pops100', s => [s.pops, 100], 80], ['pops1k', s => [s.pops, 1000], 300], ['pops5k', s => [s.pops, 5000], 800],
  ['big10', s => [s.big, 10], 80], ['big20', s => [s.big, 20], 200], ['big30', s => [s.big, 30], 500],
  ['perf1', s => [s.perfect, 1], 100], ['perf10', s => [s.perfect, 10], 300], ['perf50', s => [s.perfect, 50], 800],
  ['combo10', s => [s.combo, 10], 100], ['combo20', s => [s.combo, 20], 300], ['combo30', s => [s.combo, 30], 600],
  ['hero10', s => [s.hero, 10], 100], ['hero50', s => [s.hero, 50], 400],
  ['fever5', s => [s.fever, 5], 100], ['fever30', s => [s.fever, 30], 400],
  ['st10', () => [Object.values(DB.st).filter(v => v).length, 10], 100], ['st100', () => [Object.values(DB.st).filter(v => v).length, 100], 400], ['st400', () => [Object.values(DB.st).filter(v => v).length, 400], 2000],
  ['star3x50', () => [Object.values(DB.st).filter(v => v >= 3).length, 50], 400],
  ['theme1', () => [THEMES.filter(th => stRec(th).every(v => v)).length, 1], 500],
  ['mis10', () => [Object.values(DB.act.mis).filter(v => v).length, 10], 200], ['mis30', () => [Object.values(DB.act.mis).filter(v => v).length, 30], 800], ['mis3s', () => [Object.values(DB.act.mis).filter(v => v >= 3).length, 30], 1500],
  ['daily7', () => [streak(), 7], 300], ['daily30', () => [streak(), 30], 1000],
  ['gold10', () => [Object.values(DB.dl).filter(r => r.p.md >= 3).length, 10], 500],
  ['blitz10k', () => [DB.act.blitz, 10000], 300], ['rise10k', () => [DB.act.rise, 10000], 300],
  ['col30', () => [Object.keys(DB.own).length, 30], 300], ['col100', () => [Object.keys(DB.own).length, 100], 3000],
];
const achDone = () => ACH.filter(([id, f]) => { const [v, g] = f(DB.stats); return v >= g && !DB.ach[id]; }).length;
function updateBadges() { const n = achDone(); $('#btnAch .dot').style.display = n ? 'block' : 'none'; }

/* ---------------- online rankings ---------------- */
const ON = window.SameOnline;
async function pushScores() {
  if (!ON || !ON.available || !DB.name) return;
  const ym = today().slice(0, 7), who = { n: DB.name, i: DB.icon };
  try { await ON.putScore('same/m/' + ym, Object.assign({ s: DB.mon[ym] || 0 }, who)); await ON.putScore('same/t', Object.assign({ s: DB.life }, who)); } catch (e) {}
}

/* ============================================================ HOME ============================================================ */
let homeTab = 'daily', themeOpen = null;
function updateCoins() { $$('.coinv').forEach(e => e.textContent = fmt(DB.coin)); }
const SKINS = ['mid', 'vintage', 'pop', 'riso', 'night', 'swiss', 'wa', 'pixel'];
const SKIN_FONTS = { swiss: 'Archivo+Black', wa: 'Shippori+Mincho+B1:wght@600;800', mid: 'Josefin+Sans:wght@600;700', pixel: 'DotGothic16' };
function applySkin() {
  const q = new URLSearchParams(location.search).get('skin');
  const sk = SKINS.includes(q) ? q : (SKINS.includes(DB.set.skin) ? DB.set.skin : 'mid');
  document.body.dataset.skin = sk; A.setStyle(sk === 'mid' ? 'mid' : 'pop'); A.syncPalette(); setBg(); setWords();
  if (SKIN_FONTS[sk] && !document.getElementById('font-' + sk)) { const l = document.createElement('link'); l.id = 'font-' + sk; l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${SKIN_FONTS[sk]}&display=swap`; document.head.appendChild(l); }
}
function setBg() { const b = A.BGS.find(x => x.id === DB.bg) || A.BGS[0]; $('#bg').style.background = b.css(); document.body.dataset.bg = b.id; }
function profCard() {
  const lv = Math.floor(Math.sqrt(DB.life / 50)) + 1;
  $('#profCard').innerHTML = `<button class="pic" id="pfEdit" aria-label="${esc(t('pf.edit'))}">${A.charSVG(DB.icon)}</button>
    <div class="pinfo"><b class="pname">${esc(DB.name || t('pf.guest'))}</b><span class="plv">LV.${lv}</span></div>
    <div class="pcoin">${A.ICON.coin}<b class="coinv">${fmt(DB.coin)}</b></div>
    <div class="pstreak"><b>${streak()}</b><span>${esc(t('pf.streak'))}</span></div>`;
  $('#pfEdit').onclick = openProfile;
}
function renderHome() {
  profCard(); updateCoins(); updateBadges();
  $$('#htabs button').forEach(b => b.classList.toggle('on', b.dataset.p === homeTab));
  $$('.hpanel').forEach(p => p.hidden = p.dataset.p !== homeTab);
  if (homeTab === 'daily') renderDaily();
  if (homeTab === 'stage') themeOpen ? renderTheme(themeOpen) : renderThemes();
  if (homeTab === 'action') renderAction();
}
function miniBoard(b, cls = 'mini') {
  const w = b.length, h = Math.max(...b.map(c => c.length));
  let s = `<svg viewBox="0 0 ${w * 10} ${h * 10}" class="${cls}">`;
  b.forEach((c, x) => c.forEach((v, y) => {
    const ty = E.typ(v), fill = ty === E.T.ROCK ? '#a8a8a8' : ty === E.T.WILD ? '#fff' : A.BC[E.col(v)];
    s += `<rect x="${x * 10 + .5}" y="${(h - 1 - y) * 10 + .5}" width="9" height="9" style="fill:${fill};stroke:var(--ink)" stroke-width="1"/>`;
    if (ty === E.T.ICE) s += `<rect x="${x * 10 + 2}" y="${(h - 1 - y) * 10 + 2}" width="6" height="6" fill="#BFE9FF" opacity=".8"/>`;
    if (ty === E.T.BOMB) s += `<circle cx="${x * 10 + 5}" cy="${(h - 1 - y) * 10 + 5}" r="2.6" fill="#000"/>`;
  }));
  return s + '</svg>';
}
function renderDaily() {
  const d = today(), cfg = dailyCfg(d), r = dlRec(d);
  const gname = cfg.g ? t('th.' + cfg.g) : t('th.cl');
  const md = r.p.md;
  $('#dPuzzle').innerHTML = `<div class="ptag">${esc(t('d.puzzle'))}<i>${esc(d.slice(5).replace('-', '/'))}</i></div>
    <div class="dbody"><div class="dthumb">${miniBoard(cfg.board)}</div>
    <div class="dinfo"><h3>${esc(t('d.puzzle.h'))}</h3><p>${esc(t('d.puzzle.d'))}</p>
    <div class="chips"><span class="chip">${A.themeIcon(cfg.g || 'cl')}${esc(gname)}</span><span class="chip">10×14 · 4${esc(t('u.colors'))}</span></div>
    <div class="dbest"><span>${esc(t('d.best'))}</span><b>${r.p.left >= 0 ? fmt(r.p.s) : '—'}</b>${md ? `<i class="medal m${md}"></i>` : ''}</div></div></div>
    <div class="dbtns"><button class="btn big red" id="dPlay">${A.ICON.play}${esc(t(r.p.left >= 0 ? 'd.again' : 'd.play'))}</button><button class="btn" data-rank="p">${A.ICON.rank}${esc(t('rk.title'))}</button></div>
    <p class="note">${esc(t('d.medals'))}</p>`;
  const left = 3 - r.b.a;
  $('#dBlitz').innerHTML = `<div class="ptag blue">${esc(t('d.blitz'))}<i>60s</i></div>
    <div class="dbody"><div class="dthumb burstbox">${A.burst(12, 46, 30, 'var(--yel)')}<b>60</b></div>
    <div class="dinfo"><h3>${esc(t('d.blitz.h'))}</h3><p>${esc(t('d.blitz.d'))}</p>
    <div class="dbest"><span>${esc(t('d.best'))}</span><b>${r.b.a ? fmt(r.b.s) : '—'}</b></div>
    <div class="tries">${[0, 1, 2].map(i => `<i class="${i < r.b.a ? 'used' : ''}"></i>`).join('')}<span>${esc(t('d.tries', { n: left }))}</span></div></div></div>
    <div class="dbtns"><button class="btn big blue" id="bPlay" ${left <= 0 ? 'disabled' : ''}>${A.ICON.play}${esc(t(left > 0 ? 'd.play' : 'd.done'))}</button><button class="btn" data-rank="b">${A.ICON.rank}${esc(t('rk.title'))}</button></div>`;
  $('#dPlay').onclick = () => startDaily();
  $('#bPlay').onclick = () => { if (3 - dlRec(today()).b.a > 0) startBlitzDaily(); };
  $$('[data-rank]', $('#home')).forEach(b => b.onclick = () => openRank(b.dataset.rank));
  renderCal();
  renderFree();
}
let calOff = 0;
function renderCal() {
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + calOff);
  const y = base.getFullYear(), m = base.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), td = today();
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<i></i>';
  let gold = 0, played = 0;
  for (let d = 1; d <= days; d++) {
    const k = `${y}-${pad(m + 1)}-${pad(d)}`, r = DB.dl[k], md = r ? r.p.md : 0, bl = r && r.b.a > 0;
    if (md >= 3) gold++; if (r && (r.p.left >= 0 || bl)) played++;
    cells += `<span class="${k === td ? 'today' : ''} ${md ? 'm' + md : ''}">${md ? '<i class="medal m' + md + '"></i>' : `<b>${d}</b>`}${bl ? '<em></em>' : ''}</span>`;
  }
  $('#dCal').innerHTML = `<div class="calh"><button class="ib sm" id="calP">${A.ICON.back}</button><b>${y}.${pad(m + 1)}</b><button class="ib sm flip" id="calN" ${calOff >= 0 ? 'disabled' : ''}>${A.ICON.back}</button></div>
    <div class="calw">${[0, 1, 2, 3, 4, 5, 6].map(i => `<i>${esc(t('wd.' + i))}</i>`).join('')}</div><div class="calg">${cells}</div>
    <div class="calsum"><span><i class="medal m3"></i>×${gold}</span><span>${esc(t('cal.played', { n: played }))}</span><span class="stk">${esc(t('cal.streak', { n: streak() }))}</span></div>`;
  $('#calP').onclick = () => { calOff--; renderCal(); };
  $('#calN').onclick = () => { if (calOff < 0) { calOff++; renderCal(); } };
}
const FREE_SIZES = [[8, 8], [10, 12], [12, 16]];
let freeSz = 1, freeK = 4;
function renderFree() {
  const best = DB.free[`${freeSz}.${freeK}`] || 0;
  $('#dFree').innerHTML = `<div class="ptag yel">${esc(t('f.title'))}</div><p class="sub">${esc(t('f.desc'))}</p>
    <div class="frow"><span>${esc(t('f.size'))}</span>${FREE_SIZES.map(([w, h], i) => `<button class="chipb ${i === freeSz ? 'on' : ''}" data-sz="${i}">${w}×${h}</button>`).join('')}</div>
    <div class="frow"><span>${esc(t('f.colors'))}</span>${[3, 4, 5, 6].map(k => `<button class="chipb ${k === freeK ? 'on' : ''}" data-k="${k}">${k}</button>`).join('')}</div>
    <div class="dbtns"><div class="dbest"><span>${esc(t('d.best'))}</span><b>${best ? fmt(best) : '—'}</b></div><button class="btn yel" id="fPlay">${A.ICON.play}${esc(t('d.play'))}</button></div>`;
  $$('[data-sz]', $('#dFree')).forEach(b => b.onclick = () => { freeSz = +b.dataset.sz; renderFree(); });
  $$('[data-k]', $('#dFree')).forEach(b => b.onclick = () => { freeK = +b.dataset.k; renderFree(); });
  $('#fPlay').onclick = startFree;
}
const THEME_COL = ['#19A35B', '#5BD3E8', 'var(--mute)', '#6A93F2', 'var(--red)', 'var(--yel)', '#FF4FA0', '#7B3FD0'];
function renderThemes() {
  const el = $('#stagePanel');
  let html = `<div class="sechead"><h2>${esc(t('st.h'))}</h2><p>${esc(t('st.d'))}</p></div><div class="tgrid">`;
  THEMES.forEach((th, i) => {
    const recs = stRec(th), done = recs.filter(v => v).length, stars = recs.reduce((a, b) => a + b, 0), comp = done === 50;
    html += `<button class="tcard ${comp ? 'comp' : ''}" data-th="${th}" style="--tc:${THEME_COL[i]}">
      <span class="tic">${A.themeIcon(th)}</span>
      <span class="tt"><b>${esc(t('th.' + th))}</b><small>${esc(t('th.' + th + '.d'))}</small>
      <span class="bar"><i style="width:${done * 2}%"></i></span>
      <span class="tmeta"><em>${done}/50</em><em class="st">★ ${stars}/150</em><span class="medals">${[0, 1, 2, 3, 4].map(s => `<i class="medal m${stMedal(recs, s)}"></i>`).join('')}</span></span></span>
      ${comp ? `<span class="crown">${esc(t('st.comp'))}</span>` : ''}</button>`;
  });
  el.innerHTML = html + '</div>';
  $$('.tcard', el).forEach(b => b.onclick = () => { themeOpen = b.dataset.th; renderTheme(themeOpen); maybeThemeTip(themeOpen); });
}
function renderTheme(th) {
  const el = $('#stagePanel'), recs = stRec(th), ti = THEMES.indexOf(th);
  let next = recs.findIndex((v, j) => !v && stageOpen(recs, j));
  let html = `<div class="thead" style="--tc:${THEME_COL[ti]}"><button class="btn sm" id="thBack">${A.ICON.back}${esc(t('u.list'))}</button>
    <span class="tic">${A.themeIcon(th)}</span><div><h2>${esc(t('th.' + th))}</h2><p>${esc(t('th.' + th + '.r'))}</p>${th !== 'cl' ? `<button class="btn sm" id="thRule">${A.ICON.play}${esc(t('st.demo'))}</button>` : ''}</div>
    <div class="ring" style="--p:${recs.filter(v => v).length * 2}"><b>${recs.filter(v => v).length}</b><small>/50</small></div></div>`;
  html += '<div class="stgs">';
  for (let s = 0; s < 5; s++) {
    const open = stageOpen(recs, s * PER), md = stMedal(recs, s), cl = recs.slice(s * PER, s * PER + PER).filter(v => v).length;
    const need = s ? Math.max(0, UNLOCK - recs.slice((s - 1) * PER, s * PER).filter(v => v).length) : 0;
    html += `<section class="stg tier${s}"><div class="stgh"><b>STAGE ${s + 1}</b><span class="tier">${esc(t(TIERS[s]))}</span><span class="cnt">${cl}/10</span>${md ? `<i class="medal m${md}"></i>` : ''}</div>`;
    if (!open) html += `<div class="locked">${A.ICON.lock}${esc(t('st.lock', { s, n: need }))}</div>`;
    else {
      html += '<div class="tiles">';
      for (let j = s * PER; j < s * PER + PER; j++) html += `<button class="tile ${recs[j] ? 'done' : ''} ${j === next ? 'next' : ''}" data-j="${j}"><b>${j + 1}</b><span class="stars">${'★'.repeat(recs[j])}${'☆'.repeat(3 - recs[j])}</span>${j === next ? '<i>NEXT</i>' : ''}</button>`;
      html += '</div>';
    }
    html += '</section>';
  }
  html += '</div>';
  el.innerHTML = html;
  $('#thBack').onclick = () => { themeOpen = null; renderThemes(); };
  const tr = $('#thRule'); if (tr) tr.onclick = () => maybeThemeTip(th, true);
  $$('.tile', el).forEach(b => b.onclick = () => startStage(th, +b.dataset.j));
}
function renderAction() {
  const el = $('#actPanel');
  let html = `<div class="acards">
    <div class="card acard red"><div class="ptag">BLITZ</div><div class="abig">${A.burst(14, 47, 31, 'var(--yel)')}<b>60</b></div><h3>${esc(t('a.blitz'))}</h3><p>${esc(t('a.blitz.d'))}</p><div class="dbest"><span>${esc(t('d.best'))}</span><b>${DB.act.blitz ? fmt(DB.act.blitz) : '—'}</b></div><button class="btn big yel" id="aBlitz">${A.ICON.play}${esc(t('d.play'))}</button></div>
    <div class="card acard blue"><div class="ptag yel">RISE</div><div class="abig rise"><i></i><i></i><i></i><i></i></div><h3>${esc(t('a.rise'))}</h3><p>${esc(t('a.rise.d'))}</p><div class="dbest"><span>${esc(t('d.best'))}</span><b>${DB.act.rise ? fmt(DB.act.rise) : '—'}</b></div><button class="btn big yel" id="aRise">${A.ICON.play}${esc(t('d.play'))}</button></div>
  </div><div class="sechead"><h2>${esc(t('m.h'))}</h2><p>${esc(t('m.d'))}</p></div>`;
  for (let tier = 0; tier < 3; tier++) {
    const list = MIS.filter(m => m.tier === tier), stars = list.reduce((a, m) => a + (DB.act.mis[m.id] || 0), 0);
    const prev = tier ? MIS.filter(m => m.tier === tier - 1 && DB.act.mis[m.id]).length : 10, open = prev >= UNLOCK;
    html += `<section class="mtier mt${tier}"><div class="stgh"><b>${esc(t(MIS_TIER[tier]))}</b><span class="cnt">★ ${stars}/30</span></div>`;
    if (!open) html += `<div class="locked">${A.ICON.lock}${esc(t('m.lock', { n: UNLOCK - prev }))}</div>`;
    else html += '<div class="mlist">' + list.map(m => `<button class="mis" data-m="${m.id}"><b class="mno">${m.id + 1}</b><span class="mtx"><b>${esc(goalText(m))}</b><small>${esc(t('a.' + m.m))}${m.t ? ' ' + m.t + 's' : ''} · ${m.k}${esc(t('u.colors'))}${m.g.filter(x => x !== 'hero').map(g => ' · ' + t('g.' + g)).join('')}</small></span><span class="stars">${'★'.repeat(DB.act.mis[m.id] || 0)}${'☆'.repeat(3 - (DB.act.mis[m.id] || 0))}</span></button>`).join('') + '</div>';
    html += '</section>';
  }
  el.innerHTML = html;
  $('#aBlitz').onclick = () => startAction({ kind: 'blitz', m: 'blitz', k: 4, t: 60, g: ['hero', 'bomb'] });
  $('#aRise').onclick = () => startAction({ kind: 'rise', m: 'rise', k: 4, t: 0, g: ['bomb'] });
  $$('.mis', el).forEach(b => b.onclick = () => { const m = MIS[+b.dataset.m]; startAction({ kind: 'mission', m: m.m, k: m.k, t: m.t, g: m.g, mis: m }); });
}
const goalText = m => t('goal.' + m.goal[0], { n: m.goal[0] === 'score' ? fmt(m.goal[1]) : m.goal[1] });

/* ============================================================ GAME ============================================================ */
let G = null; // current game
const boardEl = () => $('#board');
function showScreen(id) { $$('.screen').forEach(s => s.hidden = s.id !== id); document.body.dataset.screen = id; window.scrollTo(0, 0); }
function newGame(cfg) {
  stopLoop();
  const g = Object.assign({ min: 2, keep: false, score: 0, hist: [], combo: 0, maxCombo: 0, lastPop: 0, fever: 0, feverT: 0, feverN: 0, heroN: 0, pops: 0, big: 0, over: false, busy: false, hinted: false, undone: false, retried: false, elapsed: 0 }, cfg);
  g.board = E.clone(cfg.board); g.init = E.clone(cfg.board);
  g.cols = g.board.length; g.rows = g.rowsMax || Math.max(...g.board.map(c => c.length));
  g.rnd = E.rng(cfg.seed || (Date.now() & 0x7fffffff));
  G = g; return g;
}
let uid = 1;
function mkEl(v) {
  const d = document.createElement('div'); d.className = 'blk'; d.dataset.u = uid++; paintEl(d, v); return d;
}
function paintEl(d, v) {
  const ty = E.typ(v), c = E.col(v);
  d.className = 'blk ' + (ty === E.T.ROCK ? 'rock' : ty === E.T.WILD ? 'wild' : 'c' + c) + (ty === E.T.ICE ? ' ice' : '') + (ty === E.T.BOMB ? ' bomb' : '') + (ty === E.T.PAINT ? ' paint' : '');
  const sym = ty === E.T.ROCK ? 'emRock' : ty === E.T.WILD ? 'emWild' : ty === E.T.BOMB ? 'emBomb' : ty === E.T.PAINT ? 'emPaint' : 'em' + c;
  d.innerHTML = `<svg><use href="#${sym}"/></svg>`;
}
function cellSize() {
  const wrap = $('#boardWrap'), r = wrap.getBoundingClientRect();
  const wide = matchMedia('(min-width:1000px)').matches;
  const availW = r.width - 16, availH = Math.max(200, window.innerHeight - r.top - (wide ? 30 : ($('#gfoot').offsetHeight || 60) + 18));
  return Math.max(18, Math.min(wide ? 84 : 64, Math.floor(Math.min(availW / G.cols, availH / G.rows))));
}
const pos = (x, y) => `translate(${x * G.cs}px, ${(G.rows - 1 - y) * G.cs}px)`;
function buildBoard() {
  const b = boardEl(); b.innerHTML = ''; G.cs = cellSize();
  b.style.width = G.cols * G.cs + 'px'; b.style.height = G.rows * G.cs + 'px'; b.style.setProperty('--cs', G.cs + 'px');
  b.classList.toggle('noemb', !DB.set.emb);
  G.els = G.board.map((c, x) => c.map((v, y) => { const d = mkEl(v); d._v = v; d.style.transform = pos(x, y); b.appendChild(d); return d; }));
  if (G.mode === 'rise') { const dl = document.createElement('div'); dl.className = 'danger'; dl.style.top = G.cs * 2 + 'px'; b.appendChild(dl); }
}
function relayout() { if (!G || $('#play').hidden) return; const cs = cellSize(); if (cs === G.cs) return; G.cs = cs; const b = boardEl(); b.style.width = G.cols * cs + 'px'; b.style.height = G.rows * cs + 'px'; b.style.setProperty('--cs', cs + 'px'); b.classList.add('nomove'); G.els.forEach((c, x) => c.forEach((d, y) => d.style.transform = pos(x, y))); const dl = $('.danger', b); if (dl) dl.style.top = cs * 2 + 'px'; requestAnimationFrame(() => b.classList.remove('nomove')); }
addEventListener('resize', relayout);
function hud() {
  if (!G) return;
  $('#gScore').textContent = fmt(G.score);
  const sub = $('#gSub');
  if (G.timed) { const s = Math.max(0, G.tLeft); sub.innerHTML = `<b class="${s < 10 ? 'low' : ''}">${Math.ceil(s)}</b><small>${esc(t('u.sec'))}</small>`; }
  else if (G.mode === 'rise') sub.innerHTML = `<b>${Math.floor(G.elapsed)}</b><small>${esc(t('u.sec'))}</small>`;
  else sub.innerHTML = `<b>${E.count(G.board)}</b><small>${esc(t('u.left'))}</small>`;
  $('#gUndo').hidden = !G.undoable; $('#gHint').hidden = G.kind !== 'stage';
  $('#gUndo').disabled = !G.hist.length || G.over;
  const fv = $('#fever'); fv.hidden = !G.action; $('#riseWrap').hidden = G.mode !== 'rise';
  if (G.action) { $('#feverBar').style.width = (G.feverT > 0 ? G.feverT / FEVER_T * 100 : G.fever / FEVER_MAX * 100) + '%'; fv.classList.toggle('on', G.feverT > 0); $('#comboV').textContent = G.combo > 1 ? 'x' + G.combo : ''; }
}
function renderInfo() {
  const k = G.kind, types = new Set(); G.board.forEach(c => c.forEach(v => types.add(E.typ(v))));
  if (G.gim) { if (G.gim.has('bomb')) types.add(E.T.BOMB); if (G.gim.has('rock')) types.add(E.T.ROCK); if (G.gim.has('ice')) types.add(E.T.ICE); if (G.gim.has('wild')) types.add(E.T.WILD); }
  let rule = k === 'stage' ? t('th.' + G.th + '.r') : k === 'daily' ? t('d.puzzle.d') + ' ' + t('d.medals') : k === 'free' ? t('th.cl.r') : (G.mode === 'rise' ? t('a.rise.d') : t('a.blitz.d')) + ' ' + t('tu.a2') ;
  if (k === 'mission') rule = goalText(G.mis) + '。' + t('r.mstar', { a: fmt(G.mis.s2), b: fmt(G.mis.s3) });
  const TY = [[E.T.ROCK, E.mk(0, E.T.ROCK), 'rk'], [E.T.ICE, E.mk(1, E.T.ICE), 'ic'], [E.T.BOMB, E.mk(0, E.T.BOMB), 'bm'], [E.T.WILD, E.mk(0, E.T.WILD), 'wd'], [E.T.PAINT, E.mk(3, E.T.PAINT), 'pt']];
  const leg = TY.filter(([ty]) => types.has(ty)).map(([, v, th]) => { const d = mkEl(v); return `<li><span class="lg">${d.outerHTML}</span><span><b>${esc(t('th.' + th))}</b><br>${esc(t('th.' + th + '.d'))}</span></li>`; }).join('')
    + (G.gim && G.gim.has('hero') ? `<li><span class="lg">${A.mascot('wow')}</span><span><b>${esc(t('g.hero'))}</b><br>${esc(t('tu.a4.h'))} +3s</span></li>` : '')
    + (G.gim && G.gim.has('ink') ? `<li><span class="lg" style="background:#111;border:2px solid #000"></span><span><b>${esc(t('g.ink'))}</b><br>${esc(t('tu.a4'))}</span></li>` : '');
  const best = k === 'stage' ? '★'.repeat(DB.st[stKey(G.th, G.j)] || 0) || '—' : k === 'daily' ? (dlRec(G.date).p.left >= 0 ? fmt(dlRec(G.date).p.s) : '—') : k === 'free' ? (DB.free[G.fk] ? fmt(DB.free[G.fk]) : '—') : k === 'dblitz' ? fmt(dlRec(G.date).b.s || 0) : k === 'mission' ? '★'.repeat(DB.act.mis[G.mis.id] || 0) || '—' : fmt(DB.act[G.mode === 'rise' ? 'rise' : 'blitz'] || 0);
  $('#gInfo').innerHTML = `<h4>${esc(t('gi.rule'))}</h4><p style="margin:0 0 10px">${esc(rule)}</p>${leg ? `<h4>${esc(t('gi.blocks'))}</h4><ul>${leg}</ul>` : ''}
    <div class="best"><span>${esc(t('d.best'))}</span><b>${best}</b></div>${G.undoable ? `<div class="keys"><kbd>Ctrl</kbd>+<kbd>Z</kbd> ${esc(t('g.undo'))}${k === 'stage' ? `　<kbd>H</kbd> ${esc(t('g.hint'))}` : ''}</div>` : ''}`;
}
function startPlay(title, sub) {
  showScreen('play');
  $('#gTitle').textContent = title; $('#gTitleSub').textContent = sub || '';
  renderInfo();
  $('#gameMsg').innerHTML = ''; $('#gameMsg').hidden = true;
  requestAnimationFrame(() => { buildBoard(); hud(); });
}
// ---- starts
function startStage(th, j) {
  if (!STG) { toast(t('err.load')); return; }
  const T = STG.themes[THEMES.indexOf(th)], s = (j / PER) | 0, p = T.stages[s].p[j % PER];
  newGame({ kind: 'stage', th, j, board: E.dec(p.b), min: T.min, sol: p.sol, undoable: true });
  startPlay(`${t('th.' + th)} ${j + 1}`, t('st.goal') + (T.min === 3 ? ' · ' + t('th.tr.r') : ''));
}
function startDaily() {
  const d = today(), cfg = dailyCfg(d);
  newGame({ kind: 'daily', date: d, board: cfg.board, undoable: true });
  startPlay(t('d.puzzle'), d.replace(/-/g, '/') + (cfg.g ? ' · ' + t('th.' + cfg.g) : ''));
}
function startFree() {
  const [w, h] = FREE_SIZES[freeSz];
  newGame({ kind: 'free', board: E.randomBoard(w, h, freeK, E.rng(Date.now() & 0x7fffffff)), undoable: true, fk: `${freeSz}.${freeK}` });
  startPlay(t('f.title'), `${w}×${h} · ${freeK}${t('u.colors')}`);
}
function startBlitzDaily() {
  const d = today(), r = dlRec(d); r.b.a++; save();
  startAction({ kind: 'dblitz', m: 'blitz', k: 4, t: 60, g: ['hero', 'bomb'], seed: E.hashStr('blitz-' + d), date: d });
}
const FEVER_MAX = 70, FEVER_T = 6;
function startAction(o) {
  if (!DB.tut.action) { DB.tut.action = 1; save(); return tutorial('action', () => startAction(o)); }
  const rows = o.m === 'rise' ? 12 : 10, cols = 8;
  const rnd = E.rng(o.seed || (Date.now() & 0x7fffffff));
  const g = { kind: o.kind, mis: o.mis, date: o.date, gim: new Set(o.g), k: o.k, action: true, keep: true, timed: o.m === 'blitz', tLeft: o.t || 60, tTotal: o.t || 60, rowsMax: rows, mode: o.m, seed: o.seed };
  const startH = o.m === 'rise' ? 5 : rows;
  g.board = []; for (let x = 0; x < cols; x++) { const c = []; for (let y = 0; y < startH; y++) c.push(randCell(o.k, rnd, g.gim, true)); g.board.push(c); }
  newGame(g); G.rnd = rnd; G.riseT = 0; G.riseEvery = 6.5; G.nextHero = 7 + rnd() * 4; G.nextInk = 12 + rnd() * 6;
  const title = o.kind === 'mission' ? `${t('m.no', { n: o.mis.id + 1 })}` : o.kind === 'dblitz' ? t('d.blitz') : t('a.' + o.m);
  startPlay(title, o.kind === 'mission' ? goalText(o.mis) : '');
  countdown(() => { G.t0 = performance.now(); G.last = G.t0; loop(); });
}
function randCell(k, rnd, gim, initial) {
  const r = rnd(), c = (rnd() * k) | 0;
  if (gim.has('bomb') && r < .025) return E.mk(c, E.T.BOMB);
  if (gim.has('rock') && r > .965) return E.mk(0, E.T.ROCK);
  if (gim.has('ice') && r > .91 && r <= .965) return E.mk(c, E.T.ICE);
  if (gim.has('wild') && r > .025 && r < .045) return E.mk(0, E.T.WILD);
  return c;
}
function countdown(done) {
  const m = $('#gameMsg'); m.hidden = false; G.busy = true;
  const seq = ['3', '2', '1', 'GO!']; let i = 0;
  const step = () => {
    if (!G) return;
    if (i >= seq.length) { m.hidden = true; m.innerHTML = ''; G.busy = false; done(); return; }
    m.innerHTML = `<div class="cd">${A.burst(12, 46, 32, i === 3 ? 'var(--red)' : 'var(--yel)')}<b>${seq[i]}</b></div>`;
    tone(i === 3 ? 880 : 440, .12, 'square', .07); i++; setTimeout(step, i === 4 ? 500 : 650);
  };
  step();
}
// ---- input
function cellAt(ev) {
  const r = boardEl().getBoundingClientRect(), x = Math.floor((ev.clientX - r.left) / G.cs), yy = Math.floor((ev.clientY - r.top) / G.cs);
  if (x < 0 || x >= G.cols || yy < 0 || yy >= G.rows) return null;
  return [x, G.rows - 1 - yy];
}
function onTap(ev) {
  if (!G || G.busy || G.over) return;
  ac();
  const c = cellAt(ev); if (!c) return;
  const [x, y] = c; if (y >= G.board[x].length) return;
  play(x, y);
}
let hoverKey = '';
function onHover(ev) {
  if (!G || G.busy || G.over || G.action || ev.pointerType === 'touch') return;
  const c = cellAt(ev); const k = c ? c.join(',') : '';
  if (k === hoverKey) return; hoverKey = k; clearHover();
  if (!c || c[1] >= G.board[c[0]].length) return;
  const g = E.group(G.board, c[0], c[1]); if (g.length < G.min) return;
  g.forEach(([gx, gy]) => G.els[gx][gy].classList.add('hl'));
  const pv = $('#preview'); pv.hidden = false; pv.textContent = '+' + fmt(E.points(g.length, G.min));
}
function clearHover() { if (G && G.els) G.els.forEach(c => c.forEach(d => d.classList.remove('hl', 'hint'))); $('#preview').hidden = true; }
// ---- the move
const WORDS_BY = {
  wa: [[13, 'ドドン！'], [9, 'ドン！'], [6, 'バン！'], [4, 'パン！'], [0, 'ポン']],
  pixel: [[13, 'EXCELLENT!'], [9, 'GREAT!'], [6, 'NICE!'], [4, 'GOOD!'], [0, 'OK']],
};
const WORDS_POP = [[13, 'WHAAM!'], [9, 'BAM!'], [6, 'POW!'], [4, 'ZAP!'], [0, 'POP!']];
const WORDS = WORDS_POP.slice();
function setWords() { const w = WORDS_BY[document.body.dataset.skin] || WORDS_POP; WORDS.splice(0, WORDS.length, ...w); }
function play(x, y) {
  const v = G.board[x][y], ty = E.typ(v);
  let min = G.min; if (G.feverT > 0) min = 1;
  let g = E.group(G.board, x, y);
  if (g.length < min) {
    if (G.action && ty === E.T.BOMB) g = [[x, y]];
    else { if (E.tappable(v) || ty === E.T.ICE || ty === E.T.ROCK || ty === E.T.WILD) { const d = G.els[x][y]; d.classList.remove('nope'); void d.offsetWidth; d.classList.add('nope'); } SND.bad(); if (G.action) G.combo = 0; hud(); return; }
  }
  clearHover(); hoverKey = '';
  if (G.undoable) G.hist.push({ b: G.board, s: G.score, pi: G.pi });
  if (G.kind === 'stage') { G.pi = G.pi || 0; if (G.pi >= 0 && G.sol && G.sol[G.pi] !== undefined) { const sv = G.sol[G.pi]; G.pi = g.some(([a, c]) => a === sv >> 4 && c === (sv & 15)) ? G.pi + 1 : -1; } }
  const r = E.remove(G.board, g, { min: G.min, keep: G.keep });
  // scoring
  let pts;
  const now = performance.now();
  if (G.action) {
    G.combo = (now - G.lastPop < 1800 && G.combo) ? G.combo + 1 : 1; G.lastPop = now; G.maxCombo = Math.max(G.maxCombo, G.combo);
    const mult = (1 + Math.min(G.combo - 1, 10) * .2) * (G.feverT > 0 ? 2 : 1);
    pts = Math.round(r.n * (r.n + 1) * 5 * mult);
    if (G.timed) { const bonus = r.n >= 15 ? 3 : r.n >= 10 ? 2 : r.n >= 7 ? 1 : 0; if (bonus) { G.tLeft += bonus; floatText(`+${bonus}s`, 'time'); } }
    if (G.feverT <= 0) { G.fever += r.n; if (G.fever >= FEVER_MAX) { G.fever = 0; G.feverT = FEVER_T; G.feverN++; DB.stats.fever++; SND.fever(); boardEl().classList.add('fev'); floatText('FEVER!', 'fever'); } }
  } else pts = r.score;
  G.score += pts; G.pops++; G.big = Math.max(G.big, r.nG);
  DB.stats.pops++; DB.stats.blocks += r.n; DB.stats.big = Math.max(DB.stats.big, r.nG); DB.stats.combo = Math.max(DB.stats.combo, G.combo);
  // animate removal
  const b = boardEl(); let cx = 0, cy = 0;
  r.removed.forEach(([rx, ry, , why]) => {
    const d = G.els[rx][ry]; cx += rx; cy += ry;
    d.classList.add(why === 'b' ? 'blast' : why === 'r' ? 'crumble' : 'pop');
    d.style.setProperty('--d', (Math.abs(rx - x) + Math.abs(ry - y)) * 18 + 'ms');
    setTimeout(() => d.remove(), 420 + (Math.abs(rx - x) + Math.abs(ry - y)) * 18);
  });
  cx /= r.removed.length; cy /= r.removed.length;
  const hasBomb = r.removed.some(q => q[3] === 'b');
  if (hasBomb) { SND.bomb(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } else SND.pop(r.n, G.combo || 1);
  const word = (WORDS.find(w => r.n >= w[0]) || WORDS[4])[1];
  if (DB.set.anim) sfx(hasBomb ? 'KA-BOOM!' : word, cx, cy, r.n, pts, r.color);
  // move survivors
  const ne = r.board.map(c => new Array(c.length));
  r.moves.forEach(({ from, to }) => { ne[to[0]][to[1]] = G.els[from[0]][from[1]]; });
  G.board = r.board; G.els = ne;
  // repaint every surviving cell whose value changed (thaw / paint)
  G.board.forEach((c, gx) => c.forEach((vv, gy) => { const d = G.els[gx][gy]; if (d._v !== vv) { if (d._v !== undefined) { paintEl(d, vv); d.classList.add('flash'); } d._v = vv; } }));
  G.busy = true;
  setTimeout(() => {
    G.els.forEach((c, gx) => c.forEach((d, gy) => { d.style.transform = pos(gx, gy); }));
    if (G.action) refill();
    setTimeout(() => { if (!G) return; G.busy = false; afterMove(); }, G.action ? 140 : 230);
  }, G.action ? 90 : 150);
  hud();
}
function refill() {
  if (G.mode !== 'blitz') return;
  const b = boardEl();
  G.board.forEach((c, x) => {
    let k = 0;
    while (c.length < G.rows) {
      const v = randCell(G.k, G.rnd, G.gim); c.push(v); const yy = c.length - 1, d = mkEl(v); d._v = v; d.style.transform = `translate(${x * G.cs}px, ${-(++k) * G.cs - 10}px)`; b.appendChild(d); G.els[x].push(d);
      requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = pos(x, yy); }));
    }
  });
}
function afterMove() {
  if (G.over) return;
  if (!G.action) {
    if (E.count(G.board) === 0) return finishPuzzle(true);
    if (E.dead(G.board, G.min)) return finishPuzzle(false);
  } else if (G.mode === 'blitz' && E.dead(G.board, G.feverT > 0 ? 1 : G.min)) {
    // reshuffle when stuck
    floatText('SHUFFLE!', 'fever'); const all = G.board.flat(); for (let i = all.length - 1; i > 0; i--) { const j = (G.rnd() * (i + 1)) | 0;[all[i], all[j]] = [all[j], all[i]]; }
    let i = 0; G.board = G.board.map(c => c.map(() => all[i++])); G.els.forEach((c, x) => c.forEach((d, y) => { paintEl(d, G.board[x][y]); d._v = G.board[x][y]; }));
  }
  hud();
}
function floatText(txt, cls) {
  const f = document.createElement('div'); f.className = 'ftxt ' + cls; f.textContent = txt; $('#boardWrap').appendChild(f); setTimeout(() => f.remove(), 1100);
}
function sfx(word, cx, cy, n, pts, color) {
  const b = boardEl(), w = document.createElement('div');
  const size = Math.min(2.2, .9 + n / 14);
  w.className = 'sfx'; w.style.left = (cx + .5) * G.cs + 'px'; w.style.top = (G.rows - 1 - cy + .5) * G.cs + 'px'; w.style.setProperty('--s', size); w.style.setProperty('--r', ((Math.random() * 24) - 12) + 'deg');
  w.innerHTML = `${A.burst(10 + (n >> 2), 48, 33, n >= 9 ? 'var(--yel)' : A.BC_LT[color] || 'var(--yel)')}<b>${word}</b><em>+${fmt(pts)}</em>`;
  b.appendChild(w); setTimeout(() => w.remove(), 900);
}
// ---- action loop
let raf = 0;
function stopLoop() { cancelAnimationFrame(raf); raf = 0; $$('.hero, .ink').forEach(e => e.remove()); }
let lastTick = -1;
function loop() {
  raf = requestAnimationFrame(loop);
  if (!G || G.over || G.paused) return;
  const now = performance.now(), dt = Math.min(.1, (now - G.last) / 1000); G.last = now;
  G.elapsed += dt;
  if (G.feverT > 0) { G.feverT -= dt; if (G.feverT <= 0) { G.feverT = 0; boardEl().classList.remove('fev'); } }
  if (G.combo && now - G.lastPop > 1800) { G.combo = 0; }
  if (G.timed) {
    G.tLeft -= dt;
    const s = Math.ceil(G.tLeft); if (s <= 5 && s >= 1 && s !== lastTick) { lastTick = s; SND.tick(); }
    if (G.tLeft <= 0) { G.tLeft = 0; hud(); return endAction(); }
  }
  if (G.mode === 'rise') {
    G.riseT += dt; const every = Math.max(2.2, G.riseEvery - G.elapsed / 30);
    $('#riseBar').style.width = Math.min(100, G.riseT / every * 100) + '%';
    if (G.riseT >= every && !G.busy) { G.riseT = 0; riseRow(); }
  }
  if (G.gim.has('hero') && G.elapsed >= G.nextHero) { G.nextHero = G.elapsed + 10 + G.rnd() * 6; spawnHero(); }
  if (G.gim.has('ink') && G.elapsed >= G.nextInk) { G.nextInk = G.elapsed + 9 + G.rnd() * 6; spawnInk(); }
  hud();
}
function riseRow() {
  const b = boardEl();
  G.board.forEach((c, x) => { const v = randCell(G.k, G.rnd, G.gim); c.unshift(v); const d = mkEl(v); d._v = v; d.style.transform = `translate(${x * G.cs}px, ${G.rows * G.cs}px)`; b.appendChild(d); G.els[x].unshift(d); });
  requestAnimationFrame(() => G.els.forEach((c, x) => c.forEach((d, y) => d.style.transform = pos(x, y))));
  tone(180, .08, 'square', .05);
  const top = Math.max(...G.board.map(c => c.length));
  b.classList.toggle('warn', top >= G.rows - 2);
  if (top > G.rows) endAction();
}
function spawnHero() {
  const h = document.createElement('button'); h.className = 'hero'; h.setAttribute('aria-label', 'hero');
  h.innerHTML = `<span class="cape"></span>${A.mascot('wow')}`;
  const top = 6 + G.rnd() * Math.max(10, boardEl().offsetHeight * .5);
  h.style.top = top + 'px'; const dur = 3600;
  h.style.animationDuration = dur + 'ms';
  h.onpointerdown = e => { e.stopPropagation(); if (G.over) return; h.classList.add('got'); SND.hero(); G.heroN++; DB.stats.hero++; G.score += 300; if (G.timed) G.tLeft += 3; floatText(G.timed ? '+3s +300' : '+300', 'time'); const r = h.getBoundingClientRect(), br = boardEl().getBoundingClientRect(); sfxAt('WHAAM!', r.left - br.left + r.width / 2, r.top - br.top + r.height / 2); setTimeout(() => h.remove(), 250); hud(); };
  $('#boardWrap').appendChild(h); setTimeout(() => h.remove(), dur + 50);
}
function sfxAt(word, px, py) { const w = document.createElement('div'); w.className = 'sfx'; w.style.left = px + 'px'; w.style.top = py + 'px'; w.style.setProperty('--s', 1.5); w.style.setProperty('--r', '-8deg'); w.innerHTML = `${A.burst(14, 48, 33, 'var(--red)')}<b style="color:#fff">${word}</b>`; boardEl().appendChild(w); setTimeout(() => w.remove(), 900); }
function spawnInk() {
  const b = boardEl(), s = Math.round(G.cs * (3 + G.rnd() * 1.5));
  const ink = document.createElement('button'); ink.className = 'ink'; ink.style.width = ink.style.height = s + 'px';
  ink.style.left = (G.rnd() * (b.offsetWidth - s)) + 'px'; ink.style.top = (G.rnd() * (b.offsetHeight - s)) + 'px';
  ink.innerHTML = `<svg viewBox="0 0 100 100"><path d="M50 8c8 10 10 4 18 2-2 10 6 12 16 10-6 8 0 14 8 20-10 4-8 10-4 18-10-2-12 6-14 16-6-8-12-4-20 2-2-10-10-8-18-6 2-10-6-14-14-16 8-6 6-12 0-20 10 0 12-6 10-16 10 2 14-2 18-10z" fill="#111" stroke="#000" stroke-width="3"/><circle cx="20" cy="86" r="6" fill="#111"/><circle cx="88" cy="16" r="5" fill="#111"/></svg><b>SPLAT!</b>`;
  let hp = 2; ink.onpointerdown = e => { e.stopPropagation(); hp--; tone(300, .06, 'triangle', .06); ink.classList.add('hit'); setTimeout(() => ink.classList.remove('hit'), 120); if (hp <= 0) { ink.classList.add('gone'); setTimeout(() => ink.remove(), 250); } };
  b.appendChild(ink); noise(.15, .08); setTimeout(() => { if (ink.isConnected) { ink.classList.add('gone'); setTimeout(() => ink.remove(), 300); } }, 7000);
}
// ---- endings
function finishPuzzle(perfect) {
  G.over = true;
  const left = E.count(G.board);
  if (perfect) { G.score += 1000; DB.stats.perfect++; SND.fan(); if (DB.set.anim) confetti(2); }
  else SND.over();
  DB.stats.games++;
  const k = G.kind;
  let html = '', coins = 0;
  if (k === 'stage') {
    if (perfect) {
      const stars = G.hinted ? 1 : (G.undone || G.retried) ? 2 : 3, key = stKey(G.th, G.j), before = stRec(G.th), old = DB.st[key] || 0;
      if (stars > old) { DB.st[key] = stars; coins = addCoin((stars - old) * 10 + (old ? 0 : 10)); }
      const after = stRec(G.th), s = (G.j / PER) | 0;
      const ev = [];
      if (stMedal(after, s) > stMedal(before, s)) ev.push(t('ev.medal', { s: s + 1 }));
      if (s < 4 && !stageOpen(before, (s + 1) * PER) && stageOpen(after, (s + 1) * PER)) ev.push(t('ev.unlock', { s: s + 2 }));
      if (after.every(v => v) && !before.every(v => v)) ev.push(t('ev.comp'));
      if (ev.length && DB.set.anim) setTimeout(() => confetti(1), 900);
      const nj = G.j + 1, canNext = nj < 50 && stageOpen(after, nj);
      html = resultCard('CLEAR!', starRow(stars) + `
        <p>${esc(t(stars === 3 ? 'r.s3' : stars === 2 ? 'r.s2' : 'r.s1'))}</p>${ev.map(e => `<div class="ev">${esc(e)}</div>`).join('')}${coins ? coinLine(coins) : ''}`,
        [canNext ? ['next', t('r.next'), 'red'] : null, ['retry', t('r.retry')], ['list', t('u.list')]]);
      [0, 1, 2].forEach(i => i < stars && setTimeout(() => SND.star(i), 300 + i * 180));
    } else {
      html = resultCard(t('r.stuck'), `<p>${esc(t('r.stuck.d', { n: left }))}</p>`, [['undo', t('g.undo'), 'red'], ['retry', t('r.retry')], ['list', t('u.list')]], 'fail');
    }
  } else if (k === 'daily') {
    const r = dlRec(G.date), md = medalFor(left), best = G.score > r.p.s;
    if (best) { r.p.s = G.score; }
    if (r.p.left < 0 || left < r.p.left) r.p.left = left;
    r.p.md = Math.max(r.p.md, md);
    coins = addCoin(G.score / 25);
    if (best && ON && ON.available && DB.name) ON.putDaily(G.date, 'p', { n: DB.name, i: DB.icon, s: G.score }).catch(() => {});
    html = resultCard(perfect ? 'PERFECT!' : t('r.end'), `<div class="rscore">${fmt(G.score)}</div><p>${esc(t('r.left', { n: left }))}</p>${md ? `<div class="rmedal"><i class="medal big m${md}"></i>${esc(t('md.' + md))}</div>` : `<p class="note">${esc(t('d.medals'))}</p>`}${best ? `<div class="ev">${esc(t('r.best'))}</div>` : ''}${coinLine(coins)}${nameNudge()}`,
      [['undo', t('g.undo')], ['retry', t('r.retry'), 'red'], ['rank', t('rk.title')], ['home', t('u.home')]], perfect ? '' : 'plain');
  } else if (k === 'free') {
    const best = G.score > (DB.free[G.fk] || 0); if (best) DB.free[G.fk] = G.score;
    coins = addCoin(G.score / 40);
    html = resultCard(perfect ? 'PERFECT!' : t('r.end'), `<div class="rscore">${fmt(G.score)}</div><p>${esc(t('r.left', { n: left }))}</p>${best ? `<div class="ev">${esc(t('r.best'))}</div>` : ''}${coinLine(coins)}`,
      [['undo', t('g.undo')], ['new', t('r.new'), 'red'], ['home', t('u.home')]], perfect ? '' : 'plain');
  }
  save(); showResult(html); hud();
}
function endAction() {
  if (G.over) return; G.over = true; stopLoop(); boardEl().classList.remove('fev', 'warn');
  SND.over(); DB.stats.games++;
  const k = G.kind, sc = G.score; let coins = addCoin(sc / 100), extra = '', btns;
  const stats = `<div class="rstats"><span><b>${G.maxCombo}</b>${esc(t('r.combo'))}</span><span><b>${G.big}</b>${esc(t('r.big'))}</span><span><b>${G.heroN}</b>${esc(t('r.hero'))}</span><span><b>${G.feverN}</b>FEVER</span></div>`;
  if (k === 'mission') {
    const m = G.mis, [gt, gv] = m.goal;
    const val = { score: sc, big: G.big, combo: G.maxCombo, hero: G.heroN, fever: G.feverN, pops: G.pops, survive: Math.floor(G.elapsed) }[gt];
    const ok = val >= gv, stars = !ok ? 0 : sc >= m.s3 ? 3 : sc >= m.s2 ? 2 : 1, old = DB.act.mis[m.id] || 0;
    if (stars > old) { DB.act.mis[m.id] = stars; coins += addCoin((stars - old) * 20); }
    extra = `<div class="goalchk ${ok ? 'ok' : 'ng'}">${ok ? '✓' : '✕'} ${esc(goalText(m))}<small>${esc(t('r.val', { n: gt === 'score' ? fmt(val) : val }))}</small></div>` + (ok ? starRow(stars) + `<p class="note">${esc(t('r.mstar', { a: fmt(m.s2), b: fmt(m.s3) }))}</p>` : '');
    if (ok) [0, 1, 2].forEach(i => i < stars && setTimeout(() => SND.star(i), 300 + i * 180));
    btns = [ok && MIS[m.id + 1] ? ['nextm', t('r.next'), 'red'] : null, ['again', t('r.retry'), ok ? '' : 'red'], ['home', t('u.home')]];
    showResult(resultCard(ok ? 'MISSION CLEAR!' : 'MISSION FAILED', `<div class="rscore">${fmt(sc)}</div>${extra}${stats}${coinLine(coins)}`, btns, ok ? '' : 'fail'));
  } else {
    let best = false;
    if (k === 'dblitz') { const r = dlRec(G.date); if (sc > r.b.s) { r.b.s = sc; best = true; } if (ON && ON.available && DB.name) ON.putDaily(G.date, 'b', { n: DB.name, i: DB.icon, s: sc }).catch(() => {}); }
    const key = G.mode === 'rise' ? 'rise' : 'blitz'; if (sc > DB.act[key]) { DB.act[key] = sc; best = true; }
    const left = k === 'dblitz' ? 3 - dlRec(G.date).b.a : 1;
    btns = [left > 0 ? ['again', k === 'dblitz' ? t('r.againN', { n: left }) : t('r.retry'), 'red'] : null, k === 'dblitz' ? ['rank', t('rk.title')] : null, ['home', t('u.home')]];
    showResult(resultCard(G.mode === 'rise' ? 'GAME OVER' : 'TIME UP!', `<div class="rscore">${fmt(sc)}</div>${best ? `<div class="ev">${esc(t('r.best'))}</div>` : ''}${G.mode === 'rise' ? `<p>${esc(t('r.surv', { n: Math.floor(G.elapsed) }))}</p>` : ''}${stats}${coinLine(coins)}${k === 'dblitz' ? nameNudge() : ''}`, btns));
  }
  if (DB.set.anim && sc > 0) confetti(1);
  save();
}
const STAR_SVG = '<svg viewBox="0 0 24 24"><path d="M12 1.8l3.1 6.4 7 .9-5.1 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7L1.9 9.1l7-.9z"/></svg>';
const starRow = n => `<div class="rstars">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}" style="--i:${i}">${STAR_SVG}</i>`).join('')}</div>`;
const coinLine = n => n ? `<div class="rcoin">${A.ICON.coin}+${fmt(n)}</div>` : '';
const nameNudge = () => (ON && ON.available && !DB.name) ? `<button class="nudge" data-act="name">${esc(t('r.nudge'))}</button>` : '';
function resultCard(head, body, btns, cls = '') {
  return `<div class="result ${cls}"><div class="rhead">${A.burst(14, 48, 36, cls === 'fail' ? 'var(--mute)' : 'var(--yel)')}<b>${esc(head)}</b></div>${body}<div class="rbtns">${btns.filter(Boolean).map(([a, l, c]) => `<button class="btn ${c || ''}" data-act="${a}">${esc(l)}</button>`).join('')}</div></div>`;
}
function showResult(html) {
  const m = $('#gameMsg'); m.innerHTML = html; m.hidden = false;
  $$('[data-act]', m).forEach(b => b.onclick = () => resultAct(b.dataset.act));
  updateBadges();
}
function resultAct(a) {
  const m = $('#gameMsg');
  if (a === 'undo') { m.hidden = true; G.over = false; undo(); return; }
  if (a === 'retry') { if (G.kind === 'stage') { const th = G.th, j = G.j; startStage(th, j); G.retried = true; } else if (G.kind === 'daily') startDaily(); return; }
  if (a === 'next') return startStage(G.th, G.j + 1);
  if (a === 'list') { homeTab = 'stage'; themeOpen = G.th; goHome(); return; }
  if (a === 'home') return goHome();
  if (a === 'new') return startFree();
  if (a === 'rank') return openRank(G.kind === 'dblitz' ? 'b' : 'p');
  if (a === 'name') return openProfile();
  if (a === 'again') { if (G.kind === 'dblitz') { if (3 - dlRec(today()).b.a > 0) startBlitzDaily(); return; } const o = { kind: G.kind, m: G.mode, k: G.k, t: G.tTotal, g: [...G.gim], mis: G.mis }; return startAction(o); }
  if (a === 'nextm') { const n = MIS[G.mis.id + 1]; return startAction({ kind: 'mission', m: n.m, k: n.k, t: n.t, g: n.g, mis: n }); }
}
function undo() {
  if (!G || !G.hist.length || G.busy) return;
  const h = G.hist.pop(); G.board = h.b; G.score = h.s; G.pi = h.pi; G.undone = true; G.over = false; $('#gameMsg').hidden = true;
  buildBoard(); G.els.forEach((c, x) => c.forEach((d, y) => d._v = G.board[x][y])); hud(); tone(520, .06, 'triangle', .05, .8);
}
function hint() {
  if (!G || G.kind !== 'stage' || G.busy || G.over) return;
  let sol = null;
  if ((G.pi || 0) >= 0 && G.sol && G.sol[G.pi || 0] !== undefined) { const v = G.sol[G.pi || 0]; sol = [[v >> 4, v & 15]]; }
  else sol = E.solve(G.board, G.min, 120000);
  if (!sol) { toast(t('h.none')); return; }
  G.hinted = true; clearHover();
  const [x, y] = sol[0]; E.group(G.board, x, y).forEach(([gx, gy]) => G.els[gx][gy].classList.add('hint'));
  tone(780, .1, 'triangle', .06);
}
function goHome() { stopLoop(); G = null; showScreen('home'); renderHome(); }
function quitGame() {
  if (G && G.action && !G.over) { if (!confirm(t('q.quit'))) return; }
  if (G && G.kind === 'stage') { homeTab = 'stage'; themeOpen = G.th; }
  goHome();
}

/* ---------------- confetti (halftone dots + stars) ---------------- */
function confetti(times = 1) {
  const cv = $('#fx'), ctx = cv.getContext('2d'); cv.width = innerWidth; cv.height = innerHeight;
  const P = []; const ink = getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#000', cols = A.BC.concat([ink, '#fff']);
  for (let k = 0; k < times; k++) for (let i = 0; i < 90; i++) P.push({ x: innerWidth * (.2 + Math.random() * .6), y: innerHeight * .6, vx: (Math.random() - .5) * 14, vy: -8 - Math.random() * 12 - k * 3, r: 4 + Math.random() * 7, c: cols[(Math.random() * cols.length) | 0], s: Math.random() < .3, a: Math.random() * 6, d: k * 400 });
  const t0 = performance.now();
  (function f(now) {
    const el = now - t0; ctx.clearRect(0, 0, cv.width, cv.height); let live = 0;
    for (const p of P) { if (el < p.d) { live++; continue; } p.vy += .45; p.x += p.vx; p.y += p.vy; p.a += .1; if (p.y < cv.height + 20) live++;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.strokeStyle = ink; ctx.lineWidth = 2;
      if (p.s) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? p.r * .45 : p.r; ctx.lineTo(Math.cos(i * Math.PI / 5) * r, Math.sin(i * Math.PI / 5) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(0, 0, p.r * .6, 0, 7); ctx.fill(); ctx.stroke(); }
      ctx.restore(); }
    if (live && el < 5000) requestAnimationFrame(f); else ctx.clearRect(0, 0, cv.width, cv.height);
  })(t0);
}
function toast(s) { const e = $('#toast'); e.textContent = s; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2200); }

/* ============================================================ MODALS ============================================================ */
function modal(html, cls = '') {
  const m = $('#modal'); m.className = 'modal ' + cls; $('#modalBody').innerHTML = html; m.hidden = false;
  $('#modalBody').scrollTop = 0;
  return $('#modalBody');
}
function closeModal() { $('#modal').hidden = true; if (!$('#home').hidden) renderHome(); }
// --- profile
function openProfile() {
  const owned = Object.keys(DB.own).map(Number).sort((a, b) => a - b);
  const body = modal(`<h2 class="mh">${esc(t('pf.edit'))}</h2>
    <label class="fld"><span>${esc(t('pf.name'))}</span><input id="pfName" maxlength="12" value="${esc(DB.name)}" placeholder="${esc(t('pf.ph'))}"></label>
    <p class="note">${esc(t('pf.note'))}</p><h3 class="mh3">${esc(t('pf.icon'))}</h3>
    <div class="cgrid">${owned.map(id => `<button class="cc ${id === DB.icon ? 'on' : ''}" data-id="${id}">${A.charSVG(id)}</button>`).join('')}</div>
    <div class="mbtns"><button class="btn red" id="pfSave">${esc(t('u.save'))}</button></div>`, 'mprof');
  let pick = DB.icon;
  $$('.cc', body).forEach(b => b.onclick = () => { pick = +b.dataset.id; $$('.cc', body).forEach(x => x.classList.toggle('on', x === b)); });
  $('#pfSave').onclick = () => { DB.name = $('#pfName').value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12); DB.icon = pick; save(); pushScores(); closeModal(); };
}
// --- achievements
function openAch() {
  const rows = ACH.map(([id, f, rw]) => { const [v, g] = f(DB.stats), done = v >= g, got = DB.ach[id];
    return `<div class="ach ${got ? 'got' : done ? 'ready' : ''}"><span class="ai">${got ? '★' : done ? '!' : ''}</span><span class="at"><b>${esc(t('ach.' + id))}</b><span class="bar"><i style="width:${Math.min(100, v / g * 100)}%"></i></span><small>${fmt(Math.min(v, g))} / ${fmt(g)}</small></span>
      ${got ? `<span class="ag">${esc(t('ach.got'))}</span>` : `<button class="btn sm ${done ? 'red' : ''}" data-ach="${id}" ${done ? '' : 'disabled'}>${A.ICON.coin}${rw}</button>`}</div>`; }).join('');
  const body = modal(`<h2 class="mh">${esc(t('ach.title'))}</h2><p class="note">${esc(t('ach.d'))}</p><div class="alist">${rows}</div>`);
  $$('[data-ach]', body).forEach(b => b.onclick = () => { const a = ACH.find(x => x[0] === b.dataset.ach); DB.ach[a[0]] = 1; addCoin(a[2]); SND.coin(); save(); openAch(); updateBadges(); });
}
// --- gacha + shop
const RATE = [[4, .01], [3, .04], [2, .12], [1, .28], [0, .55]];
const REFUND = [5, 15, 40, 100, 300];
function rollOne(guarantee) {
  let r = Math.random(), rar = 0;
  for (const [k, p] of RATE) { if (r < p) { rar = k; break; } r -= p; }
  if (guarantee && rar < 2) rar = 2;
  const pool = []; for (let i = 0; i < 100; i++) if (A.RAR(i) === rar) pool.push(i);
  return pool[(Math.random() * pool.length) | 0];
}
function openGacha(tab = 'g') {
  const body = modal(`<div class="mtabs"><button class="${tab === 'g' ? 'on' : ''}" data-tab="g">${A.ICON.gacha}${esc(t('ga.title'))}</button><button class="${tab === 's' ? 'on' : ''}" data-tab="s">${A.ICON.shop}${esc(t('sh.title'))}</button></div><div id="gaBody"></div>`, 'mgacha');
  $$('[data-tab]', body).forEach(b => b.onclick = () => openGacha(b.dataset.tab));
  const gb = $('#gaBody');
  if (tab === 'g') {
    gb.innerHTML = `<div class="gmach"><div class="gpanel">${A.burst(16, 48, 36, 'var(--yel)')}<div class="gcaps">${[0, 1, 2, 3, 4].map(i => `<i style="--c:${A.BC[i]}"></i>`).join('')}</div><b class="gword">POP-CHA!</b></div>
      <div class="gcoin">${A.ICON.coin}<b class="coinv">${fmt(DB.coin)}</b></div>
      <div class="gbtns"><button class="btn big red" id="g1" ${DB.coin < 100 ? 'disabled' : ''}>${esc(t('ga.one'))}<small>${A.ICON.coin}100</small></button><button class="btn big blue" id="g10" ${DB.coin < 900 ? 'disabled' : ''}>${esc(t('ga.ten'))}<small>${A.ICON.coin}900</small></button></div>
      <p class="note">${esc(t('ga.rate'))}</p><p class="note">${esc(t('ga.dup'))}</p></div><div id="gaRes"></div>`;
    $('#g1').onclick = () => pull(1); $('#g10').onclick = () => pull(10);
  } else {
    gb.innerHTML = `<p class="note">${esc(t('sh.d'))}</p><div class="bggrid">${A.BGS.map((b, i) => { const own = DB.bgOwn.includes(b.id), price = 200 + i * 100;
      return `<div class="bgi ${DB.bg === b.id ? 'on' : ''}"><span class="bgp" style="background:${b.css()}"></span><b>${esc(t('bg.' + b.id))}</b>${own ? `<button class="btn sm ${DB.bg === b.id ? '' : 'blue'}" data-use="${b.id}" ${DB.bg === b.id ? 'disabled' : ''}>${esc(t(DB.bg === b.id ? 'sh.using' : 'sh.use'))}</button>` : `<button class="btn sm red" data-buy="${b.id}" data-p="${price}" ${DB.coin < price ? 'disabled' : ''}>${A.ICON.coin}${price}</button>`}</div>`; }).join('')}</div>`;
    $$('[data-use]', gb).forEach(b => b.onclick = () => { DB.bg = b.dataset.use; save(); setBg(); openGacha('s'); });
    $$('[data-buy]', gb).forEach(b => b.onclick = () => { const p = +b.dataset.p; if (DB.coin < p) return; DB.coin -= p; DB.bgOwn.push(b.dataset.buy); DB.bg = b.dataset.buy; save(); setBg(); SND.coin(); updateCoins(); openGacha('s'); });
  }
}
function pull(n) {
  const cost = n === 10 ? 900 : 100; if (DB.coin < cost) return;
  DB.coin -= cost; DB.stats.gacha += n;
  const res = []; for (let i = 0; i < n; i++) res.push(rollOne(n === 10 && i === 9));
  let refund = 0; const items = res.map(id => { const dup = !!DB.own[id]; DB.own[id] = (DB.own[id] || 0) + 1; if (dup) refund += REFUND[A.RAR(id)]; return { id, dup }; });
  DB.coin += refund; save(); updateCoins();
  const best = Math.max(...res.map(A.RAR));
  const el = $('#gaRes');
  el.innerHTML = `<div class="gres r${best}"><div class="gopen">${A.burst(18, 48, 34, best >= 3 ? 'var(--red)' : 'var(--yel)')}<b>${best >= 4 ? 'WHAAM!!' : best >= 3 ? 'KA-POW!' : best >= 2 ? 'ZAP!' : 'POP!'}</b></div>
    <div class="gitems n${n}">${items.map((it, i) => `<div class="gi r${A.RAR(it.id)}" style="--i:${i}">${A.charSVG(it.id)}<span class="rr">${A.RNAME[A.RAR(it.id)]}</span>${it.dup ? `<span class="dup">+${REFUND[A.RAR(it.id)]}</span>` : '<span class="new">NEW</span>'}</div>`).join('')}</div>
    ${refund ? `<p class="note">${esc(t('ga.refund', { n: refund }))}</p>` : ''}</div>`;
  SND.fan(); if (best >= 3) setTimeout(() => confetti(1), 400);
  $('#g1').disabled = DB.coin < 100; $('#g10').disabled = DB.coin < 900;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function openBook() {
  const own = Object.keys(DB.own).length;
  const cells = []; for (let i = 0; i < 100; i++) { const o = DB.own[i]; cells.push(`<div class="bk ${o ? '' : 'no'} r${A.RAR(i)}" ${o ? `data-id="${i}"` : ''}>${o ? A.charSVG(i) : `<span>?</span>`}<i>${A.RNAME[A.RAR(i)]}</i>${o > 1 ? `<em>×${o}</em>` : ''}</div>`); }
  modal(`<h2 class="mh">${esc(t('bk.title'))}</h2><p class="note">${esc(t('bk.d', { n: own }))}</p><div class="bar big"><i style="width:${own}%"></i></div><div class="bkgrid">${cells.join('')}</div>`);
}
// --- ranking
async function openRank(tab = 'p') {
  const tabs = [['p', 'rk.p'], ['b', 'rk.b'], ['m', 'rk.m'], ['t', 'rk.t']];
  const body = modal(`<h2 class="mh">${esc(t('rk.title'))}</h2><div class="mtabs">${tabs.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-tab="${k}">${esc(t(l))}</button>`).join('')}</div><div id="rkBody"><div class="loading">${esc(t('rk.load'))}</div></div>`, 'mrank');
  $$('[data-tab]', body).forEach(b => b.onclick = () => openRank(b.dataset.tab));
  const el = $('#rkBody');
  if (!ON || !ON.available) { el.innerHTML = `<p class="note">${esc(t('rk.off'))}</p>`; return; }
  const d = today(), path = tab === 'p' ? `same/d/${d}/p` : tab === 'b' ? `same/d/${d}/b` : tab === 'm' ? 'same/m/' + d.slice(0, 7) : 'same/t';
  try {
    const [list, me] = await Promise.all([ON.top(path, 50), ON.mine(path)]);
    if (!el.isConnected) return;
    el.innerHTML = (DB.name ? '' : `<button class="nudge" id="rkName">${esc(t('r.nudge'))}</button>`) +
      (list.length ? `<ol class="rlist">${list.map((r, i) => `<li class="${r.uid === ON.uid ? 'me' : ''} p${i + 1}"><b class="rn">${i + 1}</b><span class="ri">${A.charSVG(r.i | 0)}</span><span class="rnm">${esc(r.n)}</span><b class="rs">${fmt(r.s)}</b></li>`).join('')}</ol>` : `<p class="note">${esc(t('rk.empty'))}</p>`) +
      (me && me.rank > 50 ? `<div class="rme">${esc(t('rk.me', { r: me.rank, s: fmt(me.me.s) }))}</div>` : '');
    const nb = $('#rkName'); if (nb) nb.onclick = openProfile;
  } catch (e) { el.innerHTML = `<p class="note">${esc(t('rk.err'))}</p>`; }
}
// --- settings
function openSettings() {
  const sw = (k, l) => `<label class="sw"><span>${esc(t(l))}</span><input type="checkbox" data-k="${k}" ${DB.set[k] ? 'checked' : ''}><i></i></label>`;
  const cur = document.body.dataset.skin;
  const skinPick = `<h3 class="mh3">${esc(t('set.skin'))}</h3><div class="skins">${SKINS.map(k => `<button class="skin ${k === cur ? 'on' : ''}" data-skin="${k}"><span class="sw4" data-s="${k}"><i></i><i></i><i></i><i></i></span><b>${esc(t('skin.' + k))}</b></button>`).join('')}</div>`;
  const body = modal(`<h2 class="mh">${esc(t('set.title'))}</h2>${skinPick}${sw('snd', 'set.snd')}${sw('anim', 'set.anim')}${sw('emb', 'set.emb')}
    <div class="mbtns"><button class="btn" id="setTut">${esc(t('set.tut'))}</button><button class="btn" id="setReset">${esc(t('set.reset'))}</button></div>`);
  $$('[data-k]', body).forEach(c => c.onchange = () => { DB.set[c.dataset.k] = c.checked ? 1 : 0; save(); sndIcon(); });
  $$('[data-skin]', body).forEach(b => b.onclick = () => { DB.set.skin = b.dataset.skin; save(); applySkin(); renderHome(); openSettings(); });
  $('#setTut').onclick = () => { closeModal(); tutorial('basic'); };
  $('#setReset').onclick = () => { if (confirm(t('set.reset.q'))) { localStorage.removeItem(KEY); location.reload(); } };
}
function sndIcon() { $('#btnSound').classList.toggle('muted', !DB.set.snd); }

/* ---------------- tutorial (comic panels with the mascot) ---------------- */
const TUT = {
  basic: ['tu.b1', 'tu.b2', 'tu.b3', 'tu.b4', 'try'],
  action: ['tu.a1', 'tu.a2', 'tu.a3', 'tu.a4'],
};
function tutorial(kind, done) {
  const pages = TUT[kind]; let i = 0;
  const show = () => {
    const k = pages[i], last = i === pages.length - 1;
    const body = modal(`<div class="tut"><div class="tstep">${pages.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="tpanel"><div class="tmas">${A.mascot(k === 'try' ? 'smile' : i % 2 ? 'wow' : 'smile')}</div><div class="balloon"><b>${esc(t(k === 'try' ? 'tu.try' : k + '.h'))}</b><p>${esc(t(k === 'try' ? 'tu.try.d' : k))}</p></div></div>
      ${k === 'try' ? '<div class="tboard" id="tBoard"></div><div class="tmsg" id="tMsg"></div>' : `<div class="tdemo">${tutDemo(k)}<p class="dcap">${k === 'tu.b1' ? esc(t('tu.b1.c')) : ''}</p></div>`}
      <div class="mbtns"><button class="btn" id="tPrev" ${i ? '' : 'disabled'}>${esc(t('u.prev'))}</button><button class="btn red" id="tNext" ${k === 'try' ? 'hidden' : ''}>${esc(t(last ? 'u.start' : 'u.next'))}</button></div></div>`, 'mtut');
    $('#tPrev').onclick = () => { i--; show(); };
    $('#tNext').onclick = () => { if (last) { closeModal(); done && done(); } else { i++; show(); } };
    if (k === 'try') tutTry(body, () => { $('#tNext').hidden = false; $('#tNext').textContent = t('u.start'); });
    startDemos(body);
  };
  show();
  tutorial.key = e => { if ($('#modal').hidden || !$('.tut')) return; if (e.key === 'ArrowRight' && !$('#tNext').hidden) $('#tNext').click(); if (e.key === 'ArrowLeft' && !$('#tPrev').disabled) $('#tPrev').click(); };
}
/* ---- animated demo: a hand taps a mini board, using the real rules ---- */
const HAND = '<svg viewBox="0 0 40 46" class="hand"><path d="M14 3c2.6 0 4 2 4 4.4V20l1.6-.6c2-.7 4 .4 4.6 2.2l.3 1 1.7-.5c2-.6 3.9.6 4.4 2.4l.3 1 1.2-.3c2.2-.5 4 1 4.2 3.2.5 5.5-.2 9.8-2.3 13.2-1.4 2.2-3.7 3.4-6.3 3.4H17.6c-2.4 0-4.6-1.2-5.9-3.2L4 31.2c-1.4-2-.9-4.7 1-6 1.8-1.2 4.2-.8 5.6.9l-.6.1V7.4C10 5 11.4 3 14 3z" fill="#fff" stroke="#000" stroke-width="2.6" stroke-linejoin="round"/><path d="M18 20v9M24 23v6M30 25.5v4" stroke="#000" stroke-width="2" stroke-linecap="round"/></svg>';
const sleep = ms => new Promise(r => setTimeout(r, ms));
// cfg: { board, min, keep, refill(k colors), steps:[[x,y]|'big'|'any'|fn], before(ctx), after(ctx,i,r), loopWait }
function demo(host, cfg) {
  const token = {}; host._demo = token;
  const alive = () => host._demo === token && host.isConnected;
  const cs = matchMedia('(max-width:600px)').matches ? 38 : 48;
  const run = async () => {
    while (alive()) {
      let b = E.clone(cfg.board), rows = cfg.rows || Math.max(...b.map(c => c.length)), cols = b.length;
      const rnd = E.rng(7);
      host.innerHTML = `<div class="dstage"><div class="dbd" style="width:${cols * cs}px;height:${rows * cs}px;--cs:${cs}px"></div>${cfg.hud || ''}<div class="dhand">${HAND}</div></div>`;
      const bd = host.querySelector('.dbd'), hand = host.querySelector('.dhand');
      const P = (x, y) => `translate(${x * cs}px, ${(rows - 1 - y) * cs}px)`;
      let els = b.map((c, x) => c.map((v, y) => { const d = mkEl(v); d.style.transform = P(x, y); bd.appendChild(d); return d; }));
      const ctx = { host, bd, hand, cs, rows, get b() { return b; }, P, sfx: (w, x, y, n, pts, col) => demoSfx(bd, w, x, y, n, pts, col, rows, cs), combo: 0 };
      hand.style.transform = `translate(${cols * cs * .5}px, ${rows * cs + 30}px)`;
      if (cfg.before) cfg.before(ctx);
      await sleep(700);
      for (let i = 0; i < cfg.steps.length && alive(); i++) {
        let st = cfg.steps[i];
        if (typeof st === 'function') { await st(ctx); continue; }
        if (st === 'big' || st === 'any') { const gs = E.groups(b, cfg.fever && ctx.fever ? 1 : cfg.min || 2); if (!gs.length) break; gs.sort((p, q) => q.cells.length - p.cells.length); st = (st === 'big' ? gs[0] : gs[(rnd() * gs.length) | 0]).cells[0]; }
        const [x, y] = st;
        // move the hand over the cell, press
        const bdr = bd.getBoundingClientRect(), hr = host.querySelector('.dstage').getBoundingClientRect();
        const tx = bdr.left - hr.left + (x + .55) * cs - 12, ty = bdr.top - hr.top + (rows - 1 - y + .5) * cs - 4;
        hand.style.transform = `translate(${tx}px, ${ty}px)`; await sleep(cfg.fast ? 380 : 650); if (!alive()) return;
        hand.classList.add('press'); await sleep(140); hand.classList.remove('press');
        const min = cfg.fever && ctx.fever ? 1 : cfg.min || 2;
        let g = E.group(b, x, y);
        if (g.length < min) { const d = els[x][y]; d.classList.remove('nope'); void d.offsetWidth; d.classList.add('nope'); ctx.sfx('NOPE', x, y, 2, null, 0); if (cfg.after) cfg.after(ctx, i, null); await sleep(900); continue; }
        const r = E.remove(b, g, { min, keep: cfg.keep });
        r.removed.forEach(([rx, ry, , why]) => { const d = els[rx][ry]; d.style.setProperty('--d', (Math.abs(rx - x) + Math.abs(ry - y)) * 30 + 'ms'); d.classList.add(why === 'b' ? 'blast' : why === 'r' ? 'crumble' : 'pop'); setTimeout(() => d.remove(), 600); });
        const word = r.removed.some(q => q[3] === 'b') ? 'KA-BOOM!' : (WORDS.find(w => r.n >= w[0]) || WORDS[4])[1];
        ctx.combo++; const pts = cfg.pts ? cfg.pts(r, ctx) : r.score;
        ctx.sfx(word, x, y, r.n, pts, r.color);
        const ne = r.board.map(c => new Array(c.length)); r.moves.forEach(({ from, to }) => { ne[to[0]][to[1]] = els[from[0]][from[1]]; });
        b = r.board; els = ne;
        b.forEach((c, gx) => c.forEach((vv, gy) => { const d = els[gx][gy]; if (d._v !== undefined && d._v !== vv) { paintEl(d, vv); d.classList.add('flash'); } d._v = vv; }));
        await sleep(cfg.fast ? 160 : 320);
        els.forEach((c, gx) => c.forEach((d, gy) => { d.style.transform = P(gx, gy); }));
        if (cfg.refill) { b.forEach((c, gx) => { let k = 0; while (c.length < rows) { const v = (rnd() * cfg.refill) | 0; c.push(v); const yy = c.length - 1, d = mkEl(v); d._v = v; d.style.transform = `translate(${gx * cs}px, ${-(++k) * cs}px)`; bd.appendChild(d); els[gx].push(d); requestAnimationFrame(() => requestAnimationFrame(() => { d.style.transform = P(gx, yy); })); } }); }
        if (cfg.after) cfg.after(ctx, i, r);
        await sleep(cfg.fast ? 260 : 560);
      }
      if (!alive()) return;
      if (cfg.end) await cfg.end(ctx, b);
      await sleep(cfg.loopWait || 1400);
    }
  };
  // mark existing values so repaint detection works
  setTimeout(run, 30);
}
function demoSfx(bd, word, x, y, n, pts, color, rows, cs) {
  const w = document.createElement('div'); const size = Math.min(1.6, .75 + n / 14);
  w.className = 'sfx'; w.style.left = (x + .5) * cs + 'px'; w.style.top = (rows - 1 - y + .5) * cs + 'px'; w.style.setProperty('--s', size); w.style.setProperty('--r', ((Math.random() * 20) - 10) + 'deg');
  w.innerHTML = `${A.burst(10 + (n >> 2), 48, 33, word === 'NOPE' ? 'var(--mute)' : n >= 9 ? 'var(--yel)' : A.BC_LT[color] || 'var(--yel)')}<b>${word}</b>${pts != null ? `<em>+${fmt(pts)}</em>` : ''}`;
  bd.appendChild(w); setTimeout(() => w.remove(), 900);
}
const R_ = E.mk(0, E.T.ROCK), W_ = E.mk(0, E.T.WILD), IC = c => E.mk(c, E.T.ICE), BM = c => E.mk(c, E.T.BOMB), PT = c => E.mk(c, E.T.PAINT);
const DEMOS = {
  'tu.b1': { board: [[2, 0, 1], [0, 0, 2], [1, 2, 1], [2, 1, 2]], steps: [[1, 0]] },
  'tu.b2': { board: [[0, 0, 0, 1], [0, 1, 1, 2], [0, 2, 2, 1], [3, 3, 1, 2]], steps: [[3, 0], [0, 0]] },
  'tu.b3': { board: [[3, 3, 1], [0, 0, 0], [2, 1, 2]], steps: [[0, 0], [1, 0]], before: c => arrows(c) },
  'tu.b4': { board: [[0, 1, 1], [0, 1, 0], [2, 2, 0], [2, 1, 1]], steps: [[0, 0], [3, 1], [0, 0], [1, 0], [0, 0]], end: async c => { c.sfx('+1000', 1.5, 1, 20, null, 2); await sleep(400); } },
  // action
  'tu.a1': { board: [[0, 0, 1, 2], [0, 0, 1, 1], [0, 2, 2, 1], [3, 0, 3, 2], [1, 1, 3, 3]], keep: true, refill: 4, rows: 4, steps: ['big', 'big', 'big'], pts: r => r.n * (r.n + 1) * 5,
    hud: '<div class="dhud"><span class="dtime"><i></i></span><b class="dsec">60</b></div>', before: c => { const t = c.host.querySelector('.dtime i'); t.style.transition = 'none'; t.style.width = '100%'; requestAnimationFrame(() => { t.style.transition = 'width 4s linear'; t.style.width = '62%'; }); },
    after: (c, i, r) => { if (r && r.n >= 7) { c.sfx('+1s', 2, 3, 6, null, 2); } c.host.querySelector('.dsec').textContent = 60 - (i + 1) * 3; } },
  'tu.a2': { board: [[0, 1, 2, 3], [1, 2, 3, 0], [0, 1, 2, 3], [2, 3, 0, 1], [3, 0, 1, 2]], keep: true, refill: 3, rows: 4, fast: true, steps: ['big', 'big', 'big', 'big', 'big'],
    hud: '<div class="dhud"><b class="dcombo">COMBO</b></div>', pts: (r, c) => Math.round(r.n * (r.n + 1) * 5 * (1 + (c.combo - 1) * .2)),
    after: (c) => { const e = c.host.querySelector('.dcombo'); e.textContent = c.combo > 1 ? 'COMBO x' + c.combo : 'COMBO'; e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } },
  'tu.a3': { board: [[0, 1, 2, 0], [1, 2, 0, 1], [2, 0, 1, 2], [0, 1, 2, 0], [1, 2, 0, 1]], keep: true, refill: 3, rows: 4, fast: true, fever: true,
    hud: '<div class="dhud"><span class="dfev"><i></i></span><b class="dfevw">FEVER</b></div>',
    steps: [async c => { const i = c.host.querySelector('.dfev i'); i.style.width = '0%'; await sleep(200); i.style.width = '100%'; await sleep(900); c.fever = 1; c.host.querySelector('.dstage').classList.add('fev'); c.host.querySelector('.dfevw').textContent = 'FEVER!'; }, 'any', 'any', 'any', 'any'],
    end: async c => { c.fever = 0; c.host.querySelector('.dstage').classList.remove('fev'); } },
  'tu.a4': { board: [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 1, 2], [1, 2, 0]], keep: true, rows: 3, steps: [async c => {
      const h = document.createElement('div'); h.className = 'dhero'; h.innerHTML = `<span class="cape"></span>${A.mascot('wow')}`; c.host.querySelector('.dstage').appendChild(h);
      await sleep(900); const hr = h.getBoundingClientRect(), sr = c.host.querySelector('.dstage').getBoundingClientRect();
      c.hand.style.transform = `translate(${hr.left - sr.left + 30}px, ${hr.top - sr.top + 20}px)`; await sleep(380);
      c.hand.classList.add('press'); await sleep(140); c.hand.classList.remove('press'); h.classList.add('got');
      const w = document.createElement('div'); w.className = 'sfx'; w.style.left = (hr.left - sr.left + 48) + 'px'; w.style.top = (hr.top - sr.top + 30) + 'px'; w.style.setProperty('--s', 1.4); w.style.setProperty('--r', '-8deg'); w.innerHTML = `${A.burst(14, 48, 33, 'var(--red)')}<b style="color:#fff">WHAAM!</b><em>+3s</em>`; c.host.querySelector('.dstage').appendChild(w);
      await sleep(900); h.remove(); w.remove();
    }] },
  // gimmick tips
  th_tr: { board: [[0, 0, 1], [2, 1, 1], [2, 2, 0]], min: 3, steps: [[0, 0], [1, 1]] },
  th_rk: { board: [[0, 0, 2], [R_, 1, 2], [1, 1, 0]], steps: [[0, 0]], before: c => {} },
  th_ic: { board: [[0, 0, 1], [IC(2), 2, 1], [2, 1, 1]], steps: [[0, 0], [0, 0]] },
  th_bm: { board: [[0, 0, 1], [BM(0), 2, 1], [2, 1, 2], [1, 2, 1]], steps: [[0, 0]] },
  th_wd: { board: [[0, W_, 0], [1, 1, 2], [2, 0, 2]], steps: [[0, 0]] },
  th_pt: { board: [[0, 0, 1], [PT(0), 1, 2], [1, 2, 1], [2, 1, 2]], steps: [[0, 0], 'big'] },
  th_mx: { board: [[0, 0, 1, 2], [BM(0), R_, 1, 2], [1, 2, IC(1), 1], [2, W_, 2, 1]], steps: [[0, 0], 'big', 'big'] },
};
function arrows(c) { const a = document.createElement('div'); a.className = 'darrows'; a.innerHTML = '<b>↓</b><b>←</b>'; c.host.querySelector('.dstage').appendChild(a); }
function tutDemo(k) { return DEMOS[k] ? `<div class="demo" data-demo="${k}"></div>` : ''; }
function startDemos(root) { $$('.demo', root).forEach(el => demo(el, DEMOS[el.dataset.demo])); }
function tutTry(body, ok) {
  // fixed 4×4 board that can be cleared: columns bottom-up
  let b = [[0, 0, 1, 1], [2, 0, 1, 2], [2, 2, 3, 3], [1, 1, 3, 3]];
  const el = $('#tBoard', body);
  const draw = () => {
    const h = 4; el.innerHTML = '';
    b.forEach((c, x) => c.forEach((v, y) => { const d = document.createElement('button'); d.className = 'db c' + v; d.style.gridColumn = x + 1; d.style.gridRow = h - y; d.innerHTML = `<svg><use href="#em${v}"/></svg>`; d.onclick = () => tap(x, y); el.appendChild(d); }));
  };
  const tap = (x, y) => {
    const g = E.group(b, x, y); if (g.length < 2) { SND.bad(); $('#tMsg', body).textContent = t('tu.try.no'); return; }
    SND.pop(g.length); b = E.remove(b, g).board; draw();
    if (!b.length) { $('#tMsg', body).innerHTML = `<b class="ok">PERFECT! ${esc(t('tu.try.ok'))}</b>`; SND.fan(); ok(); }
    else if (E.dead(b, 2)) { $('#tMsg', body).innerHTML = `${esc(t('tu.try.re'))} <button class="btn sm" id="tRe">${esc(t('r.retry'))}</button>`; $('#tRe').onclick = () => { b = [[0, 0, 1, 1], [2, 0, 1, 2], [2, 2, 3, 3], [1, 1, 3, 3]]; $('#tMsg', body).textContent = ''; draw(); }; }
  };
  draw();
}
function maybeThemeTip(th, force) {
  if (th === 'cl' || (!force && DB.tut['th_' + th])) return; DB.tut['th_' + th] = 1; save();
  modal(`<div class="tut"><div class="tpanel"><div class="tmas">${A.mascot('wow')}</div><div class="balloon"><b>${esc(t('th.' + th))}</b><p>${esc(t('th.' + th + '.r'))}</p></div></div><div class="tdemo">${tutDemo('th_' + th)}</div><div class="mbtns"><button class="btn red" id="tOk">OK!</button></div></div>`, 'mtut');
  startDemos($('#modalBody'));
  $('#tOk').onclick = () => { $('#modal').hidden = true; };
}

/* ---------------- login bonus ---------------- */
function loginBonus() {
  const d = today(); if (DB.login === d) return;
  DB.login = d; DB.stats.days++; save();
  const n = DB.stats.days % 7 === 0 ? 150 : 30;
  setTimeout(() => { addCoin(n); SND.coin(); toast(t('login', { n, d: DB.stats.days })); }, 900);
}

/* ---------------- boot ---------------- */
function bind() {
  document.body.insertAdjacentHTML('afterbegin', A.SPRITE);
  $('#htabs').innerHTML = [['daily', 'ht.daily', A.ICON.daily], ['stage', 'ht.stage', A.ICON.stage], ['action', 'ht.action', A.ICON.action]].map(([p, k, ic]) => `<button data-p="${p}">${ic}<span data-i18n="${k}">${esc(t(k))}</span></button>`).join('');
  $$('#htabs button').forEach(b => b.onclick = () => { homeTab = b.dataset.p; if (homeTab !== 'stage') themeOpen = null; renderHome(); });
  // header icons
  const IC = { btnAch: 'trophy', btnGacha: 'gacha', btnBook: 'book', btnRank: 'rank', btnSet: 'gear', btnHelp: 'help', btnSound: 'sound', homeLink: 'home', gBack: 'back', gUndo: 'undo', gHint: 'hint' };
  for (const [id, ic] of Object.entries(IC)) { const e = $('#' + id); if (e) e.insertAdjacentHTML('afterbegin', A.ICON[ic]); }
  $('#btnAch').onclick = openAch; $('#btnGacha').onclick = () => openGacha('g'); $('#btnBook').onclick = openBook; $('#btnRank').onclick = () => openRank('p');
  $('#btnSet').onclick = openSettings; $('#btnHelp').onclick = () => tutorial('basic');
  $('#btnSound').onclick = () => { DB.set.snd = DB.set.snd ? 0 : 1; save(); sndIcon(); if (DB.set.snd) SND.coin(); };
  $('#logo').onclick = () => { if (!$('#play').hidden) quitGame(); else { homeTab = 'daily'; themeOpen = null; renderHome(); } };
  $('#modalX').onclick = closeModal; $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
  $('#gBack').onclick = quitGame; $('#gUndo').onclick = undo; $('#gHint').onclick = hint;
  const bw = $('#boardWrap');
  bw.addEventListener('pointerdown', e => { if (e.target.closest('.hero,.ink,.result,.cd')) return; if (e.target.closest('#board')) onTap(e); });
  bw.addEventListener('pointermove', onHover); bw.addEventListener('pointerleave', () => { hoverKey = ''; clearHover(); });
  const ls = $('#langSel'); ls.value = lang; ls.onchange = () => { lang = ls.value; DB.set.lang = lang; save(); applyI18n(); renderHome(); if (G) hud(); };
  addEventListener('keydown', e => {
    if (tutorial.key) tutorial.key(e);
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    if (!$('#play').hidden && G) { if ((e.key === 'z' && (e.ctrlKey || e.metaKey)) || e.key === 'Backspace') { e.preventDefault(); undo(); } if (e.key === 'h' && !e.ctrlKey && !e.metaKey) hint(); }
  });
  document.addEventListener('visibilitychange', () => { if (G && G.action) { if (document.hidden) G.paused = true; else { G.paused = false; G.last = performance.now(); } } });
}
async function boot() {
  bind(); applyI18n(); applySkin(); sndIcon();
  try { STG = await (await fetch('stages.json?v=1')).json(); } catch (e) { STG = null; }
  showScreen('home'); renderHome();
  if (!DB.tut.basic) { DB.tut.basic = 1; save(); setTimeout(() => tutorial('basic'), 400); }
  loginBonus();
  if (ON && ON.available) ON.init().catch(() => {});
}
window.SameApp = { get DB() { return DB; }, get G() { return G; }, startStage, startDaily, startAction, MIS };
boot();
})();
