// ラインズ・オブ・アクション (loa/) — page logic. Black = 1 (moves first), White = 2. The AI thinks in worker.js.
'use strict';
const E = window.LoaEngine, LB = window.LoaBoard;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const STORE = 'aicoding-loa', SUPPORTED = ['ja', 'en'], DESIGNS = ['walnut', 'slate', 'felt', 'paper'], VER = '1';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function detectLang() { const n = (navigator.language || 'ja').toLowerCase(); return n.startsWith('ja') ? 'ja' : 'en'; }
let S = { variant: 'std', mode: 'ai', side: 'black', level: 5, design: 'walnut', sound: true, lang: null };
let G = null;       // { st, variant, mode: 'ai' | 'pvp', human: 1 | 2 | 0, level, evals: [P(black wins) per ply], resigned: 0 | colour, recorded, sel, info, hint, busy, anim, token }
let saved = null, token = 0;
try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); if (saved && saved.settings) Object.assign(S, saved.settings); } catch (e) {}
try { if (localStorage.getItem('atlas-sfx') === '0') S.sound = false; } catch (e) {}
if (!E.VARIANTS.includes(S.variant)) S.variant = 'std'; if (!DESIGNS.includes(S.design)) S.design = 'walnut'; S.level = Math.max(1, Math.min(20, S.level | 0)) || 5;
let LANG = SUPPORTED.includes(S.lang) ? S.lang : detectLang();
window.LoaApp = { lang: () => LANG };

function t(k, v) { let s = (LOA_I18N[LANG] && LOA_I18N[LANG][k]); if (s == null) s = LOA_I18N.en[k]; if (s == null) return k; if (v && typeof s === 'string') for (const x in v) s = s.replace('{' + x + '}', v[x]); return s; }
const tier = lv => t('tier')[Math.min(4, (lv - 1) / 4 | 0)];
const PCQ = matchMedia('(hover: hover) and (pointer: fine)');
const colorName = c => t(c === 1 ? 'black' : 'white');

// ---------- sound (Web Audio, no files) ----------
let AC = null;
function ac() { if (!S.sound) return null; try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { return null; } return document.hidden ? null : AC; }
function tone(f0, f1, dur, type, vol, when) { const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t0 = a.currentTime + (when || 0); o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol || .2, t0 + .008); g.gain.exponentialRampToValueAtTime(.0008, t0 + dur); o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + .03); }
function noise(dur, freq, q, vol, when, type) { const a = ac(); if (!a) return; const n = a.sampleRate * dur | 0, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); s.buffer = b; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q || 1; g.gain.value = vol || .3; s.connect(f).connect(g).connect(a.destination); s.start(a.currentTime + (when || 0)); }
const SFX = {
  pick: () => tone(880, 760, .05, 'triangle', .06),
  move: () => { noise(.09, 900, 1.2, .5, .2); tone(210, 120, .12, 'sine', .28, .2); },
  cap: () => { noise(.12, 1500, 1, .55, .2); tone(260, 90, .2, 'triangle', .3, .2); tone(1300, 900, .08, 'sine', .07, .23); },
  bad: () => tone(200, 150, .14, 'square', .05),
  hint: () => { tone(1320, 1300, .3, 'sine', .07); tone(1760, 1740, .3, 'sine', .04, .12); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, .32, 'triangle', .14, i * .13)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, f * .97, .42, 'sine', .14, i * .2)),
};
const sfx = k => { try { SFX[k] && SFX[k](); } catch (e) {} };
document.addEventListener('visibilitychange', () => { if (AC) { try { document.hidden ? AC.suspend() : AC.resume(); } catch (e) {} } });

// ---------- workers: 'ai' plays the moves, 'aux' does the hint and the 形勢 ----------
const WK = { ai: null, aux: null }, pend = new Map(); let jobSeq = 0, noWorker = false;
function worker(name) {
  if (noWorker) return null;
  if (!WK[name]) { try { const w = new Worker('worker.js?v=' + VER); w.onmessage = e => { const p = pend.get(e.data.id); if (p) { pend.delete(e.data.id); p(e.data); } }; w.onerror = () => { noWorker = true; WK[name] = null; for (const [id, p] of pend) { pend.delete(id); p(null); } }; WK[name] = w; } catch (e) { noWorker = true; return null; } }
  return WK[name];
}
function ask(name, type, extra) {
  const msg = Object.assign({ id: ++jobSeq, type, variant: G.variant, moves: G.st.ms.slice() }, extra), w = worker(name);
  return new Promise(res => {
    const local = () => setTimeout(() => { let r = null; try { r = E.job(msg); } catch (e) {} res(r); }, 30);
    if (!w) return local();
    pend.set(msg.id, r => { if (r && !r.error) res(r); else local(); }); w.postMessage(msg);
  });
}
function stopAI() { if (WK.ai) { try { WK.ai.terminate(); } catch (e) {} WK.ai = null; } }

