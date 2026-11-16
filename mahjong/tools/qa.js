#!/usr/bin/env node
// 雀華 QA — 変更のたびに回す整合性チェック（2026-11-16、ユーザー「追加仕様の相互作用の問題をチェック。整合性をチェックする体制を」）
// 使い方: node mahjong/tools/qa.js [--base http://localhost:8765/mahjong/] [--only static,discard,...]
//   要: ローカルの静的サーバ（リポジトリの根で python3 -m http.server 8765 など）、Playwright と Chrome。
// 失敗が1つでもあれば終了コード1。各チェックは「以前に実際に起きた不具合」を見張る（下のコメントに経緯）。
'use strict';
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..', '..'), MJ = path.join(ROOT, 'mahjong');
const arg = k => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('base') || 'http://localhost:8765/mahjong/', ONLY = arg('only') ? arg('only').split(',') : null;
const res = []; const ok = (name, pass, info = '') => { res.push([name, pass, info]); console.log((pass ? '  ok   ' : '  FAIL ') + name + (info ? '  — ' + info : '')); };
const want = n => !ONLY || ONLY.includes(n);

// ---------------------------------------------------------------- static
function staticChecks() {
  console.log('[static]');
  const js = fs.readdirSync(MJ).filter(f => f.endsWith('.js'));
  for (const f of js) { try { execSync(`node --check ${JSON.stringify(path.join(MJ, f))}`, { stdio: 'pipe' }); ok('syntax ' + f, true); } catch (e) { ok('syntax ' + f, false, String(e.stderr).split('\n')[0]); } }
  // code swallowed by a comment (2026-11-16: an edit put `lx = TB.screenPose(...)` after a `//` on the same line — the player's
  // discard lost its page pose and the hand came from the table's edge). Flags a line comment that ends like a statement.
  const sus = [];
  for (const f of js) fs.readFileSync(path.join(MJ, f), 'utf8').split('\n').forEach((l, i) => {
    const m = l.match(/^(.*?[;{}),])\s*\/\/(.*)$/); if (!m || /['"`]/.test(m[2].slice(0, 3))) return;
    const c = m[2];
    if (/\)\s*[\w$.]+\s*=\s*[\w$.]+\(.*\);\s*$/.test(c) || /;\s*\}?\s*$/.test(c) && /[\w$]+\s*\(.*\)\s*;/.test(c) && /=|\.\w+\(/.test(c) && !/^\s*\(/.test(c)) sus.push(`${f}:${i + 1}`);
  });
  ok('no code hidden in comments', !sus.length, sus.join(' '));
  // a changed script or style must have its ?v= raised in index.html (CLAUDE.md) — compared with origin/main
  try {
    const diff = execSync('git diff --name-only origin/main -- mahjong', { cwd: ROOT }).toString().split('\n').filter(Boolean).map(f => path.basename(f));
    const idxNew = fs.readFileSync(path.join(MJ, 'index.html'), 'utf8'), idxOld = execSync('git show origin/main:mahjong/index.html', { cwd: ROOT }).toString();
    const v = (s, f) => (s.match(new RegExp(f.replace('.', '\\.') + '\\?v=(\\d+)')) || [])[1];
    const miss = diff.filter(f => /\.(js|css)$/.test(f) && v(idxNew, f) && v(idxNew, f) === v(idxOld, f));
    ok('?v= raised for changed files', !miss.length, miss.join(' '));
  } catch (e) { ok('?v= raised for changed files', true, 'skipped (no origin/main)'); }
}

// ---------------------------------------------------------------- runtime
async function runtime() {
  let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
  const exe = fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined;
  const b = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const PC = { viewport: { width: 1600, height: 900 } }, SP = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 };
  const page = async (o, set = {}, lang = 'ja') => {
    const ctx = await b.newContext({ ...o, locale: 'ja-JP' }); const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message)); await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await p.goto(BASE + '?fast');
    await p.evaluate(([s, l]) => { I18N.set(l); const D = JANKA.DB; D.coins = 99999; Object.assign(D.set, { mode: 'free', lite: false, skills: false, tap2: false }, s);
      D.chars = Object.assign({ yukino: { skills: ['mind:0'], use: 'mind:0', partner: 'hakuro' }, hakuro: { skills: ['wareme:0'], use: 'wareme:0' } }, D.chars); D.sel = 'yukino'; localStorage.setItem('janka-v1', JSON.stringify(D)); }, [set, lang]);
    await p.reload(); await p.waitForTimeout(1200); p.ctx = ctx; return p; };
  const myTurn = async p => { await p.evaluate(`void JANKA.startGame()`);
    await p.waitForFunction(`JANKA.UIS && JANKA.UIS.kind === 'turn' && document.querySelector('#hand .tl.drawn')`, null, { timeout: 120000 }); await p.waitForTimeout(1500);
    await p.waitForFunction(`JANKA.UIS.kind === 'turn'`, null, { timeout: 60000 }); };
  const traceReach = `(()=>{const TB=JANKA.TB;window.__rc=null;const o=TB.reach.bind(TB);TB.reach=(g,seat,f,to)=>{const r=o(g,seat,f,to);if(seat===0&&!__rc){const rig=TB.hand(0);__rc={page:!!(f&&f.page),layer:rig.layers.isEnabled(1),fx:f?f.x:null,ghost:document.querySelectorAll('.tl.ghost').length,dist:Math.hypot(rig.position.x-g.position.x,rig.position.z-g.position.z)};const iv=setInterval(()=>{if(TB._ov&&TB._ov.g)__rc.ovTile=true},10);setTimeout(()=>{clearInterval(iv);__rc.ghostLater=document.querySelectorAll('.tl.ghost').length;__rc.ovTile=!!__rc.ovTile},5000)}return r}})()`;

  if (want('discard')) { console.log('[discard] the player\'s own discard (tap, PC)');
    // 2026-11-16: the hand must take the very tile of the page's hand row (page pose, drawn over the page), the page's copy
    // stays until the hand has it
    const p = await page(PC); await myTurn(p); await p.evaluate(traceReach);
    await p.evaluate(`document.querySelector('#hand .hrow .tl[data-id]:nth-child(5)').click()`); await p.waitForFunction(`window.__rc && __rc.ghostLater !== undefined`, null, { timeout: 12000 }).catch(() => {});
    const r = await p.evaluate('__rc');
    ok('tap: the hand takes the tile from the hand row (page pose)', !!(r && r.page && r.layer), JSON.stringify(r));
    ok('tap: the copy of the tile is shown, then gone when taken', !!(r && r.ghost === 1 && r.ghostLater === 0 && r.ovTile), r && `ghost ${r.ghost}→${r.ghostLater} ovTile ${r.ovTile}`);
    ok('no page errors (game, PC)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  if (want('drag')) { console.log('[drag] phone: slide a tile to the middle');
    const p = await page(SP); await myTurn(p); await p.evaluate(traceReach);
    const el = await p.$('#hand .hrow .tl[data-id]'); const bx = await el.boundingBox(); const cx = bx.x + bx.width / 2, cy = bx.y + bx.height / 2;
    await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx, cy - 40, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(400);
    ok('short slide: the tile goes back, still my turn', await p.evaluate(`JANKA.UIS.kind === 'turn'`));
    await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx, 390 * .35, { steps: 8 });
    const lit = await p.evaluate(`!!document.querySelector('#hand .tl.hdrop')`); await p.mouse.up(); await p.waitForTimeout(1200);
    const r = await p.evaluate('__rc');
    ok('long slide: lit, discarded, the hand takes it where it was let go', lit && !!(r && r.page && r.layer), JSON.stringify(r));
    ok('no page errors (game, phone)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  if (want('banner')) { console.log('[banner] the round band is centred');
    const p = await page(PC); await p.evaluate(`void JANKA.startGame()`); await p.waitForTimeout(5000);
    await p.evaluate(`(()=>{const e=document.querySelector('#callout');e.style.left='1300px';e.style.top='700px'})()`);
    await p.evaluate(`void JANKA.roundBanner(JANKA.G)`); await p.waitForTimeout(500);
    const y = await p.evaluate(`(()=>{const r=document.querySelector('#callout .rbn-band').getBoundingClientRect();return r.top+r.height/2})()`);
    ok('round band in the middle after a call-out', Math.abs(y - 450) < 30, 'y ' + Math.round(y)); await p.ctx.close(); }

  if (want('home')) { console.log('[home] name card, top line, settings');
    for (const lang of ['ja', 'en']) {
      const p = await page(PC, {}, lang);
      const w0 = await p.evaluate(`document.querySelector('#partner').offsetWidth`);
      for (const [w, h] of [[1280, 720], [2560, 1440], [1600, 900]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(2300); }
      const w1 = await p.evaluate(`document.querySelector('#partner').offsetWidth`);
      ok(`${lang}: name card the same width after resizing back`, w0 === w1, `${w0} → ${w1}`);
      const tops = await p.evaluate(`[...document.querySelectorAll('#home .aa-top > *')].filter(e=>e.offsetWidth).map(e=>Math.round(e.getBoundingClientRect().top))`);
      ok(`${lang}: top-left and top-right share one top line`, new Set(tops).size === 1, tops.join(','));
      const ovf = await p.evaluate(`[...document.querySelectorAll('#home *')].filter(e=>{if(!e.offsetWidth||e.children.length||!e.textContent.trim())return false;const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left<-1}).map(e=>(e.className||e.tagName)+':'+e.textContent.slice(0,20))`);
      ok(`${lang}: no text runs off the home screen`, !ovf.length, ovf.slice(0, 4).join(' | '));
      await p.evaluate(`document.querySelector('#btnSet').click()`); await p.waitForTimeout(300);
      await p.mouse.click(10, 450); await p.waitForTimeout(300);
      ok(`${lang}: settings close on a click outside`, await p.evaluate(`document.querySelector('#modal').hidden`));
      ok(`${lang}: no page errors (home)`, !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); } }

  if (want('jiggle')) { console.log('[jiggle] a tap on her picture wobbles, then the picture is back');
    const p = await page(PC); const bb = await (await p.$('#pImg img')).boundingBox(); await p.mouse.click(bb.x + bb.width * .5, bb.y + bb.height * .3); await p.waitForTimeout(80);
    const on = await p.evaluate(`[document.querySelector('#pImg img').style.visibility, getComputedStyle(document.querySelector('#pImg .jig')||document.body).display]`);
    await p.waitForTimeout(1600); const off = await p.evaluate(`[document.querySelector('#pImg img').style.visibility, getComputedStyle(document.querySelector('#pImg .jig')).display]`);
    ok('the canvas takes over while it wobbles, the picture comes back', on[0] === 'hidden' && on[1] === 'block' && off[0] === '' && off[1] === 'none', on + ' → ' + off);
    ok('no page errors (jiggle)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  if (want('fonts')) { console.log('[fonts] every text in the Mincho');
    const p = await page(PC); const fams = await p.evaluate(`[...new Set([...document.querySelectorAll('body *')].filter(e=>e.offsetWidth).map(e=>getComputedStyle(e).fontFamily))]`);
    ok('only Shippori Mincho B1', fams.length === 1 && /Shippori/.test(fams[0]), fams.join(' / ')); await p.ctx.close(); }

  if (want('gacha')) { console.log('[gacha] a pull ends with the cards, no errors');
    const p = await page(PC); await p.evaluate(`document.querySelector('#btnGacha').click()`); await p.waitForTimeout(500);
    await p.evaluate(`document.querySelector('.gbtns [data-n="10"]').click()`); await p.waitForTimeout(4000);
    ok('10 cards shown', await p.evaluate(`document.querySelectorAll('#gStage .gc').length`) === 10);
    ok('the effect canvas is gone afterwards', await p.evaluate(`!document.querySelector('.gfx-cv')`));
    ok('no page errors (gacha)', !p.errs.length, p.errs.join(' | ')); await p.ctx.close(); }

  await b.close();
}
(async () => {
  if (want('static')) staticChecks();
  await runtime();
  const bad = res.filter(r => !r[1]); console.log(`\n${res.length - bad.length}/${res.length} passed` + (bad.length ? ' — FAILED: ' + bad.map(r => r[0]).join('; ') : ''));
  process.exit(bad.length ? 1 : 0);
})();
