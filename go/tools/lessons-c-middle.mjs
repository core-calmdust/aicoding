// Lessons — course "middle" (中盤). 13x13 positions given as move lists; every answer measured with lessons-eng.mjs
// (strong net, 160 visits at the root, 60 after each candidate, komi 6.5). `eng.vals` = the mover's score lead after
// each candidate. Middle-game values are close, so listed wrong moves must lose >= 1.2 points (gap 1.2).
export const course = {
  id: 'middle',
  title: { ja: '中盤', en: 'Middle game' },
  sub: { ja: '根拠・攻め・地と厚み', en: 'Bases, attacking, territory and thickness' },
};
const ENG = (o) => Object.assign({ komi: 6.5, visits: '160/60', gap: 1.2 }, o);
const S1 = ['K10', 'D4', 'K4', 'D10', 'G10', 'L7', 'K7'];
export const steps = [
// ------------------------------------------------------------------ 1
{ id: 'base', course: 'middle',
  title: { ja: '根拠を奪う・弱い石を攻める', en: 'Taking the base: attacking weak stones' },
  sub: { ja: '攻めは、眼を作る場所を奪うことから', en: 'Attack by taking away the room for eyes' },
  intro: {
    ja: '<p>辺で眼を作るための足場を<b>根拠</b>といいます。根拠のない石（<b>弱い石</b>）は、逃げ回るうちに相手に地や厚みを与えてしまいます。</p><p>相手の弱い石を攻めるときは、外から追いかけるより、<b>辺の下側（二線・三線）から根拠を奪う</b>のが効果的です。</p><p>攻めながら<b>自分の地も固まる</b>手が理想です。外から押すだけの手は、相手を強くするので注意しましょう。</p>',
    en: '<p>The foothold on the side that lets a group make eyes is its <b>base</b>. Stones without a base (<b>weak stones</b>) have to run, and while they run the opponent gains territory and strength.</p><p>To attack a weak group, <b>take away its base from underneath (on the 2nd or 3rd line)</b> rather than chasing it from outside.</p><p>The ideal attack also <b>firms up your own territory</b>. Pushing from outside only makes the opponent stronger.</p>' },
  goal: { ja: '相手の弱い石を攻めてください', en: 'Attack the weak stones' },
  hint: { ja: '相手の石の「眼を作りたい場所」を先に取りましょう。', en: 'Take the place where the opponent wants to make eyes.' },
  diagram: { n: 13, moves: S1.concat(['L5']), marks: [['L4', 'ok'], ['M6', 'x']] },
  problems: [
    { n: 13, moves: S1.concat(['L5']), ok: ['L4'], good: ['L8'],
      eng: ENG({ top: [{ m: 'L4', n: 140, lead: -0.63 }, { m: 'L8', n: 15, lead: -1.13 }], vals: { L4: -0.56, M6: -3.28, K5: -1.76, L9: -3.43, M7: -4.79, K6: -1.67, G4: -2.28, L8: -0.89 }, wrong: ['M6', 'L9', 'M7', 'G4'] }),
      why: { ja: '<bdi>L4</bdi>で白のヒラキの先を止め、右下の黒地も固まります。白2子は根拠がなく、これから苦しい戦いになります。', en: '<bdi>L4</bdi> blocks White’s extension and secures Black’s lower-right corner at the same time. The two white stones have no base and face a hard fight.' },
      ng: { ja: '<bdi>M6</bdi>や<bdi>M7</bdi>の二線の手は狭く、白に<bdi>L4</bdi>方面へ進まれます（3目前後の損）。', en: 'Second-line moves like <bdi>M6</bdi> or <bdi>M7</bdi> are too narrow; White expands toward <bdi>L4</bdi> (about three points lost).' } },
    { n: 13, moves: ['D4', 'K10', 'D10', 'K4', 'G4', 'G10', 'L7', 'K7', 'L5'], ok: ['L4'], good: ['L8'], half: ['K5', 'C7'],
      eng: ENG({ top: [{ m: 'L4', n: 145, lead: 0.24 }, { m: 'L8', n: 11, lead: -0.61 }], vals: { L4: 0.08, L8: -0.75, M6: -2.49, L9: -1.67, M7: -3.85, K5: -0.81, C7: -0.86 }, wrong: ['M6', 'L9', 'M7'] }),
      why: { ja: '前の問題と色が逆の形。白も<bdi>L4</bdi>で黒2子のヒラキを止め、右下の隅を固めながら攻めます。', en: 'The previous shape with colours reversed. White also plays <bdi>L4</bdi>, stopping the two black stones from extending while securing the lower-right corner.' },
      ng: { ja: '二線の<bdi>M6</bdi>・<bdi>M7</bdi>は狭く、<bdi>L9</bdi>は方向違い。黒に<bdi>L4</bdi>方面へヒラかれます。', en: 'The second-line moves <bdi>M6</bdi>, <bdi>M7</bdi> are narrow and <bdi>L9</bdi> faces the wrong way; Black extends toward <bdi>L4</bdi>.' } },
    { n: 13, moves: ['K10', 'C3', 'D10', 'K4', 'K7', 'G11'], ok: ['J11'], good: ['E11'],
      eng: ENG({ top: [{ m: 'J11', n: 105, lead: 0.59 }, { m: 'E11', n: 45, lead: 0.3 }, { m: 'K3', n: 3, lead: 0.31 }], vals: { E11: 0.35, J11: 0.59, F11: -0.46, H11: -0.68, G10: -0.74, G9: -0.84, F10: -0.56, H10: -0.71 }, wrong: ['H11', 'G10', 'G9', 'H10'] }),
      why: { ja: '上辺に打ち込んだ白<bdi>G11</bdi>を、<bdi>J11</bdi>と三線でハサみます。白は右へヒラけず、左の黒<bdi>D10</bdi>との間もせまいので根拠を作れません。<bdi>E11</bdi>からハサむのも有力です。', en: 'Pincer the white invader <bdi>G11</bdi> on the third line with <bdi>J11</bdi>. White cannot extend to the right, and the space toward black <bdi>D10</bdi> is narrow, so there is no base. Pincering from <bdi>E11</bdi> is also strong.' },
      ng: { ja: '<bdi>G10</bdi>・<bdi>H11</bdi>とくっつけたり<bdi>G9</bdi>とボウシしたりすると、白は辺で形を整えて根拠を作れます（1目以上の損）。', en: 'Attaching at <bdi>G10</bdi> or <bdi>H11</bdi>, or capping at <bdi>G9</bdi>, lets White settle into shape on the side and make a base (over a point lost).' } },
    { n: 13, moves: ['D4', 'K10', 'D10', 'K4', 'G4', 'C7', 'D7', 'C5'], ok: ['C4'],
      eng: ENG({ top: [{ m: 'C4', n: 147, lead: -0.37 }, { m: 'C8', n: 11, lead: -0.86 }], vals: { C4: -0.47, B6: -2.32, D5: -2.13, C9: -3.83, C3: -2.46, G10: -2.41, K7: -1.76 }, wrong: ['B6', 'D5', 'C9', 'C3', 'G10'] }),
      why: { ja: '左辺の白2子（<bdi>C7</bdi>・<bdi>C5</bdi>）に対し、<bdi>C4</bdi>で下へのヒラキを止めます。左下の黒地が固まり、白は根拠が足りません。', en: 'Against the two white stones on the left (<bdi>C7</bdi>, <bdi>C5</bdi>), <bdi>C4</bdi> stops their extension downward. Black’s lower-left corner is secured, and White lacks a base.' },
      ng: { ja: '<bdi>B6</bdi>や<bdi>D5</bdi>は白を固めるだけ。手を抜いて<bdi>G10</bdi>などに打つと、白に<bdi>C4</bdi>方面へ進まれて2目ほど損です。', en: '<bdi>B6</bdi> or <bdi>D5</bdi> only strengthens White. Tenuki to a point like <bdi>G10</bdi> lets White expand toward <bdi>C4</bdi>, about two points lost.' } },
    { n: 13, moves: ['K11', 'C4', 'L4', 'D11', 'G4', 'L8'], ok: ['L10'], good: ['G11', 'F11', 'D4'], half: ['K9'],
      eng: ENG({ top: [{ m: 'L10', n: 120, lead: 0.32 }, { m: 'D4', n: 18, lead: -0.01 }, { m: 'D10', n: 7, lead: -0.09 }], vals: { L10: 0.33, L6: -0.71, K8: -1, M8: -2.48, L5: -1.27, G11: -0.04, F11: 0, K9: -0.22, D4: 0.12 }, wrong: ['K8', 'M8', 'L5'] }),
      why: { ja: '右辺に来た白<bdi>L8</bdi>を、上から<bdi>L10</bdi>と止めます。右上の黒の隅を守りながら、白の上へのヒラキを奪う一石二鳥の手。下には黒<bdi>L4</bdi>が待っています。', en: 'Block the white stone <bdi>L8</bdi> from above with <bdi>L10</bdi>. It guards Black’s upper-right corner and takes away White’s extension upward at the same time, with black <bdi>L4</bdi> waiting below.' },
      ng: { ja: '<bdi>L5</bdi>と下から近づくと、白に上の<bdi>L10</bdi>方面へヒラかれ、右上の黒の隅がおびやかされます。<bdi>K8</bdi>のツケは白を固めるだけです。', en: 'Approaching from below with <bdi>L5</bdi> lets White extend upward toward <bdi>L10</bdi> and threaten Black’s upper-right corner. The attachment at <bdi>K8</bdi> only strengthens White.' } },
  ] },
// ------------------------------------------------------------------ 2
{ id: 'thickness', course: 'middle',
  title: { ja: '地と厚み', en: 'Territory and thickness' },
  sub: { ja: '三々の地、辺の大場、厚みから離れる', en: 'The 3-3 point, big side points, playing away from thickness' },
  intro: {
    ja: '<p>星の石は外側に強い（<b>厚み</b>）反面、隅の<b>三々</b>が空いています。三々に入れば、相手の陣地の中で確実に<b>地</b>を取りながら生きられます。</p><p>一方、自分の厚みのすぐ近くに打つのは効率が悪い手。厚みはそれだけで十分働いているので、<b>厚みから離れた大場</b>に打ちましょう。</p><p>「地を取る手」と「模様を広げる手」のどちらが大きいか、いつも比べるクセをつけましょう。</p>',
    en: '<p>A hoshi stone is strong toward the outside (<b>thickness</b>), but leaves the <b>3-3 point</b> open. Invading at 3-3, you can live inside the opponent’s sphere while taking sure <b>territory</b>.</p><p>On the other hand, playing right next to your own thickness is inefficient. Thickness already works on its own, so play <b>big points away from it</b>.</p><p>Always compare: which is bigger, the move that takes territory or the move that expands a framework?</p>' },
  goal: { ja: '一番大きなところに打ってください', en: 'Play the biggest point' },
  hint: { ja: '相手の陣地の中で、確実に地になる場所はどこ？', en: 'Inside the opponent’s area, where can you make sure territory?' },
  diagram: { n: 13, moves: ['K10', 'D4', 'K4', 'D10', 'K7', 'D7', 'G10'], marks: [['L11', 'ok'], ['L3', 'ok'], ['H8', 'x']] },
  problems: [
    { n: 13, moves: ['K10', 'D4', 'K4', 'D10', 'K7', 'D7', 'G10'], ok: ['L11', 'L3'],
      eng: ENG({ top: [{ m: 'L11', n: 89, lead: 1.75 }, { m: 'L3', n: 63, lead: 1.83 }], vals: { H8: -0.42, G7: -0.46, L6: 0.53, H7: -0.63, G4: 0.13, L8: 0.15, M7: -0.32, L11: 1.9, L3: 1.8 }, wrong: ['H8', 'G7', 'H7', 'M7'] }),
      why: { ja: '黒の模様は大きく見えますが、星の下の三々<bdi>L11</bdi>・<bdi>L3</bdi>が空いています。三々に入れば地を取りながら生きられます。', en: 'Black’s framework looks big, but the 3-3 points <bdi>L11</bdi> and <bdi>L3</bdi> under the hoshi stones are open. Invading there, White lives while taking territory.' },
      ng: { ja: '<bdi>H8</bdi>や天元<bdi>G7</bdi>の外からの消しは、黒に三々を守られると地の差が開きます（2目以上の差）。', en: 'Reducing from outside at <bdi>H8</bdi> or tengen <bdi>G7</bdi> lets Black protect the 3-3 points, and the territory gap grows (two points or more).' } },
    { n: 13, moves: ['D4', 'K10', 'D10', 'K4', 'G4', 'K7'], ok: ['L11', 'L3'], half: ['G10'],
      eng: ENG({ top: [{ m: 'L11', n: 116, lead: 0.34 }, { m: 'L3', n: 27, lead: 0.11 }, { m: 'F11', n: 8, lead: -0.15 }], vals: { G7: -1.06, H7: -1.08, G10: -0.61, F7: -1.38, E7: -1.84, L11: 0.27, L3: 0.24 }, wrong: ['G7', 'H7', 'F7', 'E7'] }),
      why: { ja: '黒番でも考え方は同じ。白の右辺は大きな模様ですが、星の下の三々<bdi>L11</bdi>・<bdi>L3</bdi>が空いています。入れば地を取りながら生きられます。', en: 'The same idea with Black to play. White’s right side is a big framework, but the 3-3 points <bdi>L11</bdi> and <bdi>L3</bdi> under the hoshi stones are open. Invading there, Black lives while taking territory.' },
      ng: { ja: '天元<bdi>G7</bdi>や<bdi>H7</bdi>で外から消しても、白に三々を守られると右辺がそのまま白地になります。<bdi>E7</bdi>・<bdi>F7</bdi>は自分の厚みのそばで小さい手です。', en: 'Reducing from outside with tengen <bdi>G7</bdi> or <bdi>H7</bdi> lets White protect the 3-3 points, and the right side stays White’s. <bdi>E7</bdi> and <bdi>F7</bdi> are small moves next to Black’s own strength.' } },
    { n: 13, moves: ['K10', 'D4', 'K4', 'D10', 'K7', 'D7', 'L11', 'C3', 'L3', 'C11'], ok: ['F3', 'G4', 'G10', 'G11'], good: ['E7'],
      eng: ENG({ top: [{ m: 'F3', n: 94, lead: -0.17 }, { m: 'E7', n: 15, lead: -0.46 }, { m: 'G11', n: 10, lead: -0.51 }], vals: { G7: -1.49, G10: -0.62, G4: -0.56, H7: -2.19, F7: -1.44, E7: -0.39, J7: -4.36, G11: -0.62, F3: -0.35 }, wrong: ['H7', 'J7'] }),
      why: { ja: '隅が決まったら、次は上下の辺の大場（<bdi>F3</bdi>・<bdi>G4</bdi>・<bdi>G10</bdi>・<bdi>G11</bdi>）です。', en: 'With the corners settled, the next big points are on the top and bottom sides (<bdi>F3</bdi>, <bdi>G4</bdi>, <bdi>G10</bdi>, <bdi>G11</bdi>).' },
      ng: { ja: '<bdi>H7</bdi>・<bdi>J7</bdi>は自分の厚み（右辺の黒3子）に近すぎて、ほとんど地が増えません。厚みからは離れて打ちましょう。', en: '<bdi>H7</bdi> and <bdi>J7</bdi> are too close to Black’s own thickness on the right and add almost nothing. Play away from thickness.' } },
    { n: 13, moves: ['K11', 'C4', 'L4', 'D11', 'L7', 'C7', 'G11', 'G3'], ok: ['J3'], good: ['D4'], half: ['D8', 'E4', 'F8'],
      eng: ENG({ top: [{ m: 'J3', n: 97, lead: 0.29 }, { m: 'D4', n: 34, lead: -0.08 }, { m: 'D10', n: 9, lead: -0.17 }], vals: { G7: -0.86, H8: -1.29, F8: -0.53, K8: -1.91, J8: -1.45, E10: -0.86, D8: -0.38, E4: -0.51, F10: -1.03, J3: 0.23, D4: 0.03 }, wrong: ['K8', 'J8', 'H8', 'F10'] }),
      why: { ja: '右辺の黒（<bdi>K11</bdi>・<bdi>L7</bdi>・<bdi>L4</bdi>）はもう厚い形。そこから離れて、下辺の白<bdi>G3</bdi>に迫る<bdi>J3</bdi>が大きな手です。右下の地を広げながら白をせまくします。', en: 'Black’s right side (<bdi>K11</bdi>, <bdi>L7</bdi>, <bdi>L4</bdi>) is already thick. Play away from it: <bdi>J3</bdi>, closing in on white <bdi>G3</bdi> on the bottom side, is the big move. It widens the lower right while cramping White.' },
      ng: { ja: '<bdi>K8</bdi>や<bdi>J8</bdi>は自分の厚みのすぐそばで、ほとんど地が増えません（1目半以上の損）。厚みからは離れて打ちましょう。', en: '<bdi>K8</bdi> or <bdi>J8</bdi> sits right next to Black’s own thickness and adds almost no territory (over a point and a half lost). Play away from thickness.' } },
    { n: 13, moves: ['C10', 'K4', 'D3', 'K10', 'G3', 'G10', 'L7'], ok: ['L5'], good: ['L9', 'D10', 'D4'],
      eng: ENG({ top: [{ m: 'L5', n: 123, lead: 0.67 }, { m: 'L9', n: 15, lead: 0.16 }, { m: 'D4', n: 10, lead: 0.14 }], vals: { L5: 0.69, L9: 0.28, D10: 0.24, D4: 0.28, L6: -0.43, M6: -0.97, C7: -0.37, G11: -1.57, F9: -1.15, H9: -1.63, D7: -0.54 }, wrong: ['G11', 'F9', 'H9', 'M6'] }),
      why: { ja: '白の右辺は<bdi>L7</bdi>まで広がりましたが、星<bdi>K4</bdi>との間にすき間があります。<bdi>L5</bdi>と打ち込めば、白地を減らしながら生きる余地があります。上の<bdi>L9</bdi>もまずまずです。', en: 'White’s right side has spread to <bdi>L7</bdi>, but there is a gap between it and the hoshi <bdi>K4</bdi>. Invading at <bdi>L5</bdi> reduces White’s territory with room to live. <bdi>L9</bdi> above is also reasonable.' },
      ng: { ja: '<bdi>F9</bdi>・<bdi>H9</bdi>の外からの消しでは、白に右辺のすき間を守られてしまいます。<bdi>G11</bdi>は白<bdi>G10</bdi>のすぐ辺側で広がりがなく、1目半以上の損です。', en: 'Reducing from outside with <bdi>F9</bdi> or <bdi>H9</bdi> lets White close the gap on the right side. <bdi>G11</bdi>, right on the edge side of white <bdi>G10</bdi>, has no room to grow and loses over a point and a half.' } },
  ] },
];
