#!/usr/bin/env node
/* Portal game-list thumbnails: atlas/shots/<id>.webp (520×390, 4:3) — a real play screen of every game.

   usage:  node tools/shots.js [id,id,...] [--live] [--port 8943] [--probe]
     default  crops the game's play screenshot the top page already uses (images/<file>.webp, mid-game
              positions taken in headless Chrome) to 4:3 around the board and writes a small WebP
     --live   captures the game page itself in headless Chrome instead (one browser, one game at a time):
              first-visit dialogs are skipped, the board is found and cropped 4:3 (recipes in GAMES below);
              serves the repo with `python3 -m http.server` unless something already listens on --port
     --check  only reports thumbnails older than their source screenshot (git commit time, else file time) — run it after
              a game's top-page image is retaken, then regenerate those ids and bump SHOT_V in atlas/gamelist.js
     --probe  (with --live) also saves the full screen to atlas/shots/_probe/<id>.png (don't commit it)
   needs Python Pillow; --live also puppeteer-core + Chrome (env PUPPETEER / CHROME override the paths).
   Adding a game: add an entry to GAMES (img = its images/ file, or a live recipe), run
   `node tools/shots.js <id>`, add the id to SHOTS in atlas/gamelist.js and bump SHOT_V / its ?v. */
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'atlas/shots');
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const W = 520, H = 390;                 // 2× the largest card image (≈260×195 on PC)
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- per-game recipes ----------
   img    the play screenshot in images/ (default <id>.webp) · fx, fy: crop centre (0..1) · zoom: <1 crops tighter
   --live only:
   path   page to open (relative to the repo root)
   board  CSS selector of the board (default: the largest visible board-ish element)
   prep   async (page, h) => {}   extra steps: start a game, play a few moves …
   pad    extra room around the board (fraction of its height, default .05)  */
const clickBoard = async (page, sel, n, wait = 700) => {     // random taps on the board: placement games fill up with real moves (and AI replies)
  for (let i = 0; i < n; i++) {
    const r = await page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sel);
    if (!r) return;
    const u = .25 + Math.random() * .5, v = .25 + Math.random() * .5;
    await page.mouse.click(r.x + r.w * u, r.y + r.h * v); await sleep(wait);
  }
};
const GAMES = {
  shogi: {}, chess: {}, checkers: { zoom: .84 }, ugolki: {}, konane: {}, senet: { zoom: .84 }, fanorona: {}, alquerque: { zoom: .84 }, xiangqi: {}, janggi: {}, tafl: {},
  reversi: { img: 'reversi_v4.webp', zoom: .84 }, go: {}, gomoku: {}, dots: { zoom: .84 }, connect4: { img: 'connect4_v2.webp', zoom: .84 }, morris: { zoom: .84 },
  hex: {}, mancala: { zoom: .8 }, backgammon: { img: 'backgammon_v2.webp' },
  sudoku: { path: 'sudoku/' }, speedsudoku: { img: 'speed-sudoku.webp', path: 'speed-sudoku/' }, samegame: { fx: .62 }, jailbreak: {},
  poker: {}, baccarat: {}, blackjack: {}, solitaire: {},
};

/* ---------- generic helpers (run in the page) ---------- */
// close first-visit dialogs: profile/name prompts, how-to-play tours, login bonuses …
const DISMISS = /^(あとで|後で|later|not now|スキップ|skip|閉じる|close|×|✕|✖|ok|はじめる|start|とじる)$/i;
async function dismiss(page) {
  for (let k = 0, miss = 0; k < 14 && miss < 4; k++) {
    const hit = await page.evaluate(reS => {
      const re = new RegExp(reS, 'i'), vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .05; };
      const b = [...document.querySelectorAll('button,[role=button],a.btn')].filter(vis).find(e => re.test((e.textContent || e.getAttribute('aria-label') || '').trim()));
      if (b) { b.click(); return (b.textContent || '').trim().slice(0, 20); }
      const d = [...document.querySelectorAll('dialog[open]')][0]; if (d) { d.close(); return 'dialog'; }
      return null;
    }, DISMISS.source);
    miss = hit ? 0 : miss + 1;
    await sleep(600);
  }
}
async function boardRect(page, sel) {
  return page.evaluate(sel => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 120 && r.height > 120 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < innerHeight; };
    let el = sel && document.querySelector(sel);
    if (!el) {
      const c = [...document.querySelectorAll('canvas,svg,[id*=board i],[class*=board i],[id*=grid i],[class*=grid i],[class*=table i],[id*=table i]')].filter(vis)
        .filter(e => !e.closest('dialog,[class*=modal i],[class*=overlay i]'));
      c.sort((a, b) => { const A = a.getBoundingClientRect(), B = b.getBoundingClientRect(); return B.width * B.height - A.width * A.height; });
      el = c.find(e => { const r = e.getBoundingClientRect(); return r.width < innerWidth * .95 || r.height < innerHeight * .9; }) || c[0];
    }
    if (!el) return null;
    const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, tag: el.tagName + '#' + el.id + '.' + String(el.className.baseVal ?? el.className).slice(0, 40) };
  }, sel || null);
}

