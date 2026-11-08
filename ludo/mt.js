/* ludo/mt.js — the threads (../shared/mtworkers.js; common rule 2026-11-08「本編のマルチスレッド」).
   Without threads the position card (bar and graph) shows E.winProb, a logistic fit of the one-throw evaluation. With threads
   every position of the game is also played out to the end 128 times (Lv.20 for every seat, the same seeded throws for each position) on all cores, and
   the card shows those win chances as they come in (the latest position first). The AI's moves, the hint and the coach keep the
   engine's own one-throw reading: rollouts at a budget a move can afford chose worse moves than Lv.20 (claude/ludo-spec.md).
     LudoMT.wpMany([{ state, team }], onEach(i, wp), { count, tag }) → Promise<wps | null (cancelled) | undefined (busy / failed)>
     LudoMT.on(), .threads, .cancel(tag), .rate (playouts / s of the last job, all threads) */
window.LudoMT = (function () {
  const MW = window.MTWorkers ? (MTWorkers.init(), MTWorkers).use({ url: 'worker.js?v=2', warm: { type: 'ping' } }) : null;
  let rate = 0;
  async function wpMany(list, onEach, o) {
    o = o || {};
    const P = MW && MW.pool(); if (!P || !list.length) return undefined;
    const count = o.count || 128, t0 = performance.now();   // (≈ ±4% for one position; the same seeds for every position: neighbours in the graph meet the same throws, so the line stays smooth)
    const r = await P.map(list.map((q, i) => ({ type: 'wp', state: q.state, team: q.team, seed: 7919, count })), { tag: o.tag || 'review', onEach: (i, d) => { if (onEach) onEach(i, d.sum / count); } });
    if (r) rate = list.length * count / Math.max(1e-3, (performance.now() - t0) / 1000);
    return r ? r.map(d => d.sum / count) : r;
  }
  return { wpMany, on: () => !!MW && MW.on(), cancel: t => { if (MW) MW.cancel(t); }, get threads() { return MW ? MW.threads : 1; }, get rate() { return rate; } };
})();
