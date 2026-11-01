// Builds openings.json: White's five first moves (grp w) and Black's best replies to f2-e3A / d3-e3A (grp b).
// Each set: the defining moves, a study line continued by the engine, per-move notes (templated in 10 languages)
// and practice problems (positions of the set's side along the line and nearby, scored by the engine).
// node tools/gen_openings.js
'use strict';
const fs = require('fs'), path = require('path');
const { init, rng, capN } = require('./lib.js');
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const T = {
  side: { ja: ['白', '黒'], en: ['White', 'Black'], zh: ['白方', '黑方'], ko: ['백', '흑'], es: ['Blancas', 'Negras'], fr: ['Blancs', 'Noirs'], pt: ['Brancas', 'Pretas'], de: ['Weiß', 'Schwarz'], hi: ['सफ़ेद', 'काला'], ar: ['الأبيض', 'الأسود'] },
  kind: { ja: ['接近', '離脱'], en: ['approach', 'withdrawal'], zh: ['接近', '撤离'], ko: ['접근', '이탈'], es: ['aproximación', 'retirada'], fr: ['approche', 'retrait'], pt: ['aproximação', 'retirada'], de: ['Annäherung', 'Rückzug'], hi: ['पास जाकर', 'पीछे हटकर'], ar: ['الاقتراب', 'الانسحاب'] },
  paika: { ja: '{c}：{f}→{t}（取らない手）', en: '{c}: {f}→{t} (no capture)', zh: '{c}：{f}→{t}（不吃子）', ko: '{c}: {f}→{t} (잡지 않는 수)', es: '{c}: {f}→{t} (sin captura)', fr: '{c} : {f}→{t} (sans prise)', pt: '{c}: {f}→{t} (sem captura)', de: '{c}: {f}→{t} (ohne Schlag)', hi: '{c}: {f}→{t} (बिना कब्ज़ा)', ar: '{c}: {f}→{t} (دون أسر)' },
  cap: { ja: '{c}：{f}→{t}、{k}で{n}枚取り', en: '{c}: {f}→{t}, captures {n} by {k}', zh: '{c}：{f}→{t}，以{k}吃{n}子', ko: '{c}: {f}→{t}, {k}로 {n}개 잡기', es: '{c}: {f}→{t}, captura {n} por {k}', fr: '{c} : {f}→{t}, prend {n} par {k}', pt: '{c}: {f}→{t}, captura {n} por {k}', de: '{c}: {f}→{t}, schlägt {n} durch {k}', hi: '{c}: {f}→{t}, {k} {n} मोहरे लिए', ar: '{c}: {f}→{t}، يأسر {n} بـ{k}' },
  chain: { ja: '{c}：{f}から{s}回続けて計{n}枚取り', en: '{c}: from {f}, {s} captures in a row, {n} pieces', zh: '{c}：从{f}连续吃{s}次，共{n}子', ko: '{c}: {f}에서 {s}번 연속으로 모두 {n}개 잡기', es: '{c}: desde {f}, {s} capturas seguidas, {n} piezas', fr: '{c} : depuis {f}, {s} prises d’affilée, {n} pièces', pt: '{c}: de {f}, {s} capturas seguidas, {n} peças', de: '{c}: von {f} aus {s} Schläge hintereinander, {n} Steine', hi: '{c}: {f} से लगातार {s} बार, कुल {n} मोहरे', ar: '{c}: من {f}، {s} أسرات متتالية، {n} قطع' },
  ev: { ja: ['互角', '{c}やや有利', '{c}有利', '{c}優勢'], en: ['even', '{c} slightly better', '{c} better', '{c} much better'], zh: ['均势', '{c}略优', '{c}占优', '{c}大优'], ko: ['호각', '{c} 약간 유리', '{c} 유리', '{c} 우세'], es: ['igualado', '{c} algo mejor', '{c} mejor', '{c} mucho mejor'], fr: ['égalité', '{c} légèrement mieux', '{c} mieux', '{c} nettement mieux'], pt: ['igual', '{c} um pouco melhor', '{c} melhor', '{c} muito melhor'], de: ['ausgeglichen', '{c} leicht besser', '{c} besser', '{c} deutlich besser'], hi: ['बराबर', '{c} थोड़ा बेहतर', '{c} बेहतर', '{c} काफ़ी बेहतर'], ar: ['متعادل', '{c} أفضل قليلًا', '{c} أفضل', '{c} أفضل بكثير'] },
  evLbl: { ja: '評価', en: 'Evaluation', zh: '评估', ko: '평가', es: 'Valoración', fr: 'Évaluation', pt: 'Avaliação', de: 'Bewertung', hi: 'मूल्यांकन', ar: 'التقييم' },
  dir: { ja: ['斜め', '横', '縦'], en: ['diagonal', 'sideways', 'straight'], zh: ['斜向', '横向', '纵向'], ko: ['대각선', '가로', '세로'], es: ['diagonal', 'lateral', 'frontal'], fr: ['diagonale', 'latérale', 'frontale'], pt: ['diagonal', 'lateral', 'frontal'], de: ['diagonal', 'seitlich', 'gerade'], hi: ['तिरछा', 'आड़ा', 'सीधा'], ar: ['قطري', 'جانبي', 'مستقيم'] },
  wTitle: { ja: '{m}：{d}の{k}', en: '{m}: {d} {k}', zh: '{m}：{d}{k}', ko: '{m}: {d} {k}', es: '{m}: {k} {d}', fr: '{m} : {k} {d}', pt: '{m}: {k} {d}', de: '{m}: {k} ({d})', hi: '{m}: {d} {k}', ar: '{m}: {k} {d}' },
  bTitle: { ja: '{a} への応手 {b}', en: '{b} against {a}', zh: '对{a}应以{b}', ko: '{a}에 대한 {b}', es: '{b} contra {a}', fr: '{b} contre {a}', pt: '{b} contra {a}', de: '{b} gegen {a}', hi: '{a} के जवाब में {b}', ar: '{b} ردًّا على {a}' },
  short: { ja: '{n}手の代表手順', en: '{n}-move main line', zh: '{n}手代表变化', ko: '{n}수 대표 수순', es: 'línea principal de {n} jugadas', fr: 'ligne principale en {n} coups', pt: 'linha principal de {n} lances', de: 'Hauptlinie mit {n} Zügen', hi: '{n} चालों की मुख्य लाइन', ar: 'الخط الرئيسي في {n} نقلات' },
  wLabel: { ja: '白の初手', en: 'First move' }, bLabel: { ja: '黒の応手', en: 'Reply' },
};
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] !== undefined ? v[k] : '');
(async () => {
  const E = await init();
  const rand = rng(424242);
  const pn = E.pname;
  const evWord = (v, mover, l) => { const x = v / 100, a = Math.abs(x), side = (x >= 0) === (mover === 1) ? 0 : 1; const k = a < 0.3 ? 0 : a < 0.8 ? 1 : a < 2 ? 2 : 3; return fill(T.ev[l][k], { c: T.side[l][side] }); };
  // value of the position after `line` for White: analysis of the next mover, sign fixed
  const valAfter = line => { const r = E.analyze(null, line, 1500); const L = r.list.slice().sort((a, b) => b.v - a.v); const { pos } = E.replay(null, line); return L.length ? (pos.turn === 1 ? L[0].v : -L[0].v) : 0; };
  function note(pos, m, wv) {
    const S = pos.steps(m), c = pos.turn === 1 ? 0 : 1, n = S.reduce((a, x) => a + x.cap.length, 0), o = {};
    for (const l of LANGS) {
      let s;
      if (!n) s = fill(T.paika[l], { c: T.side[l][c], f: pn(S[0].from), t: pn(S[0].to) });
      else if (S.length === 1) s = fill(T.cap[l], { c: T.side[l][c], f: pn(S[0].from), t: pn(S[0].to), n, k: T.kind[l][S[0].kind === 'W' ? 1 : 0] });
      else s = fill(T.chain[l], { c: T.side[l][c], f: pn(S[0].from), s: S.length, n });
      o[l] = s + (wv != null ? ` — ${T.evLbl[l]}: ${evWord(wv, 1, l)}` : '');
    }
    return o;
  }
  const dirOf = (pos, m) => { const s = pos.steps(m)[0], d = s.d; return d & 1 ? 0 : (d === 0 || d === 4) ? 1 : 2; };
  const sets = [];
  const start = new E.Pos();
  const firsts = ['f2-e3A', 'd3-e3A', 'd3-e3W', 'd2-e3A', 'e2-e3A'];
  const defs = firsts.map(m => ({ grp: 'w', side: 1, moves: [m] }));
  for (const a of ['f2-e3A', 'd3-e3A']) {
    const r = E.analyze(null, [a], 3000), L = r.list.slice().sort((x, y) => y.v - x.v).slice(0, 3);
    for (const e of L) defs.push({ grp: 'b', side: 2, moves: [a, e.m] });
  }
  for (const d of defs) {
    const line = d.moves.slice();
    while (line.length < 10) {
      const { pos, hashes } = E.replay(null, line); if (E.judge(pos, hashes).over) break;
      const r = E.think(null, line, 19, rand); if (!r.move) break; line.push(r.move);
    }
    const notes = [];
    for (let i = 0; i < line.length; i++) { const { pos } = E.replay(null, line.slice(0, i)); notes.push(note(pos, line[i], i === line.length - 1 || i === d.moves.length - 1 ? valAfter(line.slice(0, i + 1)) : null)); }
    // practice: positions where the set's side is to move, along the line and one move off it
    const probs = [], seen = new Set();
    const addP = mv => {
      const { pos } = E.replay(null, mv); if (pos.turn !== d.side || pos.status() !== 0) return;
      const sp = pos.spec(); if (seen.has(sp.b)) return;
      const L = E.analyze(null, mv, 1500).list.slice().sort((a, b) => b.v - a.v); if (L.length < 3) return;
      seen.add(sp.b); probs.push({ s: sp, best: L[0].m, sc: L.slice(0, 20).map(e => [e.m, e.v]), pre: mv });
    };
    for (let i = d.moves.length; i <= line.length && probs.length < 6; i++) addP(line.slice(0, i));
    for (let t = 0; t < 30 && probs.length < 8; t++) {
      const k = d.moves.length + Math.floor(rand() * Math.max(1, line.length - d.moves.length - 1));
      const pre = line.slice(0, k), { pos } = E.replay(null, pre), all = pos.moves();
      if (all.length < 2) continue;
      const alt = all[Math.floor(rand() * all.length)]; const mv = pre.concat([alt]);
      const r = E.think(null, mv, 17, rand); if (!r.move) continue;
      addP(mv.concat([r.move]));
    }
    const p0 = E.replay(null, d.moves.slice(0, -1)).pos, key = d.moves[d.moves.length - 1], vEnd = valAfter(d.moves);
    const id = (d.grp === 'w' ? 'w_' : 'b_') + d.moves.join('_').replace(/-/g, '');
    const title = {}, short = {}, intro = {};
    for (const l of LANGS) {
      if (d.grp === 'w') { const S = p0.steps(key)[0]; title[l] = fill(T.wTitle[l], { m: key, d: T.dir[l][dirOf(p0, key)], k: T.kind[l][S.kind === 'W' ? 1 : 0] }); }
      else title[l] = fill(T.bTitle[l], { a: d.moves[0], b: key });
      short[l] = fill(T.short[l], { n: line.length });
      intro[l] = [notes[d.moves.length - 1][l]];
    }
    sets.push({ id, grp: d.grp, side: d.side, show: d.moves.length, moves: d.moves.join(' '), title, short, intro, v: vEnd, study: { line, notes }, problems: probs.map(p => ({ s: p.s, best: p.best, sc: p.sc, pre: p.pre })) });
    console.error(id, line.join(' '), 'v', vEnd, 'problems', probs.length);
  }
  // the problems of a set start from the normal starting position + the moves (pre): keep them as positions
  for (const s of sets) for (const p of s.problems) delete p.pre;
  fs.writeFileSync(path.join(__dirname, '..', 'openings.json'), JSON.stringify({ version: 1, sets }));
  console.error('written', sets.length);
})();
