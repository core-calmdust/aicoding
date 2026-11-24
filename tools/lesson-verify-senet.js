// tools/lesson-verify-senet.js — セネトのレッスン（senet/lessons.json）の厳しい検証（2026-11-24、担当C、3D対応）。tools/lesson-verify.js senet から呼ぶ。
// 手の問題：期待値探索（評価ネット）の深さ 2・3・4 で全合法手を並べ直し、保存値 ev と照合（①④追4）、どの深さでも2番目と5%以上（②）、
// 合法手3以上（③）、主題の手（④）、不正解の手すべての理由を盤から作り直して一致（⑦⑧）、差の大きい順（⑥）。
// 選択問題：答え・理由の数（確率の数え上げ・動かせる駒・上がれる目）をエンジンで数え直す、誤答すべてに説明と向き（追22・追23）。
// 全局面（問題・準備・見本・ルール説明）が互いに駒4つ以上ちがう（⑤・追1）。文言に勝率がない（追16）。ヒントの印（追7）。14言語。
// node tools/lesson-verify-senet.js [--selftest]（わざと壊したデータで検出を確かめる）
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
function verify(opt = {}) {
  const E = require(path.join(ROOT, 'senet/engine.js'));
  if (!E.__wasm) { try { E.setWasm(new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(ROOT, 'senet/engine_simd.wasm'))), { env: { now: () => performance.now() } }).exports); E.__wasm = 1; } catch (e) {} }
  const F = require(path.join(ROOT, 'senet/tools/senet_lessfacts.js')), LANGS = require(path.join(ROOT, 'senet/tools/learn_text_v2.js')).LANGS;
  const D = opt.data || JSON.parse(fs.readFileSync(path.join(ROOT, 'senet/lessons.json'), 'utf8'));
  const out = [], add = (step, q, msg) => out.push({ step, q, msg });
  // 追16：文言に勝率・評価値を書かない（14言語）
  const BAD = /勝率|勝つ見込み|評価値|[Ww]in(s)? \{|[Ww]in chance|胜率|勝算|승률|Ganas \{|gagne \{|vence \{|gewinnt \{|Gewinnchance|जीत|فرصة الفوز|Шанс победы|Peluang menang|Kazanma|\{a\}%|\{x\}%/;
  const walk = (o, where) => { if (typeof o === 'string') { if (BAD.test(o)) add(where, 0, `追16 勝率の文: ${o.slice(0, 50)}`); } else if (o && typeof o === 'object') for (const k in o) walk(o[k], where); };
  walk(D.msg, 'msg'); D.steps.forEach(s => walk({ t: s.title, b: s.body, tip: s.tip, h: s.hints, r: (s.ramp || []).map(r => [r.t, r.body, r.g, r.h, r.y]) }, s.id));
  for (const k in D.msg) for (const l of LANGS) if (typeof D.msg[k][l] !== 'string' || !D.msg[k][l]) { add('msg.' + k, 0, `14言語 ${l} がない`); break; }
  const refOk = (r, where, L) => { if (!r || !D.msg[r[0]]) { add(L, where, `理由のキー ${r && r[0]} が msg にない`); return; } const need = (D.msg[r[0]].ja.match(/\{(\w+)\}/g) || []).map(x => x.slice(1, -1)); for (const k of need) if (!r[1] || r[1][k] == null) add(L, where, `理由 ${r[0]} の {${k}} がない`); };
  const IDS = ['prob', 'block', 'swap', 'risk', 'beauty', 'water', 'exit'];
  if (D.steps.map(s => s.id).join() !== IDS.join()) add('steps', 0, `レッスンの並び ${D.steps.map(s => s.id).join()}`);
  const catOf = {}; (D.cats || []).forEach(c => c.steps.forEach(id => { catOf[id] = c.id; }));
  // ⑤ 全局面
  const items = [];
  D.steps.forEach(L => { (L.problems || []).forEach((q, i) => q.s && items.push({ s: q.s, n: q.n, where: L.id + '#' + (i + 1) })); (L.ramp || []).forEach((r, i) => r.s && items.push({ s: r.s, n: r.n, where: L.id + '/ramp' + i })); });
  F.tourStates(ROOT).forEach((s, i) => items.push({ s, n: null, where: 'tour:' + s.src + ':' + i }));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j]; if (a.where.startsWith('tour') && b.where.startsWith('tour')) continue;
    const d = F.tokDiff(a.s, b.s, a.n, b.n); if (d < F.MIN_TOK) add(a.where.split(/[#/]/)[0], a.where, `⑤ ${b.where} と駒${d}つしかちがわない`);
  }
  const S = s => F.st(s);
  function move(L, q, where, minMoves) {
    const s = S(q.s), ms = E.legalMoves(s, q.n);
    if (ms.length < minMoves) add(L.id, where, `③合法手 ${ms.length}`);
    const r = F.judge(q.s, q.n, L.id, { minMoves });
    r.fail.forEach(f => add(L.id, where, f));
    if (!r.ev) return;
    const ev = q.ev || [];
    if (q.ev && (ev.length !== r.ev.length || ev.some((e, i) => e[0] !== r.ev[i][0] || e[1] !== r.ev[i][1] || Math.abs(e[2] - r.ev[i][2]) > 2e-3))) add(L.id, where, '①保存値 ev が深さ4の読みと合わない');
    if (q.gap != null && Math.abs(q.gap - r.gap) > 2e-3) add(L.id, where, `①保存値 gap ${q.gap} ≠ ${r.gap.toFixed(3)}`);
    const best = r.best, ok = q.ok || [];
    if (ok.length !== 1 || ok[0][0] !== best.from || ok[0][1] !== best.to) add(L.id, where, `①正解 ${JSON.stringify(ok)} ≠ 最善 ${best.from}→${best.to}（追3：正解は最善の手だけ）`);
    if (q.best && (q.best[0] !== best.from || q.best[1] !== best.to)) add(L.id, where, '①best が最善と合わない');
    if (q.why && JSON.stringify(q.why) !== JSON.stringify(r.why)) add(L.id, where, `⑧正解の理由 ${JSON.stringify(q.why)} ≠ 盤から ${JSON.stringify(r.why)}`);
    if (q.why) refOk(q.why, where, L.id);
    if (q.ng) {
      const keys = Object.keys(q.ng).map(Number).sort((a, b) => a - b), want = ms.filter(m => m.from !== best.from).map(m => m.from).sort((a, b) => a - b);
      if (keys.join() !== want.join()) add(L.id, where, `⑦不正解の理由が全合法手にない（${keys}／${want}）`);
      for (const f of want) if (q.ng[f] && q.ng[f][0] === 'n.risk' && F.again(q.n)) add(L.id, where, `追26 出目${q.n}はもう一度投げる目なのに、相手の次の投げの確率を理由にしている`);
      for (const f of want) { const k = F.ngKey(s, q.n, best, ms.find(m => m.from === f), L.id); if (JSON.stringify(k) !== JSON.stringify(q.ng[f])) add(L.id, where, `⑦不正解 ${f} の理由 ${JSON.stringify(q.ng[f])} ≠ 盤から ${JSON.stringify(k)}`); if (q.ng[f]) refOk(q.ng[f], where, L.id); }
    }
    return r;
  }
  // 選択問題の答えを盤（エンジン）で数え直す
  const num = o => parseInt(String(o), 10);
  function choice(L, q, where, isRamp, isEx) {
    const opts = q.opts || [];
    if (!isEx) {
      if (opts.length < 3) add(L.id, where, `③選択肢 ${opts.length}`);
      if (new Set(opts.map(String)).size !== opts.length) add(L.id, where, '③選択肢が重なる');
      if (!(q.ans >= 0 && q.ans < opts.length)) { add(L.id, where, '答えの番号がない'); return; }
    }
    const k = q.why && q.why[0], v = (q.why && q.why[1]) || {};
    refOk(q.why, where, L.id);
    let m = null, unit = '/16';
    if (k === 'c.roll') m = F.P16[v.n];
    else if (k === 'c.again') m = F.P16[1] + F.P16[4] + F.P16[5];
    else if (/^c\.risk/.test(k)) {
      const dm = (q.marks || []).filter(x => x.type === 'danger'); if (dm.length !== 1) { add(L.id, where, '追7 赤い印の駒が1つでない'); return; }
      const p = (dm[0].r === 1 ? 19 - dm[0].c : dm[0].r * 10 + dm[0].c) + 1, s = S(q.s), kk = s.pos[0].indexOf(p);
      if (kk < 0) { add(L.id, where, `赤い印 ${p} に自分の駒がない`); return; }
      const t = E.clone(s); t.turn = 1; const hits = [1, 2, 3, 4, 5].filter(n => E.legalMoves(t, n).some(x => x.capture && x.to === p));
      m = hits.reduce((x, n) => x + F.P16[n], 0);
      if (Math.round(F.riskNow(s)[kk] * 16) !== m) add(L.id, where, '追23 hitRisk と数え上げが合わない');
      const b = E.board(s), paired = (p > 1 && b[p - 1] === 0) || b[p + 1] === 0;
      if (m && (k !== 'c.riskL' || v.m !== m || v.list !== hits.map(n => `${n}→${F.P16[n]}/16`).join(' + '))) add(L.id, where, `追23 理由の数え上げ ${JSON.stringify(v)} ≠ ${hits}→${m}`);
      if (!m && k !== (paired ? 'c.risk0p' : 'c.risk0w')) add(L.id, where, `⑧ 0 の理由 ${k}（${paired ? 'ペア' : '壁'}）`);
      if (!m && !paired) { const behind = s.pos[1].filter(x => x < p && p - x <= 5); const wall = behind.some(x => { for (let z = x + 1; z < p; z++) { if (b[z] === 0 && b[z + 1] === 0 && b[z + 2] === 0 && z + 2 < p) return true; } return false; }); if (!wall) add(L.id, where, '⑧「壁で届かない」が盤と合わない'); }
      const labels = (q.marks || []).filter(x => x.type === 'text').map(x => +x.text).sort();
      const dists = s.pos[1].filter(x => x < p && p - x <= 5).map(x => p - x).sort();
      if (labels.join() !== dists.join()) add(L.id, where, `追7 距離の数字 ${labels} ≠ 盤 ${dists}`);
    } else if (k === 'c.block') {
      const s = S(q.s), ms = E.legalMoves(s, q.n), ok = ms.map(x => x.from).sort((a, b) => a - b);
      m = ok.length; unit = '';
      if (v.m !== m || v.ok !== ok.join('・')) add(L.id, where, `⑧動かせる駒 ${JSON.stringify(v)} ≠ ${ok}`);
      if (!q.n) add(L.id, where, '出目がない');
    } else if (k === 'c.exitL') {
      const s = S(q.s), hits = [1, 2, 3, 4, 5].filter(n => E.legalMoves(s, n).some(x => x.finish));
      m = hits.reduce((x, n) => x + F.P16[n], 0);
      if (v.m !== m || v.list !== hits.map(n => `${n}→${F.P16[n]}/16`).join(' + ')) add(L.id, where, `追23 上がれる目 ${JSON.stringify(v)} ≠ ${hits}→${m}`);
      const gl = (q.marks || []).filter(x => x.type === 'glow').length, ex = s.pos[0].filter(p => [26, 28, 29, 30].includes(p)).length;
      if (gl !== ex) add(L.id, where, `追7 光るマス ${gl} ≠ 出口の駒 ${ex}`);
    } else { add(L.id, where, `選択問題の理由 ${k} を確かめられない`); return; }
    if (isEx) return m;
    const want = isRamp && k === 'c.roll' && opts.length === 5 ? '2' : unit ? m + unit : String(m);   // (準備の「いちばん出やすい目」：答えは 2)
    if (isRamp && k === 'c.roll' && opts.length === 5) { const best = [1, 2, 3, 4, 5].reduce((a, n) => F.P16[n] > F.P16[a] ? n : a, 1); if (String(opts[q.ans]) !== String(best) || v.n !== best) add(L.id, where, `①いちばん出やすい目 ${opts[q.ans]} ≠ ${best}`); }
    else if (String(opts[q.ans]) !== want) add(L.id, where, `①選択の答え ${opts[q.ans]} ≠ 数え直し ${want}`);
    // 追22：誤答すべてに説明、少なすぎ／多すぎの向き
    const ngo = q.ngo || [];
    opts.forEach((o, i) => {
      if (i === q.ans) { if (ngo[i]) add(L.id, where, '追22 正解に誤答の説明'); return; }
      const g = ngo[i]; if (!g) { add(L.id, where, `追22 誤答 ${o} に説明がない`); return; }
      refOk(g, where, L.id);
      const a = num(opts[q.ans]), x = num(o);
      if (g[0] === 'c.lowNg' || g[0] === 'c.blockLow') { if (!(x < a)) add(L.id, where, `追22 誤答 ${o} の説明の向き（少なすぎ）`); }
      else if (g[0] === 'c.highNg' || g[0] === 'c.blockHigh') { if (!(x > a)) add(L.id, where, `追22 誤答 ${o} の説明の向き（多すぎ）`); }
      else if (g[0] === 'c.rollNg') { const vs = String(g[1].v).split(' / ').map(Number); if (!vs.length || vs.some(n => F.P16[n] + '/16' !== o)) add(L.id, where, `追22 誤答 ${o} の説明「${g[1].v} の確率」が合わない`); }
      else if (g[0] === 'c.roll8Ng') { if ([1, 2, 3, 4, 5].some(n => F.P16[n] + '/16' === o)) add(L.id, where, `追22 誤答 ${o} はある目の確率`); }
      else if (g[0] === 'c.roll') { if (F.P16[g[1].n] !== g[1].m || String(g[1].n) !== String(o)) add(L.id, where, `追22 誤答 ${o} の説明 ${JSON.stringify(g)}`); }
      else add(L.id, where, `追22 誤答の説明 ${g[0]} を確かめられない`);
      if (g[1] && g[1].x != null && String(g[1].x) !== String(o)) add(L.id, where, `追22 誤答の説明の {x} ${g[1].x} ≠ ${o}`);
      if (g[0] === 'c.blockLow' && g[1].ok !== v.ok) add(L.id, where, '追22 少なすぎの説明の駒が答えと合わない');
    });
    return m;
  }
  const hasLook = (L, t) => (L.hints || []).some(h => h && h.ja && h.ja.includes(t));
  for (const L of D.steps) {
    if (!catOf[L.id]) add(L.id, 0, 'cats にない');
    const P = L.problems || []; if (P.length !== 5) add(L.id, 0, `問題数 ${P.length}`);
    for (const k of ['title', 'tip', 'body']) for (const l of LANGS) if (!L[k] || !L[k][l]) { add(L.id, 0, `${k} の ${l} がない`); break; }
    (L.hints || []).forEach((h, i) => { for (const l of LANGS) if (!h || !h[l]) { add(L.id, 'hint' + i, `${l} がない`); break; } });
    const isMove = ['swap', 'beauty', 'water'].includes(L.id);
    const gaps = [];
    P.forEach((q, i) => {
      const w = 'q' + (i + 1);
      if (isMove !== (q.kind === 'move')) add(L.id, w, `問題の種類 ${q.kind}`);
      if (q.kind === 'move') { const r = move(L, q, w, 3); if (r) gaps.push(r.gap);
        if (hasLook(L, '赤い印') && !(q.look || []).some(x => x.type === 'danger')) add(L.id, w, '追7 ヒントの「赤い印」が盤にない');
        if (L.id === 'beauty' && !(q.look || []).some(x => x.type === 'glow' && x.r === 2 && x.c === 5)) add(L.id, w, '追7 美の家の光がない');
        if (L.id === 'water' && !E.legalMoves(S(q.s), q.n).some(m => m.water && m.dest === 15)) add(L.id, w, '追7 ヒント「15へ戻る」と盤が合わない');
        if (L.id === 'swap' && !(q.look || []).some(x => x.type === 'ring')) add(L.id, w, '追7 入れ替えの輪がない'); }
      else choice(L, q, w, false);
    });
    // ⑥ 易→難：手の問題は2番目との差の大きい順、選択問題は数える数（届く目・止まれない駒・上がれる目）が増える／同じ
    if (isMove) { const c = {}; P.forEach(q => { const k = (q.ok || [[]])[0].join('>'); c[k] = (c[k] || 0) + 1; }); for (const k in c) if (c[k] > 2) add(L.id, 0, `⑤同じ手 ${k} が5問中${c[k]}問（同じ手筋のくり返し）`); }
    for (let i = 1; i < gaps.length; i++) if (gaps[i] > gaps[i - 1] + 1e-9) add(L.id, 'q' + (i + 1), `⑥差の大きい順でない（${gaps[i - 1].toFixed(3)} → ${gaps[i].toFixed(3)}）`);
    const R = L.ramp || [];
    if (R.length !== 2 || R[0].k !== 'explain' || R[1].k !== 'try') add(L.id, 'ramp', '準備は 見本→やってみよう');
    R.forEach((r, i) => {
      if (r.k === 'try') { if (r.kind === 'choice') choice(L, r, 'ramp' + i, true); else move(L, Object.assign({}, r, { ev: null }), 'ramp' + i, 2); }
      if (r.k === 'explain' && r.seq && r.seq.length) { const s = S(r.s), m = E.legalMoves(s, r.n).find(x => x.from === r.seq[0][0] && x.to === r.seq[0][1]); if (!m) add(L.id, 'ramp' + i, '追14 見本の手が合法でない'); else { const j = F.judge(r.s, r.n, L.id); if (!j.best || j.best.from !== m.from) add(L.id, 'ramp' + i, '追14 見本の手が最善でない'); if (!j.ok) j.fail.forEach(f => add(L.id, 'ramp' + i, '追14 見本 ' + f)); } }
      if (r.k === 'explain' && r.why && !(r.seq || []).length) choice(L, r, 'ramp' + i + '(見本)', false, true);   // (選択の見本：理由の数を数え直す)
      if (r.k === 'explain' && r.why && (r.seq || []).length) { const j = F.judge(r.s, r.n, L.id); if (JSON.stringify(j.why) !== JSON.stringify(r.why)) add(L.id, 'ramp' + i, '追14 見本の説明の理由が盤と合わない'); }
    });
    if (L.diagram && R[0] && JSON.stringify(L.diagram.s) !== JSON.stringify(R[0].s)) add(L.id, 'diagram', '見本の図と準備の盤が違う');
  }
  return out;
}
module.exports = verify;
if (require.main === module) {
  const D0 = JSON.parse(fs.readFileSync(path.join(ROOT, 'senet/lessons.json'), 'utf8'));
  if (process.argv.includes('--selftest')) {
    const C = () => JSON.parse(JSON.stringify(D0)), st = id => (d => d.steps.find(s => s.id === id));
    const M = {
      '答えを2番目の手に': d => { const q = st('swap')(d).problems[0]; q.ok = [[q.ev[1][0], q.ev[1][0] + q.n]]; },
      '並びを入れかえ': d => { const p = st('beauty')(d).problems; [p[0], p[4]] = [p[4], p[0]]; },
      '保存値を変える': d => { st('water')(d).problems[1].ev[0][2] += 0.05; },
      '不正解の理由を変える': d => { const q = st('swap')(d).problems[2], f = Object.keys(q.ng)[0]; q.ng[f] = ['n.risk', { r: 50, q: 10 }]; },
      '不正解の理由を消す': d => { const q = st('beauty')(d).problems[3]; delete q.ng[Object.keys(q.ng)[0]]; },
      '正解の理由を変える': d => { st('swap')(d).problems[1].why[1].k += 1; },
      '勝率の文': d => { d.msg['w.swap'].ja += '勝率 {a}%'; },
      '同じ局面': d => { st('beauty')(d).problems[2].s = JSON.parse(JSON.stringify(st('beauty')(d).problems[1].s)); },
      '選択の答え': d => { const q = st('risk')(d).problems[0]; q.ans = (q.ans + 1) % q.opts.length; },
      '誤答の説明を消す': d => { const q = st('prob')(d).problems[2]; q.ngo[q.ans === 0 ? 1 : 0] = null; },
      '誤答の説明の向き': d => { const q = st('exit')(d).problems[1], i = q.opts.findIndex((o, k) => k !== q.ans && parseInt(o, 10) < parseInt(q.opts[q.ans], 10)); q.ngo[i] = ['c.highNg', { x: q.opts[i] }]; },
      '確率の数え上げ': d => { st('risk')(d).problems[3].why[1].m += 1; },
      '動かせる駒の数': d => { const q = st('block')(d).problems[1]; q.why[1].m += 1; },
      '選択肢が2つ': d => { const q = st('exit')(d).problems[0]; q.opts = q.opts.slice(0, 2); q.ans = Math.min(q.ans, 1); },
      '赤い印を消す': d => { const q = st('risk')(d).problems[1]; q.marks = q.marks.filter(x => x.type !== 'danger'); },
      '距離の数字を変える': d => { const q = st('prob')(d).problems[3]; q.marks.find(x => x.type === 'text').text = '3'; },
      '正解を2つ': d => { const q = st('water')(d).problems[0]; q.ok.push([q.ev[1][0], q.ev[1][0] + q.n]); },
      'もう一度投げる目で確率の理由': d => { const q = st('water')(d).problems[0], f = Object.keys(q.ng)[0]; q.ng[f] = ['n.risk', { r: 40, q: 10 }]; },
      '同じ手を3問': d => { const p = st('swap')(d).problems; p[2] = JSON.parse(JSON.stringify(p[0])); p[2].s.pos[1] = p[2].s.pos[1].map(x => x === 31 ? 31 : x); p[2].s.pos[0][0] = p[2].s.pos[0][0]; },
      '0の理由を取りかえ': d => { const q = st('risk')(d).problems.find(x => x.why[0] === 'c.risk0p'); q.why = ['c.risk0w', {}]; },
    };
    let bad = 0;
    const base = verify({ data: C() }); if (base.length) { console.log('元のデータが不合格', base.slice(0, 5)); process.exit(1); }
    for (const [name, f] of Object.entries(M)) { const d = C(); f(d); const r = verify({ data: d }); console.log((r.length ? '検出 ' : '見逃し ') + name + (r.length ? '：' + r[0].msg.slice(0, 60) : '')); if (!r.length) bad++; }
    console.log(bad ? `NG ${bad} 種を見逃した` : `OK 壊したデータ ${Object.keys(M).length} 種すべて検出`); process.exit(bad ? 1 : 0);
  }
  const f = verify({ data: D0 }); f.forEach(x => console.log(`NG senet ${x.step} ${x.q}: ${x.msg}`));
  const nq = D0.steps.reduce((a, s) => a + s.problems.length, 0);
  console.log(f.length ? `NG ${f.length}` : `OK senet ${D0.steps.length}本 ${nq}問`); process.exit(f.length ? 1 : 0);
}
