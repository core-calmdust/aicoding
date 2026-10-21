/* まいにち数独 — app */
(function () {
'use strict';
const E = window.SudokuEngine, BG = window.SudokuBG, ON = window.SudokuOnline;
const BASE = window.SUDOKU_BASE || '';            // '' in sudoku/, '../sudoku/' in speed-sudoku/
const MODE = window.SUDOKU_MODE || 'daily';       // 'daily' = まいにち数独, 'speed' = すぴーど数独 (stand-alone)
const SPDX = window.SudokuSpeed || null, TUT = window.SudokuTutorial || null;
let SPD = null;                                  // speed module, once its data has loaded
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const STORE = 'mainichi-sudoku-v1';
const FIRST_DAY = '2026-10-01';
const DIFFS = ['e', 'm', 'h'];
const DTIER = { e: 1, m: 2, h: 3 };
const THEMES = ['forest', 'harbor', 'sweets', 'sea', 'garden', 'festival', 'autumn', 'snow', 'stars', 'castle', 'cloudranch', 'park', 'iceberg', 'desert', 'toytown', 'library', 'rain', 'jungle', 'bakery', 'moon'];
const NT = THEMES.length, NCOL = NT * 50;
// display order: easiest → hardest (data/progress keys keep the original theme index)
const ORDER = [0, 1, 2, 3, 4, 10, 11, 5, 12, 6, 7, 13, 14, 8, 15, 16, 17, 9, 18, 19];
const TNO = ti => ORDER.indexOf(ti) + 1;
const VTYPES = ['x', 'hyper', 'jigsaw', 'oddeven', 'killer', 'ineq', 'antiknight', 'kropki', 'thermo', 'arrow'];
const VCOL = { x: ['#ffd9e6', '#e6dcff'], hyper: ['#d6ecff', '#e0fff1'], jigsaw: ['#fff1c9', '#ffd9cc'], oddeven: ['#ffe3cc', '#d9e9ff'], killer: ['#e8dcff', '#ffd6e6'], ineq: ['#dff4ff', '#ffe6d6'], antiknight: ['#e6f0d8', '#fff0cc'], kropki: ['#fff', '#e3e6ff'], thermo: ['#ffe0dc', '#fff2d0'], arrow: ['#dcf5ec', '#e4e0ff'] };
const URL_SELF = 'https://core-calmdust.github.io/aicoding/sudoku/';
const URL_SPEED = 'https://core-calmdust.github.io/aicoding/speed-sudoku/';
const FIRST_SPEED = '2026-10-21';
const GACHA_COST = 2500, GACHA10_COST = 22500, STARTER_PTS = 2500;
const RATES = [['UR', .005], ['SSR', .025], ['SR', .09], ['R', .28], ['N', .6]];
const DUP_REFUND = { N: 200, R: 350, SR: 700, SSR: 1200, UR: 2500 };
const DEBUG = new URLSearchParams(location.search).has('debug');

/* ================= storage ================= */
const DEF_SET = { check: true, clean: true, hl: true, timer: true, flick: true, sound: true, vib: true, motion: true, tod: 'auto' };
function load() {
  let d = null; try { d = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
  d = d && typeof d === 'object' ? d : {};
  d.set = Object.assign({}, DEF_SET, d.set || {});
  d.daily = d.daily || {}; d.col = d.col || {}; d.vcol = d.vcol || {}; d.saves = d.saves || {}; d.ach = d.ach || {};
  d.play = d.play || 0;
  d.prof = Object.assign({ name: '', icon: -1 }, d.prof || {});
  d.pts = d.pts || 0; d.ptsAll = d.ptsAll || 0;
  d.sc = Object.assign({ tot: 0, m: {} }, d.sc || {});
  d.icons = d.icons || {};
  d.rk = d.rk || {}; d.seenRule = d.seenRule || {};
  if (d.autoLeft == null) d.autoLeft = 3;
  d.homeTab = d.homeTab || 'daily'; d.mt = d.mt || 0;
  return d;
}
let DB = load();
let saveT = 0;
function persist(now) {
  clearTimeout(saveT);
  DB.mt = Date.now();
  const w = () => { try { localStorage.setItem(STORE, JSON.stringify(DB)); } catch (e) {} schedulePush(); };
  if (now) w(); else saveT = setTimeout(w, 150);
}

/* ================= i18n ================= */
let LANG = 'ja';
{
  const nav = (navigator.language || 'ja').slice(0, 2);
  if (SUPPORTED.includes(nav)) LANG = nav;
  try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
  const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) LANG = q;
}
function t(k, p) {
  const L = window.I18N[LANG] || {}, s0 = L[k] ?? window.I18N.en[k] ?? window.I18N.ja[k] ?? k;
  return p ? String(s0).replace(/\{(\w+)\}/g, (_, x) => (p[x] ?? '')) : s0;
}
const locale = () => ({ zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', hi: 'hi-IN', ar: 'ar' }[LANG] || LANG);
const fmtN = n => Math.round(n).toLocaleString(LANG === 'ar' || LANG === 'hi' ? 'en' : locale());
function applyI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG;
  document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', t(el.dataset.i18nTitle)); });
  document.title = MODE === 'speed' ? t('sp.title') + ' — ' + t('sp.meta') : t('title') + ' — ' + t('meta.sub');
  $('#langSel').value = LANG;
  $('#kbHelp').innerHTML = t('kb.help');
}

/* ================= dates ================= */
const pad2 = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dayNum = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
const today = () => ymd(new Date());
const thisMonth = () => today().slice(0, 7);
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const addMonths = (ym, n) => { const d = parseYmd(ym + '-01'); d.setMonth(d.getMonth() + n); return ymd(d).slice(0, 7); };
const fmtDate = (s, o = { month: 'long', day: 'numeric', weekday: 'short' }) => parseYmd(s).toLocaleDateString(locale(), o);
const fmtMonth = ym => parseYmd(ym + '-01').toLocaleDateString(locale(), { year: 'numeric', month: 'long' });
const fmtTime = ms => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return (h ? h + ':' + pad2(m) : m) + ':' + pad2(s % 60); };
const daysIn = (y, m) => new Date(y, m, 0).getDate();

/* ================= art ================= */
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<radialGradient id="g1" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffe4cc"/><stop offset=".55" stop-color="#e09a62"/><stop offset="1" stop-color="#a95f2e"/></radialGradient>
<radialGradient id="g2" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#c9d3e0"/><stop offset="1" stop-color="#8592a6"/></radialGradient>
<radialGradient id="g3" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff8cf"/><stop offset=".5" stop-color="#ffcc45"/><stop offset="1" stop-color="#cf8a08"/></radialGradient>
<linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9fb8"/><stop offset=".3" stop-color="#ffd36b"/><stop offset=".55" stop-color="#8fe3b0"/><stop offset=".8" stop-color="#8fc4ff"/><stop offset="1" stop-color="#c39bff"/></linearGradient>
<radialGradient id="gcoin" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff2b8"/><stop offset=".55" stop-color="#ffc83d"/><stop offset="1" stop-color="#e08a12"/></radialGradient>
</defs></svg>`;
const RIB = ['#e85d75', '#f0a24c', '#5aa0e6', '#a77be0'];
const TIERC = { 1: ['url(#g1)', '#a95f2e', '#fff3e6'], 2: ['url(#g2)', '#8592a6', '#ffffff'], 3: ['url(#g3)', '#c98408', '#fffbe6'], 4: ['url(#g4)', '#b07ad6', '#ffffff'] };
function medal(tier, cls = '') {
  const [f, s] = TIERC[tier];
  return `<svg class="${cls}" viewBox="0 0 48 48"><path d="M15 2h7l4 14h-7z" fill="${RIB[0]}"/><path d="M33 2h-7l-4 14h7z" fill="${RIB[2]}"/><circle cx="24" cy="29" r="16" fill="${f}" stroke="${s}" stroke-width="1.6"/><circle cx="24" cy="29" r="11.5" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.4"/><path d="M24 21.3l2.3 4.7 5.1.7-3.7 3.6.9 5.1-4.6-2.4-4.6 2.4.9-5.1-3.7-3.6 5.1-.7z" fill="#fff" fill-opacity=".92"/><ellipse cx="18" cy="22" rx="4" ry="2" fill="#fff" opacity=".45" transform="rotate(-35 18 22)"/></svg>`;
}
function miniMedal(tier, late) {
  const [f, s] = TIERC[tier];
  return `<svg class="${late ? 'late' : ''}" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.4" fill="${f}" stroke="${s}" stroke-width="1.2"/><path d="M10 5.6l1.3 2.7 2.9.4-2.1 2 .5 2.9L10 12.2l-2.6 1.4.5-2.9-2.1-2 2.9-.4z" fill="#fff" fill-opacity=".9"/></svg>`;
}
const COIN = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="url(#gcoin)" stroke="#d08a10" stroke-width="1.2"/><circle cx="12" cy="12" r="7" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2"/><path d="M12 7.2l1.4 2.9 3.2.5-2.3 2.2.5 3.2-2.8-1.5-2.8 1.5.5-3.2-2.3-2.2 3.2-.5z" fill="#fff" fill-opacity=".92"/></svg>';
const ICONS = {
  cal: '<rect x="-7" y="-6" width="14" height="13" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-7 -2h14M-3.5 -8v4M3.5 -8v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  flame: '<path d="M0 -9c4 4 7 7 7 11a7 7 0 0 1-14 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3 0-5 2-8z" fill="currentColor"/>',
  star: '<path d="M0 -8.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L0 4.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="currentColor"/>',
  clock: '<circle r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M0 -4.5v5l3 2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  crown: '<path d="M-8 4l-1.5-10 5 4.5L0 -8l4.5 6.5 5-4.5L8 4z" fill="currentColor"/><rect x="-8" y="5" width="16" height="3" rx="1" fill="currentColor"/>',
  heart: '<path d="M0 7s-8-4.6-8-10a4.3 4.3 0 0 1 8-2.3A4.3 4.3 0 0 1 8 -3c0 5.4-8 10-8 10z" fill="currentColor"/>',
  sun: '<circle r="4.5" fill="currentColor"/><path d="M0 -9v2.5M0 6.5V9M-9 0h2.5M6.5 0H9M-6.4 -6.4l1.8 1.8M4.6 4.6l1.8 1.8M-6.4 6.4l1.8-1.8M4.6 -4.6l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  moon: '<path d="M3 -8a8 8 0 1 0 5 13A7 7 0 0 1 3 -8z" fill="currentColor"/>',
  medals: '<circle cx="-5" cy="1" r="4" fill="currentColor" opacity=".6"/><circle cx="5" cy="1" r="4" fill="currentColor" opacity=".8"/><circle cx="0" cy="-3" r="4.5" fill="currentColor"/>',
  bulb: '<path d="M-3 6h6M-2 8.5h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M0 -8a5.5 5.5 0 0 0-3.3 9.9c.6.5 1 1.1 1 2h4.6c0-.9.4-1.5 1-2A5.5 5.5 0 0 0 0 -8z" fill="none" stroke="currentColor" stroke-width="2"/>',
  check: '<path d="M-6 0l4 4 8-8" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  map: '<path d="M-8 -6l5-2 6 2 5-2v14l-5 2-6-2-5 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M-3 -8v14M3 -6v14" stroke="currentColor" stroke-width="2"/>',
  podium: '<rect x="-3" y="-6" width="6" height="14" rx="1" fill="currentColor"/><rect x="-9" y="-1" width="5.5" height="9" rx="1" fill="currentColor" opacity=".7"/><rect x="3.5" y="1" width="5.5" height="7" rx="1" fill="currentColor" opacity=".55"/>',
  face: '<circle r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="-3" cy="-1.5" r="1.3" fill="currentColor"/><circle cx="3" cy="-1.5" r="1.3" fill="currentColor"/><path d="M-3 2.5q3 2.6 6 0" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  puzzle: '<path d="M-7 -7h5a2 2 0 1 1 4 0h5v5a2 2 0 1 0 0 4v5H2a2 2 0 1 0-4 0h-5v-5a2 2 0 1 1 0-4z" fill="currentColor"/>',
};
function badge(tier, center, cls = '') {
  const [f, s, inner] = TIERC[tier || 1];
  let p = ''; const n = 14;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; p += `<circle cx="${(30 + Math.cos(a) * 20).toFixed(1)}" cy="${(28 + Math.sin(a) * 20).toFixed(1)}" r="6"/>`; }
  const c = ICONS[center] ? `<g transform="translate(30 28) scale(1.15)" style="color:${s}">${ICONS[center]}</g>`
    : `<text x="30" y="28" dy=".36em" text-anchor="middle" font-family="Fredoka,sans-serif" font-weight="700" font-size="${String(center).length > 2 ? 12.5 : 16}" fill="${s}">${esc(center)}</text>`;
  return `<svg class="${cls}" viewBox="0 0 60 64"><path d="M20 40l-5 20 7-4 4 7 4-16zM40 40l5 20-7-4-4 7-4-16z" fill="${tier === 4 ? '#c39bff' : RIB[(tier || 1) - 1]}"/><g fill="${f}" stroke="${s}" stroke-width=".6">${p}<circle cx="30" cy="28" r="20"/></g><circle cx="30" cy="28" r="15" fill="${inner}" stroke="${s}" stroke-width="1.2"/>${c}</svg>`;
}
const STAR = on => `<svg viewBox="0 0 24 24"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" fill="${on ? '#ffc93c' : '#e7e0ee'}" stroke="${on ? '#e8a20f' : '#d8d0e2'}" stroke-width="1.3" stroke-linejoin="round"/></svg>`;
const FLAME = '<svg viewBox="0 0 24 24"><path d="M12 2c4 4.5 7 7.5 7 12a7 7 0 0 1-14 0c0-3.2 2-5.5 3.2-6.6.1 2.1 1.1 3.3 2.3 3.6C10.5 8 10.5 5.3 12 2z" fill="#ff8a4c"/><path d="M12 12c1.8 1.8 3 3 3 5a3 3 0 0 1-6 0c0-1.3.8-2.4 1.4-2.9.2.9.6 1.4 1.1 1.5-.1-1.3 0-2.4.5-3.6z" fill="#ffd36b"/></svg>';
const CROWN = '<svg viewBox="0 0 24 24"><path d="M3 9l4 3.5L12 5l5 7.5L21 9l-1.8 10H4.8z" fill="#ffcd4d" stroke="#d4920f" stroke-width="1.3" stroke-linejoin="round"/><circle cx="12" cy="5" r="1.6" fill="#ff8fb6"/><circle cx="3" cy="9" r="1.3" fill="#8fc4ff"/><circle cx="21" cy="9" r="1.3" fill="#8fc4ff"/></svg>';
const GLOGO = '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>';
const PENCIL = '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>';
const lvChip = lv => `<span class="lvchip lv${lv}">${esc(t('lv.' + lv))}</span>`;
const LVCOL = { 1: '#f2a066', 2: '#76a2e2', 3: '#e3ad1f', 4: '#b468d6' };
const rarChip = r => `<span class="rar ${r}">${r}</span>`;

/* character icons (icons.js) with a graceful fallback */
const IC = window.SudokuIcons || null;
let uidSeq = 0;
function iconSvg(id, opts = {}) {
  if (IC && id >= 0 && id < (IC.COUNT_ALL || IC.COUNT)) return IC.svg(id, Object.assign({ uid: 'u' + (++uidSeq) }, opts));
  return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#ffe0ea"/><circle cx="50" cy="56" r="28" fill="#fff"/><circle cx="40" cy="54" r="3.5" fill="#43385a"/><circle cx="60" cy="54" r="3.5" fill="#43385a"/><path d="M45 63q5 4 10 0" stroke="#43385a" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="33" cy="62" rx="5" ry="3" fill="#ffb3c6"/><ellipse cx="67" cy="62" rx="5" ry="3" fill="#ffb3c6"/></svg>`;
}
const iconInfo = id => (IC && id >= 0 ? IC.info(id) : { id, rarity: 'N', name: () => '' });
const iconName = id => { try { return iconInfo(id).name(LANG); } catch (e) { return ''; } };
const avatar = (id, size = 36) => `<span class="av" style="width:${size}px;height:${size}px">${iconSvg(id, { still: true, size })}</span>`;

/* ================= puzzles ================= */
let PZ = null, PV = null;
const unpack = s => ({ puzzle: E.parse(s.slice(0, 81).replace(/0/g, '.')), lv: +s[81] });
function dailyPuzzle(date, d) {
  const pool = PZ.daily[{ e: 'easy', m: 'medium', h: 'hard' }[d]];
  const idx = ((dayNum(date) * 37 + { e: 0, m: 51, h: 97 }[d]) % pool.length + pool.length) % pool.length;
  const base = unpack(pool[idx]);
  const rng = E.mulberry32(E.hashStr('mainichi:' + date + ':' + d));
  return { puzzle: E.transform(base.puzzle, rng), lv: base.lv };
}
const colPuzzle = (ti, pi) => unpack(PZ.themes[ti][pi]);
const vset = si => PV && PV.sets[si];
function varSpec(si, pi) {
  const s = vset(si), p = s.puzzles[pi], spec = { type: s.type };
  if (p.r) spec.regions = Array.from(p.r, Number);
  if (p.e) spec.parity = Array.from(p.e, Number);
  if (p.c) spec.cages = p.c;
  if (p.g) spec.ineq = p.g;
  if (p.w) spec.dots = p.w;
  if (p.t) spec.thermos = p.t;
  if (p.a) spec.arrows = p.a;
  return spec;
}
const varPuzzle = (si, pi) => { const p = vset(si).puzzles[pi]; return { puzzle: Array.from(p.p, Number), lv: p.lv }; };
const colRec = (ti, pi) => DB.col[ti + '.' + pi];
const varRec = (si, pi) => DB.vcol[si + '.' + pi];
const themeCleared = ti => { let n = 0; for (let i = 0; i < 50; i++) if (colRec(ti, i)) n++; return n; };
const themeStars = ti => { let n = 0; for (let i = 0; i < 50; i++) { const r = colRec(ti, i); if (r) n += r.s; } return n; };
const themeScore = ti => { let n = 0; for (let i = 0; i < 50; i++) { const r = colRec(ti, i); if (r) n += r.sc || 0; } return n; };
const vsetLen = si => (vset(si) ? vset(si).puzzles.length : 0);
const vsetCleared = si => { let n = 0; for (let i = 0; i < vsetLen(si); i++) if (varRec(si, i)) n++; return n; };
const vsetStars = si => { let n = 0; for (let i = 0; i < vsetLen(si); i++) { const r = varRec(si, i); if (r) n += r.s; } return n; };
const vsetScore = si => { let n = 0; for (let i = 0; i < vsetLen(si); i++) { const r = varRec(si, i); if (r) n += r.sc || 0; } return n; };
const totalCleared = () => Object.keys(DB.col).length;
const totalVar = () => Object.keys(DB.vcol).length;
const totalVarLen = () => (PV ? PV.sets.reduce((a, s) => a + s.puzzles.length, 0) : 0);

/* ================= scoring ================= */
const PAR = { e: 300000, m: 600000, h: 1200000 };
function dailyScore(d, r) {
  const base = { e: 100, m: 200, h: 300 }[d];
  const speed = Math.max(0, Math.min(1, (PAR[d] * 2 - r.t) / (PAR[d] * 2)));
  let s = base + base * .6 * speed + (r.m ? 0 : base * .2) + (r.h ? 0 : base * .2);
  s *= Math.max(.3, 1 - r.h * .1);
  if (r.late) s *= .5;
  return Math.round(s);
}
const puzzleScore = (lv, stars, mult = 1) => Math.round({ 1: 60, 2: 120, 3: 200, 4: 320 }[lv] * { 1: 1, 2: 1.3, 3: 1.6 }[stars] * mult);
function addScore(n) {
  if (n <= 0) return;
  const ym = thisMonth();
  DB.sc.tot += n; DB.sc.m[ym] = (DB.sc.m[ym] || 0) + n;
  DB.pts += n; DB.ptsAll += n;
}
const monthScore = ym => DB.sc.m[ym || thisMonth()] || 0;

