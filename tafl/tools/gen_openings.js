// Builds tafl/openings.json: opening plans for the attackers and the defenders (Copenhagen rules), chosen and extended by the engine.
// For each plan: the line (first moves = the plan, then the engine's choices), a comment per move (from the move's features and
// the engine's evaluation, 10 languages), and practice problems (positions on the way with the engine's values of every move).
// node tools/gen_openings.js [msPerPosition]
const fs = require('fs'), path = require('path');
const E = require('../engine.js');
const X = new WebAssembly.Instance(new WebAssembly.Module(fs.readFileSync(path.join(__dirname, '..', 'engine.wasm'))), { env: { now: () => Date.now(), progress: () => {} } }).exports;
const io = () => new Int32Array(X.memory.buffer, X.io_ptr(), 8192);
const MS = +process.argv[2] || 2500, V = 'copenhagen', n = 11;
function setup(moves) { const p = E.Pos.from(null, V), a = [0, 0]; for (const x of p.b) a.push(x); a.push(moves.length); for (const m of moves) a.push(E.mFrom(m) | (E.mTo(m) << 8)); io().set(a); return X.setup(); }
function analyze(moves, ms) { setup(moves); X.analyze(ms, 30); const r = io(), out = []; for (let i = 0; i < r[0]; i++) { const x = r[2 + 2 * i]; out.push([(x & 255) + 256 * ((x >> 8) & 255), r[3 + 2 * i]]); } return out.sort((a, b) => b[1] - a[1]); }
// the 8 symmetries of the square board
const TR = [(r, c) => [r, c], (r, c) => [c, n - 1 - r], (r, c) => [n - 1 - r, n - 1 - c], (r, c) => [n - 1 - c, r], (r, c) => [r, n - 1 - c], (r, c) => [n - 1 - r, c], (r, c) => [c, r], (r, c) => [n - 1 - c, n - 1 - r]];
const tsq = (k, i) => { const [r, c] = TR[k](Math.floor(i / n), i % n); return r * n + c; };
const canon = m => Math.min(...TR.map((_, k) => tsq(k, E.mFrom(m)) + 256 * tsq(k, E.mTo(m))));
const block = new Set([2, 12, 22, 8, 20, 32, 88, 100, 112, 98, 108, 118]);
const L10 = (ja, en, zh, ko, es, fr, pt, de, hi, ar) => ({ ja, en, zh, ko, es, fr, pt, de, hi, ar });
const evalWord = v => v > 250 ? L10('攻め手有利', 'attackers better', '攻方占优', '공격 측 우세', 'ventaja atacantes', 'avantage attaquants', 'vantagem atacantes', 'Angreifer besser', 'आक्रमणकारी बेहतर', 'أفضلية المهاجمين')
  : v > 90 ? L10('攻め手やや有利', 'attackers slightly better', '攻方稍优', '공격 측 약간 우세', 'atacantes algo mejor', 'attaquants un peu mieux', 'atacantes um pouco melhor', 'Angreifer etwas besser', 'आक्रमणकारी थोड़े बेहतर', 'المهاجمون أفضل قليلاً')
  : v < -250 ? L10('守り手有利', 'defenders better', '守方占优', '수비 측 우세', 'ventaja defensores', 'avantage défenseurs', 'vantagem defensores', 'Verteidiger besser', 'रक्षक बेहतर', 'أفضلية المدافعين')
  : v < -90 ? L10('守り手やや有利', 'defenders slightly better', '守方稍优', '수비 측 약간 우세', 'defensores algo mejor', 'défenseurs un peu mieux', 'defensores um pouco melhor', 'Verteidiger etwas besser', 'रक्षक थोड़े बेहतर', 'المدافعون أفضل قليلاً')
  : L10('互角', 'level', '均势', '호각', 'igualado', 'équilibré', 'equilibrado', 'ausgeglichen', 'बराबर', 'متكافئ');
