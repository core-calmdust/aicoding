/* ペグソリテール — the 2D game page (peg/).
   Modes: free play (a board and a start hole, finish with one peg — on the goal hole for a perfect game), the puzzle
   collection (PZBook: themes of stages of 10), the daily puzzle. The board is one SVG: the turned wooden board, the holes,
   the marbles (pick one, then the hole to land on, or drag it there) and the groove round the rim where the taken marbles
   roll. Hints come from the solver in a worker (engine.js): the next jump of a way to finish from here.
   Saved: localStorage 'aicoding-peg' (settings, the game in progress, records), 'aicoding-peg-pz' (puzzle stars),
   'aicoding-peg-daily' (the daily puzzle's days and streak). */
(function () {
'use strict';
const E = window.PegEngine, I = window.PEG_I18N || {};
const STORE = 'aicoding-peg', PZS = 'aicoding-peg-pz', DLS = 'aicoding-peg-daily', PZ_LAST = 'aicoding-peg-pz-last', PZ_TAB = 'aicoding-peg-pz-tab';
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let LANG = (() => { try { const s = (JSON.parse(localStorage.getItem(STORE) || '{}').settings || {}).lang || localStorage.getItem('aicoding-lang'); if (LANGS.includes(s)) return s; } catch (e) {} const n = (navigator.language || 'ja'); if (/^zh-(tw|hk|mo|hant)/i.test(n)) return 'zh-TW'; const b = n.slice(0, 2); return LANGS.includes(b) ? b : 'en'; })();
function t(k, v) { const o = I[k]; let s = o ? (o[LANG] || o.en || o.ja || k) : k; if (v) s = s.replace(/\{(\w+)\}/g, (_, x) => v[x] !== undefined ? v[x] : ''); return s; }
const BD = ['walnut', 'maple', 'stone', 'night'], PG = ['glass', 'pearl', 'steel', 'peg', 'mod'];

/* ---------------------------------------------------------------- state */
const DEF = { board: 'english', startMode: 'classic', start: -1, goalMode: 'hole', bd: 'walnut', pg: 'glass', sound: true, lang: LANG };
let settings = Object.assign({}, DEF), recs = {};
let G = null;          // the game: { board, B, start, goal, a (0/1 per hole), hist: [[f,o,t]], over }
let puzzle = null;     // { L (theme index), j, P, daily (date) | null, hinted, failed, answered, solved }
let busy = false, sel = -1, hintMarks = null;
try { const d = JSON.parse(localStorage.getItem(STORE) || '{}'); Object.assign(settings, d.settings || {}); recs = d.recs || {}; if (d.game && E.BOARDS[d.game.board]) G = gameFrom(d.game); } catch (e) {}
if (!BD.includes(settings.bd)) settings.bd = 'walnut'; if (!PG.includes(settings.pg)) settings.pg = 'glass';
function gameFrom(o) { const B = E.BOARDS[o.board]; const a = o.a ? o.a.split('').map(Number) : E.startPos(B, o.start); return { board: o.board, B, start: o.start, goal: o.goal, a, a0: o.a0 ? o.a0.split('').map(Number) : E.startPos(B, o.start), hist: o.hist || [], over: false }; }
function save() {
  try { localStorage.setItem(STORE, JSON.stringify({ settings, recs, game: G && !puzzle ? { board: G.board, start: G.start, goal: G.goal, a: G.a.join(''), a0: G.a0.join(''), hist: G.hist } : (JSON.parse(localStorage.getItem(STORE) || '{}').game || null) })); } catch (e) {}
}
const pzRecMap = () => { try { return JSON.parse(localStorage.getItem(PZS) || '{}') || {}; } catch (e) { return {}; } };

/* ---------------------------------------------------------------- sounds (small synth: a wooden tick, a glassy clink, a chime) */
const SND = (() => {
  const ac = () => { try { const C = window.__pegAC || (window.__pegAC = new (window.AudioContext || window.webkitAudioContext)()); if (C.state === 'suspended') C.resume(); return C; } catch (e) { return null; } };
  function tone(f0, f1, dur, vol, type, d = 0) { if (!settings.sound) return; const C = ac(); if (!C) return; const t0 = C.currentTime + d, o = C.createOscillator(), g = C.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .004); g.gain.exponentialRampToValueAtTime(.001, t0 + dur); o.connect(g).connect(C.destination); o.start(t0); o.stop(t0 + dur + .03); }
  return {
    pick: () => tone(880, 1180, .06, .05, 'triangle'),
    land: () => { tone(1560, 1320, .07, .07, 'sine'); tone(420, 260, .07, .06, 'triangle'); },
    take: () => { tone(2100, 1900, .05, .05, 'sine', .02); tone(2600, 2300, .08, .035, 'sine', .07); },
    win: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0, .5, .07, 'triangle', i * .09)),
    soft: () => tone(330, 260, .2, .06, 'sine'),
  };
})();

/* ---------------------------------------------------------------- geometry */
const K = 100;   // SVG units per hole spacing
function geo(B) {
  if (B.geo) return B.geo;
  const xs = B.pos.map(p => p[0]), ys = B.pos.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  let g;
  if (B.tri) {
    // the triangle board: a rounded triangle with a straight groove along the bottom edge for the taken marbles
    const top = [cx, Math.min(...ys)], bl = [Math.min(...xs), Math.max(...ys)], br = [Math.max(...xs), Math.max(...ys)];
    const m = 1.05, dy = .9, s3 = Math.sqrt(3);
    const P = [[top[0], top[1] - m * 2], [bl[0] - m * s3, bl[1] + m + dy], [br[0] + m * s3, br[1] + m + dy]];
    const span = Math.max(P[2][0] - P[1][0], P[1][1] - P[0][1]);
    g = { tri: true, cx, cy: (P[0][1] + P[1][1]) / 2, P, groove: { y: bl[1] + 1.35, x0: bl[0] - 1.1, x1: br[0] + 1.1 }, size: span + .3 };
  } else {
    const R = Math.max(...B.pos.map(([x, y]) => Math.hypot(x - cx, y - cy))) + 1.22;   // (a slim rim: the holes as big as the frame allows)
    g = { tri: false, cx, cy, R, gr: R - .48, size: R * 2 + .12 };
  }
  return (B.geo = g);
}
const X = (B, i) => (B.pos[i][0] - geo(B).cx) * K, Y = (B, i) => (B.pos[i][1] - geo(B).cy) * K;
// the groove slot of the k-th taken marble
function slot(B, k) {
  const g = geo(B);
  if (g.tri) { const n = 13, x = g.groove.x0 + (g.groove.x1 - g.groove.x0) * ((k % n) + .5) / n; return [(x - g.cx) * K, (g.groove.y - g.cy) * K]; }
  const step = Math.min(.62 / g.gr, Math.PI * 2 / Math.max(B.n, 1)), a = -Math.PI / 2 + (k + .5) * step * 1.02;
  return [Math.cos(a) * g.gr * K, Math.sin(a) * g.gr * K];
}

