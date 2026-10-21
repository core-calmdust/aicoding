// Backgammon V2 — rules, dice PRNG, record encoding, neural evaluator, bear-off database, search and cube logic.
// Shared by the page (main thread), the AI worker (importScripts) and the Node tools (require).
(function (root) {
'use strict';
const BG = {};

// ---------------------------------------------------------------------------------------------- position
// Int8Array(52): side 0 at [0..25], side 1 at [26..51]. Index 0 = borne off, 1..24 = points counted from that
// side's own perspective (1 = its ace point, 24 = its furthest point), 25 = bar. My point i is the opponent's 25-i.
const OFF = 0, BAR = 25;
function initial() {
  const p = new Int8Array(52);
  for (const o of [0, 26]) { p[o + 24] = 2; p[o + 13] = 5; p[o + 8] = 3; p[o + 6] = 5; }
  return p;
}
function clone(p) { return p.slice(); }
function key(p) { return String.fromCharCode.apply(null, p); }
function pips(p, s) { const m = s * 26; let n = 0; for (let i = 1; i <= 25; i++) n += i * p[m + i]; return n; }
function onBoard(p, s) { const m = s * 26; let n = 0; for (let i = 1; i <= 25; i++) n += p[m + i]; return n; }
function allHome(p, s) { const m = s * 26; for (let i = 7; i <= 25; i++) if (p[m + i]) return false; return true; }
// contact: some checker of one side still has to pass a checker of the other side
function contact(p) {
  let back0 = 0, back1 = 0;
  for (let i = 25; i >= 1; i--) if (p[i]) { back0 = i; break; }
  for (let i = 25; i >= 1; i--) if (p[26 + i]) { back1 = i; break; }
  // side 0's furthest checker at its point back0 = side 1's point 25-back0
  return back0 + back1 > 25;
}
function winner(p) { if (p[0] === 15) return 0; if (p[26] === 15) return 1; return -1; }
// points won by side w (1 single, 2 gammon, 3 backgammon) when w has borne everything off
function winKind(p, w) {
  const o = (1 - w) * 26;
  if (p[o] > 0) return 1;
  // loser has a checker on the bar or in the winner's home board (loser's points 19..24)
  for (let i = 19; i <= 25; i++) if (p[o + i]) return 3;
  return 2;
}

// can side s move a checker from `from` with die d?  returns destination (0 = off) or -1
function dest(p, s, from, d) {
  const m = s * 26, o = 26 - m;
  if (p[m + from] === 0) return -1;
  if (from !== BAR && p[m + BAR] > 0) return -1;
  const to = from - d;
  if (to >= 1) return p[o + 25 - to] >= 2 ? -1 : to;
  // bearing off
  for (let i = 7; i <= 25; i++) if (p[m + i]) return -1;
  if (to === 0) return 0;
  for (let i = from + 1; i <= 6; i++) if (p[m + i]) return -1;
  return 0;
}
// apply (assumes legal); returns encoded submove: from*32 + to (+1024 if it hits)
function apply(p, s, from, to) {
  const m = s * 26, o = 26 - m;
  p[m + from]--;
  let hit = 0;
  if (to >= 1) {
    if (p[o + 25 - to] === 1) { p[o + 25 - to] = 0; p[o + BAR]++; hit = 1024; }
    p[m + to]++;
  } else p[m]++;
  return from * 32 + to + hit;
}
const mvFrom = c => (c >> 5) & 31, mvTo = c => c & 31, mvHit = c => (c & 1024) !== 0;

// all legal plays for side s with dice d1, d2. Returns [{pos, moves:[codes]}], unique by resulting position.
// Enforces: use both dice (all four for doubles) when possible, otherwise as many as possible; if only one die
// of a non-double can be used, the larger one must be played when it can be.
function genPlays(p, s, d1, d2) {
  const out = new Map();
  let maxUsed = 0;
  const dbl = d1 === d2;
  const m = s * 26;
  const rec = (q, dice, k, moves, minFrom, first) => {
    if (k === dice.length) { record(q, moves, first); return; }
    const d = dice[k];
    let any = false;
    const hi = q[m + BAR] > 0 ? BAR : 24;
    for (let from = hi; from >= 1; from--) {
      if (dbl && from > minFrom) continue;
      if (q[m + from] === 0) continue;
      const to = dest(q, s, from, d);
      if (to < 0) continue;
      any = true;
      const r = q.slice();
      moves.push(apply(r, s, from, to));
      rec(r, dice, k + 1, moves, from, k === 0 ? d : first);
      moves.pop();
      if (from === BAR) break;   // entering: only the bar checker can move
    }
    if (!any) record(q, moves, first);
  };
  const record = (q, moves, first) => {
    const n = moves.length;
    if (n < maxUsed) return;
    if (n > maxUsed) { out.clear(); maxUsed = n; }
    const kk = key(q);
    if (!out.has(kk)) out.set(kk, { pos: q, moves: moves.slice(), die: first });
  };
  if (dbl) rec(p.slice(), [d1, d1, d1, d1], 0, [], 25, 0);
  else { rec(p.slice(), [d1, d2], 0, [], 25, 0); rec(p.slice(), [d2, d1], 0, [], 25, 0); }
  let plays = [...out.values()];
  if (maxUsed === 1 && !dbl) {
    const big = Math.max(d1, d2);
    if (plays.some(x => x.die === big)) plays = plays.filter(x => x.die === big);
  }
  if (maxUsed === 0) return [{ pos: p.slice(), moves: [] }];
  for (const x of plays) delete x.die;
  return plays;
}

// --- partial (interactive) move support: the maximum number of dice usable from q with the given dice
function maxUse(q, s, dice) {
  if (!dice.length) return 0;
  let best = 0;
  const tried = new Set();
  for (let k = 0; k < dice.length; k++) {
    const d = dice[k];
    if (tried.has(d)) continue; tried.add(d);
    const rest = dice.slice(0, k).concat(dice.slice(k + 1));
    const hi = q[s * 26 + BAR] > 0 ? BAR : 24;
    for (let from = hi; from >= 1; from--) {
      const to = dest(q, s, from, d);
      if (to < 0) continue;
      const r = q.slice(); apply(r, s, from, to);
      const v = 1 + maxUse(r, s, rest);
      if (v > best) best = v;
      if (best === dice.length) return best;
      if (from === BAR) break;
    }
  }
  return best;
}
// legal single moves in the middle of a turn: [{from, to, die}]
// diceLeft: remaining dice; turnDice: [d1, d2] of the turn; usedSoFar: number of dice already used
function legalSteps(q, s, diceLeft, turnDice, usedSoFar) {
  const need = maxUse(q, s, diceLeft);
  if (need === 0) return [];
  const res = [];
  const tried = new Set();
  let onlyBig = 0;
  // larger-die rule: at the start of a non-double turn where only one die can be played
  if (usedSoFar === 0 && turnDice[0] !== turnDice[1] && need === 1) {
    const big = Math.max(turnDice[0], turnDice[1]);
    const hi = q[s * 26 + BAR] > 0 ? BAR : 24;
    for (let from = hi; from >= 1; from--) if (dest(q, s, from, big) >= 0) { onlyBig = big; break; }
  }
  for (let k = 0; k < diceLeft.length; k++) {
    const d = diceLeft[k];
    if (tried.has(d)) continue; tried.add(d);
    if (onlyBig && d !== onlyBig) continue;
    const rest = diceLeft.slice(0, k).concat(diceLeft.slice(k + 1));
    const hi = q[s * 26 + BAR] > 0 ? BAR : 24;
    for (let from = hi; from >= 1; from--) {
      const to = dest(q, s, from, d);
      if (to < 0) continue;
      const r = q.slice(); apply(r, s, from, to);
      if (1 + maxUse(r, s, rest) === need) res.push({ from, to, die: d });
      if (from === BAR) break;
    }
  }
  return res;
}

// ---------------------------------------------------------------------------------------------- notation
// moves of one play in standard notation from the mover's perspective, e.g. "8/5 6/5", "bar/22*", "6/off(2)"
function ptName(i) { return i === BAR ? 'bar' : i === 0 ? 'off' : String(i); }
function notation(moves) {
  if (!moves || !moves.length) return '—';
  // chain moves of the same checker: a/b b/c -> a/b/c when not hitting at b ... keep simple: merge a/b + b/c into a/c unless b was a hit
  const list = moves.map(c => ({ f: mvFrom(c), t: mvTo(c), h: mvHit(c) }));
  const used = new Array(list.length).fill(false);
  const parts = [];
  for (let i = 0; i < list.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    let f = list[i].f, t = list[i].t, hits = list[i].h ? [t] : [];
    let ext = true;
    while (ext) {
      ext = false;
      if (t === 0) break;
      for (let j = 0; j < list.length; j++) if (!used[j] && list[j].f === t) {
        used[j] = true; t = list[j].t; if (list[j].h) hits.push(t); ext = true; break;
      }
    }
    let s = ptName(f) + '/';
    // keep the intermediate hit point visible
    if (hits.length && hits[0] !== t) s += hits.filter(h => h !== t).map(h => ptName(h) + '*').join('/') + '/' + ptName(t) + (hits.includes(t) ? '*' : '');
    else s += ptName(t) + (hits.length ? '*' : '');
    parts.push(s);
  }
  // group identical parts: "8/5(2)"
  const cnt = new Map();
  for (const s of parts) cnt.set(s, (cnt.get(s) || 0) + 1);
  return [...cnt.entries()].sort((a, b) => parseInt(b[0]) - parseInt(a[0]) || (b[0] < a[0] ? -1 : 1))
    .map(([s, n]) => n > 1 ? `${s}(${n})` : s).join(' ').replace(/bar/g, 'bar');
}

// ---------------------------------------------------------------------------------------------- dice PRNG
// sfc32 seeded from a string hash (cyrb128). Dice are drawn by rejection sampling (no modulo bias).
function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}
function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0;
    return t >>> 0;
  };
}
// dice stream of game g of a match with this seed: dice(k) = k-th roll [d1, d2] (k = 0 is the opening roll, never a double)
function DiceStream(seed, g) {
  const h = cyrb128('bg2|' + seed + '|' + g);
  const r = sfc32(h[0], h[1], h[2], h[3]);
  for (let i = 0; i < 12; i++) r();
  const die = () => { for (;;) { const x = r(); if (x < 4294967292) return 1 + (x % 6); } };
  const rolls = [];
  this.get = k => {
    while (rolls.length <= k) {
      if (rolls.length === 0) { let a, b; do { a = die(); b = die(); } while (a === b); rolls.push([a, b]); }
      else rolls.push([die(), die()]);
    }
    return rolls[k].slice();
  };
}
function randomSeed() {
  const A = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  const buf = new Uint32Array(10);
  try { (root.crypto || require('crypto').webcrypto).getRandomValues(buf); } catch (e) { for (let i = 0; i < 10; i++) buf[i] = Math.random() * 4294967296 >>> 0; }
  for (let i = 0; i < 10; i++) s += A[buf[i] % A.length];
  return s;
}
// small SHA-256 (for the dice commitment shown during a game)
function sha256(ascii) {
  const rr = (v, n) => (v >>> n) | (v << (32 - n));
  const K = [], H = [];
  let primeCount = 0;
  const isComposite = {};
  for (let c = 2; primeCount < 64; c++) {
    if (!isComposite[c]) {
      for (let i = 0; i < 313; i += c) isComposite[i] = c;
      H[primeCount] = (Math.pow(c, .5) * 4294967296) | 0;
      K[primeCount++] = (Math.pow(c, 1 / 3) * 4294967296) | 0;
    }
  }
  const bytes = [];
  const utf = unescape(encodeURIComponent(ascii));
  for (let i = 0; i < utf.length; i++) bytes.push(utf.charCodeAt(i));
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 255);
  const hash = H.slice(0, 8);
  for (let j = 0; j < bytes.length; j += 64) {
    const w = [];
    for (let i = 0; i < 16; i++) w[i] = (bytes[j + i * 4] << 24) | (bytes[j + i * 4 + 1] << 16) | (bytes[j + i * 4 + 2] << 8) | bytes[j + i * 4 + 3];
    const old = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      if (i >= 16) w[i] = (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0;
      const t1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + K[i] + w[i];
      const t2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash.unshift((t1 + t2) | 0);
      hash[4] = (hash[4] + t1) | 0;
      hash.pop();
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + old[i]) | 0;
  }
  return hash.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
}

