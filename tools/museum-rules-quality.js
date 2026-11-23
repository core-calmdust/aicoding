#!/usr/bin/env node
// Quality gate for the museum's rules courses in Japanese (2026-11-23 user: 博物館ルールコースの見直し・改良を、レッスンや定石コーナーと同様の
// 評価付きでスコアを用意して達成できるように — and ミュゼフクのキャラクター性もしっかり). Reads atlas/museum/rules.js (the pages: positions,
// tasks) and atlas/museum/rules-tx-ja.js (ミュゼフク's words), scores each course out of 100 and checks the board facts of every task.
//   node tools/museum-rules-quality.js [course,course…] [--json out.json] [--show N]
// The pass mark is in tools/museum-rules-quality.json ("pass"); the loop and the criteria: claude/museum-rules-quality.md.
// The courses are also played through to the end in a browser by tools/museum-rules-progress.js (進行チェック).
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const only = (args.find((a, i) => !a.startsWith('--') && !/^--/.test(args[i - 1] || '')) || '').split(',').filter(Boolean);
const CFG = JSON.parse(fs.readFileSync(path.join(__dirname, 'museum-rules-quality.json'), 'utf8'));

// the courses' data, as the page runs them
const src = fs.readFileSync(path.join(ROOT, 'atlas/museum/rules.js'), 'utf8');
const C = new Function(src.slice(src.indexOf('  const SN ='), src.indexOf('  const has =')) + '; return C;')();
const W = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'atlas/museum/rules-tx-ja.js'), 'utf8'))(W);
const TX = W.AtlasMuseumRulesTX.ja;

const plain = s => String(s || '').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').trim();
const sents = s => (plain(s).match(/[^。！？\n]+[。！？]+|[^。！？\n]+$/gm) || []).map(x => x.trim()).filter(Boolean);
const end = sn => { const b = sn.replace(/[。！？!?…]+$/, '').replace(/[）)」]+$/, ''); for (const e of ['なのだ', 'のだ', 'なんだ', 'んだ', 'だよ', 'だね', 'よね', 'かな', 'よう', 'ろう', 'よ', 'ね', 'ね〜']) if (b.endsWith(e)) return e === 'だよ' ? 'よ' : e === 'なのだ' ? 'のだ' : e; return /[！!]$/.test(sn) ? '！' : /[？?]$/.test(sn) ? '？' : 'x'; };
// ミュゼフク: the museum's owl — 一人称「わたし」, 口ぐせ「ホホウ」, 所蔵品と博物館の暮らし（閉館後の見回り・引き出し・ほこり払い・ケースの中）が大好きで、
// 夜ふかしで昼は少し眠い、うれしいと羽をふくらませる。説明は学芸員らしく、でも子どもに話すようにやさしく、いつもひとこと、おちゃめな脱線がある
const TIC = /ホホウ|ホウ[！、。]/;
const CHARA = /(展示|館|ケース|閉館|学芸|収蔵|所蔵|羽|フクロウ|ふくろう|巣|夜|見回り|引き出し|お宝|宝物|ほこり|はたき|ガイド|館内|お客さん|ふくらませ|首を|くるっと|ホウ|発掘|遺跡|大昔|ミュゼフク)/;
const CHEER = /(その調子|この調子|いいね|いい感じ|ナイス|さすが|やったね|やった！|すごい|上手|じょうず|ばっちり|お見事|完璧|天才|できたね|できた！|正解|そのとおり|そう！|大成功|成功|よく見|よく気づ|よく覚え|見抜|ぴったり|おみごと|名人|合格|はなまる|花丸)/;
const ACT = /(タップ|振|投げ|置|進め|動か|入れ|選|上げ|囲|走ら|ふさ|へ！|へ$|に！)/;
const BOARD = /(マス|点|駒|石|列|道|穴|すみ|隅|玉座|サイコロ|投げ棒|ロゼット|引き出し|陣地|呼吸点|ゴール|内地)/;

