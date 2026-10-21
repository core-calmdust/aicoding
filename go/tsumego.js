/*
 * Go (囲碁) tsumego solver for the puzzle collection (go/puzzles.json, PZBook v2).
 * Runs in the engine worker (importScripts after rules.js), as the browser global `GoTsumego`, and in node (require).
 *
 * API (problem P: { s: spec, goal, target, region, n, ... }; points may be indices or GTP strings):
 *   GoTsumego.solve(P, moves, left, defend) -> [{ m, need, hopeless? }]
 *       moves: point indices played from P.s (PASS = -1). left: the player's moves still allowed.
 *       defend=false: the player's (attacker's) candidate moves; need = the player's moves needed to reach the goal,
 *         counting this move (1 = reaches it at once), 0 = cannot be reached within `left`.
 *       defend=true: the opponent's candidate moves (incl. pass) with need computed the same way (the page picks the
 *         largest need; 0 = the move refutes). The list is ordered by preference so the first maximum is the natural reply.
 *   GoTsumego.reached(P, pos) -> true when the goal is achieved in pos (a GoRules.Pos or a spec).
 *   GoTsumego.mainLine(P, left) -> indices of the solution line (answer, best resistance, ...).
 *
 * Roles: the player ("G") is the side to move in P.s, the opponent is "O". `target` are the stones whose fate decides:
 *   kill    target = O stones. Reached when a target stone is captured, or the target is dead in a SETTLED way: O cannot
 *           live even with one free extra move (an exact unbounded life & death search inside the region proves it).
 *   live    target = G stones. Reached when the target is pass-alive (Benson, walls count as safe) or settled alive:
 *           O cannot kill it even with one free extra move. Seki counts as alive in the unbounded search.
 *   capture target = O stones; reached when any target stone is captured (atari, ladder, net, snapback, under the stones).
 *   semeai  capturing race: target = O stones; reached when a target stone is captured; fails as soon as one of G's racing
 *           stones (G chains next to the target in P.s, without liberties outside the region) is captured.
 *   escape  target = G stones; reached when every target chain has >= 4 liberties or a liberty outside the region.
 *   connect target = G stones; reached when all target stones are one chain (fails if any is captured).
 *   cut     target = O stones; treated as capture (a cut that captures cutting stones).
 * Search area: empty points of `region` (+ pass, + moves capturing a chain in atari next to the target / racing stones).
 * Chains with a liberty outside the region can never be captured (walls are safe).
 * Ko: the player may never capture a ko; the opponent may. A result that needs a ko therefore counts as a failure for the
 * player and success for the opponent, so every solution is unconditional (the generator also keeps ko out of the lines).
 * Search: exact boolean life & death search (DFS, transposition table, Benson pruning) + bounded "moves needed" search
 * with iterative deepening; the life & death search gates the player's moves so only real candidates are read.
 * Copyright 2026 core-calmdust — Apache License 2.0
 */
