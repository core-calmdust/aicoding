// 雀華：練習問題の解説を全部書き出す（node mahjong/tools/dump-explain.js [lessonId...] > out.txt）。
// 各問題の手牌・正解・小町の正解の解説と、いちばん迷いやすい不正解の解説。解説の見直し用（2026-11-20、ユーザー「解説がワンパターン、全レッスン見直して」）。
'use strict';
const MJ = require('../engine.js'); global.MJ = MJ;
const MJGame = require('../game.js'); global.MJGame = MJGame;
global.window = global; require('../drills.js');
const LS = require('../lessons.js'); global.MJLessons = LS; require('../lesson-talk.js');
const T = id => id >> 2, N = t => MJ.NAMES[t];
const only = process.argv.slice(2);
(async () => {
  for (const ls of LS.LESSONS) { if (only.length && !only.includes(ls.id)) continue;
    for (const [k, d] of (ls.drills || []).entries()) {
      const b = d.beats[0]; let out = '';
      const me = { interactive: true,
        async turn(g, s, o) {
          const types = [...new Set(g.P[0].hand.map(T))];
          const act = b.ok && b.ok.riichi ? 'riichi' : 'discard';
          const acc = types.filter(t => LS.check(b, { act, id: t * 4 }, g, 0));
          const tb = LS.discardTable(g, 0), wrong = tb.filter(r => !acc.includes(r[0])).sort((x, y) => (x[1] - y[1]) || (y[2] - x[2]));
          out += `  手 [${g.P[0].hand.map(T).sort((a, c) => a - c).map(N).join(' ')}]  正解 {${acc.map(N).join(' ')}}\n`;
          out += `  ○ ${LS.explain(b, acc[0], g, 0, true, act)}\n`;
          for (const w of wrong.slice(0, 2)) out += `  × ${N(w[0])}: ${LS.explain(b, w[0], g, 0, true, act)}\n`;
          g.halt = true; return { act, id: g.P[0].hand.find(x => T(x) === acc[0]) };
        }, async react() { return { act: 'pass' }; }, async dealSkill() { return false; } };
      const bot = { async turn(g, s, o) { return { act: 'discard', id: o.drawn ?? g.P[s].hand[g.P[s].hand.length - 1] }; }, async react() { return { act: 'pass' }; }, async dealSkill() { return false; } };
      try { const g = new LS.LessonGame({ agents: [me, bot, bot, bot], chars: [{ skill: 'swap', tier: 0 }, null, null, null], seed: 7, oya: 0, rules: { skills: false, length: 'east' }, pos: d.pos, ui: async () => {} }); await g.run(); }
      catch (e) { out += '  ERROR ' + e.message + '\n'; }
      console.log(`${ls.id} ${ls.title.ja} 問題${k + 1}（lv${d.lv}）\n${out}`);
    } }
})();
