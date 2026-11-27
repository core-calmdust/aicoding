#!/usr/bin/env node
// Progress check for the 3D lessons (2026-11-22 ユーザー：チェックの問題で進行不能 — 進行チェックは必ず全問行う).
// Opens every lesson and opening of every game on the 3D table (atlas/lessons3d.js), plays every problem with the right answer
// and checks that the lesson goes on to the end: the intro, the warm-up (ramp), the study line, each problem, the result.
//   node tools/lesson-progress.js [game,game…] [--kind list|open] [--key K[,K…]] [--phone] [--jobs N] [--json out.json]
// Before each problem it checks that the board takes the player's move (chess: the answer's squares are tapped on the screen
// like a player would — the adapter must have the move among its legal moves; other games: the adapter is not over / busy).
// A lesson that stops (no progress for 25 s), throws, or ends short of full points is a failure. Exit code 1 if any.
// Needs Chrome + puppeteer-core (PUPPETEER_CORE / CHROME env). Serves the repo itself on a free port.
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const PUP = process.env.PUPPETEER_CORE || '/opt/npm-tools/node_modules/puppeteer-core';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const OPTV = new Set(['--kind', '--key', '--jobs', '--json', '--from']);
const games = (args.find((a, i) => !a.startsWith('--') && !OPTV.has(args[i - 1])) || '').split(',').filter(Boolean);
const FROM = opt('--from'), PHONE = args.includes('--phone'), JOBS = +(opt('--jobs') || 3), ONLY_KIND = opt('--kind'), ONLY_KEY = opt('--key');
const ALL = [   // (ur・senet・patolli: lessons retired 2026-11-24)
  'foxgeese', 'konane', 'ugolki', 'fanorona', 'dots', 'morris', 'mancala', 'tafl', 'shogi', 'chess', 'reversi', 'gomoku', 'go', 'checkers', 'xiangqi', 'janggi', 'backgammon', 'hex', 'amazons', 'connect4'];
