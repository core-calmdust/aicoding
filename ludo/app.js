/* =====================================================================
   Ludo & Pachisi — the page (2D board, AI, 2–4 players).  Engine: engine.js (LudoEngine), drawing: board2d.js (LudoBoard2D).
   Flow: each turn the seat to move throws (a human taps 振る / 投げる, or it throws itself), the legal moves glow, the piece
   is tapped (pachisi graces also offer a single step: tap the destination), it walks square by square, captures fly home.
   ===================================================================== */
'use strict';
const E = window.LudoEngine, B = window.LudoBoard2D;
const $ = s => document.querySelector(s);
const STORE = 'aicoding-ludo';
const SUPPORTED = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
function detectLang() { const n = (navigator.language || 'ja').toLowerCase(); if (n.startsWith('zh')) return /^zh-(tw|hk|mo|hant)/.test(n) ? 'zh-TW' : 'zh'; return SUPPORTED.find(c => n.startsWith(c)) || 'en'; }
let LANG = detectLang();
try { const g = localStorage.getItem('aicoding-lang'); if (SUPPORTED.includes(g)) LANG = g; } catch (e) {}
{ const q = new URLSearchParams(location.search).get('lang'); if (SUPPORTED.includes(q)) LANG = q; }
const t = (k, v) => { let s = (I18N[LANG] && I18N[LANG][k]) ?? I18N.en[k] ?? k; if (v) s = s.replace(/\{(\w+)\}/g, (_, x) => v[x] !== undefined ? v[x] : ''); return s; };

/* ---------- settings & saved game ---------- */
const DEF = { rule: 'ludo', mode: 'ai', players: 4, first: '0', level: 8, speed: 2, autoRoll: false, autoPick: true, blocks: false, three: true, design: { ludo: 'classic', pachisi: 'classic' }, sound: true };
let saved = {}; try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) {}
const settings = Object.assign({}, DEF, saved.settings || {}); settings.design = Object.assign({}, DEF.design, (saved.settings || {}).design || {});
let G = null, SP = null, SP_commit = null;   // SP: a lesson / puzzle on the board (app-learn.js)   // { opts, mode, level, state, thr (current throw or null), log: [], hist: [] }
function save() { if (SP) return; try { localStorage.setItem(STORE, JSON.stringify({ settings, game: G && { opts: G.opts, mode: G.mode, level: G.level, state: G.state, thr: G.thr, log: G.log.slice(-400), hist: G.hist.slice(-60) } })); } catch (e) {} }

/* ---------- sound ---------- */
let AC = null; const ac = () => { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; } };
function tone(f, d = .07, type = 'triangle', vol = .06) { if (!settings.sound) return; const C = ac(); if (!C) return; const o = C.createOscillator(), g = C.createGain(), t0 = C.currentTime; o.type = type; o.frequency.setValueAtTime(f, t0); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.001, t0 + d); o.connect(g).connect(C.destination); o.start(t0); o.stop(t0 + d + .02); }
const sTick = () => tone(660 + Math.random() * 60, .05, 'triangle', .05);
function sRattle() { for (let i = 0; i < 5; i++) setTimeout(() => tone(300 + Math.random() * 500, .04, 'square', .025), i * 55); }
const sCap = () => { tone(220, .18, 'sawtooth', .05); setTimeout(() => tone(160, .2, 'sawtooth', .04), 90); };
const sHome = () => [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, .25, 'triangle', .06), i * 90));

/* ---------- names ---------- */
const colName = seat => t('c.' + G.state.rule + '.' + seat);
const seatColor = seat => B.COL[G.state.rule][seat][0];
function humanSeat(seat) { if (!G) return false; if (G.mode === 'pvp') return true; if (G.mode === 'watch') return false; return G.state.ctrl[seat] === 0; }
function seatName(seat) {
  const c = G.state.ctrl[seat];
  if (G.mode === 'pvp') return t('p.player', { n: c + 1 });
  if (G.mode === 'ai' && c === 0) return t('p.you');
  return t('p.ai', { n: G.level });
}
const isPachisi = () => G && G.state.rule === 'pachisi';

