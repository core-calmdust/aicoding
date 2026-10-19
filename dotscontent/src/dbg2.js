const L=require('./lib.js'),{E}=L;
const n=+process.argv[2];
const c=L.readJsonl('/home/claude/work/ckpt/dotscontent/cand_'+n+'.jsonl');
let bad=0;
for(let i=0;i<c.length;i++){const s=L.jsSolve(n,c[i].edges,20000); if(!s){continue;} const m=new Map(s.vals); if(!c[i].vals.every(([e,v])=>m.get(e)===v)){bad++; console.log('mismatch at',i,JSON.stringify(c[i].edges)); 
 const G=E.geom(n,n),S=new E.Solver(G,22);S.prune=true;S.limit(0,60000);const f=S.all(E.Pos.from(G,c[i].edges));const fm=new Map(f.map(x=>[x.m,x.v]));
 console.log(' fresh==cand',c[i].vals.every(([e,v])=>fm.get(e)===v), 'diffs',c[i].vals.filter(([e,v])=>m.get(e)!==v).map(([e,v])=>[e,v,m.get(e),fm.get(e)]).join(' '));
 if(bad>3)break;}}
console.log('bad',bad);