/* ================= audio & haptics ================= */
let AC = null;
function tone(freq, dur = .08, type = 'sine', vol = .08, at = 0) {
  if (!DB.set.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t0 = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .008); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + dur + .02);
  } catch (e) {}
}
const SFX = {
  tap: () => tone(880, .05, 'sine', .035),
  place: () => { tone(740, .07, 'triangle', .07); tone(1110, .09, 'sine', .04, .04); },
  note: () => tone(560, .05, 'sine', .04),
  erase: () => tone(330, .06, 'triangle', .05),
  err: () => { tone(220, .14, 'square', .035); tone(185, .16, 'square', .03, .07); },
  unit: () => [784, 988, 1175].forEach((f, i) => tone(f, .12, 'triangle', .06, i * .06)),
  win: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, .28, 'triangle', .07, i * .09)),
  hint: () => { tone(988, .1, 'sine', .05); tone(1319, .14, 'sine', .04, .08); },
  ach: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, .2, 'sine', .05, i * .07)),
  rumble: () => [140, 160, 150, 170, 155].forEach((f, i) => tone(f, .12, 'triangle', .06, i * .1)),
  pop: () => { tone(600, .06, 'sine', .07); tone(1200, .12, 'sine', .05, .05); },
  rare: () => [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) => tone(f, .35, 'triangle', .06, i * .07)),
};
const vib = ms => { if (DB.set.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} };

/* ================= toasts & confetti ================= */
function toast(html, cls = '') {
  const el = document.createElement('div'); el.className = 'toast ' + cls; el.innerHTML = html;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3200);
}
function confetti(n = 140, gold) {
  if (!DB.set.motion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('#fx'), ctx = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = gold ? ['#ffd36b', '#fff2b8', '#ffb347', '#ffe9f5', '#c39bff'] : ['#ff8fb6', '#ffd36b', '#8fe3b0', '#8fc4ff', '#c39bff', '#ff9f7a'];
  const P = [];
  for (let i = 0; i < n; i++) {
    const side = i % 2; P.push({ x: side ? innerWidth + 10 : -10, y: innerHeight * (.35 + Math.random() * .3), vx: (side ? -1 : 1) * (4 + Math.random() * 7), vy: -(6 + Math.random() * 9), r: Math.random() * 6.28, vr: (Math.random() - .5) * .3, w: 6 + Math.random() * 6, h: 4 + Math.random() * 5, c: cols[i % cols.length], s: Math.random() < .3 });
  }
  let f = 0;
  (function step() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of P) {
      p.vy += .28; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      if (p.s) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, 6.28); ctx.fill(); } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (++f < 170) requestAnimationFrame(step); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })();
}

/* ================= time of day & background ================= */
function curTod() {
  const s = DB.set.tod;
  if (s !== 'auto') return s;
  const h = new Date().getHours();
  return h >= 5 && h < 16 ? 'day' : h >= 16 && h < 19 ? 'eve' : 'night';
}
let bgKey = '', bgDims = [0, 0], scene = ['daily', 'e', 'de'];
function setScene(name, variant, th) {
  scene = [name, variant, th];
  const tod = curTod();
  document.body.dataset.th = th;
  document.body.classList.toggle('night', tod === 'night');
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.content = tod === 'night' ? '#1b1a42' : '#fff4ea';
  const key = name + ':' + (variant || '') + ':' + tod;
  const W = innerWidth, H = innerHeight;
  const changed = Math.abs(W / H - bgDims[0] / bgDims[1]) > .15 || !bgDims[0];
  if (key === bgKey && !changed) return;
  const el = $('#bg');
  const put = () => { el.innerHTML = BG.svg(name, Math.round(W), Math.round(H), variant, tod); el.classList.remove('fade'); };
  bgDims = [W, H];
  if (bgKey && key !== bgKey) { el.classList.add('fade'); setTimeout(put, 220); } else put();
  bgKey = key;
}
const refreshScene = () => setScene(scene[0], scene[1], scene[2]);
const homeVariant = () => { const h = new Date().getHours(); return h >= 11 ? 'm' : 'e'; };
// home background: any collection theme cleared 50/50 can be used
const isSpBg = k => !!(SPD && SPD.bgs.includes(k));
const hbOK = k => { if (isSpBg(k)) return SPD.bgOwned(k); const i = THEMES.indexOf(k); return i >= 0 && PZ && themeCleared(i) === 50; };
const hbKey = () => (MODE === 'speed' ? 'homeBgS' : 'homeBg');
const bgName = k => (!k ? (MODE === 'speed' ? t('sbg.speedway') : t('hb.def')) : isSpBg(k) ? t('sbg.' + k) : t('th.' + THEMES.indexOf(k)));
function homeScene() {
  const k = DB.set[hbKey()];
  if (k && hbOK(k)) setScene(k, '', isSpBg(k) ? 'spd' : k);
  else if (MODE === 'speed') setScene('speedway', '', 'spd');
  else setScene('daily', homeVariant(), 'de');
}
function setHomeBg(k) { DB.set[hbKey()] = k; persist(); SFX.tap(); toast(esc(t('hb.done', { t: bgName(k) }))); }

/* ================= modals (with back-button support) ================= */
function openModal(id) {
  const m = $('#' + id); if (m.classList.contains('on')) return;
  m.classList.add('on');
  try { history.pushState({ modal: id }, ''); } catch (e) {}
}
function closeModals(viaHistory) {
  const on = $$('.modal.on');
  on.forEach(m => m.classList.remove('on'));
  if (!viaHistory && history.state && history.state.modal) { modalPop = true; history.back(); }
}
let modalPop = false;
function closeTop() { closeModals(); }
addEventListener('popstate', () => {
  if (modalPop) { modalPop = false; return; }
  if ($('.modal.on')) { $$('.modal.on').forEach(m => m.classList.remove('on')); }
});
$$('.modal').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) { if (m.dataset.lock && e.target === m) return; closeTop(); } });
});

