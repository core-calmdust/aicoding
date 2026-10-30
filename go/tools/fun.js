/*
 * "Fun" score for Go tsumego (0–100): a puzzle must be sound AND enjoyable (same spirit as checkers/tools/fun.js).
 * Soundness is a gate (score 0 when it fails): every stone has a liberty, the goal is not reached at the start, exactly one
 * first move reaches the goal in the fewest player moves and that number is P.n (go/tsumego.js solve()), the answer
 * matches, the status depends on who moves first (the opponent moving first defends), and the main line is legal, has
 * no pass and no ko, and reaches the goal (tsumego.js reached()).
 * Then, weights (sum 100):
 *   key  30  the key move: a sacrifice / throw-in (the stone is in atari or gets captured in the line) > a placement
 *            inside the opponent's shape > a quiet move (vital point, hane, descent) > an atari > a capture.
 *            The light net's prior for the answer (normalised over the local moves) scales it: a move the net does not
 *            expect is a surprise (x1.0), the net's obvious first choice x0.75.
 *   lure 20  plausible wrong first moves (next to the target / its eye space, ataris, moves the net likes); fewer
 *            points when 2+ other first moves also reach the goal one move later (a "loose" puzzle).
 *   play 20  the middle of the line: the player's later moves are real choices (one working move among several);
 *            a second sacrifice adds; a one-move puzzle gets a neutral base (+ for a sacrifice).
 *   end  15  satisfying finish: stones captured on the way, a clean kill / two clear eyes / a race won.
 *   form 15  economy and natural look: few stones, the stones take part (touch the region / the line), no lonely stones;
 *            positions from self-play games count as natural.
 * The net can also veto absurd answers: when the net's ownership at the end of the line disagrees strongly with the
 * goal (e.g. it thinks the "killed" group lives), the score is scaled by 0.85 (info.netAgree = false).
 * usage (node):
 *   const { funScore } = require('./fun.js');
 *   funScore(P, { net })   P = a puzzles.json puzzle (GTP strings) or indices; net (optional) =
 *     { policy(spec, moves) -> [{m, p}], own(spec, moves) -> black-view ownership array } (see build-tsumego.mjs)
 *   -> { fun, sound, why, parts, info }
 *   node tools/fun.js [--net] [--list]   prints the distribution of go/puzzles.json (the worst / best puzzles)
 * Copyright 2026 core-calmdust
 */
'use strict';
const path = require('path');
const R = require(path.join(__dirname, '..', 'rules.js'));
const T = require(path.join(__dirname, '..', 'tsumego.js'));
const PASS = -1, EX = { exact: true };

const toIdx = (v, n) => typeof v === 'number' ? v : R.parseCoord(v, n);
function norm(P) {
  const n = P.s.n;
  return { s: P.s, goal: P.goal, target: P.target.map(v => toIdx(v, n)), region: P.region.map(v => toIdx(v, n)), n: P.n, answer: toIdx(P.answer, n), line: (P.line || []).map(v => toIdx(v, n)), th: P.th, fam: P.fam };
}
const nb4 = (i, n) => { const x = i % n, y = (i / n) | 0, o = []; if (x > 0) o.push(i - 1); if (x < n - 1) o.push(i + 1); if (y > 0) o.push(i - n); if (y < n - 1) o.push(i + n); return o; };
const cheb = (a, b, n) => Math.max(Math.abs(a % n - b % n), Math.abs(((a / n) | 0) - ((b / n) | 0)));

