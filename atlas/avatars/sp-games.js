/* Avatar species — the 11 game spirits (the Atlas Mon guides). Their models live in icons3d.js (MONS);
   here they get anchors for accessories and their 4 tiers. */
(function () {
  'use strict';
  if (!window.Avatars3D) return;
  const MONS = Icons3D.MONS, D = Avatars3D.define;
  const mk = (id, top, neck) => (o) => { const g = MONS[o.gold ? 'gold' : id](); g.userData.top = top; if (neck) g.userData.neck = neck; return g; };

  D('shogi', { name: { ja: 'ショウギツネ', en: 'Shogitsune' }, game: 'shogi',
    build: mk('shogi', [.04, 2.66, -.12, -.12], [0, .86, .02, .5]),
    v: [{}, { hue: [195, .8, .02], acc: ['bow'] }, { hue: [-25, .9, .06], acc: [['scarf', 0xff6b7a, 0xd85a9a]] }, { finish: 'night', acc: ['crown'] }] });
  D('knight', { name: { ja: 'ナイトン', en: 'Knighton' }, game: 'chess',
    build: mk('knight', [.08, 2.28, .1, 0], [0, 1.02, 0, .44]),
    v: [{}, { hue: [110, 1, 0], acc: [['flower', 0xffe0ef]] }, { hue: [-80, 1, 0], acc: [['scarf', 0xffd34f, 0xff9a4a]] }, { finish: 'pearl', acc: ['tiara'] }] });
  D('disc', { name: { ja: 'リバガメ', en: 'Flipturtle' }, game: 'reversi',
    build: mk('disc', [0, 1.78, .5, 0]),
    v: [{}, { hue: [150, .9, 0], acc: ['bow'] }, { hue: [-60, 1, .02], acc: [['star', 0xffd34f]] }, { finish: 'mint', acc: ['tiara'] }] });
  D('tile', { name: { ja: 'スウボ', en: 'Numbot' }, game: 'sudoku',
    build: mk('tile', [-.3, 2.08, 0, .2]),
    v: [{}, { hue: [170, .9, 0], acc: [['flower', 0xffffff]] }, { hue: [-55, 1, 0], acc: [['bow', 0x6fb8ff, 0x8a76ff]] }, { finish: 'sky', acc: ['halo'] }] });
  D('stone', { name: { ja: 'ゴイシペン', en: 'Stoneguin' }, game: 'gomoku',
    build: mk('stone', [.14, 2.0, -.05, -.25]),
    v: [{}, { hue: [130, 1, .08], acc: [['star', 0xffd34f]] }, { hue: [-130, 1.2, .1], acc: [['bow', 0xff6b7a, 0xd85a9a]] }, { finish: 'sakura', acc: ['crown'] }] });
  D('dot', { name: { ja: 'ハコピヨ', en: 'Boxchick' }, game: 'dots',
    build: mk('dot', [0, 1.72, 0, 0]),
    v: [{}, { hue: [150, .8, .05], acc: [['flower', 0xffffff]] }, { hue: [-40, 1, 0], acc: ['dicehat'] }, { finish: 'rainbow', acc: ['crown'] }] });
  D('plop', { name: { ja: 'ポトンウサ', en: 'Plopbun' }, game: 'connect4',
    build: mk('plop', [0, 2.02, .05, 0], [0, .8, 0, .44]),
    v: [{}, { hue: [130, 1, 0], acc: ['bow'] }, { hue: [-110, 1, 0], acc: [['scarf', 0xffd34f, 0xff9a4a]] }, { finish: 'sakura', acc: ['tiara'] }] });
  D('gem', { name: { ja: 'マンカラビ', en: 'Gembeetle' }, game: 'mancala',
    build: mk('gem', [0, 1.55, .55, 0]),
    v: [{}, { hue: [180, .8, .04], acc: [['flower', 0xfff4c0]] }, { hue: [90, .8, .04], acc: ['beret'] }, { finish: 'night', acc: ['crown'] }] });
  D('dice', { name: { ja: 'ダイスン', en: 'Dicepup' }, game: 'backgammon', ur: true,
    build: mk('dice', [.08, 2.3, -.05, -.1], [0, .82, 0, .38]),
    v: [{}, { hue: [140, 1, 0], acc: [['flower', 0xffe0ef]] }, { hue: [-120, 1, 0], acc: ['beret'] }, { opt: { gold: true }, finish: 'none', acc: [] }] });
  D('owl', { name: { ja: 'モリフク', en: 'Millowl' }, game: 'morris',
    build: mk('owl', [-.32, 1.82, .1, .35]),
    v: [{}, { hue: [120, 1, 0], acc: [['star', 0xffd34f]] }, { hue: [-110, 1, 0], acc: [['flower', 0xffffff]] }, { finish: 'night', acc: ['halo'] }] });
  D('crab', { name: { ja: 'チェッカニ', en: 'Checkrab' }, game: 'checkers',
    build: mk('crab', [.42, 1.56, .52, -.2]),
    v: [{}, { hue: [200, .9, 0], acc: [['bow', 0x6fb8ff, 0x8a76ff]] }, { hue: [130, .9, 0], acc: [['star', 0xffd34f]] }, { finish: 'pearl', acc: ['halo'] }] });
})();
