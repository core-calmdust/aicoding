#!/usr/bin/env node
/* 狼影灯 — 文章の採点（物語ごと100点から減点。合格は90点。くわしい基準は claude/wolflantern-spec.md「文章の基準」）
   usage: node wolflantern/tools/text-quality.js [story] [--show]
   見るもの：抜け・置き換えの崩れ、毎回変わる配役と矛盾する名指し、長すぎる文、同じ文末の連続、
   使い古された言い回し、感情を説明する言葉、五感の手ざわり、口調のぶれ、くり返し、画面に収まる長さ、声（voices.js）の抜けと重なり */
const W = require('./load.js');
const show = process.argv.includes('--show');
const only = process.argv.slice(2).find(a => !a.startsWith('--'));
const ACTS = ['hello', 'home', 'fig', 'who', 'none', 'sus', 'nosus', 'okay', 'bad', 'seen', 'co_seer', 'co_medium', 'rs_w', 'rs_h', 'rm_w', 'rm_h', 'report', 'item', 'accuse', 'agree', 'defend', 'grief', 'deny', 'counter', 'thanks'];
const CLICHE = ['背筋が凍', '血の気が引', '息を呑ん', '静寂が支配', '闇に包まれ', '不穏な空気', '戦慄が走', '嫌な予感', '心臓が早鐘', '悪寒が走', '凍りつい', '時が止まった'];
const TELL = ['恐ろしい', '恐怖', '不気味', '悲しい', '怖かった', '怖い', '寂しい', 'ぞっと', '戦慄'];
const SENSE = /吹雪|息|燭|炭|靴|跡|音|匂|香|冷た|温|白|黒|赤|光|灯|湯気|雪|雨|風|霜|煤|湿|濡|鳴|響|揺|軋|きし|ぬく|凍|潮|波|火|煙|錆|鉄|硝子|銀|真鍮|木|石|砂|泥|毛|爪/;
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
  for (const k of ['meet', 'vote', 'role', 'win', 'lose', 'dead', 'exiledYou']) if (!T[k]) add(10, `text.${k} がない`);
  for (const l of st.locs) { if (!(T.discover || {})[l.id] || T.discover[l.id].length < 2) add(6, `発見の文（${l.name}）が2つ未満`); if (!l.none || l.none.length < 2) add(3, `空振りの文（${l.name}）が2つ未満`); }
  if (st.locs.length !== 5) add(10, '場所が5つでない');
  if (st.chars.length !== 12) add(15, '人物が12人でない');
  const voices = new Set(st.chars.map(c => c.voice)); if (voices.size !== 12) add(10, `声が重なっている（${12 - voices.size}組）`);
  for (const r of ['villager', 'seer', 'medium', 'guard']) if (!st.roles[r] || !st.roles[r].how || !st.roles[r].perk) add(5, `役 ${r} の文がない`);
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
  for (const k of ['meet', 'vote', 'role', 'win', 'lose', 'dead', 'exiledYou']) if (T[k]) fixed.push([k, T[k]]);
  for (const l in T.discover || {}) T.discover[l].forEach((t, i) => fixed.push(['discover.' + l + i, t]));
  st.locs.forEach(l => { fixed.push(['loc.' + l.id, l.desc]); l.none.forEach((t, i) => fixed.push(['none.' + l.id + i, t])); });
  st.items.forEach(it => fixed.push(['item.' + it.id, it.found + it.desc + (it.use || '')]));
  for (const [k, t] of fixed) for (const n of names) if (t.includes(n)) add(8, `${k}：配役が変わるのに「${n}」を名指ししている`);
  // a character's own lines naming another character: allowed (they live there), but only a few
  let cross = 0; for (const c of st.chars) for (const f of ['intro', 'last', 'note', 'wolf']) for (const n of names) if (n !== c.name && String(c[f]).includes(n)) cross++;
  if (cross > 5) add(2 * (cross - 5), `人物のせりふが他の人物を${cross}回名指し`);
  // 3. placeholders
  const allow = { discover: /\{(victim|note)\}/g, peace: /\{loc\}/g, exile: /\{name\}/g, prologue: /\{(first|firstNote)\}/g, role: /\{roleHow\}/g };
  for (const [k, t] of fixed) { const ph = (t.match(/\{\w+\}/g) || []); const kk = k.replace(/[.\d].*$/, '').replace(/\d+$/, ''); const ok = allow[kk]; for (const p of ph) if (!ok || !p.match(new RegExp(ok.source))) if (!/^item/.test(k) || !/\{(loc|name)\}/.test(p)) add(5, `${k}：置き換えられない ${p}`); }
  // 4. prose quality over all the narration and the characters' own lines
  const prose = fixed.map(x => x[1]).concat(st.chars.flatMap(c => [c.profile, c.intro, c.last, c.note, c.wolf, c.secret && c.secret.confess, c.secret && c.secret.clue]).filter(Boolean));
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
    const lines = [c.intro, c.last, c.wolf, c.secret && c.secret.confess].filter(Boolean).join('');
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

