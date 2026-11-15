// アイコン（仮）を作る：node tools/make_icons.js（ワークツリーの根で python3 -m http.server 8811 を動かしておく）。
// tools/icon.html を headless Chrome で撮り、PNG を /tmp に書く。WebP への変換は下の python（Pillow）で行う：
//   python3 -c "from PIL import Image; Image.open('/tmp/patolli-card.png').convert('RGB').save('images/patolli.webp', quality=86); Image.open('/tmp/patolli-atlas.png').save('images/atlas/patolli.webp', quality=90)"
const { chromium } = require('/opt/npm-tools/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const [k, w, h] of [['card', 1200, 900], ['atlas', 512, 512]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
    await p.goto('http://localhost:8811/patolli/tools/icon.html?k=' + k); await p.waitForTimeout(500);
    await p.locator('#' + k).screenshot({ path: `/tmp/patolli-${k}.png`, omitBackground: true });
  }
  await b.close();
})();
