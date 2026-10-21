// Backgammon V2 — data-driven themes: checker colours (gold / black / red / white) and board skins.
// Everything visual that depends on the choice reads from these tables, so a colour or a skin is adjusted here only.
(function (root) {
'use strict';
// checker palettes: c1..c4 = radial gradient (highlight -> rim), ring = inner rim line, txt = stack-count digits,
// sh = sheen strength, flat/edge = flat drawings (mini boards, discs), dot = kifu dot, die = the side's dice
const CK = {
  gold: { c1: '#fff6dc', c2: '#e6cd8c', c3: '#b39249', c4: '#5e4720', ring: 'rgba(255,240,200,.4)', inner: 'rgba(80,58,20,.45)', txt: '#3d2c0c', sh: .25,
    flat: '#e2c275', edge: '#7a5c22', dot: '#e6cd8c', last: 'rgba(70,48,10,.75)',
    die: { face: [239, 228, 204], edge: [196, 182, 150], pip: '#4a1512', css: ['#fffaf0', '#efe4cc', '#cdbf9e'], cpip: ['#6b2420', '#3a0f0c'] } },
  black: { c1: '#7b808a', c2: '#33363d', c3: '#16181c', c4: '#050506', ring: 'rgba(205,210,220,.55)', inner: 'rgba(0,0,0,.6)', txt: '#e8eaee', sh: .16,
    flat: '#202328', edge: '#c9ccd2', dot: '#555a63', last: 'rgba(255,255,255,.8)',
    die: { face: [40, 43, 49], edge: [16, 17, 20], pip: '#ead9a8', css: ['#3d4148', '#202328', '#0e0f12'], cpip: ['#f4e7c5', '#c9a961'] } },
  red: { c1: '#ffc2b4', c2: '#dc5444', c3: '#9a231c', c4: '#3e0806', ring: 'rgba(255,200,185,.45)', inner: 'rgba(70,8,6,.5)', txt: '#fff3ec', sh: .22,
    flat: '#c23a2f', edge: '#ffb3a3', dot: '#dc5444', last: 'rgba(255,240,230,.85)',
    die: { face: [196, 52, 42], edge: [120, 24, 18], pip: '#fff4e4', css: ['#e3685a', '#bf3a2f', '#7d1913'], cpip: ['#fffaf0', '#eadcc0'] } },
  white: { c1: '#ffffff', c2: '#f3efe6', c3: '#d2cbbd', c4: '#8a8273', ring: 'rgba(255,255,255,.75)', inner: 'rgba(90,80,60,.35)', txt: '#3a352c', sh: .3,
    flat: '#f1ede4', edge: '#8a8273', dot: '#efeae0', last: 'rgba(60,50,30,.7)',
    die: { face: [250, 249, 245], edge: [205, 200, 188], pip: '#1d1d22', css: ['#ffffff', '#f1eee6', '#cfc9bb'], cpip: ['#2a2a30', '#0c0c10'] } },
};
const CK_IDS = ['gold', 'black', 'red', 'white'];
// sensible partner when the chosen colour equals the other side's
const PARTNER = { gold: 'black', black: 'gold', red: 'white', white: 'red' };
function fixPair(a, b, changed) {
  if (!CK[a]) a = 'gold'; if (!CK[b]) b = 'black';
  if (a === b) { if (changed === 1) a = PARTNER[b]; else b = PARTNER[a]; }
  return [a, b];
}
function applyCheckers(pair) {
  const st = document.documentElement.style;
  pair.forEach((id, s) => {
    const c = CK[id] || CK.gold, k = `--k${s}`;
    st.setProperty(k + 'c1', c.c1); st.setProperty(k + 'c2', c.c2); st.setProperty(k + 'c3', c.c3); st.setProperty(k + 'c4', c.c4);
    st.setProperty(k + 'ring', c.ring); st.setProperty(k + 'inner', c.inner); st.setProperty(k + 'txt', c.txt); st.setProperty(k + 'sh', String(c.sh));
    st.setProperty(k + 'flat', c.flat); st.setProperty(k + 'edge', c.edge); st.setProperty(k + 'dot', c.dot); st.setProperty(k + 'last', c.last);
    st.setProperty(k + 'd1', c.die.css[0]); st.setProperty(k + 'd2', c.die.css[1]); st.setProperty(k + 'd3', c.die.css[2]);
    st.setProperty(k + 'p1', c.die.cpip[0]); st.setProperty(k + 'p2', c.die.cpip[1]);
    if (root.Dice3D && root.Dice3D.COLORS) Object.assign(root.Dice3D.COLORS[s], { face: c.die.face, edge: c.die.edge, pip: c.die.pip });
  });
}

// board skins: every colour of the board drawing (app.js drawBoardSvg / mini boards) comes from here.
// frame: wood/lacquer gradient (3 stops) + grain line colour; felt: radial gradient (centre -> edge); ptA / ptB: the two
// point colours (tip -> base); bar / tray: gradients; inlay: the decorative line + studs (null = none);
// lbl / pip: point numbers and pip counts on the frame; mini: flat colours for the small diagrams
const SKINS = {
  classic: { frame: ['#3a2416', '#24150c', '#3b2517'], grain: 'rgba(255,220,170,.05)', felt: ['#1d6a4b', '#145238', '#0b3424'], noise: .9,
    ptA: ['#efe5cc', '#c8b994'], ptB: ['#7a2a24', '#4a1612'], bar: ['#1f130a', '#3a2416', '#1f130a'], tray: ['#08251a', '#0d2f21', '#08251a'],
    inlay: ['#f0d68f', '#b8934e', '#e2c275'], hinge: true, lbl: 'rgba(226,194,117,.62)', pip: 'rgba(255,246,220,.82)',
    mini: { frame: '#2b1a10', felt: '#17573f', a: '#e6dbc2', b: '#6b2420', tray: '#0d2f21' } },
  tournament: { frame: ['#4a2c18', '#2e1a0e', '#4d2f1a'], grain: 'rgba(255,215,160,.07)', felt: ['#2f7d4f', '#21633c', '#164a2c'], noise: 1,
    ptA: ['#e9d8b4', '#cdb88c'], ptB: ['#1f3a2a', '#122419'], bar: ['#2a180c', '#4a2c18', '#2a180c'], tray: ['#13341f', '#1a4229', '#13341f'],
    inlay: ['#d8c39a', '#9c7f4f', '#cdb88c'], hinge: true, lbl: 'rgba(233,216,180,.7)', pip: 'rgba(255,248,230,.9)',
    mini: { frame: '#3a2314', felt: '#256b42', a: '#e2d0aa', b: '#1c3627', tray: '#1a4229' } },
  marble: { frame: ['#e9e6df', '#cfcac0', '#ece8e1'], grain: 'rgba(90,90,100,.08)', felt: ['#5d6f86', '#4a5a70', '#37445a'], noise: .7,
    ptA: ['#f6f3ec', '#d9d3c6'], ptB: ['#2a2f3a', '#16191f'], bar: ['#bdb7ab', '#dcd7cd', '#bdb7ab'], tray: ['#3c485c', '#48566c', '#3c485c'],
    inlay: ['#8d8a83', '#5f5c57', '#8d8a83'], hinge: false, lbl: 'rgba(60,62,70,.75)', pip: 'rgba(30,32,40,.9)',
    mini: { frame: '#d9d4ca', felt: '#4f6077', a: '#f1ede4', b: '#22262f', tray: '#48566c' } },
  luxe: { frame: ['#17171b', '#0a0a0c', '#1a1a1f'], grain: 'rgba(255,255,255,.03)', felt: ['#4a1620', '#371018', '#230a10'], noise: .8,
    ptA: ['#e8c877', '#a9873e'], ptB: ['#33333b', '#1b1b21'], bar: ['#0a0a0c', '#1d1d22', '#0a0a0c'], tray: ['#1e0a0f', '#2a0e15', '#1e0a0f'],
    inlay: ['#f4dc95', '#b58f3f', '#e8c877'], hinge: true, lbl: 'rgba(232,200,119,.75)', pip: 'rgba(255,240,200,.9)',
    mini: { frame: '#111114', felt: '#3c121b', a: '#d9b968', b: '#0e0e10', tray: '#2a0e15' } },
  modern: { frame: ['#1c2a3a', '#14202d', '#1e2d3e'], grain: 'rgba(255,255,255,0)', felt: ['#2a4a63', '#223e55', '#1a3246'], noise: 0,
    ptA: ['#f2b95c', '#e39a3a'], ptB: ['#5fc2c0', '#3c9c9a'], bar: ['#14202d', '#1c2a3a', '#14202d'], tray: ['#18293a', '#1e3346', '#18293a'],
    inlay: null, hinge: false, lbl: 'rgba(200,220,235,.7)', pip: 'rgba(240,248,255,.9)',
    mini: { frame: '#18242f', felt: '#244259', a: '#efb153', b: '#4fb3b1', tray: '#1e3346' } },
};
const SKIN_IDS = Object.keys(SKINS);
const skin = id => SKINS[id] || SKINS.classic;
function applySkin(id) {
  const k = skin(id), st = document.documentElement.style;
  st.setProperty('--lbl', k.lbl); st.setProperty('--lblpip', k.pip);
}
root.BGTheme = { CK, CK_IDS, PARTNER, fixPair, applyCheckers, SKINS, SKIN_IDS, skin, applySkin };
})(typeof window !== 'undefined' ? window : globalThis);
