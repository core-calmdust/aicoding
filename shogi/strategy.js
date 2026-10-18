// Opening classification (戦型判定) shared by the page and the build tools.
// Copyright 2026 core-calmdust — Apache License 2.0
(function (root) {
  'use strict';
  // E = ShogiEngine, pos = Position. Returns {id, ja, en} or null.
  function classify(E, pos) {
    const b = pos.board, HI = E.HI, RY = E.RY, KA = E.KA, UM = E.UM, FU = E.FU;
    let br = -1, wr = -1, bishopsOnBoard = 0;
    for (let s = 0; s < 81; s++) {
      const p = b[s]; if (!p) continue;
      const t = E.typeOf(p), c = E.colorOf(p);
      if (t === HI || t === RY) { if (c === 0) br = s; else wr = s; }
      if (t === KA || t === UM) bishopsOnBoard++;
    }
    const file = s => E.sqFile(s), rank = s => E.sqRank(s);
    // ranging rook: rook moved sideways in its own camp
    const bSide = br >= 0 && rank(br) >= 6 && file(br) >= 5 && file(br) <= 8 ? file(br) : 0;
    const wSide = wr >= 0 && rank(wr) <= 4 && file(wr) >= 2 && file(wr) <= 5 ? file(wr) : 0;
    const bName = { 8: ['向かい飛車', 'Opposing Rook'], 7: ['三間飛車', 'Third-file Rook'], 6: ['四間飛車', 'Fourth-file Rook'], 5: ['中飛車', 'Central Rook'] };
    const wName = { 2: bName[8], 3: bName[7], 4: bName[6], 5: bName[5] };
    if (bSide && wSide) return { id: 'aifuri', ja: '相振り飛車', en: 'Double Ranging Rook' };
    if (bSide) return { id: 'furi', side: 0, rook: bSide, ja: `対抗形（先手${bName[bSide][0]}）`, en: `Static vs Ranging (Sente ${bName[bSide][1]})` };
    if (wSide) return { id: 'furi', side: 1, rook: 10 - wSide, ja: `対抗形（後手${wName[wSide][0]}）`, en: `Static vs Ranging (Gote ${wName[wSide][1]})` };
    // double static rook
    if (bishopsOnBoard === 0 && pos.hand[KA] + pos.hand[8 + KA] === 2) return { id: 'kakugawari', ja: '角換わり', en: 'Bishop Exchange' };
    if ((br >= 0 && rank(br) <= 4 && file(br) >= 3 && file(br) <= 4) || (wr >= 0 && rank(wr) >= 6 && file(wr) >= 6 && file(wr) <= 7)) return { id: 'yokofu', ja: '横歩取り', en: 'Side Pawn Capture' };
    const pawnAt = (f, r, c) => b[E.makeSq(f, r)] === FU + (c ? E.WF : 0);
    const pawnOnFile = (f, c) => { for (let r = 1; r <= 9; r++) if (pawnAt(f, r, c)) return r; return 0; };
    const bAdv = pawnOnFile(2, 0) !== 7, wAdv = pawnOnFile(8, 1) !== 3;   // rook pawns pushed or exchanged
    if (pawnAt(2, 5, 0) || pawnAt(8, 5, 1) || (bAdv && wAdv && pawnOnFile(2, 0) <= 5 && pawnOnFile(8, 1) !== 4 && (pawnOnFile(8, 1) >= 5 || !pawnOnFile(8, 1)))) {
      if (!pawnAt(7, 7, 0) && !pawnAt(3, 3, 1) && bishopsOnBoard === 2 && (b[E.makeSq(7, 7)] === E.GI || b[E.makeSq(6, 7)] === E.KI)) return { id: 'yagura', ja: '矢倉', en: 'Yagura' };
      return { id: 'aigakari', ja: '相掛かり', en: 'Double Wing Attack' };
    }
    if (b[E.makeSq(7, 7)] === E.GI && (b[E.makeSq(6, 8)] === E.KI || (b[E.makeSq(6, 7)] === E.KI && pawnAt(6, 6, 0)))) return { id: 'yagura', ja: '矢倉', en: 'Yagura' };
    return { id: 'ibisha', ja: '相居飛車', en: 'Double Static Rook' };
  }
  // whole-game classification: the last specific strategy seen in the opening (plies 8..40), else the current one
  function classifyGame(E, start, moves) {
    const p = new E.Position(); p.setSfen(start);
    const PRI = { aifuri: 6, furi: 5, yokofu: 4, kakugawari: 3, yagura: 2, aigakari: 1, ibisha: 0 };
    let found = null, cur = null;
    for (let i = 0; i < moves.length && i < 40; i++) {
      p.doMove(p.fromUsi(moves[i])); p.sp = 0;
      if (i + 1 < 8) continue;
      cur = classify(E, p);
      if (cur && cur.id !== 'ibisha' && (!found || PRI[cur.id] >= PRI[found.id])) found = cur;
    }
    return found || cur;
  }
  // localized name of a classify() result (falls back: lang -> en -> ja)
  const NAMES = {
    aifuri: { zh: '相振飞车', ko: '상후리비샤', es: 'Doble torre desplazada', fr: 'Double tour déplacée', pt: 'Torre deslocada dupla', de: 'Doppelschwenkturm', hi: 'दोहरा घूमता हाथी', ar: 'الرخ المتنقل المزدوج' },
    kakugawari: { zh: '角换', ko: '각교환', es: 'Cambio de alfiles', fr: 'Échange des fous', pt: 'Troca de bispos', de: 'Läufertausch', hi: 'ऊँट की अदला-बदली', ar: 'تبادل الفيلة' },
    yokofu: { zh: '横步取', ko: '횡보잡기', es: 'Captura del peón lateral', fr: 'Prise du pion latéral', pt: 'Captura do peão lateral', de: 'Seitenbauernraub', hi: 'बगल का प्यादा पकड़ना', ar: 'أسر الجندي الجانبي' },
    yagura: { zh: '矢仓', ko: '야구라', es: 'Yagura', fr: 'Yagura', pt: 'Yagura', de: 'Yagura', hi: 'यागुरा', ar: 'ياغورا' },
    aigakari: { zh: '相挂', ko: '아이가카리', es: 'Doble ataque de ala', fr: "Double attaque d'aile", pt: 'Ataque duplo de ala', de: 'Doppelflügelangriff', hi: 'दोहरा विंग आक्रमण', ar: 'هجوم الجناحين المزدوج' },
    ibisha: { zh: '相居飞车', ko: '상이비샤', es: 'Doble torre estática', fr: 'Double tour statique', pt: 'Torre estática dupla', de: 'Doppel-Standturm', hi: 'दोहरा स्थिर हाथी', ar: 'الرخ الثابت المزدوج' },
  };
  // ranging-rook file 8,7,6,5 (from Sente's view) / side names / template
  const FURI = {
    zh: { r: { 8: '向飞车', 7: '三间飞车', 6: '四间飞车', 5: '中飞车' }, s: ['先手', '后手'], f: '对抗形（{s}{r}）' },
    ko: { r: { 8: '무카이비샤', 7: '산켄비샤', 6: '시켄비샤', 5: '나카비샤' }, s: ['선수', '후수'], f: '대항형({s} {r})' },
    es: { r: { 8: 'Torre opuesta', 7: 'Torre en 3.ª columna', 6: 'Torre en 4.ª columna', 5: 'Torre central' }, s: ['Sente', 'Gote'], f: 'Estática vs. desplazada ({s}: {r})' },
    fr: { r: { 8: 'Tour opposée', 7: 'Tour en 3e colonne', 6: 'Tour en 4e colonne', 5: 'Tour centrale' }, s: ['Sente', 'Gote'], f: 'Statique contre déplacée ({s} : {r})' },
    pt: { r: { 8: 'Torre oposta', 7: 'Torre na 3ª coluna', 6: 'Torre na 4ª coluna', 5: 'Torre central' }, s: ['Sente', 'Gote'], f: 'Estática x deslocada ({s}: {r})' },
    de: { r: { 8: 'Gegenturm', 7: 'Turm auf 3. Linie', 6: 'Turm auf 4. Linie', 5: 'Zentralturm' }, s: ['Sente', 'Gote'], f: 'Stand- gg. Schwenkturm ({s}: {r})' },
    hi: { r: { 8: 'आमने-सामने हाथी', 7: 'तीसरे कॉलम का हाथी', 6: 'चौथे कॉलम का हाथी', 5: 'केंद्रीय हाथी' }, s: ['सेन्ते', 'गोते'], f: 'स्थिर बनाम घूमता ({s}: {r})' },
    ar: { r: { 8: 'الرخ المقابل', 7: 'رخ العمود الثالث', 6: 'رخ العمود الرابع', 5: 'الرخ المركزي' }, s: ['سينتي', 'غوتي'], f: 'ثابت ضد متنقل ({s}: {r})' },
  };
  function localName(c, lang) {
    if (!c) return '';
    if (lang === 'ja') return c.ja;
    if (c.id === 'furi' && FURI[lang] && c.rook) { const F = FURI[lang]; return F.f.replace('{s}', F.s[c.side]).replace('{r}', F.r[c.rook]); }
    return (NAMES[c.id] && NAMES[c.id][lang]) || c.en || c.ja;
  }
  const api = { classify, classifyGame, localName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShogiStrategy = api;
})(typeof self !== 'undefined' ? self : this);
