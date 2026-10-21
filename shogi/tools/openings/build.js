// Build the opening category files (shogi/openings-<cat>.json) from src/<cat>.js and tag the core sets in openings.json.
// node shogi/tools/openings/build.js        (problems come from problems.json made by probs.js, if present)
const fs = require('fs'), path = require('path');
const { conv, show, START } = require('./kif.js');
const DIR = path.join(__dirname, '../..');
const LANGS = ['ja', 'en', 'zh', 'ko', 'es', 'fr', 'pt', 'de', 'hi', 'ar'];
const book = JSON.parse(fs.readFileSync(path.join(DIR, 'book.json'), 'utf8'));
const probs = fs.existsSync(path.join(__dirname, 'problems.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'problems.json'), 'utf8')) : {};
const CATS = ['beg', 'mid', 'adv', 'sp', 'new', 'castle'];
// core sets (openings.json, with their Floodgate problems): category, order, strategy side
const CORE = { furi: ['beg', 1, 'b'], yagura: ['beg', 2, 'b'], kakugawari: ['mid', 1], aigakari: ['mid', 2], ibisha: ['mid', 9], yokofu: ['adv', 1] };
const warn = []; let bad = 0;
const chk = (id, what, o) => { if (!o) { warn.push(`${id}: missing ${what}`); return; } for (const l of LANGS) if (!o[l]) warn.push(`${id}: ${what} lacks ${l}`); };
const core = JSON.parse(fs.readFileSync(path.join(DIR, 'openings.json'), 'utf8'));
for (const g of core.sets) { const c = CORE[g.id]; if (c) { g.cat = c[0]; g.ord = c[1]; if (c[2]) g.side = c[2]; else delete g.side; } else if (g.handi) g.cat = 'handi'; }
// the Ranging Rook set is really a Fourth-File Rook line: name it so next to the other ranging rooks
const furi = core.sets.find(g => g.id === 'furi');
if (furi) {
  furi.label = { ja: '四間', en: '4th-file', zh: '四间', ko: '시켄', es: '4.ª col.', fr: '4e col.', pt: '4.ª col.', de: '4. Linie', hi: 'चौथी', ar: 'الرابع' };
  furi.title = { ja: '四間飛車（対抗形）', en: 'Fourth-File Rook (vs Static Rook)', zh: '四间飞车（对抗形）', ko: '시켄비샤(대항형)', es: 'Torre en 4.ª columna (contra torre estática)', fr: 'Tour en 4e colonne (contre tour statique)', pt: 'Torre na 4.ª coluna (contra torre estática)', de: 'Turm auf der 4. Linie (gegen Standturm)', hi: 'चौथी पंक्ति का हाथी (स्थिर हाथी के विरुद्ध)', ar: 'رخ العمود الرابع (ضد الرخ الثابت)' };
  furi.short = { ja: '飛車を4筋に振り、美濃囲いで固めて受けから反撃する振り飛車の基本', en: 'Swing the rook to the 4th file, castle in Mino, absorb and counter — the classic Ranging Rook', zh: '把飞车移到4筋，用美浓围守住，先防守后反击的振飞车基本', ko: '비차를 4줄로 옮기고 미노 성으로 굳혀 받은 뒤 반격하는 후리비샤의 기본', es: 'Torre a la 4.ª columna, castillo Mino, aguantar y contraatacar: la torre desplazada clásica', fr: 'Tour en 4e colonne, château Mino, encaisser puis contrer : la tour mobile classique', pt: 'Torre na 4.ª coluna, castelo Mino, defender e contra-atacar: a torre móvel clássica', de: 'Turm auf die 4. Linie, Mino-Burg, abwehren und kontern – der klassische Schwenkturm', hi: 'हाथी चौथी पंक्ति पर, मीनो किला, बचाव फिर पलटवार — क्लासिक घूमता हाथी', ar: 'الرخ إلى العمود الرابع وقلعة مينو، ثم الصد والهجوم المضاد: الرخ المتنقل الكلاسيكي' };
}
// new sets take their problems from R3000+ games (the core six from R3500+)
for (const [l, s] of Object.entries(core.credit || {})) if (!s.includes('R3000')) core.credit[l] = s.replace('R3500', /^(ja|zh)$/.test(l) ? 'R3000〜3500' : 'R3000–3500');
const index = {};
for (const g of core.sets) if (g.cat && g.cat !== 'handi') (index[g.cat] = index[g.cat] || []).push([g.id, g.problems && g.problems.length >= 5 ? 1 : 0]);
const ids = new Set(core.sets.map(g => g.id));
const report = [];
for (const cat of CATS) {
  const f = path.join(__dirname, 'src', cat + '.js'); if (!fs.existsSync(f)) continue;
  const src = require(f), out = [];
  src.forEach((e, k) => {
    if (ids.has(e.id)) throw new Error('duplicate id ' + e.id); ids.add(e.id);
    let r; try { r = conv(e.line, e.start); } catch (x) { console.error(`${e.id}: ${x.message}`); bad++; return; }
    const start = e.start || START;
    // book frequencies (Floodgate R3500+) where the book has the position
    const E = require('../../engine.js'), p = new E.Position(); p.setSfen(start);
    const steps = r.usi.map(u => {
      const key = p.sfen().replace(/ \d+$/, ''), mv = book[key]; let pct = null, win = null;
      if (mv) { const tot = mv.reduce((a, b) => a + b[1], 0), x = mv.find(y => y[0] === u); if (x) { pct = Math.round(x[1] * 100 / tot); win = x[2]; } }
      p.doMove(p.fromUsi(u)); p.sp = 0; return [u, pct, win];
    });
    if (steps.length < 12 || steps.length > 30) warn.push(`${e.id}: ${steps.length} plies`);
    const notes = {};
    for (const [n, v] of Object.entries(e.notes || {})) { if (+n < 1 || +n > steps.length) warn.push(`${e.id}: note ${n} out of range`); notes[+n - 1] = v; chk(e.id, 'note ' + n, v); }
    const intro = {}; for (const l of LANGS) intro[l] = (e.intro || []).map(x => x[l]).filter(Boolean);
    (e.intro || []).forEach((x, i) => chk(e.id, 'intro ' + i, x));
    for (const k of ['label', 'title', 'short']) chk(e.id, k, e[k]);
    if (e.story) { chk(e.id, 'story.cap', e.story.cap); chk(e.id, 'story.hist', e.story.hist); if (e.story.who) chk(e.id, 'story.who', e.story.who); }
    for (const m of (e.story && e.story.marks) || []) if (!/^[1-9][1-9]$/.test(m)) warn.push(`${e.id}: bad mark ${m}`);
    const pr = cat === 'castle' || e.noPractice ? [] : (probs[e.id] || []);
    const g = { id: e.id, cat, ord: e.ord || k + 10, label: e.label, title: e.title, short: e.short, study: { start, steps, notes, intro }, problems: pr, story: e.story };
    if (e.side) g.side = e.side;
    out.push(g);
    (index[cat] = index[cat] || []).push([e.id, pr.length >= 5 ? 1 : 0]);
    report.push(`${cat}\t${e.id}\t${steps.length} plies\t${pr.length} problems`);
    if (process.env.SHOW && (process.env.SHOW === e.id || process.env.SHOW === 'all')) console.log(e.id, '\n' + show(r.sfen));
  });
  fs.writeFileSync(path.join(DIR, `openings-${cat}.json`), JSON.stringify({ version: 1, sets: out }));
}
core.index = index;
fs.writeFileSync(path.join(DIR, 'openings.json'), JSON.stringify(core));
console.log(report.join('\n'));
if (warn.length) console.log('WARN\n' + warn.join('\n'));
for (const c of CATS) { const f = path.join(DIR, `openings-${c}.json`); if (fs.existsSync(f)) console.log(c, fs.statSync(f).size); }
if (bad) { console.error(bad + ' entries failed'); process.exit(1); }
