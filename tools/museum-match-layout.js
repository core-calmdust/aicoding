// 博物館「名局選」の画面の評価 (2026-11-27 ユーザー: レイアウトはきちんと評価を用意して、高い基準を超えられるように).
// 1局を開いたときの画面を、PC・タブレット・スマホ（アラビア語の右から左も）で測り、11項目・100点で採点する。合格は 95点以上、かつ
// 必須（★）の項目がすべて満点。項目と考え方は claude/museum-match-layout.md。
// 使い方: BASE=file:///home/claude/aicoding node tools/museum-match-layout.js   (DETAIL=1 で項目ごとの測った値)
const PW = process.env.PW || '/opt/npm-tools/node_modules/playwright', CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const BASE = process.env.BASE || 'http://localhost:8765';
const { chromium } = require(PW);
const VIEWS = [[1440, 900, 'ja', 0], [1280, 720, 'en', 0], [1024, 768, 'de', 0], [390, 844, 'ja', 1], [390, 844, 'ar', 1], [320, 640, 'en', 1]];
const ITEMS = [   // [key, points, must]
  ['firstView', 15, true], ['boardSize', 10, false], ['align', 10, true], ['log', 10, false], ['note', 10, false], ['touch', 10, false],
  ['contrast', 10, true], ['overflow', 10, true], ['use', 5, false], ['tokens', 5, false], ['rtl', 5, false]];
