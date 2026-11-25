// (2026-11-25 担当A, claude/lesson-quality.md 追88) 詰めヘックス (hex/puzzles.json) after a move off the solution, 2D and 3D alike:
//   - the page code keeps the 詰め rule: hex/app.js puzzleMove / blockMove and atlas/puzzles.js hxMoved take no move back, show no
//     right move by itself, say no 「いい手」 on the way (pz.good / HXX.mid 「いい調子」), and use hex/pzwhy.js (reply / facts / block);
//   - every wrong first move of every puzzle (all themes, every legal cell): the defender's reply is hex/pzwhy.js reply() on the
//     engine's puzzle(defend) list (the same call as the page), and the words' facts hold on the board (⑦⑧):
//       wLast — the move is the last one and does not connect, {k} = the stones still needed (pos.need, ≥ 1);
//       wLost — the reply joined the opponent's own edges;
//       wFar  — {k} = stones needed after the reply > {n} = moves left;
//       wCut  — {k} ≤ {n}, and the solver proves no forced connection in {n} after the reply (its need is 0, not a budget stop);
//       bWin / bLine — "stop" puzzles: the opponent's quickest attack (pzwhy attack) is played; bWin = it connected, bLine = after
//       it every reply of the player still lets the opponent connect within {j} (the solver, all replies);
//   - every word of hex/pzwhy.js (T: 14 languages, OWN.ja: 3 lines) for every key exists and leaves no {placeholder} unfilled.
// Usage: node tools/lesson-verify-hexpz.js [themeId] [--quick]   (lesson-verify.js hexpz calls verify())
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const KEYS = ['answer', 'wLast', 'wLost', 'wFar', 'wCut', 'bWin', 'bLine'];
function body(src, re, n) { const i = src.search(re); if (i < 0) return ''; return src.slice(i, i + n); }
function codeChecks(opt) {
  const out = [], add = (q, msg) => out.push({ step: 'code88', q, msg });
  const app = opt.app != null ? opt.app : fs.readFileSync(path.join(ROOT, 'hex/app.js'), 'utf8');
  const atl = opt.atlas != null ? opt.atlas : fs.readFileSync(path.join(ROOT, 'atlas/puzzles.js'), 'utf8');
  const html = opt.html != null ? opt.html : fs.readFileSync(path.join(ROOT, 'hex/index.html'), 'utf8');
  const pm = body(app, /async function puzzleMove\(/, 6000).split(/\nasync function blockMove|\nfunction playMove2/)[0];
  const bm = body(app, /async function blockMove\(/, 4000).split(/\nfunction playMove2/)[0];
  const hx = body(atl, /async function hxMoved\(/, 8000).split(/\n\s*async function hxAuto/)[0];
  if (!pm || !bm || !hx) { add('code', 'puzzleMove / blockMove / hxMoved not found'); return out; }
  for (const [nm, s] of [['hex/app.js puzzleMove', pm], ['hex/app.js blockMove', bm], ['atlas/puzzles.js hxMoved', hx]]) {
    if (/failBack|\bback\s*\(|const back\b/.test(s)) add(nm, 'takes the move back (failBack / back)');
    if (/moves\s*=\s*moves\.slice\(0,\s*cur\s*-\s*1\)|moves\s*=\s*\[\]|\.undo\(/.test(s)) add(nm, 'removes the played move (undo / moves = …)');
    if (/'ok'\s*\)|,\s*'ok'\]|cls:\s*'ok'/.test(s)) add(nm, 'marks the right move (\'ok\') after a wrong one');
    if (/pz\.good/.test(s)) add(nm, 'says pz.good 「いい手です」 on the way');
    if (/pz\.best|pz\.failWhy|pz\.failBlock|pz\.bl\./.test(s)) add(nm, 'names the right move / the old blunder words (pz.best · pz.failWhy · pz.failBlock · pz.bl.*)');
    if (!/HexPzWhy|\bHW\(\)/.test(s)) add(nm, 'does not use hex/pzwhy.js (window.HexPzWhy)');
  }
  const mid = (atl.match(/const HXX = \{[\s\S]*?\n {2}\};/) || [''])[0];
  if (/いい調子|Good!|不错|不錯|좋아|¡Bien|Bien !|Boa!|Gut!|Отлично|Güzel|Bagus|बढ़िया|رائع/.test(mid)) add('atlas/puzzles.js HXX.mid', 'praises the move on the way (「いい調子」)');
  if (!/pzwhy\.js/.test(html)) add('hex/index.html', 'does not load pzwhy.js');
  const lazy = opt.lazy != null ? opt.lazy : fs.readFileSync(path.join(ROOT, 'atlas/lazy.js'), 'utf8');
  if (!/"hex": \[[^\]]*\.\.\/hex\/pzwhy\.js/.test(lazy)) add('atlas/lazy.js', 'the hex 3D table does not load ../hex/pzwhy.js');
  return out;
}
function wordChecks(W) {
  const out = [], add = (q, msg) => out.push({ step: 'words88', q, msg });
  const v = { a: 'X', k: 3, n: 2, j: 2 };
  for (const L of LANGS) for (const k of KEYS) {
    const s = W.T[L] && W.T[L][k];
    if (!s) { add(L + '.' + k, 'missing'); continue; }
    if (/\{\w+\}/.test(W.text(L, k, v))) add(L + '.' + k, 'placeholder left');
  }
  for (const k of KEYS) { const A = W.OWN.ja[k]; if (!A || A.length < 3) add('OWN.ja.' + k, 'fewer than 3 lines'); else A.forEach((s, i) => { if (/\{\w+\}/.test(W.own('ja', k, i, v))) add('OWN.ja.' + k + '[' + i + ']', 'placeholder left'); }); }
  // the number placeholders the facts give, in the words that use them
  const need = { wLast: ['k'], wFar: ['k', 'n'], wCut: ['k', 'n'], bLine: ['j'] };
  for (const k in need) for (const q of need[k]) {
    for (const L of LANGS) if (!new RegExp('\\{' + q + '\\}').test(W.T[L][k])) add(L + '.' + k, 'does not say {' + q + '}');
    W.OWN.ja[k].forEach((s, i) => { if (!new RegExp('\\{' + q + '\\}').test(s)) add('OWN.ja.' + k + '[' + i + ']', 'does not say {' + q + '}'); });
  }
  return out;
}
function boardChecks(opt) {
  const out = [], add = (q, msg) => out.push({ step: 'facts88', q, msg });
  const E = opt.E || require(path.join(ROOT, 'hex/tools/wasm.js')).load();
  const W = opt.W || require(path.join(ROOT, 'hex/pzwhy.js'));
  const D = opt.data || JSON.parse(fs.readFileSync(path.join(ROOT, 'hex/puzzles.json'), 'utf8'));
  const cnt = { puzzles: 0, wrong: 0, keys: {} };
  for (const T of D.themes) {
    if (opt.only && T.id !== opt.only) continue;
    T.puzzles.forEach((P, j) => {
      if (opt.quick && j % 5) return;
      cnt.puzzles++;
      const q = T.id + '#' + (j + 1), me = P.s.side, start = E.replay(P.s, []).pos;
      const legal = []; for (let i = 0; i < start.b.length; i++) if (!start.b[i]) legal.push(i);
      if (T.grp === 'Block') {
        const k = P.k || P.d || P.n;
        const L = E.puzzle(P.s, [], k, true, 4000) || [];
        for (const e of L) {
          if (e.need === 0) continue;
          if (e.need < 0) { add(q, 'budget at the wrong move ' + e.m); continue; }
          cnt.wrong++;
          const att = E.puzzle(P.s, [e.m], e.need, false, 4000) || [], a = W.attack(att, e.need);
          if (a == null) { add(q, 'wrong ' + e.m + ': no attacking move of the opponent within ' + e.need); continue; }
          const after = E.replay(P.s, [e.m, a]).pos, f = W.block({ me, after, j: e.need - 1 });
          cnt.keys[f.k] = (cnt.keys[f.k] || 0) + 1;
          if (f.k === 'bWin') { if (e.need !== 1) add(q, 'wrong ' + e.m + ': bWin but the solver said ' + e.need + ' moves'); continue; }
          if (!(f.v.j >= 1)) { add(q, 'wrong ' + e.m + ': bLine with j=' + f.v.j); continue; }
          const R = E.puzzle(P.s, [e.m, a], f.v.j, true, 4000) || [];
          const bad = R.filter(r => !(r.need > 0 && r.need <= f.v.j));
          if (!R.length || bad.length) add(q, 'wrong ' + e.m + ' → ' + a + ': bLine says it connects in ' + f.v.j + ' whatever the player does, but ' + bad.length + ' replies hold (' + bad.slice(0, 3).map(r => r.m + ':' + r.need).join(' ') + ')');
        }
        return;
      }
      // every attacker step of the main line (the stored answer, then the solver's quickest; the defender: pzwhy pick on the
      // longest resistances — any of them is a position the page can reach)
      const line = [];
      for (let used = 0; used < P.n; used++) {
        const left = P.n - used, pos0 = E.replay(P.s, line).pos;
        if (pos0.winner()) break;
        const L0 = E.puzzle(P.s, line, left, false, 4000) || [];
        const good = new Set(L0.filter(e => e.need > 0 && e.need <= left).map(e => e.m));
        if (!good.size) { add(q, 'step ' + (used + 1) + ': no move connects within ' + left); return; }
        wrongs(q, P, me, line, pos0, left, good);
        const a = used === 0 && good.has(P.answer) ? P.answer : W.attack(L0, left);
        line.push(a);
        const p1 = E.replay(P.s, line).pos; if (p1.winner()) break;
        const dl = E.puzzle(P.s, line, left - 1, true, 4000) || []; if (!dl.length) break;
        line.push(W.pick(p1, dl, me));
      }
    });
  }
  function wrongs(q, P, me, line, pos0, left, good) {
      const legal = []; for (let i = 0; i < pos0.b.length; i++) if (!pos0.b[i]) legal.push(i);
      for (const m of legal) {
        if (good.has(m)) continue;
        cnt.wrong++;
        const mid = E.replay(P.s, line.concat([m])).pos;
        if (mid.winner() === me) { add(q, 'wrong ' + m + ' connects at once'); continue; }
        let after = null, r = null;
        if (left > 1) {
          const dl = E.puzzle(P.s, line.concat([m]), left - 1, true, 4000) || [];
          r = W.reply(mid, dl, me);
          if (r == null) { add(q, 'wrong ' + m + ': no reply'); continue; }
          after = E.replay(P.s, line.concat([m, r])).pos;
          const ent = dl.find(e => e.m === r);
          if (after.winner() !== 3 - me) {
            if (!ent) { add(q, 'wrong ' + m + ': the reply ' + r + ' is not in the solver\'s list'); continue; }
            if (ent.need !== 0) add(q, 'wrong ' + m + ' → ' + r + ': the solver does not prove the reply holds (need ' + ent.need + ')');
          }
        }
        const f = W.facts({ me, mid, after, left: left - 1 });
        cnt.keys[f.k] = (cnt.keys[f.k] || 0) + 1;
        if (f.k === 'wLast' && !(left === 1 && f.v.k >= 1)) add(q, 'wrong ' + m + ': wLast with n=' + P.n + ' k=' + f.v.k);
        if (f.k === 'wFar' && !(f.v.k > f.v.n)) add(q, 'wrong ' + m + ': wFar but k ≤ n');
        if (f.k === 'wCut' && !(f.v.k <= f.v.n && f.v.k >= 1)) add(q, 'wrong ' + m + ': wCut but k > n');
        if (f.k === 'wLost' && !(after && after.winner() === 3 - me)) add(q, 'wrong ' + m + ': wLost but the opponent did not connect');
      }
  }
  return { out, cnt };
}
function verify(opt = {}) {
  const W = opt.W || require(path.join(ROOT, 'hex/pzwhy.js'));
  const out = [...codeChecks(opt), ...wordChecks(W)];
  let cnt = null;
  if (!opt.noBoard) { const b = boardChecks(Object.assign({ W }, opt)); out.push(...b.out); cnt = b.cnt; }
  return { out, cnt };
}
module.exports = { verify, codeChecks, wordChecks, boardChecks };
if (require.main === module) {
  const a = process.argv.slice(2), only = a.find(x => !x.startsWith('--'));
  const t0 = Date.now(), r = verify({ only, quick: a.includes('--quick') });
  for (const o of r.out.slice(0, 60)) console.log('NG', o.step, o.q, o.msg);
  console.log(JSON.stringify(r.cnt), 'NG', r.out.length, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  process.exit(r.out.length ? 1 : 0);
}
