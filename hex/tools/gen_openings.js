// Build openings.json: the first-move map (tools/gen_firstmap.js) + opening studies, all from this site's engine.
// Each study: the line is played by the engine (MCTS ~2.5 s per move, tactical shortcuts on), notes are generated from what each
// move does (bridge, block, intrusion, answer, edge template, swap …) with the AI's winrate; practice problems are positions of the
// line, every candidate scored by its own MCTS search.
//   HEXN=…/hexn node tools/gen_openings.js firstmap.json out.json
const fs = require('fs');
const E = require('../engine.js');
const N = require('./nat.js').open();
const [, , fmF, outF] = process.argv;
const FM = JSON.parse(fs.readFileSync(fmF, 'utf8'));
const L10 = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const T = (o, v) => { const r = {}; for (const l of L10) r[l] = String(o[l] || o.en).replace(/\{(\w+)\}/g, (_, k) => v && v[k] !== undefined ? (typeof v[k] === 'object' ? v[k][l] : v[k]) : ''); return r; };
const COL = { ja: ['赤', '青'], en: ['Red', 'Blue'], zh: ['红', '蓝'], ko: ['빨강', '파랑'], es: ['Rojo', 'Azul'], fr: ['Rouge', 'Bleu'], pt: ['Vermelho', 'Azul'], de: ['Rot', 'Blau'], hi: ['लाल', 'नीला'], ar: ['الأحمر', 'الأزرق'] };
const cname = p => { const r = {}; for (const l of L10) r[l] = COL[l][p - 1]; return r; };
const NOTE = {
  open: { ja: '{c}は{m}に打って始める。', en: '{c} opens on {m}.', zh: '{c}开局下在{m}。', ko: '{c}이(가) {m}에 두며 시작.', es: '{c} abre en {m}.', fr: '{c} ouvre en {m}.', pt: '{c} abre em {m}.', de: '{c} eröffnet auf {m}.', hi: '{c} {m} पर शुरुआत करता है।', ar: 'يفتتح {c} في {m}.' },
  swap: { ja: '青はスワップ：強い1手目を自分の石にする。', en: 'Blue swaps: the strong first stone becomes Blue\'s.', zh: '蓝方交换：强力的第一手变成蓝方的棋子。', ko: '파랑이 스왑: 강한 첫 수를 자기 돌로 만든다.', es: 'Azul cambia: la fuerte primera piedra pasa a ser azul.', fr: 'Bleu échange : la forte première pierre devient bleue.', pt: 'Azul troca: a forte primeira pedra passa a ser azul.', de: 'Blau tauscht: Der starke erste Stein wird blau.', hi: 'नीला स्वैप करता है: मज़बूत पहली गोटी नीली हो जाती है।', ar: 'يبدّل الأزرق: يصبح الحجر الأول القوي للأزرق.' },
  noswap: { ja: '青はスワップしない（{m}は取る価値が小さい）。', en: 'Blue does not swap ({m} is not worth taking).', zh: '蓝方不交换（{m}不值得拿）。', ko: '파랑은 스왑하지 않는다({m}은 가져올 가치가 작다).', es: 'Azul no cambia ({m} no vale la pena).', fr: 'Bleu n\'échange pas ({m} ne vaut pas la peine).', pt: 'Azul não troca ({m} não vale a pena).', de: 'Blau tauscht nicht ({m} lohnt sich nicht).', hi: 'नीला स्वैप नहीं करता ({m} लेने लायक नहीं)।', ar: 'لا يبدّل الأزرق ({m} لا يستحق الأخذ).' },
  bridge: { ja: '{x}とブリッジ：この2つは切れない。', en: 'A bridge with {x}: the two stones cannot be cut.', zh: '与{x}形成桥：两子无法被切断。', ko: '{x}와 브리지: 두 돌은 끊기지 않는다.', es: 'Un puente con {x}: no se pueden cortar.', fr: 'Un pont avec {x} : impossible à couper.', pt: 'Uma ponte com {x}: não podem ser cortadas.', de: 'Eine Brücke mit {x}: nicht zu trennen.', hi: '{x} के साथ ब्रिज: दोनों गोटियाँ काटी नहीं जा सकतीं।', ar: 'جسر مع {x}: لا يمكن قطع الحجرين.' },
  save: { ja: '割り込みに受ける：ブリッジはつながったまま。', en: 'Answers the intrusion: the bridge stays connected.', zh: '应对插入：桥依然相连。', ko: '끼어들기에 받는다: 브리지는 이어진 채.', es: 'Responde a la intrusión: el puente sigue unido.', fr: 'Répond à l\'intrusion : le pont reste relié.', pt: 'Responde à intrusão: a ponte continua ligada.', de: 'Antwort auf das Eindringen: Die Brücke bleibt verbunden.', hi: 'घुसपैठ का जवाब: ब्रिज जुड़ा रहता है।', ar: 'يردّ على التدخل: يبقى الجسر متصلًا.' },
  intrude: { ja: '相手のブリッジに割り込み、受けさせる。', en: 'Intrudes into the opponent\'s bridge to force an answer.', zh: '插入对方的桥，迫使对方应对。', ko: '상대 브리지에 끼어들어 받게 한다.', es: 'Se mete en el puente rival para forzar respuesta.', fr: 'S\'invite dans le pont adverse pour forcer une réponse.', pt: 'Invade a ponte rival para forçar resposta.', de: 'Dringt in die gegnerische Brücke ein und erzwingt eine Antwort.', hi: 'विरोधी के ब्रिज में घुसकर जवाब मजबूर करता है।', ar: 'يتدخل في جسر الخصم ليفرض الرد.' },
  edge: { ja: '辺のテンプレート：2段目から辺につながっている。', en: 'Edge template: joined to the edge from the 2nd row.', zh: '边模板：从第二行与边相连。', ko: '변 템플릿: 2번째 줄에서 변과 이어짐.', es: 'Plantilla de borde: unida al borde desde la 2.ª fila.', fr: 'Gabarit de bord : relié au bord depuis la 2e rangée.', pt: 'Modelo de borda: ligada à borda pela 2.ª fileira.', de: 'Randschablone: von der 2. Reihe mit dem Rand verbunden.', hi: 'किनारे का टेम्पलेट: दूसरी पंक्ति से किनारे से जुड़ा।', ar: 'قالب الحافة: متصل بالحافة من الصف الثاني.' },
  block: { ja: '{c}の進路を離れてふさぐ。', en: 'Blocks {c}\'s way at a distance.', zh: '在远处挡住{c}的去路。', ko: '{c}의 진로를 떨어져서 막는다.', es: 'Bloquea el camino de {c} a distancia.', fr: 'Bloque à distance la route de {c}.', pt: 'Bloqueia à distância o caminho de {c}.', de: 'Blockiert {c}s Weg mit Abstand.', hi: '{c} का रास्ता दूर से रोकता है।', ar: 'يسدّ طريق {c} من مسافة.' },
  adj: { ja: '{c}の石に直接つけて止める。', en: 'Blocks right next to {c}\'s stone.', zh: '紧贴{c}的棋子阻挡。', ko: '{c}의 돌에 바로 붙여 막는다.', es: 'Bloquea pegado a la piedra de {c}.', fr: 'Bloque au contact de la pierre de {c}.', pt: 'Bloqueia colado à pedra de {c}.', de: 'Blockt direkt an {c}s Stein.', hi: '{c} की गोटी से सटकर रोकता है।', ar: 'يسدّ ملاصقًا لحجر {c}.' },
  center: { ja: '中央を取る。', en: 'Takes the centre.', zh: '占据中央。', ko: '중앙을 차지한다.', es: 'Toma el centro.', fr: 'Prend le centre.', pt: 'Toma o centro.', de: 'Nimmt die Mitte.', hi: 'केंद्र लेता है।', ar: 'يأخذ المركز.' },
  develop: { ja: '自分の辺へ向かって伸ばす。', en: 'Extends towards its edges.', zh: '向自己的边延伸。', ko: '자기 변을 향해 뻗는다.', es: 'Se extiende hacia sus bordes.', fr: 'S\'étend vers ses bords.', pt: 'Avança rumo às suas bordas.', de: 'Dehnt sich zu den eigenen Rändern aus.', hi: 'अपने किनारों की ओर बढ़ता है।', ar: 'يمتد نحو حافتيه.' },
};
const AI = { ja: '（AI: {c} {p}%）', en: ' (AI: {c} {p}%)', zh: '（AI：{c} {p}%）', ko: ' (AI: {c} {p}%)', es: ' (IA: {c} {p} %)', fr: ' (IA : {c} {p} %)', pt: ' (IA: {c} {p}%)', de: ' (KI: {c} {p} %)', hi: ' (AI: {c} {p}%)', ar: ' (الذكاء الاصطناعي: {c} {p}٪)' };
const DIRS = [[-1, 0], [-1, 1], [0, 1], [1, 0], [1, -1], [0, -1]];
function ringOf(pos, c) { const n = pos.n, r0 = Math.floor(c / n), c0 = c % n; return DIRS.map(([dr, dc]) => { const r = r0 + dr, cc = c0 + dc; return r >= 0 && r < n && cc >= 0 && cc < n ? r * n + cc : (r < 0 || r >= n) && cc >= 0 && cc < n ? -1 : (cc < 0 || cc >= n) && r >= 0 && r < n ? -2 : -3; }); }
const ownV = (pos, v, p) => v >= 0 ? pos.at(v) === p : v === -1 ? p === 1 : v === -2 ? p === 2 : false;
function bridgeSave(pos) { const last = pos.last; if (last < 0) return -1; const me = pos.side, R = ringOf(pos, last); for (let k = 0; k < 6; k++) { const y = R[k]; if (y < 0 || pos.at(y)) continue; const a = R[(k + 5) % 6], b = R[(k + 1) % 6]; if (ownV(pos, a, me) && ownV(pos, b, me) && !(a < 0 && b < 0)) return y; } return -1; }
// bridge partners of cell c for player p (stones at bridge distance with both carriers empty)
function bridgeTo(pos, c, p) { const R = ringOf(pos, c); for (let k = 0; k < 6; k++) { const a = R[k], b = R[(k + 1) % 6]; if (a < 0 || b < 0 || pos.at(a) || pos.at(b)) continue; const RA = ringOf(pos, a), x = RA[(k + 1) % 6]; if (x >= 0 && pos.at(x) === p) return x; } return -1; }
function inOppBridge(pos, c, p) { const o = 3 - p, R = ringOf(pos, c); for (let k = 0; k < 6; k++) { const a = R[(k + 5) % 6], b = R[(k + 1) % 6], y = R[k]; if (y >= 0 && !pos.at(y) && ownV(pos, a, o) && ownV(pos, b, o) && !(a < 0 && b < 0)) return true; } return false; }
function classify(pos, m, prev) {
  const p = pos.side, n = pos.n, r = Math.floor(m / n), c = m % n;
  if (m === E.SWAP) return ['swap', {}];
  if (pos.ply === 0) return ['open', { c: cname(p), m: E.nameOf(m, n) }];
  if (pos.ply === 1 && pos.swapOk) return ['noswap', { m: E.nameOf(prev, n) }];
  if (bridgeSave(pos) === m) return ['save', {}];
  if (inOppBridge(pos, m, p)) return ['intrude', {}];
  const two = p === 1 ? (r === 1 || r === n - 2) : (c === 1 || c === n - 2);
  const b = bridgeTo(pos, m, p);
  if (b >= 0) return ['bridge', { x: E.nameOf(b, n) }];
  if (two) return ['edge', {}];
  const last = pos.last;
  if (last >= 0) { const lr = Math.floor(last / n), lc = last % n, d = Math.max(Math.abs(lr - r), Math.abs(lc - c), Math.abs((lr + lc) - (r + c))); if (d === 1) return ['adj', { c: cname(3 - p) }]; if (d <= 3) return ['block', { c: cname(3 - p) }]; }
  const h = (n - 1) / 2; if (Math.abs(r - h) <= 1 && Math.abs(c - h) <= 1) return ['center', {}];
  return ['develop', {}];
}
const MS = { 7: 1500, 9: 2000, 11: 2500, 13: 2500 };
async function evalPos(spec, ms) { await N.setpos(spec); const a = await N.analyze(ms, 0, 1); return a.list[0] ? a.list[0].v : 0; }
async function scored(spec, ms, top) {
  await N.setpos(spec);
  const a = await N.analyze(ms, 0, top || 8), L = [];
  for (const e of a.list) {
    if (e.m === E.SWAP) { const p = E.Pos.from(spec); p.play(E.SWAP); L.push([e.m, -(await evalPos(p.spec(), ms))]); continue; }
    const p = E.Pos.from(spec); p.play(e.m);
    if (p.winner()) { L.push([e.m, 29999]); continue; }
    L.push([e.m, Math.max(-29999, Math.min(29999, -(await evalPos(p.spec(), ms))))]);
  }
  return L.sort((x, y) => y[1] - x[1]);
}
async function line(n, swap, forced, len) {
  const pos = new E.Pos(n, swap), mv = [], notes = [];
  for (let k = 0; k < len; k++) {
    let m = forced[k];
    await N.setup(n, swap, mv);
    if (m === undefined) {
      const b = await N.best(0, MS[n], 0, 3); m = b.m;
      if (forced.noSwap && m === E.SWAP) { const a = await N.analyze(MS[n], 0, 3); m = a.list.find(e => e.m !== E.SWAP).m; }
    }
    const [kind, v] = classify(pos, m, mv[mv.length - 1]);
    const before = pos.clone(); pos.play(m); mv.push(m);
    await N.setup(n, swap, mv);
    const a = await N.analyze(Math.round(MS[n] * .6), 0, 1), vv = a.list[0] ? a.list[0].v : 0, mover = pos.side;   // the side to move's view
    const redP = Math.round((mover === 1 ? (vv + 1000) / 2000 : 1 - (vv + 1000) / 2000) * 100), lead = redP >= 50 ? 1 : 2;
    const txt = T(NOTE[kind], v), ai = T(AI, { c: cname(lead), p: lead === 1 ? redP : 100 - redP });
    const note = {}; for (const l of L10) note[l] = txt[l] + ai[l];
    notes.push(note); void before;
    if (pos.winner()) break;
  }
  return { line: mv, notes };
}
const SETS = [
  // swap rule on, 11×11
  { id: 'center11', grp: 'swap', n: 11, swap: true, first: 'f6', forced: [null, E.SWAP], title: { ja: '中央開局 → スワップ', en: 'Centre opening → swap', zh: '中央开局 → 交换', ko: '중앙 개국 → 스왑', es: 'Apertura central → cambio', fr: 'Ouverture centrale → échange', pt: 'Abertura central → troca', de: 'Mitteneröffnung → Tausch', hi: 'केंद्र ओपनिंग → स्वैप', ar: 'افتتاح المركز ← تبديل' } },
  { id: 'edge11a', grp: 'swap', n: 11, swap: true, pick: 'edge', noSwap: true },
  { id: 'edge11b', grp: 'swap', n: 11, swap: true, pick: 'edge2', noSwap: true },
  { id: 'ring11', grp: 'swap', n: 11, swap: true, pick: 'ring', noSwap: true },
  // swap off: the centre and Blue's best answers
  { id: 'f6r1', grp: 'noswap', n: 11, swap: false, first: 'f6', reply: 0 },
  { id: 'f6r2', grp: 'noswap', n: 11, swap: false, first: 'f6', reply: 1 },
  { id: 'f6r3', grp: 'noswap', n: 11, swap: false, first: 'f6', reply: 2 },
  // small boards
  { id: 'c7', grp: 'small', n: 7, swap: false, first: 'd4' },
  { id: 'c9', grp: 'small', n: 9, swap: false, first: 'e5' },
  { id: 'e9', grp: 'small', n: 9, swap: true, pick: 'edge', noSwap: true },
];
const TITLE = {
  open: { ja: '{m}開局', en: '{m} opening', zh: '{m}开局', ko: '{m} 개국', es: 'Apertura {m}', fr: 'Ouverture {m}', pt: 'Abertura {m}', de: '{m}-Eröffnung', hi: '{m} ओपनिंग', ar: 'افتتاح {m}' },
  reply: { ja: '{m}開局・{r}の受け', en: '{m} opening, the {r} reply', zh: '{m}开局·{r}应对', ko: '{m} 개국·{r} 응수', es: 'Apertura {m}: respuesta {r}', fr: 'Ouverture {m} : réponse {r}', pt: 'Abertura {m}: resposta {r}', de: '{m}-Eröffnung: Antwort {r}', hi: '{m} ओपनिंग: {r} जवाब', ar: 'افتتاح {m}: الرد {r}' },
};
(async () => {
  // ONLY=id1,id2 regenerates just those sets and merges them into the existing output file
  const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const old = ONLY && fs.existsSync(outF) ? JSON.parse(fs.readFileSync(outF, 'utf8')).sets : [];
  const sets = [], AN = {};
  for (const S of SETS) {
    if (ONLY && !ONLY.includes(S.id)) { const o = old.find(x => x.id === S.id); if (o) sets.push(o); continue; }
    const n = S.n, F = FM[n].wr;
    let first = S.first ? E.parse(new E.Pos(n, false), S.first) : null;
    if (!first && S.pick) {
      const cand = [];
      for (let i = 0; i < n * n; i++) { const r = Math.floor(i / n), c = i % n, ring = Math.min(r, c, n - 1 - r, n - 1 - c); if ((S.pick === 'ring' ? ring === 1 : ring === 0) && i <= n * n - 1 - i) cand.push([Math.abs(F[i] - 500), i]); }
      cand.sort((a, b) => a[0] - b[0]);
      first = cand[S.pick === 'edge2' ? 2 : 0][1];
    }
    const forced = [first]; if (S.forced) S.forced.forEach((m, k) => { if (m !== null) forced[k] = m; });
    if (S.noSwap) forced.noSwap = true;
    let replyName = '';
    if (S.reply !== undefined) {
      const key = n + ':' + first; // one analysis shared by every reply set of this first move, so the replies differ
      if (!AN[key]) { await N.setup(n, false, [first]); AN[key] = await N.analyze(12000, 0, 6); }
      forced[1] = AN[key].list[S.reply].m; replyName = E.nameOf(forced[1], n);
    }
    const L = await line(n, S.swap, forced, n <= 7 ? 12 : 14);
    const fn = E.nameOf(first, n);
    const title = S.title || T(S.reply !== undefined ? TITLE.reply : TITLE.open, { m: fn, r: replyName });
    // practice: positions of the line (the side to move finds the move), each candidate scored
    const problems = [];
    const pos = new E.Pos(n, S.swap);
    for (let k = 0; k < L.line.length; k++) {
      if (k >= 1 && problems.length < 7 && (k <= 10)) {
        const spec = pos.spec(); if (pos.swapOk) spec.sw = 1;
        const sc = await scored(spec, Math.round(MS[n] * .5), 8);
        if (sc.length >= 3 && sc[0][1] - sc[sc.length - 1][1] > 30) problems.push({ s: spec, best: sc[0][0], sc });
      }
      pos.play(L.line[k]);
    }
    sets.push({ id: S.id, grp: S.grp, n, swap: S.swap, side: 1, show: 2, moves: L.line.slice(0, 3).map(m => m === E.SWAP ? 'swap' : E.nameOf(m, n)).join(' '), title, study: L, problems, first: fn, wr: F[first] });
    console.error('set', S.id, fn, L.line.length, 'problems', problems.length);
  }
  const first = {}; for (const k in FM) first[k] = { wr: FM[k].wr, ms: FM[k].ms };
  fs.writeFileSync(outF, JSON.stringify({ version: 1, first, sets }));
  N.close();
})();
