// (2026-11-24 第2期) candidates for the strategy lessons (s_trap・s_escape・s_wall・s_fill): random positions whose answers are
// the rules' goal (tools/lesson-verify.js amazons — amStrat) and that pass every check of a single problem. Usage:
//   node amazons/tools/gen_strat2.js <step> <count> <seed> <out.json>   → [{P, d, G, all}]; then pick 5 with d going up (⑥) and
// no two within 6 squares, and put them in lessons.json (s_trap: problems 4・5 with two exits). Run lesson-verify.js amazons after.
const ROOT=require('path').join(__dirname,'..','..');const E=require(ROOT+'/amazons/engine.js');const {mFrom,mTo,mArrow,NB}=E;
const V=require(ROOT+'/tools/lesson-verify.js');
const fs=require('fs');const L0=JSON.parse(fs.readFileSync(ROOT+'/amazons/lessons.json','utf8'));
const id=process.argv[2], N=+process.argv[3]||200, seed0=+process.argv[4]||1;
let seed=seed0>>>0;const rnd=()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};const ri=n=>Math.floor(rnd()*n);
const nbr=i=>{const r=(i/10)|0,c=i%10,o=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if((dr||dc)&&rr>=0&&rr<10&&cc>=0&&cc<10)o.push(rr*10+cc);}return o;};
const empties=b=>[...b].map((c,i)=>c==='.'?i:-1).filter(i=>i>=0);
function put(b,i,ch){return b.slice(0,i)+ch+b.slice(i+1);}
function cand(){
 let b='.'.repeat(100),T=null;
 if(id==='s_trap'||id==='s_escape'){const dens=0.06+rnd()*0.12;for(let i=0;i<100;i++)if(rnd()<dens)b=put(b,i,'x');
  T=ri(100);b=put(b,T,id==='s_trap'?'b':'w');const nb=nbr(T);const k=id==='s_trap'?(rnd()<0.5?1:2):2;
  const sh=nb.slice().sort(()=>rnd()-0.5);sh.forEach((x,i)=>{b=put(b,x,i<k?'.':'x');});
  // maybe an own amazon of the other colour next to T
  const W=id==='s_trap'?'w':'b',O=id==='s_trap'?'b':'w';
  if(id==='s_trap'&&rnd()<0.5){const occ=sh.slice(k);const x=occ[ri(occ.length)];if(x!=null)b=put(b,x,'w');}
  const nW=2-(b.match(/w/g)||[]).length+(id==='s_escape'?1:0);const nB=(id==='s_trap'?2+ri(2):2+ri(2))-(b.match(/b/g)||[]).length;
  for(let i=0;i<nW;i++){const e=empties(b);b=put(b,e[ri(e.length)],'w');}
  for(let i=0;i<nB;i++){const e=empties(b);b=put(b,e[ri(e.length)],'b');}
 }
 if(id==='s_wall'){const vert=rnd()<0.5,c=2+ri(6),gap=ri(10);for(let r=0;r<10;r++){if(r===gap)continue;b=put(b,vert?r*10+c:c*10+r,'x');}
  T=vert?gap*10+c:c*10+gap;const dens=0.03+rnd()*0.06;for(let i=0;i<100;i++)if(b[i]==='.'&&rnd()<dens&&!nbr(T).includes(i))b=put(b,i,'x');
  const side=i=>{const r=(i/10)|0,cc=i%10,v=vert?cc:r;return v<c?0:v>c?1:-1;};const big=c>=5?0:1;
  const E1=()=>empties(b).filter(i=>side(i)===big),E2=()=>empties(b).filter(i=>side(i)===1-big);
  for(let i=0;i<2;i++){let e=E1();if(i===0&&rnd()<0.8){const ln=e.filter(x=>{const[r1,c1]=[(x/10)|0,x%10],[r2,c2]=[(T/10)|0,T%10];return r1===r2||c1===c2||Math.abs(r1-r2)===Math.abs(c1-c2);});if(ln.length)e=ln;}b=put(b,e[ri(e.length)],'w');}
  for(let i=0;i<2;i++){const e=E2();b=put(b,e[ri(e.length)],'b');}
 }
 if(id==='s_fill'){b='x'.repeat(100);const grow=(start,n,avoid)=>{const S=[start];while(S.length<n){const f=S[ri(S.length)],nb=nbr(f).filter(x=>!S.includes(x)&&!avoid.has(x));if(!nb.length){if(rnd()<0.01)return null;continue;}S.push(nb[ri(nb.length)]);}return S;};
  const w0=ri(100),nw=7+ri(5);const S=grow(w0,nw,new Set());if(!S)return null;const av=new Set();S.forEach(x=>{av.add(x);nbr(x).forEach(y=>av.add(y));});
  const fr=[...Array(100).keys()].filter(x=>!av.has(x));if(!fr.length)return null;const B=grow(fr[ri(fr.length)],5+ri(10),av);if(!B)return null;
  S.forEach(x=>b=put(b,x,'.'));B.forEach(x=>b=put(b,x,'.'));b=put(b,S[ri(S.length)],'w');b=put(b,B[ri(B.length)],'b');}
 return {b,T};
}
function goalSet(P){const p=E.Pos.from(P.s);const all=p.moves();const T=P.mk[0];let kk=-1;for(let k=0;k<8;k++)if(p.q[k]===T)kk=k;
 const after=m=>p.clone().play(m);
 if(id==='s_trap'){if(!p.canMove(2))return null;return {all,G:all.filter(m=>{const q=after(m);return E.freeAt(q,kk)===0;})};}
 if(id==='s_escape'){const box=q=>q.moves().some(r=>{q.play(r);const v=E.boxed(q,kk);q.unplay(r);return v;});
  const flip=E.Pos.from(Object.assign({},P.s,{side:2}));if(!flip.canMove(2)||!box(flip))return null;
  return {all,G:all.filter(m=>mFrom(m)===T&&E.freeAt(after(m),kk)>=4&&!box(after(m)))};}
 return null;}
