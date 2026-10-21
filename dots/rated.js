/* learn-ui: レーティング戦 — rated games against the AI with a local Elo rating (kept apart from the online rating).
 * Loaded after the main script and online-ui.js; it wraps a few of the main script's functions instead of editing them.
 * Ratings of the AI levels: see RATING.md.
 *
 * localStorage 'dots-rated-v1' (synced): { r, n, w, l, d, hist: [{ id, t, sz, lv, or, s, d, r, why }] }
 *   r: current rating (start 1000), n: rated games, w/l/d: wins/losses/draws,
 *   hist: last 100 games, oldest first — id: game id, t: time (ms), sz: board size, lv: AI level, or: AI rating,
 *   s: score (1 / 0.5 / 0), d: rating change, r: rating after the game, why: 'end' | 'abandon' | 'resign'
 * localStorage 'dots-rated-cur-v1' (this device only): the rated game on the board { id, n, human, lv, or, my, tag, done? }
 */
(function () {
'use strict';
const RT_STORE = 'dots-rated-v1', RT_CUR = 'dots-rated-cur-v1', RT_START = 1000;
// index = level 1..10. 3×3: Lv6+ play perfectly (measured), 4×4: Lv9–10 perfect, 5×5: provisional (Lv9/10 measured against Lv8 and the previous Lv9/10)
const RT_LV = {
  3: [0, 240, 640, 980, 1150, 1530, 1600, 1600, 1600, 1600, 1600],
  4: [0, 190, 590, 930, 1110, 1470, 1600, 1690, 1850, 1950, 2000],
  5: [0, 200, 600, 940, 1120, 1450, 1560, 1650, 1780, 1970, 2040],
};
const get = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
const put = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function rtLoad() {
  let s = get(RT_STORE, null);
  if (!s || typeof s.r !== 'number' || !isFinite(s.r)) s = { r: RT_START, n: 0, w: 0, l: 0, d: 0, hist: [] };
  if (!Array.isArray(s.hist)) s.hist = [];
  return s;
}
const rtD = d => (d >= 0 ? '+' : '−') + Math.abs(d);
const lvName = lv => `Lv.${lv} ${t('lv')[lv]}`;
let RT = get(RT_CUR, null);
if (RT && !RT.id) RT = null;
// opponent: target = rating + offset (80%: within ±100, 10%: +150..+300 stronger, 10%: −150..−300 weaker) -> nearest level
function rtPick(r, n) {
  { const S0 = rtLoad(); if (Placement.on(S0)) return Placement.pick(S0, (RT_LV[n] || RT_LV[4]).map((x, i) => [i, x]).slice(1)); }
  const T = RT_LV[n] || RT_LV[4], u = Math.random(), v = Math.random();
  const off = u < 0.1 ? 150 + v * 150 : u < 0.2 ? -(150 + v * 150) : (v * 2 - 1) * 100, target = r + off;
  let lv = 1; for (let i = 2; i <= 10; i++) if (Math.abs(T[i] - target) < Math.abs(T[lv] - target)) lv = i;
  const diff = T[lv] - r;
  return { lv, or: T[lv], tag: diff > 150 ? 'up' : diff < -150 ? 'down' : 'even' };
}
function rtGame() { return !!(RT && settings.mode === 'ai' && !lesson && !puzzle && !game.setup && game.n === RT.n && game.human === RT.human); }
function rtLive() { return rtGame() && !RT.done && !(SF && SF.over); }
window.rtGame = rtGame; window.rtLive = rtLive;
// apply a result once (the game id is kept in the history, so a reload never counts it twice)
function rtSettle(s, why) {
  if (!RT) return null;
  if (RT.done) return RT.done;
  const st = rtLoad(), prev = st.hist.find(h => h.id === RT.id);
  if (prev) { RT.done = { old: prev.r - prev.d, now: prev.r, d: prev.d }; put(RT_CUR, RT); return RT.done; }
  const old = st.r, pl = Placement.on(st) ? Placement.record(st, RT.or, s) : null;   // 予備選: the first 3 games set the rating
  const K = st.n < 10 ? 48 : 24, Ex = 1 / (1 + Math.pow(10, (RT.or - old) / 400));
  const now = pl ? pl.r : Math.max(0, Math.round(old + K * (s - Ex)));
  st.r = now; st.n++; if (s === 1) st.w++; else if (s === 0) st.l++; else st.d++;
  st.hist.push({ id: RT.id, t: Date.now(), sz: RT.n, lv: RT.lv, or: RT.or, s, d: now - old, r: now, why, pl: pl ? pl.k : undefined });
  if (st.hist.length > 100) st.hist = st.hist.slice(-100);
  put(RT_STORE, st);
  RT.done = { old, now, d: now - old, pl }; if (pl && pl.final) Placement.reveal(st, ''); put(RT_CUR, RT);
  return RT.done;
}
function rtSettleBoard() {
  if (!rtGame() || RT.done || !SF || !SF.over) return RT && RT.done;
  if (SF.resigned >= 0) return rtSettle(SF.resigned === game.human ? 0 : 1, 'resign');   // 投了
  const me = SF.scores[game.human] - SF.scores[1 - game.human];
  return rtSettle(me > 0 ? 1 : me < 0 ? 0 : 0.5, 'end');
}
function rtForfeit() {
  if (!rtLive()) return null;
  busy++; cancelAI(); cancelAna();
  const x = rtSettle(0, 'abandon');
  if (x) toast(t('rt.abandoned', { o: x.old, n: x.now, d: rtD(x.d) }), 3200);
  return x;
}
let pick = null;   // the opponent shown in the dialog: {n, lv, or, tag}
function rtStart(n) {
  if (Placement.gate(rtLoad(), s => put(RT_STORE, s), () => { pick = null; rtStart(n); })) return;
  const st = rtLoad(), pk = pick && pick.n === n ? pick : Object.assign({ n }, rtPick(st.r, n));
  pick = null;
  settings.mode = 'ai'; settings.size = n;
  const human = Math.random() < 0.5 ? 0 : 1;   // rated: random side
  RT = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), n, human, lv: pk.lv, or: pk.or, my: st.r, tag: pk.tag };
  put(RT_CUR, RT);
  const order = settings.order; settings.order = human;
  _newGame();
  settings.order = order; save();
  toast(t('rt.vs', { lv: lvName(pk.lv), r: pk.or, tag: t('rt.' + pk.tag) }), 4000);
}
function rtStatsHtml(n) {
  const st = rtLoad(), h = st.hist.slice(-10).reverse();
  let html = `<div class="rt-card"><div class="rt-head"><b class="rt-r">R ${st.r}</b>${Placement.on(st) ? Placement.badge(st) : st.n < 10 ? `<span class="rt-prov">${esc(t('rt.prov'))}</span>` : ''}</div>`;
  html += `<div class="rt-rec">${esc(st.n ? t('rt.rec', { n: st.n, w: st.w, l: st.l, d: st.d }) : t('rt.none'))}</div>`;
  html += Placement.note(st);
  const sp = st.hist.slice(-30);
  if (sp.length >= 2) {
    const pts = [sp[0].r - sp[0].d].concat(sp.map(x => x.r)), lo = Math.min(...pts) - 10, hi = Math.max(...pts) + 10, W = 300, H = 40;
    const y = v => (H - 3 - (v - lo) / (hi - lo) * (H - 6)).toFixed(1);
    html += `<svg class="rt-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><line x1="0" x2="${W}" y1="${y(pts[0])}" y2="${y(pts[0])}" vector-effect="non-scaling-stroke"/><polyline vector-effect="non-scaling-stroke" points="${pts.map((v, i) => (i / (pts.length - 1) * W).toFixed(1) + ',' + y(v)).join(' ')}"/></svg>`;
  }
  if (h.length) html += `<div class="rt-lbl2">${esc(t('rt.recent'))}</div><div class="rt-hist">` + h.map(x => { const c = x.s === 1 ? 'w' : x.s === 0 ? 'l' : 'd'; return `<span class="rt-chip ${c}" title="${esc((x.sz ? x.sz + '×' + x.sz + ' · ' : '') + lvName(x.lv) + ' · R' + x.or)}"><i>${esc(t('rt.' + c.toUpperCase()))}</i>${x.sz ? x.sz + '×' + x.sz + ' ' : ''}Lv${x.lv}<b>${rtD(x.d)}</b></span>`; }).join('') + '</div>';
  if (!pick || pick.n !== n) pick = Object.assign({ n }, rtPick(st.r, n));
  html += `<div class="rt-opp">${esc(t('rt.next', { n: n + '×' + n }))} <b>AI ${esc(lvName(pick.lv))}</b> <span class="rt-tag ${pick.tag}">R ${pick.or} · ${esc(t('rt.' + pick.tag))}</span></div>`;
  return html + `</div><p class="rt-desc">${esc(t('rt.desc'))}</p>`;
}

