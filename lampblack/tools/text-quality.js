#!/usr/bin/env node
/* 狼影灯 — 文章の採点（物語ごと100点から減点。合格は90点。くわしい基準は claude/lampblack-spec.md「文章の基準」）
   usage: node lampblack/tools/text-quality.js [story] [--show]
   見るもの：抜け・置き換えの崩れ、毎回変わる配役と矛盾する名指し、長すぎる文、同じ文末の連続、
   使い古された言い回し、感情を説明する言葉、五感の手ざわり、口調のぶれ、くり返し、画面に収まる長さ、声（voices.js）の抜けと重なり */
const W = require('./load.js');
const show = process.argv.includes('--show');
const only = process.argv.slice(2).find(a => !a.startsWith('--'));
const ACTS = ['hello', 'home', 'fig', 'who', 'none', 'sus', 'nosus', 'okay', 'bad', 'seen', 'co_seer', 'co_medium', 'rs_w', 'rs_h', 'rm_w', 'rm_h', 'co_mason', 'co_mason2', 'rm_f', 'co_cat', 'co_cat_dodge', 'report', 'item', 'accuse', 'agree', 'defend', 'grief', 'deny', 'counter', 'thanks'];
const CLICHE = ['背筋が凍', '血の気が引', '息を呑ん', '静寂が支配', '闇に包まれ', '不穏な空気', '戦慄が走', '嫌な予感', '心臓が早鐘', '悪寒が走', '凍りつい', '時が止まった'];
const TELL = ['恐ろしい', '恐怖', '不気味', '悲しい', '怖かった', '怖い', '寂しい', 'ぞっと', '戦慄'];
const SENSE = /吹雪|息|燭|炭|靴|跡|音|匂|香|冷た|温|白|黒|赤|光|灯|湯気|雪|雨|風|霜|煤|湿|濡|鳴|響|揺|軋|きし|ぬく|凍|潮|波|火|煙|錆|鉄|硝子|銀|真鍮|木|石|砂|泥|毛|爪|紙|インク|墨|針|糸|指|青銅|花|色|湯呑|鎖|網|線香/;
const sents = s => (String(s).replace(/\{\w+\}/g, '〇').match(/[^。！？\n]+[。！？」』]*/g) || []).map(x => x.trim()).filter(Boolean);
const ending = s => { const b = s.replace(/[。！？」』]+$/, ''); return b.slice(-2); };
let fail = 0;

