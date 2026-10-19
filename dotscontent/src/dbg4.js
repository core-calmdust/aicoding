const L=require('./lib.js'),{E}=L;
const n=4, c=L.readJsonl('/home/claude/work/ckpt/dotscontent/cand_4.jsonl'), G=E.geom(n,n);
const S=new E.Solver(G,22);
const rec=new Map();
const orig=S.search.bind(S);
S.search=function(p,a,b,ply){ const v=orig(p,a,b,ply); const s=this.canon(p), idx=p.h2[s]&this.mask; if(this.used[idx]&&this.k1[idx]===p.h1[s]&&this.k2[idx]===p.h2[s]) rec.set(idx+':'+p.h1[s]+':'+p.h2[s], {edges:p.edges(), lo:this.lo[idx], hi:this.hi[idx]}); return v; };
S.limit(0,60000); S.all(E.Pos.from(G,c[56].edges));
console.log('entries',rec.size);
(async()=>{ const N=new L.Native(4); let bad=0,k=0;
 for(const [key,r] of rec){ const s=await N.solve(r.edges); if(s.v<r.lo||s.v>r.hi){bad++; if(bad<6) console.log('BAD',JSON.stringify(r.edges),'true',s.v,'lo',r.lo,'hi',r.hi);} k++; }
 console.log('checked',k,'bad',bad); N.close(); })();