/* ---------- board drawing ---------- */
const svg = $('#bsvg'); let geo = null, gPcs = null, gMarks = null;
function drawBoard() {
  const rule = G.state.rule, d = B.drawBoard(rule, settings.design[rule]); geo = B.geometry(rule);
  svg.setAttribute('viewBox', `-0.4 -0.4 ${d.n + .8} ${d.n + .8}`);
  svg.innerHTML = d.svg + '<g id="gMarks"></g><g id="gPcs"></g>';
  gPcs = svg.querySelector('#gPcs'); gMarks = svg.querySelector('#gMarks');
  pcEls = {};
  for (const seat of G.state.seats) for (let k = 0; k < 4; k++) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'pc'); g.dataset.s = seat; g.dataset.k = k;
    g.innerHTML = B.pieceSVG(rule, seat) + '<text class="cnt" text-anchor="middle" x=".26" y="-.2"></text>';
    gPcs.appendChild(g); pcEls[seat + ',' + k] = g;
  }
  placeAll();
}
let pcEls = {};
function homeXY(seat, k, p) { return p < 0 ? geo.yard(seat, k) : p >= E.lastOf(G.state) ? geo.home(seat, k) : geo.cellXY(seat, p); }
function placeAll(skip) {
  const s = G.state, groups = {};
  for (const seat of s.seats) s.pos[seat].forEach((p, k) => {
    const key = p < 0 || p >= E.lastOf(s) ? 'y' + seat + k : String(E.cellOf(s.rule, seat, p));
    (groups[key] = groups[key] || []).push([seat, k, p]);
  });
  const sc = s.rule === 'pachisi' ? .95 : 1;
  for (const key in groups) {
    const L = groups[key], n = L.length;
    L.forEach(([seat, k, p], i) => {
      const el = pcEls[seat + ',' + k]; if (!el || (skip && skip.has(seat + ',' + k))) return;
      let [x, y] = homeXY(seat, k, p); let z = sc;
      if (n > 1) { const a = i / n * Math.PI * 2 - Math.PI / 2, r = .16; x += Math.cos(a) * r; y += Math.sin(a) * r; z = sc * .78; }
      if (p >= E.lastOf(s)) z = sc * (s.rule === 'pachisi' ? .62 : .55);
      el.setAttribute('transform', `translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${z})`);
      el.dataset.x = x; el.dataset.y = y; el.dataset.z = z;
      el.querySelector('.cnt').textContent = '';
      gPcs.appendChild(el);   // later on top
    });
  }
}
function clearMarks() { if (gMarks) gMarks.innerHTML = ''; Object.values(pcEls).forEach(el => el.classList.remove('can', 'hint')); }

/* ---------- animation ---------- */
const SPD = () => [0, 1.6, 1, .55][settings.speed] || 1;
const wait = ms => new Promise(r => setTimeout(r, ms * SPD()));
function tween(el, path, stepMs, done) {
  // path: [[x, y], …] (first = current place); one hop per step
  const z = +el.dataset.z || 1; let i = 0;
  const hop = () => {
    if (i >= path.length - 1) { done && done(); return; }
    const [x0, y0] = path[i], [x1, y1] = path[i + 1], t0 = performance.now(), dur = stepMs;
    (function f(now) {
      const k = Math.min(1, (now - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e - Math.sin(k * Math.PI) * .35;
      el.setAttribute('transform', `translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${z})`);
      if (k < 1) requestAnimationFrame(f); else { sTick(); i++; hop(); }
    })(t0);
  };
  hop();
}
function animateMove(s, m) {
  return new Promise(res => {
    if (!m || m.pass) return res();
    const seat = s.turn, el = pcEls[seat + ',' + m.k];
    const pts = [[+el.dataset.x, +el.dataset.y]];
    if (m.enter) pts.push(geo.cellXY(seat, 0));
    else for (let p = m.from + 1; p <= m.to; p++) pts.push(p >= E.lastOf(s) ? geo.home(seat, m.k) : geo.cellXY(seat, p));
    gPcs.appendChild(el);
    const step = Math.max(60, (m.to - (m.from < 0 ? 0 : m.from) > 12 ? 65 : 100) * SPD());
    tween(el, pts, step, res);
  });
}
function animateCaptures(s, caps) {
  return Promise.all((caps || []).map(c => new Promise(res => {
    const el = pcEls[c.seat + ',' + c.k], [x1, y1] = geo.yard(c.seat, c.k), x0 = +el.dataset.x, y0 = +el.dataset.y, t0 = performance.now(), dur = 520 * SPD(), z = +el.dataset.z || 1;
    (function f(now) { const k = Math.min(1, (now - t0) / dur); el.setAttribute('transform', `translate(${x0 + (x1 - x0) * k} ${y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 1.4}) scale(${z}) rotate(${k * 360})`); if (k < 1) requestAnimationFrame(f); else res(); })(t0);
  })));
}

/* ---------- the throw panel ---------- */
function showThrow(thr, rolling) {
  const el = $('#shown'), rule = G.state.rule;
  el.className = 'shown' + (rule === 'pachisi' ? ' cw' : '') + (rolling ? ' roll' : '');
  if (!thr) { el.innerHTML = rule === 'pachisi' ? B.cowriesSVG(null, 3) : B.dieSVG(6, '#efe8d8'); el.style.opacity = .35; $('#tval').textContent = '—'; $('#tsub').textContent = ''; return; }
  el.style.opacity = 1;
  el.innerHTML = rule === 'pachisi' ? B.cowriesSVG(thr.shells, (G.state.ply + 7) * 31) : B.dieSVG(thr.v);
  $('#tval').textContent = thr.v;
  $('#tsub').textContent = rule === 'pachisi' ? t('throw.cowrie', { u: thr.face, v: thr.v }) + (thr.grace ? ' ・ ' + t('st.grace') : '') : (thr.again ? t('st.again') : '');
}
function toast(msg, ms = 1100) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), ms); }

