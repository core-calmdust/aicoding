// senet/tools/gen_learn.js — 次の一手パズル（puzzles.json）とレッスン（lessons.json）を作る
// node tools/gen_learn.js [games=2500]
// 局面は AI 同士（Lv.14）の対局から集め、手番＝糸巻き（side 0）に正規化。最善手は深さ3の評価、次善との勝率差で易しい順に並べる。
const fs = require('fs');
const E = require('../engine.js');
const { L, UI, MSG } = require('./learn_text.js');
const { CATS, TH, RAMP } = require('./learn_themes.js');
const GAMES = +process.argv[2] || 2500;
const rng = E.mulberry32(20261107);
const r2 = x => Math.round(x * 1000) / 1000;
const pc = x => Math.round(x * 100);

function norm(s) { return s.turn === 0 ? { rule: 'std', pos: [s.pos[0].slice(), s.pos[1].slice()], turn: 0 } : { rule: 'std', pos: [s.pos[1].slice(), s.pos[0].slice()], turn: 0 }; }
const keyOf = (s, n) => E.key(s) + '#' + n;
const sq = i => { const r = Math.floor((i - 1) / 10), k = (i - 1) % 10; return { r, c: r === 1 ? 9 - k : k }; };
function contact(s) { const a = s.pos[0].filter(p => p <= 25), b = s.pos[1].filter(p => p <= 25); return a.some(p => b.some(q => q > p)) || b.some(p => a.some(q => q > p)); }
function walls(s, sd) { const b = E.board(s); let n = 0; for (let q = 1; q <= 30; q++) if (b[q] === sd && (q === 1 || b[q - 1] !== sd)) { let z = q; while (z + 1 <= 30 && b[z + 1] === sd) z++; if (z - q + 1 >= 3) n++; } return n; }
const risk = (s, side) => E.hitRisk(s, side).reduce((a, b) => a + b, 0);
function themeOf(s, n, m, ev) {
  const me = 0, after = E.apply(s, m).state, b = E.board(after);
  const k = s.pos[me].indexOf(m.from), r0 = E.hitRisk(s, me)[k], r1 = m.finish || m.water ? 0 : E.hitRisk(Object.assign(E.clone(after), { turn: 1 }), me)[after.pos[me].indexOf(m.to)] || 0;
  const hasWater = ev.some(e => e.move.water);
  if (hasWater && !m.water) return 'water';
  if (!contact(s)) return 'race';
  if (m.capture) return 'swap';
  if (m.to === 26) return 'beauty';
  if (m.finish || m.from === 26) return 'exit';
  if (r0 >= .2 && r1 <= r0 - .1) return 'escape';
  const pair = m.to <= 25 && ((b[m.to - 1] === me) || b[m.to + 1] === me);
  if (pair || walls(after, me) > walls(s, me)) return 'pair';
  const rs = ev.map(e => risk(Object.assign(E.clone(E.apply(s, e.move).state), { turn: 1 }), 0));
  if (rs[0] + .08 < Math.min(...rs.slice(1))) return 'safe';
  return null;
}
function whyOf(th, s, e0, e1, m) {
  const a = pc(e0.wp), b = pc(e1.wp);
  const after = E.apply(s, m).state;
  if (th === 'swap') return ['w.swap', { a, b, d: m.to - m.from }];
  if (th === 'pair') return [walls(after, 0) > walls(s, 0) ? 'w.wall' : 'w.pair', { a, b }];
  if (th === 'escape') { const k = s.pos[0].indexOf(m.from); return ['w.escape', { a, b, r0: pc(E.hitRisk(s, 0)[k]), r1: pc(E.hitRisk(Object.assign(E.clone(after), { turn: 1 }), 0)[after.pos[0].indexOf(m.to)] || 0) }]; }
  if (th === 'safe') return ['w.safe', { a, b, r: pc(risk(Object.assign(E.clone(after), { turn: 1 }), 0)) }];
  if (th === 'beauty') return ['w.beauty', { a, b }];
  if (th === 'exit') return [m.finish ? 'w.home' : 'w.exit', { a, b }];
  if (th === 'water') return ['w.water', { a, b }];
  if (th === 'race') return ['w.race', { a, b }];
  return ['w.gen', { a, b }];
}
function ngOf(s, e, best, th) {
  const x = pc(e.wp), a = pc(best.wp), m = e.move;
  if (m.water) return ['n.water', { x, a }];
  if (th === 'swap' && !m.capture) return ['n.noSwap', { x, a }];
  const r = pc(risk(Object.assign(E.clone(E.apply(s, m).state), { turn: 1 }), 0));
  if (r >= 25) return ['n.risk', { x, a, r }];
  return ['n.gen', { x, a }];
}
function lookOf(s, th, best) {
  const out = [];
  E.hitRisk(s, 0).forEach((v, k) => { const p = s.pos[0][k]; if (p <= 30 && v > .05) out.push(Object.assign(sq(p), { type: 'danger', text: pc(v) + '%' })); });
  if (th === 'beauty') out.push(Object.assign(sq(26), { type: 'glow' }));
  if (th === 'water') out.push(Object.assign(sq(27), { type: 'glow', color: '#4da3ff' }), Object.assign(sq(26), { type: 'glow' }));
  if (th === 'exit') [26, 28, 29, 30].forEach(i => out.push(Object.assign(sq(i), { type: 'glow' })));
  if (th === 'swap' && best.capture) out.push(Object.assign(sq(best.to), { type: 'glow', color: '#ff9b7a' }));
  return out;
}

