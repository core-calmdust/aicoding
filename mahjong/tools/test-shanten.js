const MJ=require('../engine.js');let bad=0;
let seed=7;const r=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
for(let n=0;n<20000;n++){const w=[];for(let i=0;i<136;i++)w.push(i);for(let i=135;i>0;i--){const j=(r()*(i+1))|0;[w[i],w[j]]=[w[j],w[i]];}
 const melds=(r()*3)|0; const k=[14,13][n%2]-3*melds; const c=MJ.countsIds(w.slice(0,k));
 const a=MJ.shantenNormal(c,melds),b=MJ.shantenNormalSlow(c,melds); if(a!==b){bad++; if(bad<5)console.log(c.join(''),melds,a,b);} }
console.log('mismatch',bad);
bad=0;
for(let n=0;n<20000;n++){const c=new Array(34).fill(0);const melds=(r()*3)|0;
 for(let g=0;g<4-melds;g++){ if(r()<0.5){const t=(r()*34)|0; if(c[t]<=1)c[t]+=3;} else {const s=(r()*3)|0,k=(r()*7)|0,t=s*9+k; if(c[t]<4&&c[t+1]<4&&c[t+2]<4){c[t]++;c[t+1]++;c[t+2]++;}}}
 const p=(r()*34)|0; if(c[p]<=2)c[p]+=2;
 for(let x=0;x<3;x++){const t=(r()*34)|0; if(r()<0.5&&c[t]>0)c[t]--; else if(c[t]<4)c[t]++;}
 const a=MJ.shantenNormal(c,melds),b=MJ.shantenNormalSlow(c,melds); if(a!==b){bad++; if(bad<5)console.log(c.join(''),melds,a,b);} }
console.log('near mismatch',bad);