// ---------- state ----------
const over = () => !!(G.st.winner || G.resigned);
const winner = () => G.resigned ? 3 - G.resigned : G.st.winner;        // 1 | 2 | 3 (draw) | 0
const myTurn = () => !over() && (G.mode === 'pvp' || G.st.turn === G.human);
function whyText() {
  const w = winner(); if (!w) return '';
  if (G.resigned) return t('why.resign', { l: colorName(G.resigned) });
  if (w === 3) return t('why.rep');
  return t('why.' + (G.st.why || 'connect'), { w: colorName(w), l: colorName(3 - w) });
}
function save() {
  const d = { settings: Object.assign({}, S, { lang: LANG }) };
  if (G) d.game = { variant: G.variant, mode: G.mode, human: G.human, level: G.level, moves: G.st.ms.slice(), evals: G.evals, resigned: G.resigned, recorded: !!G.recorded };
  try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) {}
}
function fresh(o) { return Object.assign({ st: null, variant: 'std', mode: 'ai', human: 1, level: 5, evals: [.5], resigned: 0, recorded: false, sel: -1, info: null, hint: null, busy: false, anim: null, token: ++token }, o); }
function restore() {
  const g = saved && saved.game; if (!g || !Array.isArray(g.moves)) return false;
  const variant = E.VARIANTS.includes(g.variant) ? g.variant : 'std', st = E.newGame(variant);
  for (const m of g.moves) if (!E.play(st, m)) return false;
  G = fresh({ st, variant, mode: g.mode === 'pvp' ? 'pvp' : 'ai', human: g.mode === 'pvp' ? 0 : (g.human === 2 ? 2 : 1), level: Math.max(1, Math.min(20, g.level | 0)) || 5,
    evals: Array.isArray(g.evals) ? g.evals.slice(0, st.ms.length + 1) : [.5], resigned: g.resigned === 1 || g.resigned === 2 ? g.resigned : 0, recorded: !!g.recorded });
  return true;
}
function newGame() {
  stopAI();
  const human = S.mode === 'pvp' ? 0 : S.side === 'white' ? 2 : S.side === 'random' ? (Math.random() < .5 ? 1 : 2) : 1;
  G = fresh({ st: E.newGame(S.variant), variant: S.variant, mode: S.mode, human, level: S.level });
  board.clear(); render(); save(); step();
}

