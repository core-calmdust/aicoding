// 大百科の麻雀（riichi/）：レッスンのセリフ点検（クジャクパイの語り）。
//   node riichi/tools/voice-check.js [--dump out.txt]
// 台本（riichi/ls-voice.js SCRIPT）、練習問題の問いかけ、全練習問題の「全部の打牌」への解説（正解・不正解）を、画面と同じ
// voice() に通して点検する。不合格（exit 1）：丁寧語の残り（です・ます…）、小町・雀華・「うち」の自称、AIの評価を理由にする言葉、
// 解説が150字超・台本が174字超（PC 58字×3ページ）。目安（警告）：口ぐせ「クジャ」が全体の20%未満、1つの吹き出しで「〜よ」止めが続く。
'use strict';
const path = require('path'), fs = require('fs');
const M = p => path.join(__dirname, '../../mahjong', p);
global.window = global;
const MJ = require(M('engine.js')); global.MJ = MJ;
const MJGame = require(M('game.js')); global.MJGame = MJGame;
require(M('drills.js'));
global.JANKA_CLASSIC = true;
const LS = require(M('lessons.js')); global.MJLessons = LS; require(M('lesson-talk.js'));
const V = require(path.join(__dirname, '../ls-voice.js')); V.apply(LS);
const T = id => id >> 2, N = t => MJ.NAMES[t];
const out = [], bad = [], warn = [];
let tic = 0, total = 0;
function check(where, raw, max) {
  const s = V.voice(raw); total++; if (/クジャ(?!ク)/.test(s)) tic++;
  out.push(`${where}\n  ${s}`);
  const e = m => bad.push(`${where}: ${m}\n    ${s}`);
  if (/です|ます|ません|ましょ|ください|でしょう|ございま/.test(s)) e('丁寧語が残っている');
  if (/小町|雀華|わたし|(^|[。！ ])うち[、は]/.test(s)) e('小町・雀華の自称');
  if (/評価値|形勢|勝率|AIの|エンジン/.test(s)) e('AIの評価を理由にしている');
  if (/[ぁ-ん]っる|ぬる[。！]|すね[…！。]|ぼくだ！/.test(s)) e('活用の崩れ');
  if (s.length > max) e(`${s.length}字（${max}字まで）`);
  const ends = s.split(/(?<=[。！!♪？?])/).map(x => x.trim()).filter(Boolean).map(x => /よ[。！!♪]$/.test(x));
  for (let i = 1; i < ends.length; i++) if (ends[i] && ends[i - 1]) { warn.push(`${where}: 「〜よ」止めが続く\n    ${s}`); break; }
}
// 1. the script and the lists' words
for (const k in V.SCRIPT) check('台本 ' + k, V.MARK + V.SCRIPT[k], 174);
(async () => {
  // 2. every practice problem: the question, and the words after every possible discard
  for (const ls of LS.LESSONS) for (const [qi, d] of (ls.drills || []).entries()) {
    const b = d.beats[0];
    check(`${ls.id} 問${qi + 1} 問いかけ`, b.say.ja, 174);
    const me = { interactive: true,
      async turn(g) {
        const types = [...new Set(g.P[0].hand.map(T))], act = b.ok && b.ok.riichi ? 'riichi' : 'discard';
        for (const t of types) { const ok = LS.check(b, { act, id: t * 4 }, g, 0); check(`${ls.id} 問${qi + 1} ${ok ? '○' : '×'}${N(t)}`, LS.explain(b, t, g, 0, true, act), 150); }
        g.halt = true; return { act: 'discard', id: g.P[0].hand[0] };
      }, async react() { return { act: 'pass' }; }, async dealSkill() { return false; } };
    const bot = { async turn(g, s, o) { return { act: 'discard', id: o.drawn ?? g.P[s].hand[g.P[s].hand.length - 1] }; }, async react() { return { act: 'pass' }; }, async dealSkill() { return false; } };
    try { const g = new LS.LessonGame({ agents: [me, bot, bot, bot], chars: [{ skill: 'swap', tier: 0 }, null, null, null], seed: 7, oya: 0, rules: { skills: false, length: 'east' }, pos: d.pos, ui: async () => {} }); await g.run(); }
    catch (e) { bad.push(`${ls.id} 問${qi + 1}: ERROR ${e.message}`); }
  }
  const dump = process.argv.indexOf('--dump'); if (dump > 0) fs.writeFileSync(process.argv[dump + 1], out.join('\n') + '\n');
  const r = tic / total;
  console.log(`セリフ ${total}件　口ぐせ ${(r * 100).toFixed(1)}%　不合格 ${bad.length}件　警告 ${warn.length}件`);
  if (r < .2) warn.unshift(`口ぐせ「クジャ」が ${(r * 100).toFixed(1)}%（20%以上が目安）`);
  bad.slice(0, 40).forEach(x => console.log('NG ' + x));
  warn.slice(0, 15).forEach(x => console.log('注意 ' + x));
  process.exit(bad.length ? 1 : 0);
})();
