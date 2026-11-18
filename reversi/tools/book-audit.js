// Audit of the opening book with another program as the judge (Egaroucid for Console: its own large book where it has the
// position, else its search). The judge is only run here, on the developer's machine; nothing of it goes into the site.
// Guide: BOOK.md「定石の採点（book-audit.js）」.
//   EGAROUCID_DIR=~/Egaroucid/bin node tools/book-audit.js [book.bin] [level 16] [--games 3000] [--margin 0.8] [--threads 2]
// Plays `games` games inside the book as the AI does (a random move within `margin` discs of the best, both sides), has the
// judge value every listed move of every position on the way and the positions where the book ends, and prints: the mean
// loss of a pick by side and ply, the loss per game by side, and the judge's value for black where the book ends.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const RV=path.join(__dirname,'..'), E=require(path.join(RV,'engine.js'));
const ARGS=process.argv.slice(2), POSA=ARGS.filter((a,i)=>!a.startsWith('--')&&!(i>0&&ARGS[i-1].startsWith('--')));
const opt=(k,d)=>{ const i=ARGS.indexOf('--'+k); return i>=0?+ARGS[i+1]:d; };
const GAMES=opt('games',3000), MARGIN=opt('margin',0.8), THREADS=opt('threads',2);
const EGA=process.env.EGAROUCID_DIR; if(!EGA){ console.error('set EGAROUCID_DIR to the folder of Egaroucid_for_Console (with its resources/)'); process.exit(1); }
const EXE=fs.existsSync(path.join(EGA,'Egaroucid_for_Console.out'))?'./Egaroucid_for_Console.out':'./Egaroucid_for_Console.exe';
E.setBook(new Uint8Array(fs.readFileSync(path.resolve(POSA[0]||path.join(RV,'book.bin')))));
let s0=12345; const rnd=()=>{ s0^=s0<<13; s0>>>=0; s0^=s0>>17; s0^=s0<<5; s0>>>=0; return s0/4294967296; };
const str=p=>{ let s=''; for(let q=0;q<64;q++){ const lo=q<32, b=1<<(q&31); s+=((lo?p[0]:p[1])&b)?'X':((lo?p[2]:p[3])&b)?'O':'-'; } return s+' X'; };
const nodes=new Map(), exits=new Map(), games=[];
for(let g=0;g<GAMES;g++){ let p=[0x10000000,0x8,0x08000000,0x10], ply=0; const line=[];
  for(;;){ const bk=E.bookLookup(p[0],p[1],p[2],p[3]); const legal=E.legalList(p[0],p[1],p[2],p[3]);
    if(!bk||!bk.length||!legal.length){ exits.set(str(p),ply); line.exit=str(p); line.exitPly=ply; break; }
    const top=bk[0].score, c=bk.filter(x=>x.score>=top-MARGIN&&legal.includes(x.move)); const k=str(p);
    if(!nodes.has(k)) nodes.set(k,{ply,p:p.slice(),list:bk.filter(x=>legal.includes(x.move)),cand:c.map(x=>x.move)});
    const pick=c[Math.floor(rnd()*c.length)]; line.push([k,pick.move]); const ch=E.childOf(p[0],p[1],p[2],p[3],pick.move); p=[ch[0],ch[1],ch[2],ch[3]]; ply++; }
  games.push(line); }
console.error('book nodes visited',nodes.size,'exits',exits.size);
// judge every listed child of every visited node + exits
const q=new Map(); const add=s=>{ if(!q.has(s)) q.set(s,null); };
for(const [k,n] of nodes) for(const x of n.list){ const ch=E.childOf(n.p[0],n.p[1],n.p[2],n.p[3],x.move); x.cs=str([ch[0],ch[1],ch[2],ch[3]]); add(x.cs); }
for(const k of exits.keys()) add(k);
const TMP=path.join(require('os').tmpdir(),'rv-book-audit-'+process.pid+'.txt');
const keys=[...q.keys()]; fs.writeFileSync(TMP,keys.join('\n')+'\n');
console.error('positions to judge',keys.length);
const out=cp.execFileSync(EXE,['-solve',TMP,'-l',String(POSA[1]||16),'-t',String(THREADS)],{cwd:EGA,maxBuffer:1<<28}).toString(); fs.unlinkSync(TMP);
const rows=out.split('\n').filter(l=>l.startsWith('|')&&!l.includes('Level')).map(l=>l.split('|').map(c=>c.trim()));
if(rows.length!==keys.length) throw new Error('rows '+rows.length+' keys '+keys.length);
let nb=0; const src=new Map(); rows.forEach((r,i)=>{ q.set(keys[i],+r[4]); src.set(keys[i],r[1]==='Book'); if(r[1]==='Book') nb++; });
console.log('judged',keys.length,'by Egaroucid book:',nb,'by search:',keys.length-nb);
// per node: loss of each candidate against the best listed move (judge)
const B={}; for(const [k,n] of nodes){ if(n.list.length<1) continue; const jv=m=>-q.get(n.list.find(x=>x.move===m).cs); const best=Math.max(...n.list.map(x=>jv(x.move)));
  const side=n.ply%2?'white':'black', bk=n.ply<10?'ply 0-9':n.ply<18?'ply 10-17':'ply 18+'; const key=side+' '+bk; const b=B[key]||(B[key]={n:0,loss:0,worst:0,big:0});
  const ls=n.cand.map(m=>best-jv(m)); b.n++; b.loss+=ls.reduce((a,c)=>a+c,0)/ls.length; b.worst+=Math.max(...ls); b.big+=Math.max(...ls)>=3; n.loss=new Map(n.cand.map((m,i)=>[m,ls[i]])); }
console.log('side/ply        nodes  mean loss of a pick   mean worst pick   nodes with a pick losing >=3');
for(const k of Object.keys(B).sort()){ const b=B[k]; console.log(k.padEnd(16),String(b.n).padStart(5),(b.loss/b.n).toFixed(2).padStart(12),(b.worst/b.n).toFixed(2).padStart(18),(100*b.big/b.n).toFixed(1).padStart(14)+'%'); }
// per game: total loss by side, exit value for black
let lb=0,lw=0,ev=0,ep=0; for(const g of games){ g.forEach(([k,m],i)=>{ const l=nodes.get(k).loss.get(m)||0; if(i%2) lw+=l; else lb+=l; }); const v=q.get(g.exit); ev+=g.exitPly%2?-v:v; ep+=g.exitPly; }
console.log(`per game (${games.length} book games): black loses ${(lb/games.length).toFixed(2)} discs in the book, white ${(lw/games.length).toFixed(2)}; exit at ply ${(ep/games.length).toFixed(1)}, judge value at the exit for black ${(ev/games.length).toFixed(2)}`);
