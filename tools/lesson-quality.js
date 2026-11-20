#!/usr/bin/env node
// Lesson quality gate for the 3D lessons in Japanese (2026-11-21).
// Renders every lesson's lines the way the 3D table shows them (atlas/lessons3d.js: guideJa → atlas/lsvoice-ja.js → varyJa)
// and scores each lesson out of 100. Usage:
//   node tools/lesson-quality.js [game,game…] [--json out.json] [--show N]
// Needs Chrome + puppeteer-core (PUPPETEER_CORE / CHROME env, or the defaults below). Serves the repo itself on a free port.
// The pass mark lives in tools/lesson-quality.json ("pass"); raise it when the average beats it by 10 (see claude/lesson-quality.md).
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const PUP = process.env.PUPPETEER_CORE || '/opt/npm-tools/node_modules/puppeteer-core';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const games = (args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--json' && args[args.indexOf(a) - 1] !== '--show') || '').split(',').filter(Boolean);
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'lesson-quality.json'), 'utf8'));

const MIME = { '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.bin': 'application/octet-stream', '.wasm': 'application/wasm' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });

const TIC = { amazons: /ケロ/, shogi: /コン(?![ト-ヾ])/, xiangqi: /コン(?![ト-ヾ])/, backgammon: /ワン/, chess: /ピョン/, go: /ペン(?!ギ)/, gomoku: /ペン(?!ギ)/, hex: /ペン(?!ギ)/, checkers: /カニ/ };
const plain = s => String(s || '').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').trim();
const sents = s => (plain(s).match(/[^。！？\n]+[。！？]+|[^。！？\n]+$/gm) || []).map(x => x.trim()).filter(Boolean);
const end = sn => { const b = sn.replace(/[。！？!?]+$/, '').replace(/[）)」]+$/, ''); for (const e of ['なんだ', 'んだ', 'だよ', 'だね', 'よね', 'かな', 'よう', 'ろう', 'よ', 'ね']) if (b.endsWith(e)) return e === 'だよ' ? 'よ' : e === 'なんだ' ? 'んだ' : e === 'だね' ? 'ね' : e; return /[！？]$/.test(sn) ? sn.slice(-1) : 'x'; };
const REASON = /(から|ので|ため|と、|と相手|ると|れば|なら|だと|では|せいで|取られ|負け|逃げ|防げ|止め|ふさ|残る|残っちゃ|できない|届かない|ならない|損)/;
const CONCRETE = /(緑|赤|金|銀|光って|印|矢印|☗|☖|♘|♗|♖|♕|♔|[a-h][1-8]|列|穴|点|マス|ストア|正解)/;

