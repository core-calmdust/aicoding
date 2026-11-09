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
let G = null, SP = null, SP_commit = null, VIEW = null;   // VIEW: a past position on view (the move navigation, review.js)   // SP: a lesson / puzzle on the board (app-learn.js)   // { opts, mode, level, state, thr (current throw or null), log: [], hist: [] }
function save() { if (SP) return; try { localStorage.setItem(STORE, JSON.stringify({ settings, game: G && { opts: G.opts, mode: G.mode, level: G.level, state: G.state, thr: G.thr, log: G.log, hist: G.hist.slice(-60), plies: (G.plies || []).slice(-700), id: G.id, rated: G.rated || null, resShown: !!G.resShown, recorded: !!G.recorded } })); } catch (e) {} }

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
  if (typeof paintTitle === 'function') paintTitle();
  const rule = G.state.rule, d = B.drawBoard(rule, settings.design[rule]); geo = B.geometry(rule);
  svg.setAttribute('viewBox', `-0.4 -0.4 ${d.n + .8} ${d.n + .8}`); Z2.cur = null; Z2.pts = null; $('#frame').classList.remove('zoomed');
  svg.innerHTML = d.svg + '<g id="gMarks"></g><g id="gPrev"></g><g id="gPcs"></g><g id="gCup"></g>';
  gPcs = svg.querySelector('#gPcs'); gMarks = svg.querySelector('#gMarks');
  pcEls = {};
  for (const seat of G.state.seats) for (let k = 0; k < 4; k++) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'pc'); g.dataset.s = seat; g.dataset.k = k;
    g.innerHTML = B.pieceSVG(rule, seat) + '<text class="cnt" text-anchor="middle" x=".26" y="-.2"></text>';
    gPcs.appendChild(g); pcEls[seat + ',' + k] = g;
  }
  placeAll(); cupRedraw();
}
let pcEls = {};

/* ---------- the dice cup (ludo): it stands in the yard of the seat to throw; tap it (or 振る) — it shakes, lifts, and the dice lie
   under it. The dice stay there until the next seat's turn, when the cup goes to that yard. Pachisi throws cowries (no cup). ---------- */
const CUP = { seat: -1 };
function cupSpot(seat) { const Y0 = [[0, 9], [0, 0], [9, 0], [9, 9]][seat]; return [Y0[0] + 3, Y0[1] + 3]; }
// (2026-11-09 v3) a black leather cup lined with red felt: a rolled rim with a stitch line, a stitched band at the base
const cupBody = col => `<g class="cupb"><ellipse cx="0" cy=".5" rx=".6" ry=".2" fill="rgba(0,0,0,.35)"/><path d="M-.5 .42L-.4 -.42Q0 -.56 .4 -.42L.5 .42Q0 .6 -.5 .42Z" fill="url(#cupG)" stroke="#000" stroke-width=".03"/><path d="M-.42 -.27Q0 -.13 .42 -.27L.4 -.42Q0 -.28 -.4 -.42Z" fill="#1d1d21"/><path d="M-.415 -.3Q0 -.16 .415 -.3" stroke="#6b6b72" stroke-width=".018" stroke-dasharray=".05 .035" fill="none"/><path d="M-.485 .3Q0 .47 .485 .3" stroke="#6b6b72" stroke-width=".018" stroke-dasharray=".05 .035" fill="none"/><path d="M-.5 .42Q0 .6 .5 .42" stroke="#26262b" stroke-width=".07" fill="none" stroke-linecap="round"/><ellipse cx="0" cy="-.43" rx=".4" ry=".12" fill="#26262b" stroke="#000" stroke-width=".025"/><path d="M-.3 -.2L-.36 .28" stroke="rgba(255,255,255,.16)" stroke-width=".07" stroke-linecap="round"/></g>`;
// mouth up (waiting / shaking): narrow at the foot, the open mouth an ellipse at the top with the dark inside
const cupUp = col => `<g class="cupb"><ellipse cx="0" cy=".5" rx=".55" ry=".18" fill="rgba(0,0,0,.35)"/><path d="M-.4 .44L-.5 -.38Q0 -.24 .5 -.38L.4 .44Q0 .58 -.4 .44Z" fill="url(#cupG)" stroke="#000" stroke-width=".03"/><path d="M-.415 .3Q0 .44 .415 .3L.4 .44Q0 .58 -.4 .44Z" fill="#1d1d21"/><path d="M-.415 .3Q0 .44 .415 .3" stroke="#6b6b72" stroke-width=".018" stroke-dasharray=".05 .035" fill="none"/><path d="M-.485 -.26Q0 -.12 .485 -.26" stroke="#6b6b72" stroke-width=".018" stroke-dasharray=".05 .035" fill="none"/><ellipse cx="0" cy="-.38" rx=".5" ry=".15" fill="#a3131c" stroke="#26262b" stroke-width=".06"/><path d="M-.44 -.36Q0 -.18 .44 -.36Q0 -.27 -.44 -.36Z" fill="#6e0a11"/><path d="M-.32 -.14L-.27 .26" stroke="rgba(255,255,255,.16)" stroke-width=".07" stroke-linecap="round"/></g>`;
const CUP_DEF = '<defs><linearGradient id="cupG" x1="0" x2="1"><stop offset="0" stop-color="#0c0c0e"/><stop offset=".35" stop-color="#3c3c42"/><stop offset="1" stop-color="#09090b"/></linearGradient></defs>';
function diceAt(vals) {   // the thrown dice on the board, in grid units round (0, 0)
  const n = vals.length, sz = n > 2 ? .5 : n > 1 ? .6 : .78, gap = n > 2 ? .52 : .68;
  return vals.map((v, i) => { const x = (i - (n - 1) / 2) * gap - sz / 2, y = -sz / 2 + (n > 2 && i === 1 ? -.18 : 0), a = ((v * 37 + i * 53) % 30) - 15;
    return `<g transform="rotate(${a} ${x + sz / 2} ${y + sz / 2})">` + B.dieSVG(v).replace('<svg ', `<svg x="${x}" y="${y}" width="${sz}" height="${sz}" `) + '</g>'; }).join('');
}
function cupDraw(seat, mode, thr) {   // mode: mouth up — 'ready' (tap me) · 'idle' · 'shake' · 'flip' (turning over); mouth down — 'down' · 'lift' (dice shown) · 'dice' (just the dice) · null (none)
  const gC = svg.querySelector('#gCup'); if (!gC) return;
  if (!G || SP || G.state.rule !== 'ludo' || mode == null || seat < 0) { gC.innerHTML = ''; CUP.seat = -1; CUP.mode = null; return; }
  CUP.mode = mode; CUP.thr = thr; if (CUP.k) gC.style.setProperty('--k', CUP.k);   // (kept: drawBoard rebuilds the SVG and draws the cup again — cupRedraw)
  const [x, y] = cupSpot(seat), col = B.COL.ludo[seat][0], moved = CUP.seat >= 0 && CUP.seat !== seat && (mode === 'ready' || mode === 'idle');
  const dice = thr ? diceAt(thr.three6 ? [6, 6, 6] : thr.dice || [thr.v]) : '';
  gC.innerHTML = CUP_DEF + `<g transform="translate(${x} ${y}) scale(1.25)">${dice ? `<g class="cupd">${dice}</g>` : ''}${mode === 'dice' ? '' : `<g class="cup ${mode}${moved ? ' slide' : ''}">${/^(ready|idle|shake|flip)$/.test(mode) ? cupUp(col) : cupBody(col)}</g>`}</g>`;
  if (moved) { const [x0, y0] = cupSpot(CUP.seat), c = gC.querySelector('.cup'); c.style.setProperty('--dx', (x0 - x) + 'px'); c.style.setProperty('--dy', (y0 - y) + 'px'); }
  if (mode === 'ready' && CUP.hint) cupHint(gC, x, y); else if (mode !== 'ready') CUP.hint = false;
  CUP.seat = seat;
}
// the bubble over the cup (the first throw): white, rounded, a little tail to the cup, floating up and down
function cupHint(gC, x, y) {
  const txt = t(matchMedia('(pointer: coarse)').matches ? 'st.tapT' : 'st.tapC');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'cuphint'); g.setAttribute('transform', `translate(${x} ${y - 1.12})`);
  g.innerHTML = `<g class="chb"><rect class="chr" x="-1" y="-.36" width="2" height=".62" rx=".31"/><path class="cht" d="M-.13 .24L0 .42L.13 .24Z"/><text class="chx" x="0" y=".07" text-anchor="middle">${txt}</text></g>`;
  gC.appendChild(g);
  try { const w = g.querySelector('text').getComputedTextLength() + .5; const r = g.querySelector('rect'); r.setAttribute('x', -w / 2); r.setAttribute('width', w); } catch (e) {}
}
// (2026-11-09) drawBoard rebuilds the whole SVG, #gCup with it: the cup as it was is drawn again (no slide; the page's own
// function, not the full board's wrapper — the 3D cup is not told twice). Before, after a reload / a design change / the
// 3D ⇄ 2D switch the cup was gone, and tapping where it stood did not throw (the tap looks for #gCup .cup.ready).
const cupDraw0 = cupDraw;
function cupRedraw() { if (CUP.mode && CUP.seat >= 0) { const s = CUP.seat; CUP.seat = -1; cupDraw0(s, CUP.mode, CUP.thr); } }

