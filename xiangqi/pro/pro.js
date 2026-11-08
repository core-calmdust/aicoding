// Xiangqi — strongest analysis: the engine on several threads (engine_mt.wasm, Lazy SMP over a shared memory, NNUE).
// The page is made cross-origin isolated by coi-sw.js (SharedArrayBuffer); without it, one thread (the normal engine).
(() => {
  'use strict';
  const E = window.XiangqiEngine;
  const VER = '?v=1', NETV = '?v=20261108p1', ENG = '../engine.js?v=20261108p1-l14-pro1-mt1';
  const LANG = (() => { try { return (localStorage.getItem('aicoding-lang') || 'ja') === 'ja' ? 'ja' : 'en'; } catch (e) { return 'ja'; } })();
  const T = {
    ja: { back: '← シャンチー', gname: 'シャンチー', ttl: '最強解析', depth: '深さ', nps: '局面/秒', threads: 'スレッド', sel: 'スレッド数', ana: '解析', stop: '停止', play: 'AIに指させる',
      undo: '戻す', flip: '盤を反転', reset: '初期配置', auto: '自動', sec: '秒', red: '紅', black: '黒', wins: '{s}の勝ち（{n}手）', best: '読み筋', toMove: '手番',
      isoOk: '並列 {n} スレッド', isoNg: '1スレッド（このブラウザでは並列不可）', loading: '準備中…', thinking: '考え中…', over: '対局終了',
      note: 'このページだけは、複数のCPUコアで同時に読む設定（クロスオリジン分離）で動いています。そのためオンライン対局やログインは、元のシャンチーのページで行ってください。評価値は紅から見た値（兵1枚≒1）で、評価関数は学習した NNUE です。' },
    en: { back: '← Xiangqi', gname: 'Xiangqi', ttl: 'Deep analysis', depth: 'Depth', nps: 'Nodes/s', threads: 'Threads', sel: 'Threads', ana: 'Analyse', stop: 'Stop', play: 'Engine move',
      undo: 'Undo', flip: 'Flip', reset: 'Reset', auto: 'Auto', sec: 's', red: 'Red', black: 'Black', wins: '{s} wins ({n} moves)', best: 'Line', toMove: 'To move',
      isoOk: '{n} threads in parallel', isoNg: '1 thread (no parallel search in this browser)', loading: 'Loading…', thinking: 'Thinking…', over: 'Game over',
      note: 'Only this page runs in the mode that lets several CPU cores search together (cross-origin isolation), so play online and sign in on the main xiangqi page. Scores are from Red\'s side (a pawn ≈ 1), with the learned NNUE evaluation.' },
  }[LANG];
  const tr = (k, v) => (T[k] || k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] !== undefined ? v[x] : '');
  const $ = s => document.querySelector(s);
  document.documentElement.lang = LANG;
  [['#back', 'back'], ['#gname', 'gname'], ['#ttl', 'ttl'], ['#lDepth', 'depth'], ['#lNps', 'nps'], ['#lThreads', 'threads'], ['#lSel', 'sel'], ['#btnAna', 'ana'], ['#btnPlay', 'play'],
    ['#btnUndo', 'undo'], ['#btnFlip', 'flip'], ['#btnReset', 'reset'], ['#note', 'note']].forEach(([s, k]) => { const el = $(s); if (el) el.textContent = tr(k); });
  document.title = tr('gname') + ' — ' + tr('ttl');

  // ------------------------------------------------------------------ cross-origin isolation (needed for threads)
  const COI_KEY = 'coi-reload:' + location.pathname;   // per page + time: a sessionStorage copy kept across the isolation switch must not block the next page
  async function ensureIsolated() {
    if (self.crossOriginIsolated) { try { localStorage.removeItem(COI_KEY); } catch (e) {} return true; }
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return false;
    let once = false; try { once = Date.now() - (+localStorage.getItem(COI_KEY) || 0) < 15000; } catch (e) {}
    try { await navigator.serviceWorker.register('coi-sw.js', { scope: './' }); await navigator.serviceWorker.ready; } catch (e) { return false; }
    if (once) return false;
    try { localStorage.setItem(COI_KEY, String(Date.now())); } catch (e) {}
    location.reload();
    return new Promise(() => {});
  }

  // ------------------------------------------------------------------ position
  const params = new URLSearchParams(location.search);
  let start = params.get('start') || null;
  try { E.Pos.from(start); } catch (e) { start = null; }
  let line = [];
  const over = (mv) => { const { pos, hashes } = E.replay(start, mv); return E.judge(pos, hashes, start, mv).over; };
  if (params.get('moves')) { for (const x of params.get('moves').split(/[ ,]+/)) { const m = +x, p = E.replay(start, line).pos; if (over(line) || !p.moves().includes(m)) break; line.push(m); } }
  const cur = () => E.replay(start, line).pos;
  const setupArr = () => { const { pos, hashes } = E.replay(start, line); const L = pos.moves(), ex = E.losingRepMoves(start, line, pos, hashes); return E.setupIO(start, line, ex.length >= L.length ? [] : ex); };

  // ------------------------------------------------------------------ the multi-thread engine
  const SLOT = 2 << 20;
  const HC = navigator.hardwareConcurrency || 4, MAXT = Math.max(1, Math.min(32, HC));
  const MT = { X: null, mem: null, module: null, base: 0, workers: [], nn: false };
  async function initMT() {
    MT.module = await WebAssembly.compileStreaming(fetch('../engine_mt.wasm' + VER));
    MT.mem = new WebAssembly.Memory({ initial: 512, maximum: 16384, shared: true });   // maximum = engine_mt.wasm's (1 GiB)
    const X = (await WebAssembly.instantiate(MT.module, { env: { memory: MT.mem, now: () => Date.now(), progress: () => {} } })).exports;
    MT.base = Math.ceil(X.mt_heap_base() / 65536) * 65536;
    const need = MT.base + (MAXT + 1) * SLOT;
    if (need > MT.mem.buffer.byteLength) MT.mem.grow(Math.ceil((need - MT.mem.buffer.byteLength) / 65536));
    X.mt_stack(MT.base + MAXT * SLOT + SLOT - 16); X.mt_thread(MT.base + MAXT * SLOT, 999);
    // the learned evaluation (as the game page does: engine.js loadNet)
    try {
      const res = await fetch('../nnue.bin.gz' + NETV);
      const buf = new Uint8Array(await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
      const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), H = dv.getInt32(4, true), IN = 1260;
      if (dv.getUint32(0, true) === 0x5845554E && dv.getInt32(8, true) === IN && H === X.xq_h()) {
        const b = buf.buffer; let o = buf.byteOffset + 12;
        new Int16Array(MT.mem.buffer, X.xq_w1_ptr(), IN * H).set(new Int16Array(b.slice(o, o + IN * H * 2))); o += IN * H * 2;
        new Int32Array(MT.mem.buffer, X.xq_b1_ptr(), H).set(new Int32Array(b.slice(o, o + H * 4))); o += H * 4;
        new Int16Array(MT.mem.buffer, X.xq_w2_ptr(), 2 * H).set(new Int16Array(b.slice(o, o + H * 4))); o += H * 4;
        X.xq_set_b2(dv.getInt32(o - buf.byteOffset, true)); MT.nn = true;
      }
    } catch (e) { console.warn('net', e); }
    X.new_game();
    MT.X = X;
  }
  async function setThreads(n) {
    while (MT.workers.length > n) MT.workers.pop().terminate();
    while (MT.workers.length < n) {
      const id = MT.workers.length, w = new Worker('mt-worker.js' + VER);
      await new Promise((res, rej) => {
        w.onmessage = e => { if (e.data.type === 'ready') res(); };
        w.onerror = rej;
        w.postMessage({ type: 'init', module: MT.module, mem: MT.mem, id, tls: MT.base + id * SLOT, top: MT.base + id * SLOT + SLOT - 16 });
      });
      MT.workers.push(w);
    }
    $('#thr').textContent = String(n);
    if ($('#iso').classList.contains('ok')) $('#iso').textContent = tr('isoOk', { n });
  }
  function goMT(time, onProgress) {
    const setup = setupArr();
    return new Promise(resolve => {
      MT.X.mt_stop(0); let left = MT.workers.length, main = null, nodes = 0; const t0 = performance.now();
      MT.workers.forEach(w => {
        w.onmessage = e => {
          const m = e.data;
          if (m.type === 'progress') { onProgress && onProgress(m); return; }
          if (m.type !== 'done') return;
          nodes += m.nodes; if (m.id === 0) main = m;
          if (--left === 0) resolve({ ...main, totalNodes: nodes, ms: performance.now() - t0 });
        };
        w.postMessage({ type: 'go', setup, time, nn: MT.nn });
      });
    });
  }
  const stopMT = () => { if (MT.X) MT.X.mt_stop(1); };
  let FB = null;
  function goFB() {
    if (!FB) FB = new Worker(ENG);
    return new Promise(res => { FB.onmessage = e => { if (e.data.type === 'result') res(e.data); }; FB.postMessage({ type: 'think', id: 1, start, moves: line.slice(), level: 20 }); });
  }

  // ------------------------------------------------------------------ board (9 files × 10 ranks; point = row * 9 + col, row 0 = Black's back rank)
  let flipped = false, sel = -1, lastMove = null, analysing = false, thinking = false, threaded = false;
  const board = $('#board');
  const GLY = { r: ' 帥仕相傌俥炮兵', b: ' 將士象馬車砲卒' };
  const GRID = (() => {   // the lines in units of one point (0.8 margin + 8 × 1 wide, 9 high)
    const m = 0.8, L = [], x = c => m + c, y = r => m + r;
    for (let r = 0; r < 10; r++) L.push(`M${x(0)} ${y(r)}H${x(8)}`);
    for (let c = 0; c < 9; c++) { if (c === 0 || c === 8) L.push(`M${x(c)} ${y(0)}V${y(9)}`); else { L.push(`M${x(c)} ${y(0)}V${y(4)}`); L.push(`M${x(c)} ${y(5)}V${y(9)}`); } }
    L.push(`M${x(3)} ${y(0)}L${x(5)} ${y(2)}M${x(5)} ${y(0)}L${x(3)} ${y(2)}M${x(3)} ${y(7)}L${x(5)} ${y(9)}M${x(5)} ${y(7)}L${x(3)} ${y(9)}`);
    return `<svg class="grid" viewBox="0 0 9.6 10.6"><path d="${L.join('')}" stroke="#5a3a1c" stroke-width=".035" fill="none"/><rect x="${m - .12}" y="${m - .12}" width="8.24" height="9.24" stroke="#5a3a1c" stroke-width=".05" fill="none"/><text x="2.4" y="5.48" font-size=".5" fill="#5a3a1c99" text-anchor="middle">楚 河</text><text x="7.2" y="5.48" font-size=".5" fill="#5a3a1c99" text-anchor="middle">漢 界</text></svg>`;
  })();
  function draw() {
    const p = cur(), done = over(line), legal = done ? [] : p.moves(), tg = new Set();
    if (sel >= 0) legal.forEach(m => { if (E.mFrom(m) === sel) tg.add(E.mTo(m)); });
    board.innerHTML = GRID;
    for (let s = 0; s < 90; s++) {
      const r = Math.floor(s / 9), c = s % 9, vr = flipped ? 9 - r : r, vc = flipped ? 8 - c : c, x = p.b[s];
      const d = document.createElement('div');
      d.className = 'pt' + (s === sel ? ' sel' : '') + (tg.has(s) ? ' tgt' : '') + (lastMove && (lastMove[0] === s || lastMove[1] === s) ? ' last' : '');
      d.style.left = `calc(var(--cell) * ${0.8 + vc})`; d.style.top = `calc(var(--cell) * ${0.8 + vr})`;
      if (x) { const k = document.createElement('div'), col = E.colorOf(x) ? 'b' : 'r'; k.className = 'pc ' + col; k.textContent = GLY[col][E.typeOf(x)]; d.appendChild(k); }
      d.onclick = () => clickSq(s);
      board.appendChild(d);
    }
    const q = E.Pos.from(start), out = [];
    line.forEach((m, i) => { out.push((i % 2 === 0 ? (i / 2 + 1) + '. ' : '') + E.name(q, m)); q.play(m); });
    $('#moves').textContent = out.join('  ') + (done ? '  — ' + tr('over') : '');
    $('#turn').textContent = tr('toMove') + ': ' + (p.side ? tr('black') : tr('red'));
    $('#btnUndo').disabled = !line.length || thinking;
    $('#btnPlay').disabled = !legal.length || thinking;
  }
  async function clickSq(s) {
    if (thinking || over(line)) return;
    const p = cur();
    if (sel >= 0) { const m = p.moves().find(x => E.mFrom(x) === sel && E.mTo(x) === s); if (m !== undefined) { sel = -1; await playMove(m); draw(); return; } }
    const x = p.b[s], mine = x && E.colorOf(x) === p.side;
    sel = mine && sel !== s ? s : -1; draw();
  }
  async function playMove(m) {
    const was = analysing; if (was) await stopAnalysis();
    line.push(m); lastMove = [E.mFrom(m), E.mTo(m)]; clearInfo();
    if (was) startAnalysis();
  }

  // ------------------------------------------------------------------ readout
  function fmt(r) {
    const p = cur(), rv = p.side ? -r.score : r.score;   // Red's view
    if (Math.abs(r.score) > E.WINT) { const n = (E.WIN - Math.abs(r.score) + 1) >> 1; return tr('wins', { s: rv > 0 ? tr('red') : tr('black'), n }); }
    const x = rv / 100; return (x > 0.005 ? '+' : x < -0.005 ? '−' : '') + Math.abs(x).toFixed(2);
  }
  function lineText(pv, first) {
    const p = cur(), out = [], seq = pv && pv.length ? pv.map(E.fromC) : first != null ? [E.fromC(first)] : [];
    for (const m of seq) { if (!p.moves().includes(m)) break; out.push(E.name(p, m)); p.play(m); }
    return out.join(' ');
  }
  function show(r) {
    $('#eval').textContent = fmt(r);
    $('#depth').textContent = String(r.depth);
    if (r.nps) $('#nps').textContent = Math.round(r.nps).toLocaleString();
    const t = r.move >= 0 ? lineText(r.pv, r.move) : '';
    $('#pv').textContent = t ? tr('best') + ': ' + t : '';
  }
  function clearInfo() { $('#eval').textContent = '—'; $('#depth').textContent = '—'; $('#pv').textContent = ''; }
  let anaRun = null;
  async function startAnalysis() {
    if (!threaded || analysing || over(line)) return;
    analysing = true; $('#btnAna').textContent = tr('stop');
    const t0 = performance.now(), N = MT.workers.length;
    anaRun = goMT(0, m => show({ ...m, nps: m.nodes * N / Math.max(1, performance.now() - t0) * 1000 }));
    const r = await anaRun; anaRun = null; analysing = false; $('#btnAna').textContent = tr('ana');
    if (r) show({ ...r, nps: r.totalNodes / Math.max(1, r.ms) * 1000 });
  }
  async function stopAnalysis() { if (!analysing) return; stopMT(); if (anaRun) await anaRun; }
  async function enginePlay() {
    if (thinking) return;
    const was = analysing; if (was) await stopAnalysis();
    const p = cur(); if (over(line) || !p.moves().length) return;
    thinking = true; draw(); $('#pv').textContent = tr('thinking');
    const ms = +$('#selTime').value || 5000;
    let m = null;
    if (threaded) {
      const N = MT.workers.length, t0 = performance.now();
      const r = await goMT(ms, x => show({ ...x, nps: x.nodes * N / Math.max(1, performance.now() - t0) * 1000 }));
      show({ ...r, nps: r.totalNodes / Math.max(1, r.ms) * 1000 }); m = r.move >= 0 ? E.fromC(r.move) : null;
    } else { const r = await goFB(); m = r && r.move; }
    thinking = false;
    if (m != null && m >= 0 && p.moves().includes(m)) { line.push(m); lastMove = [E.mFrom(m), E.mTo(m)]; }
    draw(); $('#pv').textContent = '';
    if (was) startAnalysis();
  }

  // ------------------------------------------------------------------ controls
  [[1000, '1'], [3000, '3'], [5000, '5'], [10000, '10'], [30000, '30']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l + ' ' + tr('sec'); if (v === 5000) o.selected = true; $('#selTime').appendChild(o); });
  const AUTO = Math.max(1, HC - 1), thrOpts = [...new Set([AUTO, 1, 2, 4, 6, 8, 12, 16, HC].filter(n => n >= 1 && n <= MAXT))].sort((a, b) => a - b);
  thrOpts.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n === AUTO ? n + '（' + tr('auto') + '）' : String(n); if (n === AUTO) o.selected = true; $('#selThr').appendChild(o); });
  $('#selThr').onchange = async () => { if (!threaded) return; const was = analysing; await stopAnalysis(); await setThreads(+$('#selThr').value); if (was) startAnalysis(); };
  $('#btnAna').onclick = () => analysing ? stopAnalysis() : startAnalysis();
  $('#btnPlay').onclick = enginePlay;
  $('#btnUndo').onclick = async () => { const was = analysing; await stopAnalysis(); line.pop(); lastMove = null; sel = -1; clearInfo(); draw(); if (was) startAnalysis(); };
  $('#btnFlip').onclick = () => { flipped = !flipped; draw(); };
  $('#btnReset').onclick = async () => { const was = analysing; await stopAnalysis(); line = []; lastMove = null; sel = -1; clearInfo(); draw(); if (was) startAnalysis(); };

  draw();
  $('#iso').textContent = tr('loading'); $('#btnAna').disabled = true;
  (async () => {
    const iso = await ensureIsolated();
    if (iso && typeof SharedArrayBuffer === 'function') {
      try { await initMT(); await setThreads(+$('#selThr').value); threaded = true; } catch (e) { console.error(e); threaded = false; }
    }
    $('#iso').textContent = threaded ? tr('isoOk', { n: MT.workers.length }) : tr('isoNg');
    $('#iso').className = 'status ' + (threaded ? 'ok' : 'ng');
    $('#btnAna').disabled = !threaded; $('#selThr').disabled = !threaded;
    if (!threaded) $('#thr').textContent = '1';
    window.__proReady = { threaded, threads: MT.workers.length, nn: MT.nn };
  })();
})();