/* ================= screens / routing ================= */
let screen = 'home', calMonth = null;
function show(id) {
  if (screen === 'game' && id !== 'game') leaveGame();
  if (screen === 'spd' && id !== 'spd' && SPD) SPD.leave();
  screen = id;
  $$('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  $('#main').classList.toggle('gm', id === 'game' || id === 'spd');
  scrollTo(0, 0);
}
function route() {
  const p = location.hash.replace(/^#/, '').split('/');
  if ($('.modal.on')) $$('.modal.on').forEach(m => m.classList.remove('on'));
  if (p[0] === 's' && SPD && SPD.route(p)) return;
  if (p[0] === 'd' && /^\d{4}-\d\d-\d\d$/.test(p[1]) && DIFFS.includes(p[2]) && p[1] >= FIRST_DAY && p[1] <= today()) return openGame({ kind: 'd', date: p[1], d: p[2] });
  if (p[0] === 'c' && +p[1] >= 1 && +p[1] <= NT && +p[2] >= 1 && +p[2] <= 50) return openGame({ kind: 'c', ti: +p[1] - 1, pi: +p[2] - 1 });
  if (p[0] === 'x' && PV && vset(+p[1] - 1) && +p[2] >= 1 && +p[2] <= vsetLen(+p[1] - 1)) return openGame({ kind: 'x', si: +p[1] - 1, pi: +p[2] - 1 });
  if (p[0] === 't' && +p[1] >= 1 && +p[1] <= NT) return openTheme(+p[1] - 1, p[2] === 'm' ? 'map' : '');
  if (p[0] === 'v' && PV && vset(+p[1] - 1)) return openVset(+p[1] - 1);
  openHome();
}
function go(h) {
  if (history.state && history.state.modal) {
    $$('.modal.on').forEach(m => m.classList.remove('on'));
    history.replaceState(null, '', '#' + h); route(); return;
  }
  if (location.hash === '#' + h || (!h && !location.hash)) route(); else location.hash = h;
}
/* back to the home screen on a given tab (speed screens go to the すぴーど tab inside まいにち数独) */
function goHome(tab) { DB[MODE === 'speed' ? 'homeTabS' : 'homeTab'] = MODE === 'speed' ? tab : (SPD ? 'spd' : 'daily'); persist(); go(''); }

/* ================= home ================= */
function openHome() {
  show('home');
  homeScene();
  renderHome();
  if (!DB.prof.name) setTimeout(() => openName(true), 350);
  else if (MODE !== 'speed') checkMonthAwards();
  if (DB.prof.name && !DB.seenTut && TUT) { DB.seenTut = 1; persist(); setTimeout(() => openHelp(), 500); }
}
function dailyStatus(date, d) { return { r: (DB.daily[date] || {})[d], sv: DB.saves['d/' + date + '/' + d] }; }
function diffButtons(date, host) {
  host.innerHTML = DIFFS.map(d => {
    const { r, sv } = dailyStatus(date, d);
    const st = r ? '✓ ' + fmtTime(r.t) : sv ? fmtTime(sv.t) : t('d.' + d + '.sub');
    return `<button class="dbtn ${r ? 'done' : ''}" data-d="${d}">${!r && sv ? `<span class="resume">${esc(t('resume'))}</span>` : ''}${medal(DTIER[d], 'md')}<span class="lb">${esc(t('d.' + d))}</span><span class="st">${esc(st)}</span></button>`;
  }).join('');
  host.querySelectorAll('.dbtn').forEach(b => b.onclick = () => { SFX.tap(); go('d/' + date + '/' + b.dataset.d); });
}
let myRanks = { m: null, tot: null };
function renderProfile() {
  const p = DB.prof, ym = thisMonth();
  const ic = p.icon >= 0 ? p.icon : -1;
  const rk = myRanks.m ? '#' + fmtN(myRanks.m) : '—';
  $('#profCard').innerHTML = `<div class="prof">
    <button class="pav" id="pAv" title="${esc(t('zk.title'))}">${iconSvg(ic)}<i>${PENCIL}</i></button>
    <div style="min-width:0"><div class="pn"><b>${esc(p.name || t('prof.guest'))}</b><button id="pEdit" title="${esc(t('prof.edit'))}">${PENCIL}</button></div>
      <div class="ptitle">${ic >= 0 ? rarChip(iconInfo(ic).rarity) + '<span>' + esc(iconName(ic)) + '</span>' : esc(t('prof.noicon'))}</div></div>
    <div class="pstats">
      <div class="pstat"><small>${esc(t('prof.month', { m: fmtMonth(ym) }))}</small><b>${fmtN(MODE === 'speed' && SPD ? SPD.monthPts(ym) : monthScore(ym))}</b></div>
      <div class="pstat"><small>${esc(t('prof.total'))}</small><b>${fmtN(MODE === 'speed' && SPD ? SPD.totalPts() : DB.sc.tot)}</b></div>
      <div class="pstat"><small>${esc(t('prof.rank'))}</small><b>${rk}</b>${myRanks.tot ? `<em>${esc(t('prof.totrank', { n: fmtN(myRanks.tot) }))}</em>` : ''}</div>
    </div>
    <div class="pact"><span class="pts" title="${esc(t('pts.title'))}">${COIN}${fmtN(DB.pts)}</span><button class="btn sm" id="pGacha">${esc(t('ga.btn'))}</button><button class="btn sm ghost" id="pRank">${esc(t('rk.title'))}</button></div>
  </div>`;
  $('#pAv').onclick = () => { SFX.tap(); openZukan(); };
  $('#pEdit').onclick = () => { SFX.tap(); openName(false); };
  $('#pGacha').onclick = () => { SFX.tap(); openGacha(); };
  $('#pRank').onclick = () => { SFX.tap(); if (MODE === 'speed' && SPD) SPD.openRank(); else openRank(); };
}
async function loadMyRanks() {
  if (!ON || !ON.available || !DB.prof.name) return;
  if (MODE === 'speed') { if (SPD) { myRanks = await SPD.myRanks(); if (screen === 'home') renderProfile(); } return; }
  try {
    const [m, tot] = await Promise.all([ON.myScore('month/' + thisMonth()), ON.myScore('total')]);
    myRanks = { m: m && m.rank, tot: tot && tot.rank };
    if (screen === 'home') renderProfile();
  } catch (e) {}
}
function setHomeTab(p) {
  if (p === 'var' && (!PV || !E.setVariant)) p = 'daily';
  if (p === 'spd' && !SPD) p = 'daily';
  if (MODE === 'speed') { if (p !== 'col') p = 'daily'; DB.homeTabS = p; } else DB.homeTab = p;
  persist();
  $$('#htabs button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  $$('.hpanel').forEach(x => x.classList.toggle('on', x.dataset.p === p));
}
function renderHome() {
  renderProfile();
  if (MODE === 'speed') { setHomeTab(DB.homeTabS || 'daily'); if (SPD) SPD.renderHome(); loadMyRanks(); return; }
  const st = $('#htabs [data-p=spd]'); if (st) st.hidden = !SPD;
  $('#htabs [data-p=var]').hidden = !PV || !E.setVariant;
  setHomeTab(DB.homeTab);
  const td = today();
  $('#todayDate').textContent = fmtDate(td, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  const sk = streakInfo();
  const s = $('#streak'); s.classList.toggle('zero', !sk.cur);
  s.innerHTML = FLAME + esc(sk.cur ? t('streak', { n: sk.cur }) : t('streak0'));
  diffButtons(td, $('#todayDiffs'));
  if (!calMonth) calMonth = td.slice(0, 7);
  renderCal();
  const tot = totalCleared();
  $('#colBar').style.width = (tot / NCOL * 100) + '%';
  $('#colCount').textContent = tot + ' / ' + NCOL;
  $('#themes').innerHTML = ORDER.map(i => { const k = THEMES[i];
    const n = themeCleared(i), lvs = [...new Set(PZ.themes[i].map(s => +s[81]))];
    return `<button class="tcard ${n === 50 ? 'full' : ''}" data-t="${i}"><div class="pic">${BG.svg(k, 320, 200)}<span class="no">${TNO(i)}</span><span class="crown">${CROWN}</span></div><div class="tx"><span class="nm">${esc(t('th.' + i))}</span><span class="lv">${lvs.map(lvChip).join('')}</span><span class="pg"><span class="bar"><i style="width:${n * 2}%"></i></span>${n}/50</span></div></button>`;
  }).join('');
  $$('#themes .tcard').forEach(b => b.onclick = () => { SFX.tap(); go('t/' + (+b.dataset.t + 1)); });
  // variants
  const vc = $('#vsets').closest('.card');
  vc.hidden = !PV || !E.setVariant;
  if (!vc.hidden) {
    const vt = totalVar(), vl = totalVarLen();
    $('#varBar').style.width = (vt / vl * 100) + '%';
    $('#varCount').textContent = vt + ' / ' + vl;
    $('#vsets').innerHTML = PV.sets.map((s, i) => {
      const n = vsetCleared(i), L = vsetLen(i);
      return `<button class="tcard vcard ${n === L ? 'full' : ''}" data-v="${i}" style="--vc1:${VCOL[s.type][0]};--vc2:${VCOL[s.type][1]}"><div class="pic">${miniBoard(s.type)}<span class="crown">${CROWN}</span></div><div class="tx"><span class="nm">${esc(t('vt.' + s.type))}</span><span class="lv">${esc(t('vt.' + s.type + '.short'))}</span><span class="pg"><span class="bar"><i style="width:${n / L * 100}%"></i></span>${n}/${L}</span></div></button>`;
    }).join('');
    $$('#vsets .tcard').forEach(b => b.onclick = () => { SFX.tap(); go('v/' + (+b.dataset.v + 1)); });
  }
  loadMyRanks();
  renderDailyExtra();
  if (SPD) SPD.renderHome();
}
/* daily panel: today's mini ranking + goals close to completion */
let dxDiff = 'e';
async function renderDailyExtra() {
  const host = $('#dailyExtra'); if (!host) return;
  const goals = catalog().filter(a => !a.got && a.prog && a.prog[1] > 0 && a.group !== 'month' && a.group !== 'rank')
    .map(a => Object.assign({ r: Math.min(1, a.prog[0] / a.prog[1]) }, a)).sort((x, y) => y.r - x.r || x.prog[1] - y.prog[1]).slice(0, 3);
  const goalsH = `<div class="dx"><h3>${badge(1, 'star').replace('<svg', '<svg style="width:22px;height:22px"')}${esc(t('dx.goals'))}</h3>${goals.map(a => `<div class="goal">${badge(a.tier, a.icon)}<div class="gt2"><b>${esc(a.name)}</b><div class="bar"><i style="width:${(a.r * 100).toFixed(1)}%"></i></div></div><small>${Math.min(a.prog[0], a.prog[1])}/${a.prog[1]}</small></div>`).join('')}</div>`;
  const chips = `<div class="chips">${DIFFS.map(d => `<button data-d="${d}" class="${d === dxDiff ? 'on' : ''}">${esc(t('d.' + d))}</button>`).join('')}</div>`;
  const rankHead = `<h3>${badge(3, 'podium').replace('<svg', '<svg style="width:22px;height:22px"')}${esc(t('dx.rank'))}${chips}</h3>`;
  host.innerHTML = `<div class="dx" id="dxRank">${rankHead}<div class="rkmsg" style="padding:10px">${esc(t('rk.loading'))}</div></div>` + goalsH;
  host.querySelectorAll('#dxRank [data-d]').forEach(b => b.onclick = () => { dxDiff = b.dataset.d; SFX.tap(); renderDailyExtra(); });
  const box = $('#dxRank');
  const body = html => { box.innerHTML = rankHead + html; box.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { dxDiff = b.dataset.d; SFX.tap(); renderDailyExtra(); }); };
  if (!ON || !ON.available) { body(`<p class="note">${esc(t('rk.prep'))}</p>`); return; }
  if (!DB.prof.name) { body(`<p class="note">${esc(t('dx.noname'))}</p>`); return; }
  try {
    const td = today(), d = dxDiff;
    const [rows, mine] = await Promise.all([ON.topDaily(td, d, 3), ON.myDaily(td, d)]);
    if (d !== dxDiff || screen !== 'home') return;
    rows.sort((a, b) => a.t - b.t);
    let h = rows.length ? '<ol class="mini">' + rows.map((r, k) => `<li class="${r.uid === ON.uid ? 'me' : ''}"><span class="no">${miniMedal(3 - k)}</span>${avatar(r.i, 30)}<span class="nm">${esc(r.n)}</span><span class="vl">${fmtTime(r.t)}</span></li>`).join('') + '</ol>' : `<p class="note">${esc(t('rk.empty'))}</p>`;
    h += `<p class="note">${mine ? esc(t('dx.mine', { n: fmtN(mine.rank), t: fmtTime(mine.me.t) })) : esc(t('dx.notyet', { d: t('d.' + d) }))} <a href="#" id="dxMore">${esc(t('dx.more'))}</a></p>`;
    body(h);
    const m = $('#dxMore'); if (m) m.onclick = e => { e.preventDefault(); rkTab = 'daily'; rkDiff = d; rkDate = td; openRank(); };
  } catch (e) { body(`<p class="note">${esc(t('rk.err'))}</p>`); }
}
function renderCal() {
  const [y, m] = calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1), nd = daysIn(y, m), td = today();
  $('#calTitle').textContent = fmtMonth(calMonth);
  $('#calPrev').disabled = calMonth <= FIRST_DAY.slice(0, 7);
  $('#calNext').disabled = calMonth >= td.slice(0, 7);
  const wd = []; for (let i = 0; i < 7; i++) wd.push(new Date(2026, 9, 4 + i).toLocaleDateString(locale(), { weekday: 'narrow' }));
  let h = wd.map((w, i) => `<span class="wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${esc(w)}</span>`).join('');
  for (let i = 0; i < first.getDay(); i++) h += '<span class="day empty"></span>';
  for (let d = 1; d <= nd; d++) {
    const ds = calMonth + '-' + pad2(d), rec = DB.daily[ds] || {};
    const ok = ds >= FIRST_DAY && ds <= td;
    const ms = DIFFS.filter(x => rec[x]).map(x => miniMedal(DTIER[x], rec[x].late)).join('');
    h += `<button class="day ${ds === td ? 'today' : ''} ${DIFFS.every(x => rec[x]) ? 'all3' : ''}" data-ds="${ds}" ${ok ? '' : 'disabled'}><span class="num">${d}</span><span class="ms">${ms}</span></button>`;
  }
  $('#cal').innerHTML = h;
  $$('#cal .day[data-ds]').forEach(b => b.onclick = () => openDay(b.dataset.ds));
  const mb = monthBadges(calMonth);
  $('#calBadges').innerHTML = `<span class="t">${esc(t('cal.month.ach'))}</span>` + [['3', 'm.3'], ['7', 'm.7'], ['all', 'm.all']].map(([k, lab]) =>
    `<span class="mbadge ${mb[k] ? '' : 'lock'}" title="${esc(t('a.m' + k + '.d'))}">${badge(mb[k] || 1, k === 'all' ? nd : k)}<span>${esc(t(lab))}</span></span>`).join('');
}
function openDay(ds) {
  SFX.tap();
  if (ds === today()) { go('d/' + ds + '/' + (DIFFS.find(d => !(DB.daily[ds] || {})[d]) || 'e')); return; }
  $('#dayTitle').textContent = fmtDate(ds, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  diffButtons(ds, $('#dayDiffs'));
  $('#dayNote').textContent = t('day.late');
  openModal('mDay');
}

/* ================= theme map ================= */
let curTheme = 0;
function openTheme(ti, stage) {
  curTheme = ti; show('theme');
  setScene(THEMES[ti], '', THEMES[ti]);
  const n = themeCleared(ti);
  $('#tlName').textContent = TNO(ti) + '. ' + t('th.' + ti);
  $('#tlProg').innerHTML = `${n}/50 · ${STAR(true).replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px"')} ${themeStars(ti)}/150`;
  const lvs = [...new Set(PZ.themes[ti].map(s => +s[81]))];
  const legend = `<div class="legend">${lvs.map(l => `<span><i style="background:${LVCOL[l]}"></i>${esc(t('lv.' + l))}</span>`).join('')}<span>· ${esc(t('tl.stars'))}</span></div>`;
  $('#theme').classList.toggle('ovw', stage !== 'map');
  if (stage !== 'map') {
    // stage 1: overview box
    const st = startTarget('c', ti);
    const lab = st.k < 0 ? t('st.mapall') : st.cont ? t('st.cont', { n: st.k + 1 }) : t('st.start');
    $('#tlIntro').innerHTML = `<div class="intro"><div class="ban" id="tlBan" title="${esc(t('st.map'))}">${BG.svg(THEMES[ti], 320, 200, '', curTod())}<span class="mapcue"><svg viewBox="0 0 24 24"><path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/></svg>${esc(t('st.map'))}</span></div><dl>
      <dt>${esc(t('ti.theme'))}</dt><dd>${esc(t('thd.' + ti))}</dd>
      <dt>${esc(t('ti.level'))}</dt><dd>${lvs.map(lvChip).join(' ')} <span class="note" style="margin:0">${esc(t('thl.' + ti))}</span></dd>
      <dt>${esc(t('ti.score'))}</dt><dd class="num">${fmtN(themeScore(ti))}</dd></dl>
      <div class="story">${esc(t('ths.' + ti))}</div>
      <div class="startrow"><button class="btn xl" id="stGo"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>${esc(lab)}</button>${st.k < 0 ? '' : `<button class="btn ghost sm" id="stMap">${esc(t('st.map'))}</button>`}${n === 50 ? `<button class="btn ghost sm hbbtn ${DB.set.homeBg === THEMES[ti] ? 'on' : ''}" id="stHb">${esc(t(DB.set.homeBg === THEMES[ti] ? 'hb.on' : 'hb.set'))}</button>` : ''}</div></div>`;
    $('#tlBody').innerHTML = '';
    const toMap = () => { SFX.tap(); go('t/' + (ti + 1) + '/m'); };
    $('#stGo').onclick = toMap; if ($('#stMap')) $('#stMap').onclick = toMap; $('#tlBan').onclick = toMap;
    const hb = $('#stHb'); if (hb) hb.onclick = () => { if (DB.set.homeBg === THEMES[ti]) return; setHomeBg(THEMES[ti]); hb.classList.add('on'); hb.textContent = t('hb.on'); };
    $('#tlBack').onclick = () => go('');
    return;
  }
  // stage 2: map, scrolled to the current position
  const st = startTarget('c', ti);
  $('#tlIntro').innerHTML = '';
  $('#tlBody').innerHTML = `<div class="mapwrap"><div class="map" id="map"></div></div>${legend}${st.k >= 0 ? `<div class="mapgo"><button class="btn xl" id="mapPlay"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>${esc(t('st.play', { n: st.k + 1 }))}</button></div>` : ''}`;
  const mp = $('#mapPlay'); if (mp) mp.onclick = () => { SFX.tap(); go('c/' + (ti + 1) + '/' + (st.k + 1)); };
  $('#tlBack').onclick = () => go('t/' + (ti + 1));
  drawMap(ti, true, st.k);
}
/* intro start button: はじめる / つづきから */
function startTarget(kind, ix) {
  const L = kind === 'c' ? 50 : vsetLen(ix), pre = kind === 'c' ? 'c/' : 'x/';
  const rec = kind === 'c' ? colRec : varRec;
  for (let k = 0; k < L; k++) if (DB.saves[pre + (ix + 1) + '/' + (k + 1)] && !rec(ix, k)) return { k, cont: true };
  const played = [...Array(L).keys()].some(k => rec(ix, k));
  const nx = kind === 'c' ? nextUncleared(ix, -1) : nextVar(ix, -1);
  return { k: nx, cont: played };
}
function startRow(kind, ix) {
  const st = startTarget(kind, ix);
  const lab = st.k < 0 ? t('tl.allclear') : st.cont ? t('st.cont', { n: st.k + 1 }) : t('st.start');
  return `<div class="startrow"><button class="btn xl" id="stGo" data-to="${st.k < 0 ? '' : (kind === 'c' ? 'c/' : 'x/') + (ix + 1) + '/' + (st.k + 1)}" ${st.k < 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>${esc(lab)}</button>${kind === 'c' ? `<button class="btn ghost sm" id="stMap">${esc(t('st.map'))}</button>` : ''}</div>`;
}
function wireStart() {
  const g = $('#stGo'); if (g) g.onclick = () => { if (g.dataset.to) { SFX.tap(); go(g.dataset.to); } };
  const m = $('#stMap'); if (m) m.onclick = () => { const nx = $('#map .node.next') || $('#map .node'); if (nx) nx.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
}
function drawMap(ti, scrollToNext, focusK) {
  const host = $('#map'); if (!host) return;
  const W = Math.max(280, host.clientWidth), step = 92, N = 50, top = 90, bottom = 70;
  const H = top + bottom + (N - 1) * step;
  const amp = Math.min(W * .32, 220);
  const pts = []; for (let k = 0; k < N; k++) pts.push([W / 2 + amp * Math.sin(k * .62 + .4), H - bottom - k * step]);
  // smooth road through the points (Catmull-Rom → Bézier)
  let d = `M${pts[0][0].toFixed(1)} ${(pts[0][1] + 60).toFixed(1)}L${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < N - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(N - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  d += `L${pts[N - 1][0].toFixed(1)} ${(pts[N - 1][1] - 60).toFixed(1)}`;
  const night = curTod() === 'night';
  const th = THEMES[ti];
  const ground = { forest: ['#dff5cf', '#c3ebaa'], harbor: ['#d7efff', '#f6e3c2'], sweets: ['#ffe6f1', '#fff0e0'], sea: ['#bfeaf5', '#8fd6ea'], garden: ['#e9f9d9', '#d2f0bc'], festival: ['#ffe4d6', '#f7d1e4'], autumn: ['#ffeacc', '#f6d2a3'], snow: ['#f2f6ff', '#dfe8ff'], stars: ['#3b2f7a', '#251d5a'], castle: ['#f8e6ff', '#ffe6f2'], cloudranch: ['#eaf6ff', '#d6ecff'], park: ['#fff0f6', '#e8f4ff'], iceberg: ['#e6f6ff', '#cfe9fb'], desert: ['#fff1d2', '#f7dcaa'], toytown: ['#fff3dd', '#e3f1ff'], library: ['#f6e8d6', '#ead6bd'], rain: ['#e3f0f7', '#d8e9df'], jungle: ['#d6f2c6', '#a9dd98'], bakery: ['#fff1de', '#f9e0c2'], moon: ['#4a3f86', '#2c2563'] }[th];
  const dark = th === 'stars' || th === 'moon', icy = th === 'snow' || th === 'iceberg' || th === 'cloudranch';
  const roadC = th === 'sea' ? '#f6e6b8' : dark ? '#6b5bb8' : icy ? '#ffffff' : '#fff3dc';
  const edgeC = dark ? '#4a3d95' : icy ? '#c9d6f5' : '#e9cfa3';
  const r = BG.rng(97 + ti * 13);
  let deco = '';
  for (let k = 0; k < N * 1.6; k++) {
    const y = top - 20 + r() * (H - top);
    const kk = Math.max(0, Math.min(N - 1, Math.round((H - bottom - y) / step)));
    const rx = pts[kk][0], side = rx > W / 2 ? -1 : 1;
    let x = rx + side * (70 + r() * (W * .3));
    if (x < 18 || x > W - 18) x = rx - side * (70 + r() * 40);
    if (Math.abs(x - rx) < 60) continue;
    deco += BG.deco(th, x, y + 20, 30 + r() * 16, r);
  }
  const gid = 'mg' + ti;
  let flags = '';
  for (let k = 9; k < N; k += 10) { const [x, y] = pts[k]; flags += `<g transform="translate(${(x + (x > W / 2 ? -46 : 46)).toFixed(1)} ${(y - 4).toFixed(1)})"><path d="M0 0v-34" stroke="#8f6a4a" stroke-width="3" stroke-linecap="round"/><path d="M1 -34h20l-6 7 6 7H1z" fill="${k === 49 ? '#ffcd4d' : '#ff8fb6'}"/></g>`; }
  host.style.height = H + 'px';
  let html = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ground[0]}"/><stop offset="1" stop-color="${ground[1]}"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#${gid})"/>${night ? `<rect width="${W}" height="${H}" fill="#34337a" opacity=".85" style="mix-blend-mode:multiply"/>` : ''}<g opacity="${night ? .75 : 1}">${deco}</g><path d="${d}" fill="none" stroke="${edgeC}" stroke-width="40" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${roadC}" stroke-width="32" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${edgeC}" stroke-width="3" stroke-dasharray="10 12" stroke-linecap="round" opacity=".8"/>${flags}</svg>`;
  const next = nextUncleared(ti, -1);
  for (let k = 0; k < N; k++) {
    const rec = colRec(ti, k), lv = +PZ.themes[ti][k][81], sv = DB.saves['c/' + (ti + 1) + '/' + (k + 1)];
    const [x, y] = pts[k];
    html += `<button class="node ${rec ? 'cleared' : ''} ${k === next ? 'next' : ''} ${k % 10 === 9 ? 'boss' : ''}" data-p="${k}" style="left:${(x / W * 100).toFixed(3)}%;top:${y.toFixed(1)}px" title="${esc(t('lv.' + lv))}"><span class="lvd" style="background:${LVCOL[lv]}"></span>${sv && !rec ? '<span class="ip"></span>' : ''}<span class="n">${k + 1}</span><span class="stars">${rec ? [1, 2, 3].map(q => STAR(q <= rec.s)).join('') : ''}</span></button>`;
  }
  if (next >= 0) html += `<div class="mapme" style="left:${(pts[next][0] / W * 100).toFixed(3)}%;top:${pts[next][1].toFixed(1)}px">${avatar(DB.prof.icon, 44)}</div>`;
  host.innerHTML = html;
  host.querySelectorAll('.node').forEach(b => b.onclick = () => { SFX.tap(); go('c/' + (ti + 1) + '/' + (+b.dataset.p + 1)); });
  if (scrollToNext) {
    const k = focusK != null && focusK >= 0 ? focusK : next >= 0 ? next : 0;
    requestAnimationFrame(() => {
      const rect = host.getBoundingClientRect();
      const yAbs = rect.top + scrollY + pts[k][1];
      scrollTo({ top: Math.max(0, yAbs - innerHeight * .55), behavior: 'instant' in window ? 'instant' : 'auto' });
    });
  }
}
function nextUncleared(ti, after) {
  for (let k = 1; k <= 50; k++) { const p = (after + k) % 50; if (!colRec(ti, p)) return p; }
  return -1;
}

/* ================= variant sets ================= */
function miniBoard(type, big) {
  const S = 18, P = 4, W = S * 9 + P * 2;
  let s = `<svg viewBox="0 0 ${W} ${W}"><rect x="${P - 2}" y="${P - 2}" width="${S * 9 + 4}" height="${S * 9 + 4}" rx="8" fill="#fff" stroke="#8a78b0" stroke-width="2.5"/>`;
  const cell = (i, fill, extra = '') => `<rect x="${P + (i % 9) * S}" y="${P + ((i / 9) | 0) * S}" width="${S}" height="${S}" fill="${fill}" ${extra}/>`;
  const JR = '000111222000111222003311422033311442335554444666557777866557787866588887866588877'.split('').map(Number);
  if (type === 'x') for (let k = 0; k < 9; k++) { s += cell(k * 10, '#ffd6e4') + cell(k * 8 + 8, '#ffd6e4'); }
  if (type === 'hyper') for (const [r0, c0] of [[1, 1], [1, 5], [5, 1], [5, 5]]) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) s += cell((r0 + r) * 9 + c0 + c, '#cfe6ff');
  if (type === 'jigsaw') { const cols = ['#ffe0e8', '#dcefff', '#fff2c4', '#ddf5e4']; const rc = [0, 1, 2, 1, 3, 0, 2, 3, 1]; for (let i = 0; i < 81; i++) s += cell(i, cols[rc[JR[i]]]); }
  if (type === 'oddeven') { const marks = [2, 6, 10, 14, 20, 24, 30, 31, 38, 40, 44, 49, 56, 58, 66, 70, 74, 78]; marks.forEach((i, k) => { const x = P + (i % 9) * S + S / 2, y = P + ((i / 9) | 0) * S + S / 2; s += k % 2 ? `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="3" fill="#bcdcff"/>` : `<circle cx="${x}" cy="${y}" r="6.5" fill="#ffd2a8"/>`; }); }
  for (let k = 1; k < 9; k++) {
    const thick = type !== 'jigsaw' && k % 3 === 0;
    s += `<path d="M${P + k * S} ${P}V${P + 9 * S}M${P} ${P + k * S}H${P + 9 * S}" stroke="${thick ? '#8a78b0' : '#e4dcef'}" stroke-width="${thick ? 2 : 1}"/>`;
  }
  if (type === 'jigsaw') for (let i = 0; i < 81; i++) { const r = (i / 9) | 0, c = i % 9, x = P + c * S, y = P + r * S; if (c < 8 && JR[i] !== JR[i + 1]) s += `<path d="M${x + S} ${y}v${S}" stroke="#8a78b0" stroke-width="2.4" stroke-linecap="round"/>`; if (r < 8 && JR[i] !== JR[i + 9]) s += `<path d="M${x} ${y + S}h${S}" stroke="#8a78b0" stroke-width="2.4" stroke-linecap="round"/>`; }
  if (type === 'x') s += `<path d="M${P} ${P}L${P + 9 * S} ${P + 9 * S}M${P + 9 * S} ${P}L${P} ${P + 9 * S}" stroke="#f08aac" stroke-width="1.4" stroke-dasharray="3 3"/>`;
  if (type === 'killer') {
    const cages = [[[0, 1], 9], [[2, 11, 12], 15], [[9, 18], 7], [[30, 31, 40], 13], [[56, 57, 66], 19], [[68, 69], 11], [[44, 53], 6], [[23, 24, 25], 21]];
    for (const [cs, sum] of cages) {
      const set = new Set(cs);
      for (const i of cs) { const r = (i / 9) | 0, c = i % 9, x = P + c * S, y = P + r * S, q = 2.5;
        if (!set.has(i - 9)) s += `<path d="M${x + q} ${y + q}h${S - 2 * q}" stroke="#a46cd6" stroke-width="1.2" stroke-dasharray="2.5 2"/>`;
        if (!set.has(i + 9)) s += `<path d="M${x + q} ${y + S - q}h${S - 2 * q}" stroke="#a46cd6" stroke-width="1.2" stroke-dasharray="2.5 2"/>`;
        if (c === 0 || !set.has(i - 1)) s += `<path d="M${x + q} ${y + q}v${S - 2 * q}" stroke="#a46cd6" stroke-width="1.2" stroke-dasharray="2.5 2"/>`;
        if (c === 8 || !set.has(i + 1)) s += `<path d="M${x + S - q} ${y + q}v${S - 2 * q}" stroke="#a46cd6" stroke-width="1.2" stroke-dasharray="2.5 2"/>`; }
      const m = Math.min(...cs); s += `<text x="${P + (m % 9) * S + 3}" y="${P + ((m / 9) | 0) * S + 7.5}" font-size="6.5" font-family="Fredoka,Arial" font-weight="700" fill="#7a4cb0">${sum}</text>`;
    }
  }
  const ctr = i => [P + (i % 9) * S + S / 2, P + ((i / 9) | 0) * S + S / 2];
  if (type === 'antiknight') { const c0 = 40; s += cell(c0, '#ffe3a8'); for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) s += cell(c0 + dr * 9 + dc, '#dcefc8'); }
  if (type === 'thermo') for (const th of [[19, 20, 21, 12], [57, 58, 49, 40], [33, 34, 35]]) { const pts = th.map(ctr); s += `<path d="M${pts.map(p => p.join(' ')).join('L')}" stroke="#f3b2a8" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="${pts[0][0]}" cy="${pts[0][1]}" r="7" fill="#f3b2a8"/>`; }
  if (type === 'arrow') for (const [c0, cs] of [[10, [20, 30, 40]], [52, [61, 70]], [16, [25, 34]]]) { const p0 = ctr(c0), pts = cs.map(ctr), L = pts[pts.length - 1], Q = pts.length > 1 ? pts[pts.length - 2] : p0, dx = L[0] - Q[0], dy = L[1] - Q[1], m = Math.hypot(dx, dy), ux = dx / m, uy = dy / m; s += `<circle cx="${p0[0]}" cy="${p0[1]}" r="7.5" fill="#fff" stroke="#5aa98c" stroke-width="1.6"/><path d="M${p0[0] + ux * 0} ${p0[1]}M${[p0, ...pts].map(p => p.join(' ')).join('L')}" stroke="#5aa98c" stroke-width="1.6" fill="none" stroke-dasharray="0" opacity=".9"/><path d="M${L[0] - ux * 5 - uy * 4} ${L[1] - uy * 5 + ux * 4}L${L[0]} ${L[1]}L${L[0] - ux * 5 + uy * 4} ${L[1] - uy * 5 - ux * 4}" stroke="#5aa98c" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; }
  const digits = { 4: 5, 13: 3, 36: 8, 42: 1, 60: 7, 76: 2 };
  if (type === 'ineq') for (const [x0, y0, dir] of [[1, 0, 'r'], [3, 1, 'd'], [5, 2, 'l'], [1, 4, 'u'], [6, 4, 'r'], [4, 6, 'd'], [7, 7, 'l'], [2, 7, 'r']]) { const vx = dir === 'r' ? 1 : dir === 'l' ? -1 : 0, vy = dir === 'd' ? 1 : dir === 'u' ? -1 : 0, mx = P + (x0 + .5 + (vx ? .5 : 0) * (vx || 0) + (vx < 0 ? 0 : 0)) * S, my = P + (y0 + .5 + (vy ? .5 * vy : 0)) * S; const cx = P + (x0 + .5 + vx * .5) * S, cy = P + (y0 + .5 + vy * .5) * S; s += `<path d="M${cx - vx * 3 - vy * 4} ${cy - vy * 3 + vx * 4}L${cx + vx * 3} ${cy + vy * 3}L${cx - vx * 3 + vy * 4} ${cy - vy * 3 - vx * 4}" stroke="#4a8fd0" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`; }
  if (type === 'kropki') for (const [x0, y0, h] of [[0, 0, 1], [2, 1, 0], [4, 0, 1], [6, 2, 0], [1, 3, 1], [5, 4, 1], [3, 5, 0], [7, 5, 0], [0, 6, 1], [4, 7, 1], [6, 7, 0], [2, 8, 1]]) { const cx = P + (x0 + (h ? 1 : .5)) * S, cy = P + (y0 + (h ? .5 : 1)) * S; s += `<circle cx="${cx}" cy="${cy}" r="3.4" fill="#fff" stroke="#6a6fc8" stroke-width="1.4"/>`; }
  if (type !== 'killer') for (const i in digits) s += `<text x="${P + (i % 9) * S + S / 2}" y="${P + ((i / 9) | 0) * S + S / 2}" dy=".36em" text-anchor="middle" font-size="11" font-family="Fredoka,Arial" font-weight="600" fill="#43385a">${digits[i]}</text>`;
  return s + '</svg>';
}
let curVset = 0;
function openVset(si) {
  $('#theme').classList.remove('ovw');
  curVset = si; show('theme');
  $('#tlBack').onclick = () => go('');
  setScene('wonder', '', 'wonder');
  const s = vset(si), L = vsetLen(si), n = vsetCleared(si);
  $('#tlName').textContent = t('vt.' + s.type);
  $('#tlProg').innerHTML = `${n}/${L} · ${STAR(true).replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px"')} ${vsetStars(si)}/${L * 3}`;
  $('#tlIntro').innerHTML = `<div class="rulebox">${miniBoard(s.type)}<div><b>${esc(t('vt.' + s.type))}</b><p>${esc(t('vr.' + s.type))}</p><button class="btn sm ghost" id="vRule" style="margin-top:8px">${esc(t('rule.more'))}</button></div></div>${startRow('x', si)}`;
  wireStart();
  $('#vRule').onclick = () => openRule(s.type);
  const lvs = [...new Set(s.puzzles.map(p => p.lv))];
  $('#tlBody').innerHTML = `<div class="plist">${s.puzzles.map((p, pi) => { const r = varRec(si, pi), sv = DB.saves['x/' + (si + 1) + '/' + (pi + 1)]; return `<button class="pz ${r ? 'cleared' : ''}" data-p="${pi}" title="${esc(t('lv.' + p.lv))}"><span class="dt" style="background:${LVCOL[p.lv]}"></span>${sv && !r ? '<span class="ip"></span>' : ''}<span class="n">${pi + 1}</span><span class="stars">${r ? [1, 2, 3].map(k => STAR(k <= r.s)).join('') : ''}</span></button>`; }).join('')}</div><div class="legend">${lvs.map(l => `<span><i style="background:${LVCOL[l]}"></i>${esc(t('lv.' + l))}</span>`).join('')}<span>· ${esc(t('tl.stars'))}</span></div>`;
  $$('#tlBody .pz').forEach(b => b.onclick = () => { SFX.tap(); go('x/' + (si + 1) + '/' + (+b.dataset.p + 1)); });
}
function openRule(type) {
  $('#ruleTitle').textContent = t('vt.' + type);
  $('#ruleBody').innerHTML = `<div class="rulebox" style="grid-template-columns:140px 1fr">${miniBoard(type)}<p>${esc(t('vr.' + type))}</p></div>${t('vrd.' + type)}`;
  openModal('mRule');
}
const nextVar = (si, after) => { const L = vsetLen(si); for (let k = 1; k <= L; k++) { const p = (after + k) % L; if (!varRec(si, p)) return p; } return -1; };

/* ================= game ================= */
let G = null, sel = -1, memo = false, lockD = 0, timerI = 0, paused = false, hintState = null;
const cellEls = [];
function buildBoard() {
  const b = $('#board'); b.innerHTML = '';
  for (let i = 0; i < 81; i++) {
    const el = document.createElement('div'); el.className = 'cell'; el.dataset.i = i;
    el.innerHTML = '<span class="bv"></span><span class="v"></span><div class="nt">' + '<i></i>'.repeat(9) + '</div>';
    cellEls[i] = el; b.appendChild(el);
  }
  const ov = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ov.setAttribute('class', 'ov'); ov.setAttribute('viewBox', '0 0 900 900'); ov.setAttribute('preserveAspectRatio', 'none'); ov.id = 'ov';
  b.appendChild(ov);
  $('#pad').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button class="key" data-d="${d}"><span class="n">${d}</span><span class="c"></span></button>`).join('');
  $$('#pad .key').forEach(k => {
    k.addEventListener('pointerdown', e => { e.preventDefault(); padPress(+k.dataset.d); });
    k.addEventListener('click', e => { if (e.detail === 0) padPress(+k.dataset.d); });
  });
}
/* draw grid lines, regions and variant marks */
function drawOverlay(spec) {
  const type = spec ? spec.type : 'std';
  const B = E.BOX, U = 100;
  const night = document.body.classList.contains('night');
  const thin = night ? 'rgba(200,190,255,.16)' : 'color-mix(in srgb,var(--acc) 18%,#e6dfee)';
  const thick = night ? 'color-mix(in srgb,var(--acc) 55%,#cfc6ff)' : 'color-mix(in srgb,var(--acc) 55%,#5a4a70)';
  let s = '', tk = '';
  for (let i = 0; i < 81; i++) {
    const r = (i / 9) | 0, c = i % 9;
    if (c < 8) { const th = B[i] !== B[i + 1]; (th ? (tk += `M${(c + 1) * U} ${r * U}v${U}`) : (s += `M${(c + 1) * U} ${r * U}v${U}`)); }
    if (r < 8) { const th = B[i] !== B[i + 9]; (th ? (tk += `M${c * U} ${(r + 1) * U}h${U}`) : (s += `M${c * U} ${(r + 1) * U}h${U}`)); }
  }
  let out = `<path d="${s}" style="stroke:${thin}" stroke-width="3" fill="none"/><path d="${tk}" style="stroke:${thick}" stroke-width="7" stroke-linecap="round" fill="none"/>`;
  if (type === 'x') out += `<path d="M0 0L900 900M900 0L0 900" style="stroke:color-mix(in srgb,var(--acc) 40%,transparent)" stroke-width="3" stroke-dasharray="14 12" fill="none"/>`;
  if (type === 'killer' && spec.cages) {
    const cageOf = new Array(81).fill(-1); spec.cages.forEach(([, cs], k) => cs.forEach(i => (cageOf[i] = k)));
    const q = 10, col = night ? '#d9b8ff' : '#9a5cd0';
    let p = '';
    for (let i = 0; i < 81; i++) {
      const r = (i / 9) | 0, c = i % 9, x = c * U, y = r * U, k = cageOf[i];
      const same = j => j >= 0 && j < 81 && cageOf[j] === k;
      const L = c > 0 && same(i - 1), R = c < 8 && same(i + 1), T = same(i - 9), D = same(i + 9);
      if (!T) p += `M${x + (L ? -q : q)} ${y + q}H${x + U + (R ? q : -q)}`;
      if (!D) p += `M${x + (L ? -q : q)} ${y + U - q}H${x + U + (R ? q : -q)}`;
      if (!L) p += `M${x + q} ${y + (T ? -q : q)}V${y + U + (D ? q : -q)}`;
      if (!R) p += `M${x + U - q} ${y + (T ? -q : q)}V${y + U + (D ? q : -q)}`;
    }
    out += `<path d="${p}" stroke="${col}" stroke-width="2.6" stroke-dasharray="9 7" fill="none"/>`;
    spec.cages.forEach(([sum, cs]) => { const m = Math.min(...cs), x = (m % 9) * U, y = ((m / 9) | 0) * U; out += `<text x="${x + 13}" y="${y + 30}" font-family="Fredoka,Arial" font-weight="700" font-size="24" fill="${col}" stroke="var(--cellbg)" stroke-width="5" paint-order="stroke">${sum}</text>`; });
  }
  const cc = i => [(i % 9) * U + U / 2, ((i / 9) | 0) * U + U / 2];
  const markC = night ? '#e8e0ff' : 'color-mix(in srgb,var(--acc) 70%,#3a3050)';
  if (type === 'thermo' && spec.thermos) {
    const tc = night ? 'rgba(220,210,255,.22)' : 'color-mix(in srgb,var(--acc) 26%,transparent)';
    let th = '';
    for (const path of spec.thermos) { const p = path.map(cc); th += `<path d="M${p.map(q => q.join(' ')).join('L')}" stroke="${tc}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="${p[0][0]}" cy="${p[0][1]}" r="36" fill="${tc}"/>`; }
    out = th + out;
  }
  if (type === 'arrow' && spec.arrows) {
    const ac = night ? '#bfe8d6' : 'color-mix(in srgb,var(--acc) 65%,#2f4a40)';
    for (const [c0, cs] of spec.arrows) {
      const p0 = cc(c0), pts = cs.map(cc), f = pts[0], dx0 = f[0] - p0[0], dy0 = f[1] - p0[1], m0 = Math.hypot(dx0, dy0);
      const st = [p0[0] + dx0 / m0 * 40, p0[1] + dy0 / m0 * 40];
      const L = pts[pts.length - 1], Q = pts.length > 1 ? pts[pts.length - 2] : p0, dx = L[0] - Q[0], dy = L[1] - Q[1], m = Math.hypot(dx, dy), ux = dx / m, uy = dy / m;
      const tip = [L[0] + ux * 22, L[1] + uy * 22];
      out += `<circle cx="${p0[0]}" cy="${p0[1]}" r="40" fill="none" stroke="${ac}" stroke-width="5"/><path d="M${[st, ...pts, tip].map(q => q.map(v => v.toFixed(1)).join(' ')).join('L')}" stroke="${ac}" stroke-width="5" fill="none" stroke-linejoin="round" opacity=".85"/><path d="M${(tip[0] - ux * 18 - uy * 14).toFixed(1)} ${(tip[1] - uy * 18 + ux * 14).toFixed(1)}L${tip[0].toFixed(1)} ${tip[1].toFixed(1)}L${(tip[0] - ux * 18 + uy * 14).toFixed(1)} ${(tip[1] - uy * 18 - ux * 14).toFixed(1)}" stroke="${ac}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
  }
  if (type === 'ineq' && spec.ineq) for (const [ga, lb] of spec.ineq) {
    const A = cc(ga), Bc = cc(lb), mx = (A[0] + Bc[0]) / 2, my = (A[1] + Bc[1]) / 2, vx = Math.sign(Bc[0] - A[0]), vy = Math.sign(Bc[1] - A[1]);
    out += `<path d="M${mx - vx * 8 - vy * 11} ${my - vy * 8 + vx * 11}L${mx + vx * 8} ${my + vy * 8}L${mx - vx * 8 + vy * 11} ${my - vy * 8 - vx * 11}" stroke="var(--cellbg)" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M${mx - vx * 8 - vy * 11} ${my - vy * 8 + vx * 11}L${mx + vx * 8} ${my + vy * 8}L${mx - vx * 8 + vy * 11} ${my - vy * 8 - vx * 11}" stroke="${markC}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (type === 'kropki' && spec.dots) for (const [x, y] of spec.dots) {
    const A = cc(x), Bc = cc(y);
    out += `<circle cx="${(A[0] + Bc[0]) / 2}" cy="${(A[1] + Bc[1]) / 2}" r="12" fill="${night ? '#fff' : '#fff'}" stroke="${markC}" stroke-width="4"/>`;
  }
  $('#ov').innerHTML = out;
  // per-cell variant marks
  const regionColor = (() => { if (type !== 'jigsaw') return null; const adj = Array.from({ length: 9 }, () => new Set()); for (let i = 0; i < 81; i++) { if (i % 9 < 8 && B[i] !== B[i + 1]) { adj[B[i]].add(B[i + 1]); adj[B[i + 1]].add(B[i]); } if (i < 72 && B[i] !== B[i + 9]) { adj[B[i]].add(B[i + 9]); adj[B[i + 9]].add(B[i]); } } const col = []; for (let g = 0; g < 9; g++) { let c = 0; while ([...adj[g]].some(h => col[h] === c)) c++; col[g] = c % 4; } return col; })();
  const diag = new Set(), win = new Set();
  if (type === 'x') for (let k = 0; k < 9; k++) { diag.add(k * 10); diag.add(k * 8 + 8); }
  if (type === 'hyper') for (const [r0, c0] of [[1, 1], [1, 5], [5, 1], [5, 5]]) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) win.add((r0 + r) * 9 + c0 + c);
  for (let i = 0; i < 81; i++) {
    const el = cellEls[i];
    el.classList.remove('vd', 'vw', 'po', 'pe', 'rg0', 'rg1', 'rg2', 'rg3');
    if (diag.has(i)) el.classList.add('vd');
    if (win.has(i)) el.classList.add('vw');
    if (regionColor) el.classList.add('rg' + regionColor[B[i]]);
    if (type === 'oddeven' && spec.parity && spec.parity[i]) el.classList.add(spec.parity[i] === 1 ? 'po' : 'pe');
  }
  $('#board').classList.toggle('killer', type === 'killer');
}
const gameKey = o => o.kind === 'd' ? 'd/' + o.date + '/' + o.d : o.kind === 'c' ? 'c/' + (o.ti + 1) + '/' + (o.pi + 1) : 'x/' + (o.si + 1) + '/' + (o.pi + 1);
function openGame(o) {
  show('game');
  let P, spec = null;
  if (o.kind === 'x') { spec = varSpec(o.si, o.pi); P = varPuzzle(o.si, o.pi); }
  if (E.setVariant) E.setVariant(spec);
  if (o.kind === 'd') P = dailyPuzzle(o.date, o.d); else if (o.kind === 'c') P = colPuzzle(o.ti, o.pi);
  const sol = E.solve(P.puzzle, 1).solution;
  const key = gameKey(o);
  G = Object.assign({}, o, { key, spec, lv: P.lv, puz: P.puzzle, sol, grid: P.puzzle.slice(), notes: new Array(81).fill(0), hist: [], redo: [], time: 0, mist: 0, hints: 0, done: false });
  const sv = DB.saves[key];
  if (sv && sv.g && sv.g.length === 81) {
    G.grid = E.parse(sv.g); for (let i = 0; i < 81; i++) if (G.puz[i]) G.grid[i] = G.puz[i];
    G.notes = (sv.n || []).slice(0, 81); while (G.notes.length < 81) G.notes.push(0);
    G.time = sv.t || 0; G.mist = sv.m || 0; G.hints = sv.h || 0;
  }
  if (o.kind === 'd') setScene('daily', o.d, 'd' + o.d);
  else if (o.kind === 'c') setScene(THEMES[o.ti], '', THEMES[o.ti]);
  else setScene('wonder', '', 'wonder');
  if (o.kind === 'd') $('#gTitle').innerHTML = miniMedal(DTIER[o.d]) + `<span>${esc(fmtDate(o.date, { month: 'short', day: 'numeric' }))} ${esc(t('d.' + o.d))}</span>`;
  else if (o.kind === 'c') $('#gTitle').innerHTML = lvChip(G.lv) + `<span>${esc(t('th.' + o.ti))} #${o.pi + 1}</span>`;
  else $('#gTitle').innerHTML = lvChip(G.lv) + `<span>${esc(t('vt.' + spec.type))} #${o.pi + 1}</span>`;
  $('#gRule').hidden = o.kind !== 'x';
  $('#gRule').onclick = () => spec && openRule(spec.type);
  sel = -1; lockD = 0; memo = false; memoFocus = 0; paused = false; closeHint();
  $('#board').classList.remove('paused', 'done');
  drawOverlay(spec);
  layout(); render(); startTimer();
  if (!DB.seenHelp && !DB.seenTut) { DB.seenHelp = 1; DB.seenTut = 1; persist(); setTimeout(() => openHelp(), 400); }
  else if (spec && !DB.seenRule[spec.type]) { DB.seenRule[spec.type] = 1; persist(); setTimeout(() => openRule(spec.type), 400); }
}
function leaveGame() { if (G && !G.done) saveGame(); stopTimer(); closeHint(); hideFlick(); }
function saveGame() {
  if (!G || G.done) return;
  const touched = G.grid.some((v, i) => v && !G.puz[i]) || G.notes.some(x => x);
  if (!touched && !G.time) return;
  DB.saves[G.key] = { g: E.stringify(G.grid), n: G.notes, t: Math.round(G.time), m: G.mist, h: G.hints };
  persist();
}
let lastTick = 0, saveTick = 0;
function startTimer() {
  stopTimer(); lastTick = performance.now();
  timerI = setInterval(() => {
    const now = performance.now(), dt = now - lastTick; lastTick = now;
    if (!G || G.done || paused || document.hidden || screen !== 'game' || $('.modal.on')) return;
    G.time += Math.min(dt, 2000); DB.play += Math.min(dt, 2000);
    $('#gClock').textContent = fmtTime(G.time);
    if (now - saveTick > 5000) { saveTick = now; saveGame(); }
  }, 250);
}
function stopTimer() { clearInterval(timerI); timerI = 0; }
function setPaused(p) {
  if (!G || G.done) return; paused = p;
  $('#board').classList.toggle('paused', p);
  if (p) { closeHint(); saveGame(); }
}
document.addEventListener('visibilitychange', () => { lastTick = performance.now(); if (document.hidden && screen === 'game') saveGame(); });

function render() {
  if (!G) return;
  const s = DB.set;
  const focusD = lockD || (sel >= 0 && G.grid[sel] ? G.grid[sel] : (memo ? memoFocus : 0));
  const peers = sel >= 0 ? new Set(E.PEERS[sel]) : null;
  for (let i = 0; i < 81; i++) {
    const el = cellEls[i], v = G.grid[i];
    const given = !!G.puz[i];
    el.classList.toggle('given', given);
    el.classList.toggle('sel', i === sel);
    el.classList.toggle('peer', !!peers && peers.has(i) && s.hl);
    el.classList.toggle('same', !!v && s.hl && v === focusD && i !== sel);
    el.classList.toggle('err', !!v && !given && s.check && v !== G.sol[i]);
    el.children[1].textContent = v || '';
    const nt = el.children[2].children, m = v ? 0 : G.notes[i];
    for (let d = 1; d <= 9; d++) {
      const on = !!(m & (1 << (d - 1)));
      nt[d - 1].textContent = on ? d : '';
      nt[d - 1].className = on && s.hl && d === focusD ? 'hit' : '';
    }
  }
  const cnt = new Array(10).fill(0); for (const v of G.grid) if (v) cnt[v]++;
  $$('#pad .key').forEach(k => {
    const d = +k.dataset.d, left = 9 - cnt[d];
    k.querySelector('.c').textContent = left > 0 ? left : '';
    k.classList.toggle('done', left <= 0 && !memo);
    k.classList.toggle('lock', d === lockD);
  });
  $('#pad').classList.toggle('memo', memo);
  $('#tMemo').classList.toggle('on', memo); $('#memoBadge').textContent = memo ? 'ON' : 'OFF';
  $('#tUndo').disabled = !G.hist.length || G.done;
  const mi = $('#gMist'); mi.hidden = !s.check; mi.classList.toggle('z', !G.mist); $('#gMistN').textContent = G.mist;
  $('#gTime').hidden = !s.timer; $('#gClock').textContent = fmtTime(G.time);
  const hn = $('#hintN'), hl = hintLeft(); hn.hidden = false; hn.textContent = hl > 0 ? hl : '+'; hn.title = hl > 0 ? t('hint.left', { n: hl }) : t('hint.paid', { n: fmtN(HINT_COST) });
  const ab = $('#autoN'); ab.textContent = DB.autoLeft > 0 ? DB.autoLeft : '+'; ab.title = DB.autoLeft > 0 ? t('auto.left', { n: DB.autoLeft }) : t('auto.paid', { n: AUTO_COST });
}
function flash(i, cls, ms = 400) { const el = cellEls[i]; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); }

const bitD = d => 1 << (d - 1);
function pushHist(cells) { G.hist.push(cells.map(i => ({ i, v: G.grid[i], n: G.notes[i] }))); if (G.hist.length > 400) G.hist.shift(); G.redo = []; }
function setValue(i, d, fromHint) {
  if (!G || G.done || paused || i < 0 || G.puz[i]) return;
  if (memo && !fromHint) return toggleNote(i, d);
  closeHint();
  if (G.grid[i] === d) { pushHist([i]); G.grid[i] = 0; SFX.erase(); render(); saveGame(); return; }
  const affected = [i];
  if (DB.set.clean) for (const p of E.PEERS[i]) if (G.notes[p] & bitD(d)) affected.push(p);
  pushHist(affected);
  G.grid[i] = d; G.notes[i] = 0;
  if (DB.set.clean) for (const p of affected) if (p !== i) G.notes[p] &= ~bitD(d);
  if (d !== G.sol[i]) {
    G.mist++; if (DB.set.check) { SFX.err(); vib([30, 40, 30]); flash(i, 'shake', 340); } else SFX.place();
  } else { SFX.place(); vib(8); flash(i, 'pop', 300); checkUnits(i); }
  render(); saveGame();
  if (G.grid.every((v, k) => v === G.sol[k])) finish();
}
let memoFocus = 0;
function toggleNote(i, d) { if (G.grid[i]) return; pushHist([i]); G.notes[i] ^= bitD(d); memoFocus = d; SFX.note(); render(); saveGame(); }
function erase(i) {
  if (!G || G.done || i < 0 || G.puz[i]) return;
  if (!G.grid[i] && !G.notes[i]) return;
  pushHist([i]);
  if (G.grid[i]) G.grid[i] = 0; else G.notes[i] = 0;
  SFX.erase(); render(); saveGame();
}
function undo() {
  if (!G || G.done || !G.hist.length) return;
  const h = G.hist.pop();
  G.redo.push(h.map(c => ({ i: c.i, v: G.grid[c.i], n: G.notes[c.i] })));
  for (const c of h) { G.grid[c.i] = c.v; G.notes[c.i] = c.n; }
  sel = h[0].i; closeHint(); SFX.erase(); render(); saveGame();
}
function redo() {
  if (!G || G.done || !G.redo.length) return;
  const h = G.redo.pop();
  G.hist.push(h.map(c => ({ i: c.i, v: G.grid[c.i], n: G.notes[c.i] })));
  for (const c of h) { G.grid[c.i] = c.v; G.notes[c.i] = c.n; }
  sel = h[0].i; SFX.tap(); render(); saveGame();
}
const AUTO_COST = 500;
// hints: 3 free per day across all modes, then HINT_COST points each (the "wrong numbers" check is free)
const HINT_FREE = 3, HINT_COST = 500;
const hintLeft = () => { const h = DB.hd; return h && h.d === today() ? Math.max(0, HINT_FREE - h.n) : HINT_FREE; };
function autoNotes() {
  if (!G || G.done || paused) return;
  const g = G.grid.map((v, i) => (v === G.sol[i] ? v : 0));
  const cand = E.candidates(g), cells = [];
  for (let i = 0; i < 81; i++) if (!G.grid[i] && G.notes[i] !== cand[i]) cells.push(i);
  if (!cells.length) { toast(esc(t('auto.none')), 'msg'); return; }
  if (DB.autoLeft <= 0) {
    if (DB.pts < AUTO_COST) { toast(esc(t('auto.nopts', { n: fmtN(AUTO_COST) })), 'msg'); return; }
    if (!confirm(t('auto.buy', { n: fmtN(AUTO_COST), p: fmtN(DB.pts) }))) return;
    DB.pts -= AUTO_COST; DB.autoLeft++;
  }
  DB.autoLeft--; persist();
  pushHist(cells);
  for (const i of cells) G.notes[i] = cand[i];
  SFX.hint(); render(); saveGame();
  toast(esc(t('auto.done')), 'msg');
}
function checkUnits(i) {
  const done = [];
  for (const u of E.CELL_UNITS[i]) if (E.UNITS[u].every(k => G.grid[k] === G.sol[k])) done.push(u);
  if (!done.length) return;
  SFX.unit();
  const seen = new Set();
  done.forEach(u => E.UNITS[u].forEach(k => {
    if (seen.has(k)) return; seen.add(k);
    const dist = Math.abs(E.ROW[k] - E.ROW[i]) + Math.abs(E.COL[k] - E.COL[i]);
    const el = cellEls[k]; el.style.setProperty('--wd', (dist * .045) + 's');
    el.classList.remove('wave'); void el.offsetWidth; el.classList.add('wave');
    setTimeout(() => el.classList.remove('wave'), 1200);
  }));
}
function moveSel(dr, dc) {
  if (sel < 0) { sel = 40; render(); return; }
  const r = (E.ROW[sel] + dr + 9) % 9, c = (E.COL[sel] + dc + 9) % 9;
  sel = r * 9 + c; render();
}
function padPress(d) {
  if (!G || G.done || paused) return;
  const k = $(`#pad .key[data-d="${d}"]`); k.classList.add('press'); setTimeout(() => k.classList.remove('press'), 110);
  if (sel >= 0 && !G.puz[sel]) { setValue(sel, d); return; }
  sel = -1; lockD = lockD === d ? 0 : d; SFX.tap(); render();
}
function cellTap(i) {
  if (!G || G.done || paused) return;
  if (lockD) {
    if (G.puz[i] || (G.grid[i] && G.grid[i] !== lockD && !memo)) { lockD = G.grid[i]; SFX.tap(); render(); return; }
    setValue(i, lockD);
  }
}

/* ---- flick input ---- */
const FL = $('#flick'); let fl = null;
const FPOS = { 1: [-1, -1], 2: [0, -1], 3: [1, -1], 4: [-1, 0], 5: [0, 0], 6: [1, 0], 7: [-1, 1], 8: [0, 1], 9: [1, 1] };
function showFlick() {
  if (!fl || fl.shown) return;
  const rect = cellEls[fl.i].getBoundingClientRect();
  let cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  cx = Math.max(92, Math.min(innerWidth - 92, cx)); cy = Math.max(92, Math.min(innerHeight - 92, cy));
  const cnt = new Array(10).fill(0); for (const v of G.grid) if (v) cnt[v]++;
  FL.innerHTML = Object.entries(FPOS).map(([d, [x, y]]) => `<i data-d="${d}" class="${cnt[d] >= 9 && !memo ? 'dis' : ''}" style="left:${90 + x * 58}px;top:${90 + y * 58}px">${d}</i>`).join('');
  FL.style.left = cx + 'px'; FL.style.top = cy + 'px';
  FL.classList.toggle('memo', memo); FL.classList.add('on'); fl.shown = true; vib(6);
}
function hideFlick() { FL.classList.remove('on'); if (fl) clearTimeout(fl.timer); fl = null; }
function flickDir(dx, dy, long) {
  if (Math.hypot(dx, dy) < 16) return long ? 5 : 0;
  const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return { 0: 6, 1: 9, 2: 8, 3: 7, 4: 4, '-4': 4, '-1': 3, '-2': 2, '-3': 1 }[a];
}
function boardDown(e) {
  if (!G || G.done || paused) return;
  const c = e.target.closest('.cell'); if (!c) return;
  e.preventDefault();
  const i = +c.dataset.i;
  closeHint();
  if (!lockD) { sel = i; render(); SFX.tap(); }
  const canFlick = DB.set.flick && !lockD && !G.puz[i];
  fl = { i, x: e.clientX, y: e.clientY, shown: false, long: false, d: 0, can: canFlick, id: e.pointerId };
  try { $('#board').setPointerCapture(e.pointerId); } catch (_) {}
  if (canFlick) fl.timer = setTimeout(() => { if (fl && !fl.shown) { fl.long = true; showFlick(); highlightFlick(5); } }, 330);
}
function highlightFlick(d) { if (!fl) return; if (fl.d !== d) { fl.d = d; if (d) vib(5); } FL.querySelectorAll('i').forEach(x => x.classList.toggle('on', +x.dataset.d === d)); }
function boardMove(e) {
  if (!fl || e.pointerId !== fl.id) return;
  const dx = e.clientX - fl.x, dy = e.clientY - fl.y;
  if (!fl.shown && fl.can && Math.hypot(dx, dy) > 12) { clearTimeout(fl.timer); showFlick(); }
  if (fl.shown) highlightFlick(flickDir(dx, dy, fl.long));
}
function boardUp(e) {
  if (!fl || e.pointerId !== fl.id) return;
  const f = fl; hideFlick();
  if (f.shown) { if (f.d) setValue(f.i, f.d); return; }
  cellTap(f.i);
}

/* ---- hints ---- */
function unitName(u) {
  const k = E.unitKind ? E.unitKind(u) : (u < 9 ? 'row' : u < 18 ? 'col' : 'box');
  const n = (E.unitIndex ? E.unitIndex(u) : u % 9) + 1;
  return t({ row: 'u.row', col: 'u.col', box: 'u.box', region: 'u.reg', diag: 'u.diag', window: 'u.win' }[k] || 'u.box', { n });
}
function explain(s) {
  const T = s.tech, d = s.digit || (s.place && s.place[1]);
  const ds = (s.digits || []).join(t('sep'));
  switch (T) {
    case 'fullHouse': return t('x.fullHouse', { u: unitName(s.units[0]), d });
    case 'hiddenSingleB': case 'hiddenSingleL': return t('x.hiddenSingle', { u: unitName(s.units[0]), d });
    case 'nakedSingle': return t('x.nakedSingle', { d });
    case 'pointing': return t('x.pointing', { b: unitName(s.units[0]), l: unitName(s.units[1]), d });
    case 'claiming': return t('x.claiming', { l: unitName(s.units[0]), b: unitName(s.units[1]), d });
    case 'nakedPair': case 'nakedTriple': case 'nakedQuad': return t('x.naked', { u: unitName(s.units[0]), n: s.cells.length, ds });
    case 'hiddenPair': case 'hiddenTriple': case 'hiddenQuad': return t('x.hidden', { u: unitName(s.units[0]), n: s.cells.length, ds });
    case 'xWing': case 'swordfish': case 'jellyfish': return t('x.fish', { d, n: s.units.length, lines: s.units.map(unitName).join(t('sep')) });
    case 'xyWing': return t('x.xyWing', { d });
    case 'xyzWing': return t('x.xyzWing', { d });
    case 'coloring': return t('x.coloring', { d });
    case 'cageLast': return t('x.cageLast', { s: G.spec && G.spec.cages && s.cage != null ? G.spec.cages[s.cage][0] : '', d });
    case 'innieOutie': return t('x.innie', { u: (s.units || []).map(unitName).join(t('sep')), s: s.sum ?? '' });
    case 'bounds': return t('x.bounds');
    case 'dots': return t('x.dots');
    case 'arrowSum': return t('x.arrowSum');
    case 'cage': return t('x.cage', { s: G.spec && G.spec.cages && s.cage != null ? G.spec.cages[s.cage][0] : '' });
  }
  return '';
}
function clearHintMarks() { cellEls.forEach(el => el.classList.remove('hz', 'hzc', 'ht')); }
function closeHint() { hintState = null; $('#hintCard').classList.remove('on'); clearHintMarks(); }
function onHint() {
  if (!G || G.done || paused) return;
  if (hintState && hintState.place) return applyHint();
  closeHint();
  const wrong = []; for (let i = 0; i < 81; i++) if (G.grid[i] && !G.puz[i] && G.grid[i] !== G.sol[i]) wrong.push(i);
  if (!wrong.length) {
    const gk = G.grid.join('');
    if (G.hintPaid !== gk) { // re-opening the same hint on an unchanged board is free
      if (hintLeft() <= 0) {
        if (DB.pts < HINT_COST) { toast(esc(t('hint.nopts', { n: fmtN(HINT_COST) })), 'msg'); return; }
        if (!confirm(t('hint.buy', { n: fmtN(HINT_COST), p: fmtN(DB.pts) }))) return;
        DB.pts -= HINT_COST;
      } else {
        const td = today(); DB.hd = DB.hd && DB.hd.d === td ? { d: td, n: DB.hd.n + 1 } : { d: td, n: 1 };
      }
      G.hintPaid = gk; persist();
    }
  }
  G.hints++; SFX.hint();
  let html;
  if (wrong.length) {
    hintState = { wrong };
    wrong.forEach(i => cellEls[i].classList.add('ht'));
    html = `<div class="hh"><b>${esc(t('hint.wrongT'))}</b></div><p>${esc(t('hint.wrong', { n: wrong.length }))}</p><div class="ha"><button class="btn ghost" data-a="close">${esc(t('close'))}</button><button class="btn" data-a="fix">${esc(t('hint.fix'))}</button></div>`;
  } else {
    const h = E.hint(G.grid.slice());
    let i, d, text, tech;
    if (h.step) {
      [i, d] = h.step.place; tech = h.step.tech;
      const pre = h.pre.slice(0, 3).map(s => `<p class="pre"><b>${esc(t('tech.' + s.tech))}</b> — ${esc(explain(s))}</p>`).join('') + (h.pre.length > 3 ? `<p class="pre">${esc(t('hint.more', { n: h.pre.length - 3 }))}</p>` : '');
      text = pre + `<p>${h.pre.length ? esc(t('hint.then')) + ' ' : ''}${esc(explain(h.step))}</p>`;
      (h.step.units || []).forEach(u => E.UNITS[u].forEach(k => cellEls[k].classList.add('hz')));
      if (h.step.cage != null && G.spec && G.spec.cages) G.spec.cages[h.step.cage][1].forEach(k => cellEls[k].classList.add('hz'));
      h.pre.forEach(s => (s.cells || []).forEach(k => cellEls[k].classList.add('hzc')));
      if (h.pre.length) tech = h.pre.reduce((a, s) => ((E.TECH[s.tech] || { level: 0 }).level > (E.TECH[a] || { level: 0 }).level ? s.tech : a), tech);
    } else {
      i = sel >= 0 && !G.grid[sel] ? sel : G.grid.findIndex(v => !v); d = G.sol[i]; tech = null;
      text = `<p>${esc(t('hint.reveal'))}</p>`;
    }
    sel = i; hintState = { place: [i, d] };
    html = `<div class="hh"><b>${esc(t('hint.title'))}</b>${tech ? `<span class="tch">${esc(t('tech.' + tech))}</span>` : ''}</div>${text}<div class="ha"><button class="btn ghost" data-a="close">${esc(t('close'))}</button><button class="btn" data-a="place">${esc(t('hint.place', { d }))}</button></div>`;
    render();
    cellEls[i].classList.add('ht');
  }
  const hc = $('#hintCard'); hc.innerHTML = html;
  const focus = hintState.place ? hintState.place[0] : hintState.wrong[0];
  const lowHalf = E.ROW[focus] >= 4;
  hc.classList.toggle('at-top', lowHalf); hc.classList.toggle('at-bot', !lowHalf); hc.classList.add('on');
  hc.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'close') closeHint(); else if (a === 'place') applyHint();
    else if (a === 'fix') { const w = hintState.wrong; pushHist(w); w.forEach(k => (G.grid[k] = 0)); closeHint(); SFX.erase(); render(); saveGame(); }
  });
  render(); saveGame();
}
function applyHint() {
  if (!hintState || !hintState.place) return;
  const [i, d] = hintState.place; closeHint();
  const m = memo; memo = false; setValue(i, d, true); memo = m; render();
}

