// Build go/puzzles.json from the generator's candidates (tools/data/tsumego/*.jsonl): called by
//   node tools/gen-tsumego.mjs build [--min 70]
// 1. dedupe; 2. fun score (tools/fun.js, with the light net: local prior of the answer = surprise / tempting wrong
// moves, ownership at the end of the line = sanity check), cached in tools/data/tsumego/fun-cache.json;
// 3. per theme keep fun >= 70 (a theme that cannot fill 50 falls back to >= 60, reported), best 50 by fun;
// 4. orient: a random corner / symmetry per puzzle, the player's colour alternates Black / White along the theme;
// 5. sort easy -> hard (fun.js difficulty estimate) and write puzzles.json (PZBook v2 format, see CONTENT.md).
// Copyright 2026 core-calmdust — Apache License 2.0
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { R, T, transform, viewFor, rng, tacTheme } from './tsumego-shapes.mjs';
const require = createRequire(import.meta.url);
const { funScore } = require('./fun.js');
const DIR = path.dirname(new URL(import.meta.url).pathname);
const DATA = path.join(DIR, 'data', 'tsumego'), OUT = path.join(DIR, '..', 'puzzles.json');

export const THEMES = [
  { id: 'capture', grp: 'Cap', title: { ja: 'アタリで取る', en: 'Capture with atari' }, sub: { ja: '正しい方向からアタリ。逃げられない石を取ろう', en: 'Atari from the right side so the stones cannot escape' } },
  { id: 'ladder', grp: 'Cap', title: { ja: 'シチョウ・ゲタ', en: 'Ladders & nets' }, sub: { ja: '追いかけて取る・網をかけて取る', en: 'Chase the stones down, or cast a net over them' } },
  { id: 'snapback', grp: 'Cap', title: { ja: 'ウッテガエシ・石の下', en: 'Snapback & under the stones' }, sub: { ja: '石を捨てて、もっと多く取り返そう', en: 'Sacrifice first, then capture more' } },
  { id: 'live1', grp: 'LD', title: { ja: '生き（1手）', en: 'Live in 1' }, sub: { ja: '急所に打って二眼を作ろう', en: 'Find the vital point and make two eyes' } },
  { id: 'kill1', grp: 'LD', title: { ja: '殺し（1手）', en: 'Kill in 1' }, sub: { ja: '急所を奪って眼を一つにしよう', en: 'Take the vital point and leave one eye' } },
  { id: 'live3', grp: 'LD', title: { ja: '生き（3手）', en: 'Live in 3' }, sub: { ja: '相手の抵抗に応えて生きよう', en: 'Answer the opponent’s resistance and live' } },
  { id: 'kill3', grp: 'LD', title: { ja: '殺し（3手）', en: 'Kill in 3' }, sub: { ja: '相手の抵抗を読み切って殺そう', en: 'Read out the resistance and kill' } },
  { id: 'ld5', grp: 'LD', title: { ja: '死活（5手以上）', en: 'Life & death 5+' }, sub: { ja: '深く読む本格派の生き・殺し', en: 'Deeper reading: live or kill' } },
  { id: 'semeai', grp: 'Fight', title: { ja: '攻め合い', en: 'Capturing races' }, sub: { ja: 'ダメを数えて競り勝とう', en: 'Count the liberties and win the race' } },
  { id: 'tesuji', grp: 'Fight', title: { ja: '手筋（連絡・ダメヅマリ）', en: 'Tesuji: connect & shortage of liberties' }, sub: { ja: 'ワタリ・ダメヅマリなど一手の妙手', en: 'Connect under, squeeze, shortage of liberties' } },
];
const PER = 50;
const key = c => c.s.stones + c.s.turn + c.goal + c.target.join(',');