// ---------- rendering ----------
let board = null;
function lastMove() { const n = G.st.ms.length; if (!n) return null; const m = G.st.ms[n - 1]; return { from: m & 63, to: (m >> 6) & 63 }; }
function renderBoard() {
  const w = winner();
  board.draw({ board: G.st.b, anim: G.anim, last: lastMove(), sel: G.sel, info: G.sel >= 0 ? G.info : null, hint: G.hint, win: w && w < 3 && !G.resigned ? w : 0 });
  G.anim = null;
}
function sideName(c) { return G.mode === 'pvp' ? colorName(c) : c === G.human ? t('you') : 'AI Lv.' + G.level; }
function renderPlayers() {
  const bot = G.mode === 'pvp' ? 1 : G.human, w = winner();
  [['#plTop', 3 - bot], ['#plBot', bot]].forEach(([id, c]) => {
    const el = $(id); el.querySelector('.disc').className = 'disc ' + (c === 1 ? 'b' : 'w');
    el.querySelector('.nm').textContent = sideName(c);
    el.querySelector('.ct').textContent = t('pl.ct', { n: G.st.cnt[c], g: E.groups(G.st, c).length });
    el.classList.toggle('turn', !over() && G.st.turn === c); el.classList.toggle('won', w === c);
  });
}
function renderStatus(msg) {
  let s = msg;
  if (!s) {
    if (over()) s = whyText();
    else if (G.hintWait) s = t('hint.wait');
    else if (G.mode === 'ai' && G.st.turn !== G.human) s = t('st.ai');
    else if (G.sel >= 0) s = G.info && G.info.some(x => x.ok) ? t('st.sel') : t('st.nomv');
    else if (G.hint) s = t('hint.best', { m: E.moveName(G.hint.m) });
    else s = G.mode === 'ai' ? t('st.you') : t('st.turn', { c: colorName(G.st.turn) });
  }
  $('#status').textContent = s;
  document.body.classList.toggle('thinking', !over() && (!!G.hintWait || (G.mode === 'ai' && G.st.turn !== G.human)));
}
function renderKifu() {
  const k = $('#kifu'), ms = G.st.ms;
  if (!ms.length) { k.innerHTML = `<div class="empty">${t('kifu.empty')}</div>`; return; }
  k.innerHTML = ms.map((m, i) => `<span class="k${m & 4096 ? ' x' : ''}"><em>${i + 1}</em><i class="s${i % 2 + 1}"></i>${E.moveName(m)}</span>`).join('');
  k.scrollTop = k.scrollHeight;
}
function renderEval() {
  const ev = G.evals || [], n = G.st.ms.length, me = G.mode === 'ai' ? G.human : 1, mine = p => me === 1 ? p : 1 - p; let p = null;
  for (let i = Math.min(n, ev.length - 1); i >= 0 && p == null; i--) if (ev[i] != null) p = ev[i];
  const w = winner(); if (w) p = w === 3 ? .5 : w === 1 ? 1 : 0;
  $('#evalText').textContent = p == null ? t('eval.none') : t(G.mode === 'ai' ? 'eval.you' : 'eval.black', { p: Math.round(mine(p) * 100) });
  $('#evalFill').style.width = (p == null ? 50 : mine(p) * 100) + '%';
  const pts = []; let last = .5; const N = Math.max(n, 1);
  for (let i = 0; i <= n; i++) { if (ev[i] != null) last = ev[i]; if (i === n && w) last = w === 3 ? .5 : w === 1 ? 1 : 0; pts.push((i / N * 300).toFixed(1) + ',' + (4 + (1 - mine(last)) * 44).toFixed(1)); }
  $('#graph').innerHTML = `<path d="M0 26H300" stroke="rgba(255,255,255,.22)" stroke-width="1" stroke-dasharray="3 4" vector-effect="non-scaling-stroke"/>` + (pts.length > 1 ? `<polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>` : '');
}
function canUndo() { const n = G.st.ms.length; if (!n) return false; return G.mode === 'pvp' || (G.human === 1 ? n >= 1 : n >= 2); }
function renderButtons() {
  $('#btnUndo').disabled = !canUndo();
  $('#btnResign').disabled = over();
  $('#btnHint').disabled = !(myTurn() && !G.busy);
  $('#btnHint').classList.toggle('on', !!G.hint);
  $('#btnSound').classList.toggle('off', !S.sound);
}
function applyDesign() { DESIGNS.forEach(d => document.body.classList.toggle('bd-' + d, S.design === d)); }
function render(msg) { applyDesign(); renderBoard(); renderPlayers(); renderStatus(msg); renderKifu(); renderEval(); renderButtons(); }

// ---------- 形勢: a short search after every move (the aux worker), as P(black wins) ----------
function queueEval() {
  const g = G, n = G.st.ms.length;
  if (over()) return;
  ask('aux', 'eval', { ms: 220 }).then(r => { if (!r || G !== g || r.n !== n || g.st.ms.length < n) return; const p = E.winProb(r.score); g.evals[n] = Math.round((r.turn === 1 ? p : 1 - p) * 1000) / 1000; if (g.st.ms.length === n) { renderEval(); save(); } });
}

