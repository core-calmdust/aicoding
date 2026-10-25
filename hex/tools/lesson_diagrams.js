// Small explanatory diagrams for the lesson cards / intros (lessons.json steps[].diagram), drawn by the page's miniSVG:
// { n, r: [red cells], b: [blue cells], marks: [[cell, 'ring' | 'dot' | 'ng' | 'x' | 'tri' | 'dash']] }
//   node tools/lesson_diagrams.js lessons.json
const fs = require('fs');
const f = process.argv[2], D = JSON.parse(fs.readFileSync(f, 'utf8'));
const DG = {
  b_connect: { n: 5, r: ['c1', 'c2', 'b3', 'b5'], b: ['d2', 'c4', 'e3'], marks: [['b4', 'ring']] },
  b_block: { n: 5, r: ['c2', 'b4'], b: ['a3', 'b3', 'c3', 'e3'], marks: [['d3', 'ring']] },
  b_bridge: { n: 5, r: ['b2', 'c3'], b: [], marks: [['c2', 'dot'], ['b3', 'dot']] },
  b_save: { n: 5, r: ['b2', 'c3'], b: ['c2'], marks: [['b3', 'ring']] },
  b_edge: { n: 5, r: ['c4'], b: [], marks: [['b5', 'dot'], ['c5', 'dot']] },
  t_double: { n: 5, r: ['d1', 'b5'], b: ['b2', 'd4'], marks: [['c3', 'ring'], ['c2', 'dot'], ['d2', 'dot'], ['b4', 'dot'], ['c4', 'dot']] },
  t_stop: { n: 5, r: ['b2'], b: ['a3', 'c3', 'e2'], marks: [['b3', 'ring'], ['d2', 'dot'], ['d3', 'dot']] },
  t_ladder: { n: 7, r: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'd6', 'e6', 'f7'], b: ['b7', 'c7', 'd7', 'b6'], marks: [['f6', 'ring'], ['e7', 'dot']] },
  t_edge3: { n: 7, r: ['d1', 'd2', 'd3', 'd4', 'd5'], b: [], marks: [['c6', 'dot'], ['d6', 'dot'], ['b7', 'dot'], ['c7', 'ring'], ['d7', 'dot']] },
  s_center: { n: 7, r: [], b: [], marks: [['d4', 'ring'], ['e3', 'dot'], ['c5', 'dot'], ['f2', 'dot'], ['b6', 'dot']] },
  s_swap: { n: 7, r: ['e2'], b: [], marks: [['b5', 'dash']] },
  s_block: { n: 7, r: ['d3'], b: [], marks: [['d5', 'ring'], ['d4', 'ng']] },
  s_plan: { n: 7, r: ['c2', 'd4', 'c6'], b: ['e3', 'b5', 'e5'], marks: [['c5', 'ring']] },
};
for (const st of D.steps) { if (DG[st.id]) st.diagram = DG[st.id]; else delete st.diagram; }
fs.writeFileSync(f, JSON.stringify(D));
console.log('diagrams', Object.keys(DG).length);