function scoreCourse(id, P, Wd) {
  const pen = [], add = (n, why) => pen.push([n, why]);
  if (!Wd || Wd.length !== P.length) add(40, `text pages ${Wd ? Wd.length : 0} ≠ course pages ${P.length}`);
  const bub = [];   // display order: each page's explanation, its task line(s), then the line after a right answer
  P.forEach((pg, i) => { const w = (Wd || [])[i] || []; bub.push({ k: 'ex', i, t: w[0] }); if (pg.task) { (Array.isArray(w[1]) ? w[1] : [w[1]]).forEach(t => bub.push({ k: 'task', i, t })); bub.push({ k: 'done', i, t: w[2] }); } });
  const all = bub.map(b => b.t).filter(Boolean);
  // hard faults
  for (const b of bub) { const s = plain(b.t);
    if (!s) { add(10, `p${b.i + 1}: empty ${b.k}`); continue; }
    if (/\{[a-zA-Z]\w*\}/.test(s)) add(25, 'placeholder');
    if (/(です|ます|ません|ました|でしょう)(?=[。！？）)]|$)/m.test(s)) add(8, 'polite: ' + s.slice(0, 30));
    if (/あなた/.test(s)) add(4, 'あなた');
    if (/ぼく|ボク|おれ|あたし/.test(s)) add(6, 'first person is not わたし: ' + s.slice(0, 30));
    if (/AI(の|が)評価|形勢|評価値/.test(s)) add(10, "the engine's opinion");
    for (const sn of sents(s)) if (sn.length > 70) add(2, `p${b.i + 1}: long sentence (${sn.length})`);
    // the panel: a phone shows ~21 chars a line; an explanation over 4 lines pushes the board up, a task over 2 lines wraps the plate
    const L = s.length;
    if (b.k === 'ex' && L > 105) add(Math.min(6, 2 + Math.floor((L - 105) / 15)), `p${b.i + 1}: explanation ${L} chars (phone: over 5 lines)`);
    if (b.k === 'task' && L > 32) add(2, `p${b.i + 1}: task line ${L} chars (wraps)`);
    if (b.k === 'task' && !ACT.test(s)) add(3, `p${b.i + 1}: task does not say what to do: ${s.slice(0, 20)}`);
    if (b.k === 'done' && L > 80) add(2, `p${b.i + 1}: after-answer line ${L} chars`);
  }
  // the course's shape: what the game is and how it is won first, a hands-on task on most pages, the last page sends the player to a game
  const first = plain((Wd[0] || [])[0]), last = plain((Wd[P.length - 1] || []).join(' '));
  if (!/(ゲーム|盤|囲碁|碁|双六|セネト|ブランドゥブ)/.test(first)) add(6, 'first page: no "what this is"');
  if (!P.some((pg, i) => /勝ち|勝つ|負け/.test(plain((Wd[i] || []).join(' '))))) add(10, 'nowhere says how the game is won');
  if (!/(対局|勝負|一局|AI)/.test(last)) add(4, 'last page: no invitation to a game');
  const hands = P.filter(p => p.task).length / P.length; if (hands < .7) add(Math.round((.7 - hands) * 30) + 3, `hands-on tasks on only ${Math.round(hands * 100)}% of pages`);
  if (P.length < 8) add(5, `only ${P.length} pages`);
  // ミュゼフクの声: the tic, the museum-owl asides, someone talking
  const talkLines = bub.filter(b => b.k !== 'task').map(b => b.t).filter(Boolean);   // (the tic belongs in what ミュゼフク says, not on the task plate)
  const ticN = talkLines.filter(t => TIC.test(plain(t))).length / Math.max(1, talkLines.length);
  if (!ticN) add(8, 'no ホホウ anywhere'); else if (ticN < .2) add(Math.round((.2 - ticN) * 40) + 2, `ホホウ in only ${Math.round(ticN * 100)}% of ミュゼフク's lines`); else if (ticN > .45) add(4, `ホホウ in ${Math.round(ticN * 100)}% of lines (too much)`);
  const dones = bub.filter(b => b.k === 'done').map(b => plain(b.t)).filter(Boolean), exs = bub.filter(b => b.k === 'ex').map(b => plain(b.t));
  const chr = [...dones, ...exs].filter(t => CHARA.test(t)).length / Math.max(1, dones.length + exs.length);
  if (chr < .55) add(Math.round((.55 - chr) * 40) + 3, `ミュゼフク's own world (展示・閉館・羽・引き出し…) in only ${Math.round(chr * 100)}% of lines`);
  const pageAside = P.filter((pg, i) => CHARA.test(plain((Wd[i] || []).join(' ')))).length / P.length;
  if (pageAside < .8) add(Math.round((.8 - pageAside) * 25) + 2, `a page without any of ミュゼフク's asides: ${Math.round((1 - pageAside) * 100)}%`);
  const talk = all.filter(t => /[！？〜♪]|ね[。！]|かな|ホホウ/.test(plain(t))).length / Math.max(1, all.length); if (talk < .5) add(Math.round((.5 - talk) * 40) + 3, `only ${Math.round(talk * 100)}% of lines sound like someone talking`);
  // praise: speaks to the player and says what was just learned (a board word)
  if (dones.length >= 3) {
    const r = dones.filter(g => CHEER.test(g)).length / dones.length; if (r < .7) add(Math.round((.7 - r) * 25) + 3, `the line after a right answer cheers the player in only ${Math.round(r * 100)}%`);
    const why = dones.filter(g => BOARD.test(g)).length / dones.length; if (why < .6) add(Math.round((.6 - why) * 20) + 3, `the line after a right answer names the rule in only ${Math.round(why * 100)}%`);
    const self = dones.filter(g => /わたし/.test(g) && !/きみ/.test(g)).length / dones.length; if (self > .5) add(4, `${Math.round(self * 100)}% of the praise is about ミュゼフク, not the player`);
  }
  // endings over the course in display order
  let fam = 0, tot = 0, prev = '', nda = 0;
  for (const b of bub) { const t = b.t; if (!t) continue; const E = sents(t).map(end); E.forEach((e, k) => { const pe = k ? E[k - 1] : prev; if (!['x', '？', '！'].includes(e) && e === pe) add(k ? 3 : 2, `p${b.i + 1}: ` + (k ? 'same ending twice: ' : 'same ending across lines: ') + e); tot++; if (e === 'よ') fam++; if (e === 'んだ' || e === 'のだ') nda++; }); if (E.length) prev = E[E.length - 1]; }
  if (tot >= 8 && fam / tot > .3) add(Math.round((fam / tot - .3) * 60) + 4, `〜よ on ${Math.round(fam / tot * 100)}% of sentences`);
  if (tot >= 8 && nda / tot > .25) add(4, `〜んだ／〜のだ on ${Math.round(nda / tot * 100)}% of sentences`);
  // repeats
  { const seen = new Map(); for (const t of all) for (const sn of new Set(sents(t).filter(x => x.length >= 8))) seen.set(sn, (seen.get(sn) || 0) + 1);
    const rep = [...seen].filter(([, n]) => n >= 2); if (rep.length) add(Math.min(12, 4 * rep.length), 'the same sentence twice: ' + rep[0][0].slice(0, 20));
    const gram = new Map(); all.forEach(t => { const x = plain(t).replace(/[\s、。！？!?「」（）()・…〜♪]/g, ''); const g = new Set(); for (let k = 0; k + 9 <= x.length; k++) g.add(x.slice(k, k + 9)); g.forEach(v => gram.set(v, (gram.get(v) || 0) + 1)); });
    const rg = [...gram].filter(([, n]) => n >= 3); if (rg.length) add(Math.min(8, 3 + rg.length), 'the same words in 3 lines: ' + rg[0][0]); }
  { const flat = all.filter(t => !/[！？♪]/.test(plain(t))).length / Math.max(1, all.length); if (flat > .45) add(Math.round((flat - .45) * 20) + 3, `${Math.round(flat * 100)}% of lines flat (no ！？)`); }
  return pen;
}

