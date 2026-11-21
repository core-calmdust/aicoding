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
  const all = [L.intro, ...(L.ramp || []), ...L.probs.flatMap(p => [p.ask, p.hint, p.good, p.ng])].filter(Boolean);   // (display order: intro → warm-up → each problem)
  // hard faults (shown to the player as garbage or the wrong register)
  for (const t of all) {
    const s = plain(t);
    if (/\{[a-zA-Z]\w*\}/.test(s)) P(25, 'placeholder: ' + s.match(/\{[a-zA-Z]\w*\}/)[0]);
    if (/(です|ます|ません|ました|でしょう)(?=[。！？）)]|$)/m.test(s)) P(8, 'polite: ' + s.slice(0, 40));
    if (/あなた/.test(s)) P(4, 'あなた');
    if (/\b(Gold|Silver|undefined|null|NaN)\b/.test(s)) P(20, 'raw value: ' + s.slice(0, 40));
    if (/列列|  |。。/.test(s)) P(6, 'doubled: ' + s.slice(0, 40));
    if (!/^(chess|shogi)$/.test(id) && /(^|[^A-Za-z])[a-o](1[0-9]|[1-9])(?![0-9A-Za-z])/.test(s)) P(6, 'coordinate on the 3D table: ' + s.match(/[a-o](1[0-9]|[1-9])/)[0]);
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
  // (2026-11-22 ユーザー：「AIの評価が下がるから取りたくない」などの表現は最悪。その手でどういう理由で不利かを盤の上の事実で解説する)
  // a reason given as the engine's opinion (AIの評価・見立て・形勢・評価値・勝つ見込み…%) instead of what happens on the board
  { const AIR = /AI(の|が|も|で|に)|評価|見立て|形勢|勝つ見込み|勝率/; let n = 0;
    for (const t of all) if (AIR.test(plain(t))) n++;
    if (n) P(Math.min(40, 12 * n), `the engine's opinion given as the reason (${n}): ` + plain(all.find(t => AIR.test(plain(t)))).match(/[^。！？]*(AI(の|が|も|で|に)|評価|見立て|形勢|勝つ見込み|勝率)[^。！？]*/)[0].slice(0, 40)); }
  // ending variety over each bubble and over the lesson
  // (2026-11-21 the user: a lesson rated 96 still read 〜よ。〜よ。 — the bubble is read page by page, one bubble after another,
  //  so endings are counted over the whole lesson in display order, across bubbles, and the 〜よ share is held lower)
  let fam = 0, tot = 0, nda = 0, prevE = '';
  for (const t of all) { const E = sents(t).map(end);
    E.forEach((e, i) => { const pe = i ? E[i - 1] : prevE; if (e !== 'x' && e !== '？' && e !== '！' && e === pe) P(i ? 3 : 2, (i ? 'same ending twice: ' : 'same ending across bubbles: ') + e); tot++; if (e === 'よ') fam++; if (e === 'んだ') nda++; });
    if (E.length) prevE = E[E.length - 1]; }
  if (tot >= 6 && fam / tot > 0.35) P(Math.round((fam / tot - 0.35) * 60) + 5, `〜よ on ${Math.round(fam / tot * 100)}% of sentences`);
  if (tot >= 6 && nda / tot > 0.3) P(5, `〜んだ on ${Math.round(nda / tot * 100)}% of sentences`);
  if (TIC[id] && !all.some(t => TIC[id].test(plain(t)))) P(6, 'no verbal tic anywhere');
  // the guide talking, not a textbook read aloud: a share of the bubbles carries its tic (if it has one) or some feeling — ！ ？ 〜 ね かな
  if (all.length >= 5) {
    if (TIC[id]) { const r = all.filter(t => TIC[id].test(plain(t))).length / all.length; if (r < 0.2) P(Math.round((0.2 - r) * 40) + 3, `tic in only ${Math.round(r * 100)}% of bubbles`); }
    const r2 = all.filter(t => /[！？〜♪]|ね[。！]|かな/.test(plain(t))).length / all.length; if (r2 < 0.45) P(Math.round((0.45 - r2) * 40) + 3, `only ${Math.round(r2 * 100)}% of bubbles sound like someone talking`);
  }
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
  // (2026-11-21 22:56 the user, gomoku rated 100: "淡々としている… プレイヤーを応援している感情が感じられない"
  //  e.g. not 「5つ並んだ！ ぼく、踊っちゃう」 but 「5つ並んだよ！ そうそう、その調子！ どんどん行こう！」)
  // the guide cheers the player on: praise speaks to the player, a miss is softened and pushes on, the same phrase is not stamped on every bubble
  // (2026-11-21 user: the first lesson must first say what the game is and how it is won — short is fine)
  if (L.first && !(/(ゲーム|将棋)/.test(plain(L.intro)) && /(勝ち|勝つ|負け)/.test(plain(L.intro)))) P(15, 'first lesson: no "what this game is / how to win"');
  const goods = L.probs.map(p => plain(p.good)).filter(Boolean), ngs = L.probs.map(p => plain(p.ng)).filter(Boolean);
  const CHEER = /(その調子|この調子|いいね|いい感じ|ナイス|さすが|やったね|やった！|すごい|上手|じょうず|ばっちり|お見事|完璧|天才|できたね|できた！|どんどん|次も|つぎも|自信|その感じ|そうそう|わかってきた|冴えて|バッチリ|すばらしい|すてき|いい目|いい手|よく見つけ|よく気づ|見事)/;
  const PUSH = /(どんどん|次も|つぎも|この調子|その調子|行こう|いこう|進もう|続けよう|もう1問|もう一問|次は|つぎは|まだまだ|その勢い|いけるよ|いけるね|できるよ|楽しみ)/;
  const SOFT = /(おしい|惜しい|大丈夫|だいじょうぶ|ドンマイ|気にしない|次は|つぎは|今度は|今度こそ|もう一回|もう1回|あと少し|あと一歩|いい線|いっしょに|一緒に|よくある|みんな|覚えておけば|わかれば|これで覚え|平気)/;
  if (goods.length >= 2) {
    const r = goods.filter(g => CHEER.test(g)).length / goods.length; if (r < 0.8) P(Math.round((0.8 - r) * 20) + 3, `praise cheers the player in only ${Math.round(r * 100)}%`);
    if (!goods.some(g => PUSH.test(g)) && goods.length >= 3) P(3, 'praise never urges the player on (次も・その調子・どんどん…)');
    const self = goods.filter(g => /(ぼく|わたし|あたし|おれ|オイラ|わし|ボク)[、は,]?(?!.*(きみ|君))/.test(g)).length; if (self / goods.length > 0.3) P(4, 'praise is about the guide, not the player');
  }
  if (ngs.length >= 2) { const r = ngs.filter(g => SOFT.test(g)).length / ngs.length; if (r < 0.5) P(Math.round((0.5 - r) * 16) + 3, `a miss is cheered up in only ${Math.round(r * 100)}%`); }
  { const seen = new Map(); for (const t of all) for (const sn of new Set(sents(t).map(x => x.replace(/^[^、！]{1,5}(、|！ ?)/, '').trim()).filter(x => x.length >= 8))) seen.set(sn, (seen.get(sn) || 0) + 1);
    const rep = [...seen].filter(([, n]) => n >= 2); if (rep.length) P(Math.min(15, 4 * rep.length + 2), 'the same line twice in a lesson: ' + rep[0][0].slice(0, 24));
    // (2026-11-21 23:05 the user: 「安全な線があるうちは、まずはそれを使うのが基本」みたいな表現の繰り返しが最初からオンパレード — 同じセリフを繰り返さない)
    // the same idea reworded a little still reads as a repeat: a 10-char run (punctuation dropped) in 3+ bubbles
    const gram = new Map(); all.forEach(t => { const x = plain(t).replace(/[\s、。！？!?「」（）()・…〜♪]/g, ''); const g = new Set(); for (let k = 0; k + 10 <= x.length; k++) g.add(x.slice(k, k + 10)); g.forEach(v => gram.set(v, (gram.get(v) || 0) + 1)); });
    const rg = [...gram].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]); if (rg.length) P(Math.min(12, 4 + Math.floor(rg.length / 3)), `the same words in ${rg[0][1]} bubbles: ` + rg[0][0]); }
  { const flat = all.filter(t => !/[！？♪]/.test(plain(t))).length / Math.max(1, all.length); if (all.length >= 5 && flat > 0.45) P(Math.round((flat - 0.45) * 20) + 3, `${Math.round(flat * 100)}% of bubbles flat (no ！？)`); }
  const lost = pen.reduce((a, [n]) => a + n, 0);
  return { score: Math.max(0, 100 - lost), pen };
}

