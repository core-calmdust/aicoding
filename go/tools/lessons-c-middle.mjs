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
    { n: 13, moves: S1.concat(['L9']), ok: ['L10'], good: ['L6'],
      eng: ENG({ top: [{ m: 'L10', n: 146, lead: -0.26 }, { m: 'L6', n: 13, lead: -0.78 }], vals: { L10: -0.33, M8: -2.31, L8: -3.98, K9: -2.31, L6: -0.82, L5: -3.85, G4: -2.48 }, wrong: ['M8', 'L8', 'K9', 'L5', 'G4'] }),
      why: { ja: '白が上へヒラいてきたら、<bdi>L10</bdi>で隅を守りながら白の根拠を狭めます。<bdi>L6</bdi>で下側を止めるのも有力です。', en: 'White extended upward, so <bdi>L10</bdi> guards the corner and narrows White’s base. Blocking the lower side with <bdi>L6</bdi> is also strong.' },
      ng: { ja: '<bdi>L8</bdi>のツケは白を固めるだけ、<bdi>K9</bdi>は外から押す手で、どちらも2目以上の損です。', en: 'The attachment at <bdi>L8</bdi> only strengthens White, and <bdi>K9</bdi> pushes from outside; both lose two points or more.' } },
    { n: 13, moves: ['D4', 'K10', 'D10', 'K4', 'G4', 'C7', 'D7', 'C5'], ok: ['C4'],
      eng: ENG({ top: [{ m: 'C4', n: 147, lead: -0.37 }, { m: 'C8', n: 11, lead: -0.86 }], vals: { C4: -0.47, B6: -2.32, D5: -2.13, C9: -3.83, C3: -2.46, G10: -2.41, K7: -1.76 }, wrong: ['B6', 'D5', 'C9', 'C3', 'G10'] }),
      why: { ja: '左辺の白2子（<bdi>C7</bdi>・<bdi>C5</bdi>）に対し、<bdi>C4</bdi>で下へのヒラキを止めます。左下の黒地が固まり、白は根拠が足りません。', en: 'Against the two white stones on the left (<bdi>C7</bdi>, <bdi>C5</bdi>), <bdi>C4</bdi> stops their extension downward. Black’s lower-left corner is secured, and White lacks a base.' },
      ng: { ja: '<bdi>B6</bdi>や<bdi>D5</bdi>は白を固めるだけ。手を抜いて<bdi>G10</bdi>などに打つと、白に<bdi>C4</bdi>方面へ進まれて2目ほど損です。', en: '<bdi>B6</bdi> or <bdi>D5</bdi> only strengthens White. Tenuki to a point like <bdi>G10</bdi> lets White expand toward <bdi>C4</bdi>, about two points lost.' } },
    { n: 13, moves: S1.concat(['L5', 'L4', 'K5']), ok: ['J5', 'J4', 'H3'], good: ['L8'], half: ['G4'],
      eng: ENG({ top: [{ m: 'J5', n: 81, lead: -0.11 }, { m: 'J4', n: 38, lead: -0.46 }, { m: 'H3', n: 20, lead: -0.26 }], vals: { M5: -1.16, M6: -3.1, K3: -4.01, L8: -0.64, L9: -2.24, J5: -0.11, G4: -1.03, J4: -0.24, H3: -0.23 }, wrong: ['M6', 'K3', 'L9'] }),
      why: { ja: '白は<bdi>K5</bdi>と押して中央・下辺へ出ようとしています。<bdi>J5</bdi>（または<bdi>J4</bdi>・<bdi>H3</bdi>）で行く手をふさげば、白はまだ根拠も逃げ道もありません。', en: 'White pushed at <bdi>K5</bdi> to get out toward the centre and the bottom. Blocking the way with <bdi>J5</bdi> (or <bdi>J4</bdi>, <bdi>H3</bdi>) leaves White with neither a base nor an exit.' },
      ng: { ja: '<bdi>M6</bdi>や<bdi>K3</bdi>は小さく、白に<bdi>J5</bdi>方面へ出られて攻めが空振りになります（2〜4目の損）。', en: '<bdi>M6</bdi> or <bdi>K3</bdi> is small; White gets out toward <bdi>J5</bdi> and the attack fizzles (two to four points lost).' } },
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
    { n: 13, moves: ['K10', 'D4', 'K4', 'D10', 'K7', 'D7'], ok: ['C11', 'C3'], good: ['E7'],
      eng: ENG({ top: [{ m: 'C11', n: 77, lead: -0.08 }, { m: 'C3', n: 75, lead: -0.09 }], vals: { G7: -2.57, G10: -1.76, G4: -1.73, F7: -2.4, H7: -3.17, E7: -0.9, C11: -0.11, C3: 0 }, wrong: ['G7', 'F7', 'H7', 'G10', 'G4'] }),
      why: { ja: '黒番でも同じ考え方。白の星の下の三々<bdi>C11</bdi>・<bdi>C3</bdi>に入るのが一番大きな手です（白の壁に近づく<bdi>E7</bdi>もまずまず）。', en: 'The same idea with Black to play: the 3-3 points under White’s hoshi, <bdi>C11</bdi> and <bdi>C3</bdi>, are the biggest moves (approaching White’s wall at <bdi>E7</bdi> is also reasonable).' },
      ng: { ja: '天元<bdi>G7</bdi>や<bdi>H7</bdi>で模様を広げても、白に三々を守られると地で遅れます。', en: 'Expanding the framework with tengen <bdi>G7</bdi> or <bdi>H7</bdi> falls behind in territory once White protects the 3-3 points.' } },
    { n: 13, moves: ['K10', 'D4', 'K4', 'D10', 'K7', 'D7', 'L11', 'C3', 'L3', 'C11'], ok: ['F3', 'G4', 'G10', 'G11'], good: ['E7'],
      eng: ENG({ top: [{ m: 'F3', n: 94, lead: -0.17 }, { m: 'E7', n: 15, lead: -0.46 }, { m: 'G11', n: 10, lead: -0.51 }], vals: { G7: -1.49, G10: -0.62, G4: -0.56, H7: -2.19, F7: -1.44, E7: -0.39, J7: -4.36, G11: -0.62, F3: -0.35 }, wrong: ['H7', 'J7'] }),
      why: { ja: '隅が決まったら、次は上下の辺の大場（<bdi>F3</bdi>・<bdi>G4</bdi>・<bdi>G10</bdi>・<bdi>G11</bdi>）です。', en: 'With the corners settled, the next big points are on the top and bottom sides (<bdi>F3</bdi>, <bdi>G4</bdi>, <bdi>G10</bdi>, <bdi>G11</bdi>).' },
      ng: { ja: '<bdi>H7</bdi>・<bdi>J7</bdi>は自分の厚み（右辺の黒3子）に近すぎて、ほとんど地が増えません。厚みからは離れて打ちましょう。', en: '<bdi>H7</bdi> and <bdi>J7</bdi> are too close to Black’s own thickness on the right and add almost nothing. Play away from thickness.' } },
    { n: 13, moves: ['K10', 'D4', 'K4', 'D10', 'K7', 'D7', 'L11', 'C3', 'L3', 'C11', 'G10'], ok: ['G11', 'G3', 'G4', 'H3'],
      eng: ENG({ top: [{ m: 'G3', n: 54, lead: 0.64 }, { m: 'G4', n: 49, lead: 0.62 }, { m: 'H3', n: 27, lead: 0.57 }], vals: { G4: 0.65, G7: -0.75, H8: -0.15, F8: -1.04, J8: -1.07, F4: -0.71, G11: 1.03, E7: -3.23, G3: 0.87, H3: 0.69 }, wrong: ['F8', 'J8', 'E7'] }),
      why: { ja: '黒が上辺に<bdi>G10</bdi>と広げました。その下の<bdi>G11</bdi>への打ち込みか、空いている下辺の大場（<bdi>G3</bdi>・<bdi>G4</bdi>・<bdi>H3</bdi>）が大きな手です。', en: 'Black expanded on the top with <bdi>G10</bdi>. Invading under it at <bdi>G11</bdi>, or taking the open bottom side (<bdi>G3</bdi>, <bdi>G4</bdi>, <bdi>H3</bdi>), are the big moves.' },
      ng: { ja: '<bdi>E7</bdi>は自分の厚みに近すぎる手、<bdi>F8</bdi>・<bdi>J8</bdi>は中途半端な消しです。', en: '<bdi>E7</bdi> is too close to White’s own thickness; <bdi>F8</bdi> and <bdi>J8</bdi> are half-hearted reductions.' } },
    { n: 13, moves: ['K10', 'D4', 'K4', 'D10', 'K7', 'D7', 'L11', 'C3', 'L3', 'C11', 'G10', 'G4'], ok: ['E11', 'G3', 'H3'], good: ['F11', 'E7'],
      eng: ENG({ top: [{ m: 'E11', n: 129, lead: -0.76 }, { m: 'H3', n: 7, lead: -1.14 }], vals: { G11: -3.43, G3: -0.59, F11: -1.35, H3: -0.82, G7: -2.22, E7: -1.45, H7: -3.4, F7: -1.73, E11: -0.56 }, wrong: ['G11', 'H7', 'G7'] }),
      why: { ja: '上辺を<bdi>E11</bdi>と白の方へ広げるか、下辺の白<bdi>G4</bdi>の下<bdi>G3</bdi>（<bdi>H3</bdi>）に打ち込むのが大きい。どちらも地の差を広げる手です。', en: 'Expanding the top side toward White with <bdi>E11</bdi>, or invading under white <bdi>G4</bdi> at <bdi>G3</bdi> (<bdi>H3</bdi>), is big. Both widen the territory gap.' },
      ng: { ja: '<bdi>G11</bdi>と自分の上辺を守る手や、厚みの近くの<bdi>H7</bdi>は小さく、2目以上の損です。', en: 'Guarding your own top side with <bdi>G11</bdi>, or <bdi>H7</bdi> next to your own thickness, is small — two points or more lost.' } },
  ] },
];