/* ---- finish ---- */
function finish() {
  G.done = true; stopTimer(); hideFlick(); closeHint(); sel = -1; lockD = 0; render();
  $('#board').classList.add('done');
  delete DB.saves[G.key];
  const at = Date.now(), hr = new Date().getHours();
  const rec = { t: Math.round(G.time), m: G.mist, h: G.hints, lv: G.lv, at, hr };
  let newBest = false, stars = 0, earned = 0;
  if (G.kind === 'd') {
    rec.late = G.date !== today();
    const day = DB.daily[G.date] = DB.daily[G.date] || {};
    const prevBest = bestTime(G.d);
    if (!day[G.d]) { rec.sc = dailyScore(G.d, rec); earned = rec.sc; day[G.d] = rec; }
    else if (rec.t < day[G.d].t) day[G.d].t = rec.t;
    newBest = prevBest != null && rec.t < prevBest;
  } else {
    stars = 1 + (G.hints === 0 ? 1 : 0) + (G.hints === 0 && G.mist === 0 ? 1 : 0);
    const store = G.kind === 'c' ? DB.col : DB.vcol;
    const k = (G.kind === 'c' ? G.ti : G.si) + '.' + G.pi, prev = store[k];
    const sc = puzzleScore(G.lv, stars, G.kind === 'x' ? 1.2 : 1);
    rec.s = stars; rec.sc = sc;
    if (!prev) { store[k] = rec; earned = sc; if (G.kind === 'c' && themeCleared(G.ti) === 50) setTimeout(() => toast(esc(t('hb.unlock', { t: t('th.' + G.ti) })), 'gold'), 2600); }
    else {
      earned = Math.max(0, sc - (prev.sc || 0)); prev.sc = Math.max(prev.sc || 0, sc);
      prev.s = Math.max(prev.s, stars); if (rec.t < prev.t) { prev.t = rec.t; newBest = true; }
    }
  }
  addScore(earned);
  const fresh = syncAch(true);
  persist(true);
  submitOnline(rec);
  setTimeout(() => { SFX.win(); confetti(); vib([20, 60, 20, 60, 40]); }, 250);
  setTimeout(() => showResult(rec, { newBest, stars, fresh, earned }), 900);
}
function bestTime(d) { let b = null; for (const ds in DB.daily) { const r = DB.daily[ds][d]; if (r && (b == null || r.t < b)) b = r.t; } return b; }
let lastSubmit = null;
async function submitOnline(rec) {
  lastSubmit = null;
  if (!ON || !ON.available || !DB.prof.name) return;
  const me = { n: DB.prof.name, i: Math.max(0, DB.prof.icon) };
  const g = G;
  try {
    const jobs = [ON.putScore('month/' + thisMonth(), Object.assign({ s: monthScore() }, me)), ON.putScore('total', Object.assign({ s: DB.sc.tot }, me))];
    if (g.kind === 'd' && !rec.late) jobs.push(ON.submitDaily(g.date, g.d, Object.assign({}, me, rec)));
    if (g.kind === 'c') jobs.push(ON.putScore('col/' + g.ti, Object.assign({ s: themeScore(g.ti), c: themeCleared(g.ti), st: themeStars(g.ti) }, me)));
    if (g.kind === 'x') jobs.push(ON.putScore('var/' + vset(g.si).type, Object.assign({ s: vsetScore(g.si), c: vsetCleared(g.si), st: vsetStars(g.si) }, me)));
    await Promise.all(jobs);
    if (g.kind === 'd' && !rec.late) { const r = await ON.myDaily(g.date, g.d); lastSubmit = r && r.rank; const el = $('#resRank'); if (el && r) el.innerHTML = t('res.rank', { n: `<b>${fmtN(r.rank)}</b>` }); }
  } catch (e) { if (DEBUG) console.warn(e); }
}
function showResult(rec, o) {
  const kind = G.kind;
  let h = '';
  if (kind === 'd') h += medal(DTIER[G.d], 'rm') + `<h3>${esc(t('res.medal.' + G.d))}</h3><div class="rs">${esc(fmtDate(G.date, { year: 'numeric', month: 'long', day: 'numeric' }))} · ${esc(t('d.' + G.d))}${rec.late ? ' · ' + esc(t('res.late')) : ''}</div>`;
  else h += `<div class="rstars">${[1, 2, 3].map(k => STAR(k <= o.stars)).join('')}</div><h3>${esc(t('res.clear'))}</h3><div class="rs">${esc(kind === 'c' ? t('th.' + G.ti) : t('vt.' + G.spec.type))} #${G.pi + 1} · ${esc(t('lv.' + G.lv))}</div>`;
  h += `<div class="rgrid"><div><small>${esc(t('res.time'))}</small><b>${fmtTime(rec.t)}</b>${o.newBest ? `<span class="best">${esc(t('res.best'))}</span>` : ''}</div><div><small>${esc(t('res.mist'))}</small><b>${rec.m}</b></div><div><small>${esc(t('res.hints'))}</small><b>${rec.h}</b></div></div>`;
  h += `<div class="rscore"><small>${esc(t('res.score'))}</small><span class="sc">+${fmtN(o.earned)}</span><span class="pt">${COIN}+${fmtN(o.earned)}</span></div>`;
  if (!rec.m && !rec.h) h += `<div class="rs" style="color:#e8603c;font-weight:700">✨ ${esc(t('res.perfect'))}</div>`;
  if (kind === 'd' && !rec.late && ON && ON.available && DB.prof.name) h += `<div class="rrank" id="resRank">${lastSubmit ? t('res.rank', { n: `<b>${fmtN(lastSubmit)}</b>` }) : esc(t('res.ranking'))}</div>`;
  if (o.fresh.length) h += `<div class="rnew">${o.fresh.slice(0, 5).map((a, k) => `<div class="na" style="animation-delay:${.3 + k * .12}s">${badge(a.tier, a.icon)}<span><b>${esc(t('res.newach'))} ${esc(a.name)}</b><small>${esc(a.desc)}</small></span></div>`).join('')}</div>`;
  let next = '';
  if (kind === 'd') {
    const nd = DIFFS.find(d => !(DB.daily[G.date] || {})[d]);
    next = nd ? `<button class="btn" data-a="next" data-to="d/${G.date}/${nd}">${esc(t('res.nextd', { d: t('d.' + nd) }))}</button>` : `<button class="btn" data-a="home">${esc(t('res.home'))}</button>`;
  } else if (kind === 'c') {
    const np = nextUncleared(G.ti, G.pi);
    next = np >= 0 ? `<button class="btn" data-a="next" data-to="c/${G.ti + 1}/${np + 1}">${esc(t('res.nextc', { n: np + 1 }))}</button>` : `<button class="btn" data-a="next" data-to="t/${G.ti + 1}/m">${esc(t('res.map'))}</button>`;
  } else {
    const np = nextVar(G.si, G.pi);
    next = np >= 0 ? `<button class="btn" data-a="next" data-to="x/${G.si + 1}/${np + 1}">${esc(t('res.nextc', { n: np + 1 }))}</button>` : `<button class="btn" data-a="next" data-to="v/${G.si + 1}">${esc(t('res.list'))}</button>`;
  }
  const backTo = kind === 'd' ? '' : kind === 'c' ? 't/' + (G.ti + 1) + '/m' : 'v/' + (G.si + 1);
  h += `<div class="ract"><button class="btn ghost" data-a="share"><svg viewBox="0 0 24 24"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/></svg>${esc(t('share'))}</button>${next}</div>`;
  h += `<div class="ract" style="margin-top:12px"><button class="btn ghost sm" data-a="back" data-to="${backTo}">${esc(kind === 'd' ? t('res.cal') : kind === 'c' ? t('res.map') : t('res.list'))}</button>${DB.pts >= GACHA_COST ? `<button class="btn ghost sm" data-a="gacha">${esc(t('ga.btn'))}</button>` : ''}<button class="btn ghost sm" data-a="view">${esc(t('res.view'))}</button></div>`;
  $('#resBody').innerHTML = h;
  $('#resBody').querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'share') share(rec);
    else if (a === 'next' || a === 'back') go(b.dataset.to);
    else if (a === 'home') go('');
    else if (a === 'gacha') { closeModals(); setTimeout(openGacha, 50); }
    else if (a === 'view') closeModals();
  });
  openModal('mRes');
  if (o.fresh.length) { SFX.ach(); $('#btnAch').classList.add('has'); }
}
async function share(rec) {
  let s;
  if (G.kind === 'd') s = `${t('title')} ${fmtDate(G.date, { month: 'numeric', day: 'numeric' })} ${{ e: '🥉', m: '🥈', h: '🥇' }[G.d]}${t('d.' + G.d)} ⏱${fmtTime(rec.t)}${!rec.m && !rec.h ? ' ✨' + t('res.perfect') : ''}${lastSubmit ? ' 🏆#' + lastSubmit : ''}`;
  else s = `${t('title')} ${G.kind === 'c' ? t('th.' + G.ti) : t('vt.' + G.spec.type)} #${G.pi + 1} ${'⭐'.repeat(rec.s || 1)} ⏱${fmtTime(rec.t)}`;
  const text = s + '\n' + URL_SELF;
  try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast(esc(t('copied')), 'msg'); } catch (e) { prompt('', text); }
}

