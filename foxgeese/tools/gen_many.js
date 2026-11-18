// node foxgeese/tools/gen_many.js [workers] [hours]  — self-play data for the learned evaluation, on every core (2026-11-18)
// Starts `workers` (default: cores − 1) copies of tools/gen_data.js and stops after `hours` (default 3). The data goes to
// foxgeese/.fgdata/*.jsonl (not committed: .gitignore). Safe to stop with Ctrl+C and to start again (new files each run).
const { spawn } = require('child_process'), os = require('os'), path = require('path'), fs = require('fs');
const W = +(process.argv[2] || Math.max(1, os.cpus().length - 1)), H = +(process.argv[3] || 3);
const dir = path.join(__dirname, '..', '.fgdata'); fs.mkdirSync(dir, { recursive: true });
const stamp = Date.now().toString(36), kids = [];
for (let k = 0; k < W; k++) {
  const out = path.join(dir, `d-${stamp}-${k}.jsonl`);
  kids.push(spawn(process.execPath, [path.join(__dirname, 'gen_data.js'), out, '1000000', String(Date.now() % 100000 + k * 7919)], { stdio: 'ignore' }));
}
const count = () => { let n = 0; for (const f of fs.readdirSync(dir)) if (f.endsWith('.jsonl')) n += fs.readFileSync(path.join(dir, f), 'utf8').split('\n').length - 1; return n; };
console.log(`${W} workers, ${H} h → ${dir}`);
const tick = setInterval(() => console.log(new Date().toLocaleTimeString(), 'positions so far:', count()), 5 * 60 * 1000);
const stop = () => { clearInterval(tick); kids.forEach(k => k.kill()); console.log('done. positions:', count()); process.exit(0); };
setTimeout(stop, H * 3600 * 1000); process.on('SIGINT', stop);
