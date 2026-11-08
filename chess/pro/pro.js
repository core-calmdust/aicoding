// Chess — strongest analysis: the NNUE engine on several threads (engine_mt.wasm, Lazy SMP over a shared memory).
// The page is made cross-origin isolated by coi-sw.js (SharedArrayBuffer); without it, one thread (the normal engine).
(() => {
  'use strict';
  const E = window.ChessEngine;
  const VER = '?v=1';
  const LANG = (() => { try { return (localStorage.getItem('aicoding-lang') || 'ja') === 'ja' ? 'ja' : 'en'; } catch (e) { return 'ja'; } })();
  const T = {
    ja: { ttl: '最強解析', depth: '深さ', nps: '局面/秒', threads: 'スレッド', sel: 'スレッド数', ana: '解析', stop: '停止', play: 'AIに指させる',
      undo: '戻す', flip: '盤を反転', reset: '初期配置', loadFen: 'FENを読み込む', copyFen: 'FENをコピー', auto: '自動', inf: '無制限', sec: '秒',
      isoOk: '並列 {n} スレッド', isoNg: '1スレッド（このブラウザでは並列不可）', loading: '準備中…', mateIn: '詰み {n}', badFen: 'FENが読めません',
      copied: 'コピーしました', thinking: '考え中…', over: '対局終了',
      note: 'このページだけは、複数のCPUコアで同時に読む設定（クロスオリジン分離）で動いています。そのためオンライン対局やログインは、元のチェスのページで行ってください。スレッドを増やすほど深く読めますが、端末が熱くなりやすくなります。' },
    en: { ttl: 'Deep analysis', depth: 'Depth', nps: 'Nodes/s', threads: 'Threads', sel: 'Threads', ana: 'Analyse', stop: 'Stop', play: 'Engine move',
      undo: 'Undo', flip: 'Flip', reset: 'Reset', loadFen: 'Load FEN', copyFen: 'Copy FEN', auto: 'Auto', inf: 'Infinite', sec: 's',
      isoOk: '{n} threads in parallel', isoNg: '1 thread (no parallel search in this browser)', loading: 'Loading…', mateIn: 'Mate in {n}', badFen: 'Cannot read this FEN',
      copied: 'Copied', thinking: 'Thinking…', over: 'Game over',
      note: 'Only this page runs in the mode that lets several CPU cores search together (cross-origin isolation), so play online and sign in on the main chess page. More threads search deeper but make the device run hotter.' },
  }[LANG];
  const tr = (k, v) => (T[k] || k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] !== undefined ? v[x] : '');
  const $ = s => document.querySelector(s);
  document.documentElement.lang = LANG;
  const setText = (sel, k) => { const el = $(sel); if (el) el.textContent = tr(k); };
  [['#ttl', 'ttl'], ['#lDepth', 'depth'], ['#lNps', 'nps'], ['#lThreads', 'threads'], ['#lSel', 'sel'], ['#btnAna', 'ana'], ['#btnPlay', 'play'],
    ['#btnUndo', 'undo'], ['#btnFlip', 'flip'], ['#btnReset', 'reset'], ['#btnFen', 'loadFen'], ['#btnCopy', 'copyFen'], ['#note', 'note']].forEach(a => setText(...a));
  document.title = 'Chess — ' + tr('ttl');

  // ------------------------------------------------------------------ cross-origin isolation (needed for threads)
  const COI_KEY = 'coi-reload:' + location.pathname;   // per page + time: a sessionStorage copy kept across the isolation switch must not block the next page
  async function ensureIsolated() {
    if (self.crossOriginIsolated) { try { localStorage.removeItem(COI_KEY); } catch (e) {} return true; }
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return false;
    let once = false; try { once = Date.now() - (+localStorage.getItem(COI_KEY) || 0) < 15000; } catch (e) {}
    try {
      await navigator.serviceWorker.register('coi-sw.js', { scope: './' });
      await navigator.serviceWorker.ready;
    } catch (e) { return false; }
    if (once) return false;   // reloaded once already and still not isolated: give up (one thread)
    try { localStorage.setItem(COI_KEY, String(Date.now())); } catch (e) {}
    location.reload();
    return new Promise(() => {});
  }

  // ------------------------------------------------------------------ the multi-thread engine
  const SLOT = 2 << 20;   // per thread: TLS block + stack
  const HC = navigator.hardwareConcurrency || 4, MAXT = Math.max(1, Math.min(32, HC));
  const MT = { X: null, mem: null, module: null, base: 0, workers: [], busy: false };
  async function loadNet(X, mem) {
    const res = await fetch('../nnue.bin.gz' + VER);
    const buf = new Uint8Array(await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    if (buf.length !== X.nn_size()) throw new Error('nnue size');
    new Uint8Array(mem.buffer).set(buf, X.nn_ptr()); X.nn_enable(1);
  }
  async function initMT() {
    MT.module = await WebAssembly.compileStreaming(fetch('../engine_mt.wasm' + VER));
    MT.mem = new WebAssembly.Memory({ initial: 512, maximum: 16384, shared: true });   // maximum = engine_mt.wasm's (1 GiB)
    const X = (await WebAssembly.instantiate(MT.module, { env: { memory: MT.mem, now: () => performance.now(), progress: () => {} } })).exports;
    MT.base = Math.ceil(X.mt_heap_base() / 65536) * 65536;
    const need = MT.base + (MAXT + 1) * SLOT;
    if (need > MT.mem.buffer.byteLength) MT.mem.grow(Math.ceil((need - MT.mem.buffer.byteLength) / 65536));
    X.mt_stack(MT.base + MAXT * SLOT + SLOT - 16); X.mt_thread(MT.base + MAXT * SLOT, 999);   // this page's own slot
    X.init(); X.new_game();
    await loadNet(X, MT.mem);
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
  // one search: all threads start; thread 0 decides when it is over. onProgress({ depth, score, nodes, pv }) from thread 0
  function goMT(fen, moves, soft, hard, onProgress) {
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
        w.postMessage({ type: 'go', fen, moves, soft, hard });
      });
    });
  }
  const stopMT = () => { if (MT.X) MT.X.mt_stop(1); };

  // single-thread fallback: the normal chess worker (level 20)
  let FB = null;
  function goFB(fen, uciMoves, ms) {
    if (!FB) FB = new Worker('../engine.js?v=20261108top');
    const pos = E.Pos.fromFEN(fen), mv = []; for (const u of uciMoves) { const m = pos.fromUci(u); mv.push(m); pos.make(m); }
    return new Promise(res => { FB.onmessage = e => { if (e.data.type === 'result') res(e.data); }; FB.postMessage({ type: 'think', id: 1, fen, moves: mv, level: 20 }); });
  }

  // ------------------------------------------------------------------ game state and board
  const START = E.START;
  let startFen = START, line = [], flipped = false, sel = -1, lastMove = null, analysing = false, thinking = false, threaded = false;
  const params = new URLSearchParams(location.search);
  if (params.get('fen')) { try { E.Pos.fromFEN(params.get('fen')); startFen = params.get('fen'); } catch (e) {} }
  if (params.get('moves')) { const p = E.Pos.fromFEN(startFen); for (const u of params.get('moves').split(/[ ,]+/)) { const m = p.fromUci(u); if (!m) break; line.push(u); p.make(m); } }
  const cur = () => { const p = E.Pos.fromFEN(startFen); for (const u of line) p.make(p.fromUci(u)); return p; };
  const PIECE = ['', 'P', 'N', 'B', 'R', 'Q', 'K'];
  const board = $('#board');
  function draw() {
    const p = cur(), legal = p.legal(), tg = new Set();
    if (sel >= 0) legal.forEach(m => { if (E.mFrom(m) === sel) tg.add(E.mTo(m)); });
    board.innerHTML = '';
    for (let rr = 0; rr < 8; rr++) for (let ff = 0; ff < 8; ff++) {
      const r = flipped ? rr : 7 - rr, f = flipped ? 7 - ff : ff, s = r * 16 + f, pc = p.b[s];
      const d = document.createElement('div');
      d.className = 'sq ' + ((r + f) % 2 ? 'l' : 'd') + (s === sel ? ' sel' : '') + (tg.has(s) ? ' tgt' : '') + (lastMove && (lastMove[0] === s || lastMove[1] === s) ? ' last' : '');
      if (pc) { const im = document.createElement('img'); im.src = '../pieces/cburnett/' + (pc & 8 ? 'b' : 'w') + PIECE[pc & 7] + '.svg'; im.alt = ''; d.appendChild(im); }
      if (rr === 7) { const c = document.createElement('span'); c.className = 'co f'; c.textContent = 'abcdefgh'[f]; d.appendChild(c); }
      if (ff === 0) { const c = document.createElement('span'); c.className = 'co r'; c.textContent = String(r + 1); d.appendChild(c); }
      d.onclick = () => clickSq(s);
      board.appendChild(d);
    }
    // move list (SAN)
    const q = E.Pos.fromFEN(startFen), out = [];
    line.forEach((u, i) => { const m = q.fromUci(u); const n = (q.full || 1); out.push((q.side === 0 ? n + '. ' : (i === 0 ? n + '... ' : '')) + q.san(m)); q.make(m); });
    $('#moves').textContent = out.join(' ');
    $('#fen').value = p.fen();
    $('#btnUndo').disabled = !line.length || thinking;
    $('#btnPlay').disabled = !legal.length || thinking;
  }
  async function clickSq(s) {
    if (thinking) return;
    const p = cur(), legal = p.legal();
    if (sel >= 0) {
      const ms = legal.filter(m => E.mFrom(m) === sel && E.mTo(m) === s);
      if (ms.length) {
        const m = ms.find(x => E.mPromo(x) === E.Q || !E.mPromo(x)) || ms[0];   // promotion: queen
        await playUci(p.uci(m)); sel = -1; draw(); return;
      }
    }
    sel = p.b[s] && ((p.b[s] & 8 ? 1 : 0) === p.side) ? s : -1; draw();
  }
  async function playUci(u) {
    const wasAna = analysing; if (wasAna) await stopAnalysis();
    const p = cur(), m = p.fromUci(u); if (!m) return;
    line.push(u); lastMove = [E.mFrom(m), E.mTo(m)]; clearInfo();
    if (wasAna) startAnalysis();
  }

  // ------------------------------------------------------------------ analysis readout
  const CMATE = 31000, CMATE_MAX = CMATE - 256;
  function fmtScore(s, side) {
    const w = side === 0 ? s : -s;   // White's view
    if (Math.abs(s) >= CMATE_MAX) { const n = Math.ceil((CMATE - Math.abs(s)) / 2); return (w > 0 ? '+' : '−') + tr('mateIn', { n }); }
    return (w >= 0 ? '+' : '−') + (Math.abs(w) / 100).toFixed(2);
  }
  function sanLine(uc) { const p = cur(), out = []; for (const u of uc) { const m = p.fromUci(u); if (!m) break; out.push(p.san(m)); p.make(m); } return out.join(' '); }
  function show(r) {
    const p = cur();
    $('#eval').textContent = fmtScore(r.score, p.side);
    $('#depth').textContent = String(r.depth);
    if (r.nps) $('#nps').textContent = Math.round(r.nps).toLocaleString();
    $('#pv').textContent = sanLine(r.pv || []);
  }
  function clearInfo() { $('#eval').textContent = '—'; $('#depth').textContent = '—'; $('#pv').textContent = ''; }

  let anaRun = null;
  async function startAnalysis() {
    if (!threaded || analysing) return;
    analysing = true; $('#btnAna').textContent = tr('stop');
    const fen = startFen, moves = line.slice(), t0 = performance.now(), N = MT.workers.length;
    anaRun = goMT(fen, moves, 0, 0, m => show({ ...m, nps: m.nodes * N / Math.max(1, performance.now() - t0) * 1000 }));
    const r = await anaRun; anaRun = null; analysing = false; $('#btnAna').textContent = tr('ana');
    if (r) show({ ...r, nps: r.totalNodes / Math.max(1, r.ms) * 1000 });
  }
  async function stopAnalysis() { if (!analysing) return; stopMT(); if (anaRun) await anaRun; }
  async function enginePlay() {
    if (thinking) return;
    const wasAna = analysing; if (wasAna) await stopAnalysis();
    const p = cur(); if (!p.legal().length) return;
    thinking = true; draw(); $('#pv').textContent = tr('thinking');
    const ms = +$('#selTime').value || 5000;
    let u = null;
    if (threaded) {
      const N = MT.workers.length, t0 = performance.now();
      const r = await goMT(startFen, line.slice(), ms * 0.55, ms, m => show({ ...m, nps: m.nodes * N / Math.max(1, performance.now() - t0) * 1000 }));
      show({ ...r, nps: r.totalNodes / Math.max(1, r.ms) * 1000 }); u = r.move; var rest = (r.pv || []).slice(1);
    } else {
      const r = await goFB(startFen, line, ms);
      if (r && r.move) u = cur().uci(r.move);
    }
    thinking = false;
    if (u) { const q = cur(), m = q.fromUci(u); line.push(u); lastMove = [E.mFrom(m), E.mTo(m)]; }
    draw();
    $('#pv').textContent = rest ? sanLine(rest) : '';   // the expected continuation after the move just played
    if (wasAna) startAnalysis();
  }

  // ------------------------------------------------------------------ controls
  [[1000, '1'], [3000, '3'], [5000, '5'], [10000, '10'], [30000, '30']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l + ' ' + tr('sec'); if (v === 5000) o.selected = true; $('#selTime').appendChild(o); });
  const thrOpts = [...new Set([Math.max(1, HC - 1), 1, 2, 4, 6, 8, 12, 16, HC].filter(n => n >= 1 && n <= MAXT))].sort((a, b) => a - b);
  thrOpts.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n === Math.max(1, HC - 1) ? n + '（' + tr('auto') + '）' : String(n); if (n === Math.max(1, HC - 1)) o.selected = true; $('#selThr').appendChild(o); });
  $('#selThr').onchange = async () => { if (!threaded) return; const was = analysing; await stopAnalysis(); await setThreads(+$('#selThr').value); if (was) startAnalysis(); };
  $('#btnAna').onclick = () => analysing ? stopAnalysis() : startAnalysis();
  $('#btnPlay').onclick = enginePlay;
  $('#btnUndo').onclick = async () => { const was = analysing; await stopAnalysis(); line.pop(); lastMove = null; sel = -1; clearInfo(); draw(); if (was) startAnalysis(); };
  $('#btnFlip').onclick = () => { flipped = !flipped; draw(); };
  $('#btnReset').onclick = async () => { const was = analysing; await stopAnalysis(); startFen = START; line = []; lastMove = null; sel = -1; clearInfo(); draw(); if (was) startAnalysis(); };
  $('#btnFen').onclick = async () => {
    const f = $('#fen').value.trim(); let ok = false; try { const p = E.Pos.fromFEN(f); ok = !!p && p.fen(); } catch (e) {}
    if (!ok) { $('#pv').textContent = tr('badFen'); return; }
    const was = analysing; await stopAnalysis(); startFen = f; line = []; lastMove = null; sel = -1; clearInfo(); draw(); if (was) startAnalysis();
  };
  $('#btnCopy').onclick = () => { try { navigator.clipboard.writeText(cur().fen()); $('#pv').textContent = tr('copied'); } catch (e) {} };
  if (params.get('back')) $('#back').href = params.get('back');

  // ------------------------------------------------------------------ start
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
    window.__proReady = { threaded, threads: MT.workers.length };
  })();
})();
