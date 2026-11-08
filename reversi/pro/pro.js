// Reversi — strongest analysis: engine.js's search on several threads (engine_mt.wasm, Lazy SMP over a shared memory).
// The page is made cross-origin isolated by coi-sw.js (SharedArrayBuffer); without it, one thread (the normal engine).
(() => {
  'use strict';
  const VER = '?v=7';
  const LANG = (() => { try { return (localStorage.getItem('aicoding-lang') || 'ja') === 'ja' ? 'ja' : 'en'; } catch (e) { return 'ja'; } })();
  const T = {
    ja: { back: '← リバーシ', ttl: '最強解析', depth: '深さ', nps: '局面/秒', threads: 'スレッド', sel: 'スレッド数', ana: '解析', stop: '停止', play: 'AIに指させる',
      undo: '戻す', flip: '盤を反転', reset: '初期配置', auto: '自動', sec: '秒', black: '黒', white: '白', toMove: '手番', best: '最善手', exact: '（完全読み）', pass: 'パス',
      isoOk: '並列 {n} スレッド', isoNg: '1スレッド（このブラウザでは並列不可）', loading: '準備中…', thinking: '考え中…', over: '終局',
      note: 'このページだけは、複数のCPUコアで同時に読む設定（クロスオリジン分離）で動いています。そのためオンライン対局やログインは、元のリバーシのページで行ってください。評価値は黒から見た石差の予想です（完全読みのときは最終の石差）。' },
    en: { back: '← Reversi', ttl: 'Deep analysis', depth: 'Depth', nps: 'Nodes/s', threads: 'Threads', sel: 'Threads', ana: 'Analyse', stop: 'Stop', play: 'Engine move',
      undo: 'Undo', flip: 'Flip', reset: 'Reset', auto: 'Auto', sec: 's', black: 'Black', white: 'White', toMove: 'To move', best: 'Best move', exact: ' (solved)', pass: 'pass',
      isoOk: '{n} threads in parallel', isoNg: '1 thread (no parallel search in this browser)', loading: 'Loading…', thinking: 'Thinking…', over: 'Game over',
      note: 'Only this page runs in the mode that lets several CPU cores search together (cross-origin isolation), so play online and sign in on the main reversi page. Scores are the expected disc difference from Black\'s side (the final difference once solved).' },
  }[LANG];
  const tr = (k, v) => (T[k] || k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] !== undefined ? v[x] : '');
  const $ = s => document.querySelector(s);
  document.documentElement.lang = LANG;
  [['#back', 'back'], ['#ttl', 'ttl'], ['#lDepth', 'depth'], ['#lNps', 'nps'], ['#lThreads', 'threads'], ['#lSel', 'sel'], ['#btnAna', 'ana'], ['#btnPlay', 'play'],
    ['#btnUndo', 'undo'], ['#btnFlip', 'flip'], ['#btnReset', 'reset'], ['#note', 'note']].forEach(([s, k]) => { const el = $(s); if (el) el.textContent = tr(k); });
  document.title = 'Reversi — ' + tr('ttl');

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

  // ------------------------------------------------------------------ rules (cells: 0 empty, 1 black, 2 white; a1 = 0)
  const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const flipsOf = (c, s, me) => {
    if (c[s]) return [];
    const r0 = s >> 3, f0 = s & 7, op = 3 - me, out = [];
    for (const [dr, df] of DIRS) { let r = r0 + dr, f = f0 + df; const run = []; while (r >= 0 && r < 8 && f >= 0 && f < 8 && c[r * 8 + f] === op) { run.push(r * 8 + f); r += dr; f += df; } if (run.length && r >= 0 && r < 8 && f >= 0 && f < 8 && c[r * 8 + f] === me) out.push(...run); }
    return out;
  };
  const legal = (c, me) => { const L = []; for (let s = 0; s < 64; s++) if (flipsOf(c, s, me).length) L.push(s); return L; };
  const sqName = s => 'abcdefgh'[s & 7] + (1 + (s >> 3));
  // the start: the standard one, or ?pos=<64 chars 0/1/2>&tm=1|2 (a position from a lesson / puzzle / pasted game)
  const Q = new URLSearchParams(location.search);
  const START = /^[012]{64}$/.test(Q.get('pos') || '') ? { c: Q.get('pos').split('').map(Number), me: Q.get('tm') === '2' ? 2 : 1 } : null;
  function startCells() { if (START) return START.c.slice(); const c = new Array(64).fill(0); c[27] = 2; c[36] = 2; c[28] = 1; c[35] = 1; return c; }   // d4 white, e5 white, e4 black, d5 black
  // the position after `line` (moves; -1 = pass, kept implicit: a side with no move passes)
  function replay(line) {
    const c = startCells(); let me = START ? START.me : 1;
    for (const s of line) { if (!legal(c, me).length) me = 3 - me; const fl = flipsOf(c, s, me); c[s] = me; for (const q of fl) c[q] = me; me = 3 - me; }
    if (!legal(c, me).length && legal(c, 3 - me).length) me = 3 - me;
    return { c, me, over: !legal(c, 1).length && !legal(c, 2).length };
  }

  // ------------------------------------------------------------------ the multi-thread engine
  const SLOT = 2 << 20;
  const HC = navigator.hardwareConcurrency || 4, MAXT = Math.max(1, Math.min(32, HC));
  const MT = { X: null, mem: null, module: null, base: 0, workers: [], weights: null, ctl: null };
  const CFG = { depth: 60, exact: 22, wld: 24, mpc: 1 };   // like level 20, solving a little earlier (several threads)
  async function loadWeights() {
    const res = await fetch('../weights.bin.gz?v=4');
    const buf = await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const meta = await fetch('../weights.json').then(r => r.json()).catch(() => ({ nphase: 12 }));
    return { buffer: buf, nphase: meta.nphase };
  }
  async function initMT() {
    MT.module = await WebAssembly.compileStreaming(fetch('../engine_mt.wasm' + VER));
    MT.mem = new WebAssembly.Memory({ initial: 1024, maximum: 16384, shared: true });   // maximum = engine_mt.wasm's (1 GiB)
    const X = (await WebAssembly.instantiate(MT.module, { env: { memory: MT.mem, now: () => Date.now() } })).exports;
    MT.base = Math.ceil(X.mt_heap_base() / 65536) * 65536;
    const need = MT.base + (MAXT + 1) * SLOT;
    if (need > MT.mem.buffer.byteLength) MT.mem.grow(Math.ceil((need - MT.mem.buffer.byteLength) / 65536));
    X.mt_stack(MT.base + MAXT * SLOT + SLOT - 16); X.mt_thread(MT.base + MAXT * SLOT);
    X.init();
    MT.ctl = new Int32Array(new SharedArrayBuffer(512));   // [0]: 1 = stop; the root split of the endgame solve (engine.js rootSplit)
    MT.weights = await loadWeights();
    MT.X = X;
  }
  async function setThreads(n) {
    while (MT.workers.length > n) MT.workers.pop().terminate();
    while (MT.workers.length < n) {
      const id = MT.workers.length, w = new Worker('mt-worker.js' + VER);
      await new Promise((res, rej) => {
        w.onmessage = e => { if (e.data.type === 'mtready') res(); };
        w.onerror = rej;
        w.postMessage({ type: 'mtinit', module: MT.module, mem: MT.mem, tls: MT.base + id * SLOT, top: MT.base + id * SLOT + SLOT - 16, ctl: MT.ctl });
      });
      w.postMessage({ type: 'weights', buffer: MT.weights.buffer.slice(0), nphase: MT.weights.nphase });
      MT.workers.push(w);
    }
    $('#thr').textContent = String(n);
    if ($('#iso').classList.contains('ok')) $('#iso').textContent = tr('isoOk', { n });
  }
  let jid = 0;
  function goMT(time, onProgress) {
    const { c, me } = replay(line);
    return new Promise(resolve => {
      MT.X.mt_stop(0); Atomics.store(MT.ctl, 0, 0); let left = MT.workers.length, main = null, nodes = 0; const t0 = performance.now(), id = ++jid;
      MT.workers.forEach((w, i) => {
        w.onmessage = e => {
          const m = e.data; if (m.id !== id) return;
          if (m.type === 'progress') { if (i === 0) onProgress && onProgress(m); return; }
          if (m.type !== 'result') return;
          nodes += m.nodes || 0;
          if (i === 0) { main = m; Atomics.store(MT.ctl, 0, 1); MT.X.mt_stop(1); }   // thread 0 decides; the helpers stop
          if (--left === 0) resolve({ ...main, totalNodes: nodes, ms: performance.now() - t0, me });
        };
        w.postMessage({ type: 'think', id, cells: c, toMove: me, opts: { cfg: CFG, time: i === 0 ? time : 1e9, noBook: true, variety: false, rot: i } });   // helpers: another first move at the root (Lazy SMP diversity)
      });
    });
  }
  const stopMT = () => { if (MT.X) { Atomics.store(MT.ctl, 0, 1); MT.X.mt_stop(1); } };
  let FB = null;
  async function goFB(time) {
    if (!FB) { FB = new Worker('../engine.js?v=54'); const wt = await loadWeights(); FB.postMessage({ type: 'weights', buffer: wt.buffer, nphase: wt.nphase }); }
    const { c, me } = replay(line);
    return new Promise(res => { FB.onmessage = e => { if (e.data.type === 'result') res({ ...e.data, me }); }; FB.postMessage({ type: 'think', id: 1, cells: c, toMove: me, opts: { level: 20, time } }); });
  }

  // ------------------------------------------------------------------ board
  let line = [], flipped = false, analysing = false, thinking = false, threaded = false;
  if (Q.get('moves')) { for (const x of Q.get('moves').split(/[ ,]+/)) { const s = +x; const r = replay(line); if (r.over || !legal(r.c, r.me).includes(s)) break; line.push(s); } }
  const board = $('#board');
  function draw() {
    const { c, me, over } = replay(line), L = over ? [] : legal(c, me), last = line[line.length - 1];
    board.innerHTML = '';
    for (let rr = 0; rr < 8; rr++) for (let ff = 0; ff < 8; ff++) {
      const r = flipped ? 7 - rr : rr, f = flipped ? 7 - ff : ff, s = r * 8 + f;   // row 1 at the top (as the game page)
      const d = document.createElement('div');
      d.className = 'sq' + (L.includes(s) ? ' tgt' : '') + (s === last ? ' last' : '');
      if (c[s]) { const k = document.createElement('div'); k.className = 'disc ' + (c[s] === 1 ? 'b' : 'w'); d.appendChild(k); }
      if (rr === 7) { const t = document.createElement('span'); t.className = 'co f'; t.textContent = 'abcdefgh'[f]; d.appendChild(t); }
      if (ff === 0) { const t = document.createElement('span'); t.className = 'co r'; t.textContent = String(r + 1); d.appendChild(t); }
      d.onclick = () => clickSq(s);
      board.appendChild(d);
    }
    const b = c.filter(x => x === 1).length, w = c.filter(x => x === 2).length;
    $('#count').textContent = tr('black') + ' ' + b + ' − ' + w + ' ' + tr('white') + ' ・ ' + (over ? tr('over') : tr('toMove') + ': ' + (me === 1 ? tr('black') : tr('white')));
    $('#moves').textContent = line.map((s, i) => (i + 1) + '.' + sqName(s)).join(' ');
    $('#btnUndo').disabled = !line.length || thinking;
    $('#btnPlay').disabled = over || thinking;
  }
  async function clickSq(s) {
    if (thinking) return;
    const { c, me, over } = replay(line); if (over || !legal(c, me).includes(s)) return;
    const was = analysing; if (was) await stopAnalysis();
    line.push(s); clearInfo(); draw();
    if (was) startAnalysis();
  }
  function show(r, me) {
    const sc = typeof r.score === 'number' ? r.score : 0, b = me === 1 ? sc : -sc;
    $('#eval').textContent = (b >= 0 ? '+' : '−') + Math.abs(b).toFixed(r.exact ? 0 : 1) + (r.exact ? tr('exact') : '');
    $('#depth').textContent = String(r.depth ?? '—');
    if (r.nps) $('#nps').textContent = Math.round(r.nps).toLocaleString();
    if (r.move >= 0) $('#pv').textContent = tr('best') + ': ' + sqName(r.move);
  }
  function clearInfo() { $('#eval').textContent = '—'; $('#depth').textContent = '—'; $('#pv').textContent = ''; }
  let anaRun = null;
  async function startAnalysis() {
    if (!threaded || analysing || replay(line).over) return;
    analysing = true; $('#btnAna').textContent = tr('stop');
    const me = replay(line).me;
    anaRun = goMT(1e9, m => show(m, me));
    const r = await anaRun; anaRun = null; analysing = false; $('#btnAna').textContent = tr('ana');
    if (r) show({ ...r, nps: r.totalNodes / Math.max(1, r.ms) * 1000 }, me);
  }
  async function stopAnalysis() { if (!analysing) return; stopMT(); if (anaRun) await anaRun; }
  async function enginePlay() {
    if (thinking) return;
    const was = analysing; if (was) await stopAnalysis();
    const st = replay(line); if (st.over) return;
    thinking = true; draw(); $('#pv').textContent = tr('thinking');
    const ms = +$('#selTime').value || 5000;
    const r = threaded ? await goMT(ms, m => show(m, st.me)) : await goFB(ms);
    thinking = false;
    if (r && r.move >= 0 && legal(st.c, st.me).includes(r.move)) { show({ ...r, nps: r.totalNodes ? r.totalNodes / Math.max(1, r.ms) * 1000 : 0 }, st.me); line.push(r.move); }
    draw();
    if (was) startAnalysis();
  }

  [[1000, '1'], [3000, '3'], [5000, '5'], [10000, '10'], [30000, '30']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l + ' ' + tr('sec'); if (v === 5000) o.selected = true; $('#selTime').appendChild(o); });
  const AUTO = Math.max(1, HC - 1), thrOpts = [...new Set([AUTO, 1, 2, 4, 6, 8, 12, 16, HC].filter(n => n >= 1 && n <= MAXT))].sort((a, b) => a - b);
  thrOpts.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n === AUTO ? n + '（' + tr('auto') + '）' : String(n); if (n === AUTO) o.selected = true; $('#selThr').appendChild(o); });
  $('#selThr').onchange = async () => { if (!threaded) return; const was = analysing; await stopAnalysis(); await setThreads(+$('#selThr').value); if (was) startAnalysis(); };
  $('#btnAna').onclick = () => analysing ? stopAnalysis() : startAnalysis();
  $('#btnPlay').onclick = enginePlay;
  $('#btnUndo').onclick = async () => { const was = analysing; await stopAnalysis(); line.pop(); clearInfo(); draw(); if (was) startAnalysis(); };
  $('#btnFlip').onclick = () => { flipped = !flipped; draw(); };
  $('#btnReset').onclick = async () => { const was = analysing; await stopAnalysis(); line = []; clearInfo(); draw(); if (was) startAnalysis(); };

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