const out=[];let tries=0;
while(out.length<N&&tries<200000){tries++;const c=cand();if(!c)continue;
 const P={s:{b:c.b,side:1,n:0},ok:[],best:0,mk:c.T!=null?[c.T]:[]};
 const p=E.Pos.from(P.s);if(!p.canMove(1))continue;
 let G,all;
 if(id==='s_trap'||id==='s_escape'){const r=goalSet(P);if(!r)continue;({G,all}=r);if(!G.length||G.length>all.length*0.3)continue;
   if(id==='s_escape'){const mv=all.filter(m=>mFrom(m)===c.T);if(G.length*2>mv.length||mv.length-G.length<3)continue;}}
 else if(id==='s_wall'){all=p.moves();const rooms=q=>{const sq=q.sq,seen=new Int8Array(100).fill(-1);let w=0,bb=0,sep=true,n=0;for(let s0=0;s0<100;s0++){if(sq[s0]===3||seen[s0]>=0)continue;const Q=[s0];seen[s0]=n;for(let h=0;h<Q.length;h++)for(const t of NB[Q[h]])if(seen[t]<0&&sq[t]!==3){seen[t]=n;Q.push(t);}n++;const nw=Q.filter(x=>sq[x]===1).length,nb=Q.filter(x=>sq[x]===2).length,ne=Q.filter(x=>!sq[x]).length;if(nw&&nb)sep=false;else if(nw)w+=ne;else if(nb)bb+=ne;}return sep?w-bb:-999;};
   if(rooms(p)>-999)continue;const sc=all.map(m=>rooms(p.clone().play(m)));const mx=Math.max(...sc);if(mx<=0)continue;G=all.filter((m,i)=>sc[i]===mx);
   const at=all.filter(m=>mArrow(m)===c.T);if(!G.every(m=>mArrow(m)===c.T))continue;if(at.length-G.length<3||G.length>at.length*0.75)continue;}
 else if(id==='s_fill'){all=p.moves();if(all.length<6||all.length>40)continue;const f=p.q.find((x,k)=>x>=0&&p.sq[x]===1);
   const sc=all.map(m=>E.fillMax(p.clone().play(m),mTo(m)));if(sc.some(v=>v<0))continue;const mx=Math.max(...sc);G=all.filter((m,i)=>sc[i]===mx);if(G.length>all.length*0.3||new Set(sc).size<3)continue;}
 P.ok=G;P.best=G[0];
 const L2=JSON.parse(JSON.stringify(L0));const st=L2.steps.find(s=>s.id===id);st.problems=[P];
 const f=V.amazons({lessons:L2,only:new Set([id])}).filter(x=>!/^⑥/.test(x.msg));
 if(f.length){if(process.env.DBG)console.error(f.slice(0,3).map(x=>x.msg).join(' | '));continue;}
 const dd=(()=>{const r=V.amazons({lessons:L2,only:new Set([id])}).find(x=>/d \d+ vs/.test(x.msg));return r?+r.msg.match(/d (\d+) vs/)[1]:null;})();
 out.push({P,d:dd,G:G.length,all:all.length});process.stderr.write('.');}
console.error('\ntries',tries);fs.writeFileSync(process.argv[5]||`c_${id}_${seed0}.json`,JSON.stringify(out));
console.log(out.map(o=>`d=${o.d} G=${o.G}/${o.all}`).join('\n'));
