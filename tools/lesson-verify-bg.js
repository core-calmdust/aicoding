// (2026-11-24 第2期・担当A) backgammon: the choice questions — ブロットに当たる目（shots）・レースのピップ（race） — checked strictly:
//   ① every count recounted over the 36 rolls with the rules (bg.js genPlays, an own loop — not shots_facts.js), the pips, the right button
//   ② the right count on one button only, all buttons different   ③ 4 buttons (3 wrong)   ④ shots: the marked checker is the side's
//   single checker and some roll hits it; race: no contact   ⑤ no other lesson / puzzle / warm-up position the same (either side's view)
//   ⑥ shots: distances + sum rolls + blocked rolls never go down; race: the gap never grows   ⑦⑧ every wrong button: its kind
//   (BGChoice.kind, backgammon/i18n-ls2.js) is what the count really overlooks, and the words in all 14 languages fill every {…};
//   the parts said in the answer hold on the board (all rolls with a direct number hit; each blocked roll would hit without the
//   owner's points)   追23 the % is n/36   追40 a lesson with 3+ choice questions puts the right answer on 2+ different buttons.
const path = require('path'), fs = require('fs'), ROOT = path.join(__dirname, '..');
module.exports = function (opt) {
  const BG = require(path.join(ROOT, 'backgammon/bg.js')), F = [], J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const LS = (opt && opt.lessons) || J('backgammon/lessons.json'), w = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'backgammon/i18n-ls2.js'), 'utf8'))(w);
  const C = w.BGChoice, I = w.I18N, LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
  const bad = (step, q, msg) => F.push({ step, q, msg });
  const dec = s => { const p = new Int8Array(52); for (let i = 0; i < 52; i++) p[i] = parseInt(s[i], 16); return p; };
  const hitsOn = (p, sd, pt, a, b) => BG.genPlays(p, 1 - sd, a, b).some(x => x.pos[sd * 26 + pt] === 0 && x.pos[sd * 26 + 25] > p[sd * 26 + 25]);
  // every other position of the course (both halves swapped too = the same board seen from the other side)
  const sw = s => s.slice(26) + s.slice(0, 26), others = new Map();
  const add = (pos, where) => { for (const x of [pos, sw(pos)]) { if (!others.has(x)) others.set(x, []); others.get(x).push(where); } };
  LS.steps.forEach(s => s.problems.forEach((P, i) => add(P.pos, `${s.id} q${i + 1}`)));
  JSON.stringify(J('backgammon/puzzles.json')).replace(/"pos":"([0-9a-f]{52})"/g, (_, x) => add(x, 'puzzle'));
  JSON.stringify(J('backgammon/ramps.json')).replace(/"pos":"([0-9a-f]{52})"/g, (_, x) => add(x, 'warm-up'));
  const tr = lang => (k, v) => { let s = (I[lang] || {})[k]; if (s === undefined) return '⟨' + k + '⟩'; return String(s).replace(/\{(\w+)\}/g, (m, x) => v && v[x] !== undefined ? v[x] : m); };
  for (const s of LS.steps) {
    const ch = s.problems.map((P, i) => [P, i]).filter(([P]) => P.kind === 'choice');
    if (ch.length >= 3 && new Set(ch.map(([P]) => P.ans)).size < 2) bad(s.id, 0, `追40: the right answer is always button ${ch[0][0].ans + 1}`);
    let prevM = -1, prevGap = Infinity;
    for (const [P, i] of ch) {
      if (P.q !== 'shots' && P.q !== 'race') continue;
      const q = i + 1, p = dec(P.pos), v = P.qv || {}, vals = P.opts.map(o => JSON.stringify(o));
      if (new Set(vals).size !== vals.length) bad(s.id, q, '②: two buttons are the same');
      if (P.opts.length < 4) bad(s.id, q, `③: ${P.opts.length} buttons`);
      const near = (others.get(P.pos) || []).filter(x => x !== `${s.id} q${q}`); if (near.length) bad(s.id, q, `⑤: the same board as ${near.join(', ')}`);
      let right;
      if (P.q === 'shots') {
        const [sd, pt] = (P.mk || [])[0] || [];
        if (sd !== P.side || p[sd * 26 + pt] !== 1) { bad(s.id, q, '④: the marked point is not a single checker of the side'); continue; }
        const o = 1 - sd, t = 25 - pt, ds = []; for (let k = 25; k > t; k--) if (p[o * 26 + k]) ds.push(k - t); ds.sort((a, b) => a - b);
        const hit = [], dir = [], sum = [], blk = [], dsD = ds.filter(d => d <= 6);
        for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
          const r = a + '-' + b, h = hitsOn(p, sd, pt, a, b), st = a === b ? [a, 2 * a, 3 * a, 4 * a] : [a, b, a + b], dn = dsD.includes(a) || dsD.includes(b);
          if (dn && !h) bad(s.id, q, `⑧: ${r} has a direct number but does not hit (the words say every roll with ${dsD.join('/')} hits)`);
          if (h) { hit.push(r); (dn ? dir : sum).push(r); } else if (ds.some(d => st.includes(d))) {
            blk.push(r); const p2 = p.slice(); for (let k = 1; k <= 24; k++) if (k !== pt && p2[sd * 26 + k] >= 2) p2[sd * 26 + k] = 0;
            if (!hitsOn(p2, sd, pt, a, b)) bad(s.id, q, `⑧: ${r} is said to be blocked by ${sd}'s points, but it misses without them too`);
          }
        }
        const T1 = { 1: 11, 2: 12, 3: 14, 4: 15, 5: 15, 6: 17, 7: 6, 8: 6, 9: 5, 10: 3, 11: 2, 12: 3, 15: 1, 16: 1, 18: 1, 20: 1, 24: 1 };
        const fx = { n: hit.length, p: Math.round(hit.length / 36 * 100), d: ds[0], ds, dn: dir.length, cn: sum.length, cl: sum, bn: blk.length, bl: blk, S: ds.reduce((x, d) => x + (T1[d] || 0), 0) };
        for (const k in fx) if (JSON.stringify(fx[k]) !== JSON.stringify(v[k])) bad(s.id, q, `①: ${k} is ${JSON.stringify(fx[k])} on the board, stored ${JSON.stringify(v[k])}`);
        if (!hit.length) bad(s.id, q, '④: no roll hits the blot');
        right = P.opts.findIndex(o => o[1] === hit.length);
        const M = ds.length + sum.length + blk.length; if (M < prevM) bad(s.id, q, `⑥: easier (distances+sums+blocked ${M}) than the one before (${prevM})`); prevM = M;
        P.opts.forEach((o, k) => { if (k === right) return; const x = o[1];
          const kind = x < fx.n ? (x === fx.dn ? 'direct' : 'low') : fx.bn && x === fx.n + fx.bn ? 'block' : ds.length > 1 && x === fx.S ? 'dup' : 'high';
          if (C.kind(P, k) !== kind) bad(s.id, q, `⑦: ${x} is a "${kind}" miss, BGChoice says "${C.kind(P, k)}"`); });
      } else {
        if (BG.contact(p)) bad(s.id, q, '④: the checkers still meet (not a race)');
        const a = BG.pips(p, P.side), b = BG.pips(p, 1 - P.side); if (a !== v.a || b !== v.b) bad(s.id, q, `①: pips ${a}/${b}, stored ${v.a}/${v.b}`);
        right = P.opts.findIndex(o => { const [k, n] = Array.isArray(o) ? o : [o]; return a === b ? k === 'even' : k === (a < b ? 'lead_c' : 'lead_o') && n === Math.abs(a - b); });
        const gap = Math.abs(a - b); if (gap > prevGap) bad(s.id, q, `⑥: the gap ${gap} is bigger (easier) than the one before (${prevGap})`); prevGap = gap;
        P.opts.forEach((o, k) => { if (k === right) return; const [kk] = Array.isArray(o) ? o : [o];
          const kind = a === b ? 'noLead' : kk === 'even' ? 'even' : kk !== (a < b ? 'lead_c' : 'lead_o') ? 'side' : 'diff';
          if (C.kind(P, k) !== kind) bad(s.id, q, `⑦: ${JSON.stringify(o)} is a "${kind}" miss, BGChoice says "${C.kind(P, k)}"`); });
      }
      if (right !== P.ans) bad(s.id, q, `①: the right button is ${right + 1}, stored ${P.ans + 1}`);
      if (P.opts.filter((o, k) => k !== right).length < 3) bad(s.id, q, '③: fewer than 3 wrong buttons');
      if (P.q === 'shots' && Math.round(v.n / 36 * 100) !== v.p) bad(s.id, q, `追23: ${v.n}/36 is not ${v.p}%`);
      // the words: every wrong button gets its own explanation in every language, with nothing left unfilled
      for (const L of LANGS) { const T = tr(L), V = { c: 'C', o: 'O' };
        const whyT = P.q === 'shots' ? C.shotsWhy(P, T, V) : ''; if (/[{⟨]/.test(whyT)) bad(s.id, q, `⑧ ${L}: the answer's parts unfilled: ${whyT}`);
        if (P.q === 'shots' && L === 'en' && v.dn && !whyT.includes(String(v.dn))) bad(s.id, q, '⑧: the answer does not say the direct count');
        P.opts.forEach((o, k) => { if (k === P.ans) return; const x = C.ng(P, k, T, V);
          if (!x || /[{⟨]/.test(x)) bad(s.id, q, `追22 ${L}: button ${k + 1} has no explanation (${x})`); }); }
    }
  }
  // ⑨ the 2D and the 3D judge by the same P.ans and both show the wrong button's words
  const app = fs.readFileSync(path.join(ROOT, 'backgammon/app.js'), 'utf8'), l3 = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  if (!/C\.ng\(P, lesson\.choice/.test(app)) bad('2D', 0, '⑨/追22: backgammon/app.js does not show the wrong choice\'s words');
  if (!/AtlasBgChoice\.kind\(P, i\)/.test(l3) || !/C\.ng\(P, typeof u/.test(l3)) bad('3D', 0, '⑨/追22: atlas/lessons3d.js does not show the wrong choice\'s words');
  return F;
};
if (require.main === module) { const f = module.exports(); f.forEach(x => console.log(`NG backgammon ${x.step} q${x.q}: ${x.msg}`)); console.log(f.length ? `${f.length} NG` : 'OK backgammon (shots・race の①〜⑨・追22・追23・追40・追54)'); process.exit(f.length ? 1 : 0); }