/* ---------- players & status ---------- */
function renderPlayers() {
  const s = G.state, LAST = E.lastOf(s);
  $('#players').innerHTML = s.seats.map(seat => {
    const home = s.pos[seat].filter(p => p >= LAST).length;
    const team = s.rule === 'pachisi' ? `<span class="tm">${t('p.team')} ${s.team[seat] ? 'B' : 'A'}</span>` : '';
    return `<div class="seat${seat === s.turn && !s.over ? ' on' : ''}"><span class="dot" style="background:${seatColor(seat)}"></span><div style="min-width:0"><div class="nm">${seatName(seat)}${team}</div><div class="sb">${colName(seat)}</div></div><span class="hm">${t('p.home', { n: home, m: 4 })}</span></div>`;
  }).join('');
}
function setStatus(s) { $('#status').textContent = s || ''; }
function renderKifu() {
  const k = $('#kifu'); if (!G.log.length) { k.textContent = t('kifu.empty'); return; }
  k.innerHTML = G.log.slice(-60).map(e => `<span class="k"><i style="background:${B.COL[G.state.rule][e.seat][0]}"></i>${e.v}: ${e.txt}</span>`).join('');
  k.scrollTop = k.scrollHeight;
}
function rollLabel() { $('#btnRoll').textContent = t(isPachisi() ? 'btn.throw' : 'btn.roll'); }

