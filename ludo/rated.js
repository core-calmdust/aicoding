/* ludo/rated.js — レート戦（ソロ、AIと：ルドー・2人・標準ルール・待ったなし）。shared/placement.js の予備選つき。
   RT_LV: AIの各レベルのレート（tools/ladder.js：Lv.10 相手の2人ルドー自己対局 1200局からのElo を単調に均したもの。
   運の要素が大きいので段差は小さい）。記録は aicoding-ludo-rated（{ r, n, w, l, d, hist, pl }）。
   Uses the globals of app.js: G, settings, newGame, save, toast, t, $ … */
'use strict';
(function () {
const RT_STORE = STORE + '-rated', RT_START = 1000, LV_MAX = 20;
const RT_LV = [0, 640, 680, 730, 780, 820, 860, 900, 940, 970, 1000, 1030, 1060, 1085, 1105, 1120, 1130, 1140, 1150, 1155, 1160];
const LV = n => 'Lv.' + n;
function load() { let s = null; try { s = JSON.parse(localStorage.getItem(RT_STORE) || 'null'); } catch (e) {} if (!s || typeof s.r !== 'number' || !isFinite(s.r)) s = { r: RT_START, n: 0, w: 0, l: 0, d: 0, hist: [] }; if (!Array.isArray(s.hist)) s.hist = []; return s; }
function store(s) { try { localStorage.setItem(RT_STORE, JSON.stringify(s)); } catch (e) {} }
function rank(r) { let k = 0; for (let i = 1; i <= LV_MAX; i++) if (r >= RT_LV[i] - 5) k = i; return k ? LV(k) : t('rt.below'); }
const sgn = d => (d >= 0 ? '+' : '−') + Math.abs(d);
function pick(r) {
  { const S0 = load(); if (window.Placement && Placement.on(S0)) return Placement.pick(S0, RT_LV.map((x, i) => [i, x]).slice(1)); }
  const u = Math.random(), v = Math.random(), off = u < .1 ? 30 + v * 30 : u < .2 ? -(30 + v * 30) : (v * 2 - 1) * 20, target = r + off;
  let lv = 1; for (let i = 1; i <= LV_MAX; i++) if (Math.abs(RT_LV[i] - target) < Math.abs(RT_LV[lv] - target)) lv = i;
  const diff = RT_LV[lv] - r; return { lv, or: RT_LV[lv], tag: diff > 30 ? 'up' : diff < -30 ? 'down' : 'even' };
}
function start() {
  if (window.Placement && Placement.gate(load(), store, () => start())) return;
  const S = load(), pk = pick(S.r), keep = JSON.parse(JSON.stringify(settings));
  Object.assign(settings, { rule: 'ludo', players: 2, mode: 'ai', level: pk.lv, blocks: false, three: true, first: 'r' });
  newGame({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), lv: pk.lv, or: pk.or, my: S.r, tag: pk.tag });
  Object.assign(settings, keep, { mode: 'rated' }); save();
  toast(t('rt.vs', { lv: LV(pk.lv), r: pk.or, tag: t('rt.' + pk.tag) }), 3600);
}
function settle(won) {
  const R = G && G.rated; if (!R) return null; if (R.done) return R.done;
  const S = load(), prev = S.hist.find(h => h.id === R.id); if (prev) { R.done = { old: prev.r - prev.d, now: prev.r, d: prev.d }; return R.done; }
  const sc = won ? 1 : 0, old = S.r, pl = window.Placement && Placement.on(S) ? Placement.record(S, R.or, sc) : null;
  const K = S.n < 10 ? 24 : 12, Ex = 1 / (1 + Math.pow(10, (R.or - old) / 400));
  const now = pl ? pl.r : Math.max(0, Math.round(old + K * (sc - Ex)));
  S.r = now; S.n++; if (sc) S.w++; else S.l++;
  S.hist.push({ id: R.id, t: Date.now(), lv: R.lv, or: R.or, s: sc, d: now - old, r: now });
  if (S.hist.length > 100) S.hist = S.hist.slice(-100);
  store(S); R.done = { old, now, d: now - old, pl }; if (pl && pl.final) Placement.reveal(S, rank(now)); save();
  setTimeout(() => toast(t('rt.after', { o: old, n: now, d: sgn(now - old) }), 3200), 900);
  return R.done;
}
function statsHtml() {
  const S = load(), h = S.hist.slice(-10).reverse(), e = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let html = `<div class="rt-card"><div class="rt-top"><span class="rt-l">${e(t('rt.title'))}</span><b class="rt-r">R ${S.r}</b><span class="rt-k">${e(rank(S.r))}</span></div>`;
  html += `<div class="rt-n">${S.n ? e(t('rt.rec', { n: S.n, w: S.w, l: S.l })) : e(t('rt.none'))}</div>`;
  if (window.Placement) html += Placement.note(S);
  if (h.length) html += `<div class="rt-h">` + h.map(x => `<span class="${x.s ? 'w' : 'l'}">${sgn(x.d)}</span>`).join('') + `</div>`;
  return html + `<p class="rt-desc">${e(t('rt.desc'))}</p></div>`;
}
function live() { return !!(G && G.rated && !G.state.over && !SP); }
// leaving a rated game in progress asks first (the game is then lost)
const GUARD = '#btnNew, #btnLesson, #btnRules';
let pass = false;
document.addEventListener('click', e => {
  if (pass || !live() || !G.plies.length) return;
  const b = e.target.closest && e.target.closest(GUARD); if (!b || b.disabled) return;
  e.preventDefault(); e.stopImmediatePropagation();
  $('#rtConfirmText').textContent = t('rt.abandonQ'); $('#rtConfirmYes').textContent = t('rt.abandonYes'); $('#rtConfirmNo').textContent = t('close');
  $('#rtConfirm').classList.add('show');
  $('#rtConfirmYes').onclick = () => {
    $('#rtConfirm').classList.remove('show');
    const s = G.state, me = s.team[s.seats.find(x => s.ctrl[x] === 0)]; s.over = true; s.winner = s.seats.map(x => s.team[x]).find(tm => tm !== me);
    G.thr = null; G.resShown = true; token++; busy = false; save(); step();
    pass = true; try { b.click(); } finally { pass = false; }
  };
}, true);
{ const n = document.getElementById('rtConfirmNo'); if (n) n.onclick = () => $('#rtConfirm').classList.remove('show'); }
window.LudoRated = { start, settle, statsHtml, live, rank, RT_LV };
})();
