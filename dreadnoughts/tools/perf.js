// node dreadnoughts/tools/perf.js — rough cost of each part of a battle frame (SwiftShader: the GPU runs on the CPU, so fragment work shows up as time)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  await p.goto('http://localhost:8765/dreadnoughts/'); await p.evaluate(() => localStorage.removeItem('aicoding-dreadnoughts')); await p.reload(); await p.waitForTimeout(2500);
  await p.click('#mPlay'); await p.evaluate(() => document.querySelector('.rc[data-r="classic"]').click()); await p.click('#sGo'); await p.waitForTimeout(2000); await p.click('#dGo'); await p.waitForTimeout(3000);
  for (const c of [11, 33, 66]) { await p.waitForFunction(() => !DN.G().busy && DN.G().st.turn === 0, null, { timeout: 60000 }); const pt = await p.evaluate(c => DN.World.screenOf(1, c), c); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(500); }
  await p.waitForFunction(() => !DN.G().busy && DN.G().st.turn === 0, null, { timeout: 60000 });
  const r = await p.evaluate(() => { const V = DN.World._v(), gl = V.R.getContext(), px = new Uint8Array(4); gl.finish = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); cancelAnimationFrame(V.raf); V.raf = 1; V.R.setPixelRatio(1); DN.World.fit();
    const time = n => { V.R.render(V.scene, V.cam); gl.finish(); const t0 = performance.now(); for (let i = 0; i < n; i++) { V.R.render(V.scene, V.cam); gl.finish(); } return +((performance.now() - t0) / n).toFixed(1); };
    const out = { all: time(6), calls: V.R.info.render.calls, tris: V.R.info.render.triangles };
    const off = (name, objs, fn) => { const was = objs.map(o => o.visible); objs.forEach(o => o.visible = false); out['-' + name] = +(out.all - time(6)).toFixed(1); objs.forEach((o, i) => o.visible = was[i]); };
    off('water', [V.water]); off('ships', [V.shipLayer]); off('particles', [V.fire.pts, V.smoke.pts]); off('labels', V.labels); off('marks', V.markLayer);
    V.R.shadowMap.enabled = false; V.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); time(1); out['-shadows'] = +(out.all - time(6)).toFixed(1); V.R.shadowMap.enabled = true; V.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); time(1);
    const W = V.water, keep = W.material; W.material = new THREE.MeshBasicMaterial({ color: 0x0b3a4a }); time(1); out['water as flat colour'] = time(6); W.material = keep; time(1);
    const nh = V.uni.uNH.value; V.onFrame = null; out.nh = nh;
    out.pr = V.R.getPixelRatio(); return out; });
  console.log(JSON.stringify(r)); await b.close(); })();