// crop an existing screenshot to 4:3 (largest box, scaled by zoom, centred on fx/fy) → 520×390 WebP
function fromImage(id, G) {
  const src = path.join(ROOT, 'images', G.img || id + '.webp'), out = path.join(OUT, id + '.webp');
  if (!fs.existsSync(src)) return null;
  execFileSync('python3', ['-c', `
import sys
from PIL import Image
src, out, W, H, fx, fy, z, q = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6]), float(sys.argv[7]), int(sys.argv[8])
im = Image.open(src).convert('RGB'); w, h = im.size
cw = min(w, h * W / H) * z; ch = cw * H / W
x = min(max(0, w * fx - cw / 2), w - cw); y = min(max(0, h * fy - ch / 2), h - ch)
im.crop((round(x), round(y), round(x + cw), round(y + ch))).resize((W, H), Image.LANCZOS).save(out, 'WEBP', quality=q, method=6)
`, src, out, W, H, G.fx ?? .5, G.fy ?? .5, G.zoom ?? 1, G.q ?? 74]);
  return out;
}
function toWebp(png, out) {
  try { execFileSync('cwebp', ['-quiet', '-q', '72', '-m', '6', '-resize', String(W), String(H), png, '-o', out]); return; } catch (e) {}
  execFileSync('python3', ['-c', `from PIL import Image;Image.open(${JSON.stringify(png)}).convert('RGB').resize((${W},${H}),Image.LANCZOS).save(${JSON.stringify(out)},'WEBP',quality=72,method=6)`]);
}

(async () => {
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
  const port = +(opt('--port') || 8943), probe = args.includes('--probe'), live = args.includes('--live');
  let ids = (args.find(a => !a.startsWith('--') && a !== opt('--port')) || Object.keys(GAMES).join(',')).split(',');
  fs.mkdirSync(OUT, { recursive: true });
  // a thumbnail older than the screenshot it was cut from is out of date (warned on every run; --check stops there)
  const when = f => { try { const t = +execFileSync('git', ['log', '-1', '--format=%ct', '--', f], { cwd: ROOT }).toString().trim(); if (t) return t * 1000; } catch (e) {} try { return fs.statSync(f).mtimeMs; } catch (e) { return 0; } };
  const stale = Object.keys(GAMES).filter(id => { const src = path.join(ROOT, 'images', GAMES[id].img || id + '.webp'), out = path.join(OUT, id + '.webp');
    return fs.existsSync(src) && (!fs.existsSync(out) || when(src) > when(out)); });
  if (stale.length) console.log('⚠ out of date (source image is newer):', stale.join(', '));
  if (args.includes('--check')) { if (!stale.length) console.log('all thumbnails are up to date'); return; }
  if (!live) {      // from the existing screenshots; games without one fall through to a live capture
    ids = ids.filter(id => { const G = GAMES[id]; const o = G && fromImage(id, G); if (o) console.log(id.padEnd(12), (fs.statSync(o).size / 1024).toFixed(1) + ' KB', 'images/' + (G.img || id + '.webp')); return G && !o; });
    if (!ids.length) return;
  }
  const puppeteer = require(process.env.PUPPETEER || '/opt/npm-tools/node_modules/puppeteer-core');
  let srv = null;
  const up = await new Promise(r => require('net').connect(port, '127.0.0.1').on('connect', function () { this.destroy(); r(true); }).on('error', () => r(false)));
  if (!up) { srv = spawn('python3', ['-m', 'http.server', String(port)], { cwd: ROOT, stdio: 'ignore' }); await sleep(800); }
  fs.mkdirSync(OUT, { recursive: true }); if (probe) fs.mkdirSync(path.join(OUT, '_probe'), { recursive: true });
  const br = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio',
    '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4'] });
  for (const id of ids) {
    const G = GAMES[id]; if (!G) { console.log(id, ': no recipe'); continue; }
    const page = await br.newPage();
    try {
      await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
      await page.evaluateOnNewDocument(() => {
        try {
          localStorage.setItem('aicoding-lang', 'ja');
          localStorage.setItem('atlas-profile-asked', '1');   // the site-wide "pick a name / link Google" prompt
          // skip first-visit name prompts: every game reads "<game>-online-name"-style keys
          for (const k of ['shogi', 'chess', 'reversi', 'checkers', 'ugolki', 'fanorona', 'alquerque', 'xiangqi', 'tafl', 'go', 'gomoku', 'dots', 'connect4', 'c4', 'mancala', 'backgammon', 'morris', 'hex'])
            localStorage.setItem(k + '-online-name', 'Atlas');
        } catch (e) {}
      });
      await page.goto(`http://localhost:${port}/${G.path || id + '/'}`, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
      await sleep(G.wait || 2500);
      await dismiss(page);
      if (G.prep) await G.prep(page, { clickBoard, dismiss, sleep });
      await sleep(600);
      const tmp = path.join(OUT, `_${id}.png`);
      if (probe) await page.screenshot({ path: path.join(OUT, '_probe', id + '.png') });
      const b = await boardRect(page, G.board);
      let clip;
      if (G.clip) clip = G.clip;
      else if (b) {
        const pad = G.pad ?? .05, h = Math.min(800, b.h * (1 + pad * 2)), w = Math.min(1280, h * 4 / 3), hh = w * 3 / 4;
        const cx = b.x + b.w / 2 + (G.dx || 0), cy = b.y + b.h / 2 + (G.dy || 0);
        clip = { x: Math.max(0, Math.min(1280 - w, cx - w / 2)), y: Math.max(0, Math.min(800 - hh, cy - hh / 2)), width: w, height: hh };
      } else clip = { x: 107, y: 0, width: 1067, height: 800 };
      await page.screenshot({ path: tmp, clip });
      const out = path.join(OUT, id + '.webp'); toWebp(tmp, out); fs.unlinkSync(tmp);
      console.log(id.padEnd(12), (fs.statSync(out).size / 1024).toFixed(1) + ' KB', b ? b.tag : '(no board found)');
    } catch (e) { console.log(id, 'FAILED', e.message); }
    await page.close();
  }
  await br.close(); if (srv) srv.kill();
})();