/* ================= achievements ================= */
function dayTier(ds) { const r = DB.daily[ds]; if (!r) return 0; let m = 0; for (const d of DIFFS) if (r[d] && !r[d].late) m = Math.max(m, DTIER[d]); return m; }
function monthBadges(ym) {
  const [y, m] = ym.split('-').map(Number), nd = daysIn(y, m), td = today();
  const tiers = []; for (let d = 1; d <= nd; d++) tiers.push(dayTier(ym + '-' + pad2(d)));
  const longest = k => { let best = 0, run = 0; for (const x of tiers) { run = x >= k ? run + 1 : 0; best = Math.max(best, run); } return best; };
  const out = { 3: 0, 7: 0, all: 0 };
  for (let k = 1; k <= 3; k++) { if (longest(k) >= 3) out[3] = k; if (longest(k) >= 7) out[7] = k; if (tiers.every(x => x >= k) && ym + '-' + pad2(nd) <= td) out.all = k; }
  return out;
}
function streakInfo() {
  const td = today();
  let cur = 0, d = dayTier(td) ? td : addDays(td, -1);
  while (dayTier(d)) { cur++; d = addDays(d, -1); }
  const days = Object.keys(DB.daily).filter(dayTier).sort();
  let best = 0, run = 0, prev = null;
  for (const ds of days) { run = prev && addDays(prev, 1) === ds ? run + 1 : 1; best = Math.max(best, run); prev = ds; }
  return { cur, best: Math.max(best, cur) };
}
function allRecords() {
  const a = [];
  for (const ds in DB.daily) for (const d of DIFFS) { const r = DB.daily[ds][d]; if (r) a.push(Object.assign({ kind: 'd', d, ds, lv: r.lv || DTIER[d] }, r)); }
  for (const k in DB.col) a.push(Object.assign({ kind: 'c', key: k }, DB.col[k]));
  for (const k in DB.vcol) a.push(Object.assign({ kind: 'x', key: k }, DB.vcol[k]));
  return a;
}
const ownedCount = () => Object.keys(DB.icons).filter(id => +id < 500).length;   // gacha characters only (500+ are speed rewards)
function catalog() {
  const recs = allRecords(), dRecs = recs.filter(r => r.kind === 'd');
  const out = [];
  const add = (group, id, ok, tier, icon, name, desc, prog) => out.push({ group, id, got: !!ok, tier, icon, name, desc, prog });
  const dc = dRecs.length, hc = dRecs.filter(r => r.d === 'h').length, sk = streakInfo();
  [[10, 1], [50, 2], [100, 3], [365, 4]].forEach(([n, ti]) => add('daily', 'dc' + n, dc >= n, ti, String(n), t('a.dc', { n }), t('a.dc.d', { n }), [dc, n]));
  [[10, 1], [50, 2], [100, 3]].forEach(([n, ti]) => add('daily', 'hc' + n, hc >= n, ti, 'medals', t('a.hc', { n }), t('a.hc.d', { n }), [hc, n]));
  [[30, 2], [100, 3], [365, 4]].forEach(([n, ti]) => add('daily', 'sk' + n, sk.best >= n, ti, 'flame', t('a.sk', { n }), t('a.sk.d', { n }), [sk.best, n]));
  const triDays = Object.keys(DB.daily).filter(ds => DIFFS.every(d => DB.daily[ds][d])).length;
  [[1, 2], [10, 3]].forEach(([n, ti]) => add('daily', 'tri' + n, triDays >= n, ti, 'cal', t('a.tri', { n }), t('a.tri.d', { n }), [triDays, n]));
  const tot = totalCleared();
  [[50, 1], [100, 2], [250, 3], [500, 3], [1000, 4]].forEach(([n, ti]) => add('col', 'tot' + n, tot >= n, ti, String(n), n === NCOL ? t('a.master') : t('a.tot', { n }), t('a.tot.d', { n }), [tot, n]));
  for (const i of ORDER) {
    const c = themeCleared(i), s = themeStars(i);
    [[10, 1], [25, 2], [50, 3]].forEach(([n, ti]) => add('theme' + i, 'th' + i + '.' + n, c >= n, ti, String(n), t('a.th', { t: t('th.' + i), n }), t('a.th.d', { n }), [c, n]));
    add('theme' + i, 'th' + i + '.p', s >= 150, 4, 'star', t('a.thp', { t: t('th.' + i) }), t('a.thp.d'), [s, 150]);
  }
  if (PV) PV.sets.forEach((st, si) => {
    const c = vsetCleared(si), L = vsetLen(si);
    [[10, 1], [20, 2], [L, 3]].forEach(([n, ti]) => add('var', 'vs' + st.type + '.' + n, c >= n, ti, String(n), t('a.vs', { t: t('vt.' + st.type), n }), t('a.vs.d', { n }), [c, n]));
  });
  if (PV) { const vt = totalVar(), vl = totalVarLen(); add('var', 'vall', vt >= vl, 4, 'puzzle', t('a.vall'), t('a.vall.d'), [vt, vl]); }
  const nohint = recs.filter(r => !r.h).length;
  add('chal', 'first', recs.length >= 1, 1, 'check', t('a.first'), t('a.first.d'));
  add('chal', 'perfect', recs.some(r => !r.h && !r.m), 1, 'heart', t('a.perfect'), t('a.perfect.d'));
  add('chal', 'perfH', recs.some(r => !r.h && !r.m && r.lv >= 3), 3, 'heart', t('a.perfH'), t('a.perfH.d'));
  add('chal', 'master', recs.some(r => r.lv >= 4), 3, 'crown', t('a.lv4'), t('a.lv4.d'));
  add('chal', 'master10', recs.filter(r => r.lv >= 4).length >= 10, 4, 'crown', t('a.lv4x'), t('a.lv4x.d'), [recs.filter(r => r.lv >= 4).length, 10]);
  [[1, 180, 1], [2, 360, 2], [3, 600, 3]].forEach(([lv, sec, ti]) => add('chal', 'spd' + lv, recs.some(r => r.lv === lv && r.t <= sec * 1000), ti, 'clock', t('a.spd', { l: t('lv.' + lv), m: sec / 60 }), t('a.spd.d', { l: t('lv.' + lv), m: sec / 60 })));
  add('chal', 'nohint50', nohint >= 50, 2, 'bulb', t('a.nohint', { n: 50 }), t('a.nohint.d', { n: 50 }), [nohint, 50]);
  add('chal', 'early', recs.some(r => r.hr >= 4 && r.hr < 7), 1, 'sun', t('a.early'), t('a.early.d'));
  add('chal', 'owl', recs.some(r => r.hr >= 0 && r.hr < 4), 1, 'moon', t('a.owl'), t('a.owl.d'));
  add('chal', 'tour', [...Array(NT).keys()].every(i => themeCleared(i) > 0), 2, 'map', t('a.tour'), t('a.tour.d'));
  const own = ownedCount(), hasUR = Object.keys(DB.icons).some(id => iconInfo(+id).rarity === 'UR');
  [[10, 1], [50, 2], [150, 3], [500, 4]].forEach(([n, ti]) => add('chal', 'ic' + n, own >= n, ti, 'face', t('a.ic', { n }), t('a.ic.d', { n }), [own, n]));
  add('chal', 'icUR', hasUR, 4, 'crown', t('a.icUR'), t('a.icUR.d'));
  const months = new Set(Object.keys(DB.daily).map(s => s.slice(0, 7)));
  for (const ym of months) { const mb = monthBadges(ym); for (const k of ['3', '7', 'all']) if (mb[k]) add('month', 'mo' + ym + ':' + k, true, mb[k], k === 'all' ? 'cal' : k, t('a.m' + k, { m: fmtMonth(ym) }), t('a.m' + k + '.d'), null); }
  for (const ym in DB.rk) { const r = DB.rk[ym]; if (!r) continue; const tier = r === 1 ? 4 : r <= 3 ? 3 : r <= 10 ? 2 : r <= 50 ? 1 : 0; if (tier) add('rank', 'rk' + ym, true, tier, 'podium', t('a.rk' + (r === 1 ? 1 : r <= 3 ? 3 : r <= 10 ? 10 : 50), { m: fmtMonth(ym) }), t('a.rk.d', { n: r }), null); }
  return out;
}
function syncAch(report) {
  const fresh = [];
  for (const a of catalog()) {
    if (!a.got) continue;
    const prev = DB.ach[a.id];
    if (!prev || prev < a.tier) { DB.ach[a.id] = a.tier; if (report) fresh.push(a); }
  }
  return fresh;
}
/* final monthly ranking → premium achievements (checked once per finished month) */
async function checkMonthAwards() {
  if (!ON || !ON.available || !DB.prof.name) return;
  const cur = thisMonth();
  let ym = addMonths(cur, -1);
  const jobs = [];
  for (let k = 0; k < 3 && ym >= FIRST_DAY.slice(0, 7); k++, ym = addMonths(ym, -1)) if (!(ym in DB.rk) && DB.sc.m[ym]) jobs.push(ym);
  for (const m of jobs) {
    try {
      const r = await ON.myScore('month/' + m);
      DB.rk[m] = r ? r.rank : 0;
      const fresh = syncAch(true); persist();
      fresh.forEach(a => toast(`${badge(a.tier, a.icon)}<span><b>${esc(t('res.newach'))} ${esc(a.name)}</b><small>${esc(a.desc)}</small></span>`));
      if (fresh.length) { SFX.ach(); $('#btnAch').classList.add('has'); }
    } catch (e) {}
  }
}

