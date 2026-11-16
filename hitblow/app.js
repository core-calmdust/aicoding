// ヒット＆ブロー (hitblow/) — page logic.
'use strict';
const E = window.HitBlowEngine;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-hitblow', SUPPORTED = ['ja', 'en'], DESIGNS = ['walnut', 'neon', 'paper', 'marble'], MODES = ['solo', 'duel', 'daily'];
const sleep = ms => new Promise(r => setTimeout(r, ms));

function detectLang() { const n = (navigator.language || 'ja').toLowerCase(); return n.startsWith('ja') ? 'ja' : 'en'; }
// marks: null = automatic (on in the paper design), true / false = chosen by the player
let S = { mode: 'solo', diff: 'normal', level: 8, digits: false, assist: false, marks: null, design: 'walnut', sound: true, lang: null, daily: { last: '', streak: 0, best: 0, cur: null } };
let G = null;       // the game: see make()
let saved = null;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); if (saved && saved.settings) Object.assign(S, saved.settings); } catch (e) {}
try { if (localStorage.getItem('atlas-sfx') === '0') S.sound = false; } catch (e) {}
if (!S.daily || typeof S.daily !== 'object') S.daily = { last: '', streak: 0, best: 0, cur: null };
if (!MODES.includes(S.mode)) S.mode = 'solo'; if (!E.PRESETS[S.diff]) S.diff = 'normal'; if (!DESIGNS.includes(S.design)) S.design = 'walnut';
S.level = Math.max(1, Math.min(20, S.level | 0 || 8));
let LANG = SUPPORTED.includes(S.lang) ? S.lang : detectLang();

function t(k, v) { let s = (HB_I18N[LANG] && HB_I18N[LANG][k]); if (s == null) s = HB_I18N.en[k]; if (s == null) return k; if (v && typeof s === 'string') for (const x in v) s = s.replace('{' + x + '}', v[x]); return s; }
const tier = lv => t('tier')[Math.min(4, (lv - 1) / 4 | 0)];
const num = x => Number(x).toLocaleString(LANG === 'ja' ? 'ja-JP' : 'en-US');
const marksOn = () => S.marks == null ? S.design === 'paper' : !!S.marks;
const diffText = d => { const p = E.PRESETS[d]; return t('diff.d', { n: p.n, c: p.c, r: t(p.rep ? 'rep.1' : 'rep.0'), m: p.max }); };

// ---------- sound (Web Audio, no files) ----------
let AC = null;
function ac() { if (!S.sound) return null; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return null; } return document.hidden ? null : AC; }
function tone(f0, f1, dur, type, vol, when) { const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (when || 0); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol || .2, t0 + .012); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .03); }
const SFX = {
  place: () => tone(620, 760, .07, 'triangle', .1),
  take: () => tone(520, 400, .07, 'triangle', .07),
  bad: () => tone(200, 150, .14, 'square', .05),
  judge: (h, b) => { for (let i = 0; i < h; i++) tone(880, 880, .12, 'sine', .11, .3 + i * .11); for (let i = 0; i < b; i++) tone(587, 587, .12, 'sine', .08, .3 + (h + i) * .11); if (!h && !b) tone(240, 200, .18, 'sine', .07, .3); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .32, 'triangle', .14, i * .13)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, f * .97, .42, 'sine', .14, i * .2)),
  ping: () => { tone(1320, 1300, .4, 'sine', .07); },
};
const sfx = (k, a, b) => { try { SFX[k] && SFX[k](a, b); } catch (e) {} };
document.addEventListener('visibilitychange', () => { if (AC) { try { document.hidden ? AC.suspend() : AC.resume(); } catch (e) {} } });