// ---------- the board facts: every task can be done, and does what the words say ----------
function facts(id, P) {
  const bad = [];
  const URP = side => { const r = side ? 0 : 2, a = []; for (let c = 3; c >= 0; c--) a.push([r, c]); for (let c = 0; c < 8; c++) a.push([1, c]); a.push([r, 7], [r, 6]); return a; };
  P.forEach((pg, i) => {
    const T = pg.task || [], tag = `p${i + 1}`;
    if (id === 'senet') {
      const own = new Set(pg.set.r), opp = new Set(pg.set.c); let stick = pg.sticks || null;
      T.forEach(st => { if (st.t === 'roll') { stick = st.v; return; } if (st.t !== 'move') return;
        const f = +st.from.slice(1), to = st.to === 'off' ? 31 : +st.to.slice(1), d = to - f;
        if (!own.has(f)) bad.push(`${tag}: no reel on ${f}`);
        if (st.to !== 'off' && d !== stick) bad.push(`${tag}: ${f}→${to} is ${d}, the sticks say ${stick}`);
        if (st.to === 'off') { const need = { 26: 5, 28: 3, 29: 2, 30: 1 }[f]; if (need !== stick) bad.push(`${tag}: off from ${f} needs ${need}, sticks ${stick}`); }
        if (own.has(to)) bad.push(`${tag}: lands on own reel ${to}`);
        if (opp.has(to) && !st.swap) bad.push(`${tag}: lands on a cone without swap`);
        if (st.swap && (opp.has(to - 1) || opp.has(to + 1))) bad.push(`${tag}: swaps a protected cone`);
        for (const c of st.cands || []) if (c !== st.from) { const g = +c.slice(1), t2 = g + stick; const ok = !own.has(t2) && !(opp.has(t2) && (opp.has(t2 - 1) || opp.has(t2 + 1))) && !(t2 > 26 && g < 26) && t2 <= 30;
          const wall = [...Array(Math.max(0, t2 - g - 1)).keys()].some(k => opp.has(g + 1 + k) && opp.has(g + 2 + k) && opp.has(g + 3 + k) && g + 3 + k < t2); if (ok && !wall) bad.push(`${tag}: ${c} could also move (${g}→${t2})`); }
        own.delete(f); if (st.to !== 'off') own.add(st.then ? +st.then.slice(1) : to); if (st.swap) { opp.delete(to); opp.add(f); } });
    }
    if (id === 'ur') {
      const R0 = URP(0), R1 = URP(1), key = rc => rc.join(','), idx = rc => R0.findIndex(q => key(q) === key(rc)) + 1;
      const own = new Set(pg.set.a.map(key)), opp = new Set(pg.set.b.map(key)), ROS = new Set(['0,0', '2,0', '1,3', '0,6', '2,6']); let n = pg.udice != null ? pg.udice : null;
      T.forEach(st => { if (st.t === 'roll') { n = st.v; return; } if (st.t !== 'move') return;
        const f = st.from === 'w0' ? 0 : idx(st.from.slice(1).split(',').map(Number)), to = st.to === 'off' ? 15 : idx(st.to.slice(1).split(',').map(Number));
        if (st.from !== 'w0' && !own.has(st.from.slice(1))) bad.push(`${tag}: no piece of yours on ${st.from}`);
        if (to - f !== n) bad.push(`${tag}: ${st.from}→${st.to} is ${to - f} squares, the dice say ${n}`);
        const tk = st.to.slice(1); if (own.has(tk)) bad.push(`${tag}: lands on your own piece`);
        if (opp.has(tk) && !st.cut) bad.push(`${tag}: lands on a rival piece without capturing`);
        if (st.cut && (ROS.has(tk) || !tk.startsWith('1,'))) bad.push(`${tag}: captures on a safe square`);
        for (const c of st.cands || []) if (c !== st.from) { const g = idx(c.slice(1).split(',').map(Number)), t2 = g + n; if (t2 <= 15) { const q = t2 === 15 ? null : key(R0[t2 - 1]); if (!q || (!own.has(q) && !(opp.has(q) && ROS.has(q)))) bad.push(`${tag}: ${c} could also move`); } }
        own.delete(st.from.slice(1)); if (st.to !== 'off') own.add(tk); if (st.cut) opp.delete(tk); });
      const wn = pg.set.w[0] + pg.set.a.length + pg.set.g[0], wo = pg.set.w[1] + pg.set.b.length + pg.set.g[1]; if (wn !== 7 || wo !== 7) bad.push(`${tag}: pieces ${wn} / ${wo}, not 7 / 7`);
    }
    if (id === 'sugoroku') {
      const p = Object.assign({}, pg.set.p); let dice = pg.dice ? pg.dice.slice() : null; const bar0 = pg.set.bar[0];
      const tot = s => Object.values(p).reduce((a, v) => a + (s ? (v < 0 ? -v : 0) : (v > 0 ? v : 0)), 0) + pg.set.bar[s ? 1 : 0];
      if (tot(0) !== 15 || tot(1) !== 15) bad.push(`${tag}: stones ${tot(0)} / ${tot(1)}, not 15 / 15`);
      T.forEach(st => { if (st.t === 'roll') { dice = st.v.slice(); return; } if (st.t !== 'move') return;
        const f = st.from === 'b0' ? 25 : +st.from.slice(1), to = +st.to.slice(1), d = f - to;
        if (st.from !== 'b0' && !(p[f] > 0)) bad.push(`${tag}: no stone of yours on ${f}`);
        if (st.from !== 'b0' && bar0) bad.push(`${tag}: a stone on the bar must enter first`);
        if (!dice || !dice.includes(d)) bad.push(`${tag}: ${f}→${to} is ${d}, dice ${dice}`); else dice.splice(dice.indexOf(d), 1);
        if ((p[to] || 0) <= -2) bad.push(`${tag}: lands on a blocked point ${to}`);
        if ((p[to] || 0) === -1 && !st.cut) bad.push(`${tag}: lands on a single rival stone without cutting`);
        if (st.from !== 'b0') p[f]--; if (st.cut) p[to] = 0; p[to] = (p[to] || 0) + 1; });
    }
    if (id === 'ballinderry') {
      const occ = new Map(); pg.set.a.forEach(([f, r]) => occ.set(f + ',' + r, 'a')); pg.set.d.forEach(([f, r]) => occ.set(f + ',' + r, 'd')); if (pg.set.k) occ.set(pg.set.k.join(','), 'k');
      T.forEach(st => { if (st.t !== 'move') return; const [f0, r0] = st.from.slice(1).split(',').map(Number), [f1, r1] = st.to.slice(1).split(',').map(Number), who = occ.get(f0 + ',' + r0);
        if (!who) bad.push(`${tag}: nothing on ${st.from}`);
        if (f0 !== f1 && r0 !== r1) bad.push(`${tag}: not a straight move`);
        const df = Math.sign(f1 - f0), dr = Math.sign(r1 - r0); for (let f = f0 + df, r = r0 + dr; f !== f1 || r !== r1; f += df, r += dr) if (occ.has(f + ',' + r)) bad.push(`${tag}: jumps over ${f},${r}`);
        if (occ.has(f1 + ',' + r1)) bad.push(`${tag}: lands on a piece`);
        const special = (f1 === 3 && r1 === 3) || ((f1 === 0 || f1 === 6) && (r1 === 0 || r1 === 6)); if (special && who !== 'k') bad.push(`${tag}: only the king may stop on ${st.to}`);
        occ.delete(f0 + ',' + r0); occ.set(f1 + ',' + r1, who);
        for (const c of st.cap || []) { const k = c.slice(1); const v = occ.get(k); if (!v) { bad.push(`${tag}: nothing to capture on ${c}`); continue; }
          const [cf, cr] = k.split(',').map(Number), foe = x => x && (who === 'a' ? x !== 'a' : x === 'a'), hostile = (f, r) => { const o = occ.get(f + ',' + r); return (o && o !== (v === 'a' ? 'a' : o === 'a' ? null : o) && (v === 'a' ? o !== 'a' : o === 'a')) || ((f === 0 || f === 6) && (r === 0 || r === 6)) || (f === 3 && r === 3 && !o); };
          const pairs = [[[cf - 1, cr], [cf + 1, cr]], [[cf, cr - 1], [cf, cr + 1]]].filter(([a, b]) => hostile(...a) && hostile(...b));
          if (v === 'k' && (Math.abs(cf - 3) + Math.abs(cr - 3) <= 1)) { if (![[cf - 1, cr], [cf + 1, cr], [cf, cr - 1], [cf, cr + 1]].every(([f, r]) => occ.get(f + ',' + r) === 'a' || (f === 3 && r === 3))) bad.push(`${tag}: the king by the throne needs four`); }
          else if (!pairs.length) bad.push(`${tag}: ${c} is not sandwiched`);
          void foe; occ.delete(k); } });
    }
    if (id === 'shosoin') {
      T.forEach(st => { if (st.t !== 'tap' || !st.put) return; const taken = new Set([...pg.set.b, ...pg.set.w].map(q => q.join(',')));
        for (const a of st.at) if (taken.has(a.slice(1))) bad.push(`${tag}: ${a} is not empty`); });
    }
  });
  return bad;
}

const rep = {}; let sum = 0, n = 0;
for (const id of Object.keys(C)) { if (only.length && !only.includes(id)) continue;
  const pen = scoreCourse(id, C[id], TX[id]); facts(id, C[id]).forEach(b => pen.push([12, 'board: ' + b]));
  const score = Math.max(0, 100 - pen.reduce((a, [x]) => a + x, 0)); rep[id] = { score, pen }; sum += score; n++; }
const overall = n ? Math.round(sum / n * 10) / 10 : 0;
console.log(`pass mark ${CFG.pass} · overall ${overall}`);
for (const id in rep) console.log(`${id.padEnd(12)} ${String(rep[id].score).padStart(4)}${rep[id].score >= CFG.pass ? '' : '  ✗'}`);
const show = +(opt('--show') || 0); if (show) for (const id in rep) { const p = rep[id].pen; if (p.length) console.log(`  ${id}: ` + p.slice(0, show).map(([x, w]) => `-${x} ${w}`).join(' / ')); }
if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify({ pass: CFG.pass, overall, courses: rep }, null, 1));
process.exitCode = Object.values(rep).every(r => r.score >= CFG.pass) ? 0 : 1;
