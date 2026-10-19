// analyse opening lines: critical moments, end of the safe phase, chain structure, controller
const L=require('./lib.js'),{E}=L;
const letters='abcdef';
function nm(G,e){const [r1,c1,r2,c2]=G.ed[e];return letters[c1]+(r1+1)+(r1===r2?'–':'|');}
function structure(n,edges){const G=E.geom(n,n),p=E.Pos.from(G,edges);const comps=E.components(p,true);
 return comps.map(c=>({n:c.n,loop:c.loop,simple:c.simple}));}
function analyse(n,line){const G=E.geom(n,n);const p=new E.Pos(G);let turn=0;const out={crit:[],safeEnd:-1};
 for(let i=0;i<line.moves.length;i++){const pl=line.plies[i];
  if(pl && pl.nl>3 && pl.nb/pl.nl<=0.25) out.crit.push({i,nb:pl.nb,nl:pl.nl,m:nm(G,line.moves[i]),turn:pl.turn});
  const safeNow=p.legal().filter(e=>p.gives(e)===0&&p.completes(e)===0).length;
  if(out.safeEnd<0 && safeNow===0 && !p.hasCapture()){out.safeEnd=i; out.struct=structure(n,line.moves.slice(0,i)); out.toMove=turn;}
  const k=p.play(line.moves[i]); if(!k) turn^=1;}
 return out;}
module.exports={analyse,nm,structure};
if(require.main===module){const d=require(L.CK+'/'+process.argv[2]);const n=+process.argv[3]||3;const G=E.geom(n,n);
 d.forEach((l,j)=>{const a=analyse(n,l);console.log(j,l.cls,l.moves.slice(0,a.safeEnd).map(e=>nm(G,e)).join(' '),'| safeEnd',a.safeEnd,'toMove',a.toMove,'struct',JSON.stringify(a.struct),'crit',a.crit.map(c=>c.i+':'+c.m+'('+c.nb+'/'+c.nl+')').join(' '),'final',l.final.join('-'));});}
