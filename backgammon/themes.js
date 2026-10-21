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
root.BGTheme = { CK, CK_IDS, PARTNER, fixPair, applyCheckers };
})(typeof window !== 'undefined' ? window : globalThis);
