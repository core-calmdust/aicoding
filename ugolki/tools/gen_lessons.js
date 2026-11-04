// Builds lessons.json for Ugolki (classic 3x3). Every problem's answer set is computed from the rules / the engine:
//   ok   = the full set of correct moves for the lesson's goal (any of them scores 20)
//   sc   = engine values of all moves (partial points, like the checkers lessons)
// Positions come from AI self-play games (seeded). Warm-up ramps (step.ramp, not scored) for the harder concepts.
// node tools/gen_lessons.js > lessons.json
const E = require('../engine.js'); E.setRule('c33');
const L10 = (ja, en, zh, ko, es, fr, pt, de, hi, ar) => ({ ja, en, zh, ko, es, fr, pt, de, hi, ar });
let seed = 2026; const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const sqIdx = nm => (8 - +nm[1]) * 8 + 'abcdefgh'.indexOf(nm[0]);
const spec = (w, b, side, n) => { const a = Array(64).fill('.'); for (const x of w) a[sqIdx(x)] = 'w'; for (const x of b) a[sqIdx(x)] = 'b'; const s = { b: a.join(''), side: side || 1 }; if (n) s.n = n; return s; };
const gainOf = (pos, m) => { const D = E.DIST()[pos.turn]; return D[E.mFrom(m)] - D[E.mTo(m)]; };
const real = pos => pos.moves().filter(m => m !== E.PASS);
// best gain the side p could make next (opponent frozen)
function bestGain(pos, p) { const q = pos.clone(); if (q.turn !== p) { q.side ^= 1; } let g = -99; for (const m of real(q)) g = Math.max(g, gainOf(q, m)); return g; }
// ---------------------------------------------------------------- positions from self-play
const POS = [];
for (let g = 0; g < 70; g++) {
  const mv = [], lv = [5 + Math.floor(rand() * 12), 5 + Math.floor(rand() * 12)];
  for (let i = 0; i < 260; i++) {
    const { pos, hashes } = E.replay(null, mv);
    if (E.judge(pos, hashes).over) break;
    POS.push(pos.clone());
    const r = E.think(null, mv, lv[pos.side], rand); if (r.move == null || r.move < 0) break;
    mv.push(r.move);
  }
}
for (let i = POS.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [POS[i], POS[j]] = [POS[j], POS[i]]; }
console.error('positions', POS.length);
const used = new Set();
function pick(test, n, opts) {
  const out = [];
  for (const p of POS) {
    if (out.length >= n) break;
    if (opts && opts.white && p.side) continue;
    const k = p.spec().b + p.side; if (used.has(k)) continue;
    const r = test(p); if (!r) continue;
    used.add(k); const s = p.spec(); out.push(Object.assign({ s }, r));
  }
  if (out.length < n) console.error('only', out.length, 'for', (opts && opts.id) || '?');
  return out;
}
const okOf = (L, best) => ({ ok: L, best: best !== undefined ? best : L[0] });
// ---------------------------------------------------------------- lesson problems
const steps = [];
const add = (id, course, problems, ramp) => { const st = { id, course, problems }; if (ramp) st.ramp = ramp; steps.push(st); console.error(id, problems.length); };
// 1 a step towards the far corner (no jump gains anything here)
add('b_step', 'basics', pick(p => {
  const L = real(p); if (L.some(m => E.isJump(p, m) && gainOf(p, m) > 0)) return null;
  const ok = L.filter(m => !E.isJump(p, m) && gainOf(p, m) > 0); if (!ok.length || ok.length === L.length) return null;
  if (p.ply > 40) return null;
  return okOf(ok);
}, 5, { white: true, id: 'b_step' }));
// 2 a jump forward
add('b_jump', 'basics', pick(p => {
  const L = real(p), ok = L.filter(m => E.isJump(p, m) && gainOf(p, m) >= 2); if (!ok.length || ok.length > 4) return null;
  if (L.filter(m => !E.isJump(p, m)).length < 4) return null;
  return okOf(ok);
}, 5, { white: true, id: 'b_jump' }));
// 3 the longest chain of jumps (several hops)
add('b_chain', 'basics', pick(p => {
  const L = real(p); let g = -99; for (const m of L) g = Math.max(g, gainOf(p, m)); if (g < 4) return null;
  const ok = L.filter(m => gainOf(p, m) === g); if (ok.length > 2 || !ok.every(m => E.path(p, m).length >= 4)) return null;
  return okOf(ok);
}, 5, { white: true, id: 'b_chain' }));
// 4 bring a piece into the house
add('b_enter', 'basics', pick(p => {
  const T = E.target(p.turn), L = real(p), ok = L.filter(m => !T[E.mFrom(m)] && T[E.mTo(m)]);
  if (!ok.length || ok.length > 3 || p.inTarget(p.turn) < 2) return null;
  return okOf(ok);
}, 5, { white: true, id: 'b_enter' }));
// 5 finish: the move that completes the house
add('b_finish', 'basics', pick(p => {
  if (p.inTarget(p.turn) !== 8) return null;
  const L = real(p), ok = L.filter(m => p.clone().play(m).done(p.turn)); if (!ok.length || ok.length === L.length) return null;
  return okOf(ok);
}, 5, { white: true, id: 'b_finish' }));
// 6 the farthest move (a plan: look at every piece)
add('s_far', 'strategy', pick(p => {
  const L = real(p); if (L.length < 12) return null;
  let g = -99; for (const m of L) g = Math.max(g, gainOf(p, m)); if (g < 3) return null;
  const ok = L.filter(m => gainOf(p, m) === g); if (ok.length > 2) return null;
  // the farthest move is not the first piece one would look at: its piece is not the most advanced
  return okOf(ok);
}, 5, { white: true, id: 's_far' }));
// 7 build a road: the step that gives your pieces the longest jump next move (Black frozen)
function roadScore(p, m) { const q = p.clone().play(m); q.side ^= 1; let g = -99; for (const x of real(q)) g = Math.max(g, gainOf(q, x)); return g; }
add('s_road', 'strategy', pick(p => {
  const L = real(p).filter(m => !E.isJump(p, m) && gainOf(p, m) >= 0); if (L.length < 5) return null;
  if (bestGain(p, p.turn) >= 3) return null;
  const sc = L.map(m => [m, roadScore(p, m)]), top = Math.max(...sc.map(x => x[1]));
  const ok = sc.filter(x => x[1] === top).map(x => x[0]), second = Math.max(-99, ...sc.filter(x => x[1] < top).map(x => x[1]));
  if (top < 4 || ok.length > 2 || top - second < 2) return null;
  return okOf(ok);
}, 5, { white: true, id: 's_road' }), [
  { k: 'explain', s: spec(['c3', 'd2', 'e4', 'a1', 'b1', 'a2', 'b2', 'a3', 'b3'], ['f6', 'g6', 'h6', 'f7', 'g7', 'h7', 'f8', 'g8', 'h8']), seq: ['d2-d3'], marks: [[sqIdx('e3') + 1, 'ok'], [sqIdx('e5') + 1, 'ok']],
    t: L10('道（はしご）を作る', 'Build a road (a ladder)', '搭一条“路”（梯子）', '길(사다리) 만들기', 'Construir un camino (escalera)', 'Construire une route (échelle)', 'Construir um caminho (escada)', 'Eine Straße (Leiter) bauen', 'रास्ता (सीढ़ी) बनाना', 'بناء طريق (سلّم)'),
    body: L10('<p><b>d2-d3</b>と1歩出すと、c3の駒が<b>d3→e4</b>を跳び台にして、次の手でe3、さらにe5まで跳べるようになります。</p><p>駒が1マスおきに並んだ列が「道」。自分で道を作ってから、後ろの駒で一気に跳ぶのが速い進み方です。</p>',
      '<p>Stepping <b>d2-d3</b> lets the piece on c3 use <b>d3 and e4</b> as stepping stones: next move it hops to e3 and on to e5.</p><p>Pieces standing one square apart form a road. Build a road first, then let the pieces behind fly along it.</p>',
      '<p>走 <b>d2-d3</b> 之后，c3 的子可以借 <b>d3 和 e4</b> 跳，下一步跳到 e3 再到 e5。</p><p>隔一格排开的子就是“路”。先搭路，再让后面的子一口气跳过去。</p>',
      '<p><b>d2-d3</b>로 한 걸음 나가면 c3의 말이 <b>d3와 e4</b>를 발판으로 다음 수에 e3, 다시 e5까지 뛸 수 있습니다.</p><p>한 칸 간격으로 선 말의 줄이 “길”. 길을 먼저 만들고 뒤의 말로 단숨에 뛰는 것이 빠른 진행입니다.</p>',
      '<p>Con <b>d2-d3</b>, la pieza de c3 usa <b>d3 y e4</b> como trampolines: en la siguiente salta a e3 y luego a e5.</p><p>Las piezas separadas por una casilla forman un camino. Constrúyelo y deja volar a las de atrás.</p>',
      '<p>Avec <b>d2-d3</b>, la pièce de c3 se sert de <b>d3 et e4</b> comme tremplins : au coup suivant elle saute en e3 puis en e5.</p><p>Des pièces espacées d’une case forment une route. Construisez-la, puis faites sauter celles de derrière.</p>',
      '<p>Com <b>d2-d3</b>, a peça de c3 usa <b>d3 e e4</b> como trampolins: no lance seguinte salta para e3 e depois e5.</p><p>Peças separadas por uma casa formam um caminho. Construa-o e deixe as de trás saltarem.</p>',
      '<p>Mit <b>d2-d3</b> nutzt der Stein auf c3 <b>d3 und e4</b> als Sprungbretter: im nächsten Zug springt er nach e3 und weiter nach e5.</p><p>Steine mit je einem Feld Abstand bilden eine Straße. Erst bauen, dann springen.</p>',
      '<p><b>d2-d3</b> चलने पर c3 की गोटी <b>d3 और e4</b> को सीढ़ी बनाकर अगली चाल में e3 और फिर e5 तक कूद सकती है।</p><p>एक-एक खाने के अंतर पर खड़ी गोटियाँ “रास्ता” हैं। पहले रास्ता बनाओ, फिर पीछे की गोटी से लंबी छलांग।</p>',
      '<p>بالنقلة <b>d2-d3</b> تستعمل قطعة c3 المربعين <b>d3 وe4</b> نقطتي ارتكاز: في النقلة التالية تقفز إلى e3 ثم e5.</p><p>القطع التي يفصل بينها مربع تشكّل طريقًا. ابنِه أولًا ثم اقفز بالقطع الخلفية.</p>') },
  { k: 'try', s: spec(['b3', 'c2', 'c4', 'a1', 'b1', 'a2', 'b2', 'a3', 'c1'], ['f6', 'g6', 'h6', 'f7', 'g7', 'h7', 'f8', 'g8', 'h8']), ok: null, look: [sqIdx('c3') + 1],
    g: L10('次の手で長く跳べる道を作ろう（1歩だけ動かす）。', 'Build a road for a long jump next move (move one step).', '走一步，为下一步的长跳搭路。', '다음 수에 길게 뛸 길을 만들자 (한 걸음).', 'Construye un camino para un salto largo (un paso).', 'Construisez une route pour un long saut (un pas).', 'Construa um caminho para um salto longo (um passo).', 'Baue eine Straße für einen langen Sprung (ein Schritt).', 'अगली चाल की लंबी छलांग के लिए रास्ता बनाओ (एक कदम)।', 'ابنِ طريقًا لقفزة طويلة في النقلة التالية (خطوة واحدة).'),
    h: L10('跳び台は1マスおき。空いているマスに1歩出すと、列がつながります。', 'Stepping stones stand one square apart. One step into a gap joins the line.', '跳板要隔一格。走进空格一步，线就连起来了。', '발판은 한 칸 간격. 빈칸으로 한 걸음 나가면 줄이 이어집니다.', 'Los trampolines van cada dos casillas. Un paso al hueco une la fila.', 'Les tremplins sont espacés d’une case. Un pas dans le vide relie la ligne.', 'Os trampolins ficam a uma casa. Um passo no vazio liga a linha.', 'Sprungbretter stehen mit einem Feld Abstand. Ein Schritt in die Lücke verbindet die Reihe.', 'सीढ़ियाँ एक खाने के अंतर पर। खाली खाने में एक कदम से पंक्ति जुड़ती है।', 'نقاط الارتكاز يفصلها مربع. خطوة إلى الفراغ تصل الصف.'),
    y: L10('これで後ろの駒が次の手で長く跳べます。', 'Now a piece behind can make a long jump next move.', '这样后面的子下一步就能长跳了。', '이제 뒤의 말이 다음 수에 길게 뛸 수 있습니다.', 'Ahora una pieza de atrás puede saltar lejos.', 'Une pièce de derrière peut maintenant sauter loin.', 'Agora uma peça de trás pode saltar longe.', 'Jetzt kann ein Stein dahinter weit springen.', 'अब पीछे की गोटी अगली चाल में लंबी छलांग लगा सकती है।', 'الآن تستطيع قطعة خلفية القفز بعيدًا.') },
]);
// 8 block a road: the move after which the opponent's best jump is shortest (opponent to move)
function blockScore(p, m) { const q = p.clone().play(m); let g = -99; for (const x of real(q)) g = Math.max(g, gainOf(q, x)); return g; }
add('s_block', 'strategy', pick(p => {
  const before = bestGain(p, 3 - p.turn); if (before < 5) return null;
  const L = real(p); if (L.length < 6) return null;
  const sc = L.map(m => [m, blockScore(p, m)]), low = Math.min(...sc.map(x => x[1]));
  const ok = sc.filter(x => x[1] === low).map(x => x[0]);
  if (low > before - 3 || ok.length > 3) return null;
  return okOf(ok);
}, 5, { id: 's_block' }), [
  { k: 'explain', s: spec(['d4', 'a1', 'b1', 'c1', 'a2', 'b2', 'c2', 'a3', 'b3'], ['e5', 'e3', 'g6', 'h6', 'f7', 'g7', 'h7', 'g8', 'h8'], 1, 12), seq: ['d4-d3'], marks: [[sqIdx('e5') + 1, 'ng'], [sqIdx('e3') + 1, 'ok']],
    t: L10('相手の道をふさぐ', 'Block the opponent’s road', '堵住对方的路', '상대의 길 막기', 'Cortar el camino rival', 'Couper la route adverse', 'Bloquear o caminho rival', 'Die Straße des Gegners sperren', 'विरोधी का रास्ता रोकना', 'سدّ طريق الخصم'),
    body: L10('<p>黒は次に<b>e5→d4…</b>のように、白の駒も跳び台にして跳ぼうとします。</p><p>相手が着地したいマスに先に駒を置くと、相手の長い跳びを止められます。自分が進む手と、相手を止める手をくらべて選ぼう。</p>',
      '<p>Black wants to hop along <b>from e5</b>, using White’s pieces as stepping stones too.</p><p>Put a piece on the square the opponent wants to land on and the long jump is gone. Compare your fastest move with the move that stops them.</p>',
      '<p>黑方想从 <b>e5</b> 出发，借白子一路跳下去。</p><p>先在对方想落下的格子放一个子，就能挡住长跳。比较“自己前进”和“挡住对方”再选择。</p>',
      '<p>흑은 <b>e5</b>에서 백의 말까지 발판으로 삼아 뛰려고 합니다.</p><p>상대가 착지하고 싶은 칸에 먼저 말을 두면 긴 점프를 막을 수 있습니다. 내 전진과 상대 저지를 비교해 고르자.</p>',
      '<p>Las negras quieren saltar <b>desde e5</b>, usando también las piezas blancas.</p><p>Ocupa la casilla donde quiere caer y el salto largo desaparece. Compara avanzar con frenar al rival.</p>',
      '<p>Les noirs veulent sauter <b>depuis e5</b>, en se servant aussi des pièces blanches.</p><p>Occupez la case où il veut atterrir et le long saut disparaît. Comparez avancer et freiner l’adversaire.</p>',
      '<p>As pretas querem saltar <b>a partir de e5</b>, usando também as peças brancas.</p><p>Ocupe a casa onde ele quer cair e o salto longo some. Compare avançar com travar o rival.</p>',
      '<p>Schwarz will <b>von e5</b> aus springen und nutzt dabei auch weiße Steine.</p><p>Besetze das Landefeld, und der lange Sprung ist weg. Vergleiche: selbst ziehen oder den Gegner bremsen.</p>',
      '<p>काला <b>e5</b> से सफ़ेद गोटियों को भी सीढ़ी बनाकर कूदना चाहता है।</p><p>जिस खाने पर वह उतरना चाहता है, वहाँ पहले गोटी रख दो — लंबी छलांग रुक जाएगी।</p>',
      '<p>يريد الأسود القفز <b>من e5</b> مستعملًا قطع الأبيض أيضًا.</p><p>احتلّ المربع الذي يريد الهبوط فيه فتختفي القفزة الطويلة. وازن بين التقدّم وإيقاف الخصم.</p>') },
]);
// 9 the 40-move rule: get the last pieces out of your corner in time
add('s_leave', 'strategy', pick(p => {
  const me = p.turn, H = E.HOME()[me], home = p.inHome(me), left = E.R.limit - p.movesOf(me);
  if (!home || left > 6 || left < home) return null;
  const L = real(p), ok = L.filter(m => H[E.mFrom(m)] && !H[E.mTo(m)]); if (!ok.length || ok.length === L.length) return null;
  return okOf(ok);
}, 5, { id: 's_leave' }));
// 10 fill the house: the fastest way to finish (exact, Black frozen)
add('s_deep', 'strategy', pick(p => {
  if (p.inTarget(1) < 5 || p.inTarget(1) > 7) return null;
  for (let s = 0; s < 64; s++) if (p.owner(s) === 2 && E.target(1)[s]) return null;
  const sp = Object.assign({ free: true }, p.spec()); sp.side = 1;
  const n = E.soloMin(sp, 7, null, 400000); if (n < 2) return null;
  const ok = E.soloGood(sp, [], n, null, 800000); const L = real(p);
  if (!ok.length || ok.length > 3 || ok.length === L.length) return null;
  return okOf(ok);
}, 5, { white: true, id: 's_deep' }), [
  { k: 'explain', s: spec(['f8', 'g8', 'h8', 'g7', 'h7', 'h6', 'e6', 'g5', 'f4'], ['a1', 'b1', 'c1', 'a2', 'b2', 'c2', 'a3', 'b3', 'c3']), seq: ['e6-f6'], marks: [[sqIdx('f7') + 1, 'ok'], [sqIdx('g6') + 1, 'ok']],
    t: L10('陣地は奥から埋める', 'Fill the house from the back', '营地从里往外填', '진지는 안쪽부터 채운다', 'Llena la casa desde el fondo', 'Remplir la maison par le fond', 'Encha a casa pelo fundo', 'Das Haus von hinten füllen', 'घर पीछे से भरो', 'املأ البيت من الداخل'),
    body: L10('<p>陣地の手前のマスを先に埋めると、残りの駒が奥へ入れなくなります。</p><p>奥の空きマスへ入れる順番を考え、手前のマスは最後の駒のために空けておこう。</p>',
      '<p>If you fill the near squares of the house first, the last pieces cannot get to the deep ones.</p><p>Plan the order so pieces go deep first, and keep a near square free for the last piece.</p>',
      '<p>先占住营地外侧的格子，剩下的子就进不到里面了。</p><p>按顺序先填里面，外侧留给最后一个子。</p>',
      '<p>진지 앞쪽 칸을 먼저 채우면 남은 말이 안쪽으로 들어갈 수 없습니다.</p><p>안쪽부터 채우는 순서를 생각하고, 앞쪽 칸은 마지막 말을 위해 비워 두자.</p>',
      '<p>Si llenas primero las casillas cercanas, las últimas piezas no llegan al fondo.</p><p>Ordena las entradas: primero el fondo, y deja libre una casilla cercana para la última.</p>',
      '<p>Si vous remplissez d’abord les cases proches, les dernières pièces n’atteignent plus le fond.</p><p>Faites entrer d’abord au fond et gardez une case proche libre pour la dernière.</p>',
      '<p>Se encher primeiro as casas próximas, as últimas peças não chegam ao fundo.</p><p>Faça entrar primeiro no fundo e deixe uma casa próxima livre para a última.</p>',
      '<p>Füllst du zuerst die vorderen Felder, kommen die letzten Steine nicht mehr nach hinten.</p><p>Erst hinten auffüllen, ein vorderes Feld für den letzten Stein frei lassen.</p>',
      '<p>घर के आगे वाले खाने पहले भर दोगे तो आखिरी गोटियाँ अंदर नहीं जा पाएँगी।</p><p>पहले अंदर भरो, आगे का एक खाना आखिरी गोटी के लिए खाली रखो।</p>',
      '<p>إن ملأت المربعات القريبة أولًا فلن تصل القطع الأخيرة إلى العمق.</p><p>أدخل القطع إلى العمق أولًا واترك مربعًا قريبًا للقطعة الأخيرة.</p>') },
]);
// 11 count the race: the engine's best move in an endgame race (partial points)
add('s_count', 'strategy', pick(p => {
  if (p.inTarget(1) + p.inTarget(2) < 6 || p.inHome(p.turn)) return null;
  const mvs = []; // the position as a fresh start: values from the engine
  const sp = p.spec();
  const r = E.analyze(sp, [], 900);
  const L = r.list.slice().sort((a, b) => b.v - a.v);
  if (L.length < 6 || L[0].v - L[1].v < 25 || Math.abs(L[0].v) > 2000) return null;
  return { sc: L.map(e => [e.m, e.v]), best: L[0].m };
}, 5, { id: 's_count' }));
// fill the "try" ramp answers with the rule (road: the step with the longest next jump)
for (const st of steps) for (const it of st.ramp || []) if (it.k === 'try' && !it.ok) {
  const p = E.Pos.from(it.s), L = real(p).filter(m => !E.isJump(p, m));
  const sc = L.map(m => [m, roadScore(p, m)]), top = Math.max(...sc.map(x => x[1]));
  it.ok = sc.filter(x => x[1] === top).map(x => E.name(p, x[0]));
  console.error('ramp try', st.id, it.ok, top);
}
for (const st of steps) for (const it of st.ramp || []) for (const nm of it.seq || []) { const p = E.Pos.from(it.s); if (!real(p).some(m => E.name(p, m) === nm)) { console.error('bad ramp seq', st.id, nm); process.exit(1); } }
const rampUi = {
  step: L10('準備 {i}/{n}', 'Warm-up {i}/{n}', '热身 {i}/{n}', '준비 {i}/{n}', 'Calentamiento {i}/{n}', 'Échauffement {i}/{n}', 'Aquecimento {i}/{n}', 'Aufwärmen {i}/{n}', 'तैयारी {i}/{n}', 'تمهيد {i}/{n}'),
  next: L10('次へ', 'Next', '下一步', '다음', 'Siguiente', 'Suivant', 'Próximo', 'Weiter', 'आगे', 'التالي'),
  main: L10('本番の問題へ', 'To the problems', '进入正式题目', '본 문제로', 'A los problemas', 'Aux problèmes', 'Aos problemas', 'Zu den Aufgaben', 'मुख्य सवालों पर', 'إلى المسائل'),
  skip: L10('準備をとばす', 'Skip the warm-up', '跳过热身', '준비 건너뛰기', 'Saltar el calentamiento', 'Passer l’échauffement', 'Pular o aquecimento', 'Aufwärmen überspringen', 'तैयारी छोड़ें', 'تخطَّ التمهيد'),
  note: L10('採点しない練習です。', 'Practice — not scored.', '不计分的练习。', '채점하지 않는 연습입니다.', 'Práctica: no puntúa.', 'Entraînement : non noté.', 'Treino: sem pontuação.', 'Übung – ohne Wertung.', 'अभ्यास — अंक नहीं।', 'تمرين — بلا تقييم.'),
  look: L10('光っているマスに注目。', 'Look at the glowing squares.', '注意发光的格子。', '빛나는 칸을 보세요.', 'Mira las casillas que brillan.', 'Regardez les cases qui brillent.', 'Veja as casas que brilham.', 'Achte auf die leuchtenden Felder.', 'चमकते खानों को देखो।', 'انظر إلى المربعات المضيئة.'),
  ans: L10('答えは {m} です。', 'The answer is {m}.', '答案是 {m}。', '정답은 {m}입니다.', 'La respuesta es {m}.', 'La réponse est {m}.', 'A resposta é {m}.', 'Die Lösung ist {m}.', 'उत्तर {m} है।', 'الجواب {m}.'),
  ng: L10('もう一度考えてみよう。', 'Think again.', '再想一想。', '다시 생각해 보자.', 'Piénsalo otra vez.', 'Réfléchissez encore.', 'Pense de novo.', 'Denk noch einmal nach.', 'फिर से सोचो।', 'فكّر مرة أخرى.'),
};
process.stdout.write(JSON.stringify({ version: 1, steps, rampUi }));