// ---- wrap the main script
const _newGame = newGame, _levelFor = levelFor, _playerName = playerName, _canUndo = canUndo, _renderInfo = renderInfo, _showResult = showResult, _segSync = segSync, _openNew = openNew;
newGame = function () { RT = null; put(RT_CUR, null); return _newGame.apply(this, arguments); };
levelFor = function (pl) { return rtGame() ? RT.lv : _levelFor(pl); };
playerName = function (i) {
  if (!rtGame()) return _playerName(i);
  return i === game.human ? `${t('you')} · R${RT.my}` : `AI ${lvName(RT.lv)} · R${RT.or}`;
};
canUndo = function () { return rtLive() ? false : _canUndo(); };
renderInfo = function () {
  _renderInfo.apply(this, arguments);
  const live = rtLive();
  document.body.classList.toggle('rated-live', live);
  if (rtGame()) {
    $('#infoLine').textContent = `${game.n}×${game.n} · ${t('ng.rated')} · AI ${lvName(RT.lv)} (R ${RT.or})`;
    if (live) { $('#btnHint').disabled = true; $('#btnUndo').disabled = true; $('#btnAnalyze').disabled = true; }
  }
};
showResult = function () {
  _showResult.apply(this, arguments);
  if (!rtGame() || !SF || !SF.over || !$('#resultOverlay').classList.contains('show')) return;
  const x = rtSettleBoard(); if (!x) return;
  const sub = $('#resultSub');
  sub.innerHTML = (SF.resigned >= 0 ? esc(t('ol.youResigned')) + ' · ' : '') + esc(t('res.vs', { name: t('lv')[RT.lv], lv: RT.lv, n: game.n })) + `<br>${x.pl ? Placement.resHtml(x.pl) : `<span class="rt-res">R ${x.old} → <b>${x.now}</b> <span class="${x.d >= 0 ? 'up' : 'down'}">(${rtD(x.d)})</span></span>`}<br><small class="rt-ressub">${esc(t('rt.opp', { lv: lvName(RT.lv), r: RT.or }))}</small>`;
  renderInfo();
};
segSync = function () {
  _segSync.apply(this, arguments);
  const r = draft.mode === 'rated', b = $('#segMode [data-v=rated]');
  if (b) b.classList.toggle('sel', r);
  $('#fRated').classList.toggle('hidden', !r);
  $('#newOverlay .modal').classList.toggle('m-rated', r);
  if (!r) return;
  $('#fSize').classList.remove('hidden'); $('#fDisplay').classList.remove('hidden');
  ['#fOrder', '#fLevel', '#fLevel2', '#fLessonInfo', '#fPuzzleInfo'].forEach(s => $(s).classList.add('hidden'));
  $('#rtBox').innerHTML = rtStatsHtml(draft.size);
  $('#btnStart').textContent = t('rt.start');
};
openNew = function () {
  pick = null;
  _openNew.apply(this, arguments);
  if (rtGame() && !lesson && !puzzle) { draft.mode = 'rated'; segSync(); }
};
// mode button and the rating card in the new-game dialog
$('#segMode [data-v=ai]').insertAdjacentHTML('afterend', '<button data-v="rated" data-i18n="ng.rated"></button>');
$('#segMode [data-v=rated]').textContent = t('ng.rated');
$('#segMode [data-v=rated]').onclick = () => { draft.mode = 'rated'; segSync(); if (window.olSegSync) olSegSync(); };
$('#fLevel2').insertAdjacentHTML('afterend', '<div class="field hidden" id="fRated"><label data-i18n="rt.title"></label><div id="rtBox"></div></div>');
$('#fRated > label').textContent = t('rt.title');
// a new board size: a new opponent suggestion
$('#segSize').addEventListener('click', () => { if (draft.mode === 'rated') { pick = null; segSync(); } });
$('#btnStart').addEventListener('click', e => {
  if (draft.mode !== 'rated') return;
  e.stopImmediatePropagation();
  $('#newOverlay').classList.remove('show'); ac();
  endLesson(true); endPuzzle(true); savedGame = null;
  Object.assign(settings, { anim: draft.anim, eval: draft.eval });
  rtStart(draft.size);
}, true);
// leaving a rated game that is still going asks first (and the game is then lost)
const ov = document.createElement('div');
ov.className = 'overlay'; ov.id = 'rtConfirm';
ov.innerHTML = '<div class="modal" style="width:min(460px,100%)"><p class="rt-q" id="rtConfirmText"></p><div class="modal-actions"><button class="mbtn" id="rtConfirmNo"></button><button class="mbtn go" id="rtConfirmYes"></button></div></div>';
document.body.appendChild(ov);
ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('show'); });
$('#rtConfirmNo').onclick = () => ov.classList.remove('show');
const GUARD = '#btnStart, #btnLesson, #btnPuzzle, #btnPaste, #pasteOk';
let pass = false;
document.addEventListener('click', e => {
  if (pass || !rtLive()) return;
  const b = e.target.closest && e.target.closest(GUARD); if (!b || b.disabled) return;
  e.preventDefault(); e.stopImmediatePropagation();
  $('#rtConfirmText').textContent = t('rt.abandonQ'); $('#rtConfirmNo').textContent = t('close'); $('#rtConfirmYes').textContent = t('rt.abandonYes');
  $('#rtConfirmYes').onclick = () => { ov.classList.remove('show'); rtForfeit(); renderInfo(); pass = true; try { b.click(); } finally { pass = false; } };
  ov.classList.add('show');
}, true);
// language change: labels made here
$('#langSel').addEventListener('change', () => {
  $('#segMode [data-v=rated]').textContent = t('ng.rated'); $('#fRated > label').textContent = t('rt.title');
  if ($('#newOverlay').classList.contains('show')) segSync();
  renderInfo();
});
// boot: a finished rated game not counted yet (reload right at the end) is counted now
if (RT && rtGame() && !RT.done && SF && SF.over) rtSettleBoard();
if (RT && !rtGame() && settings.mode !== 'ai') { RT = null; put(RT_CUR, null); }
renderInfo();
window.rtStatsHtml = rtStatsHtml; window.RT_LV = RT_LV;
})();