let achTab = 'daily';
function openAch() {
  $('#btnAch').classList.remove('has');
  const tabs = [['daily', 'ach.t.daily'], ['col', 'ach.t.col'], ['chal', 'ach.t.chal'], ['stats', 'ach.t.stats']];
  $('#achTabs').innerHTML = tabs.map(([k, l]) => `<button class="tab ${k === achTab ? 'on' : ''}" data-k="${k}">${esc(t(l))}</button>`).join('');
  $$('#achTabs .tab').forEach(b => b.onclick = () => { achTab = b.dataset.k; openAch(); });
  const C = catalog(), by = g => C.filter(a => a.group === g);
  const cell = a => `<div class="ach ${a.got ? '' : 'lock'}">${badge(a.tier, a.icon)}<b>${esc(a.name)}</b><small>${esc(a.prog && !a.got ? `${Math.min(a.prog[0], a.prog[1])}/${a.prog[1]}` : a.desc)}</small></div>`;
  let h = '';
  if (achTab === 'daily') {
    const sk = streakInfo();
    h += `<div class="big">${badge(sk.cur >= 7 ? 3 : sk.cur >= 3 ? 2 : 1, 'flame', sk.cur ? '' : 'lock')}<div><b>${esc(t('streak', { n: sk.cur }))}</b><small>${esc(t('ach.streak.best', { n: sk.best }))}<br>${esc(t('ach.month.note'))}</small></div></div>`;
    const rk = by('rank');
    h += `<div class="agrp"><h4>${esc(t('ach.rank'))}</h4>${rk.length ? `<div class="agrid">${rk.map(cell).join('')}</div>` : `<p class="note" style="margin:0">${esc(t('ach.rank.none'))}</p>`}</div>`;
    h += `<div class="agrp"><h4>${esc(t('ach.monthly'))}</h4>`;
    let ym = thisMonth();
    const months = []; while (ym >= FIRST_DAY.slice(0, 7)) { months.push(ym); ym = addMonths(ym, -1); }
    for (const m of months) {
      const mb = monthBadges(m), [y, mo] = m.split('-').map(Number), nd = daysIn(y, mo);
      const cleared = [...Array(nd).keys()].filter(d => dayTier(m + '-' + pad2(d + 1))).length;
      h += `<div class="mrow"><div class="mn">${esc(fmtMonth(m))}<small>${esc(t('ach.month.days', { n: cleared, m: nd }))} · ${esc(t('ach.month.score', { n: fmtN(monthScore(m)) }))}</small></div><div class="mb">${[['3', 'm.3'], ['7', 'm.7'], ['all', 'm.all']].map(([k, l]) => `<span class="mbadge ${mb[k] ? '' : 'lock'}" title="${esc(t('a.m' + k + '.d'))}">${badge(mb[k] || 1, k === 'all' ? nd : k)}<span>${esc(t(l))}</span></span>`).join('')}</div></div>`;
    }
    h += `<p class="note">${esc(t('ach.month.tier'))}</p></div>`;
    h += `<div class="agrp"><h4>${esc(t('ach.lifetime'))}</h4><div class="agrid">${by('daily').map(cell).join('')}</div></div>`;
  } else if (achTab === 'col') {
    const tot = totalCleared(), m = C.find(a => a.id === 'tot' + NCOL);
    h += `<div class="big ${m.got ? '' : 'lock'}">${badge(4, 'crown')}<div><b>${esc(t('a.master'))}</b><small>${esc(t('a.master.d'))}</small><div class="col-total" style="margin:8px 0 0"><div class="bar"><i style="width:${tot / NCOL * 100}%"></i></div><b class="num">${tot}/${NCOL}</b></div></div></div>`;
    h += `<div class="agrp"><h4>${esc(t('ach.total'))}</h4><div class="agrid">${by('col').map(cell).join('')}</div></div>`;
    h += `<div class="agrp"><h4>${esc(t('ach.themes'))}</h4>`;
    for (const i of ORDER) {
      const a = by('theme' + i);
      h += `<div class="trow"><div class="tp">${BG.svg(THEMES[i], 160, 100)}</div><div class="tn"><b>${esc(t('th.' + i))}</b><small>${themeCleared(i)}/50 · ★${themeStars(i)}/150</small></div><div class="mb">${a.map(x => `<span title="${esc(x.name + ' — ' + x.desc)}" class="${x.got ? '' : 'lock'}">${badge(x.tier, x.icon)}</span>`).join('')}</div></div>`;
    }
    h += '</div>';
    if (PV) h += `<div class="agrp"><h4>${esc(t('var.title'))}</h4><div class="agrid">${by('var').map(cell).join('')}</div></div>`;
  } else if (achTab === 'chal') {
    h += `<div class="agrp"><div class="agrid">${by('chal').map(cell).join('')}</div></div>`;
  } else {
    const recs = allRecords(), sk = streakInfo();
    h += `<div class="stats">
      <div class="stat"><small>${esc(t('st.solved'))}</small><b>${recs.length}</b></div>
      <div class="stat"><small>${esc(t('st.daily'))}</small><b>${recs.filter(r => r.kind === 'd').length}</b></div>
      <div class="stat"><small>${esc(t('st.col'))}</small><b>${totalCleared()}</b><em>/${NCOL}</em></div>
      <div class="stat"><small>${esc(t('var.title'))}</small><b>${totalVar()}</b><em>/${totalVarLen()}</em></div>
      <div class="stat"><small>${esc(t('st.streak'))}</small><b>${sk.cur}</b><em>${esc(t('st.best', { n: sk.best }))}</em></div>
      <div class="stat"><small>${esc(t('st.perfect'))}</small><b>${recs.filter(r => !r.m && !r.h).length}</b></div>
      <div class="stat"><small>${esc(t('prof.total'))}</small><b>${fmtN(DB.sc.tot)}</b></div>
      <div class="stat"><small>${esc(t('st.icons'))}</small><b>${ownedCount()}</b><em>/500</em></div>
      <div class="stat"><small>${esc(t('st.time'))}</small><b>${fmtTime(DB.play)}</b></div>
    </div>`;
    h += `<table class="tbl"><tr><th></th><th>${esc(t('st.cnt'))}</th><th>${esc(t('st.bestT'))}</th><th>${esc(t('st.avgT'))}</th><th>${esc(t('st.perfect'))}</th></tr>`;
    const row = (label, rs) => { const n = rs.length; const b = n ? Math.min(...rs.map(r => r.t)) : 0; const av = n ? rs.reduce((a, r) => a + r.t, 0) / n : 0; return `<tr><td>${label}</td><td>${n}</td><td>${n ? fmtTime(b) : '—'}</td><td>${n ? fmtTime(av) : '—'}</td><td>${rs.filter(r => !r.m && !r.h).length}</td></tr>`; };
    for (const d of DIFFS) h += row(miniMedal(DTIER[d]).replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-3px;margin-inline-end:4px"') + esc(t('d.' + d)), recs.filter(r => r.kind === 'd' && r.d === d));
    for (let lv = 1; lv <= 4; lv++) h += row(lvChip(lv), recs.filter(r => r.kind !== 'd' && r.lv === lv));
    h += '</table>';
  }
  $('#achBody').innerHTML = h;
  openModal('mAch');
}

/* ================= name / profile ================= */
function starterIcons() {
  if (!IC) return [];
  const n = IC.byRarity('N'), seen = new Set(), out = [];
  for (const id of n) { const sp = IC.info(id).species; if (!seen.has(sp)) { seen.add(sp); out.push(id); } if (out.length >= 6) break; }
  return out;
}
function openName(first) {
  const picks = first ? starterIcons() : [];
  let pick = DB.prof.icon >= 0 ? DB.prof.icon : (picks[0] ?? -1);
  $('#nameTitle').textContent = first ? t('nm.welcome') : t('prof.edit');
  $('#nameX').hidden = first;
  $('#mName').dataset.lock = first ? '1' : '';
  $('#nameBody').innerHTML = `<div class="hero" id="nmHero">${iconSvg(pick)}</div>
    <p class="nmdesc">${esc(first ? t('nm.desc') : t('nm.desc2'))}</p>
    ${picks.length ? `<div class="picks">${picks.map(id => `<button data-id="${id}" class="${id === pick ? 'on' : ''}" title="${esc(iconName(id))}">${iconSvg(id, { still: true })}</button>`).join('')}</div><p class="note" style="margin:0">${esc(t('nm.pick'))}</p>` : ''}
    <input id="nmIn" maxlength="12" autocomplete="nickname" placeholder="${esc(t('nm.ph'))}" value="${esc(DB.prof.name)}">
    <div class="cnt"><span id="nmCnt">0</span>/12</div>
    <p class="note">${esc(t('nm.note'))}</p>
    <button class="btn" id="nmOk" style="width:100%;margin-top:8px">${esc(first ? t('nm.start') : t('nm.save'))}</button>
    ${first && ON && ON.available && !ON.mock ? `<div class="syncbox" style="text-align:start;margin-top:16px"><b>${esc(t('nm.g.title'))}</b><p>${esc(t('nm.g.desc'))}</p><button class="btn gbtn" id="nmG">${GLOGO}${esc(t('sync.google'))}</button></div>` : ''}`;
  const inp = $('#nmIn'), ok = $('#nmOk');
  const g = $('#nmG'); if (g) g.onclick = async () => {
    try {
      await ON.google(myRankPaths()); await syncNow(true);
      if (DB.prof.name) { $('#mName').dataset.lock = ''; closeModals(); toast(esc(t('nm.g.welcome', { n: DB.prof.name })), 'msg'); if (screen === 'home') renderHome(); }
      else { toast(esc(t('nm.g.linked')), 'msg'); g.closest('.syncbox').hidden = true; }
    } catch (e) { if (!(e && /popup-closed|cancelled-popup/.test(e.code || ''))) toast(esc(t('sync.err')), 'msg'); }
  };
  const upd = () => { const v = inp.value.trim(); $('#nmCnt').textContent = [...v].length; ok.disabled = !v || [...v].length > 12; };
  inp.oninput = upd; upd();
  $$('#nameBody .picks button').forEach(b => b.onclick = () => { pick = +b.dataset.id; $$('#nameBody .picks button').forEach(x => x.classList.toggle('on', x === b)); $('#nmHero').innerHTML = iconSvg(pick); SFX.tap(); });
  inp.onkeydown = e => { if (e.key === 'Enter' && !ok.disabled) ok.click(); };
  ok.onclick = () => {
    const v = [...inp.value.trim().replace(/[\u0000-\u001f<>]/g, '')].slice(0, 12).join('');
    if (!v) return;
    DB.prof.name = v;
    if (first) {
      if (pick >= 0) { DB.prof.icon = pick; DB.icons[pick] = (DB.icons[pick] || 0) + 1; }
      DB.pts += STARTER_PTS;
    }
    persist(true);
    $('#mName').dataset.lock = '';
    closeModals();
    if (ON && ON.available) ON.profile({ n: v, i: Math.max(0, DB.prof.icon) }).catch(() => {});
    if (first) { toast(`${COIN}<span><b>${esc(t('nm.gift'))}</b><small>${esc(t('nm.gift.d', { n: fmtN(STARTER_PTS) }))}</small></span>`); SFX.ach(); }
    if (screen === 'home') renderHome();
  };
  openModal('mName');
  if (!first) setTimeout(() => inp.focus(), 100);
}

/* ================= ranking ================= */
let rkTab = 'daily', rkDate = null, rkDiff = 'e', rkMonth = null, rkSet = 'c0';
function openRank() {
  if (!DB.prof.name) { openName(true); return; }
  rkDate = rkDate || today(); rkMonth = rkMonth || thisMonth();
  const tabs = [['daily', 'rk.daily'], ['month', 'rk.month'], ['total', 'rk.total'], ['col', 'rk.col']];
  $('#rkTabs').innerHTML = tabs.map(([k, l]) => `<button class="tab ${k === rkTab ? 'on' : ''}" data-k="${k}">${esc(t(l))}</button>`).join('');
  $$('#rkTabs .tab').forEach(b => b.onclick = () => { rkTab = b.dataset.k; SFX.tap(); openRank(); });
  openModal('mRank');
  renderRank();
}
async function renderRank() {
  const body = $('#rkBody');
  let ctl = '';
  if (rkTab === 'daily') ctl = `<div class="rkctl"><button class="ib flip" data-nav="-1"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><b>${esc(fmtDate(rkDate, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' }))}</b><button class="ib flip" data-nav="1" ${rkDate >= today() ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div><div class="chips">${DIFFS.map(d => `<button data-d="${d}" class="${d === rkDiff ? 'on' : ''}">${esc(t('d.' + d))}</button>`).join('')}</div>`;
  if (rkTab === 'month') ctl = `<div class="rkctl"><button class="ib flip" data-nav="-1" ${rkMonth <= FIRST_DAY.slice(0, 7) ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><b>${esc(fmtMonth(rkMonth))}</b><button class="ib flip" data-nav="1" ${rkMonth >= thisMonth() ? 'disabled' : ''}><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div><p class="note" style="margin:-4px 0 10px;text-align:center">${esc(t('rk.month.note'))}</p>`;
  if (rkTab === 'col') ctl = `<div class="rkctl"><select id="rkSel" class="rksel"><optgroup label="${esc(t('ht.col'))}">${ORDER.map(i => `<option value="c${i}" ${rkSet === 'c' + i ? 'selected' : ''}>${TNO(i)}. ${esc(t('th.' + i))}</option>`).join('')}</optgroup>${PV ? `<optgroup label="${esc(t('ht.var'))}">${PV.sets.map(s => `<option value="v${s.type}" ${rkSet === 'v' + s.type ? 'selected' : ''}>${esc(t('vt.' + s.type))}</option>`).join('')}</optgroup>` : ''}</select></div>`;
  body.innerHTML = ctl + `<div id="rkList"><div class="rkmsg">${esc(t('rk.loading'))}</div></div>`;
  body.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
    const n = +b.dataset.nav;
    if (rkTab === 'daily') { const nd = addDays(rkDate, n); if (nd <= today() && nd >= FIRST_DAY) rkDate = nd; }
    else { const nm = addMonths(rkMonth, n); if (nm <= thisMonth() && nm >= FIRST_DAY.slice(0, 7)) rkMonth = nm; }
    SFX.tap(); renderRank();
  });
  body.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { rkDiff = b.dataset.d; SFX.tap(); renderRank(); });
  body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { rkSet = b.dataset.s; SFX.tap(); renderRank(); });
  const rs = $('#rkSel'); if (rs) rs.onchange = () => { rkSet = rs.value; SFX.tap(); renderRank(); };
  const list = $('#rkList');
  if (!ON || !ON.available) { list.innerHTML = `<div class="rkmsg">${badge(1, 'podium')}${esc(t('rk.prep'))}</div>`; return; }
  const key = rkTab + rkDate + rkDiff + rkMonth + rkSet;
  try {
    let rows, mine, fmt;
    if (rkTab === 'daily') {
      [rows, mine] = await Promise.all([ON.topDaily(rkDate, rkDiff, 50), ON.myDaily(rkDate, rkDiff)]);
      rows.sort((a, b) => a.t - b.t); fmt = r => fmtTime(r.t);
    } else {
      const path = rkTab === 'month' ? 'month/' + rkMonth : rkTab === 'total' ? 'total' : rkSet[0] === 'c' ? 'col/' + rkSet.slice(1) : 'var/' + rkSet.slice(1);
      [rows, mine] = await Promise.all([ON.topScore(path, 50), ON.myScore(path)]);
      rows.sort((a, b) => b.s - a.s); fmt = r => fmtN(r.s);
    }
    if (key !== rkTab + rkDate + rkDiff + rkMonth + rkSet || !$('#mRank').classList.contains('on')) return;
    if (!rows.length) { list.innerHTML = `<div class="rkmsg">${badge(1, 'podium')}${esc(t('rk.empty'))}</div>`; return; }
    const sub = r => rkTab === 'daily' ? `${esc(t('res.mist'))} ${r.m} · ${esc(t('res.hints'))} ${r.h}` : rkTab === 'col' && r.c != null ? `${r.c} · ★${r.st || 0}` : '';
    const medalNo = k => (k < 3 ? miniMedal(3 - k) : k + 1);
    let h = '<ol class="rk">' + rows.map((r, k) => `<li class="${r.uid === ON.uid ? 'me' : ''}"><span class="no">${medalNo(k)}</span>${avatar(r.i, 36)}<span class="nm">${esc(r.n)}<small>${sub(r)}</small></span><span class="vl">${fmt(r)}</span></li>`).join('');
    if (mine && !rows.some(r => r.uid === ON.uid)) h += `<li class="gap">⋮</li><li class="me"><span class="no">${fmtN(mine.rank)}</span>${avatar(mine.me.i, 36)}<span class="nm">${esc(mine.me.n)}<small>${sub(mine.me)}</small></span><span class="vl">${fmt(mine.me)}</span></li>`;
    h += '</ol>';
    if (!mine) h += `<p class="note" style="text-align:center">${esc(t('rk.notyet'))}</p>`;
    list.innerHTML = h;
  } catch (e) {
    list.innerHTML = `<div class="rkmsg">${esc(t('rk.err'))}</div>`;
    if (DEBUG) console.warn(e);
  }
}

