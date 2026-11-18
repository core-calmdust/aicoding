// node foxgeese/tools/pack_book.js <book1.json> [book2.json …]  — merges tools/make_book.js outputs into engine.js (between the
// BOOK-BEGIN / BOOK-END lines). 2026-11-19.
const fs = require('fs'), path = require('path');
const book = {}; const info = [];
for (const f of process.argv.slice(2)) { const b = JSON.parse(fs.readFileSync(f, 'utf8')); Object.assign(book, b.book); info.push(`${b.rule} first ${b.first === 2 ? 'geese' : 'fox'} ${b.own} moves ${b.ms}ms`); }
const file = path.join(__dirname, '..', 'engine.js'), src = fs.readFileSync(file, 'utf8');
const a = src.indexOf('// BOOK-BEGIN'), z = src.indexOf('// BOOK-END');
if (a < 0 || z < 0) throw new Error('markers not found');
const line = `// BOOK-BEGIN (tools/pack_book.js: ${Object.keys(book).length} positions — ${info.join(' · ')})\nconst BOOK = ${JSON.stringify(book)};\n`;
fs.writeFileSync(file, src.slice(0, a) + line + src.slice(z));
console.log('packed', Object.keys(book).length, 'positions,', (line.length / 1024).toFixed(1), 'KB');
