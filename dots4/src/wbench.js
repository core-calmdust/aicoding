const fs=require('fs');
const bytes=fs.readFileSync(__dirname+'/dots.wasm');
const m=new WebAssembly.Module(bytes); const inst=new WebAssembly.Instance(m,{env:{now:()=>performance.now()}}); const x=inst.exports;
x.w_setup(4,4,+process.argv[2]||22);
const io=new Int32Array(x.memory.buffer,x.io_ptr(),256);
for (const hex of process.argv.slice(3)){ const v=BigInt('0x'+hex); io[0]=Number(v&0xffffffffn); io[1]=Number(v>>32n); x.w_clear(); const t0=performance.now(); const r=x.w_value(-100,100,0); console.log(hex,r,(performance.now()-t0).toFixed(0)+'ms',x.w_nodes()); }