/* ---------------------------------------------------------------- the board SVG */
const GLASS = [['#9fd8ff', '#2a7bd0', '#0c2f6a'], ['#b8f5c8', '#2ea86a', '#0b4a2a'], ['#ffd59a', '#e08a20', '#6a3006'], ['#ffb3b8', '#d83a4a', '#5e0d18'], ['#e2c6ff', '#8a52d8', '#341466'], ['#b9fbf2', '#24b3a3', '#074e47']];
function defs(id) {
  const rg = (k, c) => `<radialGradient id="${id}${k}" cx=".36" cy=".3" r=".75"><stop offset="0" stop-color="${c[0]}"/><stop offset=".55" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient>`;
  return `<defs>
    <radialGradient id="${id}wood" cx=".5" cy=".42" r=".62"><stop offset="0" style="stop-color:var(--wood1)"/><stop offset=".8" style="stop-color:var(--wood2)"/><stop offset="1" style="stop-color:var(--wood3)"/></radialGradient>
    <radialGradient id="${id}hole" cx=".5" cy=".35" r=".7"><stop offset="0" style="stop-color:var(--hole)"/><stop offset=".75" style="stop-color:var(--hole)"/><stop offset="1" stop-color="rgba(255,255,255,.18)"/></radialGradient>
    <radialGradient id="${id}sh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="rgba(0,0,0,.62)"/><stop offset=".55" stop-color="rgba(0,0,0,.32)"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></radialGradient>
    ${GLASS.map((c, k) => rg('g' + k, c)).join('')}
    ${rg('pearl', ['#fffdf6', '#efe4cf', '#a8987a'])}${rg('steel', ['#ffffff', '#a9b0ba', '#3b4048'])}${rg('peg', ['#f2c98e', '#c58a48', '#6a3f16'])}
    <pattern id="${id}grain" width="40" height="400" patternUnits="userSpaceOnUse" patternTransform="rotate(8)"><path d="M0 0v400M14 0c6 100-6 200 0 400M27 0c-5 120 6 260 0 400" style="stroke:var(--grain)" stroke-width="3" fill="none"/></pattern>
  </defs>`;
}
// the boards and marbles are pictures (peg/tools/render_boards.py, 2026-11-11: realistic, detailed sets — user): the board image
// covers the whole viewBox (its cups, groove and shadow line up with the holes), a marble image sits on each peg
const IMGV = 5;
const bdImg = (look, id) => `img/bd-${look}-${id}.webp?v=${IMGV}`;
function boardBody(B, id, look) {
  const g = geo(B), h = g.size * K / 2;
  return `<image href="${bdImg(look || settings.bd, B.id)}" x="${-h}" y="${-h}" width="${h * 2}" height="${h * 2}" preserveAspectRatio="none"/>`;
}
function roundTri(p, r) {
  const n = p.length; let d = '';
  for (let i = 0; i < n; i++) {
    const a = p[(i + n - 1) % n], b = p[i], c = p[(i + 1) % n];
    const v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]], l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
    const s = [b[0] + v1[0] / l1 * r, b[1] + v1[1] / l1 * r], e = [b[0] + v2[0] / l2 * r, b[1] + v2[1] / l2 * r];
    d += (i ? 'L' : 'M') + s[0].toFixed(1) + ' ' + s[1].toFixed(1) + 'Q' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + ' ' + e[0].toFixed(1) + ' ' + e[1].toFixed(1);
  }
  return d + 'Z';
}
function marble(id, i, pg) {   // a marble centred at 0,0 (radius 33)
  const sk = pg || settings.pg, k = (i * 7 + 3) % 6;   // (every set has six colours)
  return `<g class="mb"><ellipse cx="11" cy="16" rx="35" ry="30" fill="url(#${id}sh)"/><image href="img/m-${sk}-${k}.webp?v=${IMGV}" x="-34" y="-34" width="68" height="68"/></g>`;
}
// a whole board as a static picture (dialogs, puzzle thumbnails, the rules)
let uid = 0;
function boardSVG(B, a, opt) {
  opt = opt || {};
  const id = 'p' + (uid++), g = geo(B), h = g.size * K / 2;
  let s = `<svg viewBox="${-h} ${-h} ${h * 2} ${h * 2}" class="${opt.cls || ''}">${defs(id)}${boardBody(B, id, opt.look)}`;
  if (opt.goal !== undefined && opt.goal >= 0) s += `<circle cx="${X(B, opt.goal)}" cy="${Y(B, opt.goal)}" r="42" fill="none" stroke="#f1c879" stroke-width="7" stroke-dasharray="11 8"/>`;
  if (opt.mark !== undefined && opt.mark >= 0) s += `<circle cx="${X(B, opt.mark)}" cy="${Y(B, opt.mark)}" r="44" fill="rgba(127,224,255,.25)" stroke="#7fe0ff" stroke-width="7"/>`;
  B.cells.forEach((_, i) => { if (a[i]) s += `<g transform="translate(${X(B, i)} ${Y(B, i)})">${marble(id, i, opt.pg)}</g>`; });
  return s + '</svg>';
}

