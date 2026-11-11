// Shogi — strongest analysis: the NNUE engine on several threads (engine_mt.wasm, Lazy SMP over a shared memory).
// The page is made cross-origin isolated by coi-sw.js (SharedArrayBuffer); without it, one thread (the normal engine).
(() => {
  'use strict';
  const S = window.ShogiEngine;
  const VER = '?v=7';
  const LANG = (() => { try { return (localStorage.getItem('aicoding-lang') || 'ja') === 'ja' ? 'ja' : 'en'; } catch (e) { return 'ja'; } })();
  const T = {
    ja: { game: '将棋', back: '← 将棋', ttl: '最強解析', depth: '深さ', nps: '局面/秒', threads: 'スレッド', sel: 'スレッド数', ana: '解析', stop: '停止', play: 'AIに指させる',
      undo: '戻す', flip: '盤を反転', reset: '平手', loadFen: 'SFENを読み込む', copyFen: 'SFENをコピー', auto: '自動', sec: '秒', hand0: '先手', hand1: '後手',
      isoOk: '並列 {n} スレッド', isoNg: '1スレッド（このブラウザでは並列不可）', loading: '準備中…', mateIn: '{n}手詰', badFen: 'SFENが読めません',
      copied: 'コピーしました', thinking: '考え中…', yes: '成る', no: '成らない',
      note: 'このページだけは、複数のCPUコアで同時に読む設定（クロスオリジン分離）で動いています。そのためオンライン対局やログインは、元の将棋のページで行ってください。スレッドを増やすほど深く読めますが、端末が熱くなりやすくなります。評価値は先手から見た値です。' },
    en: { game: 'Shogi', back: '← Shogi', ttl: 'Deep analysis', depth: 'Depth', nps: 'Nodes/s', threads: 'Threads', sel: 'Threads', ana: 'Analyse', stop: 'Stop', play: 'Engine move',
      undo: 'Undo', flip: 'Flip', reset: 'Reset', loadFen: 'Load SFEN', copyFen: 'Copy SFEN', auto: 'Auto', sec: 's', hand0: 'Sente', hand1: 'Gote',
      isoOk: '{n} threads in parallel', isoNg: '1 thread (no parallel search in this browser)', loading: 'Loading…', mateIn: 'Mate in {n}', badFen: 'Cannot read this SFEN',
      copied: 'Copied', thinking: 'Thinking…', yes: 'Promote', no: 'Do not promote',
      note: 'Only this page runs in the mode that lets several CPU cores search together (cross-origin isolation), so play online and sign in on the main shogi page. More threads search deeper but make the device run hotter. Scores are from Sente\'s side.' },
  }[LANG];
  const tr = (k, v) => (T[k] || k).replace(/\{(\w+)\}/g, (_, x) => v && v[x] !== undefined ? v[x] : '');
  const $ = s => document.querySelector(s);
  document.documentElement.lang = LANG;
  const setText = (sel, k) => { const el = $(sel); if (el) el.textContent = tr(k); };
  [['#gname', 'game'], ['#back', 'back'], ['#ttl', 'ttl'], ['#lDepth', 'depth'], ['#lNps', 'nps'], ['#lThreads', 'threads'], ['#lSel', 'sel'], ['#btnAna', 'ana'], ['#btnPlay', 'play'],
    ['#btnUndo', 'undo'], ['#btnFlip', 'flip'], ['#btnReset', 'reset'], ['#btnFen', 'loadFen'], ['#btnCopy', 'copyFen'], ['#note', 'note'], ['#pYes', 'yes'], ['#pNo', 'no']].forEach(a => setText(...a));
  document.title = tr('game') + ' — ' + tr('ttl');

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

  // ------------------------------------------------------------------ the multi-thread engine
  const SLOT = 8 << 20;   // per thread: TLS block (move buffers, accumulators) + stack
  const HC = navigator.hardwareConcurrency || 4, MAXT = Math.max(1, Math.min(32, HC));
  const MT = { X: null, mem: null, module: null, base: 0, workers: [] };
  const gunzip = async url => { const res = await fetch(url); return new Uint8Array(await new Response(res.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); };
  async function initMT() {
    MT.module = await WebAssembly.compileStreaming(fetch('../engine_mt.wasm' + VER));
    MT.mem = new WebAssembly.Memory({ initial: 1536, maximum: 16384, shared: true });   // maximum = engine_mt.wasm's (1 GiB)
    const X = (await WebAssembly.instantiate(MT.module, { env: { memory: MT.mem, now: () => Date.now(), progress: () => {}, aprogress: () => {} } })).exports;
    MT.base = Math.ceil(X.mt_heap_base() / 65536) * 65536;
    const need = MT.base + (MAXT + 1) * SLOT;
    if (need > MT.mem.buffer.byteLength) MT.mem.grow(Math.ceil((need - MT.mem.buffer.byteLength) / 65536));
    X.mt_stack(MT.base + MAXT * SLOT + SLOT - 16); X.mt_thread(MT.base + MAXT * SLOT, 999);
    X.init();
    const w = await gunzip('../weights.bin.gz?v=20261018ol');
    if (w.byteLength === S.NFEAT * 2) new Int16Array(MT.mem.buffer, X.weights_ptr(), S.NFEAT).set(new Int16Array(w.buffer, w.byteOffset, S.NFEAT));
    const buf = await gunzip('../nnue.bin.gz' + VER), dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    if (dv.getUint32(0, true) !== 0x5145554E) throw new Error('nnue');
    const H = dv.getInt32(4, true), NIN = dv.getInt32(8, true), b = buf.buffer; let o = buf.byteOffset + 12;
    if (X.nue_h() !== H) throw new Error('nnue H ' + H);
    new Int16Array(MT.mem.buffer, X.nue_w1_ptr(), NIN * H).set(new Int16Array(b.slice(o, o + NIN * H * 2))); o += NIN * H * 2;
    new Int32Array(MT.mem.buffer, X.nue_b1_ptr(), H).set(new Int32Array(b.slice(o, o + H * 4))); o += H * 4;
    new Int16Array(MT.mem.buffer, X.nue_w2_ptr(), 2 * H).set(new Int16Array(b.slice(o, o + H * 4))); o += H * 4;
    X.nue_set_b2(dv.getInt32(o - buf.byteOffset, true)); X.nue_enable(1); X.tt_clear();
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
    const p = new S.Position(); p.setSfen(startSfen);
    const board = Array.from(p.board), hand = Array.from(p.hand), side = p.side, moves = [];
    for (const u of line) { const m = p.fromUsi(u); moves.push(m); p.doMove(m); }
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
        w.postMessage({ type: 'go', board, hand, side, moves, time });
      });
    });
  }
  const stopMT = () => { if (MT.X) MT.X.mt_stop(1); };
  // single-thread fallback: the normal shogi worker
  let FB = null;
  function goFB(ms) {
    if (!FB) {
      FB = new Worker('../engine.js?v=20261109s4');
      gunzip('../weights.bin.gz?v=20261018ol').then(w => FB.postMessage({ type: 'weights', buffer: w.buffer.slice(w.byteOffset, w.byteOffset + w.byteLength) })).catch(() => {});
    }
    return new Promise(res => { FB.onmessage = e => { if (e.data.type === 'result') res(e.data); }; FB.postMessage({ type: 'think', id: 1, sfen: startSfen, moves: line.slice(), opts: { time: ms } }); });
  }

  // ------------------------------------------------------------------ game state and board
  const START = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
  let startSfen = START, line = [], flipped = false, sel = null, lastTo = -1, analysing = false, thinking = false, threaded = false;
  const params = new URLSearchParams(location.search);
  if (params.get('sfen')) { try { const p = new S.Position(); p.setSfen(params.get('sfen')); startSfen = params.get('sfen'); } catch (e) {} }
  if (params.get('moves')) { const p = new S.Position(); p.setSfen(startSfen); for (const u of params.get('moves').split(/[ ,]+/)) { let m; try { m = p.fromUsi(u); } catch (e) { break; } if (!m || !p.legalMoves().includes(m)) break; line.push(u); p.doMove(m); } }
  const cur = () => { const p = new S.Position(); p.setSfen(startSfen); for (const u of line) p.doMove(p.fromUsi(u)); p.sp = 0; return p; };
  const CODE = ['', 'FU', 'KY', 'KE', 'GI', 'KA', 'HI', 'KI', 'OU', 'TO', 'NY', 'NK', 'NG', 'UM', 'RY'];
  const NAME = ['', '歩', '香', '桂', '銀', '角', '飛', '金', '玉', 'と', '成香', '成桂', '成銀', '馬', '龍'];
  const img = (tp, col, flip) => { const up = (col === 1) !== flip; return '../pieces/orangain/' + (up ? '1' : '0') + (tp === S.OU ? (col ? 'OU' : 'GY') : CODE[tp]) + '.svg'; };
  const ZEN = '０１２３４５６７８９', KAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  function kif(p, m, prevTo) {
    const to = S.mTo(m), dest = to === prevTo ? '同　' : ZEN[S.sqFile(to)] + KAN[S.sqRank(to)];
    if (S.isDrop(m)) return dest + NAME[S.dropType(m)] + '打';
    return dest + NAME[S.typeOf(p.board[S.mFrom(m)])] + (S.mPromo(m) ? '成' : '');
  }
  function kifLine(p0, ms) { const p = p0.clone ? p0.clone() : cur(); let prev = lastTo; const out = []; for (const m of ms) { if (!m) break; out.push((p.side ? '△' : '▲') + kif(p, m, prev)); prev = S.mTo(m); p.doMove(m); p.sp = 0; } return out.join(' '); }
  const board = $('#board');
  function draw() {
    const p = cur(), legal = p.legalMoves(), tg = new Set();
    if (sel) legal.forEach(m => { if (sel.drop ? S.isDrop(m) && S.dropType(m) === sel.drop : !S.isDrop(m) && S.mFrom(m) === sel.sq) tg.add(S.mTo(m)); });
    board.innerHTML = '';
    for (let rr = 0; rr < 9; rr++) for (let cc = 0; cc < 9; cc++) {
      const s = flipped ? 80 - (rr * 9 + cc) : rr * 9 + cc, pc = p.board[s];
      const d = document.createElement('div');
      d.className = 'sq' + (sel && !sel.drop && sel.sq === s ? ' sel' : '') + (tg.has(s) ? ' tgt' : '') + (s === lastTo ? ' last' : '');
      if (pc) { const im = document.createElement('img'); im.src = img(S.typeOf(pc), S.colorOf(pc), flipped); im.alt = ''; d.appendChild(im); }
      d.onclick = () => clickSq(s);
      board.appendChild(d);
    }
    $('#files').innerHTML = Array.from({ length: 9 }, (_, i) => '<span>' + (flipped ? i + 1 : 9 - i) + '</span>').join('');
    $('#ranks').innerHTML = Array.from({ length: 9 }, (_, i) => '<span>' + KAN[flipped ? 9 - i : i + 1] + '</span>').join('');
    for (const col of [0, 1]) {
      const el = $('#hand' + ((col === 1) !== flipped ? 1 : 0)); el.innerHTML = '<span class="lbl">' + (col ? '☖' : '☗') + tr('hand' + col) + '</span>';
      for (let t = 7; t >= 1; t--) {
        const n = p.hand[col * 8 + t]; if (!n) continue;
        const h = document.createElement('div'); h.className = 'hp' + (sel && sel.drop === t && p.side === col ? ' sel' : '');
        h.innerHTML = '<img src="' + img(t, col, flipped) + '" alt="">' + (n > 1 ? '<span class="n">' + n + '</span>' : '');
        h.onclick = () => { if (thinking || p.side !== col) return; sel = sel && sel.drop === t ? null : { drop: t }; draw(); };
        el.appendChild(h);
      }
    }
    const q = new S.Position(); q.setSfen(startSfen); let prev = -1; const out = [];
    line.forEach((u, i) => { const m = q.fromUsi(u); out.push((i + 1) + (q.side ? '△' : '▲') + kif(q, m, prev)); prev = S.mTo(m); q.doMove(m); q.sp = 0; });
    $('#moves').textContent = out.join(' ');
    $('#fen').value = p.sfen();
    $('#btnUndo').disabled = !line.length || thinking;
    $('#btnPlay').disabled = !legal.length || thinking;
  }
  function askPromo() { return new Promise(res => { const d = $('#promo'); $('#pYes').onclick = () => { d.close(); res(true); }; $('#pNo').onclick = () => { d.close(); res(false); }; d.showModal(); }); }
  async function clickSq(s) {
    if (thinking) return;
    const p = cur(), legal = p.legalMoves();
    if (sel) {
      const ms = legal.filter(m => S.mTo(m) === s && (sel.drop ? S.isDrop(m) && S.dropType(m) === sel.drop : !S.isDrop(m) && S.mFrom(m) === sel.sq));
      if (ms.length) {
        let m = ms[0];
        if (ms.length > 1) { const pr = await askPromo(); m = ms.find(x => !!S.mPromo(x) === pr) || ms[0]; }
        sel = null; await playUsi(p.toUsi(m)); draw(); return;
      }
    }
    const pc = p.board[s];
    sel = pc && S.colorOf(pc) === p.side && !(sel && !sel.drop && sel.sq === s) ? { sq: s } : null; draw();
  }
  async function playUsi(u) {
    const wasAna = analysing; if (wasAna) await stopAnalysis();
    const p = cur(), m = p.fromUsi(u); line.push(u); lastTo = S.mTo(m); clearInfo();
    if (wasAna) startAnalysis();
  }

  // ------------------------------------------------------------------ analysis readout
  const MATE = 30000;
  function fmtScore(s, side) {
    const b = side === 0 ? s : -s;   // Sente's view
    if (Math.abs(s) > MATE - 200) { const n = Math.round(MATE - Math.abs(s)); return (b > 0 ? '▲' : '△') + tr('mateIn', { n }); }
    return (b >= 0 ? '+' : '−') + Math.round(Math.abs(b));
  }
  function show(r) {
    const p = cur();
    $('#eval').textContent = fmtScore(r.score, p.side);
    $('#depth').textContent = String(r.depth);
    if (r.nps) $('#nps').textContent = Math.round(r.nps).toLocaleString();
    $('#pv').textContent = kifLine(p, r.pv || []);
  }
  function clearInfo() { $('#eval').textContent = '—'; $('#depth').textContent = '—'; $('#pv').textContent = ''; }

  let anaRun = null;
  async function startAnalysis() {
    if (!threaded || analysing) return;
    analysing = true; $('#btnAna').textContent = tr('stop');
    const t0 = performance.now(), N = MT.workers.length;
    anaRun = goMT(0, m => show({ ...m, nps: m.nodes * N / Math.max(1, performance.now() - t0) * 1000 }));
    const r = await anaRun; anaRun = null; analysing = false; $('#btnAna').textContent = tr('ana');
    if (r) show({ ...r, nps: r.totalNodes / Math.max(1, r.ms) * 1000 });
  }
  async function stopAnalysis() { if (!analysing) return; stopMT(); if (anaRun) await anaRun; }
  async function enginePlay() {
    if (thinking) return;
    const wasAna = analysing; if (wasAna) await stopAnalysis();
    const p = cur(); if (!p.legalMoves().length) return;
    thinking = true; draw(); $('#pv').textContent = tr('thinking');
    const ms = +$('#selTime').value || 5000;
    let u = null, rest = null;
    if (threaded) {
      const N = MT.workers.length, t0 = performance.now();
      const r = await goMT(ms, m => show({ ...m, nps: m.nodes * N / Math.max(1, performance.now() - t0) * 1000 }));
      show({ ...r, nps: r.totalNodes / Math.max(1, r.ms) * 1000 });
      u = r.move ? p.toUsi(r.move) : null; rest = (r.pv || []).slice(1);
    } else {
      const r = await goFB(ms); u = r && r.move;
    }
    thinking = false;
    if (u) { const m = p.fromUsi(u); line.push(u); lastTo = S.mTo(m); }
    draw();
    $('#pv').textContent = rest ? kifLine(cur(), rest) : '';
    if (wasAna) startAnalysis();
  }

  // ------------------------------------------------------------------ controls
  [[1000, '1'], [3000, '3'], [5000, '5'], [10000, '10'], [30000, '30']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l + ' ' + tr('sec'); if (v === 5000) o.selected = true; $('#selTime').appendChild(o); });
  // (AUTO: the performance cores at most — shared/mtengine.js perfThreads, 2026-11-09)
  const AUTO = window.MTEngine && MTEngine.perfThreads ? Math.max(1, Math.min(HC - 1, MTEngine.perfThreads())) : Math.max(1, HC - 1), thrOpts = [...new Set([AUTO, 1, 2, 4, 6, 8, 12, 16, HC].filter(n => n >= 1 && n <= MAXT))].sort((a, b) => a - b);
  thrOpts.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n === AUTO ? n + '（' + tr('auto') + '）' : String(n); if (n === AUTO) o.selected = true; $('#selThr').appendChild(o); });
  $('#selThr').onchange = async () => { if (!threaded) return; const was = analysing; await stopAnalysis(); await setThreads(+$('#selThr').value); if (was) startAnalysis(); };
  $('#btnAna').onclick = () => analysing ? stopAnalysis() : startAnalysis();
  $('#btnPlay').onclick = enginePlay;
  $('#btnUndo').onclick = async () => { const was = analysing; await stopAnalysis(); line.pop(); lastTo = -1; sel = null; clearInfo(); draw(); if (was) startAnalysis(); };
  $('#btnFlip').onclick = () => { flipped = !flipped; draw(); };
  $('#btnReset').onclick = async () => { const was = analysing; await stopAnalysis(); startSfen = START; line = []; lastTo = -1; sel = null; clearInfo(); draw(); if (was) startAnalysis(); };
  $('#btnFen').onclick = async () => {
    const f = $('#fen').value.trim().replace(/^sfen\s+/, ''); let ok = false;
    try { const p = new S.Position(); p.setSfen(f); ok = p.board.some(x => x); } catch (e) {}
    if (!ok) { $('#pv').textContent = tr('badFen'); return; }
    const was = analysing; await stopAnalysis(); startSfen = f; line = []; lastTo = -1; sel = null; clearInfo(); draw(); if (was) startAnalysis();
  };
  $('#btnCopy').onclick = () => { try { navigator.clipboard.writeText(cur().sfen()); $('#pv').textContent = tr('copied'); } catch (e) {} };

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