/* ---------- game flow ---------- */
let busy = false, token = 0, moves = [], selK = -1;
function newGame(fromDialog) {
  if (SP && window.LudoLearn) LudoLearn.quit();
  const players = settings.rule === 'pachisi' && settings.players === 3 ? 4 : settings.players;
  const opts = { rule: settings.rule, players, blocks: settings.blocks, threeSixes: settings.three };
  let st = E.newGame(opts);
  if (settings.first === 'r' || settings.mode === 'watch') st.turn = st.seats[Math.floor(Math.random() * st.seats.length)];
  G = { opts, mode: settings.mode, level: settings.level, state: st, thr: null, log: [], hist: [] };
  token++; busy = false; moves = []; selK = -1;
  drawBoard(); rollLabel(); showThrow(null); renderPlayers(); renderKifu(); save();
  $('#resultOverlay').classList.remove('show');
  step();
}
function step() {
  if (SP) return;
  const my = ++token;
  clearMarks(); renderPlayers(); $('#btnPass').classList.add('hidden');
  const s = G.state;
  if (s.over) { setStatus(''); $('#btnRoll').disabled = true; showResult(); return; }
  const seat = s.turn, human = humanSeat(seat);
  if (G.thr) { afterThrow(my); return; }
  $('#btnRoll').disabled = !human;
  if (human) {
    setStatus(G.mode === 'pvp' ? t('st.turn', { p: seatName(seat) + '（' + colName(seat) + '）' }) + ' — ' + t(isPachisi() ? 'st.throwv' : 'st.rollv') : t('st.yourRoll', { b: t(isPachisi() ? 'st.throwv' : 'st.rollv') }));
    if (settings.autoRoll) setTimeout(() => { if (my === token) doRoll(); }, 350 * SPD());
  } else {
    setStatus(t('st.think', { p: seatName(seat) + '（' + colName(seat) + '）' }));
    setTimeout(() => { if (my === token) doRoll(); }, 260 * SPD());
  }
}
function doRoll() {
  if (busy || !G || G.state.over || G.thr) return;
  const my = ++token; busy = true;
  $('#btnRoll').disabled = true; sRattle();
  let n = 0; const iv = setInterval(() => { showThrow(E.rollThrow(G.state.rule), true); if (++n >= 5) clearInterval(iv); }, 70);
  setTimeout(() => {
    clearInterval(iv); if (my !== token || !G) return;
    G.thr = E.rollThrow(G.state.rule); showThrow(G.thr); save(); busy = false;
    afterThrow(my);
  }, 340 * Math.max(.6, SPD()));
}
function afterThrow(my) {
  const s = G.state, thr = G.thr, seat = s.turn;
  showThrow(thr); token = my = ++token;
  moves = E.legalMoves(s, thr);
  const real = moves.filter(m => !m.pass);
  if (!real.length) {   // forced pass (or three sixes)
    const m = moves[0] || { pass: true };
    setStatus(m.forfeit ? t('st.three') : t('st.nomove')); toast(m.forfeit ? t('st.three') : t('st.nomove'), 900);
    setTimeout(() => { if (my === token) commit(m); }, 900 * SPD());
    return;
  }
  if (humanSeat(seat)) {
    const ks = [...new Set(real.map(m => m.k))];
    if (settings.autoPick && real.length === 1 && !moves.some(m => m.pass)) { setTimeout(() => { if (my === token) commit(real[0]); }, 260 * SPD()); return; }
    ks.forEach(k => pcEls[seat + ',' + k].classList.add('can'));
    $('#btnPass').classList.toggle('hidden', !moves.some(m => m.pass));
    setStatus(t('st.pick', { v: thr.v }));
  } else {
    const r = E.think(s, thr, G.level);
    setTimeout(() => { if (my === token) commit(r.move); }, 240 * SPD());
  }
}
async function commit(m) {
  if (SP) { SP_commit(m); return; }
  if (busy) return; busy = true; const my = ++token;
  clearMarks(); $('#btnPass').classList.add('hidden');
  const g0 = G, s0 = G.state, thr = G.thr, seat = s0.turn;
  if (humanSeat(seat) && G.mode === 'ai') G.hist.push({ state: s0, thr, log: G.log.length });
  await animateMove(s0, m);
  if (G !== g0) return;   // a new game started meanwhile
  if (m && m.cap && m.cap.length) { sCap(); toast(t('st.cap')); await animateCaptures(s0, m.cap); }
  if (G !== g0) return;
  const r = E.apply(s0, m, thr);
  G.state = r.state; G.thr = null;
  G.log.push({ seat, v: thr.v, txt: m && m.pass ? (m.forfeit ? '6×3' : t('st.pass')) : E.moveText(s0, m, thr) + (m.one ? '¹' : '') });
  placeAll(); renderKifu(); renderPlayers();
  if (m && m.home) { sHome(); toast(t('st.home')); }
  else if (r.again && !G.state.over) toast(thr.grace && isPachisi() ? t('st.grace') : t('st.again'), 800);
  save(); busy = false;
  if (my !== token) return;
  setTimeout(() => { if (my === token) step(); }, (r.again ? 300 : 170) * SPD());
}
function pickPiece(seat, k) {
  if (busy || !G || G.state.over || !G.thr || G.state.turn !== seat || !humanSeat(seat)) return;
  const ms = moves.filter(m => !m.pass && m.k === k); if (!ms.length) return;
  if (ms.length === 1) { commit(ms[0]); return; }
  // pachisi grace: the full throw or a single step — tap the destination
  selK = k; gMarks.innerHTML = '';
  ms.forEach((m, i) => { const [x, y] = m.to >= E.lastOf(G.state) ? geo.home(seat, k) : geo.cellXY(seat, m.to); gMarks.insertAdjacentHTML('beforeend', `<g class="dest" data-i="${moves.indexOf(m)}"><circle cx="${x}" cy="${y}" r=".38" fill="${seatColor(seat)}" opacity=".85" stroke="#fff" stroke-width=".06"/><text x="${x}" y="${y + .14}" text-anchor="middle" style="font:700 .38px var(--font);fill:#fff">${m.to - m.from}</text></g>`); });
}
svg.addEventListener('click', e => {
  const d = e.target.closest('.dest'); if (d) { commit(moves[+d.dataset.i]); return; }
  const g = e.target.closest('.pc'); if (g) pickPiece(+g.dataset.s, +g.dataset.k);
});
$('#btnRoll').onclick = () => { if (G && humanSeat(G.state.turn)) doRoll(); };
$('#btnPass').onclick = () => { const m = moves.find(x => x.pass); if (m && !busy) commit(m); };
document.addEventListener('keydown', e => { if (e.target.closest && e.target.closest('input,select,textarea')) return; if ((e.key === ' ' || e.key === 'Enter') && !$('.overlay.show') && G && humanSeat(G.state.turn) && !G.thr) { e.preventDefault(); doRoll(); } });

