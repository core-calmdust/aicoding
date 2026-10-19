const L=require('./lib.js'),{E}=L;
const n=4, c=L.readJsonl('/home/claude/work/ckpt/dotscontent/cand_4.jsonl'), G=E.geom(n,n);
const S=new E.Solver(G,22);
const orig=S.search.bind(S); let found=0, depth=0;
S.search=function(p,a,b,ply){ const s=this.canon(p), idx=p.h2[s]&this.mask; const had=this.used[idx]&&this.k1[idx]===p.h1[s]&&this.k2[idx]===p.h2[s]; const plo=had?this.lo[idx]:null, phi=had?this.hi[idx]:null;
  depth++; const v=orig(p,a,b,ply); depth--;
  if(found<3 && p.undrawn<=18 && this.used[idx]&&this.k1[idx]===p.h1[s]&&this.k2[idx]===p.h2[s]){ const lo=this.lo[idx],hi=this.hi[idx];
    const F=new E.Solver(G,20); F.limit(0,60000); const t=F.value(p.clone());
    if(t<lo||t>hi){found++; console.log('BAD store edges',JSON.stringify(p.edges()),'true',t,'stored',lo,hi,'window',a,b,'returned',v,'prev',plo,phi,'cap',p.hasCapture(), 'cnt',Array.from(p.cnt).join(''));}}
  return v; };
S.limit(0,600000); S.all(E.Pos.from(G,c[56].edges)); console.log('done');