// ---------- the game ----------
function shuffled(n) { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function make(mode, diff, secret) {
  const cfg = E.PRESETS[diff];
  return { mode, diff, cfg, secret: secret || E.randomCode(cfg, Math.random), hist: [], cur: Array(cfg.n).fill(-1), phase: mode === 'duel' ? 'set' : 'play', result: null, resigned: false, assisted: false,
    level: S.level, mine: null, ai: [], aiIn: [], px: { c: shuffled(cfg.c), p: shuffled(cfg.n) }, meDone: false, date: mode === 'daily' ? E.localDate() : '',
    busy: false, hint: null, cands: E.allCands(cfg), review: null, justJudged: -1, reveal: false };
}
const PACK = ['mode', 'diff', 'secret', 'hist', 'cur', 'phase', 'result', 'resigned', 'assisted', 'level', 'mine', 'ai', 'aiIn', 'px', 'meDone', 'date'];
function pack(g) { const o = {}; for (const k of PACK) o[k] = g[k]; return o; }
function unpack(o) {
  if (!o || !MODES.includes(o.mode) || !E.PRESETS[o.diff]) return null;
  const cfg = E.PRESETS[o.diff], g = make(o.mode, o.diff, o.secret);
  if (!E.validCode(cfg, o.secret) || !Array.isArray(o.hist)) return null;
  for (const x of o.hist) { if (!x || !E.validCode(Object.assign({}, cfg, { rep: true }), x.g)) return null; const f = E.feedback(o.secret, x.g); g.hist.push({ g: x.g.slice(), h: f.h, b: f.b }); }
  if (g.hist.length > cfg.max) return null;
  g.cur = Array.isArray(o.cur) && o.cur.length === cfg.n && o.cur.every(c => c >= -1 && c < cfg.c) ? o.cur.slice() : g.cur;
  g.level = Math.max(1, Math.min(20, o.level | 0 || 8)); g.resigned = !!o.resigned; g.assisted = !!o.assisted; g.date = o.date || '';
  g.phase = ['set', 'play', 'over'].includes(o.phase) ? o.phase : 'play'; g.result = o.result || null;
  if (o.mode === 'duel') {
    if (g.phase !== 'set') {
      if (!E.validCode(cfg, o.mine)) return null;
      g.mine = o.mine.slice();
      if (o.px && Array.isArray(o.px.c) && o.px.c.length === cfg.c && Array.isArray(o.px.p) && o.px.p.length === cfg.n) g.px = o.px;
      for (const x of (o.ai || [])) { if (!E.validCode(Object.assign({}, cfg, { rep: true }), x.g)) return null; const f = E.feedback(g.mine, x.g); g.ai.push({ g: x.g.slice(), h: f.h, b: f.b }); }
      g.aiIn = g.ai.map(x => ({ g: toInner(g, x.g), h: x.h, b: x.b }));
      g.meDone = g.hist.some(x => x.h === cfg.n);
    } else g.phase = 'set';
  }
  if (g.phase === 'over' && !g.result) g.result = 'l';
  g.cands = E.candsOf(cfg, g.hist);
  return g;
}
// the AI thinks in its own shuffled colours / places, so its opening does not look the same every game
function toShown(g, inner) { const out = []; for (let i = 0; i < inner.length; i++) out[g.px.p[i]] = g.px.c[inner[i]]; return out; }
function toInner(g, shown) { const inv = []; g.px.c.forEach((c, i) => { inv[c] = i; }); const out = []; for (let i = 0; i < shown.length; i++) out[i] = inv[shown[g.px.p[i]]]; return out; }

function save() {
  if (G && G.mode === 'daily') S.daily.cur = pack(G);
  const d = { settings: Object.assign({}, S, { lang: LANG }) };
  if (G) d.game = pack(G);
  try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {}
}
function restore() {
  const g = saved && saved.game ? unpack(saved.game) : null;
  if (!g) return false;
  if (g.mode === 'daily' && g.date !== E.localDate()) return false;      // yesterday's daily puzzle: a new day, a new puzzle
  G = g; return true;
}
function streakNow() { const d = S.daily, today = E.localDate(); return d.last === today || d.last === E.dayBefore(today) ? d.streak : 0; }

function startGame(mode, diff) {
  reviewJob++;
  $('#resultOverlay').classList.remove('show');
  if (mode === 'daily') {
    const today = E.localDate(), c = S.daily.cur ? unpack(S.daily.cur) : null;
    if (c && c.mode === 'daily' && c.date === today) G = c;
    else { G = make('daily', 'normal', E.dailyCode(today)); G.date = today; }
  } else G = make(mode, diff);
  render(); save();
  if (G.phase === 'over') startReview();
  fit();
}
const canInput = () => !!G && G.phase !== 'over' && !G.busy;
const myTurn = () => canInput();

function place(c) {
  if (!canInput() || c < 0 || c >= G.cfg.c) return;
  const i = G.cur.indexOf(-1); if (i < 0) return;
  if (!G.cfg.rep && G.cur.includes(c)) { toast(t('fx.rep')); sfx('bad'); return; }
  G.cur[i] = c; G.hint = null; sfx('place'); renderInput(i); renderStatus(); save();
}
function takeAt(i) {
  if (!canInput() || G.cur[i] < 0) return;
  G.cur[i] = -1; G.hint = null; sfx('take'); renderInput(-1); renderStatus(); save();
}
function takeLast() { if (!canInput()) return; for (let i = G.cfg.n - 1; i >= 0; i--) if (G.cur[i] >= 0) return takeAt(i); }
function submit() {
  if (!canInput()) return;
  const left = G.cur.filter(c => c < 0).length;
  if (left) { toast(t('st.need', { k: left })); sfx('bad'); shake(); return; }
  const n = G.cfg.n, g = G.cur.slice();
  G.cur = Array(n).fill(-1); G.hint = null;
  if (G.phase === 'set') { G.mine = g; G.phase = 'play'; sfx('ping'); render(); save(); return; }
  const f = E.feedback(G.secret, g);
  G.hist.push({ g, h: f.h, b: f.b }); G.cands = E.filterCands(G.cfg, G.cands, g, f.h, f.b); G.justJudged = G.hist.length - 1;
  sfx('place'); sfx('judge', f.h, f.b);
  const solved = f.h === n;
  if (G.mode === 'duel') { G.meDone = solved; G.busy = true; render(); save(); return aiTurn(); }
  if (solved) return finish('w');
  if (G.hist.length >= G.cfg.max) return finish('l');
  render(); save();
}
async function aiTurn() {
  const g = G; g.busy = true; renderStatus(); renderButtons(); renderDock(-1);
  await sleep(g.meDone ? 900 : 1000); if (G !== g || g.phase === 'over') return;
  const inner = E.aiGuess(g.cfg, g.aiIn, g.level, Math.random), shown = toShown(g, inner), f = E.feedback(g.mine, shown);
  g.aiIn.push({ g: inner, h: f.h, b: f.b }); g.ai.push({ g: shown, h: f.h, b: f.b });
  const aiDone = f.h === g.cfg.n;
  if (g.meDone && aiDone) return finish('d');
  if (g.meDone) return finish('w');
  if (aiDone) return finish('l');
  if (g.hist.length >= g.cfg.max) return finish('d');
  g.busy = false; sfx('take'); render(); save();
}
function finish(res) {
  const g = G; g.phase = 'over'; g.result = res; g.busy = false; g.hint = null; g.cur = Array(g.cfg.n).fill(-1); g.reveal = true;
  if (g.mode === 'daily') {
    const d = S.daily;
    if (res === 'w') { d.streak = d.last === g.date ? d.streak : d.last === E.dayBefore(g.date) ? d.streak + 1 : 1; d.last = g.date; if (!g.assisted) d.best = d.best ? Math.min(d.best, g.hist.length) : g.hist.length; }
    else d.streak = 0;
  }
  render(); save();
  try {
    if (g.hist.length || g.resigned) {
      const why = g.resigned ? Resign.label(LANG) : '';
      if (g.mode === 'duel') GameRecord.add({ mode: 'ai', res, side: 0, opp: 'AI Lv.' + g.level, key: 'ai:' + g.level, n: g.hist.length, why });
      else GameRecord.add({ mode: 'ai', res, side: 0, opp: g.mode === 'daily' ? t('rec.daily') : t('diff.' + g.diff), key: g.mode === 'daily' ? 'daily' : 'solo:' + g.diff, n: g.hist.length, why });
    }
  } catch (e) {}
  startReview();
  setTimeout(() => { if (G !== g) return; sfx(res === 'w' ? 'win' : res === 'l' ? 'lose' : 'ping'); showResult(); }, g.resigned ? 700 : 1300);
}
function hint() {
  if (!canInput() || G.phase !== 'play') return;
  const g = G; g.busy = true; renderStatus(t('st.think')); renderButtons();
  setTimeout(() => {
    if (G !== g) return;
    let r = null; try { r = E.bestGuess(g.cfg, g.cands, { rand: Math.random }); } catch (e) {}
    g.busy = false;
    if (r) { g.cur = r.guess.slice(); g.assisted = true; g.hint = { x: r.exp, one: g.cands.length === 1 }; sfx('ping'); }
    render(); save();
  }, 40);
}

// ---------- review (after the game; one guess per tick, so the page never freezes) ----------
let reviewJob = 0;
function startReview() {
  const job = ++reviewJob, g = G; g.review = []; g.reviewDone = false; renderReview();
  let i = 0;
  const step = () => {
    if (job !== reviewJob || G !== g) return;
    if (i >= g.hist.length) { g.reviewDone = true; renderReview(); return; }
    try { g.review.push(E.reviewStep(g.cfg, g.hist, i, Math.random)); } catch (e) { g.review.push(null); }
    i++; renderReview(); setTimeout(step, 20);
  };
  setTimeout(step, 350);
}

// ---------- rendering ----------
const MARK = [
  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M12 3.5 21.5 20h-19z"/></svg>',
  '<svg viewBox="0 0 24 24"><rect x="4.5" y="4.5" width="15" height="15" rx="1.5"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M12 2.5 20.5 12 12 21.5 3.5 12z"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M12 2.500l2.9 6.2 6.8.8-5 4.6 1.3 6.7-6-3.3-6 3.3 1.3-6.7-5-4.6 6.8-.8z"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>',
  '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/></svg>',
  '<svg viewBox="0 0 24 24"><path d="M3 12c3-6 6-6 9 0s6 6 9 0v6c-3 6-6 6-9 0s-6-6-9 0z"/></svg>',
];
const LOCK = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
function pegH(c, cls, style) { return `<i class="peg c${c}${cls ? ' ' + cls : ''}"${style ? ` style="${style}"` : ''}>${S.digits ? `<b>${c + 1}</b>` : marksOn() ? MARK[c] : ''}</i>`; }
const mini = code => `<span class="mp">${code.map(c => `<i class="m">${pegH(c)}</i>`).join('')}</span>`;
const fbText = (h, b) => `${h}<u>H</u> ${b}<u>B</u>`;
function fbH(n, h, b) { let s = ''; for (let i = 0; i < n; i++) s += `<i${i < h ? ' class="h"' : i < h + b ? ' class="b"' : ''} style="--i:${i}"></i>`; return `<span class="fbp">${s}</span>`; }

function renderBoard() {
  const n = G.cfg.n, R = G.cfg.max, over = G.phase === 'over', fr = $('#frame');
  fr.style.setProperty('--n', n); fr.style.setProperty('--nc', G.cfg.c); fr.style.setProperty('--fc', Math.ceil(n / 2));
  document.body.classList.toggle('n5', n >= 5);
  const k = over ? G.hist.length : Math.min(G.hist.length + 1, R);
  let h = `<div class="hb-row hb-top"><span class="hb-ix">${LOCK}</span><span class="hb-holes sec${over ? ' open' + (G.reveal ? '' : ' still') : ''}" id="secret">`;
  for (let i = 0; i < n; i++) h += `<i class="hole">${over ? pegH(G.secret[i]) : ''}</i>`;
  h += `<span class="hb-lid">${'<span>?</span>'.repeat(n)}</span></span><span class="hb-fb"><b class="hb-cnt" id="cnt">${k} / ${R}</b></span></div>`;
  for (let r = 0; r < R; r++) {
    const x = G.hist[r], cur = !x && r === G.hist.length && G.phase === 'play';
    h += `<div class="hb-row${cur ? ' cur' : ''}${x && r === G.justJudged ? ' new' : ''}" data-r="${r}"><span class="hb-ix">${r + 1}</span><span class="hb-holes">`;
    for (let i = 0; i < n; i++) { const c = x ? x.g[i] : cur ? G.cur[i] : -1; h += `<i class="hole" data-i="${i}">${c >= 0 ? pegH(c, '', '--i:' + i) : ''}</i>`; }
    h += `</span><span class="hb-fb">${fbH(n, x ? x.h : 0, x ? x.b : 0)}<b class="fbt">${x ? fbText(x.h, x.b) : ''}</b></span></div>`;
  }
  $('#rows').innerHTML = h;
  G.justJudged = -1; G.reveal = false;
}
function renderDock(pop) {
  const n = G.cfg.n, ok = canInput(), nx = G.cur.indexOf(-1);
  $('#slots').innerHTML = G.cur.map((c, i) => `<button type="button" class="hb-slot${i === nx && ok ? ' nx' : ''}${G.hint && c >= 0 ? ' hint' : ''}" data-i="${i}" aria-label="${i + 1}">${c >= 0 ? pegH(c, i === pop ? 'pop' : '') : ''}</button>`).join('');
  const go = $('#btnSubmit'); go.textContent = t(G.phase === 'set' ? 'setcode' : 'submit'); go.disabled = !ok;
  let p = '';
  for (let c = 0; c < G.cfg.c; c++) p += `<button type="button" data-c="${c}" aria-label="${c + 1}" title="${c + 1}"${!ok || (!G.cfg.rep && G.cur.includes(c)) ? ' disabled' : ''}><span>${pegH(c)}</span></button>`;
  $('#palette').innerHTML = p;
}
// only the row being filled and the dock (while placing pegs)
function renderInput(pop) {
  const row = $('#rows .hb-row.cur');
  if (row) row.querySelectorAll('.hole').forEach((el, i) => { const c = G.cur[i]; el.innerHTML = c >= 0 ? pegH(c, i === pop ? 'pop' : '') : ''; });
  renderDock(pop);
}
function renderStatus(msg) {
  let s = msg;
  if (!s) {
    const n = G.cfg.n;
    if (G.phase === 'over') {
      if (G.mode === 'duel') s = G.resigned ? t('st.resign') : t(G.result === 'w' ? 'st.dwin' : G.result === 'l' ? 'st.dlose' : 'st.draw');
      else s = G.resigned ? t('st.resign') : G.result === 'w' ? t('st.win', { k: G.hist.length }) : t('st.lose');
    }
    else if (G.phase === 'set') s = t('st.set', { n });
    else if (G.busy && G.mode === 'duel') s = t('st.ai');
    else if (G.hint) s = G.hint.one ? t('st.hint1') : t('st.hint', { x: G.hint.x < 10 ? (Math.round(G.hint.x * 10) / 10) : num(Math.round(G.hint.x)) });
    else if (G.mode === 'duel') { const y = G.ai[G.ai.length - 1]; s = y ? t('st.you2', { k: G.ai.length, h: y.h, b: y.b }) : t('st.you'); }
    else s = t('st.solo', { n });
  }
  $('#status').textContent = s; $('#msg').textContent = s;
}
function renderWho() {
  $('#bTitle').textContent = t('mode.' + G.mode);
  let sub = t('diff.' + G.diff);
  if (G.mode === 'duel') sub += ' · AI Lv.' + G.level;
  if (G.mode === 'daily') { sub = G.date; const st = streakNow(); if (st > 0) sub += ' · ' + t('daily.streak', { n: st }); if (S.daily.best) sub += ' · ' + t('daily.best', { n: S.daily.best }); }
  $('#bSub').textContent = sub;
}
function renderEval() {
  const total = E.allCands(G.cfg).length, a = G.cands.length, solved = G.hist.some(x => x.h === G.cfg.n);
  $('#btnAssist').classList.toggle('on', !!S.assist); $('#btnAssist').setAttribute('aria-checked', S.assist ? 'true' : 'false');
  $('#evalCard').classList.toggle('offc', !S.assist);
  $('#evalText').textContent = !S.assist ? t('eval.off') : solved ? t('eval.solved') : t('eval.n', { a: num(a), t: num(total) });
  $('#evalFill').style.width = !S.assist ? '0%' : (solved ? 100 : Math.max(0, Math.min(100, (1 - Math.log(Math.max(1, a)) / Math.log(total)) * 100))) + '%';
}
function renderKifu() {
  const k = $('#kifu'), rows = [];
  G.hist.forEach((x, i) => { rows.push(`<span class="k"><em>${i + 1}</em><i></i>${mini(x.g)}<b>${fbText(x.h, x.b)}</b></span>`); if (G.mode === 'duel' && G.ai[i]) { const y = G.ai[i]; rows.push(`<span class="k"><em></em><i class="s1"></i>${mini(y.g)}<b>${fbText(y.h, y.b)}</b></span>`); } });
  k.innerHTML = rows.length ? rows.join('') : `<div class="empty">${t('kifu.empty')}</div>`;
  k.scrollTop = k.scrollHeight;
}
function renderAi() {
  const on = G.mode === 'duel'; $('#aiCard').classList.toggle('hidden', !on); if (!on) return;
  $('#aiTitle').textContent = t('ai.t', { l: G.level });
  $('#aiCodeLbl').textContent = G.mine ? t('ai.code') : ''; $('#aiCode').innerHTML = G.mine ? G.mine.map(c => `<i class="m">${pegH(c)}</i>`).join('') : '';
  $('#aiRows').innerHTML = G.ai.length ? G.ai.map((x, i) => `<span class="k"><em>${i + 1}</em>${mini(x.g)}<b>${fbText(x.h, x.b)}</b></span>`).join('') : `<div class="empty">${t('ai.empty')}</div>`;
}
function renderReview() {
  const on = G.phase === 'over' && G.hist.length > 0 && !!G.review; $('#reviewCard').classList.toggle('hidden', !on); if (!on) return;
  const f = x => x < 10 ? (Math.round(x * 10) / 10).toFixed(1) : num(Math.round(x));
  $('#reviewRows').innerHTML = G.review.map((r, i) => r ? `<div class="rv"><em>${i + 1}</em><span class="tg${r.ok ? '' : ' bad'}">${t(r.ok ? 'rev.ok' : 'rev.bad')}</span><span class="a">${t('rev.row', { a: num(r.before), b: num(r.after) })}</span><span class="x">${t('rev.exp', { x: f(r.exp), y: f(r.best) })}</span></div>` : '').join('') + (G.reviewDone ? '' : `<div class="wait">${t('rev.wait')}</div>`);
}
function renderButtons() {
  const live = G.phase === 'play';
  $('#btnResign').disabled = !(live && !(G.mode === 'duel' && G.busy));
  $('#btnHint').disabled = !(live && !G.busy);
  $('#btnSound').classList.toggle('off', !S.sound);
}
function applyDesign() { DESIGNS.forEach(d => document.body.classList.toggle('bd-' + d, S.design === d)); }
function render(msg) {
  applyDesign();
  renderBoard(); renderDock(-1); renderWho(); renderStatus(msg); renderEval(); renderAi(); renderKifu(); renderReview(); renderButtons();
}
// the row height: as tall as the frame allows, as wide as the row fits
function fit() {
  if (!G) return; const el = $('#rows'), fr = $('#frame'); if (!el.clientHeight) return;
  const n = G.cfg.n, R = G.cfg.max + 1, W = el.clientWidth - 4, fc = Math.ceil(n / 2);
  const need = rh => { const fs = Math.max(13, rh * .4); return 12 + 24 + n * rh * .84 + (n - 1) * rh * .1 + rh * .22 + fc * (rh * .34 + 3) + 6 + fs * 3.25; };
  let rh = Math.min(el.clientHeight / R - 2, 72);
  while (rh > 16 && need(rh) > W) rh -= .5;
  fr.style.setProperty('--rh', Math.floor(rh * 2) / 2 + 'px');
}
try { new ResizeObserver(fit).observe($('#rows')); } catch (e) { addEventListener('resize', fit); }

let toastT = 0;
function toast(text) { const el = $('#toast'); el.textContent = text; el.className = 'toast on'; clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1300); }
function shake() { const f = $('#frame'); f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake'); }

function showResult() {
  const g = G, duel = g.mode === 'duel', res = g.result, cls = res === 'w' ? 'win' : res === 'l' ? 'lose' : 'draw';
  $('#resultTitle').textContent = duel ? t(res === 'w' ? 'res.dwin' : res === 'l' ? 'res.dlose' : 'res.draw') : t(res === 'w' ? 'res.win' : 'res.lose');
  $('#resultTitle').className = 'result-big ' + cls;
  $('#resultSub').textContent = g.resigned ? t('st.resign') : duel ? t(res === 'w' ? 'st.dwin' : res === 'l' ? 'st.dlose' : 'st.draw') : res === 'w' ? t('st.win', { k: g.hist.length }) : t('st.lose');
  const row = (a, b) => `<div><b>${a}</b><span>${b}</span></div>`;
  let h = '';
  if (duel) {
    const me = g.hist.some(x => x.h === g.cfg.n), ai = g.ai.some(x => x.h === g.cfg.n);
    h += row(t('you'), me ? t('res.solved', { k: g.hist.length }) : t('res.unsolved')) + row(t('res.ai', { l: g.level }), ai ? t('res.solved', { k: g.ai.length }) : t('res.unsolved'));
  } else h += row(t('res.n'), t('res.nv', { k: g.hist.length, m: g.cfg.max }));
  h += row(t('res.code'), mini(g.secret)) + row(t('res.hint'), t(g.assisted ? 'res.hint1' : 'res.hint0'));
  if (g.mode === 'daily') { h += row(t('res.streak'), t('res.days', { n: streakNow() })); if (S.daily.best) h += row(t('res.best'), t('res.times', { n: S.daily.best })); }
  $('#resultRows').innerHTML = h;
  $('#resultOverlay').classList.add('show');
}

// ---------- new-game dialog ----------
const PEGSVG = (x, y, r, col) => `<circle cx="${x}" cy="${y + r * .18}" r="${r}" fill="rgba(0,0,0,.35)"/><circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><ellipse cx="${x - r * .25}" cy="${y - r * .42}" rx="${r * .5}" ry="${r * .28}" fill="rgba(255,255,255,.55)"/>`;
const MODE_ART = {
  solo: `<svg viewBox="0 0 96 64" fill="none"><rect x="10" y="9" width="76" height="18" rx="9" fill="currentColor" opacity=".22"/><path d="M41 18h14M44.5 18v-3a3.5 3.5 0 0 1 7 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="43" y="17" width="10" height="7" rx="1.5" fill="currentColor"/>${PEGSVG(21, 45, 8, '#c9503c')}${PEGSVG(39, 45, 8, '#e2b23c')}${PEGSVG(57, 45, 8, '#4f9a5c')}${PEGSVG(75, 45, 8, '#3f7fc0')}</svg>`,
  duel: `<svg viewBox="0 0 96 64" fill="none">${PEGSVG(14, 20, 7, '#c9503c')}${PEGSVG(30, 20, 7, '#3f7fc0')}${PEGSVG(66, 44, 7, '#e2b23c')}${PEGSVG(82, 44, 7, '#8d5bb5')}<path d="M44 14h30M67 8l7 6-7 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M52 50H22M29 44l-7 6 7 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity=".6"/></svg>`,
  daily: `<svg viewBox="0 0 96 64" fill="none"><rect x="22" y="12" width="52" height="44" rx="7" stroke="currentColor" stroke-width="2.4"/><path d="M22 24h52M35 7v9M61 7v9" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>${PEGSVG(36, 40, 6, '#c9503c')}${PEGSVG(48, 40, 6, '#4f9a5c')}${PEGSVG(60, 40, 6, '#e2b23c')}</svg>`,
};
const THUMB = {
  walnut: { bg: ['#8a5a36', '#4a2b17'], hole: 'rgba(20,8,2,.6)', pegs: ['#c9503c', '#e2b23c', '#4f9a5c', '#3f7fc0'], fh: '#f4d98a', fb: '#f3ece0', extra: '<path d="M0 9q20 3 60 0M0 22q24-4 60 1M0 33q20 3 60-1" stroke="rgba(30,12,2,.35)" stroke-width=".8" fill="none"/>' },
  neon: { bg: ['#1c2550', '#080a1a'], hole: 'rgba(4,6,20,.8)', pegs: ['#ff6b6b', '#ffd75e', '#5fe08a', '#5aa9ff'], fh: '#7df3d2', fb: '#f1f5ff', extra: '<path d="M0 10H60M0 20H60M0 30H60M15 0V40M30 0V40M45 0V40" stroke="rgba(120,160,255,.18)" stroke-width=".5"/>', glow: true },
  paper: { bg: ['#f4ecd9', '#dccfae'], hole: 'rgba(60,48,30,.16)', pegs: ['#b5483a', '#c9962a', '#4d7f52', '#35618f'], fh: '#2f2a22', fb: '#fbf6e9', extra: '<rect x="2.5" y="2.5" width="55" height="35" rx="3" fill="none" stroke="rgba(47,42,34,.4)" stroke-width=".7"/>', flat: true },
  marble: { bg: ['#f3f1ec', '#d2cfc6'], hole: '#b8963f', pegs: ['#b8443f', '#d4a537', '#3f8f6a', '#3b6fb0'], fh: '#8a6410', fb: '#fdfbf4', extra: '<path d="M-2 14q14-8 26 2t38-6M10 42q10-14 30-12t22-10" stroke="rgba(92,97,107,.45)" stroke-width=".7" fill="none"/><rect x="1" y="1" width="58" height="38" rx="4" fill="none" stroke="#c9a552" stroke-width="2"/>' },
};
function thumb(k) {
  const T = THUMB[k]; let p = '';
  T.pegs.forEach((c, i) => { const x = 11 + i * 10.5, y = 20;
    p += `<circle cx="${x}" cy="${y}" r="4.6" fill="${T.hole}"/>` + (T.glow ? `<circle cx="${x}" cy="${y}" r="6" fill="${c}" opacity=".3"/>` : `<circle cx="${x}" cy="${y + .9}" r="4.2" fill="rgba(0,0,0,.35)"/>`) + `<circle cx="${x}" cy="${y}" r="4.2" fill="${c}"/><circle cx="${x}" cy="${y}" r="4.2" fill="url(#tp-${k})"/>` + (T.flat ? '' : `<ellipse cx="${x - 1}" cy="${y - 1.9}" rx="2.1" ry="1.1" fill="rgba(255,255,255,.6)"/>`); });
  const defs = `<radialGradient id="tp-${k}" cx=".34" cy=".28" r=".8"><stop offset="0" stop-color="#fff" stop-opacity="${T.flat ? .22 : .6}"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></radialGradient>`;
  return `<svg viewBox="0 0 60 40"><defs><linearGradient id="th-${k}" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="${T.bg[0]}"/><stop offset="1" stop-color="${T.bg[1]}"/></linearGradient>${defs}</defs><rect width="60" height="40" fill="url(#th-${k})"/>${T.extra}${p}<circle cx="50" cy="18" r="1.6" fill="${T.fh}"/><circle cx="54" cy="18" r="1.6" fill="${T.fb}" stroke="rgba(0,0,0,.3)" stroke-width=".3"/><circle cx="50" cy="22" r="1.6" fill="${T.hole}"/><circle cx="54" cy="22" r="1.6" fill="${T.hole}"/></svg>`;
}
let ND = null;      // the dialog's working copy of mode / difficulty / level (display options apply at once)
const lvlName = lv => `Lv.${lv}<small>${tier(lv)}</small>`;
function ngRender() {
  $('#modeCards').innerHTML = MODES.map(m => `<button type="button" class="ngt-gcard${ND.mode === m ? ' sel' : ''}" data-v="${m}"><span class="gart">${MODE_ART[m]}</span><b>${t('mode.' + m)}</b><p>${t('mode.' + m + '.d')}</p><span class="gpick"></span></button>`).join('');
  const daily = ND.mode === 'daily', d = daily ? 'normal' : ND.diff;
  $$('#segDiff button').forEach(b => { b.classList.toggle('on', b.dataset.v === d); b.disabled = daily; });
  $('#diffNote').textContent = daily ? t('ng.daily') : diffText(d);
  $('#fLevel').classList.toggle('hidden', ND.mode !== 'duel');
  $('#levelRange').value = ND.level; $('#levelName').innerHTML = lvlName(ND.level);
  $$('#segDigits button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === !!S.digits));
  $$('#segAssist button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === !!S.assist));
  $$('#segMarks button').forEach(b => b.classList.toggle('on', (b.dataset.v === '1') === marksOn()));
  $('#bdRow').innerHTML = DESIGNS.map(d => `<button type="button" data-v="${d}" class="${S.design === d ? 'on' : ''}">${thumb(d)}<span>${t('bd.' + d)}</span></button>`).join('');
}
function openNew() { ND = { mode: S.mode, diff: S.diff, level: S.level }; ngRender(); $('#newOverlay').classList.add('show'); }
function unfocus() { try { const a = document.activeElement; if (a && a.closest && a.closest('.overlay')) a.blur(); } catch (e) {} }
function closeNew() { $('#newOverlay').classList.remove('show'); unfocus(); }
const segClick = (sel, fn) => $(sel).addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) { fn(b.dataset.v); ngRender(); } });
$('#modeCards').addEventListener('click', e => { const b = e.target.closest('.ngt-gcard'); if (!b) return; ND.mode = b.dataset.v; ngRender(); });
segClick('#segDiff', v => { ND.diff = v; });
segClick('#segDigits', v => { S.digits = v === '1'; render(); save(); });
segClick('#segAssist', v => { S.assist = v === '1'; renderEval(); save(); });
segClick('#segMarks', v => { S.marks = v === '1'; render(); save(); });
$('#levelRange').addEventListener('input', e => { ND.level = +e.target.value; $('#levelName').innerHTML = lvlName(ND.level); });
$('#bdRow').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.design = b.dataset.v; ngRender(); render(); save(); });
$('#btnCancelNew').onclick = closeNew;
$('#btnStart').onclick = () => { Object.assign(S, ND); closeNew(); startGame(S.mode, S.diff); };
$('#newOverlay').addEventListener('click', e => { if (e.target === $('#newOverlay')) closeNew(); });

