// Warm-up pages shown before a lesson step's problems ("explain" = a board with arrows / marks and a short lesson,
// "try" = one unscored move whose correct set is computed here from the rules). Texts: tools/ramp_text.js.
const E = require('../engine.js'); E.setRule('std');
const TXT = require('./ramp_text.js');
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const L = k => { const o = TXT[k]; if (!o) throw new Error('no text ' + k); const r = {}; for (const l of LANGS) r[l] = o[l] || o.en; return r; };
const P = o => { const r = {}; for (const l in o) r[l] = '<p>' + o[l].split('\n').join('</p><p>') + '</p>'; return r; };
const I = nm => E.sqParse(nm);
function spec(o) {
  const a = Array(E.N).fill('.');
  for (const x of o.w || []) a[I(x)] = 'w'; for (const x of o.b || []) a[I(x)] = 'b';
  if (o.W) a[I(o.W)] = 'W'; if (o.B) a[I(o.B)] = 'B';
  for (const x of o.x || []) { const i = I(x), k = 'wWbB'.indexOf(a[i]); a[i] = 'xXyY'[k]; }
  return { b: a.join(''), side: o.side || 1, n: 40 };
}
const mk = (...a) => a.map(([q, c]) => [I(q) + 1, c]);
const ex = (id, s, seq, marks) => ({ k: 'explain', s, seq, marks, t: L(id + '.e.t'), body: P(L(id + '.e.b')) });
// try: ok = the names of the moves that pass `test`
function tr(id, s, test, look) {
  const pos = E.Pos.from(s), ok = pos.moves().filter(m => m !== E.PASS && test(pos, m)).map(m => E.name(pos, m));
  if (!ok.length) throw new Error('ramp try without answer: ' + id);
  if (ok.length === pos.moves().length) throw new Error('ramp try: every move is right: ' + id);
  return { k: 'try', s, ok, look: (look || []).map(q => I(q) + 1), g: L(id + '.y.g'), h: L(id + '.y.h'), y: L(id + '.y.y') };
}
const inward = (p, m) => E.RING[E.mTo(m)] < E.RING[E.mFrom(m)];
const safe = (p, m) => E.hanging(p.clone().play(m), p.turn).n === 0;
const RAMPS = {
  b_step: [
    ex('b_step', spec({ w: ['3.5', '5.21'], W: '5.16', b: ['5.4'], B: '5.1' }), null, mk(['2.3', 'ok'], ['2.4', 'ok'], ['3.4', 'ok'], ['3.6', 'ok'], ['4.6', 'x'], ['4.7', 'x'])),
    tr('b_step', spec({ w: ['4.7', '5.21', '4.13'], W: '5.16', b: ['5.4', '5.27'], B: '5.1' }), inward, ['4.7', '4.13']),
  ],
  b_throne: [
    ex('b_throne', spec({ W: '1.3', w: ['1.6', '2.9'], b: ['3.2', '4.20'], B: '5.1' }), null, mk(['T', 'ok'])),
    tr('b_throne', spec({ W: '1.5', w: ['1.2', '2.3', '2.9'], b: ['3.14', '4.20'], B: '5.1' }), (p, m) => E.mTo(m) === E.CENTER, ['T']),
  ],
  b_capture: [
    ex('b_capture', spec({ w: ['2.3', '3.2'], W: '4.15', b: ['2.2', '5.9'], B: '5.1' }), ['3.2-2.1x'], mk(['2.2', 'ng'])),
    tr('b_capture', spec({ w: ['3.7', '4.7', '2.9'], W: '4.15', b: ['3.6', '2.1', '5.9'], B: '5.20' }), (p, m) => p.capsOf(m).length > 0, ['3.6']),
  ],
  b_reloc: [
    ex('b_reloc', spec({ w: ['2.4', '3.12', '1.2'], W: '3.9', b: ['2.3', '2.5', '3.6'], B: '4.3', x: ['2.4'] }), null, mk(['2.4', 'ng'])),
  ],
  b_safe: [
    ex('b_safe', spec({ w: ['2.4', '3.12'], W: '3.9', b: ['2.3', '3.7', '4.1'], B: '4.20' }), null, mk(['2.4', 'ng'], ['2.5', 'dash'])),
    tr('b_safe', spec({ w: ['2.4', '3.12', '4.17'], W: '3.9', b: ['2.3', '3.7', '4.1', '5.20'], B: '4.20' }), safe, ['2.4']),
  ],
  b_finish: [
    ex('b_finish', spec({ W: 'T', w: ['1.1', '1.2', '1.3', '1.4', '1.5', '2.12'], b: ['3.4', '4.9', '5.3', '2.6', '3.8', '4.17'], B: '5.20' }), ['2.12-1.6'], mk(['1.6', 'ok'])),
  ],
  s_block: [
    ex('s_block', spec({ B: 'T', b: ['1.1', '1.2', '1.3', '1.4', '1.5', '2.12'], w: ['2.10', '2.1', '3.4', '4.9', '2.6', '3.8'], W: '3.17' }), ['2.10-2.11x'], mk(['1.6', 'x'], ['2.12', 'ng'])),
    tr('s_block', spec({ B: 'T', b: ['1.1', '1.2', '1.3', '1.4', '1.5', '2.10'], w: ['2.9', '3.16', '3.4', '4.9', '2.6', '3.8'], W: '4.20' }), (p, m) => { const q = p.clone().play(m); return !q.moves().some(x => E.judge(q.clone().play(x)).winner === 2); }, ['2.10']),
  ],
  s_queencap: [
    ex('s_queencap', spec({ B: 'T', b: ['1.2', '1.3', '3.10'], w: ['1.1', '2.7', '3.9'], W: '3.17' }), ['2.7-1.4x'], mk(['T', 'ng'])),
    tr('s_queencap', spec({ B: 'T', b: ['1.1', '1.3', '2.2'], w: ['1.2', '2.9', '3.4'], W: '3.17' }), (p, m) => p.capsOf(m).includes(E.CENTER), ['1.5']),
  ],
  s_win2: [
    ex('s_win2', spec({ W: '1.2', w: ['1.1', '1.3', '1.4', '1.5', '2.11'], b: ['3.4', '4.9', '5.3', '2.6', '3.8', '4.17'], B: '5.20' }), null, mk(['T', 'ok'], ['1.6', 'ok'])),
  ],
};
const UI = require('./ramp_ui.json');
module.exports = { RAMPS, UI, spec };
