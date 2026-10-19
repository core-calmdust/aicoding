// shared helpers for the Dots & Boxes content generators (Node). Exact values only.
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const E = require('/home/claude/aicoding/dots/engine.js');
const CK = '/home/claude/work/ckpt/dotscontent';

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const pick = (a, r) => a[Math.floor(r() * a.length)];

function atomicWrite(file, data) { const tmp = file + '.tmp' + process.pid; fs.writeFileSync(tmp, data); const fd = fs.openSync(tmp, 'r'); fs.fsyncSync(fd); fs.closeSync(fd); fs.renameSync(tmp, file); }
function appendLine(file, obj) { const fd = fs.openSync(file, 'a'); fs.writeSync(fd, JSON.stringify(obj) + '\n'); fs.fsyncSync(fd); fs.closeSync(fd); }
function readJsonl(file) { if (!fs.existsSync(file)) return []; return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); }

// ---------------------------------------------------------------- native exact solver (3x3, 4x4)
class Native {
  constructor(n, bits) {
    this.n = n; this.q = []; this.buf = '';
    const env = Object.assign({}, process.env);
    if (n === 4 && process.env.SEED4) env.TTSEED = '/home/claude/work/ckpt/dots4/root/tt_root.bin';
    this.p = spawn(__dirname + (n === 5 ? '/allv5' : '/allv'), [String(n), String(bits || (n === 3 ? 22 : 24))], { env });
    this.p.stdout.on('data', d => {
      this.buf += d; let k;
      while ((k = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, k); this.buf = this.buf.slice(k + 1);
        const parts = line.trim().split(' '), v = +parts[0], vals = parts.slice(1).map(x => x.split(':').map(Number));
        const job = this.q.shift(); job({ v, vals });
      }
    });
  }
  // edges -> {v, vals:[[e,v],...]}
  solve(edges) {
    let m = 0n; for (const e of edges) m |= 1n << BigInt(e);
    return new Promise(res => { this.q.push(res); this.p.stdin.write(m.toString(16) + '\n'); });
  }
  close() { this.p.stdin.end(); }
}
// JS exact solver (any size); returns {v, vals} or null when over the time budget
const jsSolvers = {};
function jsSolve(n, edges, ms) {
  const G = E.geom(n, n), key = n;
  if (!jsSolvers[key]) { const s = new E.Solver(G, 22); s.prune = true; jsSolvers[key] = s; }
  const S = jsSolvers[key];
  const p = E.Pos.from(G, edges);
  S.limit(0, ms || 20000);
  const list = S.all(p);
  if (!list) return null;
  const vals = list.map(x => [x.m, x.v]);
  return { v: Math.max(...vals.map(x => x[1])), vals };
}

// ---------------------------------------------------------------- position features
function feats(n, edges) {
  const G = E.geom(n, n), p = E.Pos.from(G, edges);
  const legal = p.legal();
  const safe = legal.filter(e => p.gives(e) === 0 && p.completes(e) === 0);
  const caps = legal.filter(e => p.completes(e) > 0);
  const comps = E.components(p, true);
  return { G, p, legal, safe, caps, comps };
}
// components of the loony position: chains/loops with their boxes and edges
function compEdges(p, comp) {
  const G = p.G, set = new Set();
  for (const b of comp.boxes) for (let i = b * 4; i < b * 4 + 4; i++) { const e = G.be[i]; if (!p.drawn[e]) set.add(e); }
  return [...set];
}
function sortVals(vals) { return vals.slice().sort((a, b) => b[1] - a[1] || a[0] - b[0]); }
function bestSet(vals) { const b = Math.max(...vals.map(x => x[1])); return vals.filter(x => x[1] === b).map(x => x[0]); }

module.exports = { E, CK, rng, pick, atomicWrite, appendLine, readJsonl, Native, jsSolve, feats, compEdges, sortVals, bestSet };