/* ---------- undo / hint / resign ---------- */
$('#btnUndo').onclick = () => {
  if (!G || busy || G.mode !== 'ai' || !G.hist.length) { toast(t('undo.none')); return; }
  const h = G.hist.pop(); G.state = h.state; G.thr = h.thr; G.log.length = h.log; G.state.over = false; G.state.winner = -1;
  token++; busy = false; placeAll(); renderKifu(); save(); step();
};
$('#btnHint').onclick = () => {
  if (!G || !G.thr || !humanSeat(G.state.turn) || busy) { toast(t('hint.wait')); return; }
  const r = E.think(G.state, G.thr, 20, () => .5);
  if (!r.move || r.move.pass) { toast(t('hint.pass')); return; }
  pcEls[G.state.turn + ',' + r.move.k].classList.add('hint'); toast(t('hint.best'));
};
$('#btnResign').onclick = () => {
  if (!G || G.state.over || G.mode !== 'ai') return;
  const go = () => { const s = G.state, me = s.team[s.seats.find(x => s.ctrl[x] === 0)]; s.over = true; s.winner = s.seats.map(x => s.team[x]).find(tm => tm !== me); G.thr = null; token++; busy = false; save(); step(); };
  if (window.Resign) Resign.confirm({ lang: LANG }).then(ok => { if (ok) go(); }); else go();
};

/* ---------- result ---------- */
function showResult() {
  const s = G.state, winSeats = s.seats.filter(x => s.team[x] === s.winner);
  const meWon = G.mode === 'ai' && winSeats.some(x => s.ctrl[x] === 0);
  $('#resultDots').innerHTML = winSeats.map(x => `<i style="background:${seatColor(x)}"></i>`).join('');
  $('#resultTitle').textContent = meWon ? t('res.win') : t('res.lose', { p: winSeats.map(x => (G.mode === 'ai' ? seatName(x) + '（' + colName(x) + '）' : colName(x))).filter((v, i, a) => a.indexOf(v) === i).join('・') });
  $('#resultSub').textContent = t('res.sub', { n: G.log.length });
  if (meWon) sHome();
  setTimeout(() => $('#resultOverlay').classList.add('show'), 500);
}
$('#btnResClose').onclick = () => $('#resultOverlay').classList.remove('show');
$('#btnAgain').onclick = () => { $('#resultOverlay').classList.remove('show'); newGame(); };

