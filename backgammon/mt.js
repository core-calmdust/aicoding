// backgammon/mt.js — the threads (shared/mtworkers.js; common rule 2026-11-08「本編のマルチスレッド」).
// A pool of AI workers (engine.js) values the candidate plays of analyzePlays side by side: the plays at 0-ply (one worker),
// then the chosen candidates at 1-ply, then at 2-ply (one task per candidate, BG.planPly picks them as analyzePlays would).
// The values go back to the usual worker as `pre` (key:ply → probs), which finishes the request the usual way (the order, the
// played move, the commentary) — so the result is analyzePlays' without the deadline: the time-capped levels 9・10 and the
// coach's 2-ply read every candidate they mean to (one 2-ply candidate costs about 0.5–1.5 s on one core).
//   BGMT.prep(msg, prio) → Promise<msg with pre | msg>   (msg: a worker request 'move' or 'analyze'; unchanged when off / busy)
//   BGMT.cancel(tag), BGMT.on(), BGMT.threads, BGMT.rate (the last job: candidates / s)
window.BGMT = (function () {
  const MW = window.MTWorkers ? (MTWorkers.init(), MTWorkers).use({ url: 'engine.js?v=20261108mt', warm: { type: 'ping' } }) : null;
  let rate = 0;
  async function prep(msg, prio) {
    if (!MW || !msg || !msg.pos) return msg;
    let o = null;
    if (msg.type === 'move' && BG.LEVEL_OPTS[msg.level] && BG.LEVEL_OPTS[msg.level].time) o = BG.LEVEL_OPTS[msg.level];
    else if (msg.type === 'analyze' && (msg.ply === undefined ? 1 : msg.ply) >= 1) o = { ply: msg.ply === undefined ? 1 : msg.ply, keep1: msg.keep || 8, margin1: 0.3, keep2: 3, margin2: 0.05 };
    if (!o) return msg;
    const tag = msg.type === 'move' ? 'ai' : 'ana';
    const P = MW.pool(prio); if (!P) return msg;
    const pos = Array.from(msg.pos), t0 = performance.now();
    const r0 = await P.map([{ type: 'plays0', pos, side: msg.side, dice: msg.dice }], { tag });
    if (!r0) return msg;
    const plays = r0[0].list; if (plays.length < 2) return msg;
    const pre = {}; let n = 0;
    const stage = async (ply, idx, extra) => {
      const list = idx.map(i => plays[i]).concat(extra || []);
      if (!list.length) return true;
      const q = MW.pool(prio); if (!q) return false;
      const r = await q.map(list.map(x => ({ type: 'ply', pos: x.pos, o: 1 - msg.side, ply })), { tag });
      if (!r) return false;
      list.forEach((x, k) => { const v = r[k].v; pre[x.key + ':' + ply] = v; if (plays.includes(x)) { x.v = v; x.e = BG.equity(v); x.ply = ply; } });
      n += list.length;
      plays.sort((a, b) => (b.ply - a.ply) || (b.e - a.e));
      return true;
    };
    const s1 = BG.planPly(plays, o, 1);
    const played = msg.played ? plays.find(x => x.key === msg.played) : null;
    const top = o.ply >= 2 ? 2 : 1;
    if (!(await stage(1, s1, top === 1 && played && !s1.includes(plays.indexOf(played)) ? [played] : null))) return msg;
    if (top === 2) {
      const s2 = BG.planPly(plays, o, 2);
      if (!(await stage(2, s2, played && !s2.includes(plays.indexOf(played)) ? [played] : null))) return msg;
    }
    rate = n / ((performance.now() - t0) / 1000);
    return Object.assign({}, msg, { pre });
  }
  return { prep, cancel: tag => { if (MW) MW.cancel(tag); }, on: () => !!MW && MW.on(), get threads() { return MW ? MW.threads : 1; }, get rate() { return rate; } };
})();