// ---------- playing ----------
function applyMove(m) {
  const res = E.play(G.st, m); if (!res) { sfx('bad'); return false; }
  G.sel = -1; G.info = null; G.hint = null; G.hintWait = false; G.anim = { from: res.from, to: res.to };
  sfx(res.cap ? 'cap' : 'move');
  G.evals.length = Math.min(G.evals.length, G.st.ms.length);
  render(); save();
  if (over()) finish(); else { queueEval(); step(); }
  return true;
}
function step() { if (!over() && G.mode === 'ai' && G.st.turn !== G.human) aiTurn(); }
async function aiTurn() {
  const g = G, n = G.st.ms.length, t0 = performance.now(); G.busy = true; renderStatus(); renderButtons(); renderPlayers();
  const r = await ask('ai', 'move', { level: G.level });
  const wait = 650 - (performance.now() - t0); if (wait > 0) await sleep(wait);
  if (G !== g || g.st.ms.length !== n || over()) return;
  G.busy = false;
  if (!r || !r.move || !applyMove(r.move)) { const ms = E.legal(G.st); if (ms.length) applyMove(ms[0]); }
}
function finish() {
  const g = G, w = winner(); G.busy = false; G.hint = null; G.sel = -1; stopAI();
  render(); save();
  if (!G.recorded && G.mode === 'ai' && G.st.ms.length) { G.recorded = true; try { GameRecord.add({ mode: 'ai', res: w === 3 ? 'd' : w === G.human ? 'w' : 'l', side: G.human - 1, opp: 'AI Lv.' + G.level, key: 'ai:' + G.level, n: G.st.ms.length, why: G.resigned ? Resign.label(LANG) : '', variant: G.variant }); } catch (e) {} save(); }
  setTimeout(() => { if (G !== g || !over() || $('#rulesOverlay').classList.contains('show')) return; sfx(G.mode === 'ai' && w !== G.human && w !== 3 ? 'lose' : 'win'); showResult(); }, G.resigned ? 150 : 900);
}
function showResult() {
  const w = winner(), ai = G.mode === 'ai';
  $('#resultTitle').textContent = w === 3 ? t('res.draw') : ai ? t(w === G.human ? 'res.win' : 'res.lose') : t(w === 1 ? 'res.bwin' : 'res.wwin');
  $('#resultTitle').className = 'result-big ' + (w === 3 ? '' : !ai || w === G.human ? 'win' : 'lose');
  $('#resultSub').textContent = whyText();
  $('#resultRows').innerHTML = `<div><b>${t('res.moves')}</b><span>${t('res.n', { n: G.st.ms.length })}</span></div>` + [1, 2].map(c => `<div><b>${t('res.left', { c: sideName(c) + (ai ? '（' + colorName(c) + '）' : '') })}</b><span>${t('res.pcs', { n: G.st.cnt[c] })}</span></div>`).join('');
  $('#resultOverlay').classList.add('show');
}
function undo() {
  if (!canUndo()) return;
  stopAI(); G.token = ++token; G.busy = false; G.resigned = 0; G.hint = null; G.hintWait = false; G.sel = -1; G.info = null;
  $('#resultOverlay').classList.remove('show');
  if (G.mode === 'ai') { do { E.undo(G.st); } while (G.st.ms.length && G.st.turn !== G.human); } else E.undo(G.st);
  G.evals.length = Math.min(G.evals.length, G.st.ms.length + 1);
  sfx('pick'); board.clear(); render(); save(); step();
}
function resign() {
  if (over()) return;
  const go = () => { if (over()) return; stopAI(); G.resigned = G.mode === 'ai' ? G.human : G.st.turn; finish(); };
  if (window.Resign) Resign.confirm({ lang: LANG }).then(ok => { if (ok) go(); }); else go();
}
function hint() {
  if (!myTurn() || G.busy) return;
  if (G.hint) { G.hint = null; render(); return; }
  if (G.hintWait) return;
  const g = G, n = G.st.ms.length; G.hintWait = true; G.sel = -1; G.info = null; renderBoard(); renderStatus();
  ask('aux', 'hint', { ms: 700, depth: 10 }).then(r => { if (G !== g || g.st.ms.length !== n || !g.hintWait) return; g.hintWait = false; if (r && r.move) { g.hint = { from: r.move & 63, to: (r.move >> 6) & 63, m: r.move }; sfx('hint'); } render(); });
}
function tapSquare(s) {
  if (s < 0 || !myTurn() || G.busy) return;
  if (G.sel >= 0 && G.info) { const x = G.info.find(i => i.ok && i.to === s); if (x) { applyMove(G.sel | s << 6); return; } }
  if (G.st.b[s] === G.st.turn && G.sel !== s) { G.sel = s; G.info = E.lineInfo(G.st, s); sfx('pick'); }
  else { G.sel = -1; G.info = null; }
  renderBoard(); renderStatus();
}

