const L=require('./lib.js'),{E}=L;const {spawn}=require('child_process');
const c=L.readJsonl('/home/claude/work/ckpt/dotscontent/cand_5.jsonl').filter((x,i)=>i%15===0).slice(0,+process.argv[2]||100);
const p=spawn('./allv5',['5','24']);let buf='',i=0,bad=0,candbad=0;const t0=Date.now();const G=E.geom(5,5);
p.stdout.on('data',d=>{buf+=d;let k;while((k=buf.indexOf('\n'))>=0){const line=buf.slice(0,k);buf=buf.slice(k+1);const vals=line.split(' ').slice(1).map(x=>x.split(':').map(Number));const m=new Map(vals);
 const S=new E.Solver(G,20);S.limit(0,30000);const f=S.all(E.Pos.from(G,c[i].edges)); if(f){const fm=new Map(f.map(x=>[x.m,x.v])); if(!vals.every(([e,v])=>fm.get(e)===v))bad++;}
 if(!c[i].vals.every(([e,v])=>m.get(e)===v))candbad++; i++; if(i===c.length){console.log('5x5 native vs fresh JS bad',bad,'cand(old JS) bad',candbad,'of',i,Date.now()-t0,'ms');p.stdin.end();}}});
for(const x of c){let m=0n;for(const e of x.edges)m|=1n<<BigInt(e);p.stdin.write(m.toString(16)+'\n');}
