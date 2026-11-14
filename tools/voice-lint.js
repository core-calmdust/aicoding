#!/usr/bin/env node
// Guide-voice lint (2026-11-15): a quality gate for the lines a guide character speaks in Japanese.
// A file of hand-written lines (window.I18N['ja@<guide>']) is scored text by text; any text under 80 points, or any
// hard error, fails the run (exit 1). Run it whenever such a file changes:  node tools/voice-lint.js [file …]
// Default: every backgammon/voice-*-ja.js.
//
// Hard errors (0 points): polite speech (です・ます) at a sentence end; bossy endings a cute guide never uses
// (〜ぞ・〜ぜ・〜だろ・〜しろ・〜じゃねえ); calling the player あなた; the tic (ワン etc.) more than once in one text;
// a talk-to-yourself / bystander phrase (〜んだよね after the guide's own statement at the very start, ふむふむ, なるほど
// as a reaction to nobody).
// Deductions: the same ending three sentences running (−25); one ending on more than half the sentences of a text of 4+
// (−15); a sentence over 85 characters (−5 each); a text with 5+ sentences and no ！／？／invitation (−10).
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(path.join(ROOT, 'backgammon')).filter(f => /^voice-.*-ja\.js$/.test(f)).map(f => path.join(ROOT, 'backgammon', f));
const TIC = { dicepup: /ワン/g };
const plain = s => String(s).replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/\{\w+\}/g, '0');
const sentences = s => (plain(s).match(/[^。！？\n]+[。！？]+|[^。！？\n]+$/gm) || []).map(x => x.trim()).filter(Boolean);
function ending(sn) {   // the kind of ending of one sentence
  const b = sn.replace(/[。！？]+$/, '').replace(/[）)」』]+$/, '');
  for (const e of ['んだよね', 'なんだ', 'んだ', 'だよ', 'だね', 'かな', 'よね', 'よう', 'ろう', 'こう', 'そう', 'ワン', 'よ', 'ね', 'ね']) if (b.endsWith(e)) return e;
  if (/[うくすつぬふむゆる]$/.test(b) && /[！]$/.test(sn)) return '！';
  return /[！？]$/.test(sn) ? sn.slice(-1) : 'noun';
}
let bad = 0, n = 0;
// the backgammon warm-ups (backgammon/ramps.json): ダイスン's lines too
if (!process.argv.slice(2).length) files.push(path.join(ROOT, 'backgammon', 'ramps.json'));
for (const f of files) {
  const w = {};
  if (/\.json$/.test(f)) { const D = JSON.parse(fs.readFileSync(f, 'utf8')), o = {}; for (const st in D.steps || {}) D.steps[st].forEach((it, i) => ['b', 'g', 'h', 'y'].forEach(k => { if (it[k] && it[k].ja) o[st + '/' + i + '/' + k] = it[k].ja; })); for (const k in D.ui || {}) o['ui.' + k] = D.ui[k].ja; w.I18N = { 'ja@dicepup': o }; }
  else new Function('window', fs.readFileSync(f, 'utf8'))(w);
  for (const key in w.I18N || {}) {
    const guide = key.split('@')[1]; if (!guide) continue;
    const T = w.I18N[key];
    for (const k in T) {
      const tx = String(T[k]), S = sentences(tx); if (!S.length || /^tl\./.test(k)) continue;
      n++; const err = [], ded = []; let score = 100;
      S.forEach(sn => {
        if (/(です|ます|ません|ました|でしょう)[。！？]?$/.test(sn)) err.push('polite: ' + sn);
        if (/(ぞ|ぜ|だろ|しろ|じゃねえ|せよ)[。！？]*$/.test(sn)) err.push('bossy: ' + sn);
        if (sn.length > 85) { score -= 5; ded.push('long(' + sn.length + ')'); }
      });
      if (/あなた/.test(plain(tx))) err.push('あなた');
      const G = plain(tx).match(/[いし]だよ|てもう[。！]|ますよ|ですよ/); if (G) err.push('broken grammar: ' + G[0]);   // (the marks of a machine conversion)
      if (/ふむふむ|なるほど/.test(plain(tx))) err.push('bystander reaction');
      if (/^[^。]{0,40}んだよね。/.test(plain(tx))) err.push('opens with 〜んだよね');
      const tic = TIC[guide]; if (tic && (plain(tx).match(tic) || []).length > 1) err.push('tic ×' + plain(tx).match(tic).length);
      const E = S.map(ending);
      for (let i = 2; i < E.length; i++) if (E[i] === E[i - 1] && E[i] === E[i - 2] && E[i] !== 'noun') { score -= 25; ded.push('3× ' + E[i]); break; }
      if (E.length >= 4) { const c = {}; E.forEach(e => c[e] = (c[e] || 0) + 1); const [e, m] = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; if (m / E.length > .5 && e !== 'noun') { score -= 15; ded.push('mostly ' + e); } }
      if (S.length >= 5 && !S.some(sn => /[！？]$/.test(sn) || /(よう|こう|そう|ろう|ね)[。！]$/.test(sn))) { score -= 10; ded.push('flat'); }
      if (err.length) score = 0;
      if (score < 80) { bad++; console.log(`✗ ${path.basename(f)} ${key} ${k}: ${score}  ${err.concat(ded).join(' / ')}`); }
    }
  }
}
console.log(`${n} texts checked, ${bad} below 80`);
process.exit(bad ? 1 : 0);
