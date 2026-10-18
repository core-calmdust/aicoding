/* まいにち数独 — app */
(function () {
'use strict';
const E = window.SudokuEngine, BG = window.SudokuBG;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SUPPORTED = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const STORE = 'mainichi-sudoku-v1';
const FIRST_DAY = '2026-10-01';
const DIFFS = ['e', 'm', 'h'];
const DTIER = { e: 1, m: 2, h: 3 };
const THEMES = ['forest', 'harbor', 'sweets', 'sea', 'garden', 'festival', 'autumn', 'snow', 'stars', 'castle'];
const URL_SELF = 'https://core-calmdust.github.io/aicoding/sudoku/';

/* ================= storage ================= */
const DEF_SET = { check: true, clean: true, hl: true, timer: true, flick: true, sound: true, vib: true, motion: true };
function load() {
  let d = null; try { d = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
  d = d && typeof d === 'object' ? d : {};
  d.set = Object.assign({}, DEF_SET, d.set || {});
  d.daily = d.daily || {}; d.col = d.col || {}; d.saves = d.saves || {}; d.ach = d.ach || {};
  d.play = d.play || 0;
  return d;
}
let DB = load();
let saveT = 0;
function persist(now) {
  clearTimeout(saveT);
  const w = () => { try { localStorage.setItem(STORE, JSON.stringify(DB)); } catch (e) {} };
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
const numLocale = () => (LANG === 'ar' || LANG === 'hi' ? 'en' : locale());
function applyI18n() {
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : LANG;
  document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', t(el.dataset.i18nTitle)); });
  document.title = t('title') + ' — ' + t('meta.sub');
  $('#langSel').value = LANG;
  $('#kbHelp').innerHTML = t('kb.help');
}

/* ================= dates ================= */
const pad2 = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const dayNum = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const fmtDate = (s, o = { month: 'long', day: 'numeric', weekday: 'short' }) => parseYmd(s).toLocaleDateString(locale(), o);
const fmtTime = ms => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return (h ? h + ':' + pad2(m) : m) + ':' + pad2(s % 60); };
const daysIn = (y, m) => new Date(y, m, 0).getDate();

/* ================= art ================= */
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<radialGradient id="g1" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffe4cc"/><stop offset=".55" stop-color="#e09a62"/><stop offset="1" stop-color="#a95f2e"/></radialGradient>
<radialGradient id="g2" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#c9d3e0"/><stop offset="1" stop-color="#8592a6"/></radialGradient>
<radialGradient id="g3" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff8cf"/><stop offset=".5" stop-color="#ffcc45"/><stop offset="1" stop-color="#cf8a08"/></radialGradient>
<linearGradient id="g4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9fb8"/><stop offset=".3" stop-color="#ffd36b"/><stop offset=".55" stop-color="#8fe3b0"/><stop offset=".8" stop-color="#8fc4ff"/><stop offset="1" stop-color="#c39bff"/></linearGradient>
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
/* rosette badge: tier 1-4, centre text or icon */
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
  bulb: '<path d="M-3 6h6M-2 8.5h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M0 -8a5.5 5.5 0 0 0-3.3 9.9c.6.5 1 1.1 1 2h4.6c0-.9.4-1.5 1-2A5.5 5.5 0 0 0 0 -8z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-5 -10l2 2M5 -10l-2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  check: '<path d="M-6 0l4 4 8-8" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  map: '<path d="M-8 -6l5-2 6 2 5-2v14l-5 2-6-2-5 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M-3 -8v14M3 -6v14" stroke="currentColor" stroke-width="2"/>',
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
const lvChip = lv => `<span class="lvchip lv${lv}">${esc(t('lv.' + lv))}</span>`;
const LVCOL = { 1: '#f2a066', 2: '#76a2e2', 3: '#e3ad1f', 4: '#b468d6' };

/* ================= puzzles ================= */
let PZ = null;
const unpack = s => ({ puzzle: E.parse(s.slice(0, 81).replace(/0/g, '.')), lv: +s[81] });
function dailyPuzzle(date, d) {
  const pool = PZ.daily[{ e: 'easy', m: 'medium', h: 'hard' }[d]];
  const idx = ((dayNum(date) * 37 + { e: 0, m: 51, h: 97 }[d]) % pool.length + pool.length) % pool.length;
  const base = unpack(pool[idx]);
  const rng = E.mulberry32(E.hashStr('mainichi:' + date + ':' + d));
  return { puzzle: E.transform(base.puzzle, rng), lv: base.lv };
}
const colPuzzle = (ti, pi) => unpack(PZ.themes[ti][pi]);
const colRec = (ti, pi) => DB.col[ti + '.' + pi];
const themeCleared = ti => { let n = 0; for (let i = 0; i < 50; i++) if (colRec(ti, i)) n++; return n; };
const themeStars = ti => { let n = 0; for (let i = 0; i < 50; i++) { const r = colRec(ti, i); if (r) n += r.s; } return n; };
const totalCleared = () => Object.keys(DB.col).length;

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
};
const vib = ms => { if (DB.set.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} };

/* ================= toasts & confetti ================= */
function toast(html, cls = '') {
  const el = document.createElement('div'); el.className = 'toast ' + cls; el.innerHTML = html;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3200);
}
function confetti(n = 140) {
  if (!DB.set.motion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('#fx'), ctx = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = ['#ff8fb6', '#ffd36b', '#8fe3b0', '#8fc4ff', '#c39bff', '#ff9f7a'];
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

/* ================= background ================= */
let bgKey = '', bgDims = [0, 0];
function setScene(name, variant, th) {
  document.body.dataset.th = th;
  const key = name + ':' + (variant || '');
  const W = innerWidth, H = innerHeight;
  const changed = Math.abs(W / H - bgDims[0] / bgDims[1]) > .15 || !bgDims[0];
  if (key === bgKey && !changed) return;
  const el = $('#bg');
  const put = () => { el.innerHTML = BG.svg(name, Math.round(W), Math.round(H), variant); el.classList.remove('fade'); };
  bgDims = [W, H];
  if (bgKey && key !== bgKey) { el.classList.add('fade'); setTimeout(put, 220); } else put();
  bgKey = key;
}
const homeVariant = () => { const h = new Date().getHours(); return h >= 18 || h < 5 ? 'h' : h >= 11 ? 'm' : 'e'; };

/* ================= screens / routing ================= */
let screen = 'home', curTheme = 0, calMonth = null;
function show(id) {
  if (screen === 'game' && id !== 'game') leaveGame();
  screen = id;
  $$('.screen').forEach(s => s.classList.toggle('on', s.id === id));
  $('#main').classList.toggle('gm', id === 'game');
  scrollTo(0, 0);
}
function route() {
  const h = location.hash.replace(/^#/, '');
  const p = h.split('/');
  closeModals();
  if (p[0] === 'd' && /^\d{4}-\d\d-\d\d$/.test(p[1]) && DIFFS.includes(p[2]) && p[1] >= FIRST_DAY && p[1] <= today()) return openGame({ kind: 'd', date: p[1], d: p[2] });
  if (p[0] === 'c' && +p[1] >= 1 && +p[1] <= 10 && +p[2] >= 1 && +p[2] <= 50) return openGame({ kind: 'c', ti: +p[1] - 1, pi: +p[2] - 1 });
  if (p[0] === 't' && +p[1] >= 1 && +p[1] <= 10) return openTheme(+p[1] - 1);
  openHome();
}
const go = h => { if (location.hash === '#' + h) route(); else location.hash = h; };

/* ================= home ================= */
function openHome() {
  show('home');
  setScene('daily', homeVariant(), 'de');
  renderHome();
}
function dailyStatus(date, d) {
  const r = (DB.daily[date] || {})[d];
  const sv = DB.saves['d/' + date + '/' + d];
  return { r, sv };
}
function diffButtons(date, host) {
  host.innerHTML = DIFFS.map(d => {
    const { r, sv } = dailyStatus(date, d);
    const st = r ? '✓ ' + fmtTime(r.t) : sv ? fmtTime(sv.t) : t('d.' + d + '.sub');
    return `<button class="dbtn ${r ? 'done' : ''}" data-d="${d}">${!r && sv ? `<span class="resume">${esc(t('resume'))}</span>` : ''}${medal(DTIER[d], 'md')}<span class="lb">${esc(t('d.' + d))}</span><span class="st">${esc(st)}</span></button>`;
  }).join('');
  host.querySelectorAll('.dbtn').forEach(b => b.onclick = () => { SFX.tap(); go('d/' + date + '/' + b.dataset.d); });
}
function renderHome() {
  const td = today();
  $('#todayDate').textContent = fmtDate(td, { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  const sk = streakInfo();
  const s = $('#streak'); s.classList.toggle('zero', !sk.cur);
  s.innerHTML = FLAME + esc(sk.cur ? t('streak', { n: sk.cur }) : t('streak0'));
  diffButtons(td, $('#todayDiffs'));
  if (!calMonth) calMonth = td.slice(0, 7);
  renderCal();
  // collection
  const tot = totalCleared();
  $('#colBar').style.width = (tot / 5) + '%';
  $('#colCount').textContent = tot + ' / 500';
  $('#themes').innerHTML = THEMES.map((k, i) => {
    const n = themeCleared(i), lvs = [...new Set(PZ.themes[i].map(s => +s[81]))];
    return `<button class="tcard ${n === 50 ? 'full' : ''}" data-t="${i}"><div class="pic">${BG.svg(k, 320, 200)}<span class="no">${i + 1}</span><span class="crown">${CROWN}</span></div><div class="tx"><span class="nm">${esc(t('th.' + i))}</span><span class="lv">${lvs.map(lvChip).join('')}</span><span class="pg"><span class="bar"><i style="width:${n * 2}%"></i></span>${n}/50</span></div></button>`;
  }).join('');
  $$('#themes .tcard').forEach(b => b.onclick = () => { SFX.tap(); go('t/' + (+b.dataset.t + 1)); });
}
function renderCal() {
  const [y, m] = calMonth.split('-').map(Number);
  const first = new Date(y, m - 1, 1), nd = daysIn(y, m), td = today();
  $('#calTitle').textContent = first.toLocaleDateString(locale(), { year: 'numeric', month: 'long' });
  $('#calPrev').disabled = calMonth <= FIRST_DAY.slice(0, 7);
  $('#calNext').disabled = calMonth >= td.slice(0, 7);
  const wd = []; for (let i = 0; i < 7; i++) wd.push(new Date(2026, 9, 4 + i).toLocaleDateString(locale(), { weekday: 'narrow' }));
  let h = wd.map((w, i) => `<span class="wd ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${esc(w)}</span>`).join('');
  for (let i = 0; i < first.getDay(); i++) h += '<span class="day empty"></span>';
  for (let d = 1; d <= nd; d++) {
    const ds = calMonth + '-' + pad2(d), rec = DB.daily[ds] || {};
    const ok = ds >= FIRST_DAY && ds <= td;
    const ms = DIFFS.filter(x => rec[x]).map(x => miniMedal(DTIER[x], rec[x].late)).join('');
    const all3 = DIFFS.every(x => rec[x]);
    h += `<button class="day ${ds === td ? 'today' : ''} ${all3 ? 'all3' : ''}" data-ds="${ds}" ${ok ? '' : 'disabled'}><span class="num">${d}</span><span class="ms">${ms}</span></button>`;
  }
  $('#cal').innerHTML = h;
  $$('#cal .day[data-ds]').forEach(b => b.onclick = () => openDay(b.dataset.ds));
  // month badges
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

/* ================= theme screen ================= */
function openTheme(ti) {
  curTheme = ti; show('theme');
  setScene(THEMES[ti], '', THEMES[ti]);
  const n = themeCleared(ti);
  $('#tlName').textContent = (ti + 1) + '. ' + t('th.' + ti);
  $('#tlProg').innerHTML = `${n}/50 · ${STAR(true).replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px"')} ${themeStars(ti)}/150`;
  $('#plist').innerHTML = PZ.themes[ti].map((s, pi) => {
    const r = colRec(ti, pi), lv = +s[81], sv = DB.saves['c/' + (ti + 1) + '/' + (pi + 1)];
    return `<button class="pz ${r ? 'cleared' : ''}" data-p="${pi}" title="${esc(t('lv.' + lv))}"><span class="dt" style="background:${LVCOL[lv]}"></span>${sv && !r ? '<span class="ip"></span>' : ''}<span class="n">${pi + 1}</span><span class="stars">${r ? [1, 2, 3].map(k => STAR(k <= r.s)).join('') : ''}</span></button>`;
  }).join('');
  $$('#plist .pz').forEach(b => b.onclick = () => { SFX.tap(); go('c/' + (ti + 1) + '/' + (+b.dataset.p + 1)); });
  const next = nextUncleared(ti, -1);
  $('#tlNext').textContent = next < 0 ? t('tl.allclear') : t('tl.next', { n: next + 1 });
  $('#tlNext').onclick = () => { if (next >= 0) go('c/' + (ti + 1) + '/' + (next + 1)); else go(''); };
  const lvs = [...new Set(PZ.themes[ti].map(s => +s[81]))];
  $('#tlLegend').innerHTML = lvs.map(l => `<span><i style="background:${LVCOL[l]}"></i>${esc(t('lv.' + l))}</span>`).join('') + `<span>· ${esc(t('tl.stars'))}</span>`;
}
function nextUncleared(ti, after) {
  for (let k = 1; k <= 50; k++) { const p = (after + k) % 50; if (!colRec(ti, p)) return p; }
  return -1;
}

/* ================= game ================= */
let G = null, sel = -1, memo = false, lockD = 0, timerI = 0, paused = false, hintState = null;
const cellEls = [];
function buildBoard() {
  const b = $('#board'); b.innerHTML = '';
  for (let bx = 0; bx < 9; bx++) {
    const box = document.createElement('div'); box.className = 'box';
    for (let k = 0; k < 9; k++) {
      const r = ((bx / 3) | 0) * 3 + ((k / 3) | 0), c = (bx % 3) * 3 + (k % 3), i = r * 9 + c;
      const el = document.createElement('div'); el.className = 'cell'; el.dataset.i = i;
      el.innerHTML = '<span class="v"></span><div class="nt">' + '<i></i>'.repeat(9) + '</div>';
      cellEls[i] = el; box.appendChild(el);
    }
    b.appendChild(box);
  }
  $('#pad').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button class="key" data-d="${d}"><span class="n">${d}</span><span class="c"></span></button>`).join('');
  $$('#pad .key').forEach(k => {
    k.addEventListener('pointerdown', e => { e.preventDefault(); padPress(+k.dataset.d); });
    k.addEventListener('click', e => { if (e.detail === 0) padPress(+k.dataset.d); }); // keyboard activation
  });
}
const gameKey = o => o.kind === 'd' ? 'd/' + o.date + '/' + o.d : 'c/' + (o.ti + 1) + '/' + (o.pi + 1);
function openGame(o) {
  show('game');
  const P = o.kind === 'd' ? dailyPuzzle(o.date, o.d) : colPuzzle(o.ti, o.pi);
  const sol = E.solve(P.puzzle, 1).solution;
  const key = gameKey(o);
  G = Object.assign({}, o, { key, lv: P.lv, puz: P.puzzle, sol, grid: P.puzzle.slice(), notes: new Array(81).fill(0), hist: [], redo: [], time: 0, mist: 0, hints: 0, done: false });
  const sv = DB.saves[key];
  if (sv && sv.g && sv.g.length === 81) {
    G.grid = E.parse(sv.g); for (let i = 0; i < 81; i++) if (G.puz[i]) G.grid[i] = G.puz[i];
    G.notes = (sv.n || []).slice(0, 81); while (G.notes.length < 81) G.notes.push(0);
    G.time = sv.t || 0; G.mist = sv.m || 0; G.hints = sv.h || 0;
  }
  if (o.kind === 'd') setScene('daily', o.d, 'd' + o.d); else setScene(THEMES[o.ti], '', THEMES[o.ti]);
  // title
  if (o.kind === 'd') $('#gTitle').innerHTML = miniMedal(DTIER[o.d]) + `<span>${esc(fmtDate(o.date, { month: 'short', day: 'numeric' }))} ${esc(t('d.' + o.d))}</span>`;
  else $('#gTitle').innerHTML = lvChip(G.lv) + `<span>${esc(t('th.' + o.ti))} #${o.pi + 1}</span>`;
  sel = -1; lockD = 0; memo = false; paused = false; closeHint();
  $('#board').classList.remove('paused', 'done');
  layout(); render(); startTimer();
  if (!DB.seenHelp) { DB.seenHelp = 1; persist(); setTimeout(() => openHelp(), 400); }
}
function leaveGame() { if (G && !G.done) saveGame(); stopTimer(); closeHint(); hideFlick(); }
function saveGame() {
  if (!G || G.done) return;
  const touched = G.grid.some((v, i) => v && !G.puz[i]) || G.notes.some(x => x);
  if (!touched && !G.time) return;
  DB.saves[G.key] = { g: E.stringify(G.grid), n: G.notes, t: Math.round(G.time), m: G.mist, h: G.hints };
  persist();
}
/* timer */
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

/* render */
function render() {
  if (!G) return;
  const s = DB.set;
  const focusD = lockD || (sel >= 0 ? G.grid[sel] : 0);
  const peers = sel >= 0 ? new Set(E.PEERS[sel]) : null;
  for (let i = 0; i < 81; i++) {
    const el = cellEls[i], v = G.grid[i];
    const given = !!G.puz[i];
    el.classList.toggle('given', given);
    el.classList.toggle('sel', i === sel);
    el.classList.toggle('peer', !!peers && peers.has(i) && s.hl);
    el.classList.toggle('same', !!v && s.hl && v === focusD && i !== sel);
    el.classList.toggle('err', !!v && !given && s.check && v !== G.sol[i]);
    el.firstChild.textContent = v || '';
    const nt = el.lastChild.children, m = v ? 0 : G.notes[i];
    for (let d = 1; d <= 9; d++) {
      const on = !!(m & (1 << (d - 1)));
      nt[d - 1].textContent = on ? d : '';
      nt[d - 1].className = on && s.hl && d === focusD ? 'hit' : '';
    }
  }
  // pad counts
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
  const hn = $('#hintN'); hn.hidden = !G.hints; hn.textContent = G.hints;
}
function flash(i, cls, ms = 400) { const el = cellEls[i]; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); }

/* actions */
const bitD = d => 1 << (d - 1);
function pushHist(cells) { G.hist.push(cells.map(i => ({ i, v: G.grid[i], n: G.notes[i] }))); if (G.hist.length > 400) G.hist.shift(); G.redo = []; }
function setValue(i, d, fromHint) {
  if (!G || G.done || paused || i < 0 || G.puz[i]) return;
  if (memo && !fromHint) return toggleNote(i, d);
  closeHint();
  if (G.grid[i] === d) { // tapping the same digit clears it
    pushHist([i]); G.grid[i] = 0; SFX.erase(); render(); saveGame(); return;
  }
  const affected = [i];
  if (DB.set.clean) for (const p of E.PEERS[i]) if (G.notes[p] & bitD(d)) affected.push(p);
  pushHist(affected);
  G.grid[i] = d; G.notes[i] = 0;
  if (DB.set.clean) for (const p of affected) if (p !== i) G.notes[p] &= ~bitD(d);
  if (d !== G.sol[i]) {
    G.mist++; if (DB.set.check) { SFX.err(); vib([30, 40, 30]); flash(i, 'shake', 340); } else SFX.place();
  } else {
    SFX.place(); vib(8); flash(i, 'pop', 300);
    checkUnits(i);
  }
  render(); saveGame();
  if (G.grid.every((v, k) => v === G.sol[k])) finish();
}
function toggleNote(i, d) {
  if (G.grid[i]) return;
  pushHist([i]); G.notes[i] ^= bitD(d); SFX.note(); render(); saveGame();
}
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
function autoNotes() {
  if (!G || G.done || paused) return;
  const g = G.grid.map((v, i) => (v === G.sol[i] ? v : 0));
  const cand = E.candidates(g), cells = [];
  for (let i = 0; i < 81; i++) if (!G.grid[i] && G.notes[i] !== cand[i]) cells.push(i);
  if (!cells.length) { toast(esc(t('auto.none')), 'msg'); return; }
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
  // digit-first mode
  sel = -1; lockD = lockD === d ? 0 : d; SFX.tap(); render();
}
function cellTap(i, wasSel) {
  if (!G || G.done || paused) return;
  if (lockD) {
    if (G.puz[i] || (G.grid[i] && G.grid[i] !== lockD && !memo)) { lockD = G.grid[i]; SFX.tap(); render(); return; }
    setValue(i, lockD); return;
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
  fl.cx = cx; fl.cy = cy;
  const cnt = new Array(10).fill(0); for (const v of G.grid) if (v) cnt[v]++;
  FL.innerHTML = Object.entries(FPOS).map(([d, [x, y]]) => `<i data-d="${d}" class="${cnt[d] >= 9 && !memo ? 'dis' : ''}" style="left:${90 + x * 58}px;top:${90 + y * 58}px">${d}</i>`).join('');
  FL.style.left = cx + 'px'; FL.style.top = cy + 'px';
  FL.classList.toggle('memo', memo); FL.classList.add('on'); fl.shown = true; vib(6);
}
function hideFlick() { FL.classList.remove('on'); if (fl) clearTimeout(fl.timer); fl = null; }
function flickDir(dx, dy, long) {
  const dist = Math.hypot(dx, dy);
  if (dist < 16) return long ? 5 : 0;
  const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return { 0: 6, 1: 9, 2: 8, 3: 7, 4: 4, '-4': 4, '-1': 3, '-2': 2, '-3': 1 }[a];
}
function boardDown(e) {
  if (!G || G.done || paused) return;
  const c = e.target.closest('.cell'); if (!c) return;
  e.preventDefault();
  const i = +c.dataset.i;
  closeHint();
  const wasSel = sel === i;
  if (!lockD) { sel = i; render(); SFX.tap(); }
  const canFlick = DB.set.flick && !lockD && !G.puz[i];
  fl = { i, x: e.clientX, y: e.clientY, wasSel, shown: false, long: false, d: 0, can: canFlick, id: e.pointerId };
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
  cellTap(f.i, f.wasSel);
}

/* ---- hints ---- */
const unitName = u => t(u < 9 ? 'u.row' : u < 18 ? 'u.col' : 'u.box', { n: (u % 9) + 1 });
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
  G.hints++; SFX.hint();
  let html;
  if (wrong.length) {
    hintState = { wrong };
    wrong.forEach(i => cellEls[i].classList.add('ht'));
    html = `<div class="hh"><b>${esc(t('hint.wrongT'))}</b></div><p>${esc(t('hint.wrong', { n: wrong.length }))}</p><div class="ha"><button class="btn ghost" data-a="close">${esc(t('close'))}</button><button class="btn" data-a="fix">${esc(t('hint.fix'))}</button></div>`;
  } else {
    const g = G.grid.slice();
    const h = E.hint(g);
    let i, d, text, tech;
    if (h.step) {
      [i, d] = h.step.place; tech = h.step.tech;
      const pre = h.pre.slice(0, 3).map(s => `<p class="pre"><b>${esc(t('tech.' + s.tech))}</b> — ${esc(explain(s))}</p>`).join('') + (h.pre.length > 3 ? `<p class="pre">${esc(t('hint.more', { n: h.pre.length - 3 }))}</p>` : '');
      text = pre + `<p>${h.pre.length ? esc(t('hint.then')) + ' ' : ''}${esc(explain(h.step))}</p>`;
      (h.step.units || []).forEach(u => E.UNITS[u].forEach(k => cellEls[k].classList.add('hz')));
      h.pre.forEach(s => (s.cells || []).forEach(k => cellEls[k].classList.add('hzc')));
      if (h.pre.length) tech = h.pre.reduce((a, s) => (E.TECH[s.tech].level > E.TECH[a].level ? s.tech : a), tech);
    } else {
      i = sel >= 0 && !G.grid[sel] ? sel : G.grid.findIndex(v => !v); d = G.sol[i]; tech = null;
      text = `<p>${esc(t('hint.reveal'))}</p>`;
    }
    cellEls[i].classList.add('ht'); sel = i;
    hintState = { place: [i, d] };
    html = `<div class="hh"><b>${esc(t('hint.title'))}</b>${tech ? `<span class="tch">${esc(t('tech.' + tech))}</span>` : ''}</div>${text}<div class="ha"><button class="btn ghost" data-a="close">${esc(t('close'))}</button><button class="btn" data-a="place">${esc(t('hint.place', { d }))}</button></div>`;
    render();
    cellEls[i].classList.add('ht');
  }
  const hc = $('#hintCard'); hc.innerHTML = html;
  const focus = hintState.place ? hintState.place[0] : hintState.wrong[0];
  const lowHalf = E.ROW[focus] >= 4 && !(hintState.place && E.ROW[focus] === 4);
  hc.classList.toggle('at-top', lowHalf); hc.classList.toggle('at-bot', !lowHalf); hc.classList.add('on');
  hc.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'close') closeHint(); else if (a === 'place') applyHint();
    else if (a === 'fix') { const w = hintState.wrong; pushHist(w); w.forEach(k => (G.grid[k] = 0)); closeHint(); SFX.erase(); render(); saveGame(); }
  });
  render(); saveGame();
  // re-apply marks (render doesn't touch hint classes)
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
  let newBest = false, stars = 0, first = false;
  if (G.kind === 'd') {
    rec.late = G.date !== today();
    const day = DB.daily[G.date] = DB.daily[G.date] || {};
    const prevBest = bestTime('d', G.d);
    if (!day[G.d]) { day[G.d] = rec; first = true; } else if (rec.t < day[G.d].t) day[G.d].t = rec.t;
    newBest = prevBest != null && rec.t < prevBest;
  } else {
    stars = 1 + (G.hints === 0 ? 1 : 0) + (G.hints === 0 && G.mist === 0 ? 1 : 0);
    const k = G.ti + '.' + G.pi, prev = DB.col[k];
    first = !prev;
    rec.s = stars;
    if (!prev) DB.col[k] = rec;
    else { prev.s = Math.max(prev.s, stars); if (rec.t < prev.t) { prev.t = rec.t; newBest = true; } }
  }
  const fresh = syncAch(true);
  persist(true);
  setTimeout(() => { SFX.win(); confetti(); vib([20, 60, 20, 60, 40]); }, 250);
  setTimeout(() => showResult(rec, { newBest, stars, first, fresh }), 900);
}
function bestTime(kind, d) {
  let b = null;
  for (const ds in DB.daily) { const r = DB.daily[ds][d]; if (r && (b == null || r.t < b)) b = r.t; }
  return b;
}
function showResult(rec, o) {
  const daily = G.kind === 'd';
  let h = '';
  if (daily) {
    h += medal(DTIER[G.d], 'rm') + `<h3>${esc(t('res.medal.' + G.d))}</h3><div class="rs">${esc(fmtDate(G.date, { year: 'numeric', month: 'long', day: 'numeric' }))} · ${esc(t('d.' + G.d))}${rec.late ? ' · ' + esc(t('res.late')) : ''}</div>`;
  } else {
    h += `<div class="rstars">${[1, 2, 3].map(k => STAR(k <= o.stars)).join('')}</div><h3>${esc(t('res.clear'))}</h3><div class="rs">${esc(t('th.' + G.ti))} #${G.pi + 1} · ${esc(t('lv.' + G.lv))}</div>`;
  }
  h += `<div class="rgrid"><div><small>${esc(t('res.time'))}</small><b>${fmtTime(rec.t)}</b>${o.newBest ? `<span class="best">${esc(t('res.best'))}</span>` : ''}</div><div><small>${esc(t('res.mist'))}</small><b>${rec.m}</b></div><div><small>${esc(t('res.hints'))}</small><b>${rec.h}</b></div></div>`;
  if (!rec.m && !rec.h) h += `<div class="rs" style="color:#e8603c;font-weight:700">✨ ${esc(t('res.perfect'))}</div>`;
  if (o.fresh.length) h += `<div class="rnew">${o.fresh.slice(0, 5).map((a, k) => `<div class="na" style="animation-delay:${.3 + k * .12}s">${badge(a.tier, a.icon)}<span><b>${esc(t('res.newach'))} ${esc(a.name)}</b><small>${esc(a.desc)}</small></span></div>`).join('')}</div>`;
  // actions
  let next = '';
  if (daily) {
    const nd = DIFFS.find(d => !(DB.daily[G.date] || {})[d]);
    next = nd ? `<button class="btn" data-a="next" data-to="d/${G.date}/${nd}">${esc(t('res.nextd', { d: t('d.' + nd) }))}</button>` : `<button class="btn" data-a="home">${esc(t('res.home'))}</button>`;
  } else {
    const np = nextUncleared(G.ti, G.pi);
    next = np >= 0 ? `<button class="btn" data-a="next" data-to="c/${G.ti + 1}/${np + 1}">${esc(t('res.nextc', { n: np + 1 }))}</button>` : `<button class="btn" data-a="next" data-to="t/${G.ti + 1}">${esc(t('res.list'))}</button>`;
  }
  h += `<div class="ract"><button class="btn ghost" data-a="share"><svg viewBox="0 0 24 24"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13"/></svg>${esc(t('share'))}</button>${next}</div>`;
  h += `<div class="ract" style="margin-top:12px"><button class="btn ghost" data-a="${daily ? 'home' : 'list'}" style="font-size:13px;padding:8px 16px">${esc(daily ? t('res.cal') : t('res.list'))}</button><button class="btn ghost" data-a="view" style="font-size:13px;padding:8px 16px">${esc(t('res.view'))}</button></div>`;
  $('#resBody').innerHTML = h;
  $('#resBody').querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'share') share(rec);
    else if (a === 'next') { closeModals(); go(b.dataset.to); }
    else if (a === 'home') { closeModals(); go(''); }
    else if (a === 'list') { closeModals(); go('t/' + (G.ti + 1)); }
    else if (a === 'view') closeModals();
  });
  openModal('mRes');
  if (o.fresh.length) { SFX.ach(); $('#btnAch').classList.add('has'); }
}
async function share(rec) {
  let s;
  if (G.kind === 'd') {
    s = `${t('title')} ${fmtDate(G.date, { month: 'numeric', day: 'numeric' })} ${{ e: '🥉', m: '🥈', h: '🥇' }[G.d]}${t('d.' + G.d)} ⏱${fmtTime(rec.t)}${!rec.m && !rec.h ? ' ✨' + t('res.perfect') : ''}`;
  } else {
    s = `${t('title')} ${t('th.' + G.ti)} #${G.pi + 1} ${'⭐'.repeat(rec.s || 1)} ⏱${fmtTime(rec.t)}`;
  }
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
  return a;
}
/* catalog: returns [{id, tier, icon, name, desc, got, group, prog}] */
function catalog() {
  const recs = allRecords(), dRecs = recs.filter(r => r.kind === 'd');
  const out = [];
  const add = (group, id, ok, tier, icon, name, desc, prog) => out.push({ group, id, got: !!ok, tier, icon, name, desc, prog });
  // daily lifetime
  const dc = dRecs.length, hc = dRecs.filter(r => r.d === 'h').length, sk = streakInfo();
  [[10, 1], [50, 2], [100, 3], [365, 4]].forEach(([n, ti]) => add('daily', 'dc' + n, dc >= n, ti, String(n), t('a.dc', { n }), t('a.dc.d', { n }), [dc, n]));
  [[10, 1], [50, 2], [100, 3]].forEach(([n, ti]) => add('daily', 'hc' + n, hc >= n, ti, 'medals', t('a.hc', { n }), t('a.hc.d', { n }), [hc, n]));
  [[30, 2], [100, 3], [365, 4]].forEach(([n, ti]) => add('daily', 'sk' + n, sk.best >= n, ti, 'flame', t('a.sk', { n }), t('a.sk.d', { n }), [sk.best, n]));
  const triDays = Object.keys(DB.daily).filter(ds => DIFFS.every(d => DB.daily[ds][d])).length;
  [[1, 2], [10, 3]].forEach(([n, ti]) => add('daily', 'tri' + n, triDays >= n, ti, 'cal', t('a.tri', { n }), t('a.tri.d', { n }), [triDays, n]));
  // collection
  const tot = totalCleared();
  [[50, 1], [100, 2], [250, 3], [500, 4]].forEach(([n, ti]) => add('col', 'tot' + n, tot >= n, ti, String(n), n === 500 ? t('a.master') : t('a.tot', { n }), t('a.tot.d', { n }), [tot, n]));
  for (let i = 0; i < 10; i++) {
    const c = themeCleared(i), s = themeStars(i);
    [[10, 1], [25, 2], [50, 3]].forEach(([n, ti]) => add('theme' + i, 'th' + i + '.' + n, c >= n, ti, String(n), t('a.th', { t: t('th.' + i), n }), t('a.th.d', { n }), [c, n]));
    add('theme' + i, 'th' + i + '.p', s >= 150, 4, 'star', t('a.thp', { t: t('th.' + i) }), t('a.thp.d'), [s, 150]);
  }
  // challenges
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
  add('chal', 'tour', [...Array(10).keys()].every(i => themeCleared(i) > 0), 2, 'map', t('a.tour'), t('a.tour.d'));
  // monthly
  const months = new Set(Object.keys(DB.daily).map(s => s.slice(0, 7)));
  for (const ym of months) { const mb = monthBadges(ym); for (const k of ['3', '7', 'all']) if (mb[k]) add('month', 'mo' + ym + ':' + k, true, mb[k], k === 'all' ? 'cal' : k, t('a.m' + k, { m: fmtMonth(ym) }), t('a.m' + k + '.d'), null); }
  return out;
}
const fmtMonth = ym => parseYmd(ym + '-01').toLocaleDateString(locale(), { year: 'numeric', month: 'long' });
function syncAch(report) {
  const fresh = [];
  for (const a of catalog()) {
    if (!a.got) continue;
    const prev = DB.ach[a.id];
    if (!prev || prev < a.tier) { DB.ach[a.id] = a.tier; if (report) fresh.push(a); }
  }
  return fresh;
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
    h += `<div class="agrp"><h4>${esc(t('ach.monthly'))}</h4>`;
    const td = today(); let ym = td.slice(0, 7);
    const months = []; while (ym >= FIRST_DAY.slice(0, 7)) { months.push(ym); const d = parseYmd(ym + '-01'); d.setMonth(d.getMonth() - 1); ym = ymd(d).slice(0, 7); }
    for (const m of months) {
      const mb = monthBadges(m), [y, mo] = m.split('-').map(Number), nd = daysIn(y, mo);
      const cleared = [...Array(nd).keys()].filter(d => dayTier(m + '-' + pad2(d + 1))).length;
      h += `<div class="mrow"><div class="mn">${esc(fmtMonth(m))}<small>${esc(t('ach.month.days', { n: cleared, m: nd }))}</small></div><div class="mb">${[['3', 'm.3'], ['7', 'm.7'], ['all', 'm.all']].map(([k, l]) => `<span class="mbadge ${mb[k] ? '' : 'lock'}" title="${esc(t('a.m' + k + '.d'))}">${badge(mb[k] || 1, k === 'all' ? nd : k)}<span>${esc(t(l))}</span></span>`).join('')}</div></div>`;
    }
    h += `<p class="note">${esc(t('ach.month.tier'))}</p></div>`;
    h += `<div class="agrp"><h4>${esc(t('ach.lifetime'))}</h4><div class="agrid">${by('daily').map(cell).join('')}</div></div>`;
  } else if (achTab === 'col') {
    const tot = totalCleared(), m = C.find(a => a.id === 'tot500');
    h += `<div class="big ${m.got ? '' : 'lock'}">${badge(4, 'crown')}<div><b>${esc(t('a.master'))}</b><small>${esc(t('a.master.d'))}</small><div class="col-total" style="margin:8px 0 0"><div class="bar"><i style="width:${tot / 5}%"></i></div><b class="num">${tot}/500</b></div></div></div>`;
    h += `<div class="agrp"><h4>${esc(t('ach.total'))}</h4><div class="agrid">${by('col').map(cell).join('')}</div></div>`;
    h += `<div class="agrp"><h4>${esc(t('ach.themes'))}</h4>`;
    for (let i = 0; i < 10; i++) {
      const a = by('theme' + i);
      h += `<div class="trow"><div class="tp">${BG.svg(THEMES[i], 160, 100)}</div><div class="tn"><b>${esc(t('th.' + i))}</b><small>${themeCleared(i)}/50 · ★${themeStars(i)}/150</small></div><div class="mb">${a.map(x => `<span title="${esc(x.name + ' — ' + x.desc)}" class="${x.got ? '' : 'lock'}">${badge(x.tier, x.icon)}</span>`).join('')}</div></div>`;
    }
    h += '</div>';
  } else if (achTab === 'chal') {
    h += `<div class="agrp"><div class="agrid">${by('chal').map(cell).join('')}</div></div>`;
  } else {
    const recs = allRecords(), sk = streakInfo();
    const tm = recs.reduce((a, r) => a + r.t, 0);
    h += `<div class="stats">
      <div class="stat"><small>${esc(t('st.solved'))}</small><b>${recs.length}</b></div>
      <div class="stat"><small>${esc(t('st.daily'))}</small><b>${recs.filter(r => r.kind === 'd').length}</b></div>
      <div class="stat"><small>${esc(t('st.col'))}</small><b>${totalCleared()}</b><em>/500</em></div>
      <div class="stat"><small>${esc(t('st.streak'))}</small><b>${sk.cur}</b><em>${esc(t('st.best', { n: sk.best }))}</em></div>
      <div class="stat"><small>${esc(t('st.perfect'))}</small><b>${recs.filter(r => !r.m && !r.h).length}</b></div>
      <div class="stat"><small>${esc(t('st.time'))}</small><b>${fmtTime(DB.play || tm)}</b></div>
    </div>`;
    h += `<table class="tbl"><tr><th></th><th>${esc(t('st.cnt'))}</th><th>${esc(t('st.bestT'))}</th><th>${esc(t('st.avgT'))}</th><th>${esc(t('st.perfect'))}</th></tr>`;
    const row = (label, rs) => { const n = rs.length; const b = n ? Math.min(...rs.map(r => r.t)) : 0; const av = n ? rs.reduce((a, r) => a + r.t, 0) / n : 0; return `<tr><td>${label}</td><td>${n}</td><td>${n ? fmtTime(b) : '—'}</td><td>${n ? fmtTime(av) : '—'}</td><td>${rs.filter(r => !r.m && !r.h).length}</td></tr>`; };
    for (const d of DIFFS) h += row(miniMedal(DTIER[d]).replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-3px;margin-inline-end:4px"') + esc(t('d.' + d)), recs.filter(r => r.kind === 'd' && r.d === d));
    for (let lv = 1; lv <= 4; lv++) h += row(lvChip(lv), recs.filter(r => r.kind === 'c' && r.lv === lv));
    h += '</table>';
  }
  $('#achBody').innerHTML = h;
  openModal('mAch');
}