(function (root) {
'use strict';
const GR = root.GoRules || (typeof require === 'function' ? require('./rules.js') : null);
const PASS = -1, BLACK = 1, WHITE = 2;

// ---- Zobrist (own tables; 32-bit halves; the pair gives a 53-bit key)
const Z1 = new Int32Array(361 * 2), Z2 = new Int32Array(361 * 2), K1 = new Int32Array(361), K2 = new Int32Array(361);
(function () { let s = 0x2545f491; const r = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return s | 0; }; for (let i = 0; i < 722; i++) { Z1[i] = r(); Z2[i] = r(); } for (let i = 0; i < 361; i++) { K1[i] = r(); K2[i] = r(); } })();
const T1 = [0, 0x1b873593, 0x5bd1e995 | 0];

// ================================================================ fast board with undo
class Board {
  constructor(n) {
    const N = n * n;
    this.n = n; this.N = N; this.b = new Uint8Array(N); this.nb = GR.nbrs(n);
    this.h1 = 0; this.h2 = 0; this.ko = -1; this.noKo = 0;       // noKo: colour that may not capture a ko
    this.ms = new Int32Array(N); this.ml = new Int32Array(N); this.g = 1;
    this.cs = new Int16Array(N); this.ls = new Int16Array(N); this.ns = 0; this.nl = 0;
    this.undo = []; this.p1 = []; this.p2 = []; this.b1 = 0; this.b2 = 0;   // b1/b2: hash of the start board                  // undo records; path of board hashes (superko)
  }
  put(i, c) { const v = this.b[i]; if (v) { this.h1 ^= Z1[i * 2 + v - 1]; this.h2 ^= Z2[i * 2 + v - 1]; } this.b[i] = c; if (c) { this.h1 ^= Z1[i * 2 + c - 1]; this.h2 ^= Z2[i * 2 + c - 1]; } }
  setKo(k) { if (this.ko >= 0) { this.h1 ^= K1[this.ko]; this.h2 ^= K2[this.ko]; } this.ko = k; if (k >= 0) { this.h1 ^= K1[k]; this.h2 ^= K2[k]; } }
  // flood the chain at i: stones -> cs[0..ns), liberties -> ls[0..nl); returns nl
  chain(i) {
    const b = this.b, nb = this.nb, c = b[i], ms = this.ms, ml = this.ml, cs = this.cs, ls = this.ls, g = ++this.g;
    let ns = 1, nl = 0, k = 0; cs[0] = i; ms[i] = g;
    while (k < ns) {
      const q = cs[k++], o = q * 4;
      for (let d = 0; d < 4; d++) { const r = nb[o + d]; if (r < 0) continue; const v = b[r]; if (v === 0) { if (ml[r] !== g) { ml[r] = g; ls[nl++] = r; } } else if (v === c && ms[r] !== g) { ms[r] = g; cs[ns++] = r; } }
    }
    this.ns = ns; this.nl = nl; return nl;
  }
  libs(i) { return this.chain(i); }
  // play c at i (PASS = -1). false when illegal (occupied, ko, suicide, forbidden ko capture, repetition of a path position)
  play(i, c) {
    if (i === PASS) { this.undo.push({ i, c, caps: null, ko: this.ko, h1: this.h1, h2: this.h2 }); this.setKo(-1); this.p1.push(this.h1); this.p2.push(this.h2); return true; }
    const b = this.b; if (b[i] || i === this.ko) return false;
    const rec = { i, c, caps: null, ko: this.ko, h1: this.h1, h2: this.h2 }, o = 3 - c, nb = this.nb;
    this.put(i, c);
    let caps = null;
    for (let d = 0; d < 4; d++) {
      const r = nb[i * 4 + d]; if (r < 0 || b[r] !== o) continue;
      if (this.chain(r) === 0) { if (!caps) caps = []; for (let k = 0; k < this.ns; k++) { const s = this.cs[k]; caps.push(s); } for (const s of caps) if (b[s] === o) this.put(s, 0); }
    }
    let nk = -1;
    if (!caps) { if (this.chain(i) === 0) { this.put(i, 0); return false; } }
    else if (caps.length === 1 && this.chain(i) === 1 && this.ns === 1) {
      if (c === this.noKo) { this.put(caps[0], o); this.put(i, 0); return false; }
      nk = caps[0];
    }
    this.setKo(nk);
    if (caps) {   // only a capture can repeat an earlier board
      const h1 = this.h1 ^ (nk >= 0 ? K1[nk] : 0), h2 = this.h2 ^ (nk >= 0 ? K2[nk] : 0), P1 = this.p1, P2 = this.p2;
      let rep = h1 === this.b1 && h2 === this.b2;
      for (let k = P1.length - 1; k >= 0 && !rep; k--) if (P1[k] === h1 && P2[k] === h2) rep = true;
      if (rep) { this.setKo(rec.ko); for (const s of caps) this.put(s, o); this.put(i, 0); return false; }
    }
    rec.caps = caps; this.undo.push(rec);
    this.p1.push(this.h1 ^ (this.ko >= 0 ? K1[this.ko] : 0)); this.p2.push(this.h2 ^ (this.ko >= 0 ? K2[this.ko] : 0));
    return true;
  }
  back() {
    const r = this.undo.pop(); this.p1.pop(); this.p2.pop();
    if (r.i !== PASS) { this.put(r.i, 0); if (r.caps) for (const s of r.caps) this.put(s, 3 - r.c); }
    this.setKo(r.ko);
  }
  key(turn) { return ((this.h1 ^ T1[turn]) >>> 0) + (this.h2 & 0x1fffff) * 4294967296; }
}

// ================================================================ problem context
const pt = (v, n) => typeof v === 'number' ? v : GR.parseCoord(v, n);
function specOf(s) {
  if (s && (s.ab || s.aw) && !s.stones) {
    const n = s.n || 19, a = Array(n * n).fill('.');
    for (const x of s.ab || []) a[GR.parseCoord(x, n)] = 'b';
    for (const x of s.aw || []) a[GR.parseCoord(x, n)] = 'w';
    return { n, stones: a.join(''), turn: s.turn || 1 };
  }
  return s;
}
const CTX = [];
function ctxOf(P) {
  const s = specOf(P.s), key = JSON.stringify([s.stones, s.n, s.turn, P.goal, P.target, P.region]);
  for (const c of CTX) if (c.key === key) return c;
  const c = new Ctx(P, s); c.key = key;
  CTX.unshift(c); if (CTX.length > 3) CTX.pop();
  return c;
}
class Ctx {
  constructor(P, s) {
    const n = s.n || 19, N = n * n, p0 = GR.Pos.from(s);
    this.n = n; this.N = N; this.spec = s; this.goal = P.goal || 'kill';
    this.G = s.turn || BLACK; this.O = 3 - this.G;
    const gl = this.goal;
    this.owner = (gl === 'live' || gl === 'escape' || gl === 'connect') ? this.G : this.O;
    this.K = 3 - this.owner;   // the side attacking the target
    this.ld = gl === 'kill' || gl === 'live';
    this.tgt = (P.target || []).map(v => pt(v, n)).filter(i => i != null && i >= 0);
    this.region = (P.region || []).map(v => pt(v, n)).filter(i => i != null && i >= 0);
    this.inR = new Uint8Array(N); for (const i of this.region) this.inR[i] = 1;
    this.B = new Board(n); for (let i = 0; i < N; i++) if (p0.b[i]) this.B.put(i, p0.b[i]);
    this.B.noKo = this.G; this.B.b1 = this.B.h1; this.B.b2 = this.B.h2;
    // zone: region + stones of chains whose liberties are all inside the region (enclosed); everything else is "outside"
    const B = this.B; this.zone = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (this.inR[i]) this.zone[i] = 1;
    const seen = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (!B.b[i] || seen[i]) continue;
      B.chain(i); let enc = true; for (let k = 0; k < B.nl; k++) if (!this.inR[B.ls[k]]) enc = false;
      for (let k = 0; k < B.ns; k++) { seen[B.cs[k]] = 1; if (enc) this.zone[B.cs[k]] = 1; }
    }
    // semeai: G's racing stones = G chains next to the target, enclosed
    this.own = [];
    if (gl === 'semeai') {
      const mk = new Uint8Array(N);
      for (const t of this.tgt) { B.chain(t); const st = Array.from(B.cs.slice(0, B.ns)); for (const q of st) for (let d = 0; d < 4; d++) { const r = B.nb[q * 4 + d]; if (r >= 0 && B.b[r] === this.G && !mk[r] && this.zone[r]) { B.chain(r); for (let k = 0; k < B.ns; k++) { mk[B.cs[k]] = 1; this.own.push(B.cs[k]); } } } }
    }
    this.small = this.region.length <= 22;
    this.UB = new Map(); this.BT = new Map(); this.RC = new Map();
    this.nodes = 0; this.lim = Infinity;
    // scratch for Benson
    this.rid = new Int32Array(N); this.cid = new Int32Array(N); this.mark = new Int32Array(N); this.mg = 1;
  }
  // ---- static tests
  captured() { const b = this.B.b, o = this.owner; for (const t of this.tgt) if (b[t] !== o) return true; return false; }
  ownCaptured() { const b = this.B.b; for (const t of this.own) if (b[t] !== this.G) return true; return false; }
  anchoredChain(i) {   // chain has a liberty outside the region (or a stone outside the zone): never capturable
    const B = this.B; B.chain(i);
    for (let k = 0; k < B.nl; k++) if (!this.inR[B.ls[k]]) return true;
    for (let k = 0; k < B.ns; k++) if (!this.zone[B.cs[k]]) return true;
    return false;
  }
  // every target chain anchored or pass-alive (Benson with anchored chains immortal)
  ownerSafe() {
    const B = this.B, b = B.b, own = this.owner, N = this.N, nb = B.nb;
    for (const t of this.tgt) if (b[t] !== own) return false;
    // quick: all target chains anchored?
    let all = true; for (const t of this.tgt) { if (B.chain(t) < 2 && !this.anchoredChain(t)) return false; if (!this.anchoredChain(t)) all = false; }
    if (all) return true;
    // Benson: chains (owner) and regions (non-owner components) reachable from the target through closed regions
    const cid = this.cid, rid = this.rid, g = ++this.mg, mark = this.mark;
    const chains = [], regions = [];   // chain: {st, libs:Set?, anch, alive}; region: {pts, open, empt, adj:Set(chain idx), dead}
    const chainAt = i => {
      if (mark[i] === g && cid[i] >= 0) return cid[i];
      B.chain(i); const st = Array.from(B.cs.subarray(0, B.ns)), lb = Array.from(B.ls.subarray(0, B.nl));
      let anch = false; for (const l of lb) if (!this.inR[l]) anch = true; for (const q of st) if (!this.zone[q]) anch = true;
      const id = chains.length; chains.push({ st, lb, anch, alive: true, reg: [] });
      for (const q of st) { mark[q] = g; cid[q] = id; }
      return id;
    };
    const regionAt = i => {
      if (mark[i] === g && rid[i] >= 0) return rid[i];
      const id = regions.length, pts = [i], R = { pts, open: false, adj: [], dead: false };
      regions.push(R); mark[i] = g; rid[i] = id; cid[i] = -1;
      for (let k = 0; k < pts.length; k++) {
        const q = pts[k]; if (!this.zone[q]) R.open = true;
        for (let d = 0; d < 4; d++) { const r = nb[q * 4 + d]; if (r < 0) continue; if (b[r] === own) continue; if (mark[r] !== g) { mark[r] = g; rid[r] = id; cid[r] = -1; pts.push(r); } }
      }
      return id;
    };
    // mark chains with rid -1 / regions with cid -1 so lookups do not collide
    const queue = [];
    for (const t of this.tgt) { const c = chainAt(t); if (!chains[c].q) { chains[c].q = 1; queue.push(c); } for (const q of chains[c].st) rid[q] = -1; }
    for (let qi = 0; qi < queue.length; qi++) {
      const C = chains[queue[qi]];
      if (C.anch) continue;
      const rs = new Set();
      for (const q of C.st) for (let d = 0; d < 4; d++) { const r = nb[q * 4 + d]; if (r >= 0 && b[r] !== own) rs.add(regionAt(r)); }
      for (const ri of rs) {
        const R = regions[ri]; C.reg.push(ri);
        if (R.open || R.scan) continue; R.scan = 1;
        const cs = new Set();
        for (const q of R.pts) for (let d = 0; d < 4; d++) { const r = nb[q * 4 + d]; if (r >= 0 && b[r] === own) cs.add(r); }
        const ids = new Set(); for (const r of cs) { const c = chainAt(r); for (const s of chains[c].st) rid[s] = -1; ids.add(c); }
        R.adj = [...ids];
        for (const c of ids) if (!chains[c].q) { chains[c].q = 1; queue.push(c); }
      }
    }
    // vital: closed region whose every empty point is a liberty of chain c
    const isLib = (p, c) => { for (let d = 0; d < 4; d++) { const r = nb[p * 4 + d]; if (r >= 0 && b[r] === own && cid[r] === c) return true; } return false; };
    for (const C of chains) C.vit = [];
    regions.forEach((R, ri) => {
      if (R.open || !R.scan) return;
      for (const c of R.adj) { let ok = true; for (const p of R.pts) if (b[p] === 0 && !isLib(p, c)) { ok = false; break; } if (ok) chains[c].vit.push(ri); }
    });
    let changed = true;
    while (changed) {
      changed = false;
      for (let c = 0; c < chains.length; c++) {
        const C = chains[c]; if (!C.alive || C.anch || !C.q) continue;
        let v = 0; for (const ri of C.vit) if (!regions[ri].dead) v++;
        if (v < 2) { C.alive = false; changed = true; for (const ri of C.reg) regions[ri].dead = true; }
      }
    }
    for (const t of this.tgt) { const C = chains[cid[t]]; if (!C.anch && !C.alive) return false; }
    return true;
  }
  escaped() { const B = this.B; for (const t of this.tgt) { if (this.anchoredChain(t)) continue; if (B.chain(t) < 4) return false; } return true; }
  connected() { const B = this.B; B.chain(this.tgt[0]); const g = B.g, ms = B.ms; for (const t of this.tgt) if (ms[t] !== g) return false; return true; }
  // the fewest liberties of a target chain (lower bound of the player's moves to capture)
  minLibs() { let m = 99; for (const t of this.tgt) { const l = this.B.chain(t); if (l < m) m = l; } return m; }

  // ---- move generation
  // all empty region points (+ capture-freeing points); skip filling a point surrounded by own stones only
  genAll(c) {
    const B = this.B, b = B.b, nb = B.nb, out = [];
    for (const p of this.region) {
      if (b[p]) continue;
      if (c === this.owner) {   // the owner never fills its own eye (unless it saves a chain in atari)
        let ownOnly = true;
        for (let d = 0; d < 4; d++) { const r = nb[p * 4 + d]; if (r >= 0 && b[r] !== c) { ownOnly = false; break; } }
        if (ownOnly) { for (let d = 0; d < 4; d++) { const r = nb[p * 4 + d]; if (r >= 0 && B.chain(r) === 1) { ownOnly = false; break; } } }
        if (ownOnly) continue;
      }
      out.push(p);
    }
    this.addCaps(c, out);
    return out;
  }
  // capturing a chain in atari that touches the target or the racing stones (also outside the region)
  addCaps(c, out) {
    const B = this.B, b = B.b, nb = B.nb, seen = new Set(out);
    const base = this.tgt.concat(this.own);
    for (const t of base) {
      if (!b[t]) continue;
      B.chain(t); const st = Array.from(B.cs.subarray(0, B.ns));
      for (const q of st) for (let d = 0; d < 4; d++) {
        const r = nb[q * 4 + d]; if (r < 0 || !b[r] || b[r] === b[t]) continue;
        if (b[r] === c) continue;
        if (B.chain(r) === 1) { const l = B.ls[0]; if (!seen.has(l)) { seen.add(l); out.push(l); } }
      }
    }
  }
  // tactical candidates for big regions: liberties of the target, their neighbours, liberties of weak chains around it
  genTac(c) {
    if (this.small) return this.genAll(c);
    const B = this.B, b = B.b, nb = B.nb, inR = this.inR, S = new Set(), isG = c === this.K;
    const tch = [], seenC = new Set();
    for (const t of this.tgt.concat(this.own)) { if (!b[t] || seenC.has(t)) continue; B.chain(t); const st = Array.from(B.cs.subarray(0, B.ns)), lb = Array.from(B.ls.subarray(0, B.nl)); for (const q of st) seenC.add(q); tch.push({ st, lb }); }
    for (const T of tch) {
      for (const l of T.lb) { S.add(l); if (isG || T.lb.length <= 2) for (let d = 0; d < 4; d++) { const r = nb[l * 4 + d]; if (r >= 0 && !b[r]) S.add(r); } }
      // neighbouring chains of the other colour with few liberties: their liberties (capture / save / counter-atari)
      const nc = new Set();
      for (const q of T.st) for (let d = 0; d < 4; d++) { const r = nb[q * 4 + d]; if (r >= 0 && b[r] && b[r] !== b[T.st[0]] && !nc.has(r)) { B.chain(r); const st = Array.from(B.cs.subarray(0, B.ns)); for (const s of st) nc.add(s); if (B.nl <= 2) { const lb = Array.from(B.ls.subarray(0, B.nl)); for (const l of lb) S.add(l); for (const s of st) for (let d2 = 0; d2 < 4; d2++) { const u = nb[s * 4 + d2]; if (u >= 0 && b[u] === b[T.st[0]]) { B.chain(u); if (B.nl === 1) S.add(B.ls[0]); } } } } }
    }
    const out = [];
    for (const p of S) if (inR[p]) out.push(p);
    this.addCaps(c, out);
    return out;
  }
  // order moves: captures and ataris first, then points with many empty neighbours near the target
  order(list, c, best) {
    const B = this.B, b = B.b, nb = B.nb, o = 3 - c, sc = new Map();
    for (const p of list) {
      let s = 0, emp = 0;
      for (let d = 0; d < 4; d++) {
        const r = nb[p * 4 + d]; if (r < 0) { s += 0.3; continue; }
        const v = b[r]; if (v === 0) emp++;
        else { const l = B.chain(r); if (v === o) { if (l === 1) s += 20 + B.ns; else if (l === 2) s += 3; } else if (l === 1) s += 8; }
      }
      s += emp * 1.5;
      if (p === best) s += 1000;
      sc.set(p, s);
    }
    list.sort((a, b2) => sc.get(b2) - sc.get(a));
    return list;
  }

  // ---- unbounded life & death: does the owner's target survive? (K never passes; the owner may)
  ub(turn) {
    if (this.captured()) return false;
    if (this.ownerSafe()) return true;
    const B = this.B, key = B.key(turn), e = this.UB.get(key);
    if (e !== undefined) return e > 0;
    if (++this.nodes > this.lim) throw ABORT;
    if (B.undo.length > 200) return true;
    const own = this.owner, K = this.K;
    let res;
    if (turn === K) {
      res = true;
      const mv = this.order(this.genAll(K), K, this.UBm && this.UBm.get(key));
      for (const m of mv) {
        if (!B.play(m, K)) continue;
        const r = this.ub(own); B.back();
        if (!r) { res = false; this.bestm(key, m); break; }
      }
    } else {
      res = false;
      const mv = this.order(this.genAll(own), own, this.UBm && this.UBm.get(key)); mv.push(PASS);
      for (const m of mv) {
        if (!B.play(m, own)) continue;
        const r = this.ub(K); B.back();
        if (r) { res = true; this.bestm(key, m); break; }
      }
    }
    this.UB.set(key, res ? 1 : -1);
    return res;
  }
  bestm(key, m) { (this.UBm || (this.UBm = new Map())).set(key, m); }
  // does the player's goal hold in the unbounded game with `turn` to move?
  ldWin(turn) { const s = this.ub(turn); return this.goal === 'kill' ? !s : s; }

  // ---- goal reached (static, or settled: the opponent cannot change the result even with one free extra move)
  R() {
    const gl = this.goal;
    if (gl === 'capture' || gl === 'cut' || gl === 'semeai') return this.captured();
    if (gl === 'escape') return !this.captured() && this.escaped();
    if (gl === 'connect') return !this.captured() && this.connected();
    if (gl === 'kill' && this.captured()) return true;
    if (gl === 'live' && this.captured()) return false;
    const B = this.B, key = B.key(0), c = this.RC.get(key);
    if (c !== undefined) return c;
    let res;
    if (gl === 'live' && this.ownerSafe()) res = true;
    else if (gl === 'kill' && this.ownerSafe()) res = false;
    else {
      const O = this.O;
      res = this.ldWin(O);                      // the extra move = pass
      if (res) {
        const mv = this.order(this.genAll(O), O);
        for (const d of mv) {
          if (!B.play(d, O)) continue;
          const w = this.ldWin(O); B.back();
          if (!w) { res = false; break; }
        }
      }
    }
    this.RC.set(key, res);
    return res;
  }
  fail() {
    const gl = this.goal;
    if (gl === 'semeai') return this.ownCaptured();
    if (gl === 'live' || gl === 'escape' || gl === 'connect') return this.captured();
    if (gl === 'capture' || gl === 'cut') { for (const t of this.tgt) if (this.anchoredChain(t)) return true; }
    return false;
  }
  lb() { const gl = this.goal; return (gl === 'capture' || gl === 'cut' || gl === 'semeai') ? this.minLibs() : 1; }
  gen(c) { return this.ld ? this.genAll(c) : this.genTac(c); }

  // ---- bounded: can G reach the goal within k own moves? aw: G to move; dw: O to move
  aw(k) {
    if (this.R()) return true;
    if (this.fail() || k <= 0) return false;
    if (this.lb() > k) return false;
    const B = this.B, key = B.key(this.G), e = this.BT.get(key);
    if (e) { if (e.w <= k) return true; if (e.l >= k) return false; }
    if (++this.nodes > this.lim) throw ABORT;
    const G = this.G, mv = this.order(this.gen(G), G, e && e.m);
    let res = false, bm = -2;
    for (const m of mv) {
      if (!B.play(m, G)) continue;
      const r = this.dw(k - 1); B.back();
      if (r) { res = true; bm = m; break; }
    }
    this.tset(key, k, res, bm);
    return res;
  }
  dw(k) {
    if (this.R()) return true;
    if (this.fail() || k <= 0) return false;
    if (this.lb() > k) return false;
    if (this.ld && !this.ldWin(this.O)) return false;    // the opponent can resist forever: no bounded win
    const B = this.B, key = B.key(this.O), e = this.BT.get(key);
    if (e) { if (e.w <= k) return true; if (e.l >= k) return false; }
    if (++this.nodes > this.lim) throw ABORT;
    const O = this.O, mv = this.order(this.gen(O), O, e && e.m); mv.push(PASS);
    if (e && e.m === PASS) { mv.pop(); mv.unshift(PASS); }
    let res = true, bm = -2;
    for (const m of mv) {
      if (!B.play(m, O)) continue;
      const r = this.aw(k); B.back();
      if (!r) { res = false; bm = m; break; }
    }
    this.tset(key, k, res, bm);
    return res;
  }
  tset(key, k, win, m) {
    let e = this.BT.get(key); if (!e) { e = { w: 99, l: -1, m: -2 }; this.BT.set(key, e); }
    if (win) { if (k < e.w) e.w = k; } else if (k > e.l) e.l = k;
    if (m !== -2) e.m = m;
  }
  // smallest number of G moves (<= left) to reach the goal with G to move now; 0 = not within left
  needG(left) { for (let j = 1; j <= left; j++) if (this.aw(j)) return j; return 0; }
  needO(left) { if (this.R()) return 0; for (let j = 0; j <= left; j++) if (this.dw(j)) return j; return -1; }   // O to move: G moves needed (0 = already)
  // ---- set the board to P.s + moves
  load(moves) {
    const B = this.B;
    while (B.undo.length) B.back();
    let turn = this.G; const hist = [];
    for (const m of moves || []) {
      const save = B.noKo; B.noKo = 0;
      const ok = B.play(m, turn); B.noKo = save;
      if (!ok) return null;
      turn = 3 - turn;
    }
    return turn;
  }
  clearIfBig() { if (this.UB.size > 3e5) { this.UB.clear(); this.UBm = null; } if (this.BT.size > 3e5) this.BT.clear(); if (this.RC.size > 1e5) this.RC.clear(); }
}
const ABORT = { abort: true };