/* ---------- the focus (phones): the board view moves in on the seat to move — its yard before the throw, the pieces that can move
   and where they go after it, the walking piece while it walks — and glides on to the next seat (a smooth pan and zoom of the
   SVG's viewBox, never a cut). The corner button switches it off (the whole board), remembered in aicoding-ludo-zoom. ---------- */
const Z2 = { on: true, cur: null, to: null, raf: 0, pts: null, btn: null };
try { Z2.on = localStorage.getItem('aicoding-ludo-zoom') !== '0'; } catch (e) {}
const zSmall = () => matchMedia('(max-width: 600px)').matches;
function zBase() { const n = geo ? (G.state.rule === 'pachisi' ? 19 : 15) : 15; return [-.4, -.4, n + .8, n + .8]; }
function zSet(v) { svg.setAttribute('viewBox', v.map(x => x.toFixed(3)).join(' ')); const b = zBase(); $('#frame').classList.toggle('zoomed', v[2] < b[2] - .05); }
function zGo(to) {
  Z2.to = to; if (!Z2.cur) { Z2.cur = to.slice(); zSet(to); return; }
  if (Z2.raf) return;
  let last = performance.now();
  const tick = now => {
    const dt = Math.min(64, now - last); last = now; const k = 1 - Math.pow(1 - .085, dt / 16.7); let mv = false;
    for (let i = 0; i < 4; i++) { const d = Z2.to[i] - Z2.cur[i]; if (Math.abs(d) > .004) { Z2.cur[i] += d * k; mv = true; } else Z2.cur[i] = Z2.to[i]; }
    zSet(Z2.cur); Z2.raf = mv ? requestAnimationFrame(tick) : 0;
  };
  Z2.raf = requestAnimationFrame(tick);
}
function zApply(snap) {
  if (!geo || !G) return;
  if (Z2.btn) { Z2.btn.hidden = !zSmall() || !!SP; Z2.btn.classList.toggle('off', !Z2.on); }
  const b = zBase(), n = b[2] - .8;
  let to = b;
  if (Z2.on && zSmall() && !SP && !VIEW && Z2.pts && Z2.pts.length) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    Z2.pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    const span = Math.max(9.5, x1 - x0 + 2.4, y1 - y0 + 2.4);
    if (span < n - 1.5) { const cl = c => Math.max(span / 2 - .4, Math.min(n + .4 - span / 2, c)); to = [cl((x0 + x1) / 2) - span / 2, cl((y0 + y1) / 2) - span / 2, span, span]; }
  }
  if (snap) { if (Z2.raf) cancelAnimationFrame(Z2.raf); Z2.raf = 0; Z2.cur = to.slice(); Z2.to = to; zSet(to); } else zGo(to);
}
function zFocus(pts) { Z2.pts = pts; zApply(); }
function zSeat(seat) {
  const s = G.state, pts = [];
  if (s.rule === 'ludo') { const Y0 = [[0, 9], [0, 0], [9, 0], [9, 9]][seat]; pts.push([Y0[0], Y0[1]], [Y0[0] + 6, Y0[1] + 6]); }
  else { for (let k = 0; k < 4; k++) pts.push(geo.yard(seat, k)); pts.push(geo.cellXY(seat, 0)); }
  zFocus(pts);
}
function zMoves(seat, ms) {
  const pts = [];
  ms.filter(m => !m.pass).forEach(m => { pts.push(homeXY(seat, m.k, G.state.pos[seat][m.k])); pts.push(m.to >= E.lastOf(G.state) ? geo.home(seat, m.k) : geo.cellXY(seat, m.to)); });
  if (pts.length) zFocus(pts);
}
(function () {
  const ZL = { ja: ['手番に寄る', '盤全体を見る'], en: ['Zoom to the player', 'Whole board'], zh: ['聚焦当前玩家', '查看整个棋盘'], 'zh-TW': ['聚焦目前玩家', '查看整個棋盤'], ko: ['차례인 사람에게 확대', '판 전체 보기'], es: ['Acercar al turno', 'Tablero entero'], fr: ['Zoom sur le joueur', 'Plateau entier'], pt: ['Aproximar da vez', 'Tabuleiro inteiro'], de: ['Zum Spieler zoomen', 'Ganzes Brett'], ru: ['Приблизить к ходящему', 'Вся доска'], tr: ['Sıradakine yakınlaş', 'Tüm tahta'], id: ['Perbesar ke giliran', 'Seluruh papan'], hi: ['बारी वाले पर ज़ूम', 'पूरा बोर्ड'], ar: ['تقريب إلى صاحب الدور', 'اللوحة كاملة'] };
  const b = document.createElement('button'); b.type = 'button'; b.className = 'zbtn'; Z2.btn = b; b.hidden = true;
  Z2.paint = () => { const zl = ZL[LANG] || ZL.en, tt = Z2.on ? zl[1] : zl[0]; b.title = tt; b.setAttribute('aria-label', tt);
    b.innerHTML = Z2.on ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5M10.5 8v5M8 10.5h5"/></svg>'; };
  Z2.paint();
  b.onclick = e => { e.stopPropagation(); Z2.on = !Z2.on; try { localStorage.setItem('aicoding-ludo-zoom', Z2.on ? '1' : '0'); } catch (er) {} Z2.paint(); zApply(); };
  $('#frame').appendChild(b);
  addEventListener('resize', () => zApply());
})();
function homeXY(seat, k, p) { return p < 0 ? geo.yard(seat, k) : p >= E.lastOf(G.state) ? geo.home(seat, k) : geo.cellXY(seat, p); }
function placeAll(skip) {
  if (VIEW && Z2.cur && Z2.pts) { Z2.pts = null; zApply(); }
  const s = VIEW || G.state, groups = {};
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
      el.dataset.x = x; el.dataset.y = y; el.dataset.z = z; el.dataset.hy = 0;
      el.querySelector('.cnt').textContent = '';
      gPcs.appendChild(el);   // later on top
    });
  }
}
function previewMove(m) {
  const g = svg.querySelector('#gPrev'); if (!g) return; g.innerHTML = '';
  if (!m || m.pass || !G) return;
  const seat = G.state.turn, L = E.lastOf(G.state), a = m.enter ? geo.yard(seat, m.k) : homeXY(seat, m.k, m.from), b = m.to >= L ? geo.home(seat, m.k) : geo.cellXY(seat, m.to);
  g.innerHTML = (window.LudoLearn ? LudoLearn.marksSVG([{ type: 'arrow', from: a, to: b, color: '#3df59a' }, { type: 'ring', at: b, color: '#3df59a' }]) : '');
}
const cRender = () => { if (window.LudoCoach) LudoCoach.render(); };
function clearMarks() { previewMove(null);  if (gMarks) gMarks.innerHTML = ''; Object.values(pcEls).forEach(el => el.classList.remove('can', 'hint')); }

