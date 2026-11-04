/* ur/engine.js — ウル王朝のゲーム（Royal Game of Ur）ルールエンジン＋AI
 * 依存なし。ブラウザ: window.UrEngine / Node: module.exports
 *
 * ── API 一覧 ─────────────────────────────────────────────
 * RULES                       { finkel, blitz, masters } 各ルールの定義
 *   rule = { id, pieces, dice(3|4), zeroIsMax, pathLen, goal(=pathLen+1),
 *            safeRosettes, rosetteExtra, captureExtra, rosettes:[path index], probs:[p0..p4] }
 * PROB                        [1,4,6,4,1]/16（4個の四面体サイコロ。finkel/blitz）
 * probs(rule) → [p0..p4]      ルールごとの出目確率（masters は 3個・0→4 なので p0=0）
 * newGame(rule='finkel', first=0) → state
 *   state = { rule, pos:[Array(n),Array(n)] (path index 0..goal), turn:0|1, winner:-1|0|1 }
 * clone(state) → state
 * coords(rule, side, i) → [r,c] | null     i=1..pathLen（盤上）
 * pathOf(rule, side) → [[r,c],...]          index 0 が path index 1
 * isRosette(rule, side, i) → bool
 * ROSETTES_RC                 [[0,0],[2,0],[1,3],[0,6],[2,6]]
 * isSafe(rule, side, i) → bool              取られないマス（自陣専用マス or 安全なロゼット）
 * rollDice(rng=Math.random, rule='finkel') → { dice:[0|1,...], n }   masters は3個、全0なら n=4
 * mulberry32(seed) → rng()    シード付き乱数
 * legalMoves(state, n) → [{ piece, from, to, capture, rosette, finish, enter }]
 * apply(state, move|null) → { state, again }   null=パス
 * key(state) → string
 * moveText(move, side, lang='ja') → string  例「明 3：入場→3」「暗 2：7→9 ×取り」
 * winProb(state) → 手番側（これから振る側）の勝率 0..1
 * evaluate(state, n, opts) → [{ move, wp }]  良い順。wp=指した後の自分の勝率
 * think(state, n, level=20, opts) → move|null  opts.rng（既定 Math.random）
 * hitRisk(state, side) → [prob per piece]   次の相手の1回の手番（ロゼットの追加手番は含まない）で各駒が取られる確率
 * raceCount(state) → { pips:[s0,s1], diff }   各側のゴールまでの残り歩数（diff = s1 − s0）
 * LEVELS                      各レベルの設定（depth, temp）
 * staticEval(state) → 0..1    探索なしの評価（手番側の勝率）
 * ─────────────────────────────────────────────────────
 * ルールの出典は ur/tools/RULES-RESEARCH.md（RoyalUr.net / RoyalUr-Java）。
 */
