#!/usr/bin/env node
// 進行チェック for the museum's rules courses (2026-11-23): opens every course on its exhibit in headless Chrome, at a phone (390×844) and a PC
// (1440×900) size, and on every page
//   ・waits for the pieces to land, then checks each ring mark sits on its piece (丸の位置ズレ, 2026-11-23 user) and every piece rests where it should
//   ・the guide's panel: its words fit (no overflow) and it leaves the board room (phone ≤ 48% of the height, PC ≤ 40%)
//   ・does the page's task by tapping the board as a player would (the glowing piece, then the place; the sticks / dice), and checks it is done
// Courses: senet shosoin sugoroku ballinderry ur ottoman ottoman-bg (the last two on the special exhibit, opened for the check only).
// Usage: node tools/museum-rules-progress.js [course,…] [--sizes phone,pc] [--json out.json]   (exit code 1 on any failure)
// Needs Chrome + puppeteer-core (PUPPETEER_CORE / CHROME env, or the defaults). Serves the repo itself on a free port.
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');
const PUP = process.env.PUPPETEER_CORE || '/opt/npm-tools/node_modules/puppeteer-core';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const only = (args.find((a, i) => !a.startsWith('--') && !/^--/.test(args[i - 1] || '')) || '').split(',').filter(Boolean);
const LANG = opt('--lang') || 'ja'; // the course runs the same in every language; a translation is tapped through with --lang en etc.
const SIZES = { phone: [390, 844, true], pc: [1440, 900, false] }, sizes = (opt('--sizes') || 'phone,pc').split(',');
// a course: [its key in museum/rules.js, the exhibit it runs on, the exhibit's second face (a two-sided board: the card's game switch)]
const ALL = [['senet', 'senet'], ['shosoin', 'shosoin'], ['sugoroku', 'sugoroku'], ['ballinderry', 'ballinderry'], ['ur', 'ur'], ['ottoman', 'ottoman'], ['ottoman-bg', 'ottoman', 1]];
const COURSES = ALL.filter(c => !only.length || only.includes(c[0]));
const MIME = { '.js': 'text/javascript', '.json': 'application/json', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.bin': 'application/octet-stream', '.wasm': 'application/wasm', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream', '.ktx2': 'image/ktx2' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); r.end(d); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const puppeteer = require(PUP);
  const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const rep = {}; let fails = 0;
  for (const [id, ex, face] of COURSES) for (const sz of sizes) {
    const [w, h, mob] = SIZES[sz], key = `${id}/${sz}`, bad = []; rep[key] = bad;
    const p = await b.newPage(); await p.setViewport({ width: w, height: h, isMobile: mob });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    // a special exhibit (ottoman: after 3 backgammon achievements) is opened for this check only, in this throwaway browser: the gallery script is served
    // with its lock test answering yes — nothing is saved, the site and the repo keep the lock (2026-11-23 user: 一時的に開いて良い、閉じるのは忘れずに)
    await p.setRequestInterception(true);
    p.on('request', q => { const u = q.url(); if (/\/atlas\/museum\/gallery\.js/.test(u)) { const f = fs.readFileSync(path.join(ROOT, 'atlas/museum/gallery.js'), 'utf8').replace('const isOpen = e => {', 'const isOpen = e => { return true;');
      q.respond({ status: 200, contentType: 'text/javascript', body: f }); } else q.continue(); });
    await p.evaluateOnNewDocument(lg => { localStorage.setItem('aicoding-lang', lg); localStorage.setItem('atlas-sfx', '0'); localStorage.removeItem('atlas-museum-orient'); }, LANG);
    try {
      await p.goto(`http://127.0.0.1:${port}/atlas/index.html#museum/${ex}`, { waitUntil: 'load' });
      await p.waitForFunction(() => window.AtlasGallery && AtlasGallery._v() && AtlasGallery._v().obj, { timeout: 90000 });
      await sleep(1500);
      await p.evaluate(() => { const c = document.querySelector('[data-k=pcfg]'); if (c && getComputedStyle(c).display !== 'none') c.click(); });
      await sleep(300);
      if (face) { await p.evaluate(() => document.querySelector('[data-k=pgame] button[data-v="1"]').click()); await sleep(800); }
      await p.evaluate(() => document.querySelector('[data-k=prules]').click());
      await p.waitForFunction(() => window.AtlasMuseumPlay && AtlasMuseumPlay._course && AtlasMuseumPlay._course(), { timeout: 30000 });
      await sleep(1500);
      const n = await p.evaluate(() => document.querySelectorAll('.exrul .dots i').length);
      const D = 'AtlasMuseumPlay._course()._debug';
      for (let pg = 0; pg < n; pg++) {
        await p.evaluate((d, k) => eval(d).show(k), D, pg); await sleep(1700);
        const tag = `p${pg + 1}`;
        // the rings on their pieces, the pieces where they rest
        const rings = await p.evaluate(d => eval(d).rings(), D);
        for (const r of rings) { const off = Math.hypot(r.ring[0] - r.rest[0], r.ring[1] - r.rest[2]), land = Math.hypot(r.piece[0] - r.rest[0], r.piece[1] - r.rest[2]);
          if (off > r.r * .08) bad.push(`${tag}: the ring on ${r.loc} is off its place by ${(off / r.r * 100).toFixed(0)}% of its size`);
          if (r.scr > r.scrR * .15) bad.push(`${tag}: on the screen the ring on ${r.loc} is ${(r.scr / r.scrR * 100).toFixed(0)}% of its radius off its piece`);
          if (land > r.r * .08) bad.push(`${tag}: the piece on ${r.loc} has not landed where it rests`); }
        // the panel
        await p.evaluate(() => { const t = document.querySelector('.exrul-t'); if (t) t.click(); });   // (the whole text at once)
        await sleep(200);
        const pan = await p.evaluate(() => { const e = document.querySelector('.exrul'), t = document.querySelector('.exrul-t'), r = e.getBoundingClientRect(); return { h: r.height, top: r.top, ov: t.scrollHeight - t.clientHeight, out: r.right > innerWidth + 1 || r.left < -1 }; });
        const lim = sz === 'phone' ? .48 : .4; if (pan.h > h * lim) bad.push(`${tag}: the panel takes ${Math.round(pan.h / h * 100)}% of the height (max ${lim * 100}%)`);
        if (pan.ov > 2) bad.push(`${tag}: the words overflow the panel by ${pan.ov}px`); if (pan.out) bad.push(`${tag}: the panel runs off the screen`);
        // the task, tapped as a player would
        const P = await p.evaluate(d => eval(d).page(), D);
        for (const st of (P.task || [])) {
          const tap = async xy => { if (!xy) { bad.push(`${tag}: nothing to tap`); return; } await p.mouse.click(xy.x, xy.y); await sleep(350); };
          if (st.t === 'roll') await tap(await p.evaluate(() => { const r = document.querySelector('.exstage canvas').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 60 }; }));
          else if (st.t === 'tap') await tap(await p.evaluate((d, t) => eval(d).spot(t), D, st.at[0]));
          else { await tap(await p.evaluate((d, t) => eval(d).piece(t), D, st.from)); await tap(await p.evaluate((d, t) => eval(d).spot(t), D, st.to)); }
          await p.waitForFunction(d => !eval(d).busy(), { timeout: 8000 }, D).catch(() => {}); await sleep(250);
        }
        if (P.task) { const ok = await p.evaluate(d => eval(d).done(), D); if (!ok) bad.push(`${tag}: the task was not done by tapping`); }
      }
      // the last page's button starts a game
      await p.evaluate(() => document.querySelector('.exrul [data-a=next]').click()); await sleep(2500);
      const g = await p.evaluate(() => !!(window.AtlasMuseumPlay && !AtlasMuseumPlay._course()) && document.querySelector('.exv').classList.contains('exv-play'));
      if (!g) bad.push('the last page did not start a game');
    } catch (e) { bad.push('error: ' + String(e).slice(0, 120)); }
    errs.forEach(e => bad.push('JS: ' + e.slice(0, 120)));
    await p.close();
    fails += bad.length; console.log(`${key.padEnd(20)} ${bad.length ? '✗ ' + bad.length : 'ok'}`); bad.slice(0, 6).forEach(x => console.log('    ' + x));
  }
  await b.close(); srv.close();
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(rep, null, 1));
  process.exitCode = fails ? 1 : 0;
})().catch(e => { console.error(e); process.exit(2); });