function scoreLesson(id, L) {
  const pen = [], P = (n, why) => pen.push([n, why]);
  const all = [L.intro, ...L.probs.flatMap(p => [p.ask, p.hint, p.good, p.ng])].filter(Boolean);
  // hard faults (shown to the player as garbage or the wrong register)
  for (const t of all) {
    const s = plain(t);
    if (/\{[a-zA-Z]\w*\}/.test(s)) P(25, 'placeholder: ' + s.match(/\{[a-zA-Z]\w*\}/)[0]);
    if (/(です|ます|ません|ました|でしょう)(?=[。！？）)]|$)/m.test(s)) P(8, 'polite: ' + s.slice(0, 40));
    if (/あなた/.test(s)) P(4, 'あなた');
    if (/\b(Gold|Silver|undefined|null|NaN)\b/.test(s)) P(20, 'raw value: ' + s.slice(0, 40));
    if (/列列|  |。。/.test(s)) P(6, 'doubled: ' + s.slice(0, 40));
    for (const sn of sents(t)) if (sn.length > 90) P(2, 'long sentence');
  }
  // bubble size on a phone (44 chars a page) and a PC (58): atlas/lessons3d.js pages() packs sentences up to the limit and cuts a
  // sentence over 1.25× at a comma — a page that still runs over may not fit the bubble; many pages make a long read
  const pagesOf = (t, LIM) => { const parts = []; plain(t).split('\n').forEach(par => (par.match(/[^。！？!?]*[。！？!?]+」?|[^。！？!?]+$/g) || [par]).map(x => x.trim()).filter(Boolean).forEach(sn => {
      if (sn.length > LIM * 1.25) { const mid = sn.length / 2; let best = -1; for (let k = 0; k < sn.length; k++) if (sn[k] === '、' && (best < 0 || Math.abs(k - mid) < Math.abs(best - mid))) best = k; if (best > 0) { parts.push(sn.slice(0, best + 1), sn.slice(best + 1)); return; } } parts.push(sn); }));
    const out = []; let cur = ''; for (const sn of parts) { if (cur && (cur + sn).length > LIM) { out.push(cur); cur = sn; } else cur += sn; } if (cur) out.push(cur); return out; };
  for (const t of all) {
    const ph = pagesOf(t, 44), pc = pagesOf(t, 58);
    if (ph.some(x => x.length > 44 * 1.45)) P(4, 'phone: a page too long for the bubble: ' + ph.find(x => x.length > 44 * 1.45).slice(0, 30));
    if (ph.length > 4) P(3, `phone: ${ph.length} pages in one bubble`);
    if (pc.length > 3) P(2, `PC: ${pc.length} pages in one bubble`);
  }
  for (const p of L.probs) { const fb = [p.ng, p.good].map(plain).filter(Boolean); if (fb.some(x => x.length > 150)) P(2, 'feedback over 150 chars'); }
  // ending variety over each bubble and over the lesson
  let fam = 0, tot = 0;
  for (const t of all) { const E = sents(t).map(end); for (let i = 1; i < E.length; i++) if (E[i] !== 'x' && E[i] !== '？' && E[i] !== '！' && E[i] === E[i - 1]) P(3, 'same ending twice: ' + E[i]); E.forEach(e => { tot++; if (e === 'よ') fam++; }); }
  if (tot >= 6 && fam / tot > 0.45) P(10, `〜よ on ${Math.round(fam / tot * 100)}% of sentences`);
  if (TIC[id] && !all.some(t => TIC[id].test(plain(t)))) P(6, 'no verbal tic anywhere');
  // the problems: ask → (hint) → praise or a concrete, reasoned correction
  const asks = L.probs.map(p => plain(p.ask)).filter(Boolean);
  if (!L.probs.length) P(30, 'no problems');
  L.probs.forEach((p, i) => {
    if (!plain(p.ask)) P(10, `q${i + 1}: no question`);
    if (!plain(p.hint)) P(3, `q${i + 1}: no hint`);
    const ng = plain(p.ng), good = plain(p.good);
    if (!ng) P(8, `q${i + 1}: no wrong-answer explanation`);
    else {
      if (!CONCRETE.test(ng)) P(5, `q${i + 1}: wrong answer does not name the right move`);
      if (!REASON.test(ng)) P(5, `q${i + 1}: wrong answer gives no reason`);
      if (good && ng === good) P(3, `q${i + 1}: same text for right and wrong`);
    }
    if (!good) P(3, `q${i + 1}: no praise / why`);
  });
  if (asks.length >= 4 && new Set(asks).size === 1) P(4, 'every question worded the same');
  const lost = pen.reduce((a, [n]) => a + n, 0);
  return { score: Math.max(0, 100 - lost), pen };
}

