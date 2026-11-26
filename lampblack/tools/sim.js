#!/usr/bin/env node
/* 狼影灯 — 推理の公平性シミュレーション
   usage: node lampblack/tools/sim.js [story] [--n 300] [--diff 0,1,2,3] [--verbose]
   プレイヤー役を「探偵ボット」（プレイヤーと同じ情報だけで可能世界を数えて投票する）と「でたらめ投票」にやらせ、
   難易度ごとの勝率・日数・初日の確信度などを出す。基準（claude/lampblack-spec.md「推理の公平性の基準」）を外れたら exit 1。 */
const W = require('./load.js');
const E = W.WLEngine;
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const N = +(opt('n') || 300);
const diffs = (opt('diff') || '0,1,2,3,4').split(',').map(Number);
const stories = args[0] && !args[0].startsWith('--') ? [args[0]] : Object.keys(W.WL_STORIES);
const verbose = args.includes('--verbose');

// the bar: detective win rate per difficulty, and the random voter must lose clearly more often
const BAR = { det: [[.7, 1], [.65, 1], [.6, .95], [.5, .9], [.42, .8]], rnd: [.38, .32, .25, .2, .15], gap: .3, day1: .9 };   // 2026-11-25：村まかせ（でたらめ投票）で勝てないことを基準に加えた   // 2026-11-25：死んでも幽霊で続くので上限を広げた   // the bot reasons perfectly: a person wins less

function playBot(story, diff, seed, smart, naive) {   // naive: 調べて痕跡も示すが、推理はせず、占いの黒と村の空気に従って投票する（推理の難しさを測る）
  const S = E.newGame(story, { diff, seed });
  let day1conf = 0, guard = 0;
  for (let day = 1; day < 12; day++) {
    S.day = day;
    // investigate
    E.npcSearch(S, story);
    const n = S.nights.length - 1, NN = S.nights[n];
    const dead = !S.people[0].alive;
    if (dead) S.pl.ap = 0;
    while (S.pl.ap > 0) {
      if ((smart || naive) && NN.killer && NN.traces.some((t, i) => !t.gone && !S.pl.found.includes(n + '|' + i))) { E.search(S, story, NN.loc); continue; }
      if (smart && S.items.some(it => !it.taken && S.day >= it.day) && W.WL_STORIES && Math.random() < .3) { const it = S.items.find(x => !x.taken && S.day >= x.day); E.search(S, story, it.loc); continue; }
      if (smart && story.foxLoc && !S.foxGone && !S.pl.foxLook) { const r = E.search(S, story, story.foxLoc); if (!['trace', 'item', 'got', 'gone'].includes(r.k)) S.pl.foxLook = 1; continue; }   // a player searches the shrine until it gives up its signs
      const ppl = E.alive(S).filter(p => !p.isPlayer && !(S.pl.talked[p.id] === S.day));
      if (!ppl.length) break;
      const p = ppl[Math.floor(Math.random() * ppl.length)];
      E.ask(S, story, p.id, 'night');
    }
    // meeting
    if ((smart || naive) && !dead) { for (const k of S.pl.found) E.present(S, story, k); if ((S.pl.role === 'seer' || S.pl.role === 'medium') && (day >= 2 || S.pl.res.some(r => r.res === 'wolf'))) E.playerClaim(S); E.playerResults(S); }
    E.meeting(S, story);
    if (smart && !dead && story.foxLoc) for (const c of E.contradictions(S, story)) E.pointOut(S, story, c.id);   // the fox is found by its lie about the night
    if (smart && (!dead || (S.ghost && S.ghost.whisper))) { const A = E.analyze(S, 'you'); if (S.foxHunt) { const fv = E.foxView(S, story, 'you') || {}; for (const k in A.p) A.p[k] = (fv[k] || 0) * 1.5; } const t = E.alive(S).filter(p => !p.isPlayer).sort((a, b) => A.p[b.id] - A.p[a.id])[0]; if (t && A.p[t.id] > .3) { S.pl.accuse = { day, target: t.id, ev: S.pl.found.length > 0 }; if (dead) S.ghost.whisper = 0; } }
    // vote
    const live = E.alive(S).filter(p => !p.isPlayer);
    let pv;
    if (smart) {
      const A = E.analyze(S, 'you'), fv = E.foxView(S, story, 'you');
      const gone = S.people.filter(p => p.death && p.death.cause === 'exile' && S.pl.res.concat(...S.claims.filter(c => c.role === 'medium').map(c => c.res)).some(r => r.target === p.id && r.res === 'wolf')).length;
      const sc = id => (S.foxHunt ? 0 : A.p[id]) + (fv ? (fv[id] || 0) * (.2 + .8 * gone / S.wolves.length) : 0);   // the fox has to go too
      pv = live.slice().sort((a, b) => sc(b.id) - sc(a.id))[0].id;
      if (day === 1) day1conf = Math.max(...live.map(p => A.p[p.id]));
    } else if (naive) {
      const black = S.claims.filter(c => c.role === 'seer' && E.person(S, c.by).alive).flatMap(c => c.res).filter(r => r.res === 'wolf' && E.person(S, r.target).alive && r.target !== 'you').map(r => r.target);
      const P = E.analyze(S, 'pub');
      pv = black.length ? black[black.length - 1] : live.slice().sort((a, b) => P.p[b.id] - P.p[a.id])[0].id;
    } else pv = live[Math.floor(Math.random() * live.length)].id;
    let r = E.voteRound(S, story, pv);
    const rounds = [r];
    if (r.top.length > 1) { const rv = r.top.includes(pv) ? pv : r.top[0]; r = E.voteRound(S, story, rv, r.top); rounds.push(r); }
    const out = r.top.length > 1 ? r.top[Math.floor(Math.random() * r.top.length)] : r.top[0];
    E.exile(S, out, rounds, r.top.length > 1);
    if (E.check(S)) break;
    // night
    const act = {};
    if (S.pl.role === 'seer') { const A = E.analyze(S, 'you'); const done = new Set(S.pl.res.map(x => x.target)); const c = E.alive(S).filter(p => !p.isPlayer && !done.has(p.id)).sort((a, b) => A.p[b.id] - A.p[a.id]); if (c.length) act.divine = c[0].id; }
    if (S.pl.role === 'guard') { const c = S.claims.filter(x => x.by !== 'you' && E.person(S, x.by).alive); act.guard = c.length ? c[0].by : live[0].id; }
    S.day = day + 1;
    E.night(S, story, act);
    if (S.nights[S.nights.length - 1].saved) guard++;
    if (E.check(S)) break;
    S.pl.ap = S.pl.apMax; S.pl.asks = 3; S.pl.foxLook = 0;
  }
  return { S, win: S.result && S.result.win, why: (S.result && S.result.why) + (S.ghost ? '+ghost' : ''), days: S.day, day1conf, guard, seerDead: S.pl.role === 'seer' && S.pl.co && S.ghost ? 1 : 0, seerCo: S.pl.role === 'seer' && S.pl.co ? 1 : 0 };
}