/* ================= gacha ================= */
function rollRarity(minSR) {
  let x = Math.random();
  const rates = minSR ? RATES.filter(([r]) => ['UR', 'SSR', 'SR'].includes(r)) : RATES;
  const tot = rates.reduce((a, [, p]) => a + p, 0); x *= tot;
  for (const [r, p] of rates) { if (x < p) return r; x -= p; }
  return rates[rates.length - 1][0];
}
function rollIcon(minSR) { const r = rollRarity(minSR), ids = IC.byRarity(r); return ids[(Math.random() * ids.length) | 0]; }
const CAPC = { N: ['#d9d3e6', '#a7a1b8'], R: ['#bfe3ff', '#5fb0e8'], SR: ['#e8edf5', '#9aa6b8'], SSR: ['#ffe9a8', '#e09b12'], UR: ['#ffd1f0', '#b07ad6'] };
function machineSvg() {
  return `<svg class="machine" id="mach" viewBox="0 0 190 220"><defs><radialGradient id="gglass" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#e9f2ff" stop-opacity=".55"/></radialGradient></defs>
    <rect x="35" y="118" width="120" height="86" rx="18" fill="#ff8fb6"/><rect x="35" y="118" width="120" height="20" rx="10" fill="#fff" opacity=".25"/>
    <circle cx="95" cy="80" r="66" fill="url(#gglass)" stroke="#ffb3cf" stroke-width="5"/>
    ${[[70, 92, '#ffd36b'], [104, 104, '#8fc4ff'], [122, 76, '#ff9fb8'], [82, 60, '#9fe0b4'], [112, 48, '#c7a8ff'], [60, 120 - 0, '#ffb36b'], [132, 108, '#ffd36b'], [95, 124, '#c7a8ff']].map(([x, y, c]) => `<g><circle cx="${x}" cy="${y}" r="13" fill="${c}"/><path d="M${x - 13} ${y}a13 13 0 0 0 26 0z" fill="#fff" opacity=".7"/></g>`).join('')}
    <ellipse cx="72" cy="48" rx="16" ry="8" fill="#fff" opacity=".6" transform="rotate(-30 72 48)"/>
    <circle cx="95" cy="160" r="17" fill="#fff"/><rect x="88" y="146" width="14" height="28" rx="7" fill="#ffcd4d"/>
    <rect x="70" y="186" width="50" height="14" rx="7" fill="#43385a" opacity=".35"/>
    <circle cx="67" cy="152" r="4" fill="#fff" opacity=".6"/><circle cx="123" cy="152" r="4" fill="#fff" opacity=".6"/></svg>`;
}
function openGacha() {
  if (!IC) { toast(esc(t('rk.err')), 'msg'); return; }
  const r = RATES.slice().reverse();
  $('#gaBody').innerHTML = `${machineSvg()}<div class="gbal">${COIN}<span id="gaPts">${fmtN(DB.pts)}</span></div>
    <div class="gbtns"><button class="btn" id="ga1">${esc(t('ga.one'))}<small>${COIN}${fmtN(GACHA_COST)}</small></button><button class="btn" id="ga10" style="background:linear-gradient(135deg,#ff8fb6,#c38fff)">${esc(t('ga.ten'))}<small>${COIN}${fmtN(GACHA10_COST)}</small></button></div>
    <p class="note" style="text-align:center">${esc(t('ga.ten.note'))}</p>
    <div class="rates">${r.map(([k, p]) => `<span>${rarChip(k)} ${(p * 100).toFixed(1)}%</span>`).join('')}</div>
    <p class="note" style="text-align:center">${esc(t('ga.note'))}</p>
    <div style="display:flex;justify-content:center;margin-top:10px"><button class="btn ghost sm" id="gaZk">${esc(t('zk.title'))} (${ownedCount()}/500)</button></div>`;
  $('#ga1').disabled = DB.pts < GACHA_COST; $('#ga10').disabled = DB.pts < GACHA10_COST;
  $('#ga1').onclick = () => pull(1); $('#ga10').onclick = () => pull(10);
  $('#gaZk').onclick = () => { closeModals(); setTimeout(openZukan, 60); };
  openModal('mGacha');
}
function pull(n) {
  const cost = n === 10 ? GACHA10_COST : GACHA_COST;
  if (DB.pts < cost) return;
  DB.pts -= cost;
  const res = [];
  for (let k = 0; k < n; k++) res.push(rollIcon(false));
  if (n === 10 && !res.some(id => ['SR', 'SSR', 'UR'].includes(iconInfo(id).rarity))) res[9] = rollIcon(true);
  const out = res.map(id => {
    const was = DB.icons[id] || 0; DB.icons[id] = was + 1;
    const r = iconInfo(id).rarity; let refund = 0;
    if (was) { refund = DUP_REFUND[r]; DB.pts += refund; }
    return { id, r, isNew: !was, refund };
  });
  if (DB.prof.icon < 0) DB.prof.icon = out[0].id;
  const fresh = syncAch(true);
  persist(true);
  const order = ['N', 'R', 'SR', 'SSR', 'UR'];
  const top = out.reduce((a, o) => (order.indexOf(o.r) > order.indexOf(a) ? o.r : a), 'N');
  const mach = $('#mach'); if (mach) { mach.classList.remove('shake'); void mach.offsetWidth; mach.classList.add('shake'); }
  SFX.rumble(); vib([20, 40, 20]);
  setTimeout(() => reveal(out, top, fresh), 650);
}
function reveal(out, top, fresh) {
  const ov = $('#greveal'); const [c1, c2] = CAPC[top];
  ov.className = 'greveal on r-' + top;
  const rays = ['SSR', 'UR'].includes(top) ? `<svg class="rays" viewBox="-100 -100 200 200">${Array.from({ length: 16 }, (_, k) => `<path d="M0 0L${(Math.cos(k * Math.PI / 8 - .08) * 100).toFixed(1)} ${(Math.sin(k * Math.PI / 8 - .08) * 100).toFixed(1)}L${(Math.cos(k * Math.PI / 8 + .08) * 100).toFixed(1)} ${(Math.sin(k * Math.PI / 8 + .08) * 100).toFixed(1)}Z" fill="${top === 'UR' ? ['#ff9fd0', '#ffe27a', '#9fe6c4', '#9fcfff'][k % 4] : '#ffe27a'}" opacity=".45"/>`).join('')}</svg>` : '';
  ov.innerHTML = `${rays}<svg class="cap" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="${c2}"/><path d="M6 50a44 44 0 0 0 88 0z" fill="${c1}"/><rect x="6" y="46" width="88" height="8" fill="#fff" opacity=".7"/><ellipse cx="34" cy="30" rx="12" ry="6" fill="#fff" opacity=".55" transform="rotate(-30 34 30)"/>${top === 'UR' ? '<circle cx="50" cy="50" r="44" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="4 6"><animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="3s" repeatCount="indefinite"/></circle>' : ''}</svg><div class="tap">${esc(t('ga.tap'))}</div>`;
  let opened = false;
  const open = () => {
    if (opened) return; opened = true;
    const cap = ov.querySelector('.cap'); cap.classList.add('open');
    if (top === 'UR') { SFX.rare(); confetti(220, true); vib([40, 60, 40, 60, 80]); }
    else if (top === 'SSR') { SFX.rare(); confetti(120, true); } else SFX.pop();
    setTimeout(() => {
      ov.innerHTML = `${rays}<div class="gcards ${out.length > 1 ? 'ten' : ''}">${out.map((o, k) => `<div class="gcard r-${o.r}" style="animation-delay:${k * .09}s"><div class="ic">${iconSvg(o.id, { still: out.length > 1 && o.r !== 'UR' })}</div>${rarChip(o.r)}<b>${esc(iconName(o.id))}</b>${o.isNew ? '<span class="new">NEW</span>' : `<span class="dup">${esc(t('ga.dup', { n: fmtN(o.refund) }))}</span>`}</div>`).join('')}</div><div class="gbtns" style="position:relative"><button class="btn ghost" id="grSet">${esc(t('ga.seticon'))}</button><button class="btn" id="grOk">OK</button></div>`;
      $('#grOk').onclick = closeReveal;
      $('#grSet').onclick = () => { const best = out.reduce((a, o) => (['N', 'R', 'SR', 'SSR', 'UR'].indexOf(o.r) > ['N', 'R', 'SR', 'SSR', 'UR'].indexOf(a.r) ? o : a), out[0]); DB.prof.icon = best.id; persist(); if (ON && ON.available && DB.prof.name) ON.profile({ n: DB.prof.name, i: best.id }).catch(() => {}); toast(esc(t('zk.set.done')), 'msg'); closeReveal(); };
      fresh.forEach(a => toast(`${badge(a.tier, a.icon)}<span><b>${esc(t('res.newach'))} ${esc(a.name)}</b><small>${esc(a.desc)}</small></span>`));
    }, 420);
  };
  ov.onclick = e => { if (!opened) open(); };
  setTimeout(open, top === 'UR' || top === 'SSR' ? 1600 : 1000);
}
function closeReveal() {
  $('#greveal').className = 'greveal';
  $('#greveal').innerHTML = '';
  if ($('#mGacha').classList.contains('on')) { $('#gaPts').textContent = fmtN(DB.pts); $('#ga1').disabled = DB.pts < GACHA_COST; $('#ga10').disabled = DB.pts < GACHA10_COST; const z = $('#gaZk'); if (z) z.textContent = `${t('zk.title')} (${ownedCount()}/500)`; }
  if (screen === 'home') renderProfile();
}

/* ================= zukan (icon collection) ================= */
let zkMode = 'mine', zkRar = 'all', zkSel = -1;
const RORD = ['SP', 'UR', 'SSR', 'SR', 'R', 'N'];
function openZukan() {
  if (!IC) return;
  $('#zkTabs').innerHTML = [['mine', 'zk.mine'], ['book', 'zk.book']].map(([k, l]) => `<button class="tab ${k === zkMode ? 'on' : ''}" data-k="${k}">${esc(t(l))}</button>`).join('');
  $$('#zkTabs .tab').forEach(b => b.onclick = () => { zkMode = b.dataset.k; SFX.tap(); openZukan(); });
  let ids = zkRar === 'all' ? [...Array(IC.COUNT_ALL || IC.COUNT).keys()] : IC.byRarity(zkRar);
  const total = ids.length, own = ids.filter(id => DB.icons[id]).length;
  if (zkMode === 'mine') ids = ids.filter(id => DB.icons[id]).sort((x, y) => RORD.indexOf(iconInfo(x).rarity) - RORD.indexOf(iconInfo(y).rarity) || x - y);
  if (zkSel < 0 || !DB.icons[zkSel]) zkSel = DB.prof.icon;
  const det = zkSel >= 0 && DB.icons[zkSel] ? `<div class="zdet"><div class="ic">${iconSvg(zkSel)}</div><div style="min-width:0">${rarChip(iconInfo(zkSel).rarity)} <small>No.${String(zkSel + 1).padStart(3, '0')} · ×${DB.icons[zkSel]}</small><b>${esc(iconName(zkSel))}</b>${zkSel === DB.prof.icon ? `<span class="note">${esc(t('zk.current'))}</span>` : `<button class="btn sm" id="zkSet">${esc(t('zk.set'))}</button>`}</div></div>` : '';
  const chips = `<div class="chips">${['all', ...RORD.filter(r => r !== 'SP' || IC.byRarity('SP').length)].map(r => `<button data-r="${r}" class="${r === zkRar ? 'on' : ''}">${r === 'all' ? esc(t('zk.all')) : r}</button>`).join('')}</div>`;
  const top = `<div class="zk-top"><div class="bar"><i style="width:${own / total * 100}%"></i></div><b>${zkMode === 'mine' ? esc(t('zk.owned', { n: own, m: total })) : own + '/' + total}</b></div>`;
  const grid = ids.length ? `<div class="zk">${ids.map(id => DB.icons[id] ? `<button data-id="${id}" class="${id === DB.prof.icon ? 'eq' : ''}" title="${esc(iconName(id))}">${iconSvg(id, { still: true })}${DB.icons[id] > 1 ? `<span class="cnt">×${DB.icons[id]}</span>` : ''}</button>` : `<button disabled title="No.${id + 1}">${IC.silhouette(id)}</button>`).join('')}</div>`
    : `<div class="rkmsg">${esc(t('zk.none'))}<br><button class="btn sm" id="zkGa" style="margin-top:10px">${esc(t('ga.btn'))}</button></div>`;
  $('#zkBody').innerHTML = det + (zkMode === 'book' ? `<p class="note" style="margin:0 0 8px">${esc(t('zk.booknote'))}${IC.byRarity('SP').length ? ' ' + esc(t('zk.spnote')) : ''}</p>` : '') + chips + top + grid;
  $$('#zkBody .chips [data-r]').forEach(b => b.onclick = () => { zkRar = b.dataset.r; SFX.tap(); openZukan(); });
  $$('#zkBody .zk button[data-id]').forEach(b => b.onclick = () => { zkSel = +b.dataset.id; SFX.tap(); openZukan(); $('#zkBody').scrollTop = 0; });
  const set = $('#zkSet'); if (set) set.onclick = () => { DB.prof.icon = zkSel; persist(); SFX.pop(); if (ON && ON.available && DB.prof.name) ON.profile({ n: DB.prof.name, i: zkSel }).catch(() => {}); toast(esc(t('zk.set.done')), 'msg'); openZukan(); if (screen === 'home') renderProfile(); };
  const ga = $('#zkGa'); if (ga) ga.onclick = () => { closeModals(); setTimeout(openGacha, 60); };
  openModal('mZukan');
}


