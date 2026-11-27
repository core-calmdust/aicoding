/* 狼影灯 LAMPBLACK WEREWOLF — game engine (no DOM; shared by the page and the node tools in lampblack/tools/)
   A single-player werewolf mystery. Every play deals new roles to the same story; the wolves leave traces,
   people talk, and the player finds the wolves by reasoning.

   The promises the game keeps (shown to the player as 「この物語の約束」):
     1. 痕跡は嘘をつかない — a trace at a scene always describes the wolf who killed that night.
     2. 物は嘘をつくことがある — a belonging found at a scene may have been planted by the wolves.
     3. 人間は他人のことで嘘をつかない — innocents never lie about what they saw; to hide a secret they may lie about
        where THEY were.  Wolves and the madman may lie about anything.

   NPC reasoning enumerates every possible wolf set (≤ C(12,3) = 220 worlds), keeps those that fit the hard facts the
   observer holds, and weighs the rest by the soft facts (claims, sightings, reports).  The same analysis drives the
   NPCs' opinions and votes, the wolves' choice of victim, and the fairness simulation (tools/sim.js). */
(function (root) {
  'use strict';

  /* ---------- rules ---------- */
  const ROLE = { wolf: 'wolf', madman: 'madman', seer: 'seer', medium: 'medium', guard: 'guard', mason: 'mason', fox: 'fox', immoral: 'immoral', cat: 'cat', villager: 'villager' };
  const SETUP = {
    8:  { wolf: 2, madman: 0, seer: 1, medium: 1, guard: 0 },
    10: { wolf: 2, madman: 1, seer: 1, medium: 1, guard: 1 },
    11: { wolf: 3, madman: 0, seer: 1, medium: 1, guard: 1 },   // 2026-11-26：中級
    12: { wolf: 3, madman: 1, seer: 1, medium: 1, guard: 1 },
    13: { wolf: 3, madman: 2, seer: 1, medium: 1, guard: 1 },   // 2026-11-26：悪夢は狼を3匹に減らし（運の要素を減らす）、狂人ふたりと嘘・罠で推理をむずかしくする
  };
  // the stories' variations (story.rules): 霧鐘村 is the standard village.
  //   mason — 北辰号: no guard; two who share a compartment know each other to be human (共有者)
  //   fox   — 灯ヶ崎: a fox of the shrine (妖狐). Fangs cannot kill it; a seer's reading burns it to death.
  //           If it lives when the game ends, it alone wins — the village loses even with every wolf gone.
  const SETUPS = {
    std: SETUP,
    mason: {
      8:  { wolf: 2, madman: 0, seer: 1, medium: 1, guard: 0, mason: 2 },   // 2026-11-26：入門は狂人なし（標準より易しく）
      10: { wolf: 2, madman: 1, seer: 1, medium: 1, guard: 0, mason: 2 },
      11: { wolf: 3, madman: 0, seer: 1, medium: 1, guard: 0, mason: 2 },   // 2026-11-26：中級
      12: { wolf: 3, madman: 1, seer: 1, medium: 1, guard: 0, mason: 2 },
      13: { wolf: 3, madman: 1, seer: 1, medium: 1, guard: 0, mason: 2 },   // 2026-11-26：悪夢は狼を3匹に減らし（運の要素を減らす）、嘘と罠で推理をむずかしくする
    },
    immoral: {   // 霧笛座: the fox and the one who serves it (背徳者). When the fox dies, the immoral follows it the same night
      8:  { wolf: 2, madman: 0, seer: 1, medium: 1, guard: 1, fox: 1, immoral: 0 },   // 2026-11-26：入門は背徳者なし（背徳者入りでは標準よりむずかしかった）
      10: { wolf: 2, madman: 0, seer: 1, medium: 1, guard: 1, fox: 1, immoral: 1 },
      11: { wolf: 3, madman: 0, seer: 1, medium: 1, guard: 1, fox: 1, immoral: 1 },   // 2026-11-26：中級
      12: { wolf: 3, madman: 1, seer: 1, medium: 1, guard: 1, fox: 1, immoral: 1 },
      13: { wolf: 3, madman: 1, seer: 1, medium: 1, guard: 1, fox: 1, immoral: 1 },   // 2026-11-26：悪夢は狼を3匹に減らし（運の要素を減らす）、嘘と罠で推理をむずかしくする
    },
    fox: {
      8:  { wolf: 2, madman: 0, seer: 1, medium: 1, guard: 1, fox: 1 },   // 2026-11-26：入門にも狩人（なしでは標準とむずかしさが変わらなかった）
      10: { wolf: 2, madman: 1, seer: 1, medium: 1, guard: 1, fox: 1 },
      11: { wolf: 3, madman: 0, seer: 1, medium: 1, guard: 1, fox: 1 },   // 2026-11-26：中級
      12: { wolf: 3, madman: 1, seer: 1, medium: 1, guard: 1, fox: 1 },
      13: { wolf: 3, madman: 1, seer: 1, medium: 1, guard: 1, fox: 1 },   // 2026-11-26：悪夢は狼を3匹に減らし（運の要素を減らす）、嘘と罠で推理をむずかしくする
    },
    //   cat     — 猫鳴き湯: a nekomata (猫又) on the village side. Sent to the jail, it drags one of those who voted for it;
    //             bitten, it drags one of the wolves.
    cat: {
      8:  { wolf: 2, madman: 1, seer: 1, medium: 1, guard: 0, cat: 1 },   // the cat helps the village: a madman more on 入門, a third wolf on 標準
      10: { wolf: 3, madman: 0, seer: 1, medium: 1, guard: 1, cat: 1 },
      11: { wolf: 3, madman: 1, seer: 1, medium: 1, guard: 0, cat: 1 },   // 2026-11-26：中級
      12: { wolf: 3, madman: 2, seer: 1, medium: 1, guard: 1, cat: 1 },   // 2026-11-26：狼3匹＋狂人ふたり（狼4匹は運の要素が大きい。上級から嘘つきが手ごわくなる）
      13: { wolf: 3, madman: 2, seer: 1, medium: 1, guard: 1, cat: 1 },   // 2026-11-26：悪夢は上級と同じ顔ぶれで、嘘と罠がさらに手ごわい
    },
    //   fanatic — 白嶺修道院: the madman is a fanatic (狂信者) who knows the wolves (they do not know them).
    //             Its lies cover the wolves; it is there from the easiest level.
    fanatic: {
      8:  { wolf: 2, madman: 0, seer: 1, medium: 1, guard: 0 },   // 2026-11-26：入門は狂信者なし（狼2匹＋狂信者では標準よりむずかしかった。狼1匹では易しすぎた）
      10: { wolf: 2, madman: 1, seer: 1, medium: 1, guard: 1 },
      11: { wolf: 2, madman: 2, seer: 1, medium: 1, guard: 0 },   // 2026-11-26：中級は狂信者ふたり（狼3匹では上級と変わらず、狼2匹＋狂信者ひとりでは標準より易しかった）
      12: { wolf: 3, madman: 1, seer: 1, medium: 1, guard: 1 },
      13: { wolf: 3, madman: 1, seer: 1, medium: 1, guard: 1 },   // 2026-11-26：悪夢は狼を3匹に減らし（運の要素を減らす）、嘘と罠で推理をむずかしくする
    },
  };
  const setupOf = (story, size) => Object.assign({ mason: 0, fox: 0, immoral: 0, cat: 0 }, (SETUPS[story && story.rules] || SETUP)[size]);
  const RS = S => S.R || setupOf(null, S.size);
  const PUB = S => S.hid ? S.pub : RS(S);   // the roles everyone can count on (on 上級・悪夢: only what might be there)
  // difficulty: size, action points, traces left per attack, how often the wolves come for the player,
  // how often they plant a belonging, how often the weather wipes a trace, how far a figure is seen
  const DIFF = [   // 2026-11-25：村まかせでも勝ててしまうので、村の推理を弱め、痕跡を減らした（あなたの働きで勝敗が決まるように）
    // 2026-11-27：むずかしさを一段ずつ下げ（旧標準→入門・旧中級→標準・旧上級→中級）、上級と悪夢は「狼の数のほかは、誰がいるかわからない」にした
    { id: 0, cunning: 0, size: 10, ap: 3, traces: 1, neg: .5,  player: .3,   plant: .4,  drop: .12, erase: .3,  adj: .2,  npcFind: .1,  fakeSeer: .9,  assist: true,   wit: .05, sway: 1.0 },
    { id: 1, cunning: .7, size: 11, ap: 3, traces: 1, neg: .52, player: .35, plant: .4, drop: .12, erase: .3, adj: .2, npcFind: .14, fakeSeer: .85, assist: false, wit: .16, sway: 1.0 },   // 嘘つきの「いつもの口ぶり」が透けないよう、巧い嘘つきは中級と同じ割合。そのぶん痕跡・目撃・村の推理はやさしい
    { id: 2, cunning: .7, size: 12, ap: 3, traces: 1, neg: .6,  player: .45,  plant: .45, drop: .1,  erase: .35, adj: .17, npcFind: .15, fakeSeer: .8,  assist: false, wit: .16, sway: .9 },
    // 2026-11-28 上級：配役・嘘の巧さはそのまま、証拠を増やして憶測を減らす（2つ目の痕跡 .75・否定形と罠の物を減らす・消えにくく・目撃と村の発見を少し増やす）
    // hide: 役の伏せ方。狼の数だけは知らされ、ほかの役はくじ（mad: 狂人 0〜3人の重み、ほかは登場する確率）
    { id: 3, cunning: .85, size: 13, ap: 3, traces: 1, trace2: .75, neg: .6, player: .45, plant: .45, drop: .13, erase: .25, adj: .19, npcFind: .15, fakeSeer: .9, assist: false, wit: .1, sway: .75,
      hide: { mad: [1, 1, 0, 0], seer: 1, medium: .75, guard: .65, mason: .8, fox: .8, immoral: .65, cat: .8 } },
    { id: 4, cunning: 1, size: 13, ap: 3, traces: 1, neg: .85, player: .45, plant: .75, drop: .08, erase: .3,  adj: .15, npcFind: .12, fakeSeer: 1,   assist: false, wit: .08, sway: .7, nightmare: true,
      hide: { mad: [1, 3, 3, 0], seer: .85, medium: .7, guard: .6, mason: .7, fox: .75, immoral: .6, cat: .75 } },
  ];
  const CATS = ['height', 'hand', 'foot', 'mark'];

  /* ---------- seeded random (state lives in the save) ---------- */
  function rnd(S) { let t = (S.rs = (S.rs + 0x6D2B79F5) | 0); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const pick = (S, a) => a[Math.floor(rnd(S) * a.length)];
  function shuffle(S, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(S) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function wpick(S, items, wf) { let t = 0; const w = items.map(x => { const v = Math.max(0, wf(x)); t += v; return v; }); if (t <= 0) return pick(S, items); let r = rnd(S) * t; for (let i = 0; i < items.length; i++) { r -= w[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; }
  function comb(arr, k) { const out = []; const cur = []; (function go(i) { if (cur.length === k) { out.push(cur.slice()); return; } for (let j = i; j <= arr.length - (k - cur.length); j++) { cur.push(arr[j]); go(j + 1); cur.pop(); } })(0); return out; }

  /* ---------- new game ---------- */
  // opts: { size | diff, role: 'auto'|'villager'|'seer'|'medium'|'guard', seed }
  function newGame(story, opts) {
    opts = opts || {};
    const D = tuneOf(story.id, opts.diff != null ? opts.diff : 1);
    const S = { v: 1, dv: 3, story: story.id, diff: D.id, size: D.size, rs: (opts.seed >>> 0) || ((Math.random() * 2 ** 31) | 0), day: 1, phase: 'prologue' };
    S.seed = S.rs;
    const cast = shuffle(S, story.chars.map((c, i) => i)).slice(0, D.size - 1).sort((a, b) => a - b);
    const P = [{ id: 'you', ci: -1, isPlayer: true, name: story.hero.name, traits: story.hero.traits, home: story.hero.home, alive: true, persona: { logic: .7, bold: .5, trust: .5, talk: .5 } }];
    cast.forEach(ci => { const c = story.chars[ci]; P.push({ id: c.id, ci, name: c.name, traits: c.traits, home: c.home, alive: true, persona: c.persona, secret: c.secret ? { loc: c.secret.loc, p: c.secret.p != null ? c.secret.p : .45, open: false } : null }); });
    // roles
    const R = S.R = setupOf(story, D.size), bag = [];
    if (D.hide) {   // 上級・悪夢：狼の数のほかは、毎回くじ。何がありうるかは S.pub（その物語の顔ぶれ）
      const H = D.hide, yes = p => rnd(S) < p;
      S.hid = true; S.pub = Object.assign({}, R, { madman: H.mad.reduce((m, w, k) => w > 0 ? k : m, 0) });
      // 物語の看板の役（妖狐・背徳者・猫又・共有者・狂信者）は必ずいる（2026-11-27）。狂信者は人数だけがくじ
      R.madman = wpick(S, [0, 1, 2, 3], k => (H.mad[k] || 0) * (story.rules === 'fanatic' && (k > 2 || k < 1) ? 0 : 1));   // 狼を知る狂信者が三人は重すぎる
      R.seer = yes(H.seer) ? 1 : 0; R.medium = yes(H.medium) ? 1 : 0;
      if (R.guard) R.guard = yes(H.guard) ? 1 : 0;

      const want = opts.role && opts.role !== 'auto' && opts.role !== 'villager' ? opts.role : null;   // the role the player chose is always there
      if (want && S.pub[want] && !R[want]) R[want] = want === 'mason' ? 2 : 1;
    }
    S.rules = story.rules || 'std'; S.foxLoc = story.foxLoc || null; S.fan = story.rules === 'fanatic';
    for (const r of ['wolf', 'madman', 'seer', 'medium', 'guard', 'mason', 'fox', 'immoral', 'cat']) for (let i = 0; i < R[r]; i++) bag.push(r);
    while (bag.length < D.size) bag.push('villager');
    const can = ['villager', 'seer', 'medium', 'guard', 'mason', 'cat'].filter(r => r === 'villager' || bag.includes(r));
    let pr = opts.role && opts.role !== 'auto' ? opts.role : wpick(S, can, r => r === 'villager' ? 4 : 2);
    if (!can.includes(pr)) pr = 'villager';
    bag.splice(bag.indexOf(pr), 1);
    P[0].role = pr;
    shuffle(S, bag).forEach((r, i) => { P[i + 1].role = r; });
    // the fox lives away from its shrine (it goes there at night)
    const fx = P.find(p => p.role === 'fox');
    if (fx && fx.home === story.foxLoc) { const sw = P.find(p => !p.isPlayer && p.role === 'villager' && p.home !== story.foxLoc); if (sw) { sw.role = 'fox'; fx.role = 'villager'; } }
    S.people = P;
    S.wolves = P.filter(p => p.role === 'wolf').map(p => p.id);
    S.own = {};             // private role results: id → [{night, target, res}]
    S.nights = [];          // [{ n, killer, target, loc, died, guardedBy, traces:[{cat,val,neg}], ev:{kind,owner,real}|null, pos:{}, sights:[] }]
    S.testi = {};           // `${night}|${id}` → testimony (fixed once made)
    S.claims = [];          // { by, role:'seer'|'medium', day, res:[{day,target,res}] }  (public)
    S.reports = [];         // public trace reports: { by, night, cat, val, neg, day }
    S.figs = [];            // public figure sightings: { by, night, cat, val, neg, day }
    S.votes = [];           // { day, round, ballots:{voter:target}, out }
    S.known = {};           // per NPC id: { tr: ['night|idx'] }  traces they saw with their own eyes
    S.gossip = {};          // id → [targets they have seen out at night]
    S.fake = {};            // the fake claimers' plans: id → { role, from }
    S.req = { divine: {}, guard: null, hide: false, calls: {} };   // the player's appeals to the village (public: the wolves hear them too)
    S.pl = { role: pr, ap: D.ap + (pr === 'villager' ? 1 : 0), apMax: D.ap + (pr === 'villager' ? 1 : 0), items: [], used: {}, found: [], clues: [], told: [], res: [], asks: 3, co: false, act: null, stake: null, ward: 0, notes: {}, talked: {} };
    // the two who share a compartment know each other
    const ms = P.filter(p => p.role === 'mason');
    if (ms.length === 2) for (const [a, b] of [[ms[0], ms[1]], [ms[1], ms[0]]]) {
      (S.own[a.id] = S.own[a.id] || []).push({ night: 0, target: b.id, res: 'human', mason: true });
      if (a.isPlayer) S.pl.res.push({ night: 0, target: b.id, res: 'human', mason: true });
    }
    S.items = (story.items || []).map(it => ({ id: it.id, loc: it.at === 'random' ? pick(S, story.locs.filter(l => !l.noItem).map(l => l.id)) : it.at, day: it.day || 1, taken: false }));
    S.log = [];
    S.result = null;
    // the first night: a victim from outside the cast, at a fixed place (the opening of the story)
    night(S, story, { prologue: true });
    S.day = 1; S.phase = 'morning';
    planFakes(S);
    return S;
  }

  // what can be seen from where: the same place, and the two next to it (the places stand in a ring)
  function near(story, a) { const ring = story.locs.map(l => l.id), i = ring.indexOf(a); if (i < 0) return []; return [ring[(i + ring.length - 1) % ring.length], ring[(i + 1) % ring.length]]; }
  const canSee = (story, from, to) => from === to || near(story, from).includes(to);
  const person = (S, id) => S.people.find(p => p.id === id);
  const alive = S => S.people.filter(p => p.alive);
  const isWolf = (S, id) => S.wolves.includes(id);
  const wolvesAlive = S => S.people.filter(p => p.alive && p.role === 'wolf');
  // 物語ごとの手直し（2026-11-26 ユーザー：霧鐘村・北辰号の中級がまだ易しい）。配役は変えず、嘘の巧さと村の推理だけを締める
  const TUNE = { tomoshibi: { 4: { cunning: .9, neg: .7, plant: .5 } }, kirigane: { 1: { wit: .1, npcFind: .12 }, 3: { wit: .07, sway: .67 }, 4: { wit: .06, sway: .62 } }, hokushin: { 1: { wit: .1, npcFind: .12 }, 3: { wit: .09, sway: .72 }, 4: { wit: .06, sway: .6 } }, nekonaki: { 1: { cunning: .4, wit: .22, npcFind: .16, sway: 1.05 }, 3: { wit: .06, sway: .65 }, 4: { wit: .04, sway: .55, hide: { mad: [0, 2, 4, 0] } } },
    kiteki: { 3: { neg: .5, plant: .38, wit: .16, sway: .9 }, 4: { cunning: .9, neg: .7, plant: .5, hide: { mad: [3, 4, 1, 0] } } }, shirane: { 4: { neg: .75, plant: .6, hide: { mad: [3, 5, 1, 0] } } } }, TD = {};
  function tuneOf(story, i) { const t = TUNE[story] && TUNE[story][i]; if (!t) return DIFF[i]; const k = story + i; return TD[k] || (TD[k] = Object.assign({}, DIFF[i], t, t.hide ? { hide: Object.assign({}, DIFF[i].hide, t.hide) } : {})); }
  const diffOf = S => tuneOf(S.story, S.diff);

  /* ---------- the night ---------- */
  // actions: { prologue, divine:id, guard:id, stake:locId }
  function night(S, story, act) {
    act = act || {};
    const D = diffOf(S), n = S.nights.length;
    const live = alive(S), wolves = live.filter(p => p.role === 'wolf');
    let cursed = null;
    // where everyone is: home, or out on their secret errand
    const pos = {};
    for (const p of live) {
      pos[p.id] = p.home;
      if (p.secret && !p.isPlayer && rnd(S) < p.secret.p) pos[p.id] = p.secret.loc;
      if (p.role === 'fox') pos[p.id] = story.foxLoc && rnd(S) < (S.rules === 'immoral' && diffOf(S).easy ? .95 : .85) ? story.foxLoc : p.home;   // (霧笛座の入門: the fox keeps to its lair almost every night)   // the fox keeps its own night at the shrine
    }
    if (act.stake) pos.you = act.stake;
    // the wolves choose
    const killer = wolves.length ? pick(S, wolves) : null;
    let target = null, loc = null;
    if (act.prologue) { target = 'first'; loc = story.first.loc; if (killer) pos[killer.id] = loc; }
    else if (killer) { target = wolfTarget(S, story); loc = pos[target]; pos[killer.id] = loc; }
    // NPC roles act
    const npcGuard = live.find(p => p.role === 'guard' && !p.isPlayer);
    let guarded = null;
    if (!act.prologue) {
      if (S.pl.role === 'guard' && person(S, 'you').alive) guarded = act.guard || null;
      else if (npcGuard) guarded = guardPick(S, npcGuard);
    }
    if (!act.prologue) S.lastGuard = guarded;
    let died = !!target, savedBy = null;
    if (!act.prologue && target) {
      if (guarded === target) { died = false; savedBy = 'guard'; }
      else if (target === 'you' && S.pl.ward > 0) { S.pl.ward--; died = false; savedBy = 'ward'; }
      else if (person(S, target).role === 'fox') { died = false; savedBy = 'fox'; S.foxBit = target; }   // fangs do not kill a fox (the wolves now know it)
    }
    // traces: the killer's body, left where it happened
    const traces = [];
    if (killer) {
      const cats = shuffle(S, CATS).slice(0, act.prologue ? 1 : D.traces + (D.traces < 2 && rnd(S) < (D.trace2 == null ? .5 : D.trace2) ? 1 : 0));
      for (const c of cats) {
        const v = killer.traits[c];
        const neg = c !== 'hand' && rnd(S) < D.neg;
        if (neg) {   // "not X": a value the killer does not have
          const others = Object.keys(story.traits[c].v).filter(x => x !== v);
          traces.push({ cat: c, val: pick(S, others), neg: true });
        } else traces.push({ cat: c, val: v, neg: false });
      }
      if (traces.length > 1) for (let i = traces.length - 1; i >= 0; i--) if (traces.length > 1 && rnd(S) < D.erase) traces[i].gone = true;
    }
    // a belonging at the scene: dropped by the killer, or planted on an innocent
    let ev = null;
    if (killer && !act.prologue) {
      const inn = live.filter(p => p.role !== 'wolf' && p.id !== target && !p.isPlayer);
      if (rnd(S) < D.plant && inn.length) ev = { kind: 'item', owner: pick(S, inn).id, real: false };
      else if (rnd(S) < D.drop) ev = { kind: 'item', owner: killer.id, real: true };
    } else if (killer && act.prologue && rnd(S) < .5) ev = { kind: 'item', owner: killer.id, real: true };
    // the role results
    {
      const seer = live.find(p => p.role === 'seer');
      if (seer) {
        let t = seer.isPlayer ? act.divine : seerPick(S, seer);
        if (act.prologue && seer.isPlayer) t = pick(S, live.filter(p => !p.isPlayer)).id;   // the first night's reading is chosen by fate
        if (t) {
          const r = { night: n, target: t, res: isWolf(S, t) ? 'wolf' : 'human' };
          (S.own[seer.id] = S.own[seer.id] || []).push(r);
          if (seer.isPlayer) S.pl.res.push(Object.assign({ seer: true }, r));
          if (person(S, t).role === 'fox' && !act.prologue) cursed = t;      // the reading burns the fox
        }
      }
    }
    // what people saw: a figure (the killer, in the dark) or a person out at night
    const sights = [];
    const ring = story.locs.map(l => l.id), adj = (a, b) => { const i = ring.indexOf(a), j = ring.indexOf(b); if (i < 0 || j < 0) return false; const d = Math.abs(i - j); return d === 1 || d === ring.length - 1; };
    for (const p of act.prologue ? [] : live) {
      if (killer && p.id === killer.id) continue;
      if (p.id === target) continue;
      const L = pos[p.id];
      if (killer) {
        const near = L === loc ? 1 : adj(L, loc) ? D.adj * (p.id === 'you' && act.stake ? 1.8 : 1) : 0;
        if (rnd(S) < near) {
          const c = pick(S, ['height', 'hand', 'foot']);   // the dark hides smells and marks
          sights.push({ by: p.id, kind: 'fig', cat: c, val: killer.traits[c], loc });
          if (L === loc && rnd(S) < .6) { const c2 = pick(S, ['height', 'hand', 'foot'].filter(x => x !== c)); sights.push({ by: p.id, kind: 'fig', cat: c2, val: killer.traits[c2], loc }); }
        }
      }
      for (const q of live) {
        if (q.id === p.id || (killer && q.id === killer.id) || q.id === target) continue;
        if (pos[q.id] === q.home) continue;           // indoors: nobody sees them
        const L2 = pos[q.id];
        if ((L2 === L && rnd(S) < .9) || (adj(L2, L) && rnd(S) < .3)) sights.push({ by: p.id, kind: 'who', who: q.id, loc: L2 });
      }
    }
    const rec = { n, killer: killer ? killer.id : null, target, loc, died, saved: savedBy, guarded, traces, ev, pos, sights, day: S.day, cursed };
    S.nights.push(rec);
    if (died && target !== 'first') { const t = person(S, target); t.alive = false; t.death = { day: S.day + 1, cause: 'wolf', night: n }; }
    if (died && target !== 'first' && person(S, target).role === 'cat') {   // the cat's claws: one of the wolves goes with it
      const ws = alive(S).filter(p => p.role === 'wolf');
      if (ws.length) { const w = pick(S, ws); w.alive = false; w.death = { day: S.day + 1, cause: 'catw', night: n }; rec.dragged = w.id; }
    }
    if (cursed && person(S, cursed).alive) { const t = person(S, cursed); t.alive = false; t.death = { day: S.day + 1, cause: 'curse', night: n }; S.foxGone = true; }
    // the immoral: once the fox is dead, it follows the fox the same night (no wound; the village learns the fox is gone)
    const im = S.people.find(p => p.role === 'immoral' && p.alive);
    if (im && !act.prologue && !S.people.some(p => p.role === 'fox' && p.alive)) { im.alive = false; im.death = { day: S.day + 1, cause: 'follow', night: n }; rec.followed = im.id; S.foxGone = true; }
    // the gossip: people remember who they saw out
    for (const s of sights) if (s.kind === 'who') (S.gossip[s.by] = S.gossip[s.by] || []).push({ night: n, who: s.who, loc: s.loc });
    return rec;
  }

  // 2026-11-26（ユーザー：狂人が二つ三つと喋りたがって即バレるのは、上級以上では通用しない）
  // cunning（上級 .7・悪夢 1）：嘘つきは、すぐに見破られる嘘を避ける。誰か（あなたを含む）が同じ痕跡を見ていれば、その痕跡については本当のことを言う。
  // 作り話の人影は、その夜の本物の痕跡と食い違わない形にする。名乗りで嘘をつく者は、ほかの嘘を重ねない。
  const sly = S => rnd(S) < (diffOf(S).cunning || 0);
  const seenByOthers = (S, id, n, i) => S.pl.found.includes(n + '|' + i) || S.people.some(q => q.id !== id && q.alive && ((S.known[q.id] || { tr: [] }).tr.includes(n + '|' + i)));
  const fitsNight = (S, n, cat, val) => { const N = S.nights[n]; return !N || !N.traces || N.traces.every(t => t.cat !== cat || (t.neg ? t.val !== val : t.val === val)); };
  /* ---------- the wolves' plans: who will pretend to be a seer or a medium ---------- */
  function planFakes(S) {
    const D = diffOf(S);
    const w = S.people.filter(p => p.role === 'wolf'), m = S.people.find(p => p.role === 'madman');
    if (m && rnd(S) < (S.fan ? (D.easy ? .5 : .8) : .62)) S.fake[m.id] = { role: 'seer', from: S.fan && !D.easy || rnd(S) < .7 ? 1 : 2 };   // the fanatic comes forward early (less so on 入門)
    else if (w.length && (w.length > 1 || m) && rnd(S) < D.fakeSeer) { const f = pick(S, w); S.fake[f.id] = { role: 'seer', from: rnd(S) < .6 ? 1 : 2 }; }
    if (w.length > 1 && rnd(S) < (D.nightmare ? .45 : .22)) { const f = pick(S, w.filter(x => !S.fake[x.id]) || w); if (f) S.fake[f.id] = { role: 'medium', from: 2 }; }
  }

  /* ---------- testimony: what a person says about a night (fixed once said) ---------- */
  function testimony(S, story, id, n) {
    const key = n + '|' + id;
    if (S.testi[key]) return S.testi[key];
    const N = S.nights[n], p = person(S, id);
    if (!N || !p || id === 'you') return null;
    const truthLoc = N.pos[id];
    const T = { id, night: n, loc: truthLoc, saw: [] };
    const mine = N.sights.filter(s => s.by === id);
    if (p.role === 'wolf' || p.role === 'madman') {
      T.loc = p.home;                                  // "I was at home"
      // a made-up figure, shaped like someone they want hanged
      const cun = sly(S), claimed = S.claims.some(c => c.by === id) || S.fake[id];
      if (rnd(S) < (p.role === 'madman' ? .55 : .45) * (cun ? (claimed ? 0 : .5) : 1)) {   // a cunning liar who already lies with a claim adds no more lies, and says less
        const inn = alive(S).filter(q => q.role !== 'wolf' && q.id !== id);
        const frame = inn.length ? pick(S, inn) : null;
        if (frame) {
          let c = pick(S, ['height', 'hand', 'foot']);
          let v = p.role === 'madman' && !S.fan ? pick(S, Object.keys(story.traits[c].v)) : frame.traits[c];   // the fanatic knows whom to frame
          if (cun && !fitsNight(S, n, c, v)) {   // made up to fit the night's real traces: an innocent who shares the wolf's trait
            const ok = ['height', 'hand', 'foot'].map(k => [k, frame.traits[k]]).filter(([k, x]) => fitsNight(S, n, k, x));
            if (ok.length) [c, v] = pick(S, ok); else c = null;
          }
          if (c) T.saw.push({ kind: 'fig', cat: c, val: v, lie: true });
        }
      }
      if (p.role === 'wolf' && rnd(S) < .2) {          // a made-up sighting of a person out at night
        const inn = alive(S).filter(q => q.role !== 'wolf' && q.id !== id && !q.isPlayer);
        if (inn.length) { const q = pick(S, inn); const smart = cun || rnd(S) < .5 + .1 * diffOf(S).id; T.saw.push({ kind: 'who', who: q.id, loc: smart ? pick(S, [p.home].concat(near(story, p.home))) : pick(S, story.locs.map(l => l.id)), lie: true }); }
      }
    } else {
      // an innocent: tells the truth about others; hides their own secret errand
      if (p.role === 'fox' && truthLoc !== p.home) T.loc = p.home;   // the fox never says where it spends the night
      else if (p.secret && !p.secret.open && truthLoc !== p.home) { T.loc = p.home; T.hid = true; }
      for (const s of mine) T.saw.push(Object.assign({}, s));
      // the immoral covers for the fox: "I saw them at home" — while the fox sat at its lair
      const fx = p.role === 'immoral' && S.people.find(q => q.role === 'fox' && q.alive);
      if (fx && N.pos[fx.id] !== fx.home && !T.saw.some(s => s.who === fx.id) && rnd(S) < (diffOf(S).easy ? 0 : .6)) T.saw.push({ kind: 'who', who: fx.id, loc: fx.home, lie: true });
    }
    S.testi[key] = T;
    return T;
  }

  /* ---------- knowledge an observer holds ---------- */
  function know(S, obs) {
    const K = { obs, self: obs === 'pub' ? null : person(S, obs) };
    K.role = K.self ? K.self.role : null;
    K.hard = [];     // [{night, cat, val, neg}] traces seen with own eyes
    const seen = obs === 'you' ? S.pl.found : obs !== 'pub' ? ((S.known[obs] || {}).tr || []) : [];
    for (const k of seen) { const [ni, ti] = k.split('|').map(Number); const t = S.nights[ni] && S.nights[ni].traces[ti]; if (t && !t.gone) K.hard.push({ night: ni, cat: t.cat, val: t.val, neg: t.neg }); }
    if (obs !== 'pub') for (const N of S.nights) for (const s of N.sights) if (s.by === obs && s.kind === 'fig') K.hard.push({ night: N.n, cat: s.cat, val: s.val, neg: false, eye: true });
    K.soft = S.reports.filter(r => r.by !== obs).map(r => ({ by: r.by, night: r.night, cat: r.cat, val: r.val, neg: r.neg }))
      .concat(S.figs.filter(r => r.by !== obs).map(r => ({ by: r.by, night: r.night, cat: r.cat, val: r.val, neg: false, fig: true })));
    if (obs === 'you') for (const t of S.pl.told) if (t.kind === 'fig') K.soft.push({ by: t.by, night: t.night, cat: t.cat, val: t.val, neg: false, fig: true });
    K.ownRes = obs === 'pub' ? [] : (S.own[obs] || []).slice();
    if (obs === 'you') K.ownRes = S.pl.res.slice();
    return K;
  }

  /* ---------- the world analysis ---------- */
  // returns { p: {id: P(wolf)}, mad: {id: P(madman)}, seer: {id: P(real seer)}, n: worlds }
  function analyze(S, obs, opt) {
    opt = opt || {};
    const K = know(S, obs);
    const nW = S.wolves.length, nM = S.hid && !(K.role === 'wolf' || (K.role === 'madman' && S.fan)) ? PUB(S).madman : RS(S).madman;
    const ids = S.people.map(p => p.id);
    const deadByWolf = new Set(S.people.filter(p => p.death && (p.death.cause === 'wolf' || p.death.cause === 'curse' || p.death.cause === 'follow')).map(p => p.id));
    let cand = ids.filter(id => !deadByWolf.has(id));
    if (K.self && K.role !== 'wolf') cand = cand.filter(id => id !== obs);
    if (obs !== 'pub' && obs !== 'you' && opt.trustPlayer !== false && !opt.paranoid) { /* NPCs may suspect the player: keep them */ }
    // the observer's own certainties
    const hardW = new Set(), hardH = new Set();
    for (const r of K.ownRes) (r.res === 'wolf' ? hardW : hardH).add(r.target);
    if (K.role === 'wolf') { S.wolves.forEach(w => hardW.add(w)); if (S.foxBit) hardH.add(S.foxBit); }
    for (const p of S.people) if (p.death && p.death.cause === 'catw') hardW.add(p.id);   // the cat's claws only take a wolf
    for (const c of S.claims) if (c.role === 'mason') hardH.add(c.by);     // a pair of masons speaks for each other: nobody can fake it
    const exiledDay = {}; for (const p of S.people) if (p.death && p.death.cause === 'exile') exiledDay[p.id] = p.death.day;
    const aliveAt = (id, night) => !(exiledDay[id] != null && exiledDay[id] <= night);
    const fits = (id, t) => { const v = person(S, id).traits[t.cat]; return t.neg ? v !== t.val : v === t.val; };
    // group hard traces by night
    const hardBy = {}; for (const t of K.hard) (hardBy[t.night] = hardBy[t.night] || []).push(t);
    const softBy = {}; for (const t of K.soft) (softBy[t.night] = softBy[t.night] || []).push(t);
    const claims = S.claims.filter(c => c.by !== obs || true);
    const seerC = claims.filter(c => c.role === 'seer'), medC = claims.filter(c => c.role === 'medium');
    const liveIds = new Set(alive(S).map(p => p.id));
    const burnt = new Set(S.people.filter(p => p.death && (p.death.cause === 'curse' || p.death.cause === 'follow')).map(p => p.id));
    const lastNight = S.nights.length - 1;
    const acc = {}, accM = {}, accS = {}; let tot = 0, n = 0;
    ids.forEach(id => { acc[id] = 0; accM[id] = 0; accS[id] = 0; });
    const pool = comb(cand, nW);
    for (const W of pool) {
      const Ws = new Set(W);
      // hard: own knowledge
      let ok = true;
      for (const x of hardW) if (!Ws.has(x)) { ok = false; break; }
      if (!ok) continue;
      for (const x of hardH) if (Ws.has(x)) { ok = false; break; }
      if (!ok) continue;
      // the game is still on: at least one wolf alive, and fewer wolves than humans
      if (!S.result) {
        const wa = W.filter(x => liveIds.has(x)).length, ha = liveIds.size - wa;
        if (wa < 1 || wa >= ha) continue;
      }
      // hard traces: some wolf alive that night has all of them
      for (const ni in hardBy) {
        const ks = W.filter(w => aliveAt(w, +ni));
        if (!ks.some(w => hardBy[ni].every(t => fits(w, t)))) { ok = false; break; }
      }
      if (!ok) continue;
      let wt = 1;
      // soft traces and figures: someone's word. If no wolf fits it, the speaker is likely a liar (a wolf or the madman)
      const liarW = nM ? .3 : .12;
      for (const ni in softBy) {
        const ks = W.filter(w => aliveAt(w, +ni));
        for (const t of softBy[ni]) {
          if (!ks.some(w => fits(w, t) && (hardBy[ni] || []).every(h => fits(w, h)))) {
            if (!Ws.has(t.by)) wt *= liarW * (t.trust != null ? (1 - t.trust) + t.trust * .3 : 1);
          }
        }
      }
      // lies the player exposed in front of everyone: a liar is most likely a wolf (or the madman)
      if (S.exposed && (obs === 'pub' || obs === 'you' || (K.self && (K.self.persona.trust || .5) > .35))) for (const x in S.exposed) if (x !== obs && !Ws.has(x)) wt *= Math.pow(nM ? .45 : .22, S.exposed[x]);
      // claims: enumerate who is the real seer / medium; the rest of the non-wolf claimers must be the madman
      const nonW = arr => arr.filter(c => !Ws.has(c.by));
      const sNon = nonW(seerC), mNon = nonW(medC);
      let best = 0, madAcc = {}, seerAcc = {};
      const seerOpts = sNon.map(c => c.by).concat([null]);
      const medOpts = mNon.map(c => c.by).concat([null]);
      for (const rs of seerOpts) {
        if (K.role === 'seer' && rs !== obs && rs !== null) continue;
        if (K.role === 'seer' && rs === null && sNon.some(c => c.by === obs)) continue;
        // the real seer's results must be right
        if (rs && !opt.relaxed) { const c = seerC.find(x => x.by === rs); if (!c.res.every(r => (r.res === 'wolf') === Ws.has(r.target))) continue; }
        for (const rm of medOpts) {
          if (K.role === 'medium' && rm !== obs && rm !== null) continue;
          if (rm && !opt.relaxed) { const c = medC.find(x => x.by === rm); if (!c.res.every(r => (r.res === 'wolf') === Ws.has(r.target))) continue; }
          const mads = new Set(sNon.filter(c => c.by !== rs).map(c => c.by).concat(mNon.filter(c => c.by !== rm).map(c => c.by)));
          if (rs && mads.has(rs)) continue;
          if (rm && mads.has(rm)) continue;
          if (rs && rm && rs === rm) continue;
          if (mads.size > nM && !opt.relaxed) continue;
          // the observer knows they are not the madman (unless they are)
          if (K.self && K.role !== 'madman' && mads.has(obs)) continue;
          if (K.role === 'seer' && rs === null && seerC.length && !sNon.length) { /* fine */ }
          // likelihood of this way of claiming
          let lw = 1;
          lw *= rs ? .85 : (K.role === 'seer' ? 1 : .25);
          if (burnt.size) lw *= rs && seerC.find(x => x.by === rs).res.some(r => burnt.has(r.target)) ? 4 : .4;   // only the real seer reads the one who burned
          lw *= rm ? .8 : (K.role === 'medium' ? 1 : .35);
          for (const c of seerC) if (Ws.has(c.by)) lw *= .35;
          for (const c of medC) if (Ws.has(c.by)) lw *= .25;
          lw *= mads.size ? Math.pow(.5, mads.size) : (nM ? .6 : 1);
          best += lw;
          for (const x of mads) madAcc[x] = (madAcc[x] || 0) + lw;
          if (rs) seerAcc[rs] = (seerAcc[rs] || 0) + lw;
        }
      }
      if (best <= 0) continue;
      wt *= best;
      // a belonging found at a scene points weakly at its owner
      if (opt.items !== false) for (const N of S.nights) if (N.ev && N.ev.seen && (N.ev.seen.includes('pub') || N.ev.seen.includes(obs))) wt *= Ws.has(N.ev.owner) ? 1.35 : 1;
      // a hidden-alibi contradiction (someone seen out who said they were home) is a small weight
      n++; tot += wt;
      for (const x of W) acc[x] += wt;
      for (const x in madAcc) accM[x] += wt * madAcc[x] / best;
      for (const x in seerAcc) accS[x] += wt * seerAcc[x] / best;
    }
    if (!n && !opt.relaxed) return analyze(S, obs, Object.assign({}, opt, { relaxed: true }));
    const out = { p: {}, mad: {}, seer: {}, n, tot, relaxed: !!opt.relaxed };
    for (const id of ids) { out.p[id] = tot ? acc[id] / tot : (cand.includes(id) ? nW / cand.length : 0); out.mad[id] = tot ? accM[id] / tot : 0; out.seer[id] = tot ? accS[id] / tot : 0; }
    for (const id of deadByWolf) out.p[id] = 0;
    return out;
  }

  /* ---------- an NPC's view: the analysis plus character ---------- */
  function suspicion(S, story, id) {
    const p = person(S, id);
    const A = analyze(S, id);
    const sus = {};
    const D = diffOf(S);
    const wit = D.wit * (.45 + .55 * p.persona.logic);                 // how much they reason, against how much they feel
    const live = S.people.filter(q => q.alive && q.id !== id), avg = live.reduce((a, q) => a + A.p[q.id], 0) / Math.max(1, live.length);
    for (const q of S.people) {
      if (q.id === id || !q.alive) continue;
      const feel = .55 * hash01(S.seed + ':' + id + '>' + q.id) + .45 * hash01(S.seed + ':' + S.day + ':' + id + '>' + q.id);   // a fixed like / dislike, and today's mood
      let s = wit * A.p[q.id] + (1 - wit) * feel * avg * 2;
      if (A.p[q.id] === 0) s *= .25;
      if (q.isPlayer) s *= DIFF[S.diff].easy ? .55 : .85;            // the player is the story's eyes; the village leans on them a little
      sus[q.id] = Math.max(0, s);
    }
    if (p.role === 'wolf') {               // wolves pretend: they use the village's view, never their partners
      const pub = analyze(S, 'pub');
      for (const q in sus) sus[q] = isWolf(S, q) ? 0 : pub.p[q] + .18 * (hash01(S.seed + 'w' + id + q) - .5) + (S.claims.some(c => c.by === q && c.role === 'seer') ? .25 : 0);
    }
    if (p.role === 'madman') { const pub = analyze(S, 'pub'); for (const q in sus) sus[q] = S.fan ? (isWolf(S, q) ? 0 : pub.p[q] + .2 * (hash01(S.seed + 'm' + id + q) - .5) + (S.claims.some(c => c.by === q && c.role === 'seer') ? .3 : 0)) : 1 - pub.p[q] + .3 * (hash01(S.seed + 'm' + id + q) - .5); }
    // the fox of the shrine: the village must find it too, and the more wolves are gone, the more it matters
    const fv = p.role === 'fox' || p.role === 'madman' || p.role === 'immoral' ? null : foxView(S, story, id);
    if (fv) {
      const gone = new Set(); for (const c of S.claims) if (c.role === 'medium') for (const r of c.res) if (r.res === 'wolf') gone.add(r.target);
      const F = p.role === 'wolf' ? (S.foxBit ? .5 : .1) : .12 + .5 * Math.min(1, gone.size / Math.max(1, S.wolves.length));
      const n = Object.keys(fv).length;
      if (S.foxHunt) { for (const q in sus) sus[q] = (fv[q] || 0) * n * .5 + .05 * hash01(S.seed + 'f' + id + q); }   // no wolves left: only the fox matters
      else for (const q in fv) if (sus[q] != null) sus[q] += F * fv[q] * n * .25;
    }
    const acc = S.pl.accuse && S.pl.accuse.day === S.day ? S.pl.accuse.target : null;
    if (acc && sus[acc] != null && p.role !== 'wolf' && p.role !== 'fox') {
      const cred = S.ghost && S.ghost.cause === 'wolf' ? 1 : 1 - (A.p.you || 0) * 2.2;
      sus[acc] += Math.max(0, cred) * (.12 + .3 * p.persona.trust) * (S.pl.accuse.ev ? 1.6 : 1) * D.sway;
    }
    // the player spoke up for someone with evidence: those who trust the player doubt that one less (the wolves do not care)
    if (S.vouch && p.role !== 'wolf' && p.role !== 'madman') {
      const cred = Math.max(0, 1 - (A.p.you || 0) * 2.2);
      for (const q in S.vouch) if (sus[q] != null) sus[q] *= Math.max(.3, 1 - S.vouch[q] * cred * (.35 + .4 * p.persona.trust));
    }
    return { sus, A };
  }
  // who might be the fox, as this person sees it (nothing, once its death is known)
  function foxView(S, story, id) {
    if (!RS(S).fox || S.foxGone) return null;
    const me = person(S, id), w = {}; let t = 0;
    for (const q of alive(S)) {
      if (q.id === id) continue;
      let v = 1;
      if (S.claims.some(c => c.by === q.id && c.role === 'mason')) v = 0;
      if (S.claims.some(c => c.role === 'seer' && c.by !== q.id && person(S, c.by).alive && c.res.some(r => r.target === q.id && r.res === 'human'))) v *= .35;   // read, and still alive
      const seen = id === 'you' ? S.pl.told.filter(t => t.kind === 'who') : (S.gossip[id] || []);
      const explained = q.secret && q.secret.open && q.secret.loc === S.foxLoc;   // they told why they were at the shrine
      if (!explained && seen.some(g => g.who === q.id && g.loc === S.foxLoc)) v *= 3;
      if (id === 'you' && S.pl.told.some(t => t.sign && t.who === q.id)) v *= 4;   // its belonging, left at the shrine   // seen at the shrine at night
      if (S.exposed && S.exposed[q.id]) v *= 1 + 2 * S.exposed[q.id];   // caught in a lie about the night
      if (me.role === 'wolf') v = isWolf(S, q.id) ? 0 : S.foxBit === q.id ? v * 30 : v;
      w[q.id] = v; t += v;
    }
    if (!t) return null;
    for (const k in w) w[k] /= t;
    return w;
  }
  function hash01(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10007) / 10007; }

  /* ---------- NPC choices ---------- */
  function seerPick(S, seer) {
    const done = new Set((S.own[seer.id] || []).map(r => r.target));
    const cand = alive(S).filter(p => p.id !== seer.id && !done.has(p.id));
    if (!cand.length) return null;
    const R = S.req && S.req.divine[seer.id];
    if (R && R.day === S.day && R.ok && cand.some(p => p.id === R.target) && rnd(S) < .9) return R.target;   // a promise made in the meeting
    const A = analyze(S, seer.id), fv = foxView(S, null, seer.id) || {}, n = Object.keys(fv).length;
    return wpick(S, cand, p => .08 + A.p[p.id] + (S.claims.some(c => c.by === p.id) ? .3 : 0) + (fv[p.id] || 0) * n * .08).id;
  }
  function guardPick(S, g) {
    const cand = alive(S).filter(p => p.id !== g.id && p.id !== S.lastGuard);
    if (!cand.length) return null;
    const A = analyze(S, g.id);
    const R = S.req && S.req.guard;
    if (R && R.day === S.day && cand.some(p => p.id === R.target)) {
      // the guard weighs the request: do they trust the one who asked, and the one to be guarded?
      // asking for yourself: the guard trusts it less, unless you have come forward with a role worth guarding
      const follow = .15 + .55 * (1 - A.p.you) * (1 - A.p[R.target]) + .15 * (g.persona.trust || .5) + (R.target === 'you' ? (S.pl.co ? .1 : -.1) : 0);
      R.follow = rnd(S) < follow;
      if (R.follow) return R.target;
    }
    return wpick(S, cand, p => {
      let v = .2;
      const c = S.claims.find(c => c.by === p.id);
      if (c) v += (c.role === 'seer' ? 1.6 : .8) * (1 - A.p[p.id]);
      if (p.isPlayer && S.pl.co) v += .5;
      return v * (1 - A.p[p.id]);
    }).id;
  }
  function wolfTarget(S, story) {
    const D = diffOf(S);
    const pub = analyze(S, 'pub');
    let cand = alive(S).filter(p => p.role !== 'wolf');
    if (S.foxBit && cand.length > 1) cand = cand.filter(p => p.id !== S.foxBit);    // fangs did nothing to that one
    const last = S.nights[S.nights.length - 1];
    const gjOn = last && last.saved === 'guard' ? last.target : null;     // the guard stood at this door last night
    const seerC = S.claims.filter(c => c.role === 'seer' && person(S, c.by).alive);
    const fakeOurs = seerC.some(c => isWolf(S, c.by));                    // a partner is pretending to be the seer
    const claimed = cand.filter(p => seerC.some(c => c.by === p.id));
    // a lone seer claimer — the player too, no favours — is the first prey. Not when biting them would prove them real
    // (our partner claims the same: better to have them voted out), and less when the guard was at that door last night
    if (claimed.length === 1 || (claimed.length === 2 && !fakeOurs)) {
      // two claimers and neither is ours: one is the madman — the wolves cannot tell, and bite one of them
      const s = claimed.length === 1 ? claimed[0] : wpick(S, claimed, p => (p.id === gjOn ? 2 : 1) * (1.1 - pub.p[p.id]));
      let bite = claimed.length === 2 ? .6 : fakeOurs ? .55 : .75;
      if (gjOn === s.id) bite = Math.min(.95, bite * 1.3);     // the guard cannot stand at the same door two nights running
      if (S.req && S.req.guard && S.req.guard.day === S.day && S.req.guard.target === s.id) bite *= .9;   // asked aloud: the guard may be at that door
      if (s.isPlayer && D.easy) bite *= .5;
      if (rnd(S) < bite) return s.id;
    }
    const t = wpick(S, cand, p => {
      let v = 1;
      const c = S.claims.find(c => c.by === p.id);
      if (c) { const same = S.claims.filter(x => x.role === c.role && !isWolf(S, x.by) && person(S, x.by).alive).length; v += (c.role === 'seer' ? 3.2 : c.role === 'mason' ? 2.6 : 1.6) / Math.max(1, c.role === 'mason' ? 1 : same); if (fakeOurs && c.role === 'seer') v *= .3; }
      if (p.id === gjOn) v *= 1.6;
      if (S.claims.some(c => c.by === p.id && c.role === 'cat')) v *= .15;   // biting a cat costs a wolf
      if (S.req && S.req.guard && S.req.guard.day === S.day && S.req.guard.target === p.id) v *= .85;
      v += (p.persona.logic || .5) * 1.2;
      v *= 1.15 - pub.p[p.id];                                    // keep the suspected alive as scapegoats
      if (p.isPlayer) v *= c ? (D.easy ? .5 : 1) : D.player * (1 + (S.pl.hit || 0));
      return v;
    });
    return t.id;
  }

  /* ---------- the day: NPCs search the scene ---------- */
  function npcSearch(S, story) {
    const D = diffOf(S), N = S.nights[S.nights.length - 1];
    const out = [];
    if (!N || !N.killer) return out;
    const finders = shuffle(S, alive(S).filter(p => !p.isPlayer)).sort((a, b) => b.persona.logic - a.persona.logic).slice(0, 3);
    N.traces.forEach((t, i) => {
      if (t.gone) return;
      if (rnd(S) > D.npcFind) return;
      if (i > 0 && rnd(S) < .5) return;
      const f = wpick(S, finders, p => .3 + p.persona.logic);
      if (!f) return;
      ((S.known[f.id] = S.known[f.id] || { tr: [] }).tr).push(N.n + '|' + i);
      out.push({ by: f.id, night: N.n, idx: i });
    });
    if (N.ev && !(N.ev.seen || []).includes('pub') && rnd(S) < D.npcFind) { const f = pick(S, finders); if (f && !(f.role === 'wolf' && isWolf(S, N.ev.owner))) { (N.ev.seen = N.ev.seen || []).push('pub'); N.ev.pubBy = f.id; out.push({ by: f.id, night: N.n, item: N.ev.owner }); } }
    return out;
  }

  /* ---------- the meeting: who says what (semantic events; text is made by speech.js) ---------- */
  function meeting(S, story) {
    const ev = [];
    const day = S.day, n = S.nights.length - 1, N = S.nights[n];
    const live = alive(S).filter(p => !p.isPlayer);
    // 0. grief for the dead of the night
    if (N && N.died && N.target !== 'first') for (const p of shuffle(S, live).slice(0, 1)) ev.push({ t: 'grief', by: p.id });
    // 1. claims and results
    for (const p of live) {
      const c = S.claims.find(c => c.by === p.id);
      if (p.role === 'seer' && !S.fake[p.id]) {
        const res = S.own[p.id] || [];
        const black = res.some(r => r.res === 'wolf');
        if (!c && seerWants(S, p, black, day)) claim(S, p.id, 'seer', ev);
      } else if (p.role === 'medium' && !S.fake[p.id]) {
        if (!c && S.votes.some(v => v.out) && rnd(S) < .7 + .3 * p.persona.bold) claim(S, p.id, 'medium', ev);
      } else if (p.role === 'guard') {
        if (!c && rnd(S) < guardWants(S, p)) { claim(S, p.id, 'guard', ev); wolfCounterGuard(S, p.id, ev); }
      } else if (p.role === 'mason') {
        if (!c && rnd(S) < masonWants(S, p)) claim(S, p.id, 'mason', ev);
      } else if (S.fake[p.id] && !c && day >= S.fake[p.id].from) {
        if (S.fake[p.id].role === 'medium' && !S.votes.some(v => v.out)) continue;
        claim(S, p.id, S.fake[p.id].role, ev);
      }
    }
    // results of everyone who has claimed (real ones read their own; fakes invent)
    for (const c of S.claims) announce(S, c, day, ev);
    meetingRest(S, story, ev, day, n, N, live);
    return ev;
  }
  // who a guard claimer says they stood guard for, night by night (the real one tells the truth; a liar invents)
  function guardHistory(S, p, c) {
    const out = [], told = new Set(c.res.map(r => r.night));
    for (const N of S.nights) {
      if (N.n === 0 || told.has(N.n) || N.day == null || N.day >= S.day) continue;
      let t = null;
      if (p.role === 'guard') t = N.guarded;
      else { const cand = S.people.filter(q => q.id !== p.id && (q.alive || (q.death && q.death.night === N.n))); const pick1 = cand.length ? cand[Math.floor(rnd(S) * cand.length)] : null; t = pick1 && pick1.id; }
      if (t) out.push({ night: N.n, target: t, res: 'guard', day: S.day, fake: p.role !== 'guard' });
    }
    return out;
  }
  // the one the vote has chosen may name a role to escape the jail (回避CO): a real one tells the truth, a wolf may lie
  function dodge(S, story, out) {
    const p = person(S, out);
    if (!p || p.isPlayer || !p.alive || S.claims.some(c => c.by === out)) return [];
    S.dodged = S.dodged || {}; if (S.dodged[S.day]) return [];
    const aliveClaims = r => S.claims.filter(c => c.role === r && person(S, c.by).alive);
    let role = null;
    if (p.role === 'seer' && !S.fake[p.id]) role = rnd(S) < .95 ? 'seer' : null;
    else if (p.role === 'medium' && !S.fake[p.id]) role = rnd(S) < .9 ? 'medium' : null;
    else if (p.role === 'guard') role = rnd(S) < .8 ? 'guard' : null;
    else if (p.role === 'mason') role = rnd(S) < .95 ? 'mason' : null;
    else if (p.role === 'cat') role = rnd(S) < .85 ? 'cat' : null;
    else if (p.role === 'wolf' || p.role === 'madman') {
      if (PUB(S).guard && !aliveClaims('guard').length && rnd(S) < (p.role === 'wolf' ? .55 : .45)) role = 'guard';
      else if (PUB(S).cat && !aliveClaims('cat').length && rnd(S) < .3) role = 'cat';   // a bluff: hang me and someone goes with me
      else if (aliveClaims('seer').length < 2 && rnd(S) < .2) role = 'seer';
    }
    if (!role) return [];
    S.dodged[S.day] = out;
    const ev = [{ t: 'dodge', by: out }];
    claim(S, out, role, ev);
    ev.forEach(e => { if (e.t === 'co' && e.by === out) e.dodge = true; });
    const c = S.claims.find(c => c.by === out); c.dodge = S.day;
    announce(S, c, S.day, ev);
    if (role === 'mason') S.swayVote = { day: S.day, target: out, dir: -3 };   // the partner vouches: nobody hangs a proven human
    // the real guard, hidden, hears a lie in their own name
    if (role === 'guard' && p.role !== 'guard') {
      const g = alive(S).find(q => q.role === 'guard' && !q.isPlayer && !S.claims.some(x => x.by === q.id));
      if (g && rnd(S) < .65) { claim(S, g.id, 'guard', ev); announce(S, S.claims.find(x => x.by === g.id), S.day, ev); }
    }
    return ev;
  }
  // the player speaks after someone dodged with a claim: believe it, doubt it, or call the real one out
  function dodgeTalk(S, story, out, kind) {
    const ev = [], c = S.claims.find(c => c.by === out);
    if (kind === 'trust') S.swayVote = { day: S.day, target: out, dir: -1 };
    if (kind === 'doubt') S.swayVote = { day: S.day, target: out, dir: .45 };
    if (kind === 'counter' && c) {
      const real = alive(S).find(q => q.role === c.role && !q.isPlayer && q.id !== out && !S.claims.some(x => x.by === q.id) && !S.fake[q.id]);
      if (real && rnd(S) < (c.role === 'guard' ? .8 : .9)) { claim(S, real.id, c.role, ev); announce(S, S.claims.find(x => x.by === real.id), S.day, ev); }
      else { const t = pick(S, alive(S).filter(q => !q.isPlayer && q.id !== out)); if (t) ev.push({ t: 'callnone', by: t.id }); }
    }
    return ev;
  }
  // should the real guard come forward? Mostly no — a known guard is the wolves' next meal.
  // But a good guard (someone attacked and saved) proves the village right, and near the end every vote counts.
  function guardWants(S, p) {
    const N = S.nights[S.nights.length - 1];
    const gj = N && N.saved === 'guard' && N.guarded && N.target !== 'first';
    const few = alive(S).length <= 6;
    let w = .02 + .05 * p.persona.bold;
    if (gj) w += .4 + .25 * p.persona.bold;
    if (few) w += .3;
    if (S.req && S.req.guardCall === S.day) w += .25;
    return Math.min(.9, w);
  }
  // should a mason pair come forward? Two proven humans steer the vote — and become the wolves' next meal.
  // A mason whose partner is the player waits for the player to speak first.
  function masonWants(S, p) {
    const mate = S.people.find(q => q.role === 'mason' && q.id !== p.id);
    if (mate && mate.isPlayer && mate.alive) return 0;
    if (alive(S).length <= 6) return .9;
    let w = S.day <= 1 ? .04 : .45 + .3 * p.persona.bold;
    if (!mate || !mate.alive) w += .15;
    if ((S.heat || {})[p.id]) w += .3;
    return Math.min(.92, w);
  }
  // a wolf may claim to be the guard too, to muddy a real one
  function wolfCounterGuard(S, realId, ev) {
    const w = alive(S).find(q => (q.role === 'wolf' || q.role === 'madman') && !q.isPlayer && !S.claims.some(x => x.by === q.id));
    if (!w || rnd(S) > (w.role === 'wolf' ? .3 : .25)) return false;
    claim(S, w.id, 'guard', ev); announce(S, S.claims.find(x => x.by === w.id), S.day, ev);
    return true;
  }
  // should a real seer come forward now? (the player's "stay hidden" asks them to wait for a wolf)
  function seerWants(S, p, black, day) {
    if (black) return true;
    const fake = S.claims.some(c => c.role === 'seer' && c.by !== p.id && person(S, c.by).alive);
    if (S.req && S.req.hide) return fake && rnd(S) < .55 + .3 * p.persona.bold;   // someone is lying in my name
    return day >= 2 || rnd(S) < .45 + .4 * p.persona.bold;
  }
  // a claimer's new results go public (real ones read their own; fakes invent)
  function announce(S, c, day, ev) {
    {
      const p = person(S, c.by);
      if (!p.alive || p.isPlayer || c.role === 'mason' || c.role === 'cat') return;
      const fresh = [];
      if (c.role === 'guard') {
        const hist = guardHistory(S, p, c); for (const r of hist) c.res.push(r);
        const last = hist[hist.length - 1]; if (last) ev.push({ t: 'result', by: p.id, role: 'guard', target: last.target, res: 'guard' });   // the rest is on the record
        return;
      }
      if (c.role === 'seer') {
        if (!S.fake[p.id] && p.role === 'seer') { for (const r of S.own[p.id] || []) if (!c.res.some(x => x.night === r.night)) fresh.push({ night: r.night, target: r.target, res: r.res, day }); }
        else { let k = 0; const R = S.req && S.req.divine[p.id]; while (c.res.length + fresh.length < day && k++ < 2) { const asked = R && R.ok && R.day === day - 1 && !c.res.some(x => x.target === R.target) && !fresh.some(x => x.target === R.target) && person(S, R.target).alive ? R.target : null; const r = fakeResult(S, p, 'seer', day, asked, fresh); if (r) fresh.push(r); else break; } }
      } else {
        const last = S.votes.filter(v => v.out).slice(-1)[0];
        if (last && !c.res.some(r => r.target === last.out)) {
          if (!S.fake[p.id] && p.role === 'medium') { const fx = person(S, last.out).role === 'fox'; fresh.push({ target: last.out, res: isWolf(S, last.out) ? 'wolf' : fx ? 'fox' : 'human', day }); if (fx) S.foxGone = true; }
          else fresh.push(fakeResult(S, p, 'medium', day, last.out));
        }
      }
      for (const r of fresh) if (r && r.target) { c.res.push(r); ev.push({ t: 'result', by: p.id, role: c.role, target: r.target, res: r.res }); }
    }
  }
  function meetingRest(S, story, ev, day, n, N, live) {
    // 2. what was found at the scene
    if (N && N.killer) {
      for (const p of live) {
        const k = (S.known[p.id] || { tr: [] }).tr.filter(x => +x.split('|')[0] === n);
        for (const key of k) {
          const t = N.traces[+key.split('|')[1]];
          let r = { cat: t.cat, val: t.val, neg: t.neg };
          const careful = sly(S) && (seenByOthers(S, p.id, n, +key.split('|')[1]) || S.claims.some(c => c.by === p.id));   // a cunning liar does not lie where it would be caught
          if (!careful && ((p.role === 'wolf' && rnd(S) < .55) || (p.role === 'madman' && rnd(S) < .5))) {   // a false report
            const vals = Object.keys(story.traits[t.cat].v).filter(v => v !== t.val);
            r = { cat: t.cat, val: pick(S, vals), neg: t.neg, lie: true };
          }
          if (S.reports.some(x => x.by === p.id && x.night === n && x.cat === r.cat)) continue;
          S.reports.push(Object.assign({ by: p.id, night: n, day }, r));
          ev.push(Object.assign({ t: 'report', by: p.id, night: n }, r));
        }
      }
      if (N.ev && N.ev.pubBy && !N.ev.told && person(S, N.ev.pubBy).alive) { N.ev.told = true; ev.push({ t: 'itemfound', by: N.ev.pubBy, night: n, owner: N.ev.owner }); }
      // 3. figures seen in the dark (said aloud; people seen out at night are told only in private)
      for (const p of live) {
        const T = testimony(S, story, p.id, n);
        if (!T) continue;
        if (rnd(S) > .3 + .45 * p.persona.bold) continue;     // the shy keep it to themselves (ask them)
        for (const s of T.saw) if (s.kind === 'fig' && !S.figs.some(f => f.by === p.id && f.night === n && f.cat === s.cat)) {
          S.figs.push({ by: p.id, night: n, cat: s.cat, val: s.val, day, lie: !!s.lie });
          ev.push({ t: 'fig', by: p.id, night: n, cat: s.cat, val: s.val });
        }
      }
    }
    // 4. accusations
    const op = {};
    for (const p of live) op[p.id] = opinion(S, story, p.id);
    const talkers = shuffle(S, live).sort((a, b) => (b.persona.talk + rnd(S) * .5) - (a.persona.talk + rnd(S) * .5)).slice(0, Math.min(live.length, 3 + Math.floor(live.length / 3)));
    const accused = {};
    for (const p of talkers) {
      const o = op[p.id];
      if (!o || !o.target) continue;
      const prev = ev.filter(e => e.t === 'accuse').slice(-1)[0];
      if (prev && prev.target === o.target && rnd(S) < .6) ev.push({ t: 'agree', by: p.id, target: o.target, with: prev.by });
      else ev.push({ t: 'accuse', by: p.id, target: o.target, why: o.why });
      accused[o.target] = (accused[o.target] || 0) + 1;
    }
    // 5. the most accused answers back
    const top = Object.keys(accused).sort((a, b) => accused[b] - accused[a])[0];
    if (top && top !== 'you' && person(S, top).alive) ev.push({ t: 'defend', by: top });
    S.heat = accused;
    S.mtg = { day, ev };
  }
  function claim(S, id, role, ev) {
    if (S.claims.some(c => c.by === id)) return;
    if (role === 'mason') {   // the pair speaks together: each names the other
      const mate = S.people.find(q => q.role === 'mason' && q.id !== id);
      S.claims.push({ by: id, role, day: S.day, res: mate ? [{ target: mate.id, res: 'human', day: S.day }] : [] });
      ev.push({ t: 'co', by: id, role, mate: mate ? mate.id : null });
      if (mate && !S.claims.some(c => c.by === mate.id)) {
        S.claims.push({ by: mate.id, role, day: S.day, res: [{ target: id, res: 'human', day: S.day }] });
        if (mate.isPlayer) S.pl.co = true;
        else if (mate.alive) ev.push({ t: 'co2', by: mate.id, role, mate: id });
      }
      return;
    }
    const rivals = S.claims.filter(c => c.role === role && person(S, c.by).alive);
    S.claims.push({ by: id, role, day: S.day, res: [] });
    ev.push({ t: 'co', by: id, role });
    for (const r of rivals) {
      ev.push({ t: 'counter', by: id, rival: r.by, role });
      if (r.by !== 'you') ev.push({ t: 'counter', by: r.by, rival: id, role });
    }
  }
  function fakeResult(S, p, role, day, target, fresh) {
    if (role === 'medium') {   // a wolf saying "human" for a dead partner, or "wolf" for a dead villager
      return { target, res: rnd(S) < .5 ? 'wolf' : 'human', day, fake: true };
    }
    const done = new Set((S.claims.find(c => c.by === p.id) || { res: [] }).res.map(r => r.target).concat((fresh || []).map(r => r.target)));
    const others = alive(S).filter(q => q.id !== p.id && !done.has(q.id));
    if (!others.length) return null;
    const realSeer = S.claims.find(c => c.role === 'seer' && c.by !== p.id);
    let t, res;
    if (target && others.some(q => q.id === target)) {   // the reading the player asked for: a wolf covers a partner, or frames a villager
      t = target;
      if (p.role === 'wolf' || (p.role === 'madman' && S.fan)) res = isWolf(S, t) ? 'human' : rnd(S) < .4 ? 'wolf' : 'human';
      else res = rnd(S) < .4 ? 'wolf' : 'human';
      return { target: t, res, day, fake: true };
    }
    if (p.role === 'wolf') {
      const inn = others.filter(q => !isWolf(S, q.id));
      if (realSeer && person(S, realSeer.by).alive && rnd(S) < .35 && !done.has(realSeer.by)) { t = realSeer.by; res = 'wolf'; }
      else if (rnd(S) < .45 && inn.length) { t = pick(S, inn).id; res = 'wolf'; }
      else { t = pick(S, others).id; res = 'human'; }
      if (res === 'human' && !isWolf(S, t) && rnd(S) < .5) { const ws = others.filter(q => isWolf(S, q.id)); if (ws.length) t = pick(S, ws).id; }
    } else if (S.fan) {   // the fanatic knows: it calls the wolves human and a villager — or the real seer — a wolf
      const inn = others.filter(q => !isWolf(S, q.id)), ws = others.filter(q => isWolf(S, q.id));
      if (realSeer && person(S, realSeer.by).alive && rnd(S) < .3 && !done.has(realSeer.by)) { t = realSeer.by; res = 'wolf'; }
      else if (ws.length && rnd(S) < .45) { t = pick(S, ws).id; res = 'human'; }
      else if (inn.length) { t = pick(S, inn).id; res = rnd(S) < .5 ? 'wolf' : 'human'; }
      else { t = pick(S, others).id; res = 'human'; }
    } else {   // the madman guesses
      t = pick(S, others).id; res = rnd(S) < .45 ? 'wolf' : 'human';
    }
    return { target: t, res, day, fake: true };
  }

  // an NPC's opinion: the person they suspect most, and the reason in words the speech can use
  function opinion(S, story, id, about) {
    const p = person(S, id);
    if (!p || !p.alive) return null;
    const { sus, A } = suspicion(S, story, id);
    let target = about || Object.keys(sus).sort((a, b) => sus[b] - sus[a])[0];
    if (!target) return null;
    return { target, score: sus[target], why: reason(S, story, id, target, A), sus };
  }
  function reason(S, story, id, t, A) {
    const p = person(S, id);
    // the last day of the fox hunt: the reasons are about the fox — seen going to its lair, or too calm now the wolves are gone
    if (S.foxHunt && S.foxLoc) {
      const den = S.pl.told.concat(Object.entries(S.gossip || {}).flatMap(([by, L]) => L.map(g => ({ by, who: g.who, loc: g.loc })))).some(g => g.who === t && g.loc === S.foxLoc);
      return { k: den ? 'den' : ['fox', 'fox2', 'fox3'][Math.floor(hash01(S.seed + 'fx' + id + t) * 3)] };
    }
    const own = (S.own[id] || []).find(r => r.target === t && r.res === 'wolf');
    if (own && p.role === 'seer') return { k: 'divined' };
    const mine = S.claims.find(c => c.by === id && c.res.some(r => r.target === t && r.res === 'wolf'));
    if (mine) return { k: 'divined' };   // their own reading: said in the first person, never "my own name + さん"
    const blk = S.claims.find(c => c.res.some(r => r.target === t && r.res === 'wolf') && c.by !== t && c.by !== id);
    if (blk) return { k: 'black', by: blk.by, role: blk.role };
    const myC = S.claims.find(c => c.by === t);
    if (myC && S.claims.filter(c => c.role === myC.role).length > 1) return { k: 'counter', role: myC.role };
    // a figure or report that clashes with traces this person saw
    const K = know(S, id);
    const fits = (q, x) => { const v = person(S, q).traits[x.cat]; return x.neg ? v !== x.val : v === x.val; };
    for (const f of S.figs.concat(S.reports)) if (f.by === t) {
      const hard = K.hard.filter(h => h.night === f.night && h.cat === f.cat);
      if (hard.length && !hard.some(h => h.neg === f.neg && h.val === f.val) && hard.some(h => !h.neg && h.val !== f.val)) return { k: 'lie', night: f.night, cat: f.cat };
    }
    // matching traces
    for (const h of K.hard.concat(K.soft.filter(s => !s.fig))) if (fits(t, h) && !h.neg) return { k: 'trace', cat: h.cat, val: h.val, night: h.night };
    for (const N of S.nights) if (N.ev && N.ev.owner === t && N.ev.seen && N.ev.seen.length) return { k: 'item' };
    const v = S.votes.slice(-1)[0];
    if (v && v.out && v.ballots[t] && v.ballots[t] !== v.out) return { k: 'vote' };
    if (person(S, t).persona && person(S, t).persona.talk < .35) return { k: 'quiet' };
    return { k: 'gut' };
  }

  /* ---------- votes ---------- */
  function npcBallots(S, story, among, playerVote) {
    const ballots = {};
    const heat = S.heat || {};
    // the wolves agree on one innocent: the one the village already doubts most
    const pub = analyze(S, 'pub');
    const pool = alive(S).filter(p => !isWolf(S, p.id) && (!among || among.includes(p.id)));
    const fakeOurs = S.claims.some(c => c.role === 'seer' && isWolf(S, c.by) && person(S, c.by).alive);
    const bw = q => pub.p[q.id] + (heat[q.id] || 0) * .12 + (S.claims.some(c => c.by === q.id && c.role === 'seer') ? (fakeOurs ? .5 : .15) : 0);
    const bloc = pool.length ? pool.slice().sort((a, b) => bw(b) - bw(a))[0].id : null;
    for (const p of alive(S)) {
      if (p.isPlayer) { if (playerVote) ballots.you = playerVote; continue; }
      const { sus } = suspicion(S, story, p.id);
      const cand = Object.keys(sus).filter(x => (!among || among.includes(x)) && x !== p.id && person(S, x).alive);
      if (!cand.length) continue;
      let best = null, bv = -1;
      for (const x of cand) {
        let v = sus[x] + (heat[x] || 0) * .06 * (1 - p.persona.logic) + (x === 'you' && S.pl.hit ? -.05 : 0);
        const gc = S.claims.filter(c => c.role === 'guard' && person(S, c.by).alive);
        if (gc.some(c => c.by === x)) v += gc.length === 1 ? -.22 * (p.persona.trust || .5) * 2 : .04;   // a lone guard is too precious to hang
        if (S.claims.some(c => c.by === x && c.role === 'cat')) v -= .16 * (1 - (p.persona.bold || .5));   // hang a cat and it takes someone along
        const sw = S.swayVote; if (sw && sw.day === S.day && sw.target === x && p.role !== 'wolf') v += sw.dir * .26 * (p.persona.trust || .5) * 2;   // what the player said after the claim
        const wolfSide = p.role === 'wolf' || (p.role === 'madman' && S.fan && !diffOf(S).easy);   // on 入門 the fanatic lies but does not vote as a bloc
        if (p.role === 'immoral' && isFox(S, x) && !diffOf(S).easy) v = -1;   // never against the fox (on 入門 it does not shield it)
        if (wolfSide && isWolf(S, x)) {      // a partner: abandon only when they are surely lost
          v = (heat[x] || 0) >= alive(S).length / 2 ? 2 : -1;
        } else if (wolfSide && x === bloc) v += p.role === 'wolf' ? .6 : .4;
        if (v > bv) { bv = v; best = x; }
      }
      ballots[p.id] = best;
    }
    return ballots;
  }
  function tally(ballots) { const c = {}; for (const k in ballots) if (ballots[k]) c[ballots[k]] = (c[ballots[k]] || 0) + 1; return c; }
  // one round of the vote: { ballots, count, top }  (among: the runoff's names)
  function voteRound(S, story, playerVote, among, ghostVote) {
    const b = npcBallots(S, story, among, playerVote);
    if (ghostVote && (!among || among.includes(ghostVote))) b.you = ghostVote;     // the dead player's one vote
    const c = tally(b);
    const max = Math.max(0, ...Object.values(c)), top = Object.keys(c).filter(k => c[k] === max);
    return { ballots: b, count: c, top, among: among || null };
  }
  // the one chosen leaves the village
  function exile(S, out, rounds, lot) {
    S.votes.push({ day: S.day, ballots: rounds[rounds.length - 1].ballots, rounds, out, lot: !!lot });
    const o = person(S, out);
    o.alive = false; o.death = { day: S.day, cause: 'exile' };
    if (o.role === 'cat') {   // the nekomata does not go alone: it takes one of those who voted it in
      const bl = rounds[rounds.length - 1].ballots || {}, voters = alive(S).filter(p => bl[p.id] === out);
      const live = voters.length ? voters : alive(S);
      if (live.length) { const v = pick(S, live); v.alive = false; v.death = { day: S.day, cause: 'cat' }; S.votes[S.votes.length - 1].dragged = v.id; }
    }
    if (S.pl.role === 'medium' && S.people[0].alive && out !== 'you') S.pl.res.push({ night: S.nights.length, target: out, res: isWolf(S, out) ? 'wolf' : o.role === 'fox' ? 'fox' : 'human', medium: true });
    return o;
  }

  /* ---------- end ---------- */
  function check(S) {
    const w = wolvesAlive(S).length, h = alive(S).length - w;
    const pl = S.people[0];
    if (!pl.alive && !S.ghost) {      // the player goes on as a ghost: their results are left behind, they keep one whisper and one vote
      S.ghost = { since: S.day, cause: pl.death.cause, whisper: 1, vote: 1, will: null };
      if ((S.pl.role === 'seer' || S.pl.role === 'medium') && S.pl.res.some(r => r.seer || r.medium)) {
        let c = S.claims.find(c => c.by === 'you');
        if (!c) { c = { by: 'you', role: S.pl.role, day: S.day, res: [], will: true }; S.claims.push(c); }
        const add = S.pl.res.filter(r => (r.seer || r.medium) && !c.res.some(x => x.target === r.target));
        for (const r of add) c.res.push({ target: r.target, res: r.res, day: S.day });
        S.ghost.will = add.length ? add.map(r => ({ target: r.target, res: r.res })) : null;
      }
    }
    const fox = S.people.some(p => p.role === 'fox' && p.alive);
    if (w === 0 && fox) {   // the wolves are gone, the fox is not: one last day to find it (until the boat comes)
      if (!S.foxHunt) { S.foxHunt = { day: S.day + (S.votes.some(v => v.day === S.day) ? 1 : 0) }; return null; }
      if (S.day < S.foxHunt.day || (S.day === S.foxHunt.day && !S.votes.some(v => v.day === S.day))) return null;
      return S.result = { win: false, why: 'fox', ghost: !!S.ghost };
    }
    if (w === 0) return S.result = { win: true, why: 'cleared', ghost: !!S.ghost, fox: !!S.foxHunt };
    if (w >= h) return S.result = { win: false, why: fox ? 'fox' : 'overrun', ghost: !!S.ghost };
    return null;
  }
  // the score is what the player did, not what the village did around them
  function score(S) {
    if (!S.result) return null;
    const foe = id => isWolf(S, id) || ['fox', 'immoral'].includes((person(S, id) || {}).role);   // the fox is the village's enemy too
    const lost = S.people.filter(p => !p.isPlayer && p.death && !foe(p.id)).length;
    const wrong = S.votes.filter(v => v.out && !foe(v.out)).length;
    const L = S.pl.log || [];
    // the player's own ballots (the last round of each day)
    let wolfVotes = 0, badVotes = 0;
    for (const v of S.votes) { const b = (v.rounds ? v.rounds[v.rounds.length - 1] : v).ballots || v.ballots; const t = b && b.you; if (!t) continue; if (foe(t)) wolfVotes++; else badVotes++; }
    const acc = L.filter(x => x.k === 'accuse'), accHit = acc.filter(x => foe(x.who)).length, accMiss = acc.length - accHit;
    const clashHit = L.filter(x => x.k === 'clash' && x.ok).length, clashMiss = L.filter(x => x.k === 'clash' && x.ok === false).length;
    const shown = L.filter(x => x.k === 'show').length;
    const mine = S.claims.find(c => c.by === 'you'), black = mine ? mine.res.filter(r => r.res === 'wolf' && isWolf(S, r.target)).length : 0;
    const deathDay = S.people[0].death ? S.people[0].death.day : null;
    const part = {
      outcome: S.result.win ? 35 : 0,
      votes: Math.min(24, wolfVotes * 8) - badVotes * 5,
      accuse: Math.min(14, accHit * 7) - accMiss * 4,
      clash: Math.min(10, clashHit * 5) - clashMiss * 2,
      evidence: Math.min(4, shown) + Math.min(8, black * 4),
      survival: deathDay == null ? 6 : deathDay <= 2 ? -10 : deathDay <= 3 ? -5 : 0,
      losses: -2 * lost,
      level: [0, 3, 5, 7, 9][S.diff] || 0,
    };
    const pts = Object.values(part).reduce((a, b) => a + b, 0);
    const rank = pts >= 88 ? 'S' : pts >= 72 ? 'A' : pts >= 55 ? 'B' : pts >= 35 ? 'C' : 'D';
    return { pts, rank, lost, wrong, days: S.day, part, wolfVotes, badVotes, accHit, accMiss, clashHit, clashMiss, shown, black, deathDay };
  }

  /* ---------- the player's actions ---------- */
  // search a place: a trace of last night, an item, a secret's clue, or nothing
  function search(S, story, loc) {
    if (S.pl.ap <= 0 || !S.people[0].alive) return { k: 'noap' };
    S.pl.ap--;
    const n = S.nights.length - 1, N = S.nights[n];
    const key = (ni, i) => ni + '|' + i;
    // the scene of the last night first
    if (N && N.loc === loc && N.killer) {
      for (let i = 0; i < N.traces.length; i++) {
        const t = N.traces[i];
        if (t.gone || S.pl.found.includes(key(n, i))) continue;
        S.pl.found.push(key(n, i));
        return { k: 'trace', night: n, idx: i, trace: t };
      }
      if (N.ev && !(N.ev.seen || []).includes('you')) {
        (N.ev.seen = N.ev.seen || []).push('you');
        return { k: 'item', night: n, owner: N.ev.owner };
      }
      if (N.traces.some(t => t.gone) && !(N.goneTold)) { N.goneTold = true; return { k: 'gone', night: n }; }
    }
    // the fox's shrine: someone sat here all night — and left a belonging behind
    if (N && S.foxLoc === loc) {
      const f = S.people.find(p => p.role === 'fox' && p.alive && p.home !== loc);
      // the signs keep a night or two: the most recent night it sat here that the player has not yet read
      const ni = f ? [n, n - 1].find(k => k >= 0 && S.nights[k] && S.nights[k].pos[f.id] === loc && !S.pl.told.some(t => t.sign && t.who === f.id && t.night === k)) : undefined;
      if (ni != null) { S.pl.told.push({ by: 'you', night: ni, kind: 'who', who: f.id, loc, eye: true, sign: true }); return { k: 'foxsign', who: f.id, loc, night: ni }; }
    }
    // an item lying here
    const it = S.items.find(x => x.loc === loc && !x.taken && S.day >= x.day);
    if (it) { it.taken = true; const def = story.items.find(x => x.id === it.id); S.pl.items.push(it.id); if (def.kind === 'ward') S.pl.ward++; return { k: 'got', item: it.id }; }
    // someone was here last night on their secret errand
    if (N) {
      const who = S.people.filter(p => p.alive && p.secret && !p.secret.open && p.role !== 'fox' && N.pos[p.id] === loc && p.home !== loc && !S.pl.clues.some(c => c.who === p.id));
      if (who.length) { const p = pick(S, who); S.pl.clues.push({ who: p.id, night: n, loc }); return { k: 'secret', who: p.id, loc }; }
    }
    return { k: 'none', loc };
  }
  // ask a person: 'night' | 'suspect' | 'about' (target) | 'secret'
  function ask(S, story, id, q, target, free) {
    if (!S.people[0].alive) return { k: 'gone' };
    if (!free) { if (S.pl.ap <= 0) return { k: 'noap' }; }
    const p = person(S, id);
    if (!p || !p.alive) return { k: 'gone' };
    if (!free) { if (!S.pl.talked[id] || S.pl.talked[id] !== S.day) { S.pl.ap--; S.pl.talked[id] = S.day; } }
    const n = S.nights.length - 1;
    if (q === 'night') {
      const T = testimony(S, story, id, n);
      for (const s of T.saw) if (s.kind === 'fig' && !S.pl.told.some(x => x.by === id && x.night === n && x.cat === s.cat)) S.pl.told.push({ by: id, night: n, kind: 'fig', cat: s.cat, val: s.val });
      for (const s of T.saw) if (s.kind === 'who') S.pl.told.push({ by: id, night: n, kind: 'who', who: s.who, loc: s.loc });
      return { k: 'night', T };
    }
    if (q === 'suspect') { const o = opinion(S, story, id); return { k: 'suspect', o }; }
    if (q === 'about') {
      const o = opinion(S, story, id, target);
      const seen = (S.gossip[id] || []).filter(g => g.who === target);
      const isW = p.role === 'wolf';
      return { k: 'about', o, target, seen: isW ? [] : seen.slice(-1) };
    }
    if (q === 'secret') {
      // the player needs a clue, or a sighting of this person out at night that they denied
      const clue = S.pl.clues.find(c => c.who === id);
      const told = S.pl.told.find(t => t.kind === 'who' && t.who === id);
      if (!clue && !told) return { k: 'nosecret' };
      if (!p.secret) return { k: 'nothing' };
      p.secret.open = true;
      return { k: 'secret', who: id };
    }
    return { k: 'none' };
  }
  // what the player can confront someone with
  const canConfront = (S, id) => { const p = person(S, id); return !!(p && p.alive && p.secret && !p.secret.open && (S.pl.clues.some(c => c.who === id) || S.pl.told.some(t => t.kind === 'who' && t.who === id))); };

  // the player shows a trace (or a sighting) to the meeting
  function present(S, story, key) {
    const [ni, ti] = key.split('|').map(Number);
    const t = S.nights[ni].traces[ti];
    if (S.reports.some(r => r.by === 'you' && r.night === ni && r.cat === t.cat)) return null;
    S.reports.push({ by: 'you', night: ni, cat: t.cat, val: t.val, neg: t.neg, day: S.day });
    // listeners who trust the player take it as their own
    for (const p of alive(S)) if (!p.isPlayer) { const k = (S.known[p.id] = S.known[p.id] || { tr: [] }); if (p.persona.trust > .35 && !k.tr.includes(key)) k.tr.push(key); }
    // a trace that fits a wolf makes the wolves afraid of the player
    const fitsWolf = S.wolves.some(w => person(S, w).alive && (t.neg ? person(S, w).traits[t.cat] !== t.val : person(S, w).traits[t.cat] === t.val));
    if (fitsWolf) S.pl.hit = Math.min(1, (S.pl.hit || 0) + .25);
    return { cat: t.cat, val: t.val, neg: t.neg };
  }
  function playerClaim(S) {
    if (S.claims.some(c => c.by === 'you')) return null;
    const role = S.pl.role;
    if (role === 'mason') { const ev = []; claim(S, 'you', 'mason', ev); S.pl.co = true; return Object.assign(S.claims.find(c => c.by === 'you'), { ev }); }
    if (role === 'cat') { const c = { by: 'you', role, day: S.day, res: [] }; S.claims.push(c); S.pl.co = true; return c; }
    if (role !== 'seer' && role !== 'medium' && role !== 'guard') return null;
    const res = role === 'guard' ? S.nights.filter(N => N.n > 0 && N.guarded).map(N => ({ night: N.n, target: N.guarded, res: 'guard', day: S.day })) : S.pl.res.map(r => ({ target: r.target, res: r.res, day: S.day }));
    const c = { by: 'you', role, day: S.day, res };
    S.claims.push(c); S.pl.co = true;
    return c;
  }
  function playerResults(S) {   // new results after a claim go public at the meeting
    const c = S.claims.find(c => c.by === 'you'); if (!c || c.role === 'mason' || c.role === 'cat') return [];
    if (c.role === 'guard') { const fr = S.nights.filter(N => N.n > 0 && N.guarded && !c.res.some(x => x.night === N.n)).map(N => ({ night: N.n, target: N.guarded, res: 'guard', day: S.day })); c.res.push(...fr); return fr; }
    const fresh = S.pl.res.filter(r => !c.res.some(x => x.target === r.target));
    for (const r of fresh) c.res.push({ target: r.target, res: r.res, day: S.day });
    return fresh;
  }

  /* ---------- the player's appeals to the village ----------
     each is said aloud: everyone hears, the wolves too. Nobody is obliged — each weighs what it costs them. */
  // "seers and mediums, come forward": each holder decides for themself
  function callOut(S, story, roles) {
    const ev = [], day = S.day;
    // asking the guard to show themselves out of the blue is what a wolf would want: who stands at the doors at night
    if (roles.includes('guard')) {
      const N = S.nights[S.nights.length - 1];
      const reason = (N && N.saved === 'guard' && N.target !== 'first') || alive(S).length <= 6 || S.claims.some(c => c.role === 'guard');
      if (!reason) {
        S.exposed = S.exposed || {}; S.exposed.you = (S.exposed.you || 0) + .35;
        (S.heat = S.heat || {}).you = (S.heat.you || 0) + 1;
        S.pl.guardSus = (S.pl.guardSus || 0) + 1;
        const w = pick(S, shuffle(S, alive(S).filter(p => !p.isPlayer)).sort((a, b) => b.persona.logic - a.persona.logic).slice(0, 3));
        if (w) ev.push({ t: 'guardsus', by: w.id });
      }
    }
    S.req.calls[day] = (S.req.calls[day] || 0) + 1;
    const live = shuffle(S, alive(S).filter(p => !p.isPlayer && !S.claims.some(c => c.by === p.id)));
    const trustYou = id => 1 - analyze(S, id).p.you;
    const decide = [];
    for (const p of live) {
      let role = null, w = 0, why = '';
      if (p.role === 'seer' && !S.fake[p.id] && roles.includes('seer')) {
        const res = S.own[p.id] || [], black = res.some(r => r.res === 'wolf');
        // a wolf found is worth the risk; with nothing found the seer weighs their life against the call
        w = black ? .95 : .06 + .12 * res.length + .3 * p.persona.bold + .25 * trustYou(p.id) - (S.req.hide ? .3 : 0);
        role = 'seer'; why = black ? 'black' : w < .45 ? 'risk' : 'trust';
      } else if (p.role === 'medium' && !S.fake[p.id] && roles.includes('medium')) {
        const has = S.votes.some(v => v.out);
        w = has ? .55 + .3 * p.persona.bold : .12 + .2 * p.persona.bold;   // nothing to tell yet: better to wait
        role = 'medium'; why = has ? 'trust' : 'risk';
      } else if (p.role === 'mason' && roles.includes('mason')) {
        const mate = S.people.find(q => q.role === 'mason' && q.id !== p.id);
        if (mate && mate.isPlayer && mate.alive) continue;   // their partner is the one asking: they wait for you
        w = .55 + .25 * p.persona.bold + .2 * trustYou(p.id);
        role = 'mason'; why = 'trust';
      } else if (p.role === 'guard' && roles.includes('guard')) {
        S.req.guardCall = day;
        w = guardWants(S, p) + .1 * p.persona.bold + .2 * trustYou(p.id);
        role = 'guard'; why = w < .45 ? 'risk' : 'trust';
      } else if (S.fake[p.id] && roles.includes(S.fake[p.id].role)) {
        const f = S.fake[p.id];
        if (f.role === 'medium' && !S.votes.some(v => v.out)) continue;
        w = .6 + .15 * (f.from <= day ? 1 : 0);   // the liars were waiting for a reason
        role = f.role; why = 'fake';
      } else continue;
      decide.push({ p, role, go: rnd(S) < Math.max(.03, Math.min(.97, w)), why });
    }
    // asked for the guard: a wolf or the madman may step forward in the guard's name
    if (roles.includes('guard') && PUB(S).guard) for (const p of live) if ((p.role === 'wolf' || p.role === 'madman') && !S.fake[p.id] && !decide.some(d => d.p.id === p.id)) { decide.push({ p, role: 'guard', go: rnd(S) < .18, why: 'fake' }); break; }
    // a fake who sees the real one step forward is pushed to counter at once
    for (const d of decide) if (!d.go && d.why === 'fake' && decide.some(x => x.go && x.role === d.role && x.why !== 'fake') && rnd(S) < (d.role === 'guard' ? .3 : .8)) d.go = true;
    // the real ones first speak, the fakes answer them
    decide.sort((a, b) => (a.why === 'fake') - (b.why === 'fake'));
    for (const d of decide) if (d.go && !S.claims.some(c => c.by === d.p.id)) { claim(S, d.p.id, d.role, ev); const c = S.claims.find(c => c.by === d.p.id); if (c) announce(S, c, day, ev); }
    if (!ev.length) {
      const t = pick(S, alive(S).filter(p => !p.isPlayer));
      if (t) ev.push({ t: 'callnone', by: t.id });
    }
    return ev;
  }
  // ask the seers (everyone who claims it) to read this person tonight
  function askDivine(S, story, target) {
    const ev = [], day = S.day;
    for (const c of S.claims.filter(c => c.role === 'seer' && c.by !== 'you' && person(S, c.by).alive)) {
      const p = person(S, c.by);
      const done = c.res.some(r => r.target === target) || (S.own[p.id] || []).some(r => r.target === target && p.role === 'seer' && !S.fake[p.id]);
      let ok, why = null;
      if (target === p.id) { ok = false; why = 'self'; }
      else if (done) { ok = false; why = 'done'; }
      else if (p.role === 'seer' && !S.fake[p.id]) {
        const A = analyze(S, p.id);
        ok = !(A.p.you > .45 && rnd(S) < .75) && !(A.p[target] < .02 && rnd(S) < .5);   // a seer distrusts a suspect's advice, and will not waste a night on the proven
        why = ok ? null : A.p.you > .45 ? 'trust' : 'waste';
      } else { ok = !(isWolf(S, target) && p.role === 'wolf' && rnd(S) < .2); why = ok ? null : 'trust'; }   // the liars mostly play along
      S.req.divine[p.id] = { target, day, ok };
      ev.push({ t: ok ? 'reqok' : 'reqno', by: p.id, target, why });
    }
    return ev;
  }
  // ask the guard, whoever they are, to stand at this door tonight (they need not come forward)
  function askGuard(S, story, target) {
    S.req.guard = { target, day: S.day };
    const by = pick(S, alive(S).filter(p => !p.isPlayer && p.id !== target));
    return by ? [{ t: target === 'you' ? 'guardself' : 'guardheard', by: by.id, target }] : [];
  }
  // "everything you found or saw, say it now": each weighs it — the shy fear the eyes on them, those with a secret fear the questions
  function callEvidence(S, story) {
    const ev = [], day = S.day, n = S.nights.length - 1, N = S.nights[n];
    S.req.evid = day;
    if (!N || !N.killer) return [{ t: 'callnone', by: (pick(S, alive(S).filter(p => !p.isPlayer)) || {}).id }].filter(e => e.by);
    const trustYou = id => 1 - analyze(S, id).p.you;
    for (const p of shuffle(S, alive(S).filter(p => !p.isPlayer))) {
      const nerve = .25 + .4 * p.persona.bold + .35 * trustYou(p.id) - (p.secret && !p.secret.open ? .2 : 0);
      if (rnd(S) > nerve) continue;
      // traces they saw with their own eyes and kept to themselves
      for (const key of (S.known[p.id] || { tr: [] }).tr.filter(x => +x.split('|')[0] === n)) {
        const t = N.traces[+key.split('|')[1]];
        if (S.reports.some(x => x.by === p.id && x.night === n && x.cat === t.cat)) continue;
        let r = { cat: t.cat, val: t.val, neg: t.neg };
        const careful = sly(S) && (seenByOthers(S, p.id, n, +key.split('|')[1]) || S.claims.some(c => c.by === p.id));
        if (!careful && ((p.role === 'wolf' && rnd(S) < .6) || (p.role === 'madman' && rnd(S) < .5))) r = { cat: t.cat, val: pick(S, Object.keys(story.traits[t.cat].v).filter(v => v !== t.val)), neg: t.neg, lie: true };
        S.reports.push(Object.assign({ by: p.id, night: n, day }, r));
        ev.push(Object.assign({ t: 'report', by: p.id, night: n }, r));
      }
      const T = testimony(S, story, p.id, n);
      if (!T) continue;
      for (const sg of T.saw) {
        if (sg.kind === 'fig' && !S.figs.some(f => f.by === p.id && f.night === n && f.cat === sg.cat)) {
          S.figs.push({ by: p.id, night: n, cat: sg.cat, val: sg.val, day, lie: !!sg.lie });
          ev.push({ t: 'fig', by: p.id, night: n, cat: sg.cat, val: sg.val });
        } else if (sg.kind === 'who' && ev.filter(e => e.t === 'whoseen').length < 2 && person(S, sg.who).alive && rnd(S) < .3 + .4 * trustYou(p.id) && !ev.some(e => e.t === 'whoseen' && e.who === sg.who)) {
          // someone out at night, said in front of everyone: that person must answer for it
          S.pl.told.push({ by: p.id, night: n, kind: 'who', who: sg.who, loc: sg.loc });
          (S.heat = S.heat || {})[sg.who] = (S.heat[sg.who] || 0) + 1;
          ev.push({ t: 'whoseen', by: p.id, who: sg.who, loc: sg.loc });
          if (sg.who !== 'you') ev.push({ t: 'denyseen', by: sg.who });
        }
      }
    }
    if (!ev.length) { const t = pick(S, alive(S).filter(p => !p.isPlayer)); if (t) ev.push({ t: 'evnone', by: t.id }); }
    return ev;
  }
  /* ---------- contradictions the player can point out (only from what the player knows) ---------- */
  function contradictions(S, story) {
    const out = [], fitsT = (v, t) => t.neg ? v !== t.val : v === t.val;
    const done = new Set(S.pl.pointed || []);
    const mine = {}; for (const k of S.pl.found) { const [ni, ti] = k.split('|').map(Number); const t = S.nights[ni].traces[ti]; (mine[ni] = mine[ni] || []).push(t); }
    // 1. a report of a trace that differs from the trace the player saw with their own eyes
    for (const r of S.reports) {
      if (r.by === 'you' || !person(S, r.by).alive) continue;
      const t = (mine[r.night] || []).find(t => t.cat === r.cat && t.neg === r.neg);
      if (t && t.val !== r.val) out.push({ id: 'tr|' + r.by + '|' + r.night + '|' + r.cat, kind: 'trace', who: r.by, night: r.night, said: { cat: r.cat, val: r.val, neg: r.neg }, seen: { cat: t.cat, val: t.val, neg: t.neg } });
    }
    // 2. a figure someone says they saw, that no trace of that night allows
    const figs = S.figs.map(f => Object.assign({ pub: true }, f)).concat(S.pl.told.filter(t => t.kind === 'fig'));
    for (const f of figs) {
      if (f.by === 'you' || !person(S, f.by).alive) continue;
      const t = (mine[f.night] || []).find(t => t.cat === f.cat && !fitsT(f.val, t));
      if (t && !out.some(o => o.kind === 'fig' && o.who === f.by && o.night === f.night)) out.push({ id: 'fg|' + f.by + '|' + f.night + '|' + f.cat, kind: 'fig', who: f.by, night: f.night, said: { cat: f.cat, val: f.val }, seen: { cat: t.cat, val: t.val, neg: t.neg } });
    }
    // 3. "I was at home" — but someone saw them out that night
    for (const key in S.testi) {
      const T = S.testi[key];
      if (!(S.pl.log || []).some(x => x.k === 'night' && x.who === T.id && x.T && x.T.night === T.night)) continue;   // the player heard it
      const P = person(S, T.id); if (!P.alive || (P.secret && P.secret.open)) continue;   // an errand already confessed explains the lie
      const w = S.pl.told.find(t => t.kind === 'who' && t.who === T.id && t.night === T.night && t.loc !== T.loc && t.by !== T.id);
      if (w) out.push({ id: 'wh|' + T.id + '|' + T.night, kind: 'where', who: T.id, night: T.night, said: { loc: T.loc }, seen: { loc: w.loc, by: w.by } });
    }
    // 4. a story that breaks itself: "I was at home" — yet saw someone where home cannot see
    for (const x of S.pl.log || []) {
      if (x.k !== 'night' || !x.T || x.T.night == null) continue;
      const T = x.T, P = person(S, T.id); if (!P || !P.alive || (P.secret && P.secret.open && T.hid)) continue;
      for (const sg of T.saw) if (sg.kind === 'who' && !canSee(story, T.loc, sg.loc) && !out.some(o => o.id === 'sf|' + T.id + '|' + T.night)) out.push({ id: 'sf|' + T.id + '|' + T.night, kind: 'self', who: T.id, night: T.night, said: { loc: T.loc }, seen: { who: sg.who, loc: sg.loc }, hid: !!T.hid });
    }
    return out.filter(o => !done.has(o.id));
  }
  /* ---------- 矛盾を突く, in three steps: whose words → what evidence → which part is wrong ---------- */
  // everything a person has said about one night, that the player heard (to them, or in the meeting), split into parts
  function statements(S, story) {
    const by = {};
    const get = (id, n) => { const k = id + '|' + n; return by[k] = by[k] || { id: k, who: id, night: n, parts: [] }; };
    for (const x of S.pl.log || []) {
      if (x.k !== 'night' || !x.T || x.T.night == null) continue;
      const st = get(x.who, x.T.night);
      if (!st.parts.some(p => p.k === 'loc')) st.parts.push({ k: 'loc', loc: x.T.loc });
      for (const s of x.T.saw) {
        if (s.kind === 'fig' && !st.parts.some(p => p.k === 'fig' && p.cat === s.cat)) st.parts.push({ k: 'fig', cat: s.cat, val: s.val });
        if (s.kind === 'who' && !st.parts.some(p => p.k === 'who' && p.who === s.who)) st.parts.push({ k: 'who', who: s.who, loc: s.loc });
      }
    }
    // a sighting told in the meeting ("I saw X at B"), not only to the player's face
    for (const t of S.pl.told) if (t.kind === 'who' && t.by !== 'you' && !t.sign) { const st = get(t.by, t.night); if (!st.parts.some(p => p.k === 'who' && p.who === t.who)) st.parts.push({ k: 'who', who: t.who, loc: t.loc }); }
    for (const r of S.reports) if (r.by !== 'you') { const st = get(r.by, r.night); if (!st.parts.some(p => p.k === 'trace' && p.cat === r.cat)) st.parts.push({ k: 'trace', cat: r.cat, val: r.val, neg: r.neg }); }
    for (const f of S.figs) { const st = get(f.by, f.night); if (!st.parts.some(p => p.k === 'fig' && p.cat === f.cat)) st.parts.push({ k: 'fig', cat: f.cat, val: f.val }); }
    return Object.values(by).filter(st => st.parts.length && person(S, st.who).alive);
  }
  // what the player can lay on the table
  function evidence(S) {
    const out = [];
    for (const k of S.pl.found) { const [ni, ti] = k.split('|').map(Number); const t = S.nights[ni].traces[ti]; out.push({ id: 'tr|' + k, k: 'trace', night: ni, cat: t.cat, val: t.val, neg: t.neg, loc: S.nights[ni].loc }); }
    out.push({ id: 'self', k: 'self' });
    // what someone said of themselves: "I was at A that night" — laid against a sighting of them elsewhere
    for (const x of S.pl.log || []) { if (x.k !== 'night' || !x.T || x.T.night == null) continue; const id = 'sd|' + x.T.id + '|' + x.T.night; if (!out.some(o => o.id === id) && person(S, x.T.id).alive) out.push({ id, k: 'said', night: x.T.night, who: x.T.id, loc: x.T.loc }); }
    S.pl.told.filter(t => t.kind === 'who').forEach((t, i) => { if (!out.some(o => o.k === 'seen' && o.who === t.who && o.night === t.night && o.loc === t.loc)) out.push({ id: 'sw|' + i, k: 'seen', night: t.night, who: t.who, loc: t.loc, by: t.by }); });
    return out;
  }
  // the evidence that could bear on one part of a statement: the same night, about the same person or the same kind of trace
  function clashEvidence(S, story, stmtId, partIdx) {
    const st = statements(S, story).find(x => x.id === stmtId); if (!st) return [];
    const part = st.parts[partIdx]; if (!part) return [];
    return evidence(S).filter(e => {
      if (e.k === 'self') return part.k === 'loc' ? st.parts.some(p => p.k === 'who') : part.k === 'who';
      if (e.night !== st.night) return false;
      if (part.k === 'loc') return e.k === 'seen' && e.who === st.who;
      if (part.k === 'who') return (e.k === 'said' && e.who === part.who) || (e.k === 'seen' && e.who === part.who && e.by !== st.who);
      return e.k === 'trace' && e.cat === part.cat;
    });
  }
  // judge: do this part and this evidence really clash? If they do, the truth of the night says which side lied
  function judgeClash(S, story, stmtId, partIdx, evId) {
    const st = statements(S, story).find(x => x.id === stmtId), ev = evidence(S).find(x => x.id === evId);
    if (!st || !ev) return { ok: false, why: 'none' };
    const part = st.parts[partIdx]; if (!part) return { ok: false, why: 'none' };
    const N = S.nights[st.night] || { pos: {}, traces: [] }, fitsT = (v, t) => t.neg ? v !== t.val : v === t.val;
    const lp = st.parts.find(p => p.k === 'loc');
    // 1. is it a real clash?
    let clash = false, why = 'agree', other = null;   // other: who told the evidence, if the evidence itself could be the lie
    if (ev.k === 'self') {
      const bad = lp && st.parts.find(p => p.k === 'who' && !canSee(story, lp.loc, p.loc));
      clash = part.k === 'loc' ? !!bad : part.k === 'who' && lp && !canSee(story, lp.loc, part.loc);
      why = 'sees';
    } else if (ev.night !== st.night) why = 'night';
    else if (part.k === 'loc') { if (ev.k === 'seen' && ev.who === st.who) { clash = ev.loc !== part.loc; other = ev.by !== 'you' ? ev.by : null; } else why = 'other'; }
    else if (part.k === 'who') {
      if ((ev.k === 'said' || ev.k === 'seen') && ev.who === part.who) { clash = ev.loc !== part.loc; other = ev.k === 'said' ? ev.who : ev.by !== 'you' ? ev.by : null; } else why = 'other';
    }
    else if (ev.k !== 'trace' || ev.cat !== part.cat) why = 'kind';
    else if (part.k === 'fig') clash = !fitsT(part.val, ev);
    else if (part.k === 'trace') { if (ev.neg !== part.neg) why = 'kind'; else clash = ev.val !== part.val; }
    if (!clash) {
      // a miss: the village hears the player accuse someone with nothing — the player's word is worth a little less
      S.exposed = S.exposed || {}; S.exposed.you = (S.exposed.you || 0) + .25;
      (S.heat = S.heat || {}).you = ((S.heat || {}).you || 0) + 1;
      S.pl.miss = S.pl.miss || {}; S.pl.miss[S.day] = (S.pl.miss[S.day] || 0) + 1;
      return { ok: false, why, ev: [{ t: 'denyseen', by: st.who }] };
    }
    const key = 'cl|' + [st.id, part.k, part.who || part.cat || '', ev.id].join('|');
    if ((S.pl.pointed || []).includes(key)) return { ok: false, why: 'done', again: true };
    (S.pl.pointed = S.pl.pointed || []).push(key);
    // 2. which side is false? the night itself knows
    const killer = N.killer ? person(S, N.killer) : null;
    const partTrue = part.k === 'loc' ? N.pos[st.who] === part.loc
      : part.k === 'who' ? N.pos[part.who] === part.loc
      : part.k === 'fig' ? !!killer && killer.traits[part.cat] === part.val
      : (N.traces || []).some(t => t.cat === part.cat && t.neg === part.neg && t.val === part.val);
    const selfFalse = ev.k === 'self';   // a story that breaks itself is false as told
    let liar = st.who;
    if (!selfFalse && partTrue && other) liar = other;   // the clicked words hold: the evidence was the lie
    S.exposed = S.exposed || {};
    const out = [], P = person(S, liar);
    const bump = (x, w) => { S.exposed[x] = (S.exposed[x] || 0) + w; (S.heat = S.heat || {})[x] = (S.heat[x] || 0) + 1; };
    if (liar !== st.who) out.push({ t: 'denyseen', by: st.who });
    // a human with a secret errand lied only about where they were: they own up
    const aboutSelf = (liar === st.who && (part.k === 'loc' || selfFalse)) || (liar === other && ev.k === 'said');
    if (aboutSelf && P.secret && !P.secret.open && P.role !== 'wolf' && P.role !== 'madman' && P.role !== 'fox') { P.secret.open = true; out.push({ t: 'confess', by: liar }); }
    else { bump(liar, 1); out.push({ t: 'caught', by: liar }); const w = pick(S, alive(S).filter(q => !q.isPlayer && q.id !== liar && q.id !== st.who)); if (w) out.push({ t: 'notice', by: w.id, target: liar }); }
    return { ok: true, ev: out, liar, other: liar !== st.who };
  }
  /* ---------- かばう: lay down evidence that someone did not do it ---------- */
  // what could speak for this person: a trace their body does not fit, a sighting of them elsewhere on a night of an attack, your own reading of them
  function defendEvidence(S, story, id) {
    const p = person(S, id); if (!p) return [];
    const out = [];
    for (const k of S.pl.found) { const [ni, ti] = k.split('|').map(Number); const t = S.nights[ni].traces[ti]; out.push({ id: 'tr|' + k, k: 'trace', night: ni, cat: t.cat, val: t.val, neg: t.neg, loc: S.nights[ni].loc }); }
    S.pl.told.forEach((t, i) => { if (t.kind === 'who' && t.who === id && S.nights[t.night] && S.nights[t.night].killer && !out.some(o => o.k === 'seen' && o.night === t.night && o.loc === t.loc && o.by === t.by)) out.push({ id: 'sw|' + i, k: 'seen', night: t.night, loc: t.loc, by: t.by }); });
    for (const r of S.pl.res) if (r.target === id && r.res !== 'wolf') out.push({ id: 'rs|' + (r.test ? 'test' : r.seer ? 'seer' : r.mason ? 'mason' : 'medium') + '|' + r.night, k: 'res', res: r.res, how: r.test ? 'test' : r.seer ? 'seer' : r.mason ? 'mason' : 'medium' });
    return out;
  }
  // judge: does it really speak for them? The truth of the night decides (a made-up sighting cannot clear the killer)
  function judgeDefend(S, story, id, evId) {
    const p = person(S, id), ev = defendEvidence(S, story, id).find(e => e.id === evId);
    if (!p || !ev) return { ok: false, why: 'none' };
    const key = 'df|' + id + '|' + evId;
    if ((S.pl.defended || []).includes(key)) return { ok: false, again: true };
    const fitsT = (v, t) => t.neg ? v !== t.val : v === t.val;
    let ok = false, why = '', w = 0;
    if (ev.k === 'trace') { ok = !fitsT(p.traits[ev.cat], ev); why = ok ? 'trace' : 'fits'; w = .5; }
    else if (ev.k === 'seen') {
      const N = S.nights[ev.night];
      if (ev.loc === N.loc) { why = 'scene'; }                            // seen at the very place of the attack: that speaks against them
      else if (N.killer === id) { why = 'lie'; }                          // the sighting was made up (or wrong): they were the one
      else { ok = true; why = 'seen'; w = ev.by === 'you' ? .7 : .45; }
    } else if (ev.k === 'res') { ok = true; why = 'res'; w = ev.how === 'mason' ? 1 : .8; }
    if (!ok) {
      S.exposed = S.exposed || {}; S.exposed.you = (S.exposed.you || 0) + .2;
      (S.heat = S.heat || {}).you = ((S.heat || {}).you || 0) + 1;
      S.pl.miss = S.pl.miss || {}; S.pl.miss[S.day] = (S.pl.miss[S.day] || 0) + 1;
      return { ok: false, why };
    }
    (S.pl.defended = S.pl.defended || []).push(key);
    S.vouch = S.vouch || {}; S.vouch[id] = Math.min(1.2, (S.vouch[id] || 0) + w);
    if (S.heat && S.heat[id]) S.heat[id] = Math.max(0, S.heat[id] - 1);
    const ag = pick(S, alive(S).filter(q => !q.isPlayer && q.id !== id && q.role !== 'wolf'));
    return { ok: true, why, agree: ag ? ag.id : null };
  }
  // point one out in the meeting: the liar is caught, a hidden errand comes out, or a false sighting turns on its teller
  function pointOut(S, story, id, over) {
    let c = contradictions(S, story).find(o => o.id === id);
    if (!c) return [];
    if (over && c.seen) c = Object.assign({}, c, { seen: Object.assign({}, c.seen, over) });   // the sighting the player actually laid down
    (S.pl.pointed = S.pl.pointed || []).push(id);
    S.exposed = S.exposed || {};
    const ev = [], p = person(S, c.who);
    const bump = (x, w) => { S.exposed[x] = (S.exposed[x] || 0) + w; (S.heat = S.heat || {})[x] = (S.heat[x] || 0) + 1; };
    const witness = () => pick(S, alive(S).filter(q => !q.isPlayer && q.id !== c.who && q.id !== (c.seen && c.seen.by)));
    if (c.kind === 'self') {
      if (c.hid && p.secret && !p.secret.open) { p.secret.open = true; ev.push({ t: 'confess', by: c.who }); }   // they were out on their errand, and told the truth about what they saw
      else { bump(c.who, 1); ev.push({ t: 'caught', by: c.who }); const w = witness(); if (w) ev.push({ t: 'notice', by: w.id, target: c.who }); }
      return ev;
    }
    if (c.kind !== 'where') {
      // innocents tell what they saw; a trace or a figure that the player's own eyes deny is a lie
      bump(c.who, 1); ev.push({ t: 'caught', by: c.who });
      const w = witness(); if (w) ev.push({ t: 'notice', by: w.id, target: c.who });
      return ev;
    }
    const N = S.nights[c.night];
    if (N && N.pos[c.who] === c.seen.loc) {
      if (p.secret && !p.secret.open && p.role !== 'wolf' && p.role !== 'madman' && p.role !== 'fox') {   // the hidden errand: a human with a secret
        p.secret.open = true; ev.push({ t: 'confess', by: c.who });
      } else { bump(c.who, 1); ev.push({ t: 'caught', by: c.who }); const w = witness(); if (w) ev.push({ t: 'notice', by: w.id, target: c.who }); }
    } else {   // the sighting was made up: the one who told it is the liar
      ev.push({ t: 'denyseen', by: c.who });
      if (c.seen.by !== 'you' && person(S, c.seen.by).alive) { bump(c.seen.by, .6); ev.push({ t: 'caught', by: c.seen.by }); }
    }
    return ev;
  }
  // "seers, stay hidden until you find a wolf" (or lift it)
  function askHide(S, on) { S.req.hide = !!on; return []; }

  // the player's view (an assist on the easiest level): who fits every trace the player has found
  function fitsTraces(S, id) {
    const p = person(S, id), by = {};
    for (const k of S.pl.found) { const [ni, ti] = k.split('|').map(Number); const t = S.nights[ni].traces[ti]; (by[ni] = by[ni] || []).push(t); }
    const res = {};
    for (const ni in by) res[ni] = by[ni].every(t => t.neg ? p.traits[t.cat] !== t.val : p.traits[t.cat] === t.val);
    return res;
  }

  const isFox = (S, id) => (person(S, id) || {}).role === 'fox';
  root.WLEngine = { ROLE, SETUP, SETUPS, setupOf, RS, PUB, isFox, foxView, DIFF, CATS, newGame, night, meeting, voteRound, exile, check, score, search, ask, present, playerClaim, playerResults, callOut, callEvidence, contradictions, pointOut, dodge, dodgeTalk, near, canSee, statements, evidence, clashEvidence, judgeClash, defendEvidence, judgeDefend, askDivine, askGuard, askHide, testimony, analyze, opinion, suspicion, npcSearch, canConfront, fitsTraces, person, alive, isWolf, rnd, pick, shuffle };
})(typeof window !== 'undefined' ? window : globalThis);
