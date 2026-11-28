/* 国標麻将 — 盤面で学ぶチュートリアル（gbmj/tutorial.js）
   ポーカー・ブラックジャック・グアンダン・ライアーダイスのチュートリアルと同じ「光の枠＋吹き出し」の方式。決まった配牌の1局を本物の卓で打つ：
     あなた（親）：一二三萬 四五六筒 七八索 二三索 五五索 北 西（花牌の春は配牌で補充済み）
     → 北を切る → 右・向かいが捨てる → 上家（左）の九索をチーして 789索（花龍がそろう）→ 西を切って聴牌（一索10点・四索9点）
     → 右の人の四索でロン（花龍8＋無字1＝9点、花牌1点）→ 和了の内訳と支払い。
   吹き出しは、光の枠と説明が触れている物（see）を隠さない位置に置く。違う操作をしたら、その理由を吹き出しの中に出す。
   正解すると目安メーターが満ちて、少し待って自動で次へ。検査：node gbmj/tools/tutorial-test.js（台本どおりに進むか）。 */
(function () {
'use strict';
const A = window.GBApp, $ = s => document.querySelector(s);
const t = (k, v) => I18N.t(k, v), esc = s => A.esc(s);
const P = s => A.parseTiles(s);
// 牌の id を割り当てる（種類 → 未使用の id）
function mkIds() { const used = new Set(); return t => { for (let k = 0; k < 4; k++) if (!used.has(t * 4 + k)) { used.add(t * 4 + k); return t * 4 + k; } throw new Error('5th ' + t); }; }
const TILE = {};
function makeRound() {
  const id = mkIds();
  const hand = P('123m 456p 78s 23s 55s N W').map(id);
  TILE.N = hand[hand.length - 2]; TILE.W = hand[hand.length - 1];
  const b1 = P('E 4s').map(id), b2 = P('1p').map(id), b3 = P('9s').map(id);
  TILE.E = b1[0]; TILE.S4 = b1[1]; TILE.P1 = b2[0]; TILE.S9 = b3[0];
  // 残りから CPU の手（ほかの牌）と山
  const rest = [];
  const usedNow = new Set([...hand, ...b1, ...b2, ...b3]);
  for (let x = 0; x < 136; x++) if (!usedNow.has(x)) rest.push(x);
  // 決まった順に混ぜる（毎回同じ）
  const rnd = GB.rng(20261128); for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
  // CPU が一索・四索・九索・北・西を余計に持たないように（あなたの待ちと説明の数がずれないように）
  const avoid = new Set(P('1s 4s 9s').map(x => x));
  const take = n => { const out = []; for (let i = 0; i < rest.length && out.length < n; i++) if (!avoid.has(rest[i] >> 2)) out.push(rest.splice(i--, 1)[0]); return out; };
  const h1 = b1.concat(take(11)), h2 = b2.concat(take(12)), h3 = b3.concat(take(12));
  const r = new GBRound({ rand: GB.rng(7), dealer: 0, wind: 0 });
  const flowers = [136, 137, 138, 139, 140, 141, 142, 143];
  r.P[0].hand = hand.slice(); r.P[0].flowers = [flowers[0]];
  r.P[1].hand = h1; r.P[2].hand = h2; r.P[3].hand = h3;
  for (const Q of r.P) { Q.melds = []; Q.discards = []; Q.hand.sort((a, b) => a - b); }
  r.P[1].flowers = []; r.P[2].flowers = [flowers[4]]; r.P[3].flowers = [];
  // 山：前から CPU のツモ（4枚）、そのあとは残り（花牌は奥）
  const front = take(4), wall = front.concat(rest).concat(flowers.slice(1, 4)).concat(flowers.slice(5));
  r.wall = wall; r.front = 0; r.back = wall.length;
  r.cur = 0; r.phase = 'turn'; r.drawn = null; r.claimedTurn = false; r.events = []; r.log = [];
  return r;
}
// 台本：CPU の行動（席, その席で何回目の手番）
let botTurns = [0, 0, 0, 0];
const SCRIPT = { 1: [() => TILE.E, () => TILE.S4], 2: [() => TILE.P1], 3: [() => TILE.S9] };
function botAct(r, p) {
  if (r.phase !== 'turn') return { type: 'pass' };
  const k = botTurns[p]++, f = SCRIPT[p] && SCRIPT[p][k];
  if (f) return { type: 'discard', id: f() };
  return null;
}
// ---------------------------------------------------------------- 手順
// k: info（読んで「次へ」）・task（卓で操作）。when：その手順が待つ局面。at：光の枠（DOM のセレクタ、または {tile:id}）。see：枠はないが隠さない物
const R = () => A.R;
const myTurn = () => R() && R().phase === 'turn' && R().cur === 0 && A.UI && A.UI.wait;
const myClaim = () => R() && (R().phase === 'claim') && A.UI && A.UI.wait && A.UI.wait.kind === 'claim';
const handTile = id => `#hand .hrow .tl[data-id="${id}"]`;
// 中国式の説明の一意性のため、CPU は台本の牌以外は捨てない（台本が尽きたら普通の思考）
const STEPS = [
  { id: 'intro', k: 'info', center: true },
  { id: 'hand', k: 'info', at: ['#hand'] },
  { id: 'goal', k: 'info', at: ['#hand'], pics: true },
  { id: 'flower', k: 'info', at: ['#mePanel .gb-fl'], see: ['#mePanel', '#hand'] },
  { id: 'd1', k: 'task', when: myTurn, at: [() => handTile(TILE.N)], see: ['#hand'], ok: a => a.type === 'discard' && a.id === TILE.N, meter: 'd1' },
  { id: 'chi', k: 'task', when: myClaim, at: ['#acts .ab.call', { tile: () => TILE.S9 }], see: ['#hand'], ok: a => a.type === 'chi', meter: 'chi' },
  { id: 'd2', k: 'task', when: myTurn, at: [() => handTile(TILE.W)], see: ['#hand'], ok: a => a.type === 'discard' && a.id === TILE.W, meter: 'd2' },
  { id: 'waits', k: 'info', when: () => R() && R().phase !== 'turn', at: ['#coach'], see: ['#hand'] },
  { id: 'ron', k: 'task', when: myClaim, at: ['#acts .ab.win', { tile: () => TILE.S4 }], see: ['#hand'], ok: a => a.type === 'hu', meter: 'ron' },
  { id: 'fans', k: 'info', result: true, at: ['.modal .fans'], see: ['.modal .rhand'] },
  { id: 'pay', k: 'info', result: true, at: ['.modal .pays'], see: ['.modal .fans'] },
  { id: 'end', k: 'info', result: true, center: true, last: true },
];
let on = false, idx = 0, layer = null, bub = null, wrongKey = '', gateRes = null, autoT = 0, okShown = false;
const cur = () => STEPS[idx];
function open() {
  document.body.classList.add('tu-on');
  idx = 0; on = true; botTurns = [0, 0, 0, 0]; wrongKey = ''; okShown = false;
  A.closeModal();
  A.startTutorial(api);
}
function begin() { draw(); }
// CPU と自分の行動の前に止まる：今の手順が info で、まだ読み終わっていなければ待つ
function gate(r, p) {
  return new Promise(res => {
    const st = cur();
    const blocking = on && st && st.k === 'info' && !st.result && (!st.when || st.when());
    if (!blocking) return res();
    gateRes = res; draw();
  });
}
function release() { const g = gateRes; gateRes = null; if (g) g(); }
function waiting() { draw(); }
function allow(r, a) {
  const st = cur();
  if (!st || st.k !== 'task') return true;
  if (st.ok(a)) { okShown = true; wrongKey = ''; draw(); SNDok(); clearTimeout(autoT); autoT = setTimeout(() => { idx++; okShown = false; wrongKey = ''; draw(); }, 1700); return true; }
  wrongKey = 'tu_' + st.id + '_no'; draw(); return false;
}
function SNDok() { try { const ac = new (window.AudioContext || window.webkitAudioContext)(); [784, 1046].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = .05; g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .3 + i * .15); o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + i * .15); o.stop(ac.currentTime + .4 + i * .15); }); } catch (e) {} }
function result() { clearTimeout(autoT); okShown = false; wrongKey = ''; while (idx < STEPS.length && !STEPS[idx].result) idx++; setTimeout(draw, 400); }
function next() {
  const st = cur(); if (!st) return;
  if (st.last) return;
  idx++; okShown = false; wrongKey = '';
  draw();
  const n = cur();
  if (!n || n.k !== 'info' || (n.when && !n.when())) release();
  if (n && n.k === 'task') release();
}
function stop() { const md = $('#modal'); if (md) md.classList.remove('tu-side'); document.body.classList.remove('tu-on'); on = false; clearTimeout(autoT); release(); if (layer) layer.remove(); layer = null; }
// ---------------------------------------------------------------- 光の枠と吹き出し
function rectOf(x) {
  if (typeof x === 'function') x = x();
  if (!x) return null;
  if (typeof x === 'string') { const el = $(x); if (!el || !el.offsetWidth) return null; return A.uiRect(el); }
  const TB = A.TB; if (!TB || !TB.camera) return null;
  let list = [];
  if (x.tile != null) list = [typeof x.tile === 'function' ? x.tile() : x.tile];
  if (x.flowers != null) list = R().P[x.flowers].flowers.slice();
  if (x.meld != null) { const m = R().P[x.meld].melds; list = m.length ? m[m.length - 1].ids.slice() : []; }
  const host = { left: 0, top: 0, width: TB.host.clientWidth, height: TB.host.clientHeight };
  let box = null;
  for (const id of list) {
    const g = TB.tiles.get(id); if (!g || !g.visible) continue;
    for (const [dx, dz] of [[-.55, -.7], [.55, .7], [-.55, .7], [.55, -.7]]) {
      const v = new THREE.Vector3(g.position.x + dx, g.position.y, g.position.z + dz).project(TB.camera);
      const px = host.left + (v.x + 1) / 2 * host.width, py = host.top + (1 - v.y) / 2 * host.height;
      box = box ? { l: Math.min(box.l, px), t: Math.min(box.t, py), r: Math.max(box.r, px), b: Math.max(box.b, py) } : { l: px, t: py, r: px, b: py };
    }
  }
  return box;
}
function meterHtml(st) {
  const M = { d1: [2, 3], chi: [2, 3], d2: [1, 2], ron: [10, 8] }[st.meter];
  if (!M) return '';
  const pct = Math.min(100, Math.round(M[0] / M[1] * 100));
  return `<div class="tu-m"><span>${esc(t('tu_m_' + st.meter))}</span><i><b style="width:${okShown ? 100 : pct}%"></b></i></div>`;
}
function draw() {
  if (!on) { if (layer) layer.remove(); layer = null; return; }
  const st = cur(); if (!st) return;
  // 手順の when がまだなら（CPU の番の間など）吹き出しを隠して待つ
  const live = st.result ? !!$('.modal .res') : (!st.when || st.when());
  if (!layer) { layer = document.createElement('div'); layer.className = 'tu-layer'; $('#root').appendChild(layer); }
  if (!live) { layer.innerHTML = ''; layer.className = 'tu-layer idle'; return; }
  layer.className = 'tu-layer';
  // スマホ（横向きの配置）の和了の結果：結果を左に寄せて細くし、吹き出しは右の空きに縦長で置く（結果のどこも隠さない）。枠の物は見える所までスクロール
  const side = !!st.result && document.documentElement.classList.contains('lp');
  const md = $('#modal'); if (md) md.classList.toggle('tu-side', side);
  if (st.result) for (const x of st.at || []) if (typeof x === 'string') { const e = $(x); if (e) e.scrollIntoView({ block: 'nearest' }); }
  const W = $('#root').offsetWidth, H = $('#root').offsetHeight, pad = 8;
  const rings = (st.at || []).map(rectOf).filter(Boolean).map(r => ({ l: r.l - pad, t: r.t - pad, r: r.r + pad, b: r.b + pad }));
  const sees = (st.see || []).map(rectOf).filter(Boolean);
  const holes = rings.map(r => `<rect x="${r.l}" y="${r.t}" width="${r.r - r.l}" height="${r.b - r.t}" rx="14" fill="black"/>`).join('');
  const n = STEPS.filter(s => !s.last).length, k = Math.min(idx + 1, n);
  const text = t('tu_' + st.id);
  const wrong = wrongKey ? `<p class="tu-no">${esc(t(wrongKey))}</p>` : '';
  const btn = st.k === 'info' && !st.last ? `<button class="btn pri" data-next>${esc(t('next'))}</button>` : '';
  const endBtns = st.last ? `<div class="btns"><button class="btn" data-dex>${esc(t('mDex'))}</button><button class="btn pri" data-play>${esc(t('tu_play'))}</button></div>` : '';
  const okLine = okShown ? `<p class="tu-ok">${esc(t('tu_' + st.id + '_ok'))}</p>` : '';
  layer.innerHTML = `<svg class="tu-veil" width="${W}" height="${H}"><defs><mask id="tuM"><rect width="${W}" height="${H}" fill="white"/>${holes}</mask></defs><rect width="${W}" height="${H}" fill="rgba(20,6,10,.5)" mask="url(#tuM)"/></svg>`
    + rings.map(r => `<i class="tu-ring" style="left:${r.l}px;top:${r.t}px;width:${r.r - r.l}px;height:${r.b - r.t}px"></i>`).join('')
    + `<div class="tu-bub${st.center ? ' center' : ''}"><div class="tu-top"><b>${esc(t('mTut'))}</b><span>${k} / ${n}</span><button class="tu-x" data-x aria-label="close">×</button></div><p>${esc(text)}</p>${st.id === 'goal' ? goalPics() : ''}${wrong}${okLine}${st.k === 'task' ? meterHtml(st) : ''}${btn ? `<div class="btns">${btn}</div>` : ''}${endBtns}</div>`;
  const b = layer.querySelector('.tu-bub');
  // スマホ（横向きの配置）の和了の結果：結果を左に寄せて細くし、吹き出しは右の空きに縦長で置く（結果のどこも隠さない）
  if (side) { b.classList.add('side'); b.style.left = (W - b.offsetWidth - 10) + 'px'; b.style.top = Math.max(8, (H - b.offsetHeight) / 2) + 'px'; }
  // 吹き出しの位置：枠と see を隠さない所（上・下・左・右・四隅の候補から）
  if (!st.center && !side) {
    const bw = b.offsetWidth, bh = b.offsetHeight, avoid = rings.concat(sees);
    const box0 = rings[0] || { l: W / 2, t: H / 2, r: W / 2, b: H / 2 };
    const cand = [[box0.l, box0.t - bh - 18], [box0.l, box0.b + 18], [box0.r + 18, box0.t], [box0.l - bw - 18, box0.t], [W - bw - 16, 80], [16, 80], [W / 2 - bw / 2, 80], [W - bw - 16, H / 2 - bh / 2], [16, H / 2 - bh / 2]];
    const hit = (x, y) => avoid.some(a => x < a.r && x + bw > a.l && y < a.b && y + bh > a.t);
    let pos = null;
    for (const [x0, y0] of cand) { const x = Math.max(12, Math.min(W - bw - 12, x0)), y = Math.max(64, Math.min(H - bh - 12, y0)); if (!hit(x, y)) { pos = [x, y]; break; } }
    // 入る所がないとき（低い画面で和了の結果が大きいなど）：吹き出しを横長にして、上か下の端へ。光の枠に重ならない方、次に see に重ならない方
    if (!pos) {
      b.classList.add('wide');
      const bw2 = b.offsetWidth, bh2 = b.offsetHeight, x = Math.max(12, W / 2 - bw2 / 2);
      const ov = (y, list) => list.reduce((s, a) => s + Math.max(0, Math.min(x + bw2, a.r) - Math.max(x, a.l)) * Math.max(0, Math.min(y + bh2, a.b) - Math.max(y, a.t)), 0);
      const ys = [H - bh2 - 12, 64].map(y => [y, ov(y, rings) * 100 + ov(y, sees)]).sort((p, q) => p[1] - q[1]);
      pos = [x, ys[0][0]];
    }
    b.style.left = pos[0] + 'px'; b.style.top = pos[1] + 'px';
  }
  const nx = layer.querySelector('[data-next]'); if (nx) nx.onclick = next;
  layer.querySelector('[data-x]').onclick = () => { stop(); A.exitGame(); };
  const pl = layer.querySelector('[data-play]'); if (pl) pl.onclick = () => { finish(); A.exitGame(); document.querySelector('#hbFree').click(); };
  const dx = layer.querySelector('[data-dex]'); if (dx) dx.onclick = () => { finish(); A.exitGame(); A.openDex(39); };
}
function goalPics() {
  return `<div class="tu-pics">${['123m', '456p', '789s'].map(g => `<span>${P(g).map(x => A.typeImg(x, 'mini')).join('')}</span>`).join('')}<em>${esc(I18N.fan(39))} 8${esc(t('ptsUnit'))}</em></div>`;
}
function finish() { A.DB.tut.done = 1; A.save(); stop(); }
addEventListener('resize', () => { if (on) draw(); });
addEventListener('keydown', e => { if (!on) return; const st = cur(); if (e.key === 'ArrowRight' && st && st.k === 'info' && !st.last && layer && layer.querySelector('[data-next]')) next(); });
// 3D の牌が動いたら枠を追う
setInterval(() => { if (on && layer && !layer.classList.contains('idle')) { const st = cur(); if (st && (st.at || []).some(x => typeof x === 'object')) draw(); } }, 700);
const api = { makeRound, begin, gate, botAct, allow, waiting, result, next, stop };
window.GBTutorial = { open, STEPS, makeRound: () => makeRound(), TILE, _api: api };
})();