const MIME = { '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.bin': 'application/octet-stream', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const S = ms => new Promise(r => setTimeout(r, ms));

async function boot(puppeteer, port, game) {
  const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const pg = await b.newPage(); await pg.setViewport(PHONE ? { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: false } : { width: 1440, height: 900 });
  await pg.setRequestInterception(true);
  pg.on('request', q => { const u = q.url(); if (u.startsWith(`http://127.0.0.1:${port}/`) || u.startsWith('data:') || u.startsWith('blob:')) q.continue(); else q.abort(); });   // (fonts / CDNs: not needed, and they hang)
  const errs = []; pg.on('pageerror', e => errs.push(String(e.message || e).slice(0, 160)));
  await pg.evaluateOnNewDocument(g => { try { localStorage.setItem('aicoding-lang', 'ja'); localStorage.setItem('atlas-play', JSON.stringify({ [g + ':mode']: 'lesson' })); } catch (e) {} }, game);
  await pg.goto(`http://127.0.0.1:${port}/atlas/#home/${game}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const dismiss = () => pg.evaluate(() => { const e = [...document.querySelectorAll('button')].find(x => /^\s*(ありがとう|受け取る|閉じる|OK)/.test(x.textContent) && x.getClientRects().length); if (e) { e.click(); return true; } return false; });
  for (let i = 0; i < 30; i++) { await S(500); await dismiss(); if (await pg.evaluate(() => !!document.getElementById('bvFull') && !!document.getElementById('bvFull').getClientRects().length)) break; }
  await S(800); await dismiss();
  await pg.evaluate(() => document.getElementById('bvFull').click());
  for (let i = 0; i < 60; i++) { await S(500); await dismiss(); if (await pg.evaluate(() => !!(window.__atlasLs && window.__atlasLs.state()))) break; }
  return { b, pg, errs, dismiss };
}

// the state of the lesson and of the board's adapter
const snap = (pg, game) => pg.evaluate(g => {
  const L = window.__atlasLs; if (!L) return null; const s = L.state(), c = L.cur(); if (!s || !c) return null;
  const nb = document.querySelector('.ls3d [data-a=next], [data-a=next]'), p = c.probs && c.probs[c.k];
  let ad = null; try { const d = window.Atlas3D[g] && window.Atlas3D[g]._dbg; ad = d && d.state ? d.state() : null; } catch (e) {}
  return { key: s.key, phase: s.phase, k: s.k, si: s.si, ri: c.ri, n: c.probs ? c.probs.length : 0, res: s.res, say: s.say.slice(0, 80),
    next: nb ? { on: !nb.disabled && !!nb.getClientRects().length, t: nb.textContent.trim() } : null, drill: !!c.drill,
    ramp: s.phase === 'ramp' && c.ramp && c.ramp[c.ri] ? c.ramp[c.ri].k : null, done: p ? !!p.done : null, kind: p ? p.kind || '' : '',
    sol: p && p.sol ? p.sol.slice() : null, ans: p ? p.ans : null, moves: (() => { try { return L.pz() && L.pz().moves ? L.pz().moves().length : null; } catch (e) { return null; } })(), mv: (() => { try { return L.pz().moves().join(' '); } catch (e) { return ''; } })(),
    ad: ad && { over: ad.over, busy: ad.busy, legal: ad.legal, pzOn: ad.pzOn, sel: ad.sel } };
}, game);

// chess: the move tapped on the screen square by square (as a player does), a promotion picked from its buttons
async function tapChess(pg, u) {
  const at = n => pg.evaluate(n => { const q = window.Atlas3D.chess._dbg.at(n); return q && { x: q.x, y: q.y }; }, n);
  for (const n of [u.slice(0, 2), u.slice(2, 4)]) { const q = await at(n); if (!q) return false; await pg.mouse.click(q.x, q.y); await S(350); }
  if (u[4]) { await S(300); await pg.evaluate(k => { const b = [...document.querySelectorAll('button[data-k]')].find(x => x.dataset.k.toLowerCase() === k); if (b) b.click(); }, u[4]); }
  return true;
}

async function runLesson(ctx, game, kind, key) {
  const { pg, errs } = ctx, e0 = errs.length, log = [];
  await pg.evaluate((k, kd) => window.__atlasLs.open(k, kd), key, kind); await S(1200);
  let last = '', idle = Date.now(), answered = new Set(), fail = null, steps = 0;
  while (steps++ < 600) {
    const s = await snap(pg, game); if (!s) { fail = 'no lesson state'; break; }
    const sig = JSON.stringify([s.phase, s.k, s.si, s.ri, s.res, s.say, s.next, s.moves, s.done]);
    if (sig !== last) { last = sig; idle = Date.now(); if (process.env.LP_DEBUG) console.log('  ', JSON.stringify([s.phase, s.k, s.ri, s.ramp, s.res, s.say.slice(0, 24), s.next, s.mv, s.done, s.ad])); }
    if (Date.now() - idle > 25000) { fail = `stuck: ${s.phase} #${s.k + 1}/${s.n} 「${s.say}」 next=${s.next && s.next.on} board=${JSON.stringify(s.ad)}`; break; }
    if (s.phase === 'done' && !s.drill && s.next && s.next.on && /次のレッスン|問題をやり直す|もう一度|やり直す|結果/.test(s.next.t) && s.res.length >= s.n) break;
    if (s.phase === 'done' && s.drill) { await pg.evaluate(() => document.querySelector('[data-a=next]').click()); await S(800); continue; }   // (chess ★: on to the route problems)
    if (s.phase === 'prob' && s.drill) { await pg.evaluate(() => window.__atlasLs.drillEnd()); await S(800); continue; }   // (the ★ stages themselves: the route problems after them are played)
    if (s.phase === 'ramp' && s.ramp === 'try' && !(s.next && s.next.on)) {
      const tag = 'r' + s.ri + ':' + s.moves; if (answered.has(tag)) { await S(400); continue; } answered.add(tag);
      for (let i = 0; i < 80; i++) { const t = await snap(pg, game); const a = t && t.ad; if (t && (t.phase !== 'ramp' || t.ri !== s.ri)) break; if (game === 'chess' ? a && !a.busy && a.pzOn && a.legal > 0 : !a || (!a.busy && !a.over)) break; await S(300); }
      const ru = await pg.evaluate(ri => { const c = window.__atlasLs.cur(), it = window.__atlasLs.state().phase === 'ramp' && c.ri === ri && c.ramp && c.ramp[c.ri]; return it ? (it.ok ? it.ok[0] : it.k === 'try' && it.ans != null ? it.ans : null) : null; }, s.ri);   // (reversi: a try's answer is it.ans)
      if (ru == null) continue;
      if (game === 'chess' && typeof ru === 'string' && /^[a-h][1-8][a-h][1-8]/.test(ru)) await tapChess(pg, ru); else await pg.evaluate(() => window.__atlasLs.rampAnswer());
      await S(900); continue;
    }
    if (s.phase === 'prob' && !s.done && (s.ans != null || s.kind === 'tfseq') && !(s.next && s.next.on && answered.has('p' + s.k))) {
      if (s.kind !== 'tsume' && s.kind !== 'tfseq' && answered.has('p' + s.k)) { await S(400); continue; }   // (answered: the move is still being played out)
      // wait for the board to take a move (pieces down, the player's turn), then play the answer like a player
      const ready = a => game === 'chess' ? a && !a.busy && a.pzOn && a.legal > 0 : !a || (!a.busy && !a.over);
      let t = null, ok = false;
      for (let i = 0; i < 80; i++) { t = await snap(pg, game); if (!t || t.k !== s.k || t.phase !== 'prob' || t.done) break; if (ready(t.ad)) { ok = true; break; } await S(300); }
      if (!t || t.k !== s.k || t.phase !== 'prob' || t.done) continue;
      if (t.kind === 'tfseq' && t.moves % 2) { await S(400); continue; }   // (tafl: the defence is still to come)
      const tag = 'p' + s.k + ':' + t.moves;
      if (answered.has(tag)) { if (!ok) { fail = `board takes no more moves: #${s.k + 1}/${s.n} 「${t.say}」 board=${JSON.stringify(t.ad)}`; break; } await S(400); continue; }
      if (!ok) { fail = `board takes no move: #${s.k + 1}/${s.n} 「${t.say}」 board=${JSON.stringify(t.ad)}`; break; }
      if (game === 'backgammon' && !t.ad) await S(2500);   // (2026-11-24 担当B: the backgammon table has no adapter state — wait for prob() to set the board up, as a player can; answering before its await board() ended let prob()'s act(次へ, off) come after 結果)
      answered.add(tag); answered.add('p' + s.k);
      let u = t.ans; if (t.kind === 'tsume' && t.sol && t.sol.length && t.moves != null) u = t.sol[t.moves];
      if (t.kind === 'tfseq') u = await pg.evaluate(() => window.__atlasLs.seqAns());   // (tafl: the N-move escape / capture, a move that keeps it forced, each turn)
      if (u == null) { fail = `no answer to play: #${s.k + 1}/${s.n}`; break; }
      if (game === 'chess' && typeof u === 'string' && /^[a-h][1-8][a-h][1-8]/.test(u)) {
        await tapChess(pg, u); await S(700);
        const t2 = await snap(pg, game);
        if (t2 && t2.k === s.k && !t2.done && t2.moves === t.moves) { fail = `tapping the answer ${u} did nothing: #${s.k + 1}/${s.n} 「${t2.say}」 board=${JSON.stringify(t2.ad)}`; break; }
      } else { await pg.evaluate(u => window.__atlasLs.answer(u), u); }
      await S(500); continue;
    }
    if (s.next && s.next.on) { await pg.evaluate(() => document.querySelector('[data-a=next]').click()); await S(450); continue; }
    await S(400);
  }
  const s = await snap(pg, game);
  if (!fail && steps >= 600) fail = 'too many steps';
  const got = s ? s.res.reduce((a, b) => a + (b || 0), 0) : 0, max = s ? s.n * 20 : 0;
  if (!fail && s && s.n && got < max) fail = `ended with ${got}/${max} (the right answers should give full points)`;
  const pe = errs.slice(e0).filter(m => !/ResizeObserver|AudioContext/.test(m));
  return { game, kind, key, ok: !fail, fail, probs: s ? s.n : 0, errors: pe };
}

(async () => {
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const puppeteer = require(PUP);
  const todo = (games.length ? games : ALL);
  const results = [];
  // the lessons of each game: one browser per game (JOBS at a time)
  const queue = todo.slice();
  async function worker() {
    while (queue.length) {
      const game = queue.shift(); let ctx;
      try { ctx = await boot(puppeteer, port, game); } catch (e) { results.push({ game, kind: '-', key: '-', ok: false, fail: 'boot: ' + e.message, errors: [] }); continue; }
      try {
        for (const kind of ['list', 'open']) {
          if (ONLY_KIND && ONLY_KIND !== kind) continue;
          const items = await ctx.pg.evaluate(k => { try { return window.__atlasLs.items ? window.__atlasLs.items(k) : null; } catch (e) { return null; } }, kind);
          if (!items) continue;
          for (const it of items) {
            if (ONLY_KEY != null && !ONLY_KEY.split(',').includes(String(it.key))) continue;   // (--key K1,K2…: several items)
            if (FROM != null && !ctx.from) { if (String(it.key) !== FROM) continue; ctx.from = true; }   // (--from K: start at the item K)
            let r; try { r = await runLesson(ctx, game, kind, it.key); } catch (e) { r = { game, kind, key: it.key, ok: false, fail: 'exception: ' + e.message, errors: [] }; }
            r.title = it.title; results.push(r);
            console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${game}${kind === 'open' ? '/open' : ''} ${it.key} ${it.title} (${r.probs}問)${r.fail ? ' — ' + r.fail : ''}${r.errors.length ? ' [JS error: ' + r.errors[0] + ']' : ''}`);
          }
        }
      } finally { await ctx.b.close().catch(() => {}); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(JOBS, todo.length) }, worker));
  srv.close();
  const bad = results.filter(r => !r.ok || r.errors.length);
  console.log(`\n${results.length} lessons, ${results.reduce((a, r) => a + (r.probs || 0), 0)} problems — ${bad.length ? bad.length + ' with a problem' : 'all go through to the end'}`);
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(results, null, 1));
  process.exit(bad.length ? 1 : 0);
})();