/* ================= settings / help ================= */
function openSettings() {
  const items = [['check', 'set.check'], ['clean', 'set.clean'], ['hl', 'set.hl'], ['timer', 'set.timer'], ['flick', 'set.flick'], ['sound', 'set.sound'], ['vib', 'set.vib'], ['motion', 'set.motion']];
  $('#setBody').innerHTML = items.map(([k, l]) => `<button class="set ${DB.set[k] ? 'on' : ''}" data-k="${k}"><span class="lbl"><b>${esc(t(l))}</b><small>${esc(t(l + '.d'))}</small></span><span class="sw"></span></button>`).join('') + `<button class="danger" id="resetAll">${esc(t('set.reset'))}</button>`;
  $$('#setBody .set').forEach(b => b.onclick = () => { const k = b.dataset.k; DB.set[k] = !DB.set[k]; b.classList.toggle('on', DB.set[k]); persist(); applySettings(); render(); SFX.tap(); });
  $('#resetAll').onclick = () => { if (confirm(t('set.reset.q'))) { localStorage.removeItem(STORE); DB = load(); persist(true); closeModals(); go(''); renderHome(); } };
  openModal('mSet');
}
function applySettings() {
  $('#btnSound').classList.toggle('muted', !DB.set.sound);
  document.body.classList.toggle('still', !DB.set.motion);
}
function openHelp() {
  const demo = `<svg viewBox="0 0 120 120"><rect x="38" y="38" width="44" height="44" rx="8" fill="#fff" stroke="var(--acc)" stroke-width="3"/>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => { const [x, y] = FPOS[d]; return `<circle cx="${60 + x * 38}" cy="${60 + y * 38}" r="14" fill="${d === 3 ? 'var(--acc)' : '#fff'}" stroke="#e6dcef"/><text x="${60 + x * 38}" y="${60 + y * 38}" dy=".36em" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="15" fill="${d === 3 ? '#fff' : 'var(--acc)'}">${d}</text>`; }).join('')}<path d="M60 60L90 30" stroke="var(--acc)" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 5"/></svg>`;
  $('#helpBody').innerHTML = t('help.html', { demo: `<div class="flickdemo">${demo}<p>${t('help.flick')}</p></div>` });
  openModal('mHelp');
}

