// (2026-11-25 担当A, claude/lesson-quality.md 追88) the 2D 詰めパズル keep the 詰め rule of the 3D table: in every <game>/app.js
// puzzleMove (and blockMove) a move off the solution is not taken back (failBack: moves = moves.slice(0, cur - 1)), the right move
// is not marked 'ok' nor named (pz.best · pz.failWhy · pz.failBlock) and no 「いい手です」 (pz.good) is said on the way.
// DONE: the games fixed and checked (NG); the others are listed as pending (追88 未確認), not failed.
// Hex has its full check (the defender's reply and the board facts of every wrong move): tools/lesson-verify-hexpz.js.
// Usage: node tools/lesson-verify-pz88.js   (lesson-verify.js pz88 calls verify(); verify({ src: { game: text } }) for broken copies)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const DONE = ['hex', 'fanorona', 'janggi'];   // (janggi: 2026-11-27 担当D)
function fnBody(src, name) {
  const i = src.search(new RegExp('\\n(async )?function ' + name + '\\(')); if (i < 0) return '';
  const j = src.indexOf('\n}', i + 1); return j < 0 ? src.slice(i) : src.slice(i, j + 2);
}
function scan(src) {
  const hits = [];
  for (const nm of ['puzzleMove', 'blockMove']) {
    const b = fnBody(src, nm); if (!b) continue;
    if (/failBack|const back\b/.test(b)) hits.push(nm + ': takes the move back (failBack)');
    if (/moves\s*=\s*moves\.slice\(0,\s*cur\s*-\s*1\)/.test(b)) hits.push(nm + ': removes the played move');
    if (/markMove\([^;]*'ok'\)|cls:\s*'ok'/.test(b)) hits.push(nm + ': marks the right move (\'ok\') after a wrong one');
    if (/pz\.good/.test(b)) hits.push(nm + ': says pz.good on the way');
    if (/pz\.best'|'pz\.failWhy'|pz\.failBlock/.test(b)) hits.push(nm + ': names the right move after a wrong one (pz.best · pz.failWhy · pz.failBlock)');
  }
  return hits;
}
// (追91) the 3D table's words after the defender's reply in a 詰め puzzle (atlas/puzzles.js <X>.mid, every language) must not judge
// the move (「いい調子！」「Good!」): it is said after a right move only, so praise tells the player the move was right.
const MID_DONE = ['HXX'];
const PRAISE = /いい調子|いいね|いい手|その調子|ナイス|上手|\b(good|nice|great|well done)\b|¡?bien\b|\bbien !|\bboa\b|\bgut\b|отлично|хорошо|güzel|\bbagus\b|बढ़िया|शाबाश|رائع|أحسنت|不错|不錯|很好|좋아|잘했/i;
function mids(src) {
  const R = {};
  const re = /\n {2}const ([A-Z0-9]+X) = \{([\s\S]*?)\n {2}\};/g; let m;
  while ((m = re.exec(src))) { const L = []; const r2 = /mid: '([^']*)'|mid: "([^"]*)"/g; let k; while ((k = r2.exec(m[2]))) L.push(k[1] != null ? k[1] : k[2]); R[m[1]] = L; }
  return R;
}
function verify(opt = {}) {
  const out = [], pending = {};
  const atl = opt.atlas != null ? opt.atlas : fs.readFileSync(path.join(ROOT, 'atlas/puzzles.js'), 'utf8'), M = mids(atl);
  if (!M.HXX || !M.HXX.length) out.push({ step: 'mid91', q: 'HXX', msg: 'atlas/puzzles.js HXX.mid not found' });
  for (const [X, L] of Object.entries(M)) {
    const bad = L.filter(x => PRAISE.test(x));
    if (!bad.length) continue;
    if (MID_DONE.includes(X)) bad.forEach(x => out.push({ step: 'mid91', q: X, msg: 'the 3D mid line praises the move: ' + x })); else pending['3D ' + X + '.mid'] = bad.length;
  }
  const games = fs.readdirSync(ROOT).filter(d => fs.existsSync(path.join(ROOT, d, 'app.js')));
  for (const g of games) {
    const src = opt.src && opt.src[g] != null ? opt.src[g] : fs.readFileSync(path.join(ROOT, g, 'app.js'), 'utf8');
    if (!/function puzzleMove\(/.test(src)) continue;
    const h = scan(src);
    if (!h.length) continue;
    if (DONE.includes(g)) h.forEach(x => out.push({ step: 'pz88', q: g, msg: x })); else pending[g] = h.length;
  }
  return { out, pending };
}
module.exports = { verify, scan, DONE, MID_DONE, mids };
if (require.main === module) {
  const r = verify();
  r.out.forEach(o => console.log('NG', o.q, o.msg));
  console.log('pending (追88 未確認):', JSON.stringify(r.pending));
  process.exit(r.out.length ? 1 : 0);
}
