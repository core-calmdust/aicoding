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
    if ((br >= 0 && rank(br) <= 4 && file(br) >= 2 && file(br) <= 4) || (wr >= 0 && rank(wr) >= 6 && file(wr) >= 6 && file(wr) <= 8)) return { id: 'yokofu', ja: '横歩取り', en: 'Side Pawn Capture' };
    const pawnAt = (f, r, c) => b[E.makeSq(f, r)] === FU + (c ? E.WF : 0);
    if (pawnAt(2, 5, 0) || pawnAt(8, 5, 1)) {
      if (!pawnAt(7, 7, 0) && !pawnAt(3, 3, 1) && bishopsOnBoard === 2 && (b[E.makeSq(7, 7)] === E.GI || b[E.makeSq(6, 7)] === E.KI)) return { id: 'yagura', ja: '矢倉', en: 'Yagura' };
      return { id: 'aigakari', ja: '相掛かり', en: 'Double Wing Attack' };
    }
    if (b[E.makeSq(7, 7)] === E.GI && b[E.makeSq(6, 8)] === E.KI) return { id: 'yagura', ja: '矢倉', en: 'Yagura' };
    return { id: 'ibisha', ja: '相居飛車', en: 'Double Static Rook' };
  }
  const api = { classify };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ShogiStrategy = api;
})(typeof self !== 'undefined' ? self : this);
