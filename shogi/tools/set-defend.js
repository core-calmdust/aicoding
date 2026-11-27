// (2026-11-27 第2期 担当A) writes k3「詰めろを受ける」 into shogi/lessons.json and shogi/lesson-replies.json from the picked candidates
// (shogi/tools/defend-picked.json: gen-defend.js rand → filtered by the engine, the pool distance and the kinds). Each problem: mode cp,
// accept = the only move after which the opponent has no mate within three, cand = every legal move with the engine's value (depth 5),
// th = the opponent's mates in one after a pass, rep = for every other move the opponent's first mating move. Order: easy → hard
// (d = the other moves that stop the mate in one but are mated in three, then the legal moves).
// usage: node shogi/tools/set-defend.js
'use strict';
const E = require('../engine.js'), zlib = require('zlib'), fs = require('fs'), path = require('path');
{ const b = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../weights.bin.gz'))); E.setWeights(new Int16Array(b.buffer, b.byteOffset, b.length / 2)); }
const ROOT = path.join(__dirname, '..'), LP = path.join(ROOT, 'lessons.json'), RP = path.join(ROOT, 'lesson-replies.json');
const L = JSON.parse(fs.readFileSync(LP, 'utf8')), R = JSON.parse(fs.readFileSync(RP, 'utf8')), g = L.grades.find(x => x.id === 'k3');
const picked = JSON.parse(fs.readFileSync(path.join(__dirname, 'defend-picked.json'), 'utf8')).sort((a, b) => a.n3 - b.n3 || a.legal - b.legal);
Object.keys(R).filter(k => k.startsWith('k3/')).forEach(k => delete R[k]);
g.problems = picked.map((o, j) => {
  const p = new E.Position(); p.setSfen(o.sfen);
  const cand = new E.Searcher(p).analyze({ depth: 5, time: 0 }).sort((x, y) => y.s - x.s).map(r => [p.toUsi(r.m), Math.round(r.s)]);
  if (cand[0][0] !== o.ans) throw new Error('engine top changed ' + j);
  for (const m of p.legalMoves(true)) { const u = p.toUsi(m); if (!cand.some(c => c[0] === u)) cand.push([u, cand[cand.length - 1][1]]); }   // (a move the search leaves out: the lowest value)
  const q = new E.Position(); q.setSfen(o.sfen); q.doMove(q.fromUsi(o.ans));
  const rr = new E.Searcher(q).rootSearch({ depth: 5, time: 0 }), reply = q.toUsi(rr.move), sc = Math.max(-30000, Math.min(30000, -rr.score));
  const rep = {}; for (const [u] of cand) if (u !== o.ans) rep[u] = [o.rep[u][0], 'mate'];
  R['k3/' + j] = Object.fromEntries(cand.map(([u]) => [u, u === o.ans ? [reply, Math.round(sc)] : [o.rep[u][0], -30000]]));
  return { kind: 'best', sfen: o.sfen, src: 'defend', mode: 'cp', pv: [o.ans, reply], accept: [o.ans], th: o.threat, cand, floor: cand[cand.length - 1][1], rep };
});
// the warm-ups: a pawn in hand and Gote's king away in the corner (no check to give), so the tries have 60+ legal moves and the
// defences (ok: every move after which no mate in one, the same as within three) are a third of them at most (追72)
const RAMP = ['k8/p8/9/9/9/9/9/7pP/8K b Pg 1', 'k8/p8/9/9/9/9/9/7pP/8K b Pg 1', 'k8/p8/9/9/9/9/4p4/9/4K4 b Pg 1'], OK = [null, ['1h1g', '1i2h', 'P*2i'], ['5i6h', '5i4h', '5i6i', '5i4i', 'P*5h']];
g.ramp.forEach((r, j) => { r.sfen = RAMP[j]; if (OK[j]) r.ok = OK[j]; });
// the intro: each problem has one move only that stops every mate (the others are mated within three)
Object.assign(g.intro, Object.fromEntries(Object.entries({
  ja: 'この問題では、相手の詰み筋を読み、それを消す手を選んでください。詰みを全部防げる手は、各問ただ一つです（ほかの手では3手以内に詰まされます）。',
  en: 'Read the threat and choose the move that removes it. In each problem only one move stops every mate (after any other you are mated within three moves).',
  zh: '在这些题目中，请读出对方的杀棋路线，并选出消除它的一手。每题能防住所有将死的着法只有一个（其他着法都会在3手内被将死）。',
  ko: '이 문제에서는 상대의 외통 수순을 읽고 그것을 없애는 수를 고르세요. 모든 외통을 막는 수는 문제마다 하나뿐입니다(다른 수는 3수 안에 외통당합니다).',
  es: 'Lee la amenaza y elige la jugada que la elimina. En cada problema solo una jugada para todos los mates (con cualquier otra recibes mate en tres o menos).',
  fr: 'Lisez la menace et choisissez le coup qui la supprime. Dans chaque problème, un seul coup pare tous les mats (après tout autre, mat en trois coups au plus).',
  pt: 'Leia a ameaça e escolha o lance que a elimina. Em cada problema só um lance evita todos os mates (com qualquer outro você leva mate em até três).',
  de: 'Lies die Drohung und wähle den Zug, der sie beseitigt. In jeder Aufgabe verhindert nur ein Zug jedes Matt (nach jedem anderen folgt Matt in höchstens drei Zügen).',
  hi: 'खतरे को पढ़ें और वह चाल चुनें जो उसे हटा दे। हर सवाल में सिर्फ़ एक चाल हर मात को रोकती है (किसी और चाल पर तीन चालों के भीतर मात होती है)।',
  ar: 'اقرأ التهديد واختر النقلة التي تزيله. في كل مسألة نقلة واحدة فقط تمنع كل المات (بعد أي نقلة أخرى تُمات في ثلاث نقلات أو أقل).',
  ru: 'Прочтите угрозу и выберите ход, который её снимает. В каждой задаче только один ход защищает от всех матов (после любого другого — мат не более чем в три хода).',
  'zh-TW': '讀出威脅，選擇能解除它的著法。每題能防住所有將死的著法只有一個（其他著法都會在3手內被將死）。',
  id: 'Baca ancamannya dan pilih langkah yang menghapusnya. Di tiap soal hanya satu langkah yang mencegah semua mat (dengan langkah lain kamu kena mat dalam tiga langkah atau kurang).',
  tr: 'Tehdidi okuyun ve onu ortadan kaldıran hamleyi seçin. Her problemde tüm matları önleyen tek bir hamle vardır (başka her hamlede en fazla üç hamlede mat olursunuz).' }).map(([k, v]) => [k, [g.intro[k][0], v]])));
fs.writeFileSync(LP, JSON.stringify(L)); fs.writeFileSync(RP, JSON.stringify(R));
console.log(g.problems.map(P => P.accept[0] + ' ' + P.cand.length).join('\n'));
