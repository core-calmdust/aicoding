// node sim.js <repo> <game> <lvA> <lvB> <games> <seed> → {wa, wb, dr}
const [,, R, G, A, B, N, SD] = process.argv; let seed = (+SD || 1) * 100003;
const E = require(R + '/' + G + '/engine.js');
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
function carrom(lv, aFirst) { let s = E.newBoard({ first: 0 }), n = 0;
  while (!s.over && n < 400) { const p = s.turn, sh = E.think(s, lv[p], rnd()), real = E.perform(sh, lv[p], rnd()); s = E.resolve(s, E.simulate(s, p, real)).s; n++; }
  return s.over ? s.winner : -1; }
function crokinole(lv) { let s = E.newRound({ first: 0, mode: 'r4' }), n = 0;
  while (!s.over && n < 400) { if (s.roundOver) { s = E.nextRound(s); continue; } const p = s.turn, sh = E.think(s, lv[p], rnd()), real = E.perform(sh, lv[p], rnd()); s = E.resolve(s, E.simulate(s, p, real)).s; n++; }
  return s.over ? s.winner : -1; }
function botao(lv) { let s = E.newMatch({ first: 0, goals: 0, half: 50 }), n = 0;
  while (!s.over && n < 500) {
    if (s.pk) return -1;   // (level in normal time: a shoot-out counts as a draw here)
    const p = s.pos;
    if (E.canPlace(s) && !s.placed) { s = E.clone(s); s.placed = true; const q = E.placeFor(E.clone(s), lv[p], rnd()); if (q) E.setTaker(s, q.x, q.y); }
    let mv = E.think(E.clone(s), lv[p], rnd());
    if (mv && mv.declare) { s = E.clone(s); s.shot = true; const d = 1 - p, k = E.keeperFor(E.clone(s), d, lv[d], rnd()); E.setKeeper(s, d, k.x, k.y); mv = E.think(E.clone(s), lv[p], rnd()); if (mv && mv.declare) mv = null; }
    if (!mv || mv.i == null) return -2;
    const move = E.perform(mv, lv[p], rnd()), r = E.resolve(s, E.simulate(s, move));
    if (!r.s.goals) r.s.clock = Math.min(r.s.halfLen, (s.clock || 0) + 1);
    s = r.s; n++;
    if (!s.over && !s.goals && s.clock >= s.halfLen) { const h = E.timeUp(s).s; if (!h.over) h.clock = 0; s = h; }
  }
  return s.over ? (s.winner == null ? -1 : s.winner) : -1; }
function hockey(lv) { const s = E.newMatch({ target: 5, first: 0, speed: 1.2 }), mem = [{}, {}], dt = 1 / 60; let t = 0;
  while (s.over < 0 && t < 60 * 60 * 6) { E.step(s, dt, [E.aiTarget(s, 0, lv[0], mem[0], dt), E.aiTarget(s, 1, lv[1], mem[1], dt)]); t++; }
  return s.over >= 0 ? s.over : -1; }
const F = { carrom, crokinole, botao, hockey }[G];
let wa = 0, wb = 0, dr = 0, bad = 0; const t0 = Date.now();
for (let g = 0; g < +N; g++) { const aFirst = g % 2 === 0, lv = aFirst ? [+A, +B] : [+B, +A]; const w = F(lv, aFirst); if (w === -2) bad++; if (w < 0) dr++; else if ((w === 0) === aFirst) wa++; else wb++; }
console.log(JSON.stringify({ G, A: +A, B: +B, wa, wb, dr, bad, ms: Date.now() - t0 }));
