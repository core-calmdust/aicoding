/* ハーツ — the thinking worker (hearts/worker.js): computer moves, the coach's sampling, pass evaluations, the moon judge.
   Messages: { id, job, S, p, lv, o } → { id, r }. */
importScripts('engine.js?v=1', 'ai.js?v=1');
const AI = self.HAI, HT = self.HT;
onmessage = e => {
  const { id, job, S, p, lv, o } = e.data;
  let r = null;
  try {
    const rng = Math.random;
    if (job === 'decide') r = AI.decide(S, p, lv, rng);
    else if (job === 'pass') r = AI.choosePass(S, p, lv, rng);
    else if (job === 'eval') { const x = AI.evalCards(S, p, Object.assign({ exact: 1, moon: 1 }, o || {})); r = { list: x.map(y => ({ c: y.c, own: y.own, obj: y.obj, sd: y.sd, n: y.n, moonMe: y.moonMe, moonOther: y.moonOther })), worlds: x.worlds }; }
    else if (job === 'passEval') {   // every candidate pass (and the one given) by simulation
      const cands = AI.passCands(S.hands[p], S.R, S.dir, (o && o.k) || 10);
      if (o && o.mine && o.mine.length === 3 && !cands.some(c => c.slice().sort().join() === o.mine.slice().sort().join())) cands.push(o.mine);
      r = cands.map(c => Object.assign({ cards: c }, AI.evalPass(S, p, c, (o && o.worlds) || 40, rng)));
    }
    else if (job === 'moon') r = AI.moonChance(S, p, (o && o.worlds) || 120, rng);
  } catch (err) { r = { err: String(err && err.stack || err) }; }
  postMessage({ id, r });
};