// ---------- new-game dialog ----------
const thumb = k => LB.thumb('bd-' + k);
let ND = null;      // the dialog's working copy of the settings
function ngRender() {
  $('#varCards').innerHTML = E.VARIANTS.map(v => `<button type="button" class="ngt-gcard${ND.variant === v ? ' sel' : ''}" data-v="${v}"><span class="gart">${LB.art(E.startCells(v))}</span><b>${t('var.' + v)}</b><p>${t('var.' + v + '.d')}</p><span class="gpick"></span></button>`).join('');
  $$('#segMode button').forEach(b => b.classList.toggle('on', b.dataset.v === ND.mode));
  $$('#segSide button').forEach(b => b.classList.toggle('on', b.dataset.v === ND.side));
  $('#fLevel').classList.toggle('hidden', ND.mode !== 'ai'); $('#fSide').classList.toggle('hidden', ND.mode !== 'ai');
  $('#levelRange').value = ND.level; $('#levelName').innerHTML = `Lv.${ND.level}<small>${tier(ND.level)}</small>`;
  if (!$('#bdRow').children.length) $('#bdRow').innerHTML = DESIGNS.map(d => `<button type="button" data-v="${d}">${thumb(d)}<span></span></button>`).join('');
  $$('#bdRow button').forEach(b => { b.classList.toggle('on', b.dataset.v === ND.design); b.querySelector('span').textContent = t('bd.' + b.dataset.v); });
}
function openNew() { ND = { variant: S.variant, mode: S.mode, level: S.level, side: S.side, design: S.design }; ngRender(); $('#newOverlay').classList.add('show'); }
function closeNew() { $('#newOverlay').classList.remove('show'); }
$('#varCards').addEventListener('click', e => { const b = e.target.closest('.ngt-gcard'); if (!b) return; ND.variant = b.dataset.v; ngRender(); });
$('#segMode').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { ND.mode = b.dataset.v; ngRender(); } });
$('#segSide').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { ND.side = b.dataset.v; ngRender(); } });
$('#levelRange').addEventListener('input', e => { ND.level = +e.target.value; $('#levelName').innerHTML = `Lv.${ND.level}<small>${tier(ND.level)}</small>`; });
$('#bdRow').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ND.design = b.dataset.v; S.design = ND.design; ngRender(); applyDesign(); save(); });
$('#btnCancelNew').onclick = closeNew;
$('#btnStart').onclick = () => { Object.assign(S, ND); closeNew(); $('#resultOverlay').classList.remove('show'); newGame(); };
$('#newOverlay').addEventListener('click', e => { if (e.target === $('#newOverlay')) closeNew(); });

// ---------- wiring ----------
board = LB.mount($('#frame'));
board.svg.addEventListener('click', e => tapSquare(board.cellAt(e)));
board.svg.addEventListener('pointermove', e => { if (!PCQ.matches || G.sel < 0 || !G.info) return; const s = board.cellAt(e), x = G.info.find(i => i.ok && i.to === s); board.hot(x ? x.k : null); });
board.svg.addEventListener('pointerleave', () => board.hot(null));
$('#btnNew').onclick = openNew;
$('#btnUndo').onclick = undo;
$('#btnHint').onclick = hint;
$('#btnResign').onclick = resign;
$('#btnSound').onclick = () => { S.sound = !S.sound; try { localStorage.setItem('atlas-sfx', S.sound ? '1' : '0'); } catch (e) {} save(); renderButtons(); if (S.sound) sfx('pick'); };
$('#btnResClose').onclick = () => $('#resultOverlay').classList.remove('show');
$('#btnAgain').onclick = () => { $('#resultOverlay').classList.remove('show'); newGame(); };
$('#btnRules').onclick = () => window.LoaTour && LoaTour.open();
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeNew(); $('#resultOverlay').classList.remove('show'); } });

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
  if ($('#resultOverlay').classList.contains('show')) showResult();
  if (window.LoaTour) LoaTour.relabel();
}
$('#langSel').value = LANG;
$('#langSel').addEventListener('change', e => { LANG = SUPPORTED.includes(e.target.value) ? e.target.value : 'en'; applyLang(); save(); });

if (window.RulesOffer) RulesOffer.init({ game: 'loa', lang: () => LANG, open: () => { closeNew(); window.LoaTour && LoaTour.open(); }, watch: '#rulesOverlay' });
if (window.GameRecord) GameRecord.init({ game: 'loa', lang: () => LANG, menu: '.controls', sides: () => [t('black'), t('white')], variant: () => ({ k: G ? G.variant : 'std', n: t('var.' + (G ? G.variant : 'std')) }), variants: () => E.VARIANTS, variantName: k => t('var.' + k), defVariant: 'std' });
const HB = window.HeaderBar ? HeaderBar.init({ order: ['#btnNew', '#btnUndo', '#btnResign', '#btnHint', '#btnRules'], lang: () => LANG }) : null;

if (!restore()) G = fresh({ st: E.newGame(S.variant), variant: S.variant, mode: S.mode, human: S.mode === 'pvp' ? 0 : S.side === 'white' ? 2 : 1, level: S.level });
applyLang();
if (!over() && G.evals[G.st.ms.length] == null) queueEval();
step();
window.LoaApp.newGame = () => { $('#resultOverlay').classList.remove('show'); openNew(); };
