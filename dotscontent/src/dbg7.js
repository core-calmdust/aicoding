const L=require('./lib.js'),{E}=L;
const n=4, c=L.readJsonl('/home/claude/work/ckpt/dotscontent/cand_4.jsonl'), G=E.geom(n,n);
const S=new E.Solver(G,22);
const orig=S.search.bind(S); let found=0; const first=new Map();
S.search=function(p,a,b,ply){ const s=this.canon(p), idx=p.h2[s]&this.mask;
  const v=orig(p,a,b,ply);
  if(this.used[idx]&&this.k1[idx]===p.h1[s]&&this.k2[idx]===p.h2[s]){ const key=idx+':'+this.k1[idx]+':'+this.k2[idx]; const lo=this.lo[idx],hi=this.hi[idx];
    const prev=first.get(key); if(!prev) first.set(key,{edges:p.edges(),lo,hi,a,b,v,s});
    else if(found<2 && prev.edges.join()!==p.edges().join()){ const F=new E.Solver(G,20);F.limit(0,60000); const t1=F.value(E.Pos.from(G,prev.edges)); const F2=new E.Solver(G,20);F2.limit(0,60000); const t2=F2.value(p.clone());
       if(t1!==t2){found++; console.log('NON-EQUIV same key', JSON.stringify(prev.edges), t1, 'vs', JSON.stringify(p.edges()), t2, 's', prev.s, s);} } }
  return v; };
S.limit(0,600000); S.all(E.Pos.from(G,c[56].edges)); console.log('done', first.size);