// ---------------------------------------------------------------- the pool
const pool = new Map();
for (let g = 0; g < GAMES; g++) {
  let s = E.newGame('std', g & 1), k = 0;
  while (s.winner < 0 && k++ < 600) {
    const r = E.rollDice(rng), ms = E.legalMoves(s, r.n);
    if (ms.length >= 2 && rng() < .35) { const ns = norm(s), kk = keyOf(ns, r.n); if (!pool.has(kk)) pool.set(kk, { s: ns, n: r.n }); }
    const m = E.think(s, r.n, 14, { rng });
    s = E.apply(s, m, r.n).state;
  }
}
console.log('pool', pool.size);
const items = [];
for (const q of pool.values()) {
  const ev2 = E.evaluate(q.s, q.n, { depth: 2 });
  if (ev2.length < 2 || ev2[0].wp - ev2[1].wp < .045) continue;
  const ev = E.evaluate(q.s, q.n, { depth: 3 });
  const gap = ev[0].wp - ev[1].wp;
  if (gap < .05 || ev[0].move.from !== ev2[0].move.from) continue;
  const th = themeOf(q.s, q.n, ev[0].move, ev); if (!th) continue;
  items.push({ th, s: q.s, n: q.n, ev, gap });
}
console.log('candidates', items.length, Object.entries(items.reduce((a, x) => (a[x.th] = (a[x.th] || 0) + 1, a), {})));
const toP = (it, id) => {
  const b = it.ev[0], m = b.move;
  const ng = {}; it.ev.slice(1).forEach(e => { ng[e.move.from] = ngOf(it.s, e, b, it.th); });
  return { id, s: it.s, n: it.n, ok: [[m.from, m.to]], best: [m.from, m.to], ev: it.ev.map(e => [e.move.from, e.move.to, r2(e.wp)]), gap: r2(it.gap), why: whyOf(it.th, it.s, b, it.ev[1], m), ng, look: lookOf(it.s, it.th, m) };
};
// ---------------------------------------------------------------- puzzles
const PZ_THEMES = ['swap', 'pair', 'escape', 'safe', 'beauty', 'water', 'exit', 'race'];
const PER = 26, used = new Set();
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const byTh = {}; for (const it of shuffle(items)) (byTh[it.th] = byTh[it.th] || []).push(it);
const lessonPick = {};
for (const th of PZ_THEMES.concat(['prob'])) lessonPick[th] = (byTh[th] || []).splice(0, 7);   // 7 for the lesson (explain, try, 5 problems)
const themes = PZ_THEMES.map(th => {
  const list = (byTh[th] || []).slice(0, PER).sort((a, b) => b.gap - a.gap);
  return { id: th, cat: TH[th].cat, name: TH[th].name, desc: TH[th].desc, hint: TH[th].hint, puzzles: list.map((it, i) => toP(it, th + '-' + (i + 1))) };
});
const P = { version: 1, rule: 'std', ui: UI, msg: MSG, cats: CATS, daily: PZ_THEMES, themes };
fs.writeFileSync(__dirname + '/../puzzles.json', JSON.stringify(P));
console.log('puzzles', themes.map(t => t.id + ':' + t.puzzles.length).join(' '));

