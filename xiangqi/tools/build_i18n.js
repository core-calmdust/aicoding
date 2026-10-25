// node tools/build_i18n.js → i18n.js
// The game-independent UI strings (dialogs, buttons, rated games, lessons / puzzles frames …) are taken from Checkers
// (../checkers/i18n.js, same page design); everything that is about xiangqi comes from tools/i18n_xq.js and tools/i18n_lessons.js.
const fs = require('fs'), path = require('path'), vm = require('vm');
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const root = path.join(__dirname, '..');
const sb = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, '../checkers/i18n.js'), 'utf8'), sb);
const CK = sb.window.I18N;
const GENERIC = `series brand.back back you thinking eval kifu kifu.empty copy copy.title copied nokifu close start
nav.first nav.prev nav.play nav.next nav.last rs.title rs.playing rs.viewing rs.resume rs.restart review.resume review.latest
btn.new btn.new.title btn.undo btn.undo.title btn.hint btn.rules btn.rules.title btn.lesson btn.lesson.title btn.puzzle btn.sound.title
tab.lesson tab.open tab.puzzle ng.title ng.mode ng.ai ng.rated ng.pvp ng.watch ng.lesson ng.puzzle ng.rules ng.rulesHelp ng.color ng.random
ng.level ng.display ng.toLessons ng.toPuzzles opt.eval opt.last opt.anim lv.kyu lv.dan1 lv.dan2 lv.dan3 lv.dan4 lv.dan5
res.review res.again res.draw res.youWin res.aiWin res.pWin res.sub res.vs res.why.time res.why.abandon res.why.resign res.why.agree
h.win h.loss h.in ev.won ev.winIn ev.winning ev.even ev.slight ev.adv ev.sup st.win st.turn hb.turn hb.won info.moves info.browse
pick.own cant.stuck cant.move share share.title share.copied paste paste.title paste.load paste.bad paste.invalid paste.loaded
rv.title rv.btn rv.btn.title rv.running rv.done rv.clean rv.win rv.loss rv.even rv.eval q.bad q.dubious q.best
cr.title cr.move cr.turn cr.see cr.nav cr.noData cr.sum cr.clean cr.best cr.good cr.gen rl.title
rt.title rt.start rt.noEval rt.prov rt.rec rt.none rt.recent rt.W rt.L rt.D rt.vs rt.up rt.even rt.down rt.opp rt.below rt.abandonQ rt.abandonYes rt.abandoned
ls.title ls.list ls.back ls.start ls.toGame ls.toList ls.toOpen ls.retry ls.nextStep ls.hint ls.next ls.result ls.quit ls.clear ls.notyet ls.fail
ls.stepq ls.turn ls.passed ls.failed ls.needPass lx.cleared u.pt fb.perfect fb.good fb.ng fb.bad
op.title op.study op.studyDesc op.practice op.practiceDesc op.studyStart op.studyEnd op.prev op.next op.toPractice op.playHere op.playing op.practiceStep
op.goal op.pass op.why op.hint op.auto pz.retry pz.answer pz.next pz.list pz.checking pz.fail pz.good pz.yourMove pz.solved pz.hintText pz.showing pz.answerDone
pz.stray pz.best daily.title daily.streak daily.best daily.go
dr.aiOffer dr.accept dr.decline dr.resignQ dr.resign dr.wait dr.accepted dr.declined dr.aiResigned`.split(/\s+/).filter(Boolean);
const XQ = Object.assign({}, require('./i18n_xq.js'), fs.existsSync(path.join(__dirname, 'i18n_lessons.js')) ? require('./i18n_lessons.js') : {});
const out = {};
for (const [li, L] of LANGS.entries()) {
  const o = {};
  for (const k of GENERIC) { const v = CK[L][k] !== undefined ? CK[L][k] : CK.en[k]; if (v === undefined) throw new Error('missing generic ' + k); o[k] = v; }
  for (const k in XQ) { const v = XQ[k][li]; if (v === undefined || v === null) throw new Error('missing ' + k + ' / ' + L); o[k] = v; }
  out[L] = o;
}
let s = '// UI strings for Xiangqi — ja / en / zh (Simplified) / ko / es / fr / pt / de / hi / ar (built by tools/build_i18n.js)\nwindow.I18N = {\n';
for (const L of LANGS) s += L + ': ' + JSON.stringify(out[L]) + ',\n';
s += '};\n';
fs.writeFileSync(path.join(root, 'i18n.js'), s);
console.log('i18n.js', LANGS.map(l => l + ':' + Object.keys(out[l]).length).join(' '));
