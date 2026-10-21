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
 *   connect target = G stones; reached when all target stones are one chain, or connected in shape (whatever the opponent
 *           plays, the player joins them at once into one chain with 2+ liberties); fails if any is captured.
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
    this.undo = []; this.p1 = []; this.p2 = []; this.b1 = 0; this.b2 = 0;   // undo records; path of board hashes (superko); b1/b2 = start board
    this.ver = 0;
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
  // does the chain at i have a liberty? (early exit)
  hasLib(i) {
    const b = this.b, nb = this.nb, c = b[i], ms = this.ms, cs = this.cs, g = ++this.g;
    let ns = 1, k = 0; cs[0] = i; ms[i] = g;
    while (k < ns) {
      const q = cs[k++], o = q * 4;
      for (let d = 0; d < 4; d++) { const r = nb[o + d]; if (r < 0) continue; const v = b[r]; if (v === 0) return true; if (v === c && ms[r] !== g) { ms[r] = g; cs[ns++] = r; } }
    }
    return false;
  }
  // play c at i (PASS = -1). false when illegal (occupied, ko, suicide, forbidden ko capture, repetition of a path position)
  play(i, c) {
    if (i === PASS) { this.undo.push({ i, c, caps: null, ko: this.ko }); this.setKo(-1); this.p1.push(this.h1); this.p2.push(this.h2); this.ver++; return true; }
    const b = this.b; if (b[i] || i === this.ko) return false;
    const o = 3 - c, nb = this.nb, ko0 = this.ko;
    this.put(i, c);
    let caps = null;
    for (let d = 0; d < 4; d++) {
      const r = nb[i * 4 + d]; if (r < 0 || b[r] !== o || this.hasLib(r)) continue;
      if (!caps) caps = [];
      this.chain(r); for (let k = 0; k < this.ns; k++) caps.push(this.cs[k]);
      for (let k = 0; k < this.ns; k++) this.put(this.cs[k], 0);
    }
    let nk = -1;
    if (!caps) { if (!this.hasLib(i)) { this.put(i, 0); return false; } }
    else if (caps.length === 1) {   // ko: a single stone that captured one stone and has exactly one liberty
      let own = false, lib = 0;
      for (let d = 0; d < 4; d++) { const r = nb[i * 4 + d]; if (r < 0) continue; if (b[r] === c) own = true; else if (b[r] === 0) lib++; }
      if (!own && lib === 1) {
        if (c === this.noKo) { this.put(caps[0], o); this.put(i, 0); return false; }
        nk = caps[0];
      }
    }
    this.setKo(nk);
    if (caps) {   // only a capture can repeat an earlier board (positional superko along the path)
      const h1 = this.h1 ^ (nk >= 0 ? K1[nk] : 0), h2 = this.h2 ^ (nk >= 0 ? K2[nk] : 0), P1 = this.p1, P2 = this.p2;
      let rep = h1 === this.b1 && h2 === this.b2;
      for (let k = P1.length - 1; k >= 0 && !rep; k--) if (P1[k] === h1 && P2[k] === h2) rep = true;
      if (rep) { this.setKo(ko0); for (const s of caps) this.put(s, o); this.put(i, 0); return false; }
    }
    this.undo.push({ i, c, caps, ko: ko0 });
    this.p1.push(this.h1 ^ (this.ko >= 0 ? K1[this.ko] : 0)); this.p2.push(this.h2 ^ (this.ko >= 0 ? K2[this.ko] : 0));
    this.ver++;
    return true;
  }
  back() {
    const r = this.undo.pop(); this.p1.pop(); this.p2.pop();
    if (r.i !== PASS) { this.put(r.i, 0); if (r.caps) for (const s of r.caps) this.put(s, 3 - r.c); }
    this.setKo(r.ko); this.ver++;
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
const ANCH = 99;   // liberties reported for an anchored chain
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
    this.zoneList = []; for (let i = 0; i < N; i++) if (this.zone[i]) this.zoneList.push(i);
    // points scanned each node: the zone and the stones next to it
    const sp = new Uint8Array(N); this.scanPts = [];
    for (const i of this.zoneList) { if (!sp[i]) { sp[i] = 1; this.scanPts.push(i); } for (let d = 0; d < 4; d++) { const r = B.nb[i * 4 + d]; if (r >= 0 && !sp[r]) { sp[r] = 1; this.scanPts.push(r); } } }
    // semeai: G's racing stones = G chains next to the target, enclosed
    this.own = [];
    if (gl === 'semeai') {
      const mk = new Uint8Array(N);
      for (const t of this.tgt) { B.chain(t); const st = Array.from(B.cs.slice(0, B.ns)); for (const q of st) for (let d = 0; d < 4; d++) { const r = B.nb[q * 4 + d]; if (r >= 0 && B.b[r] === this.G && !mk[r] && this.zone[r]) { B.chain(r); for (let k = 0; k < B.ns; k++) { mk[B.cs[k]] = 1; this.own.push(B.cs[k]); } } } }
    }
    this.small = this.region.length <= 22;
    this.UB = new Map(); this.UBm = new Map(); this.BT = new Map(); this.RC = new Map();
    this.nodes = 0; this.lim = api.nodeLimit; this.dl = 0;
    // scan data (chain labels for the zone)
    this.sm = new Int32Array(N); this.sg = 0; this.chId = new Int32Array(N); this.sv = -1;
    this.cLibs = []; this.cAnch = []; this.cCol = []; this.cSize = []; this.nc = 0;
    this.st = new Int16Array(N); this.lm = new Int32Array(N); this.lg = 0;
    this.rm = new Int32Array(N); this.rg = 0;
  }
  // ---- label the chains of the zone (anchored chains are not expanded: they can never be captured)
  scan() {
    const B = this.B; if (this.sv === B.ver) return; this.sv = B.ver;
    const b = B.b, nb = B.nb, zone = this.zone, inR = this.inR, sm = this.sm, chId = this.chId, st = this.st, lm = this.lm;
    const sg = ++this.sg; let nc = 0;
    const cL = this.cLibs, cA = this.cAnch, cC = this.cCol, cS = this.cSize;
    for (const p of this.scanPts) {
      if (!b[p] || sm[p] === sg) continue;
      const c = b[p], id = nc++, lg = ++this.lg;
      let anch = !zone[p], libs = 0, ns = 1, k = 0; st[0] = p; sm[p] = sg; chId[p] = id;
      if (!anch) while (k < ns) {
        const q = st[k++], o = q * 4;
        for (let d = 0; d < 4; d++) {
          const r = nb[o + d]; if (r < 0) continue; const v = b[r];
          if (v === 0) { if (lm[r] !== lg) { lm[r] = lg; libs++; if (!inR[r]) anch = true; } }
          else if (v === c && sm[r] !== sg) { if (!zone[r]) { anch = true; continue; } sm[r] = sg; chId[r] = id; st[ns++] = r; }
        }
      }
      cL[id] = anch ? ANCH : libs; cA[id] = anch; cC[id] = c; cS[id] = ns;
    }
    this.nc = nc;
  }
  libsAt(p) { this.scan(); return this.sm[p] === this.sg ? this.cLibs[this.chId[p]] : this.B.chain(p); }
  // ---- static tests
  captured() { const b = this.B.b, o = this.owner; for (const t of this.tgt) if (b[t] !== o) return true; return false; }
  ownCaptured() { const b = this.B.b; for (const t of this.own) if (b[t] !== this.G) return true; return false; }
  anchoredAt(p) { this.scan(); return this.sm[p] === this.sg ? this.cAnch[this.chId[p]] : true; }
  // every target chain anchored or pass-alive (Benson's algorithm; anchored chains are immortal)
  ownerSafe() {
    const B = this.B, b = B.b, own = this.owner, nb = B.nb;
    for (const t of this.tgt) if (b[t] !== own) return false;
    this.scan();
    const chId = this.chId, cL = this.cLibs, cA = this.cAnch, cC = this.cCol;
    let all = true;
    for (const t of this.tgt) { const id = chId[t]; if (cA[id]) continue; all = false; if (cL[id] < 2) return false; }
    if (all) return true;
    // regions: components of non-owner points inside the zone (open = touches the outside)
    const rm = this.rm, rg = ++this.rg, zone = this.zone, st = this.st;
    const regs = [];   // { emp: [points], adj: [chain ids], open }
    for (const p of this.zoneList) {
      if (b[p] === own || rm[p] === rg) continue;
      const R = { emp: [], adj: [], open: false };
      let ns = 1, k = 0; st[0] = p; rm[p] = rg;
      while (k < ns) {
        const q = st[k++]; if (b[q] === 0) R.emp.push(q);
        for (let d = 0; d < 4; d++) {
          const r = nb[q * 4 + d]; if (r < 0) continue; const v = b[r];
          if (v === own) { const id = chId[r]; if (R.adj.indexOf(id) < 0) R.adj.push(id); continue; }
          if (!zone[r]) { R.open = true; continue; }
          if (rm[r] !== rg) { rm[r] = rg; st[ns++] = r; }
        }
      }
      regs.push(R);
    }
    // vital regions per chain
    const nc = this.nc, vit = [], alive = new Uint8Array(nc), adjR = [];
    for (let c = 0; c < nc; c++) { vit.push([]); adjR.push([]); alive[c] = cC[c] === own ? 1 : 0; }
    regs.forEach((R, ri) => {
      for (const c of R.adj) adjR[c].push(ri);
      if (R.open) return;
      for (const c of R.adj) {
        if (cA[c]) continue;
        let ok = true;
        for (const e of R.emp) { let lib = false; for (let d = 0; d < 4; d++) { const r = nb[e * 4 + d]; if (r >= 0 && b[r] === own && chId[r] === c) { lib = true; break; } } if (!lib) { ok = false; break; } }
        if (ok) vit[c].push(ri);
      }
    });
    const dead = new Uint8Array(regs.length);
    let changed = true;
    while (changed) {
      changed = false;
      for (let c = 0; c < nc; c++) {
        if (!alive[c] || cA[c]) continue;
        let v = 0; for (const ri of vit[c]) if (!dead[ri]) v++;
        if (v < 2) { alive[c] = 0; changed = true; for (const ri of adjR[c]) dead[ri] = 1; }
      }
    }
    for (const t of this.tgt) { const id = chId[t]; if (!cA[id] && !alive[id]) return false; }
    return true;
  }
  escaped() { this.scan(); for (const t of this.tgt) { const id = this.chId[t]; if (!this.cAnch[id] && this.cLibs[id] < 4) return false; } return true; }
  connected() { const B = this.B; B.chain(this.tgt[0]); const g = B.g, ms = B.ms; for (const t of this.tgt) if (ms[t] !== g) return false; return true; }
  // the fewest liberties of a target chain (lower bound of the player's moves to capture it)
  minLibs() { this.scan(); let m = 99; for (const t of this.tgt) { const l = this.cLibs[this.chId[t]]; if (l < m) m = l; } return m; }

  // ---- move generation
  // all empty region points (+ capture-freeing points); the owner never fills its own eye (unless it saves a chain in atari)
  genAll(c) {
    const B = this.B, b = B.b, nb = B.nb, out = [];
    this.scan();
    const own = c === this.owner;
    for (const p of this.region) {
      if (b[p]) continue;
      if (own) {
        let fill = true, atari = false;
        for (let d = 0; d < 4; d++) { const r = nb[p * 4 + d]; if (r < 0) continue; if (b[r] !== c) { fill = false; break; } if (this.libsAt(r) === 1) atari = true; }
        if (fill && !atari) continue;
      }
      out.push(p);
    }
    this.addCaps(c, out);
    return out;
  }
  // capturing a chain in atari that touches the target or the racing stones (also outside the region)
  addCaps(c, out) {
    const B = this.B, b = B.b, nb = B.nb;
    let seen = null;
    const base = this.own.length ? this.tgt.concat(this.own) : this.tgt;
    for (const t of base) {
      if (!b[t]) continue;
      B.chain(t); const st = Array.from(B.cs.subarray(0, B.ns));
      for (const q of st) for (let d = 0; d < 4; d++) {
        const r = nb[q * 4 + d]; if (r < 0 || !b[r] || b[r] === b[t] || b[r] === c) continue;
        if (B.chain(r) === 1) { const l = B.ls[0]; if (!this.inR[l]) { if (!seen) seen = new Set(out); if (!seen.has(l)) { seen.add(l); out.push(l); } } }
      }
    }
  }
  // tactical candidates for big regions: liberties of the target, their neighbours, liberties of weak chains around it
  genTac(c) {
    if (this.small) return this.genAll(c);
    const B = this.B, b = B.b, nb = B.nb, inR = this.inR, S = new Set(), isK = c === this.K;
    const tch = [], seenC = new Set();
    for (const t of this.tgt.concat(this.own)) { if (!b[t] || seenC.has(t)) continue; B.chain(t); const st = Array.from(B.cs.subarray(0, B.ns)), lb = Array.from(B.ls.subarray(0, B.nl)); for (const q of st) seenC.add(q); tch.push({ st, lb }); }
    for (const T of tch) {
      const tc = b[T.st[0]];
      for (const l of T.lb) { S.add(l); if (isK || T.lb.length <= 2) for (let d = 0; d < 4; d++) { const r = nb[l * 4 + d]; if (r >= 0 && !b[r]) S.add(r); } }
      const nc = new Set();
      for (const q of T.st) for (let d = 0; d < 4; d++) {
        const r = nb[q * 4 + d]; if (r < 0 || !b[r] || b[r] === tc || nc.has(r)) continue;
        B.chain(r); const st = Array.from(B.cs.subarray(0, B.ns)); for (const s of st) nc.add(s);
        if (B.nl <= 2) {
          for (const l of Array.from(B.ls.subarray(0, B.nl))) S.add(l);
          for (const s of st) for (let d2 = 0; d2 < 4; d2++) { const u = nb[s * 4 + d2]; if (u >= 0 && b[u] === tc) { B.chain(u); if (B.nl === 1) S.add(B.ls[0]); } }
        }
      }
    }
    const out = [];
    for (const p of S) if (inR[p] && !b[p]) out.push(p);
    this.addCaps(c, out);
    return out;
  }
  // order moves: captures, saving own chains in atari, ataris, then points with many empty neighbours
  order(list, c, best) {
    const B = this.B, b = B.b, nb = B.nb, o = 3 - c, sc = new Float64Array(list.length);
    this.scan();
    for (let j = 0; j < list.length; j++) {
      const p = list[j]; let s = 0, emp = 0;
      if (p === best) s += 1000;
      for (let d = 0; d < 4; d++) {
        const r = nb[p * 4 + d]; if (r < 0) { s += 0.3; continue; }
        const v = b[r]; if (v === 0) { emp++; continue; }
        const l = this.libsAt(r);
        if (v === o) { if (l === 1) s += 20 + this.cSize[this.chId[r]]; else if (l === 2) s += 3; else s += 0.5; }
        else if (l === 1) s += 8;
      }
      sc[j] = s + emp * 1.5;
    }
    const idx = list.map((_, j) => j).sort((x, y) => sc[y] - sc[x]);
    return idx.map(j => list[j]);
  }

  // ---- unbounded life & death: does the owner's target survive? (K never passes; the owner may)
  ub(turn) {
    if (this.captured()) return false;
    if (this.ownerSafe()) return true;
    const B = this.B, key = B.key(turn), e = this.UB.get(key);
    if (e !== undefined) return e > 0;
    if (++this.nodes > this.lim || ((this.nodes & 127) === 0 && this.dl && Date.now() > this.dl)) throw ABORT;
    if (B.undo.length > 160) return true;
    const own = this.owner, K = this.K;
    let res;
    if (turn === K) {
      res = true;
      const mv = this.order(this.genAll(K), K, this.UBm.get(key));
      for (const m of mv) {
        if (!B.play(m, K)) continue;
        const r = this.ub(own); B.back();
        if (!r) { res = false; this.UBm.set(key, m); break; }
      }
    } else {
      res = false;
      // the owner passes first when nothing of its own is in atari (in a living shape a pass usually holds, which keeps
      // the tree small); otherwise answers first and passes last
      const bm = this.UBm.get(key), mv = this.order(this.genAll(own), own, bm);
      // one-ply: a move that makes the target pass-alive at once ends the search
      for (const m of mv) {
        if (!B.play(m, own)) continue;
        const ok = !this.captured() && this.ownerSafe(); B.back();
        if (ok) { this.UB.set(key, 1); this.UBm.set(key, m); return true; }
      }
      if (bm === PASS) mv.unshift(PASS); else mv.push(PASS);
      for (const m of mv) {
        if (!B.play(m, own)) continue;
        const r = this.ub(K); B.back();
        if (r) { res = true; this.UBm.set(key, m); break; }
      }
    }
    this.UB.set(key, res ? 1 : -1);
    return res;
  }
  // an owner chain in the zone (not anchored) with one liberty?
  ownAtari(c) { this.scan(); for (let id = 0; id < this.nc; id++) if (this.cCol[id] === c && !this.cAnch[id] && this.cLibs[id] === 1) return true; return false; }
  // does the player's goal hold in the unbounded game with `turn` to move?
  ldWin(turn) { const s = this.ub(turn); return this.goal === 'kill' ? !s : s; }

  // ---- goal reached (static, or settled: the opponent cannot change the result even with one free extra move)
  R() {
    const gl = this.goal;
    if (gl === 'capture' || gl === 'cut' || gl === 'semeai') return this.captured();
    if (gl === 'escape') return !this.captured() && this.escaped();
    if (gl === 'connect') return this.connR();
    if (gl === 'kill' && this.captured()) return true;
    if (gl === 'live' && this.captured()) return false;
    const B = this.B, key = B.key(0), c = this.RC.get(key);
    if (c !== undefined) return c;
    let res;
    if (this.ownerSafe()) res = gl === 'live';
    else {
      const O = this.O;
      res = this.ldWin(O);                      // the extra move = pass
      if (res) {
        const mv = this.order(this.genAll(O), O, this.UBm.get(B.key(O)));
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
  // connect: one chain, or connected in shape: whatever the opponent plays (incl. pass) the player joins all target
  // stones into one chain with 2+ liberties at once
  connR() {
    if (this.captured()) return false;
    if (this.connected()) return true;
    const B = this.B, key = B.key(0), c = this.RC.get(key);
    if (c !== undefined) return c;
    const G = this.G, O = this.O, mo = this.genAll(O); mo.push(PASS);
    let res = true;
    for (const d of mo) {
      if (++this.nodes > this.lim || ((this.nodes & 127) === 0 && this.dl && Date.now() > this.dl)) throw ABORT;
      if (!B.play(d, O)) continue;
      let ok = false;
      if (!this.captured()) for (const a of this.genAll(G)) {
        if (!B.play(a, G)) continue;
        if (!this.captured() && this.connected() && B.chain(this.tgt[0]) >= 2) ok = true;
        B.back(); if (ok) break;
      }
      B.back();
      if (!ok) { res = false; break; }
    }
    this.RC.set(key, res);
    return res;
  }
  fail() {
    const gl = this.goal;
    if (gl === 'semeai') return this.ownCaptured();
    if (gl === 'live' || gl === 'escape' || gl === 'connect') return this.captured();
    if (gl === 'capture' || gl === 'cut') { for (const t of this.tgt) if (this.anchoredAt(t)) return true; }
    return false;
  }
  lb() { const gl = this.goal; return (gl === 'capture' || gl === 'cut' || gl === 'semeai') ? this.minLibs() : 1; }
  gen(c) { return this.ld ? this.genAll(c) : this.genTac(c); }
  // the moves listed by solve(): every region point for small regions; for big (tactical) regions the tactical
  // candidates plus the region points within 2 of the target / racing stones
  rootMoves(c) {
    if (this.ld || this.small) return this.genAll(c);
    const out = this.genTac(c), seen = new Set(out), n = this.n, b = this.B.b, near = this.tgt.concat(this.own);
    for (const p of this.region) {
      if (b[p] || seen.has(p)) continue;
      const x = p % n, y = (p / n) | 0;
      for (const t of near) if (Math.abs(t % n - x) <= 2 && Math.abs(((t / n) | 0) - y) <= 2) { out.push(p); break; }
    }
    return out;
  }

  // ---- bounded: can G reach the goal within k own moves? aw: G to move; dw: O to move
  aw(k) {
    if (this.R()) return true;
    if (k <= 0 || this.fail()) return false;
    if (this.lb() > k) return false;
    const B = this.B, key = B.key(this.G), e = this.BT.get(key);
    if (e) { if (e.w <= k) return true; if (e.l >= k) return false; }
    if (++this.nodes > this.lim || ((this.nodes & 127) === 0 && this.dl && Date.now() > this.dl)) throw ABORT;
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
    if (k <= 0 || this.fail()) return false;
    if (this.lb() > k) return false;
    if (this.ld && !this.ldWin(this.O)) return false;    // the opponent can resist forever: no bounded win
    const B = this.B, key = B.key(this.O), e = this.BT.get(key);
    if (e) { if (e.w <= k) return true; if (e.l >= k) return false; }
    if (++this.nodes > this.lim || ((this.nodes & 127) === 0 && this.dl && Date.now() > this.dl)) throw ABORT;
    const O = this.O, mv = this.order(this.gen(O), O, e && e.m);
    if (e && e.m === PASS) mv.unshift(PASS); else mv.push(PASS);
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
  // G to move: the fewest G moves (<= left) to reach the goal; 0 = not within left
  needG(left) { for (let j = 1; j <= left; j++) if (this.aw(j)) return j; return 0; }
  // O to move: G moves still needed (0 = already reached); -1 = not within left
  needO(left) { for (let j = 0; j <= left; j++) if (this.dw(j)) return j; return -1; }
  // ---- set the board to P.s + moves (normal rules: either side may take a ko here)
  load(moves) {
    const B = this.B;
    while (B.undo.length) B.back();
    let turn = this.G;
    for (const m of moves || []) {
      const save = B.noKo; B.noKo = 0;
      const ok = B.play(m, turn); B.noKo = save;
      if (!ok) return null;
      turn = 3 - turn;
    }
    return turn;
  }
  clearIfBig() { if (this.UB.size > 4e5) { this.UB.clear(); this.UBm.clear(); } if (this.BT.size > 4e5) this.BT.clear(); if (this.RC.size > 2e5) this.RC.clear(); }
}
const ABORT = { abort: true };

// ================================================================ API
// is `moves` a prefix of the puzzle's main line? -> its length, else -1
function lineIndex(C, P, moves) {
  const line = (P.line || []).map(v => pt(v, C.n));
  if (!line.length || moves.length > line.length) return -1;
  for (let k = 0; k < moves.length; k++) if (moves[k] !== line[k]) return -1;
  return moves.length;
}
// run f() for one candidate; on a timeout / node limit unwind the board and return `dflt`
function guarded(C, f, dflt) {
  const B = C.B, depth = B.undo.length;
  try { return f(); } catch (e) { if (e !== ABORT) throw e; while (B.undo.length > depth) B.back(); C.aborted++; return dflt; }
}
function solve(P, moves, left, defend, opts) {
  const exact = !!(opts && opts.exact);
  const C = ctxOf(P); C.clearIfBig();
  moves = moves || [];
  const turn = C.load(moves); if (turn === null) return [];
  const B = C.B, out = [], n = C.n;
  left = Math.max(0, left | 0);
  C.dl = exact ? 0 : Date.now() + api.budget; C.aborted = 0; C.nodes = 0;
  // page mode: on the verified main line the line's move is known (and at the start it is the only solution)
  const k = exact ? -1 : lineIndex(C, P, moves), line = k >= 0 ? (P.line || []).map(v => pt(v, n)) : null;
  const km = line && k < line.length ? line[k] : null;
  const kneed = km === null ? 0 : defend ? Math.floor((line.length - k) / 2) : Math.ceil((line.length - k) / 2);
  try {
    if (!defend) {
      const G = C.G, mv = C.order(C.rootMoves(G), G);
      if (km !== null && mv.indexOf(km) < 0) mv.unshift(km);
      for (const m of mv) {
        if (m === km) { out.push({ m, need: Math.min(kneed, left) }); continue; }
        if (k === 0) { if (B.play(m, G)) { B.back(); out.push({ m, need: 0 }); } continue; }   // unique answer (verified)
        if (!B.play(m, G)) continue;
        const r = guarded(C, () => {
          let need = 0;
          if (C.R()) need = 1;
          else if (!C.fail() && left > 1) { const j = C.needO(left - 1); need = j > 0 ? j + 1 : 0; }
          let hopeless = false;
          if (!need && left > 1 && !C.ld) hopeless = !coop(C, left - 1);
          return hopeless ? { m, need, hopeless: true } : { m, need };
        }, { m, need: 0 });
        B.back();
        out.push(r);
      }
    } else {
      const O = C.O, mv = C.order(C.rootMoves(O), O); mv.push(PASS);
      if (km !== null && mv.indexOf(km) < 0) mv.unshift(km);
      const rows = [];
      for (const m of mv) {
        if (m === km) { rows.push({ m, need: kneed || 1, line: 1 }); continue; }
        if (!B.play(m, O)) continue;
        const need = guarded(C, () => C.R() ? 1 : C.fail() ? 0 : C.needG(left), km !== null ? (kneed || 1) : 0);   // R: a self-destructive reply, ranked lowest
        B.back();
        rows.push({ m, need });
      }
      // preference: refutations first, then the longest resistance; among equals the main line's move, then the move
      // closest to the action (the target / racing stones / the last move), pass last
      const near = C.tgt.concat(C.own); if (moves.length && moves[moves.length - 1] >= 0) near.push(moves[moves.length - 1]);
      const dist = m => { if (m === PASS) return 99; let d = 99; const x = m % n, y = (m / n) | 0; for (const t of near) d = Math.min(d, Math.max(Math.abs(t % n - x), Math.abs(((t / n) | 0) - y))); return d; };
      rows.forEach((r, j) => { r.d = r.line ? -1 : dist(r.m); r.j = j; });
      rows.sort((a, b) => (b.need === 0 ? 99 : b.need) - (a.need === 0 ? 99 : a.need) || a.d - b.d || a.j - b.j);
      rows.forEach(r => { delete r.d; delete r.j; delete r.line; });
      out.push(...rows);
    }
  } finally { C.dl = 0; }
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
function reached(P, pos, opts) {
  const exact = !!(opts && opts.exact);
  const C = ctxOf(P), B = C.B, n = C.n;
  C.load([]);
  const b = pos.b || GR.Pos.from(pos).b;
  // page mode: a position of the verified main line is reached only at its end
  if (!exact && P.line && P.line.length) {
    const line = P.line.map(v => pt(v, n)), lk = line.join(',');
    if (C.lineKey !== lk) {
      C.lineKey = lk; C.lineH = [];
      const tmp = new Board(n); for (let i = 0; i < C.N; i++) if (B.b[i]) tmp.put(i, B.b[i]);
      let c = C.G; C.lineH.push(tmp.h1 + ':' + tmp.h2);
      for (const m of line) { if (!tmp.play(m, c)) break; c = 3 - c; tmp.setKo(-1); C.lineH.push(tmp.h1 + ':' + tmp.h2); }
    }
    let h1 = 0, h2 = 0; for (let i = 0; i < C.N; i++) if (b[i]) { h1 ^= Z1[i * 2 + b[i] - 1]; h2 ^= Z2[i * 2 + b[i] - 1]; }
    const at = C.lineH.indexOf(h1 + ':' + h2);
    if (at >= 0) return at === C.lineH.length - 1;
  }
  // set the board directly (the undo stack stays empty so load() still works)
  const saved = Array.from(B.b);
  for (let i = 0; i < C.N; i++) if (B.b[i] !== b[i]) B.put(i, b[i]);
  const ko = pos.ko >= 0 ? pos.ko : -1; B.setKo(ko);
  C.dl = exact ? 0 : Date.now() + api.budget; C.nodes = 0;
  let r;
  try { r = guarded(C, () => C.R(), false); }
  finally { C.dl = 0; B.setKo(-1); for (let i = 0; i < C.N; i++) if (B.b[i] !== saved[i]) B.put(i, saved[i]); }
  return r;
}
// the main line: the answer (or the first winning move), then the defender's longest resistance, ... until reached
const EX = { exact: true };
function mainLine(P, left) {
  const C = ctxOf(P), n = C.n; left = left || P.n || 3;
  const line = []; let first = P.answer != null ? pt(P.answer, n) : null;
  for (let step = 0; step < 40 && left > 0; step++) {
    let list = solve(P, line, left, false, EX).filter(x => x.need > 0 && x.need <= left).sort((a, b) => a.need - b.need);
    if (!list.length) break;
    let m = list[0].m; if (step === 0 && first != null && list.some(x => x.m === first)) m = first;
    line.push(m); left--;
    C.load(line); if (C.R()) break;
    const dl = solve(P, line, left, true, EX);
    if (!dl.length) break;
    line.push(dl[0].m);
    C.load(line); if (C.R()) break;
  }
  return line;
}

const api = { solve, reached, mainLine, PASS, budget: 220, nodeLimit: Infinity, _ctx: ctxOf, _Board: Board };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.GoTsumego = api;
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : globalThis);