/* ---------- new game dialog ---------- */
let draft = null;
function miniArt(rule, dz) { const d = B.drawBoard(rule, dz || 'classic'); return `<svg viewBox="-0.3 -0.3 ${d.n + .6} ${d.n + .6}">${d.svg}</svg>`; }
function renderDialog() {
  const D = draft;
  $('#ruleCards').innerHTML = ['ludo', 'pachisi'].map(r => `<button type="button" class="ngt-gcard${D.rule === r ? ' sel' : ''}" data-v="${r}"><span class="gart">${miniArt(r, D.design[r])}</span><b>${t('rule.' + r)}</b><p>${t('rule.' + r + '.d')}</p></button>`).join('');
  const seg = (id, v) => document.querySelectorAll(id + ' button').forEach(b => b.classList.toggle('on', b.dataset.v === String(v)));
  seg('#segMode', D.mode); seg('#segPlayers', D.rule === 'pachisi' && D.players === 3 ? 4 : D.players); seg('#segFirst', D.first); seg('#segSpeed', D.speed);
  document.querySelectorAll('#segPlayers button').forEach(b => { b.textContent = t('ng.pl', { n: b.dataset.v }); b.disabled = D.rule === 'pachisi' && b.dataset.v === '3'; });
  $('#fLevel').classList.toggle('hidden', D.mode === 'pvp');
  $('#fFirst').classList.toggle('hidden', D.mode === 'watch');
  $('#fOpts').classList.toggle('hidden', D.rule !== 'ludo');
  $('#levelRange').value = D.level; $('#levelName').textContent = 'Lv.' + D.level;
  $('#optBlocks').checked = D.blocks; $('#optThree').checked = D.three; $('#optAutoRoll').checked = D.autoRoll; $('#optAutoPick').checked = D.autoPick;
  $('#bdRow').innerHTML = ['classic', 'wood'].map(k => `<button type="button" data-v="${k}" class="${D.design[D.rule] === k ? 'on' : ''}">${miniArt(D.rule, k)}<span>${t('bd.' + k)}</span></button>`).join('');
}
function openNew() { draft = JSON.parse(JSON.stringify(settings)); renderDialog(); $('#newOverlay').classList.add('show'); }
$('#btnNew').onclick = openNew;
$('#ruleCards').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; draft.rule = b.dataset.v; if (draft.rule === 'pachisi' && draft.players === 3) draft.players = 4; renderDialog(); };
const segClick = (id, key, num) => { $(id).onclick = e => { const b = e.target.closest('button[data-v]'); if (!b || b.disabled) return; draft[key] = num ? +b.dataset.v : b.dataset.v; renderDialog(); }; };
segClick('#segMode', 'mode'); segClick('#segPlayers', 'players', true); segClick('#segFirst', 'first'); segClick('#segSpeed', 'speed', true);
$('#levelRange').oninput = e => { draft.level = +e.target.value; $('#levelName').textContent = 'Lv.' + draft.level; };
['Blocks:blocks', 'Three:three', 'AutoRoll:autoRoll', 'AutoPick:autoPick'].forEach(x => { const [id, k] = x.split(':'); $('#opt' + id).onchange = e => { draft[k] = e.target.checked; }; });
// design: applied at once (common rule) — even if the dialog is then closed
$('#bdRow').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; draft.design[draft.rule] = b.dataset.v; settings.design[draft.rule] = b.dataset.v; save(); if (G && G.state.rule === draft.rule) { drawBoard(); step(); } renderDialog(); };
$('#btnCancelNew').onclick = () => $('#newOverlay').classList.remove('show');
$('#btnStart').onclick = () => { Object.assign(settings, draft); $('#newOverlay').classList.remove('show'); save(); newGame(true); };
document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.remove('show'); }));

/* ---------- language, sound ---------- */
function applyI18n() {
  document.documentElement.lang = LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.title = t('meta.title');
  if (window.Resign) $('#btnResign span').textContent = Resign.label(LANG);
  $('#langSel').value = LANG;
  if (G) { rollLabel(); renderPlayers(); renderKifu(); showThrow(G.thr); }
}
$('#langSel').onchange = e => { LANG = e.target.value; try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {} applyI18n(); if (G) step(); if ($('#newOverlay').classList.contains('show')) renderDialog(); if (HB) HB.relabel(); };
const paintSnd = () => $('#btnSound').classList.toggle('off', !settings.sound);
$('#btnSound').onclick = () => { settings.sound = !settings.sound; paintSnd(); save(); };

/* ---------- start ---------- */
const HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnResign', '#btnHint', '#btnRules', '#btnLesson', '#btnPuzzle'], lang: () => LANG }) : null;
applyI18n(); paintSnd();
if (saved.game && saved.game.state && saved.game.state.pos) {
  G = { opts: saved.game.opts, mode: saved.game.mode, level: saved.game.level, state: saved.game.state, thr: saved.game.thr, log: saved.game.log || [], hist: saved.game.hist || [] };
  drawBoard(); rollLabel(); showThrow(G.thr); renderKifu();
  if (G.state.over) { renderPlayers(); setStatus(''); $('#btnRoll').disabled = true; } else step();
} else newGame();
window.__ludo = { get G() { return G; }, settings, newGame, doRoll, commit, get moves() { return moves; }, get busy() { return busy; } };
