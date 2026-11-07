// Tafl — strongest analysis: the engine on several threads (engine_mt.wasm, Lazy SMP over a shared memory).
// The page is made cross-origin isolated by coi-sw.js (SharedArrayBuffer); without it, one thread (the normal engine).
(() => {
  'use strict';
  const E = window.TaflEngine;
  const VER = '?v=5', NETV = '?v=20261106tw1';
  const LANG = (() => { try { return (localStorage.getItem('aicoding-lang') || 'ja') === 'ja' ? 'ja' : 'en'; } catch (e) { return 'ja'; } })();
  const VNAME = { ja: { copenhagen: 'コペンハーゲン・ヘネフタフル', brandubh: 'ブランダブ', tablut: 'タブル', tawlbwrdd: 'タウルブルズ', fetlar: 'フェトラー', ardri: 'アルド・リー' },
    en: { copenhagen: 'Copenhagen Hnefatafl', brandubh: 'Brandubh', tablut: 'Tablut', tawlbwrdd: 'Tawlbwrdd', fetlar: 'Fetlar', ardri: 'Ard Rí' } }[LANG];
  const T = {
    ja: { back: '← タフル', ttl: '最強解析', depth: '深さ', nps: '局面/秒', threads: 'スレッド', sel: 'スレッド数', ana: '解析', stop: '停止', play: 'AIに指させる',
      undo: '戻す', flip: '盤を反転', reset: '初期配置', auto: '自動', sec: '秒', att: '攻め方', def: '守り方', wins: '{s}の勝ち（{n}手）', best: '最善手', toMove: '手番',
      isoOk: '並列 {n} スレッド', isoNg: '1スレッド（このブラウザでは並列不可）', loading: '準備中…', thinking: '考え中…', over: '対局終了',
      note: 'このページだけは、複数のCPUコアで同時に読む設定（クロスオリジン分離）で動いています。そのためオンライン対局やログインは、元のタフルのページで行ってください。評価値は守り方から見た値です（コペンハーゲンは学習した評価関数、他のルールは手作りの評価）。' },
    en: { back: '← Tafl', ttl: 'Deep analysis', depth: 'Depth', nps: 'Nodes/s', threads: 'Threads', sel: 'Threads', ana: 'Analyse', stop: 'Stop', play: 'Engine move',
      undo: 'Undo', flip: 'Flip', reset: 'Reset', auto: 'Auto', sec: 's', att: 'Attackers', def: 'Defenders', wins: '{s} win ({n} plies)', best: 'Best move', toMove: 'To move',
      isoOk: '{n} threads in parallel', isoNg: '1 thread (no parallel search in this browser)', loading: 'Loading…', thinking: 'Thinking…', over: 'Game over',
      note: 'Only this page runs in the mode that lets several CPU cores search together (cross-origin isolation), so play online and sign in on the main tafl page. Scores are from the defenders\' side (Copenhagen: the learned evaluation; the other rules: the hand-made one).' },
  }[LANG];
  const tr = (k, v) => (T[k] || k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] !== undefined ? v[x] : '');
  const $ = s => document.querySelector(s);
  document.documentElement.lang = LANG;
  [['#back', 'back'], ['#ttl', 'ttl'], ['#lDepth', 'depth'], ['#lNps', 'nps'], ['#lThreads', 'threads'], ['#lSel', 'sel'], ['#btnAna', 'ana'], ['#btnPlay', 'play'],
    ['#btnUndo', 'undo'], ['#btnFlip', 'flip'], ['#btnReset', 'reset'], ['#note', 'note']].forEach(([s, k]) => { const el = $(s); if (el) el.textContent = tr(k); });
  document.title = 'Tafl — ' + tr('ttl');

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
  const V = E.VARIANTS.includes(params.get('v')) ? params.get('v') : 'copenhagen';
  let start = params.get('start') || null;
  try { E.Pos.from(start, V); } catch (e) { start = null; }
  let line = [];
  if (params.get('moves')) { const p = E.Pos.from(start, V); for (const x of params.get('moves').split(/[ ,]+/)) { const m = +x; if (p.res || !p.moves().includes(m)) break; line.push(m); p.play(m); } }
  const cur = () => E.replay(start, line, V).pos;
  const setupArr = () => { const p = E.Pos.from(start, V), a = [E.VID[V], p.turn === E.P2 ? 1 : 0]; for (let i = 0; i < p.b.length; i++) a.push(p.b[i]); a.push(line.length); for (const m of line) a.push(E.mFrom(m) | (E.mTo(m) << 8)); return a; };
  const N0 = E.Pos.from(start, V).n; document.documentElement.style.setProperty('--n', N0);
  $('#variant').textContent = VNAME[V] || V;

  // ------------------------------------------------------------------ the multi-thread engine
  const SLOT = 2 << 20;
  const HC = navigator.hardwareConcurrency || 4, MAXT = Math.max(1, Math.min(32, HC));
  const MT = { X: null, mem: null, module: null, base: 0, workers: [] };
  async function initMT() {
    MT.module = await WebAssembly.compileStreaming(fetch('../engine_mt.wasm' + VER));
    MT.mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });   // maximum = engine_mt.wasm's (1 GiB)
    const X = (await WebAssembly.instantiate(MT.module, { env: { memory: MT.mem, now: () => Date.now(), progress: () => {} } })).exports;
    MT.base = Math.ceil(X.mt_heap_base() / 65536) * 65536;
    const need = MT.base + (MAXT + 1) * SLOT;
    if (need > MT.mem.buffer.byteLength) MT.mem.grow(Math.ceil((need - MT.mem.buffer.byteLength) / 65536));
    X.mt_stack(MT.base + MAXT * SLOT + SLOT - 16); X.mt_thread(MT.base + MAXT * SLOT, 999);
    // the learned evaluation for Copenhagen (as the game page does)
    try {
      const res = await fetch('../nnue-copenhagen.bin.gz' + NETV);
      const buf = new Uint8Array(await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
      if (buf.length <= X.nn_buf_size()) {
        new Uint8Array(MT.mem.buffer, X.nn_buf(), buf.length).set(buf);
        if (X.nn_load(buf.length)) {
          const p = E.Pos.from(null, 'copenhagen'), a = [E.VID.copenhagen, p.turn === E.P2 ? 1 : 0]; for (let i = 0; i < p.b.length; i++) a.push(p.b[i]); a.push(0);
          new Int32Array(MT.mem.buffer, X.io_ptr(), 8192).set(a); X.setup(); X.new_game(); X.nn_center(-X.eval_root());
        }
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
        w.postMessage({ type: 'go', setup, time });
      });
    });
  }
  const stopMT = () => { if (MT.X) MT.X.mt_stop(1); };
  let FB = null;
  function goFB() {
    if (!FB) FB = new Worker('../engine.js?v=nn2sr-lv25');
    return new Promise(res => { FB.onmessage = e => { if (e.data.type === 'result') res(e.data); }; FB.postMessage({ type: 'think', id: 1, start, moves: line.slice(), level: 20, v: V }); });
  }

  // ------------------------------------------------------------------ board
  let flipped = false, sel = -1, lastMove = null, analysing = false, thinking = false, threaded = false;
  const board = $('#board');
  const PIMG = { 1: 'a', 2: 'd', 3: 'k' };
  function draw() {
    const p = cur(), n = p.n, F = p.G.F, legal = p.res ? [] : p.moves(), tg = new Set();
    if (sel >= 0) legal.forEach(m => { if (E.mFrom(m) === sel) tg.add(E.mTo(m)); });
    board.innerHTML = '';
    for (let rr = 0; rr < n; rr++) for (let cc = 0; cc < n; cc++) {
      const s = flipped ? (n - 1 - rr) * n + (n - 1 - cc) : rr * n + cc, x = p.b[s];
      const d = document.createElement('div');
      d.className = 'sq' + ((F[s] & 8) ? ' esc' : (F[s] & 4) ? ' thr' : '') + (s === sel ? ' sel' : '') + (tg.has(s) ? ' tgt' : '') + (lastMove && (lastMove[0] === s || lastMove[1] === s) ? ' last' : '');
      if (x) { const im = document.createElement('img'); im.src = '../img/pc-turned-' + PIMG[x] + '.webp'; im.alt = ''; d.appendChild(im); }
      if (rr === n - 1) { const c = document.createElement('span'); c.className = 'co f'; c.textContent = String.fromCharCode(97 + (s % n)); d.appendChild(c); }
      if (cc === 0) { const c = document.createElement('span'); c.className = 'co r'; c.textContent = String(n - Math.floor(s / n)); d.appendChild(c); }
      d.onclick = () => clickSq(s);
      board.appendChild(d);
    }
    const q = E.Pos.from(start, V), out = [];
    line.forEach((m, i) => { out.push((i + 1) + '. ' + E.name(q, m)); q.play(m); });
    $('#moves').textContent = out.join('  ') + (p.res ? '  — ' + tr('over') : '');
    $('#variant').textContent = (VNAME[V] || V) + ' ・ ' + tr('toMove') + ': ' + (p.turn === E.P1 ? tr('att') : tr('def'));
    $('#btnUndo').disabled = !line.length || thinking;
    $('#btnPlay').disabled = !legal.length || thinking;
  }
  async function clickSq(s) {
    if (thinking) return;
    const p = cur(); if (p.res) return;
    if (sel >= 0) { const m = p.moves().find(x => E.mFrom(x) === sel && E.mTo(x) === s); if (m !== undefined) { sel = -1; await playMove(m); draw(); return; } }
    const x = p.b[s], mine = p.turn === E.P1 ? x === 1 : x === 2 || x === 3;
    sel = mine && sel !== s ? s : -1; draw();
  }
  async function playMove(m) {
    const was = analysing; if (was) await stopAnalysis();
    line.push(m); lastMove = [E.mFrom(m), E.mTo(m)]; clearInfo();
    if (was) startAnalysis();
  }

  // ------------------------------------------------------------------ readout
  function fmt(r) {
    const p = cur(), dv = p.turn === E.P2 ? r.score : -r.score;   // defenders' view
    if (Math.abs(r.score) > E.WINT) { const n = E.WIN - Math.abs(r.score); return tr('wins', { s: dv > 0 ? tr('def') : tr('att'), n }); }
    return (dv >= 0 ? '+' : '−') + Math.abs(Math.round(dv));
  }
  function show(r) {
    const p = cur();
    $('#eval').textContent = fmt(r);
    $('#depth').textContent = String(r.depth);
    if (r.nps) $('#nps').textContent = Math.round(r.nps).toLocaleString();
    $('#pv').textContent = r.move >= 0 && p.moves().includes(r.move) ? tr('best') + ': ' + E.name(p, r.move) : '';
  }
  function clearInfo() { $('#eval').textContent = '—'; $('#depth').textContent = '—'; $('#pv').textContent = ''; }
  let anaRun = null;
  async function startAnalysis() {
    if (!threaded || analysing || cur().res) return;
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
    const p = cur(); if (p.res || !p.moves().length) return;
    thinking = true; draw(); $('#pv').textContent = tr('thinking');
    const ms = +$('#selTime').value || 5000;
    let m = null;
    if (threaded) {
      const N = MT.workers.length, t0 = performance.now();
      const r = await goMT(ms, x => show({ ...x, nps: x.nodes * N / Math.max(1, performance.now() - t0) * 1000 }));
      show({ ...r, nps: r.totalNodes / Math.max(1, r.ms) * 1000 }); m = r.move;
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
    window.__proReady = { threaded, threads: MT.workers.length };
  })();
})();
