/* 所蔵品：ウルの王族のゲーム盤（大英博物館 120834）— the portal's own model of it (atlas/models/ur.js, built after the museum
   piece: shell plaques, lapis strips, red inlay, bitumen frame), shown alone as in the museum's case. 1 unit = 30.1 / 8.52 cm.
   A game on it (所蔵品で遊ぶ, atlas/museum/play.js, 2026-11-23): the portal's game builds the same model in the same place with its
   pieces, trays and dice, so the exhibit's own board is put away meanwhile (play.hide) and comes back afterwards. */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).ur = {
    build(TT, X) { const g = X.ur.board(); g.userData.play = { top: g.userData.top, hide: g.children.slice() }; return g; },
  };
})();
