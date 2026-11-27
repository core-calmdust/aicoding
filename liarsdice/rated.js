/* ライアーダイス — rated games (liarsdice/rated.js)
   Four at the table: you and three computer players of one level picked for your rating. Score = your finishing place
   (1st = 1, 2nd = 2/3, 3rd = 1/3, 4th = 0), Elo against the level's rating. The first 3 games are placement games
   (shared/placement.js). Level ratings: measured with tools/arena.js (claude/liarsdice-spec.md), on the common scale for
   games with a lot of luck (Lv.1 = 400 … Lv.20 = 1900).
   localStorage 'liarsdice-rated-v1': { r, n, w, l, d, hist: [{ id, t, lv, or, s, d, r, why }], pl } */
(function () {
'use strict';
const A = window.LdApp;
const STORE = 'liarsdice-rated-v1', START = 1000, PLAYERS = 4;
// index = level (tools/arena.js, 4 players, Perudo rules; rescaled to 400–1900, see the spec)
const RT_LV = window.LD_RT_LV || [0, 400, 479, 558, 637, 716, 795, 874, 953, 1032, 1111, 1189, 1268, 1347, 1426, 1505, 1584, 1663, 1742, 1821, 1900];
const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const esc = s => A.esc(s), t = (k, v) => A.t(k, v);
function load() { let s = get(STORE, null); if (!s || typeof s.r !== 'number') s = { r: START, n: 0, w: 0, l: 0, d: 0, hist: [] }; if (!Array.isArray(s.hist)) s.hist = []; return s; }
const rtD = d => (d >= 0 ? '+' : '−') + Math.abs(d);
function pick(r) {
  const S0 = load(); if (window.Placement && Placement.on(S0)) { const p = Placement.pick(S0, RT_LV.map((x, i) => [i, x]).slice(1)); return p; }
  const u = Math.random(), v = Math.random(), off = u < .1 ? 150 + v * 150 : u < .2 ? -(150 + v * 150) : (v * 2 - 1) * 100, target = r + off;
  let lv = 1; for (let i = 2; i < RT_LV.length; i++) if (Math.abs(RT_LV[i] - target) < Math.abs(RT_LV[lv] - target)) lv = i;
  const diff = RT_LV[lv] - r;
  return { lv, or: RT_LV[lv], tag: diff > 150 ? 'up' : diff < -150 ? 'down' : 'even' };
}
let nextPick = null;
function start() {
  if (window.Placement && Placement.gate(load(), s => put(STORE, s), () => { nextPick = null; start(); })) return;
  const st = load(), pk = nextPick || pick(st.r); nextPick = null;
  A.newGame({ players: PLAYERS, lvl: pk.lv, mode: 'rated', rules: A.rulesFromSet(), rated: { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), lv: pk.lv, or: pk.or } });
  A.toast(t('rt.vs', { lv: 'Lv.' + pk.lv, r: pk.or }));
}
// apply a result once (score s: 1 … 0 from your place)
function settle(s, why) {
  const M = A.M; if (!M || M.mode !== 'rated' || !M.rated) return null;
  if (M.rated.done) return M.rated.done;
  const st = load(), old = st.r, RT = M.rated;
  const pl = window.Placement && Placement.on(st) ? Placement.record(st, RT.or, s) : null;
  const K = st.n < 10 ? 48 : 24, Ex = 1 / (1 + Math.pow(10, (RT.or - old) / 400));
  const now = pl ? pl.r : Math.max(0, Math.round(old + K * (s - Ex)));
  st.r = now; st.n++; if (s >= .99) st.w++; else if (s <= .01) st.l++; else st.d++;
  st.hist.push({ id: RT.id, t: Date.now(), lv: RT.lv, or: RT.or, s, d: now - old, r: now, why });
  if (st.hist.length > 100) st.hist = st.hist.slice(-100);
  put(STORE, st);
  RT.done = { old, now, d: now - old, pl, s };
  if (pl && pl.final && window.Placement) Placement.reveal(st, '');
  A.persist();
  return RT.done;
}
function forfeitIfLive() { const M = A.M; if (M && M.mode === 'rated' && !M.over && M.G && M.G.rounds.length && !(M.rated && M.rated.done)) { const x = settle(0, 'abandon'); if (x) A.toast(t('rt.abandoned', { o: x.old, n: x.now, d: rtD(x.d) })); } }
function resHtml(x) {
  if (x.pl && window.Placement) return Placement.resHtml(x.pl);
  return `<span class="rt-res">R ${x.old} → <b>${x.now}</b> <span class="${x.d >= 0 ? 'up' : 'down'}">(${rtD(x.d)})</span></span>`;
}
function cardHtml() {
  const st = load(), h = st.hist.slice(-8).reverse();
  let html = `<div class="rt-card"><div class="rt-head"><b class="rt-r"><small>R</small> ${st.r}</b>${window.Placement && Placement.on(st) ? Placement.badge(st) : st.n < 10 && st.n ? `<span class="rt-prov">${esc(t('rt.prov'))}</span>` : ''}</div>`;
  html += `<div class="rt-rec">${esc(st.n ? t('rt.rec', { n: st.n }) : t('rt.none'))}</div>`;
  if (window.Placement) html += Placement.note(st);
  if (h.length) html += `<div class="rt-hist">` + h.map(x => `<span class="rt-chip ${x.s >= .99 ? 'w' : x.s <= .01 ? 'l' : 'd'}" title="Lv.${x.lv} · R${x.or}">Lv${x.lv}<b>${rtD(x.d)}</b></span>`).join('') + `</div>`;
  return html + `</div><p class="diff-desc">${esc(t('rt.desc'))}</p><button type="button" class="sbtn" id="rtGo">${esc(t('rt.play'))}</button>`;
}
function ngHtml() {
  const st = load(); if (!nextPick) nextPick = pick(st.r);
  return `<div class="rt-ng"><div class="rt-head"><b class="rt-r"><small>R</small> ${st.r}</b>${window.Placement && Placement.on(st) ? Placement.badge(st) : ''}</div><p>${esc(t('rt.ng', { lv: 'Lv.' + nextPick.lv, r: nextPick.or }))}</p><small>${esc(t('rt.desc'))}</small></div>`;
}
function wire() { const b = document.getElementById('rtGo'); if (b) b.onclick = () => { const go = () => start(); const M = A.M; if (M && !M.over && M.G && M.G.rounds.length) A.confirmBox(t('ng.abandonQ'), go); else go(); }; }
if (window.Placement && Placement.setLang) Placement.setLang(() => A.LANG);
window.LdRated = { start, settle, forfeitIfLive, resHtml, cardHtml, ngHtml, wire, RT_LV, load };
A.render();
})();
