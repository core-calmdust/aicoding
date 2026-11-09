// Amazons: the 2D amazon pieces (a crowned queen figure, upright, softly shaded) -> img/pc-<set>-w.svg / -b.svg
// node tools/gen_pieces.js
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'img');
// [highlight, mid, shade, rim, trim]
const SETS = {
  classic: { w: ['#fffaf0', '#efe2c4', '#b99d6c', '#7a6340', '#d9b56a'], b: ['#6b5547', '#3a2a22', '#160e0b', '#050302', '#c9a25a'] },
  metal: { w: ['#ffffff', '#dfe5ea', '#97a3ae', '#56616c', '#f3f6f9'], b: ['#c99a5a', '#8a5a26', '#3e2208', '#1c0e02', '#ffd88a'] },
  glass: { w: ['#ffffff', '#e8f4f6', '#a9c6cc', '#6e8f96', '#ffffff'], b: ['#5a6670', '#26303a', '#0a1016', '#000000', '#9fc4d8'] },
  flat: { w: ['#fbfbf8', '#f3f2ee', '#e3e1da', '#2a2a2a', '#2a2a2a'], b: ['#3a3a3c', '#2a2a2c', '#1c1c1e', '#000000', '#f3f2ee'] },
};
// one figure: base, skirt, waist, collar and a five-pointed crown with pearls
const BODY = 'M22 86 Q22 78 30 76 L33 72 Q40 64 40 54 Q38 46 34 42 L66 42 Q62 46 60 54 Q60 64 67 72 L70 76 Q78 78 78 86 Q78 92 50 92 Q22 92 22 86 Z';
const CROWN = 'M30 42 L26 20 L38 32 L44 14 L50 30 L56 14 L62 32 L74 20 L70 42 Z';
function svg(c, glass, flat) {
  const [hi, mid, sh, rim, trim] = c, op = glass ? 0.82 : 1;
  const fill = flat ? `fill="${mid}"` : 'fill="url(#g)"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${sh}"/><stop offset=".32" stop-color="${hi}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${sh}"/></linearGradient>
<radialGradient id="p" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="${trim}"/><stop offset="1" stop-color="${rim}"/></radialGradient></defs>
<ellipse cx="50" cy="92" rx="30" ry="5" fill="#000" fill-opacity=".28"/>
<g fill-opacity="${op}" stroke="${rim}" stroke-width="${flat ? 3 : 1.6}" stroke-linejoin="round">
<path d="${CROWN}" ${fill}/>
<path d="${BODY}" ${fill}/>
<ellipse cx="50" cy="42" rx="18" ry="4.2" ${flat ? `fill="${trim}"` : 'fill="url(#g)"'}/>
<path d="M28 80 Q50 85 72 80" fill="none" stroke="${trim}" stroke-width="2.4"/>
</g>
${[26, 44, 56, 74].map((x, i) => `<circle cx="${x}" cy="${[20, 14, 14, 20][i]}" r="3.6" fill="${flat ? trim : 'url(#p)'}" stroke="${rim}" stroke-width="1"/>`).join('')}
<circle cx="50" cy="28" r="2.6" fill="${flat ? trim : 'url(#p)'}"/>
${flat ? '' : `<path d="M38 56 Q40 66 36 74" fill="none" stroke="#fff" stroke-opacity="${glass ? .7 : .35}" stroke-width="2.2" stroke-linecap="round"/>`}
</svg>`;
}
for (const [k, s] of Object.entries(SETS)) for (const side of ['w', 'b']) fs.writeFileSync(path.join(OUT, `pc-${k}-${side}.svg`), svg(s[side], k === 'glass', k === 'flat'));
console.log('ok');
