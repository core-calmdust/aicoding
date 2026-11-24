// (2026-11-24 担当A, claude/lesson-quality.md 追42・追20) 詰めチェッカー: the words after a move off the solution.
// Every puzzle of 2 moves or more in checkers/puzzles.json (the 10 themes and the old slots still shown for past dailies) × every wrong
// first move the page plays on (not the answer set, not a blunder taken back: checkers/app.js pzBlunder) × EVERY reply of the defender:
//   - the class of checkers/pzwhy.js why() against the board recomputed here (pieces taken = the jumped squares that held the
//     attacker's pieces, crowned = a man landing on its last row, flee = the moved piece could be jumped before and not after, king /
//     move by the piece) and "only" = the defender's legal move count is 1;
//   - reach / noreach from the solver (checkers/tools/wasm.js puzzle(): the attacker's own moves left, the gain still missing);
//   - the words in the 14 languages: every class present, {c} {n} {g} filled with the board's numbers, no praise (追20), チェッカニ's
//     3D words plain (no です・ます), gain puzzles speak of the gain;
//   - the pages use it: atlas/puzzles.js ckMoved no longer says pz.stray / CA.mid after a wrong move, checkers/app.js puzzleMove no
//     longer says pz.stray, both load checkers/pzwhy.js (atlas/lazy.js · checkers/index.html).
//   - 追58: the words with a number that can be 1 (cap1 / reachG1, CKX.mid) have no plural noun after it.
// Usage: node tools/lesson-verify-ckstray.js [--quick]   (lesson-verify.js checkers calls verify())
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const KEYS = ['cap', 'capK', 'crown', 'flee', 'king', 'move', 'only', 'reach', 'noreach', 'reachG', 'noreachG'];
const PRAISE = /いい調子|すごい|ナイス|お見事|Nice|Great|Well done|不错|不錯|좋아|¡Bien|Bravo|Muito bem|Gut gemacht|Отлично|Harika|Bagus|शाबाश|أحسنت/;
const lead = (q, me) => q.count(me) - q.count(3 - me);
function verify(opt) {
  opt = opt || {};
  const W = opt.W || require(path.join(ROOT, 'checkers/pzwhy.js'));
  const ck = opt.ck || require(path.join(ROOT, 'checkers/tools/wasm.js')).loadSync(), E = ck.E;
  const out = [], add = (step, q, msg) => out.push({ step, q, msg });
  // ---- the words
  for (const lang of LANGS) for (const k of KEYS) if (!(W.T[lang] && W.T[lang][k])) add('words', lang, `追42 ${lang} has no ${k}`);
  for (const k of KEYS) if (!(W.OWN.ja && W.OWN.ja[k] && W.OWN.ja[k].length)) add('words', 'ja@crab', `追42 チェッカニ has no ${k}`);
  const allTexts = [...LANGS.flatMap(l => Object.values(W.T[l] || {})), ...Object.values(W.OWN.ja || {}).flat()];
  for (const s of allTexts) if (PRAISE.test(s)) add('words', '-', `追20 praise in the words after a wrong move: ${s}`);
  for (const s of Object.values(W.OWN.ja || {}).flat()) if (/です|ます|でした|ました/.test(s)) add('words', 'ja@crab', `チェッカニ speaks politely: ${s}`);
  for (const lang of LANGS) {
    const L = W.T[lang] || {};
    for (const k of ['cap', 'capK']) if (L[k] && !/\{c\}/.test(L[k])) add('words', lang, `${k} does not say the count {c}`);
    for (const k of ['reach', 'noreach', 'reachG', 'noreachG']) if (L[k] && !/\{n\}/.test(L[k])) add('words', lang, `${k} does not say the moves left {n}`);
    for (const k of ['reachG', 'noreachG']) if (L[k] && !/\{g\}/.test(L[k])) add('words', lang, `${k} does not say the gain {g}`);
    for (const k of ['cap1', 'capK1', 'reachG1', 'noreachG1']) if (L[k] && !L[k.slice(0, -1)]) add('words', lang, `${k} without ${k.slice(0, -1)}`);
    for (const k of ['reachG1', 'noreachG1']) if (L[k] && !/\{n\}/.test(L[k])) add('words', lang, `${k} does not say the moves left {n}`);
  }
  // ---- the pages
  const pz = fs.readFileSync(path.join(ROOT, 'atlas/puzzles.js'), 'utf8'), a0 = pz.indexOf('async function ckMoved('), a1 = pz.indexOf('\n    }\n', a0);
  const body = pz.slice(a0, a1);
  if (a0 < 0) add('pages', '-', 'atlas/puzzles.js has no ckMoved');
  else {
    if (/B\.tx\('pz\.stray'/.test(body)) add('pages', '3D', '追42 ckMoved still says pz.stray after a wrong move');
    if (!/CheckersPzWhy/.test(body)) add('pages', '3D', '追42 ckMoved does not use CheckersPzWhy');
  }
  if (!/async function ckStray\(/.test(pz) || /function ckStray[\s\S]{0,1500}CA\.mid/.test(pz.slice(pz.indexOf('async function ckStray('), pz.indexOf('async function ckStray(') + 1500))) add('pages', '3D', '追20 ckStray missing or says CA.mid (praise) after a wrong move');
  // 追58: a number that can be 1 followed by a plural noun (「1 moves left」): チェッカニ's CKX.mid (the moves left after a right move, 1 at the end)
  { const c0 = pz.indexOf('  const CKX = {'), blk = pz.slice(c0, pz.indexOf('\n  };', c0));
    for (const m of blk.matchAll(/mid: '([^']*)'/g)) if (/\{n\} (moves|jugadas|coups|lances|Züge|Zügen|ходов|चालें)/.test(m[1])) add('pages', '3D', `追58 CKX.mid puts a plural noun after {n} (1 at the end): ${m[1]}`);
    if (c0 < 0) add('pages', '3D', 'atlas/puzzles.js has no CKX'); }
  const lazy = fs.readFileSync(path.join(ROOT, 'atlas/lazy.js'), 'utf8');
  if (!/"checkers": \[[^\]]*"\.\.\/checkers\/pzwhy\.js\?v=\d+"/.test(lazy)) add('pages', '3D', 'atlas/lazy.js does not load ../checkers/pzwhy.js for checkers');
  const app = fs.readFileSync(path.join(ROOT, 'checkers/app.js'), 'utf8'), b0 = app.indexOf('async function puzzleMove('), b1 = app.indexOf('\nfunction playMove2', b0), ab = app.slice(b0, b1);
  if (/t\('pz\.stray'\)/.test(ab)) add('pages', '2D', '追42 puzzleMove still says pz.stray after a wrong move');
  if (!/CheckersPzWhy/.test(ab)) add('pages', '2D', '追42 puzzleMove does not use CheckersPzWhy');
  if (!/<script src="pzwhy\.js\?v=\d+"><\/script>/.test(fs.readFileSync(path.join(ROOT, 'checkers/index.html'), 'utf8'))) add('pages', '2D', 'checkers/index.html does not load pzwhy.js');
  // ---- every puzzle × wrong first move × reply
  const D = opt.data || JSON.parse(fs.readFileSync(path.join(ROOT, 'checkers/puzzles.json'), 'utf8'));
  const jobs = [];
  D.themes.forEach(T => T.puzzles.forEach((P, j) => jobs.push({ id: `${T.id}-${j}`, P, g: P.g || T.g || 0 })));
  for (const [k, P] of Object.entries(D.old || {})) { const T = D.themes.find(x => k.startsWith(x.id + '-')); jobs.push({ id: 'old ' + k, P, g: P.g || (T && T.g) || 0 }); }
  const st = { puzzles: 0, wrong: 0, replies: 0, out: 0, reach: 0, noreach: 0, k: {} };
  for (const J of jobs) {
    const { P, g } = J; if (!(P.n >= 2)) continue;
    if (opt.quick && st.puzzles >= opt.quick) break;
    st.puzzles++;
    const start = E.Pos.from(P.s), me = start.turn, base = lead(start, me), n = P.n;
    const reached = q => q.status() === -1 || (g > 0 && !q.hasCaps() && lead(q, me) - base >= g);
    const L = ck.puzzle(P.s, [], n, false, g, base) || [], good = L.filter(x => x.need > 0 && x.need <= n);
    const coop = (q, k, bud) => {   // = checkers/app.js pzCoop
      for (const d of q.moves()) { if (--bud.n < 0) return null; const r = q.clone().play(d); if (r.status() === -1) continue;
        for (const a of r.moves()) { if (--bud.n < 0) return null; const z = r.clone().play(a); if (reached(z)) return true; if (k > 1) { const x = coop(z, k - 1, bud); if (x !== false) return x; } } }
      return false;
    };
    const strayAt = (pre, pos0, nl, L0) => { const good = L0.filter(x => x.need > 0 && x.need <= nl);
    for (const m of pos0.moves()) {
      const e = L0.find(x => x.m === m); if (e && e.need > 0 && e.need <= nl) continue;   // a correct move
      const mid = pos0.clone().play(m); if (reached(mid)) continue;
      // = pzBlunder (taken back at once, not played on)
      if (mid.status() !== 0) continue;
      if (mid.moves().some(x => mid.clone().play(x).status() === -1)) continue;
      if (mid.hasCaps() && good.length && good.every(x => !pos0.clone().play(x.m).hasCaps())) continue;
      if (nl - 1 >= 1 && nl - 1 <= 2 && coop(mid, nl - 1, { n: 200000 }) === false) continue;
      st.wrong++;
      for (const r of mid.moves()) {
        st.replies++;
        const w = W.why(E, mid, r), f = E.mFrom(r), t = E.mTo(r), cap = E.mCap(r), after = mid.clone().play(r);
        // the board, recomputed
        const own = mid.side ? mid.b : mid.w;   // the attacker's pieces in mid (the defender is mid.side)
        const took = E.bitsOf(cap).filter(i => (own >>> i) & 1).length, man = !((mid.k >>> f) & 1), row = E.RC[t][0], crowned = man && row === (mid.side ? 0 : 7);
        const q = mid.clone(); q.side ^= 1; const was = q.caps().some(x => (E.mCap(x) >>> f) & 1), still = after.caps().some(x => (E.mCap(x) >>> t) & 1);
        const want = cap ? (crowned ? 'capK' : 'cap') : crowned ? 'crown' : was && !still ? 'flee' : man ? 'move' : 'king';
        if (w.k !== want) add(J.id + (pre.length ? ' step2' : ''), st.replies, `追42 reply ${f + 1}-${t + 1} after ${E.mFrom(m) + 1}-${E.mTo(m) + 1}: said ${w.k}, the board is ${want}`);
        if (cap && w.c !== took) add(J.id, st.replies, `追42 reply ${f + 1}-${t + 1}: said ${w.c} pieces taken, the board ${took}`);
        if (!!w.only !== (mid.moves().length === 1)) add(J.id, st.replies, `追42 reply ${f + 1}-${t + 1}: "only" is ${!!w.only}, the defender has ${mid.moves().length} moves`);
        st.k[w.k] = (st.k[w.k] || 0) + 1;
        const left = nl - 1;
        if (after.status() !== 0 || left <= 0) { st.out++; continue; }
        const goal = g ? Math.max(1, g - (lead(after, me) - base)) : 0;
        const R = ck.puzzle(P.s, [...pre, m, r], left, false, goal, base) || [], reach = R.some(x => x.need > 0 && x.need <= left);
        reach ? st.reach++ : st.noreach++;
        // the words built for this reply: the numbers of the board, reach / noreach, the gain when it is a gain puzzle
        for (const lang of ['ja', 'en', 'ko']) {
          const s = W.say(lang, w, reach, left, g, null, 0);
          if (cap && !s.includes(String(w.c)) && !(w.c === 1 && (W.T[lang] || {})[w.k + '1'])) add(J.id, st.replies, `${lang} words miss the count ${w.c}: ${s}`);
          if (!s.includes(String(left))) add(J.id, st.replies, `${lang} words miss the moves left ${left}: ${s}`);
          if (g > 0 && !s.includes(String(g)) && !(g === 1 && (W.T[lang] || {})[(reach ? 'reach' : 'noreach') + 'G1'])) add(J.id, st.replies, `${lang} words of a gain puzzle miss the gain ${g}: ${s}`);
          const exp = W.text(lang, (reach ? 'reach' : 'noreach') + (g > 0 ? 'G' : ''), { c: w.c, n: left, g, j: 0 });
          if (!s.endsWith(exp)) add(J.id, st.replies, `${lang} reach words wrong (solver: ${reach}): ${s}`);
        }
        const s3 = W.say('ja', w, reach, left, g, W.OWN.ja, st.replies);
        if (!s3.includes(String(left)) || (cap && !s3.includes(String(w.c))) || PRAISE.test(s3)) add(J.id, st.replies, `ja@crab words wrong: ${s3}`);
      }
    }
    };
    strayAt([], start, n, L);
    if (n >= 3 && P.answer != null && start.moves().includes(P.answer)) {   // step 2 of the solution: after the answer and each longest resistance
      const a1 = start.clone().play(P.answer), DL = ck.puzzle(P.s, [P.answer], n - 1, true, g, base) || [];
      const sc = e => e.need === 0 ? 99 : e.need < 0 ? 50 : e.need, top = Math.max(-1, ...DL.map(sc));
      for (const d of DL.filter(e => sc(e) === top).map(e => e.m)) { const p2 = a1.clone().play(d); if (reached(p2) || p2.status() !== 0) continue; st.step2 = (st.step2 || 0) + 1;
        const goal2 = g ? Math.max(1, g - (lead(p2, me) - base)) : 0; strayAt([P.answer, d], p2, n - 1, ck.puzzle(P.s, [P.answer, d], n - 1, false, goal2, base) || []); }
    }
  }
  return { out, st };
}
module.exports = { verify };
if (require.main === module) {
  const t0 = Date.now(), { out, st } = verify({ quick: process.argv.includes('--quick') ? 20 : 0 });
  console.log(JSON.stringify(st), ((Date.now() - t0) / 1000).toFixed(1) + 's');
  out.slice(0, 40).forEach(o => console.log('NG', o.step, o.q, o.msg));
  console.log(out.length ? `NG ${out.length}` : 'OK');
  process.exit(out.length ? 1 : 0);
}
