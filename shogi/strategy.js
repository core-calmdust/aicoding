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
    if (bSide) return { id: 'furi', ja: `対抗形（先手${bName[bSide][0]}）`, en: `Static vs Ranging (Sente ${bName[bSide][1]})` };
    if (wSide) return { id: 'furi', ja: `対抗形（後手${wName[wSide][0]}）`, en: `Static vs Ranging (Gote ${wName[wSide][1]})` };
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
  const api = { classify, classifyGame };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShogiStrategy = api;
})(typeof self !== 'undefined' ? self : this);