function funScore(P0, opt) {
  opt = opt || {};
  const P = norm(P0), n = P.s.n, net = opt.net;
  const zero = (why, info) => ({ fun: 0, sound: false, why, parts: {}, info: info || {} });
  const pos0 = R.Pos.from(P.s), G = pos0.turn, O = 3 - G;
  for (let i = 0; i < n * n; i++) if (pos0.b[i] && pos0.group(i).libs === 0) return zero('illegal');
  if (T.reached(P, pos0, EX)) return zero('reached');
  // ---- soundness
  const root = T.solve(P, [], P.n + 1, false, EX);
  const win = root.filter(e => e.need > 0 && e.need <= P.n);
  if (win.length !== 1 || win[0].need !== P.n) return zero(win.length > 1 ? 'multi' : 'nosol', { win: win.length });
  if (win[0].m !== P.answer) return zero('answer');
  const C = T._ctx(P); C.load([]);
  if (C.ld ? C.ldWin(C.O) : !T.solve(P, [PASS], P.n + 2, true, EX).some(e => e.need === 0)) return zero('settled');
  const line = P.line.length ? P.line : T.mainLine(P, P.n);
  let pos = pos0; const caps = { G: 0, O: 0 }, steps = [];
  for (let k = 0; k < line.length; k++) {
    const m = line[k]; if (m === PASS) return zero('pass');
    const r = pos.tryPlay(m); if (!r) return zero('line');
    const att = k % 2 === 0; if (att) caps.G += r.captured.length; else caps.O += r.captured.length;
    steps.push({ m, att, pre: pos, post: r.pos, cap: r.captured.length });
    pos = r.pos; if (pos.ko >= 0) return zero('ko');
  }
  if (line[0] !== P.answer) return zero('line0');
  if (steps.filter(s => s.att).length !== P.n) return zero('linelen');
  if (!T.reached(P, pos, EX)) return zero('notreached');

  // ---- net: local prior of the answer and of the wrong moves
  const regionSet = new Set(P.region);
  let pAns = 0.5, pWrongMax = 0.25, netAgree = true;
  if (net) {
    const pl = net.policy(P.s, []);
    const loc = pl.filter(e => e.m >= 0 && (regionSet.has(e.m) || e.m === P.answer));
    const tot = loc.reduce((a, e) => a + e.p, 0) || 1;
    pAns = (loc.find(e => e.m === P.answer) || { p: 0 }).p / tot;
    pWrongMax = loc.filter(e => e.m !== P.answer).reduce((a, e) => Math.max(a, e.p / tot), 0);
    if (net.own) {
      const own = net.own(P.s, line), sg = G === 1 ? 1 : -1;
      // the goal side's ownership of the target points at the end (kill/capture: the dead / captured stones are G's;
      // live/connect: G's own stones stay G's) — both mean a positive value from G's view
      const v = P.target.reduce((a, t) => a + own[t] * sg, 0) / P.target.length;
      netAgree = v > -0.3;
    }
  }

  // ---- key move
  const s0 = steps[0], ansStone = s0.post.b[P.answer] ? s0.post.group(P.answer) : null;
  const tgtLibsAfter = Math.min(...P.target.filter(t => s0.post.b[t]).map(t => s0.post.group(t).libs).concat([99]));
  const capturedLater = steps.some((s, k) => k > 0 && !s.att && s.cap > 0);
  const sac = (ansStone && ansStone.libs === 1) || (capturedLater && steps.length > 1 && !steps[1].att && steps[1].cap > 0);
  let oppAdj = 0, ownAdj = 0; for (const q of nb4(P.answer, n)) { if (pos0.b[q] === O) oppAdj++; else if (pos0.b[q] === G) ownAdj++; }
  const atari = (() => { for (const q of nb4(P.answer, n)) if (s0.post.b[q] === O && s0.post.group(q).libs === 1) return true; return false; })();
  const placement = !s0.cap && oppAdj >= 1 && ownAdj === 0 && (P.goal === 'kill' || P.goal === 'semeai');   // a stone dropped inside the opponent's shape
  let key = s0.cap ? (root.filter(e => { const r = pos0.tryPlay(e.m); return r && r.captured.length; }).length >= 2 ? 0.3 : 0.15)
    : sac ? 1 : placement ? 0.85 : atari ? 0.45 : 0.7;
  if (P.goal === 'capture' && atari && tgtLibsAfter === 1 && P.n <= 2) key = Math.min(key, 0.4);
  const keyRaw = key;
  key *= 0.75 + 0.25 * Math.max(0, 1 - pAns * 1.3);

  // ---- lure
  const alts = root.filter(e => e.m !== P.answer && e.m !== PASS);
  const near = new Set(); for (const t of P.target) for (const q of nb4(t, n)) near.add(q);
  for (const q of [...near]) if (!pos0.b[q]) for (const r of nb4(q, n)) near.add(r);
  const plaus = alts.filter(e => near.has(e.m) || (() => { const r = pos0.tryPlay(e.m); if (!r) return false; for (const q of nb4(e.m, n)) if (r.pos.b[q] === O && r.pos.group(q).libs === 1) return true; return false; })()).length;
  const tempt = Math.min(1, pWrongMax / Math.max(0.05, pAns + pWrongMax) * 1.6);
  let lure = Math.min(1, plaus / 4) * 0.6 + tempt * 0.4;
  const cooks = root.filter(e => e.m !== P.answer && e.need === P.n + 1).length;
  if (cooks >= 2) lure *= cooks >= 4 ? 0.6 : 0.8;

  // ---- the middle of the line
  let play;
  if (P.n === 1) play = 0.5 + (sac ? 0.25 : 0) + (plaus >= 3 ? 0.1 : 0);
  else {
    let sc = 0, cnt = 0, sacMid = 0, forced = 0;
    for (let k = 2; k < line.length; k += 2) {
      const left = P.n - k / 2;
      const l = T.solve(P, line.slice(0, k), left, false, EX), good = l.filter(e => e.need > 0 && e.need <= left);
      const cand = l.length;
      if (cand <= 1) { forced++; continue; }
      cnt++; sc += good.length === 1 ? 1 : good.length === 2 ? 0.6 : 0.3;
      const st = steps[k]; if (st && st.post.b[st.m] && st.post.group(st.m).libs === 1) sacMid++;
    }
    play = (cnt ? sc / cnt : 0.4) * 0.75 + Math.min(1, sacMid) * 0.25 - forced * 0.1;
  }
  play = Math.max(0, Math.min(1, play));

  // ---- finish
  let end;
  if (P.goal === 'kill') end = caps.G >= 3 ? 1 : caps.G > 0 ? 0.85 : 0.75;
  else if (P.goal === 'live') end = caps.G >= 2 ? 1 : 0.8;
  else end = 0.55 + 0.3 * Math.min(1, caps.G / 4) + (caps.O > 0 ? 0.15 : 0);
  end = Math.min(1, end);

  // ---- economy / natural look
  const stones = []; for (let i = 0; i < n * n; i++) if (pos0.b[i]) stones.push(i);
  const act = new Set([...P.region, ...line]);
  const inv = stones.filter(s => { for (const a of act) if (cheb(s, a, n) <= 1) return true; return false; }).length;
  const share = inv / Math.max(1, stones.length);
  const lonely = stones.filter(s => !stones.some(t => t !== s && pos0.b[t] === pos0.b[s] && cheb(s, t, n) <= 2)).length;
  let form;
  const fam = P.fam || (n < 19 ? 'tac' : 'ld');
  if (fam === 'tac' || fam === 'conn') form = 0.55 + 0.25 * Math.min(1, share / 0.5) + 0.2 * (stones.length <= 40 ? 1 : 0.5);
  else {
    const econ = stones.length <= 16 ? 1 : stones.length <= 24 ? 0.8 : stones.length <= 32 ? 0.6 : 0.4;
    form = econ * 0.45 + Math.min(1, share / 0.85) * 0.35 + Math.max(0, 1 - lonely * 0.35) * 0.2;
  }

  const parts = { key: 30 * key, lure: 20 * lure, play: 20 * play, end: 15 * end, form: 15 * form };
  let fun = Object.values(parts).reduce((a, b) => a + b, 0);
  if (!netAgree) fun *= 0.85;
  fun = Math.round(Math.max(0, Math.min(100, fun)));
  // difficulty estimate for sorting easy -> hard inside a theme
  const diff = P.n * 1.0 + Math.max(0, 1 - pAns) * 1.4 + Math.min(1, plaus / 6) * 0.6 + P.region.length / 25 + (sac ? 0.4 : 0);
  return { fun, sound: true, parts, info: { sac, placement, atari, keyRaw, pAns: +pAns.toFixed(3), pWrongMax: +pWrongMax.toFixed(3), plaus, alts: alts.length, cooks, capsG: caps.G, stones: stones.length, share: +share.toFixed(2), lonely, netAgree, diff: +diff.toFixed(2), line } };
}
module.exports = { funScore };

