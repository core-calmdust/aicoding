const fs=require('fs'),vm=require('vm');const dir='/home/claude/wt-uttt/uttt/';
const ctx={window:{},CoachKit:null};vm.runInNewContext(fs.readFileSync(dir+'coach.js','utf8'),ctx);const en=ctx.window.UtttCoach.TX.en;
const all=Object.assign({},vm.runInNewContext(fs.readFileSync(dir+'tools/i18n/coach-a.js','utf8')),vm.runInNewContext(fs.readFileSync(dir+'tools/i18n/coach-b.js','utf8')));
let bad=0;for(const l in all){const o=all[l];const miss=Object.keys(en).filter(k=>!(k in o)),extra=Object.keys(o).filter(k=>!(k in en));
const ph=Object.keys(o).filter(k=>typeof o[k]=='string'&&[...new Set(en[k].match(/\{\w+\}/g)||[])].sort().join()!==[...new Set(o[k].match(/\{\w+\}/g)||[])].sort().join());
console.log(l,miss.join(' '),'|',extra.join(' '),'|',ph.join(' '));bad+=miss.length+extra.length+ph.length;}
fs.writeFileSync(dir+'coach-i18n.js','// Ultimate Tic-Tac-Toe coach: the 12 other languages (ja / en live in coach.js). Built from uttt/tools/i18n/coach-*.js.\nUtttCoach.merge('+JSON.stringify(all).replace(/\},"/g,'},\n"')+');\n');console.log('bad',bad);
