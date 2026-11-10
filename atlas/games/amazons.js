/* Amazons in the portal: no play on the portal's own table yet — 「あそぶ」 opens the full game in its 3D skin (amazons/?skin=atlas,
   atlas/skin/amazons.js) at the level, side and mode picked on the card. */
(function () {
  'use strict';
  window.Atlas3D = window.Atlas3D || {};
  window.Atlas3D.amazons = { levels: 23, sides: true, modes: ['ai', 'rated', 'pvp'] };
})();
