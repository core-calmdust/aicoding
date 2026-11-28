// 言語ファイル（gbmj/i18n/<lang>.js）の検査：キーがそろっているか・{変数} が英語と同じか・図鑑の説明が81件あるか。
// node gbmj/tools/i18n-test.js
const fs = require('fs'), path = require('path');
global.window = global; global.navigator = { languages: ['ja'] }; global.document = { readyState: 'complete' }; global.localStorage = { getItem: () => null };
global.GBFan = { FANS: [] };
require('../i18n.js');
const dir = path.join(__dirname, '..', 'i18n');
let bad = 0;
const vars = s => (String(s).match(/\{\w+\}/g) || []).sort().join();
for (const code of I18N.CODES) {
  if (code === 'ja' || code === 'en') continue;
  const f = path.join(dir, code + '.js');
  if (!fs.existsSync(f)) { console.log(code, 'ファイルなし'); bad++; continue; }
  require(f);
  const S = I18N.S[code], D = I18N.DESC[code] || {};
  const miss = Object.keys(I18N.S.en).filter(k => S[k] == null);
  const extra = Object.keys(S).filter(k => I18N.S.en[k] == null);
  const vb = Object.keys(I18N.S.en).filter(k => S[k] != null && vars(S[k]) !== vars(I18N.S.en[k]));
  const dm = []; for (let i = 1; i <= 81; i++) if (!D[i]) dm.push(i);
  const same = Object.keys(S).filter(k => S[k] === I18N.S.en[k] && S[k].length > 12);
  const ok = !miss.length && !extra.length && !vb.length && !dm.length;
  if (!ok) bad++;
  console.log(code.padEnd(6), ok ? 'OK' : 'NG', miss.length ? 'なし:' + miss.join(',') : '', extra.length ? '余分:' + extra.join(',') : '', vb.length ? '変数:' + vb.join(',') : '', dm.length ? '説明なし:' + dm.join(',') : '', same.length ? '(英語のまま:' + same.join(',') + ')' : '');
}
console.log(bad ? 'NG ' + bad : 'すべてOK');
process.exit(bad ? 1 : 0);
