// node hanafuda/tools/test-engine.js : rules and yaku tests + random playouts
const HF = require('../engine.js');
let fail = 0;
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', m, a, b); } };
const Y = (ids, o) => HF.yaku(ids, HF.opts(o));
const I = HF.ID;
eq(Y([I.crane, I.curtain, I.moon]).list.map(y => y.id), ['sanko'], 'sanko');
eq(Y([I.crane, I.curtain, I.rainman]).total, 0, 'rain 3 lights is nothing');
eq(Y([I.crane, I.curtain, I.moon, I.rainman]).list[0].id, 'ameshiko', 'ameshiko');
eq(Y([I.crane, I.curtain, I.moon, I.phoenix]).list[0].pts, 8, 'shiko');
eq(Y([I.crane, I.curtain, I.moon, I.phoenix, I.rainman]).list[0].pts, 10, 'goko');
eq(Y([I.sake, I.moon]).total, 5, 'tsukimi');
eq(Y([I.sake, I.moon, I.curtain]).total, 10, 'tsukimi+hanami');
eq(Y([I.sake, I.moon, I.rainman], { viewing: 'rain' }).total, 0, 'rain cancels viewing');
eq(Y([I.sake, I.moon], { viewing: 'off' }).total, 0, 'viewing off');
eq(Y([I.boar, I.deer, I.butterfly]).total, 5, 'isc');
eq(Y([I.boar, I.deer, I.butterfly, I.geese, I.uguisu]).total, 6, 'isc + tane');
eq(Y([I.boar, I.deer, I.butterfly, I.geese, I.uguisu], { plusExtra: true }).total, 8, 'isc+2 plus tane');
eq(Y([1, 5, 9]).total, 5, 'akatan');
eq(Y([1, 5, 9, 21, 33, 37]).total, 10 + 2, 'akatan+aotan + tan(6)');
const kasu = HF.CARDS.filter(c => c.type === 'kasu').map(c => c.id);
eq(Y(kasu.slice(0, 9)).total, 0, '9 kasu');
eq(Y(kasu.slice(0, 9).concat([I.sake])).list.map(y => y.id), ['kasu'], 'sake counts as kasu');
eq(Y(kasu.slice(0, 9).concat([I.sake]), { sakeKasu: false }).total, 0, 'sake not kasu');
eq(HF.handYaku([0, 1, 2, 3, 8, 12, 20, 24]).id, 'teshi', 'teshi');
eq(HF.handYaku([0, 1, 4, 5, 8, 9, 12, 13]).id, 'kuttsuki', 'kuttsuki');
// random playouts: invariants
const r = HF.rng(5);
let games = 0, stops = 0, draws = 0;
for (let g = 0; g < 3000; g++) {
  const o = [{}, HF.PRESETS.app, HF.PRESETS.soft][g % 3];
  let s = HF.deal(1000 + g, g & 1, o);
  let guard = 0;
  while (s.phase !== 'over') {
    const acts = HF.actions(s);
    if (!acts.length) { fail++; console.log('no actions', s.phase); break; }
    s = HF.apply(s, acts[Math.floor(r() * acts.length)]);
    const n = s.deck.length + s.hands[0].length + s.hands[1].length + s.field.length + s.caps[0].length + s.caps[1].length + (s.pending != null && s.phase.startsWith('pick') && s.phase === 'pickPlay' ? 1 : 0) + (s.phase === 'pickDraw' ? 1 : 0);
    if (n !== 48) { fail++; console.log('card count', n, s.phase); break; }
    if (++guard > 200) { fail++; console.log('loop'); break; }
  }
  games++; if (s.result.draw) draws++; else stops++;
}
console.log('games', games, 'stops', stops, 'draws', draws);
console.log(fail ? 'FAILED ' + fail : 'all ok');
process.exit(fail ? 1 : 0);