// a comment from the move's features
function noteOf(pos, m) {
  const p = pos, f = E.mFrom(m), t = E.mTo(m), caps = p.capsOf(m).length, q = p.clone().play(m), att = p.turn === 1;
  if (caps) return L10('駒を取る。', 'A capture.', '吃子。', '잡기.', 'Una captura.', 'Une prise.', 'Uma captura.', 'Ein Schlagen.', 'एक मोहरा पकड़ा।', 'أسر قطعة.');
  if (att && block.has(t)) return L10('角のまわりを固める（王の通り道をふさぐ）。', 'Guards a corner (shuts a path of the king).', '加固角落（封住王的通路）。', '모서리를 굳힌다(왕의 길을 막는다).', 'Guarda una esquina (cierra un camino del rey).', 'Garde un coin (ferme un chemin du roi).', 'Guarda um canto (fecha um caminho do rei).', 'Sichert eine Ecke (sperrt einen Weg des Königs).', 'एक कोने की रक्षा (राजा का रास्ता बंद)।', 'يحرس زاوية (يغلق طريقاً للملك).');
  if (!att && p.at(f) === 3) return L10('王が動いて、逃げ道を探る。', 'The king moves out, looking for a path.', '王出动，寻找通路。', '왕이 움직여 길을 찾는다.', 'El rey sale en busca de un camino.', 'Le roi sort et cherche un chemin.', 'O rei sai em busca de um caminho.', 'Der König zieht los und sucht einen Weg.', 'राजा रास्ता ढूँढने निकलता है।', 'يتحرك الملك باحثاً عن طريق.');
  const nb = [t - n, t + n, t - 1, t + 1].filter(x => x >= 0 && x < n * n && Math.abs(x % n - t % n) <= 1);
  if (nb.some(x => q.at(x) && (q.at(x) === 1) !== att)) return L10('相手の駒に接して、はさむ狙いを作る。', 'Touches an enemy piece, preparing a capture.', '贴近对方棋子，准备夹吃。', '상대 말에 붙어 잡을 준비를 한다.', 'Toca una pieza rival y prepara una captura.', 'Touche une pièce adverse et prépare une prise.', 'Encosta numa peça rival e prepara uma captura.', 'Berührt eine gegnerische Figur und bereitet ein Schlagen vor.', 'विरोधी मोहरे से सटकर पकड़ने की तैयारी।', 'يلامس قطعة للخصم ويحضّر لأسرها.');
  if (!att && (E.geo(V).F[t] & 1)) return L10('守り手が端へ出て、攻め手の輪を外から乱す。', 'A defender goes to the edge and disturbs the ring from outside.', '守方棋子走到边上，从外侧扰乱包围圈。', '수비 말이 가장자리로 나가 포위를 밖에서 흔든다.', 'Un defensor sale al borde y desordena el cerco desde fuera.', 'Un défenseur gagne le bord et dérange l’anneau de l’extérieur.', 'Um defensor vai à borda e desorganiza o cerco por fora.', 'Ein Verteidiger geht an den Rand und stört den Ring von außen.', 'एक रक्षक किनारे पर जाकर घेरा बाहर से बिगाड़ता है।', 'يخرج مدافع إلى الحافة ويربك الطوق من الخارج.');
  if (!att) return L10('守り手が外へ展開して、王の道を広げる。', 'A defender develops outwards, widening the king’s lanes.', '守方向外展开，拓宽王的通路。', '수비 말이 밖으로 전개해 왕의 길을 넓힌다.', 'Un defensor se despliega y abre calles al rey.', 'Un défenseur se déploie et élargit les couloirs du roi.', 'Um defensor se desenvolve e abre caminhos ao rei.', 'Ein Verteidiger entwickelt sich nach außen und öffnet dem König Wege.', 'एक रक्षक बाहर फैलकर राजा के रास्ते चौड़े करता है।', 'ينتشر مدافع للخارج ويوسع ممرات الملك.');
  return L10('攻め手が輪を詰めて、守り手の出口を狭める。', 'The attackers tighten the ring and narrow the exits.', '攻方收紧包围，缩小出口。', '공격 측이 포위를 좁혀 출구를 줄인다.', 'Los atacantes cierran el cerco y estrechan las salidas.', 'Les attaquants resserrent l’anneau et rétrécissent les sorties.', 'Os atacantes apertam o cerco e estreitam as saídas.', 'Die Angreifer ziehen den Ring zu und verengen die Ausgänge.', 'आक्रमणकारी घेरा कसकर निकास संकरे करते हैं।', 'يضيّق المهاجمون الطوق ويقلّصون المخارج.');
}
const ATT_DESC = [
  L10('攻め手は初手から四隅のまわりを固め、王の通り道を先にふさぎます。', 'The attackers guard the corners from the first move, shutting the king\u2019s paths in advance.', '攻方从第一手起就加固四角，提前封住王的通路。', '공격 측은 첫 수부터 네 모서리를 굳혀 왕의 길을 미리 막습니다.', 'Los atacantes guardan las esquinas desde el primer movimiento y cierran antes los caminos del rey.', 'Les attaquants gardent les coins dès le premier coup et ferment d\u2019avance les chemins du roi.', 'Os atacantes guardam os cantos desde o primeiro lance e fecham antes os caminhos do rei.', 'Die Angreifer sichern vom ersten Zug an die Ecken und sperren die Wege des Königs im Voraus.', 'आक्रमणकारी पहली चाल से ही कोनों की रक्षा कर राजा के रास्ते पहले ही बंद करते हैं।', 'يحرس المهاجمون الزوايا منذ النقلة الأولى ويغلقون طرق الملك مسبقاً.'),
  L10('辺の中央の駒を横へ広げ、輪の形を早く作ります。', 'A piece from the middle of a side spreads sideways to build the ring early.', '把边中央的棋子横向展开，尽早形成包围圈。', '변 가운데 말을 옆으로 펼쳐 포위 모양을 일찍 만듭니다.', 'Una pieza del centro de un lado se abre de lado para formar pronto el cerco.', 'Une pièce du milieu d\u2019un côté s\u2019écarte pour former tôt l\u2019anneau.', 'Uma peça do meio de um lado abre-se de lado para formar cedo o cerco.', 'Eine Figur aus der Seitenmitte weicht seitlich aus und baut früh den Ring.', 'किनारे के बीच का मोहरा बगल में फैलकर जल्दी घेरा बनाता है।', 'تنتشر قطعة من وسط الجانب جانبياً لتبني الطوق مبكراً.'),
  L10('辺に沿って駒を動かし、守り手の出口を外側から押さえます。', 'Pieces slide along the edge and hold the defenders\u2019 exits from outside.', '沿边移动棋子，从外侧压住守方的出口。', '변을 따라 말을 움직여 수비 측 출구를 밖에서 누릅니다.', 'Las piezas se deslizan por el borde y vigilan desde fuera las salidas de los defensores.', 'Les pièces glissent le long du bord et tiennent de l\u2019extérieur les sorties des défenseurs.', 'As peças deslizam pela borda e seguram por fora as saídas dos defensores.', 'Figuren gleiten am Rand entlang und halten die Ausgänge der Verteidiger von außen.', 'मोहरे किनारे के साथ चलकर रक्षकों के निकास बाहर से रोकते हैं।', 'تنزلق القطع على الحافة وتمسك مخارج المدافعين من الخارج.'),
  L10('駒を斜めにつなげて壁を作り、王の進路を少しずつ狭めます。', 'Pieces link up diagonally into a wall that slowly narrows the king\u2019s way.', '把棋子斜向连成墙，逐步缩小王的去路。', '말을 대각선으로 이어 벽을 만들고 왕의 진로를 조금씩 좁힙니다.', 'Las piezas se unen en diagonal formando un muro que estrecha poco a poco el paso del rey.', 'Les pièces se relient en diagonale en un mur qui resserre peu à peu le passage du roi.', 'As peças ligam-se na diagonal num muro que estreita aos poucos o caminho do rei.', 'Figuren verbinden sich diagonal zu einer Mauer, die den Weg des Königs langsam verengt.', 'मोहरे तिरछे जुड़कर दीवार बनाते हैं जो राजा का रास्ता धीरे-धीरे संकरा करती है।', 'تتصل القطع قطرياً في جدار يضيّق طريق الملك شيئاً فشيئاً.'),
];
const DEF_DESC = [
  L10('守り手は早めに王のまわりを空け、王自身を外へ走らせます。', 'The defenders clear the king\u2019s surroundings early and send the king itself out.', '守方尽早让出王的周围，让王亲自向外出击。', '수비 측은 일찍 왕 주변을 비워 왕이 직접 밖으로 달리게 합니다.', 'Los defensores despejan pronto el entorno del rey y lo lanzan hacia fuera.', 'Les défenseurs dégagent tôt les abords du roi et le lancent vers l\u2019extérieur.', 'Os defensores liberam cedo o entorno do rei e lançam-no para fora.', 'Die Verteidiger machen früh Platz um den König und schicken ihn selbst hinaus.', 'रक्षक जल्दी राजा के आसपास जगह बनाकर उसे बाहर भेजते हैं।', 'يفسح المدافعون محيط الملك مبكراً ويطلقونه للخارج.'),
  L10('攻め手の輪の薄い側面を突き、すき間を作ります。', 'The defenders strike at a thin flank of the ring to open a gap.', '冲击包围圈薄弱的侧翼，制造缺口。', '포위의 얇은 측면을 찔러 틈을 만듭니다.', 'Los defensores golpean un flanco débil del cerco para abrir un hueco.', 'Les défenseurs frappent un flanc mince de l\u2019anneau pour ouvrir une brèche.', 'Os defensores atacam um flanco fino do cerco para abrir uma brecha.', 'Die Verteidiger greifen eine dünne Flanke des Rings an und öffnen eine Lücke.', 'रक्षक घेरे की कमज़ोर बगल पर वार कर दरार बनाते हैं।', 'يضرب المدافعون جناحاً رقيقاً من الطوق لفتح ثغرة.'),
  L10('駒を外へ出して盤を広く使い、攻め手を分散させます。', 'Pieces go outwards to use the whole board and spread the attackers thin.', '把棋子派往外侧，充分利用棋盘，分散攻方。', '말을 밖으로 내보내 판을 넓게 쓰고 공격 측을 분산시킵니다.', 'Las piezas salen para usar todo el tablero y dispersar a los atacantes.', 'Les pièces sortent pour utiliser tout le plateau et disperser les attaquants.', 'As peças saem para usar todo o tabuleiro e dispersar os atacantes.', 'Figuren ziehen nach außen, nutzen das ganze Brett und zerstreuen die Angreifer.', 'मोहरे बाहर जाकर पूरे बोर्ड का उपयोग करते हैं और आक्रमणकारियों को बिखेरते हैं।', 'تخرج القطع لاستخدام الرقعة كلها وتشتيت المهاجمين.'),
  L10('角の近くへ駒を送り、攻め手の角固めを先に崩します。', 'Pieces head for a corner to break the attackers\u2019 corner guard before it is built.', '把棋子送到角落附近，抢先破坏攻方的守角。', '모서리 근처로 말을 보내 공격 측의 모서리 굳히기를 먼저 무너뜨립니다.', 'Las piezas van hacia una esquina para romper la guardia antes de que se forme.', 'Les pièces filent vers un coin pour briser la garde avant qu\u2019elle se forme.', 'As peças vão a um canto para quebrar a guarda antes que se forme.', 'Figuren eilen zu einer Ecke, um die Eckwache zu brechen, bevor sie steht.', 'मोहरे कोने की ओर जाकर रक्षा-घेरा बनने से पहले तोड़ते हैं।', 'تتجه القطع نحو زاوية لكسر حراستها قبل أن تكتمل.'),
];
const introOf = (d, nt) => { const o = {}; for (const k in d) o[k] = [d[k], nt[k]]; return o; };
const join = (a, b) => { const o = {}; for (const k in a) o[k] = a[k] + ' (AI: ' + b[k] + ')'; return o; };
function extend(line, plies) {
  const out = line.slice();
  while (out.length < plies) { const L = analyze(out, MS); if (!L.length) break; out.push(L[0][0]); const { pos } = E.replay(null, out, V); if (pos.res) break; }
  return out;
}
function problems(line, extraFrom) {
  const probs = [];
  for (let i = extraFrom; i < line.length && probs.length < 8; i++) {
    const pre = line.slice(0, i), sc = analyze(pre, MS); if (sc.length < 2) continue;
    if (Math.abs(sc[0][1]) > 2000 || sc[0][1] - sc[1][1] < 8) continue;   // a clear best move only
    const { pos } = E.replay(null, pre, V);
    probs.push({ s: pos.spec(), sc, best: sc[0][0] });
  }
  return probs;
}
const name = (pos, m) => E.name(pos, m);
const sets = [];
console.error('analysing the first moves…');
const first = analyze([], MS * 3);
// attackers: the best first moves, one per symmetry class and kind
const seen = new Set(), att = [];
for (const [m, v] of first) { const c = canon(m); if (seen.has(c)) continue; seen.add(c); att.push([m, v]); if (att.length >= 6) break; }
const ATT_TITLES = [
  L10('角固め', 'Corner guard', '守角', '모서리 굳히기', 'Guardia de esquina', 'Garde du coin', 'Guarda do canto', 'Eckwache', 'कोना रक्षा', 'حراسة الزاوية'),
  L10('翼の展開', 'Wing spread', '展翼', '날개 펼치기', 'Despliegue de ala', 'Déploiement d’aile', 'Abertura de ala', 'Flügelentfaltung', 'पंख फैलाव', 'نشر الجناح'),
  L10('辺の締めつけ', 'Edge squeeze', '边线压迫', '변 조이기', 'Presión del borde', 'Étau du bord', 'Aperto da borda', 'Randdruck', 'किनारे का दबाव', 'ضغط الحافة'),
  L10('斜めの壁', 'Diagonal wall', '斜墙', '대각선 벽', 'Muro diagonal', 'Mur diagonal', 'Muro diagonal', 'Diagonale Mauer', 'तिरछी दीवार', 'الجدار القطري'),
];
const kindOf = m => block.has(E.mTo(m)) ? 0 : [4, 5, 6, 44, 55, 66, 54, 64].includes(E.mFrom(m)) ? 1 : (E.geo(V).F[E.mTo(m)] & 1) ? 2 : 3;
const usedKind = new Set();
for (const [m, v] of att) {
  if (sets.filter(s => s.grp === 'att').length >= 4) break;
  let k = kindOf(m); if (usedKind.has(k)) k = [0, 1, 2, 3].find(x => !usedKind.has(x)); usedKind.add(k);
  console.error('attackers plan', E.name(E.Pos.from(null, V), m), v);
  const line = extend([m], 14), { pos: p0 } = E.replay(null, [], V);
  const notes = line.map((mm, i) => { const { pos } = E.replay(null, line.slice(0, i), V); const L = analyze(line.slice(0, i + 1), 600); const vv = L.length ? (i % 2 === 0 ? -L[0][1] : L[0][1]) : 0; return join(noteOf(pos, mm), evalWord(vv)); });
  const t = ATT_TITLES[k];
  sets.push({ id: 'a' + (sets.length + 1), grp: 'att', side: 1, show: 3, moves: name(p0, m), title: t, short: L10(`初手 ${name(p0, m)} から`, `Starting with ${name(p0, m)}`, `首着 ${name(p0, m)}`, `첫 수 ${name(p0, m)}`, `Empieza con ${name(p0, m)}`, `Commence par ${name(p0, m)}`, `Começa com ${name(p0, m)}`, `Beginnt mit ${name(p0, m)}`, `${name(p0, m)} से शुरुआत`, `يبدأ بـ ${name(p0, m)}`),
    intro: introOf(ATT_DESC[k], notes[0]), study: { line, notes }, problems: problems(line, 1) });
}
// defenders: answers to the attackers' best first move
const m1 = first[0][0], { pos: p1 } = E.replay(null, [m1], V), second = analyze([m1], MS * 3);
const DEF_TITLES = [
  L10('王の早出', 'Early king', '王早出', '왕의 조기 출격', 'Rey temprano', 'Roi précoce', 'Rei precoce', 'Früher König', 'जल्दी राजा', 'الملك المبكر'),
  L10('側面の突破', 'Flank break', '侧翼突破', '측면 돌파', 'Ruptura por el flanco', 'Percée sur l’aile', 'Ruptura pelo flanco', 'Flankendurchbruch', 'बगल से तोड़', 'اختراق الجناح'),
  L10('外への展開', 'Outward development', '向外展开', '바깥 전개', 'Desarrollo hacia fuera', 'Développement vers l’extérieur', 'Desenvolvimento para fora', 'Entwicklung nach außen', 'बाहर की ओर विकास', 'الانتشار للخارج'),
  L10('角への圧力', 'Corner pressure', '施压角落', '모서리 압박', 'Presión a la esquina', 'Pression sur le coin', 'Pressão no canto', 'Eckdruck', 'कोने पर दबाव', 'الضغط على الزاوية'),
];
const seen2 = new Set();
let di = 0;
for (const [m, v] of second) {
  if (di >= 4) break;
  const key = E.mFrom(m) + ':' + Math.floor(E.mTo(m) / 3); if (seen2.has(key)) continue; seen2.add(key);
  console.error('defenders plan', E.name(p1, m), v);
  const line = extend([m1, m], 14);
  const notes = line.map((mm, i) => { const { pos } = E.replay(null, line.slice(0, i), V); const L = analyze(line.slice(0, i + 1), 600); const vv = L.length ? L[0][1] * (i % 2 === 0 ? -1 : 1) : 0; return join(noteOf(pos, mm), evalWord(vv)); });
  const t = DEF_TITLES[di], dd = DEF_DESC[di]; di++;
  sets.push({ id: 'd' + di, grp: 'def', side: 2, show: 4, moves: `${name(E.Pos.from(null, V), m1)} ${name(p1, m)}`, title: t, short: L10(`${name(p1, m)} で応じる`, `Answering with ${name(p1, m)}`, `以 ${name(p1, m)} 应对`, `${name(p1, m)}로 응수`, `Responde con ${name(p1, m)}`, `Répond par ${name(p1, m)}`, `Responde com ${name(p1, m)}`, `Antwort ${name(p1, m)}`, `${name(p1, m)} से जवाब`, `الرد بـ ${name(p1, m)}`),
    intro: introOf(dd, notes[1]), study: { line, notes }, problems: problems(line, 2) });
}
fs.writeFileSync(path.join(__dirname, '..', 'openings.json'), JSON.stringify({ version: 1, sets }));
console.error('openings.json:', sets.length, 'sets,', sets.reduce((a, s) => a + s.problems.length, 0), 'practice problems');