function scoreStory(st) {
  const ded = [], add = (n, why) => ded.push([n, why]);
  const T = st.text || {};
  const names = st.chars.map(c => c.name);
  // 1. completeness
  const need = { prologue: 5, day: 6, peace: 2, exile: 2, night: 2, climax: 2 };
  for (const k in need) if (!T[k] || T[k].length < need[k]) add(10, `text.${k} が${need[k]}つ未満`);
  for (const k of ['meet', 'vote', 'role', 'win', 'lose', 'winGhost', 'loseGhost', 'dead', 'exiledYou', 'ghost']) if (!T[k]) add(10, `text.${k} がない`);
  for (const l of st.locs) { if (!(T.discover || {})[l.id] || T.discover[l.id].length < 2) add(6, `発見の文（${l.name}）が2つ未満`); if (!l.none || l.none.length < 2) add(3, `空振りの文（${l.name}）が2つ未満`); }
  if (st.locs.length !== 5) add(10, '場所が5つでない');
  if (st.chars.length !== 12) add(15, '人物が12人でない');
  const voices = new Set(st.chars.map(c => c.voice)); if (voices.size !== 12) add(10, `声が重なっている（${12 - voices.size}組）`);
  const RR = W.WLEngine.setupOf(st, 13), roleSet = ['villager', 'seer', 'medium', 'guard', 'mason', 'cat'].filter(r => r === 'villager' || RR[r]);
  if (st.rules === 'cat' && (!T.catDrag || !T.catJail)) add(8, '猫又の文（噛まれた道連れ・追放の道連れ）がない');
  if (st.rules === 'fanatic' && (!st.roles.madman || !st.roles.madman.perk)) add(8, '狂信者の役の文がない');
  for (const r of roleSet) if (!st.roles[r] || !st.roles[r].how || !st.roles[r].perk) add(5, `役 ${r} の文がない`);
  if (st.rules && !st.rulesNote) add(5, '物語のしくみ（rulesNote）の説明がない');
  if (RR.fox && (!st.roles.fox || !st.roles.fox.perk || !T.loseFox || !T.curse || !T.foxBite || !T.foxSign)) add(8, '妖狐の文（役・敗北・呪い死・牙の空振り・社の跡）がそろっていない');
  if (RR.immoral && (!st.roles.immoral || !st.roles.immoral.perk || !T.follow)) add(8, '背徳者の文（役・後追いの朝）がそろっていない');
  const kinds = new Set(st.items.map(i => i.kind)); for (const k of ['stake', 'secret', 'ward', 'test']) if (!kinds.has(k)) add(5, `道具 ${k} がない`);
  for (const cat of ['height', 'hand', 'foot', 'mark']) { const t = st.traits[cat]; if (!t) { add(10, `特徴 ${cat} がない`); continue; } for (const v in t.v) { if (!t.tr[v]) add(4, `痕跡の文 ${cat}.${v} がない`); if (cat !== 'hand' && !t.ntr[v]) add(3, `否定の痕跡 ${cat}.${v} がない`); if (cat !== 'mark' && !t.fig[v]) add(3, `人影 ${cat}.${v} がない`); } }
  // trait combos must tell people apart
  const combo = {}; for (const c of st.chars) { const k = ['height', 'hand', 'foot', 'mark'].map(x => c.traits[x]).join('/'); if (combo[k]) add(8, `特徴がまったく同じ：${combo[k]}と${c.name}`); combo[k] = c.name; }
  for (const c of st.chars) {
    for (const f of ['name', 'job', 'voice', 'color', 'look', 'traits', 'home', 'persona', 'belong', 'profile', 'intro', 'secret', 'last', 'note', 'wolf']) if (!c[f]) add(5, `${c.name}：${f} がない`);
    if (c.secret) { if (!/\{belong\}/.test(c.secret.clue)) add(4, `${c.name}：秘密の手がかりに持ち物がない`); if (c.secret.loc === c.home) add(6, `${c.name}：秘密の場所が家と同じ`); if (!st.locs.some(l => l.id === c.secret.loc)) add(6, `${c.name}：秘密の場所がない`); }
    if (!st.locs.some(l => l.id === c.home) && c.home) add(6, `${c.name}：家の場所がない`);
  }
  // 2. fixed narration must not name a cast member (the cast changes every play)
  const fixed = [];
  (T.prologue || []).forEach((p, i) => fixed.push(['prologue' + i, p.t]));
  for (const k of ['day', 'peace', 'exile', 'night', 'climax']) (T[k] || []).forEach((t, i) => fixed.push([k + i, t]));
  for (const k of ['meet', 'vote', 'role', 'win', 'lose', 'winGhost', 'loseGhost', 'dead', 'exiledYou', 'ghost']) if (T[k]) fixed.push([k, T[k]]);
  for (const l in T.discover || {}) T.discover[l].forEach((t, i) => fixed.push(['discover.' + l + i, t]));
  st.locs.forEach(l => { fixed.push(['loc.' + l.id, l.desc]); l.none.forEach((t, i) => fixed.push(['none.' + l.id + i, t])); });
  st.items.forEach(it => fixed.push(['item.' + it.id, it.found + it.desc + (it.use || '')]));
  for (const e of Object.values((st.arc || {}).days || {}).flat()) for (const k of ['t', 'n']) if (e[k]) fixed.push(['arc/' + k, e[k]]);
  for (const e of T.prologue || []) if (e.n) fixed.push(['arc/pn', e.n]);
  if ((st.arc || {}).coda) fixed.push(['arc.coda', st.arc.coda]);
  for (const [k, t] of fixed) for (const n of names) if (t.includes(n)) add(8, `${k}：配役が変わるのに「${n}」を名指ししている`);
  // a character's own lines naming another character: allowed (they live there), but only a few
  let cross = 0; for (const c of st.chars) for (const f of ['intro', 'last', 'note', 'wolf']) for (const n of names) if (n !== c.name && String(c[f]).includes(n)) cross++;
  if (cross > 5) add(2 * (cross - 5), `人物のせりふが他の人物を${cross}回名指し`);
  // 3. placeholders
  const allow = { discover: /\{(victim|note)\}/g, peace: /\{loc\}/g, exile: /\{name\}/g, prologue: /\{(first|firstNote)\}/g, role: /\{roleHow\}/g };
  for (const [k, t] of fixed) { const ph = (t.match(/\{\w+\}/g) || []); const kk = k.replace(/[.\d].*$/, '').replace(/\d+$/, ''); const ok = allow[kk]; for (const p of ph) if (!ok || !p.match(new RegExp(ok.source))) if ((!/^item/.test(k) || !/\{(loc|name)\}/.test(p)) && !/^arc/.test(k)) add(5, `${k}：置き換えられない ${p}`); }
  // 4. prose quality over all the narration and the characters' own lines
  const prose = fixed.map(x => x[1]).concat(st.chars.flatMap(c => [c.profile, c.intro, c.last, c.note, c.wolf, c.secret && c.secret.confess, c.secret && c.secret.clue]).filter(Boolean)).concat(narrLines(st).map(l => l[1]));
  const all = prose.join('\n');
  let long = 0; for (const t of prose) for (const s of sents(t)) if (s.length > 72) long++;
  if (long) add(Math.min(15, long * 1.5), `長すぎる文（72字超）${long}`);
  let run = 0; for (const t of prose) { const E = sents(t).map(ending); for (let i = 2; i < E.length; i++) if (E[i] === E[i - 1] && E[i] === E[i - 2]) { run++; break; } }
  if (run) add(run * 3, `同じ文末が3文続く文章 ${run}`);
  for (const c of CLICHE) { const n = all.split(c).length - 1; if (n) add(4 * n, `使い古された言い回し「${c}」×${n}`); }
  let tell = 0; for (const w of TELL) tell += all.split(w).length - 1; if (tell > 2) add((tell - 2) * 2, `感情を説明する言葉 ${tell}`);
  const narr = fixed.filter(([k]) => /^(prologue|day|discover|peace|night|climax|win|lose|dead|exiledYou)/.test(k));
  const flat = narr.filter(([, t]) => !SENSE.test(t)); if (flat.length > narr.length * .15) add(Math.round((flat.length / narr.length - .15) * 40), `五感の手ざわりのない地の文 ${flat.length}/${narr.length}：${flat.map(x => x[0]).slice(0, 4).join(',')}`);
  // repeated 10-char runs inside one story (3 places or more)
  const grams = {}; prose.forEach((t, i) => { const s = t.replace(/\{\w+\}|\s/g, ''); const seen = new Set(); for (let j = 0; j + 10 <= s.length; j++) { const g = s.slice(j, j + 10); if (/[、。]/.test(g[0])) continue; if (!seen.has(g)) { seen.add(g); (grams[g] = grams[g] || []).push(i); } } });
  const rep = Object.entries(grams).filter(([, v]) => v.length >= 3).map(([g]) => g);
  const repU = rep.filter((g, i) => !rep.some((h, j) => j < i && (h.includes(g.slice(1)) || g.includes(h.slice(1)))));
  if (repU.length > 4) add(Math.min(10, repU.length - 4), `3か所以上でくり返す言い回し ${repU.length}：${repU.slice(0, 4).join(' / ')}`);
  // 5. voice: the first person and the register of each character's own lines
  for (const c of st.chars) {
    const V = W.WL_VOICES[c.voice]; if (!V) { add(8, `${c.name}：声 ${c.voice} がない`); continue; }
    const lines = [c.intro, c.last, c.wolf, c.secret && c.secret.confess].concat(narrLines(st).filter(l => l[0] === c.id).map(l => l[1])).filter(Boolean).join('');
    const fps = ['わし', 'わたし', 'わたくし', 'おれ', 'あたし', '僕', 'ぼく', '私', '手前'];
    const used = fps.filter(f => new RegExp(f === '私' ? '私(?!たち)' : f).test(lines.replace(/わたし/g, f === 'わし' ? '' : 'わたし')));
    const same = { '私': ['わたし'], 'わたし': ['私'], '手前': ['あたし'] };
    const off = used.filter(f => f !== V.fp && !(same[V.fp] || []).includes(f));
    if (off.length) add(3, `${c.name}：一人称が声（${V.fp}）と違う：${off.join(',')}`);
    const S = sents(lines), pol = S.filter(s => /(です|ます|ません|ました|でした|ございます|でしょう|ください)[。！？」]*$/.test(s)).length;
    if (V.reg === 'polite' && c.voice !== 'merchant' && pol < S.length * .35) add(3, `${c.name}：丁寧な声なのに丁寧語が少ない（${pol}/${S.length}）`);
    if (V.reg !== 'polite' && c.voice !== 'merchant' && pol > S.length * .25) add(3, `${c.name}：くだけた声なのに丁寧語が多い（${pol}/${S.length}）`);
    if (String(c.wolf).length < 70) add(3, `${c.name}：狼の告白が短い（動機が伝わらない）`);
    if (String(c.note).length > 64 || String(c.note).length < 14) add(2, `${c.name}：遺された様子の長さ（${String(c.note).length}字）`);
  }
  // 6. fits the screen
  const lim = [['tag', st.tag, 28], ['concept', st.concept, 130]];
  st.chars.forEach(c => lim.push([c.name + '.intro', c.intro, 56], [c.name + '.last', c.last, 72], [c.name + '.profile', c.profile, 80], [c.name + '.confess', c.secret && c.secret.confess, 150], [c.name + '.wolf', c.wolf, 150]));
  st.items.forEach(i => lim.push([i.id + '.desc', i.desc, 64]));
  for (const cat in st.traits) for (const v in st.traits[cat].tr) lim.push([cat + '.' + v, st.traits[cat].tr[v], 64]);
  for (const [k, t, n] of lim) if (t && t.length > n) add(2, `${k} が長い（${t.length}/${n}字）`);
  const score = Math.max(0, Math.round(100 - ded.reduce((a, d) => a + d[0], 0)));
  return { score, ded };
}

