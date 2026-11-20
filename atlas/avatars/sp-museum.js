/* Avatar species — 博物館の案内役「ミュゼフク」（2026-11-21）：所蔵品を見てまわるともらえるアトラモ。
   Built with the bosses' plush builder (AtlasBoss3D.build, atlas/avatars/sp-boss.js); each rank dresses up a little more
   (N a book · R a wine scarf · SR glasses, beret and a scroll · SSR a cape, a mortarboard and a quill).
   Earned in the museum's collection room (atlas/museum/gallery.js), not in the gacha or the shop.
   Rendered by atlas/tools/icons.html?kind=av&id=musowl-<0..3> → images/atlas/av/musowl-<0..3>.webp (256 px). */
(function () {
  'use strict';
  if (!window.Avatars3D || !window.AtlasBoss3D) return;
  const base = { a: 'owl', c: [0x8a5a34, 0xf6ead2, 0xd8a24a], held: 'book' };
  const up = [
    { ex: ['scarf', 'necklace'], sc: 0x9a2f3a, hat: 'cap', hc: [0x9a2f3a], held: 'book' },
    { ex: ['glasses', 'scarf'], sc: 0x9a2f3a, hat: 'beret', hc: [0x2b3044], held: 'scroll' },
    { ex: ['glasses', 'cape'], cape: 0x2b3044, hat: 'mortar', hc: [0x2b3044, 0xffd65a], held: 'quill' },
  ];
  const spec = t => ({ m: Object.assign({}, base, t ? up[t - 1] : {}, { ex: (t ? up[t - 1].ex : base.ex) || [] }), rank: t / 3 });
  Avatars3D.define('musowl', { name: { ja: 'ミュゼフク', en: 'Musowl' }, build: (o, t) => AtlasBoss3D.build(spec(t), t), v: [{ acc: [] }, { acc: [] }, { acc: [] }, { acc: [], finish: 'none' }] });
})();
