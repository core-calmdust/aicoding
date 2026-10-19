const L=require('./lib.js'),{E}=L;
(async()=>{
for (const [n,edges] of [[4,[2,3,5,7,8,12,18,20,22,27,28,30,31,32,33,34]],[4,[0,2,3,5,6,7,11,14,15,17,18,19,28,29,30,35,37,38,39]],[5,[2,3,5,7,8,12,18,20,22,27,28,30,31,32,33,34].map(x=>x)]].slice(0,2)){
 const N=new L.Native(n); const a=await N.solve(edges); N.close();
 const G=E.geom(n,n); const p=E.Pos.from(G,edges);
 const S1=new E.Solver(G,22); S1.limit(0,60000); const b=S1.all(p);
 const S2=new E.Solver(G,22); S2.prune=true; S2.limit(0,60000); const c=S2.all(p);
 const s=L.jsSolve(n,edges,60000);
 const cands=L.readJsonl('/home/claude/work/ckpt/dotscontent/cand_'+n+'.jsonl'); const f=cands.find(x=>x.edges.join()==edges.join());
 const old=require('/home/claude/work/ckpt/dotscontent/old_puzzles.json'); let o=null; old.levels.forEach(l=>l.puzzles.forEach(pz=>{if(pz.edges.join()==edges.join())o=pz;}));
 console.log('native',JSON.stringify(a.vals)); console.log('js    ',JSON.stringify(b.map(x=>[x.m,x.v]))); console.log('jsprun',JSON.stringify(c.map(x=>[x.m,x.v])));console.log('jsSolve',JSON.stringify(s.vals));
 console.log('cand',f&&JSON.stringify(f.vals),'old',o&&JSON.stringify(o.values));
}})();
