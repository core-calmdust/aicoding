const fs=require('fs'),vm=require('vm');
const dir='/home/claude/wt-uttt/uttt/';
let en; { const s=fs.readFileSync(dir+'i18n-ut.js','utf8'); const ctx={window:{},I18N:{ja:{},en:{}}}; ctx.window.I18N=ctx.I18N; vm.runInNewContext(s,ctx); en=ctx.I18N.en; }
const all={};
for(const f of ['zh','ko','fr','de','tr','hi']){ Object.assign(all, vm.runInNewContext(fs.readFileSync(dir+'tools/i18n/'+f+'.js','utf8'))); }
const langs=['zh','zh-TW','ko','es','fr','pt','de','ru','tr','id','hi','ar'];
let bad=0;
for(const l of langs){ const o=all[l]; if(!o){console.log('MISSING',l);bad++;continue;}
  const miss=Object.keys(en).filter(k=>!(k in o)); const extra=Object.keys(o).filter(k=>!(k in en));
  // placeholder check
  const ph=[];for(const k in o){ if(typeof o[k]!=='string'||typeof en[k]!=='string')continue; const a=(en[k].match(/\{\w+\}/g)||[]).sort().join(),b=(o[k].match(/\{\w+\}/g)||[]).sort().join(); if([...new Set(a.split(','))].join()!==[...new Set(b.split(','))].join()) ph.push(k);}
  console.log(l,Object.keys(o).length,'miss',miss.join(' '),'extra',extra.join(' '),'ph',ph.join(' ')); bad+=miss.length+ph.length;}
const out='// Ultimate Tic-Tac-Toe: the 12 other languages (same keys as i18n-ut.js). Built from uttt/tools/i18n/*.js.\n(function (A) { for (const l in A) I18N[l] = Object.assign(I18N[l] || {}, A[l]); })('+JSON.stringify(Object.fromEntries(langs.map(l=>[l,all[l]])),null,0).replace(/\},"/g,'},\n"')+');\n';
fs.writeFileSync(dir+'i18n-ut-more.js',out); console.log('bad',bad,out.length);