export async function build() {
  const argMin = process.argv.indexOf('--min'), MIN = argMin > 0 ? +process.argv[argMin + 1] : 70;
  const files = fs.readdirSync(DATA).filter(f => f.endsWith('.jsonl'));
  const cands = [], seen = new Set();
  for (const f of files) for (const ln of fs.readFileSync(path.join(DATA, f), 'utf8').split('\n')) {
    if (!ln.trim()) continue; const c = JSON.parse(ln); const k = key(c); if (seen.has(k)) continue; seen.add(k);
    if (c.goal === 'capture') {   // the theme of capture puzzles from the line (snapback / ladder / capture / tesuji)
      const n = c.s.n, ix = a => a.map(v => R.parseCoord(v, n));
      c.th = tacTheme({ s: c.s, goal: c.goal, target: ix(c.target), line: ix(c.line), n: c.n });
    }
    if (c.goal === 'connect' && c.n < 2) continue;   // one-move connections are too plain for the tesuji theme
    cands.push(c);
  }
  console.log('candidates', cands.length);
  const cacheF = path.join(DATA, 'fun-cache.json');
  const cache = fs.existsSync(cacheF) ? JSON.parse(fs.readFileSync(cacheF, 'utf8')) : {};
  T.nodeLimit = 2e6;
  const L = await import('./golib.mjs');
  // the wasm engine can trap on odd inputs: then reload a fresh instance and score that candidate without the net
  const fresh = async () => { const fs2 = await import('fs'), zlib = await import('zlib'); const D2 = path.join(DIR, '..'); const { instance } = await WebAssembly.instantiate(fs2.readFileSync(path.join(D2, 'engine_simd.wasm')), {}); const X = instance.exports; const raw = zlib.gunzipSync(fs2.readFileSync(path.join(D2, 'net_light.bin.gz'))); const p = X.galloc(raw.length); new Uint8Array(X.memory.buffer).set(raw, p); X.net_load(p, raw.length); X.set_seed(12345); return X; };
  let E = await fresh();
  const net = { policy: (s, m) => L.policy(E, s, m, 7, 2).list, own: (s, m) => L.ownership(E, s, m, 7) };
  let done = 0; const t0 = Date.now();
  for (const c of cands) {
    const k = key(c);
    if (!cache[k]) {
      let r;
      try { r = funScore(c, { net }); }
      catch (e) {
        if (e.abort) r = { fun: 0, sound: false, why: 'slow', info: {} };
        else if (e instanceof WebAssembly.RuntimeError) { E = await fresh(); try { r = funScore(c, {}); } catch (e2) { if (!e2.abort) throw e2; r = { fun: 0, sound: false, why: 'slow', info: {} }; } }
        else throw e;
      }
      cache[k] = { fun: r.fun, sound: r.sound, why: r.why, diff: r.info.diff, netAgree: r.info.netAgree, pAns: r.info.pAns };
      if (++done % 25 === 0) { fs.writeFileSync(cacheF, JSON.stringify(cache)); console.log(`fun ${done} (${((Date.now() - t0) / 1000).toFixed(0)} s)`); }
    }
    Object.assign(c, { fun: cache[k].fun, diff: cache[k].diff, sound: cache[k].sound });
  }
  fs.writeFileSync(cacheF, JSON.stringify(cache));
  const out = { version: 1, cut: '', daily: THEMES.map(t => t.id), themes: [] }, report = [];
  for (const Th of THEMES) {
    const pool = cands.filter(c => c.th === Th.id && c.sound).sort((a, b) => b.fun - a.fun);
    let min = MIN, sel = pool.filter(c => c.fun >= min);
    if (sel.length < PER) { min = 60; sel = pool.filter(c => c.fun >= min); }
    sel = sel.slice(0, PER);
    report.push({ id: Th.id, pool: pool.length, ge70: pool.filter(c => c.fun >= 70).length, used: sel.length, min, lo: sel.length ? sel[sel.length - 1].fun : 0, hi: sel.length ? sel[0].fun : 0 });
    sel.sort((a, b) => a.diff - b.diff || b.fun - a.fun);
    const rand = rng(Th.id.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7));
    const puzzles = sel.map((c, j) => orient(c, j % 2 === 0 ? 1 : 2, Math.floor(rand() * 8)));
    out.themes.push({ id: Th.id, grp: Th.grp, title: Th.title, sub: Th.sub, puzzles });
  }
  console.table(report);
  fs.writeFileSync(OUT, JSON.stringify(out, null, 0).replace(/\{"s":/g, '\n{"s":').replace(/\],"themes":\[/, '],\n"themes":[').replace(/\{"id":/g, '\n{"id":') + '\n');
  console.log('wrote', OUT);
}
// a random symmetry (keeps corner problems in a corner) and the player's colour
function orient(c, colour, t) {
  const n = c.s.n, P = s => R.parseCoord(s, n), co = i => R.coord(i, n), tr = i => transform(i, n, t);
  const b = new Array(n * n).fill('.');
  for (let i = 0; i < n * n; i++) { const ch = c.s.stones[i]; if (ch === '.') continue; const sw = colour !== c.s.turn; b[tr(i)] = sw ? (ch === 'b' ? 'w' : 'b') : ch; }
  const map = a => a.map(s => co(tr(P(s))));
  const stonesPts = []; for (let i = 0; i < n * n; i++) if (b[i] !== '.') stonesPts.push(i);
  const o = { s: { n, stones: b.join(''), turn: colour } };
  const region = map(c.region), line = map(c.line);
  if (n > 9) o.view = viewFor([...stonesPts.filter(i => { const reg = region.map(P); return reg.some(r => Math.max(Math.abs(r % n - i % n), Math.abs(((r / n) | 0) - ((i / n) | 0))) <= 2); }), ...region.map(P), ...line.map(P)], n, 9);
  Object.assign(o, { goal: c.goal, target: map(c.target), region, n: c.n, answer: co(tr(P(c.answer))), line, fun: c.fun });
  return o;
}
