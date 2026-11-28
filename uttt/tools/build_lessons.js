// lessons.json from the candidates of tools/gen_content.js lessons (… > cand.json): per lesson a warm-up (an explained example +
// an easy try, not scored) and 5 scored problems, easy → hard (fewer legal moves first). No position is used twice (symmetries
// included). The texts are in i18n-ut*.js (ls.<id>.*); the facts behind them in ls-facts.js. node tools/build_lessons.js cand.json… > lessons.json
const E = require('../engine.js'); E.setRule('std');
const F = require('../ls-facts.js'), fs = require('fs');
const C = {}; for (const f of process.argv.slice(2)) { const d = JSON.parse(fs.readFileSync(f, 'utf8')); for (const k in d) C[k] = (C[k] || []).concat(d[k] || []); }
const ORDER = [['b_take', 'basics'], ['b_block', 'basics'], ['b_send', 'basics'], ['b_big', 'basics'], ['s_look', 'strategy'], ['s_free', 'strategy'], ['s_force2', 'strategy'], ['s_force3', 'strategy']];
const SYM = (() => { const out = []; for (let k = 0; k < 8; k++) { const map = []; for (let m = 0; m < 81; m++) { let r = E.grow(m), c = E.gcol(m); if (k & 4) [r, c] = [c, r]; if (k & 1) r = 8 - r; if (k & 2) c = 8 - c; map.push(E.mAt(r, c)); } out.push(map); } return out; })();
const symKey = s => { const pos = E.Pos.from(s); let best = null; for (const map of SYM) { const a = Array(81).fill('.'); for (let m = 0; m < 81; m++) a[map[m]] = '.xo'[pos.c[m]]; const f = pos.forced < 0 ? -1 : E.mB(map[pos.forced * 9 + 4]); const k = a.join('') + f + pos.side; if (best === null || k < best) best = k; } return best; };
const seen = new Set();
// the explained example's marks: the cell of the answer, the board to look at, a wrong move and what it allows
function explainMarks(id, P) {
  const pos = E.Pos.from(P.s), a = P.best, marks = [[a + 1, 'ok']], arrows = [], zones = [];
  if (id === 'b_take' || id === 'b_big' || id === 'b_block') zones.push([E.mB(a), 'hl']);
  if (id === 'b_big' || id === 's_free') for (const b of F.keyBoards(E, pos)) zones.push([b, 'hl']);
  if (id === 'b_send' || id === 's_look' || /^s_force/.test(id)) arrows.push([a, 'ok']);
  if (id === 'b_send' || id === 's_look') {
    const wrong = pos.moves().filter(m => m !== a).map(m => ({ m, f: F.fact(E, id, P.s, m) })).find(x => x.f.k === 'take' || x.f.k === 'lose');
    if (wrong) { arrows.push([wrong.m, 'ng']); marks.push([wrong.m + 1, 'ng']); if (wrong.f.tb != null) zones.push([wrong.f.tb, 'ng']); }
  }
  return { marks, arrows, zones };
}
const steps = [];
for (const [id, course] of ORDER) {
  const pool = (C[id] || []).filter(P => { const k = symKey(P.s); if (seen.has(k)) return false; return true; }).sort((a, b) => a.legal - b.legal);
  if (pool.length < 7) { process.stderr.write(`${id}: only ${pool.length}\n`); }
  // the warm-up: the two easiest (the example, then a try); the problems: five spread over the rest, easy → hard
  const ex = pool[0], tr = pool[1], rest = pool.slice(2);
  const probs = []; for (let i = 0; i < 5 && rest.length; i++) probs.push(rest[Math.min(rest.length - 1, Math.round(i * (rest.length - 1) / 4))]);
  const uniq = [...new Set(probs)];
  for (const P of [ex, tr, ...uniq]) seen.add(symKey(P.s));
  const em = explainMarks(id, ex);
  steps.push({ id, course,
    ramp: [{ k: 'explain', s: ex.s, ans: ex.best, marks: em.marks, arrows: em.arrows, zones: em.zones }, { k: 'try', s: tr.s, ok: tr.ok, best: tr.best }],
    problems: uniq.map(P => ({ s: P.s, ok: P.ok, best: P.best, legal: P.legal })) });
}
const old = (() => { try { return JSON.parse(fs.readFileSync(__dirname + '/../konane-rampui.json', 'utf8')); } catch (e) { return null; } })();
process.stdout.write(JSON.stringify({ version: 1, steps, rampUi: old }) + '\n');
