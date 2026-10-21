import { specFromRows, solveFirst, show, legalSetup } from './lessons-lib.mjs';
// ladder test 9x9
const s = specFromRows([
'.........',
'.........',
'.........',
'.........',
'....X....',
'...XOX...',
'.........',
'.........',
'.........'], 1);
console.log(show(s), legalSetup(s));
let t=Date.now();
console.log(solveFirst(s,'capture',['E4'],{depth:12}), Date.now()-t);
t=Date.now();
console.log(solveFirst(s,'capture',['E4'],{depth:12,libsOnly:true}), Date.now()-t);