// 7. lines put together in play: run games and render what people say
function composed() {
  const E = W.WLEngine, SP = W.WLSpeech, bad = [], samples = [];
  for (const id of Object.keys(W.WL_STORIES)) {
    const st = W.WL_STORIES[id];
    for (let g = 0; g < 12; g++) {
      const S = E.newGame(st, { diff: g % 4, seed: 77 + g });
      for (let d = 1; d < 5 && !S.result; d++) {
        E.npcSearch(S, st);
        const lines = [];
        for (const p of E.alive(S).filter(p => !p.isPlayer)) {
          const T = E.testimony(S, st, p.id, S.nights.length - 1); if (T) SP.night(S, st, T).forEach(t => lines.push([p.id, t]));
          const o = E.opinion(S, st, p.id); lines.push([p.id, SP.opinion(S, st, p.id, o)]);
          const t2 = E.alive(S).find(q => q.id !== p.id); const r = E.ask(S, st, p.id, 'about', t2.id, true); SP.about(S, st, p.id, r).forEach(t => lines.push([p.id, t]));
        }
        for (const e of E.meeting(S, st)) { const x = SP.event(S, st, e); if (x) lines.push([e.by, x.text]); }
        for (const [who, t] of lines) {
          const plain = t.replace(/\*\*/g, '');
          if (/\{\w+\}|undefined|null|NaN/.test(plain) || /。。|、。|。、|さんさん|！。|？。/.test(plain) || plain.length > 96) bad.push(`${st.title}/${who}: ${plain}`);
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
  const st = W.WL_STORIES[id], r = scoreStory(st);
  if (r.score < BAR) fail++;
  console.log(`${r.score >= BAR ? 'OK ' : 'NG '} ${String(r.score).padStart(3)}  ${st.title}`);
  if (show || r.score < BAR) for (const [n, w] of r.ded) console.log(`      -${n}  ${w}`);
}
if (!only || only === 'voices') { const v = scoreVoices(); if (v.score < BAR) fail++; console.log(`${v.score >= BAR ? 'OK ' : 'NG '} ${String(v.score).padStart(3)}  声（voices.js）`); if (show || v.score < BAR) for (const [n, w] of v.ded) console.log(`      -${n}  ${w}`); }
{ const c = composed(); const sc = Math.max(0, 100 - c.bad.length * 2); if (sc < BAR) fail++; console.log(`${sc >= BAR ? 'OK ' : 'NG '} ${String(sc).padStart(3)}  組み立てたせりふ（崩れ ${c.bad.length}件）`); if (show || sc < BAR) c.bad.slice(0, 20).forEach(x => console.log('      ' + x)); if (process.argv.includes('--samples')) c.samples.forEach(x => console.log('  · ' + x)); }
process.exit(fail ? 1 : 0);