function scoreVoices() {
  const ded = [], add = (n, why) => ded.push([n, why]);
  const V = W.WL_VOICES, seen = {};
  for (const k in V) {
    for (const a of ACTS) if (!V[k][a] || !V[k][a].length) add(3, `${k}：${a} がない`);
    for (const a of ACTS) for (const l of V[k][a] || []) {
      const plain = l.replace(/\{\w+\}/g, '〇〇');
      if (plain.length > 64) add(1, `${k}.${a} が長い（${plain.length}字）`);
      if (seen[l] && seen[l] !== k) add(2, `${k}.${a} が ${seen[l]} と同じ文`); seen[l] = k;
      if (/写本師|記者|先生|雪|列車|島/.test(l)) add(3, `${k}.${a}：物語に縛られた言葉「${l}」`);
      if (/(\{why\})/.test(l) && !/\{why\}。/.test(l) && !/\{why\}$/.test(l)) add(1, `${k}.${a}：理由の節のあとに句点がない`);
    }
    const sus = (V[k].sus || []).concat(V[k].accuse || []); if (sus.some(l => !/\{target\}/.test(l))) add(3, `${k}：疑いのせりふに名前がない`);
  }
  for (const r of ['plain', 'polite', 'kid']) for (const w of ['divined', 'black', 'counter', 'lie', 'trace', 'item', 'vote', 'quiet', 'gut']) if (!(W.WL_WHY[r] || {})[w]) add(3, `理由 ${r}.${w} がない`);
  return { score: Math.max(0, 100 - ded.reduce((a, d) => a + d[0], 0)), ded };
}