// ---------- wiring ----------
$('#palette').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled) place(+b.dataset.c); });
$('#slots').addEventListener('click', e => { const b = e.target.closest('.hb-slot'); if (b) takeAt(+b.dataset.i); });
$('#rows').addEventListener('click', e => { const h = e.target.closest('.hb-row.cur .hole'); if (h) takeAt(+h.dataset.i); });
$('#btnSubmit').onclick = submit;
$('#btnAssist').onclick = () => { S.assist = !S.assist; renderEval(); save(); sfx('place'); };
$('#btnNew').onclick = openNew;
$('#btnHint').onclick = hint;
$('#btnResign').onclick = () => { if (G.phase !== 'play') return; const g = G, go = () => { if (G !== g || g.phase !== 'play') return; g.resigned = true; finish('l'); }; if (window.Resign) Resign.confirm({ lang: LANG }).then(ok => { if (ok) go(); }); else go(); };
$('#btnSound').onclick = () => { S.sound = !S.sound; try { localStorage.setItem('atlas-sfx', S.sound ? '1' : '0'); } catch (e) {} save(); renderButtons(); if (S.sound) sfx('place'); };
$('#btnResClose').onclick = () => { $('#resultOverlay').classList.remove('show'); unfocus(); };
$('#btnAgain').onclick = () => { $('#resultOverlay').classList.remove('show'); unfocus(); if (G.mode === 'daily') openNew(); else startGame(G.mode, G.diff); };
$('#btnRules').onclick = () => window.HitBlowTour && HitBlowTour.open();
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeNew(); $('#resultOverlay').classList.remove('show'); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tg = e.target; if (tg && /^(INPUT|SELECT|TEXTAREA)$/.test(tg.tagName)) return;
  if (document.querySelector('.overlay.show') || [...document.querySelectorAll('.rsg-ov, .grc')].some(el => el.getClientRects().length)) return;
  if (/^[1-8]$/.test(e.key)) { place(+e.key - 1); e.preventDefault(); }
  else if (e.key === 'Backspace' || e.key === 'Delete') { takeLast(); e.preventDefault(); }
  else if (e.key === 'Enter') { if (tg && tg.tagName === 'BUTTON' && !tg.closest('#frame') && !tg.closest('.overlay')) return; submit(); e.preventDefault(); }
});

