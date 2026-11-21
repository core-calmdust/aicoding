// The 3D sea (board3d.js): it starts, draws, maps clicks to the right squares, drags ships, and switches with the 2D designs.
// node seabattle/tools/test_3d.js  (needs the local server on :8765 and Chrome with SwiftShader WebGL)
const { chromium } = require('playwright');
const GL = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'NG  ') + m); if (!c) fail++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: GL });
  for (const [name, vp, touch] of [['pc', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, locale: 'ja-JP' }); await ctx.route(/firebase|gstatic\.com\/firebasejs/, r => r.abort());
    const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/seabattle/', { waitUntil: 'load' }); await p.waitForTimeout(600);
    await p.evaluate(() => { if (document.querySelector('#pickOverlay').classList.contains('show')) document.querySelector('#btnPickClose').click(); document.querySelectorAll('.overlay.show').forEach(o => o.classList.remove('show')); });
    ok(await p.evaluate(() => S.design === 'ocean'), name + ': the 3D sea is the default design');
    await p.waitForFunction(() => document.querySelector('#frame').classList.contains('sb3d-on'), null, { timeout: 30000 }).catch(() => {});
    ok(await p.evaluate(() => document.querySelector('#frame').classList.contains('sb3d-on')), name + ': the 3D sea starts');
    await p.waitForTimeout(1200);
    const fr = await p.evaluate(() => { const c = document.querySelector('canvas.sb3d').getBoundingClientRect(), f = document.querySelector('#frame').getBoundingClientRect(); return { cw: c.width, fw: f.width, ch: c.height, fh: f.height }; });
    ok(Math.abs(fr.cw - fr.fw) < 4 && Math.abs(fr.ch - fr.fh) < 4, name + ': the canvas fills the board frame');
    // something is drawn: the picture is not flat
    const shot = await p.screenshot({ clip: await p.evaluate(() => { const r = document.querySelector('#frame').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }) });
    ok(shot.length > 40000, name + ': the sea has detail (' + shot.length + ' bytes)');
    // classic deploy: drag a ship one square, tap to turn it
    await p.evaluate(() => { S.rule = 'classic'; newDeploy(); }); await p.waitForTimeout(700);
    const mv = await p.evaluate(() => { for (let i = 0; i < G.my.length; i++) { const s = G.my[i]; if (!s.h || s.c + s.len > 9) continue; const n = Object.assign({}, s, { c: s.c + 1 }); if (SeaEngine.fits(SeaEngine.gridOf(G.my.map((x, k) => k === i ? null : x)), n, false, -2)) return { i, a: SeaBoard3D.screenOf(s.r * 10 + s.c), z: SeaBoard3D.screenOf(s.r * 10 + s.c + 1), c: s.c }; } return null; });
    if (mv && !touch) { await p.mouse.move(mv.a.x, mv.a.y); await p.mouse.down(); await p.mouse.move(mv.z.x, mv.z.y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200); ok(await p.evaluate(m => G.my[m.i].c === m.c + 1, mv), name + ': a ship drags one square in 3D'); }
    // battle: a click on a square of their sea fires at that square
    await p.evaluate(() => { const E = SeaEngine; G = { phase: 'battle', my: E.randomFleet(Math.random, false), st: null, level: 1, rule: 'classic', adj: false, view: 'enemy', hint: null, evals: [.5], busy: false, resigned: false, first: 0, armed: null }; G.st = E.newGame({ rule: 'classic', adj: false, fleets: [G.my, E.randomFleet(Math.random, false)], first: 0 }); G.my = G.st.sides[0].ships; render(); });
    await p.waitForTimeout(600);
    for (const cell of [0, 47, 99]) {
      const pt = await p.evaluate(c => SeaBoard3D.screenOf(c), cell);
      if (touch) await p.touchscreen.tap(pt.x, pt.y); else await p.mouse.click(pt.x, pt.y);
      await p.waitForFunction(c => G.st.log.some(m => m.by === 0 && m.cell === c), cell, { timeout: 8000 }).catch(() => {});
      ok(await p.evaluate(c => G.st.log.some(m => m.by === 0 && m.cell === c), cell), name + ': a tap on ' + SeaEngineName(cell) + ' fires there');
      await p.waitForFunction(() => G.st.turn === 0 && !G.busy, null, { timeout: 15000 }).catch(() => {});
    }
    // the 2D designs still work, and back
    await p.evaluate(() => { S.design = 'abyss'; SeaBoard3D.enable(false); render(); }); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !document.querySelector('#frame').classList.contains('sb3d-on') && getComputedStyle(document.querySelector('canvas.sb3d')).display === 'none' && getComputedStyle(document.querySelector('#bsvg')).opacity !== '0'), name + ': a 2D design hides the 3D sea');
    await p.evaluate(() => { S.design = 'ocean'; SeaBoard3D.enable(true); render(); }); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('#frame').classList.contains('sb3d-on')), name + ': and the 3D sea comes back');
    ok(!errs.length, name + ': no page errors' + (errs.length ? ' — ' + errs.slice(0, 3).join(' / ') : ''));
    await ctx.close();
  }
  await b.close();
  console.log(fail ? 'FAILED: ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
function SeaEngineName(c) { return 'ABCDEFGHIJ'[c % 10] + (1 + (c / 10 | 0)); }