// 物語の厚み（2026-11-25 ユーザー指摘：ゲームに必要な情報だけが続き、物語の展開を感じない）
// 序幕の積み上げ・日ごとの本筋（謎と伏線の回収）・幕間（人物どうしの場面）・絆と喪失・夜の点景・後日談・1日あたりの物語の量を測る
const MECH = /投票|占い|占っ|霊媒|役職|行動を|痕跡|証言|集会で|名指し|人狼が\d/;
function lineOf(e) { return e.alt ? Object.values(e.alt) : []; }
function scoreNarr(st) {
  const ded = [], add = (n, why) => ded.push([n, why]);
  const T = st.text || {}, ids = st.chars.map(c => c.id), name = id => (st.chars.find(c => c.id === id) || {}).name || id;
  // P 序幕：殺人の前に、場所と人と暮らしを見せる
  const P = T.prologue || [];
  if (P.length < 9) add((9 - P.length) * 3, `序幕が${P.length}頁（9頁以上）`);
  const kill = P.findIndex(p => /\{first\}/.test(p.t || ''));
  if (kill >= 0 && kill < 6) add(8, `序幕の${kill + 1}頁目でもう事件が起きる（7頁目以降に）`);
  const castLines = P.filter(p => p.by).length;
  if (castLines < 4) add((4 - castLines) * 3, `序幕で人物が話す場面 ${castLines}（4以上）`);
  // A 本筋：日ごとに進む謎、伏線と回収、結末で明かす答え
  const A = st.arc || {};
  if (!A.mystery) add(10, '本筋の謎（arc.mystery）がない');
  if (!A.coda) add(8, '本筋の答え（arc.coda）がない');
  const days = A.days || {};
  for (let d = 1; d <= 5; d++) { const e = days[d] || []; if (!e.length) add(6, `${d}日目の本筋がない`); else if (e.length < 2) add(2, `${d}日目の本筋が1場面だけ`); }
  const all = Object.values(days).flat();
  const voiced = all.filter(e => e.by); if (voiced.length < 10) add(10 - voiced.length, `本筋で人物が話す場面 ${voiced.length}（10以上）`);
  for (const e of voiced) { if (e.by.length < 2) add(1, `本筋の台詞に代わりの話し手がいない：${e.by.join(',')}`); for (const id of e.by) if (!(e.alt || {})[id]) add(2, `本筋の台詞 ${id} の文がない`); if (!e.n) add(1, '本筋の台詞に、話し手がいないときの地の文がない'); }
  const len = all.reduce((a, e) => a + (e.t || '').length + Math.max(0, ...lineOf(e).map(x => x.length)), 0);
  if (len < 2600) add(Math.ceil((2600 - len) / 100), `本筋の分量 ${len}字（2600字以上）`);
  const setups = new Set(all.filter(e => e.setup).map(e => e.setup).concat((P.filter(p => p.setup).map(p => p.setup))));
  const pays = new Set(all.filter(e => e.pay).flatMap(e => [].concat(e.pay)).concat(A.payInCoda || []));
  if (setups.size < 4) add((4 - setups.size) * 3, `伏線 ${setups.size}（4以上）`);
  for (const x of setups) if (!pays.has(x)) add(4, `回収されない伏線「${x}」`);
  for (const x of pays) if (!setups.has(x)) add(2, `仕込みのない回収「${x}」`);
  // I 幕間：人物どうしの場面
  const I = st.inter || [];
  if (I.length < 18) add((18 - I.length) * 2, `幕間 ${I.length}（18以上）`);
  const cnt = {}; I.forEach(x => x.need.forEach(id => cnt[id] = (cnt[id] || 0) + 1));
  for (const id of ids) if ((cnt[id] || 0) < 2) add(2, `${name(id)} の出る幕間が ${cnt[id] || 0}（2以上）`);
  const grief = I.filter(x => x.dead && x.dead.length); if (grief.length < 5) add((5 - grief.length) * 3, `誰かを失ったあとの幕間 ${grief.length}（5以上）`);
  for (const x of I) {
    if (x.lines.length < 3 || x.lines.length > 10) add(1, `幕間 ${x.id} の長さ ${x.lines.length}行`);
    for (const [w] of x.lines) if (w && !x.need.includes(w)) add(3, `幕間 ${x.id}：出られない ${w} が話す`);
    const spk = new Set(x.lines.filter(l => l[0]).map(l => l[0])); if (!spk.size) add(2, `幕間 ${x.id}：誰も話さない`);
  }
  // B 絆：その人を失ったとき、誰が何と言うか
  for (const c of st.chars) if (!(c.bond || []).length) add(2, `${c.name}：絆（bond）がない`);
  for (const c of st.chars) for (const b of c.bond || []) { if (!ids.includes(b.with)) add(2, `${c.name}：絆の相手 ${b.with} がいない`); if (!b.grief) add(2, `${c.name}：${b.with} を失ったときの言葉がない`); }
  // Q 人物の個性（2026-11-25 ユーザー：キャラクター個別の特性を強調）：癖・こだわり（quirk）と、その人らしさの合図の言葉（sig）が、
  //   本人のせりふ・幕間・本筋・夜の点景にくり返し現れること
  for (const c of st.chars) {
    if (!c.quirk) { add(2, `${c.name}：癖・こだわり（quirk）がない`); continue; }
    const sig = [].concat(c.sig || []); if (!sig.length) { add(2, `${c.name}：合図の言葉（sig）がない`); continue; }
    const mine = [c.intro, c.last, c.vign, c.epi].concat((c.bond || []).map(b => b.grief)).concat((st.inter || []).flatMap(x => x.lines.filter(l => l[0] === c.id || (!l[0] && x.need.includes(c.id))).map(l => l[1]))).concat(Object.values((st.arc || {}).days || {}).flat().map(e => (e.alt || {})[c.id])).filter(Boolean);
    const hits = mine.filter(t => sig.some(w => t.includes(w))).length;
    if (hits < 4) add((4 - hits) * 1.5, `${c.name}：その人らしさ（${sig.join('・')}）の出る場面 ${hits}（4以上）`);
  }
  // V 夜の点景、E 後日談
  for (const c of st.chars) { if (!c.vign) add(1, `${c.name}：夜の点景がない`); if (!c.epi) add(1, `${c.name}：後日談がない`); }
  // D 1日あたりの物語の量（日の書き出し＋本筋＋幕間2つ＋夜の点景）
  const avgI = I.length ? I.reduce((a, x) => a + x.lines.reduce((b, l) => b + l[1].length, 0), 0) / I.length : 0;
  const avgV = st.chars.reduce((a, c) => a + (c.vign || '').length, 0) / st.chars.length;
  for (let d = 1; d <= 4; d++) {
    const e = days[d] || [];
    const n = (T.day[d - 1] || '').length + e.reduce((a, x) => a + (x.t || '').length + Math.max(0, ...lineOf(x).map(y => y.length)), 0) + avgI * 2 + avgV;
    if (n < 480) add(Math.ceil((480 - n) / 40), `${d}日目の物語の量 ${Math.round(n)}字（480字以上）`);
  }
  // M 物語の文にゲームの仕組みの言葉が出すぎない
  const story = all.flatMap(e => [e.t || '', e.n || ''].concat(lineOf(e))).concat(I.flatMap(x => x.lines.map(l => l[1]))).join('\n');
  const mech = (story.match(new RegExp(MECH.source, 'g')) || []).length;
  if (mech > 3) add(mech - 3, `物語の文に仕組みの言葉 ${mech}`);
  return { score: Math.max(0, Math.round(100 - ded.reduce((a, d) => a + d[0], 0))), ded };
}

