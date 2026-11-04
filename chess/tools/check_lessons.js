// (tol: allowed eval gap for a guided item where every safe answer counts, e.g. any knight retreat)
// Verifies the warm-up ramps in lessons.json with the engine: legal FENs, every 'try' answer is a legal move and
// among the engine's best (or a mate when the goal is mate), marks are on real squares, all 10 languages present.
'use strict';
const E = require('../engine.js'), D = require('../lessons.json');
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
let bad = 0, n = 0;
const fail = (id, msg) => { bad++; console.log('NG', id, msg); };
const sqOk = q => /^[a-h][1-8]$/.test(q);
const txt = (id, o, k) => { for (const l of LANGS) if (!o || typeof o[l] !== 'string' || !o[l]) fail(id, `missing ${k}.${l}`); };
for (const k in D.rampUi) txt('ui', D.rampUi[k], k);
for (const s of D.steps) for (const [j, it] of (s.ramp || []).entries()) {
  const id = s.id + '#' + j; n++;
  let pos; try { pos = E.replay(it.fen, []).pos; } catch (e) { fail(id, 'bad fen'); continue; }
  if (!pos.legal().length) fail(id, 'no legal move');
  for (const [q] of it.hl || []) if (!sqOk(q)) fail(id, 'hl ' + q);
  for (const [a, b] of it.ar || []) if (!sqOk(a) || !sqOk(b)) fail(id, 'arrow');
  if (it.k === 'explain') { txt(id, it.t, 't'); txt(id, it.b, 'b'); continue; }
  txt(id, it.g, 'g'); txt(id, it.h, 'h'); txt(id, it.y, 'y');
  for (const q of it.look || []) if (!sqOk(q)) fail(id, 'look ' + q);
  const legal = new Map(pos.legal().map(m => [pos.uci(m), m]));
  for (const u of it.ok) if (!legal.has(u)) fail(id, 'illegal answer ' + u);
  const r = E.analyze(it.fen, [], 2500), vals = new Map(r.list.map(e => [pos.uci(e.m), e.v])), best = Math.max(...vals.values());
  for (const u of it.ok) if (vals.get(u) < best - (best > E.MATET ? 0 : (it.tol || 60))) fail(id, `${u}=${vals.get(u)} but best ${best}`);
  const tol = best > E.MATET ? 0 : (it.tol || 60), wrong = [...vals].filter(([u, v]) => !it.ok.includes(u) && v >= best - tol);
  if (wrong.length) fail(id, 'other moves as good: ' + wrong.map(x => x.join(':')).join(' '));
  if (best > E.MATET) { const mn = (E.MATE - best + 1) >> 1, ms = E.mate(it.fen, [], mn).filter(x => x.need).map(x => pos.uci(x.m)); for (const u of it.ok) if (!ms.includes(u)) fail(id, u + ' not a forced mate'); }
  console.log('ok', id, it.ok.join(','), 'best', best, 'depth', r.depth);
}
console.log(bad ? `${bad} problem(s)` : `all ${n} ramp items OK`);
process.exit(bad ? 1 : 0);