/* ---------- animation ---------- */
const SPD = () => [0, 2.4, 1.6, 1][settings.speed] || 1.6;   // ゆっくり · ふつう · はやい (2026-11-09: the old ふつう is now はやい, the old ゆっくり ふつう, and a slower ゆっくり)
const wait = ms => new Promise(r => setTimeout(r, ms * SPD()));
function tween(el, path, stepMs, done) {
  // path: [[x, y], …] (first = current place); one hop per step
  const z = +el.dataset.z || 1; let i = 0;
  const hop = () => {
    if (i >= path.length - 1) { done && done(); return; }
    const [x0, y0] = path[i], [x1, y1] = path[i + 1], t0 = performance.now(), dur = stepMs;
    (function f(now) {
      const k = Math.min(1, (now - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const hy = Math.sin(k * Math.PI) * .35, x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e - hy;
      el.dataset.hy = k < 1 ? hy.toFixed(3) : 0;   // (the hop's lift: the 3D skin lifts its piece instead of moving it up the board)
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
    (function f(now) { const k = Math.min(1, (now - t0) / dur); el.dataset.hy = k < 1 ? (Math.sin(k * Math.PI) * 1.4).toFixed(3) : 0; el.setAttribute('transform', `translate(${x0 + (x1 - x0) * k} ${y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 1.4}) scale(${z}) rotate(${k * 360})`); if (k < 1) requestAnimationFrame(f); else res(); })(t0);
  })));
}

/* ---------- the throw panel ---------- */
function showThrow(thr, rolling) {
  const el = $('#shown'), rule = G.state.rule;
  el.className = 'shown' + (rule === 'pachisi' ? ' cw' : '') + (rolling ? ' roll' : '');
  if (!thr) { el.innerHTML = rule === 'pachisi' ? B.cowriesSVG(null, 3) : B.dieSVG(6, '#efe8d8'); el.style.opacity = .35; $('#tval').textContent = '—'; $('#tsub').textContent = ''; return; }
  el.style.opacity = 1;
  if (thr.dice) {   // two dice (house rule): the dice still to use bright, the used ones faded
    const S0 = VIEW || G.state, left = (S0.left || thr.dice).slice(), shown = thr.three6 ? [6, 6, 6] : thr.dice;
    el.innerHTML = shown.map(v => { const i = left.indexOf(v), on = i >= 0; if (on) left.splice(i, 1); return `<span class="dd${on ? '' : ' used'}">${B.dieSVG(v)}</span>`; }).join('');
    el.classList.add('two'); $('#tval').textContent = (S0.left || thr.dice).join(' + ');
    $('#tsub').textContent = thr.again ? t('st.again') : ''; return;
  }
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
  }).join('') + houseTagsInPlay();
}
// the house rules of the game being played (ludo, changed from the usual) as tags under the players (2026-11-09)
function houseTagsInPlay() {
  const s = G && G.state, h = s && s.rule === 'ludo' && s.opt && s.opt.h;
  if (!h || !window.LudoHouse || !LudoHouse.tagsHTML) return '';
  const x = LudoHouse.tagsHTML(LANG, Object.assign({}, LudoHouse.DEF, h)); return x ? `<div class="hr-tags">${x}</div>` : '';
}
function setStatus(s) { $('#status').textContent = s || ''; }
function renderKifu() {
  const k = $('#kifu'); if (!G.log.length) { k.textContent = t('kifu.empty'); return; }
  const q = window.LudoRv ? LudoRv.quality : () => '', cur = window.LudoRv ? LudoRv.cur() : G.log.length;
  k.innerHTML = G.log.map((e, i) => `<span class="k${i === cur - 1 ? ' cur' : ''} ${q(i)}" data-i="${i}"><i style="background:${B.COL[G.state.rule][e.seat][0]}"></i>${e.v}: ${e.txt}</span>`).join('');
  const c = k.querySelector('.cur'); if (c && cur < G.log.length) c.scrollIntoView({ block: 'nearest' }); else k.scrollTop = k.scrollHeight;
}
function rollLabel() { $('#btnRoll').textContent = t(isPachisi() ? 'btn.throw' : 'btn.roll'); }

