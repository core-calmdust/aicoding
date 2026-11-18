// 雀華：レッスンの局面の点検（node mahjong/tools/check-lessons.js）。各課題の手牌・正解の集合・最善打牌を表示し、
// 局面が組めない（牌が5枚以上など）・正解が1つもない課題を FAIL にする。
'use strict';
const MJ = require('../engine.js'); global.MJ = MJ;
const MJGame = require('../game.js'); global.MJGame = MJGame;
const LS = require('../lessons.js');
const T = id => id >> 2, N = t => MJ.NAMES[t];
let fail = 0;
(async () => {
  for (const ls of LS.RULES.concat(LS.LESSONS)) {
    const beats = ls.beats.slice(); let k = 0, out = [];
    const me = {
      interactive: true,
      async turn(g, s, o) {
        const b = beats[0] && beats[0].on === 'turn' ? beats.shift() : null;
        const hand = g.P[0].hand.map(T).sort((a, b) => a - b).map(N).join(' ');
        if (!b) return { act: 'discard', id: o.drawn ?? g.P[0].hand[g.P[0].hand.length - 1] };
        const types = [...new Set(g.P[0].hand.map(T))];
        let acc;
        if (b.ok && b.ok.act) {
          const can = b.ok.act === 'tsumo' ? o.canTsumo : b.ok.act === 'riichi' ? (o.riichi && o.riichi.some(x => !b.ok.d || MJ.parse(b.ok.d).includes(T(x)))) : b.ok.act === 'skill' ? o.canSkill : true;
          acc = b.ok.act + (can ? ' (ok)' : ' (NOT AVAILABLE)'); if (!can) { fail++; }
          out.push(`  turn: [${hand}] → ${acc}`);
          if (b.ok.act === 'tsumo') return { act: 'tsumo' };
          if (b.ok.act === 'riichi') { const id = o.riichi.find(x => !b.ok.d || MJ.parse(b.ok.d).includes(T(x))); return { act: 'riichi', id }; }
          if (b.ok.act === 'skill') return { act: 'skill', slot: 0 };
          return { act: 'discard', id: o.drawn };
        }
        acc = types.filter(t => LS.check(b, { act: b.ok && b.ok.riichi ? 'riichi' : 'discard', id: t * 4 }, g, 0));
        const bu = LS.bestDiscards(g, 0, 'ukeire'), bs = LS.bestDiscards(g, 0, 'shanten');
        const tb = LS.discardTable(g, 0).map(([d, sh, uk]) => `${N(d)}:${sh}/${uk}`).join(' ');
        out.push(`  turn: [${hand}] accept {${acc.map(N).join(' ')}}  bestUk {${bu.map(N).join(' ')}}  bestSh {${bs.map(N).join(' ')}}\n        ${tb}`);
        if (!acc.length) { fail++; out.push('  FAIL: no accepted discard'); }
        const id = g.P[0].hand.find(x => T(x) === acc[0]);
        if (b === ls.beats[ls.beats.length - 1] && ls.end === 'beats') g.halt = true;
        return { act: b.ok && b.ok.riichi ? 'riichi' : 'discard', id };
      },
      async react(g, s, o) {
        const b = beats[0] && beats[0].on === 'react' ? beats.shift() : null;
        if (!b) return { act: 'pass' };
        const can = b.ok.act === 'ron' ? o.canRon : b.ok.act === 'pon' ? !!o.pons : b.ok.act === 'chi' ? !!o.chis : true;
        out.push(`  react ${N(T(o.tile))} from ${o.from}: ${b.ok.act} ${can ? '(ok)' : '(NOT AVAILABLE)'}`); if (!can) fail++;
        return b.ok.act === 'pon' ? { act: 'pon', use: o.pons[0] } : b.ok.act === 'chi' ? { act: 'chi', use: o.chis[0] } : { act: b.ok.act };
      },
      async dealSkill() { return false; },
    };
    const bot = { async turn(g, s, o) { return { act: 'discard', id: o.drawn ?? g.P[s].hand[g.P[s].hand.length - 1] }; }, async react() { return { act: 'pass' }; }, async dealSkill() { return false; } };
    const chars = [{ skill: 'swap', tier: 0 }, null, null, null];
    let ev = [];
    try {
      const g = new LS.LessonGame({ agents: [me, bot, bot, bot], chars, seed: 7, oya: 0, rules: { skills: !!ls.pos.skills, length: 'east' }, pos: ls.pos, ui: async (e, d) => { if (e === 'agari' || e === 'ryuukyoku') ev.push(e + (d.results ? ' ' + d.results.map(r => r.res.list.map(x => x[0]).join('+') + ' ' + r.moves.reduce((a, m) => a + m[1], 0)).join(',') : '')); } });
      await g.run();
      if (beats.length) { fail++; out.push(`  FAIL: ${beats.length} beat(s) never reached`); }
    } catch (e) { fail++; out.push('  FAIL ' + e.message); }
    console.log(`${ls.id} ${ls.title.ja}${ev.length ? '  → ' + ev.join(' / ') : ''}\n${out.join('\n')}`);
  }
  console.log(fail ? fail + ' FAIL' : 'ok'); process.exit(fail ? 1 : 0);
})();