/* ================= cloud sync (Google sign-in) ================= */
let pushT = 0, syncing = false;
const signedIn = () => !!(ON && ON.available && ON.account && (() => { try { return ON.account(); } catch (e) { return null; } })());
function schedulePush() { if (!signedIn() || syncing) return; clearTimeout(pushT); pushT = setTimeout(pushNow, 4000); }
async function pushNow() { clearTimeout(pushT); if (!signedIn()) return; try { await ON.push(JSON.stringify(DB)); } catch (e) { if (DEBUG) console.warn(e); } }
function mergeDB(L, C) {
  const out = (C.mt || 0) > (L.mt || 0) ? JSON.parse(JSON.stringify(C)) : JSON.parse(JSON.stringify(L));
  const other = out === C ? L : C, o = (C.mt || 0) > (L.mt || 0) ? L : C;
  // records: union with the better result
  out.daily = out.daily || {};
  for (const ds in (o.daily || {})) for (const d in o.daily[ds]) {
    const a = (out.daily[ds] = out.daily[ds] || {})[d], b = o.daily[ds][d];
    if (!a) out.daily[ds][d] = b; else { const first = (b.at || 0) < (a.at || 0) ? b : a; out.daily[ds][d] = Object.assign({}, first, { t: Math.min(a.t, b.t) }); }
  }
  for (const key of ['col', 'vcol']) {
    out[key] = out[key] || {};
    for (const k in (o[key] || {})) { const a = out[key][k], b = o[key][k]; out[key][k] = !a ? b : Object.assign({}, a, { s: Math.max(a.s, b.s), sc: Math.max(a.sc || 0, b.sc || 0), t: Math.min(a.t, b.t) }); }
  }
  out.icons = out.icons || {}; for (const id in (o.icons || {})) out.icons[id] = Math.max(out.icons[id] || 0, o.icons[id]);
  out.ach = out.ach || {}; for (const id in (o.ach || {})) out.ach[id] = Math.max(out.ach[id] || 0, o.ach[id]);
  out.rk = Object.assign({}, o.rk || {}, out.rk || {});
  out.sc = out.sc || { tot: 0, m: {} }; const os = o.sc || { tot: 0, m: {} };
  out.sc.tot = Math.max(out.sc.tot || 0, os.tot || 0); out.sc.m = out.sc.m || {};
  for (const ym in (os.m || {})) out.sc.m[ym] = Math.max(out.sc.m[ym] || 0, os.m[ym]);
  out.saves = Object.assign({}, o.saves || {}, out.saves || {});
  out.play = Math.max(out.play || 0, o.play || 0);
  if (!out.prof || !out.prof.name) out.prof = o.prof;
  out.seenHelp = out.seenHelp || o.seenHelp; out.seenTut = out.seenTut || o.seenTut; out.seenRule = Object.assign({}, o.seenRule || {}, out.seenRule || {});
  if (SPDX) SPDX.merge(out, o);   // すぴーど数独 records
  return out;
}
async function syncNow(quiet) {
  if (!signedIn() || syncing) return;
  syncing = true;
  try {
    const c = await ON.pull();
    if (c && c.d) {
      const cloud = JSON.parse(c.d);
      const merged = mergeDB(DB, cloud);
      DB = Object.assign(load(), merged);
      DB.set = Object.assign({}, DEF_SET, DB.set || {});
      try { localStorage.setItem(STORE, JSON.stringify(DB)); } catch (e) {}
    }
    syncing = false;
    await pushNow();
    if (!quiet) toast(esc(t('sync.done')), 'msg');
    applySettings(); if (screen === 'home') renderHome();
    if (DB.prof.name) ON.profile({ n: DB.prof.name, i: Math.max(0, DB.prof.icon) }).catch(() => {});
  } catch (e) { if (!quiet) toast(esc(t('sync.err')), 'msg'); if (DEBUG) console.warn(e); }
  syncing = false;
}
function myRankPaths() {
  const p = ['profiles', 'total', ...Object.keys(DB.sc.m).map(ym => 'month/' + ym), ...THEMES.map((_, i) => 'col/' + i), ...VTYPES.map(v => 'var/' + v)];
  for (const ds in DB.daily) for (const d of DIFFS) if (DB.daily[ds][d] && !DB.daily[ds][d].late) p.push('daily/' + ds + '/' + d);
  if (SPD) p.push(...SPD.rankPaths());
  return p;
}
async function googleLogin() {
  try {
    await ON.google(myRankPaths());
    await syncNow();
    // re-submit scores under the (possibly new) account
    if (DB.prof.name) {
      const me = { n: DB.prof.name, i: Math.max(0, DB.prof.icon) };
      await Promise.all([ON.putScore('month/' + thisMonth(), Object.assign({ s: monthScore() }, me)), ON.putScore('total', Object.assign({ s: DB.sc.tot }, me))]).catch(() => {});
    }
    openSettings();
  } catch (e) {
    if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) return;
    toast(esc(t('sync.err')) + (DEBUG ? ' ' + esc(e.code || e.message) : ''), 'msg');
  }
}
function syncSection() {
  if (!ON || !ON.available || ON.mock) return '';
  const acc = signedIn() ? ON.account() : null;
  return `<div class="syncbox"><b>${esc(t('sync.title'))}</b><p>${esc(acc ? t('sync.on', { e: acc.email || acc.name }) : t('sync.desc') + ' ' + t('sync.more'))}</p>
    ${acc ? `<div class="sbtns"><button class="btn sm" id="syNow">${esc(t('sync.now'))}</button><button class="btn sm ghost" id="syOut">${esc(t('sync.logout'))}</button></div>`
      : `<button class="btn gbtn" id="syIn"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.4-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.9 0-5.3-1.9-6.2-4.5H2.2v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>${esc(t('sync.google'))}</button>`}</div>`;
}
function wireSync() {
  const a = $('#syIn'); if (a) a.onclick = googleLogin;
  const b = $('#syNow'); if (b) b.onclick = () => syncNow();
  const c = $('#syOut'); if (c) c.onclick = async () => { if (!confirm(t('sync.logout.q'))) return; await pushNow(); await ON.logout(); toast(esc(t('sync.out')), 'msg'); openSettings(); };
}

/* ================= settings / help ================= */
function hbList() {
  const th = ORDER.map(i => THEMES[i]), sp = SPD ? SPD.bgs.filter(k => k !== 'speedway') : [];
  return MODE === 'speed' ? ['', ...sp, ...th] : ['', ...th, ...(SPD ? ['speedway', ...sp] : [])];
}
function openSettings() {
  const items = [['check', 'set.check'], ['clean', 'set.clean'], ['hl', 'set.hl'], ['timer', 'set.timer'], ['flick', 'set.flick'], ['sound', 'set.sound'], ['vib', 'set.vib'], ['motion', 'set.motion']];
  const tods = ['auto', 'day', 'eve', 'night'];
  $('#setBody').innerHTML = `<div class="set" style="flex-wrap:wrap"><span class="lbl"><b>${esc(t('set.tod'))}</b><small>${esc(t('set.tod.d'))}</small></span><span class="seg" id="todSeg">${tods.map(k => `<button data-k="${k}" class="${DB.set.tod === k ? 'on' : ''}">${esc(t('tod.' + k))}</button>`).join('')}</span></div>`
    + `<div class="set hbset"><span class="lbl"><b>${esc(t('hb.title'))}</b><small>${esc(t('hb.desc'))}${SPD ? ' ' + esc(t('hb.spdesc')) : ''}</small></span><div class="hbgrid">${hbList().map(k => { const ok = !k || hbOK(k), cur = DB.set[hbKey()] || '', on = cur === k && ok || (!k && cur && !hbOK(cur)); return `<button class="hbt ${on ? 'on' : ''} ${ok ? '' : 'lock'}" data-hb="${k}" ${ok ? '' : 'disabled'} title="${esc(bgName(k) + (ok ? '' : ' · ' + (isSpBg(k) ? SPD.bgCond(k) : t('hb.lock'))))}">${BG.svg(k || (MODE === 'speed' ? 'speedway' : 'daily'), 160, 100, k ? '' : 'm')}${ok ? '' : '<i>🔒</i>'}<span>${esc(bgName(k))}</span></button>`; }).join('')}</div></div>`
    + items.map(([k, l]) => `<button class="set ${DB.set[k] ? 'on' : ''}" data-k="${k}"><span class="lbl"><b>${esc(t(l))}</b><small>${esc(t(l + '.d'))}</small></span><span class="sw"></span></button>`).join('')
    + syncSection() + `<button class="set" id="setName"><span class="lbl"><b>${esc(t('prof.edit'))}</b><small>${esc(DB.prof.name || '—')}</small></span></button><button class="danger" id="resetAll">${esc(t('set.reset'))}</button>`;
  $$('#todSeg button').forEach(b => b.onclick = () => { DB.set.tod = b.dataset.k; persist(); $$('#todSeg button').forEach(x => x.classList.toggle('on', x === b)); applyTod(); SFX.tap(); });
  $$('#setBody .set[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; DB.set[k] = !DB.set[k]; b.classList.toggle('on', DB.set[k]); persist(); applySettings(); render(); SFX.tap(); });
  $$('#setBody .hbt:not(.lock)').forEach(b => b.onclick = () => { setHomeBg(b.dataset.hb); $$('#setBody .hbt').forEach(x => x.classList.toggle('on', x === b)); if (screen === 'home') homeScene(); });
  wireSync();
  $('#setName').onclick = () => { closeModals(); setTimeout(() => openName(!DB.prof.name), 60); };
  $('#resetAll').onclick = () => { if (confirm(t('set.reset.q'))) { localStorage.removeItem(STORE); DB = load(); persist(true); closeModals(); go(''); } };
  openModal('mSet');
}
function applySettings() { $('#btnSound').classList.toggle('muted', !DB.set.sound); document.body.classList.toggle('still', !DB.set.motion); }
let lastTod = null;
function applyTod() {
  const tod = curTod(); if (tod === lastTod) return; lastTod = tod;
  refreshScene();
  if (screen === 'game' && G) drawOverlay(G.spec);
  if (screen === 'theme' && $('#map')) drawMap(curTheme, false);
}
function openHelp() {
  // ? on the すぴーど tab of the home screen (or in a speed game) opens the speed tutorial
  if (TUT) { TUT.open(MODE === 'speed' || screen === 'spd' || (screen === 'home' && DB.homeTab === 'spd') ? 'speed' : 'daily', CORE); return; }
  const demo = `<svg viewBox="0 0 120 120"><rect x="38" y="38" width="44" height="44" rx="8" fill="#fff" stroke="var(--acc)" stroke-width="3"/>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => { const [x, y] = FPOS[d]; return `<circle cx="${60 + x * 38}" cy="${60 + y * 38}" r="14" fill="${d === 3 ? 'var(--acc)' : '#fff'}" stroke="#e6dcef"/><text x="${60 + x * 38}" y="${60 + y * 38}" dy=".36em" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="15" fill="${d === 3 ? '#fff' : 'var(--acc)'}">${d}</text>`; }).join('')}<path d="M60 60L90 30" stroke="var(--acc)" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 5"/></svg>`;
  $('#helpBody').innerHTML = t('help.html', { demo: `<div class="flickdemo">${demo}<p>${t('help.flick')}</p></div>` }) + t('help.more', { cost: fmtN(GACHA_COST) });
  openModal('mHelp');
}

/* ================= layout ================= */
function layout() {
  const vw = innerWidth, vh = innerHeight, hh = $('.top').offsetHeight || 54;
  const wideBs = Math.min(vh - hh - 16 - 62, vw - 360 - 24 - 40, 740);
  const compact = vw < 760 || wideBs < 400;
  document.body.classList.toggle('compact', compact);
  let bs, kh = 54, gg = 8, tp = 5;
  if (compact) {
    kh = Math.max(44, Math.min(60, vh * .072));
    const fixed = hh + 16 + 40 + 56 + kh + 4 * 8;
    bs = Math.min(vw - 20, vh - fixed, 560);
    const free = vh - fixed - bs;
    if (free > 0) { const add = Math.min(free * .45, 22); kh += add; tp = 5 + Math.min(4, (free - add) * .1); gg = 8 + Math.min(6, (free - add) * .08); }
  } else { bs = wideBs; kh = Math.round(Math.max(54, Math.min(70, bs / 10.5))); }
  bs = Math.max(240, Math.floor(bs / 9) * 9);
  const r = document.documentElement.style;
  r.setProperty('--gg', gg + 'px'); r.setProperty('--tp', tp + 'px'); r.setProperty('--bs', bs + 'px'); r.setProperty('--kh', kh + 'px');
}
let rsT = 0, lastW = innerWidth;
addEventListener('resize', () => {
  clearTimeout(rsT);
  rsT = setTimeout(() => {
    layout(); bgKey = ''; refreshScene();
    if (screen === 'theme' && $('#map') && Math.abs(innerWidth - lastW) > 20) drawMap(curTheme, false);
    lastW = innerWidth;
  }, 160);
});

/* ================= keyboard ================= */
addEventListener('keydown', e => {
  if ($('.modal.on')) { if (e.key === 'Escape' && !$('.modal.on').dataset.lock) closeModals(); return; }
  if ($('#greveal').classList.contains('on')) { if (e.key === 'Escape' || e.key === 'Enter') { const ok = $('#grOk'); if (ok) ok.click(); else $('#greveal').click(); } return; }
  if (screen === 'spd' && SPD) { if (!(e.target.closest && e.target.closest('select,input'))) SPD.key(e); return; }
  if (screen !== 'game' || !G) return;
  if (e.target.closest && e.target.closest('select,input')) return;
  const k = e.key, mod = e.ctrlKey || e.metaKey;
  if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); redo(); return; }
  if (mod) return;
  const dm = /^Digit([1-9])$/.exec(e.code) || /^Numpad([1-9])$/.exec(e.code);
  if (dm) {
    e.preventDefault(); const d = +dm[1];
    if (sel < 0) { padPress(d); return; }
    if (e.shiftKey || e.altKey) { if (!G.puz[sel] && !G.done) toggleNote(sel, d); } else setValue(sel, d);
    return;
  }
  switch (k) {
    case 'ArrowUp': case 'w': case 'W': e.preventDefault(); moveSel(-1, 0); break;
    case 'ArrowDown': case 's': case 'S': e.preventDefault(); moveSel(1, 0); break;
    case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); moveSel(0, -1); break;
    case 'ArrowRight': case 'd': case 'D': e.preventDefault(); moveSel(0, 1); break;
    case 'Backspace': case 'Delete': case '0': e.preventDefault(); erase(sel); break;
    case 'n': case 'N': case ' ': e.preventDefault(); memo = !memo; SFX.tap(); render(); break;
    case 'h': case 'H': onHint(); break;
    case 'p': case 'P': setPaused(!paused); break;
    case 'Escape': closeHint(); sel = -1; lockD = 0; render(); break;
  }
});

/* ================= wiring ================= */
$('#board').addEventListener('pointerdown', boardDown);
$('#board').addEventListener('pointermove', boardMove);
$('#board').addEventListener('pointerup', boardUp);
$('#board').addEventListener('pointercancel', () => hideFlick());
$('#board').addEventListener('contextmenu', e => e.preventDefault());
$('#tUndo').onclick = undo;
$('#tErase').onclick = () => erase(sel);
$('#tMemo').onclick = () => { memo = !memo; SFX.tap(); render(); };
$('#tAuto').onclick = autoNotes;
$('#tHint').onclick = onHint;
$('#gTime').onclick = () => setPaused(!paused);
$('#gResume').onclick = () => setPaused(false);
$('#gBack').onclick = () => { if (G && G.kind === 'c') go('t/' + (G.ti + 1) + '/m'); else if (G && G.kind === 'x') go('v/' + (G.si + 1)); else go(''); };
$$('#htabs button').forEach(b => b.onclick = () => { SFX.tap(); setHomeTab(b.dataset.p); scrollTo({ top: 0 }); });
$('#logo').onclick = () => go('');
if ($('#calPrev')) { $('#calPrev').onclick = () => { calMonth = addMonths(calMonth, -1); renderCal(); }; $('#calNext').onclick = () => { calMonth = addMonths(calMonth, 1); renderCal(); }; }
$('#btnAch').onclick = () => { SFX.tap(); if (MODE === 'speed' && SPD) SPD.openAch(); else openAch(); };
$('#btnSet').onclick = () => { SFX.tap(); openSettings(); };
$('#btnHelp').onclick = () => { SFX.tap(); openHelp(); };
$('#btnSound').onclick = () => { DB.set.sound = !DB.set.sound; persist(); applySettings(); SFX.tap(); };
$('#langSel').onchange = e => {
  LANG = e.target.value; try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {}
  applyI18n(); route();
};
document.addEventListener('pointerdown', e => {
  if (screen !== 'game' || !G) return;
  if (e.target.closest('.board,.side,.hintcard,.gbar,.modal,.top')) return;
  if (sel >= 0 || lockD) { sel = -1; lockD = 0; render(); }
});
addEventListener('hashchange', route);
addEventListener('pagehide', () => { if (G && screen === 'game') saveGame(); persist(true); pushNow(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pushNow(); else if (signedIn()) syncNow(true); });
let lastDay = today();
setInterval(() => { const td = today(); if (td !== lastDay) { lastDay = td; if (screen === 'home') renderHome(); } applyTod(); }, 30000);

if (DEBUG) window.__sudoku = { get G() { return G; }, DB: () => DB, catalog, setValue, addPts: n => { DB.pts += n; persist(); } };
/* ================= shared core for speed.js / tutorial.js ================= */
const CORE = {
  get DB() { return DB; }, get LANG() { return LANG; }, get screen() { return screen; },
  MODE, BASE, ON, IC, BG, E, GACHA_COST, FIRST_SPEED,
  speedUrl: MODE === 'speed' ? './' : '../speed-sudoku/', speedUrlAbs: URL_SPEED, selfUrl: MODE === 'speed' ? '../sudoku/' : './',
  t, esc, fmtN, fmtTime, fmtDate, fmtMonth, locale, today, thisMonth, addDays, addMonths, persist, toast, confetti, SFX, vib,
  medal, miniMedal, badge, STAR, COIN, CROWN, FLAME, avatar, iconSvg, iconName, iconInfo, rarChip,
  setScene, show, go, goHome, openModal, closeModals, openName, openGacha, openZukan, curTod,
  tutorial: k => { if (TUT) TUT.open(k, CORE); },
  refreshHome: () => { if (screen === 'home') renderHome(); },
};
window.__sudokuCore = DEBUG ? CORE : undefined;

/* ================= boot ================= */
document.body.insertAdjacentHTML('afterbegin', SPRITE);
applyI18n(); applySettings(); buildBoard(); layout(); lastTod = curTod();
Promise.all([
  fetch(BASE + 'puzzles.json?v=2').then(r => r.json()),
  fetch(BASE + 'puzzles_variants.json?v=2').then(r => (r.ok ? r.json() : null)).catch(() => null),
  SPDX ? SPDX.init(CORE) : Promise.resolve(false),
]).then(([j, v, sp]) => {
  PZ = j; PV = v && v.sets && E.setVariant ? v : null;
  SPD = sp ? SPDX : null;
  syncAch(false); persist();
  if (ON && ON.available && DB.prof.name) ON.profile({ n: DB.prof.name, i: Math.max(0, DB.prof.icon) }).catch(() => {});
  route();
  if (ON && ON.available && !ON.mock) ON.init().then(() => { if (signedIn()) syncNow(true); }).catch(() => {});
}).catch(err => { document.body.insertAdjacentHTML('beforeend', `<p style="position:fixed;inset:auto 0 20px;text-align:center;z-index:99">${esc(String(err))}</p>`); });
})();
