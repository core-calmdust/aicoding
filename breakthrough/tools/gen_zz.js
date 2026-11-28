// node tools/gen_zz.js [tries=20000] [seed] [out.json] — real zugzwang wins for the s_tempo lesson / the tempo theme (claude/breakthrough-spec.md)
// Endgames with 2–4 head-on pairs (a White piece right below a Black one) and 0–2 more pieces a side behind them. Kept: the side
// to move wins within k ≤ 7 with exactly one first move, a quiet one, and after it — if the opponent could pass — there is no
// forced win within k (the win comes only from the opponent having to move). Rows of the output: { sp, k, ans, legal }.
const E=require('../engine.js');E.setRule('s8');
let seed=+process.argv[3]||5;const rnd=()=>{seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};
const N=+process.argv[2]||20000;const out=[];let st={n:0,win:0,uniq:0,quiet:0,zz:0};
for(let it=0;it<N;it++){const b=Array(64).fill('.');
 const pairs=2+Math.floor(rnd()*3);let ok=true;
 for(let p=0;p<pairs;p++){let g=0;for(;g<50;g++){const r=2+Math.floor(rnd()*5),c=Math.floor(rnd()*8);if(b[r*8+c]==='.'&&b[(r-1)*8+c]==='.'){b[r*8+c]='w';b[(r-1)*8+c]='b';break;}}if(g===50)ok=false;}
 const ew=Math.floor(rnd()*3),eb=Math.floor(rnd()*3);
 const put=(ch,lo,hi)=>{for(let g=0;g<50;g++){const r=lo+Math.floor(rnd()*(hi-lo+1)),c=Math.floor(rnd()*8);if(b[r*8+c]==='.'){b[r*8+c]=ch;return;}}};
 for(let i=0;i<ew;i++)put('w',4,7);for(let i=0;i<eb;i++)put('b',0,3);
 if(!ok)continue;const sp={b:b.join(''),side:rnd()<.5?1:2};const pos=E.Pos.from(sp);
 if(E.judge(pos).over)continue;const legal=pos.moves();if(legal.length<4)continue;const me=pos.turn,op=3-me;
 if(pos.lead(me)<=1||pos.lead(op)<=1)continue;st.n++;
 const k=E.duelMin(sp,[],7);if(k<2)continue;st.win++;
 const good=E.duelGood(sp,[],k);if(good.length!==1)continue;st.uniq++;const m=good[0];
 if(E.isCap(pos,m))continue;st.quiet++;
 const q=pos.clone().play(m);const flip={b:q.spec().b,side:me};const fp=E.Pos.from(flip);if(E.judge(fp).over)continue;
 if(E.duelMin(flip,[],k))continue;
 // and: without moving, could I pass? i.e. in the original position with the opponent to move, does the opponent survive? (mutual zugzwang flavour)
 st.zz++;out.push({sp,k,ans:m,legal:legal.length});if(out.length%5===0)require("fs").writeFileSync(process.argv[4],JSON.stringify(out));}
console.log(JSON.stringify(st));require('fs').writeFileSync(process.argv[4]||'/tmp/bt-zz2.json',JSON.stringify(out));
