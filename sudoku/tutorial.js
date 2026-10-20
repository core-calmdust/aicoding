/* まいにち数独 / すぴーど数独 — step-by-step rule tutorial with the mascot すうぴょん.
   Each step: the mascot says a line, a small stage shows a board or a picture, and some steps give a little task
   ("👉 …") that has to be solved before going on. open('daily' | 'speed', core). */
(function () {
'use strict';
let C = null, kind = 'daily', step = 0, steps = [], doneStep = {}, autoT = 0;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const t = (k, p) => C.t(k, p);

/* ---------- mascot ---------- */
function mascot(pose, speed) {
  const eyes = pose === 'happy' || pose === 'yay' ? '<path d="M38 50q4-5 8 0M54 50q4-5 8 0" stroke="#43385a" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    : pose === 'wow' ? '<circle cx="42" cy="50" r="4.4" fill="#43385a"/><circle cx="58" cy="50" r="4.4" fill="#43385a"/><circle cx="43.6" cy="48.4" r="1.6" fill="#fff"/><circle cx="59.6" cy="48.4" r="1.6" fill="#fff"/>'
    : pose === 'think' ? '<circle cx="42" cy="50" r="3.4" fill="#43385a"/><path d="M54 50q4-4 8 0" stroke="#43385a" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="43.2" cy="48.8" r="1.2" fill="#fff"/>'
    : '<circle cx="42" cy="50" r="3.6" fill="#43385a"/><circle cx="58" cy="50" r="3.6" fill="#43385a"/><circle cx="43.3" cy="48.6" r="1.3" fill="#fff"/><circle cx="59.3" cy="48.6" r="1.3" fill="#fff"/>';
  const mouth = pose === 'wow' ? '<ellipse cx="50" cy="60" rx="3" ry="3.6" fill="#43385a"/>' : pose === 'yay' ? '<path d="M45 57q5 7 10 0z" fill="#43385a"/><path d="M47.5 60q2.5 2 5 0" fill="#ff7d95"/>' : '<path d="M46 58q2 2.4 4 0q2 2.4 4 0" stroke="#43385a" stroke-width="2" fill="none" stroke-linecap="round"/>';
  const armR = pose === 'wave' || pose === 'yay' ? '<g class="tmwave"><ellipse cx="78" cy="58" rx="6" ry="9" fill="#fff" stroke="#e6d6e8" stroke-width="2" transform="rotate(-35 78 58)"/></g>' : '<ellipse cx="76" cy="74" rx="6" ry="8" fill="#fff" stroke="#e6d6e8" stroke-width="2" transform="rotate(20 76 74)"/>';
  const armL = pose === 'yay' ? '<ellipse cx="22" cy="58" rx="6" ry="9" fill="#fff" stroke="#e6d6e8" stroke-width="2" transform="rotate(35 22 58)"/>' : pose === 'think' ? '<ellipse cx="34" cy="66" rx="6" ry="7" fill="#fff" stroke="#e6d6e8" stroke-width="2"/>' : '<ellipse cx="24" cy="74" rx="6" ry="8" fill="#fff" stroke="#e6d6e8" stroke-width="2" transform="rotate(-20 24 74)"/>';
  const band = speed ? '<path d="M27 38q23-12 46 0l-1 7q-22-11-44 0z" fill="#ff7a3d"/><path d="M71 39l9-4-2 8z" fill="#ff7a3d"/><path d="M50 30.5l-3 5h2.6l-1 4.5 4-6h-2.6l1.2-3.5z" fill="#ffe08a"/>' : '<path d="M62 22l6 4-6 4-1-4z" fill="#ff8fb6"/><circle cx="62" cy="26" r="2.2" fill="#ffb3cf"/>';
  return `<svg viewBox="0 0 100 100" class="tmas ${pose}"><ellipse cx="50" cy="96" rx="22" ry="3.5" fill="#000" opacity=".1"/>
    <g class="tmears"><ellipse cx="38" cy="18" rx="7.5" ry="17" fill="#fff" stroke="#e6d6e8" stroke-width="2" transform="rotate(-12 38 18)"/><ellipse cx="38" cy="19" rx="3.6" ry="11" fill="#ffc2d4" transform="rotate(-12 38 19)"/><ellipse cx="62" cy="18" rx="7.5" ry="17" fill="#fff" stroke="#e6d6e8" stroke-width="2" transform="rotate(12 62 18)"/><ellipse cx="62" cy="19" rx="3.6" ry="11" fill="#ffc2d4" transform="rotate(12 62 19)"/></g>
    ${armL}<ellipse cx="50" cy="66" rx="28" ry="27" fill="#fff" stroke="#e6d6e8" stroke-width="2"/>${armR}
    <ellipse cx="50" cy="80" rx="14" ry="9" fill="#fff4f8"/><rect x="42" y="74" width="16" height="12" rx="3" fill="#fff" stroke="#ffc2d4" stroke-width="1.6"/><path d="M47.3 74v12M52.7 74v12M42 78h16M42 82h16" stroke="#ffc2d4" stroke-width="1"/>
    ${band}${eyes}<ellipse cx="34" cy="57" rx="5" ry="3" fill="#ff9fb8" opacity=".55"/><ellipse cx="66" cy="57" rx="5" ry="3" fill="#ff9fb8" opacity=".55"/>${mouth}</svg>`;
}

/* ---------- boards ---------- */
const SOL9 = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'.split('').map(Number);
const SOL4 = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
const row9 = i => (i / 9) | 0, col9 = i => i % 9, box9 = i => ((row9(i) / 3) | 0) * 3 + ((col9(i) / 3) | 0);
const unit9 = (k, n) => [...Array(81).keys()].filter(i => (k === 'r' ? row9(i) : k === 'c' ? col9(i) : box9(i)) === n);
/* a small board that the player fills from a key pad; resolves when every blank is right */
function miniBoard(host, o) {
  const N = o.n, sol = o.sol, given = o.given.slice(), grid = o.given.slice();
  let sel = o.blanks[0];
  const hl = new Set(o.hl || []), hl2 = new Set(o.hl2 || []);
  const draw = () => {
    let h = `<div class="tbd n${N}" style="--n:${N}">`;
    for (let i = 0; i < N * N; i++) {
      const r = (i / N) | 0, c = i % N, b = N === 9 ? 3 : 2;
      const cls = ['tc', grid[i] ? (given[i] ? 'g' : 'u') : '', hl.has(i) ? 'h' : '', hl2.has(i) ? 'h2' : '', i === sel && !o.done ? 's' : '', o.blanks.includes(i) && !grid[i] ? 'b' : '',
        c % b === b - 1 && c < N - 1 ? 'br' : '', r % b === b - 1 && r < N - 1 ? 'bb' : ''].join(' ');
      h += `<span class="${cls}" data-i="${i}">${grid[i] || (o.blanks.includes(i) && !o.done ? '?' : '')}</span>`;
    }
    h += '</div>';
    if (!o.done) h += `<div class="tpad n${N}">${[...Array(N).keys()].map(k => `<button data-d="${k + 1}">${k + 1}</button>`).join('')}</div>`;
    host.innerHTML = h;
    host.querySelectorAll('.tc.b').forEach(el => el.addEventListener('pointerdown', e => flickStart(e, +el.dataset.i)));
    host.querySelectorAll('.tpad button').forEach(b => b.onclick = () => put(+b.dataset.d));
  };
  const put = d => {
    if (sel < 0 || grid[sel]) return;
    if (d === sol[sel]) {
      grid[sel] = d; C.SFX.place();
      const left = o.blanks.filter(i => !grid[i]);
      if (!left.length) { o.done = true; draw(); host.querySelector('.tbd').classList.add('win'); o.onDone && o.onDone(); return; }
      sel = left[0]; draw();
      const el = host.querySelector(`[data-i="${o.blanks[o.blanks.indexOf(sel) - 1] ?? sel}"]`); if (el) el.classList.add('pop');
    } else {
      C.SFX.err(); C.vib([20, 30, 20]);
      const el = host.querySelector(`[data-i="${sel}"]`); if (el) { el.textContent = d; el.classList.add('no'); setTimeout(() => { el.classList.remove('no'); el.textContent = '?'; }, 420); }
      o.onMiss && o.onMiss();
    }
  };
  // flick: hold a blank cell and swipe toward the number (4×4: ↖1 ↗2 ↙3 ↘4, 9×9: the 3×3 key layout)
  const POS = N === 4 ? { 1: [-1, -1], 2: [1, -1], 3: [-1, 1], 4: [1, 1] } : { 1: [-1, -1], 2: [0, -1], 3: [1, -1], 4: [-1, 0], 5: [0, 0], 6: [1, 0], 7: [-1, 1], 8: [0, 1], 9: [1, 1] };
  const dirOf = (dx, dy, long) => {
    if (Math.hypot(dx, dy) < 14) return N === 9 && long ? 5 : 0;
    if (N === 4) return dy < 0 ? (dx < 0 ? 1 : 2) : (dx < 0 ? 3 : 4);
    const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    return { 0: 6, 1: 9, 2: 8, 3: 7, 4: 4, '-4': 4, '-1': 3, '-2': 2, '-3': 1 }[a];
  };
  let fl = null;
  const F = () => { let el = document.getElementById('tuFlick'); if (!el) { el = document.createElement('div'); el.id = 'tuFlick'; el.className = 'flick sflick tflick'; document.body.appendChild(el); } return el; };
  const show = () => {
    if (!fl || fl.shown) return; fl.shown = true;
    const r = host.querySelector(`[data-i="${fl.i}"]`).getBoundingClientRect(), gap = N === 4 ? 46 : 52;
    const el = F(); el.innerHTML = Object.entries(POS).map(([d, [x, y]]) => `<i data-d="${d}" style="left:${90 + x * gap}px;top:${90 + y * gap}px">${d}</i>`).join('');
    el.style.left = Math.max(90, Math.min(innerWidth - 90, r.left + r.width / 2)) + 'px'; el.style.top = Math.max(90, Math.min(innerHeight - 90, r.top + r.height / 2)) + 'px'; el.classList.add('on'); C.vib(5);
  };
  const hide = () => { const el = document.getElementById('tuFlick'); if (el) el.classList.remove('on'); if (fl) clearTimeout(fl.t); fl = null; };
  function flickStart(e, i) {
    if (o.done) return;
    e.preventDefault(); sel = i; C.SFX.tap(); draw();
    fl = { i, x: e.clientX, y: e.clientY, id: e.pointerId, shown: false, d: 0, long: false };
    fl.t = setTimeout(() => { if (fl && !fl.shown) { fl.long = true; show(); } }, 320);
    const mv = ev => { if (!fl || ev.pointerId !== fl.id) return; const dx = ev.clientX - fl.x, dy = ev.clientY - fl.y; if (!fl.shown && Math.hypot(dx, dy) > 12) { clearTimeout(fl.t); show(); } if (fl.shown) { const d = dirOf(dx, dy, fl.long); if (d !== fl.d) { fl.d = d; document.querySelectorAll('#tuFlick i').forEach(x => x.classList.toggle('on', +x.dataset.d === d)); } } };
    const up = ev => { if (!fl || ev.pointerId !== fl.id) return; removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); const f = fl; hide(); if (f.shown && f.d) put(f.d); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  }
  const move = k => { if (o.done) return; const left = o.blanks.filter(i => !grid[i]); if (left.length < 2) return; sel = left[(left.indexOf(sel) + k + left.length) % left.length]; C.SFX.tap(); draw(); };
  draw();
  board = { put: d => { if (!o.done && d >= 1 && d <= N) { const b = host.querySelector(`.tpad button[data-d="${d}"]`); if (b) { b.classList.add('press'); setTimeout(() => b.classList.remove('press'), 110); } put(d); } }, move };
  return board;
}
let board = null;
/* static pictures for the explanation steps */
const IMG = {
  flick: () => { const pos = { 1: [-1, -1], 2: [0, -1], 3: [1, -1], 4: [-1, 0], 5: [0, 0], 6: [1, 0], 7: [-1, 1], 8: [0, 1], 9: [1, 1] }; return `<svg viewBox="0 0 120 120" class="tpic sq"><rect x="38" y="38" width="44" height="44" rx="8" fill="#fff" stroke="var(--acc)" stroke-width="3"/>${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => { const [x, y] = pos[d]; return `<circle cx="${60 + x * 38}" cy="${60 + y * 38}" r="14" fill="${d === 3 ? 'var(--acc)' : '#fff'}" stroke="#e6dcef"/><text x="${60 + x * 38}" y="${60 + y * 38}" dy=".36em" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="15" fill="${d === 3 ? '#fff' : 'var(--acc)'}">${d}</text>`; }).join('')}<path d="M60 60L90 30" stroke="var(--acc)" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 5"/><g class="tfinger"><circle cx="60" cy="60" r="7" fill="#ffd9c4" stroke="#e8a98a" stroke-width="2"/></g></svg>`; },
  flick4: () => { const pos = { 1: [-1, -1], 2: [1, -1], 3: [-1, 1], 4: [1, 1] }; return `<svg viewBox="0 0 120 120" class="tpic sq"><rect x="40" y="40" width="40" height="40" rx="8" fill="#fff" stroke="var(--acc)" stroke-width="3"/>${[1, 2, 3, 4].map(d => { const [x, y] = pos[d]; return `<circle cx="${60 + x * 34}" cy="${60 + y * 34}" r="15" fill="${d === 2 ? 'var(--acc)' : '#fff'}" stroke="#e6dcef"/><text x="${60 + x * 34}" y="${60 + y * 34}" dy=".36em" text-anchor="middle" font-family="Fredoka" font-weight="600" font-size="16" fill="${d === 2 ? '#fff' : 'var(--acc)'}">${d}</text>`; }).join('')}<path d="M60 60L88 32" stroke="var(--acc)" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 5"/><g class="tfinger"><circle cx="60" cy="60" r="7" fill="#ffd9c4" stroke="#e8a98a" stroke-width="2"/></g></svg>`; },
};
const toolRow = (ico, title, desc) => `<div class="ttool"><i>${ico}</i><span><b>${esc(title)}</b><small>${esc(desc)}</small></span></div>`;
const TOOLI = {
  memo: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  auto: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M16 12h.01M8 16h.01M12 16h.01" stroke-width="3"/></svg>',
  hint: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"/></svg>',
  undo: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  num: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M10.5 9l2-1.5V16"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  var: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2"/><circle cx="17" cy="7" r="4"/><path d="M7 13l4 8H3z"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>',
  rank: '<svg viewBox="0 0 24 24"><rect x="9" y="6" width="6" height="15" rx="1.5"/><rect x="2.5" y="11" width="6" height="10" rx="1.5"/><rect x="15.5" y="13" width="6" height="8" rx="1.5"/></svg>',
  gacha: '<svg viewBox="0 0 24 24"><circle cx="12" cy="10" r="7"/><path d="M7 17h10v4H7zM8 10h8"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13.5 2 4.5 13.5H11L9.5 22l10-12.5H13z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z"/></svg>',
  gift: '<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="12" rx="2"/><path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1s6 1 6 1c2-4 6-4 6-1s-6 1-6 1"/></svg>',
};

/* ---------- step lists ---------- */
function dailySteps() {
  const blank = (cells, keep) => SOL9.map((v, i) => (cells.includes(i) ? 0 : keep.has(i) ? v : 0));
  const pick = (n, seed) => { const s = new Set(); let x = seed; while (s.size < n) { x = (x * 37 + 11) % 81; s.add(x); } return s; };
  const R0 = unit9('r', 2), Tr = R0[4];
  const C0 = unit9('c', 6), Tc = C0[5];
  const B0 = unit9('b', 4), Tb = B0[7];
  // a cell solved by looking at its row, column and box together
  const Tx = 30, ans = SOL9[Tx], peers = new Set([...unit9('r', row9(Tx)), ...unit9('c', col9(Tx)), ...unit9('b', box9(Tx))]); peers.delete(Tx);
  const keepX = new Set(); for (let d = 1; d <= 9; d++) { if (d === ans) continue; const opts = [...peers].filter(i => SOL9[i] === d); keepX.add(opts[d % opts.length]); }
  const unitStep = (key, unit, target, seed) => ({
    pose: 'think', say: key, task: 'tu.task.cell',
    stage: (el, done, miss) => { const keep = pick(14, seed); unit.forEach(i => keep.add(i)); miniBoard(el, { n: 9, sol: SOL9, given: blank([target], keep), blanks: [target], hl: unit, onDone: done, onMiss: miss }); },
  });
  return [
    { pose: 'wave', say: 'tu.d.hello', stage: el => { el.innerHTML = `<div class="tcover">${C.BG.svg('daily', 320, 190, 'e', 'day')}<div class="tbig">${mascotMini()}</div></div>`; } },
    { pose: 'happy', say: 'tu.d.goal', stage: el => miniBoard(el, { n: 9, sol: SOL9, given: SOL9.slice(), blanks: [], done: true }) },
    unitStep('tu.d.row', R0, Tr, 5),
    unitStep('tu.d.col', C0, Tc, 9),
    unitStep('tu.d.box', B0, Tb, 13),
    { pose: 'think', say: 'tu.d.mix', task: 'tu.task.cell', stage: (el, done, miss) => miniBoard(el, { n: 9, sol: SOL9, given: SOL9.map((v, i) => (keepX.has(i) ? v : 0)), blanks: [Tx], hl2: [...peers], onDone: done, onMiss: miss }) },
    { pose: 'happy', say: 'tu.d.input', stage: el => { el.innerHTML = `<div class="tpair">${IMG.flick()}<div class="ttools">${toolRow(TOOLI.num, t('tu.in.tap'), t('tu.in.tap.d'))}${toolRow(TOOLI.num, t('tu.in.lock'), t('tu.in.lock.d'))}${toolRow(TOOLI.memo, t('tu.in.flick'), t('tu.in.flick.d'))}</div></div>`; } },
    { pose: 'happy', say: 'tu.d.tools', stage: el => { el.innerHTML = `<div class="ttools">${toolRow(TOOLI.memo, t('t.memo'), t('tu.tl.memo'))}${toolRow(TOOLI.auto, t('t.auto'), t('tu.tl.auto'))}${toolRow(TOOLI.hint, t('t.hint'), t('tu.tl.hint'))}${toolRow(TOOLI.undo, t('t.undo'), t('tu.tl.undo'))}</div>`; } },
    { pose: 'yay', say: 'tu.d.modes', stage: el => { el.innerHTML = `<div class="tmedals">${[1, 2, 3].map(k => `<span>${C.medal(k)}<b>${esc(t('d.' + 'emh'[k - 1]))}</b></span>`).join('')}</div><div class="ttools">${toolRow(TOOLI.cal, t('ht.daily'), t('tu.md.daily'))}${toolRow(TOOLI.map, t('ht.col'), t('tu.md.col'))}${toolRow(TOOLI.var, t('ht.var'), t('tu.md.var'))}${toolRow(TOOLI.gacha, t('ga.title'), t('tu.md.gacha'))}</div>`; } },
    { pose: 'wave', say: 'tu.d.speed', speed: true, stage: el => { el.innerHTML = `<div class="tspeedad">${mini4(true)}<div><b>${esc(t('sp.title'))}</b><p>${esc(t('tu.d.speed.p'))}</p><button class="btn sm" id="tuToSpeed">${esc(t('tu.d.speed.go'))}</button></div></div>`; $('#tuToSpeed').onclick = () => { C.SFX.tap(); open('speed', C); }; } },
  ];
}
function speedSteps() {
  const SP = window.SudokuSpeed;
  return [
    { pose: 'wave', speed: true, say: 'tu.s.hello', stage: el => { el.innerHTML = `<div class="tcover">${C.BG.svg('speedway', 320, 190, '', 'day')}<div class="tbig">${mascotMini(true)}</div></div>`; } },
    { pose: 'think', speed: true, say: 'tu.s.rule', task: 'tu.task.cell', stage: (el, done, miss) => miniBoard(el, { n: 4, sol: SOL4, given: [1, 2, 0, 4, 0, 0, 1, 0, 0, 1, 0, 0, 4, 0, 0, 1], blanks: [2], hl: [0, 1, 2, 3], onDone: done, onMiss: miss }) },
    { pose: 'think', speed: true, say: 'tu.s.box', task: 'tu.task.cell', stage: (el, done, miss) => miniBoard(el, { n: 4, sol: SOL4, given: [1, 0, 3, 4, 3, 4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 1], blanks: [1], hl: [0, 1, 4, 5], onDone: done, onMiss: miss }) },
    { pose: 'happy', speed: true, say: 'tu.s.solve', task: 'tu.task.all', stage: (el, done, miss) => {
      const t0 = performance.now(); const g = [0, 2, 0, 4, 3, 0, 1, 0, 0, 1, 0, 3, 4, 0, 2, 0];
      miniBoard(el, { n: 4, sol: SOL4, given: g, blanks: g.map((v, i) => (v ? -1 : i)).filter(i => i >= 0), onDone: () => { const s = ((performance.now() - t0) / 1000).toFixed(1); const b = document.querySelector('#tuSay'); if (b) b.innerHTML = esc(t('tu.s.solved', { s })); done(); }, onMiss: miss });
    } },
    { pose: 'wow', speed: true, say: 'tu.s.attack', stage: el => { el.innerHTML = `<div class="tbarpic"><div class="sbar"><i style="width:62%"></i></div><b class="num">37.2</b></div><div class="ttools">${toolRow(TOOLI.clock, t('tu.at.time'), t('tu.at.time.d'))}${toolRow(TOOLI.clock, t('tu.at.bonus'), t('tu.at.bonus.d'))}${toolRow(TOOLI.x, t('tu.at.miss'), t('tu.at.miss.d'))}${toolRow(TOOLI.bolt, t('tu.at.auto'), t('tu.at.auto.d'))}${toolRow(TOOLI.num, t('tu.at.flick'), t('tu.at.flick.d'))}</div>`; } },
    { pose: 'happy', speed: true, say: 'tu.s.daily', stage: el => { el.innerHTML = `<div class="tmedals">${[30, 60, 90].map((d, k) => `<span>${C.medal(k + 1)}<b>${esc(t('sp.dn', { s: d }))}</b><small>${esc(t('sp.goal', { n: window.SpeedEngine.DAILY[d].goal }))}</small></span>`).join('')}</div><div class="ttools">${toolRow(TOOLI.rank, t('tu.dl.rank'), t('tu.dl.rank.d'))}${toolRow(TOOLI.star, t('tu.dl.g'), t('tu.dl.g.d'))}</div>`; } },
    { pose: 'think', speed: true, say: 'tu.s.col', stage: el => { el.innerHTML = `<div class="tstages">${[['1', '20'], ['2', '30'], ['4', '45'], ['6', '80']].map(([k, s], i) => `<span class="${i === 3 ? 'hard' : ''}"><b>${i + 1}</b><small>${esc(t('sp.kt', { k, s }))}</small></span>`).join('<i>›</i>')}</div><div class="ttools">${toolRow(TOOLI.star, '★', t('tu.cl.s1'))}${toolRow(TOOLI.star, '★★', t('tu.cl.s2'))}${toolRow(TOOLI.star, '★★★', t('tu.cl.s3'))}</div>`; } },
    { pose: 'wow', speed: true, say: 'tu.s.gim', stage: el => { el.innerHTML = `<div class="tgims">${window.SpeedEngine.GIMMICKS.map(g => `<div class="sgline">${SP ? SP.gic(g) : ''}<span><b>${esc(t('g.' + g))}</b><small>${esc(t('g.' + g + '.d'))}</small></span></div>`).join('')}</div>`; } },
    { pose: 'yay', speed: true, say: 'tu.s.rw', stage: el => { el.innerHTML = `<div class="trw">${['clocktown', 'rocketbase', 'rainbowrun'].map(k => `<span class="th">${C.BG.svg(k, 160, 100, '', 'day')}</span>`).join('')}</div><div class="trw ic">${[500, 508, 511, 519].map(id => `<span>${C.iconSvg(id, { still: true })}</span>`).join('')}</div><p class="note" style="text-align:center">${esc(t('tu.s.rw.p'))}</p>`; } },
  ];
}
const mascotMini = speed => mascot('wave', speed);
function mini4(dec) { const g = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1]; return `<div class="tbd n4 mini" style="--n:4">${g.map((v, i) => `<span class="tc ${[0, 3, 5, 10, 12, 15].includes(i) ? 'g' : 'u'} ${i % 2 === 1 && i % 4 !== 3 ? 'br' : ''} ${i >= 4 && i < 8 ? 'bb' : ''}">${v}</span>`).join('')}</div>`; }

/* ---------- modal ---------- */
function ensure() {
  if ($('#mTut')) return;
  const m = document.createElement('div');
  m.className = 'modal'; m.id = 'mTut';
  m.innerHTML = `<div class="sheet tut"><div class="sh"><h3 id="tuTitle"></h3><div class="tdots" id="tuDots"></div><button class="ib x" data-close><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="sb tbody"><div class="tstage" id="tuStage"></div><div class="tsay"><div class="tm" id="tuMas"></div><div class="tbub"><p id="tuSay"></p><div class="ttask" id="tuTask"></div></div></div></div><div class="sf"><button class="btn ghost" id="tuPrev"></button><button class="btn" id="tuNext"></button></div></div>`;
  document.body.appendChild(m);
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-close]')) C.closeModals(); });
  $('#tuPrev').onclick = () => { if (step > 0) { step--; C.SFX.tap(); draw(); } };
  $('#tuNext').onclick = () => {
    const s = steps[step];
    if (s.task && !doneStep[step]) { const tk = $('#tuTask'); tk.classList.remove('nudge'); void tk.offsetWidth; tk.classList.add('nudge'); return; }
    C.SFX.tap();
    if (step < steps.length - 1) { step++; draw(); } else finish();
  };
}
function draw() {
  clearTimeout(autoT); board = null;
  const s = steps[step], last = step === steps.length - 1;
  $('#tuTitle').textContent = t(kind === 'speed' ? 'tu.s.title' : 'tu.d.title');
  $('#tuDots').innerHTML = steps.map((_, k) => `<i class="${k === step ? 'on' : k < step ? 'past' : ''}"></i>`).join('');
  $('#tuMas').innerHTML = mascot(doneStep[step] ? 'yay' : s.pose, s.speed || kind === 'speed');
  $('#tuSay').innerHTML = esc(t(s.say));
  const tk = $('#tuTask');
  tk.className = 'ttask' + (s.task ? '' : ' none') + (doneStep[step] ? ' ok' : '');
  tk.innerHTML = s.task ? (doneStep[step] ? '🎉 ' + esc(t('tu.ok')) : '👉 ' + esc(t(s.task))) : '';
  const st = $('#tuStage'); st.innerHTML = '';
  s.stage(st, () => { doneStep[step] = true; C.SFX.unit(); C.vib(12); tk.className = 'ttask ok'; tk.innerHTML = '🎉 ' + esc(t('tu.ok')); $('#tuMas').innerHTML = mascot('yay', s.speed || kind === 'speed'); $('#tuNext').classList.add('glow');
    {                                            // move on by itself after a correct answer (both tutorials)
      const at = step; clearTimeout(autoT);
      autoT = setTimeout(() => { if (step === at && $('#mTut').classList.contains('on')) { if (step < steps.length - 1) { step++; draw(); } } }, s.task === 'tu.task.all' ? 2400 : 1600);
    } }, () => { tk.className = 'ttask miss'; tk.innerHTML = '🤔 ' + esc(t('tu.miss')); $('#tuMas').innerHTML = mascot('wow', s.speed || kind === 'speed'); });
  $('#tuPrev').textContent = t('tu.prev'); $('#tuPrev').style.visibility = step ? 'visible' : 'hidden';
  const nx = $('#tuNext'); nx.textContent = last ? t(kind === 'speed' ? 'tu.s.end' : 'tu.d.end') : t('tu.next'); nx.classList.toggle('glow', !s.task || !!doneStep[step]); nx.classList.toggle('wait', !!s.task && !doneStep[step]);
  $('#mTut .sb').scrollTop = 0;
}
function finish() {
  C.closeModals();
  if (kind === 'speed' && C.screen !== 'spd' && C.MODE === 'speed') setTimeout(() => C.toast(esc(t('tu.s.go')), 'msg'), 300);
}
function open(k, core) {
  C = core || C; if (!C) return;
  kind = k === 'speed' ? 'speed' : 'daily';
  steps = kind === 'speed' ? speedSteps() : dailySteps();
  step = 0; doneStep = {};
  ensure();
  const m = $('#mTut');
  if (m.classList.contains('on')) { draw(); return; }
  if (document.querySelector('.modal.on')) { C.closeModals(); setTimeout(() => { C.openModal('mTut'); draw(); }, 80); }
  else { C.openModal('mTut'); draw(); }
}
/* keyboard: ← → pages, number keys enter digits, ↑ ↓ / Tab switch between empty cells */
addEventListener('keydown', e => {
  const m = document.getElementById('mTut'); if (!m || !m.classList.contains('on')) return;
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  const rtl = document.documentElement.dir === 'rtl';
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); ((e.key === 'ArrowRight') !== rtl ? $('#tuNext') : $('#tuPrev')).click(); return; }
  if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); $('#tuNext').click(); return; }
  const dm = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
  if (dm && board) { e.preventDefault(); board.put(+dm[1]); return; }
  if (board && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Tab')) { e.preventDefault(); board.move(e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey) ? -1 : 1); }
}, true);
window.SudokuTutorial = { open, mascot };
})();
