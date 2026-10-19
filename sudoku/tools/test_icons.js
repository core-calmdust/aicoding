// node tools/test_icons.js — sanity checks for icons.js
const I = require('../icons.js');
const assert = require('assert');
const L = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const want = { N: 250, R: 150, SR: 70, SSR: 25, UR: 5 }, lim = { N: 3000, R: 3000, SR: 6000, SSR: 7000, UR: 20000 };
assert.strictEqual(I.COUNT, 500);
let all = [];
for (const r of I.RARITIES) { const ids = I.byRarity(r); assert.strictEqual(ids.length, want[r], r); ids.forEach(id => assert.strictEqual(I.info(id).rarity, r)); all = all.concat(ids); }
assert.strictEqual(new Set(all).size, 500);
const combos = new Set(), sizes = {};
const t0 = Date.now();
for (let id = 0; id < 500; id++) {
  const t = I._traits(id), r = t.r;
  combos.add([t.r, t.sp, t.pal, t.acc, t.bg, t.ex, t.pat, t.adj, t.cos, t.ur].join());
  for (const l of L) assert.ok(I.info(id).name(l).trim(), `name ${id} ${l}`);
  const s = I.svg(id, { uid: 'Q' + id }), st = I.svg(id, { still: true, uid: 'Q' + id });
  (sizes[r] = sizes[r] || []).push(s.length);
  assert.ok(s.length < lim[r], `size ${id} ${s.length}`);
  assert.ok(!s.includes('@@'), 'uid placeholder left');
  for (const m of s.matchAll(/id="([^"]+)"/g)) assert.ok(m[1].startsWith('Q' + id), 'id prefix ' + m[1]);
  assert.ok(!/<animate/.test(st), 'still has animation ' + id);
  if (r === 'UR') assert.ok(/<animate/.test(s), 'UR not animated ' + id);
  const sil = I.silhouette(id); assert.ok(sil.includes('?') && !/url\(#/.test(sil));
}
assert.strictEqual(combos.size, 500, 'trait combos not unique');
console.log('ok', Date.now() - t0, 'ms', Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b) / v.length)])));
