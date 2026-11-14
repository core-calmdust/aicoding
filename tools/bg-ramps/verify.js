const BG=require('../../backgammon/bg.js'); const D=require('../../backgammon/ramps.json');
const dec=h=>Uint8Array.from(h,c=>parseInt(c,16));
const L=s=>{const m=[];for(let i=0;i+1<s.length;i+=2)m.push([s.charCodeAt(i)-65,s.charCodeAt(i+1)-65]);return m;};
function ok(spec,p0,pl){ const q=pl.pos, mv=pl.moves; return spec.split('&').every(c=>{const [k,a]=c.split(':');
  if(k==='any')return true; if(k==='hit')return mv.some(x=>BG.mvHit(x)); if(k==='enter')return q[25]<p0[25];
  if(k==='make')return q[+a]>=2&&p0[+a]<2; if(k==='off')return q[0]-p0[0]>=+a; if(k==='has')return q[+a]>=1; if(k==='keep')return q[+a]>=2;
  if(k==='slot')return q[+a]===1&&p0[+a]===0; if(k==='race')return !BG.contact(q); if(k==='allhome'){for(let i=7;i<=25;i++)if(q[i])return false;return true;}
  if(k==='safe'){for(let i=1;i<=24;i++)if(q[i]===1)return false;return true;}
  if(k==='plays'){const K=BG.key(q);return a.split(',').some(s=>{const r=p0.slice();for(const[f,t]of L(s))BG.apply(r,0,f,t);return BG.key(r)===K;});}
  throw k;});}
let bad=0;
for(const st in D.steps) D.steps[st].forEach((it,i)=>{const p=dec(it.pos); const pips=[0,1].map(s=>{let n=0;for(let k=1;k<=25;k++)n+=k*p[s*26+k];return n;});
  if(it.k!=='try'){console.log(st,i,'explain pips',pips.join('/'));return;}
  const P=BG.genPlays(p,0,it.dice[0],it.dice[1]); const g=P.filter(x=>ok(it.ok,p,x)).length;
  let a=''; if(it.ans){const r=p.slice();let legal=true;try{for(const[f,t]of L(it.ans)){if(BG.apply(r,0,f,t)<0)legal=false;}}catch(e){legal=false;} const full=P.find(x=>BG.key(x.pos)===BG.key(r)); a=full?(ok(it.ok,p,full)?'ans✓':'ans✗(fails ok)'):'ans partial';}
  const flag=(g===0||g===P.length&&it.ok!=='any'&&it.ok!=='enter')?'  <<<':''; if(g===0)bad++;
  console.log(st,i,it.ok,'dice',it.dice.join(''),'plays',P.length,'ok',g,a,'pips',pips.join('/'),flag);});
console.log('bad',bad);
