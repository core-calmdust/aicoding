// paired match on 5x5: node match.js <out.jsonl> <games> <A: path,level,x5,scale> <B: ...> [openPlies]
// game g: opening seed floor(g/2); A moves first in even games. Appends one line per game; resumes from the file.
const fs = require('fs'), { spawn } = require('child_process');
const E = require('/home/claude/aicoding/dots/engine.js');
const [out, N, A, B, OP] = [process.argv[2], +process.argv[3], process.argv[4].split(','), process.argv[5].split(','), +(process.argv[6] || 4)];
const R = 5, C = 5, G = E.geom(R, C), PONDER = +(process.env.PONDER || 0);
const done = new Set(); if (fs.existsSync(out)) for (const l of fs.readFileSync(out, 'utf8').split('\n')) if (l.trim()) done.add(JSON.parse(l).g);
function agent(a) {
  const ch = spawn('nice', ['-n', '5', 'node', __dirname + '/agent.js', ...a], { stdio: ['pipe', 'pipe', 'inherit'] });
  let buf = '', q = [];
  ch.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); q.shift()(JSON.parse(l)); } });
  return { ask: m => new Promise(r => { q.push(r); ch.stdin.write(JSON.stringify(m) + '\n'); }), kill: () => ch.kill() };
}
function opening(seed) {   // OP random safe moves
  let rs = (seed * 2654435761 + 12345) >>> 0 || 1; const rand = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
  const p = new E.Pos(G), h = [];
  for (let i = 0; i < OP; i++) { const l = p.legal().filter(e => p.gives(e) === 0); const e = l[Math.floor(rand() * l.length)]; p.play(e); h.push(e); }
  return h;
}
(async () => {
  const ag = [agent(A), agent(B)];
  for (let g = 0; g < N; g++) {
    if (done.has(g)) continue;
    const first = g % 2;   // index of the agent that moves first
    const hist = opening(Math.floor(g / 2)), p = E.Pos.from(G, hist), sc = [0, 0];
    let turn = OP % 2;   // side to move after the opening (side 0 = first mover)
    const ms = [0, 0], nm = [0, 0], maxms = [0, 0]; let lastWho = -1;
    while (p.undrawn > 0) {
      const who = turn === 0 ? first : 1 - first;
      if (PONDER && who === 1 && lastWho === 0) await ag[0].ask({ ponder: PONDER });   // A thinks while a (human-like) opponent would
      const r = await ag[who].ask({ R, C, edges: hist, lead: sc[turn] - sc[1 - turn] }); lastWho = who;
      if (p.drawn[r.move] || r.move < 0 || r.move >= G.E) throw new Error('illegal move ' + r.move);
      ms[who] += r.ms; nm[who]++; if (r.ms > maxms[who]) maxms[who] = r.ms;
      const k = p.play(r.move); hist.push(r.move); sc[turn] += k; if (!k) turn ^= 1;
    }
    const a = first === 0 ? sc[0] : sc[1], b = 25 - a;
    fs.appendFileSync(out, JSON.stringify({ g, aFirst: first === 0, a, b, msA: ms[0], msB: ms[1], nA: nm[0], nB: nm[1], maxA: maxms[0], maxB: maxms[1], hist }) + '\n');
    console.log(`g${g} A ${first === 0 ? 'first' : 'second'}: ${a}-${b}  (A ${(ms[0] / 1000).toFixed(0)}s, B ${(ms[1] / 1000).toFixed(0)}s)`);
  }
  ag.forEach(x => x.kill());
})();
