/* Avatar species — ヒット＆ブローのステージの仲間（2026-11-16, user: ステージ制にしてクリアしたらアトラモがもらえる）.
   Built with the bosses' plush builder (AtlasBoss3D.build, atlas/avatars/sp-boss.js); each rank dresses up a little more.
   Earned on the stage map (atlas/games/hitblow.js GIFTS), not in the gacha or the shop.
   Rendered by atlas/tools/icons.html?kind=av&id=<sp>-<0..3> → images/atlas/av/<sp>-<0..3>.webp (256 px). */
(function () {
  'use strict';
  if (!window.Avatars3D || !window.AtlasBoss3D) return;
  const D = Avatars3D.define;
  // [species, base spec, per-rank additions (R, SR, SSR)]
  const L = [
    ['hbgem', { a: 'cat', c: [0x3a4a9a, 0xf4f0ff, 0x7df3d2], held: 'orb' },
      [{ ex: ['scarf'], sc: 0x7df3d2, hat: 'cap', hc: [0x7df3d2] }, { ex: ['scarf', 'glasses'], sc: 0x7df3d2, hat: 'beret', hc: [0x2b3683] }, { ex: ['scarf', 'cape'], sc: 0x7df3d2, cape: 0x2b3683, hat: 'crown' }]],
    ['hbpin', { a: 'penguin', c: [0x22284a, 0xfbfaf4, 0xa6e81f], held: 'piece' },
      [{ ex: ['scarf'], sc: 0xa6e81f, hat: 'bandana', hc: [0xa6e81f] }, { ex: ['necklace', 'glasses'], hat: 'cap', hc: [0xa6e81f] }, { ex: ['necklace', 'cape'], cape: 0xa6e81f, hat: 'tophat', hc: [0x22284a, 0xa6e81f] }]],
    ['hbsleuth', { a: 'tanuki', c: [0x8a6a4a, 0xf4e6d0, 0x2b3683], held: 'book' },
      [{ ex: ['scarf'], sc: 0xd8b04a, hat: 'beret', hc: [0x6a5a48] }, { ex: ['glasses', 'scarf'], sc: 0xd8b04a, hat: 'tricorne', hc: [0x6a5a48, 0xd8b04a] }, { ex: ['glasses', 'cape'], cape: 0x6a5a48, hat: 'tophat', hc: [0x2a2a38, 0xd8b04a] }]],
    ['hbvault', { a: 'panda', c: [0xf4f2ee, 0xffffff, 0xc38bff], held: 'scroll' },
      [{ ex: ['scarf'], sc: 0xc38bff, hat: 'flowers' }, { ex: ['scarf', 'glasses'], sc: 0xc38bff, hat: 'wizard', hc: [0x5a3a9a, 0xffd65a] }, { ex: ['cape'], cape: 0x5a3a9a, hat: 'bigcrown', held: 'orb' }]],
  ];
  L.forEach(([id, m, up]) => {
    const spec = t => ({ m: Object.assign({}, m, t ? up[t - 1] : {}, { ex: (t ? up[t - 1].ex : m.ex) || [] }), rank: t / 3 });
    D(id, { name: { ja: id, en: id }, build: (o, t) => AtlasBoss3D.build(spec(t), t), v: [{ acc: [] }, { acc: [] }, { acc: [] }, { acc: [], finish: 'none' }] });
  });
})();