/* ================= modals ================= */
function openModal(id) { $('#' + id).classList.add('on'); }
function closeModals() { $$('.modal.on').forEach(m => m.classList.remove('on')); }
$$('.modal').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) m.classList.remove('on'); });
});

/* ================= layout ================= */
function layout() {
  const vw = innerWidth, vh = innerHeight, hh = $('.top').offsetHeight || 54;
  const wideBs = Math.min(vh - hh - 16 - 62, vw - 310 - 24 - 40, 640);
  const compact = vw < 760 || wideBs < 400;
  document.body.classList.toggle('compact', compact);
  let bs, kh = 54;
  let gg = 8, tp = 5;
  if (compact) {
    kh = Math.max(44, Math.min(60, vh * .072));
    const fixed = hh + 16 + 40 + 56 + kh + 4 * 8;
    bs = Math.min(vw - 20, vh - fixed, 560);
    // spend leftover height on bigger keys and a little breathing room
    const free = vh - fixed - bs;
    if (free > 0) { const add = Math.min(free * .45, 22); kh += add; tp = 5 + Math.min(4, (free - add) * .1); gg = 8 + Math.min(6, (free - add) * .08); }
  } else bs = wideBs;
  document.documentElement.style.setProperty('--gg', gg + 'px');
  document.documentElement.style.setProperty('--tp', tp + 'px');
  bs = Math.max(240, Math.floor(bs / 9) * 9 + 6);
  document.documentElement.style.setProperty('--bs', bs + 'px');
  document.documentElement.style.setProperty('--kh', kh + 'px');
}
let rsT = 0;
addEventListener('resize', () => {
  clearTimeout(rsT);
  rsT = setTimeout(() => {
    layout();
    const k = bgKey.split(':'); bgKey = ''; setScene(k[0] || 'daily', k[1] || '', document.body.dataset.th);
  }, 160);
});