// ---------------------------------------------------------------------------------------------- game replay
// A game is a list of actions: {t:'r', d:[a,b], m:[codes]} (roll + play), {t:'d'} double, {t:'k'} take, {t:'p'} pass (drop),
// {t:'x', w, n} resignation (rare; n points). The first roll decides who starts: side 0 if d[0] > d[1].
// replay(game, upto, opts) -> state {pos, turn, cube, owner, over, winner, points, lastDice, ...}
function replay(actions, upto, opts) {
  opts = opts || {};
  const st = { pos: initial(), turn: -1, cube: 1, owner: -1, over: false, winner: -1, points: 0, kind: 0, dice: null, offered: false, nRolls: 0, lastMoves: null, lastSide: -1 };
  const n = upto === undefined ? actions.length : Math.min(upto, actions.length);
  for (let i = 0; i < n; i++) {
    const a = actions[i];
    if (st.over) break;
    if (a.t === 'r') {
      let s = st.turn;
      if (st.nRolls === 0) s = a.d[0] > a.d[1] ? 0 : 1;
      for (const c of a.m) apply(st.pos, s, mvFrom(c), mvTo(c));
      st.nRolls++; st.dice = a.d; st.lastMoves = a.m; st.lastSide = s;
      const w = winner(st.pos);
      if (w >= 0) { st.over = true; st.winner = w; st.kind = winKind(st.pos, w); st.points = st.kind * st.cube; st.turn = -1; }
      else st.turn = 1 - s;
    } else if (a.t === 'd') { st.offered = true; st.doubler = st.turn; st.turn = 1 - st.turn; st.dice = null; }
    else if (a.t === 'k') { st.offered = false; st.cube *= 2; st.owner = st.turn; st.turn = 1 - st.turn; }
    else if (a.t === 'p') { st.offered = false; st.over = true; st.winner = 1 - st.turn; st.points = st.cube; st.kind = 0; st.dropped = true; st.turn = -1; }
    else if (a.t === 'x') { st.over = true; st.winner = a.w; st.points = a.n * st.cube; st.kind = -a.n; st.resigned = true; st.turn = -1; }
  }
  return st;
}

