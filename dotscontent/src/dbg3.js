const L=require('./lib.js'),{E}=L;
const n=4, c=L.readJsonl('/home/claude/work/ckpt/dotscontent/cand_4.jsonl'), G=E.geom(n,n);
function run(idxs, prune){ const S=new E.Solver(G,22); S.prune=prune; let res; for(const i of idxs){ S.limit(0,60000); res=S.all(E.Pos.from(G,c[i].edges)); } const m=new Map(res.map(x=>[x.m,x.v])); return c[idxs[idxs.length-1]].vals.every(([e,v])=>m.get(e)===v); }
const T=86; const pre=[...Array(T).keys()];
console.log('prune full prefix', run([...pre,T],true), 'noprune', run([...pre,T],false));
// bisect: smallest prefix suffix set
let lo=0, hi=T; // find largest start s such that run([s..T-1, T]) fails
while(lo<hi){const mid=Math.ceil((lo+hi)/2); if(!run([...pre.slice(mid),T],true)) lo=mid; else hi=mid-1;}
console.log('fails with start',lo, 'single prev', lo<T?run([lo,T],true):null);
console.log(JSON.stringify(c[lo].edges), JSON.stringify(c[T].edges));