// 9. 序幕の筆致（2026-11-25 ユーザー：導入部の個々人の発言や状況描写が淡白で短い。文学賞に届くディティールへ）
//   既定の序幕と、主人公ごとの序幕の入りを、事件が起きるまでの1本ずつとして読む。測るもの：
//   地の文の頁の厚み・人物のせりふの厚み（その人の暮らしや来歴がにじむ長さ）・話し手のいないときの地の文・
//   五感の幅（見る・聞く・嗅ぐ・触れる・味わう）・比喩・場面の具体物（固有の物の名）・文末の単調さ
const SENSES = { 見: /光|灯|影|色|白|黒|赤|青|金|銀|墨|煤|霧|湯気|煙|輝|ちらつ|透け|映|揺れ/, 聞: /音|声|鳴|響|軋|きし|鈴|囁|ささや|唸|はぜ|沈黙|静か|聞こえ|耳/, 嗅: /匂|香|臭|におい|硫黄|松脂|獣臭/, 触: /冷た|温|熱|ぬく|凍|濡|湿|ざらつ|かじか|指先|手のひら|頬|肌|重み|痺れ/, 味: /味|甘|苦|しょっぱ|塩|酸っぱ|スープ|茶|酒|葡萄酒|蜜|飲|啜|舌/ };
const FIG = /ように|ような|みたいに|みたいな|かのよう|まるで/g;
function prologueRuns(base) {
  const pro = base.text.prologue || [], core = pro.findIndex(p => p.core), kill = pro.findIndex(p => /\{first\}/.test(p.t || ''));
  const runs = [['既定の入り', pro.slice(0, kill < 0 ? pro.length : kill).filter(p => !p.hero)]];
  for (const h of base.heroes || []) if (h.prologue) runs.push([h.job, h.prologue.concat(pro.slice(core, kill < 0 ? pro.length : kill))]);
  return runs;
}
function scorePrologue(base) {
  const ded = [], add = (n, why) => ded.push([n, why]);
  for (const [who, P] of prologueRuns(base)) {
    const T = P.map(p => p.t || '').filter(Boolean), L = P.flatMap(p => Object.values(p.alt || {})), N = P.map(p => p.n).filter(Boolean);
    const avg = a => a.length ? a.reduce((x, y) => x + y.length, 0) / a.length : 0;
    const shortT = T.filter(t => t.length < 70).length; if (shortT) add(shortT * .6, `${who}：薄い地の文の頁 ${shortT}（70字未満）`);
    if (avg(T) < 95) add((95 - avg(T)) / 6, `${who}：地の文の頁の平均 ${Math.round(avg(T))}字（95字以上）`);
    const shortL = L.filter(t => t.length < 60).length; if (shortL) add(shortL * .4, `${who}：短いせりふ ${shortL}（60字未満）`);
    if (L.length && avg(L) < 78) add((78 - avg(L)) / 6, `${who}：せりふの平均 ${Math.round(avg(L))}字（78字以上）`);
    const shortN = N.filter(t => t.length < 48).length; if (shortN) add(shortN * .4, `${who}：話し手のいないときの地の文が薄い ${shortN}（48字未満）`);
    const huge = T.concat(L, N).filter(t => t.length > 210).length; if (huge) add(huge * 2, `${who}：画面に収まらない長さ ${huge}（210字まで）`);
    const all = T.concat(L, N).join('\n');
    const miss = Object.keys(SENSES).filter(k => !SENSES[k].test(all)); if (miss.length) add(miss.length * 2, `${who}：五感が足りない（${miss.join('・')}）`);
    const fig = (all.match(FIG) || []).length; if (fig < 3) add((3 - fig) * 1.5, `${who}：比喩 ${fig}（3以上）`);
    const S = T.concat(N).flatMap(sents); const ta = S.filter(x => /た[。」]*$/.test(x)).length;
    if (S.length && ta / S.length > .72) add(((ta / S.length) - .72) * 20, `${who}：文末が「た」ばかり（${Math.round(ta / S.length * 100)}%）`);
  }
  return { score: Math.max(0, Math.round(100 - ded.reduce((a, d) => a + d[0], 0))), ded };
}
// story text that the prose checks also read (the voiced lines checked against each speaker's voice)
// 8. the heroes: every story has many "you"s, each with a way in, a thread of their own, and an ending
function scoreHeroes(base) {
  const ded = [], add = (n, why) => ded.push([n, why]);
  const H = base.heroes || [];
  if (H.length < 6) add((6 - H.length) * 8, `主人公 ${H.length}人（6人以上）`);
  const jobs = H.map(h => h.job);
  const homes = new Set(H.map(h => h.home)); if (homes.size < 3) add(4, `主人公の居場所が${homes.size}か所しかない（3以上）`);
  const tr = new Set(H.map(h => JSON.stringify(h.traits))); if (tr.size < H.length) add(4, '特徴がまったく同じ主人公がいる');
  for (const h of H) {
    for (const f of ['id', 'job', 'you', 'book', 'pitch', 'home', 'traits', 'intro', 'open', 'close', 'win', 'epi', 'epiGhost']) if (!h[f]) add(5, `${h.job}：${f} がない`);
    for (const r of ['villager', base.rules === 'mason' ? 'mason' : 'guard']) if (!(h.how || {})[r]) add(3, `${h.job}：役 ${r} の由来がない`);
    const ownArc = Object.values(h.arc || {}).flat(); if (ownArc.length < 2) add(4, `${h.job}：自分の糸（本筋の自分の場面）が${ownArc.length}（2以上）`);
    if (!base.locs.some(l => l.id === h.home)) add(6, `${h.job}：居場所がない`);
    for (const c of ['height', 'hand', 'foot', 'mark']) if (!h.traits || !base.traits[c].v[h.traits[c]]) add(6, `${h.job}：特徴 ${c} が物語にない値`);
    if (String(h.pitch).length > 48) add(2, `${h.job}：紹介が長い（${h.pitch.length}/48字）`);
    // the hero's own words: same prose rules
    const T = [h.intro, h.open, h.close, h.win, h.epi, h.epiGhost].concat(ownArc.map(e => e.t)).filter(Boolean);
    let long = 0; for (const t of T) for (const x of sents(t)) if (x.length > 72) long++; if (long) add(long * 1.5, `${h.job}：長すぎる文 ${long}`);
    for (const c of CLICHE) if (T.join('').includes(c)) add(4, `${h.job}：使い古された言い回し「${c}」`);
    const flat = T.filter(t => !SENSE.test(t)); if (flat.length > 1) add(flat.length, `${h.job}：五感の手ざわりのない文 ${flat.length}`);
    if (!/\{book\}|\n/.test('') && !T.some(t => t.includes(h.book))) add(2, `${h.job}：書きつけるもの「${h.book}」が自分の文に一度も出ない`);
    // the shared story, seen as this hero: no other hero's job, and no hole left
    const st = W.WLHero.apply(base, h.id);
    const shared = JSON.stringify(Object.assign({}, st, { heroes: null, heroData: null, hero: null }));
    const left = shared.match(/\{(job|you|book)\}/g); if (left) add(5, `${h.job}：置き換え漏れ ${left[0]}`);
    for (const j of jobs) if (j !== h.job && !h.job.includes(j) && shared.includes(j) && !/^(先生|医者|学生)$/.test(j)) add(4, `${h.job}で遊ぶと、ほかの主人公の肩書き「${j}」が出てくる`);
  }
  // each hero starts the story their own way: an opening of their own before the shared core
  const pro = (base.text.prologue || []), core = pro.findIndex(p => p.core);
  if (core < 0) add(6, '序幕に共通部分の印（core）がない');
  const baseSetups = pro.slice(0, Math.max(0, core)).map(p => p.setup).filter(Boolean);
  const own = H.filter(h => h.prologue);
  if (own.length < H.length - 1) add((H.length - 1 - own.length) * 5, `自分の序幕の入りを持つ主人公 ${own.length}人（${H.length - 1}人以上）`);
  const firsts = new Set();
  for (const h of own) {
    const P2 = h.prologue;
    if (P2.length < 3) add(4, `${h.job}：序幕の入りが${P2.length}頁（3以上）`);
    const sp = P2.filter(p => p.by); if (sp.length < 2) add(3, `${h.job}：序幕の入りで人物が話す頁が${sp.length}（2以上）`);
    for (const p of sp) { if (p.by.length < 2) add(1, `${h.job}：序幕の話し手に代わりがいない`); if (!p.n) add(1, `${h.job}：序幕に話し手がいないときの地の文がない`); for (const id of p.by) if (!(p.alt || {})[id]) add(2, `${h.job}：序幕の ${id} の文がない`); }
    for (const su of baseSetups) if (!P2.some(p => p.setup === su)) add(4, `${h.job}：序幕の入りに伏線「${su}」がない`);
    const bgs = new Set(P2.map(p => p.bg)); if (bgs.size < 2) add(2, `${h.job}：序幕の入りの場所が1つだけ`);
    const k = P2[0].bg + '|' + P2.slice(1).map(p => p.bg).join(','); if (firsts.has(k)) add(3, `${h.job}：ほかの主人公と同じ場所の順で始まる`); firsts.add(k);
  }
  // each hero must score on the story's own rubrics too
  let worst = 100, wn = '';
  for (const h of H) { const st = W.WLHero.apply(base, h.id); const a = scoreStory(st).score, b = scoreNarr(st).score; if (Math.min(a, b) < worst) { worst = Math.min(a, b); wn = h.job; } }
  if (worst < 90) add(90 - worst, `${wn}で遊んだときの文章・物語の点が ${worst}`);
  return { score: Math.max(0, Math.round(100 - ded.reduce((a, d) => a + d[0], 0))), ded };
}