// (2026-11-22 the user: チェッカーは100点なのに似たような問題が続く — まだ見直しが必要)
// game-level checks a single lesson cannot see:
//  ⑨ the same position (or one a move or two apart) as another problem of the game — e.g. checkers' 「安全に進める」4問目 =
//     「1回ジャンプ」2問目 = 「連続ジャンプ」1問目 — each one after the first in display order loses 6 (max 18 a lesson)
//  ⑩ the feedback stamped in the same order in every lesson (q1 always opens 「いいね！」, q2 「さすが！」…) — a lesson whose
//     sequence of openers (first 4 chars of the praise or of the miss) matches another lesson's loses 6
//  ⑪ five problems that all teach the same single point (the praise of every problem says the same reason, reworded) —
//     the same 6-char run in the praise of every problem (4+ problems) loses 8
function gameLevel(raw, ls) {
  const tok = x => { const o = []; const walk = v => { if (v == null) return; if (typeof v === 'string') { for (const c of v) o.push(c); } else if (Array.isArray(v)) v.forEach(walk); else if (typeof v === 'object') Object.keys(v).sort().forEach(k => walk(v[k])); else o.push(String(v)); }; try { walk(JSON.parse(x)); } catch (e) {} return o; };
  const seen = [];   // [{ t, where }]
  raw.forEach((L, li) => { let hit = 0; const why = [];
    (L.probs || []).forEach((p, pi) => { const t = tok(p.pos || ''); if (t.length < 9) return;
      const m = seen.find(o => o.t.length === t.length && o.t.reduce((a, c, k) => a + (c !== t[k]), 0) <= 3);
      if (m) { hit++; why.push(`q${pi + 1} ≈ ${m.where}`); } else seen.push({ t, where: `${L.title} q${pi + 1}` }); });
    if (hit) { ls[li].pen.push([Math.min(18, 6 * hit), 'same position as another problem: ' + why.slice(0, 2).join(', ')]); } });
  const plain2 = s => String(s || '').replace(/<[^>]+>/g, '').replace(/♘e2–e4/g, '').replace(/\s/g, '');   // (♘e2–e4: the tool's stand-in for a move name, not the guide's words)
  const head = s => plain2(s).slice(0, 4);
  ['good', 'ng'].forEach(f => { const seq = raw.map(L => (L.probs || []).length >= 4 ? (L.probs || []).map(p => head(p[f])).join('|') : null);
    seq.forEach((q, li) => { if (q && seq.some((r, lj) => lj !== li && r === q)) ls[li].pen.push([6, `${f === 'good' ? 'praise' : 'miss'} openers in the same order as another lesson: ` + q.slice(0, 24)]); }); });
  raw.forEach((L, li) => { const g = (L.probs || []).map(p => plain2(p.good).replace(/[、。！？!?「」（）()・…〜♪]/g, '')); if (g.length < 4) return;
    const sets = g.map(x => { const o = new Set(); for (let k = 0; k + 6 <= x.length; k++) o.add(x.slice(k, k + 6)); return o; });
    const common = [...sets[0]].filter(v => sets.every(S => S.has(v)) && !/^(きみ|その調子|次も)/.test(v));
    if (common.length) ls[li].pen.push([8, 'every problem praised for the same point: ' + common[0]]); });
  ls.forEach(l => { l.score = Math.max(0, 100 - l.pen.reduce((a, [n]) => a + n, 0)); });
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
      .replace('window.AtlasLessons = {', 'window.__LD = DATA; window.__NC = { load: ncLoad, apply: ncApply }; window.__V = (h, id) => varyJa(lsvX(guideJa(h, id), id), id); window.__X = id => Object.assign({}, TX.ja, (VOICE[id] || {}).ja || {}); window.AtlasLessons = {');
    window.Atlas3D = window.Atlas3D || {}; if (!Atlas3D.connect4) Atlas3D.connect4 = { names: l => l === 'ja' ? ['金', '銀'] : ['Gold', 'Silver'] };
    new Function(src)();
    try { const t = await (await fetch('lsvoice-ja.js?x=' + Date.now())).text(); const w = {}; new Function('window', t)(w); __setLSV(w.AtlasLsVoice); } catch (e) {}
    const say = (h, id) => { h = String(h || '').replace(/\{fig\d*\}\s*/g, '').replace(/\{[mx]\}/g, '♘e2–e4').replace(/[  ]*\u0001/g, '').replace(/\u0002[  ]*/g, '').replace(/<p[^>]*>/g, '').replace(/<\/p>\s*/g, '<br>').replace(/(<br>\s*)+$/, ''); return h ? __V(h, id) : ''; };
    const f = (x, p) => { try { return typeof x === 'function' ? x.call(p, p && p.ans, p) : x; } catch (e) { return ''; } };   // (called as the runner does, p.good(u): go's use `this`)
    const out = {};
    for (const id of (games.length ? games : Object.keys(__LD))) { const D = __LD[id]; out[id] = [];
      try { await D.load('ja'); await __NC.load(id); for (const it of D.list('lesson', 'ja')) { let s; try { s = __NC.apply(id, await D.lesson(it.key, 'ja', __X(id))); if (window.AtlasGameIntroJa) window.AtlasGameIntroJa(id, it.key, 'lesson', s); } catch (e) { continue; } if (!s) continue;
        out[id].push({ first: !out[id].length, key: it.key, title: it.title, intro: say(s.intro, id), ramp: (s.ramp || []).flatMap(r => ['t', 'b', 'g', 'h', 'y'].map(f => r[f] && (typeof r[f] === 'string' ? r[f] : r[f].ja || r[f].en)).filter(x => x && !/^[a-o0-9\s,]+$/.test(String(x)))).map(x => say(D.rampTx ? D.rampTx(x, 'ja') : x, id)), probs: (s.probs || []).map(p => ({ pos: (() => { try { return JSON.stringify(p.pos && (p.pos.spec !== undefined ? p.pos.spec : p.pos)); } catch (e) { return ''; } })(), ask: say(p.ask, id), hint: say(p.hintTx, id), good: say(f(p.good, p) || f(p.why, p), id), ng: say(f(p.ng, p) || p.ngTx, id) })) }); } } catch (e) { out[id].push({ err: String(e) }); }
      // (2026-11-21 ユーザー：定跡・定石の問題もレッスンと同じく採点) the openings: intro, the study's notes, then the problems (no ask → the guide's opGoal, as the runner)
      if (!D.opening) continue; const oid = id + '/open', X = __X(id); out[oid] = [];
      try { for (const it of D.list('open', 'ja')) { let s; try { s = __NC.apply(id, await D.opening(it.key, 'ja')); } catch (e) { continue; } if (!s) continue;
        out[oid].push({ key: it.key, title: it.title, intro: say(s.intro, id), ramp: Object.values(s.notes || {}).map(x => say(typeof x === 'string' ? x : x.ja || x.en, id)).filter(Boolean),
          probs: (s.probs || []).map(p => ({ ask: say(p.ask || X.opGoal, id), hint: say(p.hintTx, id), good: say(f(p.good, p) || f(p.why, p), id), ng: say(f(p.ng, p) || p.ngTx, id) })) }); } } catch (e) { out[oid].push({ err: String(e) }); } }
    return out;
  }, games);
  await b.close(); srv.close();
  const rep = {}; let sum = 0, n = 0;
  // (2026-11-22) the board facts (tools/lesson-facts.js): a lesson whose marks / answers / claims do not hold on the board fails
  let FACTS = {}; try { const tmp = require('os').tmpdir() + '/lesson-facts.json'; try { require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'lesson-facts.js'), '--json', tmp], { stdio: 'ignore' }); } catch (e) {} FACTS = JSON.parse(fs.readFileSync(tmp, 'utf8')); } catch (e) {}
  for (const id in R) { const ls = R[id].filter(l => !l.err).map(l => { const o = Object.assign({ key: l.key, title: l.title }, scoreLesson(id.split('/')[0], l)); const fx = !id.includes('/') && FACTS[id] && FACTS[id][l.key]; if (fx) { o.pen = (o.pen || []).concat(fx.map(m => [60, 'wrong board fact: ' + m])); o.score = Math.max(0, o.score - 60); } return o; });
    gameLevel(R[id].filter(l => !l.err), ls);
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
