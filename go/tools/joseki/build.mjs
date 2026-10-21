// build go/tools/data/openings-joseki.json from lines.mjs + txt_*.mjs + engine checks (cached)
import fs from 'fs';
import { L } from './lines.mjs';
import { T as TH } from './txt_hoshi.mjs';
import { T as TK } from './txt_komoku.mjs';
import { T as TO } from './txt_other.mjs';
import { T as TA } from './txt_ai.mjs';
import { checkLine, startSpec, evalPos } from '/home/claude/aicoding/go/tools/check-openings.mjs';
import { R } from '/home/claude/aicoding/go/tools/golib.mjs';
const OUT = '/home/claude/aicoding/go/tools/data/openings-joseki.json';
const T = { ...TH, ...TK, ...TO, ...TA };
const t2 = a => ({ ja: a[0], en: a[1] });
const cats = [
  { id: 'hoshi', title: ['星の定石', '4-4 point joseki'], sub: ['小ゲイマガカリへの受け・ハサミ・三々入り・両ガカリ', 'Answers to the approach, pincers, 3-3 invasion, double approach'] },
  { id: 'komoku', title: ['小目の定石', '3-4 point joseki'], sub: ['小ゲイマガカリへのハサミと受け、一間高ガカリ、大ゲイマガカリ', 'Pincers and answers to the small knight approach, high and large knight approaches'] },
  { id: 'other', title: ['三々・高目・目外し', '3-3, 5-4 and 5-3 points'], sub: ['三々への肩ツキ、高目・目外しへのカカリ', 'Shoulder hit on the 3-3, approaches to the 5-4 and 5-3 points'] },
  { id: 'ai', title: ['AI時代の定石・流行', 'AI-era joseki and trends'], sub: ['コスミツケ・肩ツキ・三々入りの新型、AIが見直した旧定石', 'Diagonal attachment, shoulder hits, new 3-3 lines, old joseki re-evaluated'] },
];
const ONLY = process.argv.includes('--only-existing');
const sets = []; const report = [];
const ordc = {};
for (const [id, cat, st, lineS, varsS] of L) {
  const tx = T[id]; if (!tx) { console.error('no text', id); continue; }
  const line = lineS.split(' ');
  const start = { n: 19, ab: st.ab, aw: st.aw, turn: st.turn };
  const set0 = { n: 19, start };
  const spec = startSpec(set0);
  const rows = await checkLine(spec, line);
  if (tx.notes.length !== line.length) console.error(`!! ${id}: ${tx.notes.length} notes for ${line.length} moves`);
  const vars = [];
  let maxv = 0;
  varsS.forEach(([at, vl], j) => {
    const vt = tx.vars[j]; if (!vt) { console.error('no var text', id, j); return; }
    const vline = vl.split(' ');
    if (vt.notes.length !== vline.length) console.error(`!! ${id} var ${j}: ${vt.notes.length} notes for ${vline.length}`);
    vars.push({ at, line: vline, title: t2(vt.title), notes: Object.fromEntries(vt.notes.map((nn, k) => [String(k + 1), t2(nn)])) });
  });
  for (const [j, v] of vars.entries()) {
    const vr = await checkLine(spec, line.slice(0, v.at).concat(v.line));
    for (const r of vr.slice(v.at)) maxv = Math.max(maxv, r.loss);
  }
  // view: bounding box of all moves
  let minx = 9, maxy = 9;
  for (const m of line.concat(...vars.map(v => v.line))) { const i = R.parseCoord(m, 19); minx = Math.min(minx, (i % 19) - 1); maxy = Math.max(maxy, Math.floor(i / 19) + 1); }
  minx = Math.max(0, minx); maxy = Math.min(18, maxy);
  const w = 18 - minx, h = maxy; const sz = Math.max(w, h);
  const view = [18 - sz, 0, 18, sz];
  // problems: side's moves first, then opponent's if fewer than 5
  const probs = [];
  const mk = k => {
    const pre = rows[k].pre; const best = pre.top[0];
    const good = [];
    for (const [mv, vis, ld] of pre.top) {
      if (mv === line[k] || vis < 8 || best[2] - ld > 0.6) continue;
      const i = R.parseCoord(mv, 19); if (i < 0) continue;
      const x = i % 19, y = Math.floor(i / 19);
      if (x >= view[0] && y <= view[3]) good.push(mv);
    }
    const p = { at: k, ok: [line[k]] }; if (good.length) p.good = good; return p;
  };
  const sideK = [], oppK = [];
  for (let k = 0; k < line.length; k++) (rows[k].pre.turn === tx.side ? sideK : oppK).push(k);
  for (const k of sideK) probs.push(mk(k));
  for (const k of oppK) { if (probs.length >= 5) break; probs.push(mk(k)); }
  probs.sort((a, b) => a.at - b.at);
  ordc[cat] = (ordc[cat] || 0) + 1;
  sets.push({
    id, cat, ord: ordc[cat], n: 19,
    label: t2(tx.label), title: t2(tx.title), short: t2(tx.short), story: t2(tx.story),
    level: tx.level, side: tx.side, start, line,
    notes: Object.fromEntries(tx.notes.map((nn, k) => [String(k + 1), t2(nn)])),
    vars, evals: rows.map(r => r.lead), view, problems: probs,
  });
  report.push({ id, ja: tx.title[0], moves: line.length, maxMain: Math.max(...rows.map(r => r.loss)), maxVar: maxv, probs: probs.length, sideProbs: sideK.length, worst: rows.filter(r => r.loss > 1.0).map(r => r.k + ':' + r.mv + ':' + r.loss).join(' ') });
}
fs.writeFileSync(OUT, JSON.stringify({ version: 1, cats: cats.map(c => ({ id: c.id, title: t2(c.title), sub: t2(c.sub) })), sets }, null, 1) + '\n');
for (const r of report) console.log(`${r.id.padEnd(22)} ${String(r.moves).padStart(3)} main ${r.maxMain.toFixed(1)} var ${r.maxVar.toFixed(1)} probs ${r.probs}(${r.sideProbs})  ${r.ja}  ${r.worst}`);
process.exit(0);