// ---------------------------------------------------------------------------------------------- record encoding
// URL-safe compact text: seed.matchLen.flags.games   (games separated by '~', actions by '-')
// roll action: two dice digits followed by one char per move: from (A-Z = 0..25) then to (A-Z), hits are implied.
// d = double, k = take, p = pass, xN / yN = resignation by side 1 / side 0 (N points).
const A26 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function encodeGame(actions) {
  return actions.map(a => {
    if (a.t === 'r') return '' + a.d[0] + a.d[1] + a.m.map(c => A26[mvFrom(c)] + A26[mvTo(c)]).join('');
    if (a.t === 'x') return (a.w === 0 ? 'x' : 'y') + a.n;
    return a.t === 'd' ? 'd' : a.t === 'k' ? 'k' : 'p';
  }).join('-');
}
// decode and validate against the rules; returns {actions, error}
function decodeGame(str) {
  const actions = [];
  if (!str) return { actions };
  const toks = str.split('-');
  let st = replay([]);
  for (let i = 0; i < toks.length; i++) {
    const tk = toks[i];
    if (st.over) return { actions, error: i + 1 };
    let a;
    if (/^[1-6]{2}([A-Z]{2})*$/.test(tk)) {
      const d = [+tk[0], +tk[1]];
      if (st.nRolls === 0 && d[0] === d[1]) return { actions, error: i + 1 };
      if (st.offered) return { actions, error: i + 1 };
      const s = st.nRolls === 0 ? (d[0] > d[1] ? 0 : 1) : st.turn;
      const mv = [];
      const q = st.pos.slice();
      for (let j = 2; j < tk.length; j += 2) {
        const f = A26.indexOf(tk[j]), t = A26.indexOf(tk[j + 1]);
        mv.push(apply(q, s, f, t));
      }
      // must equal one of the legal plays
      const plays = genPlays(st.pos, s, d[0], d[1]);
      const k = key(q);
      const pl = plays.find(x => key(x.pos) === k);
      if (!pl) return { actions, error: i + 1 };
      a = { t: 'r', d, m: mv };
    } else if (tk === 'd' || tk === 'k' || tk === 'p') {
      if (tk === 'd' && (st.offered || st.nRolls === 0)) return { actions, error: i + 1 };
      if ((tk === 'k' || tk === 'p') && !st.offered) return { actions, error: i + 1 };
      a = { t: tk };
    } else if (/^[xy][1-3]$/.test(tk)) {
      a = { t: 'x', w: tk[0] === 'x' ? 0 : 1, n: +tk[1] };
    } else return { actions, error: i + 1 };
    actions.push(a);
    st = replay(actions);
  }
  return { actions };
}

// ---------------------------------------------------------------------------------------------- neural evaluator
// Inputs from the perspective of the side ON ROLL (s): its features first, then the opponent's.
// Per side: 24 points x 4 (n>=1, n>=2, n>=3, (n-3)/2), bar n/2, off n/15 -> 98, then 12 GNUbg-style contact features
// (break-contact pips, rear checker, anchors, chance of being hit, escapes / containment, entering, prime, home board);
// finally 3 pip-count features. Two nets: one for contact positions, one for races (bear-offs use the database).
const NRAW = 98, NSF = 12, NIN = (NRAW + NSF) * 2 + 3;
// GNUbg escape table: bit i set = point at distance i+1 blocked; counts rolls (of 36) that jump past with the full roll
const ESC = new Uint8Array(4096);
for (let i = 0; i < 4096; i++) { let c = 0; for (let a = 0; a <= 5; a++) for (let b = 0; b <= a; b++) if (!(i & (1 << (a + b + 1))) && !((i & (1 << a)) && (i & (1 << b)))) c += a === b ? 1 : 2; ESC[i] = c; }
const _blk = new Uint8Array(26), _opn = new Uint8Array(26), _att = new Int8Array(16), _blt = new Int8Array(16);
// rolls (of 36) on which a checker of side X at X-point b passes the blockade of side Y (blocked: Y owns X-point)
function escapes(blk, b) {
  let af = 0; const m = Math.min(b - 1, 12);
  for (let i = 0; i < m; i++) if (blk[b - i - 1]) af |= 1 << i;
  return ESC[af];
}
function sideFeatures(p, X, x, k) {
  const m = X * 26, o = 26 - m;
  // _blk[i]: Y has a point at X-point i; _opn[i]: X does NOT have a point at X-point i (for Y's landing)
  for (let i = 1; i <= 24; i++) { _blk[i] = p[o + 25 - i] >= 2 ? 1 : 0; _opn[i] = p[m + i] >= 2 ? 0 : 1; }
  _opn[0] = 1;
  let back = 0; for (let i = 25; i >= 1; i--) if (p[m + i]) { back = i; break; }
  let yback = 0; for (let j = 25; j >= 1; j--) if (p[o + j]) { yback = j; break; }
  const lim = 25 - yback;   // X checkers above X-point lim still have to pass Y's rear checker
  let brk = 0; for (let i = lim + 1; i <= 25; i++) if (p[m + i]) brk += p[m + i] * (i - lim);
  let bAnc = 0, nAnc = 0; for (let i = 19; i <= 24; i++) if (p[m + i] >= 2) { bAnc = i - 18; nAnc++; }
  // chance that Y hits at least one X blot next roll
  let nb = 0, na = 0;
  for (let i = 1; i <= 24; i++) if (p[m + i] === 1) _blt[nb++] = i;
  let hit = 0;
  if (nb) {
    if (p[o + 25] > 0) _att[na++] = 0; else for (let j = 1; j <= 24; j++) if (p[o + j]) { const A = 25 - j; if (A < _blt[nb - 1]) _att[na++] = A; }
    for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) {
      let h = false;
      for (let q = 0; q < na && !h; q++) {
        const A = _att[q];
        for (let r = 0; r < nb; r++) {
          const d = _blt[r] - A; if (d <= 0) continue;
          if (a !== b) {
            if (d === a || d === b || (d === a + b && (_opn[A + a] || _opn[A + b]))) { h = true; break; }
          } else if (d % a === 0 && d <= 4 * a) {
            let ok = true; for (let t = 1; t < d / a; t++) if (!_opn[A + a * t]) { ok = false; break; }
            if (ok) { h = true; break; }
          }
        }
      }
      if (h) hit += a === b ? 1 : 2;
    }
  }
  const bEsc = back >= 13 && back <= 24 ? escapes(_blk, back) : 36;
  let cont = 36; for (let i = 15; i <= 24; i++) { const e = escapes(_blk, i); if (e < cont) cont = e; }
  let closed = 0; for (let i = 19; i <= 24; i++) if (_blk[i]) closed++;
  let run = 0, prime = 0; for (let i = 1; i <= 24; i++) { if (p[m + i] >= 2) { run++; if (run > prime) prime = run; } else run = 0; }
  let home = 0; for (let i = 1; i <= 6; i++) if (p[m + i] >= 2) home++;
  let backN = 0; for (let i = 19; i <= 25; i++) backN += p[m + i];
  x[k++] = brk / 152; x[k++] = back / 24; x[k++] = bAnc / 6; x[k++] = nAnc / 2; x[k++] = hit / 36; x[k++] = bEsc / 36;
  const c = (36 - cont) / 36; x[k++] = c; x[k++] = c * c;
  x[k++] = p[m + 25] ? (closed / 6) * (closed / 6) : 0; x[k++] = Math.min(prime, 6) / 6; x[k++] = home / 6; x[k++] = backN / 5;
  return k;
}
function features(p, s, x) {
  let k = 0;
  for (const side of [s, 1 - s]) {
    const m = side * 26;
    for (let i = 1; i <= 24; i++) {
      const n = p[m + i];
      x[k++] = n >= 1 ? 1 : 0; x[k++] = n >= 2 ? 1 : 0; x[k++] = n >= 3 ? 1 : 0; x[k++] = n > 3 ? (n - 3) / 2 : 0;
    }
    x[k++] = p[m + 25] / 2; x[k++] = p[m] / 15;
  }
  k = sideFeatures(p, s, x, k); k = sideFeatures(p, 1 - s, x, k);
  const ps = pips(p, s), po = pips(p, 1 - s);
  x[k++] = ps / 167; x[k++] = po / 167; x[k++] = (po - ps) / 40;
  return x;
}
function Net(nh, w) {
  this.ni = NIN; this.nh = nh; this.no = 5;
  const size = nh * NIN + nh + 5 * nh + 5;
  this.w = w || new Float32Array(size);
  this.layout();
  this.x = new Float32Array(NIN); this.h = new Float32Array(nh); this.y = new Float32Array(5);
}
Net.prototype.layout = function () {
  const nh = this.nh, ni = this.ni;
  this.oW1 = 0; this.oB1 = nh * ni; this.oW2 = this.oB1 + nh; this.oB2 = this.oW2 + 5 * nh;
};
Net.prototype.randomize = function (rnd) {
  const w = this.w; rnd = rnd || Math.random;
  for (let i = 0; i < w.length; i++) w[i] = (rnd() * 2 - 1) * 0.1;
};
// forward on the feature vector this.x -> this.y (5 sigmoid outputs); weights stored input-major per hidden unit
Net.prototype.forwardX = function () {
  const w = this.w, x = this.x, h = this.h, y = this.y, ni = this.ni, nh = this.nh;
  const nz = this._nz || (this._nz = new Int32Array(ni)); let nn = 0;
  for (let i = 0; i < ni; i++) if (x[i] !== 0) nz[nn++] = i;
  for (let j = 0; j < nh; j++) {
    let a = w[this.oB1 + j];
    const row = j * ni;
    for (let q = 0; q < nn; q++) { const i = nz[q]; a += w[row + i] * x[i]; }
    h[j] = 1 / (1 + Math.exp(-a));
  }
  for (let k = 0; k < 5; k++) {
    let a = w[this.oB2 + k];
    const row = this.oW2 + k * nh;
    for (let j = 0; j < nh; j++) a += w[row + j] * h[j];
    y[k] = 1 / (1 + Math.exp(-a));
  }
  return y;
};
Net.prototype.forward = function (p, s) { features(p, s, this.x); return this.forwardX(); };

