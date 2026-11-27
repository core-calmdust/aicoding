// (2026-11-27 担当D) The strategy lesson s_count (read the race) under claude/lesson-quality.md, rebuilt for the 3D table.
// Each side's count = the fewest moves to fill its corner with the other side frozen (tools/lesson-verify-ugolki-ls.js deepDist;
// Black's on the board turned 180° with the colours swapped). By count White wins iff Black's count > White's (equal: Black's last
// move draws). A problem: 1–3 winning moves, each moving a white piece Black hops over now (Black's springboard) so Black gets
// slower; a wrong move as fast for White (the lure: only Black's count tells); the exact two-player solver (engine duelGood) wins
// with exactly the count's set.
// 2026-11-25 06:02: self-play endgames gave 0 candidates (a White move there never changes Black's count). 2026-11-27: random
// endgames did not either (the races rarely touch); the ladder template below does: a white straggler next to a black piece
// that can hop over it, the other pieces near their corners (about 1 candidate a minute on 2 cores; the process grows, so run it
// in short pieces).
// Usage: node ugolki/tools/scan_s_count.js gen <seed> <seconds> <out.txt>   (env WN, BN: how far the other pieces stand, MAXW)
//        node ugolki/tools/scan_s_count.js apply <warm-up board> <board> ×5  → ugolki/lessons.json s_count (problems + warm-up,
//        the warm-up words from ugolki/tools/ramp_s_count.json)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const E = require('../engine.js'); E.setRule('c33');
const V = require(path.join(ROOT, 'tools/lesson-verify-ugolki-ls.js'));
const real = p => p.moves().filter(m => m !== E.PASS);
const swapPos = q => E.Pos.from({ b: V.symB(q.spec().b, V.SYM[2][0], true), side: 1, n: q.ply });
const [cmd, ...A] = process.argv.slice(2);
if (cmd === 'gen') {
const T1=E.target(1),T2=E.target(2),H=E.HOME(),D=E.DIST();
let seed=+A[0];const rand=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648};const ri=n=>Math.floor(rand()*n);
const out=fs.openSync(A[2],'a'),T0=Date.now(),secs=+A[1];const st={};const inc=k=>st[k]=(st[k]||0)+1;
const mid=[];for(let i=0;i<64;i++)if(!T1[i]&&!T2[i]&&!H[1][i]&&!H[2][i])mid.push(i);
const sh=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=ri(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
const A1=[],A2=[];for(let i=0;i<64;i++){if(T1[i])A1.push(i);if(T2[i])A2.push(i)}
const MAXW=+(process.env.MAXW||7);
while(Date.now()-T0<secs*1000){
 const b=Array(64).fill('.');const h1=2+ri(4),h2=1+ri(5);
 sh(A1).slice(0,9-h1).forEach(i=>b[i]='w');sh(A2).slice(0,9-h2).forEach(i=>b[i]='b');
 const em=()=>mid.filter(i=>b[i]==='.');
 const S=sh(em().filter(i=>D[1][i]>=4&&D[1][i]<=7))[0];b[S]='w';
 let bad=false;
 for(let i=1;i<h1;i++){const x=sh(em().filter(i=>D[1][i]<=+(process.env.WN||3)))[0];if(x==null){bad=true;break}b[x]='w'}
 // a black piece next to S (so it can hop over it), the rest near its target
 const r=S>>3,c=S&7;const nb=[[r-1,c],[r,c+1],[r+1,c],[r,c-1]].filter(([y,x])=>y>=0&&y<8&&x>=0&&x<8).map(([y,x])=>y*8+x).filter(i=>b[i]==='.'&&!T1[i]&&!T2[i]&&!H[1][i]);
 if(!nb.length||bad){inc('bad');continue}
 b[sh(nb)[0]]='b';
 for(let i=1;i<h2;i++){const x=sh(em().filter(i=>D[2][i]<=+(process.env.BN||4)))[0];if(x==null){bad=true;break}b[x]='b'}
 if(bad){inc('bad');continue}
 const sp={b:b.join(''),side:1,n:100};const p=E.Pos.from(sp);inc('gen');
 if(E.judge(p).over){inc('over');continue}
 const L=real(p);if(L.length<12){inc('legal');continue}
 const bs0=V.deepDist(swapPos(p),MAXW+1);if(bs0>MAXW){inc('bfar');continue}
 const b2=b.slice();b2[S]='.';const bsN=V.deepDist(swapPos(E.Pos.from({b:b2.join(''),side:1,n:100})),bs0+1);
 if(!(bsN>bs0)){inc('noLadder');continue}
 const ws0=V.deepDist(p,MAXW+1);if(ws0>MAXW||!(ws0===bs0||ws0===bs0+1)){inc('wfar');continue}
 const sw=L.filter(m=>E.mFrom(m)===S).some(m=>{const q=p.clone().play(m);const w=1+V.deepDist(q,MAXW+1);return w<=ws0&&V.deepDist(swapPos(q),w+1)>w});
 if(!sw){inc('noS');continue}
 const F=L.map(m=>{const q=p.clone().play(m);return{m,n:E.name(p,m),ws:1+V.deepDist(q,MAXW+2),bs:V.deepDist(swapPos(q),MAXW+2)}});
 if(F.some(x=>x.bs===Infinity)){inc('inf');continue}
 const ok=F.filter(x=>x.bs>x.ws);
 if(!ok.length){inc('ok0');continue} if(ok.length>3||ok.length*3>L.length){inc('okMany');continue}
 const Wn=Math.min(...ok.map(x=>x.ws));const trap=F.filter(x=>!(x.bs>x.ws)&&x.ws<=Wn);
 if(!trap.length){inc('noTrap');continue}
 const G=E.duelGood(sp,[],Math.max(...ok.map(x=>x.ws))+1,'c33',+(process.env.BUD||3e7));
 const tag=!G?'budget':(G.length===ok.length&&ok.every(x=>G.includes(x.m)))?'CAND':'exact';inc(tag);
 fs.writeSync(out,JSON.stringify({tag,G:G&&G.map(m=>E.name(p,m)),s:sp,ok:ok.map(x=>x.n),trap:trap.map(x=>x.n),F:F.map(x=>[x.n,x.ws,x.bs])})+'\n');
}
console.error(JSON.stringify(st));
} else if (cmd === 'apply') {
const [rb, ...bs] = A;
const LSP=ROOT+'/ugolki/lessons.json';const txt=fs.readFileSync(LSP,'utf8');const LS=JSON.parse(txt);
const st=LS.steps.find(s=>s.id==='s_count');
const mk=b=>{const sp={b,side:1,n:100},p=E.Pos.from(sp),c=V.classify('s_count',p);if(!c.pass)throw new Error(b+' '+c.why);
 const F=real(p).map(m=>[m,V.factOf('s_count',p,m)]);
 // best: a step answer first if any (the plainer move), else the first
 const best=c.ok.slice().sort((a,b)=>V.factOf('s_count',p,a).ws-V.factOf('s_count',p,b).ws||(E.isJump(p,a)?1:0)-(E.isJump(p,b)?1:0))[0];
 return {s:sp,ok:c.ok,best,b0:F[0][1].bs0,cn:F.map(([m,f])=>[m,f.ws,f.bs]),_d:c.d}};
const P=bs.map(mk).sort((a,b)=>a._d-b._d);P.forEach(x=>delete x._d);
st.problems=P;
const R=JSON.parse(fs.readFileSync(path.join(__dirname,'ramp_s_count.json'),'utf8'));
const rsp={b:rb,side:1,n:100},rp=E.Pos.from(rsp),rc=V.classify('s_count',rp);
const ans=rc.ok[0],fa=V.factOf('s_count',rp,ans),S=E.mFrom(ans);
const v={S:E.sqName(S),B0:fa.bs0,W:fa.ws,A:E.name(rp,ans),B:fa.bs};
const body={};for(const l in R.body)body[l]=R.body[l].replace(/\{(\w+)\}/g,(_,k)=>v[k]);
st.ramp=[{k:'explain',s:rsp,seq:[E.name(rp,ans)],marks:[[S+1,'ng'],[E.mTo(ans)+1,'ok']],t:R.t,body}];
// keep the file's one-line layout
fs.writeFileSync(LSP,JSON.stringify(LS)+(txt.endsWith('\n')?'\n':''));
console.log('written',P.map(x=>E.name(E.Pos.from(x.s),x.best)).join(' '),'ramp',v);
}