/* ---------- game flow ---------- */
let busy = false, token = 0, moves = [], selK = -1;
function newGame(rated) {
  if (SP && window.LudoLearn) LudoLearn.exitSpecial(true);
  const players = settings.rule === 'pachisi' && settings.players === 3 ? 4 : settings.players;
  // Ludo: the house rules (ludo/house.js; ★ defaults). Pachisi: its traditional rules
  const opts = settings.rule === 'ludo' && window.LudoHouse ? { rule: 'ludo', players, house: rated ? LudoHouse.DEF : LudoHouse.get() } : { rule: settings.rule, players, blocks: settings.blocks, threeSixes: settings.three };
  let st = E.newGame(opts);
  if (settings.first === 'r' || settings.mode === 'watch') st.turn = st.seats[Math.floor(Math.random() * st.seats.length)];
  G = { opts, mode: settings.mode === 'rated' ? 'ai' : settings.mode, level: settings.level, state: st, thr: null, log: [], hist: [], plies: [], id: Date.now().toString(36), rated: rated || null };
  token++; busy = false; moves = []; selK = -1; VIEW = null; if (window.LudoRv) LudoRv.reset();
  drawBoard(); rollLabel(); showThrow(null); renderPlayers(); renderKifu(); save();
  $('#resultOverlay').classList.remove('show');
  step();
}
function step() {
  if (SP) return;
  const my = ++token;
  clearMarks(); renderPlayers(); $('#btnPass').classList.add('hidden');
  const s = G.state;
  if (s.over) { setStatus(''); $('#btnRoll').disabled = true; zFocus(null); gameOver(); cRender(); return; }
  const seat = s.turn, human = humanSeat(seat);
  if (G.thr) { if (!CUP.mode) cupDraw(seat, 'dice', G.thr); afterThrow(my); return; }   // (a reload after the throw: its dice by the cup put aside)
  zSeat(seat);
  // (2026-11-09) the first throw of a game: a little bubble floats over the cup — 「サイコロをクリック！」 (タップ on touch screens) — until
  // the player throws; once per game, not with auto roll
  if (human && !G.tapHint && !settings.autoRoll && !isPachisi() && (G.plies || []).length < 8) { G.tapHint = true; CUP.hint = true; }
  $('#btnRoll').disabled = !human; cupDraw(seat, human ? 'ready' : 'idle');
  if (human) {
    setStatus(G.mode === 'pvp' ? t('st.turn', { p: seatName(seat) + '（' + colName(seat) + '）' }) + ' — ' + t(isPachisi() ? 'st.throwv' : 'st.rollv') : t('st.yourRoll', { b: t(isPachisi() ? 'st.throwv' : 'st.rollv') }));
    if (settings.autoRoll) setTimeout(() => { if (my === token) doRoll(); }, 350 * SPD());
  } else {
    setStatus(t('st.think', { p: seatName(seat) + '（' + colName(seat) + '）' }));
    setTimeout(() => { if (my === token) doRoll(); }, 260 * SPD());
  }
  cRender();
}
function doRoll() {
  if (busy || !G || G.state.over || G.thr) return;
  if (VIEW && window.LudoRv) LudoRv.toLatest();
  const my = ++token; busy = true;
  $('#btnRoll').disabled = true; sRattle();
  // ludo: the cup — shakes mouth up, turns over onto the board, then lifts away from the dice (2026-11-09 v2)
  const cup = G.state.rule === 'ludo', k = Math.max(.6, Math.sqrt(SPD())), seat = G.state.turn, gC = svg.querySelector('#gCup');
  CUP.k = k; if (gC) gC.style.setProperty('--k', k);
  if (cup) cupDraw(seat, 'shake');
  let n = 0; const iv = setInterval(() => { showThrow(E.rollThrow(G.state), true); if (++n >= 5) clearInterval(iv); }, 70);
  const T1 = cup ? 420 * k : 0, T2 = cup ? 260 * k : 0, T3 = cup ? 170 * k : 340 * Math.max(.6, SPD());
  if (cup) { setTimeout(() => { if (my === token) cupDraw(seat, 'flip'); }, T1); setTimeout(() => { if (my === token) { cupDraw(seat, 'down'); tone(150, .08, 'sine', .08); } }, T1 + T2); }
  setTimeout(() => {
    clearInterval(iv); if (my !== token || !G) return;
    G.thr = E.rollThrow(G.state); showThrow(G.thr); cupDraw(seat, 'lift', G.thr); save(); busy = false;
    afterThrow(my);
  }, T1 + T2 + T3);
}
function afterThrow(my) {
  const s = G.state, thr = G.thr, seat = s.turn;
  showThrow(thr); token = my = ++token;
  moves = E.legalMoves(s, thr);
  const real = moves.filter(m => !m.pass);
  if (!real.length) {   // forced pass (or three sixes)
    const m = moves[0] || { pass: true };
    setStatus(m.forfeit ? t('st.three') : t('st.nomove')); toast(m.forfeit ? t('st.three') : t('st.nomove'), 900);
    setTimeout(() => { if (my === token) commit(m); }, 420 * Math.sqrt(SPD()));   // (2026-11-09: on to the next turn sooner)
    return;
  }
  if (humanSeat(seat)) {
    const ks = [...new Set(real.map(m => m.k))];
    if (settings.autoPick && real.length === 1 && !moves.some(m => m.pass)) { setTimeout(() => { if (my === token) commit(real[0]); }, 260 * SPD()); return; }
    ks.forEach(k => pcEls[seat + ',' + k].classList.add('can')); zMoves(seat, real);
    $('#btnPass').classList.toggle('hidden', !moves.some(m => m.pass));
    setStatus(t('st.pick', { v: thr.dice ? (G.state.left || thr.dice).join(' + ') : thr.v }));
    cRender();
  } else {
    const r = E.think(s, thr, G.level);
    if (G.mode === 'watch') setTimeout(() => { if (my === token) commit(r.move); }, 240 * SPD());   // AIの着手は即時（観戦だけ間を取る）
    else commit(r.move);
  }
}
async function commit(m) {
  if (SP) { SP_commit(m); return; }
  if (busy) return; busy = true; const my = ++token;
  clearMarks(); $('#btnPass').classList.add('hidden');
  const g0 = G, s0 = G.state, thr = G.thr, seat = s0.turn;
  if (humanSeat(seat) && G.mode === 'ai') G.hist.push({ state: s0, thr, log: G.log.length, pl: G.plies.length });
  if (VIEW && window.LudoRv) LudoRv.toLatest();
  if (m && !m.pass) zFocus([homeXY(seat, m.k, s0.pos[seat][m.k]), m.to >= E.lastOf(s0) ? geo.home(seat, m.k) : geo.cellXY(seat, m.to)]);
  await animateMove(s0, m);
  if (G !== g0) return;   // a new game started meanwhile
  if (m && m.cap && m.cap.length) { sCap(); toast(t('st.cap')); await animateCaptures(s0, m.cap); }
  if (G !== g0) return;
  const r = E.apply(s0, m, thr);
  G.state = r.state; G.thr = r.cont ? thr : null;   // (two dice: the rest of this throw is played before the next roll)
  G.plies.push({ seat, s: s0, thr: { v: thr.v, face: thr.face, p: thr.p, again: thr.again, grace: thr.grace, dice: thr.dice, three6: thr.three6 }, m: m ? { k: m.k, k2: m.k2, from: m.from, to: m.to, enter: m.enter, home: m.home, pass: m.pass, forfeit: m.forfeit, one: m.one, back: m.back, use: m.use, cap: m.cap } : { pass: true } });
  if (window.LudoRv) LudoRv.invalidate();
  G.log.push({ seat, v: thr.v, txt: m && m.pass ? (m.forfeit ? '6×3' : t('st.pass')) : E.moveText(s0, m, thr) + (m.one ? '¹' : '') });
  placeAll(); renderKifu(); renderPlayers();
  if (m && m.home) { sHome(); toast(t('st.home')); }
  else if (r.again && !G.state.over) toast(thr.grace && isPachisi() ? t('st.grace') : t('st.again'), 800);
  save(); busy = false;
  if (my !== token) return;
  setTimeout(() => { if (my === token) step(); }, (r.again ? 300 : r.cont ? 120 : 170) * SPD());
}
function pickPiece(seat, k) {
  if (VIEW) { if (window.LudoRv) LudoRv.toLatest(); return; }
  if (busy || !G || G.state.over || !G.thr || G.state.turn !== seat || !humanSeat(seat)) return;
  let ms = moves.filter(m => !m.pass && m.k === k);
  if (!ms.length && G.state.pos[seat][k] < 0) ms = moves.filter(m => m.enter);   // any piece in the yard: the bring-out move
  if (!ms.length) return; k = ms[0].k;
  if (ms.length === 1) { commit(ms[0]); return; }
  // pachisi grace: the full throw or a single step — tap the destination
  selK = k; gMarks.innerHTML = '';
  const seenD = {};
  ms.forEach((m, i) => { let [x, y] = m.to >= E.lastOf(G.state) ? geo.home(seat, k) : geo.cellXY(seat, m.to); const dk = x + ',' + y, nd = seenD[dk] = (seenD[dk] || 0) + 1; if (nd > 1) { x += (nd - 1) * .5; y -= (nd - 1) * .35; } gMarks.insertAdjacentHTML('beforeend', `<g class="dest" data-i="${moves.indexOf(m)}"><circle cx="${x}" cy="${y}" r=".38" fill="${seatColor(seat)}" opacity=".85" stroke="#fff" stroke-width=".06"/><text x="${x}" y="${y + .14}" text-anchor="middle" style="font:700 .34px var(--font);fill:#fff">${(m.k2 != null ? '×2·' : '') + (m.back ? '↶' : '') + (m.use ? m.use.reduce((a, b) => a + b, 0) : m.to - m.from)}</text></g>`); });
}
svg.addEventListener('click', e => {
  const d = e.target.closest('.dest'); if (d) { commit(moves[+d.dataset.i]); return; }
  if (e.target.closest('#gCup .cup.ready')) { if (G && humanSeat(G.state.turn) && !G.thr && !busy) doRoll(); return; }
  // (2026-11-09) a tap near the waiting cup throws too (the 3D cup of the full board stands up off the SVG footprint)
  if (svg.querySelector('#gCup .cup.ready') && G && humanSeat(G.state.turn) && !G.thr && !busy && !e.target.closest('.pc')) {
    const m = svg.getScreenCTM(); if (m) { const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()), [cx, cy] = cupSpot(G.state.turn);
      if (Math.hypot(pt.x - cx, pt.y - cy) < 1.35) { doRoll(); return; } }
  }
  const g = e.target.closest('.pc'); if (g) pickPiece(+g.dataset.s, +g.dataset.k);
});
$('#btnRoll').onclick = () => { if (G && humanSeat(G.state.turn)) doRoll(); };
$('#btnPass').onclick = () => { const m = moves.find(x => x.pass); if (m && !busy) commit(m); };
document.addEventListener('keydown', e => { if (e.target.closest && e.target.closest('input,select,textarea')) return; if ((e.key === ' ' || e.key === 'Enter') && !$('.overlay.show') && G && humanSeat(G.state.turn) && !G.thr) { e.preventDefault(); doRoll(); } });