// ---------------------------------------------------------------------------------------------- wildbg evaluator
// Optional stronger evaluator: the contact / race networks of wildbg (https://github.com/carsten-wenderdel/wildbg,
// MIT OR Apache-2.0, (c) Carsten Wenderdel), trained by supervised learning on rollouts. Weights are stored as
// float16 in wildbg.bin (layout in wildbg.json). Inputs follow wildbg's crates/engine/src/inputs.rs.
let WB = null;
function f16(h) {
  const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, f = h & 1023;
  if (e === 0) return s * f * 5.960464477539063e-8;
  if (e === 31) return f ? NaN : s * Infinity;
  return s * (1 + f / 1024) * Math.pow(2, e - 15);
}
function loadWildbg(man, buf) {
  const u16 = new Uint16Array(buf), tab = new Float32Array(65536);
  for (let i = 0; i < 65536; i++) tab[i] = f16(i);
  const nets = {};
  for (const k in man.nets) {
    const N = man.nets[k], L = N.layers.map(l => {
      const a = new Float32Array(l.n); for (let i = 0; i < l.n; i++) a[i] = tab[u16[l.offset + i]];
      return { rows: l.rows, cols: l.cols, w: a.subarray(0, l.rows * l.cols), b: a.subarray(l.rows * l.cols) };
    });
    nets[k] = { act: N.act, ni: N.inputs, L, x: new Float32Array(N.inputs), hs: L.map(l => new Float32Array(l.transposed ? l.cols : (l.rows))) };
    // hidden buffers: layer 0 (transposed [in][out]) has cols outputs, the others [out][in] have rows outputs
    nets[k].hs = [new Float32Array(L[0].cols), new Float32Array(L[1].rows), new Float32Array(L[2].rows), new Float32Array(L[3].rows)];
  }
  WB = nets; return WB;
}
function wbTd(x, k, n) { if (n === 1) x[k] = 1; else if (n === 2) x[k + 1] = 1; else if (n >= 3) { x[k + 2] = 1; x[k + 3] = n - 3; } }
function wbInputs(p, s, race, x) {
  x.fill(0);
  const m = s * 26, o = 26 - m;
  x[0] = p[m]; x[1] = p[o];
  if (race) {
    let k = 2; for (let i = 1; i <= 23; i++, k += 4) wbTd(x, k, p[m + i]);
    for (let i = 2; i <= 24; i++, k += 4) wbTd(x, k, p[o + 25 - i]);
  } else {
    wbTd(x, 2, p[m + 25]);
    let k = 6; for (let i = 1; i <= 24; i++, k += 4) wbTd(x, k, p[m + i]);
    wbTd(x, k, p[o + 25]); k += 4;
    for (let i = 1; i <= 24; i++, k += 4) wbTd(x, k, p[o + 25 - i]);
  }
}
function wbForward(net) {
  const L = net.L, x = net.x, hs = net.hs, hard = net.act === 'hardsigmoid';
  // layer 1: sparse inputs, weights [in][out]
  const h1 = hs[0], n1 = L[0].cols, w1 = L[0].w; h1.set(L[0].b);
  for (let i = 0; i < net.ni; i++) { const v = x[i]; if (v === 0) continue; const r = i * n1; for (let j = 0; j < n1; j++) h1[j] += v * w1[r + j]; }
  const act = h => { for (let j = 0; j < h.length; j++) { const a = h[j]; h[j] = hard ? (a <= -3 ? 0 : a >= 3 ? 1 : a / 6 + 0.5) : (a > 0 ? a : 0); } };
  act(h1);
  let prev = h1;
  for (let l = 1; l < 4; l++) {
    const W = L[l].w, B = L[l].b, out = hs[l], ni = L[l].cols, no = L[l].rows;
    for (let j = 0; j < no; j++) { let a = B[j]; const r = j * ni; for (let i = 0; i < ni; i++) a += W[r + i] * prev[i]; out[j] = a; }
    if (l < 3) act(out);
    prev = out;
  }
  // softmax over [winN, winG, winBG, loseN, loseG, loseBG]
  let mx = -1e9; for (let j = 0; j < 6; j++) if (prev[j] > mx) mx = prev[j];
  let sum = 0; const e = [0, 0, 0, 0, 0, 0]; for (let j = 0; j < 6; j++) { e[j] = Math.exp(prev[j] - mx); sum += e[j]; }
  const wn = e[0] / sum, wg = e[1] / sum, wb = e[2] / sum, lg = e[4] / sum, lb = e[5] / sum;
  return [wn + wg + wb, wg + wb, wb, lg + lb, lb];
}
function wbEval(p, s) { const race = !contact(p), net = race ? WB.race : WB.contact; wbInputs(p, s, race, net.x); return wbForward(net); }

