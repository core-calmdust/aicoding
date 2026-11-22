// DREADNOUGHTS: title → sortie → draft → deploy → battle → result, on PC and phone, in headless Chrome (SwiftShader WebGL).
// node dreadnoughts/tools/test.js   (needs the local server on :8765:  python3 -m http.server 8765)
const { chromium } = require('playwright');
const GL = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const SHOTS = process.env.SHOTS || '';
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'NG  ') + m); if (!c) fail++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: GL });
  for (const [name, vp, touch] of [['pc', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, locale: 'ja-JP' });
    await ctx.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
    const shot = async k => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${name}-${k}.png` }); };
    const tap = async pt => { if (touch) await p.touchscreen.tap(pt.x, pt.y); else await p.mouse.click(pt.x, pt.y); };
    const myTurn = () => p.waitForFunction(() => { const G = DN.G(); return G.phase !== 'battle' || (!G.busy && G.st.turn === 0); }, null, { timeout: 90000 }).catch(() => {});
    await p.goto('http://localhost:8765/dreadnoughts/', { waitUntil: 'load' });
    await p.evaluate(() => localStorage.removeItem('aicoding-dreadnoughts')); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(2500);
    ok(await p.evaluate(() => DN.G().phase === 'title' && !document.querySelector('#scrTitle').classList.contains('hide')), name + ': the title screen');
    const lg = await p.evaluate(() => { const r = document.querySelector('.logo').getBoundingClientRect(); return r.right <= innerWidth + 1 && document.querySelector('.logo').scrollWidth <= document.querySelector('.logo').clientWidth + 2; });
    ok(lg, name + ': the logo fits the screen'); await shot('title');
    // archive: every ship type, with a turning 3D preview
    await p.click('#mArchive'); await p.waitForTimeout(800);
    ok(await p.evaluate(() => document.querySelectorAll('#arGrid .card').length === SeaEngine.TYPES.length), name + ': the archive lists all ' + 50 + ' ships');
    await p.evaluate(() => document.querySelector('#scrArchive [data-close]').click());
    // setup: tactics is the default rule
    await p.click('#mPlay'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('.rc.on').dataset.r === 'tactics'), name + ': tactics is the default rule'); await shot('setup');
    await p.click('#sGo'); await p.waitForTimeout(1500);
    ok(await p.evaluate(() => DN.G().phase === 'draft'), name + ': the draft opens'); await p.waitForTimeout(1500); await shot('draft');
    ok(await p.evaluate(() => [...document.querySelectorAll('#drGrid .card')].every(c => c.querySelector('.art svg.reach') && c.querySelector('.desc').textContent.length > 4)), name + ': every draft card shows the reach diagram and what the ship does');
    ok(await p.evaluate(() => new Set([...document.querySelectorAll('#drGrid .card')].map(c => c.offsetHeight)).size === 1), name + ': the draft cards are all one height');
    // tap a card to choose it, tap again to undo
    await p.waitForFunction(() => { const G = DN.G(); return G.phase !== 'draft' || (!G.busy && G.draft.turn === 0); }, null, { timeout: 30000 });
    // (phones: a tap opens the card's detail, picked from its button — 2026-11-23)
    await p.evaluate(() => { window.__pick = c => { c.click(); const b = document.querySelector('#cardPop:not(.hide) #cpPick:not(.hide)'); if (b) b.click(); }; });
    if (touch) { ok(await p.evaluate(() => { const c = document.querySelector('#drGrid .card:not(.off)'); c.click(); const pop = document.querySelector('#cardPop'), ok = !pop.classList.contains('hide') && !!pop.querySelector('.card .desc') && !document.querySelector('#cpPick').classList.contains('hide'); document.querySelector('#cpClose').click(); return ok && pop.classList.contains('hide') && !document.querySelector('#drGrid .card.sel'); }), name + ': a tapped tile opens its detail (with the pick button), closing picks nothing'); }
    const k0 = await p.evaluate(() => { const c = document.querySelector('#drGrid .card:not(.off)'); __pick(c); return +c.dataset.k; });
    ok(await p.evaluate(k => document.querySelector(`#drGrid .card[data-k="${k}"]`).classList.contains('sel') && !document.querySelector('#drOk').disabled, k0), name + ': a tapped card is chosen');
    await p.evaluate(k => __pick(document.querySelector(`#drGrid .card[data-k="${k}"]`)), k0);
    ok(await p.evaluate(() => !document.querySelector('#drGrid .card.sel') && document.querySelector('#drOk').disabled), name + ': a second tap undoes it');
    for (let n = 0; n < 60; n++) { const ph = await p.evaluate(() => DN.G().phase); if (ph !== 'draft') break;
      await p.evaluate(() => { const G = DN.G(); if (G.busy || G.draft.turn !== 0) return; const c = document.querySelector('#drGrid .card:not(.off)'); if (c) { __pick(c); document.querySelector('#drOk').click(); } }); await p.waitForTimeout(500); }
    ok(await p.evaluate(() => DN.G().phase === 'deploy' && DN.G().my.length >= 3), name + ': the draft ends in the deployment');
    await p.waitForTimeout(1800); await shot('deploy');
    // deploy: drag a ship one square (PC)
    if (!touch) {
      const mv = await p.evaluate(() => { const G = DN.G(), E = SeaEngine; for (let i = 0; i < G.my.length; i++) { const s = G.my[i]; if (!s.h || s.c + s.len > 9) continue; const n = Object.assign({}, s, { c: s.c + 1 }); if (E.fits(E.gridOf(G.my.map((x, k) => k === i ? null : x)), n, G.adj, -2)) return { i, a: DN.World.screenOf(0, s.r * 10 + s.c), z: DN.World.screenOf(0, s.r * 10 + s.c + 1), c: s.c }; } return null; });
      if (mv) { await p.mouse.move(mv.a.x, mv.a.y); await p.mouse.down(); await p.mouse.move(mv.z.x, mv.z.y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200); ok(await p.evaluate(m => DN.G().my[m.i].c === m.c + 1, mv), name + ': a ship drags one square'); }
    }
    await p.click('#dGo'); await p.waitForTimeout(2500);
    ok(await p.evaluate(() => DN.G().phase === 'battle'), name + ': the battle starts');
    await myTurn(); await shot('battle');
    // the fleets sheet: both sides as cards
    await p.evaluate(() => document.querySelector('#pMine').click()); await p.waitForTimeout(300);
    ok(await p.evaluate(() => !document.querySelector('#scrFleet').classList.contains('hide') && document.querySelectorAll('#flBody .card').length >= 6), name + ': the fleets sheet lists both sides');
    await p.evaluate(() => document.querySelector('#scrFleet [data-close]').click());
    // I: the 3D DEBUG panel
    if (!touch) { await p.keyboard.press('i'); await p.waitForTimeout(800); ok(await p.evaluate(() => { const d = document.querySelector('.t3dbg'); return d && !d.hidden && /draw calls/.test(d.textContent) && /fps/.test(d.textContent); }), name + ': I shows the 3D DEBUG panel'); await shot('debug'); await p.keyboard.press('i'); }
    // hover a skill: its card with the reach
    if (!touch) { const sk = await p.$('#dock .sk'); if (sk) { await sk.hover(); await p.waitForTimeout(300); ok(await p.evaluate(() => !document.querySelector('#skTip').classList.contains('hide') && !!document.querySelector('#skTip svg.reach')), name + ': a skill shows its card on hover'); await shot('tip'); await p.mouse.move(5, 300); } }
    // a tap on a square of the enemy waters fires at it
    for (const cell of [0, 55, 99]) {
      await myTurn(); if (await p.evaluate(() => DN.G().phase !== 'battle')) break;
      if (await p.evaluate(c => DN.G().st.sides[1].shots[c], cell)) continue;
      const pt = await p.evaluate(c => DN.World.screenOf(1, c), cell); await tap(pt); await p.waitForTimeout(400);
      ok(await p.evaluate(c => DN.G().st.sides[1].shots[c] > 0 || DN.G().busy, cell), name + ': a tap fires at square ' + cell);
    }
    await myTurn(); await p.waitForTimeout(600); await shot('fire');
    // finish: sink everything but one square, then take it
    await myTurn();
    const last = await p.evaluate(() => { const G = DN.G(), sd = G.st.sides[1]; const cells = []; sd.ships.forEach((s, i) => { if (!sd.sunk[i]) for (let k = 0; k < s.len; k++) cells.push(s.h ? s.r * 10 + s.c + k : (s.r + k) * 10 + s.c); }); return cells; });
    await p.evaluate(cells => { const G = DN.G(), sd = G.st.sides[1]; for (const c of cells.slice(0, -1)) { sd.shots[c] = 2; } sd.ships.forEach((s, i) => { sd.hitsOn[i] = s.len; }); }, last);
    await p.evaluate(cells => { const G = DN.G(), sd = G.st.sides[1], c = cells[cells.length - 1], i = sd.grid[c]; sd.hitsOn[i] = sd.ships[i].len - 1; sd.ships.forEach((s, j) => { if (j !== i && !sd.sunk[j]) { sd.sunk[j] = true; sd.afloat--; } }); sd.fog = 0; sd.armor = sd.armor && sd.armor.map(() => 0); }, last);
    // (passives such as armour can turn a hit aside: keep firing at the last ship's open squares until it goes down)
    for (let n = 0; n < 6; n++) { await myTurn(); if (await p.evaluate(() => DN.G().phase !== 'battle')) break;
      const c = await p.evaluate(cells => { const sd = DN.G().st.sides[1]; return cells.find(c => !sd.shots[c] || sd.shots[c] === 1) ?? cells.find(c => sd.grid[c] >= 0 && !sd.sunk[sd.grid[c]]); }, last);
      if (c == null) break; const pt = await p.evaluate(c => DN.World.screenOf(1, c), c); await tap(pt); await p.waitForTimeout(1500); }
    await p.waitForFunction(() => !document.querySelector('#scrResult').classList.contains('hide'), null, { timeout: 30000 }).catch(() => {});
    ok(await p.evaluate(() => DN.G().phase === 'over' && document.querySelector('#rsBig').textContent === 'VICTORY'), name + ': sinking the last ship wins'); await shot('result');
    await p.click('#rsTitle'); await p.waitForTimeout(500);
    ok(await p.evaluate(() => DN.G().phase === 'title'), name + ': back to the title');
    ok(!errs.length, name + ': no script errors' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }
  await b.close(); console.log(fail ? fail + ' failed' : 'all ok'); process.exit(fail ? 1 : 0);
})();
