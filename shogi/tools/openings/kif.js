// Japanese move notation ("76歩 34歩 22角成 同銀 55角打 67金右") -> USI, validated by the engine
const E = require('../../engine.js');
const START = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
const PT = { '歩': 1, '香': 2, '桂': 3, '銀': 4, '角': 5, '飛': 6, '金': 7, '玉': 8, '王': 8, 'と': 9, '成香': 10, '成桂': 11, '成銀': 12, '馬': 13, '龍': 14, '竜': 14 };
const FW = '１２３４５６７８９', KN = '一二三四五六七八九';
function norm(s) { return s.replace(/[１-９]/g, c => FW.indexOf(c) + 1).replace(/[一二三四五六七八九]/g, c => KN.indexOf(c) + 1).replace(/[▲△☗☖　]/g, ''); }
function conv(line, start) {
  const p = new E.Position(); p.setSfen(start || START);
  const out = []; let last = -1;
  const toks = norm(line).trim().split(/\s+/).filter(Boolean);
  for (const tk0 of toks) {
    let tk = tk0, to;
    if (tk.startsWith('同')) { to = last; tk = tk.slice(1); }
    else { to = E.makeSq(+tk[0], +tk[1]); tk = tk.slice(2); }
    let pt = null, rest = '';
    for (const k of ['成香', '成桂', '成銀']) if (tk.startsWith(k)) { pt = PT[k]; rest = tk.slice(2); }
    if (!pt) { pt = PT[tk[0]]; rest = tk.slice(1); }
    if (!pt) throw new Error('bad piece ' + tk0);
    const us = p.side;
    let c = p.legalMoves(true).filter(m => E.mTo(m) === to && (E.isDrop(m) ? E.dropType(m) === pt : E.typeOf(p.board[E.mFrom(m)]) === pt));
    const has = s => rest.includes(s);
    if (has('打')) c = c.filter(m => E.isDrop(m)); else if (c.some(m => !E.isDrop(m))) c = c.filter(m => !E.isDrop(m));
    if (has('不成')) c = c.filter(m => !E.mPromo(m));
    else if (has('成')) c = c.filter(m => E.mPromo(m));
    else if (c.some(m => !E.mPromo(m))) c = c.filter(m => !E.mPromo(m));
    const fr = m => E.sqRank(E.mFrom(m)), ff = m => E.sqFile(E.mFrom(m)), tr = E.sqRank(to), tf = E.sqFile(to);
    const fwd = m => us === 0 ? tr < fr(m) : tr > fr(m);
    if (has('直')) c = c.filter(m => ff(m) === tf && fwd(m));
    if (has('上')) c = c.filter(fwd);
    if (has('引')) c = c.filter(m => !fwd(m) && fr(m) !== tr);
    if (has('寄')) c = c.filter(m => fr(m) === tr);
    if (has('右') || has('左')) {
      const fs = c.map(ff); const want = (has('右') === (us === 0)) ? Math.min(...fs) : Math.max(...fs);
      c = c.filter(m => ff(m) === want);
    }
    if (c.length !== 1) throw new Error(`move ${out.length + 1} "${tk0}": ${c.length} candidates ${c.map(m => p.toUsi(m)).join(',')}`);
    out.push(p.toUsi(c[0])); p.doMove(c[0]); p.sp = 0; last = to;
  }
  return { usi: out, sfen: p.sfen(), pos: p };
}
function show(sfen) {
  const [bd, side, hd] = sfen.split(' ');
  const J = { p: '歩', l: '香', n: '桂', s: '銀', b: '角', r: '飛', g: '金', k: '玉', '+p': 'と', '+l': '杏', '+n': '圭', '+s': '全', '+b': '馬', '+r': '龍' };
  const rows = bd.split('/').map((row, y) => { let s = '', pro = ''; for (const ch of row) { if (ch === '+') { pro = '+'; continue; } if (/\d/.test(ch)) { s += ' ・'.repeat(+ch); continue; } const lc = ch.toLowerCase(); s += (ch === lc ? 'v' : ' ') + J[pro + lc]; pro = ''; } return s + ' ' + (y + 1); });
  return '  9 8 7 6 5 4 3 2 1\n' + rows.join('\n') + '\nhand: ' + hd + '  side: ' + side;
}
module.exports = { conv, show, START };
if (require.main === module) { const r = conv(process.argv[2], process.argv[3]); console.log(r.usi.join(' ')); console.log(show(r.sfen)); }
