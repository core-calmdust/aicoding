// (2026-11-24 第2期・担当B) backgammon openings (backgammon/open, 3D: atlas/lessons3d.js BACKGAMMON.opening; 2D: backgammon/op.js drill).
// Every problem as the 3D table asks it (BACKGAMMON.opDecs: one problem per line of an item, the item's lines in order), checked on
// the strict criteria of claude/lesson-quality.md 第2期 ①〜⑨ and the 追N that apply:
//  ① every listed play is a legal play of the roll at that position; the stored list holds every legal play whose 0-ply value is
//    within 0.03 of the listed best at 0-ply (no strong play is left out of the judging); the answer = the best rolled-out play
//  ② (追63) the right plays (within OPB.tol of the best rollout, 20 points) — and the closest wrong rolled-out play is behind the best by more
//    than the tolerance AND by 2 standard errors of the two rollouts (else the line between right and wrong is noise); a play judged
//    on its 2-ply value only is behind the best's 2-ply value by more than the tolerance
//  ③ 3+ legal plays, 2+ wrong listed plays, the right plays at most a third of the legal plays
//  ④ the mover is the side the item teaches: an opening roll = the first move (start position, no doubles); a reply = the second
//    move, after the opponent's opening move of the item (the same opening in every line of a reply item)
//  ⑤ no two problems (all openings, the lessons' play problems) with the same position and roll
//  ⑥ within an item, the problems in the order asked do not get easier (d = the wrong plays within 0.06 of the best: near misses)
//  ⑧ ダイスン's intro: 「どちらも正解」「どれを選んでも大きな差はない」 = the plays it names are all right; 「大きな差」「ずっと上」
//    「明らかに得」= the 2nd play is 0.05+ behind; the words after each play (good / ng, every listed play) have no placeholder and
//    「同じくらい良い手がほかにも」 only when there is
//  ⑨ the 2D drill (backgammon/op.js) judges the same way (tolerance, rolled-out plays only) — the same opOk
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let BGL = null;
const bgl = () => BGL || (BGL = require(path.join(ROOT, 'backgammon/tools/load.js')));
function ctx3d() {   // the 3D texts (BGJ_OP, BGV, bgVoice, BACKGAMMON.opening …), run in a sandbox with the node engine
  const { BG, BGX } = bgl(), lines = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8').split('\n');
  const at = (re, from) => { for (let i = from || 0; i < lines.length; i++) if (re.test(lines[i])) return i; throw new Error('lessons3d.js: ' + re); };
  const a = at(/^  const fill = /), b = at(/^  const L = \(o, lang\)/), c = at(/^  const shSeed = /), d = at(/^  const rvEndOf = /), e = at(/^  }/, d + 2);
  const f = at(/^  const bgPos = /), g = at(/^  \/\* hex \(2026-11-15\)/, f);
  const src = [lines[a], lines[b], lines[c], ...lines.slice(d, e + 1), ...lines.slice(f, g)].join('\n') + '\n;({ BACKGAMMON, BGJ_OP, bgDecP, bgCodes })';
  const store = {}, window = { BG, BGX };
  return vm.runInNewContext(src, { window, BG, BGX, localStorage: { getItem: () => null }, J: (k, d) => store[k] || d, put: (k, v) => { store[k] = v; }, console });
}
// right (20 points): within the tolerance, or a rolled-out play the rollouts cannot tell from the best (behind by < 2 s.e.) — the rule of
// backgammon/op.js opRight and atlas/lessons3d.js BACKGAMMON.opening (②: 「同じくらい良い手があれば全部正解にする」)
const right = (y, b, rolled, tol) => (rolled ? y.ro : y.ply === 2) && (b.e - y.e <= tol + 1e-9 || (y.ro && b.e - y.e < 2 * Math.hypot(b.se, y.se)));
const sig = (pos, d) => pos + ':' + d.slice().sort().join('');
function verify() {
  const { BG } = bgl(), OP = JSON.parse(fs.readFileSync(path.join(ROOT, 'backgammon/openings.json'), 'utf8')), LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'backgammon/lessons.json'), 'utf8'));
  const X = ctx3d(), B = X.BACKGAMMON; B.data = { op: OP, ls: LS }; B.I = {}; B.tx = k => k;
  const out = [], tol = OP.tol, START = '0000005030000500000000002000000050300005000000000020';
  const seen = new Map();
  const dec = (s0, side) => { const s1 = side === 1 ? String(s0).slice(26) + String(s0).slice(0, 26) : String(s0); return X.bgDecP(s1); };
  LS.steps.forEach(st => (st.problems || []).forEach((P, pi) => { if (P.kind === 'play') { const p = Array.from(dec(P.pos, P.side || 0), x => x.toString(16)).join(''); seen.set(sig(p, P.dice), `lesson ${st.id} q${pi + 1}`); } }));
  // the 2D drill's judging (backgammon/op.js opSubmit): right = rolled-out (or 2-ply when nothing is rolled out) and within tol of the best
  const op2 = fs.readFileSync(path.join(ROOT, 'backgammon/op.js'), 'utf8');
  if (!/const ok = opRight\(mine, b, rolled\)/.test(op2) || !/gap <= OPB\.tol \+ 1e-9 \|\| \(mine\.ro != null && b\.ro != null && gap < 2 \* Math\.hypot\(b\.se \|\| 0, mine\.se \|\| 0\)\)/.test(op2) || !/rolled \? mine\.ro != null : mine\.ply === 2/.test(op2)) out.push({ step: '2D', q: 0, msg: '⑨ the 2D drill no longer judges as the 3D does (op.js opSubmit)' });
  for (const c of OP.cats) for (const id of c.items) {
    const it = OP.items[id], add = (q, msg) => out.push({ step: id, q, msg });
    const decs = B.opDecs(it); let prevD = -1;
    const opn = it.kind !== 'open' ? new Set(it.lines.map(l => (l.seq || [])[0] && l.seq[0].m + ':' + l.seq[0].d.join(''))) : null;
    if (opn && opn.size > 1 && /^r|^h/.test(id)) add(0, `④ the reply item mixes ${opn.size} different openings of the opponent`);
    let wd = null; try { wd = B.opening(id, 'ja'); } catch (e) { add(0, '⑧ the 3D opening fails: ' + e.message); }
    decs.forEach((x, j) => {
      const q = j + 1, a = m => add(q, m), p0 = X.bgDecP(x.pos);
      const R = x.plays.map(y => ({ m: y[0], e: y[3] != null ? y[3] : y[1], e2: y[1], ro: y[3] != null, se: y[4] || 0, ply: y[2] }));
      const rolled = R.some(y => y.ro), best = R.filter(y => !rolled || y.ro).reduce((u, v) => v.e > u.e ? v : u);
      const ok = R.filter(y => right(y, best, rolled, tol)), okM = ok.map(y => y.m);
      // ④
      if (it.kind === 'open' && !it.rq) { if (x.pos !== START) a('④ an opening roll not at the start position'); if (x.d[0] === x.d[1]) a('④ a double as the opening roll'); }
      else if (it.kind === 'open') {   // (2026-11-26) asked as the second move: the opponent's book opening, then the item's roll; a right play = the item's book play
        const sq = it.rq.seq || [], o0 = sq[0] || {}, books = new Set(it.lines.map(l => l.m));
        const opBook = Object.values(OP.items).some(y => y.kind === 'open' && y.d.join('') === (o0.d || []).join('') && y.lines.some(l => l.m === o0.m));
        if (sq.length !== 2 || o0.r !== 0 || sq[1].r !== 1 || !opBook) a('④ it.rq is not a book opening of the opponent and then the item\'s roll');
        if (!x.d || x.d.join('') !== it.d.join('') || x.d[0] === x.d[1]) a('④ it.rq rolls other dice than the item');
        if (!books.has(best.m) || okM.some(m => !books.has(m))) a(`④ a right play of it.rq is not the item's book play (${okM.join(',')})`);
        if (x.pos === START) a('④ it.rq is at the start position'); }
      else if ((x.ln.seq || []).length !== 2) a(`④ a reply ${(x.ln.seq || []).length - 1} moves after the start`);
      // ①
      const legal = BG.genPlays(p0, 0, x.d[0], x.d[1]), lk = new Map(legal.map(y => [BG.key(y.pos), y]));
      const keyOf = m => { const r = p0.slice(); for (let i = 0; i + 1 < m.length; i += 2) BG.apply(r, 0, m.charCodeAt(i) - 65, m.charCodeAt(i + 1) - 65); return BG.key(r); };
      const listed = new Set();
      R.forEach(y => { const k = keyOf(y.m); if (!lk.has(k)) a(`① ${y.m} is not a legal play of ${x.d.join('-')}`); if (listed.has(k)) a(`① ${y.m} listed twice`); listed.add(k); });
      if (x.ln.m && x.ln.m !== best.m && !okM.includes(x.ln.m)) a(`① the line's move ${x.ln.m} is not a right play (best ${best.m})`);
      { const v0 = legal.map(y => ({ k: BG.key(y.pos), v: BG.equity(BG.evalAfter(y.pos, 0)) })), vb = Math.max(...v0.filter(y => listed.has(y.k)).map(y => y.v));
        const miss = v0.filter(y => !listed.has(y.k) && y.v >= vb - 0.03); if (miss.length) a(`① ${miss.length} legal plays left out of the list are within 0.03 of the listed best at 0-ply`); }
      // ②
      const wrong = R.filter(y => !okM.includes(y.m)), wr = wrong.filter(y => y.ro).sort((u, v) => v.e - u.e)[0];
      if (wr) { const gap = best.e - wr.e, sd = 2 * Math.hypot(best.se, wr.se); if (gap <= tol + 1e-9 || gap < sd) a(`② the closest wrong play ${wr.m} is ${gap.toFixed(4)} behind (tolerance ${tol}, 2 s.e. ${sd.toFixed(4)})`); }
      const b2 = Math.max(...R.filter(y => y.ply === 2).map(y => y.e2));
      wrong.filter(y => !y.ro).forEach(y => { if (y.ply === 2 && b2 - y.e2 <= tol) a(`② ${y.m} is judged wrong on its 2-ply value only, ${(b2 - y.e2).toFixed(4)} behind`); });
      
      // ③
      if (lk.size < 3) a(`③ ${lk.size} legal plays`);
      if (wrong.length < 2) a(`③ ${wrong.length} wrong plays listed`);
      if (okM.length * 3 > lk.size) a(`③ ${okM.length} of ${lk.size} legal plays are right`);
      // ⑤
      const s = sig(x.pos, x.d); if (seen.has(s)) a(`⑤ the same position and roll as ${seen.get(s)}`); else seen.set(s, `open ${id} q${q}`);
      // ⑥
      const d = wrong.filter(y => best.e - y.e <= 0.06).length + okM.length - 1;
      if (d < prevD) a(`⑥ easier than the problem before (d ${d} after ${prevD})`); prevD = Math.max(prevD, d);
      // ⑧ the words after each play
      if (wd) { const o = wd.probs[j];
        if (/\{|undefined|NaN/.test(o.ask)) a(`⑧ the question 「${o.ask}」`);
        if (!o.hintTx || /\{|undefined|NaN/.test(o.hintTx)) a(`⑧ the hint 「${o.hintTx}」`);
        R.forEach(y => { const c0 = X.bgCodes(x.pos, y.m), u = { key: c0.key, steps: c0.moves }, rt = okM.includes(y.m);
          let t; try { t = rt ? o.good(u) : o.ng(u); } catch (e) { a(`⑧ ${y.m}: the words fail ${e.message}`); return; }
          if (!t || /\{|undefined|NaN/.test(t)) a(`⑧ ${y.m}: 「${t}」`);
          if (!rt && /^(いい線|あと少し|あと一歩|おしい)/.test(String(t).replace(/<[^>]+>/g, '').trim())) a(`追53 ${y.m}: a 0-point play opens with 「${String(t).slice(0, 12)}」`);
          { const pm = String(t).match(/約(\d+)ピップ/); if (pm && +pm[1] < 5) a(`⑧ ${y.m}: gives a hit of ${pm[1]} pips as the reason 「${t}」`); }   // (a hit of 1–4 pips is said for its tempo)
          if (rt && /ほかにも|並ぶ手|互角の手|別の動かし方でも/.test(t) && okM.length < 2) a(`⑧ ${y.m}: says another play is as good, none is 「${t}」`);
          if (B.points(o.P, u, o) !== (rt ? 20 : 0)) a(`⑨ ${y.m}: the 3D points are not ${rt ? 20 : 0}`); });
        // 追90 (the second-move problems, it.rq): the words are picked in turn from the voice's wordings — hear every play 8 times more
        // (each time the next wording) and check all that come out, not only the first
        if (it.rq) for (let rep = 0; rep < 8; rep++) R.forEach(y => {  const c0 = X.bgCodes(x.pos, y.m), u = { key: c0.key, steps: c0.moves }, rt = okM.includes(y.m);
          let t; try { t = rt ? o.good(u) : o.ng(u); } catch (e) { a(`追90 ${y.m}: the words fail ${e.message}`); return; }
          const tp = String(t || '').replace(/<[^>]+>/g, '').trim();
          if (!tp || /\{|undefined|NaN/.test(tp)) a(`追90 ${y.m}: 「${t}」`);
          if (!rt && /^(いい線|あと少し|あと一歩|おしい)/.test(tp)) a(`追90 ${y.m}: a 0-point play opens with 「${tp.slice(0, 12)}」`);
          { const pm = tp.match(/約(\d+)ピップ/); if (pm && +pm[1] < 5) a(`追90 ${y.m}: gives a hit of ${pm[1]} pips as the reason`); }
          if (rt && /ほかにも|並ぶ手|互角の手|別の動かし方でも/.test(tp) && okM.length < 2) a(`追90 ${y.m}: says another play is as good, none is`);
          { const hitOf = m => { const c = X.bgCodes(x.pos, m), q = p0.slice(); c.moves.forEach(v => BG.apply(q, 0, BG.mvFrom(v), BG.mvTo(v))); return q[26 + 25] > p0[26 + 25]; };   // (a checker sent to the opponent's bar)
            const HIT = /ヒット|打って|打てば|打った|打ち落と|バーへ送/, sn = tp.split(/(?<=[。！？])/);
            // the praise is about the player's play; after a miss, the sentences without 「きみ」 are about the green (best) play
            const about = rt ? [[y.m, sn]] : [[best.m, sn.filter(z => !/きみ/.test(z))]];
            about.forEach(([m, zs]) => { const h = hitOf(m), z = zs.find(w => HIT.test(w) && !/見送|打たれ|当たり目/.test(w));
              if (!h && z) a(`追90 ${y.m}: says ${m} hits, it hits nothing 「${z}」`); });
            if (rt && hitOf(y.m) && /打つチャンスを見送|ヒットを見送/.test(tp)) a(`追90 ${y.m}: the praise says the hit is passed up 「${tp}」`); } }); }
    });
    // ⑧ the intro's claims
    const intro = X.BGJ_OP.intro[id] || '';
    if (it.kind === 'open' && decs.length) { const x = { plays: it.plays }, R = x.plays.filter(y => y[3] != null).sort((u, v) => v[3] - u[3]), okN = R.filter(y => R[0][3] - y[3] <= tol + 1e-9).length;
      if (/どちらも正解|どれを選んでも大きな差はない|どれも大きな差がない|大きな損はない/.test(intro) && okN < 2) add(0, `⑧ the intro says several plays are as good, ${okN} is right 「${intro}」`);
      if (/大きな差がある|ずっと上|明らかに得|迷わなくていい/.test(intro) && !(R.length > 1 && R[0][3] - R[1][3] >= 0.05)) add(0, `⑧ the intro says the best is far ahead (${R.length > 1 ? (R[0][3] - R[1][3]).toFixed(4) : '-'}) 「${intro}」`);
      if (/わずかに上|僅差|少し落ちる/.test(intro) && okN > 1 && /わずかに上/.test(intro) && false) add(0, ''); }
  }
  return { out, n: Object.values(OP.items).reduce((s, it) => s + (it.kind === 'open' ? 1 : it.lines.length), 0) };
}
// the opening rolls that are also a problem of the lessons オープニング①② (one start position per roll: ⑤) — pending, not failed, until they
// are made into other problems (claude/lesson-quality.md 検証の進み具合: backgammon/open)
const PEND = new Set(['o41']);   // (2026-11-26 04:50 担当B: o21 is asked as the second move after the opponent's 65 (it.rq, rolled out with N=2592 — it.rq.N — three times, same right plays NLGF・NLYX))
   // (2026-11-26 担当B: o31 o42 o53 o61 o51 o62 o64 o65 are asked as the second move, it.rq; these 2 are still the start position — the rollouts of their candidates did not keep the same right plays when run again)
const isPend = fa => PEND.has(fa.step) && /^⑤ the same position and roll as lesson open[12] /.test(fa.msg);
module.exports = () => { const o = verify().out, p = o.filter(isPend); if (p.length && !process.env.C4_QUIET) console.log(`bgOpen: ${p.length} pending (⑤ the same board and roll as a lesson problem): ${p.map(x => x.step).join(' ')}`); return o.filter(x => !isPend(x)); };
module.exports.PEND = PEND; module.exports.isPend = isPend;
module.exports.verify = verify; module.exports.ctx3d = ctx3d;
if (require.main === module) { const r = verify(); const bad = new Set(r.out.map(o => o.step + ' ' + o.q)); r.out.forEach(o => console.log(o.step, 'q' + o.q, o.msg)); console.log(`${r.n} problems, ${r.out.length} findings`); }
