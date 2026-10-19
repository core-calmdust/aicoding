const E=require('/home/claude/aicoding/dots/engine.js');E.x4Ready();const G=E.geom(4,4);
const p=new E.Pos(G); console.log('root book',E.x4Book(p));
let miss=0,vals=[];for(let e=0;e<40;e++){const q=p.clone();q.play(e);const b=E.x4Book(q);if(!b||b.flag!==1)miss++;else vals.push(-b.value);}
console.log('ply1 children covered',40-miss,'vals',vals.join(','));
const b0=E.x4Book(p).move; const q=p.clone();q.play(b0);let m2=0;for(let e=0;e<40;e++){if(q.drawn[e])continue;const r=q.clone();r.play(e);const b=E.x4Book(r);if(!b||b.flag!==1)m2++;}
console.log('after book move',b0,'replies missing',m2);