function narrLines(st) {
  const out = [];
  const A = st.arc || {};
  for (const e of Object.values(A.days || {}).flat().concat(st.text.prologue || [])) for (const id in e.alt || {}) out.push([id, e.alt[id]]);
  for (const x of st.inter || []) for (const l of x.lines) out.push(l);
  for (const c of st.chars) { for (const b of c.bond || []) out.push([c.id, b.grief]); if (c.vign) out.push([null, c.vign]); if (c.epi) out.push([null, c.epi]); }
  return out;
}

// 7. lines put together in play: run games and render what people say
function composed() {
  const E = W.WLEngine, SP = W.WLSpeech, bad = [], samples = [];
  for (const id of Object.keys(W.WL_STORIES)) {
    const H = W.WL_STORIES[id].heroes || [];
    for (let g = 0; g < 12; g++) {
      const st = W.WLHero.apply(W.WL_STORIES[id], H.length ? H[g % H.length].id : null);
      const S = E.newGame(st, { diff: g % 4, seed: 77 + g });
      for (let d = 1; d < 10 && !S.result; d++) {
        E.npcSearch(S, st);
        const lines = [];
        for (const p of E.alive(S).filter(p => !p.isPlayer)) {
          const T = E.testimony(S, st, p.id, S.nights.length - 1); if (T) SP.night(S, st, T).forEach(t => lines.push([p.id, t]));
          const o = E.opinion(S, st, p.id); lines.push([p.id, SP.opinion(S, st, p.id, o)]);
          const t2 = E.alive(S).find(q => q.id !== p.id); const r = E.ask(S, st, p.id, 'about', t2.id, true); if (r.k === 'about') SP.about(S, st, p.id, r).forEach(t => lines.push([p.id, t]));
        }
        for (const e of E.meeting(S, st)) { const x = SP.event(S, st, e); if (x) lines.push([e.by, x.text]); }
        for (const t of SP.morning(S, st, S.nights[S.nights.length - 1])) lines.push(['朝', t]);   // the morning's narration, a night with no attack included
        for (const [who, t] of lines) {
          const plain = t.replace(/\*\*/g, '');
          if (/\{\w+\}|undefined|null|NaN/.test(plain) || /。。|、。|。、|さんさん|！。|？。/.test(plain) || (who !== '朝' && plain.length > 96)) bad.push(`${st.title}/${who}: ${plain}`);
          if (samples.length < 400) samples.push(`${st.title}/${who}: ${plain}`);
        }
        const r = E.voteRound(S, st, E.alive(S).find(p => !p.isPlayer).id); E.exile(S, r.top[0], [r]); if (E.check(S)) break; E.night(S, st, {}); S.day++; if (E.check(S)) break;
      }
    }
  }
  return { bad, samples };
}

