// Connect Four on several threads (shared/mtsplit.js; common rule 2026-11-08「本編のマルチスレッド」全タイトル対応).
// Plain workers of engine.js solve the root moves at the same time (each its own exact solver and table; no shared memory,
// so no isolation and no reload). The steps are the engine's own (engine.js mtPlan / mtSolve / mtFin): one worker does the
// opening tree / book / heuristic pass, then every column is weak-solved (win / draw / loss) and exact-solved at once.
//   C4MT.drive(msg, X, onProgress) — msg.type 'analyze' (hints, evaluation, the coach), 'cands' (the review box: the moves and a
//   line after the best few) or 'think' (Lv.6–8: the solver phase of the AI's move) → the reply the one-thread worker gives
//   ('analysis' / 'candsDone' / 'result'), null (cancelled) or undefined (do it the usual way)
(function () {
  'use strict';
  if (window.C4MT) return;
  const rankVal = e => {   // (engine.js rankVal: comparable across kinds, mover's view)
    if (e.kind === 'exact') return e.v > 0 ? 1e6 + e.v : e.v < 0 ? -1e6 + e.v : 0;
    if (e.kind === 'weak') return e.v > 0 ? 1e6 : e.v < 0 ? -1e6 : 0;
    return Math.max(-9e5, Math.min(9e5, e.h !== undefined ? e.h : e.v));
  };
  const solve = (X, moves, c, weak, until, k) => X.exec({ type: 'mtsolve', moves, c, weak, until, k: k || 0 }, c, 10);
  const off = X => X.cancelled ? null : undefined;
  // shared mode (X.shared: the workers solve on one table in shared memory, 2026-11-09): every column at once, and a worker left
  // without a column of its own joins the column with the fewest workers on it (a variant: another move order near the top,
  // engine.js negaS) — the first answer counts and the others on that column stop at once. Without the shared table each
  // column is one worker's (the copies would only redo the same work). → Promise<[{ v, ok } | null per column]>
  function solveAll(X, moves, cs, weak, until, onEach) {
    return new Promise(resolve => {
      const out = cs.map(() => undefined), runs = cs.map(() => []), hits = cs.map(() => 0), late = cs.map(() => false);
      let busy = 0, left = cs.length;
      if (!left) { resolve(out); return; }
      const launch = i => {
        const k = hits[i]++, q = solve(X, moves, cs[i], weak, until, k); runs[i].push(q); busy++;
        q.then(r => {
          busy--; q.over = true;
          if (out[i] === undefined) {
            if (r && r.ok) { out[i] = r; left--; runs[i].forEach(x => { if (!x.over) X.drop(x); }); if (onEach) onEach(i, r); }
            else { late[i] = true; if (runs[i].every(x => x.over)) { out[i] = r || null; left--; } }   // (out of time / failed: no new copy; the answer once no other worker is on it)
          }
          if (left === 0) { resolve(out); return; }
          fill();
        });
      };
      const fill = () => {
        if (X.cancelled) return;
        while (busy < X.n) {
          let bi = -1;
          for (let i = 0; i < cs.length; i++) if (out[i] === undefined && !late[i] && (bi < 0 || runs[i].filter(x => !x.over).length < runs[bi].filter(x => !x.over).length)) bi = i;
          if (bi < 0 || (!X.shared && runs[bi].length)) break;
          launch(bi);
        }
      };
      fill();
    });
  }

  async function analyze(X, msg, onProgress) {
    const pre = await X.exec({ type: 'mtplan', job: 'analyze', moves: msg.moves, time: msg.time || 1000, htime: msg.htime }, undefined, 100);
    if (!pre) return off(X);
    if (pre.result) return Object.assign({ type: 'analysis' }, pre.result);
    const p = pre.plan, list = p.list;
    const prog = () => { if (onProgress) onProgress({ type: 'progress', list: list.map(x => Object.assign({}, x)), depth: p.depth }); };
    prog();
    let timeout = false;
    for (const mode of ['weak', 'exact']) {   // (engine.js analyzePosition: the weak pass, then the exact pass)
      const todo = list.filter(e => e.kind !== 'exact' && !(mode === 'weak' && e.kind === 'weak'));
      const take = (e, r) => {
        if (!r || !r.ok) { timeout = true; return; }
        e.kind = mode === 'weak' && Math.abs(r.v) <= 1 ? 'weak' : 'exact'; e.v = r.v; prog();
      };
      if (X.shared) { const rs = await solveAll(X, msg.moves, todo.map(e => e.c), mode === 'weak', p.until); todo.forEach((e, i) => take(e, rs[i])); }
      else await Promise.all(todo.map(e => solve(X, msg.moves, e.c, mode === 'weak', p.until).then(r => take(e, r))));
      if (X.cancelled) return null;
      if (timeout) return { type: 'analysis', list, depth: p.depth };
    }
    return { type: 'analysis', list, depth: p.depth, solved: true };
  }

  async function cands(X, msg, onProgress) {
    const a = await analyze(X, { moves: msg.moves, time: msg.time || 1000 }, null);
    if (!a) return a;
    const list = a.list.slice().sort((x, y) => rankVal(y) - rankVal(x)), lines = {};
    if (onProgress) onProgress({ type: 'cands', list, lines: {} });
    await Promise.all(list.slice(0, msg.n || 4).map(e => X.exec({ type: 'mtpv', moves: msg.moves, c: e.c, plies: msg.plies || 8, ply: msg.ply || 120 }, e.c, 10).then(r => {
      if (!r || X.cancelled) return;
      lines[e.c] = r.line; if (onProgress) onProgress({ type: 'cands', list, lines: Object.assign({}, lines) });
    })));
    if (X.cancelled) return null;
    return { type: 'candsDone', list, lines };
  }

  // Lv.8 outside the opening tree (engine.js thinkPerfect): every column weak-solved at once; the first one in the heuristic
  // order that keeps the position's value. A lost position: every column exact-solved, the slowest loss.
  async function perfect(X, msg, p) {
    const order = p.order, r = order.map(() => undefined);
    let decided = -1, fail = false;
    const ps = [];
    const check = () => {
      if (decided >= 0) return;
      for (let i = 0; i < order.length; i++) {
        if (r[i] === undefined || r[i] === null) return;
        if (r[i] > 0) { decided = i; ps.forEach((q, k) => { if (k > i) X.drop(q, true); }); return; }   // (a win: the later columns are not needed)
      }
    };
    const all = order.map((c, i) => { const q = solve(X, msg.moves, c, true, p.hard); ps.push(q); return q.then(x => { if (decided >= 0) return; if (!x || !x.ok) { fail = true; r[i] = null; return; } r[i] = x.v; check(); }); });
    await Promise.all(all);
    if (X.cancelled) return null;
    const fin = o => X.exec(Object.assign({ type: 'mtfin', kind: 'perfect', moves: msg.moves, level: msg.level, order, t0: p.t0 }, o), undefined, 100).then(f => f ? Object.assign({ type: 'result' }, f.result) : off(X));
    if (decided >= 0) return fin({ move: order[decided], cls: 1, msProof: Date.now() - p.t0 });
    if (fail) return undefined;   // (out of even the long budget: the one-thread worker, which falls back to the search)
    const cls = Math.max.apply(null, r.map(v => Math.sign(v)));
    if (cls >= 0) return fin({ move: order[r.findIndex(v => Math.sign(v) >= cls)], cls, msProof: Date.now() - p.t0 });
    const msProof = Date.now() - p.t0, done = [];
    await Promise.all(order.map((c, i) => solve(X, msg.moves, c, false, p.time).then(x => { if (x && x.ok) done.push({ c, kind: 'exact', v: x.v, h: -i }); })));
    if (X.cancelled) return null;
    done.sort((a, b) => b.h - a.h);
    return fin({ move: -1, cls, msProof, done });
  }

  async function think(X, msg) {
    const pre = await X.exec({ type: 'mtplan', job: 'think', moves: msg.moves, level: msg.level }, undefined, 100);
    if (!pre) return off(X);
    if (pre.result) return Object.assign({ type: 'result' }, pre.result);
    const p = pre.plan;
    if (p.kind === 'perfect') return perfect(X, msg, p);
    // the solver phase of Lv.6 / 7 (engine.js solvePhase): the weak pass on every column at once (a win ends it), then the exact
    // pass on the best class when nothing wins
    const list = p.list, dl = Date.now() + p.budget, sorted = list.slice().sort((a, b) => b.h - a.h);
    let complete = true, won = false;
    const ps = [];
    const all = sorted.map(e => { const q = solve(X, msg.moves, e.c, true, p.perfect ? p.t0 + p.hard : dl); ps.push(q); return q.then(r => {
      if (won) return;
      if (!r || !r.ok) { complete = false; return; }
      e.kind = Math.abs(r.v) <= 1 ? 'weak' : 'exact'; e.v = r.v;
      if (r.v > 0) { won = true; ps.forEach(x => X.drop(x, true)); }
    }); });
    await Promise.all(all);
    if (X.cancelled) return null;
    if (won) complete = true;
    if (complete && !won) {
      const bestCls = Math.max.apply(null, list.filter(e => e.kind !== 'heur').map(e => Math.sign(e.v)));
      if (bestCls <= 0) await Promise.all(sorted.filter(e => e.kind !== 'exact' && e.kind !== 'heur' && Math.sign(e.v) === bestCls).map(e => solve(X, msg.moves, e.c, false, dl + 300).then(r => { if (r && r.ok) { e.kind = 'exact'; e.v = r.v; } })));
      if (X.cancelled) return null;
    }
    const f = await X.exec({ type: 'mtfin', kind: 'tail', moves: msg.moves, level: msg.level, list, depth: p.depth, t0: p.t0 }, undefined, 100);
    return f ? Object.assign({ type: 'result' }, f.result) : off(X);
  }

  window.C4MT = {
    drive(msg, X, onProgress) {
      if (msg.type === 'analyze') return analyze(X, msg, onProgress);
      if (msg.type === 'cands') return cands(X, msg, onProgress);
      if (msg.type === 'think') return think(X, msg);
      return Promise.resolve(undefined);
    },
  };
})();
