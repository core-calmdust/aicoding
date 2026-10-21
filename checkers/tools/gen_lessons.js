// node tools/gen_lessons.js <selfplay.bin> <pz_pos.jsonl> <pz_eg.jsonl>  → lessons.json
// Builds the lesson problems from self-play positions (and puzzle candidates), verified with the engine (+ endgame DB).
// basics: "ok" lists (rule-level answers); tactics: engine values of every move ("sc"); endgames: database results ("ok").
const fs = require('fs'), path = require('path');
const { load } = require('./wasm.js');
(async () => {
  const W = await load(), E = W.E;
  const [dataFile, pzPos, pzEg] = process.argv.slice(2);
  let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // ---------------------------------------------------------------- positions
  const buf = fs.readFileSync(dataFile), N = buf.length / 24, recs = [];
  for (let i = 0; i < N; i += 7) { const b = buf.readUInt32LE(i * 24), w = buf.readUInt32LE(i * 24 + 4), k = buf.readUInt32LE(i * 24 + 8), side = buf.readInt32LE(i * 24 + 12) & 1; recs.push({ b, w, k, side }); }
  const toSpec = r => { const p = E.Pos.from(null); p.b = r.b; p.w = r.w; p.k = r.k; p.side = r.side; return p.spec(); };
  const posOf = spec => E.Pos.from(spec);
  shuffle(recs);
  // forced-capture material balance (as in app.js)
  const capValue = (pos, m) => { let v = 0; for (const i of E.bitsOf(E.mCap(m))) v += pos.at(i) === 2 || pos.at(i) === 4 ? 1.3 : 1; if (pos.promotes(m)) v += 0.3; return v; };
  function swapGain(pos, d) { const caps = pos.caps(); if (!caps.length || d > 10) return 0; let best = -Infinity; for (const c of caps) { const v = capValue(pos, c) - swapGain(pos.clone().play(c), d + 1); if (v > best) best = v; } return best; }
  const matAfter = (pos, m) => capValue(pos, m) - swapGain(pos.clone().play(m), 0);
  const nPieces = p => E.popc(p.b | p.w);
  const used = new Set();
  const take = (key) => { if (used.has(key)) return false; used.add(key); return true; };
  const keyOf = spec => spec.b + spec.side;
  function pick(n, gen) { const out = []; for (const r of recs) { if (out.length >= n) break; const spec = toSpec(r); if (!take(keyOf(spec))) continue; const P = gen(spec, posOf(spec)); if (P) out.push(P); else used.delete(keyOf(spec)); } return out; }
  const steps = [];
  // positions with captures to choose from: one move after a recorded (quiet) position
  function pickChild(n, gen) {
    const out = [];
    for (const r of recs) {
      if (out.length >= n) break;
      const p0 = posOf(toSpec(r));
      for (const m of shuffle(p0.moves().slice())) {
        const spec = p0.clone().play(m).spec(); if (used.has(keyOf(spec))) continue;
        const P = gen(spec, posOf(spec)); if (P) { used.add(keyOf(spec)); out.push(P); break; }
      }
    }
    return out;
  }
  // ---------------------------------------------------------------- basics
  steps.push({ id: 'b_move', course: 'basics', problems: pick(5, (spec, pos) => {
    if (nPieces(pos) < 8 || nPieces(pos) > 14 || pos.hasCaps()) return null;
    const L = pos.moves(); if (L.length < 4) return null;
    const ok = L.filter(m => matAfter(pos, m) > -0.5), bad = L.length - ok.length;
    if (!ok.length || bad < 2) return null;
    return { s: spec, ok, best: ok[0] };
  }) });
  steps.push({ id: 'b_jump', course: 'basics', problems: pickChild(5, (spec, pos) => {
    if (nPieces(pos) > 18) return null;
    const L = pos.caps(); if (L.length < 2) return null;
    const v = L.map(m => matAfter(pos, m)), mx = Math.max(...v), mn = Math.min(...v);
    if (mx - mn < 0.9 || mx < 0.9) return null;
    const ok = L.filter((m, i) => v[i] >= mx - 0.05);
    return { s: spec, ok, best: ok[0] };
  }) });
  steps.push({ id: 'b_multi', course: 'basics', problems: pickChild(5, (spec, pos) => {
    const L = pos.caps(); if (L.length < 2) return null;
    const c = L.map(m => E.popc(E.mCap(m))), mx = Math.max(...c);
    if (mx < 2 || c.every(x => x === mx)) return null;
    const ok = L.filter((m, i) => c[i] === mx && matAfter(pos, m) >= Math.max(...L.map(x => matAfter(pos, x))) - 0.05);
    if (!ok.length) return null;
    return { s: spec, ok, best: ok[0] };
  }) });
  steps.push({ id: 'b_king', course: 'basics', problems: pick(5, (spec, pos) => {
    if (nPieces(pos) > 16 || pos.hasCaps()) return null;
    const L = pos.moves(); if (L.length < 3) return null;
    const ok = L.filter(m => pos.promotes(m) && matAfter(pos, m) > -0.5);
    if (!ok.length || ok.length === L.length) return null;
    return { s: spec, ok, best: ok[0] };
  }) });
  steps.push({ id: 'b_safe', course: 'basics', problems: pick(5, (spec, pos) => {
    if (nPieces(pos) < 6 || nPieces(pos) > 16 || pos.hasCaps()) return null;
    const q = pos.clone(); q.side ^= 1; if (!q.caps().length) return null;   // the opponent threatens a capture
    const L = pos.moves(); if (L.length < 3) return null;
    const ok = L.filter(m => matAfter(pos, m) > -0.5);
    if (!ok.length || ok.length > L.length - 2) return null;
    return { s: spec, ok, best: ok[0] };
  }) });
  // win at once: from the endgame puzzle candidates with n = 1
  const egC = fs.readFileSync(pzEg, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const win1 = shuffle(egC.filter(x => x.n === 1 && x.moves >= 3)).slice(0, 40);
  steps.push({ id: 'b_win', course: 'basics', problems: win1.map(x => { const spec = { b: x.b, side: x.side }, pos = posOf(spec); const ok = pos.moves().filter(m => pos.clone().play(m).status() === -1); return { s: spec, ok, best: ok[0] }; }).filter(P => P.ok.length && P.ok.length < posOf(P.s).moves().length).slice(0, 5) });
  // ---------------------------------------------------------------- tactics (engine values)
  const sc = (spec, ms) => { const r = W.analyze(spec, [], ms); return r.list.map(e => [e.m, e.v]); };
  const posC = fs.readFileSync(pzPos, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  function fromShots(filter, n) {
    const out = [];
    for (const x of shuffle(posC.filter(filter))) {
      if (out.length >= n) break;
      const spec = { b: x.b, side: x.side }; if (!take(keyOf(spec))) continue;
      const S = sc(spec, 1500), best = S[0], m = E.mv(x.f, x.t, x.cap);
      if (best[0] !== m || S.length < 3 || best[1] - S[1][1] < 60) continue;
      out.push({ s: spec, best: best[0], sc: S });
    }
    return out;
  }
  steps.push({ id: 't_shot1', course: 'tactics', problems: fromShots(x => x.g === 1 && x.n === 2 && !x.cap1 && x.va >= x.vb - 10 && x.va > 60 && x.va < 2000 && x.pieces <= 16, 5) });
  steps.push({ id: 't_shot2', course: 'tactics', problems: fromShots(x => (x.n === 3 || x.g === 2) && !x.cap1 && x.va >= x.vb - 10 && x.va > 60 && x.va < 2000, 5) });
  // the only good move: a clear best move, most moves lose material or much more
  function onlyMove(filter, n) {
    const out = [];
    for (const r of recs) {
      if (out.length >= n) break;
      const spec = toSpec(r), pos = posOf(spec); if (pos.hasCaps() || pos.moves().length < 5 || !filter(pos)) continue;
      if (!take(keyOf(spec))) continue;
      const S = sc(spec, 400); if (S.length < 5) continue;
      const b = S[0][1], gap = b - S[1][1], bad = S.filter(e => e[1] < b - 120).length;
      if (gap < 120 || bad < 3 || Math.abs(b) > 600) continue;
      const S2 = sc(spec, 1500); if (S2[0][0] !== S[0][0] || S2[0][1] - S2[1][1] < 100) continue;
      out.push({ s: spec, best: S2[0][0], sc: S2 });
    }
    return out;
  }
  steps.push({ id: 't_defend', course: 'tactics', problems: onlyMove(pos => { const q = pos.clone(); q.side ^= 1; return q.caps().length > 0 || nPieces(pos) >= 14; }, 5) });
  steps.push({ id: 't_best', course: 'tactics', problems: onlyMove(pos => nPieces(pos) <= 14, 5) });
  // ---------------------------------------------------------------- endgames (database: ok = moves keeping the best result)
  function egSteps(id, filter, want) {
    const out = [];
    for (const x of shuffle(egC.slice())) {
      if (out.length >= 5) break;
      if (x.pieces > 4) continue;
      const spec = { b: x.b, side: x.side }, pos = posOf(spec);
      if (!filter(pos) || pos.hasCaps()) continue;
      const L = pos.moves(); if (L.length < 4) continue;
      const res = L.map(m => { const q = pos.clone().play(m); if (q.status() === -1) return 1; const v = W.probe(q.spec()); return v === 2 ? 1 : v === 1 ? -1 : v === 3 ? 0 : null; });
      if (res.some(v => v === null)) continue;
      const best = Math.max(...res); if (best !== want) continue;
      const ok = L.filter((m, i) => res[i] === best);
      if (ok.length > (want === 1 && kingsOnly(pos) ? 3 : 2) || ok.length === L.length) continue;
      if (!take(keyOf(spec))) continue;
      out.push({ s: spec, ok, best: ok[0] });
    }
    return out;
  }
  // more candidates for the endgame steps: random 3-4 piece positions (side to move has a database result)
  for (let it = 0; it < 150000; it++) {
    const np = 3 + Math.floor(rnd() * 2), a = Array(32).fill('.'); let ok = true;
    for (let i = 0; i < np; i++) { let s; do { s = Math.floor(rnd() * 32); } while (a[s] !== '.'); const black = i === 0 || (i < np - 1 && rnd() < 0.5); let king = rnd() < 0.5; if (black && s >= 28) king = true; if (!black && s < 4) king = true; a[s] = black ? (king ? 'B' : 'b') : (king ? 'W' : 'w'); }
    if (!a.some(c => c === 'w' || c === 'W')) continue;
    egC.push({ b: a.join(''), side: 1 + Math.floor(rnd() * 2), pieces: np });
  }
  const kingsOnly = pos => !(pos.b & ~pos.k) && !(pos.w & ~pos.k);
  steps.push({ id: 'e_kings', course: 'endgame', problems: egSteps('e_kings', pos => kingsOnly(pos), 1) });
  steps.push({ id: 'e_men', course: 'endgame', problems: egSteps('e_men', pos => E.popc((pos.b | pos.w) & ~pos.k) >= 2, 1) });
  steps.push({ id: 'e_draw', course: 'endgame', problems: egSteps('e_draw', pos => true, 0) });
  for (const s of steps) console.error(s.id, s.problems.length);
  fs.writeFileSync(path.join(__dirname, '..', 'lessons.json'), JSON.stringify({ version: 1, steps }));
})();