// probabilities from the perspective of the side on roll: [win, winG, winBG, loseG, loseBG] (gammons include backgammons)
function sanitize(y) {
  let w = Math.min(1, Math.max(0, y[0]));
  let wg = Math.min(w, Math.max(0, y[1])), wb = Math.min(wg, Math.max(0, y[2]));
  let lg = Math.min(1 - w, Math.max(0, y[3])), lb = Math.min(lg, Math.max(0, y[4]));
  return [w, wg, wb, lg, lb];
}
function flip(v) { return [1 - v[0], v[3], v[4], v[1], v[2]]; }
function equity(v) { return 2 * v[0] - 1 + v[1] - v[3] + v[2] - v[4]; }

// ---------------------------------------------------------------------------------------------- bear-off database
// One-sided database for up to 15 checkers on the six home points: for each position the distribution of the number
// of rolls needed to bear everything off (playing to minimise the expected number of rolls), and, for positions with
// all 15 checkers, the distribution of rolls needed to bear off the first checker (for gammon chances).
function choose(n, k) { if (k < 0 || k > n) return 0; let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); }
const BO_N = choose(21, 6);   // 54264
const CC = []; for (let n = 0; n <= 21; n++) { CC[n] = []; for (let k = 0; k <= 7; k++) CC[n][k] = choose(n, k); }
// number of ways to put n checkers into b bins
const ways = (n, b) => CC[n + b - 1] ? CC[n + b - 1][b - 1] : choose(n + b - 1, b - 1);
// rank of counts c[1..6] with total <= 15 (the seventh bin takes the rest)
function boIndex(c) {
  let left = 15, r = 0;
  for (let i = 1; i <= 6; i++) {
    const bins = 7 - i + 1;   // bins left including this one (this, the remaining points, and 'off')
    for (let v = 0; v < c[i]; v++) r += ways(left - v, bins - 1);
    left -= c[i];
  }
  return r;
}
function boIndexPos(p, s) {
  const m = s * 26, c = [0, p[m + 1], p[m + 2], p[m + 3], p[m + 4], p[m + 5], p[m + 6]];
  return boIndex(c);
}
let BO = null;   // {dist: [Float64Array...] via offsets, first}
function loadBearoff(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  if (String.fromCharCode(u8[0], u8[1], u8[2], u8[3]) !== 'BGBO') throw new Error('bad bear-off db');
  const n = dv.getUint32(4, true);
  let off = 8;
  const lo = new Uint8Array(n), len = new Uint8Array(n), start = new Uint32Array(n);
  const flo = new Uint8Array(n), flen = new Uint8Array(n), fstart = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    lo[i] = u8[off]; len[i] = u8[off + 1]; off += 2; start[i] = off; off += 2 * len[i];
    flo[i] = u8[off]; flen[i] = u8[off + 1]; off += 2; fstart[i] = off; off += 2 * flen[i];
  }
  BO = { n, u8, dv, lo, len, start, flo, flen, fstart, cache: new Map() };
  return BO;
}
// distribution arrays (Float64Array index = number of rolls), normalised
function boDist(i, first) {
  const ck = first ? -1 - i : i;
  let d = BO.cache.get(ck);
  if (d) return d;
  const lo = first ? BO.flo[i] : BO.lo[i], len = first ? BO.flen[i] : BO.len[i], st = first ? BO.fstart[i] : BO.start[i];
  d = new Float64Array(lo + len + 1);
  let sum = 0;
  for (let k = 0; k < len; k++) { const v = BO.dv.getUint16(st + 2 * k, true); d[lo + k] = v; sum += v; }
  if (sum > 0) for (let k = 0; k < d.length; k++) d[k] /= sum;
  if (BO.cache.size > 200000) BO.cache.clear();
  BO.cache.set(ck, d);
  return d;
}
function isBearoffPos(p) { return BO && allHome(p, 0) && allHome(p, 1); }
// exact-ish probabilities for the side on roll s when both sides are bearing off (no contact possible)
function bearoffEval(p, s) {
  const a = boDist(boIndexPos(p, s)), b = boDist(boIndexPos(p, 1 - s));
  // P(Nb >= n) suffix sums
  const sb = new Float64Array(Math.max(a.length, b.length) + 2);
  for (let n = b.length - 1; n >= 0; n--) sb[n] = sb[n + 1] + b[n];
  let win = 0;
  for (let n = 1; n < a.length; n++) if (a[n]) win += a[n] * sb[n];   // on roll wins if Na <= Nb
  let wg = 0, lg = 0;
  if (p[(1 - s) * 26] === 0 && BO.flen[boIndexPos(p, 1 - s)]) {
    const f = boDist(boIndexPos(p, 1 - s), true);   // opponent's rolls to get the first checker off
    const sf = new Float64Array(Math.max(f.length, a.length) + 2);
    for (let n = f.length - 1; n >= 0; n--) sf[n] = sf[n + 1] + f[n];
    for (let n = 1; n < a.length; n++) if (a[n]) wg += a[n] * (n - 1 < sf.length ? sf[n] : 0);   // P(F_b > n-1) = P(F_b >= n)
  }
  if (p[s * 26] === 0 && BO.flen[boIndexPos(p, s)]) {
    const f = boDist(boIndexPos(p, s), true);
    const sa = new Float64Array(Math.max(f.length, b.length) + 2);
    for (let n = f.length - 1; n >= 0; n--) sa[n] = sa[n + 1] + f[n];
    // opponent finishes on its n-th roll; we have had n rolls: gammon if our F > n
    for (let n = 1; n < b.length; n++) if (b[n]) lg += b[n] * (n + 1 < sa.length ? sa[n + 1] : 0);
  }
  return [win, Math.min(wg, win), 0, Math.min(lg, 1 - win), 0];
}
// expected rolls to bear off (for lessons / display)
function boExpected(p, s) { const d = boDist(boIndexPos(p, s)); let e = 0; for (let n = 0; n < d.length; n++) e += n * d[n]; return e; }

