// Builds openings.json: the classic named openings of 3x3 ugolki (I. Troitsky's textbook of classic ugolki:
// the Standard opening and Luzhin's opening), played by both sides (Black answers with the mirror of White's plan,
// allowed for the first moves), then continued by the engine; practice problems with the engine's values.
// node tools/gen_openings.js > openings.json
const E = require('../engine.js'); E.setRule('c33');
const path = require('path');
const { keepLangs } = require(path.join(__dirname, '../../tools', 'keep-langs.js'));   // keeps ru / zh-TW / id / tr of unchanged texts
const mir = s => s.replace(/([a-h])([1-8])/g, (_, f, r) => 'hgfedcba'['abcdefgh'.indexOf(f)] + (9 - r));
const L10 = (ja, en, zh, ko, es, fr, pt, de, hi, ar) => ({ ja, en, zh, ko, es, fr, pt, de, hi, ar });
const SETS = [
  { id: 'standard', W: ['c2-c4', 'b2-d4', 'c3-d3', 'a3-c5', 'a1-e3', 'c5-c6', 'c1-c7'],
    title: L10('標準の定跡', 'Standard opening', '标准开局', '표준 정석', 'Apertura estándar', 'Ouverture standard', 'Abertura padrão', 'Standarderöffnung', 'मानक ओपनिंग', 'الافتتاح القياسي'),
    label: L10('Стандартный дебют', 'Standard', 'Стандартный', 'Стандартный', 'Стандартный', 'Стандартный', 'Стандартный', 'Стандартный', 'Стандартный', 'Стандартный') },
  { id: 'standard2', W: ['c2-c4', 'b2-d4', 'c3-d3', 'a3-c5', 'a1-e3', 'e3-f3', 'c1-g3'],
    title: L10('標準の定跡（f3型）', 'Standard opening (f3 line)', '标准开局（f3变化）', '표준 정석 (f3형)', 'Apertura estándar (línea f3)', 'Ouverture standard (ligne f3)', 'Abertura padrão (linha f3)', 'Standarderöffnung (f3-Variante)', 'मानक ओपनिंग (f3 लाइन)', 'الافتتاح القياسي (خط f3)'),
    label: L10('6. e3-f3', '6. e3-f3', '6. e3-f3', '6. e3-f3', '6. e3-f3', '6. e3-f3', '6. e3-f3', '6. e3-f3', '6. e3-f3', '6. e3-f3') },
  { id: 'luzhin', W: ['c2-d2', 'c3-c4', 'a3-c5', 'b1-d3', 'a1-e3', 'a2-e4'],
    title: L10('ルージンの定跡', 'Luzhin’s opening', '卢任开局', '루진 정석', 'Apertura de Luzhin', 'Ouverture de Loujine', 'Abertura de Luzhin', 'Luschin-Eröffnung', 'लुज़िन ओपनिंग', 'افتتاح لوجين'),
    label: L10('Дебют Лужина', 'Luzhin', 'Дебют Лужина', 'Дебют Лужина', 'Дебют Лужина', 'Дебют Лужина', 'Дебют Лужина', 'Дебют Лужина', 'Дебют Лужина', 'Дебют Лужина') },
];
const NOTES = {
  first: L10('定跡の1手目。', 'The first move of the line.', '定式的第一步。', '정석의 첫 수.', 'La primera jugada de la línea.', 'Le premier coup de la ligne.', 'O primeiro lance da linha.', 'Der erste Zug der Variante.', 'लाइन की पहली चाल।', 'النقلة الأولى في الخط.'),
  jump: L10('跳び越えて一気に前へ。', 'A jump forward at once.', '一跳向前。', '뛰어넘어 단숨에 앞으로.', 'Un salto hacia delante.', 'Un saut en avant d’un coup.', 'Um salto para a frente.', 'Ein Sprung nach vorn.', 'एक छलांग आगे।', 'قفزة إلى الأمام دفعة واحدة.'),
  step: L10('横に1歩出て「道」を作る。', 'A step aside that builds a road.', '横走一步，搭出“路”。', '옆으로 한 걸음 나와 “길”을 만든다.', 'Un paso lateral que crea un camino.', 'Un pas de côté qui crée une route.', 'Um passo de lado que cria um caminho.', 'Ein Schritt zur Seite baut eine Straße.', 'बगल में एक कदम — रास्ता बनता है।', 'خطوة جانبية تبني طريقًا.'),
  deep: L10('隅の駒も連続ジャンプで外へ。', 'Even the corner piece gets out with a chain of jumps.', '角上的子也连跳出去。', '구석의 말도 연속 점프로 밖으로.', 'Incluso la pieza de la esquina sale saltando.', 'Même la pièce du coin sort par sauts.', 'Até a peça do canto sai saltando.', 'Auch der Eckstein springt hinaus.', 'कोने की गोटी भी छलांगों से बाहर।', 'حتى قطعة الركن تخرج بالقفزات.'),
  black: L10('黒も同じ形で応じる（最初の10手までは真似してよい）。', 'Black answers with the same shape (copying is allowed for the first moves).', '黑方以相同的形状应对（开局可以模仿）。', '흑도 같은 모양으로 응수 (처음 몇 수는 따라 해도 된다).', 'Las negras responden con la misma forma.', 'Les noirs répondent par la même forme.', 'As pretas respondem com a mesma forma.', 'Schwarz antwortet mit derselben Form.', 'काला भी वैसी ही आकृति से जवाब देता है।', 'يرد الأسود بالشكل نفسه.'),
  engine: L10('ここから先はエンジンが選んだ続き。', 'From here on, the engine’s continuation.', '此后是引擎选择的续着。', '여기부터는 엔진이 고른 수순.', 'Desde aquí, la continuación del motor.', 'À partir d’ici, la suite du moteur.', 'Daqui em diante, a continuação do motor.', 'Ab hier die Fortsetzung der Engine.', 'यहाँ से इंजन की चालें।', 'من هنا تتابع المحرك.'),
};
let seed = 99; const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const out = [];
for (const S of SETS) {
  const line = [], names = [], notes = [];
  let p = E.Pos.from(null);
  for (const w of S.W) {
    for (const s of [w, mir(w)]) {
      const m = E.parse(p, s);
      if (m == null) { console.error('illegal', S.id, s, names.join(' ')); process.exit(1); }
      names.push(E.name(p, m));
      notes.push(line.length === 0 ? NOTES.first : line.length === 1 ? NOTES.black : E.isJump(p, m) && E.path(p, m).length > 3 ? NOTES.deep : null);
      line.push(m); p.play(m);
    }
  }
  const book = names.join(' '), nb = line.length;
  // engine continuation
  for (let k = 0; k < 6; k++) { const r = E.think(null, line, 18, rand); if (r.move == null || r.move < 0) break; notes.push(k === 0 ? NOTES.engine : null); line.push(r.move); }
  // practice: positions after the book; the side to move is the learner
  const problems = [];
  for (let k = nb - 4; k < line.length; k++) {
    const { pos } = E.replay(null, line.slice(0, k));
    const r = E.analyze(null, line.slice(0, k), 1500);
    const sc = r.list.map(e => [e.m, e.v]);
    const best = r.list.slice().sort((a, b) => b.v - a.v)[0].m;
    problems.push({ s: pos.spec(), sc, best });
  }
  out.push({ id: S.id, grp: 'a', side: 1, show: 4, moves: book, label: S.label, title: S.title, short: null, intro: null, study: { line, notes }, problems });
  console.error(S.id, book);
}
process.stdout.write(JSON.stringify(keepLangs({ version: 1, sets: out }, path.join(__dirname, '..', 'openings.json'))));
