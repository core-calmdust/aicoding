const fs = require('fs'), BG = require(__dirname + '/bgw.js'), { decodePid } = require(__dirname + '/pid.js');
const man = JSON.parse(fs.readFileSync(__dirname + '/../nets/wildbg.json')), bin = fs.readFileSync(__dirname + '/../nets/wildbg.bin');
BG.loadWildbg(man, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length));
const out = [];
for (const [f, race] of [['../ext/wildbg-training/data/0021/contact.csv', 0], ['../ext/wildbg-training/data/0022/race.csv', 1]]) {
  const lines = fs.readFileSync(__dirname + '/' + f, 'utf8').split('\n').slice(1, 301).filter(Boolean);
  let se = 0;
  for (const ln of lines) {
    const [id, ...v] = ln.split(','); const t = v.map(Number); const p = decodePid(id);
    const y = BG.evalPos(p, 0); const d = BG.equity(y) - BG.equity(t); se += d * d;
    const x = new Float32Array(race ? 186 : 202); BG.wbInputs(p, 0, !!race, x);
    out.push({ race, x: Array.from(x), y });
  }
  console.log(f, 'RMSE vs rollout', Math.sqrt(se / lines.length).toFixed(4));
}
fs.writeFileSync(__dirname + '/verify.json', JSON.stringify(out));
