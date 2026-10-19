const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ja-JP' });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://localhost:8791/dots/'); await pg.waitForTimeout(1500);
  for (const lang of ['ja', 'de', 'hi']) {
    await pg.evaluate(l => { document.querySelectorAll('.overlay').forEach(x => x.classList.remove('show')); const s = document.querySelector('#langSel'); s.value = l; s.dispatchEvent(new Event('change')); }, lang);
    await pg.waitForTimeout(500);
    await pg.evaluate(() => { openNew(); document.querySelectorAll('.overlay').forEach(x => { if (x.id !== 'newOverlay' && !x.querySelector('#levelName')) x.classList.remove('show'); }); const r = document.querySelector('input[type=range]#levelRange') || [...document.querySelectorAll('input[type=range]')][0]; if (r) { r.value = 10; r.dispatchEvent(new Event('input')); } }); await pg.waitForTimeout(500);
    const txt = await pg.evaluate(() => { const el = document.querySelector('#levelName small'); return el ? el.textContent + ' | w=' + el.getBoundingClientRect().width + ' sw=' + document.documentElement.scrollWidth : 'none'; });
    console.log(lang, txt);
    await pg.screenshot({ path: '/home/claude/work/ckpt/dots5/pw/newgame_' + lang + '.png' });
  }
  console.log('errors', errs); await b.close();
})();