(function (root) {
  'use strict';

  // ---------- ルール定義 ----------
  // 相対経路：lane 'o'=自陣の列, 'm'=中央の列, 'x'=相手の列。[lane, col]
  const BELL = [];
  for (let i = 1; i <= 4; i++) BELL.push(['o', 4 - i]);
  for (let i = 5; i <= 12; i++) BELL.push(['m', i - 5]);
  BELL.push(['o', 7], ['o', 6]);
  const MASTERS = [];
  for (let i = 1; i <= 4; i++) MASTERS.push(['o', 4 - i]);
  for (let i = 5; i <= 11; i++) MASTERS.push(['m', i - 5]);
  MASTERS.push(['x', 6], ['x', 7], ['m', 7], ['o', 7], ['o', 6]);

  const P4 = [1, 4, 6, 4, 1].map(x => x / 16);
  const P3Z = [0, 3 / 8, 3 / 8, 1 / 8, 1 / 8]; // 3個の二値サイコロ、0 は 4 として数える

  function mkRule(o) {
    o.pathLen = o.rel.length; o.goal = o.pathLen + 1;
    o.probs = o.dice === 3 ? P3Z : P4;
    o.zeroIsMax = o.dice === 3;
    o.rosettes = [];
    o.rel.forEach((p, k) => { if (isRosRC(p[0], p[1])) o.rosettes.push(k + 1); });
    // cell[side][i] = r*8+c（i=1..pathLen）
    o.cell = [0, 1].map(side => {
      const own = side === 0 ? 2 : 0, opp = 2 - own, a = [-1];
      o.rel.forEach(p => { const r = p[0] === 'o' ? own : p[0] === 'm' ? 1 : opp; a.push(r * 8 + p[1]); });
      a.push(-1); return a;
    });
    o.rosIdx = new Array(o.goal + 1).fill(false); o.rosettes.forEach(i => { o.rosIdx[i] = true; });
    // 相手が来られるマスか（取られうるか）
    o.shared = [0, 1].map(side => {
      const other = new Set(o.cell[1 - side].filter(c => c >= 0));
      return o.cell[side].map((c, i) => i >= 1 && i <= o.pathLen && other.has(c));
    });
    return o;
  }
  function isRosRC(lane, c) { return (lane !== 'm' && (c === 0 || c === 6)) || (lane === 'm' && c === 3); }

  const RULES = {
    finkel: mkRule({ id: 'finkel', pieces: 7, dice: 4, rel: BELL, safeRosettes: true, rosetteExtra: true, captureExtra: false }),
    blitz: mkRule({ id: 'blitz', pieces: 5, dice: 4, rel: MASTERS, safeRosettes: false, rosetteExtra: true, captureExtra: true }),
    masters: mkRule({ id: 'masters', pieces: 7, dice: 3, rel: MASTERS, safeRosettes: false, rosetteExtra: true, captureExtra: false }),
  };
  // 内部・検証用（UI には出さない）：RoyalUr の解析表と同じ「4個サイコロのマスターズ」
  const EXTRA_RULES = {
    masters4: mkRule({ id: 'masters4', pieces: 7, dice: 4, rel: MASTERS, safeRosettes: false, rosetteExtra: true, captureExtra: false }),
  };
  const ROSETTES_RC = [[0, 0], [2, 0], [1, 3], [0, 6], [2, 6]];
  function R(rule) { return typeof rule === 'object' ? rule : (RULES[rule] || EXTRA_RULES[rule] || RULES.finkel); }
  function probs(rule) { return R(rule).probs.slice(); }

  function newGame(rule, first) {
    const rl = R(rule || 'finkel');
    return { rule: rl.id, pos: [new Array(rl.pieces).fill(0), new Array(rl.pieces).fill(0)], turn: first ? 1 : 0, winner: -1 };
  }
  function clone(s) { return { rule: s.rule, pos: [s.pos[0].slice(), s.pos[1].slice()], turn: s.turn, winner: s.winner }; }
  function coords(rule, side, i) {
    const rl = R(rule); if (i < 1 || i > rl.pathLen) return null;
    const c = rl.cell[side][i]; return [c >> 3, c & 7];
  }
  function pathOf(rule, side) { const rl = R(rule), a = []; for (let i = 1; i <= rl.pathLen; i++) a.push(coords(rl, side, i)); return a; }
  function isRosette(rule, side, i) { const rl = R(rule); return i >= 1 && i <= rl.pathLen && rl.rosIdx[i]; }
  function isSafe(rule, side, i) { const rl = R(rule); if (i < 1 || i > rl.pathLen) return true; return !rl.shared[side][i] || (rl.safeRosettes && rl.rosIdx[i]); }

  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rollDice(rng, rule) {
    rng = rng || Math.random; const rl = R(rule || 'finkel');
    const dice = []; let n = 0;
    for (let k = 0; k < rl.dice; k++) { const d = rng() < 0.5 ? 1 : 0; dice.push(d); n += d; }
    if (rl.zeroIsMax && n === 0) n = rl.dice + 1;
    return { dice, n };
  }

  // ---------- 手の生成 ----------
  function occ(rl, s) { // cell → owner(0/1) or -1
    const o = new Int8Array(24).fill(-1);
    for (let side = 0; side < 2; side++) {
      const P = s.pos[side], C = rl.cell[side];
      for (let k = 0; k < P.length; k++) { const p = P[k]; if (p >= 1 && p <= rl.pathLen) o[C[p]] = side; }
    }
    return o;
  }
  function legalMoves(s, n) {
    const out = [];
    if (s.winner >= 0 || !n) return out;
    const rl = R(s.rule), me = s.turn, P = s.pos[me], C = rl.cell[me], o = occ(rl, s);
    const seen = new Set();
    for (let k = 0; k < P.length; k++) {
      const from = P[k]; if (from >= rl.goal || seen.has(from)) continue;
      seen.add(from);
      const to = from + n; if (to > rl.goal) continue;
      let capture = false;
      if (to < rl.goal) {
        const who = o[C[to]];
        if (who === me) continue;
        if (who === 1 - me) { if (rl.safeRosettes && rl.rosIdx[to]) continue; capture = true; }
      }
      out.push({ piece: k, from, to, capture, rosette: to < rl.goal && rl.rosIdx[to], finish: to === rl.goal, enter: from === 0 });
    }
    out.sort((a, b) => b.from - a.from);
    return out;
  }
  function apply(s, m) {
    const ns = clone(s);
    if (!m || s.winner >= 0) { if (s.winner < 0) ns.turn = 1 - s.turn; return { state: ns, again: false }; }
    const rl = R(s.rule), me = s.turn, op = 1 - me;
    ns.pos[me][m.piece] = m.to;
    if (m.capture) {
      const cell = rl.cell[me][m.to], Q = ns.pos[op], CO = rl.cell[op];
      for (let k = 0; k < Q.length; k++) if (Q[k] >= 1 && Q[k] <= rl.pathLen && CO[Q[k]] === cell) Q[k] = 0;
    }
    if (ns.pos[me].every(p => p === rl.goal)) { ns.winner = me; return { state: ns, again: false }; }
    const again = (m.rosette && rl.rosetteExtra) || (m.capture && rl.captureExtra);
    if (!again) ns.turn = op;
    return { state: ns, again };
  }
  function key(s) {
    return s.rule + ':' + s.turn + ':' + s.pos[0].slice().sort((a, b) => a - b).join(',') + '|' + s.pos[1].slice().sort((a, b) => a - b).join(',') + (s.winner >= 0 ? '#' + s.winner : '');
  }

  const SIDE_NAME = { ja: ['明', '暗'], en: ['Light', 'Dark'] };
  function moveText(m, side, lang) {
    const L = lang === 'en' ? 'en' : 'ja', nm = SIDE_NAME[L][side];
    if (!m) return L === 'ja' ? nm + '：パス' : nm + ': pass';
    const n = m.to - m.from;
    const a = m.enter ? (L === 'ja' ? '入場' : 'enter') : String(m.from);
    const b = m.finish ? (L === 'ja' ? 'ゴール' : 'home') : String(m.to);
    let t = nm + ' ' + n + (L === 'ja' ? '：' : ': ') + a + '→' + b;
    if (m.capture) t += L === 'ja' ? ' ×取り' : ' ×capture';
    if (m.rosette) t += L === 'ja' ? ' ✿' : ' ✿';
    return t;
  }

  // ---------- 評価（学習済みネット） ----------
  // 入力（手番側視点）：自分の盤上 path 1..L の有無、相手の同、自分の未入場数 one-hot(0..N)、ゴール数 one-hot、相手の同
  /*NETS-BEGIN*/
  const NETS = {};
  /*NETS-END*/
  const NETCACHE = {};
  function b64ToBytes(b) {
    if (typeof atob === 'function') { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
    return new Uint8Array(Buffer.from(b, 'base64'));
  }
  function getNet(id) {
    if (NETCACHE[id] !== undefined) return NETCACHE[id];
    const d = NETS[id]; if (!d) return (NETCACHE[id] = null);
    const bytes = b64ToBytes(d.w), i16 = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength >> 1);
    const W = new Float32Array(i16.length); for (let i = 0; i < i16.length; i++) W[i] = i16[i] * d.scale;
    const [nin, h1, h2] = d.shape; let o = 0;
    const net = { nin, h1, h2, W1: W.subarray(o, o += nin * h1), b1: W.subarray(o, o += h1), W2: W.subarray(o, o += h1 * h2), b2: W.subarray(o, o += h2), W3: W.subarray(o, o += h2), b3: W[o], a1: new Float32Array(h1), a2: new Float32Array(h2), idx: new Int32Array(64) };
    return (NETCACHE[id] = net);
  }
  function features(rl, s, idx) { // 活性な入力の番号を idx に書き、個数を返す
    const me = s.turn, L = rl.pathLen, N = rl.pieces; let k = 0;
    const base = [0, L], cnt = [2 * L, 2 * L + 2 * (N + 1)];
    for (let t = 0; t < 2; t++) {
      const P = s.pos[t === 0 ? me : 1 - me]; let un = 0, fin = 0;
      for (let j = 0; j < P.length; j++) { const p = P[j]; if (p === 0) un++; else if (p === rl.goal) fin++; else idx[k++] = base[t] + p - 1; }
      idx[k++] = cnt[t] + un; idx[k++] = cnt[t] + N + 1 + fin;
    }
    return k;
  }
  function netEval(net, rl, s) {
    const k = features(rl, s, net.idx), { h1, h2, W1, b1, W2, b2, W3, a1, a2, idx } = net;
    for (let j = 0; j < h1; j++) a1[j] = b1[j];
    for (let q = 0; q < k; q++) { const row = idx[q] * h1; for (let j = 0; j < h1; j++) a1[j] += W1[row + j]; }
    for (let j = 0; j < h1; j++) if (a1[j] < 0) a1[j] = 0;
    let out = net.b3;
    for (let j = 0; j < h2; j++) { let v = b2[j]; for (let i = 0; i < h1; i++) v += a1[i] * W2[i * h2 + j]; if (v > 0) out += v * W3[j]; }
    return 1 / (1 + Math.exp(-out));
  }
  // 予備の手作り評価（ネットが無いとき）：レース差と危険度のロジスティック
  function handEval(rl, s) {
    const me = s.turn, op = 1 - me; let sc = 0;
    for (let t = 0; t < 2; t++) {
      const side = t === 0 ? me : op, P = s.pos[side], sg = t === 0 ? 1 : -1;
      for (let j = 0; j < P.length; j++) {
        const p = P[j]; let v = p === rl.goal ? rl.goal + 3 : p;
        if (p > 0 && p < rl.goal && rl.shared[side][p] && !(rl.safeRosettes && rl.rosIdx[p])) v -= 0.25 * p;
        if (p > 0 && p < rl.goal && rl.rosIdx[p]) v += 1.5;
        sc += sg * v;
      }
    }
    return 1 / (1 + Math.exp(-(sc + 1.2) / (rl.pieces * 2.2)));
  }
  function staticEval(s) {
    if (s.winner >= 0) return s.winner === s.turn ? 1 : 0;
    const rl = R(s.rule), net = getNet(rl.id === 'masters4' ? 'masters' : rl.id);
    return net ? netEval(net, rl, s) : handEval(rl, s);
  }

  // ---------- 探索（expectiminimax） ----------
  // V(s, d) = 手番側がこれから振る時点の勝率。d=チャンス層の深さ（0 で静的評価）
  function valueToRoll(s, d) {
    if (s.winner >= 0) return s.winner === s.turn ? 1 : 0;
    if (d <= 0) return staticEval(s);
    const pr = R(s.rule).probs; let v = 0;
    for (let n = 0; n <= 4; n++) { if (pr[n] > 0) v += pr[n] * bestAfterRoll(s, n, d); }
    return v;
  }
  function wpAfter(s, m, d) { // 手 m を指した後の「指した側」の勝率（d=残りの深さ）
    const me = s.turn, r = apply(s, m), ns = r.state;
    if (ns.winner >= 0) return ns.winner === me ? 1 : 0;
    const v = valueToRoll(ns, d);
    return ns.turn === me ? v : 1 - v;
  }
  function bestAfterRoll(s, n, d) {
    const ms = legalMoves(s, n);
    if (!ms.length) return 1 - valueToRoll(apply(s, null).state, d - 1);
    let best = -1;
    for (const m of ms) { const v = wpAfter(s, m, d - 1); if (v > best) best = v; }
    return best;
  }

  const LEVELS = [];
  (function () {
    // temp: 勝率差（0..1）に対するソフトマックス温度。depth: 手の後に読むチャンス層の数
    const T = [0.9, 0.5, 0.3, 0.2, 0.14, 0.1, 0.075, 0.058, 0.045, 0.035, 0.027, 0.021, 0.016, 0.012, 0.009, 0.0065, 0.0045, 0.003, 0.0015, 0];
    for (let L = 1; L <= 20; L++) LEVELS[L] = { depth: L >= 17 ? 1 : 0, temp: T[L - 1], noise: L <= 3 ? [0.6, 0.35, 0.15][L - 1] : 0 };
  })();

  function hitRisk(s, side) { // 次の相手の手番（1回の振り）で各駒が取られる確率
    const rl = R(s.rule), op = 1 - side, pr = rl.probs, P = s.pos[side];
    const t = clone(s); t.turn = op; t.winner = -1;
    const risk = P.map(() => 0);
    for (let n = 1; n <= 4; n++) {
      if (!pr[n]) continue;
      const ms = legalMoves(t, n); const hit = new Set();
      for (const m of ms) if (m.capture) hit.add(rl.cell[op][m.to]);
      for (let k = 0; k < P.length; k++) { const p = P[k]; if (p >= 1 && p <= rl.pathLen && hit.has(rl.cell[side][p])) risk[k] += pr[n]; }
    }
    return risk;
  }
  function raceCount(s) {
    const rl = R(s.rule); const pips = [0, 1].map(sd => s.pos[sd].reduce((a, p) => a + (rl.goal - p), 0));
    return { pips, diff: pips[1] - pips[0] };
  }
  // 粘りの指標（大きいほど良い）：自分の駒の取られる確率の和が小さい、ロゼット（特に中央）を持つ、前に進む
  function resistScore(s, m) {
    const me = s.turn, rl = R(s.rule), ns = apply(s, m).state;
    const risk = hitRisk(ns, me).reduce((a, b) => a + b, 0);
    let ros = 0; for (const p of ns.pos[me]) if (p >= 1 && p <= rl.pathLen && rl.rosIdx[p]) ros += rl.shared[me][p] ? 2 : 1;
    let caps = m.capture ? 1 : 0;
    return -risk * 10 + ros * 1.5 + caps * 2 + m.to * 0.01;
  }

  function evaluate(s, n, opts) {
    opts = opts || {};
    const d = opts.depth != null ? opts.depth : 1;
    const ms = legalMoves(s, n);
    const res = ms.map(m => ({ move: m, wp: wpAfter(s, m, d) }));
    res.sort((a, b) => b.wp - a.wp);
    return res;
  }
  function winProb(s, opts) {
    const d = opts && opts.depth != null ? opts.depth : 1;
    return valueToRoll(s, d);
  }

  function think(s, n, level, opts) {
    opts = opts || {}; const rng = opts.rng || Math.random;
    const ms = legalMoves(s, n); if (!ms.length) return null; if (ms.length === 1) return ms[0];
    level = Math.max(1, Math.min(20, Math.round(level || 20)));
    const cfg = LEVELS[level];
    let sc = ms.map(m => ({ m, wp: wpAfter(s, m, cfg.depth) }));
    if (cfg.noise) { // 入門：ほぼランダム。ただし取れる駒は取ることもある
      if (rng() < cfg.noise) {
        const caps = ms.filter(m => m.capture);
        if (caps.length && rng() < 0.5) return caps[Math.floor(rng() * caps.length)];
        return ms[Math.floor(rng() * ms.length)];
      }
    }
    const best = Math.max(...sc.map(x => x.wp));
    if (cfg.temp > 0) {
      const w = sc.map(x => Math.exp((x.wp - best) / cfg.temp)); const tot = w.reduce((a, b) => a + b, 0);
      let r = rng() * tot; for (let i = 0; i < sc.length; i++) { r -= w[i]; if (r <= 0) return sc[i].m; }
      return sc[sc.length - 1].m;
    }
    // 最強：ほぼ同点（差 0.002 以内）の手、または全手が勝率ほぼ0/1 のときは粘りの指標で選ぶ
    const eps = (best < 0.02 || best > 0.995) ? 0.01 : 0.002;
    const top = sc.filter(x => x.wp >= best - eps);
    if (top.length === 1) return top[0].m;
    let bm = null, bv = -Infinity;
    for (const x of top) { const v = resistScore(s, x.m) + x.wp * 1000; if (v > bv) { bv = v; bm = x.m; } }
    return bm;
  }

  const API = {
    RULES, EXTRA_RULES, PROB: P4.slice(), ROSETTES_RC, LEVELS, probs,
    newGame, clone, coords, pathOf, isRosette, isSafe, rollDice, mulberry32,
    legalMoves, apply, key, moveText, winProb, evaluate, think, hitRisk, raceCount, staticEval,
    _valueToRoll: valueToRoll, _features: features, _hasNet: id => !!getNet(id),
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.UrEngine = API;
  else if (root) root.UrEngine = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
