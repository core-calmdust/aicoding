// ur/tools/embed_nets.js — ur/tools/net-<rule>.json を engine.js の NETS ブロックに埋め込む
'use strict';
const fs = require('fs'), path = require('path');
const ef = path.join(__dirname, '..', 'engine.js');
let src = fs.readFileSync(ef, 'utf8');
const nets = {};
for (const r of ['finkel', 'blitz', 'masters']) {
  const f = path.join(__dirname, 'net-' + r + '.json');
  if (fs.existsSync(f)) nets[r] = JSON.parse(fs.readFileSync(f, 'utf8'));
}
let body = '  const NETS = {\n';
for (const [r, n] of Object.entries(nets)) body += `    ${r}: { shape: ${JSON.stringify(n.shape)}, scale: ${n.scale}, w: '${n.w}' },\n`;
body += '  };\n';
src = src.replace(/\/\*NETS-BEGIN\*\/[\s\S]*?\/\*NETS-END\*\//, '/*NETS-BEGIN*/\n' + body + '  /*NETS-END*/');
fs.writeFileSync(ef, src);
console.log('embedded', Object.keys(nets), (src.length / 1024).toFixed(0) + 'KB');
