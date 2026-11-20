// タクティクス flow test (playwright + Chrome; python3 -m http.server 8765 first): draft by tapping, every skill, AI skills, reload. Screenshots → /tmp/shots
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errs = []; let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('NG  ' + m); } else console.log('ok  ' + m); };
  for (const [name, vp, touch] of [['pc', { width: 1280, height: 720 }, false], ['ph', { width: 390, height: 844 }, true]]) {
    const ctx = await b.newContext({ viewport: vp, hasTouch: touch, isMobile: touch, locale: 'ja-JP', deviceScaleFactor: touch ? 2 : 1 });
    await ctx.route(/fonts\.(googleapis|gstatic)|firebase|gstatic/, r => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(name + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(name + ': ' + m.text()); });
    await p.goto('http://localhost:8765/seabattle/', { waitUntil: 'load' }); await p.waitForTimeout(500);
    const shot = n => p.screenshot({ path: '/tmp/shots/' + name + '-' + n + '.png' });
    const tap = sel => touch ? p.tap(sel) : p.click(sel);
    await tap('#btnNew'); await p.waitForTimeout(400); await shot('tac-new');
    await p.evaluate(() => { document.querySelector('#ruleCards [data-v=tactics]').click(); }); await tap('#btnStart'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => G.phase === 'draft' && document.body.classList.contains('drafting')), name + ': tactics starts with the draft');
    let guard = 0;
    while (await p.evaluate(() => G.phase === 'draft') && guard++ < 14) {
      await p.waitForFunction(() => G.phase !== 'draft' || (!G.busy && G.draft.turn === 0), null, { timeout: 8000 });
      if (!(await p.evaluate(() => G.phase === 'draft'))) break;
      if (guard === 2) await shot('tac-draft');
      await p.waitForFunction(() => document.querySelector('#pickOverlay').classList.contains('show'), null, { timeout: 4000 }); await p.waitForTimeout(250);   // (the pick sheet opens by itself on my turn)
      if (guard === 2) await shot('tac-pick');
      for (const g of await p.evaluate(() => [...document.querySelectorAll('#pickTabs button')].map(b => b.dataset.g))) { if (await p.evaluate(() => !!document.querySelector('#pickGrid .pc.can'))) break; await tap('#pickTabs button[data-g="' + g + '"]'); await p.waitForTimeout(120); }   // (look through the role tabs)
      const sel = await p.evaluate(() => { const b = document.querySelector('#pickGrid .pc.can'); return b ? '#pickGrid .pc[data-k="' + b.dataset.k + '"]' : '#btnPickStop'; });   // (tap the card itself)
      await tap(sel); await p.waitForTimeout(150);
      if (sel !== '#btnPickStop') {   // (a tapped card is only chosen: tapping it again undoes it, 決定 takes it)
        if (!(await p.evaluate(s => document.querySelector(s).classList.contains('sel') && !document.querySelector('#btnPickOk').disabled, sel))) { console.log('NG  a tapped card is chosen, not taken'); fail++; }
        if (guard === 2) { await tap(sel); await p.waitForTimeout(120); if (!(await p.evaluate(s => !document.querySelector(s).classList.contains('sel') && document.querySelector('#btnPickOk').disabled && G.draft.turn === 0, sel))) { console.log('NG  tapping the chosen card again undoes it'); fail++; } await tap(sel); await p.waitForTimeout(120); }
        await tap('#btnPickOk'); await p.waitForTimeout(150);
      }
    }
    ok(await p.evaluate(() => G.phase === 'deploy' && SeaEngine.validFleet(G.my, G.adj, true) && SeaEngine.validDraft(G.draft.picks[1])), name + ': draft ends with two legal fleets, mine on the board');
    const audit = () => p.evaluate(() => { const out = []; if (document.documentElement.scrollWidth > innerWidth + 1) out.push('scroll-x'); for (const el of document.querySelectorAll('.side button, .side b, .side small, .side span')) { if (!el.offsetParent) continue; const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let nd; while ((nd = tw.nextNode())) { if (!nd.textContent.trim() || nd.parentElement !== el) continue; const rg = document.createRange(); rg.selectNodeContents(nd); if (new Set([...rg.getClientRects()].map(q => Math.round(q.top / 4))).size > 1) out.push('WRAP ' + nd.textContent.trim()); if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow === 'hidden') out.push('CLIP ' + nd.textContent.trim()); } } return out.join(' | '); });
    await shot('tac-deploy'); console.log('   layout deploy: ' + (await audit() || 'clean'));
    await tap('#btnGo'); await p.waitForFunction(() => G.phase === 'battle' && !G.busy && G.st.turn === 0, null, { timeout: 30000 });
    ok(await p.evaluate(() => document.querySelectorAll('#skillCard .sk').length === G.my.filter(s => SeaEngine.TYPES[s.t].skill).length), name + ': one skill button per skill ship');
    // shoot until a skill is ready, then use every kind once
    const usedKinds = new Set(); guard = 0; const kindsN = await p.evaluate(() => [...new Set(G.my.map(s => SeaEngine.TYPES[s.t].skill).filter(Boolean))].length);
    while (await p.evaluate(() => G.phase === 'battle') && guard++ < 60 && usedKinds.size < kindsN) {
      await p.waitForFunction(() => G.phase !== 'battle' || (!G.busy && G.st.turn === 0), null, { timeout: 30000 }); if (!(await p.evaluate(() => G.phase === 'battle'))) break;
      const i = await p.evaluate(u => { const bs = [...document.querySelectorAll('#skillCard .sk.ready:not([disabled])')]; const b = bs.find(x => !u.includes(SeaEngine.TYPES[G.my[+x.dataset.i].t].skill)); return b ? +b.dataset.i : -1; }, [...usedKinds]);
      const cell = await p.evaluate(() => { for (let c = 44; c < 144; c++) if (!G.st.sides[1].shots[c % 100]) return c % 100; });
      const nk = i >= 0 ? await p.evaluate(i => { const k = SeaEngine.TYPES[G.my[i].t].skill; return SeaEngine.NOAIM[k] ? (SeaEngine.preview(G.st, i, -1) ? k : 'skip') : ''; }, i) : '';
      if (nk === 'skip') { usedKinds.add(await p.evaluate(i => SeaEngine.TYPES[G.my[i].t].skill, i)); continue; }   // (nothing to do with it right now: counted as tried)
      if (nk) { const n1 = await p.evaluate(() => G.st.acts.length); await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForFunction(n => G.st.acts.length > n, n1, { timeout: 10000 }); usedKinds.add(nk); continue; }   // (smoke · command · jam: no square)
      if (i >= 0) { await tap('#skillCard .sk[data-i="' + i + '"]'); await p.waitForTimeout(120); const kind = await p.evaluate(() => SeaEngine.TYPES[G.my[G.armed].t].skill); usedKinds.add(kind); if (usedKinds.size === 1) { if (!touch) { const pt = await p.evaluate(c => { const svg = document.querySelector('#bsvg'), m = svg.getScreenCTM(), q = svg.createSVGPoint(); q.x = 9 + (c % 10) * 10 + 5; q.y = 9 + Math.floor(c / 10) * 10 + 5; const z = q.matrixTransform(m); return [z.x, z.y]; }, cell); await p.mouse.move(pt[0], pt[1]); await p.waitForTimeout(100); } await shot('tac-armed'); } }
      const n0 = await p.evaluate(() => G.st.acts.length);
      const pt = await p.evaluate(c => { const svg = document.querySelector('#bsvg'), m = svg.getScreenCTM(), q = svg.createSVGPoint(); q.x = 9 + (c % 10) * 10 + 5; q.y = 9 + Math.floor(c / 10) * 10 + 5; const z = q.matrixTransform(m); return [z.x, z.y]; }, cell);
      if (touch) await p.touchscreen.tap(pt[0], pt[1]); else await p.mouse.click(pt[0], pt[1]);
      await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    }
    await p.waitForFunction(() => G.phase !== 'battle' || (!G.busy && G.st.turn === 0), null, { timeout: 30000 });
    const kinds = await p.evaluate(() => [...new Set(G.my.map(s => SeaEngine.TYPES[s.t].skill).filter(Boolean))].length);
    const left = await p.evaluate(u => G.phase === 'battle' ? G.my.filter((s, j) => !G.st.sides[0].sunk[j] && SeaEngine.TYPES[s.t].skill && !u.includes(SeaEngine.TYPES[s.t].skill)).length : 0, [...usedKinds]);   // (a skill ship sunk first, or the game over, leaves nothing to tap)
    ok(usedKinds.size >= kinds || !left, name + ': used every skill I own by tapping (' + [...usedKinds].join(',') + ')');
    for (let g2 = 0; g2 < 40 && await p.evaluate(() => G.phase === 'battle' && !G.st.log.some(m => m.by === 1 && m.skill)); g2++) {   // (a short skill round: keep shooting until the AI has had its chance)
      await p.waitForFunction(() => G.phase !== 'battle' || (!G.busy && G.st.turn === 0), null, { timeout: 30000 }); if (!(await p.evaluate(() => G.phase === 'battle'))) break;
      const n0 = await p.evaluate(() => G.st.acts.length), c = await p.evaluate(() => { for (let c = 0; c < 100; c++) if (!G.st.sides[1].shots[c]) return c; });
      await p.evaluate(c => { G.armed = null; }, c); const pt = await p.evaluate(c => { const svg = document.querySelector('#bsvg'), m = svg.getScreenCTM(), q = svg.createSVGPoint(); q.x = 9 + (c % 10) * 10 + 5; q.y = 9 + Math.floor(c / 10) * 10 + 5; const z = q.matrixTransform(m); return [z.x, z.y]; }, c);
      if (touch) await p.touchscreen.tap(pt[0], pt[1]); else await p.mouse.click(pt[0], pt[1]);
      await p.waitForFunction(n => G.st.acts.length > n, n0, { timeout: 10000 });
    }
    const aiSk = await p.evaluate(() => G.st.sides[1].ships.some(s => SeaEngine.TYPES[s.t].skill));
    ok(!aiSk || await p.evaluate(() => G.st.log.some(m => m.by === 1 && m.skill)), name + ': the AI used a skill too');
    await shot('tac-battle'); console.log('   layout battle: ' + (await audit() || 'clean'));
    const before = await p.evaluate(() => JSON.stringify([G.st.acts, G.st.cd, G.st.scans, [...G.st.sides[0].shots], [...G.st.sides[1].shots]]));
    await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(600);
    ok(before === await p.evaluate(() => JSON.stringify([G.st.acts, G.st.cd, G.st.scans, [...G.st.sides[0].shots], [...G.st.sides[1].shots]])), name + ': reload restores skills, cooldowns and sonar readings');
    await ctx.close();
  }
  console.log(errs.length ? 'PAGE ERRORS:\n' + errs.join('\n') : 'no page errors'); console.log(fail || errs.length ? 'FAILED' : 'ALL OK');
  await b.close();
})();
