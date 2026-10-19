// where are games decided? node decide.js <match.jsonl> <msPerPos> <out.jsonl>  (resumable per game)
// For each game: oracle outcome (native solver, target = score needed to win) of every position from the end backwards
// until a position is not solved in time; then every move that turned a win into a loss is a mistake.
const fs = require('fs'), { spawn } = require('child_process');
const E = require('/home/claude/aicoding/dots/engine.js'); const G = E.geom(5, 5);
const [inp, ms, out] = [process.argv[2], +process.argv[3], process.argv[4]];
const games = fs.readFileSync(inp, 'utf8').trim().split('\n').map(JSON.parse);
const done = new Set(); if (fs.existsSync(out)) for (const l of fs.readFileSync(out, 'utf8').split('\n')) if (l.trim()) done.add(JSON.parse(l).g);
const o = spawn(__dirname + '/outc', ['25']); let buf = '', q = [];
o.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); q.shift()(l); } });
const ask = s => new Promise(r => { q.push(r); o.stdin.write(s + '\n'); });
const hex = p => { let v = 0n; for (let e = 0; e < 60; e++) if (p.drawn[e]) v |= 1n << BigInt(e); return v.toString(16); };
const cs = p => { let n = 0; for (let e = 0; e < 60; e++) if (!p.drawn[e] && p.gives(e) === 0) n++; return n; };
(async () => {
  for (const g of games) {
    if (done.has(g.g)) continue;
    await ask('0 999 0');
    const p = new E.Pos(G), sc = [0, 0]; let turn = 0; const P = [];
    for (let i = 0; i < g.hist.length; i++) {
      const e = g.hist[i];
      const who = (turn === 0) === g.aFirst ? 'A' : 'B';
      P.push({ i, mask: hex(p), t: -(sc[turn] - sc[1 - turn]), who, safe: cs(p), turn });
      const k = p.play(e); sc[turn] += k; if (!k) turn ^= 1;
    }
    const cls = new Array(P.length).fill(null);
    let firstSolved = P.length;
    for (let i = P.length - 1; i >= 0; i--) {
      const r = (await ask(`${P[i].mask} ${P[i].t} ${ms}`)).split(' ').map(Number);
      if (r[0] === 9) break;
      cls[i] = r[0]; firstSolved = i;
    }
    const mistakes = [];
    for (let i = firstSolved; i < P.length - 1; i++) {
      const a = cls[i], b0 = cls[i + 1]; if (a === null || b0 === null) continue;
      const b = P[i + 1].turn === P[i].turn ? b0 : -b0;
      if (b < a) mistakes.push({ i, who: P[i].who, safe: P[i].safe, from: a, to: b });
    }
    const f = P[firstSolved];
    const rec = { g: g.g, winner: g.a > g.b ? 'A' : 'B', firstSolved, safeAtSolve: f ? f.safe : -1, startWinner: f ? (cls[firstSolved] > 0 ? f.who : f.who === 'A' ? 'B' : 'A') : null, mistakes };
    fs.appendFileSync(out, JSON.stringify(rec) + '\n'); console.log(JSON.stringify(rec));
  }
  o.kill();
})();