/* ================= keyboard ================= */
addEventListener('keydown', e => {
  if ($('.modal.on')) { if (e.key === 'Escape') closeModals(); return; }
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
$('#gBack').onclick = () => { if (G && G.kind === 'c') go('t/' + (G.ti + 1)); else go(''); };
$('#tlBack').onclick = () => go('');
$('#logo').onclick = () => go('');
$('#calPrev').onclick = () => { const d = parseYmd(calMonth + '-01'); d.setMonth(d.getMonth() - 1); calMonth = ymd(d).slice(0, 7); renderCal(); };
$('#calNext').onclick = () => { const d = parseYmd(calMonth + '-01'); d.setMonth(d.getMonth() + 1); calMonth = ymd(d).slice(0, 7); renderCal(); };
$('#btnAch').onclick = () => { SFX.tap(); openAch(); };
$('#btnSet').onclick = () => { SFX.tap(); openSettings(); };
$('#btnHelp').onclick = () => { SFX.tap(); openHelp(); };
$('#btnSound').onclick = () => { DB.set.sound = !DB.set.sound; persist(); applySettings(); SFX.tap(); };
$('#langSel').onchange = e => {
  LANG = e.target.value; try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {}
  applyI18n(); route();
};
// tap outside the board clears selection (but not on tools/pad)
document.addEventListener('pointerdown', e => {
  if (screen !== 'game' || !G) return;
  if (e.target.closest('.board,.side,.hintcard,.gbar,.modal,.top')) return;
  if (sel >= 0 || lockD) { sel = -1; lockD = 0; render(); }
});
addEventListener('hashchange', route);
addEventListener('pagehide', () => { if (G && screen === 'game') saveGame(); persist(true); });
// day rollover while open
let lastDay = today();
setInterval(() => { const td = today(); if (td !== lastDay) { lastDay = td; if (screen === 'home') renderHome(); } }, 30000);

if (new URLSearchParams(location.search).has('debug')) window.__sudoku = { get G() { return G; }, DB: () => DB, catalog, setValue };
/* ================= boot ================= */
document.body.insertAdjacentHTML('afterbegin', SPRITE);
applyI18n(); applySettings(); buildBoard(); layout();
fetch('puzzles.json').then(r => r.json()).then(j => {
  PZ = j;
  syncAch(false); persist();
  route();
}).catch(err => { document.body.insertAdjacentHTML('beforeend', `<p style="position:fixed;inset:auto 0 20px;text-align:center;z-index:99">${esc(String(err))}</p>`); });
})();
