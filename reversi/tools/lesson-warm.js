// Lesson warm-up steps (stepwise teaching before the 5 scored problems of a lesson).
//   node tools/lesson-warm.js build   — read tools/lesson-warm.json (steps as move sequences from the start + texts),
//                                       replay every sequence (so each position is reachable), verify, write lessons.json[*].warm
//   node tools/lesson-warm.js check   — verify the warm-up steps already in lessons.json (default)
//   node tools/lesson-warm.js facts   — print the facts of every step (for writing the texts)
// Checks per step: the move sequence replays legally to exactly these cells / side to move; the side to move has 2+ moves;
// the answer is legal and the engine's unique best move (exact solve at <= 18 empties, else a 3 s search) by >= 3 discs;
// on guided steps the answer is also the unique best of the board aid the player sees (so the example is obvious);
// concept marks / arrows point at real squares; every language has every text.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const DIR = path.join(__dirname, '..');
const raw = zlib.gunzipSync(fs.readFileSync(path.join(DIR, 'weights.bin.gz')));
const E = require(path.join(DIR, 'engine.js')); E.setWeights(new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), 30);
const { legal, play, flips, start } = require('./eng-lite.js');
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const CN = [0, 7, 56, 63];
const nm = q => 'abcdefgh'[q & 7] + ((q >> 3) + 1), sq = s => 'abcdefgh'.indexOf(s[0]) + (+s.slice(1) - 1) * 8;
const nb = q => { const r = q >> 3, c = q & 7, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && rr < 8 && cc >= 0 && cc < 8) o.push(rr * 8 + cc); } return o; };
const front = (c, s) => { let n = 0; for (let q = 0; q < 64; q++) if (c[q] === s && nb(q).some(y => !c[y])) n++; return n; };
const region = (c, q) => { const seen = new Set([q]), st = [q]; while (st.length) { const x = st.pop(); for (const y of nb(x)) if (!c[y] && !seen.has(y)) { seen.add(y); st.push(y); } } return seen.size; };
function isWedge(c, q, s) { if (CN.includes(q)) return false; const r = q >> 3, k = q & 7; let a = null; if (r === 0 || r === 7) a = [q - 1, q + 1]; else if (k === 0 || k === 7) a = [q - 8, q + 8]; return !!a && a.every(x => c[x] === 3 - s); }
// the same facts the page computes for its board aids (index.html warmFacts)
function facts(c, s) {
  const op = 3 - s, ms = legal(c, s), opL = new Set(legal(c, op)), out = {};
  for (const m of ms) {
    const f = flips(c, m, s), n = play(c, m, s), seen = new Set();
    for (const q of f) for (const y of nb(q)) if (!n[y]) seen.add(y);
    const ol = legal(n, op);
    out[m] = { flips: f, open: seen.size, oM: ol.length, give: ol.filter(q => CN.includes(q) && !opL.has(q)), front: front(n, s), region: region(c, m), reserve: !opL.has(m), wedge: isWedge(c, m, s), corner: CN.includes(m) };
  }
  return out;
}
// value of the aid the player sees on a guided step (smaller = better), or null when the aid is a label, not a number
const AIDV = { mob: f => f.oM, pass: f => f.oM, open: f => f.open, front: f => f.front, region: f => (f.region % 2 ? 0 : 1) };
function replay(mv) {
  let c = start(), s = 1;
  for (const m of mv.match(/../g) || []) {
    if (!legal(c, s).length) s = 3 - s;
    const q = sq(m); if (!flips(c, q, s).length) throw new Error('illegal move ' + m + ' in ' + mv);
    c = play(c, q, s); s = 3 - s;
  }
  if (!legal(c, s).length) s = 3 - s;
  return { c, s };
}
function score(c, s) {
  E.clearTT(); const e = c.filter(x => !x).length, ex = e <= 18;
  const r = ex ? E.analyze(c, s, { time: 1e9, exact: 64 }) : E.analyze(c, s, { time: 3000 });
  const o = {}; for (const x of r) o[x.move] = ex ? Math.round(x.score) : +x.score.toFixed(1); return { sc: o, ex };
}
function verify(lid, st, k, txt) {
  const errs = [], c = st.cells.split('').map(Number), s = st.toMove;
  if (st.mv) { const r = replay(st.mv); if (r.c.join('') !== st.cells || r.s !== s) errs.push('replay mismatch'); }
  const ms = legal(c, s); if (ms.length < 2) errs.push('fewer than 2 moves');
  for (const q of Object.keys(st.marks || {}).map(Number)) if (q < 0 || q > 63) errs.push('bad mark');
  for (const a of st.arrows || []) if (a.some(q => q < 0 || q > 63)) errs.push('bad arrow');
  if (st.t === 'concept') { if (!txt || !LANGS.every(l => txt[l] && txt[l][st.k])) errs.push('concept text missing ' + st.k); return { errs }; }
  if (!ms.includes(st.ans)) { errs.push('answer not legal'); return { errs }; }
  const { sc, ex } = score(c, s), best = Math.max(...ms.map(m => sc[m])), bs = ms.filter(m => sc[m] === best);
  const gap = best - Math.max(...ms.filter(m => m !== st.ans).map(m => sc[m]));
  if (bs.length !== 1 || bs[0] !== st.ans) errs.push('engine best is ' + bs.map(nm) + ', not ' + nm(st.ans));
  else if (gap < 3) errs.push('margin only ' + gap);
  const F = facts(c, s);
  if (st.t === 'guided') {
    const f = AIDV[st.aid];
    if (f) { const v = ms.map(m => f(F[m])), mn = Math.min(...v); if (f(F[st.ans]) !== mn || v.filter(x => x === mn).length !== 1) errs.push('aid ' + st.aid + ' does not single out the answer'); }
    if (st.aid === 'corner' && !F[st.ans].corner && F[st.ans].give.length) errs.push('corner aid: answer gives a corner');
    if (st.aid === 'wedge' && !F[st.ans].wedge) errs.push('wedge aid: answer is no wedge');
    if (st.aid === 'reserve' && (F[st.ans].reserve || F[st.ans].give.length)) errs.push('reserve aid: answer is a reserve / gives a corner');
    if (st.aid === 'cwait' && (F[st.ans].corner || F[st.ans].give.length)) errs.push('cwait aid: answer takes / gives a corner');
  }
  return { errs, sc, ex, gap, F, ms };
}
const mode = process.argv[2] || 'check';
const LF = path.join(DIR, 'lessons.json');
const data = JSON.parse(fs.readFileSync(LF, 'utf8'));
if (mode === 'build' || mode === 'facts') {
  const spec = JSON.parse(fs.readFileSync(path.join(__dirname, 'lesson-warm.json'), 'utf8'));
  let bad = 0;
  for (const lid in spec.lessons) {
    const L = data.lessons.find(x => x.id === lid); if (!L) throw new Error('no lesson ' + lid);
    const steps = spec.lessons[lid].steps.map(x => {
      const { c, s } = replay(x.mv), o = { t: x.t, aid: x.aid, cells: c.join(''), toMove: s, mv: x.mv };
      if (x.ans) o.ans = sq(x.ans);
      if (x.k) o.k = x.k;
      if (x.marks) { o.marks = {}; for (const q in x.marks) o.marks[sq(q)] = x.marks[q]; }
      if (x.arrows) o.arrows = x.arrows.map(a => a.map(sq));
      return o;
    });
    const txt = spec.lessons[lid].text;
    steps.forEach((st, k) => {
      const r = verify(lid, st, k, txt);
      if (mode === 'facts') {
        const c = st.cells.split('').map(Number), F = facts(c, st.toMove);
        console.log(`${lid}#${k} ${st.t} ${st.aid} ${st.toMove === 1 ? 'Black' : 'White'} to move, ans ${st.ans !== undefined ? nm(st.ans) : '-'}; opp moves now ${legal(c, 3 - st.toMove).map(nm)}; my front ${front(c, st.toMove)}`);
        for (const m of legal(c, st.toMove)) { const f = F[m]; console.log(`   ${nm(m)}${r.sc ? ' sc ' + r.sc[m] : ''} flips ${f.flips.map(nm)} open ${f.open} oppMoves ${f.oM} front ${f.front} region ${f.region}${f.reserve ? ' RES' : ''}${f.wedge ? ' WEDGE' : ''}${f.corner ? ' CORNER' : ''}${f.give.length ? ' GIVES ' + f.give.map(nm) : ''}`); }
      }
      if (r.errs.length) { bad++; console.log('BAD', lid, k, r.errs.join('; ')); }
    });
    if (mode === 'build') {
      L.warm = steps;
      for (const l of LANGS) { if (!txt[l]) throw new Error('missing language ' + l + ' in ' + lid); L.text[l].warm = txt[l]; }
    }
  }
  if (mode === 'build') { if (bad) { console.log('not written:', bad, 'bad steps'); process.exit(1); } fs.writeFileSync(LF, JSON.stringify(data)); console.log('written', LF); }
  else console.log('bad', bad);
} else {
  let n = 0, bad = 0;
  for (const L of data.lessons) (L.warm || []).forEach((st, k) => {
    n++; const txt = {}; for (const l of LANGS) txt[l] = L.text[l] && L.text[l].warm;
    const r = verify(L.id, st, k, txt);
    if (r.errs.length) { bad++; console.log('BAD', L.id, k, r.errs.join('; ')); }
    else console.log('ok ', L.id, k, st.t, st.aid, st.ans !== undefined ? nm(st.ans) + ' (' + (r.ex ? 'exact' : 'search') + ', margin ' + (+r.gap.toFixed(1)) + ')' : '');
  });
  console.log('checked', n, 'bad', bad); if (bad) process.exit(1);
}