/* ---------- undo / hint / resign ---------- */
$('#btnUndo').onclick = () => {
  if (!G || busy || G.mode !== 'ai' || G.rated || !G.hist.length) { toast(t('undo.none')); return; }
  const h = G.hist.pop(); G.state = h.state; G.thr = h.thr; G.log.length = h.log; if (h.pl != null) G.plies.length = h.pl; G.state.over = false; G.state.winner = -1;
  VIEW = null; if (window.LudoRv) LudoRv.invalidate();
  token++; busy = false; placeAll(); renderKifu(); save(); step();
};
$('#btnHint').onclick = () => {
  if (!G || !G.thr || !humanSeat(G.state.turn) || busy || G.rated) { toast(t('hint.wait')); return; }
  const r = E.think(G.state, G.thr, 20, () => .5);
  if (!r.move || r.move.pass) { toast(t('hint.pass')); return; }
  pcEls[G.state.turn + ',' + r.move.k].classList.add('hint'); toast(t('hint.best'));
};
$('#btnResign').onclick = () => {
  if (!G || G.state.over || G.mode !== 'ai') return;
  if (G.rated && window.LudoRated && !G.plies.length) { /* an untouched rated game: just left */ }
  const go = () => { const s = G.state, me = s.team[s.seats.find(x => s.ctrl[x] === 0)]; s.over = true; s.winner = s.seats.map(x => s.team[x]).find(tm => tm !== me); G.thr = null; token++; busy = false; save(); step(); };
  if (window.Resign) Resign.confirm({ lang: LANG }).then(ok => { if (ok) go(); }); else go();
};