// ================================================================ API
function solve(P, moves, left, defend) {
  const C = ctxOf(P); C.clearIfBig();
  const turn = C.load(moves || []); if (turn === null) return [];
  const B = C.B, out = [];
  left = Math.max(0, left | 0);
  if (!defend) {
    const G = C.G, mv = C.order(C.ld ? C.genAll(G) : C.genAll(G), G);
    for (const m of mv) {
      if (!B.play(m, G)) continue;
      let need = 0;
      if (C.R()) need = 1;
      else if (!C.fail() && left > 1) { const j = C.needO(left - 1); need = j > 0 ? j + 1 : 0; }
      let hopeless = false;
      if (!need && left > 1 && !C.ld) hopeless = !coop(C, left - 1);
      B.back();
      out.push(hopeless ? { m, need, hopeless: true } : { m, need });
    }
  } else {
    const O = C.O, mv = C.order(C.gen(O), O); mv.push(PASS);
    const rows = [];
    for (const m of mv) {
      if (!B.play(m, O)) continue;
      let need = 0;
      if (C.R()) need = 1;            // a self-destructive reply (the goal is reached at once): ranked lowest
      else if (!C.fail()) need = C.needG(left);
      B.back();
      rows.push({ m, need });
    }
    // preference: refutations first, then the longest resistance; pass last among equals
    rows.sort((a, b) => (b.need === 0 ? 99 : b.need) - (a.need === 0 ? 99 : a.need) || (a.m === PASS) - (b.m === PASS));
    out.push(...rows);
  }
  return out;
}
// can G reach the goal within k moves if O only passes? (for "hopeless" = the goal is out of reach even with help)
function coop(C, k) {
  const B = C.B, G = C.G;
  const go = k2 => {
    if (C.R()) return true; if (C.fail() || k2 <= 0 || C.lb() > k2) return false;
    for (const m of C.gen(G)) { if (!B.play(m, G)) continue; let r = C.R(); if (!r && k2 > 1) { B.play(PASS, C.O); r = go(k2 - 1); B.back(); } B.back(); if (r) return true; }
    return false;
  };
  if (!B.play(PASS, C.O)) return true;
  const r = go(k); B.back(); return r;
}
function reached(P, pos) {
  const C = ctxOf(P), B = C.B;
  C.load([]);
  const n = C.n, b = pos.b || GR.Pos.from(pos).b;
  // set the board directly (keep the undo stack empty so load() still works)
  const saved = Array.from(B.b);
  for (let i = 0; i < C.N; i++) if (B.b[i] !== b[i]) B.put(i, b[i]);
  const ko = pos.ko >= 0 ? pos.ko : -1; B.setKo(ko);
  let r;
  try { r = C.R(); } finally { B.setKo(-1); for (let i = 0; i < C.N; i++) if (B.b[i] !== saved[i]) B.put(i, saved[i]); }
  return r;
}
// the main line: the answer (or the first winning move), then the defender's longest resistance, ... until reached
function mainLine(P, left) {
  const C = ctxOf(P), n = C.n; left = left || P.n || 3;
  const line = []; let first = P.answer != null ? pt(P.answer, n) : null;
  for (let step = 0; step < 40 && left > 0; step++) {
    let list = solve(P, line, left, false).filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need);
    if (!list.length) break;
    let m = list[0].m; if (step === 0 && first != null && list.some(x => x.m === first)) m = first;
    line.push(m); left--;
    C.load(line); if (C.R()) break;
    const dl = solve(P, line, left, true);
    if (!dl.length) break;
    line.push(dl[0].m);
    C.load(line); if (C.R()) break;
  }
  return line;
}

const api = { solve, reached, mainLine, PASS, _ctx: ctxOf, _Board: Board };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.GoTsumego = api;
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : globalThis);
