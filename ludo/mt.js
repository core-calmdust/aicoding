/* ludo/mt.js — the threads (../shared/mtworkers.js; common rule 2026-11-08「本編のマルチスレッド」).
   Without threads the position card (bar and graph) shows E.winProb, a logistic fit of the one-throw evaluation. With threads
   every position of the game is also played out to the end 128 times (Lv.20 for every seat, the same seeded throws for each position) on all cores, and
   the card shows those win chances as they come in (the latest position first). The AI's moves, the hint and the coach keep the
   engine's own one-throw reading: rollouts at a budget a move can afford chose worse moves than Lv.20 (claude/ludo-spec.md).
     LudoMT.wpMany([{ state, team }], onEach(i, wp), { count, tag }) → Promise<wps | null (cancelled) | undefined (busy / failed)>
     LudoMT.on(), .threads, .cancel(tag), .rate (playouts / s of the last job, all threads)
   2026-11-09: a position's 128 playouts were one task, so while a game goes on (one new position at a time) the bar was read
   on one thread. Each position is now cut into parts so that there are about 4 tasks a thread (the parts' playouts added up
   in order on the page: the same sum, the same win chance). */
window.LudoMT = (function () {
  const MW = window.MTWorkers ? (MTWorkers.init(), MTWorkers).use({ url: 'worker.js?v=4', warm: { type: 'ping' }, all: true }) : null;
  let rate = 0;
  async function wpMany(list, onEach, o) {
    o = o || {};
    const P = MW && MW.pool(); if (!P || !list.length) return undefined;
    const count = o.count || 128, t0 = performance.now();   // (≈ ±4% for one position; the same seeds for every position: neighbours in the graph meet the same throws, so the line stays smooth)
    const parts = Math.max(1, Math.min(count, Math.ceil(4 * P.threads / list.length))), per = Math.ceil(count / parts);
    const tasks = [], own = [], vals = list.map(() => new Array(count)), left = list.map(() => 0), wps = new Array(list.length);
    list.forEach((q, i) => { for (let a = 0; a < count; a += per) { tasks.push({ type: 'wp', state: q.state, team: q.team, seed: 7919 + a, count: Math.min(per, count - a), each: true }); own.push([i, a]); left[i]++; } });
    const r = await P.map(tasks, { tag: o.tag || 'review', onEach: (k, d) => {
      const [i, a] = own[k]; d.vals.forEach((v, j) => { vals[i][a + j] = v; });
      if (--left[i] === 0) { let s = 0; for (const v of vals[i]) s += v; wps[i] = s / count; if (onEach) onEach(i, wps[i]); }   // (in order: the sum of E.wpTask)
    } });
    if (r) rate = list.length * count / Math.max(1e-3, (performance.now() - t0) / 1000);
    return r ? wps : r;
  }
  return { wpMany, on: () => !!MW && MW.on(), cancel: t => { if (MW) MW.cancel(t); }, get threads() { return MW ? MW.threads : 1; }, get rate() { return rate; } };
})();
