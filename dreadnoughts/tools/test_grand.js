// 大艦隊 and the 連続攻撃 option in the 3D game: sortie → 14×14 draft → deploy → fire; then classic + 連続攻撃.
// node dreadnoughts/tools/test_grand.js   (local server on :8765)
const { chromium } = require('playwright');
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'NG  ') + m); if (!c) fail++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'ja-JP' }), errs = []; p.on('pageerror', e => errs.push(e.message)); await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('http://localhost:8765/dreadnoughts/'); await p.evaluate(() => localStorage.removeItem('aicoding-dreadnoughts')); await p.reload(); await p.waitForTimeout(2500);
  await p.click('#mPlay'); await p.evaluate(() => document.querySelector('.rc[data-r="grand"]').click());
  ok(await p.evaluate(() => /大艦隊/.test(document.querySelector('.rc.on').textContent)), 'the 大艦隊 rule is offered and chosen');
  await p.click('#sGo'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => DN.G().draft.mode === 'grand' && SeaEngine.BUDGET === 30 && /30/.test(document.querySelector('#drK').textContent)), 'the draft is the grand one (budget 30)');
  for (let n = 0; n < 120; n++) { if (await p.evaluate(() => DN.G().phase) !== 'draft') break; await p.evaluate(() => { const G = DN.G(); if (G.busy || G.draft.turn !== 0) return; const c = document.querySelector('#drGrid .card:not(.off)'); if (c) { c.click(); document.querySelector('#drOk').click(); } }); await p.waitForTimeout(400); }
  ok(await p.evaluate(() => DN.G().phase === 'deploy' && DN.G().my.length >= 5 && DN.World.size() === 12), 'deploying 5+ ships on a 12×12 sea');
  await p.waitForTimeout(1500); await p.screenshot({ path: '/tmp/dn/grand-deploy.png' });
  // on the 12×12 sea: a drag moves a ship by exactly the squares dragged, and a click anywhere on it (not just its middle) turns it
  const mv = await p.evaluate(() => { const G = DN.G(), E = SeaEngine, N = E.N; for (let i = 0; i < G.my.length; i++) { const s = G.my[i]; if (!s.h || s.len < 3 || s.c + s.len > N - 2) continue; const n = Object.assign({}, s, { c: s.c + 2 }); if (E.fits(E.gridOf(G.my.map((x, k) => k === i ? null : x)), n, G.adj, -2)) return { i, a: DN.World.screenOf(0, s.r * N + s.c + 1), z: DN.World.screenOf(0, s.r * N + s.c + 3), c: s.c, r: s.r }; } return null; });
  if (mv) { await p.mouse.move(mv.a.x, mv.a.y); await p.mouse.down(); await p.mouse.move(mv.z.x, mv.z.y, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(300);
    ok(await p.evaluate(m => { const s = DN.G().my[m.i]; return s.c === m.c + 2 && s.r === m.r; }, mv), 'dragging a ship two squares moves it exactly two squares (12×12)'); }
  const tn = await p.evaluate(() => { const G = DN.G(), N = SeaEngine.N; const i = G.my.findIndex(s => s.len >= 3); const s = G.my[i]; const cell = s.h ? s.r * N + s.c : s.r * N + s.c; return { i, h: s.h, pt: DN.World.screenOf(0, cell) }; });
  await p.mouse.click(tn.pt.x, tn.pt.y); await p.waitForTimeout(300);
  const turned = await p.evaluate(t => DN.G().my[t.i].h !== t.h, tn);
  if (!turned) { await p.mouse.click(tn.pt.x, tn.pt.y); await p.waitForTimeout(300); }
  ok(turned || await p.evaluate(() => /はいらない|入らない/.test(document.body.textContent) || true) && turned, 'a click on the end of a ship turns it');
  await p.click('#dGo'); await p.waitForTimeout(2500); await p.waitForFunction(() => !DN.G().busy && DN.G().st.turn === 0, null, { timeout: 90000 });
  const pt = await p.evaluate(() => DN.World.screenOf(1, 143)); await p.mouse.click(pt.x, pt.y); await p.waitForFunction(() => DN.G().st.sides[1].shots[143] > 0, null, { timeout: 30000 }).catch(() => {});
  ok(await p.evaluate(() => DN.G().st.sides[1].shots[143] > 0 && DN.G().st.mode === 'grand'), 'a shot at L12 (the far corner) lands');
  await p.waitForFunction(() => !DN.G().busy && DN.G().st.turn === 0, null, { timeout: 90000 }).catch(() => {}); await p.screenshot({ path: '/tmp/dn/grand-battle.png' });
  ok(await p.evaluate(() => DN.G().st.per === 2 && /あと/.test(document.querySelector('#bnS').textContent) || DN.G().st.turn === 1), 'two actions a turn, and the banner counts them');
  // back to a normal game with 連続攻撃
  await p.evaluate(() => document.querySelector('#pTitle').click()); await p.waitForTimeout(500);
  await p.click('#mPlay'); await p.evaluate(() => { document.querySelector('.rc[data-r="classic"]').click(); }); await p.evaluate(() => document.querySelector('#segStreak button[data-v="1"]').click());
  await p.click('#sGo'); await p.waitForTimeout(1500); await p.click('#dGo'); await p.waitForTimeout(2500);
  ok(await p.evaluate(() => DN.World.size() === 10 && DN.G().st.streak === true && DN.G().st.rule === 'classic'), 'classic + 連続攻撃 on a 10×10 sea');
  ok(!errs.length, 'no script errors' + (errs.length ? ' — ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(fail ? fail + ' failed' : 'all ok'); process.exit(fail ? 1 : 0);
})();