/* ---------- result ---------- */
function gameOver() {
  if (!G.recorded) { G.recorded = true; recordGame(); save(); }
  if (!G.resShown) { G.resShown = true; save(); showResult(); }
}
function recordGame() {
  const s = G.state; if (!window.GameRecord || G.mode === 'watch' || G.mode === 'pvp' || !G.plies.some(p => humanSeat(p.seat))) return;
  const me = s.team[s.seats.find(x => s.ctrl[x] === 0)];
  try { GameRecord.add({ mode: G.rated ? 'rated' : 'ai', res: s.winner === me ? 'w' : 'l', side: G.plies[0] && humanSeat(G.plies[0].seat) ? 0 : 1, opp: 'AI Lv.' + G.level, key: 'ai:' + G.level, n: G.plies.length, why: '' }); } catch (e) {}
  if (G.rated && window.LudoRated) LudoRated.settle(s.winner === me);
}
/* the final places (common: every finish shows who came where): the winning side first, the others by pieces home, then by the
   steps they have walked; Pachisi's partners share a place */
const RANK = { ja: n => n + '位', en: n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10 < 4 ? n % 10 : 0]), zh: n => '第' + n + '名', 'zh-TW': n => '第' + n + '名', ko: n => n + '위',
  es: n => n + '.º', fr: n => n + (n === 1 ? 'er' : 'e'), pt: n => n + 'º', de: n => n + '.', ru: n => n + '-е', tr: n => n + '.', id: n => '#' + n, hi: n => n + '.', ar: n => '#' + n };
function placesOf(s) {
  const L0 = E.lastOf(s), teams = [...new Set(s.seats.map(x => s.team[x]))];
  return teams.map(tm => { const seats = s.seats.filter(x => s.team[x] === tm), pcs = seats.flatMap(x => s.pos[x]);
    return { tm, seats, home: pcs.filter(p => p >= L0).length, of: pcs.length, steps: pcs.reduce((a, p) => a + Math.max(0, Math.min(p, L0) + 1), 0) }; })
    .sort((a, b) => (b.tm === s.winner) - (a.tm === s.winner) || b.home / b.of - a.home / a.of || b.steps - a.steps)
    .map((r, i) => Object.assign(r, { place: i + 1 }));
}
// the finish effect: a win throws confetti over the board and plays a fanfare; a loss dims the board for a moment with a falling tone
function finishFx(won) {
  const fr = $('#frame'); if (!fr) return;
  if (won) {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, .32, 'triangle', .07), i * 110));
    const c = document.createElement('canvas'), r = fr.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    c.className = 'fx-cf'; c.width = r.width * dpr; c.height = r.height * dpr; fr.appendChild(c);
    const x = c.getContext('2d'), cols = G.state.seats.map(seatColor).concat(['#ffd84a', '#ffffff']), P = [];
    for (let i = 0; i < 140; i++) P.push({ x: r.width / 2 + (Math.random() - .5) * 60, y: r.height * .55, vx: (Math.random() - .5) * 9, vy: -6 - Math.random() * 9, s: 4 + Math.random() * 6, a: Math.random() * 6, va: (Math.random() - .5) * .4, c: cols[i % cols.length] });
    const t0 = performance.now();
    (function f(now) { const k = (now - t0) / 2600; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, r.width, r.height);
      P.forEach(p => { p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va; x.save(); x.globalAlpha = Math.max(0, 1 - k * k); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
      if (k < 1 && c.isConnected) requestAnimationFrame(f); else c.remove(); })(t0);
  } else {
    [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, .34, 'sine', .06), i * 170));
    fr.classList.remove('fx-lose'); void fr.offsetWidth; fr.classList.add('fx-lose'); setTimeout(() => fr.classList.remove('fx-lose'), 1700);
  }
}
function showResult() {
  const s = G.state, winSeats = s.seats.filter(x => s.team[x] === s.winner);
  const meWon = G.mode === 'ai' && winSeats.some(x => s.ctrl[x] === 0);
  $('#resultDots').innerHTML = winSeats.map(x => `<i style="background:${seatColor(x)}"></i>`).join('');
  $('#resultTitle').textContent = meWon ? t('res.win') : t('res.lose', { p: winSeats.map(x => (G.mode === 'ai' ? seatName(x) + '（' + colName(x) + '）' : colName(x))).filter((v, i, a) => a.indexOf(v) === i).join('・') });
  $('#resultSub').textContent = t('res.sub', { n: G.log.length }) + (G.rated && G.rated.done ? ' · ' + t('rt.after', { o: G.rated.done.old, n: G.rated.done.now, d: (G.rated.done.d >= 0 ? '+' : '−') + Math.abs(G.rated.done.d) }) : '');
  // the places: every side with its place, colour(s), name and pieces home; yours stands out
  const rk = RANK[LANG] || RANK.en, mine = r => G.mode === 'ai' && r.seats.some(x => s.ctrl[x] === 0);
  $('#resultRank').innerHTML = placesOf(s).map(r => `<li class="${mine(r) ? 'me' : ''}${r.place === 1 ? ' first' : ''}"><b class="pl">${rk(r.place)}</b><span class="dots">${r.seats.map(x => `<i style="background:${seatColor(x)}"></i>`).join('')}</span><span class="nm">${[...new Set(r.seats.map(x => G.mode === 'ai' && s.ctrl[x] !== 0 ? seatName(x) + '（' + colName(x) + '）' : G.mode === 'ai' ? seatName(x) : colName(x)))].join('・')}</span><span class="hm">${t('p.home', { n: r.home, m: r.of })}</span></li>`).join('');
  if (G.mode === 'ai') finishFx(meWon); else finishFx(true);
  const ref = G; setTimeout(() => { if (G === ref && !SP) $('#resultOverlay').classList.add('show'); }, 500);
}
$('#btnResClose').onclick = () => $('#resultOverlay').classList.remove('show');
$('#btnAgain').onclick = () => { $('#resultOverlay').classList.remove('show'); openNew(); };
{ const b = $('#btnResAnalyze'); if (b) b.onclick = () => { $('#resultOverlay').classList.remove('show'); if (window.LudoRv) LudoRv.run(); }; }