(async () => {
  const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const score = {}; ITEMS.forEach(([k]) => score[k] = []); const notes = [];
  for (const [w, h, lang, ph] of VIEWS) {
    const c = await b.newContext({ viewport: { width: w, height: h }, isMobile: !!ph, hasTouch: !!ph, deviceScaleFactor: 1 });
    await c.addInitScript(l => { try { localStorage.setItem('aicoding-lang', l); } catch (e) {} }, lang);
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(BASE + '/atlas/index.html#museum', { waitUntil: 'load' }); await p.waitForTimeout(3500);
    await p.evaluate(() => document.querySelectorAll('#ov.on,.ov.on').forEach(o => o.classList.remove('on')));
    await p.evaluate(() => AtlasMuseum.go('match')); await p.waitForFunction(() => window.AtlasMatch && document.querySelector('.muroom[data-r="match"] .mxc'), null, { timeout: 30000 }); await p.waitForTimeout(400);   // (wait for the room, not a fixed time: a slow load used to stop the run)
    const games = await p.evaluate(() => { const seen = {}; return AtlasMatch.GAMES.filter(G => !seen[G.kind] && (seen[G.kind] = 1)).map(G => G.id); });
    for (const id of games) {
      await p.evaluate(id => { document.querySelectorAll('.mutoast,.mission,.msn').forEach(e => e.remove()); AtlasMatch.show(id); }, id); await p.waitForTimeout(600);
      await p.evaluate(() => { const n = AtlasMatch.line(AtlasMatch.GAMES.find(G => G.id === AtlasMatch.current())).mv.length; AtlasMatch._go(Math.min(13, n)); }); await p.waitForTimeout(500);
      // the view as the room leaves it right after opening the game (show() scrolls the viewer to the top)
      await p.evaluate(id => { AtlasMatch.wall(); scrollTo(0, 0); }, id); await p.waitForTimeout(300); await p.evaluate(id => AtlasMatch.open(id), id); await p.waitForTimeout(800);   // (as a visitor's press on the card: AtlasMatch.open — the list is paged, the card may be on a later page)
      await p.evaluate(() => AtlasMatch._go(13)); await p.waitForTimeout(400);
      const m = await p.evaluate(({ ph, lang }) => {
        const q = s => document.querySelector(s), R = e => e && e.getBoundingClientRect();
        const view = q('.mxview'), board = q('.mxboard'), ctl = q('.mxctl'), say = q('.mxtxt'), side = q('.mxside'), stage = q('.mxleft'), log = q('.mxlog');
        // the free band: under the page's fixed / sticky bars at the top, above those at the bottom
        let topB = 0, botB = innerHeight;
        for (const e of document.querySelectorAll('body *')) { const s = getComputedStyle(e); if ((s.position !== 'fixed' && s.position !== 'sticky') || s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) continue;
          const r = e.getBoundingClientRect(); if (r.width < innerWidth * .6 || r.height < 20 || r.height > innerHeight * .4) continue; if (e.closest('.mxview')) continue;
          if (r.top <= 2) topB = Math.max(topB, r.bottom); else if (r.bottom >= innerHeight - 2) botB = Math.min(botB, r.top); }
        const inBand = e => { const r = R(e); return r && r.top >= topB - 1 && r.bottom <= botB + 1; };
        const o = {};
        // ★ firstView: PC/tablet — board, controls and the note all in the free band at once; phone — the board and the controls, and the note starts within 1.3 screens
        if (!ph) o.firstView = (inBand(board) && inBand(ctl) && inBand(say)) ? 1 : 0;
        else { const vt = R(view).top + scrollY, nt = R(say).top + scrollY; o.firstView = (inBand(board) && inBand(ctl) ? .6 : 0) + (nt - vt < (botB - topB) * 1.3 ? .4 : 0); }
        o._band = [Math.round(topB), Math.round(botB)];
        // boardSize: PC — the board's side is 55–100% of the free band's height; phone — 90%+ of the screen's width
        const bs = R(board); o._board = [Math.round(bs.width), Math.round(bs.height)];
        o.boardSize = ph ? (bs.width >= innerWidth * .9 ? 1 : bs.width / (innerWidth * .9)) : Math.min(1, Math.max(0, (Math.min(bs.width, bs.height) / (botB - topB) - .35) / .2));
        // ★ align (PC): the side panel's top and bottom line up with the board's stage (±8 px); phone: the parts stack in one column, edges aligned (±2 px)
        if (!ph) { const a = R(stage), s = R(side); o._align = [Math.round(s.top - a.top), Math.round(s.bottom - a.bottom)]; o.align = Math.abs(s.top - a.top) <= 8 && Math.abs(s.bottom - a.bottom) <= 8 ? 1 : 0; }
        else { const xs = [stage, side].map(e => R(e)); o.align = xs.every(r => Math.abs(r.left - xs[0].left) <= 2 && Math.abs(r.right - xs[0].right) <= 2) ? 1 : 0; }
        // log: compact — PC panel ≤ 380 px wide; each move's button ≤ 2.6× its text; phone log ≤ 30% of the screen's height
        const btns = [...log.querySelectorAll('button[data-p]')].filter(x => x.offsetParent).slice(0, 12);
        const loose = btns.map(x => { const t = document.createRange(); t.selectNodeContents(x); const tw = t.getBoundingClientRect().width || 1; return x.getBoundingClientRect().width / tw; });
        const lr = R(log); o._log = [Math.round(lr.width), Math.round(lr.height), Math.round(Math.max(...loose) * 10) / 10];
        o.log = ((ph ? lr.height <= innerHeight * .3 : lr.width <= 380) ? .5 : 0) + (Math.max(...loose) <= 2.6 ? .5 : 0);
        // note: the guide's words — ≥ 15 px, line height ≥ 1.6, a line of 16–42 em
        const ss = getComputedStyle(say), fs = parseFloat(ss.fontSize), lh = parseFloat(ss.lineHeight) / fs, em = say.clientWidth / fs; o._note = [fs, Math.round(lh * 100) / 100, Math.round(em)];
        o.note = (fs >= 15 ? .4 : 0) + (lh >= 1.6 ? .3 : 0) + (em >= 16 && em <= 42 ? .3 : 0);
        // touch: the step buttons ≥ 44 px on a phone (≥ 40 on PC); the moves ≥ 32 px high
        const cb = [...ctl.querySelectorAll('button')].map(x => R(x)), mb = btns.map(x => R(x).height);
        o._touch = [Math.round(Math.min(...cb.map(r => Math.min(r.width, r.height)))), Math.round(Math.min(...mb))];
        o.touch = (Math.min(...cb.map(r => Math.min(r.width, r.height))) >= (ph ? 44 : 40) ? .6 : 0) + (Math.min(...mb) >= 32 ? .4 : 0);
        // ★ contrast (the board itself is a picture — its pieces' letters are drawn on their own shapes — and is left out): every text in the view ≥ 4.5 (≥ 3 for large text) against what is behind it
        const rgb = s => { const m = s.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
        const lum = ([r, g, b2]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b2); };
        const bg = e => { let c = [255, 255, 255]; const stack = []; for (let x = e; x; x = x.parentElement) { const v = rgb(getComputedStyle(x).backgroundColor); if (v.length < 4 || v[3] > 0) stack.push(v); if (v.length < 4 || v[3] === 1) break; }
          stack.reverse().forEach(v => { const a = v.length < 4 ? 1 : v[3]; c = c.map((k, i) => k * (1 - a) + v[i] * a); }); return c; };
        let bad = [];
        view.querySelectorAll('*').forEach(e => { if (!e.offsetParent || e.closest('svg,.mxboard') || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
          const s = getComputedStyle(e), fg = rgb(s.color), a = fg.length > 3 ? fg[3] : 1, back = bg(e), col = fg.slice(0, 3).map((k, i) => k * a + back[i] * (1 - a));
          const L1 = lum(col), L2 = lum(back), cr = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05), big = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.6 && +s.fontWeight >= 700);
          if (cr < (big ? 3 : 4.5)) bad.push(e.className + ' ' + cr.toFixed(2)); });
        o._contrast = bad.slice(0, 4); o.contrast = bad.length ? 0 : 1;
        // ★ overflow: no sideways scroll, nothing of the view outside it, no text cut off
        const vr = R(view); let out = 0, cut = 0;
        view.querySelectorAll('*').forEach(e => { if (!e.offsetParent || e.closest('.mxpcs,svg,.mxlist,.mxstrip')) return; const r = R(e); if (r.right > vr.right + 1 || r.left < vr.left - 1) out++;
          const s = getComputedStyle(e); if (s.whiteSpace === 'nowrap' && s.overflow === 'hidden' && e.scrollWidth > e.clientWidth + 1) cut++; });
        o._overflow = [document.documentElement.scrollWidth - innerWidth, out, cut]; o.overflow = document.documentElement.scrollWidth <= innerWidth && !out && !cut ? 1 : 0;
        // use (PC): the board's stage and the side panel fill the view's width (≥ 90%), no empty column beside them
        if (!ph) { const a = R(stage), s = R(side), used = (Math.max(a.right, s.right) - Math.min(a.left, s.left)) / vr.width; o._use = Math.round(used * 100) / 100; o.use = used >= .9 ? 1 : used / .9; } else o.use = 1;
        // tokens: few type sizes (≤ 8) and the site's own corner radii only
        const sizes = new Set(), radii = new Set(), OK = ['0px', '2px', '4px', '6px', '8px', '10px', '12px', '14px', '16px', '18px', '20px', '22px', '24px', '99px', '50%', '999px'];
        view.querySelectorAll('*').forEach(e => { if (!e.offsetParent || e.closest('svg,.mxboard')) return; const s = getComputedStyle(e); if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) sizes.add(s.fontSize); radii.add(s.borderTopLeftRadius); });
        const odd = [...radii].filter(r => !OK.includes(r)); o._tokens = [[...sizes].length, odd]; o.tokens = (sizes.size <= 8 ? .5 : 0) + (odd.length ? 0 : .5);
        // rtl: in Arabic the side panel stands on the board's left (PC) / the page reads right to left, while the board itself stays left to right
        o.rtl = lang !== 'ar' ? 1 : (getComputedStyle(board).direction === 'ltr' && getComputedStyle(view).direction === 'rtl' ? 1 : 0);
        return o;
      }, { ph, lang });
      for (const [k] of ITEMS) score[k].push(m[k]);
      if (process.env.DETAIL) console.log(`${w}x${h}:${lang} ${id}`, JSON.stringify(Object.fromEntries(Object.entries(m).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v * 100) / 100 : v]))));
      if (errs.length) notes.push(`${w}x${h} ${id}: ${errs[0]}`);
    }
    await c.close();
  }
  await b.close();
  let total = 0, mustOK = true; const line = [];
  for (const [k, pt, must] of ITEMS) { const v = score[k].length ? score[k].reduce((a, x) => a + x, 0) / score[k].length : 0, got = Math.round(v * pt * 10) / 10; total += got; if (must && v < 1) mustOK = false; line.push(`${must ? '★' : ''}${k} ${got}/${pt}`); }
  console.log(line.join(' · '));
  console.log(`SCORE ${Math.round(total * 10) / 10} / 100 — ${total >= 95 && mustOK ? 'PASS' : 'FAIL'} (合格: 95点以上、★がすべて満点)`);
  notes.forEach(n => console.log('js: ' + n));
})();
