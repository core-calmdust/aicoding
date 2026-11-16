/* パトリ（Patolli）— ルールとAI。依存なし。ブラウザ（window.PatolliEngine）・Worker・Node 共通。
   仕様：claude/patolli-spec.md
   盤：十字（X）形。腕は2列×a マス、中央は 2×2。周回の道は「中央マス → 腕を外へ a マス → 戻って a マス → 次の中央マス…」
   周回位置 q = 0..N-1（N = 8a+4）。中央マスは q = 0, 2a+1, 4a+2, 6a+3。
   駒の位置 i：0＝盤外（待ち）、1..L＝盤上、L+1＝上がり。side の i マス目の周回位置 = (start + dir*(i - 1 + off)) mod N。 */
(function (root) {
'use strict';
const RULES = {
  // R.C.ベル 1960 の復元：60マス、取りなし、罰金と賭けの場
  bell:    { arm: 7, pieces: 6, off: 1, capture: false, enterAny: true,  gold: 20, ante: 4, penSq: 2, penStuck: 1, zeroOffer: 0, home: 1, rounds: false },
  // 広く知られた現代のルール：52マス、中央の4マスでだけ取れる、0の目は神への供え物
  popular: { arm: 6, pieces: 6, off: 0, capture: true,  enterAny: false, gold: 6,  ante: 0, penSq: 1, penStuck: 0, zeroOffer: 1, home: 1, rounds: true },
};
for (const k in RULES) { const R = RULES[k]; R.id = k; R.N = 8 * R.arm + 4; R.L = R.N - R.off; R.goal = R.L + 1; R.seg = 2 * R.arm + 1; }
const START = [2, 0];             // side 0（手前＝下）は中央マス q=2*seg、side 1（奥＝上）は q=0
const BEANS = 5;
const PROB = [1, 5, 10, 10, 5, 1].map(x => x / 32);   // 印の出た豆の数 0..5 の確率
const STEPS = [0, 1, 2, 3, 4, 10];                    // 豆5個すべて印＝10
const ROLLS = [1, 2, 3, 4, 5].map(k => ({ n: STEPS[k], p: PROB[k] }));   // 0 以外

function qOf(R, side, i, dir) { const N = R.N; return (((START[side] * R.seg + (dir || 1) * (i - 1 + R.off)) % N) + N) % N; }
function kindQ(R, q) {            // 'c' 中央 / 'e' 腕の先（もう一度）/ 'p' 罰のマス / ''
  const k = q % R.seg; if (k === 0) return 'c';
  if (k === R.arm || k === R.arm + 1) return 'e';
  if (k === R.arm - 3 || k === R.arm + 4) return 'p';
  return '';
}
// 周回位置 → 格子の [行, 列]（一辺 2a+2 の格子。腕は上・右・下・左、中央は 2×2）
function rcOfQ(R, q) {
  const a = R.arm, s = Math.floor(q / R.seg), k = q % R.seg;
  let r, c;
  if (k === 0) { r = a; c = a; }                                  // 上の腕の手前の中央マス（左上）
  else if (k <= a) { r = a - k; c = a; }                          // 外へ（左の列を上へ）
  else { r = k - a - 1; c = a + 1; }                              // 戻る（右の列を下へ）
  for (let t = 0; t < s; t++) { const nr = c, nc = 2 * a + 1 - r; r = nr; c = nc; }   // 時計回りに90度
  return [r, c];
}
function coords(rule, side, i, dir) { const R = RULES[rule]; if (i < 1 || i > R.L) return null; return rcOfQ(R, qOf(R, side, i, dir)); }
function kind(rule, side, i, dir) { const R = RULES[rule]; return (i < 1 || i > R.L) ? '' : kindQ(R, qOf(R, side, i, dir)); }

function newGame(rule, opts) {
  rule = RULES[rule] ? rule : 'bell'; const R = RULES[rule], o = opts || {};
  const dir = o.dir || [1, 1];
  return { rule, pos: [new Array(R.pieces).fill(0), new Array(R.pieces).fill(0)], turn: o.first || 0, winner: -1,
    gold: [R.gold - R.ante, R.gold - R.ante], pool: 2 * R.ante, dir: [dir[0], dir[1]], round: 1 };
}
function clone(s) { return { rule: s.rule, pos: [s.pos[0].slice(), s.pos[1].slice()], turn: s.turn, winner: s.winner, gold: s.gold.slice(), pool: s.pool, dir: s.dir, round: s.round }; }
function rollDice(rng) { rng = rng || Math.random; const beans = []; let k = 0; for (let i = 0; i < BEANS; i++) { const b = rng() < 0.5 ? 1 : 0; beans.push(b); k += b; } return { dice: beans, k, n: STEPS[k] }; }

function occ(s, R) {              // 周回位置 → 1+side（0＝空き）
  const o = new Int8Array(R.N);
  for (let sd = 0; sd < 2; sd++) for (const i of s.pos[sd]) if (i >= 1 && i <= R.L) o[qOf(R, sd, i, s.dir[sd])] = 1 + sd;
  return o;
}
function legalMoves(s, n) {
  if (s.winner >= 0 || !n) return [];
  const R = RULES[s.rule], me = s.turn, P = s.pos[me], o = occ(s, R), out = [], seen = new Set();
  const onBoard = P.some(i => i >= 1 && i <= R.L);
  for (let p = 0; p < P.length; p++) {
    const from = P[p]; if (from > R.L || seen.has(from)) continue;
    let to;
    if (from === 0) {
      if (R.enterAny && !onBoard) to = n;          // ベル：盤に自分の駒がなければどの目でも入る
      else if (n === 1) to = 1;                    // それ以外は「1」の目だけ
      else continue;
    } else to = from + n;
    if (to > R.goal) continue;                     // 上がりはちょうどの目だけ
    seen.add(from);
    const m = { piece: p, from, to, enter: from === 0, finish: to === R.goal, capture: false, again: false, pen: false };
    if (!m.finish) {
      const q = qOf(R, me, to, s.dir[me]), who = o[q], kd = kindQ(R, q);
      if (who === 1 + me) continue;
      if (who) { if (R.capture && kd === 'c') m.capture = true; else continue; }
      m.again = kd === 'e'; m.pen = kd === 'p';
    }
    out.push(m);
  }
  return out;
}
function pay(s, ev, from, to, amt) {   // to: 0|1（相手へ）| 'pool'
  const a = Math.min(amt, s.gold[from]); if (a <= 0) return;
  s.gold[from] -= a; if (to === 'pool') s.pool += a; else s.gold[to] += a;
  ev.push({ t: 'pay', from, to, amt: a });
}
function settle(s, R, ev) {            // 破産（宝がなくなった）で終わるのは popular だけ
  if (!R.rounds || s.winner >= 0) return;
  for (let sd = 0; sd < 2; sd++) if (s.gold[sd] <= 0) { s.winner = 1 - sd; s.gold[1 - sd] += s.pool; if (s.pool) ev.push({ t: 'pot', to: 1 - sd, amt: s.pool }); s.pool = 0; ev.push({ t: 'end', winner: 1 - sd, why: 'broke' }); return; }
}
// move＝null はパス（n＝0 の目、または動かせる駒がない）。戻り値 { state, again, ev }
function apply(s0, move, n) {
  const s = clone(s0), R = RULES[s.rule], me = s.turn, op = 1 - me, ev = [];
  let again = false;
  if (!move) {
    if (!n) { if (R.zeroOffer) pay(s, ev, me, 'pool', R.zeroOffer); }
    else if (R.penStuck) pay(s, ev, me, 'pool', R.penStuck);
  } else {
    if (move.capture) {
      const q = qOf(R, me, move.to, s.dir[me]);
      for (let p = 0; p < s.pos[op].length; p++) { const i = s.pos[op][p]; if (i >= 1 && i <= R.L && qOf(R, op, i, s.dir[op]) === q) { s.pos[op][p] = 0; ev.push({ t: 'cap', side: op, piece: p }); break; } }
      pay(s, ev, op, me, 1);
    }
    s.pos[me][move.piece] = move.to;
    if (move.finish) pay(s, ev, op, me, R.home);
    if (move.pen) pay(s, ev, me, op, R.penSq);
    again = !!move.again;
  }
  settle(s, R, ev);
  if (s.winner < 0 && s.pos[me].every(i => i === R.goal)) {
    s.gold[me] += s.pool; if (s.pool) ev.push({ t: 'pot', to: me, amt: s.pool }); s.pool = 0;
    if (R.rounds && s.gold[op] > 0) {            // 次の回へ（宝は持ち越し。上がった側から始める）
      s.pos = [new Array(R.pieces).fill(0), new Array(R.pieces).fill(0)]; s.round++; s.turn = me; again = false;
      ev.push({ t: 'round', winner: me, round: s.round });
      return { state: s, again: false, ev };
    }
    s.winner = me; ev.push({ t: 'end', winner: me, why: 'home' });
  }
  if (s.winner >= 0) again = false;
  if (!again) s.turn = op;
  return { state: s, again, ev };
}
function key(s) { return s.rule + '|' + s.turn + '|' + s.pos[0].slice().sort((a, b) => a - b).join(',') + '|' + s.pos[1].slice().sort((a, b) => a - b).join(',') + '|' + s.gold.join(',') + '|' + s.pool + '|' + s.dir.join(','); }

/* ── 形勢 ── */
const AVG = 85 / 32;              // 1回の投げで進む平均
const W = { exShare: 0.35, enterWait: 2.2, bell: { turnsScale: 7.8, tempo: 0.5 }, popular: { turnsScale: 10, tempo: 0.5, gold: 0.341 } };   // 自己対局 1,500局の結果に合わせた値（2026-11-16）
// 1個だけで上がるまでの投げの数の期待値（ちょうどの目が要る）。EX[d]＝残り d マスのときの「待ち」の分（d/AVG との差）
const EX = (() => { const T = [0]; for (let d = 1; d <= 70; d++) { let stay = PROB[0], sum = 1; for (const r of ROLLS) { if (r.n > d) stay += r.p; else sum += r.p * T[d - r.n]; } T.push(sum / (1 - stay)); } return T.map((t, d) => t - d / AVG); })();
function turnsLeft(s, R, sd) {    // 全部上げるまでのおおよその手番数
  let t = 0, waiting = 0, on = 0, ex = 0, exMax = 0;
  for (const i of s.pos[sd]) {
    if (i === 0) { waiting++; const e = EX[R.goal]; t += R.goal / AVG; ex += e; if (e > exMax) exMax = e; }
    else if (i <= R.L) { on++; const d = R.goal - i, e = EX[d]; t += d / AVG; ex += e; if (e > exMax) exMax = e; }
  }
  // ちょうどの目の待ち：駒が多いほど別の駒を動かして待てるので、いちばん長い待ち＋残りの一部
  t += exMax + (ex - exMax) * W.exShare;
  if (waiting) { const firstFree = R.enterAny && !on; t += (waiting - (firstFree ? 1 : 0)) * W.enterWait; }      // 「1」待ち
  return t;
}
function sig(x) { return 1 / (1 + Math.exp(-x)); }
function staticWp(s, sd) {        // sd から見た勝率（手番は s.turn）
  if (s.winner >= 0) return s.winner === sd ? 1 : 0;
  const R = RULES[s.rule], w = W[s.rule], op = 1 - sd;
  let x = (turnsLeft(s, R, op) - turnsLeft(s, R, sd) + (s.turn === sd ? w.tempo : -w.tempo)) / w.turnsScale;
  if (R.rounds) { const g = (s.gold[sd] - s.gold[op]) * w.gold; x = x * (0.35 + 0.1 * Math.min(s.gold[sd], s.gold[op])) + g; }
  return sig(x);
}
// これから投げる側 s.turn の、sd から見た勝率の期待値。d＝先まで読む投げの数
function valueToRoll(s, sd, d) {
  if (s.winner >= 0 || d <= 0) return staticWp(s, sd);
  let v = PROB[0] * afterBest(s, 0, sd, d - 1);
  for (const r of ROLLS) v += r.p * afterBest(s, r.n, sd, d - 1);
  return v;
}
function afterMove(s, m, n, sd, d) { const r = apply(s, m, n); return valueToRoll(r.state, sd, d); }
function afterBest(s, n, sd, d) {
  const ms = legalMoves(s, n); if (!ms.length) return afterMove(s, null, n, sd, d);
  const mine = s.turn === sd; let best = mine ? -1 : 2;
  for (const m of ms) { const v = afterMove(s, m, n, sd, d); if (mine ? v > best : v < best) best = v; }
  return best;
}
function winProb(s, d) { return valueToRoll(s, s.turn, d == null ? 1 : d); }   // d＝読む投げの数
function evaluate(s, n, d) {      // 良い順の [{ move, wp }]。wp＝その手のあとの自分の勝率。d＝手のあとに読む投げの数
  const me = s.turn; d = d == null ? 1 : d;
  return legalMoves(s, n).map(m => ({ move: m, wp: afterMove(s, m, n, me, d) })).sort((a, b) => b.wp - a.wp);
}
/* ── 強さ20段階：temp＝手のばらつき（勝率の差に対するソフトマックス）、d＝先読みの投げ数 ── */
const LEVELS = [];
for (let lv = 1; lv <= 20; lv++) {
  const t = (20 - lv) / 19;
  LEVELS.push({ rand: lv <= 3 ? [0.6, 0.4, 0.25][lv - 1] : 0, temp: lv >= 19 ? 0 : 0.004 + 0.16 * Math.pow(t, 1.7), d: lv >= 20 ? 3 : lv >= 16 ? 2 : lv >= 8 ? 1 : 0 });
}
function think(s, n, level, opts) {
  const o = opts || {}, rng = o.rng || Math.random, L = LEVELS[Math.max(1, Math.min(20, level | 0)) - 1];
  const ms = legalMoves(s, n); if (!ms.length) return null; if (ms.length === 1) return ms[0];
  const rand = o.rand != null ? o.rand : L.rand;   // opts（d・temp・rand）はそのレベルの設定に重ねる：渡した項目だけが変わる（PROモード）
  if (rand && rng() < rand) return ms[Math.floor(rng() * ms.length)];
  const ev = o.ev || evaluate(s, n, o.d != null ? o.d : L.d), temp = o.temp != null ? o.temp : L.temp;
  // ばらつきなし（Lv.19〜20）：勝率がまったく同じ手が並ぶときは、その中から無作為に選ぶ（いつも先頭の駒だけを動かすと、Lv.18 より弱くなる）
  if (!temp) { const top = ev.filter(e => ev[0].wp - e.wp < 1e-9); return top[top.length > 1 ? Math.floor(rng() * top.length) : 0].move; }
  const ws = ev.map(e => Math.exp((e.wp - ev[0].wp) / temp)); let x = rng() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ev.length; i++) { x -= ws[i]; if (x <= 0) return ev[i].move; }
  return ev[0].move;
}
/* ── 表記 ── */
function moveKey(m) { return m ? m.from + '-' + m.to : 'pass'; }
function findMove(s, n, k) { return legalMoves(s, n).find(m => moveKey(m) === k) || null; }

const API = { RULES, PROB, STEPS, BEANS, START, newGame, clone, rollDice, legalMoves, apply, key, coords, kind, qOf, kindQ, rcOfQ,
  turnsLeft, staticWp, valueToRoll, winProb, evaluate, think, LEVELS, moveKey, findMove, W };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
root.PatolliEngine = API;
if (typeof WorkerGlobalScope !== 'undefined' && root instanceof WorkerGlobalScope) {
  root.onmessage = e => { const m = e.data; try {
    if (m.type === 'think') root.postMessage({ id: m.id, type: 'move', move: think(m.state, m.n, m.level, m.opts) });
    else if (m.type === 'evaluate') root.postMessage({ id: m.id, type: 'eval', list: evaluate(m.state, m.n, m.d) });
    else if (m.type === 'winProb') root.postMessage({ id: m.id, type: 'wp', wp: winProb(m.state, m.d) });
  } catch (err) { root.postMessage({ id: m.id, type: 'error', error: String(err) }); } };
}
})(typeof self !== 'undefined' ? self : globalThis);
