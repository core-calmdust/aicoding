const L=require('./lib.js'),{E}=L; const G=E.geom(4,4);
for (const ed of [[2,4,9,11,12,13,14,15,16,17,18,19,20,22,24,26,29,31,33,34,35,36,37,38,39],[2,3,4,5,11,12,14,16,17,18,19,20,22,24,26,29,31,38,39]]){
const p=E.Pos.from(G,ed); const S=new E.Solver(G,22); S.limit(0,60000); console.log('fresh value',S.value(p),'filled',p.filled,'undrawn',p.undrawn, 'rem', 16-p.filled);
const cnt=Array.from(p.cnt); console.log(cnt.join(''));}