// ---------------------------------------------------------------------------------------------- evaluation
let NET = null, NETR = null;
function setNet(net) { NET = net; }
// j: {contact:{nh,w}, race:{nh,w}} (w: arrays)
function setNets(j) { NET = j && j.contact ? new Net(j.contact.nh, Float32Array.from(j.contact.w)) : null; NETR = j && j.race ? new Net(j.race.nh, Float32Array.from(j.race.w)) : null; }
// static evaluation of position p with side s on roll -> probabilities (on-roll perspective)
function evalPos(p, s) {
  const w = winner(p);
  if (w >= 0) { const k = winKind(p, w); const me = w === s; return me ? [1, k >= 2 ? 1 : 0, k >= 3 ? 1 : 0, 0, 0] : [0, 0, 0, k >= 2 ? 1 : 0, k >= 3 ? 1 : 0]; }
  if (isBearoffPos(p)) return bearoffEval(p, s);
  if (WB) return wbEval(p, s);
  if (NETR && !contact(p)) return sanitize(NETR.forward(p, s));
  if (NET) return sanitize(NET.forward(p, s));
  return heurEval(p, s);
}
// simple hand-written evaluator (fallback & weak levels): pip race + blots + made points
function heurEval(p, s) {
  const ps = pips(p, s), po = pips(p, 1 - s);
  let sc = (po - ps) * 0.012 + (p[s * 26] - p[(1 - s) * 26]) * 0.02;
  for (const [side, sg] of [[s, 1], [1 - s, -1]]) {
    const m = side * 26;
    let blots = 0, made = 0;
    for (let i = 1; i <= 24; i++) { if (p[m + i] === 1) blots += i > 6 ? 1.2 : 0.8; if (p[m + i] >= 2 && i <= 11) made += i <= 7 ? 1.2 : 0.7; }
    sc += sg * (made * 0.06 - blots * 0.07 - p[m + 25] * 0.12);
  }
  const w = 1 / (1 + Math.exp(-sc * 2));
  return [w, w * 0.2, w * 0.01, (1 - w) * 0.2, (1 - w) * 0.01];
}
// evaluation of a candidate play from the mover's perspective: the result has the opponent on roll
function evalAfter(q, mover) { return flip(evalPos(q, 1 - mover)); }

const ROLLS = []; for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) ROLLS.push([a, b, a === b ? 1 / 36 : 2 / 36]);

// best play by 0-ply for side s with dice
function bestPlay0(p, s, d1, d2) {
  const plays = genPlays(p, s, d1, d2);
  let best = null, be = -1e9;
  for (const pl of plays) { const v = evalAfter(pl.pos, s); const e = equity(v); if (e > be) { be = e; best = pl; best.v = v; } }
  return best;
}
// 1-ply value of position q (opponent o on roll): average over o's rolls of o's best 0-ply reply. Returns probs from
// the perspective of the player who just moved (1-o).
function eval1(q, o) {
  const w = winner(q);
  if (w >= 0 || isBearoffPos(q)) return flip(evalPos(q, o));
  const acc = [0, 0, 0, 0, 0];
  for (const [a, b, pr] of ROLLS) {
    const pl = bestPlay0(q, o, a, b);           // pl.v: o's perspective after its reply (mover = o)
    const v = pl.v;   // from o's perspective
    // convert to the perspective of 1-o
    acc[0] += pr * (1 - v[0]); acc[1] += pr * v[3]; acc[2] += pr * v[4]; acc[3] += pr * v[1]; acc[4] += pr * v[2];
  }
  return acc;
}
// 2-ply: average over opponent rolls of the opponent's best reply (chosen by 0-ply) valued by our 1-ply ... (expensive)
function eval2(q, o) {
  const w = winner(q);
  if (w >= 0 || isBearoffPos(q)) return flip(evalPos(q, o));
  const acc = [0, 0, 0, 0, 0];
  for (const [a, b, pr] of ROLLS) {
    // opponent picks its reply by 0-ply, then we value the result by 1-ply (our rolls)
    const plays = genPlays(q, o, a, b);
    let best = null, be = -1e9;
    for (const pl of plays) { const e = equity(evalAfter(pl.pos, o)); if (e > be) { be = e; best = pl; } }
    const v = eval1(best.pos, 1 - o);   // perspective of o (who just moved)
    acc[0] += pr * (1 - v[0]); acc[1] += pr * v[3]; acc[2] += pr * v[4]; acc[3] += pr * v[1]; acc[4] += pr * v[2];
  }
  return acc;
}


// ---- hybrid search used when the wildbg evaluator is loaded: the fast net (GNUbg-style inputs) pre-selects the
// opponent's replies (like GNUbg's pruning nets) and only the best few are valued by the strong evaluator.
function evalFast(p, s) {
  const w = winner(p);
  if (w >= 0 || isBearoffPos(p)) return evalPos(p, s);
  if (NETR && !contact(p)) return sanitize(NETR.forward(p, s));
  if (NET) return sanitize(NET.forward(p, s));
  return evalPos(p, s);
}
// best reply of side o with dice (a,b): top `k` by the fast net, re-valued by the strong evaluator; returns o's probs
function hybReply(q, o, a, b, k) {
  const plays = genPlays(q, o, a, b);
  if (plays.length === 1) return { pos: plays[0].pos, v: flip(evalPos(plays[0].pos, 1 - o)) };
  const sc = plays.map(pl => ({ pl, e: equity(flip(evalFast(pl.pos, 1 - o))) }));
  sc.sort((x, y) => y.e - x.e);
  let best = null, be = -1e9;
  for (let i = 0; i < Math.min(k, sc.length); i++) {
    if (i > 0 && sc[i].e < sc[0].e - 0.12) break;
    const v = flip(evalPos(sc[i].pl.pos, 1 - o)), e = equity(v);
    if (e > be) { be = e; best = { pos: sc[i].pl.pos, v }; }
  }
  return best;
}
const HYB_K = 2;
// value of the position after a play (o to roll) at a given depth, with the best available evaluator
function evalPly(q, o, ply) { return ply >= 2 ? (WB ? hyb2(q, o) : eval2(q, o)) : ply >= 1 ? (WB ? hyb1(q, o) : eval1(q, o)) : flip(evalPos(q, o)); }
function hasWildbg() { return !!WB; }
// 1-ply: position q, o to roll; probs from the perspective of 1-o (the player who just moved)
function hyb1(q, o) {
  const w = winner(q);
  if (w >= 0 || isBearoffPos(q)) return flip(evalPos(q, o));
  const acc = [0, 0, 0, 0, 0];
  for (const [a, b, pr] of ROLLS) {
    const v = hybReply(q, o, a, b, HYB_K).v;   // o's perspective after its reply
    acc[0] += pr * (1 - v[0]); acc[1] += pr * v[3]; acc[2] += pr * v[4]; acc[3] += pr * v[1]; acc[4] += pr * v[2];
  }
  return acc;
}
// 2-ply: o replies (hybrid choice), then the reply is valued by our hybrid 1-ply
function hyb2(q, o) {
  const w = winner(q);
  if (w >= 0 || isBearoffPos(q)) return flip(evalPos(q, o));
  const acc = [0, 0, 0, 0, 0];
  for (const [a, b, pr] of ROLLS) {
    const r = hybReply(q, o, a, b, HYB_K);
    const v = winner(r.pos) >= 0 || isBearoffPos(r.pos) ? r.v : hyb1(r.pos, 1 - o);   // o's perspective
    acc[0] += pr * (1 - v[0]); acc[1] += pr * v[3]; acc[2] += pr * v[4]; acc[3] += pr * v[1]; acc[4] += pr * v[2];
  }
  return acc;
}
// rank plays: returns [{pos, moves, v, e, ply}] sorted by equity (mover's perspective, cubeless money)
// opts: {ply: 0|1|2, keep1: n candidates for 1-ply, keep2: n for 2-ply, margin1, margin2, deadline}
function analyzePlays(p, s, d1, d2, opts) {
  opts = opts || {};
  const plays = genPlays(p, s, d1, d2);
  for (const pl of plays) { pl.v = opts.fast ? flip(evalFast(pl.pos, 1 - s)) : evalAfter(pl.pos, s); pl.e = equity(pl.v); pl.ply = 0; }
  plays.sort((a, b) => b.e - a.e);
  const ply = opts.ply || 0;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (ply >= 1 && plays.length > 1) {
    const k1 = Math.min(plays.length, opts.keep1 || 6), top = plays[0].e, m1 = opts.margin1 || 0.25;
    for (let i = 0; i < k1; i++) {
      if (i > 1 && plays[i].e < top - m1) break;
      if (opts.deadline && i > 1 && now() > opts.deadline) break;
      plays[i].v = WB ? hyb1(plays[i].pos, 1 - s) : eval1(plays[i].pos, 1 - s); plays[i].e = equity(plays[i].v); plays[i].ply = 1;
    }
    plays.sort((a, b) => (b.ply - a.ply) || (b.e - a.e));
    if (ply >= 2 && plays.length > 1) {
      const k2 = Math.min(plays.length, opts.keep2 || 3), top2 = plays[0].e, m2 = opts.margin2 || 0.08;
      for (let i = 0; i < k2; i++) {
        if (plays[i].ply < 1) break;
        if (i > 0 && plays[i].e < top2 - m2) break;
        if (opts.deadline && i > 0 && now() > opts.deadline) break;
        plays[i].v = WB ? hyb2(plays[i].pos, 1 - s) : eval2(plays[i].pos, 1 - s); plays[i].e = equity(plays[i].v); plays[i].ply = 2;
      }
      plays.sort((a, b) => (b.ply - a.ply) || (b.e - a.e));
    }
  }
  return plays;
}
// value of a position BEFORE the roll for the side on roll, at a given depth (0: static; 1: average over own rolls of best 0-ply play)
function evalRoll(p, s, depth) {
  if (winner(p) >= 0) return evalPos(p, s);
  if (!depth) return evalPos(p, s);
  const acc = [0, 0, 0, 0, 0];
  for (const [a, b, pr] of ROLLS) {
    let v;
    if (depth >= 2) { const pl = analyzePlays(p, s, a, b, { ply: 1, keep1: 3, margin1: 0.12 })[0]; v = pl.v; }
    else v = bestPlay0(p, s, a, b).v;
    for (let k = 0; k < 5; k++) acc[k] += pr * v[k];
  }
  return acc;
}

