// node tools/gen_openings.js [msPerMove]  → openings.json
// Named openings (names and first moves from the classic classification, e.g. F. Reinfeld "How to Win at Checkers"),
// each continued by this site's engine to a 14-ply study line, plus practice problems (engine values of every move).
const fs = require('fs'), path = require('path');
const { load } = require('./wasm.js');
const L10 = (ja, en, zh, ko, es, fr, pt, de, hi, ar) => ({ ja, en, zh, ko, es, fr, pt, de, hi, ar });
// [id, group, moves, label (short), title]
const SETS = [
  ['single', 'a', '11-15 22-18', 'Single Corner', L10('シングル・コーナー', 'Single Corner', '单角', '싱글 코너', 'Esquina simple', 'Coin simple', 'Canto simples', 'Einfache Ecke', 'सिंगल कॉर्नर', 'الزاوية المفردة')],
  ['cross', 'a', '11-15 23-18', 'Cross', L10('クロス', 'Cross', '交叉', '크로스', 'Cruz', 'Croix', 'Cruz', 'Kreuz', 'क्रॉस', 'التقاطع')],
  ['ayrshire', 'a', '11-15 24-20', 'Ayrshire Lassie', L10('エアシャー・ラッシー', 'Ayrshire Lassie', '艾尔郡姑娘', '에어셔 래시', 'Ayrshire Lassie', 'Ayrshire Lassie', 'Ayrshire Lassie', 'Ayrshire Lassie', 'आयरशायर लैसी', 'فتاة آيرشاير')],
  ['old14', 'a', '11-15 23-19 8-11 22-17 4-8', 'Old Fourteenth', L10('オールド・フォーティーンス', 'Old Fourteenth', '老十四', '올드 포틴스', 'Old Fourteenth', 'Old Fourteenth', 'Old Fourteenth', 'Old Fourteenth', 'ओल्ड फोर्टींथ', 'الرابع عشر القديم')],
  ['glasgow', 'a', '11-15 23-19 8-11 22-17 11-16', 'Glasgow', L10('グラスゴー', 'Glasgow', '格拉斯哥', '글래스고', 'Glasgow', 'Glasgow', 'Glasgow', 'Glasgow', 'ग्लासगो', 'غلاسكو')],
  ['laird', 'a', '11-15 23-19 8-11 22-17 9-13', 'Laird and Lady', L10('レアード・アンド・レディ', 'Laird and Lady', '领主与夫人', '레어드 앤드 레이디', 'Laird and Lady', 'Laird and Lady', 'Laird and Lady', 'Laird and Lady', 'लेयर्ड एंड लेडी', 'السيد والسيدة')],
  ['alma', 'a', '11-15 23-19 8-11 22-17 3-8', 'Alma', L10('アルマ', 'Alma', '阿尔马', '알마', 'Alma', 'Alma', 'Alma', 'Alma', 'अल्मा', 'ألما')],
  ['souter', 'a', '11-15 23-19 9-14 22-17 6-9', 'Souter', L10('スーター', 'Souter', '苏特', '수터', 'Souter', 'Souter', 'Souter', 'Souter', 'सूटर', 'سوتر')],
  ['fife', 'a', '11-15 23-19 9-14 22-17 5-9', 'Fife', L10('ファイフ', 'Fife', '法夫', '파이프', 'Fife', 'Fife', 'Fife', 'Fife', 'फ़ाइफ़', 'فايف')],
  ['whilter', 'a', '11-15 23-19 9-14 22-17 7-11', 'Whilter', L10('ウィルター', 'Whilter', '威尔特', '윌터', 'Whilter', 'Whilter', 'Whilter', 'Whilter', 'व्हिल्टर', 'ويلتر')],
  ['edinburgh', 'b', '9-13', 'Edinburgh', L10('エジンバラ', 'Edinburgh', '爱丁堡', '에든버러', 'Edimburgo', 'Édimbourg', 'Edimburgo', 'Edinburgh', 'एडिनबर्ग', 'إدنبرة')],
  ['double', 'b', '9-14 22-18', 'Double Corner', L10('ダブル・コーナー', 'Double Corner', '双角', '더블 코너', 'Doble esquina', 'Coin double', 'Canto duplo', 'Doppelecke', 'डबल कॉर्नर', 'الزاوية المزدوجة')],
  ['dcross', 'b', '9-14 23-18', 'Double Cross', L10('ダブル・クロス', 'Double Cross', '双交叉', '더블 크로스', 'Doble cruz', 'Double croix', 'Cruz dupla', 'Doppelkreuz', 'डबल क्रॉस', 'التقاطع المزدوج')],
  ['pioneer', 'b', '9-14 22-17 11-16 25-22', 'Pioneer', L10('パイオニア', 'Pioneer', '先锋', '파이오니어', 'Pionero', 'Pionnier', 'Pioneiro', 'Pionier', 'पायनियर', 'الرائد')],
  ['denny', 'b', '10-14', 'Denny', L10('デニー', 'Denny', '丹尼', '데니', 'Denny', 'Denny', 'Denny', 'Denny', 'डेनी', 'دني')],
  ['kelso', 'b', '10-15', 'Kelso', L10('ケルソー', 'Kelso', '凯尔索', '켈소', 'Kelso', 'Kelso', 'Kelso', 'Kelso', 'केल्सो', 'كيلسو')],
  ['bristol', 'b', '11-16 24-20 16-19', 'Bristol', L10('ブリストル', 'Bristol', '布里斯托', '브리스틀', 'Bristol', 'Bristol', 'Bristol', 'Bristol', 'ब्रिस्टल', 'بريستول')],
  ['bcross', 'b', '11-16 23-18 16-20 24-19', 'Bristol Cross', L10('ブリストル・クロス', 'Bristol Cross', '布里斯托交叉', '브리스틀 크로스', 'Cruz de Bristol', 'Croix de Bristol', 'Cruz de Bristol', 'Bristol-Kreuz', 'ब्रिस्टल क्रॉस', 'تقاطع بريستول')],
  ['dundee', 'b', '12-16', 'Dundee', L10('ダンディー', 'Dundee', '邓迪', '던디', 'Dundee', 'Dundee', 'Dundee', 'Dundee', 'डंडी', 'دندي')],
];
// short notes for the engine's continuation (10 languages)
const NOTE = {
  named: L10('「{n}」の手順。', 'The {n} move order.', '“{n}”的着法。', '「{n}」의 수순.', 'Orden de la {n}.', 'Ordre de coups de la {n}.', 'Ordem de lances da {n}.', 'Zugfolge der {n}.', '“{n}” का क्रम।', 'ترتيب نقلات «{n}».'),
  exch: L10('取り合い（交換）。', 'An exchange.', '兑子。', '맞교환.', 'Un cambio.', 'Un échange.', 'Uma troca.', 'Ein Abtausch.', 'अदला-बदली।', 'تبادل.'),
  jump: L10('取るのは義務。ここで取り返す。', 'Capturing is compulsory: the recapture.', '必须吃子：这里吃回。', '잡기는 의무 — 되잡기.', 'Capturar es obligatorio: la recaptura.', 'La prise est obligatoire : la reprise.', 'Capturar é obrigatório: a recaptura.', 'Schlagzwang: das Zurückschlagen.', 'मारना अनिवार्य है: वापस मारना।', 'الأسر إلزامي: الاسترداد.'),
  center: L10('中央へ。', 'Into the centre.', '占中。', '중앙으로.', 'Al centro.', 'Vers le centre.', 'Para o centro.', 'Ins Zentrum.', 'केंद्र की ओर।', 'نحو المركز.'),
  side: L10('盤の端へ。', 'To the side.', '走向边线。', '변으로.', 'Hacia el borde.', 'Vers le bord.', 'Para a borda.', 'An den Rand.', 'किनारे की ओर।', 'نحو الحافة.'),
  back: L10('後ろの段から駒を出す。', 'A back-row man comes out.', '从底线出子。', '뒷줄의 말을 꺼냄.', 'Sale una pieza de la última fila.', 'Une pièce de la dernière rangée sort.', 'Sai uma peça da última fileira.', 'Ein Stein der Grundreihe kommt heraus.', 'पिछली पंक्ति की गोटी आगे आई।', 'تخرج قطعة من الصف الخلفي.'),
  dev: L10('駒を進めて形を整える。', 'Developing.', '出子，整形。', '말을 전개.', 'Desarrollo.', 'Développement.', 'Desenvolvimento.', 'Entwicklung.', 'विकास की चाल।', 'تطوير.'),
};
const EVW = { even: L10('互角', 'level', '均势', '호각', 'igualado', 'équilibré', 'equilibrado', 'ausgeglichen', 'बराबर', 'متكافئ'), b: L10('黒やや良し', 'Black slightly better', '黑稍优', '흑 약간 유리', 'algo mejor para las negras', 'léger avantage aux noirs', 'pretas um pouco melhor', 'Schwarz etwas besser', 'काला थोड़ा बेहतर', 'الأسود أفضل قليلًا'), w: L10('白やや良し', 'White slightly better', '白稍优', '백 약간 유리', 'algo mejor para las blancas', 'léger avantage aux blancs', 'brancas um pouco melhor', 'Weiß etwas besser', 'सफ़ेद थोड़ा बेहतर', 'الأبيض أفضل قليلًا') };
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
(async () => {
  const W = await load(), E = W.E;
  const ms = +(process.argv[2] || 2500);
  const CENTER = [13, 14, 17, 18, 9, 10, 21, 22].map(x => x);   // index (square - 1) of the central squares 14,15,18,19 and 10,11,22,23
  const sets = [];
  for (const [id, grp, mvs, label, title] of SETS) {
    let pos = E.Pos.from(null); const line = [], notes = [];
    for (const s of mvs.split(' ')) { const m = E.parse(pos, s); if (m == null) throw new Error(id + ': ' + s); line.push(m); notes.push(null); pos.play(m); }
    const named = line.length;
    W.newGame();
    while (line.length < 14) {
      const r = W.analyze(null, line, ms), L = r.list; if (!L.length) break;
      const m = L[0].m, before = E.replay(null, line).pos;
      line.push(m);
      // a short note: what kind of move, and the engine's verdict (Black's view)
      const f = E.mFrom(m), tt = E.mTo(m), cap = E.mCap(m);
      let k = cap ? (before.clone().play(m).hasCaps() ? 'exch' : 'jump') : CENTER.includes(tt) ? 'center' : (before.turn === 1 ? f < 4 : f >= 28) ? 'back' : [3, 4, 11, 12, 19, 20, 27, 28].includes(tt + 1) ? 'side' : 'dev';
      const vb = (before.turn === 1 ? 1 : -1) * L[0].v, ev = Math.abs(vb) < 25 ? 'even' : vb > 0 ? 'b' : 'w';
      const note = {}; for (const l of LANGS) note[l] = NOTE[k][l] + (l === 'ja' || l === 'zh' ? '（' : ' (') + 'AI: ' + EVW[ev][l] + (l === 'ja' || l === 'zh' ? '）' : ')');
      notes.push(note);
    }
    // the named moves get the opening's name on the last one
    for (let i = 0; i < named; i++) { const o = {}; for (const l of LANGS) o[l] = NOTE.named[l].replace('{n}', title[l]); notes[i] = i === named - 1 ? o : null; }
    // practice: the positions along the line after the named moves (the engine's values of every move)
    const problems = [];
    // more practice positions when the line is short of them: continue the line a few more plies (practice only)
    const ext = line.slice();
    for (let i = Math.max(1, named - 1); i < ext.length + 1 && problems.length < 9 && i < 24; i++) {
      if (i >= ext.length) { const r0 = W.analyze(null, ext, 1200); if (!r0.list.length) break; ext.push(r0.list[0].m); }
      const spec = E.replay(null, ext.slice(0, i)).pos.spec();
      const P = E.Pos.from(spec); if (P.moves().length < 3) continue;
      const r = W.analyze(spec, [], 1500), S = r.list.map(e => [e.m, e.v]);
      if (S.length < 3 || !S.some(e => e[1] <= S[0][1] - 60)) continue;
      problems.push({ s: spec, best: S[0][0], sc: S });
    }
    const side = grp === 'a' && line.length && false ? 2 : 1;
    sets.push({ id, grp, side, show: named, moves: mvs, label: { en: label }, title, short: null, intro: null, study: { line, notes }, problems });
    console.error(id, 'line', line.length, 'problems', problems.length);
  }
  fs.writeFileSync(path.join(__dirname, '..', 'openings.json'), JSON.stringify({ version: 1, sets }));
})();