if (require.main === module) (async () => {
  const fs = require('fs');
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
  let net = null;
  if (process.argv.includes('--net')) { const L = await import('./golib.mjs'); const E = await L.load('light'); net = { policy: (s, m) => L.policy(E, s, m, 7, 2).list, own: (s, m) => L.ownership(E, s, m, 7) }; }
  const all = [];
  for (const Th of D.themes) {
    const sc = Th.puzzles.map((P, j) => { const r = funScore(Object.assign({ fam: P.fam }, P), { net }); all.push({ id: Th.id, j, ...r }); return r.fun; });
    const s = sc.slice().sort((a, b) => a - b);
    console.log(Th.id.padEnd(9), 'min', s[0], 'med', s[s.length >> 1], 'max', s[s.length - 1], '<70:', sc.filter(x => x < 70).length, '<60:', sc.filter(x => x < 60).length);
  }
  const bad = all.filter(x => !x.sound); if (bad.length) console.log('unsound', bad.map(x => x.id + '-' + x.j + ':' + x.why).join(' '));
  if (process.argv.includes('--list')) {
    all.sort((a, b) => a.fun - b.fun);
    for (const x of [...all.slice(0, 10), ...all.slice(-6)]) console.log(x.fun, x.id + '-' + x.j, JSON.stringify(Object.fromEntries(Object.entries(x.parts).map(([k, v]) => [k, Math.round(v)]))));
  }
})();
