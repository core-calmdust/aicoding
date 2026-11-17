// Moves old NEWS lines into the archive (claude/game-conventions-addendum.md, ユーザー指定 2026-11-17：一定期間を過ぎた更新はアーカイブへ).
//   shared/atlas-updates.js          — the lines of the last KEEP_DAYS days (read by the top page and the portal on every visit)
//   shared/atlas-updates-archive.js  — everything older (read only when 「すべての更新」 › アーカイブ is opened)
// The main file also keeps window.ATLAS_UPD_LAST = { gameId: date } for games whose latest line is archived, so the badges and
// the 更新順 order still know when each game was last updated.
// Run: node tools/news-archive.js   (news-check.js says when it is due). The window counts back from the newest line.
const fs = require('fs'), path = require('path');
const KEEP_DAYS = 14;
const ROOT = path.join(__dirname, '..'), MAIN = path.join(ROOT, 'shared/atlas-updates.js'), ARC = path.join(ROOT, 'shared/atlas-updates-archive.js');
const load = (f, key) => { if (!fs.existsSync(f)) return []; global.window = {}; delete require.cache[require.resolve(f)]; require(f); return window[key] || []; };
const main = load(MAIN, 'ATLAS_UPDATES'), arc = load(ARC, 'ATLAS_UPDATES_ARCHIVE');
const newest = [...main, ...arc].map(u => u[0]).sort().pop();
const cut = new Date(new Date(newest + 'T00:00:00Z').getTime() - KEEP_DAYS * 864e5).toISOString().slice(0, 10);   // lines dated before this go
const keep = main.filter(u => u[0] >= cut), moved = main.filter(u => u[0] < cut);
const all = [...moved, ...arc].sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0));   // newest first (stable within a day)
const last = {};
all.forEach(u => { if (!keep.some(k => k[1] === u[1]) && !last[u[1]]) last[u[1]] = u[0]; });
const rows = L => L.map(u => '  ' + JSON.stringify(u)).join(',\n');
const src = fs.readFileSync(MAIN, 'utf8'), head = src.slice(0, src.indexOf('window.ATLAS_UPDATES = ['));
fs.writeFileSync(MAIN, head + 'window.ATLAS_UPDATES = [\n' + rows(keep) + '\n];\n'
  + '// games whose latest line is in the archive (written by tools/news-archive.js — do not edit by hand)\n'
  + 'window.ATLAS_UPD_LAST = ' + JSON.stringify(last) + ';\n');
fs.writeFileSync(ARC, `/* World Board Game Atlas — the changelog's archive (written by tools/news-archive.js: lines older than ${KEEP_DAYS} days
   before the newest one move here from shared/atlas-updates.js). Loaded only when 「すべての更新」 › アーカイブ is opened
   (atlas/app.js). Same rows as ATLAS_UPDATES: [date, gameId, ja, en, { the other 12 languages }], newest first. */
window.ATLAS_UPDATES_ARCHIVE = [
${rows(all)}
];
`);
console.log(`kept ${keep.length} (from ${cut}), archived ${moved.length} more → ${all.length} in the archive`);
