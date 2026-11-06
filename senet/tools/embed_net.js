// node tools/embed_net.js tools/net-td.json — puts the value net into engine.js (between the NET-DATA markers)
const fs = require('fs'), net = JSON.parse(fs.readFileSync(process.argv[2] || __dirname + '/net-td.json'));
const r = a => a.map(v => +v.toFixed(4));
const data = JSON.stringify({ H: net.H, NI: net.NI, w1: r(net.w1), b1: r(net.b1), w2: r(net.w2), b2: +net.b2.toFixed(4) });
let s = fs.readFileSync(__dirname + '/../engine.js', 'utf8');
const A = '/*NET-DATA*/', Z = '/*END-NET-DATA*/';
if (!s.includes(A)) s = s.replace("  const API = {", `  ${A}setNet(${data});${Z}\n  const API = {`);
else s = s.slice(0, s.indexOf(A)) + A + 'setNet(' + data + ');' + s.slice(s.indexOf(Z));
fs.writeFileSync(__dirname + '/../engine.js', s);
console.log('embedded', data.length, 'chars');
