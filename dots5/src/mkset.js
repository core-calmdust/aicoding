// decisive test positions: node mkset.js <match.jsonl,...> <safeLo> <safeHi> <ms> <out.jsonl>
// every position (not forced, no capture) with safe in range from the games; oracle outcome for the mover (target -lead)
const fs = require('fs'), { spawn } = require('child_process');
const E = require('/home/claude/aicoding/dots/engine.js'); const G = E.geom(5, 5);
const [inp, lo, hi, ms, out] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], process.argv[6]];
const done = new Set(); if (fs.existsSync(out)) for (const l of fs.readFileSync(out, 'utf8').split('\n')) if (l.trim()) done.add(JSON.parse(l).key);
const o = spawn(__dirname + '/outc', ['25']); let buf = '', q = [];
o.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); q.shift()(l); } });
const ask = s => new Promise(r => { q.push(r); o.stdin.write(s + '\n'); });
const hex = p => { let v = 0n; for (let e = 0; e < 60; e++) if (p.drawn[e]) v |= 1n << BigInt(e); return v.toString(16); };
const cs = p => { let n = 0; for (let e = 0; e < 60; e++) if (!p.drawn[e] && p.gives(e) === 0) n++; return n; };
(async () => {
  for (const f of inp.split(',')) for (const l of fs.readFileSync(f, 'utf8').trim().split('\n')) {
    const g = JSON.parse(l);
    const p = new E.Pos(G), sc = [0, 0]; let turn = 0; const P = [];
    for (let i = 0; i < g.hist.length; i++) {
      const s = cs(p), cap = p.hasCapture() ? E.captureMoves(p) : null;
      if (s >= lo && s <= hi && !cap) P.push({ key: f.split('/').pop() + ':' + g.g + ':' + i, edges: p.edges(), lead: sc[turn] - sc[1 - turn], safe: s, mask: hex(p) });
      const k = p.play(g.hist[i]); sc[turn] += k; if (!k) turn ^= 1;
    }
    await ask('0 999 0');
    for (let j = P.length - 1; j >= 0; j--) {   // late first: warms the table
      const x = P[j]; if (done.has(x.key)) continue;
      const r = (await ask(`${x.mask} ${-x.lead} ${ms}`)).split(' ').map(Number);
      x.cls = r[0]; x.ms = r[2]; delete x.mask;
      fs.appendFileSync(out, JSON.stringify(x) + '\n');
    }
  }
  o.kill();
})();
