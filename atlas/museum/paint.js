/* World Board Game Atlas — 博物館の「描かれたゲーム」 (paintings room, 2026-11-24).
   Games as people painted, carved and printed them, 3,300 years of them: a wall of framed works; one opens in a viewer that can be zoomed
   and dragged, with numbered details to tap and the museum's record beside it, and links to the game or the piece of the collection.
   Pictures: The Metropolitan Museum of Art, The Cleveland Museum of Art and The Art Institute of Chicago and the Rijksmuseum, Open Access (CC0 — free for any use, commercial included); each record keeps its object number.
   Files images/atlas/paint/<id>.webp (≤ 2048 px) and <id>-t.webp (the wall). Texts: museum/paint-i18n.js (MUSEUM_PAINT_T[lang]).
   Facts and sources: claude/museum-spec.md (描かれたゲーム).
   AtlasPaint.render(box, ctx) — the museum (atlas/museum.js) calls it; ctx.open(gameId), ctx.goEx(exhibitId), ctx.goRoom(room). */
(function () {
  'use strict';
  const V = 2, IMG = '../images/atlas/paint/';
  /* the works, oldest first. w, h: the picture's size (px) · bg: the wall card's mat · spots: [x, y] on the picture (0–1), the texts say what
     each one is · links: the Atlas's games (g), the collection (ex), a room (room) · met: the Met's object id (its page) */
  const WORKS = [
    { id: 'nefertari', w: 1885, h: 1758, met: 548355, no: '30.4.145', bg: '#d9b25c', spots: [[.6, .56], [.53, .51], [.71, .64], [.65, .34], [.88, .5]], links: [{ g: 'senet' }, { ex: 'senet' }, { room: 'chance' }] },
    { id: 'hydria', w: 1739, h: 2001, met: 254887, no: '56.171.29', bg: '#2a2420', spots: [[.5, .56], [.37, .57], [.61, .57], [.5, .675], [.5, .43]], links: [{ room: 'chance' }] },
    { id: 'liubo', w: 1312, h: 700, met: 44732, no: '1992.165.23a, b', bg: '#c9c4bc', spots: [[.5, .63], [.16, .42], [.82, .3], [.33, .66], [.22, .86]], links: [{ ex: 'liubo' }, { room: 'chance' }] },
    { id: 'shahnama', w: 1384, h: 2048, met: 452180, no: '1970.301.71', bg: '#2c3e64', spots: [[.645, .69], [.31, .41], [.55, .66], [.63, .1], [.86, .62]], links: [{ g: 'chess' }, { ex: 'nishapur' }, { g: 'backgammon' }] },
    { id: 'chaupar', w: 1985, h: 1281, met: 37942, no: '57.185.2', bg: '#e0a52a', spots: [[.56, .68], [.535, .6], [.38, .5], [.7, .58], [.5, .78]], links: [{ g: 'ludo' }, { room: 'chance' }] },
    { id: 'shogi', w: 1489, h: 2001, met: 42564, no: 'JP2773', bg: '#9fb58a', spots: [[.37, .75], [.31, .86], [.16, .33], [.6, .77], [.5, .08]], links: [{ g: 'shogi' }, { ex: 'kofukuji' }] },
    { id: 'sugoroku', w: 2048, h: 1500, met: 56804, no: 'JP2401', bg: '#e6c77a', spots: [[.5, .66], [.6, .575], [.44, .835], [.38, .12], [.505, .3]], links: [{ g: 'backgammon' }, { ex: 'sugoroku' }] },
    { id: 'eakins', w: 2048, h: 1493, met: 10813, no: '81.14', bg: '#3a2a20', spots: [[.47, .575], [.515, .3], [.62, .44], [.45, .665], [.42, .14], [.875, .9]], links: [{ g: 'chess' }] },
    // (2026-11-24) a carved-lacquer dish with immortals at go, and a Morris & Co. cabinet painted with backgammon players
    { id: 'weiqi', w: 2002, h: 1500, met: 40217, no: '2015.500.1.33', bg: '#4a4744', spots: [[.506, .549], [.444, .534], [.628, .571], [.579, .356], [.5, .393], [.411, .8]], links: [{ g: 'go' }, { ex: 'shosoin' }] },
    { id: 'webb', w: 1542, h: 2003, met: 195456, no: '26.54', bg: '#a7aab0', spots: [[.476, .324], [.375, .3], [.62, .344], [.317, .444], [.69, .233], [.505, .161]], links: [{ g: 'backgammon' }, { ex: 'ottoman' }] },
    { id: 'liberale', w: 2049, h: 1721, met: 436884, no: '43.98.8', bg: '#6b5a48', spots: [[.542, .541], [.344, .297], [.6, .288], [.447, .209], [.146, .2], [.893, .209]], links: [{ g: 'chess' }, { ex: 'lewis' }] },
    // The Cleveland Museum of Art, Open Access (CC0) — cma: its accession number (its page)
    // The Art Institute of Chicago, public-domain works (images CC0) — aic: its object id (its page), no: its reference number
    { id: 'mirror', w: 2048, h: 2043, cma: '1940.1200', bg: '#5a5650', spots: [[.49, .564], [.404, .291], [.621, .321], [.681, .574], [.147, .402]], links: [{ g: 'chess' }, { ex: 'lewis' }] },
    { id: 'morris', w: 2048, h: 2008, cma: '1923.247', bg: '#d8d2c4', spots: [[.5, .494], [.188, .176], [.321, .312], [.5, .242], [.5, .1], [.084, .222]], links: [{ g: 'morris' }] },
    { id: 'leifeng', w: 1959, h: 2048, cma: '2025.105', bg: '#b8463a', spots: [[.062, .617], [.414, .897], [.157, .897], [.194, .444], [.531, .353], [.499, .509]], links: [{ ex: 'goose' }, { g: 'ludo' }] },
    { id: 'tutinama', w: 1330, h: 2048, cma: '1962.279.32.b', bg: '#c9a56a', spots: [[.313, .736], [.142, .686], [.258, .776], [.391, .565], [.874, .625], [.5, .15]], links: [{ g: 'chess' }, { ex: 'nishapur' }] },
    { id: 'teniers', w: 2048, h: 1497, cma: '1943.377', bg: '#4a3a2c', spots: [[.325, .69], [.19, .66], [.256, .596], [.066, .37], [.224, .21], [.608, .42]], links: [{ g: 'backgammon' }, { ex: 'ottoman' }] },
    { id: 'imari', w: 2048, h: 2048, cma: '1964.260', bg: '#2e2e30', spots: [[.547, .66], [.44, .627], [.653, .573], [.5, .373], [.16, .467]], links: [{ g: 'go' }, { ex: 'shosoin' }] },
    { id: 'shoei', w: 2048, h: 941, cma: '1979.46.1', bg: '#b89a5a', spots: [[.62, .654], [.704, .589], [.87, .71], [.873, .567], [.425, .725], [.61, .177]], links: [{ g: 'go' }, { ex: 'shosoin' }] },
    // (2026-11-24) four more from Cleveland: a Muromachi stable screen (go and shogi), a Goryeo celadon pitcher (go), a Kangra drawing (chaupar), Vuillard (checkers)
    { id: 'umaya', w: 2048, h: 919, cma: '1934.373.1', bg: '#b8964a', spots: [[.421, .764], [.393, .71], [.562, .777], [.615, .72], [.705, .7], [.421, .54]], links: [{ g: 'shogi' }, { g: 'go' }, { ex: 'kofukuji' }] },
    { id: 'goryeo', w: 2048, h: 1923, cma: '1917.356', bg: '#7f948a', spots: [[.496, .645], [.418, .61], [.563, .6], [.441, .47], [.3, .6], [.63, .38]], links: [{ g: 'go' }, { ex: 'shosoin' }] },
    { id: 'kangra', w: 1394, h: 2048, cma: '1936.683', bg: '#d9cbb2', spots: [[.47, .7], [.36, .5], [.668, .5], [.13, .3], [.94, .29], [.65, .37]], links: [{ g: 'ludo' }, { room: 'chance' }] },
    { id: 'vuillard', w: 1687, h: 2048, cma: '1951.65.2', bg: '#6e3a4c', spots: [[.5, .76], [.332, .547], [.696, .605], [.598, .415], [.29, .34], [.07, .968]], links: [{ g: 'checkers' }] },
    // (2026-11-24) The Art Institute of Chicago: an early photograph (chess), a Netherlandish roundel (dice), a benizuri-e (sugoroku)
    { id: 'pvl', w: 1686, h: 1648, aic: 267692, no: '2023.52', bg: '#bdb6a8', spots: [[.617, .483], [.544, .428], [.36, .26], [.522, .25], [.69, .24], [.261, .822]], links: [{ room: 'chance' }] },
    { id: 'kiyohiro', w: 1387, h: 2048, aic: 19696, no: '1925.1907', bg: '#c9b48a', spots: [[.5, .709], [.367, .498], [.639, .566], [.622, .272], [.877, .573], [.966, .716]], links: [{ g: 'backgammon' }, { ex: 'sugoroku' }] },
    { id: 'talbot', w: 1591, h: 2048, aic: 27083, no: '1967.158', bg: '#5a4a3a', spots: [[.479, .583], [.307, .356], [.664, .456], [.771, .278], [.879, .711]], links: [{ g: 'chess' }] },
    // (2026-11-24) the Met: Ingram after Boucher — xiangqi as 18th-century Paris imagined it
    { id: 'ingram', w: 1552, h: 2252, met: 394687, no: '66.628.4(1)', bg: '#a89a7e', spots: [[.6, .53], [.47, .515], [.55, .4], [.73, .5], [.72, .19], [.5, .905]], links: [{ g: 'xiangqi' }] },
    // (2026-11-24) Chicago: Posada's Game of the Goose (Mexico) — the rules printed in the middle
    { id: 'posada', w: 1686, h: 1239, aic: 52048, no: '1944.945', bg: '#cfc6a6', spots: [[.45, .417], [.325, .848], [.294, .733], [.294, .61], [.15, .72], [.647, .468]], links: [{ ex: 'goose' }, { g: 'ludo' }] },
    // (2026-11-24) the Met: a Jin-dynasty relief tile, two women at a board (probably go)
    { id: 'jintile', w: 1432, h: 1576, met: 65099, no: '2002.462', bg: '#6a625a', spots: [[.5, .56], [.42, .55], [.27, .42], [.6, .4], [.55, .18], [.5, .73]], links: [{ g: 'go' }, { ex: 'shosoin' }] },
    // (2026-11-24) Cleveland: Kawanabe Kyōsai's sketch album — a go game blown away
    { id: 'kyosai', w: 2048, h: 1618, cma: '1991.125.k', bg: '#d6cdb8', spots: [[.33, .6], [.77, .32], [.62, .32], [.85, .47], [.75, .72], [.4, .75]], links: [{ g: 'go' }] },
    // (2026-11-24) Chicago: a Yokuts gambling tray, woven with its own dice game
    { id: 'yokuts', w: 1686, h: 1262, aic: 132674, no: '1994.312a-b', bg: '#cfcac2', spots: [[.415, .125], [.43, .287], [.325, .587], [.52, .507], [.7, .53], [.45, .43]], links: [{ room: 'chance' }] },
    // (2026-11-24) Chicago: Hokkei's surimono — Benkei beaten at sugoroku
    { id: 'hokkei', w: 1686, h: 1924, aic: 81008, no: '1954.524', bg: '#8a7a3e', spots: [[.66, .62], [.48, .41], [.65, .31], [.19, .08], [.82, .09], [.91, .83]], links: [{ g: 'backgammon' }, { ex: 'sugoroku' }] },
    // (2026-11-24) Chicago: Vorsterman after De Coster — backgammon by candlelight
    { id: 'vorsterman', w: 991, h: 768, aic: 21398, no: '1935.146', bg: '#3a332c', spots: [[.42, .68], [.605, .55], [.11, .36], [.2, .55], [.84, .5], [.08, .955]], links: [{ g: 'backgammon' }, { ex: 'ottoman' }] },
    // (2026-11-24) Chicago: Zorn's etching of chess players (the sheet trimmed to the plate and signature)
    { id: 'zorn', w: 911, h: 1319, aic: 41624, no: '1927.1839', bg: '#4a4640', spots: [[.7, .68], [.33, .24], [.6, .42], [.75, .22], [.3, .6], [.68, .89]], links: [{ g: 'chess' }] },
    // (2026-11-24) Chicago: Harunobu's surimono — three young women at sugoroku
    { id: 'harunobu-sugoroku', w: 1686, h: 2263, aic: 88979, no: '1928.904', bg: '#d8cbb0', spots: [[.47, .78], [.33, .56], [.71, .6], [.64, .38], [.3, .12], [.86, .27]], links: [{ g: 'backgammon' }, { ex: 'sugoroku' }] },
    // (2026-11-24) Cleveland: a Kota shrine painting — a pachisi board laid out for Krishna
    { id: 'kota', w: 1530, h: 2048, cma: '1978.71', bg: '#7a2a2a', spots: [[.5, .746], [.455, .718], [.485, .665], [.52, .56], [.3, .51], [.47, .32]], links: [{ g: 'ludo' }, { room: 'chance' }] },
    // (2026-11-25) Chicago: the Mexican Game of the Coyote — hens hem in a coyote, like fox and geese
    { id: 'coyote', w: 1686, h: 2143, aic: 52331, no: '1944.1047', bg: '#c9ccbe', spots: [[.47, .36], [.5, .58], [.45, .88], [.5, .07], [.17, .73], [.84, .2]], links: [{ g: 'foxgeese' }] },
    // (2026-11-25) the Rijksmuseum (public domain) — rijks: its object number (its page): a 1709 satire played as trictrac for the town of Mons
    { id: 'mons', w: 1057, h: 2048, rijks: 'RP-P-OB-83.374', bg: '#c8c2b4', spots: [[.65, .2], [.665, .13], [.775, .17], [.45, .14], [.2, .12], [.45, .62]], links: [{ g: 'backgammon' }, { ex: 'ottoman' }] },
    // (2026-11-25) the Rijksmuseum: a political game of the goose, 1867 (64 squares, ending in Insulinde)
    { id: 'stembus', w: 2048, h: 1565, rijks: 'RP-P-OB-89.857', bg: '#d8c89a', spots: [[.1, .12], [.27, .48], [.63, .53], [.905, .9], [.5, .88], [.63, .88]], links: [{ ex: 'goose' }] },
    // (2026-11-25) the Rijksmuseum: Koreans round a board (probably go), from Siebold's Nippon
    { id: 'koorai', w: 2048, h: 1402, rijks: 'RP-P-1939-1474', bg: '#d9d2bf', spots: [[.504, .554], [.367, .666], [.29, .4], [.64, .3], [.575, .5], [.5, .775]], links: [{ g: 'go' }, { g: 'janggi' }] },
    // (2026-11-25) the Rijksmuseum: a Cairo street photograph — men round a board (probably chess)
    { id: 'cairo', w: 2048, h: 1375, rijks: 'RP-F-F20042', bg: '#8fa3b0', spots: [[.56, .46], [.47, .14], [.26, .57], [.43, .66], [.69, .4], [.075, .5]], links: [{ g: 'chess' }] },
    // (2026-11-25) the Rijksmuseum: Vanmour's Armenians at cards in Istanbul — the room's first card game
    { id: 'vanmour', w: 2048, h: 1538, rijks: 'SK-A-2010', bg: '#3a2a22', spots: [[.69, .67], [.655, .5], [.115, .56], [.955, .63], [.31, .58], [.5, .66]], links: [{ g: 'poker' }, { g: 'solitaire' }] },
    // (2026-11-25) the Rijksmuseum: an Algiers studio photograph — two men at a rimmed board (probably backgammon)
    { id: 'algiers', w: 1461, h: 2048, rijks: 'RP-F-00-12306', bg: '#c9b994', spots: [[.4, .625], [.466, .28], [.23, .455], [.67, .48], [.43, .705], [.56, .6]], links: [{ g: 'backgammon' }, { ex: 'ottoman' }] },
    // (2026-11-25) the Art Institute of Chicago: a Mexican street-sheet dice game, the circus with squares 2–12
    { id: 'circo', w: 1686, h: 1244, aic: 52020, no: '1944.922', bg: '#cdbf9c', spots: [[.49, .55], [.14, .075], [.38, .19], [.115, .45], [.745, .41], [.86, .9]], links: [{ room: 'chance' }] },
    // (2026-11-25) the Art Institute of Chicago: Posada's lotería sheet — 38 named pictures for the calling game
    { id: 'loteria', w: 1686, h: 1274, aic: 51998, no: '1944.912', bg: '#c9b48e', spots: [[.5, .77], [.095, .18], [.55, .18], [.21, .655], [.44, .655], [.325, .82]], links: [{ room: 'chance' }] },
    // (2026-11-25) the Rijksmuseum: a 10×10 draughts board sheet, 'jeu polonais'
    { id: 'jeupol', w: 2048, h: 1655, rijks: 'RP-P-OB-203.257', bg: '#e8e4da', spots: [[.557, .021], [.743, .021], [.086, .513], [.93, .51], [.507, .513], [.5, .3]], links: [{ g: 'checkers' }] },
    // (2026-11-25) the Rijksmuseum: Brepols sheet of 28 dominoes and 32 cards to cut out
    { id: 'dkaart', w: 2048, h: 1723, rijks: 'RP-P-OB-201.901', bg: '#e6e1d4', spots: [[.27, .062], [.27, .156], [.45, .838], [.55, .237], [.655, .237], [.455, .938]], links: [{ g: 'solitaire' }, { room: 'chance' }] },
    // (2026-11-25) the Rijksmuseum: Quirin Boel after Teniers: two monkeys at trictrac
    { id: 'apen', w: 2048, h: 1505, rijks: 'RP-P-BI-1933', bg: '#ddd8cc', spots: [[.5, .65], [.2, .55], [.42, .41], [.686, .3], [.4, .8], [.236, .914]], links: [{ g: 'backgammon' }, { ex: 'ottoman' }] },
    // (2026-11-25) the Rijksmuseum: anonymous stereograph, men playing dominoes ('Het dominospel')
    { id: 'dstereo', w: 2048, h: 970, rijks: 'RP-F-F09942', bg: '#d9cfb8', spots: [[.26, .5], [.41, .33], [.34, .22], [.15, .37], [.045, .6], [.7, .55]], links: [{ room: 'chance' }] },
    // (2026-11-25) the Rijksmuseum: hand-coloured photograph, two women at a go board (from a Manila travel album)
    { id: 'gojo', w: 1692, h: 1234, rijks: 'RP-F-F01161-K', bg: '#c9c6bd', spots: [[.52, .6], [.42, .59], [.28, .33], [.69, .38], [.5, .8], [.49, .27]], links: [{ g: 'go' }, { ex: 'shosoin' }] },
    // (2026-11-25) the Art Institute of Chicago: Meade brothers daguerreotype, two men at chess
    { id: 'meade', w: 1686, h: 1403, aic: 250084, no: '2019.462', bg: '#3a2a24', spots: [[.5, .66], [.4, .43], [.64, .38], [.66, .57], [.52, .77], [.1, .5]], links: [{ g: 'chess' }] },
    // (2026-11-25) the Art Institute of Chicago: hanging scroll attributed to Dai Jin, Daoist immortals playing weiqi
    { id: 'weiqidai', w: 1189, h: 2048, aic: 150406, no: '1998.148', bg: '#5d5640', spots: [[.47, .79], [.37, .73], [.58, .76], [.25, .8], [.475, .72], [.955, .34]], links: [{ g: 'go' }, { ex: 'shosoin' }] },
    // (2026-11-25) the Rijksmuseum: 'Die Reise um die Welt' — a round dice race game, spaces 1–41, rules in four languages
    { id: 'reise', w: 1611, h: 2048, rijks: 'RP-P-OB-200.986', bg: '#e7e3d8', spots: [[.5, .42], [.5, .71], [.836, .59], [.727, .25], [.25, .28], [.5, .87]], links: [{ ex: 'goose' }, { room: 'chance' }] },
    // (2026-11-25) the Rijksmuseum: Jan van Huchtenburg, prisoners casting dice on a drum for their lives
    { id: 'huchten', w: 2048, h: 1795, rijks: 'SK-A-2675', bg: '#2f2a22', spots: [[.49, .8], [.48, .62], [.7, .7], [.85, .5], [.89, .08], [.14, .21]], links: [{ room: 'chance' }] },
    // (2026-11-25) the Rijksmuseum: 'Spel der Deugd / Le jeu de la vertu' (1798), a two-dice betting game of virtues and vices
    { id: 'vertu', w: 1486, h: 2048, rijks: 'RP-P-1905-6651', bg: '#e4dfd2', spots: [[.5, .135], [.5, .46], [.21, .45], [.48, .62], [.12, .66], [.25, .85]], links: [{ room: 'chance' }] },
    // (2026-11-25) the Art Institute of Chicago: Posada, 'Los Charros Contrabandistas' — a three-dice race game
    { id: 'charros', w: 1686, h: 1235, aic: 52038, no: '1944.940', bg: '#4a4740', spots: [[.5, .07], [.85, .25], [.24, .8], [.6, .65], [.2, .2], [.47, .84]], links: [{ ex: 'goose' }, { room: 'chance' }] },
    // (2026-11-25) the Art Institute of Chicago: Qing snuff bottle painted with two old men at a weiqi board
    { id: 'snuffwq', w: 1595, h: 2048, aic: 87724, no: '1961.1233', bg: '#8d8f94', spots: [[.55, .58], [.37, .59], [.67, .66], [.33, .48], [.64, .47], [.51, .24]], links: [{ g: 'go' }, { ex: 'shosoin' }] },
    // (2026-11-25) the Rijksmuseum: Adriaen van Ostade etching, trictrac players in an inn
    { id: 'ostade', w: 1930, h: 2048, rijks: 'RP-P-OB-12.729', bg: '#d8d4c8', spots: [[.31, .66], [.15, .53], [.37, .53], [.34, .41], [.7, .56], [.6, .38]], links: [{ g: 'backgammon' }] },
    // (2026-11-25) the Rijksmuseum: follower of Mathieu Le Nain, dice players at a round table
    { id: 'lenain', w: 2048, h: 1576, rijks: 'SK-A-3099', bg: '#4a4237', spots: [[.48, .49], [.27, .3], [.63, .24], [.51, .2], [.075, .25], [.86, .68]], links: [{ room: 'chance' }] },
    // (2026-11-25) the Rijksmuseum: Antwerp World's Fair 1894, Tunisian section: card game outside an Arab café
    { id: 'tunisie', w: 2048, h: 1538, rijks: 'RP-F-2001-7-1494-48', bg: '#e6dfcf', spots: [[.483, .6], [.264, .541], [.702, .6], [.475, .67], [.63, .225], [.5, .87]], links: [{ g: 'solitaire' }, { g: 'poker' }] },
    // (2026-11-25) the Rijksmuseum: caids near Laghouat, Algeria, laying out tiles (probably dominoes)
    { id: 'laghouat', w: 2048, h: 1592, rijks: 'RP-F-F01088-AN', bg: '#cdbb98', spots: [[.506, .624], [.53, .78], [.38, .81], [.34, .2], [.8, .15], [.65, .75]], links: [{ room: 'chance' }] },
    // (2026-11-25) the Cleveland Museum of Art: detail of 'Palace Ladies' (copy after Qiu Ying): court ladies at a weiqi board
    { id: 'hangong', w: 1904, h: 1706, cma: '1954.369', bg: '#6b5a33', spots: [[.61, .35], [.555, .28], [.7, .27], [.205, .33], [.645, .49], [.235, .73]], links: [{ g: 'go' }, { ex: 'shosoin' }] },
    // (2026-11-25) the Cleveland Museum of Art: Winslow Homer, 'Backgammon', wood engraving
    { id: 'homerbg', w: 2048, h: 1609, cma: '1942.1484', bg: '#e4e1d8', spots: [[.6, .49], [.4, .26], [.67, .26], [.1, .47], [.3, .72], [.45, .955]], links: [{ g: 'backgammon' }] },
    // (2026-11-25) the Rijksmuseum: coloured stereograph 'The Chess Players', man and woman at chess
    { id: 'chessst', w: 2048, h: 1033, rijks: 'RP-F-F10541', bg: '#d8cdb5', spots: [[.37, .71], [.395, .6], [.314, .31], [.181, .25], [.366, .12], [.75, .5]], links: [{ g: 'chess' }] },
    // (2026-11-25) the Art Institute of Chicago: Posada, 'Corrida de Toros' (1898) — a spiral dice race game of the bullfight
    { id: 'corrida', w: 1544, h: 2048, aic: 52044, no: '1944.943', bg: '#d9d3bf', spots: [[.5, .07], [.47, .42], [.46, .82], [.84, .11], [.12, .81], [.3, .95]], links: [{ ex: 'goose' }, { room: 'chance' }] },
    // (2026-11-25) the Art Institute of Chicago: American ambrotype (1865), three men playing cards
    { id: 'ambrocards', w: 1651, h: 2048, aic: 250224, no: '2019.603', bg: '#3b2c24', spots: [[.47, .5], [.275, .39], [.51, .38], [.72, .4], [.135, .56], [.03, .5]], links: [{ g: 'poker' }, { g: 'solitaire' }] },
    // (2026-11-25) the Cleveland Museum of Art: Winslow Homer, 'Paul Morphy, The Chess Champion', wood engraving, 1859
    { id: 'morphy', w: 1504, h: 2048, cma: '1942.1472', bg: '#e2ded4', spots: [[.114, .538], [.21, .597], [.47, .2], [.52, .33], [.6, .69], [.5, .975]], links: [{ g: 'chess' }] },
    // (2026-11-25) the Cleveland Museum of Art: Johann Zoffany, the Dutton family at cards, Sherborne Park
    { id: 'dutton', w: 2048, h: 1631, cma: '2023.122', bg: '#3e5a5a', spots: [[.35, .66], [.287, .48], [.17, .72], [.553, .48], [.68, .5], [.9, .58]], links: [{ g: 'solitaire' }, { g: 'poker' }] },
    // (2026-11-25) the Rijksmuseum: 'The X.mas Academics: A Combination Game at Whist' (1773), satire on Cambridge academics
    { id: 'whist', w: 2048, h: 1390, rijks: 'RP-P-2022-211-63', bg: '#ddd9cf', spots: [[.53, .6], [.46, .42], [.69, .3], [.23, .36], [.52, .22], [.85, .73]], links: [{ g: 'solitaire' }] },
    // (2026-11-25) the Rijksmuseum: Paul Hey, three old men at chess in a café
    { id: 'hey', w: 2048, h: 1388, rijks: 'RP-P-OB-16.717', bg: '#e2dccc', spots: [[.45, .74], [.28, .4], [.58, .38], [.75, .3], [.63, .73], [.26, .77]], links: [{ g: 'chess' }] },
    // (2026-11-25) the Rijksmuseum: coloured stereograph 'The artful card, or, one too many for granny. Hearts are trumps!'
    { id: 'artful', w: 2048, h: 1000, rijks: 'RP-F-F10570', bg: '#d9cfb6', spots: [[.212, .565], [.171, .44], [.396, .498], [.328, .536], [.289, .648], [.396, .297]], links: [{ g: 'solitaire' }, { g: 'poker' }] },
    // (2026-11-25) the Art Institute of Chicago: Cézanne, watercolour study for The Card Players
    { id: 'cezcards', w: 1686, h: 1271, aic: 133136, no: '475.1983', bg: '#e8d2c6', spots: [[.38, .27], [.62, .5], [.58, .68], [.09, .5], [.25, .6], [.72, .6]], links: [{ g: 'poker' }, { g: 'solitaire' }] },
    // (2026-11-25) the Art Institute of Chicago: Vuillard, 'The Game of Checkers' (1899), colour lithograph
    { id: 'vuillardck', w: 1663, h: 2048, aic: 22735, no: '1936.199', bg: '#b8925a', spots: [[.42, .79], [.3, .56], [.6, .42], [.45, .22], [.15, .82], [.29, .31]], links: [{ g: 'checkers' }] },
    // (2026-11-25) the Art Institute of Chicago: Cruikshank after Marryat, 'Game of Chess' (1814)
    { id: 'cruikchess', w: 1686, h: 1198, aic: 90197, no: '1928.1507d', bg: '#c9c79a', spots: [[.48, .55], [.46, .37], [.21, .25], [.66, .27], [.47, .86], [.5, .95]], links: [{ g: 'chess' }] },
    // (2026-11-25) the Art Institute of Chicago: American photograph (c. 1898), woman and child playing dominoes
    { id: 'domino98', w: 1686, h: 1350, aic: 63559, no: '1981.651', bg: '#5e5440', spots: [[.47, .51], [.33, .45], [.62, .38], [.49, .39], [.85, .3], [.73, .88]], links: [{ room: 'chance' }] },
    // (2026-11-25) the Rijksmuseum: Albert Glaser and friends playing cards on a boat, Langkat, Sumatra
    { id: 'langkat', w: 2048, h: 1578, rijks: 'RP-F-2003-107', bg: '#dcd6c6', spots: [[.513, .717], [.388, .452], [.217, .452], [.757, .452], [.708, .657], [.54, .41]], links: [{ g: 'solitaire' }, { g: 'poker' }] },
    // (2026-11-25) the Rijksmuseum: Indian miniature, two women playing chaturanga
    { id: 'chatur', w: 1400, h: 2048, rijks: 'RP-T-1993-306', bg: '#7a2a22', spots: [[.56, .73], [.39, .59], [.705, .59], [.25, .48], [.2, .38], [.05, .54]], links: [{ g: 'chess' }] },
    // (2026-11-25) the Rijksmuseum: Indian miniature, four women at chaupar/pachisi on a festival night
    { id: 'shabbarat', w: 1554, h: 2048, rijks: 'RP-T-1993-195', bg: '#7d7d80', spots: [[.462, .625], [.545, .666], [.53, .533], [.86, .54], [.595, .44], [.73, .25]], links: [{ g: 'ludo' }] },
    // (2026-11-25) the Rijksmuseum: Chinese famille-rose vase (1724), women playing go, seal 'Tang Jintang'
    { id: 'govase', w: 1480, h: 2048, rijks: 'AK-NM-6352-B', bg: '#d6d6d4', spots: [[.467, .721], [.353, .6], [.587, .658], [.653, .552], [.38, .48], [.36, .726]], links: [{ g: 'go' }, { ex: 'shosoin' }] },
    // (2026-11-25) the Rijksmuseum: surimono (1822): Xuanzong and Yang Guifei playing ban-sugoroku
    { id: 'yokihi', w: 1835, h: 2048, rijks: 'RP-P-1991-545', bg: '#e5e1d6', spots: [[.544, .55], [.265, .375], [.6, .25], [.33, .15], [.865, .31], [.85, .85]], links: [{ g: 'backgammon' }, { ex: 'sugoroku' }] },
    // (2026-11-25) the Rijksmuseum: Disdéri & Cie carte de visite, men in old-fashioned costume playing cards
    { id: 'disderi', w: 1573, h: 1071, rijks: 'RP-F-F01031-12-2', bg: '#e6e0d2', spots: [[.45, .47], [.45, .28], [.32, .33], [.6, .34], [.578, .718], [.9, .5]], links: [{ g: 'solitaire' }, { g: 'poker' }] },
    // (2026-11-25) the Rijksmuseum: Oortman after Stoopendaal, a 74-space spiral goose game
    { id: 'gans', w: 2048, h: 1785, rijks: 'RP-P-1906-150', bg: '#e4e0d4', spots: [[.6, .45], [.075, .91], [.317, .915], [.494, .68], [.3, .57], [.7, .33]], links: [{ ex: 'goose' }, { room: 'chance' }] },
    // (2026-11-25) the Rijksmuseum: Claudine Stella after Jacques Stella, putti playing merelle (nine men's morris) and flying a kite
    { id: 'merelle', w: 2048, h: 1682, rijks: 'RP-P-2023-61-18', bg: '#ddd8cb', spots: [[.12, .73], [.17, .09], [.77, .45], [.83, .78], [.5, .42], [.5, .865]], links: [{ g: 'morris' }] },
    // (2026-11-25) the Rijksmuseum: stereograph, card party at an outdoor table (Feldbrugge & Co., Groningen stamp)
    { id: 'feldcards', w: 2048, h: 1015, rijks: 'RP-F-F10030', bg: '#d8ccb0', spots: [[.199, .33], [.258, .491], [.309, .512], [.428, .299], [.392, .237], [.21, .7]], links: [{ g: 'solitaire' }, { g: 'poker' }] },
  ];
  // (2026-11-24 ユーザー: 読み物と同じく地域で絞る) each work's region — the world map's four (asia / europe / mea / americas). A new work: add it here.
  const REGION = { nefertari: 'mea', shahnama: 'mea', hydria: 'europe', liberale: 'europe', mirror: 'europe', morris: 'europe', teniers: 'europe', webb: 'europe', vuillard: 'europe',
    talbot: 'europe', pvl: 'europe', ingram: 'europe', liubo: 'asia', chaupar: 'asia', shogi: 'asia', sugoroku: 'asia', weiqi: 'asia', leifeng: 'asia', tutinama: 'asia', imari: 'asia',
    shoei: 'asia', umaya: 'asia', goryeo: 'asia', kangra: 'asia', kiyohiro: 'asia', eakins: 'americas' };
  let region = (() => { try { return localStorage.getItem('atlas-paint-region') || 'all'; } catch (e) { return 'all'; } })();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let host = null, ctx = null, lang = 'ja', el = {}, cur = null;
  const zl = i => { const Z = window.AtlasZoomT || {}; return (Z[lang] || Z.en || ['+', '−', '⤢'])[i]; };   // (the zoom buttons' spoken names, from worldmap.js)
  const T = () => window.MUSEUM_PAINT_T || {};
  const tx = () => T()[lang] || T().en || {};
  const u = k => (tx().ui && tx().ui[k]) || ((T().en || {}).ui || {})[k] || k;
  const wt = id => Object.assign({}, (T().en || {})[id] || {}, tx()[id] || {});   // (a language may leave out the record's fields that read the same: size, credit line)

  /* ---------- the wall ---------- */
  function wall() {
    el.lead.textContent = u('lead');
    const RG = ((window.AtlasMap && AtlasMap.REG) || ['all', 'asia', 'europe', 'mea', 'americas']), rl = k => window.AtlasMap && AtlasMap.label ? AtlasMap.label(k, lang) : k;
    const cnt = k => WORKS.filter(W => k === 'all' || REGION[W.id] === k).length; if (region !== 'all' && !cnt(region)) region = 'all';
    const chips = document.createElement('div'); chips.className = 'chips cats ptreg'; chips.setAttribute('role', 'group');
    chips.innerHTML = RG.filter(k => cnt(k)).map(k => `<button type="button" class="chip cat" data-reg="${k}" aria-pressed="${k === region}">${esc(rl(k))}<em>${cnt(k)}</em></button>`).join('');
    chips.querySelectorAll('[data-reg]').forEach(b => b.onclick = () => { region = b.dataset.reg; try { localStorage.setItem('atlas-paint-region', region); } catch (e) {} wall(); const c = el.grid.parentNode.querySelector(`.ptreg [data-reg="${region}"]`); if (c) c.focus(); });
    el.grid.innerHTML = WORKS.filter(W => region === 'all' || REGION[W.id] === region).map(W => { const x = wt(W.id);
      return `<button type="button" class="ptc" data-w="${W.id}" style="--mat:${W.bg}"><span class="ptf"><img src="${IMG}${W.id}-t.webp?v=${V}" alt="${esc(x.title)}" loading="lazy" width="${W.w}" height="${W.h}"></span>
        <span class="ptl"><b>${esc(x.title)}</b><small>${esc(x.date)} · ${esc(x.place)}</small><em>${esc(x.game || '')}</em></span></button>`; }).join('');
    el.grid.querySelectorAll('[data-w]').forEach(b => b.onclick = () => openWork(b.dataset.w));
    if (window.AtlasMuseum && AtlasMuseum.pager) AtlasMuseum.pager(el.grid, 'paint' + (region === 'all' ? '' : '-' + region), { rows: { pc: 3, phone: 4 }, extra: chips });
    el.credit.innerHTML = esc(u('credit'));
    if (window.AtlasMuseum && AtlasMuseum.catalog) AtlasMuseum.catalog('paint', WORKS.map(W => ({ id: W.id, img: `${IMG}${W.id}-t.webp?v=${V}`, t: wt(W.id).title })));
  }

  /* ---------- the viewer ---------- */
  // 番号を隠す (2026-11-24 ユーザー): one switch for the numbered spots, shared with the other room ('atlas-museum-nospots')
  const NOSP = 'atlas-museum-nospots', SPT = { ja: '番号を隠す', en: 'Hide numbers', zh: '隐藏编号', 'zh-TW': '隱藏編號', ko: '번호 숨기기', es: 'Ocultar números', fr: 'Masquer les numéros', pt: 'Ocultar números', de: 'Nummern ausblenden', ru: 'Скрыть номера', tr: 'Numaraları gizle', id: 'Sembunyikan nomor', hi: 'नंबर छिपाएँ', ar: 'إخفاء الأرقام' };
  const noSpots = () => { try { return localStorage.getItem(NOSP) === '1'; } catch (e) { return false; } };
  let ov = null, vs = null;   // the overlay; the view: { s (scale), x, y (translation, px), W, H (the picture at s = 1), fit }
  const MK = (r, ids, n) => { try { if (window.AtlasMuseum && AtlasMuseum.mark) AtlasMuseum.mark(r, ids, n); } catch (e) {} };   // (館内スタンプ帳)
  let ret = null;
  function openWork(id, n, keep) {
    const W = WORKS.find(w => w.id === id); if (!W) return; MK('paint', id, WORKS.length); const was = !!cur; cur = W;
    if (!was) ret = document.activeElement;   // (focus goes back here when the viewer closes)
    if (!keep && !was) try { history.pushState({ ptv: 1 }, ''); } catch (e) {}   // (the back button closes the viewer)
    if (!ov) build();
    const x = wt(W.id);
    ov.querySelector('.ptvimg').src = `${IMG}${W.id}.webp?v=${V}`; ov.querySelector('.ptvimg').alt = x.title || '';
    ov.querySelector('.ptvh').textContent = x.title || '';
    ov.querySelector('.ptvsub').textContent = [x.artist, x.date, x.place].filter(Boolean).join(' · ');
    ov.querySelector('.ptvbody').innerHTML = (x.p || []).map(p => `<p>${esc(p)}</p>`).join('');
    const sp = x.spots || [];
    ov.querySelector('.ptvspl').innerHTML = W.spots.map((_, i) => `<li><button type="button" data-n="${i}"><i>${i + 1}</i><span><b>${esc((sp[i] || [])[0] || '')}</b>${esc((sp[i] || [])[1] || '')}</span></button></li>`).join('');
    ov.querySelector('.ptvspots').innerHTML = W.spots.map((p, i) => `<button type="button" class="ptsp" data-n="${i}" style="left:${p[0] * 100}%;top:${p[1] * 100}%" aria-label="${i + 1}">${i + 1}</button>`).join('');
    const games = ctx.games || [];
    ov.querySelector('.ptvlinks').innerHTML = W.links.map(L => {
      if (L.g) { const g = games.find(q => q.id === L.g); return g ? `<button type="button" class="chlk" data-g="${L.g}"><i>${esc(u('game'))}</i>${esc(ctx.gname ? ctx.gname(g) : L.g)}</button>` : ''; }
      if (L.ex) { const mu = (window.ATLAS_MU || {})[L.ex], nm = (mu && mu.n && (mu.n[lang] || mu.n.en)) || (tx().ex || {})[L.ex] || ((T().en || {}).ex || {})[L.ex] || L.ex; return `<button type="button" class="chlk ex" data-ex="${L.ex}"><i>${esc(u('exhibit'))}</i>${esc(nm)}</button>`; }
      return `<button type="button" class="chlk rm" data-room="${L.room}"><i>${esc(u('room'))}</i>${esc(u('room_' + L.room))}</button>`; }).join('');
    ov.querySelector('.ptvrec').innerHTML = [[u('r_artist'), x.artist], [u('r_date'), x.date], [u('r_place'), x.place], [u('r_medium'), x.medium], [u('r_size'), x.size],
      [u('r_museum'), W.rijks ? u('rijks') + ' ' + W.rijks : W.aic ? u('aic') + ' ' + W.no : W.cma ? u('cma') + ' ' + W.cma : u('met') + ' ' + W.no], [u('r_credit'), x.credit], [u('r_rights'), u('cc0')]].filter(r => r[1]).map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('')
      + `<dt></dt><dd><a href="${W.rijks ? 'https://www.rijksmuseum.nl/en/collection/' + W.rijks : W.aic ? 'https://www.artic.edu/artworks/' + W.aic : W.cma ? 'https://www.clevelandart.org/art/' + W.cma : 'https://www.metmuseum.org/art/collection/search/' + W.met}" target="_blank" rel="noopener">${esc(u('metlink'))} ↗</a></dd>`;
    ov.querySelector('.ptvlinks').querySelectorAll('[data-g]').forEach(b => b.onclick = () => { window.AtlasPaint.onClose = null; close(true); ctx.open && ctx.open(b.dataset.g); });
    ov.querySelector('.ptvlinks').querySelectorAll('[data-ex]').forEach(b => b.onclick = () => { window.AtlasPaint.onClose = null; close(true); ctx.goEx && ctx.goEx(b.dataset.ex); });
    ov.querySelector('.ptvlinks').querySelectorAll('[data-room]').forEach(b => b.onclick = () => { window.AtlasPaint.onClose = null; close(true); ctx.goRoom && ctx.goRoom(b.dataset.room); });
    ov.querySelectorAll('[data-n]').forEach(b => b.onclick = e => { e.stopPropagation(); spot(+b.dataset.n); });
    ov.querySelector('.ptvlinksh').textContent = u('links'); ov.querySelector('.ptvsph').textContent = u('details'); ov.querySelector('.ptvrech').textContent = u('record');
    ov.querySelector('.ptvhint').textContent = u('hint');
    const idx = WORKS.indexOf(W);
    ov.querySelector('[data-k="prev"]').disabled = idx === 0; ov.querySelector('[data-k="next"]').disabled = idx === WORKS.length - 1;
    ov.querySelector('.ptvcount').textContent = `${idx + 1} / ${WORKS.length}`;
    ov.querySelector('.ptvside').scrollTop = 0;
    ov.classList.add('on'); document.documentElement.classList.add('ptv-open');
    vs = { s: 1, x: 0, y: 0, W: 0, H: 0, fit: 1 }; hiSpot(-1);
    requestAnimationFrame(() => { fitView(); if (n != null) spot(n); if (!was) { const x = ov.querySelector('[data-k="x"]'); if (x) x.focus({ preventScroll: true }); } });
  }
  function close(nohist) { if (!ov || !ov.classList.contains('on')) return; ov.classList.remove('on'); document.documentElement.classList.remove('ptv-open'); cur = null; if (!nohist) try { if (history.state && history.state.ptv) history.back(); } catch (e) {}
    // (2026-11-24 audit: back where you were) a room that opened the viewer from elsewhere (a story's figure) takes the reader back; otherwise focus returns to what opened it
    const f = window.AtlasPaint && AtlasPaint.onClose; if (window.AtlasPaint) AtlasPaint.onClose = null; const r0 = ret; ret = null;
    if (f) f(); else if (r0 && r0.isConnected && r0.offsetParent) r0.focus({ preventScroll: true }); }
  function fitView() {
    if (!cur) return; const st = ov.querySelector('.ptvstage'), sw = st.clientWidth, sh = st.clientHeight, pad = innerWidth < 820 ? 12 : 28;
    const k = Math.min((sw - pad * 2) / cur.w, (sh - pad * 2) / cur.h);
    vs.W = cur.w * k; vs.H = cur.h * k; vs.fit = 1; vs.s = 1; vs.x = (sw - vs.W) / 2; vs.y = (sh - vs.H) / 2; apply(false);
  }
  function clamp() { const st = ov.querySelector('.ptvstage'), sw = st.clientWidth, sh = st.clientHeight, w = vs.W * vs.s, h = vs.H * vs.s;
    vs.x = w <= sw ? (sw - w) / 2 : Math.min(0, Math.max(sw - w, vs.x)); vs.y = h <= sh ? (sh - h) / 2 : Math.min(0, Math.max(sh - h, vs.y)); }
  function apply(anim) {
    const f = ov.querySelector('.ptvframe'); f.classList.toggle('anim', !!anim); clamp();
    f.style.width = vs.W + 'px'; f.style.height = vs.H + 'px'; f.style.transform = `translate(${vs.x}px,${vs.y}px) scale(${vs.s})`;
    f.style.setProperty('--is', 1 / vs.s); ov.querySelector('[data-k="out"]').disabled = vs.s <= 1.001; ov.querySelector('[data-k="in"]').disabled = vs.s >= 5.99;
  }
  function zoomAt(k, cx, cy, anim) { const s1 = Math.max(1, Math.min(6, vs.s * k)), r = s1 / vs.s; vs.x = cx - (cx - vs.x) * r; vs.y = cy - (cy - vs.y) * r; vs.s = s1; apply(anim); }
  function center() { const st = ov.querySelector('.ptvstage'); return [st.clientWidth / 2, st.clientHeight / 2]; }
  let hi = -1;
  function hiSpot(n) { hi = n; ov.querySelectorAll('.ptsp').forEach(b => b.classList.toggle('on', +b.dataset.n === n)); ov.querySelectorAll('.ptvspl button').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
    const cap = ov.querySelector('.ptvcap'), sp = (wt(cur.id).spots || [])[n];
    if (n < 0 || !sp) { cap.classList.remove('on'); return; } cap.innerHTML = `<i>${n + 1}</i><span><b>${esc(sp[0])}</b>${esc(sp[1])}</span><button type="button" aria-label="×">×</button>`; cap.classList.add('on');
    cap.querySelector('button').onclick = e => { e.stopPropagation(); hiSpot(-1); }; }
  // a detail: zoom in on it (2.6×) and show its words
  function spot(n) {
    if (!cur) return; if (hi === n) { hiSpot(-1); return; } const p = cur.spots[n], st = ov.querySelector('.ptvstage'), sw = st.clientWidth, sh = st.clientHeight;
    const s1 = Math.max(vs.s, 2.6); vs.s = s1; vs.x = sw / 2 - p[0] * vs.W * s1; vs.y = sh * (innerWidth < 820 ? .42 : .5) - p[1] * vs.H * s1; apply(true); hiSpot(n);
    const li = ov.querySelector(`.ptvspl button[data-n="${n}"]`); if (li && innerWidth >= 820) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function build() {
    ov = document.createElement('div'); ov.className = 'ptv'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `<div class="ptvstage"><div class="ptvframe"><img class="ptvimg" alt="" draggable="false"><div class="ptvspots"></div></div>
        <div class="ptvtools" dir="ltr"><button type="button" data-k="prev" aria-label="←">‹</button><span class="ptvcount"></span><button type="button" data-k="next" aria-label="→">›</button>
          <span class="sep"></span><button type="button" data-k="out" aria-label="${zl(1)}">−</button><button type="button" data-k="fit" aria-label="${zl(2)}">⤢</button><button type="button" data-k="in" aria-label="${zl(0)}">+</button><span class="sep"></span><button type="button" data-k="spots" class="ptvnum" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/><path class="sl" d="M4 4l16 16"/></svg></button></div>
        <div class="ptvcap"></div><p class="ptvhint"></p><button type="button" class="ptvx" data-k="x" aria-label="×">×</button></div>
      <aside class="ptvside"><h3 class="ptvh"></h3><p class="ptvsub"></p><div class="ptvbody"></div>
        <h4 class="ptvsph"></h4><ol class="ptvspl"></ol><h4 class="ptvlinksh"></h4><div class="ptvlinks"></div><h4 class="ptvrech"></h4><dl class="ptvrec"></dl></aside>`;
    document.body.appendChild(ov);
    const st = ov.querySelector('.ptvstage');
    ov.querySelector('[data-k="x"]').onclick = () => close();
    ov.querySelector('[data-k="prev"]').onclick = () => { const i = WORKS.indexOf(cur); if (i > 0) openWork(WORKS[i - 1].id, null, true); };
    ov.querySelector('[data-k="next"]').onclick = () => { const i = WORKS.indexOf(cur); if (i < WORKS.length - 1) openWork(WORKS[i + 1].id, null, true); };
    ov.querySelector('[data-k="in"]').onclick = () => { const [cx, cy] = center(); zoomAt(1.6, cx, cy, true); };
    ov.querySelector('[data-k="out"]').onclick = () => { const [cx, cy] = center(); zoomAt(1 / 1.6, cx, cy, true); };
    ov.querySelector('[data-k="fit"]').onclick = () => { fitView(); hiSpot(-1); };
    const sb = ov.querySelector('[data-k="spots"]'), setSp = off => { ov.classList.toggle('nospots', off); sb.setAttribute('aria-pressed', off); const l = SPT[lang] || SPT.en; sb.setAttribute('aria-label', l); sb.title = l; if (off) hiSpot(-1); };
    sb.onclick = () => { const off = !ov.classList.contains('nospots'); try { localStorage.setItem(NOSP, off ? '1' : '0'); } catch (e) {} setSp(off); };
    setSp(noSpots());
    st.addEventListener('wheel', e => { e.preventDefault(); const r = st.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * .0016), e.clientX - r.left, e.clientY - r.top, false); }, { passive: false });
    // drag with one pointer, pinch with two; a quick double tap zooms in (or back out)
    const P = new Map(); let g = null, lastTap = 0;
    st.addEventListener('pointerdown', e => { ov.querySelector('.ptvhint').classList.add('off'); if (e.target.closest('button')) return; st.setPointerCapture(e.pointerId); P.set(e.pointerId, [e.clientX, e.clientY]);
      g = P.size === 1 ? { x: vs.x, y: vs.y, p: [e.clientX, e.clientY], m: 0 } : { pinch: true, d: dist(), s: vs.s, c: mid(), x: vs.x, y: vs.y }; });
    const dist = () => { const a = [...P.values()]; return Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]); };
    const mid = () => { const a = [...P.values()], r = st.getBoundingClientRect(); return [(a[0][0] + a[1][0]) / 2 - r.left, (a[0][1] + a[1][1]) / 2 - r.top]; };
    st.addEventListener('pointermove', e => { if (!P.has(e.pointerId) || !g) return; P.set(e.pointerId, [e.clientX, e.clientY]);
      if (g.pinch && P.size >= 2) { const s1 = Math.max(1, Math.min(6, g.s * dist() / g.d)), c = mid(), r = s1 / g.s; vs.s = s1; vs.x = c[0] - (g.c[0] - g.x) * r; vs.y = c[1] - (g.c[1] - g.y) * r; apply(false); return; }
      const dx = e.clientX - g.p[0], dy = e.clientY - g.p[1]; g.m = Math.max(g.m, Math.hypot(dx, dy)); if (g.m > 4) { vs.x = g.x + dx; vs.y = g.y + dy; apply(false); } });
    const up = e => { if (!P.has(e.pointerId)) return; P.delete(e.pointerId); const tap = g && !g.pinch && g.m <= 4;
      if (tap) { const now = performance.now(), r = st.getBoundingClientRect(); if (now - lastTap < 320) { if (vs.s > 1.2) fitView(); else zoomAt(2.4, e.clientX - r.left, e.clientY - r.top, true); lastTap = 0; } else lastTap = now; }
      g = P.size === 1 ? { x: vs.x, y: vs.y, p: [...P.values()][0], m: 99 } : null; };
    st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
    addEventListener('keydown', e => { if (!ov.classList.contains('on')) return; if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') ov.querySelector('[data-k="prev"]').click(); else if (e.key === 'ArrowRight') ov.querySelector('[data-k="next"]').click(); });
    addEventListener('popstate', () => { if (ov.classList.contains('on')) close(true); });
    addEventListener('resize', () => { if (cur) fitView(); });
  }

  function render(box, c) {
    ctx = c; lang = T()[c.lang] ? c.lang : 'en'; MK('paint', null, WORKS.length);
    if (host !== box || !box.querySelector('.ptx')) { host = box; box.innerHTML = `<div class="ptx"><p class="chlead ptlead"></p><div class="ptgrid"></div><p class="ptcredit"></p></div>`;
      el = { lead: box.querySelector('.ptlead'), grid: box.querySelector('.ptgrid'), credit: box.querySelector('.ptcredit') }; }
    wall();
  }
  window.AtlasPaint = { render, WORKS, V, open: openWork, close: () => close(), _view: () => vs };
})();
