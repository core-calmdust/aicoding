/* Ponder —「先読み」(PRO mode of the new-game dialog, shared/proset.js key 'ponder', off by default; 2026-11-11).
   While the human thinks in a game against the AI, the pool of threads (shared/mtengine.js) keeps searching:
   • the position after the reply the AI expects (the second move of its principal variation: "予想手ポンダー"), or
   • without one, the human's own position (every reply then gets into the table).
   The pool's transposition table is one shared memory that stays from search to search, so when the AI's turn comes its own
   search (a new job: any request for the pool stops this one first) finds the work done — after the expected reply it is the
   same position, read again at once up to where pondering got; after another reply, what pondering put in the table still
   helps. The AI's own thinking time / limit is as before (the PRO limit or the level).
   Stopped at once (mt_stop on every thread; its result is never used, so the board cannot be touched) when the position
   changes (a move, 待った, a new game, …), when the game is over or no longer against the AI, when the tab is hidden (battery,
   heat; it resumes when the tab is shown again), and after CAP ms of pondering on one position. Only with the threads on;
   never in rated games (PRO is not used there).

     <script src="../shared/ponder.js?v=1"></script>
     const PONDER = window.Ponder && MTP ? Ponder.attach({
       mtp: MTP,                               // MTEngine.use(...) of the page
       want: () => bool,                        // an AI game, the human to move, not over, not reviewing, proCfg(..).ponder
       key: () => string,                       // the position now (e.g. the moves so far)
       job: cap => ({ msg, target } | null),    // the pool message: the AI's 'think' at the expected reply (or here) with a limit of `cap` ms;
                                                // target: key() after that reply (null: pondering the position itself)
     }) : null;
     PONDER.kick()  check now (e.g. right after the AI's move)      window.__ponder: the state (tests) */
(function () {
  'use strict';
  if (window.Ponder) return;
  const CAP = 180000, TICK = 250;
  function attach(o) {
    const mtp = o.mtp, orig = mtp.pool.bind(mtp);
    const S = window.__ponder = { running: false, base: null, target: null, depth: 0, nodes: 0, ms: 0, runs: 0, hits: 0, misses: 0, last: null };
    let run = null, done = null, tStart = 0;   // run: the job now ({ base, target, t0 }); done: the base pondered to the end (not again)
    const stop = () => { if (run) { mtp.cancel('ponder'); } };
    // any other request for the threads (the AI's move, analysis, hints, the coach, the review box) comes first
    mtp.pool = prio => { if (run) stop(); return orig(prio); };
    function check() {
      let k = null; try { k = o.key(); } catch (e) {}
      if (S.base !== null && k !== S.base && !S.counted) {   // the human moved from the pondered position: as expected or not
        S.counted = true; if (S.target !== null && k && k.indexOf(S.base) === 0) {   // (only a move from it: not a new game / 待った)
          if (k === S.target) S.hits++; else S.misses++; S.last = k === S.target ? 'hit' : 'miss'; }
      }
      let w = false; try { w = !document.hidden && !!o.want(); } catch (e) {}
      if (run) { if (!w || k !== run.base) stop(); return; }
      if (!w || k === done) return;
      const p = orig(); if (!p) return;   // (busy with something else: later)
      let j = null; try { j = o.job(CAP); } catch (e) { console.warn('[ponder]', e); }
      if (!j || !j.msg) { done = k; return; }
      const r = run = { base: k, target: j.target == null ? null : j.target, t0: performance.now() };
      if (S.base !== k) { S.base = k; S.target = r.target; S.counted = false; S.depth = 0; S.nodes = 0; S.ms = 0; }
      S.running = true; S.runs++; tStart = r.t0;
      p.run(j.msg, m => { if (run === r) { if (m.depth) S.depth = Math.max(S.depth, m.depth); if (m.nodes) S.nodes = m.nodes; S.ms = performance.now() - tStart; } }, 'ponder').then(res => {
        if (run === r) run = null;
        S.running = false;
        if (res) { done = r.base; if (res.depth) S.depth = Math.max(S.depth, res.depth); }   // (finished by itself: CAP or the end of the search — not again here)
        if (res === undefined) done = r.base;                                                // (the threads failed)
      });
    }
    setInterval(check, TICK);
    document.addEventListener('visibilitychange', check);
    addEventListener('pagehide', stop);
    return { kick: () => setTimeout(check, 0), stop, state: S };
  }
  window.Ponder = { attach, CAP };
})();