// ---------------------------------------------------------------- lessons
const marksFor = (s, th, m) => lookOf(s, th, m);
function stepOf(th) {
  const T = TH[th], picks = (lessonPick[th] || []).sort((a, b) => b.gap - a.gap);
  const step = { id: th, cat: T.cat, rule: 'std', title: T.name, tip: T.desc, body: T.body, hints: [T.hint, UI.look] };
  if (th === 'prob') {
    const s0 = { rule: 'std', pos: [[7, 12, 13, 22, 31], [5, 10, 18, 24, 31]], turn: 0 };
    step.diagram = { s: s0, marks: [Object.assign(sq(7), { type: 'danger', text: '38%' })] };
    const Q = (ja, en, zh, ko, es, fr, pt, de, hi, ar) => ({ ja, en, zh, ko, es, fr, pt, de, hi, ar });
    step.ramp = [{ k: 'explain', s: s0, n: null, seq: [], marks: [Object.assign(sq(7), { type: 'danger', text: '38%' }), { type: 'arrow', from: sq(5), to: sq(7), color: '#ff6b5b' }], t: RAMP.et, body: T.body }];
    step.problems = [
      { kind: 'choice', q: Q('2 が出る確率は？', 'The chance of a 2?', '掷出2的概率？', '2가 나올 확률은?', '¿Probabilidad de un 2?', 'Probabilité d’un 2 ?', 'Chance de um 2?', 'Chance auf eine 2?', '2 आने की संभावना?', 'احتمال الرمية 2؟'), opts: ['4/16', '6/16', '8/16', '1/16'], ans: 1, why: ['c.roll', { n: 2, m: 6 }] },
      { kind: 'choice', q: Q('5（4本とも黒）が出る確率は？', 'The chance of a 5 (all dark)?', '掷出5（全黑）的概率？', '5(모두 검정)가 나올 확률은?', '¿Probabilidad de un 5 (todo oscuro)?', 'Probabilité d’un 5 (tout sombre) ?', 'Chance de um 5 (tudo escuro)?', 'Chance auf eine 5 (alles dunkel)?', '5 (सब काली) की संभावना?', 'احتمال الـ5 (الكل داكن)؟'), opts: ['1/16', '4/16', '5/16', '6/16'], ans: 0, why: ['c.roll', { n: 5, m: 1 }] },
      { kind: 'choice', q: Q('もう一度投げられる目（1・4・5）の確率は合わせて？', 'The chance of an extra throw (1, 4 or 5)?', '可再投（1、4、5）的概率合计？', '한 번 더 던지는 눈(1·4·5)의 확률 합은?', '¿Probabilidad de tirada extra (1, 4 o 5)?', 'Probabilité d’un lancer en plus (1, 4 ou 5) ?', 'Chance de lance extra (1, 4 ou 5)?', 'Chance auf einen Extrawurf (1, 4, 5)?', 'अतिरिक्त फेंक (1, 4, 5) की कुल संभावना?', 'احتمال الرمية الإضافية (1 أو 4 أو 5)؟'), opts: ['3/16', '5/16', '6/16', '8/16'], ans: 2, why: ['c.again', {}] },
      { kind: 'choice', s: s0, marks: [Object.assign(sq(7), { type: 'danger' }), Object.assign(sq(5), { type: 'glow', color: '#ff9b7a' })], q: Q('相手の駒（5）の2マス先にいる 7 の駒が入れ替えられる確率は？', 'Your piece on 7 is two ahead of the rival on 5. Its swap chance?', '在对手（5）前2格的7号棋子被互换的概率？', '상대(5)의 2칸 앞인 7의 말이 교체될 확률은?', 'Tu pieza en 7 está dos por delante del rival en 5. ¿Probabilidad?', 'Votre pion en 7 est deux cases devant l’adversaire en 5. Probabilité ?', 'Sua peça na 7 está duas à frente do rival na 5. Chance?', 'Deine Figur auf 7 steht zwei vor dem Gegner auf 5. Chance?', '5 के विरोधी से दो आगे 7 वाली गोटी की संभावना?', 'قطعتك على 7 أمام الخصم على 5 بمربعين. الاحتمال؟'), opts: ['4/16', '6/16', '1/16', '10/16'], ans: 1, why: ['c.risk', { d: 2, m: 6 }] },
      { kind: 'choice', q: Q('相手の駒の何マス先がいちばん危険？', 'How far ahead of a rival is most dangerous?', '在对手前几格最危险？', '상대의 몇 칸 앞이 가장 위험?', '¿A cuántas casillas de un rival es más peligroso?', 'À combien de cases devant l’adversaire est-ce le plus risqué ?', 'A quantas casas de um rival é mais perigoso?', 'Wie viele Felder vor einem Gegner ist am gefährlichsten?', 'विरोधी से कितने खाने आगे सबसे ख़तरनाक?', 'كم مربعًا أمام الخصم هو الأخطر؟'), opts: ['1', '2', '3', '5'], ans: 1, why: ['c.risk', { d: 2, m: 6 }] },
    ];
    return step;
  }
  if (picks.length < 7) { console.warn('few for lesson', th, picks.length); }
  const [ex, tr, ...rest] = picks;
  const exM = ex.ev[0].move, trM = tr.ev[0].move;
  step.diagram = { s: ex.s, marks: marksFor(ex.s, th, exM) };
  step.ramp = [
    { k: 'explain', s: ex.s, n: ex.n, seq: [[exM.from, exM.to]], marks: marksFor(ex.s, th, exM).concat([{ type: 'arrow', from: sq(exM.from), to: exM.finish ? { tray: 'goal', side: 0 } : sq(exM.to), color: '#3df59a' }]), t: RAMP.et, body: T.body },
    { k: 'try', s: tr.s, n: tr.n, ok: [[trM.from, trM.to]], marks: [], look: marksFor(tr.s, th, trM), t: RAMP.tt, h: T.hint, g: RAMP.tg, y: UI.rampRetry },
  ];
  step.problems = rest.slice(0, 5).map((it, i) => Object.assign({ kind: 'move' }, toP(it, th + '-L' + i)));
  return step;
}
const LCATS = [
  { id: 'basic', name: CATS[0].name, steps: ['prob', 'swap', 'pair'] },
  { id: 'tactics', name: CATS[1].name, steps: ['escape', 'safe'] },
  { id: 'end', name: CATS[2].name, steps: ['beauty', 'water', 'exit', 'race'] },
];
const steps = LCATS.flatMap(c => c.steps).map(stepOf);
const LS = { version: 1, rule: 'std', score: { per: 20, pass: 75, hint: [16, 12], retry: 10, answer: 0 }, ui: UI, msg: MSG, cats: LCATS, steps };
fs.writeFileSync(__dirname + '/../lessons.json', JSON.stringify(LS));
console.log('lessons', steps.map(s => s.id + ':' + s.problems.length).join(' '));