// ---------------------------------------------------------------------------------------------- match equity & cube
// Match equity table (probability that the player needing a points wins against one needing b points).
// Crawford and post-Crawford entries are computed exactly under a simple model (gammon rate G of wins, trailer
// doubles at once after Crawford); pre-Crawford entries use Turner's formula clipped into a consistent range.
const MET_G = 0.26, MET_MAX = 15;
let METc = null;
function buildMET() {
  const N = MET_MAX + 1;
  // post-Crawford: leader needs 1, trailer needs b; trailer doubles immediately -> each game worth 2 (or 1 if b == 1)
  const post = new Float64Array(N + 2);   // post[b] = trailer's winning chance needing b vs 1-away leader
  post[0] = 1; post[1] = 0.5;
  for (let b = 2; b <= N; b++) {
    // cube on 2: trailer wins 2 (single) or 4 (gammon) points
    const ns = Math.max(0, b - 2), ng = Math.max(0, b - 4);
    post[b] = 0.5 * ((1 - MET_G) * (ns === 0 ? 1 : post[ns]) + MET_G * (ng === 0 ? 1 : post[ng]));
  }
  // Crawford game: leader 1-away, trailer needs b, no cube
  const craw = new Float64Array(N + 2);
  craw[1] = 0.5;
  for (let b = 2; b <= N; b++) {
    const ns = b - 1, ng = Math.max(0, b - 2);
    craw[b] = 0.5 * ((1 - MET_G) * (ns <= 0 ? 1 : post[ns]) + MET_G * (ng <= 0 ? 1 : post[ng]));
  }
  const M = [];
  for (let a = 0; a <= N; a++) {
    M[a] = [];
    for (let b = 0; b <= N; b++) {
      if (a === 0 && b === 0) M[a][b] = 0.5;
      else if (a === 0) M[a][b] = 1;
      else if (b === 0) M[a][b] = 0;
      else if (a === 1 && b === 1) M[a][b] = 0.5;
      else if (a === 1) M[a][b] = 1 - craw[b];     // we are the 1-away leader (Crawford game value)
      else if (b === 1) M[a][b] = craw[a];
      else {
        const D = b - a, T = Math.max(a, b);
        let lead = 0.5 + 0.85 * Math.abs(D) / (T + 6);
        lead = Math.min(lead, 0.97);
        M[a][b] = D >= 0 ? lead : 1 - lead;
      }
    }
  }
  METc = { M, post, craw };
  return METc;
}
// MWC for "me" needing a, opponent needing b (a, b <= 0 means already won), postCrawford flag for 1-away entries
function mwc(a, b, postCraw) {
  if (!METc) buildMET();
  if (a <= 0) return 1;
  if (b <= 0) return 0;
  if (postCraw) {
    if (a === 1 && b === 1) return 0.5;
    if (a === 1) return 1 - METc.post[Math.min(b, MET_MAX)];
    if (b === 1) return METc.post[Math.min(a, MET_MAX)];
  }
  return METc.M[Math.min(a, MET_MAX)][Math.min(b, MET_MAX)];
}