(async () => {
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const puppeteer = require(PUP);
  const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const pg = await b.newPage();
  await pg.goto(`http://127.0.0.1:${port}/atlas/`, { waitUntil: 'domcontentloaded' }); await new Promise(r => setTimeout(r, 4000));
  const R = await pg.evaluate(async games => {
    let src = await (await fetch('lessons3d.js?x=' + Date.now())).text();
    src = src.replace('  window.AtlasGuideJa = guideJa;', '  window.AtlasGuideJa = guideJa; let LSVD = null; const lsvX = (h, id) => { const m = (LSVD || {})[id]; if (!m) return h; for (const k of Object.keys(m).sort((a, b) => b.length - a.length)) if (h.includes(k)) h = h.split(k).join(m[k]); return h; }; window.__setLSV = d => { LSVD = d; };')
      .replace('window.AtlasLessons = {', 'window.__LD = DATA; window.__V = (h, id) => varyJa(lsvX(guideJa(h, id), id), id); window.AtlasLessons = {');
    window.Atlas3D = window.Atlas3D || {}; if (!Atlas3D.connect4) Atlas3D.connect4 = { names: l => l === 'ja' ? ['金', '銀'] : ['Gold', 'Silver'] };
    new Function(src)();
    try { const t = await (await fetch('lsvoice-ja.js?x=' + Date.now())).text(); const w = {}; new Function('window', t)(w); __setLSV(w.AtlasLsVoice); } catch (e) {}
    const say = (h, id) => { h = String(h || '').replace(/\{fig\d*\}\s*/g, '').replace(/\{[mx]\}/g, '♘e2–e4').replace(/[  ]*\u0001/g, '').replace(/\u0002[  ]*/g, '').replace(/<p[^>]*>/g, '').replace(/<\/p>\s*/g, '<br>').replace(/(<br>\s*)+$/, ''); return h ? __V(h, id) : ''; };
    const f = (x, p) => { try { return typeof x === 'function' ? x(p && p.ans, p) : x; } catch (e) { return ''; } };
    const out = {};
    for (const id of (games.length ? games : Object.keys(__LD))) { const D = __LD[id]; out[id] = [];
      try { await D.load('ja'); for (const it of D.list('lesson', 'ja')) { let s; try { s = await D.lesson(it.key, 'ja'); } catch (e) { continue; } if (!s) continue;
        out[id].push({ key: it.key, title: it.title, intro: say(s.intro, id), probs: (s.probs || []).map(p => ({ ask: say(p.ask, id), hint: say(p.hintTx, id), good: say(f(p.good, p) || f(p.why, p), id), ng: say(f(p.ng, p) || p.ngTx, id) })) }); } } catch (e) { out[id].push({ err: String(e) }); } }
    return out;
  }, games);
  await b.close(); srv.close();
  const rep = {}; let sum = 0, n = 0;
  for (const id in R) { const ls = R[id].filter(l => !l.err).map(l => Object.assign({ key: l.key, title: l.title }, scoreLesson(id, l)));
    const avg = ls.length ? ls.reduce((a, l) => a + l.score, 0) / ls.length : 0; rep[id] = { avg: Math.round(avg * 10) / 10, pass: ls.filter(l => l.score >= CFG.pass).length, n: ls.length, lessons: ls };
    sum += avg * ls.length; n += ls.length; }
  const overall = n ? Math.round(sum / n * 10) / 10 : 0;
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify({ pass: CFG.pass, overall, games: rep, texts: R }, null, 1));
  console.log(`pass mark ${CFG.pass} · overall ${overall}`);
  for (const id in rep) console.log(`${id.padEnd(11)} avg ${String(rep[id].avg).padStart(5)}  pass ${rep[id].pass}/${rep[id].n}`);
  const show = +(opt('--show') || 0);
  if (show) for (const id in rep) rep[id].lessons.slice().sort((a, b) => a.score - b.score).slice(0, show).forEach(l => console.log(`  ${id} #${l.key} ${l.title} ${l.score}: ` + [...new Set(l.pen.map(x => x[1]))].slice(0, 6).join(' / ')));
  process.exitCode = Object.values(rep).every(g => g.pass === g.n) ? 0 : 1;
})().catch(e => { console.error(e); process.exit(2); });
