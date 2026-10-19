const L=require('./lib.js'),{E}=L;const G=E.geom(3,3);
// symmetry index of 180° rotation: tfs[2] = (r,c)->[n-r,n-c]
const rot=G.perms[2];
(async()=>{const N=new L.Native(3);
 // orbit classes of first moves
 const cls=new Map(); for(let e=0;e<G.E;e++){const k=Math.min(...G.perms.map(p=>p[e]));(cls.get(k)||cls.set(k,[]).get(k)).push(e);}
 console.log('first move classes',[...cls.values()].map(a=>a.join(',')).join(' | '));
 // depth stats: ply k: fraction of optimal moves along optimal random lines
 const r=L.rng(5); const stat={}; let mirrorOk=0,mirrorTot=0;
 for(let g=0;g<300;g++){ let edges=[]; const p=new E.Pos(G); let turn=0;
  for(let ply=0;ply<24;ply++){ const s=await N.solve(edges); const best=L.bestSet(s.vals); const nl=s.vals.length;
   (stat[ply]=stat[ply]||[]).push(best.length/nl);
   let e;
   if(turn===1 && edges.length){ const last=edges[edges.length-1]; const m=rot[last]; if(!p.drawn[m]){mirrorTot++; if(best.includes(m))mirrorOk++;}}
   e=L.pick(best,r); edges.push(e); const k=p.play(e); if(!k) turn^=1; if(p.undrawn===0)break;}
 }
 for(const k in stat){const a=stat[k];console.log('ply',k,'avg frac optimal',(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2),'min',Math.min(...a).toFixed(2));}
 console.log('mirror reply optimal',mirrorOk,'/',mirrorTot); N.close();})();
