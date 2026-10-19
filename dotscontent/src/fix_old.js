// re-solve the 45 old puzzles with the native solver; keep those whose first move is still a unique best
const L=require('./lib.js'),fs=require('fs');
const old=JSON.parse(fs.readFileSync(L.CK+'/old_puzzles.json','utf8'));
(async()=>{const N={3:new L.Native(3),4:new L.Native(4),5:new L.Native(5)};let changed=0,dropped=0;
for(const lv of old.levels) for(const pz of lv.puzzles){ const s=await N[pz.n].solve(pz.edges); const m=new Map(pz.values); const same=s.vals.every(([e,v])=>m.get(e)===v);
 if(!same) changed++; pz.values=s.vals; const best=L.bestSet(s.vals); pz.keep = best.length===1 || ['order','loop'].includes(pz.tag); if(!pz.keep) dropped++; }
for(const k in N) N[k].close();
L.atomicWrite(L.CK+'/old_fixed.json',JSON.stringify(old)); console.log('changed',changed,'dropped',dropped);})();