let fail = 0;
for (const sid of stories) {
  const story = W.WL_STORIES[sid];
  console.log(`\n■ ${story.title}`);
  // trait combos must tell people apart
  const combos = {}; for (const c of story.chars) { const k = E.CATS.map(x => c.traits[x]).join('/'); (combos[k] = combos[k] || []).push(c.name); }
  const dup = Object.values(combos).filter(v => v.length > 1);
  const dist = {}; for (const cat of E.CATS) { dist[cat] = {}; for (const c of story.chars) dist[cat][c.traits[cat]] = (dist[cat][c.traits[cat]] || 0) + 1; }
  console.log('  特徴の分布', JSON.stringify(dist), dup.length ? '  同じ組み合わせ: ' + dup.map(v => v.join('=')).join(', ') : '');
  for (const d of diffs) {
    let w = 0, rw = 0, nw = 0, days = 0, conf = 0, why = {}, t0 = Date.now(), gd = 0, sc = 0, sd = 0;
    for (let i = 0; i < N; i++) {
      const r = playBot(story, d, 1000 + i * 7919 + d, true); if (r.win) w++; days += r.days; conf += r.day1conf; why[r.why] = (why[r.why] || 0) + 1; gd += r.guard; sc += r.seerCo; sd += r.seerDead;
      const q = playBot(story, d, 1000 + i * 7919 + d, false); if (q.win) rw++;
      const nv = playBot(story, d, 1000 + i * 7919 + d, false, true); if (nv.win) nw++;
    }
    const det = w / N, rnd = rw / N, c1 = conf / N;
    const [lo, hi] = BAR.det[d];
    const ok = det >= lo && det <= hi && det - rnd >= BAR.gap && rnd <= BAR.rnd[d] && c1 <= BAR.day1;
    if (!ok) fail++;
    console.log(`  ${['入門', '標準', '中級', '上級', '悪夢'][d]}(${E.DIFF[d].size}人)  探偵 ${(det * 100).toFixed(0)}%  素直 ${(nw / N * 100).toFixed(0)}%  でたらめ ${(rnd * 100).toFixed(0)}%  平均${(days / N).toFixed(1)}日  初日の確信 ${(c1 * 100).toFixed(0)}%  護衛成功 ${(gd / N).toFixed(2)}/局  名乗った占い師の死 ${sd}/${sc}  結末 ${JSON.stringify(why)}  ${ok ? 'OK' : '★基準外'}  (${((Date.now() - t0) / N / 2).toFixed(0)}ms/局)`);
  }
}
process.exit(fail ? 1 : 0);
