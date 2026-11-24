// (2026-11-24 第2期・担当B) reversi openings (reversi/open, 3D: atlas/lessons3d.js REVERSI.opening; 2D: reversi/opcourse.js).
// The strict ①〜⑨ and 追1〜 of every practice problem of every named line, as the 3D draws them (ks: up to 5 positions of the line,
// from 4 moves before where it leaves its parent line), report only for now (no line is verified yet: RVO_DONE).
//  ① the answer (the line's next move) is legal and the engine's best in the stored values (opcourse-evals.json, 1.5 s, book values
//    where the book has them) and again in a second, shorter search (--deep: 0.3 s; 追4 / 追26: without --deep ①② are said unchecked)
//  ② every other move scores 12 points or less (REVERSI.points: 14 − 2.5 × the discs below the best) in both searches
//  ③ 3+ legal moves  ④ the line replays legally and the position is on it
//  ⑤ 4+ squares (the 8 symmetries) from every other board the game shows (lessons, warm-ups, puzzles, the other lines' problems),
//    追1 not a position of the study line just played on the board (the answer was shown a moment before)
//  ⑥ easy → hard in the order asked (d: the moves within 2 discs of the best, then the legal moves)
//  ⑦⑧ リバガメ's words (rvOpJa) for every legal move: a placeholder, a wrong move called wrong though the engine has it as good
//    as the answer (within 0.5 discs), the corner / X / C / openness / opponent's-moves claims on the board
const path = require('path'), fs = require('fs'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const RVO_DONE = new Set([]);   // (filled from reversi/opcourse-probs.json: a line with 5+ problems off the line is verified)
let X0 = null, ENG = null;
function rx() {
  if (X0) return X0; const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  const sl = (a, b) => src.slice(src.indexOf(a), src.indexOf(b)), line = a => src.slice(src.indexOf(a)).split('\n')[0] + '\n';
  X0 = vm.runInNewContext(line('  const fill = ') + line('  const L = (o, lang)') + line('  const shSeed = ') + line('  const shPerm = ') + 'const NC = {};\n' + sl('  const RV_TABS = ', '  const REVERSI = {') + '\n;({ RV_TABS, rvAfter, rvSq, rvLegal, rvFlips, rvOpJa, rvOpVoice, rvOpFacts, rvReplyMob, RV_ASKO })', {});
  return X0;
}
function eng() {
  if (ENG) return ENG; const zlib = require('zlib'), D = path.join(ROOT, 'reversi'), E = require(path.join(D, 'engine.js'));
  const raw = zlib.gunzipSync(fs.readFileSync(path.join(D, 'weights.bin.gz'))); E.setWeights(new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2), 30); E.setBook(fs.readFileSync(path.join(D, 'book.bin')));
  const sqn = q => 'abcdefgh'[q & 7] + ((q >> 3) + 1);
  ENG = (pos, ms) => { const [cs, tm] = pos.split(':'); E.clearTT && E.clearTT(); return E.analyze(cs.split('').map(Number), +tm, { time: ms, exact: 16 }).sort((a, b) => b.score - a.score).map(x => [sqn(x.move), Math.round(x.score * 10) / 10]); };
  return ENG;
}
const SY = []; for (let t = 0; t < 8; t++) { const m = []; for (let q = 0; q < 64; q++) { let r = q >> 3, c = q & 7; if (t & 1) c = 7 - c; if (t & 2) r = 7 - r; if (t & 4) [r, c] = [c, r]; m.push(r * 8 + c); } SY.push(m); }
const dist = (a, b) => { let best = 99; for (const m of SY) { let n = 0; for (let q = 0; q < 64 && n < best; q++) if (a[q] !== b[m[q]]) n++; best = Math.min(best, n); } return best; };
const pts = (ev, m) => { const sc = new Map(ev), best = Math.max(...ev.map(x => x[1])); return sc.has(m) ? Math.max(0, Math.min(14, Math.round(14 - 2.5 * (best - sc.get(m))))) : 0; };
function steps() {   // = REVERSI.load + REVERSI.opening: the lines in the 3D's order and the positions each one asks
  const X = rx(), O = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/openings.json'), 'utf8')), by = new Map(O.sets.map(x => [x.id, x])), st = [];
  X.RV_TABS.forEach(id => { const s = by.get(id); if (s) s.lines.forEach(ln => st.push({ set: s, ln })); });
  for (const s of st) { const key = s.ln.moves, mv = key.match(/../g), n = mv.length;
    const parent = st.filter(x => x.ln.moves.length < key.length && key.startsWith(x.ln.moves)).reduce((a, x) => !a || x.ln.moves.length > a.length ? x.ln.moves : a, '');
    const d = parent ? parent.length / 2 : 1, c = []; for (let k = Math.max(1, d - 4); k < n; k++) c.push(k);
    s.mv = mv; s.ks = c.length <= 5 ? c : [...new Set([0, 1, 2, 3, 4].map(j => c[Math.round(j * (c.length - 1) / 4)]))]; }
  return st;
}
function poolCheck(opt, ST, pool, add) {   // the verified lines: the 5 problems off the line (reversi/opcourse-probs.json)
  const X = rx(), OPP = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/opcourse-probs.json'), 'utf8')), sqn = q => 'abcdefgh'[q & 7] + ((q >> 3) + 1);
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), oc = fs.readFileSync(path.join(ROOT, 'reversi/opcourse.js'), 'utf8');
  // ⑥ ⑨ both take the pool's first 5 in order and score the same way
  if (!src.includes("probs: (this.OPP[key] || []).length >= 5 ? this.OPP[key].slice(0, 5).map((P, i) =>") || !src.includes("rvOpJa(o, name, i, V, true)")) add('-', -1, '⑥⑨ the 3D does not ask the verified pool in order');
  if (!oc.includes("const poolOf = moves => (OPP[moves] || []).length >= 5 ? OPP[moves].slice(0, 5) : null;") || !oc.includes("return { pts: Math.max(0, Math.min(14, Math.round(14 - 2.5 * d))), best: P.best,") || !oc.includes("if (u === P.best) return { pts: 20,")) add('-', -1, '⑥⑨ the 2D does not ask / score the verified pool like the 3D');
  const shown = []; ST.forEach(s => { for (let k = 0; k <= s.mv.length; k++) shown.push([`study ${s.ln.moves} ${k}`, X.rvAfter(s.mv.slice(0, k).join('')).split(':')[0]]); });
  const all = []; for (const k in OPP) OPP[k].slice(0, 5).forEach((P, j) => all.push([`pool ${k} q${j + 1}`, P.pos.split(':')[0], P]));
  const RXO = /定石|手順|覚え|思い出/;
  for (const s of ST) { const id = s.ln.moves, P0 = (OPP[id] || []).slice(0, 5); if (P0.length < 5) continue; RVO_DONE.add(id);
    let prevD = -1; const ans = new Map(), V = X.rvOpVoice(id), name = String(s.ln.name.ja);
    P0.forEach((P, j) => { const a = m => add(id, j, m), [cs, tm] = P.pos.split(':'), me = +tm, c = cs.split('').map(Number), lg = X.rvLegal(c, me), A = X.rvSq(P.best);
      // ④ the way there: the line's own moves, then a move off it, then the position
      const via = P.via.match(/../g); let k = 0; while (k < via.length && k < s.mv.length && via[k] === s.mv[k]) k++;
      if (k !== P.k || k >= via.length || k >= s.mv.length) a('④ P.via does not leave the line where it says');
      { const pr = ST.find(x => x.ln.moves.length < id.length && id.startsWith(x.ln.moves) && !ST.some(y => y.ln.moves.length > x.ln.moves.length && y.ln.moves.length < id.length && id.startsWith(y.ln.moves))); if (k < (pr ? pr.mv.length : 1)) a('④ it leaves the line before the line\'s own part'); }
      if (X.rvAfter(P.via) !== P.pos) a('④ P.via does not reach the position (legal, no pass)');
      if (k < 3) a('④ it leaves the line before its 3rd move (another family)');
      if (ST.some(o => o !== s && (o.ln.moves.startsWith(P.via.slice(0, 2 * k + 2)) || (P.via.startsWith(o.ln.moves) && o.ln.moves.length > id.length)))) a('④ the way there is another named line');
      if (!lg.includes(A)) { a('① the answer is not legal'); return; }
      if (lg.length < 4) a(`③ ${lg.length} legal moves`);
      // ① ② the two stored searches (and again with --deep)
      const evs = [['1.5 s', P.sc], ['0.3 s', P.sc2]]; if (opt.deep) evs.push(['deep 1.5 s', eng()(P.pos, 1500)], ['deep 0.3 s', eng()(P.pos, 300)]);
      for (const [nm, e] of evs) { if (!e) { a(`① ${nm}: no values`); continue; } const v = new Map(e), best = Math.max(...e.map(x => x[1]));
        if (e.length !== lg.length || lg.some(q => !v.has(sqn(q)))) a(`① ${nm}: the values do not cover the legal moves`);
        if (v.get(P.best) < best) a(`① ${nm}: ${P.best} is not the best (${e[0][0]})`);
        const p2 = Math.max(...lg.filter(q => q !== A).map(q => pts(e, sqn(q)))); if (p2 > 12) a(`② ${nm}: another move scores ${p2}`);
        if (Math.abs(best) > 6) a(`④ ${nm}: decided already (${best})`); }
      // ⑤
      for (const [who, b] of shown) { const dd = dist(cs, b); if (dd <= 3) { a(`⑤追1 ${dd} squares from ${who}`); break; } }
      for (const [who, b] of pool) { const dd = dist(cs, b); if (dd <= 3) { a(`⑤ ${dd} squares from ${who}`); break; } }
      for (const [who, b, Q] of all) { if (Q === P) continue; const dd = dist(cs, b); if (dd <= 3) { a(`⑤ ${dd} squares from ${who}`); break; } }
      ans.set(P.best, (ans.get(P.best) || 0) + 1); if (ans.get(P.best) === 3) a(`⑤ the answer ${P.best} a third time`);
      // ⑥
      const d = P.sc.filter(x => x[1] >= P.sc[0][1] - 4).length * 100 + lg.length; if (d < prevD) a(`⑥ easier than the one before (${d} after ${prevD})`); prevD = Math.max(prevD, d);
      // ⑦ ⑧ リバガメ's words at this place, for every legal move
      const o = { pos: P.pos, kind: 'best', P: { rv: 'op', ans: A, ev: P.sc }, ans: String(A) }; let W; try { W = X.rvOpJa(o, name, j, V, true); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      const pl = t => String(t).replace(/<[^>]+>/g, ''), ask = pl(W.ask), hint = pl(W.hintTx), gd = pl(W.good(A));
      for (const [nm, t] of [['question', ask], ['hint', hint], ['praise', gd]]) { if (/\{|undefined|NaN/.test(t)) a(`⑧ the ${nm} 「${t}」`); if (RXO.test(t.replace(/手順(から|を)外れ/g, ''))) a(`⑧ the ${nm} speaks of the line's moves 「${t}」`); }
      if (!ask.includes(me === 1 ? '黒' : '白')) a(`⑧ the question does not name the side 「${ask}」`);
      if (/の形を作る|形がまた一つ進|形が(きれいに)?整って|流れにぴったり|この流れごと/.test(gd)) a(`追85 the praise says the move builds the line's shape, off the line 「${gd}」`);   // (追85: a problem off the study line — its answer is not a move of the line)
      const { F } = X.rvOpFacts(P.pos), fa = F[A], mA = X.rvReplyMob(P.pos, A), vA = new Map(P.sc).get(P.best);
      if (/隅を取った|隅は取ったら/.test(gd) && !fa.cn) a('⑦ the praise: not a corner');
      { const m1 = gd.match(/開放度は?(\d+)|空きは(\d+)マス/); if (m1 && +(m1[1] || m1[2]) !== fa.open) a(`⑦ the praise: openness ${fa.open} 「${gd}」`); }
      { const m1 = gd.match(/(\d+)枚返/); if (m1 && +m1[1] !== fa.n) a(`⑦ the praise: ${fa.n} flips 「${gd}」`); }
      { const m1 = gd.match(/(?:打てる場所|打ち場所|候補|選べる手|打てるマス)(?:は|を)?(\d+)か所/); if (m1 && +m1[1] !== fa.oM) a(`⑦ the praise: ${fa.oM} replies 「${gd}」`); }
      if (/中割り/.test(gd) && fa.open !== 0) a('⑦ the praise: not a quiet move (openness 0)');
      for (const u of lg) { if (u === A) continue; const w = pl(W.ng(u)), fu = F[u], bad = m => a(`⑦ ${sqn(u)}: ${m} 「${w}」`), vu = new Map(P.sc).get(sqn(u));
        if (/\{|undefined|NaN/.test(w)) { bad('a placeholder'); continue; }
        if (RXO.test(w)) bad('speaks of the line\'s moves');
        if (/数は近い/.test(w)) bad('no difference on the board to tell');
        if (/おしい|あと少し|あと一歩|いい線|悪くない|まだ戦える|でも戦える|すぐには負けない|もありだけど/.test(w) && pts(P.sc, sqn(u)) < 10) bad(`追53 「おしい」 for a move of ${pts(P.sc, sqn(u))} points`);
        if (vu >= vA - 0.5) bad(`a move as good as the answer (${vu} / ${vA}) is told off`);
        if (/相手が隅に打てる|隅を取られちゃう|相手は隅に打てる|隅への道が開いて/.test(w) && !(fu.oC > fa.oC)) bad('no corner given');
        if (/（X）|Xに打つと/.test(w) && !(fu.x && !fa.x)) bad('not an X square');
        if (/隅のとなりのマス|Cに打つと/.test(w) && !(fu.cq && !fa.cq)) bad('not a C square');
        { const m1 = w.match(/開放度は赤い枠が(\d+)、緑の枠は(\d+)|空きが(\d+)マス。緑の枠なら(\d+)マス/); if (m1) { const x = m1.slice(1).filter(Boolean).map(Number); if (x[0] !== fu.open || x[1] !== fa.open) bad(`openness ${fu.open} / ${fa.open}`); } }
        if (/開放度|空き/.test(w) && !(fu.open > fa.open) && !/数は近い/.test(w)) bad(`openness ${fu.open} is not more than ${fa.open}`);
        { const m1 = w.match(/きみの打てる場所は(\d+)か所まで減っちゃう。緑の枠なら(\d+)か所|打てる場所は赤い枠だと(\d+)か所、緑の枠なら(\d+)か所|きみの打ち場所は(\d+)か所だけ。緑の枠なら(\d+)か所/); if (m1) { const x = m1.slice(1).filter(Boolean).map(Number), mu = X.rvReplyMob(P.pos, u); if (x[0] !== mu || x[1] !== mA || !(mu < mA)) bad(`the moves left after the reply ${mu} / ${mA}`); } }
        { const m1 = w.match(/は、赤い枠だと(\d+)か所、緑の枠なら(\d+)か所|赤い枠のあと、相手は(\d+)か所に打てる。緑の枠なら(\d+)か所|緑の枠なら[^。]*は(\d+)か所なのに、赤い枠だと(\d+)か所/); if (m1) { const x = m1.slice(1).filter(x => x != null).map(Number), [xu, xa] = m1[5] != null ? [x[1], x[0]] : [x[0], x[1]]; if (xu !== fu.oM || xa !== fa.oM || !(fu.oM > fa.oM)) bad(`the replies ${fu.oM} / ${fa.oM}`); } }
        { const m1 = w.match(/赤い枠は(\d+)枚も返す|(\d+)枚も返すと|返しすぎの(\d+)枚/); if (m1) { const x = +(m1[1] || m1[2] || m1[3]); if (x !== fu.n || !(fu.n > fa.n)) bad(`flips ${fu.n} / ${fa.n}`); } } }
    }); }
}
function reversiOpen(opt) {
  opt = opt || {}; const X = rx(), out = [], add = (id, j, m) => out.push({ step: id, q: j + 1, msg: m });
  const EV = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/opcourse-evals.json'), 'utf8')), ST = steps();
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  if (!src.includes('return Math.max(0, Math.min(14, Math.round(14 - 2.5 * (best - sc.get(u)))));')) add('-', -1, '⑨ the 3D REVERSI.points for the openings changed');
  // ⑤ the boards the game shows
  const pool = [], LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/lessons.json'), 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'reversi/puzzles.json'), 'utf8'));
  LS.lessons.forEach(l => { l.problems.forEach((p, j) => pool.push([`${l.id} q${j + 1}`, String(p.cells)])); (l.warm || []).forEach((w, j) => pool.push([`${l.id} warm ${j + 1}`, String(w.cells)])); });
  (PZ.levels || []).forEach(lv => lv.puzzles.forEach((p, j) => pool.push([`puzzle ${lv.id} ${j + 1}`, String(p.cells)])));
  ST.forEach(s => s.ks.forEach((k, j) => pool.push([`open ${s.ln.moves} q${j + 1}`, X.rvAfter(s.mv.slice(0, k).join('')).split(':')[0], s, j])));
  poolCheck(opt, ST, pool.filter(x => !x[2]), add);
  // 追53 (2026-11-24 担当B): every line that asks its own moves (all but the verified pools), every legal move — the words open with
  // 「おしい・あと少し・あと一歩・いい線」 only for a move worth 10+ points (REVERSI.points: 14 − 2.5 × discs below the best, at most 14)
  for (const s of ST) { const id = s.ln.moves; if (RVO_DONE.has(id)) continue; const V = X.rvOpVoice(id), name = String(s.ln.name.ja);
    s.ks.forEach((k, j) => { const pre = s.mv.slice(0, k).join(''), pos = X.rvAfter(pre), [cs, tm] = pos.split(':'), c = cs.split('').map(Number), lg = X.rvLegal(c, +tm), A = X.rvSq(s.mv[k]), sqn = q => 'abcdefgh'[q & 7] + ((q >> 3) + 1), ev = EV[pre] || null;
      const o = { pos, kind: 'best', P: { rv: 'op', ans: A, ev }, ans: String(A) }; let W; try { W = X.rvOpJa(o, name, j, V); } catch (e) { add(id, j, '⑧ the words fail: ' + e.message); return; }
      for (const u of lg) { if (u === A) continue; const w = String(W.ng(u)).replace(/<[^>]+>/g, ''), p = ev ? pts(ev, sqn(u)) : 0;
        const m = w.match(/おしい|あと少し|あと一歩|いい線|悪くない|まだ戦える|でも戦える|すぐには負けない|もありだけど/); if (m && p < 10) add(id, j, `⑦ ${sqn(u)}: 追53 「${m[0]}」 for a move of ${p} points 「${w}」`); } }); }
  for (const s of ST) { const id = s.ln.moves; if (!opt.all || RVO_DONE.has(id)) continue;   // (the lines' own moves: --all reports them; a verified line asks its pool instead)
    const study = new Set(); for (let k = 0; k <= s.mv.length; k++) study.add(X.rvAfter(s.mv.slice(0, k).join('')).split(':')[0]);
    let prevD = -1; const V = X.rvOpVoice(id), name = String(s.ln.name.ja);
    s.ks.forEach((k, j) => { const a = m => add(id, j, m), pre = s.mv.slice(0, k).join(''), pos = X.rvAfter(pre), [cs, tm] = pos.split(':'), me = +tm, c = cs.split('').map(Number);
      const lg = X.rvLegal(c, me), A = X.rvSq(s.mv[k]), sqn = q => 'abcdefgh'[q & 7] + ((q >> 3) + 1);
      // ④ ③
      if (!lg.includes(A)) { a(`④ the line's move ${s.mv[k]} is not legal`); return; }
      if (lg.length < 3) a(`③ ${lg.length} legal moves`);
      // ① ②
      const ev = EV[pre], evs = [['stored', ev]]; if (opt.deep) evs.push(['0.3 s', eng()(pos, 300)]);
      if (!ev) a('① no stored values');
      for (const [nm, e] of evs) { if (!e) continue; const v = new Map(e), best = Math.max(...e.map(x => x[1]));
        if (e.length !== lg.length || lg.some(q => !v.has(sqn(q)))) a(`① ${nm}: the values do not cover the legal moves`);
        if (v.get(s.mv[k]) < best) a(`① ${nm}: ${s.mv[k]} ${v.get(s.mv[k])} is not the best (${e[0][0]} ${best})`);
        const p2 = Math.max(...lg.filter(q => q !== A).map(q => pts(e, sqn(q)))); if (p2 > 12) a(`② ${nm}: another move scores ${p2}`); }
      if (!opt.deep) a('①② not searched again (--deep)');
      // ⑤ 追1
      if (study.has(cs)) a('⑤追1 a position of the study line just played (the answer was shown)');
      for (const [who, b, s2, j2] of pool) { if (s2 === s && j2 === j) continue; const dd = dist(cs, b); if (dd <= 3) { a(`⑤ ${dd} squares from ${who}`); break; } }
      // ⑥
      if (ev) { const best = Math.max(...ev.map(x => x[1])), dd = ev.filter(x => x[1] >= best - 2).length * 100 + lg.length; if (dd < prevD) a(`⑥ easier than the one before (${dd} after ${prevD})`); prevD = Math.max(prevD, dd); }
      // ⑦ ⑧
      const o = { pos, kind: 'best', P: { rv: 'op', ans: A, ev: ev || null }, ans: String(A) }; let W; try { W = X.rvOpJa(o, name, j, V); } catch (e) { a('⑧ the words fail: ' + e.message); return; }
      if (/\{|undefined|NaN/.test(W.ask + W.hintTx)) a('⑧ the question / hint');
      const { F } = X.rvOpFacts(pos), fa = F[A];
      for (const u of lg) { if (u === A) continue; const w = String(W.ng(u)).replace(/<[^>]+>/g, ''), fu = F[u], bad = m => a(`⑦ ${sqn(u)}: ${m} 「${w}」`);
        if (/\{|undefined|NaN/.test(w)) bad('a placeholder');
        if (ev) { const vu = new Map(ev).get(sqn(u)), vA = new Map(ev).get(s.mv[k]); if (vu != null && vu >= vA - 0.5) bad(`a move as good as the answer (${vu} / ${vA}) is told off`); }
        if (/相手が隅に打てる|隅を取られちゃう|相手は隅に打てる/.test(w) && !(fu.oC > fa.oC)) bad('no corner given');
        if (/赤い枠は隅のななめ隣（X）/.test(w) && !fu.x) bad('not an X square'); }
    }); }
  return out;
}
module.exports = reversiOpen; reversiOpen.steps = steps; reversiOpen.rx = rx; reversiOpen.eng = eng; reversiOpen.dist = dist; reversiOpen.pts = pts; reversiOpen.DONE = RVO_DONE;
if (require.main === module) { const a = process.argv.slice(2), f = reversiOpen({ all: a.includes('--all'), deep: a.includes('--deep') });
  if (a.includes('--sum')) { const by = {}, pr = new Set(); f.forEach(x => { const k = x.msg.replace(/^(\S+).*/, '$1'); by[k] = by[k] || new Set(); by[k].add(x.step + ' ' + x.q); pr.add(x.step + ' ' + x.q); }); for (const k in by) console.log(k, by[k].size); console.log('problems failing', pr.size); }
  else f.forEach(x => console.log(`NG ${x.step} q${x.q}: ${x.msg}`)); }