/* ---------------------------------------------------------------- the live board */
let SV = null, PEGS = {}, GROOVE = [], VB = 0, SID = '';
function build() {
  const B = G.B, g = geo(B), h = g.size * K / 2; VB = h; SID = 'b' + (uid++);
  $('#board').innerHTML = `<svg viewBox="${-h} ${-h} ${h * 2} ${h * 2}" id="bsvg">${defs(SID)}<g class="body">${boardBody(B, SID)}</g><g class="holes">${B.cells.map((_, i) => `<circle class="hole" data-i="${i}" cx="${X(B, i)}" cy="${Y(B, i)}" r="30" fill="transparent"/>`).join('')}</g><g class="marks" id="mk"></g><g class="groove" id="gv"></g><g class="pegs" id="pg"></g><g class="dsts" id="ds"></g></svg>`;
  SV = $('#bsvg'); PEGS = {}; GROOVE = [];
  const pg = $('#pg');
  B.cells.forEach((_, i) => { if (G.a[i]) addPeg(i, pg); });
  const taken = G.a0.reduce((s, v) => s + v, 0) - G.a.reduce((s, v) => s + v, 0);
  for (let k = 0; k < taken; k++) addGroove(k, G.hist[k] ? G.hist[k][1] : k);
  marks();
}
function addPeg(i, pg) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'g'); el.setAttribute('class', 'peg'); el.dataset.i = i;
  el.innerHTML = marble(SID, i); place(el, X(G.B, i), Y(G.B, i)); (pg || $('#pg')).appendChild(el); PEGS[i] = el; el.dataset.c = i; return el;
}
function addGroove(k, colorOf) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'g'); el.innerHTML = marble(SID, colorOf); const [x, y] = slot(G.B, k); place(el, x, y, gScale()); $('#gv').appendChild(el); GROOVE[k] = el; return el;
}
const gScale = () => G && G.B.tri ? .68 : .78;
const place = (el, x, y, s) => { el.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})${s && s !== 1 ? ` scale(${s.toFixed(3)})` : ''}`); el._x = x; el._y = y; el._s = s || 1; };
function marks() {
  const mk = $('#mk'); if (!mk) return; const B = G.B; let s = '';
  if (G.goal >= 0) s += `<circle class="goal" cx="${X(B, G.goal)}" cy="${Y(B, G.goal)}" r="42"/>`;
  const last = G.hist[G.hist.length - 1]; if (last && !hintMarks) s += `<circle class="lastm" cx="${X(B, last[2])}" cy="${Y(B, last[2])}" r="40"/>`;
  if (hintMarks) s += `<circle class="hintm" cx="${X(B, hintMarks[0])}" cy="${Y(B, hintMarks[0])}" r="42"/><circle class="hintm" cx="${X(B, hintMarks[2])}" cy="${Y(B, hintMarks[2])}" r="42"/><path d="M${X(B, hintMarks[0])} ${Y(B, hintMarks[0])}L${X(B, hintMarks[2])} ${Y(B, hintMarks[2])}" stroke="#7fe0ff" stroke-width="7" stroke-dasharray="14 10" opacity=".7"/>`;
  mk.innerHTML = s;
  const ds = $('#ds'); ds.innerHTML = '';
  if (sel >= 0) { $$('#pg .peg').forEach(p => p.classList.toggle('sel', +p.dataset.i === sel)); E.moves(B, G.a).filter(j => j[0] === sel).forEach(j => { ds.insertAdjacentHTML('beforeend', `<g class="dst"><circle cx="${X(B, j[2])}" cy="${Y(B, j[2])}" r="30"/></g>`); }); }
  else $$('#pg .peg').forEach(p => p.classList.remove('sel'));
}
function anim(dur, f, done) { const t0 = performance.now(); (function s(n) { const k = Math.min(1, (n - t0) / dur); f(k); if (k < 1) requestAnimationFrame(s); else if (done) done(); })(t0); }
const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

/* ---------------------------------------------------------------- moves */
function play(j, fast) {
  return new Promise(res => {
    const B = G.B, [f, o, to] = j, pf = PEGS[f], po = PEGS[o];
    G.a = E.apply(G.a, j); G.hist.push(j); sel = -1; hintMarks = null;
    delete PEGS[f]; delete PEGS[o]; PEGS[to] = pf; pf.dataset.i = to;
    const x0 = pf._x, y0 = pf._y, x1 = X(B, to), y1 = Y(B, to), d = fast ? 160 : 300;
    $('#pg').appendChild(pf);
    if (!fast) SND.pick();
    anim(d, k => { const q = ease(k); place(pf, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q - Math.sin(k * Math.PI) * 26, 1 + Math.sin(k * Math.PI) * .2); }, () => { place(pf, x1, y1); SND.land(); });
    // the jumped marble rolls into the groove
    const kslot = G.hist.length - 1;
    setTimeout(() => {
      if (!po) return; SND.take();
      const [gx, gy] = slot(B, kslot), xa = po._x, ya = po._y; po.classList.remove('peg'); po.removeAttribute('data-i'); po.style.pointerEvents = 'none';
      $('#gv').appendChild(po);
      anim(fast ? 200 : 420, k => { const q = ease(k); place(po, xa + (gx - xa) * q, ya + (gy - ya) * q - Math.sin(k * Math.PI) * 40, 1 - (1 - gScale()) * q); }, () => { place(po, gx, gy, gScale()); GROOVE[kslot] = po; });
    }, d * .45);
    setTimeout(() => { marks(); update(); res(); }, d + 20);
  });
}
async function userPlay(j) {
  if (busy) return; busy = true;
  await play(j);
  busy = false; save();
  afterMove();
  update();   // (the puzzle card's buttons were drawn while busy: 待った・やり直し・答え came back disabled after a failed try)
}
function afterMove() {
  if (E.moves(G.B, G.a).length) return;
  G.over = true;
  const left = G.a.reduce((s, v) => s + v, 0), onGoal = left === 1 && (G.goal < 0 || G.a[G.goal]);
  if (puzzle) return puzzleEnd(left, onGoal);
  // free play: the record and the result
  const rk = G.board + ':' + G.start, r = recs[rk] || {};
  const perfect = left === 1 && G.goal >= 0 && !!G.a[G.goal];
  const better = r.best === undefined || left < r.best || (left === r.best && perfect && !r.perfect);
  if (better) recs[rk] = { best: left, perfect: perfect || !!r.perfect };
  else if (perfect) recs[rk].perfect = true;
  save(); renderRecs();
  // 戦績 (shared/record.js, as the other games): one line per finished free game — 1 left = a win, 2 or more = a loss
  try { if (window.GameRecord) GameRecord.add({ mode: 'ai', res: left === 1 ? 'w' : 'l', opp: boardName(G.board), key: G.board, n: G.hist.length, why: rating(left, perfect)[1] + ' · ' + t('res.left', { n: left }) }); } catch (e) {}
  setTimeout(() => showResult(left, perfect, better && r.best !== undefined), 380);
}
function rating(left, perfect) {
  if (left === 1) return perfect ? ['👑', t('res.perfect')] : ['🌟', t('res.one')];
  if (left === 2) return ['✨', t('res.two')]; if (left === 3) return ['🎯', t('res.three')]; if (left <= 5) return ['👍', t('res.five')]; return ['🌱', t('res.many')];
}
function showResult(left, perfect, newBest) {
  const [ic, ti] = rating(left, perfect);
  $('#resBadge').textContent = ic; $('#resTitle').textContent = ti;
  $('#resSub').innerHTML = esc(t('res.left', { n: left })) + (newBest ? '<br><b style="color:var(--accent)">' + esc(t('res.best')) + '</b>' : '') + (left === 1 && !perfect && G.goal >= 0 ? '<br>' + esc(t('res.goalHint')) : '');
  if (left === 1) SND.win(); else SND.soft();
  show('#resultOverlay');
}
function undo() {
  if (busy || !G.hist.length) return;
  const j = G.hist.pop(); G.over = false;
  const B = G.B, [f, o, to] = j, a = G.a.slice(); a[f] = 1; a[o] = 1; a[to] = 0; G.a = a;
  const pf = PEGS[to]; delete PEGS[to]; PEGS[f] = pf; pf.dataset.i = f;
  const k = G.hist.length, gm = GROOVE[k]; GROOVE.length = k;
  if (gm) { gm.remove(); }
  const po = addPeg(o); po.style.opacity = 0; anim(160, q => { po.style.opacity = q; }, () => { po.style.opacity = ''; });
  const x0 = pf._x, y0 = pf._y, x1 = X(B, f), y1 = Y(B, f);
  anim(180, q => { const e = ease(q); place(pf, x0 + (x1 - x0) * e, y0 + (y1 - y0) * e - Math.sin(q * Math.PI) * 14); }, () => place(pf, x1, y1));
  sel = -1; hintMarks = null; marks(); update(); save();
  if (puzzle && !puzzle.solved) { puzzle.failed = true; if (!G.over) pzStatus(t('pz.start')); }
}
function reset() { if (busy) return; G.a = G.a0.slice(); G.hist = []; G.over = false; sel = -1; hintMarks = null; build(); update(); save(); if (puzzle) { puzzle.solved = false; pzStatus(t('pz.start')); } }

/* ---------------------------------------------------------------- input: tap a marble then a hole, or drag it */
function holeAt(e) {
  const pt = SV.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(SV.getScreenCTM().inverse());
  let best = -1, bd = 1e9; G.B.cells.forEach((_, i) => { const d = Math.hypot(X(G.B, i) - p.x, Y(G.B, i) - p.y); if (d < bd) { bd = d; best = i; } });
  return { i: bd < 48 ? best : -1, x: p.x, y: p.y };
}
let drag = null;
function onDown(e) {
  if (busy || !G || G.over && !puzzle) { if (G && G.over && !busy) toast(t('msg.over')); return; }
  const h = holeAt(e); if (h.i < 0) { if (sel >= 0) { sel = -1; marks(); } return; }
  const B = G.B, legal = E.moves(B, G.a);
  if (sel >= 0) { const j = legal.find(m => m[0] === sel && m[2] === h.i); if (j) { userPlay(j); return; } }
  if (G.a[h.i]) {
    if (!legal.some(m => m[0] === h.i)) { sel = -1; marks(); toast(t('msg.stuck')); return; }
    sel = h.i; SND.pick(); marks();
    drag = { i: h.i, x0: h.x, y0: h.y, moved: false, id: e.pointerId }; try { SV.setPointerCapture(e.pointerId); } catch (x) {}
    return;
  }
  if (sel >= 0) { sel = -1; marks(); }
}
function onMove(e) {
  if (!drag || e.pointerId !== drag.id) return; const h = holeAt(e), p = PEGS[drag.i]; if (!p) return;
  if (!drag.moved && Math.hypot(h.x - drag.x0, h.y - drag.y0) < 16) return;
  drag.moved = true; place(p, h.x, h.y, 1.15); $('#pg').appendChild(p);
}
function onUp(e) {
  if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null; if (!d.moved) return;
  const h = holeAt(e), j = E.moves(G.B, G.a).find(m => m[0] === d.i && m[2] === h.i), p = PEGS[d.i];
  if (j) { place(p, X(G.B, d.i), Y(G.B, d.i)); userPlay(j); return; }
  const x0 = p._x, y0 = p._y, x1 = X(G.B, d.i), y1 = Y(G.B, d.i); anim(140, q => place(p, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, 1.15 - .15 * q));
}

/* ---------------------------------------------------------------- hints (the solver in a worker) */
let worker = null, jid = 0;
function solveAsync(a, target) {
  return new Promise(res => {
    try { if (!worker) worker = new Worker('engine.js?v=1'); } catch (e) { worker = null; }
    if (!worker) { res(E.findPath(G.B, a, { target, time: 3000 })); return; }
    const id = ++jid; const on = e => { if (e.data.id !== id) return; worker.removeEventListener('message', on); res(e.data); };
    worker.addEventListener('message', on); worker.postMessage({ id, board: G.board, pegs: a, target, time: 6000 });
  });
}
async function hint() {
  if (busy || !G) return;
  if (G.over) { toast(t('msg.over')); return; }
  if (puzzle) puzzle.hinted = true;
  // a puzzle still on its stored solution: its next jump at once
  if (puzzle && puzzle.P.s) { const S = parseSol(puzzle.P); if (G.hist.every((j, k) => S[k] && S[k][0] === j[0] && S[k][2] === j[2]) && S[G.hist.length]) { showHint(S[G.hist.length]); return; } }
  $('#btnHint').classList.add('on'); toast(t('msg.thinking'), 8000);
  const r = await solveAsync(G.a, G.goal); $('#btnHint').classList.remove('on');
  if (r.ok && r.path && r.path.length) { showHint(r.path[0]); return; }
  toast(r.sure ? t('msg.dead') : t('msg.unknown'), 3600);
}
function showHint(j) { sel = -1; hintMarks = j; marks(); toast(t('msg.hint', { a: E.sq(G.B, j[0]), b: E.sq(G.B, j[2]) }), 2600); }
function parseSol(P) { const B = E.BOARDS[P.b]; return P.s.split(' ').filter(Boolean).map(x => { const [f, to] = x.split('.').map(Number); const j = B.jumps.find(m => m[0] === f && m[2] === to); return j; }); }

/* ---------------------------------------------------------------- the panel */
function boardName(id) { return t('bd.' + id); }
function update() {
  if (!G) return;
  const left = G.a.reduce((s, v) => s + v, 0), legal = E.moves(G.B, G.a).length;
  $('#stBoard').textContent = boardName(G.board);
  $('#stMode').textContent = puzzle ? (puzzle.daily ? t('daily.title') : t('pz.mode')) : t('mode.free');
  $('#stLeft').textContent = left; $('#stUnit').textContent = t('st.unit');
  $('#stMoves').textContent = t('st.moves', { n: G.hist.length });
  $('#stGoal').innerHTML = G.goal >= 0 ? `<i></i>${esc(t('st.goal'))}` : esc(t('st.any'));
  $('#stMsg').innerHTML = G.over ? `<span class="${left === 1 ? 'ok' : 'ng'}">${esc(left === 1 ? t('st.done1') : t('st.done', { n: left }))}</span>` : esc(t('st.legal', { n: legal }));
  $('#btnUndo').disabled = !G.hist.length; $('#btnReset').disabled = !G.hist.length;
  if (HB && HB.info) HB.info.innerHTML = `<span class="hb-chip"><b>${esc(boardName(G.board))}</b></span><span class="hb-chip">${esc(t('st.left', { n: left }))}</span><span class="hb-chip">${esc(t('st.moves', { n: G.hist.length }))}</span>`;
  if (puzzle) pzButtons();
}
function renderRecs() {
  $('#recList').innerHTML = E.IDS.map(id => {
    const B = E.BOARDS[id], r = recs[id + ':' + E.startHole(id)];
    return `<div class="rec-row">${boardSVG(B, E.startPos(B, E.startHole(id)), { simple: true })}<span class="nm">${esc(boardName(id))}</span>${r && r.perfect ? `<span class="pf">${esc(t('rec.perfect'))}</span>` : ''}<span class="bv">${r ? r.best : '—'}</span></div>`;
  }).join('');
}
let toastT = 0;
function toast(m, ms) { const el = $('#toast'); el.textContent = m; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms || 2000); }
function show(s) { $(s).classList.add('show'); }
function hide(s) { $(s).classList.remove('show'); }

/* ---------------------------------------------------------------- games */
function goalFor(B, start, mode) {
  if (mode === 'any') return -1;
  const id = B.id;
  if (start === E.startHole(id)) return E.goalHole(id);
  const a = E.startPos(B, start);
  if (E.canEnd(B, a, start)) return start;
  const ok = B.cells.map((_, i) => i).filter(i => E.canEnd(B, a, i)).sort((x, y) => B.dist[x] - B.dist[y]);
  return ok.length ? ok[0] : -1;
}
function newGame(board, start, goalMode) {
  const B = E.BOARDS[board]; if (start < 0 || start === undefined) start = E.startHole(board);
  const a0 = E.startPos(B, start);
  G = { board, B, start, goal: goalFor(B, start, goalMode), a: a0.slice(), a0, hist: [], over: false };
  puzzle = null; document.body.classList.remove('in-puzzle');
  build(); update(); save();
}

/* ---------------------------------------------------------------- the new-game dialog */
let draft = null;
function openNew() {
  draft = { board: G ? G.board : settings.board, startMode: settings.startMode, start: G && G.board === settings.board ? G.start : -1, goalMode: settings.goalMode };
  renderNew(); show('#newOverlay');
}
function renderNew() {
  $('#ngBoards').innerHTML = E.IDS.map(id => { const B = E.BOARDS[id]; return `<button class="ngt-gcard${draft.board === id ? ' sel' : ''}" data-b="${id}"><span class="gart">${boardSVG(B, E.startPos(B, E.startHole(id)), { simple: true })}</span><b>${esc(boardName(id))}</b><p>${esc(t('bd.' + id + '.d'))}</p></button>`; }).join('');
  $$('#segStart button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.startMode));
  $$('#segGoal button').forEach(b => b.classList.toggle('sel', b.dataset.v === draft.goalMode));
  const B = E.BOARDS[draft.board], st = draft.startMode === 'pick' && draft.start >= 0 ? draft.start : E.startHole(draft.board);
  $('#ngPrev').innerHTML = boardSVG(B, E.startPos(B, st), { goal: goalFor(B, st, draft.goalMode) });
  $('#ngStartNote').textContent = draft.startMode === 'pick' ? t('ng.pick.note') : t('ng.classic.note.' + draft.board);
  $('#ngGoalNote').textContent = draft.goalMode === 'any' ? t('ng.goal.any.note') : t('ng.goal.hole.note');
  $('#bdRow').innerHTML = BD.map(k => `<button data-bd="${k}" class="${settings.bd === k ? 'sel' : ''}">${designSwatch(k)}${esc(t('dz.bd.' + k))}</button>`).join('');
  $('#pgRow').innerHTML = PG.map(k => `<button data-pg="${k}" class="${settings.pg === k ? 'sel' : ''}">${pegSwatch(k)}${esc(t('dz.pg.' + k))}</button>`).join('');
}
const WOODS = { walnut: '--wood1:#8a5532;--wood2:#5a321a;--wood3:#3a1e0e;--grain:rgba(255,220,180,.10);--hole:#1c0e06;--rim:#c99a5a', maple: '--wood1:#e2bd84;--wood2:#c0905a;--wood3:#8a5e30;--grain:rgba(120,70,20,.12);--hole:#5b3818;--rim:#f3dcae',
  stone: '--wood1:#d6d1c8;--wood2:#a29c92;--wood3:#6f6a62;--grain:rgba(60,55,50,.10);--hole:#2f2b27;--rim:#efe9de', night: '--wood1:#3a2a55;--wood2:#22173a;--wood3:#120b20;--grain:rgba(200,170,255,.07);--hole:#07040d;--rim:#e2bd6a' };
function designSwatch(bd) {   // the English board in that design
  const B = E.BOARDS.english; return `<span class="sw" style="display:block">${boardSVG(B, E.startPos(B, B.center), { simple: true, look: bd })}</span>`;
}
function pegSwatch(pg) { const id = 'ps' + (uid++); return `<svg viewBox="-60 -60 120 120">${defs(id)}<g transform="translate(-22 -10) scale(.9)">${marble(id, 2, pg)}</g><g transform="translate(24 16) scale(.9)">${marble(id, 4, pg)}</g></svg>`; }
$('#ngBoards').onclick = e => { const b = e.target.closest('[data-b]'); if (!b) return; draft.board = b.dataset.b; draft.start = -1; renderNew(); };
$('#segStart').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; draft.startMode = b.dataset.v; if (b.dataset.v === 'classic') draft.start = -1; renderNew(); };
$('#segGoal').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; draft.goalMode = b.dataset.v; renderNew(); };
$('#ngPrev').onclick = e => {   // pick the start hole on the preview
  if (draft.startMode !== 'pick') { draft.startMode = 'pick'; }
  const svg = $('#ngPrev svg'), pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(svg.getScreenCTM().inverse());
  const B = E.BOARDS[draft.board]; let best = -1, bd = 1e9; B.cells.forEach((_, i) => { const d = Math.hypot(X(B, i) - p.x, Y(B, i) - p.y); if (d < bd) { bd = d; best = i; } });
  if (bd < 50) { draft.start = best; renderNew(); }
};
$('#bdRow').onclick = e => { const b = e.target.closest('[data-bd]'); if (!b) return; settings.bd = b.dataset.bd; document.documentElement.dataset.bd = settings.bd; save(); if (G) build(); renderRecs(); renderNew(); };
$('#pgRow').onclick = e => { const b = e.target.closest('[data-pg]'); if (!b) return; settings.pg = b.dataset.pg; document.documentElement.dataset.pg = settings.pg; save(); if (G) build(); renderRecs(); renderNew(); };
$('#btnCancelNew').onclick = () => hide('#newOverlay');
$('#btnStartNew').onclick = () => {
  settings.board = draft.board; settings.startMode = draft.startMode; settings.goalMode = draft.goalMode; save();
  hide('#newOverlay'); newGame(draft.board, draft.startMode === 'pick' ? draft.start : -1, draft.goalMode);
};

/* ---------------------------------------------------------------- puzzles (PZBook) */
let PUZZLES = null, DAILY = null;
// the collection: 基本 (first steps, shapes) · 世界の盤 (a theme per board) · 全面 (full boards)
const pzReady = fetch('puzzles.json?v=2').then(r => r.json()).then(d => {
  const by = id => (d.themes.find(T => T.id === id) || { list: [] }).list, out = [];
  out.push({ id: 'first', grp: 'basic', list: by('first') }, { id: 'shape', grp: 'basic', list: by('shape') }, { id: 'mid', grp: 'basic', list: by('mid') }, { id: 'chain', grp: 'basic', list: by('chain') });
  for (const b of ['triangle', 'french', 'diamond', 'german']) out.push({ id: 'w-' + b, grp: 'world', board: b, list: by('world').filter(P => P.b === b) });
  out.push({ id: 'full', grp: 'full', list: by('full') });
  PUZZLES = { themes: out.filter(T => T.list.length) }; return PUZZLES;
}).catch(() => null);
const thName = T => T.board ? boardName(T.board) : t('pz.th.' + T.id), thSub = T => T.board ? t('pz.wb.sub', { b: boardName(T.board) }) : t('pz.th.' + T.id + '.sub');
const GRPS = ['basic', 'world', 'full'];
const dlReady = fetch('daily.json?v=2').then(r => r.json()).then(d => { DAILY = d; return d; }).catch(() => null);
const PZ_IC = { mid: '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.4"/><circle cx="12" cy="12" r="2.4"/><circle cx="18" cy="12" r="2.4"/><circle cx="12" cy="6" r="2.4"/><circle cx="12" cy="18" r="2.4"/></svg>', chain: '<svg viewBox="0 0 24 24"><circle cx="5" cy="17" r="2.4"/><path d="M6.5 14.5C8 9 11 9 12 13M12.5 12C14 6.5 17 6.5 18.5 11"/><path d="M17 9.5l1.6 1.8 1.9-1.5"/></svg>', basic: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/></svg>', first: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/></svg>', shape: '<svg viewBox="0 0 24 24"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></svg>', world: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>', full: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/></svg>' };
const pzKey = (T, j) => T.id + ':' + j;
const pzRecs = (T, m) => T.list.map((_, j) => (m || pzRecMap())[pzKey(T, j)] || 0);
const tierOf = i => [0, 2, 1, 2, 3, 4, 5][i] || 1;
const pzArr = P => P.p.split('').map(Number);
function pzThumb(P) { return boardSVG(E.BOARDS[P.b], pzArr(P), { simple: true, goal: P.t }); }
function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dailyIdx(date) { const d = new Date(date + 'T00:00:00'), y0 = new Date(d.getFullYear(), 0, 0); return Math.floor((d - y0) / 864e5) % 366; }
function dailyInfo() { let o = {}; try { o = JSON.parse(localStorage.getItem(DLS) || '{}') || {}; } catch (e) {} o.days = o.days || {}; const y = new Date(); y.setDate(y.getDate() - 1); const yd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0'); return { today: !!o.days[today()], streak: o.days[today()] || o.days[yd] ? o.streak || 0 : 0, best: o.best || 0, o }; }
function easyDone(d) { let o = {}; try { o = JSON.parse(localStorage.getItem(DLS) || '{}') || {}; } catch (e) {} return !!(o.easy && o.easy[d || today()]); }
function dailyDone(kind) {
  if (kind === 'e') { let o = {}; try { o = JSON.parse(localStorage.getItem(DLS) || '{}') || {}; } catch (e) {} o.easy = o.easy || {}; o.easy[today()] = 1; try { localStorage.setItem(DLS, JSON.stringify(o)); } catch (e) {} return; }
  const i = dailyInfo(), o = i.o, d = today(); if (o.days[d]) return;
  const y = new Date(); y.setDate(y.getDate() - 1); const yd = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  o.streak = o.days[yd] ? (o.streak || 0) + 1 : 1; o.best = Math.max(o.best || 0, o.streak); o.days[d] = 1; o.last = d;
  try { localStorage.setItem(DLS, JSON.stringify(o)); } catch (e) {}
}
function renderDaily() { const i = dailyInfo(); $('#dailySub').textContent = t('daily.sub', { n: i.streak }); $('#dailySt').textContent = i.today ? '✓' : ''; const e = $('#dailyEasy'); if (e) e.classList.toggle('ok', easyDone()); }
async function openPuzzles() {
  const d = await pzReady; if (!d) { toast(t('msg.loadfail')); return; }
  PZBook.setLang(LANG);
  const m = pzRecMap(), Ts = d.themes, idx = Ts.map((_, i) => i);
  let cur = ''; try { cur = localStorage.getItem(PZ_TAB) || ''; } catch (e) {} if (!GRPS.includes(cur)) cur = GRPS[0];
  const cont = PZBook.resume(idx.map(i => ({ key: String(i), recs: pzRecs(Ts[i], m), cat: Ts[i].grp })), PZ_LAST);
  await dlReady; const di = dailyInfo(), dp = DAILY && DAILY.list[dailyIdx(today())], dpe = DAILY && DAILY.easy && DAILY.easy[dailyIdx(today())];
  const box = $('#pzLevels');
  box.innerHTML = PZBook.home({
    title: t('pz.title'), lead: t('pz.lead'), all: idx.map(i => pzRecs(Ts[i], m)),
    cont: cont && { key: cont.key + ':' + cont.j, no: cont.j + 1, name: thName(Ts[+cont.key]) },
    daily: [dpe && { key: 'e', board: pzThumb(dpe), title: '★ ' + t('daily.title') + ' · EASY', date: today().slice(5).replace('-', '/'), done: easyDone(), go: t('daily.go'), sub: `${boardName(dpe.b)} · ${t('pz.goal', { n: dpe.n })}` },
      dp && { key: 'n', board: pzThumb(dp), title: '★ ' + t('daily.title'), date: today().slice(5).replace('-', '/'), done: di.today, go: t('daily.go'), sub: `${boardName(dp.b)} · 🔥 ${t('daily.streak', { n: di.streak })}` }].filter(Boolean),
    cats: GRPS.map(g => { const r = Ts.filter(T => T.grp === g).map(T => pzRecs(T, m)).flat(); return { key: g, icon: PZ_IC[g === 'basic' ? 'basic' : g], name: t('pz.grp.' + g), done: r.filter(x => x > 0).length, total: r.length }; }),
    cur, catDesc: t('pz.grp.' + cur + '.sub'),
    cards: idx.filter(i => Ts[i].grp === cur).map(i => { const T = Ts[i], r = pzRecs(T, m), nx = Math.max(0, PZBook.nextIndex(r)); return { key: i, badge: PZ_IC[T.board ? 'world' : T.id], name: thName(T), desc: thSub(T), recs: r, tier: tierOf(i), board: pzThumb(T.list[nx]) }; }),
  });
  PZBook.bindHome(box, {
    cat: k => { try { localStorage.setItem(PZ_TAB, k); } catch (e) {} openPuzzles(); },
    cont: x => { const [i, j] = x.split(':'); startPuzzle(+i, +j); },
    daily: k => startDaily(k === 'e' ? 'e' : 'n'),
    card: i => openPzGrid(+i),
  });
  learn('puzzle', '#pzListView');
}
let pzLevel = 0;
function openPzGrid(i, cur) {
  pzLevel = i; const T = PUZZLES.themes[i]; PZBook.setLang(LANG);
  $('#pzLevelHead').innerHTML = PZBook.ghead({ badge: PZ_IC[T.board ? 'world' : T.id], name: thName(T), desc: thSub(T), chips: [t('pz.grp.' + T.grp), PZBook.t('count', { n: T.list.length })], tier: tierOf(i) });
  $('#pzGrid').innerHTML = PZBook.grid({ recs: pzRecs(T), cur });
  $('#pzGrid').querySelectorAll('.pb-tile[data-j]').forEach(el => { const P = T.list[+el.dataset.j]; if (P) el.insertAdjacentHTML('afterbegin', `<span class="th">${pzThumb(P)}</span>`); });
  learn('puzzle', '#pzGridView');
}
$('#pzGrid').onclick = e => { const b = e.target.closest('[data-j]'); if (!b) return; if (b.getAttribute('aria-disabled')) { toast(PZBook.t('locked')); return; } startPuzzle(pzLevel, +b.dataset.j); };
$('#pzBack').onclick = () => openPuzzles();
$('#pzClose').onclick = $('#pzClose2').onclick = () => hide('#puzzleOverlay');
function enterPuzzle(P, pz) {
  hide('#puzzleOverlay'); hide('#resultOverlay');
  if (!puzzle) save();   // the free game stays saved
  const B = E.BOARDS[P.b], a0 = pzArr(P);
  G = { board: P.b, B, start: -1, goal: P.t, a: a0.slice(), a0, hist: [], over: false };
  puzzle = Object.assign({ P, hinted: false, failed: false, answered: false, solved: false }, pz);
  document.body.classList.add('in-puzzle'); sel = -1; hintMarks = null;
  build(); update(); renderPuzzleCard(); pzStatus(t('pz.start'));
}
window.__pegDbg = { startPuzzle: (i, j) => startPuzzle(i, j), userPlay: j => userPlay(j), G: () => G, E: () => E };   // (tests)
function startPuzzle(i, j) { const T = PUZZLES.themes[i]; PZBook.lastSet(PZ_LAST, i); enterPuzzle(T.list[j], { L: i, j, T, daily: null }); }
async function startDaily(kind) { await dlReady; if (!DAILY) return; const d = today(), e = kind === 'e' && DAILY.easy; enterPuzzle((e ? DAILY.easy : DAILY.list)[dailyIdx(d)], { daily: d, dk: e ? 'e' : 'n' }); }
// the puzzle card's buttons: the same set, order and look as 詰将棋 (shogi, 2026-11-10) — ヒント・やり直し・答え・一覧 as icons with a
// small caption, a wide 「次の問題 ›」, and やめる at the top right
const PZ_CAP = {   // hint, retry, answer, list, quit
  ja: ['ヒント', 'やり直し', '答え', '一覧', 'やめる'], en: ['Hint', 'Retry', 'Answer', 'List', 'Quit'], zh: ['提示', '重试', '答案', '列表', '退出'], 'zh-TW': ['提示', '重試', '答案', '列表', '退出'],
  ko: ['힌트', '다시', '정답', '목록', '그만'], es: ['Pista', 'Otra vez', 'Solución', 'Lista', 'Salir'], fr: ['Indice', 'Rejouer', 'Solution', 'Liste', 'Quitter'], pt: ['Dica', 'De novo', 'Solução', 'Lista', 'Sair'],
  de: ['Tipp', 'Nochmal', 'Lösung', 'Liste', 'Beenden'], hi: ['संकेत', 'फिर से', 'उत्तर', 'सूची', 'छोड़ें'], ar: ['تلميح', 'أعد', 'الحل', 'القائمة', 'خروج'], ru: ['Подсказка', 'Ещё раз', 'Ответ', 'Список', 'Выйти'],
  id: ['Petunjuk', 'Ulangi', 'Jawaban', 'Daftar', 'Keluar'], tr: ['İpucu', 'Tekrar', 'Çözüm', 'Liste', 'Çık'] };
function renderPuzzleCard() {
  const p = puzzle; if (!p) return;
  const C = PZ_CAP[LANG] || PZ_CAP.en;
  ['#pzHint', '#pzRetry', '#pzAnswer', '#pzList'].forEach((k, i) => { $(k + ' span').textContent = C[i]; });
  $('#pzQuitL').textContent = C[4];
  $('#pzStep').textContent = p.daily ? `★ ${t('daily.title')}${p.dk === 'e' ? ' · EASY' : ''} · ${p.daily.slice(5).replace('-', '/')}` : `${thName(p.T)} · ${PZBook.t('stage', { n: Math.floor(p.j / PZBook.STAGE) + 1 })} · No.${p.j + 1}`;
  $('#pzTitle').textContent = p.P.k && p.P.k !== 'sym' ? t('shape.' + p.P.k) : t('pz.goal', { n: p.P.n });
  $('#pzNo').textContent = p.T ? `${p.j + 1}/${p.T.list.length}` : '';
  const st = p.daily ? ((p.dk === 'e' ? easyDone() : dailyInfo().today) ? 3 : 0) : (pzRecMap()[pzKey(p.T, p.j)] || 0);
  $('#pzStars').textContent = '★'.repeat(st) + '☆'.repeat(3 - st);
  pzButtons();
}
function pzButtons() {
  const p = puzzle; if (!p) return;
  $('#pzNext').disabled = !!p.daily || !p.T || p.j + 1 >= p.T.list.length || !(p.solved || p.answered || PZBook.isOpen(pzRecs(p.T), p.j + 1));
  $('#pzNext').classList.toggle('go', !!(p.solved || p.answered));
  $('#pzRetry').disabled = busy || (!G.hist.length && !G.over);
  $('#pzHint').disabled = busy || G.over || !!p.answered;
  $('#pzAnswer').disabled = busy || !!p.answered;
}
function pzStatus(h) { $('#pzStatus').innerHTML = h; }
function puzzleEnd(left, onGoal) {
  const p = puzzle;
  if (left === 1 && onGoal) {
    p.solved = true; SND.win();
    const stars = PZBook.starsFor(p);
    if (p.daily) { dailyDone(p.dk); renderDaily(); pzStatus(`<b class="ok">${esc(t('pz.solved'))}</b> 🔥 ${esc(t('daily.streak', { n: dailyInfo().streak }))}`); }
    else {
      const m = pzRecMap(), k = pzKey(p.T, p.j), before = pzRecs(p.T, m); if (!m[k] || m[k] < stars) m[k] = stars;
      try { localStorage.setItem(PZS, JSON.stringify(m)); } catch (e) {}
      const after = pzRecs(p.T, m), ev = PZBook.events(before, after, p.j);
      pzStatus(`<b class="ok">${esc(t('pz.solved'))}</b>` + PZBook.solved({ stars, recs: after, j: p.j, events: ev }));
    }
    renderPuzzleCard(); return;
  }
  // not there: said only now (nothing is called out on the way — common rule), then a retry or a step back
  p.failed = true; SND.soft();
  pzStatus(`<b class="ng">${esc(left === 1 ? t('pz.offgoal') : t('pz.stuck', { n: left }))}</b><br>${esc(t('pz.tryagain'))}`);
}
async function showAnswer() {
  if (!puzzle || busy) return; puzzle.answered = true;
  reset(); const S = parseSol(puzzle.P); busy = true;
  for (const j of S) { await new Promise(r => setTimeout(r, 260)); await play(j, true); }
  busy = false; G.over = true; update(); pzStatus(esc(t('pz.shown')));
}
$('#pzHint').onclick = () => hint();
$('#pzRetry').onclick = () => { if (puzzle) { puzzle.failed = puzzle.failed || G.hist.length > 0; reset(); } };
$('#pzAnswer').onclick = showAnswer;
$('#pzNext').onclick = () => { if (puzzle && puzzle.T) startPuzzle(puzzle.L, puzzle.j + 1); };
$('#pzList').onclick = () => { if (puzzle && puzzle.T) openPzGrid(puzzle.L, puzzle.j); else openPuzzles(); };
function quitPuzzle() { puzzle = null; document.body.classList.remove('in-puzzle'); loadSaved(); }
$('#pzQuit').onclick = quitPuzzle;
// the title (top left): back to this game's top — dialogs closed, a puzzle left, the free game on the board (as chess / shogi)
function backToBoard() { $$('.overlay.show').forEach(o => o.classList.remove('show')); if (puzzle) quitPuzzle(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
{ const h = $('.brand h1.to-board'); if (h) { h.addEventListener('click', backToBoard); h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); backToBoard(); } }); } }
// ルール | パズル: one box; a tab switches the page inside it (no second dialog, so nothing flashes)
function selTab(v) { $$('.ls-tabs').forEach(g => g.querySelectorAll('button').forEach(b => b.classList.toggle('sel', b.dataset.v === v))); }
function learn(v, view) {
  if (v !== 'rules' && window.PegRules) PegRules.stop();
  ['#rulesView', '#pzListView', '#pzGridView'].forEach(x => { $(x).hidden = x !== (v === 'rules' ? '#rulesView' : view); });
  selTab(v); show('#puzzleOverlay');
}
$$('.ls-tabs').forEach(g => g.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.classList.contains('sel')) return;
  if (b.dataset.v === 'rules') window.PegRules && PegRules.open(); else openPuzzles();
}));
$('#dailyGo').onclick = () => startDaily('n');
if ($('#dailyEasy')) $('#dailyEasy').onclick = () => startDaily('e');
function loadSaved() {
  let g = null; try { const d = JSON.parse(localStorage.getItem(STORE) || '{}'); if (d.game && E.BOARDS[d.game.board]) g = gameFrom(d.game); } catch (e) {}
  if (g) { G = g; G.over = !E.moves(G.B, G.a).length; build(); update(); } else newGame(settings.board, -1, settings.goalMode);
}

/* ---------------------------------------------------------------- the rest of the UI */
$('#btnNew').onclick = openNew;
$('#btnUndo').onclick = undo;
$('#btnReset').onclick = reset;
$('#btnHint').onclick = hint;
$('#btnPuzzle').onclick = openPuzzles;
$('#btnRules').onclick = () => window.PegRules && PegRules.open();
$('#resUndo').onclick = () => { hide('#resultOverlay'); undo(); };
$('#resAgain').onclick = () => { hide('#resultOverlay'); reset(); };
$('#resNew').onclick = () => { hide('#resultOverlay'); openNew(); };
['#newOverlay', '#resultOverlay', '#puzzleOverlay'].forEach(s => $(s).addEventListener('click', e => { if (e.target === $(s)) { if (s === '#puzzleOverlay' && window.PegRules) PegRules.stop(); hide(s); } }));
$('#btnSound').onclick = () => { settings.sound = !settings.sound; $('#btnSound').classList.toggle('off', !settings.sound); save(); };
$('#btnSound').classList.toggle('off', !settings.sound);
document.addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  if ($$('.overlay.show').length) { if (e.key === 'Escape') $$('.overlay.show').forEach(o => o.classList.remove('show')); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' || e.key === 'Backspace' || e.key === 'ArrowLeft') { e.preventDefault(); undo(); }
  else if (e.key === 'h') hint();
});
function applyI18n() {
  document.documentElement.lang = LANG; document.documentElement.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.title = t('title') + ' — ' + t('series');
  $('#langSel').value = LANG;
}
$('#langSel').onchange = e => { LANG = e.target.value; settings.lang = LANG; try { localStorage.setItem('aicoding-lang', LANG); } catch (x) {} save(); applyI18n(); update(); renderRecs(); renderDaily(); if (puzzle) renderPuzzleCard(); if (HB && HB.relabel) HB.relabel(); };

if (window.GameRecord) GameRecord.init({ game: 'peg', lang: () => LANG, menu: '.controls', variant: () => ({ k: G ? G.board : settings.board, n: boardName(G ? G.board : settings.board) }), variants: () => E.IDS, variantName: k => boardName(k), defVariant: 'english' });
const HB = window.HeaderBar ? HeaderBar.init({ brand: '.brand', controls: '.controls', order: ['#btnNew', '#btnUndo', '#btnReset', '#btnHint', '#btnRules', '#btnPuzzle'], lang: () => LANG }) : null;
if (window.RulesOffer) RulesOffer.init({ game: 'peg', lang: () => LANG, open: () => window.PegRules && PegRules.open(), watch: '#puzzleOverlay' });
applyI18n();
const svgEl = () => $('#board');
$('#board').addEventListener('pointerdown', e => { if (SV) onDown(e); });
$('#board').addEventListener('pointermove', e => { if (SV) onMove(e); });
$('#board').addEventListener('pointerup', e => { if (SV) onUp(e); });
$('#board').addEventListener('pointercancel', e => { if (SV) onUp(e); });
if (G) { G.over = !E.moves(G.B, G.a).length; build(); update(); } else newGame(settings.board, -1, settings.goalMode);
renderRecs(); renderDaily(); dlReady.then(renderDaily);
// ?pz=<theme>:<j> / ?daily: open straight into a puzzle (the portal's links)
{ const q = new URLSearchParams(location.search); if (q.has('daily')) startDaily(q.get('daily') === 'easy' ? 'e' : 'n'); else if (q.get('mode') === 'puzzle') pzReady.then(() => openPuzzles()); }

window.PegApp = { learn, get G() { return G; }, get puzzle() { return puzzle; }, t, get LANG() { return LANG; }, boardSVG, marble, defs, geo, X, Y, E, newGame, startPuzzle, startDaily, openPuzzles, undo, hint, play: j => userPlay(j), show, hide, SND };
})();