/* ---------- new game dialog ---------- */
let draft = null;
function miniArt(rule, dz) { const d = B.drawBoard(rule, dz || 'classic'); return `<svg viewBox="-0.3 -0.3 ${d.n + .6} ${d.n + .6}">${d.svg}</svg>`; }
function renderDialog() {
  const D = draft;
  $('#ruleCards').innerHTML = ['ludo', 'pachisi'].map(r => `<button type="button" class="ngt-gcard${D.rule === r ? ' sel' : ''}" data-v="${r}"><span class="gart">${miniArt(r, D.design[r])}</span><b>${t('rule.' + r)}</b><p>${t('rule.' + r + '.d')}</p></button>`).join('');
  const seg = (id, v) => document.querySelectorAll(id + ' button').forEach(b => b.classList.toggle('on', b.dataset.v === String(v)));
  seg('#segMode', D.mode); seg('#segPlayers', D.rule === 'pachisi' && D.players === 3 ? 4 : D.players); seg('#segFirst', D.first);
  document.querySelectorAll('#segPlayers button').forEach(b => { b.textContent = t('ng.pl', { n: b.dataset.v }); b.disabled = D.rule === 'pachisi' && b.dataset.v === '3'; });
  const rated = D.mode === 'rated';
  $('#fRatedInfo').classList.toggle('hidden', !rated); if (rated && window.LudoRated) $('#rtStats').innerHTML = LudoRated.statsHtml();
  ['#fRules', '#fPlayers', '#fOpts', '#fFirst'].forEach(id => { const el = $(id); if (el && rated) el.classList.add('hidden'); });
  $('#fRules').classList.toggle('hidden', rated); $('#fPlayers').classList.toggle('hidden', rated);
  $('#fLevel').classList.toggle('hidden', D.mode === 'pvp' || rated);
  $('#fFirst').classList.toggle('hidden', D.mode === 'watch' || rated);
  $('#fOpts').classList.toggle('hidden', D.rule !== 'ludo' || rated);
  $('#fHouse2').classList.toggle('hidden', D.rule !== 'ludo' || rated);
  $('#levelRange').value = D.level; $('#levelName').innerHTML = levelLabelHTML(D.level);
  $('#optAutoRoll').checked = D.autoRoll; $('#optAutoPick').checked = D.autoPick;
  if (window.LudoHouse) { const HL = LudoHouse.T[LANG] || LudoHouse.T.en, n = LudoHouse.changed(); ['', '2'].forEach(k => { $('#hrLbl' + k).textContent = HL.ui[0]; $('#hrSum' + k).textContent = n ? HL.ui[9].replace('{n}', n) : ''; const tg = $('#hrTags' + k); if (tg) tg.innerHTML = LudoHouse.tagsHTML ? LudoHouse.tagsHTML(LANG) : ''; }); }   // (+ the changed rules as tags)   // (2026-11-09: a plain ハウスルール ⚙ button; a badge only when something is changed)
  $('#bdRow').innerHTML = (D.rule === 'ludo' && window.LudoBoardArt ? ['classic', 'wood', 'mondrian', 'cutout'] : ['classic', 'wood']).map(k => `<button type="button" data-v="${k}" class="${D.design[D.rule] === k ? 'on' : ''}">${miniArt(D.rule, k)}<span>${t('bd.' + k)}</span></button>`).join('');
}
function openNew() { draft = JSON.parse(JSON.stringify(settings)); if (G && G.rated) draft.mode = 'rated'; if (draft.mode === 'rated' && !window.LudoRated) draft.mode = 'ai'; renderDialog(); $('#newOverlay').classList.add('show'); }
$('#btnNew').onclick = openNew;
// the ルール button on each game card (shared/ngtabs.js): that rule's tutorial
$('#btnHouse').onclick = $('#btnHouse2').onclick = () => { if (window.LudoHouse) LudoHouse.open({ lang: LANG, theme: document.documentElement.classList.contains('atlas-skin') ? 'atlas' : '', onClose: () => renderDialog() }); };   // (the full board: the portal's cream colours, 2026-11-09)
$('#ruleCards').ngtRules = r => { if (window.LudoLearn) LudoLearn.openRules(r); };
$('#ruleCards').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; draft.rule = b.dataset.v; if (draft.rule === 'pachisi' && draft.players === 3) draft.players = 4; renderDialog(); };
const segClick = (id, key, num) => { $(id).onclick = e => { const b = e.target.closest('button[data-v]'); if (!b || b.disabled) return; draft[key] = num ? +b.dataset.v : b.dataset.v; renderDialog(); }; };
segClick('#segMode', 'mode'); segClick('#segPlayers', 'players', true); segClick('#segFirst', 'first');
// the AI level's comment under its name (as the other games, 2026-11-09): four bands — the same words as the atlas card
// (atlas/games/ludo.js LVD)
const LVD = {
  ja: ['入門：目に任せて動かす', '初級：取りと安全マスを考える', '中級：危険と得点を比べる', '上級：次の一投まで読む'],
  en: ['Beginner: moves at random', 'Novice: looks for captures and safe squares', 'Intermediate: weighs risk against progress', 'Expert: looks ahead to the next throw'],
  zh: ['入门：随便走', '初级：会吃子、找安全格', '中级：权衡风险与前进', '高级：会算下一掷'], 'zh-TW': ['入門：隨便走', '初級：會吃子、找安全格', '中級：權衡風險與前進', '高級：會算下一擲'],
  ko: ['입문: 아무렇게나 움직인다', '초급: 잡기와 안전 칸을 노린다', '중급: 위험과 전진을 저울질한다', '상급: 다음 던지기까지 읽는다'],
  es: ['Inicial: mueve al azar', 'Principiante: busca capturas y casillas seguras', 'Intermedio: sopesa riesgo y avance', 'Experto: piensa en la próxima tirada'],
  fr: ['Débutant : joue au hasard', 'Novice : cherche prises et cases sûres', 'Intermédiaire : pèse risque et progrès', 'Expert : pense au lancer suivant'],
  pt: ['Iniciante: move ao acaso', 'Básico: procura capturas e casas seguras', 'Intermediário: pesa risco e avanço', 'Especialista: pensa no próximo lance'],
  de: ['Einsteiger: zieht zufällig', 'Anfänger: sucht Schlagen und sichere Felder', 'Mittel: wägt Risiko gegen Fortschritt ab', 'Experte: denkt an den nächsten Wurf'],
  ru: ['Начальный: ходит наугад', 'Новичок: ищет взятия и безопасные клетки', 'Средний: взвешивает риск и продвижение', 'Эксперт: думает о следующем броске'],
  tr: ['Başlangıç: rastgele oynar', 'Acemi: alma ve güvenli kare arar', 'Orta: riski ilerlemeyle tartar', 'Uzman: sonraki atışı düşünür'],
  id: ['Pemula: bergerak acak', 'Dasar: mencari tangkapan dan petak aman', 'Menengah: menimbang risiko dan kemajuan', 'Ahli: memikirkan lemparan berikutnya'],
  hi: ['शुरुआती: बेतरतीब चलता है', 'नौसिखिया: पकड़ और सुरक्षित खाने देखता है', 'मध्यम: जोखिम और बढ़त तौलता है', 'विशेषज्ञ: अगली चाल तक सोचता है'],
  ar: ['مبتدئ: يتحرك عشوائيًا', 'مبتدئ: يبحث عن الأسر والمربعات الآمنة', 'متوسط: يوازن الخطر والتقدم', 'خبير: يفكر في الرمية التالية'],
};
function levelLabelHTML(n) { const b = n <= 3 ? 0 : n <= 8 ? 1 : n <= 14 ? 2 : 3; return `Lv.${n}<small>${(LVD[LANG] || LVD.en)[b]}</small>`; }
$('#levelRange').oninput = e => { draft.level = +e.target.value; $('#levelName').innerHTML = levelLabelHTML(draft.level); };
['AutoRoll:autoRoll', 'AutoPick:autoPick'].forEach(x => { const [id, k] = x.split(':'); $('#opt' + id).onchange = e => { draft[k] = e.target.checked; }; });
// design: applied at once (common rule) — even if the dialog is then closed
$('#bdRow').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; draft.design[draft.rule] = b.dataset.v; settings.design[draft.rule] = b.dataset.v; save(); if (G && G.state.rule === draft.rule) { drawBoard(); if (!busy) step(); } renderDialog(); };   // (mid-throw or mid-move: just the new board — step() would cut the running throw off, the game then stood still)
$('#btnCancelNew').onclick = () => $('#newOverlay').classList.remove('show');
$('#btnStart').onclick = () => { Object.assign(settings, draft); $('#newOverlay').classList.remove('show'); save(); if (settings.mode === 'rated' && window.LudoRated) LudoRated.start(); else newGame(); };
document.querySelectorAll('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.remove('show'); }));

/* ---------- language, sound ---------- */
// the title: only the rule being played (ルドー or パチーシ), not both
function paintTitle() { const el = $('#ttlName'); if (el) el.textContent = t('rule.' + ((G && G.state && G.state.rule) || settings.rule)); }
function applyI18n() {
  paintTitle();
  if (window.__ldSpeedOpt) __ldSpeedOpt.sync();
  if (Z2.paint) Z2.paint();
  if (window.LudoRv) LudoRv.relabel();
  document.documentElement.lang = LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.title = t('meta.title');
  if (window.Resign) $('#btnResign span').textContent = Resign.label(LANG);
  $('#langSel').value = LANG;
  if (G) { rollLabel(); renderPlayers(); renderKifu(); showThrow(G.thr); }
  if (window.GameRecord && GameRecord.relabel) GameRecord.relabel();
}
// (2026-11-09) mid-throw or mid-move (busy) the turn is not restarted: step() bumps the token and the throw's timers then never
// land — the dice froze and the game stopped. The labels follow; the status follows at the next step.
$('#langSel').onchange = e => { LANG = e.target.value; try { localStorage.setItem('aicoding-lang', LANG); } catch (_) {} applyI18n(); if (G) { if (busy) renderPlayers(); else step(); } if ($('#newOverlay').classList.contains('show')) renderDialog(); if (HB) HB.relabel(); if (window.LudoLearn) LudoLearn.relang(); if (window.LudoCoach) LudoCoach.relabel(); };
const paintSnd = () => { const b = $('#btnSound'); b.classList.toggle('off', !settings.sound); b.classList.toggle('on', !!settings.sound); b.setAttribute('aria-pressed', settings.sound ? 'true' : 'false'); };   // (the gear menu reads on / aria-pressed)
$('#btnSound').onclick = () => { settings.sound = !settings.sound; paintSnd(); save(); };

/* ---------- start ---------- */
if (window.LudoCoach) LudoCoach.init();
if (window.RulesOffer) RulesOffer.init({ game: 'ludo', lang: () => LANG, open: () => window.LudoLearn && LudoLearn.openRules(), watch: '#rulesOverlay' });
// PC: the right column as high as the board (it never runs below it)
{ const fit = () => { const f = $('#frame'); if (f) document.documentElement.style.setProperty('--bdh', Math.round(f.getBoundingClientRect().height) + 'px'); };
  if (window.ResizeObserver) new ResizeObserver(fit).observe($('#frame')); addEventListener('resize', fit); fit(); }
const VARS = ['ludo4', 'ludo3', 'ludo2', 'pachisi4', 'pachisi2'];
const varName = k => t('rule.' + k.replace(/\d/, '')) + ' · ' + t('ng.pl', { n: k.slice(-1) });
if (window.GameRecord) GameRecord.init({ game: 'ludo', lang: () => LANG, menu: '.controls', sides: () => [t('rec.first'), t('rec.later')], variant: () => { const k = G ? G.state.rule + G.state.players : 'ludo4'; return { k, n: varName(k) }; }, variants: () => VARS, variantName: k => varName(k), defVariant: 'ludo4' });
// the pieces' speed lives in the options (gear) panel: a pulldown (ゆっくり · ふつう · はやい, 2026-11-09 — it was a row that stepped)
if (window.HeaderBar && HeaderBar.addOption) {
  const spH = HeaderBar.addOption({ id: 'ldspeed', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 18a8 8 0 1 1 14 0"/><path d="M12 14l4-5"/><circle cx="12" cy="14" r="1.3"/></svg>',
    label: () => t('ng.speed'), type: 'select',
    options: () => [1, 2, 3].map(v => ({ v, label: () => t(['', 'sp.slow', 'sp.normal', 'sp.fast'][v]) })),
    get: () => settings.speed, set: v => { settings.speed = +v; if (draft) draft.speed = settings.speed; save(); } });
  window.__ldSpeedOpt = spH;
}
const HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnResign', '#btnHint', '#btnRules', '#btnLesson'], lang: () => LANG }) : null;
applyI18n(); paintSnd();
if (saved.game && saved.game.state && saved.game.state.pos) {
  const sg = saved.game;
  G = { opts: sg.opts, mode: sg.mode, level: sg.level, state: sg.state, thr: sg.thr, log: sg.log || [], hist: sg.hist || [], plies: sg.plies || [], id: sg.id || Date.now().toString(36), rated: sg.rated || null, resShown: true, recorded: sg.recorded !== false };
  if (G.plies.length !== G.log.length) G.plies = [];   // (older saves: no history to navigate)
  drawBoard(); rollLabel(); showThrow(G.thr); renderKifu();
  if (G.state.over) { renderPlayers(); setStatus(''); $('#btnRoll').disabled = true; cRender(); } else step();
} else newGame();
window.__ludo = { get G() { return G; }, settings, newGame, doRoll, commit, get moves() { return moves; }, get busy() { return busy; } };