function applyLang() {
  document.documentElement.lang = LANG;
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $('#ttlName').textContent = t('title');
  document.title = t('title') + ' | ' + t('series');
  if (window.Resign) $('#btnResign span').textContent = Resign.label(LANG);
  if (HB && HB.relabel) HB.relabel();
  if (window.GameRecord && GameRecord.relabel) GameRecord.relabel();
  if (ND) ngRender();
  if (G) render();
  if (window.HitBlowTour) HitBlowTour.relabel();
}
window.HitBlowApp = { lang: () => LANG, t, pegH, fbH, fbText, LOCK, newGame: () => { $('#resultOverlay').classList.remove('show'); openNew(); } };
$('#langSel').value = LANG;
$('#langSel').addEventListener('change', e => { LANG = SUPPORTED.includes(e.target.value) ? e.target.value : 'en'; applyLang(); save(); });

if (window.RulesOffer) RulesOffer.init({ game: 'hitblow', lang: () => LANG, open: () => { closeNew(); window.HitBlowTour && HitBlowTour.open(); }, watch: '#rulesOverlay' });
if (window.GameRecord) GameRecord.init({ game: 'hitblow', lang: () => LANG, menu: '.controls', variant: () => ({ k: G ? G.mode : 'solo', n: t('mode.' + (G ? G.mode : 'solo')) }), variants: () => MODES, variantName: k => t('mode.' + k), defVariant: 'solo' });
const HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnResign', '#btnHint', '#btnRules'], lang: () => LANG }) : null;

if (!restore()) G = make('solo', 'normal');        // first visit: a solo game (ふつう) ready to play, no dialog
applyLang();
fit(); requestAnimationFrame(fit);
if (G.phase === 'over') startReview();
else if (G.mode === 'duel' && G.phase === 'play' && G.hist.length > G.ai.length) aiTurn();     // reloaded between my guess and the AI's