const BAR = 90;
for (const id of Object.keys(W.WL_STORIES)) {
  if (only && only !== id && only !== 'voices') continue;
  const hi = process.argv.indexOf('--hero'), base = W.WL_STORIES[id], st = W.WLHero.apply(base, hi > 0 ? process.argv[hi + 1] : null), r = scoreStory(st);   // --hero <id>: the story as that hero plays it
  if (r.score < BAR) fail++;
  console.log(`${r.score >= BAR ? 'OK ' : 'NG '} ${String(r.score).padStart(3)}  ${st.title}`);
  if (show || r.score < BAR) for (const [n, w] of r.ded) console.log(`      -${n}  ${w}`);
  const q = scoreNarr(st); if (q.score < BAR) fail++;
  console.log(`${q.score >= BAR ? 'OK ' : 'NG '} ${String(q.score).padStart(3)}  ${st.title}（物語の厚み）`);
  if (show || q.score < BAR) for (const [n, w] of q.ded) console.log(`      -${n}  ${w}`);
  const pq = scorePrologue(base); if (pq.score < BAR) fail++;
  console.log(`${pq.score >= BAR ? 'OK ' : 'NG '} ${String(pq.score).padStart(3)}  ${st.title}（序幕の筆致）`);
  if (show || pq.score < BAR) for (const [n, w] of pq.ded) console.log(`      -${n.toFixed ? +n.toFixed(1) : n}  ${w}`);
  const hq = scoreHeroes(base); if (hq.score < BAR) fail++;
  console.log(`${hq.score >= BAR ? 'OK ' : 'NG '} ${String(hq.score).padStart(3)}  ${st.title}（主人公 ${(base.heroes || []).length}人）`);
  if (show || hq.score < BAR) for (const [n, w] of hq.ded) console.log(`      -${n}  ${w}`);
}
if (!only || only === 'voices') { const v = scoreVoices(); if (v.score < BAR) fail++; console.log(`${v.score >= BAR ? 'OK ' : 'NG '} ${String(v.score).padStart(3)}  声（voices.js）`); if (show || v.score < BAR) for (const [n, w] of v.ded) console.log(`      -${n}  ${w}`); }
{ const c = composed(); const sc = Math.max(0, 100 - c.bad.length * 2); if (sc < BAR) fail++; console.log(`${sc >= BAR ? 'OK ' : 'NG '} ${String(sc).padStart(3)}  組み立てたせりふ（崩れ ${c.bad.length}件）`); if (show || sc < BAR) c.bad.slice(0, 20).forEach(x => console.log('      ' + x)); if (process.argv.includes('--samples')) c.samples.forEach(x => console.log('  · ' + x)); }
process.exit(fail ? 1 : 0);
