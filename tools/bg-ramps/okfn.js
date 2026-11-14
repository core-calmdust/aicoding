const BG=require('../../backgammon/bg.js');
const L=s=>{const m=[];for(let i=0;i+1<s.length;i+=2)m.push([s.charCodeAt(i)-65,s.charCodeAt(i+1)-65]);return m;};
function ok(spec,p0,pl){ const q=pl.pos, mv=pl.moves; return spec.split('&').every(c=>{const [k,a]=c.split(':');
  if(k==='any')return true; if(k==='hit')return mv.some(x=>BG.mvHit(x)); if(k==='enter')return q[25]<p0[25];
  if(k==='make')return q[+a]>=2&&p0[+a]<2; if(k==='off')return q[0]-p0[0]>=+a; if(k==='has')return q[+a]>=1; if(k==='keep')return q[+a]>=2;
  if(k==='slot')return q[+a]===1&&p0[+a]===0; if(k==='race')return !BG.contact(q); if(k==='allhome'){for(let i=7;i<=25;i++)if(q[i])return false;return true;}
  if(k==='safe'){for(let i=1;i<=24;i++)if(q[i]===1)return false;return true;}
  if(k==='plays'){const K=BG.key(q);return a.split(',').some(s=>{const r=p0.slice();for(const[f,t]of L(s))BG.apply(r,0,f,t);return BG.key(r)===K;});}
  throw k;});}

module.exports=ok;