// Janowski-style cubeful money equity (cube value 1) for cube ownership own: 0 centred, 1 mine, -1 opponent's
function janowski(v, own, x, Wv, Lv) {
  const p = v[0];
  const W = Wv !== undefined ? Wv : (p > 1e-6 ? 1 + (v[1] + v[2]) / p : 1);
  const L = Lv !== undefined ? Lv : (p < 1 - 1e-6 ? 1 + (v[3] + v[4]) / (1 - p) : 1);
  const dead = p * W - (1 - p) * L;
  const TP = (L - 0.5) / (W + L + 0.5), CP = (L + 1) / (W + L + 0.5);
  let live;
  if (own === 0) live = p <= TP ? -1 : p >= CP ? 1 : -1 + 2 * (p - TP) / (CP - TP);
  else if (own === 1) live = p >= CP ? 1 : -L + (1 + L) * p / CP;
  else live = p <= TP ? -1 : -1 + (W + 1) * (p - TP) / (1 - TP);
  return x * live + (1 - x) * dead;
}
// cube decision for the side on roll. v = cubeless probabilities before rolling (on-roll perspective).
// ctx: {cube, owner(-1 centre, 0/1), me, matchLen(0 = money), score:[s0,s1], crawford(bool: this is the Crawford game), postCrawford, x}
// returns {nd, dt, dp, double:bool, take:bool} in "equity" units (money: per unit cube; match: MWC scaled to [-1,1])
function cubeDecision(v, ctx) {
  const x = ctx.x !== undefined ? ctx.x : 0.68;
  const me = ctx.me, cube = ctx.cube;
  const ownNow = ctx.owner === -1 ? 0 : ctx.owner === me ? 1 : -1;
  if (!ctx.matchLen) {
    const nd = cube * janowski(v, ownNow, x);
    const dt = 2 * cube * janowski(v, -1, x);
    const dp = cube;
    return { nd, dt, dp, double: Math.min(dt, dp) > nd, take: dt < dp, mode: 'money' };
  }
  const need = [ctx.matchLen - ctx.score[0], ctx.matchLen - ctx.score[1]];
  const a = need[me], b = need[1 - me], pc = !!ctx.postCrawford;
  // MWC outcome values at cube c
  const val = c => {
    const W1 = mwc(a - c, b, pc), W2 = mwc(a - 2 * c, b, pc), W3 = mwc(a - 3 * c, b, pc);
    const L1 = mwc(a, b - c, pc), L2 = mwc(a, b - 2 * c, pc), L3 = mwc(a, b - 3 * c, pc);
    const p = v[0], wg = v[1] - v[2], wb = v[2], lg = v[3] - v[4], lb = v[4];
    const ws = p - v[1], ls = (1 - p) - v[3];
    const winAvg = p > 1e-9 ? (ws * W1 + wg * W2 + wb * W3) / p : W1;
    const loseAvg = 1 - p > 1e-9 ? (ls * L1 + lg * L2 + lb * L3) / (1 - p) : L1;
    const mid = (W1 + L1) / 2, unit = (W1 - L1) / 2;
    return { W1, L1, mid, unit, W: unit > 1e-9 ? (winAvg - mid) / unit : 1, L: unit > 1e-9 ? (mid - loseAvg) / unit : 1 };
  };
  const cur = val(cube);
  // cube efficiency is lost when the owner could not usefully redouble
  const xOwn = (own, c) => {
    const ownerNeed = own === 1 ? a : own === -1 ? b : Math.min(a, b);
    return c >= ownerNeed ? 0 : x;
  };
  const ndE = cur.unit > 1e-9 ? janowski(v, ownNow, xOwn(ownNow, cube), cur.W, cur.L) : 0;
  const nd = cur.mid + cur.unit * ndE;
  const v2 = val(2 * cube);
  const dtE = v2.unit > 1e-9 ? janowski(v, -1, xOwn(-1, 2 * cube), v2.W, v2.L) : 0;
  const dt = v2.mid + v2.unit * dtE;
  const dp = cur.W1;
  // scale MWC to [-1, 1]
  const sc = m => 2 * m - 1;
  let dbl = Math.min(dt, dp) > nd + 1e-9;
  if (ctx.crawford) dbl = false;
  if (cube >= a) dbl = false;   // already enough to win the match
  return { nd: sc(nd), dt: sc(dt), dp: sc(dp), double: dbl, take: dt <= dp + 1e-9, mode: 'match' };
}
function cubeAvailable(st, ctx, side) {
  if (!ctx.cubeOn || st.over || st.offered) return false;
  if (ctx.crawford) return false;
  if (st.owner !== -1 && st.owner !== side) return false;
  if (ctx.matchLen) {
    const need = ctx.matchLen - ctx.score[side];
    if (st.cube >= need) return false;
  }
  return st.nRolls > 0;
}

// ---------------------------------------------------------------------------------------------- AI levels
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
// deterministic per-request noise (so a given level plays reproducibly for a given position)
function rng(seedStr) { const h = cyrb128(seedStr); let a = h[0], b = h[1]; return () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; b = (b + 0x6D2B79F5) | 0; return (((a ^ b) >>> 0) / 4294967296); }; }
function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
const NOISE = [0, 0, 0.5, 0.25, 0.12, 0.06, 0.025, 0, 0, 0, 0];
// Levels: 1 random · 2–6 net with decreasing noise · 7 net 0-ply · 8 1-ply · 9 2-ply (narrow) · 10 2-ply (wide, ~1–2 s)
function aiChoosePlay(pos, side, dice, level, tag) {
  const r = rng(key(pos) + '|' + dice.join('') + '|' + level + '|' + (tag || ''));
  if (level <= 1) { const pl = genPlays(pos, side, dice[0], dice[1]); return pl[Math.floor(r() * pl.length)]; }
  if (level <= 7) {
    // gentle levels use the fast net (+ noise); level 7 = strongest 0-ply evaluator
    const pl = analyzePlays(pos, side, dice[0], dice[1], { ply: 0, fast: level < 7 });
    if (pl.length === 1 || !NOISE[level]) return pl[0];
    let best = pl[0], be = -1e9;
    for (const x of pl) { const e = x.e + NOISE[level] * gauss(r); if (e > be) { be = e; best = x; } }
    return best;
  }
  if (level === 8) return analyzePlays(pos, side, dice[0], dice[1], { ply: 1, keep1: 6, margin1: 0.2 })[0];
  if (level === 9) return analyzePlays(pos, side, dice[0], dice[1], { ply: 2, keep1: 8, margin1: 0.2, keep2: 2, margin2: 0.05, deadline: nowMs() + 900 })[0];
  return analyzePlays(pos, side, dice[0], dice[1], { ply: 2, keep1: 10, margin1: 0.3, keep2: 4, margin2: 0.08, deadline: nowMs() + 1300 })[0];
}
// pre-roll cubeless probabilities for side on roll at a depth

function aiCube(level, pos, side, ctx, takerView) {
  // returns {double, take, info}
  if (level <= 3) {
    const v = evalPos(pos, side);   // side = the player on roll (the doubler); take is answered for the opponent
    return { double: v[0] > 0.74, take: v[0] < 0.76, v };
  }
  const depth = WB ? (level >= 8 ? 1 : 0) : (level >= 10 ? 2 : level >= 8 ? 1 : 0);
  const v = evalRoll(pos, side, depth);
  const d = cubeDecision(v, ctx);
  if (level <= 5) {   // a little sloppy
    const r = rng(key(pos) + 'cube' + level), n = (level === 4 ? 0.06 : 0.03) * gauss(r);
    return { double: Math.min(d.dt, d.dp) > d.nd + n, take: d.dt < d.dp + n, v, d };
  }
  return { double: d.double, take: d.take, v, d };
}


Object.assign(BG, {
  aiChoosePlay, aiCube, setNets, escapes, loadWildbg, wbEval, wbInputs, setWildbg: w => { WB = w; },
  OFF, BAR, initial, clone, key, pips, onBoard, allHome, contact, winner, winKind, dest, apply, mvFrom, mvTo, mvHit,
  genPlays, maxUse, legalSteps, notation, ptName, cyrb128, DiceStream, randomSeed, sha256, replay, encodeGame, decodeGame,
  NIN, features, Net, sanitize, flip, equity, choose, BO_N, boIndex, boIndexPos, loadBearoff, boDist, isBearoffPos, bearoffEval,
  boExpected, setNet, evalPos, heurEval, evalAfter, ROLLS, bestPlay0, eval1, eval2, analyzePlays, hyb1, hyb2, evalFast, evalPly, hasWildbg, evalRoll, buildMET, mwc,
  janowski, cubeDecision, cubeAvailable,
  get NET() { return NET; }, get NETR() { return NETR; }, get BO() { return BO; }
});
if (typeof module !== 'undefined' && module.exports) module.exports = BG;
else root.BG = BG;
})(typeof self !== 'undefined' ? self : this);
